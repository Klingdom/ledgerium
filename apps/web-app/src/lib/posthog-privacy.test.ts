/** Row #375 — unit tests of the PostHog before_send privacy hook. */
import { describe, it, expect } from 'vitest';
import type { CaptureResult } from 'posthog-js';
import { readdirSync, existsSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sanitizePostHogEvent, stripQueryAndFragment, templatePath,
  ROUTE_PATTERNS, DYNAMIC_ROUTE_DECISIONS, SANITIZED_CAMPAIGN_KEYS,
} from './posthog-privacy';

const evt = (properties: Record<string, unknown>, extra: Partial<CaptureResult> = {}): CaptureResult => ({
  uuid: 'u', event: '$pageview', properties, ...extra,
});

describe('sanitizePostHogEvent (#375)', () => {
  it('drops at-sign utm values (plain and nested-encoded), keeps clean ones', () => {
    const out = sanitizePostHogEvent(evt({
      utm_source: 'newsletter',
      utm_term: 'john@example.com',
      utm_content: 'jane%2540corp.com',
      utm_campaign: 'a%40b.co',
    }));
    expect(out!.properties).toEqual({ utm_source: 'newsletter' });
  });

  it('strips query and fragment from $current_url', () => {
    const out = sanitizePostHogEvent(evt({
      $current_url: 'https://app.test/pricing?utm_source=newsletter&utm_term=john%40example.com#frag',
    }));
    expect(out!.properties!.$current_url).toBe('https://app.test/pricing');
  });

  it('strips query from $referrer and $initial_referrer, and from other URL-valued/URL-keyed props', () => {
    const out = sanitizePostHogEvent(evt({
      $referrer: 'https://other.example/search?q=me%40x.com',
      $initial_referrer: 'https://other.example/a?e=x@y.z',
      $initial_current_url: 'https://app.test/?utm_term=a@b.c',
      $session_entry_url: 'https://app.test/p?x=1',
      custom_link: 'https://app.test/x?mail=a@b.c',
      $pathname: '/pricing',
      $referring_domain: 'other.example',
    }));
    expect(out!.properties).toEqual({
      $referrer: 'https://other.example/search',
      $initial_referrer: 'https://other.example/a',
      $initial_current_url: 'https://app.test/',
      $session_entry_url: 'https://app.test/p',
      custom_link: 'https://app.test/x',
      $pathname: '/pricing',
      $referring_domain: 'other.example',
    });
  });

  it('leaves $direct referrer and unrelated props untouched', () => {
    const out = sanitizePostHogEvent(evt({ $referrer: '$direct', path: '/pricing', n: 3 }));
    expect(out!.properties).toEqual({ $referrer: '$direct', path: '/pricing', n: 3 });
  });

  it('sanitizes $initial_utm_*, $session_entry_utm_* and utm_* in $set / $set_once', () => {
    const out = sanitizePostHogEvent(evt({
      $session_entry_utm_term: 'john@example.com',
      $session_entry_utm_source: 'news',
    }, {
      $set: { utm_term: 'john@example.com', plan: 'free' },
      $set_once: {
        $initial_utm_term: 'john@example.com',
        $initial_utm_content: 'jane%2540corp.com',
        $initial_utm_source: 'newsletter',
        $initial_current_url: 'https://app.test/pricing?utm_term=john%40example.com',
        $initial_referrer: 'https://o.example/?e=a@b.c',
      },
    }));
    expect(out!.properties).toEqual({ $session_entry_utm_source: 'news' });
    expect(out!.$set).toEqual({ plan: 'free' });
    expect(out!.$set_once).toEqual({
      $initial_utm_source: 'newsletter',
      $initial_current_url: 'https://app.test/pricing',
      $initial_referrer: 'https://o.example/',
    });
  });

  it('does not mutate its input, handles null and missing bags', () => {
    const input = evt({ utm_term: 'a@b.c', $current_url: 'https://x.test/?q=1' });
    const snapshot = JSON.stringify(input);
    sanitizePostHogEvent(input);
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(sanitizePostHogEvent(null)).toBeNull();
    expect(sanitizePostHogEvent({ uuid: 'u', event: 'e', properties: {} })).toEqual({ uuid: 'u', event: 'e', properties: {} });
  });

  it('stripQueryAndFragment handles fragment-only and no-suffix strings', () => {
    expect(stripQueryAndFragment('https://a.test/p#x@y.z')).toBe('https://a.test/p');
    expect(stripQueryAndFragment('https://a.test/p')).toBe('https://a.test/p');
  });

  // ---- #378 ----
  it('strips a root-relative URL under a URL-named key (MR-072 mutant P1) and by value shape', () => {
    const out = sanitizePostHogEvent(evt({
      $pathname_url: '/share/tok123?e=a@b.c',
      page_url: '/x?y=1#z',
      link: '/share/tok?e=a@b.c',
      proto: '//cdn.test/a?b=c',
      plain: '/pricing',
      prose: 'a / b ? c',
    }));
    expect(out!.properties).toEqual({
      $pathname_url: '/share/[token]',
      page_url: '/x',
      link: '/share/[token]',
      proto: '//cdn.test/a',
      plain: '/pricing',
      prose: 'a / b ? c',
    });
  });

  it('recurses into nested objects and arrays; utm keys sanitised at any depth', () => {
    const out = sanitizePostHogEvent(evt({
      meta: { link: 'https://x.test/p?e=a@b.c', deeper: { page_url: '/q?e=a@b.c', utm_term: 'a@b.c', utm_source: 'news' } },
      list: ['https://x.test/p?e=a@b.c', { href: '/s?t=1' }, ['/z?y=2']],
    }));
    expect(out!.properties).toEqual({
      meta: { link: 'https://x.test/p', deeper: { page_url: '/q', utm_source: 'news' } },
      list: ['https://x.test/p', { href: '/s' }, ['/z']],
    });
  });

  it('sanitizes properties.$set / $set_once and event-level $set with nested values', () => {
    const out = sanitizePostHogEvent(evt({
      $set: { landing: 'https://x.test/?e=a@b.c', nested: { u: '/a?e=a@b.c' } },
      $set_once: { arr: ['https://x.test/?e=a@b.c'] },
    }, { $set: { nested: { u: '/a?e=a@b.c' } } }));
    expect(out!.properties).toEqual({
      $set: { landing: 'https://x.test/', nested: { u: '/a' } },
      $set_once: { arr: ['https://x.test/'] },
    });
    expect(out!.$set).toEqual({ nested: { u: '/a' } });
  });

  it('survives circular references without looping (cycle dropped), shared refs kept', () => {
    const a: Record<string, unknown> = { name: 'a' };
    a.self = a;
    const shared = { u: 'https://x.test/?q=1' };
    const out = sanitizePostHogEvent(evt({ a, s1: shared, s2: shared }));
    expect(out!.properties).toEqual({ a: { name: 'a' }, s1: { u: 'https://x.test/' }, s2: { u: 'https://x.test/' } });
  });

  it('leaves non-string values (numbers, booleans, null, Date) untouched', () => {
    const d = new Date(0);
    const out = sanitizePostHogEvent(evt({ n: 1, b: true, z: null, d, nested: { n: 2, arr: [1, false, null] } }));
    expect(out!.properties).toEqual({ n: 1, b: true, z: null, d, nested: { n: 2, arr: [1, false, null] } });
    expect(out!.properties!.d).toBe(d);
  });

  it('does not mutate nested input', () => {
    const input = evt({ meta: { link: 'https://x.test/?q=a@b.c' }, list: ['/a?b=1'] });
    const snap = JSON.stringify(input);
    sanitizePostHogEvent(input);
    expect(JSON.stringify(input)).toBe(snap);
  });
});

describe('#385 inputs the value-shape regex does not catch', () => {
  const props = (p: Record<string, unknown>) => sanitizePostHogEvent(evt(p))!.properties!;

  // Kills MR-072 mutant P1 (URL-key branch never fires): none of these match the value-shape
  // regexes (not absolute, not root-relative), so only the key can make them be treated as URLs.
  it('strips a schemeless value under a URL key (kills the URL-key mutant)', () => {
    expect(props({ page_url: 'app.test/p?e=a@b.c' })).toEqual({ page_url: 'app.test/p' });
    expect(props({ $referrer: 'mail.test/inbox/john@example.com?x=1' })).toEqual({ $referrer: 'mail.test/inbox/[email]' });
    expect(props({ pageHref: 'app.test/share/tok#frag' })).toEqual({ pageHref: 'app.test/share/[token]' });
    expect(props({ link_url: 'share/tok?x=1' })).toEqual({ link_url: 'share/[token]' });
  });

  it('strips an http:// value under a non-URL key', () => {
    expect(props({ dest: 'http://x.test/p?e=a@b.c' })).toEqual({ dest: 'http://x.test/p' });
    expect(props({ dest: 'HTTP://x.test/share/tok' })).toEqual({ dest: 'HTTP://x.test/share/[token]' });
  });

  it('strips a fragment-only root-relative value', () => {
    expect(props({ next: '/a#e=a@b.c' })).toEqual({ next: '/a' });
  });

  it('drops userinfo from the authority', () => {
    expect(props({ x: 'https://john:pw@app.test/p' })).toEqual({ x: 'https://app.test/p' });
    expect(props({ u: '//john@app.test/p' })).toEqual({ u: '//app.test/p' });
  });

  it('depth: 13-level object is cut (nothing below the cap survives), 11-level survives sanitised', () => {
    const chain = (levels: number, leaf: unknown): Record<string, unknown> => {
      let node: unknown = leaf;
      for (let i = 0; i < levels; i++) node = { n: node };
      return node as Record<string, unknown>;
    };
    const deep = props({ a: chain(13, { u: 'https://x.test/share/SECRETTOKEN?e=a@b.c' }) });
    expect(JSON.stringify(deep)).not.toMatch(/SECRETTOKEN|a@b\.c/);
    // The cap drops, not just cleans: a harmless marker below it must be gone too (kills a missing cap).
    expect(JSON.stringify(props({ a: chain(13, { marker: 'DEEP_MARKER' }) }))).not.toContain('DEEP_MARKER');
    const shallow = props({ a: chain(10, { page_url: 'https://x.test/share/SECRETTOKEN?e=a@b.c' }) });
    expect(JSON.stringify(shallow)).toContain('https://x.test/share/[token]');
    expect(JSON.stringify(shallow)).not.toMatch(/SECRETTOKEN|a@b\.c/);
  });
});

describe('templatePath / route templating (#385)', () => {
  it('a path-named key templates a path with no leading slash (kills a missing path-key branch)', () => {
    const out = sanitizePostHogEvent(evt({ path: 'share/shrTOKENnoSlash', $pathname: 'share/shrTOKENnoSlash?e=a@b.c' }))!;
    expect(out.properties['path']).toBe('share/[token]');
    expect(out.properties['$pathname']).toBe('share/[token]');
  });

  it('templates the share token in every field PostHog fills, and in person properties', () => {
    const url = 'https://app.test/share/shrTOKEN9f8e7d6c5b4a';
    const out = sanitizePostHogEvent(evt({
      $current_url: url, $pathname: '/share/shrTOKEN9f8e7d6c5b4a', path: '/share/shrTOKEN9f8e7d6c5b4a',
      $session_entry_url: url, $session_entry_pathname: '/share/shrTOKEN9f8e7d6c5b4a',
      $prev_pageview_pathname: '/share/shrTOKEN9f8e7d6c5b4a',
      $prev_pageview_url: url, $initial_referrer: url,
    }, {
      $set_once: { $initial_current_url: url, $initial_pathname: '/share/shrTOKEN9f8e7d6c5b4a' },
      $set: { $current_url: url },
    }))!;
    expect(JSON.stringify(out)).not.toContain('shrTOKEN');
    expect(out.properties!.$current_url).toBe('https://app.test/share/[token]');
    expect(out.properties!.$pathname).toBe('/share/[token]');
    expect(out.properties!.path).toBe('/share/[token]');
    expect(out.properties!.$session_entry_pathname).toBe('/share/[token]');
    expect(out.properties!.$prev_pageview_pathname).toBe('/share/[token]');
    expect(out.$set_once).toEqual({
      $initial_current_url: 'https://app.test/share/[token]', $initial_pathname: '/share/[token]',
    });
  });

  it('secret routes collapse the tail, match any host / position / case / encoding / dot-segments', () => {
    expect(templatePath('/share/tok/extra/more')).toBe('/share/[token]');
    expect(templatePath('/SHARE/tok')).toBe('/SHARE/[token]');
    expect(templatePath('/%73hare/tok')).toBe('/%73hare/[token]');
    expect(templatePath('/x/../share/tok')).toBe('/share/[token]');
    expect(templatePath('//share///tok')).toBe('/share/[token]');
    expect(templatePath('/app/share/tok')).toBe('/app/share/[token]');
    expect(templatePath('/api/share/tok')).toBe('/api/share/[token]');
    expect(templatePath('/share')).toBe('/share');
    expect(templatePath('/share/')).toBe('/share/');
  });

  it('id routes keep the tail; /teams/join stays a static page', () => {
    expect(templatePath('/workflows/cm1abc')).toBe('/workflows/[id]');
    expect(templatePath('/analytics/process/cm1abc')).toBe('/analytics/process/[id]');
    expect(templatePath('/teams/cm1abc')).toBe('/teams/[id]');
    expect(templatePath('/teams/join')).toBe('/teams/join');
    expect(templatePath('/teams/JOIN')).toBe('/teams/JOIN');
    expect(templatePath('/api/teams/t1/invite/i1')).toBe('/api/teams/[id]/invite/[inviteId]');
    expect(templatePath('/api/teams/t1/members/m1')).toBe('/api/teams/[id]/members/[memberId]');
    expect(templatePath('/api/workflows/w1/export-json')).toBe('/api/workflows/[id]/export-json');
    expect(templatePath('/workflows')).toBe('/workflows');
  });

  it('leaves public slugs and static pages alone', () => {
    for (const p of ['/', '/pricing', '/blog/what-is-process-intelligence', '/compare/scribe', '/software/excel', '/teams', '/api/auth/callback/google']) {
      expect(templatePath(p)).toBe(p);
    }
  });

  it('replaces email-shaped segments (plain and percent-encoded, even multi-encoded) with [email]', () => {
    expect(templatePath('/inbox/john@example.com')).toBe('/inbox/[email]');
    expect(templatePath('/inbox/john%40example.com/x')).toBe('/inbox/[email]/x');
    expect(templatePath('/u/jane%252540corp.com')).toBe('/u/[email]');
    expect(templatePath('/@handle')).toBe('/@handle');
  });

  it('is pure and idempotent', () => {
    const p = '/share/abc';
    expect(templatePath(templatePath(p))).toBe('/share/[token]');
    expect(p).toBe('/share/abc');
    const input = evt({ $current_url: 'https://a.test/share/abc' });
    const snap = JSON.stringify(input);
    const once = sanitizePostHogEvent(input)!;
    expect(JSON.stringify(input)).toBe(snap);
    expect(sanitizePostHogEvent(once)).toEqual(once);
  });

  it('referrers: email path templated, mailto reduced, bare email under a URL key redacted', () => {
    const out = sanitizePostHogEvent(evt({
      $referrer: 'https://mail.example/inbox/john@example.com?u=john%40example.com',
      $initial_referrer: 'https://other.example/share/tok#x',
      href: 'mailto:john@example.com?subject=hi',
      from_url: 'john@example.com',
    }))!.properties!;
    expect(out).toEqual({
      $referrer: 'https://mail.example/inbox/[email]',
      $initial_referrer: 'https://other.example/share/[token]',
      href: 'mailto:[email]',
      from_url: '[email]',
    });
  });

  it('a bare root-relative value under an arbitrary key is templated too', () => {
    expect(sanitizePostHogEvent(evt({ dest: '/share/tok', prose: '/ not a path' }))!.properties)
      .toEqual({ dest: '/share/[token]', prose: '/ not a path' });
  });
});

describe('dynamic route enumeration is complete (#385)', () => {
  const appDir = fileURLToPath(new URL('../app', import.meta.url));

  /** Key of every `[param]` route under src/app: path (groups removed) up to the last dynamic segment. */
  function discover(): Set<string> {
    const found = new Set<string>();
    const walk = (dir: string): void => {
      const entries = readdirSync(dir, { withFileTypes: true });
      if (entries.some((e) => e.isFile() && /^(page|route)\.(tsx?|jsx?)$/.test(e.name))) {
        const segs = dir.slice(appDir.length).split(sep).filter((s) => s && !/^\(.*\)$/.test(s));
        let last = -1;
        segs.forEach((s, i) => { if (s.startsWith('[')) last = i; });
        if (last >= 0) found.add(segs.slice(0, last + 1).join('/'));
      }
      for (const e of entries) if (e.isDirectory()) walk(join(dir, e.name));
    };
    walk(appDir);
    return found;
  }

  it('every [param] route folder in src/app has a recorded decision, and no decision is stale', () => {
    expect(existsSync(appDir)).toBe(true);
    const found = discover();
    expect(found.size).toBeGreaterThan(20);
    expect([...found].sort()).toEqual(Object.keys(DYNAMIC_ROUTE_DECISIONS).sort());
  });

  it('secret and id routes are templated by a pattern; public slugs and no-secret routes are not', () => {
    for (const [route, decision] of Object.entries(DYNAMIC_ROUTE_DECISIONS)) {
      const sample = `/${route.replace(/\[\.\.\.\w+\]/g, 'x').replace(/\[\w+\]/g, 'SAMPLE123')}`;
      const out = templatePath(sample);
      if (decision === 'secret' || decision === 'id') {
        expect(out, route).not.toContain('SAMPLE123');
        expect(out, route).toMatch(/\[\w+\]/);
      } else {
        expect(out, route).toBe(sample);
      }
    }
  });

  it('every ROUTE_PATTERN secret route is decided as secret, and vice versa for existing routes', () => {
    const secretKeys = Object.entries(DYNAMIC_ROUTE_DECISIONS).filter(([, d]) => d === 'secret').map(([k]) => `/${k.replace(/\[(\w+)\]/g, ':$1')}`);
    for (const k of secretKeys) expect(ROUTE_PATTERNS.some((p) => p.pattern === k && p.secret), k).toBe(true);
  });
});

describe('campaign keys gad_source / mc_cid are sanitized like utm_* (#410)', () => {
  const long = 'g'.repeat(90);
  const forms = (k: string) => [k, `$initial_${k}`, `$session_entry_${k}`];

  for (const k of SANITIZED_CAMPAIGN_KEYS) {
    for (const key of forms(k)) {
      it(`${key}: email dropped, 90 chars -> 64, clean kept (properties, $set, $set_once)`, () => {
        const out = sanitizePostHogEvent(evt(
          { [key]: 'bob@example.org', [`x${key}`]: 'kept' },
          { $set: { [key]: 'bob%40example.org', plan: 'free' }, $set_once: { [key]: long } },
        ));
        expect(out!.properties).toEqual({ [`x${key}`]: 'kept' });
        expect(out!.$set).toEqual({ plan: 'free' });
        expect(out!.$set_once).toEqual({ [key]: 'g'.repeat(64) });
        const clean = sanitizePostHogEvent(evt({ [key]: 'abc123' }, { $set_once: { [key]: 'abc123' } }));
        expect(clean!.properties).toEqual({ [key]: 'abc123' });
        expect(clean!.$set_once).toEqual({ [key]: 'abc123' });
        const nonString = sanitizePostHogEvent(evt({ [key]: 12 }));
        expect(nonString!.properties).toEqual({});
      });
    }
  }

  it('every free-text campaign key in posthog-js\'s own list is sanitized here or masked by posthog-js', async () => {
    const { createRequire } = await import('node:module');
    const req = createRequire(import.meta.url);
    const ph = req('posthog-js/lib/src/utils/event-utils.js') as {
      CAMPAIGN_PARAMS: string[]; PERSONAL_DATA_CAMPAIGN_PARAMS: string[];
    };
    expect(ph.CAMPAIGN_PARAMS.length).toBeGreaterThan(20);
    for (const key of ph.CAMPAIGN_PARAMS) {
      if (ph.PERSONAL_DATA_CAMPAIGN_PARAMS.includes(key)) continue; // masked by posthog-js
      if (key.startsWith('utm_')) continue; // utm rule
      expect(SANITIZED_CAMPAIGN_KEYS as readonly string[], `unhandled posthog-js campaign key ${key}`).toContain(key);
    }
  });
});
