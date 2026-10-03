/**
 * Tests for invite-buckets.ts (per-team invite creation limit), incl. the
 * bounded-LRU behaviour added in row #360.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkInviteRateLimit,
  resetInviteRateLimitBuckets,
  inviteTrackedKeyCount,
  INVITE_RATE_LIMIT_MAX,
  INVITE_RATE_LIMIT_WINDOW_MS,
  INVITE_MAX_TRACKED_KEYS,
} from './invite-buckets';

const T0 = 1_700_000_000_000;

describe('invite-buckets (row #360)', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    resetInviteRateLimitBuckets();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    resetInviteRateLimitBuckets();
  });

  it('never exceeds capacity under N >> cap distinct team ids', () => {
    for (let i = 0; i < INVITE_MAX_TRACKED_KEYS + 5_000; i++) checkInviteRateLimit(`team-${i}`, T0);
    expect(inviteTrackedKeyCount()).toBe(INVITE_MAX_TRACKED_KEYS);
  });

  it('per-request cost does not grow with tracked keys (100k-key loop, time-boxed, no Map iteration)', () => {
    const iterSpy = vi.spyOn(Map.prototype, Symbol.iterator as never);
    const entriesSpy = vi.spyOn(Map.prototype, 'entries');
    const forEachSpy = vi.spyOn(Map.prototype, 'forEach');
    const start = performance.now();
    for (let i = 0; i < 100_000; i++) checkInviteRateLimit(`t${i}`, T0);
    const elapsed = performance.now() - start;
    expect(iterSpy).not.toHaveBeenCalled();
    expect(entriesSpy).not.toHaveBeenCalled();
    expect(forEachSpy).not.toHaveBeenCalled();
    iterSpy.mockRestore();
    entriesSpy.mockRestore();
    forEachSpy.mockRestore();
    expect(elapsed).toBeLessThan(5_000);
  });

  it('keeps limit, retry-after and window-reset semantics', () => {
    for (let i = 0; i < INVITE_RATE_LIMIT_MAX; i++) {
      expect(checkInviteRateLimit('team-a', T0 + i)).toEqual({ allowed: true });
    }
    expect(checkInviteRateLimit('team-a', T0 + 1_000)).toEqual({
      allowed: false,
      retryAfterSeconds: INVITE_RATE_LIMIT_WINDOW_MS / 1000 - 1,
    });
    expect(checkInviteRateLimit('team-b', T0).allowed).toBe(true);
    expect(checkInviteRateLimit('team-a', T0 + INVITE_RATE_LIMIT_WINDOW_MS + 1)).toEqual({ allowed: true });
  });

  it('team ids over 64 chars (not real ids) share one bucket', () => {
    checkInviteRateLimit('a'.repeat(65), T0);
    checkInviteRateLimit('b'.repeat(4_000), T0);
    expect(inviteTrackedKeyCount()).toBe(1);
  });

  it('is skipped under NODE_ENV=test', () => {
    vi.stubEnv('NODE_ENV', 'test');
    for (let i = 0; i < INVITE_RATE_LIMIT_MAX + 5; i++) expect(checkInviteRateLimit('t', T0).allowed).toBe(true);
    expect(inviteTrackedKeyCount()).toBe(0);
  });
});
