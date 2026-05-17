/**
 * Integration tests for POST /api/billing/checkout (iter 066).
 *
 * Covers the trial-eligibility decision and the tier × interval matrix.
 * Mock pattern intentionally mirrors apps/web-app/src/app/api/workflows/
 * route.test.ts to avoid Vitest worker-pollution issues observed when this
 * test used getter-based mocks (workflows test failed to resolve `@/lib/plans`
 * when both ran in the same worker). Keep mocks simple, plain-object, no
 * getters, no env-reactive closures.
 *
 * What this file does NOT test (covered elsewhere or by typecheck):
 *  - `STRIPE_TRIAL_DAYS` env-var parsing — trivial; covered by typecheck +
 *    manual verification via the runbook (docs/runbooks/STRIPE_SETUP.md §5b).
 *  - Stripe webhook handling — covered by webhook/route.test.ts.
 *  - `planFromPriceId` resolution — covered by stripe.test.ts.
 *
 * No production code is modified by this file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Module mocks (plain factories, no getters, no env closures) ──────────────

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
  // Identity passthrough — sufficient because the route only uses toPlanType
  // to compare currentPlan !== 'free' in the already-subscribed safeguard.
  toPlanType: vi.fn((plan: string) => plan),
}));

// Stripe lib — static factory, no getters. Each call to getPriceId returns a
// deterministic test price ID derived from the (plan, interval) tuple.
const mockCheckoutCreate = vi.fn();
const mockCustomerCreate = vi.fn();

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
    customers: { create: mockCustomerCreate },
  })),
  getPriceId: vi.fn((plan: string, interval: string) => {
    if (plan === '__missing__') return null;
    return `price_${plan}_${interval}_test`;
  }),
  PRO_PRICE_ID: '',
  APP_URL: 'https://test.example',
  TRIAL_PERIOD_DAYS: 14,
  planFromPriceId: vi.fn(() => null),
  getWebhookSecret: vi.fn(() => 'whsec_test'),
}));

// ─── Imports after mocks (these resolve to the mocked modules) ────────────────

import { POST } from './route';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { getPriceId } from '@/lib/stripe';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/billing/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const TEST_USER_ID = 'user_test_123';
const TEST_CUSTOMER_ID = 'cus_test_existing';

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
    email: 'test@example.com',
    name: 'Test User',
    plan: opts.plan ?? 'free',
    subscriptionStatus: opts.subscriptionStatus ?? 'none',
    stripeCustomerId: opts.stripeCustomerId ?? TEST_CUSTOMER_ID,
    stripeSubscriptionId: opts.stripeSubscriptionId ?? null,
  };
}

/** Auth mock signature in NextAuth v5 confuses vi.mocked typing; cast via unknown. */
function setAuth(value: unknown): void {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(value);
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/billing/checkout (iter 066 trial + tier matrix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckoutCreate.mockReset();
    mockCustomerCreate.mockReset();

    setAuth({ user: { id: TEST_USER_ID, email: 'test@example.com' } });

    mockCheckoutCreate.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    });
  });

  // ── Trial eligibility (3 cases) ────────────────────────────────────────────

  describe('14-day trial application', () => {
    it('applies trial_period_days=14 for first-time subscribers (free + status=none + no sub id)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(200);

      expect(mockCheckoutCreate).toHaveBeenCalledOnce();
      const args = mockCheckoutCreate.mock.calls[0]![0];
      expect(args.subscription_data?.trial_period_days).toBe(14);
      expect(args.metadata.trial).toBe('14');
    });

    it('omits trial_period_days for returning subscribers (has stripeSubscriptionId)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        makeUser({
          stripeSubscriptionId: 'sub_previous',
          subscriptionStatus: 'canceled',
        }) as never,
      );

      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(200);

      const args = mockCheckoutCreate.mock.calls[0]![0];
      expect(args.subscription_data?.trial_period_days).toBeUndefined();
      expect(args.metadata.trial).toBe('none');
    });

    it('treats subscriptionStatus=null as eligible (legacy DB rows)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        makeUser({ subscriptionStatus: null }) as never,
      );

      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(200);

      const args = mockCheckoutCreate.mock.calls[0]![0];
      expect(args.subscription_data?.trial_period_days).toBe(14);
    });
  });

  // ── Tier × interval matrix (6 combos: 3 paid tiers × 2 intervals) ──────────

  describe('tier × interval matrix', () => {
    const tiers = ['starter', 'team', 'growth'] as const;
    const intervals = ['monthly', 'annual'] as const;

    for (const tier of tiers) {
      for (const interval of intervals) {
        it(`creates Checkout Session for ${tier} × ${interval} with correct price ID`, async () => {
          vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

          const res = await POST(makeRequest({ plan: tier, interval }));
          expect(res.status).toBe(200);
          const body = await res.json();
          expect(body.url).toMatch(/checkout\.stripe\.com/);

          const args = mockCheckoutCreate.mock.calls[0]![0];
          expect(args.line_items[0].price).toBe(`price_${tier}_${interval}_test`);
          expect(args.mode).toBe('subscription');
          expect(args.metadata.plan).toBe(tier);
          expect(args.metadata.interval).toBe(interval);
          expect(args.metadata.userId).toBe(TEST_USER_ID);
        });
      }
    }
  });

  // ── Safeguards ────────────────────────────────────────────────────────────

  describe('safeguards', () => {
    it('returns 401 when unauthenticated', async () => {
      setAuth(null);
      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found in DB', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);
      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(404);
    });

    it('returns 400 with code=already_subscribed for active paid users', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        makeUser({ plan: 'team', subscriptionStatus: 'active' }) as never,
      );
      const res = await POST(makeRequest({ plan: 'growth', interval: 'monthly' }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('already_subscribed');
    });

    it('returns 503 when the requested tier price ID is unconfigured', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      // Use the sentinel that getPriceId mock returns null for; PRO_PRICE_ID
      // is also empty so the legacy fallback can't rescue this case.
      vi.mocked(getPriceId).mockReturnValueOnce(null);

      const res = await POST(makeRequest({ plan: 'team', interval: 'monthly' }));
      expect(res.status).toBe(503);
    });

    it('defaults to starter monthly when body is empty', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      const res = await POST(makeRequest({}));
      expect(res.status).toBe(200);

      const args = mockCheckoutCreate.mock.calls[0]![0];
      expect(args.metadata.plan).toBe('starter');
      expect(args.metadata.interval).toBe('monthly');
    });
  });
});
