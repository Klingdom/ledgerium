/**
 * Row #416 — the dashboard's range wait. The list and `dashboard_v2_viewed` wait
 * for the stored time range, but never longer than RANGE_SETTLE_MAX_MS after the
 * workflows response (a hung preferences GET must not hold the rows).
 */

/** How the displayed range became trustworthy (closed set, mirrored in analytics.ts). */
export type RangeSettledBy = 'url' | 'stored' | 'failed' | 'user' | 'cap';

/** Longest the rows wait for the preferences answer, counted from the workflows response. */
export const RANGE_SETTLE_MAX_MS = 1000;

/**
 * Milliseconds between the workflows response and the settle: 0 when the range
 * settled first (or the response never came), else a rounded non-negative integer.
 */
export function rangeWaitMs(workflowsResponseAt: number | null, settledAt: number): number {
  if (workflowsResponseAt === null || settledAt <= workflowsResponseAt) return 0;
  return Math.round(settledAt - workflowsResponseAt);
}
