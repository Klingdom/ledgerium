import { describe, it, expect } from 'vitest';
import { buildReportVerdict, cvBand, type ReportVerdictInput } from './reportVerdict.js';

// Helper: any digit run in the output that is NOT one of the figures we fed in
// would be a fabrication. We assert each emitted number traces to an input.
function numbersIn(s: string): string[] {
  return (s.match(/\d+(?:\.\d+)?/g) ?? []);
}

describe('cvBand', () => {
  it('maps CV to honest band words around the 0.5 engine threshold', () => {
    expect(cvBand(0.0)).toBe('highly consistent');
    expect(cvBand(0.24)).toBe('highly consistent');
    expect(cvBand(0.25)).toBe('consistent');
    expect(cvBand(0.49)).toBe('consistent');
    expect(cvBand(0.5)).toBe('moderate variation');
    expect(cvBand(0.74)).toBe('moderate variation');
    expect(cvBand(0.75)).toBe('highly variable');
    expect(cvBand(2.0)).toBe('highly variable');
  });
});

describe('buildReportVerdict — single run', () => {
  it('returns exactly one honest sentence and never multi-run figures', () => {
    const out = buildReportVerdict({
      runCount: 1,
      // Even if upstream figures leak in, single-run must ignore them.
      sequenceStability: 1,
      coefficientOfVariation: 0,
      variantCount: 1,
      dominantPathRunCount: 1,
      topBottleneck: { title: 'Approve', percentOfCycleTime: 80 },
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/recorded once/i);
    // No fabricated percentages or variant counts in the single-run sentence.
    expect(out[0]).not.toMatch(/%/);
    expect(out[0]).not.toMatch(/\d/);
  });

  it('treats runCount 0 / NaN as single-run', () => {
    expect(buildReportVerdict({ runCount: 0 })).toHaveLength(1);
    expect(buildReportVerdict({ runCount: Number.NaN as unknown as number })).toHaveLength(1);
    expect(buildReportVerdict({ runCount: 0 })[0]).toMatch(/recorded once/i);
  });
});

describe('buildReportVerdict — consistent multi-run', () => {
  const input: ReportVerdictInput = {
    runCount: 12,
    sequenceStability: 0.9166, // → 92%
    coefficientOfVariation: 0.18, // highly consistent
    variantCount: 2,
    dominantPathRunCount: 7,
    topBottleneck: { title: 'Credit Check', percentOfCycleTime: 41 },
  };

  it('produces 2–4 sentences', () => {
    const out = buildReportVerdict(input);
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out.length).toBeLessThanOrEqual(4);
  });

  it('sentence 1 states consistency with band word + stability %', () => {
    const out = buildReportVerdict(input);
    expect(out[0]).toMatch(/92% of 12 runs/);
    expect(out[0]).toMatch(/highly consistent/);
    expect(out[0]).toMatch(/CV 0\.18/);
  });

  it('sentence 2 states variants with dominant-path coverage "7 of 12"', () => {
    const out = buildReportVerdict(input);
    const variantSentence = out.find((s) => /distinct paths/.test(s));
    expect(variantSentence).toBeDefined();
    expect(variantSentence).toMatch(/2 distinct paths/);
    expect(variantSentence).toMatch(/7 of 12 runs/);
  });

  it('sentence 3 names the bottleneck with its % of cycle time', () => {
    const out = buildReportVerdict(input);
    const action = out.find((s) => /Credit Check/.test(s));
    expect(action).toBeDefined();
    expect(action).toMatch(/41% of cycle time/);
  });

  it('does not fabricate numbers — every emitted figure traces to an input', () => {
    const out = buildReportVerdict(input);
    const allowed = new Set(['12', '92', '7', '2', '41', '0.18']);
    for (const sentence of out) {
      for (const n of numbersIn(sentence)) {
        expect(allowed.has(n)).toBe(true);
      }
    }
  });
});

describe('buildReportVerdict — high-variance multi-run', () => {
  it('uses variation band words and the standardization fallback when no bottleneck', () => {
    const out = buildReportVerdict({
      runCount: 9,
      sequenceStability: 0.33, // 33%
      coefficientOfVariation: 0.92, // highly variable
      variantCount: 5,
      dominantPathRunCount: 3,
      topBottleneck: null,
      standardizationOpportunity: { variantCount: 5, dominantPathPercent: 33 },
    });
    expect(out[0]).toMatch(/33% of 9 runs/);
    expect(out[0]).toMatch(/highly variable/);
    const action = out.find((s) => /standardizing/i.test(s));
    expect(action).toBeDefined();
    expect(action).toMatch(/5 paths/);
    expect(action).toMatch(/33% of runs/);
  });

  it('handles CV-only consistency (no stability) with a capitalized lead', () => {
    const out = buildReportVerdict({ runCount: 6, coefficientOfVariation: 0.6 });
    expect(out[0]).toMatch(/^Run timing is moderate variation \(CV 0\.60\)\.$/);
    expect(out[0]).not.toMatch(/follow the same path/);
  });

  it('handles stability-only consistency (no CV)', () => {
    const out = buildReportVerdict({ runCount: 8, sequenceStability: 0.75 });
    expect(out[0]).toMatch(/^75% of 8 runs follow the same path\.$/);
    expect(out[0]).not.toMatch(/CV/);
  });

  it('omits sentences whose data is absent (no fabrication)', () => {
    const out = buildReportVerdict({ runCount: 4, variantCount: 3, dominantPathRunCount: 2 });
    // No stability/CV data → no consistency sentence.
    expect(out.some((s) => /CV/.test(s) || /follow the same path/.test(s))).toBe(false);
    // Variant sentence present.
    expect(out.some((s) => /3 distinct paths/.test(s))).toBe(true);
    // Always at least one sentence.
    expect(out.length).toBeGreaterThanOrEqual(1);
  });
});

describe('buildReportVerdict — determinism', () => {
  it('returns byte-identical output across repeated calls', () => {
    const input: ReportVerdictInput = {
      runCount: 16,
      sequenceStability: 0.6,
      coefficientOfVariation: 0.42,
      variantCount: 3,
      dominantPathRunCount: 10,
      topBottleneck: { title: 'Manual entry', percentOfCycleTime: 28 },
    };
    const a = buildReportVerdict(input);
    const b = buildReportVerdict(input);
    const c = buildReportVerdict(structuredClone(input));
    expect(a).toEqual(b);
    expect(a).toEqual(c);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
