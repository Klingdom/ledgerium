/**
 * Tests for the shared-request cache behind `useAccount` — row #189.
 *
 * There were none, for either this logic or the hook. The hook has carried a
 * module-level cache and a comment claiming "all hook instances share the same
 * request" since it was written, and nothing ever checked the claim was true.
 * It happened to be true. An unverified claim in a comment is the same asset as
 * an unverified claim in a changelog, which this codebase has lately had cause
 * to learn twice.
 *
 * The dedup case is the load-bearing one: it is the entire justification for
 * moving `TrialStatusChip` and `RecordingQuotaChip` onto this.
 */

import { describe, it, expect, vi } from 'vitest';
import { SharedRequestCache, CACHE_TTL_MS } from './accountCache';

/** A controllable clock, so the TTL is tested by arithmetic rather than by waiting. */
function clock(start = 1_700_000_000_000) {
  let now = start;
  return { now: () => now, advance: (ms: number) => { now += ms; } };
}

/** A fetcher that records its calls and resolves on demand. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('SharedRequestCache', () => {
  it('fetches once and returns the value', async () => {
    const fetcher = vi.fn(async () => 'v1');
    const cache = new SharedRequestCache<string>();

    await expect(cache.get(fetcher)).resolves.toBe('v1');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('issues ONE request for concurrent callers — the point of row #189', async () => {
    // This is the dashboard case exactly: TrialStatusChip in AppShell and
    // RecordingQuotaChip in CommandHeader mount in the same tick, and each used
    // to issue its own identical request.
    const d = deferred<string>();
    const fetcher = vi.fn(() => d.promise);
    const cache = new SharedRequestCache<string>();

    const a = cache.get(fetcher);
    const b = cache.get(fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    d.resolve('shared');
    await expect(a).resolves.toBe('shared');
    await expect(b).resolves.toBe('shared');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves a later caller from cache while the value is fresh', async () => {
    const c = clock();
    const fetcher = vi.fn(async () => 'v1');
    const cache = new SharedRequestCache<string>(CACHE_TTL_MS, c.now);

    await cache.get(fetcher);
    c.advance(CACHE_TTL_MS - 1);

    await expect(cache.get(fetcher)).resolves.toBe('v1');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches once the value has aged past the TTL', async () => {
    // Without this bound, the first response would be served for the whole SPA
    // session and limits.recordings.used would freeze at its page-load value.
    const c = clock();
    let n = 0;
    const fetcher = vi.fn(async () => `v${++n}`);
    const cache = new SharedRequestCache<string>(CACHE_TTL_MS, c.now);

    await expect(cache.get(fetcher)).resolves.toBe('v1');
    c.advance(CACHE_TTL_MS);

    await expect(cache.get(fetcher)).resolves.toBe('v2');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('treats the TTL boundary as exclusive, so "fresh" has one meaning', async () => {
    const c = clock();
    const fetcher = vi.fn(async () => 'v1');
    const cache = new SharedRequestCache<string>(CACHE_TTL_MS, c.now);

    await cache.get(fetcher);
    c.advance(CACHE_TTL_MS - 1);
    expect(cache.isFresh()).toBe(true);
    c.advance(1);
    expect(cache.isFresh()).toBe(false);
  });

  it('peek() never returns a stale value', async () => {
    const c = clock();
    const cache = new SharedRequestCache<string>(CACHE_TTL_MS, c.now);

    expect(cache.peek()).toBeNull();
    await cache.get(async () => 'v1');
    expect(cache.peek()).toBe('v1');

    c.advance(CACHE_TTL_MS);
    expect(cache.peek()).toBeNull();
  });

  it('discards an aged-out value rather than merely declining to serve it', async () => {
    // Retaining a value we have committed not to use is a second source of
    // truth waiting to be read by mistake. After expiry the next get() must go
    // to the network even if the clock were somehow to move backwards.
    const c = clock();
    let n = 0;
    const fetcher = vi.fn(async () => `v${++n}`);
    const cache = new SharedRequestCache<string>(CACHE_TTL_MS, c.now);

    await cache.get(fetcher);
    c.advance(CACHE_TTL_MS);
    const pending = cache.get(fetcher);   // expires and clears the old value
    c.advance(-CACHE_TTL_MS);             // clock rewinds mid-flight
    await pending;

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failure, and lets the next caller retry', async () => {
    // One network blip must not leave every account-dependent component blank
    // until a hard reload.
    const fetcher = vi
      .fn<[], Promise<string>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('v1');
    const cache = new SharedRequestCache<string>();

    await expect(cache.get(fetcher)).rejects.toThrow('boom');
    expect(cache.peek()).toBeNull();

    await expect(cache.get(fetcher)).resolves.toBe('v1');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('propagates one rejection to every concurrent caller', async () => {
    const d = deferred<string>();
    const fetcher = vi.fn(() => d.promise);
    const cache = new SharedRequestCache<string>();

    const a = cache.get(fetcher);
    const b = cache.get(fetcher);
    d.reject(new Error('boom'));

    await expect(a).rejects.toThrow('boom');
    await expect(b).rejects.toThrow('boom');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('clear() drops a fresh value so refetch() does not wait out the TTL', async () => {
    const c = clock();
    let n = 0;
    const fetcher = vi.fn(async () => `v${++n}`);
    const cache = new SharedRequestCache<string>(CACHE_TTL_MS, c.now);

    await cache.get(fetcher);
    expect(cache.peek()).toBe('v1');

    cache.clear();
    expect(cache.peek()).toBeNull();
    await expect(cache.get(fetcher)).resolves.toBe('v2');
  });

  it('instances do not share state', async () => {
    const a = new SharedRequestCache<string>();
    const b = new SharedRequestCache<string>();
    await a.get(async () => 'from-a');
    expect(a.peek()).toBe('from-a');
    expect(b.peek()).toBeNull();
  });

  it('defaults to a 30s TTL', () => {
    // The chips' staleness budget is a product decision, not an implementation
    // detail, so it is pinned rather than left to drift silently.
    expect(CACHE_TTL_MS).toBe(30_000);
  });
});
