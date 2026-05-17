# Stripe Setup Runbook — 4-Tier Pricing + 14-Day Trial

**Audience:** Ledgerium AI billing operator (you).  
**Goal:** Create the 3 new paid products (Starter / Team / Growth) with monthly + annual prices, preserve the existing legacy Pro product, configure the webhook endpoint, and ship 14-day free trials.  
**Time:** ~30 minutes in Test Mode, ~15 minutes to promote to Live Mode.

> Before you start: do the entire setup in **Test Mode first** (top-right toggle in Stripe Dashboard reads "Test mode"). Test the full checkout flow with card `4242 4242 4242 4242`. Only after a successful end-to-end test in Test Mode, repeat the steps in Live Mode.

---

## What's already built in code

Everything except the Stripe Dashboard configuration and production env vars:

- ✅ `apps/web-app/src/lib/stripe.ts` — Stripe SDK + 6 price-ID env vars wired
- ✅ `apps/web-app/src/lib/plans.ts` — Free / Starter / Team / Growth / Enterprise plan map
- ✅ `apps/web-app/src/app/api/billing/checkout/route.ts` — Checkout Session creation with 14-day trial for first-time subscribers (iter 066)
- ✅ `apps/web-app/src/app/api/billing/webhook/route.ts` — 6-event webhook handler (4 required + `invoice.payment_succeeded` + `customer.subscription.trial_will_end` added in iter 068)
- ✅ `apps/web-app/src/app/api/billing/portal/route.ts` — Billing Portal for subscription management
- ✅ `apps/web-app/src/app/(public)/pricing/page.tsx` — 5-column comparison table with $49/$249/$799 + 17% annual savings
- ✅ Legacy `PRO_PRICE_ID` fallback — your existing Pro customers continue working without disruption

---

## Step 1 — Preserve the legacy Pro product

**DO NOT delete or archive your existing Pro product/price.** Any current subscriber pays via that price ID; archiving would silently break their renewals.

Action:
1. Dashboard → **Products** → find your existing "Pro" product
2. Leave it active. Do not touch it.
3. Confirm its price ID is still set in production as `STRIPE_PRO_PRICE_ID` (this powers the code's legacy fallback in `planFromPriceId` which maps it to `'starter'`).

If you have zero active Pro subscribers and want a clean slate, you may **archive** (not delete) the Pro product. Archiving prevents new sign-ups but preserves billing for any active subscription. Recommended: leave it active for safety.

---

## Step 2 — Create 3 new products with monthly + annual prices

For each of Starter, Team, Growth — do the following in Test Mode:

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

### 2b. Team

1. Dashboard → **Products** → **+ Add product**
2. **Name:** `Team`
3. **Description:** `For process improvement teams — unlimited recordings, full process intelligence (bottlenecks, variants, automation scoring), 3 recorders + 5 viewer seats, 14-day free trial.`
4. Add monthly price: `$249.00 USD` / `Monthly` → save as `STRIPE_TEAM_MONTHLY_PRICE_ID`
5. Add annual price: `$2,490.00 USD` / `Yearly` → save as `STRIPE_TEAM_ANNUAL_PRICE_ID`

### 2c. Growth

1. Dashboard → **Products** → **+ Add product**
2. **Name:** `Growth`
3. **Description:** `For AI implementation leads — everything in Team + advanced analytics, cross-workflow comparison, AI agent composition, integration risk assessment. 10 recorders + 15 seats. 14-day free trial.`
4. Add monthly price: `$799.00 USD` / `Monthly` → save as `STRIPE_GROWTH_MONTHLY_PRICE_ID`
5. Add annual price: `$7,990.00 USD` / `Yearly` → save as `STRIPE_GROWTH_ANNUAL_PRICE_ID`

You should now have **6 new price IDs** captured. Keep them somewhere safe — you'll paste them into environment variables in Step 4.

### Sanity check

Your Products list should now show **at least 4 products**: Pro (legacy, untouched), Starter, Team, Growth. (Enterprise is "Contact Sales" — handled by you separately later, no Stripe product needed.)

---

## Step 3 — Configure the webhook endpoint

1. Dashboard → **Developers** → **Webhooks** → **+ Add endpoint**
2. **Endpoint URL:**
   - Test Mode: `https://your-staging-domain.example/api/billing/webhook` OR a tunneled localhost URL from `stripe listen` (see Step 5)
   - Live Mode: `https://ledgerium.ai/api/billing/webhook`
3. **Description:** `Ledgerium AI subscription events`
4. **API version:** Latest (default is fine)
5. **Select events to send** — check these 6 (4 required + 2 recommended):

   **Required (4):**
   - ✅ `checkout.session.completed` — fires when user completes checkout
   - ✅ `customer.subscription.updated` — fires on plan changes, trial→paid conversion, status changes
   - ✅ `customer.subscription.deleted` — fires when user cancels
   - ✅ `invoice.payment_failed` — fires when card declines on renewal

   **Recommended — handled as of iter 068 (subscribe to these too):**
   - ✅ `invoice.payment_succeeded` — fires on every successful charge (initial + renewals); handler confirms `subscriptionStatus: 'active'` and emits `payment_succeeded` analytics. No email dispatch yet — receipt emails are a future iteration.
   - ✅ `customer.subscription.trial_will_end` — fires 3 days before trial expires; handler emits `trial_will_end` analytics with `trialEndAt` timestamp and resolved plan. No email dispatch yet — proactive reminder emails are a future iteration.

6. Click **Add endpoint**
7. On the endpoint detail page, click **Reveal** under "Signing secret"
8. Copy the value — starts with `whsec_...` — this is your `STRIPE_WEBHOOK_SECRET`

---

## Step 4 — Set environment variables (production)

In your hosting platform (Railway / Render / Vercel / etc.), set these **environment variables**:

```env
# Stripe API keys (from Dashboard → Developers → API keys)
STRIPE_SECRET_KEY=sk_test_...           # Test Mode key (or sk_live_... for Live)
STRIPE_WEBHOOK_SECRET=whsec_...         # From Step 3, the signing secret

# Price IDs from Step 2 (all 6 required)
STRIPE_STARTER_MONTHLY_PRICE_ID=price_...
STRIPE_STARTER_ANNUAL_PRICE_ID=price_...
STRIPE_TEAM_MONTHLY_PRICE_ID=price_...
STRIPE_TEAM_ANNUAL_PRICE_ID=price_...
STRIPE_GROWTH_MONTHLY_PRICE_ID=price_...
STRIPE_GROWTH_ANNUAL_PRICE_ID=price_...

# Legacy Pro price (only if you have existing Pro subscribers)
STRIPE_PRO_PRICE_ID=price_...           # Your existing legacy price ID

# Optional: trial duration in days (defaults to 14 if unset)
STRIPE_TRIAL_DAYS=14
```

Important notes:
- **Test Mode and Live Mode have different price IDs.** When you eventually promote to Live, you'll repeat Step 2 in Live Mode and get a new set of 6 IDs — those are what go in production env vars.
- **Test Mode keys start with `sk_test_` / `whsec_`. Live Mode keys start with `sk_live_` / `whsec_` (different signing secret per mode).**

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
- Team monthly + annual
- Growth monthly + annual

All 6 combinations should successfully create Checkout Sessions and activate trials.

### 5e. Test the billing portal

1. As a subscribed user, visit `/account`
2. Click **Manage subscription** (or whatever the existing button copy reads)
3. Should open Stripe Billing Portal
4. Verify you can: change plan, cancel subscription, update payment method, view invoices

### 5f. Test webhook failure cases

1. **Missing signing secret:** unset `STRIPE_WEBHOOK_SECRET` locally and send a test event — should return HTTP 500 (Stripe retries). Confirmed via `stripe.test.ts`.
2. **Unmapped price ID:** create a one-off price in Stripe, complete checkout — handler should return HTTP 500 (Stripe retries; no silent under-provisioning).

---

## Step 6 — Promote to Live Mode

When Test Mode passes the full flow:

1. Toggle to **Live Mode** in Stripe Dashboard (top-right)
2. **Repeat Step 2** entirely in Live Mode — you'll create a fresh set of 4 products with 6 prices. Stripe does **not** copy products from Test → Live.
3. **Repeat Step 3** in Live Mode — point the endpoint at `https://ledgerium.ai/api/billing/webhook` and capture the Live signing secret
4. Update production environment variables (Railway/Render/Vercel) with:
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (from Live Mode endpoint)
   - 6 new `STRIPE_*_PRICE_ID` values from Live Mode
5. Deploy the updated env vars
6. Make a single $1 test purchase from a real card to verify the live path (cancel immediately after to avoid the charge)

---

## Step 7 — Handle the legacy Pro product (optional cleanup)

If you want to stop offering Pro to new signups while keeping existing Pro subscribers paying:

1. Dashboard → **Products** → Pro → **Edit**
2. Change **Default price** to inactive (Stripe asks if you want to make existing subscriptions continue — yes)
3. New checkout sessions will not be able to select Pro (the code path doesn't reference it anyway — only the legacy `PRO_PRICE_ID` fallback uses it, which is only consumed by the webhook for existing customers)

Existing Pro customers continue paying at their current price until they cancel or you migrate them.

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

## What to do AFTER you finish this runbook

Once you've completed Steps 1-6 and the test flow passes:

1. Tell the coordinator (me) and I'll close iter 066.
2. Decide whether iter 067 picks up the originally-planned WDC2-P03 time-range default change, OR continues Stripe operational hardening (e.g., `invoice.payment_succeeded` + `customer.subscription.trial_will_end` webhook handlers + receipt emails).
3. Consider a follow-up iteration for **PRICING_CONFIG verification** (cleanup of stale env var names like `STRIPE_STARTER_PRICE_ID` in `config.ts` which don't match the new naming — code currently uses `lib/stripe.ts` `getPriceId()` correctly so this is cosmetic, but worth tidying).
