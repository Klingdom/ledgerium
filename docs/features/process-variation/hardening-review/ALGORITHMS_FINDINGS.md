# PROCESS-MINING ALGORITHMS — Production-Readiness Findings

**Artifact type:** Read-only correctness audit (algorithms layer)
**Scope:** clustering + variation + map math/logic
**Date:** 2026-06-11
**Auditor role:** process-mining algorithms auditor
**Mode:** READ-ONLY on product code. No product code modified. Findings only.
**Hard invariant under test:** deterministic, reproducible, evidence-linked.

## Files audited (line-by-line)

- `packages/intelligence-engine/src/clustering/traceSimilarity.ts`
- `packages/intelligence-engine/src/clustering/clusterSignatures.ts`
- `packages/intelligence-engine/src/divergenceAnalyzer.ts`
- `packages/intelligence-engine/src/variantDetector.ts`
- `packages/intelligence-engine/src/pathSignature.ts`
- `apps/web-app/src/lib/variantStoryMap.ts`
- `apps/web-app/src/lib/reportDivergence.ts`

## Validation performed

- Read every file line by line.
- `pnpm --filter @ledgerium/intelligence-engine test` → **178/178 pass** (existing tests are green; they do not cover the edge cases below — that is itself a finding).
- Reimplemented the core math (edit distance, LCS similarity, bigram-Jaccard, blend, LCS alignment, branch extraction, run-weighting) and ran worked numeric examples to confirm every quantitative claim in this report. Numbers below are reproduced from those runs.

---

## 0. Executive summary

The algorithms are **deterministic in the parts that matter for the version hash and the clustering result**, and the evidence-linking (evidenceRunIds) is sound. But there are **real correctness defects** that will produce wrong or misleading output in production:

1. **P0 — Blend threshold 0.6 is length-dependent and mis-calibrated.** A single mid-sequence insertion on a 3-step path scores exactly **0.61 → merges**, but a single substitution on a 3-step path scores **0.52 → does NOT merge**. Same "one human-variation edit," opposite merge decision, purely because of path length and edit type. 0.6 is an un-validated guess (the code comments and measurement plan both say so).
2. **P0 — `new Date()` determinism leak** in `variantDetector.ts:39` writes a wall-clock timestamp into the `VariantSet` output, violating the byte-identical-reproducibility invariant for the full output object.
3. **P0 — Run-weighting double-count for multi-branch variants** in `variantStoryMap.ts` and `reportDivergence.ts`: a variant that diverges from the backbone twice has its `runCount` added to **both** branch weights, so `conformingPct + Σ branch shares` exceeds 1.0. (The previously-flagged "conformingPct double-count" — the `conformingPct` scalar itself is now correct; the live double-count is in branch weighting.)
4. **P1 — Single-link transitivity chaining** can merge dissimilar endpoints A and C through an intermediate B (A~B≥0.6, B~C≥0.6, A~C<0.6) — the classic single-link failure mode, with no diameter guard.
5. **P1 — Decision-point honesty bug** in `variantStoryMap.ts`: `isDecision` is documented as "out-degree > 1" but is set from mere branch existence, never consulting the DFG. A single off-path run flags a "decision point."
6. **P1 — DFG split/join confirmation fires on incidental edges** because `minEdgeCount` defaults to 1 — one rare run is enough to "confirm" a split.
7. **P1 — DFG edge-key space-delimiter coupling**: edge keys are `` `${from} ${to}` `` split on the FIRST space, so any category containing a space corrupts the directly-follows graph.
8. **P1 — No min-runs honesty gate anywhere.** Variants/branches built from N=1 or N=2 runs are shown with the same confidence as N=100. The measurement plan calls for this; the code has none.

Determinism of the **version hash** and the **cluster membership result** is otherwise correct (sorted inputs, lexical-root union-find, fixed LCS tie-break, FNV-1a config hash).

---

## 1. CORRECTNESS bugs / edge cases (severity-tagged, file:line)

### 1.1 [P0] Blend threshold 0.6 is length- and edit-type-dependent — inconsistent merge decisions
**`clusterSignatures.ts:28` (`DEFAULT_CLUSTER_THRESHOLD = 0.6`) + `traceSimilarity.ts:34,98`**

Worked examples (reproduced numerically, weights lcs=0.6/cat=0.4, floor 0.3):

| Case | simLCS | simCat | blended `traceSimilarity` | Merges at 0.6? |
|---|---|---|---|---|
| 1 insertion, 3→4 steps (`click,fill,submit` → `+validate`) | 0.750 | 0.400 | **0.610** | **YES** |
| 1 substitution, 3 steps (`fill`→`review`) | 0.667 | 0.300 | **0.520** | NO |
| 1 insertion, 5→6 steps | 0.833 | 0.600 | 0.740 | YES |
| 1 insertion, 7→8 steps | 0.875 | 0.700 | 0.805 | YES |

**The defect:** the merge decision for "one human-variation edit" depends on (a) the path length and (b) whether the edit is an insertion vs a substitution — not on whether the two recordings are the same process. A 3-step process with one differing step does NOT merge; a 3-step process with one *extra* step DOES merge (barely, at 0.610). This is an **incoherent decision boundary**: substitution (arguably a *smaller* semantic change — same length, one different action) is treated as *less* similar than insertion. Root cause: `simCat` = bigram-Jaccard collapses hard for short sequences (3 steps → only 2 bigrams; one changed bigram halves the score), and the blend gives `simCat` 40% weight.

**Why it ships wrong:** at 0.6, short genuine variants get shattered into singletons (inflating the singleton rate the measurement plan §3.2 caps at ≤40%/≤25%), while equally-divergent insertions get merged — non-monotonic, hard to explain to a user, and it poisons the "same process?" answer the feature exists to give.

The code itself flags this — `clusterSignatures.ts:25-27`: *"CONSERVATIVE default ... calibrated via the labeled hold-out ... before clustering is wired into live grouping."* **It must not be wired live until §1.1 calibration (per §3 below) is done.**

### 1.2 [P0] `new Date()` determinism leak reaches output
**`variantDetector.ts:39` `const now = new Date().toISOString();` → written to `VariantSet.computedAt` (lines 47, 107)**

`detectVariants` is documented (lines 20-25) as "given identical inputs, outputs are identical." That is false: `computedAt` is wall-clock and changes every call. Verified: `computedAt` is a top-level field of the returned `VariantSet`.

- **Does it corrupt the variant version hash?** No — `variant-hash.ts` uses a caller-supplied `computedAtMs` (DEP-08 closure, separate path), so the pinned hash stays stable. Severity is therefore *not* "wrong cluster identity."
- **But it does** break byte-identical reproducibility of the `VariantSet` object: any deep-equality test, snapshot, content-addressed cache key, or "did the variant set actually change?" diff over the full object will report spurious change on every recompute. That violates the stated hard invariant ("deterministic, reproducible") and the measurement plan §3.3 Cluster Stability check ("100% stable — any instability is a P0 correctness bug").

**Corrected logic:** `computedAt` must be an injected parameter (`options.computedAt` / `options.nowMs`), exactly like the iter-037 `referenceNowMs` single-upstream-clock-boundary pattern already used elsewhere in this codebase and like `migrate-process-graph.ts`'s `computedAtMs`. The pure engine must never call `new Date()`.

### 1.3 [P0] Run-weighting double-counts multi-branch variants — the real "conformingPct double-count"
**`variantStoryMap.ts:115,149` and `reportDivergence.ts:65` (branch weight) vs `reportDivergence.ts:60-62,78` / `variantStoryMap.ts:107-109` (conforming)**

First, the re-verification asked for: **the `conformingPct` SCALAR is now correct.** `reportDivergence.ts:58-62` builds `divergingIds` as a `Set` of variant ids that appear in *any* branch's `evidenceRunIds`, then sums `runCount` of variants NOT in that set, over `denom`. Each diverging variant is counted once (Set dedup). Tests `conformingPct ≈ 0.7` and `≈ 0.8` are correct. **No double-count in `conformingPct` itself.**

The live double-count is in **branch run-weighting**. A single variant whose path leaves and rejoins the backbone **more than once** produces multiple `RawBranch` records, each carrying that variant's id in `evidenceRunIds`. Branch weight at `reportDivergence.ts:65` (`b.evidenceRunIds.reduce(... runCount ...)`) and at `variantStoryMap.ts:115,149` then adds the variant's `runCount` into **every** one of its branches.

Verified worked example — backbone `[a,b,c,d,e]`, variant `multi = [a,X,b,c,Y,d,e]` (runCount 4), standard runCount 6, totalRuns 10:
- `branchesForRun` returns **2 branches** for `multi` (insert X after a; insert Y after c) — confirmed by direct execution of the real `branchesForRun` logic.
- Branch 1 weight = 4 → runShare 0.40. Branch 2 weight = 4 → runShare 0.40.
- conformingPct = 6/10 = 0.60 (correct).
- **conformingPct + Σ branch shares = 0.60 + 0.80 = 1.40 > 1.0.** `multi`'s 4 runs are counted in *both* branch totals.

**Consequences:** branch percentages sum to more than the diverging population; a "this branch happened in 40% of runs" label is wrong when the same runs also power another branch; stroke-weights in the story map over-emphasize multi-branch variants; "X% conform / Y% take branch Z" can exceed 100%.

**Corrected logic (choose one, document it):**
- *Option A (per-run-occurrence semantics, recommended):* keep per-branch weights but STOP implying they partition the population. Report each branch share as "share of runs that include this deviation" (occurrences, can overlap), and never present `conforming + Σbranch` as a partition. Add an explicit `divergingRunShare = 1 - conformingPct` for the honest partition figure.
- *Option B (partition semantics):* attribute each diverging run to exactly one bucket (e.g., its *most significant* / first branch) so weights are disjoint and `conforming + Σbranch = 1` exactly. This loses multi-branch detail.
- Pseudocode for the honest invariant to assert in tests:
  ```
  assert conformingRunCount + |{ runs that appear in >=1 branch }| == totalRuns   // exact partition
  // and present Σ branchShare separately, labeled "occurrence share (overlapping)"
  ```

### 1.4 [P1] Single-link transitivity chaining (dissimilar A,C merged via B)
**`clusterSignatures.ts:107-124` (single-link union-find, no diameter guard)**

Single-link / connected-components merges any pair ≥ threshold, so a chain A~B≥0.6, B~C≥0.6 merges {A,B,C} even when A~C < 0.6. This is the textbook single-link "staircase" failure. The module comment (`clusterSignatures.ts:3-8`) acknowledges single-link but not the chaining risk.

Verified: a 10-step base path with accumulating insertions —
`base~ins3 = 0.726` (3 insertions apart still ≥ 0.6) and `base~ins5 = 0.629` (5 insertions apart still ≥ 0.6). With a denser drift sequence each adjacent link can sit ≥ 0.6 while the endpoints fall below 0.6, and single-link will still place them in one cluster. In a real workflow library this manifests as one mega-cluster absorbing genuinely different processes — exactly the "engine silently mis-groups" worst case the measurement plan §1 names as "worse than no clustering."

**Recommended guards (pick per calibration):** (a) a diameter / complete-link sanity check — reject a union if it would create a pair below a *floor* threshold (e.g., min intra-cluster similarity ≥ 0.45); or (b) average-link instead of single-link; or (c) cap cluster diameter and split. At minimum, **emit the min pairwise intra-cluster similarity per cluster** (already required as the measurement-plan §3.1 amber/red signal at 0.75/0.65) so chaining is observable in production.

### 1.5 [P1] Decision-point honesty bug — `isDecision` ignores out-degree
**`variantStoryMap.ts:35-36` (doc) vs `variantStoryMap.ts:152-154` (impl)**

The `StoryNode.isDecision` field is documented "Backbone node where at least one branch leaves (out-degree > 1)" — i.e., a genuine DFG decision point. The implementation sets it from *branch existence only*:
```
if (b.divergeAfterIndex >= 0) { const dNode = ...; if (dNode) dNode.isDecision = true; }
```
It never reads `analysis.branches[*].dfgConfirmedSplit` or any out-degree. So a backbone node is marked a "decision point" if even a single run forks off it — including a one-off exception. This over-claims decision structure and contradicts the audit-honesty posture (the DFG cross-check exists in `divergenceAnalyzer.ts` precisely to confirm splits, but the map ignores it).

**Corrected logic:** gate `isDecision` on `dfgConfirmedSplit === true` (out-degree > 1 *after* the `minEdgeCount` filter from §1.7), not on branch presence. Pseudocode:
```
if (b.divergeAfterIndex >= 0 && b.dfgConfirmedSplit) markDecision(b.divergeAfterIndex);
```

### 1.6 [P1] DFG split/join confirmation fires on incidental edges (`minEdgeCount` default 1)
**`divergenceAnalyzer.ts:61-62,187` (default `minEdgeCount = 1`) + `:235-236` (`outDeg > 1`, `inDeg > 1`)**

`dfgConfirmedSplit` = "the diverge category has out-degree > 1 in the directly-follows graph." With `minEdgeCount = 1`, a single run that produces one alternative successor edge is enough to push out-degree to 2 → "confirmed split." So the DFG cross-check — sold as the rigor that separates real splits from incidental ones — confirms on a single incidental observation. The split/join "confirmation" is therefore not meaningfully stronger than branch existence at the default.

**Corrected logic:** the honest split-vs-incidental distinction requires a frequency floor. Default `minEdgeCount` to ≥ 2 (or, better, a *fraction* of totalRuns, e.g. `max(2, ceil(0.05 * totalRuns))`) so a confirmed split means "≥2 runs (or ≥5%) actually took each successor." Document that `dfgConfirmedSplit` means "supported by ≥ minEdgeCount runs on each arm," and surface the floor in the version hash (it already is: `version = lcs-backbone/1.0.0#min${minEdgeCount}` at `:189` — good, keep that).

### 1.7 [P1] DFG edge-key space-delimiter coupling corrupts the graph on spaced categories
**`divergenceAnalyzer.ts:143` (`key = `${run.steps[k]} ${run.steps[k+1]}``) + `:151-153` (split on FIRST space)**

Edges are encoded as `"<from> <to>"` and decoded with `indexOf(' ')` (first space). Verified: `key("a b","c") === "a b c" === key("a","b c")`, and decode of `"a b c"` yields `from="a", to="b c"`. So:
- Two *different* edges collide into one key when a category contains a space (`"a b"→"c"` and `"a"→"b c"` are merged), inflating edge counts and fabricating/erasing successors.
- Any category with a space is split at the wrong boundary on decode, mis-attributing in/out degree to a phantom category.

Step categories today are vocabulary-controlled GroupingReason values (no spaces), so this is **latent, not currently firing** — but it is a correctness landmine: the moment any spaced label flows in (config change, new category, or if this is ever pointed at titles), the DFG silently corrupts and the determinism is still "stable" while being wrong. **Use a delimiter that cannot occur in the category space** (e.g. `" "` / `'␟'`) or encode as a tuple key `JSON.stringify([from,to])` / a `Map<from, Map<to,count>>` nested structure. Same latent risk applies to `:216` and `reportDivergence.ts:67` branch keys joined with `>` and `|` if categories could ever contain those chars (lower risk, but worth the same fix).

### 1.8 [P1] LCS tie-break — deterministic, but semantically arbitrary on repeated categories
**`divergenceAnalyzer.ts:100` (`dp[i-1][j] >= dp[i][j-1]` → prefer up-move) + `:170` (`divergentStepIndices` reuses same alignment)**

Good news on determinism: the tie-break is fixed (`>=` prefers `i--`), so alignment is reproducible run-to-run — confirmed (`run[a,X,a]` vs `bb[a,a]` → anchors `[[0,0],[2,1]]` every time). `editDistance` in `traceSimilarity.ts` returns only the distance scalar (no path), so it is tie-break-immune. **No determinism violation here.**

The remaining concern is *semantic*: with repeated categories the anchored position is arbitrary-but-fixed. Verified: backbone `[submit,approve,approve,close]`, run `[submit,approve,close]` (one approve dropped) anchors the single `approve` to backbone index **2** (the *second* approve), reporting `skippedBackbone=["approve"]` at index 1. Whether the dropped step is "the first approve" or "the second approve" is genuinely ambiguous; the algorithm always picks one consistently. This is acceptable for determinism but should be **documented as a known modeling choice**, because branch labels ("after the *second* approve…") may read oddly. `divergentStepIndices` correctly reuses the same alignment so the two views are consistent with each other — good. Keep them sharing one alignment function (they do).

### 1.9 [P2] `lcsAlignment` is O(m·n) memory (full DP matrix) — scalability ceiling
**`divergenceAnalyzer.ts:79-90`**

Allocates the full `(m+1)×(n+1)` matrix per run for backtrace. Correct, but for long signatures × many runs this is a memory/throughput ceiling. Not a correctness bug; flag for the "polished feature" scalability budget (Hirschberg or banded LCS if signatures get long). `editDistance` in `traceSimilarity.ts` is already rolling two-row (good).

### 1.10 [P2] `traceSimilarity` short-circuit subset claim is correct; floor interaction is benign
**`traceSimilarity.ts:94,100-101`**

Identical signatures → 1.0 (subset guarantee holds: exact grouping ⊆ similarity grouping — verified logically). The LCS hard floor (`simLcs < 0.3 → cap blended at simLcs`) only *lowers* scores, so it cannot cause a false merge and cannot break the subset property. Correct as written. One note: with default weights, `blended ≥ simLcs` is *not* generally guaranteed (when simCat < simLcs the blend is below simLcs), so the floor's `Math.min(blended, simLcs)` is occasionally a no-op — harmless, just not always biting. No action.

---

## 2. DETERMINISM violations reaching output

| # | Location | Reaches output? | Verdict |
|---|---|---|---|
| 2.1 | `variantDetector.ts:39` `new Date()` → `VariantSet.computedAt` | **Yes** — top-level output field | **P0 leak.** Inject a clock. Does NOT corrupt variant-hash (separate `computedAtMs` path) but breaks object-level reproducibility / stability check. |
| 2.2 | `analytics.ts:218,351`, `analytics-server.ts:41` `new Date()` | Output (event payloads) | Out of algorithm scope; these are telemetry timestamps, expected. Noted for completeness, not a finding against the algorithms. |
| 2.3 | Map iteration order — `clusterSignatures.ts:127-140`, `divergenceAnalyzer.ts:206,224,240`, `pathSignature.ts:69-77`, `dfgDegrees:149-160` | No | **Safe.** Every Map-derived array is explicitly re-sorted by a total order before output (`clusters.sort` by size then id; `branches.sort` by runCount/index/content; bigram Maps feed a commutative sum). Insertion-order reliance does not reach output. |
| 2.4 | Float instability — blend, Jaccard, frequencies | No | **Safe.** All public scores pass through `round3` (`traceSimilarity.ts:102`, `divergenceAnalyzer.ts:233,252`). `frequency = runCount/total` in `variantDetector.ts:98` is **NOT rounded** (raw float) — minor: could yield `0.30000000000000004`-style values in output. **P2:** round `frequency` and `similarityToStandard` for display/equality stability. |
| 2.5 | Union-find `find` path compression mutating `parent` mid-loop | No | **Safe.** Path compression preserves roots; lexical-root union (`ra < rb`) makes the final root order-independent — confirmed deterministic + idempotent. |

**Net:** one real determinism leak reaching output (2.1, P0) + one unrounded float (2.4, P2). Cluster membership, version hash, and branch structure are deterministic.

---

## 3. THRESHOLD + parameter calibration

### 3.1 Is 0.6 right for the blend? — No; it is an unvalidated default with a known incoherence.
As shown in §1.1, at 0.6 a 1-insertion 3-step variant (0.610) merges while a 1-substitution 3-step variant (0.520) does not — the boundary is dominated by path length and edit type, not by process identity. The weights (lcs 0.6 / cat 0.4) and the floor (0.3) are likewise asserted, not validated. The code (`clusterSignatures.ts:25-27`) and measurement plan (§3.2 decision, §8.1) both state calibration is a prerequisite.

### 3.2 Recommended principled default + how to validate
**Validation = the labeled hold-out already specified in `MEASUREMENT_PLAN_PROCESS_VARIATION.md` §8.1:**
1. 30–50 anonymized recordings (structural signals only); 2 reviewers label each *pair* same/different; keep only pairs with reviewer agreement (Cohen's κ reported).
2. Run the engine across a **threshold sweep** (e.g., 0.45 → 0.75 step 0.025) and the **weight grid** (lcs ∈ {0.5,0.6,0.7}, cat = 1−lcs).
3. Compute proxy precision = `correctly_grouped_pairs / all_grouped_pairs` and proxy recall = `correctly_grouped_pairs / all_same_process_pairs` (§8.1 step 4).
4. **Pick the threshold that maximizes F1 (or precision-at-recall≥0.75) subject to the §8.1 acceptance gate: precision ≥ 0.85 AND recall ≥ 0.75.** Pin the chosen (threshold, weights) — the `configHash` (`clusterSignatures.ts:60-68`) already makes the choice reproducible and visible. Re-run on every `SCORING_MODEL_VERSION` bump (§8.1 "when to re-run").
5. **Length-normalize before/at calibration** to kill the §1.1 incoherence: either drop short paths below a minimum length from clustering, or replace the count-ratio term with a length-robust signal, or blend on edit-distance only for short sequences. Re-validate on the hold-out after any such change.

Pending data, a defensible *interim* default is **0.55–0.60 only if `simLCS` is the floor-binding signal**, but do not wire live (per the module's own "UNWIRED" note, `clusterSignatures.ts:13-15`) until the hold-out runs.

### 3.3 Min-runs thresholds for showing variants honestly — currently ABSENT (P1)
There is **no min-runs gate** in `variantDetector.ts`, `divergenceAnalyzer.ts`, `variantStoryMap.ts`, or `reportDivergence.ts` (verified by search). A variant or branch backed by **one run** is presented identically to one backed by 100. The measurement plan §3.2 / §6.5 (rollout eligibility ≥3 recordings) and §8.1 imply statistical honesty is required.

**Recommended floors (display-honesty, not clustering):**
- Do not *label* a cluster a "standard path" unless it has ≥ 3 runs (else "insufficient data").
- Do not *draw* a branch / report a divergence percentage unless it has ≥ 2 evidence runs (or ≥ 5% of runs), matching the DFG `minEdgeCount` floor in §1.6 so the two honesty gates agree.
- Surface N alongside every variant/branch ("4m 32s · 3 runs"), and grey-out / footnote anything below the floor rather than hiding it (preserves evidence-linking).
- Gate the whole feature at ≥ N runs per the measurement plan (≥3 to form any group; ≥5 before "standard path" framing).

---

## 4. ALGORITHMIC IMPROVEMENTS for a polished feature

1. **Standard-path selection — most-frequent is fragile.** `variantDetector.ts:80-86` picks the largest greedy cluster (tie-break by signature string). Greedy first-match clustering is order-sensitive in *which* cluster forms (mitigated by runId sort, so deterministic — but not optimal). Improve by: (a) using `clusterSignatures.ts` single-link result (or average-link) as the grouping, then choosing the **medoid** path (min total distance to cluster members) as the standard, not just the most frequent — more robust to a few dominant near-duplicates; or (b) require the standard path to clear a frequency floor (≥ X% of runs) before claiming "standard."
2. **Statistical honesty — don't show variants below N** (see §3.3). Add explicit `runCount`/`evidenceRunIds.length` gating in the map and report builders.
3. **Spaghetti reduction.** `variantStoryMap.ts` top-N (`maxBranches`) is a blunt cut. Add (a) frequency-threshold filtering (hide branches below 5% run share) *in addition to* top-N, (b) merge near-identical branches (same diverge/reconverge anchors, edit-distance-1 altSteps) before ranking, and (c) collapse long alt-step chains into a single labeled super-edge with N. This matches DFG-filtering practice (frequency/activity sliders) and keeps the map readable as variants grow.
4. **Decision-point detection honesty (split out-degree>1 vs incidental).** Fix §1.5 (gate `isDecision` on `dfgConfirmedSplit`) and §1.6 (raise `minEdgeCount` floor). A "decision point" should mean: backbone category with ≥2 distinct successors each supported by ≥ floor runs. Optionally annotate decision nodes with the successor distribution ("70% → fill, 30% → validate") for a true process-mining decision-point view.
5. **Length normalization in the blend** (see §3.2 step 5) — the single most impactful correctness improvement for short paths.
6. **Average/complete-link or diameter guard** for clustering (§1.4) to eliminate chaining once data volume grows.

---

## 5. Prioritized correctness fix list (P0 → P2)

### P0 (block GA / block live-wiring)

- **P0-1 — Length-incoherent threshold (do not wire live until calibrated).**
  `clusterSignatures.ts:28`, `traceSimilarity.ts:34,98`.
  Action: run the §8.1 labeled hold-out sweep; pin (threshold, weights) by max-F1 subject to precision≥0.85/recall≥0.75; add length-normalization so 1-edit decisions are monotonic across path length. Honor the existing "UNWIRED" guard until done.

- **P0-2 — `new Date()` determinism leak.**
  `variantDetector.ts:39` (→ output `computedAt` at `:47,:107`).
  Corrected logic: inject the clock.
  ```
  export function detectVariants(bundles, options) {
    const now = options.computedAt ?? options.nowMs?  new Date(options.nowMs).toISOString() : /* REQUIRED */ ;
    // pure engine MUST NOT call new Date(); caller supplies computedAt (iter-037 referenceNowMs pattern / migrate-process-graph.ts computedAtMs)
  }
  ```

- **P0-3 — Multi-branch run-weighting double-count.**
  `variantStoryMap.ts:115,149`; `reportDivergence.ts:65`.
  Corrected logic: stop presenting `conforming + Σ branchShare` as a partition. Add `divergingRunShare = 1 − conformingPct` for the honest partition, and relabel per-branch shares as overlapping "occurrence share." If partition semantics are required, attribute each diverging run to exactly one branch (first/most-significant) so weights are disjoint. Add the test invariant:
  ```
  conformingRunCount + countDistinctRunsAppearingInAnyBranch === totalRuns
  ```

### P1 (fix before polish / before pointing at user content)

- **P1-1 — Single-link chaining guard.** `clusterSignatures.ts:107-124`. Add min-intra-cluster-similarity floor (reject unions creating a sub-floor pair) or move to average-link; emit per-cluster min pairwise similarity (measurement-plan §3.1 amber 0.75 / red 0.65).
- **P1-2 — Decision-point honesty.** `variantStoryMap.ts:152-154`. Gate `isDecision` on `b.dfgConfirmedSplit` (out-degree > 1 after floor), not branch existence.
- **P1-3 — DFG `minEdgeCount` floor.** `divergenceAnalyzer.ts:187`. Default to `max(2, ceil(0.05 * totalRuns))`; keep it in the version hash (already at `:189`).
- **P1-4 — DFG edge-key delimiter.** `divergenceAnalyzer.ts:143,151-153`. Replace space delimiter with a non-occurring delimiter (`' '`) or nested `Map<from,Map<to,count>>`. Same hardening for branch keys (`:216`, `reportDivergence.ts:67`).
- **P1-5 — Min-runs honesty gate.** `variantDetector.ts`, `variantStoryMap.ts`, `reportDivergence.ts`. Suppress/footnote variants <3 runs and branches <2 runs; always surface N.

### P2 (polish / hardening)

- **P2-1 — Round `frequency` + `similarityToStandard`.** `variantDetector.ts:98,89-92` (use `round3`) for output stability.
- **P2-2 — Document repeated-category LCS anchoring choice.** `divergenceAnalyzer.ts:100,170` (deterministic but arbitrary anchor — note in JSDoc).
- **P2-3 — `lcsAlignment` memory.** `divergenceAnalyzer.ts:79-90` (Hirschberg/banded if signatures get long).
- **P2-4 — Spaghetti reduction beyond top-N.** `variantStoryMap.ts:127-128` (add frequency-threshold + near-identical-branch merge).
- **P2-5 — Medoid / frequency-floor standard-path selection.** `variantDetector.ts:80-86`.

---

## 6. What is correct (preserve verbatim)

- Version/config hashing: `clusterSignatures.ts:60-68` FNV-1a over `lcs;cat;t` — reproducible, tuning-visible. `divergenceAnalyzer.ts:189` `#min${minEdgeCount}` in version — good.
- Determinism scaffolding: input sort by id, lexical-root union-find, fixed LCS tie-break, all Map outputs re-sorted by total order — confirmed no Map-iteration-order leak reaches output.
- Evidence-linking: `evidenceRunIds` carried on every variant/branch and set-unioned + sorted in the map (`variantStoryMap.ts:116`) — the moat is intact.
- Exact-subset guarantee: identical signatures short-circuit to 1.0 (`traceSimilarity.ts:94`) so similarity grouping ⊇ exact grouping — verified.
- `conformingPct` scalar (the previously-flagged item): **now correct** — each diverging variant counted once via `Set`. The live defect migrated to branch weighting (§1.3 / P0-3).
- Tests: 178/178 intelligence-engine pass; reportDivergence/variantStoryMap conforming tests assert the correct scalar values. (Gap: no test covers a multi-branch variant — add one to lock P0-3.)
