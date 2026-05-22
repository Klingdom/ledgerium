/**
 * Tests for GET /api/analytics/engagement
 * (iter 086 / TEAM-P03.9 Sub-task B-3)
 *
 * Covers:
 *   - 401 when unauthenticated
 *   - 403 when non-admin user
 *   - empty-user-set fast path returns empty users + zeroed distribution
 *   - effectivePlanFor called per user (workspace-aware plan, not user.plan column)
 *   - returned plan reflects workspace membership, not raw DB column
 *   - Promise.all pattern: all users scored even when effectivePlanFor is async
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    user: {
      findMany: vi.fn(),
    },
    analyticsEvent: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/feature-gating', () => ({
  effectivePlanFor: vi.fn().mockResolvedValue('free'),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { GET } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { effectivePlanFor } from '@/lib/feature-gating';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setAuth(value: unknown): void {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(value);
}

const ADMIN_SESSION = { user: { id: 'admin-1', isAdmin: true } };
const NON_ADMIN_SESSION = { user: { id: 'user-1', isAdmin: false } };

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'user@example.com',
    name: 'Test User',
    plan: 'free',
    uploadCount: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/analytics/engagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: empty analytics events
    (db as any).analyticsEvent.findMany.mockResolvedValue([]);
    vi.mocked(db.user.findMany).mockResolvedValue([]);
    vi.mocked(effectivePlanFor).mockResolvedValue('free');
  });

  it('returns 401 when unauthenticated', async () => {
    setAuth(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not admin', async () => {
    setAuth(NON_ADMIN_SESSION);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns empty users array and zeroed distribution when no users exist', async () => {
    setAuth(ADMIN_SESSION);
    vi.mocked(db.user.findMany).mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toEqual([]);
    expect(body.distribution).toEqual({ high: 0, medium: 0, low: 0, inactive: 0 });
  });

  // ── Sub-task B-3: effectivePlanFor workspace-aware plan (TEAM-P03.9) ─────────

  it('calls effectivePlanFor for each user (workspace-aware plan, not raw user.plan column)', async () => {
    setAuth(ADMIN_SESSION);
    const users = [makeUser({ id: 'u1', plan: 'free' }), makeUser({ id: 'u2', plan: 'free' })];
    vi.mocked(db.user.findMany).mockResolvedValue(users as any);

    await GET();

    // effectivePlanFor must be called once per user
    expect(vi.mocked(effectivePlanFor)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(effectivePlanFor)).toHaveBeenCalledWith('u1');
    expect(vi.mocked(effectivePlanFor)).toHaveBeenCalledWith('u2');
  });

  it('returned plan in response reflects effectivePlanFor result, not raw user.plan column', async () => {
    setAuth(ADMIN_SESSION);
    // user.plan column says 'free' (no direct solo subscription),
    // but they are a member of a paid Team workspace.
    const users = [makeUser({ id: 'u1', plan: 'free' })];
    vi.mocked(db.user.findMany).mockResolvedValue(users as any);
    // effectivePlanFor returns 'team' (workspace membership elevates plan)
    vi.mocked(effectivePlanFor).mockResolvedValue('team');

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toHaveLength(1);
    // The response plan must be 'team' — if the old bug (user.plan) was used,
    // it would be 'free'.
    expect(body.users[0].plan).toBe('team');
  });

  it('scores all users via Promise.all even when effectivePlanFor is async', async () => {
    setAuth(ADMIN_SESSION);
    const users = [
      makeUser({ id: 'u1' }),
      makeUser({ id: 'u2' }),
      makeUser({ id: 'u3' }),
    ];
    vi.mocked(db.user.findMany).mockResolvedValue(users as any);
    // Each call resolves asynchronously with a different plan
    vi.mocked(effectivePlanFor)
      .mockResolvedValueOnce('free')
      .mockResolvedValueOnce('starter')
      .mockResolvedValueOnce('team');

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    // All 3 users must be present — Promise.all must not short-circuit
    expect(body.users).toHaveLength(3);
    const plans = body.users.map((u: any) => u.plan).sort();
    expect(plans).toEqual(['free', 'starter', 'team']);
  });
});
