# Report View — PM Product Review
**Date:** 2026-06-14
**Author:** product-manager
**Status:** Read-only analysis — no product code modified
**Scope:** Full product, UX, information-quality, and improvement plan for the Report view (`WorkflowReportPage.tsx`)

---

## 1. What the Report View IS Today

### 1.1 Current Section Inventory

The Report is a single-page scroll document with a right-rail table of contents. It renders up to 17 named sections, gated on data availability:

| Section ID | Label | Data source | Renders when |
|---|---|---|---|
| `rpt-hero` | Overview | `workflow` summary | Always |
| `rpt-lead` | Start Here | `insights.timeBreakdown` or `processOutput` | Longest step ≥ 25% of time |
| `rpt-scores` | Process Health | `interpretation.scores` | Scores present |
| `rpt-phases` | Phase Timeline | `interpretation.phases` | ≥ 1 phase |
| `rpt-metrics` | Run Metrics | `processOutput` step durations | Step timing exists |
| `rpt-variance` | Variance & Variants | `intelligence.variance` / `.variants` | Intelligence data present |
| `rpt-timestudy` | Step Duration Analysis | `intelligence.timestudy` | ≥ 2 runs |
| `rpt-insights` | Insights | `insights` | Insights data present |
| `rpt-automation` | Automation Opportunities | `agentIntelligence.opportunities` | Agent data present |
| `rpt-bottlenecks` | Bottlenecks | `intelligence.bottlenecks` | Intelligence data present |
| `rpt-steps` | Step Breakdown | `processOutput.processDefinition.stepDefinitions` | Steps present |
| `rpt-structure` | Friction & Decisions | `interpretation.friction` / `.decisions` | Either present |
| `rpt-rework` | Rework Patterns | `interpretation.rework` | Rework present |
| `rpt-agents` | Composed Agents | `agentIntelligence.agentComposition` | Agents present |
| `rpt-skills` | Skill Library | `agentIntelligence.skillLibrary` | Skills present |
| `rpt-integrations` | Integrations & Risks | `agentIntelligence.integrationRisk` | Risk data present |
| `rpt-roadmap` | Implementation Roadmap | `agentIntelligence.artifacts.roadmap` | Roadmap present |

The report is reached via a third tab ("Report") on the workflow detail page. Analysis is auto-triggered the first time the tab is opened (`handleRunIntelligence` + `handleRunAgentIntelligence` fire immediately on tab focus). There is no loading indicator while analysis runs, so sections may begin empty and fill in asynchronously.

### 1.2 What the "So What" Is Per Section (Current State)

**Hero (`rpt-hero`)** — Shows an animated metric strip: duration, steps, phases, confidence %, system count, status badge. Adds a deterministic lead sentence ("A 14-step process across 3 systems in 4 phases, completing in 2m 14s at 87% extraction confidence."). This is a good identity statement. Strong.

**Start Here (`rpt-lead`)** — Amber callout: "Step N owns X% of active process time — the highest-leverage place to optimize or automate first." Renders only when a clear leader exists. This is the single best signal on the page. Correctly placed second.

**Process Health (`rpt-scores`)** — Four score bars: Complexity, Friction, Linearity, Manual Intensity. Each has a label and a one-line interpretation. The scores are from the interpretation pipeline; the underlying evidence for each score is not shown. A user can see "High friction (72)" but cannot click to learn which steps drove it. Information is present but not actionable without drilling.

**Phase Timeline (`rpt-phases`)** — A horizontal strip of colored phase cards. Shows phase name, step count, duration (when available), and system. This is visual and clear. The phase strip does not link to steps; clicking a phase card does nothing.

**Run Metrics (`rpt-metrics`)** — Four stat tiles: steps analyzed, avg step, active step time, longest step. Single-run safe. These metrics are useful in the aggregate but do not contextualize. Redundant with the longest-step callout one section above (same figure shown twice).

**Variance & Variants (`rpt-variance`)** — The most analytically rich section on the page. Multi-run only (single-run shows a "record again" nudge). When multi-run data is present: a prose summary, six metric tiles (runs, completion, median duration, sequence stability, duration CV, high-variance steps), a variant distribution list with Pareto frequency bars, and a "Where runs diverge" view showing the LCS backbone and branch paths. This is genuinely differentiated content. However: the metric labels are technical (Coefficient of Variation, Sequence Stability); a process owner needs an interpretation, not just a number. **Known issue: variance/variants figures are misreported — a separate root-cause review is in progress.** This review acknowledges that issue and does not duplicate the root-cause investigation.

**Step Duration Analysis (`rpt-timestudy`)** — A table of per-step mean/median/p90 values across all runs. Multi-run only. The table is flat and unranked; there is no visual emphasis on the outlier steps. A user scanning this table has to read every row to find the slow ones.

**Insights (`rpt-insights`)** — A filterable card feed. Severity badges (critical, high, medium) and a category filter strip. Each card is expandable to show evidence, impact, and suggestion text. This is well-built. The category filter (All / Time Analysis / Rework / System Efficiency / Automation / Process Health) is useful. Weakness: the "No inefficiencies detected" empty state shows a green checkmark and "This workflow appears well-structured" — this could be misleading on a single-run workflow where there is simply insufficient data to detect anything.

**Automation Opportunities (`rpt-automation`)** — A grid of opportunity cards with automation score chips and estimated savings. Confidence banding ("based on N runs · low/medium/high confidence") is present and is the right honest framing. The estimates are displayed without explaining the scoring model. There is no link between an opportunity and the steps it targets.

**Bottlenecks (`rpt-bottlenecks`)** — A ranked list of bottleneck steps with position, title, system, mean duration, and a duration ratio vs overall mean. The `BottleneckRow` component is clean. This section answers "which steps are slowest" clearly. However, it appears *after* Automation Opportunities in the scroll order, which is backwards — bottlenecks inform which opportunities are worth pursuing.

**Step Breakdown (`rpt-steps`)** — A full list of all steps, expandable per step to show evidence and instructions. Bottleneck steps are highlighted with a red ordinal badge. Phase dividers group steps visually. This is the most detailed view on the page. The problem: it gives every step equal visual weight. A 40-step process renders 40 rows. The list has no sorting, no filtering, and no way to see only the anomalous steps.

**Friction & Decisions (`rpt-structure`)** — A two-column grid: friction points (with type, severity, description, evidence, step numbers) and decision points (with step number, decision type, title, evidence). Both are read-only text cards. A user can read what the friction is but cannot see where it appears on the process map, and there is no suggested remediation attached.

**Rework Patterns (`rpt-rework`)** — Cards showing rework type, severity, description, step ordinals, and occurrence count. The occurrence count is the most actionable signal here. Gated — only renders when rework is detected. Clean.

**Composed Agents (`rpt-agents`)** — AI agent cards with role, capability score, systems, task and skill counts. This is forward-looking AI Vision content. Requires AI analysis. Currently the most speculative section — the "agents" are hypothetical compositions, not running processes.

**Skill Library (`rpt-skills`)** — A table of skills extracted from AI analysis: skill name, type, reusability score, autonomous flag. Useful as a prerequisite inventory for AI implementation. Requires AI analysis.

**Integrations & Risks (`rpt-integrations`)** — An integration table (system, readiness, complexity, setup time) and a risks list. Practical for an IT or automation team scoping work. Overall risk banner at the top. Requires AI analysis.

**Implementation Roadmap (`rpt-roadmap`)** — A vertical timeline of implementation phases with effort estimates and prerequisites. The most "go do this" section on the page. Requires AI analysis.

### 1.3 Is It a Decision-Grade Report or a Data Dump?

**Current verdict: partial data dump with decision-grade islands.**

Decision-grade islands: the "Start Here" callout, the Automation ROI banding, the diverge/reconverge variant story, the bottleneck list.

Data dump characteristics: the Step Breakdown (40 equal-weight rows), the Timestudy table (unranked rows), the Friction & Decisions grid (no remediation), the Process Health scores (no evidence links), the Hero metric strip (six numbers with no interpretation of their combination).

The report has no executive summary that synthesizes across sections. A user who opens the report does not get a paragraph that says "This is a high-friction, moderate-complexity process with 3 variants. The top opportunity is Step 7 (owns 34% of time). Automate the data-entry loop at steps 8-10 first." That synthesis is the entire point of an intelligence report, and it is absent.

### 1.4 What Is Strong

- The section architecture is correct. The right analytical categories exist.
- The "Start Here" callout is the product's single strongest decision-grade signal. It is always-computable and always-actionable.
- The confidence banding on automation estimates is honest and correct.
- The variant diverge/reconverge view (when multi-run data is available) is genuinely differentiated from any competitor.
- The right-rail TOC with scroll-spy is well-implemented. Section gating (sections hide when no data) is cleaner than showing empty shells.
- The animated metric counters in the hero are a strong first impression.
- The `asArray` null-safety guard prevents production crashes from malformed data.

### 1.5 What Is Missing, Redundant, or Low-Signal

**Missing:**
- Executive summary / synthesized narrative
- Per-finding evidence links to specific run IDs and step sequences
- Step-level navigation: click a step in the report and jump to it on the process map
- Trend signals ("18% faster than your last 3 runs") from the existing `DriftReport`
- PDF / printable export of the report itself (the "Report" download button in the header exports raw JSON)
- Cycle-time distribution histogram (computable from existing timestudy data)
- Comparison across workflows ("this process takes 2× longer than similar processes")
- SOP alignment score (already computed by `analyzeSopAlignment` in the intelligence engine, not surfaced in the Report)
- "What If" scenario modeling (already computed by `simulateWhatIf` in the recommendation engine, not surfaced)
- A clear action priority ranking across all findings (the user sees insights + bottlenecks + friction + rework as four separate lists with no unified triage)

**Redundant:**
- "Longest step" appears in both `rpt-lead` (as the primary callout) and in `rpt-metrics` (as one of four stat tiles). Same figure surfaced twice.
- The Hero metric strip (steps, phases, duration) repeats information already in the page-level header above the tab bar.
- Run count appears in `rpt-variance` and again in `rpt-automation`. There is no consistent "based on N runs" header at the top of the report to establish the data basis for everything.

**Low-signal:**
- The Timestudy table with no sort or color-coding gives equal visual weight to every step.
- The Friction & Decisions two-column grid shows type labels and descriptions but no remediation or priority ranking.
- "Composition score" / capability score on Agent cards has no benchmark or target.
- The variant ID labels (e.g., `variant-1`, `variant-abc3f`) are technical identifiers, not human-readable path descriptions.

---

## 2. Information Quality: Does It Answer the Process Owner's Questions?

A process owner opening the Report has five primary questions:

**Q1. How consistent is this process?**
Present, but weak. The sequence stability percentage and duration CV are shown, but a process owner does not know what "0.73 sequence stability" means without interpretation. The honest nudge ("record this workflow again to unlock variance") is correct for single-run. Multi-run variance and the diverge/reconverge story, when present, are genuinely answering this question. However, the known misreporting of variance/variants figures (separate root-cause review in progress) means these figures cannot be trusted at current state. Trust-status: present but currently unreliable pending the root-cause fix.

**Q2. Where are the bottlenecks?**
Present and reasonably clear. The Bottlenecks section names steps, shows duration, and shows the ratio vs average. The "Start Here" callout adds the highest-leverage signal. The timestudy table adds per-run granularity. Honest about the N-run basis. Assessment: strong for this question.

**Q3. How many ways is this process done? (Variants)**
Present only for multi-run. When present, the variant distribution, Pareto bars, standard path %, and diverge/reconverge view are the best answer to this question on the market. When single-run, the honest "record again" nudge is correct. Assessment: strong architecture, reliability blocked by the root-cause review.

**Q4. What should I automate or standardize?**
Partially answered. Automation opportunities with confidence banding answer "what to automate." There is no explicit "what to standardize" recommendation surface (though the variant story implicitly answers this). The Recommendations engine (`generateRecommendations`) is computed by the intelligence engine but not surfaced in the Report. Assessment: partially present, not unified.

**Q5. Is this process drifting?**
Absent. The intelligence engine computes a full `DriftReport` including structural drift, timing drift, step count drift, and exception rate drift with severity signals. None of this reaches the Report view. Assessment: not present.

**Bonus: Is this well-documented? Does the SOP match reality?**
Absent. `analyzeSopAlignment` computes an SOP alignment score with undocumented steps and unused SOP steps. This is not surfaced in the Report. Assessment: computed, not surfaced.

---

## 3. The Vision for a Best-in-Class Report

### 3.1 The Flagship Report Mental Model

A best-in-class process intelligence report functions like a financial earnings report: it opens with a summary verdict, supports it with evidence, and closes with recommendations. A reader who only reads the first section should get the key answer. A reader who reads everything should have everything they need to act.

The structure is: **Identity → Verdict → Evidence → Action**.

- **Identity:** What is this process? (Title, context, confidence basis, N runs)
- **Verdict:** Is it healthy? What is the most important finding? (A synthesized 3-5 sentence executive summary + the single biggest risk/opportunity)
- **Evidence:** How do we know? (Metrics, variants, timestudy, friction, bottlenecks — ranked by impact)
- **Action:** What should happen next? (Automation roadmap, standardization priorities, specific steps to fix, with ROI)

### 3.2 The Narrative Arc

1. **Executive Summary** — 4-6 sentences synthesizing the key findings across all available data. Written in plain language. ("This is a moderately complex, high-friction process with 3 execution variants. The standard path covers 71% of runs. Step 7 owns 34% of total cycle time and is 4.1× slower than the process average — this is the highest-leverage improvement target. Automating the data-entry loop at steps 8-10 is estimated to save 2.1 hours/month (medium confidence, based on 6 runs).")
2. **The one thing** — The "Start Here" callout (already exists, keep, promote to top).
3. **Process identity** — Metrics band, phase timeline (where am I and how is this structured).
4. **Consistency story** — Variants and variance (is this process repeatable? if not, where does it diverge?).
5. **Diagnosis** — Bottlenecks, friction, rework, drift (what is wrong and where).
6. **Deep evidence** — Timestudy, insights feed, step breakdown (the raw evidence for each finding).
7. **Action plan** — Automation opportunities with ROI, standardization recommendations, implementation roadmap.
8. **Appendix** — Raw evidence collapse, agent/skill details.

### 3.3 What "Best in Class" Requires

1. Every finding links to its evidence. You can click from "Step 7 is a bottleneck" to the step events that generated it.
2. The executive summary is machine-generated from the same data that drives all other sections. It is not a marketing paragraph — it is a diagnostic synthesis.
3. The action items are ranked by ROI, not by analytical category. The user does not have to cross-reference four sections to find what to do first.
4. The report is exportable as a human-readable PDF. A process owner must be able to hand this to a manager or put it in a project folder.
5. Multi-run data is visually distinguished from single-run inference everywhere — not just in a section header.
6. The report compares this process to others in the library (when available) to contextualize scores.

---

## 4. Improvement Backlog — 15+ Major Improvements

Priority definitions: P0 = blocks trustworthiness / must fix; P1 = high-signal upgrade; P2 = significant uplift.

---

### IMP-01 — Fix Variance/Variants Misreporting [P0]

**Problem:** Variance and variant figures are reported incorrectly. A separate root-cause review is in progress (see the ongoing variance/variants root-cause investigation). Until this is fixed, the Variance & Variants section and the Timestudy section produce numbers the product cannot stand behind.

**Change:** Follow the root-cause review's prescribed fix. This review does not duplicate that work.

**Value:** Restores trust in the most differentiated section of the report. Without correct variance numbers, the Report's multi-run story is broken.

**Effort:** Blocked on root-cause review outcome. Implementation effort TBD.

---

### IMP-02 — Add a Machine-Generated Executive Summary [P0]

**Problem:** The report has no synthesized verdict. A user who opens the Report gets a metric strip and 17 sections with no guidance on which findings matter most or what to do first. A process owner reading this cannot answer "is this process good or bad?" in under 60 seconds.

**Change:** Add a prominently placed executive summary card between the Hero and "Start Here." The summary synthesizes across available data: process type + health verdict, top bottleneck, variant story (N paths, standard path coverage), top automation opportunity, and the single highest-urgency finding. Synthesis is computed deterministically from the same data used by each section — no LLM required at this stage. The template is observable-signal driven ("This process runs in 4 phases across 3 systems. Sequence stability is 73%, indicating moderate variance. Step 7 accounts for 34% of cycle time. 3 automation candidates identified with medium confidence.").

**Value:** This is the single change that converts the Report from a data dump to a decision-grade document. A user who reads only this card has enough to act.

**Effort:** Medium. ~2-3 days. Pure presentation — derives from already-computed data. No new API calls. Template-based synthesis.

---

### IMP-03 — Fix "Report" Export to Produce a Readable PDF [P0]

**Problem:** The "Report" download button in the page header exports raw JSON. This is not a shareable document. A process owner who wants to present findings to a manager, attach a report to a project, or print a procedure cannot use the current export.

**Change:** Replace the JSON download with a PDF export of the visible report sections. A print-friendly CSS layout already exists on the page (`no-print` classes are used). A `window.print()` triggered PDF with a white background and section page-breaks is viable as an immediate step. A fully formatted PDF via a server-side rendering route is the upgrade path.

**Value:** Makes the report an artifact that can leave the product. This is table stakes for enterprise and ops-team buyers. Every competitor in the space (Scribe, Tango, SweetProcess, Celonis) ships PDF export. Ledgerium today cannot produce a single shareable human-readable document.

**Effort:** Low for `window.print()` MVP (print CSS + page breaks + 1 day). Medium for server-side PDF rendering.

---

### IMP-04 — Surface the Drift Report [P0]

**Problem:** The intelligence engine computes a full `DriftReport` — structural drift, timing drift, step count drift, exception rate drift, with per-signal severity — and it is not shown anywhere in the Report.

**Change:** Add an `rpt-drift` section between Variance and Bottlenecks. Show drift signals as a list of alerts: signal type, severity, delta (e.g., "Cycle time increased 23% vs prior 5 runs"), and observed window. Gate on multi-run. Single-run shows a "Drift analysis available after 3+ runs" message.

**Value:** Answers the "is this process degrading?" question — which no other section answers. Drift is the signal that makes a process owner take action today vs eventually.

**Effort:** Medium. The `DriftReport` type and `detectDrift` function are already shipped in the intelligence engine. Data is already available via `intelligenceData`. This is a presentation-only addition.

---

### IMP-05 — Add Evidence Links: Finding → Run → Step [P1]

**Problem:** Every finding (bottleneck, friction, rework, insight) is a text card. There is no path from "Step 7 is a bottleneck" to "here are the 6 runs that produced this timing, and here are the events." Ledgerium's entire strategic moat is the evidence-linked nature of its intelligence. The Report does not make that visible.

**Change:** Add expandable evidence panels to bottleneck rows, insight cards, and friction cards. The panel shows the run IDs and step sequences that produced the finding. At minimum: link to the process map view filtered to that step. Full implementation requires the API to thread per-finding run linkage (this is Slice 5d from the consolidation plan — a data-layer change).

**Value:** This is the product's single strongest competitive differentiator. No competitor in the process intelligence space surfaces run-grain evidence at the finding level. Making it visible converts "trust us, this is a bottleneck" into "here is the evidence."

**Effort:** High (data slice: API + `WorkflowReportPage`). Presentation layer only (link to map + run IDs): Medium.

---

### IMP-06 — Add Interpretation Scores to Plain-Language Thresholds with Evidence [P1]

**Problem:** Process Health scores (Complexity 68, Friction 72, Linearity 41, Manual Intensity 55) are shown as bars with one-line interpretations ("Some friction"). The user does not know what drives each score or what a better score looks like. A score without a benchmark or a threshold for action is a number without meaning.

**Change:** Add a "What's driving this?" expand per score card. Show the top 2-3 contributing signals (e.g., "Friction is high because: 3 context-switching events, 2 wait-time gaps, 1 unclear ownership step"). Add a benchmark chip when library-comparison data is available ("74th percentile for processes of this type"). Add a "What to do" line for scores above threshold ("Reduce friction: address context-switching events at steps 5, 9").

**Value:** Converts an observation into a diagnosis. Without this, the Process Health section is a vanity metric panel.

**Effort:** Medium. Driving signals are already in the interpretation payload (`friction` array, `decisions` array). Requires wiring them into the score card display.

---

### IMP-07 — Rank the Timestudy Table Slowest-First with Duration Bars [P1]

**Problem:** The Step Duration Analysis table lists steps in position order (step 1, step 2, step 3...). A process owner scanning for slow steps has to read every row. The table has no visual signal for outliers.

**Change:** Sort the table by mean duration descending. Add a duration mini-bar to each row (width = mean duration / max mean duration in the set). Color-flag P90 outliers (steps where P90 > 2× mean) in amber. Add a column for the ratio vs process mean.

**Value:** Converts a flat data table into a ranked diagnosis. A user can see the slowest steps in 5 seconds.

**Effort:** Low. The data is already present. This is pure presentation.

---

### IMP-08 — Surface SOP Alignment Score [P1]

**Problem:** `analyzeSopAlignment` is exported from the intelligence engine and produces an alignment score with undocumented steps, unused SOP steps, and drift indicators. None of this is surfaced in the Report. A process owner who has both a SOP and recorded runs has no way to know if their documented procedure matches how the process is actually executed.

**Change:** Add an `rpt-sop-alignment` section above Insights. Show: alignment score (%), undocumented steps (steps that appeared in runs but are missing from the SOP), unused SOP steps (steps in the SOP that never appeared in runs), and drift indicators. Gate on having both a SOP artifact and intelligence data.

**Value:** SOP alignment is the bridge between the Workflow map and the SOP tab. It is also a unique signal no competitor surfaces in this form. For an ops team that owns a formal SOP, this section is the highest-value output of the product.

**Effort:** Medium. Requires wiring `analyzeSopAlignment` into the intelligence pipeline so the result flows to the Report. The display component is new but straightforward.

---

### IMP-09 — Add "What If" Scenario Box to Automation Opportunities [P1]

**Problem:** The automation opportunities section shows a score and an estimated savings. There is no way to ask "what if I automated 3 of these?" or "what would a 20% reduction in step 7 time mean for total cycle time?" The `simulateWhatIf` function in the recommendation engine already computes this.

**Change:** Add an interactive "Estimate impact" panel within the Automation section. Allow the user to toggle individual opportunities on/off and see total projected savings update. Surface the `WhatIfScenario` output: projected cycle time reduction, bottleneck severity change, estimated hours/month saved. Show confidence banding on all projections.

**Value:** Converts the automation section from a suggestion list into a decision tool. Enables the "business case" conversation a process owner needs to have with a manager to approve automation investment.

**Effort:** Medium. `simulateWhatIf` is already implemented in the recommendation engine. Display requires a client-side state toggle; no new API calls if the scenario computation is client-side.

---

### IMP-10 — Add a Unified Action Priority List [P1]

**Problem:** The user who finishes reading the Report has seen: bottlenecks (1 section), friction points (1 section), rework patterns (1 section), insights (1 section), automation opportunities (1 section). These are presented as separate analytical categories. There is no unified list that says "here are the 3 things to do this week, ranked by ROI."

**Change:** Add an `rpt-actions` section between Automation and Agents (or directly after the Executive Summary as a "Top Actions" quick list). Aggregate the top findings across all sections into a ranked action list. Each action item has: category (Automate / Standardize / Fix / Investigate), the finding it derives from, estimated effort, and a link to the relevant section. 5-7 items maximum.

**Value:** This is what a consultant would produce from the same data. It is the difference between "here is what we found" and "here is what to do." Without it, the user has to synthesize across 17 sections to arrive at a priority list.

**Effort:** Medium. Rankings derive from existing severity scores, automation scores, and bottleneck ratios. The challenge is the unification logic, not the display.

---

### IMP-11 — Add Cycle-Time Distribution (Histogram or Range Bar) [P1]

**Problem:** The Run Metrics section shows median duration but no sense of the distribution. A process owner does not know if the median is reliable (tight distribution) or noisy (wide spread). The P90 vs median ratio is the most diagnostic signal for SLA risk.

**Change:** Add a cycle-time distribution visualization to the Run Metrics section (multi-run only). If the per-run duration data is available: a histogram with bucket bars. If only summary stats are available: a range bar showing min / median / p90 / max. Annotate with the P90/median ratio as a spread label ("P90 is 2.4× median — high variability").

**Value:** Makes the "how consistent is timing?" question visually answerable in 5 seconds. The timestudy data for individual steps is present; the aggregate distribution is the complement.

**Effort:** Low for a range bar (median + spread from existing timestudy stats). Medium for a histogram (requires per-run duration array from the intelligence pipeline).

---

### IMP-12 — Make Variant IDs Human-Readable [P2]

**Problem:** Variants are displayed with their technical identifiers (e.g., `variant-1`, `variant-abc3f`). The path signature is shown as a monospace string (e.g., `click_click_fill_navigate_click`). A process owner reading "82% of runs follow variant-1" has no human-readable description of what variant-1 actually is.

**Change:** Derive a human-readable label for each variant from its path signature. The path signature is a sequence of step categories; a variant can be labeled by its defining characteristics (e.g., "Standard path (click → fill → navigate)", "Short-form path (skip steps 4-6)", "Extended path (+2 review steps)"). The standard path is already labeled "Standard." Non-standard paths should be labeled by their structural difference from the standard.

**Value:** Converts a technical output into a narrative. "82% of runs take the short-form path" is a finding a manager can act on; "82% of runs follow variant-abc3f" is not.

**Effort:** Low-Medium. Path signature parsing + a diff vs the standard path. The diverge/reconverge analysis already computes the diff; it just needs a label renderer.

---

### IMP-13 — Add Cross-Section Run-Count Provenance Banner [P2]

**Problem:** Run count context is shown inconsistently. The automation section says "based on N runs." The variance section shows "N runs analyzed." The timestudy section says "per-step timing across N runs." The hero section does not mention run count at all. A user who jumps to a specific section does not know the data basis.

**Change:** Add a persistent data-basis strip below the hero section (always visible, not scrolled away). Shows: "Based on N recorded run(s) · Last run: [date] · Extraction confidence: X%." This strip updates as intelligence data loads. Replaces the redundant per-section mentions of run count.

**Value:** Sets the epistemic context for the entire report. A single-run report should feel different from a 20-run report. The current experience treats them identically above the section level.

**Effort:** Low. Data is in the hero props. Requires one new sticky/contextual strip component.

---

### IMP-14 — Add Report-Level Sharing and Annotation [P2]

**Problem:** Sharing the Report today means sharing a raw link to the whole workflow detail page. The recipient lands on the Workflow tab (process map), not the Report. There is no way to share a specific finding, annotate a section, or comment on a bottleneck for a colleague.

**Change:** (a) "Share this report" button that deep-links to the Report tab directly (append `?tab=report` to the share URL). (b) Per-section anchor link copy (the right-rail TOC already has `#rpt-X` IDs — expose a copy-link icon on hover). (c) Phase 2: report-level comments/annotations (named user + text note attached to a section ID, persisted and visible on shared view).

**Value:** Makes the Report the artifact that gets shared in Slack, attached to tickets, and reviewed in meetings — instead of a JSON file or a screenshot. This is the "become the source of truth in the team's workflow" motion.

**Effort:** Low for deep-link sharing (URL parameter). Medium for per-section link copy. High for annotations (persistence + sharing model).

---

### IMP-15 — Section-Reorder to Match the Narrative Arc [P2]

**Problem:** The current section order is: Overview → Start Here → Process Health → Phase Timeline → Run Metrics → Variance & Variants → Timestudy → Insights → Automation → Bottlenecks → Steps → Friction → Rework → Agents → Skills → Integrations → Roadmap.

The problem: Bottlenecks appears after Automation. Bottlenecks are the diagnosis; Automation is a prescription derived from that diagnosis. Showing the prescription before the diagnosis inverts the reasoning. Similarly, Insights (the diagnosis feed) appears before Bottlenecks, which are the most time-critical diagnosis.

**Change:** Reorder sections to match Identity → Diagnosis → Action: Overview → Start Here → (Executive Summary, new) → Process Health → Phase Timeline → Run Metrics → Variance & Variants → Timestudy → Bottlenecks → Friction & Decisions → Rework → Insights → (SOP Alignment, new) → (Drift, new) → Automation Opportunities → (Action Priority, new) → Agents → Skills → Integrations → Roadmap.

**Value:** Makes the Report read in a logical sequence: what is this process → what is wrong with it → what to do about it. Currently a user who reads top-to-bottom encounters a prescription (Automation) before a core diagnosis (Bottlenecks).

**Effort:** Low. Section reorder is a render order change in the main component. The only risk is scroll-spy anchor IDs shifting — these should be verified.

---

### IMP-16 — Replace Technical Metric Labels with Process-Owner Language [P2]

**Problem:** Several metric labels are engineering-facing, not process-owner-facing:

- "Duration CV" (Coefficient of Variation) — not known outside statistics
- "Sequence Stability" — intelligible only with context
- "Confidence" (meaning extraction confidence) — could be read as prediction confidence
- "Manual Intensity" — clearer than most but still jargon-adjacent
- Automation score "82" — has no target or benchmark for calibration

**Change:** Rename or add plain-language subtitles: "Duration CV" → "Cycle-time spread (CV)" with a tooltip. "Sequence Stability" → "Path consistency" with an interpretation (">80% = most runs follow the same sequence"). "Confidence" → "Recording confidence" to distinguish from predictive confidence. Per-metric interpretation sentences (already partially present in Process Health) should extend to the Variance section metrics.

**Value:** The product's strategic buyer is a process owner or ops manager, not a data scientist. Labels that require a glossary are barriers to adoption.

**Effort:** Low. String changes + tooltip additions.

---

## 5. The Single Most Important Improvement

**IMP-02 — Machine-Generated Executive Summary.**

The Report currently has all the analytical depth a process owner needs. It does not have a verdict. A user opening the Report for the first time sees a metric strip followed by 17 sections. There is no place where the system says: "Here is what matters, here is why, here is what to do."

Every other improvement on this list makes specific sections better. This one determines whether the Report is a destination or a detour. Without a synthesized executive summary, a process owner reads the Report and leaves with a list of observations. With a synthesized summary, they leave with a verdict and a next action.

This is achievable today from observed-only data with no LLM. It is the difference between a data dump and a decision-grade document.

---

## 6. Success Metrics and Open CEO Decisions

### 6.1 Success Metrics

**Leading indicators (measurable within 30 days of improvements shipping):**

| Metric | Baseline (current) | Target | Source |
|---|---|---|---|
| Report tab open rate (% of workflow detail views that open Report) | Unknown — no event | ≥ 40% within 30 days | `report_section_viewed` analytics event |
| Time to first action from Report (user opens Report → clicks through to a step, copies a link, runs analysis, or exports) | Unknown | ≤ 90 seconds p50 | `report_section_time_spent` |
| Export/share rate (% of Report views that produce a share link or PDF export) | ~0% (current export is JSON only) | ≥ 10% | `share_link_created` + PDF export event |
| Executive summary read-through (scroll past summary into Evidence sections) | N/A | ≥ 70% of Report opens | Scroll depth analytics |
| Automation section CTR (any click on an automation card or "Run AI Analysis" CTA) | Unknown | ≥ 25% of Report opens with AI data | `report_automation_opportunity_clicked` |

**Lagging indicators (30-90 days):**

- Report as a sharing artifact: number of shared report links created per week
- Session depth: average number of sections viewed per Report open
- Return visit rate: users who open the same workflow's Report on more than one visit (indicates decision-in-progress)
- Plan conversion signal: Team plan conversion rate for users who viewed a multi-run Report vs users who did not

### 6.2 Instrumentation Required

Currently there is no `report_section_viewed` event instrumented. The following events are needed to measure any of the above:

- `report_opened {workflowId, runCount, hasIntelligence, hasAgentIntelligence}` — fires when Report tab becomes active
- `report_section_viewed {section, timeOnSection, runCount, hasData}` — fires on scroll into viewport
- `report_insight_expanded {insightId, severity, category}`
- `report_step_expanded {stepOrdinal, isBottleneck, hasEvidence}`
- `report_automation_clicked {opportunityId, score, runCount}`
- `report_exported {format: 'pdf' | 'json' | 'share_link'}`
- `report_finding_evidence_expanded {findingType, stepOrdinal}` (future, for IMP-05)

### 6.3 Open CEO Decisions

**D-01 — Executive Summary generation approach.** Template-based (deterministic, from existing computed data, ships in days) vs LLM-generated (higher narrative quality, adds latency and infrastructure, ships in weeks). Recommendation: template-based first; LLM upgrade is additive when AI Vision phase opens.

**D-02 — PDF export format.** `window.print()` with print CSS (low effort, low quality) vs server-side PDF rendering (high effort, high quality, shareable URL). If the Report is a primary sharing artifact, server-side PDF is the right investment. Decision gates roadmap sequencing.

**D-03 — SOP alignment in Report.** Confirm whether `analyzeSopAlignment` should be part of the standard Report pipeline (requires wiring through the intelligence API) or a separate on-demand trigger. Recommendation: include in the intelligence analysis trigger — it is a natural complement to bottlenecks and insights.

**D-04 — Evidence drill-down scope.** IMP-05 requires threading per-finding run IDs and step sequences through the API (the data-layer Slice 5d from the consolidation plan). This is the highest-strategic-value improvement and also the highest-effort one. Confirm priority relative to the process mapping work and AI Vision build.

**D-05 — Cross-workflow comparison.** "This process takes 2× longer than similar processes" requires a library-comparison layer. Is this in scope for the Report iteration or deferred to a later analytics phase? The answer gates whether IMP-06's benchmark chip is feasible.

**D-06 — Variance/variants fix timeline.** IMP-01 blocks the credibility of the Report's most differentiated section. The CEO-stated root-cause review is running. Once the root cause is identified, does the fix land in the current build cycle or is it sequenced after? This gates when the Report is publishable as a trustworthy multi-run document.

---

*Source files reviewed: `apps/web-app/src/components/detail/WorkflowReportPage.tsx` (2063 lines), `apps/web-app/src/app/(app)/workflows/[id]/page.tsx`, `packages/intelligence-engine/src/index.ts`, `docs/features/process-mapping/finalize/WORKFLOW_SOP_DISPLAY_PM.md`, `docs/features/process-mapping/finalize/PROCESS_MAPPING_MASTER_PLAN.md`, `docs/features/report-view/REPORT_CONSOLIDATION_AND_PERFECT_REPORT_PLAN.md`, `docs/features/report-view/IMPLEMENTATION_PLAN.md`.*
