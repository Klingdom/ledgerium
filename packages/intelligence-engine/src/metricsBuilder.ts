/**
 * Aggregate metrics builder.
 *
 * Computes volume, timing, and stability metrics across multiple ProcessRun
 * instances per intelligence spec §15.2.
 *
 * Every output includes evidenceRunIds for full traceability (spec §19.2).
 * No sensitive content is included in outputs (spec §26).
 */

import type { ProcessRunBundle, ProcessMetrics, IntelligenceOptions } from './types.js';
import { mean, median, percentile } from './stats.js';

export function buildMetrics(
  bundles: ProcessRunBundle[],
  options: IntelligenceOptions,
): ProcessMetrics {
  const now = new Date().toISOString();
  const allRunIds = bundles.map(b => b.processRun.runId);

  const completedRuns = bundles.filter(b => b.processRun.completionStatus === 'complete');

  const durations = bundles
    .map(b => b.processRun.durationMs)
    .filter((d): d is number => d !== undefined);

  const stepCounts = bundles.map(b => b.processRun.stepCount);

  // Aggregate unique systems across all runs (privacy-safe: application labels)
  const systemSet = new Set<string>();
  for (const b of bundles) {
    for (const s of b.processDefinition.systems) {
      systemSet.add(s);
    }
  }

  // Error step frequency: mean count of error_handling steps per run
  const errorCounts = bundles.map(b => b.processRun.errorStepCount);
  const navCounts = bundles.map(b => b.processRun.navigationStepCount);

  return {
    runCount: bundles.length,
    completedRunCount: completedRuns.length,
    completionRate: bundles.length > 0 ? completedRuns.length / bundles.length : 0,
    errorStepFrequency: bundles.length > 0
      ? errorCounts.reduce((s, c) => s + c, 0) / bundles.length
      : 0,
    navigationStepFrequency: bundles.length > 0
      ? navCounts.reduce((s, c) => s + c, 0) / bundles.length
      : 0,
    medianDurationMs: median(durations),
    meanDurationMs: mean(durations),
    p90DurationMs: percentile(durations, 90),
    minDurationMs: durations.length > 0 ? Math.min(...durations) : null,
    maxDurationMs: durations.length > 0 ? Math.max(...durations) : null,
    medianStepCount: median(stepCounts),
    meanStepCount: mean(stepCounts),
    uniqueSystems: [...systemSet].sort(),
    evidenceRunIds: allRunIds,
    ruleVersion: options.ruleVersion,
    computedAt: now,
  };
}
