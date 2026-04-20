/**
 * Workflow Metrics Engine — Ledgerium AI Dashboard V2
 *
 * Pure, deterministic module. No I/O, no DB calls, no imports from route files.
 * Same inputs always produce byte-identical outputs.
 *
 * @see docs/prd/PRD_DASHBOARD_V2.md §7
 */

// ── Thresholds (see PRD §7) ───────────────────────────────────────────────────

/** Ideal duration lower bound for efficiency scoring (ms). */
const EFFICIENCY_IDEAL_DURATION_MIN_MS = 30_000;          // 30 s
/** Ideal duration upper bound for efficiency scoring (ms). */
const EFFICIENCY_IDEAL_DURATION_MAX_MS = 30 * 60 * 1_000; // 30 min
/** Efficiency score awarded when duration is outside the ideal range. */
const EFFICIENCY_FLOOR_SCORE = 5;
/** Max efficiency sub-score (maps to 30 pts weight in CEO formula). */
const EFFICIENCY_MAX_SCORE = 30;
/** Max consistency sub-score (maps to 30 pts weight in CEO formula). */
const CONSISTENCY_MAX_SCORE = 30;
/** Max reliability sub-score (maps to 20 pts weight in CEO formula). */
const RELIABILITY_MAX_SCORE = 20;
/** Max standardization sub-score (maps to 20 pts weight in CEO formula). */
const STANDARDIZATION_MAX_SCORE = 20;
/** Points for sopReadiness === 'ready' in standardization scoring. */
const STANDARDIZATION_SOP_READY_PTS = 20;
/** Points for sopReadiness === 'partial' in standardization scoring. */
const STANDARDIZATION_SOP_PARTIAL_PTS = 10;

/** aiOpportunityScore threshold for 'automate' tag. */
const AUTOMATE_AI_OPPORTUNITY_THRESHOLD = 60;
/** Minimum toolsUsed length required for 'automate' tag. */
const AUTOMATE_MIN_TOOLS = 2;

/** variationScore threshold for 'standardize' tag. */
const STANDARDIZE_VARIATION_THRESHOLD = 0.67;
/** Minimum overall health score for 'standardize' tag (not unhealthy). */
const STANDARDIZE_MIN_OVERALL = 40;

/** Maximum efficiency sub-score allowed before 'optimize' tag fires. */
const OPTIMIZE_MAX_EFFICIENCY = 15;
/** Minimum overall health score for 'optimize' tag (not unhealthy). */
const OPTIMIZE_MIN_OVERALL = 40;

/** Overall health score below which 'monitor' tag fires. */
const MONITOR_MAX_OVERALL = 40;
/** Reliability sub-score below which 'monitor' tag fires. */
const MONITOR_MIN_RELIABILITY = 8;

/** Variation score threshold for 'high' label. */
const VARIATION_HIGH_THRESHOLD = 0.67;
/** Variation score threshold for 'medium' label. */
const VARIATION_MEDIUM_THRESHOLD = 0.34;

/** Bottleneck label max character length. */
const BOTTLENECK_LABEL_MAX_CHARS = 30;
/** Bottleneck display fallback when no insights exist. */
const BOTTLENECK_NO_DATA_LABEL = '—';

/** Number of runs required for trend-readiness. */
const TREND_READY_MIN_RUNS = 5;

/** Variant count divisor for variation proxy when stabilityScore is null. */
const VARIATION_VARIANT_COUNT_DIVISOR = 10;

/** Default (unknown) variation score when all sources are null. */
const VARIATION_DEFAULT = 0.5;

/** AI opportunity step count at which full step-contribution is earned (30 pts). */
const AI_OPPORTUNITY_FULL_STEP_COUNT = 15;
/** AI opportunity duration (ms) at which full duration-contribution is earned (25 pts). */
const AI_OPPORTUNITY_FULL_DURATION_MS = 300_000; // 5 min
/** AI opportunity tool count at which full system-contribution is earned (25 pts). */
const AI_OPPORTUNITY_FULL_TOOL_COUNT = 3;
/** AI opportunity bonus points for high optimization potential. */
const AI_OPPORTUNITY_HIGH_OPT_BONUS = 20;

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface WorkflowMetricsInput {
  id: string;
  confidence: number | null;
  stepCount: number | null;
  durationMs: number | null;
  phaseCount: number | null;
  toolsUsed: string[];           // pre-parsed from JSON
  createdAt: Date;
  lastViewedAt: Date | null;
  processDefinition: {
    runCount: number;
    variantCount: number;
    avgDurationMs: number | null;
    medianDurationMs: number | null;
    stabilityScore: number | null;
    confidenceScore: number | null;
  } | null;
  processInsights: Array<{
    insightType: string;           // 'bottleneck' | 'delay' | 'variance' | etc.
    severity: string;
    title: string;
    observedValue: string | null;
  }>;
}

export interface WorkflowMetricsOutput {
  runs: number | null;
  avgTimeMs: number | null;
  variationScore: number;          // 0–1
  variationLabel: 'low' | 'medium' | 'high';
  bottleneckLabel: string | null;  // step name or null
  healthScore: HealthScoreV2;
  opportunityTag: OpportunityTag;
  confidence: number | null;       // pass-through for subtext
  isTrendReady: boolean;           // §7.8
}

export interface HealthScoreV2 {
  overall: number;     // 0–100
  efficiency: number;  // 0–25 (note: PRD §7 comment says 0–25 input but CEO formula maps to 0–30 pts; see note below)
  consistency: number; // 0–25 (computed from 0–30 pts; see note below)
  reliability: number; // 0–20 (scaled; see §7.5)
  standardization: number; // 0–20 (scaled; see §7.5)
  isGated: boolean;    // true if caller should hide breakdown
}

export type OpportunityTag = 'automate' | 'standardize' | 'optimize' | 'monitor' | 'none';

export interface InsightChip {
  id: string;           // stable key for React keying
  severity: 'critical' | 'warning' | 'info';
  label: string;        // natural language, pre-rendered
  filterKey: string;    // e.g. 'variationScore_gt_0.7'
  count: number;
}

// ── Severity ordering helper ──────────────────────────────────────────────────

const SEVERITY_ORDER: Record<string, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

function severityRank(s: string): number {
  return SEVERITY_ORDER[s] ?? 0;
}

// ── Per-workflow functions ────────────────────────────────────────────────────

/**
 * §7.1 — Runs
 *
 * Priority:
 * 1. processDefinition.runCount if non-null and > 0
 * 2. 1 (single run floor) if processDefinition is null
 * 3. null if workflow has never been analyzed and stepCount is null
 */
export function computeRuns(input: WorkflowMetricsInput): number | null {
  if (input.processDefinition != null && input.processDefinition.runCount > 0) {
    return input.processDefinition.runCount;
  }
  if (input.processDefinition === null) {
    // Single-run floor only when there is some evidence of a workflow capture
    if (input.stepCount === null) {
      return null;
    }
    return 1;
  }
  // processDefinition exists but runCount is 0 — no confirmed runs
  return null;
}

/**
 * §7.2 — Avg Time (ms)
 *
 * Priority:
 * 1. processDefinition.avgDurationMs if non-null
 * 2. processDefinition.medianDurationMs if avgDurationMs is null
 * 3. workflow.durationMs as single-run fallback
 * 4. null if all three are null
 */
export function computeAvgTimeMs(input: WorkflowMetricsInput): number | null {
  if (input.processDefinition != null) {
    if (input.processDefinition.avgDurationMs != null) {
      return input.processDefinition.avgDurationMs;
    }
    if (input.processDefinition.medianDurationMs != null) {
      return input.processDefinition.medianDurationMs;
    }
  }
  if (input.durationMs != null) {
    return input.durationMs;
  }
  return null;
}

/**
 * §7.3 — Variation
 *
 * Priority:
 * 1. 1 - processDefinition.stabilityScore (higher stability = lower variation)
 * 2. processDefinition.variantCount / 10 capped at 1 (if stabilityScore null but variantCount > 0)
 * 3. 1 - confidence if processDefinition is null and confidence is non-null
 * 4. 0.5 (unknown default)
 *
 * Labels: >= 0.67 → high, >= 0.34 → medium, < 0.34 → low
 */
export function computeVariation(input: WorkflowMetricsInput): { score: number; label: 'low' | 'medium' | 'high' } {
  let score: number;

  if (input.processDefinition != null) {
    if (input.processDefinition.stabilityScore != null) {
      score = 1 - input.processDefinition.stabilityScore;
    } else if (input.processDefinition.variantCount > 0) {
      score = Math.min(input.processDefinition.variantCount / VARIATION_VARIANT_COUNT_DIVISOR, 1);
    } else {
      // processDefinition exists but no useful signals
      score = input.confidence != null ? 1 - input.confidence : VARIATION_DEFAULT;
    }
  } else if (input.confidence != null) {
    score = 1 - input.confidence;
  } else {
    score = VARIATION_DEFAULT;
  }

  let label: 'low' | 'medium' | 'high';
  if (score >= VARIATION_HIGH_THRESHOLD) {
    label = 'high';
  } else if (score >= VARIATION_MEDIUM_THRESHOLD) {
    label = 'medium';
  } else {
    label = 'low';
  }

  return { score, label };
}

/**
 * §7.4 — Bottleneck Label
 *
 * Derives from ProcessInsight rows of type 'bottleneck' or 'delay'.
 * Returns title of highest-severity insight, truncated to 30 chars.
 * Returns null (displayed as "—" by caller) when no qualifying insights exist.
 */
export function computeBottleneckLabel(input: WorkflowMetricsInput): string | null {
  const qualifying = input.processInsights.filter(
    (i) => i.insightType === 'bottleneck' || i.insightType === 'delay',
  );

  if (qualifying.length === 0) {
    return null;
  }

  // Sort by severity descending; stable sort by preserving original order on tie
  const sorted = [...qualifying].sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity),
  );

  const top = sorted[0]!;
  if (top.title.length > BOTTLENECK_LABEL_MAX_CHARS) {
    return top.title.slice(0, BOTTLENECK_LABEL_MAX_CHARS);
  }
  return top.title;
}

/**
 * Internal helper — computes sopReadiness proxy from confidence + stepCount.
 * Mirrors existing route.ts logic to keep standardization scoring consistent.
 */
function computeSopReadinessProxy(
  confidence: number | null,
  stepCount: number | null,
): 'ready' | 'partial' | 'not_ready' {
  if (stepCount == null || stepCount === 0) return 'not_ready';
  if (confidence != null && confidence > 0.8) return 'ready';
  if (confidence != null && confidence > 0.5 && stepCount > 0) return 'partial';
  return 'not_ready';
}

/**
 * §7.5 — Health Score V2
 *
 * CEO formula: healthScore = 0.30×efficiency + 0.30×consistency + 0.20×reliability + 0.20×standardization
 *
 * Note on sub-score ranges vs PRD interface comment:
 * The interface declares efficiency 0–25 and consistency 0–25 per the comment, but the
 * CEO formula weights (0.30 each) map to 0–30 pts. The PRD §7.5 table explicitly says
 * "→ 0–30 pts" for efficiency and consistency. We use 0–30 for efficiency and consistency
 * to match the table (overall 0–100 = 30+30+20+20). The interface comment "0–25" is a PRD
 * copy error vs the formula table; we follow the table.
 *
 * isGated is always false here — set by route handler per plan.
 */
export function computeHealthScoreV2(input: WorkflowMetricsInput): HealthScoreV2 {
  // Efficiency (0–30): durationMs vs ideal range
  let efficiency: number;
  if (input.durationMs == null) {
    efficiency = 0;
  } else if (
    input.durationMs >= EFFICIENCY_IDEAL_DURATION_MIN_MS &&
    input.durationMs <= EFFICIENCY_IDEAL_DURATION_MAX_MS
  ) {
    efficiency = EFFICIENCY_MAX_SCORE;
  } else {
    efficiency = EFFICIENCY_FLOOR_SCORE;
  }

  // Consistency (0–30): (1 - variationScore) * 30
  const { score: variationScore } = computeVariation(input);
  const consistency = Math.round((1 - variationScore) * CONSISTENCY_MAX_SCORE);

  // Reliability (0–20): confidence * 20
  const reliability = input.confidence != null
    ? Math.round(Math.max(0, Math.min(1, input.confidence)) * RELIABILITY_MAX_SCORE)
    : 0;

  // Standardization (0–20): based on sopReadiness proxy + step completeness proxy
  // "sopReadiness_pts + docScore_pts / 2 capped at 20"
  // PRD §7.5: (sopReadiness_pts + docScore_pts) / 2 capped at 20
  // docScore proxy: whether stepCount is present and meaningful (0–20 scale)
  const sopReadiness = computeSopReadinessProxy(input.confidence, input.stepCount);
  const sopPts =
    sopReadiness === 'ready' ? STANDARDIZATION_SOP_READY_PTS :
    sopReadiness === 'partial' ? STANDARDIZATION_SOP_PARTIAL_PTS :
    0;
  // Doc completeness proxy: stepCount > 0 gives partial credit; stepCount >= 3 = full
  const docPts =
    (input.stepCount == null || input.stepCount === 0) ? 0 :
    input.stepCount >= 3 ? STANDARDIZATION_MAX_SCORE :
    Math.round((input.stepCount / 3) * STANDARDIZATION_MAX_SCORE);
  const standardization = Math.min(
    Math.round((sopPts + docPts) / 2),
    STANDARDIZATION_MAX_SCORE,
  );

  const overall = efficiency + consistency + reliability + standardization;

  return {
    overall,
    efficiency,
    consistency,
    reliability,
    standardization,
    isGated: false,
  };
}

/**
 * Internal helper — computes AI opportunity score from available WorkflowMetricsInput fields.
 * Mirrors the logic in route.ts computeAiOpportunityScore, adapted to use pre-parsed toolsUsed.
 */
function computeAiOpportunityScore(input: WorkflowMetricsInput): number {
  let score = 0;

  if (input.stepCount != null) {
    score += Math.min(
      Math.round((input.stepCount / AI_OPPORTUNITY_FULL_STEP_COUNT) * 30),
      30,
    );
  }

  if (input.durationMs != null) {
    score += Math.min(
      Math.round((input.durationMs / AI_OPPORTUNITY_FULL_DURATION_MS) * 25),
      25,
    );
  }

  const toolCount = input.toolsUsed.length;
  score += Math.min(
    Math.round((toolCount / AI_OPPORTUNITY_FULL_TOOL_COUNT) * 25),
    25,
  );

  // High optimization potential proxy: high step count + long duration
  const isHighSteps = input.stepCount != null && input.stepCount > 15;
  const isHighDuration = input.durationMs != null && input.durationMs > 300_000;
  if (isHighSteps || isHighDuration) {
    score += AI_OPPORTUNITY_HIGH_OPT_BONUS;
  }

  return Math.min(score, 100);
}

/**
 * §7.6 — Opportunity Tag
 *
 * Decision tree, top-to-bottom; first match wins:
 * 1. Automate — aiOpportunityScore >= 60 AND toolsUsed.length >= 2
 * 2. Standardize — variationScore >= 0.67 AND overall >= 40
 * 3. Optimize — efficiency < 15 AND overall >= 40
 * 4. Monitor — overall < 40 OR reliability < 8
 * 5. None — no conditions met
 */
export function computeOpportunityTag(
  input: WorkflowMetricsInput,
  healthScore: HealthScoreV2,
): OpportunityTag {
  const aiScore = computeAiOpportunityScore(input);
  const { score: variationScore } = computeVariation(input);

  // Rule 1: Automate
  if (aiScore >= AUTOMATE_AI_OPPORTUNITY_THRESHOLD && input.toolsUsed.length >= AUTOMATE_MIN_TOOLS) {
    return 'automate';
  }

  // Rule 2: Standardize
  if (variationScore >= STANDARDIZE_VARIATION_THRESHOLD && healthScore.overall >= STANDARDIZE_MIN_OVERALL) {
    return 'standardize';
  }

  // Rule 3: Optimize
  if (healthScore.efficiency < OPTIMIZE_MAX_EFFICIENCY && healthScore.overall >= OPTIMIZE_MIN_OVERALL) {
    return 'optimize';
  }

  // Rule 4: Monitor
  if (healthScore.overall < MONITOR_MAX_OVERALL || healthScore.reliability < MONITOR_MIN_RELIABILITY) {
    return 'monitor';
  }

  // Rule 5: None
  return 'none';
}

// ── Top-level orchestrator ────────────────────────────────────────────────────

/**
 * Compute all per-workflow metrics. Called once per workflow by the route handler.
 * Assembles WorkflowMetricsOutput from the per-function results.
 *
 * isGated is always false here; the route handler sets it based on plan.
 */
export function computeWorkflowMetrics(input: WorkflowMetricsInput): WorkflowMetricsOutput {
  const runs = computeRuns(input);
  const avgTimeMs = computeAvgTimeMs(input);
  const { score: variationScore, label: variationLabel } = computeVariation(input);
  const bottleneckLabel = computeBottleneckLabel(input);
  const healthScore = computeHealthScoreV2(input);
  const opportunityTag = computeOpportunityTag(input, healthScore);
  const isTrendReady = (input.processDefinition?.runCount ?? 0) >= TREND_READY_MIN_RUNS;

  return {
    runs,
    avgTimeMs,
    variationScore,
    variationLabel,
    bottleneckLabel,
    healthScore,
    opportunityTag,
    confidence: input.confidence,
    isTrendReady,
  };
}

// ── Aggregate functions ───────────────────────────────────────────────────────

/**
 * §7 Portfolio Health Score
 *
 * Returns mean of all workflow healthScore.overall values, rounded to integer.
 * Returns 0 for empty array.
 */
export function computePortfolioHealthScore(workflows: WorkflowMetricsOutput[]): number {
  if (workflows.length === 0) return 0;
  const sum = workflows.reduce((acc, w) => acc + w.healthScore.overall, 0);
  return Math.round(sum / workflows.length);
}

/**
 * §7 Insight Chips
 *
 * Returns up to 5 chips, ordered by severity descending.
 * Each chip fires only when its count condition is met (see §5 Section 2 rules).
 *
 * Chip rules (from PRD §5 Section 2):
 * - High variance: >= 2 workflows with variationScore > 0.7
 * - Bottleneck insight: a ProcessInsight of type 'bottleneck' or 'delay' with severity 'critical' or 'warning'
 * - Automation candidates: >= 2 workflows with opportunityTag === 'automate' (aiOpportunityScore >= 60)
 * - Needs review: >= 2 workflows with healthScore.overall < 40 OR reliability < 8 (monitor tag proxy)
 * - Stale: staleCount >= 2 (stale detection is route-level; we count workflows with null lastViewedAt here)
 *
 * Note: The PRD specifies aiOpportunityScore >= 60 fires the chip and healthStatus 'needs_review' for
 * the low-confidence chip. We use WorkflowMetricsOutput signals (opportunityTag and monitor tag) as
 * the closest available proxies since WorkflowMetricsOutput does not carry healthStatus.
 */
export function computeInsightChips(
  workflows: WorkflowMetricsOutput[],
  processInsights: Array<{ insightType: string; severity: string; title: string }>,
): InsightChip[] {
  const chips: InsightChip[] = [];

  // Chip 1: High variance
  const highVarianceCount = workflows.filter((w) => w.variationScore > 0.7).length;
  if (highVarianceCount >= 2) {
    chips.push({
      id: 'variance_high',
      severity: 'warning',
      label: `${highVarianceCount} workflows show high execution variance`,
      filterKey: 'variationScore_gt_0.7',
      count: highVarianceCount,
    });
  }

  // Chip 2: Bottleneck/delay insight (critical or warning ProcessInsight)
  const bottleneckInsights = processInsights.filter(
    (i) =>
      (i.insightType === 'bottleneck' || i.insightType === 'delay') &&
      (i.severity === 'critical' || i.severity === 'warning'),
  );
  for (const insight of bottleneckInsights) {
    chips.push({
      id: `bottleneck_${insight.title.replace(/\s+/g, '_').toLowerCase().slice(0, 40)}`,
      severity: insight.severity === 'critical' ? 'critical' : 'warning',
      label: insight.title,
      filterKey: 'bottleneck_insight',
      count: 1,
    });
    break; // Only the top insight per PRD ("Uses insight title directly" implies one)
  }

  // Chip 3: Automation candidates
  const automationCount = workflows.filter((w) => w.opportunityTag === 'automate').length;
  if (automationCount >= 2) {
    chips.push({
      id: 'automation_candidates',
      severity: 'info',
      label: `${automationCount} workflows are strong automation candidates`,
      filterKey: 'opportunityTag_automate',
      count: automationCount,
    });
  }

  // Chip 4: Low confidence / needs review (monitor tag = overall < 40 or reliability < 8)
  const needsReviewCount = workflows.filter((w) => w.opportunityTag === 'monitor').length;
  if (needsReviewCount >= 2) {
    chips.push({
      id: 'needs_review',
      severity: 'warning',
      label: `${needsReviewCount} workflows have low confidence and need review`,
      filterKey: 'opportunityTag_monitor',
      count: needsReviewCount,
    });
  }

  // Chip 5: Stale (null lastViewedAt used as proxy within metrics context)
  // Note: actual stale detection (age-based) lives in the route handler.
  // The aggregate function receives WorkflowMetricsOutput which does not carry isStale.
  // We emit this chip only if the caller injects count via a sentinel workflow (no direct signal).
  // PRD §7 does not specify a stale input in computeInsightChips — this is a resolution gap.
  // Resolution: stale chip is omitted from the pure aggregate; route handler supplements if needed.
  // This gap is surfaced in the iteration summary.

  // Sort by severity descending, take top 5
  const severityOrder: Record<InsightChip['severity'], number> = { critical: 3, warning: 2, info: 1 };
  chips.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);

  return chips.slice(0, 5);
}
