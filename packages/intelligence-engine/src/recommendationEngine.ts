/**
 * Recommendation Engine — generates evidence-based, actionable recommendations
 * from process intelligence data.
 *
 * Recommendation types:
 * 1. Standardize on variant — when dominant variant is clearly superior
 * 2. Update SOP — when SOP alignment is low
 * 3. Automate step — when step is repetitive data entry with high duration
 * 4. Remove redundant step — when step appears in <20% of runs
 * 5. Reduce rework — when validation loops are frequent
 *
 * Each recommendation includes:
 * - Type, title, description
 * - Estimated impact (time savings, quality improvement)
 * - Confidence level
 * - Evidence (specific data points)
 * - Affected process/steps
 *
 * All computations are deterministic and evidence-linked.
 */

import type {
  ProcessRunBundle,
  VariantSet,
  VarianceReport,
  ProcessMetrics,
  TimestudyResult,
  BottleneckReport,
} from './types.js';
import type { SOPAlignmentResult } from './sopAlignmentEngine.js';
import type { StandardizationScore } from './standardizationScorer.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export type RecommendationType =
  | 'standardize_variant'
  | 'update_sop'
  | 'automate_step'
  | 'remove_step'
  | 'reduce_rework'
  | 'add_validation'
  | 'simplify_handoffs';

export type RecommendationImpact = 'high' | 'medium' | 'low';
export type RecommendationConfidence = 'high' | 'medium' | 'low';
export type RecommendationEffort = 'low' | 'medium' | 'high';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  impact: RecommendationImpact;
  confidence: RecommendationConfidence;
  effort: RecommendationEffort;
  /** Estimated time savings in ms per run (null if not applicable). */
  estimatedTimeSavingsMs: number | null;
  /** Estimated percentage improvement. */
  estimatedImprovementPct: number | null;
  /** Evidence supporting this recommendation. */
  evidence: string;
  /** Number of data points supporting this recommendation. */
  dataPoints: number;
  /** Affected process definition name. */
  processName: string;
  /** Affected step positions (if step-level). */
  affectedSteps: number[];
  /** Which runs/workflows this applies to. */
  evidenceRunIds: string[];
  computedAt: string;
}

export interface AutomationROI {
  stepPosition: number;
  stepCategory: string;
  /** Average duration of this step across runs. */
  avgDurationMs: number;
  /** How many runs include this step. */
  runCount: number;
  /** Estimated time savings if automated (step duration × run count). */
  totalSavingsMs: number;
  /** Per-run savings. */
  perRunSavingsMs: number;
  /** Automation suitability score 0-100. */
  suitabilityScore: number;
  /** Why this step is automatable. */
  rationale: string;
}

export interface WhatIfScenario {
  /** Description of the change. */
  change: string;
  /** Current average duration. */
  currentDurationMs: number;
  /** Estimated new duration after change. */
  estimatedDurationMs: number;
  /** Percentage change (negative = improvement). */
  changePct: number;
  /** Current step count. */
  currentStepCount: number;
  /** Estimated new step count. */
  estimatedStepCount: number;
  /** Confidence in the estimate. */
  confidence: RecommendationConfidence;
  /** Assumptions made. */
  assumptions: string[];
}

// ─── Automation categories ──────────────────────────────────────────────────

const AUTOMATABLE_CATEGORIES = new Set([
  'data_entry',
  'fill_and_submit',
  'repeated_click_dedup',
  'file_action',
]);

const PARTIALLY_AUTOMATABLE = new Set([
  'send_action',
  'click_then_navigate',
]);

// ─── Recommendation Generation ──────────────────────────────────────────────

export function generateRecommendations(
  processName: string,
  runs: ProcessRunBundle[],
  metrics: ProcessMetrics,
  variants: VariantSet,
  variance: VarianceReport,
  timestudy: TimestudyResult,
  bottlenecks: BottleneckReport,
  sopAlignment: SOPAlignmentResult | null,
  standardization: StandardizationScore | null,
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const now = new Date().toISOString();
  let idCounter = 0;
  const nextId = () => `rec-${++idCounter}`;

  // ── 1. Standardize on variant ─────────────────────────────────────────

  if (variants.standardPath && variants.variantCount >= 2) {
    const standard = variants.standardPath;
    const nonStandard = variants.variants.filter(v => !v.isStandardPath);

    // Find if standard path is meaningfully faster
    const standardRuns = runs.filter(r => standard.evidenceRunIds.includes(r.processRun.runId));
    const nonStandardRuns = runs.filter(r => !standard.evidenceRunIds.includes(r.processRun.runId));

    const stdAvgDuration = avgDuration(standardRuns);
    const nonStdAvgDuration = avgDuration(nonStandardRuns);

    if (stdAvgDuration != null && nonStdAvgDuration != null && nonStdAvgDuration > stdAvgDuration * 1.15) {
      const savingsPct = Math.round((1 - stdAvgDuration / nonStdAvgDuration) * 100);
      const savingsMs = nonStdAvgDuration - stdAvgDuration;

      recommendations.push({
        id: nextId(),
        type: 'standardize_variant',
        title: `Standardize on dominant variant`,
        description: `The standard execution path (${Math.round(standard.frequency * 100)}% of runs) is ${savingsPct}% faster than alternative variants. Standardizing all runs on this path could save ~${formatMs(savingsMs)} per execution.`,
        impact: savingsPct >= 25 ? 'high' : savingsPct >= 10 ? 'medium' : 'low',
        confidence: standard.runCount >= 10 ? 'high' : standard.runCount >= 5 ? 'medium' : 'low',
        effort: 'medium',
        estimatedTimeSavingsMs: savingsMs,
        estimatedImprovementPct: savingsPct,
        evidence: `Standard path: ${standard.runCount} runs, avg ${formatMs(stdAvgDuration)}. Other variants: ${nonStandardRuns.length} runs, avg ${formatMs(nonStdAvgDuration)}.`,
        dataPoints: runs.length,
        processName,
        affectedSteps: [],
        evidenceRunIds: metrics.evidenceRunIds,
        computedAt: now,
      });
    }
  }

  // ── 2. Update SOP ────────────────────────────────────────────────────

  if (sopAlignment && sopAlignment.alignmentScore < 0.6) {
    recommendations.push({
      id: nextId(),
      type: 'update_sop',
      title: 'Update SOP to match actual execution',
      description: `The current SOP aligns with only ${Math.round(sopAlignment.alignmentScore * 100)}% of recorded runs. ${sopAlignment.undocumentedSteps.length} step type(s) are observed in practice but missing from documentation. ${sopAlignment.unusedDocumentedSteps.length} documented step(s) are rarely performed.`,
      impact: sopAlignment.alignmentScore < 0.4 ? 'high' : 'medium',
      confidence: 'high',
      effort: 'low',
      estimatedTimeSavingsMs: null,
      estimatedImprovementPct: null,
      evidence: `SOP alignment: ${Math.round(sopAlignment.alignmentScore * 100)}%. Structural similarity: ${Math.round(sopAlignment.structuralSimilarity * 100)}%. ${sopAlignment.alignedRunCount} of ${sopAlignment.totalRunCount} runs align with SOP.`,
      dataPoints: sopAlignment.totalRunCount,
      processName,
      affectedSteps: [],
      evidenceRunIds: [],
      computedAt: now,
    });
  }

  // ── 3. Automate steps ────────────────────────────────────────────────

  const automationROIs = computeAutomationROI(timestudy, runs.length);
  for (const roi of automationROIs.slice(0, 3)) { // Top 3
    if (roi.suitabilityScore >= 50 && roi.perRunSavingsMs >= 2000) { // At least 2s savings
      recommendations.push({
        id: nextId(),
        type: 'automate_step',
        title: `Automate step ${roi.stepPosition} (${roi.stepCategory})`,
        description: `Step ${roi.stepPosition} (${roi.stepCategory}) takes ~${formatMs(roi.avgDurationMs)} per run and is suitable for automation. Automating across ${roi.runCount} runs would save ~${formatMs(roi.totalSavingsMs)} total.`,
        impact: roi.perRunSavingsMs >= 10000 ? 'high' : roi.perRunSavingsMs >= 5000 ? 'medium' : 'low',
        confidence: roi.runCount >= 10 ? 'high' : roi.runCount >= 5 ? 'medium' : 'low',
        effort: roi.stepCategory === 'data_entry' ? 'low' : 'medium',
        estimatedTimeSavingsMs: roi.perRunSavingsMs,
        estimatedImprovementPct: metrics.meanDurationMs
          ? Math.round((roi.perRunSavingsMs / metrics.meanDurationMs) * 100)
          : null,
        evidence: roi.rationale,
        dataPoints: roi.runCount,
        processName,
        affectedSteps: [roi.stepPosition],
        evidenceRunIds: metrics.evidenceRunIds,
        computedAt: now,
      });
    }
  }

  // ── 4. Reduce rework ─────────────────────────────────────────────────

  if (metrics.errorStepFrequency > 0.3) {
    const errorStepPct = Math.round(metrics.errorStepFrequency * 100);
    recommendations.push({
      id: nextId(),
      type: 'reduce_rework',
      title: 'Reduce validation rework',
      description: `${errorStepPct}% of steps involve error handling, indicating frequent rework or validation failures. Consider adding pre-validation checks or improving data quality at entry points.`,
      impact: errorStepPct >= 20 ? 'high' : 'medium',
      confidence: runs.length >= 5 ? 'high' : 'medium',
      effort: 'medium',
      estimatedTimeSavingsMs: null,
      estimatedImprovementPct: null,
      evidence: `Error step frequency: ${errorStepPct}% across ${runs.length} runs.`,
      dataPoints: runs.length,
      processName,
      affectedSteps: [],
      evidenceRunIds: metrics.evidenceRunIds,
      computedAt: now,
    });
  }

  // ── 5. Address bottlenecks ───────────────────────────────────────────

  for (const bn of bottlenecks.bottlenecks.slice(0, 2)) {
    if (bn.isHighDuration) {
      recommendations.push({
        id: nextId(),
        type: 'simplify_handoffs',
        title: `Address bottleneck at step ${bn.position}`,
        description: `Step ${bn.position} (${bn.category}) takes ${bn.durationRatio.toFixed(1)}x longer than average. It consumes a disproportionate share of total process time.`,
        impact: bn.durationRatio >= 3 ? 'high' : 'medium',
        confidence: bn.runCount >= 5 ? 'high' : 'medium',
        effort: 'medium',
        estimatedTimeSavingsMs: bn.meanDurationMs * 0.3, // Assume 30% reduction achievable
        estimatedImprovementPct: Math.round((bn.meanDurationMs * 0.3 / (metrics.meanDurationMs ?? 1)) * 100),
        evidence: `Step ${bn.position} avg duration: ${formatMs(bn.meanDurationMs)} (${bn.durationRatio.toFixed(1)}x overall average). Based on ${bn.runCount} observations.`,
        dataPoints: bn.runCount,
        processName,
        affectedSteps: [bn.position],
        evidenceRunIds: bn.evidenceRunIds,
        computedAt: now,
      });
    }
  }

  // Sort by impact (high first), then confidence
  const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => (impactOrder[a.impact] ?? 2) - (impactOrder[b.impact] ?? 2));

  return recommendations;
}

// ─── Automation ROI ─────────────────────────────────────────────────────────

export function computeAutomationROI(
  timestudy: TimestudyResult,
  runCount: number,
): AutomationROI[] {
  const results: AutomationROI[] = [];

  for (const step of timestudy.stepPositionTimestudies) {
    if (step.meanDurationMs == null || step.meanDurationMs < 1000) continue;

    const isFullyAutomatable = AUTOMATABLE_CATEGORIES.has(step.category);
    const isPartiallyAutomatable = PARTIALLY_AUTOMATABLE.has(step.category);

    if (!isFullyAutomatable && !isPartiallyAutomatable) continue;

    const suitability = isFullyAutomatable ? 85 : 50;
    const automationFactor = isFullyAutomatable ? 0.9 : 0.5; // 90% or 50% of duration saved
    const perRunSavings = Math.round(step.meanDurationMs * automationFactor);
    const totalSavings = perRunSavings * runCount;

    const rationale = isFullyAutomatable
      ? `Step ${step.position} (${step.category}) is a strong automation candidate: repetitive ${step.category.replace(/_/g, ' ')} averaging ${formatMs(step.meanDurationMs)} per run. Estimated 90% time reduction with automation.`
      : `Step ${step.position} (${step.category}) could be partially automated: ${step.category.replace(/_/g, ' ')} averaging ${formatMs(step.meanDurationMs)}. Estimated 50% time reduction with AI assistance.`;

    results.push({
      stepPosition: step.position,
      stepCategory: step.category,
      avgDurationMs: step.meanDurationMs,
      runCount: step.runCount,
      totalSavingsMs: totalSavings,
      perRunSavingsMs: perRunSavings,
      suitabilityScore: suitability,
      rationale,
    });
  }

  // Sort by total savings (highest first)
  results.sort((a, b) => b.totalSavingsMs - a.totalSavingsMs);
  return results;
}

// ─── What-If Simulator ──────────────────────────────────────────────────────

export function simulateWhatIf(
  timestudy: TimestudyResult,
  metrics: ProcessMetrics,
  removedStepPositions: number[],
  automatedStepPositions: number[],
): WhatIfScenario {
  const currentDuration = metrics.meanDurationMs ?? 0;
  const currentStepCount = metrics.meanStepCount ?? timestudy.stepPositionTimestudies.length;
  const assumptions: string[] = [];

  let durationReduction = 0;
  let stepsRemoved = 0;

  // Removed steps: subtract their full duration
  for (const pos of removedStepPositions) {
    const step = timestudy.stepPositionTimestudies.find(s => s.position === pos);
    if (step?.meanDurationMs) {
      durationReduction += step.meanDurationMs;
      stepsRemoved++;
      assumptions.push(`Removing step ${pos} eliminates ~${formatMs(step.meanDurationMs)}`);
    }
  }

  // Automated steps: subtract 90% of their duration for fully automatable, 50% for partial
  for (const pos of automatedStepPositions) {
    const step = timestudy.stepPositionTimestudies.find(s => s.position === pos);
    if (step?.meanDurationMs) {
      const isFullyAutomatable = AUTOMATABLE_CATEGORIES.has(step.category);
      const factor = isFullyAutomatable ? 0.9 : 0.5;
      durationReduction += step.meanDurationMs * factor;
      assumptions.push(`Automating step ${pos} reduces ~${Math.round(factor * 100)}% of ${formatMs(step.meanDurationMs)}`);
    }
  }

  const estimatedDuration = Math.max(0, currentDuration - durationReduction);
  const changePct = currentDuration > 0
    ? Math.round(((estimatedDuration - currentDuration) / currentDuration) * 100)
    : 0;

  assumptions.push(`Based on ${metrics.runCount} historical runs`);
  if (removedStepPositions.length > 0) assumptions.push('Assumes removed steps have no downstream dependencies');
  if (automatedStepPositions.length > 0) assumptions.push('Assumes automation achieves expected time reduction');

  const totalChanges = removedStepPositions.length + automatedStepPositions.length;
  const confidence: RecommendationConfidence =
    metrics.runCount >= 20 && totalChanges <= 2 ? 'high' :
    metrics.runCount >= 5 ? 'medium' : 'low';

  return {
    change: [
      ...removedStepPositions.map(p => `Remove step ${p}`),
      ...automatedStepPositions.map(p => `Automate step ${p}`),
    ].join(', '),
    currentDurationMs: currentDuration,
    estimatedDurationMs: Math.round(estimatedDuration),
    changePct,
    currentStepCount: Math.round(currentStepCount),
    estimatedStepCount: Math.round(currentStepCount) - stepsRemoved,
    confidence,
    assumptions,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function avgDuration(runs: ProcessRunBundle[]): number | null {
  const durations = runs.map(r => r.processRun.durationMs).filter((d): d is number => d != null);
  if (durations.length === 0) return null;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${Math.round(sec)}s`;
  const min = sec / 60;
  return `${min.toFixed(1)}min`;
}
