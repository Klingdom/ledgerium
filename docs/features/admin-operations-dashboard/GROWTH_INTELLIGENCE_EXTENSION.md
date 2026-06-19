# Admin Operations Dashboard — Growth Intelligence Extension (DECIDED SPEC)

**Type:** CEO-directed multi-agent design (6 specialists: product-manager, analytics, system-architect, ux-designer, growth-strategist, frontend-engineer).
**Date:** 2026-06-18
**Directive:** improve the admin area to understand signup volume, workflow update/upload volume, subscription levels, and other helpful metrics.
**Extends (does NOT rebuild):** `/admin/operations` — `route.ts`, `src/lib/admin-operations/{queries,types}.ts`, page at `src/app/(app)/admin/operations/`.

---

## 1. Key reality check (scopes the work)

The **signup trend, workflow trend, and upload trend daily series ALREADY EXIST** in the API response (`userVolume.newUsersTimeSeries`, `workflowProcessing.workflowsTimeSeries`, `recordingVolume.uploadsTimeSeries`). They are simply not surfaced as dedicated trend charts in the UI. → **Trends = mostly a frontend job.**

The **genuinely new backend surface is the Subscription Breakdown + MRR**, plus a few new scalars/tiles. The data exists today: `User.plan` (free/starter/team/growth/enterprise), `User.subscriptionStatus` (none/trialing/active/past_due/canceled), `Stripe` ids.

---

## 2. Decided metric set

**P0 (this program):**
- **Subscription breakdown:** users by plan tier + by subscription status (counts + %).
- **Estimated MRR:** `Σ price[plan] × count(plan=P AND status='active')`; Starter 49 / Team 249 / Growth 799; enterprise excluded (count shown separately). Label "Est. MRR". `active`-only.
- **Paying subscribers**, **Active trials**, **Free→Paid conversion %** (= activePaid / totalUsers).
- **Signups-in-range** scalar (sum of existing newUsersTimeSeries) as a KPI tile.
- **Activation rate** = distinct users with ≥1 non-deleted workflow / totalUsers.
- **Workflow update volume** daily series (`Workflow.updatedAt` in range, status≠deleted) — engagement signal distinct from creation.
- **Surface existing trends** (signup + workflow + upload) as dedicated charts.

**Deferred / out of scope (per growth lens — premature at current scale):** churn-rate %, cohort retention, expansion/contraction MRR waterfall, ARR/LTV/CAC, team-level drill-down, DAU via updatedAt proxy, PostHog proxying, per-user drill-down, real Stripe API calls. MRR-by-tile accent only once revenue is real.

---

## 3. Decided architecture (backend — Iteration A)

1. **New module `src/lib/admin-operations/pricing.ts`** — reconcile against existing `PRICING_CONFIG` in `src/lib/config.ts` (do NOT duplicate price literals; import/derive). Exports `MONTHLY_PRICE_USD = {starter:49, team:249, growth:799}`, `MRR_BILLABLE_STATUSES = ['active']`, `ENTERPRISE_PLAN`. Add a test asserting the admin price map equals the billing source.
2. **`getSubscriptionBreakdown()`** in `queries.ts` — range-independent (snapshot, like `getSystemHealth`). **Single compound `db.user.groupBy({ by: ['plan','subscriptionStatus'], _count:{id:true} })`** (CORRECTNESS: marginal groupBys cannot recover the billable intersection — R-5). Fold the joint result into: `byPlan` (Record, zero-filled closed union), `byStatus` (Record, zero-filled closed union), `mrr` (sum price over rows where plan∈billable AND status∈billable), `enterpriseCount`, `paidUserCount`, `conversionRatePct`. Normalize unknown plan strings via the app's `toPlanType` mapper (pro→starter); unknown status → `none`. Deterministic fold over fixed key lists; no `Date.now()` in the fold.
3. **Workflow-update series** — extend `getWorkflowVolume` (or add) `workflowUpdatesTimeSeries: DailyBucket[]` via `Workflow.findMany({where:{updatedAt in range, status≠deleted}, select:{updatedAt}})` → `binByDay`. JS bucketing (SQL date-trunc is not Prisma-portable — reuse `binByDay`).
4. **Activation rate + signups-in-range** — add to `getUserVolume`: `activationRatePct` (distinct workflow.userId where status≠deleted / totalUsers), `newUsersInRange` scalar.
5. **Types (additive):** `SubscriptionBreakdownSection`, `MrrEstimate`, closed unions `NormalizedPlan`/`NormalizedSubscriptionStatus`; new field `subscriptionBreakdown` on `AdminOperationsResponse`; new fields on `KpiTiles`: `mrrUsd`, `payingSubscribers`, `signupsInRange`, `freeToPaidConversionPct`, `activationRatePct`. Required fields (contract-honest) — update fixtures.
6. **Route:** add `getSubscriptionBreakdown()` to the `Promise.all`; assemble new KPI tiles. Preserve 404 gate, `{data,error,meta}`, range param, ≤2000ms, no-PII (counts only — never emit stripe ids/emails).
7. **Additive migration** — `@@index([createdAt])` on `User`, `@@index([uploadedAt])` on `Upload`, `@@index([updatedAt])` on `User` (recommended). No column/data changes; SQLite+Postgres safe. (`Workflow.createdAt` already indexed.)
8. **Perf:** all queries parallel; verify connection pool ≥ concurrent count or split into 2 `Promise.all` waves; profile against 2000ms.

## 4. Decided UX/frontend (Iteration B)

- **KPI strip → two rows of 5** (avoid cramming): growth row (Total Users, New Signups, Paid Users, Est. MRR, Free→Paid %) + product/ops row (Total Recordings, Activation %, Uploads-in-range, DB Size, Errors 24h). Move heap/DB out of the prime growth row.
- **New "Growth Overview" section** (full-width): signup trend chart (mint) + dual workflow-created/upload chart side by side — reuse `TimeSeriesChart` (iter-073 `useId()` gradient fix is intrinsic; extend with optional `seriesB` prop for the dual chart, ≤15 LOC, non-breaking).
- **New "Subscription Breakdown" section** (full-width): plan-distribution horizontal bar (reuse `PlanDistributionBar`) + subscription-status bar (past_due/canceled amber + warning icon, not color-only) + Est. MRR / conversion spotlight tiles. Table-style for the 5 tiers (LeaderboardTable pattern), not a donut.
- **`formatCurrency`** added to `format-utils.ts` (+ test). MRR labeled "Est." with caveat tooltip (list price × active; excludes discounts/annual/enterprise).
- **States:** empty (no Stripe → "Subscription data unavailable — configure Stripe"), all-trialing note, sparse/flat series render as zero line (not error), loading skeletons reused.

## 5. Build sequence

- **Iter A — backend data layer** (`backend-engineer` + `system-architect` review): pricing module + types + `getSubscriptionBreakdown` + workflow-update series + activation/signups scalars + KPI assembly + additive index migration + tests. Validate: web-app test + typecheck; ≤2000ms.
- **Iter B — frontend** (`frontend-engineer`): KPI strip rework + Growth Overview + Subscription Breakdown sections + `formatCurrency` + TimeSeriesChart `seriesB` + tests.
- **Iter C — QA** (`qa-engineer`): edge cases (zero paid, all trialing, past_due>0, SQLite no-data), perf, a11y, e2e; SHIP verdict.

## 6. Open decisions confirmed by coordinator
- New response/KPI fields **required** (not optional) — fixtures updated in Iter A.
- Headline MRR counts **`active` only**; other statuses surfaced separately (one-line flip in `pricing.ts` if CEO wants trialing included).
- **User-plan MRR only** in Phase 1; team-workspace MRR (`Team.plan`/`Team.stripeSubscriptionId`) is a **known gap (R-2)**, deferred.
- Price map **reconciled with `PRICING_CONFIG`** (R-1) — test enforces equality.

*Mode 3-adjacent design (NON-counting). Build iterations follow.*
