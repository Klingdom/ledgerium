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
8. **Mode 5 companion-burn-down rule (MR-004 Change A):** If the proposed Mode 5 sequence contains ≥3 items AND the open follow-up pool exceeds 8, at least one iteration of the sequence MUST be a `burn-down` selection, OR the sequence MUST be preceded by one `burn-down` iteration. The burn-down iteration should target a follow-up whose Area overlaps the sequence's Area where possible, to preserve context locality. Rationale: Mode 5 directed sequences bypass the clause-6 pool-size ceiling via operating-mode precedence; without a companion burn-down the ceiling rule becomes inoperative across multi-item sequences and the follow-up pool accumulates unbounded.

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
4. **Density-trigger enforcement (MR-002 Change A):** when clause 3 fires, the iteration log's "Candidate Selection" or "Validation" block MUST include exactly one of the following `density-response:` log lines, and the coordinator MUST emit this line in the iteration's completion summary:
   - `density-response: re-scoped to N loops` — work was split; reference the new iteration numbers.
   - `density-response: root-cause-analyst invoked` — reference the analyst's findings artifact.
   - `density-response: acknowledged, carried forward` — explicit conscious decision to defer; must include a one-sentence rationale. Silent violations are treated as a failed iteration for meta-review scoring purposes.
5. **Birth-iter field (MR-002 Change B):** every follow-up row in `IMPROVEMENT_BACKLOG.md` MUST carry a `Birth iter` column with the iteration number that created it. Rows missing this field cannot be selected until backfilled; this enables deterministic staleness-cap enforcement (clause 2) and the meta-review `age > 10` triage query.
6. **Pool-size density ceiling (MR-002 Change C):** if the open follow-up pool size exceeds 8 items at the start of an iteration, that iteration MUST be a burn-down selection, regardless of the 1-in-5 floor in clause 1. This is a ceiling rule: floor is "at least 1-in-5," ceiling is "when debt is growing, force immediate burn-down."
7. **Ceiling-rule cool-off (MR-003 Change B, narrowed by MR-004 Change B):** after 3 consecutive iterations have selected under the `burn-down` rule due to clause 6 (pool > 8), the next iteration is authorized to ignore clause 6 *once* and select by `top-score` or `blocker-cadence` — provided the iteration's "Candidate Selection" block logs `ceiling-cool-off: invoked; rationale: [reason]` with a one-sentence justification. This gives the refined scoring formula at least one discriminating selection per four-loop window even in a high-debt regime. Cool-off is single-use: the iteration immediately after a cool-off is again subject to clause 6 if pool > 8. **Exclusion (MR-004 Change B):** `directed` selections (Mode 2/5) already bypass clause 6 via operating-mode precedence and do NOT require cool-off invocation. Consuming a cool-off on a `directed` pick produces zero formula-validation evidence (observed at iter 016) and wastes a single-use resource — this is now prohibited.

**Testable metric:** over any 10-iteration window, the ratio of (follow-ups closed) / (follow-ups created) must be ≥ 0.4.

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

**Active work: Mode 5 Path B dashboard redesign + Mode 2 interrupt for #40 BUG-07.** PRD approved at iter 018 (`docs/prd/PRD_DASHBOARD_V2.md`). Executive refinement addendum approved 2026-04-21 (`docs/prd/PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT.md`) originally extended sequence from 5 → 6 iterations. CEO directive 2026-04-21 Option A inserted #40 BUG-07 as iter 023 Mode 2 targeted fix between Path B items 5 and 6 (unblocks `PRD_TEAM_TRIAL.md`). Sequence: iter 018 = PRD, iter 019 = companion burn-down (#15), iter 020 = metrics engine, iter 021 = UI build, iter 022 = a11y/polish/E2E, **iter 023 = #40 BUG-07 Mode 2 targeted fix (complete)** — schema default `"trialing"` → `"none"`, hardcoded duplicate in signup route fixed, new regression test, `PRD_TEAM_TRIAL.md` §11a unblocked. Next: **iter 024 = executive refinement (Mode 5 item 6/6 — portfolio delta, action-leading copy, RAG color, variation badge, "Needs attention" filter, run-count qualifier)**. MR-005 meta-review boundary at iter 025.

Priorities (non-blocker; ordered by score/strategic value):
- ✅ #40 BUG-07 (iter 023 complete, Mode 2, CEO-directed — Team Trial unblocked)
- Path B executive refinement (iter 024, Mode 5 item 6/6) — NEXT
- MR-005 meta-review (iter 025)
- post-Path-B burn-down cadence (iter 025+): #14 past-cap staleness, #34/35/36 audit-intake P0s, #42 v1 health-score retirement, #51 v2 analytics instrumentation (PRD §4 measurable-outcome dependency, score 13), #55 gitignore fix, #57 v2 flag full retirement
- artifact + system-health refresh dashboard process (item #4, score 13)

Follow-up pool is at **29 open items** (iter 023 closed #40; generated 0; iter 022 closed 5 + generated 3; ceiling rule still violated; MR-004 companion-burn-down rule satisfied by iter 019; Mode 5 item 6/6 at iter 024 uses directed precedence; post-MR-005 burn-down programming mandatory at iter 025+).
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
- Follow-up pool at **29 items** (see IMPROVEMENT_BACKLOG.md); pool-size ceiling rule violated. MR-004 companion-burn-down rule (Mode 5 guardrail 8) satisfied for Path B via iter 019 = burn-down #15. Iter 023 closed #40 BUG-07 via Mode 2 targeted fix (precedence bypassed ceiling; no cool-off consumed per MR-004 Change B).
- Mode 5 Path B + Mode 2 interrupt (iter 018–024) will land 6 consecutive web-app-adjacent iterations (iter 023 = schema + signup route = web-app; iter 024 = v2 UI refinement = web-app). Original saturation acknowledgement captured at iter 018 start (CEO directive, 2026-04-20) is reaffirmed by the 2026-04-21 "Accept coordinator recommendations and proceed" directive, and further reaffirmed by the 2026-04-21 Option A directive inserting #40 BUG-07 as iter 023. No extension/segmentation/normalization/policy surface coverage during this window — reverse portfolio-drift trigger (MR-004 Change E proposed, deferred to post-Path-B governance iteration) will be evaluated at MR-005 (iter 025 boundary).

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
  - 10+ consecutive iterations without touching a tracked non-extension surface (web-app, process-engine, normalization-engine, segmentation-engine, policy-engine) — flags portfolio drift (MR-003 Change D)

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
