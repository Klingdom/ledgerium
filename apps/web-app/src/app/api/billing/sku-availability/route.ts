import { NextResponse } from 'next/server';
import { getOneTimePriceId, getPriceId } from '@/lib/stripe';
import { GUIDED_ONBOARDING_SKU, PROCESS_AUDIT_SKU } from '@/lib/service-skus';

/**
 * Subscription plans this endpoint reports availability for.
 *
 * SUBSCRIPTION_READINESS_001 §G1: Team and Growth are deliberately excluded.
 * They are blocked from self-serve checkout by
 * `BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD` in `checkout/route.ts` regardless
 * of whether a Stripe price is configured — that gate waits on the team data
 * layer, not on Stripe setup — and the pricing UI already routes them to a
 * waitlist mailto, never a live Checkout button. Starter and Solo are the
 * two tiers that render a real "buy" button today, so they are the two this
 * pre-check must cover. Fixed list, not derived from a caller-supplied
 * value — same secret-safety posture as the SKU list below.
 */
const PURCHASABLE_SUBSCRIPTION_PLANS = ['starter', 'solo'] as const;

/**
 * GET /api/billing/sku-availability
 *
 * Public, unauthenticated — returns whether each real service SKU (`data`)
 * and each self-serve subscription plan + interval combination (`plans`) is
 * currently configured for purchase (i.e. has a Stripe Price ID set in
 * production). Exposes no secrets: only booleans keyed by fixed, known lists
 * (never an arbitrary caller-supplied SKU or plan key, and never a price
 * ID itself).
 *
 * Extends the pre-existing service-SKU shape rather than standing up a
 * second endpoint (SUBSCRIPTION_READINESS_001 §G1) — "is this purchasable
 * thing configured?" is one concept whether the purchasable thing is a
 * one-time SKU or a subscription plan. `data` is untouched for existing
 * callers (`ServiceOfferCard`); `plans` is additive for the new subscription
 * consumers (`PricingCards`, the account page's plan switcher).
 *
 * `plans[plan][interval]` mirrors `getPriceId(plan, interval)` exactly —
 * that resolver IS the source of truth for whether Stripe can actually
 * charge for a given plan/interval. A plan may plausibly have monthly
 * configured without annual (or vice versa), so the two are reported
 * independently rather than collapsed into a single per-plan boolean. This
 * is the exact gap that shipped Solo with a live $89 button and no backing
 * price — see SUBSCRIPTION_READINESS_001.md §2 + §G1.
 *
 * Exists so purchase surfaces (`/pricing`, the account page) can show an
 * honest "not yet available" state — or hide the offer — BEFORE the
 * customer clicks, rather than letting them click into a dead-end 503 from
 * /api/billing/checkout. See docs/runbooks/STRIPE_SETUP.md § Service SKUs.
 */
export async function GET() {
  const plans: Record<string, { monthly: boolean; annual: boolean }> = {};
  for (const plan of PURCHASABLE_SUBSCRIPTION_PLANS) {
    plans[plan] = {
      monthly: getPriceId(plan, 'monthly') !== null,
      annual: getPriceId(plan, 'annual') !== null,
    };
  }

  return NextResponse.json({
    data: {
      [GUIDED_ONBOARDING_SKU]: getOneTimePriceId(GUIDED_ONBOARDING_SKU) !== null,
      [PROCESS_AUDIT_SKU]: getOneTimePriceId(PROCESS_AUDIT_SKU) !== null,
    },
    plans,
  });
}
