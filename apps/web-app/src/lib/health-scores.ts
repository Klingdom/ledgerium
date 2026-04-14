/**
 * Deterministic workflow health scoring for Ledgerium AI.
 *
 * Computes a 0–100 health score broken down into four equally-weighted
 * sub-dimensions (each 0–25). All computation is pure and stateless —
 * the same inputs always produce the same outputs.
 *
 * @see TIER_FEATURE_ROADMAP.md — healthScores feature (Starter+)
 */

/** Full health score breakdown for a single workflow. */
export interface HealthScore {
  /** Aggregate score: sum of all four sub-scores (0–100). */
  overall: number;
  /** Sufficient step count signals a well-captured process (0–25). */
  completeness: number;
  /** Confidence of extraction/detection (0–25). */
  confidence: number;
  /** Whether the recorded duration falls within a reasonable process window (0–25). */
  duration: number;
  /** Whether the phase structure is neither too thin nor too fragmented (0–25). */
  complexity: number;
}

// ── Thresholds ────────────────────────────────────────────────────────────────

/** Minimum step count to earn full completeness points. */
const COMPLETENESS_FULL_AT_STEPS = 3;

/** Duration (ms) lower bound for the "reasonable" range. */
const DURATION_IDEAL_MIN_MS = 30_000;      // 30 s
/** Duration (ms) upper bound for the "reasonable" range. */
const DURATION_IDEAL_MAX_MS = 1_800_000;   // 30 min
/** Duration (ms) below which only a floor score is awarded. */
const DURATION_FLOOR_BELOW_MS = 10_000;    // 10 s
/** Duration (ms) above which only a floor score is awarded. */
const DURATION_FLOOR_ABOVE_MS = 3_600_000; // 60 min
/** Score awarded for durations outside the acceptable range. */
const DURATION_FLOOR_SCORE = 5;
/** Max sub-score for any dimension. */
const MAX_SUB_SCORE = 25;

// ── Sub-score functions ───────────────────────────────────────────────────────

/**
 * Completeness sub-score (0–25).
 *
 * stepCount >= 3 → full 25 points.
 * stepCount < 3  → proportional (stepCount / 3) * 25, floored at 0.
 */
function scoreCompleteness(stepCount: number | null): number {
  if (stepCount == null || stepCount <= 0) return 0;
  if (stepCount >= COMPLETENESS_FULL_AT_STEPS) return MAX_SUB_SCORE;
  return Math.round((stepCount / COMPLETENESS_FULL_AT_STEPS) * MAX_SUB_SCORE);
}

/**
 * Confidence sub-score (0–25).
 *
 * confidence is a 0–1 float; multiply by 25 and round.
 */
function scoreConfidence(confidence: number | null): number {
  if (confidence == null) return 0;
  const clamped = Math.max(0, Math.min(1, confidence));
  return Math.round(clamped * MAX_SUB_SCORE);
}

/**
 * Duration reasonability sub-score (0–25).
 *
 * - Ideal range (30 s – 30 min): 25 points.
 * - Below 10 s or above 60 min: 5 points.
 * - 10 s – 30 s: linear interpolation from 5 → 25.
 * - 30 min – 60 min: linear interpolation from 25 → 5.
 */
function scoreDuration(durationMs: number | null): number {
  if (durationMs == null) return 0;

  // Ideal window
  if (durationMs >= DURATION_IDEAL_MIN_MS && durationMs <= DURATION_IDEAL_MAX_MS) {
    return MAX_SUB_SCORE;
  }

  // Too short — below 10 s
  if (durationMs < DURATION_FLOOR_BELOW_MS) {
    return DURATION_FLOOR_SCORE;
  }

  // Too long — above 60 min
  if (durationMs > DURATION_FLOOR_ABOVE_MS) {
    return DURATION_FLOOR_SCORE;
  }

  // Ramp up: 10 s → 30 s (floor → full)
  if (durationMs < DURATION_IDEAL_MIN_MS) {
    const range = DURATION_IDEAL_MIN_MS - DURATION_FLOOR_BELOW_MS;
    const position = durationMs - DURATION_FLOOR_BELOW_MS;
    const scoreRange = MAX_SUB_SCORE - DURATION_FLOOR_SCORE;
    return Math.round(DURATION_FLOOR_SCORE + (position / range) * scoreRange);
  }

  // Ramp down: 30 min → 60 min (full → floor)
  const range = DURATION_FLOOR_ABOVE_MS - DURATION_IDEAL_MAX_MS;
  const position = durationMs - DURATION_IDEAL_MAX_MS;
  const scoreRange = MAX_SUB_SCORE - DURATION_FLOOR_SCORE;
  return Math.round(MAX_SUB_SCORE - (position / range) * scoreRange);
}

/**
 * Complexity balance sub-score (0–25).
 *
 * - phaseCount 2–8: 25 points (optimal range).
 * - phaseCount 1: 10 points.
 * - phaseCount > 8: scales down linearly; 0 at phaseCount >= 24 (arbitrary upper ceiling).
 * - phaseCount 0 or null: 0 points.
 */
function scoreComplexity(phaseCount: number | null): number {
  if (phaseCount == null || phaseCount <= 0) return 0;
  if (phaseCount === 1) return 10;
  if (phaseCount >= 2 && phaseCount <= 8) return MAX_SUB_SCORE;

  // phaseCount > 8: linear decay — hits 0 at 24 phases.
  const UPPER_CEILING = 24;
  if (phaseCount >= UPPER_CEILING) return 0;
  const decay = (phaseCount - 8) / (UPPER_CEILING - 8);
  return Math.round(MAX_SUB_SCORE * (1 - decay));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute a deterministic health score for a workflow.
 *
 * All four sub-scores are 0–25; overall is their sum (0–100).
 * Passing all-null inputs returns { overall: 0, ... }.
 *
 * @param workflow - Scalar workflow fields required for scoring.
 * @returns HealthScore with overall and four sub-scores.
 */
export function computeHealthScore(workflow: {
  stepCount: number | null;
  confidence: number | null;
  durationMs: number | null;
  phaseCount: number | null;
}): HealthScore {
  const completeness = scoreCompleteness(workflow.stepCount);
  const confidence = scoreConfidence(workflow.confidence);
  const duration = scoreDuration(workflow.durationMs);
  const complexity = scoreComplexity(workflow.phaseCount);

  return {
    overall: completeness + confidence + duration + complexity,
    completeness,
    confidence,
    duration,
    complexity,
  };
}
