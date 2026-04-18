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
6. If selected items are all in the same `Area` field, the coordinator must flag saturation risk to the user before beginning.

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

Phase 1 in progress.

Priorities (ordered by release-blocker status):
- **[BLOCKER]** add Playwright E2E tests for recording lifecycle
- **[BLOCKER]** implement full session event persistence for service worker restart recovery
- add structured error logging with session context
- extract confidence thresholds (remove circular import)
- widen policy-engine credit_card regex to accept whitespace separators

Resolved (do not re-list):
- ✅ remove duplicated background logic (iter 003)
- ✅ integrate policy engine into normalizer (iter 003) and content capture (iter 008)
- ✅ SOP metadata strip + trust-signal trifecta (iters 004/005/006)
- ✅ SOP release-readiness validator (iter 007)
- ✅ converge LiveStepBuilder / StreamingSegmenter / buildDerivedSteps / segmentEvents (iter 011)

---

## Known Issues

- full session event persistence missing
- no Playwright E2E coverage

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
  - 0 release-blocker items selected in 5 loops
  - Same implementing agent used for 4+ consecutive loops
  - Follow-up accumulation > 10 open items
  - 2+ iterations fail validation in a row
  - A named release blocker has survived 8+ loops

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
