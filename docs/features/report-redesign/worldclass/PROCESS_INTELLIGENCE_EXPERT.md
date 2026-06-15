# Ledgerium Workflow Report — Process-Intelligence Expert Assessment
**Author role:** Process-mining / process-intelligence domain authority (academic + Celonis / Apromore practitioner level)
**Scope:** The per-process **Report** view (`WorkflowReportPage.tsx`) and the `intelligence-engine` that feeds it. Read-only code review; web research permitted.
**Date:** 2026-06-15
**Verdict up front:** **B− / B.** Ledgerium already ships the *verdict → evidence → source* spine that defines a modern PI report, with two genuinely category-leading properties (determinism and evidence-linkage). It is held back from A-tier by the **absence of true conformance** (compare-to-a-designated-standard, not compare-to-the-observed-mode) and the **absence of root-cause drill** (it tells you *which* step is slow / *which* runs deviate, never *why*). Both are closeable largely from data already on the payload.

---

## 0. What the report actually computes (ground truth from the code)

This assessment is grounded in the real engine, not the marketing surface. The `intelligence-engine` deterministically produces, per process portfolio (`PortfolioIntelligence`, `types.ts`):

- **Metrics** (`metricsBuilder` → `ProcessMetrics`): runCount, completionRate, **errorStepFrequency** (mean error_handling steps/run — an exception proxy), navigationStepFrequency, median/mean/p90/min/max **durationMs**, median/mean **stepCount**, uniqueSystems, evidenceRunIds.
- **Timestudy** (`timestudyAnalyzer` → `StepPositionTimestudy[]`): per-position mean/median/min/max/**p90**/**stdDev** across runs, with runCount + evidenceRunIds per position.
- **Variance** (`varianceAnalyzer` → `VarianceReport`): duration **stdDev** + **coefficient of variation (CV)** + isHighVariance (threshold CV ≥ 0.5), stepCount min/max/stdDev, **sequenceStability** (fraction of runs on the modal path), and a list of **highVarianceSteps** (per-position CV).
- **Variants** (`variantDetector` → `VariantSet`): deterministic greedy clustering of **path signatures** (ordered GroupingReason categories) at a 0.75 similarity threshold; per-variant runCount, **frequency**, similarityToStandard, evidenceRunIds; the modal cluster flagged `isStandardPath`.
- **Bottlenecks** (`bottleneckDetector` → `BottleneckStep[]`): per-position **durationRatio** = stepMean / overallStepMean, flagged when ratio ≥ 1.5 **OR** CV ≥ 0.5; sorted by ratio desc.
- **Drift** (`driftDetector` → `DriftReport`, *only when a baseline window is supplied*): structural (modal signature changed), **timing** (mean duration Δ ≥ 25%), **step_count** (Δ ≥ 20%), **exception_rate** (error rate doubled / appeared) — each with baseline→current values and severity.
- **Standard path** (`StandardPathResult`): the modal signature + its run coverage.
- **Divergence** (`divergenceAnalyzer`, surfaced in the report as "Where runs diverge"): **LCS alignment of every run to the modal backbone + a directly-follows-graph (DFG) cross-check** to locate *exactly where runs leave and rejoin* the dominant path, with per-branch evidence run ids. **This is real conformance machinery** — it is just pointed at the observed mode, not a designated reference (see §1, §2).
- Adjacent but present in the engine, *not yet on the report*: `standardizationScorer` (a 0–100 maturity score with a `dominantPathAdherence` factor + **documentation-drift vs an SOP**), `sopAlignmentEngine` (alignment to a recorded SOP), `recommendationEngine`.

The Report (`WorkflowReportPage.tsx`) is a disciplined, **observed-only, hydration-safe** rendering of the above: an Executive Verdict (`reportVerdict.ts`), a 5-tile scorecard (`reportScorecard.ts`), cycle-time spread, a consistency gauge, variant Pareto, the diverge→reconverge view, a per-step timestudy table, a ranked bottleneck contribution view, drift formatting, and Standardize / Automate / Investigate insight cards — every figure traced to an engine field, absent data rendered as `—`, never fabricated.

---

## 1. The canonical PI analysis surfaces — coverage scorecard

The canonical per-process report (the union of what Celonis Process Analysis, UiPath Process Mining, SAP Signavio Process Insights, Apromore, IBM Process Mining, and the Fluxicon/Disco statistics view present, and what van der Aalst's *Process Mining: Data Science in Action* defines as the discipline's deliverables) contains nine surfaces. Ledgerium's status on each:

| # | Canonical PI surface | What world-class delivers | Ledgerium status | Evidence in code |
|---|---|---|---|---|
| 1 | **Discovery (as-is process map)** | A node-link process model (DFG / BPMN / Petri net via α-/inductive miner) + **happy-path %** (share of cases on the most frequent end-to-end path) | **PARTIAL** | Phase timeline + step breakdown + the modal "backbone" spine in the divergence view + DFG edges computed internally (`dfgDegrees`). But the DFG is **never rendered as a map**; happy-path % exists as `sequenceStability` / `standardPath.frequency` but is labelled "sequence stability", not "happy path". |
| 2 | **Performance (cycle / throughput / wait time + distribution)** | Cycle-time mean/median/p-tiles, **a real distribution (histogram/box)**, and **wait vs. processing (touch) time** decomposition | **PARTIAL** | Strong on cycle-time central tendency + p90 + a 5-number **range plot**. Honestly *not* a histogram (no per-run durations on the payload). **Wait-time decomposition is genuinely surfaced** ("Active step time" Σ vs "Total elapsed" wall-clock, gap = between-step idle) — better than most. No per-step wait/touch split though. |
| 3 | **Variant analysis (frequency, rework loops, exception paths)** | Variant Pareto + per-variant metrics + **rework/self-loop detection** + exception-path flagging | **PARTIAL–STRONG** | Variant Pareto with run counts + reference-path badge + long-tail grouping is excellent and honest. Rework exists **only via the LLM `interpretation.rework`** payload (heuristic, not the deterministic engine) and exception-paths only via `errorStepFrequency`. **No deterministic loop/cycle detection in the path-signature layer.** |
| 4 | **CONFORMANCE (vs a reference / standard)** | **% on-path against a *designated* model, deviation hotspots, alignment cost / fitness** (van der Aalst conformance checking: token-replay or alignments) | **NOT (as defined) / PARTIAL (as mode-conformance)** | The richest gap. The divergence analyzer does on-path %, branch hotspots, and DFG-confirmed splits/joins — **but always against the observed mode**, never a user-designated best/standard path. `sopAlignmentEngine` + `standardizationScorer.documentationDrift` (true conformance-to-SOP) exist in the engine **but are not wired into the Report.** See §2. |
| 5 | **Bottleneck / root-cause** | Ranked bottlenecks **+ root-cause attribution** (why: which attribute/segment/branch drives the slow/variant cases) | **PARTIAL (bottleneck) / NOT (root-cause)** | Bottleneck ranking is strong: durationRatio, % of bottleneck cycle time, run-count context, Slow/Variable/Both flags, Primary badge. **Root-cause is absent** — the report names the slow step but never explains *why* (no segmentation, no "slow runs share X", no branch-correlated timing). See §2. |
| 6 | **Drift / change-over-time** | Period-over-period KPI deltas + structural change detection + trend | **STRONG (when fed) / GATED** | `driftDetector` covers structural, timing, step-count, exception-rate drift with baseline→current values and severity — and it is **uniquely deterministic** (immutable recording timestamps, no modeled trend). The gate: it only fires when a **baseline window is explicitly supplied**, which the report does not yet do automatically (e.g. first-half vs second-half of runs). |
| 7 | **Automation / opportunity** | Automation candidates + estimated effort/time savings + ROI | **STRONG** | `automationScorer` + agent-intelligence opportunities with `estimatedTimeSavingsMs`, totalSavings, score chips, **and run-count-banded confidence** ("low/medium/high confidence — record again to sharpen"). The confidence banding is more honest than most commercial tools. |
| 8 | **AI narrative (grounded)** | Auto-generated plain-English executive summary | **PARTIAL** | The Executive Verdict (`buildReportVerdict`) is a deterministic *template* narrative (2–4 sentences) — honest and reproducible, **but not an LLM narrative** that synthesizes across all sections. `interpretation.summary` (LLM) exists but is under-used as the report's spine. This is a deliberate, defensible trade (determinism > fluency); it leaves a polish gap vs Celonis's 2025 AI summaries. |
| 9 | **What-if / simulation** | Scenario modelling ("if we remove the rework loop, cycle time → X") | **NOT** | No simulation surface. Expected — this is the frontier even for Celonis/Signavio, and is correctly out of scope until conformance + root-cause land. |

**Tally:** 0 of 9 fully world-class, 6 partial, 2 strong-but-gated/template, 1 absent. That is a credible B-tier report with a clear, *closeable* path to A.

---

## 2. The biggest gaps vs world-class PI — honest assessment

### Gap A — CONFORMANCE (the #1 gap). What we have vs. what PI means by the word.

In process mining, **conformance checking** (van der Aalst, *Process Mining*, Ch. 8; Carmona et al., *Conformance Checking: Relating Processes and Models*, 2018) is the comparison of observed behavior to a **normative reference model** that exists *independently of the log* — a designated "should-be" path, SOP, or BPMN model. Its outputs are **fitness** (can the model replay the trace?), **precision**, **% on-path**, and **deviation diagnostics** (where, and how costly, via alignments). The reference is the load-bearing word: conformance answers "are we doing it the way we decided to," not "are we doing it the way we usually do."

**Ledgerium today computes mode-conformance, not reference-conformance.** `sequenceStability`, the divergence analyzer, and the "Reference path" badge all measure adherence to the **most frequent observed path**. That is statistically real and the benchmark doc is right that it is *more honest than a hand-drawn model nobody follows* — but it has a blind spot a domain reviewer will flag immediately: **if the dominant way of doing the work is the wrong way, mode-conformance reports 90% "conformance" while the process is 90% non-compliant.** The label "Reference path" is, strictly, a misnomer — it is the *modal* path, not a *reference*.

**What we can add from current data (cheap, high-value):**
1. **Let the user designate any observed variant — or the engine's `recommendedPath` — as the standard.** Then re-point `divergenceAnalyzer` at *that* backbone instead of the auto-mode. The LCS-alignment + DFG machinery is already general over an arbitrary backbone (`analyzeDivergence(backbone, runs)`); this is a wiring change, not new math. Output: **% on designated path, ranked deviation hotspots, per-branch evidence run ids** — i.e. real conformance, deterministically.
2. **Wire the dormant `sopAlignmentEngine` + `standardizationScorer.documentationDrift` into the Report** as a "Conformance to SOP" panel when an SOP/recommended path exists. This is true reference-conformance and it already exists in the engine — it is *purely an integration gap*.

**What needs new inputs (be honest):** *Fitness/precision against an imported BPMN model* and *alignment cost* (the formal van der Aalst conformance metrics) need (a) a normative model artifact and (b) an alignment cost function. Worth a roadmap line, **not** an MVP claim. Do **not** label mode-conformance as "conformance" until at least move (1) ships — that would be the one place this otherwise-honest product overclaims.

### Gap B — ROOT-CAUSE (the #2 gap). We surface *what*, never *why*.

World-class PI does not stop at "Credit Check is the bottleneck." It runs **root-cause / contributor analysis**: segment the slow or deviating cases and report the shared attribute ("rejected runs are 3.1× slower and 78% pass through the manual-review branch"). Celonis ships this as automated root-cause; the academic frame is *correlation of case/event attributes with the target KPI* (e.g. decision-tree / feature-importance over case attributes, or the **directly-follows / variant correlation** with cycle time).

**Ledgerium says "this step is slow" and "these steps run inconsistently" but never "here is why."** The Investigate insight card gets closest ("variable timing usually points to a hidden decision or wait") but it is generic copy, not a computed cause.

**What we can add from current data (medium effort, very high value):**
1. **Variant-vs-cycle-time correlation:** we already have per-variant `evidenceRunIds` and per-run durations. Compute the median cycle time **per variant** and surface "Variant 2 (the off-path branch) is the slow cohort — 2.4× the reference path's median." That is a genuine root-cause statement, fully deterministic, from data on hand.
2. **Bottleneck → branch attribution:** the divergence analyzer knows which branches pass through each position. Join bottleneck positions to the branches that traverse them: "The bottleneck at step 7 occurs only on the 'skip approval' branch (4 of 16 runs)." Deterministic, evidence-linked, no new inputs.
3. **High-variance-step → branch attribution:** same join for `highVarianceSteps` — variable timing at a position correlated with which variant the run took is the textbook "hidden decision" signal made concrete.

**What needs new inputs:** *Business-attribute* root cause (region, customer tier, amount) requires case attributes Ledgerium does not capture from browser recordings. Honest boundary — say so.

### Gap C — Rework / loop detection is heuristic, not deterministic.
Rework loops (a step or sub-sequence repeated within a case) are a first-class PI signal and a top automation/standardization target. Ledgerium surfaces rework **only via the LLM `interpretation.rework` payload**, not the deterministic path-signature layer — inconsistent with the product's determinism moat. **Self-loop / repeated-subsequence detection over the category signature is cheap and deterministic** (count adjacent or near-adjacent repeats in `stepCategories`) and would let rework join the evidence-linked tier.

### Gap D — Discovery map + happy-path % are computed but not *shown as such*.
The DFG is computed internally and thrown away after the conformance cross-check; `sequenceStability` *is* the happy-path % but is mislabelled. Rendering even a minimal **DFG/Sankey of the dominant path with branch frequencies**, and renaming the headline to **"Happy path: 62% of runs"**, closes the most recognizable "is this a process-mining tool?" gap at low cost.

---

## 3. Where Ledgerium is genuinely AHEAD of world-class PI

These are not marketing claims; they are structural properties the incumbents cannot easily match.

1. **Deterministic by construction.** Every figure is a pure function of the log + pinned `ruleVersion` (`reportVerdict`/`reportEvidence`/`reportScorecard` are explicitly Date-free, random-free, LLM-free, hydration-safe; the engine carries `ruleVersion` + `computedAt` on every sub-result). Celonis/Signavio AI summaries are *generative* and therefore non-reproducible run-to-run; Ledgerium's verdict is **byte-identical on identical input.** For audit, regulated, and dispute contexts this is a hard differentiator — it is the difference between "an analyst's reading" and "a reproducible computation."

2. **Evidence-linked at the figure level.** Every metric carries `evidenceRunIds`; insight cards render the actual run ids ("Based on 12 of 16 runs"); divergence branches carry source run ids. This is **trace-level provenance from the headline down** — van der Aalst's "every conclusion must be replayable on the log" made into UI. Most commercial tools provide drill-down to cases but do not stamp provenance onto each *number*.

3. **Auto-captured from browser behavior — no ERP event-log extraction.** The entire incumbent category is gated on the single hardest, most expensive step in any process-mining project: **getting a clean event log out of source systems** (the "data extraction tax" — typically 60–80% of a Celonis deployment's effort, per the practitioner literature). Ledgerium **observes the event log directly at the UI**, so it covers long-tail and cross-system desktop processes the ERP-mining tools structurally cannot see (no SAP table, no log). This is the genuine category-shift, not a feature.

4. **Observed-only honesty as an enforced contract.** The codebase *refuses* to fabricate: single-run shows "record again" instead of a false 100%-stable / "no inefficiencies"; distribution returns `null` rather than inventing a histogram; "Active step time" vs "Total elapsed" are labelled so two numbers never silently contradict. The `EvidenceLinkedBadge` disclosure ("No benchmarks, no estimates — only what was observed") is a *defensible* claim here, which is rare. Most analytics surfaces over-assert; this one under-asserts on purpose.

5. **Per-figure traceability + immutable timestamps make drift uniquely trustworthy.** Period-over-period drift in commercial tools depends on the warehouse's notion of time; Ledgerium's drift sits on immutable recording timestamps, so "the process changed" is a fact about the log, not an artifact of ETL.

**Precise differentiation statement:** *Ledgerium is the only process-intelligence report that is (a) computed deterministically and reproducibly, (b) provenance-stamped at the level of every individual figure, and (c) derived from directly-observed UI behavior rather than extracted system logs.* The incumbents win on map richness, conformance formalism, and simulation; Ledgerium wins on trust, reproducibility, and reach into log-less desktop work.

---

## 4. The honest DATA BOUNDARY — what we must NOT compute or fabricate

A domain authority's most useful service is naming what the data cannot support. Ledgerium's recordings are **UI-observed action streams with durations** — not value-stream maps, not costed transactions, not demand signals. Therefore the following classic PI/Lean-Six-Sigma metrics are **out of bounds** and must never be invented:

| Metric | Why it is not computable from this data |
|---|---|
| **Value-add vs non-value-add classification** | Requires a human/business judgment of which steps add customer value (Lean VA/NVA). Nothing in a click stream encodes value. Do not auto-classify. |
| **Defect rate / DPMO / process sigma** | Requires a *specification* (what counts as a defect) and pass/fail per case. `completionRate` and `errorStepFrequency` are honest proxies — but they are **not** defect rate, and must not be relabeled as quality/sigma. |
| **True takt time / demand-pull rate** | Takt = available time ÷ customer demand. Demand is external and unobserved. Cycle time ≠ takt; do not present cycle time as takt. |
| **Cost / cost-of-poor-quality / ROI in currency** | No wage, FTE-cost, or transaction-value input exists. `estimatedTimeSavingsMs` is honest (time, evidence-linked); converting to dollars requires a user-supplied loaded rate — must be an explicit input, never a default. |
| **Throughput as cases/time (true rate)** | We have per-case cycle time and run count, not an arrival/completion rate over a calendar window with capacity. Avoid "throughput X/hour" language unless a real window is defined. |
| **End-to-end SLA / on-time-delivery** | No SLA target is captured. Drift can show "duration +18%"; it cannot show "breached SLA" without an SLA input. |
| **Conformance fitness/precision (formal)** | Needs a normative model + alignment cost (see §2 Gap A). Mode-stability is not fitness. |

The product's existing instinct here is correct and should be *codified as policy*: **every figure must trace to an engine field; absent → `—`; proxies must be labelled as proxies** (e.g. `errorStepFrequency` shown as "error/exception steps per run," never "defect rate").

---

## 5. The 6–10 highest-impact moves to reach best-in-class PI (ranked, honest about data limits)

Ranked by **(impact on PI completeness) × (closeable from current data) ÷ effort.** Each notes the honesty boundary.

1. **Conformance-to-designated-standard view** *(closes the #1 gap; data on hand).* Let the user pin any variant — or the engine's `recommendedPath` — as the standard, re-point `analyzeDivergence` at that backbone, and report **% on the designated path + ranked deviation hotspots + per-branch evidence ids.** *Limit:* still LCS/DFG conformance, not formal alignment fitness — label it "conformance to your designated standard," and reserve "fitness/precision" for a future imported-model mode. **This is the single move that converts a B-report into a PI report.**

2. **Root-cause drill on variants & bottlenecks** *(closes the #2 gap; data on hand).* Compute **median cycle time per variant** and **join bottleneck / high-variance positions to the branches that traverse them**: "Variant 2 is the slow cohort (2.4× the reference median); its cost is concentrated at step 7." Deterministic, evidence-linked. *Limit:* explains *which observed branch*, not *which business attribute* — say so.

3. **Auto-baseline drift (no manual window).** Default the dormant `driftDetector` to **first-half vs second-half of runs** (or earliest-N vs latest-N) so the Drift panel is *always live* for ≥4-run processes, not only when a baseline is hand-fed. Highest-trust because it rides immutable timestamps. *Limit:* needs ≥4 runs to be meaningful — gate honestly, as the report already gates other multi-run signals.

4. **Deterministic rework / self-loop detection** *(promote rework into the evidence-linked tier).* Detect repeated categories / repeated sub-sequences in `stepCategories`; surface "Step *Review* repeats in 5 of 16 runs (rework loop)" with evidence ids, replacing reliance on the LLM `rework` payload. Rework + frequency = the canonical "common AND fixable" standardization target. *Limit:* loop *over categories*, so UI-distinct-but-category-same repeats may merge — note it.

5. **Render the discovery map + rename happy-path %.** Draw the dominant path as a **DFG/Sankey spine with branch frequencies** (the DFG is already computed and discarded), and relabel `sequenceStability`/`standardPath.frequency` as **"Happy path: 62% of runs."** Low effort, high recognition — it is the surface that makes a reviewer say "yes, this is process mining."

6. **Per-variant decision matrix (frequency × median throughput × on-path).** A small table — variant, run %, median cycle time, conformance to the designated standard — turns the Pareto into the classic **"common-and-slow ⇒ standardize / automate here"** decision artifact (UiPath/Celonis pattern). Pure assembly of figures we already compute.

7. **Grounded AI narrative (optional, clearly fenced).** Keep the deterministic verdict as the *system of record*; optionally add an **LLM "Analyst note"** that synthesizes the deterministic figures into prose — explicitly fenced ("AI-written, derived from the figures above; the numbers are authoritative") so it never contaminates the reproducibility moat. *Limit:* must be visibly separated from the deterministic verdict; never let prose introduce a number not in the figures.

8. **Wait-vs-touch time per step.** Extend the existing global "active vs elapsed" split to the **per-step** level so each step shows processing time vs the idle gap that follows. Most desktop processes hide their cost in waits; this is data we can derive from inter-step timestamps. *Limit:* "wait" is between-step idle, not modelled queue time — label it.

9. **PDF / shareable snapshot with the evidence-linked footer.** The stakeholder lingua franca: verdict + dominant chart + key table + a footer reading "All figures derived from observed behavior — no modeled estimations, reproducible from run ids [...]." The footer *is* the brand. (Print plumbing already partly exists.)

10. **Conformance-to-imported-model (roadmap, honest).** True van der Aalst fitness/precision against a user-imported BPMN/SOP. **Explicitly future** — needs a model artifact + alignment cost. List it; do not imply it ships.

**Sequencing:** 1 and 2 are the report's make-or-break PI moves — do them first. 3, 4, 5 are cheap completeness wins. 6, 8 are assembly. 7, 9 are polish/distribution. 10 is roadmap.

---

## 6. Overall grade vs world-class PI reporting

### **B− / B (3.0–3.3 on a 4.0 scale).**

**Why not lower:** The report nails the modern *verdict → evidence → source* structure, ships the universal PI surfaces in partial-to-strong form (variant Pareto, bottleneck ranking, cycle-time summary, consistency, drift, automation with confidence banding), and does so with two properties **no incumbent matches**: figure-level determinism and figure-level evidence provenance, on top of a data-acquisition model (browser-observed logs) that reaches processes the ERP-mining category cannot. The observed-only honesty is enforced in code, not aspirational. That is a genuinely good, trustworthy PI report.

**Why not higher:** It is missing the two surfaces a process-mining expert treats as definitional. **(1) Conformance** — what it calls "Reference path" is the *modal* path, not a *designated* standard; it cannot yet answer "are we doing it the way we decided to," and the formal fitness/precision metrics are absent. **(2) Root-cause** — it localizes *what* is slow/variable but never computes *why*. It also leaves the discovery map and rework detection on the deterministic table (computed-but-not-shown, or heuristic-only), and gates its strongest unique asset (drift) behind a manual baseline.

**Path to A− (achievable, mostly from data on hand):** ship moves **1 (designated-standard conformance)**, **2 (variant/bottleneck root-cause)**, and **3 (auto-baseline drift)**. Those three convert "a clean, honest analytics report" into "a process-intelligence report" — and they do it while *strengthening*, not diluting, the determinism + evidence-linkage that are already this product's strongest claim to category leadership.

---

### Sources / grounding
- W. van der Aalst, *Process Mining: Data Science in Action* (2nd ed.) — discovery (α-/inductive miner), conformance checking (token replay, alignments, fitness/precision), performance & bottleneck analysis, the "replayable-on-the-log" evidence principle.
- J. Carmona, B. van Dongen, A. Solti, M. Weidlich, *Conformance Checking: Relating Processes and Models* (2018) — the normative-reference definition of conformance; alignment cost; deviation diagnostics.
- Celonis — Process Analysis / Variant Explorer / Insight Explorer; 2025 AI-generated process summaries; automated root-cause analysis.
- UiPath Process Mining — automation potential, KPI lists, process graphs, side-by-side variant compare (good-run/bad-run).
- SAP Signavio Process Insights; Apromore performance dashboard; IBM Process Mining; Fluxicon Disco statistics view — the convergent KPI-tile + variant-Pareto + cycle-time-distribution + conformance-score template.
- Practitioner literature on the "data-extraction tax" of ERP event-log mining (60–80% of deployment effort) — the basis for Ledgerium's browser-observed-log differentiation.
- Internal: `docs/features/report-redesign/COMPETITIVE_REPORT_BENCHMARK.md` (the convergent 3-tier structure; the 10-move list this assessment extends and stress-tests).
