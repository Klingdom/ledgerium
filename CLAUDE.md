# Ledgerium AI — Claude Code Operating System

## Purpose

This repository is operated as an **agentic product system** that builds a
deterministic, evidence-driven SaaS platform.

The goal is not just to ship code.

The goal is to produce:
- working software
- measurable outcomes
- traceable system behavior

Use this file for **durable operating rules only**.

---

## Core Principles (Ledgerium)

- **Reality before opinion**
- **Evidence before interpretation**
- **Determinism before abstraction**
- **Traceability over convenience**
- **Measurable outcomes over feature output**
- **Small, reversible changes over large rewrites**

If a system is not:
- traceable
- testable
- measurable

→ it is NOT complete

---

## Product Context

Ledgerium AI is a **deterministic, evidence-linked process intelligence platform**.

System model:

Observed Behavior → Structured Events → Deterministic Processing → Process Intelligence

Core rules:
- Raw input data is immutable
- Transformations are deterministic
- Outputs must be traceable to source evidence

---

## Operating Model (Agentic Team)

This is a **multi-agent system**:

- Coordinator → sequences work
- Specialist agents → execute within roles
- Engineering agent → implements and enforces correctness

### Rules
- Do not do work outside your role
- Do not bypass upstream artifacts
- Do not invent requirements
- Always escalate gaps or contradictions

### Specialist-invocation gate (MR-005 Change D-4)

Two scope-shape signals MUST force specialist agent invocation as adjacent (not as deferred follow-up):

1. **User-visible copy changes.** When an iteration's scope includes rewriting, adding, or removing ≥3 user-visible strings (UI labels, chip copy, button text, error messages, empty-state copy, filter names), `growth-strategist` MUST be invoked as adjacent — not deferred. The adjacency is a lightweight consult (≤30 min brand-voice review) and does NOT scope-expand the primary iteration. Exception: bug fixes touching error-message wording in failure paths that already existed; these are engineering corrections, not copy changes.

2. **New-contract surface ≥200 LOC pure module.** When an iteration implements a new contract — pure module, deterministic primitive, or API layer — and the delivered surface exceeds 200 LOC (measured by the exported interface + public function bodies, not by test code), `system-architect` MUST be invoked as primary or adjacent. The adjacency ensures contract-level review happens BEFORE downstream iterations build on the surface. Exception: mechanical refactors that preserve existing contract byte-identically (extract-and-reexport patterns).

Both rules close the "deferred-as-follow-up" bypass pattern. A specialist review that happens post-iteration-close via Mode 3 correction is evidence the rule should have fired pre-iteration.

---

## Operating Modes

Each improvement-loop invocation runs in one of these modes:

- **Mode 1: Standard bounded loop** — coordinator selects highest-priority item, executes one iteration, updates artifacts.
- **Mode 2: Targeted fix** — user names a specific item; coordinator validates scope and executes as a single iteration.
- **Mode 3: Debugging** — bug-fix work that does not count toward improvement-loop cadence.
- **Mode 4: Meta-review** — coordinator invokes the meta-coordinator agent; no product code changes.
- **Mode 5: Directed sequence** — user names 2+ specific items to execute sequentially.

### Mode 5 guardrails
1. Each item executes as its own independent iteration (own commit, own validation, own artifact updates).
2. One-item-per-loop rule is preserved: no cross-item refactors; no sneaked-in follow-ups.
3. Scope discipline must be explicitly stated in each iteration's "Candidate Selection" block.
4. If the sequence contains 3+ items, a meta-review is MANDATORY before the next non-directed loop.
5. Meta-review cadence counter increments by N (one per item), not by 1 (one per batch).
6. **Same-Area saturation protocol (MR-004 Change C):** If selected items are all in the same `Area` field, the coordinator must flag saturation risk to the user AND receive explicit acknowledgement before beginning. Acknowledgement must be captured in the opening iteration's "Candidate Selection" block as `mode-5-saturation: user-ack; rationale: [reason]`. Silent "flag" without explicit user response is insufficient — the coordinator must treat absence of acknowledgement as a hard block.
7. **Scope-expansion protocol (MR-002 Change D):** a Mode 5 item's implementation may legitimately expand beyond the backlog row's literal wording ONLY if ALL of the following conditions hold:
   a. The expansion is **evidence-based** — a specialist agent (architect, root-cause-analyst, qa-engineer) has produced an artifact demonstrating the original scope would miss the actual risk surface. Speculative "while we're here" expansions are forbidden.
   b. The expanded work still resolves to **one logical outcome** — no multi-outcome bundles. If the expansion would ship two independently reversible changes, split into two iterations.
   c. The expansion stays within the **same `Area`** as the original backlog row. Cross-area expansion is a new iteration, not an expansion.
   d. The expansion is logged as `scope-expansion: approved` in the iteration log's "Candidate Selection" block with a ≤3-sentence rationale and a reference to the evidence artifact from (a).
   e. The expansion does **not** touch surfaces modified by the immediately prior iteration — this preserves the independent-iteration guarantee in guardrail 1 and prevents unreviewable cross-iteration coupling.
8. **Mode 5 companion-burn-down rule (MR-004 Change A, scaled by MR-005 Change D-2):** If the proposed Mode 5 sequence contains N ≥ 3 items AND the open follow-up pool exceeds 8 at sequence start, ⌈N/3⌉ iterations of the sequence MUST be `burn-down` selections (or equivalent burn-down iterations must precede the sequence). For N=3 this is 1 burn-down (original rule); for N=6 this is 2; for N=9 this is 3. Spacing is unconstrained — distribute within or at the start of the sequence. Burn-down iterations should target follow-ups whose Area overlaps the sequence's Area where possible, to preserve context locality. Rationale: the original "at least one" rule does not scale with sequence length; Path B at N=6 discharged the obligation with 1 burn-down (iter 019) and then accumulated 11 net follow-ups across the remaining 5 iterations — evidence that the rule becomes inoperative at sequence length >3 without scaling.
9. **Mode 5 hard-stop ceiling (MR-005 Change D-2):** If the open follow-up pool exceeds 15 at the start of any iteration within a Mode 5 sequence in progress, the coordinator MUST halt the next directed item and schedule a `burn-down` iteration in its place, regardless of user directive. The scheduled burn-down counts toward clause 8's ⌈N/3⌉ requirement. User override is available exactly ONCE per sequence by logging `hard-ceiling-override: user-ack; rationale: [reason]` in the iteration's Candidate Selection block; a second pool > 15 breach within the same sequence is a mandatory stop with no override. Rationale: soft ceiling (clause 6, pool > 8) has proven ignorable under Mode 5 operating-mode precedence; observed operational floor of 33 (Path B close) is 4× the soft ceiling. A hard-stop at 15 provides the backstop the soft ceiling was designed to guarantee.
10. **Mode 5 sequence-length soft cap (MR-005 Change D-7):** Mode 5 directed sequences of N ≤ 5 items proceed with no additional meta-check. Sequences with N ≥ 6 items require an explicit meta-coordinator pre-check before the sequence begins (Mode 4 artifact, ≤1 page, no product code). The pre-check evaluates: projected pool trajectory, projected area-saturation arc, agent-diversity projection, and whether the 6th+ item could reasonably be a separate sequence or post-sequence Mode 2. This is a soft cap — CEO may override with a logged `mode-5-length-override: user-ack; rationale: [reason]` — but the friction point forces the long-sequence risk to be considered explicitly rather than absorbed silently. Observed at Path B (N=6): 22 → 33 pool growth, 3 CEO user-acks required, reverse portfolio-drift triggered.

---

## Standard Delivery Flow

All work follows:

1. Define
2. Design
3. Build
4. Validate
5. Deploy
6. Measure

---

## Required Artifacts (Enforced)

### Before Build
- `PRD.md`
- `ARCHITECTURE.md`
- `API_SPEC.md`

### Before Release
- `TEST_PLAN.md`
- `RELEASE_READINESS.md`
- `METRICS.md`

If required artifacts are missing:
→ STOP and request or create them

Artifacts are the **source of truth between agents**

---

## Follow-Up Debt Policy

Every iteration may generate follow-up backlog items. To prevent unbounded accumulation:

1. **Burn-down cadence:** at least 1 of every 5 iterations must select its target from the follow-up pool (items tagged "follow-up (iter N)" in `IMPROVEMENT_BACKLOG.md`).
2. **Staleness cap:** any follow-up not addressed within 10 iterations of its creation is escalated to the next meta-review for explicit "keep / downgrade / delete" triage. No item sits ignored forever.
3. **Follow-up density trigger:** if a single iteration generates 3+ follow-ups, the coordinator must either (a) re-scope the iteration into multiple loops, or (b) invoke `root-cause-analyst` on why one loop is spawning that much residual work.
4. **Density-trigger enforcement (MR-002 Change A, extended by MR-005 Change D-3):** when clause 3 fires, the iteration log's "Candidate Selection" or "Validation" block MUST include exactly one of the following `density-response:` log lines, and the coordinator MUST emit this line in the iteration's completion summary:
   - `density-response: re-scoped to N loops` — work was split; reference the new iteration numbers.
   - `density-response: root-cause-analyst invoked` — reference the analyst's findings artifact.
   - `density-response: scope-guard-adjacent` — the N follow-ups are legitimate adjacencies surfaced by the iteration's PRD surface area and correctly rejected by guardrail 7(b) "one logical outcome" test; root cause is PRD surface area, not iteration quality. MUST include (a) a per-follow-up one-sentence anchor citing which PRD section / architecture-decision / blocked-on-other-item justifies it being a follow-up rather than iter-scope, OR (b) a reference to a specialist agent's evidence artifact explaining the scope-boundary. The per-follow-up audit cost is explicit — this response is stricter than `acknowledged, carried forward` and is the correct option for detailed-PRD build iterations.
   - `density-response: acknowledged, carried forward` — explicit conscious decision to defer without a specific scope-guard anchor; must include a one-sentence rationale. This is the residual option — use when the above three do not apply. Silent violations (no `density-response:` line when clause 3 fires) are treated as a failed iteration for meta-review scoring purposes.
5. **Birth-iter field (MR-002 Change B):** every follow-up row in `IMPROVEMENT_BACKLOG.md` MUST carry a `Birth iter` column with the iteration number that created it. Rows missing this field cannot be selected until backfilled; this enables deterministic staleness-cap enforcement (clause 2) and the meta-review `age > 10` triage query.
6. **Pool-size density ceiling (MR-002 Change C):** if the open follow-up pool size exceeds 8 items at the start of an iteration, that iteration MUST be a burn-down selection, regardless of the 1-in-5 floor in clause 1. This is a ceiling rule: floor is "at least 1-in-5," ceiling is "when debt is growing, force immediate burn-down."
7. **Ceiling-rule cool-off (MR-003 Change B, narrowed by MR-004 Change B, recharge added by MR-006 Change A):** after 3 consecutive iterations have selected under the `burn-down` rule due to clause 6 (pool > 8), the next iteration is authorized to ignore clause 6 *once* and select by `top-score` or `blocker-cadence` — provided the iteration's "Candidate Selection" block logs `ceiling-cool-off: invoked; rationale: [reason]` with a one-sentence justification. This gives the refined scoring formula at least one discriminating selection per four-loop window even in a high-debt regime. Cool-off is single-use per charge: the iteration immediately after a cool-off is again subject to clause 6 if pool > 8. **Recharge (MR-006 Change A):** after cool-off consumption, 3 new consecutive `burn-down` iterations re-arm the cool-off resource, at which point it may be invoked once more under the same rules. Recharge is unbounded — the rule may fire as often as the earn-it cadence allows. **Exclusion (MR-004 Change B):** `directed` selections (Mode 2/5) already bypass clause 6 via operating-mode precedence and do NOT require cool-off invocation. Consuming a cool-off on a `directed` pick produces zero formula-validation evidence (observed at iter 016) and wastes a charged resource — this is prohibited. Rationale for recharge: iter 029 validated that a single-charge consumption produces measurable formula-validation evidence (Spearman ρ distribution artifact); permanent single-use lockout in a persistent high-debt regime eliminates the rule's utility for repeat validation events.

**Testable metric:** over any 10-iteration window, the ratio of (follow-ups closed) / (follow-ups created) must be ≥ 0.4.

---

## Audit-Intake Pattern (MR-005 Change D-5 / MR-004 Change D)

Audit-style artifacts (e.g., `PRICING_AUDIT_001.md`, security audits, accessibility audits, code-health audits) produce large debt surfaces that would overwhelm the live backlog if promoted wholesale and would break the pool-size ceiling rule's diagnostic value.

Pattern:

1. **Cold pool.** Audit-style artifacts create a cold-pool reference document. All identified defects, improvements, and recommendations are listed in the audit artifact under numbered sections classified by severity (P0 / P1 / P2 / P3 or equivalent).
2. **P0-only live promotion at intake.** Only P0 items enter the live backlog at intake time. All other severity classes remain in the audit artifact as cold pool until a promotion trigger fires.
3. **Cold-pool row tagging.** Any cold-pool item that is later promoted to live must carry `Birth iter` = either the audit-producing iteration number OR `audit-intake` (a canonical anchor meaning "promoted from an audit cold pool"), whichever is most specific.
4. **Promotion path 1 — P0 burn-down creates a slot.** When a live-backlog P0 row derived from the audit closes, the next-highest cold-pool item MAY promote to live backlog (coordinator discretion, or triggered by area-relevance).
5. **Promotion path 2 — PRD-trigger promotion.** Any item in the audit cold pool MAY be promoted to the live backlog if and only if a newly-approved PRD explicitly cites it as a hard blocker in a numbered Dependencies section. The promoting iteration's log entry MUST reference the PRD path and section number (e.g., `PRD_TEAM_TRIAL.md §11a`). The promoted row's `Birth iter` field is `PRD-promoted` with the promoting-PRD path noted. No promotion on implicit or narrative dependency — citation must be enumerated and reader-verifiable.
6. **No other promotion paths.** Coordinator judgment or "we should probably look at this" is NOT a valid promotion path — it breaks the pool-size ceiling rule's protection.
7. **Cold-pool staleness escalation (MR-006 Change D).** Cold-pool items that have been held without promotion for ≥ 10 iterations post-audit-intake MUST be explicitly triaged at the next meta-review. Each aged cold-pool item receives an explicit verdict: `keep-cold` (still relevant, no action needed), `promote` (enters live backlog with `Birth iter: MR-N-promoted` and cited evidence for elevated priority), or `delete` (no longer relevant). This mirrors the live-pool 10-iteration staleness-cap treatment (Follow-Up Debt Policy clause 2) and prevents high-impact P1 items from aging silently when neither P0-burn-down nor PRD-trigger promotion occurs.

Rationale: the pattern was validated by `PRICING_AUDIT_001.md` (iter M3@016→17) where 4 P0 items entered live, ~27 P1/P2/P3 held cold, and one cold-pool item (BUG-07) promoted cleanly via PRD trigger (iter 018, closed iter 023); it was re-validated by `DASHBOARD_V2_REVIEW_001.md` (iter 026→27 intake) where 3 P0 entered live and 24 P1/P2/P3 held cold with DV2-R01 closure creating a promotion slot and DV2-R05/R06 queued for PRD-trigger promotion upon PRD_METRICS_ENGINE approval. The codification locks in working convention; the staleness-escalation clause prevents cold-pool drift.

---

## Coding Standards

### General
- TypeScript strict mode — no `any` without justification
- Functions do one thing only
- Explicit error handling — no silent failures
- Prefer clarity over cleverness

### Naming
- camelCase: variables/functions
- PascalCase: types/classes
- snake_case: API + DB fields
- SCREAMING_SNAKE_CASE: constants
- Booleans: is/has/can/should prefix

### File Structure
- One primary export per file
- No logic in index files
- Co-locate tests with source

### API Design
- REST endpoints
- Async jobs >200ms return job_id
- Response format: `{ data, error, meta }`
- Validate all inputs

### Database
- Parameterized queries only
- Additive migrations by default
- Required fields: id, created_at, updated_at
- Prefer soft deletes

### Security
- No secrets in code
- Validate + sanitize all inputs
- Enforce permissions explicitly
- Log security-relevant events

---

## Architecture Principles

- **Immutability first**
- **Deterministic pipelines**
- **Explicit contracts over magic**
- **Fail loudly in dev, gracefully in prod**
- **End-to-end reproducibility**
- **Every output traceable to source events**

---

## How to Work

### Before Coding
1. Identify phase (Define / Design / Build / Validate / Measure)
2. Read relevant artifacts
3. Confirm required artifacts exist
4. Identify impacted modules
5. Flag:
   - missing requirements
   - contradictions
   - architecture conflicts
6. Propose approach if non-trivial

---

### During Implementation
- Follow API and data contracts strictly
- Maintain deterministic behavior
- Handle all failure paths explicitly
- Match existing code patterns
- Write tests for core logic

---

### After Implementation
You must:
- validate behavior against artifacts
- ensure edge cases are handled
- update docs if behavior changed
- surface risks and gaps

---

## Quality & Scoring

All outputs are evaluated for:

- completeness
- correctness
- alignment with artifacts
- test coverage
- determinism

If quality is unclear → assume insufficient

---

## Selection Policy

The bounded-loop selection policy is NOT just "pick the highest score." It is a three-step process:

### Step 1 — Compute score

```text
priority_score =
    impact + alignment + learning + confidence
  − effort − risk
  + release_blocker_bonus      # +3 if item is in SYSTEM_HEALTH.md Release Blockers
  − saturation_penalty          # −2 if 3 of last 5 iterations landed in the same Area
```

Scale is 1–5 per dimension. Scores now range roughly 6–18 (was 10–16).

### Step 2 — Apply portfolio rules (any of these OVERRIDES top-score)

1. **Release-blocker minimum cadence:** at least 1 of every 5 iterations must address a current release blocker. If none in the last 4, iteration 5 MUST select from the blocker list.
2. **Area saturation rule:** if the last 3 iterations all landed in the same `Area`, the next iteration MUST select from a different `Area`.
3. **Follow-up burn-down:** at least 1 of every 5 iterations must target a follow-up item generated by a prior loop (see Follow-Up Debt Policy).

### Step 3 — Document the choice

The iteration log's "Candidate Selection" block must explicitly state which rule drove the selection:

- `top-score` — normal case
- `blocker-cadence` — 1-in-5 release-blocker rotation forced the pick
- `saturation-rule` — Area diversity forced the pivot
- `burn-down` — follow-up pool rotation forced the pick
- `directed` — user-named item (Mode 2 or Mode 5)

---

## CI Enforcement System

This repo includes:

- `.claude/hooks/` → enforcement
- `.claude/bin/` → scoring + dashboard
- `SYSTEM_HEALTH.md` → system status

Assume:
- invalid actions may be blocked
- edits trigger validation
- outputs are scored automatically

---

## Measurement Principles

Every feature must define:

- baseline behavior
- expected improvement
- measurable outcome

Examples:
- time reduction
- error reduction
- accuracy improvement
- process completeness

No measurable outcome → incomplete work

---

## Tech Stack

- Extension: Chrome MV3 + TypeScript + React
- Backend: Node.js + Fastify
- Frontend: React + TypeScript + TanStack Query
- Database: PostgreSQL + JSONB
- Queue: BullMQ + Redis
- Storage: S3 / MinIO
- Auth: JWT + OAuth2
- Infra: Docker Compose + Railway/Render
- LLM: Claude (later phase)
- Validation: Zod
- Testing: Vitest + Playwright
- Monorepo: pnpm

---

## Current Phase

Phase 1 in progress — **all release blockers closed as of iter 011.**
Phase 2 entry planning is unblocked; no forced-blocker items remain.

**Active work: Iter 031 CLOSED. DV2-R02 + DV2-R03 bundled "WorkflowRow interaction hardening" delivered (Mode 1, `burn-down`, pool 30 > 8 soft ceiling forcing; CLAUDE.md Mode 5 guardrail 7(b) one-logical-outcome SATISFIED — both in `WorkflowRow.tsx`, both a11y/UX hardening on existing interactions, neither introduces a new feature surface). **Agents: `frontend-engineer` primary (2 consecutive post-iter-031, under 4+ rule) + `growth-strategist` D-4 adjacent** (12 user-visible copy strings ≥3 threshold fires clause 1; ≤30 min brand-voice consult returned 7 KEEP + 5 POLISH + 0 REWRITE; all 5 POLISH substitutions applied in-place). **D-4 clause 2 `system-architect` adjacency evaluated, DID NOT fire** — production LOC 227 exceeds 200 raw threshold, but `InlineEdit`/`InlineArchiveConfirm` are private internal React sub-components (NOT exported, NOT a new module/API/primitive contract); clause 2 rationale ("contract-level review BEFORE downstream iterations build on the surface") does not apply — no downstream surface to review. Ruling documented in iter log. **Production delta +227 LOC / 1 file** (`WorkflowRow.tsx` 652 → 879): `InlineEdit` replaces `window.prompt` on rename (auto-focus input, Enter-commit/Escape-cancel/blur-commit, busy + `role="alert"` error, focus-return to trigger, `aria-label="Rename workflow"`); `InlineArchiveConfirm` replaces `window.confirm` on archive (compact 2-button affordance, auto-focus confirm, Escape cancels, `role="region"` with `aria-label="Confirm archive for {workflowTitle}"`); `HealthTooltip` extension adds `onDismiss`/`triggerRef` props with Escape dismissal via document keydown listener + focus-return, `onBlur` with `relatedTarget`+`container.contains()` distinguishing inside/outside blur, `tabIndex={-1}` on containers, explicit `role="tooltip"` (WCAG 2.1 SC 1.4.13 dismissible arm now covered; hover-show + click-toggle preserved exactly); `KebabMenu` simplification (`onRename`/`onArchive` async props → `onStartRename`/`onStartArchiveConfirm`/`onCopyLink` synchronous callbacks; state migrates to inline affordances). **Preserved verbatim:** `workflow_row_clicked` + `upgrade_clicked (location: 'dashboard_v2_health_gate')` + `analyticsHealthBand` + all iter-030 instrumentation; zero v1 dashboard changes; zero API route changes. **Post-review brand-voice polish (5 char-substitutions):** "Renaming…"→"Saving…"; "Rename failed. Please try again."→"Rename failed — changes not saved."; "Archive this workflow?"→"Archive workflow?"; "Cancel archive" aria-label→"Cancel — do not archive"; "Archive failed. Please try again."→"Archive failed — workflow not archived." **Test delta: +20 substantive `it()` blocks** (WorkflowRow.test.tsx 55 → 75; web-app package 334 → 354; MR-006 Change C threshold ≥12 satisfied with margin). Coverage: 8 DV2-R02a + 6 DV2-R02b + 6 DV2-R03. Workspace **1782/1782 unchanged** (pre-existing follow-up #53 `.test.tsx` exclusion); typecheck clean across all 9 packages/apps. **Both rows closed (pool 30 → 28).** **Cool-off recharge counter 1/3 → 2/3** per MR-006 Change A (iter 032 burn-down re-arms at 3/3; earliest `top-score` slot iter 033). **Area saturation TRIPPED at iter 031 close** — iter 029 + 030 + 031 all web-app = 3 consecutive → **iter 032 MUST select from non-web-app Area** per CLAUDE.md Selection Policy Step 2. D-1 reverse portfolio-drift counter 2 → 3 (web-app non-extension; under N=5; next check iter 034). **MR-007 cadence 1 → 2 of 3**; next meta-review earliest iter 032 per 3-loop stability floor. Zero follow-ups generated — 4 scope-adjacent observations (workflow_renamed/archived analytics gap scope-declined; defensive co-activation guard zero real-world risk; DV2-R22 pre-existing displayTitle prop-sync gap unchanged; KebabMenu early-close intentional) — none promoted. Prior iter 030: #51 v2 analytics instrumentation (6-event PRD §4 taxonomy, web-app 289 → 334, pool 31 → 30). Prior MR-006 meta-review CLOSED (Mode 4, iter 029 close, governance-only) — artifact `docs/meta/MR_006_META_REVIEW.md` 351 lines, 4 control diffs (A cool-off recharge · B no-change D-2 · C substantive-test D-6 · D cold-pool staleness 10-iter). Iter 026 delivered #14 `validateRenderedSOP` wiring via new composed public function `processSessionFull` (68 LOC, Option A — preserves existing `processSession` contract consumed by web-app API route, extension BG job, 116+ fixture tests). Process-engine package **429 → 443 tests** (+14). Workspace **1728 → 1742**. Typecheck clean. Zero follow-ups. D-4 specialist-invocation gate evaluated cleanly: 68 LOC << 200 LOC threshold; no copy strings; neither `system-architect` nor `growth-strategist` adjacency required. Past-cap staleness #1 closed (19 iterations old at close). Pool **33 → 32** at iter 026 close; **32 → 35 at DASHBOARD_V2_REVIEW_001 intake** (+3 P0 promotions DV2-R01/R02/R03 per MR-005 D-5). Cadence counter 1/3 toward MR-006 (Mode 3-adjacent reviews do NOT increment). Cool-off streak 1 of 3.

**Path C Define lane (CEO-directed v3 Process Intelligence Metrics Engine) CLOSED 2026-04-21.** 8 Define-phase artifacts under `docs/features/dashboard-v3-metrics-engine/`: INPUT_SPEC, PRD_METRICS_ENGINE, ARCHITECTURE_METRICS_ENGINE, UX_FLOWS_METRICS_ENGINE, TEST_PLAN_METRICS_ENGINE, MEASUREMENT_PLAN_METRICS_ENGINE, COPY_PACK_METRICS, COMPETITIVE_VALIDATION_METRICS, plus coordinator synthesis `PATH_C_SEQUENCING.md`. ARCHITECTURE computability verdict: 32 Tier A + 44 Tier B + 13 Tier C + 4 Tier D = 93 total; 81% Tier A/B. Core discovery: `packages/intelligence-engine/` already ships `buildMetrics`/`analyzeTimestudy`/`analyzeVariance`/`detectVariants`/`detectBottlenecks`/`detectDrift`/`computeStandardizationScore`/`scoreAutomationOpportunity`/`computePathSignature` — consume not reinvent. Path C Build proposed iter 032-042 (11 iterations) split into Phase A (iter 032-037, foundation; iter 037 = MANDATORY agent-rotation burn-down) + Phase B (iter 038-042, default-pack UI + analytics + flag retirement). **Build entry blocked by 17 CEO open questions consolidated in `PATH_C_SEQUENCING.md § 7`** + MR-005 D-7 meta-coordinator Mode 4 pre-check (MANDATORY before opening Phase A Mode 5 sequence). Iter 027-031 burn-down program unchanged; Path C Build enters EARLIEST at iter 032 post-PRD approval and post-pre-check.

Priorities (non-blocker; ordered by score/strategic value):
- ✅ #40 BUG-07 (iter 023 complete, Mode 2, CEO-directed — Team Trial unblocked)
- ✅ Path B executive refinement (iter 024 complete, Mode 5 item 6/6)
- ✅ MR-005 meta-review (iter 025 complete; 7 governance diffs applied; staleness triage complete; iter 026-028 programming fixed)
- ✅ #14 `validateRenderedSOP` wiring (iter 026 complete — new `processSessionFull` composed pipeline; past-cap staleness #1 closed; pool 33 → 32)
- ✅ #7 policy-engine `credit_card` regex widening (iter 027 complete — sensitivity.ts:28+:72 `/credit[_-]?card/i` → `/credit[\s_-]*card/i`; 6 new tests in `iter-027` block; extension-app target-inspector known-gap test flipped to gap-closed; policy-engine 56→62 tests; 1775/1775 workspace; D-1 reverse portfolio-drift trigger FULLY CLEARED; pool 35 → 34)
- ✅ #19 + #20 bundled session-store SW-startup hardening (iter 028 complete — new private helpers `gcOrphanedEventBlobs()` + `isInFlightState()` in `session-store.ts`; GC orphaned `ledgerium_active_session_events_*` keys via `chrome.storage.local.get(null, ...)` full-keyset scan; in-flight meta + missing/empty events blob → clear + return false; 7 new tests in `session-store.test.ts`; 1 existing test flipped from `state: 'recording'` → `state: 'idle'` same pattern as iter 027 assertion flip; workspace 1775→1782; pool 34 → 32; extension-app D-1 clearance extended)
- ✅ DV2-R01 v1-vs-v2 health-score distribution comparison (iter 029 complete — `top-score`, MANDATORY rotation to `analytics`; new script `apps/web-app/scripts/health-score-distribution.ts` 318 LOC + extracted adapter `apps/web-app/src/lib/metrics-input-adapter.ts` 75 LOC byte-identical D-4 exception; artifact `docs/analysis/HEALTH_SCORE_DISTRIBUTION_COMPARISON.md` 173 lines; N=6 local sample; V1/V2 means 87.83/90.17; Spearman ρ=-0.41; 0/6 band crossings; 33% delta ≥10; artifact honestly flags insufficient sample and names DV2-R05 as hard prerequisite; web-app 289 unchanged, workspace 1782/1782, typecheck clean; pool 32 → 31)
- ✅ **MR-006 meta-review** (iter 029 close, Mode 4 governance-only, non-counting) — artifact `docs/meta/MR_006_META_REVIEW.md` 351 lines; 10 rule verdicts; 4 control diffs applied to `CLAUDE.md`: Change A (cool-off recharge after 3 consecutive post-consumption burn-downs), Change B (no-change on D-2 hard-ceiling, recorded), Change C (substantive test-case requirement for drift-counter credit), Change D (cold-pool staleness escalation at 10-iter cap). Stability window iter 030-032; MR-007 earliest iter 032.
- ✅ **#51 v2 analytics instrumentation** (iter 030 complete — Mode 1, `burn-down`, `frontend-engineer`; 5 new `AnalyticsEvent` types + `upgrade_clicked` reuse with `location: 'dashboard_v2_health_gate'`; ~155 LOC across 6 production files; web-app 289 → 334 tests; workspace 1782 unchanged; zero follow-ups; pool 31 → 30; cool-off recharge 0/3 → 1/3; D-1 counter 1 → 2; MR-007 cadence 0 → 1 of 3). PRD §4 measurement blocker CLOSED — unblocks #57 flag retirement evidence path + external-launch measurement against PRD §4 success-metric targets.
- ✅ **DV2-R02 + DV2-R03 bundled "WorkflowRow interaction hardening"** (iter 031 complete — Mode 1, `burn-down`; `frontend-engineer` primary + `growth-strategist` D-4 adjacent [12 strings]; `InlineEdit` replaces `window.prompt` on rename + `InlineArchiveConfirm` replaces `window.confirm` on archive + `HealthTooltip` Escape/blur dismissal per WCAG 2.1 SC 1.4.13; +227 production LOC; +20 substantive tests; web-app 334 → 354; workspace 1782 unchanged; 5 brand-voice POLISH substitutions applied post-review; zero follow-ups; pool 30 → 28; cool-off recharge 1/3 → 2/3; D-1 counter 2 → 3; MR-007 cadence 1 → 2 of 3; **Area saturation TRIPPED at close** → iter 032 must select non-web-app). Advances #57 flag-retirement chain: iter 030 #51 ✅ + iter 031 DV2-R02 ✅ + iter 031 DV2-R03 ✅; remaining prerequisite DV2-R06 (v1 shadow-function route audit) still cold.
- **NEXT: Iter 032** — **Area saturation rule forces non-web-app selection**; ceiling rule (pool 28 > 8) still forces burn-down. Cool-off recharge counter 2/3 → 3/3 (re-arm) post-iter-032 if burn-down. Earliest `top-score`-eligible slot iter 033. Candidate non-web-app burn-down surfaces:
  - **Extension-app / segmentation-engine / normalization-engine / policy-engine:** past-cap staleness items from MR-005 KEEP triage (#23/#24/#26/#27/#29/#30/#31).
  - **PRICING_AUDIT_001 P0 cold rows #34/#35/#36:** age ~12 at iter 032 → triggers MR-006 Change D staleness review at MR-007 entry; promotion to live here is a valid burn-down option (Area = "pricing" or "billing", satisfies saturation).
  - **MR-007 meta-review (Mode 4):** earliest iter 032 per 3-loop floor; cadence counter 2 of 3 post-iter-031. Governance-only; non-counting; could be run at iter 032 to triage PRICING_AUDIT_001 cold pool under MR-006 Change D and reassess iter 032-034 programming against saturation constraint.
- Post-burn-down pool (iter 033+): **Path C Build Phase A enters here** if PRD_METRICS_ENGINE approved + MR-006 meta-coordinator pre-check cleared (see Path C Define lane above). Otherwise: #42 v1 health-score retirement (now unblocked by DV2-R01 closure), #57 v2 flag full retirement (14d-soak + DV2-R02/R03/#51 ✅ + DV2-R06 prerequisite), DASHBOARD_V2_REVIEW_001 P1 cold-pool promotions (DV2-R04 axe ratchet / DV2-R05 seed fixture + free-tier user / DV2-R06 v1 shadow-function audit — **DV2-R05 and DV2-R06 auto-promote via MR-005 D-5 clause 5 on PRD_METRICS_ENGINE approval**)

Follow-up pool is at **28 open items** post-iter-031 (30 at iter-030 close − 2 DV2-R02/R03 closures). Ceiling rule still violated (28 > 8 soft; 28 > 15 Mode-5-only hard, not applicable outside Mode 5). **Cool-off recharge counter 2/3 post-iter-031** per MR-006 Change A (iter 032 burn-down re-arms at 3/3; earliest `top-score` slot iter 033). Remaining burn-down trajectory: iter 032 (non-web-app burn-down per saturation rule, −1 or −2 depending on selection) → ~27 [recharge 3/3 → cool-off re-armed]. Realistic ≤15 target: iter 038. **Area saturation TRIPPED at iter 031 close** — iter 029 + 030 + 031 all web-app = 3 consecutive → iter 032 MUST select non-web-app per CLAUDE.md Selection Policy Step 2. **D-1 reverse portfolio-drift 5-consecutive-non-extension counter: 3 post-iter-031** (iter 029 + 030 + 031 all web-app). Under N=5 threshold. Next check iter 034 if iter 031-034 all miss extension surfaces. **DASHBOARD_V2_REVIEW_001 cold pool** holds 24 items; MR-006 Change D applies cold-pool staleness escalation at 10-iter cap — cold pool aged at iter 031: ~5 iterations (intake at iter 026→27 boundary); staleness threshold reached iter 036. **Audit-intake triage NOTE:** `PRICING_AUDIT_001.md` intake rows #34/#35/#36 (iter M3@016→17) age ~11 at iter 031; at iter 032 they will be ~12 iter post-intake and trigger MR-006 Change D staleness review at MR-007 entry. **#57 flag retirement prerequisite chain progress:** #51 ✅ (iter 030) + DV2-R02 ✅ (iter 031) + DV2-R03 ✅ (iter 031) + 14d soak-window open; remaining prerequisite is DV2-R06 (v1 shadow-function route audit — cold pool; promotion-path: P0 burn-down slot or PRD-trigger).
See IMPROVEMENT_BACKLOG.md for the full ranked pool.

Resolved (do not re-list; chronological):
- ✅ remove duplicated background logic (iter 003)
- ✅ integrate policy engine into normalizer (iter 003) and content capture (iter 008)
- ✅ SOP metadata strip + trust-signal trifecta (iters 004/005/006)
- ✅ SOP release-readiness validator (iter 007)
- ✅ Playwright E2E recording lifecycle + CI workflow (iter 009)
- ✅ full session event persistence for service worker restart recovery (iter 010)
- ✅ converge LiveStepBuilder / StreamingSegmenter / buildDerivedSteps / segmentEvents (iter 011)
- ✅ I1a LiveStep cross-path regression test (iter 012); full-pipeline golden fixture (iter 013); persistenceTruncated UI banner (iter 014)

---

## Known Issues

- No current Phase-1 release blockers.
- **v2 dashboard NOT externally-launch-ready, NOT #57-flag-retirement-ready** per DASHBOARD_V2_REVIEW_001 (2026-04-21, Mode 3-adjacent multi-agent review). GA at `/dashboard` default since iter 022 ✅; soak window open ✅; but zero PRD §4 measurement instrumented (hard blocker for #57 retirement and external launch). Artifact: `docs/meta/DASHBOARD_V2_REVIEW_001.md`.
- Follow-up pool at **28 items** post-iter-031 (30 at iter-030 close − 2 from DV2-R02/R03 closures). Pool-size ceiling rule still violated (pool > 8 soft; > 15 hard applies in Mode 5 only). MR-005 Change D-2 hard-stop ceiling (pool > 15) applies inside Mode 5 only; no Mode 5 expected until Path C Build Phase A (earliest iter 032, blocked on PRD approval + pre-check). **Cool-off recharge counter 2/3 post-iter-031** per MR-006 Change A (iter 032 burn-down re-arms at 3/3; earliest re-consumption iter 033). Burn-down trajectory: iter 032 non-web-app burn-down per saturation rule → ~27. Realistic ≤15 target: iter 038.
- **Area saturation TRIPPED at iter 031 close** — iter 029 + 030 + 031 all web-app = 3 consecutive → **iter 032 MUST select from non-web-app Area** per CLAUDE.md Selection Policy Step 2. This is a hard constraint and overrides burn-down top-score-within-burn-down-pool ranking.
- **DASHBOARD_V2_REVIEW_001 cold pool: 24 items** (11 P1 DV2-R04→R14, 10 P2 DV2-R15→R24, 3 P3 DV2-R25→R27) held in the review artifact per MR-005 D-5 clauses 4+5. Promote via P0 burn-down slot creation OR PRD-trigger enumerated dependency. Most impactful P1s: DV2-R04 axe-core regression gate, DV2-R05 `seedDashboardV2Dev()` + free-tier test user (unblocks 8 skipped E2E tests), DV2-R06 route v1 shadow-function audit (real #42 retirement blocker, not just `computeHealthScore()`). Cold-pool age at iter 031: ~5 iter; MR-006 Change D staleness threshold at 10 iter → reached iter 036.
- Reverse portfolio-drift trigger (MR-005 Change D-1, N=5) 5-consecutive-non-extension counter at **3 post-iter-031** (iter 029 + 030 + 031 all web-app). Under N=5 threshold. Next counter check at iter 034 (if iter 032-034 all also miss the tracked extension-surface list). **Iter 032 saturation-forced non-web-app selection likely lands in extension-app or pricing surface → may clear the reverse-drift counter.**
- Path B CLOSED at iter 024 — **6 consecutive web-app-adjacent iterations** (020/021/022/023/024 directly web-app + iter 019 process-engine companion burn-down). 3 CEO saturation user-acks consumed (2026-04-20 original; 2026-04-21 × 2 for executive refinement + Option A BUG-07). MR-005 Change D-7 soft cap (Mode 5 N ≥ 6 requires meta-coordinator pre-check) now in force for future sequences.
- Agent-diversity: `backend-engineer` consecutive counter broken at iter 029; `analytics` = 1 at iter 029 close; `frontend-engineer` = 2 consecutive at iter 031 close (iter 030 + 031). 4+ same-implementer trigger not yet in play; iter 032 saturation-forced non-web-app selection will likely rotate off `frontend-engineer` to `backend-engineer` or other specialist. **MR-006 meta-review CLOSED at iter 029 close** (Mode 4 governance-only; artifact `docs/meta/MR_006_META_REVIEW.md`). 4 control diffs applied to CLAUDE.md: Change A (cool-off recharge; supersedes permanent single-use), Change B (no-change on D-2 hard-ceiling recorded), Change C (substantive test-case for drift-counter credit), Change D (cold-pool staleness escalation at 10-iter cap). Stability window: iter 030-032. MR-007 cadence counter **2 of 3 post-iter-031**; **MR-007 earliest iter 032** per 3-loop floor. Hard-trigger override conditions for earlier MR-007: Mode 5 start, 2 consecutive validation failures, same-implementer-4+ trip, reverse-drift N=5.
- **Path C (v3 Process Intelligence Metrics Engine) Define lane CLOSED, Build lane BLOCKED** pending CEO decisions. 8 Define-phase artifacts under `docs/features/dashboard-v3-metrics-engine/`. Coordinator synthesis `PATH_C_SEQUENCING.md § 7` enumerates **17 CEO open questions** across 4 bands (terminology × 6 / scope × 5 / governance × 4 / measurement × 2). Build-entry blockers: (a) PRD_METRICS_ENGINE.md CEO approval, (b) MR-005 D-7 meta-coordinator Mode 4 pre-check (MANDATORY — projection is 11 iterations; N ≥ 6 soft cap triggers pre-check), (c) iter 027-031 burn-down program must complete first. Build projection: iter 032-037 Phase A (foundation; iter 037 = mandatory agent-rotation burn-down because 4 consecutive `system-architect` iterations 033-036 would trip agent-diversity rule), iter 038-042 Phase B (default-pack UI + analytics + v1 retirement + #57 flag retirement). No iteration numbers consumed by Define work (Mode 3-adjacent non-counting). DV2-R05 and DV2-R06 auto-promote from cold pool via MR-005 D-5 clause 5 upon PRD approval.
- Path C Define agent-diversity for Mode 3-adjacent work: 8 agents invoked in parallel (product-manager / system-architect / ux-designer / qa-engineer / growth-strategist / analytics / competitive-researcher). MR-005 D-4 specialist-invocation gate cleared for Define phase: new-contract ≥200 LOC projected for Build (triggers system-architect adjacency — already satisfied by primary architect artifact); ≥3 user-visible copy strings across the 91-row display-label surface (triggers growth-strategist adjacency — already satisfied by primary COPY_PACK artifact).

Do not silently fix tracked issues — surface and update status

---

## Commands

- `pnpm test`
- `pnpm test:coverage`
- `pnpm typecheck`
- `pnpm build`
- extension dev/build via workspace filters

---

## Compaction Recovery Protocol

When context is lost:

1. Read:
   - CLAUDE.md
   - docs/invariants.md
   - session + segmentation source files

2. Run:
   - `pnpm typecheck`
   - `pnpm test`

3. Verify invariants:
   - constants
   - schema versions
   - confidence scores

Never modify invariants without explicit approval

---

## Memory Rules

### Store in CLAUDE.md
- coding standards
- architecture principles
- workflow rules
- required artifacts

### Store in agent memory
- file locations
- commands
- integration details
- repo-specific learnings

Examples:
- auth middleware location
- test commands per app
- API routing patterns

---

## Meta-Review Cadence

- **Base cadence:** every 3 completed improvement loops.
- **Increment rule:** Mode 5 directed sequences increment the counter by N (one per item), not by 1 (per batch).
- **Early triggers** (any of these forces an immediate meta-review, bypassing the 3-loop cadence):
  - 3+ consecutive iterations in the same `Area` field
  - 0 release-blocker items selected in 5 loops AND at least 1 open blocker exists in `SYSTEM_HEALTH.md`
  - Same implementing agent used for 4+ consecutive loops
  - Follow-up accumulation > 10 open items
  - 2+ iterations fail validation in a row
  - A named release blocker has survived 8+ loops
  - 10+ consecutive iterations without touching a tracked non-extension surface (web-app, process-engine, normalization-engine, segmentation-engine, policy-engine) — flags portfolio drift (MR-003 Change D). **Test-only touches count (MR-005 Change D-6 / MR-004 Change F, tightened by MR-006 Change C):** modifications to `*.test.ts` / `*.test.tsx` / `*.spec.ts` files within a tracked surface count as surface coverage **only if they include ≥1 new or materially-modified test case assertion** — adding a new `test(...)` / `it(...)` block OR changing an existing assertion's expected value / predicate / coverage. Mock-plumbing-only edits (import paths, `vi.mock` stub additions, harness-parameter passthroughs) do NOT count as surface coverage. Rationale: mock-plumbing edits do not exercise determinism or catch regressions; the rule's diagnostic intent is substantive coverage, not file-level touch count.
  - **Reverse portfolio drift (MR-005 Change D-1):** 5+ consecutive iterations without touching ANY tracked extension surface (extension-app, segmentation-engine, normalization-engine, policy-engine) — flags reverse portfolio drift. Test-only touches count per MR-004 Change F. Mode 5 directed-precedence does NOT auto-suppress this trigger; if the user elects to continue after the trigger fires, the next iteration's Candidate Selection block MUST log `reverse-portfolio-drift: user-ack; rationale: [reason]` as a separate acknowledgement from any Mode 5 saturation ack. The two acks are independently auditable.

After a meta-review completes, do not run another for at least 3 loops — changing multiple control variables more often than that makes effectiveness measurement impossible.

---

## What Not To Do

- do not invent requirements
- do not bypass artifacts
- do not introduce non-deterministic logic
- do not overengineer
- do not hide complexity behind abstraction
- do not assume missing context

---

## North Star

Build a system that:

- captures real behavior
- processes it deterministically
- produces trustworthy outputs
- improves continuously

Correct > Fast  
Traceable > Clever  
Measured > Assumed
