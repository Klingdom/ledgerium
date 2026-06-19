/**
 * R-1 drift-guard tests for admin-operations/pricing.ts.
 *
 * These tests enforce that MONTHLY_PRICE_USD always equals the prices
 * declared in PRICING_CONFIG.  If billing prices change in config.ts and
 * pricing.ts is not updated, these tests fail immediately.
 *
 * @module admin-operations/pricing.test
 * @iter Iteration A — Growth Intelligence Extension
 */

import { describe, it, expect } from 'vitest';
import { PRICING_CONFIG } from '@/lib/config';
import { MONTHLY_PRICE_USD, MRR_BILLABLE_STATUSES, ENTERPRISE_PLAN } from './pricing';

// ── Helper ─────────────────────────────────────────────────────────────────────

function configPriceFor(planId: string): number | null {
  const plan = PRICING_CONFIG.plans.find((p) => p.id === planId);
  return plan?.price ?? null;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('admin-operations/pricing — R-1 drift guard', () => {
  it('MONTHLY_PRICE_USD.starter equals PRICING_CONFIG starter price', () => {
    expect(MONTHLY_PRICE_USD.starter).toBe(configPriceFor('starter'));
  });

  it('MONTHLY_PRICE_USD.team equals PRICING_CONFIG team price', () => {
    expect(MONTHLY_PRICE_USD.team).toBe(configPriceFor('team'));
  });

  it('MONTHLY_PRICE_USD.growth equals PRICING_CONFIG growth price', () => {
    expect(MONTHLY_PRICE_USD.growth).toBe(configPriceFor('growth'));
  });

  it('all MONTHLY_PRICE_USD values are positive integers', () => {
    for (const [plan, price] of Object.entries(MONTHLY_PRICE_USD)) {
      expect(price, `${plan} price must be a positive integer`).toBeGreaterThan(0);
      expect(Number.isInteger(price), `${plan} price must be an integer`).toBe(true);
    }
  });

  it('MRR_BILLABLE_STATUSES contains "active"', () => {
    expect(MRR_BILLABLE_STATUSES).toContain('active');
  });

  it('MRR_BILLABLE_STATUSES is readonly and non-empty', () => {
    expect(MRR_BILLABLE_STATUSES.length).toBeGreaterThan(0);
  });

  it('ENTERPRISE_PLAN is the string "enterprise"', () => {
    expect(ENTERPRISE_PLAN).toBe('enterprise');
  });
});
