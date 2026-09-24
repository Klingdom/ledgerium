# Field capture review 001 — precise field identity + generalized entry

**Date:** 2026-09-24 · **Mode:** Define-phase investigation (no product code changed)
**Directive (CEO, verbatim):** *"engage agents to determine how to get more precise information during workflow recordings. Should be able to identify field names and entering info should be generalized."*

Five specialists investigated in parallel: `system-architect`, `extension-privacy-auditor`,
`sop-domain-expert`, `competitive-researcher`, `product-manager`. Every load-bearing
claim below was re-verified by the coordinator against the file before being written
down; where a specialist was wrong, that is recorded too.

---

## 1. The finding that reframes the request

**The recorder already knows the field type. The SOP writer throws it away.**

- `apps/extension-app/src/content/target-inspector.ts:146` captures
  `elementType: el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase()`
  — so `date`, `email`, `number`, `tel` are **already in the pipeline today**.
- `packages/process-engine/src/stepAnalyzer.ts:434` renders the step as
  `Enter data in the "${label}" field in ${appLabel}.` — the type is never used.

So half of *"entering info should be generalized"* needs **no new capture, no new
privacy surface, and no schema change** — only the sentence that renders it.
Verified by the coordinator, not inferred.

**Second finding of the same shape:** `extractLabelWithContext`
(`label-extractor.ts:241`) and `extractNeighborContext`
(`neighbor-context-extractor.ts:304`) — which extract **table column headers**, the
real field names in grid UIs — are fully written and have **no caller in the capture
path**. Two specialists found this independently; the coordinator confirmed by grep.
A meaningful part of *"identify field names"* is already built and unwired.

**Reconciliation — there are TWO renderers, and the coordinator verified both:**
- `packages/process-engine/src/sopBuilder.ts:327` renders SOP steps as `Enter value in "${label}"`, with a sensitive variant at `:325` and a role fallback at `:330`.
- `packages/process-engine/src/stepAnalyzer.ts:434` renders a different sentence, `Enter data in the "${label}" field in ${appLabel}.`

**Neither states the control type.** So the product manager is right that field *naming* already works where a label resolves — the gap is (a) coverage when none of the 11 label sources resolve, (b) no entry-kind taxonomy at all (a `<select>`, a radio and a free-text input all collapse to `input_changed` + a boolean), and (c) the captured type is discarded by both renderers.

---

## 1a. How this gets measured — the instrument already exists

`isVagueInstructionText()` (`packages/process-engine/src/specificity.ts`, exported at `index.ts:47`) already classifies an instruction as vague or specific, and `sopBuilder` already falls back to an honest vague template rather than fabricating a name.

**The metric is therefore: % of input/click instructions classified vague, before vs after** — produced as a batch report over real workflows, in the same shape as `apps/web-app/scripts/health-score-distribution.ts`.

Two consequences, both from the product manager and both correct:
- **No baseline exists in the repo.** It must be measured first, not assumed. No acceptance number should be published before that measurement.
- **Reject "labels extracted" as the metric.** Extraction can succeed with junk — forty buttons all labelled "Submit" — without reducing a reader's confusion.

---

## 2. What is captured today

| Captured | Where |
|---|---|
| Accessible label via an 11-rung ladder (aria-label → aria-labelledby → `label[for]` → placeholder → title → data-testid → innerText of buttons/links → …) | `label-extractor.ts:84-225` |
| Selector, role, element **type** | `target-inspector.ts:139-151` |
| `value_present: boolean` | `capture.ts:318` |
| The typed value | **Never** — confirmed across `captureInputChange`, `captureDebouncedInput`, `captureContentEditableBlur` |

---

## 3. MVP cut (product manager's boundary, adopted)

**In:** (a) close coverage gaps in the *existing* label ladder — table-cell inputs resolving to their column header, floating-label patterns that are not programmatically associated; (b) add a closed `entryKind` distinguishing **enumerable** controls (select / radio / checkbox / toggle) from **free text**, so the renderer may surface the *selected option's display text* for enumerable controls only.

**Explicitly out:** any capture or display of a typed free-text value, ever; OCR or vision inference; multi-field form-structure inference; a shape taxonomy guessing "looks like a date" **from the value**; retroactive relabelling of historical sessions.

**Why enumerable-only is the right first cut:** a selected option is a closed set the user chose from a visible list — it is not typed content. Free text is where the privacy promise lives, and it stays untouched.

**One caveat the product manager raised and I am keeping prominent:** "select = safe" is not universally true. A dropdown of patient names or account numbers is real. Option text must route through `classifySensitivity` before it is rendered — widget type is not a whitelist.

---

## 4. Recommended sequence

Ordered by value delivered per unit of new risk. Phase 1 is the whole point.

**Phase 1 — render what is already captured. No capture change, no schema change.**
`Enter data in the "Reference" field` → `Enter the reference (text) in the "Reference" field in Salesforce`, with the control type stated for date / email / number / dropdown / checkbox / file. Pure rendering work in `stepAnalyzer.ts`. Zero new privacy surface.

**Phase 2 — capture the format affordances the DOM already offers.**
`required`, `pattern`, `placeholder`, `maxLength`, `aria-required` are inspectable and value-free. They turn *"entered a date"* — which the SOP expert rightly calls useless on its own — into *"Enter the due date (format MM/DD/YYYY)"*. This is where new-hire errors actually happen. Must pass the screening gate in §4.

**Phase 3 — split field identity into a key and a label.**
Today `selector` is both the machine join key and the display name, and `id` outranks `aria-label`. Proposed: `field_identity { key, key_source, label, label_source, stability }` with the key ladder `name` → `data-testid` → non-volatile `id` → `aria-labelledby` → `label[for]` → column header → `aria-label` → placeholder → positional.
**Add as a NEW field; leave `selector` byte-identical.** `interactionTargetKey` drives the `target_changed` step boundary (`batch-segmenter.ts:228-236`), so re-ranking the existing selector would move step boundaries and invalidate the I1 convergence invariant and all 12 golden fixtures.

**Phase 4 — wire the dead neighbor-context code, gated.**
Column headers are the field names in grid UIs. Ship only behind §4's gate and behind the input debounce — see the cost note in §5.

---

## 5. The privacy gate (mandatory for phases 2-4)

Capturing field *identifiers* is a different category from capturing a visible *label*, and the current screening does not cover it:

- `getStableSelector` (`target-inspector.ts:73-93`) applies **no PII screening at all** — only `SAFE_ID_RE`, a shape check. An `id="ssn_janedoe_4821"` passes through verbatim today.
- `SAFE_ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/` is charset-only, so framework-generated ids (`ember1234`, React `useId`, Salesforce `j_id0:…`) are treated as stable when they are not. Verified.
- `sensitivity.ts` **declares** `SensitivityClass` values `'health' | 'hr' | 'legal'` but `classifySensitivity()` **never assigns them** — there are no patterns for diagnosis, medication, salary, compensation, or privileged. A field named `patient_diagnosis` is unscreened today.

**Rule to implement before any identifier is captured:**
1. **Drop entirely** when the identifier matches `SENSITIVE_SELECTOR_PATTERNS` **plus new health / HR / legal lexicons** added to `sensitivity.ts`.
2. **Redact to a placeholder** when `containsPii()` matches (email, URL, long digit runs, phone, SSN, card).
3. **Pass** only under the existing length caps (80 chars / 12 words).
4. **Keep `field_kind` even when the identifier is dropped** — the kind is not PII, and it is what keeps a redacted step readable.

**Residual gap, stated plainly:** a label like *"SSN for Jane Doe"* is four words, no digits, and matches no pattern — it passes today and would still pass. Bare names are not regex-detectable. This is a known limit, not a solved problem.

---

## 6. Risks

1. **Segmentation.** Changing selector semantics moves step boundaries → I1 invariant + 12 golden fixtures (which **are** on disk, contrary to the architect's note; the coordinator verified). Mitigation: new field, existing selector untouched.
2. **A new public-claim category.** The security page says the extension captures *"the short visible label of what you interacted with — never a screenshot, video, keystroke, or field value"* (`security/page.tsx:35`). Field `name`/`id` attributes and table headers are **not** "visible labels". Phases 2-4 require the claim to be updated in the same change — there is precedent: a prior over-claim forced `PRIVACY_CLAIM_CORRECTION_001` and is now locked by `privacyClaims.test.ts`.
3. **Per-event DOM cost.** `inspectTarget` runs **before** the input debounce (`capture.ts:506`), so traversal already happens per keystroke. Neighbor-context adds up to 7 `querySelector` calls plus a `querySelectorAll` per event. Hoist identity resolution behind the debounce before wiring phase 4.
4. **Inference risk.** Field name + category can be sensitive even with no value: *"HIV status — selection made"*, *"Salary — number entered"*. The §4 drop-list exists for this.
5. **Honesty of claims.** `required` inferred from frequency across runs is evidence, not fact. The SOP expert is explicit: a document that mixes *observed* with *inferred* without marking which is which is the fastest way to fail an audit.

---

## 7. Competitive position

Every vendor evidenced — Scribe, Tango, Guidde, UiPath Task Capture, Power Automate, Celonis, Soroco, FortressIQ — is **capture-then-mask**: values are recorded, then blurred or scrubbed downstream, often with auto-detection gated behind higher tiers. **No competitor evidenced matches the never-capture design.** UiPath is the cautionary case: keystroke metadata stores only the first letter, but the AI-authored step *title* stores the full typed string and must be scrubbed by hand — a leak path Ledgerium structurally cannot have.

Control-**type** classification, by contrast, is near-universal among competitors and is free from the accessibility tree. It is the one capability their step output has that ours lacks — and it requires no value exposure.

---

## 8. CEO decisions

1. **Approve Phase 1** (render the captured type in step language). No new capture, no privacy change, no schema change.
2. **Phase 2-4 require a public-claim update** — capturing `name`/`id`/column headers is a new category. Approve the claim change, or cap capture at what "visible label" already covers.
3. **Approve the health / HR / legal lexicons** in `sensitivity.ts`. These classes are declared and unimplemented today, which is a gap regardless of this feature.
4. **Accept the residual gap** that bare personal names in labels are not detectable by pattern, or fund a different approach.
5. **Approve measuring the baseline first** (vagueness rate over real workflows) before any acceptance number is published.
6. **Sequencing:** ship the label-coverage slice first (no schema change, small blast radius), then `entryKind` (an additive, Zod-validated schema field) once the first slice's vagueness delta is measured in real Chrome. Extension telemetry (#148) is a separate surface and can proceed in parallel, but both land near `background/index.ts` — do not overlap them in one iteration.

---

## 9. Note on method

Five specialists ran in parallel and disagreed in useful ways. The architect reported the golden fixtures missing (they are on disk — 12 files) and the product manager reported a renderer the architect did not mention; both were reconciled by the coordinator reading the files. Every claim in this document that drives a decision was verified against source, and the two specialist errors are recorded above rather than quietly dropped.
