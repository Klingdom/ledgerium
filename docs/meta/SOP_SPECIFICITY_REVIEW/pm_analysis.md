# SOP Specificity — PM Analysis

**Mode 3-adjacent DESIGN review. Zero code changes. Pure artifact.**
**Date:** 2026-07-04
**CEO directive:** "make SOP details less vague whenever possible"
**Status:** DRAFT — awaiting specialist reviews from system-architect and UX

---

## 1. Problem Statement

### What is happening

Ledgerium produces SOPs from recorded browser behavior. When the SOP builder cannot resolve a label for an interaction, it degrades to generic fallback text. The following strings are reaching end users in production:

- "Click the target element"
- "Click action in App"
- "Enter data in cells A16 in App"
- "Enter the required value"
- "Submit the form"

These instructions contain no object, no field name, no business context, and no indication of what correct execution looks like. A reader cannot reproduce the step without already knowing what to do.

This is not a data-quality accident — it is a structural gap. The system captures rich DOM context but does not carry it through to the instruction layer.

### Who is hurt and how

**SOP reader / operator:** The person executing the procedure receives no actionable information at the steps where it matters most. "Click the target element" fails the only test that matters: can someone who has never seen this workflow execute the step correctly? It cannot.

**Enterprise reviewer:** An auditor or compliance officer comparing the SOP to actual system behavior cannot verify the recorded action against the instruction. "Enter the required value" matches every input interaction in every workflow — it traces to nothing.

**Ledgerium's evidence-linked value proposition:** Ledgerium's entire positioning is that SOPs are derived from *observed evidence*, not written by hand. When the instruction reads "Click the target element," the link from observation to instruction has been severed. The evidence exists (the DOM was captured, the label extraction ran, neighbor context was collected) but the output does not reflect it. This directly contradicts the determinism + traceability principles the platform is built on.

### Root causes (verified in code)

Four root causes have been confirmed by reading source files. They are independent — each can be fixed independently.

| ID | Location | Confirmed |
|----|----------|-----------|
| RC-1 | `packages/normalization-engine/src/normalizer.ts` + `CanonicalEventInput` schema | `value_present` boolean and interaction-type semantics (drag, keyboard) dropped from `RawEvent` at normalization; never reach sopBuilder |
| RC-2 | `apps/extension-app/src/content/label-extractor.ts:203–208`, `neighbor-context-extractor.ts` | `extractLabelWithContext` returns `{ label, neighborContext }` with 5 context fields (modal title, table column, breadcrumb, active tab, nearby labels). `neighborContext` is NOT present in `CanonicalEvent.target_summary` schema; it is discarded before normalization. sopBuilder.ts never sees it. |
| RC-3 | `label-extractor.ts:47` + `neighbor-context-extractor.ts:45` | `LONG_DIGITS_RE = /\d{5,}/` suppresses labels containing invoice IDs, order numbers, any token with 5+ consecutive digits after stripping spaces and dashes. `MAX_LABEL_WORDS = 12` suppresses descriptive button text with 12+ words. Same heuristics applied independently in both files. |
| RC-4 | `packages/process-engine/src/templates/sopValidator.ts:27–36` | `BANNED_RECORDER_STRINGS` contains exactly 8 strings (raw tag names). It does not include any of the 14 graded-fallback strings that sopBuilder emits when label resolution fails. The validator passes every vague step that does not happen to be one of the 8 tag-name strings. |

**RC-2 depth note:** The label-extractor.ts JSDoc (line 196) states the neighborContext "is serialised into `target_summary.neighborContext` in the canonical event." This is aspirational — it is not implemented. The `CanonicalEvent.target_summary` type in normalization-engine and the `CanonicalEventInput.target_summary` type in process-engine both lack a `neighborContext` field. The data exists in the browser at capture time; it is never serialized.

---

## 2. Specificity Acceptance Criteria

A rendered SOP instruction is **specific enough** when it satisfies ALL of the following:

**SC-1 Names the object or field.**
The instruction identifies what was interacted with. Acceptable: "Click Save Invoice", "Enter the Amount field", "Select Accounts Payable from the dropdown". Not acceptable: "Click the target element", "Enter the required value".

Testable: `instruction` does not match any string in `GRADED_FALLBACK_STRINGS` (see Section 3) AND (`targetLabel` is non-null OR the instruction contains a noun other than "element", "target", "value", "form", "field").

**SC-2 Specifies the interaction type when non-obvious.**
Drag operations, keyboard shortcuts, and multi-step sequences name the interaction. Clicking a button does not require elaboration. Testable: for `event_type = 'interaction.drag_started'` or `interaction.keyboard_shortcut'`, the instruction names the action ("Drag [source] to [destination]" or "Press [shortcut key]").

**SC-3 Includes context when the element is ambiguous in isolation.**
When the same element type appears multiple times on a page, the instruction includes modal title, table column header, or tab context. Testable: any step inside a dialog modal must reference the modal name unless the element label is already unique on the page (uniqueness is not computationally verifiable pre-ship, so this is a review criterion, not a build gate).

**SC-4 States what correct completion looks like.**
The `expectedOutcome` field contains application-specific confirmation language, not a category template. Testable: `expectedOutcome` does not exactly match a list of known boilerplate outcomes ("Action completed", "Step completed", "Navigation occurred").

**SC-5 Is not in the banned or graded-fallback set.**
Neither the `instruction` text nor any sub-phrase matches `BANNED_RECORDER_STRINGS` (existing) or `GRADED_FALLBACK_STRINGS` (proposed, see Section 3). This is a hard gate: a step that fails this criterion has failed specificity regardless of other properties.

---

## 3. Measurable Outcome: Step Vagueness Rate (SVR)

### Definition

**Step Vagueness Rate (SVR)** = count of vague instructions / total instruction count

where an instruction is **vague** if EITHER:

- Its `instruction` text starts with or equals any string in `GRADED_FALLBACK_STRINGS` (below), OR
- Its parent `SOPStep.confidence` is below `0.55` (the `lowDataFlag` threshold: segmentation assigns 0.55 to steps with no resolved element label vs 0.75 to steps with a label)

### Graded-fallback string set (GRADED_FALLBACK_STRINGS)

Enumerated from `packages/process-engine/src/sopBuilder.ts` `deriveInstruction` function — these are the strings the builder emits as last-resort fallbacks:

```
'Click the target element'
'Enter the required value'
'Submit the form'
'Page route updates'
'Switch browser tab'
'Select the required option'
'Drag element to target'
'Release at target location'
'Use keyboard shortcut'
```

Partial-match prefixes that indicate vague output even when page context is appended:
```
'Click the target element on '
'Click the target element in '
'Enter the required value on '
'Enter the required value in '
'Submit the form on '
```

### How to compute SVR over golden fixtures

All 12 golden fixture chains (normalization-engine `fixtures/golden/raw/*.ndjson` → normalized → segmented) can be run end-to-end through `processSessionFull()` from `packages/process-engine/src/index.ts`. The computation:

```
totalInstructions = sum over all SOP.steps[].instructions.length
vagueInstructions = count of instructions where:
  instruction.instruction starts with any GRADED_FALLBACK_STRING
  OR instruction's parent step confidence < 0.55
SVR = vagueInstructions / totalInstructions
```

This is deterministic and runnable in CI as a script equivalent to `apps/web-app/scripts/health-score-distribution.ts`.

### Baseline

No numeric baseline exists yet because the metric has not been instrumented. The baseline must be established by running the computation on the 12 golden fixture chains before any code changes land. The baseline measurement is the first deliverable of the IC-4 candidate (see Section 5).

### Target

Reduce SVR by 60% from baseline within the first three improvement candidates (IC-1 through IC-3). Secondary target: SVR ≤ 20% at full improvement candidate completion.

Rationale for 60% target: RC-2 (neighbor context wiring) alone is expected to resolve the majority of vague steps, because modal title + nearby labels are available for most dialog interactions — which are the most common vague-step scenario (modal button clicks and form fields inside dialogs). RC-4 (expanded detection) makes SVR computation precise. RC-3 (redaction threshold) recovers a smaller slice.

### Leading indicators (before SVR is instrumented)

- Count of instructions matching `GRADED_FALLBACK_STRINGS` per fixture run (computable today from any rendered SOP)
- Count of steps with `confidence < 0.55` per session (already in `SOPStep.confidence`)
- Count of instructions where `targetLabel` is null (available in `SOPInstruction.targetLabel`)

---

## 4. Scope Boundaries

### IN scope

**Deterministic enrichment from captured context (RC-2)**
Wiring the neighbor context that is already extracted by `extractLabelWithContext` through the canonical event schema into sopBuilder.ts. The extractor is fully implemented (313 lines). The fix is schema plumbing + consumption logic. No new data is captured; no privacy surface changes.

**Threshold recalibration for over-redaction (RC-3)**
Adjusting `LONG_DIGITS_RE` and `MAX_LABEL_WORDS` constants in label-extractor.ts and neighbor-context-extractor.ts. The CC_RE, SSN_RE, EMAIL_RE, PHONE_RE patterns remain. The adjustment allows invoice IDs and descriptive labels through while preserving all existing PII guards.

**Expanding the vague-string detection set (RC-4)**
Adding `GRADED_FALLBACK_STRINGS` to sopValidator.ts as a second named constant alongside `BANNED_RECORDER_STRINGS`. Adding an SVR computation to `validateRenderedSOP` output. No behavioral change to existing validation rules — this is additive.

**Passing value_present boolean through CanonicalEvent schema (RC-1)**
Adding `valueFilled?: boolean` to `CanonicalEvent.target_summary` from `raw.value_present`. Consuming in sopBuilder.ts to distinguish "fill an empty field" from "update a pre-filled field". Additive schema change; no PII risk (boolean only, not the value).

**SVR baseline measurement script**
A deterministic script (no DB connection required in its fixture-based form) that runs `processSessionFull` on the 12 golden fixture chains and outputs SVR per fixture + aggregate. Equivalent in pattern to `health-score-distribution.ts`.

### EXPLICITLY OUT of scope

**LLM rewriting in the core SOP generation path**
No LLM call may be inserted into `sopBuilder.ts`, `contentEnricher.ts`, or `validateRenderedSOP`. The Ledgerium determinism invariant requires same-input → same-output. LLM calls are non-deterministic by nature and would break the traceability chain. Any LLM-assisted enrichment is a separate opt-in layer outside the core pipeline and is not part of this review.

**Un-redacting real PII**
The goal is to recover *labels* (button text, field names, modal headings) that were incorrectly suppressed by overly aggressive regex. The goal is NOT to expose values that users typed into fields. `target_summary.label` is a UI element name; it is not user-entered data. Redaction of `target_value` / `value_present` actual content is not being relaxed.

**Screenshots or visual context**
Screenshot capture for step illustration is outside scope. The specificity improvement being addressed here is text instruction quality, derivable from DOM structure without screenshot infrastructure.

**Rewriting existing SOPs retroactively**
SVR improvements apply to newly generated SOPs. Retroactive reprocessing of stored SOPs is a separate operational decision outside this review's scope.

**Per-step LLM quality scoring**
Automated LLM-based scoring of instruction specificity (distinct from the deterministic SVR metric) is out of scope. SVR is deterministic and computable in CI; LLM scoring is not.

---

## 5. Ranked Improvement Candidates

Candidates are ordered by expected SVR reduction per implementation effort, so they form a natural burn-down sequence. Each is independently shippable.

---

### IC-1: Wire neighbor-context evidence through CanonicalEvent schema into sopBuilder

**Root cause:** RC-2

**Problem:** `extractLabelWithContext` (label-extractor.ts:203) captures a `NeighborContextEvidence` object with 5 fields — modal title, table column header, breadcrumb trail, active tab label, and nearby labels. This object is discarded before the event is serialized. It never reaches sopBuilder.ts. The extractor is fully implemented and battle-tested (313 lines, safety heuristics applied). The connection simply was not made.

**Expected benefit:**
- When a click event has no primary element label, the modal title ("Approve Invoice", "Add Line Item", "Confirm Deletion") becomes the context for the instruction.
- When a field has no aria-label, the table column header ("Amount", "Vendor Name", "Due Date") provides the context.
- These two signals alone cover the majority of vague-step scenarios in enterprise SaaS workflows, which predominantly use modal dialogs and data tables.
- Expected SVR reduction: 40–55% from baseline.

**Rough estimate:**
- Impact: HIGH (resolves the single largest source of vague steps)
- Effort: MEDIUM (3-layer schema change: normalization-engine CanonicalEvent type → process-engine CanonicalEventInput type → sopBuilder.ts deriveInstruction consumption logic)
- Risk: LOW (additive schema change; no new PII captured; same safety heuristics already applied to the context data at extraction time)

**Implementation surface (for architect):**
1. Add `neighborContext?: NeighborContextEvidence` to `CanonicalEvent['target_summary']` in `packages/normalization-engine/src/normalizer.ts` (the output type)
2. Pass through in `normalizeEvent` step 5 (target summary construction, normalizer.ts:356–371)
3. Add `neighborContext?` to `CanonicalEventInput['target_summary']` in `packages/process-engine/src/types.ts` (the input type)
4. In `packages/process-engine/src/sopBuilder.ts` `safeTargetLabel(evt)` and `deriveInstruction`, consult `evt.target_summary.neighborContext` in priority order: primary label → nearbyLabels[0] → tableHeader → modalTitle → activeTabLabel → graded fallback
5. Extend `packages/normalization-engine/src/full-pipeline.regression.test.ts` with a neighbor-context round-trip assertion

**Notes:** The `NeighborContextEvidence` interface is already defined in `apps/extension-app/src/content/neighbor-context-extractor.ts`. It must be promoted to a shared package (e.g., `packages/shared-types`) or re-declared in normalization-engine types to avoid a cross-package dependency on the extension-app. The intent-inference package references are aspirational — the migration path is to shared-types.

---

### IC-2: Expand vague-string detection in sopValidator + instrument SVR

**Root cause:** RC-4

**Problem:** `BANNED_RECORDER_STRINGS` in sopValidator.ts contains 8 strings, all of which are raw HTML tag names. None of the 14 graded-fallback strings that sopBuilder.ts emits as last-resort instructions are in the banned set. The validator passes every vague instruction. "Click the target element" and "Enter the required value" are not detected or measured.

**Expected benefit:**
- Every vague instruction now fails the quality gate, making vague output visible and actionable before it reaches end users.
- SVR computation becomes part of the validation output, enabling CI tracking and regression protection.
- Does not reduce SVR on its own — it makes SVR measurable, which is the prerequisite for all other improvements to be tracked.

**Rough estimate:**
- Impact: HIGH (prerequisite for metric integrity)
- Effort: LOW (constant addition + ~20 LOC SVR computation)
- Risk: VERY LOW (additive; existing 8 strings unchanged; no behavior change except for vague steps that were previously passing silently)

**Implementation surface:**
1. Add `GRADED_FALLBACK_STRINGS: readonly string[]` constant to sopValidator.ts alongside `BANNED_RECORDER_STRINGS`
2. Add Rule 7 to `validateRenderedSOP`: for each instruction in `output.sop.steps[].instructions`, check `instruction.instruction` against `GRADED_FALLBACK_STRINGS` using `startsWith` (to catch page-appended variants like "Click the target element in App")
3. Add `vaguenessRate?: number` to `SOPValidation` ok case (or as a separate `SOPQualityMetrics` return value)
4. Write a deterministic fixture-based SVR baseline script in `apps/web-app/scripts/`

---

### IC-3: Recalibrate over-redaction thresholds

**Root cause:** RC-3

**Problem:** Two constants in label-extractor.ts and neighbor-context-extractor.ts suppress legitimate labels:
- `LONG_DIGITS_RE = /\d{5,}/`: Strips any label containing 5+ consecutive digits (after removing spaces/dashes). This kills invoice IDs (INV-12345 → "INV12345" → 5 digits → suppressed), order numbers, and any reference containing a 5-digit token. Credit card numbers (16 digits) are already separately caught by `CC_RE`.
- `MAX_LABEL_WORDS = 12`: Suppresses labels with 12+ words. Descriptive button labels in enterprise forms ("Submit Application for Environmental Impact Review") are common and informative.

The constants appear identically in both label-extractor.ts and neighbor-context-extractor.ts — any change must be applied in both files.

**Expected benefit:**
- Labels suppressed by the digit threshold that are not PII (invoice IDs, order numbers, reference codes) become available to sopBuilder.
- Longer descriptive button labels become available.
- Expected SVR reduction: 5–15% from baseline (smaller than IC-1 because most vague steps are due to the missing neighbor-context wiring, not redaction).

**Rough estimate:**
- Impact: MEDIUM
- Effort: LOW (2-constant change in 2 files + test updates)
- Risk: LOW-MEDIUM (requires careful validation that the new thresholds do not allow PII through; a test fixture with edge cases — 7-digit reference numbers, 16-digit CC numbers — must be added to confirm the boundary behavior)

**Proposed thresholds:**
- `LONG_DIGITS_RE = /\d{8,}/`: Raises from 5 to 8 consecutive digits. Rationale: invoice IDs and order numbers rarely exceed 7 digits in common SaaS systems; credit card fragments (4-digit groups) are caught by `CC_RE` regardless; bank account numbers (8–12 digits) are caught at 8.
- `MAX_LABEL_WORDS = 16`: Raises from 12 to 16 words. Rationale: 16-word labels are still functionally descriptive; labels beyond 16 words are likely body copy captured from a parent container.

**Note:** Both files share the same constants but are currently not deduplicated. A follow-up to consolidate them into a shared `packages/shared-types/src/label-safety.ts` would prevent drift recurrence (out of scope for this candidate).

---

### IC-4: Pass value_present boolean through CanonicalEvent schema

**Root cause:** RC-1

**Problem:** `RawEvent.value_present` is a boolean captured by the extension indicating whether the target input element had a non-empty value at the time of interaction. This distinguishes "the user filled an empty field" from "the user updated a pre-filled field." Both produce the same `interaction.input_change` event type, but the SOP instruction is different: one is a first-time entry, the other is a correction or update. The boolean is dropped at normalization (normalizer.ts step 5, target summary construction) and never reaches sopBuilder.

**Expected benefit:**
- sopBuilder can generate "Enter [field]" for empty-to-filled vs "Update [field]" for filled-to-filled interactions.
- The distinction is meaningful in audit trails: a user updating an already-populated Amount field vs entering it for the first time is a different business event.
- Expected SVR reduction: 3–8% (narrow but meaningful for data-entry-heavy workflows).

**Rough estimate:**
- Impact: MEDIUM-LOW (covers input_change events with missing labels specifically; most vague input steps are vague because the label is missing, not because value_present is missing)
- Effort: LOW (additive boolean field, 3-layer schema change equivalent to IC-1)
- Risk: LOW (boolean, no PII; `value_present` is already captured and policy-engine evaluated)

**Implementation surface:**
1. Add `valueFilled?: boolean` to `CanonicalEvent['target_summary']` and `CanonicalEventInput['target_summary']`
2. In normalizer.ts step 5: set `valueFilled: raw.value_present ?? false` when building target summary (only when not redacted)
3. In sopBuilder.ts `deriveInstruction` for `interaction.input_change`: use `evt.target_summary?.valueFilled` to select "Enter" vs "Update" verb

---

### IC-5: Expose keyboard shortcut details in CanonicalEvent

**Root cause:** RC-1

**Problem:** The normalizer maps `keyboard_intent` raw events to `interaction.keyboard_shortcut` canonical type, but the canonical event carries no information about which shortcut was pressed. The RawEvent has `target_selector` and potentially the key combination in other fields, but this context is not forwarded. sopBuilder.ts produces "Use keyboard shortcut" for all keyboard events regardless of the actual key.

**Expected benefit:**
- "Use keyboard shortcut" becomes "Press Ctrl+S to save" or "Press Escape to dismiss" when the shortcut key is available.
- Impact is narrow (keyboard shortcuts are a minority of interactions) but the vague output is particularly confusing for users who need to reproduce the step.

**Rough estimate:**
- Impact: LOW (affects keyboard_shortcut event type only; small share of total interactions)
- Effort: MEDIUM (requires understanding the full RawEvent shape for keyboard events + extension-side capture coverage; may require changes to the content script capture layer, not just normalization)
- Risk: LOW-MEDIUM (keyboard semantics are more complex than boolean fields; the key combination must be captured correctly at content-script time before this enrichment is useful)

**Sequencing note:** IC-5 depends on confirming what data is available in `RawEvent` for keyboard events. If the key combination is not captured by the extension, this candidate requires extension-side changes first (a separate iteration). Recommend confirming extension capture coverage before scheduling.

---

## Sequencing and Dependencies

```
IC-2 (expand validator + SVR metric)   ← no dependencies; establishes baseline
  ↓
IC-3 (redaction threshold recalibration) ← no dependencies on IC-2 but schedule after to validate SVR impact
  ↓
IC-1 (neighbor-context wiring)         ← largest SVR impact; requires schema extension work
  ↓
IC-4 (value_present pass-through)      ← small additive schema change; can run parallel to IC-1
  ↓
IC-5 (keyboard shortcut details)       ← deferred until extension capture confirmed
```

IC-2 is recommended first because it makes the improvement visible and enables regression protection for all subsequent candidates. Without IC-2, there is no deterministic way to confirm that IC-1 and IC-3 actually reduced SVR.

---

## Flagged Assumptions

**A-1: neighborContext is captured at content-script time for all interaction events.**
Confirmed by label-extractor.ts:203 — `extractLabelWithContext` is the single entry point for label extraction and always invokes `extractNeighborContext`. If the capture pipeline calls `extractLabel` directly instead of `extractLabelWithContext` for some event types, those events would not have neighbor context. This should be verified by the system architect.

**A-2: The 12 golden fixture chains can be run end-to-end through process-engine.**
The fixture chains (normalization-engine raw→canonical, segmentation-engine canonical→derived) must compose with process-engine input. If `processSessionFull` requires additional metadata beyond what the fixtures provide, the SVR baseline script will need fixture supplements. The existing `health-score-distribution.ts` script confirms the pattern is viable for at least some fixture shapes.

**A-3: LONG_DIGITS_RE raising from 5 to 8 digits does not introduce PII risk.**
This requires a formal privacy review (IC-3 is flagged as MEDIUM risk partly for this reason). A security agent review is recommended before IC-3 lands.

**A-4: The NeighborContextEvidence types can be promoted to shared-types without breaking the extension build.**
The interface currently lives in `apps/extension-app/src/content/neighbor-context-extractor.ts`. Wiring it into the normalization-engine requires either re-declaring it (creating drift risk) or promoting it to `packages/shared-types`. The system architect should confirm the monorepo dependency graph permits this.

---

## Missing information (requires CEO or specialist input)

**Q1 (CEO):** Are there specific workflow categories (finance approvals, HR forms, ERP data entry) where SOP specificity failures are most damaging? Priority-ordering by workflow category would sharpen IC-1 design.

**Q2 (System Architect):** Does the content-script capture pipeline call `extractLabelWithContext` or `extractLabel` for each event type? If some event types bypass `extractLabelWithContext`, RC-2 is even larger than scoped.

**Q3 (Privacy/Security):** Is raising `LONG_DIGITS_RE` from 5 to 8 digits acceptable under the current privacy posture? Specific concern: some enterprise SaaS platforms use 6–7 digit employee IDs or account numbers as UI labels.

**Q4 (Engineering):** What is the actual `value_present` field shape in the captured RawEvent? The normalization-engine `RawEvent` interface shows `is_sensitive_target` but `value_present` is referenced by the CEO directive summary. Confirmation of the exact field name in the captured event JSON is needed before IC-4 can be scoped precisely.
