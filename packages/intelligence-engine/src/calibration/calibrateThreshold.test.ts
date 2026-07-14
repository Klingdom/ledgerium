import { describe, it, expect } from 'vitest';
import type { PathSignature } from '../types.js';
import { traceSimilarity, DEFAULT_SIMILARITY_WEIGHTS } from '../clustering/traceSimilarity.js';
import type { CalibrationMember } from './calibrateThreshold.js';
import { calibrateThreshold, CALIBRATION_VERSION } from './calibrateThreshold.js';

function sig(cats: string[]): PathSignature {
  return { signature: cats.join(':'), stepCategories: cats, stepCount: cats.length };
}

// Same canonical fixtures used in clustering.test.ts so the expected
// pairwise similarities are already independently verified there:
//   traceSimilarity(A, B) === 0.61 (single-insertion variant)
//   traceSimilarity(A, C) === 0    (structurally disjoint → LCS hard floor)
const A = sig(['click', 'fill', 'submit']);
const B = sig(['click', 'fill', 'validate', 'submit']);
const C = sig(['navigate', 'search', 'navigate', 'export']);

describe('calibrateThreshold — distribution correctness', () => {
  // Members: A, A2 (identical to A), B (0.61 to A/A2), C (0 to everyone).
  // Pairs (6): A-A2=1, A-B=0.61, A2-B=0.61, A-C=0, A2-C=0, B-C=0.
  const members: CalibrationMember[] = [
    { id: 'a', signature: A },
    { id: 'a2', signature: A },
    { id: 'b', signature: B },
    { id: 'c', signature: C },
  ];

  it('computes exact pairCount / min / max / mean / median over the hand-built set', () => {
    const report = calibrateThreshold(members);
    expect(report.memberCount).toBe(4);
    expect(report.distribution.pairCount).toBe(6);
    expect(report.distribution.min).toBe(0);
    expect(report.distribution.max).toBe(1);
    // sorted: [0, 0, 0, 0.61, 0.61, 1] → mean = 2.22 / 6 = 0.37
    expect(report.distribution.mean).toBeCloseTo(0.37, 5);
    // even count → avg of the two middle values: (0 + 0.61) / 2 = 0.305
    expect(report.distribution.median).toBeCloseTo(0.305, 5);
  });

  it('buckets the histogram correctly (10 fixed buckets over [0,1])', () => {
    const report = calibrateThreshold(members);
    const hist = report.distribution.histogram;
    expect(hist).toHaveLength(10);
    // 3 zeros → bucket 0 [0, 0.1)
    expect(hist[0]).toEqual({ rangeStart: 0, rangeEnd: 0.1, count: 3 });
    // 2 values of 0.61 → bucket 6 [0.6, 0.7)
    expect(hist[6]).toEqual({ rangeStart: 0.6, rangeEnd: 0.7, count: 2 });
    // 1 value of 1.0 → last bucket [0.9, 1.0]
    expect(hist[9]).toEqual({ rangeStart: 0.9, rangeEnd: 1, count: 1 });
    // every other bucket empty
    const total = hist.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(6);
  });

  it('carries the CALIBRATION_VERSION and echoes the effective params', () => {
    const report = calibrateThreshold(members, { min: 0.5, max: 0.95, step: 0.05 });
    expect(report.version).toBe(CALIBRATION_VERSION);
    expect(report.params).toEqual({ min: 0.5, max: 0.95, step: 0.05, weights: DEFAULT_SIMILARITY_WEIGHTS });
  });
});

describe('calibrateThreshold — threshold sweep + plateau selection', () => {
  const members: CalibrationMember[] = [
    { id: 'a', signature: A },
    { id: 'a2', signature: A },
    { id: 'b', signature: B },
    { id: 'c', signature: C },
  ];

  it('sweeps the default range [0.5, 0.95] step 0.05 → 10 points', () => {
    const report = calibrateThreshold(members);
    expect(report.sweep).toHaveLength(10);
    expect(report.sweep.map((p) => p.threshold)).toEqual([
      0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95,
    ]);
  });

  it('produces the exact expected clusterCount sequence for the fixture', () => {
    // A-B similarity is 0.61: merges at t <= 0.60 (3 points), splits at t >= 0.65 (7 points).
    // A-A2 similarity is 1.0: always merges.
    const report = calibrateThreshold(members);
    expect(report.sweep.map((p) => p.clusterCount)).toEqual([2, 2, 2, 3, 3, 3, 3, 3, 3, 3]);
    expect(report.sweep.map((p) => p.largestClusterSize)).toEqual([3, 3, 3, 2, 2, 2, 2, 2, 2, 2]);
    expect(report.sweep.map((p) => p.singletonCount)).toEqual([1, 1, 1, 2, 2, 2, 2, 2, 2, 2]);
    expect(report.sweep.map((p) => p.mergedPairCount)).toEqual([3, 3, 3, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('recommends the highest threshold within the widest (7-point) plateau', () => {
    const report = calibrateThreshold(members);
    expect(report.plateauRange).toEqual({ start: 0.65, end: 0.95, length: 7, clusterCount: 3 });
    expect(report.recommendedThreshold).toBe(0.95);
    expect(report.reason).toMatch(/widest stable plateau/);
    expect(report.reason).toMatch(/0\.65/);
    expect(report.reason).toMatch(/0\.95/);
  });

  it('cluster count is monotonically non-decreasing as threshold increases', () => {
    const report = calibrateThreshold(members);
    for (let i = 1; i < report.sweep.length; i++) {
      expect(report.sweep[i]!.clusterCount).toBeGreaterThanOrEqual(report.sweep[i - 1]!.clusterCount);
    }
  });

  it('is monotonic across a larger synthetic population too', () => {
    const bigMembers: CalibrationMember[] = [
      { id: 'm1', signature: sig(['a', 'b', 'c']) },
      { id: 'm2', signature: sig(['a', 'b', 'c']) }, // identical to m1
      { id: 'm3', signature: sig(['a', 'b', 'x', 'c']) }, // near m1/m2
      { id: 'm4', signature: sig(['a', 'b', 'x', 'y', 'c']) }, // further from m1/m2
      { id: 'm5', signature: sig(['q', 'r', 's']) }, // unrelated
      { id: 'm6', signature: sig(['q', 'r', 's']) }, // identical to m5
    ];
    const report = calibrateThreshold(bigMembers, { min: 0, max: 1, step: 0.1 });
    expect(report.sweep).toHaveLength(11);
    for (let i = 1; i < report.sweep.length; i++) {
      expect(report.sweep[i]!.clusterCount).toBeGreaterThanOrEqual(report.sweep[i - 1]!.clusterCount);
      expect(report.sweep[i]!.largestClusterSize).toBeLessThanOrEqual(report.sweep[i - 1]!.largestClusterSize);
    }
    // threshold 0 merges everything transitively-ish (at minimum all pairs qualify since
    // similarity is always >= 0); threshold 1 only merges byte-identical signatures.
    expect(report.sweep[0]!.threshold).toBe(0);
    expect(report.sweep[report.sweep.length - 1]!.threshold).toBe(1);
    expect(report.sweep[report.sweep.length - 1]!.clusterCount).toBeGreaterThanOrEqual(3); // {m1,m2} {m3} {m4} {m5,m6} at minimum
  });

  it('tie-breaks equal-length plateaus toward the higher (later) threshold', () => {
    // Two members, 4 substitutions apart out of 4 positions minus 1 match →
    // editDistance=3, maxLen=4 → lcsSimilarity = 1 - 3/4 = 0.25 exactly.
    // With weights {lcs:1, cat:0}, traceSimilarity collapses to exactly lcsSimilarity
    // (the LCS-hard-floor guard is a no-op here: min(0.25, 0.25) === 0.25).
    const p = sig(['a', 'b', 'c', 'd']);
    const q = sig(['e', 'f', 'g', 'd']);
    const members2: CalibrationMember[] = [
      { id: 'p', signature: p },
      { id: 'q', signature: q },
    ];
    const weights = { lcs: 1, cat: 0 };
    expect(traceSimilarity(p, q, weights)).toBe(0.25);

    // Sweep [0, 0.25, 0.5, 0.75]: merge at t<=0.25 (2 pts, clusterCount=1),
    // split at t>0.25 (2 pts, clusterCount=2) — an EXACT tie in plateau width.
    const report = calibrateThreshold(members2, { min: 0, max: 0.75, step: 0.25, weights });
    expect(report.sweep.map((p2) => p2.clusterCount)).toEqual([1, 1, 2, 2]);

    // Tie-break rule: prefer the LATER (higher-threshold) run → the split plateau
    // [0.5, 0.75], recommending 0.75, not the merge plateau's 0.25.
    expect(report.plateauRange).toEqual({ start: 0.5, end: 0.75, length: 2, clusterCount: 2 });
    expect(report.recommendedThreshold).toBe(0.75);
  });
});

describe('calibrateThreshold — determinism', () => {
  const members: CalibrationMember[] = [
    { id: 'a', signature: A },
    { id: 'a2', signature: A },
    { id: 'b', signature: B },
    { id: 'c', signature: C },
  ];

  it('repeat calls on the same set produce a byte-identical (deep-equal) report', () => {
    const r1 = calibrateThreshold(members);
    const r2 = calibrateThreshold(members);
    expect(r1).toEqual(r2);
  });

  it('is permutation-invariant — any input order yields an identical report', () => {
    const forward = calibrateThreshold(members);
    const shuffled = calibrateThreshold([members[3]!, members[1]!, members[0]!, members[2]!]);
    expect(shuffled).toEqual(forward);
  });
});

describe('calibrateThreshold — empty / singleton guards', () => {
  it('handles an empty member list without throwing', () => {
    const report = calibrateThreshold([]);
    expect(report.memberCount).toBe(0);
    expect(report.distribution.pairCount).toBe(0);
    expect(report.distribution.min).toBeNull();
    expect(report.distribution.max).toBeNull();
    expect(report.distribution.mean).toBeNull();
    expect(report.distribution.median).toBeNull();
    expect(report.distribution.histogram).toHaveLength(10);
    expect(report.distribution.histogram.every((b) => b.count === 0)).toBe(true);
    expect(report.recommendedThreshold).toBeNull();
    expect(report.plateauRange).toBeNull();
    expect(report.reason).toMatch(/insufficient members/);
    // sweep is still fully populated (10 default points) with trivial all-empty clusters.
    expect(report.sweep).toHaveLength(10);
    expect(report.sweep.every((p) => p.clusterCount === 0)).toBe(true);
  });

  it('handles a single-member list without throwing', () => {
    const report = calibrateThreshold([{ id: 'solo', signature: A }]);
    expect(report.memberCount).toBe(1);
    expect(report.distribution.pairCount).toBe(0);
    expect(report.distribution.min).toBeNull();
    expect(report.recommendedThreshold).toBeNull();
    expect(report.plateauRange).toBeNull();
    expect(report.reason).toMatch(/insufficient members/);
    expect(report.sweep.every((p) => p.clusterCount === 1 && p.singletonCount === 1)).toBe(true);
  });
});

describe('calibrateThreshold — options validation + passthrough', () => {
  const members: CalibrationMember[] = [
    { id: 'a', signature: A },
    { id: 'b', signature: B },
  ];

  it('throws when step <= 0', () => {
    expect(() => calibrateThreshold(members, { step: 0 })).toThrow(/step must be > 0/);
    expect(() => calibrateThreshold(members, { step: -0.1 })).toThrow(/step must be > 0/);
  });

  it('throws when min > max', () => {
    expect(() => calibrateThreshold(members, { min: 0.9, max: 0.1 })).toThrow(/min .* must be <= max/);
  });

  it('honors custom min/max/step', () => {
    const report = calibrateThreshold(members, { min: 0.1, max: 0.3, step: 0.1 });
    expect(report.sweep.map((p) => p.threshold)).toEqual([0.1, 0.2, 0.3]);
  });

  it('passes custom weights through to both the distribution and the sweep', () => {
    // With cat-only weighting (lcs: 0, cat: 1), traceSimilarity(A, B) uses
    // computeSignatureSimilarity directly instead of the LCS blend.
    const customWeights = { lcs: 0, cat: 1 };
    const defaultReport = calibrateThreshold(members);
    const customReport = calibrateThreshold(members, { weights: customWeights });
    expect(customReport.params.weights).toEqual(customWeights);
    expect(customReport.distribution.max).not.toBe(defaultReport.distribution.max);
  });
});
