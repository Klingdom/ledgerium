/**
 * Pure state transitions for the Process Intelligence page's insight actions.
 *
 * Extracted so they can be tested directly. `apps/web-app` has no
 * testing-library or jsdom dependency (verified 2026-08-21), so the codebase's
 * established pattern is to lift decision logic out of components rather than
 * render them in tests — see `mapCreateTeamError` and `deriveQuotaState`.
 *
 * WHY THIS EXISTS
 * ---------------
 * `dismissInsight` previously did not check `res.ok` at all and removed the
 * insight from local state unconditionally. A failed PATCH therefore left the
 * insight visually gone while it remained `dismissed: false` in the database —
 * it silently reappeared on the next load, and the UI had asserted something
 * that never happened.
 *
 * The fix is an optimistic update with a real rollback. These helpers make the
 * "apply" half testable; the rollback half is restoring the snapshot this
 * function was derived from, which the round-trip test below pins.
 */

/** The subset of the analytics payload these transitions touch. */
export interface DismissibleInsightState {
  readonly insights: ReadonlyArray<{ readonly id: string }>;
  readonly totalInsights: number;
}

/**
 * Remove one insight and decrement the count.
 *
 * Returns a NEW object — the caller keeps the previous reference as its
 * rollback snapshot, so this must never mutate its input.
 */
export function applyInsightDismissal<T extends DismissibleInsightState>(data: T, id: string): T {
  const remaining = data.insights.filter((i) => i.id !== id);

  // Only decrement if something was actually removed. Dismissing an id that is
  // not present (double-click, stale render) must not drive the counter
  // negative or out of step with the list.
  const removedCount = data.insights.length - remaining.length;

  return {
    ...data,
    insights: remaining,
    totalInsights: Math.max(0, data.totalInsights - removedCount),
  };
}

/** Message shown when a user-initiated analytics action fails. */
export function analyticsActionErrorMessage(
  action: 'run_analysis' | 'dismiss_insight',
  apiError?: unknown,
): string {
  if (action === 'dismiss_insight') {
    // Always states the restoration, because the user just watched the row
    // disappear — silence here would leave them unsure what the app now believes.
    return 'Could not dismiss that insight — it has been restored.';
  }
  return typeof apiError === 'string' && apiError.trim().length > 0
    ? apiError
    : 'Analysis could not be completed — please try again.';
}
