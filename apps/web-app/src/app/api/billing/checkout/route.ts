import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { getStripe, PRO_PRICE_ID, APP_URL } from '@/lib/stripe';
import { trackServer } from '@/lib/analytics';

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout Session for Pro subscription.
 * Redirects the user to Stripe-hosted checkout.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!PRO_PRICE_ID) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // If user already has an active subscription, redirect to portal instead
  if (user.plan === 'pro' && user.subscriptionStatus === 'active') {
    return NextResponse.json({ error: 'Already subscribed to Pro', redirect: '/account' }, { status: 400 });
  }

  try {
    // Reuse existing Stripe customer or create a new one
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customerParams: Record<string, unknown> = {
        email: user.email,
        metadata: { userId: user.id },
      };
      if (user.name) customerParams.name = user.name;
      const customer = await getStripe().customers.create(customerParams as any);
      customerId = customer.id;

      await db.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create Checkout Session
    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/account?billing=success`,
      cancel_url: `${APP_URL}/pricing?billing=canceled`,
      metadata: { userId: user.id },
      subscription_data: {
        metadata: { userId: user.id },
      },
    });

    trackServer('checkout_started', { userId: user.id });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
