#!/bin/sh
# ── Ledgerium evidence backup (off-host) ──────────────────────────────────────
# Backs up UPLOAD_DIR — the uploaded session bundles that back every
# `source_bundle` WorkflowArtifact row. Per OVERLAY_ARCHITECTURE_DECISION.md
# §2.1 the extension discards raw events at export; the uploaded bundle is the
# SINGLE UPSTREAM copy of that evidence, nothing else holds it. A DB-only
# backup that restores rows whose `contentPath` points at nothing is not a
# backup — it is a database of dangling pointers. Addresses SOP_BUILDER_REVIEW
# B-4. Companion to scripts/db-backup.sh; same env-var contract and style.
#
# WHY INCREMENTAL: bundle files under UPLOAD_DIR are write-once and never
# modified or deleted by the application (verified: only apps/web-app/src/app/
# api/{upload,sync}/route.ts write into UPLOAD_DIR; nothing deletes from it).
# That means "back up files newer than the last successful backup" is a
# correct, cheap incremental strategy with no risk of missing an update to an
# already-backed-up file — there are no updates. A full re-tar of the whole
# directory every run would work too but re-uploads everything, every cycle,
# forever; that does not scale with bundle count. This script archives ONLY
# what changed since the last successful upload and keeps a small on-disk
# marker to track that boundary. ASSUMPTION: current bundle volume is small
# (single-tenant / early-stage) — this has NOT been load-tested at high
# upload volume; if bundle count grows into the tens of thousands per cycle,
# revisit (e.g. batching, parallel upload).
#
# CONSISTENCY WITH THE DB BACKUP: the app always writes the bundle file to
# disk BEFORE it inserts the `source_bundle` row referencing it (verified in
# both route.ts write paths). So if THIS script's file scan runs, and THEN
# db-backup.sh takes its DB snapshot, every source_bundle row present in that
# DB snapshot is guaranteed to reference a file this script has already seen
# (this run or an earlier one). db-backup.sh enforces that ordering by
# invoking this script first. The residual skew window is a bundle whose file
# write AND row insert both land after this script's `find` executes but
# before db-backup.sh's snapshot — at most a few seconds in practice, bounded
# to one backup cycle (default 1h) at worst. That is the same RPO already
# accepted for the DB itself and is judged acceptable; closing it fully would
# require a DB transaction correlated with a filesystem snapshot, which is
# more machinery than current single-tenant volume justifies.
#
# Env (all optional except where noted):
#   UPLOAD_DIR                 evidence dir to back up      (default: /app/data/uploads)
#   BACKUP_TMP_DIR              scratch dir for archives     (default: /tmp)
#   UPLOADS_BACKUP_S3_URI       destination, e.g. s3://ledgerium-backups/uploads (REQUIRED for upload)
#   BACKUP_S3_ENDPOINT          S3-compatible endpoint — shared with db-backup.sh, optional
#   AGE_RECIPIENT                age public key; if set, archive is encrypted — shared with db-backup.sh
#   BACKUP_RETAIN_LOCAL          keep N local archives in BACKUP_TMP_DIR (default: 3)
#   UPLOADS_BACKUP_FORCE_FULL    set to 1 to force a full archive even if a marker exists (default: unset)
#   BACKUP_STATUS_FILE           status JSON path (default: /app/data/.backup-status.json)
#                                 — see scripts/backup-status-write.sh for the contract
#
# Usage:  sh scripts/evidence-backup.sh
# Cron :  invoked by scripts/db-backup.sh (do not schedule this standalone
#         unless you also accept the ordering risk described above).
set -e

SRC_DIR="${UPLOAD_DIR:-/app/data/uploads}"
TMP_DIR="${BACKUP_TMP_DIR:-/tmp}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
MARKER="${TMP_DIR}/.ledgerium-uploads-backup-marker"

log() { echo "[evidence-backup] $*"; }

# ── Status file wiring — see scripts/backup-status-write.sh for the JSON
# contract. Uses an EXIT trap (same pattern already used by
# scripts/evidence-restore.sh's cleanup trap) so a status entry is written on
# every exit path — the early "nothing new to archive" success exit, the
# FATAL early-exits, and the final `[ "$UPLOAD_OK" = "1" ] || exit 1` failure
# exit — without altering any of the archive/encrypt/upload logic itself.
STATUS_WRITER="$(dirname "$0")/backup-status-write.sh"
ATTEMPT_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STATUS_DURABLE=0
STATUS_COUNT=""
STATUS_ERROR=""
note_error() { STATUS_ERROR="$1"; }
write_backup_status() {
  CODE=$?
  if [ -f "$STATUS_WRITER" ]; then
    if [ "$CODE" -eq 0 ]; then
      sh "$STATUS_WRITER" evidence "$ATTEMPT_ISO" success "$STATUS_DURABLE" "" "$STATUS_COUNT" \
        || log "WARNING: status file write failed (non-fatal — backup result above is unaffected)"
    else
      sh "$STATUS_WRITER" evidence "$ATTEMPT_ISO" failure 0 "${STATUS_ERROR:-command failed (exit $CODE) - see backup logs above}" "" \
        || log "WARNING: status file write failed (non-fatal)"
    fi
  else
    log "WARNING: $STATUS_WRITER not found — status file not updated this cycle"
  fi
  exit "$CODE"
}
trap write_backup_status EXIT

[ -d "$SRC_DIR" ] || { log "FATAL: evidence dir not found at $SRC_DIR"; note_error "evidence dir not found at $SRC_DIR"; exit 1; }
command -v tar >/dev/null 2>&1 || { log "FATAL: tar not installed"; note_error "tar not installed"; exit 1; }

# 1) Decide full vs incremental. A marker file's mtime is the cutoff: we
#    include every file strictly newer than it. No marker (or forced) = full.
MODE="incr"
if [ -n "${UPLOADS_BACKUP_FORCE_FULL:-}" ] || [ ! -f "$MARKER" ]; then
  MODE="full"
fi

# Snapshot "now" as the run-start marker BEFORE scanning, so any bundle
# written during this run's find/tar (i.e. concurrently with this backup)
# is simply picked up on the NEXT run rather than silently missed. A file
# landing in the tiny window between scan and marker-touch is at worst
# archived twice (harmless — bundles are immutable).
RUN_MARKER_TMP="${TMP_DIR}/.ledgerium-uploads-backup-marker.tmp.$$"
touch "$RUN_MARKER_TMP"

FILELIST="${TMP_DIR}/.ledgerium-uploads-filelist.$$"
if [ "$MODE" = "full" ]; then
  ( cd "$SRC_DIR" && find . -type f -print ) > "$FILELIST"
else
  ( cd "$SRC_DIR" && find . -type f -newer "$MARKER" -print ) > "$FILELIST"
fi

if [ ! -s "$FILELIST" ]; then
  log "no new evidence bundles since last backup ($MODE scan) — nothing to archive"
  mv "$RUN_MARKER_TMP" "$MARKER"
  rm -f "$FILELIST"
  # Genuine success with nothing new produced this cycle. durable reflects
  # current config (off-host destination reachable in principle), recomputed
  # fresh since it costs nothing; archiveCount is left as PRESERVE — a "0
  # files this cycle" housekeeping run must not overwrite the real count from
  # the last cycle that actually archived something.
  if [ -n "${UPLOADS_BACKUP_S3_URI:-}" ] && command -v aws >/dev/null 2>&1; then
    STATUS_DURABLE=1
  fi
  STATUS_COUNT="PRESERVE"
  log "done ($TS), marker advanced, 0 files"
  exit 0
fi

FILE_COUNT="$(wc -l < "$FILELIST" | tr -d ' ')"
NAME="ledgerium-uploads-${TS}-${MODE}.tar"
ARCHIVE="${TMP_DIR}/${NAME}"

# 2) Archive exactly the changed set (relative paths, `-C` scopes tar to
#    SRC_DIR so the archive extracts cleanly back under UPLOAD_DIR).
log "archiving $FILE_COUNT file(s) from $SRC_DIR -> $ARCHIVE ($MODE)"
tar -cf "$ARCHIVE" -C "$SRC_DIR" -T "$FILELIST"
rm -f "$FILELIST"

# Integrity check the archive we just made (tar's equivalent of the DB's
# PRAGMA integrity_check — a corrupt tar fails to list its own contents).
LISTED_COUNT="$(tar -tf "$ARCHIVE" | wc -l | tr -d ' ')"
if [ "$LISTED_COUNT" != "$FILE_COUNT" ]; then
  log "FATAL: archive listing ($LISTED_COUNT entries) does not match input file count ($FILE_COUNT); aborting"
  note_error "archive listing ($LISTED_COUNT entries) does not match input file count ($FILE_COUNT)"
  rm -f "$ARCHIVE" "$RUN_MARKER_TMP"
  exit 1
fi
log "integrity check ok ($LISTED_COUNT entries, $(wc -c < "$ARCHIVE") bytes)"
# This cycle's produced file count — reported to the status file as
# archiveCount on success, regardless of what happens to it next (upload
# success/failure below). If the subsequent upload fails, the overall run
# fails and the writer preserves the OLD archiveCount instead (see
# scripts/backup-status-write.sh: failure outcomes never apply this value).
STATUS_COUNT="$FILE_COUNT"

# 3) Optional encryption (age) — same key material as db-backup.sh. Evidence
#    is captured workplace process data; it must not be weaker-protected
#    than the DB, so this uses the identical AGE_RECIPIENT gate.
UPLOAD="$ARCHIVE"
if [ -n "${AGE_RECIPIENT:-}" ] && command -v age >/dev/null 2>&1; then
  age -r "$AGE_RECIPIENT" -o "${ARCHIVE}.age" "$ARCHIVE"
  UPLOAD="${ARCHIVE}.age"
  log "encrypted -> ${UPLOAD}"
fi

# 4) Off-host upload. UNLIKE db-backup.sh, marker advancement is GATED on a
#    successful upload when off-host storage is configured. Reason: the DB
#    backup is regenerated in FULL every run, so a failed upload just means
#    next hour's (complete) dump uploads instead — self-healing. This
#    backup is INCREMENTAL — if we advanced the marker after a failed
#    upload, the files in this archive would never be reconsidered by a
#    future run and could be pruned by local retention, silently losing the
#    only off-host copy. So: upload success is what "this cycle is captured
#    off-host" means for an incremental scheme, and only that advances the
#    marker.
UPLOAD_OK=0
if [ -n "${UPLOADS_BACKUP_S3_URI:-}" ] && command -v aws >/dev/null 2>&1; then
  EP=""
  [ -n "${BACKUP_S3_ENDPOINT:-}" ] && EP="--endpoint-url ${BACKUP_S3_ENDPOINT}"
  if aws s3 cp $EP "$UPLOAD" "${UPLOADS_BACKUP_S3_URI}/$(basename "$UPLOAD")"; then
    log "uploaded to ${UPLOADS_BACKUP_S3_URI}/$(basename "$UPLOAD")"
    UPLOAD_OK=1
    STATUS_DURABLE=1
  else
    log "WARNING: upload FAILED — marker will NOT advance; this file set will be retried next run"
    note_error "off-host upload failed to ${UPLOADS_BACKUP_S3_URI} (see logs above for aws CLI output)"
  fi
else
  log "WARNING: UPLOADS_BACKUP_S3_URI/aws not configured — evidence backup is LOCAL ONLY (not durable)"
  # No off-host destination exists to retry toward; advance the marker so
  # local-only runs don't re-scan/re-archive the same growing history
  # forever. The loud warning above is the signal an operator needs.
  UPLOAD_OK=1
fi

if [ "$UPLOAD_OK" = "1" ]; then
  mv "$RUN_MARKER_TMP" "$MARKER"
else
  rm -f "$RUN_MARKER_TMP"
fi

# 5) Local retention (scratch only; off-host copy is the source of truth).
#    Archives whose upload failed this run are still the most-recent-mtime
#    files, so they naturally survive pruning until a later successful run
#    supersedes them.
RETAIN="${BACKUP_RETAIN_LOCAL:-3}"
ls -1t "${TMP_DIR}"/ledgerium-uploads-*.tar* 2>/dev/null | tail -n +"$((RETAIN + 1))" | while IFS= read -r OLD; do
  rm -f "$OLD"
done

log "done ($TS), $FILE_COUNT file(s), marker $([ "$UPLOAD_OK" = "1" ] && echo advanced || echo HELD)"
[ "$UPLOAD_OK" = "1" ] || exit 1
