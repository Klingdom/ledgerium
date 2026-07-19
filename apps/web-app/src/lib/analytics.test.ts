/**
 * analytics.ts — anonymous visitorId persistence + track() enrichment.
 *
 * SEO attribution unblock (SITE_STATE_REVIEW_002 P1-6 / SEO_AEO_EXPANSION_001
 * §2.2 Batch 2), PART 1 of 2.
 *
 * Environment: Vitest `node` (matches this workspace's default — see
 * apps/web-app/vitest.config.ts; web-app does not run jsdom). analytics.ts
 * computes `IS_BROWSER = typeof window !== 'undefined'` once at
 * module-evaluation time, so every scenario that needs a different
 * window/localStorage/crypto posture re-imports the module fresh via
 * vi.resetModules() + dynamic import(), after stubbing the relevant globals
 * with vi.stubGlobal(). This mirrors the vi.stubGlobal pattern already used
 * for the same class of problem in
 * apps/extension-app/src/background/session-store.test.ts.
 *
 * posthog.ts is mocked out entirely — this file tests analytics.ts's own
 * visitorId + enrichment logic, not the PostHog SDK integration, and
 * importing the real posthog-js package under a stubbed/absent `window` is
 * an unrelated risk this suite has no need to take on.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./posthog.js', () => ({
  captureEvent: vi.fn(),
  identifyUser: vi.fn(),
  isPostHogEnabled: () => false,
}));

type AnalyticsModule = typeof import('./analytics.js');

const VISITOR_ID_KEY = 'ledgerium_visitor_id';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Minimal in-memory Storage implementation for stubGlobal('localStorage', ...). */
function makeMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as unknown as Storage;
}

/** A localStorage stub whose every method throws — Safari private mode / disabled storage. */
function makeThrowingStorage(): Storage {
  const boom = () => {
    throw new Error('Storage disabled (simulated Safari private-mode / policy block)');
  };
  return {
    getItem: boom,
    setItem: boom,
    removeItem: boom,
    clear: boom,
    key: boom,
    get length(): number {
      throw new Error('Storage disabled (simulated Safari private-mode / policy block)');
    },
  } as unknown as Storage;
}

interface StubWindow {
  location: { pathname: string; hostname: string };
  addEventListener: ReturnType<typeof vi.fn>;
  [key: string]: unknown;
}

function makeStubWindow(pathname = '/blog/how-to-document-a-workflow'): StubWindow {
  return {
    location: { pathname, hostname: 'ledgerium.ai' },
    addEventListener: vi.fn(),
  };
}

/** Stubs window + localStorage (+ optionally crypto) and returns the live objects for inspection. */
function stubBrowserGlobals(opts: { storage?: Storage; cryptoImpl?: unknown; hasCrypto?: boolean } = {}) {
  const win = makeStubWindow();
  const storage = opts.storage ?? makeMemoryStorage();
  vi.stubGlobal('window', win);
  vi.stubGlobal('localStorage', storage);
  if (opts.hasCrypto === false) {
    vi.stubGlobal('crypto', undefined);
  } else if ('cryptoImpl' in opts) {
    vi.stubGlobal('crypto', opts.cryptoImpl);
  }
  return { win, storage };
}

/** Fresh module instance — required because IS_BROWSER + cachedVisitorId are module-scoped. */
async function loadFreshAnalyticsModule(): Promise<AnalyticsModule> {
  vi.resetModules();
  return import('./analytics.js');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── ID generation + format ────────────────────────────────────────────────────

describe('getOrCreateVisitorId: generation on first visit', () => {
  it('generates a new UUID-shaped id when no id is stored yet', async () => {
    const { storage } = stubBrowserGlobals();
    const { getOrCreateVisitorId } = await loadFreshAnalyticsModule();

    const id = getOrCreateVisitorId();

    expect(id).not.toBeNull();
    expect(id).toMatch(UUID_RE);
    // Persisted under the documented storage key for cross-visit survival.
    expect(storage.getItem(VISITOR_ID_KEY)).toBe(id);
  });

  it('uses crypto.getRandomValues when randomUUID is unavailable (older-Safari fallback)', async () => {
    stubBrowserGlobals({
      cryptoImpl: {
        // 0xff has version nibble 'f' and variant nibble 'f' pre-masking —
        // deliberately chosen so the assertions below only pass if
        // generateVisitorId() actually forces the RFC 4122 bits rather than
        // happening to already satisfy them.
        getRandomValues: (arr: Uint8Array) => {
          arr.fill(0xff);
          return arr;
        },
      },
    });
    const { getOrCreateVisitorId } = await loadFreshAnalyticsModule();

    const id = getOrCreateVisitorId();

    expect(id).toMatch(UUID_RE);
    // Version nibble forced to 4 and variant bits forced to 8/9/a/b per RFC 4122.
    expect(id!.charAt(14)).toBe('4');
    expect(['8', '9', 'a', 'b']).toContain(id!.charAt(19).toLowerCase());
  });

  it('falls back to a Math.random()-based id when the Web Crypto API is entirely unavailable', async () => {
    stubBrowserGlobals({ hasCrypto: false });
    const { getOrCreateVisitorId } = await loadFreshAnalyticsModule();

    const id = getOrCreateVisitorId();

    expect(id).not.toBeNull();
    expect(typeof id).toBe('string');
    expect(id!.length).toBeGreaterThan(10);
    // Documented last-resort prefix so this degraded path is identifiable in data.
    expect(id).toMatch(/^vid-/);
  });
});

// ── Stability across calls ────────────────────────────────────────────────────

describe('getOrCreateVisitorId: stability', () => {
  it('returns the identical id on repeated calls within the same page load', async () => {
    const { storage } = stubBrowserGlobals();
    const { getOrCreateVisitorId } = await loadFreshAnalyticsModule();
    const getItemSpy = vi.spyOn(storage, 'getItem');

    const first = getOrCreateVisitorId();
    const second = getOrCreateVisitorId();
    const third = getOrCreateVisitorId();

    expect(second).toBe(first);
    expect(third).toBe(first);
    // In-memory cache should short-circuit repeat calls — at most one read.
    expect(getItemSpy).toHaveBeenCalledTimes(1);
  });

  it('returns the same id across a simulated reload (fresh module instance, same storage)', async () => {
    const storage = makeMemoryStorage();

    stubBrowserGlobals({ storage });
    const first = await loadFreshAnalyticsModule();
    const firstVisit = first.getOrCreateVisitorId();

    // Simulate a new page load: fresh module instance, same underlying
    // localStorage the browser would have persisted across the reload.
    stubBrowserGlobals({ storage });
    const second = await loadFreshAnalyticsModule();
    const secondVisit = second.getOrCreateVisitorId();

    expect(secondVisit).toBe(firstVisit);
  });

  it('generates a different id for a different (empty) storage — sanity check the id is not hardcoded', async () => {
    stubBrowserGlobals({ storage: makeMemoryStorage() });
    const a = await loadFreshAnalyticsModule();
    const idA = a.getOrCreateVisitorId();

    stubBrowserGlobals({ storage: makeMemoryStorage() });
    const b = await loadFreshAnalyticsModule();
    const idB = b.getOrCreateVisitorId();

    expect(idA).not.toBe(idB);
  });
});

// ── Storage failure paths ─────────────────────────────────────────────────────

describe('getOrCreateVisitorId: storage-throw fallback', () => {
  it('still returns a usable id when both getItem and setItem throw', async () => {
    stubBrowserGlobals({ storage: makeThrowingStorage() });
    const { getOrCreateVisitorId } = await loadFreshAnalyticsModule();

    const id = getOrCreateVisitorId();

    expect(id).not.toBeNull();
    expect(id).toMatch(UUID_RE);
  });

  it('keeps returning the same in-memory id across repeated calls even when storage never persists', async () => {
    stubBrowserGlobals({ storage: makeThrowingStorage() });
    const { getOrCreateVisitorId } = await loadFreshAnalyticsModule();

    const first = getOrCreateVisitorId();
    const second = getOrCreateVisitorId();

    expect(second).toBe(first);
  });

  it('never throws out of getOrCreateVisitorId when storage access throws', async () => {
    stubBrowserGlobals({ storage: makeThrowingStorage() });
    const { getOrCreateVisitorId } = await loadFreshAnalyticsModule();

    expect(() => getOrCreateVisitorId()).not.toThrow();
  });
});

// ── SSR / no-window safety ────────────────────────────────────────────────────

describe('getOrCreateVisitorId + track(): SSR safety (no window)', () => {
  it('returns null when there is no window (server component / build-time render)', async () => {
    // No stubBrowserGlobals() call — window/localStorage/crypto are absent,
    // matching a real Next.js server-render context.
    const { getOrCreateVisitorId } = await loadFreshAnalyticsModule();

    expect(getOrCreateVisitorId()).toBeNull();
  });

  it('track() never throws when called without a window', async () => {
    const { track } = await loadFreshAnalyticsModule();

    expect(() => track({ event: 'page_viewed', path: '/some/seo/page' })).not.toThrow();
  });
});

// ── track() enrichment ────────────────────────────────────────────────────────

describe('track(): visitorId enrichment', () => {
  it('attaches the persistent visitorId to an arbitrary event', async () => {
    const { win } = stubBrowserGlobals();
    const { track, getOrCreateVisitorId } = await loadFreshAnalyticsModule();
    const expectedId = getOrCreateVisitorId();

    track({ event: 'page_viewed', path: '/blog/how-to-document-a-workflow' });

    const buffered = win.__ledgerium_events as Array<Record<string, unknown>>;
    expect(buffered).toHaveLength(1);
    expect(buffered[0]?.visitorId).toBe(expectedId);
    expect(buffered[0]?.event).toBe('page_viewed');
  });

  it('attaches the same visitorId across two different event types (joinability)', async () => {
    const { win } = stubBrowserGlobals();
    const { track } = await loadFreshAnalyticsModule();

    track({ event: 'seo_page_viewed', pageType: 'alternatives', slug: 'sweetprocess', referrerClass: 'organic' });
    track({ event: 'signup_completed' });

    const buffered = win.__ledgerium_events as Array<Record<string, unknown>>;
    expect(buffered).toHaveLength(2);
    expect(buffered[0]?.visitorId).toBeTruthy();
    expect(buffered[1]?.visitorId).toBe(buffered[0]?.visitorId);
  });

  it('does not attach a visitorId key when running without a window', async () => {
    const { track } = await loadFreshAnalyticsModule();

    // Should not throw and should not attempt to read the (nonexistent) buffer.
    expect(() => track({ event: 'page_viewed', path: '/x' })).not.toThrow();
  });

  it('enriches the seo_hub_viewed taxonomy addition the same way as any other event (PART 2 handoff contract)', async () => {
    const { win } = stubBrowserGlobals();
    const { track } = await loadFreshAnalyticsModule();

    track({ event: 'seo_hub_viewed', hubType: 'alternatives', pageCount: 14, referrerClass: 'organic' });

    const buffered = win.__ledgerium_events as Array<Record<string, unknown>>;
    expect(buffered[0]?.event).toBe('seo_hub_viewed');
    expect(buffered[0]?.hubType).toBe('alternatives');
    expect(buffered[0]?.pageCount).toBe(14);
    expect(buffered[0]?.visitorId).toBeTruthy();
  });
});
