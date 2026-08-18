# Team Workspace — Ground-Truth Status Audit

**Date:** 2026-08-18
**Author:** qa-engineer (read-only audit; zero product code changed)
**Scope:** Verify current code state of every P0/P1 finding from the three prior TEAM_WORKSPACE_* reviews, plus independent verification of whether Team/Growth tiers actually deliver the value they're priced for.
**Method:** Direct source read + `grep`/`git log` verification of every claim below. No claim in this document is taken from a prior review's own "done" marker without being re-checked against the file it claims to have changed.

---

## 0. Bottom line (read this first)

**Team tier is not days away from sellable. It is not weeks away either, if "sellable" means "delivers what the pricing page promises." Realistic estimate: 3–5 weeks of focused engineering**, not counting the manual operational steps (DNS/domain verification, Stripe Dashboard config) that are independent of code.

Two things are true simultaneously and both matter:

1. **The 8 P0s from `TEAM_WORKSPACE_SYSTEMS_TEST_REVIEW_001` are real and 7-of-8 are genuinely fixed in code today.** The team-management backend (invite/accept/remove/role-change/webhook cascade) is in materially better shape than the "still NOT shippable" verdict from three months ago suggests. That verdict is stale for most of its findings.
2. **Three months of silence produced new, more severe problems that none of the four prior reviews (including the systems-test one) ever caught**, because every prior review audited the *team-management* surface (invites, seats, billing sync) and never checked whether being on a paid team actually changes what a member can *do* in the product. It doesn't. See §3.

The self-serve purchase path for Team/Growth is **still hard-blocked** in code today (`checkout/route.ts` returns HTTP 402, unchanged since the gate was added 2026-05-18), and the comment on that gate literally says it reverts "when TEAM-P01 through TEAM-P06 ship" — TEAM-P06 never shipped. So the CEO's instinct that something is still missing before Team can be sold was correct; the specific missing piece is not primarily the 8 old P0s (mostly closed) but a set of gaps none of the four reviews surfaced.

---

## 1. The 8 P0s from `TEAM_WORKSPACE_SYSTEMS_TEST_REVIEW_001` — verified against source

| # | Finding | Claimed status | **Verified status** | Evidence |
|---|---|---|---|---|
| P0-E | `status:'active'` filter missing at 7 team-management call sites (removed-admin session-retention security hole) | done, iter 087 | **CLOSED** | All 7 named sites use `teamMember.findFirst({ where: { ..., status: 'active' } })` today: `invite/route.ts:69,265`, `invite/[inviteId]/route.ts:26`, `members/route.ts:32,107`, `members/[memberId]/route.ts:52,118`. Verified by direct read of every file, not grep-count alone. |
| P0-F | Free user "Create Team" silently fails, no upgrade CTA | done, iter 087 | **PARTIALLY CLOSED — frontend half never shipped** | Backend (`teams/route.ts` POST) returns `{ code: 'plan_upgrade_required', upgradeUrl: '/pricing', ... }` at 403 — this part is real. But `apps/web-app/src/app/(app)/teams/page.tsx` `handleCreate()` only branches on `res.ok`; there is **no `else` clause at all** — on 403 the button just re-enables with the create form still showing raw name input, zero error message, zero CTA. `git log` on that file shows its last substantive edit is **2026-04-15**, three weeks *before* the TEAM-001 build began (iter 081 = 2026-05-XX) and it has never been touched by any of iterations 084-088. The iteration log's claim "P0-F ... shipped" is **not supported by the code** — the frontend consumer of the fix was never written. This is a genuine gap in the review→ship pipeline: the backlog row's own acceptance text ("inline upgrade CTA") was never delivered, only the API contract that a future CTA would consume. |
| P0-G | `team_created`/`team_invite_sent`/`team_invite_accepted` analytics events defined but never fired | done, iter 087 | **CLOSED** | `trackServer('team_created', ...)` in `teams/route.ts:124`; `trackServer('team_invite_sent', ...)` in `invite/route.ts:234`; `trackServer('team_invite_accepted', ...)` in `invites/accept/route.ts:311`. Also `workspace_downgraded`/`workspace_canceled` wired in webhook handler. |
| P0-H | `/teams/join` broken redirect loop for unauthenticated users | done, iter 087 | **CLOSED** | `apps/web-app/src/app/(app)/teams/join/page.tsx:52-59` reads `data.requiresAuth` and redirects to `/signup?token=...&email=...`, preserving the token for post-signup replay. |
| P0-I | Sole-owner protection returns 400 not spec'd 409 | done, iter 087/088 | **CLOSED** | `members/route.ts` DELETE (line 128) and `members/[memberId]/route.ts` PATCH (line 84) + DELETE (line 142) all return `status: 409, code: 'sole_owner_protection'`. |
| P0-J | `checkout.session.completed` non-atomic Team+TeamMember create (orphan-Team race) | done, iter 087 | **CLOSED** | `webhook/route.ts:139-160` wraps `team.create` + `teamMember.create` in an array-style `$transaction([...])`. |
| P0-K | Concurrent invite creation can exceed seat quota (no transaction) | done, iter 087 | **CLOSED** | `invite/route.ts:165-228` wraps the quota re-count and the invite `upsert` in a `SERIALIZABLE` `$transaction`. |
| P0-L | `GET /api/teams` returns deactivated/removed members | done, iter 087 | **CLOSED** | `teams/route.ts:32-33` — `members: { where: { status: 'active' }, ... }`. |

**Net: 7 of 8 fully closed with direct code evidence. 1 of 8 (P0-F) is a confirmed false-closure claim** — the backend contract exists but the UI that was supposed to consume it was never written, and the file that needed to change hasn't been touched since before the project started.

---

## 2. The 12 P1s from `TEAM_WORKSPACE_QUALITY_REVIEW_001` — verified against source

| Finding | **Verified status** | Evidence |
|---|---|---|
| `invoice.payment_failed` has no team path | **CLOSED** | `webhook/route.ts:415-433` team-first block before the solo-subscriber fallback. |
| `Team.subscriptionStatus` column missing | **CLOSED** | `schema.prisma:479` — `subscriptionStatus String @default("active")`, written by `customer.subscription.updated`, `.deleted`, `invoice.payment_succeeded`. |
| Hard-delete loses audit trail | **CLOSED (soft-delete)** | Both DELETE endpoints set `status: 'removed', deactivatedAt: new Date()` instead of deleting the row. |
| Stripe customer ID architecture unresolved (ADR requested) | **STILL OPEN** | `docs/adr/ADR_001_TEAM_STRIPE_CUSTOMER_MODEL.md` does not exist (`docs/adr/` only has ADR-001-type-consolidation and ADR-002-session-memory, both unrelated). The de-facto "modified Option B" (same Stripe customer ID written to both `User.stripeCustomerId` and `Team.stripeCustomerId`) is still undocumented. Low urgency — doesn't block anything functionally, but the "sponsor pays for a workspace they don't belong to" model remains unsupported by design, not just unshipped. |
| 30-day hard-delete/cleanup job missing | **STILL OPEN** | `TeamMember.reactivationDeadline` is stamped on soft-deactivation (`seat-management.ts:105`) but nothing in the codebase ever reads it. No cron, no BullMQ job, no scheduled GitHub Action. Deactivated members just accumulate forever — not a functional break (they don't count toward quota), but it's dead data with no automated resolution path. |
| Webhook trusts mutable `subscription.metadata.userId` | **CLOSED for 3 of 4 events; STILL OPEN for 1** | `customer.subscription.updated`, `.deleted`, and `invoice.payment_succeeded` all now resolve via `stripeSubscriptionId` DB lookup (cryptographically grounded). `customer.subscription.trial_will_end` (`webhook/route.ts:534`) **still reads `subscription.metadata?.userId`** — this was explicitly flagged as `S5.1 P2/LOW` in the systems-test review and assigned to the TEAM-P03.8 deferred list; it was never actually fixed there either. Low severity (notification-only, doesn't write to DB) but still literally the same class of bug the other 3 sites were fixed for. |
| `ApiKey` cascade `SetNull` = security bug | **CLOSED** | `schema.prisma:79` — `team Team? @relation(..., onDelete: Cascade)`, with a doc comment citing the fix. |
| Sole-owner-overflow blocks invites | **CLOSED** | `invite/route.ts:167-200` explicitly excludes owners from the non-owner seat count inside the transaction. |
| SERIALIZABLE 40001/P2034 returns 500 not 409 | **CLOSED** | `invites/accept/route.ts:324-333` catches `err.code === 'P2034'` and returns `409, code: 'serialization_failure', retryable: true`. |
| No rate limit on `/api/invites/accept` | **CLOSED (with a documented, unresolved limitation)** | In-memory per-IP sliding window + 5×404 lockout (`invites/accept/route.ts:37-142`). The cold-start-resets-the-Map limitation is explicitly documented and was CEO-acked per the code comment as an accepted Phase-1 trade-off — this is a legitimately closed decision, not an open bug, provided the production deployment target is a long-running container (Hostinger VM via `compose.hostinger.yaml`, not serverless) — worth a 2-minute sanity check that this deployment model still holds, since the rationale depends on it. |
| No rate limit on `/api/teams/[id]/invite` | **CLOSED** | Per-team 20-invites/hour token bucket, extracted to `lib/rate-limit/invite-buckets.ts` (iter 088), wired at `invite/route.ts:99-111`. |
| `TeamMemberStatusChange` audit table | **STILL OPEN — explicitly deferred, never revisited** | No such model in `schema.prisma`. Deferred at iter 088 "to post-demo" pending the `prisma migrate deploy` swap (TEAM-INFRA-01) — which also never shipped (see §4). Nothing since has picked this up. |
| `hashInviteToken` duplicated across 2 files | **STILL OPEN** | Identical private function defined separately in `invite/route.ts:42` and `invites/accept/route.ts:147`. Cosmetic/DRY only — not a correctness risk since both compute SHA-256 identically — but flagged twice now across two reviews with zero action. |

---

## 3. Findings NOT caught by any of the three prior reviews — the reason "days" was the wrong estimate

All four prior review artifacts (`QUALITY_REVIEW_001`, `PROGRESS_REVIEW_001`, `SYSTEMS_TEST_REVIEW_001`) audited the **team-management** surface — creating a team, inviting, accepting, removing, billing sync. None of them checked whether being a member of a paid Team/Growth workspace actually changes what a user can *do* in Ledgerium. It doesn't, in two structurally significant ways.

### 3.1 `effectivePlanFor` is still not consulted for the decisions that matter

`PROGRESS_REVIEW_001` flagged this as P0-B and claimed 2 of 3 critical sites got fixed (iter 087). Verified:

- `apps/web-app/src/app/api/billing/checkout/route.ts:117` — uses `effectivePlanFor`. **Fixed** (prevents double-billing).
- `apps/web-app/src/app/api/analytics/engagement/route.ts:202` — uses `effectivePlanFor`. **Fixed** (correct plan in analytics).
- The **recording-quota gate** — the review called this `/api/workflows` but it's actually `checkRecordingLimit()` in `feature-gating.ts:113`, consumed by `apps/web-app/src/app/api/upload/route.ts:28` and `apps/web-app/src/app/api/sync/route.ts:66` — **still reads `user.plan` directly, never `effectivePlanFor`.** A Free-tier individual invited into a Team or Growth workspace still gets the Free plan's 5-recordings/month cap. Being invited to a paid workspace gives them zero additional recording capacity.
- **`checkFeatureAccess(user, feature)`, called at 17 separate route files** (`intelligenceLayer`, `sharedLibrary`, `agentComposition`, `crossWorkflowComparison`, `integrationRisk`, `priorityExports` — every plan-gated capability in the product except `teamWorkspace` itself), reads `user.plan` directly in every single call site. `effectivePlanFor` was never wired into `checkFeatureAccess` at all — not at 1 site, not at 3, at **zero**. A Free-tier member of a paid Team workspace gets none of the intelligence layer, none of the shared library, none of the automation-opportunity features that the workspace's plan is paying for.

**Net effect: today, inviting a teammate to a Team or Growth workspace gives that teammate zero additional product capability.** They can see the roster at `/teams/[id]`, and that's it. The value proposition the pricing page sells ("Team includes 5 users... anyone on your team can capture workflows... and act on the intelligence reports") does not function for anyone except the original paying owner.

### 3.2 There is no team-scoped access to any content — "workflow sharing" is dead code

- `Workflow` (schema.prisma:105) has **no `teamId` field**. It is purely `userId`-scoped.
- `Portfolio` (schema.prisma:188) has **no `teamId` field** either — also purely `userId`-scoped, despite the plan-gate literally being named `sharedLibrary`.
- There is a `WorkflowShare` model (schema.prisma:586) that supports `shareType: 'team'`, and `POST /api/workflows/[id]/share` will happily create a row for it. But **`GET /api/workflows` (the list) and `GET /api/workflows/[id]` (the detail view) never query `WorkflowShare` at all** — both filter strictly on `where: { userId: session.user.id }`. Verified directly: `apps/web-app/src/app/api/workflows/[id]/route.ts` lines 42-43, 201-202, 284-285 all use the identical single-owner filter, with no `OR` clause for shared access.
- Consequence: a workspace owner can call the share endpoint, get a `200 OK`, and the invited teammate will get a **404 Not Found** if they try to open that workflow. The share record is written and never read by anything.

**Net effect: there is currently no mechanism, anywhere in the codebase, by which a second person can see a workflow, SOP, or process map that someone else on their team recorded.** This is the single largest gap relative to what the product is priced on ("Team library & portfolios" is advertised on the pricing comparison table at line 86 of `pricing/page.tsx`), and it was not mentioned in any of the three prior multi-agent reviews.

### 3.3 The self-serve purchase path is still hard-gated

`apps/web-app/src/app/api/billing/checkout/route.ts:30` — `BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD = new Set(['team', 'growth'])`, returns HTTP 402 with a waitlist-mailto message. The code comment (line 27): *"Reverts when TEAM-P01 through TEAM-P06 ship. Remove this set + the gate block below at that time."* TEAM-P06 (Members/Settings UI) was superseded by a CEO-directed re-scope (`USER_MANAGEMENT_ACCOUNT_PAGE_REVIEW_001`, 2026-05-23) into rows #159/#160 (Account-page integration) — **neither of which has shipped**. The gate's own stated release condition has never been met. `pricing/page.tsx` still routes the Team/Growth CTAs to `mailto:hello@ledgerium.ai`.

### 3.4 Invite emails were never wired — TEAM-P04 was never shipped

`apps/web-app/src/lib/workspace/team-billing.ts:102` `notifyOwnerOfDowngrade()` is still a literal stub — logs a `console.warn` and returns `{ emailQueued: false, reason: 'stub_not_yet_implemented' }`. More importantly, **the invite-creation flow itself never sends an email at all** — `POST /api/teams/:id/invite` returns `inviteUrl` in the JSON response, and the only consumer is `apps/web-app/src/app/(app)/teams/[id]/page.tsx:121-122`, which does `navigator.clipboard.writeText(inviteUrl)`. Inviting a teammate today is: click Invite → get a link → copy it → paste it into Slack/email yourself. This matches what `TEAM_WORKSPACE_QUALITY_REVIEW_001` originally called "AC-2 email is STUB pending TEAM-P04" — three reviews and 3 months later, it's still a stub. To be clear, this is not a hard functional blocker (the manual link-share path works end-to-end), but it materially undercuts "invite + email delivery within 60s" (AC-2) and is a rough, unpolished first-touch experience for a $249-$799/mo product.

Notable: production-grade transactional email infrastructure **does now exist** — `apps/web-app/src/lib/email.ts` (SMTP-first via Hostinger, Resend fallback, console dev fallback), wired for password-reset. It is a genuinely small lift to wire it into the invite flow (the hard infrastructure problem TEAM-INFRA-01 worried about — Resend domain verification — appears to have been solved a different way, via the existing `hello@ledgerium.ai` mailbox over SMTP). This is the cheapest item on the remaining-work list.

### 3.5 `DEMO_MODE_DISABLE_TEAMS` may still be disabling team creation in production right now

`.github/workflows/deploy.yml:141` — `DEMO_MODE_DISABLE_TEAMS=${{ vars.DEMO_MODE_DISABLE_TEAMS || 'true' }}`. This flag was introduced 2026-05-25 as a **one-week demo-safety measure** (`docs/runbooks/DEMO_MODE_ENV_VARS.md` documents "Demo period (2026-05-25 onward)" and says the default *should* be "unset (endpoints active)"). The deploy workflow's fallback, however, defaults it to `'true'` (disabled) unless a GitHub Actions repository variable explicitly overrides it. If nobody ever set `DEMO_MODE_DISABLE_TEAMS=false` as a repo variable after the demo week ended, **`POST /api/teams` and `POST /api/teams/:id/invite` are returning HTTP 404 in production today, unconditionally, for everyone** — a code-level kill-switch left on by default, three months after its documented purpose expired.

**I cannot verify the live value of this from the repository** — it is a GitHub Actions "vars" context value configured in the repo's Settings → Secrets and variables → Actions → Variables, not something committed to git. **This must be checked directly in GitHub before any other work on this tier begins** — it may be the single highest-leverage 2-minute action available (if the answer is "we forgot to unset it," fixing it is a five-second change).

### 3.6 A parallel, uncommitted, in-progress change is currently touching the same file

At the time of this audit, `git status` shows uncommitted changes to `apps/web-app/src/app/api/billing/webhook/route.ts`, `prisma/schema.prisma`, and `apps/web-app/src/lib/stripe.ts`, plus a new untracked migration `20260818000000_add_billing_interval`, all under an active `docs/meta/REVENUE_PLAN_20K/` workstream (MRR-correctness fix — trial subscriptions were being counted as billed revenue). This is **not** a team-workspace defect, but it means the webhook file — which the Team subscription cascade (§1 P0-J/K, §2) depends on — is mid-flight right now:

```
Test Files  1 failed | 137 passed (138)
     Tests  31 failed | 2427 passed (2458)
```

All 31 failures are in `billing/webhook/route.test.ts`, and all are `Team.subscriptionStatus` / `stripeSubscriptionId`-lookup assertions whose expected call shape changed because of the in-progress `subscriptionStatus`/`billingInterval` refactor (see the diff in `git diff apps/web-app/src/app/api/billing/webhook/route.ts`). This is very likely transient — the person doing the REVENUE_PLAN_20K MRR fix simply hasn't updated the corresponding test file yet — but it means **the webhook path is not currently in a green, committed state**, and whoever picks up Team-tier work next should coordinate with (or wait for) that workstream to land before touching the same file, or the two efforts will collide.

---

## 4. Operational gaps — verified

| Gap | Status | Evidence |
|---|---|---|
| BullMQ + Redis | **Still not installed** | No `bullmq` in `package.json`/lockfile; no `REDIS_URL` anywhere in `deploy.yml` or `compose.hostinger.yaml`. |
| `RESEND_API_KEY` / `EMAIL_FROM` in production | **Present, but superseded by SMTP path** | `deploy.yml:118-125` and `compose.hostinger.yaml:47-55` set both `SMTP_*` (Hostinger, takes precedence) and `RESEND_API_KEY`/`EMAIL_FROM` (fallback). Whether `SMTP_PASSWORD` secret is actually *set* in the live GitHub Actions secrets store cannot be verified from the repo — same class of "requires live check" as §3.5. If it is set, transactional email (password reset, and — once wired — invite email) works in production today via Hostinger SMTP, no DNS propagation wait required. This is materially better news than the 3-month-old reviews assumed (they were planning around Resend + DNS propagation, which appears to have been abandoned in favor of the simpler SMTP-on-existing-mailbox approach). |
| `Team.subscriptionStatus` column | **Exists** | Confirmed in §2. |
| 30-day cleanup job | **Still missing** | Confirmed in §2 — `reactivationDeadline` is written, never read. No cron/scheduled infra of any kind exists in the repo. |
| `prisma db push --accept-data-loss` in production start script | **Partially mitigated** | `scripts/docker-start.sh:52` — comment: *"NEVER --accept-data-loss — this was the trigger of the 2026-05 data loss; we never pass it."* The flag was removed after an actual incident. It still uses `prisma db push` (not `prisma migrate deploy`), so the TEAM-INFRA-01 recommendation to move to transactional migrations is still open, but the specific data-loss vector the reviews were worried about has already been addressed by a different, apparently more urgent, incident response. |

---

## 5. Test suite results

- **Team-specific suites** (`apps/web-app/src/app/api/teams/**`, `apps/web-app/src/app/api/invites/**` — 7 files): **154/154 pass.** Includes `teams/iter-087-p0-flags.test.ts` (the 3 demo-mode flags), all invite/accept/member/role-change paths.
- **Full web-app suite**: 138 test files, 2458 tests, **2427 pass / 31 fail** — all 31 failures isolated to `billing/webhook/route.test.ts`, caused by the concurrent uncommitted REVENUE_PLAN_20K change (§3.6), not by anything team-workspace-specific.
- `DEMO_MODE_DISABLE_TEAMS` gates `POST /api/teams` and `POST /api/teams/:id/invite` to 404 when set; the dedicated `iter-087-p0-flags.test.ts` suite explicitly covers both the on and off states, so this doesn't distort the pass count above — but see §3.5 for why the *deployed* value matters more than the test coverage of it.

**What I could not verify by reading code and must be run against a real environment:**
- Whether `DEMO_MODE_DISABLE_TEAMS` is currently `true` or unset in the live GitHub Actions repo variables (§3.5).
- Whether `SMTP_PASSWORD` is actually populated in the live GitHub Actions secrets (§4).
- End-to-end: a real signup → Stripe Checkout (Team plan, if the gate were removed) → webhook fires → Team row created → invite sent → teammate accepts → teammate uploads a recording and sees a shared workflow. This requires a live database and a live Stripe test-mode webhook; it cannot be exercised from static analysis, and given §3.1/§3.2, it would fail today regardless (teammate would get Free-tier quota and would not see any shared workflow even if one existed).

---

## 6. Ordered remaining-work list with effort estimates

### (a) Genuine ship-blockers — must close before Team/Growth can honestly be sold

| # | Item | Why it blocks | Est. effort |
|---|---|---|---|
| 1 | **Verify + fix `DEMO_MODE_DISABLE_TEAMS`** in live deploy config | If still `true`, team creation/invite literally 404s in prod right now | 5 min (once verified) |
| 2 | **Wire `effectivePlanFor` into `checkFeatureAccess` and `checkRecordingLimit`** | This is the actual value-delivery mechanism; without it, "5 seats on the Team plan" gives 4 of those 5 people nothing | 3–5 days (17 call sites + `checkRecordingLimit`, each needs the caller's workspace context resolved, plus updated tests — this is not a 1-line change per site, since several of these routes don't currently look up team membership at all) |
| 3 | **Team-scoped content visibility** — either give `Workflow`/`Portfolio` a `teamId` and update `GET /api/workflows` + detail routes, or properly wire the existing `WorkflowShare` model into the read paths | This is the entire premise of paying for a workspace; right now sharing is a no-op | 1.5–2.5 weeks (schema migration, list-query changes, access-check rewrite on detail routes, UI for "shared with me," tests) — the largest single item on this list |
| 4 | **Remove the `checkout/route.ts` self-serve gate** and re-enable Team/Growth in Stripe Checkout | Currently hard-blocks purchase regardless of everything else | 1 day mechanical, but should not ship until #2 and #3 are closed, or you are charging for something that doesn't work |
| 5 | **Fix P0-F for real** — add the missing `else` branch in `teams/page.tsx handleCreate()` to render the upgrade CTA the backend already supports | Confirmed still broken; silent failure on the very first interaction a prospect has with the feature | 1–2 hours |

### (b) Quality issues — could ship with known limitations, should not block launch

| # | Item | Est. effort |
|---|---|---|
| 6 | Wire invite creation to actually send an email via the existing `lib/email.ts` (infra already exists) | 0.5–1 day |
| 7 | Ship the Account-page User Management UI (backlog rows #159/#160, CEO-directed 2026-05-23, never executed) — replaces the bare-bones pre-project `/teams` pages | 3–4 days |
| 8 | `WorkspaceSwitcher` (row #143) — only matters once a user can belong to >1 workspace with different active contexts; low priority under the current "single workspace per account at MVP" decision | 2–3 days, defer |
| 9 | `customer.subscription.trial_will_end` — finish the `stripeSubscriptionId` migration that was done for the other 3 webhook events | 30 min |
| 10 | 30-day cleanup job for `reactivationDeadline` (needs BullMQ+Redis or a simple daily GitHub Actions cron hitting a new admin endpoint) | 1 day for the cron-endpoint approach, avoiding the BullMQ/Redis infra lift entirely |
| 11 | `TeamMemberStatusChange` audit table | 0.5 day |
| 12 | `ADR_001_TEAM_STRIPE_CUSTOMER_MODEL.md` — document the de-facto choice | 1–2 hours, docs only |
| 13 | Final E2E pass + literal removal of the waitlist-gate scaffolding (row #146 TEAM-P08) | 2–3 days |

### (c) Nice-to-haves

- `hashInviteToken` de-duplication into a shared module (cosmetic).
- `Team.stripeCustomerId` unique DB constraint (defense-in-depth; app logic doesn't currently rely on it being unique).
- `TeamMember.status` as a Prisma enum instead of a string (type-safety only).
- DB-level sole-owner invariant (currently enforced only in application code, which is consistent everywhere it's checked, but not constraint-backed).
- Bulk-invite CSV, activity feed, plan-change banner (row #145 TEAM-P07 — genuinely deferrable, not core to "does the product work").

---

## 7. Verdict

**Not days. Not really "weeks" in the sense of a quick follow-up either — realistically 3–5 weeks of engineering** to reach a state where Team/Growth can be sold and will actually deliver what the pricing page describes, structured as:

- **Week 1**: verify/fix the demo-mode kill-switch (item 1), wire `effectivePlanFor` everywhere it's missing (item 2), fix P0-F (item 5), wire invite email (item 6).
- **Weeks 2–3**: team-scoped content visibility (item 3) — this is the item that actually makes the product worth $249–$799/month for a team, and it does not exist today in any form. Nothing else on this list matters if this one doesn't ship, because right now a Team subscription literally cannot be used to collaborate on a workflow.
- **Week 4 (parallel-track candidate, could overlap with week 2–3)**: Account-page UI (item 7), final QA pass and gate removal (items 4, 13).
- Operational cleanup (30-day job, audit table, ADR, cron) can trail without blocking launch.

If the bar were only "can a customer complete a Stripe Checkout for the Team plan without the server rejecting the request," that is a **1-day change** (item 4, mechanically). That is explicitly not the right bar — shipping that alone, today, means selling seats that give teammates zero additional product capability and zero ability to see each other's work, which is a worse outcome than the current honest waitlist. The CEO's original instinct — that "days" was too optimistic — was correct, and the actual gap is larger than any of the three prior reviews found, because none of them checked whether the thing being sold actually does anything once purchased.

---

## Appendix — Files read/verified during this audit (primary sources, not review documents)

- `apps/web-app/src/app/api/teams/route.ts`
- `apps/web-app/src/app/api/teams/[id]/invite/route.ts`
- `apps/web-app/src/app/api/teams/[id]/invite/[inviteId]/route.ts`
- `apps/web-app/src/app/api/teams/[id]/members/route.ts`
- `apps/web-app/src/app/api/teams/[id]/members/[memberId]/route.ts`
- `apps/web-app/src/app/api/invites/accept/route.ts`
- `apps/web-app/src/app/api/billing/webhook/route.ts`
- `apps/web-app/src/app/api/billing/checkout/route.ts`
- `apps/web-app/src/lib/feature-gating.ts`
- `apps/web-app/src/lib/workspace/team-billing.ts`
- `apps/web-app/src/lib/workspace/seat-management.ts`
- `apps/web-app/src/lib/email.ts`
- `apps/web-app/src/lib/plans.ts`
- `apps/web-app/src/app/api/upload/route.ts`, `apps/web-app/src/app/api/sync/route.ts`
- `apps/web-app/src/app/api/workflows/route.ts`, `apps/web-app/src/app/api/workflows/[id]/route.ts`, `apps/web-app/src/app/api/workflows/[id]/share/route.ts`
- `apps/web-app/src/app/api/portfolios/route.ts`
- `apps/web-app/src/app/(app)/teams/page.tsx`, `apps/web-app/src/app/(app)/teams/[id]/page.tsx`, `apps/web-app/src/app/(app)/teams/join/page.tsx`
- `apps/web-app/src/app/(public)/pricing/page.tsx`
- `apps/web-app/prisma/schema.prisma`
- `.github/workflows/deploy.yml`, `compose.hostinger.yaml`, `scripts/docker-start.sh`
- `docs/runbooks/DEMO_MODE_ENV_VARS.md`
- `IMPROVEMENT_BACKLOG.md` (rows #139-146, #153-160)
- `ITERATION_LOG.md` (iterations 087-098), `git log` across the above files
- `docs/meta/TEAM_WORKSPACE_QUALITY_REVIEW_001.md`, `docs/meta/TEAM_WORKSPACE_PROGRESS_REVIEW_001.md`, `docs/meta/TEAM_WORKSPACE_SYSTEMS_TEST_REVIEW_001.md` (used as claim source to verify against, not as ground truth)
