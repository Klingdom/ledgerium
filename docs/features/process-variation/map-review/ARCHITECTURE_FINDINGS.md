# Process-Variation Map — Architecture Findings

**Author:** system-architect (Define-phase review, READ-ONLY on product code)
**Date:** 2026-06-10
**Goal under review:** assemble multi-run recordings into a single variant-aware process map with decision points — deterministically and evidence-linked.
**Scope:** data model + contracts only. No product code changed.

---

## TL;DR — the one structural finding that governs everything

There are **two parallel worlds** in the codebase that do not yet meet:

1. **Path E graph model** (`apps/web-app/src/lib/process-graph/`) — a fully-built, immutability-first, audit-honest, deterministic *data model* for a variant-aware decision-aware graph (`ProcessGraph` = nodes + edges + decisionPoints + variants + evidence). Schema v2.0, variant-hash v2.0.0, migration adapter, topology validator, Zod round-trip, retention policy. **It has no producer.** Grep for callers of `migrateProcessGraph` / `validateGraphTopology` / `computeVariantHash` returns only tests and the barrel (`apps/web-app/src/lib/process-graph/index.ts:54-68`). The merge engine the docstrings call **PATHE-P10** (`types/entities.ts:88-92`, `variant-hash.ts:30-33`) **does not exist.**

2. **Intelligence + renderer world** — `packages/intelligence-engine/` (clustering, variantDetector, divergenceAnalyzer, variantAnalyzer) produces variant *analytics*; `apps/web-app/src/lib/intelligence.ts` persists them as JSON blobs on `ProcessDefinition`; the renderer (`apps/web-app/src/components/workflow-view/adapters/viewModel.ts`) builds a `NormalizedViewModel` from an untyped single-run `ProcessOutput` (`processRun` + `processMap`), **NOT** from a `ProcessGraph`.

**The missing contract is the assembly engine (PATHE-P10) that turns `clustering → variant records → divergenceAnalyzer` into a single deterministic `ProcessGraph`, plus the renderer adapter that consumes `ProcessGraph` instead of `ProcessOutput`.** Everything else needed already exists. This review defines that contract.

---

## 1. Current data model for map + variants + decision points

### 1a. The graph entities (built, unwired) — `apps/web-app/src/lib/process-graph/types/entities.ts`

| Entity | Key fields | Evidence linkage |
|---|---|---|
| `ProcessGraph` (root, `:249`) | `graphVersion` (int, monotonic), `graphSchemaVersion` ('1.0'\|'2.0'), `runCount`, `computedAtMs` (caller-supplied), `nodes[]`, `edges[]`, `decisionPoints[]`, `variants[]`, `isInferred`, `confidenceScore` | append-only; never mutated (`:243-247`) |
| `ProcessNode` (`:95`) | `id` (deterministic hash), `nodeType` (15-union), `rawLabel` / `normalizedLabel`, `confidenceScore` + `isInferred` (IFF pair), `observationCount` | `rawEvidence: readonly EvidencePointer[]` (`:117`) |
| `ProcessEdge` (`:131`) | `fromNodeId`/`toNodeId`, `edgeType` (11-union), **`runFrequency` (abs)** + **`runFrequencyPct` (fraction)** | `rawEvidence` (`:151`) — **edge frequency already first-class** |
| `DecisionPoint` (`:191`) | `nodeId` (1:1 with a decision-bearing node), `decisionType` (9-union), `conditions: Condition[]` | `rawEvidence` (`:200`) |
| `Condition` (`:167`) | `decisionPointId`, **`description` (plain-English ≤200 chars)**, `conditionType` (10-union), `confidenceScore`+`isInferred` | `rawEvidence` (`:174`) |
| `Variant` (`:216`) | `variantHash` (v2.0.0 deterministic), `variantLabel` (9-union), `runCount`, `runFrequencyPct`, `meanDurationMs` (null when N<2), `nodeSequence: string[]` (ordered ProcessNode.id) | `rawEvidence` (`:232`) |
| `EvidencePointer` (`:60`) | `workflowRunId`, `stepIndex`, `timestamp`, `reviewedAt` (retention) | the atomic evidence coordinate |

This is a strong model. **Edge frequency, variant frequency, node observationCount, decision-point conditions, and evidence pointers at every entity are all already in the contract.** Most of the target view-model fields (§2) are *already* representable.

### 1b. Decision-point + condition modeling today

- **Decision detection has a taxonomy but no engine.** `DecisionType` (9, `closed-unions.ts:146-155`) and `ConditionType` (10, `:174-184`) are fully enumerated with frozen catalogs (`catalog/decision-types.ts`, `catalog/condition-types.ts`) and exhaustiveness locks. The docstrings reference a **decision-detection-engine (PATHE-P05/P06/P07)** as the producer (`closed-unions.ts:133`) — **it does not exist yet.**
- **Where labels come from today (honest answer): nowhere deterministic.** In the *current rendered* path, decision presence is a passthrough boolean read off untyped metadata: `viewModel.ts:334` `isDecisionPoint: meta.isDecisionPoint === true` and `:335` `decisionLabel: safe(meta.decisionLabel, '')`. The label comes from whatever upstream metadata set it; the adapter does not derive it from evidence. There is **no condition object, no conditionType, no evidence-linked condition** in the rendered world at all. `ViewNode.decisionLabel` is a free string (`viewModel.ts:71`).
- **The Path E `Condition` IS designed to be evidence-derived**: `Condition.description` + `conditionType` + `rawEvidence` + the IFF `isInferred` flag (`entities.ts:167-175`). But nothing populates it. The `unknown_inferred` DecisionType + `inferred_unknown` ConditionType (`closed-unions.ts:155, 184`) are the honest fallbacks the model reserves for "branch detected, mechanism not classifiable."

**Conclusion (1):** the *data model* for evidence-derived decision points + conditions is complete and audit-honest. The *production* of decision points and conditions from evidence is unbuilt. Today's renderer has only a free-text `decisionLabel` passthrough with zero condition modeling and zero evidence linkage on decisions.

---

## 2. The contract to assemble a variant-aware map

### 2a. What composes (the primitives that exist)

```
runs (ProcessRunBundle[])
  │
  ├─► clusterSignatures(members, {threshold})            clustering/clusterSignatures.ts
  │     → ClusterResult { clusters[], threshold, version }   (deterministic, version-hashed)
  │     groups the runs into variant clusters
  │
  ├─► per cluster: variantDetector / variantAnalyzer     variantDetector.ts / variantAnalyzer.ts
  │     → ProcessVariant / ProcessVariantRecord            (runCount, frequency, path, deviationPoints)
  │
  └─► analyzeDivergence(backbone, runs, {minEdgeCount})  divergenceAnalyzer.ts
        → DivergenceAnalysis { backbone, branches[], conformingFrequency, version }
        each DivergenceBranch carries:
          divergeAfterIndex, reconvergeAtIndex,            (split / join structure)
          runCount, frequency,                             (edge frequency)
          evidenceRunIds[],                                (★ evidence link)
          dfgConfirmedSplit, dfgConfirmedJoin              (★ DFG cross-check — the honesty gate)
```

**These three are independently deterministic and version-hashed today.** What's missing is the composer that:
1. picks the **backbone** (the dominant variant's category sequence — available from `clusterSignatures` clusters[0] or `detectVariants` standardPath),
2. feeds it to `analyzeDivergence` to get split/join + branch frequency + evidenceRunIds,
3. materializes the result as `ProcessGraph` nodes/edges/decisionPoints/variants,
4. runs `validateGraphTopology` (`validation/topology.ts`) as the gate,
5. serializes via `serializeProcessGraphToJson` for persistence.

### 2b. Target assembly contract (proposed) — `assembleProcessGraph`

Define a **new pure module** `packages/intelligence-engine/src/graph/assembleProcessGraph.ts` (engine side, where the primitives live) OR `apps/web-app/src/lib/process-graph/assemble/` (graph side, where the entities live). **Recommendation: engine side**, because it consumes engine primitives (`clusterSignatures`, `analyzeDivergence`, `PathSignature`) and the graph entities are pure types that can be imported as a peer; keeping the web-app `process-graph` module a pure data-model/adapter library (no engine dependency) preserves the existing boundary. (This is **schema decision SD-1**, §6.)

```ts
export interface AssembleGraphInput {
  readonly workflowId: string;
  readonly processGraphId: string;       // deterministic, caller-supplied or derived
  readonly runs: readonly DivergenceRun[];       // id + ordered step categories
  readonly clusterResult: ClusterResult;          // from clusterSignatures
  readonly divergence: DivergenceAnalysis;        // from analyzeDivergence(backbone, runs)
  readonly computedAtMs: number;                  // single upstream clock boundary
  readonly options?: { clusterThreshold?: number; minEdgeCount?: number };
}
export interface AssembleGraphResult {
  readonly graph: ProcessGraph;          // §1 entity — ready to validate + serialize
  readonly version: string;              // composed version hash (§3)
}
export function assembleProcessGraph(input: AssembleGraphInput): AssembleGraphResult;
```

**Mapping rules (deterministic, evidence-preserving):**

| ProcessGraph element | Derived from | Frequency | Evidence |
|---|---|---|---|
| backbone `action` nodes | `divergence.backbone` categories, in order | `observationCount` = `totalRuns − conformingComplement` per node | union of evidenceRunIds passing through |
| `start` / `end` nodes | synthesized terminals (mirror `migrate-process-graph.ts:182-232`) | runCount | all runs |
| backbone `sequence` edges | consecutive backbone nodes | `runFrequency`/`runFrequencyPct` from DFG edge counts | evidenceRunIds traversing |
| `branch` edges + alt nodes | each `DivergenceBranch` (`altSteps`) | branch `runCount`/`frequency` (already computed) | branch `evidenceRunIds` (★ direct) |
| `merge` edge | branch `reconvergeAtIndex` back to backbone | branch frequency | branch evidenceRunIds |
| **split node → DecisionPoint** | backbone node where `dfgConfirmedSplit === true` AND out-degree>1 | — | union of branch evidence at the split |
| `Variant[]` | `clusterResult.clusters` + variant records | runCount/runFrequencyPct/meanDurationMs | per-cluster memberIds → evidenceRunIds |
| `variantHash` | `computeVariantHash({ nodeTypeSequence, normalizedActionSequence })` | — | — |

**Target view-model contract for the renderer.** The renderer should consume `ProcessGraph` directly through a *new* adapter `buildGraphViewModel(graph: ProcessGraph): NormalizedViewModel` that supersedes the single-run `buildNormalizedViewModel`. Required surfaced fields (most already exist in `ViewNode`/`ViewEdge`, a few need promotion to non-null):

- **node:** `id`, `nodeType`, `label` (from `normalizedLabel ?? rawLabel`), `frequency` (← `observationCount/runCount`; today `ViewNode.frequency` is `number|null` and always `null` at `viewModel.ts:354`), `confidence`, `isInferred`, **`evidenceRunIds`** (NEW on ViewNode — does not exist today), `isDecisionPoint`.
- **edge:** `sourceId`/`targetId`, `type`, **`frequency`** (NEW on ViewEdge — `ViewEdge` has no frequency field today, `viewModel.ts:121-138`), `isExceptionPath`, **`evidenceRunIds`** (NEW).
- **decision node:** `decisionType`, **`conditions: { description, conditionType, confidence, isInferred, evidenceRunIds }[]`** (NEW — today only a free `decisionLabel` string), `isSplit`/`isJoin` (from DFG flags).
- **variant/branch membership:** each node/edge tagged with the variant ids that traverse it (the Path E `Variant.nodeSequence` gives this directly; `variantAdapter.ts:67` currently hardcodes `pathIds: ['standard']`).

**This is schema decision SD-2:** extend `ViewNode`/`ViewEdge`/add `ViewDecision` with `frequency` + `evidenceRunIds` + structured conditions, OR introduce a separate `GraphViewModel` type. Recommend **additive extension** of the existing view types (immutability-first; additive migration) so existing canvas components keep working.

---

## 3. Determinism — where assembly could break, and how to guarantee it

The existing primitives are already correctly deterministic and provide the **pattern to mirror**:

- `clusterSignatures` — sorts members by id (`:87`), union toward lexicographically-smaller root (`:111`), sorts clusters by size then id (`:140`), and emits an **FNV-1a config hash** `version` (`:60-68`, `:84`). Re-runs are byte-identical.
- `analyzeDivergence` — sorts runs by id before aggregation (`:191`), aggregates branches by a stable string key (`:202`), sorts branches by `runCount → divergeIdx → reconvergeIdx → altSteps.join` (`:226-232`), emits `version = lcs-backbone/1.0.0#min{N}` (`:65`, `:175`).
- `computeVariantHash` — SHA-256 over a fixed-key-order payload with the algorithm version pinned **inside** the payload (`variant-hash.ts:91-104`), closing DEP-08. 16-char hex.
- `migrateProcessGraph` — deterministic SHA-256 ids from `(workflowId, kind, ordinal, label)` (`:96-104`); `computedAtMs` is caller-supplied, never `Date.now()` (`:24-25`).

**Nondeterminism risks the assembler MUST avoid (concrete):**

1. **`Map` iteration order.** `divergenceAnalyzer.ts:210` iterates `agg.values()` then sorts — safe. But the assembler will build its own node/edge maps; **every `Map`/`Set` → array conversion MUST be followed by an explicit total-order sort before it influences output ordering or id derivation.** Mirror `clusterSignatures` exactly.
2. **Node id derivation must be position+label deterministic**, not insertion-order. Reuse `migrate-process-graph.ts:deriveDeterministicId(workflowId, kind, ordinal, labelHint)` verbatim. Do **not** use `crypto.randomUUID()` — note `intelligence.ts:366` already uses `crypto.randomUUID()` for `ProcessDefinition.id`; that is fine for a DB surrogate key but **must never** be used for a `ProcessNode.id` that participates in the graph hash.
3. **`variantDetector.ts:39` calls `new Date().toISOString()`** for `computedAt` and **`buildVariantRecords` durations use `Math.round`** (deterministic) — but the `computedAt` wall-clock leak means `VariantSet.computedAt` is non-reproducible. The assembler must **not** propagate `VariantSet.computedAt` into the graph hash; use the caller-supplied `computedAtMs` for the `ProcessGraph.computedAtMs` field only (which is excluded from the hash by design).
4. **Float frequency rounding.** Use the existing `round3` convention (`divergenceAnalyzer.ts:67`, `traceSimilarity.ts:43`) consistently so `runFrequencyPct` values are byte-stable.
5. **Greedy first-match clustering** (`variantDetector.ts:64-77`) is order-sensitive but is guarded by the sort at `:57-59`. Prefer `clusterSignatures` (union-find, fully order-independent) as the canonical clusterer for the graph; treat `variantDetector` as legacy/analytics.

**Graph version hash (proposed):** compose a single `graphVersion` string the way the primitives do:

```
graphVersion = sha256(JSON.stringify({
  v: '2.0.0',
  clusterVersion: clusterResult.version,        // e.g. single-link/1.0.0#<fnv>
  divergenceVersion: divergence.version,        // e.g. lcs-backbone/1.0.0#min1
  variantHashVersion: VARIANT_HASH_ALGORITHM_VERSION,
  schemaVersion: PROCESS_GRAPH_SCHEMA_VERSION,
})).slice(0,16)
```

This makes the assembled graph **reproducible and traceable to the exact algorithm versions** that produced it — and any threshold/weight change is visible in the hash. (`ProcessGraph` has no field for this today → **schema decision SD-3:** add `assemblyVersion: string` to `ProcessGraph`, or store it on the persistence row alongside the JSON. Recommend the persistence row, to keep the v2.0 entity contract frozen.)

---

## 4. Decision-point modeling — real DECISION vs incidental variation

This is the honesty-critical question. The evidence available is purely structural (step-category sequences + timing + DFG degrees). **What we can honestly claim, using only deterministic evidence:**

**A branch is a candidate DECISION (not incidental variation) only when ALL hold:**
1. `dfgConfirmedSplit === true` at the diverge node (out-degree > 1 in the directly-follows graph over all runs) — `divergenceAnalyzer.ts:221`. A one-off divergence with DFG out-degree 1 is **incidental**, not a decision.
2. `dfgConfirmedJoin === true` at the reconverge node (in-degree > 1) — `:222` — confirms a true split/join rather than a permanent fork.
3. Branch `runCount ≥ minObservations` (propose ≥2; with N<5 the UX must cap confidence — see below). A branch taken by a single run is an outlier, not a decision.
4. The split node is consistently the same backbone position across runs (LCS anchoring already guarantees stable anchors, `divergenceAnalyzer.ts:76-108`).

**What we can HONESTLY label vs not:**

| Claim | Honest? | Basis |
|---|---|---|
| "Runs branch here and reconverge there" | ✅ YES | DFG split+join confirmed; deterministic; evidence-linked |
| "X% of runs took branch A, Y% took branch B" | ✅ YES | branch frequency + evidenceRunIds (`divergenceAnalyzer.ts:219,224`) |
| "This is a decision point" (`decisionType: 'unknown_inferred'`) | ✅ YES, with `isInferred:true` | mechanism not observed → honest fallback union member exists (`closed-unions.ts:155`) |
| "The condition is `field_value` == 'Approved'" | ❌ NOT from structure alone | requires observed field content → only honest if the capture pipeline recorded the discriminating input; otherwise `conditionType: 'inferred_unknown'` + low confidence |
| "This is a `business_rule` decision" | ❌ NOT claimable | no rule is observable from category sequence |
| `human_judgment` decision | ⚠️ ONLY with timing evidence | `DecisionType` reserves it for "long-pause + role-divergence" (`closed-unions.ts:142`); claim only when pause threshold + role data exist |

**The model already encodes this honesty contract:** the IFF invariant (`isInferred === true IFF confidenceScore < 0.55`, enforced by `topology.ts:176-209`) + the `unknown_inferred`/`inferred_unknown` fallbacks + the `MIN_OBSERVATIONS_FOR_HIGH` display cap (`confidence-language.ts`, exported `:117`). **The assembler must default every detected decision to `unknown_inferred` / `inferred_unknown` at low confidence and only upgrade `decisionType`/`conditionType` when a specific deterministic signal is present.** Conditions whose discriminating evidence was not captured get `description` = honest phrasing ("Branch taken by N of M runs; condition not observed") + `conditionType: 'inferred_unknown'`.

**Recommendation:** MVP ships **split/join detection + branch frequency + evidence** as the headline (this is fully honest and deterministic today). It marks split nodes as `DecisionPoint` with `decisionType: 'unknown_inferred'` and one `Condition` per outgoing branch with `conditionType: 'inferred_unknown'`. **Real condition classification (field_value / data_threshold / approval_status) is a later phase** gated on the capture pipeline recording discriminating inputs — and is a **schema/capture decision (SD-4)** about what evidence the recorder must retain.

---

## 5. Persistence / perf — precompute (snapshot) vs derive-on-read

**Recommendation: precompute the graph as an append-only snapshot.** This is the only option consistent with Ledgerium's immutability-first + reproducibility invariants, and the model is already built for it:

- `ProcessGraph` is explicitly **append-only versioned** (`entities.ts:243-247`, `graphVersion` monotonic). Re-merging with new runs INSERTs a new revision; prior revisions preserved for byte-identical replay + audit.
- The round-trip adapter already exists: `serializeProcessGraphToJson` / `parseProcessGraphJson` (`adapters/parse-process-graph-json.ts`) with Zod validation + null-on-failure graceful degradation. This **mirrors the iter-049 `parseIntelligenceJson` pattern**, so storing the graph JSON on a Prisma column is a drop-in.
- The migration adapter (`migrate-process-graph.ts`) and retention policy (`retention-policy.ts`) presuppose stored rows.

**Where to store it (schema decision SD-5):**
- **Option A (additive, MVP-fast):** a new `ProcessDefinition.processGraphJson` JSONB column (or `processGraphVersion` + `processGraphJson` pair), mirroring how `intelligenceJson` / `metricsJson` already live on `ProcessDefinition` (`intelligence.ts:340,354`). Additive migration, zero new table, reuses the existing `clusterWorkflows` write path.
- **Option B (clean, later):** a dedicated append-only `process_graphs` table keyed `(workflowId, graphVersion)` with the JSON payload + the `assemblyVersion` hash (§3) as a column — this is what the entity docstrings assume (`entities.ts:243-247`) and what enables byte-identical webhook replay. The `ProcessEvidenceReview` table (`entities.ts:296`) and retention job already assume a relational evidence surface.

**Recommend A for MVP, B as the documented target** (the v2.0 entity contract already supports both; only the storage location differs).

**Derive-on-read is the wrong default:** assembly runs `clusterSignatures` (O(n²) pairwise, `clusterSignatures.ts:116-124`) + `analyzeDivergence` (LCS DP per run, `divergenceAnalyzer.ts:76-108`) over all runs. That is fine at Phase-1 scale (<10k runs/workflow per the variant-hash note `variant-hash.ts:88`) **as a write-path/batch precompute**, but not per-request. Precompute on the existing `clusterWorkflows` cadence (already a batch job, `intelligence.ts:132`), snapshot, and the renderer reads the snapshot. This also makes the graph **traceable to a fixed input set** (the `runCount` + `evidenceRunIds` are frozen at compute time).

**Migration tie-in:** workflows with only a legacy `pathSignature` and no graph get the honest degraded synthesis via `migrateProcessGraph` (linear graph, `isInferred:true`, `confidenceScore:0.40`) — already built (`migrate-process-graph.ts:130-286`). New multi-run workflows get the real assembled graph. Both serialize through the same adapter.

---

## 6. Sequenced, contract-first implementation plan

Boundaries are explicit. Each step is independently shippable, additive, and reversible. Schema decisions are flagged.

**MVP (headline: "multi-run recordings render as one variant-aware map with evidence-linked split/join points")**

- **E-A0 — Contract lock (this doc + ADR).** Ratify SD-1…SD-5 below. No code. **Decision gate.**
- **E-A1 — `assembleProcessGraph` pure module** (engine side per SD-1). Input = runs + `ClusterResult` + `DivergenceAnalysis` + `computedAtMs`; output = `ProcessGraph` + composed `graphVersion` hash (§3). Pure, deterministic, version-hashed. Marks split nodes (DFG-confirmed) as `DecisionPoint{decisionType:'unknown_inferred'}` with one `Condition{conditionType:'inferred_unknown'}` per branch. Gated by `validateGraphTopology` in tests. **No persistence, no UI.** Reuses `deriveDeterministicId`, `computeVariantHash`, `round3`. ≥200 LOC pure module → system-architect review (D-4 clause 2) applies.
- **E-A2 — Persistence wiring.** Add `ProcessDefinition.processGraphJson` column (SD-5 Option A, additive migration). Call `assembleProcessGraph` inside `clusterWorkflows` (`intelligence.ts`) for groups with ≥2 runs; serialize via `serializeProcessGraphToJson`; store. Workflows with <2 runs / legacy-only get `migrateProcessGraph` degraded synthesis. Backwards-compatible: column nullable, renderer falls back to current `viewModel` when null.
- **E-A3 — Renderer adapter `buildGraphViewModel(graph) → NormalizedViewModel`.** Consumes `ProcessGraph`; populates node `frequency` (currently always null, `viewModel.ts:354`), edge `frequency` (NEW), `evidenceRunIds` on node+edge (NEW), and structured `conditions` on decision nodes. **SD-2: additively extend `ViewNode`/`ViewEdge` + add `ViewDecision`.** `useWorkflowViewModel` (`hooks/useWorkflowViewModel.ts`) branches on graph-present vs single-run.
- **E-A4 — Variant + branch overlay.** Wire `variantAdapter.ts` to real `Variant.nodeSequence` (replace hardcoded `pathIds:['standard']` at `:67`); render branch frequency + "X of M runs" + evidence drill-through (the evidence moat made visible). `WorkflowVariantsMap.tsx` already has the divergence-path UI scaffold (`:36-60`).

**Later (gated on capture evidence + scale)**

- **E-B1 — Decision/condition classification engine (PATHE-P05/P06/P07).** Upgrade `decisionType`/`conditionType` beyond `*_unknown` only where deterministic signals exist (observed field value → `field_value`; pause+role → `human_judgment`; approval modal → `approval_status`). **SD-4: capture-pipeline decision** — what discriminating evidence the recorder must retain (this is the gating dependency; without it, honest classification is impossible).
- **E-B2 — Dedicated `process_graphs` append-only table (SD-5 Option B)** + `assemblyVersion` column + webhook-replay path. Migrate JSON column → table.
- **E-B3 — Normalized labels (PATHE-P02).** Populate `ProcessNode.normalizedLabel` (currently always null post-migration, `migrate-process-graph.ts:204`) so the map shows intent labels, not raw categories.
- **E-B4 — Perf: MinHash/LSH candidate generation** for clustering at scale (already flagged as a later iteration that changes performance not results, `clusterSignatures.ts:11-13`).

### Schema decisions requiring sign-off

| ID | Decision | Recommendation |
|---|---|---|
| **SD-1** | Assembler module location | engine side (`packages/intelligence-engine/src/graph/`); keep `process-graph` web-app module engine-free |
| **SD-2** | View-model extension vs new type | **additively extend** `ViewNode`/`ViewEdge` + add `ViewDecision` (`frequency`, `evidenceRunIds`, structured `conditions`) |
| **SD-3** | Where to store the composed assembly version hash | persistence-row column (`assemblyVersion`), keep v2.0 `ProcessGraph` entity frozen |
| **SD-4** | What discriminating evidence the capture pipeline must retain for honest condition classification | defer to a capture-pipeline ADR; **blocks** real `conditionType` upgrades — MVP ships `inferred_unknown` only |
| **SD-5** | Graph storage: JSON column now vs dedicated table later | **Option A (column) for MVP**, Option B (append-only table) as documented target |

---

## Cross-cutting risks (flag now)

1. **The renderer consumes the wrong shape.** `viewModel.ts:260` `buildNormalizedViewModel(processOutput)` reads `processMap.nodes/edges` from an untyped single-run `ProcessOutput` (`:275-276`), not a `ProcessGraph`. Until E-A3 ships, the variant-aware graph cannot reach the screen even though the data model exists. **This is the highest-leverage gap.**
2. **`crypto.randomUUID()` contamination risk.** `intelligence.ts` uses it for DB surrogate keys (`:366`, `:533`, etc.) — acceptable. The assembler must **not** let any UUID leak into `ProcessNode.id`/`ProcessEdge.id`/`variantHash`. Audit at E-A1 review.
3. **`variantDetector.ts:39` `new Date().toISOString()`** is a determinism leak in `VariantSet.computedAt`. Must be quarantined from the graph hash (§3-#3). Consider a follow-up to inject the clock (mirror the `migrate`/`retention-policy` caller-supplied-clock pattern).
4. **Confidence honesty at low N.** `MIN_OBSERVATIONS_FOR_HIGH` (`confidence-language.ts`) must cap the rendered confidence band so a 2-run "decision" never shows "High". This is a display-time cap (`closed-unions.ts:229-232`), separate from the data IFF invariant — the renderer (E-A3) must enforce it.
5. **`detectVariants` greedy clustering vs `clusterSignatures` union-find** produce different groupings; pick `clusterSignatures` as canonical for the graph to keep assembly order-independent. Leaving both wired invites divergent variant counts between the dashboard (`intelligence.ts` uses `analyzePortfolio`→`detectVariants`) and the map. Flag for reconciliation.

---

## What is genuinely ready vs not (honest scorecard)

| Capability | State |
|---|---|
| Variant-aware graph **data model** (nodes/edges/decisions/conditions/variants + evidence) | ✅ built, frozen v2.0 |
| Deterministic variant hash (DEP-08 closed) | ✅ built |
| Topology + audit-honesty validation | ✅ built |
| JSON round-trip + Zod + migration + retention | ✅ built |
| Clustering (groups runs, deterministic) | ✅ built (`clusterSignatures`) |
| Divergence (split/join + branch frequency + evidence + DFG cross-check) | ✅ built (`divergenceAnalyzer`) |
| **Assembly engine (clustering+divergence → `ProcessGraph`)** | ❌ **missing — the core MVP gap** |
| **Renderer consuming `ProcessGraph`** | ❌ **missing — consumes single-run `ProcessOutput`** |
| Decision/condition **classification** from evidence | ❌ taxonomy only; producer unbuilt; honestly `*_unknown` at MVP |
| Graph persistence wiring | ❌ adapters ready, no column/table, no write call |
| Normalized intent labels | ❌ always null post-migration |

**Bottom line:** the hard, honesty-sensitive modeling work is done and sound. The MVP is a **contract-first assembly + adapter wiring** exercise (E-A1…E-A4) that reuses existing deterministic primitives — not new algorithm research. The single most important decision to lock is **SD-4** (what evidence the capture pipeline retains), because it is the only thing standing between "honest split/join with `inferred_unknown` conditions" (shippable now) and "real evidence-derived decision conditions" (the differentiated moat).
