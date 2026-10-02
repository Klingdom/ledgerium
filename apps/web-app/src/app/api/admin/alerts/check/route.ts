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
 * Delivery channels (optional, console-only if both unset): SLACK_ALERTS_WEBHOOK_URL,
 * ALERT_EMAIL_TO (email additionally needs the SMTP_* vars used by lib/email.ts).
 *
 * Response:
 *   { checked: true, alertsSent: number }
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

    await Promise.allSettled(
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

    console.log(`[admin/alerts/check] Checked ${alerts.length} alert(s), sent ${toNotify.length} notification(s)`);

    return NextResponse.json({ checked: true, alertsSent: toNotify.length });
  } catch (err) {
    console.error('[admin/alerts/check GET]', err);
    reportApiError('/api/admin/alerts/check', 500);
    return NextResponse.json({ error: 'Failed to check alerts' }, { status: 500 });
  }
}

export const GET = withApiRoute('/api/admin/alerts/check', handleGET);
