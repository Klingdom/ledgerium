'use client';

import { useAccount } from './useAccount';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface UseFeatureGateReturn {
  /** Whether the feature is enabled on the user's current plan. */
  allowed: boolean;
  /** True while account data is still loading. */
  loading: boolean;
  /** The user's current plan name, or empty string while loading. */
  plan: string;
  /** The minimum plan that grants this feature (for upsell copy). */
  requiredPlan: string | undefined;
}

// ─── Feature → minimum plan lookup ────────────────────────────────────────
// Derived from PLAN_FEATURES in plans.ts. Kept here as a static client-side
// map so upgrade CTAs can display the correct plan name without importing
// server-only modules.

const FEATURE_MINIMUM_PLAN: Record<string, string> = {
  // starter features
  cleanExports: 'starter',
  healthScores: 'starter',
  personalWorkspace: 'starter',
  // team features
  intelligenceLayer: 'team',
  bottleneckAnalysis: 'team',
  automationScoring: 'team',
  variantDetection: 'team',
  sharedLibrary: 'team',
  teamWorkspace: 'team',
  // growth features
  advancedAnalytics: 'growth',
  crossWorkflowComparison: 'growth',
  agentComposition: 'growth',
  integrationRisk: 'growth',
  priorityExports: 'growth',
  // enterprise features
  sso: 'enterprise',
  rbac: 'enterprise',
  auditTrail: 'enterprise',
  complianceExports: 'enterprise',
  customRetention: 'enterprise',
};

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * useFeatureGate — resolves access to a single feature flag.
 *
 * Returns `allowed: true` when the server-returned feature map marks the flag
 * as enabled. During loading, `allowed` is false so gated UI stays hidden
 * rather than briefly flashing.
 *
 * @param feature  A FeatureKey string (e.g. "intelligenceLayer")
 */
export function useFeatureGate(feature: string): UseFeatureGateReturn {
  const { account, loading } = useAccount();

  const allowed = account?.features[feature] === true;
  const plan = account?.user.plan ?? '';
  const requiredPlan = allowed ? undefined : FEATURE_MINIMUM_PLAN[feature];

  return { allowed, loading, plan, requiredPlan };
}
