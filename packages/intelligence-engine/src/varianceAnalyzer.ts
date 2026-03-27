/**
 * Variance analyzer.
 *
 * Computes variance in total duration, step counts, and per-position step
 * durations across multiple runs. Identifies high-variance steps.
 *
 * Satisfies intelligence spec §15.2.3 (stability and variability metrics)
 * and the task requirement that variance analysis be a first-class deliverable.
 *
 * Privacy: step positions are labeled by category, not by step title.
 *
 * Determinism: given identical inputs and standard path signature, outputs
 * are identical.
 */

import type {
  ProcessRunBundle,
  VarianceReport,
  HighVarianceStep,
  IntelligenceOptions,
} from './types.js';
import { stdDev, coefficientOfVariation, mean } from './stats.js';
import { computePathSignature } from './pathSignature.js';

export function analyzeVariance(
  bundles: ProcessRunBundle[],
  options: IntelligenceOptions,
  /** Signature string of the standard path; used to compute sequence stability. */
  standardPathSignature: string | null,
): VarianceReport {
  const now = new Date().toISOString();
  const allRunIds = bundles.map(b => b.processRun.runId);

  if (bundles.length === 0) {
    return {
      ruleVersion: options.ruleVersion,
      runCount: 0,
      computedAt: now,
      durationVariance: { stdDevMs: null, coefficientOfVariation: null, isHighVariance: false },
      stepCountVariance: { min: 0, max: 0, stdDev: null, isHighVariance: false },
      sequenceStability: 1.0,
      highVarianceSteps: [],
      evidenceRunIds: [],
    };
  }

  // ── Total duration variance ────────────────────────────────────────────────

  const durations = bundles
    .map(b => b.processRun.durationMs)
    .filter((d): d is number => d !== undefined);

  const durCv = coefficientOfVariation(durations);
  const durStdDev = stdDev(durations);

  // ── Step count variance ────────────────────────────────────────────────────

  const stepCounts = bundles.map(b => b.processRun.stepCount);
  const stepCountStdDev = stdDev(stepCounts);
  const minSteps = Math.min(...stepCounts);
  const maxSteps = Math.max(...stepCounts);

  // Heuristic: high variance in step count if range > 2 or stdDev > 1
  const isStepCountHighVariance =
    maxSteps - minSteps > 2 || (stepCountStdDev !== null && stepCountStdDev > 1);

  // ── Sequence stability ─────────────────────────────────────────────────────
  //
  // Fraction of runs that exactly match the standard path signature.
  // 1.0 = all runs are structurally identical.

  let standardMatchCount = 0;
  if (standardPathSignature !== null) {
    for (const b of bundles) {
      const sig = computePathSignature(b);
      if (sig.signature === standardPathSignature) standardMatchCount++;
    }
  }
  const sequenceStability =
    standardPathSignature !== null && bundles.length > 0
      ? standardMatchCount / bundles.length
      : 1.0;

  // ── Per-position duration variance ────────────────────────────────────────

  const positionMap = new Map<
    number,
    { durations: number[]; category: string; runIds: string[] }
  >();

  for (const bundle of bundles) {
    for (const step of bundle.processDefinition.stepDefinitions) {
      if (step.durationMs === undefined) continue;
      const pos = step.ordinal;
      if (!positionMap.has(pos)) {
        positionMap.set(pos, { durations: [], category: step.category, runIds: [] });
      }
      const entry = positionMap.get(pos)!;
      entry.durations.push(step.durationMs);
      entry.runIds.push(bundle.processRun.runId);
    }
  }

  const highVarianceSteps: HighVarianceStep[] = [];

  for (const [pos, entry] of positionMap) {
    if (entry.durations.length < 2) continue;
    const cv = coefficientOfVariation(entry.durations);
    if (cv !== null && cv >= options.highVarianceCvThreshold) {
      const m = mean(entry.durations);
      const sd = stdDev(entry.durations);
      if (m !== null && sd !== null) {
        highVarianceSteps.push({
          position: pos,
          category: entry.category,
          coefficientOfVariation: cv,
          meanDurationMs: m,
          stdDevMs: sd,
          runCount: entry.durations.length,
          evidenceRunIds: [...new Set(entry.runIds)].sort(),
        });
      }
    }
  }

  // Sort by CV descending for most-variable-first ordering
  highVarianceSteps.sort((a, b) => b.coefficientOfVariation - a.coefficientOfVariation);

  return {
    ruleVersion: options.ruleVersion,
    runCount: bundles.length,
    computedAt: now,
    durationVariance: {
      stdDevMs: durStdDev,
      coefficientOfVariation: durCv,
      isHighVariance: durCv !== null && durCv >= options.highVarianceCvThreshold,
    },
    stepCountVariance: {
      min: minSteps,
      max: maxSteps,
      stdDev: stepCountStdDev,
      isHighVariance: isStepCountHighVariance,
    },
    sequenceStability,
    highVarianceSteps,
    evidenceRunIds: allRunIds,
  };
}
