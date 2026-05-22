# TEAM_WORKSPACE_PROGRESS_REVIEW_001 — Multi-User Progress + Fresh-Eyes Audit

**Date:** 2026-05-22
**Mode:** 3-adjacent multi-agent forward-looking review (NON-counting)
**Trigger:** CEO directive verbatim 2026-05-22: *"what is the progress on multi-user? Have all subagents review current state code and next steps"*
**Coordinator artifact owner:** AI CTO (this file)
**Status:** CRITICAL — 5 NEW P0 BLOCKERS surfaced; TEAM-001 STILL NOT SHIPPABLE

---

## 1. Executive Verdict — Fresh-Eyes Audit Reveals NEW Blockers

**5 of 10 effective-sequence iterations CLOSED** (iter 081-085). The original 6 P0 BLOCKERS + 7 P1 BLOCKERS from TEAM_WORKSPACE_QUALITY_REVIEW_001 are confirmed closed. **BUT 7 specialist agents auditing fresh-eyes have surfaced 5 NEW P0 BLOCKERS not in the prior review.**

### CRITICAL: Multi-user is still BROKEN end-to-end in production

7 agents converged on the same finding from different angles. **The single most critical bug:**

🚨 **Join route token hash mismatch** (backend-engineer §1 / qa-engineer §2):
- `apps/web-app/src/app/api/teams/join/route.ts:25` calls `teamInvite.findUnique({ where: { token: rawToken } })`
- But invite creation at `apps/web-app/src/app/api/teams/[id]/invite/route.ts:153` stores `hashInviteToken(rawToken)` (SHA-256)
- **NO INVITE CAN BE ACCEPTED END-TO-END.** The user-facing invite flow is functionally broken despite all the iter 081-085 backend work.
- Fix: one-line change at `join/route.ts:25` — wrap `token` in `hashInviteToken(rawTokenFromUrl)` before lookup

### 4 more new P0 BLOCKERS

1. **`effectivePlanFor` adoption STILL INCOMPLETE** (backend §3 / architect §5): only 1 of 5 sites use workspace-plan derivation; team members with Free personal plans cannot access workspace features. The entire multi-user value proposition is broken at the feature-gating layer.

2. **`/api/workflows` quota gate likely uses `user.plan` not `effectivePlanFor`** (architect §5 critical): if true, a Free user invited to a Growth workspace gets Free quota — the entire reason to be invited to a workspace breaks.

3. **`invoice.payment_succeeded` uses mutable `metadata.userId`** (backend §1): iter 085 Sub-task 7 fixed `customer.subscription.updated` + `deleted` but MISSED this event handler. Same security regression vector.

4. **`customer.subscription.deleted` doesn't write `Team.subscriptionStatus = 'canceled'`** (backend §1): the iter 085 field is silently not written at deletion. A canceled team workspace shows `status='active'` indefinitely.

5. **Rate-limit Map resets on serverless cold start** (qa §5): the in-memory token-bucket from iter 084 P0-11 fix resets on every cold start. Production rate-limit guarantee is effectively absent.

### Plus 6 P1 issues + 5 operational gaps

- `TeamMemberStatusChange` audit table still missing (architect §3 traceability invariant)
- Stripe customer model = de-facto modified Option B (not coordinator-default Option C; needs ADR)
- AC-9/AC-10 owner emails are STUB pending TEAM-P04
- WorkspaceSwitcher dropdown / `/api/workflows` workspace-scoping / UI iterations not yet shipped
- Production uses `prisma db push --accept-data-loss` (no rollback; iter 085 table-rebuild is fragile)
- RESEND_API_KEY + EMAIL_FROM not in production env (TEAM-P04 will silently drop emails)
- Resend domain not yet verified (24-72h DNS propagation lead time)
- Stripe Live Mode keys + webhook URL configuration unconfirmed
- BullMQ + Redis not installed (blocks 30-day cleanup job)

---

## 2. Progress Snapshot

### Shipped (5 of 10 iterations)

| # | Iter | Row | Sub-row | Agent | Status |
|---|---|---|---|---|---|
| 1 | 081 | #139 | TEAM-P01 schema migration | backend | ✅ shipped |
| 2 | 082 | #140 | TEAM-P02 seat-quota + invite endpoints + ApiKey | backend | ✅ shipped |
| 3 | 083 | #141 | TEAM-P03 Stripe webhook | backend | ✅ shipped |
| 4 | 084 | #153 | TEAM-P03.6 critical fixup (6 P0 BLOCKERS) | backend | ✅ shipped |
| 5 | 085 | #154 | TEAM-P03.7 architectural fixes (7 P1 BLOCKERS) | architect | ✅ shipped |

### Remaining (5 + 1 NEW emergency = 6 of 11 iterations)

| # | Iter target | Row | Sub-row | Agent | Status |
|---|---|---|---|---|---|
| 🆕 | **086** | **#156** | **TEAM-P03.9 EMERGENCY fixup (5 NEW P0 BLOCKERS)** | **backend** | **⏳ NEXT — CRITICAL** |
| 6 | 087 | #155 | TEAM-P03.8 polish (5 POLISH + audit table + cache + rate limit) | growth-strategist | ⏳ pending |
| 7 | 088 | #142 | TEAM-P04 Resend invite email integration | backend | ⏳ pending |
| 🆕 | 089 | **#157** | **TEAM-INFRA-01 production migration safety + Resend env vars** | **devops** | **⏳ NEW prereq** |
| 8 | 090 | #143 | TEAM-P05 WorkspaceSwitcher + AppShell + nav | frontend | ⏳ pending |
| 9 | 091 | #144 | TEAM-P06 Members + Settings + Invite modal | frontend + growth | ⏳ pending |
| 10 | 092 | #145 | TEAM-P07 Acceptance landing + bulk CSV + activity feed | frontend + qa | ⏳ pending |
| 11 | ~093 | #146 | TEAM-P08 QA E2E + axe + literal pricing-gate removal | qa | ⏳ pending |

**Revised sequence: 11 iterations remaining** (up from 6 at iter 085 close) due to 2 NEW iterations inserted.

### Cumulative validation state at iter 085 close

- Web-app filter `pnpm test`: **1097 / 1097 across 49 test files** (canonical correctness gate)
- Workspace runner: **64 failures in webhook/route.test.ts** (pre-existing follow-up #53 `@` alias gap; NOT a regression)
- Cool-off recharge preservation streak: **31-39 events** (longest-streak record)
- Pool: 74 → 76 after this review (2 NEW P0 rows promoted)

---

## 3. The 5 NEW P0 BLOCKERS in Detail

### P0-A: Join route token hash mismatch (backend §1 + qa §2)

**File**: `apps/web-app/src/app/api/teams/join/route.ts:25`
**Bug**: `teamInvite.findUnique({ where: { token: rawTokenFromUrl } })` — raw token compared against SHA-256-hashed DB value
**Impact**: zero invites can ever be accepted; the user-facing invite flow is non-functional
**Fix complexity**: 1 line change

```typescript
// Was:
const invite = await db.teamInvite.findUnique({ where: { token } });
// Should be:
const invite = await db.teamInvite.findUnique({
  where: { token: hashInviteToken(token) }
});
```

**Why this wasn't caught earlier**: The invite acceptance flow is at TWO endpoints — `POST /api/invites/accept` (the iter 082 SERIALIZABLE-transaction-protected endpoint that DOES use the hash) AND `apps/web-app/src/app/api/teams/join/route.ts` (a separate older endpoint that DOESN'T). TEAM-P03.6 fixed the former; the latter was orphaned. **The TEAM-P07 acceptance landing page UI calls which endpoint? Unclear — this needs explicit verification.** If the UI will call `POST /api/invites/accept` then the `join/route.ts` is dead code that should be deleted; otherwise the bug must be fixed.

### P0-B: `effectivePlanFor` adoption STILL incomplete (backend §3 + architect §5)

**Files**: 4 of 5 grep'd sites still use `user.plan`
- `apps/web-app/src/app/api/account/route.ts:45` — acceptable (account-scoped not team-scoped)
- `apps/web-app/src/app/api/billing/checkout/route.ts:114-148` — ⚠️ **double-billing risk**: Growth-via-workspace user could start a SECOND Starter subscription
- `apps/web-app/src/app/api/teams/route.ts:94` — Team creation stamps creator's solo plan, not effective plan (acceptable but undocumented)
- `apps/web-app/src/app/api/analytics/engagement/route.ts:195` — analytics emit wrong plan tier
- **`/api/workflows` recording quota gate** — UNVERIFIED; if uses `user.plan`, Free user in Growth workspace gets Free quota → multi-user value proposition broken

**Fix**: replace `user.plan` reads with `await effectivePlanFor(user.id)` at the 3 critical sites (checkout / workflows / analytics) + add audit test asserting no remaining `user.plan` reads exist in workspace-scoped endpoints.

### P0-C: `invoice.payment_succeeded` uses mutable `metadata.userId` (backend §1)

**File**: `apps/web-app/src/app/api/billing/webhook/route.ts:423-463`
**Bug**: iter 085 Sub-task 7 fixed `customer.subscription.updated` + `customer.subscription.deleted` solo paths to use `stripeSubscriptionId` lookup (cryptographic grounding). Same fix needed for `invoice.payment_succeeded` — currently uses `subscription.metadata?.userId`.
**Impact**: same security regression vector as the one iter 085 closed. A Stripe-dashboard-metadata compromise pivots to user-account compromise via this event.
**Fix**: 5-line change — replace metadata lookup with `db.user.findFirst({ where: { stripeSubscriptionId } })` pattern, mirror iter 085 Sub-task 7.

### P0-D: `customer.subscription.deleted` doesn't write `Team.subscriptionStatus = 'canceled'` (backend §1)

**File**: `apps/web-app/src/app/api/billing/webhook/route.ts:296-374`
**Bug**: iter 085 Sub-task 1 added `Team.subscriptionStatus` column + writes it in `customer.subscription.updated`. But the `customer.subscription.deleted` handler only updates `Team.plan = 'free'` and `Team.stripeSubscriptionId = null` — it does NOT set `Team.subscriptionStatus = 'canceled'`.
**Impact**: a canceled team workspace shows `subscriptionStatus = 'active'` indefinitely. UI consumers (future plan-change banner; future billing dashboard) see incorrect state.
**Fix**: 1-line addition to the existing `db.team.update` call in the deletion handler.

### P0-E: Rate-limit Map resets on serverless cold start (qa §5)

**File**: `apps/web-app/src/app/api/invites/accept/route.ts` (in-memory `rateLimits` Map from iter 084 P0-11 fix)
**Bug**: the Map lives in module scope; serverless cold starts (Next.js Vercel-style deployment) re-initialize the module → Map empties → rate-limit guarantee lost
**Impact**: production rate-limit defense against invite-token enumeration is effectively absent under cold-start conditions
**Fix path**:
- Option A: switch to `@upstash/ratelimit` with Redis backend (adds dep + requires Redis)
- Option B: use Postgres-backed token bucket (single DB query per accept; ~50 LOC)
- Option C: document cold-start limitation + CEO ack + monitor PostHog for enumeration patterns (acceptable Phase 1 if traffic volume is low)

Coordinator-default: **Option C with explicit CEO ack** at MVP; revisit at scale.

---

## 4. AC Status Update (15 ACs Re-Validated Post Iter 084-085)

Per product-manager §1:

| AC | Description | Status |
|---|---|---|
| AC-1 | Workspace creation gated to Team+ plan | ✅ MET |
| AC-2 | Invite + email delivery 60s + 7-day expiry | ⚠️ PENDING-EMAIL (TEAM-P04) |
| AC-3 | Seat-quota enforcement | ✅ MET |
| AC-4 | Unauthenticated invite acceptance with signup | 🚧 PENDING-UI (TEAM-P07) |
| AC-5 | Authenticated invite acceptance | ⚠️ **BROKEN BY P0-A** (join route token mismatch) |
| AC-6 | Role management with sole-owner protection | ✅ MET (status code 400 vs spec 409 = P2 polish) |
| AC-7 | Member removal with sole-owner protection | ✅ MET |
| AC-8 | Invite revocation | ✅ MET |
| AC-9 | Plan downgrade soft-deactivation + owner email | ✅ MET cascade / ⚠️ PENDING-EMAIL |
| AC-10 | Plan cancellation cascade | ✅ MET cascade / ⚠️ PENDING-EMAIL **but P0-D incomplete subscriptionStatus** |
| AC-11 | WorkspaceSwitcher session-persisted active context | 🚧 PENDING-UI (TEAM-P05) |
| AC-12 | Duplicate invite prevention with upsert-on-re-invite | ✅ MET |
| AC-13 | Self-invitation prevention | ✅ MET |
| AC-14 | Free/Starter upgrade CTA in /members route | 🚧 PENDING-UI (TEAM-P06) |
| AC-15 | Invite expiration enforced | ✅ MET |

**Revised: 10 MET / 2 PARTIAL / 3 PENDING-UI / 1 BROKEN (AC-5 via P0-A).**

---

## 5. 2 NEW P0 Rows Promoted

### Row #156 TEAM-P03.9 EMERGENCY correctness fixup (5 NEW P0 BLOCKERS)

**Score**: 16 (HIGHEST in pool; emergency)
**Agent**: `backend-engineer` (5th consecutive backend; agent-diversity exception required + justified — same code-path coupling reasoning as CD-3)
**LOC**: ~80 production + ~50 test (small surface; tightly bounded)

Sub-tasks:
1. P0-A `join/route.ts:25` — hash raw token before findUnique lookup (OR delete the orphan endpoint if `POST /api/invites/accept` is the canonical one)
2. P0-B `effectivePlanFor` adoption at 3 critical sites: `billing/checkout/route.ts` (double-billing prevention) + `/api/workflows` quota gate (workspace-plan quota for invited members) + `analytics/engagement/route.ts` (correct plan emission)
3. P0-C `invoice.payment_succeeded` — replace `metadata.userId` with `stripeSubscriptionId` lookup (mirror iter 085 Sub-task 7)
4. P0-D `customer.subscription.deleted` — add `Team.subscriptionStatus = 'canceled'` to existing `db.team.update`
5. P0-E rate-limit cold-start documentation + CEO ack (Option C deferred; OR Option B Postgres-backed token bucket if CEO approves)

**Tests required**: ~25 substantive `it()` blocks. Critical: end-to-end test that an invite created → accepted at `/api/invites/accept` or `/api/teams/join` actually succeeds (regression lock for P0-A — the test that should have existed in TEAM-P02).

**BLOCKS TEAM-P04 SHIP** — same logic as iter 084 fixup: TEAM-P04 Resend integration cannot meaningfully ship if the user-facing invite flow is broken.

### Row #157 TEAM-INFRA-01 production migration safety + Resend env vars

**Score**: 13
**Agent**: `devops-engineer` (NEW agent rotation; breaks 5-consecutive backend-engineer pattern cleanly)
**LOC**: ~30 production + minimal test (mostly infrastructure config)

Sub-tasks:
1. Switch `scripts/docker-start.sh` from `prisma db push --skip-generate --accept-data-loss` to `prisma migrate deploy` + pre-migration SQLite backup (`cp /app/data/ledgerium.db /app/data/ledgerium.db.bak-$(date +%Y%m%d%H%M%S)`)
2. Add `RESEND_API_KEY` + `EMAIL_FROM` to `compose.hostinger.yaml` environment block + `.github/workflows/deploy.yml` environment-variables block
3. Update `docs/runbooks/STRIPE_SETUP.md` to clarify operational prerequisites for TEAM-001 (Live Mode keys + webhook URL + 6 events configured)
4. Create `docs/runbooks/RESEND_WORKSPACE_SETUP.md` per devops §3: 3 DNS records (SPF + DKIM + DMARC) + verified sender configuration + Resend account API key creation steps
5. Add CI post-build assertion: `git grep "RESEND_API_KEY" .github/workflows/deploy.yml | wc -l` returns >0

**Should ship BEFORE TEAM-P04** to prevent silent email delivery failures + before any further schema migration to prevent the iter 085 table-rebuild fragility from causing data loss.

---

## 6. Stripe Customer Model — De-Facto ADR

Per system-architect §2: iter 084 implementation chose **modified Option B (Shared-customer-with-implicit-handoff)**, NOT coordinator-default Option C. The same Stripe customer ID is written to BOTH `User.stripeCustomerId` AND `Team.stripeCustomerId`. This is acceptable for Phase 1 (single-payer-owns-single-workspace) but limits future flexibility:

- Cannot model "User A pays for Workspace B that they don't belong to" (sponsorship)
- Second solo subscription from the same user creates ambiguity
- Phase 2 migration to Option C (FK-only `Team.payerUserId`) is committed but not scheduled

**Action**: write `docs/adr/ADR_001_TEAM_STRIPE_CUSTOMER_MODEL.md` documenting the de-facto choice + Phase 2 migration commitment. Estimated 300 words / 0.5 day. Coordinator-recommended: ship this as a Mode 2 documentation artifact (NON-counting) before TEAM-P08, alongside or absorbed into TEAM-P03.8.

---

## 7. CEO Decisions Queued

- **CD-1**: Approve TEAM-P03.9 EMERGENCY fixup BEFORE any other iteration? Coordinator-default: **YES** — same logic as iter 084 CD-1 (broken foundation blocks all downstream work)
- **CD-2**: Approve TEAM-INFRA-01 standalone iteration before TEAM-P04? Coordinator-default: **YES** — operational gaps will surface as production failures
- **CD-3**: Approve 5-consecutive backend-engineer agent-diversity exception for TEAM-P03.9 (or rotate to system-architect)? Coordinator-default: **JUSTIFIED EXCEPTION** — P0-A through P0-D are tightly coupled to existing iter 082-085 backend code paths
- **CD-4**: Approve rate-limit Option C (cold-start documented + CEO ack) for MVP; revisit at scale? Coordinator-default: **YES** with PostHog enumeration monitoring
- **CD-5**: Approve Stripe customer model ADR documenting de-facto modified Option B + Phase 2 commitment? Coordinator-default: **YES**
- **CD-6**: Revised TEAM-001 ship timeline:
  - Original: iter 086 TEAM-P03.8 → 087 P04 → 088-090 UI → ~091 P08
  - **Revised**: iter 086 **TEAM-P03.9 EMERGENCY** → 087 TEAM-P03.8 polish → 088 TEAM-P04 Resend → 089 **TEAM-INFRA-01** ops prep → 090 TEAM-P05 UI → 091 TEAM-P06 UI → 092 TEAM-P07 UI → ~093 TEAM-P08 gate removal
  - **+2 iterations** added (TEAM-P03.9 + TEAM-INFRA-01); +2 wall-clock days
  - Coordinator-default: **APPROVE** — shipping the original plan would put broken multi-user in production

---

## 8. Critical Honesty — Status of "Multi-User"

The CEO's question was *"what is the progress on multi-user?"* The honest answer:

**Code progress**: 5 of 11 iterations done (45%). Strong architectural foundation; thorough quality reviews have surfaced + closed numerous BLOCKERS; the system is on a clear path to production-ready.

**Functional progress**: **0% — multi-user is functionally broken end-to-end today.** The token hash mismatch (P0-A) means an actual invite acceptance fails 100% of the time. The effectivePlanFor adoption gap (P0-B) means an actual invited team member cannot access workspace features. The actual end-to-end value proposition does not work.

**Confidence in foundation**: HIGH. The architectural decisions are sound; the quality review patterns (Mode 3-adjacent multi-agent reviews + emergency-fixup iterations) are catching real issues; iter 084 + 085 demonstrated the team can close major BLOCKERS quickly.

**Confidence in ship timeline**: MEDIUM. Each multi-agent review surfaces ~5-10 new issues that weren't visible in the prior review. Iter 081-083 looked complete → quality review surfaced 13 BLOCKERS. Iter 084-085 closed those → this review surfaces 5 more. There may be ANOTHER pre-ship review that surfaces more.

**Pragmatic recommendation**: ship TEAM-P03.9 (close NEW P0 BLOCKERS) → ship TEAM-P03.8 polish → ship TEAM-P04 Resend → ship TEAM-INFRA-01 ops prep → ship TEAM-P05/06/07 UI → **conduct one more multi-agent quality review BEFORE TEAM-P08** (TEAM_WORKSPACE_QUALITY_REVIEW_002) → ship TEAM-P08 literal gate removal once that review surfaces ≤2 new P1+ issues.

**Estimated TEAM-P08 ship**: iter ~093-094 (depending on what TEAM_WORKSPACE_QUALITY_REVIEW_002 surfaces). Wall-clock: ~8-10 days from today.

---

## 9. Counter Impact (Mode 3-adjacent NON-counting)

- **Iteration counter**: UNCHANGED at iter 085 (Mode 3-adjacent does not advance)
- **Cool-off recharge**: UNCHANGED at 3/3 FULL RE-ARM — preservation streak extends to **32-40 events** (longest-streak record continues)
- **D-1 reverse-portfolio-drift**: UNCHANGED at 11
- **Area saturation clock**: UNCHANGED
- **MR-020 cadence**: UNCHANGED at 3/3 (DEFERRED per CEO Option B 2026-05-18)
- **Workspace pnpm test**: 1097/1097 web-app filter unchanged (zero product code touched)
- **CLAUDE.md governance diffs**: ZERO
- **13th cumulative audit-intake event** (DV2 + MDR + WDC-001 + PIB + AI-VISION + WDC-002 + SOPPM + PATHE + PRICING-001 + TEAM-001 + ADMIN-001 + TEAM-QUALITY-001 + **TEAM-PROGRESS-001**); this is the 2nd progress-style review (QUALITY-001 closed 6 P0; PROGRESS-001 closes 5 P0 more)
- **Pool 74 → 76** (2 NEW P0 rows promoted: TEAM-P03.9 + TEAM-INFRA-01)

---

## Appendix A — File Path References

- `apps/web-app/src/app/api/teams/join/route.ts:25` — P0-A token hash bug
- `apps/web-app/src/app/api/teams/[id]/invite/route.ts:153` — invite creation hashes token correctly
- `apps/web-app/src/app/api/invites/accept/route.ts` — alternative acceptance endpoint (uses hash correctly)
- `apps/web-app/src/lib/feature-gating.ts:201` — `effectivePlanFor` definition (correct; just unused by callers)
- `apps/web-app/src/app/api/billing/checkout/route.ts:114-148` — P0-B double-billing risk site
- `apps/web-app/src/app/api/billing/webhook/route.ts:423-463` — P0-C invoice.payment_succeeded metadata.userId
- `apps/web-app/src/app/api/billing/webhook/route.ts:296-374` — P0-D customer.subscription.deleted missing subscriptionStatus
- `apps/web-app/src/app/api/invites/accept/route.ts` rate-limit Map — P0-E cold-start reset
- `scripts/docker-start.sh:35` — `prisma db push --accept-data-loss` standing risk
- `compose.hostinger.yaml` — RESEND_API_KEY + EMAIL_FROM missing
- `.github/workflows/deploy.yml` — RESEND_API_KEY + EMAIL_FROM missing from secrets

## Appendix B — Cross-Artifact References

- `docs/meta/TEAM_WORKSPACE_REVIEW_001.md` — original strategic spec; 15 ACs
- `docs/meta/TEAM_WORKSPACE_QUALITY_REVIEW_001.md` — first quality review; closed 6 P0 + 7 P1 BLOCKERS
- `docs/meta/MR_019_META_REVIEW.md` — Mode 5 N=7 D-7 pre-check; sequence extended to N=11 via this review's TEAM-P03.9 + TEAM-INFRA-01 promotions
- `docs/runbooks/STRIPE_SETUP.md` — operational dependency (iter 068)
- `docs/runbooks/RESEND_WORKSPACE_SETUP.md` — TEAM-INFRA-01 produces this (currently missing)
- `docs/adr/ADR_001_TEAM_STRIPE_CUSTOMER_MODEL.md` — system-architect §2 recommends; coordinator to write
