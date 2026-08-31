/**
 * Who the customer's card is actually charged by.
 *
 * WHY THIS EXISTS
 * ---------------
 * Ledgerium's Stripe account is owned by 6S Success, so Stripe receipts,
 * invoices and the card statement carry that business identity rather than
 * "Ledgerium AI". A customer who signed up for Ledgerium and then sees an
 * unfamiliar name on their statement is the single most common trigger for a
 * chargeback — not because anything is wrong, but because they no longer
 * recognise the charge.
 *
 * Saying so plainly, before payment and again afterwards, costs nothing and
 * removes the surprise. This is disclosure, not marketing.
 *
 * Env-driven rather than hardcoded because the merchant identity is a property
 * of whichever Stripe account is configured. If Ledgerium later moves to its
 * own account, this becomes a one-variable change and every surface updates
 * together — which is the reason the copy lives here rather than being written
 * out three times.
 */

/** Legal/business name shown by Stripe on receipts and card statements. */
export const BILLING_MERCHANT_NAME: string =
  process.env.NEXT_PUBLIC_BILLING_MERCHANT_NAME?.trim() || '6S Success';

/**
 * Shown before purchase, next to the plan buttons — sets the expectation
 * while the customer is still deciding.
 */
export function billingIdentityNotice(): string {
  return `Payments are processed by ${BILLING_MERCHANT_NAME}, which operates Ledgerium AI. Your receipt and card statement will show ${BILLING_MERCHANT_NAME}.`;
}

/**
 * Shown after purchase and on the account page — the moment a customer is
 * most likely to go looking for the charge.
 */
export function billingIdentityReminder(): string {
  return `Your card statement and receipts show ${BILLING_MERCHANT_NAME}, the business that operates Ledgerium AI.`;
}
