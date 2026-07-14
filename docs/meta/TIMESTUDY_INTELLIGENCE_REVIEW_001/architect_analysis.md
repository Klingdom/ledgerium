# Time-Study Intelligence — Cross-Workflow Architecture Review 001

**Mode:** 3-adjacent design review (NON-counting; analysis artifact only, ZERO code changes)
**Author:** system-architect
**Date:** 2026-07-12
**Objective:** Design a cross-workflow intelligence layer that lets the system CLUSTER, COMPARE, CONTRAST, and find RELATIONSHIPS across ALL workflows, and visually compare any workflows — by leveraging and extending the existing intelligence engine while preserving determinism and evidence-linkage.

---

## 0. TL;DR

The engine already contains ~80% of the cross-workflow *primitives* the CEO wants, but they are **portfolio-per-process** in framing, mostly **UNWIRED** at the ALL-workflows scope, and split across **two parallel packages** (`intelligence-engine` + `agent-intelligence`) with no unified graph, no persisted workflow-level similarity matrix, and no visual compare/diff surface. The missing piece is not new math — it is a **thin cross-workflow orchestration layer** that composes the existing pure scorers into (a) a persisted relationship **graph**, (b) **cluster/family timestudy aggregation**, and (c) an **N-way compare/diff** API, all behind a unified `{data,error,meta}` contract.

The elegant unifying model: **the graph is the spine.** Edges = relationships (edge table + pairwise scorers already exist). Clusters = connected components over the graph (`clusterSignatures` + union-find already exist). Families = labeled clusters (already persisted). Compare = zoom into one edge/subgraph (divergence + family scoring already exist). Time-study = a metric rollup over any node-set (reuse `analyzeTimestudy`).

---

## 1. Inventory — what already exists vs. what is missing

### 1.1 `packages/intelligence-engine/src/` — cross-workflow primitives (mostly present)

| Capability | Module | State | Notes |
|---|---|---|---|
| Privacy-safe path signature | `pathSignature.ts` — `computePathSignature`, `computeSignatureSimilarity`, `bigramJaccardSimilarity` | **WIRED** | Category-sequence, never user content. Order-sensitive bigram Jaccard + count ratio. |
| Blended trace similarity | `clustering/traceSimilarity.ts` — `traceSimilarity`, `editDistance`, `lcsSimilarity` | **WIRED (internal)** | LCS-dominant blend, precision-guarded (`LCS_HARD_FLOOR`). Identical sig → 1.0, so exact grouping is a strict subset. |
| **Deterministic clustering over ALL recordings** | `clustering/clusterSignatures.ts` — `clusterSignatures` | **WIRED for grouping/cohorts only** | Single-link union-find, lexical-root, **versioned config hash** (byte-identical re-runs). O(n²) pairwise; MinHash/LSH noted as later. **This is the cluster service** — just not surfaced as a cluster explorer. |
| Step identity fingerprints | `stepFingerprinter.ts` — `fingerprintWorkflowSteps`, `semanticSignature` (`verb:object:system:eventType`), `sequenceFingerSimilarity`, `hashStepSequence` | **WIRED** | Cross-workflow step matching. |
| **Pairwise relationship scoring** | `familyScorer.ts` — `scoreFamilyMembership` (7-dim), `evaluatePossibleMatch`, `createRelationship`, `generateRunRelationships`, `generateGroupRelationships` | **WIRED (group↔group only)** | 7-dimension family score with explanation codes + typed `GroupRelationship`. **This is the compare/relationship engine**; runs at group granularity, not workflow-level at scale. |
| Canonical component reuse | `componentDetector.ts` — `detectComponents` | **WIRED** | Reusable step patterns across groups/families. |
| **Diverge→reconverge** | `divergenceAnalyzer.ts` — `analyzeDivergence` | **UNWIRED** | LCS-backbone alignment + DFG split/join cross-check, every branch carries `evidenceRunIds`. Perfect for visual compare/contrast — not surfaced. |
| Variant distance | `variantAnalyzer.ts` — `computeVariantDistance`, `buildVariantRecords` | **WIRED** | Deviation points (substitution/insertion/deletion/reorder). |
| Full grouping hierarchy types | `groupingTypes.ts` | **PRESENT** | `ProcessFamily → ProcessGroup → ProcessVariantRecord → WorkflowRunRecord → StepFingerprint`, `CanonicalComponent`, and **`GroupRelationship`** — a polymorphic edge type (`sourceType/targetType/relationshipType/confidence/explanationCodes/explanationText`). **The graph-edge type already exists.** |
| Per-process portfolio analytics | `intelligenceEngine.ts` — `analyzePortfolio` | **WIRED** | metrics, timestudy, variance, variants, bottlenecks, drift, standardPath. **Framed for runs of ONE process** (`processTitle = runs[0].activityName`) — NOT cross-workflow. |

### 1.2 `packages/agent-intelligence/src/` — a *second*, parallel cross-workflow layer

- `cross-workflow-analyzer.ts::analyzePortfolio` → `CrossWorkflowIntelligence`: `sharedSkills`, `sharedSystems`, `patterns` (`shared_skill_sequence` | `common_system_pair` | `similar_structure` | `shared_bottleneck`), `summary`. **Deterministic, fully sorted.** This *is* a cross-workflow compare/contrast engine — but on **skills/systems**, not timestudy, and it duplicates similarity logic that `intelligence-engine` also owns. Consumed only by `/api/analytics/compare` (Growth+ gated) and never rendered in a rich compare UI.

### 1.3 Persistence (Prisma) — what is stored today

- `ProcessDefinition` (exact group): `pathSignature`, cached `intelligenceJson`, `familyId`, `startAnchor/endAnchor`, `nameSignature`, `stepSignatureHash`, `eventSignatureHash`, `systems`, `metricsJson`.
- `ProcessFamily`: `topSystems`, `commonComponentIds`, `relatedFamilyIds` (present but unused), `metricsJson`.
- `ProcessVariantRecord`, `CanonicalComponentRecord`.
- **`GroupRelationship`**: the edge table **exists and is populated** (group↔group `same_family` / `possible_match`), polymorphic source/target, confidence, explanation codes/text, model version. **Indexed on sourceId/targetId/relationshipType.**
- `ProcessInsight`.

### 1.4 Consumption surfaces today

- `POST /api/analytics` → `clusterWorkflows()` (persists families/groups/relationships/components, O(n²), synchronous) + `analyzeUserPortfolio()`. `GET` → definitions + insights. Returns **bare objects (no `{data,error,meta}` envelope)**.
- `/analytics` page → families list, fastest/slowest/most-variant leaderboard, health distribution, standardization opps, signals. **No relationship graph, no cluster explorer, no visual compare, no cross-cluster timestudy.**
- `POST /api/analytics/compare` → `agent-intelligence` skills/systems/patterns. Returns `{data, meta}` (**no `error` key**). No aligned step diff, no timestudy delta, no visual.
- `PortfolioTimestudyBand.tsx` → honest observed-only 5-tile summary over the *current library filter* (avg cycle time proxy, total cases, avg runs, avg systems, avg health). **Not cluster/family aware; per-workflow duration proxy only** (no per-run timing yet).

### 1.5 The gap, precisely

| CEO ask | Exists? | Missing piece |
|---|---|---|
| **Cluster across ALL workflows** | `clusterSignatures` exists | Portfolio-scope invocation + **persisted clusters** + **cluster explorer UI** + cluster-level timestudy rollup |
| **Relationships across ALL workflows** | `GroupRelationship` edge + `familyScorer` exist | **Workflow-level** edges at scale + **graph assembly/query API** + **graph UI**; edges recomputed, never a queryable matrix |
| **Compare / contrast any workflows** | `familyScorer`, `divergenceAnalyzer`, `computeVariantDistance`, `sequenceFingerSimilarity` exist | **N-way compare/diff API** wiring divergence + **step-aligned visual diff** + **timestudy delta** |
| **Dramatically improved time-study VIEW** | `analyzeTimestudy` per-process exists | **Cross-cluster / cross-family timestudy aggregation** + **A-vs-B timestudy compare** |
| **One coherent layer** | Two parallel engines | **Unified cross-workflow service** + consistent `{data,error,meta}` envelope + persisted similarity matrix + on-ingest incremental compute |

**Net:** the missing work is orchestration, persistence of the workflow-level edge matrix, timestudy rollup over arbitrary node-sets, one compare/diff surface, and UI — **not new similarity mathematics.**

---

## 2. Architectural designs

All designs share these **cross-cutting guarantees** (Ledgerium invariants):
- **Determinism:** compose only the existing pure scorers; sorted inputs/outputs; a **version hash over `{algorithm, weights, thresholds, modelVersion}`** so re-runs are byte-identical; `computedAt` separated from analytics payload.
- **Traceability / evidence-linkage:** every node, edge, cluster, and delta carries `evidenceRunIds` / member workflow ids + `explanationCodes` + dimension contributions.
- **Privacy:** everything keys off path signatures / semantic signatures / categories — never raw user content.
- **Envelope:** every API returns `{ data, error, meta }` with `meta` = `{ modelVersion, threshold, counts, computedAt, cacheHit }`.

### Design A — Cross-Workflow Relationship Graph Service (RECOMMENDED SPINE)

Produce a graph of **nodes** (workflows and/or groups/families) and **weighted, explained edges** across ALL workflows.

- **Engine (new pure module `crossWorkflowGraph.ts` in `intelligence-engine`):**
  `buildRelationshipGraph(members: GraphMemberInput[], opts)` composes existing scorers into one blended edge:
  `edgeWeight = w_trace·traceSimilarity(path) + w_step·sequenceFingerSimilarity(fp) + w_sys·setOverlap(systems) + w_comp·sharedComponentRatio + w_fam·scoreFamilyMembership.score`.
  Emits `GraphEdge{ sourceId, targetId, weight, relationshipType, dimensionScores, explanationCodes, explanationText, evidence }`. Threshold-gated (persist only edges ≥ τ). Deterministic + versioned.
- **Data model (new):** `WorkflowSimilarityEdge` (or extend `GroupRelationship` with `sourceType='workflow'`): `userId, sourceWorkflowId, targetWorkflowId, weight, dimensionScoresJson, relationshipType, explanationCodes, explanationText, modelVersion, computedAt`. Unique `(userId, sourceWorkflowId, targetWorkflowId)` with canonical ordering (sourceId < targetId) to avoid dup edges. Nodes reuse existing `Workflow`/`ProcessDefinition`/`ProcessFamily`.
- **API:** `GET /api/intelligence/graph?scope=all|family:{id}|cluster:{id}&minWeight=` → `{ data:{ nodes[], edges[] }, error, meta }`.
- **Compute strategy:** **incremental on-ingest** — a new recording is scored against existing nodes in O(n) and its edges upserted; **full rebuild on demand** (version-hash invalidation) via BullMQ job. Edges cached in table; the graph read path is a cheap indexed query. Clusters/communities are **derived from edges via union-find at read time** (no separate cluster table needed initially).
- **UI:** force-directed relationship map on `/analytics` with cluster hulls; edge hover → explanation chips; node click → drill to workflow/compare.
- **Trade-off:** highest leverage (clusters + families + compare all derive from it); persistence + incremental-scoring plumbing is the main cost.

### Design B — Cluster Explorer + Cross-Cluster Timestudy Aggregation

Surface `clusterSignatures` at portfolio scope and roll timestudy up per cluster.

- **Engine:** `clusterSignatures` (exists) + **new** `aggregateTimestudy(nodeSetBundles)` reusing `analyzeTimestudy`/`analyzeVariance` across a *cross-process* member set (the current engine assumes one process — this generalizes the denominator honestly, matching the existing conformance-cohort pattern).
- **Data model:** cluster membership **derivable on the fly** from edges/signatures (cache optional `WorkflowCluster{ clusterId, memberIds, centroidSignature, threshold, version }`).
- **API:** `GET /api/intelligence/clusters` → clusters w/ size, centroid, aggregated timestudy summary; `GET /api/intelligence/clusters/{id}` → members + aggregated timestudy + divergence backbone.
- **Compute:** on-demand + version-hash cache; O(n²) pairwise (MinHash/LSH later — perf only, not result).
- **UI:** cluster cards → drill into cluster timestudy + **A-vs-B cluster timestudy compare** (position-aligned mean/median/p90 deltas). **This is the most direct answer to "dramatically improved time-study view."**
- **Trade-off:** directly reuses the most existing code; needs the honest cross-process timestudy aggregation + per-run timing to be maximally valuable (today durations are per-workflow proxies).

### Design C — N-Way Compare / Diff API (visual compare of ANY workflows)

Upgrade the compare route into a first-class aligned diff.

- **Engine (new pure `compareWorkflows.ts`):** composes `scoreFamilyMembership` (relationship + explanation), `analyzeDivergence`/LCS **step alignment** (matched/added/removed/reordered per position), **timestudy delta** per aligned position, systems/components diff. Evidence-linked.
- **API:** `POST /api/intelligence/compare { workflowIds[2..N] }` → `{ data:{ relationship, alignment, timestudyDeltas, sharedSystems, sharedComponents, patterns }, error, meta }`. **Unifies** the two existing compare paths (fold `agent-intelligence` skills/systems/patterns in) under one envelope.
- **Compute:** on-demand, bounded N (cap ~6); no persistence.
- **UI:** side-by-side aligned step columns with divergence highlighting + timestudy waterfall delta. High visible value, low risk.

### Design D — Process Family / Taxonomy Spine (mostly wiring)

Promote the already-persisted `ProcessFamily` + `relatedFamilyIds` into a browsable taxonomy with **family-level timestudy rollup** and **family↔family relationships** (reuse `generateGroupRelationships`). Lowest new-code cost; complements A/B. Trade-off: incremental UX gain unless paired with the graph/timestudy work.

### Design E — Timestudy Aggregation Capability Layer (horizontal)

A single `aggregateTimestudy(nodeSet)` + `compareTimestudy(setA, setB)` capability consumed by A/B/D rather than a standalone product surface. Best treated as a **shared primitive** that B and the graph both call — not a separate deliverable.

---

## 3. Minimal new persistence / API

**Persistence (additive, back-compat):**
1. `WorkflowSimilarityEdge` (Design A) — the only strictly-new table. Canonical-ordered pair, `dimensionScoresJson`, `modelVersion`, `computedAt`. Indexed on `(userId)`, `(sourceWorkflowId)`, `(targetWorkflowId)`, `(weight)`.
   - *Cheaper alternative:* extend `GroupRelationship` to `sourceType='workflow'` and skip a new table — reuses indexes and the polymorphic contract, at the cost of mixing granularities in one table.
2. *(Optional, later)* `WorkflowCluster` cache — derivable from edges via union-find; add only if graph reads get expensive.
3. Reuse everything else (`ProcessFamily`, `GroupRelationship`, `CanonicalComponentRecord`, cached `intelligenceJson`).

**API (all `{data,error,meta}`):**
- `GET /api/intelligence/graph` (A)
- `GET /api/intelligence/clusters` + `GET /api/intelligence/clusters/{id}` (B)
- `POST /api/intelligence/compare` (C) — supersedes `/api/analytics/compare`, keep old as deprecated alias.
- Retrofit `/api/analytics` GET/POST to the envelope (governance: matches CLAUDE.md API standard).

**Compute:** incremental edge-scoring on ingest (O(n) per new recording) + BullMQ full-rebuild job with version-hash invalidation; graph/cluster reads served from cache; compare on-demand. Keep the existing synchronous `clusterWorkflows` as fallback until the incremental path is proven.

---

## 4. Ranked recommendation + phased build

**Ranking (leverage × reuse ÷ risk):**
1. **Design A — Relationship Graph Service** (spine; clusters + families + compare all derive from it).
2. **Design B/E — Cluster + cross-cluster Timestudy Aggregation** (most direct answer to the CEO's time-study ask; reuses the most existing code).
3. **Design C — N-Way Compare/Diff** (highest visible value, lowest risk, on-demand, unifies the two compare engines).
4. **Design D — Family Taxonomy** (mostly wiring; fold into A/B UI).
5. **MinHash/LSH scale-out** — later; performance only, never changes results.

**Phased build:**
- **Phase 1 — Graph engine + edge persistence (Design A core).** New pure `crossWorkflowGraph.ts` composing existing scorers; `WorkflowSimilarityEdge` migration; `GET /api/intelligence/graph`; incremental on-ingest scoring + rebuild job. *No UI yet — contract + determinism tests first (golden fixtures + version-hash lock).*
- **Phase 2 — Timestudy aggregation (Design B/E).** `aggregateTimestudy(nodeSet)` + `compareTimestudy(A,B)`; `GET /api/intelligence/clusters[/{id}]` deriving clusters from Phase-1 edges; cluster timestudy rollup.
- **Phase 3 — N-way Compare/Diff (Design C).** `compareWorkflows.ts` wiring `analyzeDivergence` + timestudy deltas; unified `POST /api/intelligence/compare`; fold in `agent-intelligence` skills/systems/patterns.
- **Phase 4 — UI.** Relationship graph + cluster hulls + cluster/family timestudy compare + side-by-side aligned diff on `/analytics`; make `PortfolioTimestudyBand` cluster/family aware.
- **Phase 5 — Scale + convergence.** MinHash/LSH candidate generation; deprecate `agent-intelligence` duplicate similarity logic in favor of the unified engine; per-run timing to upgrade timestudy proxies to true per-run means.

**Determinism/evidence preserved throughout:** every phase composes existing pure, versioned scorers; every persisted edge/cluster/delta carries evidence ids + explanation codes + a config version hash; `computedAt` never enters the analytics payload; identical-signature grouping remains a strict subset of similarity grouping (cannot group *less* than today).

---

## 5. Open questions for CEO / coordinator

1. **Node granularity for the graph:** workflow-level (finest, biggest matrix) vs. group-level (coarser, cheaper, already 80% wired via `GroupRelationship`)? Recommend group-level first, workflow-level as drill-in.
2. **New `WorkflowSimilarityEdge` table vs. extend `GroupRelationship`** — new table (clean, indexed for scale) vs. reuse (less migration). Recommend new table for workflow granularity.
3. **Per-run timing dependency:** cross-cluster timestudy is a *proxy* until per-run durations land — ship proxy-honest (labeled) now, upgrade later? Recommend yes (matches existing `PortfolioTimestudyBand` honesty posture).
4. **Consolidation of the two engines** (`intelligence-engine` vs `agent-intelligence` cross-workflow) — converge now (Phase 3) or defer?
5. **Feature gating:** graph/cluster/compare are premium (Growth+/Team+) today — confirm the plan tiers for the new surfaces.
