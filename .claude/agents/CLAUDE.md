# CLAUDE.md

## Purpose

This repository is operated as an **agentic product team** building a SaaS product using deterministic, artifact-driven workflows.

The goal is not just to ship code.
The goal is to produce **working, measurable, traceable outcomes**.

Use this file for durable operating rules only.

---

## Core Principles

1. **Deterministic over vague**
   - Prefer explicit contracts, defined artifacts, and repeatable steps.

2. **Traceable over black-box**
   - All meaningful work should map from input → transformation → output.

3. **Measurable over “done”**
   - Features should define expected outcomes and success metrics.

4. **Small, reversible changes**
   - Prefer narrow increments over broad rewrites.

5. **Artifacts are the interface**
   - Agents coordinate through written artifacts, not implicit assumptions.

6. **Simplicity wins**
   - Choose the simplest architecture and implementation that satisfies the current need.

---

## Team Operating Model

The default operating pattern is:

1. Coordinator sequences work
2. Specialist agents execute within role boundaries
3. Each phase produces artifacts
4. Downstream work must use upstream artifacts
5. QA and validation happen before claiming completion
6. Metrics are defined before launch

Do not let one agent “do everything” if a specialist exists.

---

## Standard Delivery Flow

Use this sequence unless there is a strong reason not to:

1. Define
2. Design
3. Build
4. Validate
5. Deploy
6. Measure

### Define
Create or update:
- `PRD.md`
- `MVP_SCOPE.md`
- `ACCEPTANCE_CRITERIA.md`
- `SUCCESS_METRICS.md`

### Design
Create or update:
- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `API_SPEC.md`
- `UX_FLOWS.md` when user-facing behavior matters

### Build
Implement:
- backend
- frontend
- tests
- migrations if needed

### Validate
Create or update:
- `TEST_PLAN.md`
- `BUG_REPORTS.md`
- `RELEASE_READINESS.md`

### Deploy
Create or update:
- `DEPLOYMENT_PLAN.md`
- `RUNBOOK.md`
- `ENVIRONMENT_CHECKLIST.md`

### Measure
Create or update:
- `METRICS.md`
- `EVENT_TRACKING_PLAN.md`
- `DASHBOARD_SPEC.md`

---

## Required Build Gates

Do not proceed casually across phases.

### Before major code changes
Expect these to exist:
- `PRD.md`
- `ARCHITECTURE.md`
- `API_SPEC.md`

### Before frontend implementation
Expect:
- relevant product requirements
- `UX_FLOWS.md` for important user-facing changes

### Before release
Expect:
- tests
- QA validation
- deployment steps
- metrics definition

If critical artifacts are missing, stop and create or request them.

---

## Coding Conventions

### General
- Prefer readable code over clever code
- Keep functions focused and small
- Use explicit naming
- Minimize hidden side effects
- Avoid unnecessary dependencies
- Do not introduce large frameworks without justification

### Types and Contracts
- Prefer typed interfaces where supported
- Keep API contracts explicit
- Do not silently change schema or payload shapes
- Document contract changes in the relevant artifact

### Changes
- Make the smallest change that solves the problem
- Preserve existing repo patterns unless there is a good reason to improve them
- Leave surrounding code cleaner when practical
- Update related docs when behavior or architecture changes

---

## Architecture Principles

- Prefer modular monolith over premature microservices
- Prefer explicit service boundaries over magic coupling
- Keep data models simple and durable
- Design for operability, not just feature completion
- Protect data integrity and permission boundaries
- Handle empty, loading, success, and error paths intentionally
- Use background jobs only when synchronous flow is clearly inappropriate

---

## Quality Principles

Do not claim work is complete unless:

- behavior matches requirements
- important paths are tested
- edge cases are considered
- visible UI states are handled
- known risks are called out explicitly

QA should validate against artifacts, not assumptions.

---

## Measurement Principles

Every meaningful feature should answer:

- What problem is being improved?
- What is the baseline?
- What should improve after release?
- How will we know?

Useful measures include:
- time saved
- error reduction
- activation or conversion
- retention or repeat usage
- latency or reliability improvements

If no one will act on a metric, do not track it.

---

## Documentation Rules

Documentation should be:
- short
- explicit
- decision-useful
- easy for downstream agents to use

Do not write long narrative docs when a precise checklist, contract, or matrix is better.

When updating behavior, also update the most relevant artifact.

---

## Security and Safety Defaults

- Treat secrets, tokens, keys, and `.env` files as protected
- Do not expose sensitive values in code or docs
- Use least privilege where possible
- Flag auth, permissions, PII, and logging risks explicitly
- Do not assume production secrets or infrastructure exist

---

## What Belongs in CLAUDE.md

Keep only durable repo-level memory here:
- coding conventions
- architecture principles
- operating workflow
- required artifacts
- stable quality standards

Do not put transient project facts here.

---

## What Belongs in Agent Memory Instead

Use agent memory for durable but narrower learnings such as:
- payment flow specifics
- auth file locations
- test commands
- folder-specific patterns
- deployment quirks
- integration caveats

Examples:
- “Payments use Stripe Checkout sessions”
- “Auth middleware lives in `/lib/auth`”
- “Run web tests from `/apps/web`”
- “API handlers live under `/src/server/routes`”

Only store learnings that are likely to matter again.

---

## How to Work in This Repo

When given a new task:

1. Identify the phase
2. Read the relevant artifacts
3. Check for missing dependencies
4. Make the smallest correct change
5. Validate the result
6. Update the relevant artifact if behavior changed
7. State blockers, risks, and next step clearly

---

## North Star

Build software that is:
- useful
- correct
- measurable
- easy to evolve

Fast is good.
Traceable is better.
Reliable learning is best.
