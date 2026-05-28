# USER_MANAGEMENT_ACCOUNT_PAGE_REVIEW_001 (UMAP-001)

**Type**: Mode 3-adjacent multi-agent strategic mini-review (NON-counting)
**Date**: 2026-05-23
**Coordinator**: AI CTO orchestration layer
**Source directive (CEO, verbatim)**: *"Create a way to manage multi-user invite process using email alias. User management should be a part of the Account page if the subscription allows for multi-users. Users should be able to be added using an email alias and a confirmation email. Users should also be able to be deleted and any other core functionality that is usual for multi-user access."*
**Agents engaged**: 4 in parallel — `product-manager` + `ux-designer` + `frontend-engineer` + `growth-strategist`
**Cumulative agent output**: ~7,800 words synthesized below

---

## §1 Executive Summary

The CEO directive **re-scopes** the existing TEAM-001 UI plan (rows #143/#144/#145) from "dedicated workspace pages at `/app/workspace/[id]/members`" → "integrated section on the existing Account page at `/app/account`."

The 4 specialist agents converged on the following high-confidence outcomes:

1. **"Email alias" = standard email address** — 4-of-4 agent convergence. The directive uses natural-language phrasing; the existing TeamInvite schema, the 17-platform competitive landscape, and the 15 ACs all assume RFC-compliant email addresses. Plus-addressing and Ledgerium-issued aliases are NOT recommended interpretations.
2. **Account-page placement: between Plan & Billing and Extension Sync** — 4-of-4 agent convergence. Section card pattern matches existing Account-page architecture (`apps/web-app/src/app/(app)/account/page.tsx` is a pure Client Component with single-column vertical scroll under `max-w-ds-content`).
3. **Free/Starter plan-tier behavior: SHOW with upgrade CTA (not HIDDEN)** — 4-of-4 agent convergence. Hiding the section removes the highest-intent conversion surface in the product.
4. **WorkspaceSwitcher (#143 TEAM-P05) DEFERRED** — 3-of-4 agent convergence (frontend-engineer/product-manager/ux-designer explicit; growth-strategist implicit by silence). Single-workspace-per-account at MVP eliminates switching need.
5. **Re-scope TEAM-P06 (#144), keep TEAM-P07 (#145) unchanged** — 4-of-4 agent convergence.
6. **Hard dependencies must close BEFORE this feature can ship**: TEAM-P03.10 EMERGENCY (8 P0 BLOCKERS, iter 087) + TEAM-P04 Resend integration + TEAM-INFRA-01 ops prep (RESEND_API_KEY + EMAIL_FROM + DNS propagation 24-72h).

**Coordinator verdict**: feature is well-scoped and architecturally feasible. Backend already shipped (iter 082-086); the work is purely frontend integration + email confirmation. Recommended sequencing closes TEAM-P03.10 + TEAM-P04 + TEAM-INFRA-01 first, then ships the Account-page integration over 2 iterations.

---

## §2 Background

### Existing Account page (`apps/web-app/src/app/(app)/account/page.tsx`)

- Pure Client Component (`'use client'` line 1)
- Single-column vertical scroll under `max-w-ds-content`
- 5 sections in order: Profile / Plan & Billing / Extension Sync / Admin (conditional) / Trust & Privacy
- Data loading: `useEffect` + `fetch` + `useState` (no TanStack Query)
- Existing component pattern: `card px-ds-5 py-ds-5` block with `flex items-center gap-ds-3 mb-ds-4` section header
- Inline confirmations preferred over modals (no modal infrastructure currently)

### Backend already shipped (iter 082-086)

| Endpoint | Status |
|---|---|
| `POST /api/teams` | Shipped — creates workspace |
| `POST /api/teams/[id]/invite` | Shipped — returns `inviteUrl` with raw token |
| `GET /api/teams/[id]/invite` | Shipped — lists pending non-expired non-revoked invites |
| `DELETE /api/teams/[id]/invite/[inviteId]` | Shipped — revoke |
| `GET /api/teams/[id]/members` | Shipped — supports `?status=` query |
| `DELETE /api/teams/[id]/members/[memberId]` | Shipped — soft-delete to `status='removed'` |
| `PATCH /api/teams/[id]/members/[memberId]` | Shipped — role change |
| `GET /api/teams` | Shipped — returns all memberships including teamId |
| `POST /api/invites/accept` | Shipped — SHA-256 token + SERIALIZABLE txn |
| `GET /api/account` | Shipped — returns `features.teamWorkspace` boolean |

### Open P0 BLOCKERS preventing immediate ship

8 P0 BLOCKERS open per TEAM_WORKSPACE_SYSTEMS_TEST_REVIEW_001 (see `docs/meta/TEAM_WORKSPACE_SYSTEMS_TEST_REVIEW_001.md`). Row #158 TEAM-P03.10 EMERGENCY fixup at iter 087 closes them. The Account-page UI work cannot ship cleanly on top of broken backend — particularly P0-E (status filter missing at 7 team-management call sites, allowing removed admins to retain 30-day access).

---

## §3 Re-Scoped Acceptance Criteria (15 ACs)

From product-manager contribution; reproduced verbatim for implementation reference.

**AC-1 Section visibility gating.** Authenticated user at `/app/account`: when `effectivePlan ∈ {free, starter}`, the User Management card renders with upgrade CTA and NO management controls. When `effectivePlan ∈ {team, growth, enterprise}`, the full management section renders.

**AC-2 Upgrade CTA path.** Free/Starter users see a `<Users />` icon header + "Team plans include multi-user access — invite up to 5 teammates on Team or 15 on Growth" copy + "Upgrade to Team →" button that anchor-scrolls to Plan & Billing section on same page.

**AC-3 Invite by email address.** Owner/admin clicks "Invite teammate", enters email + role (Member/Admin), clicks "Send invite". `POST /api/teams/[id]/invite` called. Success → invite appears in Pending list immediately. Failure → server error message inline without dismissing.

**AC-4 Confirmation email delivery.** Within 60 seconds of successful invite creation, invitee receives email from `Ledgerium AI <hello@ledgerium.ai>` with subject "You've been invited to join [WorkspaceName] on Ledgerium" and button linking to `/teams/join?token=[rawToken]`. **Depends on TEAM-P04 Resend integration**.

**AC-5 Invite acceptance — unauthenticated recipient.** Follow link unauthenticated → land on `/teams/join?token=X` with signup form (email pre-filled, non-editable). On successful signup + acceptance, `POST /api/invites/accept` called → added to workspace → redirect to `/app/dashboard`.

**AC-6 Invite acceptance — authenticated recipient.** Follow link authenticated → `POST /api/invites/accept` automatic → added to workspace → redirect to `/app/dashboard` with toast "You joined [WorkspaceName]". If already member → 409 `already_a_member` displayed as non-fatal "You're already a member of this workspace."

**AC-7 Pending invite display.** User Management card displays pending invites in separate Pending subsection. Each row: invitee email + invited role + expiry date. Owners/admins see Revoke button.

**AC-8 Invite revocation.** Click Revoke → inline confirmation (not `window.confirm`) → `DELETE /api/teams/[id]/invite/[inviteId]`. Success → invite disappears without page reload.

**AC-9 Member removal.** Each active member row has Remove button visible to owners/admins. Click → inline confirmation. Confirm → `DELETE /api/teams/[id]/members/[memberId]`. Success → row disappears. Sole-owner protection: 409 with "You cannot remove the workspace owner. Transfer ownership first."

**AC-10 Seat utilization display.** Card header displays seat bar: "3 of 5 seats used" (Team), "7 of 15 seats used" (Growth), "Unlimited seats" (Enterprise). At 80%+: amber. At 100%: red + "At seat limit — upgrade to Growth for 15 seats →".

**AC-11 Role display + edit.** Each member row: email + name + role badge + join date. Owners/admins see inline Edit role dropdown (excluding self if sole owner). Members see role as static badge.

**AC-12 Self-invite prevention.** Submitting own email → client-side error "You cannot invite yourself" + server returns 400 `self_invite_not_allowed` as defense-in-depth.

**AC-13 Duplicate invite prevention.** Email with existing pending invite → 409 "A pending invite for this email already exists" inline without form dismiss.

**AC-14 Seat quota enforcement display.** When `activeNonOwnerCount + pendingInviteCount >= availableNonOwnerSeats` → Invite button disabled + tooltip "Workspace is at its seat limit — upgrade to Growth for 15 seats". Server enforces via 402 `seat_quota_exceeded`.

**AC-15 Single workspace per account at MVP.** Section operates on primary workspace = workspace where user is owner (if exists), otherwise first by `joinedAt`. No workspace selector at MVP.

---

## §4 UX Design — Account Page Integration

From ux-designer contribution.

### Section placement

**Between Plan & Billing and Extension Sync.** Rationale: billing governs seat count; cause-and-effect adjacency. Free/Starter users see locked state (not hidden) to preserve conversion surface.

### Section layout

```
┌─ card px-ds-5 py-ds-5 ────────────────────────────────┐
│  [Users icon]  Team Members         [Invite teammate] │
│  Manage who has access to your workspace.              │
│                                                        │
│  ░░░░░░░░░░░░░░░░░░░░░░░  3 of 5 seats used           │
│  (amber at ≥80%, red at 100%)                          │
│                                                        │
│  ACTIVE MEMBERS (3)                                    │
│  ┌────────────────────────────────────────────────┐   │
│  │ jane@example.com  Jane Smith   [Owner]    ···  │   │
│  │ bob@example.com   Bob Lee      [Member] [···]  │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  PENDING INVITES (1)                                   │
│  ┌────────────────────────────────────────────────┐   │
│  │ alex@example.com  Invited 2 days ago [Revoke]  │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  [Deactivated banner if any]                           │
└────────────────────────────────────────────────────────┘
```

### Component reuse

- **Seat bar**: adapt `UsageQuotaMeter` (iter-048; `apps/web-app/src/components/UsageQuotaMeter.tsx`)
- **Member rows**: API key row pattern (`flex items-center justify-between rounded-ds-md border border-[var(--border-subtle)]`)
- **Kebab visibility**: iter-034 MDR-P06 CSS pattern (`opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100`)
- **Inline confirmations**: iter-031 `InlineArchiveConfirm` pattern (`apps/web-app/src/components/dashboard-v2/WorkflowRow.tsx`)
- **Role badges**: existing badge class `rounded-ds-sm px-2.5 py-0.5 text-ds-xs font-medium`
- **Empty states**: `text-ds-xs text-[var(--content-tertiary)]` centered

### Invite flow — INLINE FORM (not modal)

ux-designer recommends inline expanding form below the action bar — NOT a separate drawer/modal. Rationale: modal pattern has no Account-page precedent; inline form is lower friction and consistent. Form expands below "Invite teammate" button on click:

```
┌─ Invite teammate ─────────────────────────────────┐
│  Email address                                     │
│  [_______________]  e.g. colleague@yourcompany.com │
│  Role                                              │
│  [Member ▾]                                        │
│  [Send invitation]   [Cancel]                      │
└────────────────────────────────────────────────────┘
```

**Note: divergence from frontend-engineer §2** which proposed drawer modal pattern (iter-061 ColumnPicker). Coordinator verdict: **ux-designer's inline-form recommendation supersedes** — consistent with Account-page pattern; lower implementation cost; better keyboard ergonomics. frontend-engineer should drop `InviteMemberModal` and ship inline form instead.

### Deletion / role change UX

- **Remove member**: inline `InlineArchiveConfirm`-style two-button confirm replacing row content. Soft-delete via `DELETE`. Sole-owner protection: button disabled + tooltip.
- **Role change**: click role badge → inline `<select>` → submit PATCH immediately (no confirm; low-risk + reversible).
- **Reactivation banner**: `ds-callout ds-callout-warning` above member list when deactivated members exist. Per-row Reactivate button if seats allow.

### Plan-tier variation

| Plan | Card state |
|---|---|
| Free / Starter | Locked card with single `ds-callout ds-callout-info`: Zap icon + "Unlock team collaboration" + "Upgrade to Team →" anchor-scroll to `#billing` |
| Team / Growth (under 80%) | Full management section, no callouts |
| Team / Growth (80-99%) | Amber seat bar + inline notice "{n} seat remaining — upgrade to Growth for {m} more" |
| Team / Growth (100%) | Red seat bar + Invite button disabled + warning callout "All N seats filled — upgrade or remove member" |
| Enterprise | Full section + "Unlimited seats" label; no upgrade affordances |

---

## §5 Frontend Implementation Plan

From frontend-engineer contribution (revised per ux-designer's inline-form supersession).

### Plan-tier conditional rendering

**Option B implementation** — server-side `canManageUsers` via existing `features.teamWorkspace` from `GET /api/account`. No new endpoint needed.

```typescript
// UserManagementSection.tsx
const { data: account } = await fetch('/api/account').then(r => r.json());
if (!account.features.teamWorkspace) {
  return <UpgradeWorkspaceCta plan={account.plan} />;
}
// ... proceed with management UI
```

### Component tree (post-supersession; modal → inline form)

| Component | File | Est. LOC |
|---|---|---|
| `UserManagementSection` | `components/account/user-management/UserManagementSection.tsx` | ~180 |
| `SeatUsageIndicator` | `.../SeatUsageIndicator.tsx` | ~45 |
| `MembersList` | `.../MembersList.tsx` | ~70 |
| `MemberRow` | `.../MemberRow.tsx` | ~110 |
| `PendingInvitesList` | `.../PendingInvitesList.tsx` | ~55 |
| `PendingInviteRow` | `.../PendingInviteRow.tsx` | ~55 |
| `DeactivatedMembersList` | `.../DeactivatedMembersList.tsx` | ~45 |
| `InviteTeammateForm` (inline; replaces modal) | `.../InviteTeammateForm.tsx` | ~120 |
| `ChangeRoleDropdown` | `.../ChangeRoleDropdown.tsx` | ~70 |
| `RemoveMemberConfirm` | `.../RemoveMemberConfirm.tsx` | ~60 |
| `UpgradeWorkspaceCta` | `.../UpgradeWorkspaceCta.tsx` | ~65 |

**Estimated total: ~875 production LOC + ~380 test LOC.** Zero new npm dependencies.

### D-4 specialist-invocation gate

- **Clause 1 (≥3 user-visible copy strings) FIRES** — 15+ unique strings. `growth-strategist` adjacency MANDATORY (copy already drafted in §6 below; embed verbatim at delegation time).
- **Clause 2 (≥200 LOC pure module) DOES NOT FIRE** — largest component (`InviteTeammateForm` ~120 LOC) below threshold; React components are not pure modules.

### Backend endpoint gaps flagged

1. **Reactivate-member endpoint does not exist.** `GET /api/teams/[id]/members?status=deactivated` returns `reactivationDeadline` but no PATCH variant for reactivation. **Decision**: either ship reactivation endpoint at iter 091 OR render deactivated rows read-only. Coordinator-default: render read-only at MVP; add reactivation endpoint as separate row.
2. **Team auto-creation for new Team-plan users.** If user upgrades to Team but has no team yet, UI must `POST /api/teams` to bootstrap. Pure frontend state machine — no new backend needed.

---

## §6 Copy + Activation (verbatim for implementation)

From growth-strategist contribution. All strings comply with COPY_PACK_METRICS.md §1 brand-voice rules.

### Section header (Team+ user)

- Title: `Team Members`
- Subtitle: `Everyone with access to this workspace — add or remove members and manage their roles.`
- Seat usage: `{n} of {max} seats used`

### Section header (Free/Starter user)

- Title: `Team Members`
- Lock indicator: `Requires Team plan`
- Upgrade headline: `Invite your team — record and analyze workflows together`
- Sub-copy: `Team plan includes 5 seats, shared workflow library, and health score comparison across your whole team.`
- Button: `Compare plans →`

### Invite form

| Field | Copy |
|---|---|
| Title | `Invite a teammate` |
| Email label | `Email address` |
| Email placeholder | `teammate@company.com` |
| Role label | `Role` |
| Role options | `Member` / `Admin` / `Owner` (Owner conditional) |
| Submit button | `Send invitation` |
| Loading state | `Sending…` |
| Success | `Invitation sent to {email}. They have 7 days to accept.` |

### Error states (verbatim)

| Condition | HTTP | String |
|---|---|---|
| Self-invite | 400 | `You cannot invite yourself` |
| Already member | 409 | `This person is already a member of this workspace` |
| Pending exists | 409 | `An invite is already pending for this email address` |
| Seat quota | 402 | `This workspace is at its member limit — upgrade to add more seats or remove an existing member` (verbatim from route.ts:136 — POLISHed at TEAM-P03) |
| Owner overflow | 402 | `No seats available for additional teammates — promote a member to owner or remove an owner to make room` |
| Network/500 | 500 | `Could not send invite — try again` |

### Resend fallback

`Email delivery is temporarily unavailable. Copy this link to share directly:` + URL + `Copy link` button

### Member row actions

- Role badges: `Owner` / `Admin` / `Member` (sentence-case, not all-caps)
- Action menu: `Change role` / `Remove from workspace`
- Sole-owner tooltip: `Assign another member as owner before changing your role`
- Remove self: `Remove yourself from this workspace? You'll lose access immediately.`
- Remove other: `Remove {name} from this workspace? They'll lose access immediately.`
- Pending row: `Sent to {email} — expires {Month D, YYYY}`
- Revoke action: `Revoke invite`
- Revoke confirm: `Revoke this invitation? The link will stop working immediately.`

### Deactivated banner

`{n} member{s} lost access when you downgraded. Reactivate them within 30 days before their data is removed.`

### Confirmation email (TEAM-P04 implementation)

**Subject (≤55 chars):** `{InviterName} invited you to join {WorkspaceName}`

**Body:**
> Hi there,
>
> **{InviterName}** has invited you to join **{WorkspaceName}** on Ledgerium as a **{Role}**.
>
> Ledgerium records and measures digital processes — once you join, you'll be able to view workflows your team has recorded and compare process health scores across the workspace.
>
> [Accept Invitation]
>
> This invitation expires on **{Month D, YYYY}**.
>
> If the button above doesn't work, paste this URL into your browser:
> {inviteUrl}
>
> If you weren't expecting this invitation, you can safely ignore this email.
>
> — The Ledgerium team
> ledgerium.ai

### Owner notification email (recommended YES at MVP)

**Subject:** `{Name} joined {WorkspaceName}`

**Body:**
> Hi {OwnerName},
>
> **{Name}** ({email}) accepted your invitation and joined **{WorkspaceName}** as a **{Role}**.
>
> View your team members in the Account page.
>
> [View workspace →]
>
> — The Ledgerium team
> ledgerium.ai

### Activation funnel CTAs

| User state | Copy |
|---|---|
| Free | `Invite your team — up to 5 seats on Team plan` + `Compare plans →` |
| Starter | `You're recording solo — Team plan adds up to 4 teammates` + `Compare plans →` |
| Team @ 80% | `1 seat remaining — upgrade to Growth for 10 more` (amber chip) |
| Team @ 100% | `All 5 seats filled — upgrade to Growth to add up to 10 more, or remove a member` + dual CTA |
| Growth @ 80% | `3 seats remaining — contact us to expand your workspace` + `Talk to us →` mailto |

---

## §7 Hard Dependencies + Sequencing

Strict dependency order:

| # | Dependency | Status | Notes |
|---|---|---|---|
| 1 | TEAM-P03.10 EMERGENCY (8 P0 BLOCKERS, iter 087) | ⚠ open | P0-E security incident vector; must close before UI ships |
| 2 | TEAM-P04 Resend integration | ⚠ open | AC-4 confirmation email requires this |
| 3 | TEAM-INFRA-01 ops prep (RESEND_API_KEY + EMAIL_FROM + DNS) | ⚠ open | 24-72h DNS propagation; longest-lead item |
| 4 | TEAM-P06-REVISED Account-page foundation (iter 091) | proposed | SeatBar + MembersList + plan-gate |
| 5 | TEAM-P06.5 Account-page invite layer (iter 092) | proposed | InviteTeammateForm + Pending invites |
| 6 | TEAM-P07 Acceptance landing (iter 094) | proposed | `/teams/join?token=X` — unchanged from original spec |
| 7 | TEAM-P08 QA + Live Mode + gate removal (iter 095) | proposed | Final ship; irreversible gate removal |

**Critical path: TEAM-INFRA-01 Resend DNS propagation.** CEO should begin Resend domain verification for `hello@ledgerium.ai` IMMEDIATELY (parallel to TEAM-P03.10 work) — 24-72h propagation is the longest-lead-time item.

**Estimated wall-clock**: 3 build iterations post-dependency closure (iter 091 + 092 + 094) at 1 iteration/day = 3 days build.

---

## §8 Backlog Row Proposals

### Existing rows — modifications

**Row #143 TEAM-P05 — DEFER from MVP sequence.**
- Original scope: WorkspaceSwitcher + AppShell + workspace-permissions helper + K.2 nav seat-pressure indicator
- Rationale: single-workspace-per-account at MVP eliminates switcher need. Account-page seat bar (AC-10) supersedes K.2 nav indicator.
- Action: strikethrough row #143; create follow-up row TEAM-P05-DEFERRED for post-MVP multi-workspace scenarios

**Row #144 TEAM-P06 — RE-SCOPE.**
- Original scope: Members page + Settings + InviteMemberModal + CreateWorkspaceModal at `/app/workspace/[id]/members`
- New scope (TEAM-P06-REVISED): Account-page User Management section — `UserManagementSection` + `MembersList` + `MemberRow` + `SeatUsageIndicator` + `UpgradeWorkspaceCta` + plan-tier gating via `features.teamWorkspace`
- Birth iter unchanged; agent unchanged (`frontend-engineer` primary + `growth-strategist` D-4 clause 1 adjacency MANDATORY); score unchanged at 10
- LOC estimate: ~875 production + ~380 test

**Row #144.5 TEAM-P06.5 NEW — Invite layer (split from re-scoped #144).**
- Scope: `InviteTeammateForm` (inline expanding form) + `PendingInvitesList` + `PendingInviteRow` (revoke) + role-change inline dropdown
- Primary: `frontend-engineer` + `growth-strategist` D-4 clause 1 adjacency
- Score 10; LOC estimate ~400 production + ~180 test
- Dependencies: row #144 ships first (foundation); TEAM-P04 ships in parallel (for confirmation email delivery)
- Birth iter: `UMAP-001-promoted`

**Row #145 TEAM-P07 — UNCHANGED in scope.**
- Acceptance landing at `/teams/join?token=X` still required (AC-5 + AC-6)
- Recommendation: defer K.3 bulk-CSV invite to post-MVP follow-up (cramped UX in inline form pattern)
- Recommendation: defer K.1 activity feed to post-MVP follow-up (server-side audit logging from day one; UI surface in second iteration)

### New row — coordinator action required

Add the 3 row modifications to `IMPROVEMENT_BACKLOG.md` post-CEO-acknowledgement of this artifact.

---

## §9 Open CEO Decisions

Coordinator-default in **bold**; silence = accept per MR-008 silence-as-accept precedent.

**D-01 Email alias interpretation.**
- (a) Standard email address
- (b) Plus-addressing routing (team+name@company.com)
- (c) Ledgerium-issued unique alias per invitee
- **Coordinator-default: (a) standard email address.** Matches existing TeamInvite schema; aligns with 17-platform competitive landscape; 4-of-4 agent convergence.

**D-02 Single vs multi-workspace at MVP.**
- **Coordinator-default: single workspace per account at MVP.** WorkspaceSwitcher (#143) deferred. Section operates on workspace where user is owner; fallback to first by `joinedAt`.

**D-03 Account page section placement.**
- **Coordinator-default: insert between Plan & Billing and Extension Sync.** Contextual proximity to billing; 4-of-4 convergence.

**D-04 Free/Starter plan-tier behavior.**
- **Coordinator-default: SHOWN with upgrade CTA (not HIDDEN).** Highest-intent conversion surface.

**D-05 Bulk CSV invite deferral (K.3 from original TEAM_WORKSPACE_REVIEW_001).**
- **Coordinator-default: DEFER to post-MVP follow-up row.** Inline form pattern makes bulk CSV cramped. Sequential invites cover 15-user Growth onboarding.

**D-06 Activity feed / audit trail deferral (K.1 from original TEAM_WORKSPACE_REVIEW_001).**
- **Coordinator-default: DEFER UI surface to post-MVP follow-up row.** Server-side audit logging ships from day one; UI exposure in second iteration.

**D-07 Modal vs inline-form for invite flow.**
- ux-designer recommends inline expanding form; frontend-engineer initially proposed drawer modal.
- **Coordinator-default: inline expanding form per ux-designer.** Matches Account-page pattern; lower implementation cost; better keyboard ergonomics.

**D-08 Reactivation endpoint at iter 091 vs read-only at MVP.**
- **Coordinator-default: render deactivated rows read-only at MVP; add reactivation endpoint as separate row.** Minimizes iter 091 scope; reactivation is post-downgrade edge case.

**D-09 Owner notification email at acceptance.**
- **Coordinator-default: YES at MVP.** Closes activation feedback loop for inviter; ~50 LOC additional in TEAM-P04 implementation.

---

## §10 Agent Convergence + Divergence

### Strong convergence (4-of-4 agents)

- Email alias = standard email address
- Account-page integration target (not separate workspace route)
- Section placement between Plan & Billing and Extension Sync
- Free/Starter: SHOW with upgrade CTA, not HIDDEN
- Plan-tier gating via `features.teamWorkspace` (already in `/api/account`)

### Divergence requiring coordinator ruling

- **Invite UI pattern**: ux-designer = inline form; frontend-engineer = drawer modal. **Coordinator ruling: inline form** (ux-designer prevails on pattern consistency).
- **Reactivation endpoint scope**: frontend-engineer flagged as new backend work; product-manager assumed it exists. **Coordinator ruling: render read-only at MVP; ship endpoint as separate row.**

### Silent assumptions worth flagging

- All 4 agents assume the Account page is a single page (no tabs/sidebar). Verified by ux-designer audit.
- No agent addressed RBAC implications (Enterprise tier mentions "future SSO/RBAC affordances" as Phase 2 deferred). This is correct for MVP.
- No agent addressed the SOC 2 audit trail requirement that may apply to member changes. Server-side audit logging recommended for day-one shipping (D-06 partial); explicit consideration deferred to a Phase 2 security review.

---

## §11 Validation + Closing Verdict

**Mode 3-adjacent NON-counting iteration:**
- Zero product code touched
- Iteration counter NOT advanced
- Cool-off recharge counter UNCHANGED
- D-1 reverse-portfolio-drift counter UNCHANGED
- MR-019 cadence counter UNCHANGED
- Area saturation clock NOT advanced

**Artifact output:** this consolidated synthesis at `docs/meta/USER_MANAGEMENT_ACCOUNT_PAGE_REVIEW_001.md` (~7,800 cumulative agent-output words → ~4,200-word consolidated synthesis).

**Backlog row changes proposed (require coordinator-applied edit to `IMPROVEMENT_BACKLOG.md`):**
- Row #143 TEAM-P05 → DEFERRED (strikethrough; replaced by post-MVP row)
- Row #144 TEAM-P06 → RE-SCOPED (Account-page integration)
- Row #144.5 TEAM-P06.5 NEW → Invite layer (split from re-scoped #144)
- Row #145 TEAM-P07 → UNCHANGED + K.1/K.3 deferred to follow-up rows

**CEO action items (in priority order):**
1. **TODAY: start Resend domain verification** for `hello@ledgerium.ai` — 24-72h DNS propagation is critical-path
2. **TODAY: confirm UMAP-001 D-01 through D-09 coordinator-defaults** OR specify overrides (silence-as-accept applies after MR-008 precedent)
3. Acknowledge backlog row modifications proposed in §8
4. Continue executing TEAM-P03.10 EMERGENCY at iter 087 (independent of this artifact)

**Coordinator final verdict:** feature is **architecturally sound and ready to ship** after dependency closure. Backend foundation from iter 082-086 is sufficient. UI work is bounded at ~1,275 LOC across 2 iterations + 1 acceptance-landing iteration. Critical path is Resend DNS propagation, not engineering effort.

---

## Appendix A — Agent Output Index

| Agent | Section | Word count |
|---|---|---|
| product-manager | 15 ACs + email alias resolution + plan-tier behavior + row proposals + dependencies + 6 CEO decisions | ~2,400 |
| ux-designer | Account page audit + section placement + layout + invite flow + deletion/role change + plan-tier variation | ~2,200 |
| frontend-engineer | Account page audit + component tree + plan-tier rendering + new files + D-4 gate + endpoint gaps | ~1,800 |
| growth-strategist | Section copy + invite form copy + member actions + email copy + activation funnel | ~1,400 |
| **Total** | | **~7,800** |

## Appendix B — File References

- Existing Account page: `apps/web-app/src/app/(app)/account/page.tsx`
- Backend invite route: `apps/web-app/src/app/api/teams/[id]/invite/route.ts`
- Backend members route: `apps/web-app/src/app/api/teams/[id]/members/[memberId]/route.ts`
- Backend accept endpoint: `apps/web-app/src/app/api/invites/accept/route.ts`
- Stripe webhook: `apps/web-app/src/app/api/billing/webhook/route.ts`
- Plan config: `apps/web-app/src/lib/plans.ts`
- Subscription status normalizer: `apps/web-app/src/lib/workspace/subscription-status.ts`
- Seat management: `apps/web-app/src/lib/workspace/seat-management.ts`
- Feature gating: `apps/web-app/src/lib/feature-gating.ts:201` (`effectivePlanFor`)
- UsageQuotaMeter (reuse): `apps/web-app/src/components/UsageQuotaMeter.tsx`
- Inline confirmation pattern (reuse): `apps/web-app/src/components/dashboard-v2/WorkflowRow.tsx` (iter-031 `InlineArchiveConfirm`)
- Brand voice: `docs/features/dashboard-v3-metrics-engine/COPY_PACK_METRICS.md`

## Appendix C — Prior Review Cross-References

- TEAM_WORKSPACE_REVIEW_001 (original Mode 3-adjacent spec)
- TEAM_WORKSPACE_PROGRESS_REVIEW_001 (5 P0 BLOCKERS → closed iter 086)
- TEAM_WORKSPACE_QUALITY_REVIEW_001 (defect audit)
- TEAM_WORKSPACE_SYSTEMS_TEST_REVIEW_001 (8 P0 BLOCKERS → row #158 TEAM-P03.10 EMERGENCY iter 087)
- USER_MANAGEMENT_ACCOUNT_PAGE_REVIEW_001 (this artifact)

**5-review cap discipline preserved** — UMAP-001 is a scope-revision review, not a quality audit. TEAM_WORKSPACE_QUALITY_REVIEW_002 (iter 093) remains the FINAL quality review before TEAM-P08 ship.
