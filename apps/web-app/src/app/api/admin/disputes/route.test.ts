/**
 * Unit tests for GET /api/admin/disputes.
 *
 * Covers:
 *  - 404 when unauthenticated / non-admin (canAccessAdmin gate)
 *  - 200 happy path, empty list
 *  - 200 happy path, rows mapped correctly (team-owned, user-owned, unresolved)
 *  - 500 when the DB query throws unexpectedly
 *  - Response envelope shape: data / error / meta fields present
 *
 * Mocking strategy (mirrors api/admin/backup-status/route.test.ts and
 * api/admin/users/[id]/route.test.ts):
 *  - vi.mock('@/lib/auth') — controls session
 *  - vi.mock('@/lib/admin-allowlist') — controls canAccessAdmin
 *  - vi.mock('@/db') — controls db.stripeDispute.findMany
 *
 * @module api/admin/disputes/route.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/admin-allowlist', () => ({
  canAccessAdmin: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    stripeDispute: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { db } from '@/db';
import { GET } from './route';

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockCanAccessAdmin = canAccessAdmin as ReturnType<typeof vi.fn>;
const mockFindMany = (db as any).stripeDispute.findMany as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/admin/disputes — auth gate', () => {
  it('returns 404 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    mockCanAccessAdmin.mockReturnValue(false);

    const res = await GET();
    expect(res.status).toBe(404);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('returns 404 when session exists but is not an admin', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'regular@example.com' } });
    mockCanAccessAdmin.mockReturnValue(false);

    const res = await GET();
    expect(res.status).toBe(404);
  });
});

describe('GET /api/admin/disputes — happy path', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { email: 'admin@example.com' } });
    mockCanAccessAdmin.mockReturnValue(true);
  });

  it('returns an empty list when no disputes exist', async () => {
    mockFindMany.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.disputes).toEqual([]);
  });

  it('maps rows correctly for both team-owned and user-owned disputes', async () => {
    const now = new Date('2026-08-20T00:00:00Z');
    mockFindMany.mockResolvedValue([
      {
        id: 'dp_team_1',
        chargeId: 'ch_1',
        userId: null,
        teamId: 'team_1',
        amount: 24900,
        currency: 'usd',
        reason: 'fraudulent',
        status: 'needs_response',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'dp_user_1',
        chargeId: 'ch_2',
        userId: 'user_1',
        teamId: null,
        amount: 8900,
        currency: 'usd',
        reason: 'duplicate',
        status: 'won',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.disputes).toHaveLength(2);
    expect(body.data.disputes[0]).toMatchObject({
      id: 'dp_team_1',
      teamId: 'team_1',
      userId: null,
      amount: 24900,
      status: 'needs_response',
    });
    expect(body.data.disputes[1]).toMatchObject({
      id: 'dp_user_1',
      userId: 'user_1',
      teamId: null,
      status: 'won',
    });
    // createdAt/updatedAt are serialized to ISO strings, not Date objects.
    expect(typeof body.data.disputes[0].createdAt).toBe('string');
  });

  it('queries ordered by createdAt descending', async () => {
    mockFindMany.mockResolvedValue([]);
    await GET();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });

  it('returns 500 when the DB query throws unexpectedly', async () => {
    mockFindMany.mockRejectedValue(new Error('SQLITE_BUSY'));
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('internal_error');
  });

  it('response envelope includes generatedAt and durationMs', async () => {
    mockFindMany.mockResolvedValue([]);
    const res = await GET();
    const body = await res.json();
    expect(typeof body.meta.generatedAt).toBe('string');
    expect(typeof body.meta.durationMs).toBe('number');
    expect(body.meta.durationMs).toBeGreaterThanOrEqual(0);
  });
});
