/**
 * The merchant shown to customers is 6S Success, not Ledgerium AI, because
 * 6S Success owns the Stripe account. These lock the disclosure so it cannot
 * quietly disappear or start naming the wrong business.
 *
 * An unrecognised name on a card statement is a leading cause of chargebacks.
 * The copy is a risk control, not decoration.
 */

import { describe, it, expect } from 'vitest';
import {
  BILLING_MERCHANT_NAME,
  billingIdentityNotice,
  billingIdentityReminder,
} from './billing-identity';

describe('billing identity disclosure', () => {
  it('names a non-empty merchant', () => {
    expect(BILLING_MERCHANT_NAME.trim().length).toBeGreaterThan(0);
  });

  it('defaults to the Stripe account owner, not the product name', () => {
    // Ledgerium does not own the Stripe account. Naming Ledgerium here would
    // be the exact misinformation this disclosure exists to prevent.
    expect(BILLING_MERCHANT_NAME).toBe(process.env.NEXT_PUBLIC_BILLING_MERCHANT_NAME?.trim() || '6S Success');
  });

  it('both surfaces name the merchant explicitly', () => {
    expect(billingIdentityNotice()).toContain(BILLING_MERCHANT_NAME);
    expect(billingIdentityReminder()).toContain(BILLING_MERCHANT_NAME);
  });

  it('both surfaces connect that merchant to Ledgerium, so the link is explainable', () => {
    // Naming 6S Success without saying why is worse than saying nothing —
    // it reads as an unrelated company appearing on the statement.
    expect(billingIdentityNotice()).toMatch(/Ledgerium/);
    expect(billingIdentityReminder()).toMatch(/Ledgerium/);
  });

  it('the pre-purchase notice mentions where the name will appear', () => {
    const notice = billingIdentityNotice();
    expect(notice).toMatch(/receipt/i);
    expect(notice).toMatch(/statement/i);
  });

  it('the post-purchase reminder mentions the statement', () => {
    expect(billingIdentityReminder()).toMatch(/statement/i);
  });

  it('neither string is empty or placeholder-ish', () => {
    for (const text of [billingIdentityNotice(), billingIdentityReminder()]) {
      expect(text.trim().length).toBeGreaterThan(20);
      expect(text).not.toMatch(/TODO|TBD|undefined|\[.*\]/);
    }
  });
});
