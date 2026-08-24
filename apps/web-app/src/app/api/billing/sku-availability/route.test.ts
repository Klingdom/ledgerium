/**
 * Integration tests for GET /api/billing/sku-availability.
 *
 * No production code is modified by this file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/stripe', () => ({
  getOneTimePriceId: vi.fn(),
  getPriceId: vi.fn(),
}));

import { GET } from './route';
import { getOneTimePriceId, getPriceId } from '@/lib/stripe';

describe('GET /api/billing/sku-availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Safe default so every test's `plans` field is deterministic even when
    // a test only cares about `data` — mirrors production's degrade-to-null
    // behavior for an unconfigured price ID.
    vi.mocked(getPriceId).mockReturnValue(null);
  });

  it('reports both SKUs unavailable when neither price ID is configured (default shipped state)', async () => {
    vi.mocked(getOneTimePriceId).mockReturnValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ guided_onboarding: false, process_audit: false });
  });

  it('reports guided_onboarding available once its price ID is configured, independent of process_audit', async () => {
    vi.mocked(getOneTimePriceId).mockImplementation((sku: string) =>
      sku === 'guided_onboarding' ? 'price_guided_onboarding' : null,
    );

    const res = await GET();
    const body = await res.json();
    expect(body.data.guided_onboarding).toBe(true);
    expect(body.data.process_audit).toBe(false);
  });

  it('reports process_audit available once its price ID is configured, independent of guided_onboarding', async () => {
    vi.mocked(getOneTimePriceId).mockImplementation((sku: string) =>
      sku === 'process_audit' ? 'price_process_audit' : null,
    );

    const res = await GET();
    const body = await res.json();
    expect(body.data.process_audit).toBe(true);
    expect(body.data.guided_onboarding).toBe(false);
  });

  it('reports both available when both are configured', async () => {
    vi.mocked(getOneTimePriceId).mockReturnValue('price_configured');

    const res = await GET();
    const body = await res.json();
    expect(body.data).toEqual({ guided_onboarding: true, process_audit: true });
  });

  it('does not require authentication', async () => {
    vi.mocked(getOneTimePriceId).mockReturnValue(null);
    // No auth mock at all — route must not import/call it.
    const res = await GET();
    expect(res.status).toBe(200);
  });

  // ── Subscription plans (SUBSCRIPTION_READINESS_001 §G1) ────────────────────

  describe('plans (subscription availability pre-check)', () => {
    it('reports starter and solo, both intervals, unavailable when no price IDs are configured (default shipped state — the Solo bug)', async () => {
      vi.mocked(getOneTimePriceId).mockReturnValue(null);
      vi.mocked(getPriceId).mockReturnValue(null);

      const res = await GET();
      const body = await res.json();
      expect(body.plans).toEqual({
        starter: { monthly: false, annual: false },
        solo: { monthly: false, annual: false },
      });
    });

    it('reports monthly and annual independently — a plan can have one configured without the other', async () => {
      vi.mocked(getOneTimePriceId).mockReturnValue(null);
      vi.mocked(getPriceId).mockImplementation((plan: string, interval: string) =>
        plan === 'starter' && interval === 'monthly' ? 'price_starter_monthly' : null,
      );

      const res = await GET();
      const body = await res.json();
      expect(body.plans.starter).toEqual({ monthly: true, annual: false });
      expect(body.plans.solo).toEqual({ monthly: false, annual: false });
    });

    it('resolves availability via getPriceId — the exact source of truth checkout uses, not a duplicated env-var read', async () => {
      vi.mocked(getOneTimePriceId).mockReturnValue(null);
      vi.mocked(getPriceId).mockReturnValue('price_configured');

      const res = await GET();
      const body = await res.json();
      expect(body.plans).toEqual({
        starter: { monthly: true, annual: true },
        solo: { monthly: true, annual: true },
      });
      expect(getPriceId).toHaveBeenCalledWith('starter', 'monthly');
      expect(getPriceId).toHaveBeenCalledWith('starter', 'annual');
      expect(getPriceId).toHaveBeenCalledWith('solo', 'monthly');
      expect(getPriceId).toHaveBeenCalledWith('solo', 'annual');
    });

    it('does NOT report team or growth — they are waitlist-gated regardless of Stripe price config, never a live button', async () => {
      vi.mocked(getOneTimePriceId).mockReturnValue(null);
      vi.mocked(getPriceId).mockReturnValue('price_configured');

      const res = await GET();
      const body = await res.json();
      expect(body.plans.team).toBeUndefined();
      expect(body.plans.growth).toBeUndefined();
      expect(getPriceId).not.toHaveBeenCalledWith('team', expect.anything());
      expect(getPriceId).not.toHaveBeenCalledWith('growth', expect.anything());
    });

    it('leaves the existing SKU `data` shape untouched by the new `plans` field', async () => {
      vi.mocked(getOneTimePriceId).mockReturnValue(null);
      vi.mocked(getPriceId).mockReturnValue(null);

      const res = await GET();
      const body = await res.json();
      expect(body.data).toEqual({ guided_onboarding: false, process_audit: false });
    });
  });
});
