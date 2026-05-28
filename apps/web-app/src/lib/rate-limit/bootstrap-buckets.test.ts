/**
 * Unit tests for bootstrap-buckets.ts rate-limit module.
 *
 * These tests invoke checkBootstrapRateLimit() directly (bypassing the
 * NODE_ENV=test short-circuit used by the route-level tests). The module is
 * imported with a mocked NODE_ENV so the bypass does not apply.
 *
 * Covers:
 *   - First 3 requests from an IP are allowed
 *   - 4th request from same IP within window is blocked
 *   - retryAfterSeconds is positive on block
 *   - Window reset: after resetAt elapses a new bucket is created
 *   - resetBootstrapRateLimitBuckets() clears all state
 *   - Different IPs have independent buckets
 *
 * NOTE: NODE_ENV=test bypass in checkBootstrapRateLimit() is intentionally
 * NOT exercised here (that is the route-handler concern). These tests call
 * the underlying bucket logic by temporarily overriding process.env.NODE_ENV
 * via a separate approach: we import from the module and override the env
 * within each test using Object.defineProperty where needed.
 *
 * Simpler approach: we use resetBootstrapRateLimitBuckets() before each test
 * and set NODE_ENV to 'production' for the duration of the call to test the
 * real logic path.
 *
 * @iter 091 / ADM-002 PR-2 Sub-task 3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checkBootstrapRateLimit,
  resetBootstrapRateLimitBuckets,
  BOOTSTRAP_RATE_LIMIT_MAX,
  BOOTSTRAP_RATE_LIMIT_WINDOW_MS,
} from './bootstrap-buckets';

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_NOW = 1_700_000_000_000; // Frozen epoch for determinism

/**
 * Invoke checkBootstrapRateLimit with NODE_ENV forced to 'production' so the
 * test-bypass short-circuit is inactive and real bucket logic runs.
 */
function check(
  ip: string,
  nowMs: number,
): ReturnType<typeof checkBootstrapRateLimit> {
  // Cast to bypass TypeScript's read-only constraint on NODE_ENV.
  // This is safe in test code — process.env properties are mutable at runtime.
  const env = process.env as Record<string, string | undefined>;
  const original = env['NODE_ENV'];
  env['NODE_ENV'] = 'production';
  try {
    return checkBootstrapRateLimit(ip, nowMs);
  } finally {
    env['NODE_ENV'] = original;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('bootstrap-buckets rate limit', () => {
  beforeEach(() => {
    resetBootstrapRateLimitBuckets();
  });

  afterEach(() => {
    resetBootstrapRateLimitBuckets();
  });

  it('allows the first request', () => {
    const result = check('1.2.3.4', BASE_NOW);
    expect(result.allowed).toBe(true);
  });

  it(`allows up to ${BOOTSTRAP_RATE_LIMIT_MAX} requests from the same IP`, () => {
    for (let i = 0; i < BOOTSTRAP_RATE_LIMIT_MAX; i++) {
      const result = check('1.2.3.4', BASE_NOW + i * 1000);
      expect(result.allowed).toBe(true);
    }
  });

  it(`blocks the ${BOOTSTRAP_RATE_LIMIT_MAX + 1}th request from the same IP`, () => {
    for (let i = 0; i < BOOTSTRAP_RATE_LIMIT_MAX; i++) {
      check('1.2.3.4', BASE_NOW + i * 1000);
    }
    const blocked = check('1.2.3.4', BASE_NOW + BOOTSTRAP_RATE_LIMIT_MAX * 1000);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it('allows a new request after the window resets', () => {
    // Exhaust the bucket
    for (let i = 0; i < BOOTSTRAP_RATE_LIMIT_MAX; i++) {
      check('5.5.5.5', BASE_NOW + i * 1000);
    }
    // Blocked within window
    const blocked = check('5.5.5.5', BASE_NOW + BOOTSTRAP_RATE_LIMIT_MAX * 1000);
    expect(blocked.allowed).toBe(false);

    // Advance past the window — new bucket starts
    const afterWindow = BASE_NOW + BOOTSTRAP_RATE_LIMIT_WINDOW_MS + 1;
    const fresh = check('5.5.5.5', afterWindow);
    expect(fresh.allowed).toBe(true);
  });

  it('different IPs have independent buckets', () => {
    // Exhaust IP A
    for (let i = 0; i < BOOTSTRAP_RATE_LIMIT_MAX; i++) {
      check('10.0.0.1', BASE_NOW + i * 1000);
    }
    const blockedA = check('10.0.0.1', BASE_NOW + BOOTSTRAP_RATE_LIMIT_MAX * 1000);
    expect(blockedA.allowed).toBe(false);

    // IP B is unaffected
    const allowedB = check('10.0.0.2', BASE_NOW);
    expect(allowedB.allowed).toBe(true);
  });

  it('resetBootstrapRateLimitBuckets clears all state', () => {
    // Exhaust bucket for an IP
    for (let i = 0; i < BOOTSTRAP_RATE_LIMIT_MAX; i++) {
      check('9.9.9.9', BASE_NOW + i * 1000);
    }
    const blockedBefore = check('9.9.9.9', BASE_NOW + BOOTSTRAP_RATE_LIMIT_MAX * 1000);
    expect(blockedBefore.allowed).toBe(false);

    // After reset the bucket is cleared
    resetBootstrapRateLimitBuckets();
    const allowedAfter = check('9.9.9.9', BASE_NOW + BOOTSTRAP_RATE_LIMIT_MAX * 1000);
    expect(allowedAfter.allowed).toBe(true);
  });

  it('returns { allowed: true } when NODE_ENV === "test" (bypass)', () => {
    // Exhaust the bucket in "production" mode
    for (let i = 0; i < BOOTSTRAP_RATE_LIMIT_MAX; i++) {
      check('7.7.7.7', BASE_NOW + i * 1000);
    }

    // Now call with actual NODE_ENV=test — should bypass and allow
    const result = checkBootstrapRateLimit('7.7.7.7', BASE_NOW + BOOTSTRAP_RATE_LIMIT_MAX * 1000);
    expect(result.allowed).toBe(true);
  });
});
