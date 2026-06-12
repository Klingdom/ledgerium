# Visio-Grade Layout + Routing Engine for Ledgerium Process Maps

**Date:** 2026-06-11
**Author:** process-mining graph-visualization engineer (planning artifact — READ-ONLY on product code)
**Goal:** Give every Ledgerium process-map mode (flow / variant / swimlane) a **Visio-grade** look: deterministic **LAYERED (Sugiyama)** node placement with minimized edge crossings + **ORTHOGONAL (right-angle elbow)** connectors that follow real ELK bend points.
**Builds on:** `docs/features/process-variation/polish/LAYOUT_PLAN.md` (ELK integration + deterministic Plan-B layered fallback for the variant story map). This document generalizes that work into **one shared engine** consumed by all three map modes, and adds the connector-routing half (orthogonal edges from ELK sections) that the prior plan only gestured at (its P1-4).

**Hard constraints (non-negotiable, carried from the prior plan):**
1. **Deterministic** — same input ⇒ byte-identical layout. This app had a hydration-crash crisis; positions must be reproducible. No `Date`, no `Math.random`, no unstable sort comparators feeding the layout.
2. **Hydration-safe** — ELK's `layout()` is **async**. It must run **client-only** (inside `useEffect`), and SSR + the first client render must use a **synchronous deterministic fallback** (the existing column/Plan-B layouts) so server markup === first-client markup.
3. **Honest labels** — decision/edge labels remain observed-only (no fabricated branch conditions). Layout never invents nodes or edges; it only assigns geometry to the deterministic graph the builders already produce.

---

## 0. Verified environment facts (read-only confirmation, 2026-06-11)

ELK API surface confirmed by reading the installed type defs at `apps/web-app/node_modules/elkjs/lib/elk-api.d.ts`:

```ts
// elkjs 0.11.1 — the geometry we need is on ElkEdgeSection:
export interface ElkExtendedEdge extends ElkEdge {
  sources: string[];
  targets: string[];
  sections?: ElkEdgeSection[];     // ← orthogonal routing lives here
}
export interface ElkEdgeSection {
  id: string;
  startPoint: ElkPoint;            // {x,y}
  endPoint:   ElkPoint;
  bendPoints?: ElkPoint[];         // ← the right-angle elbows ELK computed
}
export interface ElkNode extends ElkShape {
  id: string;
  children?: ElkNode[];
  edges?: ElkExtendedEdge[];       // edges declared at the parent; sections returned post-layout
}
export interface ELK {
  layout<T extends ElkNode>(graph: T, args?: ElkLayoutArguments): Promise<...>;
}
```

- Package: `elkjs@0.11.1`, declared in `apps/web-app/package.json` (`"elkjs": "^0.11.1"`), installed under `apps/web-app/node_modules/elkjs`. **Currently UNUSED in product code** (no import of `elkjs` anywhere). Entry `lib/main`; default export = `ELK` constructor; bundled algorithms (incl. `layered`) in `lib/elk.bundled.js` (no separate worker file required).
- **Critical for orthogonal connectors:** the bend points are returned on `edge.sections[*].bendPoints` only when **`elk.edgeRouting = ORTHOGONAL`** is set AND the edges are declared as **children of the graph root** (or the appropriate common ancestor) so ELK routes them. We must read `out.edges`, not just `out.children`.

### Surfaces in scope (no code modified in this iteration)

| Mode | Pure graph builder | Renderer (client) | Edge component |
|---|---|---|---|
| Flow | `apps/web-app/src/components/workflow-view/adapters/flowAdapter.ts` (`buildFlowData`, positions straight from `viewNode.position`) | `apps/web-app/src/components/workflow-view/WorkflowCanvas.tsx` (React Flow) | `apps/web-app/src/components/workflow-view/edges/WorkflowEdge.tsx` |
| Variant | `apps/web-app/src/lib/variantFlowModel.ts` (`buildVariantFlowModel` → `NormalizedViewModel`, deterministic column layout: backbone columns + branch lanes) → renders through the **same** flow canvas | same `WorkflowCanvas.tsx` | same `WorkflowEdge.tsx` |
| Swimlane | `apps/web-app/src/components/workflow-view/adapters/swimlaneAdapter.ts` (`buildSwimlaneData`, deterministic lane bands) | `apps/web-app/src/components/workflow-view/WorkflowSwimlaneCanvas.tsx` | same `WorkflowEdge.tsx` (+ `handoffEdge`) |

All three already emit a `position: {x,y}` per node and a deterministic node/edge order. **That is the safe synchronous fallback.** ELK only *replaces* the geometry, never the graph.

---

## 1. ELK LAYERED config — the Visio look, frozen & deterministic

### 1.1 Direction recommendation: **DOWN** for flow/variant, **per-lane RIGHT** for swimlane

Visio process diagrams (the classic "flowchart" stencil) read **top-to-bottom**: Start at top, decisions branch down, terminal at the bottom. That is the most "Visio process" reading. So:

- **Flow + Variant maps:** `elk.direction = DOWN` (layers stack vertically; edges flow downward; decisions fan out horizontally within a layer). This matches how reviewers expect a process to read and makes decision branches symmetric left/right of the spine.
- **Swimlane map:** the lanes are horizontal bands (one per system), and work flows **left→right across lanes**, so the swimlane mode uses `elk.direction = RIGHT` **with a partition/lane constraint** (see §4). Direction is per-mode, supplied as a parameter to the shared helper — the option *set* is otherwise identical.

> If product later prefers the current left→right flow reading, flip `direction` to `RIGHT` — it is a single frozen constant per mode and changes nothing else. Recommendation stands at **DOWN** for the two non-lane modes because it is the canonical Visio process orientation.

### 1.2 The frozen option set

One module owns these so every mode and every test uses the identical, audited strings. Place in a new pure module `apps/web-app/src/lib/mapLayout/elkOptions.ts` (P1):

```ts
// elkOptions.ts — FROZEN ELK option set. Determinism depends on every value here.
// Any change is a layout-behavior change and MUST re-pin the determinism snapshots.

export type ElkDirection = 'DOWN' | 'RIGHT';

/** Graph-level options shared by all modes. direction is injected per call. */
export function elkGraphOptions(direction: ElkDirection): Record<string, string> {
  return {
    'elk.algorithm': 'layered',
    'elk.direction': direction,                 // DOWN (flow/variant) | RIGHT (swimlane)
    'elk.edgeRouting': 'ORTHOGONAL',            // ← right-angle elbows; populates edge.sections.bendPoints

    // ── Layering: which layer each node lands in (deterministic) ──
    'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',

    // ── Crossing minimization: order within each layer (deterministic) ──
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.crossingMinimization.semiInteractive': 'true',   // honor input order as tie-break seed
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES', // stable, input-order-driven

    // ── Node placement: where in the layer (straightens the spine; deterministic) ──
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    'elk.layered.nodePlacement.favorStraightEdges': 'true',

    // ── Cycle breaking: reverse back-edges deterministically (no greedy randomness) ──
    'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',

    // ── Spacing (tuned to current node sizes: flow nodes 280×72, swimlane 280×88) ──
    'elk.layered.spacing.nodeNodeBetweenLayers': '80',   // gap between layers (the "rank" gap)
    'elk.spacing.nodeNode': '48',                        // gap within a layer (sibling gap)
    'elk.layered.spacing.edgeNodeBetweenLayers': '32',
    'elk.spacing.edgeEdge': '16',
    'elk.layered.spacing.edgeEdgeBetweenLayers': '16',
    'elk.layered.spacing.baseValue': '48',
    'elk.padding': '[top=32,left=32,bottom=32,right=32]',

    // ── Orthogonal routing quality ──
    'elk.layered.unnecessaryBendpoints': 'true',         // drop redundant collinear bends → cleaner elbows
    'elk.layered.mergeEdges': 'false',                   // keep each observed edge distinct (honesty)
  };
}

/** Per-node options. Spine nodes are pinned straight; everything carries explicit size. */
export const SPINE_NODE_OPTIONS: Record<string, string> = {
  'elk.layered.priority.straightness': '10',
  'elk.layered.priority.shortness': '10',
};
```

### 1.3 Why this is deterministic (proof, not assertion)

Determinism = *no pass in the pipeline consumes a random seed*, and *the result is a pure function of input element order*. Each chosen strategy is order-deterministic:

| Pipeline phase | Chosen strategy | Randomized? | Determinism basis |
|---|---|---|---|
| Cycle breaking | `DEPTH_FIRST` | No | DFS over edges in **input order**. (The default `GREEDY` is also deterministic but order-sensitive; DFS is the clearest to reason about.) |
| Layering | `NETWORK_SIMPLEX` | No | Simplex is a deterministic optimization; ties broken by node/edge order. |
| Crossing minimization | `LAYER_SWEEP` + `considerModelOrder=NODES_AND_EDGES` + `semiInteractive=true` | **No** | The *only* phase ELK can randomize. `LAYER_SWEEP` is a fixed number of deterministic forward/back barycenter sweeps; `considerModelOrder` makes the **initial order = input order** (not a random shuffle) and uses it as the tie-break, removing the single source of run-to-run variance. **We never set `elk.layered.thoroughness` to trigger randomized restarts and never enable `INTERACTIVE` randomization.** |
| Node placement | `NETWORK_SIMPLEX` | No | Deterministic coordinate assignment; `favorStraightEdges` is a deterministic objective term. |

**Therefore:** byte-identical input (same `children[]` order, same `edges[]` order, same per-node `width`/`height`) ⇒ byte-identical ELK output (same `x/y` and same `sections[].bendPoints`). The builders already emit deterministic order; the shared helper must **freeze that order** and never re-sort with an unstable comparator before the ELK call. §5 turns this into an executable test.

> **Anti-footgun:** node `width`/`height` MUST be provided explicitly (do not let ELK measure DOM/font metrics). Font metrics vary by machine and would break byte-identity. Flow/variant nodes are a fixed `280×72`; swimlane `280×88`. Pass those constants, not measured rects.

---

## 2. ORTHOGONAL CONNECTORS in React Flow (feed ELK bend points to a custom edge)

React Flow's built-in `smoothstep` (current `WorkflowEdge.tsx`) **does not** know ELK's routing — it draws its own rounded elbow between the two handles, so it will diverge from the layered geometry (edges cut through nodes, miss the routed channel). To get the true Visio orthogonal look we must **draw the polyline ELK computed**, i.e. `startPoint → bendPoints[…] → endPoint`.

### 2.1 Carry ELK sections onto the React Flow edge

The shared `elkLayout()` helper (§3) returns, per edge id, the ordered point list. We stash it on `edge.data.bendPoints` so the custom edge can render it. React Flow's edge component receives `data` unchanged.

```ts
// In the renderer, after ELK resolves (see §3 for elkLayout):
const rfEdges = baseEdges.map((e) => ({
  ...e,
  type: 'workflowEdge',
  data: {
    ...e.data,
    // ELK absolute points for THIS edge, or undefined → fallback to smoothstep.
    elkPoints: elkResult?.edgePoints[e.id], // ElkPoint[] | undefined
  },
}));
```

### 2.2 Custom edge that draws true right angles from ELK points

Extend the existing `WorkflowEdge.tsx` (read-only here — shown as the target shape). When `elkPoints` is present, build an orthogonal `path` from the points and **snap each segment to a right angle** defensively (ELK already returns axis-aligned segments under `ORTHOGONAL`, but we re-snap so any sub-pixel drift can't introduce a diagonal). When absent (SSR / pre-ELK / ELK failure), keep `getSmoothStepPath` exactly as today.

```tsx
// WorkflowEdge.tsx — proposed shape (additive; fallback preserved)
import { BaseEdge, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';

type ElkPoint = { x: number; y: number };

/** Build an SVG path of pure horizontal/vertical segments from ELK points.
 *  Re-snaps each step to a right angle (defensive against sub-pixel drift)
 *  by inserting an L-elbow when two consecutive points differ on both axes. */
function orthogonalPath(points: ElkPoint[]): string {
  if (points.length < 2) return '';
  const r = 6; // corner radius for a soft Visio elbow; set 0 for hard corners
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const prev = points[i - 1];
    const dx = Math.abs(p.x - prev.x);
    const dy = Math.abs(p.y - prev.y);
    if (dx > 0.5 && dy > 0.5) {
      // ELK should never emit a diagonal under ORTHOGONAL, but if it does,
      // force an L-bend through an intermediate corner (axis-first = horizontal).
      d += ` L ${p.x},${prev.y} L ${p.x},${p.y}`;
    } else {
      d += ` L ${p.x},${p.y}`;
    }
  }
  return d;
  // Optional rounded corners: post-process segments to arc joins of radius r.
}

export const WorkflowEdgeComponent = memo(function WorkflowEdgeComponent(props) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected } = props;
  const viewEdge = data?.viewEdge;
  const elkPoints: ElkPoint[] | undefined = data?.elkPoints;

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (elkPoints && elkPoints.length >= 2) {
    edgePath = orthogonalPath(elkPoints);
    // Label sits on the MIDDLE segment of the polyline (the longest straight run
    // reads cleanest for a Visio connector label). Compute midpoint of the
    // segment whose index is floor((n-1)/2).
    const mid = Math.max(0, Math.floor((elkPoints.length - 1) / 2));
    labelX = (elkPoints[mid].x + elkPoints[mid + 1].x) / 2;
    labelY = (elkPoints[mid].y + elkPoints[mid + 1].y) / 2;
  } else {
    // FALLBACK — identical to today (SSR/first-render/ELK-failure path).
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 12,
    });
  }

  // …BaseEdge + EdgeLabelRenderer exactly as today, using edgePath/labelX/labelY…
});
```

**Where labels sit on the orthogonal connector:** on the **midpoint of the central straight segment** (computed above), not at the bounding-box centre. This keeps the honest observed-label chip on a horizontal/vertical run (legible) and away from the corners (where it would overlap the elbow). For very short two-point edges it degenerates to the segment midpoint — same as today.

**Why `type: 'step'` is not enough:** swapping React Flow's `smoothstep` for the built-in `step` edge *does* give right angles, but React Flow computes the elbow itself from the two handle anchors — it does **not** follow ELK's routed channel, so it can still cross nodes when the layered layout routed around them. Consuming `elkPoints` is the only way to get the *layout engine's* routing. The `step` edge is an acceptable **degraded fallback** if ELK is deferred (Plan B, §6).

### 2.3 Handle anchoring (so the elbow meets the node cleanly)

ELK routes from node border to node border. React Flow attaches edges to **handles**. For the elbow to land where ELK intends:
- For `direction=DOWN`: source handle = `Bottom`, target handle = `Top` (set `sourcePosition`/`targetPosition` on the nodes, or fixed handles on the node components).
- For `direction=RIGHT` (swimlane): source = `Right`, target = `Left`.
- Because we draw the **polyline from ELK points** (absolute canvas coords) rather than from the handle positions, exact handle placement is cosmetic for the path itself — but it keeps the arrowhead orientation correct. Set them per-mode.

---

## 3. INTEGRATION — one shared `elkLayout()` helper across flow + variant + swimlane

The whole point: **the deterministic graph stays in the pure builders; ELK assigns geometry client-side; the synchronous builder positions are the fallback.** A single helper serves all three modes.

### 3.1 The shared helper (pure of React; new module `apps/web-app/src/lib/mapLayout/elkLayout.ts`, P1)

```ts
// elkLayout.ts — shared, framework-agnostic. Imported by all 3 renderers + tests.
import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import { elkGraphOptions, SPINE_NODE_OPTIONS, type ElkDirection } from './elkOptions';

export interface LayoutNode { id: string; width: number; height: number; isSpine?: boolean;
  /** Optional lane pin for swimlane mode (see §4). */ layer?: number; fixedY?: number; }
export interface LayoutEdge { id: string; source: string; target: string; }
export interface LayoutGraph { nodes: LayoutNode[]; edges: LayoutEdge[]; direction: ElkDirection; }

export interface LayoutResult {
  /** node id → top-left position (React Flow uses top-left origin). */
  positions: Record<string, { x: number; y: number }>;
  /** edge id → absolute orthogonal polyline (startPoint…bendPoints…endPoint). */
  edgePoints: Record<string, { x: number; y: number }[]>;
}

/** Deterministic identity of a layout problem — identical input ⇒ identical key. */
export function layoutSignature(g: LayoutGraph): string {
  return JSON.stringify([
    g.direction,
    g.nodes.map((n) => [n.id, n.width, n.height, n.isSpine ?? false, n.layer ?? null, n.fixedY ?? null]),
    g.edges.map((e) => [e.id, e.source, e.target]),
  ]);
}

/** Build the ELK graph. Edges live at the ROOT so ORTHOGONAL routing returns sections. */
export function toElkGraph(g: LayoutGraph): ElkNode {
  return {
    id: 'root',
    layoutOptions: elkGraphOptions(g.direction),
    children: g.nodes.map((n) => ({
      id: n.id,
      width: n.width,
      height: n.height,
      layoutOptions: {
        ...(n.isSpine ? SPINE_NODE_OPTIONS : {}),
        // Swimlane lane pin (see §4): force the node into a fixed partition/layer.
        ...(n.layer != null ? { 'elk.partitioning.partition': String(n.layer) } : {}),
      },
    })),
    edges: g.edges.map<ElkExtendedEdge>((e) => ({
      id: e.id, sources: [e.source], targets: [e.target],
    })),
  };
}

/** Run ELK once. Returns top-left positions + absolute orthogonal edge polylines. */
export async function elkLayout(elk: InstanceType<typeof ELK>, g: LayoutGraph): Promise<LayoutResult> {
  const out = await elk.layout(toElkGraph(g));

  const positions: LayoutResult['positions'] = {};
  for (const c of out.children ?? []) {
    positions[c.id] = { x: c.x ?? 0, y: c.y ?? 0 }; // ELK x/y is top-left → React Flow native
  }

  const edgePoints: LayoutResult['edgePoints'] = {};
  for (const e of (out.edges ?? []) as ElkExtendedEdge[]) {
    const section = e.sections?.[0];
    if (!section) continue;
    const pts = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
    edgePoints[e.id] = pts.map((p) => ({ x: p.x, y: p.y }));
  }
  return { positions, edgePoints };
}

/** Construct the singleton ELK instance — browser only, never during SSR. */
export function makeElk(): InstanceType<typeof ELK> { return new ELK(); }
```

> Coordinate note: ELK and React Flow both use a **top-left** node origin, so `positions` map straight onto `node.position`. Edge points are absolute canvas coords, which is exactly what the custom edge draws (React Flow renders edge `path` in the same flow coordinate space).

### 3.2 A reusable client hook so all three renderers share the wiring

```ts
// useElkLayout.ts (client) — one hook the three canvases call.
'use client';
import { useEffect, useRef, useState } from 'react';
import { makeElk, elkLayout, layoutSignature, type LayoutGraph, type LayoutResult } from '@/lib/mapLayout/elkLayout';

export function useElkLayout(graph: LayoutGraph | null): { result: LayoutResult | null; layingOut: boolean } {
  const elkRef = useRef<ReturnType<typeof makeElk> | null>(null);
  if (typeof window !== 'undefined' && elkRef.current === null) elkRef.current = makeElk();

  const [result, setResult] = useState<LayoutResult | null>(null);
  const [layingOut, setLayingOut] = useState(false);
  const sig = graph ? layoutSignature(graph) : '';

  useEffect(() => {
    if (!graph || !elkRef.current) return;
    let cancelled = false;
    setLayingOut(true);
    elkLayout(elkRef.current, graph)
      .then((r) => { if (!cancelled) { setResult(r); setLayingOut(false); } })
      .catch(() => { if (!cancelled) { setResult(null); setLayingOut(false); } }); // keep fallback positions
    return () => { cancelled = true; };
    // sig is the deterministic identity of the layout problem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return { result, layingOut };
}
```

**Hydration safety (precise):** SSR has `result === null` → renderer uses builder fallback `node.position` and `smoothstep` edges. First client render *also* has `result === null` (effect hasn't run) → identical markup → **no mismatch**. ELK swaps positions + edge points only after mount; React Flow animates the one-time settle.

### 3.3 Per-mode skeletons

**(a) Flow — `WorkflowCanvas.tsx`.** Today it consumes `buildFlowData(model)` and renders `nodes`/`edges` with positions from `viewNode.position`. Add:

```tsx
// In WorkflowCanvas.tsx
const { nodes: baseNodes, edges: baseEdges, phaseGroups } = useMemo(() => buildFlowData(model), [model]);

// Project the SAME deterministic graph for ELK (DOWN for the Visio process reading).
const layoutGraph: LayoutGraph = useMemo(() => ({
  direction: 'DOWN',
  nodes: baseNodes.map((n) => ({
    id: n.id, width: 280, height: 72,
    isSpine: n.type !== 'decisionNode', // main path nodes pinned straight; decisions fan out
  })),
  edges: baseEdges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
}), [baseNodes, baseEdges]);

const { result, layingOut } = useElkLayout(layoutGraph);

const rfNodes = useMemo(() => baseNodes.map((n) => ({
  ...n,
  position: result?.positions[n.id] ?? n.position, // ELK if ready, else deterministic fallback
  sourcePosition: 'bottom', targetPosition: 'top',  // handles for DOWN
})), [baseNodes, result]);

const rfEdges = useMemo(() => baseEdges.map((e) => ({
  ...e,
  data: { ...e.data, elkPoints: result?.edgePoints[e.id] }, // orthogonal polyline (or undefined → smoothstep)
})), [baseEdges, result]);

// phaseGroups bounds must be recomputed from ELK positions when result is present —
// reuse buildFlowData's bounds math against result.positions (extract a pure helper).
```

**(b) Variant — `variantFlowModel.ts` consumer (the renderer that calls `buildVariantFlowModel`).** `buildVariantFlowModel` returns a `NormalizedViewModel` that already renders through the flow canvas. **No change to the pure builder** — it keeps emitting the deterministic column layout as the fallback. The renderer projects the same `model.nodes`/`model.edges` into a `LayoutGraph` (identical to (a), with `isSpine: node.nodeType !== 'decision'`) and feeds `useElkLayout`. The existing deterministic column layout is the SSR/fallback; ELK refines it client-side. Because both flow and variant render through the same canvas, **(a) covers (b) once the canvas is ELK-aware** — variant just supplies a different `model`.

**(c) Swimlane — `WorkflowSwimlaneCanvas.tsx` + `swimlaneAdapter.ts`.** Swimlane is the special case: ELK must respect lanes (§4). The adapter still computes the deterministic lane layout (fallback). The renderer builds a `LayoutGraph` where each node carries a `layer`/`fixedY` lane pin, runs `useElkLayout` with `direction: 'RIGHT'`, and **after** ELK returns, overrides each node's `y` back to its lane row (see §4) so ELK's x-routing is used but lane bands are never violated. Lane header nodes and lane backgrounds keep their adapter positions (they are not part of the ELK graph).

### 3.4 What stays in the pure builders (the determinism core)

`buildFlowData`, `buildVariantFlowModel`, `buildSwimlaneData` remain pure, sync, ELK-free. They keep producing deterministic `position` values (the fallback). ELK is imported **only** in `'use client'` renderers + the layout module + tests. This preserves unit-testability and keeps the determinism core free of async.

---

## 4. SWIMLANE constraint — pin ELK nodes to their lane rows

The Visio cross-functional flowchart is non-negotiable on one thing: **a node must stay in its lane.** ELK layered, left to itself, will place nodes wherever crossing-minimization prefers — it does not know about lanes. Two viable mechanisms, in order of preference:

### 4.1 Preferred — `fixedY` override after ELK (simplest, fully deterministic)

Run ELK in `direction=RIGHT` to get **x-positions + orthogonal x-routing only**, then **discard ELK's y for task nodes and force each node's y to its lane row** (the lane's `bounds.y + LANE_PADDING`, exactly as `swimlaneAdapter.ts` already computes). The horizontal sequencing/routing comes from ELK; the vertical lane assignment is pinned by us. Deterministic because the lane row is pure arithmetic from `buildSwimlaneData`.

```ts
// In the swimlane renderer, after useElkLayout returns `result`:
const laneYById = new Map<string, number>();            // from buildSwimlaneData lanes
swim.nodes.forEach((n) => {
  const laneY = laneRowFor(n.id, swim.lanes);            // bounds.y + LANE_PADDING for the node's lane
  if (laneY != null) laneYById.set(n.id, laneY);
});
const rfNodes = swim.nodes.map((n) => ({
  ...n,
  position: {
    x: result?.positions[n.id]?.x ?? n.position.x,       // ELK x (sequence + routing)
    y: laneYById.get(n.id) ?? result?.positions[n.id]?.y ?? n.position.y, // PINNED lane y
  },
}));
```

Edge `elkPoints` still come from ELK; for cross-lane handoff edges the orthogonal polyline naturally drops/rises between lane rows — the right-angle handoff connector is exactly the Visio look. (Minor: because we override node y, ELK's edge endpoints may sit a few px off the pinned node; re-anchor the edge's first/last point to the pinned node border in the custom edge, or accept the small offset — handoff edges read fine either way. Re-anchoring is a P2 polish.)

### 4.2 Alternative — ELK partition/layer constraint (keeps ELK fully authoritative)

ELK supports **partitioning** (`elk.partitioning.activate=true` + per-node `elk.partitioning.partition=<laneIndex>`): nodes with the same partition are grouped. Combined with `direction=RIGHT`, partitions become **rows** (lanes). This keeps y under ELK's control (no override) but is more sensitive to option interactions and harder to prove byte-identical across ELK versions. **Use 4.1 (fixedY override) for the first pass** — it is the most deterministic and the least coupled to ELK internals; revisit 4.2 only if 4.1's small endpoint offsets prove unacceptable.

**Either way, lanes stay intact:** task nodes never leave their system band, handoff edges cross bands as orthogonal connectors, lane headers/backgrounds are untouched by ELK.

---

## 5. DETERMINISM TEST strategy (byte-identical positions)

Two layers, mirroring the prior plan's §4 but generalized to the shared helper.

### 5.1 Fallback determinism (pure, no ELK) — per builder

Each builder's fallback positions are pure arithmetic → snapshot exact coordinates and assert run-to-run equality.

```ts
// e.g. variantFlowModel.test.ts (extend existing), flowAdapter.test.ts, swimlaneAdapter.test.ts
it('fallback positions are byte-identical run-to-run (no Date/random)', () => {
  const a = buildVariantFlowModel(INPUT)!;
  const b = buildVariantFlowModel(INPUT)!;
  const coords = (m) => m.nodes.map((n) => [n.id, n.position.x, n.position.y] as const);
  expect(coords(a)).toEqual(coords(b));
  expect(JSON.stringify(coords(a))).toMatchSnapshot(); // pins exact fallback numbers
});
```

### 5.2 ELK determinism — shared, runs the bundled ELK under Vitest (node, no browser)

The bundled ELK runs in node/jsdom. Assert **run-to-run equality of positions AND edge bend points** on a frozen graph, plus structural invariants. Put in `apps/web-app/src/lib/mapLayout/elkLayout.test.ts` (P1-3):

```ts
import { makeElk, elkLayout, type LayoutGraph } from './elkLayout';

const GRAPH: LayoutGraph = { direction: 'DOWN', nodes: [/*…fixed order…*/], edges: [/*…fixed order…*/] };

it('ELK yields byte-identical positions + bend points for identical input', async () => {
  const r1 = await elkLayout(makeElk(), GRAPH);
  const r2 = await elkLayout(makeElk(), GRAPH); // fresh instance, same frozen options
  expect(JSON.stringify(r1.positions)).toBe(JSON.stringify(r2.positions));
  expect(JSON.stringify(r1.edgePoints)).toBe(JSON.stringify(r2.edgePoints)); // routing is deterministic too
});

it('edge sections are orthogonal (every segment axis-aligned)', async () => {
  const { edgePoints } = await elkLayout(makeElk(), GRAPH);
  for (const pts of Object.values(edgePoints)) {
    for (let i = 1; i < pts.length; i++) {
      const dx = Math.abs(pts[i].x - pts[i-1].x), dy = Math.abs(pts[i].y - pts[i-1].y);
      expect(dx < 0.5 || dy < 0.5).toBe(true); // each segment H or V → right angles only
    }
  }
});

it('spine nodes are collinear on the cross-axis under ELK (DOWN ⇒ shared x band)', async () => {
  const { positions } = await elkLayout(makeElk(), GRAPH);
  const spineXs = SPINE_IDS.map((id) => positions[id].x);
  expect(new Set(spineXs).size).toBe(1); // straight backbone
});

it('order-sensitivity guard: shuffling input node order changes the key (so we never feed unstable order)', () => {
  // layoutSignature must differ when order differs → forces builders to freeze order before ELK.
});
```

> Prefer **run-to-run equality** over a numeric snapshot as the primary gate (robust to an ELK version bump); keep a numeric snapshot as a secondary tripwire that flags when a version bump *does* move geometry, so the change is reviewed not silently absorbed.

### 5.3 CI note

ELK tests run in the normal Vitest pass (`pnpm --filter @ledgerium/web-app test`). They are `async` but fast (tens of nodes, sub-frame). No browser, no worker config.

---

## 6. P0 → P2 punch-list (exact file pointers)

### P0 — shared engine + orthogonal connectors (the Visio core)
- **P0-1 — Frozen options + shared helper.** New `apps/web-app/src/lib/mapLayout/elkOptions.ts` (§1.2) and `apps/web-app/src/lib/mapLayout/elkLayout.ts` (§3.1: `LayoutGraph`, `toElkGraph`, `elkLayout`, `layoutSignature`, `makeElk`). Pure of React. This is the single source of truth for determinism.
- **P0-2 — Orthogonal custom edge.** Modify `apps/web-app/src/components/workflow-view/edges/WorkflowEdge.tsx` (currently 94 lines, uses `getSmoothStepPath` at lines 38–46): add `orthogonalPath()` + `data.elkPoints` branch (§2.2), **keep `getSmoothStepPath` as the fallback** when `elkPoints` absent. Label moves to central-segment midpoint (label block lines 64–91 stays, fed by new `labelX/labelY`).
- **P0-3 — ELK determinism + orthogonality tests.** New `apps/web-app/src/lib/mapLayout/elkLayout.test.ts` (§5.2: run-to-run equality of positions + edgePoints, axis-aligned segments, spine collinearity).

### P1 — wire the three modes
- **P1-1 — Flow canvas ELK-aware.** Modify `apps/web-app/src/components/workflow-view/WorkflowCanvas.tsx` per §3.3(a): project `buildFlowData` output → `LayoutGraph` (DOWN), call `useElkLayout`, `result?.positions[id] ?? n.position`, feed `elkPoints` onto edges, set `sourcePosition='bottom'`/`targetPosition='top'`. Recompute `phaseGroups` bounds from ELK positions (extract bounds math from `flowAdapter.ts:90–104` into a reusable pure fn).
- **P1-2 — Shared client hook.** New `apps/web-app/src/lib/mapLayout/useElkLayout.ts` (§3.2). Singleton ELK via `useRef`, effect keyed on `layoutSignature`.
- **P1-3 — Variant mode.** No builder change to `apps/web-app/src/lib/variantFlowModel.ts` (keep deterministic column layout as fallback). Verify the variant renderer (the component that calls `buildVariantFlowModel` and mounts the flow canvas) flows through the now-ELK-aware `WorkflowCanvas` from P1-1. If variant uses its own canvas instance, apply the §3.3(b) projection there.
- **P1-4 — Swimlane lane pinning.** Modify `apps/web-app/src/components/workflow-view/WorkflowSwimlaneCanvas.tsx` per §3.3(c)+§4.1: build `LayoutGraph` (RIGHT) from `buildSwimlaneData` task nodes, run `useElkLayout`, **override y to lane row** (`swimlaneAdapter.ts` lane `bounds.y + LANE_PADDING`, computed at lines 152–173 / 191–206). Lane headers (lines 251–258) and edges' handoff styling untouched. Re-anchor handoff edge endpoints to pinned node borders (or accept small offset → P2).
- **P1-5 — Fallback `step` edges + loading pill.** While ELK is laying out the first time (`layingOut && !result`), the smoothstep fallback already renders; optionally render a subtle "Arranging…" pill. If ELK is *disabled by flag*, set edge `type` so React Flow's built-in `step` (right angles) is used instead of `smoothstep` for a closer-to-Visio degraded look.

### P2 — performance & polish
- **P2-1 — Lazy-load ELK** via `await import('elkjs/lib/elk.bundled.js')` inside `makeElk`/the effect to keep ~0.5 MB out of the initial client chunk; cache in `elkRef`.
- **P2-2 — Web-worker offload** (`workerUrl`/`workerFactory`) only if a process grows to hundreds of nodes; current scale (a spine + decisions / top-N variants / lane bands) is sub-frame on main thread.
- **P2-3 — Rounded Visio elbows.** Add corner-radius arc joins in `orthogonalPath()` (the `r` knob) for the soft-elbow Visio aesthetic; keep `r=0` available for hard corners.
- **P2-4 — `fitView` after swap.** Call `useReactFlow().fitView()` in the effect *after* `setResult` so the camera frames the ELK layout, not the fallback (all three canvases).
- **P2-5 — Swimlane handoff endpoint re-anchor.** Snap ELK edge first/last point to the pinned node border (removes the small offset from §4.1).
- **P2-6 — Phase-group / lane-background bounds from ELK** (flow phase groups, swimlane lane widths) recomputed post-layout so backgrounds always wrap the final node rects.

---

## 7. Plan B — deterministic hand-rolled orthogonal routing (if ELK judged too risky for pass 1)

ELK is the right answer (it owns crossing minimization + true orthogonal channel routing), but if async + bundle size is judged too risky for a first pass, ship a **deterministic hand-rolled** version. Two halves:

**Plan B layout** — already specified in `docs/features/process-variation/polish/LAYOUT_PLAN.md §5` (layer assignment by backbone index, interval-graph greedy lane coloring in frequency order, forward-only edge construction). The flow and swimlane modes already have deterministic column/lane layouts that serve as their Plan-B layout. **No new layout work needed for pass-1 Plan B beyond what exists** — the builders' current positions are the fallback.

**Plan B orthogonal routing** (the new part — replaces ELK's `sections`): compute right-angle polylines **deterministically from the fallback node positions**, no engine:

```ts
// Deterministic Manhattan elbow between two nodes (top-left origin, w×h known).
// DOWN mode: exit bottom-center, enter top-center, single mid-Y elbow.
function manhattanDown(s: Rect, t: Rect): {x:number;y:number}[] {
  const sx = s.x + s.w / 2, sy = s.y + s.h;          // bottom-center of source
  const tx = t.x + t.w / 2, ty = t.y;                // top-center of target
  if (Math.abs(sx - tx) < 0.5) return [{x:sx,y:sy},{x:tx,y:ty}]; // straight down
  const midY = (sy + ty) / 2;                        // elbow on the half-way rank line
  return [{x:sx,y:sy},{x:sx,y:midY},{x:tx,y:midY},{x:tx,y:ty}]; // ⌐ shape
}
// RIGHT mode (swimlane): exit right-center, enter left-center, single mid-X elbow.
function manhattanRight(s: Rect, t: Rect): {x:number;y:number}[] {
  const sx = s.x + s.w, sy = s.y + s.h/2, tx = t.x, ty = t.y + t.h/2;
  if (Math.abs(sy - ty) < 0.5) return [{x:sx,y:sy},{x:tx,y:ty}];
  const midX = (sx + tx) / 2;
  return [{x:sx,y:sy},{x:midX,y:sy},{x:midX,y:ty},{x:tx,y:ty}];
}
```

Feed these point arrays into **the same `data.elkPoints` channel** the custom edge already consumes (§2.2) — so the custom edge code is written once and works for both ELK and Plan-B routing. Plan-B routing is pure arithmetic over deterministic positions → byte-identical, hydration-safe, zero async, zero new deps.

**Plan B vs ELK gap:** Plan-B elbows are simple single-bend Manhattan connectors that **do not avoid intermediate nodes** (an edge may clip a node it routes "over") and do **not** minimize crossings. For the typical spine + few branches / few-lane process this reads clean; ELK wins decisively at high branch/lane density. **Recommendation:** ship Plan-B routing as the SSR/fallback connector regardless (it is the hydration-safe default and reuses the custom-edge), then layer ELK's superior `sections` on top via §3 once the effect runs — exactly the same fallback-then-refine pattern as positions. You get the safe deterministic Visio-ish look immediately and the world-class routed look once ELK settles.

---

## 8. Decision summary

- **Adopt ELK `layered` as the shared engine** for all three modes via one `elkLayout()` helper; keep each builder's existing deterministic layout as the synchronous fallback. (Generalizes `LAYOUT_PLAN.md` from variant-only to all modes.)
- **`direction = DOWN`** for flow + variant (canonical Visio process reading), **`RIGHT` + lane-pin** for swimlane.
- **Orthogonal connectors** come from `edge.sections[].bendPoints`, drawn by an extended `WorkflowEdge` that falls back to `getSmoothStepPath` for SSR/first-render/failure — labels on the central straight segment.
- **Determinism** is guaranteed by the frozen, randomization-free option set + frozen input order + explicit node sizes, and proven by run-to-run equality tests on **both** positions and edge bend points.
- **Hydration-safe** by construction: ELK runs only in `useEffect`; SSR and first client render use the fallback; identical markup ⇒ no mismatch.
- **Plan B** (deterministic Manhattan routing into the same custom-edge channel) is the recommended SSR/fallback connector even when ELK ships, and the full fallback if ELK is deferred.
