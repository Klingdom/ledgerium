/**
 * Tests for POST /api/invites/accept
 * (iter 082 / TEAM-P02 Part C)
 *
 * Covers:
 *   - 400 when token is missing or empty
 *   - Unauthenticated path: validates token + returns requiresAuth metadata
 *   - Unauthenticated path: 404 for unknown token
 *   - Unauthenticated path: 410 for revoked/expired
 *   - Unauthenticated path: 409 for already accepted
 *   - Authenticated path: 404/410/409 inside transaction
 *   - Authenticated path: 403 email mismatch
 *   - Authenticated path: 409 already a member
 *   - Authenticated path: creates membership + stamps acceptedAt/acceptedBy
 *   - Authenticated path: returns { ok: true, teamId, role }
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// ─── Hoisted mocks (must precede vi.mock factories) ───────────────────────────

const {
  mockTeamInviteFindFirst,
  mockTeamInviteUpdate,
  mockTeamMemberFindUnique,
  mockTeamMemberCreate,
  mockUserFindUnique,
  mockTransaction,
  mockAuth,
} = vi.hoisted(() => ({
  mockTeamInviteFindFirst: vi.fn(),
  mockTeamInviteUpdate: vi.fn(),
  mockTeamMemberFindUnique: vi.fn(),
  mockTeamMemberCreate: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockTransaction: vi.fn(),
  mockAuth: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    teamInvite: {
      findFirst: mockTeamInviteFindFirst,
      update: mockTeamInviteUpdate,
    },
    teamMember: {
      findUnique: mockTeamMemberFindUnique,
      create: mockTeamMemberCreate,
    },
    user: { findUnique: mockUserFindUnique },
    $transaction: mockTransaction,
  },
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

import { POST } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/invites/accept', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const RAW_TOKEN = 'a'.repeat(40); // 40-char hex-like token
const TOKEN_HASH = hashToken(RAW_TOKEN);

const VALID_INVITE = {
  id: 'inv-1',
  teamId: 't1',
  email: 'invitee@example.com',
  role: 'member',
  acceptedAt: null,
  revokedAt: null,
  expiresAt: new Date(Date.now() + 86400_000), // future
  team: { id: 't1', name: 'Test Team', slug: 'test-team' },
};

// ─── Tests: input validation ──────────────────────────────────────────────────

describe('POST /api/invites/accept — input validation', () => {
  it('returns 400 when token is missing', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when token is empty string', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ token: '   ' }));
    expect(res.status).toBe(400);
  });
});

// ─── Tests: unauthenticated path ─────────────────────────────────────────────

describe('POST /api/invites/accept — unauthenticated path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
    mockTeamInviteFindFirst.mockResolvedValue(VALID_INVITE);
  });

  it('returns 404 when token does not match any invite', async () => {
    mockTeamInviteFindFirst.mockResolvedValue(null);
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(404);
  });

  it('returns 410 when invite is revoked', async () => {
    mockTeamInviteFindFirst.mockResolvedValue({ ...VALID_INVITE, revokedAt: new Date() });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toMatch(/revoked/i);
  });

  it('returns 410 when invite is expired', async () => {
    mockTeamInviteFindFirst.mockResolvedValue({
      ...VALID_INVITE,
      expiresAt: new Date(Date.now() - 1000), // past
    });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toMatch(/expired/i);
  });

  it('returns 409 when invite was already accepted', async () => {
    mockTeamInviteFindFirst.mockResolvedValue({ ...VALID_INVITE, acceptedAt: new Date() });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(409);
  });

  it('returns requiresAuth: true with workspace metadata for valid unauthenticated request', async () => {
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requiresAuth).toBe(true);
    expect(body.teamId).toBe('t1');
    expect(body.teamName).toBe('Test Team');
    expect(body.role).toBe('member');
    expect(body.email).toBe('invitee@example.com');
  });

  it('queries the DB with the SHA-256 hash of the raw token', async () => {
    await POST(makeRequest({ token: RAW_TOKEN }));
    const findCall = mockTeamInviteFindFirst.mock.calls[0][0];
    expect(findCall.where.token).toBe(TOKEN_HASH);
    expect(findCall.where.token).not.toBe(RAW_TOKEN);
  });
});

// ─── Tests: authenticated path ────────────────────────────────────────────────

describe('POST /api/invites/accept — authenticated path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });

    // Simulate the SERIALIZABLE transaction by executing the callback synchronously.
    mockTransaction.mockImplementation(async (callback: Function) => {
      const tx = {
        teamInvite: {
          findFirst: mockTeamInviteFindFirst,
          update: mockTeamInviteUpdate,
        },
        teamMember: {
          findUnique: mockTeamMemberFindUnique,
          create: mockTeamMemberCreate,
        },
        user: { findUnique: mockUserFindUnique },
      };
      return callback(tx);
    });

    mockTeamInviteFindFirst.mockResolvedValue(VALID_INVITE);
    mockUserFindUnique.mockResolvedValue({ email: 'invitee@example.com' });
    mockTeamMemberFindUnique.mockResolvedValue(null); // not yet a member
    mockTeamInviteUpdate.mockResolvedValue({});
    mockTeamMemberCreate.mockResolvedValue({});
  });

  it('returns 404 inside transaction when invite not found', async () => {
    mockTeamInviteFindFirst.mockResolvedValue(null);
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(404);
  });

  it('returns 410 inside transaction when invite is revoked', async () => {
    mockTeamInviteFindFirst.mockResolvedValue({ ...VALID_INVITE, revokedAt: new Date() });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(410);
  });

  it('returns 410 inside transaction when invite is expired', async () => {
    mockTeamInviteFindFirst.mockResolvedValue({
      ...VALID_INVITE,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(410);
  });

  it('returns 409 inside transaction when invite already accepted', async () => {
    mockTeamInviteFindFirst.mockResolvedValue({ ...VALID_INVITE, acceptedAt: new Date() });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(409);
  });

  it('returns 403 when authenticated user email does not match invite email', async () => {
    mockUserFindUnique.mockResolvedValue({ email: 'different@example.com' });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/different email/i);
  });

  it('returns 409 when user is already a member of the workspace', async () => {
    mockTeamMemberFindUnique.mockResolvedValue({ teamId: 't1', userId: 'user-1', role: 'member' });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already a member/i);
  });

  it('returns 200 { ok: true, teamId, role } on successful acceptance', async () => {
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.teamId).toBe('t1');
    expect(body.role).toBe('member');
  });

  it('stamps acceptedAt and acceptedBy on the invite', async () => {
    await POST(makeRequest({ token: RAW_TOKEN }));
    expect(mockTeamInviteUpdate).toHaveBeenCalledOnce();
    const updateCall = mockTeamInviteUpdate.mock.calls[0][0];
    expect(updateCall.data.acceptedAt).toBeInstanceOf(Date);
    expect(updateCall.data.acceptedBy).toBe('user-1');
  });

  it('creates TeamMember row with status active', async () => {
    await POST(makeRequest({ token: RAW_TOKEN }));
    expect(mockTeamMemberCreate).toHaveBeenCalledOnce();
    const createCall = mockTeamMemberCreate.mock.calls[0][0];
    expect(createCall.data.teamId).toBe('t1');
    expect(createCall.data.userId).toBe('user-1');
    expect(createCall.data.role).toBe('member');
    expect(createCall.data.status).toBe('active');
    expect(createCall.data.joinedAt).toBeInstanceOf(Date);
  });
});
