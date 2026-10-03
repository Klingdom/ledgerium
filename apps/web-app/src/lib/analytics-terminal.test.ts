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
import { ANALYTICS_MAX_EVENTS_PER_REQUEST } from './analytics-delivery.js';
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
  it('sends earlier buffered events in the same beacon, in order, bounce last', async () => {
    const page = await loadPage();
    page.mod.track({ event: 'page_viewed', path: '/a' });
    page.mod.track({ event: 'page_viewed', path: '/b' });
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });
    await page.settle();

    expect(page.beacons).toHaveLength(1);
    const events = eventsOf(page.beacons[0]!);
    expect(events.map((e) => e.event)).toEqual(['page_viewed', 'page_viewed', 'dashboard_bounced']);
    expect(events.map((e) => e.path)).toEqual(['/a', '/b', undefined]);
    expect((page.win.__ledgerium_events as unknown[]).length).toBe(0);
  });

  it('enriches exactly like track() (plan, url, timestamp, visitorId)', async () => {
    const page = await loadPage({ plan: 'team' });
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 2, elapsedMsSinceDashboardView: 9 });
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 2, elapsedMsSinceDashboardView: 9 }, { terminal: true });
    await page.settle();

    const [viaTrack, viaTerminal] = eventsOf(page.beacons[0]!) as [Record<string, unknown>, Record<string, unknown>];
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

    expect(page.fetches).toHaveLength(1);
    expect(page.fetches[0]!.init.keepalive).toBe(true);
    const sent = JSON.parse(page.fetches[0]!.init.body as string).events as Array<Record<string, unknown>>;
    expect(sent.map((e) => e.event)).toEqual(['page_viewed', 'dashboard_bounced']);
    expect((page.win.__ledgerium_events as unknown[]).length).toBe(0);

    page.fire('visibilitychange', 'hidden'); // later drain finds nothing
    expect(page.fetches).toHaveLength(1);
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
    expect(client).toMatch(/chunkEvents\(events\)/);
  });

  it('250 buffered events + terminal bounce -> 3 chunks <= cap, ordered, bounce in the last', async () => {
    const page = await loadPage();
    track(page, 250);
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });
    await page.settle();

    expect(page.beacons).toHaveLength(3);
    const chunks = page.beacons.map(eventsOf);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(ANALYTICS_MAX_EVENTS_PER_REQUEST));
    expect(chunks.map((c) => c.length)).toEqual([100, 100, 51]);
    const all = chunks.flat();
    expect(all.slice(0, 250).map((e) => e.path)).toEqual(Array.from({ length: 250 }, (_, i) => `/p${i}`));
    expect(chunks[2]!.at(-1)).toMatchObject({ event: 'dashboard_bounced' });
    expect(all.filter((e) => e.event === 'dashboard_bounced')).toHaveLength(1);
    expect((page.win.__ledgerium_events as unknown[]).length).toBe(0);
  });

  it('a buffer of exactly the cap is one request', async () => {
    const page = await loadPage();
    track(page, 99);
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });
    await page.settle();
    expect(page.beacons).toHaveLength(1);
    expect(eventsOf(page.beacons[0]!)).toHaveLength(100);
  });

  it('a refused beacon falls back to keepalive fetch per chunk, in order, nothing lost', async () => {
    const page = await loadPage({ beaconResult: false });
    track(page, 150);
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });

    expect(page.fetches).toHaveLength(2);
    page.fetches.forEach((f) => expect(f.init.keepalive).toBe(true));
    const chunks = page.fetches.map((f) => JSON.parse(f.init.body as string).events as Array<Record<string, unknown>>);
    expect(chunks.map((c) => c.length)).toEqual([100, 51]);
    expect(chunks[1]!.at(-1)).toMatchObject({ event: 'dashboard_bounced' });
    expect((page.win.__ledgerium_events as unknown[]).length).toBe(0);
  });

  it('no transport at all: every chunk returns to the buffer in order', async () => {
    const page = await loadPage({ hasBeacon: false, hasFetch: false });
    vi.stubGlobal('fetch', undefined);
    track(page, 150);
    page.mod.track({ event: 'dashboard_bounced', workflowCount: 1, elapsedMsSinceDashboardView: 5 }, { terminal: true });
    const buffer = page.win.__ledgerium_events as Array<Record<string, unknown>>;
    expect(buffer).toHaveLength(151);
    expect(buffer.at(-1)).toMatchObject({ event: 'dashboard_bounced' });
    expect(buffer.slice(0, 150).map((e) => e.path)).toEqual(Array.from({ length: 150 }, (_, i) => `/p${i}`));
  });

  it('ordinary refused beacon re-buffers the whole drain unchanged (no fetch)', async () => {
    const page = await loadPage({ beaconResult: false });
    track(page, 150);
    page.fire('visibilitychange', 'hidden');
    expect(page.fetches).toHaveLength(0);
    expect((page.win.__ledgerium_events as unknown[]).length).toBe(150);
  });
});
