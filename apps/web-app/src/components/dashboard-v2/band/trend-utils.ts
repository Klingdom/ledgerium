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
