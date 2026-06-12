# Process-Mapping Finalized Architecture — One Visio-Grade Render Pipeline

**Date:** 2026-06-12
**Author:** system-architect (Define-phase only — NO product code modified)
**Status:** FINAL. Consolidates and supersedes the three planning specs for implementation-sequencing purposes:
- `docs/features/process-mapping/visio/VISIO_ARCHITECTURE_REVIEW.md` (the contracts/sequencing doc — finalized here)
- `docs/features/process-mapping/visio/VISIO_LAYOUT_ROUTING_PLAN.md` (ELK option set + orthogonal routing — frozen here)
- `docs/features/process-mapping/visio/VISIO_VISUAL_SPEC.md` (shape/typography/color tokens — referenced, not re-specified)

**Verification basis (read-only, 2026-06-12):** every contract below was checked against live source:
`adapters/{viewModel.ts, flowAdapter.ts, swimlaneAdapter.ts}`, `WorkflowCanvas.tsx`, `WorkflowSwimlaneCanvas.tsx`,
`WorkflowModeSwitcher.tsx`, `nodes/{WorkflowTaskNode,WorkflowDecisionNode,WorkflowTerminalNode}.tsx`,
`edges/WorkflowEdge.tsx`, `lib/variantFlowModel.ts` (+ its 39-assertion test), `packages/process-engine/src/contentEnricher.ts`
(honesty fix CONFIRMED landed — title-regex fabrication removed at `detectDecisionPoints`, lines 572-583),
`packages/intelligence-engine/src/index.ts` (public API), `e2e/smoke/hydration.smoke.spec.ts` (smoke gate).

---

## 0. TL;DR — what is final

1. **One pipeline, four (soon six) modes.** Insert four pure stages between `NormalizedViewModel` and React Flow:
   `ShapeResolver → LayoutEngine → OrthogonalEdgeRouter → VisioCanvas`. Each mode is a **`LayoutProfile`**, not a canvas.
2. **Determinism is preserved by construction.** The proven Plan-B layered arithmetic already shipping in
   `variantFlowModel.ts` becomes the shared **synchronous fallback** for ALL modes; **ELK layered runs client-only on top**,
   swapping in via effect. SSR + first client render always use the sync fallback → no hydration mismatch.
3. **Honesty is now a single chokepoint.** The engine's fabricated-decision path was already removed (`contentEnricher.ts`).
   The remaining work is to make a node a `decision` **only** when `decisionProvenance ∈ {observed-divergence, observed-validation}`,
   and to surface a single-trace provenance notice. `variantFlowModel.ts` is and remains the honesty reference implementation.
4. **The two new views (BPMN-class + duration/value) are LayoutProfiles + adapters, NOT new canvases.** Section 2 proves the
   pipeline is already view-agnostic at the `LayoutInput`/`ShapeSpec`/`RoutedEdge` seams.
5. **Nothing breaks** because the refactor is *additive then switch-over*: new pure modules ship and are tested green first,
   then each canvas is pointed at them behind the existing `position` fallback, one mode at a time, each step independently
   shippable and gated by a named test. **Zero engine/extension determinism changes are required** (Section 3.6).

---

## 1. FINALIZED unified render pipeline

### 1.0 Current data flow (verified against source)

```
ProcessRun (1 run) ──> processMapBuilder ──> ProcessMap{nodes(+position y=ordinal,x=0),edges,phases}
                                                       │ viewModel.buildNormalizedViewModel
PortfolioIntelligence (N runs) ──┐                     ▼
   variantFlowModel.buildVariantFlowModel ───> NormalizedViewModel (ViewNode/ViewEdge/ViewPhase/ViewSystem/ViewVariantPath)
   (its OWN model w/ Plan-B layered x,y)               │
                                                       ▼
              flowAdapter            swimlaneAdapter            (systemsAdapter inline)        (variant → flowAdapter)
              position passthru      re-layout (lanes)          i*300 row                       position passthru
                    │                      │                          │                              │
               WorkflowCanvas      WorkflowSwimlaneCanvas       (systems canvas)              WorkflowCanvas
               vertical line        hand-rolled bands           single row                     Plan-B layered (good)
```

The seam is already correct — **every renderer consumes a `NormalizedViewModel`**. The defect is that each adapter invents
geometry + shape inline. Variant is the only mode with real layered layout. The fix lifts that one good layout to all modes.

### 1.1 Target data flow (FINAL)

```
NormalizedViewModel ─(a)─> [+ provenance fields]
        │
        ├─(b)─ ShapeResolver  : ViewNode × RenderMode → ShapeSpec (fixed size, ports)        [pure, sync]
        │
        ├─(c)─ LayoutEngine   : LayoutInput → LaidOutGraph                                    [sync fallback + async ELK]
        │        layoutFallback(input)            // SSR + first paint + ELK-fail (DETERMINISTIC, lifted from variantFlowModel)
        │        layoutElk(elk, input)            // client-only, authoritative
        │
        ├─(d)─ OrthogonalEdgeRouter : LaidOutGraph × ViewEdge[] × LayoutProfile → RoutedEdge[] [pure]
        │
        └────> VisioCanvas(model, mode, profile)  // ONE client component; existing 4 canvases become thin wrappers
```

Four pure stages, one renderer. Modes differ ONLY by `RenderMode` + `LayoutProfile`.

### 1.2 Stage (a) — the honest pure graph model

Keep `NormalizedViewModel` as the canonical graph. It is already mode-agnostic, non-null-defaulted, and its header promises
"future overlays add fields, not restructure." Add **additive** provenance fields (no restructure, no break to existing consumers):

```ts
// viewModel.ts — ADDITIVE on NormalizedViewModel (all existing fields preserved verbatim)
export interface NormalizedViewModel {
  // ...all existing fields unchanged...
  /** How many runs this model summarizes. 1 = single trace. Default 1 for engine path. */
  runCount: number;
  /** True iff decisions/branches are evidence-backed (≥2 runs analyzed). */
  isMultiRun: boolean;
  /** Static, time-free notice when isMultiRun === false (C-3). Empty string when multi-run. */
  provenanceNotice: string;
}

// viewModel.ts — ADDITIVE on ViewNode (default null preserves current behavior)
export interface ViewNode {
  // ...all existing fields unchanged...
  /**
   * Why this node is a decision — the single honesty discriminator:
   *  'observed-divergence' : ≥1 run took an alternate path here (variantFlowModel; sound)
   *  'observed-validation' : submit→error / data_entry→error in THIS run (contentEnricher A-i/A-ii; sound for THIS run)
   *  'inferred'            : heuristic only — NEVER renders a diamond (currently dead, kept as a guard)
   *  null                  : not a decision
   */
  decisionProvenance: 'observed-divergence' | 'observed-validation' | 'inferred' | null;
}
```

**Honesty rule the model enforces (the single chokepoint):**

> A node may have `nodeType === 'decision'` **only** when `decisionProvenance ∈ {'observed-divergence','observed-validation'}`.
> `decisionLabel` is observed-count or observed-validation language only — never a fabricated business condition.
> When `isMultiRun === false`, `provenanceNotice` is a fixed string (NOT time-derived) telling the user it is one trace of N.

Default values keep every existing producer correct without edits:
- `variantFlowModel.ts`: backbone decision nodes get `decisionProvenance: 'observed-divergence'`; `isMultiRun: true`,
  `runCount: safeTotal`, `provenanceNotice: ''`. (Its decision-count gate `decisionRunCounts > 0` already guarantees observed.)
- `viewModel.ts` (engine path): map `meta.decisionProvenance` if present, else derive — `meta.isDecisionPoint === true` →
  `'observed-validation'` (because `contentEnricher.detectDecisionPoints` now ONLY emits validation-gate decisions; the
  title-regex fabrication is already removed). `runCount: 1`, `isMultiRun: false`,
  `provenanceNotice: 'Single recording — branches appear once this workflow has multiple runs.'`

This stage stays **pure, sync, ELK-free, browser-free** — preserving unit-testability and existing determinism guarantees.

### 1.3 Stage (b) — ShapeResolver (`ViewNodeType → Visio shape`, fixed sizes)

A pure, total function. One mapping used by all modes. Replaces the inline
`viewNode.nodeType === 'decision' ? 'decisionNode' : ...` ternaries in `flowAdapter` (lines 57-59),
`swimlaneAdapter` (line 201), and the systems inline mapper.

```ts
// NEW: apps/web-app/src/components/workflow-view/render/shapeResolver.ts
export type RenderMode = 'flow' | 'variant' | 'swimlane' | 'systems' | 'bpmn' | 'duration';

export type VisioShape =
  | 'terminator'   // start/end — pill/stadium
  | 'process'      // task — Visio process rectangle (borderRadius 3)
  | 'decision'     // diamond/gateway — ONLY for observed decisions
  | 'alternate'    // exception/error — process rect, red rail
  | 'subprocess'   // system node (systems map) — double-struck rect
  | 'event'        // BPMN circle event — reserved, new-view-ready
  | 'data';        // parallelogram (duration/value annotation) — reserved, new-view-ready

export interface ShapeSpec {
  shape: VisioShape;
  /** Intrinsic size BEFORE layout — layout reserves this EXACT box. Fixed per (shape,mode); NEVER label-length-derived. */
  width: number;
  height: number;
  /** React Flow node component key. Maps 1:1 onto the existing registered nodeTypes. */
  rfType: 'taskNode' | 'decisionNode' | 'terminalNode' | 'systemNode';
  /** Ports the router may attach to, in mode-direction terms. */
  ports: { in: 'top' | 'left'; out: 'bottom' | 'right' };
}

/** Total + deterministic. Truth table is the only source of shape truth. */
export function resolveShape(node: ViewNode, mode: RenderMode): ShapeSpec;
```

Truth table (final; total over `ViewNodeType × decisionProvenance × RenderMode`):

| `nodeType` | provenance | mode | → shape | width × height | rfType |
|---|---|---|---|---|---|
| `start` / `end` | — | any | `terminator` | 160 × 44 | `terminalNode` |
| `decision` | `observed-*` | flow/variant/bpmn | `decision` | 160 × 160 (pre-rotation box) | `decisionNode` |
| `decision` | `inferred` / `null` | any | `process` (DEMOTE) | 260 × 72 | `taskNode` |
| `exception` | — | any | `alternate` | 260 × 72 | `taskNode` |
| `task` | — | systems | `subprocess` | 220 × 84 | `systemNode` |
| `task` | — | swimlane | `process` | 280 × 88 | `taskNode` |
| `task` | — | flow/variant/bpmn | `process` | 260 × 72 | `taskNode` |
| `task` | — | duration | `data` (parallelogram) | 240 × 76 | `taskNode` |

Sizes are the **single source of layout truth** and are imported from `VISIO_VISUAL_SPEC` token constants — never measured
from DOM/font metrics (font metrics vary by machine and would break byte-identity; `VISIO_LAYOUT_ROUTING_PLAN §1.3` anti-footgun).
Visual styling (colors, accent rail, typography) stays in the node components; the resolver decides **shape + reserved box + ports only**.

### 1.4 Stage (c) — LayoutEngine (deterministic Plan-B fallback lifted to ALL modes + ELK on top)

One engine, two implementations behind one contract. **Plan-B fallback is the proven `variantFlowModel.ts` arithmetic,
generalized.** ELK layered runs client-only and authoritative.

```ts
// NEW: apps/web-app/src/components/workflow-view/render/layoutEngine.ts
export interface LayoutProfile {
  mode: RenderMode;
  direction: 'RIGHT' | 'DOWN';      // FINAL: RIGHT for all flow-like modes (see §1.8 decision)
  laneKey: 'none' | 'system' | 'phase' | 'value-band';  // 'value-band' reserved for the duration view
  spineHint?: string[];             // node ids to keep collinear (the backbone)
}

export interface LayoutInputNode { id: string; shape: ShapeSpec; lane?: string; }
export interface LayoutInputEdge { id: string; source: string; target: string; }
export interface LayoutInput {
  nodes: LayoutInputNode[];   // FROZEN order — never re-sorted with a partial comparator
  edges: LayoutInputEdge[];   // FROZEN order
  profile: LayoutProfile;
}

export interface LaidOutGraph {
  positions: Record<string, { x: number; y: number }>;          // top-left origin (ELK + React Flow agree)
  bends?: Record<string, Array<{ x: number; y: number }>>;      // ELK orthogonal bend points, present only when source==='elk'
  laneBands?: Array<{ key: string; x: number; y: number; width: number; height: number }>;
  source: 'fallback' | 'elk';                                   // for telemetry + tests
}

/** SYNC, pure, deterministic. Used for SSR + first paint + ELK failure. Integer arithmetic only. */
export function layoutFallback(input: LayoutInput): LaidOutGraph;

/** ASYNC, client-only. ELK 'layered' under the FROZEN option set. Resolves to authoritative layout. */
export function layoutElk(elk: ElkInstance, input: LayoutInput): Promise<LaidOutGraph>;

/** Deterministic identity of a layout problem — topology + shape sizes + direction + lanes ONLY. */
export function layoutSignature(input: LayoutInput): string;
```

**`layoutFallback` generalizes the variant builder's Plan-B layered layout** (`variantFlowModel.ts` lines 125-244):
integer layer = backbone/topological rank; within-layer lane by greedy interval coloring in deterministic ranked order;
head/tail edge-omission preserving forward-only. Lifting it gives flow/swimlane/systems the same collision-free layered
positions variant already has — instead of vertical-stack / `i*300`. This single change makes all modes Visio-grade
synchronously, with zero async risk.

**`layoutElk`** runs ELK `layered` under the FROZEN option set (§1.6). `laneKey` is how swimlane/systems/duration are the
*same engine with a different grouping key* — not a new file. `spineHint` carries backbone ids for collinearity.

**Determinism contract (must hold):** byte-identical `LayoutInput` (frozen node order, frozen edge order, fixed shape sizes)
⇒ byte-identical `LaidOutGraph`. Fallback is integer arithmetic; ELK is order-deterministic under the frozen option set with
no randomized pass. **No `Date`/`Math.random` in either**, and `variantDetector.computedAt` (the one engine timestamp) is
excluded from `layoutSignature` by construction (signature is topology + sizes only).

### 1.5 Stage (d) — OrthogonalEdgeRouter

```ts
// NEW: apps/web-app/src/components/workflow-view/render/edgeRouter.ts
export interface RoutedEdge {
  id: string; source: string; target: string;
  /** Orthogonal polyline: source port → bends → target port. Fed to the custom edge as data.elkPoints. */
  path: Array<{ x: number; y: number }>;
  kind: 'sequence' | 'decision' | 'exception' | 'handoff';
  label: string;          // observed-count / boundary label — NEVER fabricated (passthrough of ViewEdge.label)
  forward: true;          // asserted: in RIGHT mode targetX >= sourceX (forward-only invariant)
}
export function routeEdges(laidOut: LaidOutGraph, edges: ViewEdge[], profile: LayoutProfile): RoutedEdge[];
```

- `source === 'elk'` → consume `bends[edgeId]` (true orthogonal Visio routing).
- `source === 'fallback'` → compute deterministic Manhattan elbows from port positions (the `manhattanRight`/`manhattanDown`
  helpers from `VISIO_LAYOUT_ROUTING_PLAN §7`). **Both feed the same `data.elkPoints` channel the custom edge already
  consumes** — so `WorkflowEdge.tsx` is written once and works for ELK and fallback identically.
- **Forward-only invariant enforced HERE for all modes** (currently enforced only inside `variantFlowModel.ts` lines 508-515).
  The router drops/repairs any residual backward leg; covered by the generalized "all edges flow forward" test.
- `handoff` kind = lane crossing (currently computed inline in `swimlaneAdapter` lines 264-279); lifted here so it is one rule.

### 1.6 The FROZEN ELK config (final)

One module owns these. Every mode and every test imports the identical strings. Any change is a layout-behavior change and
re-pins the determinism tripwire snapshot.

```ts
// NEW: apps/web-app/src/components/workflow-view/render/elkOptions.ts (FINAL)
export type ElkDirection = 'RIGHT' | 'DOWN';

export function elkGraphOptions(direction: ElkDirection): Record<string, string> {
  return {
    'elk.algorithm': 'layered',
    'elk.direction': direction,
    'elk.edgeRouting': 'ORTHOGONAL',                              // populates edge.sections[].bendPoints

    'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',           // deterministic
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',   // deterministic, fixed sweeps
    'elk.layered.crossingMinimization.semiInteractive': 'true',   // input order = tie-break seed (kills run-to-run variance)
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES', // initial order = INPUT order, not random shuffle
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    'elk.layered.nodePlacement.favorStraightEdges': 'true',
    'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',          // DFS over edges in input order

    'elk.layered.spacing.nodeNodeBetweenLayers': '80',
    'elk.spacing.nodeNode': '48',
    'elk.layered.spacing.edgeNodeBetweenLayers': '32',
    'elk.spacing.edgeEdge': '16',
    'elk.layered.spacing.edgeEdgeBetweenLayers': '16',
    'elk.padding': '[top=32,left=32,bottom=32,right=32]',

    'elk.layered.unnecessaryBendpoints': 'true',                  // clean elbows
    'elk.layered.mergeEdges': 'false',                            // keep each observed edge distinct (honesty)
    // EXPLICITLY UNSET (do not add): elk.layered.thoroughness (randomized restarts), INTERACTIVE randomization.
  };
}

export const SPINE_NODE_OPTIONS: Record<string, string> = {
  'elk.layered.priority.straightness': '10',
  'elk.layered.priority.shortness': '10',
};
```

**Determinism proof (per pass):** cycle-breaking `DEPTH_FIRST` (DFS in input order, no random); layering `NETWORK_SIMPLEX`
(deterministic, ties by node/edge order); crossing-min `LAYER_SWEEP` + `considerModelOrder=NODES_AND_EDGES` +
`semiInteractive=true` (the ONLY phase ELK can randomize — pinned to input order, no thoroughness restarts); node placement
`NETWORK_SIMPLEX` (deterministic). Therefore byte-identical input ⇒ byte-identical `x/y` + `bendPoints`. Node `width/height`
MUST be passed explicitly (from `ShapeSpec`), never DOM-measured.

### 1.7 The single renderer — VisioCanvas

```ts
<VisioCanvas
  model={NormalizedViewModel}
  mode={RenderMode}              // 'flow' | 'variant' | 'swimlane' | 'systems' | 'bpmn' | 'duration'
  profile={LayoutProfile}        // derived from mode by a pure profileForMode(mode) table
/>
```

Execution order inside `VisioCanvas` (client component):
1. `resolveShape` per node (sync).
2. `layoutFallback(input)` (sync) → first-paint positions. **This is the SSR + first-client-render layout.**
3. `useElkLayout(input)` in a `useEffect` keyed on `layoutSignature(input)` → ELK runs client-only, swaps in authoritative
   positions + bends. ELK constructed once via `useRef`; imported inside the effect/client only (never at module scope).
4. `routeEdges(laidOut, edges, profile)` → orthogonal `data.elkPoints` per edge.
5. React Flow render with the shared `nodeTypes` (already registered: `taskNode`, `decisionNode`, `terminalNode`; add
   `systemNode`) and one custom `OrthogonalEdge` (the existing `WorkflowEdgeComponent`, which already accepts an
   `elkPoints`-style `data` channel and falls back to `getSmoothStepPath`).

`WorkflowCanvas` / `WorkflowSwimlaneCanvas` / systems / variant become thin wrappers that pick a `mode` + `profile` and pass
the model — eventually deletable (P2). ELK client-only ⇒ SSR/hydration only ever sees the deterministic fallback (§4).

### 1.8 Two FINAL decisions (resolving the open questions in the review §6)

- **Direction: RIGHT for all flow-like modes.** The review left DOWN-vs-RIGHT open; the layout plan recommended DOWN. FINAL:
  **RIGHT** — one direction, one mental model, one router. Swimlane is already RIGHT; variant is already RIGHT (x = layer).
  Flow currently lays out vertically via the engine's `position.y = ordinal`; lifting flow onto `layoutFallback` makes it RIGHT
  for free. This eliminates the per-mode handle/router special-casing the visual spec had to add for DOWN.
- **Single-run validation decisions (A-i/A-ii): keep as diamonds, labeled `observed-validation`.** They reflect a real observed
  submit→error in this run. Distinct label treatment ("Submission rejected — validation failed in this run") from
  observed-divergence. They are NOT demoted. Only `inferred` (now dead) demotes to `process`.

---

## 2. Two NEW VIEWS slot into the SAME pipeline (view-agnostic by construction)

The PM is selecting two new views in parallel. Assume **(A) a BPMN-class view** (explicit gateways/events, pool/lane structure)
and **(B) a duration/value view** (time- or value-banded layout, e.g. nodes grouped by cycle-time band or by value-add vs waste).
Both slot in as **`LayoutProfile` + a thin adapter projection**, never a new canvas. The seam already supports this:

| New view | RenderMode | LayoutProfile | Adapter work | ShapeResolver additions | Pipeline reuse |
|---|---|---|---|---|---|
| **BPMN-class** | `'bpmn'` | `{direction:'RIGHT', laneKey:'phase'\|'system', spineHint:backbone}` | reuse `viewModel`/`variantFlowModel` graph; map BPMN gateway→`decision` (provenance `observed-*` only), BPMN event→`event` shape | `event` (circle) already reserved in the shape union; gateways reuse `decision` | layoutFallback + layoutElk + edgeRouter unchanged |
| **Duration/value** | `'duration'` | `{direction:'RIGHT', laneKey:'value-band'}` | a pure `durationAdapter` that buckets `ViewNode.durationMs` (or an automation/value score) into band lanes; emits `lane` keys | `data` (parallelogram) already reserved | layoutFallback `laneKey:'value-band'` groups by band exactly like swimlane groups by system; edgeRouter handoff = cross-band |

**Why no new canvas is needed:** the four pure stages take `ViewNode`/`ViewEdge` + a `LayoutProfile`. A new view is (1) a new
`RenderMode` literal, (2) optionally a new `laneKey` value, (3) one or two new `VisioShape` values **already reserved** in the
union (`event`, `data`), (4) a pure adapter that produces a `NormalizedViewModel` with the right `lane` grouping. The honesty
chokepoint is inherited automatically: a BPMN gateway imported from a modeled file would carry `decisionProvenance` — and if it
is a modeled (not observed) gate, it must use a DISTINCT shape/provenance so it never masquerades as observed-divergence
(see §6 provenance flags — this is the seam that keeps imported templates from corrupting the observed-evidence invariant).

**`WorkflowModeSwitcher.tsx` impact:** add the two modes to the `MODES` array + `MODE_ICONS` + `VIEW_MODE_LABELS`. No structural
change — the switcher already maps a `WorkflowViewMode` union to buttons. The `WorkflowViewMode` type widens additively.

---

## 3. "NOTHING BREAKS" code analysis

Every existing contract/test/invariant the refactor must preserve, with regression risk + mitigation per planned change.
The refactor strategy is **additive-then-switch-over**: ship new pure modules (tested green) first; then repoint each canvas
behind the existing `position` fallback one mode at a time. No stage deletes a contract until its replacement is proven at parity.

### 3.1 Contracts that MUST be preserved verbatim (no signature change)

| # | Contract | Where | Consumed by | Preserve how |
|---|---|---|---|---|
| K-1 | `NormalizedViewModel` shape | `viewModel.ts` | flowAdapter, swimlaneAdapter, both canvases, variantFlowModel (returns one), inspector | New fields are **additive + defaulted**; never remove/rename a field. Existing field types unchanged. |
| K-2 | `ViewNode` / `ViewEdge` / `ViewPhase` / `ViewSystem` / `ViewVariantPath` | `viewModel.ts` | all adapters + nodes + edge | Additive only (`decisionProvenance`, defaulted `null`). |
| K-3 | `buildVariantFlowModel(input): NormalizedViewModel \| null` | `variantFlowModel.ts` | variant renderer | Output stays byte-identical until P1-3 switches its layout to `layoutFallback` — gated by a byte-equality test (§5). |
| K-4 | `buildNormalizedViewModel(processOutput)` | `viewModel.ts` | flow/swimlane/systems | Untouched except additive provenance defaults. |
| K-5 | `FlowNode`/`FlowEdge`/`FlowPhaseGroup`/`FlowAdapterOutput` | `flowAdapter.ts` | WorkflowCanvas | Preserved until VisioCanvas reaches flow parity; then wrapper-only. |
| K-6 | `SwimlaneAdapterOutput` + lane bands | `swimlaneAdapter.ts` | WorkflowSwimlaneCanvas | Preserved; lane derivation moves to `laneBands` only after parity test. |
| K-7 | Registered `nodeTypes`/`edgeTypes` keys | both canvases | React Flow | Keys are stable (`taskNode`/`decisionNode`/`terminalNode`/`laneHeader`/`workflowEdge`/`handoffEdge`); add `systemNode` additively. |
| K-8 | `WorkflowEdgeComponent` `data.elkPoints` fallback to `getSmoothStepPath` | `edges/WorkflowEdge.tsx` | both canvases | The custom edge already falls back when `elkPoints` absent — fallback path is the SSR/first-render path; do not remove it. |
| K-9 | Intelligence-engine public API (`analyzeDivergence`, `detectVariants`, `analyzeVariance`, `detectBottlenecks`, …) | `intelligence-engine/src/index.ts` | variantFlowModel + web-app | **READ-ONLY consumer.** Refactor consumes; never edits engine. |
| K-10 | `contentEnricher.detectDecisionPoints` honesty (title-regex fabrication removed) | `process-engine` | viewModel `meta.isDecisionPoint` | **Already landed.** Refactor must not re-introduce a fabricated-decision path; the chokepoint (§1.2) enforces it. |

### 3.2 Tests + invariants that gate the refactor (existing, MUST stay green)

`variantFlowModel.test.ts` (39 assertions) is the acceptance harness for stages (a),(b),(c-fallback),(d). The load-bearing ones:

| Invariant | Existing test (`variantFlowModel.test.ts`) | Stage it guards |
|---|---|---|
| **Determinism — byte-identical nodes + positions on repeated calls** | "produces byte-identical nodes and positions on repeated calls" (L278) | (a),(c) fallback |
| **Permutation invariance** (variant input order irrelevant) | "is permutation-invariant" (L288) | (a) |
| **Forward-only edges** (`targetX >= sourceX`) | "all edges flow forward — no backward arrows" (L208, L316) | (c),(d) |
| **Honest decision labels** (`\d+ of \d+ run`; no if/else/when/then/condition/gate) | "decision labels use observed-count language" (L229, L333) | (a),(b) |
| **Decision-at-real-divergence only** (no phantom diamond) | "inserts decision nodes at real divergence points" (L189) | (a),(b) |
| **Honest edge frequency labels** (`N runs · X%`; no if/else/when/condition) | "edges carry honest frequency labels" (L217) | (d) |
| **Real step labels** (not category fallback) | "uses real step labels on backbone" (L180), "branch nodes use real step titles" (L202) | (a) |
| **Referential integrity** (unique ids; edges reference existing nodes; branch rejoins spine) | L256-272, L325 | (a),(d) |
| **Guards** (null for <2 variants / no steps) | L129-153 | (a) |

`hydration.smoke.spec.ts` gates flash-safety/SSR (§3.3). The `exactOptionalPropertyTypes` compiler invariant gates the
optional-field handling (§3.4).

### 3.3 Hydration / flash-safety analysis (where ELK/async creates risk)

The repo had a **hydration-crash crisis** (the smoke gate exists specifically to catch React #418/#423/#425). ELK is async →
this is the single highest-risk axis. The fallback removes the risk by construction:

| Risk | Severity | Mitigation |
|---|---|---|
| `elkjs` imported at module scope in an SSR'd file → ELK code runs server-side / pulls bundle into SSR | **HIGH** | Import ELK **only inside the client effect / `useElkLayout`** (`'use client'`). `layoutFallback` is the only layout used during SSR + first client render. Lint rule / code-review gate: no `elkjs` import outside `render/useElkLayout.ts` + tests. |
| Server markup ≠ first-client markup because ELK ran on one side only | **HIGH** | SSR has `elkResult === null` → fallback positions. First client render ALSO has `elkResult === null` (effect hasn't run) → identical markup → no mismatch. ELK swaps in AFTER mount as a one-time settle. |
| Model carries a value that differs server vs client (`Date.now()`, random) | **HIGH** | `provenanceNotice` is a STATIC string, not time-derived. `layoutSignature` excludes `variantDetector.computedAt`. No `Date`/`Math.random` in stages (a)-(d). |
| Flash of empty canvas before ELK settles | **MED** | First paint uses fallback positions (non-empty for every mode). Add the missing flash-safety smoke test (none exists today): assert first render with `elkResult===null` yields non-empty positions for every mode. |
| ELK throws / unsupported graph → null layout → blank canvas | **MED** | `useElkLayout` `.catch` keeps the fallback positions (never clears to null on failure). Canvas always has a valid layout. |
| ELK version bump silently shifts geometry | **LOW** | Determinism test asserts **run-to-run equality of the live option set + positions** (robust to version) as the gate; a numeric snapshot is a secondary tripwire that flags (not blocks) a version-induced geometry move for review. |

### 3.4 `exactOptionalPropertyTypes` analysis

The codebase compiles under `exactOptionalPropertyTypes` (evidenced by `variantFlowModel.ts` lines 689-700: optional fields are
set conditionally — `if (titles !== undefined) item.stepTitles = titles` — rather than assigned `undefined`, and `VariantInput`
declares `stepTitles?: string[] | undefined` explicitly). The refactor must follow the same discipline:

- New optional/nullable fields (`decisionProvenance`) are declared as `... | null` (a value), not bare optional — so they are
  always present, never `undefined`. **Risk: LOW.** Mitigation: default `null` at every producer; no conditional-assign needed.
- `LaidOutGraph.bends` is `Record<...> | undefined` only at the type level but is **always assigned** (present when ELK, absent
  key otherwise) — consumers must use `laidOut.bends?.[id]`, never assume presence. **Risk: LOW.**
- Any new adapter that forwards optional `ViewNode` fields must use the conditional-assign pattern (`if (x !== undefined) o.x = x`)
  to satisfy `exactOptionalPropertyTypes`. **Risk: MED** if a contributor assigns `undefined` directly. Mitigation: typecheck is
  CI-gated; the pattern is already established in `portfolioIntelligenceToVariantInput`.

### 3.5 Per-change regression matrix

| Planned change | Files | Risk | Mitigation / gating test |
|---|---|---|---|
| C1: add `decisionProvenance` + `runCount`/`isMultiRun`/`provenanceNotice` (additive, defaulted) | `viewModel.ts`, `variantFlowModel.ts` | **LOW** | Defaults preserve behavior. `variantFlowModel.test.ts` stays green (extend honesty test to assert provenance). Typecheck. |
| C2: `ShapeResolver` (new pure module) | `render/shapeResolver.ts` | **LOW** | New file; not yet wired. NEW `shapeResolver.test.ts` truth-table totality (every `ViewNodeType × provenance × mode` → exactly one shape; `inferred`→`process`). |
| C3: `layoutFallback` (lift Plan-B from variantFlowModel) | `render/layoutEngine.ts` | **MED** | New file; variant switches to it in C7 only after a **byte-equality test** vs current `variantFlowModel` positions. Determinism + permutation + forward-only tests reused. |
| C4: `OrthogonalEdgeRouter` (new pure module) | `render/edgeRouter.ts` | **LOW** | New file. Generalize forward-only + handoff predicate. NEW `edgeRouter.test.ts`: orthogonality (each segment axis-aligned), forward-only, handoff = lane crossing. |
| C5: `elkOptions` + `layoutElk` + `useElkLayout` | `render/elkOptions.ts`, `render/layoutEngine.ts`, `render/useElkLayout.ts` | **MED** | Client-only import (§3.3). NEW `layoutEngine.elk.test.ts`: run-to-run byte-equality of positions + bends; orthogonality; spine collinearity. ELK runs in Vitest/node (bundled). |
| C6: `VisioCanvas` shell | `render/VisioCanvas.tsx` | **MED** | New component behind fallback. NEW flash-safety smoke test: first render (`elkResult===null`) non-empty positions per mode. |
| C7: point variant renderer at `VisioCanvas`/`layoutFallback` | variant wrapper | **MED** | Byte-equality gate vs current positions; all 39 `variantFlowModel.test.ts` assertions green; hydration smoke green. |
| C8: point flow at pipeline (stop using engine `position.y`) | `WorkflowCanvas.tsx` | **MED** | Behind flag for one release (review §6.3). Phase-group bounds recomputed from `laneBands`. Hydration smoke green. |
| C9: point swimlane at pipeline (`laneKey:'system'`) | `WorkflowSwimlaneCanvas.tsx`, `swimlaneAdapter.ts` | **MED** | Lane y-pin per `VISIO_LAYOUT_ROUTING_PLAN §4.1` (ELK x, pinned lane y). Single-system guard preserved. Handoff predicate via router. |
| C10: point systems at pipeline (`subprocess` shape, `systemNode`) | systems canvas | **LOW** | Smallest graph; systems already deduped in `viewModel`. |
| C11: add BPMN + duration modes | `shapeResolver.ts` (reserved shapes), `durationAdapter.ts`, `WorkflowModeSwitcher.tsx` | **LOW** | Additive `RenderMode` literals + reserved shapes; switcher widens additively. |
| C12: delete per-mode adapters | adapters | **MED** | Last; only after all parity tests green and the one-release flag window closes. |

### 3.6 Changes touching extension / engine determinism — FLAGGED

**None required.** Explicitly:
- **Extension (`apps/extension-app/`):** ZERO changes. The Extension Reliability Invariant is untouched — no `content/`,
  `background/`, `manifest.json`, or `{normalization,segmentation,policy}-engine` edits. The render pipeline lives entirely in
  `apps/web-app/src/components/workflow-view/`.
- **`packages/process-engine` / `packages/intelligence-engine`:** consumed READ-ONLY. The honesty fix in `contentEnricher.ts`
  is already landed; the refactor must NOT re-introduce a fabricated-decision path (enforced by the §1.2 chokepoint, not by
  engine edits). `variantDetector.computedAt` non-determinism (`new Date().toISOString()`) is **left as-is** and simply
  excluded from `layoutSignature` — no engine change. **If any future step proposes editing either engine, that is a
  determinism-sensitive change and must be flagged + re-gated against the engine's own test suites; this plan requires none.**

---

## 4. Determinism + hydration-safety + honesty — invariants and where ELK creates risk

### 4.1 Determinism (load-bearing — the app had a hydration crash crisis)
- **No `Date`/`Math.random`/unstable sort in stages (a)-(d).** Fallback = integer arithmetic; ELK = order-deterministic under
  the frozen option set. `variantDetector.computedAt` excluded from `layoutSignature`.
- **Frozen input order.** Stage (a) emits deterministic node/edge order (variant `ranked.sort` total-order tie-break L116-123;
  engine ordinal order). `LayoutInput` projection is order-preserving — never re-sort with a partial comparator, never let a
  `Map`/`Set` dedup lose insertion order. Locked by "byte-identical on repeated calls" + "permutation-invariant" tests.
- **Fixed shape sizes** from `ShapeSpec` (§1.3) — never DOM/font-measured. This is the single biggest ELK determinism footgun.

### 4.2 Hydration-safety — exactly where ELK/async creates risk, and how the fallback removes it
- **Risk locus:** ELK's `layout()` is async (`Promise`). If it runs on SSR or differs server-vs-client, React throws #418/#423/#425.
- **Removal mechanism:** ELK runs ONLY in `useEffect` (client). SSR and first-client render both have `elkResult === null` →
  both use `layoutFallback` (sync, deterministic) → **identical markup → no mismatch**. ELK swaps in after mount as a one-time
  settle. ELK is imported inside the client module only (never module scope of an SSR'd file). The gate of record is
  `hydration.smoke.spec.ts` plus a new flash-safety smoke test.

### 4.3 Honesty (the load-bearing product invariant)
- **Single chokepoint:** `nodeType === 'decision'` requires `decisionProvenance ∈ {observed-divergence, observed-validation}`;
  `inferred` (now dead) demotes to `process`. No fabricated conditional ever reaches a diamond.
- **Observed-only labels:** `decisionLabel` is observed-count / observed-validation language; edge labels are `N runs · X%`
  or boundary labels — passthrough only, never invented (router does not synthesize labels).
- **Single-trace provenance:** `isMultiRun === false` ⇒ static `provenanceNotice` ⇒ a single trace never presents as the process.
- **Engine honesty already enforced:** `contentEnricher.detectDecisionPoints` no longer emits the title-regex fabrication; the
  chokepoint guarantees it cannot be re-introduced at the render layer.

---

## 5. SEQUENCING — P0 → P2 (each step independently shippable + validatable)

Order chosen for **max Visio-likeness with least risk**: lock honesty + the deterministic shared core first (cheap, sync,
high-trust), then generalize the proven layered fallback to all modes (high payoff, sync — no async risk), then ELK + orthogonal
routing (highest polish, async, last), then the two new views and cleanup.

### P0 — honesty + deterministic shared core (sync, ship-blocking)

| Step | Change | Gating test (must pass to ship) |
|---|---|---|
| **P0-1** | C1: add `decisionProvenance` + `runCount`/`isMultiRun`/`provenanceNotice` (additive, defaulted) | `variantFlowModel.test.ts` all 39 green + extend "decision labels use observed-count language" to assert `decisionProvenance === 'observed-divergence'` on every diamond; typecheck under `exactOptionalPropertyTypes`. |
| **P0-2** | C2: `ShapeResolver` pure module | NEW `shapeResolver.test.ts` — truth-table totality; `inferred` decision → `process`; fixed sizes per (shape,mode). |
| **P0-3** | C3: `layoutFallback` (lift Plan-B arithmetic) | NEW `layoutEngine.fallback.test.ts` — determinism (byte-identical repeat), permutation-invariance, forward-only — mirroring the variant tests on the generalized input. |
| **P0-4** | C4: `OrthogonalEdgeRouter` pure module | NEW `edgeRouter.test.ts` — every segment axis-aligned (orthogonal), forward-only, handoff = lane crossing. |

### P1 — generalize to all modes + ELK

| Step | Change | Gating test |
|---|---|---|
| **P1-1** | C5: `elkOptions` + `layoutElk` + `useElkLayout` (client-only) | NEW `layoutEngine.elk.test.ts` — run-to-run byte-equality of positions + bends; orthogonality; spine collinearity. |
| **P1-2** | C6 + C7: `VisioCanvas` shell; switch VARIANT to it (fallback layout) | Byte-equality vs current `variantFlowModel` positions; all 39 variant assertions green; `hydration.smoke.spec.ts` green; NEW flash-safety smoke (non-empty first paint). |
| **P1-3** | C8: switch FLOW to pipeline (RIGHT, stop using engine `position.y`); behind one-release flag | Flow renders RIGHT layered; phase-group bounds from `laneBands`; hydration smoke green. |
| **P1-4** | C9: switch SWIMLANE to pipeline (`laneKey:'system'`, lane-y pin) | Single-system guard preserved; handoff via router; hydration smoke green. |
| **P1-5** | C10: switch SYSTEMS to pipeline (`subprocess`/`systemNode`) | Systems graph renders; node registry includes `systemNode`. |

### P2 — new views + polish + cleanup

| Step | Change | Gating test |
|---|---|---|
| **P2-1** | C11: add BPMN + duration `RenderMode`s + reserved shapes + `durationAdapter` + switcher entries | NEW `durationAdapter.test.ts` (deterministic band bucketing); shapeResolver totality extended to new modes; honesty: any modeled-gate uses distinct provenance (§6). |
| **P2-2** | Apply `VISIO_VISUAL_SPEC` tokens across unified node/edge components (accent rail, true diamond, terminal pill, arrowheads, print CSS, MapTitleBar) | Visual-only; rides on stable contracts; QA acceptance checklist in `VISIO_VISUAL_SPEC §8`. |
| **P2-3** | C12: delete per-mode adapters; collapse to mode profiles | All parity tests green; flag window closed; full suite + hydration smoke green. |

Each P-step is independently shippable: P0 steps add tested pure modules that change nothing user-visible until wired; P1 steps
switch one mode at a time behind the existing `position` fallback and the hydration smoke gate; P2 adds views/polish on stable contracts.

---

## 6. FUTURE-PROOFING — user-editable maps/SOPs + template upload (separate future phase)

The goal: a later edit/template feature must **not require a rewrite** and **cannot corrupt the observed-evidence honesty
invariant**. Leave these seams now (design-level; no code this phase):

### 6.1 An `overrides` layer SEPARATE from the observed graph
Keep `NormalizedViewModel` as the **observed-evidence graph** (immutable, derived from runs). User edits live in a sibling
structure, never mutated into the observed model:

```ts
// FUTURE seam — do NOT merge into NormalizedViewModel
export interface MapOverrides {
  /** Per-node user edits: relabel, reposition-pin, hide, annotate. Keyed by ViewNode.id. */
  nodeOverrides: Record<string, { label?: string; pinnedPosition?: {x:number;y:number}; hidden?: boolean; note?: string }>;
  /** User-added nodes/edges that are NOT observed (templates, manual gateways). */
  authoredNodes: ViewNode[];   // each MUST carry provenance: 'authored' (see 6.2)
  authoredEdges: ViewEdge[];
  /** Provenance/version for audit. */
  source: 'user-edit' | 'template-import';
  baseModelSignature: string;  // ties the override set to the observed model it edits
}
```

The pipeline composes `observed + overrides` at render time (a pure `applyOverrides(model, overrides): NormalizedViewModel`
that the LayoutEngine consumes). The observed model is never written. This is why stages (a)-(d) are pure functions of their
input: a composed model flows through unchanged.

### 6.2 Provenance flags so authored content cannot masquerade as observed
Widen the provenance vocabulary now (reserve the literal; do not implement):
- `ViewNode.decisionProvenance` already distinguishes `observed-divergence` / `observed-validation` / `inferred` / `null`.
  Add a node-level `origin: 'observed' | 'authored' | 'template'` (FUTURE) so the ShapeResolver/visual layer can render
  authored/template nodes with a **distinct treatment** (e.g. dashed border, "edited"/"modeled" badge) — never the same diamond
  as observed-divergence. A BPMN gateway imported from a model file is `origin: 'template'` + a modeled-condition label, which
  the honesty chokepoint keeps **visually and semantically distinct** from observed branches. This is the exact seam called out
  in `VISIO_VISUAL_SPEC §6` ("if a future version imports BPMN models with explicit gateway conditions, those nodes should use a
  DIFFERENT node type").

### 6.3 Edit-safety invariants to lock when the edit phase ships
- **Observed-evidence immutability:** `applyOverrides` may relabel/hide/annotate/reposition but may NOT change a node's
  `decisionProvenance` from `inferred`/`null` to `observed-*`. Honesty cannot be edited into existence.
- **Authored ≠ observed in metrics:** aggregate metrics (`runCount`, frequency, variance) are computed from the observed model
  only; authored nodes contribute layout but not evidence counts.
- **Deterministic with overrides:** `applyOverrides` is pure; `pinnedPosition` participates in `layoutSignature` so an edited
  map is still byte-identical render-to-render. Pinned nodes bypass the LayoutEngine for their own position only.
- **Template import is a `MapOverrides` with `source:'template-import'`** — it never writes the observed graph, so a bad/
  malicious template can be discarded by dropping the overrides, leaving the observed evidence pristine.

These seams cost nothing now (additive types, a reserved `origin` literal, the discipline that the observed model is read-only)
and convert the future edit/template feature from a rewrite into a compose-at-render feature.

---

## 7. Open questions for CEO / downstream (carried, with FINAL recommendations)

1. **Adapter deletion timing (C12 / review §6.3):** keep the four adapters behind a flag for ONE release given the hydration-crash
   history, then delete. **Recommendation: yes, one-release flag.**
2. **Direction:** RIGHT for all flow-like modes. **FINAL (resolved §1.8).**
3. **Single-run validation decisions:** keep as `observed-validation` diamonds. **FINAL (resolved §1.8).**
4. **New-view shapes:** `event` (BPMN circle) + `data` (parallelogram) are reserved in the shape union now so the two new views
   add a `RenderMode` + adapter only. **Confirm the PM's two views match (BPMN-class + duration/value) so the reserved shapes
   are correct before P2-1.**

---

## 8. Coordination with the three source specs (who owns what, where they meet)

- **VISIO_VISUAL_SPEC** owns `VisioShape → pixel geometry`, color/accent tokens, typography, arrowheads, print CSS, MapTitleBar.
  Meets this plan at `ShapeSpec.{width,height}` — the spec must publish a FIXED width per (shape,mode), no label-length sizing.
- **VISIO_LAYOUT_ROUTING_PLAN** owns the ELK `ELK_OPTIONS` object, `toElkGraph`, `runElk`, orthogonal routing, head/tail
  back-edge elimination, the determinism test strategy, and the Plan-B Manhattan routing. Meets this plan at `LayoutInput`/
  `LaidOutGraph`/`RoutedEdge.path` — `LayoutEngine` + `EdgeRouter` are the contract wrappers generalizing it from variant-only
  to all modes via `LayoutProfile`.
- **VISIO_ARCHITECTURE_REVIEW** (finalized by this doc) owns the correctness/honesty audit, the four-stage seam, the preserved
  invariants, and the sequencing. The honesty rules in §4.3 are load-bearing on both companion docs — neither a shape nor a
  layout may render a fabricated decision.
