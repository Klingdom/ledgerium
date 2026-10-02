#!/usr/bin/env bash
# Row #319. POSTs to the workflow-retention purge endpoint with Bearer $CRON_SECRET.
# The server permanently removes workflows deleted more than WORKFLOW_PURGE_AFTER_DAYS
# (default 30) ago. This script prints the HTTP status ONLY - never the body or the
# secret (public repo) - and delivers nothing else (no Slack/email).
# Inputs (env): CRON_SECRET, RETENTION_PURGE_URL (full URL of
#   /api/admin/retention/purge), optional RETENTION_PURGE_MAX_TIME (default 120),
#   RETENTION_PURGE_ARMED (repo variable; only the exact value "true" arms a REAL purge,
#   which sends ?mode=purge; anything else, or unset, is a DRY RUN: "retention not armed
#   - dry run only"), optional RETENTION_PURGE_DRY_RUN=1 (forces a dry run even when
#   armed). A dry run prints the counts-only response body (eligibleTotal, eligible,
#   orphanCandidates); the server also defaults to a dry run without mode=purge.
# Exit codes (same meaning as alerts-check.sh where they overlap):
#   0 ok (HTTP 200)
#   1 any other non-200 (401 wrong secret; 500 = purge failed or incomplete, or
#     WORKFLOW_PURGE_AFTER_DAYS invalid on the server; 405 wrong URL ...)
#   2 workflow side unconfigured (CRON_SECRET secret / RETENTION_PURGE_URL variable)
#   3 unreachable / timeout / TLS failure (the HTTP client itself failed)
#   4 HTTP 503: usually the SERVER has no CRON_SECRET; a proxy in front of a down
#     app also answers 503, so the message names both causes.
set -u

if [ -z "${CRON_SECRET:-}" ] || [ -z "${RETENTION_PURGE_URL:-}" ]; then
  [ -z "${CRON_SECRET:-}" ] && echo "::error::Secret CRON_SECRET is not configured (Settings > Secrets and variables > Actions > Secrets). Deleted workflows are NOT being purged."
  [ -z "${RETENTION_PURGE_URL:-}" ] && echo "::error::Repo variable RETENTION_PURGE_URL is not configured (full URL of /api/admin/retention/purge). Deleted workflows are NOT being purged."
  exit 2
fi

# Header via stdin config so the secret is never in an argument list; backslash
# and double quote escaped so the secret is sent intact (see alerts-check.sh).
secret_escaped=${CRON_SECRET//\\/\\\\}
secret_escaped=${secret_escaped//\"/\\\"}
url="$RETENTION_PURGE_URL"
dry=1
if [ "${RETENTION_PURGE_ARMED:-}" = "true" ] && [ "${RETENTION_PURGE_DRY_RUN:-}" != "1" ]; then
  dry=0
  case "$url" in *\?*) url="${url}&mode=purge" ;; *) url="${url}?mode=purge" ;; esac
  echo "retention/purge ARMED: real purge"
else
  case "$url" in *\?*) url="${url}&dryRun=1" ;; *) url="${url}?dryRun=1" ;; esac
  if [ "${RETENTION_PURGE_DRY_RUN:-}" = "1" ]; then
    echo "retention/purge DRY RUN (requested): nothing will be deleted"
  else
    echo "retention not armed - dry run only: nothing will be deleted (set RETENTION_PURGE_ARMED=true to arm)"
  fi
fi
body_file=$(mktemp)
status=$(printf 'header = "Authorization: Bearer %s"\n' "$secret_escaped" |
  curl -sS -X POST --config - --max-time "${RETENTION_PURGE_MAX_TIME:-120}" \
    -o "$body_file" -w '%{http_code}' "$url" 2>/dev/null)
rc=$?

if [ "$rc" -ne 0 ]; then
  rm -f "$body_file"
  echo "::error::retention/purge unreachable or timed out (curl exit $rc)"
  exit 3
fi
echo "retention/purge HTTP status: $status"
# Dry run only: the route body is COUNTS ONLY (never titles/ids/paths), safe to print.
if [ "$dry" = "1" ] && [ "$status" = "200" ]; then
  echo "dry-run counts: $(head -c 2000 "$body_file")"
fi
rm -f "$body_file"
case "$status" in
  200) exit 0 ;;
  503)
    echo "::error::retention/purge returned HTTP 503. Most likely CRON_SECRET is not set in the web container, but a proxy in front of a down app also answers 503 - check the site is up before assuming config. Deleted workflows are NOT being purged."
    exit 4 ;;
  *)
    echo "::error::retention/purge returned HTTP $status (expected 200). 500 means the purge failed or was incomplete, or WORKFLOW_PURGE_AFTER_DAYS is invalid on the server; check the web container logs for '[admin/retention/purge]' lines."
    exit 1 ;;
esac
