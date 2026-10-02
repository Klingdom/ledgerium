import { withApiRoute } from '@/lib/with-api-route';
import { NextRequest, NextResponse } from 'next/server';
import { computeAlerts } from '@/lib/compute-alerts';
import { sendAlertNotification } from '@/lib/notifications';
import { reportApiError } from '@/lib/api-error-reporting';
import { verifyCronBearer } from '@/lib/cron-auth';
import { decideAlertSends, loadAlertStates, recordAlertState, type AlertStates } from '@/lib/alert-state';

/**
 * GET /api/admin/alerts/check
 *
 * Cron-safe endpoint. Evaluates all alert conditions and sends push
 * notifications for any P1 or P2 alert that is currently firing.
 *
 * Authentication: shared secret — NOT session-based, so this can be called
 * by Vercel Cron, Railway Cron, or any external scheduler without a browser
 * session.
 *
 * The secret MUST be provided via:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Query-parameter delivery (?secret=...) is NOT supported — query strings
 * appear in access logs, CDN logs, and browser history, creating a
 * log-exposure risk that cannot be mitigated by secret rotation.
 *
 * Required env var: CRON_SECRET (unset -> 503, distinct from a 500 outage).
 * Delivery channels: SLACK_ALERTS_WEBHOOK_URL, ALERT_EMAIL_TO (email additionally
 * needs SMTP_PASSWORD or RESEND_API_KEY, see lib/email.ts).
 *
 * Status scheme (row #263) - the hourly job (.github/scripts/alerts-check.sh)
 * labels each from the status alone, so nothing about an alert is ever printed:
 *   200  nothing firing, or every firing P1/P2 alert reached >= 1 channel and
 *        no configured channel failed
 *   207  every firing alert reached >= 1 channel BUT a configured channel failed
 *   401  wrong secret          503  CRON_SECRET not configured
 *   500  computeAlerts threw (a real outage, e.g. DB down)
 *   424  a firing P1/P2 alert reached NO channel: none configured, or every
 *        configured one failed (Slack non-2xx / network, email provider failure,
 *        ALERT_EMAIL_TO without an email provider, sender threw)
 *
 * Why 424 (Failed Dependency): the check itself worked; a dependency it needs to
 * do its job (the notification channel) did not. 502/504 would collide with what
 * a reverse proxy answers for a down app, and any 5xx must be reported by
 * api-error-coverage guard A. 424 is emitted by neither Next nor common proxies,
 * and is deliberately NOT reported via reportApiError: that counter is the
 * api_error_spike signal for server faults, a misconfigured/rejected channel is
 * not one, and the failing job is the signal here (api_error_spike also reads
 * the DB, the dependency alerts/check exists to be independent of).
 *
 * Granularity is per alert: an alert delivered on at least one channel is
 * delivered; if any firing alert reached no channel the response is 424, so a
 * Slack that accepts the first message and rate-limits the second is still
 * caught.
 *
 * Row #266 - partial channel failure: every firing alert reached >= 1 channel
 * but >= 1 configured channel failed (revoked Slack webhook beside working
 * email, SMTP timeout beside working Slack) -> 207 (Multi-Status: some
 * deliveries succeeded, some did not). The nobody-was-told case stays 424, so
 * the job can label "alert delivered, redundancy degraded" apart from "alert
 * NOT delivered" and from an outage, from the status alone. 424 wins when both
 * apply (one alert undelivered, another partially delivered). Like 424, 207 is
 * not reported via reportApiError (not a server fault). Precedence:
 * 500/503/401 > 424 > 207 > 200.
 *
 * Row #292 - notify on transition, not hourly. A firing P1/P2 alert is sent when
 * it becomes firing (first time, or after having been ok), then at most once per
 * 24h while it stays firing (lib/alert-state.ts decideAlertSends). The statuses
 * above now describe only the sends ATTEMPTED this run: a firing alert already
 * notified within 24h is SUPPRESSED (counted in alertsSuppressed), is not a
 * delivery failure, and cannot cause 424/207. 200 therefore means "nothing needed
 * sending, or everything attempted was delivered"; it no longer means "nothing is
 * firing" (alertsFiring says that). 424/207 mean the same as before, scoped to the
 * attempted sends, and a failed send is not recorded, so it is retried next hour.
 * A standing outage with working channels is announced once + daily, so the job
 * is green while it persists; the daily heartbeat is the channel-health check.
 *
 * Response bodies carry COUNTS only - never alert messages, webhook URLs or
 * addresses.
 *   200: { checked, alertsFiring, alertsSent (delivered), alertsSuppressed, channelFailures: 0 }
 *   207: { checked, alertsFiring, alertsSent, alertsSuppressed, channelFailures >= 1 }
 *   424: { error, checked, alertsFiring, alertsSent, alertsSuppressed, alertsUndelivered }
 */
async function handleGET(request: NextRequest) {
  const auth = verifyCronBearer(request);

  if (auth === 'unconfigured') {
    // CRON_SECRET not configured — refuse to run to avoid open access.
    // 503 (service not configured), NOT 500, so the scheduled job can tell a
    // missing-config deploy from a real outage (computeAlerts failing = 500).
    // Still reported: the api-error-coverage guard (row #246) requires every
    // explicit 5xx be counted, and a server-side fault is a fault. One call per
    // hourly check is ~1/h against the api_error_spike threshold of >10/h, so it
    // cannot trip that alert on its own.
    console.error('[admin/alerts/check] CRON_SECRET env var is not set');
    reportApiError('/api/admin/alerts/check', 503);
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  }

  // Bearer-only, timing-safe, no query-param delivery: see lib/cron-auth.ts.
  if (auth === 'unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const nowMs = Date.now();
    const alerts = await computeAlerts(nowMs);

    // Row #292: notify on transition, not every hour. State lives in
    // AnalyticsEvent rows (lib/alert-state.ts). If the state read fails we fall
    // back to "no memory": a duplicate notification, never a lost one.
    let previous: AlertStates = {};
    try {
      previous = await loadAlertStates(nowMs);
    } catch (err) {
      console.error('[admin/alerts/check] alert state unreadable - notifying without suppression', err);
    }
    const decision = decideAlertSends(previous, alerts, nowMs);
    const toNotify = decision.sends.map((s) => s.alert);
    // Firing P1/P2 alerts (sent now or suppressed as already-notified).
    const alertsFiring = toNotify.length + decision.suppressed.length;
    const alertsSuppressed = decision.suppressed.length;

    const settled = await Promise.allSettled(
      toNotify.map((a) => {
        const notification: Parameters<typeof sendAlertNotification>[0] = {
          title: a.id.replace(/_/g, ' '),
          severity: a.severity,
          message: a.message,
        };
        if (a.value !== null) {
          notification.value = a.value;
        }
        return sendAlertNotification(notification);
      }),
    );

    // A rejected promise (sender threw despite its contract) is an undelivered alert.
    const results = settled.map((r) => (r.status === 'fulfilled' ? r.value : null));
    const alertsSent = results.filter((r) => r !== null && r.delivered > 0).length;
    const alertsUndelivered = toNotify.length - alertsSent;
    const channelFailures = results.reduce((n, r) => n + (r === null ? 1 : r.failed), 0);

    // Record state ONLY for what was actually delivered (undelivered = retried
    // next run), and resolutions for alerts that went back to ok.
    await Promise.all([
      ...toNotify.flatMap((a, i) => {
        const r = results[i];
        return r !== null && r !== undefined && r.delivered > 0 ? [recordAlertState(a.id, 'firing', nowMs)] : [];
      }),
      ...decision.resolved.map((id) => recordAlertState(id, 'resolved', nowMs)),
    ]);

    console.log(
      `[admin/alerts/check] Checked ${alerts.length} alert(s), firing P1/P2: ${alertsFiring}, suppressed: ${alertsSuppressed}, attempted: ${toNotify.length}, delivered: ${alertsSent}, undelivered: ${alertsUndelivered}, channel failures: ${channelFailures}`,
    );

    if (alertsUndelivered > 0) {
      console.error(
        `[admin/alerts/check] ${alertsUndelivered} firing alert(s) reached NO channel (none configured or all failed) - answering 424`,
      );
      return NextResponse.json(
        {
          error: 'Alert delivery failed',
          checked: true,
          alertsFiring,
          alertsSent,
          alertsSuppressed,
          alertsUndelivered,
        },
        { status: 424 },
      );
    }

    if (channelFailures > 0) {
      // Every alert reached >= 1 channel, but a configured channel failed: the
      // redundancy has decayed (revoked Slack webhook next to working email).
      // Distinct status so the job can fail on it without the body (row #266).
      console.error(
        `[admin/alerts/check] ${channelFailures} channel delivery failure(s); every alert still reached >= 1 channel - answering 207`,
      );
      return NextResponse.json(
        { checked: true, alertsFiring, alertsSent, alertsSuppressed, channelFailures },
        { status: 207 },
      );
    }

    return NextResponse.json({ checked: true, alertsFiring, alertsSent, alertsSuppressed, channelFailures });
  } catch (err) {
    console.error('[admin/alerts/check GET]', err);
    reportApiError('/api/admin/alerts/check', 500);
    return NextResponse.json({ error: 'Failed to check alerts' }, { status: 500 });
  }
}

export const GET = withApiRoute('/api/admin/alerts/check', handleGET);
