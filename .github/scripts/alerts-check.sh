#!/usr/bin/env bash
# Calls GET $ALERTS_CHECK_URL with Bearer $CRON_SECRET. Exit 0 only on HTTP 200.
# Prints the HTTP status code ONLY - never the body or the secret (public repo).
# Inputs (env): CRON_SECRET, ALERTS_CHECK_URL, optional ALERTS_CHECK_MAX_TIME (default 30).
# Exit codes:
#   0 ok (HTTP 200)
#   1 any other non-200 (401 wrong secret, 500 real failure e.g. DB down, ...)
#   2 workflow side unconfigured (CRON_SECRET secret / ALERTS_CHECK_URL variable)
#   3 unreachable / timeout / TLS failure (curl itself failed)
#   4 HTTP 503: usually the SERVER has no CRON_SECRET (the app answers 503 for
#     that). NOT proof of a config gap: a reverse proxy in front of a down app
#     also answers 503, so the message names both causes.
#   5 HTTP 424 (row #263): the check RAN and an alert IS firing, but it reached
#     NO channel - none configured (SLACK_ALERTS_WEBHOOK_URL / ALERT_EMAIL_TO),
#     or every configured one failed (revoked webhook, email provider down, or
#     ALERT_EMAIL_TO set with no SMTP_PASSWORD / RESEND_API_KEY). The server
#     logs say which; this script, like all of it, prints the status only.
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
if [ "$status" = "503" ]; then
  echo "::error::alerts/check returned HTTP 503. Most likely CRON_SECRET is not set in the web container (the app answers 503 for that), but a proxy in front of a down app also answers 503 - check the site is up before assuming config. Alerts are NOT being checked."
  exit 4
fi
if [ "$status" = "424" ]; then
  echo "::error::alerts/check returned HTTP 424: a P1/P2 alert is FIRING and could not be delivered to any channel (none configured, or Slack/email delivery failing). Check the web container logs for '[alert]' lines and the SLACK_ALERTS_WEBHOOK_URL / ALERT_EMAIL_TO / SMTP settings. Someone has NOT been told."
  exit 5
fi
if [ "$status" != "200" ]; then
  echo "::error::alerts/check returned HTTP $status (expected 200)"
  exit 1
fi
