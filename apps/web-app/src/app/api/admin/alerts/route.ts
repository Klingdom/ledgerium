import { withApiRoute } from '@/lib/with-api-route';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { computeAlerts, type AlertSeverity } from '@/lib/compute-alerts';
import { sendAlertNotification, type AlertDeliveryResult } from '@/lib/notifications';
import { reportApiError } from '@/lib/api-error-reporting';

/**
 * GET  /api/admin/alerts
 *   Admin-only. Evaluates all alert conditions and returns their current firing
 *   status. Poll-safe — no side effects.
 *
 *   Response: { alerts: AlertResult[], summary: { firing, ok, insufficientData } }
 *
 * POST /api/admin/alerts
 *   Admin-only. Evaluates all alert conditions, then pushes notifications for
 *   any alert that is firing at or above the requested severity threshold.
 *
 *   Request body (optional JSON):
 *     { threshold?: 'P1' | 'P2' | 'P3' }   — default 'P2' (P1 + P2)
 *
 *   Response (row #266: real outcomes, not "sent" regardless):
 *     { threshold, alertsFiring, alertsDelivered, alertsUndelivered,
 *       channels: { configured, delivered, failed },       // summed over alerts
 *       deliveries: [{ id, severity, configured, delivered, failed }],
 *       alerts: AlertResult[] }
 *   Status: 200 every firing alert reached >= 1 channel (channels.failed > 0 is
 *   a partial failure, visible here); 424 a firing alert reached NO channel
 *   (none configured or all failed). Nothing firing = 200 with zero counts.
 */

// Severity ordering used to filter by threshold (lower number = higher priority)
const SEVERITY_ORDER: Record<AlertSeverity, number> = { P1: 1, P2: 2, P3: 3 };

// ── GET ───────────────────────────────────────────────────────────────────────

async function handleGET() {
  const session = await auth();

  if (!canAccessAdmin(session)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const alerts = await computeAlerts();

    const summary = alerts.reduce(
      (acc, alert) => {
        if (alert.status === 'firing') acc.firing++;
        else if (alert.status === 'ok') acc.ok++;
        else acc.insufficientData++;
        return acc;
      },
      { firing: 0, ok: 0, insufficientData: 0 },
    );

    return NextResponse.json({ alerts, summary });
  } catch (err) {
    console.error('[admin/alerts GET]', err);
    reportApiError('/api/admin/alerts', 500);
    return NextResponse.json({ error: 'Failed to evaluate alerts' }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

async function handlePOST(request: Request) {
  const session = await auth();

  if (!canAccessAdmin(session)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Parse optional threshold from body — default P2 (sends P1 + P2)
  let threshold: AlertSeverity = 'P2';
  try {
    const body = await request.json() as { threshold?: string };
    if (body.threshold === 'P1' || body.threshold === 'P2' || body.threshold === 'P3') {
      threshold = body.threshold;
    }
  } catch {
    // No body or invalid JSON — use default threshold
  }

  try {
    const alerts = await computeAlerts();

    const firingInScope = alerts.filter(
      (a) => a.status === 'firing' && SEVERITY_ORDER[a.severity] <= SEVERITY_ORDER[threshold],
    );

    const settled = await Promise.allSettled(
      firingInScope.map((a) => {
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

    // Real outcomes (row #266). A sender that threw despite its contract is one
    // failed channel and an undelivered alert, never "sent".
    const deliveries = firingInScope.map((a, i) => {
      const r = settled[i];
      const outcome: AlertDeliveryResult =
        r !== undefined && r.status === 'fulfilled' && r.value
          ? r.value
          : { configured: 1, delivered: 0, failed: 1 };
      return { id: a.id, severity: a.severity, ...outcome };
    });
    const alertsDelivered = deliveries.filter((d) => d.delivered > 0).length;
    const alertsUndelivered = deliveries.length - alertsDelivered;
    const channels = deliveries.reduce(
      (acc, d) => ({
        configured: acc.configured + d.configured,
        delivered: acc.delivered + d.delivered,
        failed: acc.failed + d.failed,
      }),
      { configured: 0, delivered: 0, failed: 0 },
    );

    console.log(
      `[admin/alerts POST] threshold=${threshold} firing: ${deliveries.length}, delivered: ${alertsDelivered}, undelivered: ${alertsUndelivered}, channel failures: ${channels.failed}`,
    );

    // 424 as in alerts/check: the evaluation ran, but a firing alert reached no
    // channel. Partial channel failure stays 200 with channels.failed > 0.
    return NextResponse.json(
      {
        threshold,
        alertsFiring: deliveries.length,
        alertsDelivered,
        alertsUndelivered,
        channels,
        deliveries,
        alerts,
      },
      { status: alertsUndelivered > 0 ? 424 : 200 },
    );
  } catch (err) {
    console.error('[admin/alerts POST]', err);
    reportApiError('/api/admin/alerts', 500);
    return NextResponse.json({ error: 'Failed to evaluate and notify alerts' }, { status: 500 });
  }
}

export const GET = withApiRoute('/api/admin/alerts', handleGET);
export const POST = withApiRoute('/api/admin/alerts', handlePOST);
