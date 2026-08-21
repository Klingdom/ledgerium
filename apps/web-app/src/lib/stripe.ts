/**
 * Stripe integration for Ledgerium AI subscriptions.
 *
 * Flow:
 * 1. User clicks upgrade → POST /api/billing/checkout with plan + interval
 * 2. Backend creates Stripe Checkout Session → redirects to Stripe
 * 3. User completes payment on Stripe-hosted checkout
 * 4. Stripe sends webhook → POST /api/billing/webhook
 * 5. Webhook handler resolves plan from price ID and updates user
 * 6. User can manage/cancel via POST /api/billing/portal
 *
 * @see FEATURE_GATING_DESIGN.md Section 5 for architecture details
 */

import Stripe from 'stripe';
import type { PlanType } from './plans';
import { GUIDED_ONBOARDING_SKU, PROCESS_AUDIT_SKU } from './service-skus';

let _stripe: Stripe | null = null;

/** Lazy-initialized Stripe client — only created when actually called. */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/**
 * @deprecated Use STRIPE_PRICES and planFromPriceId instead.
 * Kept for backward compat with legacy "pro" checkout sessions.
 */
export const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? '';

/** Stripe Price IDs for all paid tiers, monthly and annual. */
export const STRIPE_PRICES = {
  starter_monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? '',
  starter_annual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID ?? '',
  // Solo tier (REVENUE_PLAN_20K §6 Option B) — same empty-string-default
  // pattern as every other tier so a missing price ID degrades to the
  // existing "Billing not configured for this plan" 503 rather than
  // throwing at startup.
  solo_monthly: process.env.STRIPE_SOLO_MONTHLY_PRICE_ID ?? '',
  solo_annual: process.env.STRIPE_SOLO_ANNUAL_PRICE_ID ?? '',
  team_monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ?? '',
  team_annual: process.env.STRIPE_TEAM_ANNUAL_PRICE_ID ?? '',
  growth_monthly: process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID ?? '',
  growth_annual: process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID ?? '',
} as const;

/** Valid billing intervals. */
export type BillingInterval = 'monthly' | 'annual';

/** Valid paid plan types for checkout. */
export type PaidPlanType = 'starter' | 'solo' | 'team' | 'growth';

/**
 * Dynamic mapping from Stripe price ID → PlanType.
 * Built at module load from STRIPE_PRICES environment variables.
 * The legacy PRO_PRICE_ID is included for backward compatibility.
 */
export const STRIPE_PRICE_TO_PLAN: Record<string, PlanType> = {};

// Populate the price-to-plan map from configured environment variables.
for (const [key, priceId] of Object.entries(STRIPE_PRICES)) {
  if (priceId) {
    // "starter_monthly" → "starter", "team_annual" → "team", etc.
    const plan = key.replace(/_monthly$|_annual$/, '') as PlanType;
    STRIPE_PRICE_TO_PLAN[priceId] = plan;
  }
}
// Legacy: if PRO_PRICE_ID is set and not already mapped, map it to starter.
if (PRO_PRICE_ID && !STRIPE_PRICE_TO_PLAN[PRO_PRICE_ID]) {
  STRIPE_PRICE_TO_PLAN[PRO_PRICE_ID] = 'starter';
}

/**
 * Resolve a Stripe price ID to a PlanType.
 * Returns null for unmapped price IDs — callers that write to the database MUST
 * treat null as a hard error (re-throw / return 500) so Stripe retries rather
 * than silently under-provisioning the subscriber.
 *
 * Display-only callers that need a safe fallback should apply `?? 'starter'`
 * explicitly at the call site with a comment explaining the intent.
 */
export function planFromPriceId(priceId: string): PlanType | null {
  const plan = STRIPE_PRICE_TO_PLAN[priceId];
  if (plan === undefined) {
    console.warn(`[billing] planFromPriceId: unmapped price ID ${priceId}`);
    return null;
  }
  return plan;
}

/**
 * Look up the Stripe price ID for a given plan and billing interval.
 * Returns null if the price ID is not configured.
 */
export function getPriceId(plan: PaidPlanType, interval: BillingInterval): string | null {
  const key = `${plan}_${interval}` as keyof typeof STRIPE_PRICES;
  const priceId = STRIPE_PRICES[key];
  return priceId || null;
}

/**
 * Derive our BillingInterval ('monthly' | 'annual') from a live Stripe
 * subscription's actual `price.recurring.interval` ('day' | 'week' | 'month' | 'year').
 *
 * Reads directly off the Stripe subscription object — NOT inferred from our
 * env-configured STRIPE_PRICES key naming (`{plan}_monthly` / `{plan}_annual`).
 * Stripe's `recurring.interval` is the actual cadence Stripe bills on; our key
 * naming is a local convention that could drift from what is actually
 * configured for a given price in the Stripe Dashboard. This is the single
 * source used both at checkout.session.completed (via subscriptions.retrieve)
 * and at every subsequent customer.subscription.updated event, so a
 * subscription's persisted billing interval always reflects Stripe's own
 * billing state.
 *
 * Defaults to 'monthly' when `recurring.interval` is missing or not 'year' —
 * this covers `'month'` explicitly, and degrades safely for malformed/partial
 * subscription objects (e.g. incomplete test fixtures) by NOT inflating MRR:
 * an unrecognized interval is treated as the (lower, correct-or-conservative)
 * monthly price rather than silently applying the annual discount to an
 * unknown cadence.
 */
export function intervalFromStripeSubscription(
  subscription: Pick<Stripe.Subscription, 'items'>,
): BillingInterval {
  const recurringInterval = subscription.items?.data?.[0]?.price?.recurring?.interval;
  return recurringInterval === 'year' ? 'annual' : 'monthly';
}

/**
 * Returns the Stripe webhook signing secret.
 * Throws at call time if STRIPE_WEBHOOK_SECRET is absent so the webhook handler
 * returns HTTP 500 (triggering Stripe retry) rather than silently accepting
 * every request with an empty-string secret.
 *
 * Dev note: strict in all environments. Run `stripe listen --forward-to ...`
 * locally and set STRIPE_WEBHOOK_SECRET to the CLI-provided whsec_ value.
 */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return secret;
}

/** Base URL for redirects */
export const APP_URL = process.env.NEXTAUTH_URL ?? 'https://ledgerium.ai';

/**
 * Number of days for the free trial offered to first-time subscribers.
 *
 * Configurable via `STRIPE_TRIAL_DAYS` env var. Defaults to 14 if unset or
 * invalid (parseInt returns NaN on bad input → fall back to 14).
 *
 * The trial is applied at Checkout Session creation time only when the user
 * is a first-time subscriber (no prior `stripeSubscriptionId`). Returning
 * subscribers (cancelled-then-resubscribed) do NOT receive a second trial —
 * see `apps/web-app/src/app/api/billing/checkout/route.ts` for the eligibility
 * gate.
 *
 * Set to `0` to disable trials entirely.
 */
export const TRIAL_PERIOD_DAYS: number = (() => {
  const raw = process.env.STRIPE_TRIAL_DAYS;
  if (!raw) return 14;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 14;
})();

// ── 2026-08 monetization-shapes hardening ──────────────────────────────────
// CEO directive: "Get creative and setup stripe for all monetized use
// cases." The checkout layer previously only knew mode: 'subscription' with
// no promotion-code support, no tax handling, and no one-time payment path.
// The three constants/helpers below give the checkout route (and any future
// checkout-creating code) a shared, config-driven surface for all three,
// so adding capability later is an env var / map entry, not a rewrite.

/**
 * Parse a boolean-ish env var. Unset → `defaultValue`. Recognizes
 * 'true'/'1' as true and 'false'/'0' as false (case-insensitive,
 * whitespace-trimmed); anything else also falls back to `defaultValue`
 * rather than throwing — same fail-safe posture as TRIAL_PERIOD_DAYS above.
 */
function parseBooleanEnv(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return defaultValue;
}

/**
 * Whether Checkout Sessions should show Stripe's built-in "Add promotion
 * code" field (`allow_promotion_codes`). Configurable via
 * `STRIPE_ALLOW_PROMOTION_CODES`; defaults to **ON**.
 *
 * Defaulting ON is deliberate, not an oversight — see
 * docs/runbooks/STRIPE_SETUP.md § Promotion codes for the full reasoning.
 * Short version: `allow_promotion_codes: true` with zero promotion codes
 * configured in the Stripe Dashboard is inert (the field renders but there
 * is nothing to redeem); it requires no Dashboard setup to ship safely, and
 * the growth motion this unblocks (founder-led outbound, launch offers,
 * "free Team-tier review access" for third-party reviewers — see
 * docs/meta/REVENUE_PLAN_20K/growth_analysis.md §1) has no other way to
 * discount a Checkout Session at all today. The env var exists purely as an
 * operator-controlled kill switch, not because the default is risky.
 */
export const ALLOW_PROMOTION_CODES: boolean = parseBooleanEnv(
  process.env.STRIPE_ALLOW_PROMOTION_CODES,
  true,
);

/**
 * Whether Checkout Sessions should request Stripe Tax
 * (`automatic_tax.enabled`). Configurable via `STRIPE_AUTOMATIC_TAX_ENABLED`;
 * defaults to **OFF**.
 *
 * MUST stay opt-in, unlike `ALLOW_PROMOTION_CODES` above — enabling
 * automatic tax calculation without matching tax registrations configured
 * in the Stripe Dashboard makes Stripe reject the Checkout Session outright
 * (a hard checkout-creation error, not a graceful degrade), so this cannot
 * default to on the way promotion codes safely can. See
 * docs/runbooks/STRIPE_SETUP.md § Stripe Tax for what the Dashboard side of
 * turning this on requires before flipping the flag, and for why
 * `billing_address_collection` + `customer_update` (wired in
 * checkout/route.ts alongside this flag) both have to be set correctly too.
 */
export const AUTOMATIC_TAX_ENABLED: boolean = parseBooleanEnv(
  process.env.STRIPE_AUTOMATIC_TAX_ENABLED,
  false,
);

/**
 * One-time-payment SKU → Stripe Price ID map (`mode: 'payment'`, not
 * `mode: 'subscription'`). Same empty-string-default degrade pattern as
 * `STRIPE_PRICES` above: a missing/unset price ID resolves to `null` from
 * `getOneTimePriceId()`, and the checkout route turns that into the same
 * "Billing not configured" 503 every other unconfigured tier returns — it
 * never throws at startup and never blocks the subscription checkout path.
 *
 * `example_onboarding_audit` is a PLACEHOLDER, not a real product decision.
 * It exists only so the one-time-payment capability is concrete and
 * testable end-to-end. It is INERT — `getOneTimePriceId('example_onboarding_audit')`
 * returns `null` — unless `STRIPE_ONE_TIME_EXAMPLE_PRICE_ID` is explicitly
 * set, which nothing in this codebase does by default. Naming, pricing, and
 * whether to ever turn it on is a CEO product decision; see
 * docs/runbooks/STRIPE_SETUP.md § One-time payments and § Candidate SKUs.
 *
 * Adding a REAL one-time SKU later is additive: create the Stripe Price,
 * add one entry to this map (`your_sku_key: process.env.STRIPE_..._PRICE_ID ?? ''`),
 * set the env var. The checkout route and webhook handler do not change.
 *
 * `guided_onboarding` + `process_audit` (2026-08 service SKUs — SKU_SPEC_001)
 * are the first two REAL entries. Both follow the identical inert-until-
 * configured pattern as the placeholder above: unset the corresponding env
 * var and `getOneTimePriceId()` returns `null`, and checkout 503s exactly
 * like every unconfigured tier/SKU does — no code branch cares whether a SKU
 * is "real" or "placeholder", only whether its price ID resolves. Display
 * copy (name, price, deliverables) for both lives in `./service-skus.ts`,
 * NOT here — this map is Stripe wiring only. See
 * docs/runbooks/STRIPE_SETUP.md § Service SKUs for the Dashboard-side setup.
 */
export const ONE_TIME_PRICES: Record<string, string> = {
  example_onboarding_audit: process.env.STRIPE_ONE_TIME_EXAMPLE_PRICE_ID ?? '',
  [GUIDED_ONBOARDING_SKU]: process.env.STRIPE_GUIDED_ONBOARDING_PRICE_ID ?? '',
  [PROCESS_AUDIT_SKU]: process.env.STRIPE_PROCESS_AUDIT_PRICE_ID ?? '',
};

/**
 * Look up the Stripe price ID for a one-time-payment SKU key. Returns
 * `null` for an unknown key or a known key whose price ID is unconfigured —
 * callers should treat both the same way (503 "not configured"), since a
 * client can send any string here and the difference is not
 * security-relevant.
 */
export function getOneTimePriceId(sku: string): string | null {
  const priceId = ONE_TIME_PRICES[sku];
  return priceId || null;
}
