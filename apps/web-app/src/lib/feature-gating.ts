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

import { NextResponse } from 'next/server';
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

/**
 * Check if a user has access to a specific feature.
 * Returns { allowed: true } or { allowed: false, requiredPlan }.
 */
export function checkFeatureAccess(user: User, feature: FeatureKey): FeatureAccessResult {
  if (isAdminUnlimited(user.email)) {
    return { allowed: true };
  }
  const plan = toPlanType(user.plan);
  if (hasFeature(plan, feature)) {
    return { allowed: true };
  }
  const requiredPlan = minimumPlanForFeature(feature);
  return { allowed: false, requiredPlan };
}

/**
 * Gate an API route to require a specific feature.
 * Throws a NextResponse with 403 status if the user's plan does not include the feature.
 *
 * Usage:
 * ```typescript
 * export async function GET(req: NextRequest) {
 *   const user = await requireUser();
 *   requireFeature(user, 'advancedAnalytics');
 *   // ... only Growth+ users reach here
 * }
 * ```
 */
export function requireFeature(user: User, feature: FeatureKey): void {
  const result = checkFeatureAccess(user, feature);
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
 * Counts uploads with uploadedAt >= the first day of the current UTC month.
 * This replaces the old hardcoded `plan === 'free' && uploadCount >= 5` check.
 */
export async function checkRecordingLimit(user: User): Promise<RecordingLimitResult> {
  if (isAdminUnlimited(user.email)) {
    return { allowed: true, used: 0, limit: Number.MAX_SAFE_INTEGER };
  }

  const plan = toPlanType(user.plan);
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

/**
 * Build a feature flags response object for a user.
 *
 * The `recordings.used` field is set to 0 here — callers that need the live
 * monthly count should await checkRecordingLimit() separately and merge it in.
 */
export function buildFeatureFlags(user: User): FeatureFlagsResponse {
  if (isAdminUnlimited(user.email)) {
    const enterpriseConfig = getPlanConfig('enterprise');
    return {
      plan: 'enterprise',
      features: { ...enterpriseConfig.features } as Record<string, boolean>,
      limits: {
        recordings: { used: 0, max: 'unlimited' },
        seats: { max: 'unlimited' },
        recorders: { max: 'unlimited' },
      },
    };
  }

  const plan = toPlanType(user.plan);
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
 * Build a complete feature flags response with live recording count.
 * Use this for the /api/account endpoint.
 */
export async function buildFeatureFlagsWithUsage(user: User): Promise<FeatureFlagsResponse> {
  const flags = buildFeatureFlags(user);
  const limitCheck = await checkRecordingLimit(user);

  return {
    ...flags,
    limits: {
      ...flags.limits,
      recordings: {
        used: limitCheck.used,
        max: flags.limits.recordings.max,
      },
    },
  };
}
