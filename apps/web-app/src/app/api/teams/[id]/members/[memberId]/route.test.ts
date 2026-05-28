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
    // Route uses findFirst for BOTH caller (1st call) and target (2nd call).
    // mockTeamMemberFindUnique is set here but unused by the route — kept for
    // the per-test overrides below that use it to signal "change the caller role".
    // The actual mock chain: 1st findFirst → caller, 2nd findFirst → target.
    mockTeamMemberFindFirst
      .mockResolvedValueOnce({ ...OWNER_CALLER, status: 'active' }) // caller
      .mockResolvedValue(TARGET_MEMBER); // target (and any subsequent calls)
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
    mockTeamMemberFindFirst
      .mockReset()
      .mockResolvedValueOnce({ role: 'member', status: 'active' }) // caller
      .mockResolvedValue(TARGET_MEMBER);
    const res = await PATCH(makePatchRequest({ role: 'admin' }), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 403 when caller is not in the team at all', async () => {
    mockTeamMemberFindFirst
      .mockReset()
      .mockResolvedValueOnce(null) // caller not found
      .mockResolvedValue(TARGET_MEMBER);
    const res = await PATCH(makePatchRequest({ role: 'admin' }), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 404 when target member is not found', async () => {
    mockTeamMemberFindFirst
      .mockReset()
      .mockResolvedValueOnce({ ...OWNER_CALLER, status: 'active' }) // caller
      .mockResolvedValue(null); // target not found
    const res = await PATCH(makePatchRequest({ role: 'admin' }), PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 409 when demoting the sole owner', async () => {
    mockTeamMemberFindFirst
      .mockReset()
      .mockResolvedValueOnce({ ...OWNER_CALLER, status: 'active' }) // caller
      .mockResolvedValue(TARGET_OWNER); // target is owner
    mockTeamMemberCount.mockResolvedValue(1); // only 1 owner
    const res = await PATCH(makePatchRequest({ role: 'admin' }), PARAMS);
    expect(res.status).toBe(409);
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
    mockTeamMemberFindFirst
      .mockReset()
      .mockResolvedValueOnce({ role: 'admin', status: 'active', teamId: 't1', userId: 'caller-1' })
      .mockResolvedValue(TARGET_MEMBER);
    const res = await PATCH(makePatchRequest({ role: 'owner' }), PARAMS);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('forbidden_role_elevation');
  });

  it('admin can still change roles that are not owner (member → admin)', async () => {
    mockTeamMemberFindFirst
      .mockReset()
      .mockResolvedValueOnce({ role: 'admin', status: 'active', teamId: 't1', userId: 'caller-1' })
      .mockResolvedValue(TARGET_MEMBER);
    const res = await PATCH(makePatchRequest({ role: 'admin' }), PARAMS);
    expect(res.status).toBe(200);
  });

  it('admin can change member to member (no-op is allowed)', async () => {
    mockTeamMemberFindFirst
      .mockReset()
      .mockResolvedValueOnce({ role: 'admin', status: 'active', teamId: 't1', userId: 'caller-1' })
      .mockResolvedValue(TARGET_MEMBER);
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
    mockTeamMemberFindFirst
      .mockReset()
      .mockResolvedValueOnce({ role: 'admin', status: 'active', teamId: 't1', userId: 'caller-1' })
      .mockResolvedValue(TARGET_MEMBER);
    const res = await PATCH(makePatchRequest({ role: 'member' }), PARAMS);
    expect(res.status).toBe(200);
  });
});

// ─── DELETE tests ─────────────────────────────────────────────────────────────

describe('DELETE /api/teams/:id/members/:memberId — Sub-task 6 soft-delete (iter 085)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'caller-1' } });
    // Route uses findFirst for BOTH caller (1st call) and target (2nd call).
    mockTeamMemberFindFirst
      .mockResolvedValueOnce({ ...OWNER_CALLER, status: 'active' }) // caller
      .mockResolvedValue(TARGET_MEMBER); // target (and any subsequent calls)
    mockTeamMemberCount.mockResolvedValue(2); // 2 owners — removal safe
    mockTeamMemberUpdate.mockResolvedValue({});
    mockTeamMemberDelete.mockResolvedValue({});
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is a regular member', async () => {
    mockTeamMemberFindFirst
      .mockReset()
      .mockResolvedValueOnce({ role: 'member', status: 'active' }) // caller
      .mockResolvedValue(TARGET_MEMBER);
    const res = await DELETE(makeDeleteRequest(), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 403 when caller is not in the team at all', async () => {
    mockTeamMemberFindFirst
      .mockReset()
      .mockResolvedValueOnce(null) // caller not found
      .mockResolvedValue(TARGET_MEMBER);
    const res = await DELETE(makeDeleteRequest(), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 404 when target member is not found', async () => {
    mockTeamMemberFindFirst
      .mockReset()
      .mockResolvedValueOnce({ ...OWNER_CALLER, status: 'active' }) // caller
      .mockResolvedValue(null); // target not found
    const res = await DELETE(makeDeleteRequest(), PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 409 when removing the sole owner', async () => {
    mockTeamMemberFindFirst
      .mockReset()
      .mockResolvedValueOnce({ ...OWNER_CALLER, status: 'active' }) // caller
      .mockResolvedValue(TARGET_OWNER); // target is an owner
    mockTeamMemberCount.mockResolvedValue(1); // only 1 owner
    const res = await DELETE(makeDeleteRequest(), PARAMS);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/sole owner/i);
  });

  it('returns 200 { ok: true } on success', async () => {
    const res = await DELETE(makeDeleteRequest(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  // ── Sub-task 6 (iter 085 / TEAM-P03.7): soft-deactivate semantics ──────

  it('Sub-task 6: soft-deactivates the member (status=removed) instead of hard-delete', async () => {
    await DELETE(makeDeleteRequest(), PARAMS);
    expect(mockTeamMemberUpdate).toHaveBeenCalledOnce();
    expect(mockTeamMemberDelete).not.toHaveBeenCalled();
    const updateCall = mockTeamMemberUpdate.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: 'mem-1' });
    expect(updateCall.data.status).toBe('removed');
  });

  it('Sub-task 6: sets deactivatedAt to a fresh Date (audit trail timestamp)', async () => {
    await DELETE(makeDeleteRequest(), PARAMS);
    const updateCall = mockTeamMemberUpdate.mock.calls[0][0];
    expect(updateCall.data.deactivatedAt).toBeInstanceOf(Date);
  });

  it('Sub-task 6: TeamMember.delete NEVER called (audit trail preserved)', async () => {
    await DELETE(makeDeleteRequest(), PARAMS);
    expect(mockTeamMemberDelete).not.toHaveBeenCalled();
  });

  it('Sub-task 6: admin can soft-remove members (parity with owner)', async () => {
    mockTeamMemberFindFirst
      .mockReset()
      .mockResolvedValueOnce({ role: 'admin', status: 'active', teamId: 't1', userId: 'caller-1' })
      .mockResolvedValue(TARGET_MEMBER);
    const res = await DELETE(makeDeleteRequest(), PARAMS);
    expect(res.status).toBe(200);
    expect(mockTeamMemberUpdate).toHaveBeenCalledOnce();
  });

  it('Sub-task 6: owner removal succeeds when multiple owners exist', async () => {
    const TARGET_EXTRA_OWNER = {
      id: 'mem-owner-extra',
      teamId: 't1',
      userId: 'target-owner',
      role: 'owner',
      status: 'active',
    };
    mockTeamMemberFindFirst
      .mockReset()
      .mockResolvedValueOnce({ ...OWNER_CALLER, status: 'active' }) // caller
      .mockResolvedValue(TARGET_EXTRA_OWNER); // target is an owner
    mockTeamMemberCount.mockResolvedValue(3); // 3 owners; can remove this one
    const res = await DELETE(makeDeleteRequest(), PARAMS);
    expect(res.status).toBe(200);
    expect(mockTeamMemberUpdate).toHaveBeenCalledOnce();
  });
});

// ─── iter 088 Sub-task 3: VALID_ROLES includes 'viewer' (UMAP-001 §3 AC-11) ──

describe('PATCH /api/teams/:id/members/:memberId — iter 088 Sub-task 3: viewer role accepted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'caller-1' } });
    mockTeamMemberFindFirst
      .mockResolvedValueOnce({ ...OWNER_CALLER, status: 'active' }) // caller
      .mockResolvedValue(TARGET_MEMBER); // target
    mockTeamMemberCount.mockResolvedValue(2);
    mockTeamMemberUpdate.mockResolvedValue({});
  });

  it('PATCH with role=viewer returns 200 (UMAP-001 §3 AC-11, iter 088 Sub-task 3)', async () => {
    const res = await PATCH(makePatchRequest({ role: 'viewer' }), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.role).toBe('viewer');
  });

  it('PATCH with role=superuser still returns 400 and error lists viewer among valid roles', async () => {
    const res = await PATCH(makePatchRequest({ role: 'superuser' }), PARAMS);
    expect(res.status).toBe(400);
    const body = await res.json();
    // Error message enumerates VALID_ROLES — must include 'viewer' post Sub-task 3
    expect(body.error).toContain('viewer');
    // Must still reject non-existent roles
    expect(body.error).toMatch(/must be one of/i);
  });
});
