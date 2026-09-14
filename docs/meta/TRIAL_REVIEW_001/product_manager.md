# Trial → Paid Conversion Audit — Product Manager

**Date:** 2026-09 · **Scope:** free-trial → paid-subscription conversion path, code-level trace only. No files modified.

**Method:** read-only trace of `apps/web-app/src/app/(public)/pricing/`, `apps/web-app/src/components/PricingCards.tsx`, `UpgradeButton.tsx`, `apps/web-app/src/app/(public)/signup/`, `apps/web-app/src/app/api/billing/checkout/route.ts`, `apps/web-app/src/app/api/billing/webhook/route.ts`, `apps/web-app/src/app/(app)/account/page.tsx`, `apps/web-app/src/app/(app)/dashboard/page.tsx`, `apps/web-app/prisma/schema.prisma`, `apps/web-app/src/lib/email.ts` / `notifications.ts`.

---

## 1. The trial path as it actually exists

### Step-by-step, unauthenticated visitor (the realistic case — traffic is ~25 search clicks/quarter, essentially 100% new visitors)

1. Visitor lands on `/pricing`. Starter card CTA reads **"Start 14-Day Trial"** (`apps/web-app/src/lib/config.ts:82`), linking to `ctaHref: '/signup?plan=starter'` (`config.ts:83`). Solo is identical (`config.ts:121-122`).
2. `PricingCards.tsx:187-252` renders this as a `<Link href={plan.ctaHref}>` **only when the visitor has no session** — `UpgradeButton.tsx:36-42` returns a plain `<Link href={fallbackHref}>` (`fallbackHref` = `plan.ctaHref`) whenever `session?.user` is falsy. Click 1 → `/signup?plan=starter`.
3. `apps/web-app/src/app/(public)/signup/page.tsx` is a server component that renders `<SignupPageClient />` with **no read of `searchParams` at all** (page.tsx:15-17). `SignupPageClient.tsx` (the actual form) never references a `plan` query parameter anywhere in its 223 lines. The visitor fills email/password, clicks "Create Account" (click 2), account is created via `POST /api/auth/signup`, the user is auto-signed-in, and `SignupPageClient.tsx:80-81` does an unconditional `router.push('/dashboard')`.
4. **Result: the `plan=starter` intent is silently dropped.** The visitor who explicitly clicked "Start 14-Day Trial" is now a Free-plan user sitting on `/dashboard`, with zero record anywhere (client state, URL, DB, cookie) that they wanted Starter.
5. To actually reach Stripe, this user must independently navigate back to `/pricing` or `/account` (click 3), locate the same upgrade control a second time, and click it again (click 4) — this time as an authenticated user, which finally triggers `UpgradeButton.tsx:44-64`'s `POST /api/billing/checkout` → `window.location.href = data.url` → Stripe-hosted Checkout (click/steps 5+, card entry on Stripe's page).

**There is no code path that carries trial intent from the pricing page through signup to checkout.** The only way `/api/billing/checkout` gets called is a live click on `UpgradeButton` from an already-authenticated session — from `/pricing`, `/account`, or the dashboard upsell callout (`account/page.tsx:679-692`, which only appears once the user is already on `/account`).

### Step-by-step, already-authenticated visitor (rare — returning user, or one who self-recovers per above)

1. Click `UpgradeButton` (pricing card, account `PlanCard`, or dashboard upsell) → `UpgradeButton.tsx:44-64` fires `POST /api/billing/checkout` with `{ plan, interval }`.
2. `checkout/route.ts:376-380` computes trial eligibility (`isTrialEligible` = no prior `stripeSubscriptionId` and `subscriptionStatus` is `'none'`/null) and sets `subscription_data.trial_period_days = TRIAL_PERIOD_DAYS` (14) when eligible.
3. `checkout/route.ts:391-410` creates the Checkout Session. **No `payment_method_collection` field is set anywhere in this route** — grep-confirmed absent from the entire file. Stripe Checkout Sessions default `payment_method_collection` to `'always'`, i.e. a card is collected at Checkout regardless of the trial. This matches the pricing page's own FAQ copy: *"You enter a card up front, get full plan access immediately, and aren't charged until day 15"* (`pricing/page.tsx:42`).
4. User completes Stripe-hosted Checkout (card + billing details) → `success_url: ${APP_URL}/account?billing=success` (`checkout/route.ts:400`).
5. **`checkout.session.completed` webhook** (`webhook/route.ts:177-419`) retrieves the live subscription, resolves plan from price ID, and — per the REVENUE_PLAN_20K fix — writes `subscriptionStatus` from the *actual* Stripe status (`'trialing'`), not a hardcoded `'active'` (`webhook/route.ts:393-401`). `User.plan` is set to `'starter'`/`'solo'` immediately; the user has full paid-tier feature access from second one of the trial.

**Card required up front: confirmed.** No `payment_method_collection: 'if_required'` override exists, and the code's own FAQ says so explicitly.

**Clicks from signup, unauthenticated visitor, to a completed trial checkout: effectively unbounded / self-service-recovery-dependent — not a fixed small number.** The pricing-page CTA that promises a trial does not lead to a trial; it leads to a free account, and the user has to independently rediscover the upgrade flow to get what they clicked for.

---

## 2. What a user experiences during the 14 days

- **No trial badge, countdown, or remaining-days figure anywhere in the product UI.** Grepped `apps/web-app/src/components/dashboard-v2/` (the only dashboard branch any user ever sees — see §3below) for `trial`/`Trial`: zero matches.
- The **only** place trial status is visible at all is the status pill on `/account` (`account/page.tsx:82-94`, `statusLabels.trialing → { label: 'Trial', cls: '...' }`, rendered at line 538-549). This shows a static "Trial" word — no date, no days-remaining, no progress bar. A user has to (a) know to visit `/account` and (b) infer the rest.
- **There is no data to build a countdown even if someone wanted to add one today.** `prisma/schema.prisma`'s `User` model (lines 10-50+) has no `trialEndsAt` / `trialEnd` field. This is self-documented in the codebase: `apps/web-app/src/app/api/admin/users/[id]/route.ts:54-55` — *"Reserved for future schema extension. Always null until trialEndsAt is added to User."* — and the corresponding test literally asserts `expect(body.data.user.trialEndsAt).toBeNull()` (`route.test.ts:177-181`). Stripe's `subscription.trial_end` is read transiently inside the `trial_will_end` webhook handler (`webhook/route.ts:1091`) and is **never persisted** — it is used once to build an analytics payload and then discarded.

## 3. What happens at day 14

- Stripe fires `customer.subscription.trial_will_end` **3 days before** expiry. The handler (`webhook/route.ts:1073-1117`) is explicitly documented as **notification-only**: *"This is informational only... We do NOT update the user record"*. It computes `trialEnd`, resolves `plan`, and does exactly one thing: `trackServer('trial_will_end', {...})` (line 1110). No DB write. No email. No in-app banner. This is even self-audited elsewhere in the codebase: `apps/web-app/src/lib/admin-operations/webhook-coverage.ts:87` literally lists `'customer.subscription.trial_will_end': 'trial-ending notifications never fire'` as a known gap.
- On day 14 itself, Stripe attempts the first real charge.
  - **If the card succeeds:** Stripe fires `invoice.payment_succeeded` → handler sets `subscriptionStatus: 'active'` (`webhook/route.ts:864-867`) and `customer.subscription.updated` also fires with `status: 'active'`, re-confirming plan (`webhook/route.ts:422-621`). **No email, no in-app confirmation, no receipt surfaced by this codebase** — the only place the user would ever see this transition is the `/account` status pill silently flipping from "Trial" (blue) to "Active" (green) *if and when they happen to revisit that page*. (Stripe's own dashboard-configured receipt email, if enabled, is outside this codebase's control and not verifiable from source.)
  - **If the card fails:** `invoice.payment_failed` fires → `subscriptionStatus: 'past_due'` (`webhook/route.ts:798-801`). No email is sent (handler only calls `trackServer('payment_failed', ...)`). `User.plan` is **not reverted** — it stays `'starter'`/`'solo'` — so the user keeps full paid-tier feature access throughout Stripe's dunning/retry window with zero indication anything went wrong, until Stripe eventually gives up and fires `customer.subscription.deleted`, which is the only event that reverts `plan: 'free'` (`webhook/route.ts:743-754`).

## 4. What happens if the user does nothing

- **Card on file, sufficient funds:** silently converts to paid on day 14/15. No confirmation, no receipt from this codebase, no "your trial converted" moment. The first the user consciously learns they're being billed is their bank/card statement — a well-known driver of chargebacks and support tickets, and the account page itself has a `billingIdentityReminder()` callout (`account/page.tsx:524-526`) apparently written in anticipation of exactly this "who charged me?" confusion.
- **Card declines:** access is **not** revoked. The user keeps working on a paid-tier account under `past_due` with no signal that payment failed, until Stripe's retry schedule exhausts and the subscription is canceled — at which point they silently drop to Free with, again, no email telling them why.
- Nothing "reverts to free" proactively and nothing "asks" the user to confirm — the system is fully passive in both directions.

## 5. Where the trial leaks — concrete drop-off points, ranked by where they sit in the funnel

| # | Drop-off point | File / line | Severity |
|---|---|---|---|
| A | Pricing-page CTA promises a trial but the unauthenticated path (`/signup?plan=starter`) drops the `plan` param entirely — user ends up Free, not mid-trial | `SignupPageClient.tsx` (no `plan` handling anywhere); `signup/page.tsx:15-17` (no `searchParams` read) | **Critical — this is the funnel** |
| B | Pricing page tells the same visitor **"No credit card required"** directly under the Starter/Solo CTA (`PricingCards.tsx:264-267`, fires because `plan.price !== null` is true for $49/$89 plans once `availability === 'available'`), while the page's own FAQ three lines up says *"You enter a card up front"* (`pricing/page.tsx:42`) — and checkout in fact does collect a card (`payment_method_collection` unset → Stripe default `'always'`). Self-contradicting promise on the same screen. | `PricingCards.tsx:254-270` vs `pricing/page.tsx:42` | **High — active mistrust at the exact CTA moment** |
| C | Zero in-product trial awareness (no badge, no countdown, no remaining-days) outside a single static word on `/account`, and the schema has no field to build one from (`trialEndsAt` doesn't exist) | `DashboardV2Shell` and children (no "trial" references); `schema.prisma` `User` model; `admin/users/[id]/route.ts:54-55` | **High — no product-side reason to come back and convert on purpose** |
| D | 3-days-before-expiry warning (`trial_will_end`) is analytics-only, no DB write, no email, no UI — self-documented as a known gap in `webhook-coverage.ts:87` | `webhook/route.ts:1073-1117` | **High — the one moment designed to prompt action does nothing** |
| E | Successful conversion to paid on day 14/15 is silent — no receipt, no confirmation surfaced by the app | `webhook/route.ts:808-884` (invoice.payment_succeeded — trackServer only) | Medium — post-conversion trust/chargeback risk, not a conversion blocker per se |
| F | Failed payment (`past_due`) is silent and access is not gated — no email, no banner beyond the `/account` pill | `webhook/route.ts:761-806` | Medium — dunning-recovery opportunity lost, but not why trials fail to *start* converting |
| G | v1 dashboard's `UsageQuotaMeter` / `OnboardingChecklist` (which at least reference usage limits) are wired only into the dead v1 branch (`dashboard/page.tsx:317-318` returns `DashboardV2Shell` for every user unless `?v2=0`) — confirmed via grep: neither component is imported anywhere under `components/dashboard-v2/` | `dashboard/page.tsx:313-324` | Medium — reinforces C, not a separate root cause |

---

## The single biggest reason a trial user would not convert

**Drop-off point A.** For the only realistic traffic profile this site currently has (cold search visitors, ~25/quarter, virtually never pre-authenticated), clicking "Start 14-Day Trial" does not start a trial. It creates a free account and silently discards the plan selection. The visitor who explicitly signaled purchase intent lands on the dashboard as a Free user with no memory anywhere in the system that they wanted Starter, and must independently rediscover and repeat the upgrade action to get what they originally clicked for. Everything downstream of this (no countdown, silent expiry warning, silent conversion) matters, but none of it is reachable if the trial itself is never entered. This is a pure plumbing defect, not a strategy or pricing problem — the CTA copy, the price, and the 14-day/card-upfront trial mechanics are all reasonable; the wire between "click" and "checkout" is simply cut for the majority case.

---

## Ranked recommendations

| Rank | Fix | Effort | Expected effect |
|---|---|---|---|
| 1 | **Carry `plan`/`interval` through signup into checkout.** Read `searchParams` in `signup/page.tsx`, pass to `SignupPageClient`, and on successful signup — if a plan param is present — call `POST /api/billing/checkout` immediately instead of (or before) `router.push('/dashboard')`, redirecting straight to Stripe. This closes the funnel's only real hole. | **4–8 hours** (client-side plumbing + one new call site; checkout route already handles the auth'd case) | **Highest — this is the fix.** Converts "trial CTA → dead end" into "trial CTA → Stripe" for the majority of traffic. Nothing else on this list matters until this ships. |
| 2 | **Remove or correct the "No credit card required" line for Starter/Solo** in `PricingCards.tsx:254-270` (it should not render for plans where `plan.price !== null` AND a trial with card-upfront applies — only for the genuinely-free plan). One-line conditional fix. | **1 hour** | Removes an active, self-contradicting trust violation at the exact moment of purchase decision. Cheap, should ship with #1. |
| 3 | **Add `User.trialEndsAt` (or read live from Stripe on `/account` load) and render a countdown/remaining-days badge on `/account` and, ideally, the dashboard shell.** Minimum viable: persist `trial_end` from `checkout.session.completed`/`customer.subscription.updated` into the existing nullable field slot already referenced in `admin/users/[id]/route.ts`. | **1–2 days** (schema migration + 2 webhook write sites + 1 UI badge) | Gives trial users a reason to notice and act before expiry; supports #4. |
| 4 | **Wire `customer.subscription.trial_will_end` to `sendEmail()`.** The email infrastructure already exists and works (`apps/web-app/src/lib/email.ts`, SMTP-first with Resend fallback, already used for password reset) — this handler currently only calls `trackServer`. Add one `sendEmail()` call with trial-end date and an upgrade-confirmation nudge. | **0.5–1 day** (template + one call site; no new infra needed) | Converts the one Stripe-designed "please pay attention now" moment from silent to actionable — directly targets drop-off D. |
| 5 | **Send a receipt/confirmation email on `invoice.payment_succeeded`, and a payment-failed email on `invoice.payment_failed`.** Same `sendEmail()` utility, two more call sites. | **0.5–1 day** | Reduces "who charged me?" support load and chargeback risk (E); gives a failing card a chance to be fixed by the user instead of silently riding out `past_due` until cancellation (F). |
| 6 | **Retire the dead v1 dashboard branch** (or, faster, move `UsageQuotaMeter` into `DashboardV2Shell`) so usage/quota awareness exists somewhere a user actually sees. Already tracked internally as follow-up #48/#57 per `dashboard/page.tsx:321-323` comments. | **Half day** (wire component into v2) **or multi-day** (full v1 retirement — already scoped elsewhere in this repo's own backlog) | Secondary — reinforces upgrade-awareness generally; not itself a trial-specific fix. |

---

## "Badly designed" vs. "fine but unreachable" — separated

**The trial mechanics themselves are not badly designed.** 14 days, card-upfront, first-time-subscriber-only eligibility gate (`checkout/route.ts:371-380`), correct `trialing`→`active` status tracking through the webhook layer (the REVENUE_PLAN_20K fix specifically corrected an earlier bug where trials were miscounted as billed revenue), idempotent webhook handling, SCA/3-D-Secure handling, out-of-order delivery guards — this is a solid, production-grade billing implementation. If a user actually enters the trial, the trial itself works correctly end to end.

**What's broken is reachability and visibility, not the trial's design:**
- **Unreachable:** Drop-off A (signup drops the plan param) is a pure routing/plumbing gap — the checkout API, trial logic, and Stripe integration it would call are already correct and already used successfully by the authenticated path.
- **Fine but unreachable:** Everything in Rank #1 above is "connect the wire," not "redesign the trial."
- **Genuinely under-designed (not just unreachable):** Drop-off B (contradictory copy), C (no in-product trial awareness — no schema field even exists), and D (notification-only trial-ending webhook with a self-documented "never fires" gap) are real design gaps in the trial *experience*, independent of the routing bug. Fixing A alone gets people into a trial; it does nothing to help them understand they're in one, be reminded before it ends, or trust the pricing page's claims while getting there. Both classes of fix are needed, but they are different kinds of work — A/plumbing is a bug fix; B/C/D are UX and lifecycle-communication features that don't yet exist.

---

## Files cited

- `apps/web-app/src/lib/config.ts` (pricing config: CTA copy, `ctaHref`)
- `apps/web-app/src/components/PricingCards.tsx`
- `apps/web-app/src/components/UpgradeButton.tsx`
- `apps/web-app/src/app/(public)/signup/page.tsx`
- `apps/web-app/src/app/(public)/signup/SignupPageClient.tsx`
- `apps/web-app/src/app/(public)/pricing/page.tsx` (FAQ copy)
- `apps/web-app/src/app/api/billing/checkout/route.ts`
- `apps/web-app/src/app/api/billing/webhook/route.ts`
- `apps/web-app/src/app/(app)/account/page.tsx`
- `apps/web-app/src/app/(app)/dashboard/page.tsx`
- `apps/web-app/src/lib/email.ts`, `apps/web-app/src/lib/notifications.ts`
- `apps/web-app/src/lib/admin-operations/webhook-coverage.ts`
- `apps/web-app/src/app/api/admin/users/[id]/route.ts`
- `apps/web-app/prisma/schema.prisma`
