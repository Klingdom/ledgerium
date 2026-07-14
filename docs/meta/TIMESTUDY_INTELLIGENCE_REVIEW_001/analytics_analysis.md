# Cross-Workflow Intelligence — Analytical Model (Analytics Review)

**Artifact type:** Mode 3-adjacent design review — analysis only, ZERO code changes
**Date:** 2026-07-12
**Author:** analytics agent
**Directive:** CEO — system should cluster/compare/contrast/find relationships across ALL workflows, with a dramatically better time-study view.

**Input artifacts read:**
- `packages/intelligence-engine/src/{timestudyAnalyzer,varianceAnalyzer,stats,pathSignature,stepFingerprinter,metricsBuilder,scoringConfig,bottleneckDetector,driftDetector,divergenceAnalyzer,variantDetector,variantAnalyzer,standardizationScorer,automationScorer,componentDetector,componentReuseScorer,titleNormalizer,exactGroupScorer,familyScorer,groupingTypes,types,index}.ts`
- `packages/intelligence-engine/src/clustering/{traceSimilarity,clusterSignatures}.ts`
- `apps/web-app/src/app/(app)/analytics/{page.tsx, process/[id]/page.tsx}`
- `apps/web-app/src/lib/{workflow-metrics.ts, intelligence.ts, workflowGrouping.ts}`
- `apps/web-app/prisma/schema.prisma` (`ProcessFamily`, `ProcessDefinition`, `ProcessVariantRecord`, `CanonicalComponentRecord`, `GroupRelationship`)
- `docs/features/process-variation/{PRD_PROCESS_VARIATION.md, MEASUREMENT_PLAN_PROCESS_VARIATION.md}` (Draft, awaiting CEO review — precedent for the exact-group / variant layer of this same problem)

---

## 0. Headline finding — this is a wiring gap, not an algorithm gap

The deterministic building blocks the CEO is asking for are **already built as pure, tested, unit-covered functions** in `packages/intelligence-engine/src/`. What is missing is (a) a feature vector that spans **all** workflows regardless of exact-group membership, (b) a small set of new relationship types (subset/superset), and (c) a UI surface that reads the already-persisted `ProcessFamily` / `GroupRelationship` / `CanonicalComponentRecord` tables — confirmed via Grep to have **zero UI consumers today**. `apps/web-app/src/app/(app)/analytics/*` only renders `ProcessDefinition` (exact-group) drill-downs; it never queries `ProcessFamily` or `GroupRelationship`. The `clustering/` module (`traceSimilarity.ts`, `clusterSignatures.ts`) is explicitly documented as "pure and UNWIRED... does not touch the database, the live `clusterWorkflows()` path, or any UI."

This review defines the analytical model needed to close that gap. It does not propose new algorithms where existing ones suffice — it names them, states their current wiring status, and identifies the specific extensions required.

---

## 1. Dimensional model — the workflow feature vector

Every workflow (a `ProcessRunBundle` from `@ledgerium/process-engine`, or an aggregated `ProcessDefinition` once ≥2 runs cluster) already reduces to a set of deterministic, privacy-safe features. None require new capture — all derive from already-normalized `ProcessRun` / `ProcessDefinition` / `StepDefinition` data.

| Dimension | Feature | Source (already computed) | Grain | Status |
|---|---|---|---|---|
| **Structural** | Path signature (ordered step-category sequence) | `computePathSignature()` — `pathSignature.ts` | per-run | ✅ computed, used for exact-group only |
| | Step count | `PathSignature.stepCount` | per-run | ✅ |
| | Step-category histogram (frequency of each `GroupingReason`) | derivable from `stepCategories` array | per-run | ⚠️ not exposed as a named function — trivial reduce, ~10 LOC |
| | Verb/object action-type histogram | `fingerprintWorkflowSteps()` → `StepFingerprint.verb` / `.object` | per-run | ⚠️ fingerprints computed in `intelligence.ts`; histogram not materialized |
| | Start/end anchor (semantic signature of first/last step) | `WorkflowRunRecord.startAnchor` / `.endAnchor` | per-run | ✅ persisted on `ProcessDefinition.startAnchor/endAnchor` |
| **Timing** | Total duration (mean/median/p90/stdDev) | `analyzeTimestudy()` — `timestudyAnalyzer.ts` | per-process-group | ✅ |
| | Per-step-position duration stats | `StepPositionTimestudy[]` | per-process-group | ✅ |
| | Duration coefficient of variation | `varianceAnalyzer.ts` `durationVariance.coefficientOfVariation` | per-process-group | ✅ |
| **Systems** | Systems touched (set) | `ProcessMetrics.uniqueSystems` — `metricsBuilder.ts`; per-step `StepFingerprint.system` | per-run & per-group | ✅ |
| | System-transition graph (directly-follows edges) | `dfgDegrees()` inside `divergenceAnalyzer.ts` (internal; generalizable) | per-group | ⚠️ built as internal helper for divergence DFG cross-check only — not exported as a standalone signal |
| **Variant structure** | Variant count / variant frequency distribution | `detectVariants()` — `variantDetector.ts` | per-group | ✅ |
| | Standard-path frequency | `VariantSet.standardPath.frequency` | per-group | ✅ |
| | Sequence stability (fraction on standard path) | `varianceAnalyzer.ts` `sequenceStability` | per-group | ✅ |
| | Deviation score vs. canonical (0=identical, 1=totally different) | `computeVariantDistance()` — `variantAnalyzer.ts` | per-run vs. canonical | ✅ |
| **Bottleneck profile** | High-duration / high-CV step positions | `detectBottlenecks()` — `bottleneckDetector.ts` | per-group | ✅ |
| | Bottleneck labels (top insight) | `computeBottleneckLabel()` — `workflow-metrics.ts` | per-workflow (DB-level `ProcessInsight`) | ✅ |
| **Quality / maturity** | Standardization score (0-100) + 4-factor breakdown | `computeStandardizationScore()` — `standardizationScorer.ts` | per-group | ✅ |
| | Documentation drift score vs. SOP | `computeDocumentationDriftScore()` | per-group | ✅ |
| | Confidence / data-quality | `HealthScoreV2.dataQuality` — `workflow-metrics.ts` | per-workflow | ✅ |
| **Automation opportunity** | AI opportunity score (0-100), auditable | `computeAiOpportunityScore()` — `workflow-metrics.ts`; `scoreAutomationOpportunity()` — `automationScorer.ts` (richer 9-factor form, unwired to UI) | per-workflow / per-group | ✅ (two implementations — see §6 open question) |
| **Identity / naming** | Normalized title (action/entity/artifact/qualifier) | `normalizeTitle()` — `titleNormalizer.ts` | per-workflow | ✅ |
| | Family signature (action+entity+artifact, qualifier-stripped) | `NormalizedTitle.familySignature` | per-workflow | ✅ computed in `intelligence.ts`, persisted on `ProcessDefinition.nameSignature`, **never read back for clustering decisions** |
| **Reuse** | Canonical component membership (verb:object recurring across workflows) | `detectComponents()` — `componentDetector.ts` | cross-workflow | ✅ computed + persisted (`CanonicalComponentRecord`), **zero UI reads** |

**The feature vector for cross-workflow clustering (this task's ask) should be a fixed-order tuple:**

```
WorkflowFeatureVector = {
  pathSignature: PathSignature,               // computePathSignature()
  normalizedTitle: NormalizedTitle,            // normalizeTitle()
  stepFingerprints: StepFingerprint[],         // fingerprintWorkflowSteps()
  systems: string[],                           // Set<string>, sorted
  avgDurationMs: number | null,
  stepCount: number,
  variantCount: number | null,                 // from owning ProcessDefinition, if any
  standardizationScore: number | null,         // computeStandardizationScore().score
  aiOpportunityScore: number,                   // computeAiOpportunityScore()
}
```

This is a strict superset of what `exactGroupScorer.ts` and `familyScorer.ts` already consume (`WorkflowRunRecord`) — no new capture, only a materialization step that runs once across the full workflow set instead of only within a pre-formed exact group.

---

## 2. Deterministic clustering approach

**No randomness anywhere in this design.** Three deterministic layers, all already implemented except the third:

### Layer 1 — Structural pre-clustering (exists, unwired to production default)

`clusterSignatures()` (`clustering/clusterSignatures.ts`) is single-link / connected-components union-find over pairs whose `traceSimilarity()` ≥ threshold. `traceSimilarity()` blends:

```
blended = 0.6 · lcsSimilarity(categorySeq_a, categorySeq_b) + 0.4 · computeSignatureSimilarity(a, b)
```

with an LCS hard floor (0.3) as a precision guard against false merges on category overlap alone. This is **already fully deterministic**: inputs sorted by id, union always toward the lexicographically smaller root, stable ordering, version-hashed config (`configHash()`). It is wired behind an env flag (`LEDGERIUM_SIMILARITY_CLUSTERING`) in `workflowGrouping.ts` but defaults OFF.

**Recommendation:** this stays the layer that forms `ProcessDefinition` (exact-group) boundaries. No change needed to the algorithm — only the flag/threshold decision, which is a product call, not an analytics one.

### Layer 2 — Family clustering (exists as pairwise scorer, needs a clustering wrapper)

`scoreFamilyMembership()` (`familyScorer.ts`) is already a deterministic pairwise scorer (7 weighted dimensions, thresholds `sameFamily ≥ 0.80` / `likelyFamily ≥ 0.68` / `possibleRelated ≥ 0.55`) that operates **across process groups**, not just within one. What is missing is only the aggregation step: run `scoreFamilyMembership()` pairwise across all `ProcessDefinition` rows for a user (O(n²), same complexity class as `clusterSignatures()`), then union-find on `decision ∈ {same_family, likely_family}` exactly as Layer 1 does for exact groups. This produces `ProcessFamily` clusters using the SAME deterministic union-find pattern already proven in `clusterSignatures.ts` — copy the pattern, swap the pairwise scorer.

### Layer 3 — Full-portfolio hierarchical view (new: a threshold ladder over one distance metric)

For a genuinely "cluster/compare/contrast across ALL workflows" view (not gated by pre-existing exact-group boundaries), define one composite **distance function** (not similarity — makes the hierarchical-clustering framing explicit) over the feature vector in §1:

```
distance(A, B) = 1 − [
    0.35 · traceSimilarity(A.pathSignature, B.pathSignature)
  + 0.20 · titleFamilySimilarity(A.normalizedTitle, B.normalizedTitle)
  + 0.20 · setOverlap(A.systems, B.systems)
  + 0.15 · sequenceFingerSimilarity(A.stepFingerprints, B.stepFingerprints)
  + 0.10 · durationBandSimilarity(A.avgDurationMs, B.avgDurationMs)
]
```

All five sub-terms already exist (`traceSimilarity`, `titleFamilySimilarity`, `setOverlap`, `sequenceFingerSimilarity` — all pure, all in `intelligence-engine`). `durationBandSimilarity` is the one net-new function needed: a simple deterministic band function (e.g. `1 − |log(A) − log(B)| / log(maxRatio)`, clamped [0,1]) — this avoids raw-ms comparison dominating the score for processes that are structurally identical but scale differently by data volume.

**Deterministic threshold-ladder clustering** (agglomerative, complete-linkage, no randomness):
- `distance ≤ 0.10` → same exact group (already Layer 1)
- `distance ≤ 0.32` → same family (already Layer 2, `sameFamily` threshold inverted)
- `distance ≤ 0.45` → "related process" — surfaced as `possible_match` relationship, not merged
- `distance > 0.45` → no relationship surfaced

Complete-linkage (not single-link) is deliberately recommended for Layer 3 to avoid the "chaining" failure mode where A~B~C merges A and C despite A and C being dissimilar — single-link is appropriate for Layer 1 (byte-near-identical structural merge) but not for a loose full-portfolio browse view where chaining would produce an uninterpretable mega-cluster.

### Cluster naming (deterministic, no LLM)

For any formed cluster (family or full-portfolio group):
1. **Primary name** = the `familySignature` (or `exactSignature` for finer-grained) of the member with the highest `runCount` — deterministic because run counts are stable ints, tie-break by lexicographically smallest workflow id.
2. **Subtitle** = dominant `componentName` from `detectComponents()` output restricted to the cluster's fingerprints (e.g. "Send Email · Download Report").
3. **Badge** = `variantCount` + majority `opportunityTag` across members.

This reuses `generateComponentName()` (`componentDetector.ts`) verbatim — already produces human-readable "Verb Object (System)" strings from parsed fingerprints.

---

## 3. Comparison measures — compare/contrast any 2 (or N) workflows

All of the following already exist as pure functions; the gap is a UI surface + an N-way generalization of what's currently exposed only as portfolio-wide (all runs vs. all runs) or pairwise-canonical (one run vs. the group's standard path).

| Comparison measure | Function | Current scope | N-way generalization needed? |
|---|---|---|---|
| **Step-level alignment / diff** | `computeVariantDistance()` — Wagner–Fischer edit-distance alignment on semantic signatures, returns `DeviationPoint[]` (`insertion`/`deletion`/`substitution`) | run vs. canonical | No — call pairwise for any 2 selected workflows, already accepts arbitrary `StepFingerprint[]` pairs |
| **Time-per-step delta** | Join `StepPositionTimestudy[]` (per position) across two variants/workflows by ordinal | portfolio-wide (one process group) | Yes — needs a per-workflow-pair join keyed by LCS-aligned position (not raw ordinal, since insertions shift downstream positions) — reuse `lcsAlignment()` from `divergenceAnalyzer.ts`, which already returns matched `[runIndex, backboneIndex]` pairs |
| **Path divergence %** | `VariantDistanceResult.deviationScore` (0=identical, 1=totally different) | run vs. canonical | No — symmetric, works for any pair |
| **Shared vs. unique steps** | Set ops (`setOverlap()` from `scoringConfig.ts`) over `StepFingerprint.semanticSignature` sets | used internally in `familyScorer.computeSharedComponentRatio()` | No — expose the intersection/difference sets themselves (currently only the ratio is returned; the raw sets are one line away) |
| **Bottleneck comparison** | `detectBottlenecks()` per variant, then diff `BottleneckStep[]` by `position`/`category` | per process group | Yes — needs to run once per variant (today it runs once per group across all runs, conflating variants); straightforward — call `detectBottlenecks()` with the variant's `evidenceRunIds` subset instead of the full group |
| **Variant overlap (N-way)** | `analyzeDivergence()` — LCS-backbone alignment of ALL runs against one shared backbone; returns aggregated `DivergenceBranch[]` with `evidenceRunIds`, `frequency`, DFG-confirmed split/join | N runs vs. 1 backbone | **This is already the N-way primitive.** For "compare 4 selected workflows," treat one of them (or the family's standard path) as the backbone and pass the other 3+ as `DivergenceRun[]` — zero new code |
| **Duration-band comparison** | `avgDurationMs` per variant + `bottleneckDurationMultiplier` ratio | per group | No |
| **Standardization delta** | `computeStandardizationScore()` re-run on a filtered subset (e.g. before/after a training rollout) | any subset of runs | No — already accepts arbitrary `bundles: ProcessRunBundle[]` |

**Recommended comparison API shape** (for the "select 2-6 workflows and compare" UI):

```ts
compareWorkflows(workflows: ProcessRunBundle[], backboneSource: 'first' | 'standardPath' | WorkflowId) → {
  backbone: string[];                          // category sequence used as reference
  perWorkflow: Array<{
    id: string;
    deviationScore: number;                    // computeVariantDistance()
    addedSteps: string[]; removedSteps: string[]; reorderedSteps: string[];
    stepTimeDeltas: Array<{ position: number; category: string; deltaMs: number; deltaPct: number }>;
    sharedStepSignatures: string[];             // set intersection
    uniqueStepSignatures: string[];             // set difference
  }>;
  divergence: DivergenceAnalysis;               // analyzeDivergence() — the N-way branch structure
  bottleneckDiff: Array<{ position: number; category: string; workflowsAffected: string[] }>;
}
```

Every field traces to an existing pure function; this is an orchestration layer, not new algorithm design.

---

## 4. Relationship signals for a workflow graph

`GroupRelationship` (`groupingTypes.ts`, persisted via `apps/web-app/prisma/schema.prisma` model `GroupRelationship`) already models a typed graph:

| `RelationshipType` (existing) | Derivation (existing) | Status |
|---|---|---|
| `same_family` | `scoreFamilyMembership()` decision ∈ `{same_family, likely_family}` | ✅ computed in `familyScorer.generateRunRelationships()`, persisted, **not read by UI** |
| `possible_match` | `evaluatePossibleMatch()` — borderline family score (0.35–0.67) or low-sample-size | ✅ |
| `shares_component` | `detectComponents()` → any workflow pair using the same `CanonicalComponent` | ✅ |
| `template_like` | `isParameterizedVariant()` — same family signature, different qualifier (e.g. "Email Customer US Report" vs "...EMEA Report") | ✅ |
| `variant_like` | declared in the type union, **not yet emitted by any scorer** | ⚠️ gap — should fire when two workflows are in the same `ProcessDefinition` but different `ProcessVariantRecord` |
| `parent_child` | declared in the type union, **not yet emitted by any scorer** | ⚠️ gap — intended semantics unclear from code; needs a PM decision on what "parent/child" means for a process (sub-process invocation? sequential dependency?) |

**Gap identified by this review — subset/superset is not modeled at all.** The CEO's ask ("find relationships across ALL workflows") implies detecting e.g. "Workflow B is Workflow A plus 2 extra approval steps" — a containment relationship, not a similarity one. This is derivable deterministically and cheaply from data the engine already produces:

```
isSubsequence(shorter.stepCategories, longer.stepCategories) via LCS containment ratio:
  containmentRatio = editDistance-free check: LCS(shorter, longer) === shorter.length
```

Reusing `lcsAlignment()` (already in `divergenceAnalyzer.ts`) — if all of the shorter sequence's categories appear as matched anchors (no insertions on the shorter side), the shorter workflow's path is a strict subsequence of the longer one's. Propose two new `ExplanationCode`/`RelationshipType` entries:

- `subset_of` — A's step sequence is a full ordered subsequence of B's (A is "B minus some optional steps")
- `superset_of` — inverse of the above (symmetric pair, always emitted together)

**"Shared subprocess"** is already representable without new types: `shares_component` with a **high `groupCount`/`familyCount` ratio** on the shared `CanonicalComponent` (`componentDetector.ts` already tracks both). A component appearing in 5+ distinct families with `commonPredecessors`/`commonSuccessors` forming a contiguous multi-step run (not just one isolated step) is a shared subprocess — this needs a small aggregation (chain 2+ adjacent shared components into a "shared segment") that is not yet built, but the raw signal (`commonPredecessors`/`commonSuccessors` maps) already exists in `CanonicalComponent`.

**Graph rendering:** nodes = `{ProcessDefinition, ProcessFamily}` (two node types), edges = `GroupRelationship` rows filtered/weighted by `confidenceScore`. This is a direct read of already-persisted tables — no new backend computation needed to ship a first version of the graph view; the blocker is purely the two new relationship types plus a UI.

---

## 5. KPI / insight set for the time-study view

The CEO's example — *"these 4 workflows are the same process with 3 variants; variant B is 40% slower at step 5"* — decomposes exactly into existing primitives:

1. **"Same process with 3 variants"** → `ProcessDefinition.canonicalName` + `VariantSet.variantCount` (`detectVariants()`).
2. **"Variant B is 40% slower at step 5"** → per-variant `StepPositionTimestudy` at `position=5`, compared: `(variantB.meanDurationMs − standardPath.meanDurationMs) / standardPath.meanDurationMs`. This requires timestudy to be computed **per-variant** (currently `analyzeTimestudy()` runs once across ALL runs in a group, not split by variant) — the fix is to call it once per `evidenceRunIds` subset per variant, same pattern noted in §3 for bottlenecks.

**Recommended insight templates (deterministic, evidence-linked, action-leading — matching the existing `computeInsightChips()` copy style in `workflow-metrics.ts`):**

| Template | Trigger condition | Data source |
|---|---|---|
| "{N} workflows are the same process across {V} variants" | `ProcessDefinition.runCount ≥ 5 AND variantCount ≥ 2` | `VariantSet` |
| "Variant {rank} is {pct}% slower at step {position} ({category})" | per-variant `StepPositionTimestudy[position].meanDurationMs` vs. standard path, delta ≥ 15% | per-variant timestudy (needs the split above) |
| "{N} workflows diverge after step {i} and rejoin at step {j}" | `DivergenceBranch.dfgConfirmedSplit && dfgConfirmedJoin` | `analyzeDivergence()` |
| "This workflow shares {N} steps with {family}, but skips {steps}" | `subset_of` relationship (new) | LCS containment (§4) |
| "{component} appears in {N} of your workflows — standardizing it would save ~{time}" | `CanonicalComponent.usageCount ≥ 3` + `automationOpportunityScore` | `detectComponents()` + `scoreAutomationOpportunity()` |
| "Standard path covers only {pct}% of runs — consider reviewing the SOP" | `standardPath.frequency < 0.5` | `VariantSet` |
| "Documentation drift: {pct}/100 — {N} undocumented steps observed" | `computeDocumentationDriftScore()` | existing, already surfaced on process detail page |

The **time-study view specifically** should be redesigned around a **per-variant, aligned step grid** rather than the current single flat list (`sortedTimeStudySteps` in `analytics/process/[id]/page.tsx` today shows one un-split step list for the whole group). The grid: rows = LCS-aligned canonical positions, columns = variants, cells = mean duration + delta-vs-standard + sample count + CV. This is the concrete "dramatically better time-study view" — same data, aligned by variant instead of flattened.

---

## 6. Measurable outcomes

`MEASUREMENT_PLAN_PROCESS_VARIATION.md` (Draft, 2026-06-10) already defines a rigorous measurement plan for the **exact-group + variant** layer (Gates 1–6, labeled hold-out precision/recall ≥0.85/≥0.75, clustering determinism = 100% stable, user correction rate ≤15%). That plan should be the template for this layer, not duplicated. **Net-new gates needed for the family/relationship/N-way-comparison layer this review adds:**

| New gate | Condition | Rationale |
|---|---|---|
| **Family clustering determinism** | 100% stable re-run assignment (same check as §3.3 of the existing plan, applied to Layer 2) | Same correctness bar; family clustering is new code, needs its own stability check |
| **Family precision (labeled hold-out)** | ≥ 0.80 precision on a held-out labeled set of cross-group family pairs (looser than exact-group's 0.85 because family is intentionally broader) | Family grouping is a broader/riskier claim than exact-group; needs its own calibration, not inherited from the exact-group gate |
| **Subset/superset precision** | ≥ 0.90 precision (containment is a hard structural claim — a false "subset_of" claim is a more damaging trust violation than a fuzzy "possible_match") | New relationship type; conservative bar because it asserts a factual containment, not a similarity score |
| **Time-study-view time-to-insight** | p50 < 30s from `process_variation_viewed` to identifying the slowest variant/step (parallel to existing NS-4 / TTFVI pattern in the existing plan, but scoped to the redesigned per-variant grid) | Directly tests whether the aligned-grid redesign (§5) is actually faster to read than the current flat list |
| **Cross-workflow relationship-graph engagement** | ≥ 20% of users who view a process family also click into ≥1 related workflow via a relationship edge within the session | Tests whether the new relationship graph (§4) is discoverable and useful, not just computed |
| **N-way comparison completion rate** | ≥ 50% of comparisons opened (≥2 workflows selected) result in the user reading past the summary bar into the step-diff grid | Distinguishes "novelty click" from actual usage of the compare feature |

**Baseline behavior / expected improvement / measurable outcome (per CLAUDE.md Measurement Principles):**
- **Baseline:** today, a user with 12 runs of the same process sees 12 flat rows with no aggregation; comparing 2 workflows requires manual side-by-side recording review.
- **Expected improvement:** family/relationship layer surfaces the same-process claim + variant structure automatically; time-study view shows per-variant step deltas without manual cross-referencing.
- **Measurable outcome:** VIAR-equivalent action rate (reuse existing plan's North Star framing, §5 of that plan) extended to family-level views; family clustering precision/recall against the same labeled hold-out methodology (§8.1 of existing plan), re-run whenever `SCORING_MODEL_VERSION` bumps.

**Instrumentation ambiguity flagged for engineering/PM before build:** two AI-opportunity scoring implementations currently coexist — `computeAiOpportunityScore()` (4-factor, `workflow-metrics.ts`, live in production) and `scoreAutomationOpportunity()` (9-factor with `deriveAutomationFactors()`, `automationScorer.ts`, unwired). Any cross-workflow "automation candidate" clustering/ranking work must pick one canonical score before shipping — using both inconsistently across surfaces would repeat the exact v1/v2 shadow-function drift that MDR-P05 (iter 039) had to close on the dashboard.

---

## Summary of concrete engineering-ready gaps (for backend-engineer / system-architect follow-on)

1. Materialize a `WorkflowFeatureVector` (§1) once per workflow — orchestration only, all sub-fields already computed.
2. Extract `durationBandSimilarity()` — the one net-new pure function needed for the Layer 3 distance metric (§2).
3. Wire `scoreFamilyMembership()` into a union-find aggregator parallel to `clusterSignatures.ts` (§2, Layer 2).
4. Split `analyzeTimestudy()` and `detectBottlenecks()` calls to run per-variant (`evidenceRunIds` subset) instead of whole-group, to support §3's time-per-step delta and §5's per-variant grid.
5. Add `subset_of` / `superset_of` to `RelationshipType` + `ExplanationCode`, derived via LCS containment on `lcsAlignment()` (§4).
6. Build the read-side UI for `ProcessFamily` / `GroupRelationship` / `CanonicalComponentRecord` — these tables are populated today with zero consumers.
7. Resolve the dual AI-opportunity-score implementation before any cross-workflow automation-candidate ranking ships.

No new non-deterministic logic, no new event capture, no schema migrations required beyond the two new relationship-type string values (already a free-text column, not an enum, in `GroupRelationship.relationshipType`).
