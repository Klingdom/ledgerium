/**
 * Regression tests for BUG-01 and BUG-04 billing revenue-integrity fixes.
 *
 * BUG-01: planFromPriceId must return null (not 'starter') for unmapped IDs
 *         and emit a console.warn so the caller can hard-error.
 *
 * BUG-04: getWebhookSecret must throw when STRIPE_WEBHOOK_SECRET is absent;
 *         must return the value when present.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── planFromPriceId ──────────────────────────────────────────────────────────

describe('planFromPriceId', () => {
  // Re-import after env manipulation so the module-level STRIPE_PRICE_TO_PLAN
  // map is rebuilt with the test env values.
  const KNOWN_STARTER_PRICE = 'price_starter_monthly_test';

  beforeEach(() => {
    vi.resetModules();
    process.env.STRIPE_STARTER_MONTHLY_PRICE_ID = KNOWN_STARTER_PRICE;
  });

  afterEach(() => {
    delete process.env.STRIPE_STARTER_MONTHLY_PRICE_ID;
    vi.restoreAllMocks();
  });

  it('returns null for an unmapped price ID and emits console.warn', async () => {
    const { planFromPriceId } = await import('./stripe.js');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = planFromPriceId('price_unmapped_xyz');

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('price_unmapped_xyz'),
    );
  });

  it('returns the correct plan for a known starter price ID', async () => {
    const { planFromPriceId } = await import('./stripe.js');
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = planFromPriceId(KNOWN_STARTER_PRICE);

    expect(result).toBe('starter');
  });

  it('returns null for an empty string (unset env var scenario)', async () => {
    const { planFromPriceId } = await import('./stripe.js');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = planFromPriceId('');

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});

// ─── getWebhookSecret ─────────────────────────────────────────────────────────

describe('getWebhookSecret', () => {
  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    vi.resetModules();
  });

  it('throws when STRIPE_WEBHOOK_SECRET is not set', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const { getWebhookSecret } = await import('./stripe.js');

    expect(() => getWebhookSecret()).toThrow('STRIPE_WEBHOOK_SECRET is not configured');
  });

  it('throws when STRIPE_WEBHOOK_SECRET is an empty string', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = '';
    const { getWebhookSecret } = await import('./stripe.js');

    expect(() => getWebhookSecret()).toThrow('STRIPE_WEBHOOK_SECRET is not configured');
  });

  it('throws when STRIPE_WEBHOOK_SECRET is only whitespace', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = '   ';
    const { getWebhookSecret } = await import('./stripe.js');

    expect(() => getWebhookSecret()).toThrow('STRIPE_WEBHOOK_SECRET is not configured');
  });

  it('returns the secret when STRIPE_WEBHOOK_SECRET is set', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_value';
    const { getWebhookSecret } = await import('./stripe.js');

    expect(getWebhookSecret()).toBe('whsec_test_secret_value');
  });
});

// ─── intervalFromStripeSubscription (REVENUE_PLAN_20K §1.2c) ────────────────

describe('intervalFromStripeSubscription', () => {
  it('returns "annual" when price.recurring.interval is "year"', async () => {
    const { intervalFromStripeSubscription } = await import('./stripe.js');

    const result = intervalFromStripeSubscription({
      items: { data: [{ price: { recurring: { interval: 'year' } } }] },
    } as any);

    expect(result).toBe('annual');
  });

  it('returns "monthly" when price.recurring.interval is "month"', async () => {
    const { intervalFromStripeSubscription } = await import('./stripe.js');

    const result = intervalFromStripeSubscription({
      items: { data: [{ price: { recurring: { interval: 'month' } } }] },
    } as any);

    expect(result).toBe('monthly');
  });

  it('defaults to "monthly" when recurring is missing (malformed/partial subscription object)', async () => {
    const { intervalFromStripeSubscription } = await import('./stripe.js');

    const result = intervalFromStripeSubscription({
      items: { data: [{ price: {} }] },
    } as any);

    expect(result).toBe('monthly');
  });

  it('defaults to "monthly" when items.data is empty (never applies the annual discount to unknown cadence)', async () => {
    const { intervalFromStripeSubscription } = await import('./stripe.js');

    const result = intervalFromStripeSubscription({
      items: { data: [] },
    } as any);

    expect(result).toBe('monthly');
  });
});

// ─── ALLOW_PROMOTION_CODES (2026-08 monetization-shapes hardening) ──────────

describe('ALLOW_PROMOTION_CODES', () => {
  afterEach(() => {
    delete process.env.STRIPE_ALLOW_PROMOTION_CODES;
    vi.resetModules();
  });

  it('defaults to true when STRIPE_ALLOW_PROMOTION_CODES is unset', async () => {
    delete process.env.STRIPE_ALLOW_PROMOTION_CODES;
    vi.resetModules();
    const { ALLOW_PROMOTION_CODES } = await import('./stripe.js');

    expect(ALLOW_PROMOTION_CODES).toBe(true);
  });

  it('is false when STRIPE_ALLOW_PROMOTION_CODES=false', async () => {
    process.env.STRIPE_ALLOW_PROMOTION_CODES = 'false';
    vi.resetModules();
    const { ALLOW_PROMOTION_CODES } = await import('./stripe.js');

    expect(ALLOW_PROMOTION_CODES).toBe(false);
  });

  it('is false when STRIPE_ALLOW_PROMOTION_CODES=0', async () => {
    process.env.STRIPE_ALLOW_PROMOTION_CODES = '0';
    vi.resetModules();
    const { ALLOW_PROMOTION_CODES } = await import('./stripe.js');

    expect(ALLOW_PROMOTION_CODES).toBe(false);
  });

  it('is true when STRIPE_ALLOW_PROMOTION_CODES=true', async () => {
    process.env.STRIPE_ALLOW_PROMOTION_CODES = 'true';
    vi.resetModules();
    const { ALLOW_PROMOTION_CODES } = await import('./stripe.js');

    expect(ALLOW_PROMOTION_CODES).toBe(true);
  });

  it('falls back to the default (true) for an unrecognized value rather than throwing', async () => {
    process.env.STRIPE_ALLOW_PROMOTION_CODES = 'yes-please';
    vi.resetModules();
    const { ALLOW_PROMOTION_CODES } = await import('./stripe.js');

    expect(ALLOW_PROMOTION_CODES).toBe(true);
  });
});

// ─── AUTOMATIC_TAX_ENABLED (2026-08 monetization-shapes hardening) ──────────

describe('AUTOMATIC_TAX_ENABLED', () => {
  afterEach(() => {
    delete process.env.STRIPE_AUTOMATIC_TAX_ENABLED;
    vi.resetModules();
  });

  it('defaults to false when STRIPE_AUTOMATIC_TAX_ENABLED is unset — tax must be opt-in', async () => {
    delete process.env.STRIPE_AUTOMATIC_TAX_ENABLED;
    vi.resetModules();
    const { AUTOMATIC_TAX_ENABLED } = await import('./stripe.js');

    expect(AUTOMATIC_TAX_ENABLED).toBe(false);
  });

  it('is true when STRIPE_AUTOMATIC_TAX_ENABLED=true', async () => {
    process.env.STRIPE_AUTOMATIC_TAX_ENABLED = 'true';
    vi.resetModules();
    const { AUTOMATIC_TAX_ENABLED } = await import('./stripe.js');

    expect(AUTOMATIC_TAX_ENABLED).toBe(true);
  });

  it('is true when STRIPE_AUTOMATIC_TAX_ENABLED=1', async () => {
    process.env.STRIPE_AUTOMATIC_TAX_ENABLED = '1';
    vi.resetModules();
    const { AUTOMATIC_TAX_ENABLED } = await import('./stripe.js');

    expect(AUTOMATIC_TAX_ENABLED).toBe(true);
  });

  it('falls back to the default (false) for an unrecognized value rather than throwing', async () => {
    process.env.STRIPE_AUTOMATIC_TAX_ENABLED = 'enable-it';
    vi.resetModules();
    const { AUTOMATIC_TAX_ENABLED } = await import('./stripe.js');

    expect(AUTOMATIC_TAX_ENABLED).toBe(false);
  });
});

// ─── ONE_TIME_PRICES / getOneTimePriceId (2026-08 monetization-shapes hardening) ──

describe('getOneTimePriceId', () => {
  afterEach(() => {
    delete process.env.STRIPE_ONE_TIME_EXAMPLE_PRICE_ID;
    vi.resetModules();
  });

  it('returns null for the placeholder example SKU when its price ID env var is unset (inert by default)', async () => {
    delete process.env.STRIPE_ONE_TIME_EXAMPLE_PRICE_ID;
    vi.resetModules();
    const { getOneTimePriceId } = await import('./stripe.js');

    expect(getOneTimePriceId('example_onboarding_audit')).toBeNull();
  });

  it('returns the configured price ID once STRIPE_ONE_TIME_EXAMPLE_PRICE_ID is set', async () => {
    process.env.STRIPE_ONE_TIME_EXAMPLE_PRICE_ID = 'price_one_time_test_123';
    vi.resetModules();
    const { getOneTimePriceId } = await import('./stripe.js');

    expect(getOneTimePriceId('example_onboarding_audit')).toBe('price_one_time_test_123');
  });

  it('returns null for a completely unknown SKU key', async () => {
    vi.resetModules();
    const { getOneTimePriceId } = await import('./stripe.js');

    expect(getOneTimePriceId('not_a_real_sku')).toBeNull();
  });
});
