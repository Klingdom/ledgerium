# Process Performance Metrics — Expert Mapping for the Ledgerium Workflow Report

**Author role:** Process-performance-metrics / operational-KPI expert (Lean, Six Sigma, BPM, process mining)
**Scope:** READ-ONLY review of product code. Maps Ledgerium's workflow Report against the canonical process-performance-metric taxonomy and recommends, honestly, which metrics the report should add.
**Date:** 2026-06-15
**Status:** Advisory artifact. No code changes proposed; no product surface touched.

---

## 0. Source of truth — what Ledgerium actually computes today

Read for this analysis:

- `apps/web-app/src/components/detail/WorkflowReportPage.tsx` — the rendered Report (hero, verdict, 5-tile scorecard, phases, insights, automation, bottlenecks, step breakdown).
- `apps/web-app/src/components/detail/reportScorecard.ts` — pure derivation for the 5-tile scorecard + variant Pareto.
- `apps/web-app/src/components/detail/reportEvidence.ts` — pure derivations for cycle-time distribution, consistency score, bottleneck contribution ranking, drift, insight cards.
- `packages/intelligence-engine/src/types.ts` — **the authoritative computed-field contract** (`ProcessMetrics`, `TimestudyResult`, `VarianceReport`, `VariantSet`, `BottleneckReport`, `DriftReport`, `StandardPathResult`).
- `packages/intelligence-engine/src/metricsBuilder.ts` — how the aggregate metrics are actually built.
- `packages/process-engine/src/types.ts` + `processRunBuilder.ts` — the per-run capture (`durationMs`, `stepCount`, `errorStepCount`, `navigationStepCount`, `completionStatus`).

### The honest field inventory (what exists, with provenance)

| Computed today | Engine field | Notes |
|---|---|---|
| Run count | `ProcessMetrics.runCount` | Volume basis for every multi-run claim. |
| Completion rate | `ProcessMetrics.completionRate` | `complete`/`partial` fraction. **Computed but not surfaced in the Report.** |
| Cycle time — mean/median/p90/min/max | `ProcessMetrics.{mean,median,p90,min,max}DurationMs` | Whole-run wall-clock duration. |
| Cycle-time std-dev | `VarianceReport.durationVariance.stdDevMs` | |
| Cycle-time CV | `VarianceReport.durationVariance.coefficientOfVariation` | High-variance threshold 0.5. |
| Sequence stability (0–1) | `VarianceReport.sequenceStability` | Fraction of runs on the standard path. |
| Step-count spread | `VarianceReport.stepCountVariance.{min,max,stdDev}` | **Computed but not surfaced.** |
| Variants + frequency | `VariantSet.variants[].{runCount,frequency,isStandardPath}` | |
| Standard-path coverage | `StandardPathResult.frequency` (0–1) + `runCount` | Conformance basis. |
| Per-step timestudy | `StepPositionTimestudy.{mean,median,p90,min,max,stdDev}DurationMs` | Position-level timing. |
| Bottleneck ratio + run count | `BottleneckStep.{durationRatio,runCount,isHighDuration,isHighVariance}` | Step mean / overall mean ≥ 1.5. |
| Error-step frequency (per run) | `ProcessMetrics.errorStepFrequency` | Mean `error_handling` steps per run. **Computed but not surfaced.** |
| Navigation-step frequency | `ProcessMetrics.navigationStepFrequency` | **Computed but not surfaced.** |
| Drift signals | `DriftReport.driftSignals[]` | Only when a baseline window is provided. |
| Automation score / opportunities | `agentIntelligence.workflow.automationScore`, `opportunities[]` | Deterministic 0–100 + estimated savings. |
| Systems / event counts | `ProcessMetrics.uniqueSystems`, `ProcessRun.{event,human,system}EventCount` | |

**Decisive boundary fact:** Per-step durations exist (`StepDefinition.durationMs`, `StepPositionTimestudy.*`) and are gap-based (inter-event wall-clock). There is **no value-add / non-value-add (VA/NVA) classification** on any step, and **no explicit wait/idle vs touch/processing split** in the capture. `workflowInsights.ts:193` *infers* a "wait/pause" only from a single long (>45 s) `single_action` step — a heuristic, not a measured wait channel. This single fact governs every honesty verdict below about flow efficiency, value-add %, and processing-vs-wait time.

---

## 1. The canonical process-performance-metric taxonomy vs. Ledgerium

Legend: **✅ Compute** (honest today) · **�ðŸŸ¡ Partial** (honest with a small, named addition or a labeled proxy) · **❌ Cannot** (would require inputs/classification Ledgerium does not have — showing it would be fabrication).

References anchoring each metric family appear in §6.

### 1a. Time metrics

| Canonical metric | Definition | Ledgerium | Source / why |
|---|---|---|---|
| **Cycle time** | Elapsed time to complete one execution (start→end). | ✅ Compute | `ProcessMetrics.medianDurationMs` etc. This is the run wall-clock. Already the headline tile. |
| **Lead time** | Time from request/arrival to delivery, *including queue before work starts*. | ❌ Cannot | Ledgerium observes the recording window (work in progress). It does not observe arrival/request time or pre-work queue. Calling cycle time "lead time" would be wrong. State as cycle time only. |
| **Processing time (touch time)** | Time hands are actually on the work. | 🟡 Partial (proxy only) | Per-step durations exist, but with no touch/wait classification we cannot isolate touch time honestly. A proxy ("sum of active step durations") is defensible *only if* idle gaps are excluded — see §1b PCE. |
| **Wait / queue time** | Idle time between value-adding activity. | 🟡 Partial (proxy only) | Only inferable from long idle `single_action` gaps (`workflowInsights.ts:193`, >45 s heuristic). Honest as a *flagged idle-gap count*, not as a measured queue-time total. |
| **Throughput time** | Same family as cycle time in process mining (Celonis "throughput time" = case start→end). | ✅ Compute | Identical to cycle time here. Percentiles (p90) already computed; **min/max/p90 not all shown** in a single distribution view. |
| **% within target (on-time rate)** | Share of executions meeting a target cycle time / SLA. | 🟡 Partial (needs one user input) | Engine has every per-run duration summary; the *target* is the missing input. Honest the moment the user sets a target — see §2. |
| **Takt time** | Available time ÷ customer demand. | ❌ Cannot | Requires demand volume and available time. Ledgerium observes neither. |

### 1b. Flow / efficiency

| Canonical metric | Definition | Ledgerium | Source / why |
|---|---|---|---|
| **Process Cycle Efficiency (PCE)** | Value-added time ÷ total lead time ([6sigma.us](https://www.6sigma.us/business-process-management-articles/process-cycle-efficiency/)). | ❌ Cannot (true PCE) | Requires VA classification of each activity. Ledgerium has none. A *touch-vs-idle ratio* proxy is possible only if a measured wait channel is added (see §2) — and even then it is "active-time ratio," **not** PCE, because active ≠ value-added. |
| **First-Time-Right / First-Pass Yield (FPY)** | Share of executions completed correctly with no rework/scrap on the first pass. | 🟡 Partial (honest proxy) | Defensible proxy: runs that follow the standard path **and** have `errorStepCount = 0` (and no repeated-step rework). All inputs exist (`sequenceStability`/`StandardPathResult`, `errorStepCount`). Must be labeled a **proxy** — there is no human "correctness" judgment, only "clean, on-standard-path execution." See §2. |
| **Rework rate / rework-loop rate** | Share of executions (or steps) that repeat work. | 🟡 Partial | Repeated-step detection is feasible from step sequences + `interpretation.rework[]` (the LLM interpretation already carries `rework` with `occurrences`). Honest as **"runs containing a repeated/rework step,"** scoped to what is actually detected, not a universal rework %. |
| **Throughput / volume** | Executions per period. | 🟡 Partial | `runCount` is a volume count. True throughput (per unit time) needs a time window the Report does not currently frame. Honest as **run count**, not throughput-rate, unless windowed. |

### 1c. Quality

| Canonical metric | Definition | Ledgerium | Source / why |
|---|---|---|---|
| **Defect rate** | Defects ÷ units. | 🟡 Partial (proxy only) | Only as an **exception/error-step rate** proxy (`errorStepFrequency`). There is no defect *definition*, so this is "observed exception steps per run," never "defect rate." |
| **DPMO** | Defects per million opportunities ([Wikipedia](https://en.wikipedia.org/wiki/Defects_per_million_opportunities)). | ❌ Cannot | Requires a defect definition **and** an opportunity count per unit. Ledgerium has neither. |
| **Sigma level** | Z-score from DPMO ([MoreSteam table](https://www.moresteam.com/toolbox/six-sigma-conversion-table)). | ❌ Cannot | Derived from DPMO. No DPMO ⇒ no sigma level. |
| **Cp / Cpk** | Capability vs. spec limits ([isixsigma](https://www.isixsigma.com/dictionary/convert-dpmo-sigma-to-cpk/)). | ❌ Cannot | Requires customer/engineering **specification limits (USL/LSL)**. Ledgerium has no spec limits. |

### 1d. Variation / consistency

| Canonical metric | Definition | Ledgerium | Source / why |
|---|---|---|---|
| **Std-dev (cycle time)** | Dispersion of durations. | ✅ Compute | `durationVariance.stdDevMs`. Computed; not directly shown as a number. |
| **Coefficient of Variation (CV)** | std-dev ÷ mean. | ✅ Compute | `coefficientOfVariation`. Already the Consistency tile. |
| **Sequence stability** | Fraction of runs on the dominant structural path. | ✅ Compute | `sequenceStability`. Already feeds the consistency gauge. |

### 1e. Conformance (process mining)

| Canonical metric | Definition | Ledgerium | Source / why |
|---|---|---|---|
| **% on standard path (conformance / fitness proxy)** | Share of cases following the reference variant ([Celonis conformance](https://help.celonis.de/cpm47/en/conformance-checker)). | ✅ Compute | `StandardPathResult.frequency` × 100. Present in the verdict text but **not surfaced as a first-class conformance KPI**. |
| **Deviation rate** | Share of cases that deviate from the reference. | ✅ Compute | `1 − standardPath.frequency`. Trivial complement; not shown explicitly. |
| **Variant count** | Number of distinct paths. | ✅ Compute | Already a scorecard tile + Pareto. |

### 1f. Cost

| Canonical metric | Definition | Ledgerium | Source / why |
|---|---|---|---|
| **Cost per transaction / cost of poor quality** | Money per execution / cost of defects. | ❌ Cannot | No cost data, no labor-rate input. **N/A** — do not show. |

### 1g. Automation

| Canonical metric | Definition | Ledgerium | Source / why |
|---|---|---|---|
| **Automation rate / candidate score** | Share automatable / automation potential. | ✅ Compute | Deterministic `automationScore` + opportunities + estimated savings. Already shown; confidence-banded by run count. |

### 1h. Drift / trend

| Canonical metric | Definition | Ledgerium | Source / why |
|---|---|---|---|
| **Drift (structural/timing/exception/step-count)** | Change vs. a baseline window. | ✅ Compute (when baseline present) | `DriftReport.driftSignals[]`. Honest: only appears when a baseline window is provided. Already surfaced. |

**Summary count:** 8 families fully computable, 7 honest-with-care / proxy, 6 must-not-show. The report already shows most of the ✅ items but **leaves several computed metrics on the floor** (completion rate, std-dev, step-count spread, error-step frequency, conformance %, deviation rate).

---

## 2. Metrics the report SHOULD add — honestly computable now or with small additions

Each item states the source, the exact honesty constraint, and whether it is **honest today**, **honest with a label**, or **requires an input/classification**.

1. **Throughput-time distribution (min · median · mean · p90 · max) as a single panel — HONEST TODAY.**
   All five summary points are already computed (`ProcessMetrics.*DurationMs`) and `reportEvidence.deriveDistribution` already builds the 5-number summary; the cycle-time spread shows it but **p90 and the mean are under-exposed**. Surface the full 5-number summary as labeled markers. No new computation. The engine does not expose per-run durations, so this must remain a **5-number summary / box-range, not a fabricated histogram** (the code comment already enforces this — keep it).

2. **Conformance rate (% on standard path) + deviation rate — HONEST TODAY.**
   `standardPath.frequency` is computed. Promote it from buried verdict prose to a **first-class conformance KPI** ("X% of runs follow the reference path; Y% deviate across N variants"). This is the single most recognizable process-mining metric a black belt will look for, and it is already in hand. Multi-run only (gate at runCount ≥ 2, consistent with existing tiles).

3. **Exception / error-step rate per run — HONEST TODAY (as a proxy, labeled).**
   `errorStepFrequency` is computed and **currently shown nowhere on the Report**. Surface as "Avg N exception/recovery steps per run (M% of runs hit an exception)." Label it as an **observed exception rate**, never "defect rate." Honest immediately.

4. **Completion rate — HONEST TODAY.**
   `completionRate` (complete vs partial) is computed and unsurfaced. A clean, recognizable operational KPI. Surface with N-attribution.

5. **First-Time-Right (FTR) proxy — HONEST WITH A LABEL.**
   Define as: share of runs that (a) follow the standard path **and** (b) have `errorStepCount = 0` **and** (c) contain no detected repeated/rework step. All three inputs exist (`sequenceStability`/per-run path membership, `errorStepCount`, `interpretation.rework`). This is a **structural FTR proxy** — clean, on-standard, no exception, no rework. Must carry an explicit "(proxy: clean, on-standard-path runs)" disclosure; it is **not** a correctness judgment. Honest with the label; do not call it bare "first-pass yield."

6. **Rework-loop rate — HONEST WITH A SCOPE LABEL.**
   `interpretation.rework[]` already carries detected repeated patterns with `occurrences`. Surface "M% of runs contain a repeated/rework step." Scope the claim to **detected** rework (repeated step categories / `rework` entries), not an exhaustive rework %. Honest within that scope.

7. **% within a user-set cycle-time target — HONEST ONCE THE USER PROVIDES THE TARGET.**
   Every per-run duration summary is in hand; the **target is the only missing input**. Add a user-set target field; then "P% of runs completed within {target}" is fully honest and is the closest legitimate analogue to an SLA / on-time metric. Do **not** invent a target from a benchmark — the report's own "Evidence-linked" promise ("No benchmarks, no estimates") forbids it.

8. **Process-Cycle-Efficiency proxy (active-time ratio) — REQUIRES A NEW MEASURED INPUT; DO NOT SHIP AS "PCE".**
   True PCE needs VA classification (absent). A defensible *active-vs-idle* ratio is possible **only if** a measured wait/idle channel is added to capture (today only a >45 s single-action heuristic exists). Even then, label it **"active-time ratio (touch vs idle)"**, explicitly *not* PCE and *not* value-add %, because active time ≠ value-added time. Recommendation: treat as a **future capture enhancement**, not a now-additable metric. Honesty verdict: **not honest today**; partial only after a wait channel exists.

**Honest-now vs. needs-input split:**
- Honest immediately (no new input): items **1, 2, 3, 4** (and the labeled proxies **5, 6**).
- Needs one user input: item **7** (target).
- Needs a new measured capture channel: item **8** (wait time) — and even then it is an active-time ratio, never PCE.

---

## 3. Metrics we must NOT show without user inputs / classification

State firmly. Showing any of these from current data would fabricate a number and break the report's evidence-linked promise.

- **DPMO** — requires a **defect definition** and an **opportunity count per unit**. Ledgerium has neither. ❌ Do not show.
- **Sigma level** — derived from DPMO. No DPMO ⇒ no sigma level. ❌ Do not show. (An exception-step rate is *not* a sigma level and must never be presented as one.)
- **Cp / Cpk** — require **specification limits (USL/LSL)** set by customer/engineering. Ledgerium has no spec limits. ❌ Do not show. (Per [isixsigma](https://www.isixsigma.com/dictionary/convert-dpmo-sigma-to-cpk/), you cannot even derive Cpk without knowing how defects split above USL vs below LSL.)
- **Value-add % / VA-NVA split / true Process Cycle Efficiency** — require a **per-activity value-added classification**. Ledgerium captures no VA/NVA judgment. ❌ Do not show as VA%/PCE. (An active-time ratio, if a wait channel is added, is the most that may be shown — and only under a non-VA label.)
- **Takt time** — requires **customer demand** and **available time**. Observed by neither. ❌ Do not show.
- **Cost per transaction / Cost of Poor Quality** — require **cost/labor-rate inputs**. None exist. ❌ N/A — do not show.
- **True first-pass yield / defect rate (unqualified)** — require a **defect/correctness definition**. The FTR and exception-rate items in §2 are *labeled proxies*; the bare, unqualified quality terms must not be used.

Rule of thumb for the report: **if a metric needs a target, a spec limit, a demand figure, a cost, or a human correctness/VA judgment that the user has not supplied, it is fabrication to display it.** The existing "Evidence-linked" badge is the right guardrail — these metrics violate it by construction.

---

## 4. Recommended report metric SET + labeling (trusted by a non-expert AND a black belt)

Design principle: every figure carries **(a) a plain-English definition, (b) N-attribution (how many runs it is based on), and (c) target/threshold context**. This is what makes a black belt trust it (rigor + provenance) and a non-expert read it (plain words).

| KPI | Label on report | Definition shown (microcopy) | N-attribution | Threshold / target context |
|---|---|---|---|---|
| Cycle time (median) | **Cycle Time** | "Median run duration." | "Median across N runs" (or "Single recorded run"). | Distribution panel shows min·median·mean·p90·max. |
| Cycle-time spread | **Cycle-Time Spread** | "Range and percentiles of run duration." | "N runs." | 5-number summary; p90 marked. |
| Consistency (CV) | **Consistency (CV)** | "Coefficient of variation = std-dev ÷ mean." | "N runs." | "CV ≥ 0.50 = high variance" (engine threshold). |
| Conformance | **On Standard Path** | "Share of runs following the reference path." | "X of N runs." | Pair with deviation rate + variant count. |
| Deviation | **Deviation Rate** | "Share of runs that deviate from the reference path." | "Y of N runs." | Complement of conformance. |
| Variants | **Variant Count** | "Number of distinct execution paths." | "N runs." | Pareto shows the long tail. |
| Exception rate | **Exception Rate** *(proxy)* | "Avg recovery/error steps per run (observed)." | "Based on N runs." | Label "(observed exception steps — not a defect rate)." |
| Completion | **Completion Rate** | "Share of runs that reached completion." | "X of N runs." | complete vs partial. |
| First-time-right | **First-Time-Right** *(proxy)* | "Runs on the standard path, no exception, no rework." | "X of N runs." | Disclosure: "proxy — clean, on-standard runs." |
| Rework | **Rework Rate** *(detected)* | "Runs containing a repeated/rework step." | "M of N runs." | Scope label: "detected repeats only." |
| Within target | **On-Target Rate** | "Runs completing within your target." | "P of N runs." | Only after the user sets a target. |
| Bottleneck | **Primary Bottleneck** | "Slowest step by share of cycle time." | "N runs; step run-count shown." | % of cycle time + Slow/Variable flag. |
| Automation | **Automation Score** | "Deterministic automation potential 0–100." | confidence band by N runs. | ≥70 strong / 40–69 partial / <40 low. |
| Drift | **Drift vs. Baseline** | "Change vs. the baseline window." | baseline N vs current N. | Only when a baseline exists. |

**Two universal labeling rules to keep the evidence-linked promise intact:**
1. Every proxy metric (Exception Rate, FTR, Rework) carries the word **"proxy"/"observed"/"detected"** inline — never the bare Six Sigma term.
2. Every multi-run metric is **gated at N ≥ 2** and shows N; single-run shows "1 run" / "—" (the codebase already does this for CV, variant count, consistency — extend the same discipline to the new tiles).

---

## 5. The prioritized metric additions (ranked, honest)

Ranked by trust-value ÷ effort, all honest. Items 1–6 need **no new inputs**; 7 needs one user input; 8 needs a capture change and a non-VA label.

| # | Addition | Honesty | Effort | Why it ranks here |
|---|---|---|---|---|
| **1** | **Conformance % (on standard path) + deviation rate** as a first-class KPI | ✅ Honest today (`standardPath.frequency`) | XS — data in hand | The #1 process-mining metric a black belt expects; already computed, currently buried in prose. Highest trust-per-effort. |
| **2** | **Full cycle-time distribution panel** (min·median·mean·p90·max) | ✅ Honest today | XS — `deriveDistribution` exists | Surfaces p90/mean that are computed but under-shown; box-range, not a fabricated histogram. |
| **3** | **Exception Rate (proxy)** per run + % of runs hitting an exception | ✅ Honest w/ label (`errorStepFrequency`) | XS — computed, unsurfaced | Closest honest analogue to a defect/quality signal; pure relabel of existing field. |
| **4** | **Completion Rate** | ✅ Honest today (`completionRate`) | XS — computed, unsurfaced | Recognizable operational KPI; trivially honest. |
| **5** | **First-Time-Right (proxy):** standard-path ∧ zero-error ∧ no-rework | 🟡 Honest w/ label | S — small derivation over existing fields | The metric executives ask for; honest only as a clearly-labeled structural proxy. |
| **6** | **Rework Rate (detected):** % of runs with a repeated/rework step | 🟡 Honest w/ scope label | S — uses `interpretation.rework[]` | Pairs with FTR to tell a Lean story; scope the claim to detected repeats. |
| **7** | **On-Target Rate:** % of runs within a user-set cycle-time target | 🟡 Honest once target supplied | S — UI input + threshold count | The only legitimate SLA/on-time metric; requires the user's target, never a benchmark. |
| **8** | **Active-time ratio (touch vs idle)** — *labeled NOT-PCE* | ❌ Not honest today; 🟡 after a wait channel | M — capture-channel change | The proxy for flow efficiency; defer until a measured wait/idle channel exists, and never label it PCE or value-add %. |

**Do-not-add list (firm):** DPMO, sigma level, Cp/Cpk, value-add % / true PCE, takt time, cost per transaction. Each requires an input class (defect definition, spec limits, demand, cost, VA classification) Ledgerium does not capture; displaying any of them would fabricate a number and break the evidence-linked guarantee.

---

## 6. References

- Process Cycle Efficiency = value-added time ÷ lead time; Lean threshold ~25%, typical 5–10% — [6sigma.us, PCE](https://www.6sigma.us/business-process-management-articles/process-cycle-efficiency/); [Lean 6 Sigma Hub, PCE guide](https://lean6sigmahub.com/process-cycle-efficiency-a-complete-guide-to-calculating-value-added-time-ratio/); [QualityAmerica, PCE](https://qualityamerica.com/LSS-Knowledge-Center/leansixsigma/process_cycle_efficiency.php).
- Process-mining throughput time, conformance, variants vs. deviations, fitness — [Celonis, Conformance Checker](https://help.celonis.de/cpm47/en/conformance-checker); [Celonis, How Process Mining Works](https://www.celonis.com/process-mining/how-does-process-mining-work/).
- DPMO definition and opportunity/defect prerequisites — [Wikipedia, Defects per million opportunities](https://en.wikipedia.org/wiki/Defects_per_million_opportunities); [SixSigma.us, DPMO guide](https://www.6sigma.us/process-improvement/six-sigma-defects-per-million/).
- DPMO→sigma conversion and the requirement for spec limits / split for Cpk — [MoreSteam, Six Sigma Conversion Table](https://www.moresteam.com/toolbox/six-sigma-conversion-table); [isixsigma, DPMO→Sigma→Cpk](https://www.isixsigma.com/dictionary/convert-dpmo-sigma-to-cpk/).
- Lean metrics overview (FPY, rework, lead vs cycle) — [Six Sigma Study Guide, Lean Metrics](https://sixsigmastudyguide.com/lean-metrics/).

---

### Provenance note

Every "✅ Compute" verdict above is anchored to a concrete engine field in `packages/intelligence-engine/src/types.ts` / `metricsBuilder.ts` and `packages/process-engine/src/types.ts`. Every "❌ Cannot" verdict names the specific missing input (defect definition, spec limits, demand, cost, or VA classification). The recommendation set deliberately stays inside the report's existing "Evidence-linked: no benchmarks, no estimates — only what was observed" guarantee.
