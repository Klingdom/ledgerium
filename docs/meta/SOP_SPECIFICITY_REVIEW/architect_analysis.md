# SOP Specificity — Architect Analysis

**Mode:** 3-adjacent design review (NON-counting). **Deliverable:** analysis only — no product code changed.
**Author:** system-architect. **Date:** 2026-07-04.
**CEO directive:** make SOP details less vague wherever possible, without violating DETERMINISM or IMMUTABILITY.

---

## 0. Scope, invariants, and the one-sentence diagnosis

**Diagnosis:** vagueness is *not* primarily a rendering problem. It is a **progressive data-drop cascade**. The capture layer already computes rich, redaction-safe structure (`interactionType`, `ancestorPath`, `neighborContext`, keyboard/drag/value-shape signals), and then four successive contracts throw most of it away before it can reach step text. The renderer's "graded fallbacks" are a *symptom* of starved inputs, and the quality gate cannot see the problem because it measures nothing.

**Hard invariants this review must preserve (non-negotiable):**
- **DETERMINISM** — the core path (content capture → `normalizeRawEvent` → segmentation → `sopBuilder` title/instruction derivation) must produce byte-identical output for identical input. No `Date.now()` / `Math.random()` / network / LLM inference anywhere in that path.
- **IMMUTABILITY** — raw captured events are immutable; every enriched field must be *additive* and *traceable to a source event field*. No mutation of `RawEvent`. Derived signals (e.g. a specificity score) live downstream as derived metadata.

Every change below is classified as determinism-preserving because it is **pure structural passthrough or pure function of already-captured fields** — it moves existing deterministic data further down the pipe, it does not invent data.

---

## 1. The data-drop cascade (evidence map)

| Stage | Contract | What it carries | What it drops |
|---|---|---|---|
| Capture | `inspectTarget` → `RawEventTarget` (`apps/extension-app/src/content/target-inspector.ts:139-151`; type `apps/extension-app/src/shared/types.ts:104-113`) | selector, selectorFingerprint, label, role, elementType, **interactionType**, **ancestorPath(≤4)**, isSensitive | — (rich here) |
| Capture (enrichment) | `extractNeighborContext` → `NeighborContextEvidence` (`apps/extension-app/src/content/neighbor-context-extractor.ts:304-312`) | modalTitle, tableHeader, breadcrumbTrail, activeTabLabel, nearbyLabels | **NEVER CALLED at runtime** — live capture uses `extractLabel`, not `extractLabelWithContext`; canonical slot is reserved but unpopulated |
| Content→BG message | `RawEvent` (`apps/extension-app/src/shared/types.ts:131-166`) | flat scalars **plus** already-declared flat fields: `value_present:147`, `keyboard_key:156`, `keyboard_intent:157`, `drag_source_selector:159`, `drag_target_selector:160`, and sub-object `target?: RawEventTarget:151` | nothing structurally — but downstream reader ignores most of it |
| **Normalizer (RC-1)** | `normalizeRawEvent` builds `target_summary` (`apps/extension-app/src/background/normalizer.ts:155-161`) | **ONLY** `selector, label, role, elementType, isSensitive` | **interactionType, ancestorPath, selectorFingerprint, value_present, keyboard_intent, drag_source/target, neighborContext** — all dropped here |
| Canonical schema | `TargetSummarySchema` (`packages/schema-events/src/canonical-event.schema.ts:78-92`) | selector, selectorConfidence, label, role, elementType, isSensitive, sensitivityClass, **`neighborContext` (reserved, L86-91)** | no `interactionType` / value-shape / keyboard / drag field exists in the schema yet |
| Segmentation projection | `SegmentableEvent.target_summary` (`packages/segmentation-engine/src/types.ts:23-28`) | **ONLY** `label, role, elementType, selector` | everything else (even the reserved `neighborContext`) |
| Step title | `deriveStepTitle` (`packages/segmentation-engine/src/rules.ts:169-…`) | groups labels + page context into a title | cannot reference modal/column/tab context it never received |
| SOP instruction (RC-4 renders symptom) | `deriveInstruction` graded fallbacks (`packages/process-engine/src/sopBuilder.ts:252-292`) | `Click "label"` when label present, else terminal generics: `Click the target element` (`:263`), `Enter the required value` (`:277`), `Submit the form` (`:285`) | — these fallbacks all **PASS** validation |
| Quality gate (RC-4) | `validateRenderedSOP` (`packages/process-engine/src/templates/sopValidator.ts:101-176`) | bans 8 hardcoded strings (`:27-36`) + generic-title regex (`:44`) | **no specificity measurement**; the graded fallbacks are not on the ban list, so vague output ships silently |

**Existing usable baseline signal:** `lowDataFlag === true IFF confidence < 0.55` (`packages/intent-inference/src/confidence-scorer.ts:124-125`) and segmentation `single_action` confidence = `0.55` (no label) / `0.75` (label) (`packages/segmentation-engine/src/rules.ts:316-320`). These are an existing self-declaration of vagueness — the specificity metric (§3) builds on them so we do not invent a competing notion of "vague".

**P0 gating reality (Extension Reliability Invariant).** Governed surfaces requiring the real-extension harness: `apps/extension-app/src/content/*`, `apps/extension-app/src/background/*`, `manifest.json`, and `packages/{normalization,segmentation,policy}-engine`. **NOT** P0-gated: `packages/schema-events`, `packages/intent-inference`, `packages/process-engine`. This split drives the sequencing in §4 — the highest-leverage *measurement* work (§3/§Change D) lives entirely outside the P0 zone and ships with zero capture-pipeline risk.

---

## 2. Ranked pipeline changes (leverage vs cost/risk)

Ranked by leverage-to-cost ratio, i.e. recommended execution order.

| # | Change | Leverage | Cost | Risk | P0 / harness | Independently shippable |
|---|---|---|---|---|---|---|
| **D** | Deterministic specificity score + measure-only validator gate | HIGH (makes vagueness measurable + eventually rejectable) | LOW | LOW | No — `process-engine` only | **Yes** (Mode 2, no harness) |
| **A** | Extend `target_summary` at normalizer: `interactionType` + value-shape + keyboard/drag semantics | HIGH | MED | MED | Yes — `background/*` + schema | Partly (needs C to reach text) |
| **C** | Thread new fields `SegmentableEvent → DerivedStep → deriveStepTitle → sopBuilder` | HIGH (enabling plumbing) | MED | MED | Yes — `segmentation-engine` | No — byte-coupled to A and/or B |
| **B** | Reconnect neighbor-context end-to-end ("Save in the Edit Invoice modal", "click in the Status column") | **VERY HIGH** | HIGH | HIGH | Yes — `content/*` + `background/*` + `segmentation-engine` | No — split into B1/B2 |

Rationale for ordering: **D first** because Ledgerium principle is *measured > assumed* — we must be able to prove before/after, and D carries zero capture-pipeline risk. **A+C next** because keyboard/drag/value-shape signals are already on `RawEvent` (no content change needed to read them) so this is the cheapest capture-pipeline win. **B last** because it delivers the biggest specificity gain but touches the most P0 surfaces.

---

### Change D — Specificity score + measure-only quality gate (ship FIRST)

**Intent:** emit a deterministic per-step specificity score and an aggregate SOP score; upgrade `validateRenderedSOP` to (phase 1) *record* the score, then (phase 2, after A/B/C land) *reject* terminal generic fallbacks. Full metric design in §3.

**Files / contracts that change:**
- NEW `packages/process-engine/src/specificity.ts` — pure module `computeStepSpecificity(step, sourceEvents) → { score: number; vague: boolean; components: {...} }` and `computeSopSpecificity(steps) → { mean: number; minStep: number; vagueStepCount: number }`.
- `packages/process-engine/src/templates/sopValidator.ts` — add **Rule 7 (specificity)**: measure-only in phase 1 (attach to diagnostic, never fails); in phase 2 fail on terminal generics + on aggregate `mean < FLOOR`.
- `packages/process-engine/src/types.ts` (`ProcessOutput.sop.steps[]`) — additive optional `specificityScore?: number` + `vague?: boolean` derived metadata (NOT on the canonical event; NOT on `RawEvent`).
- (Optional, deferred) surface aggregate in the web-app SOP view so users see a "specificity: 0.42" badge.

**Determinism:** pure function of already-present boolean/number inputs (label presence, neighbor-context presence, `interactionType` known, value-shape known, existing `confidence`/`lowDataFlag`). No clock, no randomness, no I/O. Same `ProcessOutput` → same score. Preserved.

**Immutability:** reads derived `DerivedStep`/`ProcessOutput` data only; writes a *new derived* field; never mutates `RawEvent` or `CanonicalEvent`. Preserved.

**Why it can ship before the enrichment:** in phase 1 the score will read LOW today (labels-only) and rise measurably as A/B/C land — which is exactly the before/after evidence the directive needs. **Do not enable phase-2 rejection until A/B/C ship** (sequencing hazard — see §5).

---

### Change A — Extend `target_summary` at the normalizer (RC-1 core fix)

**Intent:** stop dropping the fields that let the renderer pick the right verb and describe the input. Carry: `interactionType`, a **redaction-safe value-shape** (never the value), and keyboard/drag semantics.

**Files / contracts that change:**
- `packages/schema-events/src/canonical-event.schema.ts` — extend `TargetSummarySchema` (`:78-92`) with **optional** additive fields:
  - `interactionType: z.enum([...]).optional()` (mirror `InteractionType`, `apps/extension-app/src/shared/types.ts:67-78`)
  - `valueShape: z.string().optional()` — e.g. `email` | `date` | `currency` | `number` | `phone` | `text_short` | `text_long` (a *shape class*, never the value)
  - `valuePresent: z.boolean().optional()`
  - `keyboardIntent: z.enum(['submit','close','navigate']).optional()`
  - `dragSourceSelector` / `dragTargetSelector: z.string().optional()`
- `apps/extension-app/src/shared/types.ts` — mirror the same optional fields on `CanonicalEvent.target_summary` (`:185-193`).
- `apps/extension-app/src/background/normalizer.ts` — in the `targetSummary` builder (`:155-161`), read these from `raw.target` (the `RawEventTarget` sub-object, `types.ts:151`) with flat-field fallback. **Key finding:** `value_present`, `keyboard_intent`, `keyboard_key`, `drag_source_selector`, `drag_target_selector` are **already declared flat fields on `RawEvent`** (`types.ts:147,156-160`), so reading them requires **no content-script change** — only `interactionType` needs the `raw.target` sub-object.
- Compute `valueShape` via a **policy-safe classifier** (extend `@ledgerium/policy-engine` or a pure helper) that maps a captured `value_present` + input `elementType`/`inputType`/pattern into a shape class — it must operate on the *element metadata*, never the entered text, so it can run even when the value was redacted.
- **Bump `NORMALIZATION_RULE_VERSION`** (`@ledgerium/normalization-engine`) — normalizer output changes → regenerate golden fixtures.

**Determinism:** all new values are pure functions of fields already on the immutable `RawEvent`; passthrough + a deterministic shape-classifier (regex/enum table, no I/O). Preserved. (Verification note: `raw.target` population by live capture must be confirmed on the harness before relying on `interactionType`; the flat fields are safe today.)

**Immutability:** additive optional schema fields; `RawEvent` untouched; each new field traces to a named `RawEvent` source field. Preserved.

**Risk:** `background/*` is P0 — **real-extension harness REQUIRED**. Schema change is backward-compatible (all optional) so old events still parse. Version bump forces a fixture regen (expected, not a regression).

---

### Change C — Thread new fields to step text (RC-1 last mile)

**Intent:** A and B are inert until the segmentation projection and the renderer actually *read* the new fields. This is the plumbing that converts carried data into less-vague text.

**Files / contracts that change:**
- `packages/segmentation-engine/src/types.ts` — extend `SegmentableEvent.target_summary` (`:23-28`) with the redaction-safe subset: `interactionType?`, `valueShape?`, `keyboardIntent?`, and (for B) `neighborContext?`. Deliberately **do not** carry `ancestorPath`/`selectorFingerprint` into segmentation — low text value, PII/bloat risk (see §5).
- `packages/segmentation-engine/src/rules.ts` `deriveStepTitle` (`:169+`) — use `interactionType` to select the verb precisely (e.g. `dropdown_select` → "Select …", `checkbox_toggle` → "Toggle …") and use `valueShape` in `data_entry` titles ("Enter the invoice date" when label present, "Enter a date" when only shape known). Consume `neighborContext` for B.
- `packages/process-engine/src/sopBuilder.ts` `deriveInstruction` (`:238-292`) — insert new ladder rungs *above* the terminal generics: prefer `label` → then `neighborContext` scope → then `interactionType`+`valueShape` → only then the existing generic fallback. This directly shrinks how often `:263/:277/:285` fire.
- Whatever projection builds `SegmentableEvent` from `CanonicalEvent` (segmentation input adapter) must copy the new fields through.
- **Bump `SEGMENTATION_RULE_VERSION`** — segmenter output/titles change → regenerate golden + convergence fixtures (`convergence-*.regression.test.ts`, `invariants.test.ts`).

**Determinism:** title/instruction derivation remains a pure function of the (now richer) event fields; ladder is deterministic ordering. Preserved. The convergence invariant (batch vs live byte-identity) must be re-verified — both paths consume the same `classifyGroupingReason`/`deriveStepTitle`, so extending both symmetrically preserves I1.

**Immutability:** additive projection fields; no source mutation. Preserved.

**Risk:** `segmentation-engine` is P0 — **harness REQUIRED**. Byte-coupled to A (fields have no producer without A) and to B (neighborContext). Ship **A+C together** (or A immediately-then-C) so no dead fields ship.

---

### Change B — Reconnect neighbor-context (highest specificity payoff)

**Intent:** turn "Click the target element" into "Click **Save** in the **Edit Invoice** modal" and "Click **the Status column**". This is the single biggest vagueness reducer because it adds *scope* the label alone never had.

**Split into two shippable units:**

**B1 — populate `neighborContext` at capture + normalizer passthrough** (P0, harness):
- `apps/extension-app/src/content/*` capture call-site — call `extractNeighborContext(target)` (already exists, `neighbor-context-extractor.ts:304-312`) alongside `inspectTarget`, and attach to the outgoing `RawEvent.target` (or a new flat/sub-object field). This is the RC-2 fix: the extractor is written and PII-safe (`safeText`, `:52-64`) but never invoked at runtime.
- `apps/extension-app/src/background/normalizer.ts` — pass `neighborContext` into `target_summary` (canonical slot **already reserved**, `canonical-event.schema.ts:86-91` — no schema change needed for the container; confirm field-shape parity).
- Bump `NORMALIZATION_RULE_VERSION`; regenerate fixtures.

**B2 — consume neighbor-context in titles/instructions** (segmentation P0 + process-engine non-P0):
- `SegmentableEvent` carries `neighborContext` (part of Change C).
- `deriveStepTitle` / `deriveInstruction` build scope phrases deterministically: prefer `modalTitle` ("in the {modalTitle} modal") → `tableHeader` ("in the {tableHeader} column") → `activeTabLabel` ("on the {activeTabLabel} tab") → `breadcrumbTrail` leaf. Strict precedence = deterministic.

**Determinism:** `extractNeighborContext` is documented pure w.r.t. DOM state (`neighbor-context-extractor.ts:19-24`): same DOM → same output. Consumption is deterministic precedence. Preserved. (Capture-time DOM read is inherent to all capture and is the *source of truth*, not non-determinism — identical captured input still yields identical canonical/segmented/rendered output.)

**Immutability:** additive; uses the reserved schema slot; no source mutation. Preserved.

**Risk:** touches `content/*` + `background/*` + `segmentation-engine` — the heaviest P0 footprint. **Harness REQUIRED for B1 and B2.** Watch DOM-traversal perf (extractor caps depth already: modal 20, table 10, tabs 15) — validate on the harness against a real heavy app (spreadsheet/CRM).

---

## 3. Deterministic specificity score / vagueness metric

**Goal:** a per-step score in `[0,1]` and an aggregate, computed by a pure function, so improvement from A/B/C is measurable before/after. It **builds on the existing `lowDataFlag`** rather than competing with it.

**Where it lives:** NEW `packages/process-engine/src/specificity.ts` (non-P0, deterministic). Computed from `DerivedStep` + its source `CanonicalEvent`s at SOP build time; emitted as derived metadata on `ProcessOutput` steps.

**Component formula (additive, clamped — mirrors the `confidence-scorer` style at `confidence-scorer.ts:113-120`):**

```
specificity = clamp(
    0.40 * hasBusinessLabel      // target label present, non-empty, not a raw element type, not a banned generic
  + 0.25 * hasNeighborContext    // any of modalTitle | tableHeader | activeTabLabel | breadcrumbTrail(non-empty)
  + 0.15 * hasTypedInteraction   // interactionType resolved AND != 'generic_click'
  + 0.10 * hasValueOrVerbShape   // valueShape present (input) OR resolved verb+object
  + 0.10 * notLowData            // 1 when confidence >= 0.55 (i.e. lowDataFlag === false), else 0
, 0.0, 1.0)
```

Weights are chosen so that: label-only (today's best case) ≈ 0.50; label + neighbor context ≈ 0.75; label + neighbor + typed interaction ≈ 0.90. A pure terminal fallback with no label ≈ 0.00–0.10.

**Audit-honesty IFF invariant (mirror the existing pattern at `confidence-scorer.ts:22-24,124-125`):**

```
vague === true  IFF  specificity < 0.50
```

Emitting `vague` as a hard IFF of the score keeps the metric self-consistent and testable the same way the intent-inference `lowDataFlag` is (a Group-B style invariant test).

**Aggregate:** `computeSopSpecificity(steps) → { mean, minStep, vagueStepCount }`. `mean` is the headline before/after number; `minStep` surfaces the single worst step; `vagueStepCount` drives the phase-2 gate.

**Determinism / immutability:** every input (label presence, neighbor presence, `interactionType`, `valueShape`, `confidence`) is already deterministic; the function has no clock/random/I/O; output is derived metadata only. Both invariants preserved.

**Validator integration (`sopValidator.ts`):**
- **Phase 1 (ship with D, before enrichment):** compute and attach `mean`/`minStep` to the validation diagnostic; **never fail** on it. Purely observational baseline.
- **Phase 2 (only after A+C+B land):** add terminal generics (`Click the target element`, `Enter the required value`, `Submit the form`, `Click the button`) to a new **`GENERIC_FALLBACK_STRINGS`** reject set, and fail when `mean < FLOOR` (start `FLOOR = 0.45`, ratchet up as evidence accrues). Keep it separate from `BANNED_RECORDER_STRINGS` (`:27-36`) so the semantics (artifact vs vagueness) stay distinct.

---

## 4. Sequencing recommendation

**Independently shippable Mode-2 iterations (no byte-coupling):**
- **D** — specificity module + measure-only gate. Non-P0, **no harness**. Ship first as the measurement baseline. *This is the ideal first iteration:* zero capture-pipeline risk, establishes before/after evidence.

**Byte-coupled clusters (must land together / strictly adjacent):**
- **A + C (interactionType + value-shape + keyboard/drag end-to-end).** Schema + normalizer (A) produce the fields; segmentation projection + `deriveStepTitle` + `sopBuilder` (C) consume them. Shipping A without C = dead fields; shipping C without A = reading undefined. Deliver as one iteration or two strictly-adjacent iterations (A then C, no gap). **Harness REQUIRED** (background + segmentation). Bump both rule versions; regenerate golden fixtures in the same iteration.
- **B1 then B2 (neighbor-context).** B1 (capture + normalizer passthrough) can ship and be validated on the harness independently — it populates canonical `neighborContext` with no user-visible change yet. B2 (segmentation + sopBuilder consumption) then turns it into text. B2 depends on the Change-C projection carrying `neighborContext`. **Harness REQUIRED for both.**

**Recommended order:** D → (A+C) → B1 → B2. Each capture-pipeline iteration re-runs `playwright.real-ext.config.ts` + a manual real-Chrome capture check per the Extension Reliability Invariant, and re-verifies the batch-vs-live convergence invariant (I1) after any `deriveStepTitle` change.

**Harness-required flags:** A ✅, C ✅, B1 ✅, B2 ✅. **D ❌ (no harness needed).**

**Golden-fixture / version-bump obligations:** A → bump `NORMALIZATION_RULE_VERSION`; C and B2 → bump `SEGMENTATION_RULE_VERSION`; regenerate `convergence-*.regression.test.ts` + `invariants.test.ts` + full-pipeline golden fixtures each time. These regens are expected output-shape changes, not regressions — reviewers should diff fixtures for *intended* specificity gains only.

---

## 5. What you must NOT do (guardrails)

1. **No LLM / model inference in the deterministic core path.** Content capture, `normalizeRawEvent`, segmentation, and `sopBuilder` title/instruction derivation must stay pure. Any AI enrichment (e.g. a nicer natural-language step) must live in a **separate, clearly non-deterministic, post-deterministic layer** that (a) never writes back into `CanonicalEvent`/`DerivedStep`, and (b) never feeds the specificity score or the validator gate. The deterministic score is computed from deterministic inputs only.
2. **No `Date.now()` / `Math.random()` / network / filesystem** introduced anywhere in the four core stages — this includes the new `valueShape` classifier and the specificity module.
3. **Do not un-redact PII to gain specificity.** Carry **value-SHAPE, never value.** Keep `neighbor-context-extractor`'s `safeText` filters (`:52-64`) and the policy-engine sensitivity path (`normalizer.ts:104-132`) intact. Never surface entered text, and never widen `selector` capture beyond the existing 40-char aria-label slice (`target-inspector.ts:84`).
4. **Do not carry high-cardinality DOM detail into segmentation.** Exclude `ancestorPath` and `selectorFingerprint` from `SegmentableEvent` — low text value, real PII/bloat risk, and they widen the deterministic surface for no user benefit.
5. **Do not enable the phase-2 specificity rejection gate before A/B/C ship.** Turning on generic-fallback rejection while the renderer still lacks enriched inputs would fail otherwise-shippable SOPs. Measure first, reject later.
6. **Do not mutate `RawEvent` or treat any new field as authoritative source.** All new fields are additive and traceable; the immutable raw log remains the single source of truth.
7. **Do not skip the real-extension harness** on any capture-pipeline iteration (A/C/B1/B2), and do not "while we're here" refactor content/background code — per the Extension Reliability Invariant, unit tests cannot certify capture health.

---

## 6. Verification checklist per iteration

- Determinism: run the pipeline twice on the same fixture → byte-identical `CanonicalEvent[]`, `DerivedStep[]`, rendered SOP.
- Convergence invariant I1: batch vs live `DerivedStep` byte-identity after any `deriveStepTitle`/grouping change.
- Immutability: assert no `RawEvent` field is written; new fields all optional and additive; old events still `CanonicalEventSchema.parse` clean.
- Specificity before/after: capture `computeSopSpecificity(...).mean` on a fixed fixture set pre- and post-change; the delta is the CEO-facing evidence that vagueness dropped.
- PII: run the redaction/sensitivity suite + a neighbor-context PII fixture (email/SSN/CC in a modal title) → confirm `safeText` still nulls it out.
- Capture pipeline (A/C/B1/B2 only): `playwright.real-ext.config.ts` green + manual real-Chrome capture confirmed.

---

## 7. Bottom line

The cheapest, safest, highest-order first move is **Change D** — it turns "less vague" from an opinion into a measured number with zero capture-pipeline risk. **A+C** then delivers precise verbs and typed inputs using signals *already captured* (keyboard/drag/value-present are on `RawEvent` today). **B** delivers the marquee wins ("in the Edit Invoice modal", "the Status column") by finally invoking an extractor that already exists and is already PII-safe. None of it requires an LLM, none of it un-redacts anything, and all of it is deterministic passthrough of data the system already computes and then discards.
