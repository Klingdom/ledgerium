# Ledgerium AI JSON → Output Rendering System

**Status:** Canonical draft 1.0  
**Last updated:** 2026-03-23  
**Owner:** Founder / Principal Architect  
**Audience:** Engineering, product, design, QA, analytics, implementation partners, security, and stakeholders  
**Related docs:** `ledgerium_product_philosophy_and_system_design.md`, `ledgerium_technical_architecture_and_roadmap.md`, `ledgerium_core_data_model.md`, `ledgerium_sidebar_recorder_browser_extension_specification.md`, `ledgerium_deterministic_process_engine.md`

---

## 1. Purpose of this document

This document defines the canonical specification for the Ledgerium AI JSON → Output Rendering System. It is the source of truth for how structured Ledgerium JSON should be transformed into user-facing outputs such as process maps, SOPs, task breakdowns, evidence views, summaries, and exports.

The rendering system is not a cosmetic layer added after process derivation. It is a core trust layer of the product.

Ledgerium AI is a **trust-first, deterministic, evidence-linked process intelligence platform**. That means rendered outputs cannot be vague interpretations that merely "look good." They must preserve provenance, expose uncertainty, remain traceable to source evidence, and faithfully represent the deterministic process model.

This document answers seven foundational questions:

1. What inputs can the rendering system accept?
2. What outputs must it be able to produce?
3. What rendering rules must remain deterministic?
4. How must evidence and uncertainty be exposed to users?
5. How should rendering differ by audience and use case?
6. How should exported artifacts be structured and versioned?
7. What quality gates must exist before an output is considered publishable?

---

## 2. Rendering system thesis

Ledgerium does not create value by simply storing event JSON. It creates value by converting trustworthy structured workflow evidence into outputs that people can read, review, use, and operationalize.

The rendering system therefore sits at the boundary between:

- machine-readable process structure
- human-readable process documentation
- visual workflow understanding
- operational adoption

If the deterministic process engine is responsible for answering **"what process structure exists here?"**, the rendering system is responsible for answering **"how should that structure be shown so humans can act on it without losing trust?"**

The rendering system must satisfy four simultaneous goals:

1. **Fidelity** — outputs must reflect the underlying process model accurately.
2. **Legibility** — outputs must be easy to read and understand.
3. **Traceability** — outputs must preserve evidence linkage and auditability.
4. **Operational usefulness** — outputs must be usable by operators, managers, auditors, and AI systems.

---

## 3. Scope

This document covers rendering of Ledgerium JSON into:

- process maps
- standard operating procedures (SOPs)
- step/task breakdowns
- run summaries
- evidence-linked process views
- exception and variation summaries
- role/handoff views
- metrics panels
- export packages
- machine-readable downstream payloads

This document does **not** define:

- raw event capture rules in detail
- deterministic segmentation rules in detail
- process portfolio clustering algorithms in detail
- long-term BI dashboard design
- presentation template branding for sales decks

Those are defined in related documents.

---

## 4. Definitions

### 4.1 Render input
A structured JSON payload that has already passed validation and represents a session, a process run, a process definition, or a comparison object.

### 4.2 Render output
Any user-facing or system-facing representation generated from a render input, including HTML views, markdown, diagrams, PDF-ready layouts, JSON exports, and API responses.

### 4.3 View model
A normalized intermediate object produced by the rendering system that is optimized for presentation, not storage.

### 4.4 Evidence linkage
A traceable connection between a rendered element and the observed, normalized, or derived source artifacts that support it.

### 4.5 Publishable output
An output that has passed required validation, completeness checks, and trust checks and is considered suitable for end-user review or export.

### 4.6 Canonical output
The primary trusted rendering for a given object and format. Example: the canonical SOP markdown for a `ProcessDefinition` version.

---

## 5. Design principles

### 5.1 JSON is the contract; rendering is the interpretation layer
The rendering system must never invent structure that the validated model does not support. It may format, reorder for readability, suppress non-essential detail, or group adjacent items for display, but it must not fabricate hidden steps, fake decision logic, or implied intent.

### 5.2 Deterministic first, generative second
Primary render paths must be deterministic. Generative AI may later assist with optional enhancements such as title polishing, plain-language explanation, translation, or summarization, but the canonical process map and SOP structure must be derivable without opaque model inference.

### 5.3 Evidence must remain reachable
Every rendered step, decision, activity, exception, or note should be able to point back to evidence when evidence exists. Users should not be forced to choose between readability and auditability.

### 5.4 Progressive disclosure beats clutter
The default rendered view should be clean and digestible. Deep evidence, metadata, timestamps, and technical detail should be available through expansion, linked drawers, tooltips, or export appendices.

### 5.5 The same truth can have multiple views
A process run may need to render as:

- a visual process map for executives
- a precise SOP for operators
- a structured JSON export for systems
- an exception-focused summary for improvement teams

These are different views of the same core truth, not different truths.

### 5.6 Rendering must preserve trust signals
Outputs should visibly communicate:

- source type
- derivation status
- confidence and completeness
- unresolved ambiguity
- human edits versus system-derived content

### 5.7 Exports are product surfaces, not afterthoughts
Markdown, PDF, JSON, and diagram exports are first-class outputs. They must be stable, versioned, and suitable for GitHub, knowledge bases, compliance archives, and operational teams.

---

## 6. Primary render inputs

The rendering system must support the following input object types.

### 6.1 Session capture payloads
Used to render immediate post-recording summaries, evidence timelines, and preliminary step lists.

### 6.2 ProcessRun objects
Used to render run-specific outputs showing what occurred in a single observed execution.

### 6.3 ProcessDefinition objects
Used to render canonical process documentation, stable maps, SOPs, role views, and versioned exports.

### 6.4 Process comparison objects
Used to render run-to-definition drift views, variation summaries, before/after comparisons, and process evolution reports.

### 6.5 Review and approval metadata
Used to render trust badges, review state, approver notes, and publishability status.

### 6.6 Evidence collections
Used to populate evidence drawers, appendices, audit bundles, and step-level source references.

---

## 7. Output families

The rendering system must support six major output families.

### 7.1 Interactive in-product views
Used in the Ledgerium UI.

Examples:

- interactive process map
- SOP reader
- evidence drawer
- metrics side panel
- exceptions summary
- run comparison view

### 7.2 Exportable human-readable documents
Used outside the app.

Examples:

- markdown SOP
- markdown process definition
- PDF-ready narrative export
- review packet
- evidence appendix

### 7.3 Structured machine-readable outputs
Used for downstream systems.

Examples:

- canonical JSON bundle
- API response payloads
- workflow handoff JSON
- analytics event exports

### 7.4 Diagram payloads
Used by front-end renderers, layout engines, or third-party viewers.

Examples:

- graph node/edge payload
- swimlane layout payload
- branch metadata payload

### 7.5 Governance artifacts
Used by reviewers, auditors, and regulated contexts.

Examples:

- audit trail exports
- review state summaries
- evidence coverage reports
- change logs

### 7.6 AI-ready contextual payloads
Used to support future AI-fluid workflows without losing provenance.

Examples:

- process context package for agent use
- tool-step mapping payload
- role-responsibility context object

---

## 8. Reference rendering pipeline

The rendering system should follow a staged pipeline.

### 8.1 Stage 1 — Input validation
Validate schema, required fields, enum values, object references, and version compatibility.

### 8.2 Stage 2 — Render preparation
Normalize the input into a rendering-ready view model. This stage may:

- resolve IDs to labels
- flatten nested structures for document output
- group nodes by activity or role
- calculate display order
- collect evidence references
- compute coverage and quality badges

### 8.3 Stage 3 — Output-specific transformation
Transform the view model into format-specific payloads.

Examples:

- graph nodes and edges for map view
- numbered ordered lists for SOP view
- markdown sections for GitHub export
- JSON bundles for API export

### 8.4 Stage 4 — Trust annotations
Attach metadata needed for user trust and governance.

Examples:

- derived versus observed labels
- confidence indicators
- unresolved ambiguity notes
- review status
- version and source markers

### 8.5 Stage 5 — Formatting and layout
Apply presentation rules such as headings, indentation, lane assignment, branching layout, evidence footnotes, and appendix order.

### 8.6 Stage 6 — Validation gates
Run output quality checks.

Examples:

- missing step titles
- broken evidence links
- orphan graph nodes
- empty SOP sections
- circular branch references

### 8.7 Stage 7 — Export and publish
Persist or transmit the output with content hashes, version identifiers, and optional review metadata.

---

## 9. Canonical rendering architecture

The preferred architecture is a layered renderer with strong separation of concerns.

### 9.1 Core components

#### a. Input adapters
Convert source objects into normalized render requests.

#### b. View model builders
Create stable presentation-oriented objects independent of UI framework.

#### c. Render engines
Produce output-specific artifacts such as markdown, graph payloads, or structured JSON.

#### d. Trust annotation service
Adds provenance, confidence, review state, and evidence coverage metadata.

#### e. Export packager
Creates bundles for download, archival, or GitHub publication.

#### f. Validation layer
Ensures deterministic outputs meet quality and consistency requirements.

### 9.2 Non-goals for architecture
The rendering system should not:

- re-run core process derivation logic
- mutate canonical process data except for ephemeral display transformation
- store independent shadow truth that diverges from the core data model
- hide unresolved ambiguity to make outputs prettier

---

## 10. View model standard

All major renderers should consume a shared normalized view model. This prevents inconsistent representations across outputs.

A canonical view model should include at least:

- object identity and version
- source object type
- process title and subtitle
- description and scope
- preconditions and triggers
- activity blocks
- ordered step list
- decision points and branches
- exception paths
- loops and repetition indicators
- roles and swimlanes
- systems and tools
- inputs and outputs
- evidence references
- confidence and completeness markers
- review and approval state
- change history summary
- metrics summary

The view model must be deterministic for the same input version.

---

## 11. Process map rendering specification

The process map is one of Ledgerium’s signature outputs. It must be intelligible to non-technical users while still preserving operational truth.

### 11.1 Purpose
To show the ordered and branching structure of a process in a visual form that makes sequence, decisions, handoffs, and major exceptions obvious.

### 11.2 Required elements
A canonical process map render should support:

- start node
- end node
- activity containers
- step nodes
- decision nodes
- branch labels
- loop indicators
- exception markers
- role or lane grouping
- tool/system indicators
- evidence availability indicator
- unresolved ambiguity marker when applicable

### 11.3 Visual hierarchy
The visual hierarchy should generally be:

1. process title and version
2. major activities
3. ordered steps within each activity
4. decisions and branches
5. exception paths
6. supporting metadata

### 11.4 Graph rules

#### a. Deterministic order
Node order should follow canonical execution order where possible.

#### b. Stable IDs
Every node and edge must have stable IDs to support comments, approvals, and diffing.

#### c. Explicit decisions
Any branch that materially affects path selection should render as an explicit decision node, not hidden conditional text.

#### d. Branch labeling
Edges from a decision node must include concise human-readable labels when a branch condition exists.

#### e. Lane assignment
When role ownership exists, nodes should be placed in their responsible role lane.

#### f. Exception visibility
Exceptions should be visible but visually secondary to the happy path unless the user chooses an exception-focused view.

### 11.5 Map variants
The system should support multiple variants derived from the same core graph.

- **Canonical map** — balanced detail level for most users
- **Executive map** — condensed activity-level map
- **Operator map** — step-level detail with handoffs and decisions
- **Exception map** — highlights rework, loops, failures, and alternate paths
- **Role map** — emphasizes swimlanes and ownership

### 11.6 When not to over-render
The system should not attempt to render every low-level event as a graph node. Visual maps should reflect process steps and decision structure, not raw clickstream noise.

---

## 12. SOP rendering specification

The SOP is the most operationally actionable human-readable output. It must be precise, readable, reviewable, and export-friendly.

### 12.1 Purpose
To turn structured process knowledge into a versioned written procedure that people can follow, review, and govern.

### 12.2 Canonical SOP structure
The standard SOP markdown render should support the following sections.

1. Title
2. Metadata block
3. Purpose
4. Scope
5. Trigger / start condition
6. Preconditions
7. Definitions or notes, when needed
8. Roles and responsibilities
9. Required tools / systems
10. Required inputs
11. Procedure steps
12. Decision logic
13. Exception handling
14. Outputs / completion criteria
15. Evidence and traceability note
16. Version / review information

### 12.3 Procedure step rules
Each procedural step should have:

- stable step identifier
- concise imperative title
- optional detail text
- actor / owner
- tool or system reference when relevant
- input dependency when relevant
- output or completion signal when relevant
- linked evidence reference when available
- note when the step is derived from multiple observations

### 12.4 Numbering model
SOP numbering should support:

- whole-number main steps
- decimal or nested numbering for substeps
- branch-specific numbering only when useful

A preferred pattern is:

- `1`, `2`, `3` for mainline steps
- `2.1`, `2.2` for substeps
- `Decision A`, `Exception E1` for non-linear sections when needed

### 12.5 Style rules
The SOP renderer should prefer:

- active voice
- imperative phrasing
- direct and specific language
- minimal ambiguity
- no invented rationales unless explicitly included in source data

### 12.6 SOP variants
The system should support:

- **Canonical SOP** — complete operational procedure
- **Condensed SOP** — shorter version for quick use
- **Training SOP** — includes explanatory notes and rationale
- **Compliance SOP** — emphasizes controls, approvals, and evidence
- **Run-specific SOP view** — shows what happened in a specific execution

### 12.7 Markdown as first-class output
The canonical SOP export should be available as clean markdown suitable for GitHub, docs sites, knowledge bases, and document conversion pipelines.

---

## 13. Step and task breakdown rendering

Some users need simpler, more granular outputs than a full SOP.

### 13.1 Purpose
To provide a compact representation of ordered tasks or steps for quick reference, lightweight sharing, checklist conversion, or downstream automation.

### 13.2 Typical formats

- numbered task list
- checklist-style output
- activity-to-step outline
- JSON task payload for system integration

### 13.3 Rules
The step breakdown renderer should:

- preserve order
- retain step IDs
- optionally collapse detail text
- expose actor and tool tags
- support happy path only or full path modes

---

## 14. Evidence rendering specification

Evidence rendering is central to Ledgerium’s trust contract.

### 14.1 Purpose
To let users inspect why a rendered step, branch, or output exists.

### 14.2 Evidence drawer requirements
For any renderable element with evidence support, the UI should be able to show:

- evidence type
- source timestamp or sequence position
- source system or context
- original normalized event snippet or source summary
- relationship to rendered element
- confidence / coverage note
- redaction status

### 14.3 Evidence association types
A rendered element may be associated with evidence as:

- directly observed
- inferred from multiple observed events
- normalized from noisy source data
- manually added by reviewer
- unresolved / weakly supported

### 14.4 Evidence coverage indicator
The renderer should be able to show, at document or section level:

- percentage of steps with direct evidence
- percentage with inferred evidence
- steps lacking adequate evidence
- redacted evidence counts

### 14.5 Export behavior
Evidence may be omitted, summarized, or appended depending on export mode:

- **Shareable mode** — minimal evidence references
- **Review mode** — step-level evidence citations
- **Audit mode** — full appendix or linked evidence bundle

---

## 15. Metrics and process intelligence rendering

The rendering system should support basic process intelligence views without turning the product into a cluttered BI tool.

### 15.1 Supported metric types
Examples include:

- total run duration
- step count
- wait time indicators
- handoff count
- branch frequency
- exception frequency
- rework or loop indicators
- role participation counts
- tool usage counts
- evidence coverage score

### 15.2 Rendering principles for metrics
Metrics should:

- be clearly labeled
- distinguish observed from estimated values
- avoid false precision when source resolution is limited
- link back to the underlying time window or object version

### 15.3 Metrics placement
Metrics may appear in:

- summary header cards
- right-side panels
- appendix tables
- comparison views
- export metadata blocks

---

## 16. Comparison and drift rendering

A key Ledgerium value proposition is helping users compare runs, versions, and variants.

### 16.1 Comparison types
The renderer should support:

- run vs. run
- run vs. canonical definition
- definition version vs. definition version
- happy path vs. exception path

### 16.2 Diff surfaces
Differences may be rendered as:

- added / removed / changed steps
- altered decision logic
- changed role ownership
- changed tool/system usage
- timing shifts
- newly emerged exception paths

### 16.3 Visual diff rules
Diff views should avoid noisy full redraws when possible. Users should be able to identify:

- what changed
- where it changed
- whether the change is structural or presentational
- whether the change is reviewed and approved

### 16.4 Canonical diff summary format
A standard human-readable diff summary should include:

- compared objects and versions
- date of comparison
- counts of additions, removals, and modifications
- major impact notes
- links to detailed diff sections

---

## 17. Export package specification

Exports are the bridge between Ledgerium and the rest of the operating environment.

### 17.1 Export package types
The system should support at least:

- **Markdown documentation package**
- **JSON bundle package**
- **Review packet package**
- **Audit package**
- **Diagram asset package**

### 17.2 Recommended markdown package contents
A markdown documentation package for a `ProcessDefinition` should include:

- `README.md`
- `process_definition.md`
- `sop.md`
- `process_map.json` or diagram payload
- `metadata.json`
- optional `evidence_appendix.md`
- optional `change_log.md`

### 17.3 Recommended JSON bundle contents
A machine-readable package should include:

- source object JSON
- normalized render view model JSON
- graph payload JSON
- export manifest
- schema version information
- content hashes

### 17.4 Export manifest
Every package should include a manifest with:

- package id
- creation timestamp
- source object ids and versions
- renderer version
- schema version
- export mode
- included files
- redaction flags
- integrity hash data

### 17.5 Naming conventions
File and package names should be stable and predictable. Example pattern:

`{process_slug}__v{definition_version}__{export_type}__{YYYYMMDD}`

### 17.6 Redaction-aware export behavior
Exports must respect privacy and security policies. The manifest should state whether:

- evidence was redacted
- sensitive fields were removed
- screenshots or raw payloads were excluded

---

## 18. Audience-specific rendering modes

The same process object may need different render modes depending on audience.

### 18.1 Operator mode
Prioritizes:

- exact steps
- tools
- handoffs
- decision instructions
- exception handling

### 18.2 Manager mode
Prioritizes:

- activities
- roles
- bottlenecks
- exception frequency
- ownership clarity

### 18.3 Executive mode
Prioritizes:

- major phases
- critical decision points
- risk areas
- performance summary
- business impact framing

### 18.4 Auditor / compliance mode
Prioritizes:

- evidence linkage
- approval checkpoints
- data provenance
- control points
- review history

### 18.5 Developer / system mode
Prioritizes:

- JSON fidelity
- stable identifiers
- schema versions
- integration payloads
- diffability

Audience modes must not change the underlying truth. They only change emphasis and level of detail.

---

## 19. Trust and transparency requirements

### 19.1 Rendered outputs must disclose derivation status
At minimum, the system should be able to indicate whether a rendered output is:

- preliminary
- reviewed
- approved
- partially evidence-backed
- exported with redactions

### 19.2 User edits must remain visible
If a user changes a title, step description, ordering, or branch label after generation, the system should preserve edit history and render change provenance where appropriate.

### 19.3 Missing evidence must not be hidden
If a step has weak support, the output should not silently present it as equally trustworthy to a directly observed step.

### 19.4 Version identity must be obvious
Human-readable outputs should clearly show the process definition version, export date, and render mode.

---

## 20. Accessibility and usability requirements

All primary rendered outputs should meet baseline accessibility expectations.

### 20.1 Text outputs
Must support:

- semantic headings
- readable markdown structure
- meaningful link labels
- scannable section organization

### 20.2 Visual maps
Must support:

- non-color-only differentiation
- accessible labels for branches and nodes
- keyboard navigability in the interactive UI when possible
- zoom and detail expansion for dense diagrams

### 20.3 Exports
Should remain useful when copied into docs tools, GitHub, or text-first environments.

---

## 21. Internationalization and localization considerations

The canonical model should remain language-neutral where possible, while rendering should support future localization.

### 21.1 Stable internal identifiers
Step IDs, node IDs, and branch IDs must remain stable even when visible labels are translated.

### 21.2 Separable presentation strings
Human-facing strings should be render-layer concerns rather than embedded irreversibly in graph semantics.

### 21.3 Translation caution
Translated outputs should preserve evidence linkage and should not rewrite meaning beyond the approved source text.

---

## 22. Performance and scalability expectations

The renderer should support small and large process objects.

### 22.1 Small objects
Single-session outputs should render nearly immediately in the UI.

### 22.2 Large objects
Large process definitions with many branches or evidence links should degrade gracefully through:

- collapsed sections
- activity grouping
- lazy-loading evidence panels
- viewport-based map rendering
- appendix segmentation in exports

### 22.3 Deterministic repeatability
Given the same source object version and renderer version, outputs should be reproducible.

---

## 23. Failure modes and safeguards

The rendering layer must fail safely.

### 23.1 Common failure cases

- missing required labels
- invalid graph references
- orphaned branches
- mismatched step ordering
- broken evidence pointers
- unsupported schema version
- circular structure not supported by target output

### 23.2 Safe fallback behavior
When rendering cannot produce a canonical output, the system should:

- fail with explicit diagnostics
- preserve source object integrity
- avoid producing misleading partial output silently
- optionally provide degraded but clearly labeled fallback views

### 23.3 Fallback examples

- render step outline when graph layout fails
- render summary-only mode when evidence appendix is unavailable
- block export when validation errors exceed threshold

---

## 24. Validation and acceptance criteria

A rendered output should not be considered canonical unless it passes required checks.

### 24.1 Minimum validation checks

- source object schema valid
- all rendered steps have stable IDs
- graph start and end present when graph output is requested
- branch references resolve
- evidence links resolve or are explicitly marked unavailable
- version metadata present
- export manifest valid when package export is requested

### 24.2 SOP-specific checks

- title present
- scope and trigger fields present if required by mode
- ordered procedure section not empty
- no duplicate step numbering
- unresolved placeholders absent

### 24.3 Map-specific checks

- no orphan nodes
- no unlabeled branch where label is required
- lane assignment valid when role mode enabled
- node count and edge count within supported thresholds

### 24.4 Human review gates
Certain outputs should support optional or required review before publication, especially in enterprise or compliance contexts.

---

## 25. Suggested APIs and interfaces

The exact implementation may vary, but the system should conceptually support interfaces like:

- `renderProcessMap(input, mode)`
- `renderSOP(input, mode)`
- `renderTaskBreakdown(input, mode)`
- `renderEvidenceBundle(input, mode)`
- `renderComparison(input, mode)`
- `exportPackage(input, exportType, mode)`

Each interface should return:

- output artifact or payload
- render metadata
- validation results
- warnings
- renderer version info

---

## 26. MVP requirements

For MVP, the rendering system must support a practical but constrained set of outputs.

### 26.1 MVP required outputs

- canonical process map view
- canonical SOP markdown export
- ordered step breakdown view
- evidence drawer for rendered steps
- process summary header with key metrics
- JSON export bundle

### 26.2 MVP required trust features

- step-level evidence linkage
- version labeling
- derived vs. observed indicators
- export manifest
- explicit warnings for incomplete evidence

### 26.3 MVP deferred items
Likely post-MVP unless necessary for launch:

- advanced role heatmaps
- multilingual rendering
- rich PDF layout engine
- AI-written executive narratives
- advanced side-by-side visual diffing
- custom branded export templates

---

## 27. Post-MVP expansion opportunities

After MVP, the rendering system can expand into higher-value experiences.

### 27.1 Suggested expansions

- scenario simulation outputs
- process health scorecards
- role-specific onboarding packs
- policy / control mapping overlays
- embedded training mode with rationale callouts
- machine-agent task package generation
- portfolio-level process catalog rendering
- smart redaction and audience-aware export policies

### 27.2 AI augmentation opportunities
Allowed future enhancements include:

- rewrite for clarity while preserving traceability
- terminology standardization suggestions
- optional summaries for executives
- multilingual drafts
- automated change summaries

These must remain optional, clearly labeled, and separable from canonical deterministic outputs.

---

## 28. Example canonical output set for one process definition

For a single approved `ProcessDefinition`, Ledgerium should eventually be able to generate a standard bundle like this:

1. Canonical interactive process map
2. Canonical SOP markdown
3. Condensed task checklist
4. Evidence appendix
5. Metadata and manifest files
6. Graph payload JSON
7. Change log and version history summary

This bundle should be suitable for:

- operational use
- GitHub storage
- internal knowledge bases
- audit support
- future AI context injection

---

## 29. Recommended repository structure

A practical GitHub-oriented structure could look like:

```text
/docs
  /processes
    /{process-slug}
      README.md
      process_definition.md
      sop.md
      evidence_appendix.md
      change_log.md
  /schemas
    render_manifest.schema.json
    graph_payload.schema.json
  /rendering
    rendering_rules.md
    export_modes.md
/artifacts
  /{process-slug}
    metadata.json
    process_map.json
    export_manifest.json
```

This is illustrative, not mandatory, but the canonical output philosophy should support a clean docs-as-code workflow.

---

## 30. What great rendering should feel like

When Ledgerium renders well, a user should feel all of the following at once:

- "I can see the process clearly."
- "I understand where this came from."
- "I can trust what is certain and spot what is uncertain."
- "I can hand this to another person or system and it will still make sense."
- "This is usable, not just impressive."

That is the standard.

Ledgerium should not win by creating the flashiest diagrams. It should win by creating the most trustworthy operational representations of work.

---

## 31. Non-negotiable rules

The following rules are canonical unless explicitly superseded by a later approved version of this document.

1. The renderer must not fabricate process structure unsupported by the source model.
2. Canonical outputs must remain reproducible for a given source version and renderer version.
3. Evidence linkage must be preserved wherever available.
4. Human edits must remain distinguishable from system-derived content.
5. Audience modes may change emphasis, but not underlying truth.
6. Exports must include version and manifest metadata.
7. Missing or weak evidence must be made visible rather than hidden.
8. Markdown and JSON exports are first-class outputs.
9. Visual maps must represent process structure, not raw event noise.
10. Rendering quality gates must block misleading canonical exports.

---

## 32. Open questions to resolve in future iterations

The following items remain important but can be refined in subsequent versions of the canonical docs.

- exact graph layout algorithm choices for dense branching processes
- preferred standard for diagram interchange payloads
- exact markdown frontmatter conventions
- formal render manifest JSON schema
- PDF rendering stack and typography system
- export signing and integrity verification approach
- localization workflow for regulated documentation sets

These are implementation questions, not philosophical gaps.

---

## 33. Final directive

All Ledgerium rendering work should be judged against a simple question:

**Does this output make the observed process more understandable and more actionable without making it less truthful?**

If the answer is no, the rendering is not good enough.

If the answer is yes, and the output remains evidence-linked, deterministic in structure, operationally useful, and exportable, then the rendering system is doing its job.
