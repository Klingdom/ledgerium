# Ledgerium AI Process Intelligence Layer Specification

**Status:** Canonical draft 1.0  
**Last updated:** 2026-03-23  
**Owner:** Founder / Principal Architect  
**Audience:** Engineering, product, design, analytics, implementation partners, security, GTM stakeholders, and executive reviewers  
**Related docs:** `ledgerium_product_philosophy_and_system_design.md`, `ledgerium_technical_architecture_and_roadmap.md`, `ledgerium_core_data_model.md`, `ledgerium_sidebar_recorder_browser_extension_specification.md`, `ledgerium_deterministic_process_engine.md`, `ledgerium_json_output_rendering_system.md`

---

## 1. Purpose of this document

This document defines the canonical specification for the **Ledgerium AI Process Intelligence Layer**. It is the source of truth for how Ledgerium AI should convert individual recorded workflow runs into reusable, governable, portfolio-level process knowledge.

The recorder captures evidence. The core data model preserves truth layers. The deterministic process engine turns evidence into structured runs, steps, activities, maps, SOPs, and metrics. The Process Intelligence Layer sits above those components and answers the next strategic question:

**How should the system understand, compare, govern, organize, improve, and reuse processes across many runs, users, teams, and contexts?**

That is the role of this layer.

Without a strong Process Intelligence Layer, Ledgerium AI can generate isolated outputs from isolated recordings. With a strong Process Intelligence Layer, Ledgerium AI becomes a durable system for:

- identifying when multiple runs represent the same underlying process
- distinguishing standard paths from variants and exceptions
- managing process definitions as living assets rather than static deliverables
- surfacing process metrics and intelligence grounded in observed execution
- enabling portfolio-level visibility, reuse, governance, and AI readiness

This document is intentionally thorough because this layer is one of the most important long-term differentiators of the platform.

---

## 2. Executive summary

The Ledgerium AI Process Intelligence Layer should be built as a **deterministic, evidence-linked, versioned portfolio-management layer for process knowledge**.

At a high level, this layer must:

1. ingest analyzed `ProcessRun` outputs from the deterministic engine
2. decide whether a run belongs to an existing process or represents a new one
3. cluster similar runs into a reusable `ProcessDefinition`
4. identify standard paths, variants, branches, loops, and exceptions
5. compute process metrics across runs without losing provenance
6. manage lifecycle states such as draft, candidate, approved, deprecated, and superseded
7. support human review and controlled promotion of process knowledge
8. expose portfolio-level views across teams, domains, and systems
9. preserve trust by keeping evidence, derivation, and human edits separable
10. create a stable substrate for future automation, AI agents, and continuous process improvement

In product terms, this layer enables Ledgerium AI to evolve from:

- **"I recorded a workflow"**

into:

- **"I now have a trusted process asset, with variants, metrics, owners, evidence, and governance."**

---

## 3. Why this layer matters

### 3.1 The strategic problem it solves

Most workflow-capture or documentation tools stop too early. They produce:

- a one-time map
- a one-time SOP
- a one-time export
- a one-time summary

That is useful, but not transformative.

Organizations do not merely need a pile of process artifacts. They need a system that can answer questions like:

- How many times has this process been observed?
- Which teams execute the same process differently?
- What is the most common path?
- What changes over time?
- Which steps are optional versus required?
- Where do delays occur?
- Which artifacts are always touched?
- Which paths represent exceptions or failure handling?
- Which process definition should be treated as canonical?
- What should an AI system do when it encounters a specific task pattern?

The Process Intelligence Layer exists to answer those questions in a trustworthy way.

### 3.2 Why this is central to Ledgerium AI

Ledgerium AI is not trying to win by being the prettiest recorder or the most magical summarizer. It is trying to win by becoming the **trusted system of record for evidence-based process intelligence**.

That requires a layer that treats processes as managed assets with:

- identity
- versioning
- governance
- metrics
- lineage
- reuse
- comparison
- ownership
- confidence

### 3.3 The product-level promise

This layer must uphold a simple but powerful product promise:

> Ledgerium AI does not just document work. It builds trusted process knowledge from repeated observed reality.

---

## 4. Process intelligence thesis

### 4.1 Definition

For Ledgerium AI, **process intelligence** means:

> the structured, evidence-linked understanding of how a process is actually executed across runs, including its standard path, variants, exceptions, metrics, dependencies, lineage, and governance state.

### 4.2 What makes Ledgerium’s approach different

Ledgerium’s process intelligence must differ from both legacy process mining and vague AI summarization.

It should be:

- **evidence-linked** rather than purely inferred
- **deterministic-first** rather than prompt-first
- **portfolio-oriented** rather than artifact-oriented
- **human-reviewable** rather than opaque
- **versioned** rather than ephemeral
- **trust-first** rather than surveillance-first
- **portable** rather than locked to one output surface

### 4.3 Unit of intelligence

The core unit of intelligence is not a screenshot, clickstream, or SOP page.

The core unit is the **ProcessDefinition**, enriched over time by many observed `ProcessRun` instances and related governance objects.

That definition becomes progressively stronger as the system accumulates:

- additional run evidence
- higher confidence in stable steps
- better understanding of variants
- better metrics
- explicit human validation
- stronger metadata and ownership

---

## 5. Scope

This document covers:

- process identity and portfolio concepts
- how runs are grouped into process definitions
- deduplication and similarity logic
- standard path versus variant logic
- portfolio organization
- process lifecycle and governance
- process metrics and intelligence outputs
- review and promotion workflows
- trust, provenance, and explainability requirements
- APIs, data contracts, and implementation guidance
- MVP scope and phased roadmap

This document does **not** redefine:

- recorder behavior in detail
- raw event schema in detail
- step derivation rules in detail
- rendering rules in detail

Those are defined in companion documents.

---

## 6. Core design principles

The Process Intelligence Layer must follow the following non-negotiable principles.

### 6.1 Evidence before abstraction

A process definition cannot exist without grounding in one or more real analyzed runs.

### 6.2 Deterministic-first clustering

The initial grouping of runs into shared process structures should be rule-driven and explainable. Statistical or model-assisted methods may assist later, but they cannot become the uninspectable source of truth.

### 6.3 Stable process identity

Once a process definition is established, it must have durable identity independent of any one rendering.

### 6.4 Variants are first-class

Differences in execution are not noise to hide. They are important operational truth.

### 6.5 Promotion requires confidence

Observed behavior should not instantly become an approved organizational standard. The system must distinguish between:

- observed reality
- candidate process structure
- approved standard practice

### 6.6 Governance must be explicit

Ownership, status, approval, lineage, and supersession cannot live only in human memory.

### 6.7 Metrics must remain attributable

Every aggregate metric should be traceable to the run population, filters, and derivation version used to compute it.

### 6.8 Portfolio organization matters

Processes must be manageable in collections by domain, function, team, application, and business capability.

### 6.9 Human edits must never erase evidence

Human curation should enrich process knowledge, not overwrite the record of what was actually observed.

### 6.10 AI may assist, but not silently redefine reality

LLMs may later help with naming suggestions, summarization, semantic grouping proposals, and search. They cannot silently rewrite canonical process identity or approved structure.

---

## 7. Conceptual model at a glance

```text
CaptureSession
    ↓
RawEvent / NormalizedEvent
    ↓
ProcessRun
    ↓
Derived Steps / Activities / Outputs
    ↓
Run Similarity + Deduplication + Grouping
    ↓
ProcessDefinition
    ├── Standard Path
    ├── Variants
    ├── Exception Patterns
    ├── Metrics
    ├── Governance State
    ├── Owners / Tags / Domains
    └── Lineage / Version History
    ↓
Process Portfolio
    ├── Collections
    ├── Search / Discovery
    ├── Comparison
    ├── Health / Drift
    └── AI-ready process substrate
```

---

## 8. Canonical responsibilities of the Process Intelligence Layer

This layer is responsible for seven major responsibilities.

### 8.1 Process identity management

Determine when a set of observed runs should be treated as the same underlying process.

### 8.2 Variant intelligence

Determine which execution paths are common, optional, exceptional, or environment-specific.

### 8.3 Portfolio organization

Provide stable ways to organize process assets into usable libraries and collections.

### 8.4 Governance and lifecycle management

Manage ownership, review, status, approval, and versioning.

### 8.5 Process metrics and analytics

Compute trustworthy metrics across runs and definitions.

### 8.6 Drift and change detection

Identify meaningful changes in how work is performed over time.

### 8.7 Reuse and activation

Provide the substrate needed for outputs, playbooks, copilots, agents, and downstream workflow intelligence.

---

## 9. Canonical objects managed by this layer

The Process Intelligence Layer relies on several top-level objects. Exact field definitions should align with the Core Data Model.

### 9.1 ProcessRun

A single analyzed execution instance produced by the deterministic engine.

Important characteristics:

- derived from one bounded capture session or imported evidence package
- contains steps, activities, artifacts, timing, and provenance
- may be reviewed or corrected
- may or may not contribute to a shared process definition

### 9.2 ProcessDefinition

A reusable process asset representing a cluster of related observed runs that appear to implement the same underlying business process.

Important characteristics:

- durable identity
- canonical title and aliases
- standard path representation
- variant registry
- metrics profile
- governance state
- ownership and metadata
- lineage across versions

### 9.3 ProcessVariant

A named or system-generated path pattern that differs materially from the standard path but still belongs to the same process family.

Examples:

- happy path with approved request
- path with manager escalation
- path when validation fails
- path for a specific system environment or business unit

### 9.4 ExceptionPattern

A repeated but non-standard deviation, failure path, rework loop, or abnormal branch.

### 9.5 ProcessCollection

A portfolio construct used to organize process assets.

Examples:

- Recruiting / Candidate lifecycle
- Accounts Payable / Invoice handling
- HR / Employee onboarding
- Salesforce / Case handling
- Procurement / Vendor creation

### 9.6 ProcessDefinitionVersion

An immutable versioned snapshot of a process definition at a point in time.

### 9.7 PromotionReview

A human review object used to approve, reject, merge, split, deprecate, or supersede process assets.

### 9.8 DriftSignal

A derived object indicating meaningful change in observed execution against a baseline process definition.

### 9.9 ProcessMetricSnapshot

A versioned computed metric package tied to a process definition, population, and derivation rules.

---

## 10. Process identity: how the system decides “same process”

This is one of the most important design problems in the entire platform.

### 10.1 The core question

When a new run arrives, the system must decide among four possibilities:

1. this run belongs to an existing process definition
2. this run belongs to an existing process definition but as a new variant
3. this run is ambiguous and requires human review
4. this run represents a new process definition candidate

### 10.2 Identity must be multi-factor

Process identity must never be based on a single string or a freeform title alone.

The system should use a weighted, explainable similarity model based on deterministic features such as:

- dominant application/system sequence
- stable step sequence overlap
- stable activity overlap
- artifact types handled
- page or route family similarity
- trigger condition similarity
- output artifact similarity
- branch structure similarity
- task verb/object patterns
- team/domain context
- known collection membership

### 10.3 Canonical identity signals

The MVP should prioritize these signals:

1. **Step skeleton similarity** — ordered overlap of normalized step types and labels.
2. **Activity skeleton similarity** — overlap of higher-order grouped activities.
3. **System footprint similarity** — overlap of applications, domains, products, or route families touched.
4. **Artifact similarity** — overlap of business object types manipulated.
5. **Entry/exit signature similarity** — similarity of trigger and completion conditions.
6. **Critical-step presence** — shared required checkpoints such as submit, validate, approve, finalize.

### 10.4 Identity score

The system should compute a deterministic `process_identity_score` for each candidate match.

Illustrative scoring buckets:

- **0.90–1.00** — highly likely same process
- **0.75–0.89** — likely same process, variant possible
- **0.55–0.74** — ambiguous, review candidate
- **below 0.55** — likely different process

These thresholds are starting points and should remain configurable by rule version.

### 10.5 Explainability requirement

Every match or grouping decision must store a machine-readable explanation of why it was made.

Example explanation fields:

- top matching process definition id
- identity score
- feature contributions
- overlapping steps
- conflicting steps
- matching systems
- unmatched artifacts
- rule version used

### 10.6 Human override

A reviewer must be able to:

- force-attach a run to an existing process definition
- split a run into a different process family
- merge two process definitions
- create a new definition despite a high similarity score

All overrides must be preserved as lineage events.

---

## 11. Deduplication and run grouping

### 11.1 Why deduplication matters

Repeated or near-identical runs should strengthen a process definition rather than clutter the library with duplicates.

### 11.2 Types of duplication

The system should distinguish among:

- **exact duplicate evidence** — same capture imported twice
- **near duplicate execution** — essentially the same run repeated with trivial timing or UI differences
- **same process, different instance** — distinct real execution of the same process
- **same process, different variant** — meaningful alternate path

### 11.3 Deduplication rules

The MVP should support deterministic deduplication based on:

- shared session fingerprints
- identical event hashes
- identical step skeletons plus close timing window
- imported file checksum match
- same user, same trigger, same entry/exit, same artifact ids, and same structural path within a short time window

### 11.4 Storage behavior

Even when a duplicate is detected, the system should preserve a record of the attempted ingestion. It may mark a run as:

- canonical
- duplicate_of
- suppressed_from_metrics
- merged_into_population

### 11.5 Grouping cadence

Grouping may occur:

- at ingest time for high-confidence matches
- in batch jobs for portfolio maintenance
- during human review when ambiguous runs are resolved

---

## 12. Standard path, variants, and exceptions

### 12.1 Standard path definition

A `standard_path` is the most representative, reusable execution structure within a process definition, based on observed runs and governance state.

This must not be a fantasy “ideal process.” It must remain grounded in actual repeated behavior.

### 12.2 Criteria for standard path selection

The standard path should be chosen using a deterministic combination of:

- frequency of occurrence
- completion success
- lower rework burden
- governance preference if explicitly approved
- lower exception density
- recency weighting when appropriate

### 12.3 Variant definition

A variant is a meaningful execution pattern that:

- belongs to the same process definition
- diverges from the standard path beyond configured thresholds
- appears enough times or is important enough to merit separate tracking

### 12.4 Variant classification types

Suggested types:

- happy-path alternative
- role-based variant
- system/environment variant
- exception-handling variant
- approval-chain variant
- rework-heavy variant
- incomplete/abandoned variant

### 12.5 Exception patterns

Exceptions should be captured when the system observes repeated patterns such as:

- repeated retries
- bounce-backs between systems
- missing-data remediation
- escalations
- validation failures
- manual workaround loops
- abandonment at a specific step

### 12.6 Optionality logic

The system should distinguish between:

- required steps
- common optional steps
- rare optional steps
- mutually exclusive branches
- true exceptions

### 12.7 Canonical path representation

Each process definition should maintain:

- standard path graph
- variant graphs
- exception registry
- path frequencies
- branch conditions when deterministically inferable

---

## 13. Process portfolio model

### 13.1 Why portfolio matters

A mature Ledgerium deployment may contain dozens, hundreds, or eventually thousands of process assets. The system must treat them as a manageable portfolio rather than a flat list.

### 13.2 Portfolio dimensions

Processes should be organizable along dimensions such as:

- business capability
- function
- department
- team
- geography
- product line
- application ecosystem
- customer segment
- compliance domain
- maturity state

### 13.3 Collections and taxonomies

The system should support:

- explicit collections curated by humans
- rule-derived collections based on metadata
- tags and controlled vocabulary
- nested categories where useful

### 13.4 Canonical examples

Examples of portfolio groupings:

- Order-to-cash
- Hire-to-retire
- Procure-to-pay
- Case management
- Benefits administration
- Finance close
- Customer support workflows

### 13.5 Discovery requirements

The Process Intelligence Layer must support portfolio discovery through:

- search by title, alias, owner, tag, application, artifact, and step content
- browsing by collection and domain
- ranking by frequency, recency, completeness, confidence, or governance state
- related-process suggestions based on shared structure

---

## 14. Lifecycle and governance

### 14.1 Why governance is required

Observed process reality and approved process guidance are not always the same thing. The system must preserve both.

### 14.2 Lifecycle states

Recommended MVP lifecycle states for `ProcessDefinition`:

- `candidate` — derived from one or more runs but not yet reviewed
- `in_review` — under human evaluation
- `approved` — accepted as a managed process asset
- `monitored` — approved and actively compared against incoming runs
- `deprecated` — retained but not recommended for future use
- `superseded` — replaced by a later approved definition
- `archived` — preserved historically, removed from active portfolio views

### 14.3 Approval model

Approval may require configurable criteria such as:

- minimum run count
- minimum confidence threshold
- owner assignment
- human reviewer sign-off
- required metadata completion
- no unresolved merge/split ambiguity

### 14.4 Ownership model

Each approved process should have explicit owners such as:

- business owner
- operational owner
- technical steward
- documentation steward

### 14.5 Governance actions

The layer must support these governance actions:

- approve definition
- reject candidate
- merge definitions
- split definition
- rename definition
- add aliases
- approve variant
- suppress variant
- deprecate definition
- supersede definition
- rebaseline standard path

### 14.6 Auditability

Every governance action must create an immutable lineage event with:

- actor
- action type
- prior state
- new state
- reason
- timestamp
- affected object ids

---

## 15. Process metrics and intelligence outputs

### 15.1 Thesis

Metrics are useful only if they remain attributable to real run populations and rule versions.

### 15.2 Core metric families

The Process Intelligence Layer should compute at least the following metric families.

#### 15.2.1 Volume and adoption

- number of observed runs
- unique users
- unique teams
- unique systems touched
- run frequency over time

#### 15.2.2 Timing

- median run duration
- p90 run duration
- median step duration
- wait-time estimates where inferable
- elapsed time by variant

#### 15.2.3 Stability and variability

- standard path frequency
- variant count
- step optionality ratios
- exception rate
- drift rate over time

#### 15.2.4 Quality and completion

- completion rate
- abandonment rate
- retry frequency
- rework loop frequency
- validation-failure frequency

#### 15.2.5 Operational complexity

- median step count
- median activity count
- systems-per-run
- handoff estimates
- artifact touch count

#### 15.2.6 Governance and maturity

- confidence score
- approval status
- review freshness
- stale-definition age
- evidence coverage depth

### 15.3 Metric snapshots

Metrics should be saved as versioned snapshots rather than recomputed invisibly without trace.

Each metric snapshot must preserve:

- population definition
- included run ids or query filter
- date range
- derivation version
- outlier policy
- duplicate suppression policy

### 15.4 Benchmarks

Later versions may support comparisons such as:

- team A versus team B
- current quarter versus prior quarter
- standard path versus exception path
- before/after process change rollout

---

## 16. Drift and change detection

### 16.1 Why drift matters

Processes do not stay still. Drift is one of the most valuable signals a process intelligence platform can surface.

### 16.2 Drift types

The system should detect:

- structural drift — steps added, removed, reordered
- system drift — new tools or routes introduced
- timing drift — materially slower or faster execution
- exception drift — rising failure/rework patterns
- governance drift — observed behavior diverges from approved standard

### 16.3 Drift thresholds

MVP should use deterministic thresholds such as:

- critical step missing above X% of recent runs
- new step appears in Y% of recent runs
- median duration changes by Z%
- exception branch frequency doubles over trailing baseline

Thresholds should be configurable by rule version.

### 16.4 Drift outputs

Drift should generate:

- drift signals attached to process definitions
- portfolio alerts
- review recommendations
- rebaseline suggestions when sustained drift indicates the process has truly changed

---

## 17. Confidence model

### 17.1 Why confidence is needed

Not all process definitions are equally strong. The system should communicate how much evidence and stability support a given definition.

### 17.2 Confidence inputs

Illustrative confidence drivers:

- number of qualifying runs
- recency and spread of observations
- step stability across runs
- low ambiguity in grouping
- reviewer approval
- low duplicate contamination
- low unresolved exception ambiguity

### 17.3 Confidence outputs

Potential output fields:

- `confidence_score` from 0 to 1
- `confidence_band` such as low, medium, high
- `confidence_explanation`

### 17.4 Confidence boundaries

Confidence must not be presented as an oracle. It is a signal for review priority and decision support.

---

## 18. Human-in-the-loop review model

### 18.1 Why review remains essential

Ledgerium AI should help teams understand reality quickly, but should not assume that observed frequency automatically equals approved best practice.

### 18.2 Review queue

The layer should provide a review queue for items such as:

- ambiguous run-to-process matches
- candidate new definitions
- merge suggestions
- split suggestions
- high-drift definitions
- low-confidence definitions with high usage
- newly emerging variants

### 18.3 Review tasks

A reviewer should be able to:

- confirm or reject grouping
- rename process and variants
- mark steps as required or optional in the approved standard
- annotate known business rules
- add explanatory notes
- approve, deprecate, or supersede definitions

### 18.4 Review boundaries

Human review should enrich the approved knowledge layer while preserving observed-run truth separately.

---

## 19. Trust, provenance, and explainability requirements

### 19.1 Trust model

Every process asset in the portfolio must answer these questions:

- what evidence supports this definition?
- how many runs contributed?
- when was it last updated?
- what variants exist?
- who approved it?
- what changed across versions?
- what rules produced this output?

### 19.2 Provenance links

Each process definition must be able to link back to:

- supporting runs
- representative runs
- representative steps and activities
- rule versions used for grouping and derivation
- review events

### 19.3 Explainability surfaces

The system should expose explanations for:

- run-to-definition match decisions
- variant creation decisions
- standard path selection
- confidence score composition
- drift alerts

### 19.4 No silent flattening

The system must never silently hide variants or exceptions merely to make a cleaner picture.

---

## 20. MVP scope

The MVP Process Intelligence Layer should be intentionally narrow but strong.

### 20.1 MVP must include

1. `ProcessRun` ingestion from the deterministic engine
2. candidate `ProcessDefinition` creation
3. deterministic run similarity scoring
4. run-to-definition matching for high-confidence cases
5. ambiguous-case review queue
6. basic standard path selection
7. basic variant detection
8. process collections and tags
9. lifecycle states: candidate, in_review, approved, deprecated
10. run-count and timing metrics
11. lineage events for merge, split, rename, approve, and supersede
12. JSON export of process definition and variants

### 20.2 MVP should not attempt

- full enterprise process mining parity
- opaque ML-only clustering
- universal cross-application semantic process mapping
- autonomous policy governance
- always-on background worker orchestration
- heavy BI dashboarding before core trust flows are strong

### 20.3 MVP success criteria

The MVP succeeds if a user can:

- record several runs
- see them grouped into process candidates
- review and approve a canonical process definition
- inspect variants and basic metrics
- export a portable JSON representation
- trust why the system grouped what it grouped

---

## 21. Post-MVP roadmap

### Phase 2: stronger portfolio intelligence

- richer variant taxonomy
- collection health views
- related-process recommendations
- improved drift monitoring
- cross-team comparisons
- process maturity scoring

### Phase 3: governed process optimization

- before/after change analysis
- process KPI baselines
- policy rule overlays
- richer exception analytics
- process conformance checks against approved standard

### Phase 4: AI-fluid workflow substrate

- retrieval-friendly process memory
- process-aware copilots
- agent-safe execution guidance
- task-level machine-readable playbooks
- simulation and recommendation layers

---

## 22. Suggested data model additions and canonical fields

This section provides a practical schema-oriented view. The exact implementation may evolve, but these fields should be considered canonical guidance.

### 22.1 `ProcessDefinition`

Suggested fields:

- `process_definition_id`
- `tenant_id`
- `title`
- `aliases[]`
- `description`
- `status`
- `collection_ids[]`
- `tags[]`
- `owners[]`
- `domain_context`
- `standard_path_ref`
- `variant_ids[]`
- `supporting_run_ids[]`
- `representative_run_ids[]`
- `confidence_score`
- `identity_rule_version`
- `standard_path_rule_version`
- `created_at`
- `updated_at`
- `approved_at`
- `superseded_by_id`
- `prior_version_id`

### 22.2 `ProcessVariant`

Suggested fields:

- `variant_id`
- `process_definition_id`
- `title`
- `variant_type`
- `path_signature`
- `supporting_run_ids[]`
- `frequency`
- `exception_flag`
- `approval_state`
- `created_at`

### 22.3 `ProcessCollection`

Suggested fields:

- `collection_id`
- `title`
- `description`
- `parent_collection_id`
- `tags[]`
- `process_definition_ids[]`
- `owner_ids[]`

### 22.4 `PromotionReview`

Suggested fields:

- `review_id`
- `target_object_type`
- `target_object_id`
- `review_type`
- `status`
- `requested_by`
- `reviewed_by`
- `decision`
- `decision_reason`
- `created_at`
- `resolved_at`

### 22.5 `DriftSignal`

Suggested fields:

- `drift_signal_id`
- `process_definition_id`
- `drift_type`
- `baseline_window`
- `comparison_window`
- `severity`
- `evidence_summary`
- `created_at`
- `resolved_at`

---

## 23. Canonical APIs and service boundaries

This section describes logical API responsibilities, not final transport design.

### 23.1 Ingestion interface

Responsibilities:

- accept completed `ProcessRun` packages
- compute candidate process matches
- persist grouping decisions and review tasks

### 23.2 Portfolio query interface

Responsibilities:

- search process definitions
- fetch variants and metrics
- filter by collections, tags, owners, systems, and status

### 23.3 Governance interface

Responsibilities:

- approve/reject definitions
- merge/split definitions
- rename and reclassify variants
- deprecate and supersede assets

### 23.4 Metrics interface

Responsibilities:

- generate metric snapshots
- query aggregate intelligence views
- provide trend and drift data

### 23.5 Export interface

Responsibilities:

- export JSON definitions
- export portfolio summaries
- provide lineage-friendly artifacts to downstream renderers and systems

---

## 24. Example decision flow for a new run

```text
New ProcessRun arrives
        ↓
Check duplicate signatures
        ↓
If duplicate: mark and suppress from active grouping as needed
        ↓
Compute similarity against candidate and approved process definitions
        ↓
If high-confidence match:
    attach to definition
    update metrics
    evaluate variant membership
        ↓
If likely same process but new path:
    create or attach to candidate variant
    queue for review if needed
        ↓
If ambiguous:
    create review task
        ↓
If no viable match:
    create new candidate ProcessDefinition
```

---

## 25. Example portfolio views the product should eventually support

### 25.1 Process library view

A searchable list of all process definitions with:

- title
- status
- owner
- run count
- confidence
- last observed date
- variant count

### 25.2 Process detail view

A process-centric page with:

- standard path
- variants
- representative runs
- metrics
- drift alerts
- governance history
- related outputs

### 25.3 Portfolio health view

A collection-level dashboard with:

- candidate definitions needing review
- high-drift processes
- stale approved definitions
- most-run processes
- highest exception-rate processes

### 25.4 Comparison view

A comparison experience for:

- version versus version
- team versus team
- standard path versus exception path

---

## 26. Security and privacy considerations

### 26.1 Principle

Process intelligence must not become hidden behavioral surveillance.

### 26.2 Required controls

The layer should support:

- tenant isolation
- role-based access to process assets
- collection-level visibility controls
- redaction-aware metrics behavior
- audit logs for governance actions
- export permission controls

### 26.3 Minimization

Portfolio intelligence should prefer derived structural signals over over-retaining sensitive raw payloads when not needed.

---

## 27. Non-functional requirements

The Process Intelligence Layer should meet the following baseline qualities.

### 27.1 Determinism

Given the same run population and rule version, grouping and metric outputs should be reproducible.

### 27.2 Traceability

Every major asset and decision must preserve provenance.

### 27.3 Scalability

The design should support growth from dozens to thousands of process assets without a total redesign.

### 27.4 Explainability

Key grouping and lifecycle actions must be inspectable by users and administrators.

### 27.5 Versionability

Rules, process definitions, and metric snapshots must be version-aware.

### 27.6 Portability

Process intelligence outputs must be exportable in stable machine-readable formats.

---

## 28. Open design questions to track

These are important questions but should not block canonicalization of the current doc.

1. How much semantic similarity should be introduced in post-MVP grouping?
2. How should role-awareness be modeled across tenants with different org structures?
3. What is the best long-term graph representation for related processes?
4. How should approved policy overlays interact with observed reality when they conflict?
5. What process maturity scoring model is most useful without becoming consultancy theater?
6. What retrieval structure best serves future agentic workflows while preserving provenance?

---

## 29. Recommended implementation sequence

1. Define `ProcessDefinition`, `ProcessVariant`, and lineage objects in the core data model.
2. Build deterministic similarity scoring based on step skeletons, activities, systems, and artifacts.
3. Build candidate creation, high-confidence attachment, and ambiguity review queue flows.
4. Add standard path selection and variant registration.
5. Add lifecycle states, approvals, and merge/split actions.
6. Add metric snapshots and collection views.
7. Add drift monitoring and rebaseline suggestions.
8. Add richer portfolio discovery and downstream activation features.

---

## 30. Canonical conclusion

The Process Intelligence Layer is where Ledgerium AI stops being a recorder and becomes a process intelligence platform.

It is the layer that turns repeated observed workflow evidence into managed process assets with identity, metrics, variants, governance, and long-term value.

This layer must be built with unusual discipline.

It cannot become a vague analytics bucket or a magical AI abstraction engine. It must remain:

- evidence-linked
- deterministic-first
- versioned
- reviewable
- portfolio-oriented
- portable
- worthy of trust

If built correctly, this layer becomes the foundation for:

- trusted process libraries
- process governance
- continuous improvement
- operational analytics
- AI-ready workflow memory
- future copilots and agents that act on grounded process knowledge rather than brittle prompts

That is the strategic role of the Ledgerium AI Process Intelligence Layer.
