import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

/**
 * POST /api/analytics/events — receives and persists batched analytics events.
 * GET  /api/analytics/events — retrieves aggregated event data for the dashboard.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ ok: true, received: 0 });
    }

    let userId: string | undefined;
    try {
      const session = await auth();
      userId = session?.user?.id;
    } catch {
      // Pre-login events won't have a session
    }

    // Persist events to database (batch insert)
    const records = events.slice(0, 100).map((event: any) => ({
      userId: userId ?? event.userId ?? null,
      eventName: event.event ?? 'unknown',
      properties: JSON.stringify(filterProperties(event)),
      url: event.url ?? null,
      source: event.source ?? 'client',
    }));

    try {
      for (const record of records) {
        await (db as any).analyticsEvent.create({ data: record });
      }
    } catch (err) {
      // Don't fail the request if DB write fails
      console.error('[analytics:persist]', err);
    }

    return NextResponse.json({ ok: true, received: records.length });
  } catch {
    return NextResponse.json({ ok: true, received: 0 });
  }
}

/**
 * GET /api/analytics/events — aggregated event data for the product dashboard.
 * Query params: ?days=30 (default 30 days lookback)
 */
export async function GET(req: NextRequest) {
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
    const days = parseInt(params.get('days') ?? '30', 10);
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
    });
  } catch (err) {
    console.error('[analytics/GET]', err);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function filterProperties(event: any): Record<string, unknown> {
  const { event: _name, timestamp: _ts, url: _url, source: _src, userId: _uid, ...rest } = event;
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
