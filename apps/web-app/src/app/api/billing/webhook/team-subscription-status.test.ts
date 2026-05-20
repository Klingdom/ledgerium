/**
 * Pure unit tests for normalizeStripeStatus (TEAM-P03.7 Sub-task 1).
 *
 * Validates that Stripe's 7-value subscription.status enum maps cleanly
 * onto our 5-value closed union. Pure deterministic function — zero DB
 * or HTTP dependencies.
 *
 * @iter 085 / TEAM-P03.7 Sub-task 1
 */

import { describe, it, expect } from 'vitest';
import { normalizeStripeStatus, type NormalizedSubscriptionStatus } from '@/lib/workspace/subscription-status';

describe('normalizeStripeStatus — Sub-task 1 (iter 085)', () => {
  it('active → active', () => {
    expect(normalizeStripeStatus('active')).toBe('active' as NormalizedSubscriptionStatus);
  });

  it('trialing → trialing', () => {
    expect(normalizeStripeStatus('trialing')).toBe('trialing' as NormalizedSubscriptionStatus);
  });

  it('past_due → past_due', () => {
    expect(normalizeStripeStatus('past_due')).toBe('past_due' as NormalizedSubscriptionStatus);
  });

  it('canceled → canceled', () => {
    expect(normalizeStripeStatus('canceled')).toBe('canceled' as NormalizedSubscriptionStatus);
  });

  it('unpaid → unpaid', () => {
    expect(normalizeStripeStatus('unpaid')).toBe('unpaid' as NormalizedSubscriptionStatus);
  });

  it('incomplete normalizes to unpaid', () => {
    expect(normalizeStripeStatus('incomplete')).toBe('unpaid' as NormalizedSubscriptionStatus);
  });

  it('incomplete_expired normalizes to unpaid', () => {
    expect(normalizeStripeStatus('incomplete_expired')).toBe('unpaid' as NormalizedSubscriptionStatus);
  });

  it('unknown Stripe status fails closed (returns unpaid)', () => {
    expect(normalizeStripeStatus('totally_made_up' as unknown as string)).toBe('unpaid');
  });

  it('empty string fails closed (returns unpaid)', () => {
    expect(normalizeStripeStatus('')).toBe('unpaid');
  });

  it('is pure and deterministic across repeat calls', () => {
    for (const status of ['active', 'trialing', 'past_due', 'canceled', 'unpaid']) {
      const first = normalizeStripeStatus(status);
      const second = normalizeStripeStatus(status);
      expect(first).toBe(second);
    }
  });

  it('5-value closed union is exhaustive — every member round-trips', () => {
    // Each member of the closed union must map back to itself.
    const closedUnion: NormalizedSubscriptionStatus[] = [
      'active',
      'trialing',
      'past_due',
      'canceled',
      'unpaid',
    ];
    for (const status of closedUnion) {
      expect(normalizeStripeStatus(status)).toBe(status);
    }
  });
});
