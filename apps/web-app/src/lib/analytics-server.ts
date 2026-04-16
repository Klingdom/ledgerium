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

  // Strip metadata fields from stored properties JSON
  const { userId: _uid, timestamp: _ts, source: _src, ...filteredProperties } = properties;

  // Persist to database — fire-and-forget
  void db.analyticsEvent.create({
    data: {
      userId: (properties.userId as string) ?? null,
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
