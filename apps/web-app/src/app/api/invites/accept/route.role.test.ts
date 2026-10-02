/**
 * Row #272 — invites/accept must not grant a role outside the role set, nor owner
 * on the strength of a stored invite whose inviter is not (still) an active owner.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockTx, mockTransaction, mockAuth } = vi.hoisted(() => ({
  mockTx: {
    teamInvite: { findFirst: vi.fn(), update: vi.fn() },
    teamMember: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
  },
  mockTransaction: vi.fn(),
  mockAuth: vi.fn(),
}));

vi.mock('@/db', () => ({ db: { $transaction: mockTransaction } }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

import { POST } from './route';

let ip = 0;
function req() {
  ip++;
  return new NextRequest('http://localhost/api/invites/accept', {
    method: 'POST',
    body: JSON.stringify({ token: 'b'.repeat(40) }),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.7.0.${ip}` },
  });
}

function invite(role: string) {
  return {
    id: 'inv-1', teamId: 't1', email: 'invitee@example.com', role, invitedBy: 'inviter-1',
    acceptedAt: null, revokedAt: null, expiresAt: new Date(Date.now() + 86400_000),
    team: { id: 't1', name: 'T', slug: 't' },
  };
}

describe('POST /api/invites/accept — stored-role defence in depth (#272)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(mockTx));
    mockTx.user.findUnique.mockResolvedValue({ email: 'invitee@example.com' });
    mockTx.teamMember.findUnique.mockResolvedValue(null);
    mockTx.teamMember.findFirst.mockResolvedValue(null);
  });

  it.each(['superadmin', '', 'OWNER'])('refuses invalid stored role %j and writes nothing', async (role) => {
    mockTx.teamInvite.findFirst.mockResolvedValue(invite(role));
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('invalid_invite_role');
    expect(mockTx.teamMember.create).not.toHaveBeenCalled();
    expect(mockTx.teamInvite.update).not.toHaveBeenCalled();
  });

  it('refuses a stored owner invite whose inviter is an admin', async () => {
    mockTx.teamInvite.findFirst.mockResolvedValue(invite('owner'));
    mockTx.teamMember.findFirst.mockResolvedValue({ role: 'admin', status: 'active' });
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('forbidden_role_elevation');
    expect(mockTx.teamMember.create).not.toHaveBeenCalled();
    expect(mockTx.teamInvite.update).not.toHaveBeenCalled();
  });

  it('refuses a stored owner invite whose inviter is gone / not active', async () => {
    mockTx.teamInvite.findFirst.mockResolvedValue(invite('owner'));
    mockTx.teamMember.findFirst.mockResolvedValue(null);
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect(mockTx.teamMember.create).not.toHaveBeenCalled();
  });

  it('honours a stored owner invite when the inviter is still an active owner', async () => {
    mockTx.teamInvite.findFirst.mockResolvedValue(invite('owner'));
    mockTx.teamMember.findFirst.mockResolvedValue({ role: 'owner', status: 'active' });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(mockTx.teamMember.findFirst.mock.calls[0][0].where).toMatchObject({
      teamId: 't1', userId: 'inviter-1', status: 'active',
    });
    expect(mockTx.teamMember.create.mock.calls[0][0].data.role).toBe('owner');
  });

  it.each(['admin', 'member', 'viewer'])('still grants valid role %s without an inviter lookup', async (role) => {
    mockTx.teamInvite.findFirst.mockResolvedValue(invite(role));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(mockTx.teamMember.findFirst).not.toHaveBeenCalled();
    expect(mockTx.teamMember.create.mock.calls[0][0].data.role).toBe(role);
  });

  it('applies the same check when resurrecting a removed membership', async () => {
    mockTx.teamInvite.findFirst.mockResolvedValue(invite('superadmin'));
    mockTx.teamMember.findUnique.mockResolvedValue({ id: 'm9', status: 'removed' });
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect(mockTx.teamMember.update).not.toHaveBeenCalled();
  });
});
