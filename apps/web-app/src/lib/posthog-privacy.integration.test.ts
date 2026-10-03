// @vitest-environment jsdom
/**
 * Row #375 — real posthog-js 1.367.0 in jsdom with the repo's own init options
 * (buildPostHogConfig) and a fake transport (fetch / XHR / sendBeacon stubbed;
 * nothing leaves the process). Asserts on every request body the SDK emits.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
type PostHogInstance = typeof import('posthog-js').default;
let posthog: PostHogInstance;
let buildPostHogConfig: typeof import('./posthog').buildPostHogConfig;

const LANDING =
  '/pricing?utm_source=newsletter&utm_term=john%40example.com&utm_content=jane%252540corp.com';

const bodies: string[] = [];

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

function initWithLanding(): Promise<void> {
  window.history.replaceState({}, '', LANDING);
  return new Promise((resolve) => {
    const cfg = buildPostHogConfig('https://fake.invalid', false);
    posthog.init('phc_test', {
      ...cfg,
      // test-only transport tweaks: no batching delay, no compression, no external scripts
      request_batching: false,
      disable_compression: true,
      disable_external_dependency_loading: true,
      loaded: (ph) => { ph.opt_in_capturing(); resolve(); },
    });
  });
}

/** What PostHogProvider does: the single $pageview per load / navigation. */
const providerPageview = (path: string) => posthog.capture('$pageview', { path });

describe('PostHog repo options end-to-end in jsdom (#375)', () => {
  beforeEach(async () => {
    bodies.length = 0;
    vi.stubGlobal('fetch', vi.fn(async (_u: unknown, init?: { body?: unknown }) => {
      recordBody(init?.body);
      return new Response('{}', { status: 200 });
    }));
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
    await initWithLanding();
    providerPageview('/pricing');
    await new Promise((r) => setTimeout(r, 50));

    const first = events().filter((e) => e.event === '$pageview');
    expect(first).toHaveLength(1);
    expect(first[0]!.properties.utm_source).toBe('newsletter');
    expect('utm_term' in first[0]!.properties).toBe(false);
    expect('utm_content' in first[0]!.properties).toBe(false);
    expect(String(first[0]!.properties.$current_url)).toMatch(/\/pricing$/);

    // simulated client-side navigation
    window.history.pushState({}, '', '/dashboard');
    providerPageview('/dashboard');
    posthog.capture('custom_event', { x: 1 });
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
});
