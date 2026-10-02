#!/usr/bin/env bash
# Calls GET $ALERTS_CHECK_URL with Bearer $CRON_SECRET. Exit 0 only on HTTP 200.
# Prints the HTTP status code ONLY - never the body or the secret (public repo).
# Inputs (env): CRON_SECRET, ALERTS_CHECK_URL, optional ALERTS_CHECK_MAX_TIME (default 30).
# Exit codes: 0 ok | 1 non-200 | 2 unconfigured | 3 unreachable/timeout.
set -u

if [ -z "${CRON_SECRET:-}" ] || [ -z "${ALERTS_CHECK_URL:-}" ]; then
  [ -z "${CRON_SECRET:-}" ] && echo "::error::Secret CRON_SECRET is not configured (Settings > Secrets and variables > Actions > Secrets). Alerts are NOT being checked."
  [ -z "${ALERTS_CHECK_URL:-}" ] && echo "::error::Repo variable ALERTS_CHECK_URL is not configured (full URL of /api/admin/alerts/check). Alerts are NOT being checked."
  exit 2
fi

# The header goes to curl via a stdin config (printf is a shell builtin, so the
# secret never appears in a process argument list).
# -s/-S: quiet but show transport errors; -o /dev/null discards the body;
# -w prints the status code only. No --fail, so the status is always captured.
# The value sits inside a double-quoted config string, where curl treats \ and "
# as escapes; escape both so a secret containing either is sent intact rather
# than truncated into a silent 401.
secret_escaped=${CRON_SECRET//\\/\\\\}
secret_escaped=${secret_escaped//\"/\\\"}
status=$(printf 'header = "Authorization: Bearer %s"\n' "$secret_escaped" |
  curl -sS --config - --max-time "${ALERTS_CHECK_MAX_TIME:-30}" \
    -o /dev/null -w '%{http_code}' "$ALERTS_CHECK_URL" 2>/dev/null)
rc=$?

if [ "$rc" -ne 0 ]; then
  echo "::error::alerts/check unreachable or timed out (curl exit $rc)"
  exit 3
fi
echo "alerts/check HTTP status: $status"
if [ "$status" != "200" ]; then
  echo "::error::alerts/check returned HTTP $status (expected 200)"
  exit 1
fi
