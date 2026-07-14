# Cross-Workflow Intelligence — Build Spec

**Type:** Build-phase design artifact (system-architect). ZERO product code — design only.
**Date:** 2026-07-13
**Program:** Cross-Workflow Intelligence (CEO-approved sequence: Phase 0 calibrate → T1 → T2 → T3 (gated) → T4/T5 → T6)
**Upstream:** `docs/meta/TIMESTUDY_INTELLIGENCE_REVIEW_001.md` + `{architect,analytics}_analysis.md`
**Companion:** `AI_SCORE_RECONCILIATION.md` (Phase 0 blocker for automation-ranking surfaces)

---

## 0. Program overview

The intelligence engine already ships ~80% of the required *primitives* as pure, tested, versioned functions. **This program is orchestration + persistence + UI, not new similarity mathematics.** The unifying model (per architect) is: **the graph is the spine** — edges = relationships, clusters = connected components, families = labeled clusters, compare = a subgraph zoom, time-study = a metric rollup over any node-set.

Every phase obeys the Ledgerium invariants:
- **Determinism** — compose only existing pure scorers; sorted inputs/outputs; a `version` hash over `{algorithm, weights, thresholds, engineModelVersion}` so re-runs are byte-identical; `computedAt` never enters the analytics payload.
- **Evidence-linkage** — every node/edge/cluster/delta carries `evidenceRunIds` + `explanationCodes` + per-dimension contributions.
- **Privacy** — everything keys off path/semantic signatures and categories, never raw user content.
- **Envelope** — every API returns `{ data, error, meta }`, `meta = { modelVersion, threshold, counts, computedAt, cacheHit }`.

### Phase plan (dependency order)

| Phase | Deliverable | Hard prerequisite |
|---|---|---|
| **Phase 0** | Calibration harness + threshold selection + AI-score reconciliation | none (analysis + harness only) |
| **T1** | Portfolio Time-Sink Ranking | Phase 0 AI-score verdict (for the automation column only) |
| **T2** | N-Way Visual Compare / Process Diff | none (on-demand, no clustering) |
| **T3** | Relationship Graph Service + Family Browser | **Phase 0 calibration gate PASS** + `WorkflowSimilarityEdge` table |
| **T4/T5** | Similarity Map UI + Variant Divergence Overlay | T3 edges (T4-1B); T4-1A scatter needs none |
| **T6** | Smart Insights narrative (deterministic templates) | T1–T5 |

---

## 1. The composite workflow-distance contract (spine primitive)

New pure module `packages/intelligence-engine/src/crossWorkflow/workflowSimilarity.ts`. **One versioned function** composes four existing pure kernels into a blended, explained similarity. This is the single distance authority for T3 edges, T4 clustering, and T1/T6 grouping.

### 1.1 Signature

```ts
export interface WorkflowSimilarityInput {
  workflowId: string;
  pathSignature: PathSignature;        // computePathSignature()  — pathSignature.ts
  stepFingerprints: StepFingerprint[]; // fingerprintWorkflowSteps() — stepFingerprinter.ts
  systems: string[];                   // sorted Set<string>
  avgDurationMs: number | null;
  evidenceRunIds: string[];            // union carried onto emitted edges
}

export interface WorkflowSimilarityBreakdown {
  structural:   { raw: number; weight: number; contribution: number }; // computeSignatureSimilarity
  sequence:     { raw: number; weight: number; contribution: number }; // sequenceFingerSimilarity
  systems:      { raw: number; weight: number; contribution: number }; // setOverlap (Jaccard)
  duration:     { raw: number; weight: number; contribution: number } | null; // durationBandSimilarity (optional)
}

export interface WorkflowSimilarityResult {
  score: number;        // [0,1]
  distance: number;     // 1 - score  (clustering / threshold-ladder framing)
  breakdown: WorkflowSimilarityBreakdown;
  explanationCodes: ExplanationCode[]; // dominant-term codes, deterministic
  version: string;      // hash({ algorithm:'wf-sim', weights, thresholds, engineModelVersion })
}

export function workflowSimilarity(
  a: WorkflowSimilarityInput,
  b: WorkflowSimilarityInput,
  config?: WorkflowSimilarityConfig,
): WorkflowSimilarityResult;
```

### 1.2 Composition (v1 weights)

```
score =
    0.45 · computeSignatureSimilarity(a.pathSignature, b.pathSignature)   // structural — pathSignature.ts:42
  + 0.25 · sequenceFingerSimilarity(a.stepFingerprints, b.stepFingerprints) // step-identity — stepFingerprinter.ts:436
  + 0.20 · setOverlap(a.systems, b.systems)                               // systems-Jaccard — scoringConfig.ts:383
  + 0.10 · durationBandSimilarity(a.avgDurationMs, b.avgDurationMs)       // optional — NET-NEW
```

- **`durationBandSimilarity` is the ONLY net-new pure function.** Log-band form so structurally-identical processes that differ only by data-volume scale are not over-penalized:
  `durationBandSimilarity(x,y) = x==null||y==null ? null : clamp01(1 − |ln(x) − ln(y)| / ln(MAX_RATIO))`, `MAX_RATIO = 8`.
- **Null-duration renormalization (deterministic):** when either `avgDurationMs` is null, drop the duration term and renormalize the remaining three weights to sum 1.0 → `structural 0.50 / sequence 0.278 / systems 0.222`. `breakdown.duration = null`, `explanationCodes` records `DURATION_UNAVAILABLE`. This keeps `score ∈ [0,1]` and keeps the score comparable across mixed populations.
- **Structural kernel selection is calibration-owned.** v1 uses `computeSignatureSimilarity` (order-sensitive bigram Jaccard + count ratio) per the program brief. `traceSimilarity` (`clustering/traceSimilarity.ts:89`, LCS-dominant with a hard floor) is a stricter drop-in alternative; Phase 0 chooses whichever yields the cleaner knee (§4). The chosen kernel id is folded into `version` so the choice is auditable and re-runs are byte-identical.
- **`explanationCodes`** = the ≥2 top-contributing terms mapped to existing `ExplanationCode` values (`STEP_SIGNATURE_MATCH`, `HIGH_STEP_OVERLAP`, `COMMON_STEP_PATTERN`, `SYSTEM_OVERLAP`), deterministic tie-break by fixed term order.

### 1.3 Guarantees
- **Determinism:** all four kernels are pure and side-effect-free; inputs are pre-sorted (systems sorted, fingerprints by ordinal); no `Date.now()`; `version` hash locks the formula. Golden fixtures + a version-lock test are the Phase-1 acceptance gate.
- **Evidence:** `evidenceRunIds` (union of both inputs) rides onto every emitted edge; `breakdown` gives per-term contribution for audit.
- **Effort/Risk: 2 / 2** (one net-new fn + composition; the kernels are already tested).

---

## 2. Data model — `WorkflowSimilarityEdge` (new table) vs extend `GroupRelationship`

**Decision: NEW additive table `WorkflowSimilarityEdge`.** Do NOT extend `GroupRelationship`.

Ground truth from `apps/web-app/prisma/schema.prisma:369` — `GroupRelationship` is polymorphic (`sourceType/targetType` already list `workflow`), but it **lacks every field this matrix needs**: no `weight`, no `dimensionScoresJson`, no `evidenceRunIds`, no canonical-ordered uniqueness (dup-edge guard), no `weight` index (for `minWeight` range reads), and it has `createdAt` only (no `computedAt` separated from write time). Its `confidenceScore`/`createdFromModelVersion` are close cousins but semantically overloaded if reused for a different grain.

Rationale for a separate table:
1. **Grain / cardinality.** `GroupRelationship` holds low-cardinality group↔group/family edges. Workflow-level similarity is an O(n²) matrix (thousands of rows per user). Mixing it in pollutes the shared table's indexes and query plans and couples two very different write cadences (group edges written by `clusterWorkflows`; workflow edges written incrementally on-ingest).
2. **Query shape.** The graph read path is `WHERE userId=? AND weight >= minWeight` — needs a composite `(userId, weight)` index the polymorphic table does not have and should not grow.
3. **Idempotency.** Incremental on-ingest upsert requires a canonical-ordered unique key `(userId, sourceWorkflowId, targetWorkflowId)` with `sourceWorkflowId < targetWorkflowId` enforced at write — a constraint that would change `GroupRelationship`'s write semantics for existing populated rows.
4. **Back-compat & risk.** A new table is purely additive; zero risk to the already-populated `GroupRelationship` path.

```prisma
model WorkflowSimilarityEdge {
  id                 String   @id @default(uuid())
  userId             String   @map("user_id")
  sourceWorkflowId   String   @map("source_workflow_id") // canonical: source < target (string cmp)
  targetWorkflowId   String   @map("target_workflow_id")
  weight             Float                                 // workflowSimilarity().score, [0,1]
  relationshipKind   String   @map("relationship_kind")   // same_family|likely_family|possible_match|subset_of|superset_of|shares_component
  explanationCode    String   @map("explanation_code")    // dominant ExplanationCode; full set in dimensionScoresJson
  dimensionScoresJson String? @map("dimension_scores_json") // WorkflowSimilarityBreakdown JSON
  evidenceRunIds     String?  @map("evidence_run_ids")    // JSON array
  scorerVersion      String   @map("scorer_version")      // workflowSimilarity().version
  computedAt         DateTime @map("computed_at")         // analytics timestamp, NOT createdAt
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, sourceWorkflowId, targetWorkflowId]) // canonical-ordered dup guard
  @@index([userId, weight])                              // minWeight range read
  @@index([sourceWorkflowId])
  @@index([targetWorkflowId])
  @@map("workflow_similarity_edge")
}
```

`relationshipKind` is an application-validated string set (matches the free-text convention already used in `GroupRelationship.relationshipType`; adds `subset_of`/`superset_of` derivable via `lcsAlignment()` containment per analytics §4). `scorerVersion` is distinct from `createdFromModelVersion` semantics and is the invalidation key for the rebuild job. **Nodes reuse existing `ProcessDefinition`/`ProcessFamily`/`Workflow` rows — no node table.**

---

## 3. Compute strategy

| Path | Strategy |
|---|---|
| **Edge scoring** | **Incremental on-ingest** — a new recording is scored against existing nodes in O(n) and its edges upserted (canonical-ordered) into `WorkflowSimilarityEdge`. Keep the existing synchronous `clusterWorkflows()` as fallback until the incremental path is proven. |
| **Full rebuild** | BullMQ job, triggered on `scorerVersion` bump (version-hash invalidation). Idempotent: deterministic scorer → same edges. |
| **Graph/cluster reads** | Cheap indexed query on the edge table; clusters derived at read time via union-find over edges ≥ τ (no separate cluster table until reads prove expensive). |
| **Compare (T2)** | On-demand, bounded N (cap ~6), no persistence. |
| **Caching** | Edges are the cache. `meta.cacheHit` reflects whether the read hit persisted edges vs triggered a recompute. `computedAt` reported in `meta`, never in `data`. |

### The calibration gate (guards T3 — confirm-not-auto-merge)
T3 family grouping MUST NOT ship in auto-merge mode. Two hard gates before family clusters are exposed:
1. **Calibration PASS** — the Phase-0 harness (§4) has selected a defensible threshold τ against production data and recorded the family-precision / no-false-merge result in `MEASUREMENT_PLAN_PROCESS_VARIATION.md`.
2. **Confirm-not-auto-merge** — the UI surfaces a *proposed* family with its edge explanations; a user (or admin) confirms before any `ProcessFamily` write is treated as canonical. Similarity edges may be computed and stored freely (they are evidence, not merges); only the **labeled-family** promotion is gated.

---

## 4. Phase 0 methodology — calibration harness

**Goal:** pick a defensible clustering threshold τ from the empirical pairwise-similarity distribution, deterministically, and re-run it against production before T3 ships. No product code — a script + artifact under `docs/features/cross-workflow-intelligence/calibration/`.

**Method:**
1. **Materialize** the pairwise similarity matrix over a representative real workflow set using `workflowSimilarity()` (§1). Emit the sorted `score` distribution + histogram (fixed bin width, deterministic).
2. **Threshold selection — knee + stable-plateau heuristic:**
   - Sort all pairwise scores descending; compute the cumulative edge-count vs threshold curve.
   - **Knee detection (deterministic):** Kneedle-style — find the threshold maximizing distance from the chord between the curve's endpoints; tie-break toward the higher (more conservative) threshold.
   - **Stable-plateau guard:** sweep τ in fixed 0.01 steps across [knee−0.05, knee+0.05]; require that cluster *count* is stable (±1) across ≥3 consecutive steps. If no plateau exists, the distribution is bimodal-unclear → escalate (do not ship auto-family). Prefer the conservative edge of the plateau — over-splitting is recoverable; a false merge is a trust violation.
3. **Validate against the ladder** (analytics §2): confirm the chosen τ places `same_family` conservatively (recommend distance ≤ 0.32 / score ≥ 0.68 band) and that `possible_match` (score 0.55–0.67) stays *surfaced-not-merged*.
4. **Precision check:** on a labeled hold-out of cross-group pairs, require **family precision ≥ 0.80** and **no-false-merge** at τ before gate PASS (mirrors the existing exact-group gate at a looser family bar).
5. **Re-run before T3:** the harness is re-executed against current production data at T3 entry; τ and the version hash are frozen into `scorerVersion`. Any `scorerVersion` bump re-opens the gate.

**Determinism:** identical inputs → identical histogram → identical knee → identical τ. The harness reports its own `version` hash.

---

## 5. Phase deliverables (T1–T6)

### T1 — Portfolio Time-Sink Ranking
- **Goal:** "Where does my org's time go / what to fix first?" — ranked bars aggregating already-trusted per-process bottleneck/timing across the whole library, with step-duration ranges.
- **Reused:** `bottleneckDetector.ts`, `timestudyAnalyzer.ts`, `varianceAnalyzer.ts`; per-workflow metrics already computed.
- **Net-new:** pure `aggregateTimestudy(nodeSet)` rollup over an arbitrary node-set (generalizes the single-process denominator honestly); read route.
- **API:** `GET /api/intelligence/timesink?scope=all|family:{id}` → `{ data:{ ranked:[{workflowId, totalTimeMs, runShare, topBottleneck:{position,category,rangeMs}, automationOpportunity, evidenceRunIds}], totals }, error, meta }`.
- **Determinism/evidence:** pure aggregation; each bar links `evidenceRunIds`; duration is a labeled proxy until per-run timing lands (honesty posture of `PortfolioTimestudyBand`). **The `automationOpportunity` column MUST use the group-grain score per `AI_SCORE_RECONCILIATION.md` — never the per-workflow tag score.**
- **Effort/Risk: 1 / 1** (zero clustering; fastest "dramatically better time-study" win).

### T2 — N-Way Visual Compare / Process Diff
- **Goal:** "Compare these 3; why is one slower?" — aligned swimlanes (code-diff style): matched/added/removed/reordered; block width ∝ mean duration; structural-vs-temporal lens toggle; per-step time deltas.
- **Reused:** `divergenceAnalyzer.analyzeDivergence` (already the N-way primitive — one backbone + N runs), `variantAnalyzer.computeVariantDistance`, `lcsAlignment`, `stepFingerprinter`.
- **Net-new:** one pure `compareWorkflows(workflowIds[2..N], backboneSource)` wrapper (per analytics §3 shape) that joins per-position timestudy by **LCS-aligned position** (not raw ordinal) + emits `stepTimeDeltas`, shared/unique step sets, bottleneck diff. Repoint per-variant timestudy/bottleneck to the `evidenceRunIds` subset.
- **API:** `POST /api/intelligence/compare { workflowIds[2..6], backboneSource }` → `{ data:{ relationship, backbone, perWorkflow[], divergence, bottleneckDiff, sharedSystems, sharedComponents }, error, meta }`. Supersedes `/api/analytics/compare` (keep as deprecated alias; fold `agent-intelligence` skills/systems/patterns under this envelope).
- **Determinism/evidence:** every field traces to an existing pure fn; every delta carries `evidenceRunIds`; bounded N.
- **Effort/Risk: 2 / 2**.

### T3 — Relationship Graph Service + Family Browser (GATED)
- **Goal:** "Which of my workflows are really the same process?" — weighted, explained edges; clusters = connected components; families = labeled clusters.
- **Reused:** `workflowSimilarity()` (§1), `familyScorer.scoreFamilyMembership`, `componentDetector`, union-find pattern from `clusterSignatures.ts`, `GroupRelationship`.
- **Net-new:** `crossWorkflowGraph.ts` orchestrator (upsert edges, derive clusters via union-find over edges ≥ τ); `WorkflowSimilarityEdge` migration (§2); incremental on-ingest scoring + rebuild job (§3); **calibration + confirm-not-auto-merge gate (§3/§4)**; add `subset_of`/`superset_of` via `lcsAlignment()` containment (analytics §4).
- **API:** `GET /api/intelligence/graph?scope=all|family:{id}|cluster:{id}&minWeight=` → `{ data:{ nodes[], edges[] }, error, meta }`.
- **Determinism/evidence:** edges are versioned + explained + evidence-linked; clusters reproducible (same edges → same union-find result). **Family promotion is human-confirmed, not auto.**
- **Effort/Risk: 3 / 3** (highest leverage; persistence + incremental plumbing + gate are the cost).

### T4 — Similarity Map UI  /  T5 — Variant Divergence Overlay
- **T4 goal:** "Show me everything like this." **1A: deterministic scatter today** (cycle time × sequence stability, bubble = runs, color = opportunity) — zero new math. **1B: dendrogram with drag-cut threshold** over T3 edges; browse families. **Force-directed rejected (non-deterministic).**
- **T5 goal:** "Where do runs diverge, and which path is costly?" — metro-map of one process's variants off the standard-path spine; line thickness = frequency, glow = bottleneck/variance heat.
- **Reused:** T4-1A → metrics present today; T4-1B → T3 edges; T5 → `VariantSet`, `BottleneckReport`, `analyzeDivergence`.
- **Net-new:** mostly rendering; the dendrogram cut is a deterministic re-threshold over persisted edges (no recompute).
- **Determinism/evidence:** deterministic layout (scatter coords + dendrogram order are pure functions of the data); every node drills to evidence.
- **Effort/Risk: T4 2 / 3 · T5 2 / 2**.

### T6 — Smart Insights narrative layer
- **Goal:** lower the analysis skill floor — templated deterministic sentences over T1–T5 ("these 4 are one process with 3 variants; variant B is 40% slower at step 5").
- **Reused:** all above; insight templates per analytics §5 (matching `computeInsightChips` copy style).
- **Net-new:** deterministic templating only. **LLM narrative deferred to the AI-Integration-Platform Vision track.**
- **Determinism/evidence:** templates fire on numeric triggers over evidence-linked primitives; every sentence carries its source `evidenceRunIds`. D-4 clause-1 growth-strategist copy review applies (≥3 user-visible strings).
- **Effort/Risk: 2 / 1**.

---

## 6. Measurement (extend, don't duplicate)
Extend `MEASUREMENT_PLAN_PROCESS_VARIATION.md` with: family-precision (≥0.80), subset/superset-precision (≥0.90), clustering reproducibility (100% stable re-runs), family-clustering determinism, time-study time-to-insight (p50 < 30s), and a **correct-merge / no-false-merge gate** for T3. T1/T2 measured by adoption + time-to-first-comparison.

## 7. Open items for coordinator/CEO
1. Node granularity for the graph — workflow-level (this spec) vs group-level first (cheaper, 80% wired). Recommend workflow-level edges, group-level as drill-in rollup.
2. Per-run timing dependency — ship proxy-honest (labeled) now, upgrade later (recommend yes).
3. Feature gating (Growth+/Team+) for graph/cluster/compare surfaces.
4. Consolidation of the second cross-workflow engine in `agent-intelligence` — converge at T2 or defer (recommend fold-in at T2 under one envelope).
