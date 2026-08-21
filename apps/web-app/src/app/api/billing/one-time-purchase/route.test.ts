/**
 * Integration tests for GET /api/billing/one-time-purchase.
 *
 * No production code is modified by this file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/db', () => ({
  db: {
    oneTimePurchase: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { GET } from './route';
import { db } from '@/db';
import { auth } from '@/lib/auth';

const TEST_USER_ID = 'user_purchase_test';
const OTHER_USER_ID = 'user_other';

function setAuth(value: unknown): void {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(value);
}

function makeRequest(sessionId?: string): NextRequest {
  const url = sessionId
    ? `http://localhost/api/billing/one-time-purchase?session_id=${sessionId}`
    : 'http://localhost/api/billing/one-time-purchase';
  return new NextRequest(url);
}

describe('GET /api/billing/one-time-purchase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth({ user: { id: TEST_USER_ID, email: 'test@example.com' } });
  });

  it('returns 401 when unauthenticated', async () => {
    setAuth(null);
    const res = await GET(makeRequest('cs_test_123'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when session_id is missing', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it('returns pending: true when the webhook has not written the row yet (normal race, not an error)', async () => {
    vi.mocked(db.oneTimePurchase.findUnique).mockResolvedValue(null);

    const res = await GET(makeRequest('cs_not_yet_processed'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.pending).toBe(true);
  });

  it('returns pending: true (not the purchase details) for a session belonging to a different user', async () => {
    vi.mocked(db.oneTimePurchase.findUnique).mockResolvedValue({
      id: 'cs_someone_elses',
      userId: OTHER_USER_ID,
      sku: 'guided_onboarding',
      stripePaymentIntentId: 'pi_test',
      amountTotal: 29900,
      currency: 'usd',
      paymentStatus: 'paid',
      createdAt: new Date('2026-08-20T00:00:00Z'),
      updatedAt: new Date('2026-08-20T00:00:00Z'),
    } as never);

    const res = await GET(makeRequest('cs_someone_elses'));
    const body = await res.json();
    expect(body.data.pending).toBe(true);
    expect(body.data.sku).toBeUndefined();
  });

  it('returns full purchase details plus catalog copy for the owner\'s guided_onboarding purchase', async () => {
    vi.mocked(db.oneTimePurchase.findUnique).mockResolvedValue({
      id: 'cs_mine',
      userId: TEST_USER_ID,
      sku: 'guided_onboarding',
      stripePaymentIntentId: 'pi_test',
      amountTotal: 29900,
      currency: 'usd',
      paymentStatus: 'paid',
      createdAt: new Date('2026-08-20T00:00:00Z'),
      updatedAt: new Date('2026-08-20T00:00:00Z'),
    } as never);

    const res = await GET(makeRequest('cs_mine'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.pending).toBe(false);
    expect(body.data.sku).toBe('guided_onboarding');
    expect(body.data.amountTotal).toBe(29900);
    expect(body.data.currency).toBe('usd');
    expect(body.data.paymentStatus).toBe('paid');
    expect(body.data.catalog.name).toBe('Guided Onboarding');
    expect(body.data.catalog.price).toBe(299);
  });

  it('returns full purchase details plus catalog copy for the owner\'s process_audit purchase', async () => {
    vi.mocked(db.oneTimePurchase.findUnique).mockResolvedValue({
      id: 'cs_audit',
      userId: TEST_USER_ID,
      sku: 'process_audit',
      stripePaymentIntentId: 'pi_test_audit',
      amountTotal: 150000,
      currency: 'usd',
      paymentStatus: 'paid',
      createdAt: new Date('2026-08-20T00:00:00Z'),
      updatedAt: new Date('2026-08-20T00:00:00Z'),
    } as never);

    const res = await GET(makeRequest('cs_audit'));
    const body = await res.json();
    expect(body.data.catalog.name).toBe('Process Audit');
    expect(body.data.catalog.price).toBe(1500);
  });

  it('returns catalog: null (not a crash) for an unrecognized sku value', async () => {
    vi.mocked(db.oneTimePurchase.findUnique).mockResolvedValue({
      id: 'cs_legacy',
      userId: TEST_USER_ID,
      sku: 'example_onboarding_audit',
      stripePaymentIntentId: null,
      amountTotal: 100,
      currency: 'usd',
      paymentStatus: 'paid',
      createdAt: new Date('2026-08-20T00:00:00Z'),
      updatedAt: new Date('2026-08-20T00:00:00Z'),
    } as never);

    const res = await GET(makeRequest('cs_legacy'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.pending).toBe(false);
    expect(body.data.catalog).toBeNull();
  });

  it('surfaces a non-"paid" paymentStatus honestly rather than assuming success', async () => {
    vi.mocked(db.oneTimePurchase.findUnique).mockResolvedValue({
      id: 'cs_unsettled',
      userId: TEST_USER_ID,
      sku: 'guided_onboarding',
      stripePaymentIntentId: 'pi_test',
      amountTotal: 29900,
      currency: 'usd',
      paymentStatus: 'unpaid',
      createdAt: new Date('2026-08-20T00:00:00Z'),
      updatedAt: new Date('2026-08-20T00:00:00Z'),
    } as never);

    const res = await GET(makeRequest('cs_unsettled'));
    const body = await res.json();
    expect(body.data.paymentStatus).toBe('unpaid');
  });
});
