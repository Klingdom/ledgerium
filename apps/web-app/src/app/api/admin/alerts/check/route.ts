import { withApiRoute } from '@/lib/with-api-route';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { computeAlerts } from '@/lib/compute-alerts';
import { sendAlertNotification } from '@/lib/notifications';
import { reportApiError } from '@/lib/api-error-reporting';

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
 *   200  nothing firing, or every firing P1/P2 alert reached >= 1 channel
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
 * delivered (partial channel failure -> 200 plus a console warning); if any
 * firing alert reached no channel the response is 424, so a Slack that accepts
 * the first message and rate-limits the second is still caught.
 *
 * Response bodies carry COUNTS only - never alert messages, webhook URLs or
 * addresses.
 *   200: { checked, alertsFiring, alertsSent (delivered), channelFailures }
 *   424: { error, checked, alertsFiring, alertsSent, alertsUndelivered }
 */
async function handleGET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
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

  // Accept the secret ONLY via Authorization: Bearer <CRON_SECRET>
  // Query-param delivery is intentionally not supported (log-exposure risk).
  const authHeader = request.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const provided = match?.[1] ?? '';

  // Timing-safe comparison — prevents timing oracle on secret value.
  // Length check is safe because expectedBuf is a server-side constant.
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(cronSecret, 'utf8');

  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const alerts = await computeAlerts();

    // Only notify for P1 and P2 firing alerts
    const toNotify = alerts.filter(
      (a) => a.status === 'firing' && (a.severity === 'P1' || a.severity === 'P2'),
    );

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

    console.log(
      `[admin/alerts/check] Checked ${alerts.length} alert(s), firing P1/P2: ${toNotify.length}, delivered: ${alertsSent}, undelivered: ${alertsUndelivered}, channel failures: ${channelFailures}`,
    );

    if (alertsUndelivered > 0) {
      console.error(
        `[admin/alerts/check] ${alertsUndelivered} firing alert(s) reached NO channel (none configured or all failed) - answering 424`,
      );
      return NextResponse.json(
        {
          error: 'Alert delivery failed',
          checked: true,
          alertsFiring: toNotify.length,
          alertsSent,
          alertsUndelivered,
        },
        { status: 424 },
      );
    }

    if (channelFailures > 0) {
      console.warn(`[admin/alerts/check] ${channelFailures} channel delivery failure(s); every alert still reached >= 1 channel`);
    }

    return NextResponse.json({ checked: true, alertsFiring: toNotify.length, alertsSent, channelFailures });
  } catch (err) {
    console.error('[admin/alerts/check GET]', err);
    reportApiError('/api/admin/alerts/check', 500);
    return NextResponse.json({ error: 'Failed to check alerts' }, { status: 500 });
  }
}

export const GET = withApiRoute('/api/admin/alerts/check', handleGET);
