/**
 * Deterministic clustering-threshold calibration harness (Cross-Workflow
 * Intelligence, Phase 0).
 *
 * `clusterSignatures` needs a `threshold` to decide when two recordings are
 * "the same process, run differently" vs. "two different processes." Today
 * that value (`DEFAULT_CLUSTER_THRESHOLD = 0.6`) is a documented placeholder,
 * not a data-derived decision. This module gives us a defensible way to pick
 * one: compute the full pairwise `traceSimilarity` distribution for a real
 * population of recordings, sweep `clusterSignatures` across a threshold
 * range, and surface the widest STABLE region (a "plateau" of thresholds that
 * all produce the same cluster count) as the recommended value. A wide
 * plateau means the clustering outcome is insensitive to small threshold
 * changes in that range — the most defensible place to lock in a production
 * constant.
 *
 * Pure + DETERMINISTIC, matching the contract of `clusterSignatures` /
 * `traceSimilarity`: no Date/Math.random/IO, permutation-invariant (inputs
 * are canonicalized by sorting on `id` before any arithmetic), and idempotent
 * (same input set → byte-identical report, in any input order).
 *
 * This module does NOT change `clusterSignatures` or `traceSimilarity` — it
 * is a read-only analysis layer on top of them.
 */
import type { ClusterMemberInput } from '../clustering/clusterSignatures.js';
import { clusterSignatures } from '../clustering/clusterSignatures.js';
import {
  traceSimilarity,
  DEFAULT_SIMILARITY_WEIGHTS,
  type SimilarityWeights,
} from '../clustering/traceSimilarity.js';

export const CALIBRATION_VERSION = 'calibration/1.0.0';

const DEFAULT_MIN_THRESHOLD = 0.5;
const DEFAULT_MAX_THRESHOLD = 0.95;
const DEFAULT_THRESHOLD_STEP = 0.05;
const HISTOGRAM_BUCKET_COUNT = 10;

/**
 * Calibration input. Deliberately re-uses `ClusterMemberInput` (the same
 * `{ id, signature: PathSignature }` shape `clusterSignatures` already
 * consumes) rather than inventing a parallel `string[]`-based shape —
 * `traceSimilarity` operates on the full `PathSignature` (category sequence
 * + stepCount), not a bare string array, so reusing the existing type keeps
 * this module wired to the real contract instead of a lossy approximation.
 */
export type CalibrationMember = ClusterMemberInput;

export interface CalibrationOptions {
  /** Lowest threshold to sweep (inclusive). Default 0.5. */
  min?: number;
  /** Highest threshold to sweep (inclusive). Default 0.95. */
  max?: number;
  /** Step size between swept thresholds. Default 0.05. */
  step?: number;
  /** Similarity weights passed through to `traceSimilarity` / `clusterSignatures`. */
  weights?: SimilarityWeights;
}

export interface SimilarityHistogramBucket {
  /** Inclusive lower bound. */
  rangeStart: number;
  /** Exclusive upper bound (the final bucket's upper bound is inclusive of 1.0). */
  rangeEnd: number;
  count: number;
}

export interface SimilarityDistribution {
  /** Number of unordered pairs considered (n·(n−1)/2). */
  pairCount: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  /** Fixed 10-bucket histogram spanning [0, 1]. */
  histogram: SimilarityHistogramBucket[];
}

export interface ThresholdSweepPoint {
  threshold: number;
  clusterCount: number;
  largestClusterSize: number;
  singletonCount: number;
  /** Number of pairs whose similarity is >= this threshold (graph density at this cutoff). */
  mergedPairCount: number;
}

export interface CalibrationParams {
  min: number;
  max: number;
  step: number;
  weights: SimilarityWeights;
}

export interface PlateauRange {
  /** Lowest threshold in the winning plateau. */
  start: number;
  /** Highest threshold in the winning plateau — also the recommended value. */
  end: number;
  /** Number of consecutive swept thresholds in the plateau. */
  length: number;
  /** clusterCount shared by every threshold in the plateau. */
  clusterCount: number;
}

export interface CalibrationReport {
  version: string;
  memberCount: number;
  params: CalibrationParams;
  distribution: SimilarityDistribution;
  /** One entry per swept threshold, ascending. */
  sweep: ThresholdSweepPoint[];
  /**
   * The highest threshold within the widest stable plateau, or `null` when
   * there are fewer than 2 members (no pairwise signal to calibrate from).
   */
  recommendedThreshold: number | null;
  plateauRange: PlateauRange | null;
  /** Human-readable rationale for `recommendedThreshold` (or why it is null). */
  reason: string;
}

function asc(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Builds the ascending, FP-safe list of thresholds to sweep. */
function buildThresholdRange(min: number, max: number, step: number): number[] {
  if (step <= 0) {
    throw new Error(`calibrateThreshold: step must be > 0 (got ${step})`);
  }
  if (min > max) {
    throw new Error(`calibrateThreshold: min (${min}) must be <= max (${max})`);
  }
  const out: number[] = [];
  const count = Math.round((max - min) / step);
  for (let i = 0; i <= count; i++) {
    out.push(round4(min + i * step));
  }
  return out;
}

/** All pairwise similarities over a canonically-sorted (by id) member list. */
function computePairwiseSimilarities(
  sortedMembers: readonly CalibrationMember[],
  weights: SimilarityWeights,
): number[] {
  const sims: number[] = [];
  for (let i = 0; i < sortedMembers.length; i++) {
    const mi = sortedMembers[i] as CalibrationMember;
    for (let j = i + 1; j < sortedMembers.length; j++) {
      const mj = sortedMembers[j] as CalibrationMember;
      sims.push(traceSimilarity(mi.signature, mj.signature, weights));
    }
  }
  return sims;
}

function median(sortedAsc: readonly number[]): number {
  const n = sortedAsc.length;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sortedAsc[mid] as number;
  return ((sortedAsc[mid - 1] as number) + (sortedAsc[mid] as number)) / 2;
}

function buildHistogram(sortedSims: readonly number[]): SimilarityHistogramBucket[] {
  const buckets: SimilarityHistogramBucket[] = [];
  for (let i = 0; i < HISTOGRAM_BUCKET_COUNT; i++) {
    buckets.push({
      rangeStart: round4(i / HISTOGRAM_BUCKET_COUNT),
      rangeEnd: round4((i + 1) / HISTOGRAM_BUCKET_COUNT),
      count: 0,
    });
  }
  for (const v of sortedSims) {
    // Guard FP boundary jitter (e.g. 0.3 landing at 2.9999... after *10) and
    // clamp the top bucket to include exactly 1.0.
    const idx =
      v >= 1
        ? HISTOGRAM_BUCKET_COUNT - 1
        : Math.min(HISTOGRAM_BUCKET_COUNT - 1, Math.max(0, Math.floor(v * HISTOGRAM_BUCKET_COUNT + 1e-9)));
    (buckets[idx] as SimilarityHistogramBucket).count++;
  }
  return buckets;
}

function buildDistribution(sims: readonly number[]): SimilarityDistribution {
  if (sims.length === 0) {
    return { pairCount: 0, min: null, max: null, mean: null, median: null, histogram: buildHistogram([]) };
  }
  const sorted = [...sims].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    pairCount: sorted.length,
    min: sorted[0] as number,
    max: sorted[sorted.length - 1] as number,
    mean: round4(sum / sorted.length),
    median: round4(median(sorted)),
    histogram: buildHistogram(sorted),
  };
}

function buildSweep(
  sortedMembers: readonly CalibrationMember[],
  thresholds: readonly number[],
  weights: SimilarityWeights,
  sims: readonly number[],
): ThresholdSweepPoint[] {
  return thresholds.map((threshold) => {
    const { clusters } = clusterSignatures(sortedMembers, { threshold, weights });
    let largestClusterSize = 0;
    let singletonCount = 0;
    for (const c of clusters) {
      if (c.size > largestClusterSize) largestClusterSize = c.size;
      if (c.size === 1) singletonCount++;
    }
    let mergedPairCount = 0;
    for (const s of sims) {
      if (s >= threshold) mergedPairCount++;
    }
    return { threshold, clusterCount: clusters.length, largestClusterSize, singletonCount, mergedPairCount };
  });
}

interface PlateauRun {
  startIdx: number;
  endIdx: number;
  length: number;
}

/**
 * Longest run of consecutive sweep points sharing the same `clusterCount`.
 * Ties prefer the LATER (higher-threshold) run — the more conservative pick.
 */
function findWidestPlateau(sweep: readonly ThresholdSweepPoint[]): PlateauRun | null {
  if (sweep.length === 0) return null;

  let best: PlateauRun = { startIdx: 0, endIdx: 0, length: 1 };
  let runStart = 0;
  for (let i = 1; i <= sweep.length; i++) {
    const atBoundary =
      i === sweep.length ||
      (sweep[i] as ThresholdSweepPoint).clusterCount !== (sweep[i - 1] as ThresholdSweepPoint).clusterCount;
    if (atBoundary) {
      const runEnd = i - 1;
      const length = runEnd - runStart + 1;
      if (length > best.length || (length === best.length && runStart > best.startIdx)) {
        best = { startIdx: runStart, endIdx: runEnd, length };
      }
      runStart = i;
    }
  }
  return best;
}

/**
 * Compute a full calibration report for a population of recordings:
 * the pairwise `traceSimilarity` distribution, a threshold sweep through
 * `clusterSignatures`, and a deterministically-recommended threshold.
 *
 * Deterministic: input order never affects the result (members are sorted
 * by `id` before any arithmetic), and repeat calls on the same set produce a
 * byte-identical (deep-equal) report.
 */
export function calibrateThreshold(
  members: readonly CalibrationMember[],
  opts: CalibrationOptions = {},
): CalibrationReport {
  const min = opts.min ?? DEFAULT_MIN_THRESHOLD;
  const max = opts.max ?? DEFAULT_MAX_THRESHOLD;
  const step = opts.step ?? DEFAULT_THRESHOLD_STEP;
  const weights = opts.weights ?? DEFAULT_SIMILARITY_WEIGHTS;

  const thresholds = buildThresholdRange(min, max, step);
  const sortedMembers = [...members].sort((a, b) => asc(a.id, b.id));
  const memberCount = sortedMembers.length;

  const sims = computePairwiseSimilarities(sortedMembers, weights);
  const distribution = buildDistribution(sims);
  const sweep = buildSweep(sortedMembers, thresholds, weights, sims);

  let recommendedThreshold: number | null = null;
  let plateauRange: PlateauRange | null = null;
  let reason: string;

  if (memberCount < 2) {
    reason = `insufficient members for calibration (memberCount=${memberCount}; need >= 2 signatures to compute pairwise similarity)`;
  } else {
    const plateau = findWidestPlateau(sweep);
    if (!plateau) {
      reason = 'no plateau could be determined (unexpected empty sweep)';
    } else {
      const startPoint = sweep[plateau.startIdx] as ThresholdSweepPoint;
      const endPoint = sweep[plateau.endIdx] as ThresholdSweepPoint;
      recommendedThreshold = endPoint.threshold;
      plateauRange = {
        start: startPoint.threshold,
        end: endPoint.threshold,
        length: plateau.length,
        clusterCount: endPoint.clusterCount,
      };
      const wholeRangeNote =
        plateau.length === sweep.length
          ? ' The plateau spans the entire swept range — cluster count did not change across any tested threshold. This means the swept [min, max] window does not bracket a visible inflection point for this dataset; consider widening the range or gathering more recordings before locking in a production value.'
          : '';
      reason =
        `Selected the highest threshold (${recommendedThreshold}) within the widest stable plateau ` +
        `[${plateauRange.start}, ${plateauRange.end}] (${plateau.length} consecutive swept threshold(s), ` +
        `all producing clusterCount=${plateauRange.clusterCount}). A wider plateau means the clustering ` +
        `outcome is insensitive to small threshold changes in that range, which is the most defensible ` +
        `region to pick a production threshold from. Ties in plateau width are broken toward the higher ` +
        `(more conservative — fewer merges) threshold.${wholeRangeNote}`;
    }
  }

  return {
    version: CALIBRATION_VERSION,
    memberCount,
    params: { min, max, step, weights },
    distribution,
    sweep,
    recommendedThreshold,
    plateauRange,
    reason,
  };
}
