/**
 * Heap/retention tests for every bounded rate limiter (row #360, MR-069).
 *
 * WHY THIS FILE EXISTS. The loop-168 heap tests only exercised `BoundedLru.set`.
 * The same retention bug (a stored key that is a V8 SlicedString of the raw
 * X-Forwarded-For header pins the whole 12 KB header: ~230 MB at 20k keys) can
 * re-enter through `touch`, which deletes and re-inserts the key. Deleting the
 * flat copy in `touch` kept every earlier test green. The tests below drive
 * `touch` (and the limiters' hit path, which is `touch`) with keys derived by
 * the real getClientIp() from 12 KB headers, so that regression is RED.
 *
 * GC AVAILABILITY. These tests need a forced collection. The helper enables
 * `--expose-gc` on the running isolate (v8.setFlagsFromString + vm), which works
 * in vitest's forked workers. We DECIDED that a missing gc is a FAILURE, not a
 * skip: the first test asserts availability with an explanatory message, and
 * requireGc() throws in every measuring test, so a Node change cannot turn the
 * heap tests into silent passes.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BoundedLru } from './bounded-lru';
import { getClientIp } from '../client-ip';
import { gcIsAvailable, heapMb, fakeXffRequest } from './gc-test-helper';
import { checkAuthRateLimit, resetAuthRateLimitBuckets, authTrackedKeyCount } from './auth-buckets';
import {
  checkExtensionTelemetryRateLimit,
  resetExtensionTelemetryRateLimitBuckets,
  extensionTelemetryTrackedKeyCount,
} from './extension-telemetry-buckets';
import {
  checkInviteAcceptRateLimit,
  recordInviteAcceptRequest,
  resetInviteAcceptBuckets,
  inviteAcceptTrackedKeyCount,
} from './invite-accept-buckets';

const N = 20_000;
/** Leak was ~230 MB; flat copies are ~2-6 MB. 25 MB leaves CI slack, ~9x below the leak. */
const MAX_GROWN_MB = 25;

/** 40-char first entry (a key <= 64, i.e. a V8 slice of its parent) inside a 12 KB header. */
function header(i: number): string {
  const id = `k${i}-`;
  return `${id}${'b'.repeat(40 - id.length)},${'x'.repeat(12_000)}`;
}
const ipFor = (i: number): string => getClientIp(fakeXffRequest(header(i)));

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  resetAuthRateLimitBuckets();
  resetExtensionTelemetryRateLimitBuckets();
  resetInviteAcceptBuckets();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('gc availability (MR-069: heap tests must never skip silently)', () => {
  it('gc() is available in this runner, so the heap tests below really measure', () => {
    expect(
      gcIsAvailable(),
      `gc() is NOT available on Node ${process.version}: the heap tests would measure nothing. ` +
        'Fix the runner (node --expose-gc / v8.setFlagsFromString) instead of skipping them.',
    ).toBe(true);
  });
});

describe('retention through touch (row #360 / MR-069)', () => {
  it('BoundedLru: 20k keys set, then each re-touched via getClientIp on 12 KB headers, stay within a few MB', () => {
    const lru = new BoundedLru<{ n: number }>(N);
    const base = heapMb();
    for (let i = 0; i < N; i++) lru.set(ipFor(i), { n: i });
    // Fresh headers + fresh getClientIp slices: touch re-inserts under the NEW slice unless it flat-copies.
    for (let i = 0; i < N; i++) expect(lru.touch(ipFor(i))?.n).toBe(i);
    const grown = heapMb() - base;
    expect(lru.size).toBe(N);
    expect(grown).toBeLessThan(MAX_GROWN_MB);
  });

  it('extension-telemetry limiter hit path (touch) retains no header memory', () => {
    const base = heapMb();
    for (let i = 0; i < N; i++) checkExtensionTelemetryRateLimit(ipFor(i), 1_000);
    for (let i = 0; i < N; i++) checkExtensionTelemetryRateLimit(ipFor(i), 2_000); // hits => touch
    const grown = heapMb() - base;
    expect(extensionTelemetryTrackedKeyCount()).toBe(N);
    expect(grown).toBeLessThan(MAX_GROWN_MB);
  });

  it('auth limiter hit path (touch) retains no header memory', () => {
    const opts = { max: 10, windowMs: 60_000 };
    const base = heapMb();
    for (let i = 0; i < N; i++) checkAuthRateLimit(`login:${ipFor(i)}`, 1_000, opts);
    for (let i = 0; i < N; i++) checkAuthRateLimit(`login:${ipFor(i)}`, 2_000, opts);
    const grown = heapMb() - base;
    expect(authTrackedKeyCount('login')).toBe(N);
    expect(grown).toBeLessThan(MAX_GROWN_MB);
  });

  it('invites/accept limiter (touch via check, set via record) retains no header memory', () => {
    const base = heapMb();
    for (let i = 0; i < N; i++) {
      const ip = ipFor(i);
      checkInviteAcceptRateLimit(ip, 1_000);
      recordInviteAcceptRequest(ip, 1_000);
    }
    for (let i = 0; i < N; i++) checkInviteAcceptRateLimit(ipFor(i), 2_000); // hits => touch
    const grown = heapMb() - base;
    expect(inviteAcceptTrackedKeyCount()).toBe(N);
    expect(grown).toBeLessThan(MAX_GROWN_MB);
  });

  it('overlong 12 KB first entries collapse to one bucket per limiter (no per-key memory)', () => {
    const longIp = (i: number) =>
      getClientIp(fakeXffRequest(`k${i}-${'a'.repeat(12_000)},1.1.1.1`));
    const base = heapMb();
    for (let i = 0; i < N; i++) {
      checkExtensionTelemetryRateLimit(longIp(i), 1_000);
      checkAuthRateLimit(`login:${longIp(i)}`, 1_000, { max: 10, windowMs: 60_000 });
      checkInviteAcceptRateLimit(longIp(i), 1_000);
      recordInviteAcceptRequest(longIp(i), 1_000);
    }
    expect(extensionTelemetryTrackedKeyCount()).toBe(1);
    expect(authTrackedKeyCount('login')).toBe(1);
    expect(inviteAcceptTrackedKeyCount()).toBe(1);
    expect(heapMb() - base).toBeLessThan(MAX_GROWN_MB);
  });
});
