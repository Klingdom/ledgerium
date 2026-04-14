/**
 * Plan type system and feature map for Ledgerium AI.
 *
 * Single source of truth for what each pricing tier includes.
 * All feature gating decisions flow through this module.
 *
 * @see FEATURE_GATING_DESIGN.md for architecture details
 * @see TIER_FEATURE_ROADMAP.md for implementation roadmap
 */

/** All available plan types in the Ledgerium pricing model. */
export type PlanType = 'free' | 'starter' | 'team' | 'growth' | 'enterprise';

/** All gatable features in the system. */
export type FeatureKey =
  | 'cleanExports'
  | 'healthScores'
  | 'personalWorkspace'
  | 'intelligenceLayer'
  | 'bottleneckAnalysis'
  | 'automationScoring'
  | 'variantDetection'
  | 'sharedLibrary'
  | 'teamWorkspace'
  | 'advancedAnalytics'
  | 'crossWorkflowComparison'
  | 'agentComposition'
  | 'integrationRisk'
  | 'priorityExports'
  | 'sso'
  | 'rbac'
  | 'auditTrail'
  | 'complianceExports'
  | 'customRetention';

/** Configuration for a single plan tier. */
export interface PlanConfig {
  /** Maximum recordings allowed per calendar month. Number.MAX_SAFE_INTEGER = unlimited. */
  maxRecordingsPerMonth: number;
  /** Maximum team seats. Number.MAX_SAFE_INTEGER = unlimited (enterprise). */
  maxSeats: number;
  /** Maximum active recorders (members with extension). Number.MAX_SAFE_INTEGER = unlimited. */
  maxRecorders: number;
  /** Boolean map of feature access for this plan. */
  features: Record<FeatureKey, boolean>;
}

/** All feature flags set to false — base for building plan configs. */
const NO_FEATURES: Record<FeatureKey, boolean> = {
  cleanExports: false,
  healthScores: false,
  personalWorkspace: false,
  intelligenceLayer: false,
  bottleneckAnalysis: false,
  automationScoring: false,
  variantDetection: false,
  sharedLibrary: false,
  teamWorkspace: false,
  advancedAnalytics: false,
  crossWorkflowComparison: false,
  agentComposition: false,
  integrationRisk: false,
  priorityExports: false,
  sso: false,
  rbac: false,
  auditTrail: false,
  complianceExports: false,
  customRetention: false,
};

/**
 * Complete feature and limit configuration for every plan tier.
 * This is the single source of truth — all gating decisions derive from this constant.
 */
export const PLAN_FEATURES: Record<PlanType, PlanConfig> = {
  free: {
    maxRecordingsPerMonth: 5,
    maxSeats: 1,
    maxRecorders: 1,
    features: {
      ...NO_FEATURES,
    },
  },
  starter: {
    maxRecordingsPerMonth: 15,
    maxSeats: 1,
    maxRecorders: 1,
    features: {
      ...NO_FEATURES,
      cleanExports: true,
      healthScores: true,
      personalWorkspace: true,
    },
  },
  team: {
    maxRecordingsPerMonth: Number.MAX_SAFE_INTEGER,
    maxSeats: 5,
    maxRecorders: 3,
    features: {
      ...NO_FEATURES,
      cleanExports: true,
      healthScores: true,
      personalWorkspace: true,
      intelligenceLayer: true,
      bottleneckAnalysis: true,
      automationScoring: true,
      variantDetection: true,
      sharedLibrary: true,
      teamWorkspace: true,
    },
  },
  growth: {
    maxRecordingsPerMonth: Number.MAX_SAFE_INTEGER,
    maxSeats: 15,
    maxRecorders: 10,
    features: {
      ...NO_FEATURES,
      cleanExports: true,
      healthScores: true,
      personalWorkspace: true,
      intelligenceLayer: true,
      bottleneckAnalysis: true,
      automationScoring: true,
      variantDetection: true,
      sharedLibrary: true,
      teamWorkspace: true,
      advancedAnalytics: true,
      crossWorkflowComparison: true,
      agentComposition: true,
      integrationRisk: true,
      priorityExports: true,
    },
  },
  enterprise: {
    maxRecordingsPerMonth: Number.MAX_SAFE_INTEGER,
    maxSeats: Number.MAX_SAFE_INTEGER,
    maxRecorders: Number.MAX_SAFE_INTEGER,
    features: {
      ...NO_FEATURES,
      cleanExports: true,
      healthScores: true,
      personalWorkspace: true,
      intelligenceLayer: true,
      bottleneckAnalysis: true,
      automationScoring: true,
      variantDetection: true,
      sharedLibrary: true,
      teamWorkspace: true,
      advancedAnalytics: true,
      crossWorkflowComparison: true,
      agentComposition: true,
      integrationRisk: true,
      priorityExports: true,
      sso: true,
      rbac: true,
      auditTrail: true,
      complianceExports: true,
      customRetention: true,
    },
  },
};

/** Plan tiers ordered from lowest to highest for hierarchy comparisons. */
export const PLAN_HIERARCHY: PlanType[] = ['free', 'starter', 'team', 'growth', 'enterprise'];

/**
 * Safely coerce a raw database string to a PlanType.
 * Maps legacy "pro" to "starter". Unknown values default to "free".
 */
export function toPlanType(raw: string): PlanType {
  if (raw === 'pro') return 'starter';
  if ((PLAN_HIERARCHY as string[]).includes(raw)) return raw as PlanType;
  return 'free';
}

/** Return true if the given plan includes access to the specified feature. */
export function hasFeature(plan: PlanType, feature: FeatureKey): boolean {
  return PLAN_FEATURES[plan].features[feature];
}

/** Return the full PlanConfig for a plan tier. */
export function getPlanConfig(plan: PlanType): PlanConfig {
  return PLAN_FEATURES[plan];
}

/** Return true if `userPlan` is at or above `requiredPlan` in the hierarchy. */
export function isPlanAtLeast(userPlan: PlanType, requiredPlan: PlanType): boolean {
  return PLAN_HIERARCHY.indexOf(userPlan) >= PLAN_HIERARCHY.indexOf(requiredPlan);
}

/**
 * Find the lowest plan tier that grants access to a specific feature.
 * Returns undefined if no plan grants the feature (should not happen with valid FeatureKeys).
 */
export function minimumPlanForFeature(feature: FeatureKey): PlanType | undefined {
  return PLAN_HIERARCHY.find((p) => PLAN_FEATURES[p].features[feature]);
}
