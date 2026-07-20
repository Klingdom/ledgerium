#!/bin/sh
# ── Ledgerium DB restore ──────────────────────────────────────────────────────
# Restores a backup (local path or S3 URI) over the live DB. Makes a safety copy
# of the current DB first. INTENTIONALLY requires an explicit confirmation token
# so it cannot be run by accident.
#
# THIS SCRIPT RESTORES THE DATABASE ONLY. It does NOT restore evidence
# (UPLOAD_DIR — the source_bundle files every WorkflowArtifact.contentPath
# points at). A database restored without its matching evidence set is
# EXACTLY the failure mode SOP_BUILDER_REVIEW B-4 describes: rows referencing
# files that don't exist, regeneration impossible. See the loud reminder
# printed at the end of this script. To restore both, run:
#     sh scripts/evidence-restore.sh <evidence-source> CONFIRM [cutoff-ts]
#     sh scripts/db-restore.sh <db-source> CONFIRM
#   in that order (evidence first, matching the backup ordering), using an
#   evidence cutoff-ts >= this DB backup's timestamp — see
#   evidence-restore.sh's header for why that pairing is safe.
#
# Usage:
#   sh scripts/db-restore.sh <backup-source> CONFIRM
#   sh scripts/db-restore.sh <backup-source> VERIFY
#     <backup-source> = local file path OR s3://.../ledgerium-<ts>.db[.age]
#     CONFIRM = actually restore over DATABASE_FILE (with a safety copy first)
#     VERIFY  = download/decrypt/integrity-check only; DATABASE_FILE is never
#               touched. Use this for the runbook's quarterly restore test
#               without needing a throwaway DATABASE_FILE override.
#
# Env: DATABASE_FILE (default /app/data/ledgerium.db), BACKUP_S3_ENDPOINT,
#      AGE_IDENTITY (age private key file, required if the backup is .age)
set -e

SRC="$1"
CONFIRM="$2"
DB_FILE="${DATABASE_FILE:-/app/data/ledgerium.db}"
TMP_DIR="${BACKUP_TMP_DIR:-/tmp}"
log() { echo "[db-restore] $*"; }

[ -n "$SRC" ] || { log "usage: db-restore.sh <backup-source> CONFIRM|VERIFY"; exit 1; }
case "$CONFIRM" in
  CONFIRM|VERIFY) ;;
  *) log "refusing: pass CONFIRM (restore) or VERIFY (non-destructive check) as the 2nd arg"; exit 1 ;;
esac

LOCAL="$SRC"
case "$SRC" in
  s3://*)
    LOCAL="${TMP_DIR}/$(basename "$SRC")"
    EP=""
    [ -n "${BACKUP_S3_ENDPOINT:-}" ] && EP="--endpoint-url ${BACKUP_S3_ENDPOINT}"
    aws s3 cp $EP "$SRC" "$LOCAL"
    ;;
esac
[ -f "$LOCAL" ] || { log "FATAL: backup not found: $LOCAL"; exit 1; }

# Decrypt if needed.
case "$LOCAL" in
  *.age)
    [ -n "${AGE_IDENTITY:-}" ] || { log "FATAL: AGE_IDENTITY required for .age backup"; exit 1; }
    age -d -i "$AGE_IDENTITY" -o "${LOCAL%.age}" "$LOCAL"
    LOCAL="${LOCAL%.age}"
    ;;
esac

# Verify the backup before overwriting anything.
if [ "$(sqlite3 "$LOCAL" 'PRAGMA integrity_check;')" != "ok" ]; then
  log "FATAL: integrity_check failed on backup; aborting"
  exit 1
fi
log "integrity_check ok"

if [ "$CONFIRM" = "VERIFY" ]; then
  log "VERIFY OK — this DB backup IS restorable. DATABASE_FILE was NOT touched."
  log "Re-run with CONFIRM to actually restore. Remember: this restores the DB only — see the evidence reminder in this script's header."
  exit 0
fi

# Safety copy of the current DB.
if [ -f "$DB_FILE" ]; then
  SAFETY="${DB_FILE}.pre-restore-$(date -u +%Y%m%dT%H%M%SZ)"
  cp "$DB_FILE" "$SAFETY"
  log "current DB saved to $SAFETY"
fi

cp "$LOCAL" "$DB_FILE"
log "restored $LOCAL -> $DB_FILE. Restart the app container now."
log "REMINDER: this restored the DATABASE ONLY. Every source_bundle WorkflowArtifact row now in $DB_FILE points at a file under UPLOAD_DIR — if you have not ALSO run evidence-restore.sh (with a matching or later evidence backup), those files may be missing and regeneration for those workflows is broken. See this script's header for the two-step restore procedure."
