/**
 * Does the LIVE Stripe webhook endpoint actually subscribe to every event we
 * handle?
 *
 * WHY THIS IS NOT COVERED BY `billing-mode.ts`
 * -------------------------------------------
 * That module answers "is a webhook secret configured?" from env alone, which
 * is pure and cheap. It cannot answer "does the endpoint deliver the events we
 * implement?", because that fact lives in Stripe, not in our configuration.
 *
 * The gap matters because an under-subscribed endpoint is invisible. Stripe
 * simply never sends the missing event: no error, no failed delivery, nothing
 * in the dashboard. `invoice.payment_action_required` missing means SCA
 * customers pay and are never provisioned. The dispute events missing means
 * chargebacks arrive unrecorded. Both look exactly like "that hasn't happened
 * yet" — and both are already live if the endpoint was built from the runbook,
 * which listed six events instead of nine.
 *
 * Runs server-side in an admin-gated route using the key the container already
 * holds, so nobody has to paste a live secret into a shell to find out.
 */

import { getStripe } from '@/lib/stripe';
import {
  WEBHOOK_ENDPOINT_URL,
  missingWebhookEvents,
  type ImplementedWebhookEvent,
} from '@/lib/stripe-webhook-events';

export interface WebhookCoverageReport {
  /** `unknown` when Stripe could not be reached — never conflated with "fine". */
  status: 'covered' | 'gaps' | 'no-endpoint' | 'unknown';
  /** Implemented events the endpoint is not subscribed to. */
  missing: ImplementedWebhookEvent[];
  /** How many events the endpoint subscribes to in total. */
  subscribedCount: number;
  /** Operator-facing explanation. Empty when nothing is wrong. */
  warnings: string[];
}

/**
 * Inspect the configured endpoint.
 *
 * Never throws. A billing-status panel that 500s because Stripe was briefly
 * unreachable is worse than one reporting "could not check" — the dashboard
 * must still render its other sections. Failure is surfaced as `unknown`
 * rather than silently as `covered`, so an operator is never told coverage is
 * fine when it simply was not verified.
 */
export async function checkWebhookCoverage(): Promise<WebhookCoverageReport> {
  try {
    const stripe = getStripe();
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    const endpoint = endpoints.data.find((e) => e.url === WEBHOOK_ENDPOINT_URL);

    if (!endpoint) {
      return {
        status: 'no-endpoint',
        missing: [],
        subscribedCount: 0,
        warnings: [
          `No Stripe webhook endpoint points at ${WEBHOOK_ENDPOINT_URL}. Payments would succeed but nothing would ever be provisioned — customers would be charged and receive nothing.`,
        ],
      };
    }

    const missing = missingWebhookEvents(endpoint.enabled_events);
    if (missing.length === 0) {
      return {
        status: 'covered',
        missing: [],
        subscribedCount: endpoint.enabled_events.length,
        warnings: [],
      };
    }

    // Name the consequence, not just the event id — "payment_action_required
    // is missing" does not read as "European customers cannot subscribe".
    const consequences: Partial<Record<ImplementedWebhookEvent, string>> = {
      'invoice.payment_action_required':
        'card payments needing bank authentication (SCA/3-D Secure) complete but never provision the plan',
      'charge.dispute.created': 'chargebacks arrive unrecorded',
      'charge.dispute.closed': 'dispute outcomes are never recorded',
      'checkout.session.completed': 'completed checkouts never provision a plan',
      'customer.subscription.deleted': 'cancellations never revoke access',
      'customer.subscription.updated': 'plan changes and renewals are not reflected',
      'customer.subscription.trial_will_end': 'trial-ending notifications never fire',
      'invoice.payment_failed': 'failed payments never mark the account past due',
      'invoice.payment_succeeded': 'successful renewals are not recorded',
    };

    return {
      status: 'gaps',
      missing,
      subscribedCount: endpoint.enabled_events.length,
      warnings: [
        `The Stripe webhook endpoint is missing ${missing.length} event(s) this app handles. Stripe does not deliver unsubscribed events, so these fail silently: ${missing
          .map((e) => `${e} (${consequences[e] ?? 'handler never runs'})`)
          .join('; ')}.`,
      ],
    };
  } catch {
    // Deliberately swallows the error object: it can carry request details.
    return {
      status: 'unknown',
      missing: [],
      subscribedCount: 0,
      warnings: [
        'Could not reach Stripe to verify webhook event coverage. This is not a failure of the webhook itself — coverage is simply unverified.',
      ],
    };
  }
}
