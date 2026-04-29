import { describe, it, expect } from 'vitest';
import {
  computeRuns,
  computeAvgTimeMs,
  computeVariation,
  computeBottleneckLabel,
  computeHealthScoreV2,
  computeOpportunityTag,
  computeAiOpportunityScore,
  computeWorkflowMetrics,
  computePortfolioHealthScore,
  computePortfolioHealthScorePrior,
  computeInsightChips,
  PORTFOLIO_PRIOR_MIN_WORKFLOWS,
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
    expect(hs.overall).toBe(hs.speed + hs.consistency + hs.dataQuality + hs.standardization);
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
      expect(hs.overall).toBe(hs.speed + hs.consistency + hs.dataQuality + hs.standardization);
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

  // ── Speed scoring (graduated) ──────────────────────────────────────────────

  it('speed is 30 (ideal) for duration inside [30s, 30min]', () => {
    const input: WorkflowMetricsInput = { ...FIXTURE_SPARSE, durationMs: 60_000 };  // 1 min
    expect(computeHealthScoreV2(input).speed).toBe(30);
  });

  it('speed is 30 at ideal lower boundary (30s)', () => {
    const input: WorkflowMetricsInput = { ...FIXTURE_SPARSE, durationMs: 30_000 };
    expect(computeHealthScoreV2(input).speed).toBe(30);
  });

  it('speed is 30 at ideal upper boundary (30min)', () => {
    const input: WorkflowMetricsInput = { ...FIXTURE_SPARSE, durationMs: 30 * 60 * 1_000 };
    expect(computeHealthScoreV2(input).speed).toBe(30);
  });

  it('speed is 18 (adjacent) for short-adjacent duration [10s, 30s)', () => {
    const input: WorkflowMetricsInput = { ...FIXTURE_SPARSE, durationMs: 20_000 };  // 20 s
    expect(computeHealthScoreV2(input).speed).toBe(18);
  });

  it('speed is 18 (adjacent) for long-adjacent duration (30min, 2h]', () => {
    const input: WorkflowMetricsInput = { ...FIXTURE_SPARSE, durationMs: 60 * 60 * 1_000 };  // 1 h
    expect(computeHealthScoreV2(input).speed).toBe(18);
  });

  it('speed is 18 at long-adjacent upper boundary (2h)', () => {
    const input: WorkflowMetricsInput = { ...FIXTURE_SPARSE, durationMs: 2 * 60 * 60 * 1_000 };
    expect(computeHealthScoreV2(input).speed).toBe(18);
  });

  it('speed is 5 (floor) for duration far outside ideal/adjacent ranges', () => {
    const tooShort: WorkflowMetricsInput = { ...FIXTURE_SPARSE, durationMs: 5_000 };       // 5 s
    const tooLong: WorkflowMetricsInput = { ...FIXTURE_SPARSE, durationMs: 7_200_001 };    // > 2 h
    expect(computeHealthScoreV2(tooShort).speed).toBe(5);
    expect(computeHealthScoreV2(tooLong).speed).toBe(5);
  });

  it('speed is 0 for null duration', () => {
    expect(computeHealthScoreV2(FIXTURE_SPARSE).speed).toBe(0);
  });

  // ── DataQuality scoring ────────────────────────────────────────────────────

  it('dataQuality is 0 for null confidence', () => {
    expect(computeHealthScoreV2(FIXTURE_MONITOR).dataQuality).toBe(0);
    expect(computeHealthScoreV2(FIXTURE_SPARSE).dataQuality).toBe(0);
  });

  it('dataQuality is 20 for confidence 1.0', () => {
    const input: WorkflowMetricsInput = { ...FIXTURE_SPARSE, confidence: 1 };
    expect(computeHealthScoreV2(input).dataQuality).toBe(20);
  });

  it('is deterministic — same inputs produce identical output', () => {
    expect(computeHealthScoreV2(FIXTURE_FULL)).toEqual(computeHealthScoreV2(FIXTURE_FULL));
  });
});

// ── computeAiOpportunityScore ─────────────────────────────────────────────────

describe('computeAiOpportunityScore', () => {
  it('is exposed (auditable) — not hidden behind the opportunity tag', () => {
    // Contract test: the function must be callable externally. If this compiles
    // and runs, the export is live. No assertion needed beyond a finite number.
    const score = computeAiOpportunityScore(FIXTURE_AUTOMATE);
    expect(Number.isFinite(score)).toBe(true);
  });

  it('returns a value in [0, 100] for all fixtures', () => {
    for (const fixture of [FIXTURE_FULL, FIXTURE_SINGLE_RECORDING, FIXTURE_SPARSE, FIXTURE_AUTOMATE, FIXTURE_MONITOR]) {
      const score = computeAiOpportunityScore(fixture);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('FIXTURE_AUTOMATE scores >= 60 (qualifies for automate tag)', () => {
    expect(computeAiOpportunityScore(FIXTURE_AUTOMATE)).toBeGreaterThanOrEqual(60);
  });

  it('FIXTURE_MONITOR scores 0 (no steps, no duration, no tools)', () => {
    expect(computeAiOpportunityScore(FIXTURE_MONITOR)).toBe(0);
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
    // variationScore = 0.8 (>= 0.67) → satisfies standardize condition.
    // speed < 15 fires when durationMs is null (speed = 0) → would satisfy optimize.
    // Need overall >= 40 for both rules.
    const input: WorkflowMetricsInput = {
      ...FIXTURE_SPARSE,
      confidence: 0.9,
      stepCount: 5,
      durationMs: null,       // speed = 0 (< 15, would trigger optimize)
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
    expect(hs.overall).toBeGreaterThanOrEqual(40);
    expect(hs.speed).toBeLessThan(15);
    const { score: varScore } = computeVariation(input);
    expect(varScore).toBeGreaterThanOrEqual(0.67);
    // Rule 2 (standardize) should win over rule 3 (optimize)
    expect(computeOpportunityTag(input, hs)).toBe('standardize');
  });

  it('returns healthy when no conditions are met (positive fallthrough)', () => {
    // confidence=1, ideal duration, no tools → high health, low variation
    const input: WorkflowMetricsInput = {
      ...FIXTURE_SPARSE,
      confidence: 1,
      stepCount: 5,
      durationMs: 120_000,   // inside ideal range → speed=30
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
    expect(computeOpportunityTag(input, hs)).toBe('healthy');
  });

  it('returns monitor when dataQuality < 8 even if overall >= 40', () => {
    // speed=30 (ideal duration), consistency=(1-0.1)*30=27
    // dataQuality=0 (< 8), standardization=round((0+20)/2)=10
    // overall=30+27+0+10=67 (>= 40) but dataQuality=0 < 8 → monitor
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
    expect(hs.dataQuality).toBeLessThan(8);
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
      output.healthScore.speed + output.healthScore.consistency +
      output.healthScore.dataQuality + output.healthScore.standardization,
    );
    expect(output.confidence).toBe(0.85);
  });

  it('exposes aiOpportunityScore on the output (auditable automate tag)', () => {
    const output = computeWorkflowMetrics(FIXTURE_AUTOMATE);
    expect(typeof output.aiOpportunityScore).toBe('number');
    expect(output.aiOpportunityScore).toBeGreaterThanOrEqual(0);
    expect(output.aiOpportunityScore).toBeLessThanOrEqual(100);
    // Tag is 'automate' so score must be >= 60
    expect(output.opportunityTag).toBe('automate');
    expect(output.aiOpportunityScore).toBeGreaterThanOrEqual(60);
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
  it('returns empty array when no conditions are met and fewer than 3 healthy workflows', () => {
    // Single workflow cannot trigger the healthy chip (minimum 3 required)
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

  // ── Healthy positive chip ─────────────────────────────────────────────────

  it('fires healthy chip when >= 3 workflows have overall >= 70 and no problem chips', () => {
    // Build 3 fully-healthy fixtures
    const healthyInput: WorkflowMetricsInput = {
      ...FIXTURE_FULL,
      confidence: 1,
      stepCount: 5,
      durationMs: 120_000,
      toolsUsed: [],   // prevent automate chip
      processDefinition: {
        runCount: 8,
        variantCount: 0,
        avgDurationMs: 120_000,
        medianDurationMs: 120_000,
        stabilityScore: 0.95,   // variation low
        confidenceScore: 1,
      },
      processInsights: [],
    };
    const outputs = [
      computeWorkflowMetrics({ ...healthyInput, id: 'h1' }),
      computeWorkflowMetrics({ ...healthyInput, id: 'h2' }),
      computeWorkflowMetrics({ ...healthyInput, id: 'h3' }),
    ];
    // Sanity: all must be healthy-tagged
    for (const o of outputs) {
      expect(o.healthScore.overall).toBeGreaterThanOrEqual(70);
      expect(o.opportunityTag).toBe('healthy');
    }
    const chips = computeInsightChips(outputs, []);
    const healthyChip = chips.find((c) => c.filterKey === 'healthScore_gte_70');
    expect(healthyChip).toBeDefined();
    expect(healthyChip!.severity).toBe('positive');
    expect(healthyChip!.count).toBe(3);
  });

  it('does NOT fire healthy chip when any warning/critical chip is already present', () => {
    // Two automate workflows → automation (info) + high-variance (warning) chips fire
    const output1 = computeWorkflowMetrics(FIXTURE_AUTOMATE);
    const output2 = computeWorkflowMetrics({ ...FIXTURE_AUTOMATE, id: 'automate-2' });
    // Plus three healthy workflows
    const healthyInput: WorkflowMetricsInput = {
      ...FIXTURE_FULL,
      confidence: 1,
      stepCount: 5,
      durationMs: 120_000,
      toolsUsed: [],
      processDefinition: {
        runCount: 8,
        variantCount: 0,
        avgDurationMs: 120_000,
        medianDurationMs: 120_000,
        stabilityScore: 0.95,
        confidenceScore: 1,
      },
      processInsights: [],
    };
    const output3 = computeWorkflowMetrics({ ...healthyInput, id: 'h1' });
    const output4 = computeWorkflowMetrics({ ...healthyInput, id: 'h2' });
    const output5 = computeWorkflowMetrics({ ...healthyInput, id: 'h3' });
    const chips = computeInsightChips([output1, output2, output3, output4, output5], []);
    // Variance chip is warning → healthy chip must be suppressed
    expect(chips.find((c) => c.filterKey === 'variationScore_gt_0.7')).toBeDefined();
    expect(chips.find((c) => c.filterKey === 'healthScore_gte_70')).toBeUndefined();
  });

  it('does NOT fire healthy chip with fewer than 3 healthy workflows', () => {
    const healthyInput: WorkflowMetricsInput = {
      ...FIXTURE_FULL,
      confidence: 1,
      stepCount: 5,
      durationMs: 120_000,
      toolsUsed: [],
      processDefinition: {
        runCount: 8,
        variantCount: 0,
        avgDurationMs: 120_000,
        medianDurationMs: 120_000,
        stabilityScore: 0.95,
        confidenceScore: 1,
      },
      processInsights: [],
    };
    const outputs = [
      computeWorkflowMetrics({ ...healthyInput, id: 'h1' }),
      computeWorkflowMetrics({ ...healthyInput, id: 'h2' }),
    ];
    const chips = computeInsightChips(outputs, []);
    expect(chips.find((c) => c.filterKey === 'healthScore_gte_70')).toBeUndefined();
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

  it('orders chips by severity descending (critical > warning > info > positive)', () => {
    const output1 = computeWorkflowMetrics(FIXTURE_AUTOMATE);
    const output2 = computeWorkflowMetrics({ ...FIXTURE_AUTOMATE, id: 'automate-2' });
    const output3 = computeWorkflowMetrics(FIXTURE_MONITOR);
    const output4 = computeWorkflowMetrics({ ...FIXTURE_MONITOR, id: 'monitor-2' });
    const chips = computeInsightChips(
      [output1, output2, output3, output4],
      [{ insightType: 'bottleneck', severity: 'critical', title: 'Critical chip' }],
    );
    const severityRank = (s: string) =>
      s === 'critical' ? 4 : s === 'warning' ? 3 : s === 'info' ? 2 : 1;
    for (let i = 1; i < chips.length; i++) {
      const prev = chips[i - 1];
      const curr = chips[i];
      expect(prev).toBeDefined();
      expect(curr).toBeDefined();
      expect(severityRank(prev!.severity)).toBeGreaterThanOrEqual(severityRank(curr!.severity));
    }
  });

  // ── Action-leading chip labels (iter-024 §4.1 item b) ────────────────────────

  it('high-variance chip label is action-leading (contains →)', () => {
    const output1 = computeWorkflowMetrics(FIXTURE_AUTOMATE);
    const output2 = computeWorkflowMetrics({ ...FIXTURE_AUTOMATE, id: 'automate-2' });
    const chips = computeInsightChips([output1, output2], []);
    const varianceChip = chips.find((c) => c.filterKey === 'variationScore_gt_0.7');
    expect(varianceChip).toBeDefined();
    expect(varianceChip!.label).toContain('→');
    expect(varianceChip!.label).toMatch(/high execution variance/i);
  });

  it('automation chip label is action-leading (contains →)', () => {
    const output1 = computeWorkflowMetrics(FIXTURE_AUTOMATE);
    const output2 = computeWorkflowMetrics({ ...FIXTURE_AUTOMATE, id: 'automate-2' });
    const chips = computeInsightChips([output1, output2], []);
    const automationChip = chips.find((c) => c.filterKey === 'opportunityTag_automate');
    expect(automationChip).toBeDefined();
    expect(automationChip!.label).toContain('→');
    expect(automationChip!.label).toMatch(/prioritize/i);
  });

  it('monitor chip label is action-leading (contains →)', () => {
    const output1 = computeWorkflowMetrics(FIXTURE_MONITOR);
    const output2 = computeWorkflowMetrics({ ...FIXTURE_MONITOR, id: 'monitor-2' });
    const chips = computeInsightChips([output1, output2], []);
    const monitorChip = chips.find((c) => c.filterKey === 'opportunityTag_monitor');
    expect(monitorChip).toBeDefined();
    expect(monitorChip!.label).toContain('→');
    expect(monitorChip!.label).toMatch(/review/i);
  });

  it('bottleneck chip label prefixes "Bottleneck:" and contains →', () => {
    const output = computeWorkflowMetrics(FIXTURE_FULL);
    const chips = computeInsightChips(
      [output],
      [{ insightType: 'bottleneck', severity: 'critical', title: 'Data entry step' }],
    );
    const bottleneckChip = chips.find((c) => c.filterKey === 'bottleneck_insight');
    expect(bottleneckChip).toBeDefined();
    expect(bottleneckChip!.label).toMatch(/^Bottleneck:/);
    expect(bottleneckChip!.label).toContain('→');
  });

  it('filterKey strings are unchanged by copy rewrite (contract with applyFilters)', () => {
    const output1 = computeWorkflowMetrics(FIXTURE_AUTOMATE);
    const output2 = computeWorkflowMetrics({ ...FIXTURE_AUTOMATE, id: 'automate-2' });
    const chips = computeInsightChips([output1, output2], []);
    const filterKeys = chips.map((c) => c.filterKey);
    // filterKey must remain unchanged so WorkflowList.applyFilters() recognises them
    expect(filterKeys).toContain('variationScore_gt_0.7');
    expect(filterKeys).toContain('opportunityTag_automate');
  });
});

// ── computePortfolioHealthScorePrior (iter-024 §4.1 item a) ──────────────────

describe('computePortfolioHealthScorePrior', () => {
  const REF_DATE = new Date('2024-03-01T00:00:00Z');
  const WINDOW_DAYS = 30;

  // Prior window: [2024-01-01, 2024-02-01)
  const priorStart = new Date('2024-01-01T00:00:00Z').toISOString();
  const priorMid = new Date('2024-01-15T00:00:00Z').toISOString();
  const priorEnd = new Date('2024-02-01T00:00:00Z').toISOString(); // exclusive
  // Current window: [2024-02-01, 2024-03-01)
  const currentMid = new Date('2024-02-15T00:00:00Z').toISOString();

  const makeOutput = (overall: number): WorkflowMetricsOutput => ({
    runs: 5,
    avgTimeMs: 60_000,
    variationScore: 0.2,
    variationLabel: 'low',
    bottleneckLabel: null,
    healthScore: {
      overall,
      speed: 20,
      consistency: 20,
      dataQuality: 10,
      standardization: overall - 50,
      isGated: false,
    },
    opportunityTag: 'healthy',
    aiOpportunityScore: 30,
    confidence: 0.8,
  });

  it('returns null for empty workflows array', () => {
    expect(computePortfolioHealthScorePrior([], [], WINDOW_DAYS, REF_DATE)).toBeNull();
  });

  it('returns null when prior partition has fewer than PORTFOLIO_PRIOR_MIN_WORKFLOWS', () => {
    // Only 2 workflows in prior window — below min of 3
    const outputs = [makeOutput(70), makeOutput(80)];
    const meta = [{ updatedAt: priorMid }, { updatedAt: priorMid }];
    expect(computePortfolioHealthScorePrior(outputs, meta, WINDOW_DAYS, REF_DATE)).toBeNull();
  });

  it('returns computed score when prior partition has >= PORTFOLIO_PRIOR_MIN_WORKFLOWS', () => {
    const outputs = [makeOutput(60), makeOutput(70), makeOutput(80)];
    const meta = [{ updatedAt: priorMid }, { updatedAt: priorMid }, { updatedAt: priorMid }];
    const result = computePortfolioHealthScorePrior(outputs, meta, WINDOW_DAYS, REF_DATE);
    expect(result).not.toBeNull();
    expect(result).toBe(Math.round((60 + 70 + 80) / 3));
  });

  it('excludes current-window workflows from the prior-period computation', () => {
    // 3 prior + 2 current; prior scores are 60/70/80; current are 20/20
    const outputs = [makeOutput(60), makeOutput(70), makeOutput(80), makeOutput(20), makeOutput(20)];
    const meta = [
      { updatedAt: priorMid },
      { updatedAt: priorMid },
      { updatedAt: priorMid },
      { updatedAt: currentMid },
      { updatedAt: currentMid },
    ];
    const result = computePortfolioHealthScorePrior(outputs, meta, WINDOW_DAYS, REF_DATE);
    // Result should be based only on prior 3: (60+70+80)/3 = 70
    expect(result).toBe(70);
  });

  it('excludes the priorEnd boundary date (half-open interval [priorStart, priorEnd))', () => {
    // A workflow with updatedAt exactly at priorEnd should NOT be included
    const outputs = [makeOutput(60), makeOutput(70), makeOutput(80), makeOutput(99)];
    const meta = [
      { updatedAt: priorMid },
      { updatedAt: priorMid },
      { updatedAt: priorMid },
      { updatedAt: priorEnd }, // exactly at boundary — excluded
    ];
    const result = computePortfolioHealthScorePrior(outputs, meta, WINDOW_DAYS, REF_DATE);
    // Only 3 included; boundary value 99 excluded
    expect(result).toBe(Math.round((60 + 70 + 80) / 3));
  });

  it('PORTFOLIO_PRIOR_MIN_WORKFLOWS constant is 3', () => {
    expect(PORTFOLIO_PRIOR_MIN_WORKFLOWS).toBe(3);
  });
});

// ── MDR-P01: automate requires healthScore.overall >= AUTOMATE_MIN_OVERALL ────

describe('MDR-P01: automate requires healthScore.overall >= AUTOMATE_MIN_OVERALL', () => {
  // Inline fixture: high aiScore (≥60) + 3 tools + unhealthy overall.
  // stepCount=20 → aiScore contribution: round((20/15)*30)=40; isHighSteps=true → +20; toolsUsed=3 → +25; durationMs=null → 0; total=85.
  // overall: speed=0 (durationMs null) + consistency=(1-0.5)*30=15 (processDefinition null, confidence null → default 0.5)
  //          + dataQuality=0 (confidence null) + standardization=round((0+round((20/3)*20))/2)=round((0+20)/2)=10 → overall=25.
  const unhealthyHighAiInput: WorkflowMetricsInput = {
    ...FIXTURE_SPARSE,
    stepCount: 20,
    durationMs: null,
    confidence: null,
    toolsUsed: ['SAP', 'Outlook', 'SharePoint'],
    processDefinition: null,
    processInsights: [],
  };

  it('unhealthy overall (22-ish) with high aiScore + 3 tools → returns monitor (not automate)', () => {
    const hs = computeHealthScoreV2(unhealthyHighAiInput);
    expect(hs.overall).toBeLessThan(40);
    expect(computeAiOpportunityScore(unhealthyHighAiInput)).toBeGreaterThanOrEqual(60);
    expect(unhealthyHighAiInput.toolsUsed.length).toBeGreaterThanOrEqual(2);
    expect(computeOpportunityTag(unhealthyHighAiInput, hs)).toBe('monitor');
  });

  it('at-threshold overall (exactly 40) with high aiScore + 3 tools → returns automate (boundary inclusive)', () => {
    // Build input yielding overall=40: durationMs=10_000 (adjacent, speed=18) +
    // consistency=(1-0.5)*30=15 (default variation) + dataQuality=0 + standardization=round((0+20)/2)=10 → 18+15+0+10=43... close enough.
    // Simpler: use a processDefinition with stabilityScore=0.5 and set durationMs to adjacent band.
    // adjacent speed=18, consistency=15, dataQuality=0, standardization with stepCount=2: round((0+round((2/3)*20))/2)=round((0+13)/2)=6 → 18+15+0+6=39. Off by 1.
    // Use durationMs=30_000 (ideal, speed=30), consistency=15, dataQuality=0, standardization=0 → 30+15+0+0=45. Too high.
    // Use override: craft so overall lands exactly ≥40 with a known approach.
    // Easiest: mock the healthScore directly for the boundary test.
    const mockHealthScore40 = {
      overall: 40,
      speed: 30,
      consistency: 10,
      dataQuality: 0,
      standardization: 0,
      isGated: false,
    };
    const highAiInput: WorkflowMetricsInput = {
      ...FIXTURE_SPARSE,
      stepCount: 20,
      durationMs: 30_000,
      confidence: null,
      toolsUsed: ['SAP', 'Outlook', 'SharePoint'],
      processDefinition: null,
      processInsights: [],
    };
    expect(computeAiOpportunityScore(highAiInput)).toBeGreaterThanOrEqual(60);
    expect(highAiInput.toolsUsed.length).toBeGreaterThanOrEqual(2);
    expect(mockHealthScore40.overall).toBe(40);
    expect(computeOpportunityTag(highAiInput, mockHealthScore40)).toBe('automate');
  });

  it('healthy overall (80) with high aiScore + 3 tools → returns automate (happy path preserved)', () => {
    const hs = computeHealthScoreV2(FIXTURE_AUTOMATE);
    expect(hs.overall).toBeGreaterThanOrEqual(40);
    expect(computeAiOpportunityScore(FIXTURE_AUTOMATE)).toBeGreaterThanOrEqual(60);
    expect(computeOpportunityTag(FIXTURE_AUTOMATE, hs)).toBe('automate');
  });

  it('unhealthy overall with high aiScore but only 1 tool → returns monitor (AUTOMATE_MIN_TOOLS guard governs; unchanged)', () => {
    const singleToolInput: WorkflowMetricsInput = {
      ...unhealthyHighAiInput,
      toolsUsed: ['SAP'],
    };
    const hs = computeHealthScoreV2(singleToolInput);
    expect(hs.overall).toBeLessThan(40);
    expect(computeOpportunityTag(singleToolInput, hs)).toBe('monitor');
  });

  it('healthy overall (80) with low aiScore + 3 tools → does not return automate (AUTOMATE_AI_OPPORTUNITY_THRESHOLD governs; unchanged)', () => {
    // FIXTURE_SINGLE_RECORDING: confidence=0.72, stepCount=5, durationMs=90s, toolsUsed=['Excel'] (1 tool).
    // Use a fixture with 3 tools but low aiScore: stepCount=2, durationMs=null, no processDefinition.
    const lowAiInput: WorkflowMetricsInput = {
      ...FIXTURE_SPARSE,
      stepCount: 2,
      durationMs: 30_000,
      confidence: 0.9,
      toolsUsed: ['SAP', 'Outlook', 'SharePoint'],
      processDefinition: null,
      processInsights: [],
    };
    const hs = computeHealthScoreV2(lowAiInput);
    expect(hs.overall).toBeGreaterThanOrEqual(40);
    expect(computeAiOpportunityScore(lowAiInput)).toBeLessThan(60);
    expect(computeOpportunityTag(lowAiInput, hs)).not.toBe('automate');
  });
});

// ── MDR-P02: high-variance chip uses computed-signal language only ─────────────

describe('MDR-P02: high-variance chip uses computed-signal language only', () => {
  it('high-variance chip label contains computed-signal language and does NOT contain "SLA" or "onboarding"', () => {
    const output1 = computeWorkflowMetrics(FIXTURE_AUTOMATE);
    const output2 = computeWorkflowMetrics({ ...FIXTURE_AUTOMATE, id: 'automate-2' });
    const chips = computeInsightChips([output1, output2], []);
    const varianceChip = chips.find((c) => c.filterKey === 'variationScore_gt_0.7');
    expect(varianceChip).toBeDefined();
    expect(varianceChip!.label).toContain('high execution variance');
    expect(varianceChip!.label).not.toMatch(/SLA/i);
    expect(varianceChip!.label).not.toMatch(/onboarding/i);
  });

  it('exact-string lock: high-variance chip label matches computed template for n=3', () => {
    const makeHighVarianceOutput = (id: string) =>
      computeWorkflowMetrics({ ...FIXTURE_AUTOMATE, id });
    const chips = computeInsightChips(
      [makeHighVarianceOutput('v1'), makeHighVarianceOutput('v2'), makeHighVarianceOutput('v3')],
      [],
    );
    const varianceChip = chips.find((c) => c.filterKey === 'variationScore_gt_0.7');
    expect(varianceChip).toBeDefined();
    expect(varianceChip!.label).toBe(
      '3 workflows show high execution variance → investigate consistency',
    );
  });
});
