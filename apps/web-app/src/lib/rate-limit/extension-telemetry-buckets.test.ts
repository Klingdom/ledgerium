/**
 * Unit tests for extension-telemetry-buckets.ts. Mirrors the
 * bootstrap-buckets.test.ts pattern: invokes the checker directly with
 * NODE_ENV forced to 'production' so the NODE_ENV==='test' bypass is inactive
 * and the real bucket logic runs.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkExtensionTelemetryRateLimit,
  resetExtensionTelemetryRateLimitBuckets,
  EXTENSION_TELEMETRY_RATE_LIMIT_MAX,
  EXTENSION_TELEMETRY_RATE_LIMIT_WINDOW_MS,
  EXTENSION_TELEMETRY_MAX_TRACKED_KEYS,
  extensionTelemetryTrackedKeyCount,
} from './extension-telemetry-buckets';

const BASE_NOW = 1_700_000_000_000;

function check(ip: string, nowMs: number): ReturnType<typeof checkExtensionTelemetryRateLimit> {
  const env = process.env as Record<string, string | undefined>;
  const original = env['NODE_ENV'];
  env['NODE_ENV'] = 'production';
  try {
    return checkExtensionTelemetryRateLimit(ip, nowMs);
  } finally {
    env['NODE_ENV'] = original;
  }
}

describe('extension-telemetry-buckets rate limit', () => {
  beforeEach(() => resetExtensionTelemetryRateLimitBuckets());
  afterEach(() => resetExtensionTelemetryRateLimitBuckets());

  it(`allows up to ${EXTENSION_TELEMETRY_RATE_LIMIT_MAX} requests from the same IP`, () => {
    for (let i = 0; i < EXTENSION_TELEMETRY_RATE_LIMIT_MAX; i++) {
      expect(check('1.2.3.4', BASE_NOW + i).allowed).toBe(true);
    }
  });

  it(`blocks the ${EXTENSION_TELEMETRY_RATE_LIMIT_MAX + 1}th request from the same IP`, () => {
    for (let i = 0; i < EXTENSION_TELEMETRY_RATE_LIMIT_MAX; i++) check('1.2.3.4', BASE_NOW + i);
    const blocked = check('1.2.3.4', BASE_NOW + EXTENSION_TELEMETRY_RATE_LIMIT_MAX);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('allows a new request after the window resets', () => {
    for (let i = 0; i < EXTENSION_TELEMETRY_RATE_LIMIT_MAX; i++) check('5.5.5.5', BASE_NOW + i);
    expect(check('5.5.5.5', BASE_NOW + EXTENSION_TELEMETRY_RATE_LIMIT_MAX).allowed).toBe(false);
    const fresh = check('5.5.5.5', BASE_NOW + EXTENSION_TELEMETRY_RATE_LIMIT_WINDOW_MS + 1);
    expect(fresh.allowed).toBe(true);
  });

  it('different IPs have independent buckets', () => {
    for (let i = 0; i < EXTENSION_TELEMETRY_RATE_LIMIT_MAX; i++) check('10.0.0.1', BASE_NOW + i);
    expect(check('10.0.0.1', BASE_NOW + EXTENSION_TELEMETRY_RATE_LIMIT_MAX).allowed).toBe(false);
    expect(check('10.0.0.2', BASE_NOW).allowed).toBe(true);
  });

  it('bypasses the limit when NODE_ENV === "test"', () => {
    for (let i = 0; i < EXTENSION_TELEMETRY_RATE_LIMIT_MAX; i++) check('7.7.7.7', BASE_NOW + i);
    const result = checkExtensionTelemetryRateLimit('7.7.7.7', BASE_NOW + EXTENSION_TELEMETRY_RATE_LIMIT_MAX);
    expect(result.allowed).toBe(true);
  });
});

describe('extension-telemetry-buckets bounded LRU (row #360)', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    resetExtensionTelemetryRateLimitBuckets();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    resetExtensionTelemetryRateLimitBuckets();
  });

  it('never exceeds capacity under N >> cap distinct IPs', () => {
    const n = EXTENSION_TELEMETRY_MAX_TRACKED_KEYS + 5_000;
    for (let i = 0; i < n; i++) {
      checkExtensionTelemetryRateLimit(`10.${i >> 16}.${(i >> 8) & 255}.${i & 255}`, BASE_NOW);
    }
    expect(extensionTelemetryTrackedKeyCount()).toBe(EXTENSION_TELEMETRY_MAX_TRACKED_KEYS);
  });

  it('per-request cost does not grow with tracked keys (100k-key loop, time-boxed, no Map iteration)', () => {
    const iterSpy = vi.spyOn(Map.prototype, Symbol.iterator as never);
    const entriesSpy = vi.spyOn(Map.prototype, 'entries');
    const forEachSpy = vi.spyOn(Map.prototype, 'forEach');
    const start = performance.now();
    for (let i = 0; i < 100_000; i++) checkExtensionTelemetryRateLimit(`k${i}`, BASE_NOW);
    const elapsed = performance.now() - start;
    expect(iterSpy).not.toHaveBeenCalled();
    expect(entriesSpy).not.toHaveBeenCalled();
    expect(forEachSpy).not.toHaveBeenCalled();
    iterSpy.mockRestore();
    entriesSpy.mockRestore();
    forEachSpy.mockRestore();
    expect(elapsed).toBeLessThan(5_000);
  });

  it('keeps limit, retry-after and reset semantics for an honest client', () => {
    for (let i = 0; i < EXTENSION_TELEMETRY_RATE_LIMIT_MAX; i++) {
      expect(checkExtensionTelemetryRateLimit('198.51.100.7', BASE_NOW)).toEqual({ allowed: true });
    }
    expect(checkExtensionTelemetryRateLimit('198.51.100.7', BASE_NOW + 1_000)).toEqual({
      allowed: false,
      retryAfterSeconds: EXTENSION_TELEMETRY_RATE_LIMIT_WINDOW_MS / 1000 - 1,
    });
    expect(checkExtensionTelemetryRateLimit('198.51.100.8', BASE_NOW).allowed).toBe(true);
    expect(
      checkExtensionTelemetryRateLimit('198.51.100.7', BASE_NOW + EXTENSION_TELEMETRY_RATE_LIMIT_WINDOW_MS + 1),
    ).toEqual({ allowed: true });
  });

  it('real IPv6 forms keep their own bucket; keys over 64 chars share one', () => {
    const real45 = '0000:0000:0000:0000:0000:ffff:255.255.255.255';
    for (let i = 0; i < EXTENSION_TELEMETRY_RATE_LIMIT_MAX; i++) checkExtensionTelemetryRateLimit(real45, BASE_NOW);
    expect(checkExtensionTelemetryRateLimit(real45, BASE_NOW).allowed).toBe(false);
    expect(checkExtensionTelemetryRateLimit('2001:db8::1', BASE_NOW).allowed).toBe(true);
    checkExtensionTelemetryRateLimit('z'.repeat(65), BASE_NOW);
    checkExtensionTelemetryRateLimit('w'.repeat(5_000), BASE_NOW);
    expect(extensionTelemetryTrackedKeyCount()).toBe(3); // real45, 2001:db8::1, one overlong
  });
});
