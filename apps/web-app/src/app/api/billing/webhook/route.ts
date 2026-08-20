import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getWebhookSecret, planFromPriceId, intervalFromStripeSubscription } from '@/lib/stripe';
import type { PlanType } from '@/lib/plans';
import { PLAN_FEATURES } from '@/lib/plans';
import { db } from '@/db';
import { trackServer, getFirstTouchVisitorId } from '@/lib/analytics-server';
import type Stripe from 'stripe';
import {
  resolveTeamFromCustomer,
  notifyOwnerOfDowngrade,
} from '@/lib/workspace/team-billing';
import { softDeactivateExcessMembers } from '@/lib/workspace/seat-management';
import { normalizeStripeStatus } from '@/lib/workspace/subscription-status';
import type { NormalizedSubscriptionStatus } from '@/lib/workspace/subscription-status';

/** Closed union for User.subscriptionStatus (distinct from Team's 5-value vocabulary). */
type UserSubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'none';

/**
 * Map a raw Stripe subscription status to the vocabulary stored on
 * User.subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trialing' | 'none'.
 * Unmapped Stripe statuses (e.g. 'incomplete', 'unpaid') normalize to 'none' —
 * fail-closed for revenue: an ambiguous status must never be recorded as
 * billable. `MRR_BILLABLE_STATUSES = ['active']` in admin-operations/pricing.ts
 * is the gate that keeps trials and every other non-active status out of MRR;
 * that gate only works if the DB actually distinguishes them.
 *
 * REVENUE_PLAN_20K fix (docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §1.2a):
 * this is now called from BOTH checkout.session.completed AND
 * customer.subscription.updated, so a subscription that begins in Stripe's
 * 'trialing' state is persisted as 'trialing' from the FIRST webhook event
 * onward, not just from whichever later event happens to fire. Previously
 * checkout.session.completed hardcoded 'active' unconditionally, so every
 * 14-day trial was counted as billed revenue for its entire duration.
 */
function mapStripeStatusToUserSubscriptionStatus(status: string): UserSubscriptionStatus {
  switch (status) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'trialing':
      return 'trialing';
    default:
      return 'none';
  }
}

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
 * - invoice.payment_action_required → capture the SCA/3-D-Secure hosted invoice URL
 * - customer.subscription.trial_will_end → emit analytics notification (no DB write)
 * - charge.dispute.created / charge.dispute.closed → record for admin visibility
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
 *
 * Idempotency (P0-1 — Stripe billing hardening, 2026-08):
 *   Stripe explicitly does not guarantee exactly-once delivery. Every event is
 *   claimed via a unique-constraint INSERT into WebhookEvent BEFORE any
 *   provisioning runs; a duplicate delivery of the SAME event.id hits the
 *   claim's uniqueness violation and is skipped without re-running side
 *   effects. See the claim/release block below for the documented tradeoff.
 *
 * Out-of-order delivery (Stripe also does not guarantee delivery ORDER):
 *   customer.subscription.updated and customer.subscription.deleted — the two
 *   events that can overwrite plan/status based on a snapshot of subscription
 *   state — compare the incoming Stripe event's own `created` timestamp
 *   against User.lastSubscriptionEventAt / Team.lastSubscriptionEventAt and
 *   skip the write if a newer event has already been applied. checkout.session.completed
 *   (a one-time first-write per subscription) and the two invoice.* events
 *   (each writes a single narrower field that self-corrects on the next
 *   successful billing cycle) are NOT given this treatment — see the inline
 *   comments at each of those sites for the specific reasoning.
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

  // ── Idempotency claim (P0-1) ────────────────────────────────────────────
  // Claim this event.id via a unique-constraint INSERT before doing any
  // provisioning work. If the insert fails with a unique-constraint
  // violation, this exact event has already been recorded and we return 200
  // without re-running side effects — Stripe stops retrying on 2xx.
  //
  // Documented tradeoff: if the process crashes AFTER this insert succeeds
  // but BEFORE a response is returned, the claim row survives and a Stripe
  // retry of that exact delivery is treated as a duplicate and silently
  // skipped — this specific event would never be provisioned. We accept this
  // over the alternative (claim AFTER processing completes), which reopens a
  // race window where two near-simultaneous deliveries of the same event.id
  // could both pass a "not yet claimed" check and both run provisioning —
  // for billing, double-provisioning (two Team rows, two subscription_created
  // analytics events, etc.) is a strictly worse failure mode than a rare
  // dropped event, which for most subscription-lifecycle events also
  // self-heals on the next successful invoice.payment_succeeded renewal.
  // On any processing failure below, the claim row IS released (see the
  // catch block) so a legitimate retry after a transient failure is NOT
  // treated as a duplicate.
  try {
    await db.webhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
      console.log(
        `[stripe] Duplicate webhook event ${event.id} (${event.type}) — already processed, skipping.`,
      );
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('[stripe] Failed to record webhook event for idempotency:', err);
    return NextResponse.json({ error: 'Webhook idempotency check failed' }, { status: 500 });
  }

  // Single upstream clock boundary for the out-of-order delivery guard below
  // (iter 037 MDR-P03/P04 pattern) — derived from the event's OWN `created`
  // timestamp (Stripe's authoritative "when did this happen" signal), not
  // from Date.now() at receipt time, which would be meaningless for ordering
  // retried/delayed deliveries.
  const eventCreatedAt = new Date(event.created * 1000);

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
        //
        // REVENUE_PLAN_20K fix: we also read subscription.status and
        // subscription.items[0].price.recurring.interval off the SAME retrieved
        // object, rather than assuming 'active'/'monthly'. A first-time
        // subscriber's Stripe subscription begins in 'trialing' status for the
        // full STRIPE_TRIAL_DAYS window (checkout/route.ts); if we hardcode
        // 'active' here, every trial is booked as billed MRR from second one.
        let plan: PlanType;
        let subscriptionStatus: UserSubscriptionStatus;
        let teamSubscriptionStatus: NormalizedSubscriptionStatus;
        let billingInterval: ReturnType<typeof intervalFromStripeSubscription>;
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
          subscriptionStatus = mapStripeStatusToUserSubscriptionStatus(subscription.status);
          teamSubscriptionStatus = normalizeStripeStatus(subscription.status);
          billingInterval = intervalFromStripeSubscription(subscription);
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
        //
        // `solo` is explicitly excluded here (REVENUE_PLAN_20K §6 Option B):
        // it is a single-user tier — `plan !== 'starter'` alone would have
        // silently provisioned a Team row for every Solo purchase, which is
        // exactly the trap this tier was designed to avoid (Solo has zero
        // dependency on the team data layer).
        const customerId = session.customer as string;
        if (customerId && plan !== 'free' && plan !== 'starter' && plan !== 'solo') {
          const existingTeam = await resolveTeamFromCustomer(customerId);
          if (!existingTeam) {
            // Look for a workspace owned by this user that has no Stripe link yet.
            const unlinkedTeam = await (db as any).team.findFirst({
              where: { createdBy: userId, stripeCustomerId: null },
            });
            if (unlinkedTeam) {
              // Link the existing workspace to Stripe IDs and stamp the plan.
              // subscriptionStatus + billingInterval written here too (REVENUE_PLAN_20K
              // fix) — Team is authoritative for team/growth billing state from this
              // point forward (see Team.billingInterval schema doc comment); without
              // this write a brand-new trial would fall back to the Team-row DB
              // default subscriptionStatus='active', reproducing the exact same
              // trial-misclassification bug on the team path.
              await (db as any).team.update({
                where: { id: unlinkedTeam.id },
                data: {
                  plan,
                  stripeCustomerId: customerId,
                  stripeSubscriptionId: session.subscription as string,
                  subscriptionStatus: teamSubscriptionStatus,
                  billingInterval,
                  // Out-of-order guard baseline — see module doc comment.
                  lastSubscriptionEventAt: eventCreatedAt,
                },
              });
              console.log(
                `[stripe] Team ${unlinkedTeam.id} linked to Stripe customer ${customerId} — plan ${plan}`,
              );
            } else {
              // No workspace exists yet — provision one now and create the
              // owner membership in a single atomic operation.
              // P0-J (iter 087 / TEAM-P03.10): wrap team.create + teamMember.create
              // in a single array-style transaction to prevent a partial-provisioning
              // state where the Team row exists but the owner membership does not.
              const userRecord = await db.user.findUnique({
                where: { id: userId },
                select: { name: true, email: true },
              });
              const baseName = userRecord?.name ?? userRecord?.email ?? userId;
              const newTeamId = `team_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              await (db as any).$transaction([
                (db as any).team.create({
                  data: {
                    id: newTeamId,
                    name: `${baseName}'s Workspace`,
                    slug: `ws-${userId.slice(0, 8)}-${customerId.slice(-6)}`,
                    plan,
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: session.subscription as string,
                    // REVENUE_PLAN_20K fix: explicit, not the schema default
                    // ('active') — a first-time team/growth trial must be
                    // provisioned as 'trialing' from creation, not silently
                    // defaulted to 'active' by the DB column default.
                    subscriptionStatus: teamSubscriptionStatus,
                    billingInterval,
                    createdBy: userId,
                    // Out-of-order guard baseline — see module doc comment.
                    lastSubscriptionEventAt: eventCreatedAt,
                  },
                }),
                (db as any).teamMember.create({
                  data: {
                    teamId: newTeamId,
                    userId,
                    role: 'owner',
                    status: 'active',
                    joinedAt: new Date(),
                  },
                }),
              ]);
              const newTeam = { id: newTeamId };
              console.log(
                `[stripe] Team ${newTeam.id} provisioned for user ${userId} — plan ${plan}`,
              );
            }
          }
        }

        // Captures the update's return value (Prisma returns the full updated
        // row by default) so `firstTouchVisitorId` is available for
        // `subscription_created` below without a second DB round-trip — this
        // is THE signup→paid pivot event for the attribution join, and it
        // fires identically for both solo and team/growth purchases since
        // `userId` here is always the purchasing/owning user (REVENUE_PLAN_20K
        // attribution fix, docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §2).
        const purchasingUser = await db.user.update({
          where: { id: userId },
          data: {
            plan,
            // REVENUE_PLAN_20K fix: was unconditionally 'active'. Now reflects
            // the actual Stripe subscription status — 'trialing' for the full
            // trial window, 'active' only once genuinely billed. This is the
            // write that MRR_BILLABLE_STATUSES = ['active'] (pricing.ts) was
            // always meant to gate on; the gate was defeated because this
            // field never actually recorded 'trialing'.
            subscriptionStatus,
            billingInterval,
            stripeSubscriptionId: session.subscription as string,
            stripeCustomerId: session.customer as string,
            // Out-of-order guard baseline — see module doc comment.
            lastSubscriptionEventAt: eventCreatedAt,
          },
        });
        console.log(`[stripe] User ${userId} upgraded to ${plan} (${subscriptionStatus})`);
        trackServer('subscription_created', {
          userId,
          plan,
          status: subscriptionStatus,
          // Optional chaining is defensive, not a real-world null case — a
          // successful Prisma `update()` always resolves the full row or
          // throws (never undefined). Guards test-double return shapes that
          // don't model the real client's guarantee.
          visitorId: purchasingUser?.firstTouchVisitorId ?? null,
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        const status = subscription.status;
        // Uses the same mapping helper as checkout.session.completed (REVENUE_PLAN_20K
        // fix) so a subscription's User.subscriptionStatus vocabulary is derived
        // identically at every write site — was previously an inline duplicate
        // of this exact ternary; now a single source of truth.
        const planStatus = mapStripeStatusToUserSubscriptionStatus(status);

        // REVENUE_PLAN_20K fix (§1.2c): persist the actual billing cadence so
        // annual subscribers are not counted at the full monthly sticker price.
        const billingInterval = intervalFromStripeSubscription(subscription);

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
        //
        // ATTRIBUTION SCOPE NOTE (REVENUE_PLAN_20K, docs/meta/REVENUE_PLAN_20K/
        // analytics_analysis.md §2): the team-scoped events below (this
        // `subscription_updated`, `workspace_downgraded`, and their
        // counterparts in the `deleted`/`payment_*` cases further down) do
        // NOT thread a `visitorId`. This is deliberate, not an oversight —
        // this call site has only `team.id` in scope, not an individual
        // user. Resolving "which visitor acquired this team" would require
        // an additional lookup of the team owner (`Team.createdBy` →
        // `User.firstTouchVisitorId`), which is a second join hop the
        // analytics artifact's minimum-viable fix does not scope. The
        // purchasing user's own first-touch source IS captured — see
        // `subscription_created` above, which fires with the top-level
        // `userId` for every purchase (solo or team) at checkout time.
        const customerId = subscription.customer as string;
        if (customerId) {
          const team = await resolveTeamFromCustomer(customerId);
          if (team) {
            // Out-of-order delivery guard — see module doc comment. A
            // later-arriving webhook delivery whose Stripe event `created`
            // timestamp is OLDER than the last event we already applied for
            // this team is a stale/out-of-order retry — skip it rather than
            // clobbering the newer state that a subsequent event already wrote.
            if (
              team.lastSubscriptionEventAt &&
              team.lastSubscriptionEventAt.getTime() > eventCreatedAt.getTime()
            ) {
              console.warn(
                `[stripe] customer.subscription.updated: stale event ${event.id} ` +
                  `(created ${eventCreatedAt.toISOString()}) is older than the last-applied ` +
                  `event (${team.lastSubscriptionEventAt.toISOString()}) for team ${team.id} — skipping`,
              );
              trackServer('subscription_update_skipped_stale', {
                entity: 'team',
                teamId: team.id,
                eventId: event.id,
              });
              break;
            }

            const previousPlan = team.plan as PlanType;
            const nowMs = Date.now();

            await (db as any).team.update({
              where: { id: team.id },
              data: {
                plan,
                stripeSubscriptionId: subscription.id,
                // Sub-task 1 (iter 085): write normalized status alongside plan.
                subscriptionStatus: normalizedStatus,
                // REVENUE_PLAN_20K fix: Team is the authoritative billing-state
                // row for team/growth from this point in the lifecycle onward
                // (see Team.billingInterval schema doc comment) — trial→paid
                // conversions, upgrades, downgrades, and renewals all arrive
                // here, never through the User row again.
                billingInterval,
                // Out-of-order guard baseline — see module doc comment.
                lastSubscriptionEventAt: eventCreatedAt,
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
            // P0-G (iter 087 / TEAM-P03.10): workspace_downgraded fires when
            // a plan change causes excess members to be soft-deactivated.
            // PII-free: only teamId, plan names, and count emitted.
            if (deactivatedIds.length > 0) {
              trackServer('workspace_downgraded', {
                teamId: team.id,
                fromPlan: previousPlan,
                toPlan: plan,
                deactivatedCount: deactivatedIds.length,
              });
            }
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

        // Out-of-order delivery guard — see module doc comment (same
        // reasoning as the team branch above).
        if (
          soloUser.lastSubscriptionEventAt &&
          soloUser.lastSubscriptionEventAt.getTime() > eventCreatedAt.getTime()
        ) {
          console.warn(
            `[stripe] customer.subscription.updated: stale event ${event.id} ` +
              `(created ${eventCreatedAt.toISOString()}) is older than the last-applied ` +
              `event (${soloUser.lastSubscriptionEventAt.toISOString()}) for user ${soloUser.id} — skipping`,
          );
          trackServer('subscription_update_skipped_stale', {
            userId: soloUser.id,
            eventId: event.id,
          });
          break;
        }

        await db.user.update({
          where: { id: soloUser.id },
          data: {
            plan,
            subscriptionStatus: planStatus,
            billingInterval,
            // Out-of-order guard baseline — see module doc comment.
            lastSubscriptionEventAt: eventCreatedAt,
          },
        });
        console.log(`[stripe] User ${soloUser.id} subscription updated: ${status} → plan ${plan}`);
        // `soloUser` was fetched with no `select` above, so the full row
        // (including firstTouchVisitorId) is already in hand — no extra query.
        trackServer('subscription_updated', { userId: soloUser.id, plan, status, visitorId: soloUser.firstTouchVisitorId });
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
            // Out-of-order delivery guard — see module doc comment. Without
            // this, a delayed/retried .deleted delivery could arrive AFTER a
            // legitimate later .updated event (e.g. the owner resubscribed)
            // and incorrectly revert an active workspace back to free.
            if (
              deletedTeam.lastSubscriptionEventAt &&
              deletedTeam.lastSubscriptionEventAt.getTime() > eventCreatedAt.getTime()
            ) {
              console.warn(
                `[stripe] customer.subscription.deleted: stale event ${event.id} ` +
                  `(created ${eventCreatedAt.toISOString()}) is older than the last-applied ` +
                  `event (${deletedTeam.lastSubscriptionEventAt.toISOString()}) for team ${deletedTeam.id} — skipping`,
              );
              trackServer('subscription_update_skipped_stale', {
                entity: 'team',
                teamId: deletedTeam.id,
                eventId: event.id,
              });
              break;
            }

            const previousPlanDeleted = deletedTeam.plan as PlanType;
            const nowMsDeleted = Date.now();

            await (db as any).team.update({
              where: { id: deletedTeam.id },
              data: {
                plan: 'free',
                subscriptionStatus: 'canceled',
                stripeSubscriptionId: null,
                // A canceled subscription moots any outstanding SCA challenge.
                pendingInvoiceUrl: null,
                // Out-of-order guard baseline — see module doc comment.
                lastSubscriptionEventAt: eventCreatedAt,
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
            // P0-G (iter 087 / TEAM-P03.10): workspace_canceled fires whenever
            // a team subscription is fully canceled (deletion event). Emitted
            // unconditionally — every cancellation is a workspace-level event.
            // PII-free: only teamId and deactivated count emitted.
            trackServer('workspace_canceled', {
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

        // Out-of-order delivery guard — see module doc comment.
        if (
          deletedSoloUser.lastSubscriptionEventAt &&
          deletedSoloUser.lastSubscriptionEventAt.getTime() > eventCreatedAt.getTime()
        ) {
          console.warn(
            `[stripe] customer.subscription.deleted: stale event ${event.id} ` +
              `(created ${eventCreatedAt.toISOString()}) is older than the last-applied ` +
              `event (${deletedSoloUser.lastSubscriptionEventAt.toISOString()}) for user ${deletedSoloUser.id} — skipping`,
          );
          trackServer('subscription_update_skipped_stale', {
            userId: deletedSoloUser.id,
            eventId: event.id,
          });
          break;
        }

        await db.user.update({
          where: { id: deletedSoloUser.id },
          data: {
            plan: 'free',
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null,
            // A canceled subscription moots any outstanding SCA challenge.
            pendingInvoiceUrl: null,
            // Out-of-order guard baseline — see module doc comment.
            lastSubscriptionEventAt: eventCreatedAt,
          },
        });
        console.log(`[stripe] User ${deletedSoloUser.id} subscription canceled — reverted to free`);
        // `deletedSoloUser` was fetched with no `select` above — full row in hand.
        trackServer('subscription_canceled', { userId: deletedSoloUser.id, visitorId: deletedSoloUser.firstTouchVisitorId });
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
        // `user` was fetched with no `select` above — full row in hand.
        trackServer('payment_failed', { userId: user.id, visitorId: user.firstTouchVisitorId });
        break;
      }

      case 'invoice.payment_succeeded': {
        // PROVISIONING event — fires on every successful charge (initial + renewals).
        // Ensures subscriptionStatus stays 'active' and handles the trial→paid
        // transition automatically (if status was 'trialing', it flips to 'active').
        //
        // SECURITY (TEAM-P03.9 Sub-task C): the previous implementation resolved
        // userId via getStripe().subscriptions.retrieve(subscriptionId) and reading
        // subscription.metadata?.userId. That metadata field is MUTABLE — an
        // attacker who gains write access to the Stripe Dashboard can pivot to any
        // userId without owning the subscription. This is replaced with a
        // cryptographically-grounded stripeSubscriptionId DB lookup, mirroring the
        // correct pattern in invoice.payment_failed (lines above). The Stripe API
        // call is removed entirely.
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        // ── Team-first resolution (mirrors invoice.payment_failed pattern) ────
        const succeededTeam = await (db as any).team.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (succeededTeam) {
          await (db as any).team.update({
            where: { id: succeededTeam.id },
            // A successful charge resolves any outstanding SCA challenge.
            data: { subscriptionStatus: 'active', pendingInvoiceUrl: null },
          });
          console.log(
            `[stripe] Team ${succeededTeam.id} payment succeeded — invoice ${invoice.id} ${invoice.amount_paid} ${invoice.currency}`,
          );
          // No PII: only teamId, amount, currency, invoiceId are emitted.
          trackServer('payment_succeeded', {
            entity: 'team',
            teamId: succeededTeam.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            invoiceId: invoice.id,
          });
          break;
        }

        // ── Solo-subscriber path ─────────────────────────────────────────────
        const succeededUser = await db.user.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });
        if (!succeededUser) {
          // No team and no user match this subscriptionId — may be a legacy
          // subscription created before stripeSubscriptionId was populated.
          // Log and return 200 so Stripe does not retry indefinitely.
          console.warn(
            `[stripe] invoice.payment_succeeded: no team or user found for subscription ${subscriptionId} — skipping DB update`,
          );
          break;
        }

        await db.user.update({
          where: { id: succeededUser.id },
          // A successful charge resolves any outstanding SCA challenge.
          data: { subscriptionStatus: 'active', pendingInvoiceUrl: null },
        });
        console.log(
          `[stripe] User ${succeededUser.id} payment succeeded — invoice ${invoice.id} ${invoice.amount_paid} ${invoice.currency}`,
        );
        // No PII: only userId, amount, currency, invoiceId, visitorId (an
        // anonymous UUID — see AnalyticsEvent.visitorId doc comment) are
        // emitted. Card numbers, customer email, customer name, and invoice
        // line items are excluded. `succeededUser` was fetched with no
        // `select` above — full row (incl. firstTouchVisitorId) in hand.
        trackServer('payment_succeeded', {
          userId: succeededUser.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          visitorId: succeededUser.firstTouchVisitorId,
          invoiceId: invoice.id,
        });
        break;
      }

      case 'invoice.payment_action_required': {
        // P0-2 — SCA / 3-D Secure. Stripe sends this IN ADDITION TO
        // invoice.payment_failed when an off-session charge attempt (almost
        // always a renewal, since Stripe Checkout itself resolves SCA during
        // the initial hosted checkout flow before checkout.session.completed
        // ever fires) fails specifically because the card issuer requires
        // customer re-authentication — common for EU cards under PSD2.
        //
        // invoice.payment_failed (handled above) already marks the account
        // past_due; this handler's sole job is to capture the Stripe-hosted
        // authentication link so the /account billing surface can show the
        // customer a direct "complete payment" action instead of a dead-end
        // past_due badge with no next step.
        //
        // Deliberately does NOT write subscriptionStatus — see the
        // pendingInvoiceUrl schema doc comment (schema.prisma) for why
        // SCA-required is modeled as a side-channel field, not a
        // subscriptionStatus value.
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const hostedInvoiceUrl = invoice.hosted_invoice_url ?? null;

        const actionTeam = await (db as any).team.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (actionTeam) {
          await (db as any).team.update({
            where: { id: actionTeam.id },
            data: { pendingInvoiceUrl: hostedInvoiceUrl },
          });
          console.log(
            `[stripe] Team ${actionTeam.id} payment requires action — invoice ${invoice.id}`,
          );
          // No PII: only teamId and invoiceId are emitted (the hosted URL
          // itself is not — it is a bearer-style link to the invoice and
          // must not be logged to an analytics sink).
          trackServer('payment_action_required', {
            entity: 'team',
            teamId: actionTeam.id,
            invoiceId: invoice.id,
          });
          break;
        }

        const actionUser = await db.user.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });
        if (!actionUser) {
          console.warn(
            `[stripe] invoice.payment_action_required: no team or user found for subscription ${subscriptionId} — skipping DB update`,
          );
          break;
        }

        await db.user.update({
          where: { id: actionUser.id },
          data: { pendingInvoiceUrl: hostedInvoiceUrl },
        });
        console.log(
          `[stripe] User ${actionUser.id} payment requires action — invoice ${invoice.id}`,
        );
        trackServer('payment_action_required', {
          userId: actionUser.id,
          invoiceId: invoice.id,
          visitorId: actionUser.firstTouchVisitorId,
        });
        break;
      }

      case 'charge.dispute.created': {
        // P1-1 — record for admin visibility. Disputes are rare, high-stakes,
        // and require human judgment (submit evidence within Stripe's
        // response window, or accept the loss). We deliberately do NOT touch
        // plan/entitlement here: a dispute is a customer CLAIM, not an
        // adjudicated outcome, and unilaterally revoking access on a mere
        // claim (before Stripe/the card network rules on it) would be
        // punitive to legitimate customers and would itself create an
        // incentive for bad-faith "dispute to get free service" abuse if we
        // did the opposite. Entitlement continues to be governed exclusively
        // by the subscription-lifecycle events above.
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;

        // Dispute webhook payloads are not expanded — `charge` is a bare ID.
        // Retrieve the charge to resolve the owning customer for admin
        // attribution; a failure here must not fail the whole webhook (the
        // dispute is still recorded, with owner left unresolved).
        let disputeCustomerId: string | null = null;
        try {
          const charge = await getStripe().charges.retrieve(chargeId);
          disputeCustomerId =
            (typeof charge.customer === 'string' ? charge.customer : charge.customer?.id) ?? null;
        } catch (err) {
          console.error(
            `[stripe] charge.dispute.created: failed to retrieve charge ${chargeId} for customer resolution`,
            err,
          );
        }

        let disputeTeamId: string | null = null;
        let disputeUserId: string | null = null;
        if (disputeCustomerId) {
          const disputeTeam = await resolveTeamFromCustomer(disputeCustomerId);
          if (disputeTeam) {
            disputeTeamId = disputeTeam.id;
          } else {
            const disputeUser = await db.user.findFirst({
              where: { stripeCustomerId: disputeCustomerId },
            });
            disputeUserId = disputeUser?.id ?? null;
          }
        }

        await (db as any).stripeDispute.upsert({
          where: { id: dispute.id },
          create: {
            id: dispute.id,
            chargeId,
            userId: disputeUserId,
            teamId: disputeTeamId,
            amount: dispute.amount,
            currency: dispute.currency,
            reason: dispute.reason,
            status: dispute.status,
          },
          update: {
            amount: dispute.amount,
            currency: dispute.currency,
            reason: dispute.reason,
            status: dispute.status,
          },
        });

        console.warn(
          `[stripe] Dispute ${dispute.id} created on charge ${chargeId} — reason=${dispute.reason} ` +
            `amount=${dispute.amount} ${dispute.currency}` +
            (disputeTeamId
              ? ` team=${disputeTeamId}`
              : disputeUserId
                ? ` user=${disputeUserId}`
                : ' (owner unresolved)'),
        );
        // No PII: chargeId/disputeId/teamId/userId are opaque IDs; reason and
        // status are Stripe's fixed taxonomy strings, not free text.
        trackServer('dispute_created', {
          disputeId: dispute.id,
          chargeId,
          ...(disputeTeamId ? { teamId: disputeTeamId } : {}),
          ...(disputeUserId ? { userId: disputeUserId } : {}),
          amount: dispute.amount,
          currency: dispute.currency,
          reason: dispute.reason,
        });
        break;
      }

      case 'charge.dispute.closed': {
        // Keeps the admin-visible dispute status current as Stripe resolves
        // it (won / lost / warning_closed). Upsert is safe even if .closed
        // somehow arrives without a prior .created row on file.
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;

        await (db as any).stripeDispute.upsert({
          where: { id: dispute.id },
          create: {
            id: dispute.id,
            chargeId,
            userId: null,
            teamId: null,
            amount: dispute.amount,
            currency: dispute.currency,
            reason: dispute.reason,
            status: dispute.status,
          },
          update: { status: dispute.status },
        });

        console.log(`[stripe] Dispute ${dispute.id} closed — status=${dispute.status}`);
        trackServer('dispute_closed', { disputeId: dispute.id, status: dispute.status });
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
        // No prior DB read in this handler (notification-only, no write) — a
        // dedicated lookup is required to resolve visitorId. Cheap: single
        // findUnique on the primary key, select-narrowed to one column.
        const trialWillEndVisitorId = await getFirstTouchVisitorId(userId);
        trackServer('trial_will_end', {
          userId,
          trialEndAt: trialEnd,
          plan,
          visitorId: trialWillEndVisitorId,
        });
        break;
      }

      default:
        // Unhandled event type — log and ignore
        break;
    }
  } catch (err) {
    console.error(`[stripe] Webhook handler error for ${event.type}:`, err);
    // Release the idempotency claim so Stripe's retry of this event is
    // treated as a fresh attempt, not a duplicate — otherwise a transient
    // processing failure would permanently swallow the event (see the claim
    // block's doc comment above).
    try {
      await db.webhookEvent.delete({ where: { id: event.id } });
    } catch (delErr) {
      console.error(`[stripe] Failed to release idempotency claim for ${event.id}:`, delErr);
    }
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
