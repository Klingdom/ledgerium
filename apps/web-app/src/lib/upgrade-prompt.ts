/**
 * When to record that an upgrade prompt was shown — row #238.
 *
 * ## The defect this exists to fix
 *
 * `analytics/product/page.tsx` computes a conversion funnel from
 * `plan_limit_hit → upgrade_prompt_viewed → upgrade_clicked → checkout_started
 * → subscription_created`.
 *
 * `upgrade_clicked` fires from four surfaces. `upgrade_prompt_viewed` fired
 * from **one** — team creation. So three quarters of the prompts the product
 * shows were never counted as shown, while every click on them was counted.
 *
 * The direction of that error is what makes it worth fixing urgently: a
 * denominator missing most of its impressions makes prompt-to-click look far
 * better than it is. An inflated conversion rate is the kind of number nobody
 * interrogates, and it feeds pricing decisions.
 *
 * ## Why a module rather than an inline `useEffect`
 *
 * Because the thing that can go wrong is the *counting rule*, and an inline
 * effect cannot be tested in this package — vitest runs on `environment: node`
 * with no React renderer. The rule is: fire once when a prompt appears, and
 * again only if it genuinely becomes a different prompt. Get that wrong in the
 * other direction and the denominator inflates on every re-render, which would
 * swing the funnel from flattering to flattering-in-reverse and be just as hard
 * to notice.
 *
 * ## What counts as a prompt
 *
 * Deliberately not everything that mentions upgrading. The pricing page's own
 * buttons are **not** instrumented: the funnel stage means "the product
 * interrupted someone with an upgrade prompt", and a page the user chose to
 * visit is a destination, not an interruption. That leaves `upgrade_clicked`
 * from `upgrade_button` without a matching view event, which is correct rather
 * than an oversight — the two should be compared per `location`, not in
 * aggregate.
 */

/** Identity of a prompt instance. Two prompts are the same iff both fields match. */
export interface UpgradePromptIdentity {
  /** Must match the `location` used by this surface's `upgrade_clicked`. */
  location: string;
  /** The plan that lifts the limit being hit. */
  plan: string;
}

/**
 * Should a view event be emitted, given what was last emitted for this surface?
 *
 * @param lastEmitted the identity last recorded, or null if nothing yet
 * @param current     the prompt now on screen, or null if none is shown
 */
export function shouldEmitPromptView(
  lastEmitted: UpgradePromptIdentity | null,
  current: UpgradePromptIdentity | null,
): boolean {
  if (current === null) return false;
  if (lastEmitted === null) return true;
  return lastEmitted.location !== current.location || lastEmitted.plan !== current.plan;
}

/**
 * The identity to remember after handling a render.
 *
 * When the prompt disappears this returns null, so the *next* appearance counts
 * again — a user who crosses the quota threshold, drops back under it and
 * crosses again has genuinely been prompted twice. Retaining the old identity
 * instead would silently undercount exactly the repeat-exposure case the funnel
 * is most interesting for.
 */
export function nextEmittedState(
  lastEmitted: UpgradePromptIdentity | null,
  current: UpgradePromptIdentity | null,
): UpgradePromptIdentity | null {
  if (current === null) return null;
  return shouldEmitPromptView(lastEmitted, current) ? current : lastEmitted;
}
