/**
 * Per-IP rate limit + failure lockout for the UNAUTHENTICATED
 * POST /api/invites/accept (extracted from the route, row #360).
 *
 * Extracted because Next route modules may export only HTTP handlers, and the
 * state needs a tracked-key count for tests. Semantics are byte-for-byte those
 * the route had:
 *   - 10 requests per 60 s window per IP -> blocked
 *   - 5 consecutive 404s -> 1-hour lockout
 *   - a successful token match clears the streak and the lockout
 * There is deliberately NO NODE_ENV==='test' bypass here (the route never had
 * one; its tests exercise the real limiter with vi.resetModules()).
 *
 * BOUNDED (row #360). This was the worst sibling: a plain Map that NEVER deleted
 * an entry, keyed by an unauthenticated, spoofable address, so memory grew for
 * the life of the process. It is now a BoundedLru (hard cap, O(1) touch/evict,
 * keys over 64 chars share one overlong bucket, stored keys copied flat). The
 * key is the bare address from getClientIp(); no prefix competes for key budget.
 *
 * CAPACITY 20,000. Honest need: distinct client addresses that hit the accept
 * endpoint inside one window / lockout (invite-only, 48 h token TTL): a few
 * per invite sent, so far below 20k. Memory measured with --expose-gc at
 * capacity: 2.6 MB with IPv4 keys, 1.8 MB with 64-char keys (~95-135 B/entry).
 *
 * TRADE-OFF (inherent; see bounded-lru.ts): an address idle through more than
 * `capacity` distinct newer addresses is forgotten, including an active
 * 1-hour lockout. Evicting a lockout needs > 20k distinct spoofed addresses
 * inside that hour; row #225 (TRUSTED_PROXY_HOPS) is what closes the spoofing.
 *
 * @ledgerium-rate-limit-cold-start-acceptable-risk
 * Per-instance, in-memory; resets on restart (CEO-acked TEAM-P03.9 Sub-task E;
 * see the cold-start note retained in the route).
 */

import { BoundedLru } from './bounded-lru';

interface RateLimitEntry {
  /** Number of requests in the current window. */
  count: number;
  /** Timestamp (ms) when the current window started. */
  windowStart: number;
  /** Consecutive 404-not-found responses since last success or window reset. */
  failureStreak: number;
  /** If non-zero, requests are blocked until this timestamp (ms). */
  lockedUntil: number;
}

export const INVITE_ACCEPT_MAX_TRACKED_KEYS = 20_000;

const RATE_LIMIT_WINDOW_MS = 60_000; // 1-minute sliding window
const RATE_LIMIT_MAX = 10; // max requests per window
const LOCKOUT_STREAK = 5; // consecutive 404s that trigger lockout
const LOCKOUT_DURATION_MS = 60 * 60_000; // 1-hour lockout

const rateLimits = new BoundedLru<RateLimitEntry>(INVITE_ACCEPT_MAX_TRACKED_KEYS);

/**
 * Check rate limit for the given IP.
 * Returns true if the request should be blocked (rate-limited), false if allowed.
 */
export function checkInviteAcceptRateLimit(ip: string, now: number): boolean {
  const entry = rateLimits.touch(ip);
  if (!entry) return false;

  // Hard lockout check.
  if (entry.lockedUntil > now) return true;

  // Sliding-window check.
  if (now - entry.windowStart < RATE_LIMIT_WINDOW_MS) {
    return entry.count >= RATE_LIMIT_MAX;
  }

  return false;
}

/** Increment request count for the given IP, resetting the window if stale. */
export function recordInviteAcceptRequest(ip: string, now: number): void {
  const entry = rateLimits.peek(ip);
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(ip, {
      count: 1,
      windowStart: now,
      failureStreak: entry?.failureStreak ?? 0,
      lockedUntil: entry?.lockedUntil ?? 0,
    });
    return;
  }
  entry.count += 1;
}

/** Record a 404 "token not found" failure. Triggers lockout when the streak reaches LOCKOUT_STREAK. */
export function recordInviteAcceptFailure(ip: string, now: number): void {
  const entry = rateLimits.peek(ip);
  const streak = (entry?.failureStreak ?? 0) + 1;
  const lockedUntil = streak >= LOCKOUT_STREAK ? now + LOCKOUT_DURATION_MS : (entry?.lockedUntil ?? 0);
  rateLimits.set(ip, {
    count: entry?.count ?? 1,
    windowStart: entry?.windowStart ?? now,
    failureStreak: streak,
    lockedUntil,
  });
}

/** Record a successful token match (resets the failure streak). */
export function recordInviteAcceptSuccess(ip: string): void {
  const entry = rateLimits.peek(ip);
  if (entry) {
    entry.failureStreak = 0;
    entry.lockedUntil = 0;
  }
}

/** @internal test use only */
export function resetInviteAcceptBuckets(): void {
  rateLimits.clear();
}

/** @internal test use only */
export function inviteAcceptTrackedKeyCount(): number {
  return rateLimits.size;
}
