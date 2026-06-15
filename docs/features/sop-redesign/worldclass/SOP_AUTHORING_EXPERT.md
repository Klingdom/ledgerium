# SOP / Work-Instruction Authoring — World-Class Expert Review

**Date:** 2026-06-15
**Reviewer lens:** World-leading SOP / standard-work / work-instruction authoring (Lean standard work, ISO 9001:2015 §7.5 documented information, GMP/21 CFR Part 11–style regulated procedures, technical-writing discipline)
**Mode:** READ-ONLY product code; web research permitted
**Scope read directly:**
- `apps/web-app/src/components/sop-view/*` — `SOPExecutionMode.tsx`, `SOPHeader.tsx`, `SOPEmptyState.tsx`, `SOPIntelligenceMode.tsx`, `SOPPageShell.tsx`, `types.ts`, `adapters/sopViewModel.ts`
- `packages/process-engine/src/` — `sopBuilder.ts`, `types.ts` (the `SOP` / `SOPStep` / `SOPInstruction` model), `processSessionFull.ts`, `templates/sopValidator.ts` (`validateRenderedSOP`)
- Dormant engines: `packages/intelligence-engine/src/sopAlignmentEngine.ts`, `packages/intelligence-engine/src/standardizationScorer.ts` (`documentationDrift`)
- Prior review: `docs/features/process-mapping/finalize/SOP_DISPLAY_REVIEW.md` (2026-06-12) — **this review builds on it, does not repeat it.**

A note on method: every claim about what Ledgerium does or does not have is grounded in a specific file/field. Where a capability is *computed but not rendered*, that is stated as a rendering gap, not a capability gap — this distinction is the single most important framing in this document, because it changes the cost and the honesty of every recommendation.

---

## 0. Executive Verdict

Ledgerium is in an unusual and enviable position for an SOP product. **Most of the data model of a world-class work instruction already exists in `SOP`/`SOPStep`/`SOPInstruction`** — title, purpose, scope, trigger, prerequisites, inputs, outputs, completion criteria, per-step system, per-step expected outcome, per-step warnings, per-step actor, per-step inputs, decision points, friction, and full event-level traceability via `sourceEventId`. The engine is genuinely ahead of the category on *what it knows*.

The shipped SOP **view** renders maybe 60% of that model and omits several elements that are non-negotiable in a distributable procedure (scope, per-step role, per-step inputs, generated-date, run-count). And it is missing the one element that defines the modern SOP-authoring category — **per-step visual evidence (screenshots)** — even though the capture data needed to render it (`sourceEventId` → `page_context`) is already on every instruction.

Two deterministic engines that would make Ledgerium *categorically* different from every competitor — `sopAlignmentEngine` and `standardizationScorer.documentationDrift` — are fully built, tested, and **completely dark in the UI.** A living SOP that scores its own conformance against reality and tells you when it has drifted is a thing no hand-authored tool (Scribe, Tango, SweetProcess, Trainual, Whale) can offer. Ledgerium has built it and is not showing it.

**The work to become best-in-class is overwhelmingly rendering and wiring, not invention.** That is the headline.

**Overall grade today: C+** (detailed rubric in §6).

---

## 1. The Anatomy of a Work Instruction a Human Can Actually Follow

The reference standard below is the union of: ISO 9001:2015 §7.5.3 (documented information must be identifiable, current, suitable, available at point of use); Lean standard work (the "standard work combination" — task, sequence, time, and the visual standard); GMP / ICH Q7 batch-record discipline (one verifiable action per line, expected result per step, signed/dated/versioned); and modern technical-writing convention (Minimalist instruction design — Carroll; the "every step is a single imperative with a visible result" rule used by Scribe/Tango/Atlassian/Microsoft style guides).

For each canonical element: **does Ledgerium HAVE it (rendered), COMPUTE-BUT-NOT-RENDER it, or is it MISSING?**

| # | Element (why a human needs it) | Standard requirement | Ledgerium status | Evidence |
|---|---|---|---|---|
| 1 | **Title / objective** — "what am I about to accomplish" | Verb-led, specific, persists in the document body, not just a tab | **HAVE (header) / partial** | `SOP.title` = `sessionJson.activityName`; rendered `SOPHeader.tsx`. `validateRenderedSOP` rejects generic placeholder titles (`sopValidator.ts:157`). But the title does not repeat in the body — once scrolled past the header the document is untitled (carried from prior review §1). |
| 2 | **Scope** — "does this procedure even apply to me / my case" | Boundaries: in/out, which systems, which roles, what is *not* covered | **COMPUTE-BUT-NOT-RENDER** | `SOP.scope` produced by `generateScope()` (`sopBuilder.ts:160`), mapped to `SOPMetadata.scope` (`sopViewModel.ts:64`), **rendered nowhere** in any of the three modes. A reader cannot tell if the SOP applies to their situation. |
| 3 | **Prerequisites / "before you begin"** — what I must have ready | Concrete, checkable items | **HAVE** | `SOP.prerequisites` → `quickStart.prerequisites`, rendered in the Quick Start card (`SOPExecutionMode.tsx:172`). Good. |
| 4 | **Inputs (process-level)** — the data/artifacts the process consumes | Named inputs to begin | **HAVE (process-level) / partial** | `SOP.inputs` built by `buildSOPInputs()`; surfaced via prerequisites. Adequate at the process level. |
| 5 | **Roles / actors** — who performs the procedure, and who performs *each step* | Named role per procedure AND per step (RACI-style) | **COMPUTE-BUT-NOT-RENDER (per-step) / HAVE-as-count (process)** | `SOP.roles` rendered only as a *count chip* in the header (`SOPHeader.tsx:51`) — names never shown. `SOPStep.actor` is populated (`sopBuilder.ts:143`) and carried to `SOPViewStep.actor` (`sopViewModel.ts:229`) but **rendered in no step card.** A distributable SOP that never names who does each step fails the most basic usability bar. |
| 6 | **Numbered, single-action steps in imperative voice** | One atomic action per line, sequential, scannable | **HAVE (mostly)** | Steps carry ordinals; titles cleaned to imperative (`cleanStepTitle`); event-level `instructions[]` rendered as a numbered list in the expanded body (`SOPExecutionMode.tsx:313`). `formatDetail` correctly separates action (`1.`), verify (`✓`), note (`→`). This is genuinely good standard-work structure. Caveat: collapsed cards show only the title; the primary `action` verb phrase only appears as a subtitle when it differs from the title. |
| 7 | **The SYSTEM per step** — which application/screen am I in | Visible at the point of the action | **HAVE / partial** | `SOPStep.system` rendered as a small badge in the collapsed header — but `hidden md:block` (`SOPExecutionMode.tsx:290`), so it is **invisible on mobile**, which is exactly where a frontline operator follows an SOP on a phone/tablet at the workstation. |
| 8 | **Expected outcome per step** — what "done" looks like for this step | One verifiable result per step | **HAVE / partial-honesty-flag** | `SOPStep.expectedOutcome` built by `buildExpectedOutcome()`; rendered with a green check in the expanded body (`SOPExecutionMode.tsx:363`). Two issues: (a) only visible when expanded; (b) the green check implies a *verified* result, but the outcome is *inferred from the step category*, not confirmed by an observed system event (see §4.3). |
| 9 | **Decision points / branches** — "if X then Y" | Explicit conditional with both arms | **HAVE** | `isDecisionPoint`/`decisionLabel` → inline amber decision block + a dedicated Decision Points summary section (`SOPExecutionMode.tsx:340, 417`). Well done and clearly styled. |
| 10 | **Warnings / cautions / edge cases per step** | Risk and sensitive-data flags at the point of risk | **HAVE** | `SOPStep.warnings` rendered with a Shield icon; sensitive-data warning auto-fires when `hasSensitiveEvents` (`sopBuilder.ts:115`). Good. |
| 11 | **Screenshots / visual evidence per step** — *the* defining element of a modern usable work instruction | One screen capture per action, ideally with the clicked element highlighted | **MISSING — and it is a RENDERING gap, not a capture gap** | Every `SOPInstruction` carries `sourceEventId` (`types.ts:344`) tracing to a `CanonicalEventInput` with full `page_context` (url, pageTitle, routeTemplate, applicationLabel). The page identity at every step is known. No image, no URL, no page title is rendered anywhere in the SOP. This is the #1 gap (see §2). |
| 12 | **Estimated time — total AND per step** (the "T" in standard-work) | Time budget the operator can pace against | **HAVE (total) / weak (per-step)** | `SOP.estimatedTime` shown in header + Quick Start. `SOPStep.durationLabel` shown only as a 10px label beside the chevron — not a usable time budget per step. |
| 13 | **Version / approval / control metadata** — is this current and approved | Revision number, generated/approved date, owner | **WEAK** | `metadata.version` always renders "v2.0" — that is the **engine schema version**, not a human revision number (carried from prior review §1). `metadata.createdAt` exists but is **not rendered** — no visible "generated on" date. No approval/owner field exists in the model. For ISO/GMP credibility this is a real gap. |
| 14 | **Completion criteria / sign-off** — how I know the whole process is done | Checklist, ideally interactive | **HAVE — best-in-class** | Interactive checkbox list with "All criteria met" confirmation (`SOPExecutionMode.tsx:466`). This is better than most competitors ship. |
| 15 | **References / source evidence / provenance** | Where this came from; how to verify | **WEAK** | Provenance is a single footer string `metadata.sourceNote` (`SOPExecutionMode.tsx:126`). No per-step "observed N times / last seen" line; no link to backing evidence. The moat is invisible (see §3). |
| 16 | **Outputs / deliverables** — what the process produces | Named outputs/records | **COMPUTE-BUT-NOT-RENDER** | `SOP.outputs` built by `buildSOPOutputs()` (`sopBuilder.ts:650`); not surfaced as a distinct rendered section. |
| 17 | **Print / PDF / offline form** — usable away from the app | Clean print stylesheet + PDF | **WEAK** | Export produces a Markdown `.md` only (`SOPPageShell.tsx:136`). The `Printer` icon is **imported but wired to nothing** (`SOPPageShell.tsx:16`); there is no `@media print` stylesheet and no `window.print()` call. A work instruction that cannot be printed for the workstation/clean-room fails point-of-use availability (ISO 9001 §7.5.3.2). |

**Scorecard of the anatomy:** 7 HAVE (some partial) · 4 COMPUTE-BUT-NOT-RENDER · 3 WEAK · 1 MISSING (the big one). The dominant failure mode is **render gaps on data that already exists**, which is the cheapest class of problem to fix and the strongest possible signal that the product is one rendering pass away from excellent.

---

## 2. The Biggest Gaps for a Human DOING the Work

These are ranked by how badly they hurt an operator who is *executing the procedure*, not reading it abstractly.

### 2.1 Per-step screenshots / visual evidence — the #1 gap (and it is a rendering gap)

The entire modern SOP category (Scribe, Tango, Guidde, iorad, Scribe-style "click-and-capture") exists on one insight: **a human following a UI procedure orients far faster from a picture of the screen than from a sentence describing it.** Carroll's minimalist-instruction research and every enterprise style guide that ships screen procedures (Microsoft, Atlassian) converge here: show the screen, highlight the target, one action.

Ledgerium renders **zero** visual evidence. The instruction "Click the target element on Dashboard" (`deriveInstruction` fallback, `sopBuilder.ts:260`) is precisely the kind of line a screenshot would render unnecessary.

Crucially, **the capture pipeline already records what is needed.** Each `SOPInstruction.sourceEventId` resolves to a `CanonicalEventInput` carrying `page_context.url`, `pageTitle`, `routeTemplate`, `applicationLabel`, and `target_summary.selector/label/role`. So even before any actual image is wired, the cheapest viable evidence is renderable today:

- **Minimum viable (zero new capture):** a "Where this happens" line per step — `In {applicationLabel} · {pageTitle}` + a monospace route/URL chip. Costs nothing computationally; makes the evidence linkage visible immediately.
- **Target viable:** the actual captured screenshot per instruction (if the extension stores frames keyed by `sourceEventId`) with a highlight box drawn from `target_summary.selector`. This is the Scribe parity move and the single highest-leverage product investment.

This gap is the difference between "an auto-generated text outline" and "a work instruction." It must lead the roadmap.

### 2.2 Roles, scope, and inputs are computed and hidden

Three elements that every distributable SOP requires are sitting in the view model, fully populated, rendered nowhere:

- **`metadata.scope`** — never rendered. Reader cannot tell if the procedure applies to them.
- **`SOPViewStep.actor`** — populated per step, rendered in no card. "Who does this step" is the most basic RACI question.
- **`SOPViewStep.inputs`** — populated per step, rendered in no card. "What do I need in hand before this step."

These are pure render adds against existing data. There is no honesty risk and near-zero cost. Not shipping them is leaving free value on the floor.

### 2.3 No "do-mode" vs "read-mode"

A person *reading to learn* a process wants the analytical layer (friction, confidence, intelligence). A person *doing the task right now* wants a stripped, large-type, one-step-at-a-time, check-off-as-you-go runbook with the screenshot and the expected result, and nothing else. The current Execution mode is a hybrid that leans toward reading: friction badges, confidence dots, intelligence sections, and AI insights all share the operator's screen. A dedicated **Do mode** (progressive single-step focus, big targets, the screenshot, the expected outcome, a "next" button, and the completion checklist) would convert the SOP from a document into a *guided execution surface* — and it maps perfectly onto the already-present `expandedSteps` state and completion-checklist interactivity.

### 2.4 Print / PDF is effectively absent

Markdown export is a developer-friendly format, not an operator-friendly one. The `Printer` button is imported and dead. Point-of-use availability (a printed runbook taped to a monitor, a PDF in a quality binder, a clean-room laminated card) is a hard requirement in every regulated and Lean environment. A `@media print` stylesheet (expand all cards, hide chrome, print-safe type) wired to `window.print()` is a near-zero-dependency fix; print-to-PDF then comes free from the browser dialog.

---

## 3. Where Ledgerium Is Genuinely AHEAD of Hand-Authored SOP Tools

This is the most important section commercially, and it deserves precision because the differentiation is real and currently under-told.

Scribe, Tango, SweetProcess, Trainual, and Whale all share one ceiling: **their SOPs are assertions.** A human (or a single screen recording) declares "this is how the task is done." The document is true on the day it is written and decays silently thereafter. None of these tools can answer the two questions that actually matter to a quality or operations leader:

1. *Is this SOP what people actually do?*
2. *Has reality drifted away from this document since it was written?*

Ledgerium can answer both — deterministically, with evidence — and is the only tool architecturally capable of it. The differentiators, made precise:

### 3.1 The "best path" is OBSERVED, not asserted

A Ledgerium SOP is derived from real recorded behavior (`buildSOP(input)` consumes normalized events + derived steps). When multiple runs exist, the engine's variant analysis identifies the *dominant* path — meaning the documented procedure is the path people **actually** take most often, not the path someone *thinks* they should take. Scribe records one person once; Ledgerium can represent the consensus of N executions. This is the difference between an anecdote and a standard.

### 3.2 Deterministic and reproducible

`processSessionFull` is pure and deterministic (same input → same SOP), and `validateRenderedSOP` is a hard quality gate that rejects SOPs with banned recorder artifacts, too few steps, evidenceless steps, empty expected outcomes, generic titles, or boilerplate purposes (`sopValidator.ts:101–175`). No hand-authoring tool gates output quality at all — an empty or nonsensical Scribe is shippable. Ledgerium structurally cannot emit a generic-title, evidenceless SOP. That is an enterprise-trust property worth naming explicitly.

### 3.3 Evidence-linked at the step AND event level

Every step traces to `sourceEventIds`; every instruction traces to a `sourceEventId`. The claim "this step happens" is not editorial — it is backed by a recorded event that can be pointed to. This is the literal definition of Ledgerium's audit-honesty positioning, and no competitor offers it. (Today it is mostly invisible in the UI — see §2.1 / the prior review §2 — but the linkage exists in the data.)

### 3.4 The living-SOP capability: alignment scoring + drift detection — BUILT and DARK

This is the crown jewel and it is dormant.

- **`analyzeSopAlignment(sopSteps, runs, dominantVariant)`** (`sopAlignmentEngine.ts:83`) computes, deterministically and evidence-linked:
  - **`alignmentScore` (0–1)** + level (`high`/`moderate`/`low`/`critical`) — how well the documented SOP matches actual execution.
  - **`undocumentedSteps`** — step types people do in reality that the SOP omits (with frequency and typical position).
  - **`unusedDocumentedSteps`** — SOP steps almost nobody actually performs.
  - **`driftIndicators`** — typed `missing_step` / `extra_step` / `reordered` / `frequency_mismatch` with severity.
  - **`alignedRunCount / totalRunCount`** — "X of Y runs match this SOP."
- **`computeDocumentationDrift(...)`** (`standardizationScorer.ts`) inverts alignment into a **0–100 drift score** with a level ladder (`aligned` ≤20 / `minor_drift` ≤40 / `significant_drift` ≤60 / `outdated`), plus human-readable findings ("N step types observed in real execution but not documented," "only X of Y runs align — less than 50%").

**No SOP tool on the market has this.** A Ledgerium SOP could carry a live badge — *"Conformance: 86% · Aligned · based on 14 runs · last checked 2026-06-14"* — that turns a static document into a monitored control. When reality drifts (a team adopts a new step, skips a documented one, reorders the flow), the SOP would *say so*, with evidence, and prompt a re-derivation. This is the "SOP that knows when it's wrong." It is the strongest moat in the product and it renders nowhere.

**Sharpened positioning statement:** *Every other SOP tool gives you a document that is true the day you write it. Ledgerium gives you a procedure derived from what your team actually does — that scores its own conformance to reality and tells you, with evidence, the moment it drifts out of date.*

---

## 4. The Honesty Boundary

Ledgerium's own operating principle is *Evidence before interpretation; reality before opinion.* The SOP surface must never imply more than was observed. Flagged risks (building on prior review §3, not repeating it):

### 4.1 Single-run SOPs presented as standards

A one-recording SOP is a **hypothesis**, not a standard. Nothing in the header or Quick Start discloses the run count. **Always render "Based on N recording(s)"**; when N=1, label it explicitly ("Single recording — verify before distributing"). This is doubly important because §3.1's "best path" framing is only honest when N>1 — with N=1 there is no "best," only "the one observed." The "best path"/"dominant variant" language must be *suppressed or qualified* at N=1.

### 4.2 The "best path" / "dominant variant" framing

When the alignment/drift engines are wired (recommended), the copy must not call the documented path "best" or "optimal" — the engine measures *frequency*, not *quality*. The honest framing is "most-observed path" or "dominant observed variant." A frequently-taken path full of friction is common, not good. The friction layer already proves the path can be common *and* bad simultaneously — the copy must respect that.

### 4.3 Inferred expected outcomes shown with a "verified" check

`buildExpectedOutcome` infers the result from step category and event types — it is **not** confirmed by an observed system-state event. The green checkmark (`SOPExecutionMode.tsx:365`) reads as "verified." Distinguish **observed** outcomes (a navigation/system event actually confirmed success) from **inferred** ones (e.g., append "expected based on the observed pattern" or use a hollow/outline check for inferred vs solid for observed).

### 4.4 The disabled "Ask This Process" panel

`SOPIntelligenceMode.tsx:533` renders "Ask This Process" with a *disabled input + disabled prompt buttons* and "AI conversation coming soon." A disabled-but-present input reads as a *broken* feature, not a *planned* one — it actively erodes trust in a product whose whole pitch is trustworthiness. **Replace with a static "coming soon" tile, no input element**, matching the audit-honest pattern used elsewhere in the product (the PresetChipRail "Coming in an upcoming release" convention). Same recommendation as prior review §3.4 — re-affirmed here at higher priority because it sits inside the surface that is supposed to *prove* Ledgerium is honest.

### 4.5 "Confidence: 84%" with no definition

The header shows a confidence percentage with no inline meaning. A number without a definition invites the reader to invent one. Attach `confidenceLabel` as a tooltip/sub-label; never show the percentage bare (prior review §3.2 — re-affirmed).

---

## 5. The Highest-Impact Moves to Become World-Class (ranked, honest)

Ranked by (operator value × honesty integrity) ÷ cost. Each notes whether it is a **render** of existing data, a **wire** of an existing engine, or **new capture/work**.

> **Move 1 — Per-step visual evidence (P0, the category-defining move).**
> *Phase A (render, ~zero cost):* a "Where this happens" line per step — `In {applicationLabel} · {pageTitle}` + route/URL chip, sourced from each instruction's `sourceEventId → page_context`. Ships the evidence linkage immediately and makes the moat visible.
> *Phase B (capture+render, the real investment):* render the actual captured screenshot per instruction keyed by `sourceEventId`, with a highlight box from `target_summary.selector`. This is Scribe parity and the highest-leverage single investment in the product. Honest framing: each shot is labeled with its source event so it is evidence, not decoration.

> **Move 2 — Render scope, per-step role, and per-step inputs (P0, pure render of existing data).**
> Add `metadata.scope` to the Quick Start card; add "Performed by: {actor}" and an "Inputs needed" chip row inside each expanded step (`SOPViewStep.actor` / `.inputs` already populated). Near-zero cost, zero honesty risk, closes three §1 anatomy gaps at once. This is the cheapest credibility gain available.

> **Move 3 — Wire the alignment + drift engines as a live "Conformance / Freshness" signal (P0–P1, wire existing engines).**
> Surface `documentationDrift` level + `alignmentScore` + `alignedRunCount/totalRunCount` as a header badge ("Conformance 86% · Aligned · 14 runs · checked {date}") and a dedicated "Conformance & Drift" section listing `undocumentedSteps`, `unusedDocumentedSteps`, and `driftIndicators` with a "Re-derive SOP" CTA when drift ≥ significant. This is the one capability no competitor can match. It requires N>1 runs; gate the badge to appear only when run count supports it, and render "Based on 1 recording — conformance available after more runs" at N=1 (which also discharges §4.1 honestly).

> **Move 4 — Run-count disclosure + N=1 honesty (P0, render + copy).**
> "Based on N recording(s)" always in the header; suppress/qualify "best path" language at N=1; "Single recording — verify before distributing" advisory. Discharges §4.1 and §4.2. Trivial cost, high trust impact.

> **Move 5 — A dedicated "Do mode" guided-execution surface (P1, new UI over existing data).**
> One-step-at-a-time focus, large targets, the per-step screenshot (Move 1), the expected outcome, a "mark done & next" control feeding the existing completion checklist. Converts the SOP from a document into an execution tool. Reuses `expandedSteps` + completion-criteria interactivity already present.

> **Move 6 — Print stylesheet + PDF (P1, low cost).**
> Add `@media print` (expand all cards, hide chrome, print-safe type), wire the already-imported `Printer` button to `window.print()`; PDF then comes free from the browser print dialog. Closes the point-of-use-availability gap (ISO 9001 §7.5.3.2). Re-label "Export" → "Export Markdown" so the format is honest.

> **Move 7 — Real version/approval/date metadata (P1, small model + render).**
> Stop showing the engine schema version as the document revision. Render `metadata.createdAt` ("Generated {date}"), add a human revision counter that increments on re-derivation, and add an optional owner/approver field. This is table-stakes for ISO/GMP credibility and currently absent.

> **Move 8 — Replace the disabled "Ask This Process" input with an honest coming-soon tile (P1, copy/markup).**
> Discharges §4.4. Removes a broken-looking element from the surface that is meant to *prove* honesty.

> **Move 9 — Distinguish observed vs inferred expected outcomes (P2, render + copy).**
> Solid check = observed (confirmed by a system/navigation event); outline check + "expected from observed pattern" = inferred. Discharges §4.3.

> **Move 10 — Make the evidence/provenance actionable per step (P2, render).**
> Per-step "observed N times · last seen {date}" line and a "View backing evidence →" link from the provenance footer to the Report/evidence tab. Turns the evidence claim from a stated property into a verifiable one. (Aligns with prior review §5.5.)

**Honest sequencing:** Moves 2 and 4 are free wins — ship first. Moves 1A, 3, and 6 are the differentiators and the credibility floor — ship next. Move 1B (real screenshots) is the big rock and the category-defining bet — it deserves its own dedicated effort. Moves 5/7–10 are quality and honesty hardening.

---

## 6. Overall Grade vs. World-Class SOP

**Grade: C+** today, with an unusually short path to **A−**.

| Dimension | Grade | Rationale |
|---|---|---|
| **Data model / engine completeness** | **A** | The `SOP`/`SOPStep`/`SOPInstruction` model + alignment/drift engines exceed the category. Almost nothing needs inventing. |
| **Step structure & instruction quality** | **B+** | Numbered, imperative, action/verify/note separation, decision blocks, completion checklist — genuinely strong standard-work structure; gated by `validateRenderedSOP`. |
| **Visual evidence (screenshots)** | **F** | The single defining element of modern SOP tools is absent — despite the capture data existing. This one F drags the whole grade. |
| **Rendered completeness (scope/role/inputs/version/date)** | **C−** | Multiple required elements are computed and hidden. Pure render debt. |
| **Honesty / audit integrity** | **B−** | Strong foundation (evidence linkage, quality gate, friction honesty) undercut by undisclosed run count, inferred-as-verified outcomes, and a broken-looking disabled AI panel. |
| **Differentiation realized in the UI** | **D+** | The moat (observed best-path, deterministic, evidence-linked, self-scoring conformance) is real but mostly dark. The product is far better than it presents. |
| **Point-of-use / print / offline** | **D** | Markdown-only export; dead Printer button; no print stylesheet. |

**Why C+ and not lower:** the foundation is excellent and the deficits are overwhelmingly render/wire problems on data and engines that already exist. **Why not higher:** a work instruction with no visual evidence, no rendered scope/role, no real version/date, and no print is not yet distributable to a frontline operator in a quality-controlled environment.

**The path to A− is short and unusually low-risk:** ship Moves 2 + 4 (free), then 1A + 3 + 6 (cheap, and 3 is the moat), then commit to Move 1B (screenshots) as the flagship investment. Do that and Ledgerium is not merely competitive with Scribe/Tango/SweetProcess — it is in a category they cannot enter: **the SOP that is derived from reality and knows when it has drifted from it.**

---

## References (standards & practice cited)

- **ISO 9001:2015 §7.5.3** — documented information must be identifiable, current, suitable, controlled (version/date/approval), and *available at the point of use* (drives Moves 6, 7, and the print/PDF requirement).
- **Lean standard work** — the standard-work combination of task, sequence, **time**, and the *visual standard* (drives per-step time budget and per-step screenshot).
- **ICH Q7 / GMP batch-record discipline** — one verifiable action per line, expected result per step, signed/dated/versioned (drives single-action steps, expected outcome per step, version/approval).
- **Minimalist instruction design (Carroll)** + Microsoft/Atlassian UI-procedure style guides — show the screen, highlight the target, one imperative per step (drives the screenshots-per-step and Do-mode recommendations).
- **Category practice — Scribe, Tango, Guidde, iorad** — auto-captured screenshot-per-action with element highlight + PDF/print/share as the de-facto floor; **SweetProcess, Trainual, Whale** — role-per-step, version history, role-to-procedure linkage. None offer observed-best-path, deterministic generation, evidence linkage, or conformance/drift scoring — Ledgerium's uncontested ground.

*All Ledgerium-specific claims are grounded in direct source reading of the shipped components and engines; no speculative capability has been attributed. Capabilities labeled "compute-but-not-render" are verifiable at the cited file and field.*
