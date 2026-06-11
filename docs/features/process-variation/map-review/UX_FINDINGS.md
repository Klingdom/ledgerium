# UX Findings — Process Map Variant and Decision-Point Visualization

**Date:** 2026-06-10
**Author:** ux-designer (Define-phase, read-only audit)
**Consumers:** frontend-engineer, qa-engineer, product-manager
**Source files audited:**
- `apps/web-app/src/components/workflow-view/` — all files
- `apps/web-app/src/components/detail/WorkflowReportPage.tsx` — rpt-variance section
- `packages/intelligence-engine/src/divergenceAnalyzer.ts`
- `apps/web-app/src/lib/process-graph/` — types, catalogs, closed-unions
- `docs/features/process-variation/UX_FLOWS_PROCESS_VARIATION.md`
- `docs/features/process-variation/RESEARCH_PROCESS_MINING_STANDARDS.md`

---

## 1. Heuristic Audit of the Current State

### 1.1 What Works

**Flow mode (WorkflowCanvas + flowAdapter)** renders a deterministic, positionally-stable node graph.
Nodes are positioned by ordinal from `viewModel.ts` — same input yields the same layout every render.
Phase group overlays in `WorkflowCanvas.tsx` (line 169–215) give spatial grouping without needing a swimlane split when only phase context is needed.
The `WorkflowInspectorPanel` click-to-inspect interaction gives the right mental model: diagram is a map, inspector is the detail pane.

**Decision node** (`WorkflowDecisionNode.tsx`) visually distinguishes branch nodes from task nodes using the amber diamond motif.
It has a `decisionLabel` field exposed from `viewModel.ts` (line 72).
This is correct in principle — decision nodes need a different visual treatment from task nodes.

**Swimlane mode** (`WorkflowSwimlaneCanvas.tsx`) correctly guards against the single-system useless state (line 255–263) and degrades to an explanatory message rather than rendering empty lanes.

**WorkflowInsightsStrip** shows top-3 insights sorted by severity at the bottom of the shell.
This is a good triage surface that does not take canvas space.

**rpt-variance "Where runs diverge" block** (`WorkflowReportPage.tsx`, line 1418–1565) uses `deriveDivergence` to produce `afterLabel` / `rejoinLabel` / `altSteps` text descriptions.
It does render the standard-path spine (line 1524–1534) as pill badges.
The per-branch cards (line 1536–1562) show frequency percentage, run count, and a DFG confirmation note.
The `dfgConfirmedSplit` / `dfgConfirmedJoin` flags from `divergenceAnalyzer.ts` are surfaced (line 1556–1560), which is correct evidence-linking.

---

### 1.2 What Is Confusing

**The Variants mode is disconnected from the flow map.** `WorkflowVariantsMap` is a separate side-panel + list-view component that replaces the canvas entirely when mode = 'variants'. It does not render a graph — it renders a left rail of path cards and a scrollable detail area on the right. Users who expect to see their process map with variants overlaid will instead see a two-panel textual comparison. The mode switcher label is "Variants" (from `WorkflowModeSwitcher.tsx`, line 14) — the user naturally expects a visual map.

**The variants adapter does not render variant paths on the graph.** `variantAdapter.ts` defines `VariantFlowNode` with an `isDivergencePoint: boolean` field (line 21–26) and builds a node array with `pathIds` (line 61–71), but the `WorkflowVariantsMap` component never connects this adapter to a React Flow canvas. The adapter output is prepared but unused for rendering purposes — `WorkflowVariantsMap` renders path cards instead. The React Flow instance in the variants mode is entirely absent.

**The diverge-reconverge block in the Report tab uses raw enum keys as labels.** The backbone spine (line 1527–1529) renders the raw `stepCategories` string values (e.g. `click_then_navigate`, `fill_and_submit`) directly as pill text. These are `GroupingReason` enum keys, not plain language. The user sees `fill_and_submit → click_then_other → error_handling` rather than "Fill and submit form → Click and continue → Handle error." `UX_FLOWS_PROCESS_VARIATION.md` §3.4 explicitly specifies a plain-language translation table; this is not implemented.

**The WorkflowDecisionNode has a single source and single target handle.** `WorkflowDecisionNode.tsx` (lines 19 and 60) defines one `Handle type="target"` at the top and one `Handle type="source"` at the bottom. A decision node by definition has one incoming edge and two or more outgoing edges. Rendering only one source handle means the React Flow graph cannot visually show the branches emanating from a decision point — it will only show a single outgoing edge. The branch structure is conceptually correct in the data model (`DecisionPoint` in `entities.ts`) but cannot be rendered in the current node component.

**The mode switcher offers 4 modes without clear hierarchy.** The user sees Flow, Swimlane, Variants, and Systems as equal peers. For a single-system workflow, Swimlane is useless but still shown as an equal tab. For a single-run workflow, Variants shows the `SinglePathView` empty state but is still equally prominent in the switcher. There is no progressive disclosure — modes that produce empty or near-empty results are presented with full visual weight.

**Step sequence comparison in WorkflowVariantsMap uses positional index matching.** `StepSequenceView` (line 465–532) compares `path.stepCategories[i]` with `standardCategories[i]` to detect divergence (line 468). Positional index comparison will produce false divergence signals whenever two paths have different step counts before the divergence point — an insertion in path B at step 3 will mark steps 3–N as diverging even if they are structurally identical. The correct comparison is LCS-based alignment (exactly what `divergenceAnalyzer.ts` implements), not index-based comparison. The engine and the visualization use different algorithms.

**The rpt-variance section and the Variants mode surface redundant information with no linkage.** Both sections show variant frequency, path counts, and divergence structure. Neither one links to the other. A user looking at the Variants mode tab cannot jump to the rpt-variance section in the Report. A user reading the rpt-variance report cannot open the map view to the Variants mode. They are parallel surfaces covering the same data from different angles without cross-navigation.

**The ComparisonCard in WorkflowVariantsMap** (line 379–436) places the two paths "VS" each other with step counts and durations, but there is no visual alignment of shared vs. differing steps. The comparison is numeric, not structural. A user cannot answer "at which step do the paths differ?" from this card.

**Evidence links are absent from both surfaces.** The variants mode shows run counts on path cards (line 307 in `WorkflowVariantsMap.tsx`) and on the summary card, but these numbers are not linked to filtered run lists. There is no "View these 3 runs →" affordance. `UX_FLOWS_PROCESS_VARIATION.md` §4.5 specifies these links as required — they are the evidence-linked moat.

---

### 1.3 What Is Redundant

**WorkflowVariantsMap and the rpt-variance section overlap completely.** The variants mode shows: path summary stats, step sequence, path comparison, path insights. The rpt-variance section shows: standard-path conformance percentage, variant frequency bars, diverge-reconverge branches. Both surfaces are deriving from the same `intelligence.variants` data. Neither one supersedes the other — they are two partial implementations of the same concept that together form one incomplete experience.

**The decision node renders identically to a task node.** `WorkflowDecisionNode.tsx` uses a rounded rectangle with an amber color and a diamond SVG icon (line 37–42). The amber color distinguishes it from task nodes but the rectangular shape is the same as a task node. BPMN convention for decision is a diamond (rotated square) — users familiar with any workflow notation will not recognize this as a branch point without the icon. The amber rectangle is a task node with a different color, not a structural signal.

**The path classification logic in WorkflowVariantsMap** (`classifyPaths` function, line 49–147) re-implements frequency-to-role mapping (standard/fastest/longest/exception) that is already handled by the `VariantLabel` closed union in `process-graph/types/closed-unions.ts` (lines 192–215: `dominant_path`, `high_performance_path`, `low_performance_path`, `exception_path`). When the Path E graph is wired up, this classification will be duplicated.

---

## 2. The Recommended Visualization Approach

### 2.1 Decision: Frequency-Weighted DFG on a Single Merged Canvas

The correct rendering model for showing standard/happy path + branch-off + reconverge on a single map is a **DFG with frequency-weighted edges rendered in the existing React Flow canvas**. This is the approach confirmed by `RESEARCH_PROCESS_MINING_STANDARDS.md` §1 and §6, implemented in Celonis and Apromore, and already partially described in `UX_FLOWS_PROCESS_VARIATION.md` §3.4.

**Why not Sankey:** Sankey diagrams encode flow volume via band width. They are useful for showing aggregate volume splits at each branch but poor for showing sequential step structure — the horizontal layout makes the "what happens next" question hard to answer at a glance. Sankey also does not naturally support the step-detail inspector pattern the product already uses.

**Why not the current two-panel list approach:** The `WorkflowVariantsMap` side-panel + step list layout does not use the canvas at all. It abandons the spatial navigation affordance the product built with React Flow. Users who understand the process from the flow map will be disoriented by a context switch to a textual list.

**Why not separate per-variant canvases:** Rendering each variant as a separate map and letting users switch between them (like a slideshow) prevents the brain from comparing them spatially. The diverge-reconverge story only makes sense when both paths are visible at the same time.

**Why the merged DFG canvas wins:**
- A single map with shared nodes on a backbone and diverging paths branching off and rejoining is exactly how the CEO framed the feature.
- `divergenceAnalyzer.ts` already computes `divergeAfterIndex`, `reconvergeAtIndex`, and `altSteps` — the exact information needed to render branch-off and rejoin on a linear backbone.
- React Flow already supports multiple edges out of a single node — the decision node handles need to be extended but the infrastructure exists.
- The existing `WorkflowFlowCanvas` and `WorkflowSwimlaneCanvas` can be extended; no new canvas framework is needed.
- Frequency can be encoded as edge width (`strokeWidth` in `ViewEdge`) — this is already a field in the view model and already used for rendering in `WorkflowEdge`.

### 2.2 How to Render Backbone + Branch + Rejoin

The layout algorithm must be deterministic (no `Date.now()`, no `Math.random()`).

**Backbone track:** Nodes that appear in all runs (matching `divergeAfterIndex` and `reconvergeAtIndex` landmarks from `divergenceAnalyzer`) are rendered on a horizontal central spine. These are the `backbone` array elements in `DivergenceAnalysis`. Their x-position is their ordinal index × node spacing. Their y-position is the center lane (y = 0 in the coordinate system).

**Branch tracks:** For each `DivergenceBranch`, the `altSteps` array contains the categories of the nodes on the diverging path. These nodes are laid out in parallel rows above or below the backbone:
- First branch: y = backbone_y + track_height (below backbone)
- Second branch: y = backbone_y + 2 × track_height
- Third branch and beyond: same pattern

The x-position of each alt step starts at `divergeAfterIndex + 1` × node_spacing and ends at `reconvergeAtIndex - 1` × node_spacing. This preserves left-right alignment — the reader can see at a glance that runs deviate between the same two backbone positions.

**Skipped backbone nodes (shortcut variants):** If `skippedBackbone.length > 0` for a branch, those backbone nodes are rendered at reduced opacity (e.g. 0.35) on the backbone track to indicate "this run skipped these steps." A dashed outline on the node conveys "not present in this variant."

**Edges:**
- Backbone-to-backbone edges: solid, Ledgerium green, `strokeWidth` proportional to the number of runs traversing the edge (`edge.runFrequency` from `ProcessEdge` in `entities.ts`).
- Branch-off edge (from last backbone node before divergence to first alt-step node): dashed amber, `strokeWidth` proportional to `branch.runCount`.
- Rejoin edge (from last alt-step node to the reconverge backbone node): dashed amber, same width.
- Skip edges (when backbone nodes are skipped): dotted gray, minimal width, rendered as a long arc above the skipped section.

**Node widths and heights:** Keep the existing 280px × 72px from `flowAdapter.ts` (lines 48–49) on the backbone. Alt-step nodes on branch tracks can be 220px × 64px to visually subordinate them to the backbone.

### 2.3 How to Show Decision Points Distinctly from Incidental Variation

**Structural decision vs. incidental variation is a categorical distinction.** `divergenceAnalyzer.ts` uses DFG confirmation (`dfgConfirmedSplit: boolean`) to distinguish confirmed branch points (out-degree > 1 in the directly-follows graph) from mere sequence variation. This is the correct dividing line.

**At a confirmed DFG split node:**
- Replace the rectangular `WorkflowDecisionNode` with a true diamond shape (rotated square) using a CSS `transform: rotate(45deg)` div inside a fixed bounding box. This is BPMN-standard. The `WorkflowDecisionNode.tsx` amber rectangle needs to become a diamond.
- The diamond carries a label anchor. The `decisionLabel` field in `ViewNode` is already plumbed but only rendered as text inside the node. At the diamond, the label should appear as an outbound question: e.g., "Approval required?" positioned above the diamond.
- Each outgoing edge from the diamond carries its branch percentage: "82%" on the main-path edge, "18%" on the exception edge. These are the `runFrequencyPct` values from `ProcessEdge`.

**At an unconfirmed divergence (incidental variation):**
- No diamond. The backbone node is rendered normally.
- A small indicator in the bottom-right of the node shows the divergence rate: a half-filled circle icon with "18% diverge" text beneath it. This matches the heatmap-strip symbol from `UX_FLOWS_PROCESS_VARIATION.md` §4.3.
- No visual branching on the canvas for very small divergence rates (< 5% of runs). These are absorbed into the step's timing variance band shown in the inspector panel.

**Inferred decisions** (`isInferred: true` per `entities.ts` line 113) should render the diamond with a dashed border and carry an explicit "Inferred — not confirmed by observed data" label in the inspector. This preserves the audit-honesty contract from `closed-unions.ts` lines 225–246.

### 2.4 Handling Spaghetti (5+ Variants)

At 5+ variants the canvas will have multiple overlapping branch tracks. Use a three-level progressive disclosure pattern:

**Level A — Default (always):** Render the backbone + top 2 branches by `branch.runCount` descending. All other branches are collapsed into a summary node on the canvas: a small gray rounded rectangle positioned below the lowest branch track that reads "N more paths — click to expand." This node is not a real step; it is a collapse placeholder.

**Level B — Expanded (on-demand):** The user clicks "N more paths" and the canvas re-renders with all branches. A "Simplify" button appears in the canvas toolbar (next to zoom controls). Clicking "Simplify" returns to Level A.

**Level C — Filtered (threshold slider):** When the user clicks "Simplify," a threshold popover appears: "Show paths with [N]+ runs" — a numeric stepper defaulting to 2. Setting it to 2 hides all single-run outlier branches. Setting it higher collapses rarer branches further. The threshold value is passed as a prop to the adapter; no state lives in the canvas itself (all filtering is done before passing nodes/edges to React Flow).

**Why not a complexity slider as a continuous control:** A continuous slider implies a continuous quality dimension, which is incorrect — the user is choosing a minimum evidence threshold, not a complexity dial. A numeric "minimum N runs" control is more honest and more actionable.

**At 8+ variants:** Add a warning banner above the diagram (not inside it) reading: "This process has N distinct paths — unusually high variation. This may indicate unclear process definition or multiple different tasks grouped together." Match the copy from `UX_FLOWS_PROCESS_VARIATION.md` §3.7.

### 2.5 The Variant DNA Strip

Between the section summary and the merged canvas, render a compact horizontal frequency bar strip aligned on the backbone. This is `UX_FLOWS_PROCESS_VARIATION.md` §3.3 fully specified. Each row in the strip corresponds to one branch. Clicking the row:
1. Highlights that branch on the canvas (nodes on that branch get full opacity; all other branch nodes dim to 30% opacity; backbone nodes stay full opacity always).
2. Scrolls the canvas so the first divergence node for that branch is visible.

The strip is implemented as a pure HTML/CSS component (no React Flow involvement) above the canvas container. State for the selected variant is a `useState` in the parent shell, passed as a prop to both the strip and the canvas adapter.

---

## 3. Interaction Design

### 3.1 Selecting a Variant

**Interaction:** Click a row in the DNA strip or click a branch node on the canvas.

**Result:**
- The clicked variant's branch nodes have full opacity and a solid 2px colored border (matching the branch color from the frequency palette).
- All other branch nodes dim to 30% opacity.
- Backbone nodes are never dimmed — they are always shared context.
- The DNA strip row for the selected variant shows a filled left border indicator.
- A small annotation badge appears on the first alt-step node of the branch: "[Path B] · 13% · 2 runs."

**De-select:** Click the same strip row again, click an empty area on the canvas, or click the backbone.

**Keyboard:** Tab to the strip rows. Enter/Space selects. Arrow Up/Down navigates rows in the strip. Tab enters the canvas and focuses the first node in the selected variant's branch.

### 3.2 Comparing Two Variants (A-only / B-only / Both Overlay)

**Interaction:** Hold Shift and click a second row in the DNA strip. Or click "Compare with..." in the step detail panel.

**Three-state node coloring for comparison mode:**
- Node present in A only: blue-tinted fill, "A only" badge.
- Node present in B only: amber-tinted fill, "B only" badge.
- Node present in both: white fill, green left border (matches the "shared step" coding from `UX_FLOWS_PROCESS_VARIATION.md` §3.4).
- Node present in neither (backbone node): full opacity, standard styling.

**Diff strip above the canvas** (appears only in comparison mode): a two-row horizontal representation, one row per variant, each step drawn as a colored block. Shared steps are aligned by the LCS backbone — the diff strip makes structural differences spatially obvious even before the user reads node labels. Block width is proportional to mean step duration from the timestudy data.

**Exit comparison:** Click "Clear comparison" button that appears in the canvas toolbar when two variants are selected. Or press Escape.

**State management:** Two variant IDs (`selectedVariantId: string | null` and `compareVariantId: string | null`) live in the page shell's `useState`. They are passed to both the DNA strip and the canvas adapter. The canvas adapter filters and styles nodes based on these IDs.

### 3.3 Drilling from Branch/Decision to Source Runs

**Entry points:**
- Click any alt-step node on the canvas → inspector panel opens with "Present in N runs (M%) · Path B only" and a "View these N runs →" link.
- Click the branch-off edge (the dashed amber edge from the backbone to the first alt step) → a branch detail popup appears (not the inspector — a floating card anchored to the edge midpoint). The popup shows the branch frequency, alt-step list, and "View N runs →".
- Click the DFG-confirmed decision diamond → branch detail popup listing all outgoing branches with their run counts and "View runs →" links.

**"View N runs" behavior:** Opens the `RunsListView` surface described in `UX_FLOWS_PROCESS_VARIATION.md` §5.4. This is a filtered run table. The filter parameter is the `evidenceRunIds` array from `DivergenceBranch` in `divergenceAnalyzer.ts` (line 43). The same array from `ProcessEdge.rawEvidence` and `Variant.rawEvidence` in `entities.ts` is the canonical source.

**Inspector panel evidence tab:** The `WorkflowInspectorPanel` currently renders step metrics, procedure, and friction. Add a fourth section: "Evidence" — a compact list of the run IDs that produced this node. Limit display to 5 most recent runs with a "See all N runs →" link. This implements the `EvidencePointer` display from `entities.ts` lines 59–77 without adding a separate panel.

### 3.4 Filtering

**By variant (primary filter):** DNA strip row selection is the primary variant filter, as described above.

**By minimum frequency threshold:** The "Show paths with N+ runs" threshold control, as described in §2.4.

**By decision type:** A filter chip row in the canvas toolbar (appearing only when decision nodes exist): checkboxes for "User choice," "Business rule," "System state," "Approval," "Exception handling" (mapped from the `DecisionType` closed union in `closed-unions.ts` line 145–155). Unchecking a type hides its decision diamonds and collapses their branches into the backbone edge. Default: all checked.

**Persistent state:** Filters are URL-querystring state (e.g., `?variant=B&minRuns=2&decisionTypes=user_choice,business_rule`). This allows linking directly to a specific filtered view. The canvas adapter is a pure function of the filter params — deterministic, no Date/random.

### 3.5 Legend

The `WorkflowLegend` component already exists as a toggleable overlay (`WorkflowToolbar.tsx` → `showLegend`). Extend it to include the variants-mode visual vocabulary:

- Solid green edge: shared backbone path
- Dashed amber edge: branch-off or rejoin edge
- Diamond node: confirmed decision point (DFG out-degree > 1)
- Dashed diamond: inferred decision point
- Half-opacity node: variant-specific step (not on selected path)
- Badge "A only" / "B only": comparison mode step attribution

The legend toggled in the toolbar applies across all modes. In variants mode, the variant-specific items appear. In flow mode, only the existing flow-mode items appear.

---

## 4. Empty, Single-Run, and Sparse States

These states are specified in `UX_FLOWS_PROCESS_VARIATION.md` §6. The current implementation is partially compliant. Below is the gap analysis and required treatment.

### 4.1 Single-Run State

**Current behavior:** `WorkflowVariantsMap.tsx` (line 166–167) detects `!variantData.hasVariantData` and renders `<SinglePathView>`. This is correct in structure. `SinglePathView` (line 618–687) shows a blue info banner and the step sequence. The banner copy reads "Single recording — no variants to compare yet."

**Required changes:**
- The copy in `SinglePathView` must not say "no variants to compare yet" — this frames the single-run state as a failure mode. Per `UX_FLOWS_PROCESS_VARIATION.md` §1.3: "This state is not an error. It is the normal first-recording state." Revise banner to: "This is the first recording. Run this process again to see how different runs compare." Remove the phrase "to compare" which implies the current state is incomplete.
- The `SinglePathView` renders the step sequence using graph nodes but without any step-level metrics (no mean duration, no run count). It should show the single run's observed duration per node from `viewNode.durationLabel`.
- The "Variants" mode switcher tab should not be visually suppressed in single-run state — it is a valid state to be in. But the tab button should carry a subtitle or tooltip: "Record again to unlock variant analysis." This avoids false "why is this empty" confusion.

### 4.2 Single-Variant State (Multiple Runs, All Identical)

**Current behavior:** Not explicitly handled. `classifyPaths` returns a single path marked `role: 'standard'` which renders one path card and a step sequence. The user does not get a positive confirmation that all runs are consistent.

**Required behavior:**
- When `paths.length === 1` and `paths[0].runCount >= 2`, show a "Consistent process" indicator above the step sequence: a green badge reading "All N runs follow the same path." No DNA strip (nothing to compare). No branch diagram.
- This is a positive signal. The visual treatment should reinforce that — use a green checkmark icon, not a neutral info icon.
- No branch canvas. Show the single spine as a horizontal step sequence without branch tracks.

### 4.3 Sparse State (2–4 Runs)

**Current behavior:** No special handling — 2 runs trigger the full variant comparison view.

**Required behavior:**
- When `runCount < 5` and variants exist, show a confidence caveat near the top of the section: "Based on N runs. Patterns may shift as you record more." Use neutral styling (not amber/warning). The caveat appears only once, above the DNA strip. It is not a blocker.
- Step-level confidence: nodes where `viewNode.isLowConfidence` is true (< 70% per `viewModel.ts` line 75) should show the confidence indicator from the flow-mode inspector.

### 4.4 Honestly Naming What the Engine Cannot Confirm

When `dfgConfirmedSplit === false` on a `DivergenceBranch`, the branch is detected via LCS alignment but not corroborated by the DFG. In this case:
- Do not show the diamond decision node for this branch point on the canvas.
- Show the branch as a dashed branch track (lighter opacity than DFG-confirmed branches).
- In the branch detail popup, include: "Variation detected in N runs. Not enough data to confirm a consistent branch point." (mapping to `INFERRED_CONFIDENCE_THRESHOLD` semantics.)
- Do not show a branch percentage badge on the backbone edge — the percentage would be misleading if the branch is below the minimum edge count threshold.

### 4.5 No ProcessDefinition / Ungrouped State

When the workflow has no clustering data (single recording, no `ProcessDefinition` cluster):
- The Variants tab renders the `SinglePathView` as today.
- The rpt-variance section (Report tab) renders the single-run placeholder from `WorkflowReportPage.tsx` line 1391–1400. The copy "Recorded once. Run this workflow again to unlock variance, variant paths, and trend analysis." is acceptable.
- Neither section should render any numeric metric that implies a base of N > 1 runs.

---

## 5. Information Architecture — Where This Lives

### 5.1 Current Structure

The product currently has (from `WorkflowPageShell.tsx` line 82, mode switcher in `WorkflowModeSwitcher.tsx` line 14):

```
Workflow page
  [Flow]  [Swimlane]  [Variants]  [Systems]   ← 4-mode switcher
Report tab (WorkflowReportPage)
  rpt-variance section                         ← diverge block + frequency bars
```

The `UX_FLOWS_PROCESS_VARIATION.md` §4.1 explicitly recommends a 2-view structure (Process map / Analysis report) rather than the current 8-tab or 4-mode structure. The full 2-view restructure is a larger architectural decision. For the purposes of this audit, the recommendation is to improve within the existing structure rather than requiring a tab restructure as a prerequisite.

### 5.2 Recommended IA (extend existing, do not add a parallel surface)

**Keep the 4-mode switcher.** Do not add a fifth tab for variants. Instead, the Variants mode becomes the merged DFG canvas described in §2.

**Merge Variants mode into the Flow mode's canvas, with a toggle.** The single biggest structural improvement is to make variant overlay a switch within the flow canvas, not a separate mode. The Flow mode already has the right canvas for this. The proposed change:

1. Rename the Flow mode to "Process Map" (cleaner label for non-technical users).
2. Add a toggle in the toolbar: "Show variants" (default: off). When toggled on, the canvas switches from single-run rendering to the merged DFG variant rendering described in §2. The mode switcher removes the separate "Variants" entry. Users who want to explore variants do so within the map, not by switching to a different map-less panel.

**Keep the Variants mode as a standalone for now (safer, lower-risk MVP option).** If the "merge into flow mode" approach is too large for the first iteration, keep the current 4-mode switcher but replace the `WorkflowVariantsMap` component's interior with the merged DFG canvas described in §2. The key change is: the Variants mode renders a React Flow canvas, not a text panel.

**The rpt-variance section remains in the Report tab.** It is the right place for per-variant tables, duration comparisons, and the diverge block. It is a textual analysis layer, not a map layer. The DNA strip from `UX_FLOWS_PROCESS_VARIATION.md` §3.3 belongs in the Report tab, not on the canvas map.

**Add cross-navigation links:**
- From the Variants mode canvas: a "See full analysis →" link in the toolbar that navigates to the Report tab anchored to `#rpt-variance`.
- From the rpt-variance section: a "See on map →" link that navigates to the Workflow tab in Variants mode.

These are the minimum viable cross-navigation improvements. They close the current gap where two surfaces covering the same data have no relationship to each other.

### 5.3 IA Principles That Must Not Be Violated

- Do not add a new "Variants" tab to the Report page's left-rail navigation — the `rpt-variance` section already exists and is the correct home.
- Do not render the diverge-reconverge diagram inside the Report tab — it is too wide for the report scroll column and would break the report's readable prose flow. Text analysis in the report, visual map in the canvas.
- Do not add a "Process Map" full-page route that duplicates the map inside the report. One map surface, one analysis surface.

---

## 6. Prioritized UX Changes

### 6.1 MVP Changes (Required Before Shipping Variant Visualization)

**M-1 — Replace the WorkflowVariantsMap interior with a React Flow canvas.**
File: `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx`
Replace the `<div className="absolute inset-0 flex overflow-hidden">` two-panel layout with a `ReactFlowProvider` / merged DFG canvas. The new `buildVariantFlowData()` adapter (a new file in `adapters/`) takes `NormalizedViewModel` + `DivergenceAnalysis` and outputs React Flow nodes/edges with backbone and branch tracks. This is the single highest-impact change. All other variant UX improvements depend on having the canvas.

**M-2 — Add multiple source handles to WorkflowDecisionNode.**
File: `apps/web-app/src/components/workflow-view/nodes/WorkflowDecisionNode.tsx`
Replace the single `Handle type="source" position={Position.Bottom}` with dynamic handles generated from the `DecisionPoint.conditions` array. Each outgoing branch gets its own handle positioned to the bottom-left or bottom-right of the diamond depending on the branch index. The handle IDs must be deterministic (e.g., `${nodeId}-branch-0`, `${nodeId}-branch-1`). The `buildFlowData` adapter in `flowAdapter.ts` must emit edges with matching `sourceHandle` IDs.

**M-3 — Change diamond node shape to a true diamond.**
File: `apps/web-app/src/components/workflow-view/nodes/WorkflowDecisionNode.tsx`
Replace the amber rounded rectangle with a diamond shape. CSS: a `<div style="transform: rotate(45deg); width: 56px; height: 56px">` centered inside a 200px × 200px bounding box, with the label text counter-rotated to stay horizontal. Keep the amber color. This is a visual correctness fix for BPMN convention and for the multi-handle change in M-2.

**M-4 — Fix positional index comparison in StepSequenceView with LCS alignment.**
File: `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx`, `StepSequenceView` function starting line 440
The `isDivergence` check at line 468 uses `standardCategories[i] === cat` where `i` is the step index in the current path. This must be replaced with LCS-based alignment using `divergenceAnalyzer.ts`'s `lcsAlignment` function (which is already exported). The corrected comparison marks a step as diverging only when it does not appear in the LCS alignment of the current path against the standard path.

**M-5 — Translate GroupingReason enum keys to plain language in the diverge block.**
File: `apps/web-app/src/components/detail/WorkflowReportPage.tsx`, lines 1525–1533 (backbone spine rendering)
The backbone pill labels call raw `cat` string values from `divergence.backbone[]`. These must pass through the plain-language mapping specified in `UX_FLOWS_PROCESS_VARIATION.md` §3.4. The mapping table should live in `workflow-view/constants.ts` (the `CATEGORY_STYLES` object already maps category keys to `style.label` strings — these labels are already the plain-language equivalents). The fix is: replace `{cat}` in the pill with `CATEGORY_STYLES[cat]?.label ?? cat`.

**M-6 — Add "View N runs →" evidence links.**
Files:
- `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx` (path card run count label, line 307)
- `apps/web-app/src/components/detail/WorkflowReportPage.tsx` (branch card run count label, lines 1549–1553)
Both run-count displays must become navigation links. The URL target is the runs list filtered by `evidenceRunIds` from `DivergenceBranch`. If the full runs list page is not yet shipped (row #106 WDC2-P07), the link can open a simple slide-over with the run IDs listed. The link is the minimum viable evidence-linking surface.

**M-7 — Fix the rpt-variance single-run state copy.**
File: `apps/web-app/src/components/detail/WorkflowReportPage.tsx`, line 1394–1399
Change "Run this workflow again to unlock variance, variant paths, and trend analysis." to "Run this process again to see whether different recordings take different paths." This matches the copy from `UX_FLOWS_PROCESS_VARIATION.md` §4.4 and is honest without implying the single-run state is broken.

### 6.2 Fast-Follow Changes (Ship Within 1–2 Iterations After MVP)

**FF-1 — Add the Variant DNA strip above the canvas in Variants mode.**
File: new component `apps/web-app/src/components/workflow-view/VariantDNAStrip.tsx`
Implement the horizontal frequency bar strip from `UX_FLOWS_PROCESS_VARIATION.md` §3.3. Props: `variants: ViewVariantPath[]`, `selectedVariantId: string | null`, `onSelectVariant: (id: string | null) => void`. Render above the React Flow canvas in `WorkflowVariantsMap`. State is lifted to `WorkflowPageShell`.

**FF-2 — Add cross-navigation links between Variants mode and rpt-variance section.**
Files: `WorkflowVariantsMap.tsx` toolbar area, `WorkflowReportPage.tsx` rpt-variance section
Implement the bidirectional links described in §5.2. These are `<a href>` anchors — no new state required.

**FF-3 — Implement the threshold filter for spaghetti state.**
File: `apps/web-app/src/components/workflow-view/WorkflowToolbar.tsx` + `WorkflowVariantsMap.tsx`
Add a "Show paths with N+ runs" filter when `branches.length >= 5`. The threshold is a controlled `useState` in `WorkflowPageShell`. Pass to the canvas adapter to filter branches before rendering. Default: 1 (show all).

**FF-4 — Single-variant positive state confirmation.**
File: `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx`
When `paths.length === 1 && paths[0].runCount >= 2`, show the "Consistent process" green badge and suppress the DNA strip. Current behavior renders a path card without this signal.

**FF-5 — Add evidence section to WorkflowInspectorPanel.**
File: `apps/web-app/src/components/workflow-view/WorkflowInspectorPanel.tsx`
Add a fourth section after "Friction Points": "Runs containing this step" — a compact list of 5 run IDs with timestamps. Uses `viewNode.frequency` and the evidence run IDs from the variant data. The "See all runs →" link targets the filtered runs list.

### 6.3 Later Changes (Post-MVP, Higher Complexity)

**L-1 — Diff strip for two-variant comparison.**
When `compareVariantId` is set, render the two-row LCS-aligned diff strip above the canvas showing A-only / B-only / shared blocks. This requires implementing the color-block layout in a new `VariantDiffStrip.tsx` component.

**L-2 — Decision type filter chips in the canvas toolbar.**
Implement the decision type filter chips from §3.4. Requires the Path E `DecisionPoint` data to be wired into the view model. Currently `DecisionPoint` entities exist in `entities.ts` but are not mapped in `viewModel.ts`'s `buildNormalizedViewModel`. The mapping in `viewModel.ts` (line 260–488) would need a new `decisionPoints` field on `NormalizedViewModel`.

**L-3 — Step coverage heatmap strip in rpt-variance.**
Implement the `WHERE PATHS DIVERGE` heatmap from `UX_FLOWS_PROCESS_VARIATION.md` §4.3. This is a separate from the canvas diagram — it lives in the Report tab. The data comes from per-step presence rates computed from the `DivergenceAnalysis.branches` output.

**L-4 — Merge Variants mode into Flow mode as an overlay toggle.**
The longer-term architecture is one map surface with variant overlay as an opt-in toggle, not a separate mode. This requires: a "Show variants" toggle button in the Flow mode toolbar, a shared canvas adapter that can render either the simple flow graph or the merged DFG, and mode state that persists across the toggle without re-mounting the canvas. This is the lowest-friction user experience but is a larger refactor than FF-level changes.

**L-5 — Variant rename (user-editable path labels).**
OQ-1 from `UX_FLOWS_PROCESS_VARIATION.md` §8. Deferred to v2 per that spec. No UX specification is ready for this yet.

---

## 7. Constraints Honored

- **Deterministic + stable layout:** All positioning algorithms described in §2.2 use ordinal arithmetic (integer × spacing constant). No `Date.now()`, no `Math.random()`. Same `DivergenceAnalysis` input → same canvas layout on every render.
- **Evidence-linked:** Every quantitative display of run-count or frequency described in this document is paired with a "View N runs →" link or inspector expansion that traces to `evidenceRunIds` from `DivergenceBranch` or `rawEvidence` from the Path E entities.
- **Hydration-safe:** All canvas components are already marked `'use client'` (e.g., `WorkflowCanvas.tsx` line 1, `WorkflowVariantsMap.tsx` line 1). New adapters and components described here follow the same pattern — pure functions for adapters (no hooks, safe for server), `'use client'` directive for interactive components.
- **Reuse React Flow and process-graph model:** No new canvas library. All changes extend existing React Flow node/edge registrations in `WorkflowCanvas.tsx` lines 40–48 and the view model type system in `viewModel.ts`.
- **Accessibility:** Keyboard navigation and ARIA labels are specified per interaction in §3. ARIA roles follow `UX_FLOWS_PROCESS_VARIATION.md` §3.4 (Tab to nodes, Arrow keys to navigate, Enter to open detail, Escape to close). The DNA strip is `role="listbox"` with `role="option"` per row per that spec §3.3.
- **Plain language:** All user-visible copy avoids `PathSignature`, `GroupingReason`, `variantEntropy`, `conformanceScore`, `divergeAfterIndex`. The translation table is in `UX_FLOWS_PROCESS_VARIATION.md` §5.2.

---

## 8. Open Questions Requiring Product Decision Before Implementation

**OQ-A — Variants mode rename to "Process Map" / overlay toggle (§5.2):** Is the "merge Variants into Flow as a toggle" approach (L-4) in scope for the first ship, or is the "keep 4-mode switcher but fix the Variants canvas" approach (MVP M-1) the target?

**OQ-B — Runs list target surface (M-6):** The "View N runs →" evidence links require a destination. Is the runs list from `UX_FLOWS_PROCESS_VARIATION.md` §5.4 (full-page filtered table) shipping with this feature, or does M-6 use a simpler inline drawer as an interim? Backlog row #106 WDC2-P07 is the dependency.

**OQ-C — Path E DecisionPoint data wiring:** The `DecisionPoint` entity in `entities.ts` carries the full decision taxonomy needed for M-2 and M-3. Is `DecisionPoint` data available in the API response shape passed to `WorkflowPageShell` at the time the variant map ships? If not, the decision diamond rendering must fall back to the existing `ViewNode.isDecisionPoint` flag from the current view model.

**OQ-D — Variant naming convention:** `UX_FLOWS_PROCESS_VARIATION.md` §7.3 and §8 OQ-5 leaves open whether to use "Main path / Path B / Path C" or "Variant 1 / Variant 2." This is a copy decision with growth-strategist review implications (D-4 clause 1 will fire on this surface). Confirm before shipping the DNA strip.
