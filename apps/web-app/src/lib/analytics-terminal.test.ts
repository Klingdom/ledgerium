/**
 * Row #249 — a lifecycle-terminal event is delivered at emission, not left for
 * a drain that may never fire.
 *
 * The bug: `dashboard_bounced` is emitted on `pagehide` and used to be buffered.
 * On background-then-discard, `visibilitychange` -> hidden fires FIRST (draining
 * an empty buffer) and `pagehide` arrives later, with nothing after it. The
 * drain listeners live in analytics.ts (module scope) and the bounce listener
 * lives in the dashboard shell (component scope), so neither file's own tests
 * could see the interaction. This file wires both sets of listeners to one
 * fake page lifecycle so that the sequence is exercised end to end.
 *
 * Environment: vitest `node`; window/document/navigator are stubbed, and the
 * module is re-imported fresh so its import-time listeners register on them.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ANALYTICS_MAX_EVENTS_PER_REQUEST,
  ANALYTICS_MAX_REQUEST_BYTES,
  chunkEventsBySize,
  planDelivery,
  requeueFailed,
} from './analytics-delivery.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BOUNCE_TRIGGER, shouldEmitBounce } from './bounce.js';

vi.mock('./posthog.js', () => ({
  captureEvent: vi.fn(),
  identifyUser: vi.fn(),
  isPostHogEnabled: () => false,
}));

type Handler = () => void;
type Beacon = { url: string; body: string };

interface Page {
  mod: typeof import('./analytics.js');
  beacons: Beacon[];
  fetches: Array<{ url: string; init: Record<string, unknown> }>;
  win: Record<string, unknown>;
  /** Fire a page-lifecycle event on whichever target registered for it. */
  fire(type: 'visibilitychange' | 'pagehide' | 'beforeunload', visibility?: string): void;
  /** Resolve every beacon body once (Blob.text is async). */
  settle(): Promise<void>;
}

async function loadPage(opts: { beaconResult?: boolean; hasBeacon?: boolean; hasFetch?: boolean; plan?: string } = {}): Promise<Page> {
  const winHandlers = new Map<string, Handler[]>();
  const docHandlers = new Map<string, Handler[]>();
  const add = (m: Map<string, Handler[]>) => (t: string, h: Handler) => {
    m.set(t, [...(m.get(t) ?? []), h]);
  };
  const doc = { visibilityState: 'visible', addEventListener: add(docHandlers) };
  const win: Record<string, unknown> = {
    location: { pathname: '/dashboard', hostname: 'ledgerium.ai' },
    addEventListener: add(winHandlers),
  };
  if (opts.plan) win.__ledgerium_userPlan = opts.plan;

  const beacons: Beacon[] = [];
  const pendingBodies: Array<Promise<void>> = [];
  const nav: Record<string, unknown> = {};
  if (opts.hasBeacon !== false) {
    nav.sendBeacon = vi.fn((url: string, blob: Blob) => {
      const entry: Beacon = { url, body: '' };
      beacons.push(entry);
      pendingBodies.push(blob.text().then((t) => { entry.body = t; }));
      return opts.beaconResult ?? true;
    });
  }
  const fetches: Page['fetches'] = [];
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('navigator', nav);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
  if (opts.hasFetch !== false) {
    vi.stubGlobal('fetch', vi.fn((url: string, init: Record<string, unknown>) => {
      fetches.push({ url, init });
      return Promise.resolve({ ok: true });
    }));
  }

  vi.resetModules();
  const mod = await import('./analytics.js');
  return {
    mod,
    beacons,
    fetches,
    win,
    fire(type, visibility) {
      if (type === 'visibilitychange') {
        doc.visibilityState = visibility ?? 'hidden';
        (docHandlers.get(type) ?? []).forEach((h) => h());
      } else {
        (winHandlers.get(type) ?? []).forEach((h) => h());
      }
    },
    settle: async () => { await Promise.all(pendingBodies); },
  };
}

/** Mirrors the shell's bounce effect: component-scope `pagehide` listener. */
function mountBounceListener(page: Page, ctx: { viewFired: boolean; clickCount: number }): void {
  (page.win.addEventListener as (t: string, h: Handler) => void)(BOUNCE_TRIGGER, () => {
    if (!shouldEmitBounce({ viewFired: ctx.viewFired, clickCount: ctx.clickCount })) return;
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 3, elapsedMsSinceDashboardView: 1200 }, { terminal: true });
  });
}

const eventsOf = (b: Beacon): Array<Record<string, unknown>> => JSON.parse(b.body).events;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('row #249: background-then-discard', () => {
  it('delivers the bounce when hidden drained an empty buffer before pagehide', async () => {
    const page = await loadPage();
    mountBounceListener(page, { viewFired: true, clickCount: 0 });

    page.fire('visibilitychange', 'hidden'); // drains nothing — buffer is empty
    expect(page.beacons).toHaveLength(0);
    page.fire('pagehide'); // arrives later, no further transition follows
    await page.settle();

    expect(page.beacons).toHaveLength(1);
    const events = eventsOf(page.beacons[0]!);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event: 'dashboard_bounced', workflowCount: 3 });
  });

  it('delivers exactly once on a visible-page exit (pagehide, then hidden)', async () => {
    const page = await loadPage();
    mountBounceListener(page, { viewFired: true, clickCount: 0 });

    page.fire('pagehide');
    page.fire('visibilitychange', 'hidden');
    page.fire('beforeunload');
    await page.settle();

    const bounces = page.beacons.flatMap(eventsOf).filter((e) => e.event === 'dashboard_bounced');
    expect(bounces).toHaveLength(1);
    expect(page.beacons).toHaveLength(1);
    expect((page.win.__ledgerium_events as unknown[]).length).toBe(0);
  });

  it('does not emit when the visit had a click (semantics unchanged)', async () => {
    const page = await loadPage();
    mountBounceListener(page, { viewFired: true, clickCount: 1 });
    page.fire('pagehide');
    expect(page.beacons).toHaveLength(0);
  });

  it('does not emit when the view never fired (semantics unchanged)', async () => {
    const page = await loadPage();
    mountBounceListener(page, { viewFired: false, clickCount: 0 });
    page.fire('pagehide');
    expect(page.beacons).toHaveLength(0);
  });
});

describe('track(..., { terminal: true }): delivery', () => {
  it('row #251 (5): sends the bounce first and alone, then earlier buffered events in order', async () => {
    const page = await loadPage();
    page.mod.track({ event: 'page_viewed', path: '/a' });
    page.mod.track({ event: 'page_viewed', path: '/b' });
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });
    await page.settle();

    expect(page.beacons).toHaveLength(2);
    expect(eventsOf(page.beacons[0]!).map((e) => e.event)).toEqual(['dashboard_bounced']);
    const rest = eventsOf(page.beacons[1]!);
    expect(rest.map((e) => e.event)).toEqual(['page_viewed', 'page_viewed']);
    expect(rest.map((e) => e.path)).toEqual(['/a', '/b']);
    expect((page.win.__ledgerium_events as unknown[]).length).toBe(0);
  });

  it('enriches exactly like track() (plan, url, timestamp, visitorId)', async () => {
    const page = await loadPage({ plan: 'team' });
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 2, elapsedMsSinceDashboardView: 9 });
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 2, elapsedMsSinceDashboardView: 9 }, { terminal: true });
    await page.settle();

    const viaTerminal = eventsOf(page.beacons[0]!)[0] as Record<string, unknown>;
    const viaTrack = eventsOf(page.beacons[1]!)[0] as Record<string, unknown>;
    expect(Object.keys(viaTerminal).sort()).toEqual(Object.keys(viaTrack).sort());
    expect(viaTerminal.userPlan).toBe('team');
    expect(viaTerminal.url).toBe('/dashboard');
    expect(typeof viaTerminal.timestamp).toBe('string');
    expect(viaTerminal.visitorId).toBe(viaTrack.visitorId);
  });

  it("uses the 'unknown' plan bucket when the plan is not set", async () => {
    const page = await loadPage();
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 0, elapsedMsSinceDashboardView: 0 }, { terminal: true });
    await page.settle();
    expect(eventsOf(page.beacons[0]!)[0]?.userPlan).toBe('unknown');
  });

  it('falls back to a keepalive fetch when sendBeacon refuses, without duplicating', async () => {
    const page = await loadPage({ beaconResult: false });
    page.mod.track({ event: 'page_viewed', path: '/a' });
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });

    expect(page.fetches).toHaveLength(2);
    page.fetches.forEach((f) => expect(f.init.keepalive).toBe(true));
    const sent = page.fetches.map((f) => (JSON.parse(f.init.body as string).events as Array<Record<string, unknown>>).map((e) => e.event));
    expect(sent).toEqual([['dashboard_bounced'], ['page_viewed']]);
    expect((page.win.__ledgerium_events as unknown[]).length).toBe(0);

    page.fire('visibilitychange', 'hidden'); // later drain finds nothing
    expect(page.fetches).toHaveLength(2);
  });

  it('falls back to keepalive fetch when sendBeacon is unavailable', async () => {
    const page = await loadPage({ hasBeacon: false });
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });
    expect(page.fetches).toHaveLength(1);
    expect(page.fetches[0]!.init.keepalive).toBe(true);
  });

  it('never drops: neither transport available returns the event to the buffer', async () => {
    const page = await loadPage({ hasBeacon: false, hasFetch: false });
    vi.stubGlobal('fetch', undefined);
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });
    const buffer = page.win.__ledgerium_events as Array<Record<string, unknown>>;
    expect(buffer.map((e) => e.event)).toEqual(['dashboard_bounced']);
  });
});

describe('ordinary events are unchanged', () => {
  it('track() still only buffers (no immediate delivery below the batch threshold)', async () => {
    const page = await loadPage();
    page.mod.track({ event: 'page_viewed', path: '/a' });
    expect(page.beacons).toHaveLength(0);
    expect(page.fetches).toHaveLength(0);
    expect((page.win.__ledgerium_events as unknown[]).length).toBe(1);
  });

  it('track() still drains on visibilitychange -> hidden exactly once', async () => {
    const page = await loadPage();
    page.mod.track({ event: 'page_viewed', path: '/a' });
    page.fire('visibilitychange', 'hidden');
    page.fire('visibilitychange', 'hidden');
    await page.settle();
    expect(page.beacons).toHaveLength(1);
  });

  it('a refused beacon on an ordinary drain still puts events back (no fetch)', async () => {
    const page = await loadPage({ beaconResult: false });
    page.mod.track({ event: 'page_viewed', path: '/a' });
    page.fire('visibilitychange', 'hidden');
    expect(page.fetches).toHaveLength(0);
    expect((page.win.__ledgerium_events as unknown[]).length).toBe(1);
  });
});

describe('the shell uses the terminal path for the bounce', () => {
  it('emits dashboard_bounced with { terminal: true }', () => {
    const src = readFileSync(
      join(__dirname, '..', 'components', 'dashboard-v2', 'DashboardV2Shell.tsx'),
      'utf8',
    );
    expect(src).toMatch(/track\(\{\s*event: 'dashboard_bounced'[\s\S]*?\},\s*\{\s*terminal: true\s*\}\)/);
  });
});

/** Mirrors the shell: per-view `alreadyEmitted` guard, plus a click counter. */
function mountGuardedBounce(page: Page, ctx: { clickCount: number }): void {
  let emitted = false;
  (page.win.addEventListener as (t: string, h: Handler) => void)(BOUNCE_TRIGGER, () => {
    if (!shouldEmitBounce({ viewFired: true, clickCount: ctx.clickCount, alreadyEmitted: emitted })) return;
    emitted = true;
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });
  });
}

describe('row #251 (3): at most one bounce per view across bfcache', () => {
  const bounces = (page: Page) => page.beacons.flatMap(eventsOf).filter((e) => e.event === 'dashboard_bounced');

  it('pagehide -> pageshow(persisted) -> pagehide emits exactly one bounce', async () => {
    const page = await loadPage();
    mountGuardedBounce(page, { clickCount: 0 });
    page.fire('pagehide');
    // pageshow(persisted) restores the same page; no new dashboard_v2_viewed fires.
    page.fire('pagehide');
    await page.settle();
    expect(bounces(page)).toHaveLength(1);
  });

  it('a click after restore still yields no further bounce', async () => {
    const page = await loadPage();
    const ctx = { clickCount: 0 };
    mountGuardedBounce(page, ctx);
    page.fire('pagehide');
    ctx.clickCount = 1; // click after the restore
    page.fire('pagehide');
    await page.settle();
    expect(bounces(page)).toHaveLength(1);
  });

  it('a click before the first leave means no bounce at all', async () => {
    const page = await loadPage();
    mountGuardedBounce(page, { clickCount: 1 });
    page.fire('pagehide');
    page.fire('pagehide');
    expect(page.beacons).toHaveLength(0);
  });

  it('the shell passes and sets the per-view guard (wiring lock)', () => {
    const src = readFileSync(join(__dirname, '..', 'components', 'dashboard-v2', 'DashboardV2Shell.tsx'), 'utf8');
    expect(src).toMatch(/alreadyEmitted: bounceEmittedRef\.current/);
    expect(src).toMatch(/bounceEmittedRef\.current = true/);
  });
});

describe('row #251 (4): client never exceeds the per-request cap', () => {
  const track = (page: Page, n: number) => {
    for (let i = 0; i < n; i++) page.mod.track({ event: 'page_viewed', path: `/p${i}` });
  };

  it('the cap is one shared constant used by client and server', () => {
    expect(ANALYTICS_MAX_EVENTS_PER_REQUEST).toBe(100);
    const route = readFileSync(join(__dirname, '..', 'app', 'api', 'analytics', 'events', 'route.ts'), 'utf8');
    expect(route).toMatch(/import \{ ANALYTICS_MAX_EVENTS_PER_REQUEST \} from '@\/lib\/analytics-delivery'/);
    expect(route).toMatch(/MAX_BATCH = ANALYTICS_MAX_EVENTS_PER_REQUEST/);
    const client = readFileSync(join(__dirname, 'analytics.ts'), 'utf8');
    expect(client).toMatch(/planDelivery\(events, isTerminal\)/);
  });

  it('250 buffered events + terminal bounce -> bounce alone first, then 100/100/50 <= cap, ordered', async () => {
    const page = await loadPage();
    track(page, 250);
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });
    await page.settle();

    expect(page.beacons).toHaveLength(4);
    const chunks = page.beacons.map(eventsOf);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(ANALYTICS_MAX_EVENTS_PER_REQUEST));
    expect(chunks.map((c) => c.length)).toEqual([1, 100, 100, 50]);
    expect(chunks[0]![0]).toMatchObject({ event: 'dashboard_bounced' });
    const all = chunks.slice(1).flat();
    expect(all.map((e) => e.path)).toEqual(Array.from({ length: 250 }, (_, i) => `/p${i}`));
    expect(chunks.flat().filter((e) => e.event === 'dashboard_bounced')).toHaveLength(1);
    expect((page.win.__ledgerium_events as unknown[]).length).toBe(0);
  });

  it('a buffer of exactly the cap is one request', async () => {
    const page = await loadPage();
    track(page, 99);
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });
    await page.settle();
    expect(page.beacons.map((b) => eventsOf(b).length)).toEqual([1, 99]);
  });

  it('a refused beacon falls back to keepalive fetch per chunk, in order, nothing lost', async () => {
    const page = await loadPage({ beaconResult: false });
    track(page, 150);
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });

    expect(page.fetches).toHaveLength(3);
    page.fetches.forEach((f) => expect(f.init.keepalive).toBe(true));
    const chunks = page.fetches.map((f) => JSON.parse(f.init.body as string).events as Array<Record<string, unknown>>);
    expect(chunks.map((c) => c.length)).toEqual([1, 100, 50]);
    expect(chunks[0]![0]).toMatchObject({ event: 'dashboard_bounced' });
    expect((page.win.__ledgerium_events as unknown[]).length).toBe(0);
  });

  it('no transport at all: every chunk returns to the buffer in order', async () => {
    const page = await loadPage({ hasBeacon: false, hasFetch: false });
    vi.stubGlobal('fetch', undefined);
    track(page, 150);
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });
    const buffer = page.win.__ledgerium_events as Array<Record<string, unknown>>;
    expect(buffer).toHaveLength(151);
    expect(buffer[0]).toMatchObject({ event: 'dashboard_bounced' }); // the terminal chunk is first
    expect(buffer.slice(1).map((e) => e.path)).toEqual(Array.from({ length: 150 }, (_, i) => `/p${i}`));
  });

  it('ordinary refused beacon re-buffers the whole drain unchanged (no fetch)', async () => {
    const page = await loadPage({ beaconResult: false });
    track(page, 150);
    page.fire('visibilitychange', 'hidden');
    expect(page.fetches).toHaveLength(0);
    expect((page.win.__ledgerium_events as unknown[]).length).toBe(150);
  });
});

describe('row #251 (5): byte-bounded chunks with the terminal event first', () => {
  const big = (page: Page, n: number) => {
    // ~0.5 KB each: 150 events is ~75 KB, the MR-083 probe.
    for (let i = 0; i < n; i++) page.mod.track({ event: 'page_viewed', path: `/p${i}-${'x'.repeat(400)}` });
  };

  it('150 x ~0.5 KB events: every request stays under the byte limit, bounce first, nothing lost', async () => {
    const page = await loadPage();
    big(page, 150);
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });
    await page.settle();

    const bodies = page.beacons.map((b) => b.body);
    bodies.forEach((b) => expect(new TextEncoder().encode(b).length).toBeLessThanOrEqual(ANALYTICS_MAX_REQUEST_BYTES));
    expect(bodies.length).toBeGreaterThan(2);
    expect(eventsOf(page.beacons[0]!).map((e) => e.event)).toEqual(['dashboard_bounced']);
    expect(page.beacons.slice(1).flatMap(eventsOf)).toHaveLength(150);
  });

  it('chunkEventsBySize: respects both bounds and keeps order', () => {
    const events = Array.from({ length: 30 }, (_, i) => ({ i, pad: 'y'.repeat(1000) }));
    const chunks = chunkEventsBySize(events, 100, 10_000);
    chunks.forEach((c) => expect(new TextEncoder().encode(JSON.stringify({ events: c })).length).toBeLessThanOrEqual(10_000));
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.flat().map((e) => e.i)).toEqual(events.map((e) => e.i));
    expect(chunkEventsBySize(events, 7, 1_000_000).map((c) => c.length)).toEqual([7, 7, 7, 7, 2]);
  });

  it('an oversized single event still goes out, alone', () => {
    const chunks = chunkEventsBySize([{ a: 'z'.repeat(500) }, { a: 'q' }], 100, 100);
    expect(chunks.map((c) => c.length)).toEqual([1, 1]);
  });

  it('planDelivery: terminalLast sends the last event alone first; otherwise order is untouched', () => {
    expect(planDelivery([1, 2, 3], true)).toEqual([[3], [1, 2]]);
    expect(planDelivery([1, 2, 3], false)).toEqual([[1, 2, 3]]);
    expect(planDelivery([9], true)).toEqual([[9]]);
    expect(planDelivery([], true)).toEqual([]);
  });
});

describe('row #251 (1): a failed ordinary fetch is requeued once, not dropped and not looped', () => {
  const flush = async () => { await new Promise((r) => setTimeout(r, 0)); await new Promise((r) => setTimeout(r, 0)); };
  const failingPage = async (fail: 'reject' | 'status') => {
    const page = await loadPage({ hasBeacon: false });
    vi.stubGlobal('fetch', vi.fn((url: string, init: Record<string, unknown>) => {
      page.fetches.push({ url, init });
      return fail === 'reject' ? Promise.reject(new Error('offline')) : Promise.resolve({ ok: false, status: 500 });
    }));
    return page;
  };

  for (const mode of ['reject', 'status'] as const) {
    it(`${mode}: the batch returns to the buffer once, then is dropped on the second failure`, async () => {
      vi.useFakeTimers();
      try {
        const page = await failingPage(mode);
        for (let i = 0; i < 10; i++) page.mod.track({ event: 'page_viewed', path: `/p${i}` });
        await vi.advanceTimersByTimeAsync(2500); // debounced flush; buffer drained, then the request fails
        expect(page.fetches).toHaveLength(1);
        const buffer = page.win.__ledgerium_events as Array<Record<string, unknown>>;
        expect(buffer.map((e) => e.path)).toEqual(Array.from({ length: 10 }, (_, i) => `/p${i}`));

        // Second failure of the same events: dropped, no retry loop.
        for (let i = 0; i < 10; i++) page.mod.track({ event: 'page_viewed', path: `/n${i}` });
        await vi.advanceTimersByTimeAsync(2500);
        expect(page.fetches).toHaveLength(2);
        expect((page.win.__ledgerium_events as Array<Record<string, unknown>>).map((e) => e.path)).toEqual(
          Array.from({ length: 10 }, (_, i) => `/n${i}`), // the new events were requeued once; the old ones are gone
        );
        await vi.advanceTimersByTimeAsync(10_000);
        expect(page.fetches).toHaveLength(2); // nothing re-sent on its own
      } finally {
        vi.useRealTimers();
      }
    });
  }

  it('requeueFailed: puts events at the front, once each, within the cap', () => {
    const retried = new WeakSet<object>();
    const a = { n: 1 }; const b = { n: 2 }; const c = { n: 3 };
    const buffer: object[] = [c];
    expect(requeueFailed(buffer, [a, b], retried, 10)).toBe(2);
    expect(buffer).toEqual([a, b, c]);
    expect(requeueFailed(buffer, [a, b], retried, 10)).toBe(0);
    const capped: object[] = [{ n: 9 }, { n: 8 }];
    requeueFailed(capped, [{ n: 1 }, { n: 2 }], new WeakSet(), 3);
    expect(capped).toHaveLength(3);
  });

  it('a terminal fetch failure is not requeued (the page is gone)', async () => {
    const page = await failingPage('reject');
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });
    await flush();
    expect((page.win.__ledgerium_events as unknown[]).length).toBe(0);
  });
});
