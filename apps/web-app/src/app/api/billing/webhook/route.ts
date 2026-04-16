import { NextRequest, NextResponse } from 'next/server';
import { getStripe, WEBHOOK_SECRET, planFromPriceId } from '@/lib/stripe';
import type { PlanType } from '@/lib/plans';
import { db } from '@/db';
import { trackServer } from '@/lib/analytics-server';
import type Stripe from 'stripe';

/**
 * POST /api/billing/webhook
 * Handles Stripe webhook events to sync subscription state.
 *
 * Key events handled:
 * - checkout.session.completed → activate paid plan (resolved from price ID)
 * - customer.subscription.updated → sync status changes and plan tier
 * - customer.subscription.deleted → revoke paid plan → free
 * - invoice.payment_failed → mark past_due
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId) break;

        // Resolve plan from the subscription's price ID instead of hardcoding "pro".
        let plan: PlanType = 'starter';
        if (session.subscription) {
          try {
            const subscription = await getStripe().subscriptions.retrieve(
              session.subscription as string,
            );
            const priceId = subscription.items.data[0]?.price.id;
            if (priceId) {
              plan = planFromPriceId(priceId);
            }
          } catch (err) {
            console.error(`[stripe] Failed to retrieve subscription for plan resolution:`, err);
            // Fallback to 'starter' — better than failing the webhook entirely.
          }
        }

        await db.user.update({
          where: { id: userId },
          data: {
            plan,
            subscriptionStatus: 'active',
            stripeSubscriptionId: session.subscription as string,
            stripeCustomerId: session.customer as string,
          },
        });
        console.log(`[stripe] User ${userId} upgraded to ${plan}`);
        trackServer('subscription_created', { userId, plan });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        const status = subscription.status;
        const planStatus =
          status === 'active' ? 'active' :
          status === 'past_due' ? 'past_due' :
          status === 'canceled' ? 'canceled' :
          status === 'trialing' ? 'trialing' :
          'none';

        // Resolve plan from the current price ID.
        const isActive = status === 'active' || status === 'past_due' || status === 'trialing';
        const priceId = subscription.items.data[0]?.price.id;
        const plan: PlanType = isActive && priceId
          ? planFromPriceId(priceId)
          : 'free';

        await db.user.update({
          where: { id: userId },
          data: {
            plan,
            subscriptionStatus: planStatus,
          },
        });
        console.log(`[stripe] User ${userId} subscription updated: ${status} → plan ${plan}`);
        trackServer('subscription_updated', { userId, plan, status });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        await db.user.update({
          where: { id: userId },
          data: {
            plan: 'free',
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null,
          },
        });
        console.log(`[stripe] User ${userId} subscription canceled — reverted to free`);
        trackServer('subscription_canceled', { userId });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        // Find user by subscription ID
        const user = await db.user.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });
        if (!user) break;

        await db.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: 'past_due' },
        });
        console.log(`[stripe] User ${user.id} payment failed — marked past_due`);
        trackServer('payment_failed', { userId: user.id });
        break;
      }

      default:
        // Unhandled event type — log and ignore
        break;
    }
  } catch (err) {
    console.error(`[stripe] Webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
