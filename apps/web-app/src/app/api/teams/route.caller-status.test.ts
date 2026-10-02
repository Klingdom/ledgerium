import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Row #304 / AUTHZ_AUDIT_001 P2-3: GET /api/teams must list a team (and its
 * member emails) only while the CALLER's own membership is active.
 * The fake honours `where.status` so a missing filter actually leaks.
 */

type Row = { userId: string; status: string; role: string; teamId: string };

const state = vi.hoisted(() => ({ rows: [] as any[] }));

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/db', () => ({
  db: {
    teamMember: {
      findMany: vi.fn(async (args: any) =>
        state.rows
          .filter(
            (r: Row) =>
              r.userId === args.where.userId &&
              (args.where.status === undefined || r.status === args.where.status),
          )
          .map((r: Row) => ({
            role: r.role,
            team: {
              id: r.teamId,
              name: 'Acme',
              slug: 'acme',
              createdAt: new Date(0),
              _count: { members: 1 },
              members: [
                { role: 'owner', user: { id: 'u_owner', email: 'owner@example.com', name: 'O' } },
              ],
            },
          })),
      ),
    },
  },
}));

async function callGET() {
  const { GET } = await import('./route');
  return GET();
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { auth } = await import('@/lib/auth');
  vi.mocked(auth).mockResolvedValue({ user: { id: 'u_caller' } } as any);
});

describe('GET /api/teams — caller membership status (#304)', () => {
  it('active member still sees the team and its members', async () => {
    state.rows = [{ userId: 'u_caller', status: 'active', role: 'member', teamId: 't1' }];
    const body = await (await callGET()).json();
    expect(body.teams).toHaveLength(1);
    expect(body.teams[0].members[0].email).toBe('owner@example.com');
  });

  for (const status of ['removed', 'deactivated', 'pending']) {
    it(`${status} member does not see the team or any member email`, async () => {
      state.rows = [{ userId: 'u_caller', status, role: 'member', teamId: 't1' }];
      const res = await callGET();
      const text = await res.text();
      expect(JSON.parse(text).teams).toEqual([]);
      expect(text).not.toContain('owner@example.com');
    });
  }
});
