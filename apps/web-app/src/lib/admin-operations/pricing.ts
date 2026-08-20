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

/**
 * Look up a plan's ANNUAL-billing monthly-equivalent price from PRICING_CONFIG.
 *
 * `PRICING_CONFIG.plans[i].annualPrice` is already expressed as a monthly-
 * equivalent (e.g. starter: annualPrice 41 ≈ $492/yr ÷ 12, NOT the full $492
 * annual sticker price) — see `apps/web-app/src/lib/config.ts`, where the
 * field is used identically by the pricing-page UI to render "$41/mo billed
 * annually". No `/ 12` division happens here; this function only performs
 * the same PRICING_CONFIG lookup + misconfiguration guard as `priceFor()`.
 *
 * Throws at module-load time if the plan id is not found or has no annual
 * price configured (misconfiguration).
 */
function annualEquivalentFor(planId: string): number {
  const plan = PRICING_CONFIG.plans.find((p) => p.id === planId);
  if (!plan) {
    throw new Error(
      `[admin-operations/pricing] PRICING_CONFIG has no plan with id "${planId}". ` +
        `This is a misconfiguration — update pricing.ts if the plan id has changed.`,
    );
  }
  if (plan.annualPrice === null || plan.annualPrice === undefined) {
    throw new Error(
      `[admin-operations/pricing] Plan "${planId}" has a null/undefined annualPrice in PRICING_CONFIG. ` +
        `Only plans with a numeric annual monthly-equivalent price should appear in ANNUAL_MONTHLY_EQUIVALENT_USD.`,
    );
  }
  return plan.annualPrice as number;
}

// ── Exports ────────────────────────────────────────────────────────────────────

/**
 * Monthly USD prices for billable plans.
 *
 * Derived from PRICING_CONFIG — never hardcoded.
 * Used exclusively for MRR estimation in getSubscriptionBreakdown().
 */
export const MONTHLY_PRICE_USD: Readonly<Record<'starter' | 'solo' | 'team' | 'growth', number>> = {
  starter: priceFor('starter'),
  solo: priceFor('solo'),
  team: priceFor('team'),
  growth: priceFor('growth'),
} as const;

/**
 * Monthly-equivalent USD prices for billable plans, ANNUAL billing.
 *
 * Used exclusively for MRR estimation in getSubscriptionBreakdown() when a
 * subscription's persisted `billingInterval === 'annual'`. Applying
 * MONTHLY_PRICE_USD to an annual subscriber overstates their MRR
 * contribution by the annual-discount percentage (~20% at current pricing) —
 * see docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §1.2c.
 */
export const ANNUAL_MONTHLY_EQUIVALENT_USD: Readonly<Record<'starter' | 'solo' | 'team' | 'growth', number>> = {
  starter: annualEquivalentFor('starter'),
  solo: annualEquivalentFor('solo'),
  team: annualEquivalentFor('team'),
  growth: annualEquivalentFor('growth'),
} as const;

/**
 * Subscription statuses that count toward estimated MRR.
 *
 * Only 'active' subscriptions are billable in Phase 1.
 * If trialing should be included, change this list — the fold logic in
 * getSubscriptionBreakdown() reads from this constant.
 */
export const MRR_BILLABLE_STATUSES = ['active'] as const;

/**
 * Team.subscriptionStatus values that count toward estimated MRR.
 *
 * Team uses a distinct 5-value vocabulary from User (see
 * apps/web-app/src/lib/workspace/subscription-status.ts:
 * 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'). Only 'active'
 * is billable — mirrors MRR_BILLABLE_STATUSES' policy for the User model.
 */
export const TEAM_MRR_BILLABLE_STATUSES = ['active'] as const;

/** The enterprise plan id — enterprise users are counted separately, not in MRR. */
export const ENTERPRISE_PLAN = 'enterprise' as const;
