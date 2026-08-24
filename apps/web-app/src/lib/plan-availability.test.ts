/**
 * SUBSCRIPTION_READINESS_001 §G1 regression: a plan must never resolve to
 * 'available' unless the server explicitly confirmed a Stripe price ID is
 * configured for that exact plan + interval. This is the fail-closed
 * contract that makes the Solo-bug class of defect (live button, no backing
 * price) structurally impossible to reintroduce.
 */

import { describe, it, expect } from 'vitest';
import { derivePlanAvailability } from './plan-availability';

describe('derivePlanAvailability — G1 fail-closed contract', () => {
  it('is "loading" when the response has not resolved yet — never "available" before confirmation', () => {
    expect(derivePlanAvailability(null, 'starter', 'monthly')).toBe('loading');
    expect(derivePlanAvailability(null, 'solo', 'annual')).toBe('loading');
  });

  it('is "available" only when the server explicitly reports true for that exact plan + interval', () => {
    const response = { plans: { starter: { monthly: true, annual: false }, solo: { monthly: false, annual: false } } };
    expect(derivePlanAvailability(response, 'starter', 'monthly')).toBe('available');
  });

  it('is "unavailable" for the same plan on the OTHER interval — monthly and annual are independent, not collapsed', () => {
    const response = { plans: { starter: { monthly: true, annual: false } } };
    expect(derivePlanAvailability(response, 'starter', 'annual')).toBe('unavailable');
  });

  it('is "unavailable" when the plan is entirely absent from the response (this is the Solo-shipped-with-no-price-ID shape)', () => {
    const response = { plans: { starter: { monthly: true, annual: true } } };
    expect(derivePlanAvailability(response, 'solo', 'monthly')).toBe('unavailable');
  });

  it('is "unavailable" when `plans` itself is missing from the response — never throws, never defaults open', () => {
    expect(derivePlanAvailability({}, 'starter', 'monthly')).toBe('unavailable');
  });

  it('is "unavailable" for a malformed/falsy interval value, not just an explicit false', () => {
    const response = { plans: { starter: { monthly: undefined as unknown as boolean, annual: false } } };
    expect(derivePlanAvailability(response, 'starter', 'monthly')).toBe('unavailable');
  });

  it('never returns "available" for a truthy-but-not-strictly-true value — guards against `1` or a stray price-id string leaking through', () => {
    const response = { plans: { starter: { monthly: 'price_123' as unknown as boolean, annual: false } } };
    expect(derivePlanAvailability(response, 'starter', 'monthly')).toBe('unavailable');
  });
});
