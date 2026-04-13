# PRD: Workflow Intelligence Report — Consolidated Page Redesign

**Document ID:** PRD-WIR-001
**Version:** 1.0
**Date:** 2026-04-13
**Status:** Active — governs design and build decisions for the consolidated workflow report
**Author:** Product Manager Agent
**Supersedes:** N/A — this is a net-new layout specification that replaces the Report tab content and consolidates it with data surfaced in Insights, Intelligence, Interpretation, and Agent Intelligence tabs.

---

## 1. Problem Statement

### What is broken

The workflow detail page currently has five separate tabs: Report, Insights, Intelligence, Interpretation, and Agent Intelligence. Each tab surfaces a different layer of the pipeline output in isolation. To understand a single workflow, a user must:

- visit Report for an executive summary and step table
- visit Insights for categorized findings with evidence
- visit Intelligence to trigger a separate analysis run for bottleneck and timing data
- visit Interpretation for friction, rework, and complexity scores
- visit Agent Intelligence to trigger a second separate analysis run for automation opportunity and agent composition

This structure forces five navigation decisions to extract a coherent picture. Users who complete fewer than three tab visits never reach the automation intelligence. The Report tab — the first tab and the one most users see — contains the weakest signal (key observations as bullets, step counts, raw activity breakdown) and omits the most actionable content.

### Who has the problem

**Primary:** Dana, Operations Team Lead (ICP). Dana records a workflow to understand where time is being wasted and whether it can be improved. After recording, she lands on the Report tab and reads step counts and click totals. She does not see friction points, rework loops, or automation opportunities unless she manually navigates to three additional tabs.

**Secondary:** Marcus, Process Improvement Analyst. Marcus needs bottleneck evidence, timestudy data, and variant paths to write an evidence-backed recommendation. He has to trigger Intelligence and Interpretation analysis runs separately, and the data lives in disconnected contexts.

**Emerging:** Priya, AI Implementation Lead. Priya needs to understand automation score, agent composition, and integration risk in one pass. She must run Agent Intelligence separately and cannot see it alongside the process context that explains why those scores exist.

### What the job to be done is

> "Show me everything that matters about this workflow in a single reading, ranked by importance, with clear next steps."

The current design fails this job. The redesigned page must pass it.

### Why now

Phase 3 is targeting Pro conversion via the Agent Intelligence surface (PRD v2, P0-3). If the Agent Intelligence output is only discoverable via a separate tab that requires an explicit analysis trigger, the majority of users will never reach it. The consolidated report is the prerequisite for Pro conversion to work.

---

## 2. User and Buyer Context

### Primary user: Operations Team Lead (Dana)

Reads the report within minutes of a workflow recording completing. She needs to know immediately: how long did this take, where was it slow, what could be better? She does not have time to run multiple analysis pipelines or navigate tabs.

Activation signal for this persona: "I recorded a workflow and the output was good enough to share with my team."

The redesigned report must produce that signal from a single page view.

### Secondary user: Process Improvement Analyst (Marcus)

Uses Ledgerium to build evidence for process improvement recommendations. He needs bottleneck data, timestudy statistics, and variant analysis. He reads reports for multiple workflows and looks for patterns.

Upgrade trigger for this persona: he wants cross-workflow intelligence. The report page must give him enough single-workflow depth to want to see it at scale.

### Emerging user: AI Implementation Lead (Priya)

Uses the automation score, agent composition, and integration risk to make deployment decisions. She needs to see these numbers in context — alongside the process map phases, friction scores, and the specific steps that drove the automation score.

This persona is the primary Pro conversion driver. The report page must surface automation score and top opportunities without requiring her to navigate to a separate tab.

### Buyer: VP Operations (Chris)

Does not use the product daily. Receives shared reports or exports. Needs to understand the key signal (automation opportunity, bottleneck, recommended action) in under 30 seconds.

---

## 3. Design Principles for This Feature

These principles govern every layout and content decision in the redesigned report. They are not aspirational — they are constraints.

**Evidence before summary.** Every observation shown on the page must trace to observable workflow data. No synthetic scores or invented labels.

**Action before information.** If a finding has a recommended action, the action appears alongside the finding — not in a different tab.

**Severity drives order.** The highest-severity insight appears first. Not the most recently generated. Not the most recently viewed.

**Progressive disclosure.** Users see the critical signal in 10 seconds. Full detail is one click deeper, not another tab away.

**Reusability.** Every insight card, action card, and score chip on this page must be renderable from a shared component. The same insight shown here must be the same component used on the dashboard, in notifications, and in exported summaries.

---

## 4. MVP Scope

### Must be in the redesigned report page (MVP)

1. A single-pass executive signal block at the top: automation score, confidence, duration, top severity count. No scrolling required to see this.
2. A ranked actions panel showing the top 3 to 5 recommended actions derived from Insights, with severity, evidence pointer, and the suggestion text inline.
3. A process health block showing complexity, friction, linearity, and manual intensity scores from Interpretation, with a human-readable label per score.
4. A bottleneck and timing block showing top bottleneck steps from Intelligence and timestudy mean/median/P90 for those steps.
5. A variant and conformance block showing path variants from Intelligence, the standard path frequency, and any deviation count.
6. A step timeline showing all workflow steps with duration, category, and confidence inline — replacing the current plain steps table.
7. An automation opportunity strip showing automation score from Agent Intelligence, the top 3 opportunities with estimated time savings, and an agent count summary.

### Should wait (not MVP but scoped for the next iteration)

- Interactive step timeline with click-to-expand per step (step detail panel with evidence)
- Inline conformance checking against an approved process definition (requires ProcessDefinition to be promoted, which most beta recordings will not have)
- Side-by-side variant comparison embedded within the page (this is P2-1 in PRD v2 and is a separate layout problem)
- Export to PDF or Markdown directly from the report page (this is P1-1 in PRD v2)
- Benchmark comparison (this workflow vs. user's median for the same process type)

### Explicitly excluded from this scope

- The current separate Insights, Intelligence, Interpretation, and Agent Intelligence tabs are not removed — they remain available for users who want the full detail view. The redesigned report is a consolidated reading surface, not a replacement for the raw detail tabs.
- No new analysis pipelines are added. The report page only renders existing pipeline outputs.
- No LLM-generated narrative is introduced in this version. The page renders deterministic pipeline outputs only. LLM SOP generation (PRD v2, P0-2) is a separate feature.
- No real-time data or WebSocket updates.
- No chart library dependencies (bar charts, Sankey diagrams). Visualizations are achieved with existing CSS-based progress bars, category color borders, and score bars consistent with the Ledgerium design system.

---

## 5. Section Layout Specification

The redesigned page replaces the content of the current Report tab. Tab navigation to other detail tabs remains intact.

The page has 7 sections. Maximum. The 10-second comprehension requirement means sections 1 and 2 must be visible above the fold on a standard laptop viewport (1280x800).

---

### Section 1: Process Signal Header

**What it shows:**
- Workflow title and process type label (from Interpretation: processType)
- Five key metrics in a horizontal strip: total duration, step count, automation score (from Agent Intelligence: workflow.automationScore), overall confidence score (from Report: executiveSummary.workflowConfidence), and highest severity count (from Insights: summary.highSeverity)
- Systems touched as tag pills (from Report: executiveSummary.applicationsUsed)
- Quality advisory warning if present (from Report: qualityAdvisory)

**Why it matters (process mining rationale):**
In process mining, the executive view answers: how long, how complex, how reliable? The addition of automation score at this level is deliberate — it is the signal that differentiates Ledgerium from documentation tools and must be visible immediately for the Pro conversion journey to work.

**Data source:** Report (executiveSummary, header, qualityAdvisory), Interpretation (processType, processTypeConfidence), Agent Intelligence (workflow.automationScore)

**Key interactions:**
- Static — no interaction required. Quality advisory is shown as a dismissible callout if present.
- Automation score is color-coded: green (70+), amber (40–69), red (below 40), consistent with the existing AgentIntelligenceTab color logic.

**Assumptions flagged:** Agent Intelligence analysis must have run for the automation score to appear. If it has not, show a "Not yet analyzed" state with a single trigger button. This is the same gating pattern used in the current AgentIntelligenceTab.

---

### Section 2: Recommended Actions

**What it shows:**
- Ranked list of the 3 to 5 most actionable findings, each showing: severity badge, insight title, one-sentence description, and suggestion text. Ranked by severity (high first) then by impact estimate where available.
- Each action card is a self-contained unit: it shows the finding, the evidence pointer (step ordinals), and the suggestion in one block.
- A "See all findings" link opens the full Insights tab for the user who wants the complete list.

**Why it matters (process mining rationale):**
The single most common failure mode of process intelligence tools is surfacing findings without prescribing actions. Users abandon reports when they cannot identify what to do next. This section is the operational output of the report — the reason a manager shares this page with their team. It must be the second thing the user sees, before any process detail.

Reusability note: each card in this section is a standalone `InsightActionCard` component. This component must be designed for reuse on the dashboard (dashboard recommendations panel, PRD v2 requirements for bottleneck radar and AI opportunities), in notifications (future Phase 4), and in export artifacts.

**Data source:** Insights (insights array sorted by severity, with evidence, impact, and suggestion fields), Interpretation (friction array, rework array as supplemental source for high-severity action candidates if Insights produces fewer than 3 items)

**Key interactions:**
- Each card is expandable (one click reveals full evidence text and affected step list).
- Default state: collapsed, showing title, severity badge, and suggestion text.
- Expanded state: shows evidence, impact, full suggestion, and step ordinals.
- "Mark as reviewed" interaction is deferred to a future iteration. Do not design for it now.

**Acceptance criteria:**
- If zero insights exist: show "No inefficiencies detected — this workflow appears well-structured" with a green state, consistent with the current InsightsPanel empty state.
- If Insights data is unavailable: show a "Findings not yet computed" placeholder. Do not show an empty section.
- Cards must render identically whether displayed on the report page or on the dashboard panel. The component must accept a `compact` prop that collapses the evidence and step ordinals for the dashboard context.

---

### Section 3: Process Health

**What it shows:**
- Four score bars in a 2x2 or 4-column grid: Complexity, Friction, Linearity, Manual Intensity. Source values from Interpretation.scores.
- Each score has a color-coded bar (existing design system pattern from InterpretationTab ScoreCard), a numeric value, and a 2-word human-readable label (examples: "High Friction," "Well-Structured," "Mostly Linear," "Highly Manual").
- Process phases shown as a horizontal scrollable strip (from Interpretation.phases): phase name, step count, dominant action, system.
- Rework pattern count and friction point count as two inline chips below the scores (from Interpretation.rework.length and Interpretation.friction.length).

**Why it matters (process mining rationale):**
Complexity and friction scores are the two most important single-workflow health indicators in process mining. Linearity score indicates how much the process deviates from a predictable path — a critical signal for automation candidates. Manual intensity score directly relates to automation ROI. Showing these four scores together gives the user a complete health picture before seeing individual step evidence.

The phase strip is essential context for the bottleneck section below: a user needs to know which phase a bottleneck belongs to before they can act on it.

**Data source:** Interpretation (scores, phases, rework, friction)

**Key interactions:**
- Score bars are static.
- Phase strip is horizontally scrollable on narrow viewports.
- Rework count chip and friction point chip link to expanded Interpretation tab content on click (deep link to the Interpretation tab, opens the tab and scrolls to the relevant section). This is a navigation action, not modal.

**Assumption flagged:** Interpretation data is computed at upload time and should always be present. If it is absent, show a "Process health data unavailable" message. Do not show empty score cards.

---

### Section 4: Bottleneck and Timing

**What it shows:**
- Top bottlenecks (from Intelligence: bottlenecks.bottlenecks), showing step position, category, duration vs. average ratio, and mean duration. Cap at top 3.
- Slowest 3 steps from timestudy (Intelligence: timestudy.stepPositionTimestudies sorted by meanDurationMs descending) if bottleneck data does not cover them.
- A compact duration distribution: total duration, active time, idle time (from Report: metrics). Displayed as a labeled horizontal bar split — not raw numbers only.

**Why it matters (process mining rationale):**
Bottleneck identification is the foundational output of process mining. It is the answer to "where is the time going?" in an evidence-grounded way. Showing the duration ratio (N times slower than average step) is standard process mining presentation — it makes the relative cost of the bottleneck immediately interpretable without requiring the user to do mental arithmetic.

The duration distribution bar (active vs. idle) surfaces waste ratio at a glance. This is a standard time-study output.

**Data source:** Intelligence (bottlenecks, timestudy), Report (metrics: activeDurationMs, idleDurationMs, totalDurationMs)

**Key interactions:**
- Intelligence analysis must have run for bottleneck data to appear. If it has not, show a trigger button to run it inline (same pattern as current IntelligenceTab). Do not hide the section entirely — show the active/idle bar from Report metrics regardless of whether Intelligence has run.
- Each bottleneck row links to the step in the step timeline below (Section 6), scrolling the page to that step and highlighting it briefly (500ms).

**Acceptance criteria:**
- If no bottlenecks are detected: show "No significant bottlenecks detected" with the duration distribution bar still visible.
- Do not show P90 timestudy data in this section. P90 is detail-level and belongs in the full Intelligence tab. This section shows mean and the ratio only.

---

### Section 5: Automation Opportunity

**What it shows:**
- Automation score as a prominent number with color coding and a label ("Strong candidate," "Moderate candidate," "Limited automation opportunity") — from Agent Intelligence: workflow.automationScore.
- Agent count summary: how many agents were composed and the implementation readiness score — from Agent Intelligence: agentComposition.agentCount, integrationRisk.implementationReadinessScore.
- Top 3 automation opportunities ranked by score — from Agent Intelligence: opportunities.opportunities sorted by score descending. Each shows: opportunity title, category pill, estimated time savings.
- A single "View full agent design" call to action that links to the Agent Intelligence tab.

**Why it matters (process mining rationale):**
Automation opportunity scoring is the output that separates Ledgerium from documentation tools and drives Pro conversion. In process mining practice, automation candidate identification is the primary deliverable for process improvement projects. Showing this data here — in context, alongside the bottleneck and health data that explains it — gives the user the evidence they need to make an automation investment decision.

This section is the primary upgrade trigger for the AI Implementation Lead persona.

Reusability note: the automation score chip and top-opportunity list must be the same components used in the dashboard AI opportunities panel.

**Data source:** Agent Intelligence (workflow.automationScore, agentComposition.agentCount, integrationRisk.implementationReadinessScore, opportunities.opportunities)

**Key interactions:**
- If Agent Intelligence has not been run: show the automation score placeholder with a run trigger, consistent with the existing AgentIntelligenceTab empty state. The section is visible but in an unanalyzed state.
- On Pro plan: show all three top opportunities.
- On Free plan: show automation score and one opportunity. Blur or truncate the remaining two with a "Upgrade to see all opportunities" prompt. This is the Pro conversion gate defined in PRD v2 P0-3.

**Acceptance criteria:**
- Automation score must be visible on both Free and Pro plans.
- If Agent Intelligence returns an empty opportunities list: show "No automation opportunities detected" with a reason if available.
- The "View full agent design" link must navigate to the Agent Intelligence tab and scroll to the top of that tab's content.

---

### Section 6: Step Timeline

**What it shows:**
- All workflow steps in order, each showing: step ordinal badge, step title, category color border (existing design system category colors), duration, confidence, and system tag.
- Steps identified as bottlenecks (from Intelligence) are marked with an amber indicator.
- Steps identified as rework participants (from Interpretation.rework) are marked with an orange loop indicator.
- Steps identified as friction points (from Interpretation.friction) are marked with a red indicator.
- Steps identified as decision points (from Interpretation.decisions) are marked with a branch indicator.

**Why it matters (process mining rationale):**
A process mining step view that shows only name and duration is a table. A step view that overlays bottleneck, rework, friction, and decision point signals is a diagnostic tool. The overlay is the key upgrade from the current plain steps table in ReportTab. Users need to see the entire workflow in one pass and identify at a glance which steps carry risk.

This section replaces the existing Workflow Steps table in ReportTab entirely.

**Data source:** Report (workflowOverview.steps for base step data), Intelligence (bottlenecks.bottlenecks for bottleneck markers), Interpretation (rework for rework markers, friction for friction markers, decisions for decision markers)

**Key interactions:**
- Default state: a flat scrollable list of step rows.
- Each step row is expandable on click to show the SOPInstruction text for that step (from the SOP artifact, if available).
- Bottleneck, rework, friction, and decision indicators are icon-only in the collapsed state. On expand, the relevant evidence text is shown.
- Steps with confidence below 0.6 show a low-confidence indicator using the existing quality advisory amber pattern.

**Acceptance criteria:**
- Must render correctly for workflows with 1 step and workflows with 100+ steps. For 100+ steps, the list must be virtualized or paginated to prevent DOM bloat. Engineering must define the threshold — a suggested starting value is 50 steps before pagination is applied.
- If Intelligence has not run, bottleneck markers are omitted. The step timeline still renders from Report step data.
- If Interpretation is unavailable, rework and friction markers are omitted. The step timeline still renders.
- The section must not require all data sources to be present. It degrades gracefully to the minimum available data.

---

### Section 7: Conformance and Variant Signal

**What it shows:**
- Variant count and standard path frequency (from Intelligence: variants). If only one run exists, show "Single run — no variant comparison available."
- Sequence stability score (from Intelligence: variance.sequenceStability) displayed as a percentage with a label ("Highly consistent," "Some variation," "High variation").
- If high-variance steps exist (from Intelligence: variance.highVarianceSteps), list up to 3 with step position and category.
- A note if this workflow has been matched to a process definition and shows conformance data (future state — this should show a "Not yet matched to a process definition" placeholder for beta, because process definition matching is a Phase 4 feature for most recordings).

**Why it matters (process mining rationale):**
Conformance checking — comparing a specific execution against a known standard — is a core process mining discipline. For beta, most users will have single-run workflows and cannot benefit from conformance checking yet. The section still earns its position by showing the sequence stability score and variant data, which tell a user whether this recording represents a stable or unstable execution. Users with multiple recordings of the same workflow will see variant paths, which is the primary differentiator for the Process Improvement Analyst persona.

**Data source:** Intelligence (variants, variance), Process Intelligence Layer (ProcessDefinition match — placeholder for beta)

**Key interactions:**
- If Intelligence has not been run: show a run trigger.
- If only one run exists: show the single-run message and omit variant and variance data.
- High-variance step chips link to the step in Section 6 (same scroll-and-highlight pattern as bottleneck links in Section 4).

**Acceptance criteria:**
- On a workflow with a single run, the section must show a meaningful message rather than empty state.
- Process definition conformance placeholder must be clearly marked as "coming soon" or omitted entirely rather than shown as an empty data field. Decide before build — the suggested default is to omit the process definition row until the feature exists.

---

## 6. Reusable Component Requirements

These components must be built as shared components, not embedded in the report page layout alone. This is a design and engineering constraint, not a suggestion.

| Component | Used In | Reuse Context |
|-----------|---------|---------------|
| `InsightActionCard` | Report page Section 2, Dashboard recommendations panel, Future notifications | Accepts `compact` prop for dashboard display. Severity, title, description, suggestion, evidence, stepOrdinals props. |
| `AutomationScoreChip` | Report page Section 5, Dashboard AI opportunities panel, Workflow list row | Score number, color-coded, with label. Accepts `size` prop (sm/md/lg). |
| `OpportunityListItem` | Report page Section 5, Dashboard AI opportunities panel | Opportunity title, category, estimatedTimeSavingsMs. Accepts `blurred` prop for free-plan gating. |
| `ProcessHealthScoreBar` | Report page Section 3, Future: portfolio health views | Label, score (0-100), invert flag, neutral flag. Identical to InterpretationTab ScoreCard — refactor ScoreCard to become this shared component. |
| `BottleneckRow` | Report page Section 4, Dashboard bottleneck radar | Step position, category, durationRatio, meanDurationMs, vs average. |

Each component must:
- Accept a `variant` prop or `context` prop if the visual treatment differs across surfaces
- Not import from page-specific files
- Be placed in `src/components/shared/` (or equivalent shared component directory)
- Have an explicit TypeScript interface for its props — no `any` types

---

## 7. Acceptance Criteria

These are the observable behaviors required for this feature to be considered complete. They are independent of implementation approach.

### Report page renders correctly

- AC-1: Given a workflow with all pipeline outputs present (Report, Insights, Interpretation, Intelligence, Agent Intelligence), the redesigned page renders all 7 sections without error.
- AC-2: Given a workflow with only Report data (no Intelligence, Interpretation, or Agent Intelligence runs), the page renders Sections 1, 3, and 6 with available data and shows degraded-state placeholders for Sections 4, 5, and 7.
- AC-3: The page renders without console errors or TypeScript errors for any workflow in the system.

### Executive signal

- AC-4: A user who loads the page and does not scroll can see: workflow title, automation score (or not-yet-analyzed state), confidence score, duration, and at least one top action from Section 2.
- AC-5: The automation score is visible on both Free and Pro plans.

### Actions panel

- AC-6: The top action shown in Section 2 is the highest-severity insight from the Insights data, not the first item in the array.
- AC-7: Each action card renders identically when embedded in the report page and when rendered in the dashboard recommendations panel (same component, same props, different parent layout).
- AC-8: Expanding an action card reveals evidence text and affected step ordinals within the same card — no navigation required.

### Bottleneck and timing

- AC-9: Bottleneck markers in Section 6 (step timeline) correspond exactly to the bottleneck step positions listed in Section 4. No marker can appear in Section 6 that is not listed in Section 4.
- AC-10: The duration distribution bar (active vs. idle) renders correctly even when Intelligence has not been run.

### Automation opportunity

- AC-11: On Free plan, the automation score is visible. The second and third automation opportunities are visually indicated as present but not readable (blurred, overlaid with upgrade prompt).
- AC-12: "View full agent design" navigates to the Agent Intelligence tab. If Agent Intelligence has not been run, it navigates to the tab and shows the Agent Intelligence tab's own run-trigger state.

### Step timeline

- AC-13: A step marked as a bottleneck in Section 4 scrolls into view and receives a visible highlight for 500ms when clicked from Section 4.
- AC-14: Steps with confidence below 0.6 show the amber low-confidence indicator.

### Empty and degraded states

- AC-15: Every section has an explicit defined state for when its data source is unavailable. No section may render a blank white area without a state message.
- AC-16: Quality advisory callout is shown if the Report.qualityAdvisory field is non-null. It is not shown otherwise.

### Reusable components

- AC-17: `InsightActionCard`, `AutomationScoreChip`, `OpportunityListItem`, `ProcessHealthScoreBar`, and `BottleneckRow` are located in a shared component directory. The report page imports them from there.
- AC-18: The existing InterpretationTab ScoreCard is either replaced by `ProcessHealthScoreBar` or is confirmed to be an alias. There is no duplicate implementation.

---

## 8. Success Metrics

### Primary metric: Report page depth

**Definition:** Percentage of workflow detail page sessions where the user scrolls past Section 3 (i.e., the report is read beyond the executive summary and actions panel).

**Baseline:** Unknown — establish at launch.
**Target:** Greater than 50% of report page sessions reach Section 4 or beyond within 30 days of launch.
**Instrument:** Scroll depth tracking event `report_section_viewed` with section identifier (section_1 through section_7). Fire on first visibility per section per session.

### Secondary metric: Actions panel engagement

**Definition:** Percentage of report page sessions where a user expands at least one action card in Section 2.

**Baseline:** Unknown — establish at launch.
**Target:** Greater than 30% of report page sessions with insights present.
**Instrument:** `report_action_card_expanded` event with insight_id and severity.

### Secondary metric: Automation score visibility

**Definition:** Percentage of activated users who view the automation score on the report page.

**Baseline:** Current — agent_intelligence_tab_viewed is the PRD v2 target at 40% of activated users. The consolidated report page should exceed this by surfacing the score without requiring a separate tab navigation.
**Target:** Greater than 60% of activated users see the automation score within their first 5 workflow views.
**Instrument:** `report_automation_score_viewed` event, fires when Section 5 enters viewport for the first time per user per workflow.

### Gating metric: Pro conversion trigger

**Definition:** Percentage of Free plan users who click the upgrade prompt in Section 5 (blurred opportunity items).

**Baseline:** Unknown — establish at launch.
**Target:** This metric is not targeted in isolation. It feeds the PRD v2 Pro conversion rate target of 5% of activated free users upgrading within 30 days. The report page upgrade prompt must be instrumented before launch.
**Instrument:** `report_upgrade_prompt_clicked` event with source=opportunity_blur.

### Beta gate

If after 30 days of data the report_section_viewed rate for Section 4+ is below 30%, the section order or content of sections 1–3 must be reviewed before concluding that deeper sections are not valuable. Low scroll depth may indicate that sections 1–3 are absorbing all attention — either positively (the user got what they needed) or negatively (the page layout is not directing the user downward).

---

## 9. Open Questions

These must be resolved before build begins. Each is a decision gap.

| # | Question | Blocks | Urgency |
|---|----------|--------|---------|
| 1 | Does Intelligence analysis run automatically on workflow upload, or does it still require a manual trigger on the detail page? If it requires a trigger, the report page must show multiple "Run analysis" states and the design must account for partially-analyzed reports being the default. | Sections 4, 5, 7 — degraded state design | High |
| 2 | Does Agent Intelligence analysis run automatically on upload, or does it still require a manual trigger? Same question as above, separate pipeline. | Section 5 — automation score default state | High |
| 3 | For the step timeline (Section 6), what is the maximum step count in production recordings today? This determines whether list virtualization is required before launch or whether pagination is sufficient. | Section 6 — engineering approach | Medium |
| 4 | The existing five tabs (Report, Insights, Intelligence, Interpretation, Agent Intelligence) remain intact in this design. Is there a plan to consolidate or rename them once the report page is redesigned? If yes, the tab navigation logic must be coordinated with this build. If no, confirm that two surfaces will show overlapping data. | Tab navigation structure | Medium |
| 5 | For the Free plan opportunity blur in Section 5, what is the exact gating rule? Is it based on: opportunity count above 1, automation score above a threshold, or agent composition being non-empty? The gating rule must be defined before the UI is built. | Section 5 — Free plan state | Medium |
| 6 | Do any existing analytics events cover scroll depth, or must new events be instrumented? If PostHog is the primary instrument, confirm that Intersection Observer-based section visibility events are supported. | Success metrics instrumentation | Medium |

---

## 10. Non-Goals

The following are explicitly out of scope for this PRD. Do not build these.

| Item | Reason |
|------|--------|
| Remove or deprecate the Insights, Intelligence, Interpretation, or Agent Intelligence tabs | Those tabs remain the full-detail surfaces. This report page is the consolidated reading surface. They coexist. |
| Add new analysis pipelines | This page renders existing pipeline outputs only. |
| LLM-generated narrative prose | That is PRD v2 P0-2 and is a separate deliverable with separate LLM infrastructure requirements. |
| Chart library (Recharts, Chart.js, D3) | The design system achieves visual density without a chart library. Adding a chart library dependency is an engineering decision that requires separate justification. |
| Sankey flow diagram for process path visualization | This is a Phase 3 or Phase 4 enterprise feature. Not MVP. |
| Export from report page | That is PRD v2 P1-1. Not in scope here. |
| Inline SOP editor | The SOP tab handles editing. The report page is read-only. |
| Mobile optimization | The report page targets laptop/desktop. Mobile is explicitly out of scope per PRD v2 non-goals. |

---

## 11. Downstream Handoff Summary

For architect, design, engineering, and QA:

**The problem:** Users who land on the Report tab see an executive summary with step counts and raw activity metrics. The highest-value pipeline outputs (automation opportunity, bottleneck analysis, friction scores, rework patterns) live in separate tabs that most users never reach.

**The target users:** Operations Team Lead (primary), Process Improvement Analyst (secondary), AI Implementation Lead (emerging Pro conversion driver).

**The MVP scope:** A single consolidated report page with 7 sections in a fixed priority order: (1) Process Signal Header, (2) Recommended Actions, (3) Process Health, (4) Bottleneck and Timing, (5) Automation Opportunity, (6) Step Timeline, (7) Conformance and Variant Signal. The page renders existing pipeline outputs — no new pipelines.

**The reuse constraint:** Five components from this page must be built as shared components for use on the dashboard and future notification surfaces: InsightActionCard, AutomationScoreChip, OpportunityListItem, ProcessHealthScoreBar, BottleneckRow.

**The acceptance criteria:** 18 criteria defined in Section 7. Every section must have a defined degraded state for missing data. The automation score must be visible on both Free and Pro plans.

**The success metrics:** Report section depth (target: 50%+ of sessions reach Section 4+), actions panel engagement (target: 30%+ expand an action card), automation score visibility (target: 60%+ of activated users see it).

**The open questions:** Six questions in Section 9, two of which are High urgency and block the degraded-state design: whether Intelligence and Agent Intelligence analyses run automatically on upload.

---

## Appendix: Data Source Map

This table maps each section to the exact existing data fields it requires. Engineering must confirm field availability before build.

| Section | Data Source | Key Fields |
|---------|-------------|-----------|
| 1: Signal Header | Report (executiveSummary) | title, workflowConfidence, totalSteps, applicationsUsed, qualityAdvisory |
| 1: Signal Header | Report (header) | durationLabel |
| 1: Signal Header | Interpretation | processType, processTypeConfidence |
| 1: Signal Header | Agent Intelligence | workflow.automationScore |
| 1: Signal Header | Insights | summary.highSeverity |
| 2: Actions | Insights | insights[] (severity, title, description, evidence, impact, suggestion, stepOrdinals) |
| 2: Actions | Interpretation | friction[], rework[] (supplemental source) |
| 3: Process Health | Interpretation | scores (complexity, friction, linearity, manualIntensity), phases[], rework.length, friction.length |
| 4: Bottleneck | Intelligence | bottlenecks.bottlenecks[], timestudy.stepPositionTimestudies[] |
| 4: Bottleneck | Report (metrics) | activeDurationMs, idleDurationMs, totalDurationMs |
| 5: Automation | Agent Intelligence | workflow.automationScore, agentComposition.agentCount, integrationRisk.implementationReadinessScore, opportunities.opportunities[] |
| 6: Step Timeline | Report (workflowOverview) | steps[] (ordinal, title, category, durationLabel, confidence) |
| 6: Step Timeline | Intelligence | bottlenecks.bottlenecks[].position (for markers) |
| 6: Step Timeline | Interpretation | rework[].stepOrdinals, friction[].stepOrdinals, decisions[].stepOrdinal (for markers) |
| 6: Step Timeline | SOP artifact | steps[].action text (for expand detail) |
| 7: Conformance | Intelligence | variants (variantCount, variants[].isStandardPath, variants[].frequency), variance (sequenceStability, highVarianceSteps) |
