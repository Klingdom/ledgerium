/**
 * 5-value closed union for Team.subscription_status / User.subscription_status.
 *
 * Stripe enum has 7 values (active / trialing / past_due / canceled / unpaid /
 * incomplete / incomplete_expired). We normalize by collapsing
 * incomplete + incomplete_expired → 'unpaid' (per TEAM-P03.7 Sub-task 1).
 *
 * **Determinism contract** (Ledgerium core): same Stripe status string → byte-
 * identical normalized value. Pure function; zero `Date.now()` / `Math.random()`
 * / I/O.
 *
 * **Fail-closed**: unknown Stripe status values default to 'unpaid' to degrade
 * capability access (rather than silently granting unintended permissions).
 *
 * @iter 085 / TEAM-P03.7 Sub-task 1
 * @see apps/web-app/src/app/api/billing/webhook/route.ts (consumer)
 */

export type NormalizedSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

/**
 * Normalize a Stripe subscription.status to our 5-value closed union.
 *
 * Pure, deterministic; safe to call with any string. Unknown values default
 * to 'unpaid' to fail closed on downstream capability checks.
 *
 * @param stripeStatus - the raw `subscription.status` field from a Stripe event
 * @returns one of the 5 NormalizedSubscriptionStatus values
 */
export function normalizeStripeStatus(stripeStatus: string): NormalizedSubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'unpaid';
    default:
      // Unknown Stripe status — fail closed; treat as unpaid (degrades capability).
      return 'unpaid';
  }
}
