/**
 * Variant Distance Analyzer
 *
 * Measures how much a run deviates from the canonical path of its exact
 * process group. Uses edit-distance-style analysis on step fingerprint
 * sequences to detect insertions, deletions, reorderings, and substitutions.
 *
 * Classification:
 *   - standard: follows canonical path exactly or nearly exactly (< 0.15 deviation)
 *   - minor: small deviations like 1-2 inserted/removed steps (0.15-0.50)
 *   - major: significant structural deviation (> 0.50)
 *   - outlier: extreme deviation or completely different structure
 */

import type {
  StepFingerprint,
  DeviationPoint,
  ProcessVariantRecord,
  ExplanationEntry,
} from './groupingTypes.js';
import type { ScoringConfig } from './scoringConfig.js';
import { DEFAULT_SCORING_CONFIG, buildExplanation } from './scoringConfig.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type VariantClassification = 'standard' | 'minor' | 'major' | 'outlier';

export interface VariantDistanceResult {
  /** 0 = identical to canonical, 1 = completely different. */
  deviationScore: number;
  classification: VariantClassification;
  deviationPoints: DeviationPoint[];
  addedSteps: string[];
  removedSteps: string[];
  reorderedSteps: string[];
  /** Count of total differences (insertions + deletions + substitutions). */
  editCount: number;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute the distance between a run's step sequence and the canonical path.
 *
 * @param runSteps - The run's step fingerprints (ordered)
 * @param canonicalSteps - The canonical path's step fingerprints (ordered)
 * @param config - Scoring config for variant thresholds
 */
export function computeVariantDistance(
  runSteps: StepFingerprint[],
  canonicalSteps: StepFingerprint[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): VariantDistanceResult {
  // Use semantic signatures for comparison
  const runSigs = runSteps.map(fp => fp.semanticSignature);
  const canonSigs = canonicalSteps.map(fp => fp.semanticSignature);

  // Compute LCS-based alignment
  const alignment = computeAlignment(runSigs, canonSigs);

  // Derive deviation points, added/removed/reordered steps
  const deviationPoints: DeviationPoint[] = [];
  const addedSteps: string[] = [];
  const removedSteps: string[] = [];
  const reorderedSteps: string[] = [];

  for (const op of alignment.operations) {
    if (op.type === 'insertion') {
      addedSteps.push(runSigs[op.runIndex!]!);
      deviationPoints.push({
        stepIndex: op.runIndex!,
        canonicalStep: '',
        variantStep: runSigs[op.runIndex!]!,
        deviationType: 'insertion',
      });
    } else if (op.type === 'deletion') {
      removedSteps.push(canonSigs[op.canonIndex!]!);
      deviationPoints.push({
        stepIndex: op.canonIndex!,
        canonicalStep: canonSigs[op.canonIndex!]!,
        variantStep: '',
        deviationType: 'deletion',
      });
    } else if (op.type === 'substitution') {
      deviationPoints.push({
        stepIndex: op.runIndex!,
        canonicalStep: canonSigs[op.canonIndex!]!,
        variantStep: runSigs[op.runIndex!]!,
        deviationType: 'substitution',
      });
    }
  }

  // Detect reordered steps: steps present in both but at different positions
  const canonPositions = new Map<string, number>();
  canonSigs.forEach((sig, i) => canonPositions.set(sig, i));
  for (let i = 0; i < runSigs.length; i++) {
    const sig = runSigs[i]!;
    if (canonPositions.has(sig)) {
      const canonPos = canonPositions.get(sig)!;
      if (Math.abs(i - canonPos) > 1) {
        reorderedSteps.push(sig);
      }
    }
  }

  // Deviation score: normalized edit distance
  const maxLen = Math.max(runSigs.length, canonSigs.length);
  const deviationScore = maxLen === 0 ? 0 : alignment.editCount / maxLen;
  const clamped = Math.min(1, deviationScore);

  // Classification
  const t = config.variantThresholds;
  let classification: VariantClassification;
  if (clamped <= t.minorVariant) {
    classification = 'standard';
  } else if (clamped <= t.outlier) {
    classification = clamped <= (t.minorVariant + t.outlier) / 2 ? 'minor' : 'major';
  } else {
    classification = 'outlier';
  }

  return {
    deviationScore: Math.round(clamped * 1000) / 1000,
    classification,
    deviationPoints,
    addedSteps,
    removedSteps,
    reorderedSteps,
    editCount: alignment.editCount,
  };
}

/**
 * Build full ProcessVariantRecord objects from a set of runs grouped into variants.
 *
 * @param variants - Map of variant ID → run step sequences
 * @param canonicalSteps - The canonical path's step fingerprints
 * @param durations - Map of variant ID → duration array for runs in that variant
 * @param groupId - Parent process group ID
 * @param totalRuns - Total runs across all variants
 * @param config - Scoring config
 */
export function buildVariantRecords(
  variants: Map<string, StepFingerprint[][]>,
  canonicalSteps: StepFingerprint[],
  durations: Map<string, number[]>,
  groupId: string,
  totalRuns: number,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): ProcessVariantRecord[] {
  const records: ProcessVariantRecord[] = [];
  let rank = 0;

  // Sort by run count descending
  const sorted = [...variants.entries()].sort((a, b) => b[1].length - a[1].length);

  // Compute all durations for fastest/slowest detection
  const allAvgDurations: { id: string; avg: number | null }[] = [];
  for (const [variantId, runs] of sorted) {
    const durs = durations.get(variantId) ?? [];
    const avg = durs.length > 0
      ? Math.round(durs.reduce((s, d) => s + d, 0) / durs.length)
      : null;
    allAvgDurations.push({ id: variantId, avg });
  }

  const nonNullDurations = allAvgDurations.filter(d => d.avg !== null);
  const fastestId = nonNullDurations.length > 0
    ? nonNullDurations.reduce((min, d) => (d.avg! < min.avg! ? d : min)).id
    : null;
  const slowestId = nonNullDurations.length > 0
    ? nonNullDurations.reduce((max, d) => (d.avg! > max.avg! ? d : max)).id
    : null;

  for (const [variantId, runs] of sorted) {
    rank++;
    const representative = runs[0] ?? [];
    const distance = computeVariantDistance(representative, canonicalSteps, config);
    const runCount = runs.length;
    const percentOfRuns = totalRuns > 0 ? runCount / totalRuns : 0;

    const durs = durations.get(variantId) ?? [];
    const avgDurationMs = durs.length > 0
      ? Math.round(durs.reduce((s, d) => s + d, 0) / durs.length)
      : null;

    const isStandard = rank === 1;
    const isOutlier = distance.classification === 'outlier';

    const supporting: ExplanationEntry[] = [];
    const weaknesses: ExplanationEntry[] = [];

    if (isStandard) {
      supporting.push({
        code: 'STEP_SIGNATURE_MATCH',
        weight: 0.5,
        detail: `Canonical variant — ${Math.round(percentOfRuns * 100)}% of runs`,
      });
    }

    if (distance.addedSteps.length > 0) {
      weaknesses.push({
        code: 'MISSING_STEPS',
        weight: 0.1 * distance.addedSteps.length,
        detail: `${distance.addedSteps.length} added step(s) vs canonical`,
      });
    }

    if (distance.removedSteps.length > 0) {
      weaknesses.push({
        code: 'MISSING_STEPS',
        weight: 0.1 * distance.removedSteps.length,
        detail: `${distance.removedSteps.length} removed step(s) vs canonical`,
      });
    }

    records.push({
      id: variantId,
      processGroupId: groupId,
      variantName: isStandard ? 'Standard Path' : `Variant ${rank}`,
      variantRank: rank,
      runCount,
      percentOfRuns: Math.round(percentOfRuns * 1000) / 1000,
      pathStepCategories: representative.map(fp => fp.semanticSignature),
      deviationPoints: distance.deviationPoints,
      addedSteps: distance.addedSteps,
      removedSteps: distance.removedSteps,
      reorderedSteps: distance.reorderedSteps,
      avgDurationMs,
      confidenceScore: isStandard ? 0.95 : Math.max(0.3, 1 - distance.deviationScore),
      explanation: buildExplanation(supporting, weaknesses, config.modelVersion),
      isStandard,
      isFastest: variantId === fastestId,
      isSlowest: variantId === slowestId,
      isOutlier,
    });
  }

  return records;
}

// ─── Alignment algorithm ─────────────────────────────────────────────────────

interface AlignmentOp {
  type: 'match' | 'insertion' | 'deletion' | 'substitution';
  runIndex?: number;
  canonIndex?: number;
}

interface AlignmentResult {
  operations: AlignmentOp[];
  editCount: number;
}

/**
 * Compute an edit-distance-style alignment between two sequences.
 * Uses dynamic programming (Wagner–Fischer algorithm variant).
 */
function computeAlignment(run: string[], canon: string[]): AlignmentResult {
  const m = run.length;
  const n = canon.length;

  if (m === 0 && n === 0) return { operations: [], editCount: 0 };
  if (m === 0) {
    return {
      operations: canon.map((_, i) => ({ type: 'deletion' as const, canonIndex: i })),
      editCount: n,
    };
  }
  if (n === 0) {
    return {
      operations: run.map((_, i) => ({ type: 'insertion' as const, runIndex: i })),
      editCount: m,
    };
  }

  // DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = run[i - 1] === canon[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,     // insertion
        dp[i]![j - 1]! + 1,     // deletion
        dp[i - 1]![j - 1]! + cost, // match/substitution
      );
    }
  }

  // Backtrace
  const operations: AlignmentOp[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && run[i - 1] === canon[j - 1]) {
      operations.unshift({ type: 'match', runIndex: i - 1, canonIndex: j - 1 });
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i]![j] === dp[i - 1]![j - 1]! + 1) {
      operations.unshift({ type: 'substitution', runIndex: i - 1, canonIndex: j - 1 });
      i--; j--;
    } else if (j > 0 && dp[i]![j] === dp[i]![j - 1]! + 1) {
      operations.unshift({ type: 'deletion', canonIndex: j - 1 });
      j--;
    } else {
      operations.unshift({ type: 'insertion', runIndex: i - 1 });
      i--;
    }
  }

  return {
    operations,
    editCount: dp[m]![n]!,
  };
}
