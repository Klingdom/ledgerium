/**
 * Failure messages for user-initiated dashboard actions.
 *
 * WHY THIS EXISTS
 * ---------------
 * Five actions on the dashboard swallowed failures entirely. Their own source
 * comments said so: "Silently fail", "Endpoint may not exist yet",
 * "non-fatal". The user clicked, the spinner stopped, and nothing else
 * happened — indistinguishable from an action that succeeded and found
 * nothing to do.
 *
 * `handleToggleTag` was worse than silent: it never checked `res.ok` and
 * emitted a `tag_assigned` / `tag_removed` analytics event unconditionally,
 * so a failed request still recorded that the tag had been applied. That is a
 * false entry in the product analytics this business is meant to steer by.
 *
 * Extracted as a pure module because `apps/web-app` has no jsdom or
 * testing-library (verified 2026-08-21) — the codebase's established pattern
 * is to lift decision logic out of components rather than render them in
 * tests. See `mapCreateTeamError` and `insightActions`.
 */

export type DashboardAction =
  | 'run_analysis'
  | 'create_tag'
  | 'toggle_tag'
  | 'load_sample'
  | 'load_variants_demo';

/**
 * Default copy per action. Each names what failed in the user's terms and
 * what state the app is now in — never a bare "Something went wrong", which
 * tells the user nothing they can act on.
 */
const DEFAULTS: Record<DashboardAction, string> = {
  run_analysis: 'Analysis could not be completed — your workflows are unchanged.',
  create_tag: 'Could not create that tag — please try again.',
  // States the outcome explicitly: the user watched a checkbox move, so they
  // need to know the change did not stick.
  toggle_tag: 'Could not update that tag — the change was not saved.',
  load_sample: 'Could not load the sample workflow — please try again.',
  load_variants_demo: 'Could not load the variants demo — please try again.',
};

/**
 * Prefer the API's own message when it is a usable string, otherwise fall back
 * to action-specific copy. Never returns empty — silence is the bug being
 * fixed here.
 */
export function dashboardActionError(action: DashboardAction, apiError?: unknown): string {
  if (typeof apiError === 'string' && apiError.trim().length > 0) {
    return apiError;
  }
  return DEFAULTS[action];
}
