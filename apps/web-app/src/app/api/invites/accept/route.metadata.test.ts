/** Row #273 — unauthenticated metadata branch never echoes a role acceptance would refuse. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { m } = vi.hoisted(() => ({
  m: { inviteFindFirst: vi.fn(), memberFindFirst: vi.fn(), auth: vi.fn() },
}));
vi.mock('@/db', () => ({
  db: { teamInvite: { findFirst: m.inviteFindFirst }, teamMember: { findFirst: m.memberFindFirst } },
}));
vi.mock('@/lib/auth', () => ({ auth: m.auth }));

import { POST } from './route';

let ip = 0;
function req() {
  ip++;
  return new NextRequest('http://localhost/api/invites/accept', {
    method: 'POST', body: JSON.stringify({ token: 'c'.repeat(40) }),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.0.${ip}` },
  });
}
const invite = (role: string) => ({
  id: 'i', teamId: 't1', email: 'x@example.com', role, invitedBy: 'inviter-1',
  acceptedAt: null, revokedAt: null, expiresAt: new Date(Date.now() + 86400_000),
  team: { id: 't1', name: 'T' },
});

describe('POST /api/invites/accept unauthenticated metadata (#273)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.auth.mockResolvedValue(null);
    m.memberFindFirst.mockResolvedValue(null);
  });

  it.each(['superadmin', ''])('refuses invalid role %j without echoing it', async (role) => {
    m.inviteFindFirst.mockResolvedValue(invite(role));
    const res = await POST(req());
    const text = JSON.stringify(await res.json());
    expect(res.status).toBe(410);
    expect(text).toBe(JSON.stringify({ error: 'Invite has expired' }));
  });

  it('refuses owner from a non-owner inviter, same generic shape', async () => {
    m.inviteFindFirst.mockResolvedValue(invite('owner'));
    m.memberFindFirst.mockResolvedValue({ role: 'admin' });
    const res = await POST(req());
    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ error: 'Invite has expired' });
  });

  it('still returns metadata for a valid invite (member, and owner from owner)', async () => {
    m.inviteFindFirst.mockResolvedValue(invite('member'));
    let res = await POST(req());
    expect(res.status).toBe(200);
    expect((await res.json()).role).toBe('member');
    m.inviteFindFirst.mockResolvedValue(invite('owner'));
    m.memberFindFirst.mockResolvedValue({ role: 'owner' });
    res = await POST(req());
    expect((await res.json()).role).toBe('owner');
  });
});
