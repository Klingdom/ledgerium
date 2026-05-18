# TEAM_WORKSPACE_REVIEW_001 — Multi-User Workspace Build

**Date:** 2026-05-18
**Mode:** 3-adjacent multi-agent strategic mini-review (NON-counting)
**Trigger:** CEO directive verbatim 2026-05-18: *"How are we going to manage the number of users based on an email user name and subscription accounts that allow for 5 or 15 users?"* + CEO selected **Option B** (block Team/Growth purchases until Workspace ships) at iter 075 close.
**Coordinator artifact owner:** AI CTO (this file)
**Status:** DRAFT — awaits CEO review before TEAM-P01 opens

---

## 1. Executive Summary

The pricing page advertises 5-seat Team ($249/mo) and 15-seat Growth ($799/mo) plans. The Stripe billing stack can charge for them today (iter 066-068). The infrastructure to deliver the advertised seat counts does not exist. CEO Option B is the correct guard: route Team and Growth to a waitlist until Workspace ships.

**Critical discovery (PM §A, BE §1, SA §1 — 3-way convergence):** The schema is **further along than a blank-slate build**. `apps/web-app/prisma/schema.prisma` already defines:

- `Team` model (will be **user-facing-named "Workspace"** but Prisma model name preserved to avoid migration touching all existing FKs)
- `TeamMember` join table with role enum (`owner` / `admin` / `member` / `viewer`)
- `TeamInvite` with token + 7-day expiry
- `plans.ts` already gates `teamWorkspace` feature to Team+ tiers
- Stub routes at `apps/web-app/src/app/api/teams/` and `/api/teams/[id]/invite/` partially implemented

**The gap is 5 specific deficiencies:**

1. Seat-quota enforcement missing from invite flow (most-recent stub returns `inviteUrl` without checking `activeMembers + pendingInvites < maxSeats`)
2. Stripe webhook updates `User.plan` but NOT `Team.plan` — workspace subscription state is detached from billing
3. No invite-acceptance page (`/invites/accept?token=X` is 404)
4. No email delivery integration (Resend SDK already in repo for Stripe billing iter 068, not wired to workspace invites)
5. No UI surfaces for workspace switching, member management, invite modal, acceptance landing, settings, plan-change messaging

**This build unlocks ~$249-$799 MRR per paying team account, removes pricing-page waitlist embarrassment, and is a hard prerequisite for AI Vision execution-tier (workspace-level AI trust tiers per `AI_INTEGRATION_PLATFORM_VISION_REVIEW_001.md` §11) and Path E cross-workflow analysis (`ProcessGraph.workspaceId` migration projected post-Workspace per Path E PRD).**

---

## 2. Agent Convergence Matrix

4 specialist agents engaged in parallel (system-architect / backend-engineer / frontend-engineer / product-manager). Cumulative agent-output words synthesized to this ~4,500-word consolidated artifact.

| Topic | system-architect | backend-engineer | frontend-engineer | product-manager |
|---|---|---|---|---|
| **Storage** | Postgres + JSONB + adjacency | Same | (consumer) | Same |
| **Email provider** | Resend ($20/mo plan) | Resend (4 DNS records; D-1 runbook) | (consumer) | Resend (D-04 default) |
| **Seat-quota race** | SERIALIZABLE + UNIQUE constraint | Same + `softDeactivateExcessMembers()` pure helper | (consumer) | AC-3 strict server-side |
| **Downgrade Option** | Option A soft-deactivate (30d grace) | Same (TEAM-P03) | (consumer) | Option A AC-9 (30d) |
| **Sole-owner protection** | Server-side enforcement | Same (TEAM-P02) | UI tooltip not silent disable | AC-6 + D-06 enforce |
| **Iteration count** | **8** (added TEAM-P08 ownership transfer) | **6** (per coordinator brief) | **10** (split TEAM-P04 into 3) | **7** (TEAM-P01..P07) |
| **Token hashing** | SHA-256 (parallel to `ApiKey.keyHash`) | Same | n/a | Same (per BE) |
| **Distinctive move** | Ownership Transfer first-class | API-Key elevation to workspace-scoped | 3 moves: K.1 activity feed + K.2 nav seat indicator + K.3 bulk CSV invite | "Workspace health digest" Phase 2 + invite-first onboarding for new Team signups |

**8-of-8-dimension convergence on all core architectural decisions** with three named divergences resolved below.

---

## 3. Divergence Resolution

### 3.1 Iteration count (6 vs 7 vs 8 vs 10)

**Coordinator synthesis: 8 iterations** (TEAM-P01 through TEAM-P08), matching frontend-engineer's correct insistence that ~1,525 LOC of UI work across 14 files cannot legitimately ship as one logical outcome:

- **Backend track (4 iterations):** TEAM-P01 schema migration → TEAM-P02 seat-quota + invite endpoints → TEAM-P03 Stripe webhook extension → TEAM-P04 Resend integration
- **Frontend track (3 iterations):** TEAM-P05 WorkspaceSwitcher + AppShell (FE-01 ~275 LOC) → TEAM-P06 Members + Invite modal + Settings (FE-02 ~750 LOC + growth-strategist D-4 clause 1 adjacency for 8+ user-visible strings) → TEAM-P07 Acceptance landing + bulk CSV + activity feed (FE-03 ~500 LOC + qa-engineer for E2E)
- **QA + gate-removal (1 iteration):** TEAM-P08 — full E2E lifecycle + axe ratchets + Stripe webhook integration test + literal pricing-gate removal commit

System-architect's TEAM-P08 ownership transfer is **DEFERRED to Phase 2** per product-manager's correct judgment that self-serve ownership transfer is an edge-case-heavy 2-iteration surface (two-party consent + billing reassignment + lower-plan-new-owner handling). MVP fallback: "To transfer workspace ownership, contact hello@ledgerium.ai."

### 3.2 D-4 clause 2 (≥200 LOC pure module) fires?

**Coordinator ruling: clause 2 does NOT fire on TEAM-P05/06/07** despite cumulative ~1,525 production LOC. Per MR-015 §5 PRESERVE-EXPORTED-SURFACE interpretive precedent: workspace components are React components, not pure modules. The clause's stated purpose is contract-level review of pure-module exported surfaces. Components consume contracts; they do not define them. The pure-module D-4 surfaces are in TEAM-P01 (schema) and TEAM-P02 (seat-quota + accept) — both architectural ownership of backend-engineer with `system-architect` review of the Prisma migration.

**D-4 clause 1 DOES fire on TEAM-P06** (≥8 user-visible copy strings: invite CTA + seat-progress label + 5 error messages + empty-state copy). `growth-strategist` adjacency MANDATORY for TEAM-P06 only.

### 3.3 Frontend distinctive moves K.1 / K.2 / K.3

All 3 frontend-engineer moves are **ACCEPTED into MVP scope** (not deferred to Phase 2):

- **K.1 Workspace activity feed** — 4th card on members page; append-only audit log of invites/removals/role-changes; seeds Phase 2 analytics. Lands in TEAM-P07 (~50 LOC; consumes existing `dashboard_v2_viewed` analytics pattern).
- **K.2 Inline seat-pressure indicator in TopNav** — amber dot at 80%; red at 100%; tooltip "4 of 5 seats used — add more on Growth →". Mirrors UsageQuotaMeter iter-048 pattern. Catches upgrade moment on EVERY page, not just /members. ~25 LOC; lands in TEAM-P05 (WorkspaceSwitcher iteration; same nav component family).
- **K.3 Bulk-invite CSV in InviteMemberModal** — disclosure toggle reveals CSV textarea + file upload + client-side parsing only (no new dependencies). Closes operational gap: Growth 15-user onboarding via 15 sequential modal opens is unacceptable UX. ~80 LOC; lands in TEAM-P07 (acceptance + bulk-invite iteration).

**Rationale**: K.2 + K.3 are not coordinator-brief items but they directly address PM Success Metric M-2 (Time-to-first-invite ≤15 minutes median) and the M-3 Seat utilization rate ≥60% target. Coordinator endorses their MVP inclusion.

---

## 4. Data Model — Additive Migration Only

Per backend-engineer §A + system-architect §B + product-manager TEAM-P01 alignment:

**`Team` model additions (NO renames):**
- `stripeCustomerId String? @map("stripe_customer_id")`
- `stripeSubscriptionId String? @map("stripe_subscription_id")`
- `plan` column ALREADY EXISTS — becomes authoritative source for workspace feature gating (separate from `User.plan` which remains for solo subscribers)

**`TeamMember` additions:**
- `status String @default("active") @map("status")` — values: `active` / `deactivated` / `pending`
- `deactivatedAt DateTime? @map("deactivated_at")`
- `reactivationDeadline DateTime? @map("reactivation_deadline")` — 30 days from soft-deactivate event per D-05

**`TeamInvite` constraint:**
- Unique compound index `@@unique([teamId, email])` with application-layer enforcement for pending-only (SQLite lacks partial indexes; PG production has them — defer to migration-platform-specific syntax)
- `revokedAt DateTime?` for revoke audit (or hard-delete; coordinator preference hard-delete since token is the authority)
- Token storage as SHA-256 hash (parallel to `ApiKey.keyHash` per backend-engineer §E)

**Why preserve "Team" Prisma model name + use "Workspace" in UI copy:**

Renaming the Prisma model triggers migration touching all existing FK columns. The user-facing word is "Workspace" everywhere (TopNav switcher / Members page header / Settings / pricing page FAQ / invite email subject). The Prisma model name `Team` is internal. This split costs 1 line of `// Note: Prisma model is "Team"; user-facing term is "Workspace"` documentation and saves a high-risk migration. Coordinator-approved.

**Effective-plan derivation logic** (per backend-engineer §D + product-manager D-5):

```typescript
function effectivePlanFor(user: User): PlanType {
  const teamPlans = activeMembershipsOf(user).map(m => m.team.plan);
  return maxByHierarchy([user.plan, ...teamPlans]);
}
```

`feature-gating.ts` will be extended to call this. Free user invited to a Growth workspace gets full Growth feature access for that workspace context — but their solo `User.plan` remains `'free'`. Workspace context is preserved in session per AC-11.

---

## 5. Acceptance Criteria Summary

Per product-manager §B (15 reader-verifiable behavioral ACs); abbreviated for synthesis. Full text in product-manager output file.

- **AC-1** Workspace creation gated to Team+ (Free/Starter → 403 `plan_upgrade_required`)
- **AC-2** Invite creation → email delivery within 60s + 7-day expiry
- **AC-3** Seat-quota: 6th invite on Team plan → 402 `seat_quota_exceeded`
- **AC-4** Unauthenticated invite acceptance → signup with email pre-filled (NON-EDITABLE)
- **AC-5** Authenticated invite acceptance → sign-in then auto-add (409 if `already_a_member`)
- **AC-6** Role management with sole-owner protection (409 `sole_owner_protection`)
- **AC-7** Member removal (sole owner cannot be removed)
- **AC-8** Invite revocation
- **AC-9** Plan downgrade soft-deactivation (30s of webhook; 30-day grace; owner email)
- **AC-10** Plan cancellation cascade (`Team.plan = 'free'`; non-owners deactivated; workspace preserved)
- **AC-11** WorkspaceSwitcher session-persisted active context
- **AC-12** Duplicate invite prevention (409 `invite_already_pending`)
- **AC-13** Self-invitation prevention (400 `self_invite_not_allowed`)
- **AC-14** Free/Starter upgrade CTA in /members route
- **AC-15** Invite expiration enforced (expired tokens cannot be accepted; preserved for audit)

---

## 6. Plan-Tier Impact

| Plan | Seats | Multi-user UI state | Pricing-page CTA (post-launch) |
|---|---|---|---|
| Free | 1 | Solo implicit workspace; no switcher dropdown; upgrade CTA on `/members` route | "Map Your First Process Free" |
| Starter | 1 | Identical to Free | "Start 14-Day Trial — No card charged for 14 days" |
| **Team** | **5** | **Switcher visible; invite UI live; seat bar N/5; on 5/5 disable with Growth upgrade CTA** | **"Start Team Trial — Full intelligence included"** |
| **Growth** | **15** | **Same + bulk-invite CSV; activity feed; nav seat indicator** | **"Start Trial — Automation scoring + AI tools included"** |
| Enterprise | Unlimited | Same as Growth + future SSO/RBAC/audit (Phase 2 deferred) | "Talk to Sales" → mailto |

**Pricing-page FAQ update** (lands in TEAM-P08 alongside literal gate removal): replace Q3 2026 waitlist copy at `pricing/page.tsx:26+179-194` with "Multi-user invites are live. Team includes 5 seats; Growth includes 15."

---

## 7. Hard Dependencies

**D-1 Resend operational setup (CEO operational task; parallel to TEAM-P01-P04 build):**
Required: verify `hello@ledgerium.ai` domain in Resend dashboard / set `RESEND_API_KEY` env var / configure verified `from: "Ledgerium AI <hello@ledgerium.ai>"`. Coordinator will produce `docs/runbooks/RESEND_WORKSPACE_SETUP.md` as part of TEAM-P04 parallel to `STRIPE_SETUP.md` precedent (iter 068). DNS propagation 24-72h means CEO should begin verification AT iter TEAM-P01 entry, not after TEAM-P04 close. **`inviteUrl` is always returned in API response** as manual-share fallback for production gap-window between TEAM-P04 ship and Resend domain verification completion.

**D-2 Team/Growth waitlist gate removal (literal commit in TEAM-P08):**
Currently iter 075 commit `e7892bd` routes Team/Growth to mailto waitlist + 402 server-side gate. TEAM-P08 reverts this single conditional block. Premature removal = billing liability.

**D-3 AI Vision Build workspace tier mapping (DO NOT pre-add column):**
Per AI_INTEGRATION_PLATFORM_VISION_REVIEW_001 §11 3-tier provider trust model, AI execution trust tiers will map to `Workspace.aiTrustTier`. Path E `ProcessGraph.workspaceId` migration will follow. Coordinator constraint: **TEAM-P01 schema migration MUST NOT structurally block these future migrations** but MUST NOT pre-add the columns either. Reserve the namespace; add on demand.

**D-4 Path E `ProcessGraph.workspaceId` migration:**
PATHE-P01 shipped iter 076 with `ProcessGraph.userId` FK. Cross-workspace graph analysis (PATHE-P10 graph merge engine + future visualizations) requires `workspaceId`. This migration ships AFTER both Workspace build close and PATHE-P10 — it is NOT a Workspace prerequisite, but Workspace must not structurally block it.

**D-5 Stripe webhook authority (`Team.plan` vs `User.plan`):**
Current iter 068 webhook updates `User.plan`. After Workspace ships, `Team.plan` is the authoritative source for workspace feature gating. `User.plan` remains for solo subscribers. TEAM-P03 wires both: `resolveTeamFromCustomer(stripeCustomerId)` returns `Team | null`; if Team exists, update Team.plan; if Team is null (solo subscriber), update User.plan. **Backwards compatibility preserved at all times.**

---

## 8. Open CEO Decisions

Coordinator-default in **bold**; silence = accept per MR-008 §6 precedent.

- **D-01 Ownership transfer:** **support ticket only at MVP** (deferred to Phase 2 self-serve). Pricing page FAQ adds: "To transfer workspace ownership, contact hello@ledgerium.ai."
- **D-02 Multiple workspaces per user:** **YES, unlimited memberships.** Effective plan derived from active workspace `Team.plan`, not the user's `User.plan`. Existing schema supports this.
- **D-03 Invite expiration window:** **7 days** (Slack/Notion/Linear industry standard). Extend to 14 days post-launch if accept rates underperform.
- **D-04 Resend plan tier:** **$20/mo (50k emails/month)** — operational analytics + bounce/complaint webhooks > free tier even though 210 invite emails/month would fit free. Already used for Stripe billing iter 068.
- **D-05 Downgrade grace window:** **30 days** soft-deactivate before hard-delete. Consistent with Notion. `reactivationDeadline` stored in `TeamMember`.
- **D-06 Sole-owner protection:** **YES, enforce at API layer.** UI shows tooltip not silent disable.
- **D-07 Sequencing — Mode 5 N=7 vs serial Mode 2:** **Mode 5 N=7 (TEAM-P01 through TEAM-P07) + standalone Mode 2 for TEAM-P08.** N=7 ≥ 6 triggers MR-005 D-7 mandatory `meta-coordinator` Mode 4 pre-check before sequence opens. The pre-check is ≤1 page projecting pool trajectory + area saturation arc + agent diversity arc. Justified by strategic importance of unlock. **Area saturation will trip at TEAM-P03** (3-consecutive web-app: P01 + P02 + P03 all backend/web-app); user-ack required per MR-005 D-2 narrowed OR insert a non-web-app burn-down between P02 and P03. Coordinator preference: explicit user-ack documented in MR-005 D-7 pre-check artifact.
- **D-08 Companion-burn-down obligation:** Per Mode 5 guardrail 8 (MR-005 D-2 scaled), N=7 with current pool > 8 obligates ⌈7/3⌉ = 3 burn-down iterations within or before the sequence. Coordinator recommendation: 2 burn-downs preceding the sequence (PATHE-P03 + open #36/#88/#103 candidates) + 1 burn-down within the sequence (between TEAM-P04 and TEAM-P05 as natural agent-rotation point off backend-engineer).

---

## 9. P0 Backlog Row Proposals (8 rows)

All rows: `Birth iter: audit-intake-TEAM-001`. Sequencing is load-bearing.

| Row | Title | Score | Agent | Phase |
|---|---|---|---|---|
| #139 TEAM-P01 | Schema migration: Team billing + TeamMember status columns | 13 | backend-engineer | 1 |
| #140 TEAM-P02 | Seat-quota enforcement + invite accept endpoint | 12 | backend-engineer | 2 |
| #141 TEAM-P03 | Stripe webhook: Team plan sync + soft-deactivate cascade | 11 | backend-engineer | 3 |
| #142 TEAM-P04 | Resend invite email integration + RESEND_WORKSPACE_SETUP.md runbook | 11 | backend-engineer | 3 (parallel) |
| #143 TEAM-P05 | WorkspaceSwitcher + hook + AppShell + K.2 nav seat-pressure indicator | 11 | frontend-engineer | 4 |
| #144 TEAM-P06 | Members page + Settings + InviteMemberModal + CreateWorkspaceModal | 10 | frontend-engineer + growth-strategist (D-4 clause 1) | 5 |
| #145 TEAM-P07 | Invite acceptance landing + K.3 bulk CSV + K.1 activity feed | 10 | frontend-engineer + qa-engineer adjacent | 6 |
| #146 TEAM-P08 | QA E2E lifecycle + axe ratchets + Stripe webhook integration + **literal gate removal** | 12 | qa-engineer | 7 |

Total: ~2,200 LOC production + ~600 LOC test across 7 build iterations. Wall-clock estimate at 1 iter/day cadence: **7-9 days**.

---

## 10. Risk Register

**Risk 1 — Existing paid Team/Growth subscribers (probability LOW, severity HIGH):**
Pricing page has had email-only waitlist since iter 075. Run before TEAM-P01: `SELECT id, email, plan FROM users WHERE plan IN ('team', 'growth')`. If any rows exist, TEAM-P01 migration includes a no-op-or-backfill script creating `Team` + owner `TeamMember` rows for each.

**Risk 2 — Downgrade UX surprise (probability MEDIUM, severity MEDIUM):**
Growth → Team downgrade soft-deactivates 10 members within 30s of Stripe webhook. Affected members mid-session see 403 with no context. Mitigation: (a) owner email within 60s naming deactivated members; (b) deactivated members see banner on next login per AC-9 with `reactivationDeadline` ISO date; (c) "most-recently-joined first" deactivation order is default; Phase 2 will add manual seat reassignment UI. Document default in owner email body verbatim.

**Risk 3 — Resend domain verification timing (probability MEDIUM, severity LOW):**
DNS propagation 24-72h means TEAM-P04 may ship before Resend can deliver emails. Mitigated by `inviteUrl` always returned in response + `emailQueued: boolean` field telegraphing delivery status. CEO can begin domain verification at TEAM-P01 entry to overlap with build.

**Risk 4 — Concurrent invite acceptance race (probability LOW, severity MEDIUM):**
Two pending invites + simultaneous acceptance → both succeed → seat-quota exceeded. Mitigation per backend-engineer §C: SERIALIZABLE transaction in `POST /api/invites/accept` + DB-level UNIQUE constraint on `TeamMember(teamId, userId)` (existing).

**Risk 5 — Free user already in 5 Growth workspaces (edge case):**
A contractor across multiple companies. Per D-02 (unlimited memberships), this is permitted. Effective-plan derivation uses `max(user.plan, ...team.plan)`; user sees full Growth features when active in a Growth workspace.

---

## 11. Sequencing Recommendation

**Mode 5 N=7 (TEAM-P01 through TEAM-P07) with mandatory MR-005 D-7 `meta-coordinator` Mode 4 pre-check** + standalone Mode 2 for TEAM-P08.

Pre-check projects:
- **Pool trajectory:** ~63 open today (post-PATHE-P02 close) + 8 new TEAM rows + ~5 closures during sequence = net +3, reaching ~66 at sequence close. Under hard ceiling 15-for-Mode-5 not applicable (that ceiling is for Mode 5 internal pool, not whole-system).
- **Area saturation:** TEAM-P01 + P02 + P03 + P04 are backend/web-app (4 consecutive); TEAM-P05 + P06 + P07 are frontend/web-app (3 consecutive). **Trip at P03**; user-ack documented in pre-check OR insert non-web-app burn-down (e.g., extension-app row #21 or segmentation-engine invariant work) between TEAM-P02 and TEAM-P03.
- **Agent diversity:** `backend-engineer` × 4 → `frontend-engineer` × 3 → `qa-engineer` × 1. At P04 close, backend-engineer hits 4-consecutive trigger — natural rotation to frontend-engineer at P05 is clean.
- **D-1 reverse-portfolio-drift:** 7 consecutive web-app iterations; N=5 trips at P05 close. Either insert extension-app burn-down OR consume CEO user-ack at P05 entry. **Recommendation: user-ack at P05** since Workspace work cannot meaningfully touch extension surface.
- **Companion-burn-down obligation:** ⌈7/3⌉ = 3 burn-downs. **Recommendation:** 2 burn-downs in iterations 078-079 BEFORE Workspace sequence opens (PATHE-P03 confidence-language copy taxonomy iter 078 + 1 extension-surface burn-down iter 079); 1 burn-down within sequence between TEAM-P04 and TEAM-P05 (PATHE-P04 variantHash + migrateProcessGraph; closes DEP-08 highest-leverage Path C risk; agent rotation off backend-engineer to system-architect).

TEAM-P08 standalone Mode 2 because (a) it's the literal billing-gate removal — deserves own commit boundary; (b) `qa-engineer` rotation off `frontend-engineer` × 3 is natural; (c) gate removal should be CEO-confirmed explicit action.

---

## 12. Success Metrics

Per product-manager §H:

- **M-1 Invite acceptance rate:** ≥55% within 30 days post-launch (B2B benchmark 50-65%; Ledgerium known-teammate context puts upper end)
- **M-2 Time-to-first-invite (TTI):** ≤15 minutes median from Team plan checkout completion. If >24h, discoverability problem — escalate to UX review.
- **M-3 Seat utilization rate:** ≥60% across all Team+ workspaces with ≥1 non-owner member at 30 days
- **M-4 Team plan upgrade rate from Free/Starter:** 3-5% MAU within 60 days = $7.5k-$12.5k MRR uplift at 1,000 MAU
- **M-5 Invite-originated paid subscriptions:** ≥10% of invite-accepted users become paying workspace owners within 90 days (viral coefficient measurement)

**Q-1 Invite flow NPS** (14d post-first-invite owner survey): ≥8.0 target; <7 triggers UX review.

**Q-3 In-app invite engagement:** PostHog `workspace_invite_sent` within first session post-checkout for ≥40% of new Team owners.

---

## 13. Distinctive Recommendations Beyond Coordinator Brief

**Coordinator-elevated to MVP scope** (3 of 5 agent-distinctive moves; 2 deferred to Phase 2):

1. **Frontend K.1 + K.2 + K.3** (activity feed / nav seat indicator / bulk CSV) — ACCEPTED for TEAM-P05/P07 inclusion. Directly addresses M-2 + M-3 targets.
2. **PM's "Invite-first onboarding for new Team signups"** — ACCEPTED for TEAM-P06 inclusion as the post-checkout redirect target. Workspace setup step with inline 1-4 teammate invite form. Reduces M-2 TTI from potentially 24h to <5min. Estimated +30 LOC inside TEAM-P06 scope; does not warrant separate iteration.
3. **Backend-engineer's API-Key elevation to workspace-scoped** — ACCEPTED. Chrome extension recording upload currently authenticates via per-user API key. Workspace-scoped extension means recordings should attribute to the active workspace. Lands in TEAM-P02 as `ApiKey.teamId?: string | null` additive column + auth-middleware extension. ~30 LOC inside TEAM-P02 scope.

**Deferred to Phase 2** (do not creep into MVP):

4. **PM's "Workspace health digest" weekly email** — high-leverage but is post-launch retention work; ship after 30-day workspace observability period.
5. **System-architect's "Ownership transfer first-class"** — 2+ iteration surface (two-party consent + billing reassignment + lower-plan-new-owner). MVP fallback = support ticket per D-01.

---

## 14. CEO Decision Queue (pending before TEAM-P01 opens)

- **CD-1** Approve D-01 through D-08 defaults (silence = accept per MR-008 §6 precedent)
- **CD-2** Confirm Mode 5 N=7 + Mode 2 TEAM-P08 sequencing (vs full serial Mode 2)
- **CD-3** Confirm 3-burn-down companion obligation discharge: 2 before sequence + 1 within (PATHE-P03 + extension burn-down + PATHE-P04)
- **CD-4** Confirm "active_workspace_id" cookie pattern (frontend-engineer §J) for active context persistence
- **CD-5** Confirm "Workspace" as user-facing term + `Team` Prisma model name preservation
- **CD-6** Begin Resend domain verification at TEAM-P01 entry (parallel to build per D-1)

---

## 15. Validation + Counter Impact (Mode 3-adjacent NON-counting)

- **Iteration counter:** UNCHANGED (Mode 3-adjacent does not advance)
- **Cool-off recharge:** UNCHANGED at 3/3 FULL RE-ARM (21-event preservation streak preserved)
- **D-1 reverse-portfolio-drift:** UNCHANGED at 4 (Mode 3-adjacent does not advance 5-iter window)
- **Area saturation clock:** UNCHANGED (Mode 3-adjacent per MDR / WDC / PIB precedent)
- **MR-019 cadence:** UNCHANGED at 2/3 (PATHE-P01 + PATHE-P02 counted; this is non-counting)
- **Cold-pool ages:** UNCHANGED
- **Workspace `pnpm test`:** 2308/2308 across 80 test files (PATHE-P02 close baseline; this artifact produces zero product code)
- **Workspace `pnpm typecheck`:** clean across all 10 packages/apps
- **CLAUDE.md governance diffs:** ZERO (no control-plane modification proposed)

---

## Appendix A — File Path References

- `apps/web-app/prisma/schema.prisma` — existing `Team` / `TeamMember` / `TeamInvite` models
- `apps/web-app/src/app/api/teams/route.ts` — existing stub for workspace creation
- `apps/web-app/src/app/api/teams/[id]/invite/route.ts` — existing stub for invite creation
- `apps/web-app/src/app/api/billing/checkout/route.ts:29` — `BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD` waitlist gate (TEAM-P08 removes)
- `apps/web-app/src/app/(public)/pricing/page.tsx:179-194` — waitlist banner (TEAM-P08 removes)
- `apps/web-app/src/app/api/billing/webhooks/route.ts` — iter 068 webhook handler (TEAM-P03 extends)
- `apps/web-app/src/lib/plans.ts` — `PLAN_FEATURES.team.maxSeats = 5` / `growth.maxSeats = 15` (consumed)
- `apps/web-app/src/lib/feature-gating.ts` — extended with effective-plan derivation in TEAM-P02
- `docs/runbooks/STRIPE_SETUP.md` — TEAM-P04 produces parallel `RESEND_WORKSPACE_SETUP.md`
- `apps/web-app/src/components/dashboard-v2/ColumnPicker.tsx` — iter-061 drawer pattern reused for InviteMemberModal
- `apps/web-app/src/components/dashboard-v2/WorkflowRow.tsx` — iter-031 InlineEdit + InlineArchiveConfirm patterns reused for member management

## Appendix B — Cross-Artifact References

- `docs/meta/AI_INTEGRATION_PLATFORM_VISION_REVIEW_001.md` §11 — workspace-scoped AI trust tiers (D-3 forward dependency)
- `docs/features/path-e-decision-aware-workflow/PRD_PATH_E_DECISION_AWARE_WORKFLOW.md` — `ProcessGraph.workspaceId` migration (D-4 forward dependency)
- `docs/meta/MR_017_META_REVIEW.md` §11 — Stripe billing-stack CODE-COMPLETE iter 068 (foundation)
- `docs/runbooks/STRIPE_SETUP.md` — operational pattern for D-1 Resend setup runbook
