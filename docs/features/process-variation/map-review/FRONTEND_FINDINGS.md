# Frontend Findings: Process Variation Map

**Scope:** Define-phase frontend code review for the variant-aware process map.
**Date:** 2026-06-10
**Status:** READ-ONLY review — no product code modified.

---

## 1. Rendering Architecture

### Layout algorithm — how nodes are positioned today

The `processMapBuilder.ts` in `packages/process-engine` computes all `position.x / y` values at ingest time and writes them into the `ProcessMapNode.position` field stored in the database. The layout algorithm is a trivial vertical spine:

```
NODE_X = 0 (all nodes share the same x)
y(start) = 0
y(taskNode[i]) = SYNTHETIC_NODE_HEIGHT + NODE_GAP + i * (NODE_HEIGHT + NODE_GAP)
  where NODE_HEIGHT = 84, NODE_GAP = 20
y(end) = y(last task) + NODE_HEIGHT + NODE_GAP
```

The frontend adapters consume these pre-baked positions directly. `viewModel.ts:buildNormalizedViewModel` passes `raw.position?.x ?? 0` / `raw.position?.y ?? 0` straight through into `ViewNode.position`. `flowAdapter.ts:buildFlowData` then passes those into the React Flow `FlowNode.position` field without modification.

This means the layout for the primary flow view is 100% deterministic and computed server-side (or at ingest time). React Flow is used purely as a renderer — it applies no automatic layout of its own. `nodesDraggable={false}` and `nodesConnectable={false}` are set on the `<ReactFlow>` instance, preventing user-side position mutation.

The swimlane adapter (`swimlaneAdapter.ts`) recomputes positions client-side for its horizontal-band layout, but uses only integer arithmetic over ordinal-sorted arrays. No `Date.now()`, `Math.random()`, or floating-point accumulation is involved.

### Nondeterminism audit

The only potential nondeterminism site in the canvas components is this line in `WorkflowCanvas.tsx:102`:

```typescript
setTimeout(() => reactFlowInstance.fitView({ padding: 0.15, duration: 300 }), 50);
```

This is in `resetView`, which is an interactive user action triggered by a toolbar button, not part of the initial render path. It does not affect node positions, edge paths, or serialized state — it is purely an animation timing hack and poses no hydration risk.

No `Date.now()`, `Math.random()`, or auto-layout library calls (ELK, dagre, d3-force) are present in the render path. `elkjs@^0.11.1` is installed in the web-app `package.json` but is not imported anywhere in the current codebase.

### Decision nodes — current state

The current `WorkflowDecisionNode.tsx` renders a styled rectangular node with a diamond SVG icon and an amber color scheme. The node type is inferred from `raw.isDecisionPoint === true` in `viewModel.ts`, which sets `nodeType: 'decision'` and maps to `WorkflowDecisionNode` in `flowAdapter.ts`. Decision nodes have a single `source` handle at the bottom and a single `target` handle at the top — they do not yet support multiple outgoing edges with per-branch frequency labels. This is the primary gap for the variant-aware map.

### Variants — current state

`variantAdapter.ts:buildVariantData` is a stub. When `model.variants` is empty (the common case — `buildNormalizedViewModel` always returns `variants: []`), it falls back to `extractVariantsFromIntelligence(intelligence)` which reads `intelligence?.variants?.variants[]` and maps them to `ViewVariantPath` objects. However, none of these variant objects are linked to node positions or branch structure. The `isDivergencePoint` and `opacity` fields on `VariantFlowNode` are set but never computed — `isDivergencePoint: false` and `opacity: 1.0` for every node unconditionally. The `WorkflowVariantsMap` component does not use React Flow at all; it renders a list-based comparison UI (path cards + step sequence list) rather than an actual graph.

---

## 2. Feasibility and Cleanest Implementation Path

### Goal

Render a single unified map that shows the backbone (standard path) with branch-off + reconverge structure, decision diamonds with per-branch frequency labels, and colored sub-paths that converge back to the backbone. Reuse the existing React Flow infrastructure.

### Is this feasible with the current setup?

Yes. The architecture is already set up for this. The key insight is that the backbone spine already exists as the single-run vertical layout, and the divergenceAnalyzer already computes exactly where branches leave and rejoin. The implementation path is to:

1. Introduce horizontal X-offset for branch nodes (off-spine positioning)
2. Add multiple source handles to decision/branch-point nodes
3. Synthesize branch path nodes and edges from `DivergenceAnalysis`

### Layout approach: deterministic layered DAG (ELK — already installed)

ELK (`elkjs@^0.11.1`) is already a dependency of the web-app but is not yet used. It is the correct tool here. ELK is a pure TypeScript/JavaScript library that computes deterministic layered-graph layouts. It is synchronous (the Web Worker path is optional; the direct synchronous API is sufficient for graphs up to ~100 nodes). It is already tested in the `@xyflow/react` ecosystem — the official xyflow ELK examples use it directly.

The alternative (dagre) is not installed. Given ELK is already present, do not add dagre.

**Why ELK and not a hand-rolled layout for the variant map:**

The current hand-rolled spine works because the graph is a strict linear sequence. Once branches are introduced, the graph becomes a DAG with parallel sub-paths of variable length. The backbone spine layout cannot accommodate this without either gaps (wasted vertical space) or overlapping edges. ELK's `layered` algorithm handles all of these cases correctly and deterministically, producing a stable x/y assignment that is snapshot-stable across renders.

**ELK usage pattern for this context:**

ELK is synchronous in the ` elk.layout()` form when using the synchronous API. However, ` elk.layout()` returns a Promise even in sync mode. The correct pattern is:

```typescript
// In a server-side adapter or useMemo (client only, deferred):
const elk = new ELK();
const elkGraph = toElkGraph(divergenceAnalysis, backbone, graph);
const laid = await elk.layout(elkGraph);
// parse back to React Flow nodes/edges
```

Since layout is deterministic given the same input, the result can be memoized via `useMemo` keyed on the divergence analysis version hash and the processGraphId. The layout should be computed once per workflow + divergenceAnalysis combination, not on every render.

**Avoiding hydration risk with ELK:** ELK must NOT run on the server. The map canvas is already `'use client'` (`WorkflowCanvas.tsx` line 1), so this is safe. The ELK layout result is purely presentational position data, not part of the serialized page payload, so there is no SSR/hydration mismatch risk.

### Deterministic layout guarantee

ELK produces the same output for the same input. To ensure this, the adapter must:
- Sort input nodes by a stable id (deterministic iteration order into ELK)
- Version the layout in a `layoutVersion` field keyed on `DIVERGENCE_ALGORITHM` + graph `computedAtMs`

This matches the Ledgerium determinism contract for all other pure adapters.

---

## 3. Wiring the DivergenceAnalyzer Output into the View Model

### Current data flow

```
processMapBuilder (packages/process-engine)
  → ProcessMap.nodes[].position (x=0, y=ordinal*152)
  → stored in DB
  → viewModel.ts:buildNormalizedViewModel
  → NormalizedViewModel.nodes[].position
  → flowAdapter.ts:buildFlowData
  → FlowNode[]  →  <ReactFlow nodes={} />
```

### New data flow for variant map

```
DivergenceAnalysis (intelligence-engine/divergenceAnalyzer)  [NEW INPUT]
  → variantMapAdapter.ts (NEW)
    receives: NormalizedViewModel + DivergenceAnalysis
    calls: ELK layout (async, memoized)
    returns: VariantMapAdapterOutput { nodes, edges, branches }
  → VariantMapCanvas.tsx (NEW React Flow canvas)
    renders: backbone nodes + branch nodes + decision diamonds
             + per-edge frequency labels
```

### Adapter changes needed

**New file: `apps/web-app/src/components/workflow-view/adapters/variantMapAdapter.ts`**

This replaces the current stub `variantAdapter.ts` for the graph-based variant view. It should:

1. Accept `NormalizedViewModel` and `DivergenceAnalysis` as inputs.
2. Build an ELK input graph:
   - Backbone nodes: one node per backbone step (map to existing `ViewNode` by `category` position index)
   - Branch nodes: one node per `DivergenceBranch.altSteps[i]` — these are category strings only; create synthetic `ViewNode`-like objects with `nodeType: 'task'`, `category: altSteps[i]`, `frequency: branch.frequency` (from `DivergenceBranch`)
   - Decision nodes: one node per branch divergence point (where `divergeAfterIndex` is unique). A single diverge-point that has N branches should yield one decision node with N outgoing edges.
   - Reconverge nodes: where `dfgConfirmedJoin === true`, render the target node with a join indicator (can be the existing backbone node, no new node required)
3. Build ELK edges connecting backbone → decision → branch steps → reconverge target
4. Call `elk.layout()` and parse the result back into `FlowNode[]` and `FlowEdge[]`
5. Return a typed `VariantMapAdapterOutput` with the positioned nodes and edges.

**Modification to `variantAdapter.ts`:** The current file should be retired or narrowed to the list-view data path (the `WorkflowVariantsMap` list component is still useful for the variants tab). The new `variantMapAdapter.ts` is the graph-view path.

**Extension to `useWorkflowViewModel.ts`:** Add an optional `divergenceAnalysis?: DivergenceAnalysis` field to `WorkflowViewModelResult`. The hook caller (the detail page or shell) should supply this when available (after `analyzeDivergence` has been called with the available variants + backbone). The hook should remain synchronous — the async ELK call is the canvas adapter's responsibility.

**Extension to `NormalizedViewModel`:** No schema change needed. The adapter reads from the existing fields (`nodes`, `edges`, `phases`) and the new `divergenceAnalysis` input.

### Decision node handle changes

`WorkflowDecisionNode.tsx` must be extended to support multiple source handles when used in the variant map. The cleanest approach is to add an optional `branchEdges?: Array<{ id: string; label: string; frequency: number; color: string }>` field to the node data. When present, render one `<Handle>` per branch edge with a `id={branchEdge.id}` and a `<EdgeLabelRenderer>` frequency chip. When absent (the existing single-run flow view), the node renders as today.

This is an additive change to the node data shape — backward compatible.

---

## 4. Performance and Spaghetti Handling

### Virtualization

React Flow's built-in viewport virtualization is already active. Nodes outside the viewport are not rendered. For variant maps with many branches (N > 20 nodes visible), this is sufficient.

The real risk is not node count but edge count. A fully connected DFG with 10 backbone steps and 5 branch variants can produce O(N*M) edges. The DFG cross-check edges should not all be rendered — only the primary structural edges (backbone + branch paths + decision-to-branch + branch-to-reconverge) should be React Flow edges.

### Top-N filtering

The `DivergenceBranch[]` array is already sorted by `runCount desc` (then by position, then content). The adapter should cap at **top 5 branches by runCount** for the initial MVP render, with a "show N more branches" affordance. This prevents spaghetti on workflows with many rare variants.

Threshold: branches with `frequency < 0.03` (less than 3% of runs) should be suppressed by default and shown only on explicit expansion. This is consistent with `reportDivergence.ts` which already uses frequency thresholds.

### Edge bundling

For branches that diverge at the same point, bundle the outgoing decision edges from the single decision node. ELK's layered algorithm handles edge bundling natively — no manual intervention needed. The key is to ensure the ELK graph has one decision node per diverge point (not one per branch), so ELK can bundle the outgoing edges automatically.

---

## 5. Hydration and Determinism Risks

### Current risks in the codebase

**None in the critical render path.** The position data comes from the database (computed deterministically at ingest), and the frontend adapters are pure functions. There are no `Date.now()`, `Math.random()`, or mutable state in `flowAdapter.ts`, `swimlaneAdapter.ts`, or `viewModel.ts`.

**Minor risk — `resetView` setTimeout (WorkflowCanvas.tsx:102):** Not a hydration risk (client-only interaction path), but flagged for completeness.

**Potential risk — `WorkflowVariantsMap` useState initialization:** The `useState` initializer on line 155 (`paths.find(p => p.isStandard)?.id`) computes a derived value inside a state initializer. This is fine for client-only components but would be a hydration risk if this component were server-rendered. It is already marked `'use client'` so this is safe.

### Risks introduced by the new variant map

**ELK must not run server-side.** ELK uses Web APIs internally. The `VariantMapCanvas.tsx` must be `'use client'` (as all canvas components already are) and the ELK layout call must be inside a `useMemo` or `useEffect` — not in a server component or during SSR. The adapter function that calls ELK must be called only from client components.

**ELK layout is async.** The `elk.layout()` call returns a Promise. Until the layout resolves, the component should render a loading state (skeleton or spinner). This is a new UI state that must be handled explicitly: `loading | error | ready`. The loading state should not flash on navigation since the layout can be cached by `processGraphId + divergenceAnalysisVersion`.

**Position stability.** ELK is deterministic given identical input. However, if the `DivergenceAnalysis.version` string changes (algorithm version bump), positions will change. This is intentional and correct behavior. The `version` field (`lcs-backbone/1.0.0#min1`) serves as the cache key.

**Edge path nondeterminism.** React Flow's `getSmoothStepPath` in `WorkflowEdge.tsx` is deterministic given fixed `sourceX, sourceY, targetX, targetY` — these are derived from ELK positions, so they are stable once ELK resolves.

**No `key` stability risk.** Branch nodes synthesized by the adapter should use stable keys derived from `branch.divergeAfterIndex + '|' + branch.reconvergeAtIndex + '|' + branch.altSteps.join('>')` — the same key formula already used in `reportDivergence.ts` and `divergenceAnalyzer.ts`. This prevents React key churn when variant data is refreshed.

---

## 6. Concrete Implementation Plan

### MVP (single iteration, ship-ready for variant-aware map)

**File-level scope:**

1. **NEW `apps/web-app/src/components/workflow-view/adapters/variantMapAdapter.ts`**
   - Pure TypeScript adapter (no React)
   - Inputs: `NormalizedViewModel`, `DivergenceAnalysis`
   - Uses ELK synchronous API to compute positions
   - Returns: `{ nodes: FlowNode[], edges: FlowEdge[], decisionNodes: DecisionFlowNode[], loading: false }` typed output
   - Top-N branch cap: 5 branches, frequency >= 0.03
   - ~150-200 LOC; triggers `system-architect` D-4 clause 2 adjacency

2. **NEW `apps/web-app/src/components/workflow-view/WorkflowVariantMapCanvas.tsx`**
   - Client component wrapping `ReactFlowProvider` (same pattern as `WorkflowCanvas.tsx`)
   - Uses `useAsync` or `useMemo` + Promise to resolve ELK layout
   - Handles `loading | error | ready` states explicitly
   - `nodesDraggable={false}`, `nodesConnectable={false}` (match existing pattern)
   - Registers `decisionNode`, `taskNode`, `terminalNode` node types (reuse existing)
   - ~120-150 LOC

3. **MODIFY `apps/web-app/src/components/workflow-view/nodes/WorkflowDecisionNode.tsx`**
   - Add optional `branchEdges?: Array<{ id: string; label: string; frequency: number; color: string }>` to `DecisionNodeData`
   - When present: render N labeled source handles positioned horizontally across the node bottom
   - When absent: render exactly as today (zero behavioral change for existing flow view)
   - ~+40 LOC additive

4. **MODIFY `apps/web-app/src/components/workflow-view/WorkflowModeSwitcher.tsx` (if exists) or the shell that selects between `WorkflowVariantsMap` and the new canvas**
   - Add routing logic: when `divergenceAnalysis` is available (N >= 2 variants with signatures), show `WorkflowVariantMapCanvas`; otherwise fall through to existing `WorkflowVariantsMap` list view
   - No behavioral change for single-run workflows

5. **NEW test: `variantMapAdapter.test.ts`**
   - Tests for top-N cap, frequency threshold, key stability, ELK position non-zero for N >= 2 branches
   - ~15+ substantive `it()` blocks (satisfies MR-006 Change C threshold)

### Fast-follow (iteration N+1)

6. **Edge frequency labels** — extend `WorkflowEdge.tsx` to render a frequency chip on branch edges (the `label` field already supports text labels via `EdgeLabelRenderer`; add a frequency percentage chip when `data.viewEdge.frequency` is present)

7. **Evidence run IDs panel** — clicking a branch edge opens the inspector with the `evidenceRunIds` list (links to individual run detail pages). This wires the "evidence-linked moat" into the UI. Requires extending `WorkflowInspectorPanel.tsx`.

8. **Backbone conformance callout** — surface `DivergenceAnalysis.conformingFrequency` as a chip above the canvas ("X% of runs follow this path exactly"), matching the report page's existing text treatment.

9. **ELK layout cache** — memoize ELK output in `sessionStorage` keyed on `processGraphId + divergenceAnalysisVersion` so re-opens of the same workflow do not re-run ELK.

---

## Summary of Gaps and Blockers

| Gap | Severity | Notes |
|---|---|---|
| ELK is installed but unwired | Blocker for graph-based variant layout | Zero code changes needed to the dependency — just import it |
| `variantAdapter.ts` is a stub | Blocker | Does not compute divergence points or branch positions |
| `WorkflowVariantsMap` has no React Flow canvas | Not a blocker for list view | The list view works correctly; the graph view is new surface |
| Decision nodes support only single outgoing edge | Blocker for variant map | Additive handle extension needed |
| `NormalizedViewModel.variants` is always `[]` | Blocker | `buildNormalizedViewModel` does not populate variants; `variantMapAdapter` receives `DivergenceAnalysis` directly (bypasses this) |
| ELK layout is async | New UI state to handle | Loading skeleton needed; no data risk |
| No test coverage for `variantMapAdapter` | Required before ship | Must satisfy MR-006 Change C ≥12 threshold |

No backend gaps were found. The `analyzeDivergence` function in `packages/intelligence-engine/src/divergenceAnalyzer.ts` is complete, deterministic, and already wired into `apps/web-app/src/lib/reportDivergence.ts`. The variant map adapter consumes this existing engine output without requiring any new backend work.
