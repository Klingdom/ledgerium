/**
 * Timestudy analyzer.
 *
 * Computes total and per-step duration statistics across multiple runs.
 * Satisfies intelligence spec §15.2.2 (timing metrics) and the task
 * requirement that timestudy be a first-class deliverable.
 *
 * Step positions are indexed by ordinal. When the standard path has 3 steps,
 * position 1, 2, 3 will each have statistics drawn from all runs that include
 * that step ordinal.
 *
 * Privacy: position labels use the step category (GroupingReason), not the
 * user-facing step title or any event-level content.
 *
 * Determinism: given identical inputs, outputs are identical.
 */

import type {
  ProcessRunBundle,
  TimestudyResult,
  StepPositionTimestudy,
  IntelligenceOptions,
} from './types.js';
import { mean, median, percentile, stdDev } from './stats.js';

export function analyzeTimestudy(
  bundles: ProcessRunBundle[],
  options: IntelligenceOptions,
): TimestudyResult {
  const now = new Date().toISOString();
  const allRunIds = bundles.map(b => b.processRun.runId);

  // ── Total duration statistics ──────────────────────────────────────────────

  const durations = bundles
    .map(b => b.processRun.durationMs)
    .filter((d): d is number => d !== undefined);

  // ── Per-position step duration statistics ──────────────────────────────────
  //
  // Group step durations by ordinal position across all runs.
  // For each position, also track the most common category seen there.

  const positionMap = new Map<
    number,
    { durations: number[]; categoryCounts: Map<string, number>; runIds: string[] }
  >();

  for (const bundle of bundles) {
    for (const step of bundle.processDefinition.stepDefinitions) {
      const pos = step.ordinal;
      if (!positionMap.has(pos)) {
        positionMap.set(pos, { durations: [], categoryCounts: new Map(), runIds: [] });
      }
      const entry = positionMap.get(pos)!;

      if (step.durationMs !== undefined) {
        entry.durations.push(step.durationMs);
      }

      // Track category by frequency for stable, representative labeling
      const count = entry.categoryCounts.get(step.category) ?? 0;
      entry.categoryCounts.set(step.category, count + 1);

      entry.runIds.push(bundle.processRun.runId);
    }
  }

  // Sort positions ascending for stable, deterministic output order
  const positions = [...positionMap.keys()].sort((a, b) => a - b);

  const stepPositionTimestudies: StepPositionTimestudy[] = positions.map(pos => {
    const entry = positionMap.get(pos)!;

    // Most frequent category at this position (deterministic: tie-break by
    // lexicographic order of the category string)
    let dominantCategory = 'single_action';
    let maxCount = 0;
    for (const [cat, cnt] of entry.categoryCounts) {
      if (cnt > maxCount || (cnt === maxCount && cat < dominantCategory)) {
        dominantCategory = cat;
        maxCount = cnt;
      }
    }

    return {
      position: pos,
      category: dominantCategory,
      runCount: new Set(entry.runIds).size,
      meanDurationMs: mean(entry.durations),
      medianDurationMs: median(entry.durations),
      minDurationMs: entry.durations.length > 0 ? Math.min(...entry.durations) : null,
      maxDurationMs: entry.durations.length > 0 ? Math.max(...entry.durations) : null,
      p90DurationMs: percentile(entry.durations, 90),
      stdDevMs: stdDev(entry.durations),
      evidenceRunIds: [...new Set(entry.runIds)].sort(),
    };
  });

  return {
    ruleVersion: options.ruleVersion,
    runCount: bundles.length,
    computedAt: now,
    totalDuration: {
      meanMs: mean(durations),
      medianMs: median(durations),
      p90Ms: percentile(durations, 90),
      minMs: durations.length > 0 ? Math.min(...durations) : null,
      maxMs: durations.length > 0 ? Math.max(...durations) : null,
      stdDevMs: stdDev(durations),
    },
    stepPositionTimestudies,
    evidenceRunIds: allRunIds,
  };
}
