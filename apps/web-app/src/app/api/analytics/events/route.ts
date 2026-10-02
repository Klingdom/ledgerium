import { withApiRoute } from '@/lib/with-api-route';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { reportApiError } from '@/lib/api-error-reporting';
import { computeDashboardV2RetirementMetrics } from '@/lib/dashboard-v2-retirement-metrics';

/**
 * POST /api/analytics/events — receives and persists batched analytics events.
 * GET  /api/analytics/events — retrieves aggregated event data for the dashboard.
 */

async function handlePOST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ ok: true, received: 0, attempted: 0, failed: 0, truncated: 0 });
    }

    let userId: string | undefined;
    try {
      const session = await auth();
      userId = session?.user?.id;
    } catch {
      // Pre-login events won't have a session
    }

    // Persist events to database (batch insert).
    // REVENUE_PLAN_20K attribution fix (2026-08 —
    // docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §2): `visitorId` is
    // promoted to its own first-class indexed column instead of being left
    // inside the `properties` JSON blob (filterProperties strips it below).
    /*
      Row #243. `slice(0, 100)` used to drop the remainder in silence. The cap
      stays — an unbounded batch is a denial-of-service shape — but a batch
      that was truncated now says so in the response rather than vanishing.
      The client is fire-and-forget today, so nothing acts on it; the point is
      that the information exists at all if anyone ever looks.
    */
    const MAX_BATCH = 100;
    const truncated = Math.max(0, events.length - MAX_BATCH);

    const records = events.slice(0, MAX_BATCH).map((event: any) => ({
      userId: userId ?? event.userId ?? null,
      visitorId: typeof event.visitorId === 'string' ? event.visitorId : null,
      eventName: event.event ?? 'unknown',
      properties: JSON.stringify(filterProperties(event)),
      url: event.url ?? null,
      source: event.source ?? 'client',
    }));

    /*
      Row #243. This loop used to sit inside a single `try`, so the first
      failing row aborted every row after it — and the response still reported
      `received: records.length`, the number of records *built*. A batch could
      lose most of itself and be told it had arrived intact.

      Two changes. Each row gets its own `try`, so one bad event costs one
      event rather than the tail of the batch. And the response reports what
      was actually written, so "received" means received.

      The request still succeeds regardless: analytics must never surface as a
      broken page. Honest body, benign status — those are separable, and
      conflating them is what produced a success report over a partial write.
    */
    let persisted = 0;
    const failures: unknown[] = [];

    for (const record of records) {
      try {
        await (db as any).analyticsEvent.create({ data: record });
        persisted++;
      } catch (err) {
        failures.push(err);
      }
    }

    if (failures.length > 0) {
      // One line per batch rather than per row: a failing DB would otherwise
      // turn a log into a denial-of-service against itself.
      console.error(
        `[analytics:persist] ${failures.length} of ${records.length} events failed to persist`,
        failures[0],
      );
    }

    return NextResponse.json({
      ok: failures.length === 0 && truncated === 0,
      received: persisted,
      attempted: records.length,
      failed: failures.length,
      truncated,
    });
  } catch (err) {
    // A malformed body or an unreadable request. Still a 200 — see above — but
    // `ok: false` and a zero count, rather than `ok: true` over nothing.
    console.error('[analytics:persist] batch rejected', err);
    return NextResponse.json({ ok: false, received: 0, attempted: 0, failed: 0, truncated: 0 });
  }
}

/**
 * GET /api/analytics/events — aggregated event data for the product dashboard.
 * Query params: ?days=30 (default 30 days lookback)
 */
async function handleGET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Product analytics is admin-only — regular users must not see global metrics
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const params = req.nextUrl.searchParams;
    const days = parseDaysParam(params.get('days'));
    if (days === null) {
      return NextResponse.json(
        { error: `days must be an integer between 1 and ${MAX_DAYS}` },
        { status: 400 },
      );
    }
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get all events in window
    const events = await (db as any).analyticsEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });

    // Aggregate by event name
    const eventCounts: Record<string, number> = {};
    const dailyCounts: Record<string, Record<string, number>> = {};
    const uniqueUsers = new Set<string>();

    for (const evt of events) {
      const name = evt.eventName;
      eventCounts[name] = (eventCounts[name] ?? 0) + 1;

      if (evt.userId) uniqueUsers.add(evt.userId);

      // Daily breakdown
      const day = new Date(evt.createdAt).toISOString().slice(0, 10);
      if (!dailyCounts[day]) dailyCounts[day] = {};
      dailyCounts[day]![name] = (dailyCounts[day]![name] ?? 0) + 1;
    }

    // Compute funnels
    const activationFunnel = computeFunnel(events, [
      'signup_completed',
      'workflow_uploaded',
      'first_sop_viewed',
      'first_process_map_viewed',
    ]);

    const conversionFunnel = computeFunnel(events, [
      'plan_limit_hit',
      'upgrade_prompt_viewed',
      'upgrade_clicked',
      'checkout_started',
      'subscription_created',
    ]);

    // Top pages
    const pageCounts: Record<string, number> = {};
    for (const evt of events) {
      if (evt.eventName === 'page_viewed') {
        try {
          const props = JSON.parse(evt.properties ?? '{}');
          const path = props.path ?? 'unknown';
          pageCounts[path] = (pageCounts[path] ?? 0) + 1;
        } catch { /* skip malformed */ }
      }
    }

    return NextResponse.json({
      summary: {
        totalEvents: events.length,
        uniqueUsers: uniqueUsers.size,
        periodDays: days,
        since: since.toISOString(),
      },
      eventCounts,
      dailyCounts,
      funnels: {
        activation: activationFunnel,
        conversion: conversionFunnel,
      },
      topPages: Object.entries(pageCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([path, count]) => ({ path, count })),
      // Row #247: #57 retirement criteria 1 (bounce) and 3 (chip-click).
      dashboardV2Retirement: computeDashboardV2RetirementMetrics(events),
    });
  } catch (err) {
    console.error('[analytics/GET]', err);
    reportApiError('/api/analytics/events', 500);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Row #254. `parseInt('abc')` is NaN, which became an invalid Date and a Prisma
 * throw — a client typo reported as a server failure. Accept only a plain
 * base-10 integer in [1, MAX_DAYS]; absent means the 30-day default.
 * 365 = one year of lookback: the query loads every event in the window with no
 * row limit (also #254), so the bound doubles as a cap on that cost.
 * (Not exported: Next route files may only export HTTP methods and config.)
 */
const MAX_DAYS = 365;
function parseDaysParam(raw: string | null): number | null {
  if (raw === null) return 30;
  if (!/^\d{1,6}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= MAX_DAYS ? n : null;
}

function filterProperties(event: any): Record<string, unknown> {
  // visitorId is stripped here too — it is now stored in the first-class
  // `AnalyticsEvent.visitorId` column (see the record-mapping above), not
  // duplicated inside the properties JSON blob.
  const { event: _name, timestamp: _ts, url: _url, source: _src, userId: _uid, visitorId: _vid, ...rest } = event;
  return rest;
}

function computeFunnel(
  events: any[],
  steps: string[],
): Array<{ step: string; count: number; dropoff: number; rate: number }> {
  // Count unique users who performed each step
  const usersByStep: Record<string, Set<string>> = {};
  for (const step of steps) {
    usersByStep[step] = new Set();
  }

  for (const evt of events) {
    if (steps.includes(evt.eventName) && evt.userId) {
      usersByStep[evt.eventName]!.add(evt.userId);
    }
  }

  return steps.map((step, i) => {
    const count = usersByStep[step]!.size;
    const prevCount = i === 0 ? count : usersByStep[steps[i - 1]!]!.size;
    const dropoff = i === 0 ? 0 : Math.max(0, prevCount - count);
    const rate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
    return { step, count, dropoff, rate };
  });
}

export const POST = withApiRoute('/api/analytics/events', handlePOST);
export const GET = withApiRoute('/api/analytics/events', handleGET);
