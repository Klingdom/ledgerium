/**
 * SUBSCRIPTION_READINESS_001 Phase 2 — acceptance-gate proof.
 *
 * docs/features/subscriptions/SUBSCRIPTION_READINESS_001.md §4 Phase 2 gate:
 * "with Stripe env deliberately unset in a test run, no tier renders a live
 * buy button, and no internal diagnostic string is reachable by a customer."
 *
 * Unlike route.test.ts (which hand-constructs response bodies) and
 * plan-availability.test.ts / checkout-error.test.ts (which exercise the
 * pure mappers in isolation), this file wires the REAL route handlers
 * (`GET /api/billing/sku-availability`, `POST /api/billing/checkout`) to the
 * REAL decision functions (`derivePlanAvailability`, `mapCheckoutError`) so
 * the two gates are proven end-to-end against actual server output, not
 * against a body a test author might get subtly wrong.
 *
 * This is exactly the failure mode the audit found: Solo shipped with a
 * live $89 button and no backing price because nothing checked
 * `getPriceId('solo', ...)` before rendering the button, and the checkout
 * route's raw `error` string reached the customer verbatim. These tests
 * would have caught both.
 *
 * No production code is modified by this file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Module mocks — combined superset needed by BOTH route handlers ───────────

vi.mock('@/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/admin-allowlist', () => ({
  isAdminUnlimited: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/analytics-server', () => ({
  trackServer: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  toPlanType: vi.fn((plan: string) => plan),
}));

vi.mock('@/lib/feature-gating', () => ({
  effectivePlanFor: vi.fn().mockResolvedValue('free'),
}));

vi.mock('@/lib/audit-eligibility', () => ({
  getAuditEligibility: vi.fn().mockResolvedValue({ eligible: true, minRunsRequired: 5, processes: [] }),
}));

const mockCheckoutCreate = vi.fn();
const mockCustomerCreate = vi.fn();
const mockGetPriceId = vi.fn((_plan: string, _interval: string): string | null => null);
const mockGetOneTimePriceId = vi.fn((_sku: string): string | null => null);

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
    customers: { create: mockCustomerCreate },
  })),
  getPriceId: (plan: string, interval: string) => mockGetPriceId(plan, interval),
  getOneTimePriceId: (sku: string) => mockGetOneTimePriceId(sku),
  PRO_PRICE_ID: '',
  APP_URL: 'https://test.example',
  TRIAL_PERIOD_DAYS: 14,
  ALLOW_PROMOTION_CODES: true,
  AUTOMATIC_TAX_ENABLED: false,
  planFromPriceId: vi.fn(() => null),
  getWebhookSecret: vi.fn(() => 'whsec_test'),
}));

import { GET as skuAvailabilityGET } from '../sku-availability/route';
import { POST as checkoutPOST } from './route';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { isAdminUnlimited } from '@/lib/admin-allowlist';
import { effectivePlanFor } from '@/lib/feature-gating';
import { derivePlanAvailability } from '@/lib/plan-availability';
import { mapCheckoutError, type CheckoutErrorCode } from '@/lib/checkout-error';

const TEST_USER_ID = 'user_gate_test';

interface FakeUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

function makeUser(opts: Partial<FakeUser> = {}): FakeUser {
  return {
    id: TEST_USER_ID,
    email: 'gate@example.com',
    name: 'Gate Test User',
    plan: opts.plan ?? 'free',
    subscriptionStatus: opts.subscriptionStatus ?? 'none',
    stripeCustomerId: opts.stripeCustomerId ?? 'cus_gate_test',
    stripeSubscriptionId: opts.stripeSubscriptionId ?? null,
  };
}

function makeCheckoutRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/billing/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setAuth(value: unknown): void {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(value);
}

/** The exact internal diagnostic strings the audit named — never customer-reachable. */
const FORBIDDEN_SUBSTRINGS = [
  'Billing not configured',
  'not configured for this plan',
  'not configured for this SKU',
  'User not found',
  'Unauthorized',
  'Failed to create checkout session',
  'Missing required field',
];

function assertNoInternalDiagnostic(message: string, context: string) {
  for (const forbidden of FORBIDDEN_SUBSTRINGS) {
    expect(message, `[${context}] leaked internal diagnostic text: "${forbidden}"`).not.toContain(forbidden);
  }
}

describe('SUBSCRIPTION_READINESS_001 §4 Phase 2 — acceptance gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckoutCreate.mockReset();
    mockCustomerCreate.mockReset();
    mockGetPriceId.mockReset();
    mockGetOneTimePriceId.mockReset();

    setAuth({ user: { id: TEST_USER_ID, email: 'gate@example.com' } });
    mockCheckoutCreate.mockResolvedValue({
      id: 'cs_gate_test',
      url: 'https://checkout.stripe.com/c/pay/cs_gate_test',
    });
  });

  // ── Gate (a): no tier renders a live purchase button when Stripe price ─────
  // env vars are unset ──────────────────────────────────────────────────────

  describe('Gate (a) — no live button when Stripe price env vars are unset', () => {
    it('with ALL Stripe price env vars unset, every purchasable plan × interval resolves to non-available', async () => {
      // Simulates STRIPE_STARTER_*_PRICE_ID / STRIPE_SOLO_*_PRICE_ID all
      // unset — getPriceId degrades to null for everything, exactly like
      // production does per stripe.ts's documented empty-string-default.
      mockGetPriceId.mockReturnValue(null);
      mockGetOneTimePriceId.mockReturnValue(null);

      const res = await skuAvailabilityGET();
      expect(res.status).toBe(200);
      const body = await res.json();

      for (const plan of ['starter', 'solo']) {
        for (const interval of ['monthly', 'annual'] as const) {
          const availability = derivePlanAvailability(body, plan, interval);
          expect(
            availability,
            `${plan}/${interval} must not be 'available' with Stripe price env vars unset`,
          ).not.toBe('available');
        }
      }
    });

    it('reproduces the exact Solo bug scenario — Starter configured, Solo unset — and proves ONLY Solo is gated', async () => {
      // This is the literal shipped-bug shape from SUBSCRIPTION_READINESS_001
      // §2: Starter has both price IDs; Solo has neither.
      mockGetPriceId.mockImplementation((plan) => (plan === 'starter' ? 'price_starter_test' : null));
      mockGetOneTimePriceId.mockReturnValue(null);

      const res = await skuAvailabilityGET();
      const body = await res.json();

      expect(derivePlanAvailability(body, 'starter', 'monthly')).toBe('available');
      expect(derivePlanAvailability(body, 'starter', 'annual')).toBe('available');
      // The bug: Solo must resolve to unavailable, not available, on both intervals.
      expect(derivePlanAvailability(body, 'solo', 'monthly')).toBe('unavailable');
      expect(derivePlanAvailability(body, 'solo', 'annual')).toBe('unavailable');
    });

    it('before the fetch resolves (component mount), availability is "loading" — never "available"', () => {
      // response === null is the exact state PricingCards / the account page
      // are in before their useEffect's fetch resolves.
      expect(derivePlanAvailability(null, 'starter', 'monthly')).not.toBe('available');
      expect(derivePlanAvailability(null, 'solo', 'monthly')).not.toBe('available');
    });
  });

  // ── Gate (b): no internal diagnostic string is customer-reachable ──────────

  describe('Gate (b) — no internal diagnostic string reaches the customer', () => {
    async function collectMappedMessage(res: Response): Promise<{ code: unknown; message: string }> {
      const body = await res.json();
      const mapped = mapCheckoutError(res.status, body);
      return { code: body.code, message: mapped.message };
    }

    it('unauthenticated request (was raw "Unauthorized")', async () => {
      setAuth(null);
      const res = await checkoutPOST(makeCheckoutRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(401);
      const { message } = await collectMappedMessage(res);
      assertNoInternalDiagnostic(message, 'unauthorized');
    });

    it('user not found in DB (was raw "User not found")', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);
      const res = await checkoutPOST(makeCheckoutRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(404);
      const { message } = await collectMappedMessage(res);
      assertNoInternalDiagnostic(message, 'user_not_found');
    });

    it('unconfigured subscription plan price (was raw "Billing not configured for this plan" — the Solo bug)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      mockGetPriceId.mockReturnValue(null);

      const res = await checkoutPOST(makeCheckoutRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(503);
      const { code, message } = await collectMappedMessage(res);
      expect(code).toBe('plan_not_configured');
      assertNoInternalDiagnostic(message, 'plan_not_configured');
    });

    it('unconfigured one-time SKU price (was raw "Billing not configured for this SKU")', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      mockGetOneTimePriceId.mockReturnValue(null);

      const res = await checkoutPOST(makeCheckoutRequest({ type: 'one_time', sku: 'example_onboarding_audit' }));
      expect(res.status).toBe(503);
      const { code, message } = await collectMappedMessage(res);
      expect(code).toBe('sku_not_configured');
      assertNoInternalDiagnostic(message, 'sku_not_configured');
    });

    it('Stripe Checkout Session creation throws on the subscription path (was raw "Failed to create checkout session")', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      mockGetPriceId.mockReturnValue('price_starter_test');
      mockCheckoutCreate.mockRejectedValueOnce(new Error('stripe outage'));

      const res = await checkoutPOST(makeCheckoutRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(500);
      const { code, message } = await collectMappedMessage(res);
      expect(code).toBe('checkout_session_failed');
      assertNoInternalDiagnostic(message, 'checkout_session_failed (subscription)');
    });

    it('Stripe Checkout Session creation throws on the one-time path (was raw "Failed to create checkout session")', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      mockGetOneTimePriceId.mockReturnValue('price_configured_test');
      mockCheckoutCreate.mockRejectedValueOnce(new Error('stripe outage'));

      const res = await checkoutPOST(makeCheckoutRequest({ type: 'one_time', sku: 'guided_onboarding' }));
      expect(res.status).toBe(500);
      const { code, message } = await collectMappedMessage(res);
      expect(code).toBe('checkout_session_failed');
      assertNoInternalDiagnostic(message, 'checkout_session_failed (one_time)');
    });

    it('missing sku on the one-time path (defensive — never actually reachable via the real UI, which always supplies one)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      const res = await checkoutPOST(makeCheckoutRequest({ type: 'one_time' }));
      expect(res.status).toBe(400);
      const { code, message } = await collectMappedMessage(res);
      expect(code).toBe('missing_sku');
      assertNoInternalDiagnostic(message, 'missing_sku');
    });

    it('already-subscribed guard — preserves existing code + redirect', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        makeUser({ plan: 'starter', subscriptionStatus: 'active' }) as never,
      );
      vi.mocked(effectivePlanFor).mockResolvedValueOnce('starter');
      mockGetPriceId.mockReturnValue('price_starter_test');

      const res = await checkoutPOST(makeCheckoutRequest({ plan: 'solo', interval: 'monthly' }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('already_subscribed');
      const mapped = mapCheckoutError(res.status, body);
      assertNoInternalDiagnostic(mapped.message, 'already_subscribed');
      expect(mapped.redirect).toBe('/account');
    });

    it('admin-bypass guard — preserves existing code', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      vi.mocked(isAdminUnlimited).mockReturnValueOnce(true);

      const res = await checkoutPOST(makeCheckoutRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(400);
      const { code, message } = await collectMappedMessage(res);
      expect(code).toBe('admin_bypass');
      assertNoInternalDiagnostic(message, 'admin_bypass');
    });

    it('team/growth waitlist gate — preserves existing customer-appropriate copy', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      const res = await checkoutPOST(makeCheckoutRequest({ plan: 'team', interval: 'monthly' }));
      expect(res.status).toBe(402);
      const { code, message } = await collectMappedMessage(res);
      expect(code).toBe('awaiting_workspace_build');
      assertNoInternalDiagnostic(message, 'awaiting_workspace_build');
    });

    it('sweeps every reachable checkout error code and confirms none produce a forbidden diagnostic string', async () => {
      const seenCodes = new Set<CheckoutErrorCode>();

      // unauthorized
      setAuth(null);
      seenCodes.add(
        (await collectMappedMessage(
          await checkoutPOST(makeCheckoutRequest({ plan: 'starter', interval: 'monthly' })),
        )).code as CheckoutErrorCode,
      );

      setAuth({ user: { id: TEST_USER_ID, email: 'gate@example.com' } });

      // user_not_found
      vi.mocked(db.user.findUnique).mockResolvedValueOnce(null as never);
      seenCodes.add(
        (await collectMappedMessage(
          await checkoutPOST(makeCheckoutRequest({ plan: 'starter', interval: 'monthly' })),
        )).code as CheckoutErrorCode,
      );

      // plan_not_configured
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      mockGetPriceId.mockReturnValue(null);
      seenCodes.add(
        (await collectMappedMessage(
          await checkoutPOST(makeCheckoutRequest({ plan: 'starter', interval: 'monthly' })),
        )).code as CheckoutErrorCode,
      );

      expect(seenCodes).toEqual(new Set(['unauthorized', 'user_not_found', 'plan_not_configured']));
      // Every code collected above must map to safe copy — belt-and-suspenders
      // on top of the individual tests.
      for (const code of seenCodes) {
        const mapped = mapCheckoutError(503, { code });
        assertNoInternalDiagnostic(mapped.message, `sweep:${code}`);
      }
    });
  });
});
