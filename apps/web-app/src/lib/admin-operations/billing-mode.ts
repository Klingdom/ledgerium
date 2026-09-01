/**
 * Is Stripe actually able to take real money right now?
 *
 * WHY THIS EXISTS
 * ---------------
 * A Stripe integration can be fully "working" — checkout opens, cards are
 * accepted, subscriptions appear — while running on a `sk_test_` key, in which
 * case it accepts only test cards and collects nothing. The product gave no
 * signal distinguishing that from real revenue. The only way to answer "are we
 * actually selling?" was to open the Stripe Dashboard and read a toggle.
 *
 * That blind spot is expensive in a specific way: every symptom of a healthy
 * integration is present, so nobody investigates. This surfaces the answer in
 * the admin dashboard next to MRR, where a zero that should be alarming can be
 * explained in one glance.
 *
 * SECRECY
 * -------
 * Only the key's PREFIX is inspected, and only a mode enum leaves this module.
 * No key, key fragment, or length is ever returned — the output is safe to
 * render in a UI and safe to log. The admin endpoint is already gated, but this
 * module does not rely on that gate for its safety.
 *
 * PURITY
 * ------
 * Takes an env-shaped argument rather than reading `process.env` at module
 * scope. That is deliberate: a module-scope env read in this codebase is
 * exactly what let Next.js freeze /api/billing/sku-availability at build time
 * and take checkout offline site-wide. Passing env in keeps this testable and
 * keeps the read at request time.
 */

/** Which Stripe environment the configured secret key belongs to. */
export type StripeMode = 'live' | 'test' | 'unconfigured' | 'unrecognized';

/** The plan/interval combinations that are self-serve purchasable today. */
export const SELLABLE_PRICE_ENV_KEYS = {
  starter_monthly: 'STRIPE_STARTER_MONTHLY_PRICE_ID',
  starter_annual: 'STRIPE_STARTER_ANNUAL_PRICE_ID',
  solo_monthly: 'STRIPE_SOLO_MONTHLY_PRICE_ID',
  solo_annual: 'STRIPE_SOLO_ANNUAL_PRICE_ID',
} as const;

export type SellableKey = keyof typeof SELLABLE_PRICE_ENV_KEYS;

export interface BillingModeReport {
  /** Which Stripe environment the key belongs to. */
  mode: StripeMode;
  /** True only when a live key is set AND a webhook secret is present. */
  canCollectRealPayments: boolean;
  /** Whether a webhook signing secret is configured at all. */
  webhookSecretConfigured: boolean;
  /** Per plan+interval: is a Stripe price ID configured? */
  pricesConfigured: Record<SellableKey, boolean>;
  /**
   * Plain-language findings, most severe first. Empty means nothing is wrong.
   * Written for a human reading a dashboard, not for machine parsing.
   */
  warnings: string[];
}

/** Minimal env shape this module needs. */
export type BillingEnv = Record<string, string | undefined>;

function isSet(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Classify the secret key by prefix alone.
 *
 * `unrecognized` is deliberately distinct from `unconfigured`. A key that is
 * present but matches no known prefix is more alarming than an absent one —
 * it suggests a truncated, wrapped, or wrong-variable value, which would fail
 * at charge time rather than at boot.
 */
export function classifyStripeKey(secretKey: string | undefined): StripeMode {
  if (!isSet(secretKey)) return 'unconfigured';
  const key = secretKey!.trim();
  // Restricted keys (rk_) carry the same live/test split as secret keys.
  if (key.startsWith('sk_live_') || key.startsWith('rk_live_')) return 'live';
  if (key.startsWith('sk_test_') || key.startsWith('rk_test_')) return 'test';
  return 'unrecognized';
}

/**
 * Build the full report. Pure: same env in, same report out.
 */
export function deriveBillingMode(env: BillingEnv): BillingModeReport {
  const mode = classifyStripeKey(env.STRIPE_SECRET_KEY);
  const webhookSecretConfigured = isSet(env.STRIPE_WEBHOOK_SECRET);

  const pricesConfigured = {} as Record<SellableKey, boolean>;
  for (const [key, envName] of Object.entries(SELLABLE_PRICE_ENV_KEYS) as Array<
    [SellableKey, string]
  >) {
    pricesConfigured[key] = isSet(env[envName]);
  }

  const anyPriceConfigured = Object.values(pricesConfigured).some(Boolean);
  const canCollectRealPayments = mode === 'live' && webhookSecretConfigured && anyPriceConfigured;

  const warnings: string[] = [];

  if (mode === 'unconfigured') {
    warnings.push('No Stripe secret key is configured. Checkout cannot run at all.');
  } else if (mode === 'unrecognized') {
    warnings.push(
      'The Stripe secret key does not start with a recognised prefix (sk_live_, sk_test_, rk_live_, rk_test_). It may be truncated or the wrong value — this fails at charge time, not at startup.',
    );
  } else if (mode === 'test') {
    warnings.push(
      'Stripe is in TEST mode. Checkout works and subscriptions appear, but only test cards are accepted and no real money is collected. Revenue figures on this page are not real.',
    );
  }

  if (!webhookSecretConfigured) {
    warnings.push(
      'No webhook signing secret is configured. Payments would succeed but subscriptions would never activate — customers would be charged and receive nothing.',
    );
  }

  if (!anyPriceConfigured) {
    warnings.push('No plan has a Stripe price ID configured, so nothing is purchasable.');
  } else {
    const missing = (Object.keys(pricesConfigured) as SellableKey[])
      .filter((k) => !pricesConfigured[k])
      .map((k) => k.replace('_', ' '));
    if (missing.length > 0) {
      warnings.push(`Not purchasable (no Stripe price configured): ${missing.join(', ')}.`);
    }
  }

  return { mode, canCollectRealPayments, webhookSecretConfigured, pricesConfigured, warnings };
}
