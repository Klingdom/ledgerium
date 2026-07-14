# SOP Enrichment Review 001 — PM Analysis

**Mode 3-adjacent design review. Zero code changes. Pure artifact.**
**CEO directive:** dramatically better, human-followable SOP detail, staying PII-free — "give me multiple elegant solutions."
**Owns:** problem framing, success metric model, ranked solution options for CEO decision.
**Parallel panelists:** `system-architect` (mechanism/schema design), `extension-privacy-auditor` (guard verification), `ux-designer` (phrasing/rendering design). This document does not re-derive their mechanism designs — it frames the decision they should hang mechanisms on.
**Builds on:** `docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md` (root-cause map RC-1…RC-6, ranked candidates IC-1…IC-5 / P0-a…P3-i). P0-a (pageTitle PII redaction, code-complete pending real-ext validation), P0-b (SVR metric, shipped), and P0-c (render-layer wins, shipped) are **already delivered**. This review picks up exactly where that one paused: at the capture-pipeline boundary, with the CEO asking for the elegant-options menu before any P0-gated work starts.

---

## 1. Problem Statement

### The job to be done

**"A new hire can follow this SOP without asking anyone."**

That is the whole test. Not "the text is grammatically correct." Not "every field is populated." A stranger — no product knowledge, no tribal context, no Slack thread to fall back on — opens the document and executes the process correctly, start to finish, using only what is on the page.

### What is happening today

Ledgerium's pitch is that SOPs are *evidence*, not narrative — every step traces to an observed DOM interaction. That promise breaks the moment the renderer can't resolve a label and falls back to a generic sentence:

> "Click the target element." "Enter the required value." "Submit the form."

These sentences are syntactically fine and semantically empty. They name no object, no location, no expected result. A reader hitting one of these mid-SOP has exactly two options: guess, or ask a colleague. Either one is a failure of the job-to-be-done, and asking a colleague is the specific failure the CEO named.

### Why this is a data problem, not a copy problem

The prior review (SOP_DETAIL_SPECIFICITY_REVIEW_001) confirmed, file-and-line, that this is **a progressive data-drop cascade**, not a phrasing defect:

1. The extension already extracts rich structural context at capture time (`interactionType`, `ancestorPath`, `keyboard_intent`, drag semantics, and a fully-built 5-field neighbor-context extractor — modal title, table column, breadcrumb, active tab, nearby labels).
2. Most of it never survives normalization, segmentation, or sopBuilder's fallback ladder.
3. By the time text renders, the richest available signal for a step is frequently a single ≤80-char label — and when that's empty, the reader gets a fallback sentence the quality gate had no way to catch (P0-b/P0-c fixed the render-layer half of that; the fallback strings themselves are now measured and some are eliminated at the render layer, but the underlying label-starvation problem is untouched).

So the fix is overwhelmingly **reconnection of data we already have**, not new collection. That distinction matters directly for risk and speed, and it is the organizing axis of the options below.

### Why "less vague" alone under-specifies the job

Vagueness (the SVR metric) measures the instruction *text*. It does not measure whether a human unfamiliar with the app can actually execute the step. Two gaps the metric alone will miss:

- **Local ambiguity without ambient context.** "Click 'Continue'" is specific by SVR's definition (real label, non-fallback string) but useless if the reader can't tell *which* Continue button — the one in a payment modal vs. a shipping-address modal on the same page. This is exactly RC-2/neighbor-context territory.
- **Irreducible vagueness.** Canvas-rendered UI, icon-only buttons with no `aria-label`, drag targets on unlabelled surfaces — no amount of schema plumbing recovers a label that was never in the DOM as text. These steps will remain vague under any of the options below, and pretending otherwise would violate Ledgerium's honesty invariant.

Both gaps are addressed explicitly in the options and the acceptance test below, not swept into the SVR number.

---

## 2. Success Metric Model

### 2.1 The metric: Step Vagueness Rate (SVR)

SVR is already shipped, deterministic, and measure-only (`packages/process-engine/src/specificity.ts`, P0-b). Definition, unchanged:

```
SVR = vagueInstructionCount / totalInstructionCount
```

An instruction is vague if it's an exact or prefix match against the sopBuilder fallback-string catalogue, guarded by the audit-honesty IFF invariant `vague === true IFF specificity < 0.50` at the step level. This is the right foundation — it's a real number, computed from the real render path, with zero drift risk (no LLM, no manual scoring).

### 2.2 The baseline is not yet honest — fix this first

The P0-b execution log says this plainly, and it is the single most important thing in this document: **measured baseline SVR = 0.00% over the 10 curated fixtures, because those fixtures were hand-authored fully-labelled.** That number is not a claim about production. It cannot be used to set a real target, and it must not be quoted to the CEO as "we're already at 0% vagueness" — that would be a metric-integrity failure of exactly the kind Ledgerium's principles forbid ("no measurable outcome = incomplete").

The synthetic `svrVaguePath.test.ts` fixtures (B1–B4, shipped with P0-c) are a **regression lock**, proving specific mechanisms move SVR from a known non-zero value to zero on constructed inputs. They are not a production baseline either.

**Required first action, before any numeric SVR target is treated as binding:** instrument SVR as a lightweight, PII-free observability signal on real production SOP generations. This is itself a no-capture-risk, no-new-data item — `computeSopVagueness()` already runs deterministically inside `processSessionFull`; the only work is emitting the resulting float (plus vague/total counts) alongside existing analytics, the same pattern already used for `dashboard_v2_viewed` and friends. Nothing about a step count or a ratio is PII. This closes the honesty gap in days, not iterations, and should be treated as a zero-debate prerequisite rather than one of the ranked options below.

### 2.3 Targets (once a real baseline exists)

- **Primary:** reduce production SVR by **≥50%** from the first-observed real baseline by the end of the "reconnect" phase (Options 1, 3, 4, 5 below).
- **Stretch, post neighbor-context:** cumulative **≥70%** reduction once Option 2 ships, consistent with the prior review's estimate that neighbor context alone resolves the majority of vague steps.
- **Steady-state floor:** production SVR **≤ 15%** (tightened from the prior review's 20% secondary target, because neighbor context — the largest lever — is now explicitly scoped as Option 2 rather than aspirational).
- These are **relative-reduction targets pinned to an as-yet-unmeasured baseline**, not fixed percentages promised in advance. If the real baseline turns out to already be low (most captured sessions are well-labelled apps), the absolute target should be revisited rather than gamed.

### 2.4 The metric SVR can't cover: Human-Followability Acceptance Test

SVR is necessary but not sufficient (see §1's ambiguity/irreducibility gaps). Complement it with a qualitative gate that directly tests the job-to-be-done:

**Cold-read test.** A reader with no prior exposure to the underlying application executes N sampled SOPs (recommend N=10, drawn across distinct workflow categories — finance/approval, data-entry/table, navigation-heavy) using *only* the rendered document, no other reference, no asking.

Recorded per SOP:
- **Completion without external help** (Y/N) — the single pass/fail signal that maps directly to the CEO's job statement.
- **Ambiguous-step count** — number of steps the reader had to guess on or re-read multiple times before proceeding.
- **Time-to-complete vs. an SME baseline** — a ballooning ratio signals friction even on "technically specific" steps.

**Acceptance target:** ≤1 unresolved ambiguous step per SOP (or per 20 steps for longer workflows) for Tier-1/2 workflow categories, run once at Phase 1 close and once at Phase 2 close, so the qualitative signal tracks the same phase boundaries as SVR. This is a review gate, not an automated CI gate — consistent with the prior review's own ruling that context-uniqueness "is not computationally verifiable pre-ship."

---

## 3. Solution Options — Ranked for CEO Decision

Every option below is scoped against three explicit categories, because they carry structurally different risk profiles:

- **RECONNECT** — data is already captured (and often already extracted) today; the fix is schema/plumbing, not new collection. Fast, low-to-moderate risk.
- **NEW-CAPTURE** — genuinely new signal not currently on the wire. **P0-gated** under the Extension Reliability Invariant: CEO approval + real-extension harness required, no exceptions.
- **RENDER-ONLY** — uses data already reaching `sopBuilder.ts`/`contentEnricher.ts` today. Zero capture-pipeline risk, ships fastest.

| # | Option | Category | Expected SVR impact | Effort | Risk |
|---|--------|----------|---------------------|--------|------|
| 1 | Reconnect structural interaction signals | RECONNECT | 10–20% | S–M | LOW |
| 2 | Reconnect neighbor context (modal/table/tab) | RECONNECT (guarded) | 40–55% | M–L | MED–HIGH |
| 3 | Recalibrate over-redaction thresholds | RECONNECT (guarded) | 5–15% | S | MEDIUM |
| 4 | Smarter templating + sibling-step disambiguation | RENDER-ONLY | 5–10% direct + amplifies 1/2 | S–M | LOW |
| 5 | Confidence disclosure for residual vagueness | RENDER-ONLY | 0% (SVR-neutral by design) but closes the *followability* gap directly | S | LOW |

---

### Option 1 — Reconnect Structural Interaction Signals *(RECONNECT — fast, low-risk)*

**What it delivers.** Surfaces fields that are already on `RawEvent` and already survive the sensitive-target gate, but are dropped at normalization: `interactionType` nuance, `ancestorPath`, `keyboard_intent`, drag-start/drag-end semantics, and the `value_present` boolean (distinguishing "filled an empty field" from "updated a pre-filled field"). Consumers: sopBuilder's fallback ladder gets a richer signal to consult before giving up to a generic string, and drag/keyboard instructions stop reading as "Drag element to target" / "Use keyboard shortcut" for every occurrence.

**Why it's elegant.** Nothing new is captured. Nothing new is transmitted off-device. These are booleans and short enums riding on events that are already sensitive-gated identically to today. This is the cleanest "reconnect, don't recollect" play in the whole set.

**SVR impact.** Moderate and broad — covers drag/keyboard event types specifically (currently 100% vague for those types) and improves data-entry phrasing precision. Estimated 10–20%.

**Effort / Risk.** S–M effort (3-layer schema pass: normalization-engine → process-engine → sopBuilder, same shape as the prior review's IC-1/IC-4 estimates). **Risk: LOW**, but still touches `normalizer.ts` (normalization-engine) — a tracked capture-pipeline-adjacent surface — so it is still governed by the Extension Reliability Invariant's pre-change verification and real-extension harness requirement, just with a much smaller blast radius than Option 2.

**Dependency ordering.** No dependency on anything else. Can start first.

---

### Option 2 — Reconnect Neighbor Context *(RECONNECT, guarded — highest leverage)*

**What it delivers.** The single biggest lever identified across both reviews: `extractLabelWithContext` already runs at capture time and already produces a 5-field `NeighborContextEvidence` object (modal title, table column header, breadcrumb, active tab, nearby labels) — it is simply discarded before serialization. Wiring it through the canonical event schema into `sopBuilder.ts` turns "Click the target element" inside a dialog into "Click 'Approve' (Approve Invoice)" and a labelless table cell into "Enter the Amount field."

**Why it's the highest-leverage single item.** Modal dialogs and data tables are the dominant shape of enterprise SaaS workflows — this is where the bulk of production vagueness almost certainly concentrates. It is the only option here that plausibly gets SVR into the 40%+ reduction range on its own.

**Why it's still P0-gated despite being "reconnect."** Two of the five fields need active guarding, not just plumbing: `modalTitle` must come from `aria-label`/`aria-labelledby` only (never `heading.textContent`, which risks entity names), and breadcrumb must use the existing structural `routeTemplate`, never raw `breadcrumbTrail` textContent. Getting the guard wrong here is a PII regression, not a cosmetic bug — hence `extension-privacy-auditor` sign-off is mandatory before this ships, alongside the real-extension harness (this touches `apps/extension-app/**` and normalization/segmentation-engine schema, all Extension Reliability Invariant surfaces).

**SVR impact.** 40–55%, per the prior review's estimate — unchanged, this analysis has no reason to revise it upward or downward.

**Effort / Risk.** M–L effort — genuinely a multi-file, multi-package schema change (extension → shared-types → normalization-engine → process-engine → sopBuilder). **Recommend explicit intake split** into independent sub-deliverables (e.g., modalTitle+tableHeader first, activeTab+nearbyLabels second) rather than one large iteration — this mirrors the audit-intake umbrella-split discipline already codified in CLAUDE.md (MR-016), and gives each sub-deliverable its own real-extension validation pass rather than one big bang-or-bust gate. **Risk: MEDIUM–HIGH** primarily on the guard-correctness axis, not the plumbing axis.

**Dependency ordering.** Independent of Option 1 in principle, but sequencing Option 1 first is recommended — it's a lower-risk warm-up on the same governed surfaces and establishes the real-extension harness rhythm before the higher-stakes Option 2 sub-deliverables begin.

---

### Option 3 — Recalibrate Over-Redaction Thresholds *(RECONNECT, guarded)*

**What it delivers.** Two constants (`LONG_DIGITS_RE`, currently 5+ digits; `MAX_LABEL_WORDS`, currently 12) are suppressing legitimate business labels — invoice/order/reference numbers and long descriptive button text — as a side effect of PII heuristics tuned too aggressively. Recalibrating recovers labels that were already extracted and already safe, just discarded by an overly blunt filter.

**Why it needs a real gate, not just a config change.** This is the one "reconnect" item where the guard correctness is genuinely uncertain rather than just needing careful implementation — raising a digit threshold interacts with real-world ID formats (6–7 digit employee/account numbers in some enterprise systems) in ways that need boundary-tested fixtures, not just code review. `extension-privacy-auditor` should treat this as a formal go/no-go checkpoint with explicit edge-case fixtures (7-digit reference vs. 8-digit account vs. 16-digit CC fragment), not an advisory comment.

**SVR impact.** 5–15% — smaller than Options 1–2 because most vague steps trace to missing context, not over-redaction, but real and independently shippable.

**Effort / Risk.** S effort (2-constant change across 2 files, which must be updated atomically since the regex is duplicated — a pre-existing drift risk worth fixing regardless). **Risk: MEDIUM**, concentrated entirely in the privacy boundary, not the engineering.

**Dependency ordering.** Independent; can run in parallel with Option 1.

---

### Option 4 — Smarter Templating + Sibling-Step Disambiguation *(RENDER-ONLY — zero capture risk)*

**What it delivers.** Two render-layer plays that use only data already reaching `sopBuilder.ts`/`contentEnricher.ts` today (post P0-c), with zero new schema and zero capture-pipeline touch:

- **Richer role-based templates.** P0-c already shipped the labelless-click ladder win ("Click in {app}" replacing "Click the target element in {app}"). Extend the same technique to the remaining fallback branches (select, upload, download, submit) using `interactionType`/role combinations that already reach the builder, closing more of the fallback-string catalogue without waiting on Option 1/2 data.
- **Sibling-step disambiguation.** A step doesn't have to resolve context from its own event alone — the SOP already has step-level `page_context`, `activityName`, and ordinal position for adjacent steps. A single-word ambiguous label ("Save") can be rendered with its *step's own* page/app context even without per-event neighbor context: "Click 'Save' (Editor toolbar)" derived from the step's existing page_context, not a new capture signal. This is a genuinely elegant option because it recovers some of Option 2's *reader-facing benefit* (local disambiguation) using data that has been available since before this review started.

**Why rank it here.** It's the fastest thing on this list to ship (no schema, no harness gate, same governance class as the already-shipped P0-c), and it compounds — once Options 1 and 2 land, the same templating layer renders their new fields better too. It should not be thought of as "instead of" Options 1/2; it's the rendering layer that makes their payoff visible to the reader.

**SVR impact.** 5–10% directly (closes remaining fallback-string branches), plus a compounding multiplier on whatever Options 1/2 deliver.

**Effort / Risk.** S–M effort, **LOW risk** — same profile as P0-c, which already shipped cleanly.

**Dependency ordering.** None. Can ship immediately, in parallel with everything else, and should — it's the cheapest available win on the table.

---

### Option 5 — Confidence Disclosure for Residual Vagueness *(RENDER-ONLY — zero capture risk, product/UX)*

**What it delivers.** After Options 1–4, a residual tail of steps will remain irreducibly vague — canvas UI, icon-only controls with no accessible name, drag targets with no labelled surface. No schema change recovers a label that was never in the DOM as text. Rather than let those steps silently render as a generic sentence with the same visual confidence as every well-labelled step, surface the uncertainty explicitly: an inline flag ("⚠ Low-confidence step — confirm before relying on this") wired directly to the already-computed `SOPStep.confidence` / SVR `vague` flag.

**Why this is the most direct answer to the CEO's stated job.** "A new hire can follow this SOP without asking anyone" doesn't strictly require *zero* ambiguous steps — it requires the new hire to **know which 1–2 steps out of 20 need a check-in**, instead of being uniformly, silently under-informed on all of them. Converting silent degradation into a legible signal is a different — and cheaper — way to serve the same job, and it's the only option here that treats "we couldn't resolve this" as information worth showing the reader rather than something to paper over with a plausible-sounding sentence.

**SVR impact.** Zero, by design — this option does not change the instruction text or the SVR number. It should never be reported as an SVR win; it is reported against the human-followability acceptance test (§2.4), where it should materially reduce "ambiguous-step" and "asked for help" counts even on steps SVR still calls vague.

**Effort / Risk.** S effort (the underlying signal already exists in `specificity.ts` and `SOPStep.confidence`; this is a rendering/formatting change in the display layer). **Risk: LOW** — no capture-pipeline surface at all.

**Dependency ordering.** None — independent of every other option, and cheap enough that there's no reason not to ship it early.

---

### Noted but not ranked: Targeted Screenshot Fallback (P3-h, carried from prior review)

Full-session screenshot capture remains out of scope as previously scoped (effort/risk 5/5, needs a dedicated storage + privacy design lane). A narrower version — capture a screenshot **only** for steps that fail the SVR gate after Options 1–5 have shipped, rather than blanket capture — is worth naming as a future escape hatch for the irreducible tail (canvas/SVG-only targets that Option 5 can flag but never fully resolve to text). Not scoped as an Option here because it requires new storage infrastructure and a fresh privacy design pass before effort/risk can be estimated honestly; flagged for a future dedicated review if the residual SVR after Phase 2 is still material.

---

## 4. Recommended Phased Sequence

**Phase 0 — Done.** P0-b (SVR metric, shipped) + P0-c (render-layer wins, shipped) + P0-a (pageTitle PII redaction, code-complete, gated on real-extension validation per the Extension Reliability Invariant — this gate must clear before Phase 1 opens, since it touches the same capture surfaces).

**Phase 1 — Reconnect + Render (parallelizable, mostly low-risk).**
1. **Instrument production SVR baseline** (§2.2) — zero-debate prerequisite, no code beyond an analytics emission; should start immediately, in parallel with everything else.
2. **Option 4** (smarter templating + sibling-step disambiguation) — cheapest, fastest, zero capture risk. Ship first or concurrently with the baseline instrumentation.
3. **Option 5** (confidence disclosure) — equally cheap, independent, ship alongside Option 4.
4. **Option 1** (structural signals) — small P0-gated surface, real-extension harness required, but low risk. Warm-up for the harness rhythm before Option 2.
5. **Option 3** (redaction threshold recalibration) — requires `extension-privacy-auditor` go/no-go on boundary fixtures before it ships; can run in parallel with Option 1 since they touch different files.

**Phase 2 — Neighbor Context (P0-gated, split into sub-deliverables).**
Option 2, split at intake into at least two independently-shippable sub-deliverables (e.g., modalTitle+tableHeader first, activeTab+nearbyLabels second), each gated on its own real-extension harness pass and privacy sign-off. If the resulting sequence reaches N≥6 iterations when combined with Phase 1 items, the MR-005 D-7 meta-coordinator pre-check applies before the sequence opens, per standing governance.

**Phase 2 close — Re-run the human-followability cold-read test** (§2.4) against the Phase-1 baseline to confirm the qualitative gate moved, not just SVR.

**Phase 3 — Optional, not scheduled.** Targeted screenshot fallback for the residual irreducible tail, contingent on Phase 2's measured residual SVR and a dedicated storage/privacy design pass.

---

## 5. Open CEO Decisions

1. **Baseline instrumentation.** Approve shipping the production SVR observability event (§2.2) before any numeric target is treated as a commitment. Recommendation: yes, immediately — it is the correction to a real gap the prior review's own execution log admitted.
2. **Phase 1 bundle.** Approve Options 1, 3, 4, 5 as the next iteration(s), understanding two of the four (1 and 3) are still P0-gated (small surface) and two (4 and 5) carry zero capture risk and can ship fastest.
3. **Option 2 sequencing and split.** Approve Option 2 (neighbor context) to proceed as a P0-gated, multi-sub-deliverable sequence with `extension-privacy-auditor` sign-off and real-extension harness gating **each** sub-deliverable independently, rather than as one large change. Confirm the sub-deliverable split boundary (recommend: modalTitle+tableHeader vs. activeTab+nearbyLabels).
4. **Human-followability test program.** Sponsor the cold-read acceptance test (§2.4) — who runs it (internal reviewer vs. contracted/naive tester), sample size (recommend N=10), and cadence (Phase 1 close + Phase 2 close, as proposed).
5. **RC-3 privacy boundary.** Confirm `extension-privacy-auditor` sign-off on Option 3's threshold change is a **hard go/no-go gate**, not an advisory review — given the direct PII-boundary risk of raising digit/word thresholds.
6. **Screenshot escape hatch (Phase 3).** Explicitly decide now whether to reserve this as a future lane (recommendation) or decline it outright, so it isn't silently re-litigated every time residual vagueness comes up.

---

**Summary for downstream agents:** the problem is data starvation, not phrasing; the metric (SVR) is sound but its baseline is not yet honest; the fix set splits cleanly into reconnect-fast (Options 1/3), reconnect-guarded-highest-leverage (Option 2), and render-only-zero-risk (Options 4/5); and the job-to-be-done ("follow without asking") needs both the quantitative SVR gate and a qualitative cold-read gate, because SVR cannot see local ambiguity or irreducible vagueness on its own.
