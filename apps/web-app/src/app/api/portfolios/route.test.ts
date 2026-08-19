/**
 * Integration test: POST /api/portfolios — proves the workspace-aware
 * `checkFeatureAccess` fix end-to-end at a real route, not just at the
 * feature-gating.ts unit level.
 *
 * `docs/meta/REVENUE_PLAN_20K/team_workspace_status.md` §3.1 named this exact
 * route/feature as the headline example of the bug: "sharedLibrary" gates
 * portfolio creation, and before this fix a Free-tier member of a paid Team
 * workspace was blocked from creating a portfolio despite their workspace
 * paying for the feature.
 *
 * No production code is modified by this file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
    teamMember: { findMany: vi.fn() },
    portfolio: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { POST } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/db';

const mockAuth = vi.mocked(auth);
const mockUserFindUnique = vi.mocked(db.user.findUnique);
const mockTeamMemberFindMany = vi.mocked((db as any).teamMember.findMany);
const mockPortfolioCount = vi.mocked(db.portfolio.count);
const mockPortfolioFindFirst = vi.mocked(db.portfolio.findFirst);
const mockPortfolioCreate = vi.mocked(db.portfolio.create);

const USER_ID = 'user-1';

function makeUser(overrides: Partial<{ plan: string; email: string }> = {}) {
  return {
    id: USER_ID,
    email: 'user@example.com',
    plan: 'free',
    ...overrides,
  } as never;
}

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/portfolios', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: USER_ID } } as never);
  mockUserFindUnique.mockResolvedValue(makeUser());
  mockTeamMemberFindMany.mockResolvedValue([]);
  mockPortfolioCount.mockResolvedValue(0);
  mockPortfolioFindFirst.mockResolvedValue(null);
  mockPortfolioCreate.mockResolvedValue({
    id: 'portfolio-1',
    userId: USER_ID,
    name: 'My Portfolio',
    type: 'folder',
    description: null,
    color: '#6366f1',
    icon: null,
    parentId: null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never);
});

describe('POST /api/portfolios — solo free user (no team)', () => {
  it('THE BUG must remain absent for solo users: free user with no team is still blocked (403)', async () => {
    const res = await POST(makeReq({ name: 'My Portfolio' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.feature).toBe('sharedLibrary');
    expect(body.requiredPlan).toBe('team');
    expect(mockPortfolioCreate).not.toHaveBeenCalled();
  });

  it('queried the caller\'s own active team memberships (not an arbitrary user)', async () => {
    await POST(makeReq({ name: 'My Portfolio' }));
    expect(mockTeamMemberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID, status: 'active' } }),
    );
  });
});

describe('POST /api/portfolios — free user in an active Team-plan workspace', () => {
  it('THE FIX: is granted access and the portfolio is created', async () => {
    mockTeamMemberFindMany.mockResolvedValue([{ team: { plan: 'team' } }] as never);
    const res = await POST(makeReq({ name: 'My Portfolio' }));
    expect(res.status).toBe(201);
    expect(mockPortfolioCreate).toHaveBeenCalledOnce();
  });
});

describe('POST /api/portfolios — free user with a REMOVED team membership', () => {
  it('is NOT granted access — a non-active membership must not elevate the plan', async () => {
    // Real Prisma with status:'active' in the where-clause would already
    // exclude a 'removed' row; this simulates that exclusion explicitly.
    mockTeamMemberFindMany.mockImplementation(async (args: any) => {
      if (args?.where?.status === 'active') return [];
      return [{ team: { plan: 'growth' } }];
    });
    const res = await POST(makeReq({ name: 'My Portfolio' }));
    expect(res.status).toBe(403);
    expect(mockPortfolioCreate).not.toHaveBeenCalled();
  });
});
