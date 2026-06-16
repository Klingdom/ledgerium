/**
 * trend-utils — pure helpers for RecordedTrendChart, extracted so they are unit-
 * testable in a node environment without importing recharts (which pulls browser
 * APIs and cannot load under vitest node-env — see admin TimeSeriesChart.test.ts).
 *
 * @batch B (2026-06-12)
 */

import type { ActivityWeekBucket } from '@/lib/dashboard-band-stats.js';

/** Format a week-start ISO timestamp to a short "MMM D" tick. Deterministic (UTC). */
export function formatWeekTick(weekStartIso: string): string {
  const d = new Date(weekStartIso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Total recordings across the window — drives the < 3 suppression rule. */
export function totalRecorded(data: ReadonlyArray<ActivityWeekBucket>): number {
  return data.reduce((sum, b) => sum + b.count, 0);
}

/**
 * Whether the trend chart should be suppressed (honesty guardrail): no data or
 * fewer than 3 total recordings → show an activation prompt instead of a slope.
 */
export function shouldSuppressTrend(data: ReadonlyArray<ActivityWeekBucket>): boolean {
  return data.length === 0 || totalRecorded(data) < 3;
}

/**
 * Compute integer Y-axis ticks for the recorded-per-week bar chart.
 *
 * The recharts auto-domain produces fractional / uneven ticks on small integer
 * counts (e.g. a max of 3 yields ticks like 0, 0.75, 1.5, 2.25, 3). Recordings
 * are whole numbers, so the axis must use whole-number ticks only. This returns
 * a small, evenly-spaced set of integer ticks from 0 to the rounded-up max.
 *
 * Rules (deterministic, no Date/random):
 *   - max ≤ 0  → [0, 1] (a flat baseline with a single unit headroom)
 *   - max ≤ 5  → every integer 0..max (so each bar height is readable)
 *   - max > 5  → 0, the max, and an evenly-spaced middle integer (≤ 5 ticks),
 *     deduped, so the axis stays uncluttered on tall counts.
 *
 * The returned array is suitable for both the YAxis `ticks` and the upper bound
 * of an explicit `domain={[0, maxTick]}` so recharts never injects a fractional
 * tick of its own.
 */
export function computeYTicks(data: ReadonlyArray<ActivityWeekBucket>): number[] {
  const max = data.reduce((m, b) => (b.count > m ? b.count : m), 0);
  if (max <= 0) return [0, 1];
  if (max <= 5) {
    return Array.from({ length: max + 1 }, (_, i) => i);
  }
  // Larger ranges: 0, midpoint (rounded), and max — keep ≤ 5 distinct ticks.
  const mid = Math.round(max / 2);
  const ticks = [0, mid, max];
  // Dedupe while preserving ascending order.
  return Array.from(new Set(ticks)).sort((a, b) => a - b);
}

/**
 * Whether the Y-axis domain is degenerate (max count ≤ 1) and should not render
 * a Y-axis at all.
 *
 * With a max of 0 or 1 there is no meaningful vertical scale — the only honest
 * tick set is "0 / 1", and rendering an axis there invites the repeated-label
 * artifact the COMPETITIVE review flagged ("3 / 3 / 3"). When degenerate, the
 * chart hides the Y-axis entirely (the bars + tooltip still communicate the
 * count) rather than drawing a misleading or redundant scale.
 *
 * Deterministic; reads only the pre-computed bucket counts (no clock/random).
 */
export function isDegenerateYDomain(data: ReadonlyArray<ActivityWeekBucket>): boolean {
  const max = data.reduce((m, b) => (b.count > m ? b.count : m), 0);
  return max <= 1;
}
