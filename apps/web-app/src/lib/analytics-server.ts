/**
 * Ledgerium AI — Server-side Analytics
 *
 * Separated from analytics.ts to avoid bundling Node.js-only dependencies
 * (posthog-node, Prisma) into the client-side bundle.
 *
 * Import this module ONLY from API routes and server-side code.
 * Client components should import from './analytics' instead.
 */

import { captureServerEvent } from './posthog-server';
import { db } from '@/db';

// ─── Enriched event (matches client-side shape) ─────────────────────────────

interface EnrichedEvent {
  event: string;
  timestamp: string;
  [key: string]: unknown;
}

// ─── Server-side tracking ────────────────────────────────────────────────────

/**
 * Tracks a server-side analytics event.
 * Used in API routes for events that don't originate from the UI
 * (billing webhooks, sync uploads, background processing).
 *
 * - Persists to the AnalyticsEvent database table
 * - Forwards to PostHog server SDK (if POSTHOG_API_KEY is set)
 * - Logs to console in non-test environments
 * - Non-blocking: never throws, never awaits
 *
 * `properties.visitorId` (REVENUE_PLAN_20K attribution fix, 2026-08 —
 * docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §2): OPTIONAL. Server
 * code has no browser context and cannot read the client's persistent
 * visitorId directly — callers that need to join a server event back to an
 * acquisition source must resolve it themselves first (typically via
 * `User.firstTouchVisitorId`, see billing/webhook/route.ts) and pass it
 * through here. When present, it is written to `AnalyticsEvent.visitorId`
 * (the same first-class indexed column the client `track()` pipeline
 * populates) instead of being buried in the `properties` JSON blob. Existing
 * call sites that never pass `visitorId` are unaffected — the column is
 * nullable and the parameter is optional.
 */
export function trackServer(
  event: string,
  properties: Record<string, unknown> = {},
): void {
  const enriched: EnrichedEvent = {
    event,
    ...properties,
    timestamp: new Date().toISOString(),
    source: 'server',
  };

  if (process.env.NODE_ENV !== 'test') {
    console.log('[analytics:server]', JSON.stringify(enriched));
  }

  // Strip metadata fields from stored properties JSON — userId and visitorId
  // are promoted to their own first-class columns below, not duplicated here.
  const { userId: _uid, visitorId: _vid, timestamp: _ts, source: _src, ...filteredProperties } = properties;

  // Persist to database — fire-and-forget
  void db.analyticsEvent.create({
    data: {
      userId: (properties.userId as string) ?? null,
      visitorId: (properties.visitorId as string) ?? null,
      eventName: event,
      properties: JSON.stringify(filteredProperties),
      source: 'server',
    },
  }).catch((err) => {
    console.error('[analytics:server] DB write failed:', err);
  });

  // Forward to PostHog — fire-and-forget
  const distinctId = (properties.userId as string) ?? 'anonymous';
  captureServerEvent(event, distinctId, filteredProperties);
}

/**
 * Resolves the first-touch anonymous visitorId for a user, for threading
 * into server-side billing events (REVENUE_PLAN_20K attribution fix, 2026-08
 * — docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §2 Step 2).
 *
 * Returns `null` (never throws, never fabricates a value) when the user does
 * not exist or never had a visitorId captured at signup (e.g. accounts
 * created before this fix shipped, or a client whose localStorage was
 * blocked at signup time).
 */
export async function getFirstTouchVisitorId(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { firstTouchVisitorId: true },
    });
    return user?.firstTouchVisitorId ?? null;
  } catch (err) {
    console.error('[analytics:server] getFirstTouchVisitorId lookup failed:', err);
    return null;
  }
}
