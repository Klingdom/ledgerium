# Analytics — World-Class Report Metrics: Computability Audit & Measurement Strategy
**Feature:** Workflow Report — world-class metrics extension
**Date:** 2026-06-15
**Author:** analytics agent
**Status:** Specification — READ-ONLY, no code shipped

---

## 0. How to Read This Document

This document answers one question: **what could a world-class process-intelligence report honestly surface that the current report does not?**

It is grounded entirely in the live codebase. Every field reference traces to a specific type or function in `packages/intelligence-engine/src/` or `apps/web-app/src/`. No metric is invented. Where a metric is a proxy rather than a direct measurement, the honesty caveat is stated explicitly and the suggested label format is given.

The word "computable" throughout this document means: derivable deterministically from data that is already produced by the intelligence engine and either (a) already persisted in `PortfolioIntelligence`, or (b) available at report-time from the `/api/workflows/[id]/analyze` response.

---

## 1. Computed vs Surfaced: The Gap Inventory

### 1.1 What the engine computes

The following table lists every field in `PortfolioIntelligence` and the extended intelligence JSON (including Phase 3 / Phase 4 outputs persisted via `intelligence.ts:extendedIntelligence`).

**Source:** `packages/intelligence-engine/src/types.ts` + `apps/web-app/src/lib/intelligence.ts:253–263`

#### metrics (`ProcessMetrics`)

| Field | Type | Surfaced in report? |
|---|---|---|
| `runCount` | `number` | Yes — scorecard, verdict, meta |
| `completedRunCount` | `number` | No |
| `completionRate` | `number` (0–1) | No |
| `errorStepFrequency` | `number` (mean error steps/run) | No |
| `navigationStepFrequency` | `number` | No |
| `medianDurationMs` | `number \| null` | Yes — cycle-time tile, distribution |
| `meanDurationMs` | `number \| null` | Yes — distribution marker |
| `p90DurationMs` | `number \| null` | Yes — distribution marker |
| `minDurationMs` | `number \| null` | Yes — distribution marker |
| `maxDurationMs` | `number \| null` | Yes — distribution marker |
| `medianStepCount` | `number \| null` | No |
| `meanStepCount` | `number \| null` | No |
| `uniqueSystems` | `string[]` | Surfaced elsewhere (step detail) but not in report summary |
| `evidenceRunIds` | `string[]` | Used as evidence anchors |

#### timestudy (`TimestudyResult`) — per-step positions

| Field | Type | Surfaced in report? |
|---|---|---|
| `totalDuration.meanMs` | `number \| null` | Partially (cycle-time tile uses median) |
| `totalDuration.medianMs` | `number \| null` | Yes — distribution |
| `totalDuration.p90Ms` | `number \| null` | Yes — distribution |
| `totalDuration.stdDevMs` | `number \| null` | No |
| `stepPositionTimestudies[n].meanDurationMs` | `number \| null` | Yes — step-timing section |
| `stepPositionTimestudies[n].medianDurationMs` | `number \| null` | No |
| `stepPositionTimestudies[n].p90DurationMs` | `number \| null` | No |
| `stepPositionTimestudies[n].stdDevMs` | `number \| null` | No |
| `stepPositionTimestudies[n].minDurationMs` | `number \| null` | No |
| `stepPositionTimestudies[n].maxDurationMs` | `number \| null` | No |

#### variance (`VarianceReport`)

| Field | Type | Surfaced in report? |
|---|---|---|
| `durationVariance.stdDevMs` | `number \| null` | No |
| `durationVariance.coefficientOfVariation` | `number \| null` | Yes — consistency tile and scorecard |
| `durationVariance.isHighVariance` | `boolean` | Indirectly (color band) |
| `stepCountVariance.min` | `number` | No |
| `stepCountVariance.max` | `number` | No |
| `stepCountVariance.stdDev` | `number \| null` | No |
| `stepCountVariance.isHighVariance` | `boolean` | No |
| `sequenceStability` | `number` (0–1) | Yes — verdict, consistency score |
| `highVarianceSteps[n].coefficientOfVariation` | `number` | Yes — variance section (CV shown) |
| `highVarianceSteps[n].meanDurationMs` | `number` | Yes |
| `highVarianceSteps[n].stdDevMs` | `number` | No |

#### variants (`VariantSet`)

| Field | Type | Surfaced in report? |
|---|---|---|
| `variantCount` | `number` | Yes — scorecard tile |
| `standardPath.frequency` | `number` (0–1) | Yes — verdict sentence |
| `standardPath.runCount` | `number` | Yes — verdict sentence |
| `standardPath.pathSignature` | `PathSignature` | Used to compute divergence view |
| `variants[n].frequency` | `number` | Yes — Pareto chart |
| `variants[n].runCount` | `number` | Yes — Pareto chart |
| `variants[n].similarityToStandard` | `number` (0–1) | No |

#### bottlenecks (`BottleneckReport`)

| Field | Type | Surfaced in report? |
|---|---|---|
| `bottlenecks[n].meanDurationMs` | `number` | Yes |
| `bottlenecks[n].durationRatio` | `number` | Yes (as % of cycle time) |
| `bottlenecks[n].isHighDuration` | `boolean` | Yes — flag |
| `bottlenecks[n].isHighVariance` | `boolean` | Yes — flag |
| `bottlenecks[n].coefficientOfVariation` | `number \| null` | No |

#### drift (`DriftReport`, optional — requires baseline)

| Field | Type | Surfaced in report? |
|---|---|---|
| `driftSignals[n].driftType` | `DriftType` | Yes — drift section |
| `driftSignals[n].severity` | `DriftSeverity` | Yes |
| `driftSignals[n].changePercent` | `number \| undefined` | No — only `description` string shown |

#### Extended intelligence (Phase 3, stored in `intelligenceJson`)

**Source:** `apps/web-app/src/lib/intelligence.ts:205–212`; types from `standardizationScorer.ts`

| Object | Key field | Surfaced in report? |
|---|---|---|
| `standardization` (`StandardizationScore`) | `score` (0–100) | In `rpt-scores` section — yes |
| `standardization.factors.dominantPathAdherence` | `number` | No |
| `standardization.factors.sequenceStability` | `number` | No |
| `standardization.factors.variantConsolidation` | `number` | No |
| `standardization.factors.timingConsistency` | `number` | No |
| `standardization.level` | `'excellent'\|'good'\|'moderate'\|'poor'` | In `rpt-scores` if rendered |
| `outlierRuns` (`OutlierRun[]`) | `bestVariantSimilarity`, `reason` | No |
| `recommendedPath` (`RecommendedCanonicalPath`) | `frequency`, `stepCategories`, `rationale` | Partially in `rpt-scores` |
| `recommendations` (`Recommendation[]`) | `type`, `estimatedTimeSavingsMs`, `impact`, `confidence` | In `rpt-automation` section |
| `automationROI` (`AutomationROI[]`) | `totalSavingsMs`, `suitabilityScore`, per step | In `rpt-automation` section |

#### Divergence view (computed at report time)

**Source:** `apps/web-app/src/lib/reportDivergence.ts`; `analyzeDivergence` in `divergenceAnalyzer.ts`

| Field | Surfaced in report? |
|---|---|
| `conformingPct` (fraction of runs on backbone) | Partially — this IS the conformance rate; used in `rpt-variance`/`rpt-structure` sections |
| `branches[n].runShare` | Yes — diverge/reconverge view |
| `branches[n].altSteps` | Yes |
| `branches[n].dfgConfirmed` | No — DFG cross-check confirmation dropped |

---

### 1.2 The "computed but hidden" list — free wins

These are fields already in the engine output that the report currently does not surface. Each is a zero-cost addition requiring only a UI read from the existing API response — no new engine computation needed.

**Source of truth:** The `/api/workflows/[id]/analyze` response already returns the full `PortfolioIntelligence` object including the extended Phase 3 + Phase 4 fields.

1. **`metrics.completionRate`** — fraction of runs with `completionStatus === 'complete'`. Source: `metricsBuilder.ts:44`. Currently computed and included in the API response but never shown in the report. This is the closest honest proxy to "task completion."

2. **`metrics.errorStepFrequency`** — mean count of `error_handling` category steps per run. Source: `metricsBuilder.ts:40–44`. Not shown anywhere in the report. This is the engine's proxy for exception rate.

3. **`metrics.medianStepCount` and `meanStepCount`** — step-count central tendency across runs. Source: `metricsBuilder.ts:57–58`. Not shown. Useful for "does this process get longer or shorter over time?"

4. **`variance.stepCountVariance.min`, `.max`, `.stdDev`** — step-count spread. Source: `varianceAnalyzer.ts:58–65`. Not shown. Directly quantifies "does the executor add or skip steps?"

5. **`timestudy.totalDuration.stdDevMs`** — standard deviation of total cycle time. Source: `timestudyAnalyzer.ts` → `totalDuration.stdDevMs`. The report shows the distribution via [min, median, mean, p90, max] but does not show stdDev explicitly.

6. **`timestudy.stepPositionTimestudies[n].p90DurationMs`** — per-step p90. Source: `timestudyAnalyzer.ts` per-position stats. Each step has a p90 already computed; the report only shows the mean per step.

7. **`timestudy.stepPositionTimestudies[n].stdDevMs`** — per-step standard deviation. Same source. Enables per-step coefficient of variation, which is already surfaced for high-variance steps at the list level but not in the per-step breakdown.

8. **`variants[n].similarityToStandard`** — each non-standard variant's similarity score (0–1) to the reference path. Source: `types.ts:237`. Shown in the variants panel section of the detail page, but not in the report. This quantifies "how different is this variant from the standard path?"

9. **`drift.driftSignals[n].changePercent`** — the magnitude of each drift signal as a percentage change from baseline to current. Source: `types.ts:298`. The drift section shows `baselineValue → currentValue` but not the `changePercent` field that the engine computes.

10. **`standardization.factors.*`** — the four factor breakdown (dominantPathAdherence, sequenceStability, variantConsolidation, timingConsistency) behind the standardization score 0–100. Source: `standardizationScorer.ts:29–37`. The overall score surfaces in `rpt-scores` but the factor breakdown is hidden.

11. **`outlierRuns`** — runs that do not closely match any detected variant (similarity < 0.5). Source: `standardizationScorer.ts:201–247`. Not shown in the report at all. This identifies anomalous executions.

12. **`divergence.conformingPct`** — from `reportDivergence.ts:78`, this is `conformingRunCount / totalRuns` — the fraction of runs that follow the backbone exactly. This is the conformance rate. It is computed and returned from `deriveDivergence()` but its numeric value is not prominently shown in the report as a named metric.

13. **`bottlenecks[n].coefficientOfVariation`** — the CV of the flagged bottleneck step. Source: `types.ts:266`. The bottleneck section shows whether a step is high-duration, high-variance, or both, but does not show the underlying CV that triggered the variance flag.

---

## 2. World-Class Metrics We Could Add Honestly

The following metrics go beyond reading existing fields — they require either a light derivation on top of existing data, or expose a computed signal more prominently. For each metric: the exact source, the derivation, and the honesty caveat.

---

### 2.1 Conformance Rate (% on Standard Path)

**What it measures:** The fraction of runs that follow the reference (most frequent) path exactly — the category-sequence match, not just approximately.

**Exact source:**
- `variance.sequenceStability` (`types.ts:215`) — already the exact value: "fraction of runs that follow the standard path signature exactly."
- Alternatively, `standardPath.frequency` (`types.ts:328`) — fraction of all runs belonging to the standard path variant. These are equivalent for single-variant groups; `sequenceStability` is the exact-match version.
- `reportDivergence.conformingPct` — same value computed by `deriveDivergence()` from the variant data.

**Derivation:** No new computation. The value is `variance.sequenceStability` expressed as a percentage: `Math.round(sequenceStability * 100)`.

**Display format:** "74% of runs follow the reference path" with the run counts: "(14 of 19 runs)". The denominator is `metrics.runCount`. The numerator is `Math.round(sequenceStability * metrics.runCount)`.

**Honesty caveat:** "Reference path" is the most frequent observed category sequence — it is Ledgerium's deterministic structural cluster leader, not an externally-defined standard process. The label must not say "best practice" or "correct path." Suggested label: "Conformance to reference path (proxy: % of runs matching the most common execution structure)."

**Top deviation points:** Already available from `divergence.branches` sorted by `runShare` descending. Each branch has `afterLabel` (where deviation starts) and `altSteps` (what they do instead). These are the concrete deviation points.

**Minimum runs for reliability:** 3 runs (same gate as `sequenceStability` being meaningful; single-run returns 1.0 trivially).

---

### 2.2 Exception Rate (Error Step Frequency)

**What it measures:** The average number of error-handling steps per run — a proxy for process exceptions, failures, or error-handling detours.

**Exact source:** `metrics.errorStepFrequency` (`types.ts:113`). The engine computes this as `errorCounts.reduce((s,c) => s+c, 0) / bundles.length` where `errorCounts = bundles.map(b => b.processRun.errorStepCount)`. Source: `metricsBuilder.ts:40–44`.

**Derivation:** Direct read. No computation needed.

**Display options:**
- "0.3 error steps per run on average" — the raw value.
- "Error steps in X% of runs" — requires per-run boolean presence, which is computable: `bundles.filter(b => b.processRun.errorStepCount > 0).length / bundles.length`. This is NOT currently in the API response as a separate field, so it requires a small adapter. The raw `errorStepFrequency` is available.

**Honesty caveat:** `errorStepFrequency` is computed from steps whose `category === 'error_handling'` (segmentation engine's GroupingReason). This category captures steps that the segmentation engine classified as error-handling based on DOM events and recovery patterns. It is NOT a business-logic exception count. Label: "Error steps per run (proxy: steps categorized as error-handling by the recorder)."

**Minimum runs:** Works from 1 run. Frequency of 0 is a valid and honest result.

---

### 2.3 Throughput-Time Percentiles

**What it measures:** How long the process takes at different points in the distribution — specifically, distinguishing typical cases (median) from slow-tail cases (p90).

**Exact source:** Already fully computed. `metrics.p90DurationMs` (`types.ts:119`) is in the existing distribution markers in `reportEvidence.ts`. `timestudy.totalDuration.p90Ms` (`types.ts:167`) is the same value from a different path. Both are in the API response.

**Derivation:** None needed — these are already surfaced in the distribution section (cycle-time spread). What is missing is a named "p90 / p50 ratio" or "tail ratio" as a standalone insight.

**Tail ratio:** `p90DurationMs / medianDurationMs`. A ratio of 1.0 means the 90th-percentile run takes the same time as the median. A ratio of 2.0 means slow-tail runs take twice as long. This is a single division — no additional engine computation.

**Honesty caveat:** p90 requires at least 10 data points to be statistically meaningful; with 3–9 runs it is still the literal 90th-percentile value of the sample but may not represent the population well. Label: "p90 cycle time (based on N recorded runs — reliability improves with more runs)." Gate display on `runCount >= 5` for the tail ratio; keep the raw p90 value visible at any count.

---

### 2.4 Step-Count Spread (Process Length Variability)

**What it measures:** How many steps different runs take — reveals whether the process is executed with consistent depth or whether some runs skip steps or take detours.

**Exact source:** `variance.stepCountVariance.min`, `variance.stepCountVariance.max`, `variance.stepCountVariance.stdDev` (`types.ts:203–208`). Source: `varianceAnalyzer.ts:58–65`.

**Derivation:** Direct read. Also derivable: step-count range = `max - min`. Normalized range = `(max - min) / median(stepCounts)` gives a relative spread.

**Display format:** "Steps per run: 4 – 12 (median 7)." Where median comes from `metrics.medianStepCount`.

**Honesty caveat:** Step count uses the segmentation engine's step definitions — a "step" is a grouped interaction cluster, not a business task. Two different runs may have the same business steps but different step counts if the user paused, returned, or took a different navigation route. Label: "Steps per run (recorded interaction groups, not business task count)."

---

### 2.5 Per-Step Cycle Time Coefficient of Variation

**What it measures:** For each step position, how variable is the duration across runs? This identifies which specific steps drive unpredictability.

**Exact source:** `timestudy.stepPositionTimestudies[n].stdDevMs` and `timestudy.stepPositionTimestudies[n].meanDurationMs`. The CV per step is `stdDevMs / meanDurationMs`. The engine already computes stdDev per step position in `timestudyAnalyzer.ts`. `highVarianceSteps` in `variance` already contains the steps with CV >= 0.5, with their CV value.

**Derivation:** For the full per-step CV table: compute `stdDevMs / meanDurationMs` for each step position from the `stepPositionTimestudies` array. The numerator and denominator are both in the API response.

**Display format:** A per-step column added to the step-timing section showing "CV 0.82 — high" or "CV 0.19 — low." Color-coded by the existing `HIGH_VARIANCE_CV_THRESHOLD = 0.5` from the engine.

**Honesty caveat:** CV per step requires at least 2 observations at that position. If a step position only appears in 1 run, CV is undefined and should show "—". The `stepPositionTimestudies[n].runCount` field gates this.

---

### 2.6 Completion Rate

**What it measures:** The fraction of recorded runs that reached `completionStatus === 'complete'` — a proxy for whether the process was finished or abandoned/interrupted.

**Exact source:** `metrics.completionRate` (`types.ts:110`). Computed by `metricsBuilder.ts:44`: `completedRuns.length / bundles.length`.

**Derivation:** Direct read. Zero new computation.

**Display format:** "91% of runs completed (10 of 11)." Where `completedRunCount = Math.round(completionRate * runCount)`.

**Honesty caveat:** `completionStatus` is set by the process engine based on whether the session ended with a `session.stopped` event in a terminal state. An incomplete run may mean the recording was cut short, the browser tab was closed, or the user genuinely abandoned the task. It does not distinguish abandonment from recording failure. Label: "Run completion rate (proxy: % of recordings that reached session end — incomplete recordings counted as incomplete runs)."

**Minimum runs:** Works from 1 run. 100% completion on 1 run is honest (just not very informative).

---

### 2.7 First-Time-Right Rate (Proxy)

**What it measures:** The fraction of runs that followed the standard (reference) path AND had zero error steps — a proxy for "completed correctly without visible exceptions on the first attempt."

**Exact source:** Requires combining two existing signals:
- `standardPath.evidenceRunIds` — the runs that follow the standard path.
- Per-run error step count — available in `processRun.errorStepCount` in the raw bundle, but NOT currently returned in the `/api/workflows/[id]/analyze` response at the level needed for this cross-join. The response returns aggregate `metrics.errorStepFrequency` but not per-run error counts.

**Computability assessment:** This metric is computable with a small adapter. At report time, the `analyzeWorkflowVariants` function has access to all `ProcessRunBundle[]` and can compute: `standardPathRunIds.filter(id => bundle(id).processRun.errorStepCount === 0).length / totalRuns`. This requires a new derived field in the analyze route response — it is not a zero-cost read.

**Proposed adapter field:** `metrics.standardPathNoErrorRunCount` — count of runs that are both on the standard path AND have `errorStepCount === 0`. This is a single filter-and-count operation over the bundles at analysis time.

**Display format:** "First-time-right (proxy): 62% of runs (8 of 13) — runs on the reference path with no error steps."

**Honesty caveat (mandatory):** This is a proxy. "First-time-right" in traditional process excellence means the product/output was correct the first time. Ledgerium cannot observe outcome quality — only structural path and error-step presence. A run could follow the standard path with no error steps and still produce a wrong business result. Label must include: "proxy: standard-path runs with no error-handling steps." This label is non-negotiable for honest positioning.

**Minimum runs:** Gate on `runCount >= 3` for the same reason as conformance rate.

---

### 2.8 Rework-Loop Rate (Structural Proxy)

**What it measures:** The fraction of runs containing repeated step-category sequences — a structural proxy for "the user did something, realized it was wrong, and repeated it."

**Exact source:** Not directly in the engine output. However, the divergence branches in `divergence.branches` capture runs that leave the backbone and rejoin it — some of these branches are rework loops (the run takes extra steps before returning to the backbone). The `rpt-rework` section already exists in `SECTION_IDS` and `SECTION_LABELS` ("Rework Patterns") — the section is declared but the computation behind it needs to be defined.

**Computability from existing data:** The `divergenceAnalyzer.ts` computes `DivergenceBranch.altSteps` for each deviation. A rework pattern is a branch where `altSteps` contains a category that also appears in `backbone[divergeAfterIndex]` or earlier — i.e., the run repeated something it already did. This is detectable from the existing divergence analysis without new engine computation, via a post-process filter on the branches.

**Derivation (pure, no new engine work):**
```
reworkBranches = divergence.branches.filter(b =>
  b.altSteps.some(step => backbone.slice(0, b.reconvergeAtIndex).includes(step))
)
reworkLoopRate = reworkBranches.reduce((sum, b) => sum + b.runCount, 0) / totalRuns
```

This is computable from `DivergenceView` which is already returned in the report.

**Honesty caveat:** This detects structural loops at the category level — repeated navigation to the same category of step (e.g., `fill_and_submit` appearing twice before `click_then_navigate`). It does not distinguish intentional multi-step forms from genuine rework. Label: "Rework-loop rate (proxy: % of runs containing repeated step categories before re-joining the reference path)."

**Minimum runs:** Gate on `runCount >= 3` and `variantCount >= 2` (rework loops only appear in non-conforming runs).

---

### 2.9 Variant Similarity Distribution

**What it measures:** How similar the non-standard variants are to the reference path — a distribution from "almost identical" to "completely different."

**Exact source:** `variants[n].similarityToStandard` (`types.ts:237`) is already in the response. The report already shows variant run counts and percentages in the Pareto chart, but not the similarity scores.

**Derivation:** Direct read. Classify each non-standard variant: `similarityToStandard >= 0.9` = "near-identical," `0.75–0.9` = "similar," `0.5–0.75` = "partially different," `< 0.5` = "structurally distinct."

**Display format:** Add a similarity column to the variant Pareto, or a summary: "2 of 4 variants are structurally similar to the reference path (similarity > 0.75); 2 variants are distinctly different."

**Honesty caveat:** Similarity is computed via bigram Jaccard similarity on step-category sequences (`pathSignature.ts:bigramJaccardSimilarity`). It measures structural overlap of the category sequence — not semantic intent or business outcome similarity. Label: "Structural similarity to reference path (based on step-category sequence overlap)."

---

### 2.10 Outlier Run Rate

**What it measures:** The fraction of runs that do not closely match any detected variant — anomalous executions.

**Exact source:** `outlierRuns` (`standardizationScorer.ts:201–247`). Already computed and stored in the extended intelligence JSON. Not shown in the report. `outlierRuns[n].bestVariantSimilarity < 0.5` is the threshold used.

**Derivation:** `outlierRuns.length / metrics.runCount`.

**Display format:** "3% of runs (1 of 32) did not match any detected variant — possible anomalous executions."

**Honesty caveat:** An "outlier run" in Ledgerium's engine means the run's category sequence has similarity < 0.5 to all detected variants. This could be a genuine anomaly, a recording error, or a legitimately rare but valid process variant. Label: "Anomalous run rate (proxy: % of runs that did not match any detected path variant above 50% structural similarity)."

---

## 3. Conformance Metric: Detailed Specification

This section provides the complete data model and display specification for the conformance metric (§2.1), which is the most distinctive addition.

### 3.1 Can we compute "% of runs on the standard path"?

**Yes — it is already computed.** `variance.sequenceStability` is exactly this value. Definition (from `varianceAnalyzer.ts:72–80`):

```
standardMatchCount = bundles.filter(b =>
  computePathSignature(b).signature === standardPathSignature
).length

sequenceStability = standardMatchCount / bundles.length
```

This is the fraction of runs whose step-category sequence is byte-identical to the standard path signature. It is deterministic and already in the API response.

### 3.2 Can we compute "top deviation points"?

**Yes — from `reportDivergence.DivergenceView`.** Already computed in the report codebase by `deriveDivergence()` in `apps/web-app/src/lib/reportDivergence.ts`. The `branches` array, sorted by `runShare` descending, gives:

- `afterLabel`: the backbone step category after which runs diverge.
- `rejoinLabel`: where they return.
- `altSteps`: what they do in between.
- `runShare`: fraction of all runs that take this deviation.
- `dfgConfirmed`: whether the DFG cross-check confirms this is a real split point (boolean — already computed, not surfaced).

The top 3 branches by `runShare` are the "top 3 deviation points."

### 3.3 Display specification for the Conformance section

**Section ID:** `rpt-conformance` (new section, between `rpt-variance` and `rpt-drift` in the report layout)

**Headline metric tile:**
- Label: "Conformance to Reference Path"
- Value: `Math.round(sequenceStability * 100)` + "%"
- Sub-label: "proxy: % of runs matching the most common step sequence exactly"
- Run count: "N of M runs" where N = `Math.round(sequenceStability * metrics.runCount)`, M = `metrics.runCount`

**Deviation points table:** Up to 3 rows from `divergence.branches`, sorted by `runShare` descending.

| Column | Source |
|---|---|
| Deviation point | `branch.afterLabel` — human label of the backbone step where runs diverge |
| What they did instead | `branch.altSteps.join(' → ')` — the alternative step categories |
| Run share | `Math.round(branch.runShare * 100)` + "%" |
| Runs | `branch.runCount` |
| DFG confirmed | `branch.dfgConfirmed` — shows a "confirmed split" badge when true |

**Gating rules:**
- Show only when `runCount >= 3`
- Show deviation table only when `variantCount >= 2` (otherwise there are no deviations)
- Show "100% conformance — all runs follow the same path" when `sequenceStability === 1.0` and `variantCount === 1`

**Honesty disclosure line:** "Reference path = the most frequently recorded step sequence. Conformance measures structural path match, not task outcome quality."

---

## 4. Event Instrumentation Extensions

The existing R-D event spec (`ANALYTICS_RD_EVENTS.md`) already defines `report_viewed`, `report_section_viewed`, `report_print_clicked`, `report_data_export_clicked`, `report_insight_card_expanded`, `report_key_action_card_viewed`, and `report_evidence_anchor_viewed`.

The following events extend that spec for the new metrics and sections.

### 4.1 `report_conformance_viewed`

**When:** The conformance section (`rpt-conformance`) enters the viewport (first time per page load). Follow the same `IntersectionObserver` dedup pattern as `report_section_viewed`.

**Why separate from `report_section_viewed`?** Conformance is the highest-signal new metric in terms of "did the user see the headline finding?" A dedicated event allows direct conformance-engagement measurement without filtering the generic section event stream.

**Properties:**

| Property | Type | Notes |
|---|---|---|
| `workflowId` | `string` | Opaque workflow database ID |
| `conformancePct` | `number` | `Math.round(sequenceStability * 100)` — an integer 0–100. Numeric, not a string. Allows segmenting engagement by process health. |
| `runCount` | `number` | `metrics.runCount` |
| `deviationPointCount` | `number` | Number of branches in the deviation table that were shown (0–3) |

**What NOT to track:** Branch labels, step category strings, run IDs, `afterLabel` or `altSteps` content.

---

### 4.2 `report_deviation_point_drilled`

**When:** User clicks or expands a deviation point row in the conformance section deviation table to see more detail.

**Why:** Deviation points are the most actionable output of conformance analysis. Whether users click through to the detail is the leading indicator for "is the conformance section driving investigation?"

**Properties:**

| Property | Type | Notes |
|---|---|---|
| `workflowId` | `string` | Opaque workflow database ID |
| `deviationRank` | `number` | 1-based rank of the deviation point clicked (1 = largest by run share) |
| `deviationRunShare` | `number` | `Math.round(branch.runShare * 100)` — integer percent. Tells us whether users engage with high-frequency or low-frequency deviations. |
| `dfgConfirmed` | `boolean` | Whether this deviation point had DFG cross-check confirmation |

**What NOT to track:** `afterLabel`, `altSteps`, `rejoinLabel` — these encode step categories that, while privacy-safe (categories not titles), could reconstruct workflow structure when combined with `workflowId`. Omit for prudence.

---

### 4.3 `report_completion_rate_viewed`

**When:** The metric tile or section displaying `metrics.completionRate` enters the viewport for the first time per page load.

**Properties:**

| Property | Type | Notes |
|---|---|---|
| `workflowId` | `string` | Opaque workflow database ID |
| `completionRatePct` | `number` | `Math.round(completionRate * 100)` — integer 0–100 |
| `runCount` | `number` | Denominator |

---

### 4.4 Extended funnel with new events

The full post-extension report engagement funnel:

```
report_viewed
  → report_section_viewed (rpt-verdict)
  → report_section_viewed (rpt-scorecard)
  → report_section_viewed (rpt-insight-cards)
  → report_key_action_card_viewed          (Key Actions cards)
  → report_evidence_anchor_viewed          (evidence layer)
  → report_section_viewed (rpt-conformance)   [NEW]
  → report_conformance_viewed                  [NEW — higher-signal than generic section view]
  → report_deviation_point_drilled             [NEW — action signal]
  → report_section_viewed (rpt-distribution)
  → report_section_viewed (rpt-consistency)
  → report_insight_card_expanded           (Insights section)
  → report_print_clicked
```

**New questions the extended event set answers:**

- **Q6 — Is the conformance metric the most-read new section?** `report_conformance_viewed / report_viewed` vs `report_section_viewed(other new sections) / report_viewed`. Tells us which new section drives the most engagement.
- **Q7 — Do deviation points drive investigation?** `report_deviation_point_drilled / report_conformance_viewed`. Low rate = the table is shown but not acted on; investigate whether the step labels are comprehensible.
- **Q8 — Does completion rate correlate with export behavior?** Segment `report_print_clicked` by `completionRatePct` quintile from `report_completion_rate_viewed`. Do users with low-completion-rate processes export more (to share a problem) or less (don't trust the data)?

---

## 5. Honesty Guardrails

### 5.1 Metrics We Must Refuse — and Why

The following are commonly requested in process intelligence reports but are not computable from Ledgerium's observed data. Implementing any of these would be fabrication.

| Metric | Why we refuse | What to do instead |
|---|---|---|
| **Six Sigma / DPMO** | Requires a definition of "defect" in business terms. Ledgerium observes step categories, not defects. No defect definition can be inferred from the recorder. | Show error step frequency as an observable proxy. Never use "defects per million opportunities." |
| **Value-added vs non-value-added time** | Requires a business analyst to classify each step as value-adding or waste. The recorder cannot observe business value — only duration and category. "Navigation" steps may be essential to the process. | Show per-step duration and bottleneck ratio. Let the user classify. |
| **Cost per run** | Requires fully loaded hourly rate data for the executor, which Ledgerium does not collect. Multiplying duration × any assumed rate would be fabrication. | The `automationROI` computation in the recommendation engine does estimate `totalSavingsMs` as a duration-based ROI, which is honest (it is time, not money). |
| **Capacity utilization** | Requires total available time data. Ledgerium knows when a process runs but not whether the executor was idle between runs or running multiple processes. | Show run frequency / run count trends when baseline drift data is present. |
| **Error rate as % of total steps** | The step total includes category steps that are definitionally not error candidates (e.g., navigation, session events). Dividing error steps by total steps produces a misleading denominator. | Show `errorStepFrequency` as mean error steps per run, not as a fraction of total steps. |
| **Throughput (runs per time period)** | Requires timestamps of when runs started — Ledgerium records `createdAt` of the workflow row but not a session clock tied to the run (the recording may be uploaded after the fact). | Show `runCount` with the date range when multi-date drift baseline is available. |

### 5.2 Required Label Formats for Proxy Metrics

Any metric that is a proxy — not a direct measurement of the underlying business reality — must include an explicit proxy disclosure. The following label formats are required.

| Metric | Required label format |
|---|---|
| Completion rate | "Run completion rate (proxy: % of recordings reaching session end)" |
| Error/exception rate | "Error steps per run (proxy: steps classified as error-handling by the recorder)" |
| First-time-right rate | "First-time-right (proxy: standard-path runs with no error-handling steps)" |
| Conformance rate | "Conformance to reference path (proxy: % of runs matching the most common step sequence exactly)" |
| Rework-loop rate | "Rework-loop rate (proxy: % of runs containing repeated step categories before rejoining the reference path)" |
| Variant similarity | "Structural similarity to reference path (based on step-category sequence overlap — not semantic or business similarity)" |
| Outlier run rate | "Anomalous run rate (proxy: % of runs not matching any detected path variant above 50% structural similarity)" |

The disclosure parenthetical is non-negotiable. It may be shown as a tooltip or sub-label rather than inline text, but it must be visible on the surface where the metric appears — not hidden in documentation.

### 5.3 Multi-Run Gating

The following gates are already in the report codebase (`reportScorecard.ts:90`: `isMultiRun = runCount >= 2`, `reportEvidence.ts:83`: `if (runCount < 2) return null`). The new metrics should follow the same gates:

| Gate condition | Metrics that require it |
|---|---|
| `runCount >= 2` | Conformance rate, consistency score, variant count, CV, step-count variance |
| `runCount >= 3` | First-time-right proxy, rework-loop rate, outlier run rate, variant similarity distribution |
| `runCount >= 5` | Tail ratio (p90 / median) displayed as a meaningful comparative |
| `variantCount >= 2` | Deviation points table, diverge/reconverge view |

---

## 6. Prioritized Additions: P0 → P2

### P0 — Zero-effort reads from existing API response; maximum signal per unit of work

These metrics require only a UI read from the existing `/api/workflows/[id]/analyze` response. No new engine code, no new API fields, no adapter changes.

| ID | Metric | Engine source | Section placement | Gate |
|---|---|---|---|---|
| P0-1 | **Completion rate** | `metrics.completionRate` | New tile in `rpt-scorecard` or in `rpt-metrics` | `runCount >= 1` |
| P0-2 | **Error steps per run** (exception rate proxy) | `metrics.errorStepFrequency` | New tile in `rpt-scorecard` | `runCount >= 1` |
| P0-3 | **Conformance % headline** | `variance.sequenceStability` (already in response) | New `rpt-conformance` section headline | `runCount >= 3` |
| P0-4 | **Deviation point table** | `reportDivergence.DivergenceView.branches` (already computed) | `rpt-conformance` section body | `variantCount >= 2` |
| P0-5 | **Variant similarity column** | `variants[n].similarityToStandard` (already in response) | Add column to existing Pareto chart in `rpt-variance` | `variantCount >= 2` |
| P0-6 | **DFG-confirmed badge** on deviation points | `branch.dfgConfirmed` (already computed) | `rpt-conformance` deviation table | Same as P0-4 |
| P0-7 | **Drift magnitude %** | `drift.driftSignals[n].changePercent` (already in response) | Add to existing drift section `rpt-drift` | Drift present |
| P0-8 | **Standardization factor breakdown** | `standardization.factors.*` (already in extended intelligence JSON) | Expand `rpt-scores` section | `runCount >= 2` |
| P0-9 | **Outlier run rate** | `outlierRuns.length / metrics.runCount` (already in extended intelligence JSON) | New row in `rpt-scores` | `runCount >= 3` |
| P0-10 | **Step-count range** | `variance.stepCountVariance.min`, `max` | Add to `rpt-metrics` step section | `runCount >= 2` |

### P1 — Light adapter work; high value

These require one small derivation or a new field in the analyze route response — typically one pure function call over existing data.

| ID | Metric | What's needed | Engine source |
|---|---|---|---|
| P1-1 | **Per-step CV column** in step timing table | Compute `stdDevMs / meanDurationMs` per position from `stepPositionTimestudies` — one map operation | `timestudy.stepPositionTimestudies[n].stdDevMs + meanDurationMs` |
| P1-2 | **Per-step p90** in step timing table | Direct read from `stepPositionTimestudies[n].p90DurationMs` — not currently surfaced in the per-step table | Same source |
| P1-3 | **Tail ratio** (p90 / median) | One division: `p90DurationMs / medianDurationMs` — present as a named metric | `metrics.p90DurationMs + medianDurationMs` |
| P1-4 | **Rework-loop rate** | Filter `divergence.branches` for branches where `altSteps` contains a step category that appeared earlier in the backbone — pure derivation over existing `DivergenceView` | `reportDivergence.DivergenceView` |
| P1-5 | **Cycle-time stdDev** | Direct read from `timestudy.totalDuration.stdDevMs` — not currently shown anywhere in the report | `timestudy.totalDuration.stdDevMs` |

### P2 — New adapter field in the API; lower urgency

These require a small change to the analyze route response to expose a field that requires per-bundle access at the server, not computable from the current API response alone.

| ID | Metric | What's needed | Honesty consideration |
|---|---|---|---|
| P2-1 | **First-time-right proxy** | New field in analyze response: count of runs that are both on the standard path AND have `errorStepCount === 0`, divided by total runs | Mandatory proxy label; gate on `runCount >= 3` |
| P2-2 | **System-specific step timing** | Group per-step timing by `uniqueSystems` to show "steps in Salesforce average 4.2s vs steps in Excel average 8.1s" | Requires joining step position to system — needs `processDefinition.systems` per step |
| P2-3 | **Run-over-run trend** (is the process getting faster or slower?) | Requires ordered run timestamps — uses `workflow.createdAt` as proxy for run time, computes median duration of first half vs second half of runs | Honesty caveat: `createdAt` is the recording upload time, not always the execution time |

---

## 7. Summary: The Gap in One Sentence Per Category

- **Computed but hidden:** 13 fields already in the API response, never shown. Free wins. Start with completion rate (P0-1) and error step frequency (P0-2) — these are the most interpretable by a process owner with zero process-mining background.

- **Conformance rate:** Already computed as `sequenceStability`. Rename it, add the deviation points table from the existing divergence analysis, and it becomes the headline metric of a new `rpt-conformance` section.

- **World-class adds requiring derivation:** Per-step CV, tail ratio, rework-loop rate, and first-time-right proxy are all computable from existing data with one to three lines of pure derivation code. None require new engine work.

- **Metrics to refuse:** Six Sigma, DPMO, value-added classification, cost per run. These require business context Ledgerium does not and should not collect from the recorder.

- **Event instrumentation:** Three new events extend the existing R-D event spec — `report_conformance_viewed`, `report_deviation_point_drilled`, `report_completion_rate_viewed` — to measure whether the new sections drive engagement and action.
