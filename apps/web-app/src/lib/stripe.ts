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
  team_monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ?? '',
  team_annual: process.env.STRIPE_TEAM_ANNUAL_PRICE_ID ?? '',
  growth_monthly: process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID ?? '',
  growth_annual: process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID ?? '',
} as const;

/** Valid billing intervals. */
export type BillingInterval = 'monthly' | 'annual';

/** Valid paid plan types for checkout. */
export type PaidPlanType = 'starter' | 'team' | 'growth';

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
