/**
 * SOP Alignment Engine — Detects drift between documented SOPs and actual
 * workflow execution patterns.
 *
 * Compares SOP step sequences against the dominant variant and all observed
 * runs to compute:
 * - Alignment score (0-1): how well the SOP matches real execution
 * - Undocumented steps: steps in real workflows not in the SOP
 * - Unused documented steps: SOP steps not seen in real execution
 * - Drift indicators: where the SOP diverges from reality
 *
 * All comparisons are deterministic and evidence-linked.
 */

import type { ProcessRunBundle, ProcessVariant, PathSignature } from './types.js';
import { computePathSignature, bigramJaccardSimilarity } from './pathSignature.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SOPStep {
  ordinal: number;
  title: string;
  category: string;
  system?: string;
}

export interface SOPAlignmentResult {
  /** 0-1 score: how well the SOP matches actual execution. 1.0 = perfect match. */
  alignmentScore: number;
  /** Human-readable alignment level. */
  alignmentLevel: 'high' | 'moderate' | 'low' | 'critical';
  /** Steps present in real workflows but absent from the SOP. */
  undocumentedSteps: UndocumentedStep[];
  /** SOP steps not observed in any real execution. */
  unusedDocumentedSteps: UnusedStep[];
  /** Structural similarity between SOP and dominant variant path signature. */
  structuralSimilarity: number;
  /** How many runs the SOP aligns with (out of total). */
  alignedRunCount: number;
  totalRunCount: number;
  /** Specific drift indicators. */
  driftIndicators: SOPDriftIndicator[];
  /** Evidence for traceability. */
  evidenceRunIds: string[];
  computedAt: string;
}

export interface UndocumentedStep {
  /** Category of the undocumented step. */
  category: string;
  /** How often this step appears across runs (0-1 frequency). */
  frequency: number;
  /** Number of runs containing this step. */
  runCount: number;
  /** Most common position (ordinal) where it appears. */
  typicalPosition: number;
}

export interface UnusedStep {
  /** SOP step ordinal. */
  sopOrdinal: number;
  /** SOP step title. */
  sopTitle: string;
  /** SOP step category. */
  sopCategory: string;
}

export interface SOPDriftIndicator {
  type: 'missing_step' | 'extra_step' | 'reordered' | 'frequency_mismatch';
  severity: 'low' | 'medium' | 'high';
  description: string;
  /** Affected SOP step ordinal (if applicable). */
  sopStepOrdinal?: number;
  /** Frequency of the divergence across runs (0-1). */
  frequency?: number;
}

// ─── Main analysis function ─────────────────────────────────────────────────

/**
 * Compare an SOP against actual workflow executions to detect alignment and drift.
 */
export function analyzeSopAlignment(
  sopSteps: SOPStep[],
  runs: ProcessRunBundle[],
  dominantVariant: ProcessVariant | null,
): SOPAlignmentResult {
  const now = new Date().toISOString();
  const evidenceRunIds = runs.map(r => r.processRun.runId);

  if (sopSteps.length === 0 || runs.length === 0) {
    return {
      alignmentScore: 0,
      alignmentLevel: 'critical',
      undocumentedSteps: [],
      unusedDocumentedSteps: [],
      structuralSimilarity: 0,
      alignedRunCount: 0,
      totalRunCount: runs.length,
      driftIndicators: [],
      evidenceRunIds,
      computedAt: now,
    };
  }

  // Build SOP path signature from categories
  const sopCategories = sopSteps.map(s => s.category);
  const sopSignature: PathSignature = {
    signature: sopCategories.join(':'),
    stepCategories: sopCategories,
    stepCount: sopCategories.length,
  };

  // Compare SOP to each run's path signature
  const runSignatures = runs.map(r => computePathSignature(r));
  const runSimilarities = runSignatures.map(rs =>
    bigramJaccardSimilarity(sopSignature.stepCategories, rs.stepCategories),
  );

  // How many runs does the SOP align with (similarity >= 0.6)?
  const alignmentThreshold = 0.6;
  const alignedRunCount = runSimilarities.filter(s => s >= alignmentThreshold).length;

  // Structural similarity to dominant variant
  const structuralSimilarity = dominantVariant
    ? bigramJaccardSimilarity(sopSignature.stepCategories, dominantVariant.pathSignature.stepCategories)
    : (runSimilarities.length > 0 ? runSimilarities.reduce((a, b) => a + b, 0) / runSimilarities.length : 0);

  // Find undocumented steps (in runs but not in SOP)
  const sopCategorySet = new Set(sopCategories);
  const categoryFrequency = new Map<string, { count: number; positions: number[] }>();

  for (const run of runs) {
    const steps = run.processDefinition.stepDefinitions;
    for (const step of steps) {
      if (!sopCategorySet.has(step.category)) {
        const entry = categoryFrequency.get(step.category) ?? { count: 0, positions: [] };
        entry.count++;
        entry.positions.push(step.ordinal);
        categoryFrequency.set(step.category, entry);
      }
    }
  }

  const undocumentedSteps: UndocumentedStep[] = [];
  for (const [category, data] of categoryFrequency) {
    const frequency = data.count / runs.length;
    if (frequency >= 0.2) { // At least 20% of runs
      const typicalPosition = Math.round(
        data.positions.reduce((a, b) => a + b, 0) / data.positions.length,
      );
      undocumentedSteps.push({
        category,
        frequency: Math.round(frequency * 100) / 100,
        runCount: data.count,
        typicalPosition,
      });
    }
  }
  undocumentedSteps.sort((a, b) => b.frequency - a.frequency);

  // Find unused documented steps (in SOP but rarely in runs)
  const runCategorySets = runs.map(r =>
    new Set(r.processDefinition.stepDefinitions.map(s => s.category)),
  );
  const unusedDocumentedSteps: UnusedStep[] = [];
  for (const sopStep of sopSteps) {
    const runsWithCategory = runCategorySets.filter(s => s.has(sopStep.category)).length;
    if (runsWithCategory < runs.length * 0.2) { // Less than 20% of runs have it
      unusedDocumentedSteps.push({
        sopOrdinal: sopStep.ordinal,
        sopTitle: sopStep.title,
        sopCategory: sopStep.category,
      });
    }
  }

  // Build drift indicators
  const driftIndicators: SOPDriftIndicator[] = [];

  for (const undoc of undocumentedSteps) {
    if (undoc.frequency >= 0.5) {
      driftIndicators.push({
        type: 'extra_step',
        severity: undoc.frequency >= 0.8 ? 'high' : 'medium',
        description: `Step type "${undoc.category}" appears in ${Math.round(undoc.frequency * 100)}% of runs but is not documented in the SOP.`,
        frequency: undoc.frequency,
      });
    }
  }

  for (const unused of unusedDocumentedSteps) {
    driftIndicators.push({
      type: 'missing_step',
      severity: 'medium',
      description: `SOP step ${unused.sopOrdinal} ("${unused.sopTitle}") is rarely observed in actual executions.`,
      sopStepOrdinal: unused.sopOrdinal,
    });
  }

  // Compute alignment score (weighted blend)
  const avgSimilarity = runSimilarities.length > 0
    ? runSimilarities.reduce((a, b) => a + b, 0) / runSimilarities.length
    : 0;

  const undocPenalty = Math.min(undocumentedSteps.length * 0.05, 0.3);
  const unusedPenalty = Math.min(unusedDocumentedSteps.length * 0.05, 0.2);
  const driftPenalty = Math.min(driftIndicators.filter(d => d.severity === 'high').length * 0.1, 0.2);

  const alignmentScore = Math.max(0, Math.min(1,
    Math.round((avgSimilarity * 0.6 + structuralSimilarity * 0.4 - undocPenalty - unusedPenalty - driftPenalty) * 100) / 100,
  ));

  const alignmentLevel: SOPAlignmentResult['alignmentLevel'] =
    alignmentScore >= 0.8 ? 'high' :
    alignmentScore >= 0.6 ? 'moderate' :
    alignmentScore >= 0.4 ? 'low' : 'critical';

  return {
    alignmentScore,
    alignmentLevel,
    undocumentedSteps,
    unusedDocumentedSteps,
    structuralSimilarity: Math.round(structuralSimilarity * 100) / 100,
    alignedRunCount,
    totalRunCount: runs.length,
    driftIndicators,
    evidenceRunIds,
    computedAt: now,
  };
}
