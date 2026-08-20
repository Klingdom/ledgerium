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

- ✅ `apps/web-app/src/lib/stripe.ts` — Stripe SDK + 8 price-ID env vars wired (Solo added)
- ✅ `apps/web-app/src/lib/plans.ts` — Free / Starter / Solo / Team / Growth / Enterprise plan map
- ✅ `apps/web-app/src/app/api/billing/checkout/route.ts` — Checkout Session creation with 14-day trial for first-time subscribers (iter 066); blocks a second parallel Checkout Session for any subscriber with an open (active/trialing/past_due) subscription (2026-08 hardening)
- ✅ `apps/web-app/src/app/api/billing/webhook/route.ts` — **9-event** webhook handler with delivery idempotency and out-of-order delivery protection (2026-08 hardening — see § below)
- ✅ `apps/web-app/src/app/api/billing/portal/route.ts` — Billing Portal for subscription management
- ✅ `apps/web-app/src/app/api/admin/disputes/route.ts` — admin-only list of recorded chargeback disputes (2026-08 hardening)
- ✅ `apps/web-app/src/app/(app)/account/page.tsx` — Plan & Billing card, now including an SCA "Complete payment" banner when Stripe needs the customer to re-authenticate (2026-08 hardening)
- ✅ `apps/web-app/src/app/(public)/pricing/page.tsx` — 5-column comparison table with $49/$249/$799 + 17% annual savings
- ✅ Legacy `PRO_PRICE_ID` fallback — your existing Pro customers continue working without disruption

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

## Stripe Tax — is it needed?

**Not required to ship, but recommended once you have customers outside a
single tax jurisdiction.** Ledgerium's code does **not** compute or remit
tax anywhere — `checkout/route.ts` creates a plain subscription Checkout
Session with no `automatic_tax` block, and `Step 2`'s "Tax behavior:
Inclusive" setting only controls whether the sticker price you enter already
includes tax, not whether tax is calculated at all.

If you want Stripe to calculate and (optionally) remit sales tax / VAT per
customer:

1. Dashboard → **Settings** → **Tax** → enable **Stripe Tax**
2. Register your tax origin address and the jurisdictions you want Stripe to
   monitor
3. This is a Dashboard-only setting — Stripe automatically applies it to
   Checkout Sessions once enabled; **no code change is required** on
   Ledgerium's side for Stripe Tax to start calculating tax on new Checkout
   Sessions.
4. Decide who bears the tax registration/remittance obligation (Stripe Tax
   calculates and can report, but registering to collect in a given
   jurisdiction and actually remitting is a business/legal decision, not a
   Stripe or Ledgerium technical one) — consult your accountant before
   flipping this on for real revenue.

**Recommendation:** skip this for initial launch (Solo tier is new, revenue
is not yet material, and most early customers will be domestic). Revisit
once MRR crosses a threshold where manual tax handling becomes a real
liability — this is a business decision, not a code blocker.

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
