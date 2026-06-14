import { describe, it, expect } from 'vitest';
import {
  deriveDistribution,
  deriveConsistencyScore,
  consistencyBand,
  rankBottleneckContributions,
  formatDriftSignals,
  deriveInsightCards,
  type DistributionInput,
  type ConsistencyScoreInput,
  type BottleneckContributionInput,
  type DriftSignalInput,
  type InsightCardInput,
} from './reportEvidence.js';

// ── deriveDistribution ──────────────────────────────────────────────────────────

describe('deriveDistribution', () => {
  const base: DistributionInput = {
    runCount: 8,
    minDurationMs: 180_000, // 3m
    medianDurationMs: 420_000, // 7m
    meanDurationMs: 480_000, // 8m
    p90DurationMs: 1_320_000, // 22m
    maxDurationMs: 2_700_000, // 45m
  };

  it('builds a 5-number-summary envelope with positions along [min,max]', () => {
    const d = deriveDistribution(base)!;
    expect(d).not.toBeNull();
    expect(d.minMs).toBe(180_000);
    expect(d.maxMs).toBe(2_700_000);
    expect(d.spanMs).toBe(2_520_000);
    expect(d.markers.map((m) => m.key)).toEqual(['min', 'median', 'mean', 'p90', 'max']);
    const min = d.markers.find((m) => m.key === 'min')!;
    const max = d.markers.find((m) => m.key === 'max')!;
    expect(min.position).toBe(0);
    expect(max.position).toBe(100);
  });

  it('marks the median as the reference line', () => {
    const d = deriveDistribution(base)!;
    const refs = d.markers.filter((m) => m.isReference);
    expect(refs).toHaveLength(1);
    expect(refs[0]!.key).toBe('median');
  });

  it('is deterministic (same input → byte-identical output)', () => {
    expect(deriveDistribution(base)).toEqual(deriveDistribution(base));
  });

  it('gates single-run (returns null below 2 runs)', () => {
    expect(deriveDistribution({ ...base, runCount: 1 })).toBeNull();
  });

  it('returns null without a real envelope (missing min or max)', () => {
    expect(deriveDistribution({ ...base, minDurationMs: null })).toBeNull();
    expect(deriveDistribution({ ...base, maxDurationMs: null })).toBeNull();
  });

  it('does NOT fabricate a histogram — only summary markers that exist are emitted', () => {
    const d = deriveDistribution({
      runCount: 5,
      minDurationMs: 1000,
      medianDurationMs: null,
      meanDurationMs: null,
      p90DurationMs: null,
      maxDurationMs: 5000,
    })!;
    expect(d.markers.map((m) => m.key)).toEqual(['min', 'max']);
  });

  it('pins all markers to 0 when the envelope is degenerate (min == max)', () => {
    const d = deriveDistribution({
      runCount: 3,
      minDurationMs: 5000,
      medianDurationMs: 5000,
      meanDurationMs: 5000,
      p90DurationMs: 5000,
      maxDurationMs: 5000,
    })!;
    expect(d.spanMs).toBe(0);
    for (const m of d.markers) expect(m.position).toBe(0);
  });

  it('clamps an out-of-envelope summary point onto the axis without inventing a value', () => {
    const d = deriveDistribution({
      runCount: 4,
      minDurationMs: 1000,
      medianDurationMs: 5000, // > max — defensive clamp
      maxDurationMs: 4000,
    })!;
    const median = d.markers.find((m) => m.key === 'median')!;
    expect(median.position).toBe(100); // clamped to max
    expect(median.valueMs).toBe(5000); // raw value preserved (honest)
  });
});

// ── deriveConsistencyScore ───────────────────────────────────────────────────────

describe('deriveConsistencyScore', () => {
  it('maps full stability + zero CV to 100 (highly consistent)', () => {
    const c = deriveConsistencyScore({ runCount: 10, sequenceStability: 1, coefficientOfVariation: 0 })!;
    expect(c.score).toBe(100);
    expect(c.band).toBe('Highly consistent');
    expect(c.basis).toEqual({ usedSequenceStability: true, usedCv: true });
  });

  it('averages structural and timing components', () => {
    // stability 0.6 → 60; CV 0.25 → (1 - 0.25/0.5)*100 = 50; avg = 55
    const c = deriveConsistencyScore({ runCount: 6, sequenceStability: 0.6, coefficientOfVariation: 0.25 })!;
    expect(c.score).toBe(55);
    expect(c.band).toBe('Moderate variance');
  });

  it('drives CV component to 0 at the engine high-variance threshold (0.5)', () => {
    const c = deriveConsistencyScore({ runCount: 4, coefficientOfVariation: 0.5 })!;
    expect(c.score).toBe(0);
    // cvBand is the engine-aligned word; 0.5 sits in 'moderate variation' (0.75 ⇒ highly variable).
    expect(c.cvBand).toBe('moderate variation');
    expect(c.basis).toEqual({ usedSequenceStability: false, usedCv: true });
  });

  it('reports the highly-variable cvBand once CV reaches 0.75', () => {
    const c = deriveConsistencyScore({ runCount: 4, coefficientOfVariation: 0.9 })!;
    expect(c.score).toBe(0);
    expect(c.cvBand).toBe('highly variable');
  });

  it('works from sequenceStability alone', () => {
    const c = deriveConsistencyScore({ runCount: 3, sequenceStability: 0.9 })!;
    expect(c.score).toBe(90);
    expect(c.cvBand).toBeNull();
    expect(c.basis).toEqual({ usedSequenceStability: true, usedCv: false });
  });

  it('gates single-run and missing-signal cases (returns null)', () => {
    expect(deriveConsistencyScore({ runCount: 1, sequenceStability: 1 })).toBeNull();
    expect(deriveConsistencyScore({ runCount: 5 })).toBeNull();
  });

  it('is deterministic', () => {
    const input: ConsistencyScoreInput = { runCount: 7, sequenceStability: 0.72, coefficientOfVariation: 0.31 };
    expect(deriveConsistencyScore(input)).toEqual(deriveConsistencyScore(input));
  });

  it('consistencyBand boundaries are 85 / 65 / 40', () => {
    expect(consistencyBand(85)).toBe('Highly consistent');
    expect(consistencyBand(84)).toBe('Mostly consistent');
    expect(consistencyBand(65)).toBe('Mostly consistent');
    expect(consistencyBand(64)).toBe('Moderate variance');
    expect(consistencyBand(40)).toBe('Moderate variance');
    expect(consistencyBand(39)).toBe('High variance');
  });
});

// ── rankBottleneckContributions ──────────────────────────────────────────────────

describe('rankBottleneckContributions', () => {
  const input: BottleneckContributionInput[] = [
    { position: 3, title: 'Approve report', meanDurationMs: 60_000, runCount: 8, isHighDuration: true, isHighVariance: false },
    { position: 1, title: 'Open dashboard', meanDurationMs: 30_000, runCount: 10, isHighDuration: false, isHighVariance: true },
    { position: 5, title: 'Send email', meanDurationMs: 10_000, runCount: 4, isHighDuration: true, isHighVariance: true },
  ];

  it('ranks by mean duration desc and marks the primary bottleneck', () => {
    const rows = rankBottleneckContributions(input);
    expect(rows.map((r) => r.position)).toEqual([3, 1, 5]);
    expect(rows[0]!.isPrimary).toBe(true);
    expect(rows[1]!.isPrimary).toBe(false);
  });

  it('computes share of summed bottleneck cycle time (60/30/10 → 60/30/10%)', () => {
    const rows = rankBottleneckContributions(input);
    expect(rows[0]!.percentOfTotal).toBe(60);
    expect(rows[1]!.percentOfTotal).toBe(30);
    expect(rows[2]!.percentOfTotal).toBe(10);
  });

  it('scales bar width relative to the largest mean (top fills the track)', () => {
    const rows = rankBottleneckContributions(input);
    expect(rows[0]!.barWidth).toBe(100);
    expect(rows[1]!.barWidth).toBe(50);
  });

  it('mirrors the Slow / Variable / Both flag', () => {
    const rows = rankBottleneckContributions(input);
    expect(rows.find((r) => r.position === 3)!.flag).toBe('Slow');
    expect(rows.find((r) => r.position === 1)!.flag).toBe('Variable');
    expect(rows.find((r) => r.position === 5)!.flag).toBe('Both');
  });

  it('drops zero/invalid means and returns [] when nothing is left', () => {
    expect(rankBottleneckContributions([{ position: 1, title: 'x', meanDurationMs: 0 }])).toEqual([]);
    expect(rankBottleneckContributions([])).toEqual([]);
  });

  it('is deterministic with a stable tie-break by position', () => {
    const tied: BottleneckContributionInput[] = [
      { position: 4, title: 'b', meanDurationMs: 5000 },
      { position: 2, title: 'a', meanDurationMs: 5000 },
    ];
    const rows = rankBottleneckContributions(tied);
    expect(rows.map((r) => r.position)).toEqual([2, 4]);
  });
});

// ── formatDriftSignals ───────────────────────────────────────────────────────────

describe('formatDriftSignals', () => {
  const signals: DriftSignalInput[] = [
    {
      driftType: 'timing',
      severity: 'high',
      description: 'Mean process duration increased by 60% from baseline (5s → 8s).',
      baselineValue: 5000,
      currentValue: 8000,
    },
    {
      driftType: 'structural',
      severity: 'medium',
      description: 'The most common process path structure has changed from the baseline window.',
      baselineValue: 'sig-a',
      currentValue: 'sig-b',
    },
  ];

  it('formats real engine fields verbatim with human type labels', () => {
    const out = formatDriftSignals(signals);
    expect(out).toHaveLength(2);
    expect(out[0]!.typeLabel).toBe('Timing drift');
    expect(out[0]!.severity).toBe('high');
    expect(out[0]!.baselineLabel).toBe('5000');
    expect(out[0]!.currentLabel).toBe('8000');
    expect(out[1]!.typeLabel).toBe('Structural drift');
    expect(out[1]!.baselineLabel).toBe('sig-a');
    expect(out[1]!.currentLabel).toBe('sig-b');
  });

  it('returns [] for null/empty (honest "no drift" state) and never fabricates', () => {
    expect(formatDriftSignals(null)).toEqual([]);
    expect(formatDriftSignals(undefined)).toEqual([]);
    expect(formatDriftSignals([])).toEqual([]);
  });

  it('normalizes unknown severity to low and is deterministic', () => {
    const out = formatDriftSignals([
      { driftType: 'step_count', severity: 'weird', description: 'x', baselineValue: 1, currentValue: 2 },
    ]);
    expect(out[0]!.severity).toBe('low');
    expect(out[0]!.typeLabel).toBe('Step-count drift');
    expect(formatDriftSignals(signals)).toEqual(formatDriftSignals(signals));
  });
});

// ── deriveInsightCards ───────────────────────────────────────────────────────────

describe('deriveInsightCards', () => {
  it('emits a Standardize card when variants are many and dominant coverage is low', () => {
    const cards = deriveInsightCards({
      runCount: 16,
      variantCount: 4,
      dominantPathFrequency: 0.5,
      dominantPathRunCount: 8,
      evidenceRunIds: ['r1', 'r2', 'r3'],
    });
    const card = cards.find((c) => c.type === 'standardize')!;
    expect(card).toBeDefined();
    expect(card.finding).toMatch(/4 distinct paths/);
    expect(card.evidence.label).toBe('Based on 8 of 16 runs');
    expect(card.evidence.runIds).toEqual(['r1', 'r2', 'r3']);
  });

  it('emits an Automate card on a strong score with an evidence anchor', () => {
    const cards = deriveInsightCards({
      runCount: 12,
      automationScore: 82,
      topAutomationTitle: 'Generate report',
      evidenceRunIds: ['a', 'b'],
    });
    const card = cards.find((c) => c.type === 'automate')!;
    expect(card.finding).toMatch(/82\/100/);
    expect(card.recommendation).toMatch(/Generate report/);
    expect(card.evidence.label).toBe('Based on 12 runs');
  });

  it('emits an Automate card on an automate opportunityTag even without a high score', () => {
    const cards = deriveInsightCards({ runCount: 5, opportunityTag: 'automate', automationScore: 30 });
    expect(cards.some((c) => c.type === 'automate')).toBe(true);
  });

  it('emits an Investigate card from a dominant bottleneck and/or high-variance steps', () => {
    const cards = deriveInsightCards({
      runCount: 9,
      highVarianceStepCount: 2,
      topBottleneck: { title: 'Approve report', percentOfCycleTime: 38 },
    });
    const card = cards.find((c) => c.type === 'investigate')!;
    expect(card.finding).toMatch(/Approve report/);
    expect(card.finding).toMatch(/2 steps run inconsistently/);
  });

  it('returns [] for single-run (no fabricated insights)', () => {
    expect(deriveInsightCards({ runCount: 1, automationScore: 95, variantCount: 4, dominantPathFrequency: 0.2 })).toEqual([]);
  });

  it('returns [] when no signal qualifies', () => {
    expect(
      deriveInsightCards({ runCount: 5, variantCount: 1, dominantPathFrequency: 1, automationScore: 10, highVarianceStepCount: 0 }),
    ).toEqual([]);
  });

  it('orders cards Standardize → Automate → Investigate and is deterministic', () => {
    const input: InsightCardInput = {
      runCount: 16,
      variantCount: 4,
      dominantPathFrequency: 0.5,
      automationScore: 82,
      highVarianceStepCount: 3,
      topBottleneck: { title: 'Step X', percentOfCycleTime: 40 },
    };
    const cards = deriveInsightCards(input);
    expect(cards.map((c) => c.type)).toEqual(['standardize', 'automate', 'investigate']);
    expect(deriveInsightCards(input)).toEqual(cards);
  });

  it('caps evidence run ids at 5', () => {
    const cards = deriveInsightCards({
      runCount: 20,
      automationScore: 90,
      evidenceRunIds: ['1', '2', '3', '4', '5', '6', '7'],
    });
    expect(cards.find((c) => c.type === 'automate')!.evidence.runIds).toHaveLength(5);
  });
});
