/**
 * dashboard-band-stats — pure, deterministic aggregate computations for the
 * Batch B top-of-page dashboard band.
 *
 * Every function here is a pure function of its inputs plus an injected
 * `referenceNowMs` clock boundary. There is NO `Date.now()` / `Math.random()`
 * / `new Date()`-of-now anywhere in this module — the caller (the workflows
 * route) passes the single per-request `referenceNowMs` boundary so the output
 * is byte-identical for identical inputs + clock. This mirrors the MDR-P03
 * single-upstream-clock-boundary contract enforced across the v2 surface.
 *
 * Honesty (ANALYTICS_DASHBOARD_REVIEW §6):
 *  - No fabricated values; every field maps to a real computed aggregate.
 *  - Median cycle time is across *workflow means*, not runs (labeled as such in UI).
 *  - activityByWeek covers workflow *recordings* (createdAt), not runs.
 *
 * @module dashboard-band-stats
 * @batch B (2026-06-12)
 */

import type { OpportunityTag } from './workflow-metrics.js';

// ── Opportunity distribution ───────────────────────────────────────────────────

export interface OpportunityCounts {
  automate: number;
  standardize: number;
  optimize: number;
  monitor: number;
  healthy: number;
}

/**
 * Count workflows by their canonical v2 `opportunityTag`. Deterministic over
 * the input order (counts are order-invariant). Unknown tags are ignored
 * (the closed union guarantees they cannot occur, but we are defensive).
 */
export function computeOpportunityCounts(
  tags: ReadonlyArray<OpportunityTag>,
): OpportunityCounts {
  const counts: OpportunityCounts = {
    automate: 0,
    standardize: 0,
    optimize: 0,
    monitor: 0,
    healthy: 0,
  };
  for (const tag of tags) {
    if (tag in counts) {
      counts[tag] += 1;
    }
  }
  return counts;
}

// ── Health band distribution ───────────────────────────────────────────────────

export interface HealthBandCounts {
  /** overall < 60 */
  poor: number;
  /** 60 <= overall < 80 */
  fair: number;
  /** overall >= 80 */
  good: number;
}

/**
 * Bucket per-workflow overall health scores into the 60/80 bands that match
 * `CommandHeader.healthBand`. Deterministic; order-invariant.
 */
export function computeHealthBandCounts(
  overallScores: ReadonlyArray<number>,
): HealthBandCounts {
  const counts: HealthBandCounts = { poor: 0, fair: 0, good: 0 };
  for (const score of overallScores) {
    if (score < 60) counts.poor += 1;
    else if (score < 80) counts.fair += 1;
    else counts.good += 1;
  }
  return counts;
}

// ── Median cycle time (across workflow means) ──────────────────────────────────

/**
 * Median of per-workflow `avgTimeMs` values, excluding nulls. Returns null when
 * no workflow has a cycle-time value (honest empty state). Deterministic — the
 * input is sorted internally, so order does not affect the result.
 *
 * Honesty: this is the median across *workflow means*, NOT across individual
 * runs (no per-run duration array exists — FEASIBILITY_DASHBOARD_REVIEW §0).
 */
export function computeMedianCycleTimeMs(
  avgTimeValues: ReadonlyArray<number | null>,
): number | null {
  const finite = avgTimeValues
    .filter((v): v is number => v != null && Number.isFinite(v))
    .slice()
    .sort((a, b) => a - b);
  if (finite.length === 0) return null;
  const mid = Math.floor(finite.length / 2);
  if (finite.length % 2 === 1) {
    return finite[mid]!;
  }
  // Even count — mean of the two central values, rounded to an integer ms.
  return Math.round((finite[mid - 1]! + finite[mid]!) / 2);
}

// ── Recorded-over-time weekly activity ─────────────────────────────────────────

export interface ActivityWeekBucket {
  /** ISO-8601 timestamp (UTC) of the start (inclusive) of the week bucket. */
  weekStartIso: string;
  /** Count of workflows whose createdAt falls within this week bucket. */
  count: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Bucket workflow `createdAt` timestamps into the trailing `weekCount` weekly
 * buckets ending at `referenceNowMs`. Buckets are anchored to `referenceNowMs`
 * (not a calendar week boundary) so the result is fully deterministic for a
 * fixed clock — the last bucket always ends at `referenceNowMs` and each bucket
 * spans exactly 7 days backward.
 *
 * Buckets are returned oldest-first. Each `weekStartIso` is the inclusive start
 * of the bucket; the bucket is `[weekStart, weekStart + 7d)`. A workflow at
 * exactly `referenceNowMs` lands in the final bucket.
 *
 * Workflows older than the window are excluded (this is a trailing-window
 * trend, by design). Determinism: pure function of (createdAtMs[], referenceNowMs,
 * weekCount).
 *
 * @param createdAtMs  per-workflow createdAt as epoch-ms
 * @param referenceNowMs single injected clock boundary (route.ts:433)
 * @param weekCount number of trailing weekly buckets (default 12)
 */
export function computeActivityByWeek(
  createdAtMs: ReadonlyArray<number>,
  referenceNowMs: number,
  weekCount = 12,
): ActivityWeekBucket[] {
  // The window starts at the beginning of the oldest bucket.
  const windowStartMs = referenceNowMs - weekCount * WEEK_MS;

  const buckets: ActivityWeekBucket[] = [];
  for (let i = 0; i < weekCount; i++) {
    const weekStartMs = windowStartMs + i * WEEK_MS;
    buckets.push({
      weekStartIso: new Date(weekStartMs).toISOString(),
      count: 0,
    });
  }

  for (const ts of createdAtMs) {
    // Exclude anything outside the trailing window.
    if (ts < windowStartMs || ts > referenceNowMs) continue;
    let idx = Math.floor((ts - windowStartMs) / WEEK_MS);
    // A workflow at exactly referenceNowMs would compute idx === weekCount; clamp
    // it into the final bucket (the window is inclusive of referenceNowMs).
    if (idx >= weekCount) idx = weekCount - 1;
    if (idx < 0) continue;
    buckets[idx]!.count += 1;
  }

  return buckets;
}

// ── SIGNALS batch (2026-06-16): at-a-glance honest-aggregate helpers ────────────
//
// CONSOLIDATED_20 #4 (High-Variance KPI tile), #7 (Tier-2 facts row + honest
// sparkline/delta). Every helper here is PURE and consumes only already-computed
// per-workflow engine output (`metricsV2.runs`) — NO new engine math, NO clock,
// NO randomness. The honesty discipline is enforced in code, not copy:
//  - the High-Variance denominator is the count of MULTI-RUN workflows (runs ≥ 2),
//    because variation is undefined for a single run (ANALYTICS_DASHBOARD_REVIEW
//    §2.2 — "gate the denominator to runs ≥ 2");
//  - when that denominator is 0 the tile reports an honest "needs ≥2 runs" state
//    rather than a fabricated 0;
//  - the sparkline period-over-period delta is emitted ONLY when a real prior
//    period exists (both halves of the trailing window carry data), else null.

/** Count of workflows with a confirmed multi-run history (runs ≥ 2). */
export function computeMultiRunCount(runsValues: ReadonlyArray<number | null>): number {
  let n = 0;
  for (const r of runsValues) {
    if (r != null && Number.isFinite(r) && r >= 2) n += 1;
  }
  return n;
}

/** Sum of observed runs across the library — the honest evidence denominator. */
export function computeTotalRuns(runsValues: ReadonlyArray<number | null>): number {
  let total = 0;
  for (const r of runsValues) {
    if (r != null && Number.isFinite(r) && r > 0) total += r;
  }
  return total;
}

/**
 * The honest at-a-glance state for the High-Variance KPI tile (#4).
 *
 * `available` is true ONLY when there is at least one multi-run workflow to form
 * an honest denominator. When false the tile must render a "—"/"needs ≥2 runs"
 * state — never a fabricated 0 against a zero denominator. `count` is the raw
 * `highVariationCount` (workflows with `variationLabel === 'high'`); it is clamped
 * to never exceed the multi-run denominator so the tile can never claim "5 of 3".
 */
export interface HighVarianceTileState {
  available: boolean;
  /** highVariationCount, clamped to ≤ multiRunCount (the honest denominator). */
  count: number;
  /** Count of multi-run (runs ≥ 2) workflows — the honest denominator. */
  multiRunCount: number;
}

export function buildHighVarianceTileState(
  highVariationCount: number,
  multiRunCount: number,
): HighVarianceTileState {
  if (multiRunCount <= 0) {
    return { available: false, count: 0, multiRunCount: 0 };
  }
  const safeHigh = Math.max(0, Math.floor(highVariationCount));
  return {
    available: true,
    count: Math.min(safeHigh, multiRunCount),
    multiRunCount,
  };
}

// ── Sparkline + period-over-period delta (honesty-gated) ───────────────────────

export interface SparklineState {
  /** Per-bucket counts, oldest-first — drives the tiny SVG polyline. */
  points: number[];
  /**
   * Period-over-period delta (recent-half total − prior-half total), emitted
   * ONLY when a real prior period exists. `null` ⇒ render "—", never a fabricated
   * trend. "A real prior period" means the trailing window splits into two equal
   * halves AND the prior half carries at least one recording (otherwise there is
   * no baseline to compare against — degenerate-case honesty).
   */
  delta: number | null;
  /** Sum of the most-recent bucket — the "recorded this week" pulse (deterministic). */
  recentCount: number;
}

/**
 * Derive the tiny-sparkline points + an honest period-over-period delta from the
 * SAME pre-computed `activityByWeek` buckets the route emits from its single
 * `referenceNowMs` boundary. Pure + deterministic; no clock, no randomness.
 *
 * The delta compares the recent half of the window against the prior half. It is
 * null (→ "—") when there are too few buckets to split, or when the prior half is
 * empty (no baseline). This guarantees we never render a fabricated trend.
 */
export function buildSparklineState(
  buckets: ReadonlyArray<ActivityWeekBucket>,
): SparklineState {
  const points = buckets.map((b) => b.count);
  const recentCount = points.length > 0 ? points[points.length - 1]! : 0;

  // Need at least 2 buckets to define any prior period at all.
  if (points.length < 2) {
    return { points, delta: null, recentCount };
  }

  const mid = Math.floor(points.length / 2);
  const priorHalf = points.slice(0, mid);
  const recentHalf = points.slice(mid);
  const priorTotal = priorHalf.reduce((s, n) => s + n, 0);
  const recentTotal = recentHalf.reduce((s, n) => s + n, 0);

  // Honesty gate: no baseline in the prior half ⇒ no honest delta.
  if (priorTotal === 0) {
    return { points, delta: null, recentCount };
  }

  return { points, delta: recentTotal - priorTotal, recentCount };
}
