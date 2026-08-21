/**
 * Integration tests for GET /api/billing/audit-eligibility.
 *
 * No production code is modified by this file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/audit-eligibility', () => ({
  getAuditEligibility: vi.fn(),
}));

import { GET } from './route';
import { auth } from '@/lib/auth';
import { getAuditEligibility } from '@/lib/audit-eligibility';

const TEST_USER_ID = 'user_eligibility_test';

function setAuth(value: unknown): void {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(value);
}

describe('GET /api/billing/audit-eligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth({ user: { id: TEST_USER_ID, email: 'test@example.com' } });
  });

  it('returns 401 when unauthenticated', async () => {
    setAuth(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('delegates to getAuditEligibility with the session user id and returns its result unmodified', async () => {
    const eligibility = {
      eligible: true,
      minRunsRequired: 5,
      processes: [{ id: 'p1', canonicalName: 'Refunds', runCount: 7, qualifies: true }],
    };
    vi.mocked(getAuditEligibility).mockResolvedValue(eligibility);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(eligibility);
    expect(getAuditEligibility).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it('honestly reports ineligibility — the single most important response shape this endpoint returns', async () => {
    vi.mocked(getAuditEligibility).mockResolvedValue({
      eligible: false,
      minRunsRequired: 5,
      processes: [{ id: 'p1', canonicalName: 'Refunds', runCount: 2, qualifies: false }],
    });

    const res = await GET();
    const body = await res.json();
    expect(body.data.eligible).toBe(false);
    expect(body.data.processes[0].qualifies).toBe(false);
  });
});
