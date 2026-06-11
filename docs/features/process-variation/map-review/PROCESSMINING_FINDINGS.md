# Process-Mining Graph-Visualization Findings

**Role:** Process-mining graph-visualization specialist (algorithms + graph theory)
**Mode:** Define-phase review — READ-ONLY on product code. Zero product files modified.
**Date:** 2026-06-10
**Scope:** How to merge N browser-recording runs into ONE readable, deterministic, evidence-linked variant map that renders variant workflows + decision points as a single process map.

**Hard constraints (Ledgerium core):** strictly deterministic (no `Date`/`Math.random`; stable total-order sorts; pinned algorithm-version hash), evidence-linked (carry `evidenceRunIds` on every node/edge/branch), reuse existing engines + React Flow (`@xyflow/react`).

---

## 0. Ground truth — what already exists (real files)

The codebase is further along than a greenfield process-map task. The Path E graph model already encodes most of the entity contract this review needs. Findings below FOLD INTO existing surfaces rather than proposing parallel ones.

| Capability | File(s) | Status for this review |
|---|---|---|
| LCS-backbone diverge→reconverge + DFG split/join cross-check | `packages/intelligence-engine/src/divergenceAnalyzer.ts` | **Adopt as the branch-extraction core.** Already deterministic (stable sorts, `round3`, pinned `DIVERGENCE_ALGORITHM = 'lcs-backbone/1.0.0'`). Already emits `evidenceRunIds`, `dfgConfirmedSplit`, `dfgConfirmedJoin`. |
| Variant clustering (greedy first-match on path signature) | `packages/intelligence-engine/src/variantDetector.ts` | Adopt for variant grouping. **DEFECT:** line 39 `const now = new Date().toISOString()` — a `Date` determinism leak (see §7 D-1). |
| Edit-distance variant distance (Wagner–Fischer) | `packages/intelligence-engine/src/variantAnalyzer.ts` | Adopt for per-variant deviation classification + `deviationPoints`. |
| Similarity clustering (single-link / union-find, lexical-root) | `packages/intelligence-engine/src/clustering/{traceSimilarity,clusterSignatures}.ts` | Already fully deterministic with FNV-1a `configHash` version pin. Adopt for variant-set construction at scale. |
| Path signature (privacy-safe category sequence + bigram-Jaccard) | `packages/intelligence-engine/src/pathSignature.ts` | Adopt as the per-run aligned token stream feeding the DFG. |
| Typed graph model: `ProcessNode/Edge/DecisionPoint/Condition/Variant/ProcessGraph` + 5 closed unions + frozen catalogs + topology validator + 4-band confidence language + v2.0.0 variant hash | `apps/web-app/src/lib/process-graph/**` | **This IS the target internal graph model.** `runFrequency`/`runFrequencyPct` on edges, `rawEvidence: EvidencePointer[]` on every entity, `DECISION_BEARING_NODE_TYPES`, `CYCLE_EDGE_TYPES` (retry/loop) all already exist. The merge engine (PATHE-P10) is the missing piece — it does not exist yet. |
| React Flow render adapters (consume pre-positioned `viewNode.position`) | `apps/web-app/src/components/workflow-view/adapters/{flowAdapter,variantAdapter,viewModel}.ts`, `WorkflowCanvas.tsx`, `WorkflowVariantsMap.tsx` | Reuse. **Gap:** layout is NOT computed here — adapters trust an upstream `position`. `variantAdapter.ts` currently sets `isDivergencePoint: false` and `divergencePoints: []` hard-coded — divergence is not yet wired to `divergenceAnalyzer`. |
| `elkjs@0.11.1` | `apps/web-app/package.json` | Present but **not imported anywhere** (`grep` finds zero usages). Available for layered layout — see §2 determinism caveat. |

**Headline gap:** there is a typed graph model (Path E) AND a branch-extraction engine (`divergenceAnalyzer`) AND a render layer (React Flow), but **no deterministic merge engine that folds N runs → one frequency-annotated DFG, and no deterministic layout that positions it.** Those two are the substance of this review (§1 + §2).

---

## 1. Internal graph model: merge N runs → one variant map (frequency-annotated DFG over the LCS backbone)

### 1.1 Why a frequency-annotated Directly-Follows Graph (DFG) is the right merge model

The DFG is the canonical process-mining intermediate representation: it is **lossless for directly-follows relations, O(events) to build, deterministic, and trivially evidence-linkable** (every edge is a set of run IDs). It is also already half-built inside `divergenceAnalyzer.dfgDegrees()` — that function counts directly-follows edges and computes in/out degree. We promote that internal helper to a first-class, frequency-and-evidence-annotated structure.

Target structure maps 1:1 onto the existing Path E entities:

- **Node** = an activity = an aligned step category (from `PathSignature.stepCategories`). Carries `observationCount` (= number of runs the activity appears in) → maps to `ProcessNode.observationCount` + `rawEvidence`.
- **Edge** = a directly-follows pair `(a → b)` observed in ≥1 run. Carries `runFrequency` (absolute) + `runFrequencyPct` (fraction of runs that traversed it) → maps to `ProcessEdge.runFrequency` / `runFrequencyPct` / `rawEvidence`.
- **Split node** = out-degree > 1 → a **decision point** candidate (`DecisionPoint`, see §3).
- **Join node** = in-degree > 1 → a **reconvergence** point.

This is exactly the signal `divergenceAnalyzer` already cross-checks via `dfgConfirmedSplit` / `dfgConfirmedJoin`. We are not inventing a model; we are persisting the DFG that the analyzer currently throws away.

### 1.2 The alignment problem — and why we fold the LCS backbone INTO the DFG

A naive DFG keyed on raw step categories shatters under human variation: two runs that do "the same thing" but with one extra navigation step produce different directly-follows edges, and the map turns to spaghetti. The codebase already solves the alignment half:

- **Backbone** = the standard-path category sequence = `variantDetector` standard variant's `pathSignature.stepCategories` (the most frequent cluster, `isStandardPath: true`).
- **Per-run alignment to backbone** = `divergenceAnalyzer.lcsAlignment(run, backbone)` — deterministic LCS with a fixed tie-break (prefer the up-move) so repeated categories anchor identically every run.

The merge therefore proceeds in **aligned coordinates**: backbone positions are the spine; off-backbone `altSteps` are detour nodes that rejoin at the next backbone anchor; `skippedBackbone` are shortcut edges. This makes the standard path a literal straight spine and every branch a frequency-weighted detour that provably reconverges — the headline "watch workflows branch off and converge back" capability, now persisted as a graph instead of a per-run analysis.

### 1.3 Canonical node identity (determinism + merge correctness)

A node in the merged graph is identified by a deterministic key so the same activity from different runs folds to one node:

```
nodeKey(category, backboneIndex | altLabel) =
    backbone position  →  "B#" + backboneIndex                 (spine node, one per backbone slot)
    off-backbone step  →  "A#" + divergeAfterIndex + ":" + category + ":" + altOrdinalWithinBranch
```

The spine uses the backbone index (NOT the raw category) so a category that legitimately appears twice on the backbone stays two distinct nodes. Off-backbone nodes are keyed by `(divergeAfterIndex, category, ordinal-within-branch)` so two runs that take the same detour fold together but two different detours after the same anchor stay distinct. This mirrors the existing branch aggregation key in `divergenceAnalyzer.analyzeDivergence()`:
`${divergeAfterIndex}|${reconvergeAtIndex}|${altSteps.join('>')}|${skippedBackbone.join('>')}`.
The Path E contract already specifies `ProcessNode.id` as a deterministic hash of `(processGraphId, normalizedLabel, routeTemplate, applicationLabel, positionHint)` — the merge engine (PATHE-P10) supplies that hash; `nodeKey` above is the pre-hash logical identity.

### 1.4 Deterministic merge pseudocode (folds backbone + branches into one DFG)

Pure; no `Date`/random; all maps iterated in sorted key order before emission; runs processed in sorted-id order (the same order `divergenceAnalyzer` already uses).

```
function mergeRunsToProcessGraph(runs: DivergenceRun[], opts):
    # --- 0. Determinism preamble -------------------------------------------------
    runsSorted := sort runs by id ascending          # stable total order (existing convention)
    total      := runsSorted.length

    # --- 1. Backbone = standard variant's category sequence ----------------------
    variantSet := detectVariants(runsSorted)          # reuse variantDetector (after D-1 Date fix)
    backbone   := variantSet.standardPath.pathSignature.stepCategories

    # --- 2. Per-run alignment + branch extraction (reuse divergenceAnalyzer) ------
    div := analyzeDivergence(backbone, runsSorted, { minEdgeCount: opts.minEdgeCount })
    #     div.branches are already aggregated, frequency-weighted, evidence-bearing,
    #     and carry dfgConfirmedSplit / dfgConfirmedJoin.

    # --- 3. Spine nodes: one per backbone slot -----------------------------------
    nodes := ordered map keyed by nodeKey
    edges := ordered map keyed by (fromKey, toKey)
    for i in 0 .. backbone.length-1:
        k := "B#" + i
        nodes[k] := { key:k, category: backbone[i], observationRunIds: {} }
    spineKeys := ["START", "B#0", ..., "B#(L-1)", "END"]

    # --- 4. Replay each run in ALIGNED coordinates to attribute evidence ----------
    #     A run that conforms walks START -> B#0 -> ... -> B#(L-1) -> END.
    #     A divergent run walks the spine up to divergeAfterIndex, peels off onto
    #     "A#" detour nodes, then rejoins at "B#reconvergeAtIndex".
    for run in runsSorted:
        path := alignedWalk(run, backbone)   # list of nodeKeys, START..END, via lcsAlignment
        for k in path:
            nodes[k].observationRunIds.add(run.id)        # node evidence (set => dedup)
        for (a,b) in consecutivePairs(path):
            e := edges[(a,b)] ?? { from:a, to:b, runIds:{} }
            e.runIds.add(run.id)                          # edge evidence (set)
            edges[(a,b)] := e

    # --- 5. Emit frequency-annotated, evidence-linked graph ----------------------
    outNodes := for k in sortedKeys(nodes):                # deterministic emission order
        n := nodes[k]
        emit ProcessNode-like {
            key:k, category:n.category,
            observationCount: n.observationRunIds.size,
            runFrequencyPct:  round3(n.observationRunIds.size / total),
            evidenceRunIds:   sortAscending(n.observationRunIds),   # stable
            outDegree: count edges with from==k,
            inDegree:  count edges with to==k,
        }
    outEdges := for (a,b) in sortedKeys(edges):
        e := edges[(a,b)]
        emit ProcessEdge-like {
            fromKey:a, toKey:b,
            runFrequency:    e.runIds.size,
            runFrequencyPct: round3(e.runIds.size / total),
            evidenceRunIds:  sortAscending(e.runIds),
            edgeType: classifyEdge(a,b, div),   # 'sequence' on spine, 'branch' from split,
                                                # 'merge' into join, 'loop'/'retry' on back-edge (§2.4)
        }

    # --- 6. Decision points from split nodes (§3) --------------------------------
    decisionPoints := for n in outNodes where n.outDegree > 1:
        buildDecisionPoint(n, outEdges, div)   # honest labeling rules in §3

    # --- 7. Version pin ----------------------------------------------------------
    version := "dfg-merge/1.0.0#" + fnv1a(
        DIVERGENCE_ALGORITHM + "|" + CLUSTERING_ALGORITHM + "|min" + opts.minEdgeCount)

    return { nodes: outNodes, edges: outEdges, decisionPoints, backbone, total, version }
```

`alignedWalk(run, backbone)` is a thin reuse of `lcsAlignment` + the sentinel-bracketing logic already inside `divergenceAnalyzer.branchesForRun()` — it converts the anchor pairs into the ordered nodeKey path (spine slots between anchors; `A#` detour nodes for the unmatched `altSteps`).

### 1.5 Frequency semantics that match the Path E contract

The Path E `ProcessEdge` JSDoc already states: *"sum across out-edges from a single branching node should equal 1.0 ± ε"*. The merge above guarantees this when `runFrequencyPct` at a split is computed as `(runs through this out-edge) / (runs through the split node)` rather than `/ total`. **Recommendation:** carry BOTH — a global `runFrequencyPct` (vs total, for thickness/Pareto) and a per-split `branchSharePct` (vs split traffic, for honest "N% went this way" decision labels in §3). The topology validator should gain a Group-D-style soft check that out-edge `branchSharePct` sums to 1.0 ± ε per split.

---

## 2. Deterministic layout: layered (Sugiyama) left-to-right DAG, byte-identical coordinates

### 2.1 Requirement restated as an invariant

> Same set of runs (in any input order) ⇒ byte-identical node `(x, y)` coordinates.

This is the layout analog of the determinism contract `clusterSignatures` already satisfies for clustering. Force-directed (d3-force), simulated-annealing, and any layout that reads a clock or RNG are **disqualified**. React Flow does **not** auto-layout — `flowAdapter` already proves the codebase positions nodes upstream and React Flow just renders `position`. So layout is ours to own and ours to make deterministic.

### 2.2 Algorithm: hand-rolled Sugiyama-style layered layout (recommended)

Four classic phases, each made deterministic by a **stable tie-break key** at every choice point:

**Phase A — Layering (longest-path / topological).**
Assign each node an integer layer (the x-column, since LR). On a DAG, longest-path layering is deterministic and parameter-free:
```
layer(START) = 0
layer(v)     = 1 + max(layer(u) for u in predecessors(v))   # back-edges excluded (§2.4)
```
Process nodes in topological order. Topological order is made deterministic by Kahn's algorithm with a **min-heap on a stable node key** (the `nodeKey` from §1.3, which is lexicographically total) instead of an arbitrary queue. Ties in `max(...)` are irrelevant (max is commutative); the topological visitation order only affects nothing here because longest-path is order-independent — but we still fix it for the next phases.

**Phase B — Within-layer ordering (the x-axis of readability).**
Order nodes within each layer to reduce crossings, but **never with a randomized barycenter sweep that can flip on equal medians.** Use **median heuristic with a hard stable tie-break:**
```
for each layer L (left to right, then a fixed number K of back-and-forth sweeps, K pinned e.g. 4):
    for each node v in L:
        pos(v) := median(order-index of v's neighbors in adjacent layer)
        if neighbors empty: pos(v) := previous order-index of v
    sort L by (pos(v), spineRank(v), nodeKey(v))
```
The tie-break chain `(median, spineRank, nodeKey)` is the determinism guarantee:
1. `median` — crossing reduction.
2. `spineRank` — backbone (standard-path) nodes sort FIRST within their layer, so the spine stays a straight horizontal line (the readability win that makes "branch off and converge back" legible). `spineRank = 0` for `B#` nodes, `1` for `A#` detours.
3. `nodeKey` — lexical final tie-break: total order ⇒ no residual nondeterminism.
The sweep count `K` is a pinned constant (NOT "iterate until no improvement", which is data-dependent and harder to reason about). Crossing count is monotone-ish under the median heuristic; a fixed `K` trades a few crossings for total determinism, which is the correct trade here.

**Phase C — Coordinate assignment.**
```
x(v) = layer(v) * (NODE_WIDTH + H_GAP)              # LR layering → x is the layer
y(v) = withinLayerOrder(v) * (NODE_HEIGHT + V_GAP)  # order within layer → y
```
Constants `NODE_WIDTH=280`, `NODE_HEIGHT=72` already exist in `flowAdapter.ts`; reuse them so phase-group bounds keep working. All arithmetic is integer/`number`; no rounding ambiguity. (Optional: a deterministic Brandes–Köpf horizontal-coordinate balancing pass can replace the naive `y` index to center nodes over their median neighbor — it is fully deterministic given a fixed within-layer order, but ship the naive index first; it is simpler and provably byte-stable.)

**Phase D — Edge routing / ports.** React Flow handles edge curves; we only emit `source`/`target` (already done in `flowAdapter`/`variantAdapter`). No layout decision here.

### 2.3 dagre / elk — are they acceptable?

- **dagre** implements exactly this Sugiyama pipeline and is *mostly* deterministic given fixed input ordering, **but** its network-simplex ordering and its iterative ordering passes have historically had input-order sensitivity and tie-break behavior that is not contractually byte-stable across versions. It is **not pinned in `package.json`** here. **Avoid** for the determinism contract unless wrapped in a golden-coordinate regression test.
- **elkjs (`elkjs@0.11.1`, already a dependency, currently unused)** — ELK's `layered` algorithm is deterministic *for a fixed input graph ordering and fixed options*, and it exposes explicit options to suppress nondeterministic behavior (`elk.layered.crossingMinimization.strategy=LAYER_SWEEP` with a fixed seed-free deterministic mode, and node-order can be forced). ELK is the stronger of the two. **Conditional adopt:** acceptable IF (a) we pre-sort the node/edge input arrays by `nodeKey` before handing them to ELK, (b) we pin `elkjs` to an exact version (`0.11.1`, not `^`), and (c) we add a golden-coordinate regression test asserting byte-identical `(x,y)` for a fixed fixture across two runs and across a CI cold-start. Absent that test harness, ELK's internal heuristics are a determinism risk the project's invariants do not tolerate.

**Recommendation:** ship the **hand-rolled layered layout (§2.2) first** — it is ~150 LOC, has zero external-version determinism risk, makes the spine-straightening tie-break explicit (which neither dagre nor ELK do natively), and is trivially golden-testable. Treat ELK as a Phase-2 swap-in *only behind a byte-identical golden test*, if/when graphs grow large enough that crossing quality matters more than the median heuristic delivers.

### 2.4 Cycles / loops / back-edges (deterministic)

Browser recordings produce loops (retry, rework). The Path E model already names them: `CYCLE_EDGE_TYPES = {retry, loop}` in `catalog/edge-types.ts`, and `NodeType` has `retry`/`loop` anchors. Handle deterministically:

```
1. Detect back-edges via DFS that visits nodes in nodeKey order (deterministic DFS).
   An edge (a→b) is a back-edge iff b is an ancestor of a on the DFS tree
   (i.e. b is on the current DFS stack when a→b is examined).
2. Classify each back-edge: retry/loop per existing edge-type rules.
3. REMOVE back-edges from the graph used for layering (Phase A/B) so it is a DAG.
4. RE-ADD back-edges after coordinate assignment, rendered as visually-distinct
   curved edges (React Flow `type` already supports custom edges; reuse
   isDashed / strokeColor conventions from viewModel.ts).
```
Determinism of "which edges are back-edges" depends only on the DFS order, which depends only on `nodeKey` — total and stable. Two runs of the merge therefore designate the identical edge set as back-edges and produce identical layering. This is the standard Sugiyama cycle-removal step (greedy feedback-arc-set), made deterministic by ordering the DFS on a total key instead of insertion order.

### 2.5 Net layout recommendation

Hand-rolled layered LR layout with `(median, spineRank, nodeKey)` within-layer tie-break, longest-path layering, deterministic DFS back-edge removal, integer coordinate assignment, constants reused from `flowAdapter`. Output `{x,y}` feeds straight into the existing `viewNode.position` contract — **no React Flow change required**, the adapters already consume positions. Add a golden-coordinate Vitest fixture as the determinism gate.

---

## 3. Decision points: deterministic detection + HONEST labeling

### 3.1 Detection (deterministic, evidence-only)

A decision point is a **split node**: `outDegree > 1` in the merged DFG. This is already computed (`divergenceAnalyzer` `dfgConfirmedSplit`, and `outDegree` in §1.4 emission). The Path E model already enforces that every `DECISION_BEARING_NODE_TYPES` node has a 1:1 `DecisionPoint` (topology Group C). So detection = "tag split nodes as decision-bearing and attach a `DecisionPoint`."

### 3.2 Honest labeling — the rule (no inference beyond evidence)

This is the most important integrity rule in the whole map. **We must never fabricate a condition.** Use a strict evidence ladder; the label we emit is the *highest rung we have evidence for*:

| Rung | Evidence required (all from the immutable event log) | Label emitted | Path E mapping |
|---|---|---|---|
| **R3 — Attributed condition** | The branch correlates with an OBSERVED field value / UI state / route on the diverging step, and the correlation is **deterministic across runs** (every run with value X took branch A; every run with value Y took branch B; no counterexample). | `"<field> == <value>"` style condition with `conditionType` = `field_value`/`ui_state`/`data_threshold`/`approval_status`/etc. + `confidenceScore ≥ 0.80` IFF `observationCount ≥ 5`. | `DecisionType` = `data_condition`/`business_rule`/`approval_decision`; `Condition` with real `description`. |
| **R2 — Inferred mechanism** | A branch consistently follows a navigation/route change or a system response, but the exact triggering value is not directly observable. | `"Inferred from navigation behavior"` (this exact string already exists: `confidence-language.inferredToLabel()`). `isInferred: true`, `confidenceScore < 0.55`. | `DecisionType` = `system_state`; `conditionType` = `inferred_unknown`. |
| **R1 — Frequency only** | We observe the split but have NO correlating evidence for why. | `"Observed in N of M runs"` (already: `formatLowConfidenceLabel(n, m)`) per out-edge — i.e. **just report the branch share, claim nothing about cause.** | `DecisionType` = `unknown_inferred`; `Condition` omitted or `inferred_unknown`. |
| **R0 — Insufficient data** | `observationCount < 5` (the HARD UX gate). | `"Needs more recordings"` (already: `bandToLabel('unknown')`). | Display-capped to `unknown` band regardless of computed confidence. |

**The decisive rule:** we attribute a branch to an *observable condition* (R3) **only** when there is a deterministic, counterexample-free correlation between an observed value on the diverging step and the branch taken, across runs. Otherwise we drop to R2/R1/R0 and **only report the percentage** — "47% of runs took this branch" — which is honest and still useful. This is precisely the 4-band taxonomy `confidence-language.ts` already encodes; §3's contribution is the **promotion rule** that decides which rung an observed split qualifies for.

The HARD UX gate (`MIN_OBSERVATIONS_FOR_HIGH = 5`) means: even a perfect 1:1 value↔branch correlation cannot be labeled `"Likely decision"` until ≥5 runs support it. `confidenceToBand` already enforces this — the decision-point builder must route its label through `confidenceToBand` + `bandToLabel`, never construct labels directly. That single architectural choke point is the audit-honesty guarantee.

### 3.3 Determinism

R3 attribution iterates observed (value → branch) pairs in sorted value order; the counterexample check is a pure set comparison; confidence is a pure function of counts. No clock, no RNG. Same runs ⇒ same rung ⇒ same label.

---

## 4. Frequency + complexity controls (deterministic spaghetti reduction)

Real recordings produce dense DFGs. Three deterministic filters, all parameterized so the UI can expose sliders without breaking determinism (the *filter* is deterministic; the user just chooses the threshold):

1. **Edge-frequency (Pareto) filtering.** Sort edges by `runFrequency` descending (tie-break `nodeKey(from)`, then `nodeKey(to)` — total order). Keep the smallest prefix whose cumulative frequency ≥ P (default P = 0.80, classic 80/20). `divergenceAnalyzer` already has `minEdgeCount` (an absolute floor) — Pareto is the relative complement. **Invariant: never prune a spine/backbone edge** (the standard path must always render fully) and never prune an edge that would disconnect a kept node from START/END (preserve reachability; re-add the minimum-frequency bridging edge deterministically if pruning orphans a node).
2. **Top-N variant display.** `variantDetector` already ranks variants by run count. Show the top-N variants (default N = 5) as distinct overlaid paths; fold the remaining long tail into a single muted "Other (k variants, j runs)" affordance. Ranking is by `runCount` desc, tie-break `pathSignature.signature` (already implemented). Deterministic.
3. **Activity-frequency filtering.** Hide nodes with `observationCount < minObs` (default keep all; the slider raises it), **except** backbone nodes and decision points (never hide a split — hiding a decision is dishonest). When a node is hidden, deterministically bridge its in/out edges (transitive directly-follows) so the path stays connected, carrying the union of `evidenceRunIds`.

All three are **post-merge, pre-layout** transforms on the immutable merged graph, so filtering never re-runs the (expensive) merge and never changes node identity — a filtered view is a deterministic projection of the full graph. This matches the Path E immutability posture (graph rows are append-only; views are projections).

**Default complexity budget:** Pareto P=0.80 + top-5 variants + keep-all-activities is a sane first default and produces a "standard path + the handful of branches that actually matter" map — the readable target.

---

## 5. Evidence-linkage: carry `evidenceRunIds` on every node/edge/branch

The moat is the deterministic trace from observed behavior → rendered structure. The merge engine MUST preserve it end to end:

- **Already in the contract:** every Path E entity carries `rawEvidence: readonly EvidencePointer[]` (`{workflowRunId, stepIndex, timestamp, reviewedAt}`); `divergenceAnalyzer` branches carry `evidenceRunIds: string[]`; variants carry `evidenceRunIds`.
- **Aggregation rule (lossless):** when k runs fold onto one node/edge, that entity's evidence is the **set union** of contributing run IDs (dedup via `Set`, emit sorted ascending — see §1.4). `observationCount = evidenceRunIds.length`. No run is ever dropped; no run is ever double-counted. The `EvidencePointer.stepIndex` lets a click on a node/edge resolve back to the exact (run, step) coordinates in the immutable event log — the "click any node → see the 7 recordings that produced it" UX.
- **Branch evidence:** a `DivergenceBranch.evidenceRunIds` already lists exactly which runs took that detour — the decision-point share in §3 (`branchSharePct`) is computed from these sets, so the percentage shown is itself evidence-backed and clickable.
- **Determinism of evidence:** sets are emitted in ascending run-id order (the convention `divergenceAnalyzer.analyzeDivergence` and `variantDetector` both already use: `[...runIds].sort()`). Byte-identical across re-merges.
- **Reviewed-evidence retention** (`ProcessEvidenceReview`, `reviewedAt`) is orthogonal to merge determinism — it is per-user review metadata, never an input to the graph computation, so it cannot perturb byte-stability.

**One rule to enforce in code review:** no aggregation step may collapse evidence to a count *before* the union is complete. Always union the ID sets, then derive the count. (This is the same discipline that lets the topology validator's audit-honesty IFF hold.)

---

## 6. Algorithm adopt/avoid + sequenced build plan

### 6.1 Adopt / Avoid

| Algorithm | Verdict | Rationale for THIS deterministic + evidence-linked context |
|---|---|---|
| **Directly-Follows Graph (frequency-annotated)** | **ADOPT — core IR** | Deterministic, O(events), lossless for directly-follows, trivially evidence-linkable (edge = run-id set). Already half-built in `divergenceAnalyzer.dfgDegrees`. The merge target. |
| **LCS-backbone alignment (`divergenceAnalyzer`)** | **ADOPT — alignment core** | Makes the standard path a straight spine and branches reconverging detours; deterministic LCS with fixed tie-break; already emits evidence + DFG split/join confirmation. |
| **Single-link clustering / union-find (`clusterSignatures`)** | **ADOPT — variant grouping at scale** | Already fully deterministic (sorted input, lexical-root union, FNV-1a version pin). Use to build the variant set feeding top-N display. |
| **Edit-distance / Wagner–Fischer (`variantAnalyzer`)** | **ADOPT — per-variant deviation** | Deterministic DP; produces `deviationPoints` for the variant inspector. |
| **Sugiyama layered layout (hand-rolled, §2.2)** | **ADOPT — layout** | Only layout family that is contractually byte-deterministic with explicit tie-breaks; lets us straighten the spine via `spineRank`. |
| **Sankey diagram** | **ADOPT — secondary view (optional)** | A flow-frequency Sankey is a deterministic projection of the same DFG (node order by layer, flow = `runFrequency`). Good "where does volume go" overview; complements, does not replace, the node-link map. Layout is deterministic given fixed node ordering. |
| **elkjs `layered`** | **CONDITIONAL — Phase-2 only, behind golden test** | Deterministic *if* input pre-sorted + version pinned + golden-coordinate test added. Already a dependency. Do not adopt without the byte-identical regression gate. |
| **dagre** | **AVOID** | Not pinned; historical input-order/tie-break nondeterminism; no spine-straightening control. Hand-rolled or ELK are better. |
| **Inductive Miner** | **AVOID (for the visible map); CONSIDER (offline soundness only)** | Produces a *sound process tree / Petri net*, not a frequency DFG; it abstracts away exactly the per-run directly-follows evidence we need to keep clickable, and its representation doesn't map to the Path E node-link model the UI renders. Determinism is fine, but it breaks the evidence-link granularity. Acceptable only as an *offline* conformance/soundness check, never as the rendered structure. |
| **Split Miner** | **AVOID for v1** | Strong at concurrency + filtering, but adds an inference layer (it *decides* split/join semantics heuristically) on top of the DFG, which risks asserting structure the raw evidence doesn't deterministically support — against the honesty constraint. Its frequency-filtering ideas (§4 Pareto) are worth borrowing; its split/join inference is not, for v1. |
| **Force-directed / d3-force / any RNG or clock-seeded layout** | **HARD AVOID** | Violates the byte-identical-coordinates invariant outright. |
| **Fuzzy Miner** | **AVOID** | Its node/edge significance metrics + clustering are heuristic and tuned; non-trivial to make byte-stable and tends to hide low-frequency-but-real branches — conflicts with honest evidence display. §4's deterministic Pareto controls cover the same "reduce spaghetti" need transparently. |

### 6.2 Sequenced build plan (folds into existing Path E PATHE-P## program)

1. **B-1 — Fix the `Date` determinism leak.** `variantDetector.ts:39` `new Date().toISOString()` → inject a caller-supplied `computedAtMs: number` (the Path E `ProcessGraph.computedAtMs` is already "caller-supplied"). Same fix pattern as the existing `referenceNowMs` single-upstream-clock-boundary convention used across the web-app. *Prereq for any deterministic merge; small surface; add a determinism regression test.*
2. **B-2 — `mergeRunsToProcessGraph` (the missing PATHE-P10 engine).** Implement §1.4 as a pure module in `packages/intelligence-engine/` (or `apps/web-app/src/lib/process-graph/adapters/`), reusing `analyzeDivergence` + `detectVariants` + `computeVariantHash`. Output the typed `ProcessGraph` (`entities.ts`). Gate with `validateGraphTopology`. Pin `dfg-merge/1.0.0#<fnv1a>` version. Golden-graph Vitest fixtures.
3. **B-3 — Deterministic layered layout (§2.2).** Pure module: `ProcessGraph → Map<nodeId, {x,y}>`. Golden-coordinate regression test (the determinism gate). Reuse `NODE_WIDTH`/`NODE_HEIGHT`. Output feeds `viewNode.position` — no React Flow change.
4. **B-4 — Wire divergence into `variantAdapter`.** Replace the hard-coded `isDivergencePoint: false` / `divergencePoints: []` with real values from the merged graph's split nodes + `DivergenceBranch` data. Render branches as frequency-weighted edges (stroke width ∝ `runFrequencyPct`) reusing existing edge styling conventions.
5. **B-5 — Decision-point labeling (§3).** Route every label through `confidenceToBand` + `bandToLabel` (the honesty choke point). Implement the R3→R0 promotion ladder. Tests assert no `"Likely decision"` when N<5 and no fabricated conditions without counterexample-free correlation.
6. **B-6 — Complexity controls (§4).** Pareto edge filter + top-N variants + activity filter as deterministic post-merge projections. Never prune spine/decision. UI sliders choose thresholds; transforms stay pure.
7. **B-7 — (Optional) Sankey secondary view + ELK swap-in evaluation**, each behind a golden-determinism test, only if graph scale demands it.

---

## 7. Defects / risks surfaced (NOT silently fixed — flagged per CLAUDE.md)

- **D-1 (determinism leak, must-fix before merge engine).** `packages/intelligence-engine/src/variantDetector.ts:39` — `const now = new Date().toISOString()` writes wall-clock into `VariantSet.computedAt`. Any graph derived from `detectVariants` is therefore NOT byte-reproducible across time. Fix = caller-supplied `computedAtMs` (matches the existing `ProcessGraph.computedAtMs` contract and the web-app `referenceNowMs` convention). `analyzeDivergence`, `clusterSignatures`, `traceSimilarity`, `pathSignature`, `confidence-language`, `variant-hash` are all already clean (verified — no `Date`/`Math.random`).
- **D-2 (wiring gap).** `apps/web-app/src/components/workflow-view/adapters/variantAdapter.ts` hard-codes `isDivergencePoint: false` and `divergencePoints: []`. The render layer is NOT yet consuming `divergenceAnalyzer`. The branch/decision data exists in the engine but never reaches the map. (B-4 above.)
- **D-3 (layout gap).** No deterministic layout exists; `flowAdapter`/`variantAdapter` trust an upstream `viewNode.position` that nothing in the reviewed surface computes from a merged multi-run graph. `elkjs@0.11.1` is installed but unused and unpinned (`^`). Adopting it without a golden-coordinate test is a determinism risk. (B-3 + §2.3.)
- **D-4 (merge engine absent).** PATHE-P10 graph-merge is referenced throughout the Path E contract as "the first caller" but does not exist in the reviewed tree. The entire §1 pseudocode targets this missing module — it is the keystone deliverable, and everything else (layout, decision labels, complexity controls) is downstream of it.
- **R-1 (frequency-share semantics).** The Path E `ProcessEdge` JSDoc asserts out-edge `runFrequencyPct` sums to 1.0±ε per split, but a global `runFrequencyPct` (vs total runs) does NOT satisfy that for non-START splits. Carry both `runFrequencyPct` (global, for thickness/Pareto) and `branchSharePct` (per-split, for honest decision labels) — §1.5. Recommend a topology soft-check.

---

## 8. One-paragraph executive answer

Merge N runs into **one frequency-annotated Directly-Follows Graph computed in LCS-backbone-aligned coordinates**: the standard variant's category sequence is the straight spine, off-backbone steps are detour nodes that provably reconverge at the next backbone anchor, every node/edge carries the **set-union of contributing run IDs** as evidence and an `observationCount`/`runFrequency`, and split nodes (out-degree>1) become decision points. Reuse `divergenceAnalyzer` (alignment + branch extraction + DFG split/join), `variantDetector`/`clusterSignatures` (variant grouping — after fixing the `Date` leak), and the existing Path E typed graph model + topology validator as the persistence target. Lay it out with a **hand-rolled deterministic Sugiyama left-to-right layered layout** whose within-layer order tie-breaks on `(median, spineRank, nodeKey)` so the spine stays straight and coordinates are byte-identical run-to-run; remove cycles via a `nodeKey`-ordered DFS feedback-arc set and re-add back-edges as visually distinct curves. Label decisions **honestly through the existing 4-band `confidence-language` choke point** — attribute an observable condition only on a deterministic, counterexample-free value↔branch correlation with ≥5 observations; otherwise just report "N% went this way." Reduce spaghetti with deterministic Pareto edge filtering + top-N variants that never prune the spine or a decision. **Adopt DFG + LCS + Sugiyama + (optional) Sankey; avoid Inductive/Split/Fuzzy Miner for the rendered map and any force-directed layout outright.**
