import { describe, it, expect } from 'vitest';
import {
  buildScorecard,
  buildParetoRows,
  consistencyColor,
  cvBand,
  HIGH_VARIANCE_CV_THRESHOLD,
  type ScorecardInput,
  type ParetoVariantInput,
} from './reportScorecard.js';

describe('consistencyColor', () => {
  it('color-codes by CV with the 0.5 engine threshold boundary', () => {
    expect(consistencyColor(0.0)).toBe('green');
    expect(consistencyColor(0.24)).toBe('green');
    expect(consistencyColor(0.25)).toBe('amber');
    expect(consistencyColor(0.5)).toBe('amber');
    expect(consistencyColor(0.51)).toBe('red');
    expect(consistencyColor(1.2)).toBe('red');
  });
  it('exports the engine threshold constant = 0.5', () => {
    expect(HIGH_VARIANCE_CV_THRESHOLD).toBe(0.5);
  });
});

describe('buildScorecard — single run gating (honesty)', () => {
  const single: ScorecardInput = {
    runCount: 1,
    medianDurationLabel: '4m 32s',
    coefficientOfVariation: 0, // must be ignored — single run
    variantCount: 1,
    automationScore: 72,
    topBottleneck: { title: 'Approve report', percentOfCycleTime: 38 },
  };

  it('gates CV / consistency / variant-count behind runCount >= 2', () => {
    const sc = buildScorecard(single);
    expect(sc.consistency.value).toBe('—');
    expect(sc.consistency.color).toBeNull();
    expect(sc.consistency.band).toBeNull();
    expect(sc.consistency.interpretation).toMatch(/2\+ runs/);
    expect(sc.variantCount.value).toBe('—');
    expect(sc.variantCount.interpretation).toMatch(/1 run/);
  });

  it('still shows single-run cycle time, bottleneck and automation', () => {
    const sc = buildScorecard(single);
    expect(sc.cycleTime.value).toBe('4m 32s');
    expect(sc.cycleTime.interpretation).toMatch(/single recorded run/i);
    expect(sc.bottleneckStep.value).toBe('Approve report');
    expect(sc.bottleneckStep.interpretation).toMatch(/38% of cycle time/);
    expect(sc.automationScore.value).toBe('72');
    expect(sc.automationScore.interpretation).toMatch(/automation candidate/i);
  });
});

describe('buildScorecard — multi-run', () => {
  it('color-codes consistency and discloses the threshold', () => {
    const sc = buildScorecard({
      runCount: 10,
      medianDurationLabel: '7m',
      coefficientOfVariation: 0.42,
      variantCount: 3,
      automationScore: 55,
      topBottleneck: { title: 'Credit Check', percentOfCycleTime: 41 },
    });
    expect(sc.consistency.value).toBe('0.42');
    expect(sc.consistency.color).toBe('amber');
    expect(sc.consistency.band).toBe(cvBand(0.42));
    expect(sc.consistency.interpretation).toMatch(/CV ≥ 0\.50 = high variance/);
    expect(sc.variantCount.value).toBe('3');
    expect(sc.cycleTime.interpretation).toMatch(/median across 10 runs/i);
  });

  it('renders "—" for absent values, never fabricated defaults', () => {
    const sc = buildScorecard({
      runCount: 5,
      medianDurationLabel: null,
      coefficientOfVariation: null,
      variantCount: null,
      automationScore: null,
      topBottleneck: null,
    });
    expect(sc.cycleTime.value).toBe('—');
    expect(sc.consistency.value).toBe('—');
    expect(sc.consistency.interpretation).toMatch(/not available/i);
    expect(sc.variantCount.value).toBe('—');
    expect(sc.bottleneckStep.value).toBe('—');
    expect(sc.bottleneckStep.interpretation).toMatch(/none detected/i);
    expect(sc.automationScore.value).toBe('—');
  });

  it('is deterministic across repeated calls', () => {
    const input: ScorecardInput = {
      runCount: 8,
      medianDurationLabel: '3m',
      coefficientOfVariation: 0.3,
      variantCount: 2,
      automationScore: 80,
      topBottleneck: { title: 'X', percentOfCycleTime: 50 },
    };
    expect(JSON.stringify(buildScorecard(input))).toBe(
      JSON.stringify(buildScorecard(structuredClone(input))),
    );
  });
});

describe('buildParetoRows', () => {
  const variants: ParetoVariantInput[] = [
    { variantId: 'variant-1', isStandardPath: true, frequency: 0.5, runCount: 8, signature: 'a:b:c' },
    { variantId: 'variant-2', frequency: 0.25, runCount: 4, signature: 'a:b:d:e', stepCount: 4 },
    { variantId: 'variant-3', frequency: 0.125, runCount: 2, signature: 'a:x' },
    { variantId: 'variant-4', frequency: 0.0625, runCount: 1, signature: 'q:r:s' },
    { variantId: 'variant-5', frequency: 0.0625, runCount: 1, signature: 'z' },
  ];

  it('ranks by runCount desc and badges the standard path "Reference path"', () => {
    const rows = buildParetoRows(variants, 16);
    expect(rows[0]!.isStandardPath).toBe(true);
    expect(rows[0]!.label).toBe('Reference path');
    expect(rows[0]!.runCount).toBe(8);
    expect(rows[0]!.percent).toBe(50);
    // runCount descending order on the headline rows.
    expect(rows[1]!.runCount).toBe(4);
  });

  it('NEVER uses the raw signature hash as the headline label', () => {
    const rows = buildParetoRows(variants, 16);
    for (const r of rows) {
      expect(r.label).not.toContain(':');
      expect(r.label).not.toBe('a:b:d:e');
    }
    // The hash is still available as a tooltip for non-standard rows.
    const v2 = rows.find((r) => r.label === '4-step path');
    expect(v2?.signatureTooltip).toBe('a:b:d:e');
  });

  it('groups 1–2-run variants into a single "Unique executions" row', () => {
    const rows = buildParetoRows(variants, 16);
    const grouped = rows.find((r) => r.isGrouped);
    expect(grouped).toBeDefined();
    // variant-3 (2) + variant-4 (1) + variant-5 (1) = 4 runs aggregated.
    expect(grouped!.runCount).toBe(4);
    expect(grouped!.label).toBe('Unique executions (4 runs)');
    expect(grouped!.percent).toBe(25);
    expect(grouped!.signatureTooltip).toBeNull();
  });

  it('prefers real recorded step titles for the label when present', () => {
    const rows = buildParetoRows(
      [
        { variantId: 'variant-1', isStandardPath: true, runCount: 5 },
        {
          variantId: 'variant-2',
          runCount: 4,
          stepTitles: ['Open form', 'Fill details', 'Submit', 'Confirm'],
          signature: 'a:b:c:d',
        },
      ],
      9,
    );
    const v2 = rows.find((r) => r.label.startsWith('Open form'));
    expect(v2).toBeDefined();
    expect(v2!.label).toBe('Open form → Fill details → Submit → … (4 steps)');
  });

  it('handles zero total runs without dividing by zero', () => {
    const rows = buildParetoRows([{ variantId: 'variant-1', isStandardPath: true, runCount: 0 }], 0);
    expect(rows[0]!.percent).toBe(0);
  });

  it('is deterministic across repeated calls', () => {
    const a = buildParetoRows(variants, 16);
    const b = buildParetoRows(structuredClone(variants), 16);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
