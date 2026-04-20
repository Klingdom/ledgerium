import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { getStripe, getPriceId, PRO_PRICE_ID, APP_URL } from '@/lib/stripe';
import { toPlanType } from '@/lib/plans';
import { isAdminUnlimited } from '@/lib/admin-allowlist';
import { trackServer } from '@/lib/analytics-server';
import type { PaidPlanType, BillingInterval } from '@/lib/stripe';
import type Stripe from 'stripe';

/** Valid plan values for checkout. */
const VALID_PLANS: PaidPlanType[] = ['starter', 'team', 'growth'];
const VALID_INTERVALS: BillingInterval[] = ['monthly', 'annual'];

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout Session for a paid subscription.
 * Accepts optional `plan` and `interval` in the request body.
 * Defaults to starter/monthly for backward compatibility.
 *
 * Body: { plan?: "starter" | "team" | "growth", interval?: "monthly" | "annual" }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Block allowlisted accounts — they have admin-granted unlimited access and
  // do not need (or benefit from) a Stripe subscription.
  if (isAdminUnlimited(user.email)) {
    return NextResponse.json(
      { error: 'This account has admin-granted unlimited access and does not require a Stripe subscription.' },
      { status: 400 },
    );
  }

  // Parse plan and interval from request body (with backward-compatible defaults).
  let requestedPlan: PaidPlanType = 'starter';
  let requestedInterval: BillingInterval = 'monthly';

  try {
    const body = await req.json().catch(() => ({}));
    if (body.plan && VALID_PLANS.includes(body.plan)) {
      requestedPlan = body.plan;
    }
    if (body.interval && VALID_INTERVALS.includes(body.interval)) {
      requestedInterval = body.interval;
    }
  } catch {
    // No body or invalid JSON — use defaults.
  }

  // Resolve the Stripe price ID for the requested plan + interval.
  let priceId = getPriceId(requestedPlan, requestedInterval);

  // Fallback: if the specific price isn't configured, try legacy PRO_PRICE_ID.
  if (!priceId && PRO_PRICE_ID) {
    priceId = PRO_PRICE_ID;
  }

  if (!priceId) {
    return NextResponse.json(
      { error: 'Billing not configured for this plan', plan: requestedPlan, interval: requestedInterval },
      { status: 503 },
    );
  }

  // If user already has an active subscription at or above the requested plan,
  // redirect to portal for plan management instead.
  const currentPlan = toPlanType(user.plan);
  if (currentPlan !== 'free' && user.subscriptionStatus === 'active') {
    return NextResponse.json(
      { error: 'You already have an active subscription. Manage it from your account.', redirect: '/account' },
      { status: 400 },
    );
  }

  try {
    // Reuse existing Stripe customer or create a new one.
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customerParams: Record<string, unknown> = {
        email: user.email,
        metadata: { userId: user.id },
      };
      if (user.name) customerParams.name = user.name;
      const customer = await getStripe().customers.create(customerParams as Stripe.CustomerCreateParams);
      customerId = customer.id;

      await db.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create Checkout Session with the resolved price ID.
    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/account?billing=success`,
      cancel_url: `${APP_URL}/pricing?billing=canceled`,
      metadata: {
        userId: user.id,
        plan: requestedPlan,
        interval: requestedInterval,
      },
      subscription_data: {
        metadata: { userId: user.id },
      },
    });

    trackServer('checkout_started', {
      userId: user.id,
      plan: requestedPlan,
      interval: requestedInterval,
    });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
