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
 * Falls back to 'starter' for unknown IDs (safe default for paid subscriptions).
 */
export function planFromPriceId(priceId: string): PlanType {
  return STRIPE_PRICE_TO_PLAN[priceId] ?? 'starter';
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

/** The Stripe webhook signing secret */
export const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

/** Base URL for redirects */
export const APP_URL = process.env.NEXTAUTH_URL ?? 'https://ledgerium.ai';
