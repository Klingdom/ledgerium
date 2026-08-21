/**
 * Integration tests for the NON-DEFAULT promotion-code / Stripe Tax
 * configuration on POST /api/billing/checkout (2026-08 monetization-shapes
 * hardening).
 *
 * route.test.ts's static mock exports ALLOW_PROMOTION_CODES: true and
 * AUTOMATIC_TAX_ENABLED: false — the real module's shipped defaults. This
 * file is the deliberate mirror-image: ALLOW_PROMOTION_CODES: false and
 * AUTOMATIC_TAX_ENABLED: true, to prove the route reads and applies
 * whichever value `@/lib/stripe` exports rather than being hardcoded to
 * either state.
 *
 * A dynamic-reimport + `vi.resetModules()` approach (toggling real env vars
 * and letting the real `@/lib/stripe` module re-evaluate between tests) was
 * tried first and produced unreliable results specifically for the
 * `ONE_TIME_PRICES` map / `getOneTimePriceId` closure captured via
 * `importOriginal()` — env changes made after the module's first evaluation
 * in the test file were not consistently observed on later calls, even
 * though the same pattern worked for the two boolean flags. Root cause not
 * fully isolated; two static-mock files (this one + route.test.ts) sidestep
 * the whole class of risk and match this route's established "no
 * getter/env-reactive mocks" convention (see route.test.ts's header
 * comment) — deterministic and worker-pollution-safe.
 *
 * No production code is modified by this file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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

const mockCheckoutCreate = vi.fn();
const mockCustomerCreate = vi.fn();

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
    customers: { create: mockCustomerCreate },
  })),
  getPriceId: vi.fn((plan: string, interval: string) => `price_${plan}_${interval}_test`),
  getOneTimePriceId: vi.fn((sku: string) => (sku === '__configured_sku__' ? 'price_one_time_test_sku' : null)),
  PRO_PRICE_ID: '',
  APP_URL: 'https://test.example',
  TRIAL_PERIOD_DAYS: 14,
  // The mirror-image of route.test.ts's defaults — this is the whole point
  // of this file.
  ALLOW_PROMOTION_CODES: false,
  AUTOMATIC_TAX_ENABLED: true,
  planFromPriceId: vi.fn(() => null),
  getWebhookSecret: vi.fn(() => 'whsec_test'),
}));

import { POST } from './route';
import { db } from '@/db';
import { auth } from '@/lib/auth';

const TEST_USER_ID = 'user_test_toggle';
const TEST_CUSTOMER_ID = 'cus_test_toggle';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/billing/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

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
    email: 'toggle@example.com',
    name: 'Test User',
    plan: opts.plan ?? 'free',
    subscriptionStatus: opts.subscriptionStatus ?? 'none',
    stripeCustomerId: opts.stripeCustomerId ?? TEST_CUSTOMER_ID,
    stripeSubscriptionId: opts.stripeSubscriptionId ?? null,
  };
}

function setAuth(value: unknown): void {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(value);
}

describe('POST /api/billing/checkout — ALLOW_PROMOTION_CODES=false / AUTOMATIC_TAX_ENABLED=true', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckoutCreate.mockReset();
    mockCustomerCreate.mockReset();

    setAuth({ user: { id: TEST_USER_ID, email: 'toggle@example.com' } });
    mockCheckoutCreate.mockResolvedValue({
      id: 'cs_test_toggle',
      url: 'https://checkout.stripe.com/c/pay/cs_test_toggle',
    });
  });

  it('omits allow_promotion_codes from a subscription session when the flag is off', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

    const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
    expect(res.status).toBe(200);

    const args = mockCheckoutCreate.mock.calls[0]![0];
    expect(args.allow_promotion_codes).toBeUndefined();
  });

  it('wires automatic_tax + billing_address_collection + customer_update onto a subscription session when the flag is on', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

    const res = await POST(makeRequest({ plan: 'starter', interval: 'monthly' }));
    expect(res.status).toBe(200);

    const args = mockCheckoutCreate.mock.calls[0]![0];
    expect(args.automatic_tax).toEqual({ enabled: true });
    expect(args.billing_address_collection).toBe('required');
    expect(args.customer_update).toEqual({ address: 'auto', name: 'auto' });
  });

  it('applies the same tax wiring to a one-time payment session — the config surface is shared, not subscription-only', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);

    const res = await POST(makeRequest({ type: 'one_time', sku: '__configured_sku__' }));
    expect(res.status).toBe(200);

    const args = mockCheckoutCreate.mock.calls[0]![0];
    expect(args.mode).toBe('payment');
    expect(args.automatic_tax).toEqual({ enabled: true });
    expect(args.allow_promotion_codes).toBeUndefined();
  });
});
