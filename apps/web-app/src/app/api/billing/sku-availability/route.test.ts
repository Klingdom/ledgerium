/**
 * Integration tests for GET /api/billing/sku-availability.
 *
 * No production code is modified by this file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/stripe', () => ({
  getOneTimePriceId: vi.fn(),
}));

import { GET } from './route';
import { getOneTimePriceId } from '@/lib/stripe';

describe('GET /api/billing/sku-availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports both SKUs unavailable when neither price ID is configured (default shipped state)', async () => {
    vi.mocked(getOneTimePriceId).mockReturnValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ guided_onboarding: false, process_audit: false });
  });

  it('reports guided_onboarding available once its price ID is configured, independent of process_audit', async () => {
    vi.mocked(getOneTimePriceId).mockImplementation((sku: string) =>
      sku === 'guided_onboarding' ? 'price_guided_onboarding' : null,
    );

    const res = await GET();
    const body = await res.json();
    expect(body.data.guided_onboarding).toBe(true);
    expect(body.data.process_audit).toBe(false);
  });

  it('reports process_audit available once its price ID is configured, independent of guided_onboarding', async () => {
    vi.mocked(getOneTimePriceId).mockImplementation((sku: string) =>
      sku === 'process_audit' ? 'price_process_audit' : null,
    );

    const res = await GET();
    const body = await res.json();
    expect(body.data.process_audit).toBe(true);
    expect(body.data.guided_onboarding).toBe(false);
  });

  it('reports both available when both are configured', async () => {
    vi.mocked(getOneTimePriceId).mockReturnValue('price_configured');

    const res = await GET();
    const body = await res.json();
    expect(body.data).toEqual({ guided_onboarding: true, process_audit: true });
  });

  it('does not require authentication', async () => {
    vi.mocked(getOneTimePriceId).mockReturnValue(null);
    // No auth mock at all — route must not import/call it.
    const res = await GET();
    expect(res.status).toBe(200);
  });
});
