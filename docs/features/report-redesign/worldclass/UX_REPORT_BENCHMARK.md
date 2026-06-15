# UX Report Benchmark — World-Class Report Craft vs. Ledgerium Workflow Report
**Date:** 2026-06-15
**Author:** ux-designer
**Scope:** Read-only. No product code changed.
**Artifacts read:** `WorkflowReportPage.tsx` (3094 lines) · `REPORT_REDESIGN_REVIEW_001.md` · `UX_REPORT_REVIEW.md` · `UX_RD_PRINT_SPEC.md` · `COMPETITIVE_REPORT_BENCHMARK.md` · `PM_REPORT_REVIEW.md` · `ANALYTICS_REPORT_REVIEW.md`

---

## 1. Information Design: Ledgerium vs. World-Class Report Craft

### 1.1 The inverted-pyramid standard

Every serious process-intelligence tool (Celonis, UiPath Process Mining, SAP Signavio, Apromore, IBM Process Mining) and every major product-analytics platform (Amplitude, Mixpanel, Stripe Sigma) structures its reports on the same inverted-pyramid hierarchy:

1. **Verdict (30 seconds).** A plain-English conclusion, 1–4 sentences, that states what the data says. Backed by 3–5 KPI tiles with color-coded thresholds. No methodology here, no raw numbers — only the answer.
2. **Evidence (2–5 minutes).** Charts that explain the verdict. Each chart has a one-sentence caption directly below it that states the interpretation, not the label. A reader who never expands further understands why the verdict was reached.
3. **Source (drill).** Run-level tables, trace replay, step-by-step accordion — defensibility for analysts and auditors.

Celonis's AI summary (Sept 2025 release) is the sharpest implementation: "Ran 12×; cycle time +18% driven by Credit Check bottleneck; 12% rework; 2 automation candidates ≈340h/mo." The reader is done in six seconds. Every number carries a reference point ("3.1× target", "+18%"), not a bare measurement.

### 1.2 Where Ledgerium is strong

**Verdict-first structure is in place.** The `ExecutiveVerdictSection` (R-B) sits above the scorecard and produces 1–4 deterministic plain-English sentences. No competitor except Celonis auto-generates this from real recorded behavior. This is genuinely differentiated — Celonis generates from event logs, Ledgerium generates from recorded behavior with no modeled baseline. The "Observed verdict" label and the "Evidence-linked" badge (R-D §3) correctly declare this provenance.

**The 5-tile scorecard is correctly structured.** Cycle Time · Consistency (color-coded CV band) · Variant Count · Bottleneck Step · Automation Score — this matches the UiPath 5-tile pattern and exceeds Apromore and IBM. Each tile carries an interpretation string below the value, which no tier-1 competitor does consistently.

**Honest single-run gating.** The `runCount < 2` guard throughout the report is more honest than Celonis, which will render a conformance score with N=1 and call it "100% compliant." Ledgerium shows "Record again to unlock" — a better user behavior nudge and a defensibly honest claim.

**The variant Pareto with "Reference path" badge** is competitive with UiPath's variant explorer. Human-readable labels (not hash strings) are already specified in `buildParetoRows`. The diverge-reconverge story ("Where runs diverge") is not available in any tier-2 tool and matches Celonis at a fraction of the implementation cost.

**The "Start Here" amber callout** (step owns ≥25% of process time) is the single best signal on the report. It answers the most common stakeholder question — "where should I focus?" — in one sentence, above the fold. Celonis does not have this in a report view; it lives in a separate Action Flows module. This is a genuine UX advantage.

**Evidence-linked badge.** The emerald badge "Every figure traces to recorded events — nothing modeled or inferred" is the strongest trust signal in the competitive space. No tier-1 competitor states this on the report itself. The implementation in `EvidenceLinkedBadge` (print-safe, aria-labeled, tooltip disclosure) is correct.

### 1.3 Where Ledgerium is weak

**The 30-second executive read does not exist yet for multi-section depth.** The verdict + scorecard are the right start, but the report then drops into 15+ more sections with no visual hierarchy between them. A reader who gets past the scorecard faces a flat sequence: hero, lead, process scores, phase timeline, run metrics, variance, timestudy, insights, automation, bottlenecks, steps, friction, rework, agents, skills, integrations, roadmap. These are not three acts — they are one long list.

Stripe Sigma and Amplitude both solve this with a hard visual chapter break between the "What happened" section and the "Why it happened" section. Celonis uses a tabbed panel within the report: "Overview / Variants / Cases / Automation." The common pattern is one dominant visual per chapter, not one dominant visual per section.

**No captioned charts.** The world-class standard is a one-sentence interpretation directly below each chart — not in the tooltip, not in the surrounding prose, not in the section heading. "The reference path accounts for 78% of runs; the remaining 22% branch at Step 4" placed immediately below the Pareto bars. "Duration ranges from 1m 22s to 7m 44s; the P90 is 5m 11s — nearly 4× the median" placed immediately below the distribution track. Ledgerium has this information (the `cvBand` string, the distribution spread sentence at the bottom of `CycleTimeDistributionSection`), but it is not consistently applied as a chart caption. It appears as tertiary-color prose below the chart and uses too many words.

**The process-health score tiles have no reference point.** "Friction: 68 — Some friction" means nothing without "vs. similar processes" or "vs. your last recording." Celonis always shows a delta (↑/↓ vs. prior period). Amplitude shows a benchmark band. Ledgerium shows only the absolute value. The analytics review correctly flags this as P1 — a process-health score without a reference point is an observation, not intelligence.

**The hero metric band has no visual hierarchy.** Duration, Steps, Phases, Confidence, Systems, and Status all render at identical visual weight — `text-[28px] font-bold`. Duration is the most important figure for most readers. Status is a categorical badge. A status pill at 28px font weight occupying the same cell-width as the cycle-time metric is a category error in information design. Stripe Sigma isolates the hero metric (one big number, full-width) from secondary metadata (small pills). Tableau does the same. Ledgerium gives every cell equal weight.

**Section transitions have no chapter structure.** The `space-y-10` (40px) gap between every section pair looks the same whether sections are "Overview → Health" (a chapter break) or "Bottlenecks → Step Breakdown" (a sub-section continuation). The UX review's layout proposal (three structural acts: executive summary, metrics intelligence, deep evidence) is correct and not yet implemented.

**Scannability of the deep sections is low.** The Step Breakdown accordion (up to 40 rows, each collapsed), the Timestudy table (flat, unranked), and the Insights Feed (filterable but card-sized) are all heavy for a reader who wants to find the top three things worth acting on. Celonis solves this with a persistent "Action" sidebar that surfaces the 3 highest-impact recommendations regardless of which section the reader is viewing. UiPath shows a priority ranking number (P1/P2/P3) on every finding row. Ledgerium has severity badges on insight cards but they do not propagate to bottleneck rows, friction cards, or step rows.

---

## 2. Drill-Down and Interactivity

### 2.1 The world-class standard

World-class process reports implement four-level progressive disclosure:

1. **Verdict** → 2. **Which section** → 3. **Which step/variant/run** → 4. **The trace / evidence**

Celonis: clicking a finding in the AI summary highlights the variant in the Variant Explorer and shows the specific cases (run IDs). UiPath: clicking a bottleneck row opens a panel showing per-run durations for that step and links to individual run traces. Amplitude: clicking any chart segment filters every other chart in the report to that cohort.

The common thread: **every finding is a navigable claim**, not just a display value. A reader who reads "Step 4 accounts for 41% of cycle time" can click Step 4 and immediately see which runs it was slow in, what happened before and after, and whether it correlates with other signals.

### 2.2 What Ledgerium has

**Evidence anchors exist.** `InsightActionCard` expands to show `evidence`, `impact`, and `suggestion` text. `stepOrdinals` are passed to cards. `evidenceRunIds` are plumbed through `deriveLeadFigures` and collected from `standardPath.evidenceRunIds`, `bottlenecks[0].evidenceRunIds`, and variant `evidenceRunIds`. The data infrastructure for drill-down exists.

**The "Start Here" callout names the step.** "Step 3 owns 41% of active process time" gives a specific, navigable reference. The step exists in the Step Breakdown accordion below.

### 2.3 What is missing or broken

**Step ordinal references are not navigable.** An insight card showing `stepOrdinals: [3, 7]` displays "Steps: 3, 7" as plain text. There is no link, no scroll-to, no highlight. A reader who sees this must manually scroll the entire Step Breakdown list to find Step 3. UX review P1-05 correctly identifies this. The fix is `id="rpt-step-{ordinal}"` on each step row and a `scrollIntoView` call on the step ordinal text. This is the highest-impact drill-down move available without a new component.

**Evidence run IDs are collected but not surfaced.** `evidenceRunIds` strings are in the data model (`deriveLeadFigures` produces them). They are not rendered anywhere in the current UI. A reader who sees a bottleneck finding has no way to go to the specific run that exemplifies it. This is the core of what Celonis and UiPath offer that Ledgerium does not.

The known runId ≠ workflowId issue is the blocker: clicking a run ID should navigate to that run's detail, but the route structure currently uses `workflowId`. Until that is resolved, the practical interim is displaying the run ID as a readable reference ("Evidence: Run #4, #7, #12") so the reader at least knows which recordings to examine manually. This is better than hiding the evidence entirely.

**Phase cards are not clickable.** Clicking a phase card does nothing. A minimal improvement: clicking a phase card scrolls to the first step of that phase in the Step Breakdown section. The `stepRange` field is already present on `InterpretationPhase`.

**The Variant Pareto rows have no drill.** Clicking a variant row does nothing. The variant's `evidenceRunIds` are available. At minimum, clicking a variant should reveal which run IDs follow that path — surfaced as a simple text list. A future iteration can link to run detail pages.

**The insight-to-bottleneck cross-reference is absent.** When an automation opportunity and a bottleneck share a step position, they are shown in entirely separate sections with no connection. A reader who sees "Automate step 3" and "Step 3 is the top bottleneck" must make that connection themselves. UX review P2-06 identifies this. The fix is a cross-reference chip in the automation card ("Bottleneck confirmed — Step 3 is also the top bottleneck at 4.2× avg").

---

## 3. The Legacy Overview Block

### 3.1 The redundancy

`HeroSection` (`rpt-hero`) renders six animated metric cells: Duration, Steps, Phases, Confidence, Systems, Status. `RunMetricsSection` (`rpt-metrics`) renders: Steps analyzed, Avg step, Active step time, Total elapsed, Longest step. The first four fields of `RunMetricsSection` substantially overlap with what the hero band already shows.

The 5-tile scorecard (`rpt-scorecard`) then shows Cycle Time (derived from `medianDurationMs`), which is the multi-run version of what the hero shows as single-run Duration.

This produces a three-way near-duplication for a reader who sees: hero Duration → Run Metrics (step count, total elapsed) → Scorecard (cycle time). All three communicate "how long this process takes" with slight variations.

### 3.2 Recommendation: slim, do not remove

**Keep `HeroSection` as the document identity block.** Title, status badge, lead sentence, and the six-cell metric strip serve as the document header for both on-screen and print contexts. The animated counters are a UX delight that the competitive benchmark (Amplitude, Stripe Sigma) does not have — they are a differentiator.

**Slim `RunMetricsSection` to its unique contribution.** The unique value of `RunMetricsSection` over the hero band and scorecard is the gap disclosure: "Wall-clock · 3m 12s between steps" — this is the only place where the difference between active step time (Σ measured step durations) and total elapsed time (wall-clock run duration) is honestly surfaced. No competitor discloses this. Keep the section but reduce it to 2 tiles: "Active step time" (with the Σ disclaimer) and "Idle / between steps" (the gap). Remove Steps analyzed (already in hero) and Avg step (inferrable from tiles, not actionable alone). Rename the section from "Run Metrics" to "Step Timing" (already recommended in print spec PRT-P1-05).

**Visual consistency across the report.** The three tile patterns currently in use are: (1) `MetricCell` in the hero band, a borderless div at `text-[28px] font-bold`; (2) `ScorecardTileCard`, a bordered card at `text-[22px] font-semibold` with an interpretation string; (3) plain `card` divs in `RunMetricsSection` at `ds-metric-value` size. These three patterns have different heights, border treatments, and font sizes. A reader scanning the page sees three different "tile" shapes for what is conceptually the same element. Consolidate to one tile pattern throughout the report — use the `ScorecardTileCard` pattern (bordered, with interpretation string, 22px value) as the universal tile. Reserve the 28px bold treatment for the hero band only, since its role is identity, not analysis.

---

## 4. Print/PDF: Ledgerium vs. World-Class Exported Reports

### 4.1 The world-class standard

Every tier-1 process intelligence tool exports PDF. The standard stakeholder PDF is:

- **Page 1:** Cover/verdict block with 3–5 KPI tiles and a one-paragraph conclusion. The KPI tiles are the same as on-screen with exact colors preserved.
- **Page 2:** Primary evidence chart (variant Pareto or cycle-time histogram) with caption, bottleneck table, and drift summary.
- **Page 3+:** Supporting evidence — step breakdown, friction analysis, AI opportunities.
- **Running footer:** Tool name, workflow/process name, date range, page number, and a data-provenance statement.

Celonis PDFs carry "Celonis Process Intelligence — [Process Name] — Generated [Date] — Based on [N] cases from [Source System]" as a running header. The provenance statement is always present because audit requirements in enterprise process mining often mandate it.

The differentiating footer Ledgerium can claim: **"All data derived from observed behavior — no modeled estimations."** No Celonis, UiPath, or Signavio PDF states this because their data sources are process event logs that may include modeled segments. Ledgerium's browser-recorded behavioral data is genuinely unmodeled. This should be the print differentiator.

### 4.2 Current state

The current report has no `@media print` stylesheet. Printing from the browser produces: app navigation, tab strip, right rail (all 23 nav entries), filter pills in the Insights section, "Run Analysis" CTA buttons, and the `useCountUp` animations frozen mid-count if the user prints quickly. The step breakdown accordion collapses evidence behind chevrons that do not expand in print. The "Evidence-linked" badge tooltip text ("Every figure traces to recorded events...") does not appear in print because tooltips do not render.

The dark `bg-gradient-to-br from-brand-50/70 to-white` on the verdict card may print as a near-black rectangle on printers with "Background graphics" unchecked (default Chrome setting). The bottleneck contribution bars (`bg-red-500`, `bg-red-400`) will not survive print without `color-adjust: exact`.

### 4.3 The dark insight-card-in-print issue

This issue was noted in the brief. The `InsightActionCard` uses a severity-colored left border and a card background. In print mode without `color-adjust: exact`, severity borders disappear. More critically, any dark-mode-aware card (using `var(--surface-elevated)`) that resolves to a dark color in the user's color scheme will print as a dark rectangle. The fix is the global `* { color-adjust: exact; -webkit-print-color-adjust: exact; }` rule combined with an explicit `background: #ffffff !important` override for cards in print. This is specified in `UX_RD_PRINT_SPEC.md` Section 1.2 and maps to PRT-P0-01.

### 4.4 Metadata footer

The print spec (`UX_RD_PRINT_SPEC.md` §1.7) correctly specifies the footer:

```
Generated from {N} recorded run(s) · {dateRange} · All data derived from observed behavior — no modeled estimations.
                                                                                          Ledgerium AI · {workflow.title}
```

The phrase "All data derived from observed behavior — no modeled estimations" must be immutable in implementation. It is the product's strongest trust differentiator in a printed artifact that may circulate beyond the browser session.

The current footer on the on-screen report ("Generated from observed workflow behavior · Evidence-backed · Ledgerium AI") is not wrong, but it is weaker than the print version. The on-screen footer should match the print footer phrasing for consistency.

### 4.5 What still needs to happen

The print spec is fully written. The implementation gap is:
1. No `report-print.css` file exists.
2. `step-detail-panel` className is not yet on the collapsible step detail div (required for `display: block !important` in print).
3. `step-expand-chevron` className is not yet on the `ChevronDown` icon inside each step row.
4. The print-only header (`<div class="report-print-header hidden print:block">`) is not yet in `WorkflowReportPage.tsx`.
5. The print-only footer (`<div class="report-print-footer hidden print:block">`) is not yet in `WorkflowReportPage.tsx`.
6. The "Print / Save as PDF" button replaces the misleading "Report (JSON)" export button but has not been implemented.

---

## 5. AI/Narrative and Conversational Direction

### 5.1 What world-class looks like in 2026

Celonis's AI summary (generally available Sept 2025) produces a 3–5 sentence paragraph at the top of every process report. It identifies the headline metric, the primary cause, and the highest-impact action. It is generated server-side from the event log and updated on refresh. Users can type follow-up questions: "Why is Credit Check slower in Q4?" "Which teams have the highest rework rate?" The Q&A is grounded in case-level data — the model cites specific runs.

Amplitude's AI assistant (Insights, GA 2025) generates narrative summaries of retention and funnel charts. Users can ask "What changed between last week and this week?" and receive a paragraph that names the cohort and the event delta.

The directional pattern across both: **narrative first, chart second**. The prose summary replaces the need to read the chart; the chart provides confirmation and drill depth. Readers who trust the summary do not need to read the chart at all.

### 5.2 An honest path for Ledgerium

**What Ledgerium has today that is already correct:** The deterministic `buildReportVerdict` function produces 1–4 plain-English sentences from `sequenceStability`, `coefficientOfVariation`, `variantCount`, `dominantPathRunCount`, and `topBottleneck`. This is already a template-generated narrative. It runs in the browser, deterministically, with no LLM call. It is honest because it only states what the data contains — no inference beyond the observed figures.

The single-run verdict is particularly strong: "A 7-step process completing in 4m across 2 systems. Single recording — record again to unlock variance and variant analysis." This is more honest than Celonis's single-case conformance output.

**Near-term template expansion (no LLM required):** Extend `buildReportVerdict` with two more template-based sentences:
- If `topBottleneck` exists: "The top opportunity is [Step N], which accounts for [X%] of cycle time and appears in [N] of [M] runs."
- If `automationScore` is present and high: "The automation readiness score is [N]/100 — [interpretation band]."

These additions require no AI and are fully deterministic. They close the gap between Ledgerium's current 4-sentence maximum and Celonis's 6-sentence target summary.

**Medium-term (LLM-assisted, grounded):** The `interpretation.summary` field from the AI interpretation pipeline is already present in the data model but is not rendered in `WorkflowReportPage` anywhere. This is an LLM-generated paragraph grounded in the specific recording. Rendering it as the prose lede above the 4 finding tiles (as proposed in `UX_REPORT_REVIEW.md` §2.3) would give Ledgerium an honest AI narrative block without building a new generation pipeline. The provenance disclosure must accompany it: "AI-generated summary based on this recording" rather than presenting it as measured data.

**Conversational direction:** The competitive movement is toward in-report Q&A. Ledgerium's correct path is: do not build a general Q&A UI before the report structure is stable. Build the structured drill-down (step ordinal links, run ID references, evidence anchors) first. These are the same data surfaces an AI Q&A would query. Once drill-down is navigable, the AI layer can be added without rebuilding the interaction model.

A minimal conversational affordance that is achievable now: a "What does this mean?" expand button on the `ExecutiveVerdictSection` that reveals the `interpretation.summary` AI paragraph, clearly labeled "AI-generated interpretation of this recording." This is one button and one conditional render — not a chat interface.

---

## 6. The 8–12 Highest-Impact UX Moves

Ranked by leverage: the combination of (a) how much it improves the 30-second executive read or drill-down utility, (b) how small the implementation is.

### P0 — Must ship before external sharing

**Move 1: Chart captions — one sentence under every chart (P0)**
Highest-leverage move per chart in the report. Directly below the Pareto bars: one sentence stating what the distribution means. Directly below the distribution track: one sentence stating the spread. Directly below the consistency gauge: one sentence restating the band in plain language ("This process runs consistently — the 16 observed runs varied less than 25% in duration."). These are already computed (cvBand, distribution spread, consistency band) — they need to be moved from tertiary-color prose at the section bottom to a styled caption element directly below the chart. No new data. Implementation: a `<p className="report-chart-caption mt-2 text-ds-xs text-[var(--content-secondary)]">` element placed as an immediate sibling after each chart container. Target: every chart in the report has a caption within 8px of its bottom edge.
**Component:** `CycleTimeDistributionSection`, `ConsistencyGaugeSection`, `VarianceVariantsSection` Pareto, `BottleneckContributionSection`.

**Move 2: Step ordinal links — insight card stepOrdinals become anchors (P0)**
An insight card that says "Steps: 3, 7" must link to those steps. Add `id="rpt-step-{ordinal}"` to each step row's wrapper div in `StepBreakdownSection`. Change the plain "Steps: 3, 7" text in `InsightActionCard` to `<button onClick={() => document.getElementById('rpt-step-3')?.scrollIntoView({ behavior: 'smooth' })}` anchors. The step row should visually highlight for 1.5 seconds after scroll (a yellow flash or border-pulse using a CSS `@keyframes` animation). This creates the verdict → finding → step drill path. No new API. No state beyond a transient highlight flag.
**Component:** `InsightActionCard`, `StepBreakdownSection`.

**Move 3: Section visual grouping — three acts with dividers (P0)**
Insert a full-width horizontal rule with a group label between the three structural acts: after the scorecard (before the "Health & Metrics" group), and after the Timestudy section (before the "Evidence" group). Each divider: `<div class="flex items-center gap-3 my-8"><hr class="flex-1 border-[var(--border-subtle)]"><span class="text-[9px] font-semibold uppercase tracking-widest text-[var(--content-tertiary)] px-2">{groupName}</span><hr class="flex-1 border-[var(--border-subtle)]"></div>`. This turns the flat scroll into three readable chapters: "Summary → Health & Spread → Evidence." 6 lines of JSX.
**Component:** `WorkflowReportPage` (layout JSX).

**Move 4: Hero Duration as visual dominant (P0)**
Duration is the most important single number on the report. It currently renders at `text-[28px] font-bold` — identical to Steps, Phases, Confidence, Systems. Give Duration a `text-[36px]` headline and a visually distinct cell (no top border, slightly wider minimum width). Status should be demoted to a small pill in the Systems cell (it is metadata, not a metric). Confidence should be relabeled "Extraction confidence" with a `title` tooltip to resolve the misleading label identified in the analytics review. These are 4 Tailwind class changes.
**Component:** `HeroSection`, `MetricCell`.

**Move 5: Mobile/tablet TOC — grouped sticky pill strip (P0)**
The right-rail nav (`hidden xl:block`) is invisible on 1024–1279px screens. Add a sticky pill strip showing 4 group labels (Summary, Health, Evidence, Actions) that appears below 1280px when the user scrolls past the verdict. Tapping a group opens a dropdown with section entries. This closes the navigation gap for the most common laptop screen width. The spec is fully written in `UX_RD_PRINT_SPEC.md` §4.4.
**Component:** New `MobileReportTOC` inside `WorkflowReportPage`.

### P1 — Required before GA or stakeholder sharing

**Move 6: Grouped right-rail nav (P1)**
Replace the flat 23-entry nav with 4 labeled groups: Summary, Health & Spread, Evidence, Actions. Groups with no visible sections are hidden. Group labels are `text-[8px] uppercase tracking-widest`. This changes the nav from an index to navigation. The group structure constant is already specified in `UX_RD_PRINT_SPEC.md` §4.2.
**Component:** `RightRailNavigator` (or the nav block inside `WorkflowReportPage`).

**Move 7: Evidence run IDs rendered as readable references (P1)**
`evidenceRunIds` strings are already collected in `deriveLeadFigures`. They are not rendered. Inside the `InsightActionCard` expanded body and the `BottleneckContributionSection` row, add a small "Evidence runs" line: `Run #4, #7, #12` (format: run index within the cohort, not raw UUID). This requires mapping UUID to a display index — a simple `variantList.indexOf(runId) + 1` or a Map built during data derivation. The runId ≠ workflowId issue means these cannot be live links yet; render as text references until routing is resolved. Text references are already better than hiding evidence entirely.
**Component:** `InsightActionCard`, `BottleneckContributionSection`, `deriveLeadFigures`.

**Move 8: Proportional phase timeline (P1)**
The phase timeline shows 10-minute phases and 30-second phases at the same card width. Apply `flex: {durationShare}` to each phase card when all phases have `durationMs`. The horizontal scroll layout supports proportional widths without layout change. When any phase lacks `durationMs`, fall back to equal widths with a `(proportional durations unavailable)` footnote. This turns the phase strip into a Gantt-like artifact — the first thing an executive asks when looking at a process is "which phase takes longest?"
**Component:** `PhaseTimelineSection`.

**Move 9: Automation section moved before Bottlenecks (P1)**
Current scroll order places Automation at position 9 (after Bottlenecks). The primary Ledgerium value proposition is "find where AI fits." Move `AutomationSection` to position 8: immediately after Insights, before Bottlenecks. Insights say "what is wrong"; automation says "what to do about it"; bottlenecks say "here is the evidence." This matches the Celonis report structure and the cognitive flow a process owner follows. One JSX reorder — 0 new code.
**Component:** `WorkflowReportPage` (JSX section order).

**Move 10: Variant single-run unlock card (P1)**
The current single-run `VarianceVariantsSection` returns a plain card: "Recorded once. Run this workflow again to unlock variance, variant paths, and trend analysis." This is honest but flat. Replace with a feature-preview unlock card: three bullet points listing what becomes available (consistency score, variant paths, standard path frequency), a `GitBranch` icon at 32px, and a "Record this workflow again →" CTA that navigates to the recorder. This turns an absence into an activation. The UX review §4.2 has the full layout. The copy already exists in the component — it needs to be structured, not replaced.
**Component:** `VarianceVariantsSection`.

**Move 11: Print stylesheet — Phase 1 (P1)**
The full `@media print` specification exists in `UX_RD_PRINT_SPEC.md`. The five P0 print issues (PRT-P0-01 through PRT-P0-07) block any external sharing of the report. Consolidate into a single `report-print.css` file. Priority items: hide app chrome, add print-only page header, add honesty footer, force `step-detail-panel` visible, add `color-adjust: exact` for colored bars. Estimated effort: 4–6 hours if following the spec precisely.
**Component:** New `report-print.css`, `WorkflowReportPage.tsx` (new print-only elements, new className annotations).

### P2 — Meaningful improvement, deferrable

**Move 12: Automation × Bottleneck cross-reference chip (P2)**
When an automation opportunity's step position matches a bottleneck position, add a cross-reference chip in the automation card: "Bottleneck confirmed — Step 3 is also the top bottleneck (4.2× avg)." This requires a data join between `agentIntelligence.opportunities` (which needs a `stepOrdinal` field — check if present in the agent intelligence payload) and `intelligence.bottlenecks.bottlenecks[*].position`. If `stepOrdinal` is absent from opportunities, this move waits until the agent pipeline exposes it. When available, this is the highest-impact P2 move: it closes the gap between the two most important action signals on the report.
**Component:** `AutomationSection`, `AutomationOpportunityCard`.

---

## Summary Table

| Move | P | Leverage | Implementation size | Component |
|------|---|----------|---------------------|-----------|
| 1. Chart captions | P0 | High — makes every chart self-explanatory | XS — add `<p>` after each chart | Distribution, Consistency, Pareto, Bottleneck sections |
| 2. Step ordinal links | P0 | High — creates the finding→step drill path | S — `id` on step rows, `scrollIntoView` on insight cards | `InsightActionCard`, `StepBreakdownSection` |
| 3. Section visual grouping (3 acts) | P0 | Medium — turns flat scroll into chapters | XS — 3 divider elements in JSX | `WorkflowReportPage` layout |
| 4. Hero Duration as visual dominant | P0 | Medium — correct information hierarchy | XS — 4 Tailwind class changes | `HeroSection`, `MetricCell` |
| 5. Mobile TOC | P0 | High — closes navigation gap on laptop screens | M — new sticky component | New `MobileReportTOC` |
| 6. Grouped right-rail nav | P1 | Medium — improves orientation for 17-section doc | S — group constant + render loop | `RightRailNavigator` |
| 7. Evidence run IDs rendered | P1 | High — makes "Evidence-linked" claim navigable | S — Map + display in expanded cards | `InsightActionCard`, `BottleneckContributionSection` |
| 8. Proportional phase timeline | P1 | Medium — makes time distribution visible at a glance | S — `flex` proportion math | `PhaseTimelineSection` |
| 9. Automation before Bottlenecks | P1 | High — aligns section order with reader intent | XS — JSX reorder only | `WorkflowReportPage` JSX |
| 10. Variant unlock card | P1 | Medium — turns absence into activation | S — restructure existing copy | `VarianceVariantsSection` |
| 11. Print stylesheet | P1 | Critical for stakeholder use | M — spec is written, needs implementation | `report-print.css`, `WorkflowReportPage.tsx` |
| 12. Automation × Bottleneck chip | P2 | High when data is available | S — conditional chip render | `AutomationOpportunityCard` |

---

## Assumptions Affecting Implementation

1. **Chart caption text is already computed.** The interpretation strings (`cvBand`, `consistency.band`, the distribution spread sentence) exist in the component logic. Move 1 requires repositioning them, not computing new text.

2. **`id="rpt-step-{ordinal}"` is stable.** Step ordinals are positions in the extracted step list and do not change within a session. The `scrollIntoView` approach is safe. `id` values must not contain characters that are invalid in HTML id attributes — ordinals are integers, so this is safe.

3. **Move 7 (evidence run IDs) requires a display index map.** Raw UUIDs are not human-readable. The mapping `runUUID → "Run #N"` must be built from the variant list ordering (most-frequent first = Run #1 of that variant). This mapping is deterministic if variant order is stable, which it is (Pareto sort: frequency desc, stable tie-break by ID).

4. **The runId ≠ workflowId routing issue blocks live links.** Evidence run IDs rendered as text references (not anchor tags) avoid this blocker. When routing is resolved, the text references are upgraded to `<a>` tags in a single change.

5. **Move 3 dividers use the group structure from the nav.** The group names (Summary, Health & Spread, Evidence, Actions) must match between the section dividers in the main content and the group labels in the right-rail nav. A single constant `SECTION_GROUPS` drives both.

6. **Move 5 (mobile TOC) requires `position: sticky` on an inner scroll container.** If the Next.js app layout scrolls on an inner div rather than `document.body`, the `top: 0` sticky positioning must reference that container. Frontend must verify the scroll architecture before implementing.

7. **Print Move 11 requires `print:block` Tailwind variant enabled.** Verify `tailwind.config.ts` includes the `print` variant. If not, use `.report-print-only { display: none; } @media print { .report-print-only { display: block; } }` in the stylesheet instead of Tailwind class prefixes.
