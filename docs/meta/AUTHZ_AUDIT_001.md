# AUTHZ_AUDIT_001 — Web-app authorization traversal

Scope: every `route.ts` under `apps/web-app/src/app` (72 files, one of them the NextAuth catch-all), plus page-level loaders.
Method: read-only. Handlers were read for the checks described below; "verified" means I followed the code path end to end in the files cited. Nothing was executed, and no database or deployment was inspected.
Reference for team roles: `src/lib/team-roles.ts` (owner > admin > member > viewer; `isRoleElevation` only blocks a non-owner granting `owner`).

Page loaders and server actions: there are no `'use server'` actions. Every `(app)` page is a client component that calls the API, except `admin/operations/page.tsx`, which checks `isAdminUnlimited(session.user.email)` and then calls `notFound()`. `middleware.ts` only checks that a session cookie exists, on `/dashboard /workflows /upload /account /analytics /recommendations`. It does not cover `/teams`, `/admin` or `/compare`, and it does not cover `/api`. Authorization therefore rests entirely on the route handlers.

## Severity definitions

Written by the auditor, amended 2026-10-02 (see Amendment log). The original audit used these grades without stating them.

- **P0:** an ordinary self-registered account, or an anonymous caller, can today gain privilege it was not granted or read another tenant's or user's data, with no precondition beyond what the attacker controls. Fix before anything else.
- **P1:** the same class of harm (privilege escalation, cross-tenant or cross-user access, account takeover), but it needs a stated condition the attacker does not control (a particular database state, a role someone already granted, an unclaimed address), or its blast radius is one team. Where the condition is unverified, the grade is P1 and the finding states the query that would promote it to P0.
- **P2:** weakens a control or leaks limited data, needs a precondition plus an extra step, or is a defence-in-depth gap whose primary control currently holds.
- **P3:** hygiene, low-sensitivity information disclosure, inconsistency, or an exposure with no current exploit path.

Status values: OPEN, FIXED (commit), CHANGED (partly mitigated or altered). "Grade" is the grade at audit time unless marked otherwise.

## Summary counts

- Routes reviewed: 72
- P0: 0 (as graded at audit time; see the re-assessment of P1-1 and P1-2)
- P1: 3
- P2: 5
- P3: 9

Status as of 2026-10-02 (post-audit commits d983e42, e1a9af5, 6700fb5, read in the current tree): P1-1 FIXED, P1-3 FIXED, P1-2 CHANGED (801b5fd), P2-2 CHANGED (0e2d134 + loop 110), P3-7 CHANGED (6700fb5, 6fcde8b). Updated at loop 110 per MR-049 pattern 4. Per-finding status is on each finding.

Mass assignment: none found. Every PATCH/POST builds `data:` field by field. `workflows/[id]` PATCH uses `.passthrough()`, but the unknown keys are never copied into `data` (`workflows/[id]/route.ts:209-214`). IDOR on the workflow, portfolio, tag, insight, baseline and API-key trees: none found. Every fetch and mutation goes through `findFirst({ where: { id, userId } })`, `deleteMany({ where: { id, userId } })` or an equivalent owner scope.

## Per-route table

Authn key: S = session, K = API key, C = cron secret, A = admin allowlist (`canAccessAdmin` / `isAdminUnlimited`, by session email), F = `session.user.isAdmin` (DB flag carried in the JWT), TM = active team member, ANON = anonymous.

| Route / method | Authn | Object scoping | Verdict |
|---|---|---|---|
| auth/[...nextauth] | ANON (login) | n/a. Login IP rate limit is spoofable (P2-2) | OK, see P2-2 |
| auth/signup POST | ANON | n/a. No email verification (F-P1-2) | DEFECT (P1-2) |
| auth/forgot-password POST | ANON | token bound to the account email, hashed | OK |
| auth/reset-password POST | ANON + token | token hash + email + unused + unexpired; no session revocation (P2-1) | OK / see P2-1 |
| me GET, me/extension-status GET, account GET | S | own user and own keys | OK |
| keys GET/POST/DELETE | S | `{id, userId}` (`keys/route.ts:79-87`) | OK |
| dashboard/preferences GET/PUT | S | `userId` is the unique key | OK |
| streaks GET | S | `userId` | OK |
| workflows GET (list) | S | `where.userId` (`workflows/route.ts:376-378`); tag and portfolio filters sit under that scope | OK |
| workflows/[id] GET/PATCH/DELETE | S | `{id, userId}` (`workflows/[id]/route.ts:42,201,283`); tagIds re-checked to caller's tags (:231) | OK |
| workflows/[id]/share GET/POST/DELETE | S | workflow `{id, userId}`; DELETE scoped `{id: shareId, workflowId}`. Team branch ignores member `status` (F-P3-2) | OK / P3 |
| workflows/[id]/ask, baseline, export-json, export-markdown, export-bpmn, integration-risk, variants, analyze, agent-intelligence, agent-composition | S | all `{id, userId}`; `analyzeWorkflowVariants`, `analyzeWorkflowAgentIntelligence` and `loadProcessOutput` all re-scope by `userId` | OK (`ask` has no plan gate: NEEDS-REVIEW) |
| baselines GET, baselines/[id] DELETE | S | `userId`; delete via `deleteMany({id, userId})` | OK |
| tags GET/POST, tags/[id] PATCH/DELETE | S | `{id, userId}` | OK |
| insights/[id] PATCH | S + plan | `{id, userId}`; data = `dismissed` only | OK |
| portfolios GET/POST, portfolios/[id] GET/PATCH/DELETE, portfolios/[id]/workflows POST/DELETE | S (+plan on [id] routes) | portfolio `{id, userId}`; parent `{id, userId}`; workflowIds re-checked as owned (`workflows/route.ts:61-69`) | OK. `GET /portfolios` is ungated while the others are gated (P3) |
| process-definitions GET, analytics GET/POST, analytics/compare, analytics/process-diff, analytics/time-sinks, agent-intelligence/portfolio | S + plan | all `userId`-scoped; `workflowIds` filtered by `userId` | OK |
| analytics/extension POST | ANON, IP rate limited | writes telemetry; `signin_linked` validates the key silently | OK |
| analytics/events POST | ANON or S | `userId` comes from the session, else from the client body (`analytics/events/route.ts:47`) | DEFECT (P2-5) |
| analytics/events GET, analytics/engagement GET, analytics/retention GET | F | global data, including user emails on engagement | DEFECT (P1-1) |
| (app)/analytics/product page | F (client) | calls the three routes above | DEFECT (P1-1) |
| share/[token] GET | ANON + bearer token | `shareToken` + `status: active`; the token is logged to analytics (F-P3-4) | OK / P3 |
| sync POST | K | `apiKey.userId`; upload path built from server-side ids | OK |
| upload POST | S | `userId` | OK |
| teams GET | S | `where: { userId }` with no `status` filter (`teams/route.ts:30`) | DEFECT (P2-3) |
| teams POST | S + plan | creator becomes owner | OK |
| teams/[id]/invite POST | S, TM owner/admin | membership `status: active` (:86); role validated and elevation-checked (:103-111) | OK (see P2-4 for acceptance) |
| teams/[id]/invite GET | S, any active member | the list shows pending invite emails and roles to viewers (:299-314) | P3 |
| teams/[id]/invite/[inviteId] DELETE | S, TM owner/admin | invite `{id, teamId}` | OK |
| teams/[id]/members GET | S, any active member | team scoped; `status=all` also lists removed members | OK |
| teams/[id]/members DELETE | S, TM owner/admin | no hierarchy check on the target (:146-187) | DEFECT (P1-3) |
| teams/[id]/members/[memberId] PATCH/DELETE | S, TM owner/admin | no hierarchy check on the target (:61-104, :128-170) | DEFECT (P1-3) |
| invites/accept POST | ANON (token probe) or S | token hash; invitee email must equal invite email | DEFECT (P2-4) |
| billing/checkout POST, portal GET, one-time-purchase GET, audit-eligibility GET, sku-availability GET | S (sku-availability ANON) | own user/customer; `purchase.userId` checked (`one-time-purchase/route.ts:41`) | OK |
| billing/webhook POST | Stripe signature (`constructEvent`, :132) | metadata ids from signed events | OK (not deep-audited) |
| admin/alerts GET/POST, admin/cleanup-events GET, admin/disputes GET, admin/operations GET, admin/backup-status GET, admin/seed-sample-variants POST, admin/users/[id] GET | A (404 on miss) | n/a. `cleanup-events` deletes via GET (P3) | OK / P3 |
| admin/alerts/check GET | C (Bearer, timing-safe, 503 if unset) | n/a | OK |
| admin/email-test POST, admin/normalize-emails POST, admin/password-reset-link POST | A or ops token (HMAC of `NEXTAUTH_SECRET`) | n/a | OK / P3 (F-P3-7) |
| admin/bootstrap POST | S, any user | promotes the caller to `isAdmin` when no admin row exists (`:96-109`) | DEFECT (P1-1) |
| sample-variants, sample-workflow, seed-demo-data POST | S | own `userId` | OK |
| health GET | ANON | exposes DB size, disk and email provider (F-P3-5) | P3 |
| llms.txt GET, (public)/sop-templates/[slug]/download.md GET | ANON | static content | OK |

## Findings

### P1

**P1-1. Two admin definitions, and a self-service path into the weaker one.** Verified by reading the code. The precondition is a database state I could not check.
- **Grade at audit time: P1, conditional P0.** Under the definitions above, exploitation needed a production state the attacker does not control (no `User.isAdmin = true` row). The coordinator later treated `DISABLE_ADMIN_BOOTSTRAP` as closing this in production. Reading `compose.hostinger.yaml` shows the variable is set in `deploy.yml` but never delivered to the container (MR-045 section 1), so that barrier did not exist. That left only the database state. If a production query had shown no `isAdmin` row, this was a P0 (any self-registered account reads every user's email and plan). I did not run that query and have not seen its result, so P1 stands as the auditor's grade with the P0 trigger stated. MR-045 judged it a P0 candidate; that is the correct handling of an unverified condition.
- **Status: FIXED, e1a9af5 (loop 98).** Verified in the current tree: `admin/bootstrap/route.ts` returns 410 for every caller with no auth, DB access or env read; `analytics/events` GET gates on `canAccessAdmin` and `analytics/product/page.tsx` on `isAdminUnlimited`; `User.isAdmin` is no longer consulted for authorization in `src`. The JWT may still carry the flag, but nothing reads it for authorization.
- Code path: `admin/bootstrap/route.ts:96-109` is callable by any logged-in user. If no `User` row has `isAdmin: true`, it sets `isAdmin: true` on the caller. Four surfaces gate on that flag, not on the allowlist: `analytics/events/route.ts:116`, `analytics/engagement/route.ts:30`, `analytics/retention/route.ts:25` and `(app)/analytics/product/page.tsx:218,325`. `admin-allowlist.ts:33` states that `User.isAdmin` is "no longer consumed for gating decisions". That statement is false for these routes. Only the `DISABLE_ADMIN_BOOTSTRAP=true` env var, a per-IP rate limit (spoofable, see P2-2) and an `X-Admin-Bootstrap-Confirm` header (not a secret) stand in the way.
- Exploit: if production has no `isAdmin` row (the allowlist replaced it), any self-registered user claims the flag, logs in again, and can read global product analytics and the engagement route's list of every user's email, name, plan and activity.
- Fix: gate the three analytics routes and the page on `canAccessAdmin(session)`, as the other admin routes do. Remove `/api/admin/bootstrap`, or require the allowlist.
- Related: `isAdmin` is copied into the JWT at login (`auth.ts:66,73`). A revoked flag keeps working for up to 7 days (see P2-1).

**P1-2. Allowlist trusts an unverified email, and signup has no verification.** Verified by reading the code. The precondition is that an allowlisted address has no account yet.
- **Grade: P1, conditional P0. Status: CHANGED, 801b5fd (loop 105)** — signup now refuses the allowlisted admin addresses with the same answer as an already-registered address, so the squat path described below is closed for new accounts. Still OPEN: no email verification anywhere (`emailVerified` absent), and a squat that happened *before* loop 105 would persist — the CEO's case-insensitive one-row-per-address query is the check. (Status updated by the coordinator; grade unchanged.) The condition is that an allowlisted address has no stored account whose email matches exactly in lower case (MR-045 and MR-046 section 4: signup lower-cases and checks, so a legacy mixed-case row does not block registration). The attacker controls none of that state, which keeps this at P1. The impact is the highest in the audit: full admin, including `admin/password-reset-link` (takeover of any account). Since e1a9af5 removed the bootstrap path, **this is the only remaining self-service route to admin** (MR-046 section 4). That raises its priority, not its grade. It becomes P0 if either allowlisted address lacks an exact lower-case `User.email` row. I have not seen that query's result.
- Code path: `signup/route.ts:63-100` creates an account for any email string with no ownership proof. `emailVerified` appears nowhere in the app. `canAccessAdmin` (`admin-allowlist.ts:38-41`) and `isAdminUnlimited` (`feature-gating.ts:76,99`) grant admin and enterprise entitlements purely from `session.user.email`.
- Exploit: register an allowlisted address that is not yet registered, for example a second address added to the list later. The attacker is an admin immediately. Admin includes `admin/password-reset-link`, which mints a reset URL for any account (account takeover), and `admin/users/[id]`.
- Fix: require verified email before the allowlist or entitlements apply, or key the allowlist on user id. Check that every allowlisted address already has an account. I did not check this.

**P1-3. A team admin can strip or demote owners, and can end up as the only controller.** Verified by reading the code.
- **Grade at audit time: P1. Status: FIXED, d983e42 (loop 97).** The attacker must already hold the `admin` role on a team, which an owner has to grant, and the harm stays inside that one team: no cross-tenant access and no escalation from a plain account. The coordinator re-graded this to P0 at intake citing "the audit's own P0 definition"; the audit had no such definition, and under the definitions above the grade is P1. A granted admin role is a stated condition. The result is serious for that team (zero active owners) but bounded. The commit adds the hierarchy rule and an active-owner count to the three handlers; I did not re-run its tests.
- Code path: `members/[memberId]/route.ts` PATCH (:61-104) and DELETE (:128-170), and the body-based `members/route.ts` DELETE (:146-187). The check is only "caller is owner or admin". `isRoleElevation` (`team-roles.ts:24`) blocks setting `owner`, but there is no rule against acting on an owner.
- Exploit: an admin PATCHes an owner to `member`, or DELETEs the owner. The sole-owner guard counts owner rows with no `status` filter (`:87`, `:146`, `members/route.ts:164`), and removal only sets `status: 'removed'` and leaves `role: 'owner'` (`:164-170`, `members/route.ts:180`). A removed owner therefore still counts, so the guard keeps passing. Repeating this removes or demotes every owner, and the workspace ends up with no owner. This is the same class as loop 95: one route enforces the hierarchy and the others do not.
- Fix: add one shared rule in `team-roles.ts`, for example "actor must outrank the target, and only an owner may modify an owner". Call it from all three handlers. Count only `status: 'active'` owners in the sole-owner check.

### P2

**P2-1. Sessions cannot be revoked.** Verified. **Status: OPEN** (JWT strategy and 7-day `maxAge` unchanged; no `sessionVersion` or `passwordChangedAt` in `src`). Since e1a9af5 removed `isAdmin` from authorization, the stale-admin-flag leg no longer matters; team removal and password reset still do. JWT strategy, 7-day `maxAge` (`auth.ts:57-62`). `reset-password` (`route.ts:73-82`) does not invalidate sessions. Team removal and `isAdmin` changes persist for the token lifetime. Routes that only read `session.user.id` keep working for a deleted user and fall back to empty results. Fix: add a `sessionVersion` or `passwordChangedAt` column and check it in the `jwt` callback.

**P2-2. Per-IP throttles are spoofable.** Verified. **Status: CHANGED, 0e2d134 (loop 107) + loop 110** — login and forgot-password now also have a per-*account* limit that header rotation does not bypass (fixed-size, not resettable by other traffic, parallel-safe). Per-IP spoofing itself is still OPEN (#225), and is now the precondition for a mass over-throttle of the per-account table (#290(5)). Signup and invite-accept remain per-IP only. Bootstrap, one of the affected throttles, is now retired. `client-ip.ts` defaults `TRUSTED_PROXY_HOPS` to 0 and returns the first `X-Forwarded-For` entry. Login (`auth.ts:33`), signup, forgot-password, bootstrap and invite-accept throttles can be bypassed by rotating that header. Already tracked as row #225. Whether the hosting proxy overwrites the header is unverified.

**P2-3. `GET /api/teams` ignores the caller's own membership status.** Verified. **Status: OPEN.** `teams/route.ts` still selects memberships by `userId` only. The nested `members` list is now filtered to `status: active`, so a removed member no longer sees removed peers, but a removed caller still receives the team and its active members' email, name and role. `teams/route.ts:30-44` filters on `userId` only. A removed or deactivated member still receives the team and the email, name and role of every active member. Fix: add `status: 'active'` to the membership filter.

**P2-4. An invite stays valid after its inviter loses authority.** Verified. **Status: CHANGED (partly fixed by 942dd2c, loop 95).** The accept path now refuses an `owner` invite unless the inviter is still an active owner, refuses invalid role strings, and refuses admin-created owner invites. It still does not re-check the inviter for `admin` or `member` invites, or the seat quota, so the core of this finding remains OPEN. `invites/accept/route.ts:248-256` re-checks the inviter only when `role === 'owner'`. An `admin` or `member` invite created by someone who has since been removed or demoted can still be accepted for up to 7 days. The seat quota is also not re-checked at acceptance. Fix: for every role, require the inviter to be an active owner or admin at acceptance.

**P2-5. Anonymous analytics ingestion trusts client identity.** Verified. **Status: OPEN.** `analytics/events` POST still stores `userId ?? event.userId`, `event.event` and `event.source` from the body. Later commits to this route (batch-loss and truncation reporting) did not change identity handling, and I found no rate limit. `analytics/events/route.ts:47-52` stores `event.userId`, `event.event` and `event.source` from an unauthenticated body, with no rate limit and no size cap beyond 100 events per batch. Anyone can write events attributed to any user id with names such as server-side events. The data feeds the admin dashboards. Fix: ignore body `userId` and reserved event names, and rate limit.

### P3

- **P3-1.** `invite GET` (`:299-314`) allows any active member, viewers included, to list pending invitee emails and roles. POST and DELETE require owner or admin.
- **P3-2.** `workflows/[id]/share` POST, team branch (`:152`) accepts a membership of any `status`. `WorkflowShare` rows are written but no code reads them (`grep workflowShare` finds only this route), so the grants currently do nothing. NEEDS-REVIEW: whoever adds a reader must enforce share permissions.
- **P3-3.** `share POST` (`:121-124`) tells an authenticated caller whether an email has an account. Signup's 409 does the same.
- **P3-4.** `share/[token]` (`:44-48`) writes the raw bearer share token into analytics. It lands in the `AnalyticsEvent` table and in PostHog.
- **P3-5.** Anonymous `/api/health` (`:40-86`) reports DB size, free disk percentage and the email provider name.
- **P3-6.** `admin/cleanup-events` deletes through a GET (`:25-100`). An admin who follows a crafted link triggers a delete (SameSite cookie behaviour not verified).
- **P3-7 (status: CHANGED, 6700fb5, 6fcde8b).** Since 6fcde8b the secret is also restricted to `[A-Za-z0-9+/=_-]` before the deploy's shell sees it, and startup refuses if `AUTH_SECRET` (read before it) is set. `NEXTAUTH_SECRET` is now required by compose and rejected at startup if it is a placeholder or under 32 characters, so the signing secret can no longer be a public default. The ops token is still derived from it with no rate limit, so the credential reuse remains OPEN. Original text: The ops-token path (`password-reset-link:79-92`, `email-test`, `normalize-emails`) derives its credential from `NEXTAUTH_SECRET` with no rate limit. It is not exploitable without the secret, but it reuses the session-signing secret as an API credential that can mint password-reset links.
- **P3-8.** Plan gating is uneven across similar actions. `GET /portfolios` is ungated while the `[id]` routes require `sharedLibrary`. `baseline POST`, `share` and `PATCH enableSharing` have no plan check. `workflows/[id]/ask` has no plan check (an LLM cost surface, NEEDS-REVIEW against product intent).
- **P3-9.** `middleware.ts` does not cover `/teams`, `/admin` or `/compare`. This is harmless today because the APIs enforce, but it adds a layer that is missing.

Status of the other P3 findings (P3-1 to P3-6, P3-8, P3-9): OPEN. No later commit touched them (checked by reading: `invite` GET still requires only an active member; share and health routes unchanged since the audit).

## Not verified

- Production data: whether any `isAdmin` row exists (P1-1), and whether every allowlisted email already has an account (P1-2).
- Deployment: whether the reverse proxy overwrites `X-Forwarded-For`, and the value of `TRUSTED_PROXY_HOPS` (P2-2).
- Only skimmed for authorization, not read in full: `billing/webhook`, `billing/checkout`, `upload` (past the auth and path code), `workflows` list enrichment, `dashboard/preferences` payload validation, `lib/workspace/*`, `lib/intelligence.ts`.
- Prisma schema constraints and indexes were not checked beyond a status-column grep.
- Client components and their handling of API errors were not reviewed.
- Nothing was run, including the tests.

## Amendment log

**2026-10-02.** Amended by the original auditor at the coordinator's request, per the MR-045 ruling that an intake re-grade goes back to the auditor and is not a coordinator promotion path.

- Added the severity definitions at the top. The audit previously had none. The coordinator's intake re-grade of P1-3 to P0 cited "the audit's own P0 definition", which did not exist. **Any re-grade in this document is now the auditor's, not the coordinator's.**
- Re-assessed P1-1, P1-2 and P1-3 against the definitions with current facts. P1-3 stays P1 (needs a granted team role, one-team blast radius); the intake P0 re-grade is not upheld by these definitions. P1-1 stays P1 with an explicit P0 trigger (no `isAdmin` row in production), because the deploy-default mitigation never reached the container (MR-045 section 1). P1-2 stays P1 with an explicit P0 trigger (an allowlisted address with no exact lower-case account row) and is now the only self-service path to admin (MR-046 section 4).
- Status: P1-1 FIXED e1a9af5; P1-3 FIXED d983e42; P1-2 CHANGED 801b5fd; P2-2 CHANGED 0e2d134 + loop 110. P2-4 CHANGED (942dd2c, owner path only). P3-7 CHANGED (6700fb5). Other P2 and P3 findings OPEN.
- Method: status was verified by reading the current tree. Nothing was executed, no tests were run, and the production queries named above have not been seen.
