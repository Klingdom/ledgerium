# Ledgerium Workflow Dashboard — Lean Six Sigma Expert Review

**Author role:** Lean Six Sigma Master Black Belt / process-improvement consultant (domain authority review)
**Date:** 2026-06-14
**Scope:** READ-ONLY product-code review + LSS-practice research. No code changes.
**Audience:** Green/Black Belts, process-improvement PMs, the Ledgerium product team.
**Artifacts read:** `apps/web-app/src/app/api/workflows/route.ts`, `apps/web-app/src/components/dashboard-v2/*`, `apps/web-app/src/app/(app)/dashboard/page.tsx`, `packages/intelligence-engine/src/*` (notably `types.ts`, `varianceAnalyzer.ts`, `timestudyAnalyzer.ts`, `bottleneckDetector.ts`, `variantDetector.ts`, `driftDetector.ts`, `standardizationScorer.ts`, `metricsBuilder.ts`).

---

## 0. Bottom line up front (the honest verdict)

Ledgerium is, structurally, a **single-process / multi-run process-mining engine** that already computes most of the *Measure* and *Analyze* primitives an LSS belt needs from one process: per-step timestudy (mean/median/p90/stdDev), duration **coefficient of variation (CV)**, sequence stability, variant frequency, bottleneck ratios, and structural/timing drift vs a baseline window. That is a genuinely strong foundation — it is the deterministic equivalent of what Celonis variant-explorer and Minitab descriptive-stats give a belt in the Measure phase, but auto-captured from real browser behavior rather than hand-mapped or extracted from a transaction log.

**But the *dashboard* today exposes almost none of it.** The shipped surface is a workflow **library list + KPI band** (`computeWorkflowMetrics`, `opportunityCounts`, `healthBandCounts`, `medianCycleTimeMs`, `activityByWeek`). The rich `PortfolioIntelligence` object — `timestudy`, `variance.highVarianceSteps`, `bottlenecks`, `variants`, `drift`, `standardPath` — is computed in the intelligence engine and persisted on `ProcessDefinition`, but the dashboard renders a flattened scalar (`variationScore`, `stabilityScore`, `bottleneckRisk` as a 4-level enum) rather than the analytical views. **The gap is presentation, not computation.** That is good news: most of section 5's high-impact moves are "surface what we already compute," not "build new math."

The single most important honesty boundary: **Ledgerium measures *time and variation*, not *quality*.** It has cycle time and consistency. It does **not** have defect rate, rework rate, takt time, customer demand, value-add vs non-value-add classification, or rolled throughput yield — the things that make Six Sigma "Six Sigma" rather than "process timing." Some of those are a quick honest add (defect/rework proxy from `error_handling` steps; PCE from touch-time vs lead-time). Others (takt, demand, true VA classification) require inputs Ledgerium cannot observe from a browser and must either ask the user for or decline to fabricate. **The product's "stay honest — no fabricated metrics" rule is exactly correct and must be the governing constraint of everything below.**

---

## 1. The LSS practitioner's jobs across DMAIC — what recorded browser-workflow data can and cannot serve

A belt runs a project through Define → Measure → Analyze → Improve → Control. Process mining maps onto DMAIC well; conformance checking is a Measure-phase tool, variant analysis an Analyze-phase tool, and control charts span Measure→Control ([Celonis](https://www.celonis.com/blog/supercharge-your-process-improvement-with-lean-six-sigma-and-process-mining), [Spoclearn DMAIC guide](https://www.spoclearn.com/blog/lean-sixsigma-dmaic-guide/)). Here is the honest map for *Ledgerium's specific data* (observed-only, browser-captured, deterministic).

### DEFINE — partially served
The belt scopes the problem, identifies the process, sets boundaries (SIPOC), and quantifies the opportunity.
- **Served:** Ledgerium auto-produces a **factual as-is process** (`standardPath`, `variants`, `uniqueSystems`, step categories) — this replaces the error-prone hand-drawn current-state map and gives an instant, evidence-linked process boundary and scope-of-systems-touched. The `systemCoverage` and per-workflow `toolsUsed` directly populate the "I/P-side" of a SIPOC.
- **NOT served:** Project charter financials, customer/CTQ definition, problem-statement framing. Ledgerium has no $ impact, no customer voice. **Do not fabricate a "business case."** A known process-mining failure mode is treating it as a dashboard project rather than tying each insight to a DMAIC hypothesis and quantified business case ([Spoclearn](https://www.spoclearn.com/blog/lean-sixsigma-dmaic-guide/)) — Ledgerium should *feed* the charter, not pretend to *be* it.

### MEASURE — strongly served (this is Ledgerium's home turf)
The belt establishes a baseline, validates the measurement system, and quantifies current performance with descriptive stats and a control/stability baseline ([ILSSI Minitab](https://ilssi.org/control-charts-in-minitab-a-complete-guide-for-six-sigma-practitioners/)).
- **Served:** Per-step and total **timestudy** (`TimestudyResult.totalDuration` + `stepPositionTimestudies` with mean/median/p90/stdDev), duration **CV** (`variance.durationVariance.coefficientOfVariation`), step-count variance, sequence stability — a complete deterministic descriptive-stats baseline. Crucially, Ledgerium's measurement system is *the system itself* (browser events), so there is **no measurement-system-analysis gauge R&R problem for time** — capture is deterministic and exact. That is a real differentiator a belt will appreciate: the "data" isn't a sampled stopwatch study, it's a census of every run.
- **NOT served:** Defect/error *rate* against a spec (no spec exists yet), Cp/Cpk capability (requires spec limits), takt time (requires demand). These are Analyze/Measure-adjacent but need inputs Ledgerium does not have.

### ANALYZE — substantially served for *time and variation* root causes; not served for *quality* root causes
The belt finds and verifies the vital-few causes of the problem — Pareto, variation analysis, conformance/variant analysis ([ILMS Academy](https://www.ilms.academy/blog/how-to-apply-pareto-charts-fishbone-diagrams-and-control-charts-in-six-sigma-projects)).
- **Served:** **Bottleneck Pareto** (`bottlenecks.bottlenecks[]` ranked by `durationRatio`), **high-variance-step Pareto** (`variance.highVarianceSteps[]` sorted by CV descending — *already sorted most-variable-first in the engine*), **variant analysis as the canonical "variation is the enemy" view** ([Celonis](https://www.celonis.com/blog/supercharge-your-process-improvement-with-lean-six-sigma-and-process-mining)), **drift detection** (`DriftReport` — structural / timing / exception_rate / step_count). This is a legitimate, evidence-linked Analyze toolkit.
- **NOT served:** Statistical hypothesis testing (t-test, ANOVA, regression), fishbone/cause-effect (human judgment artifact), defect-driver analysis. Ledgerium can tell you *which step is slow and inconsistent*; it cannot tell you *why* or whether the output was *correct*.

### IMPROVE — feeds it, does not do it
The belt designs, pilots, and validates the solution.
- **Served:** Ledgerium surfaces **where to improve** (`automationOpportunity`, `optimizationPotential`, bottleneck steps) and provides the **pre-state baseline** to compare against post-improvement runs. The drift engine with a `baseline` window is effectively a **before/after measurement instrument** — record the improved process, set the old runs as baseline, and `DriftReport` quantifies the timing change with `changePercent`. That is a real Improve-phase asset.
- **NOT served:** Solution design, FMEA, pilot decisions. Human work.

### CONTROL — partially served, with a clear path to "served"
The belt sustains the gain with control charts and a control/response plan; control charts monitor stability over time, flagging only common-cause vs special-cause variation ([Minitab](https://support.minitab.com/en-us/minitab/help-and-how-to/quality-and-process-improvement/control-charts/supporting-topics/basics/understanding-control-charts/)).
- **Served (latent):** `sequenceStability` and per-run durations over time are exactly the raw material for an **I-MR (individuals & moving-range) control chart** — the correct chart for one-measurement-per-run cycle-time data. The `driftDetector` is a coarse special-cause detector already.
- **NOT served (yet):** A true time-ordered control chart with UCL/LCL and Western Electric run-rules is not rendered. This is the single highest-leverage *new* view (section 5).

**Honest one-line summary per phase:** Define ◐, Measure ●, Analyze ● (time/variation only), Improve ◐, Control ◐→● (latent). Ledgerium is a Measure/Analyze powerhouse for *process timing and variation*, a strong *as-is documentation* engine, and an honest non-participant in *quality/defect/demand* analytics until those inputs are added.

---

## 2. The specific LSS tools/views the dashboard should offer that ARE computable today — mapped to existing fields

Every item below is buildable from data the engine already produces. Field paths are real (`PortfolioIntelligence.*` from `packages/intelligence-engine/src/types.ts`, or the flattened API fields in `route.ts`).

| LSS tool / view | What the belt uses it for (DMAIC) | Computable from (existing field) | Honesty note |
|---|---|---|---|
| **Cycle-time + variation report** (mean / median / p95 / stdDev / CV per step + total) | Measure baseline; descriptive stats | `timestudy.totalDuration.{meanMs,medianMs,p90Ms,stdDevMs}` + `stepPositionTimestudies[].{mean,median,p90,stdDev}`; total CV `variance.durationVariance.coefficientOfVariation` | Engine has p90 not p95; label honestly as p90 or extend the analyzer. **Show median *and* mean** — belts read the spread between them as skew. |
| **CV as a consistency proxy** (per-step + per-process consistency index) | Analyze: where is the process *unpredictable* | `variance.highVarianceSteps[].coefficientOfVariation`, `durationVariance.coefficientOfVariation`; threshold `HIGH_VARIANCE_CV_THRESHOLD = 0.5` | CV is a *consistency* proxy, **not capability**. Frame as "execution consistency," never as "sigma level." A high-CV step is your improvement target. |
| **Pareto of bottleneck / high-variance steps** | Analyze: the vital few | `bottlenecks.bottlenecks[]` (ranked by `durationRatio`) and `variance.highVarianceSteps[]` (pre-sorted by CV desc) | This is a real Pareto — render as a sorted bar chart with cumulative-% line. Two Paretos: "slowest steps" (durationRatio) and "least-consistent steps" (CV). |
| **Baseline snapshot** (frozen as-is reference) | Measure: lock the baseline; Control: compare | Whole `PortfolioIntelligence` at a point in time; `metrics.computedAt` + `evidenceRunIds` give provenance | The engine's `baseline` input + `DriftReport` is *purpose-built* for this. Persist a named, dated snapshot the belt can re-compare against. |
| **Variant analysis = "process variation"** | Analyze: conformance, non-standard paths | `variants.{variantCount, standardPath, variants[].frequency, similarityToStandard}` | The canonical Celonis-style variant view. "1 path at 95% = stable; 14 paths = chaos." `frequency` is the % of runs on each path. |
| **Control-style "is it stable?" view** | Measure→Control: common vs special cause | `variance.sequenceStability` (structural) + per-run `durationMs` series → I-MR chart; `driftDetector` special-cause flags | Today only a scalar `stabilityScore` and `bottleneckRisk` enum are surfaced. The raw per-run series exists — render the actual chart (section 5, move 2). |
| **Process stability / standardization scoring** | Define/Analyze: maturity, is there even a standard | `standardizationScorer` → `StandardizationScore.{score, level, factors}`; `ProcessDefinition.stabilityScore`, `confidenceScore` | Already computed with a 4-factor breakdown (dominant-path adherence, sequence stability, variant consolidation, timing consistency). **Surface the breakdown, not just the number.** |
| **Lead time vs touch time** (and Process Cycle Efficiency) | Lean: where is the waste/waiting | Total run `durationMs` (lead/elapsed) vs sum of step active durations (touch); idle gaps already segment runs | PCE = touch / lead ([DCM Learning](https://dcmlearning.ie/lean-course-content/lean-six-sigma-process-cycle-efficiency.html)). Computable *if* step durations sum to active-touch and total is wall-clock — verify the gap is real idle, label "wait/idle" honestly, do not call it "non-value-add" (that's a human judgment — see section 3). |
| **Variant / drift over time** (before vs after) | Improve/Control: did the change hold | `DriftReport.driftSignals[].{driftType, changePercent, baselineValue, currentValue}` | Deterministic before/after instrument. The `changePercent` is the belt's improvement %. |
| **Exception / error-step frequency** | Analyze: rework proxy | `metrics.errorStepFrequency` (mean `error_handling` steps/run) | This is the *honest seed* of a defect/rework metric (section 3). Label "exception/error-handling steps per run," not "defect rate" — yet. |

**The meta-point:** the dashboard should pivot from a *library of workflows* to, when a belt drills into one workflow, a **single-process analytical workbench** (timestudy + Pareto + variant + stability + baseline). The library view is fine as the entry/portfolio screen; the *belt's* screen is the per-process drill-down that exposes `PortfolioIntelligence`.

---

## 3. What's MISSING to be a credible LSS tool — and what it would take to add it honestly

Ledgerium has **time + variation**. A credible Six Sigma toolset also needs **quality (defects), flow (value-add), and demand (takt)**. Here is the honest gap list, each tagged **quick / medium / out-of-scope**, with the data we'd need.

### A. Defect / rework rate — **MEDIUM (honest), and the highest-value addition**
Six Sigma is fundamentally about defects per opportunity. Ledgerium has no defect concept — but it *does* observe `error_handling` steps, exception categories, and re-traversals (a run that revisits an earlier step).
- **Honest path:** Let the belt **define what a "defect" or "rework" is for this process** — e.g., "any run containing an `error_handling` step," or "any run that backtracks to a prior step," or "any run > N steps." Then compute **% of runs with rework**, **rework steps per run**, and the seed of **First-Pass Yield (FPY)** = runs with zero defined-defect / total runs.
- **Why medium not quick:** the *definition* is user-supplied (you cannot infer "defect" from a browser — a correct-looking run can still produce a wrong output). The honest design is a **belt-configured defect rule** over observed signals, clearly labeled "defect = your definition over observed error/rework steps," never an opaque score. This converts `errorStepFrequency` from a curiosity into a Measure-phase DPMO/FPY foundation. **Do not auto-label anything a "defect" without the belt defining it.**

### B. Value-add / non-value-add classification — **MEDIUM, and must be human-in-the-loop**
PCE and value-stream analysis require classifying each step as Value-Add (VA), Business-Value-Add (BVA), or Non-Value-Add (NVA); lead time = VA + BVA + NVA time ([SixSigma.us VSM](https://www.6sigma.us/business-process-management-articles/value-stream-management-vsm/), [DCM Learning](https://dcmlearning.ie/lean-course-content/lean-six-sigma-process-cycle-efficiency.html)).
- **What we can do honestly today:** distinguish **active (touch) time vs idle/wait time** purely from observation (idle gaps already exist in segmentation). That gives a *defensible* "touch vs wait" split and a **Process Cycle Efficiency = touch / lead** number — **the honest, observation-only half of value-stream analysis.**
- **What we cannot do honestly:** decide a step is *non-value-add*. VA/NVA is a customer-value judgment; a fast step can be pure waste and a slow step can be the core value. **The product must NOT auto-classify VA/NVA.** Offer a **per-step-category VA/BVA/NVA tagging UI** (belt tags each step category once; tags persist on the `ProcessDefinition`), then compute the **value-added ratio** from belt tags × observed touch time. This is the textbook approach and stays honest: Ledgerium supplies the *time*, the belt supplies the *value judgment*.

### C. Takt time, customer demand, schedule attainment — **OUT OF SCOPE (do not fabricate)**
Takt = available time / customer demand. Ledgerium observes *what was done*, not *what was required* or *when the customer needed it*. There is **no honest browser-derived takt.** If a customer wants takt-vs-cycle, it must be a **user-entered demand input** (units/period + available time), and Ledgerium then computes takt and compares to observed median cycle time. Offer it as an *optional belt input*, clearly separated from observed metrics. **Never infer demand.**

### D. Cp/Cpk process capability — **OUT OF SCOPE until spec limits exist**
Capability requires a spec/USL/LSL. There is no spec. If a belt enters a target cycle-time spec (e.g., "this task should take ≤ 5 min"), Ledgerium *could* compute a capability-style "% of runs within spec" and a Cpk-analog — but flag it explicitly as **spec-relative, belt-defined**, and prefer the simpler, less-abusable "% of runs ≤ target" over a true Cpk that implies normality the data may not satisfy.

### E. True SPC control chart with run-rules — **QUICK-to-MEDIUM and the best ROI new build**
The per-run `durationMs` series + `computedAt` ordering is all that's needed for an **I-MR chart** with mean, ±3σ control limits, and basic Western Electric run-rules. This is the *one piece of genuine LSS apparatus the dashboard lacks and most needs* — it turns "stabilityScore: 0.8" into the chart a belt actually trusts and screenshots into a Control plan ([Minitab control charts](https://support.minitab.com/en-us/minitab/help-and-how-to/quality-and-process-improvement/control-charts/supporting-topics/basics/understanding-control-charts/)). **Quick on the math (I-MR is trivial), medium on doing run-rules + time-ordering correctly.**

### F. Statistical hypothesis testing — **OUT OF SCOPE (defer to Minitab)**
t-tests / ANOVA / regression are a belt's Minitab job. Ledgerium's role is to *export clean, evidence-linked run-level data* (durations, step counts, variant IDs, evidence run IDs) so the belt can drop it into Minitab/JMP. **A CSV/clipboard export of the per-run dataset is a higher-honesty move than re-implementing inferential stats.**

**Quick wins (ship-soon, honest):** PCE (touch/lead), exception/rework-rate surfacing of `errorStepFrequency`, baseline-snapshot persistence, run-level data export. **Medium:** belt-defined defect rule + FPY, VA/BVA/NVA tagging UI, I-MR control chart. **Out-of-scope / user-input-only:** takt, demand, Cp/Cpk, inferential stats.

---

## 4. How the dashboard should present a BASELINE + a "best/standard path" (documentation use case)

This is where Ledgerium's evidence-linked determinism is a *category advantage* over both hand-drawn VSMs and even Celonis (which mines transaction logs, not actual UI behavior). Two deliverables:

### 4.1 The Baseline Snapshot ("frozen as-is")
A belt's Measure phase ends with a **locked baseline** every later phase compares against ([ILSSI](https://ilssi.org/control-charts-in-minitab-a-complete-guide-for-six-sigma-practitioners/)). Present it as a **named, dated, immutable card** that captures, at snapshot time:
- Header: process name, snapshot date, **N runs (evidence count)**, rule/engine version, `computedAt` — provenance is the trust signal.
- Time block: median + mean + p90 + CV total cycle time; PCE (touch/lead) once available.
- Stability block: `sequenceStability`, `standardizationScore` with its 4-factor breakdown, variant count.
- Top-3 bottleneck steps + top-3 high-variance steps (the Pareto heads).
- **Every number links to its `evidenceRunIds`** — clicking "median 4m 32s · N=47" shows the runs behind it. This is Ledgerium's moat made visible: the baseline isn't asserted, it's *traceable to source events*. This directly satisfies the immutability/traceability product principles.
- Action: "Set as baseline" → feeds the engine's `baseline` input so all future `DriftReport`s measure improvement against this frozen point.

### 4.2 The Standard Path (the documentation deliverable)
`standardPath` / `variants.standardPath` already identifies the **most frequent execution path** and its `frequency`. For the SOP/documentation use case present it as:
- A **vertical step list of the standard path** (the `stepCategories` sequence), each step annotated with its observed median duration, CV (consistency badge), and N. This *is* the auto-generated, evidence-based SOP.
- A **"% of runs that follow this exact path"** headline (`standardPath.frequency`). 95% → "this is genuinely your standard." 40% → "you do not have a standard process yet; you have N competing variants" — an honest, useful Define-phase finding.
- A **variant ladder** beneath it: each variant by `frequency` and `similarityToStandard`, with `OutlierRun`s flagged (from `standardizationScorer`). The belt instantly sees "1 dominant path + 3 minor variants + 2 outliers" — the conformance picture.
- **Honesty guard:** label it "**observed standard path** (most frequent), not the *prescribed* SOP." Ledgerium documents *how the process is actually run*, which is precisely the gold a belt wants ("how their organization really runs," [Celonis](https://www.celonis.com/blog/supercharge-your-process-improvement-with-lean-six-sigma-and-process-mining)) — but it must never claim this is the *approved* procedure. The `documentationDriftScore` (SOP-vs-reality divergence) is the bridge: it explicitly measures how far the observed standard path has drifted from a belt-supplied SOP.

---

## 5. The highest-impact moves to make the dashboard valuable to LSS belts — ranked, honest about data limits

Ranked by (belt value × buildability-from-existing-data), most actionable first. Moves 1–5 are **"surface what we already compute"** (low risk, high impact). Moves 6–9 need new inputs but stay honest.

1. **Ship the per-process Analytical Workbench (drill-down) that exposes `PortfolioIntelligence`.** The single biggest gap is that `timestudy`, `variance.highVarianceSteps`, `bottlenecks`, `variants`, `standardPath`, and `drift` are *computed and persisted but not rendered*. Build the per-workflow drill-down view that shows them. **Pure presentation of existing data; zero new math; zero honesty risk.** This alone moves the dashboard from "library" to "LSS Measure/Analyze tool."

2. **Render a real I-MR control chart of per-run cycle time** with mean, ±3σ limits, and basic run-rules. Turns the `stabilityScore` scalar + raw per-run durations into the apparatus belts actually trust for Measure→Control. *Quick math, the highest-value new build.* Honesty: label control limits as derived from observed common-cause variation, require a minimum N (e.g., ≥ 8–12 runs) before drawing limits, and say so when N is too low.

3. **Two Pareto charts: slowest steps (`durationRatio`) and least-consistent steps (CV).** Both lists are *already ranked in the engine*. Add a sorted bar + cumulative-% line. This is the Analyze-phase "vital few" view ([ILMS](https://www.ilms.academy/blog/how-to-apply-pareto-charts-fishbone-diagrams-and-control-charts-in-six-sigma-projects)). Trivial build, immediately recognizable to any belt.

4. **Baseline Snapshot card + "Set as baseline" → before/after drift.** (Section 4.1.) Persist a named/dated snapshot; wire the engine's existing `baseline` input + `DriftReport` so improvement is quantified with `changePercent`. Makes Ledgerium an Improve/Control instrument, not just a Measure mirror. Existing engine capability — mostly UI + persistence.

5. **Promote the Standard Path + Variant ladder as the documentation deliverable** with the "% of runs on the standard path" headline and the "you don't have a standard yet" honest finding. (Section 4.2.) Existing `standardPath` / `variants` / `OutlierRun` data; label "observed, not prescribed."

6. **Surface exception/error-step frequency honestly and let the belt define a "defect/rework" rule** over `error_handling` steps / backtracking, then compute **% runs with rework + First-Pass Yield**. (Section 3A.) *Medium.* This is the first genuine *quality* metric — gate it behind a belt-supplied definition; never auto-label a defect.

7. **Add Lead-time vs Touch-time and Process Cycle Efficiency (PCE = touch/lead).** (Section 2 + 3B.) Computable from observed active vs idle time *if the idle gap is genuinely measured* — verify that, label idle as "wait/idle," and stop short of calling it non-value-add. The honest, observation-only half of value-stream analysis ([DCM Learning PCE](https://dcmlearning.ie/lean-course-content/lean-six-sigma-process-cycle-efficiency.html)).

8. **Add a belt-driven Value-Add / BVA / NVA tagging layer** over step categories, then compute the value-added ratio. (Section 3B.) *Medium; human-in-the-loop by design.* Ledgerium supplies time, the belt supplies the value judgment — this is the only honest way to do VSM and it positions Ledgerium as a VSM *accelerator*.

9. **Run-level data export (CSV/clipboard) for Minitab/JMP.** (Section 3F.) Export durations, step counts, variant IDs, and `evidenceRunIds`. The highest-honesty move of all: rather than re-implement inferential statistics, make Ledgerium the *clean, evidence-linked data source* that feeds the belt's existing statistical toolchain. Cheap to build, disproportionately trust-building.

**Explicitly NOT recommended (honesty boundary):** auto-classifying VA/NVA; inferring takt or customer demand; computing Cp/Cpk without belt-supplied spec limits; auto-labeling "defects"; presenting CV as a sigma level. Each of these would require fabricating an input Ledgerium cannot observe — and the product's correct, non-negotiable rule is *no fabricated metrics*. A belt will trust Ledgerium *more* for declining to invent these than for faking them; "honest about data limits" is itself a competitive feature against tools that over-claim.

---

## Appendix — field-name reference (for the implementing team)

- Engine output object: `PortfolioIntelligence` (`packages/intelligence-engine/src/types.ts`), persisted to `ProcessDefinition.intelligenceJson`, adapted via `metrics-input-adapter.ts` / `parseIntelligenceJson`.
- Timestudy: `timestudy.totalDuration.{meanMs,medianMs,p90Ms,minMs,maxMs,stdDevMs}`, `timestudy.stepPositionTimestudies[].{position,category,mean/median/min/max/p90DurationMs,stdDevMs,runCount,evidenceRunIds}`.
- Variation/CV: `variance.durationVariance.{stdDevMs,coefficientOfVariation,isHighVariance}`, `variance.highVarianceSteps[].{position,category,coefficientOfVariation,meanDurationMs,stdDevMs}` (pre-sorted CV desc), `variance.sequenceStability`, `variance.stepCountVariance`.
- Variants: `variants.{variantCount,standardPath,variants[].{frequency,similarityToStandard,runCount},variantSimilarityThreshold}`.
- Bottlenecks: `bottlenecks.bottlenecks[].{position,category,durationRatio,meanDurationMs,coefficientOfVariation,isHighDuration,isHighVariance}` (Pareto-ready).
- Drift (before/after): `drift.driftSignals[].{driftType,severity,baselineValue,currentValue,changePercent}` — engine input accepts a `baseline` run window.
- Standardization: `standardizationScorer` → `StandardizationScore.{score,level,factors:{dominantPathAdherence,sequenceStability,variantConsolidation,timingConsistency}}`; `DocumentationDriftScore`, `OutlierRun`.
- Exception proxy: `metrics.{errorStepFrequency,navigationStepFrequency,completionRate}`.
- Thresholds (configurable): `HIGH_VARIANCE_CV_THRESHOLD=0.5`, `BOTTLENECK_DURATION_MULTIPLIER=1.5`, `DRIFT_DURATION_THRESHOLD=0.25`, `MIN_RUNS_FOR_VARIANT_DETECTION=2`.
- Currently-rendered dashboard fields (`route.ts`): flattened scalars `variationScore`, `bottleneckRisk`(enum), `optimizationPotential`, `processMaturityScore`, `metricsV2`, plus band aggregates `opportunityCounts`, `healthBandCounts`, `medianCycleTimeMs`, `activityByWeek`. **Note: p90 (not p95) is what the engine computes — extend the analyzer or label honestly.**

**Sources:** [Celonis — Lean Six Sigma & Process Mining](https://www.celonis.com/blog/supercharge-your-process-improvement-with-lean-six-sigma-and-process-mining) · [Celonis — Process mapping in Six Sigma](https://www.celonis.com/blog/introduction-to-process-mapping-in-six-sigma) · [Spoclearn — Process Mining DMAIC Guide 2026](https://www.spoclearn.com/blog/lean-sixsigma-dmaic-guide/) · [GoLeanSixSigma — Process Mining](https://goleansixsigma.com/find-data-gold-with-process-mining/) · [Minitab — Understanding control charts](https://support.minitab.com/en-us/minitab/help-and-how-to/quality-and-process-improvement/control-charts/supporting-topics/basics/understanding-control-charts/) · [ILSSI — Control Charts in Minitab](https://ilssi.org/control-charts-in-minitab-a-complete-guide-for-six-sigma-practitioners/) · [ILMS Academy — Pareto/Fishbone/Control charts](https://www.ilms.academy/blog/how-to-apply-pareto-charts-fishbone-diagrams-and-control-charts-in-six-sigma-projects) · [DCM Learning — Process Cycle Efficiency](https://dcmlearning.ie/lean-course-content/lean-six-sigma-process-cycle-efficiency.html) · [SixSigma.us — Value Stream Management](https://www.6sigma.us/business-process-management-articles/value-stream-management-vsm/)
