/**
 * Row #298 — the ingest allowlist is exactly the set of names a browser emits.
 *
 * Row #295 derived the list from the `AnalyticsEvent` union, which also names
 * server-only events and events nothing emits. This test replaces "matches the
 * union" with "matches the emitters": it scans the source for client emitters
 * and asserts equality in both directions, so adding a client event without
 * listing it, or removing the last emitter of a listed name, fails here.
 *
 * What counts as a client emitter (all under apps/web-app/src, tests excluded,
 * comments stripped):
 *  1. `track({ event: 'x', ... })` — every `event: '<literal>'` inside the call's
 *     argument (covers ternaries between two literal payloads).
 *  2. `track(factory(...))` — the literals inside that function's definition.
 *  3. `trackActivation('milestone')` — resolved through the milestone -> name
 *     switch in lib/analytics.ts, and only for milestones something calls.
 *  4. `<TrackedLink event="x">` — static attribute only.
 * A `track(...)` call that fits none of these fails the test rather than being
 * silently missed; the one known pass-through (TrackedLink) is named below.
 * Also followed or failed loudly (#302): `import { track as t }` (the alias is
 * scanned), `obj.track(...)` (always unresolved), `trackActivation(variable)`.
 *
 * Server code (app/api, lib/analytics-server.ts) is not a client emitter. The
 * extension posts to a different endpoint and is out of scope.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ANALYTICS_EVENT_NAMES,
  SERVER_FACT_BOTH_SIDES,
  countsAsServerFact,
  isAllowedAnalyticsEventName,
} from './analytics-event-names';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

/** `track(...)` call sites whose event name is a prop forwarded from callers. */
const KNOWN_PASS_THROUGH = ['components/TrackedLink.tsx'];

/** A name emitted on both sides that is deliberately NOT a "server fact" (see analytics-event-names.ts). */
const BOTH_SIDES_NOT_SERVER_FACT = ['upload_failed'];

interface Source {
  rel: string;
  text: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) out.push(p);
  }
  return out;
}

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
}

function loadSources(): Source[] {
  return walk(SRC).map((p) => ({
    rel: relative(SRC, p).split(sep).join('/'),
    text: stripComments(readFileSync(p, 'utf8')),
  }));
}

/** The text between the parens of the call whose '(' is at `open`. */
function balancedArg(text: string, open: number): string {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return text.slice(open + 1);
}

function literals(text: string): string[] {
  return [...text.matchAll(/event:\s*'([a-z_0-9]+)'/g)].map((m) => m[1]!);
}

function functionBody(sources: Source[], name: string): string | null {
  for (const s of sources) {
    const at = s.text.search(new RegExp(`function\\s+${name}\\b`));
    if (at === -1) continue;
    const end = s.text.indexOf('\n}\n', at);
    return s.text.slice(at, end === -1 ? undefined : end);
  }
  return null;
}

function escapeRe(n: string): string {
  return n.replace(/[$]/g, '\\$&');
}

/** Local names `track` / `trackActivation` are bound to in a file (`import { track as t }`). */
function localNames(text: string, original: string): string[] {
  const out = [original];
  for (const imp of text.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}/g)) {
    for (const m of imp[1]!.matchAll(new RegExp(`\\b${original}\\s+as\\s+([A-Za-z_$][\\w$]*)`, 'g'))) out.push(m[1]!);
  }
  return out;
}

/**
 * Scans `sources` (default: the real tree) for client emitters. Every shape it
 * cannot resolve to a literal name lands in `unresolved`, which the test fails
 * on: aliased imports are followed, `obj.track(` and `trackActivation(variable)`
 * are reported rather than skipped (#302).
 */
function scanClientEmitters(sources: Source[] = loadSources()): { names: Set<string>; unresolved: string[]; dynamicLinks: string[] } {
  const names = new Set<string>();
  const unresolved: string[] = [];
  const dynamicLinks: string[] = [];

  const analytics = sources.find((s) => s.rel === 'lib/analytics.ts');
  const milestoneToName = new Map<string, string>();
  for (const m of analytics?.text.matchAll(/case\s+'(\w+)':\s*track\(\{\s*event:\s*'([a-z_0-9]+)'/g) ?? []) {
    milestoneToName.set(m[1]!, m[2]!);
  }

  for (const s of sources) {
    const isServer = s.rel.startsWith('app/api/') || s.rel === 'lib/analytics-server.ts';
    if (isServer || s.rel === 'lib/analytics.ts') continue;

    const trackNames = localNames(s.text, 'track');
    const activationNames = localNames(s.text, 'trackActivation');

    for (const m of s.text.matchAll(/\.\s*track\s*\(/g)) {
      unresolved.push(`${s.rel}: member call .track( at offset ${m.index} cannot be resolved`);
    }

    for (const name of trackNames) {
      for (const m of s.text.matchAll(new RegExp(`(?<![A-Za-z0-9_.$])${escapeRe(name)}\\(`, 'g'))) {
        const arg = balancedArg(s.text, m.index! + m[0].length - 1);
        if (arg.trim() === '') continue; // prose such as "track() calls"
        const direct = literals(arg);
        if (direct.length > 0) {
          direct.forEach((n) => names.add(n));
          continue;
        }
        const factory = /^\s*([A-Za-z_]\w*)\(/.exec(arg)?.[1];
        const body = factory ? functionBody(sources, factory) : null;
        const viaFactory = body ? literals(body) : [];
        if (viaFactory.length > 0) {
          viaFactory.forEach((n) => names.add(n));
          continue;
        }
        if (!KNOWN_PASS_THROUGH.includes(s.rel)) unresolved.push(`${s.rel}: ${name}(${arg.trim().slice(0, 40)}`);
      }
    }

    for (const name of activationNames) {
      for (const m of s.text.matchAll(new RegExp(`(?<![A-Za-z0-9_.$])(?<!function\\s)${escapeRe(name)}\\(`, 'g'))) {
        const arg = balancedArg(s.text, m.index! + m[0].length - 1);
        const lit = /^\s*'(\w+)'\s*(?:,|$)/.exec(arg)?.[1];
        if (!lit) {
          unresolved.push(`${s.rel}: ${name}(${arg.trim().slice(0, 40)}) has a non-literal milestone`);
          continue;
        }
        const mapped = milestoneToName.get(lit);
        if (mapped) names.add(mapped);
        else unresolved.push(`${s.rel}: ${name}('${lit}') has no milestone mapping`);
      }
    }

    const tags = [...s.text.matchAll(/<TrackedLink\b[\s\S]*?>/g)];
    for (const t of tags) {
      const lit = /\bevent="([a-z_0-9]+)"/.exec(t[0]);
      if (lit) names.add(lit[1]!);
      else dynamicLinks.push(`${s.rel}: ${t[0].slice(0, 40)}`);
    }
  }
  return { names, unresolved, dynamicLinks };
}

function scanServerEmitters(): Set<string> {
  const names = new Set<string>();
  for (const s of loadSources()) {
    for (const m of s.text.matchAll(/\btrackServer\(\s*'([a-z_0-9]+)'/g)) names.add(m[1]!);
  }
  return names;
}

describe('ingest allowlist equals the names a browser emits (row #298)', () => {
  const scan = scanClientEmitters();
  const allowlist = new Set<string>(ANALYTICS_EVENT_NAMES);

  it('the scan is not vacuous', () => {
    expect(scan.names.size).toBeGreaterThan(50);
    for (const n of ['page_viewed', 'upgrade_clicked', 'tag_removed', 'extension_install_clicked', 'first_sop_viewed', 'cta_clicked']) {
      expect(scan.names.has(n), `scanner missed ${n}`).toBe(true);
    }
  });

  it('every track() call is resolvable (or a named pass-through), and every TrackedLink is static', () => {
    expect(scan.unresolved).toEqual([]);
    expect(scan.dynamicLinks).toEqual([]);
  });

  it('the allowlist has no duplicates', () => {
    expect(allowlist.size).toBe(ANALYTICS_EVENT_NAMES.length);
  });

  it('no allowlisted name lacks a client emitter (a removed or server-only event must leave the list)', () => {
    const noEmitter = [...allowlist].filter((n) => !scan.names.has(n)).sort();
    expect(noEmitter).toEqual([]);
  });

  it('no client-emitted name is missing from the allowlist (a new client event must be listed)', () => {
    const missing = [...scan.names].filter((n) => !allowlist.has(n)).sort();
    expect(missing).toEqual([]);
  });

  it('server-only names are rejected, including the ones the union still names', () => {
    const serverOnly = [...scanServerEmitters()].filter((n) => !scan.names.has(n));
    expect(serverOnly.length).toBeGreaterThan(10);
    expect(serverOnly).toEqual(expect.arrayContaining(['subscription_created', 'api_error', 'workflow_uploaded', 'payment_failed']));
    for (const n of serverOnly) expect(isAllowedAnalyticsEventName(n), n).toBe(false);
  });

  it('every name emitted on both sides has been decided: a server fact, or explicitly not', () => {
    const both = [...scanServerEmitters()].filter((n) => scan.names.has(n)).sort();
    const decided = [...SERVER_FACT_BOTH_SIDES, ...BOTH_SIDES_NOT_SERVER_FACT].sort();
    expect(both).toEqual(decided);
  });
});

describe('countsAsServerFact', () => {
  it('drops the client row of a both-sides server fact and keeps everything else', () => {
    expect(countsAsServerFact('signup_completed', 'client')).toBe(false);
    expect(countsAsServerFact('signup_completed', undefined)).toBe(false);
    expect(countsAsServerFact('signup_completed', 'server')).toBe(true);
    expect(countsAsServerFact('page_viewed', 'client')).toBe(true);
    expect(countsAsServerFact('upload_failed', 'client')).toBe(true);
  });
});

describe('emitter scan hardening (row #302)', () => {
  const src = (rel: string, text: string): Source => ({ rel, text: stripComments(text) });
  const analytics = src(
    'lib/analytics.ts',
    "export function trackActivation(m: string) { switch (m) { case 'first_x': track({ event: 'first_x_event' }); } }",
  );
  const scan = (text: string) => scanClientEmitters([analytics, src('components/Fake.tsx', text)]);

  it('baseline: a plain literal call is resolved and nothing is unresolved', () => {
    const r = scan("track({ event: 'a_b' }); trackActivation('first_x');");
    expect([...r.names].sort()).toEqual(['a_b', 'first_x_event']);
    expect(r.unresolved).toEqual([]);
  });

  it('follows `import { track as t }` and resolves t({ event })', () => {
    const r = scan("import { track as t } from '@/lib/analytics';\nt({ event: 'aliased_one' });");
    expect(r.names.has('aliased_one')).toBe(true);
    expect(r.unresolved).toEqual([]);
  });

  it('reports an aliased call it cannot resolve', () => {
    const r = scan("import { track as t } from '@/lib/analytics';\nt(build());");
    expect(r.unresolved.length).toBe(1);
  });

  it('reports obj.track(...) instead of skipping it', () => {
    expect(scan("analytics.track({ event: 'hidden' });").unresolved.length).toBe(1);
  });

  it('reports trackActivation(variable) and an aliased one', () => {
    expect(scan('trackActivation(milestone);').unresolved.length).toBe(1);
    const r = scan("import { trackActivation as ta } from '@/lib/analytics';\nta(m);");
    expect(r.unresolved.length).toBe(1);
  });

  it('resolves an aliased trackActivation with a literal milestone', () => {
    const r = scan("import { trackActivation as ta } from '@/lib/analytics';\nta('first_x');");
    expect(r.names.has('first_x_event')).toBe(true);
    expect(r.unresolved).toEqual([]);
  });
});
