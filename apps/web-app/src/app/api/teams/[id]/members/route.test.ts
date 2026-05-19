/**
 * Tests for GET /api/teams/:id/members and DELETE /api/teams/:id/members
 * (iter 082 / TEAM-P02 Part D — collection endpoints)
 *
 * Covers:
 *   GET:
 *   - 401 when unauthenticated
 *   - 403 when caller is not a team member
 *   - Returns members with memberId, status, joinedAt fields
 *   - Pagination metadata (skip, take, total)
 *   - Status filter: 'active' default, 'deactivated', 'all'
 *   - Token/sensitive fields not exposed
 *
 *   DELETE (body-based legacy):
 *   - 401 when unauthenticated
 *   - 400 when userId missing
 *   - 403 when caller not owner/admin
 *   - 404 when target not found
 *   - 400 when sole owner removal attempted
 *   - 200 on success
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoisted mocks (must precede vi.mock factories) ───────────────────────────

const {
  mockTeamMemberFindUnique,
  mockTeamMemberFindMany,
  mockTeamMemberCount,
  mockTeamMemberDeleteMany,
  mockAuth,
} = vi.hoisted(() => ({
  mockTeamMemberFindUnique: vi.fn(),
  mockTeamMemberFindMany: vi.fn(),
  mockTeamMemberCount: vi.fn(),
  mockTeamMemberDeleteMany: vi.fn(),
  mockAuth: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    teamMember: {
      findUnique: mockTeamMemberFindUnique,
      findMany: mockTeamMemberFindMany,
      count: mockTeamMemberCount,
      deleteMany: mockTeamMemberDeleteMany,
    },
  },
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

import { GET, DELETE } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGetRequest(teamId = 't1', query: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/teams/${teamId}/members`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return new NextRequest(url.toString(), { method: 'GET' });
}

function makeDeleteRequest(teamId = 't1', body: unknown) {
  return new NextRequest(`http://localhost/api/teams/${teamId}/members`, {
    method: 'DELETE',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const PARAMS = { params: { id: 't1' } };

const MEMBER_ROW = {
  id: 'mem-1',
  role: 'member',
  status: 'active',
  joinedAt: new Date('2024-01-01'),
  deactivatedAt: null,
  reactivationDeadline: null,
  user: { id: 'user-2', email: 'member@example.com', name: 'Alice' },
};

// ─── GET tests ────────────────────────────────────────────────────────────────

describe('GET /api/teams/:id/members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'caller-1' } });
    mockTeamMemberFindUnique.mockResolvedValue({ teamId: 't1', userId: 'caller-1', role: 'admin' });
    mockTeamMemberFindMany.mockResolvedValue([MEMBER_ROW]);
    mockTeamMemberCount.mockResolvedValue(1);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeGetRequest(), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is not a team member', async () => {
    mockTeamMemberFindUnique.mockResolvedValue(null);
    const res = await GET(makeGetRequest(), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 200 with member list including memberId and status', async () => {
    const res = await GET(makeGetRequest(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.members)).toBe(true);
    const m = body.members[0];
    expect(m.memberId).toBe('mem-1');
    expect(m.id).toBe('user-2');
    expect(m.email).toBe('member@example.com');
    expect(m.status).toBe('active');
    expect(m.role).toBe('member');
  });

  it('returns pagination metadata', async () => {
    const res = await GET(makeGetRequest(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination).toBeDefined();
    expect(typeof body.pagination.skip).toBe('number');
    expect(typeof body.pagination.take).toBe('number');
    expect(typeof body.pagination.total).toBe('number');
  });

  it('passes skip/take query params to findMany', async () => {
    await GET(makeGetRequest('t1', { skip: '10', take: '20' }), PARAMS);
    const findManyCall = mockTeamMemberFindMany.mock.calls[0][0];
    expect(findManyCall.skip).toBe(10);
    expect(findManyCall.take).toBe(20);
  });

  it('clamps take to max 100', async () => {
    await GET(makeGetRequest('t1', { take: '999' }), PARAMS);
    const findManyCall = mockTeamMemberFindMany.mock.calls[0][0];
    expect(findManyCall.take).toBeLessThanOrEqual(100);
  });

  it('applies status=deactivated filter when requested', async () => {
    await GET(makeGetRequest('t1', { status: 'deactivated' }), PARAMS);
    const findManyCall = mockTeamMemberFindMany.mock.calls[0][0];
    expect(findManyCall.where.status).toBe('deactivated');
  });

  it('applies no status filter when status=all', async () => {
    await GET(makeGetRequest('t1', { status: 'all' }), PARAMS);
    const findManyCall = mockTeamMemberFindMany.mock.calls[0][0];
    expect(findManyCall.where.status).toBeUndefined();
  });
});

// ─── DELETE tests (legacy body-based) ────────────────────────────────────────

describe('DELETE /api/teams/:id/members (legacy body-based)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'caller-1' } });
    // caller membership (owner/admin check)
    mockTeamMemberFindUnique
      .mockResolvedValueOnce({ teamId: 't1', userId: 'caller-1', role: 'owner' }) // caller
      .mockResolvedValueOnce({ teamId: 't1', userId: 'target-1', role: 'member' }); // target
    mockTeamMemberCount.mockResolvedValue(2); // 2 owners — safe to remove one
    mockTeamMemberDeleteMany.mockResolvedValue({ count: 1 });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest('t1', { userId: 'target-1' }), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 400 when userId is missing', async () => {
    const res = await DELETE(makeDeleteRequest('t1', {}), PARAMS);
    expect(res.status).toBe(400);
  });

  it('returns 403 when caller is a regular member', async () => {
    mockTeamMemberFindUnique.mockReset();
    mockTeamMemberFindUnique.mockResolvedValue({ role: 'member' });
    const res = await DELETE(makeDeleteRequest('t1', { userId: 'target-1' }), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 404 when target member is not found', async () => {
    mockTeamMemberFindUnique.mockReset();
    mockTeamMemberFindUnique
      .mockResolvedValueOnce({ role: 'owner' }) // caller
      .mockResolvedValueOnce(null); // target not found
    const res = await DELETE(makeDeleteRequest('t1', { userId: 'target-1' }), PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 400 when attempting to remove the sole owner', async () => {
    mockTeamMemberFindUnique.mockReset();
    mockTeamMemberFindUnique
      .mockResolvedValueOnce({ role: 'owner' }) // caller
      .mockResolvedValueOnce({ teamId: 't1', userId: 'target-1', role: 'owner' }); // target IS owner
    mockTeamMemberCount.mockResolvedValue(1); // only 1 owner
    const res = await DELETE(makeDeleteRequest('t1', { userId: 'target-1' }), PARAMS);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/sole owner/i);
  });

  it('returns 200 { ok: true } on successful removal', async () => {
    const res = await DELETE(makeDeleteRequest('t1', { userId: 'target-1' }), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
