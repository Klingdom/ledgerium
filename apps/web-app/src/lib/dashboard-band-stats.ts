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
