/**
 * Integration tests for POST /api/billing/checkout (iter 066; extended 2026-08
 * for the monetization-shapes hardening — promotion codes, Stripe Tax wiring,
 * and one-time (`mode: 'payment'`) checkout).
 *
 * Covers the trial-eligibility decision, the tier × interval matrix, the
 * default (production-representative) promotion-code + tax wiring on the
 * subscription path, and the one-time payment path end-to-end.
 * Mock pattern intentionally mirrors apps/web-app/src/app/api/workflows/
 * route.test.ts to avoid Vitest worker-pollution issues observed when this
 * test used getter-based mocks (workflows test failed to resolve `@/lib/plans`
 * when both ran in the same worker). Keep mocks simple, plain-object, no
 * getters, no env-reactive closures.
 *
 * What this file does NOT test (covered elsewhere or by typecheck):
 *  - `STRIPE_TRIAL_DAYS` / `STRIPE_ALLOW_PROMOTION_CODES` /
 *    `STRIPE_AUTOMATIC_TAX_ENABLED` env-var PARSING — covered by stripe.test.ts
 *    (real module, no route involved, no mock-vs-env flakiness risk).
 *  - Stripe webhook handling, including one-time purchase persistence —
 *    covered by webhook/route.test.ts.
 *  - `planFromPriceId` resolution — covered by stripe.test.ts.
 *  - Route-level behavior when ALLOW_PROMOTION_CODES=false /
 *    AUTOMATIC_TAX_ENABLED=true (the non-default combination) — covered by
 *    the sibling file route.tax-and-promo-toggle.test.ts, which uses its own
 *    static mock with those values instead of dynamically re-importing this
 *    module with different env (that approach was tried and produces
 *    unreliable results — see that file's header comment).
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

vi.mock('@/lib/feature-gating', () => ({
  // Default: free plan — overridden per test where workspace membership matters.
  effectivePlanFor: vi.fn().mockResolvedValue('free'),
}));

// Process Audit hard qualification gate (SKU_SPEC_001 §2) — default eligible
// so pre-existing one-time-payment tests using '__configured_sku__' (a
// non-audit sku) are never affected by this mock; the audit-gate tests below
// override it explicitly per-case.
vi.mock('@/lib/audit-eligibility', () => ({
  getAuditEligibility: vi.fn().mockResolvedValue({
    eligible: true,
    minRunsRequired: 5,
    processes: [],
  }),
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
  // 2026-08 monetization-shapes hardening — one-time SKU price lookup.
  // '__configured_sku__' resolves to a price like a real configured SKU;
  // 'guided_onboarding' / 'process_audit' (2026-08 service SKUs) also
  // resolve to configured prices here so the audit-eligibility-gate tests
  // below can reach that logic without being short-circuited by the
  // "not configured" 503 path; any OTHER sku (including the real
  // placeholder key 'example_onboarding_audit', which is inert by default
  // in production) resolves to null, exercising that 503 path.
  getOneTimePriceId: vi.fn((sku: string) => {
    if (sku === '__configured_sku__') return 'price_one_time_test_sku';
    if (sku === 'guided_onboarding') return 'price_guided_onboarding_test';
    if (sku === 'process_audit') return 'price_process_audit_test';
    return null;
  }),
  PRO_PRICE_ID: '',
  APP_URL: 'https://test.example',
  TRIAL_PERIOD_DAYS: 14,
  // Defaults mirror the real module's defaults (promo codes ON, tax OFF) so
  // this file's tests see production-representative behavior end-to-end.
  // These are const exports, not vi.fn()s, so they cannot be toggled
  // per-test with vi.mocked(...).mockReturnValueOnce — the OFF/ON toggle
  // behavior (does route.ts correctly read+apply a *different* value of
  // each flag) is instead covered by a sibling file with its own static
  // mock: route.tax-and-promo-toggle.test.ts. Splitting this way avoids
  // env-reactive/dynamic-reimport mocks in this file, which the header
  // comment above already documents as a prior source of Vitest
  // worker-pollution failures.
  ALLOW_PROMOTION_CODES: true,
  AUTOMATIC_TAX_ENABLED: false,
  planFromPriceId: vi.fn(() => null),
  getWebhookSecret: vi.fn(() => 'whsec_test'),
}));

// ─── Imports after mocks (these resolve to the mocked modules) ────────────────

import { POST } from './route';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { getPriceId } from '@/lib/stripe';
import { effectivePlanFor } from '@/lib/feature-gating';
import { getAuditEligibility } from '@/lib/audit-eligibility';

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

  // ── Tier × interval matrix (8 combos: 4 paid tiers × 2 intervals) ──────────

  describe('tier × interval matrix', () => {
    // Post CEO directive 2026-05-18 "Option B": Team and Growth are blocked from
    // self-serve Stripe Checkout until multi-user invite infrastructure ships
    // via TEAM-001 workspace build. Starter and Solo create Checkout Sessions;
    // Team and Growth return 402 with code='awaiting_workspace_build'.
    // Solo (REVENUE_PLAN_20K §6 Option B) is purchasable — it is a single-user
    // tier with zero dependency on the team data layer this gate protects.
    // Revert these test expectations when TEAM-P01..P06 ship.
    const purchasableTiers = ['starter', 'solo'] as const;
    const waitlistTiers = ['team', 'growth'] as const;
    const intervals = ['monthly', 'annual'] as const;

    for (const tier of purchasableTiers) {
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

    // CEO directive 2026-05-18 "Option B": Team + Growth gated to waitlist.
    // Server-side defense-in-depth: even direct API calls with plan=team or
    // plan=growth must be rejected with 402 + code='awaiting_workspace_build'.
    // Revert when TEAM-P01..P06 ship.
    for (const tier of waitlistTiers) {
      for (const interval of intervals) {
        it(`rejects ${tier} × ${interval} with 402 awaiting_workspace_build (multi-user gate)`, async () => {
          vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

          const res = await POST(makeRequest({ plan: tier, interval }));
          expect(res.status).toBe(402);
          const body = await res.json();
          expect(body.code).toBe('awaiting_workspace_build');
          expect(body.plan).toBe(tier);
          expect(body.starterFallbackAvailable).toBe(true);
          expect(body.waitlistMailto).toBe('hello@ledgerium.ai');

          // Should NOT have called Stripe Checkout create
          expect(mockCheckoutCreate).not.toHaveBeenCalled();
        });
      }
    }

    // ── Explicit Solo-unlock assertion (REVENUE_PLAN_20K §6 Option B) ────────
    // The matrix above already covers this via purchasableTiers/waitlistTiers,
    // but this standalone pair makes the "checkout accepts solo, still
    // rejects team/growth" requirement independently discoverable without
    // tracing the loop.
    it('accepts solo (200, real Checkout Session) while still rejecting team and growth (402)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      const soloRes = await POST(makeRequest({ plan: 'solo', interval: 'monthly' }));
      expect(soloRes.status).toBe(200);
      const soloBody = await soloRes.json();
      expect(soloBody.url).toMatch(/checkout\.stripe\.com/);

      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      const teamRes = await POST(makeRequest({ plan: 'team', interval: 'monthly' }));
      expect(teamRes.status).toBe(402);

      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      const growthRes = await POST(makeRequest({ plan: 'growth', interval: 'monthly' }));
      expect(growthRes.status).toBe(402);
    });
  });

  // ── Safeguards ────────────────────────────────────────────────────────────

  describe('safeguards', () => {
    it('returns 401 when unauthenticated', async () => {
      setAuth(null);
      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(401);
    });

    // SUBSCRIPTION_READINESS_001 §G2: every customer-reachable checkout
    // error must carry a stable code — this is what previously-raw
    // diagnostic strings get mapped from at the UI boundary.
    it('returns code=unauthorized when unauthenticated (G2)', async () => {
      setAuth(null);
      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      const body = await res.json();
      expect(body.code).toBe('unauthorized');
    });

    it('returns 404 when user not found in DB', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);
      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(404);
    });

    it('returns code=user_not_found when user not found in DB (G2)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);
      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      const body = await res.json();
      expect(body.code).toBe('user_not_found');
    });

    it('returns 400 with code=already_subscribed for active paid users', async () => {
      // CEO directive 2026-05-18 "Option B": Team + Growth are waitlist-gated
      // (402 awaiting_workspace_build). Use starter for this safeguard test —
      // an existing 'team' subscriber requesting an upgrade to 'starter' would
      // be caught by the already_subscribed gate (current_plan > free + active).
      vi.mocked(db.user.findUnique).mockResolvedValue(
        makeUser({ plan: 'team', subscriptionStatus: 'active' }) as never,
      );
      // TEAM-P03.9 Sub-task B-1: effectivePlanFor now drives the already_subscribed gate
      // (replaced toPlanType(user.plan)). Mock must return 'team' so the guard fires.
      vi.mocked(effectivePlanFor).mockResolvedValueOnce('team');
      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('already_subscribed');
    });

    it('returns 503 when the requested tier price ID is unconfigured', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      // Use the sentinel that getPriceId mock returns null for; PRO_PRICE_ID
      // is also empty so the legacy fallback can't rescue this case.
      vi.mocked(getPriceId).mockReturnValueOnce(null);

      // Use starter (the only purchasable plan post CEO directive 2026-05-18 "Option B");
      // team/growth would short-circuit at the workspace-build gate before reaching getPriceId.
      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(503);
    });

    it('returns code=plan_not_configured when the requested tier price ID is unconfigured (G1/G2 — was the uncoded "Billing not configured for this plan" the Solo bug shipped)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      vi.mocked(getPriceId).mockReturnValueOnce(null);

      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      const body = await res.json();
      expect(body.code).toBe('plan_not_configured');
    });

    it('returns code=checkout_session_failed when Stripe Checkout Session creation throws (G2)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      mockCheckoutCreate.mockRejectedValueOnce(new Error('stripe down'));

      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.code).toBe('checkout_session_failed');
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

  // ── Sub-task B-1: effectivePlanFor workspace-aware double-billing guard ─────
  // (TEAM-P03.9 — replaces toPlanType(user.plan) which only saw solo subscriptions)

  describe('workspace-aware double-billing guard (TEAM-P03.9 Sub-task B-1)', () => {
    it('blocks a workspace member on a paid team plan from creating a duplicate solo subscription', async () => {
      // User row shows plan='free' (no direct solo sub), but they are a member of
      // a paid Team workspace. effectivePlanFor returns 'team'.
      vi.mocked(db.user.findUnique).mockResolvedValue(
        makeUser({ plan: 'free', subscriptionStatus: 'active' }) as never,
      );
      vi.mocked(effectivePlanFor).mockResolvedValue('team');

      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('already_subscribed');
      // Stripe Checkout must NOT be created — no double-billing
      expect(mockCheckoutCreate).not.toHaveBeenCalled();
    });

    it('allows a free-plan user with no workspace membership to proceed to checkout', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      vi.mocked(effectivePlanFor).mockResolvedValue('free');

      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(200);
      expect(mockCheckoutCreate).toHaveBeenCalledOnce();
    });

    it('calls effectivePlanFor with the correct userId', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      vi.mocked(effectivePlanFor).mockResolvedValue('free');

      await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(vi.mocked(effectivePlanFor)).toHaveBeenCalledWith(TEST_USER_ID);
    });
  });

  // ── Billing hardening (2026-08): upgrade/downgrade/reactivation audit ─────
  //
  // Prior to this fix, the already_subscribed gate ONLY checked
  // subscriptionStatus === 'active'. A mid-trial subscriber ('trialing') or
  // a subscriber whose last renewal failed ('past_due') could therefore
  // start a completely SEPARATE second Checkout Session for a different
  // plan — Stripe would then actively bill TWO parallel subscriptions for
  // the same customer. This block proves the fix and locks the correct
  // counterpart behavior (cancellation + reactivation must NOT be blocked).

  describe('open-subscription gate (billing hardening 2026-08)', () => {
    it('blocks a mid-trial subscriber ("trialing") from starting a second parallel Checkout Session', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        makeUser({ plan: 'starter', subscriptionStatus: 'trialing' }) as never,
      );
      vi.mocked(effectivePlanFor).mockResolvedValueOnce('starter');

      const res = await POST(makeRequest({ plan: 'solo', interval: 'monthly' }));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('already_subscribed');
      expect(mockCheckoutCreate).not.toHaveBeenCalled();
    });

    it('blocks a past_due subscriber from starting a second parallel Checkout Session', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        makeUser({ plan: 'starter', subscriptionStatus: 'past_due' }) as never,
      );
      vi.mocked(effectivePlanFor).mockResolvedValueOnce('starter');

      const res = await POST(makeRequest({ plan: 'solo', interval: 'monthly' }));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('already_subscribed');
      expect(mockCheckoutCreate).not.toHaveBeenCalled();
    });

    it('allows reactivation after cancellation ("canceled" + cleared stripeSubscriptionId) — no trial re-granted', async () => {
      // Mirrors the real post-webhook state after customer.subscription.deleted:
      // plan reverts to 'free' at the DB layer for the already_subscribed check
      // (effectivePlanFor reads the live plan), stripeSubscriptionId is
      // cleared, status is 'canceled', but stripeCustomerId is PRESERVED
      // (Stripe customer reuse — see webhook/route.ts customer.subscription.deleted).
      vi.mocked(db.user.findUnique).mockResolvedValue(
        makeUser({
          plan: 'free',
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: null,
          stripeCustomerId: TEST_CUSTOMER_ID,
        }) as never,
      );
      vi.mocked(effectivePlanFor).mockResolvedValueOnce('free');

      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));

      expect(res.status).toBe(200);
      expect(mockCheckoutCreate).toHaveBeenCalledOnce();
      // Reuses the existing Stripe customer — no new customer created.
      expect(mockCustomerCreate).not.toHaveBeenCalled();
      // No second trial for a cancelled-then-resubscribed user.
      const args = mockCheckoutCreate.mock.calls[0]![0];
      expect(args.subscription_data?.trial_period_days).toBeUndefined();
    });

    it('allows a fresh (never-subscribed) user with subscriptionStatus="none" to proceed', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        makeUser({ plan: 'free', subscriptionStatus: 'none' }) as never,
      );
      vi.mocked(effectivePlanFor).mockResolvedValueOnce('free');

      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(200);
      expect(mockCheckoutCreate).toHaveBeenCalledOnce();
    });
  });

  // ── Promotion codes + Stripe Tax defaults (2026-08 monetization-shapes hardening) ──
  // This file's mock sets ALLOW_PROMOTION_CODES: true / AUTOMATIC_TAX_ENABLED:
  // false, matching the REAL module's shipped defaults (see stripe.ts). These
  // tests prove the route wires whatever @/lib/stripe exports onto the
  // Checkout Session correctly under the production-default configuration.

  describe('promotion codes + Stripe Tax — default configuration', () => {
    it('subscription Checkout Sessions have promotion codes enabled by default', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(200);

      const args = mockCheckoutCreate.mock.calls[0]![0];
      expect(args.allow_promotion_codes).toBe(true);
    });

    it('automatic_tax is OFF by default and adds no tax/address fields — checkout still succeeds (unconfigured-tax degrades safely)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.url).toMatch(/checkout\.stripe\.com/);

      const args = mockCheckoutCreate.mock.calls[0]![0];
      expect(args.automatic_tax).toBeUndefined();
      expect(args.billing_address_collection).toBeUndefined();
      expect(args.customer_update).toBeUndefined();
    });
  });

  // ── One-time payments (mode: 'payment') — 2026-08 monetization-shapes hardening ──
  // getOneTimePriceId (mocked above) resolves '__configured_sku__' to a price
  // and everything else — including the real placeholder key
  // 'example_onboarding_audit' — to null, exercising both the happy path and
  // the "not configured" 503 default.

  describe('one-time payments (type: "one_time", mode: "payment")', () => {
    it('creates a mode:"payment" Checkout Session for a configured SKU, independent of the subscription path', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      const res = await POST(makeRequest({ type: 'one_time', sku: '__configured_sku__' }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.url).toMatch(/checkout\.stripe\.com/);

      const args = mockCheckoutCreate.mock.calls[0]![0];
      expect(args.mode).toBe('payment');
      expect(args.line_items[0].price).toBe('price_one_time_test_sku');
      expect(args.line_items[0].quantity).toBe(1);
      expect(args.subscription_data).toBeUndefined();
      expect(args.metadata.userId).toBe(TEST_USER_ID);
      expect(args.metadata.type).toBe('one_time');
      expect(args.metadata.sku).toBe('__configured_sku__');
      // Inherits the same default promotion-code wiring as subscriptions.
      expect(args.allow_promotion_codes).toBe(true);
    });

    it('respects an explicit quantity', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      await POST(makeRequest({ type: 'one_time', sku: '__configured_sku__', quantity: 3 }));
      const args = mockCheckoutCreate.mock.calls[0]![0];
      expect(args.line_items[0].quantity).toBe(3);
    });

    it('ignores a non-positive/non-integer quantity and falls back to 1', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      await POST(makeRequest({ type: 'one_time', sku: '__configured_sku__', quantity: -1 }));
      const args = mockCheckoutCreate.mock.calls[0]![0];
      expect(args.line_items[0].quantity).toBe(1);
    });

    it('returns 503 "not configured" for the real placeholder SKU key (inert by default, matching production)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      const res = await POST(makeRequest({ type: 'one_time', sku: 'example_onboarding_audit' }));
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.sku).toBe('example_onboarding_audit');
      expect(mockCheckoutCreate).not.toHaveBeenCalled();
    });

    it('returns code=sku_not_configured for an unconfigured SKU (G1/G2 — was the uncoded "Billing not configured for this SKU")', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      const res = await POST(makeRequest({ type: 'one_time', sku: 'example_onboarding_audit' }));
      const body = await res.json();
      expect(body.code).toBe('sku_not_configured');
    });

    it('returns code=checkout_session_failed when Stripe Checkout Session creation throws on the one-time path (G2)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      mockCheckoutCreate.mockRejectedValueOnce(new Error('stripe down'));

      const res = await POST(makeRequest({ type: 'one_time', sku: '__configured_sku__' }));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.code).toBe('checkout_session_failed');
    });

    it('returns 400 code="missing_sku" when sku is omitted', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      const res = await POST(makeRequest({ type: 'one_time' }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('missing_sku');
      expect(mockCheckoutCreate).not.toHaveBeenCalled();
    });

    it('reuses an existing Stripe customer rather than creating a new one', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        makeUser({ stripeCustomerId: TEST_CUSTOMER_ID }) as never,
      );

      await POST(makeRequest({ type: 'one_time', sku: '__configured_sku__' }));

      expect(mockCustomerCreate).not.toHaveBeenCalled();
      const args = mockCheckoutCreate.mock.calls[0]![0];
      expect(args.customer).toBe(TEST_CUSTOMER_ID);
    });

    it('bypasses the already-subscribed gate — an existing active subscriber can still buy a one-time SKU', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        makeUser({ plan: 'starter', subscriptionStatus: 'active' }) as never,
      );
      vi.mocked(effectivePlanFor).mockResolvedValueOnce('starter');

      const res = await POST(makeRequest({ type: 'one_time', sku: '__configured_sku__' }));
      expect(res.status).toBe(200);
      expect(mockCheckoutCreate).toHaveBeenCalledOnce();
    });

    it('bypasses the Team/Growth workspace-build waitlist gate — sku purchases are unrelated to plan tier', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      // Same user, same request shape, but type: 'one_time' — must not hit
      // the 402 awaiting_workspace_build path that a plan: 'team' request
      // would (that gate only runs on the subscription branch).
      const res = await POST(makeRequest({ type: 'one_time', sku: '__configured_sku__' }));
      expect(res.status).toBe(200);
    });

    it('does not disturb the subscription checkout path — a subscription request in the same test run still creates mode: "subscription" with no one-time fields', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
      expect(res.status).toBe(200);

      const args = mockCheckoutCreate.mock.calls[0]![0];
      expect(args.mode).toBe('subscription');
      expect(args.metadata.type).toBeUndefined();
      expect(args.metadata.sku).toBeUndefined();
      expect(args.subscription_data).toBeDefined();
    });

    it('defaults type to "subscription" when the body omits it entirely (backward compatibility)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      const res = await POST(makeRequest({}));
      expect(res.status).toBe(200);

      const args = mockCheckoutCreate.mock.calls[0]![0];
      expect(args.mode).toBe('subscription');
    });
  });

  // ── Process Audit hard qualification gate (SKU_SPEC_001 §2) ────────────────
  // THE single most important test group in this file per the task brief: a
  // customer below the recorded-run threshold must not be able to initiate a
  // Process Audit purchase — enforced server-side, not merely a UI disabled
  // state. Guided Onboarding carries no such gate and must be unaffected.

  describe('Process Audit purchase gate (sku: "process_audit")', () => {
    it('BLOCKS checkout with 403 when the user has zero qualifying processes (0 recorded processes at all)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      vi.mocked(getAuditEligibility).mockResolvedValueOnce({
        eligible: false,
        minRunsRequired: 5,
        processes: [],
      });

      const res = await POST(makeRequest({ type: 'one_time', sku: 'process_audit' }));

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('audit_not_eligible');
      expect(body.minRunsRequired).toBe(5);
      // Must not have created a Stripe Checkout Session — the gate blocks
      // BEFORE any Stripe API call, not after.
      expect(mockCheckoutCreate).not.toHaveBeenCalled();
    });

    it('BLOCKS checkout with 403 when every recorded process is below the 5-run threshold (e.g. 2 recordings)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      vi.mocked(getAuditEligibility).mockResolvedValueOnce({
        eligible: false,
        minRunsRequired: 5,
        processes: [
          { id: 'p1', canonicalName: 'Invoice Approval', runCount: 2, qualifies: false },
        ],
      });

      const res = await POST(makeRequest({ type: 'one_time', sku: 'process_audit' }));

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('audit_not_eligible');
      expect(mockCheckoutCreate).not.toHaveBeenCalled();
    });

    it('ALLOWS checkout when at least one process meets the 5-run threshold', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      vi.mocked(getAuditEligibility).mockResolvedValueOnce({
        eligible: true,
        minRunsRequired: 5,
        processes: [
          { id: 'p1', canonicalName: 'Refund Processing', runCount: 5, qualifies: true },
        ],
      });

      const res = await POST(makeRequest({ type: 'one_time', sku: 'process_audit' }));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.url).toMatch(/checkout\.stripe\.com/);
      expect(mockCheckoutCreate).toHaveBeenCalledOnce();
      const args = mockCheckoutCreate.mock.calls[0]![0];
      expect(args.metadata.sku).toBe('process_audit');
    });

    it('checks eligibility for the AUTHENTICATED user, not a client-suppliable id', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      vi.mocked(getAuditEligibility).mockResolvedValueOnce({
        eligible: true,
        minRunsRequired: 5,
        processes: [],
      });

      await POST(makeRequest({ type: 'one_time', sku: 'process_audit' }));

      expect(getAuditEligibility).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('does NOT run the eligibility check for guided_onboarding — the gate is audit-specific', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      const res = await POST(makeRequest({ type: 'one_time', sku: 'guided_onboarding' }));

      expect(res.status).toBe(200);
      expect(getAuditEligibility).not.toHaveBeenCalled();
    });

    it('does NOT run the eligibility check for an unrelated configured SKU', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

      const res = await POST(makeRequest({ type: 'one_time', sku: '__configured_sku__' }));

      expect(res.status).toBe(200);
      expect(getAuditEligibility).not.toHaveBeenCalled();
    });

    it('returns 503 "not configured" BEFORE checking eligibility when the Stripe Price is not yet set up', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
      // Real placeholder-style unconfigured key: getOneTimePriceId mock
      // returns null for anything other than the three sentinel keys.
      const res = await POST(makeRequest({ type: 'one_time', sku: 'process_audit_unconfigured' }));

      expect(res.status).toBe(503);
      expect(getAuditEligibility).not.toHaveBeenCalled();
    });

    it('a Free-plan user with a qualifying process can still buy the audit — no plan-tier restriction, only the run-count gate', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(makeUser({ plan: 'free' }) as never);
      vi.mocked(effectivePlanFor).mockResolvedValueOnce('free');
      vi.mocked(getAuditEligibility).mockResolvedValueOnce({
        eligible: true,
        minRunsRequired: 5,
        processes: [{ id: 'p1', canonicalName: 'Weekly Report', runCount: 5, qualifies: true }],
      });

      const res = await POST(makeRequest({ type: 'one_time', sku: 'process_audit' }));
      expect(res.status).toBe(200);
    });
  });
});
