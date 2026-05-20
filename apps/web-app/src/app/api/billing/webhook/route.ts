import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getWebhookSecret, planFromPriceId } from '@/lib/stripe';
import type { PlanType } from '@/lib/plans';
import { PLAN_FEATURES } from '@/lib/plans';
import { db } from '@/db';
import { trackServer } from '@/lib/analytics-server';
import type Stripe from 'stripe';
import {
  resolveTeamFromCustomer,
  notifyOwnerOfDowngrade,
} from '@/lib/workspace/team-billing';
import { softDeactivateExcessMembers } from '@/lib/workspace/seat-management';
import { normalizeStripeStatus } from '@/lib/workspace/subscription-status';
import type { NormalizedSubscriptionStatus } from '@/lib/workspace/subscription-status';

/**
 * POST /api/billing/webhook
 * Handles Stripe webhook events to sync subscription state.
 *
 * Key events handled:
 * - checkout.session.completed → activate paid plan (resolved from price ID)
 * - customer.subscription.updated → sync status changes and plan tier
 * - customer.subscription.deleted → revoke paid plan → free
 * - invoice.payment_failed → mark past_due
 * - invoice.payment_succeeded → confirm active status on every successful charge
 * - customer.subscription.trial_will_end → emit analytics notification (no DB write)
 *
 * Provisioning vs notification semantics:
 *   PROVISIONING events (checkout.session.completed, customer.subscription.updated,
 *   customer.subscription.deleted, invoice.payment_failed, invoice.payment_succeeded)
 *   write to the DB. Unmapped price IDs on these events are hard errors — re-throw
 *   so Stripe retries rather than silently under-provisioning.
 *
 *   NOTIFICATION events (customer.subscription.trial_will_end) are informational only.
 *   They emit analytics but do NOT write to the DB. Unmapped price IDs on notification
 *   events are soft warnings — emit analytics with plan: null and return 200.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // getWebhookSecret() throws if STRIPE_WEBHOOK_SECRET is unset — this
    // surfaces as HTTP 500 so Stripe retries rather than accepting the request
    // with an empty-string secret (BUG-04 fix).
    let webhookSecret: string;
    try {
      webhookSecret = getWebhookSecret();
    } catch (err) {
      console.error('[billing] WEBHOOK_SECRET not configured — webhook rejected', err);
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
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

        // Resolve plan from the subscription's price ID.
        // If resolution fails (Stripe API error or unmapped price ID) we re-throw
        // so the outer catch returns HTTP 500 and Stripe retries — silent under-
        // provisioning is worse than a retry (BUG-01 fix).
        let plan: PlanType;
        if (session.subscription) {
          const subscription = await getStripe().subscriptions.retrieve(
            session.subscription as string,
          );
          const priceId = subscription.items.data[0]?.price.id;
          if (!priceId) {
            throw new Error(
              `[billing] checkout.session.completed: no price ID on subscription ${session.subscription}`,
            );
          }
          const resolved = planFromPriceId(priceId);
          if (resolved === null) {
            throw new Error(
              `[billing] checkout.session.completed: unmapped price ID ${priceId} — cannot provision plan`,
            );
          }
          plan = resolved;
        } else {
          // No subscription object on the session — cannot resolve a paid plan.
          throw new Error(
            `[billing] checkout.session.completed: session ${session.id} has no subscription`,
          );
        }

        // ── Team-first resolution (TEAM-P03.6 Sub-task 1) ───────────────────
        // When a team/growth/enterprise plan is purchased, create or link the
        // Team row so downstream subscription.updated/deleted handlers can
        // resolve it via resolveTeamFromCustomer().
        // The solo-subscriber User.plan update below runs unconditionally —
        // both paths execute so the User record stays in sync.
        const customerId = session.customer as string;
        if (customerId && plan !== 'free' && plan !== 'starter') {
          const existingTeam = await resolveTeamFromCustomer(customerId);
          if (!existingTeam) {
            // Look for a workspace owned by this user that has no Stripe link yet.
            const unlinkedTeam = await (db as any).team.findFirst({
              where: { createdBy: userId, stripeCustomerId: null },
            });
            if (unlinkedTeam) {
              // Link the existing workspace to Stripe IDs and stamp the plan.
              await (db as any).team.update({
                where: { id: unlinkedTeam.id },
                data: {
                  plan,
                  stripeCustomerId: customerId,
                  stripeSubscriptionId: session.subscription as string,
                },
              });
              console.log(
                `[stripe] Team ${unlinkedTeam.id} linked to Stripe customer ${customerId} — plan ${plan}`,
              );
            } else {
              // No workspace exists yet — provision one now and create the
              // owner membership in a single atomic operation.
              const userRecord = await db.user.findUnique({
                where: { id: userId },
                select: { name: true, email: true },
              });
              const baseName = userRecord?.name ?? userRecord?.email ?? userId;
              const newTeam = await (db as any).team.create({
                data: {
                  name: `${baseName}'s Workspace`,
                  slug: `ws-${userId.slice(0, 8)}-${customerId.slice(-6)}`,
                  plan,
                  stripeCustomerId: customerId,
                  stripeSubscriptionId: session.subscription as string,
                  createdBy: userId,
                },
              });
              await (db as any).teamMember.create({
                data: {
                  teamId: newTeam.id,
                  userId,
                  role: 'owner',
                  status: 'active',
                  joinedAt: new Date(),
                },
              });
              console.log(
                `[stripe] Team ${newTeam.id} provisioned for user ${userId} — plan ${plan}`,
              );
            }
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

        const status = subscription.status;
        const planStatus =
          status === 'active' ? 'active' :
          status === 'past_due' ? 'past_due' :
          status === 'canceled' ? 'canceled' :
          status === 'trialing' ? 'trialing' :
          'none';

        // Resolve plan from the current price ID.
        // For active/past_due/trialing subscriptions, an unmapped price ID is a
        // hard error — re-throw so Stripe retries rather than silently reverting
        // the subscriber to free (BUG-01 fix).
        const isActive = status === 'active' || status === 'past_due' || status === 'trialing';
        const priceId = subscription.items.data[0]?.price.id;
        let plan: PlanType;
        if (isActive && priceId) {
          const resolved = planFromPriceId(priceId);
          if (resolved === null) {
            throw new Error(
              `[billing] customer.subscription.updated: unmapped price ID ${priceId} for active subscription ${subscription.id}`,
            );
          }
          plan = resolved;
        } else {
          plan = 'free';
        }

        // Sub-task 1 (iter 085 / TEAM-P03.7): normalize Stripe status to our
        // 5-value closed union before writing to Team.subscriptionStatus.
        const normalizedStatus = normalizeStripeStatus(status);

        // ── Team-first resolution (TEAM-P03 Part B) ──────────────────────────
        // If a workspace is linked to this Stripe customer, sync Team.plan and
        // cascade a soft-deactivate if the new plan's maxSeats is lower than the
        // current active-member count. The solo-subscriber User.plan path is
        // preserved byte-identical below if no team is found.
        const customerId = subscription.customer as string;
        if (customerId) {
          const team = await resolveTeamFromCustomer(customerId);
          if (team) {
            const previousPlan = team.plan as PlanType;
            const nowMs = Date.now();

            await (db as any).team.update({
              where: { id: team.id },
              data: {
                plan,
                stripeSubscriptionId: subscription.id,
                // Sub-task 1 (iter 085): write normalized status alongside plan.
                subscriptionStatus: normalizedStatus,
              },
            });

            // Cascade soft-deactivate when the new plan seats < current active
            // member count (downgrade scenario).
            const newMaxSeats = PLAN_FEATURES[plan].maxSeats;
            const { deactivatedIds } = await softDeactivateExcessMembers(
              team.id,
              newMaxSeats,
              nowMs,
            );

            if (deactivatedIds.length > 0) {
              await notifyOwnerOfDowngrade({
                teamId: team.id,
                teamName: team.name,
                fromPlan: previousPlan,
                toPlan: plan,
                deactivatedMemberIds: deactivatedIds,
                nowMs,
              });
            }

            console.log(
              `[stripe] Team ${team.id} subscription updated: ${status} → plan ${plan}` +
                (deactivatedIds.length > 0
                  ? `; ${deactivatedIds.length} member(s) deactivated`
                  : ''),
            );
            trackServer('subscription_updated', {
              teamId: team.id,
              plan,
              status,
              deactivatedCount: deactivatedIds.length,
            });
            break;
          }
        }

        // ── Solo-subscriber path ─────────────────────────────────────────────
        // Sub-task 7 (iter 085 / TEAM-P03.7): replace mutable metadata.userId
        // lookup with cryptographically-grounded stripeSubscriptionId lookup.
        // Stripe metadata is mutable; a Stripe dashboard compromise must NOT
        // pivot to user-account-plan compromise. User.stripeSubscriptionId is
        // set at checkout.session.completed (line 164) so this lookup succeeds
        // for legitimate users.
        const soloUser = await db.user.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (!soloUser) {
          console.warn(
            `[stripe] customer.subscription.updated: no user found for subscription ${subscription.id} — skipping DB update`,
          );
          break;
        }

        await db.user.update({
          where: { id: soloUser.id },
          data: {
            plan,
            subscriptionStatus: planStatus,
          },
        });
        console.log(`[stripe] User ${soloUser.id} subscription updated: ${status} → plan ${plan}`);
        trackServer('subscription_updated', { userId: soloUser.id, plan, status });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // ── Team-first resolution (TEAM-P03 Part C) ──────────────────────────
        // If a workspace is linked to this Stripe customer, revert Team.plan to
        // 'free', clear the subscription ID, and cascade soft-deactivate down to
        // maxSeats = 1 (free-plan limit). The solo-subscriber User.plan path is
        // preserved byte-identical below if no team is found.
        const deletedCustomerId = subscription.customer as string;
        if (deletedCustomerId) {
          const deletedTeam = await resolveTeamFromCustomer(deletedCustomerId);
          if (deletedTeam) {
            const previousPlanDeleted = deletedTeam.plan as PlanType;
            const nowMsDeleted = Date.now();

            await (db as any).team.update({
              where: { id: deletedTeam.id },
              data: {
                plan: 'free',
                stripeSubscriptionId: null,
              },
            });

            // Free plan allows exactly 1 seat — cascade deactivate excess members.
            const { deactivatedIds: deletedDeactivatedIds } = await softDeactivateExcessMembers(
              deletedTeam.id,
              PLAN_FEATURES['free'].maxSeats,
              nowMsDeleted,
            );

            if (deletedDeactivatedIds.length > 0) {
              await notifyOwnerOfDowngrade({
                teamId: deletedTeam.id,
                teamName: deletedTeam.name,
                fromPlan: previousPlanDeleted,
                toPlan: 'free',
                deactivatedMemberIds: deletedDeactivatedIds,
                nowMs: nowMsDeleted,
              });
            }

            console.log(
              `[stripe] Team ${deletedTeam.id} subscription canceled — reverted to free` +
                (deletedDeactivatedIds.length > 0
                  ? `; ${deletedDeactivatedIds.length} member(s) deactivated`
                  : ''),
            );
            trackServer('subscription_canceled', {
              teamId: deletedTeam.id,
              deactivatedCount: deletedDeactivatedIds.length,
            });
            break;
          }
        }

        // ── Solo-subscriber path ─────────────────────────────────────────────
        // Sub-task 7 (iter 085 / TEAM-P03.7): replace mutable metadata.userId
        // lookup with cryptographically-grounded stripeSubscriptionId lookup.
        const deletedSoloUser = await db.user.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (!deletedSoloUser) {
          console.warn(
            `[stripe] customer.subscription.deleted: no user found for subscription ${subscription.id} — skipping DB update`,
          );
          break;
        }

        await db.user.update({
          where: { id: deletedSoloUser.id },
          data: {
            plan: 'free',
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null,
          },
        });
        console.log(`[stripe] User ${deletedSoloUser.id} subscription canceled — reverted to free`);
        trackServer('subscription_canceled', { userId: deletedSoloUser.id });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        // ── Sub-task 2 (iter 085 / TEAM-P03.7): team-first resolution ────────
        // Workspace subscribers must have their Team.subscriptionStatus marked
        // past_due so the workspace UI can show a billing-attention banner.
        // The solo-subscriber User.update path below is preserved byte-identical
        // for non-team customers.
        const failedTeam = await (db as any).team.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (failedTeam) {
          await (db as any).team.update({
            where: { id: failedTeam.id },
            data: { subscriptionStatus: 'past_due' },
          });
          console.log(`[stripe] Team ${failedTeam.id} payment failed — marked past_due`);
          // No PII: only teamId, amount, currency are emitted.
          trackServer('payment_failed', {
            entity: 'team',
            teamId: failedTeam.id,
            amountFailed: invoice.amount_due,
            currency: invoice.currency,
          });
          break;
        }

        // ── Solo-subscriber path (preserved byte-identical) ──────────────────
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

      case 'invoice.payment_succeeded': {
        // PROVISIONING event — fires on every successful charge (initial + renewals).
        // Ensures subscriptionStatus stays 'active' and handles the trial→paid
        // transition automatically (if status was 'trialing', it flips to 'active').
        //
        // userId is not available directly on an invoice — we resolve it by
        // retrieving the subscription and reading its metadata.userId.
        // If the Stripe API call fails, re-throw so Stripe retries (provisioning
        // semantics: HTTP 500 is safer than silently ignoring a successful payment).
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.userId;
        if (!userId) {
          // Subscription exists but has no userId in metadata — this may be a
          // legacy subscription created before metadata was populated. Log and
          // return 200 so Stripe does not retry indefinitely.
          console.warn(
            `[stripe] invoice.payment_succeeded: no userId on subscription ${subscriptionId} — skipping DB update`,
          );
          break;
        }

        await db.user.update({
          where: { id: userId },
          data: { subscriptionStatus: 'active' },
        });
        console.log(
          `[stripe] User ${userId} payment succeeded — invoice ${invoice.id} ${invoice.amount_paid} ${invoice.currency}`,
        );
        // No PII: only userId, amount, currency, invoiceId are emitted.
        // Card numbers, customer email, customer name, and invoice line items are excluded.
        trackServer('payment_succeeded', {
          userId,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          invoiceId: invoice.id,
        });
        break;
      }

      case 'customer.subscription.trial_will_end': {
        // NOTIFICATION event — fires 3 days before the trial expires.
        // This is informational only: the subscription is still active in 'trialing'
        // state. We do NOT update the user record — that happens when the trial
        // actually ends via customer.subscription.updated with status 'active'.
        //
        // Unmapped price IDs here are soft warnings (unlike provisioning events
        // where they are hard errors). We emit analytics with plan: null so
        // downstream dashboards can still count trial-expiry notifications.
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) {
          console.warn(
            `[stripe] customer.subscription.trial_will_end: no userId on subscription ${subscription.id} — skipping`,
          );
          break;
        }

        const trialEnd = subscription.trial_end;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? planFromPriceId(priceId) : null;
        if (priceId && plan === null) {
          // Soft warning — notification-tier semantics: log but do not re-throw.
          // contrast with customer.subscription.updated (provisioning-tier) which
          // throws on unmapped price IDs.
          console.warn(
            `[stripe] customer.subscription.trial_will_end: unmapped price ID ${priceId} on subscription ${subscription.id} — emitting analytics with plan: null`,
          );
        }

        console.log(
          `[stripe] User ${userId} trial will end at ${new Date((trialEnd ?? 0) * 1000).toISOString()}`,
        );
        trackServer('trial_will_end', {
          userId,
          trialEndAt: trialEnd,
          plan,
        });
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
