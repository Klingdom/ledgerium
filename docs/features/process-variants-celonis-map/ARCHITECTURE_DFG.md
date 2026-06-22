# ARCHITECTURE — Celonis-style Frequency-Weighted Process Map (DFG)

**Status:** DESIGN SPEC (contract for frontend build). No product code in this artifact.
**Owner:** system-architect (D-4 clause 2: net-new pure module > 200 LOC exported across consumers).
**Surface:** Process Variants tab — new "Frequency Map" view slotting into the existing
Map/DNA/List toggle in `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx`.

## 0. What we are building

A single **Directly-Follows Graph (DFG)** rendered as a frequency-weighted process map, the
Celonis convention: nodes = activities; directed edges = "step A directly precedes step B";
node **and** edge carry a **frequency** (count of runs/cases traversing it). The dominant
("happy") path renders thick/dark; rare deviations thin/faint. A **coverage slider** filters by
frequency — at 100% every observed transition is visible; sliding down progressively hides the
rarest edges/nodes until only the happy path remains. Selecting a variant highlights its path.

This is **strictly additive**: it does NOT touch `variantFlowModel.ts` (the existing layered
branch-spine model) — it is a *parallel* aggregation that consumes the same `VariantInput[]`.

## 1. The DFG data contract (TypeScript-exact)

```ts
/** Schema version pin — bump on any field/semantic change; consumers assert this. */
export const DFG_SCHEMA_VERSION = 1 as const;

/** Stable, derived node identity. START/END are synthetic terminals. */
export interface DfgNode {
  /** Deterministic id. Terminals: '__start__' | '__end__'.
   *  Activity nodes: `node:${category}:${canonicalLabel}` (see §2 id derivation). */
  id: string;
  /** 'start' | 'end' | 'activity' — terminals anchor the happy path. */
  kind: 'start' | 'end' | 'activity';
  /** GroupingReason category (e.g. 'fill_and_submit'); '' for terminals. */
  category: string;
  /** Display label — REAL recorded title when present, else humanized category. Never fabricated. */
  label: string;
  /** Number of cases (runs) in which this activity occurs. Terminals = totalRuns. */
  caseCount: number;
  /** Sorted, de-duplicated union of run ids that traversed this node (the evidence link). */
  evidenceRunIds: string[];
}

/** A directly-follows transition observed between two activities (or terminal↔activity). */
export interface DfgEdge {
  /** Deterministic id: `edge:${sourceId}->${targetId}`. */
  id: string;
  sourceId: string;
  targetId: string;
  /** Number of cases (runs) in which source is immediately followed by target. */
  caseCount: number;
  /** Sorted, de-duplicated union of run ids that traversed this transition. */
  evidenceRunIds: string[];
}

/** The complete frequency-weighted process map. */
export interface DirectlyFollowsGraph {
  version: typeof DFG_SCHEMA_VERSION;
  /** Insertion-ordered, then stably re-sorted (see §2) — deterministic. */
  nodes: DfgNode[];
  edges: DfgEdge[];
  /** Total cases analyzed (== sum of variant.runCount). Denominator for coverage %. */
  totalRuns: number;
  /** max caseCount over edges (0 if none) — frontend normalizes stroke weight. */
  maxEdgeFrequency: number;
  /** max caseCount over activity nodes (0 if none) — frontend normalizes node weight. */
  maxNodeFrequency: number;
}
```

`evidenceRunIds` on every node and edge is the non-negotiable traceability chokepoint (§4):
no frequency may exist without a run-id set that produced it.

## 2. The pure builder

**Location (net-new):** `apps/web-app/src/lib/dfgModel.ts` — pure module, exported across
consumers (variantAdapter, WorkflowVariantsMap, tests). Its exported surface (3 functions +
types) exceeds 200 LOC, which is why system-architect owns the contract (D-4 clause 2).

```ts
export function buildDirectlyFollowsGraph(variants: VariantInput[]): DirectlyFollowsGraph;
```

`VariantInput` is **reused verbatim** from `variantFlowModel.ts:47-68` — same `id`, `runCount`,
`stepCategories`, `stepTitles?`, `evidenceRunIds?`. Do not redefine it; import it.

**Aggregation algorithm (exact):**

1. `totalRuns = Σ variant.runCount` over all variants (skip variants with empty `stepCategories`).
2. For each variant, build its ordered activity-id sequence:
   `seq = [__start__, n(0), n(1), …, n(L-1), __end__]` where `n(i)` is the activity node id at
   step `i`. **Node id derivation** (stable, collision-resistant): `node:${category}:${canonicalLabel}`
   where `canonicalLabel = stepLabel(variant, i)` lowercased, trimmed, internal whitespace collapsed
   to single spaces. `stepLabel` reuses the existing rule (`variantFlowModel.ts:272-277`): real
   `stepTitles[i]` when length > 2, else humanized category label. Two steps with identical
   (category, canonical label) collapse to the **same node** — this is the DFG merge that produces
   loops/convergence, exactly as Celonis merges repeated activities.
3. **Node aggregation:** for each *distinct* activity id appearing in `seq` (count a node ONCE per
   variant even if the activity repeats within that variant's path — `caseCount` is cases, not
   occurrences), add `variant.runCount` to that node's `caseCount` and union `variant.evidenceRunIds`
   into its `evidenceRunIds`. Terminals `__start__`/`__end__` get `caseCount = totalRuns`,
   `evidenceRunIds = ` union of all variants' evidence.
4. **Edge aggregation:** for each adjacent pair `(seq[k], seq[k+1])`, add `variant.runCount` to that
   edge's `caseCount` and union `variant.evidenceRunIds`. Edges are keyed by `(sourceId,targetId)`.
   Self-pairs that arise from a repeated merged activity (A→A) are retained — they are observed loops.
5. **Finalize determinism:**
   - `evidenceRunIds` on every node/edge: `[...new Set(ids)].sort()`.
   - **Node order:** sort by `caseCount` desc, then `id` asc; but pin `__start__` first and
     `__end__` last regardless of count.
   - **Edge order:** sort by `caseCount` desc, then `sourceId` asc, then `targetId` asc.
   - `maxEdgeFrequency = max(edge.caseCount, 0)`; `maxNodeFrequency = max(activity node.caseCount, 0)`
     (terminals excluded from the node max so they don't dominate normalization).
6. Empty input (0 variants with steps) → `{ version, nodes: [start,end], edges: [], totalRuns: 0,
   maxEdgeFrequency: 0, maxNodeFrequency: 0 }`. Never throw.

**Forbidden:** `Date.now()`, `Math.random()`, `Array.sort` without a total-order comparator,
`Set` iteration order as output order (always `.sort()` before emit). Same input ⇒ byte-identical graph.

## 3. The coverage-filter algorithm

```ts
export function filterDfgByCoverage(
  dfg: DirectlyFollowsGraph,
  activityCoverage: number,   // ∈ [0,1]
  connectionCoverage: number, // ∈ [0,1]
): DirectlyFollowsGraph;
```

Coverage is a **cumulative case-coverage** filter (Celonis semantics: "show the top transitions
that account for ≥ X% of cases"), NOT a percentile of distinct edges.

1. Clamp both coverage args to `[0,1]`.
2. **Edge selection:** rank edges by `caseCount` desc, tie-break `sourceId` asc then `targetId` asc.
   Walk the ranked list accumulating `caseCount`; keep edges until cumulative `caseCount /
   maxEdgeFrequency`-normalized **case coverage ≥ connectionCoverage**, where case coverage of a kept
   set = `(Σ kept caseCount) / (Σ all edge caseCount)`. Keep the **smallest prefix** whose ratio
   ≥ `connectionCoverage`. (At `connectionCoverage = 1` keep all edges; at `0` keep the single
   top edge — never empty.)
3. **Node selection:** same cumulative rule over activity nodes ranked by `caseCount` desc,
   tie-break `id` asc, threshold `activityCoverage`. Terminals are always kept.
4. **Happy-path connectivity guarantee (non-negotiable):** compute the happy path once — the
   highest-frequency `__start__ → … → __end__` walk (greedy: from each node follow its
   highest-`caseCount` outgoing edge, tie-break `targetId` asc, until `__end__`; guard against
   cycles by not revisiting a node). **Force-include** every node and edge on the happy path into
   the kept sets even if their coverage rank fell below threshold. This guarantees the filtered
   graph is never disconnected and always shows START→…→END.
5. **Prune dangling:** drop any kept edge whose source or target node was not kept; then drop any
   kept activity node that, after edge pruning, has no kept incident edge (terminals exempt). This
   prune is order-independent and applied to a fixpoint (at most 2 passes given the connectivity
   guarantee).
6. Re-emit a `DirectlyFollowsGraph` with recomputed `maxEdgeFrequency`/`maxNodeFrequency` over the
   kept sets, `totalRuns` unchanged, nodes/edges re-sorted per §2.5.

Two runs with identical args ⇒ byte-identical filtered graph: every step is a total-order sort or a
deterministic greedy walk with an explicit tie-break.

## 4. Determinism & traceability invariants

- **I-DFG-1 (evidence completeness):** `node.caseCount === sum of variant.runCount over variants
  whose evidence union populated it`, and `node.evidenceRunIds` is the sorted union of those runs.
  Same for edges. Tested by a golden-fixture assertion: every frequency traces to a run-id set.
- **I-DFG-2 (observed-only):** edges exist **only** for adjacency pairs observed in some variant's
  ordered sequence. No transitive/inferred edges. No edge may have `evidenceRunIds.length === 0`.
- **I-DFG-3 (determinism):** no `Date.now()`/`Math.random()`; all ordering via total-order
  comparators; `buildDirectlyFollowsGraph(x)` deep-equals itself across calls.
- **I-DFG-4 (terminal anchoring):** exactly one `__start__` and one `__end__`; happy path is always
  present in any filtered output (§3.4).
- **Legend honesty note (frontend must render):** "Edge and node thickness = number of recorded
  runs that took this transition. Frequencies are observed, not inferred. The coverage slider hides
  the rarest paths; the dominant path is always shown." No fabricated business conditions — same
  honesty bar as `variantFlowModel.ts:11-15` decisionLabel rule.

## 5. Reuse map

| Concern | Source (reuse) | Net-new |
| --- | --- | --- |
| Variant input model | `VariantInput` (`variantFlowModel.ts:47-68`) — import, don't redefine | — |
| Portfolio → input adapter | `portfolioIntelligenceToVariantInput` (`variantFlowModel.ts:668`) | — |
| Real step titles / durations | `analyzeWorkflowVariants` `variantStepTitles`/`variantStepDurations` (`intelligence.ts:561-578`) threaded via the existing maps | — |
| Step label rule (real-title-else-category) | `stepLabel` pattern (`variantFlowModel.ts:272-277`) — re-implement identically as a small private helper in `dfgModel.ts` | — |
| Category styling for nodes | `CATEGORY_STYLES` (`workflow-view/constants`) | — |
| Variant frequency/runCount/evidence | `ViewVariantPath` (`viewModel.ts:220-237`) for selection-highlight mapping | — |
| **DFG aggregation (node/edge case counts, directly-follows)** | — | **`buildDirectlyFollowsGraph`** |
| **Cumulative coverage filter + happy-path guarantee** | — | **`filterDfgByCoverage`** |
| React-Flow node/edge mapping for the frequency map | — | **`dfgToReactFlow` (frontend, §6)** |

The builder is fed by the **same path** that already populates the Variants tab: route →
`analyzeWorkflowVariants` → `portfolioIntelligenceToVariantInput(intel, titles, durations)` →
`VariantInput[]`. No new data fetch, no new DB read, no migration.

## 6. Module / sequencing plan

**Files to create:**

1. `apps/web-app/src/lib/dfgModel.ts` — pure module: types from §1, `DFG_SCHEMA_VERSION`,
   `buildDirectlyFollowsGraph`, `filterDfgByCoverage`. No React, no I/O.
2. `apps/web-app/src/lib/dfgModel.test.ts` — co-located golden tests (I-DFG-1..4; coverage
   monotonicity: lower coverage ⊆ higher coverage kept-sets; happy-path-always-present;
   byte-identical-across-two-runs; empty-input).
3. `apps/web-app/src/components/workflow-view/DfgFrequencyMap.tsx` — new React-Flow view
   (consumes the DFG; renders the slider). Slots into the existing Map/DNA/List toggle in
   `WorkflowVariantsMap.tsx` as a 4th mode ("Frequency Map").
4. `apps/web-app/src/components/workflow-view/adapters/dfgToReactFlow.ts` — pure mapping (below).

**Build order (each independently reversible):**
- Iter 1: `dfgModel.ts` + `dfgModel.test.ts` (the contract this spec defines — system-architect).
- Iter 2: `dfgToReactFlow.ts` + `DfgFrequencyMap.tsx` rendering + coverage slider (frontend-engineer).
- Iter 3: wire the 4th toggle in `WorkflowVariantsMap.tsx` + variant-select highlight + legend
  (frontend-engineer + growth-strategist D-4 clause 1 for slider/legend copy).

**Minimal React-Flow rendering contract** (`dfgToReactFlow(filtered: DirectlyFollowsGraph)`):

```ts
// React Flow node
{ id: DfgNode.id, type: 'dfgNode',
  data: { label: DfgNode.label, caseCount: DfgNode.caseCount, kind: DfgNode.kind,
          weight: DfgNode.caseCount / (dfg.maxNodeFrequency || 1),  // 0..1 fill darkness
          evidenceRunIds: DfgNode.evidenceRunIds },
  position: { x, y } }   // layout via existing layered helper or dagre; deterministic

// React Flow edge
{ id: DfgEdge.id, source: DfgEdge.sourceId, target: DfgEdge.targetId, type: 'dfgEdge',
  data: { caseCount: DfgEdge.caseCount,
          weight: DfgEdge.caseCount / (dfg.maxEdgeFrequency || 1),  // 0..1 → strokeWidth/opacity
          label: `${DfgEdge.caseCount} run${DfgEdge.caseCount !== 1 ? 's' : ''}`,
          evidenceRunIds: DfgEdge.evidenceRunIds } }
```

`weight ∈ [0,1]` drives the Celonis visual: `strokeWidth = 1 + weight*4`, `opacity = 0.25 +
weight*0.75`, node fill darkness ∝ weight. The slider's two values (activity / connection coverage)
call `filterDfgByCoverage(fullDfg, a, c)` then re-map — the full DFG is built once and memoized;
filtering is pure and cheap. Selecting a variant highlights by intersecting the variant's
`evidenceRunIds` with each node/edge `evidenceRunIds` (highlight where non-empty).

**Scope discipline:** additive only. Zero changes to `variantFlowModel.ts`, `viewModel.ts`,
`variantAdapter.ts`, `intelligence.ts`, Prisma, or API routes. The frequency map is a new toggle
mode; existing Map/DNA/List views are untouched and the feature is reversible by removing the toggle.
