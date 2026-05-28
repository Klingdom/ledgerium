/**
 * Tests for DELETE /api/teams/:id/invite/:inviteId
 * (iter 082 / TEAM-P02 Part B)
 *
 * Covers:
 *   - 401 when unauthenticated
 *   - 403 when caller is not owner/admin
 *   - 404 when invite not found
 *   - 404 when invite already accepted
 *   - 409 when invite already revoked
 *   - 200 { ok: true } on successful revocation
 *   - Sets revokedAt on success
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoisted mocks (must precede vi.mock factories) ───────────────────────────

const {
  mockTeamMemberFindUnique,
  mockTeamMemberFindFirst,
  mockTeamInviteFindFirst,
  mockTeamInviteUpdate,
  mockAuth,
} = vi.hoisted(() => ({
  mockTeamMemberFindUnique: vi.fn(),
  mockTeamMemberFindFirst: vi.fn(),
  mockTeamInviteFindFirst: vi.fn(),
  mockTeamInviteUpdate: vi.fn(),
  mockAuth: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    teamMember: {
      findUnique: mockTeamMemberFindUnique,
      findFirst: mockTeamMemberFindFirst,
    },
    teamInvite: {
      findFirst: mockTeamInviteFindFirst,
      update: mockTeamInviteUpdate,
    },
  },
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

import { DELETE } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest() {
  return new NextRequest('http://localhost/api/teams/t1/invite/inv-1', {
    method: 'DELETE',
  });
}

const PARAMS = { params: { id: 't1', inviteId: 'inv-1' } };
const OWNER_MEMBERSHIP = { teamId: 't1', userId: 'caller-1', role: 'owner' };

const PENDING_INVITE = {
  id: 'inv-1',
  teamId: 't1',
  email: 'invitee@example.com',
  role: 'member',
  acceptedAt: null,
  revokedAt: null,
  expiresAt: new Date(Date.now() + 86400_000),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DELETE /api/teams/:id/invite/:inviteId — Part B', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'caller-1' } });
    // P0-E: route uses findFirst with status:'active' guard for caller auth
    mockTeamMemberFindFirst.mockResolvedValue(OWNER_MEMBERSHIP);
    mockTeamInviteFindFirst.mockResolvedValue(PENDING_INVITE);
    mockTeamInviteUpdate.mockResolvedValue({});
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeRequest(), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is a regular member (not owner/admin)', async () => {
    mockTeamMemberFindFirst.mockResolvedValue({ role: 'member', status: 'active' });
    const res = await DELETE(makeRequest(), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 403 when caller is not in the team at all (P0-E: no active membership)', async () => {
    mockTeamMemberFindFirst.mockResolvedValue(null);
    const res = await DELETE(makeRequest(), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 404 when invite is not found', async () => {
    mockTeamInviteFindFirst.mockResolvedValue(null);
    const res = await DELETE(makeRequest(), PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 404 when invite was already accepted (cannot revoke accepted invites)', async () => {
    mockTeamInviteFindFirst.mockResolvedValue({
      ...PENDING_INVITE,
      acceptedAt: new Date(),
    });
    const res = await DELETE(makeRequest(), PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 409 when invite is already revoked', async () => {
    mockTeamInviteFindFirst.mockResolvedValue({
      ...PENDING_INVITE,
      revokedAt: new Date(),
    });
    const res = await DELETE(makeRequest(), PARAMS);
    expect(res.status).toBe(409);
  });

  it('returns 200 { ok: true } on successful revocation', async () => {
    const res = await DELETE(makeRequest(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('stamps revokedAt on the invite row', async () => {
    await DELETE(makeRequest(), PARAMS);
    expect(mockTeamInviteUpdate).toHaveBeenCalledOnce();
    const updateCall = mockTeamInviteUpdate.mock.calls[0][0];
    expect(updateCall.where.id).toBe('inv-1');
    expect(updateCall.data.revokedAt).toBeInstanceOf(Date);
  });

  it('admin can also revoke invites (not just owner)', async () => {
    mockTeamMemberFindFirst.mockResolvedValue({ role: 'admin', status: 'active' });
    const res = await DELETE(makeRequest(), PARAMS);
    expect(res.status).toBe(200);
  });
});
