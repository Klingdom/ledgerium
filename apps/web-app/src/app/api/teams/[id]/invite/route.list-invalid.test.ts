/** Row #273 — pending list never offers an invite that acceptance would refuse. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { m } = vi.hoisted(() => ({
  m: { memberFindFirst: vi.fn(), memberFindMany: vi.fn(), inviteFindMany: vi.fn(), auth: vi.fn() },
}));
vi.mock('@/db', () => ({
  db: {
    teamMember: { findFirst: m.memberFindFirst, findMany: m.memberFindMany },
    teamInvite: { findMany: m.inviteFindMany },
  },
}));
vi.mock('@/lib/auth', () => ({ auth: m.auth }));

import { GET } from './route';

function inv(id: string, role: string, invitedBy = 'inviter-1') {
  return { id, email: `${id}@example.com`, role, invitedBy, teamId: 't1',
    expiresAt: new Date(Date.now() + 86400_000), createdAt: new Date() };
}
async function list() {
  const res = await GET(new NextRequest('http://localhost/api/teams/t1/invite'), { params: { id: 't1' } });
  expect(res.status).toBe(200);
  return ((await res.json()).invites as { id: string; role: string }[]);
}

describe('GET /api/teams/:id/invite — invalid pre-#272 invites (#273)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.auth.mockResolvedValue({ user: { id: 'caller-1' } });
    m.memberFindFirst.mockResolvedValue({ role: 'admin', status: 'active' });
    m.memberFindMany.mockResolvedValue([]);
  });

  it('excludes an out-of-set role', async () => {
    m.inviteFindMany.mockResolvedValue([inv('a', 'superadmin'), inv('b', 'member')]);
    expect((await list()).map((i) => i.id)).toEqual(['b']);
  });

  it('excludes owner-from-non-owner, keeps owner-from-active-owner', async () => {
    m.inviteFindMany.mockResolvedValue([inv('a', 'owner', 'adm'), inv('b', 'owner', 'own')]);
    m.memberFindMany.mockResolvedValue([{ userId: 'own' }]);
    expect((await list()).map((i) => i.id)).toEqual(['b']);
  });

  it('does not query inviters when there is no owner invite', async () => {
    m.inviteFindMany.mockResolvedValue([inv('a', 'viewer')]);
    await list();
    expect(m.memberFindMany).not.toHaveBeenCalled();
  });
});
