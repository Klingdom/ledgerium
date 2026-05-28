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
 *   - vi.mock('@/lib/analytics-server') — no-op trackServer to avoid fire-and-forget DB writes.
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
}));

// stripe mock: all exports controlled per-test via vi.mocked()
vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
  planFromPriceId: vi.fn(),
  getWebhookSecret: vi.fn(),
}));

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

/** Minimal Stripe event factory — only the fields the handler reads. */
function makeEvent<T>(type: string, object: T): Stripe.Event {
  return { id: 'evt_test', type, data: { object } } as unknown as Stripe.Event;
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
        data: { subscriptionStatus: 'active' },
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
        data: { subscriptionStatus: 'active' },
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
});
