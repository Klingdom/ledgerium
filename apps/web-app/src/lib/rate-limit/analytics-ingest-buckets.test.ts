import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkAnalyticsIngestRateLimit,
  resetAnalyticsIngestRateLimitBuckets,
  analyticsIngestTrackedKeyCount,
  ANALYTICS_INGEST_RATE_LIMIT_MAX,
  ANALYTICS_INGEST_RATE_LIMIT_WINDOW_MS,
  ANALYTICS_INGEST_MAX_TRACKED_KEYS,
} from './analytics-ingest-buckets';
import { BoundedLru, MAX_KEY_LENGTH } from './bounded-lru';

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  resetAnalyticsIngestRateLimitBuckets();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('BoundedLru (row #299)', () => {
  it('never exceeds capacity under many more distinct keys', () => {
    const lru = new BoundedLru<number>(100);
    for (let i = 0; i < 10_000; i++) {
      lru.set(`k${i}`, i);
      expect(lru.size).toBeLessThanOrEqual(100);
    }
    expect(lru.size).toBe(100);
  });

  it('evicts least recently used first; touch protects a key', () => {
    const lru = new BoundedLru<number>(3);
    lru.set('a', 1);
    lru.set('b', 2);
    lru.set('c', 3);
    lru.touch('a'); // order now b, c, a
    lru.set('d', 4); // evicts b
    expect(lru.keysOldestFirst()).toEqual(['c', 'a', 'd']);
    expect(lru.peek('b')).toBeUndefined();
    lru.set('c', 30); // replace refreshes recency, no eviction
    expect(lru.keysOldestFirst()).toEqual(['a', 'd', 'c']);
    expect(lru.size).toBe(3);
  });

  it('peek does not change recency', () => {
    const lru = new BoundedLru<number>(2);
    lru.set('a', 1);
    lru.set('b', 2);
    lru.peek('a');
    lru.set('c', 3);
    expect(lru.peek('a')).toBeUndefined();
  });

  it('truncates over-long keys so key memory is bounded', () => {
    const lru = new BoundedLru<number>(5);
    lru.set('x'.repeat(10_000), 1);
    expect(lru.keysOldestFirst()[0]!.length).toBe(MAX_KEY_LENGTH);
  });

  it('rejects a non-positive capacity', () => {
    expect(() => new BoundedLru(0)).toThrow();
  });

  it('does not iterate the map per operation (no per-request scan)', () => {
    const lru = new BoundedLru<number>(200_000);
    for (let i = 0; i < 100_000; i++) lru.set(`k${i}`, i);
    const iterSpy = vi.spyOn(Map.prototype, Symbol.iterator as never);
    const entriesSpy = vi.spyOn(Map.prototype, 'entries');
    const forEachSpy = vi.spyOn(Map.prototype, 'forEach');
    for (let i = 0; i < 1000; i++) {
      lru.touch(`k${i}`);
      lru.set(`n${i}`, i);
    }
    expect(iterSpy).not.toHaveBeenCalled();
    expect(entriesSpy).not.toHaveBeenCalled();
    expect(forEachSpy).not.toHaveBeenCalled();
    iterSpy.mockRestore();
    entriesSpy.mockRestore();
    forEachSpy.mockRestore();
  });
});

describe('analytics ingest limiter (row #299)', () => {
  it('stays within the tracked-key ceiling under a distinct-key flood', () => {
    const n = ANALYTICS_INGEST_MAX_TRACKED_KEYS + 5_000;
    for (let i = 0; i < n; i++) checkAnalyticsIngestRateLimit(`10.${i >> 16}.${(i >> 8) & 255}.${i & 255}`, 1_000);
    expect(analyticsIngestTrackedKeyCount()).toBe(ANALYTICS_INGEST_MAX_TRACKED_KEYS);
  });

  it('per-request cost does not grow with tracked keys (100k-key loop, time-boxed)', () => {
    const start = performance.now();
    for (let i = 0; i < 100_000; i++) checkAnalyticsIngestRateLimit(`k${i}`, 1_000);
    const elapsed = performance.now() - start;
    // The retired scan cost ~1.2 ms/request at 60k keys (~100 s for this loop).
    expect(elapsed).toBeLessThan(5_000);
  });

  it('keeps the limit and window semantics for an honest client', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < ANALYTICS_INGEST_RATE_LIMIT_MAX; i++) {
      expect(checkAnalyticsIngestRateLimit('198.51.100.7', t0 + i)).toEqual({ allowed: true });
    }
    const blocked = checkAnalyticsIngestRateLimit('198.51.100.7', t0 + 1_000);
    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: 59 });
    expect(checkAnalyticsIngestRateLimit('198.51.100.8', t0 + 1_000)).toEqual({ allowed: true });
    // window expiry resets
    expect(
      checkAnalyticsIngestRateLimit('198.51.100.7', t0 + ANALYTICS_INGEST_RATE_LIMIT_WINDOW_MS + 1),
    ).toEqual({ allowed: true });
  });

  it('a key that keeps requesting (even while blocked) is not evicted by a flood of idle keys', () => {
    const t0 = 5_000;
    for (let i = 0; i < ANALYTICS_INGEST_RATE_LIMIT_MAX; i++) checkAnalyticsIngestRateLimit('hot', t0);
    for (let i = 0; i < ANALYTICS_INGEST_MAX_TRACKED_KEYS - 1; i++) {
      checkAnalyticsIngestRateLimit(`idle${i}`, t0);
      if (i % 1000 === 0) checkAnalyticsIngestRateLimit('hot', t0);
    }
    expect(checkAnalyticsIngestRateLimit('hot', t0).allowed).toBe(false);
  });

  it('documented trade-off: a key idle through > capacity distinct keys is evicted and restarts', () => {
    const t0 = 5_000;
    for (let i = 0; i < ANALYTICS_INGEST_RATE_LIMIT_MAX; i++) checkAnalyticsIngestRateLimit('victim', t0);
    expect(checkAnalyticsIngestRateLimit('victim', t0).allowed).toBe(false);
    for (let i = 0; i < ANALYTICS_INGEST_MAX_TRACKED_KEYS; i++) checkAnalyticsIngestRateLimit(`flood${i}`, t0);
    expect(checkAnalyticsIngestRateLimit('victim', t0).allowed).toBe(true);
  });

  it('is skipped under NODE_ENV=test', () => {
    vi.stubEnv('NODE_ENV', 'test');
    for (let i = 0; i < ANALYTICS_INGEST_RATE_LIMIT_MAX + 5; i++) {
      expect(checkAnalyticsIngestRateLimit('z', 1).allowed).toBe(true);
    }
  });
});
