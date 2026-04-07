import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * POST /api/analytics/events — receives batched client-side analytics events.
 *
 * Events are logged server-side for now. When an analytics backend
 * (PostHog, Segment, etc.) is integrated, events will be forwarded there.
 *
 * No auth required for event ingestion (allows pre-login tracking),
 * but user ID is attached when available.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ ok: true, received: 0 });
    }

    // Attach user ID if authenticated
    let userId: string | undefined;
    try {
      const session = await auth();
      userId = session?.user?.id;
    } catch {
      // Pre-login events won't have a session — that's fine
    }

    // Enrich and log events
    const enriched = events.slice(0, 100).map((event: any) => ({
      ...event,
      userId,
      receivedAt: new Date().toISOString(),
    }));

    // Log for now — replace with analytics backend integration
    for (const event of enriched) {
      console.log('[analytics:event]', JSON.stringify({
        event: event.event,
        userId: event.userId,
        timestamp: event.timestamp,
        url: event.url,
      }));
    }

    // TODO: Forward to PostHog/Segment when configured
    // await postHogClient.capture(enriched);

    return NextResponse.json({ ok: true, received: enriched.length });
  } catch {
    return NextResponse.json({ ok: true, received: 0 });
  }
}
