# Ledgerium SOP Schema

**Status:** Specification aligned to existing TypeScript contracts
**Version:** 1.0
**Upstream:** `packages/process-engine/src/types.ts` · `packages/process-engine/src/templateTypes.ts`
**Governs:** all JSON payloads produced by `renderSOP()` and consumed by renderers/exporters

---

## 1. Purpose

Define the canonical JSON shape of every SOP template. This schema is a
**projection** of the authoritative TypeScript interfaces in the codebase — the
TS types are the source of truth; this document is the single readable map of
them, with proposed additive extensions clearly flagged.

Every field below is either:
- ✅ **Present today** in `templateTypes.ts`, or
- 🆕 **Proposed extension** (additive, non-breaking, nullable by default).

No breaking changes are proposed. All new fields are optional so existing
renderers continue to work.

---

## 2. Top-level envelope

```jsonc
{
  "templateType": "operator_centric" | "enterprise" | "decision_based",
  // ...template-specific fields
}
```

The `templateType` field is the discriminant. All three templates share the
core envelope fields in §3 and diverge in §4–§6.

---

## 3. Shared envelope fields (all three templates)

These fields appear in all three template types. Some are currently named
differently across types; the spec proposes normalization via additive fields
rather than renames.

| Field | Type | Req | Source | Description |
|-------|------|-----|--------|-------------|
| `templateType` | enum | ✅ | TS | Discriminant — one of the three templates |
| `title` (Enterprise, Decision) / `taskTitle` (Operator) | string | ✅ | TS | Document title; plain language, no "SOP:" prefix |
| `sopId` | string | 🆕 for Operator, Decision | TS (Enterprise) | Stable opaque identifier: `{sessionId}-sop` |
| `version` | string | 🆕 for Operator, Decision | TS (Enterprise) | Semver string of the SOP — `"2.0"` today |
| `purpose` (Enterprise, Decision) / `whatThisIsFor` (Operator) | string | ✅ | TS | One sentence: why this SOP exists |
| `trigger` (Enterprise) / `triggerCondition` (Decision) / `whenToUseIt` (Operator) | string | ✅ | TS | When the SOP applies |
| `sourceNote` | string | ✅ | TS | Human-readable evidence source statement |
| `qualityAdvisory` | string \| null | ✅ | TS | Rendered when any step has low confidence |
| `qualityBadge` | `"high" \| "medium" \| "low"` | 🆕 | proposed | Above-the-fold confidence badge (see DESIGN_SYSTEM §7.3) |
| `metadata` | object | 🆕 | proposed | Unified metadata strip object (see §7) |
| `evidenceManifest` | object | 🆕 | proposed | Document-level evidence manifest (see §8) |

### 3.1 `metadata` (proposed unified sub-object)

```jsonc
{
  "metadata": {
    "sopId": "s_2026_04_17_abc123-sop",
    "version": "2.0",
    "generatedAt": "2026-04-17T14:32:11Z",
    "engineVersion": "1.2.0",
    "sessionId": "s_2026_04_17_abc123",
    "stepCount": 12,
    "systemCount": 2,
    "averageConfidence": 0.87,
    "qualityBadge": "high",
    "lowConfidenceStepCount": 0,
    "completionStatus": "complete"
  }
}
```

This object already lives in three places today (`revisionMetadata` on
Enterprise, partial in `sourceNote` on Operator/Decision, and in
`QualityIndicators` on `SOP`). The proposal is to **hoist it** into a shared
`metadata` field on every rendered SOP so renderers have a single source.

### 3.2 `evidenceManifest` (proposed)

```jsonc
{
  "evidenceManifest": {
    "totalEvents": 34,
    "eventsByType": {
      "interaction.click": 12,
      "interaction.input_change": 6,
      "interaction.upload_file": 1,
      "navigation.route_change": 5,
      "system.loading_started": 4,
      "system.toast_shown": 3,
      "system.modal_opened": 1,
      "session.started": 1,
      "session.stopped": 1
    },
    "stepToEvents": {
      "1": ["ev_01", "ev_02"],
      "2": ["ev_03", "ev_04", "ev_05"],
      "3": ["ev_06"]
    },
    "sensitiveEventCount": 0,
    "redactedEventCount": 0
  }
}
```

Lets a renderer cite evidence inline without traversing the full `ProcessOutput`.
All values derive deterministically from the `SOP.steps[].instructions[].sourceEventId`
chain.

---

## 4. `OperatorSOP` — shape

```jsonc
{
  "templateType": "operator_centric",
  "taskTitle": "Upload and Review Workflow in Ledgerium AI",
  "whatThisIsFor": "Upload a recorded workflow file and review...",
  "whenToUseIt": "When you've finished recording a process...",
  "beforeYouBegin": [ "string" ],
  "systemsNeeded": [ "string" ],
  "steps": [
    {
      "number": 3,
      "action": "Upload the workflow file",
      "detail": "Drag and drop the file onto the upload target…",
      "system": "Ledgerium AI",
      "expectedResult": "The file appears in the staging list…",
      "caution": "",
      "confidence": 0.92,                        // 🆕 hoist from SOPStep
      "evidenceEvents": ["ev_07","ev_08"],       // 🆕 explicit per-step
      "isSensitive": false                       // 🆕
    }
  ],
  "commonMistakes": [ "string" ],
  "tips": [ "string" ],
  "completionCheck": [ "string" ],
  "sourceNote": "string",
  "qualityAdvisory": "string | null",
  "qualityBadge": "high",                        // 🆕
  "metadata": { /* §3.1 */ },                    // 🆕
  "evidenceManifest": { /* §3.2 */ }             // 🆕
}
```

Fields today in `OperatorSOPStep`: `number`, `action`, `detail`, `system`,
`expectedResult`, `caution`.

Proposed additive fields (non-breaking):
- `confidence: number` — hoisted from the underlying `SOPStep` so the renderer
  doesn't need to re-query. Enables the per-step confidence glyph in §8 of the
  design system.
- `evidenceEvents: string[]` — explicit list of `event_id`s for the trust
  footer row. Today this is reachable through `SOPStep.instructions[].sourceEventId`
  but requires renderer traversal. Hoisting is ~10 LOC in `sopTemplates.ts`.
- `isSensitive: boolean` — true if any instruction in the step had
  `isSensitive === true`. Lets the renderer draw the `🔒` marker without
  scanning the underlying step.

---

## 5. `EnterpriseSOP` — shape

Today's TS interface is the most complete of the three. The proposal adds a
few fields that compliance reviewers expect.

```jsonc
{
  "templateType": "enterprise",
  "title": "Workflow Upload and Review Procedure — Ledgerium AI",
  "sopId": "s_2026_04_17_abc123-sop",
  "version": "2.0",
  "purpose": "…",
  "scope": "…",
  "trigger": "…",
  "rolesAndResponsibilities": [
    { "role": "Workflow Author", "responsibility": "…" }
  ],
  "prerequisites": [ "string" ],
  "inputs": [ "string" ],
  "systemsAndTools": [ "string" ],
  "procedure": [
    {
      "ordinal": 1,
      "title": "Access the Ledgerium web app",
      "instruction": "…",
      "actor": "Workflow Author",
      "system": "Ledgerium AI",
      "inputs": [ "string" ],
      "outputs": [ "string" ],
      "verificationPoint": "…",
      "confidence": 0.92,                        // 🆕
      "evidenceEvents": ["ev_01"],               // 🆕
      "durationLabel": "4s",                     // 🆕
      "risks": [ "string" ]                      // 🆕 step-level risks
    }
  ],
  "decisionPoints": [
    {
      "atStepOrdinal": 4,
      "question": "Did the file upload succeed?",
      "options": [
        { "condition": "Upload succeeded", "action": "Continue to step 5" },
        { "condition": "Upload rejected",  "action": "See Step 4a — Upload error recovery" }
      ]
    }
  ],
  "controls": [ "string" ],
  "risks": [ "string" ],
  "outputs": [ "string" ],
  "completionCriteria": [ "string" ],
  "sourceNote": "…",
  "qualityAdvisory": "string | null",
  "qualityBadge": "high",                        // 🆕
  "revisionMetadata": {
    "generatedAt": "ISO-8601",
    "engineVersion": "1.2.0",
    "basedOn": "Recorded session s_…",
    "approvers": [],                             // 🆕 optional — empty until approved
    "reviewCadence": "quarterly",                // 🆕 optional
    "nextReviewDate": "2026-07-17"               // 🆕 optional, derived from cadence
  },
  "metadata": { /* §3.1 */ },                    // 🆕
  "evidenceManifest": { /* §3.2 */ }             // 🆕
}
```

Proposed additive fields:

| Field | Why |
|-------|-----|
| `EnterpriseSOPStep.confidence` | Same reason as Operator §4 — visible per-step |
| `EnterpriseSOPStep.evidenceEvents` | Compliance demands per-step traceability |
| `EnterpriseSOPStep.durationLabel` | Already exists on underlying `SOPStep`; hoist |
| `EnterpriseSOPStep.risks` | Step-scoped risks distinct from document-level risks |
| `revisionMetadata.approvers` | Approval workflow integration — empty array by default |
| `revisionMetadata.reviewCadence` | `"quarterly" \| "semiannual" \| "annual" \| "on_change"` |
| `revisionMetadata.nextReviewDate` | Computed from cadence; visible in document |

---

## 6. `DecisionSOP` — shape

```jsonc
{
  "templateType": "decision_based",
  "title": "Workflow Upload Triage",
  "purpose": "…",
  "triggerCondition": "…",
  "inputsNeeded": [ "string" ],
  "initialAssessment": "…",
  "branches": [
    {
      "condition": "Standard flow — no errors",
      "branchType": "happy_path",                // 🆕 enum: happy_path | error_recovery | escalation
      "probability": "high",                     // 🆕 enum: high | medium | low
      "actions": [
        {
          "ordinal": 1,
          "instruction": "Access the Ledgerium web app and sign in.",
          "system": "Ledgerium AI",
          "evidenceEvents": ["ev_01","ev_02"],   // 🆕
          "confidence": 0.92                     // 🆕
        }
      ],
      "outcome": "…",
      "evidenceEvents": ["ev_01","ev_02","ev_07"] // 🆕 branch-level summary
    }
  ],
  "escalationRules": [ "string" ],
  "exceptionHandling": [ "string" ],
  "resolutionOutcomes": [ "string" ],
  "completionCriteria": [ "string" ],
  "documentationRequirements": [ "string" ],
  "sourceNote": "…",
  "qualityAdvisory": "string | null",
  "qualityBadge": "high",                        // 🆕
  "metadata": { /* §3.1 */ },                    // 🆕
  "evidenceManifest": { /* §3.2 */ }             // 🆕
}
```

Proposed additive fields:

| Field | Why |
|-------|-----|
| `DecisionSOPBranch.branchType` | Renderers need to style error vs happy-path differently |
| `DecisionSOPBranch.probability` | Drawn from observed frequency; shows the expected path first |
| `DecisionSOPBranch.evidenceEvents` | Branch-level evidence rollup |
| `DecisionSOPAction.evidenceEvents` | Action-level evidence |
| `DecisionSOPAction.confidence` | Per-action confidence glyph |

---

## 7. Enumerations

All enums below are the canonical authoritative values. Renderers must treat
any other value as invalid and fail loudly in dev, fall back to `"medium"` or
`"happy_path"` in prod (per Ledgerium operating rules).

```ts
type TemplateType = 'operator_centric' | 'enterprise' | 'decision_based';
type QualityBadge = 'high' | 'medium' | 'low';
type BranchType   = 'happy_path' | 'error_recovery' | 'escalation';
type Probability  = 'high' | 'medium' | 'low';
type ReviewCadence = 'quarterly' | 'semiannual' | 'annual' | 'on_change';
type CompletionStatus = 'complete' | 'partial';
```

---

## 8. Validation rules

Every rendered SOP must pass these checks before export. Suggested location:
a new `validateRenderedSOP()` exported from `packages/process-engine/src/templates/sopValidator.ts`.

### 8.1 Required-field rules

- `templateType` must match one of the enum values.
- `metadata.sopId` and `metadata.sessionId` must be present and non-empty.
- Every `steps[i].evidenceEvents` (or equivalent) must have length ≥ 1.
- `qualityBadge` must be consistent with `metadata.averageConfidence`.

### 8.2 Content-quality rules (reject poor output)

A rendered SOP is **rejected** if any of the following hold:

| Rule | Rationale |
|------|-----------|
| Any step instruction contains "Click the div", "Click the span", "Perform action", or "Interact with element" | Recorder artifacts are never acceptable |
| Any step has an empty `action` / `detail` / `instruction` | Stub steps are worse than no step |
| Step count < 2 | A one-step SOP is not a procedure |
| `qualityBadge === "low"` AND `completionStatus === "partial"` | Too uncertain to render |
| More than 40% of steps have confidence < 0.5 | Recording was too noisy to trust |
| No evidence events across the whole document | Breaks Ledgerium's traceability contract |

On rejection, the builder returns an error object; no partial SOP is emitted
to the end user. This implements the "fail loudly in dev, gracefully in prod"
rule from `CLAUDE.md`.

### 8.3 Traceability rules

- Every `event_id` referenced in a rendered SOP must exist in the source
  `ProcessEngineInput.normalizedEvents`.
- No `event_id` may be referenced if its source event had
  `normalization_meta.redactionApplied === true` AND the field was sensitive.
- The `evidenceManifest.totalEvents` must equal the count of distinct
  `event_id`s referenced across all steps.

---

## 9. Relationship to `CanonicalEvent`

The SOP schema is a **downstream projection** of the canonical event stream
defined in `packages/schema-events/src/canonical-event.schema.ts`. The projection
rules are defined in `TRANSFORMATION_RULES.md`. Key invariants:

- Every `SOPStep.instructions[i].sourceEventId` must resolve to a
  `CanonicalEvent.event_id` in the same session.
- `SOPStep.system` must equal the `page_context.applicationLabel` of the
  majority of its source events.
- `SOPStep.isSensitive` is true iff any source event has
  `target_summary.isSensitive === true`.

---

## 10. Versioning

- The SOP envelope uses semantic versioning; the current version is `2.0` per
  `sopBuilder.ts`.
- Adding optional fields (the proposals marked 🆕) is a **minor bump** to `2.1`.
- Renaming or removing any ✅ field is a **major bump** to `3.0` and requires
  a migration plan for existing stored SOPs.
- Renderer implementations check `metadata.version` and may refuse to render
  unknown major versions.

---

## 11. Summary of proposed additive fields

Non-breaking. All optional. All deliverable in a single implementation pass.

| Field | Where | Size of change |
|-------|-------|----------------|
| `qualityBadge` on all three templates | templateTypes.ts | 1 enum + compute fn |
| `metadata` unified object on all three | templateTypes.ts | struct + hoist logic |
| `evidenceManifest` on all three | templateTypes.ts | struct + builder |
| `confidence`, `evidenceEvents`, `isSensitive` on `OperatorSOPStep` | templateTypes.ts | 3 field additions |
| `confidence`, `evidenceEvents`, `durationLabel`, `risks` on `EnterpriseSOPStep` | templateTypes.ts | 4 field additions |
| `approvers`, `reviewCadence`, `nextReviewDate` on `revisionMetadata` | templateTypes.ts | 3 field additions |
| `branchType`, `probability`, `evidenceEvents` on `DecisionSOPBranch` | templateTypes.ts | 3 field additions |
| `confidence`, `evidenceEvents` on `DecisionSOPAction` | templateTypes.ts | 2 field additions |

Estimated engineering cost: ~120 LOC across `templateTypes.ts`, `sopTemplates.ts`,
and a new `sopValidator.ts`. All changes pass existing tests because additions
are optional.
