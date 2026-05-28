/**
 * Per-IP in-memory rate-limit token bucket for admin bootstrap.
 *
 * Bootstrap is the highest-privilege endpoint in the codebase — it promotes
 * the first authenticated user to admin. Even though bootstrap is disabled in
 * production via DISABLE_ADMIN_BOOTSTRAP=true, rate-limiting is applied as
 * defense-in-depth.
 *
 * @ledgerium-rate-limit-cold-start-acceptable-risk
 * In-process Map resets on server cold start / pod restart, meaning the
 * window effectively resets on deploy. This is an acceptable tradeoff at MVP
 * scale (single-process Next.js on Railway/Render). Phase 2 upgrade path:
 * Postgres-backed token bucket or Redis sliding-window counter. Cold-start
 * risk acknowledged at iter 086 for invite-accept rate limiter using the
 * same pattern.
 *
 * @iter 091 / ADM-002 PR-2 Sub-task 3
 */

interface RateLimitBucket {
  count: number;
  resetAt: number; // epoch ms
}

export const BOOTSTRAP_RATE_LIMIT_MAX = 3; // requests per IP per window
export const BOOTSTRAP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Module-level Map — resets on cold start (see risk note above). */
const bootstrapRateLimitBuckets = new Map<string, RateLimitBucket>();

/**
 * Check and increment the per-IP bootstrap rate limit.
 * Returns { allowed: true } or { allowed: false, retryAfterSeconds }.
 *
 * Skipped entirely when NODE_ENV === 'test' to prevent cross-test state
 * pollution. Tests that explicitly test rate-limit behaviour must call
 * resetBootstrapRateLimitBuckets() in beforeEach and invoke the bucket
 * functions directly.
 */
export function checkBootstrapRateLimit(
  ip: string,
  nowMs: number,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  // Bypass in test environment to prevent cross-test state pollution.
  if (process.env.NODE_ENV === 'test') {
    return { allowed: true };
  }

  // GC stale buckets on each request (amortised cleanup, no separate interval).
  for (const [key, bucket] of bootstrapRateLimitBuckets) {
    if (bucket.resetAt < nowMs) {
      bootstrapRateLimitBuckets.delete(key);
    }
  }

  const bucket = bootstrapRateLimitBuckets.get(ip);
  if (!bucket || bucket.resetAt < nowMs) {
    // Fresh or expired bucket — start a new window.
    bootstrapRateLimitBuckets.set(ip, {
      count: 1,
      resetAt: nowMs + BOOTSTRAP_RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (bucket.count >= BOOTSTRAP_RATE_LIMIT_MAX) {
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
export function resetBootstrapRateLimitBuckets(): void {
  bootstrapRateLimitBuckets.clear();
}
