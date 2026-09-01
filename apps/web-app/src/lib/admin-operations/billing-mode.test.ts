/**
 * The failure this guards against is silent: a test-mode key produces a
 * Stripe integration where every symptom looks healthy — checkout opens,
 * subscriptions appear — while collecting no money. So the tests care most
 * about the cases where something is wrong but LOOKS fine.
 *
 * The secrecy assertions matter as much as the logic ones. This report is
 * rendered in a UI and may be logged, so a key must never be able to reach
 * the output, including via a warning string.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyStripeKey,
  deriveBillingMode,
  SELLABLE_PRICE_ENV_KEYS,
  type BillingEnv,
} from './billing-mode';

const FAKE_LIVE = 'sk_live_' + 'A'.repeat(24);
const FAKE_TEST = 'sk_test_' + 'B'.repeat(24);

function envWith(overrides: BillingEnv = {}): BillingEnv {
  return {
    STRIPE_SECRET_KEY: FAKE_LIVE,
    STRIPE_WEBHOOK_SECRET: 'whsec_fake',
    STRIPE_STARTER_MONTHLY_PRICE_ID: 'price_sm',
    STRIPE_STARTER_ANNUAL_PRICE_ID: 'price_sa',
    STRIPE_SOLO_MONTHLY_PRICE_ID: 'price_om',
    STRIPE_SOLO_ANNUAL_PRICE_ID: 'price_oa',
    ...overrides,
  };
}

describe('classifyStripeKey', () => {
  it('recognises live and test secret keys', () => {
    expect(classifyStripeKey(FAKE_LIVE)).toBe('live');
    expect(classifyStripeKey(FAKE_TEST)).toBe('test');
  });

  it('recognises restricted keys, which carry the same live/test split', () => {
    expect(classifyStripeKey('rk_live_xxx')).toBe('live');
    expect(classifyStripeKey('rk_test_xxx')).toBe('test');
  });

  it('treats absent, empty, and whitespace-only as unconfigured', () => {
    expect(classifyStripeKey(undefined)).toBe('unconfigured');
    expect(classifyStripeKey('')).toBe('unconfigured');
    expect(classifyStripeKey('   ')).toBe('unconfigured');
  });

  it('distinguishes a malformed key from a missing one', () => {
    // A present-but-wrong value is more dangerous than an absent one: it fails
    // at charge time rather than at startup, so it must not be reported as
    // simply "unconfigured".
    expect(classifyStripeKey('pk_live_publishable')).toBe('unrecognized');
    expect(classifyStripeKey('sk_')).toBe('unrecognized');
    expect(classifyStripeKey('garbage')).toBe('unrecognized');
  });

  it('does not mistake a live-looking substring elsewhere in the key', () => {
    expect(classifyStripeKey('sk_test_sk_live_confusing')).toBe('test');
  });
});

describe('deriveBillingMode — the healthy case', () => {
  it('reports live collection only when key, webhook, and a price are all present', () => {
    const r = deriveBillingMode(envWith());
    expect(r.mode).toBe('live');
    expect(r.canCollectRealPayments).toBe(true);
    expect(r.warnings).toEqual([]);
  });
});

describe('deriveBillingMode — problems that still look healthy', () => {
  it('test mode cannot collect real payments, however complete the rest is', () => {
    const r = deriveBillingMode(envWith({ STRIPE_SECRET_KEY: FAKE_TEST }));
    expect(r.mode).toBe('test');
    expect(r.canCollectRealPayments).toBe(false);
    expect(r.warnings.join(' ')).toMatch(/TEST mode/);
    // The dashboard shows MRR beside this; the warning has to say the number
    // is not real, or an operator will read test revenue as revenue.
    expect(r.warnings.join(' ')).toMatch(/not real/i);
  });

  it('a live key with no webhook secret is called out as charge-but-deliver-nothing', () => {
    const r = deriveBillingMode(envWith({ STRIPE_WEBHOOK_SECRET: undefined }));
    expect(r.canCollectRealPayments).toBe(false);
    expect(r.webhookSecretConfigured).toBe(false);
    expect(r.warnings.join(' ')).toMatch(/charged and receive nothing/i);
  });

  it('names exactly which plan/interval combinations are unpurchasable', () => {
    const r = deriveBillingMode(
      envWith({
        STRIPE_SOLO_MONTHLY_PRICE_ID: undefined,
        STRIPE_SOLO_ANNUAL_PRICE_ID: '',
      }),
    );
    expect(r.pricesConfigured.solo_monthly).toBe(false);
    expect(r.pricesConfigured.solo_annual).toBe(false);
    expect(r.pricesConfigured.starter_monthly).toBe(true);
    const joined = r.warnings.join(' ');
    expect(joined).toMatch(/solo monthly/);
    expect(joined).toMatch(/solo annual/);
    expect(joined).not.toMatch(/starter/);
  });

  it('a live key with no prices at all cannot collect, and says so', () => {
    const r = deriveBillingMode(
      envWith({
        STRIPE_STARTER_MONTHLY_PRICE_ID: undefined,
        STRIPE_STARTER_ANNUAL_PRICE_ID: undefined,
        STRIPE_SOLO_MONTHLY_PRICE_ID: undefined,
        STRIPE_SOLO_ANNUAL_PRICE_ID: undefined,
      }),
    );
    expect(r.canCollectRealPayments).toBe(false);
    expect(r.warnings.join(' ')).toMatch(/nothing is purchasable/i);
  });

  it('reports multiple independent problems rather than only the first', () => {
    const r = deriveBillingMode({});
    expect(r.mode).toBe('unconfigured');
    expect(r.warnings.length).toBeGreaterThanOrEqual(3);
  });
});

describe('deriveBillingMode — secrecy', () => {
  it('never leaks the key, or any fragment of it, anywhere in the output', () => {
    const serialized = JSON.stringify(deriveBillingMode(envWith()));
    expect(serialized).not.toContain(FAKE_LIVE);
    expect(serialized).not.toContain('whsec_fake');
    // Guard the prefix too — even "sk_live_" appearing in output would be a
    // step toward rendering key material in a UI.
    expect(serialized).not.toContain('sk_live_');
    expect(serialized).not.toContain('sk_test_');
  });

  it('does not leak a malformed key while warning about it', () => {
    // The malformed-key branch is the tempting place to echo the value back
    // "to help debugging". It must not.
    const secret = 'totally-wrong-value-12345';
    const serialized = JSON.stringify(deriveBillingMode(envWith({ STRIPE_SECRET_KEY: secret })));
    expect(serialized).not.toContain(secret);
  });
});

describe('deriveBillingMode — contract', () => {
  it('is pure: repeated calls on equal input produce equal output', () => {
    expect(deriveBillingMode(envWith())).toEqual(deriveBillingMode(envWith()));
  });

  it('covers every sellable plan/interval, so a new tier cannot be silently unmonitored', () => {
    const r = deriveBillingMode(envWith());
    expect(Object.keys(r.pricesConfigured).sort()).toEqual(
      Object.keys(SELLABLE_PRICE_ENV_KEYS).sort(),
    );
  });
});
