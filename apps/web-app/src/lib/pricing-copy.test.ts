/**
 * Row #305 (+ #34): every pricing / checkout statement is true today, with no
 * lapsed date; Starter's health-score copy agrees with lib/plans.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { PLAN_FEATURES } from '@/lib/plans';
import { PRICING_CONFIG } from '@/lib/config';

/**
 * Deterministic "today". A fixed constant keeps the assertion free of wall-clock
 * reads (Ledgerium determinism rule). Trade-off: it only catches dates lapsed as
 * of this value, so bump it when touching pricing copy (or set
 * COPY_DATE_REFERENCE=YYYY-MM-DD in CI to inject the build date).
 */
const REFERENCE_DATE = process.env.COPY_DATE_REFERENCE ?? '2026-10-02';

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const DATE_RE =
  /(Q([1-4])\s*(20\d{2}))|\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.?\s+(?:of\s+)?(20\d{2})\b/g;
/** Retrospective phrasing ("as of July 2026") states a past fact, not a promise. */
const RETROSPECTIVE_RE = /(as of|last updated|updated|verified)\s*$/i;

/** First day AFTER the named period, as an ISO date. */
function periodEndExclusive(m: RegExpExecArray): string {
  if (m[1]) {
    const q = Number(m[2]);
    const y = Number(m[3]);
    return q === 4 ? `${y + 1}-01-01` : `${y}-${String((q * 3) + 1).padStart(2, '0')}-01`;
  }
  const mi = MONTHS.findIndex((n) => n.startsWith(m[4]!.toLowerCase().slice(0, 3)));
  const y = Number(m[5]);
  return mi === 11 ? `${y + 1}-01-01` : `${y}-${String(mi + 2).padStart(2, '0')}-01`;
}

export function findLapsedDates(text: string, referenceIso: string): string[] {
  const hits: string[] = [];
  for (const m of text.matchAll(DATE_RE)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 16), m.index ?? 0);
    if (RETROSPECTIVE_RE.test(before)) continue;
    if (periodEndExclusive(m as RegExpExecArray) <= referenceIso) hits.push(m[0]);
  }
  return hits;
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

describe('findLapsedDates (injectable reference date)', () => {
  it('flags a quarter that ended before the reference date', () => {
    expect(findLapsedDates('launching Q3 2026', '2026-10-02')).toEqual(['Q3 2026']);
  });
  it('does not flag the same quarter while it is still running', () => {
    expect(findLapsedDates('launching Q3 2026', '2026-09-30')).toEqual([]);
  });
  it('flags a past month+year, not the current or a future one', () => {
    expect(findLapsedDates('ships in August 2026', '2026-10-02')).toEqual(['August 2026']);
    expect(findLapsedDates('ships October 2026', '2026-10-02')).toEqual([]);
    expect(findLapsedDates('ships in Q1 2027', '2026-10-02')).toEqual([]);
  });
  it('handles Q4 / December rollover', () => {
    expect(findLapsedDates('Q4 2026', '2027-01-01')).toEqual(['Q4 2026']);
    expect(findLapsedDates('December 2026', '2026-12-31')).toEqual([]);
  });
  it('exempts retrospective "as of / last updated" phrasing', () => {
    expect(findLapsedDates('As of July 2026, X is Y', '2026-10-02')).toEqual([]);
  });
});

describe('#305: no lapsed quarter / month in user-facing pricing + public copy', () => {
  it('scans a non-trivial file set', () => {
    expect(SCANNED.length).toBeGreaterThan(10);
  });
  for (const file of SCANNED) {
    it(`${path.relative(SRC, file).split(path.sep).join('/')} names no lapsed date`, () => {
      expect(findLapsedDates(readFileSync(file, 'utf8'), REFERENCE_DATE)).toEqual([]);
    });
  }
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
