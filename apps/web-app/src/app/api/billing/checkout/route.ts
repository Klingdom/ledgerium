import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  getStripe,
  getPriceId,
  getOneTimePriceId,
  PRO_PRICE_ID,
  APP_URL,
  TRIAL_PERIOD_DAYS,
  ALLOW_PROMOTION_CODES,
  AUTOMATIC_TAX_ENABLED,
} from '@/lib/stripe';
import { toPlanType } from '@/lib/plans';
import { isAdminUnlimited } from '@/lib/admin-allowlist';
import { effectivePlanFor } from '@/lib/feature-gating';
import { trackServer } from '@/lib/analytics-server';
import { PROCESS_AUDIT_SKU } from '@/lib/service-skus';
import { getAuditEligibility } from '@/lib/audit-eligibility';
import type { PaidPlanType, BillingInterval } from '@/lib/stripe';
import type Stripe from 'stripe';

/** Valid plan values for checkout (post CEO directive 2026-05-18 "Option B"). */
const VALID_PLANS: PaidPlanType[] = ['starter', 'solo', 'team', 'growth'];
const VALID_INTERVALS: BillingInterval[] = ['monthly', 'annual'];

/**
 * Checkout Session shapes this route can create (2026-08 monetization-shapes
 * hardening — CEO directive "get Stripe working across all possible
 * monetized use cases"). `type` defaults to `'subscription'` when the
 * request body omits it, so every existing caller (pricing page, account
 * page upgrade/downgrade flows) is unaffected — none of them have ever sent
 * a `type` field.
 */
type CheckoutType = 'subscription' | 'one_time';
const VALID_CHECKOUT_TYPES: CheckoutType[] = ['subscription', 'one_time'];

/** Minimal shape this route needs from a User row to resolve/create a Stripe Customer. */
interface CheckoutUser {
  id: string;
  email: string;
  name: string | null;
  stripeCustomerId: string | null;
}

/**
 * Plans temporarily blocked from self-serve Stripe Checkout per CEO directive
 * 2026-05-18 "Option B". Team and Growth are advertised on the pricing page
 * but route to a waitlist (mailto:hello@ledgerium.ai) until multi-user invite
 * infrastructure ships via TEAM-001 workspace build. This server-side guard
 * is defense-in-depth: even if the pricing UI is bypassed (direct API call
 * with plan=team or plan=growth), the request is rejected before a Stripe
 * Checkout Session is created. Prevents charging customers for advertised
 * functionality that the data model does not yet support (5 / 15 seat counts
 * require Workspace + WorkspaceMember + WorkspaceInvite tables).
 *
 * `solo` is deliberately NOT in this set (REVENUE_PLAN_20K §6 Option B,
 * docs/meta/REVENUE_PLAN_20K_001.md): it is a single-user tier with zero
 * dependency on the team data layer this gate protects — `maxSeats: 1`,
 * no `sharedLibrary`/`teamWorkspace` features. It is purchasable today.
 *
 * Reverts when TEAM-P01 through TEAM-P06 ship. Remove this set + the gate
 * block below at that time.
 */
const BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD = new Set<PaidPlanType>(['team', 'growth']);

/**
 * Fields shared by EVERY Checkout Session this route creates, regardless of
 * `mode`. Centralizing promotion-code + tax config here means the one-time
 * payment path (below) and any future SKU automatically inherit both — see
 * docs/runbooks/STRIPE_SETUP.md § Promotion codes and § Stripe Tax for the
 * operator-facing side of each flag.
 */
function buildSharedSessionParams(): Partial<Stripe.Checkout.SessionCreateParams> {
  const params: Partial<Stripe.Checkout.SessionCreateParams> = {};

  if (ALLOW_PROMOTION_CODES) {
    params.allow_promotion_codes = true;
  }

  // Stripe Tax: opt-in only (AUTOMATIC_TAX_ENABLED defaults false — see
  // stripe.ts doc comment). automatic_tax needs to know the customer's
  // jurisdiction to calculate anything; billing_address_collection:'required'
  // is what actually collects an address, and customer_update:{address:'auto',
  // name:'auto'} is what allows Checkout to persist it onto the Stripe
  // Customer object (always present by the time this is called — see
  // getOrCreateStripeCustomer below) so tax calculation can read it. Any one
  // of these three missing is the documented silent-failure mode: tax looks
  // "on" (automatic_tax.enabled true) but the session either errors at
  // creation (no address to resolve a jurisdiction from) or calculates $0
  // tax for everyone.
  if (AUTOMATIC_TAX_ENABLED) {
    params.automatic_tax = { enabled: true };
    params.billing_address_collection = 'required';
    params.customer_update = { address: 'auto', name: 'auto' };
  }

  return params;
}

/**
 * Resolve the caller's Stripe Customer, creating one if this is their first
 * checkout of ANY kind (subscription or one-time). Extracted so both
 * checkout shapes share identical customer-resolution behavior — a user's
 * Stripe Customer must be the same object whether they are buying a
 * subscription or a one-time SKU, so Portal history / tax address / future
 * purchases stay attached to one customer record.
 */
async function getOrCreateStripeCustomer(user: CheckoutUser): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customerParams: Record<string, unknown> = {
    email: user.email,
    metadata: { userId: user.id },
  };
  if (user.name) customerParams.name = user.name;
  const customer = await getStripe().customers.create(customerParams as Stripe.CustomerCreateParams);

  await db.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * One-time payment path (`mode: 'payment'`) — 2026-08 monetization-shapes
 * hardening. Parameterized on `sku` rather than hardcoding a product: a real
 * SKU is added by populating `ONE_TIME_PRICES` in stripe.ts (one map entry +
 * one env var), not by touching this function. See stripe.ts
 * `ONE_TIME_PRICES` doc comment and docs/runbooks/STRIPE_SETUP.md §
 * One-time payments.
 *
 * Deliberately does NOT run the subscription-only gates above
 * (BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD, the already-open-subscription
 * check, trial eligibility) — none of them are meaningful for a one-time
 * purchase, and applying them would incorrectly block, e.g., an existing
 * Team-waitlisted user from buying an unrelated one-off SKU.
 */
async function createOneTimeCheckoutSession(
  user: CheckoutUser,
  sku: string | null,
  quantity: number,
): Promise<NextResponse> {
  if (!sku) {
    return NextResponse.json(
      { error: 'Missing required field: sku', code: 'missing_sku' },
      { status: 400 },
    );
  }

  const priceId = getOneTimePriceId(sku);
  if (!priceId) {
    return NextResponse.json(
      { error: 'Billing not configured for this SKU', code: 'sku_not_configured', sku },
      { status: 503 },
    );
  }

  // ── Process Audit hard qualification gate (SKU_SPEC_001 §2) ────────────────
  // Enforced HERE, server-side, not just as a UI disabled-state — a customer
  // must not be able to buy an audit that cannot be meaningfully produced.
  // Below MIN_RECORDED_RUNS_FOR_AUDIT runs of a given process, variance and
  // variant figures are not statistically meaningful. Shares the exact same
  // query as the eligibility the account page displays
  // (getAuditEligibility / audit-eligibility.ts) so the UI and this
  // enforcement can never disagree.
  if (sku === PROCESS_AUDIT_SKU) {
    const eligibility = await getAuditEligibility(user.id);
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error:
            `A Process Audit requires at least one recorded process with ` +
            `${eligibility.minRunsRequired} or more runs — below that, variance ` +
            `and variant analysis are not statistically meaningful. Record more ` +
            `runs of the same process, then try again.`,
          code: 'audit_not_eligible',
          minRunsRequired: eligibility.minRunsRequired,
        },
        { status: 403 },
      );
    }
  }

  try {
    const customerId = await getOrCreateStripeCustomer(user);

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      // Dedicated one-time-purchase confirmation page — NOT the subscription
      // success_url below (that path is untouched). {CHECKOUT_SESSION_ID} is
      // a literal Stripe Checkout template token, substituted server-side by
      // Stripe itself; it is intentionally NOT JS-interpolated here (no `$`
      // prefix). The success page fetches purchase details by session id —
      // see /api/billing/one-time-purchase and account/purchase-success/page.tsx.
      success_url: `${APP_URL}/account/purchase-success?session_id={CHECKOUT_SESSION_ID}&sku=${encodeURIComponent(sku)}`,
      cancel_url: `${APP_URL}/pricing?billing=canceled`,
      metadata: {
        userId: user.id,
        type: 'one_time',
        sku,
      },
      ...buildSharedSessionParams(),
    });

    trackServer('checkout_started', {
      userId: user.id,
      type: 'one_time',
      sku,
      quantity,
    });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error('Stripe one-time checkout error:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session', code: 'checkout_session_failed' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout Session. Two shapes, selected by `type`:
 *   - `'subscription'` (default, backward compatible): existing plan +
 *     interval flow.
 *   - `'one_time'`: a single-payment SKU purchase (`mode: 'payment'`) — see
 *     createOneTimeCheckoutSession above.
 *
 * Body: { type?: "subscription" | "one_time", plan?: "starter" | "team" | "growth",
 *          interval?: "monthly" | "annual", sku?: string, quantity?: number }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found', code: 'user_not_found' }, { status: 404 });
  }

  // Block allowlisted accounts — they have admin-granted unlimited access and
  // do not need (or benefit from) a Stripe subscription.
  if (isAdminUnlimited(user.email)) {
    return NextResponse.json(
      { error: 'This account has admin-granted unlimited access and does not require a Stripe subscription.', code: 'admin_bypass' },
      { status: 400 },
    );
  }

  // Parse type/plan/interval/sku/quantity from request body (with
  // backward-compatible defaults — `type` defaults to 'subscription' so
  // every pre-2026-08 caller is unaffected).
  let requestedType: CheckoutType = 'subscription';
  let requestedPlan: PaidPlanType = 'starter';
  let requestedInterval: BillingInterval = 'monthly';
  let requestedSku: string | null = null;
  let requestedQuantity = 1;

  try {
    const body = await req.json().catch(() => ({}));
    if (body.type && VALID_CHECKOUT_TYPES.includes(body.type)) {
      requestedType = body.type;
    }
    if (body.plan && VALID_PLANS.includes(body.plan)) {
      requestedPlan = body.plan;
    }
    if (body.interval && VALID_INTERVALS.includes(body.interval)) {
      requestedInterval = body.interval;
    }
    if (typeof body.sku === 'string' && body.sku.trim() !== '') {
      requestedSku = body.sku.trim();
    }
    if (typeof body.quantity === 'number' && Number.isInteger(body.quantity) && body.quantity > 0) {
      requestedQuantity = body.quantity;
    }
  } catch {
    // No body or invalid JSON — use defaults.
  }

  // One-time payment path — fully independent of everything below, which is
  // subscription-only. See createOneTimeCheckoutSession doc comment.
  if (requestedType === 'one_time') {
    return createOneTimeCheckoutSession(user as CheckoutUser, requestedSku, requestedQuantity);
  }

  // Multi-user gate: reject Team and Growth purchases until Workspace build
  // ships per TEAM-001 (CEO directive 2026-05-18 "Option B"). This gate is
  // server-side defense-in-depth — the pricing UI already routes Team/Growth
  // CTAs to a mailto waitlist, so a request reaching this branch implies a
  // direct API call. Honor the customer by NOT charging them for advertised
  // functionality (5 / 15 seat counts) that the data model cannot yet fulfill.
  if (BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD.has(requestedPlan)) {
    return NextResponse.json(
      {
        error:
          'Multi-user invites are launching Q3 2026. Please join the waitlist at ' +
          'mailto:hello@ledgerium.ai?subject=Team Plan Waitlist or upgrade to Starter for solo use today.',
        code: 'awaiting_workspace_build',
        plan: requestedPlan,
        waitlistMailto: 'hello@ledgerium.ai',
        starterFallbackAvailable: true,
      },
      { status: 402 }, // Payment Required — semantically: "this plan exists but cannot accept payment yet"
    );
  }

  // Resolve the Stripe price ID for the requested plan + interval.
  let priceId = getPriceId(requestedPlan, requestedInterval);

  // Fallback: if the specific price isn't configured, try legacy PRO_PRICE_ID.
  if (!priceId && PRO_PRICE_ID) {
    priceId = PRO_PRICE_ID;
  }

  if (!priceId) {
    return NextResponse.json(
      {
        error: 'Billing not configured for this plan',
        code: 'plan_not_configured',
        plan: requestedPlan,
        interval: requestedInterval,
      },
      { status: 503 },
    );
  }

  // If the user already has an OPEN Stripe subscription — active, trialing,
  // or past_due — block a second Checkout Session and redirect to the portal
  // for plan management instead. Uses effectivePlanFor so workspace members
  // on a paid team plan are also blocked from double-billing (TEAM-P03.9
  // Sub-task B-1 — fixes solo-plan-only toPlanType check).
  //
  // Billing hardening (2026-08): previously this ONLY checked
  // subscriptionStatus === 'active', which let a mid-trial subscriber
  // ('trialing') start a completely separate second Checkout Session for a
  // different plan — Stripe would then be actively billing TWO parallel
  // subscriptions for the same customer (the original trial converts to a
  // real charge when it ends; the new one starts immediately). 'past_due'
  // is included for the same reason — the subscription is still open and
  // Stripe is still attempting to collect on it; a plan switch belongs in
  // the Billing Portal (which changes the SAME subscription), not a new one.
  // 'canceled' and 'none' are intentionally NOT blocked — those represent no
  // open subscription, so a fresh Checkout Session (including reactivation
  // after cancellation) is exactly correct.
  const OPEN_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due']);
  const currentPlan = await effectivePlanFor(user.id);
  if (currentPlan !== 'free' && OPEN_SUBSCRIPTION_STATUSES.has(user.subscriptionStatus ?? '')) {
    return NextResponse.json(
      { error: 'You already have an active subscription. Manage it from your account.', code: 'already_subscribed', redirect: '/account' },
      { status: 400 },
    );
  }

  try {
    // Reuse existing Stripe customer or create a new one.
    const customerId = await getOrCreateStripeCustomer(user as CheckoutUser);

    // Trial eligibility: only first-time subscribers receive the 14-day free
    // trial. We define "first-time" as never having held a Stripe subscription
    // — i.e. `stripeSubscriptionId` is null AND subscription status is `'none'`.
    // Cancelled-then-resubscribed users do NOT get a second trial. This
    // prevents trial abuse without requiring an additional Stripe API call.
    const isTrialEligible =
      !user.stripeSubscriptionId &&
      (user.subscriptionStatus === 'none' || user.subscriptionStatus === null);

    const shouldApplyTrial = isTrialEligible && TRIAL_PERIOD_DAYS > 0;

    // Build subscription_data: always include user metadata; conditionally
    // include trial_period_days only when eligible AND trial duration > 0.
    // Stripe rejects trial_period_days: 0 — we omit the field entirely.
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: { userId: user.id },
      ...(shouldApplyTrial ? { trial_period_days: TRIAL_PERIOD_DAYS } : {}),
    };

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
        trial: shouldApplyTrial ? String(TRIAL_PERIOD_DAYS) : 'none',
      },
      subscription_data: subscriptionData,
      ...buildSharedSessionParams(),
    });

    trackServer('checkout_started', {
      userId: user.id,
      plan: requestedPlan,
      interval: requestedInterval,
      trialDays: shouldApplyTrial ? TRIAL_PERIOD_DAYS : 0,
    });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session', code: 'checkout_session_failed' },
      { status: 500 },
    );
  }
}
