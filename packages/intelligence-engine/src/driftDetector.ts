/**
 * Drift detector.
 *
 * Compares a current window of runs against a baseline window to identify
 * meaningful changes in how the process is being executed.
 *
 * Satisfies intelligence spec §16 (drift and change detection):
 * - structural drift: most common path signature changed
 * - timing drift: mean duration changed by >= driftDurationThreshold
 * - step count drift: mean step count changed by >= 20%
 * - exception rate drift: error step frequency doubled or appeared from zero
 *
 * Thresholds are configurable via IntelligenceOptions.
 *
 * Determinism: signal detection is fully deterministic given identical inputs
 * and thresholds. DriftSignal descriptions are template-driven, not generated.
 *
 * Privacy: descriptions reference only structural metrics, never user content.
 */

import type {
  ProcessRunBundle,
  DriftReport,
  DriftSignal,
  IntelligenceOptions,
} from './types.js';
import { mean } from './stats.js';
import { computePathSignature } from './pathSignature.js';

export function detectDrift(
  baselineBundles: ProcessRunBundle[],
  currentBundles: ProcessRunBundle[],
  options: IntelligenceOptions,
): DriftReport {
  const now = new Date().toISOString();
  const currentRunIds = currentBundles.map(b => b.processRun.runId);
  const signals: DriftSignal[] = [];

  if (baselineBundles.length === 0 || currentBundles.length === 0) {
    return {
      ruleVersion: options.ruleVersion,
      baselineRunCount: baselineBundles.length,
      currentRunCount: currentBundles.length,
      computedAt: now,
      driftDetected: false,
      driftSignals: [],
      driftDurationThreshold: options.driftDurationThreshold,
      evidenceRunIds: currentRunIds,
    };
  }

  // ── Timing drift ───────────────────────────────────────────────────────────

  const baselineDurations = baselineBundles
    .map(b => b.processRun.durationMs)
    .filter((d): d is number => d !== undefined);

  const currentDurations = currentBundles
    .map(b => b.processRun.durationMs)
    .filter((d): d is number => d !== undefined);

  if (baselineDurations.length > 0 && currentDurations.length > 0) {
    const baselineMean = mean(baselineDurations)!;
    const currentMean = mean(currentDurations)!;
    const changePercent =
      baselineMean > 0 ? (currentMean - baselineMean) / baselineMean : 0;

    if (Math.abs(changePercent) >= options.driftDurationThreshold) {
      const absPct = Math.abs(changePercent);
      const severity: DriftSignal['severity'] =
        absPct >= 0.5 ? 'high' : absPct >= options.driftDurationThreshold ? 'medium' : 'low';
      const direction = changePercent > 0 ? 'increased' : 'decreased';
      signals.push({
        driftType: 'timing',
        severity,
        description: `Mean process duration ${direction} by ${Math.round(absPct * 100)}% from baseline (${msLabel(baselineMean)} → ${msLabel(currentMean)}).`,
        baselineValue: Math.round(baselineMean),
        currentValue: Math.round(currentMean),
        changePercent,
        evidenceRunIds: [...currentRunIds],
      });
    }
  }

  // ── Structural drift ───────────────────────────────────────────────────────
  // Compare most common path signature between baseline and current.

  const baselineSigs = baselineBundles.map(b => computePathSignature(b).signature);
  const currentSigs = currentBundles.map(b => computePathSignature(b).signature);

  const baselineMode = mostFrequent(baselineSigs);
  const currentMode = mostFrequent(currentSigs);

  if (baselineMode !== null && currentMode !== null && baselineMode !== currentMode) {
    signals.push({
      driftType: 'structural',
      severity: 'medium',
      description: 'The most common process path structure has changed from the baseline window.',
      baselineValue: baselineMode,
      currentValue: currentMode,
      evidenceRunIds: [...currentRunIds],
    });
  }

  // ── Step count drift ───────────────────────────────────────────────────────

  const baselineStepMean = mean(baselineBundles.map(b => b.processRun.stepCount))!;
  const currentStepMean = mean(currentBundles.map(b => b.processRun.stepCount))!;
  const stepChange =
    baselineStepMean > 0 ? (currentStepMean - baselineStepMean) / baselineStepMean : 0;

  if (Math.abs(stepChange) >= 0.2) {
    const direction = stepChange > 0 ? 'increased' : 'decreased';
    signals.push({
      driftType: 'step_count',
      severity: Math.abs(stepChange) >= 0.4 ? 'high' : 'low',
      description: `Mean step count ${direction} by ${Math.round(Math.abs(stepChange) * 100)}% from baseline (${round1(baselineStepMean)} → ${round1(currentStepMean)} steps).`,
      baselineValue: round1(baselineStepMean),
      currentValue: round1(currentStepMean),
      changePercent: stepChange,
      evidenceRunIds: [...currentRunIds],
    });
  }

  // ── Exception rate drift ───────────────────────────────────────────────────

  const baselineErrRate =
    mean(baselineBundles.map(b => b.processRun.errorStepCount)) ?? 0;
  const currentErrRate =
    mean(currentBundles.map(b => b.processRun.errorStepCount)) ?? 0;

  if (baselineErrRate > 0) {
    const errChange = (currentErrRate - baselineErrRate) / baselineErrRate;
    if (errChange >= 1.0) {
      signals.push({
        driftType: 'exception_rate',
        severity: 'high',
        description: `Error/exception step rate doubled from baseline (${round2(baselineErrRate)} → ${round2(currentErrRate)} per run).`,
        baselineValue: round2(baselineErrRate),
        currentValue: round2(currentErrRate),
        changePercent: errChange,
        evidenceRunIds: [...currentRunIds],
      });
    }
  } else if (currentErrRate > 0) {
    signals.push({
      driftType: 'exception_rate',
      severity: 'medium',
      description: `Error/exception steps appeared in current runs but were absent in the baseline window (${round2(currentErrRate)} per run).`,
      baselineValue: 0,
      currentValue: round2(currentErrRate),
      evidenceRunIds: [...currentRunIds],
    });
  }

  return {
    ruleVersion: options.ruleVersion,
    baselineRunCount: baselineBundles.length,
    currentRunCount: currentBundles.length,
    computedAt: now,
    driftDetected: signals.length > 0,
    driftSignals: signals,
    driftDurationThreshold: options.driftDurationThreshold,
    evidenceRunIds: currentRunIds,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mostFrequent(arr: string[]): string | null {
  if (arr.length === 0) return null;
  const counts = new Map<string, number>();
  for (const item of arr) counts.set(item, (counts.get(item) ?? 0) + 1);
  // Deterministic tie-break: lexicographic order
  let result: string | null = null;
  let maxCount = 0;
  for (const [item, count] of counts) {
    if (count > maxCount || (count === maxCount && result !== null && item < result)) {
      maxCount = count;
      result = item;
    }
  }
  return result;
}

function msLabel(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${Math.round(ms / 1000)}s`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
