# Growth Review 001 — Architecture & Data Model

**Date:** 2026-09-02
**Author:** system-architect (read-only review; zero product code changed)
**Question:** What in the codebase and data model blocks growth, or breaks between 0 and ~105 paying customers?
**Method:** Direct source read of every file cited. Prior review documents (`docs/meta/REVENUE_PLAN_20K/team_workspace_status.md`) were used as a claim source to verify *against*, not as ground truth — two of its findings have since been closed and one of its framings is wrong.

---

## 0. Bottom line

Three corrections to the framing this review was commissioned under, in descending order of consequence:

1. **"Team/Growth require a multi-user workspace data layer that does not exist" is not accurate.** The workspace data layer largely *does* exist and is reasonably mature: `Team`, `TeamMember`, `TeamInvite`, `WorkflowShare`, workspace-scoped `ApiKey`, and a full workspace billing column set are all in `schema.prisma` today, with a complete API surface (`/api/teams`, invite, accept, members, role-change) and 154 passing tests. What does not exist is **content sharing** — no team member can see another's work — and, more seriously, **team-scoped intelligence** (§1.3).

2. **The prior "3–5 weeks" estimate is partly stale.** Its single largest line item — wiring `effectivePlanFor` into `checkFeatureAccess` and `checkRecordingLimit`, estimated at 3–5 days — **has since shipped**. `feature-gating.ts:78` and `:163` both resolve the effective plan today. That estimate should not be re-quoted without re-verification.

3. **The deepest ceiling is not the one anyone has named.** The entire process-intelligence layer is *user-partitioned by schema construction* — `ProcessDefinition.userId`, `ProcessFamily @@unique([userId, familySlug])`, `CanonicalComponentRecord @@unique([userId, canonicalVerb, canonicalObject])`. Two teammates recording the same process produce two unrelated `ProcessDefinition` rows with no cross-person clustering. This is what Team tier is actually sold on, and it is not a read-path fix. See §1.3 — it is the dominant risk to any estimate given below.

On the other two questions: **SQLite is not a near-term constraint** and I do not recommend migrating (§2). Entitlements **are** enforced server-side and the design is sound; the holes are narrow and one is operational rather than code (§3).

---

## 1. The multi-user gap

### 1.1 What already exists (verified in source)

| Component | Status | Evidence |
|---|---|---|
| `Team` model + workspace billing columns | **Exists** | `schema.prisma:514-582` — `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus`, `billingInterval`, `pendingInvoiceUrl`, `lastSubscriptionEventAt` |
| `TeamMember` with soft-delete lifecycle | **Exists** | `schema.prisma:584-620` — 4-value `status` union, `deactivatedAt`, `reactivationDeadline`, `@@unique([teamId, userId])` |
| `TeamInvite` with token + revocation | **Exists** | `schema.prisma:622-652` — `token @unique`, `revokedAt`, `acceptedBy`, `expiresAt` |
| `WorkflowShare` (user + team share types) | **Exists — but never read** | `schema.prisma:654-670`; see §1.2 |
| Workspace-scoped API keys | **Exists** | `schema.prisma:117-120` — `teamId` with `onDelete: Cascade` |
| Team management API | **Exists** | `/api/teams`, `/api/teams/[id]/invite`, `/invite/[inviteId]`, `/members`, `/members/[memberId]`, `/api/invites/accept` |
| Effective-plan resolution across workspaces | **Exists and is wired** | `feature-gating.ts:262-335`; consumed at `:78` and `:163` |
| Seat-quota enforcement under concurrency | **Exists** | `SERIALIZABLE` transaction in `invite/route.ts` |

This is not a greenfield build. Purchase is blocked by an explicit, deliberate gate — `checkout/route.ts:65` `BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD = new Set(['team','growth'])`, returning HTTP 402 at `:305-318`. Removing that gate is a one-line change. **It should not be removed yet**, for the reasons below.

### 1.2 What is genuinely missing: content sharing

Two structural facts, both verified directly:

**(a) No content model is workspace-scoped.** `Workflow` (`schema.prisma:146-193`) has `userId` and no `teamId`. `Portfolio` (`:229-251`) has `userId` and no `teamId` — despite the plan flag gating it being literally named `sharedLibrary`.

**(b) `WorkflowShare` is written but never read.** `POST /api/workflows/[id]/share` creates rows with `shareType: 'team'`, but no read path queries the table:

- `workflows/route.ts:332-335` — `const where: Prisma.WorkflowWhereInput = { userId: session.user.id, status }`
- `workflows/[id]/route.ts:42-43`, `:201-202`, `:284-285` — all `findFirst({ where: { id: params.id, userId: session.user.id } })`

Net effect: an owner can share a workflow, receive `200 OK`, and the teammate gets `404`. **There is currently no mechanism by which a second person can see anything a colleague recorded.** That is the product Team tier is priced on.

**Scope of the fix is larger than "a few read paths."** I counted ownership-check sites across the API surface: **114 occurrences across 46 route files.** Excluding correctly user-scoped ones (billing, auth, teams, admin, dashboard preferences), roughly **55 sites across ~28 content-bearing route files** would need a workspace-aware access predicate — `workflows` and its 10 sub-routes, `portfolios` ×3, `tags` ×2, `baselines` ×2, `insights`, `process-definitions`, and 5 `analytics` routes.

### 1.3 The estimate-killer: intelligence is user-partitioned by schema

This was not flagged in any prior review and is the most consequential finding in this document.

The analysis pipeline does not merely *filter* by user — it **clusters** by user:

- `ProcessDefinition.userId` (`schema.prisma:321`)
- `ProcessFamily @@unique([userId, familySlug])` (`:311`)
- `CanonicalComponentRecord @@unique([userId, canonicalVerb, canonicalObject])` (`:416`)
- `GroupRelationship.userId` (`:425`), `ProcessInsight.userId` (`:452`)

The uniqueness constraints are the problem, not the FKs. They mean process grouping, variant detection, and component canonicalization are computed *within a single user's data by construction*. If five teammates on a Team plan each record the same invoice-approval process, the system produces five separate `ProcessDefinition` rows, five separate variant sets, and zero cross-person insight.

The Team value proposition — "see how your whole team runs this process," variance *between people*, which teammate's path is fastest — is exactly the thing the current partitioning makes impossible. Adding `teamId` to `Workflow` and an `OR` clause to read paths makes teammates able to *see each other's workflows*. It does **not** make the intelligence layer team-aware.

There are two honest responses, and the choice drives the estimate more than anything else:

- **Scope A — "shared visibility."** Teammates can see, open, and export each other's workflows and SOPs. Intelligence stays per-person. Sellable, honest, materially useful; requires the pricing page to describe a shared library rather than team-wide process analytics.
- **Scope B — "team intelligence."** Re-scope the clustering keys from user to workspace, backfill/recompute existing definitions, and handle the migration of the three `@@unique` constraints. This is a re-architecture of the analysis pipeline's partition key, not a feature.

I would ship Scope A first and sell it as what it is.

### 1.4 Day estimate

Working days, one engineer, including tests. **Scope A only.**

| Work | Days | Notes |
|---|---:|---|
| Access-predicate helper module (`workspaceScopedWhere(user)`) + design | 1.0 | One shared primitive; avoids 55 bespoke fixes |
| `teamId` on `Workflow` + `Portfolio`, index, migration | 0.5 | Additive nullable column — the low-risk migration shape |
| Write path: stamp `teamId` at ingest (`upload`, `sync`) | 1.0 | Needs active-workspace resolution; MVP is 1 workspace/user |
| Apply predicate across ~28 files / ~55 sites + test updates | 5.0 | Mechanical but each site needs review; sampled, not fully enumerated |
| Role semantics — `viewer` must not write | 2.0 | `TeamMember.role` exists (owner/admin/member/viewer); **no route reads it for content today** |
| "Shared with me" UI + minimal workspace context | 2.5 | |
| Invite email via existing `lib/email.ts` | 0.5 | Infra exists (SMTP-first); genuinely small |
| P0-F: missing `else` branch in `teams/page.tsx handleCreate()` | 0.25 | Backend already returns the CTA contract |
| Remove checkout gate + rewire pricing CTAs off `mailto:` | 0.5 | |
| E2E pass (signup → checkout → webhook → invite → accept → shared view) | 2.5 | Requires live Stripe test-mode; cannot be done statically |
| **Total** | **~15.75** | **≈ 3 calendar weeks** |

**Call it 13–18 working days for Scope A.** Not 5 days; not 5 weeks.

**What would make this wrong — in order of likelihood:**

1. **If Scope B is the real requirement, this estimate is meaningless.** Re-partitioning the clustering keys plus recompute/backfill is a separate multi-week effort with real data-migration risk. This is the single biggest variable and it is a *product* decision, not an engineering one.
2. **I sampled the 55 ownership sites; I did not read all 28 files.** I read `workflows/route.ts`, `workflows/[id]/route.ts`, `portfolios/*`, `upload`, `sync`. If several others resolve ownership indirectly (through a `processDefinition` join, or raw SQL), each becomes bespoke. Each surprise is ~+0.5 day. Reading all 28 files first would cost half a day and would materially tighten this number — **do that before committing to a date.**
3. **Role enforcement is budgeted at 2 days but has never been implemented anywhere.** `TeamMember.role` is written and read for *team management* only. Deciding viewer/editor semantics across ~20 mutating endpoints could easily be 4 days.
4. **`DEMO_MODE_DISABLE_TEAMS` may still be `true` in production.** `.github/workflows/deploy.yml:141` defaults it to `'true'` unless a repo variable overrides. If unset, `POST /api/teams` and the invite endpoint return 404 in production right now. **This is a GitHub Actions variable and cannot be verified from the repository — check it before anything else.** 2 minutes; potentially the highest-leverage action available.
5. Estimate could come in *low* if Scope A is narrowed further to workflows-only (drop portfolios/tags/analytics scoping): ~8–10 days.

---

## 2. SQLite in production

**Verdict: not a near-term constraint. Do not migrate now.** The evidence does not support it at ~105 customers, and migrating would consume the exact weeks needed for §1.

### 2.1 What is genuinely fine

**Backups are well engineered** — better than most startups at this stage. `scripts/db-backup.sh` uses the `sqlite3 .backup` API (a consistent online snapshot, not `cp`), runs `PRAGMA integrity_check` on the copy before trusting it (`:112`), optionally encrypts with `age`, uploads off-host to S3-compatible storage, writes a machine-readable status file, and couples evidence-file backup *before* the DB snapshot so `source_bundle` rows never reference un-backed-up files. `scripts/db-restore.sh` exists. This is not a weak point and should not be "fixed."

**Write volume is trivial at this scale.** Transactional writes are uploads, workflow rows, and billing webhooks — at 105 customers, plausibly a few hundred writes/day. SQLite handles orders of magnitude more.

### 2.2 What is actually risky — and it is not customer count

**(a) WAL is not enabled.** I grepped the entire repository for `journal_mode`, `WAL`, `busy_timeout`, and `PRAGMA` — **zero configuration hits** outside one migration comment. `src/db/index.ts` is a bare `new PrismaClient()` with no connection parameters, and `DATABASE_URL=file:/app/data/ledgerium.db` (`compose.hostinger.yaml:25`) carries no query params. Default SQLite journal mode is `DELETE`, under which **writers block readers and readers block writers**. WAL would let readers proceed during writes. This is a one-line change with a large tail-latency benefit and should be done regardless of customer count.

**(b) The dominant write source is an unauthenticated endpoint, not customers.** `POST /api/analytics/events` (`analytics/events/route.ts:10-54`):
- **Requires no authentication** — it attempts `auth()` inside a `try` and proceeds regardless (`:20-25`)
- Accepts up to 100 events per request
- Inserts them in a **serial `for` loop of individual `create()` calls** (`:42-44`) rather than `createMany` — 100 separate write transactions
- Has **no rate limit** — I confirmed no rate-limit import in the `analytics` route directory, and `middleware.ts` performs only a session-cookie redirect check with no throttling

Anyone can drive 100 serialized writes per request against a single-writer database with no credentials. On a `DELETE`-journal SQLite this stalls readers app-wide. **This is a self-inflicted availability risk that is independent of how many customers you have** — it is the thing most likely to make SQLite look like the problem when it is not.

**(c) `AnalyticsEvent` grows unbounded, and the read path loads it all into memory.** Cleanup exists only as a manual admin endpoint (`/api/admin/cleanup-events`, default `dryRun=true`) — no cron, no scheduled job. Meanwhile `GET /api/analytics/events:77-80` does `findMany({ where: { createdAt: { gte: since } } })` with **no `take`**, then aggregates in JavaScript across four passes. With 90 days of `page_viewed` events at even modest traffic this is hundreds of thousands of rows into Node heap on one request. This will break on the admin dashboard well before SQLite breaks on write throughput.

**(d) Migrations use `prisma db push`, not `prisma migrate deploy`.** `scripts/docker-start.sh:58`. To the team's credit, `--accept-data-loss` was removed after a real 2026-05 data-loss incident, and a pre-push backup of every `ledgerium.db` runs first (`:38-49`). But `db push` diffs schema against live DB and is not a transactional, versioned, reviewable migration — even though a `prisma/migrations/` directory exists. Additive nullable columns (what §1 needs) are the safe case. Anything requiring a table rebuild — which on SQLite means create/copy/drop/rename — is where this bites.

### 2.3 When does SQLite actually become the constraint?

- **~105 customers, single container:** fine. Not the bottleneck.
- **The real trigger is architectural, not numeric:** the first moment you need **two application instances** (horizontal scale, zero-downtime deploys, or a background worker process), SQLite-on-a-local-volume ends. A file-backed DB cannot be shared across containers. Note the in-memory rate limiters (`lib/rate-limit/*`) have the same single-instance assumption.
- **Secondary trigger:** any workload with sustained concurrent writes — which today would be caused by (b) above, not by customers.

**Recommendation: keep SQLite. Enable WAL, fix the analytics ingest path, bound the analytics read path, and schedule the retention job.** Revisit Postgres when you need a second instance — and plan it deliberately then, not reactively.

---

## 3. Entitlement enforcement

**Enforcement is server-side and the core design is sound.** It is not bypassable from the client in any way I could find.

### 3.1 How it works

`checkRecordingLimit(user)` — `feature-gating.ts:158-174`:
1. Admin allowlist bypass by email (`isAdminUnlimited`)
2. Resolve **effective** plan via `effectivePlanForUser` — max of solo plan and all active workspace plans (`:331-335`)
3. Look up `maxRecordingsPerMonth` from `PLAN_FEATURES` (`plans.ts:75`); free = 5
4. Unlimited plans short-circuit before touching the DB
5. Otherwise `getMonthlyUploadCount` counts `Upload` rows with `uploadedAt >= ` first-of-month UTC (`:180-190`)

Called at both ingest paths, and only those two exist: `upload/route.ts:28` (browser) and `sync/route.ts:66` (extension, API-key authenticated). Feature gates use the same effective-plan resolution at 17+ call sites — I verified every `checkFeatureAccess` call is `await`ed against the async, workspace-aware version.

**Two design decisions here are notably good and worth preserving:**
- Quota counts **actual `Upload` rows**, not a mutable counter. The legacy `User.uploadCount` field (`schema.prisma:72`) is vestigial and no longer load-bearing — so quota cannot be reset by tampering with a counter.
- **There is no upload-deletion path anywhere in the codebase** (grep for `upload.delete` returns zero matches). A user therefore cannot free quota by deleting recordings. This closes the most common quota-reset exploit, apparently by accident, but it holds.

### 3.2 Holes

| # | Hole | Severity | Detail |
|---|---|---|---|
| 1 | **Dunning has no code-side cutoff** | **Medium — direct revenue leak** | `webhook/route.ts:440` — `isActive = status === 'active' \|\| 'past_due' \|\| 'trialing'`, and the paid plan is retained for all three. A `past_due` subscriber keeps full entitlement indefinitely *as far as this codebase is concerned*. Revocation depends entirely on Stripe eventually canceling the subscription and firing `customer.subscription.deleted` — which is a **Stripe Dashboard retry/cancellation setting**, not code. Grace on `past_due` is a reasonable deliberate choice; having no code-side backstop and no verification of the Dashboard setting is not. **Verify the Stripe dunning configuration.** |
| 2 | **TOCTOU race on the quota check** | Low | `checkRecordingLimit` counts, then the caller creates — not atomic. Two concurrent uploads at `used = 4` both pass. Bounded, low-value to exploit, and SQLite's single writer narrows the window further. Fix only if it shows up in data. |
| 3 | **Unauthenticated analytics writes** | Medium (availability, not entitlement) | §2.2(b). Not an entitlement bypass, but it is an unauthenticated write to the production database. |
| 4 | `customer.subscription.trial_will_end` still trusts mutable `subscription.metadata.userId` | Low | The other three subscription events were migrated to `stripeSubscriptionId` DB lookups; this one was not. Notification-only, no DB write. ~30 min. |

**Wrongly-blocked risk: low.** The previously-real failure mode — a Free user invited to a paid workspace still capped at 5 recordings — is fixed; `checkRecordingLimit` resolves the workspace plan. The one deliberate asymmetry, `checkSoloFeatureAccess` at `teams/route.ts:81` (team *creation* ignores workspace membership), is correct and documented: otherwise a free member of someone's paid workspace could spin up unlimited teams.

---

## 4. Ranked structural work

### Blocks revenue now

| # | Item | Est. | Why |
|---|---|---:|---|
| 1 | **Verify `DEMO_MODE_DISABLE_TEAMS` in live GitHub Actions variables** | 2 min | May be returning 404 on team creation in production right now. Cannot be checked from the repo. Do this first. |
| 2 | **Decide Scope A vs Scope B** (§1.3) | — | A product decision that changes the estimate by weeks. Everything below assumes Scope A. |
| 3 | **Team-scoped content visibility** — `teamId` on `Workflow`/`Portfolio` + shared access predicate across ~55 sites | 8–10 d | The actual reason Team/Growth are unsellable |
| 4 | **Role semantics** — enforce `viewer` as read-only | 2–4 d | Shipping shared write access without this is worse than not shipping |
| 5 | **Verify Stripe dunning configuration** (§3.2 #1) | 30 min | Revenue leak on every failed payment; config, not code |
| 6 | Invite email via existing `lib/email.ts` | 0.5 d | Currently invite = copy a link and paste it into Slack yourself |
| 7 | P0-F — missing `else` branch in `teams/page.tsx handleCreate()` | 0.25 d | Free user clicks "Create Team," button silently re-enables, no message. First touch of the feature. |
| 8 | Remove `checkout/route.ts` gate + rewire pricing CTAs | 0.5 d | **Only after 3, 4, 6, 7.** Doing it sooner sells seats that grant nothing. |

### Will break later (fix cheaply now)

| # | Item | Est. | Trigger |
|---|---|---:|---|
| 9 | **Rate-limit + authenticate `POST /api/analytics/events`; switch to `createMany`** | 0.5 d | Unauthenticated 100-write amplifier against a single-writer DB. Cheapest high-value fix on this list. |
| 10 | **Enable WAL + explicit `busy_timeout`** | 0.5 d | Removes reader/writer blocking. One-line-ish, benefits everything. |
| 11 | **Bound `GET /api/analytics/events`** — pagination or SQL aggregation instead of loading all rows into Node | 1 d | Admin dashboard OOMs before SQLite struggles |
| 12 | **Schedule the analytics retention job** | 0.5 d | Cleanup endpoint exists but is manual and defaults to `dryRun=true`; table grows unbounded |
| 13 | `prisma db push` → `prisma migrate deploy` | 1–2 d | Not urgent for additive migrations; matters the first time a table rebuild is needed |
| 14 | 30-day `reactivationDeadline` cleanup job | 1 d | Field is written, never read. Dead data, not a break. |
| 15 | `trial_will_end` metadata → `stripeSubscriptionId` lookup | 30 min | Consistency with the other three events |
| 16 | Postgres migration | — | **Do not schedule.** Trigger is "we need a second app instance," not a customer count. |

### The one that isn't on the list

**Scope B — team-scoped intelligence** (§1.3). Not estimated here because it needs a product decision first. If the answer is "Team tier must show cross-teammate process analytics," this becomes the largest item in the review and everything above is a prerequisite to it rather than a substitute.

---

## Appendix — files read

`apps/web-app/prisma/schema.prisma` · `src/db/index.ts` · `src/middleware.ts` · `src/lib/plans.ts` · `src/lib/feature-gating.ts` · `src/lib/analytics-server.ts` · `src/app/api/billing/checkout/route.ts` · `src/app/api/billing/webhook/route.ts` · `src/app/api/workflows/route.ts` · `src/app/api/workflows/[id]/route.ts` · `src/app/api/sync/route.ts` · `src/app/api/upload/route.ts` · `src/app/api/analytics/events/route.ts` · `src/app/api/admin/cleanup-events/route.ts` · `scripts/docker-start.sh` · `scripts/db-backup.sh` · `compose.hostinger.yaml` · `apps/web-app/package.json` · `docs/meta/REVENUE_PLAN_20K/team_workspace_status.md` (verified against, not trusted)

**Not verified — requires a live environment:** `DEMO_MODE_DISABLE_TEAMS` repo variable · `SMTP_PASSWORD` secret · Stripe Dashboard dunning/retry configuration · end-to-end checkout → webhook → invite → accept flow.

**Not read (acknowledged estimate risk):** the ~23 content route files beyond the sampled set whose ownership-check shape is assumed rather than confirmed (§1.4 risk 2).
