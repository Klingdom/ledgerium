# SOP Detail Specificity Review 001

**Type:** Mode 3-adjacent multi-agent diagnostic review (NON-counting; no product code changed)
**Date:** 2026-07-04
**Directive (CEO, verbatim):** *"engage subagents to analyze SOP content format and data collection methodology to make SOP details less vague whenever possible"*
**Agents engaged:** 3 grounding explorers + 4 specialists (`system-architect`, `ux-designer`, `product-manager`, `extension-privacy-auditor`)
**Component analyses:** `docs/meta/SOP_SPECIFICITY_REVIEW/{architect_analysis,ux_analysis,pm_analysis,privacy_analysis}.md`

---

## 1. Executive Summary

SOP vagueness is **not a rendering bug — it is a progressive data-drop cascade**. The Chrome extension's capture layer computes rich, redaction-safe structure about every interaction, and four successive contracts throw most of it away before it reaches step text. By the time the SOP renderer runs, its richest input for a step is often a single ≤80-char `label` string that has already survived (a) over-aggressive safety redaction, (b) a flat-field-only normalizer, and (c) a lossy segmentation projection. When that label is empty at any gate, the step degrades to a generic-but-valid string ("Click the target element", "Enter the required value") that the quality gate cannot detect because **the gate measures nothing about specificity**.

**Three structural truths:**
1. **The data already exists.** `interactionType`, `ancestorPath`, `value_present`, `keyboard_intent`, and drag semantics are already captured on the `RawEvent`; a fully-built neighbor-context extractor (modal title, table column, breadcrumb, active tab) exists and its canonical schema slot is reserved — but it is **never called at runtime**. Most of the fix is *reconnection*, not new collection.
2. **We can't manage what we don't measure.** There is an existing `lowDataFlag` self-declaration of vagueness, but no aggregate metric. A deterministic **Step Vagueness Rate (SVR)** can be computed today over the 12 golden fixtures with zero pipeline risk.
3. **A genuine privacy P0 surfaced en route** that is independent of vagueness and should be triaged first (see §2).

**Highest-leverage sequence:** ship the measurement gate → surface already-captured structural fields → reconnect neighbor context (guarded) → relax over-redaction (guarded). Every step is additive, deterministic, and traceable.

---

## 2. 🔴 Independent P0 discovered — pageTitle PII leak (NOT a vagueness item)

**Finding F-0 (privacy audit §7):** `raw.page_title` = `document.title` is captured and transmitted off-device in **every** event and every uploaded bundle **with no PII screening whatsoever**. It is the only field in the pipeline that bypasses all safety heuristics. `document.title` in business apps routinely contains email addresses and person names — the codebase's own type comment gives the example `"Inbox (3) – phil@mediafier.ai"`.

- **Where:** capture (`document.title` sourcing) → `normalizer.ts:151` (`pageTitle: raw.page_title ?? ''`) → `uploader.ts` (transmitted in `page_context.pageTitle`).
- **Fix (capture-time):** run `applySafetyHeuristics()` on `document.title` before assigning `raw.page_title`; on rejection substitute the domain/application label or `routeTemplate` (both already computed).
- **Governance:** touches capture pipeline → **P0-gated, CEO-approval + real-extension harness required.** Recommend handling as a **Mode 3 debugging fix**, ahead of the vagueness burn-down.

---

## 3. Root-Cause Map (verified, file:line)

| ID | Root cause | Evidence | Fix class |
|----|-----------|----------|-----------|
| RC-1 | Rich target fields dropped at normalizer (reads only 4 flat scalars) | `background/normalizer.ts:155-161`; captured on `RawEvent` at `shared/types.ts:147,156-160` | Additive normalizer passthrough |
| RC-2 | Neighbor-context extractor built but never wired to live capture | `neighbor-context-extractor.ts` exists; `inspectTarget` calls `extractLabel` not `extractLabelWithContext` (`target-inspector.ts:145`); schema slot reserved `canonical-event.schema.ts:78-92` | Reconnect + guard |
| RC-3 | Over-redaction nulls legit business labels (≥5 digits / ≥12 words) | `label-extractor.ts:57-68` — "Order #10234" → null | Guarded allowlist |
| RC-4 | Quality gate bans a tiny hardcoded string set; never measures specificity | `sopValidator.ts:27-44,101-176` | Measurement + measure-only gate |
| RC-5 | Per-step `purpose` is category boilerplate; entity inference is a 40-keyword allowlist; roles default to "Operator" | `stepAnalyzer.ts:448-460`; `contentEnricher.ts:71-99,675` | Derive-per-step; null-not-boilerplate |
| RC-6 | No visual-evidence field; two divergent SOP shapes | no `screenshot` on `SOPStep`; `workflow-report-builder.ts` vs `process-engine` | Display + consolidation (defer) |

---

## 4. UX Specificity Rubric & Phrasing Decisions

**A step detail is "specific enough" when it names ≥2 of:** the **object** (what element), the **location/context** (app / page / container), the **expected result** (what changed). Six tiers were defined (Tier 1 specific → Tier 6 unusable). Today the system reaches Tier 1–2 with a clean DOM label and collapses to Tier 5–6 for labelless / coordinate-only steps.

**Resolved design decision** (the open question at `docs/architecture/CONVERGENCE_...:180`): a labelless click should read **"Click in {applicationLabel}"** — *not* "Click action in Gmail" (category-word, not a verb), *not* "Click element on {pageTitle}" (technical), *not* "Click button" (no location).

**Other UX rulings:**
- Coordinate-only labels (`A16`, `B16`) → suppress from titles; coordinates belong in `detail` only.
- One-word ambiguous labels ("Other") → wrap in typographic quotes to signal ambiguity without fabricating.
- Per-step `purpose`/`expectedOutcome` → derive from real signals or return **`null`**; boilerplate is worse than nothing because it trains readers to skip the field.
- Breadcrumb context on the step card is high-value/low-effort **display** (data already in `deriveStepEvidence()`); screenshots are deferred pending capture + storage + privacy work.

---

## 5. Deterministic Specificity Metric (the measurable outcome)

**Step Vagueness Rate (SVR)** = `vague_instruction_count / total_instruction_count`, where an instruction is *vague* if its text matches the confirmed graded-fallback set (9 patterns + 5 page-appended prefix variants) **OR** its parent `SOPStep.confidence < 0.55` (mirrors the existing `lowDataFlag` IFF `normalizedLabelConfidence < 0.55`).

- **Computable today**, deterministically, by running `processSessionFull` over the 12 golden fixture chains — **no DB, no capture changes**.
- **Audit-honesty invariant** (architect): `vague === true IFF specificity < 0.50`, mirrored as a test assertion parallel to existing registry-IFF patterns.
- **Target:** −60% SVR across the first three improvement candidates; secondary goal SVR ≤ 20% at completion.

This converts "less vague whenever possible" into a number with a baseline and a target — satisfying Ledgerium's "no measurable outcome = incomplete" rule.

---

## 6. Privacy Guardrails (must hold on every enrichment)

| Enrichment | Verdict | Required guard |
|-----------|---------|----------------|
| RC-1 `interactionType`, `ancestorPath`, `keyboard_intent`, drag selectors | **SAFE-AS-IS** (structural, already captured & sensitive-gated) | Omit on sensitive target; do **not** add `selectorFingerprint` (no SOP value) |
| RC-1 value-SHAPE | **SAFE only if type-attribute-derived** | Never read `el.value`; shape only from input `type` (`date`, `number`, `url`…) |
| RC-2 `tableHeader`, `nearbyLabels`, `activeTabLabel` | **SAFE with existing `safeText()`** | — |
| RC-2 `modalTitle` | **NEEDS-GUARD** | aria-label / aria-labelledby only — **never** `heading.textContent` (entity names) |
| RC-2 `breadcrumbTrail` | **REJECT textContent** | Use existing `page_context.routeTemplate` (structural path, no entity names) |
| RC-3 business-ID labels | **SAFE-WITH-REDACTION** | Allowlist `order/invoice/po/ticket/case/ref/…` **after** email/phone/SSN/CC guards; digit run ≤10; **exclude** person-identifying prefixes `account/customer/user/patient/employee/member/client` |

**Cross-cutting guards:** sensitive-region propagation (sensitive target → null ALL neighbor fields); the RC-3 allowlist must update **both** `label-extractor.ts::applySafetyHeuristics` and `neighbor-context-extractor.ts::safeText` atomically (they duplicate the regex set — F-3/F-5). Chrome Web Store single-purpose policy holds provided collection stays structural/schema-level.

---

## 7. Ranked Improvement Candidates (proposed backlog)

Ordered for burn-down. Impact = SVR reduction / reader value; Effort/Risk 1–5.

| # | Candidate | RC | Surface | Impact | Effort | Risk | Notes |
|---|-----------|----|---------|--------|--------|------|-------|
| **P0-a** | **pageTitle PII redaction at capture** | F-0 | extension capture | Privacy blocker | 2 | 3 | Mode 3 fix; P0-gated; real-ext harness |
| **P0-b** | **SVR metric + measure-only gate** in `sopValidator` | RC-4 | process-engine | Enables measurement | 2 | 1 | Ships first; **zero** capture-pipeline risk |
| **P0-c** | **UX Tier-A display fixes** (labelless→"Click in {app}", suppress coordinates, quote 1-word, surface error-recovery label) | RC-5 | process-engine / web-app display | High reader value | 2 | 1 | No capture change; immediate wins |
| **P1-d** | Surface `interactionType` + `keyboard_intent` through `target_summary` → step text | RC-1 | normalizer + segmentation + sopBuilder | Medium-high | 3 | 4 | Byte-coupled; P0-gated; harness; version bump + fixture regen |
| **P1-e** | Reconnect neighbor context (`modalTitle` aria-only, `tableHeader`, `activeTab`, `nearbyLabels`; **routeTemplate not breadcrumb**) | RC-2 | capture + schema + normalizer + sopBuilder | **Highest specificity** | 4 | 4 | Multi-iteration → split at intake; guards §6; P0-gated; harness |
| **P1-f** | RC-3 business-ID allowlist (guarded, both files atomic) | RC-3 | policy/label heuristics | Medium | 2 | 3 | Privacy-reviewed; P0-gated; harness |
| **P2-g** | Per-step `purpose`/`expectedOutcome` derive-or-null | RC-5 | process-engine | Medium | 2 | 2 | Removes boilerplate |
| **P3-h** | Per-step screenshot / visual evidence | RC-6 | capture + storage + display | High but costly | 5 | 5 | Defer — needs storage + privacy design |
| **P3-i** | Consolidate divergent SOP shapes (`workflow-report-builder` vs process-engine) | RC-6 | extension + engine | Consistency | 4 | 3 | Defer |

**Recommended near-term serialization:** P0-b (measure) → P0-c (display wins) → P0-a (privacy fix, CEO-approved) → P1-e split into sub-deliverables → P1-d → P1-f → P2-g.
Rationale: land the metric and the zero-risk display improvements first (fast, measurable, no capture-pipeline exposure), then take the P0-gated capture changes one guarded step at a time behind the real-extension harness.

---

## 8. Hard Do-Nots (carried from privacy audit §8 + determinism invariant)

1. No LLM / clock / randomness in the core deterministic path.
2. Never read `el.value`/`textContent` to compute a shape/length/word-count signal.
3. `modalTitle` from aria only — never dialog `heading.textContent`.
4. No raw `breadcrumbTrail` textContent — use `routeTemplate`.
5. RC-3 allowlist excludes person-identifying prefixes; never un-redact genuine PII.
6. No change to `manifest.json` content_scripts/permissions or the `RAW_EVENT_CAPTURED` bus without explicit CEO approval.
7. Never skip the real-extension harness on capture-pipeline changes (Extension Reliability Invariant).
8. Update the two duplicated heuristic implementations atomically.

---

## 9. Open Questions for CEO

1. **Serialization:** approve the §7 sequence (measure + display wins first), or fast-track P1-e neighbor context?
2. **P0-a pageTitle leak:** authorize as an immediate Mode 3 fix?
3. **Backlog intake:** promote P0-a/P0-b/P0-c to the live `IMPROVEMENT_BACKLOG.md` now (P0-only per audit-intake pattern), holding P1–P3 as cold pool in this artifact?
4. **Screenshots (P3-h):** worth a dedicated future design lane, or out of scope?

---

## 10. Execution Log

**P0-b — SVR metric + measure-only gate — ✅ COMPLETE (2026-07-05, `qa-engineer`, directed).**
- Created `packages/process-engine/src/specificity.ts` (pure, deterministic): `VAGUE_INSTRUCTION_STRINGS` + `VAGUE_INSTRUCTION_PREFIXES` (source-cited), `isVagueInstruction`, `computeStepSpecificity` (audit-honesty IFF `vague === true IFF specificity < 0.50`), `computeSopVagueness` (SVR + divide-by-zero guard). `specificity.test.ts` +33 substantive tests.
- `validateRenderedSOP` extended with optional `specificity` field (measure-only; all 6 rejection rules byte-identical — verified: sopValidator.test.ts 31/31 pass). Baseline script `scripts/svr-baseline.ts` added.
- **Validation:** process-engine 478/478 pass (+33); workspace typecheck clean; `git status` scope = process-engine only, no capture-pipeline/normalization/segmentation/policy-engine files.
- **Measured baseline SVR = 0.00% (0 / 219 instructions) over the 10 curated workflow fixtures.**
- **LEARNING (honest limitation):** the curated fixtures are fully-labelled, so SVR is trivially 0 there — it cannot demonstrate the vagueness problem or a before/after improvement. **Follow-up (folded into P0-c):** add labelless/coordinate/error-recovery "vague-path" fixtures (mirroring the segmentation goldens `single-action-no-label`, `spreadsheet-cells`, `error-recovery`) that flow through the SOP render path and register non-zero SVR, so P0-c's reduction is provable. The metric itself is sound and sensitivity-tested at unit level.

**P0-c — render-layer specificity for labelless/generic steps — ✅ COMPLETE (2026-07-05, `backend-engineer`, directed).**
- Production changes (process-engine render layer only): `sopBuilder.ts` `deriveInstruction()` labelless-click ladder now emits **"Click in {applicationLabel}"** (UX §4 decision) instead of the vague-prefix "Click the target element in {app}"; `contentEnricher.ts` `cleanStepTitle()` strips bare spreadsheet cell refs from titles; single-word ambiguous labels quoted; error-recovery action surfaces the recovery target.
- **Vague-path fixtures added** (`svrVaguePath.test.ts`, +24 tests) mirroring the segmentation goldens (labelless click, coordinate-only, error-recovery), flowing through the real `processSessionFull` render path — establishing a real non-zero pre-fix baseline and regression-locking the result.
- **Measured outcome:** labelless-click fixture SVR **0.33 (1/3) → 0.00** — the "Click the target element in {app}" vague prefix is eliminated at the source. Title/quoting/error-recovery fixes improve reader-facing text but (honestly) do not move the instruction-based SVR; the suite documents each case's SVR impact explicitly (no metric-gaming; `specificity.ts` untouched).
- **Validation:** process-engine 502/502 (+24); workspace 3586/3586; typecheck clean; `git status` scope = process-engine only — **zero** segmentation/normalization/policy-engine/extension files. Measure-only invariant preserved (sopValidator verdict unchanged).
- **Honest limitation:** demonstrated reduction is on the new vague-path fixtures (proof-of-mechanism + regression lock); corpus SVR over the 10 curated workflow fixtures remains 0 because they were authored fully-labelled. Real-world corpus SVR will be observable once sessions with capture-failures flow through, and once the capture-pipeline items (P1-d/e/f) surface richer signals.

---

**P0-a — pageTitle PII redaction at capture (Finding F-0) — 🟡 CODE-COMPLETE, pending real-extension validation (2026-07-05, `backend-engineer`, Mode 3).**
- New `apps/extension-app/src/content/safe-page-title.ts`: `screenPageTitle(rawTitle)` + `getSafePageTitle()` — screens `document.title` through the shared PII heuristics (reuses now-exported `applySafetyHeuristics`) plus an unanchored `EMAIL_IN_TITLE_RE` that catches emails *embedded* in a title (e.g. "Inbox (3) – phil@mediafier.ai"), which the anchored label regex misses. On rejection → app/domain-label fallback → `''`. Deterministic.
- `capture.ts`: all 15 `document.title` reads routed through `getSafePageTitle()` (import + call-site swaps only). `normalizer.ts:151`: comment-only annotation (screening is upstream). `label-extractor.ts`: `export` added to `applySafetyHeuristics` (sole contract change — avoids duplicating the regex set).
- **Validation:** extension-app 301/301 (+22); workspace typecheck clean; dist builds clean; `document.title` appears exactly once in the dist (inside compiled `getSafePageTitle`); real-ext harness 1 pass + 2 known-Windows-flake skips (iter 070). `git status` scope = `apps/extension-app/src/content/**` + comment in normalizer — **forbidden surfaces untouched** (manifest content_scripts/permissions, message bus, attachDOMListeners, injection-manager all zero-diff, verified).
- **GATE:** per the Extension Reliability Invariant, closure requires **real-extension validation in a live Chrome session** — dist at `apps/extension-app/dist/`, load via `chrome://extensions` (developer mode), confirm (a) capture still works end-to-end and (b) a PII-bearing tab title is redacted. Not "shipped" until confirmed.

---

### Capture-pipeline boundary — P1 enrichment series HELD

P0-a is code-complete (validation-pending). Items P1-d, P1-e, P1-f all modify capture-pipeline-tracked surfaces (`apps/extension-app/**`, `packages/{normalization,segmentation,policy}-engine`) governed by the **Extension Reliability Invariant**. Before any of them proceeds:
1. **Explicit CEO approval** required per the forbidden-silent-changes rule.
2. **Real-extension harness** (`playwright.real-ext.config.ts`) is the validation gate of record — unit tests cannot certify capture-pipeline health.
3. The remaining sequence is N≥6 → **MR-005 D-7 meta-coordinator Mode 4 pre-check** is due before the capture-pipeline block begins.

Safe (non-capture) items P0-b and P0-c are complete. The sequence pauses here pending CEO go-ahead on the capture-pipeline block.
