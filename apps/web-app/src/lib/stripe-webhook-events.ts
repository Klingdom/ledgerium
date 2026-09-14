/**
 * The Stripe events `api/billing/webhook/route.ts` implements a handler for.
 *
 * WHY THIS IS A SHARED CONSTANT
 * -----------------------------
 * An endpoint subscribed to FEWER events than the handler implements fails
 * completely silently. Stripe never delivers the unsubscribed event, so the
 * handler is dead code that looks alive: no error, no log, no failed delivery
 * in the Stripe dashboard. It is indistinguishable from "that event hasn't
 * happened yet".
 *
 * This is not hypothetical. Both `docs/runbooks/STRIPE_SETUP.md` and the
 * 6S Success setup prompt listed SIX events, written from memory rather than
 * from the handler. The three omissions were the expensive ones:
 *
 *   invoice.payment_action_required — SCA / 3-D Secure. A customer whose bank
 *     requires authentication completes payment and is never provisioned.
 *   charge.dispute.created / .closed — disputes arrive unrecorded.
 *
 * Anything that provisions or verifies a webhook endpoint must import this
 * list. `stripe-webhook-events.test.ts` scans the handler's source and fails
 * if the two drift apart, so adding a `case` without adding it here — or vice
 * versa — is a build failure rather than a silent gap in production.
 */

export const IMPLEMENTED_WEBHOOK_EVENTS = [
  'charge.dispute.closed',
  'charge.dispute.created',
  'checkout.session.completed',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'customer.subscription.updated',
  'invoice.payment_action_required',
  'invoice.payment_failed',
  'invoice.payment_succeeded',
] as const;

export type ImplementedWebhookEvent = (typeof IMPLEMENTED_WEBHOOK_EVENTS)[number];

/** Production endpoint Stripe should be delivering to. */
export const WEBHOOK_ENDPOINT_URL = 'https://ledgerium.ai/api/billing/webhook';

/**
 * Which implemented events an endpoint is NOT subscribed to.
 *
 * `enabled_events` may contain the wildcard `*`, which covers everything — a
 * wildcard endpoint has no gap even though it lists none of our events by
 * name. Returns names in the canonical order above so output is stable.
 */
export function missingWebhookEvents(enabledEvents: readonly string[]): ImplementedWebhookEvent[] {
  if (enabledEvents.includes('*')) return [];
  const have = new Set(enabledEvents);
  return IMPLEMENTED_WEBHOOK_EVENTS.filter((e) => !have.has(e));
}
