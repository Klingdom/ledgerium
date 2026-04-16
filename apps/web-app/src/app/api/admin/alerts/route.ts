import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { computeAlerts, type AlertSeverity } from '@/lib/compute-alerts';
import { sendAlertNotification } from '@/lib/notifications';

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
 *   Response: { sent: number, alerts: AlertResult[] }
 */

// Severity ordering used to filter by threshold (lower number = higher priority)
const SEVERITY_ORDER: Record<AlertSeverity, number> = { P1: 1, P2: 2, P3: 3 };

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    return NextResponse.json({ error: 'Failed to evaluate alerts' }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    await Promise.allSettled(
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

    console.log(`[admin/alerts POST] Sent ${firingInScope.length} notification(s) (threshold=${threshold})`);

    return NextResponse.json({ sent: firingInScope.length, alerts });
  } catch (err) {
    console.error('[admin/alerts POST]', err);
    return NextResponse.json({ error: 'Failed to evaluate and notify alerts' }, { status: 500 });
  }
}
