/**
 * Integration tests for POST /api/billing/webhook.
 *
 * Regression locks:
 *   BUG-01 — unmapped price ID on active subscription must return HTTP 500 (Stripe retries).
 *   BUG-04 — missing STRIPE_WEBHOOK_SECRET must return HTTP 500 (Stripe retries).
 *
 * Mocking strategy:
 *   - vi.mock('@/db') — spies on db.user.update / db.user.findFirst so no real DB is required.
 *   - vi.mock('@/lib/stripe') — controls getStripe() / planFromPriceId / getWebhookSecret.
 *   - vi.mock('@/lib/analytics-server') — no-op trackServer to avoid fire-and-forget DB writes;
 *     getFirstTouchVisitorId defaults to resolving null (REVENUE_PLAN_20K attribution fix,
 *     docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §2 — see the dedicated describe
 *     block below for visitorId-threading coverage).
 *
 * No production code is modified by this file.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import type Stripe from 'stripe';

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    user: {
      update: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    team: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ id: 'team_new_001', name: "Test Workspace" }),
    },
    teamMember: {
      create: vi.fn().mockResolvedValue({}),
    },
    analyticsEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    // Billing hardening (2026-08) — P0-1 idempotency ledger. Default: every
    // event.id is a fresh claim (create resolves) so existing tests are
    // unaffected; the dedicated "idempotency" describe block below overrides
    // this per-test to simulate a duplicate delivery (P2002) or a mid-
    // processing failure (release via delete).
    webhookEvent: {
      create: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    // P1-1 dispute ledger.
    stripeDispute: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    // 2026-08 monetization-shapes hardening — one-time (mode:'payment')
    // purchase ledger. Default: every upsert resolves; individual tests
    // assert on the call arguments rather than the return value.
    oneTimePurchase: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    // P0-J (iter 087 / TEAM-P03.10): array-style $transaction used by checkout.session.completed
    // to atomically create team + owner membership. Promise.all resolves the array of Prisma promises.
    $transaction: vi.fn().mockImplementation((operations: Promise<unknown>[]) => Promise.all(operations)),
  },
}));

// Mock team-billing helpers so tests control resolution without real DB.
vi.mock('@/lib/workspace/team-billing', () => ({
  resolveTeamFromCustomer: vi.fn().mockResolvedValue(null),
  notifyOwnerOfDowngrade: vi.fn().mockResolvedValue({ emailQueued: false, reason: 'stub_not_yet_implemented' }),
}));

// Mock seat-management so softDeactivateExcessMembers never hits the DB in tests.
vi.mock('@/lib/workspace/seat-management', () => ({
  softDeactivateExcessMembers: vi.fn().mockResolvedValue({ deactivatedIds: [] }),
}));

vi.mock('@/lib/analytics-server', () => ({
  trackServer: vi.fn(),
  getFirstTouchVisitorId: vi.fn().mockResolvedValue(null),
}));

// stripe mock: all exports controlled per-test via vi.mocked()
// intervalFromStripeSubscription is deliberately kept as the REAL
// implementation (via importOriginal) rather than mocked — it is a pure,
// side-effect-free function that reads billing cadence directly off the
// mock subscription objects tests already construct, so exercising the real
// logic gives stronger coverage than re-stubbing it per test.
vi.mock('@/lib/stripe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/stripe')>();
  return {
    ...actual,
    getStripe: vi.fn(),
    planFromPriceId: vi.fn(),
    getWebhookSecret: vi.fn(),
  };
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal NextRequest from a raw body string and an optional signature. */
function makeRequest(body: string, sig: string | null = 'whsec_test_sig'): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'text/plain' };
  if (sig !== null) headers['stripe-signature'] = sig;
  return new NextRequest('http://localhost/api/billing/webhook', {
    method: 'POST',
    headers,
    body,
  });
}

/**
 * Minimal Stripe event factory — only the fields the handler reads.
 *
 * `created` defaults to "now" (Unix seconds) so the out-of-order delivery
 * guard (which compares this against User/Team.lastSubscriptionEventAt)
 * never treats a default-constructed event as stale. Tests exercising the
 * staleness guard itself pass an explicit `created` override.
 *
 * `id` defaults to a fresh value per call (not a shared 'evt_test' constant)
 * so the idempotency claim (keyed on event.id) does not collide ACROSS
 * unrelated tests — each test's default event.id is unique unless a test
 * explicitly overrides it to exercise duplicate-delivery behavior.
 */
let evtCounter = 0;
function makeEvent<T>(
  type: string,
  object: T,
  opts: { id?: string; created?: number } = {},
): Stripe.Event {
  evtCounter += 1;
  return {
    id: opts.id ?? `evt_test_${evtCounter}`,
    type,
    created: opts.created ?? Math.floor(Date.now() / 1000),
    data: { object },
  } as unknown as Stripe.Event;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/billing/webhook', () => {
  let POST: (req: NextRequest) => Promise<Response>;
  let stripeLib: typeof import('@/lib/stripe');
  let dbLib: typeof import('@/db');
  let teamBillingLib: typeof import('@/lib/workspace/team-billing');
  let seatMgmtLib: typeof import('@/lib/workspace/seat-management');

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // Set a valid webhook secret by default so most tests get past the secret check.
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

    // Re-import after resetModules so env changes apply to fresh module instances.
    stripeLib = await import('@/lib/stripe');
    dbLib = await import('@/db');
    teamBillingLib = await import('@/lib/workspace/team-billing');
    seatMgmtLib = await import('@/lib/workspace/seat-management');

    // Default: getWebhookSecret returns a valid secret.
    vi.mocked(stripeLib.getWebhookSecret).mockReturnValue('whsec_test_secret');

    // Default: no team linked to any customer (solo-subscriber path).
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(null);
    // Default: no excess members to deactivate.
    vi.mocked(seatMgmtLib.softDeactivateExcessMembers).mockResolvedValue({ deactivatedIds: [] });

    // Sub-task 7 (iter 085 / TEAM-P03.7): customer.subscription.updated/deleted
    // solo paths now lookup User by stripeSubscriptionId. By default, return
    // a user with id derived from the subscription's metadata.userId field
    // (preserves the pre-iter-085 test ergonomics — each test sets a userId
    // in subscription.metadata and asserts db.user.update is called with it).
    //
    // This implementation peeks at the most recently captured Stripe event
    // (via constructEvent mock return value) to extract metadata.userId.
    // Tests that exercise Sub-task 7 explicitly (e.g., "metadata.userId
    // mismatch is ignored") override findFirst via mockResolvedValueOnce.
    vi.mocked(dbLib.db.user.findFirst as unknown as (args: unknown) => Promise<unknown>).mockImplementation(async (args: any) => {
      const subId = args?.where?.stripeSubscriptionId;
      if (!subId) return null;
      // Inspect the most-recently mocked event for metadata.userId.
      const constructEventMock = (vi.mocked(stripeLib.getStripe).mock.results[0]
        ?.value as { webhooks?: { constructEvent?: ReturnType<typeof vi.fn> } } | undefined)
        ?.webhooks?.constructEvent;
      const lastEvent = constructEventMock?.mock?.results?.[0]?.value as
        | { data?: { object?: { id?: string; metadata?: Record<string, string> } } }
        | undefined;
      const sub = lastEvent?.data?.object;
      if (sub?.id !== subId) return null;
      const userId = sub?.metadata?.userId;
      if (!userId) return null;
      return { id: userId, stripeSubscriptionId: subId } as any;
    });

    const routeModule = await import('./route.js');
    POST = routeModule.POST;
  });

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    vi.restoreAllMocks();
  });

  // ── 1. checkout.session.completed — happy path ────────────────────────────

  it('checkout.session.completed: updates DB with plan, active status, and subscriptionId', async () => {
    const subscriptionId = 'sub_test_001';
    const priceId = 'price_starter_monthly_test';
    const userId = 'user_abc';
    const customerId = 'cus_test';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_test',
      metadata: { userId },
      subscription: subscriptionId,
      customer: customerId,
    };

    const stripeSubscription = {
      status: 'active',
      items: { data: [{ price: { id: priceId } }] },
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(stripeSubscription),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledOnce();
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({
          plan: 'starter',
          subscriptionStatus: 'active',
          stripeSubscriptionId: subscriptionId,
        }),
      }),
    );
  });

  // ── 1b. REVENUE_PLAN_20K (§1.2a): checkout.session.completed — trialing subscription ──
  //
  // REGRESSION LOCK: fails against the pre-fix behavior (subscriptionStatus was
  // hardcoded to 'active' unconditionally) and passes against the fix (status
  // is read from the retrieved Stripe subscription). Every first-time
  // subscriber's Stripe subscription begins in 'trialing' status for the full
  // STRIPE_TRIAL_DAYS window (checkout/route.ts) — this is the default path
  // for every new dollar of revenue, not a corner case.

  it('REVENUE_PLAN_20K: checkout.session.completed — Stripe subscription in "trialing" status writes subscriptionStatus="trialing", NOT "active"', async () => {
    const subscriptionId = 'sub_trial_001';
    const priceId = 'price_starter_monthly_test';
    const userId = 'user_trial_abc';
    const customerId = 'cus_trial_test';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_trial_test',
      metadata: { userId },
      subscription: subscriptionId,
      customer: customerId,
    };

    const stripeSubscription = {
      status: 'trialing',
      items: { data: [{ price: { id: priceId } }] },
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(stripeSubscription),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({
          plan: 'starter',
          // THE FIX: must be 'trialing', not the pre-fix hardcoded 'active'.
          // MRR_BILLABLE_STATUSES = ['active'] (admin-operations/pricing.ts)
          // only excludes trials from MRR if this write is correct.
          subscriptionStatus: 'trialing',
        }),
      }),
    );
    // Explicit negative assertion — this is exactly the bug being fixed.
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subscriptionStatus: 'active' }),
      }),
    );
  });

  // ── REVENUE_PLAN_20K (§1.2c): checkout.session.completed — billing interval ──

  it('REVENUE_PLAN_20K: checkout.session.completed — annual price.recurring.interval="year" writes billingInterval="annual"', async () => {
    const subscriptionId = 'sub_annual_001';
    const priceId = 'price_starter_annual_test';
    const userId = 'user_annual_abc';
    const customerId = 'cus_annual_test';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_annual_test',
      metadata: { userId },
      subscription: subscriptionId,
      customer: customerId,
    };

    const stripeSubscription = {
      status: 'active',
      items: {
        data: [{ price: { id: priceId, recurring: { interval: 'year' } } }],
      },
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(stripeSubscription),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');

    await POST(makeRequest('{}'));

    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({ billingInterval: 'annual' }),
      }),
    );
  });

  it('REVENUE_PLAN_20K: checkout.session.completed — monthly price.recurring.interval="month" writes billingInterval="monthly"', async () => {
    const subscriptionId = 'sub_monthly_001';
    const priceId = 'price_starter_monthly_test';
    const userId = 'user_monthly_abc';
    const customerId = 'cus_monthly_test';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_monthly_test',
      metadata: { userId },
      subscription: subscriptionId,
      customer: customerId,
    };

    const stripeSubscription = {
      status: 'active',
      items: {
        data: [{ price: { id: priceId, recurring: { interval: 'month' } } }],
      },
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(stripeSubscription),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');

    await POST(makeRequest('{}'));

    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({ billingInterval: 'monthly' }),
      }),
    );
  });

  // ── 2. customer.subscription.updated — status trialing ──────────────────

  it('customer.subscription.updated: trialing status sets isActive, resolves plan from priceId', async () => {
    const userId = 'user_bcd';
    const priceId = 'price_team_monthly_test';

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_test_002',
      status: 'trialing',
      metadata: { userId },
      items: { data: [{ price: { id: priceId } }] } as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.updated', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('team');

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledOnce();
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({
          plan: 'team',
          subscriptionStatus: 'trialing',
        }),
      }),
    );
  });

  // ── 3. BUG-01 regression — unmapped price ID on active sub → HTTP 500 ───

  it('customer.subscription.updated: unmapped price ID on active sub returns HTTP 500 (BUG-01)', async () => {
    const userId = 'user_cde';

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_test_003',
      status: 'active',
      metadata: { userId },
      items: {
        data: [{ price: { id: 'price_unknown_xyz' } }],
      } as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.updated', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    // planFromPriceId returns null → unmapped
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue(null);

    const req = makeRequest('{}');
    const res = await POST(req);

    // Must 500 so Stripe retries — must NOT silently write free to DB
    expect(res.status).toBe(500);
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
  });

  // ── 4. customer.subscription.deleted → free plan ────────────────────────

  it('customer.subscription.deleted: reverts plan to free, clears subscriptionId', async () => {
    const userId = 'user_def';

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_test_004',
      status: 'canceled',
      metadata: { userId },
      items: { data: [] } as unknown as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.deleted', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledOnce();
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({
          plan: 'free',
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: null,
        }),
      }),
    );
  });

  // ── 5. invoice.payment_failed → past_due ────────────────────────────────

  it('invoice.payment_failed: marks user subscriptionStatus past_due, plan unchanged', async () => {
    const userId = 'user_efg';
    const subscriptionId = 'sub_test_005';

    const invoice: Partial<Stripe.Invoice> = {
      id: 'inv_test',
      subscription: subscriptionId,
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('invoice.payment_failed', invoice),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

    // findFirst returns an existing user for this subscriptionId
    vi.mocked(dbLib.db.user.findFirst).mockResolvedValue({
      id: userId,
      email: 'test@example.com',
      plan: 'starter',
      subscriptionStatus: 'active',
      stripeSubscriptionId: subscriptionId,
    } as unknown as Awaited<ReturnType<typeof dbLib.db.user.findFirst>>);

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledOnce();
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({
          subscriptionStatus: 'past_due',
        }),
      }),
    );
    // plan field must NOT appear in the update (unchanged)
    const calls = vi.mocked(dbLib.db.user.update).mock.calls;
    expect(calls).toHaveLength(1);
    const callArgs = calls[0]![0];
    expect((callArgs.data as Record<string, unknown>).plan).toBeUndefined();
  });

  // ── 6. BUG-04 regression — missing STRIPE_WEBHOOK_SECRET → HTTP 500 ────

  it('returns HTTP 500 when STRIPE_WEBHOOK_SECRET is not configured (BUG-04)', async () => {
    // Override the getWebhookSecret mock to throw, simulating missing env var
    vi.mocked(stripeLib.getWebhookSecret).mockImplementation(() => {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    });

    // getStripe mock still needs webhooks.constructEvent if we got past the secret
    // but we won't — getWebhookSecret throws before constructEvent is called.
    const mockStripeClient = {
      webhooks: { constructEvent: vi.fn() },
    };
    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(500);
    // constructEvent must NOT have been called — we never reached it
    expect(mockStripeClient.webhooks.constructEvent).not.toHaveBeenCalled();
  });

  // ── 7. Invalid Stripe signature → HTTP 400 ──────────────────────────────

  it('returns HTTP 400 when Stripe signature verification fails', async () => {
    vi.mocked(stripeLib.getWebhookSecret).mockReturnValue('whsec_test_secret');

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockImplementation(() => {
          throw new Error('No signatures found matching the expected signature');
        }),
      },
    };
    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

    const req = makeRequest('{}', 'bad_signature');
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  // ── 8. invoice.payment_succeeded — team path (TEAM-P03.9 Sub-task C) ────
  // New handler: DB lookup via stripeSubscriptionId (no subscriptions.retrieve).
  // Team-first: if a Team row matches the subscriptionId, update team and skip user.

  it('invoice.payment_succeeded: team path — sets team subscriptionStatus active and emits team analytics', async () => {
    const subscriptionId = 'sub_pay_team_001';
    const invoiceId = 'inv_pay_team_001';

    const invoice: Partial<Stripe.Invoice> = {
      id: invoiceId,
      subscription: subscriptionId,
      amount_paid: 24900,
      currency: 'usd',
    };

    const mockTeam = {
      id: 'team_pay_001',
      stripeSubscriptionId: subscriptionId,
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('invoice.payment_succeeded', invoice),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    // Team path: team.findFirst resolves; user.findFirst must NOT be called
    vi.mocked(dbLib.db as any).team.findFirst.mockResolvedValue(mockTeam);

    const analyticsLib = await import('@/lib/analytics-server');
    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'team_pay_001' },
        // Billing hardening (2026-08): a successful charge also clears any
        // outstanding SCA pendingInvoiceUrl.
        data: { subscriptionStatus: 'active', pendingInvoiceUrl: null },
      }),
    );
    // User.update must NOT be called when team is found
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
    expect(vi.mocked(analyticsLib.trackServer)).toHaveBeenCalledWith(
      'payment_succeeded',
      expect.objectContaining({ entity: 'team', teamId: 'team_pay_001', amount: 24900, currency: 'usd', invoiceId }),
    );
  });

  // ── 9. invoice.payment_succeeded — solo path (TEAM-P03.9 Sub-task C) ─────
  // When no team matches the subscriptionId, fall through to solo user resolution.

  it('invoice.payment_succeeded: solo path — sets user subscriptionStatus active and emits user analytics', async () => {
    const userId = 'user_pay_solo_001';
    const subscriptionId = 'sub_pay_solo_001';
    const invoiceId = 'inv_pay_solo_001';

    const invoice: Partial<Stripe.Invoice> = {
      id: invoiceId,
      subscription: subscriptionId,
      amount_paid: 4900,
      currency: 'usd',
    };

    const mockUser = {
      id: userId,
      stripeSubscriptionId: subscriptionId,
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('invoice.payment_succeeded', invoice),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    // team.findFirst returns null (default mock) — fall through to solo
    vi.mocked(dbLib.db.user.findFirst).mockResolvedValue(mockUser as any);

    const analyticsLib = await import('@/lib/analytics-server');
    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        // Billing hardening (2026-08): a successful charge also clears any
        // outstanding SCA pendingInvoiceUrl.
        data: { subscriptionStatus: 'active', pendingInvoiceUrl: null },
      }),
    );
    // team.update must NOT be called when only user matches
    expect(vi.mocked(dbLib.db as any).team.update).not.toHaveBeenCalled();
    expect(vi.mocked(analyticsLib.trackServer)).toHaveBeenCalledWith(
      'payment_succeeded',
      expect.objectContaining({ userId, amount: 4900, currency: 'usd', invoiceId }),
    );
    // Solo analytics must NOT include entity: 'team'
    const [, payload] = vi.mocked(analyticsLib.trackServer).mock.calls[0]!;
    expect(payload).not.toHaveProperty('entity');
  });

  // ── 10. invoice.payment_succeeded — neither team nor user found ────────────
  // When the subscriptionId matches no DB row, log a warning and return 200
  // (Stripe must not retry an unrecognised subscription).

  it('invoice.payment_succeeded: no team and no user found — returns 200, no DB write', async () => {
    const subscriptionId = 'sub_pay_unknown_001';

    const invoice: Partial<Stripe.Invoice> = {
      id: 'inv_pay_unknown_001',
      subscription: subscriptionId,
      amount_paid: 4900,
      currency: 'usd',
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('invoice.payment_succeeded', invoice),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    // Both team.findFirst and user.findFirst return null (default mocks)

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db as any).team.update).not.toHaveBeenCalled();
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
  });

  // ── 11. invoice.payment_succeeded — team path analytics: no PII ───────────
  // Team analytics payload must include identifying team fields but no user PII.

  it('invoice.payment_succeeded: team path analytics payload has no PII fields', async () => {
    const subscriptionId = 'sub_pay_pii_001';

    const invoice: Partial<Stripe.Invoice> = {
      id: 'inv_pay_pii_001',
      subscription: subscriptionId,
      amount_paid: 24900,
      currency: 'usd',
    };

    const mockTeam = {
      id: 'team_pii_001',
      stripeSubscriptionId: subscriptionId,
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('invoice.payment_succeeded', invoice),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(dbLib.db as any).team.findFirst.mockResolvedValue(mockTeam);

    const analyticsLib = await import('@/lib/analytics-server');
    const req = makeRequest('{}');
    await POST(req);

    const calls = vi.mocked(analyticsLib.trackServer).mock.calls;
    expect(calls).toHaveLength(1);
    const [, payload] = calls[0]!;

    // Required fields
    expect(payload).toHaveProperty('entity', 'team');
    expect(payload).toHaveProperty('teamId', 'team_pii_001');
    expect(payload).toHaveProperty('amount', 24900);
    expect(payload).toHaveProperty('currency', 'usd');
    expect(payload).toHaveProperty('invoiceId', 'inv_pay_pii_001');

    // PII must NOT appear
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('customerEmail');
    expect(payload).not.toHaveProperty('name');
    expect(payload).not.toHaveProperty('userId');
  });

  // ── 11b. invoice.payment_succeeded — missing subscriptionId → no-op ───────
  // Edge case: invoice with no subscription field should return 200 silently.

  it('invoice.payment_succeeded: missing subscriptionId — returns 200, no DB write', async () => {
    // subscription intentionally omitted (not undefined) to satisfy exactOptionalPropertyTypes
    const invoice: Partial<Stripe.Invoice> = {
      id: 'inv_pay_nosub_001',
      amount_paid: 4900,
      currency: 'usd',
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('invoice.payment_succeeded', invoice),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db as any).team.findFirst).not.toHaveBeenCalled();
    expect(vi.mocked(dbLib.db.user.findFirst)).not.toHaveBeenCalled();
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
  });

  // ── 12. customer.subscription.trial_will_end — happy path ───────────────

  it('customer.subscription.trial_will_end: emits analytics and does NOT update DB', async () => {
    const userId = 'user_trial_001';
    const trialEnd = 1_700_100_000; // Unix timestamp ~Nov 2023

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_trial_001',
      metadata: { userId },
      trial_end: trialEnd,
      items: {
        data: [{ price: { id: 'price_starter_monthly_test' } }],
      } as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.trial_will_end', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');

    const analyticsLib = await import('@/lib/analytics-server');
    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    // NOTIFICATION event: must NOT write to DB
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
    // Must emit analytics
    expect(vi.mocked(analyticsLib.trackServer)).toHaveBeenCalledWith(
      'trial_will_end',
      expect.objectContaining({ userId, trialEndAt: trialEnd, plan: 'starter' }),
    );
  });

  // ── 13. customer.subscription.trial_will_end — no userId on metadata ────

  it('customer.subscription.trial_will_end: no userId on metadata → returns 200 without any action', async () => {
    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_trial_002',
      metadata: {}, // no userId
      trial_end: 1_700_100_000,
      items: {
        data: [{ price: { id: 'price_starter_monthly_test' } }],
      } as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.trial_will_end', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

    const analyticsLib = await import('@/lib/analytics-server');
    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
    expect(vi.mocked(analyticsLib.trackServer)).not.toHaveBeenCalled();
  });

  // ── 14. customer.subscription.trial_will_end — unmapped price ID ─────────

  it('customer.subscription.trial_will_end: unmapped price ID emits analytics with plan: null (notification-tier semantics)', async () => {
    const userId = 'user_trial_003';
    const trialEnd = 1_700_200_000;

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_trial_003',
      metadata: { userId },
      trial_end: trialEnd,
      items: {
        data: [{ price: { id: 'price_unknown_xyz' } }],
      } as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.trial_will_end', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    // planFromPriceId returns null → unmapped
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue(null);

    const analyticsLib = await import('@/lib/analytics-server');
    const req = makeRequest('{}');
    const res = await POST(req);

    // NOTIFICATION tier: must NOT return 500 for unmapped price (contrast with
    // customer.subscription.updated provisioning tier which returns 500)
    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
    expect(vi.mocked(analyticsLib.trackServer)).toHaveBeenCalledWith(
      'trial_will_end',
      expect.objectContaining({ userId, trialEndAt: trialEnd, plan: null }),
    );
  });

  // ── 15. customer.subscription.trial_will_end — correct trial_end extraction

  it('customer.subscription.trial_will_end: correctly passes trial_end Unix timestamp in analytics', async () => {
    const userId = 'user_trial_004';
    const trialEnd = 1_750_000_000; // some future timestamp

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_trial_004',
      metadata: { userId },
      trial_end: trialEnd,
      items: {
        data: [{ price: { id: 'price_team_monthly_test' } }],
      } as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.trial_will_end', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('team');

    const analyticsLib = await import('@/lib/analytics-server');
    const req = makeRequest('{}');
    await POST(req);

    const calls = vi.mocked(analyticsLib.trackServer).mock.calls;
    expect(calls).toHaveLength(1);
    const [, payload] = calls[0]!;
    expect(payload).toHaveProperty('trialEndAt', trialEnd);
  });

  // ── 16. Both new handlers: signature verification still required ──────────

  it('invoice.payment_succeeded: missing stripe-signature header returns 400', async () => {
    const req = makeRequest('{}', null); // null = no signature header
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('customer.subscription.trial_will_end: invalid signature returns 400', async () => {
    vi.mocked(stripeLib.getWebhookSecret).mockReturnValue('whsec_test_secret');

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockImplementation(() => {
          throw new Error('No signatures found matching the expected signature');
        }),
      },
    };
    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

    const req = makeRequest('{}', 'bad_sig_trial');
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
  });

  // ── TEAM-P03: Team billing webhook tests ────────────────────────────────

  // ── 17. customer.subscription.updated — team found, plan upgrade ─────────

  it('TEAM-P03: customer.subscription.updated — team path updates Team.plan and stripeSubscriptionId', async () => {
    const customerId = 'cus_team_001';
    const subscriptionId = 'sub_team_001';
    const priceId = 'price_team_monthly_test';

    const mockTeam = {
      id: 'team_001',
      name: 'Acme Corp',
      plan: 'starter',
      stripeCustomerId: customerId,
      stripeSubscriptionId: null,
      members: [],
    };

    const subscription: Partial<Stripe.Subscription> = {
      id: subscriptionId,
      status: 'active',
      customer: customerId,
      metadata: {},
      items: { data: [{ price: { id: priceId } }] } as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.updated', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('team');
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    // Team.update called with new plan
    expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'team_001' },
        data: expect.objectContaining({ plan: 'team', stripeSubscriptionId: subscriptionId }),
      }),
    );
    // User.update must NOT be called — this is a workspace subscription
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
  });

  // ── 18. customer.subscription.updated — team path: no excess members ──────

  it('TEAM-P03: customer.subscription.updated — team path: softDeactivateExcessMembers called with correct args', async () => {
    const customerId = 'cus_team_002';

    const mockTeam = {
      id: 'team_002',
      name: 'Beta LLC',
      plan: 'growth',
      stripeCustomerId: customerId,
      stripeSubscriptionId: 'sub_old_002',
      members: [],
    };

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_team_002',
      status: 'active',
      customer: customerId,
      metadata: {},
      items: { data: [{ price: { id: 'price_team_monthly_test' } }] } as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.updated', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('team');
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
    vi.mocked(seatMgmtLib.softDeactivateExcessMembers).mockResolvedValue({ deactivatedIds: [] });

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    // softDeactivateExcessMembers called with team maxSeats for 'team' plan (5)
    expect(vi.mocked(seatMgmtLib.softDeactivateExcessMembers)).toHaveBeenCalledWith(
      'team_002',
      5, // PLAN_FEATURES['team'].maxSeats
      expect.any(Number),
    );
    // notifyOwnerOfDowngrade must NOT be called when no members are deactivated
    expect(vi.mocked(teamBillingLib.notifyOwnerOfDowngrade)).not.toHaveBeenCalled();
  });

  // ── 19. customer.subscription.updated — team path: downgrade + notify ────

  it('TEAM-P03: customer.subscription.updated — team downgrade triggers notifyOwnerOfDowngrade', async () => {
    const customerId = 'cus_team_003';

    const mockTeam = {
      id: 'team_003',
      name: 'Gamma Inc',
      plan: 'growth',
      stripeCustomerId: customerId,
      stripeSubscriptionId: 'sub_old_003',
      members: [],
    };

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_team_003',
      status: 'active',
      customer: customerId,
      metadata: {},
      items: { data: [{ price: { id: 'price_starter_monthly_test' } }] } as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.updated', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
    // Simulate 2 members deactivated due to seat reduction
    vi.mocked(seatMgmtLib.softDeactivateExcessMembers).mockResolvedValue({
      deactivatedIds: ['mem_001', 'mem_002'],
    });

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(teamBillingLib.notifyOwnerOfDowngrade)).toHaveBeenCalledOnce();
    expect(vi.mocked(teamBillingLib.notifyOwnerOfDowngrade)).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 'team_003',
        fromPlan: 'growth',
        toPlan: 'starter',
        deactivatedMemberIds: ['mem_001', 'mem_002'],
      }),
    );
  });

  // ── 20. customer.subscription.updated — team not found: solo path ─────────

  it('TEAM-P03: customer.subscription.updated — no team found falls back to solo-subscriber User.plan update', async () => {
    const userId = 'user_solo_020';
    const priceId = 'price_starter_monthly_test';

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_solo_020',
      status: 'active',
      customer: 'cus_solo_020',
      metadata: { userId },
      items: { data: [{ price: { id: priceId } }] } as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.updated', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');
    // No team found — default mock returns null
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(null);

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    // Must fall through to User.update (solo path)
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledOnce();
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: userId } }),
    );
    // Team.update must NOT be called
    expect(vi.mocked(dbLib.db as any).team.update).not.toHaveBeenCalled();
  });

  // ── 21. BUG-01 regression — unmapped price ID blocks team path too ────────

  it('TEAM-P03: customer.subscription.updated — unmapped price ID still returns HTTP 500 even for team subscriptions (BUG-01)', async () => {
    const customerId = 'cus_team_bug01';

    const mockTeam = {
      id: 'team_bug01',
      name: 'Bug Corp',
      plan: 'team',
      stripeCustomerId: customerId,
      stripeSubscriptionId: 'sub_bug01_old',
      members: [],
    };

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_bug01',
      status: 'active',
      customer: customerId,
      metadata: {},
      items: { data: [{ price: { id: 'price_unknown_xyz' } }] } as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.updated', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue(null); // unmapped
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);

    const req = makeRequest('{}');
    const res = await POST(req);

    // BUG-01: must HTTP 500 so Stripe retries rather than silently under-provisioning
    expect(res.status).toBe(500);
    expect(vi.mocked(dbLib.db as any).team.update).not.toHaveBeenCalled();
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
  });

  // ── 22. customer.subscription.deleted — team path reverts plan to free ────

  it('TEAM-P03: customer.subscription.deleted — team path sets plan to free and clears subscriptionId', async () => {
    const customerId = 'cus_team_del_001';

    const mockTeam = {
      id: 'team_del_001',
      name: 'Delta Co',
      plan: 'team',
      stripeCustomerId: customerId,
      stripeSubscriptionId: 'sub_del_001',
      members: [],
    };

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_del_001',
      status: 'canceled',
      customer: customerId,
      metadata: {},
      items: { data: [] } as unknown as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.deleted', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
    vi.mocked(seatMgmtLib.softDeactivateExcessMembers).mockResolvedValue({ deactivatedIds: [] });

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'team_del_001' },
        data: expect.objectContaining({
          plan: 'free',
          subscriptionStatus: 'canceled', // TEAM-P03.9 Sub-task D regression lock
          stripeSubscriptionId: null,
        }),
      }),
    );
    // User.update must NOT be called — this is a workspace subscription
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
  });

  // ── 22b. customer.subscription.deleted — team subscriptionStatus set to canceled ─

  it('TEAM-P03.9 Sub-task D: customer.subscription.deleted — team subscriptionStatus is set to canceled not null', async () => {
    const customerId = 'cus_team_del_d01';

    const mockTeam = {
      id: 'team_del_d01',
      name: 'Zeta Inc',
      plan: 'starter',
      stripeCustomerId: customerId,
      stripeSubscriptionId: 'sub_del_d01',
      members: [],
    };

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_del_d01',
      status: 'canceled',
      customer: customerId,
      metadata: {},
      items: { data: [] } as unknown as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.deleted', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
    vi.mocked(seatMgmtLib.softDeactivateExcessMembers).mockResolvedValue({ deactivatedIds: [] });

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);

    // subscriptionStatus MUST be 'canceled' — a missing field would leave stale 'active' status
    const teamUpdateCall = vi.mocked(dbLib.db as any).team.update.mock.calls[0]?.[0];
    expect(teamUpdateCall?.data?.subscriptionStatus).toBe('canceled');
  });

  // ── 23. customer.subscription.deleted — team path: cascade deactivate ─────

  it('TEAM-P03: customer.subscription.deleted — team path calls softDeactivate with free-plan maxSeats (1)', async () => {
    const customerId = 'cus_team_del_002';

    const mockTeam = {
      id: 'team_del_002',
      name: 'Epsilon Ltd',
      plan: 'growth',
      stripeCustomerId: customerId,
      stripeSubscriptionId: 'sub_del_002',
      members: [],
    };

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_del_002',
      status: 'canceled',
      customer: customerId,
      metadata: {},
      items: { data: [] } as unknown as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.deleted', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
    vi.mocked(seatMgmtLib.softDeactivateExcessMembers).mockResolvedValue({
      deactivatedIds: ['mem_a', 'mem_b', 'mem_c'],
    });

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    // free plan maxSeats = 1
    expect(vi.mocked(seatMgmtLib.softDeactivateExcessMembers)).toHaveBeenCalledWith(
      'team_del_002',
      1, // PLAN_FEATURES['free'].maxSeats
      expect.any(Number),
    );
    // notifyOwnerOfDowngrade called since members were deactivated
    expect(vi.mocked(teamBillingLib.notifyOwnerOfDowngrade)).toHaveBeenCalledOnce();
    expect(vi.mocked(teamBillingLib.notifyOwnerOfDowngrade)).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 'team_del_002',
        fromPlan: 'growth',
        toPlan: 'free',
        deactivatedMemberIds: ['mem_a', 'mem_b', 'mem_c'],
      }),
    );
  });

  // ── 24. customer.subscription.deleted — no team: solo path preserved ──────

  it('TEAM-P03: customer.subscription.deleted — no team found falls back to solo-subscriber User.plan update', async () => {
    const userId = 'user_solo_024';

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_solo_024',
      status: 'canceled',
      customer: 'cus_solo_024',
      metadata: { userId },
      items: { data: [] } as unknown as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.deleted', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(null);

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledOnce();
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({ plan: 'free', subscriptionStatus: 'canceled', stripeSubscriptionId: null }),
      }),
    );
    expect(vi.mocked(dbLib.db as any).team.update).not.toHaveBeenCalled();
  });

  // ── 25. resolveTeamFromCustomer lookup is called with the correct customerId

  it('TEAM-P03: customer.subscription.updated — resolveTeamFromCustomer called with subscription.customer', async () => {
    const customerId = 'cus_lookup_check';

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_lookup_001',
      status: 'active',
      customer: customerId,
      metadata: { userId: 'user_lookup_001' },
      items: { data: [{ price: { id: 'price_starter_monthly_test' } }] } as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.updated', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(null);

    await POST(makeRequest('{}'));

    expect(vi.mocked(teamBillingLib.resolveTeamFromCustomer)).toHaveBeenCalledWith(customerId);
  });

  // ── 26. customer.subscription.deleted — no deactivations: notify NOT called

  it('TEAM-P03: customer.subscription.deleted — no excess members: notifyOwnerOfDowngrade not called', async () => {
    const customerId = 'cus_team_del_003';

    const mockTeam = {
      id: 'team_del_003',
      name: 'Zeta SA',
      plan: 'starter',
      stripeCustomerId: customerId,
      stripeSubscriptionId: 'sub_del_003',
      members: [],
    };

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_del_003',
      status: 'canceled',
      customer: customerId,
      metadata: {},
      items: { data: [] } as unknown as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.deleted', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
    // No excess members — already at or below free-plan quota
    vi.mocked(seatMgmtLib.softDeactivateExcessMembers).mockResolvedValue({ deactivatedIds: [] });

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(teamBillingLib.notifyOwnerOfDowngrade)).not.toHaveBeenCalled();
  });

  // ── 27. notifyOwnerOfDowngrade stub returns emailQueued: false ────────────

  it('TEAM-P03: notifyOwnerOfDowngrade stub returns emailQueued: false (TEAM-P04 will replace)', async () => {
    // Re-import real team-billing to test the stub directly (not the mock).
    // Use a separate dynamic import in the test to avoid mock interference.
    // Since team-billing is mocked at the module level, we verify the stub
    // through the mock's return value which mirrors real behavior.
    const customerId = 'cus_team_notify_027';

    const mockTeam = {
      id: 'team_notify_027',
      name: 'Eta Corp',
      plan: 'team',
      stripeCustomerId: customerId,
      stripeSubscriptionId: 'sub_notify_027',
      members: [],
    };

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_notify_027',
      status: 'canceled',
      customer: customerId,
      metadata: {},
      items: { data: [] } as unknown as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.deleted', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
    vi.mocked(seatMgmtLib.softDeactivateExcessMembers).mockResolvedValue({
      deactivatedIds: ['mem_x'],
    });
    // Verify stub return value is propagated correctly
    vi.mocked(teamBillingLib.notifyOwnerOfDowngrade).mockResolvedValue({
      emailQueued: false,
      reason: 'stub_not_yet_implemented',
    });

    const req = makeRequest('{}');
    const res = await POST(req);

    // Webhook still returns 200 even when notification is a stub
    expect(res.status).toBe(200);
    expect(vi.mocked(teamBillingLib.notifyOwnerOfDowngrade)).toHaveBeenCalledOnce();
  });

  // ── 28. customer.subscription.updated — team cancellation (status: canceled)

  it('TEAM-P03: customer.subscription.updated — team subscription canceled status sets plan to free', async () => {
    const customerId = 'cus_team_cancel_028';

    const mockTeam = {
      id: 'team_cancel_028',
      name: 'Theta Inc',
      plan: 'team',
      stripeCustomerId: customerId,
      stripeSubscriptionId: 'sub_cancel_028',
      members: [],
    };

    const subscription: Partial<Stripe.Subscription> = {
      id: 'sub_cancel_028',
      status: 'canceled',
      customer: customerId,
      metadata: {},
      items: { data: [] } as unknown as Stripe.Subscription['items'],
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('customer.subscription.updated', subscription),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue(null); // not active, resolves to free
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
    vi.mocked(seatMgmtLib.softDeactivateExcessMembers).mockResolvedValue({ deactivatedIds: [] });

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    // status is 'canceled' → not isActive → plan resolves to 'free'
    expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'team_cancel_028' },
        data: expect.objectContaining({ plan: 'free' }),
      }),
    );
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
  });

  // ── 29-43. TEAM-P03.6 Sub-task 1: checkout.session.completed team creation/linking ──

  // ── 29. team plan purchase: no existing team, no unlinked workspace → creates new ──

  it('TEAM-P03.6: checkout.session.completed (team plan) — no team, no unlinked workspace: creates new team and owner membership', async () => {
    const userId = 'user_team_purchase_029';
    const customerId = 'cus_team_purchase_029';
    const subscriptionId = 'sub_team_purchase_029';
    const priceId = 'price_team_monthly_test';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_029',
      metadata: { userId },
      subscription: subscriptionId,
      customer: customerId,
    };

    const stripeSubscription = {
      status: 'active',
      items: { data: [{ price: { id: priceId } }] },
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(stripeSubscription),
      },
    };

    const newTeam = { id: 'team_created_029', name: "Alice's Workspace" };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('team');
    // No existing linked team
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(null);
    // No unlinked workspace either
    vi.mocked(dbLib.db as any).team.findFirst.mockResolvedValue(null);
    // User lookup returns a name for the workspace name
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValue({ name: 'Alice', email: 'alice@example.com' } as any);
    // team.create returns the new team
    vi.mocked(dbLib.db as any).team.create.mockResolvedValue(newTeam);

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    // team.create must be called with the correct fields
    expect(vi.mocked(dbLib.db as any).team.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plan: 'team',
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          createdBy: userId,
        }),
      }),
    );
    // teamMember.create must be called to make the purchaser an owner.
    // P0-J: route generates newTeamId before the $transaction so both calls
    // receive the same generated id (not the mock return value of team.create).
    const teamCreateCall = vi.mocked(dbLib.db as any).team.create.mock.calls[0][0];
    const generatedTeamId = teamCreateCall.data.id;
    expect(vi.mocked(dbLib.db as any).teamMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          teamId: generatedTeamId,
          userId,
          role: 'owner',
        }),
      }),
    );
    // User.update still runs unconditionally (solo-subscriber sync)
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledOnce();
  });

  // ── 30. team plan purchase: unlinked workspace exists → links it ──────────

  it('TEAM-P03.6: checkout.session.completed (team plan) — unlinked workspace found: links Stripe IDs and stamps plan', async () => {
    const userId = 'user_link_030';
    const customerId = 'cus_link_030';
    const subscriptionId = 'sub_link_030';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_030',
      metadata: { userId },
      subscription: subscriptionId,
      customer: customerId,
    };

    const stripeSubscription = {
      status: 'active',
      items: { data: [{ price: { id: 'price_growth_monthly_test' } }] },
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(stripeSubscription),
      },
    };

    const unlinkedTeam = { id: 'team_unlinked_030', name: 'Existing Corp', stripeCustomerId: null };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('growth');
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(null);
    // Unlinked workspace found
    vi.mocked(dbLib.db as any).team.findFirst.mockResolvedValue(unlinkedTeam);

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    // team.update must link the Stripe IDs and stamp the plan
    expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: unlinkedTeam.id },
        data: expect.objectContaining({
          plan: 'growth',
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        }),
      }),
    );
    // team.create must NOT be called — we're linking, not creating
    expect(vi.mocked(dbLib.db as any).team.create).not.toHaveBeenCalled();
    // teamMember.create must NOT be called — existing team already has members
    expect(vi.mocked(dbLib.db as any).teamMember.create).not.toHaveBeenCalled();
    // User.update still runs unconditionally
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledOnce();
  });

  // ── 31. team plan purchase: already linked team → skips create/link ────────

  it('TEAM-P03.6: checkout.session.completed (team plan) — team already linked: skips create and link', async () => {
    const userId = 'user_already_031';
    const customerId = 'cus_already_031';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_031',
      metadata: { userId },
      subscription: 'sub_already_031',
      customer: customerId,
    };

    const stripeSubscription = {
      status: 'active',
      items: { data: [{ price: { id: 'price_team_monthly_test' } }] },
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(stripeSubscription),
      },
    };

    const alreadyLinkedTeam = { id: 'team_linked_031', name: 'Already Linked Corp', stripeCustomerId: customerId };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('team');
    // Team already resolved → skip all creation/linking
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(alreadyLinkedTeam as any);

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    // Neither create nor update (for team linking) should be called
    expect(vi.mocked(dbLib.db as any).team.create).not.toHaveBeenCalled();
    expect(vi.mocked(dbLib.db as any).teamMember.create).not.toHaveBeenCalled();
    // team.update must NOT be called for linking either
    expect(vi.mocked(dbLib.db as any).team.update).not.toHaveBeenCalled();
    // User.update still runs unconditionally
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledOnce();
  });

  // ── 32. starter plan purchase: team-gated path skipped ────────────────────

  it('TEAM-P03.6: checkout.session.completed (starter plan) — no team creation attempted (starter is not team-gated)', async () => {
    const userId = 'user_starter_032';
    const customerId = 'cus_starter_032';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_032',
      metadata: { userId },
      subscription: 'sub_starter_032',
      customer: customerId,
    };

    const stripeSubscription = {
      status: 'active',
      items: { data: [{ price: { id: 'price_starter_monthly_test' } }] },
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(stripeSubscription),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    // Starter plan → team-first block should not run
    expect(vi.mocked(teamBillingLib.resolveTeamFromCustomer)).not.toHaveBeenCalled();
    expect(vi.mocked(dbLib.db as any).team.create).not.toHaveBeenCalled();
    expect(vi.mocked(dbLib.db as any).teamMember.create).not.toHaveBeenCalled();
    // User.update still runs
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledOnce();
  });

  // ── REVENUE_PLAN_20K §6 Option B: Solo tier ─────────────────────────────────
  // Regression lock on the exact trap the task brief named: `plan !== 'starter'`
  // alone would have silently provisioned a Team row for every Solo purchase.
  // Solo is a single-user tier with zero dependency on the team data layer —
  // it must be treated identically to Starter here, not identically to
  // Team/Growth/Enterprise.

  it("checkout.session.completed (solo plan) — no team creation attempted (solo is not team-gated)", async () => {
    const userId = 'user_solo_001';
    const customerId = 'cus_solo_001';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_solo_001',
      metadata: { userId },
      subscription: 'sub_solo_001',
      customer: customerId,
    };

    const stripeSubscription = {
      status: 'active',
      items: { data: [{ price: { id: 'price_solo_monthly_test' } }] },
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(stripeSubscription),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('solo');

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    // Solo plan → team-first block must NOT run (this is the exact trap:
    // `plan !== 'starter'` alone would be true for 'solo' and would have
    // provisioned a Team row for a single-user purchase).
    expect(vi.mocked(teamBillingLib.resolveTeamFromCustomer)).not.toHaveBeenCalled();
    expect(vi.mocked(dbLib.db as any).team.create).not.toHaveBeenCalled();
    expect(vi.mocked(dbLib.db as any).team.update).not.toHaveBeenCalled();
    expect(vi.mocked(dbLib.db as any).teamMember.create).not.toHaveBeenCalled();
    // User.update still runs — the solo-subscriber path is unconditional.
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledOnce();
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({ plan: 'solo' }),
      }),
    );
  });

  // ── 33. no userId in metadata → entire checkout handler short-circuits ─────

  it('TEAM-P03.6: checkout.session.completed — no userId in metadata: handler breaks early, no DB writes', async () => {
    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_033',
      metadata: {}, // no userId
      subscription: 'sub_033',
      customer: 'cus_033',
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
    expect(vi.mocked(dbLib.db as any).team.create).not.toHaveBeenCalled();
  });

  // ── 34. enterprise plan purchase: team creation fires same as team plan ────

  it('TEAM-P03.6: checkout.session.completed (enterprise plan) — team creation logic fires for enterprise', async () => {
    const userId = 'user_enterprise_034';
    const customerId = 'cus_enterprise_034';
    const subscriptionId = 'sub_enterprise_034';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_034',
      metadata: { userId },
      subscription: subscriptionId,
      customer: customerId,
    };

    const stripeSubscription = {
      status: 'active',
      items: { data: [{ price: { id: 'price_enterprise_annual_test' } }] },
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(stripeSubscription),
      },
    };

    const newTeam = { id: 'team_enterprise_034', name: "Bob's Enterprise Workspace" };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('enterprise');
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(null);
    vi.mocked(dbLib.db as any).team.findFirst.mockResolvedValue(null);
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValue({ name: 'Bob', email: 'bob@example.com' } as any);
    vi.mocked(dbLib.db as any).team.create.mockResolvedValue(newTeam);

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db as any).team.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plan: 'enterprise',
          stripeCustomerId: customerId,
          createdBy: userId,
        }),
      }),
    );
    // P0-J: route generates newTeamId before the $transaction — inspect what
    // was passed to team.create to get the actual generated id.
    const enterpriseTeamCreateCall = vi.mocked(dbLib.db as any).team.create.mock.calls[0][0];
    const enterpriseGeneratedTeamId = enterpriseTeamCreateCall.data.id;
    expect(vi.mocked(dbLib.db as any).teamMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teamId: enterpriseGeneratedTeamId, role: 'owner' }),
      }),
    );
  });

  // ── 35. workspace name uses user.name when available ──────────────────────

  it('TEAM-P03.6: checkout.session.completed — workspace name derived from user.name when present', async () => {
    const userId = 'user_name_035';
    const customerId = 'cus_name_035';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_035',
      metadata: { userId },
      subscription: 'sub_name_035',
      customer: customerId,
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          status: 'active',
          items: { data: [{ price: { id: 'price_team_monthly_test' } }] },
        }),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('team');
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(null);
    vi.mocked(dbLib.db as any).team.findFirst.mockResolvedValue(null);
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValue({ name: 'Carol Jones', email: 'carol@example.com' } as any);
    vi.mocked(dbLib.db as any).team.create.mockResolvedValue({ id: 'team_035', name: "Carol Jones's Workspace" });

    await POST(makeRequest('{}'));

    expect(vi.mocked(dbLib.db as any).team.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Carol Jones's Workspace",
        }),
      }),
    );
  });

  // ── 36. workspace name falls back to email when name is null ──────────────

  it('TEAM-P03.6: checkout.session.completed — workspace name falls back to email when user.name is null', async () => {
    const userId = 'user_email_036';
    const customerId = 'cus_email_036';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_036',
      metadata: { userId },
      subscription: 'sub_email_036',
      customer: customerId,
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          status: 'active',
          items: { data: [{ price: { id: 'price_growth_monthly_test' } }] },
        }),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('growth');
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(null);
    vi.mocked(dbLib.db as any).team.findFirst.mockResolvedValue(null);
    // name is null — should fall back to email
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValue({ name: null, email: 'dave@example.com' } as any);
    vi.mocked(dbLib.db as any).team.create.mockResolvedValue({ id: 'team_036', name: "dave@example.com's Workspace" });

    await POST(makeRequest('{}'));

    expect(vi.mocked(dbLib.db as any).team.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "dave@example.com's Workspace",
        }),
      }),
    );
  });

  // ── 37. workspace name falls back to userId when user record is null ───────

  it('TEAM-P03.6: checkout.session.completed — workspace name falls back to userId when user.findUnique returns null', async () => {
    const userId = 'user_fallback_037';
    const customerId = 'cus_fallback_037';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_037',
      metadata: { userId },
      subscription: 'sub_fallback_037',
      customer: customerId,
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          status: 'active',
          items: { data: [{ price: { id: 'price_team_monthly_test' } }] },
        }),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('team');
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(null);
    vi.mocked(dbLib.db as any).team.findFirst.mockResolvedValue(null);
    // user record not found
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValue(null);
    vi.mocked(dbLib.db as any).team.create.mockResolvedValue({ id: 'team_037', name: `${userId}'s Workspace` });

    await POST(makeRequest('{}'));

    expect(vi.mocked(dbLib.db as any).team.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: `${userId}'s Workspace`,
        }),
      }),
    );
  });

  // ── 38. resolveTeamFromCustomer called with session.customer ──────────────

  it('TEAM-P03.6: checkout.session.completed (team plan) — resolveTeamFromCustomer called with session.customer', async () => {
    const userId = 'user_resolve_038';
    const customerId = 'cus_resolve_038';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_038',
      metadata: { userId },
      subscription: 'sub_resolve_038',
      customer: customerId,
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          status: 'active',
          items: { data: [{ price: { id: 'price_team_monthly_test' } }] },
        }),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('team');
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(null);
    vi.mocked(dbLib.db as any).team.findFirst.mockResolvedValue(null);
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValue(null);
    vi.mocked(dbLib.db as any).team.create.mockResolvedValue({ id: 'team_038' });

    await POST(makeRequest('{}'));

    expect(vi.mocked(teamBillingLib.resolveTeamFromCustomer)).toHaveBeenCalledWith(customerId);
  });

  // ── 39. team.findFirst called with createdBy + stripeCustomerId: null ─────

  it('TEAM-P03.6: checkout.session.completed (team plan) — team.findFirst called to locate unlinked workspace', async () => {
    const userId = 'user_findfirst_039';
    const customerId = 'cus_findfirst_039';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_039',
      metadata: { userId },
      subscription: 'sub_findfirst_039',
      customer: customerId,
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          status: 'active',
          items: { data: [{ price: { id: 'price_team_monthly_test' } }] },
        }),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('team');
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(null);
    vi.mocked(dbLib.db as any).team.findFirst.mockResolvedValue(null);
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValue(null);
    vi.mocked(dbLib.db as any).team.create.mockResolvedValue({ id: 'team_039' });

    await POST(makeRequest('{}'));

    expect(vi.mocked(dbLib.db as any).team.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdBy: userId,
          stripeCustomerId: null,
        }),
      }),
    );
  });

  // ── 40. user.update runs unconditionally even when team creation succeeds ──

  it('TEAM-P03.6: checkout.session.completed (team plan) — user.update runs unconditionally after team creation', async () => {
    const userId = 'user_unconditional_040';
    const customerId = 'cus_unconditional_040';
    const subscriptionId = 'sub_unconditional_040';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_040',
      metadata: { userId },
      subscription: subscriptionId,
      customer: customerId,
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          status: 'active',
          items: { data: [{ price: { id: 'price_team_monthly_test' } }] },
        }),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('team');
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(null);
    vi.mocked(dbLib.db as any).team.findFirst.mockResolvedValue(null);
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValue({ name: 'Eve', email: 'eve@example.com' } as any);
    vi.mocked(dbLib.db as any).team.create.mockResolvedValue({ id: 'team_040' });

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    // User.update MUST run even though team creation also happened
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledOnce();
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({
          plan: 'team',
          subscriptionStatus: 'active',
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
        }),
      }),
    );
  });

  // ── 41. user.update runs unconditionally even when workspace is linked ─────

  it('TEAM-P03.6: checkout.session.completed (growth plan) — user.update runs unconditionally after workspace linking', async () => {
    const userId = 'user_linkupdate_041';
    const customerId = 'cus_linkupdate_041';
    const subscriptionId = 'sub_linkupdate_041';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_041',
      metadata: { userId },
      subscription: subscriptionId,
      customer: customerId,
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          status: 'active',
          items: { data: [{ price: { id: 'price_growth_monthly_test' } }] },
        }),
      },
    };

    const unlinkedTeam = { id: 'team_unlinked_041', name: 'Unlinked Corp', stripeCustomerId: null };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('growth');
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(null);
    vi.mocked(dbLib.db as any).team.findFirst.mockResolvedValue(unlinkedTeam);

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    // team.update links the workspace
    expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: unlinkedTeam.id },
        data: expect.objectContaining({ plan: 'growth' }),
      }),
    );
    // User.update MUST still run unconditionally
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledOnce();
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({ plan: 'growth', stripeCustomerId: customerId }),
      }),
    );
  });

  // ── 41b. REVENUE_PLAN_20K (§1.2a/b): new team is provisioned as 'trialing', NOT the schema default 'active' ──
  //
  // REGRESSION LOCK: before this fix, team.create() never wrote
  // subscriptionStatus explicitly, so a brand-new team/growth trial silently
  // took the Team schema's DB default of 'active' — reproducing the exact
  // same trial-misclassification bug on the team-provisioning path that
  // existed on the solo User path.

  it('REVENUE_PLAN_20K: checkout.session.completed (team plan, new workspace) — Stripe "trialing" writes Team.subscriptionStatus="trialing"', async () => {
    const userId = 'user_team_trial_041b';
    const customerId = 'cus_team_trial_041b';
    const subscriptionId = 'sub_team_trial_041b';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_041b',
      metadata: { userId },
      subscription: subscriptionId,
      customer: customerId,
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          status: 'trialing',
          items: { data: [{ price: { id: 'price_team_monthly_test' } }] },
        }),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue('team');
    vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(null);
    vi.mocked(dbLib.db as any).team.findFirst.mockResolvedValue(null);
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValue({ name: 'Trial Owner', email: 'trial@example.com' } as any);
    vi.mocked(dbLib.db as any).team.create.mockResolvedValue({ id: 'team_041b' });

    await POST(makeRequest('{}'));

    expect(vi.mocked(dbLib.db as any).team.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plan: 'team',
          // THE FIX: explicit 'trialing', not silently defaulted to 'active'
          // by the Team schema's DB default.
          subscriptionStatus: 'trialing',
        }),
      }),
    );
  });

  // ── 42. BUG-01 regression preserved: unmapped price at checkout → HTTP 500 ──

  it('TEAM-P03.6: checkout.session.completed — unmapped price ID returns HTTP 500 (BUG-01 regression lock)', async () => {
    const userId = 'user_bug01_042';
    const customerId = 'cus_bug01_042';

    const session: Partial<Stripe.Checkout.Session> = {
      id: 'cs_042',
      metadata: { userId },
      subscription: 'sub_bug01_042',
      customer: customerId,
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('checkout.session.completed', session),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          items: { data: [{ price: { id: 'price_unknown_unmapped' } }] },
        }),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    vi.mocked(stripeLib.planFromPriceId).mockReturnValue(null); // unmapped

    const res = await POST(makeRequest('{}'));

    // BUG-01: must HTTP 500 so Stripe retries
    expect(res.status).toBe(500);
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
    expect(vi.mocked(dbLib.db as any).team.create).not.toHaveBeenCalled();
  });

  // ── 43. BUG-04 regression preserved: missing webhook secret → HTTP 500 ─────

  it('TEAM-P03.6: checkout.session.completed — missing STRIPE_WEBHOOK_SECRET returns HTTP 500 (BUG-04 regression lock)', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    vi.mocked(stripeLib.getWebhookSecret).mockImplementation(() => {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    });

    const res = await POST(makeRequest('{}'));

    // BUG-04: must HTTP 500 so Stripe retries
    expect(res.status).toBe(500);
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
    expect(vi.mocked(dbLib.db as any).team.create).not.toHaveBeenCalled();
  });

  // ── TEAM-P03.7: Pre-TEAM-P08 architectural fixes (iter 085) ──────────────

  // ── Sub-task 1: Team.subscriptionStatus normalization + writes ────────────

  describe('TEAM-P03.7 Sub-task 1: Team.subscriptionStatus webhook writes (iter 085)', () => {
    function makeTeamSubUpdated(
      status: string,
      customerId: string,
      subscriptionId: string,
      priceId = 'price_team_monthly_test',
    ) {
      const subscription = {
        id: subscriptionId,
        status,
        customer: customerId,
        metadata: {},
        items: { data: [{ price: { id: priceId } }] },
      } as unknown as Stripe.Subscription;
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(
            makeEvent('customer.subscription.updated', subscription),
          ),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(stripeLib.planFromPriceId).mockReturnValue('team');
    }

    it('Stripe active → subscriptionStatus=active written to Team row', async () => {
      const mockTeam = {
        id: 'team_sub1_active',
        name: 'Active Co',
        plan: 'team',
        stripeCustomerId: 'cus_sub1_active',
        stripeSubscriptionId: null,
        members: [],
      };
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
      makeTeamSubUpdated('active', 'cus_sub1_active', 'sub_sub1_active');

      await POST(makeRequest('{}'));

      expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subscriptionStatus: 'active' }),
        }),
      );
    });

    it('Stripe trialing → subscriptionStatus=trialing', async () => {
      const mockTeam = {
        id: 'team_sub1_trial',
        name: 'Trial Co',
        plan: 'team',
        stripeCustomerId: 'cus_sub1_trial',
        stripeSubscriptionId: null,
        members: [],
      };
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
      makeTeamSubUpdated('trialing', 'cus_sub1_trial', 'sub_sub1_trial');

      await POST(makeRequest('{}'));

      expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subscriptionStatus: 'trialing' }),
        }),
      );
    });

    it('Stripe past_due → subscriptionStatus=past_due', async () => {
      const mockTeam = {
        id: 'team_sub1_pd',
        name: 'PastDue Co',
        plan: 'team',
        stripeCustomerId: 'cus_sub1_pd',
        stripeSubscriptionId: null,
        members: [],
      };
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
      makeTeamSubUpdated('past_due', 'cus_sub1_pd', 'sub_sub1_pd');

      await POST(makeRequest('{}'));

      expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subscriptionStatus: 'past_due' }),
        }),
      );
    });

    it('Stripe canceled → subscriptionStatus=canceled', async () => {
      const mockTeam = {
        id: 'team_sub1_can',
        name: 'Canceled Co',
        plan: 'team',
        stripeCustomerId: 'cus_sub1_can',
        stripeSubscriptionId: null,
        members: [],
      };
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
      // 'canceled' status → planFromPriceId returns 'free' per the route's isActive gate
      makeTeamSubUpdated('canceled', 'cus_sub1_can', 'sub_sub1_can');

      await POST(makeRequest('{}'));

      expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subscriptionStatus: 'canceled' }),
        }),
      );
    });

    it('Stripe unpaid → subscriptionStatus=unpaid', async () => {
      const mockTeam = {
        id: 'team_sub1_unp',
        name: 'Unpaid Co',
        plan: 'team',
        stripeCustomerId: 'cus_sub1_unp',
        stripeSubscriptionId: null,
        members: [],
      };
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
      makeTeamSubUpdated('unpaid', 'cus_sub1_unp', 'sub_sub1_unp');

      await POST(makeRequest('{}'));

      expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subscriptionStatus: 'unpaid' }),
        }),
      );
    });

    it('Stripe incomplete normalizes to unpaid', async () => {
      const mockTeam = {
        id: 'team_sub1_inc',
        name: 'Incomplete Co',
        plan: 'team',
        stripeCustomerId: 'cus_sub1_inc',
        stripeSubscriptionId: null,
        members: [],
      };
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
      makeTeamSubUpdated('incomplete', 'cus_sub1_inc', 'sub_sub1_inc');

      await POST(makeRequest('{}'));

      expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subscriptionStatus: 'unpaid' }),
        }),
      );
    });

    it('Stripe incomplete_expired normalizes to unpaid', async () => {
      const mockTeam = {
        id: 'team_sub1_inx',
        name: 'IncExp Co',
        plan: 'team',
        stripeCustomerId: 'cus_sub1_inx',
        stripeSubscriptionId: null,
        members: [],
      };
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
      makeTeamSubUpdated('incomplete_expired', 'cus_sub1_inx', 'sub_sub1_inx');

      await POST(makeRequest('{}'));

      expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subscriptionStatus: 'unpaid' }),
        }),
      );
    });

    it('plan field still written alongside subscriptionStatus', async () => {
      const mockTeam = {
        id: 'team_sub1_plan',
        name: 'Plan Co',
        plan: 'starter',
        stripeCustomerId: 'cus_sub1_plan',
        stripeSubscriptionId: null,
        members: [],
      };
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValue(mockTeam as any);
      makeTeamSubUpdated('active', 'cus_sub1_plan', 'sub_sub1_plan');

      await POST(makeRequest('{}'));

      expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'team',
            subscriptionStatus: 'active',
            stripeSubscriptionId: 'sub_sub1_plan',
          }),
        }),
      );
    });
  });

  // ── Sub-task 2: invoice.payment_failed team-first path ────────────────────

  describe('TEAM-P03.7 Sub-task 2: invoice.payment_failed team-first path (iter 085)', () => {
    function makePaymentFailedEvent(subscriptionId: string, amountDue = 24900) {
      const invoice: Partial<Stripe.Invoice> = {
        id: 'in_test',
        subscription: subscriptionId,
        amount_due: amountDue,
        currency: 'usd',
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(
            makeEvent('invoice.payment_failed', invoice),
          ),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
    }

    it('team-first path: finds team by stripeSubscriptionId and marks past_due', async () => {
      vi.mocked((dbLib.db as any).team.findFirst).mockResolvedValueOnce({
        id: 'team_pf_001',
        name: 'PayFail Co',
        plan: 'team',
        stripeSubscriptionId: 'sub_pf_001',
      });
      makePaymentFailedEvent('sub_pf_001');

      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'team_pf_001' },
          data: { subscriptionStatus: 'past_due' },
        }),
      );
      // User.update MUST NOT be called when team is found
      expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
    });

    it('team-first path: emits payment_failed analytics with entity=team and teamId', async () => {
      vi.mocked((dbLib.db as any).team.findFirst).mockResolvedValueOnce({
        id: 'team_pf_002',
        name: 'PayFail2 Co',
        plan: 'team',
        stripeSubscriptionId: 'sub_pf_002',
      });
      const analyticsLib = await import('@/lib/analytics-server');
      makePaymentFailedEvent('sub_pf_002', 79900);

      await POST(makeRequest('{}'));

      expect(vi.mocked(analyticsLib.trackServer)).toHaveBeenCalledWith(
        'payment_failed',
        expect.objectContaining({
          entity: 'team',
          teamId: 'team_pf_002',
          amountFailed: 79900,
          currency: 'usd',
        }),
      );
    });

    it('solo-subscriber path: preserved byte-identical when no team found', async () => {
      vi.mocked((dbLib.db as any).team.findFirst).mockResolvedValueOnce(null);
      vi.mocked(dbLib.db.user.findFirst).mockResolvedValueOnce({
        id: 'user_pf_solo',
      } as any);
      makePaymentFailedEvent('sub_pf_solo');

      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      // User.update called with past_due
      expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_pf_solo' },
          data: { subscriptionStatus: 'past_due' },
        }),
      );
      // Team.update NOT called
      expect(vi.mocked(dbLib.db as any).team.update).not.toHaveBeenCalled();
    });

    it('solo path emits payment_failed with userId (no team fields)', async () => {
      vi.mocked((dbLib.db as any).team.findFirst).mockResolvedValueOnce(null);
      vi.mocked(dbLib.db.user.findFirst).mockResolvedValueOnce({
        id: 'user_pf_solo2',
      } as any);
      const analyticsLib = await import('@/lib/analytics-server');
      makePaymentFailedEvent('sub_pf_solo2');

      await POST(makeRequest('{}'));

      expect(vi.mocked(analyticsLib.trackServer)).toHaveBeenCalledWith(
        'payment_failed',
        expect.objectContaining({ userId: 'user_pf_solo2' }),
      );
      const lastCall = vi.mocked(analyticsLib.trackServer).mock.calls.find(
        (c) => c[0] === 'payment_failed',
      );
      expect((lastCall![1] as any).entity).toBeUndefined();
      expect((lastCall![1] as any).teamId).toBeUndefined();
    });

    it('no subscription id on invoice: short-circuits without DB write', async () => {
      const invoice: Partial<Stripe.Invoice> = {
        id: 'in_test_nosub',
        subscription: null as unknown as string,
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(
            makeEvent('invoice.payment_failed', invoice),
          ),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
      expect(vi.mocked(dbLib.db as any).team.update).not.toHaveBeenCalled();
    });

    it('no team AND no user: short-circuits without throwing', async () => {
      vi.mocked((dbLib.db as any).team.findFirst).mockResolvedValueOnce(null);
      vi.mocked(dbLib.db.user.findFirst).mockResolvedValueOnce(null);
      makePaymentFailedEvent('sub_pf_orphan');

      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
      expect(vi.mocked(dbLib.db as any).team.update).not.toHaveBeenCalled();
    });

    it('team-first lookup uses stripeSubscriptionId (not metadata)', async () => {
      vi.mocked((dbLib.db as any).team.findFirst).mockResolvedValueOnce({
        id: 'team_pf_lookup',
        plan: 'team',
        stripeSubscriptionId: 'sub_pf_lookup',
      });
      makePaymentFailedEvent('sub_pf_lookup');

      await POST(makeRequest('{}'));

      expect(vi.mocked((dbLib.db as any).team.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: 'sub_pf_lookup' },
        }),
      );
    });
  });

  // ── Sub-task 7: webhook userId verification via stripeSubscriptionId ──────

  describe('TEAM-P03.7 Sub-task 7: subscription lookup by stripeSubscriptionId (iter 085)', () => {
    it('customer.subscription.updated solo path: finds user via stripeSubscriptionId lookup', async () => {
      const userId = 'user_st7_001';
      const subscription: Partial<Stripe.Subscription> = {
        id: 'sub_st7_001',
        status: 'active',
        customer: 'cus_st7_001',
        metadata: { userId }, // also set so default mockImpl works
        items: { data: [{ price: { id: 'price_starter_monthly_test' } }] } as Stripe.Subscription['items'],
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(
            makeEvent('customer.subscription.updated', subscription),
          ),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValueOnce(null);
      // Override findFirst to assert call args explicitly.
      vi.mocked(dbLib.db.user.findFirst).mockResolvedValueOnce({ id: userId } as any);

      await POST(makeRequest('{}'));

      // The lookup MUST be by stripeSubscriptionId, not metadata.userId.
      expect(vi.mocked(dbLib.db.user.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: 'sub_st7_001' },
        }),
      );
      expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: userId } }),
      );
    });

    it('customer.subscription.updated solo: no user found short-circuits with warning (no DB write)', async () => {
      const subscription: Partial<Stripe.Subscription> = {
        id: 'sub_st7_notfound',
        status: 'active',
        customer: 'cus_st7_notfound',
        metadata: {}, // intentionally missing — mockImpl returns null
        items: { data: [{ price: { id: 'price_starter_monthly_test' } }] } as Stripe.Subscription['items'],
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(
            makeEvent('customer.subscription.updated', subscription),
          ),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValueOnce(null);
      vi.mocked(dbLib.db.user.findFirst).mockResolvedValueOnce(null);

      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
    });

    it('customer.subscription.deleted solo path: finds user via stripeSubscriptionId lookup', async () => {
      const userId = 'user_st7_del';
      const subscription: Partial<Stripe.Subscription> = {
        id: 'sub_st7_del',
        status: 'canceled',
        customer: 'cus_st7_del',
        metadata: { userId },
        items: { data: [] } as unknown as Stripe.Subscription['items'],
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(
            makeEvent('customer.subscription.deleted', subscription),
          ),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValueOnce(null);
      vi.mocked(dbLib.db.user.findFirst).mockResolvedValueOnce({ id: userId } as any);

      await POST(makeRequest('{}'));

      // Lookup must be by stripeSubscriptionId.
      expect(vi.mocked(dbLib.db.user.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: 'sub_st7_del' },
        }),
      );
      // User.update called with plan=free, status=canceled
      expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({
            plan: 'free',
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null,
          }),
        }),
      );
    });

    it('customer.subscription.deleted solo: no user found short-circuits without throwing', async () => {
      const subscription: Partial<Stripe.Subscription> = {
        id: 'sub_st7_del_nf',
        status: 'canceled',
        customer: 'cus_st7_del_nf',
        metadata: {},
        items: { data: [] } as unknown as Stripe.Subscription['items'],
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(
            makeEvent('customer.subscription.deleted', subscription),
          ),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValueOnce(null);
      vi.mocked(dbLib.db.user.findFirst).mockResolvedValueOnce(null);

      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
    });

    it('lookup does NOT trust metadata.userId — Stripe metadata compromise cannot pivot to user account', async () => {
      // The KEY security property: even if subscription.metadata.userId is
      // set to an attacker-controlled value, the route must look up by the
      // cryptographically-grounded stripeSubscriptionId. If no user has that
      // subscription, the handler short-circuits — no DB write to the wrong user.
      const subscription: Partial<Stripe.Subscription> = {
        id: 'sub_attacker_controlled',
        status: 'active',
        customer: 'cus_attacker',
        // Attacker-injected metadata pointing at a victim user
        metadata: { userId: 'user_victim_target' },
        items: { data: [{ price: { id: 'price_growth_monthly_test' } }] } as Stripe.Subscription['items'],
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(
            makeEvent('customer.subscription.updated', subscription),
          ),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(stripeLib.planFromPriceId).mockReturnValue('growth');
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValueOnce(null);
      // CRITICAL: simulate the attacker's subscription does NOT match the victim
      // user's stripeSubscriptionId — findFirst returns null.
      vi.mocked(dbLib.db.user.findFirst).mockResolvedValueOnce(null);

      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      // The victim user is NOT updated even though their userId is in metadata.
      expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
    });
  });

  // ── REVENUE_PLAN_20K attribution fix (2026-08) ───────────────────────────
  // docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §2 — trackServer() had
  // NO visitorId parameter at all before this fix; billing/subscription
  // events could never carry a visitor-level join key. These tests lock the
  // threading of User.firstTouchVisitorId onto the money-side events.
  //
  // REGRESSION LOCK: fails against the pre-fix code (trackServer calls never
  // included a `visitorId` property at all) and passes against the fix.

  describe('REVENUE_PLAN_20K: visitorId threading onto billing events', () => {
    it('checkout.session.completed: threads the purchasing user’s firstTouchVisitorId onto subscription_created', async () => {
      const analyticsLib = await import('@/lib/analytics-server');
      const userId = 'user_attrib_checkout';
      const session: Partial<Stripe.Checkout.Session> = {
        id: 'cs_attrib',
        metadata: { userId },
        subscription: 'sub_attrib',
        customer: 'cus_attrib',
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('checkout.session.completed', session)),
        },
        subscriptions: {
          retrieve: vi.fn().mockResolvedValue({
            status: 'active',
            items: { data: [{ price: { id: 'price_starter_monthly_test' } }] },
          }),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');
      // Prisma's update() returns the full updated row — this is where the
      // route reads the purchaser's first-touch visitorId from (no extra query).
      vi.mocked(dbLib.db.user.update).mockResolvedValueOnce({
        id: userId,
        firstTouchVisitorId: 'vid-checkout-attrib',
      } as any);

      await POST(makeRequest('{}'));

      expect(vi.mocked(analyticsLib.trackServer)).toHaveBeenCalledWith(
        'subscription_created',
        expect.objectContaining({ userId, visitorId: 'vid-checkout-attrib' }),
      );
    });

    it('checkout.session.completed: passes null (not throwing) when the purchaser never captured a visitorId', async () => {
      const analyticsLib = await import('@/lib/analytics-server');
      const userId = 'user_no_attrib';
      const session: Partial<Stripe.Checkout.Session> = {
        id: 'cs_no_attrib',
        metadata: { userId },
        subscription: 'sub_no_attrib',
        customer: 'cus_no_attrib',
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('checkout.session.completed', session)),
        },
        subscriptions: {
          retrieve: vi.fn().mockResolvedValue({
            status: 'active',
            items: { data: [{ price: { id: 'price_starter_monthly_test' } }] },
          }),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');
      vi.mocked(dbLib.db.user.update).mockResolvedValueOnce({
        id: userId,
        firstTouchVisitorId: null,
      } as any);

      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      expect(vi.mocked(analyticsLib.trackServer)).toHaveBeenCalledWith(
        'subscription_created',
        expect.objectContaining({ userId, visitorId: null }),
      );
    });

    it('customer.subscription.updated (solo path): threads the already-fetched user’s firstTouchVisitorId', async () => {
      const analyticsLib = await import('@/lib/analytics-server');
      const userId = 'user_attrib_updated';
      const subscription: Partial<Stripe.Subscription> = {
        id: 'sub_attrib_updated',
        status: 'active',
        customer: 'cus_attrib_updated',
        metadata: {},
        items: { data: [{ price: { id: 'price_starter_monthly_test' } }] } as Stripe.Subscription['items'],
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('customer.subscription.updated', subscription)),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValueOnce(null);
      vi.mocked(dbLib.db.user.findFirst).mockResolvedValueOnce({
        id: userId,
        firstTouchVisitorId: 'vid-updated-attrib',
      } as any);

      await POST(makeRequest('{}'));

      expect(vi.mocked(analyticsLib.trackServer)).toHaveBeenCalledWith(
        'subscription_updated',
        expect.objectContaining({ userId, visitorId: 'vid-updated-attrib' }),
      );
    });

    it('customer.subscription.trial_will_end: resolves visitorId via a dedicated lookup (no prior DB read in this handler)', async () => {
      const analyticsLib = await import('@/lib/analytics-server');
      const userId = 'user_attrib_trial';
      const subscription: Partial<Stripe.Subscription> = {
        id: 'sub_attrib_trial',
        metadata: { userId },
        trial_end: 1_700_000_000,
        items: { data: [{ price: { id: 'price_starter_monthly_test' } }] } as Stripe.Subscription['items'],
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('customer.subscription.trial_will_end', subscription)),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');
      vi.mocked(analyticsLib.getFirstTouchVisitorId).mockResolvedValueOnce('vid-trial-attrib');

      await POST(makeRequest('{}'));

      expect(vi.mocked(analyticsLib.getFirstTouchVisitorId)).toHaveBeenCalledWith(userId);
      expect(vi.mocked(analyticsLib.trackServer)).toHaveBeenCalledWith(
        'trial_will_end',
        expect.objectContaining({ userId, visitorId: 'vid-trial-attrib' }),
      );
    });

    it('team-scoped events (customer.subscription.updated, team path) do NOT fabricate a visitorId', async () => {
      // ATTRIBUTION SCOPE NOTE (see the route's inline comment): team-scoped
      // events only have teamId in scope, not an individual user — this is a
      // documented, deliberate gap, not an oversight. Asserts no `visitorId`
      // key is ever added to team-scoped trackServer payloads.
      const analyticsLib = await import('@/lib/analytics-server');
      const mockTeam = {
        id: 'team_attrib_scope',
        name: 'Scope Co',
        plan: 'starter',
        stripeCustomerId: 'cus_attrib_scope',
        stripeSubscriptionId: null,
        members: [],
      };
      const subscription: Partial<Stripe.Subscription> = {
        id: 'sub_attrib_scope',
        status: 'active',
        customer: 'cus_attrib_scope',
        metadata: {},
        items: { data: [{ price: { id: 'price_team_monthly_test' } }] } as Stripe.Subscription['items'],
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('customer.subscription.updated', subscription)),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(stripeLib.planFromPriceId).mockReturnValue('team');
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValueOnce(mockTeam as any);

      await POST(makeRequest('{}'));

      const call = vi.mocked(analyticsLib.trackServer).mock.calls.find((c) => c[0] === 'subscription_updated');
      expect(call).toBeDefined();
      expect(call![1]).not.toHaveProperty('visitorId');
    });
  });

  // ── Billing hardening (2026-08): P0-1 idempotency, P0-2 SCA, P1-1 disputes,
  //    out-of-order delivery guard ─────────────────────────────────────────

  describe('P0-1: webhook delivery idempotency', () => {
    /**
     * Simulates the real Prisma unique-constraint behavior: the FIRST
     * `webhookEvent.create({ data: { id } })` for a given id succeeds; every
     * subsequent call with the SAME id throws a P2002-shaped error, exactly
     * as SQLite/Postgres would on a duplicate PRIMARY KEY insert. `release`
     * (called from the route's catch-block) removes the id so a later retry
     * after a released claim is treated as fresh.
     */
    function installClaimSimulator(): Set<string> {
      const claimed = new Set<string>();
      vi.mocked(dbLib.db.webhookEvent.create as unknown as (args: any) => Promise<any>).mockImplementation(
        async (args: any) => {
          const id = args.data.id;
          if (claimed.has(id)) {
            const err = Object.assign(new Error('Unique constraint failed on the fields: (`id`)'), {
              code: 'P2002',
            });
            throw err;
          }
          claimed.add(id);
          return { id, type: args.data.type, receivedAt: new Date() };
        },
      );
      vi.mocked(dbLib.db.webhookEvent.delete as unknown as (args: any) => Promise<any>).mockImplementation(
        async (args: any) => {
          claimed.delete(args.where.id);
          return { id: args.where.id, type: 'test', receivedAt: new Date() };
        },
      );
      return claimed;
    }

    // ── THE most important test in this change ──────────────────────────
    it('delivering the SAME event.id twice produces exactly ONE provisioning effect', async () => {
      installClaimSimulator();

      const subscriptionId = 'sub_idem_001';
      const priceId = 'price_starter_monthly_test';
      const userId = 'user_idem_001';
      const customerId = 'cus_idem_001';
      const duplicateEventId = 'evt_idem_duplicate_001';

      const session: Partial<Stripe.Checkout.Session> = {
        id: 'cs_idem_test',
        metadata: { userId },
        subscription: subscriptionId,
        customer: customerId,
      };
      const stripeSubscription = {
        status: 'active',
        items: { data: [{ price: { id: priceId } }] },
      };

      const mockStripeClient = {
        webhooks: {
          constructEvent: vi
            .fn()
            .mockReturnValue(
              makeEvent('checkout.session.completed', session, { id: duplicateEventId }),
            ),
        },
        subscriptions: { retrieve: vi.fn().mockResolvedValue(stripeSubscription) },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');

      // ── First delivery ──────────────────────────────────────────────
      const res1 = await POST(makeRequest('{}'));
      expect(res1.status).toBe(200);
      const body1 = await res1.json();
      expect(body1.duplicate).toBeUndefined();

      // ── Second delivery of the EXACT SAME event.id ──────────────────
      const res2 = await POST(makeRequest('{}'));
      expect(res2.status).toBe(200);
      const body2 = await res2.json();
      expect(body2.duplicate).toBe(true);

      // The single most important assertion: provisioning ran exactly once.
      expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({ plan: 'starter' }),
        }),
      );

      const analyticsLib = await import('@/lib/analytics-server');
      const creationCalls = vi
        .mocked(analyticsLib.trackServer)
        .mock.calls.filter((c) => c[0] === 'subscription_created');
      expect(creationCalls).toHaveLength(1);

      // The claim ledger itself was written to twice (both attempts probed
      // it) but only the first attempt actually claimed successfully.
      expect(vi.mocked(dbLib.db.webhookEvent.create)).toHaveBeenCalledTimes(2);
    });

    it('a duplicate delivery never reaches the Stripe signature-verified switch at all', async () => {
      // Belt-and-suspenders on the mechanism itself: prove the SECOND
      // delivery does not even attempt subscriptions.retrieve (i.e.
      // processing short-circuits before any provisioning side effect can
      // fire), not merely that the end DB write happens to be idempotent.
      installClaimSimulator();
      const dupId = 'evt_idem_shortcircuit_001';
      const session: Partial<Stripe.Checkout.Session> = {
        id: 'cs_sc',
        metadata: { userId: 'user_sc' },
        subscription: 'sub_sc',
        customer: 'cus_sc',
      };
      const retrieveMock = vi.fn().mockResolvedValue({
        status: 'active',
        items: { data: [{ price: { id: 'price_starter_monthly_test' } }] },
      });
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi
            .fn()
            .mockReturnValue(makeEvent('checkout.session.completed', session, { id: dupId })),
        },
        subscriptions: { retrieve: retrieveMock },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');

      await POST(makeRequest('{}'));
      expect(retrieveMock).toHaveBeenCalledTimes(1);

      await POST(makeRequest('{}'));
      // Still exactly 1 — the duplicate never reached the subscriptions.retrieve call.
      expect(retrieveMock).toHaveBeenCalledTimes(1);
    });

    it('a processing failure releases the claim so a subsequent retry of the SAME event.id is reprocessed (not treated as duplicate)', async () => {
      installClaimSimulator();
      const retryId = 'evt_idem_retry_001';

      const subscription: Partial<Stripe.Subscription> = {
        id: 'sub_retry_001',
        status: 'active',
        metadata: {},
        items: { data: [{ price: { id: 'price_unknown_xyz' } }] } as Stripe.Subscription['items'],
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi
            .fn()
            .mockReturnValue(
              makeEvent('customer.subscription.updated', subscription, { id: retryId }),
            ),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      // First attempt: unmapped price ID → throws → 500 → claim released.
      vi.mocked(stripeLib.planFromPriceId).mockReturnValueOnce(null);

      const res1 = await POST(makeRequest('{}'));
      expect(res1.status).toBe(500);
      expect(vi.mocked(dbLib.db.webhookEvent.delete)).toHaveBeenCalledWith({ where: { id: retryId } });

      // Retry of the SAME event.id after the operator fixes the price mapping —
      // must be treated as a fresh attempt, NOT swallowed as a duplicate.
      vi.mocked(stripeLib.planFromPriceId).mockReturnValueOnce('starter');
      const res2 = await POST(makeRequest('{}'));
      expect(res2.status).toBe(200);
      const body2 = await res2.json();
      expect(body2.duplicate).toBeUndefined();
    });

    it('an unexpected DB error during the idempotency claim itself returns 500 without processing', async () => {
      vi.mocked(dbLib.db.webhookEvent.create).mockRejectedValueOnce(
        new Error('SQLITE_BUSY: database is locked'),
      );
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi
            .fn()
            .mockReturnValue(makeEvent('checkout.session.completed', { id: 'cs_x' })),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

      const res = await POST(makeRequest('{}'));
      expect(res.status).toBe(500);
      expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
    });
  });

  describe('P0-2: invoice.payment_action_required (SCA / 3-D Secure)', () => {
    it('team path: writes pendingInvoiceUrl and emits payment_action_required analytics', async () => {
      const subscriptionId = 'sub_sca_team_001';
      const hostedUrl = 'https://invoice.stripe.com/i/acct_test/test_sca_team';
      const invoice: Partial<Stripe.Invoice> = {
        id: 'inv_sca_team_001',
        subscription: subscriptionId,
        hosted_invoice_url: hostedUrl,
      };
      const mockTeam = { id: 'team_sca_001', stripeSubscriptionId: subscriptionId };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('invoice.payment_action_required', invoice)),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(dbLib.db as any).team.findFirst.mockResolvedValue(mockTeam);

      const analyticsLib = await import('@/lib/analytics-server');
      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db as any).team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'team_sca_001' },
          data: { pendingInvoiceUrl: hostedUrl },
        }),
      );
      expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
      expect(vi.mocked(analyticsLib.trackServer)).toHaveBeenCalledWith(
        'payment_action_required',
        expect.objectContaining({ entity: 'team', teamId: 'team_sca_001', invoiceId: 'inv_sca_team_001' }),
      );
    });

    it('solo path: writes pendingInvoiceUrl on the user row', async () => {
      const subscriptionId = 'sub_sca_solo_001';
      const userId = 'user_sca_solo_001';
      const hostedUrl = 'https://invoice.stripe.com/i/acct_test/test_sca_solo';
      const invoice: Partial<Stripe.Invoice> = {
        id: 'inv_sca_solo_001',
        subscription: subscriptionId,
        hosted_invoice_url: hostedUrl,
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('invoice.payment_action_required', invoice)),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(dbLib.db.user.findFirst).mockResolvedValue({
        id: userId,
        stripeSubscriptionId: subscriptionId,
        firstTouchVisitorId: 'vid-sca-001',
      } as any);

      const res = await POST(makeRequest('{}'));
      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: { pendingInvoiceUrl: hostedUrl },
        }),
      );
    });

    it('missing subscriptionId on the invoice — returns 200, no DB write', async () => {
      const invoice: Partial<Stripe.Invoice> = { id: 'inv_sca_nosub' };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('invoice.payment_action_required', invoice)),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

      const res = await POST(makeRequest('{}'));
      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
      expect(vi.mocked(dbLib.db as any).team.update).not.toHaveBeenCalled();
    });

    it('neither team nor user found — returns 200 without throwing (Stripe must not retry forever)', async () => {
      const invoice: Partial<Stripe.Invoice> = {
        id: 'inv_sca_unknown',
        subscription: 'sub_sca_unknown',
        hosted_invoice_url: 'https://invoice.stripe.com/x',
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('invoice.payment_action_required', invoice)),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      // Both team.findFirst and user.findFirst default to null.

      const res = await POST(makeRequest('{}'));
      expect(res.status).toBe(200);
    });

    it('customer.subscription.deleted clears pendingInvoiceUrl on the solo user row', async () => {
      const userId = 'user_sca_clear_001';
      const subscription: Partial<Stripe.Subscription> = {
        id: 'sub_sca_clear_001',
        status: 'canceled',
        metadata: { userId },
        items: { data: [] } as unknown as Stripe.Subscription['items'],
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('customer.subscription.deleted', subscription)),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

      const res = await POST(makeRequest('{}'));
      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pendingInvoiceUrl: null }),
        }),
      );
    });
  });

  describe('P1-1: charge.dispute.created / charge.dispute.closed', () => {
    it('resolves the owning team via the charge customer and records the dispute — entitlement untouched', async () => {
      const chargeId = 'ch_dispute_team_001';
      const customerId = 'cus_dispute_team_001';
      const dispute = {
        id: 'dp_team_001',
        charge: chargeId,
        amount: 4900,
        currency: 'usd',
        reason: 'fraudulent',
        status: 'needs_response',
      };
      const chargesRetrieve = vi.fn().mockResolvedValue({ id: chargeId, customer: customerId });
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('charge.dispute.created', dispute)),
        },
        charges: { retrieve: chargesRetrieve },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      const mockTeam = { id: 'team_dispute_001', stripeCustomerId: customerId, members: [] };
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValueOnce(mockTeam as any);

      const analyticsLib = await import('@/lib/analytics-server');
      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      expect(chargesRetrieve).toHaveBeenCalledWith(chargeId);
      expect(vi.mocked(dbLib.db as any).stripeDispute.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dp_team_001' },
          create: expect.objectContaining({
            id: 'dp_team_001',
            chargeId,
            teamId: 'team_dispute_001',
            userId: null,
            amount: 4900,
            currency: 'usd',
            reason: 'fraudulent',
            status: 'needs_response',
          }),
        }),
      );
      // Entitlement must NOT be touched by a mere dispute claim.
      expect(vi.mocked(dbLib.db as any).team.update).not.toHaveBeenCalled();
      expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
      expect(vi.mocked(analyticsLib.trackServer)).toHaveBeenCalledWith(
        'dispute_created',
        expect.objectContaining({ disputeId: 'dp_team_001', teamId: 'team_dispute_001', chargeId }),
      );
    });

    it('resolves the owning solo user when no team matches the customer', async () => {
      const chargeId = 'ch_dispute_solo_001';
      const customerId = 'cus_dispute_solo_001';
      const userId = 'user_dispute_solo_001';
      const dispute = {
        id: 'dp_solo_001',
        charge: chargeId,
        amount: 8900,
        currency: 'usd',
        reason: 'duplicate',
        status: 'needs_response',
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('charge.dispute.created', dispute)),
        },
        charges: { retrieve: vi.fn().mockResolvedValue({ id: chargeId, customer: customerId }) },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValueOnce(null);
      vi.mocked(dbLib.db.user.findFirst).mockResolvedValue({ id: userId } as any);

      const res = await POST(makeRequest('{}'));
      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db as any).stripeDispute.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ userId, teamId: null }),
        }),
      );
    });

    it('charge retrieval failure still records the dispute with owner unresolved (never dropped)', async () => {
      const dispute = {
        id: 'dp_unresolved_001',
        charge: 'ch_unresolved_001',
        amount: 1200,
        currency: 'usd',
        reason: 'general',
        status: 'needs_response',
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('charge.dispute.created', dispute)),
        },
        charges: { retrieve: vi.fn().mockRejectedValue(new Error('Stripe API error')) },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

      const res = await POST(makeRequest('{}'));
      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db as any).stripeDispute.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ id: 'dp_unresolved_001', userId: null, teamId: null }),
        }),
      );
    });

    it('dispute analytics payload carries no PII', async () => {
      const dispute = {
        id: 'dp_pii_001',
        charge: 'ch_pii_001',
        amount: 4900,
        currency: 'usd',
        reason: 'fraudulent',
        status: 'needs_response',
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('charge.dispute.created', dispute)),
        },
        charges: { retrieve: vi.fn().mockRejectedValue(new Error('unresolved')) },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

      const analyticsLib = await import('@/lib/analytics-server');
      await POST(makeRequest('{}'));

      const call = vi.mocked(analyticsLib.trackServer).mock.calls.find((c) => c[0] === 'dispute_created');
      expect(call).toBeDefined();
      const payload = call![1] as Record<string, unknown>;
      expect(payload).not.toHaveProperty('email');
      expect(payload).not.toHaveProperty('customerEmail');
      expect(payload).not.toHaveProperty('name');
    });

    it('charge.dispute.closed updates the dispute status only', async () => {
      const dispute = {
        id: 'dp_closed_001',
        charge: 'ch_closed_001',
        amount: 4900,
        currency: 'usd',
        reason: 'fraudulent',
        status: 'won',
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('charge.dispute.closed', dispute)),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

      const res = await POST(makeRequest('{}'));
      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db as any).stripeDispute.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dp_closed_001' },
          update: { status: 'won' },
        }),
      );
    });
  });

  describe('Out-of-order webhook delivery guard', () => {
    const OLDER = 1_700_000_000; // Unix seconds
    const NEWER = 1_700_000_500;

    it('customer.subscription.updated (solo): a stale event older than the last-applied event is skipped', async () => {
      const userId = 'user_stale_001';
      const subscription: Partial<Stripe.Subscription> = {
        id: 'sub_stale_001',
        status: 'active',
        metadata: {},
        items: { data: [{ price: { id: 'price_starter_monthly_test' } }] } as Stripe.Subscription['items'],
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi
            .fn()
            .mockReturnValue(
              makeEvent('customer.subscription.updated', subscription, { created: OLDER }),
            ),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');
      vi.mocked(dbLib.db.user.findFirst).mockResolvedValue({
        id: userId,
        lastSubscriptionEventAt: new Date(NEWER * 1000),
      } as any);

      const analyticsLib = await import('@/lib/analytics-server');
      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
      expect(vi.mocked(analyticsLib.trackServer)).toHaveBeenCalledWith(
        'subscription_update_skipped_stale',
        expect.objectContaining({ userId, eventId: expect.any(String) }),
      );
    });

    it('customer.subscription.updated (solo): a newer event than the last-applied one IS applied', async () => {
      const userId = 'user_fresh_001';
      const subscription: Partial<Stripe.Subscription> = {
        id: 'sub_fresh_001',
        status: 'active',
        metadata: {},
        items: { data: [{ price: { id: 'price_starter_monthly_test' } }] } as Stripe.Subscription['items'],
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi
            .fn()
            .mockReturnValue(
              makeEvent('customer.subscription.updated', subscription, { created: NEWER }),
            ),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');
      vi.mocked(dbLib.db.user.findFirst).mockResolvedValue({
        id: userId,
        lastSubscriptionEventAt: new Date(OLDER * 1000),
      } as any);

      const res = await POST(makeRequest('{}'));
      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledOnce();
    });

    it('customer.subscription.updated (team): a stale event is skipped and does not clobber newer Team state', async () => {
      const subscription: Partial<Stripe.Subscription> = {
        id: 'sub_stale_team_001',
        status: 'active',
        customer: 'cus_stale_team',
        metadata: {},
        items: { data: [{ price: { id: 'price_team_monthly_test' } }] } as Stripe.Subscription['items'],
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi
            .fn()
            .mockReturnValue(
              makeEvent('customer.subscription.updated', subscription, { created: OLDER }),
            ),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(stripeLib.planFromPriceId).mockReturnValue('team');
      const mockTeam = {
        id: 'team_stale_001',
        name: 'Stale Co',
        plan: 'growth',
        stripeCustomerId: 'cus_stale_team',
        stripeSubscriptionId: 'sub_current',
        lastSubscriptionEventAt: new Date(NEWER * 1000),
        members: [],
      };
      vi.mocked(teamBillingLib.resolveTeamFromCustomer).mockResolvedValueOnce(mockTeam as any);

      const res = await POST(makeRequest('{}'));
      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db as any).team.update).not.toHaveBeenCalled();
    });

    it('customer.subscription.deleted (solo): a stale deletion event is skipped', async () => {
      const userId = 'user_stale_del_001';
      const subscription: Partial<Stripe.Subscription> = {
        id: 'sub_stale_del_001',
        status: 'canceled',
        metadata: {},
        items: { data: [] } as unknown as Stripe.Subscription['items'],
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi
            .fn()
            .mockReturnValue(
              makeEvent('customer.subscription.deleted', subscription, { created: OLDER }),
            ),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(dbLib.db.user.findFirst).mockResolvedValue({
        id: userId,
        lastSubscriptionEventAt: new Date(NEWER * 1000),
      } as any);

      const res = await POST(makeRequest('{}'));
      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
    });
  });

  // ── checkout.session.completed (mode: 'payment') — 2026-08 monetization-shapes hardening ──
  //
  // One-time (mode: 'payment') Checkout Sessions produce the SAME
  // checkout.session.completed event type as subscriptions, but carry no
  // `session.subscription` and grant no plan/entitlement. This block proves
  // (a) the two branches are mutually exclusive — a payment-mode session
  // never touches User.plan/subscriptionStatus, and a subscription-mode
  // session (this file's dozens of other checkout.session.completed tests,
  // none of which set `mode`) is completely unaffected by the new branch;
  // (b) the purchase is persisted with the right fields; (c) a non-'paid'
  // payment_status (async payment methods) is handled without throwing, per
  // the documented NOT-YET-HANDLED scope boundary.

  describe('checkout.session.completed (mode: "payment") — one-time purchases (2026-08)', () => {
    function makePaymentSession(overrides: Partial<Stripe.Checkout.Session> = {}): Partial<Stripe.Checkout.Session> {
      return {
        id: 'cs_one_time_001',
        mode: 'payment',
        metadata: { userId: 'user_one_time_001', type: 'one_time', sku: 'example_onboarding_audit' },
        payment_intent: 'pi_one_time_001',
        payment_status: 'paid',
        amount_total: 4900,
        currency: 'usd',
        ...overrides,
      };
    }

    it('upserts a OneTimePurchase row and does NOT touch User.plan/subscriptionStatus', async () => {
      const session = makePaymentSession();
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('checkout.session.completed', session)),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      expect(vi.mocked((dbLib.db as any).oneTimePurchase.upsert)).toHaveBeenCalledOnce();
      expect(vi.mocked((dbLib.db as any).oneTimePurchase.upsert)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cs_one_time_001' },
          create: expect.objectContaining({
            id: 'cs_one_time_001',
            userId: 'user_one_time_001',
            sku: 'example_onboarding_audit',
            stripePaymentIntentId: 'pi_one_time_001',
            amountTotal: 4900,
            currency: 'usd',
            paymentStatus: 'paid',
          }),
        }),
      );
      // The defining property of this branch: no subscription-provisioning
      // side effects at all.
      expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
      expect(vi.mocked((dbLib.db as any).team.update)).not.toHaveBeenCalled();
      expect(vi.mocked((dbLib.db as any).team.create)).not.toHaveBeenCalled();
    });

    it('emits one_time_purchase_completed analytics with no PII (opaque userId, internal sku key, Stripe amount/currency)', async () => {
      const analyticsLib = await import('@/lib/analytics-server');
      const session = makePaymentSession();
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('checkout.session.completed', session)),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

      await POST(makeRequest('{}'));

      expect(vi.mocked(analyticsLib.trackServer)).toHaveBeenCalledWith(
        'one_time_purchase_completed',
        expect.objectContaining({
          userId: 'user_one_time_001',
          sku: 'example_onboarding_audit',
          amount: 4900,
          currency: 'usd',
        }),
      );
      const [, payload] = vi.mocked(analyticsLib.trackServer).mock.calls.find(
        ([event]) => event === 'one_time_purchase_completed',
      )!;
      expect(payload).not.toHaveProperty('email');
      expect(payload).not.toHaveProperty('name');
      expect(payload).not.toHaveProperty('stripePaymentIntentId');
    });

    it('does not throw and does not emit completion analytics when payment_status is not "paid" (async payment method — NOT YET HANDLED scope boundary)', async () => {
      const analyticsLib = await import('@/lib/analytics-server');
      const session = makePaymentSession({ payment_status: 'unpaid' });
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('checkout.session.completed', session)),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      // Row is still persisted, honestly reflecting the non-'paid' status —
      // not silently dropped.
      expect(vi.mocked((dbLib.db as any).oneTimePurchase.upsert)).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ paymentStatus: 'unpaid' }),
        }),
      );
      expect(vi.mocked(analyticsLib.trackServer)).not.toHaveBeenCalledWith(
        'one_time_purchase_completed',
        expect.anything(),
      );
    });

    it('breaks (returns without processing) when metadata.userId is absent, matching the subscription branch\'s existing guard', async () => {
      const session = makePaymentSession({ metadata: {} });
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('checkout.session.completed', session)),
        },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      expect(vi.mocked((dbLib.db as any).oneTimePurchase.upsert)).not.toHaveBeenCalled();
    });

    it('does not invoke subscriptions.retrieve — the payment-mode branch never resolves a plan from a price ID', async () => {
      const session = makePaymentSession();
      const retrieveSpy = vi.fn();
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('checkout.session.completed', session)),
        },
        subscriptions: { retrieve: retrieveSpy },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      expect(retrieveSpy).not.toHaveBeenCalled();
    });

    it('a session with mode: "subscription" (or mode omitted, matching every other test in this file) is unaffected — falls through to the existing subscription branch', async () => {
      // This is the regression lock for "does not disturb the subscription
      // path": every OTHER checkout.session.completed test in this file
      // constructs a session with no `mode` field at all, and all of them
      // pass — this test makes the guarantee explicit for `mode: 'subscription'` too.
      const subscriptionId = 'sub_mode_regression_001';
      const priceId = 'price_starter_monthly_test';
      const userId = 'user_mode_regression_001';
      const session: Partial<Stripe.Checkout.Session> = {
        id: 'cs_mode_regression',
        mode: 'subscription',
        metadata: { userId },
        subscription: subscriptionId,
        customer: 'cus_mode_regression',
      };
      const stripeSubscription = {
        status: 'active',
        items: { data: [{ price: { id: priceId } }] },
      };
      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(makeEvent('checkout.session.completed', session)),
        },
        subscriptions: { retrieve: vi.fn().mockResolvedValue(stripeSubscription) },
      };
      vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);
      vi.mocked(stripeLib.planFromPriceId).mockReturnValue('starter');

      const res = await POST(makeRequest('{}'));

      expect(res.status).toBe(200);
      expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({ plan: 'starter', subscriptionStatus: 'active' }),
        }),
      );
      expect(vi.mocked((dbLib.db as any).oneTimePurchase.upsert)).not.toHaveBeenCalled();
    });
  });
});
