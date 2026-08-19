/**
 * Server-side feature gating for Ledgerium AI.
 *
 * Provides guards for API routes and server components to enforce
 * plan-based feature access. All gating decisions derive from PLAN_FEATURES
 * in plans.ts.
 *
 * @see plans.ts for the feature map
 * @see FEATURE_GATING_DESIGN.md for architecture details
 */

import * as React from 'react';
import { NextResponse } from 'next/server';

/**
 * React `cache()` request-scoped memoization with vitest-environment fallback.
 *
 * Production: `React.cache` exposed in React 18.3+ for Server Components → wraps
 * the function with request-scoped memoization.
 *
 * Test: `React.cache` may be undefined under vitest (no Server Component runtime)
 * → identity passthrough preserves function signature without memoization.
 *
 * @iter 088 coordinator-cleanup — original `import { cache } from 'react'` failed
 * with `TypeError: cache is not a function` in vitest environment.
 */
const reactCache: <T extends (...args: any[]) => any>(fn: T) => T =
  (React as any).cache ?? ((fn) => fn);
import type { User } from '@prisma/client';
import {
  toPlanType,
  hasFeature,
  getPlanConfig,
  minimumPlanForFeature,
  PLAN_HIERARCHY,
  type FeatureKey,
  type PlanType,
} from './plans';
import { isAdminUnlimited } from './admin-allowlist';
import { db } from '@/db';

// ─── Feature Access Checks ─────────────────────────────────────────────────

/** Result of a feature access check. */
export interface FeatureAccessResult {
  allowed: boolean;
  /** The lowest plan that grants this feature (only set when allowed=false). */
  requiredPlan?: PlanType | undefined;
}

/** Pure, synchronous feature-map lookup against an already-resolved plan. No DB, no admin bypass. */
function evaluateFeatureAccess(plan: PlanType, feature: FeatureKey): FeatureAccessResult {
  if (hasFeature(plan, feature)) {
    return { allowed: true };
  }
  const requiredPlan = minimumPlanForFeature(feature);
  return { allowed: false, requiredPlan };
}

/**
 * Check if a user has access to a specific feature, using the user's
 * *effective* plan — their own solo plan, or the highest-ranking plan across
 * any active team workspace they belong to, whichever is higher.
 *
 * This is async because resolving the effective plan may require a DB lookup
 * of active workspace memberships (see `effectivePlanForUser`). Every call
 * site must `await` this.
 *
 * Returns { allowed: true } or { allowed: false, requiredPlan }.
 *
 * @see checkSoloFeatureAccess for the (rare) case where workspace membership
 *      must NOT be consulted — e.g. gating the *creation* of a new team.
 */
export async function checkFeatureAccess(user: User, feature: FeatureKey): Promise<FeatureAccessResult> {
  if (isAdminUnlimited(user.email)) {
    return { allowed: true };
  }
  const plan = await effectivePlanForUser(user);
  return evaluateFeatureAccess(plan, feature);
}

/**
 * Check feature access using ONLY the user's own solo `plan` column — ignores
 * any team workspace membership entirely. Synchronous; no DB access.
 *
 * Use this (instead of `checkFeatureAccess`) for gates where a paid team
 * membership should NOT confer access — most notably `teamWorkspace` at
 * `POST /api/teams`: whether a user can *create* a new team is a function of
 * their own subscription, not of a workspace they already happen to belong
 * to. Making that gate effective-plan-aware would let a Free member of
 * someone else's paid workspace spin up additional teams for free, which is
 * a billing/policy question, not a plan-resolution bug — out of scope for
 * `docs/meta/REVENUE_PLAN_20K/team_workspace_status.md` §6(a) item 2.
 *
 * Every other feature gate in the product SHOULD use `checkFeatureAccess`.
 */
export function checkSoloFeatureAccess(user: User, feature: FeatureKey): FeatureAccessResult {
  if (isAdminUnlimited(user.email)) {
    return { allowed: true };
  }
  return evaluateFeatureAccess(toPlanType(user.plan), feature);
}

/**
 * Gate an API route to require a specific feature.
 * Throws a NextResponse with 403 status if the user's effective plan does not
 * include the feature. Async — callers MUST `await` this (a plain `throw`
 * inside an `async` function only surfaces as a promise rejection, not a
 * synchronous exception).
 *
 * Usage:
 * ```typescript
 * export async function GET(req: NextRequest) {
 *   const user = await requireUser();
 *   await requireFeature(user, 'advancedAnalytics');
 *   // ... only Growth+ users (solo or via workspace) reach here
 * }
 * ```
 */
export async function requireFeature(user: User, feature: FeatureKey): Promise<void> {
  const result = await checkFeatureAccess(user, feature);
  if (!result.allowed) {
    throw NextResponse.json(
      {
        error: 'Feature not available on your plan',
        feature,
        requiredPlan: result.requiredPlan,
        upgradeUrl: `/pricing`,
      },
      { status: 403 },
    );
  }
}

// ─── Recording Limit Checks ────────────────────────────────────────────────

/** Result of a recording limit check. */
export interface RecordingLimitResult {
  /** Whether the user is allowed to record. */
  allowed: boolean;
  /** Number of recordings used this calendar month. */
  used: number;
  /** Maximum recordings allowed this month. Number.MAX_SAFE_INTEGER = unlimited. */
  limit: number;
}

/**
 * Check whether the user can upload more recordings this calendar month.
 *
 * Uses the user's *effective* plan (own solo plan, or their highest-ranking
 * active team workspace plan, whichever is higher) — a Free-tier member of a
 * paid Team/Growth workspace gets that workspace's recording quota, not the
 * Free-tier cap (`docs/meta/REVENUE_PLAN_20K/team_workspace_status.md` §3.1).
 *
 * Counts uploads with uploadedAt >= the first day of the current UTC month.
 * This replaces the old hardcoded `plan === 'free' && uploadCount >= 5` check.
 */
export async function checkRecordingLimit(user: User): Promise<RecordingLimitResult> {
  if (isAdminUnlimited(user.email)) {
    return { allowed: true, used: 0, limit: Number.MAX_SAFE_INTEGER };
  }

  const plan = await effectivePlanForUser(user);
  const config = getPlanConfig(plan);
  const limit = config.maxRecordingsPerMonth;

  // Unlimited plans skip the DB query entirely.
  if (limit === Number.MAX_SAFE_INTEGER) {
    return { allowed: true, used: 0, limit };
  }

  const used = await getMonthlyUploadCount(user.id);
  return { allowed: used < limit, used, limit };
}

/**
 * Count uploads for a user created in the current calendar month (UTC).
 * Uses uploadedAt from the Upload model, NOT the cumulative uploadCount field.
 */
async function getMonthlyUploadCount(userId: string): Promise<number> {
  const now = new Date();
  const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return db.upload.count({
    where: {
      userId,
      uploadedAt: { gte: firstOfMonth },
    },
  });
}

// ─── Feature Flags Response ────────────────────────────────────────────────

/** Shape of the feature flags payload returned to the client via /api/account. */
export interface FeatureFlagsResponse {
  plan: PlanType;
  features: Record<string, boolean>;
  limits: {
    recordings: { used: number; max: number | 'unlimited' };
    seats: { max: number | 'unlimited' };
    recorders: { max: number | 'unlimited' };
  };
}

/** Convert internal limit number to API-safe value (Number.MAX_SAFE_INTEGER → "unlimited"). */
function serializeLimit(value: number): number | 'unlimited' {
  return value === Number.MAX_SAFE_INTEGER ? 'unlimited' : value;
}

/** Build a FeatureFlagsResponse for an already-resolved plan. Pure, no DB. */
function buildFeatureFlagsForPlan(plan: PlanType): FeatureFlagsResponse {
  const config = getPlanConfig(plan);
  return {
    plan,
    features: { ...config.features } as Record<string, boolean>,
    limits: {
      recordings: {
        used: 0,
        max: serializeLimit(config.maxRecordingsPerMonth),
      },
      seats: { max: serializeLimit(config.maxSeats) },
      recorders: { max: serializeLimit(config.maxRecorders) },
    },
  };
}

/**
 * Build a feature flags response object for a user, using the user's own
 * solo `plan` field ONLY (does not consult team workspace membership).
 *
 * The `recordings.used` field is set to 0 here — callers that need the live
 * monthly count should await checkRecordingLimit() separately and merge it in.
 *
 * @see buildFeatureFlagsWithUsage for the effective-plan-aware, workspace-aware
 *      version consumed by `/api/account` (the surface a real user checks).
 */
export function buildFeatureFlags(user: User): FeatureFlagsResponse {
  if (isAdminUnlimited(user.email)) {
    return buildFeatureFlagsForPlan('enterprise');
  }
  return buildFeatureFlagsForPlan(toPlanType(user.plan));
}

// ── Effective-plan derivation (TEAM-P02 Part F; extended by TEAM_WORKSPACE_STATUS §6(a) item 2) ──

/**
 * Fetch the PlanType of every ACTIVE team workspace a user belongs to.
 * "Active" membership means `TeamMember.status = 'active'`.
 *
 * Isolated as its own request-scoped-memoized fetch (rather than inlined into
 * `effectivePlanFor`/`effectivePlanForUser`) so that a single request touching
 * multiple gates for the same user (e.g. a route that calls both
 * `checkFeatureAccess` and `checkRecordingLimit`) issues at most ONE
 * `teamMember.findMany` query for that user, not one per gate call — avoids
 * N+1 amplification on the SQLite single-writer deployment target.
 *
 * React cache() is a no-op outside a React render cycle / under vitest (see
 * `reactCache` doc above) — in those contexts each call re-queries. That is
 * still correct, just not deduplicated; production API route handlers get
 * the real memoization benefit.
 */
const fetchActiveWorkspacePlans = reactCache(async (userId: string): Promise<PlanType[]> => {
  const memberships = await (db as any).teamMember.findMany({
    where: {
      userId,
      status: 'active',
    },
    select: {
      team: {
        select: { plan: true },
      },
    },
  });

  return memberships.map((m: any) => toPlanType(m.team?.plan ?? 'free'));
});

/** Return the higher-ranking of `soloPlan` and every plan in `workspacePlans`, per PLAN_HIERARCHY. */
function highestPlan(soloPlan: PlanType, workspacePlans: readonly PlanType[]): PlanType {
  let bestPlan = soloPlan;
  let bestIdx = PLAN_HIERARCHY.indexOf(bestPlan);
  for (const workspacePlan of workspacePlans) {
    const idx = PLAN_HIERARCHY.indexOf(workspacePlan);
    if (idx > bestIdx) {
      bestIdx = idx;
      bestPlan = workspacePlan;
    }
  }
  return bestPlan;
}

/**
 * Derive the effective plan for a user ID by taking the maximum across:
 *   - The user's solo `plan` field (legacy individual subscriptions), AND
 *   - Every active workspace membership's team plan.
 *
 * Uses `PLAN_HIERARCHY.indexOf` for comparison so plan comparisons are
 * always consistent with the canonical hierarchy ordering.
 *
 * @param userId - ID of the user whose effective plan to compute.
 * @returns The highest-ranking PlanType the user holds across all contexts.
 *
 * Request-scoped memoization via React cache() (iter 088 Sub-task 5 perf fix).
 * Same-request calls with the same userId return the cached value, eliminating
 * redundant DB round-trips when multiple Server Components check effective plan.
 *
 * @see effectivePlanForUser — prefer this when the caller already has the
 *      user row loaded (every `checkFeatureAccess`/`checkRecordingLimit` call
 *      site does); it skips the redundant `db.user.findUnique` here.
 */
export const effectivePlanFor = reactCache(async (userId: string): Promise<PlanType> => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  const soloPlan = toPlanType(user?.plan ?? 'free');
  const workspacePlans = await fetchActiveWorkspacePlans(userId);
  return highestPlan(soloPlan, workspacePlans);
});

/**
 * Like `effectivePlanFor`, but takes an already-loaded user row (only `id`
 * and `plan` are read) instead of a bare `userId` — every gate call site in
 * this file's consumers already has the full `User` row in hand, so this
 * avoids a redundant `db.user.findUnique` per gate check. The active-workspace
 * lookup is still request-scope-memoized via `fetchActiveWorkspacePlans`, so
 * calling this multiple times for the same user within one request (e.g. a
 * route that checks both a feature AND the recording limit) issues at most
 * one `teamMember` query total.
 */
export async function effectivePlanForUser(user: Pick<User, 'id' | 'plan'>): Promise<PlanType> {
  const soloPlan = toPlanType(user.plan);
  const workspacePlans = await fetchActiveWorkspacePlans(user.id);
  return highestPlan(soloPlan, workspacePlans);
}

// ── Feature flags with live usage ─────────────────────────────────────────────

/**
 * Build a complete feature flags response with live recording count.
 * Use this for the /api/account endpoint.
 *
 * Uses the user's *effective* plan (workspace-aware — see `effectivePlanForUser`)
 * for `plan`, `features`, and `limits.seats`/`limits.recorders`, so a Free-tier
 * member of a paid Team/Growth workspace sees the plan they actually have
 * access to, not their own dormant solo `plan` column
 * (`docs/meta/REVENUE_PLAN_20K/team_workspace_status.md` §3.1).
 *
 * `limits.recordings.max` is threaded from `checkRecordingLimit`'s resolved
 * `limit` (not re-derived from `flags.limits.recordings.max`) so the
 * displayed cap always matches the cap actually enforced at upload time.
 */
export async function buildFeatureFlagsWithUsage(user: User): Promise<FeatureFlagsResponse> {
  const plan = isAdminUnlimited(user.email) ? 'enterprise' : await effectivePlanForUser(user);
  const flags = buildFeatureFlagsForPlan(plan);
  const limitCheck = await checkRecordingLimit(user);

  return {
    ...flags,
    limits: {
      ...flags.limits,
      recordings: {
        used: limitCheck.used,
        max: serializeLimit(limitCheck.limit),
      },
    },
  };
}
