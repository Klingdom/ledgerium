/**
 * Tests for invite-accept-buckets.ts (the unauthenticated /api/invites/accept
 * limiter, extracted from the route and bounded in row #360). There is no
 * NODE_ENV bypass here, matching the route's original behaviour.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkInviteAcceptRateLimit as blocked,
  recordInviteAcceptRequest as request,
  recordInviteAcceptFailure as failure,
  recordInviteAcceptSuccess as success,
  resetInviteAcceptBuckets,
  inviteAcceptTrackedKeyCount,
  INVITE_ACCEPT_MAX_TRACKED_KEYS,
} from './invite-accept-buckets';

const T0 = 1_700_000_000_000;

describe('invite-accept-buckets (row #360)', () => {
  beforeEach(() => resetInviteAcceptBuckets());

  it('entries are bounded: N >> cap distinct IPs never exceed capacity (it used to grow forever)', () => {
    for (let i = 0; i < INVITE_ACCEPT_MAX_TRACKED_KEYS + 5_000; i++) {
      const ip = `10.${i >> 16}.${(i >> 8) & 255}.${i & 255}`;
      if (!blocked(ip, T0)) request(ip, T0);
      failure(ip, T0);
      expect(inviteAcceptTrackedKeyCount()).toBeLessThanOrEqual(INVITE_ACCEPT_MAX_TRACKED_KEYS);
    }
    expect(inviteAcceptTrackedKeyCount()).toBe(INVITE_ACCEPT_MAX_TRACKED_KEYS);
  });

  it('per-request cost does not grow with tracked keys (100k-key loop, time-boxed, no Map iteration)', () => {
    const iterSpy = vi.spyOn(Map.prototype, Symbol.iterator as never);
    const entriesSpy = vi.spyOn(Map.prototype, 'entries');
    const forEachSpy = vi.spyOn(Map.prototype, 'forEach');
    const start = performance.now();
    for (let i = 0; i < 100_000; i++) {
      const ip = `k${i}`;
      blocked(ip, T0);
      request(ip, T0);
    }
    const elapsed = performance.now() - start;
    expect(iterSpy).not.toHaveBeenCalled();
    expect(entriesSpy).not.toHaveBeenCalled();
    expect(forEachSpy).not.toHaveBeenCalled();
    iterSpy.mockRestore();
    entriesSpy.mockRestore();
    forEachSpy.mockRestore();
    expect(elapsed).toBeLessThan(5_000);
  });

  it('unknown IP is not blocked; 10 requests per 60 s window then blocked; window reset unblocks', () => {
    expect(blocked('1.1.1.1', T0)).toBe(false);
    for (let i = 0; i < 10; i++) {
      expect(blocked('1.1.1.1', T0 + i)).toBe(false);
      request('1.1.1.1', T0 + i);
    }
    expect(blocked('1.1.1.1', T0 + 1_000)).toBe(true);
    expect(blocked('2.2.2.2', T0 + 1_000)).toBe(false);
    expect(blocked('1.1.1.1', T0 + 60_000)).toBe(false); // window elapsed
    request('1.1.1.1', T0 + 60_000); // new window starts at count 1
    expect(blocked('1.1.1.1', T0 + 60_001)).toBe(false);
  });

  it('5 consecutive failures lock out for 1 hour; success clears streak and lockout', () => {
    request('3.3.3.3', T0);
    for (let i = 0; i < 4; i++) failure('3.3.3.3', T0);
    expect(blocked('3.3.3.3', T0)).toBe(false); // 4 failures: not yet
    failure('3.3.3.3', T0); // 5th
    expect(blocked('3.3.3.3', T0 + 3_599_999)).toBe(true);
    expect(blocked('3.3.3.3', T0 + 3_600_000)).toBe(false); // lock elapsed
    success('3.3.3.3');
    for (let i = 0; i < 4; i++) failure('3.3.3.3', T0 + 4_000_000);
    expect(blocked('3.3.3.3', T0 + 4_000_000)).toBe(false); // streak restarted after success
  });

  it('success on an unknown IP does not create an entry', () => {
    success('9.9.9.9');
    expect(inviteAcceptTrackedKeyCount()).toBe(0);
  });

  it('values over 64 chars share one bucket', () => {
    request('a'.repeat(100), T0);
    request('b'.repeat(9_000), T0);
    expect(inviteAcceptTrackedKeyCount()).toBe(1);
  });
});
