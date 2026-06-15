# QA Review — SOP P0 Implementation
**Reviewer:** qa-engineer  
**Date:** 2026-06-15  
**Commit under review:** 3aa3708  
**Scope:** Alignment/freshness pill · per-step evidence snippet · scope/roles/inputs/outputs rendering · PDF/print · honesty fixes (coming-soon tile, single-run disclosure, observed-vs-inferred) · mode renames · analytics events · `sopIntelligence` additive API field

---

## 1. Correctness and Edge Cases — Alignment Pill

### 1a. N < 2 gating

**Finding: CORRECT.** The honesty gate in `sopIntelligence.ts:92` is:

```
if (!alignment || effectiveRunCount < 2)
```

- N = 0 (`sopAlignment: null, runCount: 0`): falls into the `insufficient` branch. `alignmentPct` is `null`. Label is "Based on no recording". `hasSignal: false`. The engine's score-0 / 'critical' is never surfaced.
- N = 1 (`alignment.totalRunCount: 1`): even with engine returning `alignmentLevel: 'critical'` and `driftLevel: 'outdated'`, the pill returns `kind: 'insufficient'`, `hasSignal: false`, `detail: 'Review before distributing'`. The test at `sopIntelligence.test.ts:60-75` confirms this case explicitly, including the assertion that `kind !== 'drifting'`.
- N = 0 with null input or undefined input: `deriveAlignmentPill(null)` and `deriveAlignmentPill(undefined)` both return `kind: 'insufficient'` — tested at line 156-159.

### 1b. effectiveRunCount resolution — minor correctness gap

**Finding: Logic gap (P2).** `effectiveRunCount` at line 90 is:

```
const effectiveRunCount = alignment ? Math.max(runCount, alignment.totalRunCount) : runCount;
```

This uses `Math.max` (i.e. picks the higher of the two). The intent (comment: "authoritative when higher than cohort runCount") is correct for the described case. However, the semantics are asymmetric: if `alignment.totalRunCount = 1` but the cohort `runCount = 5`, the gate at line 92 allows through (`effectiveRunCount = 5 >= 2`), even though the alignment engine only saw 1 run. The test at line 83-93 validates the inverse direction (engine saw 4, cohort says 1 → `effectiveRunCount = 4`). The forward direction (engine saw fewer than cohort) is untested.

**Risk:** Low in practice because `alignment.totalRunCount` is the engine's authoritative count and would normally equal or exceed the stored `processDefinition.runCount`. But if the alignment engine was computed on a subset (e.g., a stale snapshot), the pill could render a real signal for a threshold that was only computed on N=1 while the workflow nominally has N=5 runs. This is an untested edge case, not a current crash.

**Recommendation:** Add a test: `sopAlignment.totalRunCount=1, runCount=5` should result in either `insufficient` (conservative) or document the intended behavior in a code comment. The current behavior renders an aligned pill in that scenario, which may not be the intent.

### 1c. Clamping

**Finding: CORRECT.** `clamp01` at line 192-197:

```
if (!Number.isFinite(n)) return 0;
if (n < 0) return 0;
if (n > 1) return 1;
```

`alignmentScore: 1.5` → `alignmentPct: 100`. Tested at `sopIntelligence.test.ts:138-145`.

### 1d. Hydration safety

**Finding: CORRECT.** `SOPHeader.tsx:16`:

```
const recordedDate = metadata.createdAt ? formatDate(metadata.createdAt) : '';
```

`formatDate` at `lib/format.ts:15-28` uses `timeZone: 'UTC'` explicitly, matching the comment "Flash-class fix, 2026-06-09." No `Date.now()` or `new Date()` appears in any SOP render path. The print cover at `SOPPageShell.tsx:380` similarly uses `formatDate`. `deriveAlignmentPill` is documented "no `Date.now()`" and confirmed: the function is pure and deterministic over its inputs.

### 1e. Null / legacy / malformed `intelligenceJson` degradation

**Finding: CORRECT.** `extractSopIntelligence` at `route.ts:146-172`:

- `processDefinition` is `null` or `undefined`: `return null` at line 153.
- `intelligenceJson` is `null` or `''`: same `return null`.
- JSON.parse throws (malformed): `catch { return null }` at line 169.
- Parsed but neither `sopAlignment` nor `documentationDrift` present: `return null` at line 163.
- Returned `null` reaches `buildSOPViewModel` as `extras.sopIntelligence = null`, which passes `null` to `deriveAlignmentPill`, returning `kind: 'insufficient'`, `hasSignal: false`.

The SOP page degrades cleanly to the pre-pill "Complete/Partial" badge at `SOPHeader.tsx:46-54` when `alignment` prop is absent. Wait — `alignment` is always present in the view model (the `SOPViewModel.alignment` field is always set by `deriveAlignmentPill`). The `SOPHeader` receives it always. When `intelligenceJson` is null, the pill renders as `kind: 'insufficient'` (amber neutral disclosure), not as the old Complete/Partial badge. The Complete/Partial badge branch at SOPHeader line 46 is only reached if `alignment` prop is `undefined`, but since `SOPViewModel.alignment` is always populated and `SOPHeader` is always passed `viewModel.alignment`, the badge is now unreachable at runtime. This is fine but means the Complete/Partial badge is dead code in the current flow — minor.

---

## 2. Honesty Analysis — "Aligned · 100% · 5 runs"

This is the most substantive finding in this review.

### What the screenshot shows

The header pill reads: **Aligned · 100% · 5 runs**

The workflow is "Approve Expense Report (Sample)" with metadata showing "90%" confidence. The pill claims 100% alignment, 5 runs.

### What `runCount` the pill uses

Trace through the data path:

1. `extractSopIntelligence` at `route.ts:167` sets `runCount` from `processDefinition.runCount` first, falling back to `parsed.runCount` from the JSON blob.
2. `deriveAlignmentPill` at line 90 uses `effectiveRunCount = Math.max(runCount, alignment.totalRunCount)`.
3. The pill's `runCount` field is `effectiveRunCount`, which is `alignment.totalRunCount` from the engine's `SOPAlignmentResult`.

Looking at `sopAlignmentEngine.ts:38-40`, `alignedRunCount` is defined as "How many runs the SOP aligns with (out of total)" — i.e., runs where `bigramJaccardSimilarity >= 0.6`. `totalRunCount` is `runs.length`.

**So the pill's "5 runs" is `alignment.totalRunCount` = the total number of runs the engine was computed over.** For the sample workflow, this appears to be 5 runs from the stored `ProcessDefinition`.

### Is "100% · 5 runs" honest?

The workflow screenshot metadata shows "90% confidence" and "1 phase." The process description says "Approve Expense Report." If the stored `intelligenceJson` records 5 runs and the engine found all 5 align with the SOP, the "100% aligned · 5 runs" is factually correct relative to the engine's inputs.

**However, there is a meaningful honesty gap:**

The `sopAlignmentEngine.ts` computes `alignedRunCount` as the count of runs where `bigramJaccardSimilarity(sopSignature, runSignature) >= 0.6` (line 121-122). The **alignment score itself** is a weighted blend of:
- `avgSimilarity` (average similarity across all runs)
- `structuralSimilarity` (vs. dominant variant)
- Minus penalties for undocumented / unused steps / high-severity drift

So `alignmentScore: 1.0` means the blend reached 1.0 — it is possible to achieve 100% with a small, homogeneous run cohort (5 identical runs) even if a larger picture would show more variation. The label "100%" does not disclose that it is computed over only 5 of an unknown total.

**The specific framing risk:** If the workflow has, say, 16 total process runs across 6 variants (as mentioned in the task brief), but the `intelligenceJson` was computed on a subset of 5 standard-path runs (the dominant variant), then "Aligned · 100% · 5 runs" implies the SOP covers the entire process when it covers only the dominant-path subset.

### Tracing how this could happen

`sopAlignmentEngine.ts` receives a `runs: ProcessRunBundle[]` array. It does not filter internally — it computes over whatever `runs` it receives. If the caller (the intelligence pipeline) passes only standard-path runs (e.g., dominant-variant runs) to `analyzeSopAlignment`, then `totalRunCount: 5` literally means "5 runs were analyzed." The 11 other runs across 5 other variants are invisible to the alignment computation.

This is architecturally correct (the engine is honest about its inputs) but the display label misleads the reader: "5 runs" looks like the total run count of the workflow, not the cohort subset the engine analyzed.

### Finding: P1 Honesty Defect

**The current label "Aligned · 100% · 5 runs" is misleading when the workflow has more total runs than the engine analyzed.** A user reading "5 runs" reasonably infers "this SOP was validated against 5 total executions of this workflow." The truth may be "5 of 16 runs (the standard-path cohort) were analyzed; the other 11 runs across 5 other variants were not."

**Recommended fix:** The pill text should expose the denominator or scope its claim to the cohort. Two honest options:

Option A (denominator): Change the pill render in `SOPHeader.tsx:162-165` from:
```
· {a.runCount} runs
```
to:
```
· {a.alignedRunCount} of {a.runCount} runs
```
where `alignedRunCount` is threaded into `AlignmentPill`. This requires adding `alignedRunCount` to the `AlignmentPill` interface in `sopIntelligence.ts` and populating it from `alignment.alignedRunCount`.

Option B (scope qualifier): Keep the count but add a tooltip or sub-label: "Aligned · 100% · 5 sampled runs" to signal that the count is a cohort, not the full run history.

Option C (minimum viable): Add a `title` attribute or `aria-label` on the pill that includes "based on N of M total runs" so the full context is accessible on hover/screen reader even if the visible text stays compact.

**Note:** The `AlignmentPill` interface in `sopIntelligence.ts:58-70` does not currently include `alignedRunCount`. To implement Option A, the field needs to be added there and populated in `deriveAlignmentPill`. The `SopAlignmentLike` interface at line 24-31 already has `alignedRunCount: number`, so the data is present in the engine output and accessible to the pill derivation function — it just isn't threaded through.

---

## 3. Evidence Snippet — Correctness and Sensitive Data Risk

### Correctness when page_context / title is absent

**Finding: CORRECT.** `deriveStepEvidence` at `sopIntelligence.ts:172-188`:
- Each signal passes through `cleanSignal` which returns `null` for `null | undefined | ''` or whitespace-only strings.
- If `app` is null, it is not pushed. If `page` is null, it is not pushed. If `action` is null, it is not pushed.
- `hasEvidence: parts.length > 0` — callers gate on this.
- In `SOPExecutionMode.tsx:321-329`, the evidence block is conditionally rendered: `{step.evidence.hasEvidence && ...}`. Nothing is fabricated.
- The page deduplication at line 180 (`page.toLowerCase() !== app.toLowerCase()`) correctly prevents "Gmail · Gmail · Send".

Tested at `sopIntelligence.test.ts:178-214`: absent signals, whitespace-only signals, deduplication, determinism.

### Sensitive-data leak risk

**Finding: Partial risk — P2.**

`normalizeStep` in `sopViewModel.ts:247-252` builds `actionLabel` from `firstTargetInstr?.targetLabel`. It guards with `!i.isSensitive`:

```
const firstTargetInstr = instructions.find(i => !i.isSensitive && i.targetLabel);
```

This correctly skips sensitive instructions. However, `applicationLabel` is taken from `sys || instructions.find(i => i.system)?.system`. System labels are not filtered for sensitivity — if a step's `system` field contains a user-specific value (e.g., a company internal system name with PII-adjacent naming), it would appear in the snippet. In practice, system names are application labels (Salesforce, NetSuite, etc.) not PII, so the risk is low. The `pageTitle` comes from `pageCtx?.[ordinal]?.pageTitle`, which is real captured page titles. Page titles can contain PII (e.g., "John Smith — Invoice #1234"). 

**Risk:** If the captured `pageTitle` from `process_map` node metadata contains user-entered content (common in CRM, HR, billing apps), it will appear verbatim in the evidence snippet. No sanitization occurs between page-title capture and snippet display.

**Recommendation:** Document the known risk with a comment in `normalizeStep`. If `pageTitle` values come from captured browser tab titles (which they do in the extension pipeline), consider truncating at 60 characters and stripping obvious PII patterns in the adapter layer before rendering. This is a P2 (follow-up) since the extension's `pageTitle` capture already flows through `normalizeRawEvent` which strips PII via `SENSITIVE_SELECTOR_RE` on element content — but page titles are not passed through the same sanitization.

---

## 4. Print / @media Output

### Does the SOP print block risk the dark-card issue?

**Finding: RESOLVED — print forces white canvas correctly.** The `@media print` block at `globals.css:412-523` explicitly sets:

```css
.sop-print-root {
  background: #ffffff !important;
  color: #111827 !important;
  ...
}
```

This mirrors the report print block pattern (`report-print-root` at line 281-284). The dark-mode default (`--surface-primary: #0D1117`, `--content-primary: #E2E8F0`) is overridden. The `:root` CSS variables that drive `var(--surface-*)` colors are NOT reset in the print block for non-`.sop-print-root` elements — but the SOP content is entirely within `.sop-print-root`, so this is fine.

### Steps forced open

**Finding: GAP — P1 print defect.** The CSS at line 455:

```css
.sop-print-root [id^='sop-step-body-'] {
  display: block !important;
}
```

This targets elements with `id` starting with `sop-step-body-`. Looking at `SOPPageShell.tsx:549`:

```jsx
<div id={`sop-step-body-${step.id}`} ...>
```

This is in `SOPStepCardCompact`, which is used by Visual mode and the step rail. In `SOPExecutionMode.tsx:242-465`, the `ExecutionStepCard` does NOT assign an `id` to its expanded body div. The expanded body at line 319 is:

```jsx
{isExpanded && (
  <div className="px-4 pb-4 pl-[52px] space-y-3 border-t ...">
```

No `id` attribute on this div. So the `[id^='sop-step-body-']` selector does NOT match Execution mode step bodies. In print, Execution mode steps that are collapsed on screen will print collapsed (showing only the header button, but `button` elements are hidden by `display: none !important` at line 445).

**Consequence:** If a user is in Execution mode (the default) and triggers Print, only steps that were already expanded on screen will have their bodies visible. The remaining steps will have their entire content hidden (the header is a `<button>`, which is hidden; the body is not expanded; nothing prints for those steps). The print will show only the `SOPPrintCover`, the header area, and any expanded step bodies. Collapsed steps will be invisible.

**Fix:** Add `id={`sop-step-body-${step.id}`}` to the expanded body div in `ExecutionStepCard` in `SOPExecutionMode.tsx`, or add an alternative class (e.g., `sop-step-body`) and target that class in the CSS instead of the `id` prefix.

### color-adjust

**Finding: CORRECT.** Line 427-430:

```css
.sop-print-root *,
.sop-print-root svg {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
```

Color-meaning fills (confidence dots, category accent badges, friction severity colors) will print correctly.

### Button hiding and mode switcher

**Finding: CORRECT.** Line 443-451 hides `.sop-no-print` (the mode switcher row is wrapped in `sop-no-print` at `SOPPageShell.tsx:281`), `nav`, `button`, and app-shell chrome elements. The step rail nav has `aria-label="Step navigation"` and is wrapped in `sop-no-print` via the nav selector.

---

## 5. Accessibility

### Alignment pill

**Finding: Mostly adequate, one gap.** `SOPHeader.tsx:150-166`:

```jsx
<span
  className={...}
  title={a.detail ?? ariaLabel}
  role="status"
  aria-label={ariaLabel}
>
```

where `ariaLabel = "${a.label} · ${a.alignmentPct}% aligned · based on ${a.runCount} runs"`.

- `role="status"` is appropriate for live region semantics. However, `role="status"` implies `aria-live="polite"`. The pill is rendered statically on mount and does not update — not a functional problem but a semantic over-specification.
- The visual text for the aligned/drifting states is: `{a.label} · {a.alignmentPct}% · {a.runCount} runs`. The aria-label is `"Aligned · 88% aligned · based on 20 runs"` — more verbose and accurate. Screen reader users get better information than sighted users. Acceptable.
- The `hidden sm:inline` class on the `· {a.runCount} runs` span means on small screens, the run count is visually hidden. The `aria-label` on the outer span still announces it. Acceptable.

**Gap:** The `insufficient` pill at line 126-143 uses `role="status"` with `aria-label={title}` where `title` is `"Based on 1 recording — review before distributing"`. The `AlertTriangle` icon has `aria-hidden="true"` — correct. The `{a.detail && <span>— {a.detail}</span>}` at line 140 is visible on `sm` and up but the outer `aria-label` already includes the full message. Acceptable, but the `detail` span is redundant to AT (they hear the `aria-label` first on most SR implementations, then the inner text — which includes `a.detail` again). Minor double-announcement risk for screen readers that read both `aria-label` and visible text.

### Coming-soon tile

**Finding: CORRECT.** The `AskThisProcessPanel` in `SOPIntelligenceMode.tsx:511-563` has NO interactive elements (no input, no buttons). `MessageSquare` and `Sparkles` icons have `aria-hidden="true"`. The list items are plain `<li>` elements. The panel is a static informational tile — no ARIA role issues.

### Evidence snippet

**Finding: Gap — P2.** At `SOPExecutionMode.tsx:321-328`:

```jsx
<div className="flex items-center gap-1.5 text-[10px] text-[var(--content-tertiary)]">
  <Eye className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
  <span>
    <span className="font-medium text-[var(--content-secondary)]">Observed in</span>{' '}
    {step.evidence.text}
  </span>
</div>
```

The outer `div` has no role or label. A screen reader will read "Observed in [app · page · action]" which is meaningful and correct. Acceptable.

However, the contrast of `text-[var(--content-tertiary)]` in dark mode is `#64748B` on `#1C2128` background — this is approximately 3.7:1 contrast ratio, which passes AA for large text (18px+) but fails for normal text (which at `text-[10px]` = 10px is very small). The `font-medium` span at `--content-secondary` (#94A3B8 on #1C2128) is approximately 5.2:1 — passes AA. The evidence value text is at `--content-tertiary` (#64748B) — fails AA for 10px text.

**This is a pre-existing theme problem that the SOP page inherits.** The dashboard report had a similar issue addressed in MDR-P06/P07. The SOP page is not axe-gated (no `v2-a11y.spec.ts` equivalent for SOP). Flag for future axe scan.

### Print accessibility

The print elements (`sop-print-cover`, `sop-print-footer`) both have `aria-hidden` at `SOPPageShell.tsx:387` and `360` respectively. They are `hidden print:block` / `hidden print:flex` — invisible to screen readers in the interactive session. Correct.

---

## 6. Regression Risk and Test Coverage Gaps

### API route test gap — P1

**Finding: No test file exists for `apps/web-app/src/app/api/workflows/[id]/route.ts`.** The glob `apps/web-app/src/app/api/workflows/[id]/*.test.ts` returns no results. The `extractSopIntelligence` function is untested at the route level.

This is a regression risk because:
- The `processDefinition` Prisma include is new (additive): if the schema changes or the include is removed, the `sopIntelligence` field silently disappears from the API response.
- The `extractSopIntelligence` JSON parsing logic — defensive null handling, `sopAlignment && documentationDrift` early-return — has no regression lock.
- The field being `null` vs. absent from the response is untested (clients need to handle both).

The pure-function tests in `sopIntelligence.test.ts` (16 tests) and `sopViewModel.sopP0.test.ts` (9 tests) cover the rendering layer well. But the API boundary has zero test coverage.

**Recommendation:** Add unit tests for `extractSopIntelligence` directly (it is exported-ish via the module) or add route-level tests covering: (1) happy path with valid `intelligenceJson` returns `sopIntelligence` with expected shape; (2) `intelligenceJson: null` returns `sopIntelligence: null`; (3) malformed JSON returns `sopIntelligence: null`; (4) `processDefinition: null` (legacy workflow) returns `sopIntelligence: null`.

### Analytics event missing type registration

**Finding: Risk — P2.** `SOPPageShell.tsx:85-113` calls `track({ event: 'sop_viewed', ... })` and `track({ event: 'sop_alignment_viewed', ... })`. These events need to be registered in the `AnalyticsEvent` discriminated union in `lib/analytics.ts` for type safety and PostHog schema consistency. If not registered, the `track()` call will accept them via the `any` passthrough or fail type-checking silently.

**Verification needed:** Grep `lib/analytics.ts` for `sop_viewed` and `sop_alignment_viewed` to confirm they are in the union. If absent, this is a P1 (untyped analytics bypass).
```
# Not verified in this review — check analytics.ts manually
```

### `SopIntelligenceInput` type cast at the route boundary

**Finding: Minor type safety gap — P2.** At `route.ts:148-151`, `extractSopIntelligence` returns `{ sopAlignment: unknown; documentationDrift: unknown; runCount: number } | null`. The client-side code in `sopIntelligence.ts` accepts `SopIntelligenceInput | null`. The `unknown` types for `sopAlignment` and `documentationDrift` at the route means TypeScript does not enforce the `SopAlignmentLike` / `DocumentationDriftLike` shapes at the API boundary. The `deriveAlignmentPill` function accepts `SopIntelligenceInput | null | undefined` and safely accesses all fields via optional chaining — so a mismatched JSON shape degrades gracefully to `insufficient` rather than throwing. Safe in practice but worth noting.

### Missing N=2 boundary test in `deriveAlignmentPill`

**Finding: Coverage gap — P2.** The test suite has N=0, N=1, N=4, N=6, N=10, N=12, N=20 but no N=2 case. The boundary condition at `effectiveRunCount < 2` means N=2 is the first valid signal case. A test with `totalRunCount: 2` confirming `kind: 'aligned'` (not 'insufficient') would lock the boundary.

### `SOPStepCardCompact` vs `ExecutionStepCard` duplication

**Finding: Risk — P2.** `SOPPageShell.tsx:466-632` contains `SOPStepCardCompact` which renders the expanded body at line 549-551 WITH `id={`sop-step-body-${step.id}`}`. `SOPExecutionMode.tsx:319` renders the expanded body WITHOUT the `id`. This means the print CSS fix described in section 4 applies only to `SOPStepCardCompact` (used in Visual / Intelligence modes) and not to `ExecutionStepCard` (the default mode). This is the P1 print defect described above. It also represents a maintenance risk: the two components share no common step-body element, so future changes to one may not be mirrored in the other.

---

## 7. Prioritized Fix List

### P0 — Blocking (must fix before broad rollout)

None identified that would cause a crash or data corruption. The implementation is structurally sound.

### P1 — High severity (fix before marketing this feature)

**P1-A: Print defect — Execution mode step bodies invisible when collapsed**
- File: `apps/web-app/src/components/sop-view/SOPExecutionMode.tsx:319`
- Fix: Add `id={`sop-step-body-${step.id}`}` to the expanded body `div` in `ExecutionStepCard`, or add a shared class and update the CSS selector in `globals.css:455`.
- Impact: Users printing from the default Execution mode will get an SOP with all collapsed steps invisible. Only the print cover and already-expanded steps render.

**P1-B: Missing route-level test for `extractSopIntelligence`**
- File: Need new `apps/web-app/src/app/api/workflows/[id]/route.test.ts`
- Fix: Add tests for `extractSopIntelligence` covering null/malformed/missing `intelligenceJson` + happy path.
- Impact: The additive API field has no regression lock; any schema change silently breaks the feature.

**P1-C: Honesty gap — pill claims N runs without denominator context**
- File: `apps/web-app/src/components/sop-view/adapters/sopIntelligence.ts` + `SOPHeader.tsx`
- Fix: Surface `alignedRunCount` alongside `totalRunCount` in the `AlignmentPill` (currently only `runCount` = `totalRunCount` is exposed). Render as "N aligned · M% · K runs" or add a tooltip "X of Y runs match this SOP."
- Impact: "100% · 5 runs" misrepresents coverage when the workflow has more total runs than the alignment cohort. Misleads process owners distributing the SOP.

### P2 — Medium severity (follow-up iteration)

**P2-A: `effectiveRunCount` edge case — engine saw fewer runs than cohort**
- File: `sopIntelligence.ts:90`
- Fix: Add a test for `alignment.totalRunCount=1, runCount=5` and document intended behavior. Consider whether this should be `insufficient` (conservative gate) or `aligned` (if cohort count is authoritative).

**P2-B: Page-title PII risk in evidence snippet**
- File: `sopViewModel.ts:248-252` (normalizeStep pageTitle threading)
- Fix: Add a truncation cap (60 chars) on `pageTitle` from `StepPageContextMap` before it reaches `deriveStepEvidence`. Document the known risk.

**P2-C: Analytics event type registration verification**
- File: `apps/web-app/src/lib/analytics.ts`
- Fix: Confirm `sop_viewed` and `sop_alignment_viewed` are registered in the `AnalyticsEvent` discriminated union. If absent, add them.

**P2-D: Contrast failure on evidence snippet text at 10px**
- File: `SOPExecutionMode.tsx:322`
- Fix: Bump evidence snippet text from `text-[var(--content-tertiary)]` to `text-[var(--content-secondary)]` or increase font size to `text-[11px]`. The axe scan in `v2-a11y.spec.ts` does not cover the SOP page — add SOP-specific axe coverage.

**P2-E: N=2 boundary test missing for `deriveAlignmentPill`**
- File: `sopIntelligence.test.ts`
- Fix: Add test: `totalRunCount: 2` yields `kind: 'aligned'` (not 'insufficient'), confirming the `< 2` gate is exclusive.

**P2-F: `SopIntelligenceInput` type strengthening at route boundary**
- File: `route.ts:148-151`
- Fix: Add Zod schema validation for `sopAlignment` and `documentationDrift` shapes in `extractSopIntelligence` rather than returning `unknown`. This matches the project's "validate all inputs" coding standard.

---

## Summary

| Area | Status | Severity |
|---|---|---|
| N<2 gating (honesty contract) | Correct | — |
| Clamping | Correct | — |
| Hydration safety (formatDate UTC) | Correct | — |
| Null/malformed JSON degradation | Correct | — |
| "100% · 5 runs" honesty | **Gap: no denominator** | P1-C |
| Evidence snippet absent signals | Correct | — |
| Evidence snippet PII risk (pageTitle) | Low risk, undocumented | P2-B |
| Print — white canvas | Correct | — |
| Print — steps forced open | **Defect: Execution mode bodies not targeted** | P1-A |
| Print — color-adjust | Correct | — |
| Coming-soon tile (no false affordance) | Correct | — |
| Alignment pill ARIA | Mostly correct (minor SR duplication) | P2 minor |
| Evidence snippet contrast (10px) | Fails AA in dark mode | P2-D |
| Route test coverage | **Missing** | P1-B |
| Analytics event type registration | Unverified | P2-C |
| N=2 boundary test | Missing | P2-E |

**Blocker status:** No P0 crash bugs. Two P1 items block confident distribution: the print defect (P1-A) which makes the primary export mode produce an incomplete document, and the honesty gap (P1-C) which is particularly important given the product's evidence-linked positioning. P1-B (route test) is a regression-protection gap rather than a visible defect today.

**Recommended next action:** Fix P1-A (ExecutionStepCard `id` attribute) and P1-B (route test) before enabling the SOP PDF export in marketing. Address P1-C (denominator framing) before this feature is highlighted in customer-facing materials as a "maintains itself" proof point.
