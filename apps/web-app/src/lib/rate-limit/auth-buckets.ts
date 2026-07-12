/**
 * Generic IP-keyed in-memory rate-limit token bucket for the public auth
 * endpoints (forgot-password, signup, login).
 *
 * Mirrors the per-team `invite-buckets.ts` / per-IP `bootstrap-buckets.ts`
 * pattern, but is parameterized by `{ max, windowMs }` so one module can back
 * every auth endpoint with its own limit while sharing a single GC pass and
 * a single test-bypass rule. Callers compose the bucket key themselves using
 * the `${purpose}:${ip}` convention (e.g. `forgot:203.0.113.7`) so distinct
 * endpoints never share a bucket even when called from the same IP.
 *
 * @ledgerium-rate-limit-cold-start-acceptable-risk
 * In-process Map resets on server cold start / pod restart, meaning the
 * window effectively resets on deploy. This is an acceptable tradeoff at MVP
 * scale (single-process Next.js on Railway/Render). Phase 2 upgrade path:
 * Postgres-backed token bucket or Redis sliding-window counter per
 * TEAM-PROGRESS-001 CD-4. Cold-start risk was explicitly acknowledged by CEO
 * at iter 086 for the invites/accept rate limiter using the same pattern.
 */

interface RateLimitBucket {
  count: number;
  resetAt: number; // epoch ms
}

/** Per-endpoint limits. Keys correspond to the `${purpose}` prefix used to build bucket keys. */
export const AUTH_RATE_LIMITS = {
  forgotPassword: { max: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  signup: { max: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  login: { max: 10, windowMs: 15 * 60 * 1000 }, // 10 per 15 min (brute-force throttling)
} as const;

/** Module-level Map — resets on cold start (see risk note above). */
const authRateLimitBuckets = new Map<string, RateLimitBucket>();

/**
 * Check and increment the rate limit for an arbitrary bucket key.
 * Callers should key with `${purpose}:${ip}` (e.g. `login:203.0.113.7`) so
 * distinct endpoints never share a bucket.
 *
 * Returns { allowed: true } or { allowed: false, retryAfterSeconds }.
 *
 * Skipped entirely when NODE_ENV === 'test' to prevent cross-test state
 * pollution. Tests that explicitly test rate-limit behaviour must call
 * checkAuthRateLimit() directly with NODE_ENV forced to a non-test value.
 */
export function checkAuthRateLimit(
  key: string,
  nowMs: number,
  opts: { max: number; windowMs: number },
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  // Bypass in test environment to prevent cross-test state pollution.
  if (process.env.NODE_ENV === 'test') {
    return { allowed: true };
  }

  // GC stale buckets on each request (amortised cleanup, no separate interval).
  for (const [bucketKey, bucket] of authRateLimitBuckets) {
    if (bucket.resetAt < nowMs) {
      authRateLimitBuckets.delete(bucketKey);
    }
  }

  const bucket = authRateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt < nowMs) {
    // Fresh or expired bucket — start a new window.
    authRateLimitBuckets.set(key, {
      count: 1,
      resetAt: nowMs + opts.windowMs,
    });
    return { allowed: true };
  }

  if (bucket.count >= opts.max) {
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
export function resetAuthRateLimitBuckets(): void {
  authRateLimitBuckets.clear();
}
