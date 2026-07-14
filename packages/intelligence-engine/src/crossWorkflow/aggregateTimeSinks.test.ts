import { describe, it, expect } from 'vitest';
import {
  aggregateTimeSinks,
  TIME_SINK_MODEL_VERSION,
  type TimeSinkInput,
} from './aggregateTimeSinks.js';
import type { BottleneckReport, BottleneckStep, TimestudyResult, StepPositionTimestudy } from '../types.js';

// ─── Fixture builders ─────────────────────────────────────────────────────────

function bottleneckStep(overrides: Partial<BottleneckStep> = {}): BottleneckStep {
  return {
    position: 1,
    category: 'form_fill',
    meanDurationMs: 9000,
    overallMeanStepDurationMs: 3000,
    durationRatio: 3,
    isHighDuration: true,
    isHighVariance: false,
    coefficientOfVariation: 0.2,
    runCount: 5,
    evidenceRunIds: ['run-b', 'run-a'],
    ...overrides,
  };
}

function bottleneckReport(steps: BottleneckStep[]): BottleneckReport {
  return {
    ruleVersion: '1.0.0',
    runCount: 5,
    computedAt: '2026-01-01T00:00:00.000Z',
    bottleneckCount: steps.length,
    bottlenecks: steps,
    bottleneckDurationMultiplier: 1.5,
    highVarianceCvThreshold: 0.5,
    evidenceRunIds: ['run-a', 'run-b'],
  };
}

function positionTimestudy(overrides: Partial<StepPositionTimestudy> = {}): StepPositionTimestudy {
  return {
    position: 1,
    category: 'form_fill',
    runCount: 5,
    meanDurationMs: 9000,
    medianDurationMs: 8800,
    minDurationMs: 6000,
    maxDurationMs: 12000,
    p90DurationMs: 11000,
    stdDevMs: 1500,
    evidenceRunIds: ['run-a', 'run-b'],
    ...overrides,
  };
}

function timestudyResult(positions: StepPositionTimestudy[]): TimestudyResult {
  return {
    ruleVersion: '1.0.0',
    runCount: 5,
    computedAt: '2026-01-01T00:00:00.000Z',
    totalDuration: {
      meanMs: 20000,
      medianMs: 19000,
      p90Ms: 25000,
      minMs: 15000,
      maxMs: 30000,
      stdDevMs: 3000,
    },
    stepPositionTimestudies: positions,
    evidenceRunIds: ['run-a', 'run-b'],
  };
}

function input(overrides: Partial<TimeSinkInput> = {}): TimeSinkInput {
  return {
    workflowId: 'wf-1',
    title: 'Process invoice',
    runCount: 10,
    timestudy: timestudyResult([positionTimestudy()]),
    bottlenecks: bottleneckReport([bottleneckStep()]),
    avgDurationMs: 20000,
    evidenceRunIds: ['run-a', 'run-b'],
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('aggregateTimeSinks — empty guard', () => {
  it('returns an empty ranked list and zeroed totals for zero workflows', () => {
    const report = aggregateTimeSinks([]);
    expect(report.ranked).toEqual([]);
    expect(report.totals).toEqual({ totalTimeMs: 0, workflowCount: 0, coveredWorkflowCount: 0 });
    expect(report.version).toBe(TIME_SINK_MODEL_VERSION);
  });
});

describe('aggregateTimeSinks — ranking correctness', () => {
  it('ranks workflows by aggregateTimeMs (avgDurationMs × runCount) descending', () => {
    const a = input({ workflowId: 'wf-a', avgDurationMs: 1000, runCount: 10 }); // 10,000
    const b = input({ workflowId: 'wf-b', avgDurationMs: 5000, runCount: 10 }); // 50,000
    const c = input({ workflowId: 'wf-c', avgDurationMs: 2000, runCount: 10 }); // 20,000

    const report = aggregateTimeSinks([a, b, c]);

    expect(report.ranked.map((e) => e.workflowId)).toEqual(['wf-b', 'wf-c', 'wf-a']);
    expect(report.ranked[0]!.aggregateTimeMs).toBe(50000);
    expect(report.ranked[1]!.aggregateTimeMs).toBe(20000);
    expect(report.ranked[2]!.aggregateTimeMs).toBe(10000);
  });

  it('tie-breaks equal aggregateTimeMs by workflowId ascending', () => {
    const a = input({ workflowId: 'wf-z', avgDurationMs: 1000, runCount: 10 });
    const b = input({ workflowId: 'wf-a', avgDurationMs: 1000, runCount: 10 });

    const report = aggregateTimeSinks([a, b]);
    expect(report.ranked.map((e) => e.workflowId)).toEqual(['wf-a', 'wf-z']);
  });
});

describe('aggregateTimeSinks — percentage-of-portfolio-time', () => {
  it('sums pctOfPortfolioTime to ~100 across the covered set', () => {
    const a = input({ workflowId: 'wf-a', avgDurationMs: 1000, runCount: 10 });
    const b = input({ workflowId: 'wf-b', avgDurationMs: 3000, runCount: 10 });
    const c = input({ workflowId: 'wf-c', avgDurationMs: 6000, runCount: 10 });

    const report = aggregateTimeSinks([a, b, c]);
    const total = report.ranked.reduce((sum, e) => sum + e.pctOfPortfolioTime, 0);
    expect(total).toBeCloseTo(100, 6);
  });

  it('excludes uncovered (null-timing) workflows from the percentage denominator', () => {
    const covered = input({ workflowId: 'wf-covered', avgDurationMs: 1000, runCount: 10 }); // 10,000
    const uncovered = input({ workflowId: 'wf-uncovered', avgDurationMs: null, runCount: 5 });

    const report = aggregateTimeSinks([covered, uncovered]);
    const coveredEntry = report.ranked.find((e) => e.workflowId === 'wf-covered')!;
    const uncoveredEntry = report.ranked.find((e) => e.workflowId === 'wf-uncovered')!;

    expect(coveredEntry.pctOfPortfolioTime).toBe(100);
    expect(uncoveredEntry.pctOfPortfolioTime).toBe(0);
    expect(report.totals.totalTimeMs).toBe(10000);
  });
});

describe('aggregateTimeSinks — null-timing handling', () => {
  it('includes a workflow with avgDurationMs=null, aggregateTimeMs 0, hasTimingData false', () => {
    const nullTiming = input({ workflowId: 'wf-null', avgDurationMs: null });
    const report = aggregateTimeSinks([nullTiming]);

    expect(report.ranked).toHaveLength(1);
    const entry = report.ranked[0]!;
    expect(entry.aggregateTimeMs).toBe(0);
    expect(entry.hasTimingData).toBe(false);
    expect(entry.pctOfPortfolioTime).toBe(0);
    expect(report.totals.coveredWorkflowCount).toBe(0);
    expect(report.totals.workflowCount).toBe(1);
  });

  it('treats runCount=0 as uncovered even when avgDurationMs is present', () => {
    const zeroRuns = input({ workflowId: 'wf-zero-runs', avgDurationMs: 5000, runCount: 0 });
    const report = aggregateTimeSinks([zeroRuns]);
    expect(report.ranked[0]!.hasTimingData).toBe(false);
    expect(report.ranked[0]!.aggregateTimeMs).toBe(0);
  });

  it('handles a null bottlenecks report without crashing (topBottleneck + range both null)', () => {
    const noBottlenecks = input({ workflowId: 'wf-no-bn', bottlenecks: null });
    const report = aggregateTimeSinks([noBottlenecks]);
    expect(report.ranked[0]!.topBottleneck).toBeNull();
    expect(report.ranked[0]!.stepDurationRange).toBeNull();
  });

  it('handles an empty bottlenecks array without crashing', () => {
    const emptyBottlenecks = input({ workflowId: 'wf-empty-bn', bottlenecks: bottleneckReport([]) });
    const report = aggregateTimeSinks([emptyBottlenecks]);
    expect(report.ranked[0]!.topBottleneck).toBeNull();
    expect(report.ranked[0]!.stepDurationRange).toBeNull();
  });

  it('handles a null timestudy report — stepDurationRange null even with a bottleneck present', () => {
    const noTimestudy = input({ workflowId: 'wf-no-ts', timestudy: null });
    const report = aggregateTimeSinks([noTimestudy]);
    expect(report.ranked[0]!.topBottleneck).not.toBeNull();
    expect(report.ranked[0]!.stepDurationRange).toBeNull();
  });

  it('does not crash across a fully-mixed set of covered/uncovered workflows', () => {
    const inputs = [
      input({ workflowId: 'wf-1', avgDurationMs: 1000, runCount: 5 }),
      input({ workflowId: 'wf-2', avgDurationMs: null, runCount: 0, timestudy: null, bottlenecks: null, evidenceRunIds: [] }),
      input({ workflowId: 'wf-3', avgDurationMs: 2000, runCount: 3, bottlenecks: null }),
    ];
    expect(() => aggregateTimeSinks(inputs)).not.toThrow();
    const report = aggregateTimeSinks(inputs);
    expect(report.ranked).toHaveLength(3);
    expect(report.totals.workflowCount).toBe(3);
    expect(report.totals.coveredWorkflowCount).toBe(2);
  });
});

describe('aggregateTimeSinks — topBottleneck derivation', () => {
  it('selects the highest-ranked bottleneck (bottlenecks are pre-sorted by the engine)', () => {
    const steps = [
      bottleneckStep({ position: 2, category: 'approval_wait', durationRatio: 4, meanDurationMs: 12000, overallMeanStepDurationMs: 3000, isHighDuration: true }),
      bottleneckStep({ position: 1, category: 'form_fill', durationRatio: 3, meanDurationMs: 9000, overallMeanStepDurationMs: 3000, isHighDuration: true }),
    ];
    const withBottlenecks = input({ bottlenecks: bottleneckReport(steps) });
    const report = aggregateTimeSinks([withBottlenecks]);
    const top = report.ranked[0]!.topBottleneck!;
    expect(top.position).toBe(2);
    expect(top.category).toBe('approval_wait');
    expect(top.durationRatio).toBe(4);
  });

  it('reports severity "high" when isHighDuration is true', () => {
    const step = bottleneckStep({ isHighDuration: true, isHighVariance: false });
    const report = aggregateTimeSinks([input({ bottlenecks: bottleneckReport([step]) })]);
    expect(report.ranked[0]!.topBottleneck!.severity).toBe('high');
  });

  it('reports severity "moderate" when only isHighVariance is true', () => {
    const step = bottleneckStep({ isHighDuration: false, isHighVariance: true });
    const report = aggregateTimeSinks([input({ bottlenecks: bottleneckReport([step]) })]);
    expect(report.ranked[0]!.topBottleneck!.severity).toBe('moderate');
  });

  it('computes delayMs as mean minus overall mean, floored at 0', () => {
    const step = bottleneckStep({ meanDurationMs: 9000, overallMeanStepDurationMs: 3000 });
    const report = aggregateTimeSinks([input({ bottlenecks: bottleneckReport([step]) })]);
    expect(report.ranked[0]!.topBottleneck!.delayMs).toBe(6000);
  });

  it('floors delayMs at 0 even if overallMean somehow exceeds the step mean', () => {
    const step = bottleneckStep({ meanDurationMs: 3000, overallMeanStepDurationMs: 9000, isHighVariance: true, isHighDuration: false });
    const report = aggregateTimeSinks([input({ bottlenecks: bottleneckReport([step]) })]);
    expect(report.ranked[0]!.topBottleneck!.delayMs).toBe(0);
  });

  it('dedupes and sorts topBottleneck.evidenceRunIds', () => {
    const step = bottleneckStep({ evidenceRunIds: ['run-b', 'run-a', 'run-a'] });
    const report = aggregateTimeSinks([input({ bottlenecks: bottleneckReport([step]) })]);
    expect(report.ranked[0]!.topBottleneck!.evidenceRunIds).toEqual(['run-a', 'run-b']);
  });
});

describe('aggregateTimeSinks — stepDurationRange join', () => {
  it('joins the range from the matching timestudy position', () => {
    const step = bottleneckStep({ position: 2 });
    const positions = [
      positionTimestudy({ position: 1, minDurationMs: 100, medianDurationMs: 200, p90DurationMs: 300, maxDurationMs: 400 }),
      positionTimestudy({ position: 2, minDurationMs: 5000, medianDurationMs: 8000, p90DurationMs: 11000, maxDurationMs: 15000 }),
    ];
    const report = aggregateTimeSinks([
      input({ bottlenecks: bottleneckReport([step]), timestudy: timestudyResult(positions) }),
    ]);
    expect(report.ranked[0]!.stepDurationRange).toEqual({
      minMs: 5000,
      medianMs: 8000,
      p90Ms: 11000,
      maxMs: 15000,
    });
  });

  it('returns null when no timestudy position matches the bottleneck position', () => {
    const step = bottleneckStep({ position: 99 });
    const report = aggregateTimeSinks([
      input({ bottlenecks: bottleneckReport([step]), timestudy: timestudyResult([positionTimestudy({ position: 1 })]) }),
    ]);
    expect(report.ranked[0]!.stepDurationRange).toBeNull();
  });
});

describe('aggregateTimeSinks — determinism / permutation-invariance', () => {
  it('produces byte-identical output across repeated calls on the same input', () => {
    const inputs = [
      input({ workflowId: 'wf-a', avgDurationMs: 1000, runCount: 5 }),
      input({ workflowId: 'wf-b', avgDurationMs: 3000, runCount: 7 }),
    ];
    const first = aggregateTimeSinks(inputs);
    const second = aggregateTimeSinks(inputs);
    expect(second).toEqual(first);
  });

  it('produces identical output regardless of input array order', () => {
    const a = input({ workflowId: 'wf-a', avgDurationMs: 1000, runCount: 5 });
    const b = input({ workflowId: 'wf-b', avgDurationMs: 3000, runCount: 7 });
    const c = input({ workflowId: 'wf-c', avgDurationMs: 2000, runCount: 4 });

    const forward = aggregateTimeSinks([a, b, c]);
    const shuffled = aggregateTimeSinks([c, a, b]);
    const reversed = aggregateTimeSinks([c, b, a]);

    expect(shuffled).toEqual(forward);
    expect(reversed).toEqual(forward);
  });

  it('does not mutate the input array or its elements', () => {
    const a = input({ workflowId: 'wf-a' });
    const snapshotEvidence = [...a.evidenceRunIds];
    aggregateTimeSinks([a]);
    expect(a.evidenceRunIds).toEqual(snapshotEvidence);
  });
});

describe('aggregateTimeSinks — entry evidence + shape', () => {
  it('dedupes and sorts each entry evidenceRunIds', () => {
    const withDupes = input({ evidenceRunIds: ['run-b', 'run-a', 'run-a', 'run-c'] });
    const report = aggregateTimeSinks([withDupes]);
    expect(report.ranked[0]!.evidenceRunIds).toEqual(['run-a', 'run-b', 'run-c']);
  });

  it('carries title, runCount, and workflowId through unchanged', () => {
    const one = input({ workflowId: 'wf-x', title: 'Onboard vendor', runCount: 42 });
    const report = aggregateTimeSinks([one]);
    expect(report.ranked[0]!.workflowId).toBe('wf-x');
    expect(report.ranked[0]!.title).toBe('Onboard vendor');
    expect(report.ranked[0]!.runCount).toBe(42);
  });
});
