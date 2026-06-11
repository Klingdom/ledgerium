# PM Findings: Multi-Run Process Map — Variant and Decision-Point Visualization

**Date:** 2026-06-10
**Author:** product-manager agent
**Scope:** Define-phase review of the variant + decision-point map capability. Read-only on product code.
**Artifacts read:**
- `apps/web-app/src/lib/process-graph/types/` (entities.ts, closed-unions.ts)
- `apps/web-app/src/lib/process-graph/catalog/` (decision-types, variant-labels, condition-types, edge-types, node-types)
- `apps/web-app/src/components/workflow-view/` (WorkflowVariantsMap, WorkflowDecisionNode, variantAdapter, viewModel, WorkflowModeSwitcher, WorkflowCanvas)
- `apps/web-app/src/components/ProcessGroupsExplorer.tsx`
- `apps/web-app/src/components/detail/WorkflowReportPage.tsx` (sections: rpt-variance, diverge→reconverge)
- `packages/intelligence-engine/src/divergenceAnalyzer.ts`
- `packages/intelligence-engine/src/clustering/clusterSignatures.ts`, `traceSimilarity.ts`
- `docs/features/process-variation/PRD_PROCESS_VARIATION.md`
- `docs/features/process-variation/PLAN_OVERVIEW.md`

---

## 1. Core Jobs-to-Be-Done

The multi-run map must answer five questions. Every screen, every node, and every data field should map back to at least one of these.

### JTBD-1: Which path is the standard?

"When I look at all the recorded runs of this process, which sequence of steps do most people follow — and how confident are we that it is actually the standard?"

Evidence required: variant frequency ranked against total run count; the `dominant_path` / `standard_path` VariantLabel carried on a `Variant` entity; the `conformingFrequency` from `DivergenceAnalysis`. The answer must be suppressed (not zero-filled) when `runCount < 2` — the Ledgerium audit-honesty IFF invariant applies here as much as to confidence scores.

### JTBD-2: Where do runs diverge, and where do they rejoin?

"Show me the exact point where some runs branch away from the standard, what they do instead, and where they come back."

Evidence required: `DivergenceBranch.divergeAfterIndex`, `reconvergeAtIndex`, `altSteps`, `skippedBackbone`, `evidenceRunIds`, `dfgConfirmedSplit`, `dfgConfirmedJoin` — already produced by `analyzeDivergence()` in `divergenceAnalyzer.ts`. The diagram is the differentiating surface the CEO named. It must show the common spine plus the branches; not just a list of variants.

### JTBD-3: What decision drove each branch?

"Was this a user clicking a different button, a system returning a different state, an approval going two ways — what actually caused the fork?"

Evidence required: `DecisionPoint.decisionType` (9-member closed union: user_choice, business_rule, system_state, data_condition, approval_decision, validation_result, exception_handling, human_judgment, unknown_inferred) + attached `Condition` objects with `conditionType` and `description`. This is the Path E data model. It is defined and compiled but not yet rendered in the workflow-view layer. The `WorkflowDecisionNode` component exists but only shows the generic amber diamond — it does not render the DecisionType, condition list, or the outgoing branch frequencies.

### JTBD-4: What is the evidence for every claim?

"I want to be able to click any statistic — this branch is taken 34% of the time — and see which specific recordings produced that number."

Evidence required: `EvidencePointer[]` on every node, edge, decision, condition, and variant; `evidenceRunIds` on every `DivergenceBranch`. The data model enforces this. The UI does not yet expose it at the map layer (only partially in the Report tab's step expansion).

### JTBD-5: How does variation affect performance?

"Does the variant that skips the approval step actually run faster — and by how much? Is the exception path a performance problem or just different?"

Evidence required: `Variant.meanDurationMs` compared across variants; `runFrequencyPct` to weight the comparison; bottleneck flags from `BottleneckReport` on paths that diverge from standard. The `WorkflowVariantsMap` already computes `deltaVsStandard` percentages. The gap is connecting those deltas to the actual diverge points rather than presenting them as whole-path totals.

---

## 2. Personas and User Stories with Acceptance Criteria

### Persona P1: Operations Lead

Manages a team executing repeating processes. Cares about consistency and throughput. Uses Ledgerium to understand whether the team is following the agreed procedure and where time is being lost.

Primary job: "Show me the standard path and where my team is deviating from it."
Comfort level: does not read raw process-mining output; needs plain-language labels and clear hierarchy (standard vs. variant vs. edge case).

### Persona P2: Process Owner / Analyst

Responsible for the documented SOP. Needs to compare what people actually do against what the procedure says, and to make a case to leadership when a faster path should become the new standard.

Primary job: "I need evidence that variant B is faster than variant A so I can justify changing the SOP."
Comfort level: comfortable with frequency tables and duration comparisons; wants drill-through to source recordings.

### Persona P3: Individual Recorder (self-optimizer)

Records their own work to understand where they spend time. Uses Ledgerium as a personal productivity tool.

Primary job: "Am I doing this consistently, and where am I slowing down?"
Comfort level: not technical; needs progressive disclosure — summary first, detail on demand.

---

### Story M1: See the standard path on the map

**As P1,** when I open the multi-run variant view for a process with >= 2 runs, I want the standard path to be visually distinct so I can immediately recognize which sequence of steps is the baseline.

**Acceptance criteria:**

- M1-AC1. The standard path variant (the one with `Variant.variantLabel = 'dominant_path'` or `'standard_path'`, or the `isStandard: true` flag on `ViewVariantPath`) is rendered with a visually distinct baseline style — a solid green spine or equivalent. All other variant paths are visually subordinate.
- M1-AC2. The standard path's frequency percentage (from `Variant.runFrequencyPct`) is shown prominently alongside the path, not buried in a metrics grid.
- M1-AC3. When `runCount < 2`, the standard path label is suppressed. A message reads "Record this process at least once more to establish a standard path." No default 100% label is fabricated.
- M1-AC4. When `Variant.variantLabel = 'dominant_path'` and frequency < 0.40 (threshold from the VariantLabel contract), the UI adds a notice: "The most-followed path covers only N% of runs — no clear standard has emerged yet." This is the audit-honesty IFF rule applied to variant labeling.

**Edge case:** A process where all runs follow the same path. `variantCount = 1`. The map renders the single path as the standard and the "Compare vs Standard" control does not appear.

---

### Story M2: See the diverge-and-reconverge diagram

**As P1,** when a process has two or more variants, I want to see a diagram that shows a shared common corridor and the branches that leave it and rejoin it, so I can understand the structure of variation without reading a list of step sequences.

**Acceptance criteria:**

- M2-AC1. The diagram renders a vertical or left-to-right "spine" representing the standard-path steps in backbone order (`DivergenceAnalysis.backbone`). Each backbone step shows its category label.
- M2-AC2. For each `DivergenceBranch`, the diagram shows a branch that leaves the spine after `divergeAfterIndex` and rejoins at `reconvergeAtIndex`. The branch nodes show `altSteps` (or "skips N steps" for shortcut cases where `altSteps.length = 0`).
- M2-AC3. Each branch carries a frequency badge showing `DivergenceBranch.frequency` (e.g., "18% of runs"). Branches are ordered by `runCount` descending within the same diverge point.
- M2-AC4. When `DivergenceBranch.dfgConfirmedSplit = true`, a "Confirmed branch" indicator is shown (the DFG cross-check provides higher evidential confidence than LCS alignment alone).
- M2-AC5. The conforming-path percentage (`DivergenceAnalysis.conformingFrequency`) is shown as a header: "82% of runs follow the standard path end-to-end."
- M2-AC6. The diagram limits to 5 branches by default before an "N more" expansion control. This prevents the spaghetti failure mode for highly variant processes.
- M2-AC7. The algorithm version string (`DivergenceAnalysis.version = 'lcs-backbone/1.0.0#...'`) is surfaced in a hover-accessible tooltip as the audit anchor. Users who care about reproducibility can see which algorithm version produced the analysis.
- M2-AC8. No `Date.now()` or `Math.random()` is called in the rendering path. The diagram is deterministic: given the same `DivergenceAnalysis` result, the rendered diagram is byte-identical across renders.

**Edge case:** A branch where `skippedBackbone.length > 0` and `altSteps.length = 0` (a pure shortcut). The branch label reads "skips [step category list]" rather than showing inserted steps.

---

### Story M3: Understand what decision drove each branch

**As P1,** when I see a branch in the diverge diagram, I want to know what type of decision or condition caused the fork, so I can understand whether the variation is intentional (a business rule) or uncontrolled (human judgment).

**Acceptance criteria:**

- M3-AC1. On any branch point on the diverge diagram that corresponds to a `DecisionPoint` in the `ProcessGraph`, a decision badge is shown at the fork node. The badge displays the `DecisionType` in plain language (e.g., "Approval decision", "User choice", "System state").
- M3-AC2. Clicking or expanding the decision badge opens a panel (not a new page) showing the attached `Condition` objects. Each condition shows `Condition.description` (plain-English, <= 200 chars) and `Condition.conditionType`.
- M3-AC3. When `DecisionPoint.isInferred = true` (i.e., `confidenceScore < 0.55`, the audit-honesty IFF threshold), the decision badge shows an "Inferred" indicator in the amber confidence band. The user sees: "Ledgerium detected a branch here but could not classify what caused it — record more runs to confirm."
- M3-AC4. A `DecisionPoint` with `decisionType = 'unknown_inferred'` is always shown with the inferred indicator regardless of confidence score. This overrides the standard confidence band display. The `unknown_inferred` member of the DecisionType closed union must never be rendered as a confident classification.
- M3-AC5. When no `DecisionPoint` exists for a branch point (the branch was detected by LCS alignment but the Path E graph has no decision entity at that node), the branch is shown without a decision badge. No fabricated decision type is shown.
- M3-AC6. The `WorkflowDecisionNode` component currently renders only the amber diamond and a generic "Decision" label. This story requires extending `WorkflowDecisionNode` to optionally render the `DecisionType` chip and `Condition.description` list when `data.viewNode.decisionLabel` and associated conditions are available. The extension must not break the existing no-data fallback.

---

### Story M4: See which runs are behind each branch (evidence link)

**As P2,** when I look at a branch in the diverge diagram, I want to see which specific recordings produced that branch, so I can click through to the source runs and verify the analysis.

**Acceptance criteria:**

- M4-AC1. Each `DivergenceBranch` in the rendered diagram has an "N runs" chip. Clicking the chip opens a filtered list of the contributing runs, using `DivergenceBranch.evidenceRunIds` as the filter.
- M4-AC2. The filtered run list links directly to each individual workflow's Report page. The link uses the existing workflow routing.
- M4-AC3. The evidence link is disabled (greyed with tooltip "Evidence drill-through requires Team plan") for Free and Starter plan users. The `evidenceRunIds` data is still computed and stored; only the UI entrypoint is gated.
- M4-AC4. On a variant card in the left rail of `WorkflowVariantsMap`, the "Compare vs Standard" button is augmented with an "X source runs" count that reflects the variant's `runCount` from `ViewVariantPath`.
- M4-AC5. When a variant's `runCount = 1`, no statistical comparisons (duration delta, step count delta) are shown. The display reads "1 run — not enough data for comparison." This prevents the single-run fabrication the report layer already guards against.

---

### Story M5: Compare two variants side by side

**As P2,** I want to select any two variants and see a step-by-step comparison that highlights exactly which steps are shared, which are inserted, and which are deleted, so I can identify the specific process difference and make a standardization recommendation.

**Acceptance criteria:**

- M5-AC1. The `WorkflowVariantsMap` already ships a `ComparisonCard` and a "Compare vs Standard" button. This story extends that surface: any two variants can be selected, not only a non-standard vs. standard pair.
- M5-AC2. The step sequence comparison (`StepSequenceView`) marks each step in three states: `shared` (present in both at the same relative position per LCS alignment), `inserted` (present in the selected variant but not standard), `deleted` (present in standard but not the selected variant).
- M5-AC3. The comparison uses the same LCS alignment algorithm as `analyzeDivergence()` — not positional index comparison. Positional comparison produces false divergences when a single inserted step shifts all subsequent step ordinals. The LCS-aligned comparison is the correct semantics.
- M5-AC4. When `avgDurationMs` is available for both variants, the comparison shows the absolute duration difference and the percentage delta. When duration is not available (single-run variant), the duration cell shows "—" rather than "0" or empty.
- M5-AC5. The comparison is rendered without a page reload — it is driven by React state in the existing `WorkflowVariantsMap` component.

---

## 3. Gap Analysis: What Is Currently Missing or Weak

The following gaps are identified against the jobs-to-be-done and the existing surface.

### Gap G1: Diverge/reconverge diagram exists in the Report tab but not in the workflow-view layer

**Location:** `WorkflowReportPage.tsx` `VarianceVariantsSection` (the `rpt-variance` section).

The `deriveDivergence()` function already runs on `sortedVariants` and renders a text-based "Where runs diverge" block inside the Report tab. This is the Phase 2 diverge/reconverge story in text form. It shows the backbone as a horizontal chip list, then individual branch cards with plain-English labels ("After [step] → [alt steps] → rejoins at [step]").

What is missing from this surface:
- No visual representation of the spine with branches drawn off it. The current rendering is a flat text list — readable for 2-3 branches but not scannable for 5+.
- No connection between the Report tab's divergence text and the `variants` mode in `WorkflowVariantsMap`. They are parallel surfaces drawing on different data shapes (Report tab uses `intelligence.variants.variants[]` + `deriveDivergence()`; the workflow-view layer uses `NormalizedViewModel.variants` + `variantAdapter`).
- The backbone chip row does not distinguish shared steps from decision points. All backbone steps look identical.

**Severity:** Medium-high. The data is correct and already rendered. The problem is legibility and the disconnection between the Report tab and the map view.

### Gap G2: Decision-point rendering in WorkflowVariantsMap is absent

**Location:** `WorkflowDecisionNode.tsx`, `variantAdapter.ts`, `WorkflowVariantsMap.tsx`.

`WorkflowDecisionNode` renders a amber diamond with the generic "Decision" label and whatever string is in `data.viewNode.decisionLabel`. It does not render:
- The `DecisionType` classification from the Path E `ProcessGraph.decisionPoints` array.
- The `Condition` list (what triggered each outgoing branch).
- The `confidenceScore` / `isInferred` confidence band for the decision.
- The `runFrequencyPct` on each outgoing `ProcessEdge` (the branch weight).

The `variantAdapter.ts` builds `VariantFlowNode` objects from `NormalizedViewModel` nodes — but `NormalizedViewModel` is built from the legacy `ProcessOutput` shape by `buildNormalizedViewModel()`, not from the new `ProcessGraph` entity model. The Path E entity model (`ProcessNode`, `ProcessEdge`, `DecisionPoint`, `Condition`, `Variant`) is defined in `apps/web-app/src/lib/process-graph/types/entities.ts` and has a corresponding schema migration (PATHE-P01), but there is no adapter that converts a `ProcessGraph` into a `NormalizedViewModel`. The variant map currently has no path to render Path E decision metadata.

**Severity:** High for JTBD-3. The `ProcessGraph` model is the long-term data shape. Without an adapter, the decision-type and condition data cannot reach the map. This is the most significant structural gap.

### Gap G3: Step-comparison in WorkflowVariantsMap uses positional index, not LCS alignment

**Location:** `WorkflowVariantsMap.tsx` `StepSequenceView`, line ~467.

```
const matchesStandard = i < standardCategories.length && standardCategories[i] === cat;
const isDivergence = !matchesStandard && standardCategories.length > 0 && !path.isStandard;
```

This compares steps by array index (position i). This is incorrect semantics for process comparison. A variant that inserts one step early in the sequence will report every subsequent step as a divergence even when the steps are identical. The correct comparison uses LCS alignment, which is exactly what `analyzeDivergence()` uses. The `divergenceAnalyzer.ts` already produces aligned position pairs via `lcsAlignment()`.

**Severity:** High for Story M5. The visual "DIVERGES" badge in the step sequence is unreliable for variants with insertions or deletions before the final steps.

### Gap G4: variantAdapter.ts does not wire DivergenceAnalysis output to the flow nodes

**Location:** `variantAdapter.ts`.

`buildVariantData()` produces `VariantFlowNode` objects with an `isDivergencePoint: false` hardcode for all nodes. The `DivergenceBranch` output of `analyzeDivergence()` is not plumbed into the variant adapter. This means `isDivergencePoint` is never `true` in the map, and no visual divergence-point marking exists in the flow canvas mode.

The `VariantFlowNode.data.isDivergencePoint` field was architected specifically for this purpose (its JSDoc reads "Whether this node is a divergence point"). The engine produces the data; the adapter does not consume it.

**Severity:** High for Story M2. The diverge-point-marking feature was designed and partially built but not connected.

### Gap G5: No mapping between ViewVariantPath.divergencePoints and backbone positions

**Location:** `viewModel.ts` `ViewVariantPath`, `variantAdapter.ts` `extractVariantsFromIntelligence()`.

`ViewVariantPath.divergencePoints` is typed as `number[]` (step ordinals where the path diverges from standard). In `extractVariantsFromIntelligence()` this is always populated as `[]`. The `DivergenceAnalysis` output carries `divergeAfterIndex` and `reconvergeAtIndex` which are backbone-relative positions, not step ordinals in the view model. There is no translation between the two coordinate systems.

**Severity:** Medium. This gap means the `divergencePoints` field on variants is always empty — branches exist in the report but no node in the flow map is marked as a divergence point.

### Gap G6: WorkflowVariantsMap is only connected to the 'variants' mode; divergence is not surfaced in 'flow' mode

**Location:** `WorkflowModeSwitcher.tsx`, `WorkflowPageShell.tsx`.

The four modes (flow, swimlane, variants, systems) are independent rendering paths. The `flow` mode uses `WorkflowCanvas` + `buildFlowData()`. The `variants` mode uses `WorkflowVariantsMap`. Decision nodes in `flow` mode (`WorkflowDecisionNode`) receive only the `ViewNode` shape, which does not carry Path E `DecisionType` or `Condition` data.

A user who wants to understand where decisions happen uses the `flow` mode (it is the default). The `variants` mode is a secondary mode that users must know to navigate to. This creates a discoverability gap for the diverge/reconverge story.

**Severity:** Medium. The `flow` mode is the first-seen surface. Decision-point context and branch frequencies should be visible there, not only in the `variants` mode.

### Gap G7: Single-run state is handled correctly in WorkflowVariantsMap but the transition to multi-run is not announced

**Location:** `WorkflowVariantsMap.tsx` `SinglePathView`.

When `!variantData.hasVariantData`, the component renders `SinglePathView` with a blue info banner: "Single recording — no variants to compare yet." This is correct honesty behavior. However, when the process does accumulate a second run and the variant data becomes available, there is no transition announcement or "new" indicator. Users who recorded a process once and returned later would not know the variants mode now has data without actively clicking into it.

**Severity:** Low for the map itself; medium for overall feature discoverability (addressed at the dashboard level by the PRD, not the map layer).

### Gap G8: VariantLabel taxonomy (9 members) is not yet surfaced in WorkflowVariantsMap

**Location:** `variant-labels.ts`, `WorkflowVariantsMap.tsx`.

The Path E data model defines a 9-member `VariantLabel` taxonomy: `dominant_path`, `standard_path`, `alternate_path`, `exception_path`, `failure_path`, `escalation_path`, `rework_path`, `high_performance_path`, `low_performance_path`. This is semantically richer than the 5-type `PathRole` classification used in `WorkflowVariantsMap` (`standard`, `fastest`, `longest`, `exception`, `variant`). The current `classifyPaths()` function derives role from duration comparison and `isStandard`; it does not consume `Variant.variantLabel`.

When the Path E data model is live, the `classifyPaths()` function should be rewritten to consume `variantLabel` as the authoritative semantic classification rather than deriving it from duration heuristics. `high_performance_path` (significantly faster) and `low_performance_path` (significantly slower) are already defined in the taxonomy and match the current `fastest`/`longest` heuristic, but the Path E labels carry stronger evidential backing (they are computed by the clustering engine, not by simple duration comparison).

**Severity:** Low for current phase (Path E not yet live in production). Must be resolved before Path E data is surfaced.

---

## 4. MVP Boundary

### What ships first (MVP, buildable now without Path E being live)

The existing `NormalizedViewModel` + `intelligence.variants.variants[]` data shape is already being used by `WorkflowVariantsMap` and `VarianceVariantsSection`. The divergence engine (`analyzeDivergence()`) is already wired in `WorkflowReportPage.tsx`. MVP work closes gaps in what is already partially built.

**MVP-1: LCS-aligned step comparison in WorkflowVariantsMap (closes G3)**
Replace the positional-index comparison in `StepSequenceView` with LCS-based alignment using the same `lcsAlignment` function already in `divergenceAnalyzer.ts`. This is a correctness fix, not a new feature. It affects the "DIVERGES" badge in the step sequence view and must land before the comparison surface is used in any user-facing decision.

**MVP-2: Wire DivergenceAnalysis output to VariantFlowNode.isDivergencePoint (closes G4, G5)**
Extend `buildVariantData()` in `variantAdapter.ts` to accept a `DivergenceAnalysis` result as an optional parameter. Map `DivergenceBranch.divergeAfterIndex` to the corresponding `ViewNode.id` using the backbone position-to-node mapping. Set `isDivergencePoint: true` on those nodes. Populate `ViewVariantPath.divergencePoints` with the backbone-relative positions rather than leaving it as `[]`.

**MVP-3: Visual diverge/reconverge spine in WorkflowVariantsMap (closes G1 partially)**
Upgrade the right-panel step sequence from the current vertical list into a branching diagram. The spine shows the backbone steps (shared corridor). Branches leave the spine at `divergeAfterIndex` and rejoin at `reconvergeAtIndex`. This is a frontend rendering change consuming the already-correct `DivergenceAnalysis` data. Reuses the existing React Flow canvas or a lightweight inline SVG branch layout — whichever engineering judges more appropriate for a vertical step-list variant. No new algorithm work is required.

**MVP-4: Frequency badges on branch edges (partial JTBD-2)**
On each branch, show `DivergenceBranch.frequency` and `DivergenceBranch.runCount`. The "N runs" chip is the anchor for the evidence link in Phase 2.

**MVP-5: Decision-type chip on DecisionNode in flow mode (closes G6 for basic case)**
Extend `WorkflowDecisionNode` to render the `DecisionType` string from `ViewNode.decisionLabel` as a structured chip — not just as free text. Use the 9-member `DecisionType` union mapping to a plain-language label (e.g., `approval_decision` → "Approval decision", `user_choice` → "User choice"). This does not require the full Path E `ProcessGraph` adapter; it only requires that the `decisionLabel` field populated in `viewModel.ts` carries the `DecisionType` value when available. Today `decisionLabel` holds an arbitrary string; the fix ensures that when a `DecisionType` value is present, it renders with the appropriate icon and color from the decision catalog.

**MVP-6: Condition list in decision node panel (closes G2 for MVP, without full Path E adapter)**
When `WorkflowInspectorPanel` opens for a decision node, show the outgoing branch conditions as a structured list: condition type + description + confidence band. Data source: the `decisionLabel` and associated metadata already in `ViewNode`; extend the inspector panel to format condition descriptions distinctly from the step label. Full `Condition` entity rendering from Path E `DecisionPoint` is a fast-follow (see below).

**What MVP explicitly excludes:**
- The full `ProcessGraph` → `NormalizedViewModel` adapter. Path E data model is not yet live in production. MVP works on the existing `NormalizedViewModel` + `intelligence.variants.variants[]` shape.
- Condition-typed evidence drill-through (M4-AC1 through M4-AC3). Evidence links ship in Phase 2 with the full `evidenceRunIds` exposure.
- `VariantLabel` taxonomy from Path E replacing `classifyPaths()` heuristics. Cannot land until `Variant.variantLabel` is populated in production.
- LCS-aligned comparison for more than 2 variants simultaneously. MVP comparison is pairwise (standard vs. one other).

---

### Fast-follow (Phase 2, after MVP is shipped)

**FF-1: ProcessGraph → NormalizedViewModel adapter**
The structural gap (G2). An adapter that reads `ProcessGraph.nodes`, `ProcessGraph.edges`, `ProcessGraph.decisionPoints`, `ProcessGraph.variants` and produces a `NormalizedViewModel` (or a superset that the workflow-view components can consume). This is the contract surface that the system-architect agent should design before Phase 2 opens — it is likely the largest piece of Phase 2 backend work.

**FF-2: Full DecisionPoint + Condition rendering in flow mode**
Once the adapter exists, `WorkflowDecisionNode` receives full `DecisionType` + `Condition` list + confidence bands derived from `ProcessGraph.decisionPoints`. The outgoing `ProcessEdge.runFrequencyPct` values (branch weights) are shown on branch edges in the flow canvas. This closes G2 completely.

**FF-3: Evidence run drill-through from diverge diagram**
Wire `DivergenceBranch.evidenceRunIds` to a filtered run list. Clicking "N runs" opens the list. Gate behind Team plan for the click-through; show the count to all plans.

**FF-4: VariantLabel taxonomy consumption**
Replace `classifyPaths()` heuristics with `Variant.variantLabel` from the Path E data model. Add rendering for `rework_path` (rework loop detected — visually distinct from standard exception), `escalation_path`, and `low_performance_path` / `high_performance_path` which have no current equivalent in the 5-type `PathRole` taxonomy.

**FF-5: Inferred-entity visual treatment across map**
All nodes, edges, and decisions with `isInferred = true` (confidence < 0.55) receive the amber "Inferred" visual treatment on the map — not only in the inspector panel. This closes the audit-honesty IFF invariant at the visual layer, not just at the data layer.

---

### Later (Phase 3, deferred)

- BPMN / swimlane layout for diverge/reconverge view (not just a vertical step list — a true 2D process map with parallel lanes for variants). Referenced as NG4 in the PRD.
- Conformance checking: overlay an SOP's prescribed path against actual variant distribution and highlight deviation.
- Drift detection on the diverge diagram: compare this week's variant distribution against the prior window and flag when a previously-rare branch becomes common.
- Team-scoped variant view: show how different team members execute the same process and which variants belong to which executor.

---

## 5. Success Metrics (Measurable)

All metrics are measurable from PostHog events or database queries. No metric requires Date.now() comparison at runtime — they are aggregated server-side or in the analytics layer.

### M-Q1: Diverge diagram engagement rate

**Definition:** Percentage of sessions where a user who views the `variants` mode of `WorkflowVariantsMap` on a process with >= 2 variants also interacts with the diverge/reconverge diagram (clicks a branch card, expands a branch, or hovers on a decision badge).

**Baseline:** Not measurable today (diverge diagram in Report tab is not instrumented at interaction level; workflow-view variants mode has no diverge diagram).

**Target:** >= 35% of qualifying sessions within 60 days of MVP launch.

**Event:** `process_diverge_branch_interacted` with properties `{ workflow_id, branch_index, run_count, variant_count, interaction_type: 'click' | 'expand' | 'hover' }`.

**Rationale:** A rate below 20% suggests the diverge diagram is not discovered or not understood. A rate above 50% would indicate high value and supports prioritizing Phase 2 depth work.

---

### M-Q2: Decision-point click-through rate in flow mode

**Definition:** Percentage of sessions where a user who views a workflow with >= 1 decision node in `flow` mode clicks on a decision node to open the inspector panel.

**Baseline:** Current click-through on any node in flow mode. Decision nodes are currently indistinguishable in value from action nodes — no specific tracking exists.

**Target:** Decision nodes clicked in >= 25% of sessions where a flow with decisions is viewed.

**Event:** `workflow_decision_node_selected` with properties `{ workflow_id, decision_type, is_inferred, confidence_band }`.

**Rationale:** Measures whether the decision-type chip (MVP-5) drives meaningful engagement. Low rate means either the visual treatment is not noticeable or users do not care about decision metadata.

---

### M-Q3: Variant comparison activation rate

**Definition:** Percentage of sessions where a user views a process with >= 2 variants and activates the "Compare vs Standard" comparison view for at least one non-standard variant.

**Baseline:** The `comparePathId` state is set but the trigger event is not tracked.

**Target:** >= 30% of sessions on qualifying processes.

**Event:** `process_variant_comparison_opened` with properties `{ workflow_id, primary_variant_label, compare_variant_label, run_count }`.

---

### M-Q4: LCS alignment correctness (internal quality gate, not a user-facing metric)

**Definition:** For any process with >= 2 variants, the count of "false divergence" markers rendered in `StepSequenceView` — steps labeled DIVERGES that are semantically identical to the standard-path step at the same LCS-aligned position.

**Baseline:** Currently non-zero due to the positional-index comparison bug (G3). Not tracked.

**Target:** 0 false divergence markers after MVP-1 ships. This is a determinism / correctness gate enforced by the LCS alignment, not a tuned target.

**Measurement method:** Regression test asserting that `lcsAlignment()` output is used in `StepSequenceView` comparison, not positional index. Captured in automated test suite.

---

### M-Q5: Evidence-link usage rate (Phase 2 metric)

**Definition:** Percentage of diverge branch cards where the user clicks through to the source run list.

**Baseline:** Feature does not exist.

**Target:** >= 15% of branch card views result in evidence drill-through on Team plan users.

**Event:** `process_branch_evidence_clicked` with properties `{ workflow_id, branch_diverge_index, run_count_in_branch }`.

**Rationale:** Evidence drill-through is Ledgerium's core moat expressed in the map layer. A rate above 15% confirms users are using the evidence-linked claim, not just reading the aggregate statistics.

---

### M-Q6: Inferred-entity honest-state rate

**Definition:** Percentage of workflows with >= 1 decision node where at least one decision has `isInferred = true` that render the amber "Inferred" indicator.

**Baseline:** Not enforced at the UI layer today.

**Target:** 100% — this is a hard correctness requirement, not a tuned target. The audit-honesty IFF invariant must be reflected in the UI without exception.

**Measurement method:** Automated test in the workflow-view test suite asserting that a `ViewNode` with `isLowConfidence = true` and `isDecisionPoint = true` renders the inferred indicator in `WorkflowDecisionNode`.

---

## 6. Open Decisions for the CEO

### OD-1: Is the diverge/reconverge diagram (Story M2, MVP-3) in MVP scope?

The CEO named this feature explicitly. The algorithm is already built and running in `WorkflowReportPage.tsx`. The gap is rendering it as a visual diagram rather than a text list. Engineering estimate: 2-3 days to build the branching diagram in the workflow-view layer.

Counter-argument for deferring to Phase 2: MVP-1 and MVP-2 (LCS alignment correctness + diverge-point wiring) are prerequisites for an accurate diagram. If correctness work lands in MVP and the diagram is Phase 2, the sequence is clean.

Default in the PRD (OQ-1): Phase 2. CEO should confirm or override.

---

### OD-2: Should the decision-type classification be surfaced in the flow mode or only in the variants mode?

The `flow` mode is the default and first-seen surface. Decision nodes today are visually identical to action nodes except for the amber diamond shape. If decision-type chips (MVP-5) land only in the `variants` mode, users who never discover the variants mode never see decision context.

Two options:
- Option A: Add decision-type chip to `WorkflowDecisionNode` in the `flow` mode (MVP-5 as written above). Both modes show decision context. More impactful for JTBD-3.
- Option B: Decision-type context only in `variants` mode, in the inspector panel. Simpler; avoids complicating the flow canvas node.

Default: Option A — extending `WorkflowDecisionNode` is additive and low-risk.

---

### OD-3: Should variant frequency (runFrequencyPct) on branch edges be visible in the flow canvas?

The `ProcessEdge.runFrequencyPct` field in the Path E model carries the fraction of runs that traversed each edge. In a process with a decision node, the outgoing edges from that node carry the branch weights (e.g., edge A: 72%, edge B: 28%). This would allow users to see "how often each branch is taken" directly in the flow map without switching to the variants mode.

This is a pure display change to `WorkflowEdge.tsx` — edge labels are already rendered. The question is whether to show frequency percentages as edge labels in the flow mode.

Default: Yes, for decision edges (EdgeType `'branch'`). Frequency labels on `'sequence'` edges are noise; on `'branch'` edges they answer JTBD-3 directly. CEO should confirm.

---

### OD-4: When the ProcessGraph adapter (FF-1) is built, should it replace NormalizedViewModel or extend it?

Two architectural options:
- Option A: Build a `ProcessGraph` → `NormalizedViewModel` adapter. `NormalizedViewModel` remains the single view-model type. All workflow-view components remain unchanged. The adapter populates the fields that currently come from `ProcessOutput`.
- Option B: Introduce a `ProcessGraphViewModel` that extends `NormalizedViewModel` with Path E-specific fields (decision metadata, condition lists, per-edge frequencies). Components are updated to consume the richer type where available, fall back to `NormalizedViewModel` otherwise.

This is the system-architect's decision, but the PM frames the constraint: Option A is simpler and preserves all existing component tests. Option B is richer but requires cascading component changes. Given the existing audit-honesty IFF invariant pattern and the compile-time exhaustiveness locks already in the Path E model, Option A is preferable from a product risk standpoint — it ships the data sooner without forcing every component to handle two type shapes simultaneously.

CEO does not need to decide this. It is flagged here as an input for the system-architect agent at Phase 2 entry.

---

### OD-5: Should the "Where runs diverge" section move from the Report tab to the workflow-view variants mode, or exist in both?

Currently the Report tab (`rpt-variance` section) is the only place the diverge/reconverge story is presented (text form). The workflow-view `variants` mode is the visual surface. These are parallel presentations of the same underlying `DivergenceAnalysis` data.

Two options:
- Option A: Keep both. Report tab is the analysis context (read with the rest of the process statistics); workflow-view `variants` mode is the interactive exploration context.
- Option B: Remove the text divergence from the Report tab once the visual diagram ships in the `variants` mode. Simplifies the product surface; avoids maintaining two renderings of the same data.

Default: Option A for MVP (the Report tab's text rendering is already live and correct; do not remove it until the visual diagram has been validated by users). Option B at Phase 2 close, subject to engagement data showing that `variants` mode usage exceeds Report tab divergence-section usage.

---

## 7. Constraints Honored

**Determinism:** Every rendering path described above consumes pre-computed `DivergenceAnalysis`, `Variant`, and `ProcessGraph` entities. No `Date.now()` or `Math.random()` call is introduced. The `analyzeDivergence()` function is already deterministic (stable sort + LCS tie-break). The `classifyPaths()` heuristic in `WorkflowVariantsMap` that uses `reduce` over duration does not call `Date.now()` — it is already deterministic over the input `paths` array.

**Evidence-linked:** Every branch, decision badge, and variant card links back to `evidenceRunIds` or `EvidencePointer[]`. No derived statistic is shown without a traceable source. The inferred-entity visual treatment (amber band, "Inferred" label) is the visual enforcement of the audit-honesty IFF invariant: `isInferred === true IFF confidenceScore < 0.55`.

**Reuse-over-reinvent:** MVP work reuses `analyzeDivergence()` (already wired in Report tab), the existing `lcsAlignment()` internal function (already used by `analyzeDivergence`), the `WorkflowVariantsMap` component (already shipped), and `WorkflowDecisionNode` (already shipped). No new algorithms are proposed. No parallel UI surface is introduced.

**No parallel UI surface:** The diverge/reconverge diagram ships as an enhancement to the existing `variants` mode in `WorkflowPageShell`, not as a new top-level navigation item or a new page route.
