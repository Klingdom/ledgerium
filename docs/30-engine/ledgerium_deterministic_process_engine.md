# Ledgerium AI Deterministic Process Engine

**Status:** Canonical draft 1.0  
**Last updated:** 2026-03-23  
**Owner:** Founder / Principal Architect  
**Audience:** Engineering, product, design, analytics, QA, security, implementation partners, and stakeholders  
**Related docs:** `ledgerium_product_philosophy_and_system_design.md`, `ledgerium_technical_architecture_and_roadmap.md`, `ledgerium_core_data_model.md`, `ledgerium_sidebar_recorder_browser_extension_specification.md`

---

## 1. Purpose of this document

This document defines the canonical specification for the Ledgerium AI Deterministic Process Engine. It is the source of truth for how the platform should transform recorded workflow evidence into steps, activities, process maps, SOPs, metrics, and reusable process definitions.

This engine is the core differentiator of Ledgerium AI.

Ledgerium AI is not intended to be an opaque summarizer that observes user behavior and improvises plausible documentation. It is intended to be a **trust-first, deterministic, evidence-linked process intelligence platform**. That means the system must be able to explain, in concrete terms, why it created a given step, why it grouped a set of actions into an activity, why a branch appears in a process map, and why a sentence shows up in an SOP.

The Deterministic Process Engine exists to preserve that trust.

This document answers the following foundational questions:

1. What the engine is responsible for.
2. What inputs it receives and what outputs it produces.
3. Which transformations must be deterministic in MVP.
4. How segmentation, grouping, labeling, and derivation should work.
5. How provenance, confidence, and reviewability should be preserved.
6. Where generative AI may assist without becoming the system of record.
7. How the engine should evolve from MVP into a broader process intelligence layer.

---

## 2. Executive summary

The Ledgerium AI Deterministic Process Engine should be built as a rule-driven transformation pipeline that converts normalized evidence into reusable process knowledge through a series of explicit stages.

At a high level, the engine should:

1. ingest normalized browser workflow evidence
2. segment evidence into bounded runs, steps, and activities
3. classify interaction patterns using deterministic rules
4. derive evidence-linked step names and descriptions
5. assemble execution structure into process maps and SOP-ready artifacts
6. identify variants, repetitions, loops, and exceptions
7. compute process metrics grounded in observed behavior
8. promote one or more runs into reusable process definitions
9. preserve provenance for every important output
10. expose all major derivations for inspection and review

The engine must favor:

- explicit rules over latent guesswork
- stable contracts over prompt-only behavior
- explainable grouping over magical summarization
- provenance and evidence references over freeform abstractions
- user review and correction over unchallengeable output

Generative AI may assist later with polishing language, naming alternatives, and optional summaries, but the canonical structural outputs must be producible without requiring an LLM to invent the process.

---

## 3. Strategic role of the engine

### 3.1 Why this engine matters

The recorder captures evidence. The core data model preserves truth layers. The deterministic engine is what turns evidence into value.

Without the engine, Ledgerium AI is only a structured recorder.

With the engine, Ledgerium AI becomes:

- an auditable process documentation system
- a repeatable process abstraction system
- a process map generator with inspectable logic
- an SOP generator grounded in real execution
- a portfolio-ready substrate for process intelligence

### 3.2 The product promise this engine must uphold

The engine must preserve the Ledgerium AI product promise:

> Reality before opinion. Evidence before interpretation. Determinism before abstraction.

That promise has concrete implementation implications:

- the engine should not invent unseen steps
- the engine should not merge unrelated actions because a summary model finds them semantically similar
- the engine should not collapse important distinctions users may need for auditability
- the engine should not hide uncertainty
- the engine should not make it impossible to trace outputs back to evidence

### 3.3 What the engine is not

The engine is not:

- a generic BPMN modeling tool without evidence grounding
- a process mining engine that depends on enterprise event logs only
- a pure LLM agent that “writes documentation” from memory
- a black-box classifier with no visible rationale
- a replacement for human review in high-stakes or ambiguous cases

---

## 4. Design principles

### 4.1 Determinism first

Core transformations should be driven by explicit, versioned rules. Any output that defines process structure must be reproducible from the same inputs and rule versions.

### 4.2 Evidence linkage everywhere

Every derived step, activity, map node, SOP section, metric, and process definition should be traceable to source evidence.

### 4.3 Stable truth layers

The engine must preserve distinctions between:

- observed evidence
- normalized evidence
- derived structure
- user edits and confirmations
- optional AI-assisted polish

### 4.4 Human-readable reasoning

The engine should produce not only outputs, but also explanations such as:

- why this step boundary was created
- why these events were grouped together
- why this node is considered a branch
- why this wording was selected

### 4.5 Minimal hidden magic

The engine should expose thresholds, rule versions, and derivation metadata so behavior can be debugged and trusted.

### 4.6 Conservative abstraction

Where ambiguity exists, the engine should prefer preserving detail over prematurely collapsing information.

### 4.7 Progressive enrichment

The engine should support a ladder of derivation:

- first: reliable step structure
- then: higher-order activity structure
- then: process definition and map skeleton
- then: reusable variants and metrics
- then: optional narrative and optimization layers

---

## 5. Engine scope

### 5.1 In scope for the deterministic engine

The engine is responsible for:

- run finalization after recording stops or checkpoints occur
- event sequence analysis
- temporal segmentation
- structural segmentation into steps and activities
- action classification using deterministic rules
- branch, loop, and repetition detection
- process path derivation
- evidence-linked step naming and descriptions
- process map skeleton generation
- SOP section generation using deterministic templates
- variant extraction across runs
- metric computation
- promotion of run knowledge into reusable process definitions
- derivation metadata and confidence generation

### 5.2 Out of scope for the deterministic engine

The engine is not primarily responsible for:

- raw browser event capture itself
- user authentication and permissions
- long-term collaboration features unrelated to derivation
- freeform generative writing as the source of process truth
- unattended enterprise orchestration or task execution

### 5.3 MVP engine boundaries

The MVP engine should focus on browser-based workflows and deterministic generation of:

- ProcessRun segmentation
- RunStep derivation
- RunActivity grouping
- process map skeletons
- SOP-ready output structures
- JSON export artifacts
- basic metrics
- variant candidates within a bounded portfolio

It does not need to support all enterprise process-mining capabilities in version one.

---

## 6. Inputs and outputs

### 6.1 Primary inputs

The engine consumes the following canonical inputs:

1. **CaptureSession** metadata
2. **NormalizedEvent** sequence for a session or run
3. **Recorder policy metadata** such as ignored domains, redaction events, and pause windows
4. **User annotations** when present
5. **Rule configuration** and versioned threshold sets
6. **Optional previously known process definitions** for alignment or matching

### 6.2 Primary outputs

The engine produces the following canonical outputs:

1. **ProcessRun**
2. **RunStep** objects with evidence references
3. **RunActivity** objects with grouped steps
4. **DerivedArtifact** objects for SOPs, maps, and JSON exports
5. **ProcessDefinition** candidates
6. **ProcessVariant** candidates
7. **ReviewDecision** queue items when ambiguity crosses thresholds
8. **Metric summaries** at run and definition level
9. **Derivation metadata** including rule versions, rationale, and confidence

### 6.3 Output truth layers

Each output must be tagged by origin layer:

- `observed`
- `normalized`
- `derived_deterministic`
- `user_confirmed`
- `ai_assisted`

These values should be visible both in data and in internal tooling.

---

## 7. Pipeline overview

The deterministic engine should be organized into a staged transformation pipeline.

```text
Normalized events
        ↓
Run boundary resolution
        ↓
Micro-segmentation into candidate action groups
        ↓
Step boundary detection
        ↓
Step classification and evidence aggregation
        ↓
Activity grouping
        ↓
Path / branch / loop analysis
        ↓
Process map skeleton generation
        ↓
SOP structure generation
        ↓
Metrics and variant extraction
        ↓
Process definition promotion
```

Each stage should emit:

- transformed objects
- rationale metadata
- confidence metadata
- rule version references
- recoverable intermediate artifacts for debugging and review

---

## 8. Canonical transformation stages

## 8.1 Stage 0: Preconditions and validation

Before derivation begins, the engine should validate that inputs are usable.

Checks should include:

- event sequence is ordered or orderable by timestamp and source sequence index
- required session metadata is present
- pause/resume windows are valid
- rule bundle version is resolved
- redacted or blocked events are marked correctly
- minimum evidence threshold for analysis is met

If validation fails, the engine should produce a partial diagnostic artifact rather than silently failing.

## 8.2 Stage 1: Run boundary resolution

A single recording session may contain one or more meaningful runs, especially if the user pauses, changes task intent, or performs unrelated work.

The engine should resolve process run boundaries using deterministic signals such as:

- explicit user stop and restart
- long idle duration exceeding configured threshold
- sustained navigation to an unrelated domain or application context
- explicit user annotations such as “new task”
- major context switch from one workflow goal to another

The result of this stage is one or more **ProcessRun** objects with bounded evidence sets.

## 8.3 Stage 2: Micro-segmentation into candidate action groups

Before deriving user-facing steps, the engine should group low-level events into compact candidate action groups.

Examples:

- multiple keystrokes into a field become one input action group
- a click followed by short DOM settling becomes one interaction unit
- a dropdown open plus selection becomes one selection action group
- repeated checkbox clicks within a short burst become one grouped interaction set

This stage reduces noise while preserving traceability.

## 8.4 Stage 3: Step boundary detection

This stage is one of the most important in the entire system.

The engine should create a new candidate step boundary when one or more of the following conditions are met:

- navigation to a new page or route with material task-state change
- submission or commit action occurs
- modal/dialog workflow begins or ends with a completed user intent
- an action group completes a clear sub-goal
- system feedback indicates transition to next meaningful task phase
- elapsed time between related action groups exceeds threshold
- application region or object of work changes significantly

The engine should avoid creating a new step for:

- every individual click
- minor field edits within the same intent
- transient UI jitter
- loading artifacts without user goal change

## 8.5 Stage 4: Step classification and evidence aggregation

For each derived step, the engine should assign deterministic classifications such as:

- `navigate`
- `search`
- `open_record`
- `create_record`
- `edit_field`
- `select_option`
- `upload_artifact`
- `validate_or_review`
- `submit_or_save`
- `confirm_or_finalize`
- `exception_or_error_handling`
- `wait_for_system`

Each step should aggregate:

- start and end timestamps
- source event IDs
- involved elements and application contexts
- evidence references
- derived labels
- confidence and rationale

## 8.6 Stage 5: Activity grouping

Multiple sequential steps should be grouped into higher-order activities when they support the same immediate user goal.

Example activities:

- locate target record
- update customer information
- review generated results
- submit and confirm request

The grouping logic should use deterministic indicators including:

- contiguous step classifications with compatible purpose
- shared object of work, such as the same case or record
- stable screen context across multiple steps
- explicit completion signal after the grouped sequence
- lack of evidence for branching into a separate goal

## 8.7 Stage 6: Path, branch, repetition, and loop analysis

The engine should inspect step and activity sequences for path structure.

It should detect:

- common linear path
- conditional branch
- alternate branch
- retry loop
- repeated subroutine
- exception path
- optional step

This stage is essential for producing process maps that reflect how work actually happens rather than assuming every path is linear.

## 8.8 Stage 7: Process map skeleton generation

The engine should build a process map skeleton using deterministic structural objects rather than generating diagrams directly from prose.

The map skeleton should include:

- start node
- ordered task nodes
- decision nodes
- exception nodes
- end node
- edge metadata
- evidence references per node
- confidence markers when branch certainty is low

## 8.9 Stage 8: SOP structure generation

The engine should generate SOP-ready sections using deterministic templates based on derived process structure.

At minimum, the SOP structure should include:

- process title
- process objective
- scope and preconditions
- required inputs or access
- ordered procedure steps
- decision guidance where relevant
- exception handling notes
- completion criteria
- evidence-linked appendices or references

## 8.10 Stage 9: Variant and definition promotion

One or more runs may be compared to promote a reusable **ProcessDefinition**.

This stage should:

- align homologous steps across runs
- identify the dominant path
- extract alternate variants
- preserve run-level outliers without corrupting the base definition
- compute stability metrics

## 8.11 Stage 10: Review queue generation

When ambiguity exceeds configured thresholds, the engine should generate review tasks rather than silently choosing a weak interpretation.

Examples:

- low confidence step boundary
- uncertain branch classification
- conflicting candidate step names
- process match ambiguity across multiple definitions
- unclear exception versus normal variation

---

## 9. Rule system architecture

### 9.1 Rule-first architecture

The engine should be driven by explicit rule bundles rather than scattered hard-coded heuristics.

Recommended structure:

- `normalization_rules`
- `segmentation_rules`
- `classification_rules`
- `grouping_rules`
- `map_rules`
- `sop_rules`
- `variant_rules`
- `review_rules`

Each rule bundle should be versioned independently and also as part of a global engine version.

### 9.2 Rule representation

Rules should be representable in a structured configuration form rather than only in code.

Suggested components:

- rule ID
- rule description
- predicate conditions
- threshold values
- precedence order
- output effect
- confidence contribution
- rationale template
- version metadata

### 9.3 Rule precedence

Where multiple rules apply, the engine should use explicit precedence resolution. High-signal structural rules should override weak contextual hints.

### 9.4 Rule explainability

Every derivation should preserve which rules fired, with human-readable rationale such as:

- “New step created because route changed from search results to case detail after record-open click.”
- “Action groups merged because they targeted the same form field within 4 seconds.”
- “Exception path created because save action returned validation error before successful retry.”

---

## 10. Step boundary specification

### 10.1 Why step boundaries matter

Step boundaries define the atomic units users will trust and review. If step boundaries are weak, every downstream artifact becomes unstable.

### 10.2 Boundary signals

The engine should consider the following boundary signals.

#### Strong signals

- explicit route or page transition tied to user intent
- successful submit/save/confirm action
- opening a materially different record or object
- completion toast or system confirmation after an action sequence
- beginning or ending a modal workflow with clear state change

#### Medium signals

- shift from search behavior to record editing behavior
- movement from data entry to review state
- elapsed time threshold exceeded
- visible object-of-work ID change

#### Weak signals

- focus change alone
- minor DOM mutation
- small pauses
- hover or scroll changes without task state change

### 10.3 Boundary anti-patterns

The engine should avoid these failure modes:

- over-splitting every click into a step
- under-splitting multi-goal sequences into a single giant step
- treating passive system waiting as a user action step unless analytically useful
- creating boundaries from UI instability or instrumentation artifacts

### 10.4 Suggested MVP thresholds

These values should be configurable, but a canonical starting point is useful.

- micro-action merge window: `1.5–3.0 seconds`
- same-intent field editing window: `up to 10 seconds`
- likely step boundary idle threshold: `12–20 seconds`
- likely run boundary idle threshold: `120–300 seconds`
- unrelated domain/context switch threshold: immediate candidate boundary, confirmed after `1–2` additional signals

These are starting defaults, not permanent truths.

---

## 11. Step naming and descriptions

### 11.1 Deterministic naming first

Every step should be given a canonical default name deterministically using evidence priority.

Preferred sources in descending order:

1. known action template from classification rules
2. target object and route metadata
3. labeled UI element text
4. user annotation
5. stable application metadata

### 11.2 Naming template examples

Examples of deterministic naming templates:

- `Search for [object_type]`
- `Open [record_type] details`
- `Update [field_group]`
- `Upload [artifact_type]`
- `Review [result_type]`
- `Submit [transaction_type]`
- `Resolve validation error`
- `Confirm completion`

### 11.3 Descriptions

Step descriptions should be template-driven and reference evidence, not generated as unconstrained prose.

Example:

> The user opened the customer case record from search results and moved into the case detail view.

### 11.4 Optional AI assistance

AI may propose alternative labels only after the deterministic label exists. The deterministic label remains canonical unless a user confirms a replacement.

---

## 12. Activity grouping specification

### 12.1 Activity purpose

Activities are higher-order groupings that help users understand the process in terms of sub-goals, not just actions.

### 12.2 Grouping criteria

A valid activity grouping should usually satisfy most of the following:

- same object of work
- same immediate user goal
- contiguous or near-contiguous step sequence
- compatible classifications
- no strong evidence of a branch to another goal
- coherent completion signal

### 12.3 Example activity groupings

- Find and open target request
- Collect required details
- Review and validate submission
- Submit request and confirm completion

### 12.4 Grouping guardrails

Do not group steps together merely because they occur on the same screen. Goal coherence is more important than screen location.

---

## 13. Path and branch analysis

### 13.1 Path model

Every run should be representable as an ordered path through step and activity nodes.

### 13.2 Branch detection rules

A branch should be considered when the evidence shows:

- a decision-like divergence after a review or validation point
- a validation failure path before the normal success path
- optional attachment/upload flow present in some runs but not others
- repeated attempts before success

### 13.3 Loop detection

A loop should be detected when a run revisits a prior step or equivalent step cluster with the same object of work and compatible intent after a failed or incomplete transition.

### 13.4 Exception paths

Exception paths should be marked distinctly from normal variants. Examples include:

- validation failure
- permission denied
- missing data discovered mid-process
- forced cancellation

---

## 14. Process map generation model

### 14.1 Structural-first map generation

The engine should produce a structured map model first, then render visual diagrams from that model.

### 14.2 Canonical map model

Map model should include:

- node ID
- node type
- label
- supporting step or activity IDs
- evidence references
- incoming and outgoing edge IDs
- variant tags
- confidence metadata

### 14.3 MVP node types

- `start`
- `task`
- `decision`
- `exception`
- `end`

### 14.4 Rendering neutrality

The engine should not hardcode one visual notation too early. It should support an internal map model that can later render to:

- lightweight Ledgerium native diagrams
- BPMN-inspired views
- swimlane views
- SOP-aligned step lists

---

## 15. SOP generation model

### 15.1 Deterministic SOP generation principle

SOP generation should be template-based and driven by derived process structure. It should not begin with an open-ended prompt like “write an SOP from this session.”

### 15.2 Required SOP sections in MVP

1. Process title
2. Process summary
3. Preconditions
4. Required tools or access
5. Ordered procedure
6. Decision points and alternate paths
7. Exception handling
8. Completion criteria
9. Evidence notes / traceability appendix

### 15.3 Procedure generation

Each SOP step should map to one or more RunStep or ProcessDefinition steps. Each step should preserve references back to evidence and derivation metadata.

### 15.4 Narrative quality

Human readability matters, but fidelity matters more. Any narrative simplification must not erase important branches or caveats.

---

## 16. Metrics specification

### 16.1 Metric philosophy

Metrics should be grounded in observed evidence, not speculative estimates.

### 16.2 MVP run-level metrics

The engine should compute at least:

- total run duration
- active interaction duration
- idle duration
- step count
- activity count
- loop count
- exception count
- confirmation count
- page/context transition count

### 16.3 Definition-level metrics

Across multiple runs, the engine should compute:

- median duration
- duration spread
- step stability
- most common path frequency
- exception rate
- optional step rate
- variant distribution

### 16.4 Metric caveats

Metrics should always be labeled with scope and confidence. For example, “based on 6 observed runs” is more honest than presenting universal truth.

---

## 17. Process definition promotion

### 17.1 Why promotion exists

A ProcessRun is one execution. A ProcessDefinition is reusable process knowledge. The engine must bridge the two carefully.

### 17.2 Promotion criteria

A process definition candidate should generally be promoted when:

- sufficient run evidence exists
- runs share a strong common path
- naming stability is acceptable
- variance is understandable rather than chaotic
- user or system confidence crosses threshold

### 17.3 Canonical path selection

The base definition should usually represent the dominant path, with variants explicitly attached rather than blended into one muddy sequence.

### 17.4 Variant handling

Variants should be promoted when differences are meaningful and recurring, not merely noise.

Examples:

- standard path vs expedited path
- with attachment vs without attachment
- validation-error recovery path
- approval-required path vs auto-complete path

---

## 18. Confidence and ambiguity handling

### 18.1 Confidence is required

The engine must never imply perfect certainty where ambiguity exists.

### 18.2 Confidence layers

Confidence should be tracked at least for:

- step boundary
- step label
- activity grouping
- branch classification
- process match / definition promotion

### 18.3 Confidence contributors

Confidence may derive from:

- number and strength of rules that fired
- clarity of navigation and commit events
- object-of-work continuity
- stability across similar runs
- availability of labeled UI targets
- absence of contradictory signals

### 18.4 Review thresholds

When confidence falls below configured thresholds, the engine should:

- preserve the best candidate structure
- mark it as needing review
- expose why the ambiguity exists
- avoid irreversible promotion to reusable definitions

---

## 19. Provenance and explainability requirements

### 19.1 Every important output must explain itself

At minimum, each derived step and activity should preserve:

- source event references
- rule IDs that fired
- derivation timestamp
- engine version
- rationale text
- confidence score or band

### 19.2 User-visible evidence drawer

The UI should be able to show, for any step:

- underlying events
- timestamps
- screen/page context
- matched rule explanations
- related SOP line or process map node

### 19.3 Auditability

The engine should support reconstruction of outputs from stored evidence plus rule version, subject to redaction and retention policies.

---

## 20. Human review model

### 20.1 Human review is part of the product, not a fallback failure

The deterministic engine should assume that some cases deserve review. That improves trust.

### 20.2 Reviewable objects

Users or analysts should be able to review:

- step boundaries
- step labels
- activity grouping
- branch classification
- process definition matching
- SOP wording

### 20.3 Review effects

Reviews should not overwrite evidence. They should generate structured review decisions and, where appropriate, new derived versions.

### 20.4 Learning from review

Review data may later help tune thresholds or propose improved rules, but those updates should enter through controlled rule version changes.

---

## 21. Role of AI assistance

### 21.1 Allowed AI roles

AI may help with:

- alternative labels for steps or activities
- concise process summaries
- readability improvements for SOP prose
- suggested exception explanations
- clustering assistance for analyst workflows, with explicit non-canonical status until confirmed

### 21.2 Disallowed AI roles in canonical MVP output

AI should not be the sole source of:

- core step boundaries
- process structure
- branch creation
- evidence linkage
- definition promotion

### 21.3 Truth contract

If AI-generated text appears anywhere, it must be distinguishable from deterministic structure and, where appropriate, from user-confirmed language.

---

## 22. Error handling and failure modes

### 22.1 Expected failure modes

The engine should explicitly guard against:

- sparse evidence runs
- noisy instrumentation
- blocked or redacted domains removing context
- partial sessions due to crash or browser close
- low-signal workflows dominated by passive viewing
- UI automation causing unnatural event bursts

### 22.2 Engine behavior under weak evidence

When evidence is weak, the engine should degrade gracefully by:

- producing a lower-confidence structure
- surfacing the limitation
- avoiding overconfident abstraction
- allowing export of raw/normalized evidence with minimal derived structure

---

## 23. Non-functional requirements

### 23.1 Reproducibility

Given the same normalized inputs and rule bundle version, the deterministic outputs should be reproducible.

### 23.2 Performance

For normal MVP session sizes, the engine should produce first-pass results quickly enough to support a responsive review workflow after recording stops.

### 23.3 Observability

The engine should emit internal telemetry for:

- rule execution counts
- ambiguity rates
- review trigger rates
- derivation timing by stage
- failure categories

### 23.4 Testability

Every major rule family should be testable with fixture-based input/output assertions.

### 23.5 Versionability

Rule bundles, output schemas, and derivation behavior should be versioned independently and together.

---

## 24. Implementation architecture guidance

### 24.1 Preferred module decomposition

Suggested modules:

- `run_resolver`
- `micro_segmenter`
- `step_boundary_engine`
- `step_classifier`
- `activity_grouper`
- `path_analyzer`
- `map_builder`
- `sop_builder`
- `variant_extractor`
- `definition_promoter`
- `review_router`
- `explainability_formatter`

### 24.2 Data contracts

Each module should consume and emit typed, versioned objects. Avoid passing loosely structured dictionaries once canonical contracts are defined.

### 24.3 Debug artifacts

The engine should support debug mode outputs such as:

- candidate boundaries rejected and accepted
- fired rules by stage
- confidence contribution traces
- variant alignment traces

These artifacts are valuable for tuning and enterprise trust.

---

## 25. Test strategy

### 25.1 Unit tests

Each rule and module should have deterministic unit tests.

### 25.2 Fixture tests

Maintain a library of captured workflow fixtures representing:

- clean linear process
- branch-heavy process
- validation-error process
- repetitive data-entry process
- noisy incomplete session

### 25.3 Regression tests

Every rule version update should run against canonical fixtures to prevent silent drift in step counts, branch detection, or naming behavior.

### 25.4 Golden outputs

For carefully curated fixtures, maintain golden expected outputs for:

- steps
- activities
- map skeleton
- SOP structure
- key metrics

---

## 26. MVP definition for the engine

### 26.1 MVP must ship

The MVP deterministic engine must reliably support:

1. normalized event ingestion
2. run boundary resolution
3. micro-segmentation
4. step boundary detection
5. deterministic step naming
6. activity grouping
7. basic branch and exception detection
8. process map skeleton generation
9. SOP structure generation
10. run-level metrics
11. evidence linkage and explainability metadata
12. review queue creation for ambiguous cases

### 26.2 MVP may defer

The following can be deferred until later phases:

- sophisticated cross-run similarity matching at scale
- advanced portfolio clustering
- desktop and native application capture rules
- adaptive or learning-based rule proposal systems
- enterprise benchmarking dashboards
- deep optimization recommendation engines

---

## 27. Post-MVP evolution roadmap

### 27.1 Phase 2

- stronger cross-run alignment
- reusable process definition management
- richer branch semantics
- variant analytics
- analyst review workspace

### 27.2 Phase 3

- process portfolio intelligence
- comparison across teams and roles
- bottleneck and drift detection
- optimization opportunity detection
- policy and compliance overlays

### 27.3 Phase 4

- broader capture modalities
- agent-ready process definitions
- controlled AI co-pilot assistance for process refinement
- enterprise governance, approvals, and lineage dashboards

---

## 28. Open decisions to resolve next

The following design questions should be finalized as implementation progresses:

1. canonical threshold defaults by workflow type
2. exact confidence scoring formula versus confidence bands
3. internal map model schema shape
4. SOP template variants by audience type
5. cross-run alignment algorithm details for definition promotion
6. review UX and approval workflow depth for enterprise mode

These decisions should be resolved without violating the deterministic-first philosophy.

---

## 29. Canonical principles to preserve

The following principles are non-negotiable and should survive future rewrites:

1. The engine must show its work.
2. The engine must not invent core process structure without evidence.
3. The engine must separate deterministic structure from AI polish.
4. The engine must preserve provenance and rule versioning.
5. The engine must prefer reviewable ambiguity over confident hallucination.
6. The engine must convert observed behavior into reusable process intelligence without losing trust.

---

## 30. Closing statement

The Ledgerium AI Deterministic Process Engine is the system that turns captured workflow behavior into credible process knowledge.

If the recorder is the front door of trust, the deterministic engine is the foundation under the entire house.

It must therefore be built with unusual discipline.

The goal is not to create the most magical documentation generator. The goal is to create the most **trustworthy** workflow-to-process engine in the category: one that developers can implement, users can inspect, operators can rely on, and stakeholders can defend.

That is the standard this document establishes.
