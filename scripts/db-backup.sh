#!/bin/sh
# ── Ledgerium DB backup (off-host) ────────────────────────────────────────────
# Takes a CONSISTENT online backup of the live SQLite DB (sqlite3 .backup API is
# safe on a running DB — unlike `cp`), optionally encrypts it, and uploads it to
# off-host object storage. Addresses DB-health-review-001 P0: backups must live
# OFF the data volume.
#
# EVIDENCE COUPLING (SOP_BUILDER_REVIEW B-4): every WorkflowArtifact row of
# type `source_bundle` points at a file under UPLOAD_DIR — the raw uploaded
# session bundle — and that file is the ONLY copy of that evidence anywhere
# (the extension discards raw events at export; nothing else holds them). A
# DB backup alone restores rows pointing at files that may not exist. So this
# script runs scripts/evidence-backup.sh FIRST, every time, before it
# snapshots the DB. The app always writes a bundle file before it inserts the
# row referencing it, so "evidence scan happens, then DB snapshot happens" is
# what guarantees every source_bundle row in this DB snapshot already has (or
# will already have, per an earlier evidence-backup run) a corresponding
# backed-up file. See evidence-backup.sh's own header for the residual skew
# window this ordering leaves open (bounded to one backup cycle) and why it
# is accepted rather than solved with heavier machinery.
#
# A failed evidence backup does NOT block the DB backup below — the DB is the
# smaller, higher-frequency, more time-sensitive artifact and its own RPO
# should not depend on evidence-backup succeeding. It DOES get logged loudly:
# if you see the WARNING below, do not treat the DB backup produced by THIS
# run as evidence-complete; prefer a DB backup from a cycle where the
# evidence step also reported success. Set SKIP_EVIDENCE_BACKUP=1 to opt out
# of this coupling entirely (e.g. to run a DB-only backup for testing) — do
# not set this in production; it silently re-introduces B-4.
#
# Env (all optional except where noted):
#   DATABASE_FILE     path to the live DB        (default: /app/data/ledgerium.db)
#   BACKUP_TMP_DIR    scratch dir for the dump   (default: /tmp)
#   BACKUP_S3_URI     destination, e.g. s3://ledgerium-backups/db  (REQUIRED for upload)
#   BACKUP_S3_ENDPOINT  S3-compatible endpoint (e.g. Cloudflare R2) — optional
#   AGE_RECIPIENT     age public key; if set, the backup is encrypted with `age`
#   BACKUP_RETAIN_LOCAL  keep N local dumps in BACKUP_TMP_DIR (default: 3)
#   BACKUP_STATUS_FILE   status JSON path (default: /app/data/.backup-status.json)
#                        — see scripts/backup-status-write.sh for the contract
#   SKIP_EVIDENCE_BACKUP  set to 1 to skip the evidence-backup.sh step (default: unset — do not use in production)
#   See scripts/evidence-backup.sh for its own env vars (UPLOAD_DIR, UPLOADS_BACKUP_S3_URI, etc.)
#
# Usage:  sh scripts/db-backup.sh
# Cron :  0 * * * * sh /app/scripts/db-backup.sh >> /var/log/ledgerium-backup.log 2>&1
set -e

DB_FILE="${DATABASE_FILE:-/app/data/ledgerium.db}"
TMP_DIR="${BACKUP_TMP_DIR:-/tmp}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="ledgerium-${TS}.db"
DUMP="${TMP_DIR}/${NAME}"

log() { echo "[db-backup] $*"; }

# ── Status file wiring — see scripts/backup-status-write.sh for the JSON
# contract. Uses an EXIT trap, not calls before each exit point, because the
# off-host upload below (step 3) is a bare, non-conditional `aws s3 cp` under
# `set -e` — a failed upload aborts this script immediately AT that line, so
# an EXIT trap is the only place that reliably fires on every path (clean
# success, an explicit FATAL exit, or an implicit set -e abort) without
# wrapping the upload in an `if` that would change whether a failed upload
# aborts the script (it must keep aborting — that is existing behavior this
# change does not touch).
STATUS_WRITER="$(dirname "$0")/backup-status-write.sh"
ATTEMPT_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STATUS_DURABLE=0
STATUS_SIZE=""
STATUS_ERROR=""
note_error() { STATUS_ERROR="$1"; }
write_backup_status() {
  CODE=$?
  if [ -f "$STATUS_WRITER" ]; then
    if [ "$CODE" -eq 0 ]; then
      sh "$STATUS_WRITER" db "$ATTEMPT_ISO" success "$STATUS_DURABLE" "" "$STATUS_SIZE" \
        || log "WARNING: status file write failed (non-fatal — backup result above is unaffected)"
    else
      sh "$STATUS_WRITER" db "$ATTEMPT_ISO" failure 0 "${STATUS_ERROR:-command failed (exit $CODE) - see backup logs above}" "" \
        || log "WARNING: status file write failed (non-fatal)"
    fi
  else
    log "WARNING: $STATUS_WRITER not found — status file not updated this cycle"
  fi
  exit "$CODE"
}
trap write_backup_status EXIT

[ -f "$DB_FILE" ] || { log "FATAL: DB file not found at $DB_FILE"; note_error "DB file not found at $DB_FILE"; exit 1; }
command -v sqlite3 >/dev/null 2>&1 || { log "FATAL: sqlite3 not installed"; note_error "sqlite3 not installed"; exit 1; }

# 0) Evidence backup runs FIRST — see the header note above for why order
#    matters. Non-fatal: a failure here is loudly logged but does not stop
#    the DB backup that follows.
if [ -z "${SKIP_EVIDENCE_BACKUP:-}" ]; then
  EVIDENCE_SCRIPT="$(dirname "$0")/evidence-backup.sh"
  if [ -f "$EVIDENCE_SCRIPT" ]; then
    if sh "$EVIDENCE_SCRIPT"; then
      log "evidence backup ok"
    else
      log "WARNING: evidence backup FAILED — the DB snapshot below may reference source_bundle files not yet captured off-host. See evidence-backup.sh output above."
    fi
  else
    log "WARNING: $EVIDENCE_SCRIPT not found — evidence (UPLOAD_DIR) is NOT being backed up. This DB backup alone is insufficient per SOP_BUILDER_REVIEW B-4."
  fi
else
  log "WARNING: SKIP_EVIDENCE_BACKUP=1 — evidence (UPLOAD_DIR) is NOT being backed up this run."
fi

# 1) Consistent online backup (does NOT block writers; safe on a live DB).
log "backing up $DB_FILE -> $DUMP"
sqlite3 "$DB_FILE" ".backup '${DUMP}'"
# Integrity check the copy before we trust it.
if [ "$(sqlite3 "$DUMP" 'PRAGMA integrity_check;')" != "ok" ]; then
  log "FATAL: integrity_check failed on backup; aborting"
  note_error "integrity_check failed on backup copy"
  rm -f "$DUMP"
  exit 1
fi
log "integrity_check ok ($(wc -c < "$DUMP") bytes)"

# 2) Optional encryption (age). Strongly recommended — backups hold PII.
UPLOAD="$DUMP"
if [ -n "${AGE_RECIPIENT:-}" ] && command -v age >/dev/null 2>&1; then
  age -r "$AGE_RECIPIENT" -o "${DUMP}.age" "$DUMP"
  UPLOAD="${DUMP}.age"
  log "encrypted -> ${UPLOAD}"
fi
# Size of whatever is about to be persisted (encrypted if configured, plain
# otherwise) — reported to the status file as this cycle's sizeBytes.
STATUS_SIZE="$(wc -c < "$UPLOAD" 2>/dev/null | tr -d ' ')"

# 3) Off-host upload (S3-compatible: AWS S3, Cloudflare R2, Backblaze B2, MinIO).
if [ -n "${BACKUP_S3_URI:-}" ] && command -v aws >/dev/null 2>&1; then
  EP=""
  [ -n "${BACKUP_S3_ENDPOINT:-}" ] && EP="--endpoint-url ${BACKUP_S3_ENDPOINT}"
  aws s3 cp $EP "$UPLOAD" "${BACKUP_S3_URI}/$(basename "$UPLOAD")"
  log "uploaded to ${BACKUP_S3_URI}/$(basename "$UPLOAD")"
  STATUS_DURABLE=1
else
  log "WARNING: BACKUP_S3_URI/aws not configured — backup is LOCAL ONLY (not durable)"
fi

# 4) Local retention (scratch only; off-host copy is the source of truth).
RETAIN="${BACKUP_RETAIN_LOCAL:-3}"
ls -1t "${TMP_DIR}"/ledgerium-*.db* 2>/dev/null | tail -n +"$((RETAIN + 1))" | while IFS= read -r OLD; do
  rm -f "$OLD"
done

log "done ($TS)"
