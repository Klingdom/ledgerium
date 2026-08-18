# Revenue Plan — $20k MRR: Analytics & Unit-Economics Analysis

**Type:** Read-only audit (analytics agent). No product code changed.
**Date:** 2026-08-18 (session date; grounding facts as supplied 2026-08-13, re-verified against current source).
**Track:** Can we measure progress toward $20,000 MRR, and what do the unit economics look like?
**Companion artifact:** `docs/meta/SEO_AEO_EFFECTIVENESS_REVIEW/analytics_analysis.md` — read first. The attribution-join gap identified there (`visitorId` ships as a join key but no code joins on it) is the same root defect this review finds on the revenue side, plus two new, independent defects specific to billing.

---

## 0. Bottom line

**No — not yet, and not by a small margin.** Two things have to both be true before any of this is measurable, and neither is true today:

1. **Stripe is not operationalized.** `compose.hostinger.yaml:35-44` sets every `STRIPE_*` environment variable to an empty-string default (`${STRIPE_SECRET_KEY:-}` etc.). Per the runbook's own troubleshooting section, an unset price ID makes checkout return HTTP 503. **There are no real subscriptions in production today**, which means every revenue metric in this document has zero real data to compute over. This is the single blocking dependency — see §6.
2. **Even once Stripe is turned on, the shipped MRR calculation will be wrong**, in three independent, compounding, and precisely locatable ways (§1): it counts unbilled trial subscribers as revenue, it structurally cannot see Team/Growth-tier billing state after the first webhook event, and it has no concept of monthly-vs-annual billing interval. None of these are hypothetical — they are directly readable in `apps/web-app/src/app/api/billing/webhook/route.ts` and `apps/web-app/src/lib/admin-operations/queries.ts` today.

The good news, and it is real good news: **an "Est. MRR" tile already ships** on the admin operations dashboard (`apps/web-app/src/lib/admin-operations/queries.ts:446-557`, surfaced at `apps/web-app/src/app/api/admin/operations/route.ts:132` and rendered as "Est. MRR" in `AdminOperationsDashboard.tsx:257-258,667`). This is not a build-from-scratch problem — it is a **fix-three-specific-bugs-in-an-existing-pipeline** problem, plus a **turn-Stripe-on** problem that is entirely non-engineering (§6).

Nothing below is a fabricated number. There is no revenue data in this system. Everything stated as fact is read directly from source, with file:line citations.

---

## 1. Revenue instrumentation gap analysis

### 1.1 What's already computable today (mechanically, once Stripe has real data)

| Metric | Source | Verdict |
|---|---|---|
| User count by plan × subscription status | `db.user.groupBy({ by: ['plan','subscriptionStatus'] })` — `queries.ts:467-470` | **Computable.** Correctly uses a single compound `groupBy` (not two marginal groupBys) specifically to avoid reconstructing a wrong plan×status intersection — see the `R-5` doc comment at `queries.ts:432-439`. This is a real, deliberate correctness fix already shipped. |
| "Est. MRR" (`estimatedUsd`) | `Σ MONTHLY_PRICE_USD[plan] × count` over billable rows — `queries.ts:518-529`, prices sourced from `PRICING_CONFIG` via `apps/web-app/src/lib/admin-operations/pricing.ts:23-38` (drift-guarded by a co-located test per that file's header) | **Computable but wrong** — see §1.2. The formula itself is clean; the inputs it's fed are structurally incomplete. |
| Paying subscriber count | `paidUserCount` — `queries.ts:527-529` | Same caveats as MRR (inherits the trial-misclassification and Team-blindness gaps below). |
| "Free→paid conversion %" | `paidUserCount / totalUsersFromJoint` — `queries.ts:537-540` | **Misnamed.** This is a **snapshot ratio** (currently-paying ÷ all-time users), not a cohort trial-conversion rate. It also inherits the trial-misclassification bug (§1.2a): a brand-new 14-day trial subscriber is counted as "paid" in this ratio from second one of the trial. |
| New signups in a date range | `newUsersInRange` — `queries.ts:190-193` | **Computable**, straightforward `User.createdAt` binning. |
| Activation rate (proxy) | Distinct users with ≥1 non-`deleted` `Workflow` ÷ total users — `queries.ts:180-188` | Computable as a *proxy*, not a real activation definition (no "did the trial user actually get value" signal beyond "created one workflow row"). Also flagged by `DATABASE_HEALTH_REVIEW_002.md` §4 (P0-4) as an unbounded, cross-tenant `findMany`+`Set` scan — a performance concern at scale, not a correctness one for this track. |
| MAU (30-day) | `User.updatedAt >= now - 30d` — `queries.ts:135-140` | **Proxy only.** `updatedAt` fires on *any* row mutation, not on login or product usage specifically — it is the best available signal today, not a true activity metric. |

### 1.2 What is NOT computable — and exactly why

**(a) Trial subscribers are misclassified as billable "active" from the moment they start a trial.**

`apps/web-app/src/app/api/billing/webhook/route.ts:169-177` — inside the `checkout.session.completed` handler:

```ts
await db.user.update({
  where: { id: userId },
  data: {
    plan,
    subscriptionStatus: 'active',   // ← unconditional
    stripeSubscriptionId: session.subscription as string,
    stripeCustomerId: session.customer as string,
  },
});
```

This write is **unconditional** — it runs regardless of whether the underlying Stripe subscription began in `trialing` status (which it does for every first-time subscriber, per the 14-day-trial checkout logic in `apps/web-app/src/app/api/billing/checkout/route.ts`, iter 066). The webhook handler does **not** subscribe to `customer.subscription.created` at all (only `.updated` and `.deleted` are handled — confirmed by the `switch (event.type)` cases at `route.ts:65-568`), so there is no corrective event fired immediately after checkout. The DB has no way to distinguish "trialing, not yet charged" from "actively paying" for the entire 14-day window unless some *other* event happens to fire during that window (an early cancel correctly reverts via `customer.subscription.deleted`, `route.ts:315-403`; but nothing corrects a trial that simply runs its course quietly).

`MRR_BILLABLE_STATUSES = ['active']` (`apps/web-app/src/lib/admin-operations/pricing.ts:61`) is the gate meant to exclude trials from MRR — but because the DB never actually records `trialing`, that gate is defeated at the source. **Every currently-trialing subscriber is counted as MRR the instant they start a trial, for the full 14 days, whether or not they ever pay.** Given $20k MRR ≈ 105 customers at this pricing mix, and every paid signup starts with a 14-day trial by default, this is not a corner case — it is the default path for every new dollar of revenue this system will ever record.

**(b) Team and Growth subscriptions go stale after the first webhook event — MRR structurally cannot see the `Team` table.**

`getSubscriptionBreakdown()` (`queries.ts:446-557`) queries **only** `db.user.groupBy(...)` (`queries.ts:467`). It never references the `Team` model, even though `Team` carries its own independent billing state: `Team.plan`, `Team.subscriptionStatus`, `Team.stripeCustomerId`, `Team.stripeSubscriptionId` (`schema.prisma:444-478`).

Trace the actual write path for a Team/Growth purchase:

- `checkout.session.completed` (`webhook/route.ts:66-181`): when `plan !== 'free' && plan !== 'starter'` (i.e., team or growth), the handler resolves-or-creates a `Team` row and stamps `Team.plan`/`stripeCustomerId`/`stripeSubscriptionId` (`route.ts:107-166`). **Separately and unconditionally**, it also updates `User.plan`/`subscriptionStatus` for the purchasing user (`route.ts:169-177`, quoted above) — "both paths execute so the User record stays in sync" per the comment at `route.ts:104-106`. So immediately after checkout, the owner's `User.plan` *does* reflect the team tier.
- `customer.subscription.updated` (`route.ts:183-313`) — this is the event that fires on trial→paid conversion, plan upgrades/downgrades, and renewal-triggered status changes. For a team-linked subscription, the handler resolves the `Team` via `resolveTeamFromCustomer(customerId)` (`route.ts:224`), writes `Team.plan`/`Team.subscriptionStatus` (`route.ts:229-237`), and then **`break`s at line 282 — before ever reaching the "Solo-subscriber path" at line 286 that would update `User.plan`/`subscriptionStatus`.**

The consequence: **the owner's `User.plan`/`subscriptionStatus` is correct exactly once — at the instant of checkout — and then goes stale forever after the first subsequent lifecycle event.** Trial→paid conversion, upgrade, downgrade, and every renewal-driven status refresh update `Team`, not `User`, for team-linked subscriptions. Since `getSubscriptionBreakdown()` only reads `User`, and Team + Growth are the two highest-ARPU tiers ($249 and $799 — the tiers that do the most work toward $20k), **the shipped MRR number will start drifting from Team-table reality the moment the first team subscription's trial converts, and there is no code path that corrects it.** Other team members invited onto a workspace never have their own `User.plan` touched at all (correctly — they aren't individually billed), but that means Team/Growth MRR cannot be reconstructed by summing `User.plan` rows even in principle; it requires reading `Team.plan`/`Team.subscriptionStatus` directly, which nothing does today.

**(c) No billing interval is stored anywhere — annual subscribers are counted at the full monthly sticker price.**

`STRIPE_PRICES` / `BillingInterval` (`apps/web-app/src/lib/stripe.ts:39-52`) treats `'monthly' | 'annual'` purely as a **checkout-time parameter** — it selects which Stripe price ID to use, then is discarded. Neither `schema.prisma`'s `User` model (`:10-46`) nor `Team` model (`:444-478`) has an `interval`/`billingInterval` column, and no webhook handler writes one. `MONTHLY_PRICE_USD` (`pricing.ts:48-52`) is applied identically to every billable row regardless of how that subscriber actually pays.

The pricing runbook's own numbers make the size of this error explicit (`STRIPE_SETUP.md:52-72`): Starter annual is $490/yr = **$40.83/mo actual**, but `MONTHLY_PRICE_USD.starter = 49` (derived from `PRICING_CONFIG`, `apps/web-app/src/lib/config.ts:69-71`) counts it at **$49/mo** — an **~20% overstatement per annual Starter subscriber**, same proportional overstatement on Team ($249 vs. $2,490/12 = $207.50) and Growth ($799 vs. $7,990/12 = $665.83). If even a modest share of the ~105 customers needed for $20k MRR pay annually (which the pricing page actively promotes, per the runbook's "17% annual savings" framing), the estimated-MRR tile will be inflated by a proportional amount with no way to tell how much from the number alone.

### 1.3 What is not computed *at all* (no code path exists, regardless of correctness)

- **New / expansion / churned MRR** (deltas over time). Not computed anywhere. The webhook handlers only write **current state** (`plan`, `subscriptionStatus`) — they overwrite in place, they do not append a history row. There is no table anywhere in `schema.prisma` that records "what changed, from what, to what, when." The `trackServer(...)` analytics calls scattered through the webhook (`subscription_created` at `route.ts:179`; `subscription_updated` at `route.ts:265-270` [team] / `:311` [solo]; `subscription_canceled` at `:363-366` [team] / `:401` [solo]; `payment_succeeded` at `:482-488` [team] / `:515-520` [solo]; `payment_failed` at `:426-431` [team] / `:447` [solo]; `workspace_downgraded` at `:275-280`, which is the **only** event that carries both `fromPlan` and `toPlan` — everything else carries only the new state) do persist to `AnalyticsEvent` via `trackServer()` → `analytics-server.ts:52-59`. So the raw material to reconstruct new/expansion/churned MRR *does* exist in the event log, in principle — but exactly like the SEO review's `visitorId` finding, it is embedded inside the unindexed `properties` text blob (`schema.prisma:431`, `properties String?`), and **no query anywhere reads it for this purpose.** This is buildable as a one-off script; it does not exist as running code, a report, or a dashboard.
- **Trial→paid conversion rate** (true cohort measure: of trials started in week W, what fraction converted to a paid charge). Not computed. Would require either (i) a `trialStartedAt` timestamp persisted in the app DB — not currently stored (Stripe has `subscription.trial_start`/`trial_end` natively, but nothing in the webhook handler reads or persists it) — or (ii) reading it live from the Stripe API/Dashboard. `freeToPaidConversionPct` (§1.1) is not this metric and should not be presented as this metric.
- **ARPU** (average revenue per paying account, blended or per-plan). Not computed anywhere, though trivially derivable once (a)/(b)/(c) above are fixed: `estimatedUsd ÷ paidUserCount`.
- **Cohort retention** (do month-N signups still pay in month N+1, N+2, ...). Zero support of any kind. No historical snapshots of subscription state are retained; the DB is overwrite-in-place by design (see §1.3's first point). This is not a query gap, it is a *data-model* gap — the data needed to answer this question is not being stored, so it cannot be recovered retroactively for any period before the gap is closed.
- **Gross / revenue churn rate.** Same gap as new/expansion/churned MRR — no delta ledger exists.

---

## 2. The attribution join

### 2.1 The problem restated for revenue, not SEO

The prior SEO review found: `visitorId` is stamped on every client event (`apps/web-app/src/lib/analytics.ts`) and survives into the DB, but embedded inside `AnalyticsEvent.properties` — an unindexed `String?` column (`schema.prisma:431`) — and **nothing queries it.**

For the revenue track, the same root cause produces a **second, independent break**, further downstream:

- `trackServer()` — the function every billing webhook event flows through (`apps/web-app/src/lib/analytics-server.ts:34-67`) — has **no `visitorId` parameter or enrichment step at all.** Its `EnrichedEvent` shape (`analytics-server.ts:16-20`) is `{ event, timestamp, [key: string]: unknown }`; the only identity field it plumbs is whatever `properties.userId` the caller passes in (`:55`, `:65`). Every webhook call site (`webhook/route.ts:179, 265-270, 311, 363-366, 401, 426-431, 447, 482-488, 515-520, 557-561`) passes `userId` (or `teamId`) — never `visitorId`.
- This means: even after the client-side `visitorId` fix the SEO review specifies, **billing events on the server side carry no visitor-level join key.** The chain `seo_page_viewed(visitorId) → signup_completed(visitorId, userId) → subscription_created(userId)` has a working link at the `userId` end (both `signup_completed` and `subscription_created` genuinely carry `userId` and can be joined on the existing `userId` index — `schema.prisma:436`), but the first hop still requires the visitorId fix documented in the companion review, and that fix alone is **not sufficient** to complete the chain to revenue — the money-side events were never designed to carry a visitor identifier in the first place.

**Bottom line: the SEO→signup join and the signup→paid join are two separate, independently-broken links.** Fixing only the first (as the SEO review specifies) gets you SEO→signup. You need both fixes to get SEO→signup→**paid**, which is the number that actually matters for "which acquisition channel produces revenue."

### 2.2 Minimum viable fix — precise enough to hand to an engineer

**Step 1 — Promote `visitorId` to a first-class indexed column** (closes the SEO→signup leg; this is a schema-level restatement of the companion review's recommendation, scoped precisely here):

```prisma
model AnalyticsEvent {
  id          String   @id @default(uuid())
  userId      String?  @map("user_id")
  visitorId   String?  @map("visitor_id")   // NEW — promoted out of `properties`
  eventName   String   @map("event_name")
  properties  String?  // JSON metadata — visitorId no longer needs to live here
  url         String?
  source      String   @default("client")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([userId])
  @@index([visitorId])   // NEW
  @@index([eventName])
  @@index([createdAt])
  @@map("analytics_events")
}
```

- Populate it in the client `track()` pipeline (`analytics.ts`) at the point where `visitorId` is currently stamped only into the JSON blob — write it to the new top-level field instead (or in addition, for one release, then drop the blob copy).
- Populate it server-side too: extend `trackServer()`'s signature to accept an optional `visitorId`, and thread it through from the signup flow (`SignupPageClient.tsx`, already confirmed by the companion review to call `track({event:'signup_completed', ...})` client-side — that client call already has `visitorId` via the standard enrichment path, so this leg needs no server change) and, for the money-side events specifically, thread `visitorId` forward from signup into `User` (e.g., a `User.firstTouchVisitorId String?` column set once at signup) so it's available to server-side billing code that has no browser context (Stripe webhooks run server-side with no cookies/localStorage — they cannot read `visitorId` directly; it has to be looked up from the `User` row).

**Step 2 — Give billing events a persisted, queryable `visitorId` at write time.** Concretely: in `webhook/route.ts`, before calling `trackServer('subscription_created', {...})` etc., do a cheap `db.user.findUnique({ where: { id: userId }, select: { firstTouchVisitorId: true } })` (using the new column from Step 1) and pass it through to `trackServer` as an additional property, which then needs a matching `visitorId` field written to the new column from Step 1 rather than buried in `properties`.

**Step 3 — Persist billing amounts as first-class, not JSON-blob, fields.** Add:

```prisma
  amountCents Int?    @map("amount_cents")   // from invoice.amount_paid / amount_due
  planKey     String? @map("plan")           // 'starter' | 'team' | 'growth' — new/current plan
```

populated only on the billing event types (`subscription_created`, `subscription_updated`, `subscription_canceled`, `payment_succeeded`, `payment_failed`). This turns "sum revenue by day/week" from a JSON-blob scan into `SELECT SUM(amount_cents) ... GROUP BY DATE(created_at)` — the same class of fix the companion review recommended for `visitorId`, applied to money.

**Does `AnalyticsEvent.properties` need to become native JSONB? — No, not on the current database engine, and this needs to be said precisely because it's easy to over-generalize from the SEO review's finding.**

`schema.prisma:6` — `provider = "sqlite"`, confirmed live in production by `compose.hostinger.yaml:25` (`DATABASE_URL=file:/app/data/ledgerium.db`). **Prisma's `Json` field type maps to `TEXT` on SQLite** — there is no native binary JSONB storage engine on SQLite the way there is on Postgres, so changing `properties String?` to `properties Json?` in the schema would not, by itself, unlock indexed JSON path queries the way it would on Postgres. The SEO review's "not JSONB, no index" framing describes a real gap, but the *fix* is engine-dependent:

- **On the current SQLite engine (fix now, cheap, additive):** pull the specific hot fields (`visitorId`, `amountCents`, `planKey`) out to first-class typed columns as specified above. This is a small additive migration, works today, and is the recommended immediate action regardless of any future database migration.
- **On a future Postgres engine (the eventual state — see §4, this migration is already independently recommended for reliability reasons unrelated to analytics):** at that point, switching `properties` to native `Json`/`Jsonb` and adding a GIN or expression index (`(properties->>'someField')`) becomes genuinely valuable for ad-hoc fields that don't justify a first-class column. Until that migration happens, don't invest in JSONB-specific tooling — it buys nothing on SQLite.

**Step 4 (optional, higher-value, do after Steps 1-3 land and prove out) — an explicit revenue-delta ledger.** Rather than reconstructing "new/expansion/churned MRR" by diffing point-in-time state, add one row per state transition at the moment each webhook fires:

```prisma
model RevenueEvent {
  id           String   @id @default(uuid())
  occurredAt   DateTime @default(now()) @map("occurred_at")
  entityType   String   @map("entity_type")   // 'user' | 'team'
  entityId     String   @map("entity_id")
  eventType    String   @map("event_type")    // 'created'|'upgraded'|'downgraded'|'canceled'|'renewed'
  planFrom     String?  @map("plan_from")
  planTo       String?  @map("plan_to")
  mrrDeltaCents Int     @map("mrr_delta_cents")
  stripeEventId String  @unique @map("stripe_event_id")   // idempotency

  @@index([occurredAt])
  @@index([entityType, entityId])
  @@map("revenue_events")
}
```

This is genuinely the cleanest way to answer "new/expansion/churned MRR this week" — Stripe's webhook payload has everything needed at the exact moment each event fires; today that computation is thrown away (only current-state fields are written). Note that today, only `workspace_downgraded` (`route.ts:275-280`) carries both `fromPlan` and `toPlan` in a single event — every other `subscription_updated` emission carries only the new plan, so reconstructing "what changed from what" after the fact, from the existing event stream alone, is not fully possible even with Steps 1-3 done; Step 4 closes that gap at the source.

---

## 3. The revenue metric set

Small, trustworthy, and each with an exact source. Deliberately excludes GSC/SEO signals — those belong to the SEO/AEO track and would dilute this one.

| # | Metric | Exact definition | Source (canonical, until app-DB gaps close) |
|---|---|---|---|
| 1 | **MRR** | Σ over subscriptions with `status ∈ {active, past_due}` of (monthly-normalized price: full price if `interval=month`, `annual_price/12` if `interval=year`) | **Stripe** (Dashboard → Billing, or `subscriptions.list`) — Stripe already tracks `status`, `items[].price.unit_amount`, `items[].price.recurring.interval` per subscription natively; no reconstruction needed. Once §1.2's three app-DB gaps are fixed, the app DB (`getSubscriptionBreakdown()`) becomes a valid *secondary* source. |
| 2 | **New MRR / Expansion MRR / Churned MRR** (weekly) | Σ `mrrDeltaCents` from the revenue-delta ledger (§2 Step 4), bucketed by ISO week, split by `eventType` | App DB (once §2 Step 4 ships) or Stripe's own subscription event stream read directly |
| 3 | **Trial→Paid conversion rate** | Of subscriptions with `trial_start` in cohort-week W, the fraction with ≥1 `invoice.payment_succeeded` at `status transitioning to active` | **Stripe** (has `trial_start`/`trial_end` natively) until the app DB persists a `trialStartedAt` field |
| 4 | **Paying customers, by plan** | `COUNT(*)` where `status ∈ {active, past_due}`, grouped by plan, **including Team-table rows** (fixes §1.2b) | App DB, once fixed, or Stripe |
| 5 | **ARPU** (blended + per-plan) | Metric 1 ÷ Metric 4 | Derived — no new instrumentation needed once 1 and 4 are correct |
| 6 | **Gross churn (customers) / Revenue churn (MRR)** | Customers/MRR lost to cancellation this period ÷ customers/MRR at period start | Revenue-delta ledger (§2 Step 4) or Stripe |

**Recommendation on canonical source until the app-DB fixes land:** treat **Stripe as ground truth**, read manually (Dashboard) or via a small script against the API, for weekly decision-making. The app-DB "Est. MRR" tile is a good *secondary/at-a-glance* signal once it's fixed, but it should not be the number the CEO makes decisions from until §1.2's three bugs are closed — right now it is not simply "approximate," it is systematically biased upward (trial misclassification, annual-interval overcounting) and structurally blind to a Team/Growth-table drift that will only compound over time.

**What to deliberately leave out of this set:** activation rate, MAU, upload counts — these are product-health leading indicators, genuinely useful, but they are not revenue metrics and including them here would violate the "few and trustworthy" instruction. Keep them on the existing admin dashboard's other sections, not the revenue section.

---

## 4. Unit economics

### 4.1 What can be said from the repo — infrastructure as shipped

Single Hostinger VPS running one Docker Compose stack (`compose.hostinger.yaml`):

- **`web`** — the Next.js app itself, SQLite-backed (`DATABASE_URL=file:/app/data/ledgerium.db`, `:25`), all product data (`User`, `Workflow`, `Upload`, `AnalyticsEvent`, etc.) on one named volume `ledgerium-data` (`:21`).
- **`backup`** — a sidecar running the same image, cron-driven, writing to a *separate* volume `ledgerium-backups` (`:60-141`) so a `docker volume rm ledgerium-data` doesn't destroy backups alongside the data — a real, deliberate improvement documented in the compose file's own comments, but explicitly **not** off-host storage unless `BACKUP_S3_URI`/`AGE_RECIPIENT`/AWS credentials are actually set (`:130-135`, all default to empty string).
- **`umami` + `umami-db`** — self-hosted Umami analytics with its **own dedicated Postgres instance** (`:148-191`), isolated from the product DB on a separate volume.

**Cost-to-serve is not instrumented anywhere in this repo.** There is no per-customer usage-metering table, no cloud-billing-API integration, no cost-allocation logic of any kind. This is itself a finding worth stating plainly for the CEO: *unit economics today can only be reasoned about from architecture, not measured* — there is no code path that would tell you "customer X cost us $Y this month to serve."

### 4.2 Grounded capacity-ceiling facts (from `docs/meta/DATABASE_HEALTH_REVIEW_002.md`, 2026-07-01 — re-verified current against source this session)

- `apps/web-app/src/db/index.ts:1-9` is a bare `new PrismaClient()` with **zero connection PRAGMAs** — confirmed unchanged: no `journal_mode=WAL`, no `busy_timeout`, no `foreign_keys=ON`. SQLite permits exactly one writer at a time; the health review cites **~50–100 concurrent write users** as the resulting ceiling, with no `busy_timeout` configured, meaning contention surfaces as `SQLITE_BUSY` failures rather than graceful queueing.
- `AnalyticsEvent` (`schema.prisma:427-440`) lives in the **same SQLite file** as every product table — every billing webhook write, every client analytics beacon, and every user action compete for the same single write lock. Analytics volume and product usage are not isolated from each other.
- **The admin dashboard's own DB-size observability is blank on the actual production database.** `getSystemHealth()`'s `dbSize` query uses `pg_total_relation_size` (Postgres-only), wrapped in try/catch, and **explicitly returns `{ available: false }` on SQLite** (`queries.ts:363-364, 391`, confirmed unchanged). Since production runs SQLite, the `dbSizeBytes` KPI tile (`route.ts:126-128`) is `null` on the live deployment today. There is no proactive signal from the shipped dashboard for "approaching the DB size envelope" — you cannot watch this constraint coming from the admin UI as currently built.
- `/api/workflows` (list route) has no pagination and eagerly includes large JSON-text blobs (`processDefinition: true`) even though only `intelligenceJson` is consumed downstream — the prior review measured **≈22 MB DB→Node transfer per dashboard load at 500 workflows.** This scales with per-account workflow volume, not customer count directly — but Team/Growth accounts (which have *unlimited* recordings, per `plans.ts:96,113`) are precisely the accounts most likely to accumulate enough workflow rows to make this expensive, and they are also the accounts contributing the most to MRR.
- **Uploads/evidence storage shares the same disk and the same volume as the live database.** `UPLOAD_DIR=/app/data/uploads` (`compose.hostinger.yaml:27`) is on `ledgerium-data`, the same volume as `ledgerium.db`. `Upload.fileSizeBytes Int?` is captured per row (`schema.prisma:77`) so this is measurable *in principle*, but nothing aggregates it — no `SUM(fileSizeBytes)` query exists anywhere in the codebase I could find — so total evidence-storage consumption is currently invisible, same as DB size.
- **No encryption at rest** (`DATABASE_HEALTH_REVIEW_002.md` P0-5): the live SQLite file, raw recording uploads, and (if unencrypted) backups are cleartext on the VPS disk. For a product whose entire value is recorded internal-workflow evidence — the kind of screen data the repo's own sensitivity/policy-engine work exists to redact in the first place — this is a compounding liability as customer count grows, not a static risk.

### 4.3 At 105 customers, does the current architecture hold?

**Grounded answer, not a guess: raw hosting cost is very unlikely to be the binding constraint at N=105 customers. The binding constraint, if there is one, is usage *shape*, not headcount.**

- The single-writer SQLite ceiling (~50–100 *concurrent write* users, not 50–100 total customers) means 105 customers who mostly aren't writing at the same instant pose little risk by themselves. But Team ($249) and Growth ($799) tiers explicitly grant *unlimited* recordings and up to 15 seats each (`plans.ts:95-133`) — a small number of heavy Team/Growth accounts, actively recording, is a very different write-concurrency profile than 105 mostly-Starter accounts doing occasional uploads. The tiers that do the most work toward $20k MRR are structurally the tiers most likely to stress the single-writer ceiling first.
- **Where it concretely breaks first, in likely order:**
  1. **Backup/evidence storage growing unbounded on the same volume as the live DB, with no aggregate-size alerting anywhere in the admin surface.** This is a slow-burn risk that the shipped dashboard cannot currently warn about (§4.2).
  2. **Write contention from a handful of heavy Team/Growth accounts**, well before raw customer count reaches 105 — because the ceiling is shaped by concurrent writes, not customer count, and the highest-ARPU tiers are the heaviest writers by design.
  3. **The unbounded `/api/workflows` list-query cost**, which scales per-workflow-in-account — again, precisely the unlimited-recording Team/Growth accounts are most exposed, and they are the same accounts carrying the most MRR.
- The migration path off SQLite is already identified and scoped as low-risk by the prior architecture review — Postgres is already running in-stack today for Umami (`compose.hostinger.yaml:178-191`), so the operational pattern is proven, just not applied to the product DB. This is out of this track's charter (analytics/measurement, not infrastructure), but it is directly relevant to whether $20k MRR is *servable* once reached, so it's flagged here as a dependency for the engineering track to own — not re-derived, since a specialist review already did that work.

---

## 5. A measurable definition of progress — dashboard spec

Extend the **existing** `apps/web-app/src/app/api/admin/operations/route.ts` / `AdminOperationsDashboard.tsx` surface — this is a fix-and-extend problem, not a new-build problem.

**New section: Revenue** (add alongside the existing User Volume / Recording Volume / Workflow Processing / System Health sections):

| Tile | Definition | Cadence | Blocked on |
|---|---|---|---|
| MRR (current) | §3 metric 1 | Live/daily | Stripe operationalized (§6) + §1.2 fixes, OR read manually from Stripe until then |
| New / Expansion / Churned MRR (this week) | §3 metric 2 | Weekly | §2 Step 4 (revenue-delta ledger) |
| Trial→Paid conversion (trailing cohort) | §3 metric 3 | Weekly | §1.3 (trialStartedAt) or Stripe API read |
| Paying customers by plan (incl. Team/Growth) | §3 metric 4 | Live/daily | §1.2b (Team-table fix) |
| ARPU (blended + per-plan) | §3 metric 5 | Weekly | Derived from above |
| Progress-to-$20k bar | Current MRR ÷ $20,000, plus a trailing-4-week growth-rate-projected weeks-to-target | Weekly | Current MRR (above) |

**Explicit exclusions from this section, on purpose:** GSC impressions/clicks/CTR, scroll depth, FAQ engagement, related-link click-through. Those are top-of-funnel SEO/AEO health metrics and belong on a different cadence and a different track — mixing them into a revenue dashboard dilutes exactly the "few and trustworthy" property this section is supposed to have. (Once §2's attribution join lands, one *derived* row — "SEO-attributed New MRR this week" — is legitimate to add here, since it's a revenue outcome, not a top-of-funnel signal; the underlying SEO health metrics themselves still don't belong on this dashboard.)

**Interim, pre-automation weekly check (until the above ships):** a two-part manual read every Monday — (1) Stripe Dashboard → Billing → Analytics for MRR/churn/trial-conversion (canonical, correct today, requires no engineering); (2) the existing "Est. MRR" tile as a rough cross-check, understood to be biased upward per §1.2 until fixed.

**What "on track" means:** a straight-line (or observed-trailing-growth-rate) trend from *current, actually-measured* MRR to $20,000 by a CEO-set date. This cannot be populated with a number here — there is currently no measured MRR to draw the line from (§0). That is itself the finding: the CEO cannot yet answer "are we on track" because there is no baseline to be on-track *from*.

---

## 6. What Stripe operationalization unlocks

**This is the actual, singular blocking dependency for everything in this document.** Every metric above requires real subscriptions to exist; today, none do.

- `compose.hostinger.yaml:35-44` — every `STRIPE_*` environment variable defaults to an empty string in the live deploy manifest (`${STRIPE_SECRET_KEY:-}`, `${STRIPE_WEBHOOK_SECRET:-}`, all six `STRIPE_*_PRICE_ID` vars). Per `STRIPE_SETUP.md`'s own troubleshooting section ("Billing not configured for this plan" HTTP 503), an unset price ID means checkout **cannot complete** — `getPriceId(plan, interval)` resolves to `null` and the route returns 503 before Stripe is ever reached.
- Everything on the code side is genuinely done — checkout (`checkout/route.ts`), the 6-event webhook handler (`webhook/route.ts`, quoted extensively above), billing portal (`portal/route.ts`), 5-tier pricing page (`pricing/page.tsx`), and the 14-day trial logic have all shipped (per `STRIPE_SETUP.md` "What's already built in code" and confirmed directly in source this session). **What remains is entirely operator-side, non-engineering work**, per the runbook's own final section ("What to do AFTER you finish this runbook"): create the products/prices in the Stripe Dashboard, configure the webhook endpoint, and set the resulting IDs/secrets as live environment variables.

**The moment real subscriptions exist** (Stripe operationalized per the runbook's Steps 1-6):

- Every webhook-driven field (`User.plan`, `User.subscriptionStatus`, `Team.plan`, `Team.subscriptionStatus`, `stripeCustomerId`, `stripeSubscriptionId`) starts reflecting real state, subject to the three biases in §1.2 until those are also fixed.
- The already-shipped "Est. MRR" admin tile starts showing a real (if currently biased) non-zero number instead of $0 — no code change needed for this specific tile to activate.
- The full `trackServer()` billing-event pipeline (`subscription_created`, `subscription_updated`, `subscription_canceled`, `payment_failed`, `payment_succeeded`, `trial_will_end`, `workspace_downgraded`, `workspace_canceled`) starts writing real, timestamped `AnalyticsEvent` rows — this is the raw material every metric in §3 is ultimately built from. The pipeline is fully wired today; it is simply silent, because there is nothing flowing through it.
- Stripe itself becomes directly usable, via Dashboard or API, as an out-of-band canonical MRR/churn/trial-conversion source — completely independent of the app-DB gaps in §1 and §2. This is the fastest path to a *trustworthy* number, and it requires zero engineering: recommend the CEO treat Stripe's own Billing Analytics as the primary weekly read the moment real customers exist, rather than waiting for the app-DB fixes to land first.

---

## 7. Summary of what to do, in order

1. **Operationalize Stripe** (§6) — non-engineering, CEO/operator-owned, per `STRIPE_SETUP.md` Steps 1-6. This unblocks every other item below; nothing else in this document has any data to work with until this happens.
2. **Fix the three MRR-correctness bugs** (§1.2): stop marking trial subscribers as `active` at checkout; make `customer.subscription.updated` sync `User.plan` when a Team-linked subscription changes (or, better, make `getSubscriptionBreakdown()` read `Team` directly instead); persist billing interval and normalize annual prices to monthly-equivalent.
3. **Land the visitorId + amount schema promotion** (§2 Steps 1-3) — small, additive, works on SQLite today, does not require any database migration to be useful.
4. **Add the revenue-delta ledger** (§2 Step 4) — this is what actually answers "new/expansion/churned MRR this week," which nothing today can answer even in principle.
5. **Build the Revenue section on the existing admin-operations dashboard** (§5), gated behind steps 1-4.
6. **Track the SQLite→Postgres migration as an engineering-track dependency** (§4) — not urgent at N=105 by headcount alone, but the heavy Team/Growth accounts that drive most of the $20k MRR target are exactly the usage shape that stresses the current single-writer architecture first; the migration path is already low-risk and identified by a prior specialist review.

Until step 1 happens, the honest answer to "are we on track to $20k" is: **there is no track to be on yet — there is no measured revenue.** That absence is itself the most important finding in this document.
