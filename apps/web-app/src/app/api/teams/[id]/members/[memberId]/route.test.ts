/**
 * Tests for PATCH /api/teams/:id/members/:memberId and DELETE /api/teams/:id/members/:memberId
 * (iter 082 / TEAM-P02 Part D — per-member endpoints)
 * Updated iter 084 / TEAM-P03.6 Sub-task 5 — admin→owner role-elevation guard.
 *
 * Covers:
 *   PATCH (role change):
 *   - 401 when unauthenticated
 *   - 400 when role is invalid
 *   - 403 when caller is not owner/admin
 *   - 403 when admin tries to promote to owner (code: 'forbidden_role_elevation')
 *   - 404 when target member not found
 *   - 400 when demoting the sole owner
 *   - 200 { ok: true, memberId, role } on success
 *   - 200 when owner promotes to owner (owner→owner allowed)
 *
 *   DELETE (by memberId):
 *   - 401 when unauthenticated
 *   - 403 when caller is not owner/admin
 *   - 404 when target member not found
 *   - 400 when removing the sole owner
 *   - 200 { ok: true } on success
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoisted mocks (must precede vi.mock factories) ───────────────────────────

const {
  mockTeamMemberFindUnique,
  mockTeamMemberFindFirst,
  mockTeamMemberCount,
  mockTeamMemberUpdate,
  mockTeamMemberDelete,
  mockAuth,
} = vi.hoisted(() => ({
  mockTeamMemberFindUnique: vi.fn(),
  mockTeamMemberFindFirst: vi.fn(),
  mockTeamMemberCount: vi.fn(),
  mockTeamMemberUpdate: vi.fn(),
  mockTeamMemberDelete: vi.fn(),
  mockAuth: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    teamMember: {
      findUnique: mockTeamMemberFindUnique,
      findFirst: mockTeamMemberFindFirst,
      count: mockTeamMemberCount,
      update: mockTeamMemberUpdate,
      delete: mockTeamMemberDelete,
    },
  },
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

import { PATCH, DELETE } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePatchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/teams/t1/members/mem-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function makeDeleteRequest() {
  return new NextRequest('http://localhost/api/teams/t1/members/mem-1', {
    method: 'DELETE',
  });
}

const PARAMS = { params: { id: 't1', memberId: 'mem-1' } };
const OWNER_CALLER = { teamId: 't1', userId: 'caller-1', role: 'owner' };
const TARGET_MEMBER = { id: 'mem-1', teamId: 't1', userId: 'user-2', role: 'member' };
const TARGET_OWNER = { id: 'mem-1', teamId: 't1', userId: 'user-2', role: 'owner' };

// ─── PATCH tests ──────────────────────────────────────────────────────────────

describe('PATCH /api/teams/:id/members/:memberId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'caller-1' } });
    mockTeamMemberFindUnique.mockResolvedValue(OWNER_CALLER);
    mockTeamMemberFindFirst.mockResolvedValue(TARGET_MEMBER);
    mockTeamMemberCount.mockResolvedValue(2); // 2 owners — demotion safe
    mockTeamMemberUpdate.mockResolvedValue({});
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(makePatchRequest({ role: 'admin' }), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 400 when role is missing', async () => {
    const res = await PATCH(makePatchRequest({}), PARAMS);
    expect(res.status).toBe(400);
  });

  it('returns 400 when role is invalid', async () => {
    const res = await PATCH(makePatchRequest({ role: 'superuser' }), PARAMS);
    expect(res.status).toBe(400);
  });

  it('returns 403 when caller is a regular member', async () => {
    mockTeamMemberFindUnique.mockResolvedValue({ role: 'member' });
    const res = await PATCH(makePatchRequest({ role: 'admin' }), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 403 when caller is not in the team at all', async () => {
    mockTeamMemberFindUnique.mockResolvedValue(null);
    const res = await PATCH(makePatchRequest({ role: 'admin' }), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 404 when target member is not found', async () => {
    mockTeamMemberFindFirst.mockResolvedValue(null);
    const res = await PATCH(makePatchRequest({ role: 'admin' }), PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 400 when demoting the sole owner', async () => {
    mockTeamMemberFindFirst.mockResolvedValue(TARGET_OWNER);
    mockTeamMemberCount.mockResolvedValue(1); // only 1 owner
    const res = await PATCH(makePatchRequest({ role: 'admin' }), PARAMS);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/sole owner/i);
  });

  it('allows owner to promote a member to owner', async () => {
    // caller is OWNER_CALLER (role: 'owner') — elevation is permitted
    const res = await PATCH(makePatchRequest({ role: 'owner' }), PARAMS);
    expect(res.status).toBe(200);
  });

  // ── Sub-task 5 (TEAM-P03.6): admin cannot promote to owner ──────────────────

  it('returns 403 with code forbidden_role_elevation when admin tries to promote to owner', async () => {
    mockTeamMemberFindUnique.mockResolvedValue({ role: 'admin' });
    const res = await PATCH(makePatchRequest({ role: 'owner' }), PARAMS);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('forbidden_role_elevation');
  });

  it('admin can still change roles that are not owner (member → admin)', async () => {
    mockTeamMemberFindUnique.mockResolvedValue({ role: 'admin' });
    const res = await PATCH(makePatchRequest({ role: 'admin' }), PARAMS);
    expect(res.status).toBe(200);
  });

  it('admin can change member to member (no-op is allowed)', async () => {
    mockTeamMemberFindUnique.mockResolvedValue({ role: 'admin' });
    const res = await PATCH(makePatchRequest({ role: 'member' }), PARAMS);
    expect(res.status).toBe(200);
  });

  it('returns 200 { ok: true, memberId, role } on success', async () => {
    const res = await PATCH(makePatchRequest({ role: 'admin' }), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.memberId).toBe('mem-1');
    expect(body.role).toBe('admin');
  });

  it('admin can change member roles (not just owner)', async () => {
    mockTeamMemberFindUnique.mockResolvedValue({ role: 'admin' });
    const res = await PATCH(makePatchRequest({ role: 'member' }), PARAMS);
    expect(res.status).toBe(200);
  });
});

// ─── DELETE tests ─────────────────────────────────────────────────────────────

describe('DELETE /api/teams/:id/members/:memberId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'caller-1' } });
    mockTeamMemberFindUnique.mockResolvedValue(OWNER_CALLER);
    mockTeamMemberFindFirst.mockResolvedValue(TARGET_MEMBER);
    mockTeamMemberCount.mockResolvedValue(2); // 2 owners — removal safe
    mockTeamMemberDelete.mockResolvedValue({});
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is a regular member', async () => {
    mockTeamMemberFindUnique.mockResolvedValue({ role: 'member' });
    const res = await DELETE(makeDeleteRequest(), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 403 when caller is not in the team at all', async () => {
    mockTeamMemberFindUnique.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 404 when target member is not found', async () => {
    mockTeamMemberFindFirst.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(), PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 400 when removing the sole owner', async () => {
    mockTeamMemberFindFirst.mockResolvedValue(TARGET_OWNER);
    mockTeamMemberCount.mockResolvedValue(1); // only 1 owner
    const res = await DELETE(makeDeleteRequest(), PARAMS);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/sole owner/i);
  });

  it('returns 200 { ok: true } on success', async () => {
    const res = await DELETE(makeDeleteRequest(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('deletes by TeamMember.id (not userId)', async () => {
    await DELETE(makeDeleteRequest(), PARAMS);
    expect(mockTeamMemberDelete).toHaveBeenCalledOnce();
    const deleteCall = mockTeamMemberDelete.mock.calls[0][0];
    expect(deleteCall.where.id).toBe('mem-1');
  });
});
