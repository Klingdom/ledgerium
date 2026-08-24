/**
 * Derives whether a self-serve subscription plan can show a live Stripe
 * Checkout button, from the raw `GET /api/billing/sku-availability`
 * response.
 *
 * SUBSCRIPTION_READINESS_001 §G1: the Solo tier shipped with a live $89
 * button and no backing Stripe price — `getPriceId('solo', interval)`
 * returned `null` and the click 503'd into an internal diagnostic string.
 * This module is the single, testable place that decides "should this plan
 * render a working button right now?" so `PricingCards` and the account
 * page's plan switcher can never disagree, and neither can silently regress
 * to always-available (the shape that produced the bug).
 *
 * `apps/web-app` has no jsdom/testing-library — pure module lifted out of
 * the components for the same reason as `mapCreateTeamError` /
 * `dashboardActionError` / `insightActions` / `mapCheckoutError`.
 */

export type BillingIntervalKey = 'monthly' | 'annual';

/** Shape of the `plans` field on the sku-availability response. */
export interface PlanAvailabilityResponse {
  plans?: Partial<Record<string, Partial<Record<BillingIntervalKey, boolean>>>>;
}

export type PlanAvailabilityState = 'loading' | 'available' | 'unavailable';

/**
 * `response === null` means the fetch has not resolved yet (or failed and
 * the caller chose to represent that as "still loading" rather than
 * "unavailable" — both are legitimate caller choices, this function does not
 * care which). Loading is NEVER 'available' — G1 requires no live button
 * before the server has actually confirmed the price ID is configured, so
 * there is no "assume available while loading" shortcut here.
 *
 * A missing plan entry, or a `false`/`undefined` value for the requested
 * interval, is 'unavailable' — fail closed, never fail open. This is what
 * makes it structurally impossible for an unconfigured plan to slip through
 * as available: any response shape this function has not explicitly been
 * told is `true` resolves to 'unavailable'.
 */
export function derivePlanAvailability(
  response: PlanAvailabilityResponse | null,
  planId: string,
  interval: BillingIntervalKey,
): PlanAvailabilityState {
  if (response === null) return 'loading';
  const entry = response.plans?.[planId];
  return entry?.[interval] === true ? 'available' : 'unavailable';
}
