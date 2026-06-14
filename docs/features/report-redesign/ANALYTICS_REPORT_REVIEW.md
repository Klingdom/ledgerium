# Analytics Report Review — Information Quality Audit
**Date:** 2026-06-14
**Scope:** `WorkflowReportPage.tsx` — every metric and figure the Report view renders
**Method:** Source-traced from engine (`packages/intelligence-engine/src/`) → service (`apps/web-app/src/lib/intelligence.ts`) → component (`WorkflowReportPage.tsx`). Read-only.

---

## Executive Summary

The Report view contains three distinct information quality tiers:

1. **Single-run data (always present):** duration, steps, phases, confidence, step breakdown, phase timeline, friction, decisions, rework, insights feed. These are structurally correct but lack honesty context — every number is presented as if it were a cross-run truth even when it describes one recording.

2. **Multi-run intelligence (gate-protected, Team+):** variance, variants, bottlenecks, timestudy, metrics. The gating logic is correct — the section hides when `runCount < 2`. However, several individual metrics inside those sections have definition errors, missing labels, or calibration problems that produce misleading numbers even when there are enough runs.

3. **Agent intelligence (AI, separate pipeline):** automation opportunities, composed agents, skill library, integrations, roadmap. These are opinion-layer outputs, not deterministic measurements. They carry only a shallow run-count confidence disclaimer; they need stronger epistemic framing.

Five P0 correctness bugs exist. There are no invented numbers, but there are several cases where the label or scale of a correct number causes it to communicate the wrong thing.

---

## 1. Metric-by-Metric Audit

### 1.1 Hero / Overview Band

**Source:** `WorkflowSummary` — `durationMs`, `stepCount`, `phaseCount`, `confidence`, `toolsUsed`

| Field | Source field | Correctness | Verdict |
|---|---|---|---|
| Duration | `workflow.durationMs` | Correct — wall-clock duration of the single recorded run | **Trustworthy** but unlabeled as single-run |
| Steps | `workflow.stepCount` | Correct | **Trustworthy** |
| Phases | `workflow.phaseCount` | Correct | **Trustworthy** |
| Confidence | `workflow.confidence * 100` | This is extraction confidence (how reliably the recorder captured events), NOT process confidence or outcome certainty | **Misleading label** — "Confidence" alone implies process-level reliability; should be "Extraction confidence" |
| Systems | `workflow.toolsUsed.length` | Correct | **Trustworthy** |

**Issue 1.1-A (P1): "Confidence" label ambiguity.**
The score `workflow.confidence` is the capture/extraction confidence from the recording pipeline — it measures whether the browser events were cleanly segmented, not whether the process description is correct or complete. Displaying it as "Confidence" next to business metrics (duration, steps) implies it is a quality signal about the process itself. A user who sees "85% Confidence" assumes "this process analysis is 85% accurate" when the actual meaning is "85% of the recorded events were cleanly attributed to steps." The bar visualization reinforces this misreading. Correct label: "Extraction confidence" with a tooltip: "How cleanly the recorder captured events in this session."

---

### 1.2 Process Health Scores (Complexity / Friction / Linearity / Manual Intensity)

**Source:** `interpretation.scores` — these scores come from the `workflow_interpretation` artifact, produced by the AI interpretation pipeline, NOT from the deterministic intelligence engine.

| Score | Source | Algorithm | Verdict |
|---|---|---|---|
| Complexity | `interpretation.scores.complexity` (0–100) | AI-interpreted, not formula-derived | **Unverifiable** |
| Friction | `interpretation.scores.friction` (0–100) | AI-interpreted | **Unverifiable** |
| Linearity | `interpretation.scores.linearity` (0–100) | AI-interpreted | **Unverifiable** |
| Manual Intensity | `interpretation.scores.manualIntensity` (0–100) | AI-interpreted | **Unverifiable** |

**Issue 1.2-A (P1): No distinction between AI opinion and measured evidence.**
These scores are displayed with the same visual treatment as measured metrics (bar + label + interpretation string). They are AI inferences from one recorded session. There is no disclosure that they are AI-generated assessments, not formula-computed measurements. A user cannot reproduce them. The section heading "Process Health" borrows authority from the dashboard's formula-computed health score, but the mechanism is entirely different.

**Issue 1.2-B (P2): Interpretation thresholds are arbitrary and undisclosed.**
`interpretComplexity(s)` cuts at 40/70 (`Low`/`Moderate`/`High`). `interpretLinearity(s)` cuts at 30/60. These thresholds appear nowhere in the product documentation and were not derived from a distribution. Showing "High complexity" without stating what that means relative to a baseline is not actionable.

---

### 1.3 Run Metrics Section

**Source:** `processOutput.processDefinition.stepDefinitions[].durationMs` and `insights.timeBreakdown`

| Field | Source | Verdict |
|---|---|---|
| Steps analyzed | `steps.length` | **Correct** — count of step definitions in the process output |
| Avg step | `totalStepMs / stepDurations.length` where `stepDurations = durations > 0` | **Approximately correct** but excludes steps with `durationMs == 0` or undefined — step-duration coverage is uneven and the denominator may not equal `steps.length` |
| Active step time | sum of `step.durationMs` for steps > 0 | **Misleading label** — "Active step time" sounds like active vs idle; it is actually total measured step duration, which may exclude gaps between steps |
| Longest step | `max(step.durationMs)` | **Correct** |
| Longest step % | `longestDurationMs / totalStepMs * 100` | **Correct logic but wrong denominator** — this is the share of other steps' summed duration, not of total process duration. It systematically overstates the step's share if there are unmeasured gaps. |

**Issue 1.3-A (P2): "Active step time" vs total process duration mismatch is never surfaced.**
The hero band shows `workflow.durationMs` (wall clock). The Run Metrics section shows "Active step time" computed as `sum(step.durationMs)`. These two figures frequently differ — there is idle time, navigation time, and measurement gaps between steps. The report never explains this discrepancy or shows the gap. A user comparing the two numbers (e.g., "total 8 min, but active step time only 3 min") receives no explanation. The 5-minute delta could be hugely significant.

---

### 1.4 Variance and Variants Section

**Source:** `intelligence.variance` (from `analyzeVariance()`), `intelligence.variants` (from `detectVariants()`), `intelligence.metrics` (from `buildMetrics()`).

This is the most analytically important section and contains the most significant correctness issues.

#### 1.4.1 Sequence Stability

**Engine source:** `varianceAnalyzer.ts:79-82`

```
sequenceStability = standardMatchCount / bundles.length
```

where `standardMatchCount` = number of runs whose path signature exactly matches the standard path signature.

**Report rendering:** `Math.round(stability * 100)%` — displayed as "Sequence stability"

**Verdict:** The math is correct. The label is partially correct. The issue is that when `analyzeWorkflow()` is called from the `/api/workflows/[id]/analyze` endpoint (the path used by the Report tab), it runs `analyzePortfolio({ runs: bundles })` on the single workflow's bundle only (one bundle). In `analyzeVariance()` with one bundle, `standardMatchCount = 1`, `bundles.length = 1`, so `sequenceStability = 1.0 = 100%`. The report then displays "100% sequence stability" for a workflow that has been run only once. This is not a lie (one run is trivially 100% stable), but it communicates false certainty.

**Issue 1.4-A (P0): Single-run stability shows 100% — correct but misleading.**
The report correctly gates the entire Variance section behind `runCount < 2`. So the 100% stability figure only appears when `intelligence.metrics.runCount >= 2`. However, the `/analyze` endpoint calls `analyzeWorkflow()`, which calls `analyzePortfolio({ runs: bundles })` with only the single target workflow's bundle — it does not fetch sibling runs from the same `processDefinitionId`. This means `metrics.runCount` will be 1, `sequenceStability` will be 1.0, and the `runCount < 2` guard suppresses the section — which is the correct behavior. The guard is working. Document this as a structural observation, not a live bug.

**However:** If the intelligence data is populated from the `clusterWorkflows()` path (which stores `intelligenceJson` on `ProcessDefinition`), and that JSON is served through a different route, multi-run intelligence data could surface with `runCount >= 2` and show `sequenceStability` numbers that are valid. This path is not visible in the current Report tab (the Report uses `/analyze` for single-run and the guard fires). Trace confirmed: the Variance section is correctly suppressed for single-run in production. The guard is structurally sound.

**Remaining issue:** When the Variance section does show for multi-run flows, the label "Sequence stability" has no definition tooltip. A user does not know whether 78% stability means "78% of runs were structurally identical" or "78% of steps matched on average." The engine uses exact path-signature matching. This needs to be stated.

#### 1.4.2 Duration CV (Coefficient of Variation)

**Engine source:** `varianceAnalyzer.ts:53`, calling `stats.ts:coefficientOfVariation(durations)`

```
CV = stdDev(durations) / mean(durations)
```

Uses population stdDev (not sample stdDev — divides by N not N-1).

**Report rendering:** `cv.toFixed(2)` — displayed as "Duration CV" with no unit or interpretation.

**Issue 1.4-B (P0): CV is dimensionless and displayed without any interpretation scale.**
A user sees "0.47" and has no way to know if this is good, bad, or neutral. The engine has a threshold (`HIGH_VARIANCE_CV_THRESHOLD = 0.5`) that flags CV ≥ 0.5 as high variance. The report does not show this threshold or any color coding. Additionally, the engine uses population standard deviation (dividing by N), which understates variance for small samples. For a 3-run cohort, `(N-1)/N = 0.67` — the reported CV is 33% lower than the sample-corrected value. This matters significantly at low run counts.

The correct display is: a colored badge (green < 0.3 / amber 0.3–0.5 / red ≥ 0.5) with a footnote: "CV ≥ 0.5 = high variance in total run duration."

#### 1.4.3 High-Variance Steps

**Engine source:** `varianceAnalyzer.ts:104-127` — steps where per-position `CV >= options.highVarianceCvThreshold` (default 0.5), computed over all runs that had data at that step position.

**Report rendering:** `variance.highVarianceSteps?.length ?? 0` — displayed as "High-variance steps" (just a count).

**Issue 1.4-C (P1): Shows a raw count with no per-step detail.**
The engine computes full detail for each high-variance step: position, category, CV, mean duration, stdDev, run count. The report surface discards all of this and shows only a count. A user who sees "3 high-variance steps" gains no actionable information. The engine has already done the work; the report is not surfacing it.

#### 1.4.4 Variant Count and Variant Table

**Engine source:** `variantDetector.ts:35-115` — greedy clustering on path signatures with similarity threshold 0.75.

**Report rendering:**
- `variantCount` from `intelligence.variants.variantCount`
- Per-variant `frequency` rendered as `Math.round(v.frequency * 100)%`
- Per-variant `runCount` shown below frequency

**Issue 1.4-D (P1): Variant ID labels ("variant-1", "variant-2") are opaque.**
The variant ID is the engine's internal label (`variant-${i+1}`). The report renders these verbatim. Users see "variant-1 · Standard · 67%" and "variant-2 · 33%", which are meaningless identifiers. The path signature (`v.pathSignature.signature`) is shown in monospace below, but it is a colon-separated list of internal category codes (`click_then_navigate:fill_and_submit:...`) that are equally opaque.

**Issue 1.4-E (P2): Frequency percentages do not sum to 100% for the shown variants when filtered.**
The frequency is computed as `cluster.runIds.length / bundles.length` in the engine. If the report shows a subset of variants (e.g., if `variants` array is truncated or corrupted), the frequencies will not sum to 100% and the user has no way to know this.

#### 1.4.5 Diverge → Reconverge Section

**Engine source:** `reportDivergence.ts → analyzeDivergence()` — LCS-based backbone with branch detection.

**Report rendering:** `conformingPct`, `runShare` per branch, backbone category chain.

**Verdict:** The math is correct. The conformingPct is computed as `nonDivergingRuns / totalRuns`. The branch `runShare` is run-weighted correctly.

**Issue 1.4-F (P2): Backbone categories are engine-internal labels, not step titles.**
The backbone is rendered as `backbone.map((cat) => <rounded label>{cat}</rounded>)`. These are `GroupingReason` enum values such as `click_then_navigate`, `fill_and_submit`, `idle_gap`. A user reads "After click_then_navigate → annotation_mid_stream → rejoins at fill_and_submit" and learns nothing actionable about their process. The step titles from `variantStepTitles` (computed in `analyzeWorkflowVariants`) are not passed into `WorkflowReportPage` and not available here.

---

### 1.5 Step Duration Analysis (Timestudy)

**Source:** `intelligence.timestudy.stepPositionTimestudies[]` from `analyzeTimestudy()`.

**Report rendering:** Table of position / category / mean / median / p90 per step.

| Column | Source | Verdict |
|---|---|---|
| Mean | `s.meanDurationMs` | **Correct** — arithmetic mean of durations at this position across runs |
| Median | `s.medianDurationMs` | **Correct** |
| P90 | `s.p90DurationMs` | **Correct** — nearest-rank method (`stats.ts:percentile`) |

**Issue 1.5-A (P1): Run count per step position is hidden.**
`StepPositionTimestudy` carries `runCount` (number of runs that had data at this position) and `evidenceRunIds`. The table does not show how many runs contributed to each step's statistics. Steps appear at variable ordinal positions across runs (process variants skip steps). A mean computed from 2 runs is shown with the same visual weight as a mean from 15 runs. This is a statistical honesty problem.

**Issue 1.5-B (P2): No variance column in the timestudy table.**
`StepPositionTimestudy` carries `stdDevMs`. The table has mean / median / p90 but no stdDev column. For an analyst trying to understand step-level variability, this removes the most important signal.

**Issue 1.5-C (P2): P90 reliability at low N.**
The nearest-rank P90 on 2 data points returns the maximum value. On 5 data points, P90 is the 5th value. These are not statistically reliable percentiles. There is no disclosure that P90 requires a minimum N to be meaningful (commonly N >= 10 for a stable 90th percentile).

---

### 1.6 Bottlenecks Section

**Source:** `intelligence.bottlenecks.bottlenecks[]` from `detectBottlenecks()`.

**Engine algorithm:** A step is a bottleneck when `stepMean >= overallMean × 1.5` (duration criterion) OR `CV >= 0.5` (variance criterion). Sorted by duration ratio descending.

**Report rendering:** `BottleneckRow` shows title, system, duration bar, `b.meanDurationMs`, and `ratio.toFixed(1)x avg`.

| Field | Source | Verdict |
|---|---|---|
| Step duration | `b.meanDurationMs` | **Correct** — mean across runs at this position |
| Average | `b.overallMeanStepDurationMs` | **Correct** — overall mean across all steps and all runs |
| Ratio | `b.meanDurationMs / b.overallMeanStepDurationMs` | **Correct** |

**Issue 1.6-A (P1): "Average" baseline is all steps pooled, not this step's peers.**
The denominator `overallMeanStepDurationMs` is the mean of every step-duration observation across every step position and every run. This means a 3-step process (steps: 10s / 60s / 2s) has overallMean = 24s, and step 2 is flagged at 2.5x average. But if this is a multi-system process where steps naturally have different time profiles, pooling all steps in the denominator may flag every long step even in a healthy process. The bottleneck signal is relative to "all steps" not to "expected duration for a step of this type." There is no disclosure of what "average" means.

**Issue 1.6-B (P1): durationRatio is not shown; the displayed ratio recalculates from raw values.**
`BottleneckRow` computes its own `ratio = durationMs / averageDurationMs`. This matches `b.durationRatio` from the engine since both use the same formula. However the engine's `b.durationRatio` is used for sorting and threshold detection, while the component's displayed ratio uses the same raw fields. These are consistent, but the bottleneck component does not show the run count (`b.runCount`) — the number of runs that contributed to the step's mean. A bottleneck appearing in 2 out of 10 runs has the same visual weight as one appearing in 10 of 10 runs.

**Issue 1.6-C (P2): No separation between "high duration" and "high variance" bottlenecks.**
The engine distinguishes `isHighDuration` and `isHighVariance` on each bottleneck step. The report renders all bottlenecks identically regardless of which criterion fired. A step that is slow consistently (high duration) is a different problem than a step that is unpredictably fast or slow (high variance). Both types appear as red-badged rows in the same list.

---

### 1.7 Insights Feed

**Source:** `workflowInsights` artifact (artifact type `workflow_insights`), which is an AI-generated insights object stored per workflow.

**Report rendering:** Severity-sorted and category-filtered cards, each showing severity badge, confidence percentage, description, evidence, suggestion.

**Issue 1.7-A (P2): Insight `confidence` field is AI-asserted, not computed.**
`InsightActionCard` presumably renders `ins.confidence` as a percentage. This confidence is embedded in the AI artifact — it is the model's self-reported confidence in the insight, not a statistically derived confidence interval. Displaying it alongside empirically derived metrics (Sequence stability, CV) implies a shared epistemic standard. These should be visually differentiated.

**Issue 1.7-B (P2): "No inefficiencies detected" can appear for a single-run workflow.**
If `insights.hasInsights === false`, the section renders a green "No inefficiencies detected" card. For a single-run workflow, this is definitionally impossible to assert — you cannot detect whether a single recording has inefficiencies relative to a baseline. This card should only appear when `runCount >= 2` and the analysis has genuinely found no issues.

---

### 1.8 Automation Opportunities

**Source:** `agentIntelligenceData.opportunities.opportunities[]` from the separate `/agent-intelligence` endpoint.

**Report rendering:** Cards with automation score, estimated time savings. Confidence banding: high/medium/low based on `intelligence.metrics.runCount`.

**Verdict:** The confidence banding is implemented correctly (`runCount >= 10` = high, `>= 2` = medium, else low). The banner reads "Estimates based on N recorded runs · [confidence level]."

**Issue 1.8-A (P2): `totalSavingsMs` aggregation method is not disclosed.**
The total savings displayed is `agentIntelligenceData.opportunities.totalSavingsMs`. How this is computed (sum of per-opportunity savings? cap at total process duration?) is not shown. If two automation opportunities overlap (both target the same step), the sum double-counts. There is no disclosure.

**Issue 1.8-B (P2): Time savings figures are produced by the agent-intelligence pipeline, not the deterministic engine.**
`estimatedTimeSavingsMs` per opportunity is an AI estimate. It is shown in green with `~{formatDuration(savings)} saved` — the tilde prefix is the only epistemic marker. For a process totaling 8 minutes, seeing "~4 minutes saved" with a green badge carries the visual authority of a measurement.

---

### 1.9 Lead Insight ("Start Here")

**Source:** `deriveTimeLeverage()` — either `insights.timeBreakdown` (AI artifact) or computed from `processOutput.processDefinition.stepDefinitions[].durationMs`.

**Verdict:** This is one of the most honestly computed figures in the report. The pure function is deterministic. The threshold (only renders if `longestPct >= 25`) is a reasonable minimum-signal gate.

**Issue 1.9-A (P1): "% of active process time" is really "% of summed step durations."**
The denominator is `totalStepMs = sum(step.durationMs for durationMs > 0)`. This is not the same as total process time (`workflow.durationMs`). If 40% of the process is navigation/idle time not captured as step durations, a step owning "60% of active step time" might own only 36% of process time. The label should read "% of measured step time" not "% of active process time."

---

## 2. Correct Definitions for Each Report Metric

These are the definitions each metric should carry, expressed in user-facing terms. The engine implementations are correct; the missing element is labeling and disclosure.

**Extraction confidence:** The fraction of browser events that were cleanly attributed to a process step during recording. High extraction confidence means the recording was clean and unambiguous. It does not measure whether the described process is correct, complete, or representative.

**Sequence stability:** The fraction of recorded runs (across all runs grouped into this process) that followed exactly the same step-category sequence as the most common run. 100% means all runs took the same path. Lower values mean the process is executed differently across runs.

**Duration CV (coefficient of variation):** Standard deviation of total run duration divided by mean run duration. A dimensionless number. CV < 0.3 = low variation (consistent timing). CV 0.3–0.5 = moderate. CV > 0.5 = high variation (significant timing inconsistency across runs). Computed using population stdDev across observed run durations.

**Variant:** A distinct execution path — a unique sequence of step types observed across one or more runs. Two runs are in the same variant if their step-category sequences are at least 75% similar (by longest-common-subsequence). The "Standard path" is the most frequent variant.

**Bottleneck (high duration criterion):** A step whose mean duration across runs is at least 1.5× the mean duration of all steps pooled across all positions. This flags disproportionately slow steps relative to the rest of the process.

**Bottleneck (high variance criterion):** A step whose coefficient of variation in duration is ≥ 0.5 across runs — meaning it takes widely different amounts of time in different runs, regardless of its absolute speed.

**Median run duration:** The middle value when all run durations are sorted. More robust to outliers than the mean. Half of runs were faster, half were slower.

**p90 step duration:** The 90th percentile of observed durations at a step position. 90% of observations at this step were at or below this time. Requires N ≥ 10 runs for reliability; shown with a caution marker below that threshold.

---

## 3. Missing High-Signal Insights

These are computable from existing engine outputs and existing data. None require new data collection or fabrication.

### 3.1 Cycle-Time Distribution (Min / Median / p90 / Max)

The engine's `ProcessMetrics` carries `minDurationMs`, `medianDurationMs`, `p90DurationMs`, `maxDurationMs`, `meanDurationMs`. The Variance section shows only `medianDurationMs`. The full distribution (min–median–p90–max) is a single row that makes the time envelope immediately visible: a user who sees "min 3m / median 7m / p90 22m / max 45m" understands this is a bimodal or right-skewed process without needing a statistics background. Currently suppressed by incomplete mapping.

**Source fields:** `intelligence.metrics.{minDurationMs, medianDurationMs, meanDurationMs, p90DurationMs, maxDurationMs}`

### 3.2 Variant Frequency Distribution as Pareto Chart

The variant list is already sorted by frequency and shows a bar per variant. What is missing is the cumulative "top 2 variants account for 88% of runs" framing. This converts a list of abstract IDs into an actionable standardization signal: "if you standardize these 2 paths, you cover 88% of executions."

**Source fields:** `intelligence.variants.variants[].{frequency, runCount}` — already present, needs a cumulative annotation.

### 3.3 Per-Step Bottleneck Detail Table

The engine returns `highVarianceSteps[].{position, category, coefficientOfVariation, meanDurationMs, stdDevMs, runCount}` and `bottlenecks[].{position, durationRatio, isHighDuration, isHighVariance, runCount}`. The bottleneck section currently shows only a ranked list with duration and ratio. Missing:
- Which flag triggered (high duration / high variance / both)
- Run count at this position
- CV value for high-variance flags
- The mean ± stdDev range for high-variance bottlenecks

All of these are already in the engine payload.

### 3.4 Step Count Distribution (Min / Max / StdDev)

`intelligence.variance.stepCountVariance.{min, max, stdDev}` is never surfaced in the report. A process that ranges from 8 to 23 steps across runs is fundamentally different from one that is always 15 steps. This range is a primary consistency indicator. Currently absent from the UI.

### 3.5 Completion Rate

`intelligence.metrics.completionRate` is surfaced: `metrics?.completionRate` renders as "Completion" in the variance section metrics band. This is correct and present. However it needs a definition: "the fraction of recorded runs that reached the final step of the process." A 70% completion rate means 30% of runs were abandoned mid-process — a high-priority insight that is currently shown as a bare percentage.

### 3.6 Error Step Frequency

`intelligence.metrics.errorStepFrequency` = mean number of error-handling steps per run. This is computed but never displayed in the report. A value of 1.4 means on average each run triggers 1.4 error-handling steps — a strong process quality signal. Missing entirely.

### 3.7 Automation Candidate Rationale

The report shows automation opportunities from the AI pipeline. Missing is the deterministic signal from `workflow-metrics.ts`: `aiOpportunityScore`, `opportunityTag`, and the sub-components (step count, duration, tool count). These are computed deterministically and explain *why* this process is an automation candidate without relying on the AI pipeline. Source: the processDefinition's `intelligenceJson` or via the `analyzeWorkflow` response, from `computeAiOpportunityScore` → `aiOpportunityScore`.

### 3.8 Drift Signals

`intelligence.drift` (only populated when a baseline window is provided) contains `driftSignals` with type, severity, baseline vs current values, and change percentage. The Report view has no drift section at all. For users who have recorded the same process over time, drift detection (timing drift, structural drift, exception rate drift) is among the highest-value signals the engine produces. This is the multi-run temporal story that no existing section tells.

**Source fields:** `intelligence.drift.driftSignals[]` — engine output, never rendered.

---

## 4. Honesty Guardrails

### 4.1 Single-Run Disclosure

**Current state:** The Variance section is gated at `runCount < 2` and shows a "Recorded once. Run this workflow again..." nudge. This is correct. The Timestudy section is gated at `runCount < 2`. These guards work.

**Gap:** The hero section, Run Metrics section, and Insights Feed section do not carry any "single-run recording" disclosure. A user reading the insights feed ("Step 3 has high friction") does not know these inferences came from a single session. Single-run sections should carry a subtle footnote: "Based on 1 recorded session — record this process again to see trends."

**Gap:** The Process Health scores (complexity, friction, linearity, manual intensity) have no N-disclosure. They are AI inferences from a single session. They should carry "AI assessment from 1 recording."

### 4.2 "Of Shown vs of All" Accuracy

The Insights Feed filter (category chips) reduces the visible insights without telling the user how many total insights exist in other categories. The severity badges in the heading (X critical, Y high) count all insights across all categories, but after filtering, a user may see "0 results" in a category while critical badges persist in the heading. Add "Showing M of N insights" to the filtered state.

### 4.3 Confidence Disclosure for Statistical Metrics

For every statistical metric shown in the Timestudy table and Variance section, display the contributing run count. The pattern: "Median 4m 32s (across 7 runs)" conveys more information than "Median 4m 32s."

P90 needs a minimum N warning. Below N = 10, show "P90 requires ≥10 runs for reliability (N={runCount})."

### 4.4 AI vs Measured Signal Differentiation

Introduce a visual marker — a subtle "AI" badge or a different border style — on sections whose content comes from the AI pipeline (Process Health scores, Insights Feed, Automation Opportunities) vs sections whose content comes from the deterministic intelligence engine (Variance, Timestudy, Bottlenecks). Users should know which signals they can dispute and which they can verify by re-running the analysis.

### 4.5 Automation Estimate Framing

Replace the bare `~{formatDuration(savings)} saved` green text with: `~{formatDuration(savings)} per run estimated — based on {runCount} recording{s}`. The "per run" qualifier is critical. A 4-minute saving per run at 100 runs/month is material; at 1 run per year it is irrelevant. The product should help the user compute annualized impact.

---

## 5. Event Instrumentation for Report Engagement

No report engagement events currently exist. The page fires `workflow_viewed` and `tab_switched` but nothing within the Report view. Proposed taxonomy:

### 5.1 Core Report Events

```
report_section_viewed
  workflowId: string
  sectionId: 'hero' | 'lead' | 'scores' | 'phases' | 'metrics' | 'variance' | 'timestudy' | 'insights' | 'automation' | 'bottlenecks' | 'steps' | 'structure' | 'rework' | 'agents' | 'skills' | 'integrations' | 'roadmap'
  runCount: number          -- enables segmentation by single vs multi-run
  hasIntelligence: boolean
  hasAgentIntelligence: boolean

report_insight_expanded
  workflowId: string
  insightId: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string

report_insight_filter_applied
  workflowId: string
  category: string
  resultCount: number

report_variant_section_opened
  workflowId: string
  variantCount: number
  sequenceStability: number | null

report_diverge_section_viewed
  workflowId: string
  branchCount: number
  conformingPct: number

report_step_expanded
  workflowId: string
  stepOrdinal: number
  isBottleneck: boolean

report_exported
  workflowId: string
  format: 'report' | 'sop' | 'workflow'
  -- (this fires from page.tsx already as workflow_exported; no change needed)

report_automation_opportunity_viewed
  workflowId: string
  opportunityIndex: number
  score: number
  classification: string | null
  runCount: number
  confidence: 'high' | 'medium' | 'low'

report_analysis_triggered
  workflowId: string
  trigger: 'auto' | 'manual'
  analysisType: 'intelligence' | 'agent_intelligence'
```

### 5.2 Instrumentation Decision Rules

- `report_section_viewed` fires on intersection observer entry (section enters viewport). Fire once per section per page load. This measures which sections users actually scroll to.
- `report_insight_expanded` fires on `InsightActionCard` expand event. This measures which insight types are most acted on.
- `report_analysis_triggered` fires in `handleRunIntelligence()` and `handleRunAgentIntelligence()` to distinguish auto-triggered analysis (from the useEffect) from manual retry.

---

## 6. Priority Classification of Information-Quality Fixes

### P0 — Correctness Bugs (Misleading Numbers)

| ID | Section | Issue | Fix |
|---|---|---|---|
| P0-1 | Variance | CV displayed as raw decimal with no interpretation scale or threshold disclosure | Show colored badge: green < 0.3 / amber 0.3–0.5 / red ≥ 0.5. Add footnote: "Engine threshold: CV ≥ 0.5 = high variance" |
| P0-2 | Bottlenecks | Run count per bottleneck step not shown; `isHighDuration` vs `isHighVariance` flag not shown | Add "N runs" label to each BottleneckRow; add flag tag "Slow" / "Variable" / "Both" |
| P0-3 | Timestudy | Per-step run count not shown; P90 shown for N < 10 without warning | Add `runCount` column; add asterisk on P90 when step `runCount < 10` |
| P0-4 | Lead Insight | "Active process time" denominator is summed step durations, not wall-clock duration; never reconciled with hero duration | Rename to "measured step time." Add "(wall-clock: {formatDuration(workflow.durationMs)})" footnote |
| P0-5 | Single-run Insights | "No inefficiencies detected" can fire on a single-run workflow without multi-run evidence | Gate this state: only show when `runCount >= 2` AND `hasInsights === false`. For single-run: show "Analysis complete — run again to compare" |

### P1 — Significant Misleading Framing

| ID | Section | Issue |
|---|---|---|
| P1-1 | Hero | "Confidence" label implies process-level certainty; should be "Extraction confidence" |
| P1-2 | Process Health | No disclosure that complexity/friction/linearity/manual-intensity scores are AI-inferred from one session |
| P1-3 | Variance | "Sequence stability" has no tooltip definition |
| P1-4 | Variance | `highVarianceSteps` count shown with no per-step detail despite full detail being in the engine payload |
| P1-5 | Timestudy | No stdDev column despite engine providing `stdDevMs` per step |
| P1-6 | All sections | No single-run footnote on sections that make inferences from one recording |
| P1-7 | Bottlenecks | "Average" denominator (all steps pooled) not disclosed |

### P2 — Missing Signal (Available in Engine, Not Shown)

| ID | Section | Missing Signal | Engine Source |
|---|---|---|---|
| P2-1 | Variance | Full cycle-time distribution (min/median/mean/p90/max) | `intelligence.metrics.*DurationMs` |
| P2-2 | Variance | Step count range (min/max/stdDev across runs) | `intelligence.variance.stepCountVariance` |
| P2-3 | Variance | Error step frequency per run | `intelligence.metrics.errorStepFrequency` |
| P2-4 | Variants | Cumulative frequency ("top 2 variants = 88%") | computed from `variants[].frequency` |
| P2-5 | Variants | Step titles in backbone/divergence view | `variantStepTitles` — computed in `analyzeWorkflowVariants` but not passed to ReportPage |
| P2-6 | Missing section | Drift signals (structural / timing / exception / step-count) | `intelligence.drift.driftSignals[]` |
| P2-7 | Missing section | Deterministic automation score rationale (stepCount, durationMs, toolCount sub-scores) | `aiOpportunityScore` sub-components from `workflow-metrics.ts` |
| P2-8 | Automation | Savings framing lacks "per run" qualifier and run frequency context | Requires product decision on how to display annualized impact |
| P2-9 | Insights | Filter state does not show "M of N total" count | `allInsights.length` already in scope |
| P2-10 | Process Health | Interpretation thresholds (40/70 for complexity etc.) are not disclosed | constants in `WorkflowReportPage.tsx` |

### P3 — Polish / Instrumentation

| ID | Issue |
|---|---|
| P3-1 | No report-section-viewed events; no insight-expanded events; impossible to know which sections drive value |
| P3-2 | Variant IDs ("variant-1", "variant-2") are opaque; no user-facing naming |
| P3-3 | `processTypeConfidence` from the interpretation data is never rendered |
| P3-4 | Backbone category codes in divergence view are engine-internal; not human-readable |
| P3-5 | AI vs measured signal differentiation: no visual cue separates AI-inferred from engine-computed metrics |

---

## Appendix A: Data-Flow Summary

```
User opens Report tab
  → page.tsx useEffect fires handleRunIntelligence() (auto)
  → POST /api/workflows/[id]/analyze
    → analyzeWorkflow(userId, workflowId)         // intelligence.ts
      → getWorkflowsWithOutputs(userId, [workflowId])  // 1 workflow
      → loadBundlesForWorkflows(...)               // 1 bundle
      → analyzePortfolio({ runs: [1 bundle] })    // intelligence-engine
        → buildMetrics(1 bundle)    → runCount: 1
        → analyzeVariance(1 bundle, stdPath)      → sequenceStability: 1.0
        → detectVariants(1 bundle)                → variantCount: 1
        → detectBottlenecks(1 bundle)
        → analyzeTimestudy(1 bundle)
  → setIntelligenceData(result.intelligence)
  → WorkflowReportPage renders with intelligence prop

VarianceVariantsSection:
  runCount = intelligence.metrics.runCount ?? 1
  if runCount < 2 → shows activation nudge (CORRECT GUARD)
  else → shows variance/variant metrics

For multi-run intelligence (from processDefinition.intelligenceJson via cluster path):
  runCount comes from metrics.runCount (= N bundled runs)
  All variance/variant metrics are multi-run trustworthy
```

**Key observation:** The `/analyze` endpoint feeds single-run intelligence to the Report. Multi-run intelligence is only available if the `intelligenceJson` stored on `ProcessDefinition` (produced by `clusterWorkflows()`) is served through a different API path and injected into the Report. Currently it is not — the Report always receives single-run data from `/analyze`, the single-run guard fires correctly, and the Variance section is suppressed. If this architecture changes (e.g., the Report fetches pre-computed multi-run intelligence from the ProcessDefinition), the guards must still fire based on the `runCount` embedded in that data.
