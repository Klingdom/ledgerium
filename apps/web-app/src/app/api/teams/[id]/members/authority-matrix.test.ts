/**
 * Row #274 (AUTHZ_AUDIT_001 P1-3): a team actor may not remove or demote someone with more
 * authority than themselves, and may not reduce ACTIVE owners to zero.
 *
 * Uses a small stateful in-memory TeamMember table so the real route logic (including the
 * owner COUNT filter) is exercised, not a canned count.
 *
 * Rule: a non-owner may not remove/change the role of an owner (403 forbidden_role_elevation).
 * Admins are peers — an admin may remove/demote another admin (the invite and PATCH rules
 * already let an admin grant admin).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

interface Row {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  status: string;
}

const { table, mockAuth } = vi.hoisted(() => ({
  table: { rows: [] as Row[] },
  mockAuth: vi.fn(),
}));

function matches(row: Row, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (k === 'teamId_userId') {
      const c = v as { teamId: string; userId: string };
      return row.teamId === c.teamId && row.userId === c.userId;
    }
    return (row as unknown as Record<string, unknown>)[k] === v;
  });
}

vi.mock('@/db', () => ({
  db: {
    teamMember: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        table.rows.find((r) => matches(r, where)) ?? null,
      findUnique: async ({ where }: { where: Record<string, unknown> }) =>
        table.rows.find((r) => matches(r, where)) ?? null,
      count: async ({ where }: { where: Record<string, unknown> }) =>
        table.rows.filter((r) => matches(r, where)).length,
      update: async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> }) => {
        const r = table.rows.find((x) => matches(x, where));
        if (r) Object.assign(r, data);
        return r;
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> }) => {
        const hit = table.rows.filter((x) => matches(x, where));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
    },
  },
}));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

import { PATCH, DELETE as DELETE_BY_ID } from './[memberId]/route';
import { DELETE as DELETE_BULK } from './route';

const ROLES = ['owner', 'admin', 'member', 'viewer'] as const;
const CALLERS = [...ROLES, 'non-member'] as const;
type Caller = (typeof CALLERS)[number];
type Target = (typeof ROLES)[number];

/** Team t1: caller, target, plus an extra active owner so the sole-owner guard never interferes. */
function seed(callerRole: Caller, targetRole: Target) {
  table.rows = [
    { id: 'm-extra', teamId: 't1', userId: 'u-extra', role: 'owner', status: 'active' },
    { id: 'm-target', teamId: 't1', userId: 'u-target', role: targetRole, status: 'active' },
  ];
  if (callerRole !== 'non-member') {
    table.rows.push({ id: 'm-caller', teamId: 't1', userId: 'u-caller', role: callerRole, status: 'active' });
  }
  mockAuth.mockResolvedValue({ user: { id: 'u-caller' } });
}

const params = (memberId = 'm-target') => ({ params: { id: 't1', memberId } });
const url = 'http://localhost/api/teams/t1/members';
const patchReq = (role: string) =>
  new NextRequest(`${url}/m-target`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
    headers: { 'content-type': 'application/json' },
  });
const delReq = () => new NextRequest(`${url}/m-target`, { method: 'DELETE' });
const bulkReq = (userId: string) =>
  new NextRequest(url, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
    headers: { 'content-type': 'application/json' },
  });

/** Expected status for remove / demote given caller and target. */
function expected(caller: Caller, target: Target): number {
  if (caller !== 'owner' && caller !== 'admin') return 403; // not authorised at all
  if (target === 'owner' && caller !== 'owner') return 403; // row #274
  return 200;
}

beforeEach(() => {
  vi.clearAllMocks();
});

const cells = CALLERS.flatMap((c) => ROLES.map((t) => [c, t] as const));

describe('row #274 matrix: remove (single) DELETE /members/:memberId', () => {
  it.each(cells)('caller=%s target=%s', async (caller, target) => {
    seed(caller, target);
    const res = await DELETE_BY_ID(delReq(), params());
    expect(res.status).toBe(expected(caller, target));
    if (caller === 'admin' && target === 'owner') {
      expect((await res.json()).code).toBe('forbidden_role_elevation');
      expect(table.rows.find((r) => r.id === 'm-target')!.status).toBe('active');
    }
    if (expected(caller, target) === 200) {
      expect(table.rows.find((r) => r.id === 'm-target')!.status).toBe('removed');
    }
  });
});

describe('row #274 matrix: remove (bulk) DELETE /members', () => {
  it.each(cells)('caller=%s target=%s', async (caller, target) => {
    seed(caller, target);
    const res = await DELETE_BULK(bulkReq('u-target'), { params: { id: 't1' } });
    expect(res.status).toBe(expected(caller, target));
    if (caller === 'admin' && target === 'owner') {
      expect((await res.json()).code).toBe('forbidden_role_elevation');
      expect(table.rows.find((r) => r.id === 'm-target')!.status).toBe('active');
    }
    if (expected(caller, target) === 200) {
      expect(table.rows.find((r) => r.id === 'm-target')!.status).toBe('removed');
    }
  });
});

describe('row #274 matrix: role change PATCH /members/:memberId (new role = member)', () => {
  it.each(cells)('caller=%s target=%s', async (caller, target) => {
    seed(caller, target);
    const res = await PATCH(patchReq('member'), params());
    expect(res.status).toBe(expected(caller, target));
    if (caller === 'admin' && target === 'owner') {
      expect((await res.json()).code).toBe('forbidden_role_elevation');
      expect(table.rows.find((r) => r.id === 'm-target')!.role).toBe('owner');
    }
    if (expected(caller, target) === 200) {
      expect(table.rows.find((r) => r.id === 'm-target')!.role).toBe('member');
    }
  });

  it('admin may not promote to owner (existing elevation rule unchanged)', async () => {
    seed('admin', 'member');
    const res = await PATCH(patchReq('owner'), params());
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('forbidden_role_elevation');
  });
});

describe('row #274: active-owner count and sole-owner protection', () => {
  function twoOwnersOneRemoved() {
    table.rows = [
      { id: 'm-owner-a', teamId: 't1', userId: 'u-a', role: 'owner', status: 'active' },
      { id: 'm-owner-b', teamId: 't1', userId: 'u-b', role: 'owner', status: 'removed' },
      { id: 'm-admin', teamId: 't1', userId: 'u-admin', role: 'admin', status: 'active' },
    ];
  }

  it('miscount: removed owner does not count — remaining active owner cannot be removed (single)', async () => {
    twoOwnersOneRemoved();
    mockAuth.mockResolvedValue({ user: { id: 'u-a' } }); // owner removing self
    const res = await DELETE_BY_ID(delReq(), params('m-owner-a'));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('sole_owner_protection');
    expect(table.rows.find((r) => r.id === 'm-owner-a')!.status).toBe('active');
  });

  it('miscount: removed owner does not count (bulk)', async () => {
    twoOwnersOneRemoved();
    mockAuth.mockResolvedValue({ user: { id: 'u-a' } });
    const res = await DELETE_BULK(bulkReq('u-a'), { params: { id: 't1' } });
    expect(res.status).toBe(409);
    expect(table.rows.find((r) => r.id === 'm-owner-a')!.status).toBe('active');
  });

  it('last active owner cannot self-demote even when a removed owner row exists', async () => {
    twoOwnersOneRemoved();
    mockAuth.mockResolvedValue({ user: { id: 'u-a' } });
    const res = await PATCH(patchReq('admin'), params('m-owner-a'));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('sole_owner_protection');
    expect(table.rows.find((r) => r.id === 'm-owner-a')!.role).toBe('owner');
  });

  it('a sole owner with no removed rows is still refused (existing behaviour)', async () => {
    table.rows = [{ id: 'm-owner-a', teamId: 't1', userId: 'u-a', role: 'owner', status: 'active' }];
    mockAuth.mockResolvedValue({ user: { id: 'u-a' } });
    expect((await DELETE_BY_ID(delReq(), params('m-owner-a'))).status).toBe(409);
    expect((await PATCH(patchReq('member'), params('m-owner-a'))).status).toBe(409);
  });

  it('with two ACTIVE owners one owner may demote / remove the other', async () => {
    table.rows = [
      { id: 'm-owner-a', teamId: 't1', userId: 'u-a', role: 'owner', status: 'active' },
      { id: 'm-owner-b', teamId: 't1', userId: 'u-b', role: 'owner', status: 'active' },
    ];
    mockAuth.mockResolvedValue({ user: { id: 'u-a' } });
    expect((await PATCH(patchReq('admin'), params('m-owner-b'))).status).toBe(200);
    expect((await DELETE_BY_ID(delReq(), params('m-owner-a'))).status).toBe(409); // now sole owner
  });

  it('an admin cannot strip owners to zero by removing the remaining owner (403, not 409)', async () => {
    twoOwnersOneRemoved();
    mockAuth.mockResolvedValue({ user: { id: 'u-admin' } });
    const res = await DELETE_BY_ID(delReq(), params('m-owner-a'));
    expect(res.status).toBe(403);
    expect(table.rows.find((r) => r.id === 'm-owner-a')!.status).toBe('active');
  });
});
