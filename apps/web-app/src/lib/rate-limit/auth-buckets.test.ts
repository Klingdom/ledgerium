/**
 * Unit tests for auth-buckets.ts rate-limit module.
 *
 * These tests invoke checkAuthRateLimit() directly with NODE_ENV forced to
 * 'production' for the duration of each call, bypassing the NODE_ENV=test
 * short-circuit that route-level tests rely on (mirrors bootstrap-buckets.test.ts).
 *
 * Covers:
 *   - Requests under the limit are allowed
 *   - The (max + 1)th request from the same key is blocked
 *   - retryAfterSeconds is positive on block
 *   - Window reset: after resetAt elapses a new bucket is created
 *   - resetAuthRateLimitBuckets() clears all state
 *   - Distinct keys (e.g. different purposes or IPs) have independent buckets
 *   - NODE_ENV === 'test' bypass returns { allowed: true } unconditionally
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkAuthRateLimit,
  resetAuthRateLimitBuckets,
  AUTH_RATE_LIMITS,
  AUTH_MAX_TRACKED_KEYS_PER_PURPOSE,
  authTrackedKeyCount,
} from './auth-buckets';

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_NOW = 1_700_000_000_000; // Frozen epoch for determinism
const TEST_OPTS = { max: 3, windowMs: 60_000 };

/**
 * Invoke checkAuthRateLimit with NODE_ENV forced to 'production' so the
 * test-bypass short-circuit is inactive and real bucket logic runs.
 */
function check(
  key: string,
  nowMs: number,
  opts: { max: number; windowMs: number } = TEST_OPTS,
): ReturnType<typeof checkAuthRateLimit> {
  const env = process.env as Record<string, string | undefined>;
  const original = env['NODE_ENV'];
  env['NODE_ENV'] = 'production';
  try {
    return checkAuthRateLimit(key, nowMs, opts);
  } finally {
    env['NODE_ENV'] = original;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('auth-buckets rate limit', () => {
  beforeEach(() => {
    resetAuthRateLimitBuckets();
  });

  afterEach(() => {
    resetAuthRateLimitBuckets();
  });

  it('allows the first request', () => {
    const result = check('forgot:1.2.3.4', BASE_NOW);
    expect(result.allowed).toBe(true);
  });

  it(`allows up to ${TEST_OPTS.max} requests from the same key`, () => {
    for (let i = 0; i < TEST_OPTS.max; i++) {
      const result = check('forgot:1.2.3.4', BASE_NOW + i * 1000);
      expect(result.allowed).toBe(true);
    }
  });

  it(`blocks the ${TEST_OPTS.max + 1}th request from the same key`, () => {
    for (let i = 0; i < TEST_OPTS.max; i++) {
      check('forgot:1.2.3.4', BASE_NOW + i * 1000);
    }
    const blocked = check('forgot:1.2.3.4', BASE_NOW + TEST_OPTS.max * 1000);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it('allows a new request after the window resets', () => {
    for (let i = 0; i < TEST_OPTS.max; i++) {
      check('signup:5.5.5.5', BASE_NOW + i * 1000);
    }
    // Blocked within window.
    const blocked = check('signup:5.5.5.5', BASE_NOW + TEST_OPTS.max * 1000);
    expect(blocked.allowed).toBe(false);

    // Past the window, a new bucket opens.
    const afterReset = check('signup:5.5.5.5', BASE_NOW + TEST_OPTS.windowMs + 1000);
    expect(afterReset.allowed).toBe(true);
  });

  it('resetAuthRateLimitBuckets() clears all state', () => {
    for (let i = 0; i < TEST_OPTS.max; i++) {
      check('login:9.9.9.9', BASE_NOW + i * 1000);
    }
    expect(check('login:9.9.9.9', BASE_NOW + TEST_OPTS.max * 1000).allowed).toBe(false);

    resetAuthRateLimitBuckets();

    expect(check('login:9.9.9.9', BASE_NOW).allowed).toBe(true);
  });

  it('keeps distinct keys independent (e.g. different purpose prefixes for the same IP)', () => {
    for (let i = 0; i < TEST_OPTS.max; i++) {
      check('forgot:1.1.1.1', BASE_NOW + i * 1000);
    }
    expect(check('forgot:1.1.1.1', BASE_NOW + TEST_OPTS.max * 1000).allowed).toBe(false);

    // Same IP, different purpose prefix — independent bucket, still allowed.
    expect(check('signup:1.1.1.1', BASE_NOW).allowed).toBe(true);
  });

  it('keeps distinct IPs independent for the same purpose', () => {
    for (let i = 0; i < TEST_OPTS.max; i++) {
      check('login:2.2.2.2', BASE_NOW + i * 1000);
    }
    expect(check('login:2.2.2.2', BASE_NOW + TEST_OPTS.max * 1000).allowed).toBe(false);
    expect(check('login:3.3.3.3', BASE_NOW).allowed).toBe(true);
  });

  it('bypasses the limit entirely when NODE_ENV === "test" (no env override)', () => {
    // No `check()` helper here — call the real function directly so the
    // ambient NODE_ENV=test (set by the vitest runner) applies.
    for (let i = 0; i < TEST_OPTS.max + 5; i++) {
      const result = checkAuthRateLimit('login:4.4.4.4', BASE_NOW + i * 1000, TEST_OPTS);
      expect(result.allowed).toBe(true);
    }
  });

  it('exposes the expected per-endpoint limit constants', () => {
    expect(AUTH_RATE_LIMITS.forgotPassword).toEqual({ max: 5, windowMs: 15 * 60 * 1000 });
    expect(AUTH_RATE_LIMITS.signup).toEqual({ max: 10, windowMs: 60 * 60 * 1000 });
    expect(AUTH_RATE_LIMITS.login).toEqual({ max: 10, windowMs: 15 * 60 * 1000 });
  });
});

describe('auth-buckets bounded LRU (row #360)', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    resetAuthRateLimitBuckets();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    resetAuthRateLimitBuckets();
  });

  it('never exceeds capacity per purpose under N >> cap distinct addresses', () => {
    const n = AUTH_MAX_TRACKED_KEYS_PER_PURPOSE + 5_000;
    for (let i = 0; i < n; i++) {
      checkAuthRateLimit(`login:10.${i >> 16}.${(i >> 8) & 255}.${i & 255}`, BASE_NOW, TEST_OPTS);
    }
    expect(authTrackedKeyCount('login')).toBe(AUTH_MAX_TRACKED_KEYS_PER_PURPOSE);
    expect(authTrackedKeyCount()).toBe(AUTH_MAX_TRACKED_KEYS_PER_PURPOSE);
  });

  it('purposes are bounded independently: a login flood does not evict signup buckets', () => {
    for (let i = 0; i < TEST_OPTS.max; i++) checkAuthRateLimit('signup:198.51.100.1', BASE_NOW, TEST_OPTS);
    expect(checkAuthRateLimit('signup:198.51.100.1', BASE_NOW, TEST_OPTS).allowed).toBe(false);
    for (let i = 0; i < AUTH_MAX_TRACKED_KEYS_PER_PURPOSE + 100; i++) {
      checkAuthRateLimit(`login:f${i}`, BASE_NOW, TEST_OPTS);
    }
    expect(checkAuthRateLimit('signup:198.51.100.1', BASE_NOW, TEST_OPTS).allowed).toBe(false);
    expect(authTrackedKeyCount('signup')).toBe(1);
  });

  it('per-request cost does not grow with tracked keys (100k-key loop, time-boxed, no Map iteration)', () => {
    const iterSpy = vi.spyOn(Map.prototype, Symbol.iterator as never);
    const entriesSpy = vi.spyOn(Map.prototype, 'entries');
    const forEachSpy = vi.spyOn(Map.prototype, 'forEach');
    const start = performance.now();
    for (let i = 0; i < 100_000; i++) checkAuthRateLimit(`login:k${i}`, BASE_NOW, TEST_OPTS);
    const elapsed = performance.now() - start;
    expect(iterSpy).not.toHaveBeenCalled();
    expect(entriesSpy).not.toHaveBeenCalled();
    expect(forEachSpy).not.toHaveBeenCalled();
    iterSpy.mockRestore();
    entriesSpy.mockRestore();
    forEachSpy.mockRestore();
    // The retired scan cost ~1 ms/request at 60k keys (~100 s for this loop).
    expect(elapsed).toBeLessThan(5_000);
  });

  it('keeps window, limit and reset semantics for honest clients (incl. IPv6 with colons)', () => {
    const key = 'login:2001:db8:85a3:0:0:8a2e:370:7334';
    for (let i = 0; i < TEST_OPTS.max; i++) {
      expect(checkAuthRateLimit(key, BASE_NOW + i * 1000, TEST_OPTS)).toEqual({ allowed: true });
    }
    expect(checkAuthRateLimit(key, BASE_NOW + 3_000, TEST_OPTS)).toEqual({ allowed: false, retryAfterSeconds: 57 });
    expect(checkAuthRateLimit('login:2001:db8:85a3:0:0:8a2e:370:7335', BASE_NOW, TEST_OPTS).allowed).toBe(true);
    expect(checkAuthRateLimit(key, BASE_NOW + TEST_OPTS.windowMs + 1, TEST_OPTS)).toEqual({ allowed: true });
  });

  it('a long purpose prefix cannot push a real 45-char IPv6 address into the shared overlong bucket', () => {
    const real45 = '0000:0000:0000:0000:0000:ffff:255.255.255.255';
    expect(real45.length).toBe(45);
    const purpose = 'p'.repeat(16); // the longest purpose accepted
    for (let i = 0; i < TEST_OPTS.max; i++) checkAuthRateLimit(`${purpose}:${real45}`, BASE_NOW, TEST_OPTS);
    // A DIFFERENT real address under the same long prefix has its own bucket.
    const other = '0000:0000:0000:0000:0000:ffff:255.255.255.254';
    expect(checkAuthRateLimit(`${purpose}:${other}`, BASE_NOW, TEST_OPTS).allowed).toBe(true);
    expect(checkAuthRateLimit(`${purpose}:${real45}`, BASE_NOW, TEST_OPTS).allowed).toBe(false);
    // A 64-char address (the LRU ceiling) keeps its own bucket under a 16-char purpose
    // (16 + 1 + 64 = 81 would have collapsed under the old combined key).
    for (let i = 0; i < TEST_OPTS.max; i++) checkAuthRateLimit(`${purpose}:${'a'.repeat(64)}`, BASE_NOW, TEST_OPTS);
    expect(checkAuthRateLimit(`${purpose}:${'b'.repeat(64)}`, BASE_NOW, TEST_OPTS).allowed).toBe(true);
    expect(checkAuthRateLimit(`${purpose}:${'a'.repeat(64)}`, BASE_NOW, TEST_OPTS).allowed).toBe(false);
  });

  it('values over 64 chars share ONE overlong bucket per purpose; purposes stay separate', () => {
    for (let i = 0; i < TEST_OPTS.max; i++) checkAuthRateLimit(`login:${'x'.repeat(100)}${i}`, BASE_NOW, TEST_OPTS);
    expect(checkAuthRateLimit(`login:${'y'.repeat(200)}`, BASE_NOW, TEST_OPTS).allowed).toBe(false);
    expect(authTrackedKeyCount('login')).toBe(1);
    expect(checkAuthRateLimit(`signup:${'y'.repeat(200)}`, BASE_NOW, TEST_OPTS).allowed).toBe(true);
  });

  it('bounds the number of purposes (pathological callers cannot create unbounded LRUs)', () => {
    for (let i = 0; i < 50; i++) checkAuthRateLimit(`purpose${i}:1.2.3.4`, BASE_NOW, TEST_OPTS);
    // at most 8 named LRUs + the shared fallback = 9, one tracked address each here
    expect(authTrackedKeyCount()).toBeLessThanOrEqual(9);
  });
});
