import { describe, it, expect } from 'vitest';
import {
  computeWorkflowComparison,
  computeSingleWorkflowRoi,
  computeWhatIfRoi,
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

describe('computeWorkflowComparison — labor cost (volume × effort × persona)', () => {
  it('computes baseline/after labor cost per period', () => {
    // baseline 1hr/run, after 0.5hr/run, 10 runs/mo, $50/hr
    const c = computeWorkflowComparison(
      wf({ avgTimeMs: 3_600_000 }),
      wf({ avgTimeMs: 1_800_000 }),
      roi({ monthlyRuns: 10, hourlyRate: 50 }),
    );
    expect(c.roi.baselineMonthlyCost).toBe(500); // 1 × 10 × 50
    expect(c.roi.afterMonthlyCost).toBe(250); // 0.5 × 10 × 50
    expect(c.roi.baselineAnnualCost).toBe(6000);
    expect(c.roi.afterAnnualCost).toBe(3000);
    expect(c.roi.effectiveHourlyRate).toBe(50);
    // savings still computed
    expect(c.roi.monthlyDollarsSaved).toBe(250);
  });

  it('resolves persona provenance from the catalog', () => {
    const c = computeWorkflowComparison(wf({ avgTimeMs: 3_600_000 }), wf({ avgTimeMs: 1_800_000 }), roi({ personaKey: 'ops_manager' }));
    expect(c.roi.personaKey).toBe('ops_manager');
    expect(c.roi.personaLabel).toBe('Ops Manager');
  });

  it('a custom rate (no persona) yields null persona provenance', () => {
    const c = computeWorkflowComparison(wf({ avgTimeMs: 3_600_000 }), wf({ avgTimeMs: 1_800_000 }), roi());
    expect(c.roi.personaKey).toBeNull();
    expect(c.roi.personaLabel).toBeNull();
    expect(c.roi.effectiveHourlyRate).toBe(50);
  });

  it('null costs when a side is untimed or assumptions invalid', () => {
    const untimed = computeWorkflowComparison(wf({ avgTimeMs: null }), wf({ avgTimeMs: 1_800_000 }), roi());
    expect(untimed.roi.baselineMonthlyCost).toBeNull();
    expect(untimed.roi.afterMonthlyCost).toBe(500); // 0.5hr × 20 runs (default) × $50

    const zeroVol = computeWorkflowComparison(wf({ avgTimeMs: 3_600_000 }), wf({ avgTimeMs: 1_800_000 }), roi({ monthlyRuns: 0 }));
    expect(zeroVol.roi.baselineMonthlyCost).toBeNull();
    expect(zeroVol.roi.afterMonthlyCost).toBeNull();
  });

  it('still computes cost for a slower after (cost view is independent of savings)', () => {
    const c = computeWorkflowComparison(
      wf({ avgTimeMs: 1_800_000 }),
      wf({ avgTimeMs: 3_600_000 }),
      roi({ monthlyRuns: 10, hourlyRate: 50 }),
    );
    expect(c.roi.slower).toBe(true);
    expect(c.roi.monthlyDollarsSaved).toBeNull(); // no fabricated savings
    expect(c.roi.baselineMonthlyCost).toBe(250);
    expect(c.roi.afterMonthlyCost).toBe(500); // honest: after costs more
  });
});

describe('computeSingleWorkflowRoi — current labor cost', () => {
  it('computes monthly/annual cost = effort × runs × rate', () => {
    const r = computeSingleWorkflowRoi({ laborMsPerRun: 3_600_000, monthlyRuns: 10, hourlyRate: 50 });
    expect(r.monthlyHours).toBe(10);
    expect(r.monthlyCost).toBe(500);
    expect(r.annualCost).toBe(6000);
    expect(r.effectiveHourlyRate).toBe(50);
  });
  it('resolves persona and returns null cost when effort/inputs missing', () => {
    expect(computeSingleWorkflowRoi({ laborMsPerRun: 3_600_000, monthlyRuns: 10, hourlyRate: 50, personaKey: 'ap_clerk' }).personaLabel).toBe('AP / AR Clerk');
    expect(computeSingleWorkflowRoi({ laborMsPerRun: null, monthlyRuns: 10, hourlyRate: 50 }).monthlyCost).toBeNull();
    expect(computeSingleWorkflowRoi({ laborMsPerRun: 1000, monthlyRuns: 0, hourlyRate: 50 }).monthlyCost).toBeNull();
  });
});

describe('computeWhatIfRoi — projected after (remove / automate steps)', () => {
  const steps = [
    { ordinal: 1, durationMs: 1_000_000 },
    { ordinal: 2, durationMs: 2_000_000 },
    { ordinal: 3, durationMs: 3_000_000 },
  ]; // total 6,000,000ms (≈100 min)

  it('removing a step projects a faster after with positive saving', () => {
    const r = computeWhatIfRoi({ steps, removedOrdinals: [3], automatedOrdinals: [], monthlyRuns: 10, hourlyRate: 60 });
    expect(r.baselineLaborMsPerRun).toBe(6_000_000);
    expect(r.projectedLaborMsPerRun).toBe(3_000_000);
    expect(r.timeSavedPerRunMs).toBe(3_000_000);
    expect(r.reductionPct).toBe(50);
    // 6M ms/run = 1.667 hr → 16.7 hr/mo × $60 = $1002; projected 0.833 hr → 8.3 × $60 = $498
    expect(r.current.monthlyCost).toBe(1002);
    expect(r.projected.monthlyCost).toBe(498);
    expect(r.monthlyDollarsSaved).toBe(504);
    expect(r.annualDollarsSaved).toBe(6048);
  });

  it('automating a step (residual 0) removes its time too', () => {
    const r = computeWhatIfRoi({ steps, removedOrdinals: [], automatedOrdinals: [2], monthlyRuns: 10, hourlyRate: 60 });
    expect(r.projectedLaborMsPerRun).toBe(4_000_000); // 1M + 0 + 3M
    expect(r.timeSavedPerRunMs).toBe(2_000_000);
  });

  it('no change ⇒ no saving (no fabrication)', () => {
    const r = computeWhatIfRoi({ steps, removedOrdinals: [], automatedOrdinals: [], monthlyRuns: 10, hourlyRate: 60 });
    expect(r.timeSavedPerRunMs).toBe(0);
    expect(r.monthlyDollarsSaved).toBeNull();
    expect(r.reductionPct).toBe(0);
  });

  it('is deterministic', () => {
    const a = computeWhatIfRoi({ steps, removedOrdinals: [3], automatedOrdinals: [2], monthlyRuns: 7, hourlyRate: 55 });
    const b = computeWhatIfRoi({ steps, removedOrdinals: [3], automatedOrdinals: [2], monthlyRuns: 7, hourlyRate: 55 });
    expect(a).toEqual(b);
  });
});
