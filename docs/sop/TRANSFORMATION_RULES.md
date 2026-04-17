# Ledgerium SOP Transformation Rules

**Status:** Specification — governs `buildSOP()` and the render layer
**Version:** 1.0
**Upstream:** `packages/schema-events/src/canonical-event.schema.ts`
**Downstream:** `packages/process-engine/src/sopBuilder.ts`, `templates/sopTemplates.ts`

---

## 1. Purpose

Define the deterministic pipeline that transforms a stream of
`CanonicalEvent`s into a rendered SOP. Every rule is deterministic: the same
input produces the same output, every time, on any machine. Every transformation
preserves a back-reference to its source `event_id`s.

This is the operational core of Ledgerium's trust promise.

---

## 2. Pipeline overview

```
CanonicalEvent[]                         — input (immutable)
    │
    ├─ 1. INGEST                         — validate + index
    │
    ├─ 2. NORMALIZE                      — already done upstream in recorder
    │
    ├─ 3. DEDUPLICATE                    — collapse noise
    │
    ├─ 4. SEGMENT                        — boundaries → DerivedSteps
    │
    ├─ 5. CLASSIFY                       — GroupingReason per step
    │
    ├─ 6. INFER BUSINESS ACTION          — title each step in imperative voice
    │
    ├─ 7. EXTRACT CONTEXT                — systems, roles, prerequisites
    │
    ├─ 8. DETECT DECISIONS & ERRORS      — branch points
    │
    ├─ 9. DERIVE I/O                     — inputs, outputs, completion criteria
    │
    ├─ 10. SCORE CONFIDENCE              — per step + aggregate
    │
    ├─ 11. SELECT TEMPLATE               — operator / enterprise / decision
    │
    ├─ 12. RENDER STRUCTURED SOP         — fill the template envelope
    │
    ├─ 13. ATTACH EVIDENCE MANIFEST      — per-step + document-level
    │
    ├─ 14. VALIDATE                      — reject poor output
    │
    └─ 15. EXPORT                        — Markdown / Web / PDF / DOCX
```

Stages 1–10 are implemented in `packages/process-engine/src/` today.
Stages 11–15 are implemented in `packages/process-engine/src/templates/`.
This document specifies the **rules** that govern each stage.

---

## 3. Stage 1 — Ingest and index

### 3.1 Preconditions
- Input must conform to `CanonicalEventSchema` from
  `packages/schema-events/src/canonical-event.schema.ts`.
- `session_id` is non-empty and identical across all events.
- `schema_version === '1.0.0'`.
- `t_ms` is monotonically non-decreasing.

### 3.2 Rules
- Build an index: `Map<event_id, CanonicalEvent>`.
- Build an ordered list sorted by `(t_ms, event_id)` for deterministic tie-breaks.
- Reject the session if any precondition fails — emit a typed error, never a
  partial SOP.

---

## 4. Stage 3 — Deduplicate

Noise suppression. The SOP must not repeat micro-actions that the user did not
perceive as distinct.

### 4.1 Input-change deduplication
Implemented today in `sopBuilder.ts::deduplicateInputChanges`. Rule:
> For each `interaction.input_change` with the same `target_summary.label`
> within the same step, keep only the **last occurrence**. Preserve its
> original time position.

### 4.2 Repeated-click coalescing
If two `interaction.click` events target the same `selector` within 800ms
and no other event occurs between them, collapse them. Source evidence retains
both `event_id`s (the second is a duplicate for noise).

### 4.3 Loading pair collapsing
`system.loading_started` immediately followed by `system.loading_finished`
within a single step renders as one "Wait for system to finish processing" line.

### 4.4 Discarded event types
These types are removed from SOP instruction output entirely:
- `system.window_blurred`
- `system.window_focused`
- `system.visibility_changed`
- `system.capture_blocked`
- `session.paused` / `session.resumed`
- `derived.*`

Their `event_id`s remain in `evidenceManifest.totalEvents` for traceability,
but they do not produce visible instruction lines.

---

## 5. Stage 6 — Infer business action

This is the stage where recorder artifacts ("Click the div") are forbidden
and human language is required.

### 5.1 The anti-recorder rules

No SOP output line may contain these strings:
- `"Click the div"` · `"Click the span"` · `"Click the svg"`
- `"Interact with element"` · `"Perform action"`
- `"Click the p"` · `"Click the li"` · `"Click the section"`
- Any bare HTML element name as a label

This is enforced by the validator (§9 of `SCHEMA.md`) — output containing any
of these strings is rejected.

### 5.2 The label-resolution ladder

For every event, derive the human-meaningful target label by walking this
ladder and stopping at the first hit:

| Priority | Source | Example |
|----------|--------|---------|
| 1 | `target_summary.label` (if non-empty and non-whitespace) | `"Upload file"` |
| 2 | `target_summary.role` if in the **semantic role allow-list** | `"button"`, `"link"`, `"tab"`, `"menuitem"`, `"option"`, `"checkbox"`, `"radio"`, `"switch"`, `"combobox"`, `"listbox"`, `"textbox"` |
| 3 | `page_context.pageTitle` (non-generic) | `"Invoices — Create New"` |
| 4 | `page_context.routeTemplate` + `applicationLabel` | `"/invoices/new (NetSuite)"` |
| 5 | `page_context.applicationLabel` alone | `"NetSuite"` |
| 6 | The literal string `"the target element"` (absolute fallback) | — |

The current implementation in `sopBuilder.ts::safeTargetLabel` and
`enrichedPageLabel` follows this ladder well. **Preserve this logic** — it is
one of the codebase's strongest assets.

### 5.3 Generic page-title filter

These titles are treated as generic and trigger the fallback:
`home`, `dashboard`, `main`, `index`, `welcome`, `loading`, `untitled`,
`new tab`, `about:blank`.

### 5.4 Step-title imperative voice

Every step title must start with an imperative verb. The current
`contentEnricher.ts::cleanStepTitle` handles this; rules:

- If the raw step title starts with "Clicking", rewrite as "Click".
- If it starts with a noun phrase, prepend the most likely verb derived from
  the dominant event type (`"Fill"`, `"Submit"`, `"Upload"`, `"Navigate to"`).
- If still no imperative verb, use the `buildAction()` deriver in
  `sopBuilder.ts` which already maps `GroupingReason` → action phrase.

---

## 6. Stage 7 — Extract context

### 6.1 Systems
Implemented via `stepAnalyzer.ts::uniqueSystems`. Rule: unique non-empty
`page_context.applicationLabel` values, sorted by frequency descending, alphabetically tiebroken.

### 6.2 Roles
Implemented via `contentEnricher.ts::inferRoles`. Preserve these heuristics:
- 1 system → `["Operator"]`
- 2 systems with clear handoff → `["Cross-functional operator"]`
- File-upload steps present → add `"Document preparer"` role
- Approval-shaped actions present (buttons labeled "Approve"/"Reject") → add `"Approver"`

### 6.3 Prerequisites
Implemented via `contentEnricher.ts::generatePrerequisites`. Rules:
- Always include: `"Access to: {systems.join(', ')}"`
- If any `interaction.upload_file` event: add `"The workflow file to upload"`
- If any `interaction.input_change` with a sensitive field: add
  `"Required data values (sensitive — handle per policy)"`

### 6.4 Inputs / Outputs
Handled in `sopBuilder.ts::buildSOPInputs` and `buildSOPOutputs`. Preserve.

---

## 7. Stage 8 — Detect decisions and errors

### 7.1 Decision-point detection
A step is a decision point when any of:
1. It is followed by a step with `category === 'error_handling'`, meaning
   validation could fail here.
2. Its events include a `system.error_displayed` OR a `system.modal_opened`
   whose next user action branches.
3. `contentEnricher.ts::detectDecisionPoints` returned it.

The decision label defaults to:
- `"Did the {action} succeed?"` if followed by an error step
- `"Is the {system} response as expected?"` if followed by a branching modal
- Otherwise the decision label from `detectDecisionPoints`

### 7.2 Error path grouping
Consecutive events of `system.error_displayed` + subsequent user retry events
form an `error_handling` step. The Decision-Based template promotes these into
explicit branches.

---

## 8. Stage 10 — Confidence model

This is the **visible uncertainty** contract. Confidence is a float in `[0, 1]`
computed per step and aggregated per document.

### 8.1 Per-step confidence (`SOPStep.confidence`)

Already computed in `stepAnalyzer.ts::analyzeStep`. Current inputs:
- Segmentation confidence (from the derived step)
- Event label confidence
- Page-title confidence
- Recorder selector confidence (worst-case across step's events)

Proposal: expose the breakdown as optional `SOPStep.confidenceBreakdown` for
diagnostics. Non-breaking.

### 8.2 Confidence bands (render contract)

| Band | Range | Visible treatment |
|------|-------|-------------------|
| High | ≥ 0.85 | No per-step glyph; normal text |
| Medium | 0.70–0.85 | Small dim dot `·` after step title |
| Low | < 0.70 | Amber `⚠` after step title; advisory in document header |

### 8.3 Document-level quality badge

Derived deterministically from `QualityIndicators`:

```
high     if averageConfidence >= 0.85 AND lowConfidenceStepCount == 0
low      if averageConfidence < 0.70 OR lowConfidenceStepCount >= 3
medium   otherwise
```

### 8.4 The quality advisory callout

If `lowConfidenceStepCount > 0`, the renderer includes an above-the-fold
callout listing the affected step ordinals. This is the `buildQualityAdvisory`
logic in `sopTemplates.ts` — keep it, but **promote it from a trailing
paragraph to an above-the-fold element** in all three templates.

---

## 9. Stage 11 — Template selection

Today's `templateSelector.ts` already implements deterministic rules.
Preserve them; this section formalizes them.

### 9.1 SOP selection decision tree

```
┌─ stepCount < 2 ────────────────── REJECT (validator §8.2)
│
├─ branchRatio >= 0.30 ────────────┐
│   OR (decisionPoints >= 2        │
│       AND errorSteps >= 2)       ├─► decision_based
│   OR (hasCommonIssues            │
│       AND branchRatio >= 0.20)   │
│                                  │
├─ systemCount >= 3 ───────────────┐
│   OR (stepCount >= 8             │
│       AND systemCount >= 2)      ├─► enterprise
│   OR (stepCount >= 10            │
│       AND hasFriction)           │
│                                  │
└─ DEFAULT ────────────────────────► operator_centric
```

Where:
- `branchRatio = (decisionStepCount + errorStepCount) / stepCount`
- `hasCommonIssues = sop.commonIssues.length > 0`
- `hasFriction = sop.frictionSummary.length > 0`

### 9.2 Manual override

The selector accepts a `TemplateOverrides` parameter. The rationale string
must reflect the override explicitly: `"Manual override"` — already implemented.

---

## 10. Stage 12 — Fill the template envelope

### 10.1 Operator-Centric filling rules

| Field | Derivation |
|-------|-----------|
| `taskTitle` | `sessionJson.activityName`, cleaned of prefixes like "SOP:" |
| `whatThisIsFor` | `sop.businessObjective` OR `sop.purpose` |
| `whenToUseIt` | `sop.trigger` OR derived from verb pattern via `deriveWhenToUseIt` |
| `beforeYouBegin` | `sop.prerequisites` — verbatim |
| `systemsNeeded` | `sop.systems` |
| `steps[n].action` | `step.title` (already imperative) |
| `steps[n].detail` | `primaryInstruction(step)` — action-type instructions only, joined |
| `steps[n].expectedResult` | `step.expectedOutcome` |
| `steps[n].caution` | `stepCaution(step)` |
| `commonMistakes` | `deriveCommonMistakes(output)` |
| `tips` | `deriveTips(output)` |
| `completionCheck` | `sop.completionCriteria` |

### 10.2 Enterprise filling rules

Maps cleanly from `SOP` → `EnterpriseSOP` via `renderEnterprise()` in
`sopTemplates.ts`. Additional rules:

- `procedure[n].actor` — use `step.actor` if present, else the first role.
- `procedure[n].inputs` — `stepDef.inputs` ∪ `step.inputs`.
- `procedure[n].outputs` — `stepDef.outputs`.
- `procedure[n].verificationPoint` — `step.expectedOutcome`.
- `decisionPoints` — `sop.steps.filter(isDecisionPoint)`.

### 10.3 Decision-Based filling rules

Covered by `renderDecisionBased()`. Additional rules:
- `branches[0]` is always the observed happy path.
- Each subsequent branch is an observed error path.
- `branches[n].condition` phrases the branch as a question answer.
- `branches[n].outcome` is the observed or expected end state.

---

## 11. Stage 13 — Evidence manifest attachment

Required for all three templates. Build the manifest deterministically:

```
evidenceManifest.totalEvents    = |all source_event_ids referenced|
evidenceManifest.eventsByType   = groupBy(event.event_type, count)
evidenceManifest.stepToEvents   = {ordinal: source_event_ids} for each step
evidenceManifest.sensitiveCount = |events with isSensitive=true|
evidenceManifest.redactedCount  = |events with redactionApplied=true|
```

Every step in every template must expose its `evidenceEvents: string[]`.
The validator rejects any step with an empty list.

---

## 12. Stage 14 — Validation

The validator is a pure function: `(RenderedSOP) → ValidationResult`.
Rules were enumerated in `SCHEMA.md` §8. Rendering failure is a hard stop.

On rejection, the pipeline emits:
```jsonc
{
  "ok": false,
  "reason": "step_4_has_no_evidence",
  "diagnostic": "Step 4 in the enterprise template has no evidenceEvents; all steps must be traceable.",
  "suggestion": "Re-run the builder with a rebuilt evidenceManifest, or escalate the recording quality."
}
```

---

## 13. Stage 15 — Export

The Markdown renderer in `templates/markdownRenderer.ts` is the canonical form.
Web/PDF/DOCX exporters derive from the structured JSON envelope, not the Markdown.
Rules:

- Markdown is **generated from the structured SOP**, not edited by hand.
- PDF exporter receives the structured SOP + design tokens from `DESIGN_SYSTEM.md`.
- DOCX exporter maps sections to Word styles defined by the design system.
- Web renderer consumes the structured SOP and produces interactive React components.

No round-trip from exported formats back to the structured SOP is supported.

---

## 14. Determinism invariants

Any of these breaking means the pipeline is buggy:

| Invariant | Test |
|-----------|------|
| Same session → same SOP, byte-identical | Run `buildSOP()` twice on same input; diff output |
| Template selection is pure | `selectTemplates(output)` has no side effects and reads only `output` |
| Evidence IDs survive | `evidenceManifest.totalEvents` equals unique source events across all steps |
| No stochastic tie-breaks | Sort keys always include `event_id` or `ordinal` as final tiebreak |
| Time zones are UTC | All ISO 8601 timestamps end in `Z` |

---

## 15. Rules this document **deliberately does not** specify

- **Visual mockups** of the web UI — `COLLABORATION_REQUESTS.md` hands that to
  the ux-designer agent.
- **Exact PDF page layouts** — handled by a future `pdfExporter.ts` spec.
- **Internationalization** — out of scope for v1; proposed as future work in
  `IMPLEMENTATION_NOTES.md`.
- **Organization-specific style adaptation** — a future AI feature; not yet
  wired into the deterministic pipeline.

---

## 16. Summary — what an engineer implements

Given the existing code, these transformation rules require:

1. **Preserve** everything in `sopBuilder.ts`, `contentEnricher.ts`,
   `stepAnalyzer.ts`. They are strong assets.
2. **Add** the `metadata` and `evidenceManifest` hoisting in
   `templates/sopTemplates.ts` (about 30 LOC per template).
3. **Add** per-step `confidence` and `evidenceEvents` fields in the rendered
   template artifacts (about 5 LOC per step builder).
4. **Add** a new `templates/sopValidator.ts` implementing §8.2 of SCHEMA.md
   (about 60 LOC).
5. **Promote** the quality advisory above the fold in
   `templates/markdownRenderer.ts` (about 15 LOC).

Total: ~120–150 LOC for the full uplift. No existing tests break.
