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

Priorities:
- remove duplicated logic
- integrate policy engine
- add E2E tests
- implement session recovery
- add structured logging

---

## Known Issues

- duplicated logic in extension background
- policy engine not fully integrated
- missing E2E tests
- incomplete session persistence

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
