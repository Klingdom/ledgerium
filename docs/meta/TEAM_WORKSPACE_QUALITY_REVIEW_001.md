# TEAM_WORKSPACE_QUALITY_REVIEW_001 — Pre-Ship Quality Audit of iter 081-083

**Date:** 2026-05-19
**Mode:** 3-adjacent multi-agent quality review (NON-counting)
**Trigger:** CEO directive verbatim 2026-05-19: *"have subagent fully review team and workspace functionality and make sure billing and seats work properly."*
**Coordinator artifact owner:** AI CTO (this file)
**Status:** DRAFT — CRITICAL FINDINGS surfaced; TEAM-P04 BLOCKED until fixup iterations ship

---

## 1. Executive Verdict — NOT SHIP-READY

**The TEAM-001 backend foundation as shipped at iter 083 close is NOT production-ready for TEAM-P04 launch nor TEAM-P08 literal billing-gate removal.**

6 specialist agents (qa-engineer / backend-engineer / system-architect / security / product-manager / growth-strategist / devops-engineer) audited iter 081-083 in parallel. **Across-agent convergence on 6 P0 BLOCKERS** that render core team/workspace flows non-functional:

1. **`effectivePlanFor` is DEAD CODE** — no API route consumes it for feature-gating. A Team-workspace member whose personal `User.plan` is `'free'` cannot invite teammates. This is the single most critical functional bug. (backend-engineer + system-architect + qa-engineer convergence)

2. **Workspace creation does NOT copy User.plan to Team.plan** — new workspaces default `Team.plan = 'free'` (`maxSeats=1`), causing the first invite attempt to return 402. **No workspace can ever invite a teammate without manual DB intervention.** (product-manager critical Gap)

3. **`checkout.session.completed` does NOT link Stripe customer to Team** — `Team.stripeCustomerId` is never populated at subscription creation. `resolveTeamFromCustomer()` therefore returns null for ALL new team subscribers. The entire downgrade/cancel cascade chain in iter 083 NEVER FIRES for real customers. (product-manager + system-architect convergence)

4. **`@@unique([teamId, email])` blocks re-invite after expiry/revoke** — schema constraint is unconditional. Re-inviting same email after invite expires crashes with Prisma P2002 → HTTP 500. (backend-engineer F1 + system-architect §1)

5. **PRIVILEGE ESCALATION** — admin can self-promote to owner via `PATCH /api/teams/[id]/members/[memberId]` with `role: 'owner'`. Spec says owner-only for owner-elevations; code doesn't enforce it. (security P0-1)

6. **No rate limit on `POST /api/invites/accept`** — enables invite-token enumeration; partial-token leak becomes brute-forceable. (security P0-11)

**Plus 12 P1 issues** blocking TEAM-P08 literal gate removal (Stripe customer ID architecture unresolved / `invoice.payment_failed` has no team path / hard-delete loses audit trail / SERIALIZABLE 40001 returns 500 / sole-owner-overflow blocks invites / webhook trusts mutable metadata / ApiKey cascade is security bug / 30-day cleanup job MISSING / Team.subscriptionStatus column missing / etc.)

**Plus operational gaps**: BullMQ + Redis NOT installed (blocks TEAM-P03.5 + ADMIN-P03 + Resend retry queue); RESEND_API_KEY + EMAIL_FROM not in production environment yet.

---

## 2. Critical Cross-Agent Convergence

### The "effectivePlanFor is dead code" finding (3-of-6 agent convergence)

- **backend-engineer F3**: *"`effectivePlanFor` is dead code — no API route uses it for gating, making team plan elevation non-functional."*
- **system-architect §3**: *"Adoption gap — critical: `effectivePlanFor` is exported but is not called from any API route in the current codebase. Every call to `checkFeatureAccess` and `checkRecordingLimit` still reads `user.plan` directly."*
- **qa-engineer AC-13 CONDITIONAL-FAIL**: *"Gate calls `checkFeatureAccess(user, 'teamWorkspace')` against user's personal plan."*

**Impact**: a CFO who upgrades a Team workspace via Stripe checkout (or whose company gets onboarded by sales) but maintains a Free personal account literally cannot invite anyone to that workspace. The feature is unusable for the most common real-world buyer persona.

### The "Team.plan never gets set" finding (3-of-6 agent convergence)

- **product-manager Gap 2** + **Adjustment 5**: workspace creation doesn't stamp `Team.plan = toPlanType(user.plan)` at creation time
- **product-manager Adjustment 1**: `checkout.session.completed` doesn't create/link a Team row
- **system-architect §4**: Stripe customer ID architecture is unresolved — *"the most consequential architectural question in TEAM-001"*

**Combined impact**: every new workspace ships with `Team.plan = 'free'` → `maxSeats = 1` → first invite returns 402 with "seat limit reached." No workspace can ever invite anyone. Together with the `effectivePlanFor` dead-code finding, this means the **entire team/workspace flow is functionally broken in production today**.

### The "downgrade cascade never fires for real customers" finding

- iter 083 added Team-first resolution to `customer.subscription.updated` and `customer.subscription.deleted`
- But `Team.stripeCustomerId` is never populated at checkout (no team-first block in `checkout.session.completed`)
- Therefore `resolveTeamFromCustomer()` always returns null for real subscribers
- The 6 careful new test cases at iter 083 pass against mocks where `Team.stripeCustomerId` is pre-set; but in production, this state is unreachable

**The iter 083 TEAM-P03 code is correct but unreachable in production until checkout.session.completed is fixed.**

---

## 3. Convergence Matrix — Severity Across Agents

| Issue | qa | backend | architect | security | PM | growth | devops | **Verdict** |
|---|---|---|---|---|---|---|---|---|
| `effectivePlanFor` dead code | CONDITIONAL-FAIL AC-13 | **P0 F3** | §3 critical | — | — | — | — | **P0 BLOCKING** |
| `checkout.session.completed` doesn't create Team | — | **P1 F4** | §4 unresolved | — | **Adjustment 1 critical** | — | — | **P0 BLOCKING** |
| `Team.plan` never set at workspace creation | — | — | — | — | **Adjustment 5 critical** | — | — | **P0 BLOCKING** |
| `@@unique([teamId, email])` blocks re-invite | — | **P0 F1** | §1 Gap | — | — | — | — | **P0 BLOCKING** |
| Admin can self-promote to owner | — | — | — | **P0-1** | — | — | — | **P0 BLOCKING** |
| No rate limit on `/api/invites/accept` | — | — | — | **P0-11** | — | — | — | **P0 BLOCKING** |
| `invoice.payment_failed` no team path | BLOCKER-4 | — | — | — | Adjustment 3 | — | — | **P1 TEAM-P08** |
| `Team.subscriptionStatus` column missing | BLOCKER-4 | — | — | — | §4 | — | — | **P1 TEAM-P08** |
| Hard-delete loses audit trail | — | **P1 F5** | §6 | — | — | — | — | **P1 TEAM-P08** |
| Stripe customer ID architecture unresolved | — | — | **§4 CRITICAL** | — | §4 | — | — | **P1 TEAM-P08 ADR** |
| 30-day hard-delete cleanup job MISSING | — | — | **§5 NON-NEG** | — | — | — | BullMQ infra missing | **P1 TEAM-P08** |
| Webhook trusts `subscription.metadata.userId` | — | — | — | **P1-9** | — | — | — | **P1 TEAM-P08** |
| ApiKey cascade ON DELETE SetNull = security bug | — | — | **§6 NON-NEG** | — | — | — | — | **P1 TEAM-P08** |
| Sole-owner-overflow blocks invites | — | **P1 F6** | — | — | — | — | — | **P1 TEAM-P08** |
| SERIALIZABLE 40001 returns 500 not 409 | — | **P1 F7** | §2 | — | — | — | — | **P1 TEAM-P08** |
| TeamMemberStatusChange audit table | — | — | §1 Gap 3 | — | — | — | — | **P1 traceability** |
| No rate limit on `/api/teams/[id]/invite` | — | — | — | **P1** | — | — | Resend DoS risk | **P1 TEAM-P04 prereq** |
| 5 POLISH copy substitutions | — | — | — | — | — | **§5** | — | **P2 polish** |
| AC-6 status code 400 vs 409 spec deviation | — | — | — | — | **PARTIAL** | — | — | **P2 spec compliance** |
| `effectivePlanFor` no React `cache()` | — | — | §3 perf | — | — | — | — | **P2 non-blocking** |
| VALID_ROLES missing `viewer` | — | — | — | **P1-3** | Gap noted | — | — | **P2 spec consistency** |
| `TeamMember.status` as Prisma enum | — | — | §1 Gap 1 | — | — | — | — | **P2 type safety** |
| BullMQ + Redis NOT installed | — | — | — | — | — | — | **§4 critical** | **P1 infra prereq** |

---

## 4. Acceptance Criteria Status (per product-manager validation)

| AC | Description | Status | Source |
|---|---|---|---|
| AC-1 | Workspace creation gated to Team+ plan | ✅ MET | invite/route.ts:65-76 |
| AC-2 | Invite + email delivery within 60s, 7-day expiry | ⚠️ PARTIAL | email is STUB pending TEAM-P04 |
| AC-3 | Seat-quota enforcement (6th invite → 402) | ✅ MET | invite/route.ts:106-129 |
| AC-4 | Unauthenticated invite acceptance | 🚧 PENDING-UI | backend ready; UI is TEAM-P07 |
| AC-5 | Authenticated invite acceptance with 409 already_a_member | ✅ MET | accept/route.ts:114-119 |
| AC-6 | Role management with sole-owner protection | ⚠️ PARTIAL | enforced but returns 400 not spec'd 409 |
| AC-7 | Member removal with sole-owner protection | ✅ MET | both DELETE endpoints |
| AC-8 | Invite revocation | ✅ MET | invite/[inviteId]/route.ts |
| AC-9 | Plan downgrade soft-deactivation + owner email | ⚠️ PARTIAL | cascade fires; owner email is STUB |
| AC-10 | Plan cancellation cascade | ⚠️ PARTIAL | logic correct BUT contingent on Team.stripeCustomerId being set (currently never set) |
| AC-11 | WorkspaceSwitcher session-persisted active context | 🚧 PENDING-UI | TEAM-P05 |
| AC-12 | Duplicate invite prevention | ✅ MET | invite/route.ts:88-103 |
| AC-13 | Self-invitation prevention | ✅ MET | invite/route.ts:71-73 |
| AC-14 | Free/Starter upgrade CTA in /members route | 🚧 PENDING-UI | TEAM-P06 |
| AC-15 | Invite expiration enforcement | ✅ MET | both accept paths return 410 |

**Net status**: 8 MET / 4 PARTIAL / 0 MISSING / 3 PENDING-UI. But the 4 PARTIAL items + the **non-AC-but-product-critical Gap 2** (checkout doesn't link Team) collectively make end-to-end billing/seats flows NON-FUNCTIONAL.

---

## 5. Required Fixup Iterations Before TEAM-P04

The coordinator originally planned **iter 084 = TEAM-P04** (Resend integration). Given this quality review, **TEAM-P04 cannot meaningfully ship until the P0 blockers close**. The downgrade-notification email TEAM-P04 implements is pointless if the downgrade cascade itself never fires.

**Coordinator-recommended pivot**: insert a fixup iteration sequence before TEAM-P04:

### Iter 084 = TEAM-P03.6 — Critical billing/seats correctness fixup (P0 BLOCKERS)

Single iteration; addresses 6 P0 blockers as one logical outcome ("workspace billing + seat enforcement actually works for real customers"):

1. **`checkout.session.completed` creates/links Team row**: extend handler to (a) look up any Team owned by `userId` where `stripeCustomerId IS NULL`, (b) set `Team.stripeCustomerId = session.customer` + `Team.plan = plan`, (c) if no such team exists, create one named "{userName}'s Workspace" with the user as owner.
2. **Workspace creation copies `Team.plan = user.plan`**: `POST /api/teams` stamps the creator's `User.plan` (resolved at creation time) into the new `Team.plan` field.
3. **`checkFeatureAccess` adoption of `effectivePlanFor`** in `/api/teams/[id]/invite/route.ts:40`: replace `checkFeatureAccess(user, 'teamWorkspace')` with `checkFeatureAccess({ plan: team.plan }, 'teamWorkspace')` OR direct check `if (!getPlanConfig(team.plan).teamWorkspace) return 403`. Use the WORKSPACE's plan for gating, not the inviter's solo plan.
4. **`@@unique([teamId, email])` re-invite path**: invite-creation upserts on `(teamId, email)` — if existing row is revoked/expired/accepted, overwrite with fresh token + expiresAt + null revokedAt + null acceptedAt. OR delete-then-insert in a transaction.
5. **PATCH role-elevation guard**: `if (newRole === 'owner' && callerMembership.role !== 'owner') return 403`. Block admins from self-promoting.
6. **Rate limit `POST /api/invites/accept`**: add per-IP rate limit (10 req/min via `@upstash/ratelimit` or equivalent simple in-memory token bucket). Hard-block at 5 consecutive 404s.

Estimated: ~250 LOC production + ~80 test. Agent: `backend-engineer` PRIMARY (4th consecutive — coordinator MUST justify per agent-diversity rule, but the fixups are tightly coupled to existing iter 082/083 code paths). System-architect adjacency for #1 (Stripe customer model decision).

**Iter 085 = TEAM-P03.7 — Pre-TEAM-P08 architectural fixes (P1 BLOCKERS)**

Single iteration; addresses P1 architectural concerns:

1. **`Team.subscriptionStatus` Prisma column** additive migration + `customer.subscription.updated` writes it
2. **`invoice.payment_failed` team-first path** symmetric to iter 083 pattern
3. **`ApiKey.teamId` cascade flip** from `SetNull` → `CASCADE` (security fix)
4. **Sole-owner-overflow protection**: invite-quota check excludes owners from active count OR documents the overflow state
5. **SERIALIZABLE 40001 retry handler**: catch P2034, return 409 with `retryable: true` hint
6. **Member removal soft-deactivation**: `DELETE` endpoints set `status='removed'` not hard-delete (preserves audit trail)
7. **Webhook userId verification**: replace `subscription.metadata.userId` lookup with `db.user.findFirst({ where: { stripeSubscriptionId } })` pattern

Estimated: ~200 LOC production + ~70 test. Agent: `system-architect` PRIMARY (rotation off backend-engineer; D-4 clause 2 fires).

**Iter 086 = TEAM-P03.8 — Operational + polish (deferrable but valuable)**

1. **5 POLISH copy substitutions** from growth-strategist §5
2. **AC-6 status code** 400 → 409
3. **VALID_ROLES** add `viewer` OR document deferral
4. **TeamMemberStatusChange audit table** (Ledgerium traceability invariant)
5. **`effectivePlanFor` React `cache()` wrap** (5-line perf fix)
6. **Rate limit `POST /api/teams/[id]/invite`** (Resend quota DoS prevention)

Estimated: ~150 LOC production + ~50 test. Agent: `growth-strategist` PRIMARY (D-4 clause 1 + copy work) OR `qa-engineer`.

**Iter 087+ = TEAM-P04 Resend integration** (proceeds per original plan once iter 084-086 close)

**Iter 088+ = Stripe customer model ADR** (system-architect; documents the (A) always-new-customer-per-Team vs (B) shared-customer-with-handoff vs (C) customer-per-payer decision; resolves architect §4 critical question; can ship in parallel with TEAM-P04 since it's documentation not code)

---

## 6. Operational Infrastructure Gaps (devops-engineer §4-§5)

Three operational prerequisites that must close before respective feature iterations:

**Before TEAM-P04 ships (iter ~087)**:
- Add `RESEND_API_KEY` + `EMAIL_FROM` to `compose.hostinger.yaml` + `deploy.yml` secrets
- Verify Resend domain DNS records propagated (24-72h lead time)
- CEO operational task per `STRIPE_SETUP.md` Step pattern; new `RESEND_SETUP.md` runbook should ship with TEAM-P04

**Before TEAM-P03.5 cleanup job + ADMIN-P03 daily snapshot ship**:
- **BullMQ + Redis infrastructure missing entirely**
- Neither `bullmq` package nor `REDIS_URL` env var exists in codebase
- Must add Redis sidecar to `compose.hostinger.yaml` + `REDIS_URL` to deploy secrets
- Standalone infrastructure iteration recommended before any background-job code

**Before any TEAM-P08 ships**:
- Run pre-migration query: `SELECT team_id, email, COUNT(*) FROM team_invites GROUP BY team_id, email HAVING COUNT(*) > 1` — must return zero rows
- Verify all 10 Stripe env vars are Live Mode keys (not Test Mode)
- Confirm Stripe Dashboard webhook URL configuration per `STRIPE_SETUP.md` Step 3

---

## 7. Growth/Copy Findings (growth-strategist §5)

5 verbatim POLISH substitutions ready-to-apply by `backend-engineer` (no consult needed):

| File:line | OLD | NEW | Rationale |
|---|---|---|---|
| `invite/route.ts:44` | `'Feature not available on your plan'` | `'Workspace collaboration requires the Team plan — upgrade at /pricing'` | Names plan + path; matches iter 075 PRICING-P02 upgrade-CTA pattern |
| `invite/route.ts:82` | `'User is already a team member'` | `'This person is already a member of this workspace'` | Aligns "workspace" noun; removes "team member" model-layer leak |
| `invite/route.ts:100` | `'A pending invite for this email already exists'` | `'An invite is already pending for this email address'` | Active construction; "already pending" leads |
| `invite/route.ts:121` | `'Seat quota reached — upgrade your plan or remove existing members'` | `'This workspace is at its member limit — upgrade to add more seats or remove an existing member'` | Replaces "seat quota" billing jargon with "member limit" |
| `members/route.ts:35` | `'Not a member of this team'` | `'Not a member of this workspace'` | Single-word fix to match product noun convention |

**Email copy drafts** (for TEAM-P04 verbatim use):

**Workspace Invite Email**:
- Subject: `{inviterName} invited you to {workspaceName}`
- Body: opens with greeting + names inviter + workspace + role; mentions expiry; ends with "Accept Invite" CTA
- Plain-text fallback included

**Downgrade Notification Email**:
- Subject: `Your {workspaceName} plan changed — action needed`
- Body: names old plan + new plan + deactivated member count + reactivation deadline; ends with "Manage Members" CTA

Full copy in growth-strategist §4 (preserved in this artifact's source agent output for TEAM-P04 implementer reference).

---

## 8. Counter Impact (Mode 3-adjacent NON-counting)

- **Iteration counter**: UNCHANGED at iter 083 (Mode 3-adjacent does not advance)
- **Cool-off recharge**: UNCHANGED at 3/3 FULL RE-ARM — preservation streak extends to **29-37 events** (longest-streak record continues)
- **D-1 reverse-portfolio-drift**: UNCHANGED at 9 (Mode 3-adjacent does not advance 5-iter window)
- **Area saturation clock**: UNCHANGED
- **MR-020 cadence**: UNCHANGED at 3/3 (DEFERRED per CEO Option B 2026-05-18)
- **Cold-pool ages**: UNCHANGED
- **Workspace `pnpm test`**: 2436 / 2436 unchanged (web-app filter 984 / 984)
- **Workspace `pnpm typecheck`**: clean across all 10 packages/apps
- **CLAUDE.md governance diffs**: ZERO (no control-plane modification proposed)
- **12th cumulative audit-intake event** (DV2 + MDR + WDC-001 + PIB + AI-VISION + WDC-002 + SOPPM + PATHE + PRICING-001 + TEAM-001 + ADMIN-001 + **TEAM-QUALITY-001** — this is a quality review intake, not a feature intake; produces fix-iteration backlog rows rather than feature-row rows)

---

## 9. Pool Impact + Backlog Row Promotions

**3 P0 fixup rows promoted** to live backlog with `Birth iter: audit-intake-TEAM-QUALITY-001`:

| Row | Title | Score | Agent | Phase |
|---|---|---|---|---|
| TEAM-P03.6 | Critical billing/seats correctness fixup (6 P0 BLOCKERS) — checkout creates Team / workspace creation copies plan / effectivePlanFor adoption / unique-constraint re-invite / privilege escalation guard / accept rate limit | 15 | backend-engineer + system-architect | 1 |
| TEAM-P03.7 | Pre-TEAM-P08 architectural fixes (7 P1 BLOCKERS) — Team.subscriptionStatus / invoice.payment_failed team path / ApiKey cascade / sole-owner-overflow / SERIALIZABLE retry / member soft-delete / webhook userId verification | 13 | system-architect + backend-engineer | 2 |
| TEAM-P03.8 | Operational + polish (deferrable but valuable) — 5 copy POLISH substitutions / AC-6 status code / VALID_ROLES viewer / audit table / effectivePlanFor cache / invite rate limit | 11 | growth-strategist + qa-engineer | 3 |

Pool 73 → 76 (3 P0 fixup rows added).

---

## 10. CEO Decisions Queued

- **CD-1**: Approve insertion of TEAM-P03.6 + TEAM-P03.7 + TEAM-P03.8 fixup iterations BEFORE TEAM-P04 ships? Coordinator-default: **YES**. Without these fixups, TEAM-P04 ships against a broken foundation; the Resend email is meaningless if the cascade that triggers it never fires.

- **CD-2**: Approve Stripe customer model ADR (system-architect §4) as standalone iteration parallel to fixups? Coordinator-default: **YES**. Three options (A/B/C); coordinator recommends Option C (Customer-per-payer; User owns customer, Team links via FK).

- **CD-3**: Approve agent-diversity exception for 4-consecutive backend-engineer iterations (TEAM-P03 + TEAM-P03.6 + TEAM-P03.7 + maybe TEAM-P04 backend)? Coordinator-default: **YES with justification** — the fixups are tightly coupled to existing iter 082/083 code paths; rotating mid-fixup would force re-discovery overhead.

- **CD-4**: Approve BullMQ + Redis infrastructure iteration before TEAM-P03.5 (30-day cleanup job) ships? Coordinator-default: **YES**. Standalone infrastructure iteration; not a feature delivery.

- **CD-5**: Accept the 4 PARTIAL acceptance criteria status as known-gap that must close before TEAM-P08 literal billing-gate removal (NOT before TEAM-P04 ship)? Coordinator-default: **YES**. AC-2 and AC-9 partial-status is TEAM-P04-resolvable; AC-6 status code is TEAM-P03.8 polish; AC-10 partial-status closes when TEAM-P03.6 fixes checkout flow.

- **CD-6**: Re-projection of TEAM-001 ship timeline:
  - Original plan: iter 084 = TEAM-P04 Resend → iter ~085-087 UI → iter ~088 TEAM-P08 gate removal
  - **Revised plan**: iter 084 = TEAM-P03.6 fixup → iter 085 = TEAM-P03.7 fixup → iter 086 = TEAM-P03.8 polish → iter 087 = TEAM-P04 Resend → iter ~088-090 UI → iter ~091 TEAM-P08 gate removal
  - **+3 iterations** added to sequence; **+3 days wall-clock**
  - Coordinator-default: **APPROVE** revised timeline. Shipping the original plan would put broken billing in production.

---

## 11. Critical Honesty — What "Make Sure Billing And Seats Work Properly" Actually Means

The CEO's directive verbatim was *"make sure billing and seats work properly."* The candid answer from this review:

**They don't work properly today.** The iter 081-083 backend is structurally correct in isolation but has 6 P0 integration gaps that make the end-to-end flow non-functional for real customers. Specifically:

1. **Real subscribers signing up via Stripe Checkout** get `User.plan = 'team'` but no Team row + no Team.stripeCustomerId linkage. Their workspace billing relationship doesn't exist.
2. **Real workspace owners trying to invite members** hit the `effectivePlanFor` dead code path and get blocked because their personal plan is Free even though the workspace is Team.
3. **Real downgrades** never fire the soft-deactivate cascade because `resolveTeamFromCustomer()` returns null without Team.stripeCustomerId linkage.
4. **Real admins** can self-promote to owner via the PATCH endpoint privilege escalation bug.
5. **Real invite tokens** are vulnerable to enumeration due to missing rate limit.
6. **Real re-invites** crash with 500 after an invite expires.

The good news: each gap is fixable in 1-2 small iterations. The architectural foundation is sound — the implementation just has critical integration gaps that the original TEAM_WORKSPACE_REVIEW_001 spec didn't enumerate as ACs.

The honest sequencing answer: **3 additional fixup iterations (TEAM-P03.6 + TEAM-P03.7 + TEAM-P03.8) must ship before billing + seats actually work properly for real customers.** TEAM-P04 should NOT ship until at least TEAM-P03.6 closes. TEAM-P08 literal gate removal cannot ship until ALL 3 fixup iterations close.

---

## Appendix A — File Path References

- `apps/web-app/src/app/api/teams/[id]/invite/route.ts` (3 guards + invite creation)
- `apps/web-app/src/app/api/teams/[id]/invite/[inviteId]/route.ts` (revocation)
- `apps/web-app/src/app/api/invites/accept/route.ts` (SERIALIZABLE upsert)
- `apps/web-app/src/app/api/teams/[id]/members/route.ts` (GET list + legacy DELETE)
- `apps/web-app/src/app/api/teams/[id]/members/[memberId]/route.ts` (PATCH + DELETE)
- `apps/web-app/src/lib/workspace/seat-management.ts` (softDeactivateExcessMembers)
- `apps/web-app/src/lib/workspace/team-billing.ts` (resolveTeamFromCustomer + STUB)
- `apps/web-app/src/lib/feature-gating.ts:201-226` (effectivePlanFor — currently dead code)
- `apps/web-app/src/app/api/billing/webhook/route.ts` (Stripe webhook handler)
- `apps/web-app/prisma/schema.prisma` (Team / TeamMember / TeamInvite / ApiKey models)
- `apps/web-app/prisma/migrations/20260518_team_workspace_billing_and_member_status/migration.sql`
- `apps/web-app/prisma/migrations/20260519_apikey_workspace_scoping/migration.sql`
- `compose.hostinger.yaml` (production deploy config)
- `.github/workflows/deploy.yml` (CI secrets)
- `docs/runbooks/STRIPE_SETUP.md` (operational dependency)
- `scripts/docker-start.sh` (production start sequence; uses `prisma db push --accept-data-loss`)

## Appendix B — Cross-Artifact References

- `docs/meta/TEAM_WORKSPACE_REVIEW_001.md` — original strategic spec with 15 ACs
- `docs/meta/MR_019_META_REVIEW.md` — D-7 pre-check approved Mode 5 N=7 for TEAM-001
- `docs/meta/ADMIN_DASHBOARD_REVIEW_001.md` — BullMQ infrastructure dependency overlap (CD-4)
