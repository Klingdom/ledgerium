#!/usr/bin/env bash
# Row #282. POSTs to the alert-channel heartbeat endpoint with Bearer $CRON_SECRET.
# The server sends one clearly-labelled TEST message to every configured alert
# channel (Slack / email) and answers with a status; this script prints the
# status ONLY - never the body or the secret (public repo). Exit 0 only on 200.
# Inputs (env): CRON_SECRET, ALERTS_HEARTBEAT_URL (full URL of
#   /api/admin/alerts/heartbeat) OR, as a fallback, ALERTS_CHECK_URL ending in
#   /check (the sibling endpoint is derived), optional ALERTS_HEARTBEAT_MAX_TIME
#   (default 40: Slack's 8 s + email's 20 s deadlines run in parallel).
# Exit codes (1-4 and 5/6 mean the same as .github/scripts/alerts-check.sh):
#   0 ok (HTTP 200): every configured channel delivered the test message
#   1 any other non-200 (401 wrong secret, 500 real failure, 405 wrong URL, ...)
#   2 workflow side unconfigured (CRON_SECRET secret / heartbeat URL variable)
#   3 unreachable / timeout / TLS failure (curl itself failed)
#   4 HTTP 503: usually the SERVER has no CRON_SECRET; a proxy in front of a
#     down app also answers 503, so the message names both causes.
#   5 HTTP 424: channels ARE configured but NONE delivered the test message
#     (revoked webhook, mailbox/provider down). An alert would reach nobody.
#   6 HTTP 207: at least one channel delivered, at least one FAILED. Alert
#     redundancy is degraded. Fails the job on purpose (GitHub has no warning
#     state). 207 is a 2xx and must never be read as success.
#   7 HTTP 412: NO alert channel is configured on the server
#     (SLACK_ALERTS_WEBHOOK_URL / ALERT_EMAIL_TO both unset or blank). Distinct
#     from 5: nothing is set up, rather than something broken.
set -u

heartbeat_url="${ALERTS_HEARTBEAT_URL:-}"
if [ -z "$heartbeat_url" ] && [ -n "${ALERTS_CHECK_URL:-}" ]; then
  case "$ALERTS_CHECK_URL" in
    */alerts/check) heartbeat_url="${ALERTS_CHECK_URL%/check}/heartbeat" ;;
  esac
fi

if [ -z "${CRON_SECRET:-}" ] || [ -z "$heartbeat_url" ]; then
  [ -z "${CRON_SECRET:-}" ] && echo "::error::Secret CRON_SECRET is not configured (Settings > Secrets and variables > Actions > Secrets). Alert channels are NOT being tested."
  [ -z "$heartbeat_url" ] && echo "::error::Repo variable ALERTS_HEARTBEAT_URL is not configured (full URL of /api/admin/alerts/heartbeat), and ALERTS_CHECK_URL does not end in /alerts/check to derive it from. Alert channels are NOT being tested."
  exit 2
fi

# Same secret-handling as alerts-check.sh: the header goes to curl via a stdin
# config (printf is a builtin, so the secret is never in an argument list), with
# backslash and double quote escaped so the secret is sent intact.
secret_escaped=${CRON_SECRET//\\/\\\\}
secret_escaped=${secret_escaped//\"/\\\"}
status=$(printf 'header = "Authorization: Bearer %s"\n' "$secret_escaped" |
  curl -sS -X POST --config - --max-time "${ALERTS_HEARTBEAT_MAX_TIME:-40}" \
    -o /dev/null -w '%{http_code}' "$heartbeat_url" 2>/dev/null)
rc=$?

if [ "$rc" -ne 0 ]; then
  echo "::error::alerts/heartbeat unreachable or timed out (curl exit $rc)"
  exit 3
fi
echo "alerts/heartbeat HTTP status: $status"
case "$status" in
  200) exit 0 ;;
  503)
    echo "::error::alerts/heartbeat returned HTTP 503. Most likely CRON_SECRET is not set in the web container, but a proxy in front of a down app also answers 503 - check the site is up before assuming config. Alert channels are NOT being tested."
    exit 4 ;;
  424)
    echo "::error::alerts/heartbeat returned HTTP 424: alert channels are configured but the test message reached NONE of them (revoked Slack webhook, email provider/mailbox failing). A real alert would reach nobody. Check the web container logs for '[heartbeat]' lines and the SLACK_ALERTS_WEBHOOK_URL / ALERT_EMAIL_TO / SMTP settings."
    exit 5 ;;
  207)
    echo "::error::alerts/heartbeat returned HTTP 207: at least one alert channel delivered the test message and at least one FAILED - alert redundancy is degraded. Check the web container logs for '[heartbeat]' lines and fix the failing channel."
    exit 6 ;;
  412)
    echo "::error::alerts/heartbeat returned HTTP 412: NO alert channel is configured on the server (SLACK_ALERTS_WEBHOOK_URL and ALERT_EMAIL_TO are unset or blank). Alerts, if they fire, reach no one."
    exit 7 ;;
  *)
    echo "::error::alerts/heartbeat returned HTTP $status (expected 200)"
    exit 1 ;;
esac
