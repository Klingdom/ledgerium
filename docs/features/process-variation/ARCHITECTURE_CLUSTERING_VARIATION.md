# ARCHITECTURE — Workflow Clustering + Process Variation / Variant Modeling

Status: DRAFT (architecture spec, not yet built)
Owner: system-architect
Scope: (1) fuzzy same/similar clustering of workflow recordings; (2) variant detection + diverge→reconverge modeling, deterministic and evidence-linked.
Ledgerium core invariants in force: immutability of raw input, deterministic transforms, every output traceable to source events.

---

## 0. Ground-truth audit (what exists; do NOT reinvent)

Read before building. All file paths absolute-relative to repo root.

| Asset | Path | Status | Reuse verdict |
|---|---|---|---|
| `computePathSignature` (ordered step-category join `':'`) | `packages/intelligence-engine/src/pathSignature.ts` | EXISTS, used for exact grouping only | REUSE as the canonical signature primitive |
| `computeSignatureSimilarity` (0.7·bigram-Jaccard + 0.3·count-ratio) | `packages/intelligence-engine/src/pathSignature.ts` | EXISTS, **unused for grouping** | **HIGHEST-LEVERAGE REUSE** — this is the fuzzy similarity function |
| `bigramJaccardSimilarity` | `packages/intelligence-engine/src/pathSignature.ts` | EXISTS | REUSE inside similarity |
| `computeVariantDistance` (Wagner–Fischer LCS alignment + deviationPoints) | `packages/intelligence-engine/src/variantAnalyzer.ts` | EXISTS | **REUSE** — alignment backbone for diverge→reconverge |
| `buildVariantRecords` | `packages/intelligence-engine/src/variantAnalyzer.ts` | EXISTS | REUSE for per-variant record assembly |
| `detectVariants` (greedy first-match clustering by signature) | `packages/intelligence-engine/src/variantDetector.ts` | EXISTS | REUSE as the **within-cluster** variant splitter (NOT cross-cluster grouping) |
| `analyzeVariance` (sequenceStability, durationVariance) | `packages/intelligence-engine/src/varianceAnalyzer.ts` | EXISTS | REUSE unchanged |
| `scoreExactGroup` / `scoreFamilyMembership` / `scoreComponentReuse` / `scoreAutomationOpportunity` | `packages/intelligence-engine/src/{exactGroupScorer,familyScorer,componentReuseScorer,automationScorer}.ts` | EXISTS | REUSE for **edge labeling + confidence**, not for the clustering decision itself |
| `fingerprintWorkflowSteps` / `hashStepSequence` / `sequenceFingerSimilarity` | `packages/intelligence-engine/src/stepFingerprinter.ts` | EXISTS | REUSE for semantic-signature path (richer than category path) |
| `normalizeTitle` | `packages/intelligence-engine/src/titleNormalizer.ts` | EXISTS | REUSE for tie-break + name-evidence only |
| `clusterWorkflows()` (exact-signature-only grouping + family layer) | `apps/web-app/src/lib/intelligence.ts` | EXISTS — **THE GAP** | REPLACE the grouping decision with fuzzy pipeline; keep persistence shape |
| Prisma `ProcessDefinition` (= cluster), `ProcessFamily` (= family), `ProcessVariantRecord` (= variant) | `apps/web-app/prisma/schema.prisma` | EXISTS | EXTEND additively |
| Prisma `Workflow.variantId` / `variantFingerprint` / `processGraphVersionAtIngest` | `apps/web-app/prisma/schema.prisma:113-115` | EXISTS (nullable, reserved Path E PATHE-P08/P10) | **REUSE these columns** — do not add new run→variant pointers |
| Prisma `ProcessGraph` / `ProcessNode` / `ProcessEdge` / `DecisionPoint` / `Variant` (Path E, **per-workflow** single-run graph) | `apps/web-app/prisma/schema.prisma:619-736` | EXISTS, immutable-versioned | **DO NOT COLLIDE** — these are per-run graphs; cluster-level work layers above them (see §4.6) |

**Determinism constants already pinned:** `INTELLIGENCE_ENGINE_VERSION='1.0.0'`, `GROUPING_MODEL_VERSION='1.0.0'`, `SCORING_MODEL_VERSION='1.0.0'`, `VARIANT_SIMILARITY_THRESHOLD=0.75`. We add `CLUSTER_MODEL_VERSION` (§5.5).

**Naming collision warning.** `Variant` (Prisma, Path E) is the *per-run-graph* node-sequence variant. The cross-run cluster variant is `ProcessVariantRecord` (Prisma). To avoid ambiguity, all new cross-run models in this spec use the `Cluster*` prefix. We DO NOT add a second `Variant` table.

---

## 1. CLUSTERING PIPELINE — exact-signature-only → deterministic fuzzy grouping

### 1.1 Goal

Replace the single decision in `clusterWorkflows()` (group iff identical `pathSignature` string) with: group runs that are the *same-or-similar* process, deterministically, at scale, with confidence + provenance.

The grouping decision is itself deterministic — given the same set of runs and the same `CLUSTER_MODEL_VERSION`, the output partition is byte-identical regardless of input ordering, hardware, or wall-clock.

### 1.2 Representation per run — the `ClusterMember` projection (pure)

Each run is projected once into a deterministic, privacy-safe `ClusterMember`. Two parallel signatures are carried because each catches different similarity:

- **categoryPath** — ordered step *categories* (`computePathSignature`). Coarse, stable, what `ProcessDefinition.pathSignature` already stores.
- **semanticPath** — ordered step *semantic signatures* (`verb:object:system:eventType` from `fingerprintWorkflowSteps`). Finer; distinguishes "fill form in Salesforce" from "fill form in HubSpot" that share a category path.

```ts
// packages/intelligence-engine/src/clustering/clusterMember.ts  (NEW, pure)
export interface ClusterMember {
  runId: string;                 // = Workflow.id  (stable join key + tie-break key)
  categorySignature: PathSignature;   // from computePathSignature
  semanticPath: string[];             // ordered semanticSignatures (stepFingerprinter)
  semanticSignature: string;          // hashStepSequence(...) — exact-equality fast path
  systems: string[];                  // sorted unique
  startAnchor: string;                // first semanticSignature ('' if none)
  endAnchor: string;                  // last  semanticSignature ('' if none)
  stepCount: number;
  normalizedName: NormalizedTitle;    // evidence only, never a grouping gate
  durationMs: number | null;
}

export function projectClusterMember(bundle: ProcessRunBundle, runId: string): ClusterMember;
```

Privacy: every field is category/semantic-token or hash. No raw labels, no PII. (Matches existing `pathSignature` / `fingerprintStep` discipline.)

### 1.3 Pairwise similarity — the single similarity function (REUSE)

```ts
// packages/intelligence-engine/src/clustering/similarity.ts  (NEW, pure)
export interface ClusterSimilarity {
  score: number;          // 0..1 composite, the clustering decision input
  categoryScore: number;  // computeSignatureSimilarity(a,b)
  semanticScore: number;  // 1 - normalizedLcsDistance(a.semanticPath,b.semanticPath)
  anchorMatch: boolean;   // start AND end anchors equal
  systemOverlap: number;  // setOverlap(a.systems,b.systems)  (existing util)
}

export function computeClusterSimilarity(a: ClusterMember, b: ClusterMember): ClusterSimilarity;
```

Composite (fixed weights, version-pinned, NOT a runtime knob — knobs break determinism reproducibility across runs):

```
categoryScore = computeSignatureSimilarity(a.categorySignature, b.categorySignature)   // EXISTS, 0.7 bigram + 0.3 count
semanticScore = 1 - (lcsEditCount(a.semanticPath,b.semanticPath) / max(|a|,|b|))         // REUSE Wagner–Fischer from variantAnalyzer
anchorBonus   = anchorMatch ? 0.05 : 0
systemBonus   = 0.05 * systemOverlap

score = clamp01( 0.55*categoryScore + 0.35*semanticScore + anchorBonus + systemBonus )
```

Rationale for the split: `computeSignatureSimilarity` is order-sensitive but bigram-based (tolerant of small local reordering); LCS edit distance is the precise insertion/deletion measure. Weighting category higher keeps continuity with today's `ProcessDefinition.pathSignature`; semantic refines.

> **Reuse note:** the LCS edit count is *already computed* by `computeAlignment` inside `variantAnalyzer.ts`. Extract it into a tiny exported `lcsEditCount(a: string[], b: string[]): number` (≈10 LOC) so both clustering and variant code share one alignment implementation. Do not write a second DP.

### 1.4 Threshold model (banded, deterministic)

A single scalar threshold is brittle. Use a **band model** with a join threshold and a merge/split hysteresis gap (prevents thrash on incremental re-clustering, §1.8).

```
T_JOIN   = 0.86   // ≥ → same cluster (connected-components edge exists)
T_MERGE  = 0.86   // two existing clusters merge iff a cross-cluster pair ≥ this
T_SPLIT  = 0.78   // a member is ejected from its cluster iff its best in-cluster
                  // similarity < this (hysteresis band [0.78,0.86) is "sticky")
T_FAMILY = 0.55   // below T_JOIN but ≥ this → not same cluster, candidate same FAMILY
```

Bands map onto the existing `ScoringConfidenceBand` (`verified`/`high_confidence`/...) for UI parity. Thresholds are constants in `CLUSTER_CONFIG` (§5.5), version-pinned, changeable only by bumping `CLUSTER_MODEL_VERSION`.

Edge case — singletons: a run that matches nothing ≥ `T_JOIN` forms its own cluster (a standalone `ProcessDefinition`, `groupType:'standalone'`, exactly as today's singleton path).

### 1.5 Candidate generation — MinHash + LSH (avoid O(n²))

Full pairwise is O(n²). For a user with thousands of runs this is the scaling risk. Insert a deterministic **blocking** stage that emits only *candidate pairs*, then run §1.3 similarity on candidates only.

```ts
// packages/intelligence-engine/src/clustering/lsh.ts  (NEW, pure)  ── largest net-new module, see §6
export interface MinHashConfig { numHashes: number; bands: number; rowsPerBand: number; seed: number; }
export const MINHASH_CONFIG: MinHashConfig = { numHashes: 128, bands: 32, rowsPerBand: 4, seed: 0x5eed };

export function shingleMember(m: ClusterMember): string[];     // category bigrams ∪ semantic bigrams
export function minHashSignature(shingles: string[], cfg?: MinHashConfig): number[];   // length numHashes
export function lshCandidatePairs(members: ClusterMember[], cfg?: MinHashConfig):
  Array<[string, string]>;   // sorted, deduped, deterministic
```

Determinism requirements for MinHash/LSH (these are the hard part — get them right):

1. **Hash family is fixed + seeded.** Use a deterministic non-cryptographic hash (FNV-1a or xxHash-32) over each shingle, combined with `numHashes` precomputed `(a_i, b_i)` multiplier/offset pairs derived from a **fixed seed** (`MINHASH_CONFIG.seed`). No `Math.random`, no time, no per-process state. The pairs are generated by a seeded LCG so the same seed → same hash family on every machine.
2. **Band bucketing is order-independent.** Bucket key = hash of the concatenated band rows; members map into buckets; any bucket with ≥2 members emits all intra-bucket pairs.
3. **Output is canonicalized.** Each pair is ordered `(min(runId), max(runId))` by `localeCompare`; the full list is sorted and deduped. This guarantees identical candidate sets regardless of input array order.
4. **Recall floor.** `numHashes=128`, `bands=32`, `rows=4` targets ~0.86 Jaccard at the LSH S-curve inflection — aligned to `T_JOIN`. Pairs below ~0.6 true similarity are rarely emitted (acceptable: they aren't cluster-mates). This is a *candidate* filter; the §1.3 exact similarity is still applied to every candidate, so LSH never creates a false cluster, only risks a rare false-negative on a borderline pair. Documented as a known tradeoff (§1.9).
5. **Small-n bypass.** If `n ≤ LSH_BYPASS_N` (default 200), skip LSH and do full pairwise — exact, and cheaper than building 128 hashes. Threshold pinned in `CLUSTER_CONFIG`.

### 1.6 Clustering algorithm — connected components over the threshold graph

We deliberately choose **single-linkage connected components** over agglomerative-with-cut because it is the most deterministic and the cheapest to make incremental:

```ts
// packages/intelligence-engine/src/clustering/clusterEngine.ts  (NEW, pure)  ── core, see §6
export interface ClusterResult {
  clusters: ClusterAssignment[];     // sorted by size desc, then by minRunId
  modelVersion: string;              // CLUSTER_MODEL_VERSION
  thresholdSnapshot: ClusterThresholds;
  candidatePairCount: number;        // observability
  evidencePairs: ScoredPair[];       // every pair that passed T_JOIN, for provenance
}
export interface ClusterAssignment {
  clusterKey: string;                // deterministic hash of sorted member runIds (§1.7)
  memberRunIds: string[];            // sorted
  representativeRunId: string;       // medoid (§3.1)
  cohesion: number;                  // mean in-cluster pair score → confidence input
}
export interface ScoredPair { aRunId: string; bRunId: string; score: number; band: ScoringConfidenceBand; }

export function clusterMembers(members: ClusterMember[], cfg?: ClusterConfig): ClusterResult;
```

Algorithm (fully deterministic):

1. Sort members by `runId.localeCompare` (fixed processing order — same discipline as `detectVariants`).
2. Candidate pairs = `lshCandidatePairs` (or full pairwise if `n ≤ LSH_BYPASS_N`).
3. For each candidate pair compute `computeClusterSimilarity`; keep edges with `score ≥ T_JOIN`.
4. Union-find over edges → connected components. (Reuse the union-find pattern already in `runFamilyDetection`.) Union order is irrelevant to the final partition (components are order-invariant), so determinism holds even though we don't sort edges; we still sort edges by `(score desc, aRunId, bRunId)` before union so the **evidence trail** and any future linkage-rule swap are reproducible.
5. Each component → `ClusterAssignment`. Tie-breaking everywhere by `runId.localeCompare`.

**Why not full agglomerative (UPGMA / average-linkage with a dendrogram cut)?** Average-linkage requires recomputing inter-cluster distances on every merge and a cut height — both add nondeterminism risk (floating-point merge-order sensitivity) and make incremental updates O(n²) again. Single-linkage connected-components is order-invariant, integrates with union-find, and is trivially incremental. Tradeoff: single-linkage can "chain" (A~B, B~C, A≁C all land together). Mitigated by (a) the high `T_JOIN=0.86`, (b) cohesion reporting (chained clusters surface low cohesion → low confidence), and (c) the split rule (§2.4) which ejects members whose best in-cluster similarity drops below `T_SPLIT`. Documented tradeoff §1.9.

### 1.7 `clusterKey` — stable cluster identity across re-clusterings

A cluster's identity must survive re-clustering so the same real process keeps the same `ProcessDefinition` row (preserving insights, history, `Workflow.processDefinitionId` links). Content-addressed key:

```
clusterKey = sha256( CLUSTER_MODEL_VERSION + '|' + sortedMemberRunIds.join(',') ).slice(0,32)
```

But membership changes when a run is added → key would churn. So `clusterKey` is the *content hash of the current membership* (used for change-detection + audit), while persistent identity is resolved by **maximum-overlap matching** against existing `ProcessDefinition` rows (§2). The content hash is stored as `ProcessDefinition.clusterMembershipHash`; if it is unchanged since last run, the cluster's downstream analysis is skipped (idempotency, §5.4).

### 1.8 Incremental re-clustering on each new recording

Full re-cluster of all of a user's runs on every ingest is wasteful. The incremental path (default) does the minimum deterministic work; the full path is the fallback / reconciliation job.

**Incremental join (on new run R for user U):**
1. Project `R` → `ClusterMember`.
2. Build candidate set: `lshCandidatePairs` between `R` and the **representatives (medoids) of existing clusters** + members of any LSH bucket `R` lands in. (Comparing against medoids, not all members, keeps this O(#clusters) not O(n).)
3. Compute similarity `R` vs each candidate cluster's medoid (and best member).
4. Decision (§2): join best cluster ≥ `T_JOIN`; else spawn new; if `R` bridges two clusters at ≥ `T_MERGE`, flag a merge for the reconcile job (do NOT merge live — merges are batch, §2.3, to keep ingest cheap and auditable).
5. Recompute only the affected cluster(s)' variants + divergence model (§3). Untouched clusters are not retouched (idempotency).

**Determinism caveat made explicit:** incremental and full clustering can in principle disagree at the margins (single-linkage is history-independent for the final partition, but the *incremental* path uses medoid-comparison as an approximation). Therefore:

- The **reconcile job** (full `clusterMembers` over all of U's runs) runs (a) nightly per active user and (b) on-demand. Its output is the *authority*. Incremental output is an eventually-consistent fast path.
- Both paths are pinned to `CLUSTER_MODEL_VERSION`. When they disagree, reconcile wins and the diff is logged as a `cluster_reassignment` provenance event (§2.5).
- Reproducibility guarantee is stated precisely: **the full `clusterMembers(allRunsOfUser)` is the deterministic contract.** Given the same run set + version, it is byte-identical. The incremental path is a performance approximation that the reconcile job corrects.

### 1.9 Tradeoffs (clustering) — stated plainly

| Decision | Benefit | Cost / risk | Mitigation |
|---|---|---|---|
| Single-linkage CC over agglomerative | order-invariant, incremental, cheap | chaining can over-merge | high `T_JOIN`, cohesion confidence, split rule |
| MinHash/LSH blocking | O(n) candidate gen at scale | rare false-negative borderline pair | full pairwise below `LSH_BYPASS_N`; reconcile job; recall-tuned params |
| Two-signature similarity (category+semantic) | catches more real similarity | two projections to maintain | both reuse existing primitives; no new parsing |
| Incremental fast path | cheap ingest | margin disagreement w/ full | nightly reconcile is authority, diffs logged |
| Fixed weights (no per-user tuning) | reproducible across machines/time | not adaptive | version bump is the only way to change → full audit trail |

---

## 2. CLUSTER MEMBERSHIP semantics — join / spawn / merge / split

### 2.1 Join an existing `ProcessDefinition`

New run R joins cluster C iff `computeClusterSimilarity(R, medoid(C)).score ≥ T_JOIN` AND R's best similarity to any member of C ≥ `T_JOIN`. On join:
- `Workflow.processDefinitionId = C.id`
- recompute C's medoid, cohesion, variants, divergence model
- emit provenance: `{ action:'join', runId, clusterId, score, band, modelVersion }`

Confidence = `cohesion` blended with sample size: `confidence = cohesion * sampleFactor`, `sampleFactor = min(1, runCount/3)` (mirrors today's `rawConfidence` step buckets at lines 302). Confidence band via `resolveConfidenceBand`.

### 2.2 Spawn a new `ProcessDefinition`

R matches nothing ≥ `T_JOIN` → new `ProcessDefinition` (`groupType:'standalone'` until it gains a 2nd member, then `'exact_group'` — keep existing semantics). Provenance: `{ action:'spawn', runId, clusterId, modelVersion }`.

### 2.3 Merge two clusters

Triggered when a run (or the reconcile job) finds a cross-cluster pair ≥ `T_MERGE`. Merges run **only in the reconcile/batch job**, never inline on ingest, because a merge rewrites `Workflow.processDefinitionId` for a whole cluster and must be auditable as one atomic operation.

Survivor selection (deterministic): the surviving `ProcessDefinition` is the one with (a) more runs, tie-break (b) older `createdAt`, tie-break (c) smaller `id.localeCompare`. The non-survivor's workflows are repointed; the non-survivor row is **soft-deleted** (`ProcessDefinition.mergedIntoId = survivor.id`, `status:'merged'`) — never hard-deleted, preserving the historical link and any shared insights (immutability of history). Provenance: `{ action:'merge', survivorId, mergedId, bridgeRunIds, score, modelVersion }`.

### 2.4 Split a cluster

A member M is ejected when its best in-cluster similarity `< T_SPLIT` (the hysteresis floor). Cause: single-linkage chaining, or M drifted. Split runs in the reconcile job only. M either joins another cluster (if ≥ `T_JOIN` elsewhere) or spawns. Provenance: `{ action:'split', runId, fromClusterId, toClusterId|null, bestScore, modelVersion }`.

Hysteresis: the `[T_SPLIT=0.78, T_JOIN=0.86)` gap means a member sitting at 0.80 neither newly-joins nor gets ejected — it is *sticky*. This is what prevents re-cluster thrash (a member oscillating in/out across nightly runs). Without hysteresis a borderline run would flip cluster every night, churning insights + history.

### 2.5 Provenance + confidence (the audit trail)

Every membership transition is an immutable provenance event persisted to `ClusterProvenance` (§4.3). This is the Ledgerium "traceability over convenience" requirement made concrete: you can replay how any cluster reached its current membership. Provenance rows carry `modelVersion` + `thresholdSnapshot` so a future version bump's effect is diffable.

---

## 3. VARIANT MODEL — reference path, per-variant records, diverge→reconverge

This layer runs *within* a single cluster (one `ProcessDefinition`) over its member runs. It REUSES `detectVariants` + `computeVariantDistance` + `buildVariantRecords`, and adds the diverge→reconverge detector.

### 3.1 Reference / standard path selection — medoid, not mode

Today `detectVariants` calls the most-frequent variant the standard path. That biases toward whatever was recorded most, even if it's an outlier-heavy mode. Upgrade to a **medoid** with frequency tie-break, deterministically:

```ts
// packages/intelligence-engine/src/clustering/referencePath.ts  (NEW, pure)
export interface ReferencePath {
  representativeRunId: string;       // the medoid run
  categoryPath: string[];
  semanticPath: string[];
  selectionReason: 'medoid' | 'frequency_fallback';
  meanSimilarityToCluster: number;   // medoid quality
}
export function selectReferencePath(members: ClusterMember[]): ReferencePath;
```

Medoid = the member minimizing total edit distance to all others (`argmin Σ lcsEditCount`). Ties broken by (1) higher frequency of its exact `semanticSignature`, (2) `runId.localeCompare`. Pure, deterministic. Falls back to frequency mode only when `n<2`. This medoid is also the cluster's `representativeRunId` (§1.6) — one definition, two consumers.

### 3.2 Per-variant records (REUSE)

Within the cluster, group members into variants with the **existing** `detectVariants` (greedy first-match at `VARIANT_SIMILARITY_THRESHOLD=0.75`), then build records with the **existing** `buildVariantRecords` against the §3.1 reference path. Each variant record persists to `ProcessVariantRecord` (already exists) — signature, frequency, run members (`evidenceRunIds`), deviation points, avg duration, isStandard/isFastest/isSlowest/isOutlier. No new code here beyond wiring reference-path = medoid instead of mode.

### 3.3 Diverge→reconverge detection (NEW) — the core net-new analysis

Goal: across all runs in a cluster, find the points where execution **branches** (diverge) and where branches **rejoin** (reconverge), and model the cluster as a backbone with branches.

Algorithm — **LCS-backbone multiple alignment** (deterministic, reuses the Wagner–Fischer alignment):

```ts
// packages/intelligence-engine/src/clustering/divergence.ts  (NEW, pure)  ── net-new ≥200 LOC, see §6
export interface BranchPoint {
  backboneIndex: number;          // position in the reference backbone where branches split
  kind: 'diverge' | 'reconverge';
  branches: BranchSegment[];      // the alternative sub-paths between this and the rejoin
  runSupport: Record<string,string[]>; // branchId → evidenceRunIds taking it
  reconvergeBackboneIndex: number | null; // where branches rejoin (null = terminal divergence)
}
export interface BranchSegment {
  branchId: string;               // deterministic: hash(backboneIndex+':'+stepSignatures)
  stepSignatures: string[];       // the alternative sub-sequence (semantic)
  runCount: number;
  evidenceRunIds: string[];       // sorted — traceability to source runs
  frequencyPct: number;
}
export interface DivergenceModel {
  referenceRunId: string;
  backbone: string[];             // medoid semanticPath = the spine
  branchPoints: BranchPoint[];
  variantVersion: string;         // hashed, §3.4
  modelVersion: string;
  evidenceRunIds: string[];
}
export function buildDivergenceModel(members: ClusterMember[], reference: ReferencePath): DivergenceModel;
```

Procedure:
1. Backbone = reference (medoid) `semanticPath`.
2. For each non-reference run, align it to the backbone with `computeAlignment` (REUSE — the same Wagner–Fischer in `variantAnalyzer.ts`). The alignment yields `match` / `insertion` / `deletion` / `substitution` ops keyed by backbone index.
3. **Diverge point** = a backbone index where ≥2 runs' alignments leave the backbone (insertion/substitution runs) — i.e., consecutive non-`match` ops starting after the same matched backbone index.
4. **Reconverge point** = the next backbone index where those same runs return to `match`. If they never return → `reconvergeBackboneIndex=null` (terminal branch, e.g., an error path that aborts).
5. A `BranchSegment` is the maximal off-backbone sub-sequence for a set of runs between the same diverge and reconverge indices. Runs sharing an identical off-backbone sub-sequence share a branch (grouped by `hashStepSequence` of the segment).
6. `runSupport` records exactly which runs took each branch — this is the evidence link.

Determinism: backbone is deterministic (medoid §3.1); per-run alignment is deterministic (Wagner–Fischer with fixed tie-break order already in `computeAlignment`); run processing order sorted by `runId`; branch IDs are content hashes. No floats in the branch-detection logic (only integer indices + string hashes), so no FP nondeterminism.

This is the "diverge→reconverge" deliverable: a backbone spine with explicit branch/join indices, each branch carrying its supporting run IDs (traceable to source events via the run → `WorkflowArtifact(process_output)` → event chain).

### 3.4 `variant_version` / `divergence_version` — hashed + pinned

Every persisted divergence model and variant set carries a content hash so a stored model is provably the output of a specific algorithm version over specific inputs:

```
variantVersion = sha256(
  CLUSTER_MODEL_VERSION + '|' +
  INTELLIGENCE_ENGINE_VERSION + '|' +
  VARIANT_SIMILARITY_THRESHOLD + '|' +
  sortedMemberRunIds.join(',') + '|' +
  backbone.join('>')
).slice(0,32)
```

Stored on the new `ClusterDivergence` row (§4.2). Recompute is skipped when the recomputed `variantVersion` equals the stored one (idempotency). A version bump changes the hash for *all* clusters → forces recompute → fully auditable.

### 3.5 Tradeoffs (variant model)

| Decision | Benefit | Cost | Mitigation |
|---|---|---|---|
| Medoid reference vs frequency mode | robust to lopsided recording counts | O(k²) edit-distance within cluster | clusters are small (k runs); LCS already memoized; cache backbone |
| LCS-backbone alignment (star alignment to medoid) vs full MSA | deterministic, reuses existing DP, O(k·L²) | star alignment is an approximation of true multiple alignment | acceptable — true MSA is NP-hard + nondeterministic tie-breaks; star is the standard deterministic substitute |
| Branch = identical off-backbone subsequence | clean evidence grouping | near-identical branches counted separate | optional branch-merge at `VARIANT_SIMILARITY_THRESHOLD` (phase 2) |

---

## 4. DATA MODEL CHANGES — additive, immutable, evidence-linked

Principle: **additive migrations only** (CLAUDE.md DB rule). Reuse existing columns where they exist. New cross-run models use `Cluster*` prefix to avoid the Path E `Variant` collision (§0).

### 4.1 Extend `ProcessDefinition` (the cluster) — additive columns

```prisma
model ProcessDefinition {
  // ... existing fields unchanged ...
  // ── Process-variation clustering (additive) ──
  clusterModelVersion    String?  @map("cluster_model_version")     // pin for this row's grouping
  clusterMembershipHash  String?  @map("cluster_membership_hash")   // §1.7 content hash, idempotency
  representativeRunId     String?  @map("representative_run_id")     // medoid run (§3.1)
  cohesionScore          Float?   @map("cohesion_score")            // mean in-cluster pair score
  mergedIntoId           String?  @map("merged_into_id")            // §2.3 soft-merge pointer (self-ref)
  status                 String   @default("active") @map("status") // active | merged
  @@index([clusterMembershipHash])
  @@index([mergedIntoId])
}
```

Existing `pathSignature`, `variantCount`, `stabilityScore`, `confidenceScore`, `confidenceBand`, `intelligenceJson` are reused as-is.

### 4.2 NEW `ClusterDivergence` — one immutable row per (cluster, variantVersion)

```prisma
model ClusterDivergence {
  id                    String   @id @default(uuid())
  userId                String   @map("user_id")
  processDefinitionId   String   @map("process_definition_id")  // the cluster
  variantVersion        String   @map("variant_version")        // §3.4 content hash
  clusterModelVersion   String   @map("cluster_model_version")
  referenceRunId        String   @map("reference_run_id")       // medoid
  backboneJson          String   @map("backbone_json")          // string[] semantic spine
  branchPointsJson      String   @map("branch_points_json")     // BranchPoint[] incl. runSupport
  branchPointCount      Int      @default(0) @map("branch_point_count")
  evidenceRunIds        String   @map("evidence_run_ids")       // JSON string[] — traceability
  computedAtMs          BigInt   @map("computed_at_ms")
  createdAt             DateTime @default(now()) @map("created_at")

  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  processDefinition ProcessDefinition @relation(fields: [processDefinitionId], references: [id], onDelete: Cascade)

  @@unique([processDefinitionId, variantVersion]) // immutability: new version = new row, never UPDATE
  @@index([userId])
  @@index([processDefinitionId])
  @@map("cluster_divergences")
}
```

Immutability: rows are INSERT-only. A recompute with a new `variantVersion` inserts a new row; the latest is `MAX(computedAtMs)`. Prior revisions preserved (mirrors the Path E `ProcessGraph` immutable-versioning pattern at schema line 612). Hard prune is a separate retention job, not an inline mutation.

### 4.3 NEW `ClusterProvenance` — immutable membership audit log

```prisma
model ClusterProvenance {
  id                  String   @id @default(uuid())
  userId              String   @map("user_id")
  action              String   @map("action")          // join | spawn | merge | split | reassign
  runId               String?  @map("run_id")
  clusterId           String?  @map("cluster_id")       // ProcessDefinition.id (no FK — survives soft-delete)
  fromClusterId       String?  @map("from_cluster_id")
  toClusterId         String?  @map("to_cluster_id")
  score               Float?   @map("score")
  band                String?  @map("band")
  clusterModelVersion String   @map("cluster_model_version")
  thresholdSnapshot   String   @map("threshold_snapshot") // JSON ClusterThresholds at decision time
  decidedBy           String   @map("decided_by")          // 'ingest' | 'reconcile'
  computedAtMs        BigInt   @map("computed_at_ms")
  createdAt           DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([runId])
  @@index([clusterId])
  @@index([action])
  @@map("cluster_provenance")
}
```

No FK on `clusterId` (polymorphic-by-discipline, matching the existing `GroupRelationship` pattern at schema line 379) so provenance survives merge soft-deletes.

### 4.4 Run → variant link — REUSE existing columns (no new column)

`Workflow.variantId`, `Workflow.variantFingerprint` already exist (schema lines 113-114, reserved Path E PATHE-P08/P10). Reuse them: `variantFingerprint` = the cluster-variant `branchId`/`semanticSignature`; `variantId` points at the `ProcessVariantRecord.id`. **Coordination note (open risk, flag to coordinator):** PATHE-P08/P10 also intend to write these columns from the per-run-graph `Variant` table. Two writers to one column is a contract conflict. Resolution options: (a) this feature owns `variantFingerprint` (cross-run), Path E owns nothing there; (b) add a dedicated `clusterVariantRecordId` column instead. Recommend (b) — a clean dedicated additive column avoids cross-feature coupling:

```prisma
model Workflow {
  // ... existing ...
  clusterVariantRecordId String? @map("cluster_variant_record_id") // FK→ProcessVariantRecord.id (cross-run variant)
  @@index([clusterVariantRecordId])
}
```

### 4.5 Evidence-link integrity (the traceability contract)

Every analytical row links back to source events through an unbroken chain:

```
ClusterDivergence.evidenceRunIds[]  →  Workflow.id
Workflow.id  →  WorkflowArtifact(artifactType='process_output').contentJson  →  ProcessRun + ProcessDefinition (engine)
ProcessRun  →  raw CanonicalEvent[]  (immutable source, never mutated)
```

`BranchSegment.evidenceRunIds` and `BranchPoint.runSupport` resolve any branch to the exact runs (and thus the exact recorded events) that produced it. This satisfies "every output traceable to source events."

### 4.6 Relationship to Path E per-run `ProcessGraph` / `Variant` (no collision)

Path E `ProcessGraph` is a **single-workflow** graph (`@@unique([workflowId, graphVersion])`). Path E `Variant` is a per-graph node-sequence variant. This feature is **cross-run** at the cluster level. They compose, they don't conflict:

- A cluster's `ClusterDivergence` backbone *could* be materialized as an aggregated `ProcessGraph` at the cluster grain in a later phase, but **not in this scope** — keep them separate to avoid `@@unique([workflowId,...])` semantics (a cluster has no single `workflowId`). If a cluster-grain graph is wanted later, it gets its own `ClusterProcessGraph` model, not a reuse of the per-run one.

### 4.7 Migration plan (additive, ordered)

1. `migration_add_processdefinition_cluster_fields` — additive nullable columns on `process_definitions` + 2 indexes. Zero backfill (NULL = "not yet clustered by v-model"; existing exact-signature clusters keep working until reconcile fills the fields).
2. `migration_create_cluster_divergences` — new table.
3. `migration_create_cluster_provenance` — new table.
4. `migration_add_workflow_cluster_variant_record_id` — additive nullable column + index on `workflows`.

All four are additive, reversible (drop column/table), and require no data migration. New `User` inverse relations (`clusterDivergences`, `clusterProvenance`) added to the `User` model.

---

## 5. CONTRACTS — pure functions, API surface, where it runs, idempotency

### 5.1 Pure engine functions (new, in `packages/intelligence-engine/src/clustering/`)

All pure (no I/O, no DB, no time except passed-in), deterministic, privacy-safe:

```ts
projectClusterMember(bundle: ProcessRunBundle, runId: string): ClusterMember
computeClusterSimilarity(a: ClusterMember, b: ClusterMember): ClusterSimilarity
lcsEditCount(a: string[], b: string[]): number                          // extracted from variantAnalyzer (shared)
lshCandidatePairs(members: ClusterMember[], cfg?: MinHashConfig): Array<[string,string]>
clusterMembers(members: ClusterMember[], cfg?: ClusterConfig): ClusterResult
selectReferencePath(members: ClusterMember[]): ReferencePath
buildDivergenceModel(members: ClusterMember[], reference: ReferencePath): DivergenceModel
incrementalAssign(newMember: ClusterMember, existing: ClusterSnapshot[], cfg?: ClusterConfig): AssignmentDecision
```

`AssignmentDecision = { action:'join'|'spawn'|'merge_flag', clusterKey:string|null, score:number, band, mergeBridge?:string[] }`.

All exported from `packages/intelligence-engine/src/index.ts`. `computeClusterSimilarity` returns its sub-scores so the persistence layer can store evidence without recomputing.

### 5.2 Service layer (in `apps/web-app/src/lib/intelligence.ts` — replaces the grouping decision only)

`clusterWorkflows(userId)` is refactored: the *projection + persistence* skeleton (lines 132-417) is preserved; the **grouping decision** (lines 136-150: group-by-identical-signature `Map`) is replaced by `clusterMembers(...)`. Everything downstream (canonical name derivation, metrics, `analyzePortfolio`, family detection, component detection, insight generation) is unchanged — it now iterates over fuzzy clusters instead of exact-signature buckets. The `runFamilyDetection` union-find layer stays (family = above cluster).

New service functions:
```ts
reconcileClusters(userId): Promise<ReconcileResult>      // full clusterMembers authority + merge/split application + provenance
assignRunToCluster(userId, workflowId): Promise<void>    // incremental fast path on ingest
buildClusterDivergence(userId, processDefinitionId): Promise<void>  // §3, persists ClusterDivergence
```

### 5.3 API surface (REST, envelope `{data,error,meta}` per CLAUDE.md)

```
POST /api/intelligence/cluster/reconcile        → enqueue reconcile job (async, returns {job_id})  [>200ms ⇒ job_id per CLAUDE.md]
GET  /api/intelligence/clusters                  → list ProcessDefinitions (clusters) w/ cohesion, variantCount, band
GET  /api/intelligence/clusters/:id              → cluster detail incl. members, variants, provenance summary
GET  /api/intelligence/clusters/:id/divergence   → latest ClusterDivergence (backbone + branchPoints + runSupport)
GET  /api/intelligence/clusters/:id/provenance   → ClusterProvenance audit trail
GET  /api/workflows/:id/cluster                  → which cluster + variant + branch this run belongs to
```

Reads are synchronous (data is precomputed + cached on `ProcessDefinition` / `ClusterDivergence`). Writes (reconcile) are async jobs returning `job_id` (clustering a large portfolio exceeds the 200ms inline budget per CLAUDE.md API rule). Inputs validated with Zod.

### 5.4 Where clustering runs — ingest job vs on-demand

| Trigger | Path | Cost | Authority |
|---|---|---|---|
| New recording ingested (BullMQ `process_session` completion) | `assignRunToCluster` (incremental §1.8) | O(#clusters) | fast path |
| Nightly per active user | `reconcileClusters` (full §1.6) | O(n) w/ LSH | **authority** |
| User clicks "re-analyze" | `reconcileClusters` on-demand (job_id) | O(n) | authority |
| Divergence view opened + stale `variantVersion` | `buildClusterDivergence` lazy recompute | O(k·L²) per cluster | cached |

Clustering runs in the **ingest job** for the incremental path (it must, to make the new run immediately appear in its cluster) and **on-demand / scheduled** for the authoritative full reconcile. This split keeps ingest fast while guaranteeing eventual exact-determinism.

### 5.5 Determinism + reproducibility (Ledgerium core)

`CLUSTER_CONFIG` is the single source of all knobs, version-pinned:

```ts
// packages/intelligence-engine/src/clustering/clusterConfig.ts (NEW)
export const CLUSTER_MODEL_VERSION = '1.0.0' as const;
export interface ClusterThresholds { tJoin:number; tMerge:number; tSplit:number; tFamily:number; }
export const CLUSTER_CONFIG = {
  modelVersion: CLUSTER_MODEL_VERSION,
  thresholds: { tJoin:0.86, tMerge:0.86, tSplit:0.78, tFamily:0.55 } as ClusterThresholds,
  weights: { category:0.55, semantic:0.35, anchorBonus:0.05, systemBonus:0.05 },
  lshBypassN: 200,
  minhash: MINHASH_CONFIG,
} as const;
```

Reproducibility guarantees, restated as testable invariants:
1. **Input-order invariance** — `clusterMembers(shuffle(members))` ≡ `clusterMembers(members)` (member sort + content-hash keys + order-invariant CC).
2. **Version pinning** — output partition is a pure function of `(members, CLUSTER_MODEL_VERSION)`. No `Date.now()`, no `Math.random()`, no env, no hardware FP divergence in branch logic (integer indices + string hashes only; the one float — similarity score — is compared against fixed thresholds with a documented epsilon, never summed across a partition).
3. **Idempotency** — re-running with unchanged inputs produces identical `clusterMembershipHash` + `variantVersion` → downstream recompute is skipped.
4. **Stable tie-breaking** — every ordering decision (processing order, medoid ties, branch IDs, survivor selection) breaks ties by deterministic keys (`runId.localeCompare`, frequency, content hash). Specified at each site above.
5. **Evidence completeness** — every cluster, variant, branch, and membership transition carries `evidenceRunIds` / provenance back to source runs.

These become the invariant test suite (mirrors the existing `invariants.test.ts` / convergence-invariant pattern in the repo).

---

## 6. SEQUENCING — independently-shippable iterations, lowest-risk first

Each iteration is its own commit + validation + artifact update. Highest-leverage reuse and the ≥200 LOC net-new module are flagged per CLAUDE.md specialist-invocation gate D-4 clause 2.

| Iter | Deliverable | Risk | Reuse / net-new | D-4 |
|---|---|---|---|---|
| **C+1** | `clusterMember.ts` + `similarity.ts` + extract shared `lcsEditCount` from `variantAnalyzer`. Pure, unit-tested, **no persistence, no wiring**. | LOWEST | **HIGHEST-LEVERAGE REUSE: `computeSignatureSimilarity` (already built, unused for grouping) becomes the grouping function.** Net-new ~150 LOC. | system-architect already primary |
| **C+2** | `clusterEngine.ts` (connected-components + union-find, full pairwise only, `LSH_BYPASS_N` gate) + `clusterConfig.ts` + invariant tests (order-invariance, idempotency). Still pure, no DB. | LOW | Reuse union-find pattern from `runFamilyDetection`. Net-new ~180 LOC. | clause 2 LIKELY fires (new contract) |
| **C+3** | Additive Prisma migrations (§4.7) + refactor `clusterWorkflows()` grouping decision to call `clusterMembers` (full path), persist cohesion/membershipHash/representativeRunId/provenance. Behind a flag; exact-signature fallback preserved. | MEDIUM (touches live grouping) | Reuse entire persistence skeleton lines 152-417. Net-new ~120 LOC service + migrations. | backend-engineer |
| **C+4** | `referencePath.ts` (medoid) + `divergence.ts` (diverge→reconverge) + `ClusterDivergence` persistence + `buildClusterDivergence` service + `variantVersion` hashing. | MEDIUM | Reuse `computeAlignment` (Wagner–Fischer) verbatim. **`divergence.ts` is the net-new ≥200 LOC module → D-4 clause 2 FIRES, system-architect adjacency mandatory.** | **system-architect (≥200 LOC)** |
| **C+5** | `lsh.ts` MinHash/LSH candidate generation + wire into `clusterEngine` above `LSH_BYPASS_N` + recall/determinism tests. Pure, swappable, no behavior change below bypass-N. | MEDIUM (scaling correctness) | Net-new ~200 LOC. **D-4 clause 2 FIRES → system-architect adjacency.** Pure-perf layer, reversible. | **system-architect (≥200 LOC)** |
| **C+6** | `incrementalAssign` + `assignRunToCluster` on ingest job + `reconcileClusters` nightly job + merge/split application + provenance diff logging. | MEDIUM | Reuse C+2/C+3. Net-new ~150 LOC. | backend-engineer + devops (job wiring) |
| **C+7** | API routes (§5.3) + Zod + read models. UI is out of scope (separate frontend iteration). | LOW | Reuse cached fields. Net-new ~120 LOC. | backend-engineer; growth-strategist if ≥3 user-visible strings |

Sequencing rationale: C+1/C+2 ship **pure, unwired, fully reversible** value (the similarity + clustering engine with tests) before touching the live `clusterWorkflows` path at C+3. The riskiest live-grouping change (C+3) lands behind a flag with the exact-signature path preserved as fallback. Divergence (C+4) and scaling (C+5) are additive and independently reversible. The ingest/job wiring (C+6) lands only after the pure engine + persistence are proven.

**Highest-leverage reuse (single biggest win):** `computeSignatureSimilarity` in `pathSignature.ts` already exists, is already tested, and is currently **unused for grouping**. Wiring it (plus the existing Wagner–Fischer LCS in `variantAnalyzer.ts`) into the clustering decision is the core of the entire feature — the fuzzy-grouping capability is ~80% pre-built primitives, ~20% new orchestration (CC engine, LSH blocking, divergence model).

**Net-new ≥200 LOC modules (D-4 clause 2 — system-architect contract review BEFORE downstream builds on them):** `divergence.ts` (C+4) and `lsh.ts` (C+5). Both must get contract-level review before any iteration consumes their exported interface.

---

## 7. Open risks / coordinator flags

1. **`Workflow.variantId` / `variantFingerprint` dual-writer conflict** with Path E PATHE-P08/P10 (§4.4). RECOMMEND dedicated `clusterVariantRecordId` column instead of sharing. **Needs coordinator ruling before C+3 migration.**
2. **Incremental vs full-reconcile margin disagreement** (§1.8) is accepted-by-design (reconcile is authority) but must be surfaced in the UI as "analysis updating" rather than presenting incremental output as final.
3. **LSH recall floor** (§1.5) is a deliberate false-negative-tolerant tradeoff; the nightly full reconcile is the safety net. If a user's portfolio is small (< `LSH_BYPASS_N`) LSH never engages and results are exact — most users.
4. **Single-linkage chaining** (§1.6) mitigated by high `T_JOIN` + cohesion confidence + split rule; if real data shows over-merge, the linkage rule is swappable (the engine isolates linkage behind union-find edge selection) — a version bump, fully auditable.
5. **Cluster-grain `ProcessGraph`** is explicitly OUT of scope (§4.6) to avoid colliding with the per-run Path E graph; flagged as a future `ClusterProcessGraph` model if a merged cluster map is wanted.
