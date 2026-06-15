/**
 * pareto — pure Pareto-derivation unit tests (DASHBOARD_PERSONAS_REVIEW_001 P0, v1).
 *
 * Locks the LSS headline math: total observed time = mean × runs, descending
 * bars, an honest cumulative-% curve, vital-few (80/20) marking, exclusion of
 * workflows without measurable cycle time, and the honest variation strip
 * (real signals only, gated at runs ≥ 2).
 *
 * Environment: Vitest (node) — no jsdom. Derivations are pure + deterministic.
 */

import { describe, it, expect } from 'vitest';
import {
  derivePareto,
  deriveVariationStrip,
  DEFAULT_VITAL_FEW_PCT,
  type ParetoWorkflowInput,
} from './pareto.js';

function wf(
  id: string,
  avgTimeMs: number | null,
  runs: number | null,
  variantCount?: number | null,
): ParetoWorkflowInput {
  // exactOptionalPropertyTypes: only set variantCount when an arg was provided.
  return {
    id,
    title: `WF ${id}`,
    avgTimeMs,
    runs,
    ...(variantCount !== undefined ? { variantCount } : {}),
  };
}

describe('derivePareto — total observed time + ordering', () => {
  it('computes totalObservedMs = avgTimeMs × runs', () => {
    const r = derivePareto([wf('a', 1000, 5)]);
    expect(r.bars[0]?.totalObservedMs).toBe(5000);
    expect(r.bars[0]?.avgTimeMs).toBe(1000);
    expect(r.bars[0]?.runs).toBe(5);
  });

  it('sorts bars by total observed time descending', () => {
    const r = derivePareto([
      wf('small', 100, 2), // 200
      wf('big', 1000, 10), // 10000
      wf('mid', 500, 4), // 2000
    ]);
    expect(r.bars.map((b) => b.id)).toEqual(['big', 'mid', 'small']);
  });

  it('breaks ties deterministically by id ascending', () => {
    const r = derivePareto([wf('zeta', 100, 10), wf('alpha', 100, 10)]); // both 1000
    expect(r.bars.map((b) => b.id)).toEqual(['alpha', 'zeta']);
  });

  it('is deterministic — repeated calls on the same input are byte-identical', () => {
    const input = [wf('a', 1000, 5), wf('b', 800, 3), wf('c', 2000, 1)];
    expect(JSON.stringify(derivePareto(input))).toBe(JSON.stringify(derivePareto(input)));
  });
});

describe('derivePareto — exclusion + honesty', () => {
  it('excludes workflows with null/zero avgTimeMs or zero runs', () => {
    const r = derivePareto([
      wf('ok', 1000, 3),
      wf('no-time', null, 5),
      wf('no-runs', 1000, 0),
      wf('zero-time', 0, 4),
      wf('null-runs', 500, null),
    ]);
    expect(r.bars.map((b) => b.id)).toEqual(['ok']);
    expect(r.excludedCount).toBe(4);
  });

  it('grandTotalMs is the sum of included totals only', () => {
    const r = derivePareto([wf('a', 1000, 2), wf('b', 1000, 3), wf('skip', null, 9)]);
    expect(r.grandTotalMs).toBe(2000 + 3000);
  });
});

describe('derivePareto — cumulative % + vital few (80/20)', () => {
  it('cumulative % is a running share reaching 100% at the last bar', () => {
    const r = derivePareto([wf('a', 1000, 8), wf('b', 1000, 1), wf('c', 1000, 1)]); // 8000/1000/1000 = 10000
    expect(r.bars[0]?.sharePct).toBeCloseTo(80, 5);
    expect(r.bars[0]?.cumulativePct).toBeCloseTo(80, 5);
    expect(r.bars[1]?.cumulativePct).toBeCloseTo(90, 5);
    expect(r.bars[2]?.cumulativePct).toBeCloseTo(100, 5);
  });

  it('marks the vital few = leading run up to the first bar reaching the threshold', () => {
    // 80 / 10 / 10 → first bar alone reaches 80% → vitalFewCount === 1
    const r = derivePareto([wf('a', 1000, 8), wf('b', 1000, 1), wf('c', 1000, 1)]);
    expect(r.vitalFewCount).toBe(1);
    expect(r.bars[0]?.isVitalFew).toBe(true);
    expect(r.bars[1]?.isVitalFew).toBe(false);
    expect(r.bars[2]?.isVitalFew).toBe(false);
  });

  it('uses 80 as the default vital-few threshold', () => {
    const r = derivePareto([wf('a', 1, 1)]);
    expect(r.vitalFewThresholdPct).toBe(DEFAULT_VITAL_FEW_PCT);
    expect(DEFAULT_VITAL_FEW_PCT).toBe(80);
  });

  it('honors a custom threshold', () => {
    // 50/30/20: at 50% threshold the first bar already reaches it → vital few = 1
    const r = derivePareto([wf('a', 1000, 5), wf('b', 1000, 3), wf('c', 1000, 2)], {
      vitalFewThresholdPct: 50,
    });
    expect(r.vitalFewCount).toBe(1);
  });

  it('classic 80/20: a few big workflows carry most of the total', () => {
    // two big (40% each = 80%) + four small (5% each = 20%)
    const r = derivePareto([
      wf('big1', 1000, 40),
      wf('big2', 1000, 40),
      wf('s1', 1000, 5),
      wf('s2', 1000, 5),
      wf('s3', 1000, 5),
      wf('s4', 1000, 5),
    ]);
    // grand total = 100000; first two reach exactly 80%
    expect(r.bars[1]?.cumulativePct).toBeCloseTo(80, 5);
    expect(r.vitalFewCount).toBe(2);
  });

  it('truncates rendered bars to maxBars but keeps cumulative % honest over all', () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      wf(`w${String(i).padStart(2, '0')}`, 1000, 15 - i),
    );
    const r = derivePareto(many, { maxBars: 5 });
    expect(r.bars).toHaveLength(5);
    // last rendered bar's cumulative % < 100 (the tail beyond maxBars remains)
    expect(r.bars[4]?.cumulativePct).toBeLessThan(100);
  });

  it('empty input → no bars, zero totals, zero vital few', () => {
    const r = derivePareto([]);
    expect(r.bars).toHaveLength(0);
    expect(r.grandTotalMs).toBe(0);
    expect(r.vitalFewCount).toBe(0);
  });
});

describe('deriveVariationStrip — real signals only, honest gating', () => {
  it('reports variant count ONLY for workflows with runs >= 2', () => {
    const r = deriveVariationStrip([
      wf('multi', 1000, 5, 3),
      wf('single', 1000, 1, 9), // single run → variantCount null (honest)
    ]);
    const multi = r.items.find((i) => i.id === 'multi');
    const single = r.items.find((i) => i.id === 'single');
    expect(multi?.variantCount).toBe(3);
    expect(single?.variantCount).toBeNull();
    expect(r.multiRunCount).toBe(1);
  });

  it('variant spread reflects min/max across measurable workflows', () => {
    const r = deriveVariationStrip([
      wf('a', 1000, 3, 2),
      wf('b', 1000, 4, 5),
      wf('c', 1000, 1, 9), // excluded (single run)
    ]);
    expect(r.variantSpread).toEqual({ min: 2, max: 5 });
  });

  it('variant spread is null when no measurable variant data exists', () => {
    const r = deriveVariationStrip([wf('a', 1000, 1, 4), wf('b', 1000, 3, null)]);
    expect(r.variantSpread).toBeNull();
  });

  it('cycle-time spread reflects min/max observed mean cycle time', () => {
    const r = deriveVariationStrip([wf('a', 500, 2), wf('b', 3000, 2), wf('c', 1500, 2)]);
    expect(r.cycleSpreadMs).toEqual({ min: 500, max: 3000 });
  });

  it('cycle-time spread is null with fewer than 2 measurable means', () => {
    const r = deriveVariationStrip([wf('a', 500, 2), wf('b', null, 5)]);
    expect(r.cycleSpreadMs).toBeNull();
  });

  it('items are sorted by id ascending (stable rendering)', () => {
    const r = deriveVariationStrip([wf('z', 1, 2), wf('a', 1, 2), wf('m', 1, 2)]);
    expect(r.items.map((i) => i.id)).toEqual(['a', 'm', 'z']);
  });
});
