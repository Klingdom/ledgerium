# PM Review — SOP P0 Implementation
**Author:** product-manager
**Date:** 2026-06-15
**Commit reviewed:** 3aa3708
**Status:** READ-ONLY review. No code changes. Inputs for coordinator + CEO decisions.

---

## 0. One-paragraph verdict

The P0 batch shipped the right things in the right order. The moat — the alignment/freshness signal — is now visible, the evidence snippet is live, the honesty fixes are real, and PDF is wired. That is the entire P0 intent delivered. One honesty defect undermines the headline claim: the "Aligned · 100% · 5 runs" pill is showing a structural-similarity score and labelling it as a conformance rate. The SOP expert review calls this a launch-blocking defect. The PM agrees it is the most important fix. Everything else in P0 is solid. Fix the pill framing, then move to P1 with the alignment/drift engines surfacing their full output per-step — that is the "living SOP" activation, and it is still fully unshipped.

---

## 1. P0 Delivery — Score vs. Intent

The P0 definition (from `SOP_WORLDCLASS_BENCHMARK.md`) was: wire the alignment/drift freshness signal (gated N≥2), render per-step evidence snippet, render roles/scope/inputs, PDF/print, honesty fixes (coming-soon tile, single-run disclosure, observed-vs-inferred), mode renames.

### 1.1 Alignment/freshness pill — SHIPPED WITH A DEFECT

**Intended:** Surface the living-SOP signal. Gate at N≥2. Render Aligned/Drifting/Insufficient. This is the product's strategic moat made visible.

**Delivered:** The N≥2 gate is correctly implemented. Single-run SOPs correctly render the neutral amber "Based on 1 recording — review before distributing" disclosure rather than a score. Null/malformed intelligenceJson degrades cleanly. The green/amber/red color tiers are appropriately coded. These are real honesty wins.

**The defect:** The percentage shown is `alignmentScore` — a weighted structural-similarity blend of bigram-Jaccard category sequences. It is NOT the conformance rate. The engine separately computes `alignedRunCount / totalRunCount` (the fraction of runs that actually fit the documented SOP path), and the pill ignores it. Per the SOP expert review and QA, the scenario in the benchmark docs — 16 recordings across 6 variants, SOP documenting the dominant 5-run path — would render "Aligned · 100% · 5 runs." A reader, and any auditor, interprets "100% aligned · 5 runs" as: "100% of the 5 runs conform to this SOP." The engine's `alignedRunCount` field is already in the data — it is simply not threaded through. The fix is additive, not architectural.

**Score: 7/10.** The infrastructure is right. The number is wrong. Shipping this without fixing the framing first means the product's most distinctive claim — deterministic, honest conformance signal — is the thing that currently overstates conformance.

### 1.2 Per-step evidence snippet — SHIPPED, CORRECT

**Intended:** Render the application label and page title per expanded step from captured `page_context` — making the evidence-linked positioning visible at the step level.

**Delivered:** The `SOPViewStepEvidence` struct is populated from real captured signals only. `hasEvidence: false` means nothing is rendered — no fabrication. Deduplication prevents "Gmail · Gmail · Send." The "Observed in [app] · [page]" line appears inside expanded step cards when data is present. The render is conditionally omitted when absent. QA confirms correctness including null/whitespace guard cases.

**Caveat:** Evidence quality is bounded by what was captured. A single-run SOP on a simple process may show evidence on most steps; a multi-system workflow captured with limited page_context may show nothing on several steps. That is honest behavior, not a defect.

**Score: 9/10.** The minimum viable evidence-linkage display is working and honest.

### 1.3 Scope, actor/role, inputs/outputs — SHIPPED, CORRECT

**Intended:** Render the computed-but-previously-hidden fields: `SOP.scope` in Quick Start, `SOPViewStep.actor`, `SOPViewStep.inputs`, `SOPViewStep.outputs` in expanded step bodies.

**Delivered:** Scope appears in Quick Start under "Scope" when `metadata.scope` is non-empty. Role, Inputs, and Outputs render as a row of chips inside expanded step bodies when populated. The screenshot shows "1 role" in the header metric chips, and the role row is visible in the step body in code. The fields render nothing when empty — no fabricated values.

**Gap remaining:** `SOPViewStep.outputs` is in the type and rendered in code, but the view model builder (`sopViewModel.ts`) may not populate `outputs` for most steps in practice. This is not a P0 failure — the render path is correct. Populating outputs more completely is a view model improvement, not a missing P0 feature.

**Score: 9/10.**

### 1.4 PDF/print — SHIPPED, CORRECT

**Intended:** Wire the Printer icon to `window.print()` and add `@media print` CSS that forces steps open, hides chrome, and renders an evidence cover.

**Delivered:** The Print/PDF button is wired to `window.print()` with the `sop_exported` analytics event (format: 'pdf'). A dedicated `SOPPrintCover` component renders the title, objective, step count, run count, confidence, alignment (when available), and generated date — hidden on screen, visible in print. The print-cover includes the honest disclosure: "All data derived from observed behavior. Evidence-linked. No AI inference applied." The `sop-no-print` class hides the step rail and mode switcher in print. The `globals.css` `@media print` block is referenced in the shell.

**What is not verified without browser testing:** whether the step bodies actually expand in print (the CSS likely forces `.sop-print-root` step bodies to display), and whether the print-cover fonts and layout survive browser print rendering. These are engineering validation items, not PM items.

**Score: 8/10.** The mechanism is correct. Real-world PDF output should be validated in a browser session before treating PDF as complete.

### 1.5 Honesty fixes — SHIPPED, CORRECT

**Intended:** Replace the "Ask This Process" broken input with an honest coming-soon tile. Add single-run disclosure. Distinguish observed vs. inferred outcomes.

**Delivered:**
- The "Ask This Process" UI state was addressed. (The benchmark called for replacing the `cursor-not-allowed` disabled input with a proper coming-soon tile — the current empty state component renders cleanly without broken interactive elements.)
- Single-run disclosure: when `alignment.kind === 'insufficient'` and `runCount <= 1`, the pill renders "Based on 1 recording — review before distributing" in amber. This is correct.
- Observed vs. inferred outcomes: the `outcomeObserved` boolean on `SOPViewStep` controls whether the expanded outcome shows a green CheckCircle2 ("Observed outcome:") or a neutral Info icon with an "Inferred" badge. This is a real honesty improvement — the benchmark explicitly called out the incorrect green "verified" check on inferred outcomes.

**Score: 9/10.** The three honesty fixes are correctly implemented.

### 1.6 Mode renames — SHIPPED, CORRECT

**Intended:** Rename "Visual Process" → "Flow View" and "Intelligence" → "Analysis."

**Delivered:** `SOP_MODE_LABELS` in `types.ts` shows: `execution: 'Execution SOP'`, `visual: 'Flow View'`, `intelligence: 'Analysis'`. The screenshot confirms "Execution SOP | Flow View | Analysis" in the mode switcher. These are cleaner, less internal-jargon labels.

**Score: 10/10.**

### Summary

| P0 Item | Score | Status |
|---|---|---|
| Alignment/freshness pill (N≥2 gated) | 7/10 | SHIPPED — headline number semantically wrong |
| Per-step evidence snippet | 9/10 | SHIPPED — correct |
| Scope / roles / inputs / outputs | 9/10 | SHIPPED — correct |
| PDF / print | 8/10 | SHIPPED — needs browser validation |
| Honesty fixes (3 items) | 9/10 | SHIPPED — correct |
| Mode renames | 10/10 | SHIPPED — correct |

**Overall P0 delivery: 8.7/10.** The batch was well-scoped and delivered cleanly. One defect matters more than all the rest combined.

---

## 2. The Most Important Fix: Alignment Pill Framing

### What is wrong

The pill shows `alignmentScore` as a percentage and labels it "Aligned." This is a structural-similarity score, not a conformance rate. The engine also computes `alignedRunCount` — the number of runs that actually fit the documented procedure path (similarity ≥ 0.6 threshold). That is the number a user, manager, or auditor wants to see.

The scenario the benchmark explicitly describes: 16 total recordings, 6 variants, 5 dominant-path runs. Current pill: "Aligned · 100% · 5 runs." Honest framing: "5 of 16 runs fit this procedure (~31%)." The product has shipped the signal that is supposed to prove it is more honest than Scribe — and it currently overstates conformance by roughly 3×.

### Why this matters strategically, not just technically

The entire SOP product positioning is "this SOP is based on what actually happened, not what someone remembered." The alignment pill is the proof point. If the proof point is a better-sounding but semantically wrong number, the moment a technically sophisticated buyer checks the math — or the moment a competitor reads the benchmark and points it out — the positioning unravels. The honesty claim must be technically correct, not just technically defensible.

### The fix

The engine already produces `alignedRunCount` and `totalRunCount` in the `SOPAlignmentResult` struct. The `SopAlignmentLike` interface in `sopIntelligence.ts` already carries `alignedRunCount`. It is not being threaded into `AlignmentPill`. The fix requires:

1. Add `alignedRunCount: number` to the `AlignmentPill` interface in `sopIntelligence.ts`.
2. Populate it from `alignment.alignedRunCount` in `deriveAlignmentPill`.
3. Change the pill percentage to `Math.round((alignedRunCount / totalRunCount) * 100)` — the fitness rate.
4. Change the label from "Aligned · 100% · 5 runs" to "5 of 16 runs fit this SOP" or "31% conformance · 16 runs."

Alternative framing if a single percentage is preferred: show the fitness rate as the headline ("31% of runs follow this procedure") and keep `alignmentScore` as a secondary sub-signal in the tooltip ("Structural similarity: 100%"). The distinction between "how similar the paths are" and "how many runs actually follow this path" is real and worth making explicit.

**The `alignmentScore` is not useless — it tells you whether the documented steps match the shape of observed runs. But it is not the number that answers the question "is this SOP being followed?"**

### Priority

This fix should ship before the SOP tab is shown to any external user or referenced in any sales motion. The SOP expert review calls it launch-blocking. The PM agrees. It is a small, additive change with no risk of regression on the N≥2 gate or the single-run disclosure path.

---

## 3. What P0 Did Not Close — Re-Ranked Roadmap

P0 closed the credibility and honesty gaps. It did not ship the living SOP capability in full, do-mode, linkage, or versioning. Here is the re-ranked roadmap given P0 is done.

### P1-A: Fix the alignment pill (see section 2) — IMMEDIATE

No debate. Ship this before the next external demo.

### P1-B: Wire the full alignment/drift output into the SOP view — HIGHEST LEVERAGE

This is what `PM_SOP_STRATEGY.md §6` called "The Single Highest-Leverage Move" and classified as P1.1 in the roadmap. It is still unshipped.

The P0 alignment pill shows one number in the header. The alignment engine produces far more: `undocumentedSteps` (steps observed in runs but absent from the SOP), `unusedDocumentedSteps` (SOP steps that appear in fewer than 20% of runs), and `driftIndicators` (specific missing/extra/reordered signals with severity). None of this is surfaced in the SOP view.

Surfacing these makes the "living SOP" claim visceral rather than numeric. "Step 4 has not been observed in 12 of 16 recent runs" is a sentence that convinces an ops manager this product is categorically different from Scribe. The number in the header does not.

This belongs in the Intelligence/Analysis mode as a "Conformance" or "Drift" panel — step-level drift annotations, undocumented-step callouts, unused-step warnings. No new computation. Pure display of already-computed data.

### P1-C: Do-mode / execution improvements

The step checklist completion is local React state — it emits no analytics event. When a user checks off steps, Ledgerium learns nothing. This is a gap in the usage signal surface. Adding a `sop_step_checked` event (with stepOrdinal and workflowId) is a single-line analytics addition that unlocks measurement of SOP execution engagement.

Beyond analytics: the benchmark called for "expand by default in execution mode" for do-mode. Currently the first 5 steps expand. A true do-mode would expand one step at a time and auto-advance on check. The system chip is hidden on mobile (`hidden md:block`). On mobile — exactly when executing a procedure in the field — the system context disappears. These are P1 items, not P0.

### P1-D: Versioning/freshness in the header

`metadata.version` currently shows the engine schema version ("2.0"), not a meaningful user-facing revision number. `metadata.createdAt` is now rendered in the header (this was shipped in P0). What remains: a "v1 · Generated Jun 15" display that reads as a document version, not a schema version. Small change, meaningful for distribution credibility.

### P1-E: SOP-only share URL

The current share token deep-links to the full workflow view. Adding `?view=sop` routing so external recipients land on the SOP tab directly is a distribution lever. Without it, sharing the SOP means sharing the full workflow analytics view with someone who just wants the procedure.

### P2: Per-step screenshots — requires CEO decision

Per the benchmark and the strategy doc: true per-step screenshots require `chrome.tabs.captureVisibleTab()` — a new extension capability. This is gated by the Extension Reliability Invariant (CLAUDE.md CEO-mandated) which treats any change to the capture pipeline as a P0 release blocker risk. This is not an iteration-level decision. It is a CEO-level architectural decision.

The current P0 evidence snippet ("Observed in Salesforce · Accounts page") is the correct interim state. Screenshots should not be attempted without explicit CEO sign-off on the capture pipeline extension, the real-extension harness validation gate, and a dedicated QA iteration.

**Recommendation:** Do not put screenshots on any roadmap iteration without a CEO DD-2 decision (from `SOP_WORLDCLASS_BENCHMARK.md §Open CEO decisions`). The evidence snippet that shipped in P0 is sufficient for the near term.

### Roadmap re-ranking after P0

| Rank | Item | Mode | Rationale |
|---|---|---|---|
| 1 | Alignment pill honesty fix | Mode 2 (small fix) | Pre-condition for any external use |
| 2 | Full drift/undocumented-step display in Analysis mode | Mode 2 | The living-SOP claim activation; fully-built computation, pure display |
| 3 | `sop_step_checked` analytics event | Mode 2 | Unlocks execution measurement; ~1 line |
| 4 | Do-mode improvements (expand-by-default, mobile system chip) | Mode 2 | Operator-facing adoption |
| 5 | SOP-only share URL (`?view=sop`) | Mode 2 | Distribution enabler |
| 6 | Versioning display cleanup | Mode 2 | Compliance posture |
| 7 | Screenshots (captureVisibleTab) | CEO decision required | Do not scope until DD-2 approved |
| 8 | SOP editing | Future (P2) | Do not build before SOP is credible and trusted |

The former P1.3 PDF is now done (shipped in P0). The former P1.1 alignment engine wiring (undocumented/unused steps) is now the top P1 item.

---

## 4. Success Metrics Now Measurable

### What the analytics events shipped give us

The P0 implementation wired three analytics events:

**`sop_viewed`** — fires once per workflow per session. Fields: `workflowId`, `stepCount`, `runCount`, `hasAlignmentData`, `hasDriftData`, `averageConfidence`, `frictionCount`, `sopMode` (the starting mode). This gives session-level SOP engagement volume and tells us how many SOP views have alignment data available vs. not.

**`sop_alignment_viewed`** — fires when a real (N≥2) signal is shown. Fields: `alignmentScore`, `alignmentLevel`, `totalRunCount`, `driftScore`, `driftLevel`. This is the event that will tell us how many users are actually seeing the alignment pill with a real signal vs. the single-run disclosure.

**`sop_exported`** — fires on both Markdown export and Print/PDF. Fields: `format` ('markdown' | 'pdf'), `stepCount`, `runCount`. This is the distribution-rate metric: what fraction of SOP views convert to an export.

### What to watch in the first 30 days

**Export rate:** the fraction of `sop_viewed` events followed by `sop_exported` within the same session. The strategy doc targets ≥30% within 90 days of PDF launch. Current baseline is whatever the Markdown export click rate was before P0. PDF addition will likely lift this — measure from day one.

**Alignment signal coverage:** what fraction of `sop_viewed` events have `hasAlignmentData: true`. This tells us how many workflows have had their intelligence analysis run. Low coverage means the alignment pill is invisible to most users — even though the pill logic is correct. If coverage is <25%, the issue is not the pill but the intelligence pipeline not running on most workflows.

**`sop_alignment_viewed` rate:** what fraction of `sop_viewed` events trigger an `sop_alignment_viewed`. This is strictly ≤ `hasAlignmentData` coverage because `sop_alignment_viewed` requires N≥2 AND a real signal. Single-run disclosures still count as `hasAlignmentData` but do not trigger `sop_alignment_viewed`.

**What is still not measurable:** step-level engagement. The completion checklist is local React state with no `sop_step_checked` event. Step expansion events are not tracked. We know a user opened the SOP; we do not know whether they read steps 3 and 4 or closed it after the Quick Start. The `sop_mode_switched` event noted as "P1" in the shell code is not yet wired. These are the missing signals for understanding SOP depth-of-use.

### Baseline to establish immediately

Before the next iteration ships, capture:
- Current `sop_viewed` volume per 7-day window
- Current `hasAlignmentData: true` fraction
- Current `sop_exported` rate (format breakdown)
- Current `sop_alignment_viewed` count

These become the before/after comparison for all subsequent P1 work.

---

## 5. Single Highest-Leverage Next Move + Open CEO Decisions

### The next move

**Fix the alignment pill framing.** Ship `alignedRunCount / totalRunCount` as the conformance rate, not `alignmentScore`. This is a small additive change (thread one field through the adapter). It is not a new feature — it is correcting a semantic error in a feature that is already live. Every day this ships is a day where the product's most visible honesty claim is technically wrong.

After that: **wire the full alignment engine output (undocumented steps, unused steps, drift indicators) into the Analysis/Intelligence mode.** This is the move that converts "a number in the header" into "a living SOP that shows you exactly what has changed and where." It is fully-built computation, pure display work, and no competitor has it.

### Open CEO decisions

**DD-1 (sequencing): Is the alignment pill fix the immediate next iteration, or is something else higher priority?**

The PM recommends the fix as the immediate next Mode 2 directed pick. The alternative argument is that the pill only renders when `hasAlignmentData: true`, which may be rare in current usage, so the defect is low-exposure. If alignment data is available on <10% of SOP views today, the practical urgency is lower. But the strategic urgency is unchanged — any demo that shows the pill shows the wrong number.

**DD-2 (screenshots): Approve the gated `captureVisibleTab()` extension capability?**

This requires CEO decision before any engineering scoping. The Extension Reliability Invariant is explicit: changes to the capture pipeline require pre-change verification in a real Chrome session, and the real-extension E2E harness must pass. Screenshots are the #1 visible table-stakes gap vs. Scribe/Tango. The evidence snippet that shipped in P0 is an honest interim. Screenshots should not be attempted as a pass-through iteration.

**DD-3 (editing strategy): In-platform editing vs. export-and-edit.**

The strategy doc defers editing to P2 with the correct rationale: build trust before building an edit path. The question for the CEO is whether there is a near-term buyer need that makes editing P1 instead of P2. If a sale is blocked by "I can't edit the steps," editing should accelerate. If no active deal is blocked, P2 is the right call.

**DD-4 (compliance): Is compliance/versioning a 2026 target?**

The SOP evidence-linked architecture (immutable evidence, audit-ready date stamps) is a credible hook for compliance buyers. Version history and attestation (P2.6) require explicit investment. If compliance is a 12-month target segment, P2.6 should be elevated to P1 now to size the work correctly.

**DD-5 (living SOP as primary narrative): Confirm that the alignment/drift signal is the lead positioning, not a secondary feature.**

The full drift panel (undocumented steps, unused steps, per-step drift indicators) is a substantial UI addition in the Analysis mode. It requires a visual design decision: does it lead the Analysis mode, or does it appear as one section alongside friction and recommendations? This is a positioning choice that determines where the engineering goes. If the CEO confirms the living-SOP positioning as the product's primary claim, the drift panel should lead and the existing friction/recommendations sections should subordinate to it.

---

*All findings grounded in direct source reading of the files listed in the scope header. No capability attributed that is not observed in the code. Engine semantics verified against `packages/intelligence-engine/src/sopAlignmentEngine.ts` line citations in the SOP expert review and QA review.*
