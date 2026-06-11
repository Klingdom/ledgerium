# Variant Story Map — Deterministic Layered (Sugiyama) Layout Plan

**Date:** 2026-06-11
**Author:** process-mining graph-visualization engineer (planning artifact — READ-ONLY on product code)
**Scope:** Give the variant story map a deterministic, layered, collision-free layout (the single biggest polish lever).
**Target surfaces (no code modified in this iteration):**
- `apps/web-app/src/lib/variantStoryMap.ts` — pure builder (graph generation)
- `apps/web-app/src/components/workflow-view/WorkflowVariantStoryMap.tsx` — client renderer (React Flow / `@xyflow/react`)
- `apps/web-app/src/lib/variantStoryMap.test.ts` — determinism + structural tests

---

## 0. Current state (verified)

`buildVariantStoryMap` hand-rolls positions:

- Spine: `bb-i` at `x = i * 170`, `y = 0`.
- Branch lane `lane` (0-based over the *shown* branches): all nodes at `y = (lane + 1) * 120`.
- Branch node X = linear interpolation between anchor X's:
  - `startX = (startIdx >= 0 ? startIdx : -0.6) * 170`
  - `endX   = (endIdx < len ? endIdx : len-1+0.6) * 170`
  - node `k` of `count`: `x = startX + (endX - startX) * (k+1)/(count+1)`.

**Confirmed defects:**

1. **Head-divergence backward arrow.** When `divergeAfterIndex === -1` (a variant that *prepends* steps before the backbone start — e.g. a `login` before `click`), `startX = -0.6 * 170 = -102`, but `sourceBackboneId` is forced to `bb-0` (`startIdx >= 0 ? startIdx : 0`) which sits at `x = 0`. The entry edge therefore runs **from x=0 to x=-102 — a leftward (backward) arrow** in a left→right diagram. The divergenceAnalyzer test (`divergeAfterIndex.toBe(-1)`, `altSteps: ['login']`) confirms this case is real, not theoretical.
2. **Lane collisions.** Every branch gets one flat lane (`(lane+1)*120`). Two branches that span overlapping X-ranges but happen to land on *different* lanes are fine, but branches are packed by frequency rank, not by X-span — so a long shallow branch and a short deep branch frequently overlap horizontally while a different pair wastes vertical space. With many branches the lanes stack arbitrarily deep with no crossing minimization. Branch *entry/rejoin* edges cross the spine and each other unpredictably.
3. **No real layering.** Branch node X is interpolated, not snapped to layers, so branch nodes do not align vertically with the backbone steps they sit between. Edges are not orthogonal; `smoothstep` curves hide but do not fix the structural mess.

**Asset already present:** `elkjs@^0.11.1` is a dependency (verified in `apps/web-app/package.json` and installed at `node_modules/.pnpm/elkjs@0.11.1`), currently **unused**. Entry point `lib/main`, default export is the `ELK` constructor; `elk.layout(graph, args): Promise<ElkNode>`. The bundled algorithm `layered` (the Sugiyama/Brandes-Köpf pipeline) ships in `elk.bundled.js`.

**Hard constraints:** deterministic (same input → byte-identical layout, required for hydration safety — this app had a hydration-crash crisis); no `Date`/random. ELK is deterministic *given fixed input element ordering and fixed options* (no randomized seeding is enabled by default in `layered`).

---

## 1. RECOMMENDATION — **Adopt ELK `layered`** (not improve the hand-roll)

**Decision: use ELK `layered` with `elk.direction = RIGHT`, orthogonal routing, run it client-side, with a deterministic hand-rolled fallback (Plan B below) wired in as the synchronous default position so first paint is never empty and SSR/hydration is safe.**

### Why ELK over polishing the hand-roll

| Criterion | Hand-roll (even improved) | ELK `layered` |
|---|---|---|
| Layer assignment | We'd have to implement longest-path / network-simplex ranking ourselves | Built-in (`NETWORK_SIMPLEX`) |
| Within-layer ordering / crossing minimization | We'd have to implement a barycenter/median heuristic | Built-in (`LAYER_SWEEP`, deterministic) |
| Back-edge handling (head-divergence) | Manual cycle/back-edge reversal | ELK reverses back-edges internally; we additionally normalize the graph so there are none (see §3) |
| Spine straightness | Manual | `nodePlacement.strategy = NETWORK_SIMPLEX` + node-priority on the spine keeps the backbone collinear |
| Orthogonal edges | Manual bend computation | `edgeRouting = ORTHOGONAL` returns bend points |
| Determinism | Yes (arithmetic) | Yes (no randomized passes in this option set; fixed input order ⇒ fixed output) |
| Maintenance | Grows with every new branch topology | Bounded — ELK owns the hard graph theory |

The hand-roll cannot be made "professional and never collide" without effectively re-implementing Sugiyama. ELK is already paid for (installed). The only real cost is async, which we neutralize with a sync deterministic fallback (Plan B) used as the initial positions.

### Exact ELK options (stable, left→right, spine-straight, deterministic)

Set these as graph-level `layoutOptions`:

```ts
const ELK_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',                          // left → right
  'elk.edgeRouting': 'ORTHOGONAL',                   // crisp right-angle edges
  // Layering / ordering — all deterministic strategies:
  'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.crossingMinimization.semiInteractive': 'true', // honor our input order as the tie-break seed
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',     // straightens the backbone
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',// stable, input-order-driven ordering
  'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',         // deterministic back-edge reversal (no greedy randomness)
  // Spacing (tuned to current 96–140px node width):
  'elk.layered.spacing.nodeNodeBetweenLayers': '64',          // horizontal layer gap
  'elk.spacing.nodeNode': '36',                               // vertical gap within a layer (lane separation)
  'elk.layered.spacing.edgeNodeBetweenLayers': '24',
  'elk.spacing.edgeEdge': '12',
  'elk.layered.spacing.edgeEdgeBetweenLayers': '12',
  'elk.padding': '[top=24,left=24,bottom=24,right=24]',
  // Pin the backbone collinear: high node-placement priority on spine nodes (set per-node, see below).
};
```

Per-node options (set on each `ElkNode`):
- **Spine nodes** (`bb-*`): `'elk.layered.priority.straightness': '10'` and `'elk.layered.priority.shortness': '10'` so the network-simplex placement keeps them on one horizontal line.
- All nodes carry explicit `width`/`height` (measure once; default `width: 120, height: 36`) so ELK reserves exact space and the result is reproducible regardless of font metrics.

**Determinism guarantees with this set:** no option enables a randomized pass. `NETWORK_SIMPLEX` (layering + placement), `LAYER_SWEEP` crossing-min with `considerModelOrder` + `semiInteractive`, and `DEPTH_FIRST` cycle breaking are all order-deterministic. Therefore *byte-identical input (same node array order, same edge array order) ⇒ byte-identical output*. The builder already emits nodes/edges in a deterministic order (the `ranked.sort` + index loops), so we only must **freeze that order before handing it to ELK** and never re-sort with an unstable comparator.

---

## 2. INTEGRATION — pure sync graph + async ELK positioning + sync fallback

**Split of responsibilities (the core architectural move):**

- **`buildVariantStoryMap` (pure, sync, unchanged contract) computes the GRAPH only** — nodes, edges, kinds, frequencies, `runShare`, evidence. It will **stop owning the authoritative layout** but keep emitting `x`/`y` as a *deterministic fallback layout* (Plan B layered hand-roll — see §5) so SSR and the pre-ELK first paint are correct, never empty, and hydration-stable.
- **ELK runs only in the client component**, in an effect, after mount. It reads the graph, returns positions, and we swap them in. Because ELK never runs during SSR, hydration sees only the deterministic builder positions on both server and first client render → no mismatch.

### Builder change (minimal, additive)

The builder keeps its current signature and return type. Internally, replace the lane-interpolation block with the **Plan B layered fallback** (§5) so the `x`/`y` it returns are already a clean layered layout (good enough to ship if ELK is deferred, and a safe fallback if ELK fails). No new async, no new deps in the pure module. The pure module must remain free of ELK import (ELK is browser/worker-ish and async; keeping the determinism core ELK-free preserves unit-testability and matches the existing "positions computed here, reproducible" doc comment — we update that comment to say "fallback positions").

Also export a tiny stable graph-shape helper for the component to feed ELK:

```ts
// variantStoryMap.ts (additive export)
export interface StoryGraphForLayout {
  nodes: { id: string; width: number; height: number; isSpine: boolean }[];
  edges: { id: string; source: string; target: string }[];
}

/** Deterministic, order-frozen projection of the map for a layout engine. */
export function toLayoutGraph(map: VariantStoryMap): StoryGraphForLayout {
  return {
    nodes: map.nodes.map((n) => ({
      id: n.id,
      width: 120,
      height: 36,
      isSpine: n.kind === 'backbone',
    })),
    edges: map.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  };
}
```

`map.nodes` / `map.edges` are already in deterministic order, so this projection is order-stable.

### Component change — concrete skeleton (`WorkflowVariantStoryMap.tsx`)

Add a single-instance ELK, a layout effect, a loading state, and a fallback. Key points: **ELK constructed once via `useRef` (module-singleton-per-component) — never in render**; positions keyed by a deterministic graph signature so identical input never re-lays-out or flickers; on any failure we keep the builder's deterministic fallback positions.

```tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js'; // bundled = no separate worker file needed
import {
  buildVariantStoryMap,
  toLayoutGraph,
  type VariantStoryMap,
  type StoryEdge,
} from '@/lib/variantStoryMap';

// ELK layered options — frozen for determinism (see LAYOUT_PLAN §1).
const ELK_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.crossingMinimization.semiInteractive': 'true',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
  'elk.layered.spacing.nodeNodeBetweenLayers': '64',
  'elk.spacing.nodeNode': '36',
  'elk.layered.spacing.edgeNodeBetweenLayers': '24',
  'elk.spacing.edgeEdge': '12',
  'elk.padding': '[top=24,left=24,bottom=24,right=24]',
};

type PosMap = Record<string, { x: number; y: number }>;

/** Deterministic signature: identical graph topology + sizes ⇒ identical key. */
function graphSignature(map: VariantStoryMap): string {
  const g = toLayoutGraph(map);
  return JSON.stringify([
    g.nodes.map((n) => [n.id, n.width, n.height, n.isSpine]),
    g.edges.map((e) => [e.id, e.source, e.target]),
  ]);
}

/** Run ELK once for a given map; resolves to a position map keyed by node id. */
async function runElk(elk: InstanceType<typeof ELK>, map: VariantStoryMap): Promise<PosMap> {
  const g = toLayoutGraph(map);
  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: ELK_OPTIONS,
    children: g.nodes.map((n) => ({
      id: n.id,
      width: n.width,
      height: n.height,
      layoutOptions: n.isSpine
        ? { 'elk.layered.priority.straightness': '10', 'elk.layered.priority.shortness': '10' }
        : undefined,
    })),
    edges: g.edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };
  const out = await elk.layout(elkGraph);
  const pos: PosMap = {};
  for (const c of out.children ?? []) pos[c.id] = { x: c.x ?? 0, y: c.y ?? 0 };
  return pos;
}

function StoryMapInner({ variants, onSelectNode }: Props) {
  const [maxBranches, setMaxBranches] = useState(99);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // 1) Pure deterministic graph + FALLBACK positions (server + first client render use these).
  const map = useMemo(
    () => buildVariantStoryMap(variants.map(/* …unchanged mapping… */), { maxBranches }),
    [variants, maxBranches],
  );

  // 2) ELK singleton — constructed once, in the browser only.
  const elkRef = useRef<InstanceType<typeof ELK> | null>(null);
  if (typeof window !== 'undefined' && elkRef.current === null) {
    elkRef.current = new ELK();
  }

  // 3) ELK positions (client-only). Keyed by deterministic signature so identical
  //    input never re-lays-out; stale results from a superseded map are ignored.
  const [elkPos, setElkPos] = useState<PosMap | null>(null);
  const [layingOut, setLayingOut] = useState(false);
  const sig = map ? graphSignature(map) : '';

  useEffect(() => {
    if (!map || !elkRef.current) return;
    let cancelled = false;
    setLayingOut(true);
    runElk(elkRef.current, map)
      .then((pos) => { if (!cancelled) { setElkPos(pos); setLayingOut(false); } })
      .catch(() => { if (!cancelled) { setElkPos(null); setLayingOut(false); } }); // fall back to builder positions
    return () => { cancelled = true; };
    // sig is the deterministic identity of the layout problem; re-run only when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // 4) React Flow nodes: prefer ELK positions; otherwise the deterministic builder fallback.
  const { rfNodes, rfEdges } = useMemo(() => {
    if (!map) return { rfNodes: [], rfEdges: [] };
    const rfNodes = map.nodes.map((n) => ({
      id: n.id,
      type: 'storyNode',
      position: elkPos?.[n.id] ?? { x: n.x, y: n.y }, // ELK if ready, else fallback
      data: n,
      draggable: false,
    }));
    const rfEdges = map.edges.map((e) => ({ /* …unchanged styling… */ }));
    return { rfNodes, rfEdges };
  }, [map, elkPos]);

  // …guard for !map unchanged…
  // Optional: show a subtle "Arranging…" pill while layingOut && !elkPos (first layout only).
}
```

**Hydration safety, precisely:**
- SSR renders with `elkPos === null` → uses `{ x: n.x, y: n.y }` (deterministic builder fallback). First client render *also* has `elkPos === null` (effect hasn't run yet) → identical markup → **no hydration mismatch**.
- ELK swaps positions only *after* mount, in `useEffect` (client-only). React Flow then re-positions nodes with a CSS transform animation — visually a one-time settle, not a flash of empty canvas.
- `import 'elkjs/lib/elk.bundled.js'` is fine in a `'use client'` file; Next will only ship it to the client bundle. (If bundle size is a concern, lazy-load ELK with `await import('elkjs/lib/elk.bundled.js')` inside the effect so it's not in the initial chunk — see P1 punch-list.)

**Why `elk.bundled.js` and not a Web Worker:** the bundled build runs ELK synchronously-internally on the main thread inside a Promise — no separate worker URL to configure in Next, no CORS/worker-bundling friction. For our graph sizes (a spine + top-N branches, tens of nodes) main-thread layout is sub-frame. A worker (`workerUrl`/`workerFactory`) is a P2 optimization only if we later layout hundreds of nodes.

---

## 3. Fix head-divergence backward arrow + branch lane collisions

These are fixed by the layering engine **plus** one graph-normalization rule in the builder so ELK never sees a back-edge or a danging anchor.

### 3a. Head-divergence (`divergeAfterIndex === -1`)

Root cause: the entry edge is forced to source from `bb-0` while the branch nodes are placed left of `bb-0`. Two coupled fixes:

1. **Topological fix (builder, deterministic):** introduce a synthetic **source super-node** `start` and a synthetic **sink super-node** `end`, OR — simpler and zero new visible nodes — when `divergeAfterIndex === -1`, **do not draw a spine-anchored entry edge at all**; instead source the entry edge from the branch's own first node's predecessor = the `start` boundary. Concretely: a head-divergence branch's first node should layer *before* `bb-0`. Because ELK assigns layers by longest-path from sources, a branch node with an edge *into* `bb-0` (rejoin at index 0) and *no* incoming spine edge will naturally be placed in the layer left of `bb-0` — and the rejoin edge points rightward (`br → bb-0`), which is forward. So: for `divergeAfterIndex === -1`, **emit only the rejoin edge `lastBranchNode → bb-reconvergeAtIndex` and the intra-branch edges; omit the spine-source entry edge.** The branch then "hangs" off the left and flows right into the backbone — no backward arrow.
2. **Layout fix (ELK):** `cycleBreaking.strategy = DEPTH_FIRST` guarantees any residual back-edge (e.g. a tail variant that rejoins upstream) is reversed deterministically before layering, so the rendered arrowhead is corrected. Combined with (1), the head case produces zero leftward edges.

For the symmetric **tail-divergence** case (`reconvergeAtIndex === backbone.length`, e.g. `logout` appended after the last step): the rejoin target is forced to `bb-last`; emit only the entry edge `bb-(len-1) → firstBranchNode` and the intra-branch edges, **omit the rejoin edge** to the (nonexistent) `bb-len`. ELK places the trailing branch nodes in layers right of `bb-last` — forward flow, no backward arrow.

### 3b. Lane collisions

Root cause: flat `(lane+1)*120` lanes ignore X-span overlap and do no crossing minimization. ELK's within-layer ordering (`LAYER_SWEEP` + `considerModelOrder`) assigns each branch node a vertical slot *per layer*, packing branches that don't overlap into the same vertical band and separating those that do — i.e. real lane assignment with crossing minimization. `elk.spacing.nodeNode = 36` guarantees a minimum vertical gap so nodes in the same layer never touch. Because branches now share layers with the backbone steps they sit between, branch nodes align under their diverge/rejoin anchors instead of drifting via interpolation. Result: no overlap, minimized crossings, vertical compactness.

**Deterministic ordering seed for lanes:** the builder already ranks branches by run-weighted frequency with a total-order tie-break (weight, then `divergeAfterIndex`, then `reconvergeAtIndex`, then `altSteps` join). Because we feed nodes/edges to ELK in that order and set `considerModelOrder = NODES_AND_EDGES` + `semiInteractive = true`, **the highest-frequency branch deterministically gets the lane closest to the spine**, and ties break identically every run — byte-identical layout, and frequency-meaningful lane order (a nice UX bonus).

---

## 4. Determinism proof strategy (test)

Goal: assert byte-identical positions for a fixed input. Two layers of assertion.

### 4a. Builder fallback determinism (pure, no ELK) — extend `variantStoryMap.test.ts`

The builder fallback is pure arithmetic, so we can snapshot exact coordinates:

```ts
it('produces byte-identical fallback positions across repeated builds (no Date/random)', () => {
  const a = buildVariantStoryMap([STD, INSERT, SHORTCUT])!;
  const b = buildVariantStoryMap([STD, INSERT, SHORTCUT])!;
  const coords = (m: VariantStoryMap) =>
    m.nodes.map((n) => [n.id, n.x, n.y] as const);
  expect(coords(a)).toEqual(coords(b));            // identical run-to-run
  expect(JSON.stringify(coords(a))).toMatchSnapshot(); // pins exact numbers
});

it('emits no leftward (backward) entry edges for head/tail divergence', () => {
  const HEAD = v('vh', ['login', 'click', 'fill', 'submit'], 2); // login before backbone
  const m = buildVariantStoryMap([STD, HEAD])!;
  const byId = new Map(m.nodes.map((n) => [n.id, n]));
  for (const e of m.edges) {
    const s = byId.get(e.source)!, t = byId.get(e.target)!;
    expect(t.x).toBeGreaterThanOrEqual(s.x); // every edge flows right (or vertical)
  }
});
```

### 4b. ELK determinism — dedicated test (`variantStoryMap.elk.test.ts`)

ELK is async but deterministic; run it twice on the same frozen graph and assert byte-identical output. Run in jsdom/node via Vitest (the bundled ELK runs without a browser).

```ts
import ELK from 'elkjs/lib/elk.bundled.js';
import { buildVariantStoryMap, toLayoutGraph } from './variantStoryMap';
import { ELK_OPTIONS, runElk } from '...'; // export runElk/options from a shared layout module (see P1)

it('ELK layered yields byte-identical positions for identical input', async () => {
  const map = buildVariantStoryMap([STD, INSERT, SHORTCUT])!;
  const elk = new ELK();
  const p1 = await runElk(elk, map);
  const p2 = await runElk(new ELK(), map); // fresh instance, same options
  expect(JSON.stringify(p1)).toBe(JSON.stringify(p2));
});

it('spine nodes are collinear (same y) under ELK', async () => {
  const map = buildVariantStoryMap([STD, INSERT])!;
  const pos = await runElk(new ELK(), map);
  const spineYs = map.nodes.filter((n) => n.kind === 'backbone').map((n) => pos[n.id]!.y);
  expect(new Set(spineYs).size).toBe(1); // one horizontal line
});
```

**To make 4b airtight, extract the ELK call + options into a small pure-ish module** `apps/web-app/src/lib/variantStoryLayout.ts` (exports `ELK_OPTIONS`, `toElkGraph(map)`, `runElk(elk, map)`), imported by both the component and the test. This keeps the options frozen in one place and lets the test assert against the exact production option set. (Snapshotting the exact ELK numbers is *also* valid since ELK is deterministic, but assert run-to-run equality first — it's robust to an ELK version bump in a way a numeric snapshot is not.)

---

## 5. PLAN B — best deterministic hand-rolled LAYERED layout (if ELK deferred)

If ELK is judged too heavy/async-risky for this iteration, ship a **proper layered hand-roll** (still a huge upgrade over interpolation, and it doubles as the §2 fallback regardless). It implements the three Sugiyama phases minus the optimal heuristics: **(1) layer assignment by backbone index, (2) within-layer ordering by frequency, (3) back-edge elimination by construction.**

### Layer model

- **Layer index `L`** = position along the X axis. Backbone node `bb-i` ⇒ `L = i`. Branch node `k` of a branch on `[divergeAfterIndex, reconvergeAtIndex]` ⇒ `L = divergeAfterIndex + 1 + k` (snapped to integer layers between its anchors), clamped to `[0, backbone.length-1]` for interior branches; head branches use fractional pre-layers (see below), tail branches use post-layers.
- **X = `L * LAYER_W`** (uniform layer pitch; e.g. `LAYER_W = 184` = node width 120 + gap 64). Branch nodes share the backbone's X grid ⇒ vertical alignment.

### Within-layer ordering (lane assignment with no overlap)

For each layer, collect the nodes occupying it (the one backbone node at `y=0`, plus any branch nodes). Assign branch nodes to **stacked lanes** below the spine using an **interval-graph greedy coloring** so two branches that overlap in layer-range never share a lane:

```
# Pseudocode — deterministic layered hand-roll
LAYER_W = 184; LANE_H = 64; NODE_H = 36

# Phase 1: layer assignment
for bb_i in backbone: layer[bb_i] = i; y[bb_i] = 0
for branch in shown (already freq-ranked, deterministic):
    s = branch.divergeAfterIndex; e = branch.reconvergeAtIndex
    for k, alt in enumerate(branch.altSteps):
        layer[node] = clamp(s + 1 + k, 0, len(backbone)-1) if interior
                      else (s + 1 + k)              # head: s=-1 ⇒ layer 0,1,...; tail: ⇒ len, len+1,...
    branch.minLayer = min over its nodes; branch.maxLayer = max over its nodes

# Phase 2: lane assignment via interval coloring (deterministic, freq order)
laneEndLayer = []   # laneEndLayer[L] = last layer occupied by the branch currently in lane L
for branch in shown:               # iterate in frequency rank ⇒ frequent branches get inner lanes
    placed = false
    for L in range(len(laneEndLayer)):
        if branch.minLayer > laneEndLayer[L]:        # free in this lane (no overlap)
            assign lane L; laneEndLayer[L] = branch.maxLayer; placed = true; break
    if not placed:
        assign lane len(laneEndLayer); laneEndLayer.append(branch.maxLayer)
    for node in branch: y[node] = (lane + 1) * LANE_H   # below spine; deeper lane = larger y

# Phase 3: X from layer; back-edges eliminated by construction
for node: x[node] = layer[node] * LAYER_W

# Phase 4: edge sourcing — NO backward arrows
for branch:
    if divergeAfterIndex == -1:   # head: omit spine entry edge; flow runs right into bb-reconverge
        edges += intraBranch + rejoin(lastNode -> bb[reconvergeAtIndex])
    elif reconvergeAtIndex == len(backbone):  # tail: omit rejoin; entry from bb-last
        edges += entry(bb[len-1] -> firstNode) + intraBranch
    else:
        edges += entry(bb[s] -> firstNode) + intraBranch + rejoin(lastNode -> bb[e])
```

**Why this is collision-free and forward-only:**
- Interval coloring guarantees two branches whose `[minLayer, maxLayer]` ranges overlap get *different* lanes ⇒ no two branch nodes ever share an `(x, y)` cell.
- X is strictly `layer * LAYER_W` and every edge goes from a lower or equal layer to a higher layer (entry: `s → s+1`; intra: `L → L+1`; rejoin: `maxLayer → e` where `e > maxLayer` for interior/head, and for tail the entry is `len-1 → len`). Head/tail edge-omission removes the only two backward cases. ⇒ **no leftward arrows.**
- Frequency-ordered lane assignment ⇒ deterministic and meaningful (frequent branches hug the spine).

**Determinism:** pure integer arithmetic over a deterministically-ordered branch list; no `Date`/random; byte-identical run-to-run. This is exactly the fallback the builder should emit per §2, so Plan B is *not wasted work* even if ELK ships — it's the required hydration-safe default.

**Plan B vs ELK gap:** Plan B does layer assignment + interval-lane ordering + forward edges, but **does not minimize edge crossings** (ELK's `LAYER_SWEEP` does) and uses straight lanes rather than orthogonal routed bends. For the typical spine + ~3–8 branches this is visually clean; ELK wins decisively only at high branch counts. Recommendation stands: **ship Plan B as the builder fallback now, layer ELK on top via §2** — you get the safe default immediately and the world-class layout once the effect runs.

---

## 6. P0 → P2 punch-list (with file pointers)

### P0 — correctness & "never collides" (ship-blocking)
- **P0-1 — Replace interpolation with deterministic layered fallback in the builder.** Implement §5 Phases 1–4 inside `buildVariantStoryMap`, replacing the `shown.forEach` lane block (`apps/web-app/src/lib/variantStoryMap.ts:148–184`). Update the module doc comment (lines 9–12) from "positions computed here, NOT by a layout library" → "deterministic *fallback* positions computed here; authoritative layout assigned client-side by ELK". Add `toLayoutGraph` export (§2).
- **P0-2 — Kill head/tail backward arrows.** Implement edge-omission rules (§3a / §5 Phase 4) for `divergeAfterIndex === -1` and `reconvergeAtIndex === backbone.length`. Pointer: builder branch loop `variantStoryMap.ts:157–184` (the `startX = -0.6` / forced `bb-0` source is the bug).
- **P0-3 — Determinism tests.** Add the §4a tests (snapshot exact fallback coords + "every edge flows right") to `apps/web-app/src/lib/variantStoryMap.test.ts`. Keep existing assertions (`spine x === [0,170,340]`) — note they'll need updating to the new `LAYER_W` grid; update them in the same change and re-pin.

### P1 — ELK layout + integration
- **P1-1 — Extract layout module.** New `apps/web-app/src/lib/variantStoryLayout.ts` exporting `ELK_OPTIONS`, `toElkGraph(map)`, `runElk(elk, map)` (§2/§4b). Pure of React.
- **P1-2 — Wire ELK into the renderer.** Apply the §2 skeleton to `apps/web-app/src/components/workflow-view/WorkflowVariantStoryMap.tsx`: `elkRef` singleton, `useEffect` keyed on `graphSignature`, `elkPos ?? {x:n.x,y:n.y}` in the node map (current node mapping at `WorkflowVariantStoryMap.tsx:111–117`). Update the component doc comment (lines 3–10) to describe the sync-fallback + async-ELK split.
- **P1-3 — ELK determinism test.** New `apps/web-app/src/lib/variantStoryMap.elk.test.ts` per §4b (run-to-run equality + spine collinearity). Confirms the frozen option set.
- **P1-4 — Orthogonal edges in React Flow.** Switch edge `type: 'smoothstep'` → `'step'` (or a custom edge consuming ELK bend points) to match ELK's `ORTHOGONAL` routing (`WorkflowVariantStoryMap.tsx:121`). Verify edge labels (`edgeLabel`, lines 74–80) still anchor sensibly on stepped edges.
- **P1-5 — Loading affordance.** Render a subtle "Arranging…" pill while `layingOut && !elkPos` (first layout only) so the one-time settle reads as intentional, not a jump.

### P2 — performance & polish
- **P2-1 — Lazy-load ELK** via `await import('elkjs/lib/elk.bundled.js')` inside the effect to keep it out of the initial client chunk (ELK bundled is ~0.5MB). Construct on first need; cache in `elkRef`.
- **P2-2 — Web-worker offload** (only if node counts grow): use ELK `workerUrl`/`workerFactory` so layout never touches the main thread. Not needed at current scale.
- **P2-3 — Spine-priority tuning.** If the backbone still bows under heavy branching, raise per-spine-node `elk.layered.priority.straightness` and/or add an invisible high-weight spine "chain" constraint. Validate against the §4b collinearity test.
- **P2-4 — `fitView` stability.** Re-call `fitView` after ELK swaps positions (React Flow `useReactFlow().fitView()` in the same effect, post-`setElkPos`) so the camera frames the final layout, not the fallback. Current `fitView` prop (`WorkflowVariantStoryMap.tsx:177`) fits the fallback only.

---

## Appendix — verified environment facts
- `elkjs@0.11.1` installed at `node_modules/.pnpm/elkjs@0.11.1/node_modules/elkjs`; entry `lib/main`; default export = `ELK` constructor; `elk.layout(graph, args): Promise<ElkNode>`; bundled algorithms in `lib/elk.bundled.js` (includes `layered`).
- Renderer is client-only (`'use client'`, `@xyflow/react`), positions sourced from builder `{x,y}` (`WorkflowVariantStoryMap.tsx:114`).
- Builder is pure/sync, emits deterministic node/edge order (`variantStoryMap.ts:113–184`); divergence cases incl. head (`divergeAfterIndex === -1`) and tail (`reconvergeAtIndex === backbone.length`) are real per `packages/intelligence-engine/src/divergenceAnalyzer.test.ts`.
- Tests run under Vitest (`vitest run`); existing structural tests at `apps/web-app/src/lib/variantStoryMap.test.ts`.
