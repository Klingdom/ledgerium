/**
 * Admin-operations pricing module.
 *
 * Derives the price map from the billing source of truth (`PRICING_CONFIG`).
 * NO price literals are hardcoded here — this module imports and maps.
 *
 * R-1 drift guard: the co-located `pricing.test.ts` asserts that every entry
 * in MONTHLY_PRICE_USD equals its corresponding plan price in PRICING_CONFIG.
 * If billing prices change, the test will fail immediately.
 *
 * @module admin-operations/pricing
 * @iter Iteration A — Growth Intelligence Extension
 */

import { PRICING_CONFIG } from '@/lib/config';

// ── Internal helper ────────────────────────────────────────────────────────────

/**
 * Look up a plan's price from PRICING_CONFIG by plan id.
 * Throws at module-load time if the plan id is not found (misconfiguration).
 */
function priceFor(planId: string): number {
  const plan = PRICING_CONFIG.plans.find((p) => p.id === planId);
  if (!plan) {
    throw new Error(
      `[admin-operations/pricing] PRICING_CONFIG has no plan with id "${planId}". ` +
        `This is a misconfiguration — update pricing.ts if the plan id has changed.`,
    );
  }
  if (plan.price === null || plan.price === undefined) {
    throw new Error(
      `[admin-operations/pricing] Plan "${planId}" has a null/undefined price in PRICING_CONFIG. ` +
        `Only plans with a numeric monthly price should appear in MONTHLY_PRICE_USD.`,
    );
  }
  return plan.price as number;
}

// ── Exports ────────────────────────────────────────────────────────────────────

/**
 * Monthly USD prices for billable plans.
 *
 * Derived from PRICING_CONFIG — never hardcoded.
 * Used exclusively for MRR estimation in getSubscriptionBreakdown().
 */
export const MONTHLY_PRICE_USD: Readonly<Record<'starter' | 'team' | 'growth', number>> = {
  starter: priceFor('starter'),
  team: priceFor('team'),
  growth: priceFor('growth'),
} as const;

/**
 * Subscription statuses that count toward estimated MRR.
 *
 * Only 'active' subscriptions are billable in Phase 1.
 * If trialing should be included, change this list — the fold logic in
 * getSubscriptionBreakdown() reads from this constant.
 */
export const MRR_BILLABLE_STATUSES = ['active'] as const;

/** The enterprise plan id — enterprise users are counted separately, not in MRR. */
export const ENTERPRISE_PLAN = 'enterprise' as const;
