// @vitest-environment jsdom
/**
 * Row #375 — real posthog-js 1.367.0 in jsdom with the repo's own init options
 * (buildPostHogConfig) and a fake transport (fetch / XHR / sendBeacon stubbed;
 * nothing leaves the process). Asserts on every request body the SDK emits.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AnalyticsEvent } from './analytics';
type PostHogInstance = typeof import('posthog-js').default;
let posthog: PostHogInstance;
let buildPostHogConfig: typeof import('./posthog').buildPostHogConfig;

const LANDING =
  '/pricing?utm_source=newsletter&utm_term=john%40example.com&utm_content=jane%252540corp.com';

const bodies: string[] = [];
const urls: string[] = [];
// captured once at load, before any spy is installed
const REAL_XHR_OPEN = XMLHttpRequest.prototype.open;

/** Every value stored under `key`, at any depth, across all events (properties, $set, $set_once). */
function valuesOf(key: string): unknown[] {
  const out: unknown[] = [];
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) { if (k === key) out.push(val); walk(val); }
    }
  };
  walk(events());
  return out;
}

const SHARE_TOKEN = 'shrTOKEN9f8e7d6c5b4a';

/** No request body carries any of the needles (case-insensitive, also after percent-decoding). */
function expectNoneInBodies(needles: string[]): void {
  expect(bodies.length).toBeGreaterThan(0);
  for (const b of bodies) {
    const text = decode(b);
    for (const n of needles) {
      expect(text.toLowerCase(), `needle ${n}`).not.toContain(n.toLowerCase());
      let dec = text;
      try { dec = decodeURIComponent(text); } catch { /* keep raw */ }
      expect(dec.toLowerCase(), `needle ${n} (decoded)`).not.toContain(n.toLowerCase());
    }
  }
}

function recordBody(body: unknown): void {
  if (body === undefined || body === null) return;
  bodies.push(typeof body === 'string' ? body : String(body));
}

/** Decode a posthog request body (JSON, or form `data=<base64 | urlencoded json>`). */
function decode(raw: string): string {
  if (!raw.startsWith('data=')) return raw;
  const v = decodeURIComponent(raw.slice(5));
  const b64 = Buffer.from(v, 'base64').toString('utf8');
  return b64.trim().startsWith('{') || b64.trim().startsWith('[') ? b64 : v;
}

type Ev = { event: string; properties: Record<string, unknown>; $set?: unknown; $set_once?: unknown };

function events(): Ev[] {
  const out: Ev[] = [];
  for (const b of bodies) {
    let parsed: unknown;
    try { parsed = JSON.parse(decode(b)); } catch { continue; }
    const list = Array.isArray(parsed) ? parsed : [parsed];
    for (const e of list) if (e && typeof e === 'object' && 'event' in e) out.push(e as Ev);
  }
  return out;
}

let instanceSeq = 0;
/** Returns the initialised instance. Each call uses a fresh named instance: posthog-js is an
 *  externalised dependency, so the default singleton survives vi.resetModules(). */
function initWithLanding(landing: string = LANDING, referrer = ''): Promise<PostHogInstance> {
  window.history.replaceState({}, '', landing);
  Object.defineProperty(document, 'referrer', { value: referrer, configurable: true });
  return new Promise((resolve) => {
    const cfg = buildPostHogConfig('https://fake.invalid', false);
    const name = `t${instanceSeq++}`;
    posthog.init('phc_test', {
      ...cfg,
      // test-only transport tweaks: no batching delay, no compression, no external scripts
      request_batching: false,
      disable_compression: true,
      disable_external_dependency_loading: true,
      loaded: (ph) => { ph.opt_in_capturing(); resolve(ph as unknown as PostHogInstance); },
    }, name);
  });
}

/** What PostHogProvider does: the single $pageview per load / navigation. */
const providerPageview = (ph: PostHogInstance, path: string) => ph.capture('$pageview', { path });

describe('PostHog repo options end-to-end in jsdom (#375)', () => {
  beforeEach(async () => {
    bodies.length = 0;
    // fresh SDK state per test (posthog-js registers itself on window and persists to storage)
    delete (window as unknown as { posthog?: unknown }).posthog;
    window.localStorage.clear();
    window.sessionStorage.clear();
    for (const c of document.cookie.split(';')) {
      const n = c.split('=')[0]!.trim();
      if (n) document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
    urls.length = 0;
    vi.stubGlobal('fetch', vi.fn(async (u: unknown, init?: { body?: unknown }) => {
      urls.push(String(u));
      recordBody(init?.body);
      return new Response('{}', { status: 200 });
    }));
    // record the URL, then call through (posthog calls setRequestHeader after open)
    vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(function (this: XMLHttpRequest, ...args: unknown[]) {
      urls.push(String(args[1]));
      return (REAL_XHR_OPEN as unknown as (...a: unknown[]) => void).apply(this, args);
    } as never);
    vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function (_body?: unknown) {
      recordBody(_body);
    });
    Object.defineProperty(navigator, 'sendBeacon', {
      value: (_u: string, b: unknown) => { recordBody(b); return true; },
      configurable: true,
    });
    // posthog-js snapshots fetch/XHR/sendBeacon at module load: import it fresh AFTER the stubs
    vi.resetModules();
    posthog = (await import('posthog-js')).default;
    ({ buildPostHogConfig } = await import('./posthog'));
  });

  it('config options: capture_pageview off, before_send set', () => {
    const cfg = buildPostHogConfig('https://fake.invalid', false);
    expect(cfg.capture_pageview).toBe(false);
    expect(typeof cfg.before_send).toBe('function');
    expect(cfg.advanced_disable_flags).toBe(true);
  });

  it('PII-bearing landing: no at-sign anywhere, queries removed, one $pageview per load, one more on navigation', async () => {
    const ph = await initWithLanding();
    providerPageview(ph, '/pricing');
    await new Promise((r) => setTimeout(r, 50));

    const first = events().filter((e) => e.event === '$pageview');
    expect(first).toHaveLength(1);
    expect(first[0]!.properties.utm_source).toBe('newsletter');
    expect('utm_term' in first[0]!.properties).toBe(false);
    expect('utm_content' in first[0]!.properties).toBe(false);
    expect(String(first[0]!.properties.$current_url)).toMatch(/\/pricing$/);

    // simulated client-side navigation
    window.history.pushState({}, '', '/dashboard');
    providerPageview(ph, '/dashboard');
    ph.capture('custom_event', { x: 1 });
    await new Promise((r) => setTimeout(r, 50));

    const all = events();
    const pageviews = all.filter((e) => e.event === '$pageview');
    expect(pageviews).toHaveLength(2);
    expect(String(pageviews[1]!.properties.$current_url)).toMatch(/\/dashboard$/);

    expect(bodies.length).toBeGreaterThan(0);
    for (const b of bodies) {
      const text = decode(b);
      const lowered = text.toLowerCase();
      expect(text).not.toContain('@');
      expect(lowered).not.toContain('%40');
      expect(lowered).not.toContain('2540');
      expect(lowered).not.toContain('john');
      expect(lowered).not.toContain('jane');
    }
    for (const e of all) {
      for (const bag of [e.properties, e.$set, e.$set_once] as Array<Record<string, unknown> | undefined>) {
        for (const [k, v] of Object.entries(bag ?? {})) {
          if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
            expect(v, `${e.event}.${k}`).not.toMatch(/[?#]/);
          }
        }
      }
    }
  });

  it('#378 config: autocapture off, localStorage persistence', () => {
    const cfg = buildPostHogConfig('https://fake.invalid', false);
    expect(cfg.autocapture).toBe(false);
    expect(cfg.persistence).toBe('localStorage');
    expect(cfg.mask_all_text).toBe(true);
    expect(cfg.mask_all_element_attributes).toBe(true);
  });

  it('#378: clicks on email-text button / query links send no autocapture; nested + person properties sanitized; cookie clean', async () => {
    document.body.innerHTML =
      '<button id="b">john@example.com</button>' +
      '<a id="abs" href="https://app.test/share/tok?e=bob%40corp.com">share</a>' +
      '<a id="rel" href="/share/tok2?e=bob%40corp.com">rel</a>';
    document.addEventListener('click', (e) => e.preventDefault()); // jsdom: no navigation
    const ph = await initWithLanding();
    providerPageview(ph, '/pricing');
    for (const id of ['b', 'abs', 'rel']) {
      document.getElementById(id)!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
    ph.capture('custom_nested', {
      meta: { link: 'https://x.test/p?e=bob%40corp.com', rel: '/share/t?e=bob%40corp.com' },
      list: ['https://x.test/p?e=bob%40corp.com'],
    });
    ph.setPersonProperties({ landing: 'https://x.test/p?e=bob%40corp.com', rel_url: '/a?e=bob%40corp.com' });
    ph.identify('user-1', { homepage: 'https://x.test/h?e=bob%40corp.com' });
    await new Promise((r) => setTimeout(r, 100));

    const all = events();
    expect(all.filter((e) => e.event === '$autocapture')).toHaveLength(0);
    expect(all.some((e) => e.event === 'custom_nested')).toBe(true);
    expect(bodies.length).toBeGreaterThan(0);
    for (const b of bodies) {
      const text = decode(b);
      const lowered = text.toLowerCase();
      expect(text).not.toContain('@');
      expect(lowered).not.toContain('%40');
      expect(lowered).not.toContain('john');
      expect(lowered).not.toContain('bob');
      expect(text).not.toContain('?');
    }
    // cookies: no query, no landing URL, no utm payload
    expect(document.cookie).not.toContain('?');
    expect(document.cookie).not.toContain('%3F');
    expect(document.cookie.toLowerCase()).not.toContain('pricing');
    expect(document.cookie.toLowerCase()).not.toContain('utm_');
    expect(document.cookie.toLowerCase()).not.toContain('example.com');
  });

  // ---- #385: path-borne secrets ----
  it('#385: landing on /share/<token> with full consent: the token is in NO request body ($pageview, custom, $identify, $set, $set_once, $pageleave, next page)', async () => {
    const landing = `/share/${SHARE_TOKEN}?utm_source=newsletter&utm_term=john%40example.com`;
    const ph = await initWithLanding(landing, 'https://mail.example/inbox/john@example.com?u=john%40example.com');
    providerPageview(ph, `/share/${SHARE_TOKEN}`);
    // #388: the real payload (track() strips event/timestamp/url, adds userPlan + visitorId); it carries no token.
    ph.capture('shared_workflow_viewed', { userPlan: 'unknown', visitorId: 'visitor-1' });
    ph.register({ sup_pathname: `/share/${SHARE_TOKEN}` });
    ph.identify('user-1', { plan: 'free' });
    ph.setPersonProperties({ landing: window.location.href }, { first_landing: window.location.href });
    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(new Event('beforeunload'));
    window.history.pushState({}, '', '/signup');
    providerPageview(ph, '/signup');
    ph.capture('later_event', { x: 1 });
    await new Promise((r) => setTimeout(r, 100));

    expectNoneInBodies([SHARE_TOKEN, 'john', '@', '%40']);

    const names = events().map((e) => e.event);
    expect(names).toContain('$pageview');
    expect(names).toContain('shared_workflow_viewed');
    expect(names).toContain('$identify');
    const first = events().find((e) => e.event === '$pageview')!;
    expect(first.properties.$current_url).toMatch(/\/share\/\[token\]$/);
    expect(first.properties.$pathname).toBe('/share/[token]');
    expect(first.properties.path).toBe('/share/[token]');
    expect(first.properties.$referrer).toBe('https://mail.example/inbox/[email]');
    const signup = events().filter((e) => e.event === '$pageview')[1]!;
    expect(signup.properties.$prev_pageview_pathname).toBe('/share/[token]');
    expect(signup.properties.$session_entry_pathname).toBe('/share/[token]');
    expect(String(signup.properties.$session_entry_url)).toMatch(/\/share\/\[token\]$/);
    // person properties kept forever
    const initialUrls = valuesOf('$initial_current_url').concat(valuesOf('$initial_pathname'));
    expect(initialUrls.length).toBeGreaterThan(0);
    for (const v of initialUrls) expect(String(v)).toMatch(/\/share\/\[token\]$/);
  });

  it('#385: /invite/<token> (defensive pattern), the real /teams/join?token=…, and a workflow id never reach PostHog', async () => {
    for (const [landing, secret, templated] of [
      ['/invite/INVTOKEN77aa88bb', 'INVTOKEN77aa88bb', '/invite/[token]'],
      ['/teams/join?token=JOINTOKEN55cc66dd', 'JOINTOKEN55cc66dd', '/teams/join'],
      ['/workflows/cmWFID1234567890', 'cmWFID1234567890', '/workflows/[id]'],
    ] as const) {
      bodies.length = 0;
      delete (window as unknown as { posthog?: unknown }).posthog;
      window.localStorage.clear();
      window.sessionStorage.clear();
      const ph = await initWithLanding(landing);
      providerPageview(ph, landing.split('?')[0]!);
      ph.identify('user-1');
      await new Promise((r) => setTimeout(r, 60));
      expectNoneInBodies([secret]);
      const pv = events().find((e) => e.event === '$pageview')!;
      expect(String(pv.properties.$current_url)).toMatch(new RegExp(`${templated.replace(/[[\]/]/g, '\\$&')}$`));
      expect(pv.properties.$pathname).toBe(templated);
    }
  });

  it('#385: a referrer whose path holds an email, and a schemeless URL-key value, are redacted end to end', async () => {
    const ph = await initWithLanding('/pricing', 'https://mail.example/inbox/john@example.com');
    ph.capture('x', { page_url: 'app.test/p?e=a@b.c', note: 'http://x.test/p?e=a@b.c', next: '/a#e=a@b.c' });
    await new Promise((r) => setTimeout(r, 60));
    expectNoneInBodies(['john', '@', 'a@b.c']);
    const ev = events().find((e) => e.event === 'x')!;
    expect(ev.properties.page_url).toBe('app.test/p');
    expect(ev.properties.note).toBe('http://x.test/p');
    expect(ev.properties.next).toBe('/a');
    expect(ev.properties.$referrer).toBe('https://mail.example/inbox/[email]');
  });

  it('#389: dynamic document.title holding an email never reaches a body; real tag_created / systems-filter payloads carry no free text', async () => {
    const ph = await initWithLanding('/workflows/cm0abc123def456ghi789');
    // a page that sets a dynamic title from user content (workflow / SOP name)
    document.title = 'Invoice run for jane.doe@acme-corp.com | Ledgerium';
    // the real payloads track() forwards after #389 (typed: a free-text field would not compile)
    const tag: AnalyticsEvent = { event: 'tag_created', tagNameLength: 'Client: john@example.com'.length };
    const filter: AnalyticsEvent = { event: 'dashboard_v2_filter_applied', filterType: 'systems', filterValue: 'added' };
    providerPageview(ph, '/workflows/cm0abc123def456ghi789');
    const { event: tagEvent, ...tagProps } = tag;
    const { event: filterEvent, ...filterProps } = filter;
    ph.capture(tagEvent, tagProps);
    ph.capture(filterEvent, filterProps);
    ph.capture('$pageleave');
    await new Promise((r) => setTimeout(r, 150));

    const evs = events();
    expect(evs.some((e) => e.event === '$pageview')).toBe(true);
    expect(evs.some((e) => e.event === 'tag_created')).toBe(true);
    expect(valuesOf('title')).toEqual([]);
    expect(valuesOf('$title')).toEqual([]);
    expectNoneInBodies(['jane.doe', 'acme-corp', 'john@example.com', 'Invoice run', 'Client:', 'salesforce']);
    const sent = evs.find((e) => e.event === 'tag_created')!.properties;
    expect(sent.tagNameLength).toBe(24);
    expect('tagName' in sent).toBe(false);
  });

  it('#389: a title set while the user is signed in as an email also stays out of $set / $set_once', async () => {
    const ph = await initWithLanding('/pricing');
    document.title = 'owner@acme-corp.com';
    ph.capture('x', { title: 'a@b.co', $set: { $title: 'a@b.co' } });
    ph.capture('$pageview', { path: '/pricing' });
    await new Promise((r) => setTimeout(r, 150));
    expect(valuesOf('title')).toEqual([]);
    expect(valuesOf('$title')).toEqual([]);
    expectNoneInBodies(['acme-corp', 'a@b.co']);
  });

  it('#385: depth-13 custom property is cut and leaks nothing', async () => {
    const ph = await initWithLanding('/pricing');
    let node: unknown = { u: `https://app.test/share/${SHARE_TOKEN}?e=a@b.c` };
    for (let i = 0; i < 13; i++) node = { n: node };
    ph.capture('deep', { a: node });
    await new Promise((r) => setTimeout(r, 60));
    expectNoneInBodies([SHARE_TOKEN, 'a@b.c']);
    expect(events().some((e) => e.event === 'deep')).toBe(true);
  });

  it('#385: heatmaps, dead clicks, exception capture, web vitals, surveys, replay stay inactive after init (config forced off; no extra traffic)', async () => {
    document.body.innerHTML = '<button id="b">x</button>';
    const ph = await initWithLanding('/pricing');
    const cfg = ph.config as unknown as Record<string, unknown>;
    expect(cfg.capture_heatmaps).toBe(false);
    expect(cfg.capture_dead_clicks).toBe(false);
    expect(cfg.capture_exceptions).toBe(false);
    expect(cfg.capture_performance).toBe(false);
    expect(cfg.disable_surveys).toBe(true);
    expect(cfg.disable_surveys_automatic_display).toBe(true);
    expect(cfg.disable_product_tours).toBe(true);
    expect(cfg.disable_conversations).toBe(true);
    expect(cfg.disable_web_experiments).toBe(true);
    expect(cfg.disable_session_recording).toBe(true);
    expect(cfg.autocapture).toBe(false);

    // extension objects, where the SDK builds them, must report disabled
    // isEnabled is a boolean on some extensions and a predicate (called with the extension) on others,
    // e.g. dead clicks in 1.367.0, where a bare Boolean(fn) would always read true.
    const ext = ph as unknown as Record<string, { isEnabled?: boolean | ((self: unknown) => boolean); started?: boolean } | undefined>;
    for (const name of ['heatmaps', 'deadClicksAutocapture', 'exceptionObserver', 'webVitalsAutocapture', 'sessionRecording']) {
      const flag = ext[name]?.isEnabled;
      const enabled = typeof flag === 'function' ? flag(ext[name]) : Boolean(flag);
      expect(enabled, name).toBe(false);
      expect(Boolean(ext[name]?.started), `${name}.started`).toBe(false);
    }

    // exercise the triggers: clicks (heatmap / dead click), a window error and a rejection (exceptions)
    const btn = document.getElementById('b')!;
    for (let i = 0; i < 4; i++) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom john@example.com' })); // no error object: jsdom forwards one to the runner as an uncaught exception
    window.dispatchEvent(new Event('unhandledrejection'));
    window.dispatchEvent(new Event('pagehide'));
    ph.capture('probe', {});
    await new Promise((r) => setTimeout(r, 150));

    const names = new Set(events().map((e) => e.event));
    for (const banned of ['$autocapture', '$$heatmap', '$heatmap', '$dead_click', '$exception', '$web_vitals', '$survey_shown', '$snapshot']) {
      expect(names.has(banned), banned).toBe(false);
    }
    expect(names.has('probe')).toBe(true);
    // the only endpoint hit is event capture: no /flags, /decide, config.js, /surveys, /s/ (replay), /array/, /static/
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) expect(new URL(u, 'https://fake.invalid').pathname, u).toMatch(/^\/e\/?$/);
    expectNoneInBodies(['john']);
  });
});
