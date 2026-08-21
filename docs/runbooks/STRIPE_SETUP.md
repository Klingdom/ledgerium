# Stripe Setup Runbook — 5-Tier Pricing + 14-Day Trial

**Audience:** Ledgerium AI billing operator (you).  
**Goal:** Create the 4 new paid products (Starter / Solo / Team / Growth) with monthly + annual prices, preserve the existing legacy Pro product, configure the webhook endpoint, and ship 14-day free trials.  
**Time:** ~35 minutes in Test Mode, ~20 minutes to promote to Live Mode.

> **Billing hardening pass (2026-08 — "get Stripe working across all possible
> monetized use cases").** This runbook now reflects 9 webhook event
> subscriptions (was 6), a required Customer Portal "Subscriptions"
> configuration step (Step 3b — **without this, upgrade/downgrade literally
> cannot happen through the portal**), and 3 code-level correctness fixes:
> webhook delivery idempotency, SCA/3-D Secure visibility, and dispute
> recording. See **§ What changed in the 2026-08 billing hardening pass**
> near the bottom for the full list and what is code vs. what is your
> Dashboard action.

> **Monetization-shapes hardening (2026-08 — "get creative and setup stripe
> for all monetized use cases; get the different online product sales
> working").** The checkout layer previously only knew one shape:
> `mode: 'subscription'`. It now supports **promotion codes** (on by
> default, safe when unconfigured), **Stripe Tax** (off by default, opt-in,
> degrades safely when unconfigured), and **one-time payments**
> (`mode: 'payment'`) as a reusable capability with zero real SKUs turned on.
> See **§ Promotion codes**, **§ Stripe Tax**, and **§ One-time payments**
> below for what you need to configure for each, and **§ Candidate SKUs**
> for engineering's reasoning on what to sell one-time — deliberately NOT a
> decision, since naming/pricing a real SKU is a product call, not an
> engineering one.

> **Service SKUs shipped (2026-08 — SKU_SPEC_001, CEO-directed).** The two
> candidates from § Candidate SKUs below are now real, purchasable SKUs —
> **Guided Onboarding ($299)** and **Process Audit ($1,500)**. Both are
> inert (checkout 503s) until you create their Stripe Products and set two
> env vars — see **§ Service SKUs — Guided Onboarding + Process Audit**
> below. Prices are still coordinator proposals per SKU_SPEC_001, not final
> CEO decisions — see that doc's "Decisions required from the CEO" section.

> **Solo tier added (REVENUE_PLAN_20K §6 Option B).** Solo is a $89/mo,
> single-user tier that monetizes the intelligence layer without depending on
> the (currently broken) team data layer — see `docs/meta/REVENUE_PLAN_20K_001.md`
> for the full rationale. It is purchasable self-serve today, same as Starter.
> If you only care about getting Solo live and the other tiers are already
> configured, do just **Step 2b** and add the 2 new env vars from **Step 4**.

> Before you start: do the entire setup in **Test Mode first** (top-right toggle in Stripe Dashboard reads "Test mode"). Test the full checkout flow with card `4242 4242 4242 4242`. Only after a successful end-to-end test in Test Mode, repeat the steps in Live Mode.

---

## What's already built in code

Everything except the Stripe Dashboard configuration and production env vars:

- ✅ `apps/web-app/src/lib/stripe.ts` — Stripe SDK + 8 price-ID env vars wired (Solo added); promotion-code + Stripe Tax flags; one-time SKU price map (2026-08 monetization-shapes)
- ✅ `apps/web-app/src/lib/plans.ts` — Free / Starter / Solo / Team / Growth / Enterprise plan map
- ✅ `apps/web-app/src/app/api/billing/checkout/route.ts` — Checkout Session creation with 14-day trial for first-time subscribers (iter 066); blocks a second parallel Checkout Session for any subscriber with an open (active/trialing/past_due) subscription (2026-08 hardening); promotion codes + Stripe Tax wired onto every session; parameterized `mode: 'payment'` one-time-purchase path, independent of the subscription gates (2026-08 monetization-shapes)
- ✅ `apps/web-app/src/app/api/billing/webhook/route.ts` — **9-event** webhook handler with delivery idempotency and out-of-order delivery protection (2026-08 hardening — see § below); `checkout.session.completed` now branches on `mode` to record one-time purchases without touching plan/entitlement (2026-08 monetization-shapes)
- ✅ `apps/web-app/src/app/api/billing/portal/route.ts` — Billing Portal for subscription management
- ✅ `apps/web-app/src/app/api/admin/disputes/route.ts` — admin-only list of recorded chargeback disputes (2026-08 hardening)
- ✅ `apps/web-app/src/app/(app)/account/page.tsx` — Plan & Billing card, now including an SCA "Complete payment" banner when Stripe needs the customer to re-authenticate (2026-08 hardening)
- ✅ `apps/web-app/src/app/(public)/pricing/page.tsx` — 5-column comparison table with $49/$249/$799 + 17% annual savings
- ✅ Legacy `PRO_PRICE_ID` fallback — your existing Pro customers continue working without disruption
- ✅ `one_time_purchases` table (Prisma model `OneTimePurchase`) — durable record of every completed one-time purchase, independent of `users`/`teams` billing state (2026-08 monetization-shapes)
- ✅ `apps/web-app/src/lib/service-skus.ts` — catalog + display copy for Guided Onboarding + Process Audit, and the Process Audit hard qualification gate constant (`MIN_RECORDED_RUNS_FOR_AUDIT = 5`, SKU_SPEC_001 §2)
- ✅ `apps/web-app/src/lib/audit-eligibility.ts` — the single query used BOTH to display Process Audit eligibility in the UI and to enforce it server-side at checkout, so the two can never disagree
- ✅ `apps/web-app/src/app/api/billing/checkout/route.ts` — `createOneTimeCheckoutSession` now returns **HTTP 403 `audit_not_eligible`** for `sku: 'process_audit'` when the purchasing user has zero processes with 5+ recorded runs — enforced, not just a disabled button (2026-08 service SKUs)
- ✅ `apps/web-app/src/app/api/billing/sku-availability/route.ts` — public endpoint so purchase surfaces can show an honest "not yet available" state instead of a dead-end click
- ✅ `apps/web-app/src/app/api/billing/audit-eligibility/route.ts` — authenticated endpoint returning the current user's per-process run counts and audit eligibility
- ✅ `apps/web-app/src/app/api/billing/one-time-purchase/route.ts` — authenticated, ownership-scoped lookup of a single one-time purchase by Checkout Session id, used by the post-purchase confirmation page
- ✅ `apps/web-app/src/app/(app)/account/purchase-success/page.tsx` — post-purchase confirmation page (one-time SKUs redirect here, NOT `/account?billing=success`, which remains the subscription success URL, untouched)
- ✅ `apps/web-app/src/components/ServicesCard.tsx` — in-app "Services" section on `/account`, rendered for every signed-in user; Process Audit gates the purchase button on real recording counts
- ✅ `apps/web-app/src/components/ServiceOfferCard.tsx` — public-facing Guided Onboarding offer, rendered on `/pricing` and `/install` with page-specific framing copy

**NOT built in code — these are Dashboard-only settings you must configure
yourself (Step 3b below):** the actual ability for a customer to switch
plans inside the Billing Portal, and the proration/cancellation-timing
policy that governs it. See the callout at the top of this document.

---

## Step 1 — Preserve the legacy Pro product

**DO NOT delete or archive your existing Pro product/price.** Any current subscriber pays via that price ID; archiving would silently break their renewals.

Action:
1. Dashboard → **Products** → find your existing "Pro" product
2. Leave it active. Do not touch it.
3. Confirm its price ID is still set in production as `STRIPE_PRO_PRICE_ID` (this powers the code's legacy fallback in `planFromPriceId` which maps it to `'starter'`).

If you have zero active Pro subscribers and want a clean slate, you may **archive** (not delete) the Pro product. Archiving prevents new sign-ups but preserves billing for any active subscription. Recommended: leave it active for safety.

---

## Step 2 — Create 4 new products with monthly + annual prices

For each of Starter, Solo, Team, Growth — do the following in Test Mode:

### 2a. Starter

1. Dashboard → **Products** → **+ Add product**
2. **Name:** `Starter`
3. **Description:** `For operations team leads — 15 recordings/month, clean exports, process health scores, 14-day free trial.`
4. **Tax behavior:** `Inclusive` (or your tax setup; default is fine for now)
5. **Pricing model:** `Standard pricing` → `Recurring`
6. **Create first price (monthly):**
   - Price: `$49.00 USD`
   - Billing period: `Monthly`
   - **Save the price ID** — looks like `price_1XYZabc...` — this is your `STRIPE_STARTER_MONTHLY_PRICE_ID`
7. Click **Add another price** (on the same product):
   - Price: `$490.00 USD` (= $49 × 12 − ~17% = $588 − $98 = $490)
   - Billing period: `Yearly`
   - **Save the price ID** — this is your `STRIPE_STARTER_ANNUAL_PRICE_ID`

### 2b. Solo (added — REVENUE_PLAN_20K §6 Option B)

Solo is a single-user tier that unlocks the full intelligence layer (bottleneck
analysis, automation scoring, variant detection) without team features. It sits
between Starter and Team, is self-serve like Starter, and ships with unlimited
recordings (no monthly cap — see `apps/web-app/src/lib/plans.ts` for the
rationale).

1. Dashboard → **Products** → **+ Add product**
2. **Name:** `Solo`
3. **Description:** `For solo power users — unlimited recordings, full process intelligence (bottlenecks, variants, automation scoring), 1 seat, no team workspace, 14-day free trial.`
4. Add monthly price: `$89.00 USD` / `Monthly` → save as `STRIPE_SOLO_MONTHLY_PRICE_ID`
5. Add annual price: `$888.00 USD` / `Yearly` (= $74/mo equivalent, matching the ~17% discount pattern used by the other tiers) → save as `STRIPE_SOLO_ANNUAL_PRICE_ID`

**The $89 price point is intentionally the easiest number in this runbook to
change.** It's the midpoint of a $79–99 band from
`docs/meta/REVENUE_PLAN_20K/market_analysis.md` §6 — if the CEO wants a
different number, create the Stripe price at the new figure, update
`price` / `annualPrice` on the `solo` entry in `apps/web-app/src/lib/config.ts`
to match, and re-run `pnpm test` (the `admin-operations/pricing.test.ts`
drift guard will fail loudly if the two ever disagree).

### 2c. Team

1. Dashboard → **Products** → **+ Add product**
2. **Name:** `Team`
3. **Description:** `For process improvement teams — unlimited recordings, full process intelligence (bottlenecks, variants, automation scoring), 3 recorders + 5 viewer seats, 14-day free trial.`
4. Add monthly price: `$249.00 USD` / `Monthly` → save as `STRIPE_TEAM_MONTHLY_PRICE_ID`
5. Add annual price: `$2,490.00 USD` / `Yearly` → save as `STRIPE_TEAM_ANNUAL_PRICE_ID`

### 2d. Growth

1. Dashboard → **Products** → **+ Add product**
2. **Name:** `Growth`
3. **Description:** `For AI implementation leads — everything in Team + advanced analytics, cross-workflow comparison, AI agent composition, integration risk assessment. 10 recorders + 15 seats. 14-day free trial.`
4. Add monthly price: `$799.00 USD` / `Monthly` → save as `STRIPE_GROWTH_MONTHLY_PRICE_ID`
5. Add annual price: `$7,990.00 USD` / `Yearly` → save as `STRIPE_GROWTH_ANNUAL_PRICE_ID`

You should now have **8 new price IDs** captured. Keep them somewhere safe — you'll paste them into environment variables in Step 4.

### Sanity check

Your Products list should now show **at least 5 products**: Pro (legacy, untouched), Starter, Solo, Team, Growth. (Enterprise is "Contact Sales" — handled by you separately later, no Stripe product needed.)

---

## Step 3 — Configure the webhook endpoint

1. Dashboard → **Developers** → **Webhooks** → **+ Add endpoint**
2. **Endpoint URL:**
   - Test Mode: `https://your-staging-domain.example/api/billing/webhook` OR a tunneled localhost URL from `stripe listen` (see Step 5)
   - Live Mode: `https://ledgerium.ai/api/billing/webhook`
3. **Description:** `Ledgerium AI subscription events`
4. **API version:** Latest (default is fine)
5. **Select events to send** — check these **9** (this is the complete, current list; do not subscribe to fewer):

   **Core subscription lifecycle (4):**
   - ✅ `checkout.session.completed` — fires when user completes checkout
   - ✅ `customer.subscription.updated` — fires on plan changes, trial→paid conversion, status changes
   - ✅ `customer.subscription.deleted` — fires when user cancels
   - ✅ `invoice.payment_failed` — fires when card declines on renewal

   **Payment confirmation + notifications (2):**
   - ✅ `invoice.payment_succeeded` — fires on every successful charge (initial + renewals); handler confirms `subscriptionStatus: 'active'`, clears any outstanding SCA flag, and emits `payment_succeeded` analytics. No email dispatch yet — receipt emails are a future iteration.
   - ✅ `customer.subscription.trial_will_end` — fires 3 days before trial expires; handler emits `trial_will_end` analytics with `trialEndAt` timestamp and resolved plan. No email dispatch yet — proactive reminder emails are a future iteration.

   **Added in the 2026-08 billing hardening pass (3) — REQUIRED, not optional:**
   - ✅ `invoice.payment_action_required` — fires when a renewal charge fails specifically because the card issuer requires 3-D Secure / SCA re-authentication (common for EU cards under PSD2). Without this subscribed, an affected customer's payment silently stalls with no path to resolution — they see nothing, you see nothing, and the subscription eventually cancels for non-payment. Handler stores the Stripe-hosted authentication link and the `/account` page shows the customer a direct "Complete payment" button.
   - ✅ `charge.dispute.created` — fires when a customer disputes a charge with their card issuer (chargeback). Handler records it to an admin-visible ledger (`GET /api/admin/disputes`); does **not** change the customer's plan or access (see § Disputes below for why).
   - ✅ `charge.dispute.closed` — fires when Stripe/the card network resolves a dispute (won / lost / etc.). Keeps the admin-visible status current.

6. Click **Add endpoint**
7. On the endpoint detail page, click **Reveal** under "Signing secret"
8. Copy the value — starts with `whsec_...` — this is your `STRIPE_WEBHOOK_SECRET`

---

## Step 3b — Configure the Customer Portal (REQUIRED for upgrade/downgrade to work at all)

**This is the single most important Dashboard step in this runbook and it is
easy to miss.** By default, Stripe's Customer Portal does **not** let a
customer switch products/prices — it only offers cancel + update payment
method + view invoices. If you skip this, clicking "Upgrade to Solo" or
"Downgrade" on the `/account` page correctly opens the Portal, but the
customer will find **no way to actually change plans there** — the button
works, the Portal loads, and there is simply nothing to click.

1. Dashboard → **Settings** → **Billing** → **Customer portal**
   (or **Settings → Billing → Configuration** depending on your Dashboard
   version — search "Customer portal" if the path has moved)
2. Under **Subscriptions**, enable **"Customers can switch plans"**
3. **Add the products customers are allowed to switch between.** For each
   direction you want to support:
   - Add Starter (both intervals) and Solo (both intervals) to the
     switchable-products list. This is what makes starter↔solo upgrade and
     downgrade actually work — code-side, `checkout/route.ts` already
     redirects an existing subscriber here; this Dashboard list is what the
     Portal shows them once they arrive.
   - Do **not** add Team or Growth to this list yet — those tiers are not
     purchasable (`checkout/route.ts` blocks them server-side pending the
     team data-layer build; see `docs/meta/REVENUE_PLAN_20K_001.md`). Adding
     them to the portal switch-list would let an existing Starter/Solo
     subscriber switch INTO a tier the product cannot yet deliver.
4. **Set proration behavior.** Stripe's default ("Create prorations") is
   correct for both directions: an upgrade mid-cycle charges the prorated
   difference immediately; a downgrade credits the prorated difference
   toward the next invoice. No code-side proration logic exists in
   Ledgerium — this behavior is entirely governed by this Dashboard setting.
5. **Set cancellation behavior.** Under **Cancellation**, choose
   **"Cancel at end of billing period"** (not "Cancel immediately"). This is
   what makes cancellation preserve the customer's paid access until the
   period they already paid for actually ends — Ledgerium's webhook handler
   only revokes access when Stripe sends `customer.subscription.deleted`
   (which Stripe fires at the actual period end under this setting, not at
   the moment the customer clicks cancel). If you choose "Cancel
   immediately" instead, access is revoked the instant the customer clicks
   cancel — that is also handled correctly by the code, it is just a
   different (and not recommended) product decision.
6. Click **Save**.
7. **Test it**: as a Starter subscriber in Test Mode, click "Manage
   Subscription" on `/account`, confirm you can switch to Solo inside the
   Portal (not just cancel), and confirm the proration line item looks
   correct on the resulting invoice.

**If you only do one thing from this entire runbook update, do this step.**
Everything else degrades gracefully (missing price IDs 503, missing webhook
events just don't fire); a missing Portal product-switch configuration fails
silently — the customer sees a working page with no way to accomplish what
they came to do.

---

## Step 4 — Set environment variables (production)

In your hosting platform (Railway / Render / Vercel / etc.), set these **environment variables**:

```env
# Stripe API keys (from Dashboard → Developers → API keys)
STRIPE_SECRET_KEY=sk_test_...           # Test Mode key (or sk_live_... for Live)
STRIPE_WEBHOOK_SECRET=whsec_...         # From Step 3, the signing secret

# Price IDs from Step 2 (all 8 required)
STRIPE_STARTER_MONTHLY_PRICE_ID=price_...
STRIPE_STARTER_ANNUAL_PRICE_ID=price_...
STRIPE_SOLO_MONTHLY_PRICE_ID=price_...
STRIPE_SOLO_ANNUAL_PRICE_ID=price_...
STRIPE_TEAM_MONTHLY_PRICE_ID=price_...
STRIPE_TEAM_ANNUAL_PRICE_ID=price_...
STRIPE_GROWTH_MONTHLY_PRICE_ID=price_...
STRIPE_GROWTH_ANNUAL_PRICE_ID=price_...

# Legacy Pro price (only if you have existing Pro subscribers)
STRIPE_PRO_PRICE_ID=price_...           # Your existing legacy price ID

# Optional: trial duration in days (defaults to 14 if unset)
STRIPE_TRIAL_DAYS=14

# Optional: monetization-shapes flags (2026-08) — both have safe shipped
# defaults; only set these if you want to override them. See
# § Promotion codes and § Stripe Tax below.
STRIPE_ALLOW_PROMOTION_CODES=true
STRIPE_AUTOMATIC_TAX_ENABLED=false

# Optional: one-time-payment placeholder SKU price ID — leave unset unless
# you specifically want to test the example placeholder. See
# § One-time payments below for how to configure a real SKU.
STRIPE_ONE_TIME_EXAMPLE_PRICE_ID=price_...

# Optional: real service SKUs (2026-08 — SKU_SPEC_001). Leave unset and
# both remain safely unpurchasable — purchase surfaces show "Not yet
# available" instead of a dead-end. See § Service SKUs below.
STRIPE_GUIDED_ONBOARDING_PRICE_ID=price_...
STRIPE_PROCESS_AUDIT_PRICE_ID=price_...
```

If you're deploying via the GitHub Actions workflow (`.github/workflows/deploy.yml`)
rather than setting env vars directly on the host, add
`STRIPE_SOLO_MONTHLY_PRICE_ID` and `STRIPE_SOLO_ANNUAL_PRICE_ID` as repository
secrets (Settings → Secrets and variables → Actions → Secrets) — the workflow
and `compose.hostinger.yaml` already reference them alongside the other tiers.

Important notes:
- **Test Mode and Live Mode have different price IDs.** When you eventually promote to Live, you'll repeat Step 2 in Live Mode and get a new set of 8 IDs — those are what go in production env vars.
- **Test Mode keys start with `sk_test_` / `whsec_`. Live Mode keys start with `sk_live_` / `whsec_` (different signing secret per mode).**
- **A missing Solo price ID degrades gracefully, not fatally.** If you skip Step 2b (or haven't deployed the env vars yet), `STRIPE_SOLO_MONTHLY_PRICE_ID` / `STRIPE_SOLO_ANNUAL_PRICE_ID` default to an empty string and `/api/billing/checkout` returns the same "Billing not configured for this plan" HTTP 503 that any other unconfigured tier returns — it does not throw at startup and does not block Starter/Team/Growth checkout.

---

## Step 5 — Test the full flow in Test Mode

### 5a. Local dev with Stripe CLI tunnel

In one terminal:

```bash
# One-time install: https://stripe.com/docs/stripe-cli
stripe login

# Forward webhook events to your local dev server
stripe listen --forward-to localhost:3000/api/billing/webhook
```

The CLI prints a webhook signing secret (different from the Dashboard one). Use **that** as your local `STRIPE_WEBHOOK_SECRET` in `apps/web-app/.env.local`.

In a second terminal:

```bash
pnpm --filter @ledgerium/web-app dev
```

### 5b. Manual end-to-end test

1. Open `http://localhost:3000/signup` → create a new test user (or sign in as an existing free-plan user)
2. Navigate to `/pricing`
3. Click **Start Trial** on Starter
4. Should redirect to Stripe Checkout
5. Use test card `4242 4242 4242 4242` with any future expiry, any CVC, any zip
6. Complete checkout
7. Should redirect back to `/account?billing=success`
8. In the `stripe listen` terminal, you should see `checkout.session.completed` and `customer.subscription.created` events arrive and return `200 OK`
9. In your local DB, verify the user's `plan` is now `'starter'` and `subscriptionStatus` is `'trialing'`
10. Visit `/account` → should show "Trial — X days remaining" (or similar)

### 5c. Test the trial→paid transition

To accelerate the trial-end:

1. Dashboard → **Customers** → find your test user
2. Open the subscription
3. Click **Update subscription** → **End trial now**
4. Should fire `customer.subscription.updated` with status `'active'`
5. Verify DB: `subscriptionStatus` should now be `'active'`

### 5d. Test other tier/interval combinations

Repeat the checkout test for:
- Starter monthly + annual
- Solo monthly + annual
- Team monthly + annual
- Growth monthly + annual

All 8 combinations should successfully create Checkout Sessions and activate trials.
Solo, like Starter, must go straight to Stripe Checkout — it must NOT hit the
Team/Growth waitlist gate (HTTP 402 `awaiting_workspace_build`).

### 5e. Test the billing portal — including plan switching (2026-08)

1. As a subscribed user, visit `/account`
2. Click **Manage subscription**
3. Should open Stripe Billing Portal
4. Verify you can: **switch between Starter and Solo** (this only works if
   you completed **Step 3b** — if you see no plan-switch option, go back and
   configure it), cancel subscription, update payment method, view invoices
5. After switching plans in the portal, confirm `customer.subscription.updated`
   fires in the `stripe listen` terminal and your local DB's `plan` field
   updates to match
6. Cancel a test subscription and confirm access is **not** revoked until the
   period ends (if you configured "Cancel at end of billing period" per
   Step 3b) — `subscriptionStatus` should show `'canceled'`-pending in the
   Stripe Dashboard (`cancel_at_period_end: true`) while your DB's `plan`
   stays on the paid tier until the actual `customer.subscription.deleted`
   event fires at period end

### 5f. Test webhook failure + hardening cases (2026-08)

1. **Missing signing secret:** unset `STRIPE_WEBHOOK_SECRET` locally and send a test event — should return HTTP 500 (Stripe retries). Confirmed via `stripe.test.ts` / `webhook/route.test.ts` (BUG-04 regression lock).
2. **Unmapped price ID:** create a one-off price in Stripe, complete checkout — handler should return HTTP 500 (Stripe retries; no silent under-provisioning). Confirmed via `webhook/route.test.ts` (BUG-01 regression lock).
3. **Duplicate delivery:** use the Stripe CLI to resend the same event twice —
   `stripe events resend <evt_id>` — and confirm the SECOND delivery logs
   `Duplicate webhook event ... already processed, skipping.` in your server
   log and does NOT create a second user/team update. This is the P0-1
   idempotency fix; automated coverage lives in `webhook/route.test.ts` under
   "P0-1: webhook delivery idempotency".
4. **SCA / 3-D Secure:** use Stripe test card `4000 0025 0000 3155`
   (requires authentication on every charge, including renewals) to trigger
   `invoice.payment_action_required`. Confirm the account page shows the
   "Payment requires verification" banner with a working "Complete payment"
   link. Automated coverage: "P0-2: invoice.payment_action_required" in
   `webhook/route.test.ts`.
5. **Disputes:** Dashboard → **Payments** → find a test charge →
   **Create test dispute** (or use `stripe trigger charge.dispute.created`
   via the CLI). Confirm `GET /api/admin/disputes` (as an allowlisted admin)
   returns the new dispute row. Automated coverage: "P1-1: charge.dispute.created
   / charge.dispute.closed" in `webhook/route.test.ts`.

---

## Step 6 — Promote to Live Mode

When Test Mode passes the full flow:

1. Toggle to **Live Mode** in Stripe Dashboard (top-right)
2. **Repeat Step 2** entirely in Live Mode — you'll create a fresh set of 5 products with 8 prices. Stripe does **not** copy products from Test → Live.
3. **Repeat Step 3** in Live Mode — point the endpoint at `https://ledgerium.ai/api/billing/webhook`, subscribe to all **9** events, and capture the Live signing secret
4. **Repeat Step 3b** in Live Mode — Customer Portal configuration (product switching, proration, cancellation timing) is **per-mode**; Test Mode settings do not carry over to Live Mode.
5. Update production environment variables (or GitHub Actions repository secrets, if deploying via `deploy.yml`) with:
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (from Live Mode endpoint)
   - 8 new `STRIPE_*_PRICE_ID` values from Live Mode (Starter × 2, Solo × 2, Team × 2, Growth × 2)
6. Deploy the updated env vars
7. Make a single $1 test purchase from a real card to verify the live path (cancel immediately after to avoid the charge) — worth doing once for Solo specifically, since it's a new checkout path

**Solo-specific live verification:** after a live Solo purchase, confirm in
your database (or the admin operations dashboard) that the purchasing user's
`plan` is `'solo'` and that **no `Team` row was created** for them. Solo is a
single-user tier and must never provision team infrastructure — this is
covered by an automated regression test
(`apps/web-app/src/app/api/billing/webhook/route.test.ts`,
"checkout.session.completed (solo plan) — no team creation attempted"), but a
one-time live-mode spot check is good practice for a new checkout path.

---

## Step 7 — Handle the legacy Pro product (optional cleanup)

If you want to stop offering Pro to new signups while keeping existing Pro subscribers paying:

1. Dashboard → **Products** → Pro → **Edit**
2. Change **Default price** to inactive (Stripe asks if you want to make existing subscriptions continue — yes)
3. New checkout sessions will not be able to select Pro (the code path doesn't reference it anyway — only the legacy `PRO_PRICE_ID` fallback uses it, which is only consumed by the webhook for existing customers)

Existing Pro customers continue paying at their current price until they cancel or you migrate them.

---

## Promotion codes

**Code status: ON by default, no Dashboard step required to ship safely.**
Every Checkout Session — subscription or one-time — now sets
`allow_promotion_codes: true` unless you explicitly turn it off. This
directly unblocks the growth motion named in
`docs/meta/REVENUE_PLAN_20K/growth_analysis.md` §1: founder-led outbound
discounts, launch offers, and **"a free, no-strings account for hands-on
review"** for third-party roundup authors (the growth analysis's exact
recommendation is to "offer a Team-tier trial explicitly for review
purposes" — a promotion code is the mechanism that makes that concretely
possible without hand-editing anyone's account). Before this pass there was
no way to discount a Checkout Session at all.

**Why ON by default is safe (this was a deliberate choice, not an
oversight):** `allow_promotion_codes: true` with **zero** promotion codes
configured in the Dashboard just shows an inert "Add promotion code" field
on the Checkout page — there is nothing to redeem, so nobody can self-
discount by guessing. It requires no Dashboard setup to ship, and it does
not change anyone's price until you create a code. Contrast with Stripe Tax
below, which is NOT safe to default on.

**To actually create a usable code:**

1. Dashboard → **Products** → **Coupons** → **+ New**
   - Set the discount (percentage or fixed amount), duration (once /
     repeating / forever), and optionally restrict to specific
     products/prices.
2. Dashboard → **Products** → **Promotion codes** → **+ New**
   - Attach it to the coupon you just created.
   - Give it a human-typeable code (e.g. `LAUNCH20`, `REVIEWER100`).
   - Optionally set a max-redemptions count, an expiration date, and a
     first-time-customer-only restriction.
3. Test in Test Mode: start a Checkout Session, click "Add promotion code,"
   enter your test-mode code, confirm the discount applies.
4. Repeat in Live Mode when ready — codes are per-mode, same as products
   and prices.

**Kill switch (optional):** set `STRIPE_ALLOW_PROMOTION_CODES=false` as an
environment variable to remove the "Add promotion code" field from every
Checkout Session entirely, without a code deploy — e.g. if you want a period
with zero possible discounting regardless of what codes exist in the
Dashboard. Unset (the default) means ON.

**For the "free Team-tier review access" use case specifically:** Team
checkout remains blocked server-side pending the workspace data-layer build
(see the "What's already built" section and `docs/meta/REVENUE_PLAN_20K_001.md`
§2) — a promotion code cannot bypass that gate, and should not; it only
discounts a checkout that is otherwise allowed to happen. Until Team is
self-serve, granting a reviewer free access is still a manual/admin-allowlist
action, not a promotion-code one. Once Team ships self-serve, a 100%-off,
single-use, expiring promotion code is the natural mechanism for this.

---

## Stripe Tax

**Code status: OFF by default. Opt-in via `STRIPE_AUTOMATIC_TAX_ENABLED=true`.
This MUST stay opt-in — do not flip it on without completing the Dashboard
steps below first.**

Unlike promotion codes, defaulting Stripe Tax to on is **not** safe:
Stripe's `automatic_tax.enabled: true` makes Checkout attempt to calculate
tax for every session, and if the Dashboard has no tax registration
covering the customer's resolved jurisdiction, **Stripe rejects the
Checkout Session outright** — a hard error at checkout-creation time, not a
graceful "no tax charged." That is why this is a separate, explicit env
flag rather than bundled into the promotion-codes default.

Ledgerium sells B2B and internationally — EU/UK VAT is real exposure once
there is material revenue outside a single domestic jurisdiction.

**What the code does when the flag is on:**

- Adds `automatic_tax: { enabled: true }` to every Checkout Session
  (subscription and one-time alike).
- Adds `billing_address_collection: 'required'` — Stripe Tax cannot
  calculate anything without knowing the customer's jurisdiction, and this
  is what actually prompts the customer for an address on the Checkout
  page.
- Adds `customer_update: { address: 'auto', name: 'auto' }` — Ledgerium
  always creates/reuses a Stripe Customer object before creating the
  session (see `getOrCreateStripeCustomer` in `checkout/route.ts`), and
  without this field Checkout will NOT persist the collected address back
  onto that Customer object, silently breaking tax calculation on every
  subsequent renewal even though the first invoice looked correct. **This
  is the exact silent-failure mode the task brief called out** — if you
  ever modify this code, keep all three fields together.

**Dashboard steps required before setting the env flag to `true`:**

1. Dashboard → **Settings** → **Tax** → enable **Stripe Tax**.
2. Register your tax origin address.
3. Register (or let Stripe monitor and prompt you to register) the specific
   jurisdictions you want to collect in — **this is the step that, if
   skipped, causes the hard checkout-creation error described above.** Do
   not enable the env flag until you have at least your home jurisdiction
   registered.
4. Decide who bears the tax registration/remittance obligation — Stripe Tax
   calculates and can report, but the legal obligation to register and
   remit in a given jurisdiction is a business/legal decision, not a
   technical one. Consult your accountant before enabling this for real
   revenue.
5. Test in Test Mode first: set `STRIPE_AUTOMATIC_TAX_ENABLED=true` locally,
   complete a Checkout Session, confirm an address prompt appears and a tax
   line item shows on the resulting invoice for a jurisdiction you've
   registered.
6. Set the `STRIPE_AUTOMATIC_TAX_ENABLED` environment variable (or the
   `STRIPE_AUTOMATIC_TAX_ENABLED` GitHub Actions repository **variable**,
   not secret — it is a plain `true`/`false` toggle) to `true` in
   production only once Test Mode confirms tax calculates correctly for at
   least one real jurisdiction.

**Recommendation (unchanged from the prior guidance):** skip enabling this
for initial launch — revenue is not yet material and most early customers
will be domestic. Revisit once MRR crosses a threshold where manual tax
handling becomes a real liability. The difference from before is that the
code path now exists and is a single env var away when you're ready — there
is no code blocker anymore, only the Dashboard registration + business
decision above.

---

## One-time payments

**Code status: capability shipped, zero real SKUs turned on.** The checkout
route now accepts `{ type: 'one_time', sku: '<key>', quantity?: number }` in
addition to the existing subscription shape, and creates a
`mode: 'payment'` Checkout Session — a single charge, not a recurring
subscription. This is a general capability, not tied to any specific
product: adding a **real** SKU later is a config change (one Stripe Price +
one map entry + one env var), not a route rewrite.

**What ships inert by default:** `apps/web-app/src/lib/stripe.ts` exports
`ONE_TIME_PRICES`, currently containing exactly one entry —
`example_onboarding_audit` — which is a **placeholder demonstrating the
capability**, not a product decision. It resolves to `null`
(`getOneTimePriceId('example_onboarding_audit')` → `null`) unless you
explicitly set `STRIPE_ONE_TIME_EXAMPLE_PRICE_ID`, which nothing does by
default. Requesting it unconfigured returns the same "Billing not
configured" HTTP 503 every other unconfigured tier/SKU returns — it
degrades safely, exactly like the subscription price IDs always have.

**What a real one-time SKU requires (to actually sell something):**

1. **A CEO product decision** on what the SKU is, what it costs, and what
   it delivers — see § Candidate SKUs below for engineering's reasoning on
   candidates, explicitly NOT a decision. Naming, pricing, and delivery
   mechanics are product calls.
2. Dashboard → **Products** → **+ Add product** → create it with
   **Pricing model: One time** (not "Recurring" — this is the one place in
   the whole setup where you pick the opposite of Steps 1-2 above).
3. Save the price ID (`price_...`).
4. Add ONE entry to `ONE_TIME_PRICES` in `apps/web-app/src/lib/stripe.ts`:
   ```ts
   export const ONE_TIME_PRICES: Record<string, string> = {
     example_onboarding_audit: process.env.STRIPE_ONE_TIME_EXAMPLE_PRICE_ID ?? '',
     your_real_sku_key: process.env.STRIPE_YOUR_REAL_SKU_PRICE_ID ?? '',
   };
   ```
5. Set the corresponding env var (production + GitHub Actions repository
   secret if deploying via `deploy.yml`).
6. Wire a purchase CTA somewhere in the product that POSTs
   `{ type: 'one_time', sku: 'your_real_sku_key' }` to
   `/api/billing/checkout` — no such CTA exists yet anywhere in the UI; this
   pass ships the backend capability only, per the task's explicit scope
   boundary (build the capability, do not invent the product).
7. Run `pnpm test` — the `admin-operations`-style drift-guard pattern used
   elsewhere in this codebase does not currently cover `ONE_TIME_PRICES`
   (there is no UI-side SKU list yet to drift against); if you add one,
   consider adding a similar guard.

**What the webhook does and does not handle (read this before enabling any
non-card payment method):**

- `checkout.session.completed` now branches on `session.mode`. For
  `mode: 'payment'`, it upserts a row into `one_time_purchases` (keyed on
  the Checkout Session id) recording the sku, Stripe payment intent id,
  amount, currency, and `payment_status` — and does **not** touch
  `User.plan`/`subscriptionStatus` or any team entitlement. A one-time
  purchase grants a purchase record, not a plan change.
- **NOT YET HANDLED:** `checkout.session.async_payment_succeeded` /
  `.async_payment_failed`. These only fire for payment methods that settle
  asynchronously (e.g. ACH/bank debits, some EU redirect methods) — every
  price this codebase can create a payment-mode session for today assumes
  card-only (synchronous) payment methods, where
  `checkout.session.completed` firing with `payment_status: 'paid'` is a
  sufficient completion signal. If you ever enable a delayed-settlement
  payment method for a one-time SKU in the Dashboard, you must add handlers
  for those two events before relying on the purchase record being
  accurate — this is a deliberate, documented scope boundary (see the doc
  comment at the top of `webhook/route.ts` and at the `mode: 'payment'`
  branch), not a silent gap. Until then, a non-`'paid'` `payment_status` is
  still recorded (honestly, not dropped) and logged with a warning, but no
  completion analytics event fires and nothing else follows up on it.
- Promotion codes and Stripe Tax (both described above) apply identically
  to one-time sessions — the config surface is shared, not
  subscription-only.

---

## Service SKUs — Guided Onboarding + Process Audit

**Code status: both real, purchasable SKUs. Inert until you create their
Stripe Products and set two env vars (below).** These are the two
candidates named in § Candidate SKUs, now built per CEO directive
(SKU_SPEC_001, 2026-08-21) — full deliverable/scope-boundary detail lives at
`docs/features/service-skus/SKU_SPEC_001.md`; this section is the
operational Dashboard/env-var setup.

### 1. Guided Onboarding — $299

Paid activation: verified install, two workflows recorded with the customer
on their real systems, first SOP/process map reviewed together, written
recommendation of what to record next. No qualification gate — anyone can
buy this, signed in or not (signed-out visitors are sent to `/signup`
first).

**Purchasable from:** `/pricing` (a dedicated offer card below the plan
grid) and `/install` (right after the Developer-mode sideload steps — this
is deliberately where the friction bites) and the account page's Services
card.

1. Dashboard → **Products** → **+ Add product**
2. **Name:** `Guided Onboarding`
3. **Description:** `Paid activation — a human gets your first two workflows recorded, on your real systems, plus your first SOP reviewed together.`
4. **Pricing model:** `One time` — **not** "Recurring".
5. **Price:** `$299.00 USD`
6. Save the price ID (`price_...`) as `STRIPE_GUIDED_ONBOARDING_PRICE_ID`.

### 2. Process Audit — $1,500

Deterministic analysis of the customer's own recorded runs — cycle-time
distribution, variance, ranked bottlenecks, variant analysis, recommended
canonical path, standardization score, documentation drift, automation ROI.
Up to 3 processes, minimum 5 recorded runs each, one revision, 10-business-
day turnaround.

**Hard qualification gate — enforced server-side, not just a disabled
button:** `POST /api/billing/checkout { type: 'one_time', sku: 'process_audit' }`
returns **HTTP 403, `code: 'audit_not_eligible'`** unless the purchasing
user has at least one recorded process with 5+ runs
(`MIN_RECORDED_RUNS_FOR_AUDIT` in `lib/service-skus.ts`). Below 5 runs,
variance and variant figures are not statistically meaningful — selling an
audit that cannot be meaningfully produced is a refund and a bad review, so
this is enforced, not merely warned about. The same query
(`getAuditEligibility`, `lib/audit-eligibility.ts`) backs both the
enforcement AND the eligibility display, so the UI can never promise a
purchase checkout would then reject.

**Purchasable from:** the account page's Services card **only** — this is
deliberate. The public `/pricing` and `/install` pages don't know a
visitor's recording history, so advertising a data-gated SKU there would
mean either lying about eligibility or adding friction to check it before
the visitor has even signed up. The account page already has the
authenticated context to show real per-process progress ("3 of 5 runs
recorded for Invoice Approval") and gate the button honestly.

1. Dashboard → **Products** → **+ Add product**
2. **Name:** `Process Audit`
3. **Description:** `Deterministic analysis of your own recorded runs — cycle time, variance, bottlenecks, variants, standardization, documentation drift, automation ROI. Up to 3 processes, 5+ runs each required.`
4. **Pricing model:** `One time`
5. **Price:** `$1,500.00 USD`
6. Save the price ID (`price_...`) as `STRIPE_PROCESS_AUDIT_PRICE_ID`.

### Env vars (add to Step 4's block, or set directly)

```env
STRIPE_GUIDED_ONBOARDING_PRICE_ID=price_...
STRIPE_PROCESS_AUDIT_PRICE_ID=price_...
```

Same degrade pattern as every other price ID in this runbook: unset →
`getOneTimePriceId()` returns `null` → checkout returns the standard
"Billing not configured for this SKU" HTTP 503 → the purchase surfaces
(`/pricing`, `/install`, the account Services card) check
`GET /api/billing/sku-availability` on load and render an honest "Not yet
available for purchase" state instead of a button that would dead-end.

### Changing the prices

Both prices are coordinator proposals (SKU_SPEC_001), not final CEO
decisions, and are deliberately the easiest numbers in the codebase to
change: `price` on the `guided_onboarding` / `process_audit` entries in
`apps/web-app/src/lib/service-skus.ts`. That number is **display copy
only** — changing it does not change what Stripe charges. To actually
change the charge amount: create a new Stripe Price at the new figure
(Stripe Prices are immutable once created — you cannot edit an existing
one), update the `STRIPE_..._PRICE_ID` env var to the new Price id, and
update `service-skus.ts` to match so the marketing copy and the actual
charge agree.

### Post-purchase experience

Both SKUs redirect to a dedicated confirmation page —
`/account/purchase-success?session_id={CHECKOUT_SESSION_ID}&sku=<key>` —
**not** the generic `/account?billing=success` the subscription flow uses
(that success URL is untouched). The page fetches the persisted
`OneTimePurchase` row (`GET /api/billing/one-time-purchase`) and shows what
the customer bought, the deliverable list, and the fulfilment timing from
`service-skus.ts`. Because the webhook that writes the row runs
asynchronously relative to the Checkout redirect, the page polls briefly
(up to 5 attempts, 1.5s apart) before falling back to an honest "still
processing, email us if this doesn't update" state — it never claims a
purchase completed before the webhook has actually confirmed it.

### Fulfilment

Both SKUs are delivered by a human — there is no automated fulfilment path
in code, matching SKU_SPEC_001's explicit design (Guided Onboarding's value
is "someone competent watches them do it once"; Process Audit's value is
traceable analysis plus a walkthrough). `docs/features/service-skus/
SKU_SPEC_001.md` § "Decisions required from the CEO" still has an open
question on who owns fulfilment operationally — resolve that before selling
these for real.

---

## Candidate SKUs (engineering reasoning, not a decision)

This is **not** a product decision — it is engineering surfacing what the
new capability makes cheap to ship, so the CEO can decide. Two candidates,
both explicitly grounded in the customer's own recorded process data (not
a generic asset), consistent with what already differentiates Ledgerium
from a template library:

1. **Onboarding / setup service** — a paid, one-time engagement where
   Ledgerium (a human, or eventually a guided in-product flow) helps a new
   customer get their first real workflows recorded and their process
   library configured correctly. The deliverable is applying the product
   to the customer's actual process, not a pre-made asset.
2. **One-off process audit** — a paid, one-time deliverable built FROM a
   customer's already-recorded workflow data (bottleneck analysis,
   automation scoring, variant detection run against their real captured
   evidence) — i.e. the exact intelligence-layer capability Solo/Team
   already sell, packaged as a single deliverable instead of a
   subscription, for a buyer not ready to commit to a recurring plan.

**Explicitly flagged, per `docs/meta/REVENUE_PLAN_20K/pm_analysis.md` §6.3:**
that review found that **template-pack SKUs — selling generic, pre-built
SOP/process templates — directly contradict Ledgerium's own competitive
differentiation.** The product's entire positioning is that it measures
*your actual, observed process* rather than offering a generic template
library (a category multiple competitors already occupy). The `pm_analysis.md`
finding states plainly that template packs are "not-inferred, not-generic" —
selling generic templates undermines the exact claim that makes Ledgerium
different. **Engineering is not proposing template packs as a candidate SKU
for this reason, and recommends the CEO not pursue them regardless of how
cheap the one-time-payment capability makes them to ship.** Both candidates
above were chosen specifically because they stay evidence-linked to the
customer's own data rather than reintroducing a generic-asset SKU through
the back door.

---

## Disputes — what the code does and does not do

`charge.dispute.created` / `charge.dispute.closed` are now handled (Step 3,
event list). What this means in practice:

- **Recorded**: every dispute is written to the `stripe_disputes` table with
  the charge ID, disputed amount/currency/reason/status, and (best-effort)
  the owning user or team.
- **Visible to admins**: `GET /api/admin/disputes` (allowlisted admins only,
  same gate as the rest of `/api/admin/*`) returns the full list, most
  recent first. There is currently no dedicated UI panel consuming this
  endpoint — that is a reasonable near-term follow-up, not done here.
- **Does NOT change the customer's plan or access.** A dispute is a claim,
  not an adjudicated outcome — Ledgerium does not suspend or downgrade an
  account merely because a chargeback was filed. If you want to manually
  suspend an account pending dispute resolution, do it via the admin
  operations dashboard's existing user-management actions; there is no
  automatic linkage.
- **You still respond to disputes in the Stripe Dashboard**, same as
  before — Dashboard → **Payments** → **Disputes** is where you submit
  evidence within Stripe's response window. Ledgerium's dispute table is a
  read-only mirror for internal visibility, not a replacement for Stripe's
  own dispute-response workflow.

---

## Troubleshooting

### "Billing not configured for this plan" (HTTP 503)

The checkout route returned this because `getPriceId(plan, interval)` resolved to `null`. Causes:
- The corresponding `STRIPE_*_PRICE_ID` env var is unset in production
- The env var is set to an empty string

Fix: verify all 6 price IDs are set in production env. Redeploy after setting.

### "Webhook signature verification failed" (HTTP 400)

The signature header doesn't match what `STRIPE_WEBHOOK_SECRET` validates. Causes:
- `STRIPE_WEBHOOK_SECRET` in production is the Test Mode secret (or vice versa)
- The endpoint URL in the Dashboard webhook doesn't match the request URL (Stripe signs against the configured URL)

Fix: ensure your production env var matches the Live signing secret for the Live Mode endpoint.

### "Webhook handler error for checkout.session.completed: unmapped price ID" (HTTP 500)

The webhook is firing but the price ID isn't in the `STRIPE_PRICE_TO_PLAN` map. Causes:
- A new price was added in Stripe but the corresponding env var wasn't set in production
- Someone purchased via a one-off price (not in your product catalog)

Fix: identify the price ID from the error logs, add the corresponding env var or update the price-to-plan logic if it's a legitimate new SKU. Stripe is retrying this webhook — fix and the retry will succeed.

### Trial not appearing on Checkout page

- Confirm the user is a first-time subscriber (`stripeSubscriptionId` is null AND `subscriptionStatus === 'none'`). Returning subscribers don't get a re-trial.
- Confirm `STRIPE_TRIAL_DAYS` is either unset (defaults to 14) or set to a positive integer.

### "This account has admin-granted unlimited access" (HTTP 400)

The user is on the admin allowlist in `apps/web-app/src/lib/admin-allowlist.ts`. Their account intentionally bypasses Stripe — no checkout is needed. Remove from the allowlist if they should be billed.

### "You already have an active subscription" (HTTP 400, code=already_subscribed) for a mid-trial or past_due user

**This is intentional as of the 2026-08 billing hardening pass**, not a bug.
Previously this gate only fired for `subscriptionStatus === 'active'`,
which let a mid-trial (`'trialing'`) or `'past_due'` subscriber start a
*second, separate* Checkout Session — Stripe would then be actively billing
two parallel subscriptions for the same customer. The gate now also blocks
`'trialing'` and `'past_due'`. If a user genuinely needs to change plans
while in this state, direct them to **Manage Subscription** (the Billing
Portal) — see Step 3b for why that requires its own Dashboard configuration.
`'canceled'` and `'none'` are NOT blocked — reactivation after cancellation
still works via a fresh Checkout Session.

### A duplicate Stripe webhook delivery didn't get skipped / caused a double-write

Should not happen post-2026-08 hardening. If you observe it: check whether
`webhook_events` rows are being deleted or the table is missing entirely
(e.g. a migration was skipped) — the idempotency claim depends on this
table's PRIMARY KEY uniqueness constraint. Run `pnpm prisma migrate status`
(or check your deployment's migration log) to confirm
`20260820000000_add_billing_hardening` applied.

### "Billing not configured for this SKU" (HTTP 503) on a one-time purchase

The checkout route returned this because `getOneTimePriceId(sku)` resolved
to `null`. Causes:
- The `sku` key isn't in `ONE_TIME_PRICES` (`apps/web-app/src/lib/stripe.ts`)
  at all — check for a typo.
- The key exists but its corresponding env var (e.g.
  `STRIPE_ONE_TIME_EXAMPLE_PRICE_ID`) is unset or empty. This is the
  **expected, shipped default** for the placeholder `example_onboarding_audit`
  key — it is intentionally inert until you configure a real SKU. See
  § One-time payments above.

### "audit_not_eligible" (HTTP 403) on a Process Audit purchase attempt

Working as intended — the checkout route returned this because
`getAuditEligibility(userId)` found zero of the user's processes with 5+
recorded runs (`MIN_RECORDED_RUNS_FOR_AUDIT`, `lib/service-skus.ts`). This
is the SKU_SPEC_001 §2 hard qualification gate, enforced server-side.
Nothing to fix — direct the customer to record more runs of the same
process (the account page's Services card shows their closest process and
how many more runs it needs), or wait until they naturally qualify.

### Checkout Session creation fails outright (not a 503, an actual Stripe API error) after enabling Stripe Tax

You set `STRIPE_AUTOMATIC_TAX_ENABLED=true` without completing the Dashboard
registration steps in § Stripe Tax above. Stripe rejects sessions where it
cannot resolve a tax jurisdiction it has no registration for. Fix: register
at least your home jurisdiction in Dashboard → Settings → Tax, or set the
env var back to `false`/unset until you have.

### A customer says their card was declined for "needs authentication" and nothing happened

They hit the SCA/3-D-Secure path. Confirm `invoice.payment_action_required`
is subscribed in your webhook endpoint (Step 3) — if it is not, the
customer's `/account` page will never show the "Complete payment" banner and
they have no way to resolve it themselves; their subscription will
eventually cancel via the normal `invoice.payment_failed` → dunning →
`customer.subscription.deleted` path with no clear signal why.

### Upgrade/downgrade buttons open the Billing Portal but there's nothing to click

You skipped **Step 3b**. This is not a code bug — see that section.

---

## What changed in iter 066 code (for reference)

| File | Change |
|---|---|
| `apps/web-app/src/lib/stripe.ts` | Added `TRIAL_PERIOD_DAYS` constant (env-configurable, default 14) |
| `apps/web-app/src/app/api/billing/checkout/route.ts` | Added trial eligibility check (first-time subscribers only) + `subscription_data.trial_period_days` in Checkout Session |
| `apps/web-app/src/app/api/billing/checkout/route.test.ts` | NEW — 8-combo tier/interval matrix + trial eligibility scenarios |
| `apps/web-app/src/app/(public)/pricing/page.tsx` | Updated FAQ entry on free-trial to mention 14-day trial on paid tiers |
| `apps/web-app/prisma/schema.prisma` | Fixed stale `// free, pro, team` comment on `plan` field |

No Prisma migration required — schema field is unchanged, only the comment.

---

## What changed in the 2026-08 billing hardening pass (for reference)

CEO directive: *"Get Stripe working across all possible monetized use
cases."* Full detail in the iteration's change log; summary here.

**Code changes:**

| File | Change |
|---|---|
| `apps/web-app/prisma/schema.prisma` + `prisma/migrations/20260820000000_add_billing_hardening/` | NEW additive migration: `webhook_events` table (idempotency ledger), `stripe_disputes` table, `users.pending_invoice_url` + `teams.pending_invoice_url` (SCA link), `users.last_subscription_event_at` + `teams.last_subscription_event_at` (out-of-order guard) |
| `apps/web-app/src/app/api/billing/webhook/route.ts` | Idempotency claim/release around every event; out-of-order staleness guard on `customer.subscription.updated`/`.deleted`; NEW `invoice.payment_action_required` handler (SCA); NEW `charge.dispute.created` / `charge.dispute.closed` handlers |
| `apps/web-app/src/app/api/billing/checkout/route.ts` | Already-subscribed gate now also blocks `'trialing'` / `'past_due'` (was `'active'`-only) — closes a double-subscription gap |
| `apps/web-app/src/app/api/account/route.ts` | Response now includes `pendingInvoiceUrl` |
| `apps/web-app/src/app/(app)/account/page.tsx` | NEW "Payment requires verification" banner with a direct "Complete payment" link when `pendingInvoiceUrl` is set |
| `apps/web-app/src/app/api/admin/disputes/route.ts` | NEW admin-only endpoint listing recorded disputes |
| `apps/web-app/src/lib/workspace/team-billing.ts` | `resolveTeamFromCustomer` return type extended with `lastSubscriptionEventAt` |

**Dashboard/operational changes required (yours, not code):**

- Subscribe the webhook endpoint to 3 additional events (Step 3): `invoice.payment_action_required`, `charge.dispute.created`, `charge.dispute.closed`
- Configure the Customer Portal's product-switching, proration, and cancellation-timing settings (Step 3b) — **required** for upgrade/downgrade to function at all, in both Test and Live Mode separately
- Decide on Stripe Tax (optional, see § above)

**Scoped out, with reasoning (not silently skipped):**

- **Out-of-order guard is NOT applied to `invoice.payment_failed` /
  `invoice.payment_succeeded` / `invoice.payment_action_required`.** Those
  events each write a single, narrower field (`subscriptionStatus` alone, or
  `pendingInvoiceUrl` alone) that self-corrects on the next successful
  billing cycle; only `customer.subscription.updated` and
  `customer.subscription.deleted` can silently overwrite a broader snapshot
  of plan/status state, so only those two carry the guard.
- **No dedicated admin UI panel for disputes** — the API
  (`GET /api/admin/disputes`) is built and tested; wiring it into the
  existing Operations Dashboard is a natural, small follow-up.
- **No proration logic in code** — entirely delegated to the Stripe
  Dashboard Customer Portal configuration (Step 3b), which is the correct
  place for it (Stripe computes proration server-side based on the
  Portal's configured behavior; duplicating that logic in application code
  would be redundant and could drift from what Stripe actually charges).

---

## What changed in the 2026-08 monetization-shapes hardening pass (for reference)

CEO directive: *"Get creative and setup stripe for all monetized use cases.
Get the different online product sales working."* Full detail in the
iteration's change log; summary here.

**Code changes:**

| File | Change |
|---|---|
| `apps/web-app/src/lib/stripe.ts` | NEW `ALLOW_PROMOTION_CODES` (env `STRIPE_ALLOW_PROMOTION_CODES`, default true) + `AUTOMATIC_TAX_ENABLED` (env `STRIPE_AUTOMATIC_TAX_ENABLED`, default false) + `ONE_TIME_PRICES` map / `getOneTimePriceId()` (one placeholder SKU, inert by default) |
| `apps/web-app/src/app/api/billing/checkout/route.ts` | `allow_promotion_codes` + `automatic_tax`/`billing_address_collection`/`customer_update` wired onto every session via a shared `buildSharedSessionParams()`; existing customer-resolution logic extracted into `getOrCreateStripeCustomer()`; NEW `type: 'one_time'` request shape creating a `mode: 'payment'` session via `createOneTimeCheckoutSession()`, fully independent of the subscription-only gates (workspace-build waitlist, already-subscribed, trial eligibility) |
| `apps/web-app/src/app/api/billing/webhook/route.ts` | `checkout.session.completed` now branches on `session.mode`; the `mode: 'payment'` branch upserts `one_time_purchases` and emits `one_time_purchase_completed` analytics, touching no plan/entitlement field; `mode: 'subscription'` (and every session with `mode` omitted, matching every pre-existing test) is byte-identical to before |
| `apps/web-app/prisma/schema.prisma` + `prisma/migrations/20260821000000_add_one_time_purchases/` | NEW additive migration: `one_time_purchases` table (natural-keyed on the Stripe Checkout Session id, same pattern as `webhook_events`/`stripe_disputes`) |
| `.github/workflows/deploy.yml` + `compose.hostinger.yaml` | NEW env vars `STRIPE_ALLOW_PROMOTION_CODES` (default `true`), `STRIPE_AUTOMATIC_TAX_ENABLED` (default `false`), `STRIPE_ONE_TIME_EXAMPLE_PRICE_ID` (default unset/empty) |

**Dashboard/operational changes required (yours, not code):**

- Nothing required to ship promotion codes at all — the flag defaults ON
  and is safe with zero Dashboard configuration. Create actual coupons /
  promotion codes only when you want to run a real discount (§ Promotion
  codes above).
- Nothing required for one-time payments to remain safely inert. Creating a
  real SKU requires a Dashboard product + price (§ One-time payments above)
  and is explicitly a follow-up CEO decision, not done in this pass.
- Stripe Tax requires Dashboard registration BEFORE you set
  `STRIPE_AUTOMATIC_TAX_ENABLED=true` — see § Stripe Tax above. Recommended
  to leave off until MRR is material, same guidance as before this pass,
  now backed by real code instead of "not yet built."

**Scoped out, with reasoning (not silently skipped):**

- **No real one-time SKU is turned on.** The task brief explicitly drew this
  boundary — build the capability, not the product. `example_onboarding_audit`
  is a demonstration placeholder only.
- **No purchase CTA/UI exists for one-time payments anywhere in the
  product.** Backend-only capability; a future iteration wires a button
  somewhere once a real SKU is decided.
- **`checkout.session.async_payment_succeeded` / `.async_payment_failed` are
  NOT subscribed or handled.** Every price this pass can create a
  payment-mode session for assumes card-only (synchronous) settlement. See
  § One-time payments above — this is the codebase's explicit "what's not
  yet handled" boundary for delayed-settlement payment methods, not a
  silent gap.
- **No admin-visible UI for `one_time_purchases`** (parallel to the
  existing disputes-table gap) — the table is built and the webhook writes
  to it; a reporting surface is a natural, small follow-up once a real SKU
  exists to report on.

---

## What to do AFTER you finish this runbook

Once you've completed Steps 1-6 and the test flow passes:

1. Tell the coordinator (me) and I'll close iter 066.
2. Decide whether iter 067 picks up the originally-planned WDC2-P03 time-range default change, OR continues Stripe operational hardening (e.g., `invoice.payment_succeeded` + `customer.subscription.trial_will_end` webhook handlers + receipt emails).
3. Consider a follow-up iteration for **PRICING_CONFIG verification** (cleanup of stale env var names like `STRIPE_STARTER_PRICE_ID` in `config.ts` which don't match the new naming — code currently uses `lib/stripe.ts` `getPriceId()` correctly so this is cosmetic, but worth tidying).

**2026-08 billing hardening pass — what to do next:**

1. Subscribe your webhook endpoint (Test AND Live) to the 3 new events and complete Step 3b's Customer Portal configuration — both are required before this pass is operationally complete, not just code-complete.
2. Run a real duplicate-delivery test (`stripe events resend`) and a real SCA test (card `4000 0025 0000 3155`) at least once in Test Mode — the automated test suite proves the logic; a live Stripe round-trip proves the Dashboard configuration matches what the code expects.
3. Consider a follow-up iteration to wire `GET /api/admin/disputes` into the Operations Dashboard UI (currently API-only).
4. Team/Growth checkout remains intentionally blocked — do not configure the Customer Portal to allow switching into those tiers until the team data-layer work lands (`docs/meta/REVENUE_PLAN_20K_001.md`).
