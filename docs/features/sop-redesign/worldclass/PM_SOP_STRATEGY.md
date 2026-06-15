# Ledgerium SOP — World-Class Strategy
**Date:** 2026-06-15
**Author:** product-manager
**Status:** Final strategic definition — no code. Downstream input for engineering, UX, growth, and QA.
**Scope:** The workflow SOP tab (`SOPPageShell` and its three modes) as a category-defining product artifact.

---

## 1. Positioning: The Category Ledgerium's SOP Should Own

### The category name

**The SOP that writes and maintains itself from how work is actually done.**

Every word is load-bearing.

- **Writes itself** — The SOP is generated from real browser events captured by the extension, not authored by a human who watched someone work once. `buildSOP()` in `packages/process-engine/src/sopBuilder.ts` derives the steps, scope, roles, trigger, prerequisites, and completion criteria from observed events. This is not AI hallucination — it is structured derivation from a deterministic event pipeline. The claim holds.
- **Maintains itself** — This is the strategic frontier and must be earned. `analyzeSopAlignment()` in `packages/intelligence-engine/src/sopAlignmentEngine.ts` computes a real alignment score (0–1), identifies undocumented steps (steps present in runs but absent from the SOP), and identifies unused documented steps (SOP steps absent from real execution). `computeDocumentationDriftScore()` converts this into a 0–100 drift score with a `level` ('aligned' / 'minor_drift' / 'significant_drift' / 'outdated'). These engines are computed, stored in the `PortfolioIntelligence` object (via `apps/web-app/src/lib/intelligence.ts`), and available in the workflow's artifact set. They are **not surfaced on the SOP tab today.** The "maintains itself" claim becomes true when those engines write their verdict directly into the SOP view.
- **From how work is actually done** — The evidence provenance (source event IDs, page URLs, page titles, application labels, timestamps) is stored on every `SOPInstruction.sourceEventId` and on `CanonicalEventInput.page_context`. It is not displayed. Making this visible is the single highest-leverage credibility move.

### Why this positioning is defensible

**vs. Scribe and Tango (screenshot SOP tools):**
Scribe and Tango produce one screenshot per click. They have no analytical layer. A Scribe SOP cannot tell you this step appears in only 60% of recorded runs, that step 4 drifted from the documented procedure after a software update, or that this process has three execution variants with meaningfully different outcomes. They are guides, not living documents. Ledgerium's moat is not the step list — it is the evidence behind the step list and the alignment score that tells you when the step list is wrong.

**vs. SweetProcess, Trainual, Whale (manual authoring tools):**
These tools require a human to write and update every word. They have version history because a human made a change. Ledgerium's version history is built from new recordings. The SOP can be regenerated when a system changes. No other manual authoring tool can say "this SOP is 78% aligned with the last 15 runs — three steps have drifted." That is a fundamentally different product.

**vs. process mining (Celonis, UiPath, Signavio):**
Process miners derive conformance from ERP logs, not from real browser behavior. They require IT instrumentation and structured log sources. Ledgerium reaches processes that leave no log — the CRM workflow, the spreadsheet-to-email handoff, the ERP data entry ritual. And Ledgerium's SOP is executable: it tells an operator what to do, step by step, not just what happened statistically.

### The honest positioning constraint

The "maintains itself" claim depends on the alignment and drift engines being wired into the SOP view. Until that wiring is done, the claim must be stated as a directional vision, not a current feature. The SOP currently does not display its alignment score, drift level, undocumented steps, or unused steps. These values are computed and stored. The strategic decision is to surface them. The claim earns its truth when the SOP header shows: "This SOP is 84% aligned with the last 12 runs. Step 4 has drifted — 8 runs include a verification step not in this document."

### The one-sentence positioning statement

"Ledgerium's SOP is the only standard operating procedure that writes itself from observed behavior, shows you exactly what evidence it is based on, and tells you when execution has drifted from what it documents."

---

## 2. The SOP as Product: The Deliverable, the Living Aspect, the Full Surface

### The deliverable (what the SOP is today, at its best)

The current SOP produces, from a single recorded session:

- A structured procedure with numbered steps, imperative titles, and sub-instructions derived from the event sequence.
- A scope statement, trigger, prerequisites, roles, systems, and estimated time — all computed from observed data by `contentEnricher.ts`.
- Per-step confidence scores, friction indicators, decision points, expected outcomes, and automation hints.
- Three rendering modes: Execution (operator-facing), Visual (phase-grouped), Intelligence (analytical layer).
- An interactive completion checklist.
- A Markdown export.

This is already meaningfully better than a manually authored SOP for the same process because it reflects what actually happened, not what someone remembered happening.

**What is computed but hidden today (the credibility gap):**
The view model populates `SOPMetadata.scope`, `SOPViewStep.actor`, `SOPViewStep.inputs`, and `SOPMetadata.createdAt` but renders none of them. The `SOPInstruction.sourceEventId` chain that traces every instruction to a recorded event is never shown. These are the fields that distinguish Ledgerium from a generic SOP writer and they are invisible.

### The living aspect (what the SOP becomes with the alignment engines)

The `analyzeSopAlignment()` function is fully implemented and tested. It takes the SOP's steps (as `SOPStep[]`) and compares them to all process run bundles for the workflow group. It returns:

- `alignmentScore` (0–1): how well the SOP matches real execution across all runs.
- `alignmentLevel`: 'high' / 'moderate' / 'low' / 'critical'.
- `undocumentedSteps`: steps observed in runs but absent from the SOP, with frequency (how often they appear) and typical position.
- `unusedDocumentedSteps`: SOP steps that appear in fewer than 20% of recorded runs.
- `driftIndicators`: specific 'missing_step' / 'extra_step' / 'reordered' / 'frequency_mismatch' signals with severity.
- `alignedRunCount` and `totalRunCount`: the denominator for every claim.

`computeDocumentationDriftScore()` converts this into a 0–100 score and a level. Both are stored in `ProcessDefinition.intelligenceJson` after the intelligence analysis runs.

The living SOP is this: after each new recording for the same workflow, the alignment score updates. The SOP header shows a freshness signal — "92% aligned with 20 runs" — and when drift is detected, a per-step drift indicator highlights which step has diverged and what is being observed instead. The operator reading the SOP can tell immediately whether the document reflects how the work is being done today.

This is not AI. It is deterministic comparison against observed data. It is already computed. The only gap is display.

### Editing, override, and templates (future, not current)

The five best-in-class tools reviewed (Scribe, Tango, SweetProcess, Trainual, Whale) all provide step-level editing after auto-generation. The current Ledgerium SOP is read-only. When a user marks the SOP as "Major rework" in the `SOPUsefulnessSurvey`, they have no in-product path to act on that judgment. This is the most common adoption failure mode for SOP auto-generation tools.

Editing is a future capability, not a current gap to patch. The strategic sequence is: (a) make the generated SOP more credible and complete so users trust what they read before asking for an edit path, then (b) add override/annotation capabilities that preserve the evidence link while allowing expert correction. Templates (`template_sop_operator_centric`, `template_sop_enterprise`, `template_sop_decision_based`) are already being generated — the template selector is in `packages/process-engine/src/templateSelector.ts`. The format-switching UI could surface these as distinct export targets before editing of individual steps is built.

### Export, sharing, and integration (strategic surface)

Current state: Markdown export via the `Export` button in `SOPPageShell`. Raw JSON export via `handleExport('sop')` in `page.tsx`. No PDF. No print stylesheet. The `Printer` icon is imported in `SOPPageShell` but not wired.

Strategic target:
- **PDF export** is the highest-demand format for distributing SOPs outside the platform. Every target buyer (ops teams, compliance, training) asks "can I print this?" PDF is not a nice-to-have — it is a distribution gate.
- **Print stylesheet** (`@media print`) is near-zero engineering cost: hide the step rail, expand all cards, apply print-safe fonts, show the scope and version date. This should be done immediately.
- **SOP-only share URL** — the existing share token deep-links to the full workflow view. Adding `?view=sop` to the share URL and defaulting to the SOP tab for external viewers is a one-line change that materially increases the SOP's distribution utility.
- **Confluence/Notion embed** is a Phase 2 integration. The Markdown export is the first step toward this. A "Copy to Clipboard as Markdown" action would make paste-into-Confluence trivial without building a full integration.

### Training, compliance, and versioning (strategic framing)

Training and compliance buyers are the natural expansion ICP for SOPs. They need version history (who changed what, when, why), attestation (did the trainee confirm they read the SOP), and link-to-policy. These are Phase 2 capabilities.

The immediate strategic move is to establish the date-stamped, evidence-linked SOP as an artifact that can stand up to a compliance question: "show me the procedure your team followed on this date." The `metadata.createdAt` and `metadata.version` fields exist. Displaying them creates the audit-credibility posture before building the compliance-specific features.

---

## 3. Strategic Gaps vs. World-Class

This section synthesizes the direct findings from `SOP_DISPLAY_REVIEW.md` and the parallel competitive evidence from the Report strategy, mapped to Ledgerium's observed capability state.

### Gap 1: Per-step visual evidence (screenshots / page context)

**What world-class looks like:** Scribe and Tango show one screenshot per step with element highlights. A reader can see exactly what the screen looked like when the action was performed.

**What Ledgerium has:** `SOPInstruction.sourceEventId` links every sub-instruction to a recorded event. `CanonicalEventInput.page_context` on that event carries `pageTitle`, `url`, `routeTemplate`, and `applicationLabel`. These are never displayed.

**Why this gap is critical:** Without any visual context, the SOP looks indistinguishable from a manually authored document. The evidence-linked claim is invisible to the reader.

**Minimum viable move:** Render the page title and application label per expanded step ("This step happens in Salesforce · Accounts › Details page"). No screenshot rendering needed for the P0 version. Screenshots require a screen capture rendering pipeline — this is a separate engineering project.

### Gap 2: Computed data fields not rendered (scope, actor/role, inputs)

**What world-class looks like:** SweetProcess and Trainual show the role responsible for each step in the step body. Every distributable work instruction standard (ISO 9001, ISO/IEC 17025) requires scope and role.

**What Ledgerium has:** `SOP.scope` (generated by `generateScope()`), `SOPStep.actor` (inferred by `inferRoles()`), and `SOPStep.inputs` are all populated by the engine. None are rendered in any view mode.

**Why this gap is critical:** Without role per step, the SOP cannot be distributed to a team with multiple roles. Without scope, an operator cannot determine whether this procedure applies to their situation. Without inputs, they cannot prepare before starting. These are not cosmetic — they are functional requirements for a work instruction to be distributable.

### Gap 3: Alignment and drift engines not surfaced on the SOP tab

**What world-class looks like:** A living SOP that tells you when it is out of date and specifically which steps have changed.

**What Ledgerium has:** `analyzeSopAlignment()` is fully implemented and produces `alignmentScore`, `alignmentLevel`, `undocumentedSteps`, `unusedDocumentedSteps`, and `driftIndicators`. `computeDocumentationDriftScore()` produces a 0–100 score and level string. Both are computed and stored in `ProcessDefinition.intelligenceJson` after intelligence analysis. They are rendered in the analytics process page (`/analytics/process/[id]`) but are not visible on the SOP tab.

**Why this gap is the highest-leverage strategic move:** No competitor currently surfaces this. Scribe SOPs are permanently static. SweetProcess requires a human to manually mark a revision. Ledgerium can say "this SOP is 78% aligned with the last 12 runs — step 4 has drifted" backed by deterministic computation. This is the unique differentiator that earns the "living SOP" claim.

### Gap 4: PDF export and print support

**What world-class looks like:** Every competitor (Scribe, Tango, SweetProcess, Trainual, Whale) exports to PDF. PDF is the delivery format for training, compliance, and offline use.

**What Ledgerium has:** Markdown export only. The `Printer` icon is imported but not wired.

**Why this gap matters:** PDF export is a distribution gate. Without it, the SOP cannot leave the platform for any use case that does not involve a Ledgerium account. This limits the SOP's value to logged-in users who already have access to the evidence.

### Gap 5: Run count and evidence provenance not disclosed

**What world-class looks like:** A reader knows immediately whether the document is based on 1 recording or 50, and what that means for confidence.

**What Ledgerium has:** `workflowRecord.confidence` is passed to `SOPPageShell`. The `qualityAdvisory` banner fires in some cases. But there is no persistent disclosure of how many runs the SOP was derived from, and when N=1 the confidence number is presented without context that a single-recording SOP is a hypothesis, not a validated standard.

### Gap 6: No editing or annotation path

**What world-class looks like:** Scribe, Tango, and SweetProcess all allow post-generation editing. Auto-generation is a starting point; experts correct and augment.

**What Ledgerium has:** Read-only. `SOPUsefulnessSurvey` captures a usefulness rating but provides no in-product path to act on a "Major rework" rating.

**Why this is Phase 2, not P0:** Editing is the right answer after the generated SOP is credible. Building editing before fixing the scope/role/actor display gap would allow users to edit a document that is already missing critical fields, making the output worse. The sequence is: fix the honesty/completeness gaps first, then add editing.

---

## 4. Prioritized Strategic Roadmap

### P0 — Make the SOP credible for distribution (can ship now, no new data pipelines)

**P0.1: Render scope, actor/role, and step-level inputs**
- Scope: Add `metadata.scope` to the Quick Start card below "When To Use." One sentence, already computed, already stored.
- Actor per step: Add "Performed by: [actor]" inside the expanded `ExecutionStepCard` and `VisualStepCard`. `SOPViewStep.actor` is already populated.
- Step inputs: Add "Inputs needed" chip row inside the expanded step when `step.inputs` is non-empty. Already populated.
- Evidence cost: pure UI work on existing view model data. Zero engine changes. Zero API changes.
- Why P0: Without role and scope, the SOP cannot be distributed. These are not cosmetic additions — they are the difference between a draft and a distributable work instruction.

**P0.2: Add page-title / application evidence per step ("Where this happens")**
- Inside each expanded step, show the application label and page title for the primary instruction in that step.
- Source: `SOPViewInstruction.system` already carries the application label. The page title requires surfacing `sourceEventId` → page context, which may need a view model extension.
- If page title is not accessible without a pipeline change: at minimum, render the application label as a "This step happens in [Application]" line. This is available from `step.system` today.
- Evidence cost: low if using existing `step.system`; medium if threading page title from `SOPInstruction.sourceEventId`.
- Why P0: This is the minimum viable evidence-linkage display. Without any visual or contextual evidence per step, the evidence-linked positioning is invisible.

**P0.3: Run-count disclosure in the SOP header**
- Add "Based on N recording(s)" immediately beneath the confidence chip in `SOPHeader`.
- When N=1: "Single recording — review before distributing."
- When N≥3: the run count reinforces multi-run derivation.
- Source: `workflowRecord` is already passed to `SOPPageShell`. The run count requires knowing the total recording count for this workflow — this may be the `workflowRecord.confidence` source context, or requires a count from the API.
- If exact multi-run count is not yet available in the SOP context: add the single-recording advisory when `workflowRecord.confidence` is null or when a flag indicating single-run derivation is detectable.
- Why P0: A SOP distributed without a run-count disclosure misrepresents its confidence level. This is a honesty requirement before distribution.

**P0.4: Replace "Ask This Process" with an honest coming-soon tile**
- The disabled input with `cursor-not-allowed` currently looks like a broken feature.
- Replace with: icon + "AI Q&A for this process — coming in an upcoming release" + no input element.
- This follows the PresetChipRail audit-honesty pattern established at iter 062.
- Evidence cost: trivial — one component change.
- Why P0: Honesty about capability gaps is an operating principle. A disabled interactive element that looks broken creates distrust in all other parts of the SOP.

### P1 — Wire the alignment and drift engines to the SOP view (the "living SOP" activation)

**P1.1: SOP freshness signal in the header**
- Source: `documentationDrift` and `sopAlignment` are computed and stored in `ProcessDefinition.intelligenceJson` (accessible via `metrics-input-adapter.ts` which already partially parses this field).
- Display: Add a "Freshness" chip in `SOPHeader` when alignment data is available. "92% aligned with 20 runs" in green; "78% aligned — step drift detected" in amber; "Outdated — significant drift" in red.
- When alignment data is not yet available (intelligence analysis not run): show "Freshness: run analysis to score" in neutral.
- Why P1 and not P0: This requires threading `sopAlignment` and `documentationDrift` from the workflow's `intelligenceJson` into the SOP tab data path. That is a data layer addition, not just a UI change. The P0 items are pure view model changes.

**P1.2: Per-step drift annotation in Intelligence mode**
- In the Intelligence mode's `SmartStepCard`, when `undocumentedSteps` or `unusedDocumentedSteps` data is available, flag steps affected by drift with a "Drifted" or "Rarely observed" marker.
- For undocumented steps: show a "Not in SOP" step insertion card at the position where it is typically observed, with the frequency percentage.
- For unused documented steps: show a "Rarely observed" marker on the step card (observed in fewer than 20% of runs).
- Why P1: This is the highest-leverage differentiation from any competitor. No other tool surfaces this. It makes the living SOP claim visceral.

**P1.3: PDF export and print stylesheet**
- Add `@media print` CSS: hide the step rail, expand all step cards (force `display: block`), remove mode switcher and controls, apply print-safe font sizes and color-safe styles.
- Wire the existing `Printer` icon in `SOPPageShell` to `window.print()`.
- Label the existing Export button clearly: "Download Markdown" instead of "Export".
- Why P1: PDF is a distribution gate. It is engineering work but not blocked by any data pipeline change.

**P1.4: SOP-only share URL**
- Add `?view=sop` query param handling so the share link defaults to the SOP tab for external viewers.
- This is a one-line routing change in the shared workflow view.
- Why P1: Without a SOP-specific share URL, distributing the SOP to non-Ledgerium users means sharing the full workflow view. That is too much context for most recipients (operators, training participants, auditors).

**P1.5: Display generated date and version in the SOP header**
- `metadata.createdAt` is in the `SOPMetadata` type but not rendered. `metadata.version` renders the engine schema version, not a meaningful revision date.
- Add "Generated [date]" beside the version chip. Use `metadata.createdAt`.
- Why P1: Document recipients expect a date on any work instruction. Without it, the SOP cannot be used in a compliance context.

### P2 — Maturity, depth, and downstream integration

**P2.1: Per-step screenshots (capture rendering pipeline)**
- What Scribe does: one screenshot per click, element highlight overlay.
- What Ledgerium needs to do this: a screen capture rendering pipeline that retrieves stored screenshot data (if captured by the extension) and renders it in the step card.
- Current state: The extension captures events but screenshot rendering per step does not exist in the current capture pipeline. This is a non-trivial engineering project.
- Strategic positioning: Screenshots are the primary feature of Scribe and Tango. Ledgerium can reach parity on this surface while surpassing Scribe on the analytical layer. This is the long-term visual credibility move.
- Gate: Do P0 and P1 first. Screenshots on a SOP that is missing role and scope add polish to an incomplete document.

**P2.2: SOP editing and expert override**
- Allow operators or managers to edit the title, step title, and step instructions.
- Preserve the evidence link: an edited step shows "Original generated from recording · Edited by [user] on [date]."
- Editing is additive: changes create a new version, the generated version is preserved.
- Gate: Do not build editing before the SOP is credible. Users will not edit a document they do not trust. Trust comes from P0 (complete fields, honest run count) and P1 (alignment signal).

**P2.3: Scheduled freshness analysis**
- After a new recording is processed for a workflow that already has a SOP, automatically recompute the alignment score and send a notification: "Your SOP for 'Onboard New Customer' may be outdated — 3 new patterns detected in 5 recent recordings."
- This is the product behavior that delivers the "maintains itself" claim without user-initiated re-analysis.
- Gate: Requires the alignment engine to run on new recordings for an existing process group. The engine exists. The trigger is the gap.

**P2.4: Templates as explicit user choices**
- Currently `template_sop_operator_centric`, `template_sop_enterprise`, and `template_sop_decision_based` are generated and one is selected by fallback priority. The user never sees the choice.
- Surface these as format options in the SOP tab: "Operator guide / Enterprise format / Decision tree." Allow the user to switch between them. Each is a different rendering of the same underlying SOP data.
- This is a low-cost way to serve different buyer contexts (training vs. compliance vs. operations) without building multiple separate pipelines.

**P2.5: Confluence / Notion export integration**
- The Markdown export is the first step. A "Copy as Markdown" button (copies to clipboard) enables paste-into-Confluence without a full integration.
- A formal Confluence integration (API key, direct push) is Phase 2.

**P2.6: Compliance versioning and attestation**
- Version history: each time a SOP is regenerated or edited, a version record is created with date and change summary.
- Attestation: a "Mark as reviewed" button that creates a dated record of who confirmed they read the SOP and when.
- Target buyer: compliance, training, ISO-audited teams.

---

## 5. Success Metrics

### SOP usefulness (primary)

**Target:** SOP usefulness survey "Very useful" or "Mostly useful" rate ≥ 70% within 90 days of each improvement shipped.

**Baseline:** Measure current survey distribution before P0 ships. The `SOPUsefulnessSurvey` fires after 30 seconds of SOP dwell time. The response data is the baseline.

**Leading indicator:** Survey completion rate (are users dwelling long enough to see the survey?). If completion rate is low, the SOP is not holding attention — which precedes a low usefulness score.

### SOP distribution (adoption signal)

**Target:** ≥ 30% of SOPs that are viewed are also exported (Markdown, eventually PDF) or shared within the same session, within 90 days of PDF/share launch.

**Baseline:** Current export click rate on the `Export` button in `SOPPageShell` (tracked by analytics via the existing `sop_section_viewed` event + export interaction).

**Rationale:** A SOP that is only read inside Ledgerium is valuable only to the recorder. A SOP that is exported or shared is generating value beyond the platform. Distribution rate is the proxy for "distributable work instruction" adoption.

### Freshness (living SOP signal)

**Target:** After P1.1 ships, ≥ 25% of SOP views where alignment data is available show an alignment score (i.e., the intelligence analysis has been run). Track this as "SOP with freshness signal" vs. "SOP without freshness signal."

**North star:** Within 6 months of P1 shipping, the freshness signal drives at least one re-recording event per workflow per month (a user sees "78% aligned — drift detected" and records again to update the SOP).

### Alignment engine activation

**Target:** ≥ 50% of workflows with 3+ recordings have a computed `sopAlignment` score when a user opens the SOP tab.

**Baseline:** Today, alignment is computed only when the full intelligence analysis is run. Measure the current fraction of SOP tab opens that have alignment data available.

---

## 6. The Single Highest-Leverage Move

**Wire the alignment and drift engines to the SOP header.**

This is P1.1 in the roadmap above. It is the move that converts the SOP from a generated document into a living one. It uses fully implemented, tested engines (`analyzeSopAlignment`, `computeDocumentationDriftScore`) that already produce the right data. The gap is display, not computation.

The freshness signal — "This SOP is 84% aligned with 12 runs. Step 4 drifted." — accomplishes three things simultaneously:
1. It makes the evidence-linked positioning visceral and visible. The reader sees proof that this document was derived from real behavior.
2. It creates a trust signal for distribution. A 92% alignment score is an endorsement the user can relay: "this SOP reflects how we actually do this."
3. It creates a re-engagement signal. A 62% alignment score is a prompt to record again and regenerate. This is the product loop that sustains engagement after the initial SOP is created.

No competitor has this. It is computationally cheap relative to its strategic value. It should ship before screenshots.

---

## 7. Open CEO Decisions

The following decisions require CEO input before the relevant roadmap items can be scoped and prioritized:

**Decision 1: Is the "living SOP" the primary product narrative for the SOP tab?**
The strategy above positions the alignment/drift signal as the primary differentiator. This has implications for the SOP tab's visual hierarchy — the freshness chip would appear in the header, near the confidence score, making alignment the first thing a reader sees. If the SOP tab is primarily a training/distribution artifact (static), the freshness signal may not belong at the top. If it is primarily a process management artifact (living), it leads.

**Decision 2: What is the target distribution format for the SOP?**
PDF is recommended as P1. Markdown (current) serves technical users who paste into Confluence. PDF serves training, compliance, and offline distribution. The question is sequencing: ship PDF before the alignment engine, or after? PDF unblocks distribution; the alignment engine unblocks the strategic differentiator. Given the P0 completeness fixes are prerequisite to either, the sequence is P0 → P1.1 (alignment) and P0 → P1.3 (PDF) in parallel.

**Decision 3: What is the editing strategy?**
The docs engineer review flagged that all five best-in-class competitors provide post-generation editing. The strategic question is whether Ledgerium builds editing in-platform (requiring a step-level editing UI and version storage) or positions the Markdown export as the editing path (users take the Markdown and edit it in Confluence, Notion, or a text editor). The in-platform editing path is more defensible (preserves evidence linkage) but more expensive. The export-and-edit path is faster but breaks the evidence link.

**Decision 4: When does the SOP tab become a separate share target?**
The current share token links to the full workflow view. A SOP-only share URL (`?view=sop`) is proposed as P1.4. The question is whether the shared SOP view should hide the process map and report tabs (making it a pure SOP reader for external users) or show all tabs. Hiding is safer for distribution to non-Ledgerium users; showing all tabs is simpler to build.

**Decision 5: Is compliance/versioning a target buyer segment this year?**
P2.6 (versioning and attestation) opens the compliance and training buyer segment. This requires explicit investment in version storage, audit log, and attestation UX. If compliance is a target segment within 12 months, P2.6 should be elevated to P1. If compliance is a later expansion, P2.6 stays where it is.

---

## Appendix: Observed Current State Summary

The following is a precise statement of what the SOP tab produces today, derived directly from source reading. No capabilities are attributed that are not observed in the code.

**Computed and displayed:**
- Numbered steps with imperative titles, sub-instructions, category badges, system badges, confidence dots, friction indicators, decision points, expected outcomes, automation hints, warnings.
- Quick Start card: objective, when to use, prerequisites, systems needed, expected outcome.
- Completion criteria as interactive checklist.
- Friction indicators per step and summary count in header.
- Three view modes: Execution, Visual (phase-grouped DNA visualization), Intelligence (analytical layer with Real vs. Expected table, Workflow DNA section).
- Confidence score (0–100%) in the header and per step.
- Markdown export via API route.

**Computed but not displayed:**
- `SOP.scope` (scope statement) — generated by `generateScope()`, stored in the model, never rendered.
- `SOPViewStep.actor` — inferred by `inferRoles()`, stored in the view model, never rendered.
- `SOPViewStep.inputs` — derived from data entry events, stored in the view model, never rendered.
- `SOPMetadata.createdAt` — in the type, never rendered.
- `SOPInstruction.sourceEventId` → `page_context.pageTitle` and `applicationLabel` — stored in the engine, never surfaced in the SOP view.
- `SOPAlignmentResult` (`alignmentScore`, `alignmentLevel`, `undocumentedSteps`, `unusedDocumentedSteps`, `driftIndicators`) — computed by `analyzeSopAlignment()`, stored in `ProcessDefinition.intelligenceJson`, rendered in the analytics page but not on the SOP tab.
- `DocumentationDriftScore` (`score`, `level`, `findings`) — computed by `computeDocumentationDriftScore()`, stored alongside alignment result, not on the SOP tab.

**Not computed at the step level:**
- Per-step screenshots or screen captures — the extension captures events but there is no screenshot rendering pipeline for the SOP view.

---

*All findings are grounded in direct source reading of the files listed in the scope header. No capability has been attributed that is not observed in the codebase. The alignment and drift engines are confirmed as implemented and tested in `packages/intelligence-engine/src/sopAlignmentEngine.ts`, `packages/intelligence-engine/src/standardizationScorer.ts`, and `packages/intelligence-engine/src/phase3.test.ts`.*
