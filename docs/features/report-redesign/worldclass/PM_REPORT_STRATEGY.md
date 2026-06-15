# Ledgerium Report — World-Class Strategy
**Date:** 2026-06-15
**Author:** product-manager
**Status:** Final strategic definition — no code. Downstream input for engineering, UX, and growth.
**Scope:** The workflow Report tab (`WorkflowReportPage.tsx`) as a category-defining product artifact.

---

## 1. Positioning: The Category Ledgerium's Report Should Own

### The category name

**Evidence-linked process intelligence.**

Not "process analytics." Not "workflow documentation." Not "AI process mining." Every word is load-bearing.

- **Evidence-linked** — every figure on the report traces to a recorded event. Not estimated, not modeled, not inferred from external benchmarks. This is the moat word. Celonis mines ERP logs; Scribe writes docs; Tango records screenshots. Ledgerium records real browser behavior and produces figures you can reproduce by re-running the analysis on the same events. That is categorically different.
- **Process** — the subject is a repeatable human work process, not a one-time event or a data pipeline.
- **Intelligence** — the output is a synthesized verdict with ranked findings, not a raw log dump. The recorder captures events; the intelligence engine turns those events into actionable knowledge.

### Why this positioning is defensible and distinct

**vs. process mining (Celonis, IBM, UiPath, Apromore, Signavio):**
Process mining operates on ERP event logs. It requires a structured data source (SAP, Oracle, Salesforce), IT integration, and typically $50k–$500k in professional services to instrument. The outputs are rich but require a data scientist to interpret. The buyer is enterprise IT, not an ops team. Ledgerium requires a Chrome extension and one recorded session. The buyer is the process owner doing the work today.

The competitive moat is not the analytics — process miners can do more. The moat is **accessibility + provenance**. Ledgerium is the only tool that can produce a credible process intelligence report from a single afternoon of recording, with every finding traceable to the exact events that produced it, without an IT project.

**vs. documentation tools (Scribe, Tango, SweetProcess, Trainual, Notion):**
These tools capture process steps for documentation, not for analysis. They answer "how do I do this?" not "how long does this take, where does it vary, and where does it break down?" They have no intelligence layer. They produce SOPs, not reports. Ledgerium's Report occupies an entirely different space — it is the analytical complement to a SOP, not a prettier SOP.

**vs. product analytics (Amplitude, Mixpanel, FullStory):**
Product analytics observes customer behavior in software products. The subject is a user, not a process. There is no concept of "the right way to do this" or "the bottleneck step" — only conversion funnels and session replay. Ledgerium observes worker behavior, not customer behavior, and produces a judgment about process quality, not a funnel analysis.

### The one-sentence positioning statement

"Ledgerium's Report is the first document a team can produce from their own recorded work that shows — with evidence — how long their processes actually take, where they break down, and what to fix first."

### The honesty constraint that makes the positioning credible

The positioning only holds if the report never makes claims it cannot substantiate from observed data. This is both a product principle and a competitive advantage: competitors who generate AI narrative summaries or benchmark against industry data have a reproducibility problem. Ledgerium's report can be regenerated from the same events and produce the same output. That determinism is the trust foundation. Every strategic decision in this document is downstream of that constraint.

---

## 2. The Report as Product: The Executive-to-Evidence Narrative Arc

### The fundamental problem with the current report

The current report is a data dump with decision-grade islands. It has all the right analytical categories — bottlenecks, variance, variants, insights, automation opportunities, drift — but no synthesized verdict. A process owner who opens the Report today leaves with a list of observations. A process owner who opens a best-in-class report leaves with a verdict and a next action.

The competitive benchmark is unambiguous: every serious process intelligence tool (Celonis, UiPath, Signavio, Apromore, IBM) opens with a 30-second verdict followed by supporting evidence. Ledgerium opens with a metric strip followed by 17 unsorted sections. This is the single most important structural problem to fix.

### The correct narrative arc: Identity → Verdict → Evidence → Action

**Act 1: Identity (30 seconds)**
What is this process, and on what evidence is this report based? The hero band handles identity — title, duration, steps, phases, systems, confidence. The critical addition is a data-basis strip: "Based on 16 recorded runs — Mar 2026 – Jun 2026 — Evidence-linked." This sets the epistemic context for every figure that follows. Without it, a single-run report and a 20-run report look identical until the reader is deep into the variance section.

**Act 2: Verdict (60 seconds)**
What is the most important thing to know about this process? A synthesized 3–5 sentence paragraph, deterministically generated from observed data, that a process owner can read in under a minute and leave with a clear position. Not a list of metrics — a verdict. "This is a high-friction, 3-variant process. Step 7 consumes 34% of cycle time. The dominant path covers 71% of runs. The highest-leverage action is addressing Step 7 before standardizing across variants."

The verdict card must appear immediately below the data-basis strip. It is the first analytical content a reader sees. Everything else on the page is evidence for or elaboration of the verdict.

**Act 3: Evidence (5 minutes)**
How do we know? This is where the current report's content is largely correct but poorly ordered. The evidence arc moves: process structure (phases, health scores) → consistency story (variants, variance, cycle-time distribution) → diagnosis (bottlenecks, friction, rework, drift) → deep step-level detail (timestudy, step breakdown, insights feed).

Two structural changes matter here. First, bottlenecks must appear before automation opportunities. Bottlenecks are the diagnosis; automation is a prescription derived from that diagnosis. Second, the insights feed belongs in the diagnosis act, not before it.

**Act 4: Action (2 minutes)**
What should happen next? The automation opportunities and a unified action priority list. Each action item is ranked by impact, not by analytical category. A process owner should leave this act with a ranked to-do list, not four separate lists (bottlenecks, insights, friction, rework) that they have to cross-reference themselves.

**Appendix: Source**
The step breakdown, skill library, agent composition, integrations, and roadmap. This is the raw evidence and forward-looking AI Vision content. It belongs at the end — it is for analysts and implementers, not for the first-read process owner.

### What leads and what doesn't

**What leads:** The verdict. Then the "Start Here" callout (the single timing bottleneck — already exists and is the report's strongest single signal). Then the variant Pareto. These three elements, read in 90 seconds, should be sufficient for a process owner to understand what action to take.

**What doesn't lead:** The step breakdown, the friction grid, the rework patterns, the agent cards, the roadmap. These are important but they are detail. They belong deep in the document, accessible to those who need them, invisible to those who don't.

### The AI narrative position — honest framing, clear upgrade path

The verdict is deterministically template-generated from computed data. It is not LLM-generated. This is not a limitation; it is a strategic strength. A template-generated verdict is reproducible, auditable, and never hallucinates. The copy prohibition is explicit: do not call the verdict "AI-generated." It is "Observed verdict" — computed from recorded runs.

The upgrade path to LLM-generated narrative is real and additive. When the AI Vision build lands (providers + recommendation engine), LLM narrative can be offered as an optional enrichment layer, clearly disclosed, clearly distinguishable from the deterministic verdict. The correct sequencing: ship the deterministic verdict now (it is achievable and it is the highest-leverage move); add LLM narrative later as a "deeper analysis" option, not as a replacement.

### Evidence drill: from finding to run to step

The report's most underexploited competitive advantage is that every finding traces to specific recorded events. The bottleneck at Step 7 is not an AI inference — it is a measurement across N specific run IDs that produced specific timing observations. No competitor in the accessible tier (Scribe, Tango, SweetProcess) surfaces this. The enterprise tier (Celonis) does, but only through IT integration.

The current report shows findings without links. An insight card says "Step 7 has high friction" but provides no path to the runs that produced this finding, no path to the step sequence that caused it, and no path to the recorded events that captured it. This is the gap that, when closed, makes Ledgerium's moat visible to the user.

The architecture review documents a known structural issue: `runId` does not equal `workflowId` in the current data model, and the per-finding `evidenceRunIds` are available in the engine but dropped by the report's lossy private interface. Closing this gap requires a data-layer change (threading per-finding run linkage from the cohort analysis through to the component). This is the highest-strategic-value improvement with the highest implementation effort. It should be sequenced as a targeted P1 after the data contract unification.

### Shareable and scheduled stakeholder delivery

The report is currently not a shareable artifact. The export button produces raw JSON. There is no PDF. There is no shareable link that lands on the Report tab (sharing lands on the Workflow tab).

World-class category definition requires the report to be the artifact that stakeholders receive. This means: (1) a print-to-PDF with a fixed stakeholder layout (verdict + scorecard + variant chart + bottleneck table + evidence footer), and (2) a deep-link URL that lands directly on the Report tab. Scheduled delivery (weekly email digest of new report findings) is a real-time feature, deferred to P2, but the architecture for a shareable link is the prerequisite.

### Embedding and export

The PDF is the primary export format. The current JSON export (raw data) remains available and is relabeled "Download data (JSON)" so the distinction is clear. A server-side PDF rendering route is the quality target; `window.print()` with print CSS is the fast path and delivers a usable PDF that can ship in days.

### Benchmarking: intra-account first, cross-account later

Cross-workflow comparison ("this process takes 2× longer than similar processes") is the highest-value benchmarking signal but requires either a cross-account anonymized benchmark or a within-account library. The within-account path is the right first move: "Your fastest similar-length process completes in 3m 20s — this one takes 8m 40s." This is computable from the existing workflow library with no new data collection. Cross-account benchmarking requires a data model and privacy posture decision that should be scoped separately.

---

## 3. Strategic Gaps vs World-Class

This section synthesizes findings from the parallel PM, analytics, architecture, and competitive reviews. The gaps are ordered by strategic severity.

### Gap 1: No verdict (highest severity)

**State:** The report opens with a metric strip and 17 unsorted sections. There is no synthesized narrative or ranked finding. A user who reads only the first card leaves with raw counts, not a conclusion.

**World-class standard:** Every serious tool opens with a plain-English verdict. Celonis generates it via AI; the competitive benchmark notes this is the highest-leverage single move for Ledgerium (the report can generate it deterministically without LLM).

**Honesty status:** Achievable today from observed-only data. Template-based. Reproducible.

**Gap severity:** P0. This is the difference between a data dump and a document.

### Gap 2: Variance/variants fed from wrong data source (P0, fix in progress)

**State:** The report calls `analyzeWorkflow()` (single-run) instead of `analyzeWorkflowVariants()` (cross-run cohort). The Variance & Variants section always shows "Recorded once" even for 16-run workflows. The architecture review documents this as a purely structural wiring bug — the engine produces correct cross-run data; the report never receives it.

**World-class standard:** Variant Pareto, sequence stability, and cycle-time spread are universal in process intelligence tools and are the core multi-run differentiator.

**Fix status:** Documented as R-A fix (shipped per REPORT_REDESIGN_REVIEW_001.md). This gap is being closed. Strategy assumes it is closed.

**Gap severity:** P0. The report's most differentiated analytical section is currently always empty.

### Gap 3: Evidence drill navigability (the runId issue)

**State:** Every finding (bottleneck, insight, friction, rework) is a text card. There is no path from a finding to the runs that produced it, nor to the step sequences, nor to the recorded events. The engine computes `evidenceRunIds` per finding; the report's lossy private `IntelligenceData` interface drops them before they reach the component.

**Technical constraint:** The architecture review flags that `runId` does not equal `workflowId` in the current model. Threading per-finding run linkage through the API requires a data-layer change (Slice 5d equivalent).

**World-class standard:** Progressive disclosure from verdict → finding → run → trace is universal in enterprise process mining. For Ledgerium's accessible tier, surfacing run IDs in expandable panels is the achievable first step; full trace replay is the long-term target.

**Honesty status:** The engine already has `evidenceRunIds`. Displaying them requires no new computation, only contract repair and UI addition.

**Gap severity:** P1. The moat is invisible without it.

### Gap 4: No PDF / no shareable report link

**State:** The export button produces JSON. The share flow lands on the Workflow tab. There is no PDF. There is no way to produce a shareable document from Ledgerium that a non-user can read.

**World-class standard:** PDF export is universal across all five benchmarked competitors. Scheduled delivery (Celonis, 2025) is the frontier. A shareable link to the Report tab is table stakes.

**Gap severity:** P0 from a commercial perspective. A process owner who cannot share the report cannot build internal support for process improvement investment. The report becomes a dead end.

### Gap 5: Metric honesty defects

**State:** Multiple analytics P0s identified: CV displayed as a raw decimal without interpretation bands; "active process time" uses the wrong denominator (summed step durations, not wall-clock duration); "no inefficiencies detected" can fire on single-run workflows; bottleneck rows omit run count context and the `isHighDuration`/`isHighVariance` distinction; per-step run count is absent from the timestudy table; P90 is shown at N < 10 without a reliability warning.

These are not invented numbers — the engine computations are correct. The issue is labeling and disclosure. The product can stand behind the numbers; the product cannot currently stand behind the claims those numbers appear to make.

**Honesty status:** All fixes require only label changes, disclosure additions, and gating logic. No new computation.

**Gap severity:** P0 from a trust perspective. A product that claims to be "evidence-linked" and then displays CV without an interpretation scale or shows "no inefficiencies detected" from a single session is undermining its own positioning.

### Gap 6: Drift section absent

**State:** `detectDrift()` in the intelligence engine computes a full `DriftReport` — structural drift, timing drift, step count drift, exception rate drift — with per-signal severity, baseline vs. current comparison, and `evidenceRunIds`. This signal is never shown in the report.

**World-class standard:** Drift / period comparison is present in all five benchmarked tools. It is the temporal intelligence that distinguishes a monitoring tool from a one-time report.

**Honesty status:** Drift is uniquely defensible for Ledgerium because timestamps are immutable recorded events, not modeled estimates. The claim "cycle time increased 23% vs prior 5 runs" is traceable to specific recorded sessions.

**Gap severity:** P1. It answers the question "is this process degrading?" — which no current section answers.

### Gap 7: AI narrative (LLM upgrade path)

**State:** The verdict is template-based (deterministic). Competitors with AI narrative (Celonis 2025) produce richer, more contextualized prose. Template-based narrative is honest but less flexible than LLM narrative.

**Honesty constraint:** The upgrade path to LLM narrative requires clear disclosure ("This summary was generated by an AI language model from your recorded data") and must be visually distinguished from the deterministic verdict. Conflating the two violates the evidence-linked positioning.

**Gap severity:** P2. The deterministic verdict is a viable and strategically differentiated alternative to LLM narrative. LLM upgrade is additive, not a prerequisite.

### Gap 8: Scheduled delivery

**State:** Not implemented. The report is only available on-demand in the product. No email digest, no scheduled report, no webhook output.

**World-class standard:** Celonis ships scheduled delivery in 2025. For enterprise buyers, scheduled reports are the path to making the product a system of record rather than a periodic check-in.

**Gap severity:** P2. Infrastructure decision. Significant effort. Deferred to post-PDF milestone.

### Gap 9: Conformance to best path (SOP alignment)

**State:** `analyzeSopAlignment()` is exported from the intelligence engine and produces an alignment score with undocumented steps and unused SOP steps. It is never surfaced in the Report.

**World-class standard:** Conformance to a defined model is a standard process mining output. Ledgerium's version is more honest — it compares to the observed standard path rather than a predefined model, eliminating the need for upfront process modeling.

**Honesty status:** Achievable today. Requires wiring `analyzeSopAlignment` into the intelligence analysis pipeline and adding an `rpt-sop-alignment` section.

**Gap severity:** P1 for teams with SOPs. P2 for teams without.

---

## 4. Prioritized Strategic Roadmap

### P0 — Foundation: Fix Trust and Add the Verdict

These are the moves that determine whether the report is credible and decision-grade. They must ship before any P1 work. P0 is the prerequisite to positioning the report as a category-defining artifact.

**P0-A: Deterministic executive verdict (template-based)**
A 3–5 sentence synthesized verdict paragraph at the top of the report, generated from observed data. No LLM. The verdict addresses: (1) consistency — "This process runs with [high/moderate/low] variance across N runs"; (2) variants — "N execution paths identified; the standard path covers X% of runs"; (3) top finding — "The highest-leverage finding is [bottleneck/variant standardization/drift]"; (4) top action — "The first recommended action is [action]."

This is cheap because the data is already computed. The verdict draws from: `intelligence.metrics.runCount`, `intelligence.variance.sequenceStability`, `intelligence.variants.variantCount`, `intelligence.bottlenecks.bottlenecks[0]`, and the `LeadFigures` already computed in `deriveLeadFigures()`. The template function follows the pattern of `buildReportVerdict()` (already exists) and `buildScorecard()` (already exists) — deterministic, tested, no external dependencies.

This is the single highest-leverage move available. It converts the report from a data dump to a document in one iteration.

**P0-B: Metric honesty fixes**
Five targeted corrections to existing metrics. These are all label changes, disclosure additions, or gating adjustments — no new computation:
1. CV: show color-coded bands (green < 0.3 / amber 0.3–0.5 / red ≥ 0.5) + footnote "Based on observed run-to-run variation — not a defined target or benchmark."
2. "Active process time": rename to "Measured step time" + add "(wall-clock: X)" footnote to surface the gap vs. total duration.
3. "No inefficiencies detected": gate to `runCount >= 2` only.
4. Bottleneck rows: add run count context + `isHighDuration`/`isHighVariance` flag ("Slow" / "Variable" / "Both").
5. Timestudy: add per-step run count column; add P90 reliability warning below N=10.

**P0-C: PDF / shareable link**
Replace JSON export with a `window.print()` PDF (print CSS + page breaks). This is the fast path — it ships in days, not weeks. The PDF layout: verdict + 5-tile scorecard + variant Pareto (or variant list if charts are not ready for print) + bottleneck table + evidence footer ("Generated from N recorded runs · All figures derived from observed behavior — no benchmarks, no modeled estimations · Ledgerium AI").

A deep-link URL parameter (`?tab=report`) makes the Report directly shareable.

**P0-D: Data basis strip**
A persistent strip immediately below the hero: "Based on N recorded runs · [date range] · Evidence-linked." Single-run variant: "Based on 1 recorded run · [date] · Record again to enable cross-run analysis." This is a 20-line presentation change with high epistemic value — it sets the evidence context for every figure that follows.

### P1 — Best-in-Class: Surface More Computed Signals

These are moves that make the report analytically richer using signals the intelligence engine already computes. Each is "honest and cheap" — no new data collection, no new computation. They require only presentation work and, in some cases, minor data wiring.

**P1-A: Cycle-time distribution**
Surface the 5-number summary already in `intelligence.metrics`: min / median / mean / p90 / max. A range bar (min–median–p90–max with a median reference line) is achievable without Recharts — pure CSS. A full histogram requires per-run duration array. Start with the range bar. This answers "how consistent is timing?" in 5 seconds.

**P1-B: Drift section**
Add an `rpt-drift` section between Variance and Bottlenecks. Show `intelligence.drift.driftSignals[]` as a list of alerts: type, severity, baseline vs. current, and the N runs compared. Gate on `runCount >= 3` for meaningful drift. Single-run and two-run states show "Drift analysis requires 3+ runs." This is the temporal story — is the process getting faster or slower? — that no current section answers.

**P1-C: Conformance to standard path**
Add a conformance signal to the Variant section: "N% of runs followed the standard path exactly (X of Y runs)." Surface the `standardPath.frequency` and `standardPath.runCount` already in the engine. Add a cumulative annotation to the Pareto: "Top 2 variants account for 88% of runs — standardizing these paths covers the majority of executions." This is a high-value insight for ops teams and it requires only display work.

**P1-D: Bottleneck contribution ranking**
Show each bottleneck's share of total cycle time (already computed in `deriveLeadFigures` as `topBottleneck.percentOfCycleTime`). Extend to all bottleneck rows. Add a simple visual bar (CSS, not Recharts) showing relative contribution. This converts the bottleneck list from "which steps are slow" to "how much of total time do slow steps consume."

**P1-E: Evidence drill — surface run IDs**
This requires the data contract unification (delete the report's private lossy `IntelligenceData` interface and replace with the engine's `PortfolioIntelligence` type). Once the contract is unified, `evidenceRunIds` are available on bottleneck rows, insight cards, and variant entries. Surface them as expandable panels: "Evidence: runs #3, #7, #11 — [link to run detail]." This is the moat made visible.

The structural constraint (runId vs workflowId) must be resolved as part of this work. The architecture review recommends a shared `ProcessIntelligence` contract module as the foundation.

**P1-F: Section reorder to match narrative arc**
Current order has Automation before Bottlenecks. Correct order: Bottlenecks before Automation. Full recommended order: Hero → Data basis → Verdict → Start Here → Process Health → Phase Timeline → Run Metrics → Variant Pareto → Cycle-time Distribution → Variance Detail → Timestudy → Bottlenecks → Drift → Friction & Decisions → Rework → Insights Feed → SOP Alignment → Automation → Action Priority → Agents → Skills → Integrations → Roadmap.

This is a render-order change. Low effort, high readability impact.

**P1-G: SOP alignment**
Surface `analyzeSopAlignment()` output in the report. Show: alignment score, undocumented steps (observed in runs, missing from SOP), unused SOP steps (in SOP, never observed). Gate on having both a SOP artifact and multi-run intelligence. This is the bridge between the SOP tab and the Report tab — and for teams with formal SOPs it may be the highest-value single output in the product.

### P2 — Category-Defining: Polish + Positioning

These moves convert a best-in-class report into the category-defining artifact. They require more infrastructure or are lower urgency.

**P2-A: Unified action priority list**
Aggregate the top findings across all sections into a ranked action list (5–7 items maximum): category (Automate / Standardize / Fix / Investigate), the finding it derives from, estimated effort, and a link to the relevant section. This is what a consultant would produce from the same data. It requires unification logic across bottleneck severity scores, automation scores, and insight severities.

**P2-B: Server-side PDF (stakeholder quality)**
Upgrade from `window.print()` to a server-side rendering route that produces a formatted PDF with reliable pagination, chart rendering, and a fixed 2-page stakeholder layout. Higher quality but higher effort. Prerequisite for scheduled delivery.

**P2-C: Scheduled delivery**
Weekly or triggered email: "Your [Workflow] report has new findings." Links to the deep-linked report URL. Requires notification infrastructure and a trigger mechanism (new run recorded / drift signal detected). This is the path from "periodic check-in" to "system of record."

**P2-D: LLM narrative upgrade**
When the AI Vision build is live (provider adapters + recommendation engine), offer an LLM-generated narrative enrichment as an optional, clearly-disclosed layer above the deterministic verdict. Requirement: must be visually and copy-distinctly separated from the "Observed verdict." Must carry disclosure: "This narrative was generated by [model] from your recorded data."

**P2-E: Intra-account benchmarking**
"Your fastest similar-length process completes in 3m 20s — this one takes 8m 40s." Computable from the existing workflow library. Requires a library-comparison query over the user's recorded workflows. No cross-account data needed. This contextualizes scores that currently have no reference point.

**P2-F: What-if scenario modeling**
`simulateWhatIf()` is already implemented in the recommendation engine. Surface it in the Automation section as an interactive "estimate impact" panel: toggle automation opportunities on/off, see projected cycle-time reduction. Converts the automation section from a suggestion list into a decision tool.

### Explicitly out of scope / honesty-limited

**Cross-account benchmarking:** Requires a privacy posture decision, anonymization architecture, and sufficient data density. Not achievable honestly in the near term.

**Predictive process modeling:** Ledgerium measures observed behavior. Projecting "what this process will look like in 6 months" from recorded events requires a forecasting model that introduces non-observed inference. This violates the evidence-linked constraint. Do not pursue this unless it can be clearly disclosed as a model output and clearly distinguished from observed data.

**"AI-generated" verdict before LLM integration:** The template-based verdict is the correct path now. Calling it "AI-generated" before the AI Vision build lands misrepresents the product. The positioning as "deterministic, reproducible" is a competitive advantage, not a limitation.

---

## 5. Success Metrics

### The single most important leading indicator

**Report-to-action rate:** The percentage of Report views where the user takes a downstream action (runs another recording, clicks to a step or run, exports the report, shares a link). Baseline: unmeasured (no report-section events exist). Target: 30% of Report views result in at least one downstream action within the session, measured within 30 days of P0 shipping.

This metric is more valuable than time-on-page because it measures whether the report is producing decisions, not just views.

### Full metric set

| Metric | Baseline | Target | Instrument |
|---|---|---|---|
| Report-to-action rate | Unmeasured | ≥30% of views | `report_section_viewed` + downstream events |
| Time to verdict (scroll past summary) | Unmeasured | p50 ≤ 60s | Scroll depth + time on section |
| Export / share rate | ~0% (JSON only) | ≥10% of Report views | `report_exported {format}` |
| Report open rate (% of workflow detail views) | Unmeasured | ≥40% within 30d of P0 | `report_opened` |
| Return report visit rate | Unmeasured | ≥25% of workflows viewed in Report ≥2 times | Session analysis |
| Plan conversion signal | Unknown | Team conversion rate ≥10% higher for multi-run Report viewers vs non-viewers | Cross-segment analysis (30d lag) |

### Instrumentation required (P0 prerequisite)

No report engagement events currently exist. The following events must be instrumented before any metric is measurable:

- `report_opened {workflowId, runCount, hasIntelligence, hasAgentIntelligence}` — fires when Report tab becomes active.
- `report_section_viewed {sectionId, timeOnSection, runCount, hasData}` — fires on intersection observer entry, once per section per page load.
- `report_insight_expanded {insightId, severity, category}` — fires on insight card expand.
- `report_exported {format: 'pdf' | 'json' | 'share_link'}` — fires on any export action.
- `report_finding_evidence_expanded {findingType, stepOrdinal}` — fires when evidence panel opens (P1-E prerequisite).

Without these events, the success metrics are unmeasurable and the improvement backlog has no feedback loop.

---

## 6. The Single Highest-Leverage Move

**The deterministic executive verdict (P0-A).**

Every other improvement on this roadmap makes a specific section better. This one determines whether the Report is a destination or a detour.

A process owner who opens the Report today sees six numbers and 17 sections. There is no place where the system says: "Here is what matters. Here is why. Here is what to do." The report has all the analytical depth needed to produce this verdict — the data is computed, the components exist, the honesty constraint is satisfied. The verdict is the synthesis that is missing.

This is achievable in a single bounded iteration, following the established pattern of `buildReportVerdict()` and `buildScorecard()`. It requires no new API calls, no LLM, no new data collection. It requires only a template function that reads already-computed figures and produces 3–5 sentences in plain English.

The test for completion: a process owner who reads only the verdict card should be able to answer "is this process good or bad, what is the main problem, and what should I do first?" within 60 seconds of opening the report.

---

## 7. Open CEO Decisions

**D-01: Executive verdict approach.**
Template-based (deterministic, ships in days, reproducible, no LLM) vs LLM-generated (richer prose, adds latency and infrastructure, ships in weeks, requires disclosure). Recommendation: template-based now; LLM upgrade is additive when AI Vision phase lands. This is a sequencing and positioning decision, not a quality one — the template-based verdict is differentiated precisely because it is reproducible.

**D-02: PDF export scope.**
`window.print()` with print CSS (fast path: 1–2 days, usable quality) vs server-side PDF rendering (2–3 weeks, stakeholder quality, shareable URL, prerequisite for scheduled delivery). Recommendation: `window.print()` now to unblock sharing; server-side rendering as P2. If the report is intended as a primary enterprise sales artifact, accelerate to server-side.

**D-03: Multi-run intelligence gate.**
The cohort analysis that powers variance, variants, timestudy, and bottlenecks is currently Team+ gated (consistent with the Variants tab). Should multi-run report sections remain Team+ gated, or should a free-tier user see the single-run report with a clear upgrade prompt for multi-run sections? Recommendation: preserve the existing gate for the report sections that require multi-run intelligence, but make the gate visible (a clear "Upgrade to Team to unlock cross-run analysis" callout rather than sections simply being absent). This converts a limitation into a conversion signal.

**D-04: Evidence drill scope and sequencing.**
IMP-05 (evidence links from finding to run to step) is the highest-strategic-value improvement and the highest-effort one. It requires: (a) data contract unification (delete the lossy private `IntelligenceData` interface), (b) threading per-finding `evidenceRunIds` through the API, and (c) resolving the runId vs workflowId data model constraint. Confirm priority relative to the process mapping work and AI Vision build. Recommendation: sequence contract unification (P1-E first step) as soon as P0 ships; evidence drill UI (links + expandable panels) follows immediately.

**D-05: Intra-account benchmarking timeline.**
"Your fastest similar-length process completes in Xm — this one takes Ym." This is computable from the existing workflow library. It contextualizes scores that currently have no reference point. Confirm whether this is in scope for the P2 roadmap or deferred to a later analytics phase.

**D-06: Scheduled report delivery priority.**
Scheduled delivery requires notification infrastructure and is a significant engineering investment. It is the path from "periodic check-in tool" to "system of record." Confirm whether this is a near-term commercial priority or a Phase 2 feature, as it gates the sequencing of server-side PDF (which is a prerequisite).

---

*Source artifacts reviewed: `apps/web-app/src/components/detail/WorkflowReportPage.tsx` (3,094 lines), `docs/features/report-redesign/PM_REPORT_REVIEW.md`, `docs/features/report-redesign/ANALYTICS_REPORT_REVIEW.md`, `docs/features/report-redesign/ARCH_REPORT_REVIEW.md`, `docs/features/report-redesign/UX_REPORT_REVIEW.md`, `docs/features/report-redesign/COMPETITIVE_REPORT_BENCHMARK.md`, `docs/features/report-redesign/REPORT_REDESIGN_REVIEW_001.md`, `docs/features/report-redesign/rd/GROWTH_RD_COPY.md`, `packages/intelligence-engine/src/index.ts`.*
