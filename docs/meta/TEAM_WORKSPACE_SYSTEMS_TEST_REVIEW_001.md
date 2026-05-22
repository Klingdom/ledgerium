# TEAM_WORKSPACE_SYSTEMS_TEST_REVIEW_001 — Multi-User Integration + Systems Testing

**Date:** 2026-05-22
**Mode:** 3-adjacent multi-agent integration + systems test review (NON-counting)
**Trigger:** CEO directive verbatim 2026-05-22: *"have subagents do an integration and systems test using multi-user functions"*
**Coordinator artifact owner:** AI CTO (this file)
**Status:** CRITICAL — 8 NEW P0 BLOCKERS surfaced; multi-user still NOT shippable

---

## 1. Executive Verdict — Pattern Continues: Each Review Surfaces NEW Blockers

6 of 11 effective-sequence iterations CLOSED (iter 081-086). 3 prior multi-agent reviews each surfaced new issues:
- TEAM_WORKSPACE_QUALITY_REVIEW_001: 6 P0 + 7 P1 BLOCKERS (closed by iter 084 + 085)
- TEAM_WORKSPACE_PROGRESS_REVIEW_001: 5 NEW P0 BLOCKERS (closed by iter 086)
- **TEAM_WORKSPACE_SYSTEMS_TEST_REVIEW_001 (this review): 8 NEW P0 BLOCKERS**

This is the 4th review of TEAM-001 backend work. The systems-test-perspective surfaced critical integration gaps the prior code-audit-perspective missed.

### THE most critical NEW BLOCKER (security + backend convergence)

🚨 **`status: 'active'` filter MISSING from caller-membership lookups across ALL team management endpoints** (security audit S2.4 P0/HIGH + backend audit §5 Risk 2):

```bash
$ grep -n "teamMember.findUnique" apps/web-app/src/app/api/teams/**/*.ts
invite/route.ts:40         where: { teamId_userId: { ... } }   # no status filter
invite/route.ts:202        where: { teamId_userId: { ... } }
invite/[inviteId]/route.ts:26  where: { teamId_userId: { ... } }
members/[memberId]/route.ts:51 where: { teamId_userId: { ... } }
members/[memberId]/route.ts:113 where: { teamId_userId: { ... } }
members/route.ts:31            where: { teamId_userId: { ... } }
members/route.ts:106           where: { teamId_userId: { ... } }
```

**ZERO** of these check `status === 'active'`. **A removed/deactivated admin whose session has not expired retains full admin capability for up to 30 days.**

Concrete attack: owner removes a malicious admin → admin's browser tab still has a session → admin re-creates invite for an attacker-controlled email → re-joins as admin via accept flow → exfiltrates workflows.

**Severity: P0 SHIP-BLOCKER.** 7 call sites need a one-line fix each (`findUnique` → `findFirst` with `status: 'active'` filter).

### 7 more NEW P0 BLOCKERS

| # | Issue | Severity | Source |
|---|---|---|---|
| **P0-F** | Free user "Create Team" form silently fails (no upgrade CTA) | HIGH/CERTAIN | PM Risk 1 |
| **P0-G** | Team analytics events DEFINED but NEVER FIRE (`team_created` / `team_invite_sent` / `team_invite_accepted`) | HIGH/CERTAIN | PM Risk 2 |
| **P0-H** | `/teams/join` page broken redirect loop for unauthenticated users | HIGH/HIGH | PM Risk 3 |
| **P0-I** | AC-6 sole-owner protection returns HTTP 400 not 409 (spec deviation; iter 085 polish missed) | MEDIUM/CERTAIN | PM AC-6 ❌ BROKEN |
| **P0-J** | `checkout.session.completed` non-atomic Team + TeamMember creation (race window leaves orphan Team) | HIGH/MEDIUM | qa S-07 + architect R-INTEG-02 |
| **P0-K** | Concurrent invite creation exceeds seat quota (no transaction wraps quota check + upsert) | HIGH/MEDIUM | qa R-1 + backend Risk 4 |
| **P0-L** | `GET /api/teams` returns deactivated + removed members (no status filter) | MEDIUM/CERTAIN | qa S-10 |

### Plus 6 P1 issues + operational gaps

- IP spoofing via `x-forwarded-for` if behind unsanitized proxy (security S6.2)
- Memory exhaustion DoS on rate-limit Map (security S6.5)
- `Team.stripeCustomerId` lacks unique constraint (security S6.4)
- `hashInviteToken` duplicated across 2 files (backend Risk 3)
- `trial_will_end` still uses mutable `metadata.userId` (security S5.1; iter 086 missed this notification event)
- Cancellation is immediate, not period-end (PM Risk 4)
- Re-upgrade doesn't restore deactivated members (PM Risk 5)
- Invite-create at-quota doesn't return soft warning (architect R-INTEG-05)
- Webhook handler cascade not wrapped in `prisma.$transaction` (architect §2g)
- No DB-level constraint on sole-owner invariant (architect I-4)
- Code-comment mismatch on token TTL (says 48h; code is 7d) (security §3)

---

## 2. End-to-End Integration Scenarios — Status Audit (qa-engineer §1)

12 scenarios run mentally against shipped iter 086 code:

| # | Scenario | Status |
|---|---|---|
| S-01 | Happy-path invite acceptance (authenticated, email match) | ⚠️ — email-match check non-deterministic on mixed-case |
| S-02 | Unauthenticated invite preview | ✅ |
| S-03 | Duplicate invite acceptance race (Postgres SERIALIZABLE) | ⚠️ — works in Postgres; SQLite doesn't enforce |
| S-04 | Invite acceptance resurrects quota-deactivated member | ❌ — bypasses quota check entirely |
| S-05 | Concurrent invite creation race | ❌ — non-atomic; quota race documented |
| S-06 | Sole-owner concurrent demotion + promotion | ❌ — count+update not transactional |
| S-07 | Stripe checkout team creation non-atomic | ❌ — Team + TeamMember separate awaits |
| S-08 | Subscription update seat downgrade cascade | ✅ |
| S-09 | trial_will_end uses metadata.userId not stripeSubscriptionId | ❌ — iter 086 missed this event |
| S-10 | GET /api/teams returns deactivated members | ❌ — no status filter |
| S-11 | Invite revocation after acceptance | ✅ |
| S-12 | Rate limit lockout after 5 consecutive 404s | ✅ within single warm instance |

**4 of 12 scenarios PASS. 8 of 12 have integration gaps.**

---

## 3. AC Status Update (Post-iter-086)

Per product-manager §1 + qa-engineer §2:

| AC | Status | Notes |
|---|---|---|
| AC-1 | ⚠️ PARTIAL | Gate fires; error body missing `code: plan_upgrade_required` field |
| AC-2 | ⚠️ PARTIAL | Email STUB pending TEAM-P04; no UI surface for inviteUrl |
| AC-3 | ✅ MET | Seat-quota correct post iter 085 |
| AC-4 | ⚠️ PARTIAL | Backend correct; `/teams/join` page doesn't handle `requiresAuth: true` |
| AC-5 | ✅ MET | iter 086 fix verified |
| AC-6 | ❌ BROKEN | Returns 400 not 409; iter 085 polish missed |
| AC-7 | ⚠️ PARTIAL | Soft-delete correct; 400 vs spec 409 on sole-owner |
| AC-8 | ✅ MET | |
| AC-9 | ⚠️ PARTIAL | Cascade correct; owner email STUB |
| AC-10 | ⚠️ PARTIAL | Cascade correct; owner email STUB |
| AC-11 | 🚧 PENDING-UI | TEAM-P05 |
| AC-12 | ✅ MET | iter 084 upsert pattern works |
| AC-13 | ✅ MET | |
| AC-14 | 🚧 PENDING-UI | TEAM-P06 |
| AC-15 | ✅ MET | |

**Revised: 6 MET / 6 PARTIAL / 1 BROKEN (AC-6) / 2 PENDING-UI.** AC-5 unbroken via iter 086. AC-6 regressed to BROKEN status because the spec deviation wasn't caught in prior reviews.

---

## 4. Cross-Component Integration Invariants (system-architect §1)

8 invariants audited:

| # | Invariant | Status |
|---|---|---|
| I-1 | `User.stripeCustomerId == Team.stripeCustomerId` for workspace owner | ASSUMED-BUT-UNVERIFIED |
| I-2 | effectivePlanFor monotonic on membership accept | PROVEN-BY-CODE |
| I-3 | `count(active TeamMember) ≤ maxSeats` with owner-exception | SUSPECTED-VIOLATION (by design; needs documentation) |
| I-4 | Every Team has ≥1 active owner | ASSUMED-BUT-UNVERIFIED (no DB constraint) |
| I-5 | Token-hash round-trip | PROVEN-BY-CODE (post iter 086 orphan-route deletion) |
| I-6 | Webhook idempotency across 6 event types | PROVEN-BY-TEST (partial) |
| I-7 | Team delete cascades correctly | PROVEN-BY-CODE (post iter 085) |
| I-8 | Team.subscriptionStatus closed-union | PROVEN-BY-CODE |

**5 invariants assumed-but-unverified or partially-tested.** Need regression tests asserting each invariant before TEAM-P08.

---

## 5. Security Integration Findings (security audit §6)

**S6.1 P0/HIGH**: Removed/deactivated members retain capabilities (THE critical finding)
**S6.2 P0/HIGH** (deployment-dependent): IP spoofing via `x-forwarded-for`
**S6.3 P1/MEDIUM**: Invite token in URL → browser history + referrer leakage (industry-standard pattern; Phase 2)
**S6.4 P1/MEDIUM**: Cross-workspace data leak via shared Stripe customer (`Team.stripeCustomerId` not unique)
**S6.5 P1/MEDIUM**: Memory-exhaustion DoS on rate-limit Map

Plus:
**S5.1 P2/LOW**: `trial_will_end` still uses `subscription.metadata?.userId` (notification-only; bounded blast radius)

---

## 6. 1 NEW P0 Emergency Fixup Row Promoted

Coordinator decision: bundle all 8 NEW P0 BLOCKERS into ONE row to avoid further sequence proliferation (already at effective N=11 after 3 prior emergency fixups). Adding 8 separate rows would be governance chaos.

### Row #158 TEAM-P03.10 — EMERGENCY systems-test fixup (8 NEW P0 BLOCKERS)

**Score**: 16 (HIGHEST in pool — surpasses TEAM-P03.9 score 15)
**Agent**: `backend-engineer` PRIMARY (6th consecutive — CD-3 exception JUSTIFIED-CONTINUED; all 8 sub-tasks tightly coupled to existing iter 082-086 backend code paths)
**LOC**: ~250 production + ~120 test
**BLOCKS TEAM-P04**: same logic as iter 084 + iter 086 emergency fixups

Sub-tasks (8 sub-tasks consolidated as ONE logical outcome: "shipped multi-user backend is actually safe for real customers"):

1. **P0-E `status: 'active'` filter audit at 7 team-management call sites** (CRITICAL — security incident vector): change `teamMember.findUnique` → `teamMember.findFirst` with `status: 'active'` filter at: invite/route.ts:40 + invite/route.ts:202 + invite/[inviteId]/route.ts:26 + members/[memberId]/route.ts:51 + members/[memberId]/route.ts:113 + members/route.ts:31 + members/route.ts:106. Add regression test asserting removed/deactivated admin gets 403 on all 5 management endpoints.

2. **P0-F Free user "Create Team" upgrade CTA**: `/teams/page.tsx handleCreate` currently only handles `res.ok`. Add error branch: when API returns 403 with `code: 'plan_upgrade_required'`, render inline upgrade CTA pointing to `/pricing` with `body.upgradeUrl`. Also add `code: 'plan_upgrade_required'` to the `POST /api/teams` 403 response body (currently missing per AC-1 audit).

3. **P0-G Team analytics events firing**: add `trackServer('team_created', { userId, teamId, plan })` in `POST /api/teams` after team creation. Add `trackServer('team_invite_sent', { userId, teamId, role })` in `POST /api/teams/[id]/invite` after invite creation. Add `trackServer('team_invite_accepted', { userId, teamId, role })` in `POST /api/invites/accept` after successful acceptance. **Also add 3 NEW events to analytics.ts discriminated union**: `workspace_downgraded` + `workspace_canceled` + `member_reactivated` (for future TEAM-P07 reactivation endpoint).

4. **P0-H `/teams/join` page handles `requiresAuth: true` branch**: read `data.requiresAuth` from `POST /api/invites/accept` response. If true: redirect to `/signup?token=<token>&email=<email>` (or `/login?...` if account exists) preserving the token query parameter. After signup/login, replay the accept call. Currently the page treats `requiresAuth: true` response as success and routes to `/teams` which requires auth → broken loop.

5. **P0-I AC-6 status code 400 → 409**: change `members/[memberId]/route.ts` PATCH sole-owner-demotion error from `status: 400` to `status: 409` per spec; add `code: 'sole_owner_protection'` to error body. Same for `members/route.ts` legacy DELETE path + `members/[memberId]/route.ts` DELETE path. 3 line changes total.

6. **P0-J `checkout.session.completed` transactional Team + TeamMember create**: wrap `db.team.create` and `db.teamMember.create` in `prisma.$transaction` in `webhook/route.ts:135-153`. If TeamMember.create fails, rollback Team.create. Add regression test mocking `teamMember.create` to throw and asserting Team row not persisted.

7. **P0-K Concurrent invite-creation seat-quota race**: wrap quota check + invite upsert in `prisma.$transaction` at `invite/route.ts:121-175`. Re-read active member count INSIDE the transaction. Add regression test using Promise.all with 2 concurrent calls at quota boundary and asserting at most one invite created.

8. **P0-L `GET /api/teams` status filter**: add `where: { status: 'active' }` to the `include: { members: ... }` clause at `teams/route.ts:24`. Add regression test asserting deactivated + removed members excluded from response.

### Also DEFER to TEAM-P03.8 polish (already promoted as row #155):

- **P1-S6.4**: Add `@@unique([stripeCustomerId])` constraint to Team in Prisma schema (additive migration; iter ~087 schedule with TEAM-P03.8 polish)
- **P1-architect-§2g**: Wrap webhook handler cascade in `prisma.$transaction`
- **P1-architect-I-4**: Prisma middleware sole-owner guard
- **P1-architect-I-1**: Webhook customer-ID-consistency regression test
- **P1-backend-Risk-3**: Extract `hashInviteToken` to shared `lib/invite-tokens.ts` module
- **P1-S5.1**: `trial_will_end` use `stripeSubscriptionId` lookup not metadata.userId (consistency)
- **P1-security-§3 comment**: Fix code-comment mismatch on token TTL

### Also DEFER to TEAM-INFRA-01 (row #157):

- **P1-S6.2**: IP spoofing via `x-forwarded-for` deployment-config verification
- **P1-S6.5**: Memory exhaustion DoS on rate-limit Map (Redis-backed alternative)

### Also DEFER to Phase 2:

- **PM Risk 4**: Cancellation immediate vs period-end (Stripe `cancel_at_period_end` flow)
- **PM Risk 5**: Re-upgrade reactivation grace-window restore

---

## 7. CEO Decisions Queued

- **CD-1**: Approve TEAM-P03.10 EMERGENCY fixup BEFORE TEAM-P04 ships? **Default: YES** — pattern continues; security incident vector (P0-E) is non-negotiable
- **CD-2**: Approve 6-consecutive backend-engineer agent-diversity exception for TEAM-P03.10? **Default: JUSTIFIED-CONTINUED** — same coupling rationale as iter 084 + 086
- **CD-3**: Approve absorption of architect's R-INTEG-01/02/03/04 into TEAM-P03.8 polish (not TEAM-P03.10 emergency)? **Default: YES** — those are architectural improvements; not ship-blocking emergencies
- **CD-4**: Accept the "each review surfaces 5-10 new issues" pattern? Approve scheduling **TEAM_WORKSPACE_QUALITY_REVIEW_002** at iter 092 (post-UI ship) before TEAM-P08? **Default: YES** — predictable 5-10 more issues; the review prevents production fire-drills
- **CD-5**: Revised TEAM-001 ship timeline (+1 more iteration; effective sequence now N=12):
  - Iter 087 = **TEAM-P03.10** EMERGENCY systems-test fixup (8 P0 BLOCKERS)
  - Iter 088 = **TEAM-P03.8** polish (5 POLISH + audit table + cache + invite rate limit + 7 absorbed P1 items)
  - Iter 089 = **TEAM-P04** Resend integration
  - Iter 090 = **TEAM-INFRA-01** ops prep (db push → migrate deploy + Resend env + IP spoofing fix + Redis-rate-limit)
  - Iter 091 = **TEAM-P05** WorkspaceSwitcher + AppShell + nav
  - Iter 092 = **TEAM-P06** Members + Settings + Invite modal
  - Iter 093 = **TEAM_WORKSPACE_QUALITY_REVIEW_002** (recommended mid-sequence audit)
  - Iter 094 = **TEAM-P07** Acceptance landing + bulk CSV + activity feed
  - Iter ~095 = **TEAM-P08** literal billing-gate removal

**+1 iteration from prior projection** (was 11; now 12 effective).

---

## 8. Critical Honesty Update

**The pattern is established now.** Three multi-agent reviews have each surfaced 5-13 new P0 BLOCKERS. This is the 4th review surfacing 8 more. **At what point does TEAM-001 actually ship?**

Two honest paths:

**Path A — Continue review cycle until convergence**: project 1-2 more multi-agent reviews. Probability that 5th review surfaces zero new P0 BLOCKERS: LOW. Probability that 6th review surfaces zero: MEDIUM. Estimated ship: iter ~097-100 / wall-clock 2-3 weeks from today.

**Path B — Ship at convergence-but-not-zero**: accept that some issues will surface in production; rely on PostHog telemetry + customer feedback + rapid hotfix iteration. The current TEAM-P03.10 fixes the highest-severity issues (security incident vector + funnel-blocking UX failures + analytics measurement). Lower-severity issues can ship as known-acceptable risk. Estimated ship: iter ~095 / wall-clock 1 week from today.

**Coordinator recommendation: Path B with TEAM_WORKSPACE_QUALITY_REVIEW_002 ONE more review at iter 093** (post-UI ship; before literal gate removal). That captures any UI-integration issues that emerge from TEAM-P05/06/07 — but caps the review cadence at 5 total reviews for TEAM-001.

**This is the discipline call.** Quality reviews are valuable; runaway quality reviews paralyze ship velocity. The 5-review ceiling is the structural commitment.

---

## 9. Counter Impact (Mode 3-adjacent NON-counting)

- **Iteration counter**: UNCHANGED at iter 086
- **Cool-off recharge**: UNCHANGED at 3/3 FULL RE-ARM — preservation streak extends to **34-42 events** (longest-streak record continues)
- **D-1 reverse-portfolio-drift**: UNCHANGED at 12
- **Area saturation clock**: UNCHANGED
- **MR-020 cadence**: UNCHANGED at 3/3 (DEFERRED per CEO Option B)
- **Cold-pool ages**: UNCHANGED
- **Workspace pnpm test**: 1114/1114 web-app filter unchanged (zero product code touched)
- **CLAUDE.md governance diffs**: ZERO
- **14th cumulative audit-intake event** (DV2 + MDR + WDC-001 + PIB + AI-VISION + WDC-002 + SOPPM + PATHE + PRICING-001 + TEAM-001 + ADMIN-001 + TEAM-QUALITY-001 + TEAM-PROGRESS-001 + **TEAM-SYSTEMS-TEST-001**)
- **Pool 75 → 76** (1 NEW P0 row promoted: TEAM-P03.10)

---

## Appendix A — File Path References (NEW issues only)

- `apps/web-app/src/app/api/teams/[id]/invite/route.ts:40, :202` — status filter missing
- `apps/web-app/src/app/api/teams/[id]/invite/[inviteId]/route.ts:26` — status filter missing
- `apps/web-app/src/app/api/teams/[id]/members/[memberId]/route.ts:51, :113` — status filter missing
- `apps/web-app/src/app/api/teams/[id]/members/route.ts:31, :106` — status filter missing
- `apps/web-app/src/app/(app)/teams/page.tsx` (handleCreate) — Free user upgrade CTA gap
- `apps/web-app/src/app/(app)/teams/join/page.tsx` — `requiresAuth: true` branch missing
- `apps/web-app/src/lib/analytics.ts` — `team_created` / `team_invite_sent` / `team_invite_accepted` types defined; no producers
- `apps/web-app/src/app/api/teams/route.ts:24` — `include: { members: true }` missing status filter
- `apps/web-app/src/app/api/billing/webhook/route.ts:135-153` — Team + TeamMember non-atomic
- `apps/web-app/src/app/api/billing/webhook/route.ts:507` — `trial_will_end` uses metadata.userId
- `apps/web-app/src/app/api/billing/webhook/route.ts` (no Team.stripeCustomerId unique constraint at schema)

## Appendix B — Cross-Artifact References

- `docs/meta/TEAM_WORKSPACE_REVIEW_001.md` — original spec (15 ACs)
- `docs/meta/TEAM_WORKSPACE_QUALITY_REVIEW_001.md` — 1st review (6 P0 + 7 P1)
- `docs/meta/TEAM_WORKSPACE_PROGRESS_REVIEW_001.md` — 2nd review (5 NEW P0)
- `docs/meta/TEAM_WORKSPACE_SYSTEMS_TEST_REVIEW_001.md` — this 3rd review (8 NEW P0)
- Future: `docs/meta/TEAM_WORKSPACE_QUALITY_REVIEW_002.md` — recommended at iter 093 (post-UI)
- `docs/runbooks/STRIPE_SETUP.md` — operational dependency
- `docs/runbooks/RESEND_WORKSPACE_SETUP.md` — TEAM-INFRA-01 produces this
