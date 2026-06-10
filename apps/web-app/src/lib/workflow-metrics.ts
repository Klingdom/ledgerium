/**
 * Workflow Metrics Engine — Ledgerium AI Dashboard V2
 *
 * Pure, deterministic module. No I/O, no DB calls, no imports from route files.
 * Same inputs always produce byte-identical outputs.
 *
 * Dimension naming note (post iter-020 principal review):
 *   - `speed`       — duration-conformance to an ideal band. Not "efficiency"
 *                     (we do not measure work-output-per-input); it measures
 *                     whether a process runs within a healthy time window.
 *   - `dataQuality` — extraction/capture confidence. Not "reliability"
 *                     (we do not measure production incident rates); it
 *                     measures how trustworthy the observed evidence is.
 *   - `consistency` — run-to-run variation of the same process.
 *   - `standardization` — documentation / SOP readiness.
 *
 * Honest labels prevent the product from over-claiming. See PRD §7.
 *
 * @see docs/prd/PRD_DASHBOARD_V2.md §7
 */

// ── Thresholds (see PRD §7) ───────────────────────────────────────────────────

/** Ideal duration lower bound for speed scoring (ms). */
const SPEED_IDEAL_DURATION_MIN_MS = 30_000;           // 30 s
/** Ideal duration upper bound for speed scoring (ms). */
const SPEED_IDEAL_DURATION_MAX_MS = 30 * 60 * 1_000;  // 30 min
/** Adjacent-band lower bound (short side): [10s, 30s). */
const SPEED_ADJACENT_LOWER_MIN_MS = 10_000;           // 10 s
/** Adjacent-band upper bound (long side): (30min, 2h]. */
const SPEED_ADJACENT_UPPER_MAX_MS = 2 * 60 * 60 * 1_000; // 2 h
/** Speed score awarded for ideal-band durations. */
const SPEED_IDEAL_SCORE = 30;
/** Speed score awarded for adjacent-band durations (graceful degradation, not binary cliff). */
const SPEED_ADJACENT_SCORE = 18;
/** Speed score floor when duration is present but far outside ideal/adjacent ranges. */
const SPEED_FLOOR_SCORE = 5;
/** Max consistency sub-score (maps to 30 pts weight in CEO formula). */
const CONSISTENCY_MAX_SCORE = 30;
/** Max data-quality sub-score (maps to 20 pts weight in CEO formula). */
const DATA_QUALITY_MAX_SCORE = 20;
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
/** Minimum overall health score for 'automate' tag (not unhealthy). */
const AUTOMATE_MIN_OVERALL = 40;

/** variationScore threshold for 'standardize' tag. */
const STANDARDIZE_VARIATION_THRESHOLD = 0.67;
/** Minimum overall health score for 'standardize' tag (not unhealthy). */
const STANDARDIZE_MIN_OVERALL = 40;

/** Maximum speed sub-score allowed before 'optimize' tag fires. */
const OPTIMIZE_MAX_SPEED = 15;
/** Minimum overall health score for 'optimize' tag (not unhealthy). */
const OPTIMIZE_MIN_OVERALL = 40;

/** Overall health score below which 'monitor' tag fires. */
const MONITOR_MAX_OVERALL = 40;
/** DataQuality sub-score below which 'monitor' tag fires. */
const MONITOR_MIN_DATA_QUALITY = 8;

/** Variation score threshold for 'high' label. */
const VARIATION_HIGH_THRESHOLD = 0.67;
/** Variation score threshold for 'medium' label. */
const VARIATION_MEDIUM_THRESHOLD = 0.34;

/** Bottleneck label max character length. */
const BOTTLENECK_LABEL_MAX_CHARS = 30;

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

/** Minimum healthy-workflow count required to emit positive portfolio chip. */
const HEALTHY_CHIP_MIN_COUNT = 3;
/** Overall health score threshold that qualifies a workflow as healthy for the positive chip. */
const HEALTHY_OVERALL_THRESHOLD = 70;

/**
 * Minimum prior-period workflow count for a meaningful portfolio delta.
 * Below this threshold, the prior-period score is null (insufficient signal).
 * iter-024: PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT §4.1 item (a).
 */
export const PORTFOLIO_PRIOR_MIN_WORKFLOWS = 3;

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
  /**
   * Layer 3 process-intelligence inputs parsed from
   * ProcessDefinition.intelligenceJson (the cached PortfolioIntelligence blob
   * produced by @ledgerium/intelligence-engine).
   *
   * iter-049 / WDC-R03: contract-prep field. Currently UNCONSUMED by the
   * computeWorkflowMetrics orchestrator — populated by the adapter so future
   * Path D iterations can wire Layer 3 metrics (variant share, path
   * similarity, step-count variance, divergence rate) onto the dashboard
   * without further changes to the adapter or its callers.
   *
   * Optional + nullable: null = no intelligenceJson cached, malformed JSON,
   * or schema validation failure. Future consumers MUST treat null as "no
   * Layer 3 signal available" and fall back to existing behavior.
   *
   * Field naming follows engine source-of-truth (PortfolioIntelligence):
   * - sequenceStability        ← variance.sequenceStability (0–1, fraction of
   *                              runs on the standard path; row's
   *                              "path_similarity" surrogate; consumers may
   *                              derive divergence_rate = 1 - this value)
   * - stepCountVarianceStdDev  ← variance.stepCountVariance.stdDev
   * - standardPathFrequency    ← variants.standardPath.frequency (0–1; row's
   *                              "variant_share" surrogate — share of runs
   *                              following the dominant variant)
   * - variantCount             ← variants.variantCount (count of distinct
   *                              execution paths observed)
   */
  intelligence?: {
    sequenceStability: number | null;
    stepCountVarianceStdDev: number | null;
    standardPathFrequency: number | null;
    variantCount: number | null;
  } | null;
}

export interface WorkflowMetricsOutput {
  runs: number | null;
  avgTimeMs: number | null;
  variationScore: number;              // 0–1
  variationLabel: 'low' | 'medium' | 'high';
  bottleneckLabel: string | null;      // step name or null
  healthScore: HealthScoreV2;
  opportunityTag: OpportunityTag;
  aiOpportunityScore: number;          // 0–100 — audit surface for 'automate' tag
  confidence: number | null;           // pass-through for subtext
  /** Distinct path variants in this process group (Process Variation Phase 1).
   *  Optional + nullable: only meaningful across ≥2 runs; the row gates display. */
  variantCount?: number | null;
}

export interface HealthScoreV2 {
  overall: number;          // 0–100
  speed: number;            // 0–30 (duration-conformance to ideal band)
  consistency: number;      // 0–30 (run-to-run variation)
  dataQuality: number;      // 0–20 (extraction confidence)
  standardization: number;  // 0–20 (SOP readiness + doc completeness)
  isGated: boolean;         // true if caller should hide breakdown
}

export type OpportunityTag =
  | 'automate'
  | 'standardize'
  | 'optimize'
  | 'monitor'
  | 'healthy';   // positive fallthrough — nothing to act on, process is sound

export interface InsightChip {
  id: string;           // stable key for React keying
  severity: 'critical' | 'warning' | 'info' | 'positive';
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
 * CEO formula (weighted): healthScore =
 *   0.30 × speed  +  0.30 × consistency  +  0.20 × dataQuality  +  0.20 × standardization
 *
 * Sub-score ranges map directly to the weight:
 *   speed           0–30
 *   consistency     0–30
 *   dataQuality     0–20
 *   standardization 0–20
 *   overall         0–100
 *
 * Speed scoring (graduated, no binary cliff):
 *   durationMs in [30s, 30min]               → 30  (ideal)
 *   durationMs in [10s, 30s) ∪ (30min, 2h]   → 18  (adjacent — fast/slow but not alarming)
 *   durationMs outside the above             → 5   (far outside — too short to be real, or far too long)
 *   durationMs === null                      → 0   (no evidence; gated)
 *
 * isGated is always false here — set by route handler per plan.
 */
export function computeHealthScoreV2(input: WorkflowMetricsInput): HealthScoreV2 {
  // Speed (0–30): graduated scoring on durationMs vs ideal band
  let speed: number;
  if (input.durationMs == null) {
    speed = 0;
  } else if (
    input.durationMs >= SPEED_IDEAL_DURATION_MIN_MS &&
    input.durationMs <= SPEED_IDEAL_DURATION_MAX_MS
  ) {
    speed = SPEED_IDEAL_SCORE;
  } else if (
    (input.durationMs >= SPEED_ADJACENT_LOWER_MIN_MS && input.durationMs < SPEED_IDEAL_DURATION_MIN_MS) ||
    (input.durationMs > SPEED_IDEAL_DURATION_MAX_MS && input.durationMs <= SPEED_ADJACENT_UPPER_MAX_MS)
  ) {
    speed = SPEED_ADJACENT_SCORE;
  } else {
    speed = SPEED_FLOOR_SCORE;
  }

  // Consistency (0–30): (1 - variationScore) * 30
  const { score: variationScore } = computeVariation(input);
  const consistency = Math.round((1 - variationScore) * CONSISTENCY_MAX_SCORE);

  // DataQuality (0–20): confidence * 20
  const dataQuality = input.confidence != null
    ? Math.round(Math.max(0, Math.min(1, input.confidence)) * DATA_QUALITY_MAX_SCORE)
    : 0;

  // Standardization (0–20): (sopReadiness_pts + docScore_pts) / 2 capped at 20
  // docScore proxy: stepCount ≥ 3 gives full 20 pts; fractional below that.
  const sopReadiness = computeSopReadinessProxy(input.confidence, input.stepCount);
  const sopPts =
    sopReadiness === 'ready' ? STANDARDIZATION_SOP_READY_PTS :
    sopReadiness === 'partial' ? STANDARDIZATION_SOP_PARTIAL_PTS :
    0;
  const docPts =
    (input.stepCount == null || input.stepCount === 0) ? 0 :
    input.stepCount >= 3 ? STANDARDIZATION_MAX_SCORE :
    Math.round((input.stepCount / 3) * STANDARDIZATION_MAX_SCORE);
  const standardization = Math.min(
    Math.round((sopPts + docPts) / 2),
    STANDARDIZATION_MAX_SCORE,
  );

  const overall = speed + consistency + dataQuality + standardization;

  return {
    overall,
    speed,
    consistency,
    dataQuality,
    standardization,
    isGated: false,
  };
}

/**
 * Computes AI opportunity score from available WorkflowMetricsInput fields.
 *
 * Exposed (not internal) so that the 'automate' tag's firing condition is
 * auditable from the API response. Hidden scores are gates; auditable scores
 * are decisions. We prefer decisions.
 *
 * Range: 0–100.
 */
export function computeAiOpportunityScore(input: WorkflowMetricsInput): number {
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
 * 1. Automate     — aiOpportunityScore >= 60 AND toolsUsed.length >= 2 AND overall >= 40
 * 2. Standardize  — variationScore >= 0.67 AND overall >= 40
 * 3. Optimize     — speed < 15 AND overall >= 40
 * 4. Monitor      — overall < 40 OR dataQuality < 8
 * 5. Healthy      — nothing to act on; the process is sound
 *
 * The 'healthy' fallthrough is a positive signal, not a silent null. Surfacing
 * it in the UI lets us show users their wins — the command-center needs an
 * opinion on every row, including "this is fine."
 */
export function computeOpportunityTag(
  input: WorkflowMetricsInput,
  healthScore: HealthScoreV2,
): OpportunityTag {
  const aiScore = computeAiOpportunityScore(input);
  const { score: variationScore } = computeVariation(input);

  // Rule 1: Automate
  if (aiScore >= AUTOMATE_AI_OPPORTUNITY_THRESHOLD && input.toolsUsed.length >= AUTOMATE_MIN_TOOLS && healthScore.overall >= AUTOMATE_MIN_OVERALL) {
    return 'automate';
  }

  // Rule 2: Standardize
  if (variationScore >= STANDARDIZE_VARIATION_THRESHOLD && healthScore.overall >= STANDARDIZE_MIN_OVERALL) {
    return 'standardize';
  }

  // Rule 3: Optimize
  if (healthScore.speed < OPTIMIZE_MAX_SPEED && healthScore.overall >= OPTIMIZE_MIN_OVERALL) {
    return 'optimize';
  }

  // Rule 4: Monitor
  if (healthScore.overall < MONITOR_MAX_OVERALL || healthScore.dataQuality < MONITOR_MIN_DATA_QUALITY) {
    return 'monitor';
  }

  // Rule 5: Healthy — positive fallthrough
  return 'healthy';
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
  const aiOpportunityScore = computeAiOpportunityScore(input);

  return {
    runs,
    avgTimeMs,
    variationScore,
    variationLabel,
    bottleneckLabel,
    healthScore,
    opportunityTag,
    aiOpportunityScore,
    confidence: input.confidence,
    variantCount: input.processDefinition?.variantCount ?? null,
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
 * §7 Prior-period Portfolio Health Score (for period-over-period delta)
 *
 * Partitions workflows by `updatedAt` into [referenceDate − 2×windowDays,
 * referenceDate − windowDays) and computes the aggregate health score for
 * that prior cohort. Returns null if the prior-period partition contains
 * fewer than PORTFOLIO_PRIOR_MIN_WORKFLOWS workflows (insufficient signal).
 *
 * @param workflows - Per-workflow metrics output (current-period cohort)
 * @param allWorkflowsMeta - Metadata for all workflows, including `updatedAt`
 *   (parallel array — index-aligned with `workflows`)
 * @param windowDays - Length of each time window in days (default: 30)
 * @param referenceDate - Point-in-time reference (default: now); used for
 *   deterministic testing.
 *
 * iter-024: PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT §4.1 item (a).
 * Note: timeRange UI state does NOT affect the prior window — 30d is always
 * used for the prior-period baseline in MVP (D7 defers timeRange to the API
 * in a future iteration).
 */
export function computePortfolioHealthScorePrior(
  workflows: WorkflowMetricsOutput[],
  allWorkflowsMeta: Array<{ updatedAt: string }>,
  windowDays: number,
  referenceDate: Date,
): number | null {
  if (workflows.length === 0) return null;

  const refMs = referenceDate.getTime();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const priorStart = refMs - 2 * windowMs;
  const priorEnd = refMs - windowMs;

  const priorWorkflows: WorkflowMetricsOutput[] = [];
  for (let i = 0; i < workflows.length; i++) {
    const meta = allWorkflowsMeta[i];
    if (!meta) continue;
    const updatedMs = new Date(meta.updatedAt).getTime();
    if (updatedMs >= priorStart && updatedMs < priorEnd) {
      priorWorkflows.push(workflows[i]!);
    }
  }

  if (priorWorkflows.length < PORTFOLIO_PRIOR_MIN_WORKFLOWS) return null;

  return computePortfolioHealthScore(priorWorkflows);
}

/**
 * §7 Insight Chips
 *
 * Returns up to 5 chips, ordered by severity descending (critical → warning → info → positive).
 * Each chip fires only when its condition is met.
 *
 * Chip rules:
 * - High variance (warning):      >= 2 workflows with variationScore > 0.7
 * - Bottleneck insight (varies):  a critical/warning ProcessInsight of type 'bottleneck' or 'delay'
 * - Automation candidates (info): >= 2 workflows tagged 'automate'
 * - Needs review (warning):       >= 2 workflows tagged 'monitor'
 * - Healthy portfolio (positive): >= 3 workflows with overall >= 70 AND no problem chips fired
 *
 * The positive chip is only emitted when no critical/warning chips are present —
 * a command-center should not say "all good" while simultaneously flagging problems.
 */
export function computeInsightChips(
  workflows: WorkflowMetricsOutput[],
  processInsights: Array<{ insightType: string; severity: string; title: string }>,
): InsightChip[] {
  const chips: InsightChip[] = [];

  // Chip 1: High variance — action-leading copy (iter-024 §4.1 item b)
  const highVarianceCount = workflows.filter((w) => w.variationScore > 0.7).length;
  if (highVarianceCount >= 2) {
    chips.push({
      id: 'variance_high',
      severity: 'warning',
      label: `${highVarianceCount} workflows show high execution variance → investigate consistency`,
      filterKey: 'variationScore_gt_0.7',
      count: highVarianceCount,
    });
  }

  // Chip 2: Bottleneck/delay insight (critical or warning ProcessInsight) — action-leading copy
  const bottleneckInsights = processInsights.filter(
    (i) =>
      (i.insightType === 'bottleneck' || i.insightType === 'delay') &&
      (i.severity === 'critical' || i.severity === 'warning'),
  );
  for (const insight of bottleneckInsights) {
    chips.push({
      id: `bottleneck_${insight.title.replace(/\s+/g, '_').toLowerCase().slice(0, 40)}`,
      severity: insight.severity === 'critical' ? 'critical' : 'warning',
      label: `Bottleneck: ${insight.title} → investigate step owner`,
      filterKey: 'bottleneck_insight',
      count: 1,
    });
    break; // Only the top insight
  }

  // Chip 3: Automation candidates — action-leading copy
  const automationCount = workflows.filter((w) => w.opportunityTag === 'automate').length;
  if (automationCount >= 2) {
    chips.push({
      id: 'automation_candidates',
      severity: 'info',
      label: `${automationCount} automation opportunities → prioritize top-scored for pilot`,
      filterKey: 'opportunityTag_automate',
      count: automationCount,
    });
  }

  // Chip 4: Low confidence / needs review — action-leading copy
  const needsReviewCount = workflows.filter((w) => w.opportunityTag === 'monitor').length;
  if (needsReviewCount >= 2) {
    chips.push({
      id: 'needs_review',
      severity: 'warning',
      label: `${needsReviewCount} workflows at risk → schedule review this week`,
      filterKey: 'opportunityTag_monitor',
      count: needsReviewCount,
    });
  }

  // Chip 5: Healthy portfolio (positive) — confirmational tone; no problem chips present
  const hasProblemChips = chips.some((c) => c.severity === 'critical' || c.severity === 'warning');
  if (!hasProblemChips) {
    const healthyCount = workflows.filter(
      (w) => w.healthScore.overall >= HEALTHY_OVERALL_THRESHOLD,
    ).length;
    if (healthyCount >= HEALTHY_CHIP_MIN_COUNT) {
      chips.push({
        id: 'healthy_portfolio',
        severity: 'positive',
        label: `${healthyCount} workflows healthy → no action needed`,
        filterKey: 'healthScore_gte_70',
        count: healthyCount,
      });
    }
  }

  // Sort by severity: critical → warning → info → positive
  const severityOrder: Record<InsightChip['severity'], number> = {
    critical: 4,
    warning: 3,
    info: 2,
    positive: 1,
  };
  chips.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);

  return chips.slice(0, 5);
}
