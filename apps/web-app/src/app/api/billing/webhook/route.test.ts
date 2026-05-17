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
    },
    analyticsEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
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

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // Set a valid webhook secret by default so most tests get past the secret check.
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

    // Re-import after resetModules so env changes apply to fresh module instances.
    stripeLib = await import('@/lib/stripe');
    dbLib = await import('@/db');

    // Default: getWebhookSecret returns a valid secret.
    vi.mocked(stripeLib.getWebhookSecret).mockReturnValue('whsec_test_secret');

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

  // ── 8. invoice.payment_succeeded — happy path ────────────────────────────

  it('invoice.payment_succeeded: updates subscriptionStatus to active and emits analytics', async () => {
    const userId = 'user_pay_001';
    const subscriptionId = 'sub_pay_001';
    const invoiceId = 'inv_pay_001';

    const invoice: Partial<Stripe.Invoice> = {
      id: invoiceId,
      subscription: subscriptionId,
      amount_paid: 4900,
      currency: 'usd',
    };

    const stripeSubscription = {
      id: subscriptionId,
      metadata: { userId },
      items: { data: [{ price: { id: 'price_starter_monthly_test' } }] },
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('invoice.payment_succeeded', invoice),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(stripeSubscription),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

    const analyticsLib = await import('@/lib/analytics-server');
    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledOnce();
    expect(vi.mocked(dbLib.db.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: { subscriptionStatus: 'active' },
      }),
    );
    expect(vi.mocked(analyticsLib.trackServer)).toHaveBeenCalledWith(
      'payment_succeeded',
      expect.objectContaining({ userId, amount: 4900, currency: 'usd', invoiceId }),
    );
  });

  // ── 9. invoice.payment_succeeded — no userId on subscription metadata ───

  it('invoice.payment_succeeded: no userId on subscription → returns 200 without DB write', async () => {
    const subscriptionId = 'sub_pay_002';

    const invoice: Partial<Stripe.Invoice> = {
      id: 'inv_pay_002',
      subscription: subscriptionId,
      amount_paid: 4900,
      currency: 'usd',
    };

    const stripeSubscription = {
      id: subscriptionId,
      metadata: {}, // no userId
      items: { data: [{ price: { id: 'price_starter_monthly_test' } }] },
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('invoice.payment_succeeded', invoice),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(stripeSubscription),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

    const req = makeRequest('{}');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
  });

  // ── 10. invoice.payment_succeeded — Stripe API failure → HTTP 500 ────────

  it('invoice.payment_succeeded: Stripe subscriptions.retrieve failure returns HTTP 500', async () => {
    const subscriptionId = 'sub_pay_003';

    const invoice: Partial<Stripe.Invoice> = {
      id: 'inv_pay_003',
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
      subscriptions: {
        retrieve: vi.fn().mockRejectedValue(new Error('Stripe API error')),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

    const req = makeRequest('{}');
    const res = await POST(req);

    // Must 500 so Stripe retries — a successful payment must not be silently dropped
    expect(res.status).toBe(500);
    expect(vi.mocked(dbLib.db.user.update)).not.toHaveBeenCalled();
  });

  // ── 11. invoice.payment_succeeded — emits correct analytics payload (no PII) ─

  it('invoice.payment_succeeded: analytics payload contains no PII fields', async () => {
    const userId = 'user_pay_004';
    const subscriptionId = 'sub_pay_004';

    const invoice: Partial<Stripe.Invoice> = {
      id: 'inv_pay_004',
      subscription: subscriptionId,
      amount_paid: 24900,
      currency: 'usd',
    };

    const stripeSubscription = {
      id: subscriptionId,
      metadata: { userId },
      items: { data: [{ price: { id: 'price_team_monthly_test' } }] },
    };

    const mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          makeEvent('invoice.payment_succeeded', invoice),
        ),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(stripeSubscription),
      },
    };

    vi.mocked(stripeLib.getStripe).mockReturnValue(mockStripeClient as unknown as Stripe);

    const analyticsLib = await import('@/lib/analytics-server');
    const req = makeRequest('{}');
    await POST(req);

    const calls = vi.mocked(analyticsLib.trackServer).mock.calls;
    expect(calls).toHaveLength(1);
    const [, payload] = calls[0]!;

    // Required fields
    expect(payload).toHaveProperty('userId', userId);
    expect(payload).toHaveProperty('amount', 24900);
    expect(payload).toHaveProperty('currency', 'usd');
    expect(payload).toHaveProperty('invoiceId', 'inv_pay_004');

    // PII must NOT appear
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('customerEmail');
    expect(payload).not.toHaveProperty('name');
    expect(payload).not.toHaveProperty('cardNumber');
    expect(payload).not.toHaveProperty('lines');
    expect(payload).not.toHaveProperty('customer_email');
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
});
