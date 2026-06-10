# Algorithms — Similarity Clustering + Variation / Diverge→Reconverge

**Status:** Design (implementation-ready)
**Owner:** intelligence-engine / process-variation
**Determinism contract:** No `Date.now()`, no `Math.random()`, no locale-dependent sorts, no Set/Map iteration-order dependence in any decision path. Every output is a pure function of (input bundles, pinned config, pinned algorithm version). Re-runs are byte-identical.

---

## 0. Scope, motivation, and the gap being closed

Ledgerium records browser workflows. Each recording is an ordered sequence of typed **steps** (a `ProcessDefinition.stepDefinitions[]`, each carrying `ordinal`, `category` (a `GroupingReason`), `title`, `systems`, `domains`, `confidence`, `durationMs`). A `ProcessRunBundle = { processRun, processDefinition }` is one recording.

Two capabilities are specified here:

- **(A) Similarity clustering** — group recordings that are "the same or similar workflow," producing one cluster per logical process. This must scale beyond the current behavior.
- **(B) Variation / variant analysis incl. diverge→reconverge** — within a cluster, determine the standard path, enumerate variants with frequencies, and compute the exact **branch (divergence) and join (reconvergence) points** across the cluster's runs.

### The gap

`apps/web-app/src/lib/intelligence.ts → clusterWorkflows()` groups workflows **only by byte-identical `pathSignature`** (line 132–150: `groups.get(sig)`). Two recordings of the same process that differ by a single inserted step land in **different** ProcessDefinitions. Everything downstream (variant analysis, family detection, recommendations) is computed *within* a signature group, so a process that is recorded with normal human variation fragments into many singleton "processes," and `detectVariants()` then sees only intra-signature runs — it can never surface real variants.

This document specifies the **similarity-based clustering layer** that must sit between "load bundles" and "create ProcessDefinition," replacing the exact-signature `Map<string, Bundle[]>` grouping with a deterministic similarity clustering pass. It reuses the existing primitives (`computePathSignature`, `computeSignatureSimilarity`, `computeVariantDistance`/Wagner–Fischer alignment, `fingerprintWorkflowSteps`, `analyzeVariance`, `detectVariants`) and adds the net-new pieces (multi-feature trace metric, MinHash+LSH candidate generation, deterministic single-link agglomeration, incremental assignment, and the diverge→reconverge MSA backbone).

### Reuse-vs-net-new at a glance

| Concern | Reuse (existing) | Net-new (this doc) |
| --- | --- | --- |
| Per-run signature | `computePathSignature` (pathSignature.ts) | — |
| Order-sensitive sequence sim | `bigramJaccardSimilarity`, `computeSignatureSimilarity` | LCS-normalized distance combinator |
| Sequence alignment / edit ops | `computeVariantDistance` + `computeAlignment` (variantAnalyzer.ts, Wagner–Fischer) | — |
| Step semantics | `fingerprintWorkflowSteps`, `semanticSignature` | category↔fingerprint dual-token choice |
| System/app set | `processRun.systemsUsed`, `setOverlap` (scoringConfig.ts) | system-set Jaccard term |
| Variance + stability | `analyzeVariance` (varianceAnalyzer.ts) | — |
| Variant grouping (intra-cluster) | `detectVariants` (variantDetector.ts) | run on the **cluster**, not the signature group |
| Cluster trace metric | — | §1 `traceSimilarity` |
| Candidate generation O(n)→sub-O(n²) | — | §2 MinHash + banded LSH |
| Agglomeration | union-find pattern (intelligence.ts:612 `find`/`union`) | §2 deterministic single-link over LSH edges |
| Incremental assignment | — | §2.4 |
| Standard path selection | `detectVariants` sort (variantDetector.ts:80) | §4 deterministic tie-break spec (formalized) |
| Diverge→reconverge | — | §5 MSA-backbone + DFG split/join |

---

## 1. Trace representation + deterministic similarity metric

### 1.1 Features extracted per recording (the "trace vector")

For a bundle `b`, compute a **TraceProfile** — a pure, deterministic struct of features. All features are privacy-safe (categories, canonical system names, semantic fingerprints — never raw titles or field values).

```text
TraceProfile {
  runId:          string                 // b.processRun.runId  (stable identity / final tie-break key)
  catSeq:         string[]               // ordered step categories  (computePathSignature(b).stepCategories)
  fpSeq:          string[]               // ordered semantic fingerprints
                                         //   = fingerprintWorkflowSteps(def.stepDefinitions, runId)
                                         //       .map(fp => fp.semanticSignature)   // "verb:object:system:eventType"
  catBigrams:     Set<string>            // bigrams(catSeq)   (pathSignature.ts bigrams(): "A:B", single → "__S__:A")
  fpShingles:     Set<string>            // k-shingles of fpSeq, k=2 (see §1.2)  — the MinHash domain
  systemSet:      Set<string>            // canonical systems: union of fp.system over fpSeq  ∪  b.processRun.systemsUsed (normalized)
  stepCount:      number                 // catSeq.length
  startAnchor:    string                 // fpSeq[0]        ?? ""
  endAnchor:      string                 // fpSeq[fpSeq.length-1] ?? ""
}
```

**Why these and not others.**

- **`catSeq` (step-category sequence)** is the existing privacy-safe canonical backbone (`computePathSignature`). It is coarse (a handful of `GroupingReason` values) so it generalizes across surface differences, but coarse-only matching over-merges. It is the **structural** signal.
- **`fpSeq` (step fingerprints, `verb:object:system:eventType`)** is finer and already computed by `stepFingerprinter.ts`. It is the **semantic** signal: it distinguishes "click→navigate in Gmail" from "click→navigate in Salesforce" even when both are `click_then_navigate` categories. We cluster primarily on `fpSeq` shingles and use `catSeq` as a stabilizing structural term.
- **`systemSet`** is order-free context. Two recordings using a disjoint set of systems are almost never the same workflow even if their category skeletons rhyme; the system-set Jaccard term is the cheap, high-precision guard the existing exact-group scorer already relies on (`SYSTEM_MISMATCH`).
- **n-gram bags (`catBigrams`, `fpShingles`)** give order-sensitivity without paying full alignment cost, and `fpShingles` doubles as the **MinHash domain** for candidate generation (§2). One representation, two uses.

We deliberately **do not** put `stepCount` alone, durations, or titles into the clustering metric: durations are not identity (they belong to variance/timing analysis), and titles are handled separately by family detection (`titleNormalizer.ts`) which sits *above* clustering, not inside it.

### 1.2 Shingles (deterministic)

```text
shingles(seq: string[], k: number) -> string[]:
  if seq.length == 0: return []
  if seq.length <  k: return [ "__S__:" + seq.join("›") ]          // start-anchored, mirrors bigrams() single-element rule
  out = []
  for i in 0 .. seq.length - k:
    out.push( seq.slice(i, i+k).join("›") )                        // "›" = U+203A, cannot appear in fingerprints
  return out
```

`fpShingles = new Set(shingles(fpSeq, 2))`. (k=2 matches the order-sensitivity of the existing bigram metric; k is config-pinned so it can be retuned without code change.)

### 1.3 The deterministic trace similarity metric

We combine four bounded-[0,1] terms. Three are order/structure sensitive; one is order-free context.

Let `A`, `B` be two TraceProfiles.

**Term 1 — LCS-normalized sequence distance → similarity (`simLCS`).**
Reuse the Wagner–Fischer alignment already in `variantAnalyzer.ts` (`computeAlignment`, which yields `editCount` = Levenshtein edit distance under unit insert/delete/substitute costs). Run it on the **fingerprint sequences** `A.fpSeq`, `B.fpSeq`:

```text
edit      = computeAlignment(A.fpSeq, B.fpSeq).editCount        // exact same DP as computeVariantDistance
maxLen    = max(|A.fpSeq|, |B.fpSeq|)
simLCS    = maxLen == 0 ? 1 : 1 - (edit / maxLen)               // normalized edit similarity, in [0,1]
```

This is the strongest single signal: it is order-aware **and** tolerant of insertions/deletions/substitutions (exactly the human variation that the exact-signature grouping fails on). `edit/maxLen` is the same normalization `computeVariantDistance` already uses for `deviationScore` — we are literally reusing it.

**Term 2 — fingerprint-shingle Jaccard (`simShingle`).** Order-sensitive (shingles encode adjacency), cheap, and identical in spirit to `bigramJaccardSimilarity` but over fingerprints, and — critically — it is the **same set** MinHash estimates in §2, so the LSH candidate score and the exact score are consistent.

```text
simShingle = jaccard(A.fpShingles, B.fpShingles)               // |∩| / |∪|, both empty → 1
```

**Term 3 — category-bigram Jaccard (`simCat`).** Reuse `bigramJaccardSimilarity(A.catSeq, B.catSeq)` verbatim (it already does multiset bigram Jaccard, pathSignature.ts:61). This is the coarse structural stabilizer that keeps near-identical skeletons together when fingerprint parsing is noisy (low fingerprint confidence).

```text
simCat = bigramJaccardSimilarity(A.catSeq, B.catSeq)
```

**Term 4 — system-set Jaccard (`simSys`).** Order-free context guard.

```text
simSys = (A.systemSet.size == 0 && B.systemSet.size == 0)
           ? 1
           : |A.systemSet ∩ B.systemSet| / |A.systemSet ∪ B.systemSet|
```

**Combined trace similarity (the formula):**

```text
traceSimilarity(A, B) =
      W_LCS     · simLCS
    + W_SHINGLE · simShingle
    + W_CAT     · simCat
    + W_SYS     · simSys
```

with pinned weights (sum = 1.0):

```text
W_LCS     = 0.45      // order-aware, insert/delete tolerant — the primary identity signal
W_SHINGLE = 0.25      // order-sensitive fingerprint adjacency — high precision, MinHash-consistent
W_CAT     = 0.15      // coarse structural stabilizer (category backbone)
W_SYS     = 0.15      // order-free context guard (system/app set)
```

**Why these weights.**
- `W_LCS` dominates because edit-similarity is the only term that *correctly handles insertions/deletions in the middle of a sequence* — the exact failure mode of the current exact-signature grouping. Bigram/shingle Jaccard degrade sharply when one step is inserted (every shingle spanning the insertion is lost); LCS degrades by ~1/maxLen.
- `W_SHINGLE` and `W_CAT` are complementary order signals at two granularities (semantic vs structural). Keeping both prevents either a noisy fingerprinter (mitigated by `simCat`) or an over-coarse category space (mitigated by `simShingle`) from dominating. Their combined 0.40 is below `W_LCS` so they refine rather than override the alignment verdict.
- `W_SYS = 0.15` is a precision floor: it cannot by itself force a merge (max contribution 0.15), but a system mismatch (`simSys = 0`) drops the ceiling to 0.85, which combined with any real sequence divergence keeps cross-system recordings below the merge threshold (§3). This mirrors the conservative `SYSTEM_MISMATCH` weakness in `exactGroupScorer.ts` without making it a hard block.

**Hard precision guard (mirrors `exactGroupScorer` guardrails).** Before returning, apply one deterministic guard that prevents pathological merges the weighted average could otherwise allow:

```text
if simLCS < LCS_HARD_FLOOR (= 0.30):      // core sequences diverge too much, ever
    return min( traceSimilarity, MERGE_THRESHOLD - ε )   // forced below merge; ε = 1e-9
```

This is the `hardBlocked = stepSim < 0.50` pattern from `exactGroupScorer.ts:253`, tuned looser (0.30) because clustering is broader than verified exact-grouping.

All terms are `round3`-rounded (the repo's existing `Math.round(x*1000)/1000` convention) at the boundary so floating-point summation order never affects a threshold comparison.

### 1.4 Determinism notes for §1

- `computeAlignment` is pure DP with a fixed-priority backtrace; deterministic.
- `bigramJaccardSimilarity` uses multiset Map counting but only reads `.get`/`Math.min` — iteration order of the Map is never observed for the *result*; deterministic.
- `systemSet` must be built from a **sorted** source array before being placed in a `Set` only if any code later *iterates* it for output; for Jaccard we only test membership and size, so order is irrelevant. (We still sort canonical system names when persisting, for stable artifacts.)
- All four terms are commutative: `traceSimilarity(A,B) === traceSimilarity(B,A)` — required for single-link symmetry.

---

## 2. Clustering algorithm — deterministic, incremental, scalable

### 2.1 Overview

```text
Input : bundles[]  (recordings for one user / one analysis scope)
Output: ClusterAssignment {
          clusters: Cluster[]                         // sorted, deterministic ids
          assignmentOf: Map<runId, clusterId>
          algorithmVersion: string                    // pinned hash, see §2.5
        }

Pipeline:
  1. profiles = bundles.map(buildTraceProfile)                          // §1
  2. order    = profiles sorted by runId (localeCompare)                // canonical processing order
  3. candidatePairs = lshCandidateGeneration(profiles)                 // §2.2  — avoids O(n²)
  4. edges    = candidatePairs
                  .map(pair => (pair, traceSimilarity(pair)))           // §1.3  — exact score on candidates only
                  .filter(score >= MERGE_THRESHOLD)                     // §3
  5. clusters = singleLinkAgglomerate(order, edges)                    // §2.3  — union-find
  6. assignClusterIds(clusters)                                        // §2.5  — stable ids + tie-break
  7. return ClusterAssignment
```

We never materialize the full `n×n` matrix. Exact `traceSimilarity` is computed **only** on LSH candidate pairs, of which there are `O(n · avgBucketSize)` in practice.

### 2.2 Candidate generation — MinHash + banded LSH (deterministic)

**Goal:** for each profile, produce a small set of *candidate* profiles whose `fpShingles` Jaccard is plausibly high, without comparing against all others.

**MinHash signature.** For each profile, compute `H` minhash values over its `fpShingles` set using `H` fixed, seed-pinned hash functions.

```text
// Pinned, integer, non-cryptographic, fully deterministic hashing (no Math.random ever).
// 32-bit FNV-1a over the shingle string, then H affine permutations mod a fixed prime.

FNV_OFFSET = 2166136261
FNV_PRIME  = 16777619
P          = 4294967311            // prime > 2^32, pinned
H          = 128                   // number of minhash functions (pinned)
// A[i], B[i] : pinned constant arrays of length H (generated once, checked into source, NOT random at runtime)
//   A[i] in [1, P-1], B[i] in [0, P-1]   — e.g. derived by a documented deterministic generator and frozen as a literal table.

fnv1a(s: string) -> uint32:
    h = FNV_OFFSET
    for ch in s.codePointsUtf8():           // byte-wise, locale-independent
        h = ((h XOR ch) * FNV_PRIME) mod 2^32
    return h

minhashSignature(shingles: Set<string>) -> uint32[H]:
    if shingles.size == 0:
        return [P-1, P-1, ..., P-1]          // canonical empty signature (length H)
    sig = [ +Infinity × H ]
    for sh in shingles:                      // iteration order irrelevant: min is commutative
        x = fnv1a(sh)
        for i in 0 .. H-1:
            hv = (A[i] * x + B[i]) mod P
            if hv < sig[i]: sig[i] = hv
    return sig
```

Because `min` is order-independent, the Set's iteration order does **not** affect `sig` — deterministic despite iterating a Set.

**Banded LSH.** Split the `H`-length signature into `BANDS` bands of `ROWS` rows each (`H = BANDS · ROWS`, pinned `BANDS = 32`, `ROWS = 4`). For each band, hash the band's row-tuple into a bucket key; profiles colliding in **any** band become a candidate pair.

```text
BANDS = 32 ; ROWS = 4 ; H = 128

lshCandidateGeneration(profiles[]) -> Set<UnorderedPair>:
    // buckets: Map<bandIndex":"bandHash, runId[]>
    buckets = new Map()
    for p in profiles sorted by runId:               // sorted insert → deterministic bucket member order
        sig = minhashSignature(p.fpShingles)
        for band in 0 .. BANDS-1:
            slice  = sig[band*ROWS .. band*ROWS + ROWS]      // 4 uint32s
            bandKey = band + ":" + slice.join("_")           // exact band hash; collision = identical 4-tuple
            buckets.get(bandKey).push(p.runId)               // append in runId-sorted order
    candidates = new Set<"loRunId|hiRunId">()
    for (bandKey, members) in buckets:                       // members already runId-sorted
        for i in 0 .. members.length-1:
            for j in i+1 .. members.length-1:
                lo, hi = sortPair(members[i], members[j])    // localeCompare order
                candidates.add(lo + "|" + hi)
    return candidates
```

**LSH tuning rationale (deterministic, not probabilistic at runtime).** With `BANDS=32, ROWS=4`, the classic LSH S-curve has its steep transition (~50% collision probability) near Jaccard `s ≈ (1/BANDS)^(1/ROWS) = (1/32)^(1/4) ≈ 0.42`. Our `MERGE_THRESHOLD` on the *combined* metric corresponds to a fingerprint-shingle Jaccard comfortably above this (true same-process pairs have `simShingle` well above 0.42), so candidate recall at the operating point is high. **Crucially, the S-curve is an analysis tool, not a runtime behavior** — at runtime the bucketing is exact integer comparison: identical band tuples collide, period. Two runs with `simShingle = 0` will essentially never share a band tuple; if they did, the exact `traceSimilarity` in step 4 filters them out. LSH only ever affects *which pairs we bother to score exactly* — it can only cause **false negatives** (a missed candidate), never a false merge. We bound that with the fallback below.

**Small-n and recall fallback (determinism-safe).**
- If `n ≤ BRUTE_FORCE_N (= 200)`: skip LSH entirely and generate **all** `n(n-1)/2` pairs (exact, no recall loss). LSH overhead is not worth it below a few hundred recordings, and brute force here is provably complete.
- Always additionally emit, for every profile, the candidate pair against the profile sharing its **exact `catSeq` signature** if one exists (cheap `Map<signature, runId>` lookup). This guarantees that anything the *old* exact-signature grouping would have merged is still considered — strict superset of current behavior, so the change can never *lose* a previously-formed group.

### 2.3 Single-link agglomeration (connected components via union-find)

Reuse the union-find idiom already in `intelligence.ts` (`find` with path-halving, `union`). Single-link = connected components of the graph whose edges are candidate pairs with `traceSimilarity ≥ MERGE_THRESHOLD`.

```text
singleLinkAgglomerate(profilesInRunIdOrder[], edges[]) -> Cluster[]:
    parent = Map<runId, runId>()
    for p in profilesInRunIdOrder: parent.set(p.runId, p.runId)

    find(x): while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]; return x

    union(a, b):                                  // DETERMINISTIC merge direction
        ra, rb = find(a), find(b)
        if ra == rb: return
        // always attach the lexicographically-greater root under the smaller root
        if ra.localeCompare(rb) <= 0: parent[rb] = ra
        else:                          parent[ra] = rb

    // process edges in a TOTAL deterministic order:
    //   primary: score DESC (round3)        → strongest links bind first (matters for component identity stability)
    //   then  : loRunId ASC, hiRunId ASC    → total order, no ties
    edges.sortStable( by -score, then loRunId.localeCompare, then hiRunId.localeCompare )
    for e in edges: union(e.lo, e.hi)

    // collect components
    comp = Map<rootRunId, runId[]>()
    for p in profilesInRunIdOrder:                // runId order → deterministic member order
        r = find(p.runId)
        comp.get(r).push(p.runId)
    return comp.values()  as Cluster[]
```

**Why single-link / connected-components and not complete-link or centroid.**
- It composes cleanly with LSH: edges are exactly the high-similarity candidate pairs, and connected components are a single union-find pass — `O(E · α(n))`.
- It is **deterministic without a centroid**: complete-link and centroid methods require recomputing inter-cluster distances after each merge and choosing among near-ties (a determinism hazard). Connected components have no such choice.
- The known single-link risk is *chaining* (A~B, B~C, A≁C still merges A,B,C). We accept and bound it because (i) the `MERGE_THRESHOLD` is high (§3) so each link is already strong, and (ii) §2.6 specifies a **split** guard that detects over-chained clusters via cohesion and splits them deterministically. The `union` direction is pinned (lexical root rule) so the resulting forest — and therefore the components — is identical across runs regardless of edge insertion order beyond the pinned sort.

**Singletons.** A profile with no qualifying edge is its own cluster (size 1). This is the correct outcome for a genuinely unique recording — unlike the old code, it is no longer *forced* by an incidental signature mismatch.

### 2.4 Incremental assignment (online, when a new recording arrives)

When a single new bundle `b*` arrives (the common production path — one recording at a time), we do **not** re-cluster from scratch. We assign `b*` to the nearest existing cluster above threshold, else open a new cluster. To keep determinism, each cluster maintains a small, deterministic set of **representatives** (its medoid + its `k` most-recent-by-runId members capped at `REP_CAP = 8`, chosen by runId order, not arrival time).

```text
assignIncremental(b*, clusters[]) -> clusterId:
    p* = buildTraceProfile(b*)
    sig* = minhashSignature(p*.fpShingles)

    // 1. candidate clusters via LSH: any cluster owning a representative that
    //    shares a band tuple with sig* (reuse the persisted band buckets).
    candClusters = clustersSharingAnyBand(sig*)                 // ∪ cluster with identical catSeq signature
    if candClusters is empty: return openNewCluster(p*)

    // 2. score p* against each candidate cluster's representatives; cluster score = MAX rep sim (single-link semantics)
    best = null ; bestScore = -1
    for c in candClusters sorted by clusterId:                  // deterministic iteration
        s = max over r in c.representatives of traceSimilarity(p*, r)   // ties → first rep in runId order
        // tie-break on equal score: smaller clusterId wins (clusters sorted ascending)
        if s > bestScore: best = c ; bestScore = s

    if bestScore >= MERGE_THRESHOLD:
        assign p* to best
        updateRepresentatives(best, p*)                        // recompute medoid over (existing reps ∪ p*), cap REP_CAP
        // OPTIONAL bridge check: if p* now links best to ANOTHER candidate cluster
        // (p* scores >= threshold against c2 as well), record a pending MERGE candidate (see §2.6),
        // do NOT merge live — merges are batch operations (determinism + auditability).
        return best.clusterId
    else:
        return openNewCluster(p*)
```

**Properties.**
- **Deterministic given the same cluster state:** candidate iteration is sorted by `clusterId`; ties on score resolve to the smallest `clusterId`. Two identical new recordings assign identically.
- **Incremental ≠ identical to from-scratch.** Online single-link can differ from batch single-link in adversarial chaining orders. We therefore mark incremental assignments as `provisional` and run a full deterministic re-cluster (§2.1) on a schedule / on demand (e.g., the existing `clusterWorkflows(userId)` entry point) which reconciles to the canonical batch result. The batch result is the source of truth; incremental is a low-latency approximation that converges to it. This is logged explicitly so it is auditable, never silent.
- **Representatives are deterministic:** medoid = the member minimizing summed `traceSimilarity`-distance to other reps (ties → smallest runId); plus up to `REP_CAP-1` members in runId order. No time/arrival dependence.

### 2.5 Stable cluster ids + pinned algorithm version hash

**Cluster id.** A cluster's id is derived from its membership, not from arrival order, so ids are reproducible:

```text
clusterId(memberRunIds[]) = "cl-" + fnv1aHex( memberRunIds.sortLocale().join("|") )    // short stable hash
```

Clusters in the output are then sorted by `(memberCount DESC, clusterId ASC)` — same convention `detectVariants` uses (run count desc, signature tie-break). The **standard / largest cluster is index 0** deterministically.

> Note: id stability across membership change is intentionally *not* guaranteed (adding a member changes the hash). For UI continuity, a separate stable surrogate key (`ProcessDefinition.id` UUID, already persisted) is kept and *re-pointed* to the cluster whose membership most overlaps the prior membership (Jaccard of member sets, tie → smaller clusterId). That mapping layer is a persistence concern, documented in §6, and does not affect the deterministic algorithm output.

**Algorithm version hash (re-runs byte-identical, change-detectable).**

```text
ALGORITHM_VERSION = fnv1aHex( JSON.stringify({
   metricWeights : { W_LCS, W_SHINGLE, W_CAT, W_SYS },
   guards        : { LCS_HARD_FLOOR },
   thresholds    : { MERGE_THRESHOLD, SPLIT_COHESION_FLOOR, MERGE_BRIDGE_FLOOR },
   shingle       : { K_SHINGLE },
   lsh           : { H, BANDS, ROWS, P, FNV_PRIME, A_table_hash, B_table_hash },
   bruteForceN   : BRUTE_FORCE_N,
   repCap        : REP_CAP,
   engineVersion : INTELLIGENCE_ENGINE_VERSION,          // "1.0.0"
   modelVersion  : SCORING_MODEL_VERSION,                // "1.0.0"
}))
```

Every persisted clustering result stores `ALGORITHM_VERSION`. Re-running with the same inputs and the same version yields a byte-identical `ClusterAssignment`. Any weight/threshold/seed change flips the hash, which (a) makes the change visible in artifacts and (b) is the trigger to recompute. This mirrors the `metric_version` pattern from `SNAPSHOT_TABLE_DECISION.md` (§2.1) and the `ruleVersion`/`modelVersion` fields already threaded through every engine output.

### 2.6 Merge / split (batch reconciliation rules)

These run only in the **batch** pass (never live, for auditability). Both are deterministic.

**MERGE** (two existing clusters should be one). Trigger: a bridge candidate exists — some run in cluster `C1` has `traceSimilarity ≥ MERGE_BRIDGE_FLOOR (= MERGE_THRESHOLD)` to some run in `C2` (surfaced during incremental as a pending bridge, or rediscovered as an LSH candidate spanning two clusters). Action: union `C1, C2` (lexical-root rule), then **re-validate cohesion** (below); if cohesion drops below `SPLIT_COHESION_FLOOR`, the merge is rejected and the bridge is recorded as a *family* relationship instead (handed to `familyScorer.ts`, which already models "same_family" without forcing one process group). Determinism: bridge candidates are processed in `(score DESC, loRunId, hiRunId)` order, same as §2.3.

**SPLIT** (single-link chaining produced an incoherent cluster). Define cluster **cohesion** deterministically as the *average over members of each member's max similarity to any other member* (a single-link-consistent internal density measure):

```text
cohesion(C) =  C.size <= 1 ? 1
            :  mean over m in C of ( max over m'≠m in C of traceSimilarity(m, m') )
```

If `cohesion(C) < SPLIT_COHESION_FLOOR (= 0.55)`, **split** `C`: re-run single-link agglomeration **on C's members only** but at a *raised* threshold `MERGE_THRESHOLD + SPLIT_STEP (= +0.07)`. This deterministically peels the weakly-attached chain ends into sub-clusters. Recurse at most `SPLIT_MAX_DEPTH (= 3)` times. Sub-clusters get fresh `clusterId`s by membership hash. Because the re-run reuses the exact same deterministic agglomeration with a pinned higher threshold, the split is reproducible.

> Merge/split exist to bound single-link's two failure modes (under-merge across reps, over-chain). In practice with `MERGE_THRESHOLD ≈ 0.72` they fire rarely; they are correctness backstops, not the main path.

### 2.7 Full pseudocode (batch)

```text
function clusterTraces(bundles[], config) -> ClusterAssignment:
    profiles = bundles.map(b => buildTraceProfile(b, config))            // §1.1
    profiles.sortStable(by p.runId.localeCompare)                        // canonical order

    // ── candidate generation ──
    if profiles.length <= config.BRUTE_FORCE_N:
        cand = allUnorderedPairs(profiles)
    else:
        cand = lshCandidateGeneration(profiles, config)                  // §2.2
    cand = cand ∪ exactSignatureCandidatePairs(profiles)                 // §2.2 fallback (superset guarantee)

    // ── exact scoring on candidates only ──
    edges = []
    for (lo, hi) in cand sorted (loRunId, hiRunId):
        s = traceSimilarity(profileOf[lo], profileOf[hi], config)        // §1.3 (with LCS_HARD_FLOOR guard)
        if s >= config.MERGE_THRESHOLD: edges.push({lo, hi, score: round3(s)})

    // ── agglomerate ──
    clusters = singleLinkAgglomerate(profiles, edges)                    // §2.3

    // ── split incoherent clusters ──
    clusters = clusters.flatMap(c => splitIfIncoherent(c, edges, config, depth=0))   // §2.6

    // ── id + sort ──
    out = clusters.map(members => ({
              clusterId: "cl-" + fnv1aHex(members.sortLocale().join("|")),
              memberRunIds: members.sortLocale(),
          }))
    out.sortStable(by -memberRunIds.length, then clusterId.localeCompare)  // largest first, deterministic
    return { clusters: out,
             assignmentOf: invert(out),
             algorithmVersion: ALGORITHM_VERSION }
```

---

## 3. Threshold strategy + per-assignment confidence

### 3.1 Choosing `MERGE_THRESHOLD`

**Conservative default: `MERGE_THRESHOLD = 0.72`.** Rationale, anchored to the existing config so it is not a free parameter:

- The exact-group scorer merges at composite `0.82` (`exactGroupThresholds.minimum`) and the family "likely" band is `0.68` (`familyThresholds.likelyFamily`). Clustering for *variant analysis* is broader than verified exact-grouping (we *want* the inserted-step variant in the same cluster) but narrower than family ("Email US Report" vs "Email EU Report" are the same family but should be **different** clusters if their paths genuinely differ). `0.72` sits deliberately between `likelyFamily (0.68)` and `exactGroup.minimum (0.82)`, biased toward precision.
- At `0.72`, given the weights, a pair must clear roughly: identical-skeleton-with-one-edit (`simLCS ≈ 0.9`), strong shingle overlap, matching category bigrams, and shared systems — OR very high LCS that carries the average. A single mid-sequence inserted step (`simLCS ≈ 1 - 1/maxLen`) keeps a same-process pair safely above `0.72`; a genuinely different workflow (disjoint systems, low LCS) cannot reach it.

**Data-driven refinement (deterministic, optional, offline).** When a labeled or pseudo-labeled corpus exists (e.g., runs already grouped by identical `pathSignature` are positive pairs; runs with disjoint `systemSet` are negative pairs), pick the threshold by maximizing a deterministic objective over a fixed candidate grid `{0.60, 0.62, …, 0.86}`:

```text
chooseThreshold(positivePairs, negativePairs, grid) -> t*:
    best = null ; bestF1 = -1
    for t in grid (ascending):                     // ascending + strict '>' on tie → deterministic pick
        tp = |{p in positivePairs : traceSimilarity(p) >= t}|
        fp = |{p in negativePairs : traceSimilarity(p) >= t}|
        fn = |positivePairs| - tp
        precision = tp/(tp+fp) (0 if denom 0)
        recall    = tp/(tp+fn) (0 if denom 0)
        f1 = 2·precision·recall / (precision+recall)   (0 if denom 0)
        if f1 > bestF1: bestF1 = f1 ; t* = t
    return t*                                       // tie-break: smallest t (grid ascending, strict >)
```

This is a pure function of the corpus + grid; it produces a pinned numeric constant that then enters `ALGORITHM_VERSION`. It is **not** run at clustering time. The conservative `0.72` is the shipped default until such a corpus is curated; the gap analysis ("most-frequent signature is positive") makes the labeling derivation itself deterministic.

**Other pinned thresholds** (all entering `ALGORITHM_VERSION`):
`LCS_HARD_FLOOR = 0.30`, `SPLIT_COHESION_FLOOR = 0.55`, `SPLIT_STEP = 0.07`, `SPLIT_MAX_DEPTH = 3`, `MERGE_BRIDGE_FLOOR = MERGE_THRESHOLD`.

### 3.2 Per-assignment confidence score

Each run's cluster membership gets a confidence in `[0,1]` so the UI can show trust bands (reusing `resolveConfidenceBand` from `scoringConfig.ts`).

```text
assignmentConfidence(run m, cluster C) -> number:
    if C.size == 1: return clamp(0.30, 0.30 + 0.05·0, 0.30)      // singleton: low (matches intelligence.ts lone-run 0.3)

    // 1. attachment strength: how strongly m links into C (single-link consistent)
    sLink   = max over m'≠m in C of traceSimilarity(m, m')        // best edge into the cluster

    // 2. typicality: how close m is to the cluster medoid
    sMedoid = traceSimilarity(m, medoid(C))

    // 3. margin: gap to the best NON-assigned cluster (separation)
    sOther  = max over c'≠C (candidate clusters) of ( max rep sim of m to c' )    // 0 if none
    margin  = clamp01(sLink - sOther)

    // 4. sample-size damping (mirrors LOW_SAMPLE_SIZE weakness)
    sizeFactor = C.size >= 5 ? 1.0 : C.size >= 3 ? 0.85 : 0.6

    raw = ( 0.45·sLink + 0.30·sMedoid + 0.25·margin ) · sizeFactor
    return round3( clamp01(raw) )
```

`resolveConfidenceBand(confidence, DEFAULT_SCORING_CONFIG)` maps it to `verified ≥0.90 / high ≥0.82 / moderate ≥0.70 / low ≥0.55 / possible_match`. This reuses the *exact* band table already shipped (`scoringConfig.ts:213`), so cluster-assignment trust badges are visually consistent with exact-group and family trust badges. Every assignment also carries `evidenceRunIds` (the cluster members) for traceability — the Ledgerium evidence-link invariant.

---

## 4. Standard path + variants (deterministic)

This section formalizes and tightens what `variantDetector.ts` + `variantAnalyzer.ts` already do, and specifies running them **on the cluster** (not the signature group). Reuse `detectVariants` essentially as-is; the only changes are (a) its input is now a cluster's bundles, and (b) the tie-break is made total.

### 4.1 Variant enumeration within a cluster

Run `detectVariants(clusterBundles, options)` (variantDetector.ts). It already:
1. computes `computePathSignature` per run,
2. processes runs in `runId` order,
3. greedily assigns each run to the first existing variant whose `computeSignatureSimilarity ≥ variantSimilarityThreshold` (default `0.75`),
4. sorts variants by `(runCount DESC, signature.localeCompare)`,
5. labels index 0 the standard path, and reports `frequency = runCount / total`.

**One determinism tightening (net-new requirement):** greedy first-match is order-dependent only through the *processing order*, which is already pinned to `runId.localeCompare`. We additionally pin the **representative** of each variant to the run with the smallest `runId` in that variant (it already is, since first-match assigns the earliest runId as representative). This is already satisfied — we just assert it as an invariant test.

> Note on the variant threshold vs cluster threshold: `variantSimilarityThreshold (0.75)` ≥ `MERGE_THRESHOLD (0.72)`. This is intentional. Clustering says "these recordings are the same workflow"; variant detection *within* the cluster partitions them into distinct execution patterns at a **stricter** similarity. So a cluster of 20 runs may contain a standard path variant (12 runs) plus 3 minor variants — exactly the structure the variance/diverge-reconverge analysis needs.

### 4.2 Standard / reference path selection (deterministic spec)

```text
selectStandardPath(variants[]) -> ProcessVariant | null:
    if variants empty: return null
    // variants already sorted by (runCount DESC, signature.localeCompare ASC) in detectVariants
    return variants[0]
```

Tie-break chain, **total and reproducible**:
1. **Highest run count** (most frequent = the standard, per intelligence spec §12).
2. If tied on run count → **lexicographically smallest `pathSignature.signature`** (`localeCompare`). This is the existing `variantDetector.ts:80-84` tie-break.
3. (Cannot tie further: signatures within a variant set are the variant's representative signature; two variants with equal run count and equal signature would have been merged.) If a corpus ever produced equal count *and* equal signature for distinct variant ids, fall back to **smallest representative `runId`** as the absolute final key — guaranteeing a total order.

`buildVariantRecords` (variantAnalyzer.ts) then produces the full per-variant records, computing each variant's `deviationPoints`/`addedSteps`/`removedSteps`/`reorderedSteps` against the standard path's fingerprint sequence via `computeVariantDistance` (Wagner–Fischer). Frequencies, `isFastest`/`isSlowest`, and `confidenceScore` are already deterministic there (all sorts are total or rounded).

### 4.3 Sequence stability

`analyzeVariance(clusterBundles, options, standardPath.signature)` (varianceAnalyzer.ts) yields `sequenceStability = fraction of runs whose pathSignature == standard signature`. Now that the input is a *cluster* rather than a singleton signature group, this number is finally meaningful (it was always 1.0 under exact-signature grouping). High variance + low stability is the signal that triggers the diverge→reconverge analysis in §5.

---

## 5. Diverge → reconverge detection

**Question answered:** *Across all runs in a cluster, where does execution branch away from the common backbone, what alternative steps occur on each branch, where does it rejoin, and what fraction of runs take each branch?*

We give two deterministic procedures and combine them: a **MSA-backbone** method (primary, gives explicit branch/alternative/rejoin per branch with run fractions) and a **DFG split/join** cross-check (validates branch/join points via out-degree/in-degree). Both consume the cluster's fingerprint sequences.

### 5.1 Inputs and tokenization

For a cluster, let `traces[]` = each run's fingerprint sequence `fpSeq` (semantic signatures), in `runId` order. We diverge-analyze on fingerprints (semantic granularity); the same procedure works on `catSeq` if a coarser view is wanted (config flag `DR_TOKEN = "fingerprint" | "category"`).

### 5.2 Method 1 — LCS / MSA backbone (primary)

**Step 1 — pick the backbone.** The backbone is the **standard path variant's** fingerprint sequence (§4.2). It is the deterministic reference every other run is aligned against. (Choosing the most-frequent variant as the reference is the same principle as `deriveRecommendedCanonicalPath`.)

**Step 2 — align every run to the backbone.** Reuse `computeAlignment(runFpSeq, backboneFpSeq)` (Wagner–Fischer, variantAnalyzer.ts). The returned `operations[]` is a list of `match | insertion | deletion | substitution`, each tagged with `runIndex` and/or `canonIndex` (backbone index). This is *exactly* what `computeVariantDistance` already produces — we read its alignment instead of just its score.

**Step 3 — build "anchored segments."** Walk each run's alignment. A maximal run of `match` operations sits *on* the backbone (anchored). Any maximal run of non-match operations (`insertion`/`deletion`/`substitution`) between two anchor positions is a **deviation segment** with:
- `divergeAfter` = backbone index of the last matched backbone step before the segment (or `-1` = "from start"),
- `reconvergeAt` = backbone index of the first matched backbone step after the segment (or `BACKBONE_LEN` = "to end"),
- `altSteps[]` = the run's fingerprint tokens inserted/substituted within the segment (the alternative path actually taken), in run order; deletions contribute the backbone tokens that were skipped (recorded as `skippedBackbone[]`).

Formally:

```text
extractSegments(runFpSeq, backboneFpSeq) -> Segment[]:
    ops = computeAlignment(runFpSeq, backboneFpSeq).operations
    segs = []
    lastBackboneAnchor = -1
    cur = null                                   // open deviation segment or null
    for op in ops:
        if op.type == 'match':
            if cur != null:
                cur.reconvergeAt = op.canonIndex          // first matched backbone idx after deviation
                segs.push(cur) ; cur = null
            lastBackboneAnchor = op.canonIndex
        else:
            if cur == null:
                cur = { divergeAfter: lastBackboneAnchor, reconvergeAt: null,
                        altSteps: [], skippedBackbone: [] }
            if op.type == 'insertion'   : cur.altSteps.push(runFpSeq[op.runIndex])
            if op.type == 'substitution': cur.altSteps.push(runFpSeq[op.runIndex])
                                          cur.skippedBackbone.push(backboneFpSeq[op.canonIndex])
            if op.type == 'deletion'    : cur.skippedBackbone.push(backboneFpSeq[op.canonIndex])
    if cur != null:
        cur.reconvergeAt = BACKBONE_LEN                    // never rejoined → reconverges at end
        segs.push(cur)
    return segs
```

**Step 4 — aggregate segments into branches across all runs.** A **branch** is an equivalence class of segments that share the same `(divergeAfter, reconvergeAt, altStepsKey)` where `altStepsKey = altSteps.join("›")`. Group every run's segments by this key. For each branch:
- `divergeAfter`, `reconvergeAt` (backbone span it bypasses),
- `altSteps` (the alternative subsequence),
- `runCount` = number of distinct runs exhibiting this exact branch,
- `pctOfRuns` = `runCount / clusterRunCount`,
- `evidenceRunIds` (sorted) — evidence link.

```text
detectBranchesMSA(clusterTraces[], backboneFpSeq) -> Branch[]:
    branchMap = Map<key, { divergeAfter, reconvergeAt, altSteps, runIds:Set }>()
    for (runId, fpSeq) in clusterTraces sorted by runId:
        for seg in extractSegments(fpSeq, backboneFpSeq):
            key = seg.divergeAfter + "→" + seg.reconvergeAt + "::" + seg.altSteps.join("›")
            entry = branchMap.getOrInit(key, {divergeAfter, reconvergeAt, altSteps: seg.altSteps, runIds: new Set})
            entry.runIds.add(runId)
    branches = branchMap.values().map(e => ({
        divergeAfter: e.divergeAfter,
        reconvergeAt: e.reconvergeAt,
        altSteps:     e.altSteps,
        runCount:     e.runIds.size,
        pctOfRuns:    round3(e.runIds.size / clusterRunCount),
        evidenceRunIds: [...e.runIds].sortLocale(),
    }))
    // deterministic ordering: by pctOfRuns DESC, then divergeAfter ASC, reconvergeAt ASC, altStepsKey ASC
    branches.sortStable( by -pctOfRuns, divergeAfter, reconvergeAt, altStepsKey )
    return branches
```

The set of distinct `divergeAfter` values are the **divergence points** (backbone positions after which runs branch); the set of distinct `reconvergeAt` values are the **reconvergence points** (backbone positions where branches rejoin). Backbone steps that all runs traverse identically (no segment spans them) are the stable spine.

### 5.3 Method 2 — DFG split/join (cross-check)

Build the cluster's **Directly-Follows Graph** deterministically and confirm branch/join points via degree.

```text
buildDFG(clusterTraces[]) -> { nodes:Set<token>, edges: Map<"a»b", count> }:
    edges = Map()
    for (runId, fpSeq) in clusterTraces sorted by runId:
        seq = ["▶START"] + fpSeq + ["■END"]
        for i in 0 .. seq.length-2:
            edges["${seq[i]}»${seq[i+1]}"] += 1
    return aggregate

splitNodes(dfg) = { a : outDegree(a) > 1 }      // a node from which execution can go ≥2 ways  → DIVERGENCE
joinNodes(dfg)  = { b : inDegree(b)  > 1 }       // a node reachable from ≥2 predecessors        → RECONVERGENCE
```

`outDegree(a)` = count of distinct `b` with `edges["a»b"] > 0`. A backbone token that is a `splitNode` corresponds to a `divergeAfter` point from Method 1; a `joinNode` corresponds to a `reconvergeAt` point. We use Method 2 only to **validate**: every Method-1 divergence/reconvergence point should map onto a DFG split/join node. Disagreements (e.g., a substitution that does not create a DFG split because the substituted token is unique) are reconciled in favor of Method 1 (it is run-attributed and gives explicit branch fractions; DFG aggregates lose per-run attribution). DFG edge counts also give per-edge frequencies that corroborate `pctOfRuns`.

**Why both.** MSA-backbone gives the *human-meaningful* answer (this branch happens after step X, does Y instead of Z, rejoins at step W, in 35% of runs). DFG split/join gives a *graph-theoretic confirmation* and a global view including loops/rework that pairwise-to-backbone alignment can under-represent. Reporting both, with MSA as the source of truth, maximizes correctness and explainability.

### 5.4 Deterministic procedure (full)

```text
function analyzeDivergeReconverge(clusterBundles[], standardVariant, config) -> DivergeReconvergeReport:
    traces = clusterBundles
                .map(b => ({ runId: b.processRun.runId,
                             fpSeq: fingerprintWorkflowSteps(b.processDefinition.stepDefinitions, b.processRun.runId)
                                       .map(fp => fp.semanticSignature) }))
                .sortStable(by runId.localeCompare)
    backbone = standardVariant.fpSeq                            // §4.2 standard path fingerprints
    if traces.length < 2 or backbone.length == 0:
        return emptyReport(reason="insufficient runs")

    branches = detectBranchesMSA(traces, backbone)             // §5.2 — primary
    dfg      = buildDFG(traces)                                 // §5.3 — cross-check
    splits   = splitNodes(dfg) ; joins = joinNodes(dfg)

    // annotate each branch with DFG confirmation
    for br in branches:
        br.divergeConfirmedByDFG  = backbone[br.divergeAfter]  in splits   (if divergeAfter in range)
        br.reconvergeConfirmedByDFG = (br.reconvergeAt < backbone.length) and (backbone[br.reconvergeAt] in joins)

    return {
        ruleVersion: config.ruleVersion,
        algorithmVersion: ALGORITHM_VERSION,
        backboneLength: backbone.length,
        backboneSignature: backbone.join(":"),
        divergencePoints: distinct(branches.map(b => b.divergeAfter)).sortAsc(),
        reconvergencePoints: distinct(branches.map(b => b.reconvergeAt)).sortAsc(),
        branches,                                              // sorted: pctOfRuns DESC, then positional
        runCount: traces.length,
        evidenceRunIds: traces.map(t => t.runId),              // already sorted
        computedAt: PROVIDED_BY_CALLER_NOT_BY_ALGORITHM,       // timestamp injected outside the pure fn (see §6)
    }
```

### 5.5 Worked example — 3 short traces

Three runs in one cluster. Fingerprints abbreviated to single letters for readability (each letter = a `verb:object:system:eventType` token). Backbone is the most-frequent variant.

```text
Run r1 (standard):  A  B  C  D  E
Run r2:             A  B  X  D  E          // substitutes C → X between B and D
Run r3:             A  B  C  Q  D  E        // inserts Q between C and D
```

Suppose r1's pattern is the most frequent (the standard). **Backbone = [A, B, C, D, E]**, `BACKBONE_LEN = 5`, backbone indices `A=0 B=1 C=2 D=3 E=4`.

**Align r2 → backbone** (`computeAlignment([A,B,X,D,E], [A,B,C,D,E])`):
```
match A(0)  match B(1)  substitution X↔C(2)  match D(3)  match E(4)
```
`extractSegments`: one deviation segment at the substitution:
- `divergeAfter = 1` (last anchor before deviation = B@1)
- `reconvergeAt = 3` (first anchor after = D@3)
- `altSteps = [X]`, `skippedBackbone = [C]`
- ⇒ **Branch β1**: after backbone step 1 (B), do `[X]` instead of backbone[2..3)=`[C]`, rejoin at step 3 (D).

**Align r3 → backbone** (`computeAlignment([A,B,C,Q,D,E], [A,B,C,D,E])`):
```
match A(0)  match B(1)  match C(2)  insertion Q  match D(3)  match E(4)
```
`extractSegments`: one deviation segment at the insertion:
- `divergeAfter = 2` (last anchor = C@2)
- `reconvergeAt = 3` (first anchor after = D@3)
- `altSteps = [Q]`, `skippedBackbone = []`
- ⇒ **Branch β2**: after backbone step 2 (C), do `[Q]` (an extra step), rejoin at step 3 (D).

**Align r1 → backbone:** all matches, no segments.

**Aggregate `detectBranchesMSA`** over {r1, r2, r3}, clusterRunCount = 3:

| Branch | divergeAfter | reconvergeAt | altSteps | runCount | pctOfRuns | evidenceRunIds |
| --- | --- | --- | --- | --- | --- | --- |
| β1 | 1 (after B) | 3 (at D) | [X] | 1 | 0.333 | [r2] |
| β2 | 2 (after C) | 3 (at D) | [Q] | 1 | 0.333 | [r3] |

`divergencePoints = {1, 2}`, `reconvergencePoints = {3}`. The stable spine is `A → B → … → D → E`; both deviations rejoin at **D**.

**DFG cross-check.** Edges (with `▶START`/`■END`):
```
▶»A:3   A»B:3   B»C:2   B»X:1   C»D:1   C»Q:1   X»D:1   Q»D:1   D»E:3   E»■:3
```
- `outDegree(B)=2` ({C, X}) → **B is a split node** ⇒ confirms β1 divergence after B ✓
- `outDegree(C)=2` ({D, Q}) → **C is a split node** ⇒ confirms β2 divergence after C ✓
- `inDegree(D)=3` ({C, X, Q}) → **D is a join node** ⇒ confirms reconvergence at D for both branches ✓

So the report deterministically states: *"Two divergences from the standard path, both rejoining at step D (index 3). 33% of runs substitute X for C after B; 33% insert an extra step Q after C. 33% follow the standard path exactly (sequenceStability = 0.333)."* Every claim is backed by `evidenceRunIds`.

### 5.6 Edge cases (all deterministic)

- **Never-rejoins (tail divergence):** `reconvergeAt = BACKBONE_LEN`. Reported as a branch that diverges and ends differently (e.g., an error-recovery tail).
- **Diverges from start:** `divergeAfter = -1` ("before backbone step 0").
- **Loops / rework:** pairwise-to-backbone alignment linearizes loops; the DFG cross-check surfaces back-edges (`edges["b»a"]` where `a` precedes `b` on backbone) as a `reworkEdge` flag on the report. Loop *structure* is reported descriptively; we do not attempt loop unrolling in v1 (out of scope, flagged).
- **Empty / single-run cluster:** `analyzeDivergeReconverge` returns an empty report with `reason`; no branches.

---

## 6. Complexity, determinism, reuse-vs-net-new

### 6.1 Complexity

Let `n` = recordings in scope, `L` = avg steps/recording, `S` = avg shingles ≈ `L`, `B` = avg LSH bucket size, `E` = candidate edges, `m` = cluster size.

| Stage | Cost | Notes |
| --- | --- | --- |
| `buildTraceProfile` × n | `O(n·L)` | fingerprint + shingle + sets, all linear in steps |
| MinHash signatures | `O(n·S·H)` | `H=128`; per-shingle inner loop is the constant |
| LSH bucketing | `O(n·BANDS)` | `BANDS=32`; emits candidate pairs |
| Candidate pairs | `O(Σ buckets B²)` ≈ `O(n·B)` typical | bounded; brute-force `O(n²)` only when `n ≤ 200` |
| Exact scoring on edges | `O(E·L²)` | each `traceSimilarity` runs one Wagner–Fischer `O(L²)`; **E ≪ n²** thanks to LSH |
| Union-find agglomeration | `O(E·α(n))` | near-linear in edges |
| Split cohesion check | `O(Σ m²·L²)` over split clusters only | bounded by `SPLIT_MAX_DEPTH=3`; fires rarely |
| Variant detection / cluster | `O(m²·L²)` worst (greedy first-match × alignment) | reuses `detectVariants`; m is cluster-sized, not n |
| Diverge→reconverge / cluster | `O(m·L²)` align each run to backbone + `O(m·L)` DFG | one alignment per run, not pairwise |

**Net:** the dominant term is `O(n·S·H)` (MinHash) plus `O(E·L²)` (exact candidate scoring). Both are sub-quadratic in `n` because `E` is LSH-bounded — this is precisely the O(n²) avoidance the design requires. The exact-signature fallback adds only `O(n)` Map lookups.

### 6.2 Determinism guarantees (summary)

1. **No `Date.now()` / `Math.random()` in any decision path.** `computedAt` timestamps are injected by the *caller* (`intelligence.ts`) into the output struct **after** the pure algorithm returns — exactly as `varianceAnalyzer.ts`/`variantDetector.ts` already do (`const now = new Date().toISOString()` lives in the orchestrator-facing function, never inside a comparison). For clustering we go one step further: the pure `clusterTraces` returns no timestamp; the persistence layer stamps it. This keeps the algorithm output byte-identical and quarantines the only nondeterministic value to a metadata field never used in any branch.
2. **Hashing is pinned & integer.** FNV-1a + affine MinHash with frozen `A[]`,`B[]` literal tables and pinned `P`. No runtime seeding.
3. **Stable sorts everywhere**, with **total orders** (every sort comparator ends in a `runId`/`clusterId` `localeCompare` tie-break, never a partial order). MinHash uses `min` (order-free); LSH bucket members are appended in `runId`-sorted order; edges sorted by `(−score, lo, hi)`; union direction pinned by lexical root.
4. **Set/Map iteration never decides an output** (only membership/size/`min` over sets; outputs are derived from sorted arrays).
5. **Floating point quarantined by `round3`** at every threshold boundary, so summation order cannot flip a `≥ MERGE_THRESHOLD` test.
6. **`ALGORITHM_VERSION` hash** over all weights/thresholds/seeds makes any tuning change visible and forces recompute; identical version + identical input ⇒ identical bytes.
7. **Incremental is explicitly provisional** and reconciles to the canonical batch result; the divergence is logged, never silent.

### 6.3 Reuse vs net-new (final)

**Reuse verbatim (no changes):**
- `computePathSignature`, `bigramJaccardSimilarity`, `computeSignatureSimilarity` (pathSignature.ts) — feature backbone + `simCat`.
- `computeAlignment` / `computeVariantDistance` (variantAnalyzer.ts) — Wagner–Fischer for `simLCS` and for §5 segment extraction.
- `fingerprintWorkflowSteps`, `fingerprintStep`, `hashStepSequence` (stepFingerprinter.ts) — `fpSeq`, shingles, anchors.
- `analyzeVariance` (varianceAnalyzer.ts), `detectVariants` (variantDetector.ts), `buildVariantRecords` (variantAnalyzer.ts) — §4, now fed a *cluster* instead of a signature group.
- `setOverlap` (scoringConfig.ts) — system-set Jaccard helper basis.
- `resolveConfidenceBand`, `DEFAULT_SCORING_CONFIG`, `SCORING_MODEL_VERSION` (scoringConfig.ts) — §3.2 confidence bands.
- union-find idiom (`find`/`union` in intelligence.ts) — §2.3 agglomeration.
- `titleNormalizer.ts` / `familyScorer.ts` — remain the layer **above** clustering (family/template grouping over clusters); clustering output becomes their input (replaces the current per-signature group input).

**Net-new modules (to add under `packages/intelligence-engine/src/`):**
- `traceProfile.ts` — `buildTraceProfile`, `shingles`, `TraceProfile` type (§1.1–1.2).
- `traceSimilarity.ts` — `traceSimilarity` + weights + `LCS_HARD_FLOOR` guard (§1.3).
- `minhashLsh.ts` — `fnv1a`, frozen `A[]`/`B[]` tables, `minhashSignature`, `lshCandidateGeneration`, `BRUTE_FORCE_N` fallback (§2.2).
- `traceClusterer.ts` — `clusterTraces` (batch), `assignIncremental`, `singleLinkAgglomerate`, `splitIfIncoherent`, `clusterId`, `ALGORITHM_VERSION` (§2).
- `clusterThresholds.ts` — pinned threshold constants + `chooseThreshold` offline tuner + `assignmentConfidence` (§3).
- `divergeReconverge.ts` — `extractSegments`, `detectBranchesMSA`, `buildDFG`, `splitNodes`/`joinNodes`, `analyzeDivergeReconverge` (§5).

**Net-new wiring (in `apps/web-app/src/lib/intelligence.ts`):**
- Replace the exact-signature `Map<string, Bundle[]>` grouping in `clusterWorkflows()` (lines 132–150) with `clusterTraces(bundles, config)`; iterate `assignment.clusters` instead of `groups`. Everything downstream (ProcessDefinition upsert, `detectVariants`, `analyzeVariance`, family detection, component detection) consumes a cluster's bundles unchanged. Persist `ALGORITHM_VERSION` on `ProcessDefinition` (new column, additive) and store the `DivergeReconvergeReport` in `intelligenceJson` alongside the existing portfolio object. Add the surrogate-key re-pointing layer (§2.5) so `ProcessDefinition.id` stays stable across re-clusters for UI continuity. Timestamps (`computedAt`, `analyzedAt`) are stamped here, outside the pure algorithm.

**Out of scope (flagged, not silently dropped):** loop unrolling in diverge-reconverge (v1 reports rework edges descriptively); the data-driven threshold tuner requires a curated corpus (ships with conservative `0.72` default until then); persistence schema migration for the new `ALGORITHM_VERSION` column and the cluster↔ProcessDefinition surrogate-key table is a separate iteration.

---

## Appendix A — Pinned constants (enter `ALGORITHM_VERSION`)

```text
// Metric weights (sum = 1.0)
W_LCS = 0.45 ; W_SHINGLE = 0.25 ; W_CAT = 0.15 ; W_SYS = 0.15
// Guards & thresholds
LCS_HARD_FLOOR = 0.30
MERGE_THRESHOLD = 0.72                 // conservative default; data-driven tuner may override → re-pin + bump version
SPLIT_COHESION_FLOOR = 0.55 ; SPLIT_STEP = 0.07 ; SPLIT_MAX_DEPTH = 3
MERGE_BRIDGE_FLOOR = MERGE_THRESHOLD
// Shingling
K_SHINGLE = 2
// MinHash / LSH
H = 128 ; BANDS = 32 ; ROWS = 4 ; P = 4294967311
FNV_OFFSET = 2166136261 ; FNV_PRIME = 16777619
A[] , B[] : frozen literal tables length H (checked into minhashLsh.ts; documented deterministic generator, never runtime-random)
BRUTE_FORCE_N = 200
// Representatives
REP_CAP = 8
// Variant detection (reused)
VARIANT_SIMILARITY_THRESHOLD = 0.75    // INTELLIGENCE_DEFAULTS (types.ts)
// Diverge-reconverge
DR_TOKEN = "fingerprint"               // "fingerprint" | "category"
// Versions
INTELLIGENCE_ENGINE_VERSION = "1.0.0" ; SCORING_MODEL_VERSION = "1.0.0"
```

## Appendix B — Invariant tests to ship with the implementation

1. **Idempotence:** `clusterTraces(B) === clusterTraces(B)` byte-identical (JSON deep-equal) across 2 calls and across input permutations of `B`.
2. **Permutation invariance:** shuffling `bundles[]` yields identical `ClusterAssignment` (proves runId-canonical ordering, not array order, drives output).
3. **Superset guarantee:** every pair merged by old exact-signature grouping is in the same cluster under the new algorithm (exact-signature fallback candidate test).
4. **LCS guard:** any pair with `simLCS < 0.30` is never co-clustered directly (only via chaining, which split bounds).
5. **MinHash determinism:** `minhashSignature(S)` independent of `S` insertion order; empty set → canonical all-`P-1` signature.
6. **Diverge-reconverge worked example (§5.5):** the 3-trace fixture yields exactly β1, β2, divergencePoints {1,2}, reconvergencePoints {3}, with DFG confirmation flags true.
7. **Symmetry:** `traceSimilarity(A,B) === traceSimilarity(B,A)`.
8. **Version pinning:** changing any Appendix-A constant flips `ALGORITHM_VERSION`.
