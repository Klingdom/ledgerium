'use client';

import { useFeatureGate } from '@/hooks/useFeatureGate';
import { UpgradeCTA } from './UpgradeCTA';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface FeatureGateProps {
  /** Feature key to check (e.g. "intelligenceLayer"). */
  feature: string;
  /** Content to render when the feature is allowed. */
  children: React.ReactNode;
  /**
   * What to render when the feature is locked.
   * Defaults to <UpgradeCTA> for the relevant feature/plan.
   * Pass null to use hideWhenLocked behaviour without the prop.
   */
  fallback?: React.ReactNode;
  /**
   * When true, render nothing when the feature is locked (no fallback UI).
   * Takes precedence over `fallback` when both are provided.
   * Default: false.
   */
  hideWhenLocked?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * FeatureGate — conditionally renders children based on the user's plan.
 *
 * While account data is loading, nothing is rendered to avoid flash of
 * locked content. Once resolved:
 *   - allowed  → renders children
 *   - locked + hideWhenLocked  → renders null
 *   - locked + custom fallback → renders fallback
 *   - locked + no fallback     → renders default <UpgradeCTA>
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  hideWhenLocked = false,
}: FeatureGateProps): JSX.Element | null {
  const { allowed, loading, requiredPlan } = useFeatureGate(feature);

  // While loading, render nothing to avoid flash of locked/unlocked content.
  if (loading) return null;

  if (allowed) {
    return <>{children}</>;
  }

  // Feature is locked.
  if (hideWhenLocked) return null;

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return (
    <UpgradeCTA
      feature={feature}
      {...(requiredPlan !== undefined ? { requiredPlan } : {})}
    />
  );
}
