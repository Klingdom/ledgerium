# SOP Display Review
**Date:** 2026-06-12
**Reviewer:** Docs Engineer (expert SOP/work-instruction lens)
**Scope:** Read-only review of `apps/web-app/src/components/sop-view/` + `packages/process-engine/src/sopBuilder.ts` + `packages/process-engine/src/types.ts` + the workflow detail page at `apps/web-app/src/app/(app)/workflows/[id]/page.tsx`

---

## 1. Against the Standard Checklist for a Usable Work Instruction

The table below maps each canonical work-instruction element to what Ledgerium currently ships, rated Present / Weak / Missing.

| Element | Standard requirement | Ledgerium status | Evidence |
|---|---|---|---|
| **Title** | Verb-led, unambiguous, ≤10 words | Weak | `SOPHeader` renders `metadata.title` which equals `sessionJson.activityName` (the free-text name the user typed at recording time). No normalization enforced. Title never appears in the body of the SOP itself — once a user scrolls past the header the document is untitled. |
| **Objective / purpose** | One sentence: what is achieved when done | Present | `metadata.objective` (Quick Start "What This Does" + header sub-line). Derived by `inferBusinessObjective` from the activity name and step pattern. |
| **Trigger / when to use** | Who initiates, under what condition | Present | `quickStart.whenToUseIt` (Quick Start card "When To Use"). Also stored as `SOP.trigger`. |
| **Scope statement** | What is in/out, what systems and roles this covers | Weak | `SOP.scope` is generated but is **never rendered** in any of the three view modes (Execution, Visual, Intelligence). It exists in the data model but has no display slot. |
| **Estimated time** | Total and per-step | Weak — total only | Top-level `estimatedTime` is shown in the header and Quick Start card. Per-step `durationLabel` is shown in the collapsed step header, but only as a tiny label beside the chevron — a performing operator has no "time budget" view per step. |
| **Prerequisites / "Before you begin"** | Concrete items the operator must have ready | Present | `quickStart.prerequisites` are rendered in the Quick Start card. `SOP.prerequisites` feeds this. |
| **Role / actor per step** | Who performs this step | Weak | `SOPViewStep.actor` and `SOPStep.actor` exist in the type model. The actor is derived from inferred roles. However, **no actor label appears in any rendered step card** in any view mode. The header shows a role count chip but not the role names themselves. |
| **Numbered steps, one action each** | Sequential, imperative, atomic | Weak | Steps are numbered (ordinal badges). The step `title` is in imperative voice (cleaned by `cleanStepTitle`). However, within an expanded step the `detailText` renders multiple sub-instructions as a newline-separated list — this is correct — but the collapsed header shows only the step title, not the primary action. The `step.action` field (a concise verb phrase) exists but is only shown as a subtitle when it differs from the title, and only in the collapsed header — it disappears in the expanded body. |
| **System / application per step** | Which tool/screen at this step | Present | `step.system` shown in collapsed header as a small badge (hidden on mobile with `hidden md:block`). Shown again in expanded Visual mode. |
| **Expected outcome per step** | What does "done" look like for this step | Present | `step.expectedOutcome` rendered with a green checkmark inside the expanded card. Not visible in collapsed state, so the operator must expand every step to see it. |
| **Screenshots / evidence per step** | Visual confirmation of the UI state | Missing | **No screenshots or screen captures are displayed anywhere in the SOP.** The engine has full event-level traceability (`SOPInstruction.sourceEventId` → `CanonicalEventInput` with `page_context.url`, `page_context.pageTitle`, `page_context.routeTemplate`). The source event IDs are stored but the page screenshot or even the page URL is never surfaced in the SOP view. |
| **Inputs / data needed** | What values must the operator have | Weak | `SOPStep.inputs` exists and feeds `SOPViewModel`. The Quick Start card renders `prerequisites` (system-level). Step-level inputs are **not rendered** in any view mode — the field is populated in the engine but has no display slot in `ExecutionStepCard` or `VisualStepCard`. |
| **Warnings / cautions per step** | Risks, sensitive data, gotchas | Present | `step.warnings` rendered inside expanded step with a Shield icon. A sensitive-data warning fires when `definition.hasSensitiveEvents`. |
| **Decision points / branches** | If X → do Y | Present | Decision blocks inline in expanded step (`ExecutionStepCard`). Summary section with all decisions listed. `SOPViewDecision` rendered clearly with amber styling. |
| **Common issues / troubleshooting** | What goes wrong, how to recover | Present | `viewModel.issues` and `viewModel.commonMistakes` both rendered. `SOP.commonIssues` feeds this. |
| **Completion criteria / checklist** | How the operator knows the process is done | Present — interactive | Interactive checkboxes in `CompletionSection` with "All criteria met" confirmation. Good. |
| **Friction / bottleneck indicators** | Observed pain points | Present | Friction indicators shown per step and in a summary section. Good Ledgerium differentiator. |
| **Version / date** | Enables knowing if the SOP is current | Weak | `metadata.version` shows "v{version}" in the header. The version is always "2.0" (engine schema version, not a human revision number). `metadata.createdAt` exists in the type but is **not rendered** — there is no "generated on" date visible to the operator. |
| **Print / export** | Operator can take the SOP offline or share with non-Ledgerium users | Partial | Export button in `SOPPageShell` produces a Markdown `.md` file via `renderSOPMarkdown`. There is no print stylesheet (no `@media print` CSS). No PDF export. The existing JSON export in `page.tsx` (`handleExport('sop')`) exports raw JSON, not a human-readable format. |
| **Sharing** | Link-based sharing for non-admin staff | Partial | The workflow-level Share button in `page.tsx` creates a share token. However, the shared URL goes to the full workflow detail view — there is no dedicated "SOP-only" share URL. |

### Summary of the checklist audit

**Present and working:** objective/purpose, trigger/when-to-use, prerequisites, numbered steps, system-per-step, expected outcomes per step, warnings, decisions, common issues, completion criteria, friction signals.

**Weak or partially missing:** title persistence below the header fold, scope statement (data exists, not rendered), time budget per step (tiny label only), role/actor per step (data exists, not rendered), step-level inputs (data exists, not rendered), version date visible to operator, print support.

**Completely absent:** screenshots or any visual evidence per step. This is the single most significant gap against best-in-class SOP tools and against Ledgerium's own evidence-linked positioning.

---

## 2. Benchmark: Best-in-Class SOP Tools

### Scribe

Scribe auto-generates step screenshots from a captured screen recording, one screenshot per click or keystroke. Every step card in a Scribe SOP shows the actual screen state at the moment of the action, with an arrow or highlight overlay on the clicked element. The operator can see exactly what the screen looked like before and after each action. Scribe's export produces a PDF with embedded screenshots, shareable as a public link or embedded in Confluence/Notion.

What Ledgerium should match: screenshot evidence per step, element highlight overlay, PDF export.

What Ledgerium has that Scribe does not: multi-run variance analysis, friction scoring, decision-point detection, confidence scoring, process map integration. These are genuine differentiators — Scribe SOPs are flat lists with no analytical layer.

### Tango

Tango similarly captures one screenshot per interaction. Tango's editing UI lets operators crop, blur, or add callout boxes to each screenshot before publishing. Steps can be reordered and edited. Tango exports to PDF, shares via a public Tango URL, or embeds as an iframe. Tango does not have analytics or friction analysis.

What Ledgerium should match: in-app screenshot editing (out of scope for this review cycle), but at minimum displaying the captured page URL or page title per step so the operator can orient themselves.

### SweetProcess

SweetProcess is a structured SOP authoring tool (not auto-capture). SOPs have explicit title, objective, procedure steps, and a "Who does this" role field per step. Each step can have attached images, videos, and checklists. SweetProcess has version history with date-stamped revisions. Team members can comment on steps.

What Ledgerium should match: date-stamped version, role per step visible in the SOP body, step-level image slot (even if it starts as a static page-title reference).

### Trainual

Trainual is a structured knowledge-base tool. SOPs are organized by role, then by topic. Each procedure can specify which role it applies to. Trainual does not auto-capture; content is manually authored. Trainual exports to PDF and has a print view.

What Ledgerium should match: role-to-procedure linkage surfaced to the reader, print/PDF.

### Whale

Whale is similar to Trainual. It adds a browser extension that shows the relevant SOP in a sidebar when the employee is on a specific URL (context-aware SOP delivery). Whale links each SOP to a specific system or URL pattern.

What Ledgerium should match: the system/URL context linkage is already partially present in Ledgerium's `step.system` field. Whale's context-aware delivery concept (showing the right SOP when on the right app) aligns perfectly with Ledgerium's `page_context.applicationLabel` data. This is a future product idea, not a display improvement, but it is worth noting.

### Our differentiator: evidence-linked + deterministic

None of the above tools can state that their SOPs were derived from observed real behavior with a measurable confidence score. None surface friction or variance. None distinguish the standard path from observed deviation patterns. This is Ledgerium's moat.

The display review finding is that the moat is partially invisible: the evidence that generated each step (source event IDs, page URLs, page titles, timestamps) is stored in the engine but not surfaced in the UI. A user reading the SOP has no way to verify "this step was observed 12 times on the CRM screen at this URL" without leaving the SOP view. Surfacing even a minimal provenance line per step ("observed 5 times in Salesforce · last seen 2026-05-14") would make the moat visible.

---

## 3. Honesty Assessment: Where the SOP Could Imply More Than Was Observed

This section flags places where the current SOP display may overstate certainty or capability, in conflict with Ledgerium's audit-honesty principle.

**3.1 Single-run SOPs presented without a run-count disclosure**

The SOP is generated from a single recorded session. The `qualityAdvisory` field in `SOPViewModel` exists and is rendered as an `AdvisoryBanner` when populated. However, when only one recording exists, the advisory may not fire and the SOP is presented as if it represents a validated procedure. A one-recording SOP is a hypothesis, not a standard. The Quick Start card and header give no indication of how many runs this SOP was derived from.

Recommendation: Display the run count ("Based on 1 recording") in the header alongside the confidence chip, always — not only when the advisory fires. When N=1, the confidence label should say "Single recording — verify before distributing" not just the numeric score.

**3.2 Confidence percentage displayed without definition**

`metadata.confidence` is rendered in the header as e.g. "84%" with a target icon. The operator has no way to know what this number means. Is it the fraction of steps with high step-level confidence? A segmentation score? Something else? The `confidenceLabel` field provides a short string ("Well-defined steps") which is helpful but appears only in the Process Overview stats section (Execution mode), not next to the confidence percentage in the header where the operator first sees it.

Recommendation: Make `confidenceLabel` a tooltip or sub-label on the confidence chip in the header. Do not display a percentage without a one-clause definition of what it measures.

**3.3 Expected outcomes are inferred, not observed**

`step.expectedOutcome` is built by `buildExpectedOutcome(definition.completionCondition, groupingReason, events)`. These are inferred from the step category and event types, not from an observed screen state or explicit system confirmation event. The display uses a green checkmark icon, which implies a verified outcome. A user performing the SOP might not achieve the stated outcome if their environment differs from the recorded one.

Recommendation: Distinguish inferred outcomes (derived from event pattern) from observed outcomes (a navigation event or system-state event that confirmed success). Add a note such as "inferred from navigation pattern" when the outcome is not confirmed by a system event.

**3.4 "AI Insights" and recommendations in Intelligence mode are derived from structural patterns, not domain knowledge**

The Intelligence mode's recommendations (automation, integration, simplification) are generated from step categories (e.g., `automationHint` from `groupingReason === 'repeated_click_dedup'`). The "Automation Opportunity" label implies an AI recommendation, but the underlying logic is rule-based pattern detection. The "Ask This Process" panel is labeled "Beta" and the input is disabled — but the panel title "Ask This Process" implies a functioning AI assistant. This is the only place where a coming-in-an-upcoming-release feature is presented with a live-looking input field and suggested prompts.

Recommendation: Replace the enabled-looking input field with a static "Coming soon" tile, as the current disabled input with cursor-not-allowed still looks like a temporarily broken feature rather than a planned one. The recommended change to the panel copy is: "AI-powered Q&A for this process — coming in an upcoming release" with no input element at all, matching the PresetChipRail pattern.

**3.5 The scope field exists but is never displayed**

`SOP.scope` is generated by `generateScope(activityName, allSystems, roles)` and stored in the engine output. It is mapped into `SOPMetadata.scope` in the view model but is never rendered in any of the three view modes. The scope statement defines the boundaries of the procedure (which roles, which systems, what is not covered). Omitting it means an operator reading the SOP cannot tell whether this procedure applies to them.

Recommendation: Render `metadata.scope` in the Quick Start card beneath "When To Use" or in a collapsible "Scope & Boundaries" row.

---

## 4. The 8–12 Highest-Impact Improvements (P0 to P2)

### P0 — Must have before the SOP is credible for distribution

**Improvement 1: Page-URL / page-title evidence per step (P0)**
Component: `ExecutionStepCard` and `VisualStepCard` expanded body.
Change: Add a "Where this happens" row inside the expanded step showing the page title (from `CanonicalEventInput.page_context.pageTitle`) and the application label (from `applicationLabel`). These are already available on `SOPInstruction.system` and on step events. If page title is available, render it as: `In [Application] · [Page title]`. If a URL is available for the step's primary domain, render it as a small linked monospace string. This is the minimum viable evidence linkage — it costs nothing computationally and makes the moat visible. Without it, the SOP looks identical to a manually authored one with no evidence.

**Improvement 2: Run-count disclosure in header (P0)**
Component: `SOPHeader`.
Change: Add "Based on N recording(s)" immediately beneath the confidence chip. The count is computable from the workflow record passed as `workflowRecord` to `SOPPageShell`. When N=1, surface a brief advisory inline ("Single recording — review before sharing"). When N≥3, this line reinforces the multi-run derivation. The `qualityAdvisory` pattern already exists for advisory banners — a simpler inline label in the header is more visible than a full banner below the mode switcher.

**Improvement 3: Actor / role per step displayed (P0)**
Component: `ExecutionStepCard` expanded body.
Change: `SOPViewStep.actor` and `SOPViewStep.hasSensitiveData` are already populated from the engine. Add a "Performed by: [actor]" label inside the expanded step card, aligned with the expected-outcome row. Use the `Users` icon consistent with the header. This is the most basic requirement of any distributable work instruction: the reader must know who does what.

**Improvement 4: Scope statement rendered in Quick Start (P0)**
Component: `QuickStartSection` in `SOPExecutionMode`.
Change: Add a "Scope" row to the Quick Start card between "When To Use" and "Before You Begin". `viewModel.metadata.scope` is populated by the engine. Even one sentence such as "Covers all steps performed in Salesforce CRM by the Account Manager role from account lookup to opportunity creation" is enormously more informative than silence.

### P1 — Material quality improvement, should ship in next iteration

**Improvement 5: Step-level inputs displayed (P1)**
Component: `ExecutionStepCard` expanded body.
Change: `SOPViewStep.inputs` is populated by `SOPStep.inputs` from the engine (derived from sensitive field labels, data entry events). When non-empty, add an "Inputs needed" row inside the expanded card showing the inputs as small chips. Example: "Account ID", "Opportunity Amount". This is a direct answer to "what do I need to have in hand before starting this step?"

**Improvement 6: Per-step time budget displayed more prominently (P1)**
Component: `ExecutionStepCard` collapsed header and expanded body.
Change: The `step.durationLabel` is already present in the collapsed header but at 10px with low contrast. In the expanded body, add the duration as a labeled row ("Typical duration: ~45 seconds") using the `Clock` icon. This gives the operator a time budget per step rather than requiring them to calculate from the aggregate total.

**Improvement 7: Export as PDF + print stylesheet (P1)**
Component: `SOPPageShell` export controls + global CSS.
Change: Add a `@media print` stylesheet that hides `no-print` elements (already tagged in `page.tsx`), expands all step cards (CSS `display: block !important`), removes the step rail, and applies print-safe font sizes. The Printer icon (`lucide-react`) is already imported in `SOPPageShell` but not wired to anything. Wire the `Printer` button to `window.print()`. For PDF: the markdown export exists — a "Download PDF" button that generates via the browser's print-to-PDF dialog is a zero-dependency approach. The Export button should clearly label the format: "Export Markdown" rather than just "Export".

**Improvement 8: "Ask This Process" panel replaced with honest coming-soon tile (P1)**
Component: `AskThisProcessPanel` in `SOPIntelligenceMode`.
Change: Replace the disabled input + disabled prompt buttons with a static tile: icon (Brain or MessageSquare), heading "AI Q&A for this process", body "Ask questions about any step, decision, or edge case — coming in an upcoming release", no interactive elements. This matches the PresetChipRail audit-honesty pattern ("Coming in an upcoming release") and removes the appearance of a broken feature.

### P2 — Meaningful polish, addressable in a subsequent iteration

**Improvement 9: Version date displayed in header (P2)**
Component: `SOPHeader`.
Change: `metadata.createdAt` is in the `SOPMetadata` type but not rendered. Add "Generated [date]" in small type alongside the version chip. This is a basic document property that document recipients expect on any work instruction.

**Improvement 10: Confidence chip with inline definition (P2)**
Component: `SOPHeader`, confidence chip.
Change: Add a tooltip or aria-describedby on the confidence chip with `metadata.confidenceLabel`. Example: hovering over "84%" shows "Well-defined steps — derived from consistent segmentation across observed events". This addresses the honesty gap in section 3.2 without changing the visual footprint.

**Improvement 11: Step title anchored in expanded body heading (P2)**
Component: `ExecutionStepCard` and `VisualStepCard` expanded body.
Change: Currently the step number and title only appear in the collapsed button header. When the card is expanded, the content area begins directly with the instruction list. Add an H3-equivalent heading (`<p className="font-semibold text-sm">`) at the top of the expanded body that repeats the step title. This is a reading-continuity convention: the reader should not have to scroll back up to see which step they are reading. This also makes individual step screenshots meaningful (the step title is in view when the card is open).

**Improvement 12: SOP-only share link (P2)**
Component: `SOPPageShell` or `page.tsx` share handler.
Change: When sharing is enabled, add a "Share SOP" button alongside the workflow-level Share button, generating a share link that deep-links to the SOP tab (`/share/{token}?view=sop`). This is minimal surface — the shared workflow view already exists; the query param selects the default active tab. Without this, a manager who wants to share only the SOP must share the entire workflow, which includes the process map, report, and raw JSON evidence — more than most operators need or should see.

---

## 5. How the SOP Should Link to / from the Process Map

The SOP and the process map are two views of the same underlying derived data: one is the narrative instruction for execution, one is the structural graph for analysis. Currently they are completely unlinked in the UI — they are tabs on the same page with no cross-reference.

### What should exist

**5.1 Bidirectional step anchors**

Every SOP step card has an `id="sop-step-{step.id}"` anchor (this already exists in `ExecutionStepCard`, `VisualStepCard`, and `SmartStepCard`). Every process map node has a matching `step_id` (from `ProcessMapNode.stepId`). 

In the process map view: clicking a node should show a "View in SOP" affordance — a small button or link that switches the tab to SOP and scrolls to that step. The `step_id` linkage is already available in `ProcessMapNode.stepId` — the map only needs a navigation callback.

In the SOP view: inside the expanded step card, add a "See in process map" link that switches back to the Workflow tab and highlights the corresponding map node. The step ID is the bridge.

**5.2 Consistent step numbering**

Process map node ordinals and SOP step ordinals already match (both derived from `DerivedStepInput.ordinal`). This is already deterministic. The display should make this correspondence explicit: "Step 3 in the process map = Step 3 in this SOP" with a visible ordinal badge using the same color scheme in both views. Currently both views use ordinal-based color badges drawn from `CATEGORY_CONFIG` but the connection is not stated anywhere for the user.

**5.3 "Two views of one process" framing in the UI**

Add a small contextual note on the SOP tab and on the Workflow (process map) tab: "This SOP and the process map describe the same recorded workflow. Steps are numbered identically in both views." This is a one-line copy addition that prevents users from treating the two as different documents and reduces support questions about why step counts match.

**5.4 Summary minimap in SOP header or Visual mode**

The Visual mode already renders a `ProcessFlowMap` (the DNA strand dot sequence). This is effectively a miniature process map embedded in the SOP. The connection could be made more explicit: label this section "Process Map Summary" rather than "Process Flow" and add a link "Open full process map →" that switches the active tab to Workflow. The linkage is a tab switch + optional scroll-to-top.

**5.5 Evidence tab as a third anchor**

The Report tab's "Raw evidence (JSON)" disclosure in `page.tsx` provides the backing evidence for both the SOP and the map. The SOP's provenance footer currently shows `metadata.sourceNote` (a text string like "Generated by Ledgerium AI from 1 recording"). This should include a link to the Report tab: "View backing evidence →" that switches to the Report tab. This makes the evidence-linkage claim actionable, not just stated.

---

## Observation flagged for product scope (not promoted to backlog by this agent)

The SOP view has no mechanism for a human to correct or annotate a generated step before distributing the SOP. All five best-in-class tools reviewed (Scribe, Tango, SweetProcess, Trainual, Whale) provide step-level editing after auto-generation. The current Ledgerium SOP is read-only. When a user rates the SOP as "Major rework" in the `SOPUsefulnessSurvey`, they have no in-product path to make that rework. This is the most common reason SOP auto-generation tools fail adoption. It is out of scope for this display review but is flagged as a product gap for the coordinator.

---

*All findings above are based on direct source reading of the shipped components. No speculative capability has been attributed. Screenshot evidence is referenced by component name and line range where the finding is verifiable.*
