# UX SOP P0 Review
**Date:** 2026-06-15
**Reviewer:** UX Designer agent
**Status:** READ-ONLY. No code changes proposed.
**Scope:** Assessment of shipped P0 elements against the world-class bar set in `SOP_WORLDCLASS_BENCHMARK.md` and `UX_SOP_BENCHMARK.md`. Based on direct reading of the rendered screenshot at `apps/web-app/public/docs/screenshots/workflow-sop.png` and component source in `apps/web-app/src/components/sop-view/`.

---

## 1. Shipped Element Assessment

### 1.1 The alignment pill — "Aligned · 100% · 5 runs"

**What shipped.**
`AlignmentBadge` in `SOPHeader.tsx` renders a green `CheckCircle2` icon followed by "Aligned · 100% · 5 runs." The `· 5 runs` fragment is `hidden sm:inline` — invisible on small screens. There is a `title` / `aria-label` with the full text including "based on 5 runs." The full sentence reads: "Aligned · 100% aligned · based on 5 runs" in the aria-label, while the visible copy reads only "Aligned · 100% · 5 runs." The drifting variant swaps in a `GitBranch` icon and amber colours. The insufficient-data variant shows an amber `AlertTriangle` with a label and optional detail.

**What works.**
The three-state model (insufficient / aligned / drifting) is the correct structure. The amber treatment for insufficient data is honest and visible. The `hidden sm:inline` suppression of the run-count on small screens is a reasonable trade-off for a header that is already dense.

**What is confusing or weak.**

The "100%" figure is the most problematic piece. It reads as a perfect score — and that is exactly how a non-expert will interpret it. The spec said this number comes from `sopAlignmentEngine.analyzeSopAlignment`, which returns an alignment level, a score, and context. When the number happens to be exactly 100%, a first-time reader reasonably concludes "this procedure is perfect and fully validated." That may not be true: if only 5 runs existed and they all happened to follow the exact same path, the alignment is a statistical artefact of a small, homogeneous sample — not evidence of a mature process. The green check amplifies this misreading. There is nothing in the visible pill that disambiguates alignment score from quality claim.

The "Aligned" label itself is ambiguous. Aligned to what? The SOP? The last run? The majority path? A user who has not read the help documentation cannot answer that question from the pill alone. The spec notes from `SOP_WORLDCLASS_BENCHMARK.md` call this out explicitly: "Show the claim that is backed by real computation — not marketing."

The `· 5 runs` fragment is structurally the most honest part of the pill. It gives the reader a data-basis signal, which is exactly what the spec asked for. But it is the smallest piece visually and the first to disappear on mobile. This priority is backwards: the run count should be the anchor, not an optional suffix.

The date of the last run is absent. The spec recommended "Aligned · 20 runs · last recorded 14d ago." The shipped version omits recency entirely. A 100% alignment score from 5 runs taken six months ago is meaningfully different from 5 runs taken last week. Without a date, the pill cannot serve as a freshness signal — only a conformance signal. That is a narrower claim than what was intended.

**The Drifting state.**
The current Drifting state shows a `GitBranch` icon, amber colour, and the label "Drifting · [pct]% · [N] runs" (based on the `cls` and `Icon` branch in `AlignmentBadge`). This is honest and clear as far as it goes. It needs a tooltip or a hover expansion that says which step drifted, not just that drift occurred. "Drifting" without a step reference sends the reader back into the procedure looking for the problem. The tooltip currently shows `a.detail` which may carry this information — but on touch devices tooltips are unavailable. The drifting state should include at minimum a step reference in the visible text or a distinct inline callout in the Quick Start card.

**Recommended honest treatment.**

Replace "Aligned · 100% · 5 runs" with a format that emphasises the evidence basis first and the score second:

- Aligned state: "5 runs · 100% aligned" — run count leads, score follows, recency in tooltip / `title`
- Drifting state: "5 runs · Drifting · step 4 changed" — run count leads, then the specificity
- Insufficient: leave as-is; the amber amber treatment is correct

Add a `last run: [date]` to the `title` / `aria-label` at minimum; surface it visibly when the date is more than 30 days ago with amber colouring.

**Over-reassurance risk of 100% + green check.**
Yes, this is over-reassuring. The spec was explicit: "Never fabricate compliance/training metrics we can't measure." A 100% alignment score on 5 identical runs is not a quality guarantee — it is a frequency observation. The component must not imply validation that the data does not support. The simplest fix: remove the checkmark icon from the 100% case specifically and use a neutral info icon instead, reserving the green check only for cases with N ≥ 10 runs. Or, add the sample-size caveat directly: "100% (n=5)" makes the statistical basis visible without requiring the user to count the runs from the suffix.

---

### 1.2 The Quick Start card with scope

**What shipped.**
`QuickStartSection` in `SOPExecutionMode.tsx` renders: What This Does, When To Use, Scope (conditional on `viewModel.metadata.scope`), Before You Begin (prerequisites), Systems Needed, Expected Outcome. The card is styled with an emerald gradient, a `CheckCircle2` icon, and an estimated time in the header.

**What works.**
The information hierarchy is correct: purpose before conditions before prerequisites before outcome. Having Scope as a visible field is a genuine improvement over the prior state where it existed only in the data model. The "Systems Needed" chips with `Monitor` icons and the "Before You Begin" bulleted list are the right visual treatment for their content type. The Expected Outcome row at the bottom of the card — using the last step's `expectedOutcome` — gives the reader a completion signal before they begin.

**What is confusing or weak.**

The "SCOPE" label is unqualified. Per the spec's honesty constraints and the `UX_SOP_BENCHMARK.md` delivery note: "`metadata.scope` is generated by `generateScope()` from the activity name and detected systems. It is an inference, not a human-reviewed definition. Label it 'Observed scope' or 'Derived scope.'" The current label implies that a human defined the scope, which is not the case. This is a minor copy change with a real honesty consequence.

The Quick Start card has no freshness or evidence-basis row. The spec recommended: "a 'freshness summary' row in the Quick Start card — 'Aligned with the last 20 runs · step 4 drifted · last recorded 2026-05-28.'" This row is absent. The alignment pill in the header carries this information, but the Quick Start card is the place a stakeholder reads before deciding whether to distribute the SOP. An operator or manager who opens the Quick Start card and sees no freshness information will not necessarily scroll back up to read the header pill. The two surfaces should reinforce each other.

The WHAT THIS DOES field repeats `viewModel.metadata.objective || viewModel.metadata.purpose`. In the screenshot, this field appears blank or very short. If the objective is empty, the row renders nothing — a visual gap in the card. The card should have a fallback: if objective is empty, show a derived one-line statement rather than a blank.

The BEFORE YOU BEGIN and SYSTEMS NEEDED panels are side-by-side on desktop (`grid grid-cols-1 md:grid-cols-2`) but stack on mobile. On a phone, the SYSTEMS NEEDED panel appears below the prerequisites, which means the user has to scroll inside the Quick Start card before reaching the step list. This is an acceptable trade-off, but on mobile the Systems Needed chips should render first (they are the orientation signal) rather than after prerequisites.

---

### 1.3 The evidence snippet

**What shipped.**
`ExecutionStepCard` in `SOPExecutionMode.tsx` renders an evidence row inside the expanded step body when `step.evidence.hasEvidence` is true. The row shows an `Eye` icon and the text "Observed in [step.evidence.text]." This is the correct pattern — it surfaces the observed-from context without requiring screenshots.

**What works.**
The `Eye` icon and "Observed in" label make the epistemics clear: this is what was observed, not what was asserted. The rendering is conditional on actual evidence existence, which means it is not shown when evidence is absent — the correct honest behaviour.

**What is weak.**
The evidence row is only visible when the step is expanded. An operator who reads the collapsed step list sees no evidence signal at all. The per-step confidence dot (`ConfidenceDot`) in the collapsed header is the only visible data-basis indicator, and it is a colour without a label. Operators who encounter a low-confidence step (amber dot) have no visible explanation in the collapsed header. A one-word label — "Low confidence" or a "?" marker — would communicate the meaning without requiring expansion.

The evidence row sits at the top of the expanded body, before instructions. This is the correct position. The text format "Observed in [system] · [page title]" is the right density. No changes needed to the content format, only to the access pattern (move at least a summary indicator into the collapsed header).

---

### 1.4 The mode renames

**What shipped.**
`SOPModeSwitcher.tsx` reads labels from `SOP_MODE_LABELS` in `types.ts`. The screenshot shows: "Execution SOP" / "Flow View" / "Analysis." The prior labels were "Execution SOP" / "Visual Process" / "Intelligence."

**What works.**
"Flow View" is clearer than "Visual Process." It describes what the user sees, not what the view is classified as. "Analysis" is clearer than "Intelligence" — it removes the ambiguity of "Intelligence" as a product tier or AI capability descriptor.

**What is slightly off.**
"Execution SOP" remains verbose for a tab label in a compact toolbar. In the screenshot it occupies the most space and wraps at narrow widths. The spec noted that shortening to "Do It" is an option, though it also noted the current label is acceptable. The recommendation stands: this label is the only one that names the tab type rather than the action, which is inconsistent with the other two. At minimum, "Execute" or "Run SOP" would align better with the pattern of the other two tabs.

---

### 1.5 The coming-soon tile (Ask This Process)

**What shipped.**
`AskThisProcessPanel` in `SOPIntelligenceMode.tsx` is now a fully non-interactive tile. There is no `<input>`, no `<button>`, no `disabled` cursor. The panel has a header with "Ask This Process" and a "Coming soon" badge, a description paragraph, a list of example questions as plain text with `Sparkles` icons, and a context summary row at the bottom.

**What works.**
This is the correct fix. The prior disabled-input pattern was the most trust-damaging element in the entire SOP experience. The current tile communicates intent without implying availability. The example questions give the reader a mental model of what the feature will do. The context summary row ("8 steps · 2 systems · 3 insights") is a nice touch — it shows the data that will ground the future Q&A, making the claim feel credible.

**What is weak.**
The panel occupies a full `w-80` right column at large screen widths. That is approximately 320px of layout dedicated to a static coming-soon tile. This is a lot of screen real estate for a placeholder. The spec benchmark noted the `w-80` right panel "occupies a significant portion of the Intelligence mode layout despite delivering nothing." The current tile at least delivers an honest message rather than a broken interface, but the question of whether the space could be used for something functional in the interim is still open. One option: use the right column for the `WorkflowDNASection` at large widths and move the coming-soon tile to a compact card within the main column. This is a P1 layout decision, not a trust issue.

The "Coming soon" badge uses a `text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded` chip without a border. Every other status badge in the SOP system has a border. This is a minor visual inconsistency — add `border border-violet-200` to match.

---

### 1.6 The Print / PDF button

**What shipped.**
`SOPPageShell.tsx` wires the Printer icon button to `handlePrint`, which calls `window.print()` after firing a `sop_exported` analytics event. The button label is "Print / PDF." The print stylesheet is present in `globals.css` under `.sop-print-root @media print`. The print cover in `SOPPrintCover` renders: title, objective, step count, run label, confidence, alignment status, and generated date. The honesty footer at the bottom shows "Ledgerium AI — [title] / All data derived from observed behavior."

**What works.**
The wiring is complete. The button label "Print / PDF" is correct — it communicates both use cases without requiring explanation. The print cover is substantively complete: it includes the evidence basis ("Based on N recordings"), confidence, and generation date. The CSS structure is technically correct: white canvas, `print-color-adjust: exact` to preserve badge colours, step body `display: block !important` to force expanded state, and the honesty footer with `position: fixed; bottom: 0`.

**What is weak.**
The print cover has no document number or version identifier. Professional compliance documents include a revision identifier ("v2.0"), a document owner, and an effective date. The shipped cover has the generation date but not in a labelled position that reads as a formal document property. For the compliance and training use cases, the cover line should read:

> Standard Operating Procedure · v[version] · Generated [date] · Ref: WF-[workflowId]

This is copy, not a structural change.

The `sop-print-root nav, .sop-print-root button` CSS rule hides all navigation and controls — including the tab strip above the SOP. This is correct. However, the rule also hides the cookie consent banner (`[data-consent-banner]`) which is a global element that may or may not have that attribute depending on the implementation. If the cookie banner renders without `data-consent-banner`, it will print on every page. This should be verified in a real browser print session.

**Dark mode in print risk.** The print CSS explicitly sets `background: #ffffff !important; color: #111827 !important` on `.sop-print-root`. This overrides the dark mode CSS custom properties. However, the inline colour badges and accent colours are rendered via inline `style` attributes (e.g., `style={{ color: step.accentColor, background: \`${step.accentColor}15\` }}`). These inline styles are not overridden by the `.sop-print-root` rule because `!important` on the element does not cascade to children's inline styles. The `print-color-adjust: exact` rule preserves them as-is. In dark mode, these colours may have been chosen for dark background contrast — the green `#059669` and brand greens will remain visible on white, but the `--surface-secondary` and `--content-tertiary` CSS variables used in some sub-elements will not be overridden by the print CSS, since those are applied via utility classes, not inline styles. The net result: some secondary text and chip backgrounds will print as dark on dark or as near-invisible light on white. A targeted fix is to add explicit overrides for the semantic colour variables inside the print block:

```css
.sop-print-root {
  --surface-secondary: #F8FAFC !important;
  --surface-elevated: #FFFFFF !important;
  --content-primary: #111827 !important;
  --content-secondary: #374151 !important;
  --content-tertiary: #6B7280 !important;
  --border-default: #E2E8F0 !important;
  --border-subtle: #F1F5F9 !important;
}
```

This is a single CSS block addition and it eliminates the dark-mode-in-print risk entirely.

---

## 2. Alignment-Pill UX Deep Assessment

### 2.1 Is "100%" + a green check over-reassuring?

Yes. The combination of a green checkmark (`CheckCircle2`) and a 100% figure implies certification, not observation. The visual grammar of a green check is "verified" or "passed" across every mainstream product. When a user sees it on a procedure document, they read it as "this was reviewed and confirmed correct." That is not what the engine computes: it computes the frequency with which the observed runs matched the SOP's documented steps. These are different claims.

The risk is highest in the exact state where the number happens to be 100% — which can occur on as few as 2 runs if both runs followed identical paths. A stakeholder distributing this SOP to 20 people on the strength of that badge would be acting on a false confidence signal.

The green check should be reserved for runs where N is large enough to be statistically meaningful. A reasonable threshold: N ≥ 10. Below that, use a neutral indicator regardless of the alignment percentage.

### 2.2 Should the date be more prominent?

Yes. The date of the last run is the freshness signal. Alignment percentage tells you *how consistent* the process is; the date tells you *how current* the observation is. A 92% alignment score from recordings made 180 days ago is not useful to an operator today if the software being recorded has since changed.

The date should appear in the pill tooltip at minimum, and visibly in the pill text when the most recent recording is older than 30 days — with amber colouring as a staleness signal:

- Recordings within 14 days: no date shown (freshness is implicit from the run count)
- 15–60 days old: "Last run 43d ago" appended to the pill text in secondary colour
- Older than 60 days: pill turns amber regardless of alignment percentage; "Stale — last run [date]"

This is the same pattern that version-control tools and build systems use for build recency — users learn it immediately.

### 2.3 Clearest honest treatment

The pill should present evidence in this order: data basis, then assessment, then staleness.

**Aligned (recent, high N):**
> ✓ 20 runs · 96% aligned

**Aligned (low N):**
> ● 5 runs · 100% aligned · n is small

**Drifting:**
> ⚡ 12 runs · Drifting · step 3 changed

**Stale:**
> ⚠ 5 runs · 100% aligned · last run Jun 2026

**Insufficient (N < 2):**
> ⚠ 1 recording — review before distributing

The key changes from the current implementation:
1. Run count appears before the percentage, not after
2. The green check is reserved for high-N cases only
3. Staleness surfaces automatically for old recordings
4. The drifting state names the step, not just the condition

### 2.4 What the Drifting state should look like

The current Drifting state is correct in colour but insufficient in specificity. The pill says "Drifting · [pct]% · [N] runs" — it tells the reader that something changed but not what. A reader who sees "Drifting" must then either dismiss it or read every step looking for the problem.

The Drifting pill should:

1. Name the specific step (or steps) that drifted in the visible pill text: "Drifting · step 3 · 12 runs"
2. Expand on hover to a tooltip: "Step 3 changed in recent runs — recorded action differs from documented steps. Review and update the SOP if needed."
3. In the Quick Start card, add an amber notice row: "One or more steps have changed in recent recordings. See step 3."
4. Inside the expanded step card for the drifted step, add an amber callout with the `AlertTriangle` icon: "Recent runs show this step changed — update SOP or re-record."

This multi-surface pattern ensures the signal reaches the operator wherever they encounter it, without requiring them to understand what "Drifting" means in isolation.

---

## 3. Open SOP UX Issues Not Addressed by P0

The following are confirmed open from the code — none were fixed in the P0 batch.

### 3.1 Steps collapsed by default in execution mode — still present

`SOPPageShell.initExpandedForMode` still returns `new Set(steps.slice(0, 5).map(s => s.id))` for execution mode. Only the first 5 steps are expanded. An operator performing step 6 or later sees a collapsed step with no content until they click to expand it. This was classified as P1 in the spec but should be treated as a defect in an execution document. The fix is one line. It is still open.

Visual mode still defaults to all steps collapsed (`new Set<string>()`). This is appropriate for the reference-browsing use case of Flow View. No change needed there.

### 3.2 System chip on mobile — still hidden

`ExecutionStepCard` line 298: `hidden md:block` on the system chip. `SmartStepCard` line 228: same pattern. The chip is invisible on screens below approximately 768px. The spec flagged this as "High severity on mobile and tablet" because the system name is orientation-critical — it answers "which application am I in right now?" An operator on a phone following a procedure cannot see this. Still open.

### 3.3 Mark-as-done per step — not present

There are no step-level checkboxes in `ExecutionStepCard`. The `CompletionSection` at the end of the page has working checkboxes for the overall completion criteria, but individual steps have no "I've done this" affordance. An operator performing a 12-step process has no way to mark their position in the procedure without relying on mental tracking. Still open.

### 3.4 SOP ↔ map ↔ report linkage — not present

No cross-navigation between the SOP, the process map ("Flow View"), and the report. The step ID infrastructure is present (`id="sop-step-{step.id}"` in the DOM), and the spec documented the exact pattern needed ("→ View step N in process map"). Still open.

### 3.5 Role / actor per step — not rendered

`SOPViewStep.actor` is populated by the engine. It is referenced in the expanded step body of `ExecutionStepCard` inside a flex row at line 332: `{step.actor && (...)}`. Looking at the code, this field IS now rendered as part of the actor/inputs/outputs flex row. However it is in small `10px` type with the label "ROLE" in all-caps tertiary colour — it reads as metadata rather than as an actionable field. For multi-role procedures this needs to be more visually prominent.

### 3.6 Progress indicator — not present

No "N of M steps" label, no progress bar, no step-level completion tracking. The step rail shows numbered buttons but the current state of the operator's position in the procedure is not visible. Still open.

---

## 4. Print / PDF UX Review

### 4.1 What is working

The `SOPPrintCover` component and the `globals.css` print block are substantively complete and technically correct. The critical requirements from the spec are met:

- Steps are forced open (`[id^='sop-step-body-'] { display: block !important }`)
- Navigation chrome is hidden (`.sop-no-print`, `nav`, `button`)
- White canvas and black body text are applied
- The evidence cover is rendered print-only and hidden on screen
- The honesty footer appears at the bottom of every page via `position: fixed; bottom: 0`
- Print colour preservation via `print-color-adjust: exact`

The cover includes: kicker, title, objective, step count, run label, confidence, alignment, and generation date. This is a substantive compliance-grade cover that exceeds what Scribe or Tango produce.

### 4.2 What needs fixing

**Dark-mode-in-print risk.** As described in section 1.6, CSS custom properties (the `var(--surface-*)` and `var(--content-*)` tokens) are not overridden by the current print block. The print CSS overrides the root element colour and background but not the CSS variable values that are inherited by child components. In dark mode, cards using `bg-[var(--surface-elevated)]` will inherit the dark `#1C2128` background unless the variable itself is overridden. The fix is a single CSS block inside `.sop-print-root @media print` that resets all custom properties to light-mode values. This is the highest-priority print fix because it silently breaks print output for every dark-mode user without any visible on-screen warning.

**Document reference on the cover.** The cover has no document identifier. The compliance use case requires a reference number or identifier on the cover. Recommended: add the workflow ID or a formatted document reference as a cover meta field.

**Footer on each page.** `position: fixed; bottom: 0` produces a fixed footer in screen rendering. In print, `position: fixed` elements repeat on every page in most browsers — this is the intended behaviour. However, fixed positioning in print is browser-dependent: Chrome and Edge handle it correctly; Firefox has historically had inconsistent behaviour. The safest approach for broad compatibility is `position: running(footer)` using CSS Paged Media, but that requires a polyfill or a server-side PDF renderer. For the current `window.print()` approach, `position: fixed` is acceptable and will work for the primary Chrome/Edge audience. Document this assumption in a comment in the CSS.

**Page break after Quick Start.** The spec recommended page breaks before major sections. The current CSS has `break-inside: avoid` on cards but no explicit `break-before: page` on the Procedure section or Completion Checklist. A page break after the Quick Start card and before the step list would produce a more readable printed document. Add: `.sop-print-root section:first-of-type { break-after: page; }` or a more specific class.

**Completion checklist state in print.** The `CompletionSection` renders checkboxes as styled `<button>` elements. The print CSS hides all buttons (`button { display: none !important }`). This means the completion checklist is completely absent from the printed output. The intent of printing the SOP as a procedural document means the completion checklist should appear as an uninteractive list in print. This requires either a print-specific rendering class on the checklist items or an exemption for the checklist in the button hide rule.

### 4.3 Recommended cover line for compliance distribution

The printed cover should read:

```
LEDGERIUM AI — STANDARD OPERATING PROCEDURE

[SOP Title]

[Objective sentence]

5 steps · Based on 5 recordings · Confidence: 90% · Aligned: 100%
Generated: Jun 15, 2026 · Ref: WF-[workflowId]

All data derived from observed behavior. Evidence-linked. No AI inference applied.
```

The "Ref: WF-[workflowId]" line provides the traceability reference that compliance and training teams require. It is a one-line addition to `SOPPrintCover`.

### 4.4 Dark-mode screenshot for review

The screenshot shows a dark-mode UI. The print CSS correctly switches to white canvas, but the custom-property issue means that in dark mode, printing will produce cards with dark backgrounds unless the variable override block is added. This is the highest-risk gap in the print implementation.

---

## 5. Visual Consistency with the Rest of the App

### 5.1 What is consistent

The emerald colour scheme for the Quick Start card is consistent with the brand-600 / brand-green accent colour used in the global CSS. The step ordinal badges use `step.accentColor` with a 15% opacity fill — the same pattern used in the process map step nodes. The metric chips in the header use the same `10px` / `11px` text scale and `var(--content-secondary)` / `var(--content-tertiary)` hierarchy as other data-dense views in the dashboard. The card `rounded-xl` / `rounded-2xl` radius and `var(--border-default)` border system match the dashboard card pattern.

The mode switcher (`SOPModeSwitcher`) uses the same pill-within-a-pill pattern with `bg-[var(--surface-secondary)]` outer and `bg-[var(--surface-elevated)]` active tab — identical to the pattern in the workflow detail tab strip.

### 5.2 What is inconsistent

**The Quick Start card uses `bg-gradient-to-br from-emerald-50/80 to-white`.** On dark mode (`--surface-elevated: #1C2128`), the `to-white` endpoint will be literal white (#ffffff), creating a jarring gradient from emerald-50 to white inside a dark-background card. This is a Tailwind opacity shorthand: `from-emerald-50/80` applies opacity to the emerald-50 colour, and `to-white` applies literal white. In dark mode, the card will appear to have a white region in its bottom-right corner. The gradient should use `to-[var(--surface-elevated)]` or `to-transparent` to respect the active theme.

**The Intelligence mode header** (`SmartHeader`) uses `bg-gradient-to-br from-slate-900 to-slate-800` — an absolute dark colour that is hardcoded regardless of the active theme. In light mode, this produces a dark card inside an otherwise light interface. This creates a jarring contrast that is inconsistent with the rest of the light-mode dashboard. If the app operates in light mode, this card should lighten accordingly.

**The "Coming soon" badge** in `AskThisProcessPanel` lacks the `border` that all other status badges in the system have (e.g., the "SOP" label at `border border-brand-200`, the completion criteria badge at `border border-emerald-200`). Add `border border-violet-200` to maintain visual consistency.

**Text sizing inconsistency.** The header area uses `text-[9px]` and `text-[10px]` throughout — arbitrary pixel sizes outside the design system's named scale (`text-ds-xs`, `text-ds-sm`). Other components in the dashboard use the design system tokens. This is a minor inconsistency but it produces different line-height and baseline behaviour across browsers. The `text-[9px]` labels in particular (`SOP` badge, version string, metric chip labels) will be unreadably small on Windows at 96 DPI without subpixel rendering. The minimum readable size for secondary interface text should be 11px / `text-[11px]`, or use `text-ds-xs` which the design system presumably defines at a legible minimum.

**The "BEFORE YOU BEGIN" and "SYSTEMS NEEDED" section headers** inside the Quick Start card use `text-[9px] font-semibold uppercase tracking-wider` in emerald-600. The section headers in the main SOP body (`SectionLabel`) use `text-[10px] font-bold uppercase tracking-wider` in `var(--content-secondary)`. These are the same visual element at different sizes and colours without a design reason for the difference.

---

## 6. Prioritised Fix List

The following list is ordered by severity of the user problem, not by implementation effort. All items map to specific components and include concrete copy recommendations where relevant.

---

### P0 — Trust-breaking or task-blocking

**FIX-01: Dark-mode-in-print — CSS custom property override**
Component: `apps/web-app/src/app/globals.css`, inside the `.sop-print-root @media print` block.
Add a CSS variable reset block at the top of the `.sop-print-root` rule inside `@media print`:
```css
--surface-primary: #FFFFFF;
--surface-secondary: #F8FAFC;
--surface-elevated: #FFFFFF;
--content-primary: #111827;
--content-secondary: #374151;
--content-tertiary: #6B7280;
--border-default: #E2E8F0;
--border-subtle: #F1F5F9;
```
Risk: without this, every dark-mode user who prints the SOP gets cards with dark or near-invisible backgrounds. Silent failure.

**FIX-02: Completion checklist hidden in print**
Component: `globals.css` and/or `SOPExecutionMode.tsx`.
The `.sop-print-root button { display: none }` rule removes the entire completion checklist from print output. Add an exception class `.sop-print-checklist-item` to the checklist list items and exclude it from the button hide rule. Or render the checklist as `<li>` elements rather than `<button>` elements in print. Without this, the completion criteria section is simply absent from the printed SOP.

**FIX-03: Alignment pill — remove green check from 100% / low-N cases**
Component: `SOPHeader.tsx`, `AlignmentBadge`.
When `a.alignmentPct === 100` and `a.runCount < 10`, replace `CheckCircle2` with `Info` or remove the icon entirely. Reserve the green check for cases with high N and high alignment. Copy: change "Aligned · 100% · 5 runs" to "5 runs · 100% aligned" — run count first. This prevents the 100% + green check from being misread as a quality certification on small samples.

**FIX-04: Quick Start card gradient in dark mode**
Component: `SOPExecutionMode.tsx`, `QuickStartSection`.
Change `from-emerald-50/80 to-white` to `from-emerald-50/80 to-transparent` (or `to-[var(--surface-elevated)]`). The literal `to-white` endpoint renders as white (#ffffff) in dark mode, creating a visual break inside a dark card.

---

### P1 — Material quality gap; should resolve before SOP is promoted as a distribution feature

**FIX-05: Steps collapsed by default in execution mode**
Component: `SOPPageShell.tsx`, `initExpandedForMode`.
Change `new Set(steps.slice(0, 5).map(s => s.id))` to `new Set(steps.map(s => s.id))` for the `'execution'` case. Every world-class comparator shows full step content by default. "Collapse all" in the controls row handles users who want a compact overview. This is one line.

**FIX-06: System chip always visible on mobile**
Components: `SOPExecutionMode.tsx` (`ExecutionStepCard`, line 298), `SOPIntelligenceMode.tsx` (`SmartStepCard`, line 228).
Remove `hidden md:block`. Relocate the system chip below the step title inside the collapsed header flex layout (add `flex-wrap` to the title row if not already present). The chip should wrap to a second line on small screens rather than disappear.

**FIX-07: Alignment pill — surface the date**
Component: `SOPHeader.tsx`, `AlignmentBadge`.
Add a `last run: [date]` to the `aria-label` and to the `title` attribute immediately. Surface it visibly in the pill text when the last run is older than 30 days ("Aligned · 5 runs · last run Jun 2025" in amber). When last run is within 14 days, the date is optional. This requires knowing the last recording date — either from `sopIntelligence` or from `workflowRecord.createdAt` passed through to the alignment pill.

**FIX-08: Drifting state — name the step**
Component: `SOPHeader.tsx`, `AlignmentBadge`.
When `a.kind === 'drifting'`, the visible pill text should include the first drifting step reference if available from the intelligence data. Copy: "Drifting · step 3 · 12 runs" rather than "Drifting · [pct]% · 12 runs." Add a Quick Start card callout row for drifting SOPs: amber bar with AlertTriangle and "Step 3 changed in recent recordings. Review before distributing."

**FIX-09: "Scope" label should be "Observed scope"**
Component: `SOPExecutionMode.tsx`, `QuickStartSection`.
Change the section label from "SCOPE" to "OBSERVED SCOPE." This is a single string change. Rationale: the scope is derived by `generateScope()`, not reviewed by a human. The label must not imply human authorship.

**FIX-10: Add freshness row to Quick Start card**
Component: `SOPExecutionMode.tsx`, `QuickStartSection`.
Add a one-line row inside the Quick Start card (above "Before You Begin"), visible only when alignment data exists: "Aligned with the last [N] runs · Generated [date]." When drifting: "Drifting — step [N] changed since last recording." This mirrors the header pill in prose form at the place where a stakeholder decides whether to distribute the SOP.

**FIX-11: Print cover — add document reference**
Component: `SOPPageShell.tsx`, `SOPPrintCover`.
Add a "Ref: WF-[workflowId]" field to the cover meta section. The `workflowId` prop is available in `SOPPageShell`. This is required for compliance and training record traceability.

**FIX-12: Intelligence mode SmartHeader hardcoded dark gradient**
Component: `SOPIntelligenceMode.tsx`, `SmartHeader`.
`from-slate-900 to-slate-800` is hardcoded dark. In light mode this renders as an dark island inside a light page. Change to use a theme-aware gradient: `from-[var(--surface-primary)] to-[var(--surface-secondary)]` with `border border-[var(--border-default)]`, keeping the `text-violet-300` accents which read well on both light and dark backgrounds. Or maintain the dark aesthetic explicitly and document it as intentional brand treatment in Intelligence mode.

---

### P2 — Polish and comprehension; addressable in a subsequent iteration

**FIX-13: Rename "Execution SOP" to "Execution" or "Execute"**
Component: `apps/web-app/src/components/sop-view/types.ts`, `SOP_MODE_LABELS`.
"Execution SOP" is the only tab that names the view type rather than the action. "Flow View" and "Analysis" are action- or content-oriented. "Execute" or "Run Steps" would be consistent. Tooltip: "Step-by-step guide for performing this procedure."

**FIX-14: Add "mark as done" per step in execution mode**
Component: `SOPExecutionMode.tsx`, `ExecutionStepCard`.
Add a checkbox to the left of the ordinal badge in the collapsed step header. Checking it marks the step done in local React state. Checked steps show a muted ordinal badge and greyed title. No persistence required. This is the minimum viable do-mode affordance.

**FIX-15: "Coming soon" badge needs a border**
Component: `SOPIntelligenceMode.tsx`, `AskThisProcessPanel`.
Add `border border-violet-200` to the "Coming soon" chip. Consistent with all other status badges in the system.

**FIX-16: Add page break before Procedure section in print**
Component: `globals.css`.
Add `.sop-print-root .sop-print-procedure-break { break-before: page; }` and apply the class to the opening `<section>` of the step list in `SOPExecutionMode`. This produces a cleaner printed document with the Quick Start on the first page and the procedure starting on the second.

**FIX-17: Section header size inconsistency**
Components: `SOPExecutionMode.tsx` QuickStart inner labels vs `SectionLabel`.
Inner card headers use `text-[9px]`. `SectionLabel` uses `text-[10px]`. Both should align to a consistent size — `text-[10px]` minimum, preferring `text-ds-xs` if the design system token is defined at a legible size.

**FIX-18: SOP ↔ report provenance link**
Component: `SOPExecutionMode.tsx`, `SOPIntelligenceMode.tsx`, `SOPVisualMode.tsx` — provenance footers.
Replace the plain-text `viewModel.metadata.sourceNote` footer with an actionable link: "Generated by Ledgerium AI from [N] recording(s). View backing evidence →" The link should trigger a tab switch to the Report view. This makes the evidence claim navigable and closes the SOP ↔ report linkage gap without requiring a new page.

---

## Summary Table

| ID | Severity | Component | What to fix |
|---|---|---|---|
| FIX-01 | P0 | globals.css | CSS variable reset block in print to fix dark-mode-in-print |
| FIX-02 | P0 | globals.css + SOPExecutionMode | Completion checklist visible in print output |
| FIX-03 | P0 | SOPHeader — AlignmentBadge | Remove green check from 100%/low-N; run count first |
| FIX-04 | P0 | SOPExecutionMode — QuickStartSection | Gradient `to-white` → `to-transparent` in dark mode |
| FIX-05 | P1 | SOPPageShell — initExpandedForMode | All steps expanded by default in execution mode |
| FIX-06 | P1 | ExecutionStepCard, SmartStepCard | Remove `hidden md:block` from system chip |
| FIX-07 | P1 | SOPHeader — AlignmentBadge | Surface last-run date in pill; amber when >30d |
| FIX-08 | P1 | SOPHeader — AlignmentBadge + QuickStart | Name the drifting step; Quick Start callout row |
| FIX-09 | P1 | SOPExecutionMode — QuickStartSection | "SCOPE" → "OBSERVED SCOPE" |
| FIX-10 | P1 | SOPExecutionMode — QuickStartSection | Add freshness row to Quick Start card |
| FIX-11 | P1 | SOPPageShell — SOPPrintCover | Add workflow reference to print cover |
| FIX-12 | P1 | SOPIntelligenceMode — SmartHeader | Theme-aware dark header gradient |
| FIX-13 | P2 | types.ts — SOP_MODE_LABELS | "Execution SOP" → "Execute" or "Execution" |
| FIX-14 | P2 | SOPExecutionMode — ExecutionStepCard | Mark-as-done checkbox per step |
| FIX-15 | P2 | SOPIntelligenceMode — AskThisProcessPanel | Add `border border-violet-200` to Coming soon badge |
| FIX-16 | P2 | globals.css | Page break before Procedure section in print |
| FIX-17 | P2 | SOPExecutionMode inner labels | Unify section header text size to `text-[10px]` minimum |
| FIX-18 | P2 | Provenance footers (all three modes) | "View backing evidence →" link to Report tab |

---

*All assessments are based on direct source reading of shipped components. No code changes were made. Component references are traceable to `apps/web-app/src/components/sop-view/` and `apps/web-app/src/app/globals.css`.*
