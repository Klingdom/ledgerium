#!/bin/sh
# ── Ledgerium backup sidecar entrypoint ───────────────────────────────────────
# CMD for the `backup` compose service (compose.hostinger.yaml /
# compose.hostinger-deploy.yaml). Schedules scripts/db-backup.sh — which
# internally also runs scripts/evidence-backup.sh first, see that script's
# header — hourly, plus a monthly forced-full evidence re-baseline, via
# busybox crond.
#
# WHY THIS EXISTS instead of a runbook cron line for an operator to add: a
# required step that depends on someone remembering to configure host cron
# is the exact failure mode that left backups undeployed in the first place
# (scripts/db-backup.sh + friends existed in the repo but were never copied
# into the image, never scheduled anywhere — see
# docs/runbooks/DATABASE_BACKUP_RESTORE.md "Why the old posture was unsafe").
# Putting the schedule here means it ships with the image and is
# version-controlled in compose, not in an operator's head or a host
# crontab that a VPS rebuild silently wipes.
#
# THE CLASSIC CONTAINERIZED-CRON TRAP: crond does not automatically hand its
# own environment down to the jobs it runs, the way an interactive login
# shell would. Compose sets AWS_ACCESS_KEY_ID / BACKUP_S3_URI / etc. as env
# vars on THIS container, but a bare crontab entry invoked by crond would
# run with essentially none of them and would silently no-op every backup
# (S3 upload skipped — loudly logged as "LOCAL ONLY" by the scripts
# themselves, but nobody is watching a cron job's output by default). To
# avoid that: this script snapshots the container's actual environment to a
# file (via `export -p`, which preserves correct shell quoting, unlike a
# raw `env > file` dump) BEFORE handing off to crond, and every crontab
# line sources that file first.
#
# LOG VISIBILITY: crond's own job-dispatch messages are sent to /dev/stdout
# (-L) at verbosity -l 5 (busybox crond's default, -l 8, is nearly silent —
# it only logs syntactically-invalid crontab lines). Each job additionally
# redirects its own stdout/stderr to /proc/1/fd/{1,2} — since crond runs as
# PID 1 in this container (via `exec` below), that resolves to this
# container's own stdout/stderr, so `docker compose logs backup` (or
# `docker logs ledgerium-backup`) shows everything: crond's dispatch lines
# AND the backup scripts' own [db-backup] / [evidence-backup] log lines.
set -e

log() { echo "[backup-sidecar] $*"; }

# 0) Sanity-check the tools the backup/restore scripts need are present (see
#    Dockerfile `apk add`). Non-fatal here — loudly warn and let each
#    script's own internal check fail that individual run, rather than
#    crash-looping the whole sidecar over a single missing tool.
for BIN in sqlite3 tar; do
  command -v "$BIN" >/dev/null 2>&1 || log "WARNING: $BIN not found on PATH — backups will fail at runtime"
done
command -v aws >/dev/null 2>&1 || log "WARNING: aws CLI not found — off-host upload will be skipped (local-only, not durable)"
command -v age >/dev/null 2>&1 || log "WARNING: age not found — if AGE_RECIPIENT is set, encryption will be skipped"

# 1) Make sure the persistent-volume scratch dir exists. BACKUP_TMP_DIR is
#    pointed at a subdirectory of the ledgerium-data volume (not /tmp) by
#    the compose environment block, specifically so evidence-backup.sh's
#    incremental marker file — and any locally-retained dumps — survive
#    this container being recreated on every image pull/redeploy. /tmp
#    would silently force a full evidence re-archive on every deploy,
#    defeating the incremental design (see evidence-backup.sh's header).
TMP_DIR="${BACKUP_TMP_DIR:-/tmp}"
mkdir -p "$TMP_DIR"
log "backup scratch dir: $TMP_DIR"

# 2) Snapshot this container's environment for the cron jobs to source.
#    `export -p` (not `env`) so values with spaces/special characters are
#    correctly shell-quoted when re-sourced.
ENV_FILE="/app/scripts/backup.env"
export -p > "$ENV_FILE"
chmod 600 "$ENV_FILE"
log "environment snapshot written to $ENV_FILE"

# 3) Write the crontab. Alpine's busybox crond default spool dir is
#    /etc/crontabs/<user>; this sidecar runs as root (see
#    compose.hostinger*.yaml for why), so the target file is
#    /etc/crontabs/root.
mkdir -p /etc/crontabs
CRONTAB=/etc/crontabs/root
{
  echo "# Ledgerium backup schedule — GENERATED at container start by"
  echo "# scripts/backup-cron-entrypoint.sh. Do not hand-edit; this file is"
  echo "# regenerated (and any hand edits discarded) on every container start."
  echo "# See docs/runbooks/DATABASE_BACKUP_RESTORE.md."
  echo ""
  echo "# Hourly: DB backup (also runs evidence-backup.sh first — see its"
  echo "# header for why order matters). Matches the runbook's RPO 1h target"
  echo "# for both artifacts."
  echo "0 * * * * { . ${ENV_FILE} && sh /app/scripts/db-backup.sh; } >>/proc/1/fd/1 2>>/proc/1/fd/2"
  echo ""
  echo "# Monthly (1st, 03:00 UTC): force a full evidence re-baseline so an"
  echo "# incremental restore chain never has to reach further back than a"
  echo "# month. See DATABASE_BACKUP_RESTORE.md 'Operational consequence —"
  echo "# re-baseline periodically'."
  echo "0 3 1 * * { . ${ENV_FILE} && UPLOADS_BACKUP_FORCE_FULL=1 sh /app/scripts/evidence-backup.sh; } >>/proc/1/fd/1 2>>/proc/1/fd/2"
  echo ""
} > "$CRONTAB"
chmod 600 "$CRONTAB"
log "crontab written to $CRONTAB:"
cat "$CRONTAB"

# 4) Hand off to crond as PID 1 (exec, not backgrounded) so /proc/1/fd/*
#    inside the job commands above resolves to THIS container's own
#    stdout/stderr, and so `docker stop` signals crond directly instead of
#    an intermediary shell that may not forward it.
log "starting crond (foreground, log level 5, logging to stdout)"
exec crond -f -l 5 -L /dev/stdout
