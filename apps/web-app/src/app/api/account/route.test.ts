/**
 * Integration tests for GET /api/account.
 *
 * Billing hardening (2026-08): covers the new `pendingInvoiceUrl` field on
 * the response — the account/billing surface's SCA/3-D-Secure visibility
 * signal (P0-2). See webhook/route.ts invoice.payment_action_required for
 * the write side and schema.prisma User.pendingInvoiceUrl for the contract.
 *
 * No production code is modified by this file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/feature-gating', () => ({
  buildFeatureFlagsWithUsage: vi.fn().mockResolvedValue({
    plan: 'starter',
    features: {},
    limits: {
      recordings: { used: 0, max: 15 },
      seats: { max: 1 },
      recorders: { max: 1 },
    },
  }),
}));

import { GET } from './route';
import { db } from '@/db';
import { auth } from '@/lib/auth';

const TEST_USER_ID = 'user_account_test';

function setAuth(value: unknown): void {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(value);
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_USER_ID,
    email: 'test@example.com',
    name: 'Test User',
    plan: 'starter',
    subscriptionStatus: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    stripeCustomerId: 'cus_test',
    pendingInvoiceUrl: null,
    ...overrides,
  };
}

describe('GET /api/account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth({ user: { id: TEST_USER_ID, email: 'test@example.com' } });
  });

  it('returns 401 when unauthenticated', async () => {
    setAuth(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it('returns pendingInvoiceUrl: null when no SCA action is outstanding', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(makeUser() as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.user.pendingInvoiceUrl).toBeNull();
  });

  it('surfaces a non-null pendingInvoiceUrl when SCA action is required (P0-2)', async () => {
    const hostedUrl = 'https://invoice.stripe.com/i/acct_test/test_pending';
    vi.mocked(db.user.findUnique).mockResolvedValue(
      makeUser({ pendingInvoiceUrl: hostedUrl }) as never,
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.user.pendingInvoiceUrl).toBe(hostedUrl);
  });

  it('defaults pendingInvoiceUrl to null for legacy rows where the field is undefined', async () => {
    const legacyUser = makeUser();
    delete (legacyUser as Record<string, unknown>).pendingInvoiceUrl;
    vi.mocked(db.user.findUnique).mockResolvedValue(legacyUser as never);
    const res = await GET();
    const body = await res.json();
    expect(body.data.user.pendingInvoiceUrl).toBeNull();
  });
});
