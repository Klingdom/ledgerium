#!/bin/sh
# ── Ledgerium evidence restore ────────────────────────────────────────────────
# Restores UPLOAD_DIR (the source_bundle evidence backed up by
# evidence-backup.sh) from a local directory or S3 prefix of
# `ledgerium-uploads-*.tar[.age]` archives. Because evidence-backup.sh is
# incremental, a full restore may need MORE THAN ONE archive applied in
# order (one `-full` baseline, then zero or more `-incr` archives) — this
# script finds all of them, sorts by the timestamp embedded in the filename
# (ISO-8601-basic sorts lexicographically = chronologically), and applies
# them oldest-first. Companion to scripts/db-restore.sh; same env-var
# contract, confirm-token gate, and safety-copy style.
#
# Usage:
#   sh scripts/evidence-restore.sh <backup-source> CONFIRM [cutoff-ts]
#   sh scripts/evidence-restore.sh <backup-source> VERIFY  [cutoff-ts]
#     <backup-source> = local DIRECTORY containing the archives, OR
#                        s3://.../uploads/  (a PREFIX, not a single object)
#     CONFIRM  = actually restore into UPLOAD_DIR (with a safety copy first)
#     VERIFY   = download/decrypt/integrity-check + extract to a throwaway
#                staging dir only; UPLOAD_DIR is never touched. Use this to
#                non-destructively prove a backup set is restorable (the
#                runbook's quarterly test) instead of taking the review's
#                own criticism of the prior mechanism — "never
#                restore-tested" — at face value again.
#     [cutoff-ts] = optional, e.g. 20260628T120000Z. Only apply archives
#                   with a timestamp <= this value. Use this to restore
#                   evidence to match a SPECIFIC db-restore.sh snapshot:
#                   because db-backup.sh always runs evidence-backup.sh
#                   first in the same cycle, the evidence archive set with
#                   ts <= the DB snapshot's ts is guaranteed to cover every
#                   source_bundle referenced by that DB snapshot (see
#                   evidence-backup.sh's consistency note). Omit to restore
#                   everything available.
#
# Env: UPLOAD_DIR (default /app/data/uploads), BACKUP_S3_ENDPOINT,
#      AGE_IDENTITY (age private key file, required if any archive is .age)
set -e

SRC="$1"
CONFIRM="$2"
CUTOFF="${3:-}"
UPLOAD_DIR_TARGET="${UPLOAD_DIR:-/app/data/uploads}"
TMP_DIR="${BACKUP_TMP_DIR:-/tmp}"
log() { echo "[evidence-restore] $*"; }

[ -n "$SRC" ] || { log "usage: evidence-restore.sh <backup-source-dir-or-s3-prefix> CONFIRM|VERIFY [cutoff-ts]"; exit 1; }
case "$CONFIRM" in
  CONFIRM|VERIFY) ;;
  *) log "refusing: pass CONFIRM (restore) or VERIFY (non-destructive check) as the 2nd arg"; exit 1 ;;
esac
command -v tar >/dev/null 2>&1 || { log "FATAL: tar not installed"; exit 1; }

STAGE_DIR="${TMP_DIR}/ledgerium-evidence-restore-stage-$$"
FETCH_DIR="${TMP_DIR}/ledgerium-evidence-restore-fetch-$$"
mkdir -p "$STAGE_DIR" "$FETCH_DIR"
cleanup() { rm -rf "$STAGE_DIR" "$FETCH_DIR"; }
trap cleanup EXIT

# 1) Locate the archive set locally, or pull the whole prefix down from S3.
case "$SRC" in
  s3://*)
    EP=""
    [ -n "${BACKUP_S3_ENDPOINT:-}" ] && EP="--endpoint-url ${BACKUP_S3_ENDPOINT}"
    log "listing $SRC ..."
    aws s3 cp $EP --recursive "$SRC" "$FETCH_DIR" >/dev/null
    LOCAL_DIR="$FETCH_DIR"
    ;;
  *)
    [ -d "$SRC" ] || { log "FATAL: source directory not found: $SRC"; exit 1; }
    LOCAL_DIR="$SRC"
    ;;
esac

# 2) Build the ordered archive list: ledgerium-uploads-<TS>-<full|incr>.tar[.age]
#    Filenames sort lexicographically == chronologically because TS is
#    %Y%m%dT%H%M%SZ. Apply an optional cutoff.
#
# De-dup plaintext-vs-encrypted pairs: in production only the .age copy is
# ever uploaded (see evidence-backup.sh step 4), but a LOCAL scratch dir can
# transiently hold both an unencrypted archive and its .age copy for the
# same run. If a source dir has both `X.tar` and `X.tar.age`, prefer the
# encrypted one and drop the plaintext duplicate — otherwise the same
# backup would be counted (and extracted) twice.
ARCHIVE_LIST="${TMP_DIR}/.ledgerium-evidence-restore-list.$$"
RAW_LIST="${TMP_DIR}/.ledgerium-evidence-restore-list-raw.$$"
find "$LOCAL_DIR" -maxdepth 1 -type f -name 'ledgerium-uploads-*.tar*' | sort > "$RAW_LIST"
: > "$ARCHIVE_LIST"
while IFS= read -r F; do
  case "$F" in
    *.age) echo "$F" >> "$ARCHIVE_LIST" ;;
    *) [ -f "${F}.age" ] || echo "$F" >> "$ARCHIVE_LIST" ;;
  esac
done < "$RAW_LIST"
rm -f "$RAW_LIST"

if [ -n "$CUTOFF" ]; then
  FILTERED="${ARCHIVE_LIST}.filtered"
  : > "$FILTERED"
  while IFS= read -r F; do
    B="$(basename "$F")"
    # extract the TS token: ledgerium-uploads-<TS>-<mode>.tar[.age]
    TS_TOKEN="$(echo "$B" | sed -E 's/^ledgerium-uploads-([0-9TZ]+)-(full|incr)\.tar(\.age)?$/\1/')"
    if [ "$TS_TOKEN" \< "$CUTOFF" ] || [ "$TS_TOKEN" = "$CUTOFF" ]; then
      echo "$F" >> "$FILTERED"
    fi
  done < "$ARCHIVE_LIST"
  mv "$FILTERED" "$ARCHIVE_LIST"
fi

[ -s "$ARCHIVE_LIST" ] || { log "FATAL: no ledgerium-uploads-*.tar* archives found at $SRC${CUTOFF:+ (cutoff $CUTOFF)}"; rm -f "$ARCHIVE_LIST"; exit 1; }

FIRST="$(head -n 1 "$ARCHIVE_LIST")"
case "$(basename "$FIRST")" in
  *-full.tar*) : ;;
  *) log "WARNING: earliest archive in this set is NOT a -full baseline (${FIRST}); the evidence set may be incomplete unless an earlier full archive exists outside the cutoff or was pruned intentionally" ;;
esac

TOTAL_ARCHIVES=0
TOTAL_ENTRIES=0
while IFS= read -r ARCHIVE; do
  TOTAL_ARCHIVES=$((TOTAL_ARCHIVES + 1))
  WORK="$ARCHIVE"

  case "$WORK" in
    *.age)
      [ -n "${AGE_IDENTITY:-}" ] || { log "FATAL: AGE_IDENTITY required to decrypt $(basename "$WORK")"; exit 1; }
      DECRYPTED="${FETCH_DIR}/$(basename "${WORK%.age}").$$"
      age -d -i "$AGE_IDENTITY" -o "$DECRYPTED" "$WORK"
      WORK="$DECRYPTED"
      ;;
  esac

  # Integrity check (tar's equivalent of PRAGMA integrity_check): a corrupt
  # archive fails to list its own contents.
  COUNT="$(tar -tf "$WORK" | wc -l | tr -d ' ')"
  [ "$COUNT" -gt 0 ] 2>/dev/null || { log "FATAL: archive is empty or unreadable: $(basename "$ARCHIVE")"; exit 1; }
  log "verified $(basename "$ARCHIVE") — $COUNT entries"
  TOTAL_ENTRIES=$((TOTAL_ENTRIES + COUNT))

  # Extract into the staging dir. Oldest-first application means a later
  # archive would win on any real conflict — moot here since bundles are
  # immutable and filenames are content-addressed by uploadId, but applying
  # in chronological order is still the correct, defensible choice.
  tar -xf "$WORK" -C "$STAGE_DIR"
done < "$ARCHIVE_LIST"
rm -f "$ARCHIVE_LIST"

STAGE_FILE_COUNT="$(find "$STAGE_DIR" -type f | wc -l | tr -d ' ')"
log "staged $STAGE_FILE_COUNT unique file(s) from $TOTAL_ARCHIVES archive(s) ($TOTAL_ENTRIES total entries incl. duplicates across increments)"

if [ "$CONFIRM" = "VERIFY" ]; then
  log "VERIFY OK — this evidence backup set IS restorable ($STAGE_FILE_COUNT files). UPLOAD_DIR was NOT touched."
  log "Re-run with CONFIRM (and the same source/cutoff) to actually restore."
  exit 0
fi

# 3) Safety copy of the current evidence dir before overwriting anything.
if [ -d "$UPLOAD_DIR_TARGET" ] && [ -n "$(find "$UPLOAD_DIR_TARGET" -maxdepth 1 -type f -o -type d 2>/dev/null | tail -n +2)" ]; then
  SAFETY="${UPLOAD_DIR_TARGET%/}.pre-restore-$(date -u +%Y%m%dT%H%M%SZ)"
  cp -a "$UPLOAD_DIR_TARGET" "$SAFETY"
  log "current evidence dir saved to $SAFETY"
fi

# 4) Apply. Merge into UPLOAD_DIR rather than wiping it first — bundles are
#    content-addressed by userId/uploadId so an existing file with the same
#    name is byte-identical (immutable) and safe to overwrite in place.
mkdir -p "$UPLOAD_DIR_TARGET"
cp -a "$STAGE_DIR"/. "$UPLOAD_DIR_TARGET"/
log "restored $STAGE_FILE_COUNT file(s) -> $UPLOAD_DIR_TARGET"
log "NOTE: this restores evidence only. If you are also restoring the database, run db-restore.sh with a DB snapshot whose timestamp is >= this evidence set's cutoff (or omit cutoff to use everything available) so every source_bundle row has a backing file."
