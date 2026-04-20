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
});
