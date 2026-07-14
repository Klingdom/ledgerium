/**
 * Portfolio Time-Sink Ranking — T1 (Cross-Workflow Intelligence program).
 *
 * Pure, deterministic aggregation of ALREADY-computed per-workflow timing and
 * bottleneck data across the whole workflow library. NO clustering, NO new
 * similarity math — this is a map-reduce over `TimestudyResult` /
 * `BottleneckReport` outputs that `analyzeTimestudy()` / `detectBottlenecks()`
 * already produce per workflow (see `docs/features/cross-workflow-intelligence/
 * BUILD_SPEC.md` §5 T1).
 *
 * Aggregate-time measure (documented choice):
 *   aggregateTimeMs = avgDurationMs × runCount
 *
 * Rationale: `avgDurationMs` is the already-persisted per-workflow duration
 * proxy (`ProcessDefinition.avgDurationMs`, computed once per workflow and
 * reused across the dashboard — see `apps/web-app/src/lib/dashboard-band-
 * stats.ts` "Portfolio timestudy summary"). Multiplying by `runCount` turns a
 * per-occurrence duration into a total *volume-weighted* time cost — "where
 * does my organization's cumulative time actually go" — which is the T1 user
 * question (BUILD_SPEC §5 T1: "ranked bars aggregating already-trusted
 * per-process bottleneck/timing across the whole library"; TIMESTUDY_
 * INTELLIGENCE_REVIEW_001/pm_analysis.md: "a portfolio rollup ranking
 * step-categories/components by aggregate time-cost, weighted by run
 * volume"). A single dominant bottleneck-step delay times run count would
 * answer a narrower question ("which single step burns the most time") and
 * would silently ignore workflows whose total time is high but spread evenly
 * across steps (no standout bottleneck) — undercounting real time-sinks.
 * `topBottleneckStep` is still surfaced per entry so the "what to fix first"
 * drill-in is not lost.
 *
 * Determinism:
 *   - No `Date.now()` / `Math.random()` / IO in this module.
 *   - Ranking order is a pure function of the input array's *content*, never
 *     its order (sort key: aggregateTimeMs desc, tie-break workflowId asc).
 *   - `evidenceRunIds` on every entry are deduped + sorted for stable output.
 *   - `version` is a fixed literal (`TIME_SINK_MODEL_VERSION`), bumped only
 *     when the aggregation formula changes — mirrors the existing
 *     `CALIBRATION_VERSION` literal-string convention in
 *     `calibration/calibrateThreshold.ts`.
 *
 * Null-timing handling (honesty): a workflow with no usable timing data
 * (`avgDurationMs === null` or `runCount <= 0`) is still represented in the
 * ranked list — with `aggregateTimeMs: 0`, `hasTimingData: false`, and no
 * fabricated bottleneck/range data — rather than being silently dropped or
 * crashing the aggregation. `totals.coveredWorkflowCount` reports how many
 * workflows actually contributed real timing data, so callers can render an
 * honest "N of M workflows have timing data" caption.
 */

import type { TimestudyResult, BottleneckReport } from '../types.js';

/** Fixed literal version for this aggregation formula (bump on formula change). */
export const TIME_SINK_MODEL_VERSION = 'timesink-aggregate/1.0.0';

// ─── Input contract ───────────────────────────────────────────────────────────

/**
 * Per-workflow input to the portfolio time-sink rollup. Callers assemble this
 * from already-persisted / already-computed per-workflow outputs — no new
 * engine computation is triggered by this module.
 */
export interface TimeSinkInput {
  workflowId: string;
  title: string;
  /** Observed run count for this workflow (volume weight). */
  runCount: number;
  /** Per-workflow timestudy output, or null when unavailable. */
  timestudy: TimestudyResult | null;
  /** Per-workflow bottleneck output, or null when unavailable. */
  bottlenecks: BottleneckReport | null;
  /** Persisted per-workflow duration proxy (`ProcessDefinition.avgDurationMs`). */
  avgDurationMs: number | null;
  /** Evidence run IDs backing this workflow's timing/bottleneck data. */
  evidenceRunIds: string[];
}

// ─── Output contract ──────────────────────────────────────────────────────────

export interface TimeSinkStepDurationRange {
  minMs: number | null;
  medianMs: number | null;
  /**
   * 90th-percentile step duration. Named `p90Ms` (not `p95Ms`) because the
   * engine's `StepPositionTimestudy` only computes p90 today — this field is
   * never fabricated to a percentile the engine doesn't produce.
   */
  p90Ms: number | null;
  maxMs: number | null;
}

export interface TimeSinkTopBottleneck {
  /** 1-based ordinal position of the bottleneck step. */
  position: number;
  /** Privacy-safe step category (GroupingReason), not a free-text title. */
  category: string;
  /** 'high' when the engine flagged high mean duration; 'moderate' when the flag is variance-only. */
  severity: 'high' | 'moderate';
  /** Excess mean duration over the overall per-step mean, floored at 0. */
  delayMs: number;
  /** Step mean duration / overall mean step duration (as computed by detectBottlenecks). */
  durationRatio: number;
  evidenceRunIds: string[];
}

export interface PortfolioTimeSinkEntry {
  workflowId: string;
  title: string;
  runCount: number;
  /** avgDurationMs × runCount; 0 when timing data is unavailable. */
  aggregateTimeMs: number;
  /** Share of `totals.totalTimeMs` this entry represents, in [0,100]. 0 when uncovered. */
  pctOfPortfolioTime: number;
  /** Highest-ranked bottleneck step for this workflow, or null when none / no data. */
  topBottleneck: TimeSinkTopBottleneck | null;
  /** Duration range at the top bottleneck's position, or null when unavailable. */
  stepDurationRange: TimeSinkStepDurationRange | null;
  /** True when this workflow contributed real timing data to the rollup. */
  hasTimingData: boolean;
  evidenceRunIds: string[];
}

export interface PortfolioTimeSinkTotals {
  /** Sum of aggregateTimeMs across covered (hasTimingData=true) workflows. */
  totalTimeMs: number;
  /** Total workflows considered (covered + uncovered). */
  workflowCount: number;
  /** Workflows that contributed real timing data (avgDurationMs != null && runCount > 0). */
  coveredWorkflowCount: number;
}

export interface PortfolioTimeSinkReport {
  version: string;
  ranked: PortfolioTimeSinkEntry[];
  totals: PortfolioTimeSinkTotals;
}

// ─── Aggregation ───────────────────────────────────────────────────────────────

function dedupeSort(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

/**
 * Derive the top bottleneck summary + step-duration range for one workflow.
 * Pure; returns nulls when the workflow has no bottleneck data or no matching
 * timestudy position (never fabricates a value).
 */
function deriveTopBottleneck(
  bottlenecks: BottleneckReport | null,
  timestudy: TimestudyResult | null,
): { topBottleneck: TimeSinkTopBottleneck | null; stepDurationRange: TimeSinkStepDurationRange | null } {
  const top = bottlenecks?.bottlenecks[0];
  if (!top) {
    return { topBottleneck: null, stepDurationRange: null };
  }

  const topBottleneck: TimeSinkTopBottleneck = {
    position: top.position,
    category: top.category,
    severity: top.isHighDuration ? 'high' : 'moderate',
    delayMs: Math.max(0, top.meanDurationMs - top.overallMeanStepDurationMs),
    durationRatio: top.durationRatio,
    evidenceRunIds: dedupeSort(top.evidenceRunIds),
  };

  const positionStats = timestudy?.stepPositionTimestudies.find((s) => s.position === top.position) ?? null;
  const stepDurationRange: TimeSinkStepDurationRange | null = positionStats
    ? {
        minMs: positionStats.minDurationMs,
        medianMs: positionStats.medianDurationMs,
        p90Ms: positionStats.p90DurationMs,
        maxMs: positionStats.maxDurationMs,
      }
    : null;

  return { topBottleneck, stepDurationRange };
}

/**
 * Aggregate per-workflow timing/bottleneck data into a ranked portfolio
 * time-sink report. Pure, deterministic, permutation-invariant (output does
 * not depend on input array order).
 */
export function aggregateTimeSinks(inputs: TimeSinkInput[]): PortfolioTimeSinkReport {
  if (inputs.length === 0) {
    return {
      version: TIME_SINK_MODEL_VERSION,
      ranked: [],
      totals: { totalTimeMs: 0, workflowCount: 0, coveredWorkflowCount: 0 },
    };
  }

  const provisional = inputs.map((input) => {
    const hasTimingData = input.avgDurationMs !== null && input.runCount > 0;
    const aggregateTimeMs = hasTimingData ? input.avgDurationMs! * input.runCount : 0;
    const { topBottleneck, stepDurationRange } = deriveTopBottleneck(input.bottlenecks, input.timestudy);

    return {
      workflowId: input.workflowId,
      title: input.title,
      runCount: input.runCount,
      aggregateTimeMs,
      topBottleneck,
      stepDurationRange,
      hasTimingData,
      evidenceRunIds: dedupeSort(input.evidenceRunIds),
    };
  });

  const totalTimeMs = provisional.reduce((sum, e) => (e.hasTimingData ? sum + e.aggregateTimeMs : sum), 0);
  const coveredWorkflowCount = provisional.filter((e) => e.hasTimingData).length;

  const ranked: PortfolioTimeSinkEntry[] = provisional
    .map((e) => ({
      ...e,
      pctOfPortfolioTime:
        e.hasTimingData && totalTimeMs > 0 ? (e.aggregateTimeMs / totalTimeMs) * 100 : 0,
    }))
    // Deterministic ranking: highest aggregate time first; tie-break by
    // workflowId ascending so output never depends on input array order.
    .sort((a, b) => b.aggregateTimeMs - a.aggregateTimeMs || a.workflowId.localeCompare(b.workflowId));

  return {
    version: TIME_SINK_MODEL_VERSION,
    ranked,
    totals: {
      totalTimeMs,
      workflowCount: inputs.length,
      coveredWorkflowCount,
    },
  };
}
