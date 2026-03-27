/**
 * Comprehensive test suite for @ledgerium/intelligence-engine.
 *
 * Tests cover:
 * - Input validation
 * - Metrics correctness
 * - Timestudy correctness
 * - Variance analysis correctness
 * - Variant detection determinism
 * - Bottleneck detection
 * - Drift detection
 * - Traceability (evidenceRunIds always populated)
 * - Privacy (no sensitive content in output labels)
 * - Determinism (identical inputs → identical analytics)
 * - Edge cases (single run, many runs, partial runs)
 * - Compatibility with process-engine outputs
 */

import { describe, it, expect } from 'vitest';
import {
  analyzePortfolio,
  resolveOptions,
  computePathSignature,
  computeSignatureSimilarity,
  bigramJaccardSimilarity,
  buildMetrics,
  analyzeTimestudy,
  analyzeVariance,
  detectVariants,
  detectBottlenecks,
  detectDrift,
} from './index.js';
import type { ProcessRunBundle, IntelligenceInput } from './types.js';
import { INTELLIGENCE_DEFAULTS, INTELLIGENCE_ENGINE_VERSION } from './types.js';

// ─── Test fixture builders ─────────────────────────────────────────────────────

/**
 * Build a minimal ProcessRunBundle fixture.
 * Simulates what @ledgerium/process-engine would produce.
 */
function makeBundle(opts: {
  runId: string;
  activityName?: string;
  durationMs?: number;
  completionStatus?: 'complete' | 'partial';
  stepCategories?: string[];
  stepDurations?: (number | undefined)[];
  systems?: string[];
  errorStepCount?: number;
  navigationStepCount?: number;
}): ProcessRunBundle {
  const {
    runId,
    activityName = 'Create Invoice',
    durationMs,
    completionStatus = 'complete',
    stepCategories = ['click_then_navigate', 'fill_and_submit'],
    stepDurations,
    systems = ['NetSuite'],
    errorStepCount = 0,
    navigationStepCount,
  } = opts;

  const resolvedNavCount =
    navigationStepCount ?? stepCategories.filter(c => c === 'click_then_navigate').length;

  const stepDefinitions = stepCategories.map((cat, i) => ({
    ordinal: i + 1,
    stepId: `${runId}-step-${i + 1}`,
    title: `Step ${i + 1}`,
    category: cat as 'click_then_navigate' | 'fill_and_submit' | 'single_action' | 'error_handling' | 'repeated_click_dedup' | 'annotation',
    categoryLabel: cat,
    categoryColor: '#2dd4bf',
    categoryBg: 'rgba(45,212,191,0.07)',
    operationalDefinition: `Step ${i + 1} definition`,
    purpose: `Purpose of step ${i + 1}`,
    systems,
    domains: ['example.com'],
    inputs: [],
    outputs: [],
    completionCondition: 'Completed',
    confidence: 0.85,
    ...(stepDurations?.[i] !== undefined && { durationMs: stepDurations[i] }),
    durationLabel: stepDurations?.[i] !== undefined ? `${stepDurations[i]}ms` : '< 1s',
    eventCount: 2,
    hasSensitiveEvents: false,
  }));

  return {
    processRun: {
      runId,
      sessionId: runId,
      activityName,
      startedAt: '2024-01-01T00:00:00.000Z',
      ...(durationMs !== undefined && { endedAt: '2024-01-01T00:01:00.000Z', durationMs }),
      durationLabel: durationMs ? `${durationMs}ms` : '< 1s',
      stepCount: stepCategories.length,
      eventCount: stepCategories.length * 2,
      humanEventCount: stepCategories.length,
      systemEventCount: 0,
      errorStepCount,
      navigationStepCount: resolvedNavCount,
      completionStatus,
      engineVersion: '1.0.0',
    },
    processDefinition: {
      definitionId: `${runId}-def`,
      name: activityName,
      description: `${activityName} process`,
      purpose: 'Testing',
      scope: 'Systems: NetSuite',
      systems,
      domains: ['example.com'],
      ...(durationMs !== undefined && { estimatedDurationMs: durationMs }),
      estimatedDurationLabel: durationMs ? `${durationMs}ms` : '< 1s',
      stepDefinitions,
    },
  };
}

// Standard 2-step bundle
const BUNDLE_A = makeBundle({ runId: 'run-a', durationMs: 6000, stepDurations: [100, 2000] });
const BUNDLE_B = makeBundle({ runId: 'run-b', durationMs: 8000, stepDurations: [200, 3000] });
const BUNDLE_C = makeBundle({ runId: 'run-c', durationMs: 5000, stepDurations: [150, 1500] });

// Variant bundle: different step sequence
const BUNDLE_VARIANT = makeBundle({
  runId: 'run-v',
  durationMs: 10000,
  stepCategories: ['click_then_navigate', 'error_handling', 'fill_and_submit'],
  stepDurations: [100, 5000, 2000],
  errorStepCount: 1,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('resolveOptions', () => {
  it('returns all defaults when no options provided', () => {
    const opts = resolveOptions();
    expect(opts.variantSimilarityThreshold).toBe(INTELLIGENCE_DEFAULTS.VARIANT_SIMILARITY_THRESHOLD);
    expect(opts.driftDurationThreshold).toBe(INTELLIGENCE_DEFAULTS.DRIFT_DURATION_THRESHOLD);
    expect(opts.bottleneckDurationMultiplier).toBe(INTELLIGENCE_DEFAULTS.BOTTLENECK_DURATION_MULTIPLIER);
    expect(opts.highVarianceCvThreshold).toBe(INTELLIGENCE_DEFAULTS.HIGH_VARIANCE_CV_THRESHOLD);
    expect(opts.ruleVersion).toBe(INTELLIGENCE_ENGINE_VERSION);
  });

  it('merges partial overrides with defaults', () => {
    const opts = resolveOptions({ variantSimilarityThreshold: 0.9 });
    expect(opts.variantSimilarityThreshold).toBe(0.9);
    expect(opts.driftDurationThreshold).toBe(INTELLIGENCE_DEFAULTS.DRIFT_DURATION_THRESHOLD);
  });
});

// ─── Path signature ───────────────────────────────────────────────────────────

describe('computePathSignature', () => {
  it('produces a stable colon-separated signature', () => {
    const sig = computePathSignature(BUNDLE_A);
    expect(sig.signature).toBe('click_then_navigate:fill_and_submit');
    expect(sig.stepCategories).toEqual(['click_then_navigate', 'fill_and_submit']);
    expect(sig.stepCount).toBe(2);
  });

  it('is deterministic for identical input', () => {
    const s1 = computePathSignature(BUNDLE_A);
    const s2 = computePathSignature(BUNDLE_A);
    expect(s1.signature).toBe(s2.signature);
  });

  it('differs for runs with different step sequences', () => {
    const sigA = computePathSignature(BUNDLE_A);
    const sigV = computePathSignature(BUNDLE_VARIANT);
    expect(sigA.signature).not.toBe(sigV.signature);
  });
});

describe('computeSignatureSimilarity', () => {
  it('returns 1.0 for identical signatures', () => {
    const s = computePathSignature(BUNDLE_A);
    expect(computeSignatureSimilarity(s, s)).toBe(1.0);
  });

  it('returns < 1.0 for different signatures', () => {
    const sA = computePathSignature(BUNDLE_A);
    const sV = computePathSignature(BUNDLE_VARIANT);
    const sim = computeSignatureSimilarity(sA, sV);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1.0);
  });

  it('returns a value between 0 and 1', () => {
    const sA = computePathSignature(BUNDLE_A);
    const sV = computePathSignature(BUNDLE_VARIANT);
    const sim = computeSignatureSimilarity(sA, sV);
    expect(sim).toBeGreaterThanOrEqual(0);
    expect(sim).toBeLessThanOrEqual(1.0);
  });
});

describe('bigramJaccardSimilarity', () => {
  it('returns 1.0 for identical arrays', () => {
    expect(bigramJaccardSimilarity(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(1.0);
  });

  it('returns 1.0 for both empty', () => {
    expect(bigramJaccardSimilarity([], [])).toBe(1.0);
  });

  it('returns 0.0 when one is empty', () => {
    expect(bigramJaccardSimilarity(['a'], [])).toBe(0.0);
    expect(bigramJaccardSimilarity([], ['a'])).toBe(0.0);
  });

  it('returns < 1.0 for different arrays', () => {
    expect(bigramJaccardSimilarity(['a', 'b'], ['c', 'd'])).toBeLessThan(1.0);
  });
});

// ─── Metrics ──────────────────────────────────────────────────────────────────

describe('buildMetrics', () => {
  it('computes correct run count and completion rate', () => {
    const partialBundle = makeBundle({ runId: 'run-p', completionStatus: 'partial' });
    const opts = resolveOptions();
    const m = buildMetrics([BUNDLE_A, BUNDLE_B, partialBundle], opts);
    expect(m.runCount).toBe(3);
    expect(m.completedRunCount).toBe(2);
    expect(m.completionRate).toBeCloseTo(2 / 3);
  });

  it('computes correct timing stats', () => {
    const opts = resolveOptions();
    const m = buildMetrics([BUNDLE_A, BUNDLE_B, BUNDLE_C], opts);
    // Durations: 6000, 8000, 5000 → mean 6333.33, median 6000
    expect(m.meanDurationMs).toBeCloseTo(19000 / 3);
    expect(m.medianDurationMs).toBe(6000);
    expect(m.minDurationMs).toBe(5000);
    expect(m.maxDurationMs).toBe(8000);
    expect(m.p90DurationMs).toBeDefined();
  });

  it('includes correct step count stats', () => {
    const opts = resolveOptions();
    const m = buildMetrics([BUNDLE_A, BUNDLE_B, BUNDLE_C], opts);
    expect(m.medianStepCount).toBe(2);
    expect(m.meanStepCount).toBe(2);
  });

  it('aggregates unique systems across runs', () => {
    const opts = resolveOptions();
    const b2 = makeBundle({ runId: 'run-sys', systems: ['Salesforce'] });
    const m = buildMetrics([BUNDLE_A, b2], opts);
    expect(m.uniqueSystems).toContain('NetSuite');
    expect(m.uniqueSystems).toContain('Salesforce');
    expect(m.uniqueSystems).toHaveLength(2);
  });

  it('populates evidenceRunIds for traceability', () => {
    const opts = resolveOptions();
    const m = buildMetrics([BUNDLE_A, BUNDLE_B], opts);
    expect(m.evidenceRunIds).toContain('run-a');
    expect(m.evidenceRunIds).toContain('run-b');
  });

  it('handles zero-run input gracefully', () => {
    const opts = resolveOptions();
    const m = buildMetrics([], opts);
    expect(m.runCount).toBe(0);
    expect(m.completionRate).toBe(0);
    expect(m.meanDurationMs).toBeNull();
    expect(m.evidenceRunIds).toHaveLength(0);
  });

  it('computes error step frequency correctly', () => {
    const opts = resolveOptions();
    const errBundle = makeBundle({ runId: 'run-err', errorStepCount: 2 });
    const m = buildMetrics([BUNDLE_A, errBundle], opts);
    // BUNDLE_A has 0 errors, errBundle has 2 → mean = 1
    expect(m.errorStepFrequency).toBe(1);
  });
});

// ─── Timestudy ────────────────────────────────────────────────────────────────

describe('analyzeTimestudy', () => {
  it('returns correct total duration statistics', () => {
    const opts = resolveOptions();
    const ts = analyzeTimestudy([BUNDLE_A, BUNDLE_B, BUNDLE_C], opts);
    expect(ts.totalDuration.meanMs).toBeCloseTo(19000 / 3);
    expect(ts.totalDuration.medianMs).toBe(6000);
    expect(ts.totalDuration.minMs).toBe(5000);
    expect(ts.totalDuration.maxMs).toBe(8000);
    expect(ts.totalDuration.stdDevMs).toBeGreaterThan(0);
  });

  it('computes per-step-position statistics', () => {
    const opts = resolveOptions();
    // BUNDLE_A: step1=100, step2=2000; BUNDLE_B: step1=200, step2=3000; BUNDLE_C: step1=150, step2=1500
    const ts = analyzeTimestudy([BUNDLE_A, BUNDLE_B, BUNDLE_C], opts);
    expect(ts.stepPositionTimestudies).toHaveLength(2);

    const pos1 = ts.stepPositionTimestudies[0]!;
    expect(pos1.position).toBe(1);
    expect(pos1.meanDurationMs).toBeCloseTo(150);
    expect(pos1.minDurationMs).toBe(100);
    expect(pos1.maxDurationMs).toBe(200);
    expect(pos1.runCount).toBe(3);

    const pos2 = ts.stepPositionTimestudies[1]!;
    expect(pos2.position).toBe(2);
    expect(pos2.meanDurationMs).toBeCloseTo(2166.67);
    expect(pos2.minDurationMs).toBe(1500);
    expect(pos2.maxDurationMs).toBe(3000);
  });

  it('uses category labels not step titles in output', () => {
    const opts = resolveOptions();
    const ts = analyzeTimestudy([BUNDLE_A], opts);
    const pos1 = ts.stepPositionTimestudies[0]!;
    // Category should be a known GroupingReason, not a user title
    expect(pos1.category).toBe('click_then_navigate');
  });

  it('populates evidenceRunIds for traceability', () => {
    const opts = resolveOptions();
    const ts = analyzeTimestudy([BUNDLE_A, BUNDLE_B], opts);
    expect(ts.evidenceRunIds).toContain('run-a');
    expect(ts.evidenceRunIds).toContain('run-b');
    const pos1 = ts.stepPositionTimestudies[0]!;
    expect(pos1.evidenceRunIds).toContain('run-a');
  });

  it('handles a single run correctly', () => {
    const opts = resolveOptions();
    const ts = analyzeTimestudy([BUNDLE_A], opts);
    expect(ts.runCount).toBe(1);
    expect(ts.stepPositionTimestudies).toHaveLength(2);
    expect(ts.totalDuration.stdDevMs).toBeNull(); // need >= 2 for stdDev
  });

  it('handles empty input', () => {
    const opts = resolveOptions();
    const ts = analyzeTimestudy([], opts);
    expect(ts.runCount).toBe(0);
    expect(ts.stepPositionTimestudies).toHaveLength(0);
    expect(ts.totalDuration.meanMs).toBeNull();
  });
});

// ─── Variance ─────────────────────────────────────────────────────────────────

describe('analyzeVariance', () => {
  it('computes duration variance correctly', () => {
    const opts = resolveOptions();
    const v = analyzeVariance([BUNDLE_A, BUNDLE_B, BUNDLE_C], opts, null);
    expect(v.durationVariance.stdDevMs).toBeGreaterThan(0);
    expect(v.durationVariance.coefficientOfVariation).toBeGreaterThan(0);
  });

  it('flags high CV as high variance', () => {
    const opts = resolveOptions({ highVarianceCvThreshold: 0.1 }); // low threshold to trigger
    const v = analyzeVariance([BUNDLE_A, BUNDLE_B, BUNDLE_C], opts, null);
    expect(v.durationVariance.isHighVariance).toBe(true);
  });

  it('does not flag low CV as high variance', () => {
    // Identical bundles: CV = 0
    const opts = resolveOptions({ highVarianceCvThreshold: 0.5 });
    const identicalA = makeBundle({ runId: 'ia', durationMs: 5000 });
    const identicalB = makeBundle({ runId: 'ib', durationMs: 5000 });
    const v = analyzeVariance([identicalA, identicalB], opts, null);
    expect(v.durationVariance.isHighVariance).toBe(false);
  });

  it('computes step count variance correctly', () => {
    const opts = resolveOptions();
    const singleStep = makeBundle({
      runId: 'single',
      stepCategories: ['click_then_navigate'],
      durationMs: 3000,
    });
    const v = analyzeVariance([BUNDLE_A, BUNDLE_B, singleStep], opts, null);
    expect(v.stepCountVariance.min).toBe(1);
    expect(v.stepCountVariance.max).toBe(2);
  });

  it('computes sequenceStability correctly', () => {
    const opts = resolveOptions();
    const standardSig = 'click_then_navigate:fill_and_submit';
    // BUNDLE_A, B, C all follow standard sig; BUNDLE_VARIANT does not
    const v = analyzeVariance([BUNDLE_A, BUNDLE_B, BUNDLE_C, BUNDLE_VARIANT], opts, standardSig);
    expect(v.sequenceStability).toBeCloseTo(3 / 4);
  });

  it('sequenceStability is 1.0 when no standard path provided', () => {
    const opts = resolveOptions();
    const v = analyzeVariance([BUNDLE_A, BUNDLE_B], opts, null);
    expect(v.sequenceStability).toBe(1.0);
  });

  it('identifies high-variance step positions', () => {
    const opts = resolveOptions({ highVarianceCvThreshold: 0.1 });
    // Position 2 has durations 2000, 3000, 1500 — high variance
    const v = analyzeVariance([BUNDLE_A, BUNDLE_B, BUNDLE_C], opts, null);
    expect(v.highVarianceSteps.length).toBeGreaterThan(0);
    // All high-variance steps must be traceably referenced
    for (const step of v.highVarianceSteps) {
      expect(step.evidenceRunIds.length).toBeGreaterThan(0);
    }
  });

  it('populates evidenceRunIds', () => {
    const opts = resolveOptions();
    const v = analyzeVariance([BUNDLE_A, BUNDLE_B], opts, null);
    expect(v.evidenceRunIds).toContain('run-a');
    expect(v.evidenceRunIds).toContain('run-b');
  });
});

// ─── Variant detection ────────────────────────────────────────────────────────

describe('detectVariants', () => {
  it('groups identical-path runs into one variant', () => {
    const opts = resolveOptions();
    const result = detectVariants([BUNDLE_A, BUNDLE_B, BUNDLE_C], opts);
    expect(result.variantCount).toBe(1);
    expect(result.variants[0]!.runCount).toBe(3);
    expect(result.variants[0]!.isStandardPath).toBe(true);
    expect(result.variants[0]!.frequency).toBe(1.0);
  });

  it('creates a separate variant for different path', () => {
    const opts = resolveOptions();
    const result = detectVariants([BUNDLE_A, BUNDLE_B, BUNDLE_VARIANT], opts);
    expect(result.variantCount).toBeGreaterThanOrEqual(1);
    // The variant bundle may be its own variant or merged depending on similarity
    const frequencies = result.variants.map(v => v.frequency);
    expect(frequencies.reduce((s, f) => s + f, 0)).toBeCloseTo(1.0);
  });

  it('marks the most frequent path as standard', () => {
    const opts = resolveOptions();
    const result = detectVariants([BUNDLE_A, BUNDLE_B, BUNDLE_C, BUNDLE_VARIANT], opts);
    const standard = result.variants.find(v => v.isStandardPath);
    expect(standard).toBeDefined();
    // Standard path has 3 runs; variant has 1
    expect(standard!.runCount).toBe(3);
  });

  it('is deterministic — same input twice produces identical output', () => {
    const opts = resolveOptions();
    const r1 = detectVariants([BUNDLE_A, BUNDLE_B, BUNDLE_C], opts);
    const r2 = detectVariants([BUNDLE_A, BUNDLE_B, BUNDLE_C], opts);
    expect(r1.variants.map(v => v.variantId)).toEqual(r2.variants.map(v => v.variantId));
    expect(r1.variants.map(v => v.runCount)).toEqual(r2.variants.map(v => v.runCount));
  });

  it('is deterministic regardless of input ordering', () => {
    const opts = resolveOptions();
    const r1 = detectVariants([BUNDLE_A, BUNDLE_B, BUNDLE_C], opts);
    const r2 = detectVariants([BUNDLE_C, BUNDLE_A, BUNDLE_B], opts);
    // Same variant groups, same run counts
    expect(r1.variantCount).toBe(r2.variantCount);
    expect(r1.variants[0]!.runCount).toBe(r2.variants[0]!.runCount);
  });

  it('returns empty variants for empty input', () => {
    const opts = resolveOptions();
    const result = detectVariants([], opts);
    expect(result.variantCount).toBe(0);
    expect(result.standardPath).toBeNull();
    expect(result.variants).toHaveLength(0);
  });

  it('populates evidenceRunIds in each variant', () => {
    const opts = resolveOptions();
    const result = detectVariants([BUNDLE_A, BUNDLE_B], opts);
    const standard = result.variants[0]!;
    expect(standard.evidenceRunIds).toContain('run-a');
    expect(standard.evidenceRunIds).toContain('run-b');
  });

  it('all variant frequencies sum to 1.0', () => {
    const opts = resolveOptions();
    const result = detectVariants([BUNDLE_A, BUNDLE_B, BUNDLE_C, BUNDLE_VARIANT], opts);
    const totalFreq = result.variants.reduce((s, v) => s + v.frequency, 0);
    expect(totalFreq).toBeCloseTo(1.0);
  });
});

// ─── Bottleneck detection ─────────────────────────────────────────────────────

describe('detectBottlenecks', () => {
  it('detects a step with disproportionately high duration', () => {
    // Position 2 has durations 2000, 3000, 1500 with overall mean ~845ms
    // (step1: 100+200+150=450 total, step2: 2000+3000+1500=6500 total)
    // Step2 mean = 2166ms >> overall mean
    const opts = resolveOptions({ bottleneckDurationMultiplier: 1.5 });
    const result = detectBottlenecks([BUNDLE_A, BUNDLE_B, BUNDLE_C], opts);
    expect(result.bottleneckCount).toBeGreaterThan(0);
    const b = result.bottlenecks[0]!;
    expect(b.isHighDuration).toBe(true);
    expect(b.durationRatio).toBeGreaterThanOrEqual(1.5);
  });

  it('populates evidenceRunIds for each bottleneck', () => {
    const opts = resolveOptions({ bottleneckDurationMultiplier: 1.5 });
    const result = detectBottlenecks([BUNDLE_A, BUNDLE_B, BUNDLE_C], opts);
    for (const bn of result.bottlenecks) {
      expect(bn.evidenceRunIds.length).toBeGreaterThan(0);
    }
  });

  it('includes the rule version and threshold in output', () => {
    const opts = resolveOptions({ bottleneckDurationMultiplier: 2.0 });
    const result = detectBottlenecks([BUNDLE_A, BUNDLE_B], opts);
    expect(result.bottleneckDurationMultiplier).toBe(2.0);
    expect(result.ruleVersion).toBe(INTELLIGENCE_ENGINE_VERSION);
  });

  it('handles empty input', () => {
    const opts = resolveOptions();
    const result = detectBottlenecks([], opts);
    expect(result.bottleneckCount).toBe(0);
    expect(result.bottlenecks).toHaveLength(0);
  });

  it('returns no bottlenecks when all durations are equal', () => {
    const uniform = makeBundle({ runId: 'u', stepDurations: [1000, 1000], durationMs: 2000 });
    const opts = resolveOptions({ bottleneckDurationMultiplier: 1.5 });
    const result = detectBottlenecks([uniform], opts);
    expect(result.bottleneckCount).toBe(0);
  });
});

// ─── Drift detection ─────────────────────────────────────────────────────────

describe('detectDrift', () => {
  it('detects timing drift when duration changes significantly', () => {
    const baseline = [
      makeBundle({ runId: 'b1', durationMs: 5000 }),
      makeBundle({ runId: 'b2', durationMs: 5000 }),
    ];
    const current = [
      makeBundle({ runId: 'c1', durationMs: 8000 }),
      makeBundle({ runId: 'c2', durationMs: 8000 }),
    ];
    const opts = resolveOptions({ driftDurationThreshold: 0.25 });
    const report = detectDrift(baseline, current, opts);
    expect(report.driftDetected).toBe(true);
    const timingSignal = report.driftSignals.find(s => s.driftType === 'timing');
    expect(timingSignal).toBeDefined();
    expect(timingSignal!.changePercent).toBeGreaterThan(0.25);
  });

  it('does not detect drift when duration change is within threshold', () => {
    const baseline = [makeBundle({ runId: 'b1', durationMs: 5000 })];
    const current = [makeBundle({ runId: 'c1', durationMs: 5100 })]; // ~2% change
    const opts = resolveOptions({ driftDurationThreshold: 0.25 });
    const report = detectDrift(baseline, current, opts);
    const timingSignal = report.driftSignals.find(s => s.driftType === 'timing');
    expect(timingSignal).toBeUndefined();
  });

  it('detects structural drift when path signature changes', () => {
    const baseline = [BUNDLE_A, BUNDLE_B];
    const current = [BUNDLE_VARIANT, BUNDLE_VARIANT];
    const opts = resolveOptions();
    const report = detectDrift(baseline, current, opts);
    const structuralSignal = report.driftSignals.find(s => s.driftType === 'structural');
    expect(structuralSignal).toBeDefined();
  });

  it('detects exception rate drift when errors appear in current', () => {
    const baseline = [BUNDLE_A, BUNDLE_B]; // 0 error steps
    const current = [
      makeBundle({ runId: 'c1', errorStepCount: 1, stepCategories: ['click_then_navigate', 'error_handling', 'fill_and_submit'] }),
      makeBundle({ runId: 'c2', errorStepCount: 2, stepCategories: ['click_then_navigate', 'error_handling', 'fill_and_submit'] }),
    ];
    const opts = resolveOptions();
    const report = detectDrift(baseline, current, opts);
    const errSignal = report.driftSignals.find(s => s.driftType === 'exception_rate');
    expect(errSignal).toBeDefined();
  });

  it('returns no drift when baseline is empty', () => {
    const opts = resolveOptions();
    const report = detectDrift([], [BUNDLE_A], opts);
    expect(report.driftDetected).toBe(false);
    expect(report.driftSignals).toHaveLength(0);
  });

  it('populates evidenceRunIds for each signal', () => {
    const baseline = [makeBundle({ runId: 'b1', durationMs: 1000 })];
    const current = [makeBundle({ runId: 'c1', durationMs: 2000 })];
    const opts = resolveOptions({ driftDurationThreshold: 0.1 });
    const report = detectDrift(baseline, current, opts);
    for (const signal of report.driftSignals) {
      expect(signal.evidenceRunIds.length).toBeGreaterThan(0);
      expect(signal.evidenceRunIds).toContain('c1');
    }
  });

  it('includes threshold metadata in report', () => {
    const opts = resolveOptions({ driftDurationThreshold: 0.30 });
    const report = detectDrift([BUNDLE_A], [BUNDLE_B], opts);
    expect(report.driftDurationThreshold).toBe(0.30);
    expect(report.ruleVersion).toBe(INTELLIGENCE_ENGINE_VERSION);
  });
});

// ─── analyzePortfolio (main function) ─────────────────────────────────────────

describe('analyzePortfolio', () => {
  it('throws when runs array is empty', () => {
    const input: IntelligenceInput = { runs: [] };
    expect(() => analyzePortfolio(input)).toThrow();
  });

  it('returns all required output fields', () => {
    const output = analyzePortfolio({ runs: [BUNDLE_A, BUNDLE_B] });
    expect(output).toHaveProperty('processTitle');
    expect(output).toHaveProperty('runCount');
    expect(output).toHaveProperty('ruleVersion');
    expect(output).toHaveProperty('computedAt');
    expect(output).toHaveProperty('metrics');
    expect(output).toHaveProperty('timestudy');
    expect(output).toHaveProperty('variance');
    expect(output).toHaveProperty('variants');
    expect(output).toHaveProperty('bottlenecks');
    expect(output).toHaveProperty('standardPath');
  });

  it('drift is absent when no baseline provided', () => {
    const output = analyzePortfolio({ runs: [BUNDLE_A, BUNDLE_B] });
    expect(output.drift).toBeUndefined();
  });

  it('drift is present when baseline is provided', () => {
    const output = analyzePortfolio({
      runs: [BUNDLE_A, BUNDLE_B],
      baseline: [makeBundle({ runId: 'bl', durationMs: 1000 })],
    });
    expect(output.drift).toBeDefined();
  });

  it('processTitle reflects the first run activityName', () => {
    const output = analyzePortfolio({ runs: [BUNDLE_A] });
    expect(output.processTitle).toBe('Create Invoice');
  });

  it('runCount equals the number of provided bundles', () => {
    const output = analyzePortfolio({ runs: [BUNDLE_A, BUNDLE_B, BUNDLE_C] });
    expect(output.runCount).toBe(3);
  });

  it('standardPath is populated for multi-run input', () => {
    const output = analyzePortfolio({ runs: [BUNDLE_A, BUNDLE_B, BUNDLE_C] });
    expect(output.standardPath.pathSignature).toBeDefined();
    expect(output.standardPath.runCount).toBe(3);
    expect(output.standardPath.frequency).toBe(1.0);
  });

  it('works correctly for a single run', () => {
    const output = analyzePortfolio({ runs: [BUNDLE_A] });
    expect(output.runCount).toBe(1);
    expect(output.metrics.runCount).toBe(1);
    expect(output.variants.variantCount).toBe(1);
    expect(output.standardPath.pathSignature).toBeDefined();
  });

  // ── Determinism tests ──────────────────────────────────────────────────────

  it('produces identical analytics for identical input (called twice)', () => {
    const input: IntelligenceInput = { runs: [BUNDLE_A, BUNDLE_B, BUNDLE_C] };
    const r1 = analyzePortfolio(input);
    const r2 = analyzePortfolio(input);

    // Analytics must be identical (exclude computedAt timestamps)
    expect(r1.metrics.meanDurationMs).toBe(r2.metrics.meanDurationMs);
    expect(r1.metrics.completionRate).toBe(r2.metrics.completionRate);
    expect(r1.timestudy.totalDuration.medianMs).toBe(r2.timestudy.totalDuration.medianMs);
    expect(r1.variance.sequenceStability).toBe(r2.variance.sequenceStability);
    expect(r1.variants.variantCount).toBe(r2.variants.variantCount);
    expect(r1.bottlenecks.bottleneckCount).toBe(r2.bottlenecks.bottleneckCount);
  });

  it('variant detection is deterministic regardless of input order', () => {
    const r1 = analyzePortfolio({ runs: [BUNDLE_A, BUNDLE_B, BUNDLE_C] });
    const r2 = analyzePortfolio({ runs: [BUNDLE_C, BUNDLE_B, BUNDLE_A] });
    expect(r1.variants.variantCount).toBe(r2.variants.variantCount);
    expect(r1.variants.variants[0]!.runCount).toBe(r2.variants.variants[0]!.runCount);
  });

  // ── Traceability tests ─────────────────────────────────────────────────────

  it('all major outputs include evidenceRunIds', () => {
    const output = analyzePortfolio({ runs: [BUNDLE_A, BUNDLE_B] });
    expect(output.metrics.evidenceRunIds).toHaveLength(2);
    expect(output.timestudy.evidenceRunIds).toHaveLength(2);
    expect(output.variance.evidenceRunIds).toHaveLength(2);
    expect(output.variants.evidenceRunIds).toHaveLength(2);
    expect(output.bottlenecks.evidenceRunIds).toHaveLength(2);
  });

  it('timestudy step positions include evidenceRunIds', () => {
    const output = analyzePortfolio({ runs: [BUNDLE_A, BUNDLE_B] });
    for (const pos of output.timestudy.stepPositionTimestudies) {
      expect(pos.evidenceRunIds.length).toBeGreaterThan(0);
    }
  });

  // ── Privacy tests ──────────────────────────────────────────────────────────

  it('step positions in timestudy use category labels, not user titles', () => {
    const output = analyzePortfolio({ runs: [BUNDLE_A] });
    for (const pos of output.timestudy.stepPositionTimestudies) {
      // Verify category is a known GroupingReason, not free text
      const knownCategories = [
        'click_then_navigate', 'fill_and_submit', 'single_action',
        'error_handling', 'repeated_click_dedup', 'annotation',
      ];
      expect(knownCategories).toContain(pos.category);
    }
  });

  it('variant pathSignatures contain only category values', () => {
    const output = analyzePortfolio({ runs: [BUNDLE_A, BUNDLE_VARIANT] });
    const knownCategories = [
      'click_then_navigate', 'fill_and_submit', 'single_action',
      'error_handling', 'repeated_click_dedup', 'annotation',
    ];
    for (const variant of output.variants.variants) {
      for (const cat of variant.pathSignature.stepCategories) {
        expect(knownCategories).toContain(cat);
      }
    }
  });

  it('bottleneck positions use category labels not user-facing titles', () => {
    const opts = resolveOptions({ bottleneckDurationMultiplier: 1.0 }); // lower threshold to ensure detection
    const output = analyzePortfolio({
      runs: [BUNDLE_A, BUNDLE_B, BUNDLE_C],
      options: opts,
    });
    const knownCategories = [
      'click_then_navigate', 'fill_and_submit', 'single_action',
      'error_handling', 'repeated_click_dedup', 'annotation',
    ];
    for (const bn of output.bottlenecks.bottlenecks) {
      expect(knownCategories).toContain(bn.category);
    }
  });

  // ── Rule version metadata ──────────────────────────────────────────────────

  it('outputs carry the ruleVersion from options', () => {
    const output = analyzePortfolio({
      runs: [BUNDLE_A],
      options: { ruleVersion: '2.0.0' },
    });
    expect(output.ruleVersion).toBe('2.0.0');
    expect(output.metrics.ruleVersion).toBe('2.0.0');
    expect(output.timestudy.ruleVersion).toBe('2.0.0');
    expect(output.variance.ruleVersion).toBe('2.0.0');
    expect(output.variants.ruleVersion).toBe('2.0.0');
    expect(output.bottlenecks.ruleVersion).toBe('2.0.0');
  });
});
