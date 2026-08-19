/**
 * Unit tests for feature-gating.ts.
 *
 * Functions under test:
 *   - checkFeatureAccess(user, feature) → Promise<FeatureAccessResult> (effective-plan-aware,
 *     workspace-aware — TEAM_WORKSPACE_STATUS §6(a) item 2)
 *   - checkSoloFeatureAccess(user, feature) → FeatureAccessResult (solo-plan ONLY, sync)
 *   - requireFeature(user, feature) → Promise<void> (rejects with a NextResponse 403 when denied)
 *   - buildFeatureFlags(user) → FeatureFlagsResponse (solo-plan ONLY, sync)
 *   - buildFeatureFlagsWithUsage(user) → Promise<FeatureFlagsResponse> (effective-plan-aware)
 *   - checkRecordingLimit(user) → Promise<RecordingLimitResult> (effective-plan-aware)
 *   - effectivePlanFor(userId) / effectivePlanForUser(user) → Promise<PlanType>
 *
 * Mocking strategy:
 *   - vi.mock('@/db') — controls db.upload.count for checkRecordingLimit tests, and
 *     db.teamMember.findMany for effective-plan / workspace-membership tests.
 *     No real SQLite DB needed.
 *   - Admin allowlist email ('philklingmbb@gmail.com') used directly to exercise
 *     admin bypass paths.
 *
 * No production code is modified by this file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '@prisma/client';
import {
  checkFeatureAccess,
  checkSoloFeatureAccess,
  requireFeature,
  buildFeatureFlags,
  buildFeatureFlagsWithUsage,
  checkRecordingLimit,
  effectivePlanFor,
  effectivePlanForUser,
} from './feature-gating.js';

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    upload: {
      count: vi.fn().mockResolvedValue(0),
    },
    analyticsEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ plan: 'free' }),
    },
    teamMember: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Minimal User fixture. Only fields read by feature-gating.ts are required. */
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user_test',
    email: 'user@example.com',
    name: 'Test User',
    plan: 'free',
    subscriptionStatus: null,
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    uploadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: null,
    image: null,
    password: null,
    ...overrides,
  } as User;
}

/** The admin-allowlisted email from admin-allowlist.ts (single source of truth). */
const ADMIN_EMAIL = 'philklingmbb@gmail.com';

// ─── checkFeatureAccess ───────────────────────────────────────────────────────

describe('checkFeatureAccess', () => {
  it('free plan: blocked from advancedAnalytics (Growth+ feature)', async () => {
    const user = makeUser({ plan: 'free' });
    const result = await checkFeatureAccess(user, 'advancedAnalytics');
    expect(result.allowed).toBe(false);
    expect(result.requiredPlan).toBe('growth');
  });

  it('starter plan: allowed for cleanExports', async () => {
    const user = makeUser({ plan: 'starter' });
    const result = await checkFeatureAccess(user, 'cleanExports');
    expect(result.allowed).toBe(true);
    expect(result.requiredPlan).toBeUndefined();
  });

  it('growth plan: allowed for advancedAnalytics', async () => {
    const user = makeUser({ plan: 'growth' });
    const result = await checkFeatureAccess(user, 'advancedAnalytics');
    expect(result.allowed).toBe(true);
  });

  it('blocked result includes requiredPlan pointing to the minimum plan that grants access', async () => {
    // teamWorkspace is available from 'team' upward
    const user = makeUser({ plan: 'free' });
    const result = await checkFeatureAccess(user, 'teamWorkspace');
    expect(result.allowed).toBe(false);
    expect(result.requiredPlan).toBe('team');
  });

  it('admin email bypasses plan check — allowed regardless of plan field', async () => {
    const user = makeUser({ plan: 'free', email: ADMIN_EMAIL });
    const result = await checkFeatureAccess(user, 'sso'); // enterprise-only feature
    expect(result.allowed).toBe(true);
    expect(result.requiredPlan).toBeUndefined();
  });

  it('null plan coerces to free — blocked from starter-only features', async () => {
    // toPlanType(null) → 'free' because null is not in PLAN_HIERARCHY
    const user = makeUser({ plan: null as unknown as string });
    const result = await checkFeatureAccess(user, 'cleanExports'); // starter+
    expect(result.allowed).toBe(false);
  });
});

// ─── checkFeatureAccess — workspace-aware (TEAM_WORKSPACE_STATUS §6(a) item 2) ─

describe('checkFeatureAccess — workspace-aware', () => {
  let dbLib: typeof import('@/db');

  beforeEach(async () => {
    vi.clearAllMocks();
    dbLib = await import('@/db');
    // Default: no workspace memberships (byte-identical solo behavior).
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([]);
  });

  it('THE BUG: free user with no team is unaffected — still blocked from intelligenceLayer', async () => {
    const user = makeUser({ plan: 'free' });
    const result = await checkFeatureAccess(user, 'intelligenceLayer');
    expect(result.allowed).toBe(false);
    expect(result.requiredPlan).toBe('team');
  });

  it('THE FIX: free user who is an ACTIVE member of a Team-plan workspace gets Team-level access', async () => {
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([
      { team: { plan: 'team' } },
    ]);
    const user = makeUser({ plan: 'free' });
    const result = await checkFeatureAccess(user, 'intelligenceLayer');
    expect(result.allowed).toBe(true);
    expect(result.requiredPlan).toBeUndefined();
    // Queried the caller's own active memberships, not an arbitrary workspace.
    expect((dbLib.db as any).teamMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: user.id, status: 'active' } }),
    );
  });

  it('a REMOVED/deactivated team membership does NOT elevate access (mirrors P0-E)', async () => {
    // status: 'active' filter is applied at the query level in fetchActiveWorkspacePlans —
    // this test asserts the query is scoped correctly so a non-active row (which a real
    // Prisma query would already exclude) cannot leak through.
    vi.mocked((dbLib.db as any).teamMember.findMany).mockImplementation(async (args: any) => {
      // Simulate real Prisma behavior: a status:'active' where-clause excludes removed rows.
      if (args?.where?.status === 'active') return [];
      return [{ team: { plan: 'growth' } }];
    });
    const user = makeUser({ plan: 'free' });
    const result = await checkFeatureAccess(user, 'intelligenceLayer');
    expect(result.allowed).toBe(false);
  });

  it('solo plan wins when it outranks every workspace membership', async () => {
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([
      { team: { plan: 'starter' } },
    ]);
    const user = makeUser({ plan: 'enterprise' });
    const result = await checkFeatureAccess(user, 'sso'); // enterprise-only
    expect(result.allowed).toBe(true);
  });

  it('admin bypass short-circuits before any workspace lookup', async () => {
    const user = makeUser({ plan: 'free', email: ADMIN_EMAIL });
    const result = await checkFeatureAccess(user, 'sso');
    expect(result.allowed).toBe(true);
    expect((dbLib.db as any).teamMember.findMany).not.toHaveBeenCalled();
  });
});

// ─── checkSoloFeatureAccess — ignores team membership by design ───────────────

describe('checkSoloFeatureAccess', () => {
  it('is synchronous (no DB access) and returns a plain FeatureAccessResult', () => {
    const user = makeUser({ plan: 'team' });
    const result = checkSoloFeatureAccess(user, 'teamWorkspace');
    expect(result).toEqual({ allowed: true });
  });

  it('free user is blocked from teamWorkspace regardless of any team membership — ' +
    'workspace membership must NOT let a free rider create additional teams for free', () => {
    const user = makeUser({ plan: 'free' });
    const result = checkSoloFeatureAccess(user, 'teamWorkspace');
    expect(result.allowed).toBe(false);
    expect(result.requiredPlan).toBe('team');
  });

  it('admin email still bypasses the solo-plan check', () => {
    const user = makeUser({ plan: 'free', email: ADMIN_EMAIL });
    const result = checkSoloFeatureAccess(user, 'teamWorkspace');
    expect(result.allowed).toBe(true);
  });
});

// ─── requireFeature ──────────────────────────────────────────────────────────

describe('requireFeature', () => {
  it('rejects with a NextResponse 403 when the feature is not on the user plan', async () => {
    const user = makeUser({ plan: 'free' });
    await expect(requireFeature(user, 'sso')).rejects.toBeInstanceOf(Response);
    try {
      await requireFeature(user, 'sso');
      throw new Error('requireFeature should have rejected but resolved');
    } catch (thrown) {
      // The thrown value is a NextResponse instance
      expect(thrown).toBeInstanceOf(Response);
      expect((thrown as Response).status).toBe(403);
    }
  });

  it('does not throw when the feature is available on the user plan', async () => {
    const user = makeUser({ plan: 'starter' });
    await expect(requireFeature(user, 'cleanExports')).resolves.toBeUndefined();
  });
});

// ─── buildFeatureFlags ────────────────────────────────────────────────────────

describe('buildFeatureFlags', () => {
  it('free user: features map has cleanExports=false, plan="free"', () => {
    const user = makeUser({ plan: 'free' });
    const flags = buildFeatureFlags(user);
    expect(flags.plan).toBe('free');
    expect(flags.features.cleanExports).toBe(false);
    expect(flags.limits.recordings.max).toBe(5);
  });

  it('enterprise user: all features are true', () => {
    const user = makeUser({ plan: 'enterprise' });
    const flags = buildFeatureFlags(user);
    expect(flags.plan).toBe('enterprise');
    expect(flags.features.sso).toBe(true);
    expect(flags.features.rbac).toBe(true);
    expect(flags.features.auditTrail).toBe(true);
    expect(flags.limits.recordings.max).toBe('unlimited');
    expect(flags.limits.seats.max).toBe('unlimited');
  });

  it('admin email: returns enterprise-equivalent flags regardless of DB plan', () => {
    const user = makeUser({ plan: 'free', email: ADMIN_EMAIL });
    const flags = buildFeatureFlags(user);
    // Admin gets enterprise plan in the response
    expect(flags.plan).toBe('enterprise');
    expect(flags.features.sso).toBe(true);
    expect(flags.limits.recordings.max).toBe('unlimited');
  });
});

// ─── checkRecordingLimit ─────────────────────────────────────────────────────

describe('checkRecordingLimit', () => {
  let dbLib: typeof import('@/db');

  beforeEach(async () => {
    vi.clearAllMocks();
    dbLib = await import('@/db');
  });

  it('free user at limit (5 uploads): allowed=false', async () => {
    vi.mocked(dbLib.db.upload.count).mockResolvedValue(5);
    const user = makeUser({ plan: 'free' });
    const result = await checkRecordingLimit(user);
    expect(result.allowed).toBe(false);
    expect(result.used).toBe(5);
    expect(result.limit).toBe(5);
  });

  it('free user over limit (6 uploads): allowed=false', async () => {
    vi.mocked(dbLib.db.upload.count).mockResolvedValue(6);
    const user = makeUser({ plan: 'free' });
    const result = await checkRecordingLimit(user);
    expect(result.allowed).toBe(false);
  });

  it('admin email: allowed=true without hitting DB', async () => {
    const user = makeUser({ plan: 'free', email: ADMIN_EMAIL });
    const result = await checkRecordingLimit(user);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(Number.MAX_SAFE_INTEGER);
    // Admin path skips DB entirely
    expect(vi.mocked(dbLib.db.upload.count)).not.toHaveBeenCalled();
  });
});

// ─── checkRecordingLimit — workspace-aware (TEAM_WORKSPACE_STATUS §6(a) item 2) ─

describe('checkRecordingLimit — workspace-aware', () => {
  let dbLib: typeof import('@/db');

  beforeEach(async () => {
    vi.clearAllMocks();
    dbLib = await import('@/db');
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([]);
  });

  it('THE BUG: free user with no team is unaffected — still capped at 5/month', async () => {
    vi.mocked(dbLib.db.upload.count).mockResolvedValue(5);
    const user = makeUser({ plan: 'free' });
    const result = await checkRecordingLimit(user);
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(5);
  });

  it('THE FIX: free user who is an ACTIVE member of a Team-plan workspace gets unlimited recordings', async () => {
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([
      { team: { plan: 'team' } },
    ]);
    const user = makeUser({ plan: 'free' });
    const result = await checkRecordingLimit(user);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(Number.MAX_SAFE_INTEGER);
    // Unlimited plans skip the upload-count DB query entirely (see checkRecordingLimit).
    expect(vi.mocked(dbLib.db.upload.count)).not.toHaveBeenCalled();
  });

  it('free user who is an ACTIVE member of a Starter-plan workspace still gets the finite Starter cap', async () => {
    // Starter is above Free but still has a finite monthly cap — proves the
    // fix resolves to the correct *tier*, not just "unlimited if any team".
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([
      { team: { plan: 'starter' } },
    ]);
    vi.mocked(dbLib.db.upload.count).mockResolvedValue(3);
    const user = makeUser({ plan: 'free' });
    const result = await checkRecordingLimit(user);
    expect(result.limit).toBe(15); // starter's maxRecordingsPerMonth
    expect(result.used).toBe(3);
    expect(result.allowed).toBe(true);
  });
});

// ─── effectivePlanFor (iter 088 Sub-task 5: React cache() wrap) ──────────────

describe('effectivePlanFor (iter 088 Sub-task 5)', () => {
  let dbLib: typeof import('@/db');

  beforeEach(async () => {
    vi.clearAllMocks();
    dbLib = await import('@/db');
  });

  it('effectivePlanFor is exported and is a function (cache() wraps the async fn)', () => {
    expect(typeof effectivePlanFor).toBe('function');
  });

  it('returns solo user plan when no workspace memberships exist', async () => {
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValue({ plan: 'starter' } as any);
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([]);
    const plan = await effectivePlanFor('user-solo');
    expect(plan).toBe('starter');
  });

  it('returns workspace plan when it is higher than solo plan', async () => {
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValue({ plan: 'free' } as any);
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([
      { team: { plan: 'growth' } },
    ]);
    const plan = await effectivePlanFor('user-workspace');
    // 'growth' > 'free' — workspace plan wins
    expect(plan).toBe('growth');
  });

  it('returns solo plan when it is higher than all workspace plans', async () => {
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValue({ plan: 'enterprise' } as any);
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([
      { team: { plan: 'team' } },
      { team: { plan: 'free' } },
    ]);
    const plan = await effectivePlanFor('user-enterprise');
    // 'enterprise' > 'team' and 'free'
    expect(plan).toBe('enterprise');
  });

  it('handles null/missing plan on user row by falling back to free', async () => {
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValue(null);
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([]);
    const plan = await effectivePlanFor('user-missing');
    expect(plan).toBe('free');
  });
});

// ─── effectivePlanForUser (TEAM_WORKSPACE_STATUS §6(a) item 2 — N+1 avoidance) ─

describe('effectivePlanForUser', () => {
  let dbLib: typeof import('@/db');

  beforeEach(async () => {
    vi.clearAllMocks();
    dbLib = await import('@/db');
  });

  it('does NOT call db.user.findUnique — the caller already has the user row', async () => {
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([]);
    const plan = await effectivePlanForUser(makeUser({ plan: 'starter' }));
    expect(plan).toBe('starter');
    expect(dbLib.db.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns workspace plan when it is higher than the passed-in solo plan', async () => {
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([
      { team: { plan: 'growth' } },
    ]);
    const plan = await effectivePlanForUser(makeUser({ plan: 'free' }));
    expect(plan).toBe('growth');
  });

  it('agrees with effectivePlanFor(userId) for the same user + membership state', async () => {
    vi.mocked(dbLib.db.user.findUnique).mockResolvedValue({ plan: 'free' } as any);
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([
      { team: { plan: 'team' } },
    ]);
    const byId = await effectivePlanFor('user-x');
    const byRow = await effectivePlanForUser(makeUser({ id: 'user-x', plan: 'free' }));
    expect(byRow).toBe(byId);
    expect(byRow).toBe('team');
  });
});

// ─── buildFeatureFlagsWithUsage (workspace-aware — /api/account surface) ──────

describe('buildFeatureFlagsWithUsage', () => {
  let dbLib: typeof import('@/db');

  beforeEach(async () => {
    vi.clearAllMocks();
    dbLib = await import('@/db');
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([]);
  });

  it('THE BUG: free user with no team is unaffected — plan, features, and limits stay free-tier', async () => {
    vi.mocked(dbLib.db.upload.count).mockResolvedValue(2);
    const user = makeUser({ plan: 'free' });
    const flags = await buildFeatureFlagsWithUsage(user);
    expect(flags.plan).toBe('free');
    expect(flags.features.intelligenceLayer).toBe(false);
    expect(flags.limits.recordings).toEqual({ used: 2, max: 5 });
  });

  it('THE FIX: free user in an ACTIVE Team-plan workspace sees Team plan, features, and unlimited recordings', async () => {
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([
      { team: { plan: 'team' } },
    ]);
    const user = makeUser({ plan: 'free' });
    const flags = await buildFeatureFlagsWithUsage(user);
    expect(flags.plan).toBe('team');
    expect(flags.features.intelligenceLayer).toBe(true);
    expect(flags.features.sharedLibrary).toBe(true);
    expect(flags.limits.recordings.max).toBe('unlimited');
    expect(flags.limits.seats.max).toBe(5);
  });

  it('recordings.max always matches checkRecordingLimit\'s resolved limit, not a stale solo-plan value ' +
    '(regression lock for the pre-fix merge bug that discarded limitCheck.limit)', async () => {
    vi.mocked((dbLib.db as any).teamMember.findMany).mockResolvedValue([
      { team: { plan: 'growth' } },
    ]);
    vi.mocked(dbLib.db.upload.count).mockResolvedValue(0);
    const user = makeUser({ plan: 'free' });
    const flags = await buildFeatureFlagsWithUsage(user);
    // growth's maxRecordingsPerMonth is unlimited — if the old bug were still
    // present, this would incorrectly read back the solo (free) plan's max: 5.
    expect(flags.limits.recordings.max).toBe('unlimited');
  });

  it('admin email: enterprise-equivalent flags, still hits checkRecordingLimit for used-count shape', async () => {
    const user = makeUser({ plan: 'free', email: ADMIN_EMAIL });
    const flags = await buildFeatureFlagsWithUsage(user);
    expect(flags.plan).toBe('enterprise');
    expect(flags.limits.recordings.max).toBe('unlimited');
  });
});
