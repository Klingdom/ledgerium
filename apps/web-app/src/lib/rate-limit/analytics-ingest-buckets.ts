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
 * In-process Map; resets on restart (same accepted risk as the sibling buckets).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

export const ANALYTICS_INGEST_RATE_LIMIT_MAX = 120;
export const ANALYTICS_INGEST_RATE_LIMIT_WINDOW_MS = 60 * 1000;

const buckets = new Map<string, Bucket>();

/** Skipped when NODE_ENV === 'test'; tests exercising it stub NODE_ENV (see sibling buckets). */
export function checkAnalyticsIngestRateLimit(
  ip: string,
  nowMs: number,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  if (process.env.NODE_ENV === 'test') return { allowed: true };

  for (const [key, b] of buckets) {
    if (b.resetAt < nowMs) buckets.delete(key);
  }
  const bucket = buckets.get(ip);
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
