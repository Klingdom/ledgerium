import { describe, it, expect } from 'vitest';
import {
  computeRuns,
  computeAvgTimeMs,
  computeVariation,
  computeBottleneckLabel,
  computeHealthScoreV2,
  computeOpportunityTag,
  computeWorkflowMetrics,
  computePortfolioHealthScore,
  computeInsightChips,
} from './workflow-metrics.js';
import type { WorkflowMetricsInput, WorkflowMetricsOutput } from './workflow-metrics.js';
import {
  FIXTURE_FULL,
  FIXTURE_SINGLE_RECORDING,
  FIXTURE_SPARSE,
  FIXTURE_AUTOMATE,
  FIXTURE_MONITOR,
} from './__tests__/workflow-metrics.fixtures.js';

// ── computeRuns ───────────────────────────────────────────────────────────────

describe('computeRuns', () => {
  it('returns processDefinition.runCount when non-null and > 0', () => {
    expect(computeRuns(FIXTURE_FULL)).toBe(10);
  });

  it('returns 1 (floor) when processDefinition is null and stepCount is non-null', () => {
    expect(computeRuns(FIXTURE_SINGLE_RECORDING)).toBe(1);
  });

  it('returns null when processDefinition is null AND stepCount is null', () => {
    expect(computeRuns(FIXTURE_MONITOR)).toBeNull();
  });

  it('returns null when processDefinition exists but runCount is 0', () => {
    const input: WorkflowMetricsInput = {
      ...FIXTURE_FULL,
      processDefinition: { ...FIXTURE_FULL.processDefinition!, runCount: 0 },
    };
    expect(computeRuns(input)).toBeNull();
  });

  it('never returns 0 (null floor per §7.1)', () => {
    // Every call must return either a positive integer or null
    for (const fixture of [FIXTURE_FULL, FIXTURE_SINGLE_RECORDING, FIXTURE_SPARSE, FIXTURE_AUTOMATE, FIXTURE_MONITOR]) {
      const result = computeRuns(fixture);
      expect(result === null || result > 0).toBe(true);
    }
  });
});

// ── computeAvgTimeMs ─────────────────────────────────────────────────────────

describe('computeAvgTimeMs', () => {
  it('returns processDefinition.avgDurationMs as highest priority', () => {
    expect(computeAvgTimeMs(FIXTURE_FULL)).toBe(115_000);
  });

  it('falls back to medianDurationMs when avgDurationMs is null', () => {
    const input: WorkflowMetricsInput = {
      ...FIXTURE_FULL,
      processDefinition: { ...FIXTURE_FULL.processDefinition!, avgDurationMs: null },
    };
    expect(computeAvgTimeMs(input)).toBe(110_000);
  });

  it('falls back to workflow.durationMs when processDefinition is null', () => {
    expect(computeAvgTimeMs(FIXTURE_SINGLE_RECORDING)).toBe(90_000);
  });

  it('returns null when all sources are null', () => {
    expect(computeAvgTimeMs(FIXTURE_MONITOR)).toBeNull();
  });

  it('returns null for FIXTURE_SPARSE (durationMs null, no processDefinition)', () => {
    expect(computeAvgTimeMs(FIXTURE_SPARSE)).toBeNull();
  });
});

// ── computeVariation ─────────────────────────────────────────────────────────

describe('computeVariation', () => {
  it('uses 1 - stabilityScore when stabilityScore is non-null', () => {
    // FIXTURE_FULL: stabilityScore=0.8 → score=0.2, label='low'
    const { score, label } = computeVariation(FIXTURE_FULL);
    expect(score).toBeCloseTo(0.2);
    expect(label).toBe('low');
  });

  it('uses variantCount/10 when stabilityScore is null but variantCount > 0', () => {
    const input: WorkflowMetricsInput = {
      ...FIXTURE_FULL,
      processDefinition: {
        ...FIXTURE_FULL.processDefinition!,
        stabilityScore: null,
        variantCount: 5,
      },
    };
    const { score, label } = computeVariation(input);
    expect(score).toBeCloseTo(0.5);
    expect(label).toBe('medium');
  });

  it('caps variantCount proxy at 1', () => {
    const input: WorkflowMetricsInput = {
      ...FIXTURE_FULL,
      processDefinition: {
        ...FIXTURE_FULL.processDefinition!,
        stabilityScore: null,
        variantCount: 15,
      },
    };
    const { score } = computeVariation(input);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('uses 1 - confidence when processDefinition is null', () => {
    // FIXTURE_SINGLE_RECORDING: confidence=0.72, processDefinition=null → score=0.28
    const { score, label } = computeVariation(FIXTURE_SINGLE_RECORDING);
    expect(score).toBeCloseTo(0.28);
    expect(label).toBe('low');
  });

  it('defaults to 0.5 when all sources are null', () => {
    const { score, label } = computeVariation(FIXTURE_MONITOR);
    expect(score).toBe(0.5);
    expect(label).toBe('medium');
  });

  it('FIXTURE_AUTOMATE: stabilityScore=0.2 → variationScore=0.8, label=high', () => {
    const { score, label } = computeVariation(FIXTURE_AUTOMATE);
    expect(score).toBeCloseTo(0.8);
    expect(label).toBe('high');
  });

  // Boundary values for label buckets
  it('label boundary: score=0.33 → low', () => {
    const input: WorkflowMetricsInput = {
      ...FIXTURE_FULL,
      processDefinition: { ...FIXTURE_FULL.processDefinition!, stabilityScore: 0.67 },
    };
    const { score, label } = computeVariation(input);
    expect(score).toBeCloseTo(0.33);
    expect(label).toBe('low');
  });

  it('label boundary: score >= 0.34 → medium (value just above lower threshold)', () => {
    // stabilityScore=0.65 → score = 1 - 0.65 = 0.35 (>= 0.34 and < 0.67 → medium)
    const input: WorkflowMetricsInput = {
      ...FIXTURE_FULL,
      processDefinition: { ...FIXTURE_FULL.processDefinition!, stabilityScore: 0.65 },
    };
    const { score, label } = computeVariation(input);
    expect(score).toBeCloseTo(0.35);
    expect(label).toBe('medium');
  });

  it('label boundary: score=0.66 → medium', () => {
    const input: WorkflowMetricsInput = {
      ...FIXTURE_FULL,
      processDefinition: { ...FIXTURE_FULL.processDefinition!, stabilityScore: 0.34 },
    };
    const { score, label } = computeVariation(input);
    expect(score).toBeCloseTo(0.66);
    expect(label).toBe('medium');
  });

  it('label boundary: score >= 0.67 → high (value just above threshold)', () => {
    // stabilityScore=0.32 → score = 1 - 0.32 = 0.68 (>= 0.67 → high)
    const input: WorkflowMetricsInput = {
      ...FIXTURE_FULL,
      processDefinition: { ...FIXTURE_FULL.processDefinition!, stabilityScore: 0.32 },
    };
    const { score, label } = computeVariation(input);
    expect(score).toBeCloseTo(0.68);
    expect(label).toBe('high');
  });
});

// ── computeBottleneckLabel ────────────────────────────────────────────────────

describe('computeBottleneckLabel', () => {
  it('returns null when no bottleneck or delay insights exist', () => {
    expect(computeBottleneckLabel(FIXTURE_SINGLE_RECORDING)).toBeNull();
    expect(computeBottleneckLabel(FIXTURE_MONITOR)).toBeNull();
    expect(computeBottleneckLabel(FIXTURE_SPARSE)).toBeNull();
  });

  it('returns the highest-severity bottleneck title', () => {
    expect(computeBottleneckLabel(FIXTURE_FULL)).toBe('Salesforce data entry step');
  });

  it('truncates title to 30 characters when longer', () => {
    const input: WorkflowMetricsInput = {
      ...FIXTURE_FULL,
      processInsights: [
        {
          insightType: 'bottleneck',
          severity: 'critical',
          title: 'This is a very long bottleneck title that exceeds 30 chars',
          observedValue: null,
        },
      ],
    };
    const label = computeBottleneckLabel(input);
    expect(label).not.toBeNull();
    expect(label!.length).toBe(30);
    expect(label).toBe('This is a very long bottleneck');
  });

  it('returns highest-severity insight when multiple exist', () => {
    const input: WorkflowMetricsInput = {
      ...FIXTURE_FULL,
      processInsights: [
        { insightType: 'bottleneck', severity: 'info', title: 'Low severity step', observedValue: null },
        { insightType: 'delay', severity: 'critical', title: 'Critical delay step', observedValue: null },
        { insightType: 'bottleneck', severity: 'warning', title: 'Warning step', observedValue: null },
      ],
    };
    expect(computeBottleneckLabel(input)).toBe('Critical delay step');
  });

  it('ignores non-bottleneck/non-delay insight types', () => {
    const input: WorkflowMetricsInput = {
      ...FIXTURE_SINGLE_RECORDING,
      processInsights: [
        { insightType: 'variance', severity: 'critical', title: 'Variance insight', observedValue: null },
      ],
    };
    expect(computeBottleneckLabel(input)).toBeNull();
  });
});

// ── computeHealthScoreV2 ──────────────────────────────────────────────────────

describe('computeHealthScoreV2', () => {
  it('overall equals sum of sub-scores (integrity check) — FIXTURE_FULL', () => {
    const hs = computeHealthScoreV2(FIXTURE_FULL);
    expect(hs.overall).toBe(hs.efficiency + hs.consistency + hs.reliability + hs.standardization);
  });

  it('overall is in range [0, 100] for all fixtures', () => {
    for (const fixture of [FIXTURE_FULL, FIXTURE_SINGLE_RECORDING, FIXTURE_SPARSE, FIXTURE_AUTOMATE, FIXTURE_MONITOR]) {
      const hs = computeHealthScoreV2(fixture);
      expect(hs.overall).toBeGreaterThanOrEqual(0);
      expect(hs.overall).toBeLessThanOrEqual(100);
    }
  });

  it('overall equals sum of sub-scores for all fixtures', () => {
    for (const fixture of [FIXTURE_FULL, FIXTURE_SINGLE_RECORDING, FIXTURE_SPARSE, FIXTURE_AUTOMATE, FIXTURE_MONITOR]) {
      const hs = computeHealthScoreV2(fixture);
      expect(hs.overall).toBe(hs.efficiency + hs.consistency + hs.reliability + hs.standardization);
    }
  });

  it('isGated is always false from engine (route sets it)', () => {
    for (const fixture of [FIXTURE_FULL, FIXTURE_SINGLE_RECORDING, FIXTURE_SPARSE]) {
      expect(computeHealthScoreV2(fixture).isGated).toBe(false);
    }
  });

  it('FIXTURE_MONITOR overall < 40 (drives monitor tag)', () => {
    const hs = computeHealthScoreV2(FIXTURE_MONITOR);
    expect(hs.overall).toBeLessThan(40);
  });

  it('efficiency is 30 for ideal duration range (30s–30min)', () => {
    const input: WorkflowMetricsInput = {
      ...FIXTURE_SPARSE,
      durationMs: 60_000,  // 1 min — ideal
    };
    expect(computeHealthScoreV2(input).efficiency).toBe(30);
  });

  it('efficiency is 5 for duration outside ideal range', () => {
    const tooShort: WorkflowMetricsInput = { ...FIXTURE_SPARSE, durationMs: 5_000 };
    const tooLong: WorkflowMetricsInput = { ...FIXTURE_SPARSE, durationMs: 7_200_000 };
    expect(computeHealthScoreV2(tooShort).efficiency).toBe(5);
    expect(computeHealthScoreV2(tooLong).efficiency).toBe(5);
  });

  it('efficiency is 0 for null duration', () => {
    expect(computeHealthScoreV2(FIXTURE_SPARSE).efficiency).toBe(0);
  });

  it('reliability is 0 for null confidence', () => {
    expect(computeHealthScoreV2(FIXTURE_MONITOR).reliability).toBe(0);
    expect(computeHealthScoreV2(FIXTURE_SPARSE).reliability).toBe(0);
  });

  it('reliability is 20 for confidence 1.0', () => {
    const input: WorkflowMetricsInput = { ...FIXTURE_SPARSE, confidence: 1 };
    expect(computeHealthScoreV2(input).reliability).toBe(20);
  });

  it('is deterministic — same inputs produce identical output', () => {
    expect(computeHealthScoreV2(FIXTURE_FULL)).toEqual(computeHealthScoreV2(FIXTURE_FULL));
  });
});

// ── computeOpportunityTag ─────────────────────────────────────────────────────

describe('computeOpportunityTag', () => {
  it('FIXTURE_AUTOMATE tags as automate (rule 1: high AI score + multi-tool)', () => {
    const hs = computeHealthScoreV2(FIXTURE_AUTOMATE);
    expect(computeOpportunityTag(FIXTURE_AUTOMATE, hs)).toBe('automate');
  });

  it('FIXTURE_MONITOR tags as monitor (rule 4: overall < 40)', () => {
    const hs = computeHealthScoreV2(FIXTURE_MONITOR);
    expect(hs.overall).toBeLessThan(40);
    expect(computeOpportunityTag(FIXTURE_MONITOR, hs)).toBe('monitor');
  });

  it('evaluates rules top-to-bottom; standardize wins over optimize when both could fire', () => {
    // Build a fixture that satisfies rule 2 (standardize) AND rule 3 (optimize).
    // variationScore = 0.8 (>= 0.67) → satisfies standardize condition
    // But we also need to check that optimize (rule 3) would fire independently.
    // efficiency < 15 fires when durationMs is null (efficiency = 0).
    // We also need overall >= 40 for both rules.
    // overall = efficiency(0) + consistency((1-0.8)*30=6) + reliability(0.7*20=14) + standardization
    // Let's compute: confidence=0.7, stepCount=5, durationMs=null, stability=0.2
    // efficiency=0, consistency=(1-0.8)*30=6, reliability=round(0.7*20)=14
    // sopReadiness: confidence(0.7)>0.5 + stepCount(5)>0 → partial → sopPts=10
    // docPts: stepCount(5) >= 3 → 20; standardization = round((10+20)/2) = 15
    // overall = 0+6+14+15 = 35 — this would be < 40, so monitor fires, not standardize
    // Need higher overall. Let's use confidence=0.9, stepCount=5, stability=0.2
    // efficiency=0, consistency=6, reliability=round(0.9*20)=18
    // sopReadiness: confidence(0.9)>0.8 → ready → sopPts=20
    // docPts=20; standardization=round((20+20)/2)=20
    // overall = 0+6+18+20 = 44 (>= 40 ✓)
    // variationScore=0.8 >= 0.67 ✓ → standardize fires (rule 2)
    // efficiency=0 < 15 → optimize would fire (rule 3), but rule 2 fires first
    const input: WorkflowMetricsInput = {
      ...FIXTURE_SPARSE,
      confidence: 0.9,
      stepCount: 5,
      durationMs: null,       // efficiency = 0 (< 15, would trigger optimize)
      toolsUsed: [],           // toolsUsed.length = 0, so automate rule won't fire
      processDefinition: {
        runCount: 3,
        variantCount: 2,
        avgDurationMs: null,
        medianDurationMs: null,
        stabilityScore: 0.2,  // variation = 0.8 >= 0.67, triggers standardize
        confidenceScore: 0.9,
      },
      processInsights: [],
    };
    const hs = computeHealthScoreV2(input);
    // Verify overall >= 40 and efficiency < 15 (both conditions present)
    expect(hs.overall).toBeGreaterThanOrEqual(40);
    expect(hs.efficiency).toBeLessThan(15);
    // Verify variation score >= 0.67 (standardize condition)
    const { score: varScore } = computeVariation(input);
    expect(varScore).toBeGreaterThanOrEqual(0.67);
    // Rule 2 (standardize) should win over rule 3 (optimize)
    expect(computeOpportunityTag(input, hs)).toBe('standardize');
  });

  it('returns none when no conditions are met', () => {
    // confidence=1, ideal duration, no tools → high health, low variation
    const input: WorkflowMetricsInput = {
      ...FIXTURE_SPARSE,
      confidence: 1,
      stepCount: 5,
      durationMs: 120_000,   // inside ideal range → efficiency=30
      toolsUsed: [],
      processDefinition: {
        runCount: 8,
        variantCount: 0,
        avgDurationMs: 120_000,
        medianDurationMs: 120_000,
        stabilityScore: 0.9, // variation=0.1 (low)
        confidenceScore: 1,
      },
      processInsights: [],
    };
    const hs = computeHealthScoreV2(input);
    expect(hs.overall).toBeGreaterThanOrEqual(40);
    expect(computeOpportunityTag(input, hs)).toBe('none');
  });

  it('returns monitor when reliability < 8 even if overall >= 40', () => {
    // Build a workflow with overall >= 40 but reliability = 0 (null confidence)
    // efficiency=30 (ideal duration), consistency=(1-0.1)*30=27
    // reliability=0 (< 8), standardization=round((0+20)/2)=10
    // overall=30+27+0+10=67 (>= 40) but reliability=0 < 8 → monitor
    const input: WorkflowMetricsInput = {
      ...FIXTURE_SPARSE,
      confidence: null,
      stepCount: 5,
      durationMs: 120_000,
      toolsUsed: ['SAP'],    // 1 tool — automate rule needs >= 2
      processDefinition: {
        runCount: 2,
        variantCount: 0,
        avgDurationMs: 120_000,
        medianDurationMs: 120_000,
        stabilityScore: 0.9,  // variation=0.1 (low)
        confidenceScore: null,
      },
      processInsights: [],
    };
    const hs = computeHealthScoreV2(input);
    expect(hs.overall).toBeGreaterThanOrEqual(40);
    expect(hs.reliability).toBeLessThan(8);
    expect(computeOpportunityTag(input, hs)).toBe('monitor');
  });
});

// ── computeWorkflowMetrics (orchestrator) ─────────────────────────────────────

describe('computeWorkflowMetrics', () => {
  it('assembles a valid WorkflowMetricsOutput for FIXTURE_FULL', () => {
    const output = computeWorkflowMetrics(FIXTURE_FULL);
    expect(output.runs).toBe(10);
    expect(output.avgTimeMs).toBe(115_000);
    expect(output.variationScore).toBeCloseTo(0.2);
    expect(output.variationLabel).toBe('low');
    expect(output.bottleneckLabel).toBe('Salesforce data entry step');
    expect(output.healthScore.overall).toBe(
      output.healthScore.efficiency + output.healthScore.consistency +
      output.healthScore.reliability + output.healthScore.standardization,
    );
    expect(output.confidence).toBe(0.85);
    expect(output.isTrendReady).toBe(true);  // runCount=10 >= 5
  });

  it('isTrendReady is true when runCount >= 5', () => {
    expect(computeWorkflowMetrics(FIXTURE_FULL).isTrendReady).toBe(true);
  });

  it('isTrendReady is false when processDefinition is null', () => {
    expect(computeWorkflowMetrics(FIXTURE_SINGLE_RECORDING).isTrendReady).toBe(false);
    expect(computeWorkflowMetrics(FIXTURE_MONITOR).isTrendReady).toBe(false);
  });

  it('isTrendReady is false when runCount < 5', () => {
    const input: WorkflowMetricsInput = {
      ...FIXTURE_FULL,
      processDefinition: { ...FIXTURE_FULL.processDefinition!, runCount: 4 },
    };
    expect(computeWorkflowMetrics(input).isTrendReady).toBe(false);
  });

  it('confidence is passed through unchanged', () => {
    expect(computeWorkflowMetrics(FIXTURE_FULL).confidence).toBe(0.85);
    expect(computeWorkflowMetrics(FIXTURE_MONITOR).confidence).toBeNull();
  });

  it('healthScore.isGated is always false from engine', () => {
    for (const f of [FIXTURE_FULL, FIXTURE_SINGLE_RECORDING, FIXTURE_SPARSE, FIXTURE_AUTOMATE, FIXTURE_MONITOR]) {
      expect(computeWorkflowMetrics(f).healthScore.isGated).toBe(false);
    }
  });

  it('FIXTURE_AUTOMATE tags as automate', () => {
    expect(computeWorkflowMetrics(FIXTURE_AUTOMATE).opportunityTag).toBe('automate');
  });

  it('FIXTURE_MONITOR tags as monitor', () => {
    expect(computeWorkflowMetrics(FIXTURE_MONITOR).opportunityTag).toBe('monitor');
  });

  it('is deterministic — calling twice yields identical output', () => {
    expect(computeWorkflowMetrics(FIXTURE_FULL)).toEqual(computeWorkflowMetrics(FIXTURE_FULL));
  });
});

// ── computePortfolioHealthScore ───────────────────────────────────────────────

describe('computePortfolioHealthScore', () => {
  it('returns 0 for empty array', () => {
    expect(computePortfolioHealthScore([])).toBe(0);
  });

  it('returns integer-rounded mean of overall scores', () => {
    const outputs: WorkflowMetricsOutput[] = [
      computeWorkflowMetrics(FIXTURE_FULL),
      computeWorkflowMetrics(FIXTURE_SINGLE_RECORDING),
      computeWorkflowMetrics(FIXTURE_AUTOMATE),
    ];
    const expected = Math.round(
      outputs.reduce((sum, o) => sum + o.healthScore.overall, 0) / outputs.length,
    );
    expect(computePortfolioHealthScore(outputs)).toBe(expected);
    expect(Number.isInteger(computePortfolioHealthScore(outputs))).toBe(true);
  });

  it('returns the single workflow overall when array has one element', () => {
    const output = computeWorkflowMetrics(FIXTURE_FULL);
    expect(computePortfolioHealthScore([output])).toBe(output.healthScore.overall);
  });

  it('result is in range [0, 100]', () => {
    const outputs = [
      FIXTURE_FULL, FIXTURE_SINGLE_RECORDING, FIXTURE_SPARSE, FIXTURE_AUTOMATE, FIXTURE_MONITOR,
    ].map(computeWorkflowMetrics);
    const score = computePortfolioHealthScore(outputs);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ── computeInsightChips ───────────────────────────────────────────────────────

describe('computeInsightChips', () => {
  it('returns empty array when no conditions are met', () => {
    // All fixtures as-is don't guarantee >= 2 in any category by themselves
    const single = computeWorkflowMetrics(FIXTURE_FULL);
    expect(computeInsightChips([single], [])).toEqual([]);
  });

  it('fires high-variance chip when >= 2 workflows have variationScore > 0.7', () => {
    // FIXTURE_AUTOMATE has variationScore = 0.8
    const output1 = computeWorkflowMetrics(FIXTURE_AUTOMATE);
    const output2 = computeWorkflowMetrics({
      ...FIXTURE_AUTOMATE,
      id: 'fixture-automate-2',
    });
    const chips = computeInsightChips([output1, output2], []);
    const varianceChip = chips.find((c) => c.filterKey === 'variationScore_gt_0.7');
    expect(varianceChip).toBeDefined();
    expect(varianceChip!.count).toBe(2);
    expect(varianceChip!.severity).toBe('warning');
  });

  it('fires automation chip when >= 2 workflows tag as automate', () => {
    const output1 = computeWorkflowMetrics(FIXTURE_AUTOMATE);
    const output2 = computeWorkflowMetrics({ ...FIXTURE_AUTOMATE, id: 'automate-2' });
    const chips = computeInsightChips([output1, output2], []);
    const automationChip = chips.find((c) => c.filterKey === 'opportunityTag_automate');
    expect(automationChip).toBeDefined();
    expect(automationChip!.count).toBe(2);
  });

  it('fires monitor chip when >= 2 workflows tag as monitor', () => {
    const output1 = computeWorkflowMetrics(FIXTURE_MONITOR);
    const output2 = computeWorkflowMetrics({ ...FIXTURE_MONITOR, id: 'monitor-2' });
    const chips = computeInsightChips([output1, output2], []);
    const monitorChip = chips.find((c) => c.filterKey === 'opportunityTag_monitor');
    expect(monitorChip).toBeDefined();
    expect(monitorChip!.count).toBe(2);
  });

  it('fires bottleneck chip from critical/warning processInsight', () => {
    const output = computeWorkflowMetrics(FIXTURE_FULL);
    const chips = computeInsightChips(
      [output],
      [{ insightType: 'bottleneck', severity: 'critical', title: 'Critical bottleneck' }],
    );
    const bottleneckChip = chips.find((c) => c.filterKey === 'bottleneck_insight');
    expect(bottleneckChip).toBeDefined();
    expect(bottleneckChip!.severity).toBe('critical');
  });

  it('does not fire bottleneck chip for info-severity insights', () => {
    const output = computeWorkflowMetrics(FIXTURE_FULL);
    const chips = computeInsightChips(
      [output],
      [{ insightType: 'bottleneck', severity: 'info', title: 'Info bottleneck' }],
    );
    expect(chips.find((c) => c.filterKey === 'bottleneck_insight')).toBeUndefined();
  });

  it('returns at most 5 chips', () => {
    const output1 = computeWorkflowMetrics(FIXTURE_AUTOMATE);
    const output2 = computeWorkflowMetrics({ ...FIXTURE_AUTOMATE, id: 'automate-2' });
    const output3 = computeWorkflowMetrics(FIXTURE_MONITOR);
    const output4 = computeWorkflowMetrics({ ...FIXTURE_MONITOR, id: 'monitor-2' });
    const chips = computeInsightChips(
      [output1, output2, output3, output4],
      [
        { insightType: 'bottleneck', severity: 'critical', title: 'Chip A' },
        { insightType: 'delay', severity: 'warning', title: 'Chip B' },
      ],
    );
    expect(chips.length).toBeLessThanOrEqual(5);
  });

  it('orders chips by severity descending (critical before warning before info)', () => {
    const output1 = computeWorkflowMetrics(FIXTURE_AUTOMATE);
    const output2 = computeWorkflowMetrics({ ...FIXTURE_AUTOMATE, id: 'automate-2' });
    const output3 = computeWorkflowMetrics(FIXTURE_MONITOR);
    const output4 = computeWorkflowMetrics({ ...FIXTURE_MONITOR, id: 'monitor-2' });
    const chips = computeInsightChips(
      [output1, output2, output3, output4],
      [{ insightType: 'bottleneck', severity: 'critical', title: 'Critical chip' }],
    );
    const severityRank = (s: string) => s === 'critical' ? 3 : s === 'warning' ? 2 : 1;
    for (let i = 1; i < chips.length; i++) {
      const prev = chips[i - 1];
      const curr = chips[i];
      expect(prev).toBeDefined();
      expect(curr).toBeDefined();
      expect(severityRank(prev!.severity)).toBeGreaterThanOrEqual(severityRank(curr!.severity));
    }
  });
});
