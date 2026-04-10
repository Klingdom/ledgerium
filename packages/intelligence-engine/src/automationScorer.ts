/**
 * Automation Opportunity Scorer
 *
 * Ranks process groups and canonical components by their suitability for
 * automation. Uses multiple factors including repeat frequency, manual
 * click density, determinism, reuse breadth, time cost, and path stability.
 *
 * Deliberately penalizes unstable or exception-heavy processes — automation
 * on chaos creates worse chaos.
 *
 * Design:
 * - All weights configurable via ScoringConfig.automationWeights
 * - Produces a 0-100 score (not 0-1) for direct display
 * - Evidence-linked: every score includes factor breakdown
 */

import type { ExplanationEntry } from './groupingTypes.js';
import type { ScoringConfig } from './scoringConfig.js';
import { DEFAULT_SCORING_CONFIG, buildExplanation } from './scoringConfig.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AutomationFactors {
  /** How often this process/component is executed (runs per period, normalized 0-1). */
  repeatFrequency: number;
  /** Fraction of steps that are manual clicks vs automated/system events (0-1). */
  manualClickDensity: number;
  /** How deterministic the process is (high = same path every time, 0-1). */
  determinism: number;
  /** How broadly this pattern is reused (0-1, scaled by family count). */
  reuseAcrossFamilies: number;
  /** Total human time cost (normalized 0-1 from duration). */
  timeCost: number;
  /** Fraction of duration concentrated in wait/delay steps (0-1). */
  delayConcentration: number;
  /** Path stability score (0-1, from standardization scorer). */
  pathStability: number;
  /** Fraction of runs containing exception/error steps (0-1). */
  exceptionRate: number;
  /** How ambiguous the step labels / actions are (0-1, from fingerprint confidence). */
  ambiguityLevel: number;
}

export interface AutomationScoreResult {
  /** 0-100 automation opportunity score. Higher = better automation candidate. */
  score: number;
  /** Rank label for UI display. */
  rank: 'high' | 'medium' | 'low' | 'not_recommended';
  /** Per-factor contributions (0-100 scale). */
  factorBreakdown: Record<keyof AutomationFactors, number>;
  /** Explanation of the scoring. */
  explanation: string;
  /** Structured explanation entries. */
  supportingEntries: ExplanationEntry[];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Score a process group or component for automation opportunity.
 */
export function scoreAutomationOpportunity(
  factors: AutomationFactors,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): AutomationScoreResult {
  const w = config.automationWeights;
  const entries: ExplanationEntry[] = [];

  // ── Positive factors (contribute to score) ───────────────────────────────

  const repeatContrib = factors.repeatFrequency * w.repeatFrequency;
  const clickContrib = factors.manualClickDensity * w.manualClickDensity;
  const determinismContrib = factors.determinism * w.determinism;
  const reuseContrib = factors.reuseAcrossFamilies * w.reuseAcrossFamilies;
  const timeContrib = factors.timeCost * w.timeCost;
  const delayContrib = factors.delayConcentration * w.delayConcentration;
  const stabilityContrib = factors.pathStability * w.pathStability;

  // ── Penalty factors (subtract from score) ────────────────────────────────

  const exceptionPenalty = factors.exceptionRate * w.exceptionRatePenalty;
  const ambiguityPenalty = factors.ambiguityLevel * w.ambiguityPenalty;

  // ── Composite ────────────────────────────────────────────────────────────

  const rawScore = (
    repeatContrib + clickContrib + determinismContrib +
    reuseContrib + timeContrib + delayContrib + stabilityContrib
  ) - exceptionPenalty - ambiguityPenalty;

  // Scale to 0-100
  const score = Math.round(Math.max(0, Math.min(100, rawScore * 100)));

  // ── Factor breakdown (for transparency) ──────────────────────────────────

  const factorBreakdown: Record<keyof AutomationFactors, number> = {
    repeatFrequency: Math.round(repeatContrib * 100),
    manualClickDensity: Math.round(clickContrib * 100),
    determinism: Math.round(determinismContrib * 100),
    reuseAcrossFamilies: Math.round(reuseContrib * 100),
    timeCost: Math.round(timeContrib * 100),
    delayConcentration: Math.round(delayContrib * 100),
    pathStability: Math.round(stabilityContrib * 100),
    exceptionRate: -Math.round(exceptionPenalty * 100),
    ambiguityLevel: -Math.round(ambiguityPenalty * 100),
  };

  // ── Rank ─────────────────────────────────────────────────────────────────

  let rank: AutomationScoreResult['rank'];
  if (score >= 70) rank = 'high';
  else if (score >= 45) rank = 'medium';
  else if (score >= 20) rank = 'low';
  else rank = 'not_recommended';

  // ── Build explanation entries ─────────────────────────────────────────────

  if (factors.repeatFrequency >= 0.6) {
    entries.push({
      code: 'COMMON_STEP_PATTERN',
      weight: repeatContrib,
      detail: 'High repeat frequency makes automation cost-effective',
    });
  }

  if (factors.manualClickDensity >= 0.7) {
    entries.push({
      code: 'COMMON_STEP_PATTERN',
      weight: clickContrib,
      detail: 'High manual click density — strong automation target',
    });
  }

  if (factors.determinism >= 0.8) {
    entries.push({
      code: 'STEP_SIGNATURE_MATCH',
      weight: determinismContrib,
      detail: 'Highly deterministic — consistent execution path',
    });
  }

  if (factors.pathStability >= 0.7) {
    entries.push({
      code: 'HIGH_STEP_OVERLAP',
      weight: stabilityContrib,
      detail: 'Stable path — automation will be reliable',
    });
  }

  if (factors.exceptionRate >= 0.3) {
    entries.push({
      code: 'PATH_DIVERGENCE',
      weight: exceptionPenalty,
      detail: 'High exception rate — automation may be fragile',
    });
  }

  // ── Summary text ─────────────────────────────────────────────────────────

  const explanationParts: string[] = [];
  if (rank === 'high') {
    explanationParts.push('Strong automation candidate');
  } else if (rank === 'medium') {
    explanationParts.push('Moderate automation potential');
  } else if (rank === 'low') {
    explanationParts.push('Low automation potential');
  } else {
    explanationParts.push('Not recommended for automation');
  }

  if (factors.exceptionRate >= 0.3) {
    explanationParts.push('high exception rate increases risk');
  }
  if (factors.pathStability < 0.5) {
    explanationParts.push('unstable execution path');
  }
  if (factors.repeatFrequency >= 0.6) {
    explanationParts.push('frequently repeated');
  }

  return {
    score,
    rank,
    factorBreakdown,
    explanation: explanationParts.join('; ') + '.',
    supportingEntries: entries,
  };
}

// ─── Convenience: derive factors from existing data ──────────────────────────

/**
 * Helper to derive AutomationFactors from commonly available process metrics.
 * Normalizes raw values into 0-1 ranges.
 */
export function deriveAutomationFactors(params: {
  runCount: number;
  maxExpectedRuns?: number;
  humanEventCount: number;
  totalEventCount: number;
  stepConsistencyScore: number;
  familyCount: number;
  avgDurationMs: number | null;
  maxExpectedDurationMs?: number;
  delayStepDurationMs: number;
  totalDurationMs: number;
  pathStabilityScore: number | null;
  errorStepCount: number;
  totalStepCount: number;
  avgFingerprintConfidence: number;
}): AutomationFactors {
  const maxRuns = params.maxExpectedRuns ?? 50;
  const maxDuration = params.maxExpectedDurationMs ?? 600_000; // 10 min

  return {
    repeatFrequency: Math.min(1, params.runCount / maxRuns),
    manualClickDensity: params.totalEventCount > 0
      ? params.humanEventCount / params.totalEventCount
      : 0,
    determinism: params.stepConsistencyScore,
    reuseAcrossFamilies: Math.min(1, params.familyCount / 5),
    timeCost: params.avgDurationMs != null
      ? Math.min(1, params.avgDurationMs / maxDuration)
      : 0,
    delayConcentration: params.totalDurationMs > 0
      ? params.delayStepDurationMs / params.totalDurationMs
      : 0,
    pathStability: params.pathStabilityScore ?? 0.5,
    exceptionRate: params.totalStepCount > 0
      ? params.errorStepCount / params.totalStepCount
      : 0,
    ambiguityLevel: 1 - params.avgFingerprintConfidence,
  };
}
