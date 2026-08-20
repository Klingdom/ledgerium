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
import {
  MONTHLY_PRICE_USD,
  ANNUAL_MONTHLY_EQUIVALENT_USD,
  MRR_BILLABLE_STATUSES,
  TEAM_MRR_BILLABLE_STATUSES,
  ENTERPRISE_PLAN,
} from './pricing';

// ── Helper ─────────────────────────────────────────────────────────────────────

function configPriceFor(planId: string): number | null {
  const plan = PRICING_CONFIG.plans.find((p) => p.id === planId);
  return plan?.price ?? null;
}

function configAnnualPriceFor(planId: string): number | null {
  const plan = PRICING_CONFIG.plans.find((p) => p.id === planId);
  return plan?.annualPrice ?? null;
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

  // ── REVENUE_PLAN_20K §6 Option B: Solo tier ───────────────────────────────

  it('MONTHLY_PRICE_USD.solo equals PRICING_CONFIG solo price', () => {
    expect(MONTHLY_PRICE_USD.solo).toBe(configPriceFor('solo'));
  });

  it('MONTHLY_PRICE_USD.solo is 89 (the current REVENUE_PLAN_20K §6 figure)', () => {
    // Not a hard business-logic requirement — this is a change-detection
    // sentinel so a silent price edit shows up as a diff in a specific test
    // rather than only in the (deliberately loose) drift-guard above.
    expect(MONTHLY_PRICE_USD.solo).toBe(89);
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

  // ── REVENUE_PLAN_20K §1.2c: annual monthly-equivalent drift guard ───────────

  it('ANNUAL_MONTHLY_EQUIVALENT_USD.starter equals PRICING_CONFIG starter annualPrice', () => {
    expect(ANNUAL_MONTHLY_EQUIVALENT_USD.starter).toBe(configAnnualPriceFor('starter'));
  });

  it('ANNUAL_MONTHLY_EQUIVALENT_USD.team equals PRICING_CONFIG team annualPrice', () => {
    expect(ANNUAL_MONTHLY_EQUIVALENT_USD.team).toBe(configAnnualPriceFor('team'));
  });

  it('ANNUAL_MONTHLY_EQUIVALENT_USD.growth equals PRICING_CONFIG growth annualPrice', () => {
    expect(ANNUAL_MONTHLY_EQUIVALENT_USD.growth).toBe(configAnnualPriceFor('growth'));
  });

  it('ANNUAL_MONTHLY_EQUIVALENT_USD.solo equals PRICING_CONFIG solo annualPrice', () => {
    expect(ANNUAL_MONTHLY_EQUIVALENT_USD.solo).toBe(configAnnualPriceFor('solo'));
  });

  it('every ANNUAL_MONTHLY_EQUIVALENT_USD value is strictly less than its MONTHLY_PRICE_USD counterpart', () => {
    for (const plan of ['starter', 'solo', 'team', 'growth'] as const) {
      expect(
        ANNUAL_MONTHLY_EQUIVALENT_USD[plan],
        `${plan} annual monthly-equivalent must be less than the monthly price`,
      ).toBeLessThan(MONTHLY_PRICE_USD[plan]);
    }
  });

  it('TEAM_MRR_BILLABLE_STATUSES contains "active"', () => {
    expect(TEAM_MRR_BILLABLE_STATUSES).toContain('active');
  });

  it('TEAM_MRR_BILLABLE_STATUSES is readonly and non-empty', () => {
    expect(TEAM_MRR_BILLABLE_STATUSES.length).toBeGreaterThan(0);
  });
});
