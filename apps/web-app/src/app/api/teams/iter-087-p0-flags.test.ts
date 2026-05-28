/**
 * iter 087 / TEAM-P03.10 — P0 blockers + demo feature flags
 *
 * Covers:
 *   Demo-F1: DISABLE_ADMIN_BOOTSTRAP=true → POST /api/admin/bootstrap returns 404
 *   Demo-F3: DEMO_MODE_DISABLE_TEAMS=true → POST /api/teams returns 404
 *   Demo-F3: DEMO_MODE_DISABLE_TEAMS=true → POST /api/teams/:id/invite returns 404
 *   P0-F:    POST /api/teams 403 includes code:'plan_upgrade_required'
 *   P0-G:    trackServer('team_created') called on successful team creation
 *   P0-G:    trackServer('team_invite_sent') called on successful invite
 *   P0-I:    PATCH /api/teams/:id/members/:memberId returns 409 + code:'sole_owner_protection'
 *   P0-I:    DELETE /api/teams/:id/members/:memberId returns 409 + code:'sole_owner_protection'
 *   P0-L:    GET /api/teams member query includes where:{ status:'active' }
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockAuth,
  mockTrackServer,
  mockUserFindUnique,
  mockTeamCreate,
  mockTeamFindUnique,
  mockTeamMemberFindMany,
  mockTeamMemberFindFirst,
  mockTeamMemberFindUnique,
  mockTeamMemberCount,
  mockTeamMemberUpdate,
  mockTeamInviteUpsert,
  mockTeamInviteFindFirst,
  mockCheckFeatureAccess,
  mockUserFindFirst,
  mockDbAdminFindFirst,
  mockDbUserUpdate,
  mockTransaction,
  mockCountPendingInvites,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockTrackServer: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockTeamCreate: vi.fn(),
  mockTeamFindUnique: vi.fn(),
  mockTeamMemberFindMany: vi.fn(),
  mockTeamMemberFindFirst: vi.fn(),
  mockTeamMemberFindUnique: vi.fn(),
  mockTeamMemberCount: vi.fn(),
  mockTeamMemberUpdate: vi.fn(),
  mockTeamInviteUpsert: vi.fn(),
  mockTeamInviteFindFirst: vi.fn(),
  mockCheckFeatureAccess: vi.fn(),
  mockUserFindFirst: vi.fn(),
  mockDbAdminFindFirst: vi.fn(),
  mockDbUserUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockCountPendingInvites: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/analytics-server', () => ({ trackServer: mockTrackServer }));
vi.mock('@/lib/feature-gating', () => ({ checkFeatureAccess: mockCheckFeatureAccess }));
vi.mock('@/lib/workspace/seat-management', () => ({ countPendingInvites: mockCountPendingInvites }));

vi.mock('@/db', () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
      findFirst: mockDbAdminFindFirst,
      update: mockDbUserUpdate,
    },
    teamMember: {
      findFirst: mockTeamMemberFindFirst,
      findUnique: mockTeamMemberFindUnique,
      findMany: mockTeamMemberFindMany,
      count: mockTeamMemberCount,
      update: mockTeamMemberUpdate,
    },
    team: {
      findUnique: mockTeamFindUnique,
      create: mockTeamCreate,
    },
    teamInvite: {
      upsert: mockTeamInviteUpsert,
      findFirst: mockTeamInviteFindFirst,
    },
    $transaction: mockTransaction,
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGetRequest(url = 'http://localhost/api/teams'): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

function makePostRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function makePatchRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function makeDeleteRequest(url: string): NextRequest {
  return new NextRequest(url, { method: 'DELETE' });
}

// ─── Demo-F1: admin bootstrap env flag ───────────────────────────────────────

/** Minimal bootstrap request — includes the CSRF confirmation header. */
function makeBootstrapRequest(): NextRequest {
  return new NextRequest('http://localhost/api/admin/bootstrap', {
    method: 'POST',
    headers: { 'X-Admin-Bootstrap-Confirm': 'true' },
  });
}

describe('Demo-F1: DISABLE_ADMIN_BOOTSTRAP env flag', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    // Simulate SERIALIZABLE transaction: no existing admin, then promote the user.
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      mockDbAdminFindFirst.mockResolvedValue(null);
      mockDbUserUpdate.mockResolvedValue({ id: 'user-1', email: 'admin@example.com' });
      return callback({
        user: {
          findFirst: mockDbAdminFindFirst,
          update: mockDbUserUpdate,
        },
      });
    });
  });

  it('returns 404 when DISABLE_ADMIN_BOOTSTRAP=true', async () => {
    process.env.DISABLE_ADMIN_BOOTSTRAP = 'true';
    try {
      const { POST } = await import('../admin/bootstrap/route');
      // Guard 1 fires before req.headers is accessed, so any request (even minimal) is fine.
      const res = await POST(makeBootstrapRequest());
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBeDefined();
    } finally {
      delete process.env.DISABLE_ADMIN_BOOTSTRAP;
    }
  });

  it('proceeds normally when DISABLE_ADMIN_BOOTSTRAP is not set', async () => {
    delete process.env.DISABLE_ADMIN_BOOTSTRAP;
    const { POST } = await import('../admin/bootstrap/route');
    const res = await POST(makeBootstrapRequest());
    // No admin exists yet → should promote + return 200
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

// ─── Demo-F3 + P0-F + P0-G + P0-L: teams route ───────────────────────────────

describe('Demo-F3 + P0 fixes: POST /api/teams', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', email: 'owner@example.com', plan: 'team' });
    mockCheckFeatureAccess.mockReturnValue({ allowed: true });
    mockTeamCreate.mockResolvedValue({ id: 'team-1', name: 'My Team', slug: 'my-team-abc123' });
    mockTrackServer.mockResolvedValue(undefined);
  });

  it('Demo-F3: returns 404 when DEMO_MODE_DISABLE_TEAMS=true (POST /api/teams)', async () => {
    process.env.DEMO_MODE_DISABLE_TEAMS = 'true';
    try {
      const { POST } = await import('./route');
      const res = await POST(makePostRequest('http://localhost/api/teams', { name: 'Test Team' }));
      expect(res.status).toBe(404);
    } finally {
      delete process.env.DEMO_MODE_DISABLE_TEAMS;
    }
  });

  it('Demo-F3: POST /api/teams proceeds when DEMO_MODE_DISABLE_TEAMS is not set', async () => {
    delete process.env.DEMO_MODE_DISABLE_TEAMS;
    const { POST } = await import('./route');
    const res = await POST(makePostRequest('http://localhost/api/teams', { name: 'Test Team' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('team-1');
  });

  it('P0-F: 403 for free-plan user includes code:plan_upgrade_required', async () => {
    delete process.env.DEMO_MODE_DISABLE_TEAMS;
    mockCheckFeatureAccess.mockReturnValue({ allowed: false, requiredPlan: 'team' });
    const { POST } = await import('./route');
    const res = await POST(makePostRequest('http://localhost/api/teams', { name: 'Test Team' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('plan_upgrade_required');
    expect(body.upgradeUrl).toBe('/pricing');
  });

  it('P0-G: trackServer("team_created") called after successful team creation', async () => {
    delete process.env.DEMO_MODE_DISABLE_TEAMS;
    const { POST } = await import('./route');
    await POST(makePostRequest('http://localhost/api/teams', { name: 'Test Team' }));
    expect(mockTrackServer).toHaveBeenCalledWith('team_created', {
      teamId: 'team-1',
      userId: 'user-1',
    });
  });

  it('P0-L: GET /api/teams member query includes where:{ status: active }', async () => {
    mockTeamMemberFindMany.mockResolvedValue([
      {
        role: 'owner',
        team: {
          id: 'team-1',
          name: 'My Team',
          slug: 'my-team',
          createdAt: new Date(),
          members: [],
          _count: { members: 0 },
        },
      },
    ]);
    const { GET } = await import('./route');
    await GET();
    const call = mockTeamMemberFindMany.mock.calls[0][0];
    // The include.team.members must have a where: { status: 'active' } clause (P0-L)
    expect(call.include.team.include.members.where).toEqual({ status: 'active' });
  });
});

// ─── Demo-F3 + P0-G: invite route ─────────────────────────────────────────────

describe('Demo-F3 + P0-G: POST /api/teams/:id/invite', () => {
  const PARAMS = { params: { id: 'team-1' } };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', email: 'owner@example.com', plan: 'team' });
    mockTeamMemberFindFirst.mockResolvedValue({ teamId: 'team-1', userId: 'user-1', role: 'owner', status: 'active' });
    mockTeamFindUnique.mockResolvedValue({ plan: 'team' });
    mockTeamInviteFindFirst.mockResolvedValue(null); // no duplicate pending
    mockTeamMemberFindUnique.mockResolvedValue(null); // target not already a member
    mockCountPendingInvites.mockResolvedValue(0);
    mockTeamInviteUpsert.mockResolvedValue({ id: 'invite-1' });
    mockTrackServer.mockResolvedValue(undefined);
    // Default: transaction executes callback
    mockTransaction.mockImplementation(async (fn: any) => fn({
      teamMember: {
        findMany: vi.fn().mockResolvedValue([{ role: 'owner' }]),
      },
      teamInvite: {
        upsert: mockTeamInviteUpsert,
      },
      countPendingInvites: mockCountPendingInvites,
    }));
  });

  it('Demo-F3: returns 404 when DEMO_MODE_DISABLE_TEAMS=true (POST /api/teams/:id/invite)', async () => {
    process.env.DEMO_MODE_DISABLE_TEAMS = 'true';
    try {
      const { POST } = await import('./[id]/invite/route');
      const req = makePostRequest('http://localhost/api/teams/team-1/invite', { email: 'user@example.com', role: 'member' });
      const res = await POST(req, PARAMS);
      expect(res.status).toBe(404);
    } finally {
      delete process.env.DEMO_MODE_DISABLE_TEAMS;
    }
  });

  it('P0-G: trackServer("team_invite_sent") called after successful invite creation', async () => {
    delete process.env.DEMO_MODE_DISABLE_TEAMS;
    // Simulate transaction calling the upsert
    mockTransaction.mockImplementation(async (fn: any, _opts: any) => {
      await fn({
        teamMember: {
          findMany: vi.fn().mockResolvedValue([{ role: 'owner' }]),
        },
        teamInvite: {
          upsert: mockTeamInviteUpsert,
        },
      });
    });
    const { POST } = await import('./[id]/invite/route');
    const req = makePostRequest('http://localhost/api/teams/team-1/invite', { email: 'newmember@example.com', role: 'member' });
    await POST(req, PARAMS);
    expect(mockTrackServer).toHaveBeenCalledWith('team_invite_sent', {
      teamId: 'team-1',
      role: 'member',
      userId: 'user-1',
    });
  });
});

// ─── P0-I: memberId route sole-owner protection (409) ────────────────────────

describe('P0-I: sole-owner protection returns 409', () => {
  const PARAMS = { params: { id: 'team-1', memberId: 'mem-1' } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'caller-1' } });
    mockTeamMemberFindFirst
      .mockResolvedValueOnce({ teamId: 'team-1', userId: 'caller-1', role: 'owner', status: 'active' }) // caller auth
      .mockResolvedValueOnce({ id: 'mem-1', teamId: 'team-1', userId: 'target-1', role: 'owner' }); // target
    mockTeamMemberCount.mockResolvedValue(1); // sole owner
    mockTeamMemberUpdate.mockResolvedValue({});
  });

  it('PATCH returns 409 with code sole_owner_protection when demoting the sole owner', async () => {
    const { PATCH } = await import('./[id]/members/[memberId]/route');
    const res = await PATCH(makePatchRequest('http://localhost/api/teams/team-1/members/mem-1', { role: 'member' }), PARAMS);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('sole_owner_protection');
    expect(body.error).toMatch(/sole owner/i);
  });

  it('DELETE returns 409 with code sole_owner_protection when removing the sole owner', async () => {
    const { DELETE } = await import('./[id]/members/[memberId]/route');
    const res = await DELETE(makeDeleteRequest('http://localhost/api/teams/team-1/members/mem-1'), PARAMS);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('sole_owner_protection');
    expect(body.error).toMatch(/sole owner/i);
  });

  it('PATCH proceeds (200) when there are 2 owners and one is demoted', async () => {
    // Re-setup mocks for this case: 2 owners → safe to demote
    mockTeamMemberFindFirst
      .mockReset()
      .mockResolvedValueOnce({ teamId: 'team-1', userId: 'caller-1', role: 'owner', status: 'active' })
      .mockResolvedValueOnce({ id: 'mem-1', teamId: 'team-1', userId: 'target-1', role: 'owner' });
    mockTeamMemberCount.mockResolvedValue(2);
    const { PATCH } = await import('./[id]/members/[memberId]/route');
    const res = await PATCH(makePatchRequest('http://localhost/api/teams/team-1/members/mem-1', { role: 'member' }), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
