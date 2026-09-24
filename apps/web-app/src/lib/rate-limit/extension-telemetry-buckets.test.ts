/**
 * Unit tests for extension-telemetry-buckets.ts. Mirrors the
 * bootstrap-buckets.test.ts pattern: invokes the checker directly with
 * NODE_ENV forced to 'production' so the NODE_ENV==='test' bypass is inactive
 * and the real bucket logic runs.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checkExtensionTelemetryRateLimit,
  resetExtensionTelemetryRateLimitBuckets,
  EXTENSION_TELEMETRY_RATE_LIMIT_MAX,
  EXTENSION_TELEMETRY_RATE_LIMIT_WINDOW_MS,
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
