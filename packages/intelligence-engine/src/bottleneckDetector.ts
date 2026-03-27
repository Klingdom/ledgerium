/**
 * Bottleneck detector.
 *
 * Identifies step positions that are disproportionately slow or highly variable
 * relative to other steps in the same process.
 *
 * Satisfies intelligence spec §8.2 (bottleneck detection signals):
 * - high average duration
 * - high variance
 *
 * A step is flagged as a bottleneck when either condition is met:
 * 1. Its mean duration >= overall mean step duration × bottleneckDurationMultiplier
 * 2. Its coefficient of variation >= highVarianceCvThreshold
 *
 * Privacy: step positions use category labels, not user-facing step titles.
 * Determinism: output order is by duration ratio descending.
 */

import type {
  ProcessRunBundle,
  BottleneckReport,
  BottleneckStep,
  IntelligenceOptions,
} from './types.js';
import { mean, coefficientOfVariation } from './stats.js';

export function detectBottlenecks(
  bundles: ProcessRunBundle[],
  options: IntelligenceOptions,
): BottleneckReport {
  const now = new Date().toISOString();
  const allRunIds = bundles.map(b => b.processRun.runId);

  if (bundles.length === 0) {
    return {
      ruleVersion: options.ruleVersion,
      runCount: 0,
      computedAt: now,
      bottleneckCount: 0,
      bottlenecks: [],
      bottleneckDurationMultiplier: options.bottleneckDurationMultiplier,
      highVarianceCvThreshold: options.highVarianceCvThreshold,
      evidenceRunIds: [],
    };
  }

  // Build per-position duration maps
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

  // Overall mean step duration across ALL step positions and ALL runs
  const allDurations: number[] = [];
  for (const entry of positionMap.values()) {
    allDurations.push(...entry.durations);
  }
  const overallMean = mean(allDurations) ?? 0;

  const bottlenecks: BottleneckStep[] = [];

  for (const [pos, entry] of positionMap) {
    if (entry.durations.length === 0) continue;
    const stepMean = mean(entry.durations)!;
    const cv = coefficientOfVariation(entry.durations);
    const durationRatio = overallMean > 0 ? stepMean / overallMean : 1;
    const isHighDuration = durationRatio >= options.bottleneckDurationMultiplier;
    const isHighVariance = cv !== null && cv >= options.highVarianceCvThreshold;

    if (isHighDuration || isHighVariance) {
      bottlenecks.push({
        position: pos,
        category: entry.category,
        meanDurationMs: stepMean,
        overallMeanStepDurationMs: overallMean,
        durationRatio,
        isHighDuration,
        isHighVariance,
        coefficientOfVariation: cv,
        runCount: entry.durations.length,
        evidenceRunIds: [...new Set(entry.runIds)].sort(),
      });
    }
  }

  // Sort by duration ratio descending; tie-break by position for determinism
  bottlenecks.sort(
    (a, b) => b.durationRatio - a.durationRatio || a.position - b.position,
  );

  return {
    ruleVersion: options.ruleVersion,
    runCount: bundles.length,
    computedAt: now,
    bottleneckCount: bottlenecks.length,
    bottlenecks,
    bottleneckDurationMultiplier: options.bottleneckDurationMultiplier,
    highVarianceCvThreshold: options.highVarianceCvThreshold,
    evidenceRunIds: allRunIds,
  };
}
