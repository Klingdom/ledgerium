/**
 * Per-IP in-memory rate limit for the public POST /api/analytics/events (row #295).
 *
 * Limit: 120 requests / IP / minute. The client flushes at most once per
 * FLUSH_DEBOUNCE_MS (2 s) per tab when the 10-event threshold is hit, plus one
 * beacon per tab-hide/unload — i.e. a worst-case busy tab is ~30 req/min. 120
 * leaves four such tabs (or a small office NAT) untouched; the server also
 * caps each request at 100 events, so an attacker is bounded at ~12k
 * allowlisted rows/min/IP rather than unbounded.
 *
 * SPOOFABLE: keyed on getClientIp(), which trusts the first X-Forwarded-For
 * entry until row #225 sets TRUSTED_PROXY_HOPS. Until then this limit slows a
 * naive flood but a header-rotating attacker bypasses it. The allowlist and
 * server-only alert inputs are what actually protect alert integrity.
 *
 * @ledgerium-rate-limit-cold-start-acceptable-risk
 * In-process bounded LRU; resets on restart (same accepted risk as the sibling buckets).
 */

import { BoundedLru } from './bounded-lru';

interface Bucket {
  count: number;
  resetAt: number;
}

export const ANALYTICS_INGEST_RATE_LIMIT_MAX = 120;
export const ANALYTICS_INGEST_RATE_LIMIT_WINDOW_MS = 60 * 1000;

/**
 * Row #299: hard ceiling on tracked keys (see bounded-lru.ts for the eviction
 * trade-off). Measured (node, 20k entries): ~207 B/entry with IP-length keys,
 * ~342 B/entry with 64-char keys, i.e. 4.1 MB typical and 6.8 MB worst case at
 * capacity. That holds ONLY because stored keys are flat copies (row #361): as
 * substrings of the raw X-Forwarded-For header each key retained the whole
 * header, and 20k keys cut from 12 KB entries held ~231 MB (~330 MB at a 16 KB
 * header), so the earlier "~4-7 MB ceiling" was measured on keys built at 64
 * characters. Keys over 64 chars now share one bucket. 20k
 * distinct client IPs inside one minute is far above this product's traffic.
 * With no X-Forwarded-For (and no X-Real-IP) getClientIp() returns the literal
 * 'unknown', so all such requests share ONE bucket (a site-wide limit).
 */
export const ANALYTICS_INGEST_MAX_TRACKED_KEYS = 20_000;

const buckets = new BoundedLru<Bucket>(ANALYTICS_INGEST_MAX_TRACKED_KEYS);

/** Skipped when NODE_ENV === 'test'; tests exercising it stub NODE_ENV (see sibling buckets). */
export function checkAnalyticsIngestRateLimit(
  ip: string,
  nowMs: number,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  if (process.env.NODE_ENV === 'test') return { allowed: true };

  // O(1): no scan. Expired entries are replaced on touch or evicted by LRU.
  const bucket = buckets.touch(ip);
  if (!bucket || bucket.resetAt < nowMs) {
    buckets.set(ip, { count: 1, resetAt: nowMs + ANALYTICS_INGEST_RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (bucket.count >= ANALYTICS_INGEST_RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - nowMs) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true };
}

/** @internal test use only */
export function resetAnalyticsIngestRateLimitBuckets(): void {
  buckets.clear();
}

/**
 * Row #299: request body cap for POST /api/analytics/events, enforced while
 * reading and BEFORE JSON.parse. Largest legitimate body: sendBeacon and
 * keepalive fetch are capped by browsers at 64 KiB, and routine flushes carry
 * ~10 events. The server persists only the first 100 events, so a body over
 * 256 KiB (4x the browser ceiling) is not an honest batch. (Lives here, not in
 * the route file, because Next route modules may export only HTTP handlers.)
 */
export const ANALYTICS_MAX_BODY_BYTES = 256 * 1024;

/** @internal test use only */
export function analyticsIngestTrackedKeyCount(): number {
  return buckets.size;
}
