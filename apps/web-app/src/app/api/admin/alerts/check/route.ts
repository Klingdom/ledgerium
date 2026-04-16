import { NextRequest, NextResponse } from 'next/server';
import { computeAlerts } from '@/lib/compute-alerts';
import { sendAlertNotification } from '@/lib/notifications';

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
 * The secret must be provided via one of:
 *   Authorization: Bearer <CRON_SECRET>
 *   ?secret=<CRON_SECRET>
 *
 * Required env var: CRON_SECRET
 *
 * Response:
 *   { checked: true, alertsSent: number }
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    // CRON_SECRET not configured — refuse to run to avoid open access
    console.error('[admin/alerts/check] CRON_SECRET env var is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Accept the secret via Authorization header or query param
  const authHeader = request.headers.get('authorization') ?? '';
  const querySecret = request.nextUrl.searchParams.get('secret') ?? '';
  const provided = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : querySecret.trim();

  if (provided !== cronSecret) {
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
    return NextResponse.json({ error: 'Failed to check alerts' }, { status: 500 });
  }
}
