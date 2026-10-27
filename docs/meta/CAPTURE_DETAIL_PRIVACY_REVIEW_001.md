# CAPTURE_DETAIL_PRIVACY_REVIEW_001 — More detail, no PII

**Date:** 2026-10-27
**Mode:** 3-adjacent multi-agent review (Define phase, NON-counting). No product code changed.
**CEO directive:** "Engage agents to determine methods to capture more detailed information during workflow recording but not capture personally identifiable information."
**Agents:** `extension-privacy-auditor` (capture inventory), `system-architect` (methods + pipeline design), `product-manager` (value ranking + metrics), `security-reviewer` (threat model + test strategy), `competitive-researcher` (vendor + regulatory scan).
**Governance:** every method below touches `apps/extension-app/src/content/` or `packages/{normalization,policy}-engine/`, so the CLAUDE.md Extension Reliability Invariant applies: CEO approval, the real-extension harness (`playwright.real-ext.config.ts`) or logged manual Chrome evidence, and no "while we're here" changes.

---

## 1. Summary

1. **Fix three existing leaks first.** Adding detail on top of them would make things worse (§3).
2. **Capture structure and shape, never content.** This means field meaning from standard attributes, validation flags, value *shape* buckets, form structure, the outcome of an action, and timing worked out downstream. That gives most of the detail we're missing with no raw text (§4).
3. **Move visible text from a denylist to an allowlist.** Today's pattern checks catch formats (email, SSN, card numbers) but cannot catch names, amounts or short IDs. Text should come only from page structure the app author controls (§5).
4. **Prove the absence of PII with a test.** A PII corpus is injected into every captured field, and a check confirms none of it appears in the serialized upload. Each guard is shown to bite by removing it and watching the test fail (§7).
5. **Positioning.** Competitors (Scribe, UiPath, Mimica, Skan, Celonis) capture screenshots or text and then *detect and redact*. Ledgerium can capture structure only, redact on the device, version the privacy rules on every event, and say "designed to exclude PII", not "anonymous" (§8).

---

## 2. Baseline (measured, 41 synthetic HR sample recordings, `docs/samples/hr-recordings/`)

| Metric | Baseline | Source |
|---|---|---|
| Generic step titles (`Perform action…`) | **66 / 260 = 25.4%** | coordinator recount |
| Person name in a step title | **1** confirmed ("Click Jordan Ellis", `screen-applicants.json`). 14 titles fit the "two capitalised words" shape; 13 of them are legitimate UI ("Manager Review", "Select All"), so a naive name heuristic is unusable | coordinator recount |
| Submit steps with a known outcome | 0% (not captured) | code: `RawEventOutcome` is typed but never filled in |
| Select/radio steps with a known choice class | 0% (not captured) | code: checkbox/radio excluded from the input handler, `capture.ts:502` |
| Neighbour context (modal title, breadcrumb, table header) in recordings | 0%. The extractor is **dead code** with no production caller | `label-extractor.ts:241`, `neighbor-context-extractor.ts` |

The samples are synthetic: they went through the real normalizer and segmenter, but they are not real captures. Re-run the baseline on real exports before setting targets.

---

## 3. Existing leaks, verified by the coordinator against source

| ID | Finding | Evidence | Severity |
|---|---|---|---|
| **CDP-L1** | Canonical `page_context.urlNormalized` holds the **full un-templated path** and is uploaded in `normalizedEvents`. `/orders/smith/notes` goes out as-is. The query string is NOT included (the background re-derives from the stripped `raw.url`). This contradicts the reviewer-facing claim "origin + parameterized route-template" and undoes the F-1 fix on the sibling `url` field. | `background/normalizer.ts:136,160`; `bundle-builder.ts:109-115` (whole canonical events uploaded) | **P0** |
| **CDP-L2** | Raw events keep `context.url` = raw `location.href` (query + `#fragment`, which can hold OAuth codes and search terms). `url_normalized` is also computed from the *unstripped* URL on navigation and submit. They are stored unencrypted in `chrome.storage.local`. Not uploaded. Per the September disclosure audit they are not purged after a normal Stop (not re-confirmed). | `capture.ts:241,382,558-573`; `session-store.ts:99,333` | **P1** |
| **CDP-L3** | Selectors are not PII-screened. `data-testid`, `data-qa`, `#id`, and `aria-label` (first 40 chars) are spliced in raw and uploaded as `target_summary.selector`. Example: `[aria-label="Open conversation from Jane Doe"]`. | `target-inspector.ts:73-93,120-126` | **P1** |
| CDP-L4 | The shared normalization package prefers `raw.url_normalized` when present. Any future caller that passes raw events would ship query strings. Not reachable today. | `normalization-engine/src/normalizer.ts:229-233` | P2 (latent) |

Security-review claim corrected: the query/fragment does **not** reach the extension upload. The background re-derives from the sanitized `raw.url`. Only the full path leaks (CDP-L1).

---

## 4. Methods to capture more detail (ranked)

The ranking combines product value with privacy risk and pipeline risk. "Forbidden surface" means the CLAUDE.md list that needs explicit CEO approval.

| # | Method | Detail added | Output improved | PII risk | Pipeline risk | Size |
|---|---|---|---|---|---|---|
| **M1** | **Field meaning from attributes.** `autocomplete` token (closed W3C set), `type`, `inputmode`, `required`, `pattern` present, `maxlength` bucket, role, multiline. Also mark `cc-*`, `new-password`, `one-time-code`, `bday`… as sensitive. | "Enter the postal code" with no value | SOP field text, generic-title rate | none | low (`target-inspector.ts`) | ~120 LOC |
| **M2** | **Label fallback chain + allowlisted text sources** (M10 combined with PM #1). Text comes only from the control's own accessible name, `label[for]`, `legend`, `th`, dialog/landmark headings, and a control-vocabulary allowlist. A "repeated UI wording" test says text shown identically across sibling rows is UI; text unique to one instance is data → stored as a class token. | Fewer "Perform action" titles; names stop leaking | Generic-title rate, PII-in-title | lowers risk | low–medium (`label-extractor.ts`) | ~200 LOC |
| **M3** | **Action outcome.** After submit or click: success / validation error / server error / none, from `role=alert`, `aria-live`, toasts, navigation vs stay. Class only, never text. | Error and rework visibility | Exception rate, SOP "common errors" | low (class only) | low (`state-observer.ts`) | ~120 LOC |
| **M4** | **Validation state.** `el.validity` flags (`valueMissing`, `typeMismatch`…), `aria-invalid`, error→field link via `aria-errormessage`/`aria-describedby`, `errorCategory` from a fixed keyword list computed *before* the text is discarded. | Field-level friction | Rework loops, friction hotspots | low (never the message text, which echoes input) | low | ~180 LOC |
| **M5** | **Choice class for select/radio/checkbox.** Checked state + option *index/count*; option label only if it passes M2's allowlist; otherwise `chose_option: true`. | Branch and decision reasons | Variant analysis, decision points | low with M2 | medium (`capture.ts` handlers) | ~100 LOC |
| **M6** | **Value-shape descriptors.** Coarse `lengthBucket` (0, 1–8, 9–32, 33–128, >128), char classes, `format` enum (email-, phone-, date-, number-, currency-, url-shaped, free text), `provenance` (typed / pasted / autofilled / cleared via `InputEvent.inputType`). Value read in memory and dropped. **Never on sensitive fields.** | Re-keying/paste signal, the strongest automation evidence | Automation scoring | low–medium (buckets must stay coarse: exact length on a 4- or 9-digit field nearly reveals the value) | medium (`capture.ts` handlers) | ~150 LOC |
| **M7** | **Form-structure fingerprint at submit.** Field/required/filled counts, multiset of `(type, autocomplete)`, SHA-256 of the sorted structural tuple (no values). | Same form recognised across sessions | Variant detection, "fields skipped" | low (quasi-identifier review needed) | low–medium | ~150 LOC |
| **M8** | **Structural context.** Revive the neighbour-context extractor after replacing its duplicated regexes with the shared `screenFreeText`. Landmark, dialog title, column-header *index*, breadcrumb *depth*; text only through M2. Cache breadcrumbs per route (whole-document query today). | "In Invoices › Line items, column Qty" | Step titles, process-map phases | medium without M2, low with it | low | ~120 LOC |
| **M9** | **Timing derived downstream.** Load-wait vs think-time (`aria-busy`, spinners), time-to-first-action, revisits, all from `t_ms`. Capture only focus dwell per field + scroll-depth bucket. **Never keystroke cadence** (a behavioural biometric). | Wait vs work time | Bottleneck and timing metrics | low | low if downstream | ~80 LOC |
| **M10** | **Cross-app hand-offs.** `copy`/`cut`/`paste` and tab-switch as payload-free edges (source field meaning → destination field meaning + app). Never read `clipboardData`. Upload/download as a boolean + extension class (filenames are PII-prone). One merged, versioned app-label table (two tables have drifted: `shared/utils.ts:39-45` has 15 apps, `url-normalizer.ts:236-242` has 5). | "Data moved Salesforce:email → NetSuite:email" | Cross-system maps, AI-opportunity evidence | low | medium (new listeners) | ~150 LOC |
| **M11** | **URL templating at source** (also closes CDP-L1/L2): raw URL becomes origin + template; richer placeholders (`:int :uuid :hex :slug`); route-template gap fixes (mixed-case hex, `@`/`%40` in a segment, base62 high-entropy, underscore/dotted names); query **key names** only from an allowlist; tenant subdomain → `:tenant`. | Filters/views without values | Variant grouping | lowers risk | **high** — `buildContext` runs inside `emit` on the RAW_EVENT_CAPTURED path (forbidden surface) | ~100 LOC |
| **M12** | **Session-local value linking** (same value typed into two systems). Per-session in-memory key, discarded at Stop; output is an ordinal token (`v3`), never a hash; skip low-entropy values and sensitive fields. Still **pseudonymous data under GDPR**. Never call it anonymous. | Re-keying proof | Automation ROI | medium–high | high | ~200 LOC; **DPIA + CEO approval; ship last** |
| — | Wireframe snapshots (layout boxes + roles) | — | — | — | needs an invariant change (`captureScreenshots`/`captureDomSnapshots` locked `false`) | **Deferred** |

**Cheapest high-value start:** M1 + M2. Both improve the 25.4% generic-title baseline and the PII-in-title leak without new event types or listeners.

---

## 5. Policy: from denylist to allowlist

Concrete bypasses of today's patterns (`sensitivity.ts:45-57`, `label-extractor.ts:45-82`):
- **Not checked at all:** `placeholder`, `title` and `<label>` text never reach `isSensitiveTarget`. `<input id=f1 placeholder="Social Security">` is not flagged.
- **Names, amounts, short IDs:** "Sarah Connor", "$4,250.00", "Invoice #4821", "Card ending 4242".
- **Anchored patterns on labels:** "Send to jane@acme.com" passes (only the page title and state-change text use the unanchored screen).
- **Ancestor headings (rule 10):** any unlabeled click inherits `<h1>Patient: Sarah Connor</h1>`.
- **Missing categories / non-English:** IBAN, DOB, passport, MRN, PIN, OTP; "Steuer-ID", "contraseña", "Kreditkarte"; no Unicode normalisation (zero-width or fullwidth characters bypass).
- **Over-redaction:** "Tokenize", "Secretary", "Forgot password?" lose their steps.

**Policy (proposed):**
1. Text may be captured only from allowlisted *sources* (see M2). Everything else becomes a class token.
2. The denylist and on-device detectors (Luhn, IBAN mod-97, email/phone parsers) become a **second alarm that forces redaction**, never the gate that permits capture.
3. One shared screener (policy-engine) and a branded `SafeText` type, so a raw string cannot reach `emit()` by accident.
4. A last-line scrubber on the bundle before `uploader.ts:34`.

---

## 6. Architecture principles

1. **Redact at source.** Values and unscreened text never leave the content-script function that reads them. Raw events are immutable and persisted (`background/index.ts:434`), so background-only redaction always leaves the original on disk.
2. **Allowlist by default** for text (§5).
3. **Shapes, not values.** Fixed enums and coarse buckets only.
4. **Versioned privacy policy as evidence.** Stamp `privacy_profile_version` / `descriptor_rule_version` / `route_rule_version` on every event. Log field-level suppressions to the policy log, extending the transparency rule (`invariants.md` §5.6).
5. **No stored linkable identifiers.** Session-local ordinals only, ephemeral keys.
6. **Observe at source, derive downstream** (timing, hesitation), keeping it deterministic and replayable.
7. **Fail open on detail, never on capture.** Descriptor code runs in `try/catch` and drops the descriptor, never the event. New listeners go in a separate `ObservationEngine.attach()` behind a default-off setting. The `attachDOMListeners()` call site, the RAW_EVENT_CAPTURED path, the `index.ts` pipeline and `manifest.json` stay byte-identical (all methods except M11 need no change there).

**Schema and rollback.** Add one optional sub-object `observation: { v, field?, shape?, validity?, structure?, outcome?, link? }` on raw and canonical events. Leave `SCHEMA_VERSION` and `PERSIST_SCHEMA_VERSION` unchanged. The production readers ignore the unknown key, so a rollback is code-only. Two caveats must be tested per MR-080:
- Zod strips unknown keys by default, so `CanonicalEventSchema` must declare `observation` or it is silently dropped.
- `packages/schema-events/raw-event.schema.ts` is out of date against `shared/types.ts:131-166` and must be reconciled first.

---

## 7. Test strategy (proof that no PII is captured)

1. **PII corpus fixture** (synthetic, versioned): emails, phones (US/UK/DE/IN/E.164), SSN/tax IDs/NI/SIN/CPF/Aadhaar/Steuer-ID, Luhn-valid cards, IBANs, DOBs, names (Western/CJK/Cyrillic/Arabic/single-token), addresses and postcodes, JWT/API keys, MRNs. Labels in en/es/fr/de/pt/ja/zh/ar/ru. Obfuscation variants (zero-width, fullwidth, homoglyphs, spaced letters).
2. **Injection matrix:** every corpus value is placed into every capture surface: aria-label, placeholder, title, `label[for]`, button/link text, tab/option/menuitem, tabindex div, ancestor heading, legend, breadcrumb, `th` and first body row without `<thead>`, dialog title, toast, `data-testid`, `id`, `name`, `document.title`, URL path, query, fragment, form action, typed value.
3. **Golden payload assertion:** drive the real `CaptureEngine` → normalizer → bundle. Capture `JSON.stringify(bundle)` at the uploader (mock `fetch`). Assert no corpus value or variant (digits-only, lowercased, URL-encoded, base64) is a substring. **Also assert the raw local store**, which covers CDP-L2. This test should FAIL today on CDP-L1. That is the intended first red.
4. **Property/fuzz tests** (fast-check): the screener, route template and sanitizer are deterministic, idempotent and never throw. A metamorphic check confirms that adding separators or zero-width characters does not change the verdict.
5. **Guard-bites check** (MR-082): remove each pattern and each allowlist source rule one at a time; at least one corpus member must then leak. A schema-coverage test asserts every emitted event key has an injection context.
6. **Real-extension harness run** for every phase (Extension Reliability Invariant).

**Limits:**
- A corpus proves the absence of corpus shapes, not the absence of all PII.
- Synthetic markup ≠ real apps; human review of a few real sessions is still needed.
- Quasi-identifier combinations (app + role + time in a small tenant) are not detectable by substring checks and need a separate k-anonymity-style review.
- Only the allowlist's safety does not depend on predicting PII shapes.

---

## 8. Market and regulatory

- **Vendors:**
  - Scribe: Smart Blur on 7 categories; admin-locked Smart Privacy Screen.
  - UiPath: masking during processing, fixed categories (SSN, card, routing number, phone).
  - Celonis: regex redaction on the client since v2.13 (2023).
  - Mimica: one-way hashes of PII terms.
  - Skan: irreversible screen masking, pseudonymous user IDs.
  - Most of them **detect then redact raw content**, and none publishes accuracy.
- Tango, Power Automate, Signavio, KYP.ai and Automation Anywhere were not verified (no usable results). Vendor claims come from search snippets, not full docs. **Verify before external use.**
- **Differentiation:** structure-only capture, on-device redaction, an auditable outbound schema, privacy-rule version stamped per event, deterministic (testable) redaction.
- **Pitfalls:**
  - Hashed or salted identifiers are personal data under GDPR. The EDPB Guidelines 01/2025 on pseudonymisation were a consultation draft; confirm the final text.
  - Chrome Web Store Limited Use also covers *derived and de-identified* data, so structural capture still needs disclosure and a published Limited Use statement.
  - Claim "designed to exclude PII", backed by the §7 tests, never "never captures PII".

---

## 9. Explicit non-goals (never capture)

- Typed or selected values.
- Screenshots, DOM snapshots, body `innerText`.
- Clipboard contents, file names or contents, request/response bodies.
- URL query values, fragments, tokens, cookies, web storage.
- Names, emails, IDs or free text taken from page content (table cells, list rows, messages).
- Anything from password, hidden or sensitive fields beyond presence.
- Keystroke-level logging, keystroke cadence, mouse trails.
- Anything outside the explicit recording window or the recorded tab.

---

## 10. Proposed phases (each independently shippable; each needs CEO approval + real-extension harness)

| Phase | Scope | Measure (baseline → target) | Touches forbidden surface? |
|---|---|---|---|
| **P1 Privacy hardening** | CDP-L1 urlNormalized → template; CDP-L3 selector screening; label screener unified + unanchored; PII corpus + golden payload test (§7.1–7.3) | known corpus leaks in upload → 0; full paths in upload → 0 | CDP-L1 is in `background/normalizer.ts`, next to the `normalizeRawEvent()` pipeline: **CEO sign-off** |
| **P2 Attribute-only detail** | M1 + M4 + `observation` envelope + schema-events reconciliation | input steps with field meaning → ≥90%; generic titles 25.4% → <15% | No |
| **P3 Allowlisted text + outcome** | M2 + M3 + M8 | generic titles → <5%; submit outcome 0% → ≥70%; PII-in-title 1 → 0 | No |
| **P4 Shapes + choices + forms** | M5 + M6 + M7 | branch reason 0% → ≥50% on branching flows; fields with known provenance | `capture.ts` handlers (not the call site): harness required |
| **P5 Timing + hand-offs** | M9 + M10 | wait/work split coverage; re-keying edges per session | New listeners only: harness required |
| **P6 (conditional)** | M11 at-source URL templating; M12 value linking | raw-store full URLs → 0 | **Yes**: `emit`/`buildContext`. M12 also needs a DPIA |

---

## 11. CEO decisions requested

1. **Fix CDP-L1 now?** It makes a reviewer-facing claim untrue today, so it may be launch-relevant for the Chrome Web Store submission. Recommended: yes, as a Mode 2 directed fix with the real-extension harness.
2. **Adopt the allowlist-by-default text policy (§5)?** Some label coverage may drop at first; it is measured by the generic/empty-title rate.
3. **Approve the `observation` sub-object** as the single additive schema home.
4. **Approve phase order P1→P5.** P6 is held pending an explicit decision.
5. **Backlog intake.** Promote CDP-L1 (P0) to the live backlog per the Audit-Intake Pattern; hold CDP-L2/L3/L4 and M1–M12 in this artifact as the cold pool.
6. **Purge raw events after a normal Stop?** Confirm the September audit finding first.
7. **Commission a vendor-docs verification pass** before any competitive claim is used in marketing.

---

## 12. Governance

- Mode 3-adjacent: does not advance the improvement-loop or meta-review counters.
- Zero product code changed; zero CLAUDE.md changes.
- Backlog not yet modified, pending decision 5.
