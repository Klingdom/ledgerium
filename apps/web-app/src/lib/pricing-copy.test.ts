/**
 * Row #305 (+ #34, #310): every pricing / security statement is true today, and
 * public copy cannot carry a forward-dated promise; Starter's health-score copy
 * agrees with lib/plans.ts.
 *
 * The date rule is CLOCK-FREE. The earlier version compared copy to a fixed
 * reference date, so it only caught dates already lapsed on the day someone last
 * bumped the constant. A promise to ship "in Q1 2027" is wrong the moment it is
 * written (it commits the company to a date the code does not know), so the rule
 * rejects the promise itself, whatever the date.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { PLAN_FEATURES } from '@/lib/plans';
import { PRICING_CONFIG } from '@/lib/config';

const MONTH =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
/** A dated point or period: "Q3 2026", "H1 2027", "October 2026", or a bare year. */
const DATE_TOKEN = String.raw`(?:[QH][1-4]\s*(?:of\s+)?20\d{2}|${MONTH}\.?\s+(?:of\s+)?20\d{2}|\b20\d{2}\b(?!-\d))`;
/** Verbs that promise something will exist or happen. */
const PROMISE_VERB =
  '(?:launch(?:ing|es)?|coming|available|ships?|shipping|arriv(?:e|es|ing)|rolling out|releas(?:e|es|ing)|goes? live|planned|expected|scheduled)';

/** Verb, then up to 40 non-sentence characters, then a date token. */
const PROMISE_RE = new RegExp(String.raw`\b${PROMISE_VERB}\b[^.\n]{0,40}?${DATE_TOKEN}`, 'gi');
/** A quarter / half-year is a delivery period, never a fact: flag it wherever it stands. */
const PERIOD_RE = /\b[QH][1-4]\s*(?:of\s+)?20\d{2}\b/gi;
/** Retrospective phrasing ("as of July 2026") states a past fact, not a promise. */
const RETROSPECTIVE_RE = /(as of|last updated|updated|verified)\s*$/i;

export interface AllowedDatedCopy {
  /** Exact matched snippet that is permitted. */
  text: string;
  /** Person/role accountable for keeping it true. */
  owner: string;
  /** Why a dated statement is acceptable here. */
  reason: string;
}

/**
 * Explicit exceptions. Every entry needs an owner and a reason, and the test
 * below fails if an entry no longer matches anything (so it cannot rot).
 * Empty on purpose: no public copy today needs one.
 */
export const ALLOWED_DATED_COPY: readonly AllowedDatedCopy[] = [];

/** Forward-dated promises in `text`, minus allowlisted snippets. No clock is read. */
export function findForwardDatedPromises(
  text: string,
  allowlist: readonly AllowedDatedCopy[] = ALLOWED_DATED_COPY,
): string[] {
  const hits = new Set<string>();
  for (const re of [PROMISE_RE, PERIOD_RE]) {
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      if (RETROSPECTIVE_RE.test(text.slice(Math.max(0, start - 16), start))) continue;
      hits.add(m[0]);
    }
  }
  return [...hits].filter((h) => !allowlist.some((a) => a.text === h));
}

const SRC = path.resolve(__dirname, '..');
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e) && !/\.test\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}
const rel = (...p: string[]) => path.join(SRC, ...p);
const SCANNED = [
  rel('components', 'PricingCards.tsx'),
  rel('app', 'api', 'billing', 'checkout', 'route.ts'),
  rel('lib', 'checkout-error.ts'),
  rel('lib', 'config.ts'),
  ...walk(rel('app', '(public)')),
];

describe('findForwardDatedPromises (clock-free)', () => {
  it('flags the restored Q3 2026 promise strings', () => {
    expect(findForwardDatedPromises('Multi-user invites are launching Q3 2026.')).not.toEqual([]);
    expect(findForwardDatedPromises('arrive with the Q3 2026 multi-user release')).not.toEqual([]);
  });
  it('flags a future-dated promise regardless of the date', () => {
    expect(findForwardDatedPromises('SSO is coming in March 2031')).not.toEqual([]);
    expect(findForwardDatedPromises('Audit trail available by 2029')).not.toEqual([]);
    expect(findForwardDatedPromises('On-prem ships in H1 2027')).not.toEqual([]);
  });
  it('does not flag undated promises or retrospective phrasing', () => {
    expect(findForwardDatedPromises('SSO — coming soon')).toEqual([]);
    expect(findForwardDatedPromises('As of July 2026, X is Y')).toEqual([]);
    expect(findForwardDatedPromises('Annual billing saves 17%')).toEqual([]);
  });
  it('honours an allowlist entry (and only that exact snippet)', () => {
    const allow = [{ text: 'coming in March 2031', owner: 'pm', reason: 'contractual' }];
    expect(findForwardDatedPromises('SSO is coming in March 2031', allow)).toEqual([]);
    expect(findForwardDatedPromises('SSO is coming in April 2031', allow)).not.toEqual([]);
  });
  it('every allowlist entry has an owner and a reason', () => {
    for (const a of ALLOWED_DATED_COPY) {
      expect(a.owner.trim()).not.toBe('');
      expect(a.reason.trim()).not.toBe('');
    }
  });
});

describe('#305/#310: no forward-dated promise in user-facing pricing, security + public copy', () => {
  it('scans a non-trivial file set', () => {
    expect(SCANNED.length).toBeGreaterThan(10);
  });
  for (const file of SCANNED) {
    it(`${path.relative(SRC, file).split(path.sep).join('/')} promises no date`, () => {
      expect(findForwardDatedPromises(readFileSync(file, 'utf8'))).toEqual([]);
    });
  }
  it('every allowlist entry still matches something (no stale exceptions)', () => {
    const all = SCANNED.map((f) => readFileSync(f, 'utf8')).join('\n');
    for (const a of ALLOWED_DATED_COPY) expect(all).toContain(a.text);
  });
});

describe('#34: Starter health-score copy agrees with lib/plans.ts', () => {
  const pageSrc = readFileSync(rel('app', '(public)', 'pricing', 'page.tsx'), 'utf8');
  const listsHealthScores = (id: string) =>
    PRICING_CONFIG.plans.find((p) => p.id === id)!.features.some((f) => /health scores?/i.test(f));

  it('Starter and Free card feature lists match the healthScores entitlement', () => {
    expect(PLAN_FEATURES.starter.features.healthScores).toBe(true);
    expect(PLAN_FEATURES.free.features.healthScores).toBe(false);
    expect(listsHealthScores('starter')).toBe(true);
    expect(listsHealthScores('free')).toBe(false);
  });
  it('comparison table row matches the entitlement for free and starter', () => {
    const row = pageSrc.match(/label: 'Process health scores',\s*free: (true|false), starter: (true|false)/);
    expect(row).not.toBeNull();
    expect(row![1] === 'true').toBe(PLAN_FEATURES.free.features.healthScores);
    expect(row![2] === 'true').toBe(PLAN_FEATURES.starter.features.healthScores);
  });
  it('FAQ does not make health scores part of a Team+-only intelligence layer', () => {
    expect(PLAN_FEATURES.starter.features.intelligenceLayer).toBe(false);
    expect(PLAN_FEATURES.solo.features.intelligenceLayer).toBe(true);
    const faq = pageSrc.match(/q: 'What is the intelligence layer\?',\s*a: '([^']*)'/)![1]!;
    expect(faq).not.toMatch(/process health scores\. It turns/);
    expect(faq).toMatch(/Starter includes basic process health scores/);
    expect(faq).toMatch(/Available on Solo and above./);
  });
});
