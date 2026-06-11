# Process Variation — Production Hardening: Architecture & Correctness Findings

**Reviewer:** system-architect (read-only review)
**Date:** 2026-06-11
**Scope:** variant cohort assembly → multi-run intelligence → deterministic branch-map render → evidence drill
**Verdict:** **NOT production-ready.** One P0 evidence-linkage correctness defect breaks the core "evidence-linked" moat; one P0 scaling defect makes variants-mode open unbounded O(n²). Determinism of the *rendered map structure* is sound; the contract drift and threshold calibration are real but lower severity.

Files reviewed (evidence cited inline as `file:line`):
- `apps/web-app/src/lib/intelligence.ts` — `analyzeWorkflowVariants`, `clusterWorkflows`, `analyzeWorkflow`
- `packages/intelligence-engine/src/clustering/{traceSimilarity,clusterSignatures}.ts`
- `packages/intelligence-engine/src/{variantDetector,variantAnalyzer,divergenceAnalyzer,pathSignature,types}.ts`
- `apps/web-app/src/lib/{variantStoryMap,reportDivergence}.ts`
- `apps/web-app/src/components/workflow-view/adapters/{variantAdapter,viewModel}.ts`
- corroborating: `packages/process-engine/src/{processRunBuilder,types}.ts`, `apps/web-app/prisma/schema.prisma`, `apps/web-app/src/app/(app)/analytics/process/[id]/page.tsx`, `apps/web-app/src/components/workflow-view/WorkflowVariantStoryMap.tsx`, `apps/web-app/src/app/api/workflows/[id]/{variants,analyze}/route.ts`

---

## 1. EVIDENCE-LINKAGE CORRECTNESS (P0 — CRITICAL)

### The id-space mismatch (the headline defect)

`ProcessVariant.evidenceRunIds` are **run ids, which are session ids — NOT workflow ids and NOT navigable record ids.**

Trace:
- `detectVariants` builds evidence from `b.processRun.runId`:
  `variantDetector.ts:40` (`allRunIds = bundles.map(b => b.processRun.runId)`) and `:101` (`evidenceRunIds: [...cluster.runIds].sort()` where `runIds` are `runId`s).
- `runId` is set to the session id, never the workflow id:
  `packages/process-engine/src/processRunBuilder.ts:28` → `runId: sessionJson.sessionId`.
- The DB stores that session id on `Workflow.sessionId` (nullable), while the navigable key is `Workflow.id` (a separate UUID):
  `prisma/schema.prisma:89` (`id String @id @default(uuid())`) vs `:100` (`sessionId String? @map("session_id")`).

So `evidenceRunIds ⊆ {Workflow.sessionId}` — a *different id space* from `{Workflow.id}`.

### Where this breaks, concretely

**(a) Analytics page evidence drill silently returns nothing.**
`apps/web-app/src/app/(app)/analytics/process/[id]/page.tsx:1410-1413`:
```js
const idSet = new Set(variant.evidenceRunIds);   // session ids
return workflows.filter((w) => idSet.has(w.id));  // workflow ids
```
This intersects two disjoint id spaces. It returns `[]` for real data (it only "works" in the demo seed, where `sessionId` was hand-authored and may coincidentally be reused — see `api/seed-demo-data/route.ts:57,120`). The "Matching workflows" list at `:1448-1452` will be empty in production. **The evidence drill is non-functional, not just opaque.**

**(b) Story-map evidence drill is opaque AND non-navigable.**
`WorkflowVariantStoryMap.tsx:205-206` renders the ids as raw monospace text joined by `·`:
```jsx
{selectedEdge.evidenceRunIds.join('  ·  ')}
```
No link, no title, no navigation. Even if the ids were correct, a user cannot "view the runs" — they see opaque UUID strings. This is the literal failure mode the moat depends on NOT having.

**(c) Double-indirection in the story map further degrades the ids.**
`variantStoryMap.ts:115-116` aggregates branch evidence by mapping branch `evidenceRunIds` (which are *variant ids* at this layer, because `analyzeDivergence` was given one `DivergenceRun` per variant with `id = variantId`) back through `evidenceByVariant` to the variant's real `evidenceRunIds` (session ids). Net result: the chip shows session ids that (i) aren't workflow ids and (ii) can't be clicked.

### Correct contract (what "view the runs" must mean)

The system already has the right join key — it just isn't used. Two viable contracts; **(A) preferred:**

**(A) Carry navigable workflow ids alongside run ids, end to end.**
- The bundle assembly in `analyzeWorkflowVariants` (`intelligence.ts:455`) already knows the mapping `runId (sessionId) ↔ workflow.id` (the `WorkflowWithArtifacts` rows carry both `id` and the `processRun.runId`). Build a `Map<runId, {workflowId, title}>` at request time and attach it to the API response as a sidecar `evidence: { [runId]: { workflowId, title } }`, OR enrich each variant with `evidenceWorkflowIds` in addition to `evidenceRunIds`.
- The UI then links each evidence entry to `/workflows/{workflowId}` (the existing route at `app/(app)/workflows/[id]/page.tsx`).
- Keep `evidenceRunIds` (session/run ids) for provenance/audit — they are the *true* run identity per the immutability invariant — but never use them as the UI navigation key.

**(B) Fix the join at the read sites only (cheaper, weaker).**
- Analytics page: filter on `w.sessionId` not `w.id` (`page.tsx:1412`). This requires `WorkflowRef` to carry `sessionId` (it currently carries only `id, title` — `page.tsx:38-40`) and requires `Workflow.sessionId` to be reliably non-null for every analyzable workflow (it is `String?` — `schema.prisma:100`).
- Story map: pass the same `runId → workflowId/title` map into the component and render links.

**Recommendation:** Adopt (A). It is contract-first, keeps run-level provenance intact (Ledgerium invariant: outputs traceable to source events/runs), and makes the evidence drill a real hyperlink. Schema note: no migration strictly required for (A) because the mapping is derivable at request time; but consider persisting `evidenceWorkflowIds` if the variant analysis is ever cached (see §5).

**Secondary correctness note — `affectedRunIds` is also mislabeled.** `generateInsights` persists `affectedRunIds: JSON.stringify(affectedWorkflowIds)` (`intelligence.ts:588`) — i.e. workflow ids stored under a "run ids" name. This is the *inverse* mismatch and will confuse any consumer that joins `affectedRunIds` against `runId`. Pick one id space per field name and document it.

---

## 2. DETERMINISM ACROSS THE ASSEMBLED PIPELINE

Conclusion: **the rendered map STRUCTURE is deterministic.** The non-determinism risks that exist are either (a) metadata-only and never reach geometry/identity, or (b) latent (only triggerable by data shapes that don't occur today). Ranked by production reality:

| Risk | Location | Reaches rendered map? | Verdict |
|---|---|---|---|
| `new Date().toISOString()` | `variantDetector.ts:39` (also `computedAt` fields) | **No.** Flows only into `VariantSet.computedAt` metadata. Story-map version hash is `STORY_MAP_VERSION#analysis.version` = `variant-story/1.0.0#lcs-backbone/1.0.0#min1` (`variantStoryMap.ts:195`) — pure, no timestamp. Node ids/positions are arithmetic (`:131-184`). | **Low / cosmetic.** Flag: it does break byte-identical serialization of the *stored* `intelligenceJson` blob across re-analysis, which weakens "re-runs are byte-identical" claims and any hash-based change detection. Recommend injecting a clock or stamping a fixed `computedAt` from an upstream request time. |
| Map iteration order | `divergenceAnalyzer.ts:206-238` (`agg` Map), `clusterSignatures.ts:127-140`, `variantStoryMap.ts:100-101` | **No.** Every Map's values are re-sorted before emit: divergence `branches.sort(...)` (`:240-246`); clusters `clusters.sort(...)` (`clusterSignatures.ts:140`); story-map `ranked.sort(...)` (`variantStoryMap.ts:119-125`). Insertion order is also stabilized by pre-sorting inputs by id (`divergenceAnalyzer.ts:205`, `clusterSignatures.ts:87`). | **Safe.** Determinism is correctly engineered here. |
| Float rounding | `round3` (`traceSimilarity.ts:43`, `divergenceAnalyzer.ts:67`), `Math.round(...*1000)/1000` (`variantAnalyzer.ts:124,224`) | Frequencies/shares reach labels and stroke weights. | **Safe-but-watch.** Threshold comparisons (`>= threshold`) happen on the *rounded* blended score (`traceSimilarity.ts:102` rounds, `clusterSignatures.ts:120` compares). A pair at exactly the boundary (e.g. blended 0.5995 → rounds to 0.6 ≥ 0.6) merges. Deterministic, but means the effective threshold is "rounded-to-3dp ≥ t". Document this; do not compare un-rounded elsewhere or you get inconsistency. |
| Clustering threshold default (0.6) vs report/variant thresholds | `clusterSignatures.ts:28` (0.6) vs `types.ts:37` `VARIANT_SIMILARITY_THRESHOLD` (0.75) | Yes — see §3/§4. | **Real, but a calibration/contract issue, not a non-determinism issue.** Both are fixed constants, so output is reproducible; they are simply *uncoordinated*. |
| `analyzeDivergence` DFG delimiter coupling | `divergenceAnalyzer.ts:143` (`` `${steps[k]} ${steps[k+1]}` ``) + `:151-153` split on first space | Affects `dfgConfirmedSplit/Join` flags shown on branches. | **Latent / not real today.** Categories are underscore-keyed `GroupingReason` values (`segmentation-engine/src/types.ts:54-58`) with no spaces, so the space delimiter is unambiguous for current data. **But** `analyzeDivergence`/`divergentStepIndices` are typed `readonly string[]` — a future category, a humanized label, or any caller passing space-containing tokens silently corrupts edge keys (`"a b" + "c"` collides with `"a" + "b c"`). Use a delimiter that cannot appear in the vocabulary (e.g. ` `) or pass `[from,to]` tuples. Same class of coupling: report/story-map split signatures on `:` (`reportDivergence.ts:45,50`; the engine joins on `:` in `pathSignature.ts:26`) — safe only while categories never contain `:`. |

**Net:** No P0 determinism defect reaches the branch geometry. The `new Date()` is the only one worth fixing for "byte-identical re-run" guarantees (it pollutes the persisted blob), and the DFG/`:` delimiter coupling should be hardened before any non-`GroupingReason` token can flow through.

---

## 3. CONTRACT CORRECTNESS

### `analyzeWorkflowVariants` vs `/analyze` (single-run) now disagree on "this workflow's runs"

They are **two different contracts and that disagreement is currently undocumented and surfaced through near-identical API shapes** — a trap.

- `/analyze` → `analyzeWorkflow` analyzes **exactly one workflow's single run** (`intelligence.ts:409-417`, `getWorkflowsWithOutputs(userId, [workflowId])`). "Runs" = the one run.
- `/variants` → `analyzeWorkflowVariants` analyzes the **similarity cohort** assembled at request time: loads ALL workflows, clusters by `clusterSignatures`, takes the cluster containing the target (`intelligence.ts:437-455`). "Runs" = every workflow whose path is ≥0.6-similar to the target.

Both return a `PortfolioIntelligence` and both are wrapped identically as `{ intelligence }` (`variants/route.ts:54`, `analyze/route.ts:54`). A consumer cannot tell from the payload which cohort definition produced it. The standard path, variant frequencies, and `runCount` therefore mean different things between the two endpoints for the same workflow id.

**Is this intended?** The intent (single-run honest view vs multi-run variant map) is reasonable, but the **contract is leaky**: identical response envelope, no cohort descriptor. Recommend: add a `cohort: { kind: 'single' | 'similarity-cluster', memberWorkflowIds: string[], threshold: number, version: string }` block to the variants response so the map can state "assembled from N similar recordings" and the evidence is auditable. This also directly enables §1(A).

### `clusterWorkflows` (persisted) vs `analyzeWorkflowVariants` (read-only) disagree on grouping too

`clusterWorkflows` groups via `groupWorkflowsForClustering` (exact-signature by default; similarity only behind `LEDGERIUM_SIMILARITY_CLUSTERING`, per `intelligence.ts:123-138`). `analyzeWorkflowVariants` **always** uses `clusterSignatures` similarity at threshold 0.6 (`intelligence.ts:442`). So with the flag OFF (production default), the **persisted** `ProcessDefinition` cohort and the **read-time** variants-map cohort can differ for the same workflow. The variants map can show variants that the persisted analytics view (driven by `ProcessDefinition.intelligenceJson`) does not — a user-visible inconsistency between two screens of the same product. This needs an explicit product decision (align both on one grouping, or label them as different lenses).

### `reportDivergence` conformingPct double-count — RE-VERIFIED: confirmed, but in the branch shares, not conformingPct itself

- `conformingPct` itself does **not** double-count: `divergingIds` is a `Set` (`reportDivergence.ts:58-59`), and conforming variants are `withSig.filter(v => !divergingIds.has(v.variantId))` (`:60-62`). A variant is conforming-or-not exactly once.
- **The real double-count is branch `runShare` vs `conformingPct`.** When a single variant produces **two or more branches** (it diverges in two places), its `runCount` is summed into the `weighted` total of *each* branch (`reportDivergence.ts:65`, `variantStoryMap.ts:115,149`). So `conformingPct + Σ branch.runShare` can exceed 1.0. The same applies to the story map's per-lane `runShare`. This is mathematically a multi-branch over-attribution: branch shares are "share of runs that took *this branch*", not a partition. If the UI presents them as if they sum to 100% with conforming, the numbers won't add up.
- **Fix:** either (a) document branch shares as non-partitioning ("of all runs, X% include this branch"), or (b) attribute each diverging run to a single primary branch for a true partition. Decide which the UX promises.

**Additional contract smell — `runCount`/`totalRuns` granularity.** In both `reportDivergence` and `variantStoryMap` the `DivergenceRun`s passed to `analyzeDivergence` are **variants, not runs** (`reportDivergence.ts:48-51` ids = `variantId`; `variantStoryMap.ts:97` ids = variant `v.id`). `analyzeDivergence` therefore computes `conformingRunCount` / `frequency` over *variant count*, then the adapters re-weight by `runCount` afterward (`reportDivergence.ts:56,65`; `variantStoryMap.ts:100,115`). This re-weighting is correct, but `DivergenceBranch.frequency`/`conformingFrequency` returned by the engine (`divergenceAnalyzer.ts:233,252`) are **per-variant, not per-run** — any consumer that reads them directly (not via the adapters) gets variant-fraction, not run-fraction. The engine's field names (`runCount`, `conformingRunCount`) actively mislead here.

---

## 4. THRESHOLD CALIBRATION

Two uncoordinated thresholds **with two different similarity functions** govern the pipeline:

1. **Cohort assembly:** `clusterSignatures` threshold **0.6** (`clusterSignatures.ts:28`), similarity = `traceSimilarity` = `0.6·LCS + 0.4·cat` with an LCS hard floor 0.3 (`traceSimilarity.ts:34,41`).
2. **Variant grouping inside the cohort:** `detectVariants` threshold **0.75** (`types.ts:37`), similarity = `computeSignatureSimilarity` = `0.7·bigramJaccard + 0.3·countRatio` (`pathSignature.ts:42-52`) — a **different metric**.

Consequences:
- A pair can be cohort-mates (blended ≥0.6) yet land in different variants (bigram <0.75). That is *intended* (that's what makes branches), but the two knobs are tuned independently and on different scales, so "what counts as the same process" (0.6, LCS-led) and "what counts as the same variant" (0.75, bigram-led) cannot be reasoned about together. A reviewer cannot predict merge behavior from one number.
- **Over-merge risk at 0.6 with the LCS-led blend:** LCS similarity is generous to length-matched sequences with scattered substitutions. Two genuinely different 6-step processes that share 4 categories in order score ~`1 - 2/6 = 0.67` on LCS alone → blended ≥0.6 even with modest category overlap → **false cohort merge**, which then pollutes the standard-path and inflates variant counts. The `LCS_HARD_FLOOR = 0.3` guard only prevents the *most* extreme false merges (`traceSimilarity.ts:100-102`); it does nothing in the 0.3–0.6 danger band.
- **Under-merge risk:** short sequences (1–2 steps) get bigram start-anchored representations (`pathSignature.ts:85`) and LCS over tiny `maxLen` is brittle (one edit on a 2-step run = 0.5 LCS) → singletons that should merge.

**Production-safe default + calibration:**
- The clustering module's own doc admits 0.6 is a placeholder: *"CONSERVATIVE default … calibrated via the labeled hold-out in MEASUREMENT_PLAN_PROCESS_VARIATION before clustering is wired into live grouping"* (`clusterSignatures.ts:24-28`). **That calibration is a hard prerequisite to production** and does not appear to have been run for the *read-only* `analyzeWorkflowVariants` path — which IS live (`/variants` route ships behind the Team+ gate). The "unwired, behind a flag" safety argument (`clusterSignatures.ts:13-15`) is **false for the variants map**: `analyzeWorkflowVariants` wires `clusterSignatures` into a live, user-facing read path with no flag (`intelligence.ts:442`).
- Make the threshold **configurable** (it already is via `ClusterOptions.threshold` — `clusterSignatures.ts:38,82`) and **plumb it through `analyzeWorkflowVariants`** (currently hard-defaulted). Surface the chosen threshold + `version` hash (`clusterSignatures.ts:84`) in the API cohort descriptor (§3) so every map states which calibration produced it (evidence/operability requirement).
- Recommended interim default pending hold-out: keep 0.6 only if a precision-leaning hold-out confirms it; otherwise raise to ~0.7 to reduce false cohort merges, since a false merge corrupts the standard path for *every* variant shown. Bias toward precision: an over-split map (too many singletons) is honest; an over-merged map fabricates a shared process that doesn't exist — a direct evidence-integrity violation.

**Persisted `clusterWorkflows` key-churn risk (flag-OFF) vs read-only path:** the read-only `analyzeWorkflowVariants` correctly carries **none** of the `ProcessDefinition.pathSignature` upsert/key-churn risk (it writes nothing — `intelligence.ts:421-459`, confirmed: no `db.*.update/create`). The churn risk is confined to `clusterWorkflows`'s `pathSignature`-keyed upsert (`intelligence.ts:329-371`): if similarity clustering is ever turned ON, the group `signature` key can change between runs as members shift, repeatedly orphaning/recreating `ProcessDefinition` rows and breaking `processDefinitionId` FKs on workflows. That is correctly fenced behind the flag today, but it must be solved (stable definition id independent of signature) before the flag flips — otherwise enabling similarity grouping churns analytics history.

---

## 5. SCALING (P0)

`analyzeWorkflowVariants` is **O(n²) over the user's entire active workflow set on every variants-mode open**, with full artifact deserialization:

- `getWorkflowsWithOutputs(userId)` loads **all** active workflows and `JSON.parse`s every `process_output` artifact (`intelligence.ts:437`, `:98-118`). No `take`, no pagination, no filter to the target's plausible cohort.
- `computePathSignature` is computed for **every** workflow (`intelligence.ts:445-449`).
- `clusterSignatures` is pairwise O(n²) `traceSimilarity` (`clusterSignatures.ts:116-124`), each call running two DP/edit-distance passes (`traceSimilarity.ts:51-83`). Cost ≈ `O(n² · L²)` where L = step count.
- Then `analyzePortfolio` runs over the cohort bundles.

Production impact: a user with 500 recordings averaging 20 steps triggers ~125k `traceSimilarity` calls × ~400 cell DP each = ~50M ops, plus 500 JSON parses of full process outputs, **per click into variants mode**, synchronously inside an API request. At a few thousand workflows this is multi-second-to-timeout and re-paid on every open (no caching). This will not hold at production scale and is the second ship-blocker.

**Fix (contract-first, in priority order):**
1. **Precompute + persist the cohort.** The cohort for a workflow is exactly what `clusterWorkflows` already computes and persists as `ProcessDefinition` + `Workflow.processDefinitionId` (`intelligence.ts:373-378`). Drive the variants map from the **persisted** definition's member set instead of re-clustering at read time. This also resolves the §3 "two screens disagree" problem. The cost moves to ingest (once) instead of every open.
2. **If read-time clustering must remain,** bound the candidate set before O(n²): pre-filter by `pathSignature` prefix / step-count band / shared-system bucket so you cluster only plausible cohort-mates, not the whole portfolio. (The module already flags MinHash/LSH candidate generation as the intended scaling path — `clusterSignatures.ts:11`.)
3. **Cache** the assembled cohort + `PortfolioIntelligence` keyed by `(userId, definitionId, clusterVersion)` with invalidation on new ingest. `clusterSignatures.version` (`clusterSignatures.ts:84`) is the natural cache key component.
4. **Project the DB read:** don't `JSON.parse` full `process_output` for cohort *selection*. Persist the `pathSignature` (categories only) on the workflow row (or a lightweight column) so cohort assembly never deserializes full artifacts; hydrate full bundles only for the final cohort.

Schema decision flagged: options (1) and (4) want a stored `pathSignature` (and ideally `evidenceWorkflowIds`/stable definition membership) on the workflow or definition. `Workflow.variantId` / `variantFingerprint` columns already exist additively (`schema.prisma:113-114`) and are the intended home — they are described as filled "at ingest" by PATHE-P08 but appear unused by this read path. Wire them.

---

## 6. PRIORITIZED REMEDIATION PLAN (contract-first)

### P0 — ship blockers

**P0-1 Evidence-linkage id space (correctness + moat).** §1.
- Contract: variants API returns a cohort/evidence descriptor mapping each `runId` → `{ workflowId, title }` (derivable at request time in `analyzeWorkflowVariants`, `intelligence.ts:455`).
- Fix read sites: `analytics/.../page.tsx:1412` join on the navigable workflow id from the descriptor (not `evidenceRunIds` vs `w.id`); `WorkflowVariantStoryMap.tsx:205-206` render each evidence id as a link to `/workflows/{workflowId}` with the title.
- Rename/clarify `affectedRunIds` (`intelligence.ts:588`) — it stores workflow ids.
- Schema decision: none required for request-time mapping; persist `evidenceWorkflowIds` only if variant analysis is cached (P0-2).

**P0-2 Scaling of `analyzeWorkflowVariants` (O(n²) over all workflows per open).** §5.
- Contract: variants map consumes a precomputed/persisted cohort (the `ProcessDefinition` member set) rather than re-clustering the full portfolio at read time; full-artifact deserialization removed from cohort selection.
- Evidence: `intelligence.ts:437,442,445-449`; `clusterSignatures.ts:116-124`.
- Schema decision: **yes** — persist `pathSignature` (and stable cohort membership) on the workflow/definition; reuse `Workflow.variantId/variantFingerprint` (`schema.prisma:113-114`).

### P1 — correctness/contract integrity before broad rollout

**P1-1 Threshold calibration + plumbing.** §4. Run the labeled hold-out the module's own docstring requires (`clusterSignatures.ts:24-28`); plumb `threshold`/`weights` through `analyzeWorkflowVariants`; surface threshold + `version` in the cohort descriptor. Default biased to precision (≥0.7 unless hold-out justifies 0.6).

**P1-2 Contract descriptor on `/variants`.** §3. Add `cohort: { kind, memberWorkflowIds, threshold, version }` so single-run vs similarity-cohort intelligence is self-describing and auditable; resolves the leaky-envelope trap between `/analyze` and `/variants`.

**P1-3 Branch-share double-count semantics.** §3. Decide and document whether branch `runShare`s partition the run population; if they must sum with `conformingPct` to ≤1.0, attribute each diverging run to one primary branch. Fix at `reportDivergence.ts:65` / `variantStoryMap.ts:115,149`.

**P1-4 Persisted vs read-time cohort divergence.** §3. Align the variants map and the persisted analytics view on one grouping definition (falls out of P0-2), or explicitly label them as different lenses.

### P2 — hardening / latent

**P2-1 `new Date()` in `variantDetector.ts:39`.** Inject clock / stamp a request-time `computedAt` so persisted `intelligenceJson` is byte-identical across re-analysis (supports hash-based change detection). Not a render-map defect.

**P2-2 Delimiter coupling.** `divergenceAnalyzer.ts:143,151-153` (space) and the `:` signature split (`reportDivergence.ts:45,50`, `pathSignature.ts:26`). Use a vocabulary-safe delimiter or tuple keys before any non-`GroupingReason` token can flow through these paths.

**P2-3 Misleading engine field names.** `DivergenceBranch.frequency` / `conformingRunCount` are per-**variant** when fed variants (`divergenceAnalyzer.ts:233,252`; callers `reportDivergence.ts:48`, `variantStoryMap.ts:97`). Rename to `…PerInputUnit` or have callers never read them directly.

**P2-4 `clusterWorkflows` signature-key churn.** §4. Before the `LEDGERIUM_SIMILARITY_CLUSTERING` flag is enabled, give `ProcessDefinition` a stable identity independent of the mutable `pathSignature` key (`intelligence.ts:329-371`) to avoid orphan/recreate churn and FK breakage.

---

### Bottom line
The branch-map's **geometry is deterministic and well-engineered**; the failure is at the **edges**: the evidence ids are the wrong id space and aren't navigable (P0-1), and the cohort is rebuilt O(n²) over the whole portfolio on every open (P0-2). Both are contract-level fixes — carry navigable workflow ids through the pipeline, and drive the map from a precomputed cohort — and both must land before this ships as an "evidence-linked" production feature.
