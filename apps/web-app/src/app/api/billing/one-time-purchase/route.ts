import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { SERVICE_SKUS, isServiceSkuKey } from '@/lib/service-skus';

/**
 * GET /api/billing/one-time-purchase?session_id=cs_...
 *
 * Authenticated. Looks up a single one-time purchase by its Stripe Checkout
 * Session id (the natural key on `OneTimePurchase` — see webhook/route.ts
 * `checkout.session.completed` mode:'payment' branch, which is the only
 * writer of this table). Used by the post-purchase confirmation page
 * (account/purchase-success) to show the customer what they bought and what
 * happens next.
 *
 * Ownership-scoped: a purchase row belonging to a different user returns 404
 * (not 403) — the same "don't confirm existence to a non-owner" posture used
 * elsewhere in this codebase for user-scoped resources.
 *
 * The webhook that writes this row runs asynchronously relative to the
 * Stripe Checkout redirect, so a request immediately after redirect MAY find
 * no row yet — that is a normal race, not an error. This endpoint returns a
 * distinct `pending: true` response (200, not 404) in that case so the
 * client can tell "not yet processed" apart from "wrong session / not
 * yours" and poll briefly rather than showing a false error.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing required query param: session_id' }, { status: 400 });
  }

  const purchase = await db.oneTimePurchase.findUnique({ where: { id: sessionId } });

  if (!purchase || purchase.userId !== session.user.id) {
    // Distinguishes "webhook hasn't landed yet" from "not found / not
    // yours" — see doc comment above. A brand-new Checkout Session id that
    // has never existed and one belonging to another user both return this
    // shape; only OWN sessions ever resolve to `pending: false` + data.
    return NextResponse.json({ data: { pending: true } });
  }

  const catalogEntry = isServiceSkuKey(purchase.sku) ? SERVICE_SKUS[purchase.sku] : null;

  return NextResponse.json({
    data: {
      pending: false,
      sku: purchase.sku,
      amountTotal: purchase.amountTotal,
      currency: purchase.currency,
      paymentStatus: purchase.paymentStatus,
      createdAt: purchase.createdAt,
      // Catalog display copy, resolved server-side so the client never has
      // to duplicate the SERVICE_SKUS lookup or guess at unknown SKU keys.
      // Null for a SKU key the client-side catalog doesn't recognize (should
      // not happen for a real purchase, but the page must not crash if it
      // does — see the success page's honest fallback state).
      catalog: catalogEntry,
    },
  });
}
