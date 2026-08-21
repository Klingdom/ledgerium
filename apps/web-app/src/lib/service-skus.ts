/**
 * Service SKU catalog — Guided Onboarding + Process Audit.
 *
 * These are one-time (`mode: 'payment'`) purchases, not subscriptions — see
 * `ONE_TIME_PRICES` in `./stripe.ts` and `docs/runbooks/STRIPE_SETUP.md`
 * § One-time payments for the checkout/webhook mechanics. This file is the
 * single source of truth for:
 *   1. The SKU keys themselves (imported by stripe.ts to build ONE_TIME_PRICES).
 *   2. Display copy — name, price, what the customer gets, what happens next.
 *   3. The Process Audit hard qualification gate (SKU_SPEC_001 §2).
 *
 * @see docs/features/service-skus/SKU_SPEC_001.md
 */

/** SKU keys — match the keys in `ONE_TIME_PRICES` (stripe.ts). */
export const GUIDED_ONBOARDING_SKU = 'guided_onboarding';
export const PROCESS_AUDIT_SKU = 'process_audit';

export type ServiceSkuKey = typeof GUIDED_ONBOARDING_SKU | typeof PROCESS_AUDIT_SKU;

/**
 * Hard qualification gate for the Process Audit SKU (SKU_SPEC_001 §2, "Scope
 * boundary — the thing that keeps this productized"): below this many
 * recorded runs of a given process, variance and variant figures are not
 * statistically meaningful. The spec is explicit that this is a hard gate,
 * not a guideline — a customer must not be able to buy an audit that cannot
 * be meaningfully produced.
 *
 * Enforced in TWO places that both read this same constant so they can never
 * disagree: `getAuditEligibility()` (audit-eligibility.ts, used for display)
 * and the checkout route's server-side purchase gate (checkout/route.ts).
 */
export const MIN_RECORDED_RUNS_FOR_AUDIT = 5;

/** Maximum number of processes a single Process Audit purchase covers (SKU_SPEC_001 §2). */
export const MAX_AUDITED_PROCESSES = 3;

export interface ServiceSkuDefinition {
  skuKey: ServiceSkuKey;
  name: string;
  /**
   * Display price in whole USD dollars. THIS IS THE COORDINATOR-PROPOSED
   * PRICE (SKU_SPEC_001 — "pricing is a coordinator proposal, not a CEO
   * decision") and is deliberately the easiest number in this file to change.
   *
   * It is display copy only — it is NOT what Stripe actually charges. The
   * real charge amount is whatever Stripe Price is configured against
   * `ONE_TIME_PRICES[skuKey]` in `./stripe.ts`. If you change this number,
   * update the Stripe Price to match (see docs/runbooks/STRIPE_SETUP.md
   * § Service SKUs) — otherwise the checkout page and the marketing copy on
   * `/pricing` / `/install` / `/account` will disagree.
   */
  price: number;
  tagline: string;
  /** What the customer receives — rendered as a bullet list. */
  whatYouGet: string[];
  /** Explicitly out of scope — rendered so customers self-select correctly before buying. */
  outOfScope: string[];
  /** Delivery mechanics — timing and who delivers it. Must stay truthful to SKU_SPEC_001; do not invent a tighter timeline than the spec commits to. */
  fulfilment: string;
  /** Short sentence describing when to expect the first concrete next step, shown on the post-purchase confirmation. */
  nextStep: string;
}

export const SERVICE_SKUS: Record<ServiceSkuKey, ServiceSkuDefinition> = {
  [GUIDED_ONBOARDING_SKU]: {
    skuKey: GUIDED_ONBOARDING_SKU,
    name: 'Guided Onboarding',
    price: 299,
    tagline: 'Paid activation — a human gets your first two workflows recorded right.',
    whatYouGet: [
      'A working install, verified live with you — not a link to instructions',
      'Two workflows recorded with you, on your real systems',
      'Your first generated SOP and process map, reviewed together',
      'A written recommendation of the next 3–5 workflows worth recording',
    ],
    outOfScope: [
      'Custom development, integrations, or API work',
      'Documenting workflows on your behalf beyond the two sessions',
      'Ongoing support beyond the engagement',
    ],
    fulfilment:
      'Two sessions, 60 minutes or less each, within 14 days of purchase. Delivered by a person, not an automated flow.',
    nextStep: "We'll reach out within 2 business days to schedule your first session.",
  },
  [PROCESS_AUDIT_SKU]: {
    skuKey: PROCESS_AUDIT_SKU,
    name: 'Process Audit',
    price: 1500,
    tagline: 'Deterministic analysis of your own recorded runs — computed, not estimated.',
    whatYouGet: [
      'Cycle-time distribution per step, with variance',
      'Ranked bottleneck identification',
      'Variant analysis — how many different ways the process is actually run',
      'Recommended canonical path',
      'Standardization score',
      'Documentation drift — where the written SOP diverges from observed reality',
      'Automation opportunity with ROI estimate',
      'A written report plus a walkthrough session — every finding traceable to the source events that produced it',
    ],
    outOfScope: [
      'Implementing the recommendations',
      'Change management, training delivery, or stakeholder facilitation',
      'Processes that cannot be browser-recorded (physical, phone-based, or offline work)',
    ],
    fulfilment: `Up to ${MAX_AUDITED_PROCESSES} processes, minimum ${MIN_RECORDED_RUNS_FOR_AUDIT} recorded runs each, one revision, fixed 10-business-day turnaround from the point your recordings are complete.`,
    nextStep:
      "We'll reach out within 2 business days to confirm which of your recorded processes to audit and start the clock on turnaround.",
  },
};

/** True if at least one of the given per-process run counts meets the audit's hard qualification gate. */
export function hasQualifyingProcessForAudit(runCounts: number[]): boolean {
  return runCounts.some((count) => count >= MIN_RECORDED_RUNS_FOR_AUDIT);
}

/** Count of processes meeting the audit's hard qualification gate — used for UI copy such as "2 of 5 processes qualify". */
export function countQualifyingProcesses(runCounts: number[]): number {
  return runCounts.filter((count) => count >= MIN_RECORDED_RUNS_FOR_AUDIT).length;
}

/** Type guard — narrows an arbitrary string to a known ServiceSkuKey. */
export function isServiceSkuKey(sku: string): sku is ServiceSkuKey {
  return sku === GUIDED_ONBOARDING_SKU || sku === PROCESS_AUDIT_SKU;
}
