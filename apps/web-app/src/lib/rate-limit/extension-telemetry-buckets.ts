/**
 * Per-IP in-memory rate-limit token bucket for the public extension
 * telemetry ingest endpoint (POST /api/analytics/extension, ADMIN-P02 /
 * backlog row #148).
 *
 * This endpoint is deliberately unauthenticated — `extension_installed` must
 * fire before the user has ever signed in — so it is the one analytics
 * ingest route reachable by an unauthenticated client. Rate-limiting is
 * defense-in-depth against abuse (event flooding, scraping for signal, etc.)
 * rather than a strict per-install quota: legitimate traffic per IP can
 * include many installs behind a shared corporate NAT/proxy, so the limit is
 * generous relative to the endpoint's actual legitimate volume (at most 3
 * events per install: one at install time, at most one per day thereafter,
 * and one sign-in link, ever).
 *
 * Mirrors the per-IP `bootstrap-buckets.ts` / generic `auth-buckets.ts`
 * pattern (own module per endpoint family, same GC-on-request + test-bypass
 * shape) rather than sharing a bucket with unrelated endpoints.
 *
 * @ledgerium-rate-limit-cold-start-acceptable-risk
 * In-process bounded LRU resets on server cold start / pod restart, meaning the
 * window effectively resets on deploy. Acceptable tradeoff at MVP scale
 * (single-process Next.js on Railway/Render) — same accepted risk as
 * bootstrap-buckets.ts / auth-buckets.ts.
 */

import { BoundedLru } from './bounded-lru';

interface RateLimitBucket {
  count: number;
  resetAt: number; // epoch ms
}

export const EXTENSION_TELEMETRY_RATE_LIMIT_MAX = 30; // requests per IP per window
export const EXTENSION_TELEMETRY_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Row #360: hard ceiling on tracked IPs (eviction trade-off: see bounded-lru.ts).
 * Honest need: distinct client IPs hitting the ingest inside one 5-minute
 * window (at most 3 events per install, ever); 20k is far above that. Measured
 * with --expose-gc at capacity: 0.5-2.3 MB (IPv4 / 64-char keys). The key is the bare address from
 * getClientIp(), so there is no prefix to eat key budget (any value over 64
 * chars is not an address and shares one overlong bucket).
 */
export const EXTENSION_TELEMETRY_MAX_TRACKED_KEYS = 20_000;

const extensionTelemetryRateLimitBuckets = new BoundedLru<RateLimitBucket>(EXTENSION_TELEMETRY_MAX_TRACKED_KEYS);

/**
 * Check and increment the per-IP extension-telemetry rate limit.
 * Returns { allowed: true } or { allowed: false, retryAfterSeconds }.
 *
 * Skipped entirely when NODE_ENV === 'test' to prevent cross-test state
 * pollution. Tests that explicitly exercise rate-limit behaviour must call
 * this function directly with NODE_ENV forced to a non-test value (see
 * bootstrap-buckets.test.ts for the established pattern).
 */
export function checkExtensionTelemetryRateLimit(
  ip: string,
  nowMs: number,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  if (process.env.NODE_ENV === 'test') {
    return { allowed: true };
  }

  // O(1): no scan. Expired buckets are replaced on touch or evicted by LRU.
  const bucket = extensionTelemetryRateLimitBuckets.touch(ip);
  if (!bucket || bucket.resetAt < nowMs) {
    extensionTelemetryRateLimitBuckets.set(ip, {
      count: 1,
      resetAt: nowMs + EXTENSION_TELEMETRY_RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (bucket.count >= EXTENSION_TELEMETRY_RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.ceil((bucket.resetAt - nowMs) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  bucket.count += 1;
  return { allowed: true };
}

/**
 * Reset the rate-limit Map. Exposed for test introspection only —
 * do NOT call from production code.
 *
 * @internal
 */
export function resetExtensionTelemetryRateLimitBuckets(): void {
  extensionTelemetryRateLimitBuckets.clear();
}

/**
 * Tracked IP count. Test introspection only.
 *
 * @internal
 */
export function extensionTelemetryTrackedKeyCount(): number {
  return extensionTelemetryRateLimitBuckets.size;
}
