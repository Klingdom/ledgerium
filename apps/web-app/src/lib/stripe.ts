/**
 * Stripe integration for Ledgerium AI Pro subscriptions.
 *
 * Flow:
 * 1. User clicks "Upgrade to Pro" → POST /api/billing/checkout
 * 2. Backend creates Stripe Checkout Session → redirects to Stripe
 * 3. User completes payment on Stripe-hosted checkout
 * 4. Stripe sends webhook → POST /api/billing/webhook
 * 5. Webhook handler updates user plan/status in database
 * 6. User can manage/cancel via POST /api/billing/portal
 */

import Stripe from 'stripe';

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

/** The Stripe Price ID for the Pro monthly subscription */
export const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? '';

/** The Stripe webhook signing secret */
export const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

/** Base URL for redirects */
export const APP_URL = process.env.NEXTAUTH_URL ?? 'https://ledgerium.ai';
