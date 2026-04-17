# SOP System — Implementation Notes

**Status:** Specification handoff to engineering
**Version:** 1.0
**Audience:** backend-engineer, engineering-coordinator
**Scope:** what needs to change in `packages/process-engine/src/` to produce output at the quality bar defined in `DESIGN_SYSTEM.md` and the rendered examples.

---

## 1. Summary

The existing code produces ~70% of what these specs require. The design system,
transformation rules, and schema are largely **already implemented** in the
pipeline. What the uplift needs:

1. **Hoist the metadata and confidence signals above the fold** in all three
   templates' Markdown output (today they live in footer/trailing positions).
2. **Expose per-step evidence references** in the rendered artifacts (today
   they live only inside `SOPStep.instructions[].sourceEventId` and require
   renderer traversal).
3. **Add a validator** (`sopValidator.ts`) that rejects output violating the
   quality contracts in `QUALITY_RUBRIC.md` and `SCHEMA.md` §8.
4. **Add additive schema fields** (§3 of `SCHEMA.md`) — all optional, all
   non-breaking.
5. **Tighten the Markdown renderer** to match the rendered examples exactly.

Estimated scope: 120–150 LOC plus 60 LOC of new tests. One engineer-week with
reviews.

No breaking changes. No existing test should fail.

---

## 2. What the codebase already does well — preserve these

| Asset | File | Why it's good |
|-------|------|---------------|
| Canonical event schema | `packages/schema-events/src/canonical-event.schema.ts` | Clean, versioned, zod-validated. Don't touch. |
| Label resolution ladder | `packages/process-engine/src/sopBuilder.ts::safeTargetLabel`, `enrichedPageLabel` | Already avoids recorder artifacts; enforces anti-`div`/`span` rules. |
| Imperative step titling | `contentEnricher.ts::cleanStepTitle` + `buildAction` | Produces imperative verb-phrase titles. |
| Deterministic segmentation → steps | `segmentation-engine` (upstream) + `stepAnalyzer.ts` | Clean separation; steps have confidence and source events. |
| Template selector | `templateSelector.ts` | Pure, deterministic, thresholds are well-chosen. |
| Quality advisory builder | `templates/sopTemplates.ts::buildQualityAdvisory` | Correct logic — only needs promotion to above-the-fold render position. |
| `SOP` type carries `qualityIndicators`, `commonIssues`, `frictionSummary`, `businessObjective` | `types.ts` | All hooks exist for the three templates to diverge richly. |
| CATEGORY_CONFIG colors | `types.ts` | Already aligned with the design system colors. |

---

## 3. Named gaps (what falls short of the quality bar)

### Gap 1: Metadata and confidence are hidden below the fold
**Where:** `templates/markdownRenderer.ts::renderOperatorMarkdown`, `renderEnterpriseMarkdown`, `renderDecisionMarkdown`.
**Symptom:** today, the metadata strip and confidence advisory appear in a
footer or are missing from the rendered Markdown. The design system requires
them visible in the first 15 lines.
**Fix:** rearrange the renderer functions to emit:
1. H1 title
2. italic one-line purpose (new — see Gap 2)
3. italic metadata strip (new — see Gap 3)
4. confidence badge callout (new — see Gap 4)
5. then existing section flow

### Gap 2: No italic one-line purpose
**Where:** all three Markdown renderers.
**Symptom:** the current output jumps from H1 directly into an H2 "What this
is for" / "Purpose" section. The design system requires a one-sentence italic
line between H1 and the first H2.
**Fix:** in each renderer, after the H1, emit `_${sop.whatThisIsFor}_` (Operator)
or the first sentence of `sop.purpose` (Enterprise, Decision) as an italic
paragraph.

### Gap 3: No consolidated metadata strip
**Where:** all three Markdown renderers.
**Symptom:** today's `documentFooter()` emits a generator credit line at the
end. The design system wants a metadata strip (version, step count, system
count, confidence, generation date) at the **top**.
**Fix:** add a helper `renderMetadataStrip(sop)` in `renderHelpers.ts` and
call it after the italic purpose line.

```ts
// renderHelpers.ts — new helper
export function renderMetadataStrip(input: {
  version: string;
  stepCount: number;
  systemCount: number;
  averageConfidence: number;
  generatedAt: string;
}): string {
  const confPct = Math.round(input.averageConfidence * 100);
  const date = input.generatedAt.slice(0, 10); // YYYY-MM-DD
  return `*Ledgerium SOP · v${input.version} · ${input.stepCount} steps · ` +
         `${input.systemCount} system${input.systemCount !== 1 ? 's' : ''} · ` +
         `${confPct}% confidence · Generated ${date}*`;
}
```

### Gap 4: Confidence badge is computed but not rendered
**Where:** `templates/sopTemplates.ts` computes `qualityAdvisory` but the
Markdown renderer renders it only conditionally and only inline.
**Symptom:** the `✓ High confidence` / `⚠ Medium confidence` / `✕ Low confidence`
callout from `DESIGN_SYSTEM.md` §7.3 never appears.
**Fix:** add a new deterministic classifier + renderer:

```ts
// sopTemplates.ts — new helper
function qualityBadge(output: ProcessOutput): 'high' | 'medium' | 'low' {
  const qi = output.sop.qualityIndicators;
  if (!qi) return 'medium';
  if (qi.averageConfidence >= 0.85 && qi.lowConfidenceStepCount === 0) return 'high';
  if (qi.averageConfidence < 0.70 || qi.lowConfidenceStepCount >= 3) return 'low';
  return 'medium';
}
```

Then in each Markdown renderer, after the metadata strip, emit:

```markdown
> ✓ **High confidence** — fully evidence-linked across all 12 steps.
```

(or the medium/low variants).

### Gap 5: Per-step evidence is not in the rendered artifact
**Where:** `templateTypes.ts` — `OperatorSOPStep`, `EnterpriseSOPStep`,
`DecisionSOPAction` do not carry `evidenceEvents: string[]`.
**Symptom:** the Markdown renderer cannot emit `◦ Evidence: N events · [ev_XX, ev_YY]`
per step without traversing the underlying `SOPStep.instructions[]`.
**Fix:** add the optional field on each step type, populate it in
`sopTemplates.ts::renderOperatorCentric`, `renderEnterprise`, `renderDecisionBased`:

```ts
// In each renderer's per-step map:
evidenceEvents: step.instructions.map(i => i.sourceEventId),
```

Then in `markdownRenderer.ts` append the evidence row to each step:

```markdown
◦ Evidence: {n} events · {evidenceEvents.join(', ')}
```

### Gap 6: Per-step confidence glyph is missing
**Where:** `markdownRenderer.ts`.
**Symptom:** low-confidence steps look identical to high-confidence steps; the
design system requires a visible `⚠` or `·` after the step title.
**Fix:** hoist `confidence` onto `OperatorSOPStep`, `EnterpriseSOPStep`, and
`DecisionSOPAction`, then in the renderer:

```ts
function stepConfidenceGlyph(c: number): string {
  if (c >= 0.85) return '';
  if (c >= 0.70) return ' ·';
  return ' ⚠';
}
```

### Gap 7: The footer emits generator credit but not a session link
**Where:** `markdownRenderer.ts::documentFooter`.
**Symptom:** the rendered examples specify a footer with a timeline URL; today's
footer has no URL.
**Fix:** extend `documentFooter` to accept `sessionId` and emit:

```markdown
*Derived from session `{sessionId}` by Ledgerium process-engine v{engineVersion} · {eventCount} events · Open timeline: https://app.ledgerium.ai/s/{sessionId}*
```

### Gap 8: No validator rejects poor output
**Where:** (does not exist).
**Symptom:** a bad recording currently produces a weak SOP with zero guardrails.
`QUALITY_RUBRIC.md` §10 lists anti-patterns that must be detected.
**Fix:** create `packages/process-engine/src/templates/sopValidator.ts`:

```ts
export type SOPValidation =
  | { ok: true }
  | { ok: false; reason: string; diagnostic: string; suggestion: string };

export function validateRenderedSOP(rendered: RenderedSOP, output: ProcessOutput): SOPValidation {
  const markdown = renderSOPMarkdown(rendered);

  // Rule 1: banned recorder artifacts
  const banned = [
    'Click the div', 'Click the span', 'Click the svg',
    'Interact with element', 'Perform action',
    'Click the p', 'Click the li',
  ];
  for (const b of banned) {
    if (markdown.includes(b)) {
      return {
        ok: false,
        reason: `banned_recorder_artifact`,
        diagnostic: `Rendered SOP contains banned string "${b}". Check label-resolution ladder in sopBuilder.ts.`,
        suggestion: `Investigate the source event — its target_summary.label or role was likely missing.`,
      };
    }
  }

  // Rule 2: minimum step count
  const stepCount = output.sop.steps.length;
  if (stepCount < 2) {
    return { ok: false, reason: 'too_few_steps',
      diagnostic: `SOP has ${stepCount} step(s); minimum is 2.`,
      suggestion: `Re-record the workflow with more actions.` };
  }

  // Rule 3: evidence present everywhere
  for (const step of output.sop.steps) {
    if (step.instructions.length === 0) {
      return { ok: false, reason: 'step_has_no_evidence',
        diagnostic: `Step ${step.ordinal} ("${step.title}") has no evidence events.`,
        suggestion: `Investigate segmentation — the step was created but no actionable events populated it.` };
    }
  }

  // Rule 4: empty expected outcomes
  const emptyExpected = output.sop.steps.filter(s => !s.expectedOutcome).length;
  if (emptyExpected > 0) {
    return { ok: false, reason: 'empty_expected_outcomes',
      diagnostic: `${emptyExpected} step(s) have no expected outcome.`,
      suggestion: `Review contentEnricher.ts expected-outcome generation.` };
  }

  return { ok: true };
}
```

### Gap 9: Enterprise revision history is always missing
**Where:** `renderEnterpriseMarkdown`.
**Symptom:** the spec requires a revision-history table even with one row.
**Fix:** always render the table; show `*(pending review)*` in the Approved by
column when `revisionMetadata.approvers` is absent or empty.

### Gap 10: Decision branches are not ordered by probability
**Where:** `renderDecisionBased` in `sopTemplates.ts`.
**Symptom:** branches are built in insertion order. The spec requires happy
path first, then error paths by observed frequency.
**Fix:** after building `branches`, sort by `(branchType === 'happy_path' ? 0 : 1, -observedFrequency)`.
Add `branchType` and `probability` fields to `DecisionSOPBranch` per `SCHEMA.md` §6.

---

## 4. Concrete diffs, file by file

### `packages/process-engine/src/templateTypes.ts`

Add the optional fields from `SCHEMA.md` §3, §4, §5, §6. Non-breaking.

```ts
// OperatorSOPStep — add:
confidence?: number;
evidenceEvents?: string[];
isSensitive?: boolean;

// EnterpriseSOPStep — add:
confidence?: number;
evidenceEvents?: string[];
durationLabel?: string;
risks?: string[];

// DecisionSOPBranch — add:
branchType?: 'happy_path' | 'error_recovery' | 'escalation';
probability?: 'high' | 'medium' | 'low';
evidenceEvents?: string[];

// DecisionSOPAction — add:
confidence?: number;
evidenceEvents?: string[];

// All three SOP types — add at top level:
qualityBadge?: 'high' | 'medium' | 'low';
metadata?: { /* see SCHEMA.md §3.1 */ };
evidenceManifest?: { /* see SCHEMA.md §3.2 */ };

// EnterpriseSOP.revisionMetadata — add:
approvers?: Array<{ name: string; role: string; approvedAt: string }>;
reviewCadence?: 'quarterly' | 'semiannual' | 'annual' | 'on_change';
nextReviewDate?: string;
```

### `packages/process-engine/src/templates/sopTemplates.ts`

Add:
- `qualityBadge(output): 'high' | 'medium' | 'low'`
- `buildEvidenceManifest(output): EvidenceManifest`
- `buildMetadata(output): SOPMetadata`

In each renderer (`renderOperatorCentric`, `renderEnterprise`, `renderDecisionBased`):
- Populate the new fields.
- In per-step maps, fill `confidence`, `evidenceEvents`, `isSensitive`,
  `durationLabel` where applicable.
- In `renderDecisionBased`, compute `branchType` and `probability` per branch;
  sort branches.

### `packages/process-engine/src/templates/markdownRenderer.ts`

Restructure all three SOP renderers to follow the order:

1. H1
2. italic purpose (new)
3. italic metadata strip (new, via `renderHelpers.renderMetadataStrip`)
4. confidence badge callout (new, via new helper)
5. existing section flow
6. updated footer with session link

Add to each step emission:
- confidence glyph after title
- `◦ Evidence:` row at end

### `packages/process-engine/src/templates/renderHelpers.ts`

Add helpers:
- `renderMetadataStrip(...)`
- `renderConfidenceBadge(badge: 'high'|'medium'|'low', stepCount: number)`
- `stepConfidenceGlyph(c: number)`
- `formatEvidenceRow(eventIds: string[])`

### `packages/process-engine/src/templates/sopValidator.ts` (new file)

Implement `validateRenderedSOP()` per §3 Gap 8.

### Tests

Add tests in `packages/process-engine/src/templates/sopTemplates.test.ts`:

- `metadata strip appears within first 4 lines of markdown output`
- `confidence badge is always rendered`
- `every step emits an evidence row`
- `low-confidence steps have the warning glyph`
- `no banned recorder artifacts in output`
- `decision template orders branches by probability`

Add tests in a new `sopValidator.test.ts`:

- `rejects SOPs with banned strings`
- `rejects SOPs with fewer than 2 steps`
- `rejects steps with empty evidence`
- `rejects steps with empty expected outcomes`
- `passes the example recording in docs/sop/examples/source_recording.json`

---

## 5. Suggested implementation order

1. **Day 1 — additive schema.** Add all optional fields to `templateTypes.ts`. No behavior change. CI stays green.
2. **Day 2 — helpers + quality badge.** Implement `renderHelpers.renderMetadataStrip`, `renderConfidenceBadge`, `stepConfidenceGlyph`, `formatEvidenceRow`. Add `qualityBadge()` and `buildEvidenceManifest()` to `sopTemplates.ts`.
3. **Day 3 — renderer restructure.** Update `renderOperatorMarkdown`, `renderEnterpriseMarkdown`, `renderDecisionMarkdown` to emit the new top-of-document layout and per-step evidence rows. Update golden tests.
4. **Day 4 — validator.** Write `sopValidator.ts` + `sopValidator.test.ts`. Wire into `processSession.ts` as a final guard that logs (but does not throw) in prod and throws in dev.
5. **Day 5 — Decision template refinements.** Add `branchType`, `probability`, branch ordering. Add expected-but-unobserved escalation paths (Path 3 in `examples/03_decision_based_example.md`).
6. **Day 6 — example-based regression test.** Feed `examples/source_recording.json` through `buildSOP()` and `renderSOP()`; assert the output matches the three `examples/*.md` files modulo timestamps.
7. **Day 7 — review + docs pass.** Ensure `METRICS.md` KPI-005 (SOP Usefulness Score) is wired to a scoring call that uses `QUALITY_RUBRIC.md`.

---

## 6. Risks and tradeoffs

| Risk | Mitigation |
|------|-----------|
| Golden-test churn when renderers change | Update once per uplift; commit new goldens with the PR |
| Confidence thresholds (0.85 / 0.70) are tunable | Expose them as named constants in `sopTemplates.ts`; document in `TRANSFORMATION_RULES.md` §8.3 |
| Evidence rows could clutter small SOPs | Keep them to one line; make them low-contrast via CSS in the web view |
| Validator false-positives block real recordings | First release logs-only; promote to hard-block after a sample-based calibration week |
| Additive schema fields means two shapes in-flight | Renderers must treat all new fields as optional with sensible defaults |

---

## 7. Out of scope for this uplift

- React/Tailwind web renderer changes — handed to `frontend-engineer` via `COLLABORATION_REQUESTS.md`.
- PDF / DOCX exporters — separate spec; this uplift keeps them deterministic derivations of the structured JSON.
- Internationalization — future milestone.
- Organization-specific style customization — future AI-assisted feature.

---

## 8. Definition of done

- All three rendered examples in `docs/sop/examples/` are reproducible from the
  `source_recording.json` by running `buildSOP()` + `renderSOP()` + the updated
  Markdown renderer (modulo timestamps).
- `pnpm typecheck` passes.
- `pnpm test --filter process-engine` passes, including new tests.
- The validator passes on the examples and rejects the set of negative samples
  defined in `sopValidator.test.ts`.
- `IMPLEMENTATION_NOTES.md` is updated to reflect any deviation from this plan
  at PR time.
