/**
 * The load-bearing test here is the drift scan: it reads the webhook handler's
 * actual source and asserts the constant matches its `case` statements.
 *
 * Without it this constant is just another list written from memory — which is
 * precisely how the runbook came to claim six events when the handler
 * implements nine. A list that can silently disagree with the code it
 * describes is worse than no list, because provisioning tools trust it.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  IMPLEMENTED_WEBHOOK_EVENTS,
  WEBHOOK_ENDPOINT_URL,
  missingWebhookEvents,
} from './stripe-webhook-events';

// Resolved from THIS FILE, not process.cwd(). The workspace runs vitest from
// the repo root while `pnpm --filter` runs it from the package, so a
// cwd-relative path resolves differently depending on which command you used —
// passing in one and throwing ENOENT in the other. The sanity test below
// caught exactly that.
const HANDLER = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../app/api/billing/webhook/route.ts',
);

/** Every `case 'some.event':` the handler switches on. */
function handlerCases(): string[] {
  const src = readFileSync(HANDLER, 'utf8');
  const matches = src.match(/case '[a-z_]+\.[a-z_.]+':/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(6, -2)))].sort();
}

describe('drift scan — constant vs the handler it describes', () => {
  it('sanity: the scan actually finds the handler and some cases', () => {
    // A scan that silently matches nothing would make every assertion below
    // vacuously pass — the same false-green this file exists to prevent.
    const cases = handlerCases();
    expect(cases.length).toBeGreaterThan(5);
  });

  it('lists exactly the events the handler implements — no more, no fewer', () => {
    expect(handlerCases()).toEqual([...IMPLEMENTED_WEBHOOK_EVENTS].sort());
  });

  it('includes the three the runbook originally omitted', () => {
    // Named explicitly: these are the ones whose absence costs real money —
    // SCA payments never provision, disputes arrive unrecorded.
    expect(IMPLEMENTED_WEBHOOK_EVENTS).toContain('invoice.payment_action_required');
    expect(IMPLEMENTED_WEBHOOK_EVENTS).toContain('charge.dispute.created');
    expect(IMPLEMENTED_WEBHOOK_EVENTS).toContain('charge.dispute.closed');
  });
});

describe('missingWebhookEvents', () => {
  it('reports nothing missing when every event is subscribed', () => {
    expect(missingWebhookEvents([...IMPLEMENTED_WEBHOOK_EVENTS])).toEqual([]);
  });

  it('treats the wildcard as full coverage', () => {
    // A `*` endpoint lists none of our events by name yet has no gap.
    expect(missingWebhookEvents(['*'])).toEqual([]);
  });

  it('names exactly the six-event gap the runbook would have produced', () => {
    const runbookSix = [
      'checkout.session.completed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_failed',
      'invoice.payment_succeeded',
      'customer.subscription.trial_will_end',
    ];
    expect(missingWebhookEvents(runbookSix)).toEqual([
      'charge.dispute.closed',
      'charge.dispute.created',
      'invoice.payment_action_required',
    ]);
  });

  it('reports everything missing for an endpoint with no events', () => {
    expect(missingWebhookEvents([])).toHaveLength(IMPLEMENTED_WEBHOOK_EVENTS.length);
  });

  it('ignores extra events we do not handle', () => {
    // Subscribing to more than we implement is harmless noise, not a gap.
    expect(missingWebhookEvents([...IMPLEMENTED_WEBHOOK_EVENTS, 'payout.paid'])).toEqual([]);
  });

  it('returns names in canonical order, so output is stable', () => {
    const a = missingWebhookEvents(['checkout.session.completed']);
    const b = missingWebhookEvents(['checkout.session.completed']);
    expect(a).toEqual(b);
  });
});

describe('endpoint URL', () => {
  it('points at the production handler over https', () => {
    expect(WEBHOOK_ENDPOINT_URL).toBe('https://ledgerium.ai/api/billing/webhook');
  });
});
