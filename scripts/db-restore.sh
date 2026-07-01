#!/bin/sh
# ── Ledgerium DB restore ──────────────────────────────────────────────────────
# Restores a backup (local path or S3 URI) over the live DB. Makes a safety copy
# of the current DB first. INTENTIONALLY requires an explicit confirmation token
# so it cannot be run by accident.
#
# Usage:
#   sh scripts/db-restore.sh <backup-source> CONFIRM
#     <backup-source> = local file path OR s3://.../ledgerium-<ts>.db[.age]
#
# Env: DATABASE_FILE (default /app/data/ledgerium.db), BACKUP_S3_ENDPOINT,
#      AGE_IDENTITY (age private key file, required if the backup is .age)
set -e

SRC="$1"
CONFIRM="$2"
DB_FILE="${DATABASE_FILE:-/app/data/ledgerium.db}"
TMP_DIR="${BACKUP_TMP_DIR:-/tmp}"
log() { echo "[db-restore] $*"; }

[ -n "$SRC" ] || { log "usage: db-restore.sh <backup-source> CONFIRM"; exit 1; }
[ "$CONFIRM" = "CONFIRM" ] || { log "refusing: pass CONFIRM as the 2nd arg to proceed"; exit 1; }

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

# Safety copy of the current DB.
if [ -f "$DB_FILE" ]; then
  SAFETY="${DB_FILE}.pre-restore-$(date -u +%Y%m%dT%H%M%SZ)"
  cp "$DB_FILE" "$SAFETY"
  log "current DB saved to $SAFETY"
fi

cp "$LOCAL" "$DB_FILE"
log "restored $LOCAL -> $DB_FILE. Restart the app container now."
