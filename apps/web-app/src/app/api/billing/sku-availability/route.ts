import { NextResponse } from 'next/server';
import { getOneTimePriceId } from '@/lib/stripe';
import { GUIDED_ONBOARDING_SKU, PROCESS_AUDIT_SKU } from '@/lib/service-skus';

/**
 * GET /api/billing/sku-availability
 *
 * Public, unauthenticated — returns whether each real service SKU is
 * currently configured for purchase (i.e. has a Stripe Price ID set in
 * production). Exposes no secrets: only booleans keyed by a fixed, known
 * list of SKU catalog keys (never an arbitrary caller-supplied key).
 *
 * Exists so purchase surfaces (`/pricing`, `/install`, the account page's
 * Services card) can show an honest "not yet available" state — or hide the
 * offer — BEFORE the customer clicks, rather than letting them click into a
 * dead-end 503 from /api/billing/checkout. See docs/runbooks/
 * STRIPE_SETUP.md § Service SKUs.
 */
export async function GET() {
  return NextResponse.json({
    data: {
      [GUIDED_ONBOARDING_SKU]: getOneTimePriceId(GUIDED_ONBOARDING_SKU) !== null,
      [PROCESS_AUDIT_SKU]: getOneTimePriceId(PROCESS_AUDIT_SKU) !== null,
    },
  });
}
