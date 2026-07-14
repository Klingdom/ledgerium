# SOP Enrichment Review 001 — Richer, PII-Safe SOP Detail

**Type:** Mode 3-adjacent multi-agent design review (NON-counting; ZERO product code changed)
**Date:** 2026-07-12
**Directive (CEO):** "Capture more detailed and helpful information on the SOP section without capturing PII during workflow recordings. The privacy-first approach is working; the SOP details are not good enough for a human to follow. Come up with multiple elegant solutions."
**Panel (4):** system-architect · extension-privacy-auditor · ux-designer · product-manager
**Per-agent artifacts:** `docs/meta/SOP_ENRICHMENT_REVIEW_001/{architect,privacy,ux,pm}_analysis.md`
**Builds on:** `docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md` (2026-07-04) + WIP `specificity.ts` (SVR metric), `safe-page-title.ts`.

---

## 1. Executive verdict

**SOP vagueness is a data-drop cascade, not a copy bug.** The extension already computes rich, redaction-safe structure for every interaction (`interactionType`, `ancestorPath`, `role`, `valuePresent`, keyboard/drag intent, and a fully-built **neighbor-context extractor**) — but four successive contracts discard most of it before it reaches step text, so a step often renders from a single ≤80-char label that already survived over-redaction. When that's empty, the step degrades to valid-but-useless filler ("Click the target element") that the quality gate can't catch **because nothing measures specificity**.

**Therefore most of the fix is reconnection + smarter rendering, not new data collection** — which means real, low-risk wins ship before any capture-pipeline (P0-gated) change. Two hard constraints shape everything: (a) capture-pipeline edits are P0-gated by the Extension Reliability Invariant (real-extension harness + CEO approval); (b) two live PII leaks (F-0 pageTitle, F-1 state-observer text) must be closed before their signals are surfaced.

**The elegant path:** measure it honestly → win on rendering (zero capture risk) → reconnect already-captured structure (small P0 surface) → then, guarded, wire neighbor context (highest leverage).

---

## 2. Two PII leaks that gate the work (close first)

- **F-0 (prior review) — `document.title` captured unscreened** into every event/bundle. `document.title` routinely contains names/emails ("Inbox (3) – phil@mediafier.ai"). Fix = run safety heuristics on it at capture; substitute domain/route-template on rejection. WIP `safe-page-title.ts` addresses this — must pass the real-extension harness before merge (Extension Reliability Invariant).
- **F-1 (new, privacy audit) — `state-observer.ts nodeLabel()` returns raw `textContent`** of toast/error/status banners as `state_change_details`, persisted **unredacted** to `chrome.storage.local` today (P1; becomes P0 the instant the normalizer forwards it). This is the ONLY text path that never calls `safeText()`. **Consequence: outcome signals must be surfaced by CLASS only (see §4), never the banner text — until F-1 is fixed by routing `nodeLabel()` through `safeText()`.**

---

## 3. Privacy model — what we CAN safely surface (the enabling constraint)

The auditor's tiered catalogue is the guardrail for every option below:

- **🟢 GREEN (pure structure/enum/int — capture freely):** `interactionType`, `elementType`, `role`, capped `ancestorPath`, **ordinal position** `{index,total}`, **landmark/section region** (aria), `keyboardIntent`, `valuePresent`, a new **value-shape class** (from `type`/`pattern`, never `.value`), `routeTemplate`-based breadcrumb/section-heading **templates**, `state_change_kind`, **outcome polarity**, mutation-count deltas.
- **🟡 AMBER (safe WITH redaction):** element labels, `modalTitle`, `tableHeader`, `activeTabLabel`, `nearbyLabels`, breadcrumb text, business-ID strings. Requires the fixed redaction (below).
- **🔴 RED (never):** `.value`/`.checked`, contenteditable/chat text, unscreened `document.title`, URL query/fragment, raw ARIA-live bodies, partial masking.

**Redaction fix (unblocks AMBER + fixes over-redaction):** today `label-extractor.ts` nulls legitimate business labels like "Order #10234" (≥5 digits). Replace with a **business-ID allowlist** (Order/Invoice/Ticket/PO#…) that fires only AFTER hard PII regexes (email/URL/phone/SSN/CC/IBAN/Luhn) pass, is **excluded** when a person-identifying prefix is present (account/customer/user/patient/member…), and caps at ≤10 digits even inside an allowlist match — plus an entropy/token-noise filter and aria-role gating that excludes chat/comment/log containers.

---

## 4. The elegant solution set (consolidated + ranked)

Each option notes class: **RENDER-ONLY** (no capture change, no P0 gate) · **RECONNECT** (surface already-captured data; small P0 surface) · **NEW-CAPTURE** (P0-gated, harness + MR-005 D-7 pre-check).

| # | Solution | Class | What it adds | SVR impact | Effort/Risk |
|---|----------|-------|--------------|-----------|-------------|
| **S1** | **Smarter templating + sibling disambiguation** (UX format A: "Action · Target · Location · Result"; sub-numbering 7.1/7.2; location-hoisting per group) | RENDER-ONLY | Turns existing fields into a teachable, consistent step grammar; distinguishes "which Save" using already-captured `role`/`ancestorPath` | med | 1 / 1 |
| **S2** | **Confidence-scaled honesty phrasing** (honesty in the *text*: "control not labeled — confirm before…", "(not confirmed)", "Watch for:") | RENDER-ONLY | Converts silent vague filler into a legible "verify this" signal; serves the new-hire job directly | SVR-neutral by design | 1 / 1 |
| **S3** | **Outcome Binding** (fold the trailing state-event **class** into the preceding action → "Click Save → a confirmation appears") | RENDER-ONLY* | Steps read as outcomes, not orphan clicks. *Depends on F-1 fix so only the class/polarity is used, never text | med | 2 / 1 |
| **S4** | **Reconnect structural signals** (`interactionType` precise verbs, `keyboardIntent`, drag semantics, `valuePresent` + **value-shape class** → "Enter a date in Due Date") | RECONNECT | Precise verbs + labelless "what kind of value" without echoing values | 10–20% | 2 / 2 |
| **S5** | **Accessible-Name resolution** (bounded WAI-ARIA accname computation replacing the ad-hoc label ladder) | NEW-CAPTURE | Cuts labelless steps *at source* | high | 3 / 3 |
| **S6** | **Structural Locator** (new capture: landmark/section scope, ordinal `{index,total}`, affordance-shape enum) | NEW-CAPTURE | Answers WHERE + a labelless WHAT; maximally PII-safe (pure structure) | high | 4 / 4 |
| **S7** | **Neighbor-context wiring** (the built-but-unwired extractor: modal title, table column, breadcrumb, active tab — AMBER, redacted) | NEW-CAPTURE | **Highest leverage** — 40–55% SVR impact per PM; split into guarded sub-deliverables | very high | 4 / 4 |

**UX step formats (apply across S1/S3):** (A) structured "Action · Target · Location · Result" default; (B) outcome-fused compact clause for collapsed cards; (C) "Where exactly ▾" progressive disclosure; (D) location-hoisting for grouped multi-action steps. Concrete before→after rewrites of today's live fallbacks are in the UX artifact.

---

## 5. Measurement (do this first — it's free and honest)

- **SVR (Step Vagueness Rate)** already exists as a deterministic MEASURE-ONLY module — but its 0.00% baseline is measured on **hand-authored, fully-labelled fixtures, not production** (PM finding). **Action: instrument SVR as a lightweight production observability event** (the number is already computed; zero new capture risk) to get an honest baseline before setting a target.
- **Add a "cold-read" human-followability acceptance test** — SVR can't detect local ambiguity or irreducible vagueness; a periodic "can a new hire follow this without asking?" pass complements it.
- Target (set after honest baseline): SVR baseline → <X%, plus cold-read pass rate.

---

## 6. Recommended phased sequence

1. **Phase 0 — Measure honestly (no capture change):** production SVR instrumentation + cold-read test. Ship **S1 + S2** (RENDER-ONLY) immediately — real, followable-quality gains with zero Extension Reliability risk.
2. **Phase 1 — Close leaks + first reconnection (small P0 surface):** land F-0 (`safe-page-title`) and **F-1** (`safeText` on `nodeLabel`) through the harness; then **S3** (outcome binding, class-only) + **S4** (reconnect structural signals). Apply the **redaction fix** (§3).
3. **Phase 2 — Highest-leverage capture (guarded):** **S7** neighbor-context wiring, split into sub-deliverables, each behind the real-extension harness + privacy sign-off + MR-005 D-7 pre-check; then **S5/S6** as source-level enhancements.

---

## 7. Open CEO decisions
1. Approve the **RENDER-ONLY quick wins (S1+S2)** to ship now (no capture risk)?
2. **F-1** disposition — fix as a Mode 3 debugging item alongside F-0 before any outcome-signal work?
3. Sign-off on the **redaction recalibration** (business-ID allowlist) — this is a privacy posture change and needs explicit go/no-go.
4. SVR **target** + whether the cold-read acceptance test is adopted as a gate.
5. Commit to the **P0-gated neighbor-context (S7)** program (highest leverage, harness-gated, multi-iteration)?
6. Sequencing vs. the AI Integration Platform Vision track (SOP quality is a dependency for AI-recommendation credibility).

---

## 8. Governance
NON-counting Mode 3-adjacent review; zero product code changed; zero cadence increment. Capture-pipeline options (S3-dependency, S4-S7) are **P0-gated** per the Extension Reliability Invariant — real-extension harness + CEO approval required per change; RENDER-ONLY options (S1, S2) are not. If actioned, capture changes should enter via the standard P0 audit-intake + harness discipline.
