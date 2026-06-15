# SOP P0 Review — The Alignment / Conformance Signal, Judged Honestly

**Date:** 2026-06-15
**Reviewer lens:** World-leading SOP / standard-work + process-conformance expert (Lean standard-work audit discipline, ISO 9001:2015 §7.5 documented information, process-mining conformance checking — fitness / precision / generalization, GMP/21 CFR Part 11 procedure control).
**Mode:** READ-ONLY product code; web research permitted. No code written.
**Scope read directly:**
- `apps/web-app/src/components/sop-view/adapters/sopIntelligence.ts` — `deriveAlignmentPill` (pill derivation + N≥2 gating) + `deriveStepEvidence`
- `apps/web-app/src/components/sop-view/SOPHeader.tsx` — `AlignmentBadge` rendering
- `apps/web-app/src/components/sop-view/SOPExecutionMode.tsx` — step cards, evidence snippet, observed-vs-inferred outcome
- `packages/intelligence-engine/src/sopAlignmentEngine.ts` — `analyzeSopAlignment` (the real semantics)
- `packages/intelligence-engine/src/standardizationScorer.ts` — `computeDocumentationDriftScore`, `findings`, `detectOutlierRuns`, `deriveRecommendedCanonicalPath`
- `apps/web-app/public/docs/screenshots/workflow-sop.png` — renders **"Aligned · 100% · 5 runs"**
- The bar: `worldclass/{SOP_AUTHORING_EXPERT, SOP_WORLDCLASS_BENCHMARK}.md`

A note on method: every claim about what the engine computes is grounded in a specific function and line. The central judgment is a *semantic* one — what the number on the pill actually means versus what a reader will believe it means — and that is where this review spends its weight.

---

## 0. Verdict in one paragraph

The P0 batch is **directionally correct and unusually honest in its plumbing** — the N≥2 gate, the neutral single-run disclosure, the omit-when-absent evidence snippet, and the observed-vs-inferred outcome split are all real honesty wins that most competitors never attempt. **But the headline number is wrong in a way that inverts the product's entire value proposition.** "Aligned · 100%" is being rendered on a process that, per the very review docs that scoped this work, has **16 recordings across 6 variants** while the SOP documents **one path supported by 5 runs**. The pill is reporting `alignmentScore` — a *structural self-similarity* number — and labelling it "aligned," which a reader (and certainly an auditor) will read as **conformance: "100% of runs follow this SOP."** They do not. Roughly **5 of 16 do (~31%)**. The product has shipped the one signal that is supposed to *prove* it is more honest than Scribe, and that signal currently overstates conformance by ~3×. **This is a launch-blocking honesty defect, not a polish item.** Everything else in the batch is good. Fix the number and the framing and this becomes the strongest moat in the product.

---

## 1. THE CENTRAL HONESTY JUDGMENT — "Aligned · 100% · 5 runs"

### 1.1 What the pill is actually showing

`deriveAlignmentPill` (sopIntelligence.ts:105) computes the percentage as:

```
alignmentPct = Math.round(clamp01(alignment.alignmentScore) * 100)
```

So the "100%" is `SOPAlignmentResult.alignmentScore`. Trace what that number *is* in `analyzeSopAlignment` (sopAlignmentEngine.ts:201–212):

```
alignmentScore = avgSimilarity * 0.6 + structuralSimilarity * 0.4
                 − undocPenalty − unusedPenalty − driftPenalty
```

- `avgSimilarity` = mean bigram-Jaccard similarity of the SOP's category sequence against **each run's** category sequence (lines 116–118, 202–204).
- `structuralSimilarity` = bigram-Jaccard of the SOP against the **dominant variant** (lines 124–127).

This is a **structural-similarity / precision-flavoured** measure: "how closely does the documented category sequence resemble the runs it was built from." It is emphatically **not** a conformance rate.

The engine *also* computes the number a conformance expert actually wants — and the pill ignores it:

```
alignedRunCount = runSimilarities.filter(s => s >= 0.6).length   // line 122
totalRunCount   = runs.length                                     // line 99 / 226
```

`alignedRunCount / totalRunCount` is the **fitness** number — the fraction of observed runs whose path actually fits the documented SOP (≥0.6 similarity). In process-mining terms this is precisely the "**percentage of fitting traces**": *what proportion of recorded behaviour can be replayed on the model.* ([pm4py evaluation log-model](http://pm4py.pads.rwth-aachen.de/documentation/conformance-checking/evaluation-log-model/), [Business Process Mining, van der Aalst — fitness as "proportion of behavior in the log possible according to the model"](https://arxiv.org/pdf/1607.00607)). In Lean standard-work audit terms it is the **adherence/compliance rate** — "what % of audit items conform to the standard," target ≥90% ([Lean Enterprise Institute — Why audit standard work](https://www.lean.org/the-lean-post/articles/why-audit-standard-work-and-what-is-the-best-approach/), [OrcaLean — auditing standard work compliance](https://www.orcalean.com/article/auditing-standard-work:-how-to-measure-compliance-without-micromanaging-your-team)).

**The pill picked the wrong one of two numbers the engine already hands it.** `alignmentScore` and `alignedRunCount/totalRunCount` are both right there in the same struct. The pill shows the self-flattering one.

### 1.2 Why "100% aligned" on this data is a conflation, not a fact

Restate the scenario from the benchmark docs: **16 recordings, 6 variants; the SOP documents the dominant path, supported by 5 runs.**

The "100%" is honest only about a narrow, near-tautological claim: *the documented standard path is structurally near-identical to the 5 runs it was distilled from.* Of course it is — **the SOP was derived from those runs.** Measuring the SOP's similarity to its own source runs and reporting "100% aligned" is the conformance equivalent of grading an exam against its own answer key. It conflates two completely different propositions:

- **(A) "The documented path matches itself / its source variant."** ← what `alignmentScore` measures. ≈100%. Tautological.
- **(B) "The process conforms to the SOP."** ← what a reader/auditor believes "100% aligned" means. The honest value here is **alignedRunCount / totalRunCount ≈ 5/16 ≈ 31%.**

The gap between 100% and 31% is the entire ballgame. A quality leader who reads "Aligned · 100% · 5 runs" concludes *"my team executes this procedure perfectly."* The truth is *"5 of my 16 runs follow this procedure; 11 do something else across 5 other variants."* That is not a rounding error — **it is the difference between a process that is under control and one that is fragmenting.** Surfacing 100% actively hides the drift that the product's whole pitch ("the SOP that knows when it's wrong") promises to expose.

There is a second, quieter dishonesty in "**· 5 runs**". The pill's `runCount` resolves to `Math.max(runCount, alignment.totalRunCount)` (sopIntelligence.ts:90). If the badge reads "5 runs" while the cohort truly has 16, then `totalRunCount` itself was computed over only the 5 standard-path runs — meaning the alignment analysis **never saw the 11 deviating runs at all.** A conformance signal that excludes non-conforming traces from its own denominator cannot, by construction, ever report drift. It will say "100% · aligned" forever. **This is the most dangerous failure mode of all: a self-scoring control that is structurally blind to the cases it exists to catch.** (This needs verification in the data path that feeds `runs` into `analyzeSopAlignment` — see §6, Fix 0 — but the screenshot showing "5 runs" against a known 16-run/6-variant cohort is strong evidence the denominator is wrong.)

### 1.3 The expert-credible framing (this is the recommendation that matters most)

A conformance expert would never put a bare "100% aligned" on a one-variant SOP over a multi-variant cohort. The honest, defensible framings, in order of preference:

1. **Lead with fitness (the conformance rate), not structural similarity.**
   > **Conformance 31% · 5 of 16 runs follow this SOP · 11 deviate**
   This is the process-mining fitness number and the Lean adherence rate. It is the number an auditor asks for. It is computed *today* as `alignedRunCount / totalRunCount` — provided the denominator is the full cohort (Fix 0).

2. **If you keep a structural "alignment %", label it as what it is and never call it conformance.**
   > **SOP fidelity to standard path 100%** *(how closely the document matches its source variant)* — shown as a secondary, muted stat, never the headline, never green-with-a-check.

3. **Make the deviation legible, because the deviation is the value.**
   > **5 of 16 runs follow this SOP. 11 runs across 5 other variants deviate — review for drift.** + a "Re-derive / view variants →" CTA.
   This is the moment the product becomes categorically different from Scribe/Tango: it doesn't just assert a procedure, it tells you how much of reality ignores it.

The rule to internalise: **conformance is a property of the population of runs against the document, not a property of the document against itself.** The pill currently measures the latter and labels it the former. Reverse that.

**Severity: P0 / launch-blocking.** A trustworthiness product cannot ship a conformance number that overstates conformance by ~3× on the flagship sample SOP. The screenshot is the demo. The demo is wrong.

---

## 2. Does the pill use the engine's semantics correctly?

**No — it selects the wrong primary metric and discards the richest signals the engine produces.**

### 2.1 Wrong number chosen
Covered in §1: the pill renders `alignmentScore` (structural self-similarity) where it should render `alignedRunCount / totalRunCount` (fitness / adherence). The engine offers both; the UI chose the one that flatters.

### 2.2 The drift detail the engine computed is thrown away
`analyzeSopAlignment` produces three diagnostic collections that are *exactly* the "step 4 drifted" detail the benchmark (`SOP_WORLDCLASS_BENCHMARK.md` §"biggest gaps" #3) said the moat needs:

- **`undocumentedSteps`** (lines 145–160) — step categories people actually do that the SOP omits, with `frequency`, `runCount`, `typicalPosition`. *"A step appears in 60% of runs but isn't in your SOP."*
- **`unusedDocumentedSteps`** (lines 166–176) — SOP steps almost nobody performs. *"SOP step 4 is rarely observed in real executions."* — **this is the literal "step 4 drifted" line.**
- **`driftIndicators`** (lines 179–199) — typed `missing_step` / `extra_step` with severity and a pre-written human `description`.

And `computeDocumentationDriftScore` (standardizationScorer.ts:135–197) pre-formats all of this into ready-to-render `findings[]` strings, including the killer one:

> `"Only ${alignedRunCount} of ${totalRunCount} runs align with the SOP (less than 50%)."` (line 176)

That finding string is the honest conformance sentence, **already computed, already stored** — and the pill surfaces *none of it*. `deriveAlignmentPill` only reaches into `driftIndicators` to test `severity === 'high'` for the binary aligned/drifting flip (sopIntelligence.ts:109–116); `undocumentedSteps`, `unusedDocumentedSteps`, and the entire `findings[]` array are never read into any view model. The benchmark explicitly asked for a "**Conformance & Drift** section listing `undocumentedSteps`, `unusedDocumentedSteps`, and `driftIndicators`" (SOP_AUTHORING_EXPERT.md Move 3). **That section was not built.** P0 shipped a single green pill and left the diagnostics — the actual proof of "self-maintaining" — dark.

### 2.3 The drift gate has a logic hole that guarantees false "Aligned" on this very sample
`isDrifting` (sopIntelligence.ts:113–116) fires only on:
- `documentationDrift.level === 'significant_drift' | 'outdated'`, **OR**
- a `driftIndicators` entry with `severity === 'high'`.

But on the sample data, `documentationDrift.score = (1 − alignmentScore) * 100 = (1 − 1.0) * 100 = 0` → level `'aligned'`. And `driftIndicators` only get `severity: 'high'` when an undocumented step hits ≥80% frequency (sopAlignmentEngine.ts:185) — which can't happen if the 11 deviating runs were excluded from the analysis (Fix 0). So **drift is structurally impossible to detect on the standard-path-only cohort.** The badge is hard-wired to "Aligned" by the same denominator bug that produces the 100%. The two defects compound: the wrong denominator inflates the score *and* suppresses the drift flag.

**Net:** the pill is showing the wrong number, suppressing the right number, and discarding every piece of evidence the engine built to make the claim credible.

---

## 3. The "living SOP" claim — is it actually delivered?

**Partially, and not yet defensibly.** Per `SOP_WORLDCLASS_BENCHMARK.md` §Strategy, the positioning splits cleanly:

- **"Writes itself"** — fully true today. Every field is derived from observed events. P0 doesn't touch this; it stands.
- **"Maintains itself"** — the benchmark says this "becomes true the moment the alignment/drift wiring ships." **P0 shipped the wiring but not the maintenance signal.** What was delivered is an *aligned %* badge. What "maintains itself" requires is **visible drift detection** — and as shown in §2, the drift detail is computed and discarded, and the drift gate can't fire on the sample.

What "living / self-maintaining / conformance" requires to be real and **defensible to an auditor**, and the current status of each:

| Requirement (conformance / standard-work practice) | Status in P0 |
|---|---|
| A **conformance/fitness rate** over the full run population (`aligned / total`) — the adherence number | ✗ Not surfaced (shows structural similarity instead) |
| **The denominator = all runs**, including non-conforming ones | ✗ Appears to exclude deviating runs (5 vs 16) |
| **Named deviations**: which steps are undocumented / unused / reordered ("step 4 drifted") | ✗ Computed (`undocumentedSteps`/`unusedDocumentedSteps`/`driftIndicators`) but rendered nowhere |
| **A freshness timestamp** — "conformance checked on {date}" (a control must be dated, ISO 9001 §7.5.3) | ✗ `computedAt` exists on every result; not rendered on the pill |
| **A drift state that can actually trigger** (level ladder reaching `significant_drift`/`outdated`) | ✗ Structurally suppressed by the denominator bug |
| **A re-derivation CTA** when drift ≥ significant ("the SOP is stale → regenerate") | ✗ Absent |
| **N≥2 gating** so the signal isn't fabricated on thin data | ✓ Done well (sopIntelligence.ts:92) |
| **Evidence linkage** for the claim | ~ `evidenceRunIds` exists in the engine; not threaded to the pill |

A document that displays "Aligned · 100%" and nothing else is **not** a living SOP — it is a static SOP wearing a green sticker. An auditor's first question is *"100% of what, measured against which population, checked when, and where are the exceptions?"* P0 answers none of those. **To make the claim real:** lead with the fitness rate over the full cohort, render the named deviations from the already-computed collections, stamp it with `computedAt`, and add the re-derive CTA when drift crosses `significant_drift`. All of that is render/wire of existing engine output — exactly the benchmark's thesis.

---

## 4. Single-run + observed-vs-inferred honesty

**These are handled well — genuinely the strongest part of the batch.**

### 4.1 Single-run / N<2 gating — correct and well-reasoned
`deriveAlignmentPill` gates on `effectiveRunCount < 2` and returns a neutral `'insufficient'` disclosure ("Based on 1 recording" / "Review before distributing"), explicitly *not* surfacing the engine's N=0/1 `score 0 / level critical` as a condemnation (sopIntelligence.ts:87–103). The `AlignmentBadge` renders this in amber-neutral with an info affordance, not red (SOPHeader.tsx:127–143). This correctly discharges the benchmark's honesty fix ("the engine returns critical for N=0 — must NOT render as a quality condemnation"). **This is exactly right** and shows the team understands the data-insufficiency-vs-quality distinction. The one nuance: at N=1 the copy says "review before distributing" — good — but the *whole-document* "best path" / dominant-variant language elsewhere in the view still needs the same N=1 suppression (SOP_AUTHORING_EXPERT.md §4.1). That's outside the pill but part of the same honesty surface.

### 4.2 Observed-vs-inferred expected outcome — correctly split
SOPExecutionMode.tsx:407–426 branches on `step.outcomeObserved`: a solid emerald `CheckCircle2` + "Observed outcome" only when truly observed; otherwise a muted `Info` icon + an explicit **"Inferred"** tag + "Expected outcome." This directly discharges SOP_AUTHORING_EXPERT.md §4.3 (don't show inferred results with a verified check). **Well done** — the visual grammar (solid check = observed, outline/info = inferred) is exactly the recommended pattern.

### 4.3 Evidence snippet — honest by construction
`deriveStepEvidence` (sopIntelligence.ts:172–188) includes a part **only when its source value is a non-empty trimmed string**, dedupes pageTitle against the app label, and sets `hasEvidence: false` when nothing real exists; the card omits the whole snippet when `!hasEvidence` (SOPExecutionMode.tsx:321). Nothing is fabricated. The "Observed in {app · page · action}" framing is correctly evidential. **Good.** Minor note: "Observed in Salesforce · Opportunities" is honest for the *step's source event*, but be careful the snippet isn't read as "observed in N runs" — it's single-event provenance, not frequency. A future per-step "observed in X of Y runs" (from `undocumentedSteps.runCount`-style data) would be the stronger, frequency-honest version.

**Bottom line for §4:** the honesty machinery the team *did* wire is correct and careful. The failure is not sloppiness — it is that the **headline conformance number** (§1) escaped the same rigor that was applied everywhere else. The team was honest about the small things and wrong about the biggest one.

---

## 5. The honesty integrity scorecard

| Element | Honest? | Note |
|---|---|---|
| N<2 single-run gating + neutral disclosure | ✅ | Model behaviour |
| Observed-vs-inferred outcome split | ✅ | Model behaviour |
| Evidence snippet omit-when-absent | ✅ | Model behaviour |
| **Headline "alignment %" = structural similarity, labelled "Aligned"** | ❌ | **Conflates fidelity-to-self with conformance-to-reality** |
| **"5 runs" denominator excludes deviating runs** | ❌ | Conformance signal blind to non-conformance |
| Drift detail (undocumented/unused/indicators/findings) | ❌ (missing) | Computed, discarded — the moat left dark |
| Drift gate can fire on multi-variant reality | ❌ | Structurally suppressed by the denominator |
| Freshness `computedAt` on the control | ❌ (missing) | A control must be dated |

Three greens on the small stuff; five reds on the load-bearing claim.

---

## 6. The highest-impact fixes, ranked

> **Fix 0 — Make the alignment analysis see ALL runs (the denominator).** *P0, blocking.*
> Verify and correct the data path that supplies `runs` to `analyzeSopAlignment`. If the screenshot's "5 runs" reflects only the standard-path cohort while 16 exist across 6 variants, the conformance signal is structurally incapable of detecting drift — it can only ever say 100% aligned. `totalRunCount` must equal the full recorded cohort (16), and `alignedRunCount` is then the runs that fit (~5). Without this, every other fix below renders a still-wrong number. **This is the root cause; fix it first.**

> **Fix 1 — Lead with fitness, not structural similarity, and re-label.** *P0, blocking.*
> Render `alignedRunCount / totalRunCount` as the headline: **"Conformance 31% · 5 of 16 runs follow this SOP."** This is the process-mining fitness rate ([van der Aalst, Business Process Mining](https://arxiv.org/pdf/1607.00607); [pm4py log-model evaluation](http://pm4py.pads.rwth-aachen.de/documentation/conformance-checking/evaluation-log-model/)) and the Lean adherence rate ([LEI standard-work audit](https://www.lean.org/the-lean-post/articles/why-audit-standard-work-and-what-is-the-best-approach/)). If `alignmentScore` is kept at all, demote it to a muted secondary "fidelity to standard path" stat and strip the green/check styling. Never call structural similarity "conformance."

> **Fix 2 — Surface the deviation, not just the agreement.** *P0.*
> When `totalRunCount > alignedRunCount`, render "**11 runs across 5 variants deviate — review for drift**" with a "View variants / Re-derive →" CTA. The deviation is the product's reason to exist; hiding it behind a green pill destroys the differentiation. Pull the `<50% align` finding string the engine already wrote (standardizationScorer.ts:176).

> **Fix 3 — Build the "Conformance & Drift" detail section.** *P0–P1.*
> Render the dark engine collections the benchmark asked for: `undocumentedSteps` ("step type X appears in 60% of runs, not documented"), `unusedDocumentedSteps` ("**SOP step 4 rarely observed**"), `driftIndicators`, and the pre-formatted `findings[]`. This is pure wiring of computed-and-stored data and is what makes "self-maintaining" *demonstrable* rather than asserted.

> **Fix 4 — Date the control.** *P1, trivial.*
> Render `computedAt` on the pill/section ("checked {date}"). A conformance control that isn't dated isn't auditable (ISO 9001:2015 §7.5.3 — documented information must be current and identifiable). The field exists on every engine result.

> **Fix 5 — Add a re-derivation trigger at drift ≥ significant.** *P1.*
> When `documentationDrift.level` reaches `significant_drift`/`outdated` (which becomes reachable once Fix 0 lands), prompt "This SOP has drifted from how work is now done — re-derive from recent runs." This closes the loop from *detecting* drift to *maintaining* the document — the actual meaning of "living SOP."

> **Fix 6 — Frequency-honest per-step evidence.** *P2.*
> Upgrade "Observed in {app·page}" toward "Observed in X of Y runs" using run-frequency data, so per-step provenance reflects population frequency, not a single source event. Strengthens the evidence claim from anecdote to standard.

> **Fix 7 — Guard the pill copy against single-variant tautology.** *P2.*
> Even with correct numbers, when the SOP documents 1 of 6 variants, add a one-line qualifier: "documents the dominant path; other variants exist." Prevents a *correct* 31% from being misread as "the process is broken" when it may simply be legitimately multi-path. Conformance % must be read alongside variant count, never alone.

**Ranking rationale:** Fixes 0–2 are the launch blockers — they correct a number that is currently ~3× overstated on the flagship demo and invert the product's honesty claim. Fix 3 is what converts "aligned %" into the defensible *living-SOP* moat. Fixes 4–5 make it auditable and closed-loop. Fixes 6–7 are hardening.

---

## 7. Closing judgment

The P0 batch did the hard, unglamorous honesty work correctly: it gated thin data, refused to fabricate evidence, and distinguished observed from inferred. That earns real credit — most of the category does none of it.

But it then shipped, as its headline, a **structural self-similarity score dressed as a conformance rate**, on a sample where the true conformance is roughly **31%, not 100%** — and it discarded every diagnostic the engine computed to tell the honest story. The result is a "living SOP" that displays a static green sticker and is structurally incapable of reporting the drift it exists to expose.

This is fixable entirely with the engine's *existing* output — `alignedRunCount / totalRunCount`, `undocumentedSteps`, `unusedDocumentedSteps`, `findings[]`, `computedAt` — exactly as the benchmark predicted ("the path to A− needs NO new infrastructure"). **Fix the denominator, lead with fitness, surface the deviation, and date the control.** Do that and Ledgerium ships the one conformance signal no hand-authored SOP tool can match — and, critically, ships it *true*.

Until then: **do not put "Aligned · 100%" in front of a buyer.** It is the most visible claim in the product and it is currently the least honest.

---

## References (standards & practice cited)

- **Fitness as the fraction of fitting traces / proportion of log behaviour replayable on the model** — [van der Aalst, *Business Process Mining* (arXiv:1607.00607)](https://arxiv.org/pdf/1607.00607); [pm4py — Evaluation Log-Model (fitness, percentage of fitting traces)](http://pm4py.pads.rwth-aachen.de/documentation/conformance-checking/evaluation-log-model/).
- **Conformance checking measures (fitness / precision / generalization)** — [Entropia: Entropy-Based Conformance Checking Measures (arXiv:2008.09558)](https://arxiv.org/pdf/2008.09558).
- **Standard-work auditing & adherence/compliance rate (target ≥90% of audit items conforming)** — [Lean Enterprise Institute — Why audit standard work](https://www.lean.org/the-lean-post/articles/why-audit-standard-work-and-what-is-the-best-approach/); [OrcaLean — Auditing standard work: measuring compliance](https://www.orcalean.com/article/auditing-standard-work:-how-to-measure-compliance-without-micromanaging-your-team).
- **ISO 9001:2015 §7.5.3** — documented information must be identifiable, current, dated/controlled, and available at the point of use (drives the freshness timestamp + re-derivation requirements).

*All Ledgerium-specific claims are grounded in direct source reading of the cited components and engines. The "16 runs / 6 variants / 5-run standard path" scenario is taken from the benchmark docs that scoped this P0 and the shipped screenshot; the ~31% figure is `alignedRunCount/totalRunCount` under that scenario and should be confirmed against live cohort data per Fix 0.*
