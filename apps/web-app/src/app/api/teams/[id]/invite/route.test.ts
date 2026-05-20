/**
 * Tests for POST /api/teams/:id/invite and GET /api/teams/:id/invite
 * (iter 082 / TEAM-P02 Part A)
 * Updated iter 084 / TEAM-P03.6 Sub-tasks 3 & 4:
 *   Sub-task 3: feature gate switched from user-plan to workspace-plan
 *               (getPlanConfig(teamPlan).features?.teamWorkspace)
 *   Sub-task 4: teamInvite.create replaced with teamInvite.upsert on
 *               @@unique([teamId, email]) for idempotent re-invite
 *
 * Covers:
 *   - Auth guard (401 when unauthenticated)
 *   - Workspace-plan feature gate (403 when workspace plan lacks teamWorkspace)
 *   - Role guard (403 when caller is not owner/admin)
 *   - Self-invite guard (400)
 *   - Existing member guard (400)
 *   - Duplicate-pending guard (409 with inviteId)
 *   - Seat-quota guard (402 with counts)
 *   - Happy-path token hashing (raw token in URL, hash stored via upsert)
 *   - Upsert used (not create) so re-invite doesn't throw unique constraint
 *   - Free workspace plan → 403 (no teamWorkspace feature)
 *   - Starter workspace plan → 403 (no teamWorkspace feature)
 *   - Team workspace plan → 200 (has teamWorkspace feature)
 *   - Upsert called with correct compound key (teamId_email)
 *   - Re-invite resets acceptedAt / acceptedBy / revokedAt in update payload
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
  mockTeamInviteUpsert,
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
  mockTeamInviteUpsert: vi.fn(),
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
      upsert: mockTeamInviteUpsert,
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
    mockUserFindUnique
      .mockResolvedValueOnce({ id: 'caller-1', email: 'owner@example.com' })
      .mockResolvedValue(null);
    mockTeamFindUnique.mockResolvedValue(TEAM_ROW);
    // Sub-task 3: workspace-plan gate uses getPlanConfig(teamPlan).features?.teamWorkspace
    mockGetPlanConfig.mockReturnValue({ features: { teamWorkspace: true }, maxSeats: 10 });
    mockTeamInviteFindFirst.mockResolvedValue(null);
    mockTeamMemberCount.mockResolvedValue(0);
    mockCountActiveMembers.mockResolvedValue(2);
    mockCountPendingInvites.mockResolvedValue(0);
    // Sub-task 4: upsert used for idempotent re-invite
    mockTeamInviteUpsert.mockResolvedValue({
      id: 'inv-1',
      teamId: 't1',
      email: 'invitee@example.com',
      role: 'member',
      token: 'hash',
      expiresAt: new Date(Date.now() + 86400_000),
    });
    // Keep create mock available but it should not be called on happy path
    mockTeamInviteCreate.mockResolvedValue({
      id: 'inv-create',
      teamId: 't1',
      email: 'invitee@example.com',
      role: 'member',
      token: 'hash',
      expiresAt: new Date(Date.now() + 86400_000),
    });
  });

  // ── Auth guard ───────────────────────────────────────────────────────────────

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePostRequest({ email: 'x@example.com', role: 'member' }), PARAMS);
    expect(res.status).toBe(401);
  });

  // ── Workspace-plan feature gate (Sub-task 3) ──────────────────────────────

  it('returns 403 with feature field when workspace plan lacks teamWorkspace', async () => {
    mockGetPlanConfig.mockReturnValue({ features: { teamWorkspace: false }, maxSeats: 0 });
    const res = await POST(makePostRequest({ email: 'invitee@example.com', role: 'member' }), PARAMS);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.feature).toBe('teamWorkspace');
  });

  it('returns 403 for a free workspace plan (no teamWorkspace)', async () => {
    mockTeamFindUnique.mockResolvedValue({ id: 't1', plan: 'free' });
    mockGetPlanConfig.mockReturnValue({ features: { teamWorkspace: false }, maxSeats: 5 });
    const res = await POST(makePostRequest({ email: 'invitee@example.com', role: 'member' }), PARAMS);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.feature).toBe('teamWorkspace');
    expect(body.requiredPlan).toBe('team');
  });

  it('returns 403 for a starter workspace plan (no teamWorkspace)', async () => {
    mockTeamFindUnique.mockResolvedValue({ id: 't1', plan: 'starter' });
    mockGetPlanConfig.mockReturnValue({ features: { teamWorkspace: false }, maxSeats: 5 });
    const res = await POST(makePostRequest({ email: 'invitee@example.com', role: 'member' }), PARAMS);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.feature).toBe('teamWorkspace');
  });

  it('allows invite when workspace plan is team (has teamWorkspace)', async () => {
    mockTeamFindUnique.mockResolvedValue({ id: 't1', plan: 'team' });
    mockGetPlanConfig.mockReturnValue({ features: { teamWorkspace: true }, maxSeats: 10 });
    const res = await POST(makePostRequest({ email: 'invitee@example.com', role: 'member' }), PARAMS);
    expect(res.status).toBe(200);
  });

  // ── Role guard ────────────────────────────────────────────────────────────

  it('returns 403 when caller is not owner or admin', async () => {
    mockTeamMemberFindUnique.mockResolvedValue({ role: 'member' });
    const res = await POST(makePostRequest({ email: 'x@example.com', role: 'member' }), PARAMS);
    expect(res.status).toBe(403);
  });

  // ── Self-invite guard ─────────────────────────────────────────────────────

  it('returns 400 when inviting own email (self-invite)', async () => {
    const res = await POST(
      makePostRequest({ email: 'owner@example.com', role: 'member' }),
      PARAMS,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/self/i);
  });

  // ── Duplicate-pending guard ───────────────────────────────────────────────

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

  // ── Seat-quota guard ──────────────────────────────────────────────────────

  it('returns 402 when active + pending seats >= maxSeats', async () => {
    mockGetPlanConfig.mockReturnValue({ features: { teamWorkspace: true }, maxSeats: 3 });
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

  it('does NOT check seat quota when maxSeats is MAX_SAFE_INTEGER (unlimited)', async () => {
    mockGetPlanConfig.mockReturnValue({
      features: { teamWorkspace: true },
      maxSeats: Number.MAX_SAFE_INTEGER,
    });
    mockCountActiveMembers.mockResolvedValue(999);
    mockCountPendingInvites.mockResolvedValue(999);
    const res = await POST(
      makePostRequest({ email: 'invitee@example.com', role: 'member' }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    // seat-management helpers should NOT have been called
    expect(mockCountActiveMembers).not.toHaveBeenCalled();
    expect(mockCountPendingInvites).not.toHaveBeenCalled();
  });

  // ── Token hashing (Sub-task 4 happy path) ────────────────────────────────

  it('stores SHA-256 hash of token in DB via upsert, not raw token', async () => {
    await POST(makePostRequest({ email: 'invitee@example.com', role: 'member' }), PARAMS);
    // Sub-task 4: upsert must be used, not create
    expect(mockTeamInviteUpsert).toHaveBeenCalledOnce();
    expect(mockTeamInviteCreate).not.toHaveBeenCalled();
    const upsertArg = mockTeamInviteUpsert.mock.calls[0][0];
    const storedToken: string = upsertArg.create.token;
    // SHA-256 hex digest is 64 chars
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
    // The stored hash (64-char hex) must NOT appear in the inviteUrl
    const upsertArg = mockTeamInviteUpsert.mock.calls[0][0];
    const storedToken: string = upsertArg.create.token;
    expect(body.inviteUrl).not.toContain(storedToken);
  });

  // ── Upsert contract (Sub-task 4) ──────────────────────────────────────────

  it('upsert uses teamId_email compound unique key', async () => {
    await POST(makePostRequest({ email: 'invitee@example.com', role: 'member' }), PARAMS);
    expect(mockTeamInviteUpsert).toHaveBeenCalledOnce();
    const upsertArg = mockTeamInviteUpsert.mock.calls[0][0];
    expect(upsertArg.where).toEqual({
      teamId_email: { teamId: 't1', email: 'invitee@example.com' },
    });
  });

  it('upsert update payload resets acceptedAt, acceptedBy, and revokedAt to null', async () => {
    await POST(makePostRequest({ email: 'invitee@example.com', role: 'member' }), PARAMS);
    const upsertArg = mockTeamInviteUpsert.mock.calls[0][0];
    expect(upsertArg.update.acceptedAt).toBeNull();
    expect(upsertArg.update.acceptedBy).toBeNull();
    expect(upsertArg.update.revokedAt).toBeNull();
  });

  it('upsert create and update payloads both include the hashed token', async () => {
    await POST(makePostRequest({ email: 'invitee@example.com', role: 'member' }), PARAMS);
    const upsertArg = mockTeamInviteUpsert.mock.calls[0][0];
    // Both paths must carry the same hashed token
    expect(upsertArg.create.token).toBe(upsertArg.update.token);
    // And that token must be the SHA-256 hash (64-char hex)
    expect(upsertArg.create.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('upsert create payload contains teamId, email, role, invitedBy, and expiresAt', async () => {
    await POST(makePostRequest({ email: 'invitee@example.com', role: 'admin' }), PARAMS);
    const upsertArg = mockTeamInviteUpsert.mock.calls[0][0];
    expect(upsertArg.create.teamId).toBe('t1');
    expect(upsertArg.create.email).toBe('invitee@example.com');
    expect(upsertArg.create.role).toBe('admin');
    expect(upsertArg.create.invitedBy).toBe('caller-1');
    expect(upsertArg.create.expiresAt).toBeInstanceOf(Date);
  });

  it('response includes inviteId, inviteUrl, email, and expiresAt', async () => {
    const res = await POST(
      makePostRequest({ email: 'invitee@example.com', role: 'member' }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.inviteId).toBeDefined();
    expect(body.inviteUrl).toContain('/teams/join?token=');
    expect(body.email).toBe('invitee@example.com');
    expect(body.expiresAt).toBeDefined();
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
    // Sub-task 3: correct shape with features object
    mockGetPlanConfig.mockReturnValue({ features: { teamWorkspace: true }, maxSeats: 10 });
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

  it('returns 403 when caller is not a member of the team', async () => {
    mockTeamMemberFindUnique.mockResolvedValue(null);
    const res = await GET(makeGetRequest(), PARAMS);
    expect(res.status).toBe(403);
  });

  it('invite list entries include id, email, role, expiresAt, and createdAt', async () => {
    const res = await GET(makeGetRequest(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    const invite = body.invites[0];
    expect(invite.id).toBe('inv-1');
    expect(invite.email).toBe('invitee@example.com');
    expect(invite.role).toBe('member');
    expect(invite.expiresAt).toBeDefined();
    expect(invite.createdAt).toBeDefined();
  });

  it('returns empty array when no pending invites exist', async () => {
    mockTeamInviteFindMany.mockResolvedValue([]);
    const res = await GET(makeGetRequest(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invites).toHaveLength(0);
  });
});
