/**
 * Standardization Scorer — Computes process maturity metrics for a process group.
 *
 * Metrics:
 * - Standardization score (0-100): how consistently the process is executed
 * - Documentation drift score (0-100): how much the SOP diverges from reality
 * - Outlier runs: recordings that don't match any detected variant
 * - Recommended canonical path: the suggested SOP based on dominant execution
 *
 * All scores are deterministic and evidence-linked.
 */

import type {
  ProcessRunBundle,
  VariantSet,
  VarianceReport,
  ProcessMetrics,
} from './types.js';
import type { SOPAlignmentResult } from './sopAlignmentEngine.js';
import { computePathSignature, computeSignatureSimilarity } from './pathSignature.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StandardizationScore {
  /** 0-100 overall standardization score. Higher = more consistent execution. */
  score: number;
  level: 'excellent' | 'good' | 'moderate' | 'poor';
  /** Breakdown of contributing factors. */
  factors: {
    /** How much of execution follows the dominant path (0-1). */
    dominantPathAdherence: number;
    /** Sequence stability across runs (0-1). */
    sequenceStability: number;
    /** Inverse of variant fragmentation (0-1). */
    variantConsolidation: number;
    /** Duration consistency (0-1, inverse of CV). */
    timingConsistency: number;
  };
  evidenceRunIds: string[];
  computedAt: string;
}

export interface DocumentationDriftScore {
  /** 0-100 drift score. Higher = more drift (worse). */
  score: number;
  level: 'aligned' | 'minor_drift' | 'significant_drift' | 'outdated';
  /** SOP alignment result this score is derived from. */
  sopAlignment: SOPAlignmentResult | null;
  /** Summary of key drift findings. */
  findings: string[];
  computedAt: string;
}

export interface OutlierRun {
  runId: string;
  /** Similarity to the closest variant (0-1). */
  bestVariantSimilarity: number;
  /** Why it's an outlier. */
  reason: string;
  /** Step count of this run vs median. */
  stepCount: number;
  medianStepCount: number;
}

export interface RecommendedCanonicalPath {
  /** Step categories of the recommended SOP path. */
  stepCategories: string[];
  /** Which variant this is derived from. */
  sourceVariantId: string;
  /** How many runs follow this exact path. */
  supportingRunCount: number;
  /** Fraction of all runs this represents. */
  frequency: number;
  /** Average duration of runs following this path. */
  avgDurationMs: number | null;
  /** Rationale for recommendation. */
  rationale: string;
}

// ─── Standardization Score ──────────────────────────────────────────────────

export function computeStandardizationScore(
  variants: VariantSet,
  variance: VarianceReport,
  metrics: ProcessMetrics,
): StandardizationScore {
  const now = new Date().toISOString();

  // Factor 1: Dominant path adherence (what % of runs follow the standard path)
  const dominantPathAdherence = variants.standardPath?.frequency ?? 0;

  // Factor 2: Sequence stability (from variance report)
  const sequenceStability = variance.sequenceStability;

  // Factor 3: Variant consolidation (fewer variants = more standardized)
  // 1 variant = 1.0, 2 variants = 0.8, 5+ variants = 0.2
  const variantConsolidation = variants.variantCount <= 1
    ? 1.0
    : Math.max(0.1, 1.0 - (variants.variantCount - 1) * 0.2);

  // Factor 4: Timing consistency (inverse of duration CV)
  const durationCV = variance.durationVariance.coefficientOfVariation ?? 0;
  const timingConsistency = Math.max(0, 1.0 - Math.min(durationCV, 1.0));

  // Weighted score (0-100)
  const rawScore =
    dominantPathAdherence * 0.35 +
    sequenceStability * 0.30 +
    variantConsolidation * 0.20 +
    timingConsistency * 0.15;

  const score = Math.round(rawScore * 100);

  const level: StandardizationScore['level'] =
    score >= 80 ? 'excellent' :
    score >= 60 ? 'good' :
    score >= 40 ? 'moderate' : 'poor';

  return {
    score,
    level,
    factors: {
      dominantPathAdherence: Math.round(dominantPathAdherence * 100) / 100,
      sequenceStability: Math.round(sequenceStability * 100) / 100,
      variantConsolidation: Math.round(variantConsolidation * 100) / 100,
      timingConsistency: Math.round(timingConsistency * 100) / 100,
    },
    evidenceRunIds: metrics.evidenceRunIds,
    computedAt: now,
  };
}

// ─── Documentation Drift Score ──────────────────────────────────────────────

export function computeDocumentationDriftScore(
  sopAlignment: SOPAlignmentResult | null,
): DocumentationDriftScore {
  const now = new Date().toISOString();

  if (!sopAlignment) {
    return {
      score: 0,
      level: 'aligned',
      sopAlignment: null,
      findings: ['No SOP available for comparison.'],
      computedAt: now,
    };
  }

  // Invert alignment score to get drift (high alignment = low drift)
  const driftScore = Math.round((1 - sopAlignment.alignmentScore) * 100);

  const findings: string[] = [];

  if (sopAlignment.undocumentedSteps.length > 0) {
    const topUndoc = sopAlignment.undocumentedSteps[0]!;
    findings.push(
      `${sopAlignment.undocumentedSteps.length} step type(s) observed in real execution but not documented in the SOP. ` +
      `Most common: "${topUndoc.category}" (appears in ${Math.round(topUndoc.frequency * 100)}% of runs).`,
    );
  }

  if (sopAlignment.unusedDocumentedSteps.length > 0) {
    findings.push(
      `${sopAlignment.unusedDocumentedSteps.length} SOP step(s) are rarely observed in actual executions.`,
    );
  }

  if (sopAlignment.driftIndicators.filter(d => d.severity === 'high').length > 0) {
    findings.push(
      `${sopAlignment.driftIndicators.filter(d => d.severity === 'high').length} high-severity drift indicator(s) detected.`,
    );
  }

  if (sopAlignment.alignedRunCount < sopAlignment.totalRunCount * 0.5) {
    findings.push(
      `Only ${sopAlignment.alignedRunCount} of ${sopAlignment.totalRunCount} runs align with the SOP (less than 50%).`,
    );
  }

  if (findings.length === 0) {
    findings.push('SOP appears well-aligned with actual execution patterns.');
  }

  const level: DocumentationDriftScore['level'] =
    driftScore <= 20 ? 'aligned' :
    driftScore <= 40 ? 'minor_drift' :
    driftScore <= 60 ? 'significant_drift' : 'outdated';

  return {
    score: driftScore,
    level,
    sopAlignment,
    findings,
    computedAt: now,
  };
}

// ─── Outlier Detection ──────────────────────────────────────────────────────

export function detectOutlierRuns(
  runs: ProcessRunBundle[],
  variants: VariantSet,
): OutlierRun[] {
  if (variants.variants.length === 0 || runs.length < 3) return [];

  const outliers: OutlierRun[] = [];
  const variantSignatures = variants.variants.map(v => v.pathSignature.stepCategories);

  // Compute median step count
  const stepCounts = runs.map(r => r.processDefinition.stepDefinitions.length).sort((a, b) => a - b);
  const medianStepCount = stepCounts[Math.floor(stepCounts.length / 2)] ?? 0;

  for (const run of runs) {
    const runSig = computePathSignature(run);
    const similarities = variantSignatures.map(vs =>
      computeSignatureSimilarity(runSig, { signature: vs.join(':'), stepCategories: vs, stepCount: vs.length }),
    );
    const bestSimilarity = Math.max(...similarities);

    // Outlier if similarity to ALL variants is below threshold
    if (bestSimilarity < 0.5) {
      const stepCount = run.processDefinition.stepDefinitions.length;
      const reasons: string[] = [];

      if (bestSimilarity < 0.3) {
        reasons.push('Execution pattern significantly different from all detected variants');
      } else {
        reasons.push('Execution pattern does not closely match any detected variant');
      }

      if (Math.abs(stepCount - medianStepCount) > medianStepCount * 0.5) {
        reasons.push(`Step count (${stepCount}) deviates significantly from median (${medianStepCount})`);
      }

      outliers.push({
        runId: run.processRun.runId,
        bestVariantSimilarity: Math.round(bestSimilarity * 100) / 100,
        reason: reasons.join('. '),
        stepCount,
        medianStepCount,
      });
    }
  }

  return outliers.sort((a, b) => a.bestVariantSimilarity - b.bestVariantSimilarity);
}

// ─── Recommended Canonical Path ─────────────────────────────────────────────

export function deriveRecommendedCanonicalPath(
  runs: ProcessRunBundle[],
  variants: VariantSet,
): RecommendedCanonicalPath | null {
  if (!variants.standardPath) return null;

  const standard = variants.standardPath;
  const supportingRuns = runs.filter(r =>
    standard.evidenceRunIds.includes(r.processRun.runId),
  );

  const durations = supportingRuns
    .map(r => r.processRun.durationMs)
    .filter((d): d is number => d != null);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  const rationale = standard.frequency >= 0.8
    ? `This path is followed by ${Math.round(standard.frequency * 100)}% of all runs, making it the clear standard execution pattern.`
    : standard.frequency >= 0.5
      ? `This is the most common execution path (${Math.round(standard.frequency * 100)}% of runs), though significant variation exists.`
      : `This is the most frequent path but covers only ${Math.round(standard.frequency * 100)}% of runs. Consider reviewing variant-specific SOPs.`;

  return {
    stepCategories: standard.pathSignature.stepCategories,
    sourceVariantId: standard.variantId,
    supportingRunCount: standard.runCount,
    frequency: standard.frequency,
    avgDurationMs: avgDuration,
    rationale,
  };
}
