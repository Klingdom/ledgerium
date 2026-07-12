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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checkAuthRateLimit,
  resetAuthRateLimitBuckets,
  AUTH_RATE_LIMITS,
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
