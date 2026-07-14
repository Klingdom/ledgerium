# SOP Enrichment — Architect Analysis (Elegant Solution Options)

**Mode:** 3-adjacent design review (NON-counting). **Deliverable:** analysis only — ZERO product code changed.
**Author:** system-architect. **Date:** 2026-07-12.
**CEO directive:** capture *more* detailed, human-followable SOP information *without* capturing PII.
**Constraint carried from SOP_DETAIL_SPECIFICITY_REVIEW_001:** go **beyond** "reconnect the data we already drop." Design *new elegant* mechanisms.

---

## 0. Framing — three things a reader needs, that we do not deliver

A followable step answers **WHAT** (which control), **WHERE** (in which region/context), and **WHY/RESULT** (what changed). Today the pipeline can only ever answer WHAT, and only when a clean label survives. The prior review's fix (A/C/B/D) is correct but is *reconnection* — it moves already-captured fields downstream. This review adds **new signal classes** the system does not compute at all:

| Reader need | New signal class this review introduces | Captured today? |
|---|---|---|
| WHERE | landmark/section scope · positional ordinal · affordance shape | **No** |
| RESULT | action→outcome *class* binding · deterministic state-diff | Partially (orphaned) |
| WHAT (robustness) | accessible-name (accname) resolution · typed value-shape | No / partial |

**Non-negotiable invariants for every option below:** DETERMINISM (no clock/random/LLM/network in capture→normalize→segment→sopBuilder), IMMUTABILITY (additive, traceable-to-source, never mutate `RawEvent`), and **value-SHAPE-never-value** PII safety. Capture-pipeline surfaces (`apps/extension-app/src/content/*`, `background/*`, `manifest.json`, `packages/{normalization,segmentation,policy}-engine`) are **P0-gated** — real-extension harness is the gate of record; `process-engine`, `schema-events`, `intent-inference` are **not** P0-gated.

---

## Option 1 — **Outcome Binding** (action → result-class), zero-capture, NON-P0 ⭐ RANK 1

**The insight.** The outcome signal already exists in the canonical stream and we throw away its *meaning* by rendering it as an orphan line. `StateObserver` (state-observer.ts) already emits `modal_opened / toast_shown / error_displayed / loading_started / loading_finished / dropdown_opened / status_changed`. Segmentation already groups these into the *same* `DerivedStep.source_event_ids` as the action that caused them. But `sopBuilder.deriveInstruction` (`sopBuilder.ts:353-372`) renders each state event as its own generic instruction ("Dialog opens…", "Verify confirmation message appears") **beside** the click, instead of **binding** it to the click as a consequence.

**Mechanism.** A pure post-segmentation pass in `process-engine` that, within each step, folds a trailing state-change canonical event into the *preceding* action, and sets `SOPStep.resultSummary`/`expectedOutcome` from the state **class** (the canonical `event_type`, e.g. `system.toast_shown` → "a confirmation appears"; `system.modal_opened` → "the dialog opens"; `system.error_displayed` → "an error is shown — correct and retry"; `system.loading_started`→`…finished` collapse → "the system finishes processing"; `navigation.route_change` → "the page navigates").

**New PII-safe signal.** The **outcome class**, derived *only* from `event_type` (which is derived from ARIA role / `aria-live` / `aria-busy` at capture — never from element text). Steps read as **"Click Save → a confirmation appears"** instead of "Click Save" + "Verify confirmation message appears".

**Pipeline plug-in.** `sopBuilder.buildSOP` step loop (`sopBuilder.ts:92-148`) + a new pure `bindOutcome(step, events)` helper; consumes the *class only*. No capture change, no schema change, no `state_change_details`.

**Determinism / PII guarantees.** Pure function of ordered canonical `event_type`s already in the step; no text, no value, no clock. PII-safe **by construction** because it never touches `state_change_details` (which is the PII-risky `textContent` field — see §Guardrails). Emits new derived `SOPStep.resultSummary?: string` + `outcomeClass?: enum`.

**Contract/schema changes.** Additive optional `resultSummary?` + `outcomeClass?` on `SOPStep` (`process-engine/types.ts`); no canonical-event or `RawEvent` change; **no rule-version bump** (render-layer only). Directly *moves SVR* because two orphan generic lines collapse into one specific outcome-bearing action.

**Effort 2 / Risk 1.** **Not P0** (process-engine only, no harness). **Reconnection+synthesis** (new binding logic over existing events).

---

## Option 2 — **Structural Locator** (landmark + ordinal + affordance shape), NEW capture ⭐ RANK 2

**The insight.** The single biggest WHERE gap: we know *what* was clicked but never *where on the page*. None of landmark region, positional ordinal, or visible affordance shape is computed today. All three are **pure structure** — no text, no value — so they are the most PII-safe enrichment possible.

**Mechanism (three sub-signals, all in `target-inspector.ts`):**
1. **Landmark/section scope** — nearest ARIA landmark ancestor: `<nav> <main> <aside> <header> <footer>`, `role=region|search|form|navigation`, or `<section>`/`<region>` **named via `aria-label`/`aria-labelledby` only**. Yields "in the **Filters** panel", "in the **primary navigation**". This is the elegant *extension* of neighbor-context beyond modal/table/tab (which the prior review's B already reconnects).
2. **Positional ordinal** — index+count within the element's semantic collection (`role=row|listitem|option|menuitem|tab|gridcell`, or `<li>/<tr>` siblings): `{ index, total }`. Yields "the **3rd row**", "**item 2 of 7**".
3. **Affordance shape** — a small closed enum classifying the *visual control kind* from role + structure (never geometry text): `icon_button | text_button | primary_button | link | toggle | menu_item | tab | field`. Yields "the **icon button**" when no label survives — far better than "Click the target element".

**New PII-safe signal.** Ordinal and shape are 100% structural (integers + enum). Landmark label is aria-only through `safeText`. Answers **WHERE** and gives a fallback **WHAT-shape** when labelless.

**Pipeline plug-in.** `inspectTarget` (`target-inspector.ts:139-151`) adds `landmarkLabel?`, `ordinal?: {index,total}`, `affordanceShape?` to `RawEventTarget` → schema `TargetSummarySchema` (additive optional) → `normalizer.ts:155-161` passthrough → `SegmentableEvent.target_summary` projection → `deriveStepTitle` / `sopBuilder.deriveInstruction` ladder rungs *above* the terminal generics.

**Determinism / PII guarantees.** Pure DOM structural reads (bounded traversal like the existing extractor caps). Ordinal/shape carry no free text; landmark label reuses the shared `safeText`/`applySafetyHeuristics` (atomic update across both duplicated regex sets — F-3/F-5). Sensitive-target propagation nulls all three.

**Contract/schema changes.** Additive optional fields on `RawEventTarget` (extension types), `TargetSummarySchema` (schema-events), `CanonicalEvent.target_summary`, `SegmentableEvent`. **Bump `NORMALIZATION_RULE_VERSION`** (+ `SEGMENTATION_RULE_VERSION` when titles consume it); regenerate golden fixtures.

**Effort 4 / Risk 4.** **P0-gated** (content + background + segmentation) — real-extension harness mandatory; validate traversal perf on a heavy CRM/spreadsheet. **NEW capture.**

---

## Option 3 — **Typed Verbs + Value-Shape** (precise verb, shape-not-value), reconnect+new ⭐ RANK 3

**The insight.** `interactionType` is computed at capture (`target-inspector.ts:97-110`) then **dropped at the normalizer** (`normalizer.ts:155-161` reads only 4 scalars). Reconnecting it lets the renderer pick the exact verb (`dropdown_select`→"Select", `checkbox_toggle`→"Toggle", `radio_select`→"Choose"). The *new* half: a **value-shape classifier** that reads the input element's `type`/`inputmode`/`pattern`/`min-max` — **never `el.value`** — to emit a shape class (`date | email | number | currency | url | phone | text_short | text_long`). Steps become "**Select** from the Status dropdown", "**Enter a date** in Due Date" — even when the value was redacted.

**New PII-safe signal.** Value-shape is derived from element *metadata attributes*, so it survives redaction and never echoes the typed value. Verb precision comes from a captured enum.

**Pipeline plug-in.** normalizer passthrough of `interactionType`; new pure `classifyValueShape(elementType, inputType, pattern)` in `policy-engine` (or a shared pure helper) run at normalize time → `target_summary.interactionType` + `valueShape` → segmentation projection → `deriveStepTitle`/`deriveInstruction` verb+object selection.

**Determinism / PII guarantees.** Enum passthrough + regex/table classifier; no I/O, no clock, no value read. Immutable/additive.

**Contract/schema changes.** Additive optional `interactionType`, `valueShape`, `valuePresent` on `TargetSummarySchema` + canonical + `SegmentableEvent`. **Bump `NORMALIZATION_RULE_VERSION`**; fixture regen. (Keyboard/drag flat fields already on `RawEvent` — free to read.)

**Effort 3 / Risk 4.** **P0-gated** (normalizer + segmentation). Largely **reconnection** for the verb; the value-shape classifier is **new capture-side logic**. This is essentially prior-review A+C, sharpened with the value-shape idea — include it, but it is the least "beyond reconnection" option.

---

## Option 4 — **Accessible-Name Resolution** (accname), reduce labelless-rate at source, enhancement ⭐ RANK 4

**The insight.** Vague steps are ultimately *labelless* steps. The current label ladder (`label-extractor.ts`) is a hand-rolled priority chain that misses names a screen reader would resolve (e.g. `aria-labelledby` referencing *multiple* ids, implicit `<label>` wrapping, `<button>`+`<img alt>`, `figcaption`). Replacing/augmenting it with a **bounded WAI-ARIA accessible-name computation** (accname subset: `aria-labelledby` id-list join → `aria-label` → associated `<label>` → `alt`/`title` → text content, each through `applySafetyHeuristics`) raises label hit-rate, which shrinks how often the terminal generics fire **at the source** rather than papering over them downstream.

**New PII-safe signal.** A *more complete* accessible name + the *computed* ARIA role (feeds Option 3's verb selection). Same `safeText` guards — because accname can pull *more* text, guard strictness is essential.

**Pipeline plug-in.** `extractLabel` (`label-extractor.ts:70-187`) becomes `computeAccessibleName` (bounded, ordered, safety-gated); `inspectTarget` also records the *computed role* alongside the raw `role` attribute.

**Determinism / PII guarantees.** Pure DOM function; deterministic ordering; every candidate passes existing PII heuristics. No new value exposure — it only finds *names that already exist* in the accessibility tree.

**Contract/schema changes.** None structurally (populates existing `label`), plus optional `computedRole?`. **Bump `NORMALIZATION_RULE_VERSION` is NOT required** (label content changes, not shape) — but golden fixtures shift, so treat as a fixture-regen event. **P0-gated** (`content/*`).

**Effort 3 / Risk 3.** **P0-gated.** **Enhancement** (mostly new logic in an existing capture surface).

---

## Option 5 — **State-Diff Outcome Synthesis** (before/after over the canonical stream), NON-P0 ⭐ RANK 5

**The insight.** A step-level cousin of Option 1 that adds a genuine **before/after diff** using signals *already in the canonical stream but never differenced*: `routeTemplate` before vs after (already captured), application-label change, and the *presence* of a following `modal_opened`/`toast_shown`/`error_displayed`. Synthesize a deterministic per-step `stateDelta` ("navigated `/invoices/list` → `/invoices/new`", "a dialog opened", "an error was shown"). Distinct from Option 1: Option 1 binds a single adjacent event as a *result phrase*; Option 5 computes a *structured delta object* over the whole step window that can also drive Completion Criteria and Common Issues.

**New PII-safe signal.** Route-template delta (structural path, no entity names) + outcome-class presence flags. No text.

**Pipeline plug-in.** Pure pass in `process-engine` (`stepAnalyzer` / a new `deriveStateDelta`) reading `page_context.routeTemplate` and grouped `event_type`s; emits `SOPStep.stateDelta?`.

**Determinism / PII guarantees.** Pure over already-normalized (already-redacted) fields; routeTemplate is structural. Additive derived metadata.

**Contract/schema changes.** Additive optional `stateDelta?` on `SOPStep`. No capture/schema/version change.

**Effort 2 / Risk 1.** **Not P0.** **Reconnection+synthesis.** Lower marginal value than Option 1 alone; best shipped *after* Option 1 as its structured backbone.

---

## Ranking, rationale, and sequencing

| Rank | Option | Delivers | Class | P0? | Effort | Risk |
|---|---|---|---|---|---|---|
| **1** | Outcome Binding | RESULT (steps read as outcomes) | reconnect+synthesis | **No** | 2 | 1 |
| **2** | Structural Locator | WHERE + labelless WHAT | **new capture** | Yes | 4 | 4 |
| **3** | Typed Verbs + Value-Shape | precise verb + typed input | reconnect+new | Yes | 3 | 4 |
| **4** | Accessible-Name (accname) | fewer labelless steps at source | enhancement | Yes | 3 | 3 |
| **5** | State-Diff Synthesis | structured before/after | reconnect+synthesis | **No** | 2 | 1 |

**Why this order.** *Measured > assumed:* Option 1 is the highest elegance-to-risk move — it makes steps read as **outcomes** (directive requirement b) with **zero capture-pipeline risk**, ships behind no harness, and is PII-safe by construction. Options 2–4 are the genuinely-new-capture WHERE/WHAT gains but are P0 and must each pass the real-extension harness one guarded step at a time. Option 5 is the structured backbone that generalizes Option 1 and is best sequenced immediately after it.

**Recommended serialization:** Option 1 (NON-P0, ship first) → Option 5 (NON-P0, structure the deltas) → then the P0 block behind CEO approval + harness + MR-005 D-7 pre-check: Option 4 (raise label hit-rate at source) → Option 3 (verbs + value-shape) → Option 2 (structural locator, biggest WHERE payoff, heaviest footprint). The two NON-P0 options land measurable SVR/outcome wins before any capture-pipeline exposure.

---

## Requirement coverage map

- **(a) WHAT / WHERE / WHY without echoing values:** Option 2 (landmark+ordinal+shape = WHERE + labelless WHAT), Option 4 (better WHAT), Option 3 (verb+typed-shape WHAT), all structural/metadata-only.
- **(b) PII-safe state-change/outcome signal:** Option 1 (outcome-class binding) + Option 5 (structured state-diff) — both derived from `event_type`/`routeTemplate`, never from `state_change_details` text.
- **(c) Contract/schema changes:** enumerated per option — additive optional fields only; `NORMALIZATION_RULE_VERSION`/`SEGMENTATION_RULE_VERSION` bumps flagged for Options 2/3 (and fixture-regen for 4); Options 1/5 are render-layer-only (no bump).

---

## Guardrails (must hold on every option)

1. **Never reconnect `state_change_details` as-is.** Its source `nodeLabel` (`state-observer.ts:156-162`) falls back to raw `textContent` (toast/error copy → PII). Options 1/5 use the **outcome class (`event_type`) only**. If any future work carries state detail, it must be **aria-label-only** through `safeText`, mirroring `neighbor-context-extractor`.
2. **Value-SHAPE, never value** (Option 3): classify from element `type`/`inputmode`/`pattern` — never read `el.value`.
3. **Landmark/section names aria-only** (Option 2): `aria-label`/`aria-labelledby`, never `heading.textContent` of a region (entity names).
4. **No LLM/clock/random/network** anywhere in capture→normalize→segment→sopBuilder. Any AI phrasing lives in a separate post-deterministic layer that never writes back into canonical/derived or the SVR gate.
5. **Sensitive-target propagation:** a sensitive target nulls *all* new neighbor/locator/shape fields.
6. **Atomic dual-regex update:** the safety regex set is duplicated across `label-extractor.ts` and `neighbor-context-extractor.ts`; update both together.
7. **Real-extension harness on every P0 iteration** (Options 2/3/4); re-verify the batch-vs-live convergence invariant (I1) after any `deriveStepTitle` change; additive-optional schema so old events still parse.
8. **No `manifest.json` content_scripts/permissions or `RAW_EVENT_CAPTURED` bus change** without explicit CEO approval.

---

## Verification per iteration

- Determinism: run twice on a fixed fixture → byte-identical canonical / derived / rendered SOP.
- SVR before/after: `computeSopVagueness(...).svr` on the vague-path fixtures (`svrVaguePath.test.ts`) pre/post — the CEO-facing number.
- PII: redaction/sensitivity suite + a neighbor/locator PII fixture (email/SSN/CC in a modal title, toast, region label) → confirm nulled.
- Convergence I1 (segmentation changes): batch vs live `DerivedStep` byte-identity.
- Capture pipeline (Options 2/3/4 only): `playwright.real-ext.config.ts` green + manual real-Chrome capture confirmed.
</content>
</invoke>
