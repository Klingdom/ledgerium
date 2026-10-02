/**
 * When a dashboard visit counts as a bounce, and when to record it — row #242.
 *
 * ## Why the trigger lives here, not just the predicate
 *
 * The decision logic was already extracted — into `DashboardV2Shell.test.tsx`,
 * as a copy, under a docstring reading "Logic **mirrors** DashboardV2Shell's
 * handleBeforeUnload". Nine tests passed against that copy while the real
 * handler was registered on `beforeunload`, which iOS Safari and Chrome on
 * Android routinely never fire. So on mobile the bounce event was never
 * produced, and nine green tests could not see it, because **the trigger was
 * the part that was not mirrored**.
 *
 * That is why `BOUNCE_TRIGGER` is exported from here and consumed by the
 * component, rather than being a string typed at the call site. The thing that
 * was wrong is now part of the tested surface.
 *
 * ## Why `pagehide` and not the alternatives
 *
 * - `beforeunload` — what this used to be. Unreliable on mobile by design; the
 *   platform treats it as a legacy affordance for "are you sure you want to
 *   leave" prompts, and discards pages without firing it.
 * - `visibilitychange` → hidden — reliable, and what row #241 correctly used
 *   for *delivery*. Wrong for *emission*: it fires on every tab switch and app
 *   switch, and glancing at another tab is not a bounce. Using it here would
 *   have swapped an undercount for an overcount.
 * - `pagehide` — fires when the page is actually being navigated away from or
 *   discarded, including into the back/forward cache, and is reliable on
 *   mobile. It means "leaving", which is what a bounce is.
 *
 * The distinction between the two reliable options is the whole reason this
 * needed thought rather than a find-and-replace from the previous row.
 */

/**
 * The page-lifecycle event the bounce emitter listens on.
 *
 * Exported so the choice is testable and so the component cannot quietly
 * disagree with the reasoning above.
 */
export const BOUNCE_TRIGGER = 'pagehide' as const;

/** What the emitter needs to know about the visit so far. */
export interface BounceContext {
  /** Did `dashboard_v2_viewed` fire this mount? No view, no bounce to report. */
  viewFired: boolean;
  /** Tracked click interactions since the view fired. */
  clickCount: number;
}

/**
 * Is this visit a bounce?
 *
 * A bounce is a page that was seen and not acted on. Both halves matter: a
 * page that never finished loading is not a bounce the user is responsible
 * for, and a page that was clicked is not a bounce at all.
 */
export function shouldEmitBounce({ viewFired, clickCount }: BounceContext): boolean {
  if (!viewFired) return false;
  return clickCount === 0;
}

/**
 * How long the visit lasted, in milliseconds.
 *
 * Returns 0 when the view timestamp was never set, rather than a negative or
 * nonsensical duration — an unmeasurable visit reports as zero rather than as
 * a wrong number, which is the same choice the rest of this codebase makes
 * about unknown values.
 */
export function bounceElapsedMs(viewTimestampMs: number, nowMs: number): number {
  if (viewTimestampMs <= 0) return 0;
  return Math.max(0, Math.round(nowMs - viewTimestampMs));
}

/**
 * Should `dashboard_v2_viewed` be emitted for this load outcome? — row #250.
 *
 * It used to fire on the error path too, so a failed load counted as a view
 * indistinguishable from a genuine empty state, deflating every per-view rate
 * (bounce, chip-click). A failed load is not a view. The caller must treat
 * `alreadyFired` as the once-per-mount guard and leave it unset on error, so a
 * successful retry still produces the single view.
 */
export function shouldEmitDashboardView({
  isError,
  alreadyFired,
}: {
  isError: boolean;
  alreadyFired: boolean;
}): boolean {
  return !isError && !alreadyFired;
}
