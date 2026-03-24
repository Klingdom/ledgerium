# Ledgerium AI — Engineering Rules

## Purpose

This document defines the global engineering constraints, standards, and enforcement rules for building Ledgerium AI.

It ensures:
- architectural consistency
- privacy compliance
- deterministic system behavior
- alignment with foundational principles

These rules apply to:
- all code
- all services
- all components
- all contributors (human and AI)

---

## Scope

This document governs:
- implementation behavior
- system constraints
- code standards
- interaction with schemas and specs
- decision-making boundaries

This document does NOT define:
- product features (see product docs)
- schemas (see schema docs)
- detailed specs (see component specs)

---

## Source of Truth Level

**Global Rule Authority (Very High)**

Subordinate to:
- foundation_overview.md
- trust-and-privacy-contract.md

Overrides:
- all implementation decisions
- all engineering shortcuts

---

## Core Engineering Principles

### 1. Determinism First

All systems must behave deterministically.

Requirements:
- same input → same output
- no randomness in core logic
- no hidden state mutations

Prohibited:
- non-deterministic workflows
- inconsistent outputs across runs

---

### 2. Privacy by Default

Privacy is enforced in code, not policy.

Requirements:
- no content capture
- sanitize all data before storage
- enforce redaction rules

Prohibited:
- storing user input values
- capturing sensitive data
- optional privacy controls (must be default)

---

### 3. Spec-Driven Development

All implementation must follow documentation.

Requirements:
- code must map to spec requirements
- no undocumented behavior
- no speculative features

Prohibited:
- “best guess” implementations
- skipping unclear requirements

---

### 4. Minimal Data Philosophy

Capture and store only what is required.

Requirements:
- smallest viable payload
- no redundant data
- no unnecessary duplication

---

### 5. Explainability

All outputs must be explainable.

Requirements:
- trace outputs to inputs
- log transformation steps
- avoid opaque logic

---

## Non-Negotiable Rules

### R-ENG-001: No Content Capture

System must NEVER store:
- typed input values
- email content
- documents
- chat messages
- clipboard data

---

### R-ENG-002: Schema Compliance

All data must conform to defined schemas.

Requirements:
- no undocumented fields
- no schema mutation without doc update

---

### R-ENG-003: No Silent Failures

Errors must:
- be logged
- be visible in development
- not be swallowed silently

---

### R-ENG-004: Deterministic Processing

Core systems must:
- produce consistent results
- avoid randomness
- avoid time-based variability (unless explicit)

---

### R-ENG-005: No Hidden Behavior

System must not:
- perform hidden data collection
- execute background actions without visibility

---

### R-ENG-006: Explicit State Management

All state must be:
- observable
- controlled
- documented

---

### R-ENG-007: No Spec Drift

If implementation differs from docs:

- stop implementation
- propose doc update
- do not proceed without alignment

---

## Code Organization Rules

### File Structure

Code must follow logical grouping:

- capture layer
- processing layer
- output layer
- shared utilities

---

### Naming Conventions

- descriptive, not abbreviated
- consistent across codebase
- aligned with schema terminology

---

### Separation of Concerns

Each module must have:
- a single responsibility
- clear inputs/outputs

---

## Data Handling Rules

### R-ENG-DATA-001: Sanitize Before Storage

All data must be sanitized before:
- persistence
- transmission

---

### R-ENG-DATA-002: Immutable Event Data

Event data must not be mutated after creation.

---

### R-ENG-DATA-003: No Raw DOM Storage

Do not store:
- full DOM
- HTML snapshots
- page content

---

### R-ENG-DATA-004: URL Normalization

All URLs must:
- remove query params
- normalize IDs

---

## Event Handling Rules

### R-ENG-EVT-001: Event Atomicity

Each event must represent:
- one meaningful occurrence

---

### R-ENG-EVT-002: Event Ordering

Events must be:
- strictly ordered
- timestamped

---

### R-ENG-EVT-003: Event Deduplication

System must:
- detect duplicates
- remove noise

---

## Performance Rules

### R-ENG-PERF-001: Lightweight Capture

Recorder must:
- minimize DOM observation
- avoid heavy listeners

---

### R-ENG-PERF-002: Efficient Processing

Processing must:
- scale with session size
- avoid unnecessary recomputation

---

### R-ENG-PERF-003: Memory Efficiency

Avoid:
- large in-memory objects
- redundant storage

---

## Error Handling Rules

### R-ENG-ERR-001: Explicit Errors

Errors must:
- include context
- be actionable

---

### R-ENG-ERR-002: Safe Fallbacks

System must:
- degrade gracefully
- avoid crashing user experience

---

## Logging Rules

### R-ENG-LOG-001: Structured Logging

Logs must be:
- structured
- machine-readable

---

### R-ENG-LOG-002: No Sensitive Data in Logs

Logs must NOT include:
- user content
- sensitive identifiers

---

## Testing Rules

### R-ENG-TEST-001: Schema Validation Tests

All events must:
- pass schema validation

---

### R-ENG-TEST-002: Privacy Tests

Must verify:
- no sensitive data captured

---

### R-ENG-TEST-003: Determinism Tests

Must confirm:
- identical input → identical output

---

### R-ENG-TEST-004: Edge Case Coverage

Test:
- empty sessions
- long sessions
- rapid interactions

---

## Version Control Rules

### Branching

Use:
- feature branches
- descriptive names

---

### Commits

Must:
- be atomic
- reference relevant docs or requirements

---

### Pull Requests

Must include:
- source docs
- requirements implemented
- compliance checklist

---

## Documentation Rules

### R-ENG-DOC-001: Docs Before Code

If behavior is undefined:
- update docs first
- then implement

---

### R-ENG-DOC-002: Keep Docs Updated

If code changes:
- update relevant docs

---

### R-ENG-DOC-003: Reference Docs in Code

Code should:
- reference requirement IDs where applicable

---

## Security Rules

- validate all inputs
- prevent injection attacks
- isolate extension context
- follow browser security best practices

---

## Extension-Specific Rules

### R-ENG-EXT-001: No Page Interference

Extension must not:
- break page functionality
- modify user workflows

---

### R-ENG-EXT-002: Safe DOM Interaction

Use:
- event delegation
- minimal DOM inspection

---

### R-ENG-EXT-003: SPA Compatibility

Handle:
- route changes
- dynamic DOM updates

---

## AI Usage Rules

### R-ENG-AI-001: No Core Logic Delegation

LLMs must NOT:
- define workflows
- replace deterministic logic

---

### R-ENG-AI-002: AI as Enhancement Only

AI may:
- improve labeling
- enhance UX

But not:
- replace core system logic

---

## Compliance Enforcement

All implementations must include:

- requirement mapping
- compliance check
- test validation

---

## Review Checklist

Before merging:

- follows schema
- follows privacy rules
- deterministic behavior verified
- no hidden data capture
- tests included

---

## Key Risks

### Drift from Specs

Mitigation:
- enforce doc-driven development

---

### Privacy Violations

Mitigation:
- strict rules + tests

---

### Over-Engineering

Mitigation:
- follow minimal data principle

---

## Success Criteria

Engineering is successful if:

- system is deterministic
- privacy is preserved
- code aligns with docs
- system scales cleanly
- outputs are trustworthy

---

## Dependencies

Depends on:
- foundation_overview.md
- trust-and-privacy-contract.md

Informs:
- all engineering work
- all implementation decisions

---

## Change Log

### v1.0 — Initial Engineering Rules
- defined global constraints
- established privacy and determinism rules
- defined testing and documentation standards
