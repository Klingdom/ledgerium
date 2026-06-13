# Workflow + SOP Display — Product Manager Review

**Date:** 2026-06-12
**Author:** product-manager
**Status:** Read-only analysis — no product code modified
**Scope:** End-to-end display experience from workflow detail through SOP, reconciled with existing finalize/ plan

---

## 1. The End-to-End Journey

### 1.1 Journey Map

**Recording -> Library -> Workflow Detail -> [Workflow | SOP | Report]**

The user records a workflow via the extension, lands on the library (`/dashboard`), finds the workflow card, and clicks through to the detail page at `/workflows/[id]`. The detail page has three tabs: Workflow, SOP, Report.

**Where value is clear**

- The Workflow tab with the process map opens by default. A user who has recorded something complex and immediately sees a visual diagram gets the "aha" moment: "This is what I actually do." That moment is the product's reason for existing and it lands reasonably well today.
- The SOP Execution mode has a "Quick Start" card (trigger, prerequisites, systems, outcome) that is genuinely useful as an operator reference. The expandable step cards with numbered instructions, expected outcomes, and decision blocks are the right format for an operating procedure.
- The Report tab auto-triggers analysis on first open. The intelligence that surfaces (friction points, automation hints) has real signal.

**Where a user gets lost**

1. **Tab naming vs mental model.** "Workflow" is both the page name and the tab name. A user arriving on the page sees "Workflow" tab selected, a process diagram, and a sub-mode switcher with "Flow Intelligence / Swimlane / Process Variants / System Interaction." None of those mode names are self-explanatory to a non-technical process owner. The user does not know which mode to use or why any of them are different.

2. **The SOP tab is invisible until you know to look for it.** The default view is the process diagram. The connection between the diagram and the SOP is never stated. A user can look at the Flow Intelligence map for minutes and never learn that a written, step-by-step procedure exists one tab away. There is no "view the SOP for this map" affordance on the Workflow tab.

3. **The Report tab is orphaned.** It auto-loads analysis when opened, but there is no pointer from the Workflow or SOP tab to the Report. The insights that appear in the Report (bottlenecks, automation opportunities) also appear faintly in the SOP's Intelligence mode and the Insights strip — but the duplication is not explained. Users do not know the Report tab exists unless they look at the tab bar.

4. **"So what" is missing on every surface.** The process map shows a step-sequence diagram. The header shows N steps, duration, confidence. But the first thing a business user asks is: "Is this process good? What should I do about it?" That question is not answered on the Workflow tab. It requires navigating to Report. The journey from observation to recommendation requires three tab changes.

5. **Single-run vs multi-run distinction is invisible.** The user who has one recording sees the same diagram as the user who has twelve. There is no surface-level signal that says "this is one trace" vs "this is a statistically-grounded view of twelve runs." The variants mode requires a separate API call and shows a loading state; the user does not understand why it is different from the other modes.

### 1.2 The "So What" of Each Surface

| Surface | Current "so what" | What it should be |
|---------|------------------|------------------|
| Workflow / Flow Intelligence | Sequence of steps with category colors and duration labels | "Here is what this process looks like; the colored steps show where it concentrates and where it breaks" |
| Workflow / Swimlane | Steps grouped by system with handoff arrows | "Here is which system owns each part" |
| Workflow / Process Variants | Path comparison when multi-run data loads | "Here is how this process varies; the dominant path is X" |
| Workflow / System Interaction | System topology | "Here is the system footprint; N systems are involved" |
| SOP / Execution | Step-by-step procedure with quick start | "Here is how to run this process right now" |
| SOP / Visual Process | Phase-grouped view with bottlenecks | "Here is the structural overview for a manager or analyst" |
| SOP / Intelligence | Friction and recommendations | "Here is what is wrong and what to fix" |
| Report | Full analytics (insights, interpretation, bottlenecks, automation) | "Here is a complete process health assessment" |

The problem: the user discovers each surface by browsing. There is no navigational signal telling them which surface answers which question.

### 1.3 Is the Relationship Between Process Map and SOP Obvious?

No. The process map and the SOP are separate tabs with no cross-surface linking. A user clicking through a step on the Flow Intelligence map opens the inspector panel, which shows the SOP procedure for that step inline. That is the only connection. But the inspector panel is a secondary affordance — most users will not click a node without being prompted. The node does not have a visible "view in SOP" action, and the SOP tab does not have a "view on map" action for any step.

The SOPPageShell already receives the SOP artifact as a prop alongside the process map. The data is linked. The display is not.

---

## 2. Workflow Display Gaps

### 2.1 Tab Structure

The page has three tabs: Workflow, SOP, Report. The labels do not communicate what is inside each tab.

- "Workflow" as a tab name on a page called "Workflow" is a tautology. It means the user reads "Workflow > Workflow" as they navigate.
- "Report" does not communicate that this contains process health scoring, bottleneck analysis, and automation opportunity assessment.
- There is no hint text, preview, or description on any tab explaining what clicking it will reveal.

**Gap:** Tab names do not answer "what will I see?" before clicking.

### 2.2 Mode Switching — Does the User Know When to Use Each Mode?

The WorkflowModeSwitcher renders four buttons: Flow Intelligence, Swimlane, Process Variants, System Interaction. Each has a `title` tooltip (visible on hover) with a one-sentence description.

Gaps:
- The tooltip is the only explanation. There is no onboarding, no in-canvas orientation, and no "what this shows" heading on the canvas itself.
- "Flow Intelligence" is an internal product name. A process owner recognizes "flowchart" or "sequence diagram" but not "Flow Intelligence."
- "Process Variants" requires understanding that variants means different execution paths. A new user will not know this without the tooltip.
- "System Interaction" vs "Swimlane" are easy to confuse. Swimlane separates steps by system. System Interaction shows system-to-system topology. The distinction requires reading both tooltips and mentally mapping the difference.
- Process Variants loads differently from the other modes — it triggers a separate API call and shows a loading/forbidden/error state. The user sees a spinner where a diagram should be. There is no explanation of why Variants is different or what "unprocessed" means in the error state.

**Gap:** Mode labels and navigation do not communicate the cognitive job each mode serves.

### 2.3 Drill-Down and Evidence Access

The inspector panel (slides in from right when a node is clicked) shows:
- Step title and category
- "What This Step Does" (operational definition)
- SOP procedure inline (numbered lines from the SOP step detail)
- Duration, event count, confidence metrics
- Friction indicators
- Warnings (privacy notes)

This is substantive. The problem is discoverability:
- There is no visual affordance on nodes indicating they are clickable for detail. A user who does not try clicking a node will never find the inspector.
- The empty inspector state says "Select a step to inspect" but this message is not visible to a user who has not opened the inspector.
- No nodes show a "details available" indicator (e.g., a small info icon, a hover highlight that signals interactivity).

**Gap:** The inspector is the richest detail surface in the product and it is invisible to new users.

### 2.4 Empty, Sparse, and Single-Run States

- `WorkflowEmptyState` renders when `viewModel` is null. It says "No workflow data available" and suggests re-uploading. This is functional.
- `WorkflowErrorState` is functional.
- There is no "single-run provenance notice" on the canvas. `PM_FINAL_PLAN.md` specifies this as a P0 requirement: an amber banner above the diagram stating "Single recording — add more runs to unlock variant comparison, timing distributions, and statistical confidence." This is not yet implemented.
- The Workflow header shows `totalRuns` in the metadata type but does not render it in `WorkflowHeader.tsx`. The user cannot see how many runs the current view is based on.

**Gap:** Single-run vs multi-run state is invisible. The user does not know whether they are looking at 1 or 12 recordings. This understates the confidence of multi-run data and overstates single-run data.

### 2.5 Provenance — Does the User Know a Flow Map Is One Trace of Many?

No. The header shows confidence percentage and friction count but not run count. A 78% confidence score with "12 runs" underneath means something very different from 78% confidence with "1 run" underneath. The metadata type has `totalRuns` and `variantCount` fields, but `WorkflowHeader.tsx` does not render them.

The Insights strip at the bottom shows top-3 insights by severity but the strip is hidden when `toolbar.showInsights` is false (which is the default state shown in `DEFAULT_TOOLBAR` — wait, `showInsights: true` is the default). So the strip is shown. But insights do not reference run count, and their severity labels ("critical", "warning", "info") could easily be misread as errors in the data rather than signals about process behavior.

---

## 3. SOP Display Gaps

### 3.1 Is the SOP Usable as an Actual Operating Procedure?

The Execution SOP mode has the right structural bones:
- Quick Start card with trigger, prerequisites, systems, expected outcome — this is operator-facing and correct
- Numbered step cards with procedure text, decision blocks, expected outcomes, friction indicators, and automation hints
- Completion checklist (interactive checkboxes)
- Common issues section
- Decision Points summary section

What is missing or weak relative to a real operating procedure:

**1. No owner/role attribution per step.** The SOP type has `actor` and `roles` fields in the metadata, but individual steps do not surface who performs them. An SOP for a multi-person process where different people own different steps needs per-step role labels. The `SOPViewStep.actor` field exists but is not rendered in `ExecutionStepCard`.

**2. No screenshot or screen-capture evidence at the step level.** The inspector panel on the Workflow tab shows an event count ("N events, N user") per step, but the SOP does not link to or show the actual captured screen interactions for each step. Scribe and Tango embed screenshots per step — this is the core of their product. Ledgerium captures the events; it does not surface them as evidence in the SOP.

**3. Export is Markdown only.** The export button in SOPPageShell calls `/api/workflows/[id]/export-markdown`. Markdown is not a document format that an operator can hand to a manager or print for a workspace. The file downloads a `.md` file. No PDF, no Word, no human-readable print layout.

**4. The step rail (left navigation) is a 12px-wide strip of numbered circles.** On a 20-step SOP, the rail is useful for navigation, but the circles are too small to read at a glance. There is no progress indicator showing where you are in the procedure.

**5. The SOP header shows "SOP" badge and version but not the workflow title.** The workflow title is available in `workflowRecord.title` but the SOPHeader only shows the objective text. A user who has the SOP open in a shared link does not see the workflow name in the SOP header itself.

**6. The "Partial" completeness badge needs explanation.** The header shows "Complete" or "Partial" based on `metadata.isComplete`. When "Partial" is shown, the user does not know what is partial or why. There is no explanation of what a partial SOP means (e.g., "some steps lack instruction detail due to low-confidence observations").

### 3.2 Comparison with Scribe, Tango, and SweetProcess

**Scribe** generates a step-by-step guide from screen recording with a screenshot for every step. Its primary value is the screenshot — every instruction is anchored to exactly what the screen looked like. Export is PDF with screenshots embedded.

**Tango** is identical in concept to Scribe. Screenshot per step. Clean numbered format. Shareable public link.

**SweetProcess** is a formal SOP management tool. SOPs have titles, owners, departments, due dates, version history, and approval workflows. Steps have embedded files, notes, and sub-SOPs.

**Where Ledgerium's SOP is stronger:**
- Automated step discovery from captured behavior (Scribe/Tango require screen-capture-and-annotate, which is active work; Ledgerium discovers steps passively)
- Decision point detection and inline decision trees
- Friction indicators per step
- Automation hints per step
- Confidence scoring per step (Scribe/Tango have no quality signal)

**Where Ledgerium's SOP is weaker:**
- No screenshots at the step level (this is Scribe/Tango's entire differentiator)
- Export is Markdown, not PDF
- No editing of any step content
- No owner or role per step
- No version history or approval workflow
- No public shareable SOP link (there is a workflow share link, but it points to the full workflow detail page, not the SOP document)

**The decisive gap:** Scribe exports a PDF that looks like a training document a manager would hand to a new employee. Ledgerium exports a `.md` file that requires a developer to render. This is the single largest SOP quality gap relative to competitors.

### 3.3 SOP Modes — Visual and Intelligence

The three SOP modes (Execution, Visual Process, Intelligence) are a differentiated product design. No competitor structures their SOP this way. The modes are substantive:

- **Execution** is for the operator following the procedure in real time.
- **Visual Process** shows the structural, phase-grouped view with the "WorkflowDNA" dot strip, bottlenecks, and automation recommendations — this is for an analyst or manager reviewing the process.
- **Intelligence** is friction analysis and AI recommendations.

The gap: the mode labels are inside a compact pill switcher. There is no "choose this mode if you are..." guidance. First-time users will land on Execution, which is appropriate, but will not discover Visual or Intelligence without deliberately switching.

---

## 4. Single Most Important Improvement Per Surface

### 4.1 Workflow Display — Single Most Important Improvement

**Add run count and single-run provenance notice to the canvas header.**

The `WorkflowHeader` already has the data (`totalRuns` in `WorkflowMetadata`). Rendering it — "Based on 12 runs" or "1 run" — and showing the amber single-run banner transforms the user's understanding of what they are looking at. Currently every workflow looks equally authoritative. A 1-run workflow with 78% confidence looks identical to a 12-run workflow with 78% confidence. This destroys trust: the user cannot tell whether the map reflects a stable pattern or a single idiosyncratic observation.

This is the lowest-effort, highest-trust-impact change on the Workflow surface.

### 4.2 SOP Display — Single Most Important Improvement

**Add a one-click "Export as PDF" action that produces a printable document, not a Markdown file.**

The current export button downloads a `.md` file via the markdown export API route. A `.md` file is not shareable with non-technical stakeholders. A PDF with the workflow title, step-by-step procedure, decision points, and the "Generated from N observed runs" provenance footer is a deliverable that a process owner can print, email, and file. This closes the single biggest gap against Scribe and Tango.

The print CSS work is already planned in `PM_FINAL_PLAN.md` §4 P2-A. Trigger it with a dedicated "Export as PDF" button that calls `window.print()` pointing at a print-only SOP layout.

### 4.3 Map to SOP Linkage — Single Most Important Improvement

**Add a "View SOP" button on the Workflow tab that navigates to the SOP tab, and a "View on Map" action on each SOP step that navigates to the Workflow tab with that step's node highlighted.**

Currently these two surfaces are connected only by data — the inspector shows SOP procedure inline — but not by navigation. The user bouncing between diagram and procedure should be a designed flow, not a discovery. A "View SOP for this workflow" button on the Workflow tab (in the header or toolbar area) and a small "View on map" link at each SOP step (passing the step's ordinal as a URL param) would create a closed loop between the two surfaces.

---

## 5. Prioritized Improvement List (P0–P2)

Items are classified P0 (critical, blocks external sharing or creates trust failures), P1 (important, meaningfully improves the experience), P2 (polish and completeness). Items already planned in the existing finalize/ plan are marked with their phase tag.

### P0 — Critical

**P0-1. Run count + single-run provenance notice on the Workflow canvas header**
Surface `totalRuns` in `WorkflowHeader.tsx`. When `totalRuns === 1`, render an amber banner above the canvas: "Single recording — add more runs to unlock variant comparison, timing distributions, and statistical confidence." When `totalRuns > 1`, show "Based on N runs" in the header chip row.
Status: NOT in finalize/ plan. New gap.
Effort: Small (1 LOC in header + conditional banner).
Why P0: A user who shares a single-run workflow with a manager is presenting one trace as if it were a validated process pattern. This is a trust and honesty failure.

**P0-2. Map-to-SOP and SOP-to-Map navigation links**
Add a "View Procedure (SOP)" button on the Workflow tab toolbar or insights strip. Add a "View step N on map" link in each SOP step's expanded body that switches to the Workflow tab and pre-selects the corresponding node.
Status: NOT in finalize/ plan. New gap.
Effort: Small-medium (tab state management already exists in page.tsx).
Why P0: Without this, the two most valuable surfaces in the product — the process map and the operating procedure — are invisible to each other. Users who stay on one tab never discover the other.

**P0-3. Node click affordance on the canvas**
Add a visible hover state on task nodes indicating they are clickable (e.g., a subtle ring highlight, a small "details" icon visible on hover). The inspector is the richest detail surface in the product and it is currently invisible.
Status: NOT in finalize/ plan as explicit acceptance criterion. Related to P0-B visual token work.
Effort: Small (CSS hover state on WorkflowTaskNode).
Why P0: First-time users do not discover the inspector. The inspector renders SOP procedure inline per step — this is the most compelling evidence-linked detail in the product and it is hidden behind an undiscoverable click.

**P0-4. Honesty hardening + decisionProvenance (ALREADY PLANNED)**
`VISIO_ARCHITECTURE_REVIEW.md` Finding C-1: fabricated decision labels on diamond nodes via title-regex. `PM_FINAL_PLAN.md` §4 P0-A.
Status: PLANNED (P0-A).

**P0-5. Shared layout fallback + ShapeResolver (ALREADY PLANNED)**
Orthogonal connectors, shape vocabulary, MapTitleBar. `PM_FINAL_PLAN.md` §4 P0-A/P0-B.
Status: PLANNED (P0-A, P0-B).

### P1 — Important

**P1-1. Tab rename and description tooltips**
Rename "Workflow" tab to "Process Map" or "Map" to eliminate the tautology with the page title. Add brief tooltip or subtitle on each tab explaining what it contains: "Process Map — Visual diagram of observed steps," "SOP — Step-by-step operating procedure," "Report — Performance analysis and recommendations."
Status: NOT in finalize/ plan. New gap.
Effort: Trivial (copy change in page.tsx TABS array).
Why P1: First impressions matter. The current "Workflow / SOP / Report" tab bar communicates nothing. A renamed tab bar with descriptions converts a navigation bar into orientation.

**P1-2. Mode label and tooltip improvement**
Replace "Flow Intelligence" with "Flowchart" or "Process Flow" in the mode switcher label. Keep the current description as the tooltip but also surface it as a subtitle below the mode label when that mode is active.
Status: NOT in finalize/ plan. New gap.
Effort: Small (copy change in types.ts VIEW_MODE_LABELS + minor CSS).
Why P1: "Flow Intelligence" is an internal brand name. It conveys nothing to a process analyst.

**P1-3. SOP step role attribution**
Render the `SOPViewStep.actor` field in the `ExecutionStepCard` header row, alongside the system chip. Show as a small "Role: [actor]" badge when the actor is non-empty.
Status: NOT in finalize/ plan. New gap.
Effort: Small (1 line in ExecutionStepCard).
Why P1: An SOP for a multi-person process needs per-step role attribution. Without it, the SOP is a sequence of steps with no ownership model.

**P1-4. SOP export as PDF (print layout)**
Add an "Export as PDF" button that triggers `window.print()` with a print-only SOP layout. Hide all interactive chrome (mode switcher, toolbar, step rail), set white background, show workflow title prominently, render all steps expanded, include the provenance footer.
Status: PLANNED in substance (PM_FINAL_PLAN.md §4 P2-A for canvas; SOP-specific print CSS is not explicitly planned but is implied).
Effort: Medium (print CSS for SOP layout).
Why P1: Markdown export is not shareable with non-technical stakeholders. PDF closes the Scribe/Tango deliverable gap.

**P1-5. ELK layout integration for Flow, Swimlane, Systems (ALREADY PLANNED)**
`PM_FINAL_PLAN.md` §4 P1-A/P1-B.
Status: PLANNED (P1-A, P1-B).

**P1-6. Process Timeline view (ALREADY PLANNED)**
`PM_FINAL_PLAN.md` §4 P1-C. Duration bar chart per step with bottleneck markers.
Status: PLANNED (P1-C).

**P1-7. SIPOC Summary view (ALREADY PLANNED)**
`PM_FINAL_PLAN.md` §4 P1-D. Five-column document table.
Status: PLANNED (P1-D).

**P1-8. Cycle-time histogram (COMPETITIVE BENCHMARK recommendation)**
`COMPETITIVE_BENCHMARK.md` §3 recommends a Cycle-Time Distribution Histogram as the single highest-value new view, rated above the SIPOC. Histogram of run durations with p50/p85/p95 lines. Table-stakes in Celonis, UiPath, Disco, Signavio. Fully computable from existing `cycle_time_mean/median/stddev/p95` fields.
Status: Recommended in COMPETITIVE_BENCHMARK.md §3A but not scheduled in PM_FINAL_PLAN.md. The benchmark calls this P0 priority; the PM plan selected Timeline + SIPOC instead.
Effort: Medium (new view component, similar scope to Timeline view).
Why P1: This is the view that process-mining tool buyers look for first. It answers "how predictable is this process?" — a question the current four views do not answer.

### P2 — Polish and Completeness

**P2-1. Workflow header: render run count and variant count**
`WorkflowMetadata` has `totalRuns` and `variantCount`. Render both in the WorkflowHeader chip row alongside steps, duration, confidence.
Note: run count rendering in the header (chip row) is separate from the P0-1 single-run provenance banner. P0-1 is the warning state. P2-1 is the positive-state display ("12 runs, 3 variants").
Status: NOT in finalize/ plan explicitly. Related to P0-1.
Effort: Trivial.

**P2-2. SOP: "Based on N recordings" provenance in header**
The SOPHeader shows a "Partial/Complete" badge. Add a "Based on N recordings" sub-chip in the header metric row.
Status: NOT planned.
Effort: Trivial.

**P2-3. Print and export for all six views (ALREADY PLANNED)**
`PM_FINAL_PLAN.md` §4 P2-A.
Status: PLANNED (P2-A).

**P2-4. Loading/empty states for all six modes (ALREADY PLANNED)**
`PM_FINAL_PLAN.md` §4 P2-B.
Status: PLANNED (P2-B).

**P2-5. SOP: explain "Partial" completeness badge**
When `metadata.isComplete === false`, show a tooltip or inline note on the "Partial" badge explaining: "Some steps have low confidence scores — the procedure may be incomplete for those steps. Add more recordings to improve coverage."
Status: NOT planned.
Effort: Trivial.

**P2-6. BPMN 2.0 notation view (COMPETITIVE BENCHMARK recommendation, deferred)**
`COMPETITIVE_BENCHMARK.md` §3B recommends BPMN 2.0 as P1. `PM_FINAL_PLAN.md` §5 defers it to Future Roadmap with the honesty argument (gateway conditions cannot be observed, only frequencies). The benchmark's resolution — label gateways with observed frequencies only, not fabricated conditions — satisfies the honesty invariant.
Status: Deferred to Future Roadmap in finalize/ plan. Competitor parity with Scribe Optimize.
Effort: Large (new view type, BPMN XML export).

**P2-7. Report tab: "N insights found" counter on the tab itself**
When the Report has been loaded, show a count badge on the Report tab ("Report · 4") indicating how many insights or recommendations were found. This creates pull toward the Report tab.
Status: NOT planned.
Effort: Small (pass intelligence summary count up to page.tsx).

---

## 6. Open CEO Decisions

**Decision 1 (blocks P0-1): How should single-run provenance be communicated?**
Option A: Amber banner above canvas ("Single recording — this map reflects one observed run. Add more runs to validate."). This is visible but takes vertical space.
Option B: Inline chip in the WorkflowHeader: "1 run" in amber. Subtle but potentially overlooked.
Option C: Both — chip always shown, banner shown only on first visit to a single-run workflow.
PM recommendation: Option A for new users, Option B for returning users. Track whether the banner was dismissed per user session.
This also applies to the SOP tab: a single-run SOP should carry the same provenance notice.

**Decision 2 (blocks P1-1): What should the Workflow tab be renamed?**
Options: "Map" / "Process Map" / "Diagram" / "Process" / keep "Workflow."
PM recommendation: "Process Map" — it matches the internal terminology ("process_map" artifact type, `processMap` prop), is recognizable to operations professionals, and eliminates the page-name tautology.

**Decision 3 (blocks P1-8 scheduling): Cycle-time histogram vs Timeline view — which ships first?**
The competitive benchmark rates the cycle-time histogram as more recognizable to process-mining buyers than the per-step timeline bar chart. The PM plan selected Timeline + SIPOC. If Ledgerium is targeting process-mining tool buyers (Celonis/UiPath displacement), the histogram is the more strategically important view.
Decision: confirm whether the Timeline view (per-step duration bars) or the Cycle-time Histogram (distribution of total run durations) is higher priority. They are not the same thing and serve different analytical needs. Both are feasible with existing data.

**Decision 4 (informs P1-4 scope): SOP export format priority**
The current export produces Markdown. Options for expansion:
- (A) PDF via `window.print()` — no new dependency, works immediately, requires print CSS
- (B) PDF via server-side render (Puppeteer/React PDF) — cleaner output, new infrastructure dependency
- (C) Word (.docx) — enterprise stakeholder preference, requires new library
PM recommendation: (A) first, (B) as a follow-on if print quality is insufficient.

**Decision 5 (informs future SOP phase): Should the SOP be editable?**
Scribe and Tango allow users to edit step titles and add annotations. `PM_FINAL_PLAN.md` §5.1 defers editing to a future phase with a thorough analysis of the honesty and provenance implications.
This decision does not block any planned work but sets a product direction. If editing is a near-term priority (e.g., customer requests), the P0-A provenance hooks (`decisionProvenance` field) should be designed with user-authored annotations in mind from the start, per `PM_FINAL_PLAN.md` §5.1 "Architectural hooks."

**Decision 6 (from PM_FINAL_PLAN.md §6, preserved): Inferred validation decisions — diamond or task node?**
When a submit-to-error sequence is observed in a single run, should the divergence point render as a diamond (decision) or be demoted to a task node?
PM recommendation: keep as diamond with a distinct dashed-border amber visual treatment and a label reading "Validation gate" rather than a fabricated condition. This preserves signal without fabricating intent.

**Decision 7 (from PM_FINAL_PLAN.md §6, preserved): Flow direction — DOWN or RIGHT?**
PM recommendation: RIGHT for all modes. Consistency across modes reduces cognitive overhead when switching between map types.

---

## Appendix: Reconciliation Table

| Item | In finalize/ plan? | Phase | This document position |
|------|-------------------|-------|----------------------|
| Honesty hardening / decisionProvenance | Yes | P0-A | P0-4 |
| ShapeResolver + layout fallback | Yes | P0-A | P0-5 |
| Visual spec tokens (orthogonal connectors, shapes) | Yes | P0-B | P0-5 |
| ELK layout integration | Yes | P1-A/B | P1-5 |
| Process Timeline view | Yes | P1-C | P1-6 |
| SIPOC Summary view | Yes | P1-D | P1-7 |
| Print / export all modes | Yes | P2-A | P1-4 (SOP-specific), P2-3 |
| Loading / empty states per mode | Yes | P2-B | P2-4 |
| BPMN 2.0 view | Deferred (Future Roadmap) | — | P2-6 (deferred) |
| Run count / single-run provenance banner | NOT in plan | NEW P0 | P0-1 |
| Map-to-SOP navigation links | NOT in plan | NEW P0 | P0-2 |
| Node click affordance | NOT in plan | NEW P0 | P0-3 |
| Tab rename | NOT in plan | NEW P1 | P1-1 |
| Mode label improvement | NOT in plan | NEW P1 | P1-2 |
| SOP per-step role attribution | NOT in plan | NEW P1 | P1-3 |
| Cycle-time histogram | In benchmark (P0), not in PM plan | NEW P1 | P1-8 |
| Run count in header chip | NOT in plan | NEW P2 | P2-1 |
| SOP provenance chip | NOT in plan | NEW P2 | P2-2 |
| "Partial" SOP completeness explanation | NOT in plan | NEW P2 | P2-5 |
| Report tab insight count badge | NOT in plan | NEW P2 | P2-7 |
