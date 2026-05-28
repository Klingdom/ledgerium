/**
 * Unit tests for feature-gating.ts.
 *
 * Functions under test:
 *   - checkFeatureAccess(user, feature) → FeatureAccessResult
 *   - requireFeature(user, feature) → void (throws NextResponse 403 when denied)
 *   - buildFeatureFlags(user) → FeatureFlagsResponse
 *   - checkRecordingLimit(user) → Promise<RecordingLimitResult>
 *
 * Mocking strategy:
 *   - vi.mock('@/db') — controls db.upload.count for checkRecordingLimit tests.
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
  requireFeature,
  buildFeatureFlags,
  checkRecordingLimit,
  effectivePlanFor,
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
  it('free plan: blocked from advancedAnalytics (Growth+ feature)', () => {
    const user = makeUser({ plan: 'free' });
    const result = checkFeatureAccess(user, 'advancedAnalytics');
    expect(result.allowed).toBe(false);
    expect(result.requiredPlan).toBe('growth');
  });

  it('starter plan: allowed for cleanExports', () => {
    const user = makeUser({ plan: 'starter' });
    const result = checkFeatureAccess(user, 'cleanExports');
    expect(result.allowed).toBe(true);
    expect(result.requiredPlan).toBeUndefined();
  });

  it('growth plan: allowed for advancedAnalytics', () => {
    const user = makeUser({ plan: 'growth' });
    const result = checkFeatureAccess(user, 'advancedAnalytics');
    expect(result.allowed).toBe(true);
  });

  it('blocked result includes requiredPlan pointing to the minimum plan that grants access', () => {
    // teamWorkspace is available from 'team' upward
    const user = makeUser({ plan: 'free' });
    const result = checkFeatureAccess(user, 'teamWorkspace');
    expect(result.allowed).toBe(false);
    expect(result.requiredPlan).toBe('team');
  });

  it('admin email bypasses plan check — allowed regardless of plan field', () => {
    const user = makeUser({ plan: 'free', email: ADMIN_EMAIL });
    const result = checkFeatureAccess(user, 'sso'); // enterprise-only feature
    expect(result.allowed).toBe(true);
    expect(result.requiredPlan).toBeUndefined();
  });

  it('null plan coerces to free — blocked from starter-only features', () => {
    // toPlanType(null) → 'free' because null is not in PLAN_HIERARCHY
    const user = makeUser({ plan: null as unknown as string });
    const result = checkFeatureAccess(user, 'cleanExports'); // starter+
    expect(result.allowed).toBe(false);
  });
});

// ─── requireFeature ──────────────────────────────────────────────────────────

describe('requireFeature', () => {
  it('throws a NextResponse 403 when the feature is not on the user plan', () => {
    const user = makeUser({ plan: 'free' });
    expect(() => requireFeature(user, 'sso')).toThrow();
    try {
      requireFeature(user, 'sso');
    } catch (thrown) {
      // The thrown value is a NextResponse instance
      expect(thrown).toBeInstanceOf(Response);
      expect((thrown as Response).status).toBe(403);
    }
  });

  it('does not throw when the feature is available on the user plan', () => {
    const user = makeUser({ plan: 'starter' });
    expect(() => requireFeature(user, 'cleanExports')).not.toThrow();
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
