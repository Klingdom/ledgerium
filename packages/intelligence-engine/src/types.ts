/**
 * Type definitions for the Ledgerium AI Process Intelligence Layer.
 *
 * The intelligence layer sits above the deterministic process engine.
 * It aggregates multiple ProcessRun + ProcessDefinition pairs (produced by
 * processSession()) into portfolio-level intelligence objects:
 *
 *   metrics, timestudy, variance, variants, bottlenecks, drift, standard path
 *
 * Design principles (from process-intelligence-layer-spec §6):
 * - Evidence before abstraction
 * - Deterministic-first clustering
 * - Variants are first-class
 * - Metrics must remain attributable
 * - Privacy preservation: no sensitive labels or raw content in outputs
 *
 * No UI, browser, or framework dependencies.
 */

import type { ProcessRun, ProcessDefinition } from '@ledgerium/process-engine';

// ─── Engine version ───────────────────────────────────────────────────────────

export const INTELLIGENCE_ENGINE_VERSION = '1.0.0' as const;

// ─── Default thresholds ───────────────────────────────────────────────────────
// All configurable via IntelligenceOptions. Values derived from docs §16.3, §12.

export const INTELLIGENCE_DEFAULTS = {
  /** Minimum runs needed before variant detection is meaningful. */
  MIN_RUNS_FOR_VARIANT_DETECTION: 2,
  /**
   * Similarity threshold for treating two path signatures as the same variant.
   * Corresponds to intelligence spec §10.4 "likely same process, variant possible"
   * band (0.75–0.89).
   */
  VARIANT_SIMILARITY_THRESHOLD: 0.75,
  /**
   * Fractional change in mean duration that triggers a timing drift signal.
   * Engine spec §16.3: "median duration changes by Z%".
   */
  DRIFT_DURATION_THRESHOLD: 0.25,
  /**
   * Duration ratio (step mean / overall mean) above which a step is flagged as
   * a bottleneck. Intelligence spec §8.2: "high average duration".
   */
  BOTTLENECK_DURATION_MULTIPLIER: 1.5,
  /**
   * Coefficient of variation threshold above which a duration distribution is
   * considered high-variance. Intelligence spec §15.2.3.
   */
  HIGH_VARIANCE_CV_THRESHOLD: 0.5,
} as const;

// ─── Input contract ───────────────────────────────────────────────────────────

/**
 * A pair of outputs from processSession() representing one analyzed run.
 * The intelligence engine accepts an array of these bundles.
 */
export interface ProcessRunBundle {
  processRun: ProcessRun;
  processDefinition: ProcessDefinition;
}

export interface IntelligenceInput {
  /** Current window of runs to analyze (one or more). */
  runs: ProcessRunBundle[];
  /**
   * Optional baseline window of runs for drift detection.
   * When provided, drift signals compare baseline metrics vs current metrics.
   */
  baseline?: ProcessRunBundle[];
  /** Override any default thresholds. */
  options?: Partial<IntelligenceOptions>;
}

export interface IntelligenceOptions {
  minRunsForVariantDetection: number;
  variantSimilarityThreshold: number;
  driftDurationThreshold: number;
  bottleneckDurationMultiplier: number;
  highVarianceCvThreshold: number;
  ruleVersion: string;
}

// ─── Path signature ───────────────────────────────────────────────────────────

/**
 * A deterministic, privacy-safe representation of a run's step sequence.
 * Uses step categories (GroupingReason enum values) rather than free-text titles.
 */
export interface PathSignature {
  /** Canonical colon-separated category sequence: "click_then_navigate:fill_and_submit" */
  signature: string;
  /** Ordered array of GroupingReason values. */
  stepCategories: string[];
  stepCount: number;
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

/**
 * Aggregate metrics across multiple ProcessRun instances.
 * Satisfies intelligence spec §15.2 (volume/adoption + timing + stability).
 */
export interface ProcessMetrics {
  runCount: number;
  completedRunCount: number;
  /** Fraction of runs with completionStatus === 'complete'. */
  completionRate: number;
  /** Mean number of error_handling steps per run (exception rate proxy). */
  errorStepFrequency: number;
  /** Mean number of click_then_navigate steps per run. */
  navigationStepFrequency: number;
  medianDurationMs: number | null;
  meanDurationMs: number | null;
  p90DurationMs: number | null;
  minDurationMs: number | null;
  maxDurationMs: number | null;
  medianStepCount: number | null;
  meanStepCount: number | null;
  /** Union of all systems observed across all contributing runs. */
  uniqueSystems: string[];
  /** Run IDs contributing to this metric snapshot (traceability). */
  evidenceRunIds: string[];
  ruleVersion: string;
  computedAt: string;
}

// ─── Timestudy ────────────────────────────────────────────────────────────────

/**
 * Duration statistics for a single step position across all runs.
 * Satisfies intelligence spec §15.2.2 (timing metrics).
 */
export interface StepPositionTimestudy {
  /** Ordinal position (1-based) in the process. */
  position: number;
  /**
   * Category of the step at this position.
   * Privacy-safe: uses GroupingReason, not the user-facing step title.
   */
  category: string;
  /** Number of runs that contributed data to this position. */
  runCount: number;
  meanDurationMs: number | null;
  medianDurationMs: number | null;
  minDurationMs: number | null;
  maxDurationMs: number | null;
  p90DurationMs: number | null;
  stdDevMs: number | null;
  evidenceRunIds: string[];
}

/**
 * Timestudy analysis covering total process duration and per-step durations.
 * Satisfies intelligence spec §15.2.2 and task requirement for timestudy features.
 */
export interface TimestudyResult {
  ruleVersion: string;
  runCount: number;
  computedAt: string;
  totalDuration: {
    meanMs: number | null;
    medianMs: number | null;
    p90Ms: number | null;
    minMs: number | null;
    maxMs: number | null;
    stdDevMs: number | null;
  };
  stepPositionTimestudies: StepPositionTimestudy[];
  evidenceRunIds: string[];
}

// ─── Variance ─────────────────────────────────────────────────────────────────

/**
 * A step position with high duration variance across runs.
 */
export interface HighVarianceStep {
  position: number;
  category: string;
  /** Coefficient of variation (stdDev / mean). Higher = more variable. */
  coefficientOfVariation: number;
  meanDurationMs: number;
  stdDevMs: number;
  runCount: number;
  evidenceRunIds: string[];
}

/**
 * Variance analysis across runs.
 * Satisfies intelligence spec §15.2.3 and task variance analysis requirement.
 */
export interface VarianceReport {
  ruleVersion: string;
  runCount: number;
  computedAt: string;
  durationVariance: {
    stdDevMs: number | null;
    coefficientOfVariation: number | null;
    isHighVariance: boolean;
  };
  stepCountVariance: {
    min: number;
    max: number;
    stdDev: number | null;
    isHighVariance: boolean;
  };
  /**
   * Fraction of runs (0–1) that follow the standard path signature exactly.
   * 1.0 = all runs are identical in structure.
   */
  sequenceStability: number;
  highVarianceSteps: HighVarianceStep[];
  evidenceRunIds: string[];
}

// ─── Variants ─────────────────────────────────────────────────────────────────

/**
 * A distinct execution path pattern observed across one or more runs.
 * Satisfies intelligence spec §12 (standard path, variants, exceptions).
 */
export interface ProcessVariant {
  /** Deterministic ID: "variant-1", "variant-2", etc. (most frequent first). */
  variantId: string;
  pathSignature: PathSignature;
  runCount: number;
  /** Fraction of total runs following this variant. */
  frequency: number;
  /** True for the most frequent variant. */
  isStandardPath: boolean;
  /** Similarity score 0–1 to the standard path (1.0 for standard path itself). */
  similarityToStandard: number;
  evidenceRunIds: string[];
}

export interface VariantSet {
  ruleVersion: string;
  runCount: number;
  computedAt: string;
  variantCount: number;
  standardPath: ProcessVariant | null;
  variants: ProcessVariant[];
  variantSimilarityThreshold: number;
  evidenceRunIds: string[];
}

// ─── Bottlenecks ──────────────────────────────────────────────────────────────

/**
 * A step position identified as a bottleneck.
 * Satisfies intelligence spec §8.2 (bottleneck detection).
 */
export interface BottleneckStep {
  position: number;
  category: string;
  meanDurationMs: number;
  overallMeanStepDurationMs: number;
  /** Step mean / overall mean. Values >= bottleneckDurationMultiplier are flagged. */
  durationRatio: number;
  isHighDuration: boolean;
  isHighVariance: boolean;
  coefficientOfVariation: number | null;
  runCount: number;
  evidenceRunIds: string[];
}

export interface BottleneckReport {
  ruleVersion: string;
  runCount: number;
  computedAt: string;
  bottleneckCount: number;
  bottlenecks: BottleneckStep[];
  bottleneckDurationMultiplier: number;
  highVarianceCvThreshold: number;
  evidenceRunIds: string[];
}

// ─── Drift ────────────────────────────────────────────────────────────────────

export type DriftType = 'structural' | 'timing' | 'exception_rate' | 'step_count';
export type DriftSeverity = 'low' | 'medium' | 'high';

/**
 * An individual drift signal with traceability.
 * Satisfies intelligence spec §16.2.
 */
export interface DriftSignal {
  driftType: DriftType;
  severity: DriftSeverity;
  /** Human-readable description of the drift. No sensitive content. */
  description: string;
  baselineValue: number | string;
  currentValue: number | string;
  changePercent?: number;
  evidenceRunIds: string[];
}

/**
 * Drift detection result comparing current runs against a baseline window.
 * Satisfies intelligence spec §16 (structural, timing, exception, step count drift).
 */
export interface DriftReport {
  ruleVersion: string;
  baselineRunCount: number;
  currentRunCount: number;
  computedAt: string;
  driftDetected: boolean;
  driftSignals: DriftSignal[];
  driftDurationThreshold: number;
  evidenceRunIds: string[];
}

// ─── Standard path ────────────────────────────────────────────────────────────

/**
 * The standard path result: the most frequently observed execution structure.
 * Satisfies intelligence spec §12.1 and §12.2.
 */
export interface StandardPathResult {
  pathSignature: PathSignature | null;
  /** Number of runs that follow the standard path. */
  runCount: number;
  /** Fraction of total runs that follow the standard path. */
  frequency: number;
  evidenceRunIds: string[];
}

// ─── Portfolio intelligence (main output) ─────────────────────────────────────

/**
 * Complete intelligence output for a process portfolio (one or more runs).
 *
 * All sub-outputs include `evidenceRunIds` for traceability per
 * intelligence spec §19 (trust, provenance, and explainability).
 *
 * `drift` is only present when baseline runs were provided.
 */
export interface PortfolioIntelligence {
  processTitle: string;
  runCount: number;
  ruleVersion: string;
  computedAt: string;
  metrics: ProcessMetrics;
  timestudy: TimestudyResult;
  variance: VarianceReport;
  variants: VariantSet;
  bottlenecks: BottleneckReport;
  drift?: DriftReport;
  standardPath: StandardPathResult;
}
