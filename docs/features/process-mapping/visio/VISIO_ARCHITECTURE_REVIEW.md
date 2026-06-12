# Visio-Grade Unified Renderer — Architecture Review

**Date:** 2026-06-11
**Author:** system-architect (READ-ONLY review — no product code modified)
**Scope:** Process-mapping logic + data model correctness audit, and the proposed architecture for ONE Visio-grade render pipeline shared across flow / variant / swimlane / systems modes.
**Companion docs (same dir, produced in parallel):** `VISIO_VISUAL_SPEC.md` (ux — shape/typography/color tokens), `VISIO_LAYOUT_ROUTING_PLAN.md` (ELK layered options + orthogonal routing). This doc owns the *contracts and sequencing*; it defers token values to the visual spec and ELK option strings to the routing plan, and names exactly where the three meet.

---

## 0. TL;DR

Two structural problems, one architectural fix.

1. **Correctness/honesty gap (P0):** Decision points are inferred **three different ways** across three code paths that do not agree, and the single-run flow map can render a **straight line with no decisions even when the recording branched** — because single-run decision inference is heuristic (submit→error, title regex) and is computed at engine build time, never reconciled against the divergence analyzer that the variant map uses. One of the three inference paths (`detectDecisionPoints` title-regex → `"Should the record be approved or rejected?"`) **fabricates a business condition**, violating the honesty invariant the variant builder is careful to preserve.

2. **Render-divergence gap (P0):** Each mode owns an ad-hoc layout. Flow = vertical ordinal stack from the engine (`processMapBuilder` writes `position.y = startNodeHeight + index*(H+GAP)`, x always 0). Swimlane = hand-rolled horizontal bands. Systems = `i * 300` row. Variants = the only one with real layered layout (`variantFlowModel` Plan-B integer layers) and the only one slated for ELK. There is **no shared shape resolver, no shared layout engine, no shared edge router** — so "Visio-likeness" can only ever be achieved in one mode at a time and re-diverges on every change.

**The fix:** insert three pure stages between the existing normalized model and React Flow — **ShapeResolver → LayoutEngine (ELK layered + deterministic Plan-B fallback) → OrthogonalEdgeRouter** — and route ALL four modes through them. The `NormalizedViewModel` (`ViewNode`/`ViewEdge`/`ViewPhase`) is already a clean mode-agnostic graph and is the correct seam; it needs honesty hardening, not restructuring.

---

## 1. Correctness audit of the process-mapping logic

### 1.1 How decision points are inferred today — three disjoint paths

| Path | Where | Trigger | Honesty |
|---|---|---|---|
| **A. Single-run engine** | `packages/process-engine/src/contentEnricher.ts::detectDecisionPoints` → consumed by `processMapBuilder.ts` (sets `nodeType:'decision'`, `metadata.isDecisionPoint`, `metadata.decisionLabel`) | (i) `fill_and_submit`/`send_action` → `error_handling`; (ii) `data_entry` → `error_handling`; (iii) **title regex** `/\b(approv\|reject\|deny\|decline)\b/` | **(i)(ii) sound** (observed error follows submit — a real validation gate). **(iii) NOT sound** — emits `"Should ${subject} be approved or rejected?"` from a title keyword. This is a *fabricated conditional*: the recording shows an approval action, not an observed branch. |
| **B. Variant builder** | `apps/web-app/src/lib/variantFlowModel.ts` via `@ledgerium/intelligence-engine::analyzeDivergence` | A backbone index is a decision point **iff ≥1 run actually diverged there** (`decisionBackboneIndices`, guarded by `runCount > 0` to suppress "0 of N" phantom diamonds) | **Sound + honest.** `decisionLabel()` is observed-count language only: `"3 of 16 runs took an alternate path here (19%)"`. This is the gold standard the other paths should match. |
| **C. View normalizer** | `apps/web-app/src/components/workflow-view/adapters/viewModel.ts` | Pure passthrough: `isDecisionPoint: meta.isDecisionPoint === true`; `nodeType` from `raw.nodeType` | Faithful passthrough — inherits whatever path A produced, including the fabricated label from A(iii). |

**Finding C-1 (P0, honesty): `detectDecisionPoints` path (iii) fabricates a condition.** `contentEnricher.ts:572-576` turns the presence of an approval *keyword in a step title* into a rendered decision diamond with the label `"Should ${subject} be approved or rejected?"`. There was no observed branch — a single run that contains an "Approve" step has out-degree 1, not 2. The variant builder explicitly forbids exactly this (`variantFlowModel.ts` header: *"decisionLabel NEVER contains a fabricated business condition... observed-count language only"*). The two halves of the same product disagree on the honesty rule.

**Finding C-2 (P0, correctness): `meta.isDecisionPoint` is populated for single-run flow but NOT from observed branching.** Answering the brief's specific question directly: yes — `isDecisionPoint`/`nodeType:'decision'` **is** set on single-run flow maps (path A, `processMapBuilder.ts:100-101,294`). But it is set from *heuristics over a linear step list*, never from a directly-follows out-degree > 1 signal. A single run is, topologically, always a path — it has no branches to observe. So every "decision" on a single-run flow map is an *inference about what could vary*, rendered with the same diamond shape the variant map uses for *what was observed to vary*. Same shape, two different epistemic claims. A viewer cannot tell "this validation gate was observed to fail in this run" (sound, A-i) from "this step's title contained the word approve" (fabricated, A-iii).

**Finding C-3 (P0, the brief's headline risk): straight-line single-run with no decisions even when the recording had branches.** This is real and structural. The flow map is built from **one `ProcessRun`** (`processMapBuilder.buildProcessMap` consumes `derivedSteps` of a single session). A single recording is a single path — it *cannot* contain a branch, because a branch only exists across ≥2 runs. So:
   - If the user recorded a workflow that *does* branch in reality but recorded it **once**, the flow map is a straight line with possibly one heuristic diamond — **it cannot show the branch**, because the branch evidence (a second run that went the other way) does not exist in a single run.
   - The branch only becomes visible in the **variant** map, which requires multiple runs of the same `ProcessDefinition`.
   - **There is no signal on the flow map telling the user "this is one of N runs; branches exist in the variant view."** The flow map silently presents a single trace as if it were the process. That is the misleading-map failure mode.

**Finding C-4 (P1, soundness of edge typing): `edgeType` inference is shallow.** `processMapBuilder.ts:220-223` types an edge `exception` iff either endpoint is `nodeType:'exception'`, else `sequence`; `decision`-typed edges are never emitted by the engine (only the variant builder emits `type:'decision'`). `viewModel.normalizeEdgeType` accepts `'decision'` but the engine never produces it — so on flow maps, the edge *out of* a decision diamond is a plain grey `sequence` edge with no branch semantics and no condition label. The diamond has no labelled exits. In Visio/BPMN a gateway always has labelled outgoing flows; here it has none.

**Finding C-5 (P1, phases/systems): phase derivation is consecutive-run-length, not semantic.** `buildPhases` (`processMapBuilder.ts:409`) groups **consecutive** steps by `applicationLabel`. A workflow that ping-pongs A→B→A→B produces four phases, two of them named "A". `viewModel` then builds `systems`/`systemEdges` by *deduping* system id, so the systems map correctly collapses A and B to two system nodes — but the swimlane adapter (`swimlaneAdapter.buildSwimlaneData`) re-derives lanes from `node.system` insertion order, so a node revisiting system A lands in lane A again (correct), while `phases` (lane bands on the *flow* canvas) show the duplicated "A" phase. **The three modes disagree on what "a system region" is.** This is a direct consequence of having three derivations instead of one.

**Finding C-6 (P2, determinism leak in the engine — outside layout but worth flagging):** `variantDetector.ts:39` and `divergenceAnalyzer` are deterministic, but `variantDetector.ts` calls `new Date().toISOString()` for `computedAt`. That value flows into `VariantSet` but **not** into any position or node identity, so it does not break hydration of the map — however it does make `VariantSet` non-byte-identical run-to-run, which can defeat naive memoization/signature caching downstream (§3.4). Keep it out of any layout signature.

### 1.2 Verdict on correctness

The **variant** path (B) is sound, honest, deterministic, and is the reference implementation. The **single-run engine** path (A) is the liability: it conflates "inferred-could-branch" with "observed-did-branch," fabricates one label class, and has no provenance signal that it is showing one trace of many. The refactor must (a) demote/remove A(iii), (b) make single-run "decisions" visually and semantically distinct from observed branches (or suppress them), and (c) carry a provenance flag so a single-trace map announces itself as such.

---

## 2. The unified render pipeline

### 2.1 Current data flow (verified)

```
ProcessRun (1 run) ──> processMapBuilder.buildProcessMap ──> ProcessMap {nodes(+position),edges,phases}
                                                                   │
PortfolioIntelligence (N runs) ──┐                                 ▼
                                 │            viewModel.buildNormalizedViewModel ──> NormalizedViewModel
variantFlowModel.buildVariantFlowModel ───────────────────────────┘   (ViewNode/ViewEdge/ViewPhase)
   (its OWN NormalizedViewModel with Plan-B layered positions)         │
                                                                       ▼
                       ┌───────────────┬───────────────┬──────────────┴────────────┐
                  flowAdapter      swimlaneAdapter   systemAdapter            variantAdapter
                  (position passthru) (re-layout)    (i*300 row)            (position passthru)
                       │                │                │                        │
                       ▼                ▼                ▼                        ▼
                  WorkflowCanvas   WorkflowSwimlane   WorkflowSystemsMap     WorkflowVariantsMap
                  (vertical line)   (hand-rolled)      (single row)           (ELK planned only here)
```

The seam is already correct: every renderer consumes a `NormalizedViewModel`. The problem is each adapter **invents its own geometry and shape mapping inline**. Four geometries, four shape rules, zero shared routing.

### 2.2 Target data flow

```
NormalizedViewModel ──> ShapeResolver ──> LaidOutGraph(via LayoutEngine) ──> RoutedGraph(via EdgeRouter) ──> RenderModel
        (honest graph)     (a)                  (c)                              (d)                        │
                            └── ShapeSpec per node (b) ──────────────────────────────────────────────────┘
                                                                                                            ▼
                                                                                    ONE <VisioCanvas/> for all 4 modes
```

Four pure stages, one renderer. Each stage is a pure function with a frozen contract; modes differ only by a `RenderMode` enum + a `LayoutProfile` (lane grouping key, direction), **not** by separate code paths.

### 2.3 Stage (a) — the pure graph model (deterministic, honest)

**Keep `NormalizedViewModel` as the canonical graph.** It is already mode-agnostic and non-null-defaulted. Add honesty/provenance fields (additive, no restructure — the model's own header promises "future overlays add fields, not restructure"):

```ts
// viewModel.ts — additive fields on NormalizedViewModel
export interface NormalizedViewModel {
  // ...existing...
  /** How many runs this model summarizes. 1 = single trace. */
  runCount: number;
  /** True iff decisions/branches are evidence-backed (≥2 runs analyzed). */
  isMultiRun: boolean;
  /** Provenance of each decision node, for honest shape/label treatment. */
  // (carried per-node, see below)
}

// ViewNode — additive
export interface ViewNode {
  // ...existing...
  /**
   * Why this node is a decision:
   *  - 'observed-divergence' : ≥1 run took an alternate path here (variant builder, sound)
   *  - 'observed-validation' : submit→error in this run (engine A-i/A-ii, sound for THIS run)
   *  - 'inferred'            : heuristic only (engine A-iii title regex) — DEMOTE/SUPPRESS
   *  - null                  : not a decision
   */
  decisionProvenance: 'observed-divergence' | 'observed-validation' | 'inferred' | null;
}
```

**Honesty rules the model must enforce (move the variant builder's discipline up to the shared layer):**
- `decisionLabel` is **observed-count or observed-validation language only**. The engine A-iii fabricated branch (`"Should X be approved or rejected?"`) is reclassified `decisionProvenance:'inferred'` and the ShapeResolver renders it as a *task* (not a diamond) until/unless multi-run evidence promotes it. No fabricated conditional ever reaches a diamond.
- A node may be `nodeType:'decision'` **only** when `decisionProvenance ∈ {'observed-divergence','observed-validation'}`. This is the single chokepoint that fixes C-1/C-2.
- When `isMultiRun === false`, the RenderModel carries a banner contract (`provenanceNotice: "Single recording — branches appear once this workflow has multiple runs"`) so C-3's silent single-trace problem becomes explicit.

This stage stays pure, sync, ELK-free, browser-free (engine path) — preserving unit-testability and the existing determinism guarantees.

### 2.4 Stage (b) — the ShapeResolver (`ViewNodeType → flowchart shape`)

A pure, total function. One mapping, used by all modes. Replaces the inline `viewNode.nodeType === 'decision' ? 'decisionNode' : ...` ternaries scattered across `flowAdapter`, `swimlaneAdapter`, `systemAdapter`.

```ts
// NEW: apps/web-app/src/components/workflow-view/render/shapeResolver.ts
export type VisioShape =
  | 'terminator'   // start/end — pill/stadium
  | 'process'      // task — rounded rect (the accent-rail card per VISIO_VISUAL_SPEC §1)
  | 'decision'     // diamond/gateway — ONLY for observed decisions
  | 'alternate'    // exception/error — rounded rect, red treatment
  | 'subprocess'   // system node (systems map) — double-struck rect
  | 'data';        // reserved (annotation/data-entry emphasis), future

export interface ShapeSpec {
  shape: VisioShape;
  /** Intrinsic size BEFORE layout — layout reserves this exact box (determinism). */
  width: number;
  height: number;
  /** Ports the router may attach to, in mode-direction terms. */
  ports: { in: 'top'|'left'; out: 'bottom'|'right' };
}

export function resolveShape(node: ViewNode, mode: RenderMode): ShapeSpec;
```

Rules (total, deterministic):
- `start|end` → `terminator`. Size from VISIO_VISUAL_SPEC terminal token (160×44).
- `decision` **and** `decisionProvenance !== 'inferred'` → `decision` (diamond box per VISIO_VISUAL_SPEC §1.3; layout reserves the pre-rotation bounding box). `inferred` → falls through to `process`.
- `exception` → `alternate`.
- systems-mode nodes → `subprocess`.
- else → `process`. Width is **fixed per mode** (VISIO_VISUAL_SPEC node token; the spec's 260 task / 160 terminal / diamond box) — *not* label-length-dependent, so layout is reproducible regardless of font metrics (LAYOUT_PLAN §1 determinism requirement).

The ShapeResolver owns the `ViewNodeType → VisioShape` truth table. Visual *styling* (colors, accent rail, typography) stays in the node components and `constants.ts` / VISIO_VISUAL_SPEC; the resolver only decides **shape + reserved box + ports**, which is what the LayoutEngine needs.

### 2.5 Stage (c) — the LayoutEngine (ELK layered, client-side, deterministic fallback)

The single biggest Visio-likeness lever, and the place all four modes currently diverge. One engine, two implementations behind one contract:

```ts
// NEW: apps/web-app/src/components/workflow-view/render/layoutEngine.ts
export interface LayoutInput {
  nodes: Array<{ id: string; shape: ShapeSpec; lane?: string }>; // lane = grouping key (system/phase)
  edges: Array<{ id: string; source: string; target: string }>;
  profile: LayoutProfile;
}
export interface LayoutProfile {
  direction: 'RIGHT' | 'DOWN';      // flow/variant = RIGHT; (legacy flow = DOWN if kept)
  laneKey: 'none' | 'system' | 'phase';
  spineHint?: string[];             // node ids to keep collinear (the backbone)
}
export interface LaidOutGraph {
  positions: Record<string, { x: number; y: number }>;
  /** Orthogonal bend points per edge when the engine produced them (ELK). */
  bends?: Record<string, Array<{ x: number; y: number }>>;
  laneBands?: Array<{ key: string; x: number; y: number; width: number; height: number }>;
  /** 'elk' | 'fallback' — for telemetry + tests. */
  source: 'elk' | 'fallback';
}

/** SYNC, pure, deterministic — used for SSR + first paint + ELK failure. */
export function layoutFallback(input: LayoutInput): LaidOutGraph;

/** ASYNC, client-only — ELK layered. Resolves to the authoritative layout. */
export function layoutElk(elk: ElkInstance, input: LayoutInput): Promise<LaidOutGraph>;
```

- **`layoutFallback`** generalizes the proven Plan-B layered hand-roll already shipping in `variantFlowModel.ts` (integer layer = backbone index; within-layer lane by greedy interval coloring in frequency order; head/tail edge-omission for forward-only). Lift that arithmetic into `layoutEngine` so **flow/swimlane/systems get the same collision-free layered positions the variant map already has**, instead of vertical-stack / `i*300`. This is the change that makes all four modes Visio-grade at once.
- **`layoutElk`** runs ELK `layered` per `VISIO_LAYOUT_ROUTING_PLAN` option set (`elk.direction=RIGHT`, `edgeRouting=ORTHOGONAL`, `NETWORK_SIMPLEX` layering+placement, `LAYER_SWEEP`+`considerModelOrder`+`semiInteractive` for deterministic crossing-min, `DEPTH_FIRST` cycle breaking). Spine nodes carry per-node straightness priority. Lanes map to ELK `partitioning`/parent-node grouping when `laneKey !== 'none'`.
- **`profile.laneKey`** is how swimlane and systems modes are *the same engine with a different grouping key* — not a separate layout file. Swimlane = `laneKey:'system'`, direction RIGHT, one node per step. Systems = pre-aggregate to system nodes (already done in `viewModel.systems`/`systemEdges`) then `laneKey:'none'`. Flow = `laneKey:'phase'` or `'none'`. Variant = `laneKey:'none'`, `spineHint = backbone ids`.

**Determinism contract (must hold):** byte-identical `LayoutInput` (frozen node order, frozen edge order, fixed shape sizes) ⇒ byte-identical `LaidOutGraph`. Both implementations satisfy this: fallback is integer arithmetic; ELK is order-deterministic under the frozen option set with no randomized pass. **No `Date`/`Math.random` in either** — and the `variantDetector.computedAt` timestamp (C-6) must be excluded from any layout signature.

### 2.6 Stage (d) — the OrthogonalEdgeRouter

```ts
// NEW: apps/web-app/src/components/workflow-view/render/edgeRouter.ts
export interface RoutedEdge {
  id: string; source: string; target: string;
  /** Orthogonal polyline: source port → bends → target port. */
  path: Array<{ x: number; y: number }>;
  /** Forward-only guarantee already enforced; router never produces a leftward leg in RIGHT mode. */
  kind: 'sequence' | 'decision' | 'exception' | 'handoff';
  label: string;          // observed-count or boundary label — never fabricated
  style: EdgeStyleToken;  // from VISIO_VISUAL_SPEC §2 / EDGE_STYLES
}
export function routeEdges(laidOut: LaidOutGraph, edges: ViewEdge[], profile: LayoutProfile): RoutedEdge[];
```

- When `LaidOutGraph.source === 'elk'`, the router **consumes ELK bend points** (`bends[edgeId]`) and renders a custom `step`/polyline edge — true orthogonal Visio routing.
- When `source === 'fallback'`, the router computes orthogonal legs from port positions (L-shaped / Z-shaped) deterministically — matching the `smoothstep`/`step` look already used.
- **Forward-only invariant** (variant map's hard rule) is enforced here for *all* modes: in RIGHT direction, every routed edge's last leg points right or vertical; the router asserts `targetX >= sourceX` and is covered by the existing `variantFlowModel.test.ts` "all edges flow forward" test pattern, generalized.
- `handoff` kind is derived from lane crossing (swimlane mode) — already computed in `swimlaneAdapter`; lift that predicate here so it is one rule.

### 2.7 The single renderer

```
<VisioCanvas
  model={NormalizedViewModel}
  mode={'flow'|'variant'|'swimlane'|'systems'}
  profile={LayoutProfile}        // derived from mode
/>
```

`VisioCanvas` (client component) runs: `resolveShape` (sync) → `layoutFallback` (sync, for SSR/first paint) → `layoutElk` in a `useEffect` keyed on a deterministic graph signature → `routeEdges` → React Flow render with shared `nodeTypes` (one `ProcessNode`, one `TerminalNode`, one `DecisionNode`, one `SystemNode`) and one custom `OrthogonalEdge`. `WorkflowCanvas` / `WorkflowSwimlaneCanvas` / `WorkflowSystemsMap` / `WorkflowVariantsMap` become thin wrappers that pick a `mode` + `profile` and pass the model — eventually deletable. ELK is constructed once via `useRef`, client-only (per LAYOUT_PLAN §2), so SSR/hydration only ever sees the deterministic fallback.

---

## 3. Invariants the refactor MUST preserve

### 3.1 Determinism
- **No `Date`/`Math.random`/unstable sort in any of stages (a)–(d).** The fallback layout is integer arithmetic; ELK is order-deterministic under the frozen option set. **Risk:** ELK option drift — pin the option object in ONE module (`VISIO_LAYOUT_ROUTING_PLAN`'s `ELK_OPTIONS`) imported by both renderer and tests; an ELK version bump can shift numbers, so determinism tests assert *run-to-run equality of the live option set*, not a numeric snapshot (LAYOUT_PLAN §4b).
- **Frozen input order.** Stage (a) already emits deterministic node/edge order (variant builder `ranked.sort` total-order tie-break; engine ordinal order). The ShapeResolver and LayoutInput projection must be **order-preserving** — never re-sort with a partial comparator. **Risk:** introducing a `Map` iteration or `Set`-dedup that loses insertion order; lock with the existing "byte-identical on repeated calls" + "permutation-invariant" tests.
- **Exclude non-deterministic upstream fields from the layout signature** (C-6 `computedAt`). The signature is topology + shape sizes only.

### 3.2 Hydration-safety / flash-safety
- **Client-only ELK; sync fallback is the SSR + first-client-render layout** ⇒ identical server/first-client markup ⇒ no hydration mismatch (LAYOUT_PLAN §2). **Risk:** importing `elkjs` at module scope in a file that SSRs — ELK must be imported inside the client component / effect only. **Risk:** the model carrying a value that differs server vs client (e.g. `Date.now()`); the provenance banner text must be static, not time-derived.
- **No flash of empty canvas.** First paint uses fallback positions; ELK swaps in via effect as a one-time settle. There is no flash-specific smoke test in the repo today (searched — none found); the refactor should add one (§4) asserting first render produces non-empty positions for every mode with `elkPos === null`.

### 3.3 Honesty (the load-bearing product invariant)
- **Observed-only decision labels.** The variant builder's rule becomes the shared rule (stage a §2.3): a diamond renders only for `decisionProvenance ∈ {observed-divergence, observed-validation}`; the engine A-iii fabricated-conditional path is reclassified `inferred` and rendered as a task. **Risk:** the existing single-run engine label `"Should X be approved or rejected?"` reaching a diamond — the refactor must explicitly route it through the demotion. The variant test `"decision labels use observed-count language (never fabricated conditions)"` must be extended to cover the engine path too.
- **Single-trace provenance** (C-3). `isMultiRun:false` ⇒ visible notice; never present one run as the process.
- **Frequency/run-count language stays observed** (`"N runs · X%"`), never invented.

### 3.4 Performance / memoization
- Layout keyed by a **deterministic graph signature** (topology + sizes), so identical input never re-lays-out or flickers (LAYOUT_PLAN §2). Risk: signature accidentally including `computedAt` or object identity → cache thrash. Signature is structural only.

---

## 4. Sequencing — P0 → P2

Order chosen for **max Visio-likeness with least risk**: fix the honesty/correctness liabilities first (cheap, high-trust), then generalize the proven layered fallback to all modes (high visible payoff, deterministic, sync — no async risk), then layer ELK + orthogonal routing (highest polish, async, last).

### P0 — correctness, honesty, and the shared deterministic core (ship-blocking)

- **P0-1 — Honesty hardening in stage (a).** Add `decisionProvenance` to `ViewNode` and `runCount`/`isMultiRun` to `NormalizedViewModel` (`viewModel.ts`). In `processMapBuilder`/`contentEnricher`, tag A-i/A-ii as `observed-validation` and **A-iii (title regex) as `inferred`**. Single chokepoint: a node may be `nodeType:'decision'` only if provenance is observed. *Fixes C-1, C-2.*
  - **Tests that must hold:** extend the variant suite's `"decision labels use observed-count language (never fabricated conditions)"` to also assert the engine path emits no fabricated conditional reaching a diamond. Keep all existing `variantFlowModel.test.ts` assertions green (decision-at-real-divergence, honest labels).
- **P0-2 — Single-trace provenance notice** (`isMultiRun:false` ⇒ `provenanceNotice`). *Fixes C-3* — flow map announces it is one of N runs and points to the variant view. No layout impact.
- **P0-3 — ShapeResolver** (`render/shapeResolver.ts`), pure + total, with a truth-table test (every `ViewNodeType` × every `decisionProvenance` → exactly one `VisioShape`; `inferred` decision → `process`). Wire `flowAdapter`/`swimlaneAdapter`/`systemAdapter`/`variantAdapter` to call it instead of inline ternaries (behavior-preserving for the non-inferred cases).
- **P0-4 — `layoutFallback`** (`render/layoutEngine.ts`): lift the variant builder's Plan-B layered arithmetic into a shared, mode-parameterized function (`LayoutProfile`). Variant mode switches to consume it (byte-identical output — assert against current positions). *No new async, no ELK, fully deterministic.*
  - **Tests that must hold:** `variantFlowModel.test.ts` determinism ("byte-identical nodes and positions on repeated calls"), permutation-invariance, and **forward-edge invariant** ("all edges flow forward — no backward arrows") — these become the acceptance gate for the shared fallback. Re-pin any positional snapshots once (LAYER_W grid) and lock.

### P1 — generalize layered layout to all modes + ELK

- **P1-1 — Route flow/swimlane/systems through `layoutFallback`.** Flow stops using the engine's vertical `position.y`; swimlane/systems stop hand-rolling geometry. All four modes now share collision-free layered positions. **This is the step that makes every mode Visio-grade.** Lane bands (`laneKey:'system'|'phase'`) come from `LaidOutGraph.laneBands` — one derivation, fixing C-5's three-way disagreement (phase = lane = system region is computed once).
- **P1-2 — `layoutElk`** per `VISIO_LAYOUT_ROUTING_PLAN` (extract `ELK_OPTIONS` + `toElkGraph` + `runElk` into the shared layout module). Client-only, effect-driven, fallback on failure. Spine-priority for backbone collinearity.
  - **Tests:** ELK run-to-run byte-identical equality + spine collinearity (LAYOUT_PLAN §4b), per mode.
- **P1-3 — `OrthogonalEdgeRouter`** (`render/edgeRouter.ts`) consuming ELK bends; one custom `OrthogonalEdge` React Flow type for all modes. Generalize the forward-only assertion and the `handoff` lane-crossing predicate. *Fixes C-4 partially:* decision exits get labelled orthogonal flows.
- **P1-4 — `VisioCanvas` shell + flash-safety smoke test.** One client component; existing four canvases become thin `mode`+`profile` wrappers. Add the missing smoke test: first render (`elkPos===null`) yields non-empty positions for every mode; no empty-canvas flash.

### P2 — polish, parity, cleanup

- **P2-1 — Labelled decision exits** (C-4 fully): emit `type:'decision'` edges with observed-count exit labels out of every diamond, in flow + variant. Engine `deriveBoundaryLabel` decision branch consolidated into the shared router.
- **P2-2 — Lane partitioning in ELK** (`elk.partitioning` for true swimlane bands) replacing the fallback band rects where ELK is active.
- **P2-3 — Apply `VISIO_VISUAL_SPEC` tokens** across the unified node/edge components (accent rail, true diamond, terminal pill, arrowheads, 9px-min typography, print `@media` block, `MapTitleBar`). These are visual-only and ride on top of the unified pipeline — they land last because they have zero logic risk once the shape/layout/route contracts are stable.
- **P2-4 — Delete the per-mode adapters** once `VisioCanvas` reaches parity; collapse `flowAdapter`/`swimlaneAdapter`/`systemAdapter`/`variantAdapter` into mode profiles. Removes the divergence at its source.

### Contracts/tests that gate every step

| Invariant | Test (existing or to-add) | Stage it guards |
|---|---|---|
| Determinism (byte-identical positions) | `variantFlowModel.test.ts` "byte-identical nodes and positions on repeated calls" | (a),(c) fallback |
| Permutation invariance | `variantFlowModel.test.ts` "permutation-invariant" | (a) |
| Forward-only edges | `variantFlowModel.test.ts` "all edges flow forward — no backward arrows" | (c),(d) |
| Honest decision labels | `variantFlowModel.test.ts` "decision labels use observed-count language" (extend to engine path) | (a),(b) |
| Decision-at-real-divergence only | `variantFlowModel.test.ts` "inserts decision nodes at real divergence points" | (a),(b) |
| ELK determinism + spine collinearity | NEW `…elk.test.ts` (LAYOUT_PLAN §4b) | (c) ELK |
| Shape truth-table totality | NEW `shapeResolver.test.ts` | (b) |
| Flash-safety (non-empty first paint) | NEW smoke test | (d)/shell |

---

## 5. Coordination notes (with the parallel docs)

- **VISIO_VISUAL_SPEC** owns: `VisioShape → pixel geometry`, color/accent tokens, typography, arrowheads, print CSS, `MapTitleBar`. This doc's **ShapeResolver consumes the spec's size tokens** as the reserved layout box — the two meet at `ShapeSpec.{width,height}`. The visual spec must publish a *fixed* width per shape per mode (no label-length sizing) so layout stays deterministic (§2.4, LAYOUT_PLAN §1).
- **VISIO_LAYOUT_ROUTING_PLAN** owns: the ELK `ELK_OPTIONS` object, `toElkGraph`, `runElk`, orthogonal routing, head/tail back-edge elimination, the determinism test strategy. This doc's **LayoutEngine + EdgeRouter are the contract wrappers** around that plan, generalized from variant-only to all four modes via `LayoutProfile`. The two meet at `LayoutInput`/`LaidOutGraph` and `RoutedEdge.path`.
- **This doc** owns: the correctness/honesty audit (§1), the four-stage seam and its interfaces (§2), the preserved invariants (§3), and the P0→P2 sequencing (§4). The honesty rules in §3.3 are **load-bearing on both companion docs** — neither a shape nor a layout may render a fabricated decision.

---

## 6. Open questions for CEO / downstream

1. **Single-run "validation" decisions (A-i/A-ii):** keep as `observed-validation` diamonds (they reflect a real observed submit→error in *this* run) or also demote to tasks until multi-run? Recommendation: **keep as diamonds but label as observed validation** ("Submission rejected — validation failed in this run"), distinct shape-treatment from observed-divergence per VISIO_VISUAL_SPEC.
2. **Legacy DOWN flow direction:** the engine lays flow vertically; Visio/BPMN convention is left→right. Switch flow to `direction:RIGHT` (consistent with variant/swimlane) or keep DOWN for the single-trace flow map? Recommendation: **RIGHT for all** — one direction, one mental model, simplest router.
3. **Adapter deletion timing (P2-4):** delete the four adapters in the same release as `VisioCanvas` parity, or keep them one release as a fallback flag? Recommendation: keep behind a flag for one release given the hydration-crash history.
