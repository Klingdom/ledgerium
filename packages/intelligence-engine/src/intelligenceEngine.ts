/**
 * Process Intelligence Engine — main orchestrator.
 *
 * Transforms an array of ProcessRunBundle outputs (from @ledgerium/process-engine)
 * into portfolio-level intelligence objects:
 *
 *   metrics, timestudy, variance, variants, bottlenecks, drift, standard path
 *
 * Design contract (intelligence spec §6):
 * - Pure function: same inputs → same analytics outputs (computedAt timestamps differ)
 * - Evidence-linked: every output carries evidenceRunIds for traceability
 * - Deterministic-first: no randomness, no LLM, no opaque heuristics
 * - Privacy-safe: no sensitive content in outputs; categories/durations only
 * - At least one run is required
 *
 * Usage:
 *   import { analyzePortfolio } from '@ledgerium/intelligence-engine';
 *   const intelligence = analyzePortfolio({ runs: [bundle1, bundle2] });
 */

import type {
  IntelligenceInput,
  IntelligenceOptions,
  PortfolioIntelligence,
  StandardPathResult,
} from './types.js';
import { INTELLIGENCE_ENGINE_VERSION, INTELLIGENCE_DEFAULTS } from './types.js';
import { buildMetrics } from './metricsBuilder.js';
import { analyzeTimestudy } from './timestudyAnalyzer.js';
import { analyzeVariance } from './varianceAnalyzer.js';
import { detectVariants } from './variantDetector.js';
import { detectBottlenecks } from './bottleneckDetector.js';
import { detectDrift } from './driftDetector.js';

// ─── Option resolution ────────────────────────────────────────────────────────

/**
 * Merge caller-supplied options with defaults.
 * All values are deterministic constants — no runtime behavior changes.
 */
export function resolveOptions(partial?: Partial<IntelligenceOptions>): IntelligenceOptions {
  return {
    minRunsForVariantDetection:
      partial?.minRunsForVariantDetection ?? INTELLIGENCE_DEFAULTS.MIN_RUNS_FOR_VARIANT_DETECTION,
    variantSimilarityThreshold:
      partial?.variantSimilarityThreshold ?? INTELLIGENCE_DEFAULTS.VARIANT_SIMILARITY_THRESHOLD,
    driftDurationThreshold:
      partial?.driftDurationThreshold ?? INTELLIGENCE_DEFAULTS.DRIFT_DURATION_THRESHOLD,
    bottleneckDurationMultiplier:
      partial?.bottleneckDurationMultiplier ?? INTELLIGENCE_DEFAULTS.BOTTLENECK_DURATION_MULTIPLIER,
    highVarianceCvThreshold:
      partial?.highVarianceCvThreshold ?? INTELLIGENCE_DEFAULTS.HIGH_VARIANCE_CV_THRESHOLD,
    ruleVersion: partial?.ruleVersion ?? INTELLIGENCE_ENGINE_VERSION,
  };
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Analyze a portfolio of ProcessRun bundles and produce intelligence outputs.
 *
 * @param input.runs - One or more ProcessRunBundle objects (required)
 * @param input.baseline - Optional prior-window bundles for drift detection
 * @param input.options - Optional threshold overrides
 *
 * @throws Error if runs is empty (at least one run is required)
 */
export function analyzePortfolio(input: IntelligenceInput): PortfolioIntelligence {
  const { runs, baseline, options: rawOptions } = input;

  if (runs.length === 0) {
    throw new Error(
      '[intelligence-engine] analyzePortfolio requires at least one ProcessRunBundle in `runs`.',
    );
  }

  const options = resolveOptions(rawOptions);
  const now = new Date().toISOString();

  // All sub-analyses are independent pure functions.
  // Compute variants first so we have the standard path signature
  // available for variance analysis (sequence stability calculation).
  const variants = detectVariants(runs, options);
  const standardPathSignature = variants.standardPath?.pathSignature.signature ?? null;

  const metrics = buildMetrics(runs, options);
  const timestudy = analyzeTimestudy(runs, options);
  const variance = analyzeVariance(runs, options, standardPathSignature);
  const bottlenecks = detectBottlenecks(runs, options);

  // Drift is only computed when baseline runs are provided
  const drift =
    baseline !== undefined && baseline.length > 0
      ? detectDrift(baseline, runs, options)
      : undefined;

  // Standard path summary (extracted from variants output for top-level access)
  const standardPath: StandardPathResult = {
    pathSignature: variants.standardPath?.pathSignature ?? null,
    runCount: variants.standardPath?.runCount ?? 0,
    frequency: variants.standardPath?.frequency ?? 0,
    evidenceRunIds: variants.standardPath?.evidenceRunIds ?? [],
  };

  // Process title: use the activityName from the first run.
  // Callers are expected to group runs for the same process before calling this.
  const processTitle = runs[0]!.processRun.activityName;

  const result: PortfolioIntelligence = {
    processTitle,
    runCount: runs.length,
    ruleVersion: options.ruleVersion,
    computedAt: now,
    metrics,
    timestudy,
    variance,
    variants,
    bottlenecks,
    standardPath,
  };

  // Conditionally add drift — only if computed
  if (drift !== undefined) {
    result.drift = drift;
  }

  return result;
}
