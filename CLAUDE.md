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
7. **Ceiling-rule cool-off (MR-003 Change B, narrowed by MR-004 Change B):** after 3 consecutive iterations have selected under the `burn-down` rule due to clause 6 (pool > 8), the next iteration is authorized to ignore clause 6 *once* and select by `top-score` or `blocker-cadence` — provided the iteration's "Candidate Selection" block logs `ceiling-cool-off: invoked; rationale: [reason]` with a one-sentence justification. This gives the refined scoring formula at least one discriminating selection per four-loop window even in a high-debt regime. Cool-off is single-use: the iteration immediately after a cool-off is again subject to clause 6 if pool > 8. **Exclusion (MR-004 Change B):** `directed` selections (Mode 2/5) already bypass clause 6 via operating-mode precedence and do NOT require cool-off invocation. Consuming a cool-off on a `directed` pick produces zero formula-validation evidence (observed at iter 016) and wastes a single-use resource — this is now prohibited.

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

Rationale: the pattern was validated by `PRICING_AUDIT_001.md` (iter M3@016→17) where 4 P0 items entered live, ~27 P1/P2/P3 held cold, and one cold-pool item (BUG-07) promoted cleanly via PRD trigger (iter 018, closed iter 023). The codification locks in working convention before a second audit-style artifact introduces drift.

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

**Active work: MR-005 COMPLETE at iter 025. Iter 026 = #14 burn-down (process-engine, extension-adjacent, past-cap staleness #1).** MR-005 meta-review artifact: `docs/meta/MR_005.md`. 7 governance diffs applied to CLAUDE.md: D-1 reverse portfolio-drift trigger at N=5 (separately-logged user-ack), D-2 scaled companion burn-down ⌈N/3⌉ + hard-stop ceiling at pool>15 (supersedes MR-004 Change A singular language), D-3 fourth density-response option `scope-guard-adjacent`, D-4 specialist-invocation gate (`growth-strategist` ≥3 copy strings, `system-architect` ≥200 LOC new contract), D-5 Audit-Intake Pattern codification (cold pool + P0-only + PRD-trigger promotion), D-6 test-only-touch counting (supersedes MR-004 Change F), D-7 Mode 5 sequence-length soft cap at N=5. Staleness triage: 10 KEEP, 3 DOWNGRADE (#21/#28/#32), 0 DELETE. Iter 026-028 burn-down programming ordered. Path B retrospective: 19 follow-ups generated vs 8 closed over 6 iterations; N=6 sequence length produced 3 CEO user-acks and forward-drift trigger breach.

Priorities (non-blocker; ordered by score/strategic value):
- ✅ #40 BUG-07 (iter 023 complete, Mode 2, CEO-directed — Team Trial unblocked)
- ✅ Path B executive refinement (iter 024 complete, Mode 5 item 6/6)
- ✅ MR-005 meta-review (iter 025 complete; 7 governance diffs applied; staleness triage complete; iter 026-028 programming fixed)
- **Iter 026 (NEXT, MANDATORY burn-down, MUST rotate off web-app):** #14 Wire validateRenderedSOP into processSession — process-engine area, Phase-2 dependency, extension-adjacent (partial reverse-drift relief), past-cap staleness #1 (age 18), score 11
- **Iter 027 (burn-down, extension surface):** #7 Widen policy-engine credit_card regex — fully resolves reverse portfolio-drift trigger in one iteration (pure policy-engine surface, E=1/R=1)
- **Iter 028 (burn-down, bundle):** #19 + #20 bundled — both extension-app surface, both iter-010 follow-ups past cap, same `storage.ts` SW-startup code path (guardrail 7(b) one-logical-outcome preserved)
- Iter 029 first `top-score` slot eligible (cool-off re-arms after 3 consecutive burn-downs): #4 dashboard-level artifact + system-health refresh process (score 13, agentic CI area, non-web-app, non-extension — first `top-score` selection since iter 009)
- Post-burn-down pool: #34/35/36 audit-intake P0s, #42 v1 health-score retirement, #51 v2 analytics instrumentation (PRD §4 measurable-outcome dependency, score 13), #55 gitignore fix, #57 v2 flag full retirement (14d-soak window opens iter 022 + 14d), #60 per-workflow delta for needsAttention precision

Follow-up pool is at **33 open items** at iter 025 entry (no change through Mode 4 meta-review — no product code changes). Ceiling rule deeply violated; MR-004 companion-burn-down rule now superseded by MR-005 Change D-2 ⌈N/3⌉ scaling. Post-MR-005 burn-down programming (iter 026-028) projects pool ≤ 25 by iter 028 close and ≤ 15 by iter 035. Reverse portfolio-drift trigger (Change D-1) armed at iter 024 close; clears at iter 026 close if #14 selected as programmed.
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
- Follow-up pool at **33 items** at iter 025 entry (no Mode 4 delta — no product code changes in meta-review). Pool-size ceiling rule deeply violated (pool > 8; ~4× soft ceiling). MR-005 Change D-2 hard-stop ceiling (pool > 15) now in force — would fire on any Mode 5 sequence start, but no Mode 5 expected through iter 028. Post-MR-005 burn-down programming projects pool ≤ 25 by iter 028 close and ≤ 15 by iter 035 boundary (restores soft-ceiling diagnostic value).
- Reverse portfolio-drift trigger (MR-005 Change D-1, N=5) **armed at iter 024 close** — 5 consecutive iterations without extension-surface touch (020/021/022/023/024 all web-app; iter 019 was process-engine, non-extension). Clears at iter 026 close if #14 (process-engine, extension-adjacent) selected as programmed. If iter 026 fails to rotate, user-ack `reverse-portfolio-drift: user-ack; rationale: [reason]` MANDATORY in iter 027 Candidate Selection block.
- Path B CLOSED at iter 024 — **6 consecutive web-app-adjacent iterations** (020/021/022/023/024 directly web-app + iter 019 process-engine companion burn-down). 3 CEO saturation user-acks consumed (2026-04-20 original; 2026-04-21 × 2 for executive refinement + Option A BUG-07). MR-005 Change D-7 soft cap (Mode 5 N ≥ 6 requires meta-coordinator pre-check) now in force for future sequences.
- Post-MR-005 iter 026+ MUST rotate off web-app area; iter 029 is first eligible `top-score` slot (cool-off re-arms after 3 consecutive burn-downs per clause 7).

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
  - 10+ consecutive iterations without touching a tracked non-extension surface (web-app, process-engine, normalization-engine, segmentation-engine, policy-engine) — flags portfolio drift (MR-003 Change D). **Test-only touches count (MR-005 Change D-6 / MR-004 Change F):** modifications to `*.test.ts` / `*.test.tsx` / `*.spec.ts` files within a tracked surface DO count as surface coverage — they exercise determinism and catch regressions, which IS the benefit the rule was designed to surface.
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
