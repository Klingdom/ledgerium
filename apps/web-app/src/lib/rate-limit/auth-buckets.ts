/**
 * Generic IP-keyed in-memory rate-limit token bucket for the public auth
 * endpoints (forgot-password, signup, login).
 *
 * Mirrors the per-team `invite-buckets.ts` / per-IP `bootstrap-buckets.ts`
 * pattern, but is parameterized by `{ max, windowMs }` so one module can back
 * every auth endpoint with its own limit while sharing a single test-bypass
 * rule. Callers compose the bucket key themselves using the `${purpose}:${ip}`
 * convention (e.g. `forgot:203.0.113.7`) so distinct endpoints never share a
 * bucket even when called from the same IP.
 *
 * @ledgerium-rate-limit-cold-start-acceptable-risk
 * In-process LRU resets on server cold start / pod restart, meaning the
 * window effectively resets on deploy. This is an acceptable tradeoff at MVP
 * scale (single-process Next.js on Railway/Render). Phase 2 upgrade path:
 * Postgres-backed token bucket or Redis sliding-window counter per
 * TEAM-PROGRESS-001 CD-4. Cold-start risk was explicitly acknowledged by CEO
 * at iter 086 for the invites/accept rate limiter using the same pattern.
 */

import { BoundedLru } from './bounded-lru';

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

/**
 * Row #360: hard ceiling on tracked addresses PER PURPOSE (login / signup /
 * forgot each get their own bounded LRU, so one endpoint's flood cannot evict
 * another's buckets). Capacity rationale and measured memory: see the row #360
 * note in the test file / loop report; summary: measured with --expose-gc
 * at capacity: 0.5-2.3 MB per purpose (IPv4 / IPv6 / 64-char keys, ~25-120 B/entry),
 * so <= ~7 MB for all three purposes; the
 * honest need is the number of distinct client addresses attempting an auth
 * action inside ONE window (15 min login / 60 min signup), which is far below
 * 20k for this product. A spoofed-IP flood must rotate more than 20k distinct
 * values inside the window to evict anyone (the bounded-reset trade-off
 * documented in bounded-lru.ts; row #225 closes spoofing).
 */
export const AUTH_MAX_TRACKED_KEYS_PER_PURPOSE = 20_000;

/** Purposes are fixed by code ('forgot' | 'signup' | 'login'); these caps contain pathological callers (at most MAX_PURPOSES LRUs + the shared fallback). */
const MAX_PURPOSES = 8;
const MAX_PURPOSE_LENGTH = 16;
const OTHER_PURPOSE = '__other__';

/**
 * KEY LENGTH (row #360 / MR-069). The old single map keyed `${purpose}:${ip}`,
 * so bounded-lru's 64-char cap would have applied to purpose + ':' + ip. The
 * longest real textual address is 45 chars (fully expanded IPv4-mapped IPv6);
 * with today's longest prefix 'forgot:' (7) that is 52 and fits, but a purpose
 * of 19+ chars would have pushed a REAL address into the shared overlong bucket.
 * The key is therefore split at the first ':' and every purpose has its own
 * LRU keyed by the address alone: the purpose can never consume key budget, an
 * address of up to 64 chars always has its own bucket, and only values over
 * 64 chars (which are not addresses) collapse into that purpose's overlong bucket.
 */
const authRateLimitBuckets = new Map<string, BoundedLru<RateLimitBucket>>();

function splitKey(key: string): { purpose: string; addr: string } {
  const i = key.indexOf(':');
  if (i <= 0 || i > MAX_PURPOSE_LENGTH) return { purpose: OTHER_PURPOSE, addr: key };
  return { purpose: key.slice(0, i), addr: key.slice(i + 1) };
}

function lruFor(purpose: string): BoundedLru<RateLimitBucket> {
  let lru = authRateLimitBuckets.get(purpose);
  if (lru) return lru;
  if (authRateLimitBuckets.size >= MAX_PURPOSES) {
    purpose = OTHER_PURPOSE;
    lru = authRateLimitBuckets.get(purpose);
    if (lru) return lru;
  }
  lru = new BoundedLru<RateLimitBucket>(AUTH_MAX_TRACKED_KEYS_PER_PURPOSE);
  authRateLimitBuckets.set(purpose, lru);
  return lru;
}

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

  // O(1): no scan. Expired buckets are replaced on touch or evicted by LRU.
  const { purpose, addr } = splitKey(key);
  const lru = lruFor(purpose);
  const bucket = lru.touch(addr);
  if (!bucket || bucket.resetAt < nowMs) {
    // Fresh or expired bucket — start a new window.
    lru.set(addr, {
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
 * Reset the rate-limit state. Exposed for test introspection only —
 * do NOT call from production code.
 *
 * @internal
 */
export function resetAuthRateLimitBuckets(): void {
  authRateLimitBuckets.clear();
}

/**
 * Tracked addresses (one purpose, or the total across purposes). Test
 * introspection only.
 *
 * @internal
 */
export function authTrackedKeyCount(purpose?: string): number {
  if (purpose !== undefined) return authRateLimitBuckets.get(purpose)?.size ?? 0;
  let n = 0;
  for (const lru of authRateLimitBuckets.values()) n += lru.size;
  return n;
}
