# Ledgerium AI — Engineering Project Plan

**Sources:** `ledgerium_product_philosophy_and_system_design.md`,
`ledgerium_technical_architecture_and_roadmap.md`, and all root-level specs.
**Last updated:** 2026-03-23

---

## Product Definition

Ledgerium AI is a **trust-first, deterministic, evidence-linked process
intelligence platform** that converts observed browser workflow activity into
auditable process maps, SOPs, and reusable process knowledge.

**Core principle:** Reality before opinion. Evidence before interpretation.
Determinism before abstraction.

**What it is not:** a screen recorder, a surveillance tool, an AI summarizer
detached from evidence, or a generic workflow dashboard.

---

## Architecture Overview

The system is a layered, deterministic pipeline:

```
Browser interaction
  → Capture layer       (content scripts + service worker)
  → Normalization layer (raw events → canonical events)
  → Segmentation layer  (canonical events → steps + activities)
  → Process engine      (steps → process runs + definitions)
  → Output layer        (renders maps, SOPs, evidence views, exports)
  → Trust/governance    (privacy, permissions, versioning, audit)
```

**Architectural style:** Modular monorepo for MVP. Clear domain boundaries
from day one. Internal package separation before service separation.
Backend is deferred — the browser extension is the center of gravity for MVP.

**Trust boundary model** — every output must be labeled as one of:
- **Observed** — directly captured
- **Derived deterministically** — rules applied to evidence
- **User-edited / user-confirmed** — human override
- **AI-assisted** — optional enhancement, never source of truth

---

## Repository Structure

```
ledgerium/
├── apps/
│   ├── extension-app/          # Chrome MV3 side panel recorder
│   └── web-app/                # Platform UI (Phase 3+)
├── packages/
│   ├── shared-types/           # Common TypeScript types
│   ├── schema-events/          # Canonical event schema + Zod validators
│   ├── schema-process/         # ProcessRun, ProcessDefinition schemas
│   ├── capture-core/           # Capture engine logic
│   ├── normalization-engine/   # Raw → canonical event transformer
│   ├── segmentation-engine/    # Steps + activity derivation (deterministic)
│   ├── process-engine/         # Process runs, definitions, variants, metrics
│   ├── renderers/              # Process map, SOP, evidence drawer renderers
│   ├── ui-components/          # Shared React components
│   ├── policy-core/            # Privacy, redaction, sensitivity rules
│   └── api-client/             # Backend API client (Phase 3+)
├── docs/
│   ├── project-plan.md         # This file
│   ├── adr/                    # Architecture decision records
│   ├── schemas/                # Formal schema specs
│   └── roadmap/                # Phase-level detail docs
├── fixtures/
│   ├── capture-runs/           # Real captured session fixtures
│   └── segmentation-golden/    # Golden output files for regression tests
├── scripts/
└── tests/
```

---

## Canonical Data Model

These entities are stable contracts. Do not redesign without explicit
architectural discussion.

### RawCaptureEvent
Low-level capture from browser instrumentation.
Fields: `raw_event_id`, `run_id`, `timestamp`, `source_type`,
`browser_context`, `dom_context_summary`, `event_payload`, `sensitivity_flags`

### CanonicalEvent
Normalized, versioned event. Input to all downstream engines.
Fields: `event_id`, `schema_version`, `run_id`, `event_type`, `event_time`,
`actor_type`, `application_context`, `page_context`, `target_summary`,
`action_summary`, `evidence_ref`, `normalization_metadata`

### ProcessRun
Single recorded workflow execution.
Fields: `process_run_id`, `schema_version`, `recorder_version`,
`segmentation_rule_version`, `capture_start_at`, `capture_end_at`,
`run_status`, `event_count`, `step_count`, `activity_count`, `warnings`,
`user_annotations`, `review_status`

### ProcessStep
Atomic user-meaningful unit of work inside a run.
Fields: `step_id`, `process_run_id`, `ordinal`, `title`, `step_type`,
`start_event_id`, `end_event_id`, `duration_ms`, `system_touchpoints`,
`evidence_refs`, `derivation_metadata`

### ActivityGroup
Logical cluster of steps accomplishing a sub-goal.
Fields: `activity_id`, `process_run_id`, `title`, `ordinal`, `step_ids`,
`purpose_hint`, `evidence_refs`

### ProcessDefinition
Durable, reusable abstraction built from one or more runs.
Fields: `process_definition_id`, `schema_version`, `title`, `description`,
`source_run_ids`, `canonical_step_ids`, `variant_summary`,
`confidence_profile`, `created_from_rule_version`, `lifecycle_state`

### EvidenceRef
Stable reference linking any derived output back to source event spans.
Fields: `evidence_id`, `run_id`, `start_event_id`, `end_event_id`,
`evidence_type`, `redaction_state`

### OutputArtifact
Exportable artifact produced from run or definition.
Fields: `artifact_id`, `artifact_type`, `source_entity_type`,
`source_entity_id`, `renderer_version`, `generated_at`, `file_refs`

---

## Canonical Event Taxonomy

```
Navigation:      page_loaded, route_changed, tab_activated, app_context_changed
Interaction:     element_clicked, text_entered_summary, selection_changed,
                 checkbox_toggled, form_submitted, shortcut_invoked
State/context:   view_ready, async_wait_started, async_wait_ended,
                 validation_error_shown, confirmation_received
Recorder:        recording_started, recording_paused, recording_resumed,
                 recording_stopped, user_annotation_added
Derived:         step_boundary_detected, activity_group_created, variant_detected
                 (always labeled as derived, never captured)
```

---

## Roadmap — 6 Phases

### Phase 0 — Technical Foundation & Proof of Capture

**Goal:** Validate extension architecture, prove stable recording lifecycle,
establish internal message bus.

**This phase is done when:** Recording starts, runs, and stops reliably.
Events are logged locally. Debug replay is possible.

#### 0.1 Monorepo Scaffold
- Initialize pnpm workspaces with `apps/` and `packages/` structure above
- Configure TypeScript strict mode across all packages
- Vitest for unit tests, Playwright for extension E2E
- Basic CI pipeline (lint + typecheck + test)

#### 0.2 Extension Shell (Chrome MV3)
- Side panel application (React + TypeScript)
- Content scripts + background service worker
- Internal message bus (typed contracts between scripts ↔ worker ↔ panel)
- Local storage adapter (abstracted — swap chrome.storage vs IndexedDB later)

#### 0.3 Recorder State Machine
Implement the full lifecycle as an explicit state machine:
```
idle → armed → recording → paused → stopping → processing
  → review_ready → exported → error
```
State transitions are first-class events (logged, inspectable).

#### 0.4 Initial Event Taxonomy + Raw Capture Logging
- Capture: `page_loaded`, `route_changed`, `element_clicked`,
  `text_entered_summary`, `form_submitted`, `recording_started`,
  `recording_stopped`, `user_annotation_added`
- Privacy defaults enforced at capture: skip password fields, no raw
  keystroke values, no clipboard
- Append raw events to local buffer
- Export raw JSON for debug inspection

**Exit criteria:**
- [ ] Reliable recording lifecycle across target browser flows
- [ ] Stable, typed message passing across all extension components
- [ ] Raw event export is inspectable JSON
- [ ] State machine handles all error paths without silent failures

---

### Phase 1 — Deterministic MVP

**Goal:** A user records a browser workflow and gets back inspectable JSON,
a basic process map, and a draft SOP — all grounded in evidence.

**This phase is done when:** End-to-end capture → export works reliably.
Users can inspect every step and trace it to source events. Outputs are good
enough to replace a manual first draft for many browser workflows.

#### 1.1 `packages/schema-events` — Canonical Event Schema v1
Build this first. Every other component depends on it.
- Versioned JSON schema (`schema_version: "1.0.0"`)
- Zod validators for `RawCaptureEvent` and `CanonicalEvent`
- TypeScript types generated from schema
- Invariant rules: monotonic `t_ms`, required fields enforced
- Privacy defaults: `text_capture=none`, `screenshots=off`,
  `dom_snapshots=off`
- URL normalization + selector normalization specs encoded in schema

#### 1.2 `packages/normalization-engine` — Event Normalization
Transforms raw captured events into canonical form.
- Map browser events to stable canonical types
- Deduplicate noisy events (rapid duplicate clicks, background DOM mutations)
- Normalize timestamps, identifiers, URL tracking params
- Apply sensitivity/redaction policy (`policy-core`)
- Preserve normalization provenance metadata on every event
- Output: `CanonicalEvent[]` + normalization warnings
- Unit tests: each event type, redaction rules, idempotency

#### 1.3 `packages/policy-core` — Privacy & Redaction Rules
- Configurable exclusion rules: password fields, hidden fields, restricted
  domains, user-defined ignore zones
- Sensitivity classification per event
- Redaction metadata preserved (not silently dropped)
- Versioned rule sets (rule changes tracked separately from schema changes)

#### 1.4 `packages/schema-process` — ProcessRun Schema v1
- Versioned `ProcessRun`, `ProcessStep`, `ActivityGroup`, `EvidenceRef` types
- Zod validators
- `segmentation_rule_version` field on ProcessRun — rule changes are auditable

#### 1.5 `packages/segmentation-engine` — Deterministic Segmentation v1

This is a core product moat. Build it as a pure, testable function.

**Segmentation pipeline:**
```
Canonical events
  → Noise reduction
  → Micro-action grouping
  → Step boundary detection
  → Activity clustering
  → Run-level structure
```

**Step boundary triggers:**
- Page/screen transition
- Major semantic target change
- Form submission completion
- Explicit user annotation
- Idle gap > 45 seconds
- Application context change

**Reduction rules (from recorder_spec.md):**
- `click + nav` within 2500ms → "Navigate"
- Multiple `input_focus/blur` + `submit` → "Fill + Submit"
- Repeated clicks within 1000ms → deduplicate
- Error events → explicit "Handle error" step

**Canonical step signature:** `Verb|Object|app_id|page_kind`

**Every derived step must include explainability metadata:**
- `boundary_reason` (e.g. `form_submitted`, `context_changed`)
- `grouping_reason` (e.g. `repeated_same_target`)
- `confidence` score (0–1)
- `evidence_refs` to source event range

**Test requirements:**
- All boundary rule types covered
- Fixture replay: `fixtures/capture-runs/` → expected output golden files
- Idempotency: same input always produces identical output
- Over/under-segmentation regression cases

#### 1.6 Extension — Normalization + Segmentation Integration
- Wire normalization and segmentation into the extension post-capture pipeline
- Side panel shows live activity feed as events are captured
- Emerging steps panel shows steps as they are derived in real time

#### 1.7 `packages/renderers` — Core Renderers v1

**Process Map Renderer:**
- Input: `ProcessRun` + step graph
- Output: deterministic SVG
- Nodes: unique step signatures. Edges: observed transitions with frequency
- Decision nodes visually distinct (branching edges)
- Same input → identical SVG bytes (golden test against `process_graph.svg`)

**SOP Renderer:**
- Input: `ProcessRun` dominant path
- Output: Markdown SOP
- Format: scope, preconditions, numbered steps, evidence count per step
  (`observed in N/M sessions`)
- Same input → identical Markdown bytes (golden test against `sop.md`)

**Evidence Drawer Renderer:**
- Views: raw events | normalized events | derived steps | step-to-evidence
  linkage | export preview
- Trust boundary labels on every section: Observed / Derived / AI-enhanced /
  User-edited

**Session JSON View:**
- Sticky header: "Read-only. Time-stamped. Uninterpreted."
- Left: session metadata, search, type filters
- Right: virtualized event list (Time | Actor | Type | Confidence)
- Expand row: payload + evidence refs
- Raw JSON toggle: monospace, copy + download

#### 1.8 Extension — Review & Export UI
- Review screen after recording stops: step list, process map, SOP, evidence
  drawer
- Export: JSON, SVG process map, Markdown SOP
- Export artifact includes: `renderer_version`, `segmentation_rule_version`,
  `schema_version`
- Visible scope/privacy controls: include/exclude domains, redaction zones
- "Mark important moment" annotation button during recording

**Exit criteria:**
- [ ] `fixtures/capture-runs/demo.ndjson` produces identical output to
      `fixtures/segmentation-golden/demo-expected.*`
- [ ] All schema validators have 100% test coverage
- [ ] Segmentation engine passes all golden file regression tests
- [ ] User can record → review → export in under 60 seconds after stop
- [ ] Every derived step has `boundary_reason` and `evidence_refs`
- [ ] Privacy: password fields never appear in any exported artifact

---

### Phase 2 — Process Definition & Multi-Run Intelligence

**Goal:** Move beyond one-off runs. Multiple recordings of the same workflow
merge into a durable, reusable process definition with variants.

**This phase is done when:** Multiple runs can be merged into a reusable
ProcessDefinition. Users can distinguish standard flow from variants.

#### 2.1 `packages/schema-process` — ProcessDefinition Schema v1
- `ProcessDefinition`, `ProcessVariant`, `ProcessVersion` types
- Lifecycle states: `draft → reviewed → published → deprecated`
- Versioning model: new versions are additive, old versions preserved

#### 2.2 Cross-Run Consolidation
- Graph merge: multiple `ProcessRun` step graphs → canonical definition
- Variant detection: step signature divergence > threshold → new variant
- Canonical step naming from frequency + context
- Variant labeling and frequency statistics

#### 2.3 Process Library UI (Extension + optional early web-app)
- List of saved process definitions
- Per-definition: canonical SOP, process map, variant explorer, run history
- "Compare runs" view: side-by-side step sequences
- Approval/publishing flow: draft → reviewed → published

#### 2.4 Enhanced Metrics
- Average completion time per definition
- Step frequency + timing variance
- Branching frequency and decision density
- Rework and loop indicators
- All metrics are process-level, never individual-level

**Exit criteria:**
- [ ] 3 recordings of the same workflow produce a merged definition
- [ ] Variants detected and labeled correctly
- [ ] Published process definition exports are portable JSON

---

### Phase 3 — Platform Mode & Collaboration

**Goal:** Support shared team use with cloud storage, workspaces, and
governance. Backend introduced here — not before.

#### 3.1 Backend API (`apps/api/` — Fastify + TypeScript)
- Auth: JWT + OAuth2 (Google)
- `POST /v1/runs` — upload completed process run
- `GET /v1/runs/:run_id` — retrieve run
- `GET /v1/definitions` — list process definitions
- `POST /v1/definitions` — create or update definition
- `GET /v1/artifacts/:artifact_id` — retrieve rendered artifact
- Response envelope: `{ data, error, meta }`
- All inputs validated with Zod at API boundary
- Async jobs for derivation (return `job_id`, poll for status)
- Structured logs with trace IDs on every request

#### 3.2 Storage
- Object store (S3-compatible) for immutable run artifacts
- PostgreSQL for metadata, definitions, users, orgs
- Row-level security enforced at database layer
- Raw artifacts never mutated after write
- Soft deletes on all user-facing tables
- All tables: UUID PKs, `created_at`, `updated_at`

#### 3.3 Workspaces & Multi-Tenancy
- `organizations` → `workspaces` → `runs` / `definitions`
- Role-based access: admin / analyst / recorder
- Row-level security: org isolation enforced in DB, not just app layer

#### 3.4 Auth Events Logged
- Login, logout, auth failures, token refresh
- Permission denials, privilege escalations

#### 3.5 Web App (`apps/web-app/` — React + TanStack Query)
- Workspace process library
- Shared process map and SOP views
- User management and API key management
- Review and approval workflows
- Artifact storage and retrieval

**Exit criteria:**
- [ ] Teams can save, organize, and govern process assets
- [ ] Row-level security passes isolation tests
- [ ] Extension can upload to backend with API key auth

---

### Phase 4 — Process Portfolio Management & Analytics

**Goal:** Manage many runs and processes as a portfolio. Process intelligence
at scale.

#### 4.1 Process Portfolio Layer
- Process family model: group related definitions
- Clustering/similarity: suggest merges across similar definitions
- Process versioning and diff views
- Portfolio-level metrics: active process families, volatility, documentation
  coverage, automation readiness indicators

#### 4.2 Analytics Dashboard
- Overview: avg cycle time, decision density, rework rate
- Step-level breakdown: sortable, variance per step
- Variant explorer: path frequencies
- Trend view: metrics over time as more runs are ingested
- No individual user names or IDs surfaced — process framing only

#### 4.3 Comparison Views
- Side-by-side run comparison
- Cross-team process variant comparison
- Role-specific views of the same process definition

**Exit criteria:**
- [ ] Users can manage and understand a growing set of process assets
- [ ] Portfolio clustering correctly groups related definitions
- [ ] Analytics show no individual-level data

---

### Phase 5 — AI-Fluid Workflow Layer

**Goal:** Enable grounded AI consumption and augmentation. AI assists but
never invents structure or obscures provenance.

#### 5.1 AI Assist Layer (Claude API — `claude-sonnet-4-6`)

**Suitable uses:**
- Candidate step name improvements
- SOP readability / tone normalization
- Concise summaries of evidence-backed outputs
- Anomaly explanation suggestions
- Process comparison narratives

**Unsuitable uses (hard rules):**
- Inventing missing steps
- Silently collapsing ambiguous actions
- Generating authoritative maps without evidence support
- Rewriting observed behavior into ideal-state SOPs without disclosure

**Implementation:**
- `ExplainService`: question + process context → answer with citations
- Every AI response: `{ answer, citations: [{ run_id, event_ids }], evidence_confidence }`
- `evidence_confidence: "insufficient"` returned explicitly when ledger
  doesn't support the question
- AI layer disabled by default per workspace; enable is opt-in
- Rate limiting and cost controls per org

#### 5.2 AI Chat UI
- Chat panel on Review, Process Map, and Dashboard pages
- Citations are clickable — navigate to source event
- "Insufficient evidence" responses displayed clearly, never hidden
- Trust boundary label: **AI-enhanced** on every AI-generated section

#### 5.3 Machine-Consumable Process APIs
- Structured process definition export for AI agent consumption
- Agent-safe step definitions with evidence references
- Prompt/spec generation from process artifacts
- Human-in-the-loop governance for AI-proposed modifications

#### 5.4 Platform Integrations
- Webhooks: `run.uploaded`, `derivation.complete`, `definition.published`
- SOP export: Markdown, PDF, structured JSON
- OpenAPI spec for all external endpoints

**Exit criteria:**
- [ ] AI answers always cite source run IDs and event IDs
- [ ] AI explicitly returns insufficient evidence when unsupported
- [ ] System is fully functional with AI layer disabled
- [ ] Webhook fires correctly on `derivation.complete`

---

## Priority Sequencing (Constrained Resources)

If resources are constrained, build in this order — do not skip ahead:

1. Recorder lifecycle reliability
2. Canonical schema quality
3. Segmentation engine quality + golden tests
4. Review and evidence transparency
5. Export usefulness
6. Multi-run process definition
7. Platform storage and collaboration
8. Analytics and agentic integrations

> The common failure mode in products like this is jumping to analytics or
> AI narrative layers before capture and structure are trustworthy.

---

## Key Technical Risks

| Risk | Mitigation |
|------|-----------|
| Noisy capture → low trust | Small stable taxonomy, deterministic filtering, visible evidence |
| LLM overuse weakens inspectability | Deterministic core, label AI content separately, preserve derivation metadata |
| Extension fragility | Explicit state machine, fixture replay tests, narrow permissions |
| Schema churn breaks portability | Version schemas early, migration utilities, backward-readable exports |
| Privacy concerns block adoption | Local-first MVP, visible controls, redaction by design |
| Roadmap scope creep | Protect MVP non-goals, gate phases on exit criteria |

---

## Companion Docs Needed

These specs should be created as the relevant phase begins:

1. `docs/schemas/canonical-event-schema-v1.md` — full field specs + examples
2. `docs/schemas/process-run-schema-v1.md` — ProcessRun + ProcessStep spec
3. `docs/schemas/process-definition-schema-v1.md` — definition + variant spec
4. `docs/roadmap/segmentation-rules-v1.md` — boundary rules, thresholds,
   explainability metadata, test fixtures
5. `docs/roadmap/rendering-spec-v1.md` — process map + SOP + evidence drawer
6. `docs/roadmap/trust-privacy-contract.md` — user-visible commitments,
   storage model, redaction model, enterprise controls

---

## Immediate Next Steps

1. **Initialize monorepo** — pnpm workspaces, TypeScript strict, Vitest, CI
2. **Build `packages/schema-events` first** — everything depends on it
3. **Build extension shell** — MV3, side panel, recorder state machine
4. **Build `packages/normalization-engine`** — raw → canonical events
5. **Build `packages/segmentation-engine`** — the core product moat; write
   golden tests before implementing
6. **Update `CLAUDE.md`** — fill in current phase, active priorities, and
   commands once repo scaffold is in place
