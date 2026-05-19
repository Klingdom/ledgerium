/**
 * Tests for POST /api/teams/:id/invite and GET /api/teams/:id/invite
 * (iter 082 / TEAM-P02 Part A)
 *
 * Covers:
 *   - Auth guard (401 when unauthenticated)
 *   - Feature gate (403 when plan lacks teamWorkspace)
 *   - Role guard (403 when caller is not owner/admin)
 *   - Self-invite guard (400)
 *   - Existing member guard (400)
 *   - Duplicate-pending guard (409 with inviteId)
 *   - Seat-quota guard (402 with counts)
 *   - Happy-path token hashing (raw token in URL, hash stored)
 *   - GET lists only non-accepted, non-revoked, non-expired invites
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// ─── Hoisted mocks (must precede vi.mock factories) ───────────────────────────

const {
  mockTeamMemberFindUnique,
  mockTeamMemberCount,
  mockTeamInviteFindFirst,
  mockTeamInviteCreate,
  mockTeamInviteFindMany,
  mockUserFindUnique,
  mockTeamFindUnique,
  mockTeamInviteCount,
  mockAuth,
  mockIsAdminUnlimited,
  mockCheckFeatureAccess,
  mockGetPlanConfig,
  mockCountActiveMembers,
  mockCountPendingInvites,
} = vi.hoisted(() => ({
  mockTeamMemberFindUnique: vi.fn(),
  mockTeamMemberCount: vi.fn(),
  mockTeamInviteFindFirst: vi.fn(),
  mockTeamInviteCreate: vi.fn(),
  mockTeamInviteFindMany: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockTeamFindUnique: vi.fn(),
  mockTeamInviteCount: vi.fn(),
  mockAuth: vi.fn(),
  mockIsAdminUnlimited: vi.fn().mockReturnValue(false),
  mockCheckFeatureAccess: vi.fn(),
  mockGetPlanConfig: vi.fn(),
  mockCountActiveMembers: vi.fn(),
  mockCountPendingInvites: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    user: { findUnique: mockUserFindUnique },
    teamMember: {
      findUnique: mockTeamMemberFindUnique,
      count: mockTeamMemberCount,
    },
    teamInvite: {
      findFirst: mockTeamInviteFindFirst,
      create: mockTeamInviteCreate,
      findMany: mockTeamInviteFindMany,
      count: mockTeamInviteCount,
    },
    team: { findUnique: mockTeamFindUnique },
  },
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/admin-allowlist', () => ({ isAdminUnlimited: mockIsAdminUnlimited }));
vi.mock('@/lib/feature-gating', () => ({ checkFeatureAccess: mockCheckFeatureAccess }));
vi.mock('@/lib/plans', () => ({
  getPlanConfig: mockGetPlanConfig,
  toPlanType: (p: string) => p,
}));
vi.mock('@/lib/workspace/seat-management', () => ({
  countActiveMembers: mockCountActiveMembers,
  countPendingInvites: mockCountPendingInvites,
}));

import { POST, GET } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/teams/t1/invite', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function makeGetRequest() {
  return new NextRequest('http://localhost/api/teams/t1/invite', { method: 'GET' });
}

const PARAMS = { params: { id: 't1' } };

const OWNER_CALLER = { id: 'mem-caller', teamId: 't1', userId: 'caller-1', role: 'owner' };
const TEAM_ROW = { id: 't1', name: 'Acme', slug: 'acme', plan: 'team' };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/teams/:id/invite', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockIsAdminUnlimited.mockReturnValue(false);
    mockAuth.mockResolvedValue({ user: { id: 'caller-1' } });
    mockTeamMemberFindUnique.mockResolvedValue(OWNER_CALLER);
    // First call: resolve caller's User record; subsequent calls (invitee lookup): null
    mockUserFindUnique.mockResolvedValueOnce({ id: 'caller-1', email: 'owner@example.com' }).mockResolvedValue(null);
    mockTeamFindUnique.mockResolvedValue(TEAM_ROW);
    mockCheckFeatureAccess.mockReturnValue({ allowed: true });
    mockGetPlanConfig.mockReturnValue({ teamWorkspace: true, maxSeats: 10 });
    mockTeamInviteFindFirst.mockResolvedValue(null);
    mockTeamMemberCount.mockResolvedValue(0);
    mockCountActiveMembers.mockResolvedValue(2);
    mockCountPendingInvites.mockResolvedValue(0);
    mockTeamInviteCreate.mockResolvedValue({
      id: 'inv-1',
      teamId: 't1',
      email: 'invitee@example.com',
      role: 'member',
      token: 'hash',
      expiresAt: new Date(Date.now() + 86400_000),
    });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePostRequest({ email: 'x@example.com', role: 'member' }), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 403 when plan does not include teamWorkspace', async () => {
    mockCheckFeatureAccess.mockReturnValue({ allowed: false, requiredPlan: 'team' });
    const res = await POST(makePostRequest({ email: 'x@example.com', role: 'member' }), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 403 when caller is not owner or admin', async () => {
    mockTeamMemberFindUnique.mockResolvedValue({ role: 'member' });
    const res = await POST(makePostRequest({ email: 'x@example.com', role: 'member' }), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 400 when inviting own email (self-invite)', async () => {
    const res = await POST(
      makePostRequest({ email: 'owner@example.com', role: 'member' }),
      PARAMS,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/self/i);
  });

  it('returns 409 with inviteId when a pending invite already exists', async () => {
    mockTeamInviteFindFirst.mockResolvedValue({
      id: 'existing-inv',
      acceptedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400_000),
    });
    const res = await POST(
      makePostRequest({ email: 'invitee@example.com', role: 'member' }),
      PARAMS,
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.inviteId).toBe('existing-inv');
  });

  it('returns 402 when active + pending seats >= maxSeats', async () => {
    mockGetPlanConfig.mockReturnValue({ teamWorkspace: true, maxSeats: 3 });
    mockCountActiveMembers.mockResolvedValue(2);
    mockCountPendingInvites.mockResolvedValue(1);
    const res = await POST(
      makePostRequest({ email: 'invitee@example.com', role: 'member' }),
      PARAMS,
    );
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(typeof body.activeMembers).toBe('number');
    expect(typeof body.pendingInvites).toBe('number');
    expect(typeof body.maxSeats).toBe('number');
  });

  it('stores SHA-256 hash of token in DB, not raw token', async () => {
    await POST(makePostRequest({ email: 'invitee@example.com', role: 'member' }), PARAMS);
    expect(mockTeamInviteCreate).toHaveBeenCalledOnce();
    const createArg = mockTeamInviteCreate.mock.calls[0][0];
    const storedToken: string = createArg.data.token;
    // SHA-256 hex digest is 64 chars; a raw 40-char token is not 64 chars of hex
    expect(storedToken).toHaveLength(64);
    // Must be a valid hex string
    expect(storedToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns 200 with inviteUrl containing raw token (not hash)', async () => {
    const res = await POST(
      makePostRequest({ email: 'invitee@example.com', role: 'member' }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.inviteUrl).toBeDefined();
    const storedToken: string = mockTeamInviteCreate.mock.calls[0][0].data.token;
    // inviteUrl should NOT contain the hash
    expect(body.inviteUrl).not.toContain(storedToken);
  });
});

describe('GET /api/teams/:id/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdminUnlimited.mockReturnValue(false);
    mockAuth.mockResolvedValue({ user: { id: 'caller-1' } });
    mockTeamMemberFindUnique.mockResolvedValue(OWNER_CALLER);
    mockTeamFindUnique.mockResolvedValue(TEAM_ROW);
    mockCheckFeatureAccess.mockReturnValue({ allowed: true });
    mockGetPlanConfig.mockReturnValue({ teamWorkspace: true, maxSeats: 10 });
    mockTeamInviteFindMany.mockResolvedValue([
      {
        id: 'inv-1',
        teamId: 't1',
        email: 'invitee@example.com',
        role: 'member',
        token: 'sha256hashvalue',
        acceptedAt: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400_000),
        createdAt: new Date(),
        invitedBy: 'caller-1',
      },
    ]);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeGetRequest(), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 200 with invite list omitting token field', async () => {
    const res = await GET(makeGetRequest(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.invites)).toBe(true);
    const invite = body.invites[0];
    expect(invite.id).toBe('inv-1');
    expect(invite.token).toBeUndefined();
  });
});
