#!/bin/sh
# ── Ledgerium backup status writer ────────────────────────────────────────────
# Writes /app/data/.backup-status.json (on the DATA volume, not the backups
# volume — `web` mounts the data volume and needs to read this file; it does
# NOT mount the backups volume, see compose.hostinger.yaml). Read by the web
# app to render a "last backup" status tile. Companion to scripts/db-backup.sh
# and scripts/evidence-backup.sh, which call this after every cycle (success
# AND failure — see their own headers for why they use an EXIT trap to
# guarantee that).
#
# THE CORE DISTINCTION THIS FILE EXISTS TO PRESERVE: "the script exited 0" is
# NOT the same claim as "the data is safe". `durable` means the artifact
# actually reached off-host storage this cycle. A completely healthy
# LOCAL-ONLY run (no BACKUP_S3_URI/UPLOADS_BACKUP_S3_URI configured yet) is a
# real, non-error success — `lastSuccessAt` advances — but `durable` stays
# false. Do not "fix" that by only setting durable on any exit-0 run; that
# would silently re-introduce the exact conflation this file's entire purpose
# is to prevent. See docs/runbooks/DATABASE_BACKUP_RESTORE.md.
#
# READ-MODIFY-WRITE, NOT OVERWRITE: every invocation updates ONLY the one
# artifact block ("db" or "evidence") it was called for. The other artifact's
# block, and the being-updated artifact's own fields that a failed run did
# not touch (lastSuccessAt / durable / its size-or-count metric), are carried
# forward from whatever is already on disk. A failed run must never erase the
# record of the last good one.
#
# THIS FILE IS MACHINE-GENERATED ONLY — do not hand-edit it. The
# read-modify-write above works by pattern-matching the EXACT fixed layout
# this script itself always writes (fixed key order, fixed 2/4-space indent,
# one key per line). If the file is missing, empty, or doesn't match that
# shape, every field is treated as "no prior data" (null / false) rather than
# erroring — a malformed file degrades to "we don't know yet", it does not
# crash the backup that's trying to report status.
#
# WHY NO jq: not installed in the image (see Dockerfile — deliberately kept
# minimal; see its own comment on the aws-cli size cost already paid). This
# script is POSIX `sh` using only printf/grep/sed/mv — all already present
# via busybox + the sed already relied on by scripts/evidence-restore.sh.
#
# WHY NO trap/set -e IN THIS SCRIPT: this is a best-effort side-channel, not
# part of the backup's own correctness. Callers already wrap invocations of
# this script in `|| log "WARNING: ..."` so a status-write failure is loud
# but never fails (or masks the exit code of) the backup cycle that called
# it. Keeping this script itself non-fatal-by-design (explicit checks, no
# `set -e`) means a parsing hiccup here can never cascade into a bigger
# failure than "the status tile is one cycle stale".
#
# Usage:
#   sh scripts/backup-status-write.sh <artifact> <attemptIsoUtc> <outcome> <durable> <errorMsg> <metric>
#     artifact    = db | evidence
#     attemptIsoUtc = this run's attempt timestamp, ISO-8601 UTC,
#                     e.g. 2026-07-20T11:00:00Z (callers use `date -u +%Y-%m-%dT%H:%M:%SZ`)
#     outcome     = success | failure
#     durable     = 1 | 0 — only consulted when outcome=success; ignored (old
#                   value preserved) on failure, since a failed run cannot
#                   have made anything MORE durable than it already was
#     errorMsg    = human-readable failure reason; ignored when outcome=success
#                   (lastError is always written as null on success)
#     metric      = db: sizeBytes (bare integer). evidence: archiveCount
#                   (bare integer). Pass the literal string PRESERVE (or an
#                   empty string — treated the same) to keep the existing
#                   value instead of overwriting it: used by
#                   evidence-backup.sh's "nothing new to archive" cycle,
#                   which is a genuine success but produced no new archive
#                   whose file count should replace the last real one.
#                   Always ignored (old value preserved) on failure.
#
# Env:
#   BACKUP_STATUS_FILE  destination path (default: /app/data/.backup-status.json)
#   BACKUP_S3_URI / UPLOADS_BACKUP_S3_URI  read (not written) to compute the
#     top-level offHostConfigured flag — true only if BOTH are set AND the
#     aws CLI is present, i.e. the one-time setup in the runbook is complete
#     for both artifacts. Deliberately recomputed fresh on every call from
#     current env rather than cached, since it is a pure function of
#     container config, not of any individual run's outcome.

ARTIFACT="$1"
ATTEMPT_ISO="$2"
OUTCOME="$3"
DURABLE_IN="$4"
ERROR_MSG="$5"
METRIC="$6"

STATUS_FILE="${BACKUP_STATUS_FILE:-/app/data/.backup-status.json}"

log() { echo "[backup-status] $*"; }

case "$ARTIFACT" in
  db|evidence) ;;
  *) log "ERROR: artifact must be 'db' or 'evidence', got '${ARTIFACT:-<empty>}'"; exit 1 ;;
esac
case "$OUTCOME" in
  success|failure) ;;
  *) log "ERROR: outcome must be 'success' or 'failure', got '${OUTCOME:-<empty>}'"; exit 1 ;;
esac
case "$ATTEMPT_ISO" in
  "") log "ERROR: attemptIsoUtc (2nd arg) is required"; exit 1 ;;
esac

# ── JSON string escaping (backslash + double-quote; strip embedded newlines
#    so an error message can never break line-oriented parsing on a future
#    read of this same file).
json_escape() {
  printf '%s' "$1" | tr '\n' ' ' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

# ── Extract one key's raw JSON value (already-valid JSON: a quoted string,
#    bare number, true/false, or null) from a pre-sliced block of lines.
#    Returns $3 (default: null) if the key is not present in the block.
extract_json_value() {
  BLOCK="$1"
  KEY="$2"
  DEFAULT="${3:-null}"
  LINE="$(printf '%s\n' "$BLOCK" | grep "\"$KEY\":" | head -n 1)"
  if [ -z "$LINE" ]; then
    printf '%s' "$DEFAULT"
    return 0
  fi
  VAL="${LINE#*: }"
  VAL="${VAL%,}"
  printf '%s' "$VAL"
}

# ── Slice out just the "db" or "evidence" object's lines. Relies entirely on
#    the fixed layout this script always writes (see header) — anchored to
#    the opening line and this artifact's specific closing-brace line ("db"
#    is not the last key so its close is "  },"; "evidence" IS last so its
#    close is "  }" with no trailing comma).
extract_block() {
  case "$1" in
    db) sed -n '/^  "db": {$/,/^  },$/p' "$STATUS_FILE" ;;
    evidence) sed -n '/^  "evidence": {$/,/^  }$/p' "$STATUS_FILE" ;;
  esac
}

DB_BLOCK=""
EV_BLOCK=""
if [ -f "$STATUS_FILE" ]; then
  DB_BLOCK="$(extract_block db)"
  EV_BLOCK="$(extract_block evidence)"
fi

OLD_DB_LAST_ATTEMPT="$(extract_json_value "$DB_BLOCK" lastAttemptAt)"
OLD_DB_LAST_SUCCESS="$(extract_json_value "$DB_BLOCK" lastSuccessAt)"
OLD_DB_DURABLE="$(extract_json_value "$DB_BLOCK" durable false)"
OLD_DB_ERROR="$(extract_json_value "$DB_BLOCK" lastError)"
# Default 0, NOT null: sizeBytes/archiveCount are non-nullable numbers in the
# contract (unlike the nullable timestamp/error fields above) — a
# never-attempted artifact reports 0, not null, so a strict consumer-side
# schema (e.g. Zod z.number(), not z.number().nullable()) still validates.
OLD_DB_SIZE="$(extract_json_value "$DB_BLOCK" sizeBytes 0)"

OLD_EV_LAST_ATTEMPT="$(extract_json_value "$EV_BLOCK" lastAttemptAt)"
OLD_EV_LAST_SUCCESS="$(extract_json_value "$EV_BLOCK" lastSuccessAt)"
OLD_EV_DURABLE="$(extract_json_value "$EV_BLOCK" durable false)"
OLD_EV_ERROR="$(extract_json_value "$EV_BLOCK" lastError)"
OLD_EV_COUNT="$(extract_json_value "$EV_BLOCK" archiveCount 0)"

# ── Default: preserve everything for BOTH artifacts (the common case is
#    "only one of the two blocks changes this call").
NEW_DB_LAST_ATTEMPT="$OLD_DB_LAST_ATTEMPT"
NEW_DB_LAST_SUCCESS="$OLD_DB_LAST_SUCCESS"
NEW_DB_DURABLE="$OLD_DB_DURABLE"
NEW_DB_ERROR="$OLD_DB_ERROR"
NEW_DB_SIZE="$OLD_DB_SIZE"

NEW_EV_LAST_ATTEMPT="$OLD_EV_LAST_ATTEMPT"
NEW_EV_LAST_SUCCESS="$OLD_EV_LAST_SUCCESS"
NEW_EV_DURABLE="$OLD_EV_DURABLE"
NEW_EV_ERROR="$OLD_EV_ERROR"
NEW_EV_COUNT="$OLD_EV_COUNT"

DURABLE_BOOL="false"
[ "$DURABLE_IN" = "1" ] && DURABLE_BOOL="true"

if [ "$ARTIFACT" = "db" ]; then
  NEW_DB_LAST_ATTEMPT="\"$ATTEMPT_ISO\""
  if [ "$OUTCOME" = "success" ]; then
    NEW_DB_LAST_SUCCESS="\"$ATTEMPT_ISO\""
    NEW_DB_DURABLE="$DURABLE_BOOL"
    NEW_DB_ERROR="null"
    if [ "$METRIC" != "PRESERVE" ] && [ -n "$METRIC" ]; then
      NEW_DB_SIZE="$METRIC"
    fi
    # else: preserve OLD_DB_SIZE (already the default above)
  else
    NEW_DB_ERROR="\"$(json_escape "${ERROR_MSG:-unknown error}")\""
    # lastSuccessAt / durable / sizeBytes intentionally NOT touched on failure
  fi
else
  NEW_EV_LAST_ATTEMPT="\"$ATTEMPT_ISO\""
  if [ "$OUTCOME" = "success" ]; then
    NEW_EV_LAST_SUCCESS="\"$ATTEMPT_ISO\""
    NEW_EV_DURABLE="$DURABLE_BOOL"
    NEW_EV_ERROR="null"
    if [ "$METRIC" != "PRESERVE" ] && [ -n "$METRIC" ]; then
      NEW_EV_COUNT="$METRIC"
    fi
    # else: preserve OLD_EV_COUNT (already the default above) — used by the
    # "nothing new to archive" cycle, a genuine success with no new archive.
  else
    NEW_EV_ERROR="\"$(json_escape "${ERROR_MSG:-unknown error}")\""
    # lastSuccessAt / durable / archiveCount intentionally NOT touched on failure
  fi
fi

OFFHOST_CONFIGURED="false"
if [ -n "${BACKUP_S3_URI:-}" ] && [ -n "${UPLOADS_BACKUP_S3_URI:-}" ] && command -v aws >/dev/null 2>&1; then
  OFFHOST_CONFIGURED="true"
fi

STATUS_DIR="$(dirname "$STATUS_FILE")"
mkdir -p "$STATUS_DIR" 2>/dev/null

# ── Atomic write: temp file in the SAME directory (guarantees `mv` is a
#    same-filesystem rename, not a copy) + world-readable permissions set
#    on the temp file BEFORE the rename, so the final path is never briefly
#    unreadable to `web` (uid 1001) after this sidecar (root) replaces it.
TMP_FILE="${STATUS_FILE}.tmp.$$"

{
  printf '{\n'
  printf '  "schemaVersion": 1,\n'
  printf '  "lastRunAt": "%s",\n' "$ATTEMPT_ISO"
  printf '  "offHostConfigured": %s,\n' "$OFFHOST_CONFIGURED"
  printf '  "db": {\n'
  printf '    "lastAttemptAt": %s,\n' "$NEW_DB_LAST_ATTEMPT"
  printf '    "lastSuccessAt": %s,\n' "$NEW_DB_LAST_SUCCESS"
  printf '    "durable": %s,\n' "$NEW_DB_DURABLE"
  printf '    "lastError": %s,\n' "$NEW_DB_ERROR"
  printf '    "sizeBytes": %s\n' "$NEW_DB_SIZE"
  printf '  },\n'
  printf '  "evidence": {\n'
  printf '    "lastAttemptAt": %s,\n' "$NEW_EV_LAST_ATTEMPT"
  printf '    "lastSuccessAt": %s,\n' "$NEW_EV_LAST_SUCCESS"
  printf '    "durable": %s,\n' "$NEW_EV_DURABLE"
  printf '    "lastError": %s,\n' "$NEW_EV_ERROR"
  printf '    "archiveCount": %s\n' "$NEW_EV_COUNT"
  printf '  }\n'
  printf '}\n'
} > "$TMP_FILE" || { log "ERROR: failed writing $TMP_FILE"; rm -f "$TMP_FILE"; exit 1; }

chmod 644 "$TMP_FILE" || log "WARNING: chmod 644 on $TMP_FILE failed — status file may not be readable by the web container"
mv -f "$TMP_FILE" "$STATUS_FILE" || { log "ERROR: failed moving $TMP_FILE -> $STATUS_FILE"; rm -f "$TMP_FILE"; exit 1; }

log "wrote $STATUS_FILE (artifact=$ARTIFACT outcome=$OUTCOME)"
