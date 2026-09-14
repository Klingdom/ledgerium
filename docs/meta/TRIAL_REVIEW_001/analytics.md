# TRIAL_REVIEW_001 — Analytics: Can We Measure Trial → Paid Conversion?

**Author:** analytics agent
**Date:** 2026-09-14
**Scope:** Read-only investigation. No source files were modified, created, or deleted. No git write commands were run.
**Question:** Can Ledgerium AI measure trial→paid conversion today, and what is the minimum instrumentation required before any trial redesign can be evaluated?

**Bottom line: No.** Individual trial-lifecycle *moments* are partially observable (some as durable DB state, some only as best-effort analytics events, one — trial duration itself — nowhere at all). But there is no durable, non-overwritten signal anywhere in the system that says "this specific account's paid/canceled outcome followed a trial." Every current DB representation of subscription state is a **single mutable snapshot column** that gets overwritten on each lifecycle transition, so the moment a trial converts or lapses, the fact that it *was* a trial is lost from the row that recorded the outcome. A trial redesign shipped today would be unfalsifiable — there is no query, table, or event join that can currently tell you what fraction of trials convert.

---

## 1. Stage Table

| Stage | Measurable today? | Event name / DB field | File reference |
|---|---|---|---|
| **Trial started** | Partially. An event fires and a DB snapshot flips, but no durable trial-start *timestamp* is persisted anywhere. | Event: `subscription_created` (status property `'trialing'`) via `trackServer()`. DB: `User.subscriptionStatus = 'trialing'` (and `Team.subscriptionStatus` for team-linked, not reachable today — team/growth checkout is blocked, see §5 note). | `apps/web-app/src/app/api/billing/webhook/route.ts:409-418` (event); `route.ts:390-407` (`User.subscriptionStatus` write); `apps/web-app/src/app/api/billing/checkout/route.ts:376-388` (trial eligibility + `trial_period_days` applied at Stripe Checkout) |
| **Trial in progress** | Instantaneous count only, not cohort/duration. | DB: `WHERE subscriptionStatus = 'trialing'` — surfaced today as the "Trialing" segment on the admin dashboard's `SubscriptionStatusBar`. **No trial-elapsed-days signal exists** — no `trialStartedAt`/`trialEndsAt` column anywhere. | `apps/web-app/src/lib/admin-operations/queries.ts:486-649` (`getSubscriptionBreakdown` → `byStatus.trialing`); `apps/web-app/src/components/admin-operations/SubscriptionStatusBar.tsx:20-26` (renders it) |
| **Trial ending (T-3d notice)** | Instrumented, **not surfaced**. | Event: `trial_will_end`, fired via `trackServer()`. **Explicitly does not write to the DB** — by design (see code comment: "NOTIFICATION event... We do NOT update the user record"). | `apps/web-app/src/app/api/billing/webhook/route.ts:1073-1116` |
| **Converted (trial → paid)** | **MISSING.** No dedicated event or DB field. | The webhook comment claims `invoice.payment_succeeded` "handles the trial→paid transition automatically," but the resulting DB write (`subscriptionStatus: 'active'`) and the analytics event (`payment_succeeded`) are **identical** whether this is the first post-trial charge or the 14th monthly renewal. Nothing in the payload distinguishes them. | `apps/web-app/src/app/api/billing/webhook/route.ts:808-885` (`invoice.payment_succeeded` handler — see line 810-811 comment) |
| **Lapsed (trial canceled without converting)** | **MISSING**, and conflated with normal churn. | `subscription_canceled` event and `subscriptionStatus: 'canceled'` DB write fire identically whether the account never converted or was a paying customer for a year before canceling. No prior-status context is carried. | `apps/web-app/src/app/api/billing/webhook/route.ts:624-759` (`customer.subscription.deleted` handler) |

**Key structural problem underlying every "MISSING" row above:** `User.subscriptionStatus` (and `Team.subscriptionStatus`) is a single mutable string column, unconditionally overwritten on every lifecycle event (`route.ts:607-616`, `:743-754`, `:864-868`, and the team-linked equivalents). There is no history table, no append-only ledger of status transitions, and no "this account passed through `trialing` at some point" flag that survives the transition out of that state. This mirrors — and is the direct billing-state analogue of — `User.firstTouchVisitorId`, which *was* deliberately built to survive overwrites ("Set exactly ONCE, at account creation... never overwritten afterward," `prisma/schema.prisma:56-70`). No equivalent "set once, never cleared" field exists for trial outcome.

---

## 2. Can we answer "what percentage of trials convert to paid?"

**No.** Precisely what is missing, in order of severity:

1. **No trial start/end timestamps persisted anywhere in the DB.** Stripe's `subscription.trial_start` / `subscription.trial_end` are read into local variables inside the `checkout.session.completed` handler (`webhook/route.ts:264-282`) but never written to a column. The only DB write that happens at trial-start time is `lastSubscriptionEventAt: eventCreatedAt` (`route.ts:405`, `:327`, `:362`) — and that field is **not a trial-start marker**, it is a generic "last webhook event applied" out-of-order-delivery guard that gets overwritten by the very next webhook (e.g., the trial→paid transition itself overwrites it, per `route.ts:614`, `:752`). By the time a trial resolves, its start time is gone from every DB row.
2. **No durable "this account had a trial" marker.** `subscriptionStatus` is overwritten in place at every transition (§1). A converted trial and a subscriber who never trialed (not currently possible via the product, but architecturally indistinguishable if it ever were) would look identical in the `'active'` state.
3. **No `trial_converted` / `trial_lapsed` event exists.** The only events adjacent to conversion/lapse (`payment_succeeded`, `subscription_updated`, `subscription_canceled`) are generic lifecycle events reused for renewals, plan changes, and long-tenure churn alike.
4. **No cohort query exists.** `getSubscriptionBreakdown()` (`admin-operations/queries.ts:486`) is a **point-in-time snapshot fold** over the current `subscriptionStatus` distribution — it answers "how many users are trialing *right now*," never "of the N users whose trial started in the last 30 days, what fraction converted by day 14." There is no date-bucketed, cohort-based query anywhere in `admin-operations/`.
5. **Even the fallback (event-log reconstruction) is unverified.** In principle one could try to reconstruct a trial's outcome by querying the persisted `AnalyticsEvent` table (`prisma/schema.prisma:481-510`, populated via `apps/web-app/src/app/api/analytics/events/route.ts`) for a `subscription_created{status:'trialing'}` row followed by a later `payment_succeeded` or `subscription_canceled` row for the same `userId`. **This is theoretically possible but does not exist as a query today**, and its inputs are best-effort: the ingestion route silently swallows DB write failures (`route.ts:41-48`, comment: "Don't fail the request if DB write fails"), the client-side buffer caps at 500 events and drops the oldest on overflow (`analytics.ts:804`), and the final flush on page-unload uses `sendBeacon` with no delivery confirmation (`analytics.ts:850-858`). None of this is monitored — there is no metric anywhere that reports "how many analytics events were dropped." This is the same category of silent-failure risk the repo has already shipped once (`CLAUDE.md` known-regression history for the extension capture pipeline); it applies here too, just unaudited.

Given all of the above: any dashboard number claiming a "trial conversion rate" today would have to be **computed by hand from Stripe's own dashboard/API**, not from this application's DB.

---

## 3. Can we distinguish a user who never started a trial from one who trialed and lapsed?

**Partially — cleaner than expected, but incomplete.**

- **Never-started vs. ever-started IS distinguishable today.** `User.subscriptionStatus` defaults to `'none'` (`prisma/schema.prisma:16`) and is never written to `'trialing'`/`'active'`/`'past_due'`/`'canceled'` unless a real Stripe subscription lifecycle event occurs. A user who signed up and never touched Checkout stays at `'none'` forever. A user whose trial or subscription ended (converted-then-churned, or lapsed-without-converting) lands at `'canceled'`. So `'none'` vs. `'canceled'` **is** a real, queryable distinction in the DB today.
- **Within the `'canceled'` bucket, trial-lapsed vs. long-tenure-churn is NOT distinguishable.** Both a trial that was canceled on day 3 without ever being charged, and a customer who paid for 18 months and then canceled, resolve to the identical terminal row: `subscriptionStatus: 'canceled'`, `stripeSubscriptionId: null`, `pendingInvoiceUrl: null` (`webhook/route.ts:743-754`). There is no `everHadSuccessfulPayment` flag, no count of `payment_succeeded` events, nothing.
- One functional side-note surfaced during this investigation, relevant to interpreting the DB but not itself an analytics gap: the trial-eligibility check in `checkout/route.ts:376-378` (`!user.stripeSubscriptionId && (subscriptionStatus === 'none' || null)`) correctly treats a `'canceled'` user as **not** eligible for a second trial (comment: "Cancelled-then-resubscribed users do NOT get a second trial"). This confirms `'canceled'` genuinely means "had a subscription, of unknown trial provenance" and is not conflated with `'none'` anywhere in the codebase — the ambiguity is specifically about *what kind* of lifecycle preceded the cancellation, not whether one occurred.

---

## 4. Minimum instrumentation before a trial redesign can be evaluated — ranked

All recommendations reuse existing write sites and existing patterns already in this codebase (the `lastSubscriptionEventAt` / `firstTouchVisitorId` "stamp a field at a known write site" pattern, and the `trackServer()` PII-free event pattern). No new subsystem, job, or table is proposed.

**1. Persist `trialStartedAt` / `trialEndsAt` at the site that already reads them — Effort: S**
Stripe's `subscription.trial_start` / `subscription.trial_end` are already retrieved inside `checkout.session.completed` (`webhook/route.ts:264-266`) at zero extra API cost. Add two nullable `DateTime?` columns to `User` (and `Team`, for parity when team/growth checkout reopens) and write them alongside the existing `plan`/`subscriptionStatus`/`billingInterval` write (`route.ts:390-407`, `:318-329`, `:345-364`) whenever Stripe reports non-null trial fields. This is an additive migration, following the exact precedent of `billingInterval` and `lastSubscriptionEventAt`, both added the same way. Without this, nothing downstream is computable — this is the actual blocker, not a nice-to-have.

**2. Stamp a durable, never-overwritten conversion/lapse marker — Effort: S–M**
Add `trialConvertedAt: DateTime?` (and, optionally, `trialLapsedAt: DateTime?`) to `User`/`Team`, mirroring the "set once, never cleared" discipline already documented on `firstTouchVisitorId` (`schema.prisma:56-70`). Write `trialConvertedAt` inside `invoice.payment_succeeded` (`route.ts:808-885`) **only when the row's pre-update `subscriptionStatus` was `'trialing'`** — the row is already fetched via `findFirst` before the `.update()` call at both the solo (`:851`) and team (`:826`) sites, so the read-before-write is free. Write `trialLapsedAt` the same way inside `customer.subscription.deleted` (`:624-759`), conditioned on pre-update status `'trialing'`. This directly answers §2/§3 without any event-log archaeology, and is safe from the overwrite problem described in §1 because it is written once and never touched again by any other handler.

**3. Emit `trial_converted` / `trial_lapsed` analytics events at the same call sites — Effort: XS (folds into #2)**
Two more `trackServer()` calls, placed in the same conditional branches added in #2, using the exact shape of the sibling events already there (`subscription_created`, `subscription_canceled` — `userId`, `visitorId`, `plan`; no PII). This makes the *event funnel* (`/api/analytics/events` `computeFunnel()`, `route.ts:161-184`) able to include a `trial started → trial converted` step for free, alongside the DB-column signal from #2.

**4. A trial-cohort query + admin surface — Effort: M**
Once #1 and #2 exist, add `getTrialCohortBreakdown()` to `admin-operations/queries.ts`, mirroring the existing `getSubscriptionBreakdown()` shape: bucket by `trialStartedAt` into rolling windows (e.g., last 30/60/90 days) and fold counts of `{still trialing, converted, lapsed, unresolved}` using the new columns. Surface it as a new `AdminOperationsResponse` section with a component parallel to `SubscriptionStatusBar.tsx`. This is the artifact that actually answers "what % of trials convert" with a real cohort denominator — do not build this before #1/#2 land; there is nothing for it to read.

**5. (Non-blocking, parallel track) Surface analytics-ingestion failures — Effort: S**
The silent `catch` in `/api/analytics/events` POST (`route.ts:41-48`) and the unmonitored `sendBeacon` flush on unload mean any future trial-adjacent event analysis inherits an unverified-completeness data source. This does not block the trial redesign evaluation once #1/#2 make trial state a durable DB column rather than an event-log join — but it is exactly the class of gap the CLAUDE.md known-regression history already names once (extension capture pipeline breaking silently under passing gates). Recommend at minimum a counted `client_error`/log line on write failure so a future silent-drop is at least visible, not because it blocks this evaluation.

None of the above touches PII: every new field is a timestamp or an already-opaque internal ID (`userId`, `visitorId`), consistent with the "no full email/IP/PII" posture documented throughout `analytics.ts` and `webhook/route.ts`.

---

## 5. Metrics currently displayed that would MISLEAD someone judging trial performance

- **`freeToPaidConversionPct`** (admin dashboard KPI tile, `admin-operations/queries.ts:629-632`, `= paidUserCount / totalUsers × 100`). This is an **all-time, all-users, point-in-time survivorship ratio** — every user who has ever signed up, versus every user currently `'active'`. It is not cohort-based, not trial-specific, and not time-windowed. A trial redesign would move this number slowly and noisily against a denominator of the entire historical user base, including users who signed up years ago and users who are still mid-trial and haven't had a chance to convert yet. **Watching this number to judge a trial change would be watching noise, not signal.**
- **`activationRatePct`** (`admin-operations/queries.ts:185-194`) — independently confirmed broken per the verified context for this review: every signup auto-seeds a sample workflow via `handleLoadSample()` (`apps/web-app/src/app/(app)/dashboard/page.tsx:497-506`) that creates a real `Workflow` row with **no `isSample` field on the `Workflow` model** (confirmed absent from `prisma/schema.prisma:146-193`, and `isSample` returns zero hits anywhere in `apps/web-app`) to distinguish it from a genuinely recorded workflow. This inflates activation to near-100% regardless of real usage. Relevant here specifically because **if activation is ever used as a covariate for trial-conversion analysis** ("did activated trial users convert better?"), that analysis is void — every user, sample-seeded or not, reads as "activated."
- **`byStatus.trialing`** (`SubscriptionStatusBar.tsx`, "Trialing" segment) — not itself inaccurate (it is an honest instantaneous count), but easy to misread as a conversion signal. It answers "how many accounts are mid-trial right now," which says nothing about how many trials started in a given period or what fraction of them convert. Flagging it explicitly so it is not mistaken for the missing cohort metric.
- **`checkout_started` raw event count** (`/analytics/product` dashboard tile, labeled "Checkouts Started," `apps/web-app/src/app/(app)/analytics/product/page.tsx:124`) — **double-counted**: it fires once client-side on every successful checkout-session creation (`UpgradeButton.tsx:61`, only reached when `data.url` is present) **and** once server-side in the same code path (`checkout/route.ts:412-417`, `:215-220` for the one-time-purchase variant). Any checkout **failure** (network error, `already_subscribed`, `plan_not_configured`, `checkout_session_failed`, the Team/Growth waitlist block) produces **zero** `checkout_started` events — the event only fires after Stripe has already handed back a session URL. The raw tile therefore overstates volume ~2x and is blind to every failure mode. Note this specific inflation is contained: the funnel step of the same name inside `computeFunnel()` (`events/route.ts:161-184`) dedupes by `userId` via a `Set`, so the *funnel conversion rate* is not doubled — only the raw count tile is. Not itself a trial-conversion metric, but it is the step immediately upstream of `subscription_created` (trial start), so a naive "checkout started → subscribed" ratio read off the raw counts would be silently deflated to roughly half its true value.

---

## Summary for the trial-redesign decision

Trial conversion is **not measurable today** — not "hard to measure," not "measurable with caveats," but structurally absent: no start timestamp survives to any queryable field, no outcome marker survives the transition it describes, and no query exists to join what little event history is durably persisted. The minimum fix (items 1–3 above) is small — two nullable columns and four `trackServer()`/write-site additions at call sites the webhook handler is already touching — and should ship and be given at least one full trial cycle (14+ days) of real data before any trial-redesign change is evaluated against it. Shipping a trial redesign before item 1 lands would leave the team exactly where the prompt warns against: a change that passes every gate while the thing it's supposed to affect stays invisible.

**Files referenced in this review** (read-only; none modified):
- `apps/web-app/src/lib/analytics.ts`
- `apps/web-app/src/app/api/billing/webhook/route.ts`
- `apps/web-app/src/app/api/billing/checkout/route.ts`
- `apps/web-app/src/app/api/analytics/events/route.ts`
- `apps/web-app/src/lib/admin-operations/queries.ts`
- `apps/web-app/src/lib/admin-operations/types.ts`
- `apps/web-app/src/lib/admin-operations/webhook-coverage.ts`
- `apps/web-app/src/components/admin-operations/SubscriptionStatusBar.tsx`
- `apps/web-app/src/components/UpgradeButton.tsx`
- `apps/web-app/src/app/(app)/dashboard/page.tsx`
- `apps/web-app/src/app/(app)/analytics/product/page.tsx`
- `apps/web-app/prisma/schema.prisma`
