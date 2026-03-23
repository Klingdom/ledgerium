# Ledgerium AI Technical Architecture and Roadmap

**Status:** Canonical draft 1.0  
**Last updated:** 2026-03-23  
**Owner:** Founder / Principal Architect  
**Audience:** Engineering, product, design, security, implementation partners, technical evaluators, and stakeholders  
**Related docs:** `ledgerium_product_philosophy_and_system_design.md`

---

## 1. Purpose of this document

This document defines the canonical technical architecture and roadmap for Ledgerium AI. It is intended to serve as the GitHub source of truth for how the system should be structured, what must exist in MVP, what should come later, and how engineering decisions should align with the product philosophy.

Ledgerium AI is a **trust-first, deterministic, evidence-linked process intelligence platform**. Its architecture must reflect that identity. The system is not designed as an opaque AI black box. It is designed as an inspectable pipeline that converts captured workflow evidence into structured process knowledge.

This document answers six foundational questions:

1. What are the major technical layers of Ledgerium AI?
2. How does data move from user behavior to process outputs?
3. What capabilities must ship in MVP?
4. What abstractions and interfaces should be stable from the start?
5. What decisions should be deferred until later phases?
6. What roadmap sequence best balances trust, usability, and extensibility?

---

## 2. Executive summary

Ledgerium AI should be built as a layered system with the following core architecture:

1. **Capture layer** — browser extension / side panel recorder that observes user workflow events.
2. **Normalization layer** — converts raw browser and UI events into a clean, versioned event model.
3. **Segmentation layer** — detects sessions, steps, and activities using deterministic rules.
4. **Process intelligence layer** — generates reusable process structures, variants, and metrics.
5. **Output layer** — renders process maps, SOPs, JSON exports, evidence views, and review flows.
6. **Trust and governance layer** — permissions, privacy controls, reviewability, versioning, and auditability.

The architecture should support two deployment modes over time:

- **MVP / local-first mode:** user-controlled recording and export with minimal backend dependency.
- **Platform mode:** cloud-supported storage, process portfolio management, collaboration, and enterprise controls.

The first release should optimize for:

- deterministic capture and transformation
- user-visible evidence and inspectability
- stable schemas
- portable exports
- a trust-building extension experience

The first release should not try to solve every enterprise workflow problem. The goal is to create a reliable substrate that can later support deeper analytics, process governance, and AI-fluid workflows.

---

## 3. Architectural intent

### 3.1 Architecture must embody product philosophy

Ledgerium AI’s technical design must directly support these product-level commitments:

- reality before opinion
- evidence before interpretation
- determinism before generative abstraction
- user visibility into what was captured and why
- privacy and control as architectural constraints

This means the system must favor:

- explicit data contracts
- versioned schemas
- reversible transformations where practical
- explainable grouping logic
- source-linked outputs
- minimal hidden behavior

### 3.2 Architectural style

Ledgerium AI should be built as a **layered, modular system** rather than as a tightly coupled monolith or a pure microservice environment on day one.

The preferred style is:

- **modular monorepo for MVP**
- **clear domain boundaries from the start**
- **internal package separation before service separation**
- **event-driven concepts where useful, without overengineering the first version**

This yields three benefits:

1. faster MVP development
2. easier reasoning and debugging
3. clean upgrade path to service decomposition later

### 3.3 Trust boundary model

From the earliest version, the system should distinguish between:

- what is captured from the browser
- what is derived deterministically
- what is user-edited or user-confirmed
- what is AI-assisted or AI-polished

That distinction should exist both in code and in data.

---

## 4. System context

### 4.1 High-level system boundary

At a high level, Ledgerium AI sits between **observed work** and **durable process knowledge**.

```text
User workflow in browser
        ↓
Browser extension capture
        ↓
Normalized event stream
        ↓
Session / step / activity segmentation
        ↓
Process intelligence derivation
        ↓
Outputs: maps, SOPs, JSON, metrics, review artifacts
```

### 4.2 Primary system actors

The architecture must support the needs of the following actors:

- **Recorder user** — initiates capture, pauses, reviews, exports.
- **Reviewer / manager** — inspects outputs, evidence, and process structure.
- **Engineer / integrator** — consumes schemas, APIs, and exports.
- **Administrator** — manages policy, storage, permissions, and governance.
- **Future AI consumers** — agents, copilots, or automations that need grounded process definitions.

### 4.3 Primary deployment surfaces

The system should eventually span four surfaces:

1. browser side panel extension
2. optional web application / process workspace
3. backend APIs and storage services
4. export artifacts consumed outside the platform

For MVP, the browser extension is the center of gravity.

---

## 5. Core architectural principles

### 5.1 Stable contracts first

The event schema, run schema, process schema, and export contracts should stabilize early.

### 5.2 Deterministic core, optional AI augmentation

Anything essential to process truth should be deterministic or explainable.

### 5.3 Inspectable transformations

Each derivation stage should preserve enough metadata to explain how outputs were formed.

### 5.4 Local-first where practical

Sensitive workflow capture should not require immediate cloud dependency in early versions.

### 5.5 Progressive enrichment

The system should allow simple capture first, richer structure later.

### 5.6 Version everything meaningful

At minimum, version:

- event schemas
- process run schemas
- process definition schemas
- segmentation rules
- rendering logic
- AI-assisted prompt/spec versions where applicable

### 5.7 Extensibility without early bloat

The architecture must leave room for:

- desktop capture
- collaboration
- governance
- analytics
- agentic reuse

But MVP should not ship those prematurely.

---

## 6. Reference architecture

## 6.1 Layer overview

```text
┌─────────────────────────────────────────────────────────────┐
│  Presentation Layer                                         │
│  - Browser side panel UI                                    │
│  - Review views                                              │
│  - Evidence drawer                                           │
│  - Export UI                                                 │
└─────────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Capture & Interaction Layer                                │
│  - Content scripts                                           │
│  - Background/service worker                                 │
│  - Event listeners                                            │
│  - Consent / controls                                         │
└─────────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Normalization Layer                                         │
│  - Raw event intake                                           │
│  - Canonical event mapping                                    │
│  - Redaction / filtering                                      │
│  - Session framing                                            │
└─────────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Derivation Layer                                            │
│  - Step detection                                             │
│  - Activity grouping                                          │
│  - Variant detection                                          │
│  - Process definition generation                              │
└─────────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Output & Persistence Layer                                  │
│  - JSON exports                                               │
│  - SOP renderer                                               │
│  - Process map renderer                                       │
│  - Optional storage / sync                                    │
└─────────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Governance & Platform Layer                                 │
│  - Versioning                                                 │
│  - Permissions                                                │
│  - Audit trails                                               │
│  - Policy configuration                                       │
└─────────────────────────────────────────────────────────────┘
```

## 6.2 MVP packaging model

For MVP, package these concerns as modules within a single codebase:

- `extension-app`
- `capture-core`
- `event-schema`
- `segmentation-engine`
- `process-engine`
- `renderers`
- `shared-types`
- `optional-api-client`

A modular monorepo keeps boundaries clear while avoiding premature distributed-system complexity.

---

## 7. Major components

## 7.1 Browser extension shell

The browser extension is the frontline experience and must feel trustworthy, stable, and lightweight.

### Responsibilities

- render side panel UI
- control recording lifecycle
- surface current capture status
- show live step/event feed
- support pause / resume / stop
- enable review and export
- expose privacy / scope controls

### Subcomponents

- side panel app
- content scripts
- background service worker
- message bus between scripts and UI
- local session store

### Notes

The extension should visibly communicate state at all times:

- not recording
- recording
- paused
- processing
- review ready
- export complete / failed

## 7.2 Capture engine

The capture engine observes browser and UI interactions and emits raw capture events.

### Responsibilities

- subscribe to browser and DOM events
- capture timestamped interaction records
- assign correlation identifiers
- apply ignore/redaction rules
- emit raw events to local queue/store

### MVP event classes

- page/view navigation
- click / tap interaction
- text input start/end summary
- selection / dropdown change
- form submission
- focus / blur change
- basic app context change
- user mark / annotation event
- recorder state events

### Deferred events

- full screen video capture
- pixel/image OCR as primary signal
- deep desktop/native app instrumentation
- systemwide keyboard logging

Ledgerium AI should avoid broad capture that undermines trust.

## 7.3 Event normalization engine

The normalization engine converts raw capture into the canonical event model.

### Responsibilities

- map browser-specific events to a stable schema
- classify interaction type
- clean noisy raw fields
- standardize timestamps and identifiers
- preserve source provenance
- apply redaction and sensitivity policy

### Outputs

- `CanonicalEvent[]`
- run-level metadata
- normalization warnings and counters

Normalization is a critical trust boundary. The system should retain enough metadata to show users what raw event became what normalized event.

## 7.4 Session manager

The session manager defines recording boundaries and lifecycle.

### Responsibilities

- start / pause / resume / stop sessions
- segment sessions by inactivity, tab context, or explicit action
- maintain run metadata
- ensure export completeness

### Session metadata examples

- run id
- recorder version
- schema version
- start/end time
- environment metadata
- capture scope
- policy state
- user annotations

## 7.5 Segmentation engine

The segmentation engine converts normalized events into user-meaningful steps and activities.

### Responsibilities

- identify step boundaries
- group low-level events into atomic user actions
- detect transitions between subtasks
- distinguish repeated loops from distinct steps
- assign step evidence ranges

### Design stance

This engine should be deterministic in MVP and configurable via explicit rules. It is part of the product moat and should not be treated as a generic summarization layer.

## 7.6 Process engine

The process engine derives durable process structures from one or more runs.

### Responsibilities

- convert run-level steps into process definitions
- merge repeated runs into candidate standard flows
- detect process variants
- assign canonical step names
- derive prerequisites, outcomes, and actor/system touches
- calculate process metrics

### Core outputs

- process run
- process definition
- step library / activity library
- evidence-linked metrics
- variant map

## 7.7 Renderers

Renderers transform structured data into human-usable deliverables.

### Required renderers

- session JSON view
- process map renderer
- SOP renderer
- evidence drawer renderer
- export packaging renderer

### Design constraint

Renderers must never fabricate ungrounded structure. They can reorganize or format, but core output content must remain linked to derived data.

## 7.8 Optional backend platform

The backend is not the center of MVP, but the architecture should anticipate it.

### Responsibilities over time

- authenticated storage
- process portfolio management
- team collaboration
- review workflows
- enterprise policy controls
- process search and retrieval
- analytics and benchmarking
- API access for integrations

---

## 8. Canonical data flow

## 8.1 End-to-end flow

```text
1. User starts recording
2. Extension begins capture
3. Raw interaction events are queued
4. Events are normalized into canonical schema
5. Session boundaries are finalized
6. Segmentation engine derives steps and activities
7. Process engine builds run outputs and candidate definitions
8. UI renders evidence-linked review experience
9. User edits / confirms if needed
10. System exports or stores artifacts
```

## 8.2 Processing stages

### Stage A: capture
Input: browser interactions  
Output: raw event records

### Stage B: normalize
Input: raw event records  
Output: canonical events with stable types

### Stage C: segment
Input: canonical events  
Output: steps, activity groups, evidence spans

### Stage D: derive
Input: segmented run  
Output: process run, metrics, candidate process definition

### Stage E: render
Input: structured outputs  
Output: SOP, map, JSON, evidence views

### Stage F: persist / export
Input: reviewed structured outputs  
Output: downloadable or stored artifacts

---

## 9. Canonical data model

This document does not replace the formal schema specification, but it defines the required technical entities.

## 9.1 Core entities

### 9.1.1 RawCaptureEvent
Represents low-level capture from browser instrumentation.

Key fields:

- raw_event_id
- run_id
- timestamp
- source_type
- browser_context
- dom_context_summary
- event_payload
- sensitivity_flags

### 9.1.2 CanonicalEvent
Normalized, versioned event used by downstream engines.

Key fields:

- event_id
- schema_version
- run_id
- event_type
- event_time
- actor_type
- application_context
- page_context
- target_summary
- action_summary
- evidence_ref
- normalization_metadata

### 9.1.3 ProcessRun
Represents a single recorded workflow execution.

Key fields:

- process_run_id
- schema_version
- recorder_version
- segmentation_rule_version
- capture_start_at
- capture_end_at
- run_status
- event_count
- step_count
- activity_count
- warnings
- user_annotations
- review_status

### 9.1.4 ProcessStep
Atomic user-meaningful unit inside a run.

Key fields:

- step_id
- process_run_id
- ordinal
- title
- step_type
- start_event_id
- end_event_id
- duration_ms
- system_touchpoints
- evidence_refs
- derivation_metadata

### 9.1.5 ActivityGroup
Logical grouping of one or more steps.

Key fields:

- activity_id
- process_run_id
- title
- ordinal
- step_ids
- purpose_hint
- evidence_refs

### 9.1.6 ProcessDefinition
Durable reusable abstraction built from one or more runs.

Key fields:

- process_definition_id
- schema_version
- title
- description
- source_run_ids
- canonical_step_ids
- variant_summary
- confidence_profile
- created_from_rule_version
- lifecycle_state

### 9.1.7 EvidenceRef
Stable reference linking outputs back to source spans.

Key fields:

- evidence_id
- run_id
- start_event_id
- end_event_id
- evidence_type
- redaction_state

### 9.1.8 OutputArtifact
Exportable artifact produced from run or definition.

Key fields:

- artifact_id
- artifact_type
- source_entity_type
- source_entity_id
- renderer_version
- generated_at
- file_refs

## 9.2 Required schema attributes across entities

The following attributes should be common where relevant:

- schema version
- created at / updated at
- rule version or renderer version
- provenance metadata
- sensitivity / redaction metadata
- review / confirmation state

## 9.3 Versioning strategy

Version independently:

- capture schema
- canonical event schema
- process run schema
- process definition schema
- rule engine version
- renderer version

That separation is important because a new renderer should not invalidate an older capture file.

---

## 10. Browser extension architecture

## 10.1 Core extension modules

### Side panel application
Primary user interface.

### Content scripts
Injected into allowed pages to observe interactions and extract contextual metadata.

### Background service worker
Manages lifecycle, message passing, alarms, permissions, storage coordination, and export tasks.

### Shared event bus / message contract
Defines communication between side panel, content scripts, and worker.

### Local storage adapter
Stores current session and intermediate artifacts.

## 10.2 Recommended technical shape

Suggested implementation direction:

- TypeScript
- React for side panel UI
- browser extension APIs using Manifest V3 model where applicable
- lightweight local persistence abstraction
- shared schema package validated with runtime types

## 10.3 Extension state model

The recorder should implement an explicit state machine.

```text
idle
  → armed
  → recording
  → paused
  → stopping
  → processing
  → review_ready
  → exported
  → error
```

State changes should be logged as first-class events.

## 10.4 Capture scope controls

The extension should expose user-visible controls for:

- include/exclude domains
- pause capture
- stop capture
- mark important moment
- hide or redact sensitive contexts where possible

Trust is strengthened when scope is visible and controllable.

---

## 11. Event taxonomy and capture strategy

## 11.1 Event taxonomy goals

The taxonomy should be:

- small enough to reason about
- expressive enough to support process derivation
- stable enough to version cleanly

## 11.2 Recommended canonical event categories

### Navigation events
- page_loaded
- route_changed
- tab_activated
- app_context_changed

### Interaction events
- element_clicked
- text_entered_summary
- selection_changed
- checkbox_toggled
- form_submitted
- shortcut_invoked

### State/context events
- view_ready
- async_wait_started
- async_wait_ended
- validation_error_shown
- confirmation_received

### Recorder control events
- recording_started
- recording_paused
- recording_resumed
- recording_stopped
- user_annotation_added

### System derivation events
- step_boundary_detected
- activity_group_created
- variant_detected

System derivation events should be clearly labeled as derived, not captured.

## 11.3 Noise filtering rules

The architecture should support deterministic filtering for:

- duplicate rapid clicks
- DOM noise without user intent
- hover-only events
- high-frequency background mutations
- hidden or non-actionable page updates

Filtering rules should be configurable and versioned.

## 11.4 Sensitivity and redaction

The system should support policies for:

- not storing raw typed values by default
- storing field class/type rather than contents where appropriate
- masking secrets / tokens / passwords
- preventing export of sensitive raw details when policy requires it

---

## 12. Segmentation and derivation architecture

## 12.1 Why segmentation matters

Segmentation is where raw interaction logs become process-relevant structure. It is one of the most important engineering domains in Ledgerium AI because it determines whether users perceive the system as intelligent, trustworthy, and useful.

## 12.2 Segmentation pipeline

```text
Canonical events
  ↓
Noise reduction
  ↓
Micro-action grouping
  ↓
Step boundary detection
  ↓
Activity clustering
  ↓
Run-level structure
```

## 12.3 Deterministic rule families

The engine should support rule families such as:

- time-gap thresholds
- application-context transition rules
- submit/confirm completion patterns
- repeated interaction loop collapse
- explicit user markers
- semantic target changes

## 12.4 Segmentation outputs

For each step or activity, preserve:

- start/end evidence
- contributing events
- derived label
- derivation reason codes
- confidence / ambiguity flags

## 12.5 Explainability requirement

Any generated step should be explainable with machine-readable metadata such as:

- `boundary_reason = form_submitted`
- `boundary_reason = context_changed`
- `grouping_reason = repeated_same_target`

That requirement should be built into engine contracts, not bolted on later.

---

## 13. Process intelligence architecture

## 13.1 Role of the process intelligence layer

This layer turns individual workflow recordings into reusable process assets.

## 13.2 Responsibilities

- consolidate repeated runs
- distinguish canonical flow from run-specific noise
- detect variants and optional branches
- calculate operational measures
- support process portfolio management over time

## 13.3 Key subdomains

### Run interpretation
Interprets one run into a coherent structure.

### Cross-run consolidation
Combines multiple runs into candidate standards and variants.

### Process portfolio management
Groups related runs and definitions into a durable portfolio.

### Metrics derivation
Produces grounded measures such as cycle time, waiting time, step count, rework indicators, and variant frequency.

## 13.4 Portfolio concepts to support later

The architecture should reserve room for:

- process family
- process variant
- process version
- process owner
- approval state
- similarity clusters

This portfolio layer is strategically important and should not be treated as an afterthought.

---

## 14. Rendering architecture

## 14.1 Output types

The system should support these outputs as first-class artifact types:

- session JSON
- process run summary
- process map
- SOP / work instruction document
- evidence bundle
- comparison view between runs

## 14.2 Process map renderer

Responsibilities:

- produce deterministic node-edge representation
- show sequence and decision points where supported
- preserve evidence-linked step references
- avoid decorative complexity in early versions

## 14.3 SOP renderer

Responsibilities:

- transform structured process data into human-readable instruction format
- include prerequisites, step sequence, expected outcomes, and notes
- link sections back to evidence and source steps

## 14.4 Evidence drawer

Responsibilities:

- let users inspect source steps and events
- surface what was captured vs derived
- support trust and correction

## 14.5 Renderer versioning

Renderers must be versioned separately because visual and document formatting will evolve without changing underlying process truth.

---

## 15. Persistence architecture

## 15.1 MVP persistence strategy

MVP should prioritize **local-first persistence with exportability**.

Recommended MVP behavior:

- session artifacts stored locally during recording
- processed outputs generated locally or near-locally
- explicit export to JSON and user-facing artifacts
- optional upload only when user chooses or when platform mode is enabled

## 15.2 Platform persistence strategy

When platform storage is introduced, maintain separation between:

- raw capture artifacts
- normalized event artifacts
- structured process assets
- rendered artifacts
- policy / metadata records

## 15.3 Storage classes

### Ephemeral working storage
For in-progress session state.

### Durable artifact storage
For exported or saved JSON / documents / process maps.

### Metadata store
For searchable indexes, versions, ownership, and relationships.

## 15.4 Deletion and retention

The architecture should support:

- local deletion
- remote deletion requests
- retention policy per workspace
- artifact lineage even when content is redacted or removed

---

## 16. API architecture

APIs may be minimal in MVP, but interface design should start early.

## 16.1 API domains

Recommended future API domains:

- `runs`
- `definitions`
- `artifacts`
- `review`
- `policies`
- `workspaces`
- `search`

## 16.2 API design principles

- resource-oriented
- versioned
- explicit about derived vs captured fields
- support export and ingestion symmetry where practical

## 16.3 Import/export symmetry

A strong long-term design goal is that a user can:

- export a process run JSON
- re-import that JSON later
- derive the same structures under the same rule version

That supports portability and trust.

---

## 17. Security, privacy, and governance architecture

## 17.1 Security posture

Ledgerium AI will handle potentially sensitive workflow data. Security cannot be deferred to a late enterprise phase.

## 17.2 Core controls to design for early

- least-privilege extension permissions
- explicit recording state visibility
- controlled domain access
- secret/value redaction
- signed artifact exports where useful later
- authenticated storage where cloud exists
- encryption in transit and at rest for platform mode

## 17.3 Privacy model

The architecture should support a trust contract that clearly differentiates:

- what may be captured
- what is excluded by default
- what can be user-controlled
- what remains local vs synced

## 17.4 Governance requirements for platform mode

- workspace isolation
- role-based access control
- review and approval flows
- immutable or append-only audit trail for key actions
- version history for process definitions

---

## 18. Observability and quality architecture

## 18.1 Why observability matters

Because Ledgerium AI is a deterministic evidence system, debugging and quality evaluation must focus on transformation correctness, not just uptime.

## 18.2 Observability domains

- recorder lifecycle health
- capture success/failure rates
- normalization warnings
- segmentation ambiguity counts
- renderer failure rates
- export success rates
- policy/redaction hits

## 18.3 Quality metrics to track

- percent of sessions with successful export
- average normalization error count per run
- step boundary correction rate by users
- process naming correction rate
- false merge / false split signals from reviews
- time from stop recording to review ready

## 18.4 Test strategy

The system should include:

- schema validation tests
- capture fixture replay tests
- segmentation regression suites
- renderer snapshot tests
- privacy/redaction tests
- state machine tests for recorder lifecycle

Segmentation replay tests should become a major quality asset over time.

---

## 19. Suggested repository and package structure

A monorepo is the best initial shape.

```text
ledgerium/
  apps/
    extension-app/
    web-app/                      # optional later
  packages/
    shared-types/
    schema-events/
    schema-process/
    capture-core/
    normalization-engine/
    segmentation-engine/
    process-engine/
    renderers/
    ui-components/
    policy-core/
    api-client/
  docs/
    product/
    architecture/
    schemas/
    roadmap/
  fixtures/
    capture-runs/
    segmentation-golden/
  scripts/
  tests/
```

This structure keeps product logic portable and testable.

---

## 20. MVP definition

## 20.1 MVP objective

Deliver a trustworthy browser-based workflow recorder that converts observed activity into inspectable JSON, basic process maps, and SOP-ready outputs.

## 20.2 MVP must-have capabilities

### Recorder and UI
- browser side panel UI
- start / pause / resume / stop recording
- visible recording status
- basic live feed of captured or derived actions

### Capture and processing
- canonical browser event capture
- event normalization
- deterministic session and step segmentation
- evidence-linked run generation

### Outputs
- JSON export
- basic process map output
- basic SOP output
- evidence drawer / step inspection view

### Governance and trust
- local-first storage for MVP
- visible scope / privacy controls
- schema and rule version metadata in exports

## 20.3 MVP non-goals

- full enterprise admin suite
- native desktop capture
- complex collaboration workflows
- advanced cross-process analytics
- fully autonomous process mining across enterprise systems
- open-ended agent orchestration
- deep BPMN completeness on day one

## 20.4 MVP success criteria

MVP is successful if a user can:

1. record a real browser workflow
2. review what was captured
3. see how the system formed steps
4. export structured process artifacts
5. trust that the result is grounded and inspectable

---

## 21. Roadmap

## 21.1 Roadmap philosophy

The roadmap should follow a sequence of:

- trust first
- deterministic foundation second
- durable process assets third
- collaboration and platform controls fourth
- advanced intelligence and agentic integrations last

## 21.2 Phase 0 — Technical foundation and proof of capture

### Goals
- validate extension architecture
- validate capture event model
- prove local session lifecycle
- prove side panel UX basics

### Deliverables
- extension shell
- recorder state machine
- initial event taxonomy
- raw capture logging
- local artifact export for debugging

### Exit criteria
- reliable recording lifecycle across target browser flows
- stable internal message passing
- basic debug replay possible

## 21.3 Phase 1 — Deterministic MVP

### Goals
- ship trustworthy recorder and structured exports
- establish canonical schemas
- produce first usable process outputs

### Deliverables
- normalized event schema v1
- segmentation engine v1
- process run schema v1
- JSON export v1
- process map renderer v1
- SOP renderer v1
- evidence drawer v1

### Exit criteria
- end-to-end capture to export works reliably
- users can inspect steps and evidence
- outputs are good enough to replace manual first-draft documentation for many browser workflows

## 21.4 Phase 2 — Process definition and multi-run intelligence

### Goals
- move beyond one-off run outputs
- create durable process definitions and variants

### Deliverables
- process definition schema v1
- cross-run consolidation logic
- variant detection rules
- process versioning model
- process library UI

### Exit criteria
- multiple runs can be merged into a reusable process definition
- users can distinguish standard flow vs observed variants

## 21.5 Phase 3 — Platform mode and collaboration

### Goals
- support shared team use
- add cloud storage and governance

### Deliverables
- authenticated backend
- workspaces
- shared process library
- role-based review flows
- artifact storage and retrieval
- comments / approvals / review states

### Exit criteria
- teams can save, organize, and govern process assets collaboratively

## 21.6 Phase 4 — Process portfolio management and analytics

### Goals
- manage many runs and processes as a portfolio
- support process intelligence at higher scale

### Deliverables
- process family model
- clustering and similarity logic
- metrics dashboards
- bottleneck / rework indicators
- comparison views across variants and teams

### Exit criteria
- users can manage and understand a growing set of process assets, not just isolated recordings

## 21.7 Phase 5 — AI-fluid workflow layer

### Goals
- enable grounded AI consumption and augmentation
- support future automation and agentic workflows

### Deliverables
- machine-consumable process APIs
- agent-safe process definitions
- structured prompts/spec generation from process artifacts
- controlled AI assistance for naming, summarization, and guidance
- human-in-the-loop governance for AI-proposed modifications

### Exit criteria
- Ledgerium AI becomes a trusted substrate for AI-assisted execution rather than just documentation

---

## 22. Priority sequencing recommendations

If resources are constrained, prioritize in this order:

1. recorder lifecycle reliability
2. canonical schema quality
3. segmentation engine quality
4. review and evidence transparency
5. export usefulness
6. multi-run process definition
7. platform storage and collaboration
8. analytics and agentic integrations

The common failure mode in products like this is jumping too quickly to analytics or AI narrative layers before capture and structure are trustworthy.

---

## 23. Key technical risks and mitigations

## 23.1 Risk: noisy capture produces low trust

Mitigation:

- small stable event taxonomy
- deterministic filtering
- visible evidence and correction tools

## 23.2 Risk: overreliance on LLMs weakens inspectability

Mitigation:

- keep core structure deterministic
- label AI-assisted content separately
- preserve source-linked derivation metadata

## 23.3 Risk: browser extension fragility

Mitigation:

- explicit state machine
- fixture-based replay tests
- narrow permissions
- modular capture adapters

## 23.4 Risk: schema churn breaks portability

Mitigation:

- version schemas early
- use migration utilities
- keep exports backward-readable where practical

## 23.5 Risk: privacy concerns block adoption

Mitigation:

- local-first MVP
- visible controls
- redaction by design
- explicit trust contract in product and docs

## 23.6 Risk: roadmap expands too broadly

Mitigation:

- protect MVP non-goals
- gate phases on exit criteria
- keep portfolio and platform layers sequenced after core proof

---

## 24. Open decisions to resolve in follow-on technical docs

The following decisions should be finalized in dedicated implementation specs:

- exact canonical event schema v1
- exact step boundary rules and thresholds
- process definition merge logic across runs
- specific local storage technology choices
- backend stack choice for platform mode
- diagram representation standard for process maps
- SOP document template structure
- review workflow state model
- import/export compatibility guarantees

These are implementation-critical, but they should follow this architecture document rather than precede it.

---

## 25. Recommended next canonical docs

This document should be followed by the creation of these more detailed technical specifications:

1. **Recorder Specification**
   - extension lifecycle
   - capture permissions
   - event sources
   - UI states

2. **Canonical Event Schema Spec**
   - event taxonomy
   - required fields
   - sensitivity handling
   - examples

3. **Segmentation Rules Spec**
   - step boundary rules
   - grouping logic
   - explainability metadata
   - test fixtures

4. **ProcessRun + ProcessDefinition Schema Spec**
   - entity contracts
   - versioning
   - examples

5. **Rendering Spec**
   - process map rendering
   - SOP rendering
   - evidence drawer behavior

6. **Trust and Privacy Contract**
   - user-visible commitments
   - storage model
   - redaction model
   - enterprise controls

---

## 26. Final design stance

Ledgerium AI should not be built as a generic AI wrapper around browser recordings. It should be built as a disciplined process intelligence system whose technical architecture makes trust, portability, and evidence linkage inevitable.

The canonical engineering posture is:

- capture carefully
- normalize explicitly
- derive deterministically
- render transparently
- version rigorously
- expand deliberately

If the architecture remains aligned to those principles, Ledgerium AI can evolve from a trusted recorder into a durable process intelligence platform for human and AI-fluid workflows.
