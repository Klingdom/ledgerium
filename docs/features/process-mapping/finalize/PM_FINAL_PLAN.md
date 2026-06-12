# PM Final Plan — Production-Ready Process Mapping Environment

**Date:** 2026-06-12
**Author:** product-manager
**Status:** Define-phase artifact — no product code modified
**Upstream artifacts read:**
- `docs/features/process-mapping/visio/VISIO_VISUAL_SPEC.md`
- `docs/features/process-mapping/visio/VISIO_LAYOUT_ROUTING_PLAN.md`
- `docs/features/process-mapping/visio/VISIO_ARCHITECTURE_REVIEW.md`
- `docs/features/process-variation/polish/MAP_DESIGN_SPEC.md`
- `docs/features/process-variation/polish/LAYOUT_PLAN.md`
- `apps/web-app/src/components/workflow-view/` (all files)
- `apps/web-app/src/lib/variantFlowModel.ts`
- `packages/intelligence-engine/src/` (types.ts, index.ts)

---

## 1. Vision + Success Metrics

### 1.1 Vision Statement

Ledgerium's process-mapping environment must be the diagram that a process analyst prints and puts on a wall — not a developer debugging screen. "As good as or better than Visio" is not about feature parity. It means a non-technical process owner opens a workflow, sees a diagram that looks like a professional BPM deliverable, and immediately trusts it because every element on the canvas reflects something they actually observed.

The differentiator over Visio is determinism with provenance. Every shape, edge weight, and metric label is computed from recorded behavior. Nothing is drawn by hand. Nothing is inferred without disclosure. That is the moat: Visio produces whatever you draw; Ledgerium produces what actually happened.

### 1.2 What "Production-Ready" Means

A process-mapping environment is production-ready when all of the following are true:

1. A non-technical stakeholder can interpret any diagram in under 60 seconds without a legend.
2. The diagram prints cleanly on A4 landscape without manual intervention.
3. Every decision shape and edge label can be traced to a specific observed run.
4. Identical input data produces identical pixel-stable output, every time, on every machine.
5. The six views (existing four plus two new) load within acceptable time budgets without flicker.
6. No fabricated conditions, no inferred business logic, no invented labels reach the canvas.

### 1.3 Success Metrics

Measurable outcomes this plan is accountable to. These are acceptance gates for the P2 milestone, not aspirational targets.

**Legibility**
- Metric: User comprehension test — a non-technical process owner correctly identifies the longest path, the branch point, and the most time-consuming step on a real workflow diagram in under 60 seconds.
- Baseline: Not measured today.
- Target: ≥ 80% of testers succeed in ≤ 60 seconds without any verbal explanation.
- Measurement: Moderated usability test, N ≥ 5 participants, during beta.

**Print and export quality**
- Metric: `Ctrl+P` on any mode produces a clean A4 landscape PDF with no interactive chrome, no clipped labels, white background, and a visible title block.
- Baseline: Currently no print CSS exists.
- Target: 100% of the six modes print cleanly across Chrome, Edge, and Firefox. Observable: no controls visible, no dots grid, workflow name present, all edge labels at ≥ 9pt.
- Measurement: Manual print-to-PDF on each mode, inspected against a visual checklist.

**Determinism**
- Metric: Byte-identical node positions and edge bend points for identical input on two independent runs.
- Baseline: Partially satisfied today (variant builder deterministic; flow/swimlane/systems are not).
- Target: 100% byte-identical for all six modes. Covered by the ELK determinism test suite (`elkLayout.test.ts`) and per-builder snapshot tests.
- Measurement: Automated tests in CI — these must pass before any mode is declared shipped.

**Honesty**
- Metric: Zero fabricated decision labels reaching any diamond node across all six modes.
- Baseline: One confirmed honesty violation (`detectDecisionPoints` title-regex path, `VISIO_ARCHITECTURE_REVIEW.md` Finding C-1).
- Target: 0 fabricated conditionals. Every decision diamond carries `decisionProvenance ∈ {observed-divergence, observed-validation}`.
- Measurement: Existing test `"decision labels use observed-count language (never fabricated conditions)"` extended to cover the engine path, enforced in CI.

**Performance**
- Metric: Time from navigation to interactive diagram (first-paint with fallback positions, then ELK settle).
- Target: First paint ≤ 400ms; ELK settle ≤ 1s for workflows with ≤ 50 nodes. For the two new views (Timeline, SIPOC): render ≤ 200ms (they are table/chart surfaces, not layout-engine surfaces).
- Measurement: Chrome DevTools Performance tab, recorded in the acceptance test session.

**View coverage**
- Target: Six named views, all accessible from the mode switcher, all rendering from the same `NormalizedViewModel` data contract without bespoke data fetches.

---

## 2. Two New Views

### 2.1 Selection Process

The four existing views cover:
- **Flow Intelligence**: step-by-step trace of one run's execution path.
- **Swimlane**: cross-functional view organizing steps by the system they occurred in.
- **Process Variants**: multi-run comparison showing standard path and deviations.
- **System Interaction**: system-to-system handoff topology.

Gaps a Visio-class tool must cover: (1) a time-axis view showing where process duration concentrates, (2) a structured high-level summary that a stakeholder can share without explaining the diagram format. Both are familiar idioms from lean/BPM practice and are deterministically computable from already-captured data.

Views evaluated and rejected:
- **BPMN 2.0 Diagram**: requires gateway conditions, message flows, and pool contracts that we do not observe. Rendering honest BPMN from observed data produces a structurally incomplete BPMN diagram (no conditions on gateways) that experts will find misleading. Deferred to Future Roadmap.
- **Sankey (variant frequency flows)**: substantial value, but duplicates the core insight of the Variants view. The variant story map already encodes frequency through edge weight. A Sankey would add visual novelty without adding analytical content. Deferred.
- **Gantt**: requires a planned schedule to compare against observed actuals. We have observed timing data but no planned schedule. A Gantt of actuals only is a timeline bar chart — covered by the Timeline view below, which is more honest and more useful. Rejected as a named view.
- **Value Stream Map (VSM)**: requires waste categorization (VA/NVA/NNVA) that we do not observe. Cannot be produced honestly from our data. Rejected.

### 2.2 Selected View 1 — Process Timeline

**Why it belongs here**

Every BPM and process-mining tool (Celonis, ABBYY Timecipher, SAP Signavio) has a time-distribution view. It answers the question a process owner always asks first: "Where does the time go?" No other existing view answers this. The Flow Intelligence view shows sequence; the Variants view shows path frequency. Neither shows timing concentration at a glance.

The Process Timeline is the time-axis equivalent of the swimlane view. It shows each step as a horizontal bar whose length is proportional to its mean observed duration, positioned sequentially on a shared time axis. It is instantly legible to anyone who has seen a project Gantt chart, which is every business user.

**Data it consumes**

All required data is already computed by the intelligence engine. No new captures needed.

From `TimestudyResult` (`analyzeTimestudy`, exported from `@ledgerium/intelligence-engine`):
- `stepPositionTimestudies[i].meanDurationMs` — bar length
- `stepPositionTimestudies[i].stdDevMs` — error bar / variance band
- `stepPositionTimestudies[i].category` — bar color (uses existing `CATEGORY_STYLES`)
- `stepPositionTimestudies[i].runCount` — sample size label
- `totalDuration.meanMs` — total process duration axis anchor

From `NormalizedViewModel.nodes`:
- `label` (step title), `ordinal` (bar order), `system` (sub-row grouping option)

From `BottleneckReport` (`detectBottlenecks`):
- `bottleneckSteps[i].position` — used to highlight bottleneck bars visually

**What it shows**

A horizontal bar chart rendered as a process timeline, not a generic chart. Each step is one bar:
- X-axis: cumulative time (milliseconds, labeled in human units — "0s", "30s", "2m")
- Y-axis: step ordinal order (step 1 at top, step N at bottom) — sequential reading matches process flow direction
- Bar length: `meanDurationMs` for that step position
- Bar color: category accent color from `CATEGORY_STYLES` — same color system as all other views
- Variance band: gray band extending ±1 stdDev around the bar where `stdDevMs` is available and `runCount ≥ 3`
- Bottleneck marker: a red flag icon on bars identified by `BottleneckReport`
- Sample size: `"N runs"` label on each bar when `runCount < totalRuns` (sparse-data transparency)

The diagram carries a `MapTitleBar` (same component as all other views) and the same print CSS. It is a read-only, deterministic visualization — not an interactive chart with filters.

**When it shows "insufficient data"**

When `runCount === 1` or `timestudy.stepPositionTimestudies` is empty, the view renders a single-run notice: "Timeline requires multiple runs to show meaningful timing distributions. This workflow has 1 recorded run." This is the same single-trace provenance pattern established in `VISIO_ARCHITECTURE_REVIEW.md` §2.3.

**Acceptance criteria**

- [ ] Each step is rendered as one horizontal bar whose pixel width is proportional to `meanDurationMs`.
- [ ] Bars are ordered by step ordinal (step 1 at top).
- [ ] Bar color matches the `CATEGORY_STYLES` accent color for the step's `category` field — same palette as Flow Intelligence.
- [ ] A variance band (±1 stdDev) is rendered when `stdDevMs` is non-null and `runCount ≥ 3`. It is not rendered when data is insufficient — no fabricated uncertainty bands.
- [ ] Bottleneck bars (from `BottleneckReport`) are visually distinguished with a colored marker. The marker label says "Bottleneck — N× mean" where N is the `bottleneckDurationMultiplier` evidence.
- [ ] The total duration axis reads in human time units, not raw milliseconds.
- [ ] When `runCount < 2`, the view renders the single-run notice, not an empty canvas.
- [ ] The view prints cleanly via `Ctrl+P`: title block visible, bars rendered, no interactive chrome.
- [ ] Rendering is deterministic: identical `TimestudyResult` input produces pixel-identical output.
- [ ] No bars are rendered for steps with `meanDurationMs === null` (sparse data). The step label is shown with a "No timing data" indicator instead.

### 2.3 Selected View 2 — SIPOC Summary

**Why it belongs here**

SIPOC (Suppliers, Inputs, Process, Outputs, Customers) is the standard BPM kick-off artifact. Every process improvement initiative starts with it. It is what a business analyst creates in Visio before building any other diagram. It is familiar to every operations, quality, and process professional globally.

The critical insight: from our observed data we can deterministically populate the Process and Systems columns of a SIPOC without any user input. The systems observed (`uniqueSystems` from `ProcessMetrics`, `systems` from each `ViewNode`) are the Suppliers and Customers. The steps in the process are the Process column. The data-entry and send-action steps imply the Inputs and Outputs columns with enough honesty constraint that we can surface them as "observed data interactions" rather than inferred business semantics.

This is the highest-value sharing and reporting surface in the product. A SIPOC printed from Ledgerium, stamped "generated from 12 observed runs," is a process-mining deliverable that a consultant would previously have spent hours producing manually.

**Data it consumes**

From `NormalizedViewModel`:
- `nodes` where `nodeType === 'task'` — the Process column (step titles, ordinals)
- `nodes[i].system` — unique systems observed, forming the Suppliers and Customers columns
- `nodes[i].category === 'data_entry'` — candidate Inputs (steps where data was entered)
- `nodes[i].category === 'send_action'` — candidate Outputs (steps where data was submitted/sent)
- `nodes[i].systems` — all systems per step (multi-system steps reveal integration boundaries)
- `nodes[i].durationLabel` — time metadata for each process step

From `ProcessMetrics` (via `PortfolioIntelligence`):
- `uniqueSystems` — full system inventory
- `runCount` — sample size for provenance label
- `meanDurationMs` — total process duration for the title block

**What it shows**

A five-column table, not a diagram. The format is intentionally document-like rather than canvas-like. It renders as a structured grid with fixed column widths:

| Column | What it contains | Source |
|--------|-----------------|--------|
| Suppliers | Systems that provide inputs to the process (first-observed systems, systems sending data) | `nodes` where system first appears as a send_action or navigation entry point |
| Inputs | Observed data-entry interactions — what was typed or submitted entering the process | `nodes` where `category === 'data_entry'`, label = step title |
| Process | Ordered list of observed steps with ordinal numbers and durations | All task nodes, ordered by ordinal |
| Outputs | Observed send/submit interactions — what left the process as outputs | `nodes` where `category === 'send_action'` |
| Customers | Systems that received process outputs (last-observed systems) | `nodes` where system appears as the final receiver of a send_action or handoff |

**Honesty constraint on Suppliers and Customers**

The SIPOC Suppliers and Customers cells contain only observed system names from `node.system` and `ProcessMetrics.uniqueSystems`. They are labeled "Observed systems" — not "Suppliers" and "Customers" in the business-role sense, which we cannot determine from behavioral observation alone. The column headers read:

- Column 1: "Systems (entry)" — systems first encountered in the process
- Column 2: "Data inputs" — observed data-entry interactions  
- Column 3: "Process steps" — observed steps in order
- Column 4: "Data outputs" — observed send/submit interactions
- Column 5: "Systems (exit)" — systems last encountered in the process

The footer carries: "Generated from N observed runs of [workflow name] · Ledgerium AI · [date]"

This satisfies both the SIPOC idiom (familiar enough to be useful) and the honesty invariant (never claims we know the business role of a system, only where it appeared).

**When it shows "insufficient data"**

When `runCount < 2`, the SIPOC renders normally but carries a banner: "Based on 1 run. Add more recordings to validate this summary." The Process column always renders from any single run. The Inputs/Outputs columns render if the single run has data-entry or send-action steps.

**Acceptance criteria**

- [ ] Five columns render as a clean table with fixed-width columns, printed-document typography (12px Inter, no decorative UI chrome).
- [ ] The Process column lists every task node in ordinal order with step title, category color badge, and duration label.
- [ ] The Data Inputs column lists step titles of all `category === 'data_entry'` steps — and only those. No inferred inputs.
- [ ] The Data Outputs column lists step titles of all `category === 'send_action'` steps — and only those. No inferred outputs.
- [ ] Systems (entry) and Systems (exit) columns contain system names from `node.system` — labeled as "observed systems," never as business-role Suppliers/Customers.
- [ ] Footer shows: run count, workflow name, generation date, "Ledgerium AI" wordmark.
- [ ] The view prints cleanly via `Ctrl+P` as a document-format page (portrait or landscape per content width).
- [ ] When `runCount < 2`, a provenance banner appears. The table still renders.
- [ ] No row in any column contains text that was not observed in the recorded data.
- [ ] Rendering is deterministic: same `NormalizedViewModel` produces identical table content.

### 2.4 Runners-Up with Rationale

**Sankey (variant frequency flows)**
Strong case. Would visualize variant path volume as flow widths — immediately grasps "how much traffic follows each path." Rejected this cycle because it duplicates the core insight of the Variants view. The variant story map already encodes frequency through edge weight and run-count labels. A Sankey adds visual form without new analytical content for the current data model. Revisit when variant data includes entry/exit conditions or when the variant count regularly exceeds 5.

**BPMN 2.0 Diagram**
High recognition value. Rejected because honest BPMN requires gateway condition labels (the "Yes"/"No" or condition text on outgoing flows from a gateway). We cannot observe those conditions — we only observe that runs diverged. A BPMN diagram with unlabeled gateway exits is non-compliant BPMN and would confuse trained practitioners more than help them. Deferred to Future Roadmap, specifically contingent on either (a) the user providing gateway conditions as metadata, or (b) AI-recommended condition labels that are clearly flagged as suggested, not observed.

**Value Stream Map**
Familiar in lean manufacturing contexts. Rejected because it requires waste categorization (value-added, non-value-added, necessary non-value-added) that we cannot derive from behavioral observation. The VSM Push/Pull and inventory triangle semantics have no observable equivalent in digital workflow recordings. Would require user-provided categorization to be honest. Deferred to Future Roadmap as a user-annotated view.

---

## 3. Unified Mode Set

### 3.1 The Six Modes

| # | Mode Key | Display Label | Icon | What it answers |
|---|----------|---------------|------|----------------|
| 1 | `flow` | Flow Intelligence | Workflow | What steps did this process execute, in what order, and where did it branch? |
| 2 | `swimlane` | System Swimlane | Columns | Which system handled each step, and where did work cross system boundaries? |
| 3 | `variants` | Process Variants | GitBranch | How do different execution paths compare, and how common is each variant? |
| 4 | `systems` | System Topology | Monitor | Which systems interacted, and how does information flow between them? |
| 5 | `timeline` | Process Timeline | Clock | Where does time concentrate, and which steps are bottlenecks? |
| 6 | `sipoc` | SIPOC Summary | Table | What is the high-level scope of this process: systems, inputs, steps, outputs? |

### 3.2 Mode Switcher

The `WorkflowModeSwitcher` component needs two additions to the `MODES` array and `MODE_ICONS` map:

```
timeline → Clock (lucide-react)
sipoc    → Table (lucide-react)
```

`VIEW_MODE_LABELS` in `types.ts` receives two new entries:

```
timeline: { label: 'Process Timeline', description: 'Duration distribution and bottleneck identification across observed runs' }
sipoc:    { label: 'SIPOC Summary',    description: 'Suppliers, inputs, process steps, outputs, and systems at a glance' }
```

The switcher layout does not need structural change. Six buttons fit within the existing compact pill design. If screen width becomes a constraint, the two new modes sit at positions 5 and 6 — they are secondary modes appropriate for truncation to icon-only at narrow widths.

### 3.3 Controls, Legend, and Title Block — Unified Rules

**MapTitleBar** (specified in `VISIO_VISUAL_SPEC.md` §4.4): rendered above every mode's canvas. The `mode` prop accepts all six mode keys. `MODE_LABELS` in `MapTitleBar.tsx` must be extended with entries for `timeline` and `sipoc`.

**Legend**: Modes 1–4 use the always-on `WorkflowLegend` with the shape/connection vocabulary specified in `VISIO_VISUAL_SPEC.md` §4.6. The Timeline view has an inline legend bar (category color swatches, variance band explanation). The SIPOC view has a footer legend explaining the column labeling convention. No separate `WorkflowLegend` instance for modes 5 and 6.

**Controls**: Zoom controls (`<Controls showInteractive={false} position="bottom-right" />`) apply to modes 1–4 (canvas-based). Modes 5 (Timeline) and 6 (SIPOC) are document/table views — they do not need zoom controls. They do need scroll for tall content.

**Export / Print**: All six modes must produce a clean `Ctrl+P` output. The `@media print` CSS block (specified in `VISIO_VISUAL_SPEC.md` §4.7) applies to all canvas-based modes. Modes 5 and 6 use standard document print behavior — no special print CSS is needed beyond hiding interactive chrome and ensuring the title block is present.

**Single-trace provenance notice**: `VISIO_ARCHITECTURE_REVIEW.md` §2.3 specifies that when `isMultiRun === false`, the render model carries a `provenanceNotice`. This notice applies to modes 1, 3, 5, and 6 (modes that are most informative with multiple runs). The notice renders as a non-blocking amber banner above the diagram: "Single recording — add more runs to unlock variant comparison, timing distributions, and statistical confidence."

---

## 4. Phasing

### P0 — Finalize Visio Core

**Goal**: All four existing modes read as professional process maps at first glance. The correctness and honesty liabilities identified in `VISIO_ARCHITECTURE_REVIEW.md` are resolved. The shared deterministic layout engine is in place.

**What ships in P0**

Based on the three companion specs, P0 comprises:

1. **Honesty hardening** (`viewModel.ts`, `processMapBuilder.ts`, `contentEnricher.ts`): Add `decisionProvenance` field to `ViewNode`. Classify `detectDecisionPoints` title-regex path as `'inferred'`; block inferred nodes from rendering as diamonds. Add `runCount`/`isMultiRun` to `NormalizedViewModel`. Add `provenanceNotice` for single-run flow maps. Fixes `VISIO_ARCHITECTURE_REVIEW.md` Findings C-1, C-2, C-3.

2. **ShapeResolver** (new `render/shapeResolver.ts`): Pure function mapping `ViewNodeType + decisionProvenance → VisioShape + fixed box size + ports`. Replaces inline ternaries in all four adapters. Determinism test: truth-table totality.

3. **Shared `layoutFallback`** (new `render/layoutEngine.ts`): Lift the variant builder's Plan-B layered arithmetic into a shared `LayoutProfile`-parameterized function. Flow, swimlane, and systems modes adopt it. All four modes now have collision-free layered positions as their synchronous first-paint layout. Fixes `VISIO_ARCHITECTURE_REVIEW.md` Finding §2.2 render-divergence gap.

4. **Visual spec tokens** (`VISIO_VISUAL_SPEC.md` P0 punch-list V-P0-1 through V-P0-8): orthogonal connectors, process-box borderRadius 3, closed arrowheads, line grid. These are the changes that make a diagram read as "Visio" at first glance.

5. **Visual spec P1 tokens** (`VISIO_VISUAL_SPEC.md` P1 punch-list V-P1-1 through V-P1-15): swimlane header overlay, solid lane separators, MapTitleBar, task node left-rail, CATEGORY_STYLES update.

**Estimated iterations**: 2 to 3 bounded Mode 1 or Mode 2 directed iterations. The architecture work (ShapeResolver + layoutFallback) and the honesty hardening are a natural P0-A iteration. The visual token application is a natural P0-B iteration.

**P0 acceptance gate**: All four existing modes pass their existing test suites with zero regressions. The honesty tests (fabricated-conditional check extended to engine path) pass. The print CSS is in place. Screenshots of all four modes show orthogonal connectors, sharp process-box corners, closed arrowheads, and a visible MapTitleBar.

### P1 — ELK Integration + Two New Views

**Goal**: ELK layered layout replaces the fallback as the authoritative client-side layout for modes 1–4. The two new views (Timeline, SIPOC) are implemented.

**What ships in P1**

1. **`layoutElk`** (completing `render/layoutEngine.ts`): ELK `layered` with the frozen option set from `VISIO_LAYOUT_ROUTING_PLAN.md`. Client-only via `useElkLayout` hook. Fallback positions used for SSR and first paint. ELK settle happens in `useEffect` after mount. Determinism tests: byte-identical positions and edge bend points across two independent runs.

2. **Orthogonal edge router**: `OrthogonalEdge` custom React Flow edge type consuming `elkPoints`. Label positioned on the central straight segment. Fallback to `getSmoothStepPath` when `elkPoints` absent.

3. **Flow canvas ELK-aware** (`WorkflowCanvas.tsx`): projects `buildFlowData` output to `LayoutGraph` (DOWN direction), calls `useElkLayout`, feeds ELK positions and edge bend points. `phaseGroups` bounds recomputed from ELK positions.

4. **Swimlane canvas ELK-aware** (`WorkflowSwimlaneCanvas.tsx`): `LayoutGraph` with `direction: RIGHT`, lane-pin override (fixedY per lane row from `swimlaneAdapter`), `useElkLayout`.

5. **Variant canvas ELK-aware**: variant renderer projects `buildVariantFlowModel` output to `LayoutGraph`, same flow canvas becomes ELK-aware.

6. **Process Timeline view**: new component `WorkflowTimelineView.tsx`. Consumes `TimestudyResult` from `PortfolioIntelligence` (already computed, no new API call). Renders horizontal bar chart with category colors, variance bands, bottleneck markers. Empty/single-run state. Added to `WorkflowModeSwitcher` and `VIEW_MODE_LABELS`.

7. **SIPOC Summary view**: new component `WorkflowSIPOCView.tsx`. Consumes `NormalizedViewModel` only. Renders five-column document table. Footer with provenance. Added to `WorkflowModeSwitcher` and `VIEW_MODE_LABELS`.

**Estimated iterations**: 3 to 4 bounded iterations. ELK integration (modes 1+4 canvas-aware) is one iteration. Variant canvas ELK-aware is a second. Timeline view is a third. SIPOC view is a fourth. These can be sequenced or paired depending on the coordinator's priority selection at the time.

**P1 acceptance gate**: ELK determinism tests pass. All six modes render. Timeline shows correct bar lengths for a known test workflow. SIPOC shows only observed system names and step titles — the honesty check for this view is identical in form to the decision-label check: no fabricated content in any cell.

### P2 — Print, Export, Performance, and Polish

**Goal**: Production-ready for external sharing. Print output is clean enough to leave on a client's desk.

**What ships in P2**

1. **Print CSS completion** (`VISIO_VISUAL_SPEC.md` P2 punch-list V-P2-1 through V-P2-14): `@media print` block, `print-color-adjust`, page orientation A4 landscape, all interactive chrome hidden.

2. **PNG / PDF export button**: A toolbar button that triggers `window.print()` pointing at a print-only layout, or a canvas-to-PNG capture. The exact mechanism is an engineering decision; the PM requirement is that a single user action produces a shareable image of the current mode at production quality.

3. **Loading and empty states**: Each of the six modes has a consistent loading skeleton (not a spinner in the middle of the canvas — a skeleton that matches the structural layout of the mode). Each mode has an empty state with a contextually appropriate message (e.g., Timeline: "Add more runs to see timing distributions").

4. **Performance guard**: ELK layout must complete within 1 second for workflows with ≤ 50 nodes. For workflows exceeding 50 nodes, a user-facing "Simplifying diagram" notice appears while ELK runs, and the fallback layout renders immediately without a blank canvas.

5. **`VisioCanvas` unification** (`VISIO_ARCHITECTURE_REVIEW.md` §4 P2-4): collapse the four per-mode adapters into mode profiles once `VisioCanvas` reaches parity. Timing is engineering's call; the PM requirement is that this consolidation happens before the feature is declared complete, to prevent mode-divergence regression.

6. **SIPOC PDF-specific layout**: for wide-content SIPOCs (processes with many steps), a two-page print layout that splits the Process column across pages cleanly.

**Estimated iterations**: 2 bounded iterations. Print/export is one. Loading/empty states and performance guard is a second.

**P2 acceptance gate**: Print-to-PDF on all six modes passes the visual checklist. The export button produces a clean image. ELK performance is within the 1-second budget on a test workflow of 50 nodes. All empty states and loading states are present.

### Iteration Map

| Phase | Work | Suggested agent | Approx iterations |
|-------|------|----------------|-------------------|
| P0-A | Honesty hardening + ShapeResolver + layoutFallback | `system-architect` PRIMARY | 1 |
| P0-B | Visual spec tokens (V-P0, V-P1 punch-lists) + MapTitleBar | `frontend-engineer` PRIMARY + `growth-strategist` D-4 clause 1 | 1 |
| P1-A | ELK integration — flow + systems + variant modes | `system-architect` PRIMARY | 1 |
| P1-B | ELK swimlane integration | `backend-engineer` or `frontend-engineer` | 1 |
| P1-C | Process Timeline view | `frontend-engineer` PRIMARY | 1 |
| P1-D | SIPOC Summary view | `frontend-engineer` PRIMARY | 1 |
| P2-A | Print / export | `frontend-engineer` PRIMARY | 1 |
| P2-B | Loading / empty states + performance guard + VisioCanvas unification | `qa-engineer` PRIMARY + `frontend-engineer` | 1 |

**Total**: 8 bounded iterations. This is a Mode 5 N=8 sequence if run as a directed batch, which triggers `CLAUDE.md` MR-005 D-7 pre-check (N ≥ 6). Recommend running as a Mode 1 series with coordinator selection, not a Mode 5 batch, to preserve area-saturation and burn-down cadence flexibility.

---

## 5. Future Roadmap (Not Now)

**This section is explicitly deferred. No items below enter the live backlog until a PRD explicitly references them as hard blockers.**

### 5.1 User Editing of Process Maps

**User stories**

As a process analyst, I want to:
- Reorder steps on a flow map to reflect a proposed improvement over the observed sequence.
- Annotate a decision diamond with the business condition it represents ("Application > $50k routes to manager approval").
- Hide specific steps from a shared view without deleting the underlying observation.
- Draw a new connection between systems to show a proposed integration.

**The hard problems**

1. **Determinism vs user edits.** The current system guarantees that identical input produces identical output. A user edit breaks this: the diagram now reflects the user's intent, not the observed data. The system must maintain two distinct models — the observed model (immutable, the ground truth) and the presentation model (user-editable, derived from observed). Writes to the presentation model must never corrupt the observed model.

2. **Provenance and honesty when a user overrides observed data.** If a user adds a gateway condition label to a decision diamond, that label is not observed. The system must visually distinguish user-authored content from observed content at all times. A user-edited diagram exported to PDF must carry a disclosure: "Some elements reflect proposed changes, not observed behavior." The dishonesty risk is exactly the same as the title-regex decision label problem (Finding C-1) — the difference is that user edits are intentional and disclosed vs. silently fabricated.

3. **Conflict resolution.** The observed model may update (new runs recorded) while a user has pending edits. The system must reconcile: does the user's annotation still make sense? Does the reordering the user specified conflict with the new observed sequence? This requires a diff algorithm between the observed model and the edited presentation model, with explicit conflict markers.

4. **Multi-user edits.** Two analysts editing the same process map simultaneously. This is a collaborative editing problem with the additional constraint that both editors must see the observed-vs-edited distinction clearly.

**Architectural hooks the P0–P2 work should leave in place**

The P0 honesty hardening adds `decisionProvenance` to `ViewNode`. This field is the hook: a user-authored annotation would carry `decisionProvenance: 'user-authored'` and a distinct visual treatment (dashed border, annotation color, tooltip showing "Added by [user] on [date]"). The P0 work establishes the provenance type system that makes user-authored content distinguishable from observed content.

The `NormalizedViewModel` design principle ("future AI overlays and compare mode add fields, not restructure") is the right contract extension point. User edits are just another overlay on the observed model — the overlay carries a `PresentationOverlay` type that the renderer applies on top of the immutable `NormalizedViewModel`. P0–P2 never modifies `NormalizedViewModel` in ways that would make overlays impossible.

The `MapTitleBar` should reserve a `hasUserEdits: boolean` prop slot (default false, unused now) so the editorial disclosure notice can be added without restructuring the title block.

### 5.2 User-Provided Templates

**User stories**

As a process analyst, I want to:
- Upload a Visio VSDX file containing my company's standard process template and have Ledgerium use my shape library and color conventions.
- Provide a BPMN 2.0 XML file representing the intended process and have Ledgerium overlay observed behavior on top of the modeled process.
- Export a Ledgerium diagram in VSDX or BPMN format for use in other tools.

**The hard problems**

1. **Template format parsing.** VSDX is a ZIP archive containing XML with Visio's proprietary schema. BPMN 2.0 XML is standardized but complex. Parsing either reliably requires substantial engineering investment and creates a new surface for malformed-input security issues.

2. **Shape library reconciliation.** A user's Visio template may define custom shapes that have no equivalent in our `VisioShape` type system. We would need a shape-mapping interface where the user associates their custom shape with one of our semantic types (`process`, `decision`, `terminator`, etc.).

3. **Modeled process vs observed process.** The most valuable use case (overlay observed behavior on a BPMN model) requires aligning the modeled steps against the observed steps. Step titles in a BPMN model are designed to be stable identifiers; observed step titles come from whatever was on screen. The alignment algorithm is non-trivial and has a high false-match rate without NLP assistance.

4. **Honesty in reverse.** If a user's BPMN model contains gateways with conditions, and we map observed branches onto those gateways, we must not present the model's conditions as observed conditions. The distinction between "model says this should be the condition" and "we observed this branch" must be maintained visually and in export metadata.

**Architectural hooks the P0–P2 work should leave in place**

The `decisionProvenance` field (P0) handles the third case: a user-model gateway condition would carry `decisionProvenance: 'model-provided'` — a new type that visually distinguishes it from `'observed-divergence'` and `'user-authored'`. The P0 provenance type system should be designed with extensibility in mind: `'observed-divergence' | 'observed-validation' | 'inferred' | 'user-authored' | 'model-provided'` as the planned union, even if only the first three are used today.

The `ShapeResolver` (P0) should be designed as a registry pattern — `resolveShape(node, mode, shapeOverrides?)` — where `shapeOverrides` is an optional map from `ViewNodeType` to `VisioShape`. This is the hook for template-provided custom shapes. P0 ships with `shapeOverrides = undefined` (always uses the default resolution); template support means providing a populated override map.

---

## 6. Open Decisions for CEO

The following decisions are required before engineering begins on specific iterations. They are listed in order of blocking risk.

**Decision 1 (blocks P0-A): Inferred validation decisions — keep or suppress?**

`VISIO_ARCHITECTURE_REVIEW.md` §6 Q1 asks: should `observed-validation` decisions (submit → error in a single run, `VISIO_ARCHITECTURE_REVIEW.md` Finding C-1 paths (i) and (ii)) render as diamonds, or should they also be demoted to task nodes until multi-run evidence is available?

PM recommendation: keep as diamonds but with a distinct visual treatment (dashed border, amber fill rather than solid amber, label reads "Validation gate — error observed in this run" not a fabricated condition). This preserves the diagnostic value of single-run validation signals while distinguishing them from multi-run observed divergence. The alternative (demote to tasks) loses a real signal.

Blocking: P0-A cannot finalize `decisionProvenance` handling without this decision.

**Decision 2 (blocks P0-B): Flow direction for Flow Intelligence mode — DOWN or RIGHT?**

`VISIO_ARCHITECTURE_REVIEW.md` §6 Q2 asks: should the Flow Intelligence mode use ELK `direction=DOWN` (top-to-bottom, canonical Visio process reading) or `direction=RIGHT` (left-to-right, matching the other three modes)?

PM recommendation: RIGHT for all modes, one reading direction, one mental model. Users switching between modes should not need to reorient. The swimlane and variant views already use left-to-right. Consistency reduces cognitive load.

Blocking: `VISIO_LAYOUT_ROUTING_PLAN.md` recommends DOWN for flow/variant and RIGHT for swimlane. Engineering needs a final answer before implementing `LayoutProfile` in P0-A.

**Decision 3 (blocks P1-C): Timeline view data availability gate**

The Process Timeline requires `TimestudyResult` from `PortfolioIntelligence`. The intelligence engine computes this, but it is not confirmed whether the web app's API layer currently surfaces `TimestudyResult` to the workflow view. A data-availability audit is needed before P1-C begins.

PM requirement: if `TimestudyResult` is not available in the current API response, P1-C must be preceded by a backend iteration to add it. This is not a product decision — it is a dependency clarification. The backend engineer should audit before P1-C is scheduled.

Not blocking P0 or P1-A/B. Blocking P1-C.

**Decision 4 (does not block P0, but determines P1-C/D scope): SIPOC and Timeline — do they need their own route/API call, or do they consume data already in the page?**

Both new views are designed to consume data already available in the `NormalizedViewModel` and `PortfolioIntelligence` objects that the existing workflow page fetches. If the existing page API call returns `PortfolioIntelligence` (which contains `TimestudyResult` and `BottleneckReport`), no new route is needed. If not, both views require either a new API call or a new field in the existing response.

PM requirement: zero new round-trips for these views at page-load time. They should use data the page already has. If the existing API call does not return `PortfolioIntelligence`, the correct fix is to add it to the existing response — not to add per-view API calls that would cause staggered loading.

**Decision 5 (does not block now, gates P2): PNG/PDF export mechanism**

Two options:
- (A) `window.print()` pointing at a print-only layout with `@media print` CSS. Zero new dependencies, works in all browsers, produces PDF via browser's native print-to-PDF. Limitation: user must navigate the browser print dialog.
- (B) `html2canvas` or `dom-to-image` library capturing the canvas as PNG. No print dialog. More controllable output. Adds a new dependency (~300KB).

PM preference: Option A for P2, with a clear "Export as PDF" button that triggers `window.print()` and shows a tooltip "Use your browser's 'Save as PDF' option." Option B is a P3 enhancement if user research shows the print dialog is a significant friction point.

**Decision 6 (informs iteration scheduling): Should P0 ship as a single iteration or two?**

P0-A (honesty/architecture) and P0-B (visual tokens) are specced as separate iterations above. P0-A is `system-architect` work touching the model and adapter layers. P0-B is `frontend-engineer` work touching visual components. They have low coupling.

However, D-4 clause 1 (≥3 user-visible copy strings → `growth-strategist` adjacent) will fire on P0-B given the volume of category labels, edge labels, and MapTitleBar copy that touches user-visible surfaces. This is anticipated and the clause is designed for exactly this kind of copy pass.

CEO should confirm whether P0-A and P0-B should be scheduled as two separate iterations (cleaner separation of concerns, two numerator credits) or whether they can be bundled if engineering assessment finds the coupling is tighter than anticipated.

---

## Appendix A: Consolidated Punch-List Reference

This appendix identifies which companion spec owns each area and where engineering should go for the implementation details. The PM plan does not duplicate the detailed specs.

| Area | Owner document | Key IDs |
|------|---------------|---------|
| Shape vocabulary (borderRadius, diamond, pill) | `VISIO_VISUAL_SPEC.md` §1 | V-P0-2, V-P0-5, V-P1-6 |
| Orthogonal connectors (borderRadius: 0, ELK bend points) | `VISIO_VISUAL_SPEC.md` §2 + `VISIO_LAYOUT_ROUTING_PLAN.md` §2 | V-P0-1, V-P0-3 |
| Arrowheads (SVG defs, marker selection) | `VISIO_VISUAL_SPEC.md` §2.2 | V-P0-3, V-P0-4 |
| Swimlane header overlay | `VISIO_VISUAL_SPEC.md` §3.2 | V-P1-1 |
| ELK frozen option set | `VISIO_LAYOUT_ROUTING_PLAN.md` §1.2 | P0-1, P1-2 |
| Shared layout engine contract | `VISIO_ARCHITECTURE_REVIEW.md` §2.5 | P0-4, P1-1 |
| ShapeResolver contract | `VISIO_ARCHITECTURE_REVIEW.md` §2.4 | P0-3 |
| Honesty / decisionProvenance | `VISIO_ARCHITECTURE_REVIEW.md` §1.2, §2.3 | P0-1, P0-2 |
| MapTitleBar component | `VISIO_VISUAL_SPEC.md` §4.4 | V-P1-5 |
| Print CSS | `VISIO_VISUAL_SPEC.md` §4.7 | V-P2-1 |
| CATEGORY_STYLES / type scale | `VISIO_VISUAL_SPEC.md` §5 | V-P1-10 |
| ELK determinism tests | `VISIO_LAYOUT_ROUTING_PLAN.md` §5 | — |

## Appendix B: What Is Explicitly Out of Scope for P0–P2

- BPMN import or export
- Dark theme / theming
- Node drag or manual repositioning by users
- Real-time collaboration
- Any fabricated gateway condition labels (honesty invariant, non-negotiable)
- New data captures (P0–P2 consumes only what is already in the NormalizedViewModel and PortfolioIntelligence)
- AI-generated process recommendations (separate AI Vision Build program)
