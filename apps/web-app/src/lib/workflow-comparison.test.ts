import { describe, it, expect } from 'vitest';
import {
  computeWorkflowComparison,
  type ComparisonWorkflowInput,
  type RoiInput,
} from './workflow-comparison';

const wf = (o: Partial<ComparisonWorkflowInput>): ComparisonWorkflowInput => ({
  id: 'wf',
  title: 'Workflow',
  runs: null,
  avgTimeMs: null,
  stepCount: null,
  systemCount: 0,
  healthOverall: 0,
  healthGated: false,
  ...o,
});

const roi = (o: Partial<RoiInput> = {}): RoiInput => ({ monthlyRuns: 20, hourlyRate: 50, ...o });

const getDelta = (c: ReturnType<typeof computeWorkflowComparison>, key: string) =>
  c.deltas.find((d) => d.key === key)!;

describe('computeWorkflowComparison — deltas', () => {
  it('computes cycle-time improvement (faster = improved) with percent', () => {
    const c = computeWorkflowComparison(
      wf({ avgTimeMs: 600_000, runs: 12 }),
      wf({ avgTimeMs: 360_000, runs: 12 }),
      roi(),
    );
    const d = getDelta(c, 'cycleTime');
    expect(d.absoluteDelta).toBe(-240_000); // after - baseline
    expect(d.percentDelta).toBe(-40); // 40% faster
    expect(d.direction).toBe('improved');
  });

  it('marks a slower "after" as degraded', () => {
    const c = computeWorkflowComparison(wf({ avgTimeMs: 100_000 }), wf({ avgTimeMs: 150_000 }), roi());
    expect(getDelta(c, 'cycleTime').direction).toBe('degraded');
  });

  it('treats runs as neutral (na), never better/worse', () => {
    const c = computeWorkflowComparison(wf({ runs: 5 }), wf({ runs: 40 }), roi());
    expect(getDelta(c, 'runs').direction).toBe('na');
    expect(getDelta(c, 'runs').absoluteDelta).toBe(35);
  });

  it('fewer steps / fewer systems = improved', () => {
    const c = computeWorkflowComparison(
      wf({ stepCount: 14, systemCount: 4 }),
      wf({ stepCount: 8, systemCount: 2 }),
      roi(),
    );
    expect(getDelta(c, 'steps').direction).toBe('improved');
    expect(getDelta(c, 'systems').direction).toBe('improved');
  });

  it('higher health = improved; equal = flat', () => {
    expect(
      getDelta(computeWorkflowComparison(wf({ healthOverall: 60 }), wf({ healthOverall: 80 }), roi()), 'health')
        .direction,
    ).toBe('improved');
    expect(
      getDelta(computeWorkflowComparison(wf({ healthOverall: 70 }), wf({ healthOverall: 70 }), roi()), 'health')
        .direction,
    ).toBe('flat');
  });

  it('na direction + gated flag when either side health is gated', () => {
    const c = computeWorkflowComparison(
      wf({ healthOverall: 60, healthGated: true }),
      wf({ healthOverall: 80 }),
      roi(),
    );
    expect(c.healthGated).toBe(true);
    expect(getDelta(c, 'health').direction).toBe('na');
  });

  it('missing values yield na direction and null deltas', () => {
    const c = computeWorkflowComparison(wf({ avgTimeMs: null }), wf({ avgTimeMs: 1000 }), roi());
    const d = getDelta(c, 'cycleTime');
    expect(d.direction).toBe('na');
    expect(d.absoluteDelta).toBeNull();
    expect(d.percentDelta).toBeNull();
  });
});

describe('computeWorkflowComparison — ROI (honest)', () => {
  it('computes monthly + annual savings from observed time saved × assumptions', () => {
    // 4 min saved per run, 30 runs/month, $60/hr
    const c = computeWorkflowComparison(
      wf({ avgTimeMs: 600_000, runs: 12 }),
      wf({ avgTimeMs: 360_000, runs: 12 }),
      roi({ monthlyRuns: 30, hourlyRate: 60 }),
    );
    // 240_000ms × 30 / 3_600_000 = 2.0 hrs/mo
    expect(c.roi.timeSavedPerRunMs).toBe(240_000);
    expect(c.roi.monthlyHoursSaved).toBe(2);
    expect(c.roi.monthlyDollarsSaved).toBe(120); // 2 × 60
    expect(c.roi.annualHoursSaved).toBe(24);
    expect(c.roi.annualDollarsSaved).toBe(1440);
    expect(c.roi.slower).toBe(false);
  });

  it('returns NO fabricated savings when the after process is slower', () => {
    const c = computeWorkflowComparison(wf({ avgTimeMs: 100_000 }), wf({ avgTimeMs: 150_000 }), roi());
    expect(c.roi.slower).toBe(true);
    expect(c.roi.monthlyHoursSaved).toBeNull();
    expect(c.roi.monthlyDollarsSaved).toBeNull();
    expect(c.roi.annualDollarsSaved).toBeNull();
  });

  it('returns null savings when a side is untimed or inputs invalid', () => {
    expect(
      computeWorkflowComparison(wf({ avgTimeMs: null }), wf({ avgTimeMs: 1000 }), roi()).roi.monthlyHoursSaved,
    ).toBeNull();
    expect(
      computeWorkflowComparison(wf({ avgTimeMs: 2000 }), wf({ avgTimeMs: 1000 }), roi({ monthlyRuns: 0 })).roi
        .monthlyHoursSaved,
    ).toBeNull();
  });
});

describe('computeWorkflowComparison — confidence + determinism', () => {
  it('gates confidence on the smaller run count', () => {
    expect(computeWorkflowComparison(wf({ runs: 12 }), wf({ runs: 40 }), roi()).confidence).toBe('high');
    expect(computeWorkflowComparison(wf({ runs: 12 }), wf({ runs: 3 }), roi()).confidence).toBe('medium');
    expect(computeWorkflowComparison(wf({ runs: 12 }), wf({ runs: 1 }), roi()).confidence).toBe('low');
  });

  it('is deterministic — same inputs → byte-identical output', () => {
    const a = computeWorkflowComparison(wf({ avgTimeMs: 5000, runs: 8 }), wf({ avgTimeMs: 3000, runs: 9 }), roi());
    const b = computeWorkflowComparison(wf({ avgTimeMs: 5000, runs: 8 }), wf({ avgTimeMs: 3000, runs: 9 }), roi());
    expect(a).toEqual(b);
  });
});
