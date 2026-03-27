/**
 * Pure mathematical utilities for the intelligence engine.
 *
 * All functions are deterministic: same input → same output.
 * No side effects, no randomness, no external dependencies.
 */

/** Arithmetic mean. Returns null for empty arrays. */
export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Returns a sorted copy (ascending). Does not mutate the input. */
export function sortedAsc(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

/** Median. Returns null for empty arrays. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = sortedAsc(values);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/**
 * p-th percentile (0–100). Uses nearest-rank method.
 * Returns null for empty arrays.
 */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = sortedAsc(values);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.max(0, Math.min(rank - 1, sorted.length - 1))]!;
}

/**
 * Population standard deviation.
 * Returns null for fewer than 2 values.
 */
export function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values);
  if (m === null) return null;
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Coefficient of variation = stdDev / mean.
 * Returns null for fewer than 2 values or when mean is 0.
 * A dimensionless measure of relative variability.
 */
export function coefficientOfVariation(values: number[]): number | null {
  const m = mean(values);
  if (m === null || m === 0) return null;
  const sd = stdDev(values);
  if (sd === null) return null;
  return sd / m;
}
