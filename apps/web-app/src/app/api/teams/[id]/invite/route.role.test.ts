/**
 * Row #272 — invite role matrix: caller role x requested role.
 * Rule: requested role must be in {owner,admin,member,viewer} (400 otherwise; missing
 * defaults to member); only an owner may invite as owner (403 forbidden_role_elevation),
 * identical to PATCH /members/:memberId. Non-owner/admin callers are refused first (403).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { m } = vi.hoisted(() => ({
  m: {
    memberFindFirst: vi.fn(), memberFindUnique: vi.fn(), memberFindMany: vi.fn(),
    inviteFindFirst: vi.fn(), inviteUpsert: vi.fn(),
    userFindUnique: vi.fn(), teamFindUnique: vi.fn(),
    transaction: vi.fn(), auth: vi.fn(), plan: vi.fn(), pending: vi.fn(),
  },
}));

vi.mock('@/db', () => ({
  db: {
    user: { findUnique: m.userFindUnique },
    teamMember: { findFirst: m.memberFindFirst, findUnique: m.memberFindUnique, findMany: m.memberFindMany },
    teamInvite: { findFirst: m.inviteFindFirst, upsert: m.inviteUpsert },
    team: { findUnique: m.teamFindUnique },
    $transaction: m.transaction,
  },
}));
vi.mock('@/lib/auth', () => ({ auth: m.auth }));
vi.mock('@/lib/plans', () => ({ getPlanConfig: m.plan, toPlanType: (p: string) => p }));
vi.mock('@/lib/workspace/seat-management', () => ({ countPendingInvites: m.pending }));

import { POST } from './route';
import { resetInviteRateLimitBuckets } from '@/lib/rate-limit/invite-buckets';

const PARAMS = { params: { id: 't1' } };
function post(body: unknown) {
  return new NextRequest('http://localhost/api/teams/t1/invite', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  });
}

type Caller = 'owner' | 'admin' | 'member' | 'viewer' | 'non-member';
const CALLERS: Caller[] = ['owner', 'admin', 'member', 'viewer', 'non-member'];
const ROLES: (string | undefined)[] = ['owner', 'admin', 'member', 'viewer', 'superadmin', undefined];

function expected(caller: Caller, role: string | undefined): number {
  if (caller !== 'owner' && caller !== 'admin') return 403; // existing caller gate
  const r = role ?? 'member';
  if (!['owner', 'admin', 'member', 'viewer'].includes(r)) return 400;
  if (r === 'owner' && caller !== 'owner') return 403;
  return 200;
}

function arrange() {
  resetInviteRateLimitBuckets();
  m.userFindUnique.mockReset();
  m.userFindUnique.mockResolvedValueOnce({ id: 'caller-1', email: 'caller@example.com' }).mockResolvedValue(null);
}

describe('POST /api/teams/:id/invite — role matrix (#272)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.auth.mockResolvedValue({ user: { id: 'caller-1' } });
    m.teamFindUnique.mockResolvedValue({ plan: 'team' });
    m.plan.mockReturnValue({ features: { teamWorkspace: true }, maxSeats: 10 });
    m.inviteFindFirst.mockResolvedValue(null);
    m.memberFindMany.mockResolvedValue([{ role: 'owner' }]);
    m.pending.mockResolvedValue(0);
    m.inviteUpsert.mockResolvedValue({ id: 'inv-1' });
    m.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
      fn({ teamMember: { findMany: m.memberFindMany }, teamInvite: { upsert: m.inviteUpsert } }));
    arrange();
  });

  for (const caller of CALLERS) {
    for (const role of ROLES) {
      const want = expected(caller, role);
      it(`${caller} inviting as ${String(role)} -> ${want}`, async () => {
        m.memberFindFirst.mockResolvedValue(caller === 'non-member' ? null : { role: caller, status: 'active' });
        const body: Record<string, unknown> = { email: 'invitee@example.com' };
        if (role !== undefined) body.role = role;
        const res = await POST(post(body), PARAMS);
        expect(res.status).toBe(want);
        const json = await res.json();
        if (want === 403 && (caller === 'admin' || caller === 'owner')) {
          expect(json.code).toBe('forbidden_role_elevation');
        }
        if (want === 400) {
          expect(JSON.stringify(json)).not.toContain('superadmin');
        }
        if (want === 200) {
          expect(m.inviteUpsert.mock.calls[0][0].create.role).toBe(role ?? 'member');
        } else {
          expect(m.inviteUpsert).not.toHaveBeenCalled();
        }
      });
    }
  }

  it('accepts everything the teams page producer sends (member, viewer) from an admin', async () => {
    m.memberFindFirst.mockResolvedValue({ role: 'admin', status: 'active' });
    for (const role of ['member', 'viewer']) {
      arrange();
      expect((await POST(post({ email: `${role}@example.com`, role }), PARAMS)).status).toBe(200);
    }
  });
});

describe('POST /api/teams/:id/invite — duplicate guard uses the live-invite predicate (#323)', () => {
  const existing = (role: string, invitedBy = 'o1') => ({ id: 'old-1', role, invitedBy });
  beforeEach(() => {
    vi.resetAllMocks();
    m.auth.mockResolvedValue({ user: { id: 'caller-1' } });
    m.teamFindUnique.mockResolvedValue({ plan: 'team' });
    m.plan.mockReturnValue({ features: { teamWorkspace: true }, maxSeats: 10 });
    m.memberFindFirst.mockResolvedValue({ role: 'owner', status: 'active' });
    m.memberFindMany.mockResolvedValue([]);
    m.pending.mockResolvedValue(0);
    m.inviteUpsert.mockResolvedValue({ id: 'inv-1' });
    m.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
      fn({ teamMember: { findMany: m.memberFindMany }, teamInvite: { upsert: m.inviteUpsert } }));
    arrange();
  });

  it('a refused (out-of-set role) pending invite does not block a re-invite', async () => {
    m.inviteFindFirst.mockResolvedValue(existing('superadmin'));
    expect((await POST(post({ email: 'x@example.com' }), PARAMS)).status).toBe(200);
    expect(m.inviteUpsert).toHaveBeenCalled();
  });

  it('a refused owner invite (inviter no longer an active owner) does not block a re-invite', async () => {
    m.inviteFindFirst.mockResolvedValue(existing('owner', 'gone'));
    m.memberFindMany.mockResolvedValue([]);
    expect((await POST(post({ email: 'x@example.com' }), PARAMS)).status).toBe(200);
  });

  it('an acceptable pending invite still blocks with 409', async () => {
    m.inviteFindFirst.mockResolvedValue(existing('member'));
    const res = await POST(post({ email: 'x@example.com' }), PARAMS);
    expect(res.status).toBe(409);
    expect(m.inviteUpsert).not.toHaveBeenCalled();
  });

  it('an owner invite from an active owner still blocks with 409', async () => {
    m.inviteFindFirst.mockResolvedValue(existing('owner', 'o1'));
    m.memberFindMany.mockResolvedValue([{ userId: 'o1' }]);
    expect((await POST(post({ email: 'x@example.com' }), PARAMS)).status).toBe(409);
  });
});
