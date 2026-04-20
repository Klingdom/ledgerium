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
