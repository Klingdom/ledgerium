/**
 * Per-team in-memory rate-limit token bucket for invite creation.
 *
 * Extracted from `apps/web-app/src/app/api/teams/[id]/invite/route.ts` at iter
 * 088 coordinator-cleanup to satisfy Next.js route module export constraints
 * (route files cannot export arbitrary symbols beyond HTTP method handlers + config).
 *
 * @ledgerium-rate-limit-cold-start-acceptable-risk
 * In-process Map resets on server cold start / pod restart, meaning the
 * window effectively resets on deploy. This is an acceptable tradeoff at MVP
 * scale (single-process Next.js on Railway/Render). Phase 2 upgrade path:
 * Postgres-backed token bucket or Redis sliding-window counter per
 * TEAM-PROGRESS-001 CD-4. Cold-start risk was explicitly acknowledged by CEO
 * at iter 086 for the invites/accept rate limiter using the same pattern.
 *
 * @iter 088 / TEAM-P03.8 Sub-task 6
 */

interface RateLimitBucket {
  count: number;
  resetAt: number; // epoch ms
}

export const INVITE_RATE_LIMIT_MAX = 20; // invites per team per window
export const INVITE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour rolling window

/** Module-level Map — resets on cold start (see risk note above). */
const inviteRateLimitBuckets = new Map<string, RateLimitBucket>();

/**
 * Check and increment the per-team invite rate limit.
 * Returns { allowed: true } or { allowed: false, retryAfterSeconds }.
 *
 * Skipped entirely when NODE_ENV === 'test' to prevent test pollution.
 */
export function checkInviteRateLimit(
  teamId: string,
  nowMs: number,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  // Bypass in test environment to prevent cross-test state pollution.
  if (process.env.NODE_ENV === 'test') {
    return { allowed: true };
  }

  // GC stale buckets on each request (amortised cleanup, no separate interval).
  for (const [key, bucket] of inviteRateLimitBuckets) {
    if (bucket.resetAt < nowMs) {
      inviteRateLimitBuckets.delete(key);
    }
  }

  const bucket = inviteRateLimitBuckets.get(teamId);
  if (!bucket || bucket.resetAt < nowMs) {
    // Fresh or expired bucket — start a new window.
    inviteRateLimitBuckets.set(teamId, {
      count: 1,
      resetAt: nowMs + INVITE_RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (bucket.count >= INVITE_RATE_LIMIT_MAX) {
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
export function resetInviteRateLimitBuckets(): void {
  inviteRateLimitBuckets.clear();
}
