#!/bin/sh
# ── Ledgerium DB backup (off-host) ────────────────────────────────────────────
# Takes a CONSISTENT online backup of the live SQLite DB (sqlite3 .backup API is
# safe on a running DB — unlike `cp`), optionally encrypts it, and uploads it to
# off-host object storage. Addresses DB-health-review-001 P0: backups must live
# OFF the data volume.
#
# Env (all optional except where noted):
#   DATABASE_FILE     path to the live DB        (default: /app/data/ledgerium.db)
#   BACKUP_TMP_DIR    scratch dir for the dump   (default: /tmp)
#   BACKUP_S3_URI     destination, e.g. s3://ledgerium-backups/db  (REQUIRED for upload)
#   BACKUP_S3_ENDPOINT  S3-compatible endpoint (e.g. Cloudflare R2) — optional
#   AGE_RECIPIENT     age public key; if set, the backup is encrypted with `age`
#   BACKUP_RETAIN_LOCAL  keep N local dumps in BACKUP_TMP_DIR (default: 3)
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

[ -f "$DB_FILE" ] || { log "FATAL: DB file not found at $DB_FILE"; exit 1; }
command -v sqlite3 >/dev/null 2>&1 || { log "FATAL: sqlite3 not installed"; exit 1; }

# 1) Consistent online backup (does NOT block writers; safe on a live DB).
log "backing up $DB_FILE -> $DUMP"
sqlite3 "$DB_FILE" ".backup '${DUMP}'"
# Integrity check the copy before we trust it.
if [ "$(sqlite3 "$DUMP" 'PRAGMA integrity_check;')" != "ok" ]; then
  log "FATAL: integrity_check failed on backup; aborting"
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

# 3) Off-host upload (S3-compatible: AWS S3, Cloudflare R2, Backblaze B2, MinIO).
if [ -n "${BACKUP_S3_URI:-}" ] && command -v aws >/dev/null 2>&1; then
  EP=""
  [ -n "${BACKUP_S3_ENDPOINT:-}" ] && EP="--endpoint-url ${BACKUP_S3_ENDPOINT}"
  aws s3 cp $EP "$UPLOAD" "${BACKUP_S3_URI}/$(basename "$UPLOAD")"
  log "uploaded to ${BACKUP_S3_URI}/$(basename "$UPLOAD")"
else
  log "WARNING: BACKUP_S3_URI/aws not configured — backup is LOCAL ONLY (not durable)"
fi

# 4) Local retention (scratch only; off-host copy is the source of truth).
RETAIN="${BACKUP_RETAIN_LOCAL:-3}"
ls -1t "${TMP_DIR}"/ledgerium-*.db* 2>/dev/null | tail -n +"$((RETAIN + 1))" | while IFS= read -r OLD; do
  rm -f "$OLD"
done

log "done ($TS)"
