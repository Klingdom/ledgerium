# UX SOP Benchmark — World-Class vs Ledgerium
**Date:** 2026-06-15
**Author:** UX Designer agent
**Scope:** Evaluation of `apps/web-app/src/components/sop-view/` against world-class SOP tools for the use case of a human executing a procedure. Read-only. No code changes.

---

## 1. Benchmark: Ledgerium vs World-Class SOP Tools

This section evaluates Ledgerium's execution-mode SOP against five world-class comparators across the information-design dimensions that matter most to an operator performing a real procedure.

### 1.1 Comparator Summary

| Dimension | Scribe | Tango | SweetProcess | Trainual | Whale | Ledgerium (current) |
|---|---|---|---|---|---|---|
| **One action per step** | Yes — each click = one step | Yes — one screenshot per interaction | Yes — structured authoring enforces it | Manual, depends on author | Manual | Weak — steps can contain multi-instruction `detailText` blocks; the collapsed header shows only a title, not the action |
| **System / app per step visible** | Yes — screenshot shows it implicitly | Yes — screenshot shows it | Manual field, shown in body | Manual field | URL-match shows it | Present in collapsed header as a small badge; **hidden on mobile** (`hidden md:block` in both `ExecutionStepCard` and `SmartStepCard`) |
| **Expected outcome per step** | Implicit from screenshot | Implicit from screenshot | Manual field | Manual field | Not standard | Present but buried: only visible when the step card is expanded; zero indication in collapsed state |
| **Screenshots per step** | Yes — core feature, annotated | Yes — core feature, editable | User can attach images | User can attach images | User can attach images | **Completely absent.** The source event IDs, page URLs, and page titles exist in the engine but are never displayed. |
| **Scannability (skim to find a step)** | Good — image-led; icons for navigation | Good — image-led | Text only; moderate | Text only; moderate | Text only; moderate | Moderate — numbered badges and color-coded category labels help; step titles are visible collapsed; but the system chip and outcome are hidden until expanded |
| **Do-mode (checkable while performing)** | No native checkboxes | No native checkboxes | Checkbox per step (manual) | Completion tracking via quiz | Completion tracking | Partially present: completion-criteria section has working checkboxes; individual steps have no "mark done" affordance |
| **Read-mode vs do-mode default** | Read (screenshot list, no expand/collapse) | Read (screenshot list) | Read | Read | Read | Execution mode pre-expands the first 5 steps, Visual mode collapses all. Neither is a clean do-mode default. An operator performing step 6 of a 12-step procedure sees no content by default. |
| **Progress indicator** | None | None | None | Lesson completion bar | None | None — no indicator of "how far through the procedure the operator is" |
| **Search within SOP** | Browser find (Ctrl+F) only | Browser find only | Browser find only | Full-text search | Browser find only | Browser find only — no in-SOP search |
| **Role / actor per step** | Not shown | Not shown | Manual field, shown | Organized by role | Not shown | Data exists (`SOPViewStep.actor`) but **never rendered** in any view mode |
| **Inputs needed per step** | Not shown | Not shown | Not shown | Not shown | Not shown | Data exists (`SOPViewStep.inputs`) but **never rendered** in any view mode |
| **Decision branches** | Not shown | Not shown | Not shown | Not shown | Not shown | **Strong** — decision blocks inline + summary section; Ledgerium differentiator |
| **Confidence / freshness signal** | Not applicable | Not applicable | Version + date | Last updated date | Last updated date | Present (confidence %) but unexplained and source-run-count not shown |
| **Export / offline access** | PDF with screenshots | PDF with screenshots | PDF | PDF | PDF | Markdown `.md` only — no PDF, no print stylesheet |
| **Share as SOP-only link** | Public Scribe link | Public Tango link | Yes | Yes | Yes | Only via full workflow share URL; no SOP-specific deep link |

### 1.2 Where Ledgerium Is Strong

**Decision-point detection and inline decision blocks.** No comparator surfaces branch logic at the step level. Ledgerium's amber-styled decision cards with condition → action pairs are genuinely best-in-class. SweetProcess allows decision branches via manual flowchart insertion; Ledgerium derives them automatically from observed behavior.

**Friction scoring.** No comparator identifies friction-prone steps from observed behavior. The per-step friction indicators and the friction summary in the header are an observable moat. An operator knows before starting which steps to pay attention to.

**Evidence-linked provenance.** Scribe and Tango capture screenshots mechanically but do not derive SOPs from multi-run statistical patterns. The confidence percentage and the "derived from N recordings" concept are genuinely differentiated. The gap is that this moat is currently invisible because the evidence is not surfaced in the reading experience.

**Completion criteria as an interactive checklist.** The `CompletionSection` with working checkboxes and the "All criteria met" confirmation state is better than anything in the five comparators, which offer no native completion-state affordance.

**Inline AI insights in execution mode.** The automation-hint callouts and intelligence recommendations embedded in the step cards have no direct equivalent in any comparator.

### 1.3 Where Ledgerium Is Weak

**Screenshots.** This is the most visible gap. Every step in Scribe and Tango has a screenshot. An operator reading a Ledgerium SOP has no visual anchor for "what does my screen look like right now?" The engine stores page URLs and page titles per instruction via `SOPInstruction.sourceEventId`. Even surfacing the page title and URL (not a full screenshot) per step would close a large part of this gap.

**Steps collapsed by default in the wrong mode.** In Execution mode, only the first 5 steps are pre-expanded (`SOPPageShell.initExpandedForMode`). An operator performing step 6 sees a collapsed header with no content. In Visual mode, all steps are collapsed (`new Set<string>()`). This is the wrong default for a document intended to guide execution. Every world-class comparator shows full step content by default — the operator scrolls rather than clicks to reveal.

**System chip hidden on mobile.** The system chip is the single most important piece of orientation for an operator — "which application am I in right now?" — and it is hidden on screens smaller than `md` breakpoint in both `ExecutionStepCard` (line 290) and `SmartStepCard` (line 229). Mobile is exactly the context where an operator is most likely to be following the SOP while performing the procedure on a second screen. This is backwards.

**No progress indicator.** An operator performing a 12-step procedure has no sense of "I am on step 5 of 12." The step rail on the left shows numbered buttons, but there is no progress bar, no "N of M steps complete" label, and no step-level checkboxes to mark done.

**"Ask This Process" reads as broken.** The `AskThisProcessPanel` renders a live-looking text input that is disabled (`disabled`, `cursor-not-allowed`) with suggested prompts that are also disabled. The label says "Beta." To a first-time operator this looks like a product defect, not a roadmap feature. Scribe and Tango do not have this problem because they do not ship partially-built interactive panels.

---

## 2. The Single Biggest Execution-Friction Issues

These are ranked by impact on an operator actually trying to perform the procedure. Each is traced to the specific component that causes it.

### 2.1 Steps collapsed by default — the operator must click before reading

**Severity: Critical for task success.**

`SOPPageShell.initExpandedForMode` pre-expands only the first 5 steps in execution mode and 0 steps in visual mode. The instruction content (`step.detailText`, `step.expectedOutcome`, warnings) is only visible when a step is expanded. An operator performing step 7 must click to expand it before they can read what to do.

World-class comparators show all content by default and let the user scroll. The expand/collapse mechanism is suited to reference browsing, not task execution.

The correct default for execution mode is all steps expanded, with each step visually separated by whitespace so they feel sequential rather than accumulated. The collapse affordance should exist for users who want a compact overview, not as the default state.

### 2.2 System chip hidden on mobile — operator has no app orientation signal

**Severity: High on mobile and tablet.**

`step.system` is the answer to "which application do I need to have open right now?" In `ExecutionStepCard`, this chip has `hidden md:block` — it is invisible on screens below approximately 768px. In `SmartStepCard`, same pattern. The step rail on the left is also hidden below `sm` breakpoint.

An operator on a phone or tablet following a procedure has no visible cue about which app each step belongs to. The system name should be the first visible piece of information in the collapsed step header, not hidden.

### 2.3 No screenshots — operator cannot verify they are in the right place

**Severity: High for first-time execution of an unfamiliar process.**

Every Scribe and Tango SOP shows a screenshot of the UI at the moment of each action. An operator who has never done the process before uses the screenshot to confirm they are looking at the right screen before acting. Without it, the text instruction "Click the Create Opportunity button" is ambiguous if the operator is not familiar with the CRM layout.

Ledgerium's engine stores page URLs and page titles per instruction (`SOPInstruction.system`, and transitively through `sourceEventId` to `CanonicalEventInput.page_context`). Even displaying the page title and URL (without a screenshot image) per step would give the operator an orientation anchor.

### 2.4 Roles / actor per step never shown — operators cannot tell who does what

**Severity: Medium for single-operator procedures; High for hand-off processes.**

`SOPViewStep.actor` and `SOPViewStep.hasSensitiveData` are populated from the engine but are not rendered in any view. The header shows a count chip ("2 roles") but not the role names. A multi-person procedure is unusable without knowing which steps belong to which role.

### 2.5 Step-level inputs never shown — operator cannot prepare

**Severity: Medium.**

`SOPViewStep.inputs` is populated by the engine (derived from form-field events, sensitive data labels) but is not rendered. An operator starting step 4 has no indication that they need to have the "Account ID" and "Opportunity Amount" ready before proceeding. Preparation-time information is most valuable at step-entry, not after the fact.

### 2.6 "Ask This Process" disabled panel reads as a broken feature

**Severity: Medium for trust; Low for task completion.**

`AskThisProcessPanel` renders a full interactive panel UI with a `<input disabled>` and six `<button disabled>` prompt chips labeled "Beta." The `cursor-not-allowed` cursor on every element signals malfunction to users who encounter it mid-task. This is the one place in the SOP that looks unfinished. The panel occupies a significant portion of the Intelligence mode layout (the entire right column at `w-80` on large screens) despite delivering nothing.

### 2.7 No run-count disclosure — single-run SOP presented as validated procedure

**Severity: High for distribution trust.**

The SOP is generated from however many recordings exist. When N=1 (a common initial state), the SOP is a hypothesis derived from a single observation. The header shows a confidence percentage and a Complete/Partial badge but no "Based on 1 recording" disclosure. An operator distributing this SOP to a team has no signal that it may not represent validated practice.

### 2.8 Scope statement exists in the data model but is never rendered

**Severity: Medium.**

`SOP.scope` is generated and stored as `SOPMetadata.scope`. It defines which roles, systems, and conditions the procedure covers. It is populated in the engine but has no display slot in any of the three view modes. An operator reading the SOP cannot determine whether this procedure applies to their situation.

---

## 3. The "Living SOP" UX: Surfacing Alignment and Drift

This section describes how to surface the computable freshness and drift signals as trust indicators on the SOP without adding clutter.

### 3.1 What signals are computable

Ledgerium has, or will have, the following process signals that bear directly on SOP freshness:

- **Run count** — how many recordings this SOP was derived from. Available on `workflowRecord` passed to `SOPPageShell`.
- **Confidence score** — how consistently the step sequence was observed. Present on `metadata.confidence`.
- **Documentation drift** — whether recent runs have deviated from the SOP's standard path. `SOPAlignment.documentationDrift` is referenced in the engine type definitions.
- **Last recording date** — when the most recent recording was taken. Available on `workflowRecord.createdAt`.
- **Step-level confidence** — whether individual steps were consistently observed. `SOPViewStep.confidence` is per-step.
- **Variant count** — how many distinct execution paths were observed. Available via `metadata` indirectly.

### 3.2 Where to surface these signals

**In the SOP header — a single freshness pill.**

Replace the current "Complete / Partial" badge with a freshness pill that combines run count and drift status:

- Green: "Aligned · 20 runs · last recorded 14d ago"
- Amber: "Drifting · step 4 changed in recent runs · 20 runs"
- Red: "Outdated · last recorded 180d ago · 3 runs"

This occupies the same space as the current Complete/Partial badge but carries computable information rather than a structural completeness signal. The Complete/Partial badge can be moved inside the Quick Start section where it has more context.

**Per-step alignment indicator in the collapsed header.**

The confidence dot (`ConfidenceDot`) in `ExecutionStepCard` already encodes per-step confidence as a small colored circle. Extend this to also encode drift:

- Solid dot: step is consistent with recent runs (existing behavior).
- Dashed-ring dot: step has drifted — recent runs show a different action at this position.
- No dot: single recording; insufficient data to assess.

Add a legend in the Quick Start section: "● Consistent with recent runs ○ Drifted in recent runs". This is a small addition to an existing visual element, not a new piece of chrome.

**A "step drifted" inline callout inside the expanded step card.**

When documentation drift is detected for a specific step, add an amber callout inside the expanded body (same pattern as the friction indicator):

> "Step drifted — recent runs show this action changed. Review before distributing."

This is a targeted signal on the step that warrants attention, not a global warning that blankets the entire SOP.

**A "freshness summary" row in the Quick Start card.**

In the Quick Start card (already the orientation section), add a single summary row:

> "Aligned with the last 20 runs · step 4 drifted · last recorded 2026-05-28"

This is one line of text that combines run count, drift status, and recency. It answers the stakeholder question "is this SOP still current?" without requiring them to interpret the confidence score.

### 3.3 What to avoid

Do not show a drift signal on every step that has any confidence variation — that would produce noise. Show it only when the drift is statistically significant (e.g., more than 20% of recent runs diverged from the SOP step) and only when multiple runs exist to compare against.

Do not introduce a separate "Freshness" tab or section. The trust signal belongs in the header and in the Quick Start card — the two places a stakeholder reads before deciding whether to distribute the SOP.

Do not use the word "drift" in the public-facing copy without explaining it. Use "changed in recent runs" or "updated since last SOP generation" for operator-facing labels. Reserve "drift" for internal developer terminology.

---

## 4. Print / PDF + Export UX

### 4.1 Current state

The `SOPPageShell` has:
- A `Download` icon and "Export" button wired to a markdown `.md` download via `/api/workflows/{id}/export-markdown`.
- A `Printer` icon imported from `lucide-react` but not wired to any handler.
- An `alert()` for export errors — a browser default that cannot be styled.

There is no `@media print` CSS. There is no PDF export. The Export button label says only "Export," which does not communicate format.

### 4.2 The stakeholder/training deliverable problem

The SOP's primary distribution scenario is a manager or process owner sharing it with a team. The recipients are:

1. **Operators performing the procedure** — need a printable checklist or a mobile-friendly page.
2. **Managers approving the procedure** — need a signed-off document they can attach to a training record.
3. **Auditors** — need evidence that a procedure exists and was derived from observed behavior.
4. **New hires** — need onboarding materials that can be included in an LMS or handbook.

A `.md` file serves none of these recipients without further conversion. The current Export flow is functionally incomplete for every distribution scenario.

### 4.3 Recommended export UX

**Clarify the existing export button.** Rename "Export" to "Export Markdown" or add a format tag so users know what they will receive.

**Wire the Printer button.** The `Printer` icon is already imported but unused. Wire it to `window.print()`. Label it "Print / Save PDF." This is zero-dependency — every browser can print-to-PDF. The PDF output quality depends entirely on having a print stylesheet.

**Write a print stylesheet.** The `@media print` rules needed are:
- Hide everything outside the SOP content: no step rail, no mode switcher, no header controls, no export buttons, no navigation.
- Force all step cards to their expanded state (the collapsed toggle state is client-side state, so the print CSS needs `display: block !important` on the expanded body div or a print-specific class applied on the container before printing).
- Apply print-safe font sizes: body at 11pt, step titles at 12pt, section headings at 10pt uppercase.
- Include the step title in the expanded body so each printed step is self-contained.
- Print page breaks before major sections (after Quick Start, before Completion Criteria).
- Include the provenance footer on every printed page via CSS `position: running(footer)` or a repeated footer div.

**Export to PDF via a server route (future).** The markdown-to-PDF pipeline is a future iteration, but the UX groundwork is: a "Download PDF" button next to "Export Markdown" that calls a `/api/workflows/{id}/export-pdf` route. The Chromium-based backend can render the SOP page and produce a PDF that includes all content. This is the format Scribe and Tango compete on.

**The export label should communicate the data basis.** A distributed PDF should include on the cover or header: "Generated by Ledgerium AI · Derived from [N] recording(s) · Confidence: [X]% · Generated: [date]". This is the evidence claim that differentiates Ledgerium's SOP from a manually authored one, and it is absent from the current markdown export.

### 4.4 "SOP-only" share link

Currently the Share button on the workflow detail page creates a share token for the full workflow view. There is no SOP-specific share link.

The recommended UX is a "Share SOP" button in the `SOPPageShell` toolbar that:
1. Calls the existing share token creation route.
2. Appends `?view=sop` to the shared URL, which the shared workflow detail page reads to default the active tab to the SOP view.
3. Copies the resulting URL to the clipboard with a "Link copied" toast confirmation.

This does not require new backend infrastructure — it is a frontend routing convention on top of the existing share token mechanism.

---

## 5. SOP ↔ Process Map ↔ Report Linkage

The three views of one process are currently unlinked tabs on the workflow detail page. The user has no cue that they represent the same underlying data.

### 5.1 The structural linkage that already exists

- **SOP step IDs** match process map node IDs — both are derived from `DerivedStepInput.ordinal`.
- **SOP step ordinals** match process map node ordinals — both colored using `CATEGORY_CONFIG`.
- **Step anchor IDs** already exist in the SOP DOM: `id="sop-step-{step.id}"` on every `ExecutionStepCard`, `VisualStepCard`, and `SmartStepCard`.
- **The Visual mode** already embeds a miniature process flow diagram (the DNA dot sequence in `ProcessFlowMap`).

The linkage infrastructure is present. What is missing is navigation.

### 5.2 The cross-navigation interaction pattern

**From the SOP to the process map:**

In each expanded step card, below the expected outcome row, add a small link:

> → View step [N] in process map

This link switches the active tab to "Workflow" (the process map) and programmatically scrolls the map to the corresponding node. The tab switch can be triggered by a callback from `SOPPageShell` to the parent tab container. The step ID is the bridge.

**From the process map to the SOP:**

In the process map node detail panel (or tooltip), add:

> → View step [N] in SOP

This link switches the active tab to "SOP" and programmatically scrolls to `#sop-step-{id}`. The step ID is already in `ProcessMapNode.stepId`.

**From the SOP to the report:**

The provenance footer in all three SOP mode components renders `viewModel.metadata.sourceNote` as a static text string. Replace this footer with:

> Generated by Ledgerium AI from [N] recording(s). [View backing evidence →]

"View backing evidence →" switches the active tab to "Report." This makes the evidence claim actionable.

### 5.3 The "two views of one process" framing

Add a one-line contextual note at the top of the SOP tab and the Workflow (process map) tab. This is copy, not a new component:

> "This SOP and the process map describe the same recorded workflow. Step numbers are identical in both views."

This prevents users from treating the SOP and the map as different or contradictory documents. It eliminates a class of support questions.

### 5.4 Visual consistency between views

Both the SOP step ordinal badges and the process map nodes use color coding from `CATEGORY_CONFIG`. Make this correspondence explicit in the Visual mode's `ProcessFlowMap` legend: show the category color swatches with labels ("Navigation," "Form entry," "Decision") and note that these colors match the process map. The user can then visually cross-reference the two views by color.

### 5.5 The three-view mental model

The three views serve three distinct reader types, and the mode switcher names currently do not communicate this:

| Current label | Who it's for | Recommended rename |
|---|---|---|
| Execution SOP | Operator performing the procedure | "Do It" or keep "Execution SOP" |
| Visual Process | Manager or analyst reviewing the structure | "Process Map" (or "Flow View") |
| Intelligence | Process owner or automation team | "Analysis" |

Renaming is a minor copy change with a real comprehension benefit. An operator looking for "how to do this" should not have to choose between "Execution SOP" and "Visual Process" without understanding the difference.

---

## 6. The 8–12 Highest-Impact UX Moves, P0 to P2

These are ordered by the severity of the usability problem they fix, not by implementation effort. Each maps to specific components.

### P0 — Required for the SOP to be credible as an execution document

---

**Move 1: Default all steps to expanded in execution mode.**

Component: `SOPPageShell.initExpandedForMode`.

Currently returns `new Set(steps.slice(0, 5).map(s => s.id))` for execution mode. Change to return `new Set(steps.map(s => s.id))`. All steps expanded is the universal default in every comparator. The operator is following a procedure; they need to see the content of every step, not hunt for it. The "Collapse all" button in the controls row handles users who want a compact overview.

Impact: eliminates the most common execution-friction case — the operator reaching a step with no visible content.

---

**Move 2: Move system chip to always-visible position; remove `hidden md:block`.**

Components: `ExecutionStepCard` (line 290), `SmartStepCard` (line 229), `VisualStepCard` (line 366, has `hidden sm:block`).

The system name answers "which app am I in right now?" This is orientation-critical. Remove the `hidden md:block` class. If space is tight at narrow widths, relocate the chip from the right side of the collapsed header to directly beneath the step title (still inside the collapsed button). The step title row has `flex-wrap`, so the chip can wrap to a second line on small screens rather than disappear.

Impact: closes the mobile orientation gap; makes system context visible in all viewports.

---

**Move 3: Add run-count disclosure to the SOP header.**

Component: `SOPHeader`.

Add a small line beneath the confidence chip: "Based on [N] recording(s)." When N=1, add "(Single recording — review before distributing)" in amber. `workflowRecord` is passed to `SOPPageShell` and contains this count or can derive it. The `qualityAdvisory` advisory banner already exists for this purpose but fires further down the page in execution mode and is invisible in visual/intelligence modes.

Impact: closes the honesty gap in single-run SOPs; makes the evidence basis visible to the reader at first glance.

---

**Move 4: Replace "Ask This Process" disabled panel with an honest coming-soon tile.**

Component: `AskThisProcessPanel` in `SOPIntelligenceMode`.

Remove the `<input disabled>` field and the six `<button disabled>` prompt chips. Replace with a static tile:

- Icon: `MessageSquare` or `Brain`
- Heading: "AI Q&A for this process"
- Body: "Ask questions about any step, decision, or edge case — coming in an upcoming release."
- No interactive elements.

This matches the established pattern used in `PresetChipRail.tsx` ("Coming in an upcoming release") and removes the appearance of a broken feature. The `w-80` right panel continues to exist; it simply communicates honest intent.

Impact: removes the single most trust-damaging element in the SOP experience. An operator encountering a disabled input mid-task loses confidence in the product.

---

**Move 5: Display page-title / URL evidence per step.**

Components: `ExecutionStepCard` expanded body, `VisualStepCard` expanded body.

Inside each expanded step card, add a one-line "Where this happens" row:

> In [Application] · [Page title or URL]

`SOPViewInstruction.system` is already populated. If `page_context.pageTitle` is available from the source event, use it. If only the URL is available, display a truncated monospace URL. This is not a screenshot — it is a text reference — but it gives the operator a verifiable anchor for "am I in the right place?" It also makes the evidence linkage visible without adding visual complexity.

Impact: partially closes the screenshot gap; makes Ledgerium's evidence-linkage moat visible to the operator.

---

### P1 — Material quality improvement; should ship before SOP distribution is promoted

---

**Move 6: Show actor / role in the expanded step card.**

Component: `ExecutionStepCard` expanded body.

`SOPViewStep.actor` is populated by the engine but never rendered. Add a "Performed by: [actor]" label as the first row in the expanded step body, using the `Users` icon. When `actor` is empty or "Unknown," omit the row rather than showing a blank.

Impact: makes multi-role procedures usable; satisfies the most basic distributable work-instruction requirement.

---

**Move 7: Show step-level inputs in the expanded step card.**

Component: `ExecutionStepCard` expanded body.

`SOPViewStep.inputs` is populated by the engine but never rendered. When non-empty, add an "Inputs needed" row with the inputs as small chips (same visual language as `systemsNeeded` chips in the Quick Start card). Position this row before the instruction detail text, so the operator sees what they need before reading what to do.

Impact: enables operators to prepare per-step; reduces mid-step interruptions when data is not at hand.

---

**Move 8: Wire the Printer button; write a print stylesheet.**

Components: `SOPPageShell` (Printer button, currently imported but not wired), global CSS.

Wire the existing `Printer` icon button to `window.print()`. Add an `@media print` stylesheet that: collapses the navigation chrome (step rail, mode switcher, export controls), forces all `ExecutionStepCard` expanded bodies to display, applies print-legible font sizing, and includes the provenance footer on each page. The print stylesheet makes the existing SOP layout produce a usable printed checklist without any backend work.

Impact: enables the single most common stakeholder action — distributing the SOP to team members without requiring them to have a Ledgerium account.

---

**Move 9: Render the scope statement in the Quick Start card.**

Component: `QuickStartSection` in `SOPExecutionMode`.

`viewModel.metadata.scope` is populated but has no display slot. Add it as a collapsible row in the Quick Start card, positioned after "When To Use" and before "Before You Begin." Label it "Scope." One sentence is sufficient: "Covers steps performed in [systems] by [roles] from [start event] to [end state]."

Impact: closes an honesty gap — operators can determine whether this procedure applies to them before starting.

---

### P2 — Polish and comprehension improvements; addressable in a subsequent iteration

---

**Move 10: Add a step-progress indicator.**

Component: `SOPPageShell`, positioned in the controls row or the step rail.

A "3 of 12 steps expanded" label next to the Expand/Collapse all button gives the operator a minimal sense of procedure progress. This is not a tracking system — it reflects expanded state as a proxy for progress. A more accurate version would count step-level completion checkboxes when those exist (see Move 11).

A second variant: add a thin green progress bar at the top of the content area that advances as the operator expands steps sequentially. This is a purely visual cue with no state overhead.

---

**Move 11: Add "Mark as done" per step in execution mode.**

Component: `ExecutionStepCard`.

Add a checkbox to the left of the ordinal badge in the collapsed step header. Checking it marks the step done (local state only — no persistence required). Checked steps show a strikethrough title and a muted ordinal badge. This is the "do-mode" affordance that every serious training and SOP tool provides. It is additive to the existing expand/collapse state.

Impact: transforms execution mode from a read-only document into an interactive procedure guide; enables operators to track their position in a multi-step process.

---

**Move 12: Rename the mode labels for reader-type clarity.**

Component: `SOPModeSwitcher`, `types.ts` (`SOP_MODE_LABELS`).

Current labels "Execution SOP / Visual Process / Intelligence" are internally meaningful but not self-evident to a first-time reader. Recommended:

- "Execution SOP" → keep or shorten to "Do It" if brevity is preferred; current label is acceptable.
- "Visual Process" → "Flow View" (communicates what the user sees, not what the view is for).
- "Intelligence" → "Analysis" (clearer; "Intelligence" sounds like a product tier, not a view mode).

Update `SOP_MODE_LABELS` in `types.ts` and the tooltip descriptions to match. "Step-by-step guide for performing this procedure" / "Process flow grouped by system" / "Friction, automation, and optimization analysis."

Impact: reduces the cognitive load of choosing between modes; removes one ambiguous label that reads as a premium tier name.

---

## Delivery note: Honesty constraints on all moves above

The following observed-only principles must be respected when implementing any of the above moves:

**Single-run disclosure (Move 3):** When N=1, the SOP represents one person's single execution. The header must say so. The confidence score must not imply multi-run validation when only one run exists. Do not invent a "confidence" number from one data point and present it as a percentage without disclosing the source.

**Expected outcomes (Move 5):** When surfacing per-step evidence, distinguish between inferred outcomes (derived from step category and event patterns) and confirmed outcomes (a navigation or system-state event that corroborated success). The green checkmark icon currently implies verification. When the outcome is inferred from pattern rather than observed from a confirmation event, replace the checkmark with an inference icon (e.g., `Lightbulb` or `Info`) and label it "Likely: [outcome]" rather than "Expected: [outcome]."

**"Ask This Process" (Move 4):** Do not ship an interactive-looking panel for a feature that does not function. The current panel with a disabled input is less honest than no panel at all. The coming-soon tile communicates intent without implying availability.

**Scope statement (Move 9):** `metadata.scope` is generated by `generateScope()` from the activity name and detected systems. It is an inference, not a human-reviewed definition. Label it "Observed scope" or "Derived scope" rather than "Scope" to distinguish it from a manually reviewed scope statement.

---

*All findings in this document are based on direct source reading of the shipped components. No implementation has been proposed or performed. All component references are traceable to the source files in `apps/web-app/src/components/sop-view/`.*
