import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Tests for POST /api/teams (team workspace creation).
 *
 * Sub-task 2 (TEAM-P03.6): verify Team.plan is stamped with the caller's plan
 * at workspace creation time so workspace-level feature gating uses the correct
 * plan tier from day one.
 *
 * @iter 084 / TEAM-P03.6
 */

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const mockTeamCreate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockTeamMemberCreate = vi.hoisted(() => vi.fn()); // created via nested create in team.create

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
    },
    team: {
      create: mockTeamCreate,
    },
  },
}));

vi.mock('@/lib/feature-gating', () => ({
  checkFeatureAccess: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  toPlanType: vi.fn((plan: string) => plan ?? 'free'),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/teams', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

async function callPOST(body: Record<string, unknown>) {
  // Dynamic import after mocks are registered
  const { POST } = await import('./route');
  return POST(makeRequest(body));
}

// ── Test setup ───────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();

  const { auth } = await import('@/lib/auth');
  vi.mocked(auth).mockResolvedValue({ user: { id: 'user_001' } } as any);

  mockUserFindUnique.mockResolvedValue({
    id: 'user_001',
    email: 'owner@example.com',
    plan: 'team',
  });

  mockTeamCreate.mockResolvedValue({
    id: 'team_abc',
    name: 'Acme Corp',
    slug: 'acme-corp-deadbeef',
  });

  const { checkFeatureAccess } = await import('@/lib/feature-gating');
  vi.mocked(checkFeatureAccess).mockReturnValue({ allowed: true } as any);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/teams — plan stamping (TEAM-P03.6, Sub-task 2)', () => {
  it('stamps team.create with plan derived from the calling user plan', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user_001',
      email: 'owner@example.com',
      plan: 'team',
    });

    const res = await callPOST({ name: 'Acme Corp' });
    expect(res.status).toBe(200);

    expect(mockTeamCreate).toHaveBeenCalledOnce();
    const createCall = mockTeamCreate.mock.calls[0][0] as any;
    expect(createCall.data.plan).toBe('team');
  });

  it('stamps plan: "growth" when caller is on growth plan', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user_002',
      email: 'growth@example.com',
      plan: 'growth',
    });

    const res = await callPOST({ name: 'Growth Co' });
    expect(res.status).toBe(200);

    const createCall = mockTeamCreate.mock.calls[0][0] as any;
    expect(createCall.data.plan).toBe('growth');
  });

  it('stamps plan: "free" when caller has no plan field (toPlanType fallback)', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user_003',
      email: 'free@example.com',
      plan: null,
    });

    const { toPlanType } = await import('@/lib/plans');
    vi.mocked(toPlanType).mockReturnValue('free' as any);

    const res = await callPOST({ name: 'Free Workspace' });
    expect(res.status).toBe(200);

    const createCall = mockTeamCreate.mock.calls[0][0] as any;
    expect(createCall.data.plan).toBe('free');
  });

  it('returns 400 when name is shorter than 2 characters', async () => {
    const res = await callPOST({ name: 'A' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/at least 2 characters/i);
    expect(mockTeamCreate).not.toHaveBeenCalled();
  });

  it('returns 401 when caller is unauthenticated', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(null as any);

    const res = await callPOST({ name: 'Will Fail' });
    expect(res.status).toBe(401);
    expect(mockTeamCreate).not.toHaveBeenCalled();
  });

  it('returns 403 when caller is on free plan (feature gate blocks workspace creation)', async () => {
    const { checkFeatureAccess } = await import('@/lib/feature-gating');
    vi.mocked(checkFeatureAccess).mockReturnValue({
      allowed: false,
      requiredPlan: 'team',
    } as any);

    const res = await callPOST({ name: 'Blocked Workspace' });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.feature).toBe('teamWorkspace');
    expect(mockTeamCreate).not.toHaveBeenCalled();
  });

  it('includes createdBy and owner membership in team.create call', async () => {
    const res = await callPOST({ name: 'Ownership Check' });
    expect(res.status).toBe(200);

    const createCall = mockTeamCreate.mock.calls[0][0] as any;
    expect(createCall.data.createdBy).toBe('user_001');
    expect(createCall.data.members.create.userId).toBe('user_001');
    expect(createCall.data.members.create.role).toBe('owner');
  });
});
