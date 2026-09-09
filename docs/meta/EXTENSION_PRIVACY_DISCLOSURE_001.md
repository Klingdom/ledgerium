# EXTENSION_PRIVACY_DISCLOSURE_001

**Auditor:** extension-privacy-auditor
**Date:** 2026-09-09
**Subject:** `apps/extension-app/` (Ledgerium AI Recorder v2.0.0, Chrome MV3) — data-usage disclosure verification for Chrome Web Store submission
**Method:** Direct code read only. No files modified (Extension Reliability Invariant honored — this is an audit, not a change).
**Cross-referenced prior artifacts (read, not authored by this audit):** `docs/meta/CHROME_EXTENSION_STORE_REVIEW_001.md` (2026-06-18), `docs/meta/FUNNEL_AND_SOP_REVIEW_001.md` (2026-07-19, findings F-0/F-1/F-2). Where this audit's direct code read differs from those artifacts' dated findings, the current code (2026-09-09, `main`) is authoritative and is called out explicitly.

Labeling convention: **VERIFIED** = read the exact code path cited. **REASONED** = inferred from verified code but not itself independently executed/traced end-to-end.

---

## 0. Headline answer

**The public claim "It does not capture screenshots, screen content, or keystrokes" is TRUE for screenshots and keystrokes without qualification, and FALSE-AS-LITERALLY-WORDED for "screen content."** No screenshot API is ever called (VERIFIED — no `chrome.tabs.captureVisibleTab`, no canvas/DOM-serialization capture anywhere in the codebase). No keystroke or typed-value content is ever transmitted or persisted for ANY input field, sensitive or not — only a `value_present: boolean` (VERIFIED, capture.ts). But the extension does read and transmit **incidental page content**: the visible text of the specific element a user interacts with (button/link text, and — for generic `<div>`/`<span>` click targets — up to 40 characters / 5 words of that element's own visible text), plus the page's `document.title`. That is "screen content" by ordinary meaning, filtered only by pattern-based PII heuristics (email/URL/phone/SSN/CC-shape/word-count), not by a rule that scopes it to "structural labels only."

---

## 1. Exact inventory of captured fields, event by event

All capture originates in `apps/extension-app/src/content/capture.ts`, class `CaptureEngine`. Nothing is captured until `startCapture()` is explicitly called by a `START_SESSION` message from the background service worker (VERIFIED, capture.ts:63-105); the content script itself attaches zero DOM listeners at load time (VERIFIED, content/index.ts:1-74 — only registers a `chrome.runtime.onMessage` listener).

Every emitted event (`emit()`, capture.ts:579-600) carries a common envelope: `raw_event_id`, `session_id`, `t_ms`, `t_wall`, `schema_version`, plus `context: buildContext()` (capture.ts:557-577) and `timing`. `buildContext()` VERIFIED to include:
- `context.url` = **raw, un-sanitized `location.href`** (query string + hash fragment included), on **every single event of every type** (capture.ts:558, 572).
- `context.urlNormalized` = `normalizeUrl(url)` — strips only a fixed blocklist of tracking/credential-shaped query keys (`shared/utils.ts:12-34`: `utm_*`, `fbclid`, `gclid`, `_ga`, `ref`, `source`, plus a regex for `token|api[_-]?key|secret|password|...`). Any *other* query parameter (e.g. `?customerId=...`, `?q=jane+doe`, `?ssn=...` under a non-matching key name) is **not stripped** and survives verbatim here.
- `context.pageTitle` = `getSafePageTitle()` (screened — see section 3).
- `context.application` = `{label, domain, routeTemplate}` — derived, non-content.

Per-event-type fields (all in capture.ts):

- `page_loaded` / `spa_route_changed`: `url` (query+hash stripped via local `sanitizedUrl`), `url_normalized` = `normalizeUrl(url)` called on the **original, un-stripped** `url` parameter (not `sanitizedUrl`) — see section 2 gap; `page_title` (screened). Cite: capture.ts:228-244, 205, 214, 218.
- `click` / `dblclick` / `context_menu`: `url`/`url_normalized` (both fully stripped via `sanitizeUrl()`), `page_title` (screened), `target_selector`, `target_label`, `target_role`, `target_element_type`, `is_sensitive_target: false`, `target:` full `RawEventTarget`. Cite: capture.ts:246-295, 467-486.
- `input_changed` (change/blur/debounced-input/contenteditable): non-sensitive path sends `target_selector`, `target_label`, `target_role`, `target_element_type`, `value_present: boolean` (never the value). Sensitive path sends only `target_element_type` + `privacy.valueRedacted: true` — no label/selector at all. Cite: capture.ts:297-365, 494-532.
- `form_submitted`: `url` (form action or `location.href`, stripped), `url_normalized` computed on the un-stripped url variable (section 2 gap), `page_title`. Cite: capture.ts:367-385.
- `keyboard_intent`: only for `Enter`/`Escape`/`Tab` (VERIFIED, `INTENT_KEYS`, capture.ts:25-30) — `keyboard_key` (one of these 3 key names only, never arbitrary keys), `keyboard_intent`, optional target label/selector. Cite: capture.ts:24-30, 387-415.
- `drag_started` / `drag_completed`: `drag_source_selector`, `target`/`target_label`, `drag_target_selector`. Cite: capture.ts:417-463.
- `window_blurred`/`window_focused`/`visibility_changed`: no content, timing/state only. Cite: capture.ts:183-202.
- `modal_opened`/`modal_closed`/`toast_shown`/`loading_started`/`loading_finished`/`error_displayed`/`status_changed`/`dropdown_opened`/`dropdown_closed`: `state_change_details` = up to 80 chars of the modal/toast/alert node's `aria-label` or `textContent`, screened (section 3). Cite: state-observer.ts:44-46,199-205; capture.ts:94-101.

**Target metadata** (`inspectTarget()`, target-inspector.ts:139-151, called for every click/dblclick/input/drag/context-menu/keyboard event): `selector` (attribute-based, e.g. `[data-testid="..."]`, `#id`, or a 2-level ancestor tag chain — never a full CSS path from body), `selectorFingerprint` (djb2 hash, non-reversible), `label` (see section 2), `role`, `elementType`, `interactionType` (enum), `ancestorPath` (tag/role names only, max 4 levels — no text). None of these carry values.

**Not wired into production** (VERIFIED by grep — `extractLabelWithContext`/`extractNeighborContext` have zero call sites outside their own file and `label-extractor.ts`'s unused export): `neighbor-context-extractor.ts`'s modal-title/table-header/breadcrumb/active-tab/nearby-label extraction exists in the tree for a future intent-inference feature but is dead code today. It does not currently reach any captured event.

**Recorder-authored field (distinct from page content):** `activityName` — free text the *recording user* types into the extension's own Start-Recording UI to name their session (e.g. "Process invoice for Acme Corp"). This is stored/exported/uploaded verbatim (`SessionMeta.activityName`, shared/types.ts:14) via `header.activityName`/`executiveSummary.title` in the workflow report (workflow-report-builder.ts:343,357,367). This is user-authored metadata about their own recording, not data scraped from the target website — flagged for completeness since it is technically typed text that leaves the device on upload.

---

## 2. Does page CONTENT or a user-typed VALUE get captured?

**Typed VALUES: NO, verified, unconditionally, for every input path.** `captureInputChange` (capture.ts:297-333), `captureDebouncedInput` (capture.ts:494-532), and `captureContentEditableBlur` (capture.ts:335-365) each compute only a **boolean** — `Boolean(el.value)` or `Boolean(el.textContent?.trim())` — never the string itself. This applies to every text/textarea/select/contenteditable field, regardless of whether the field is classified sensitive. There is no code path anywhere in capture.ts that reads `.value` or `.textContent` and forwards the string. **Confirmed the claim on values holds.**

**LABELS vs VALUES — the actual distinction, verified:** `label-extractor.ts`'s `extractLabel()` is a 10-rule priority chain called on every interacted-with element (via `inspectTarget()`), independent of whether that element is a form field:
1. `aria-label` (label-extractor.ts:73-78)
2. `aria-labelledby` resolved (81-89)
3. `<label for=id>` resolved (91-100)
4. `placeholder` attribute (102-107)
5. `title` attribute (109-114)
6. `data-testid`, humanized (116-122)
7. `innerText` for `<button>`/`<a>` (124-132)
8. `innerText` for elements with `role="button"|"tab"|"menuitem"|"option"|"link"` (134-143)
9. **`innerText` of ANY `<div>`/`<span>` up to 40 chars / 5 words** (145-152) — the broadest rule; applies to arbitrary click targets, not just semantic controls. A table cell rendered as a `<span>` showing an order number, customer name, or line-item description that happens to be short and simple would qualify.
10. Nearest-ancestor `aria-label` or heading text, up to 4 ancestor levels (154-171)
11. Form `<legend>`/`<fieldset>` label (173-184)

Every candidate passes through `applySafetyHeuristics()` (label-extractor.ts:57-68), which rejects: exact-match email, URL-prefixed strings, 5+ consecutive digits, US phone-shaped strings, SSN-shaped strings, 16-digit-grouped CC-shaped strings, 12+-word strings; truncates to 80 chars. It does **not** reject names, addresses, dollar amounts, order/reference numbers under 5 digits, or any free text that doesn't match one of those 6 shapes. So a clicked `<span>Jane Doe -- Invoice #4821</span>` (4-digit reference, no email/URL/phone/SSN/CC shape, 4 words) passes through unmodified and becomes `target_label`, which IS stored in the canonical event and uploaded bundle (`page_context`/`target_summary.label` survive normalization — normalizer.ts:166-172, bundle-builder.ts:37-41).

**Named leak paths for the specific vectors requested:**
- **aria-label**: yes, used directly as label source (rule 1); screened only by the 6-pattern heuristic above.
- **placeholder**: yes (rule 4); same screening.
- **title attribute**: yes (rule 5); same screening.
- **innerText of a label-like element containing data**: yes — rules 7/8/9/10 read visible text of buttons, ARIA-role elements, generic divs/spans, and nearby headings/ancestor labels. This is the primary content-capture vector.
- **URL query strings containing PII**: `context.url` on every event carries the raw, un-stripped `location.href` including query string and hash (capture.ts:558,572) — VERIFIED. Additionally, `url_normalized` on `page_loaded`/`spa_route_changed`/`form_submitted` is computed via `normalizeUrl(url)` on the original, un-sanitized URL parameter rather than the already-stripped `sanitizedUrl` local variable (capture.ts:214,218,241,382) — a second, narrower instance of the same class of leak, since `normalizeUrl` only strips a fixed tracking/credential key blocklist (shared/utils.ts:12-18), not arbitrary query params. **Important scope limiter, also verified:** neither of these fields is read by the background normalizer when building the persisted/uploaded `CanonicalEvent` — normalizer.ts:135-155 recomputes `page_context.url`/`urlNormalized` from the RawEvent's flat `url` field (which for every event type is already query/hash-stripped by the content script's `sanitizeUrl()`/inline `u.search=''`), not from `raw.context.url` or `raw.url_normalized`. So this leak is **confined to the raw-event object that only ever lives in local chrome.storage.local** (see section 4) — it does not reach the canonical event, the bundle, the export, or the upload. It is still a real over-collection finding: the extension computes and locally stores full query-string content it does not need and never uses.
- **Contenteditable body text** (e.g. Gmail compose): explicitly excluded — only `value_present: boolean` (capture.ts:362).

---

## 3. Redaction / sensitivity layer -- what it catches, what it demonstrably misses

Two independent layers, both VERIFIED:

**(a) Field-level sensitivity gate** -- `isSensitiveTarget()` (target-inspector.ts:21-43) + `classifySensitivity()` (packages/policy-engine/src/sensitivity.ts:45-95), re-checked a second time server-side by the background normalizer (normalizer.ts:15-23).
- Catches (blocks selector/label/value-presence entirely, emits presence-only or a `system.redaction_applied` transparency event): `type="password"`, `type="hidden"`, `autocomplete` containing "password"; and -- via selector/id/name/testid/aria-label pattern match -- `password|passwd|secret|token|api[_-]?key|credit[\s_-]*card|card[_-]?number|cvv|ssn|social[_-]?security|tax[_-]?id`.
- **Demonstrable miss #1:** a field's *name/id* is the only signal used -- the field's actual *content* is never inspected. A generically-named credit-card input (e.g. `<input name="f14" placeholder="16 digits">`) is not flagged sensitive. Consequence, verified: it is not redacted at the metadata level (its label/selector are sent, e.g. `target_label: "16 digits"`) -- but its *value* was never going to be sent regardless (section 2), so no card number leaks; only the fact that such a field exists and was filled (`value_present: true`) does.
- **Demonstrable miss #2:** `email`/`tel` input types are explicitly classified `isSensitive: false` (sensitivity.ts:89-92) -- labels/selectors for email and phone fields ARE captured (values are not, per the universal rule in section 2). Note also the exported constant `SENSITIVE_INPUT_TYPES` (sensitivity.ts:13-20) lists `email`/`tel`/`ssn`/`credit-card` as if they were blocking types, but this constant is dead code -- it is referenced only by its own unit test, not by `classifySensitivity()` or `isSensitiveTarget()`. This is a naming/intent inconsistency worth flagging for hygiene, not a live leak (since values are excluded regardless).
- **Demonstrable miss #3:** the classifier only runs on form elements the user interacts with. It has no bearing on the label-extraction path for arbitrary click targets (section 2) -- a page displaying a masked card number as static text ("Card ending 4242") next to a clickable element would not trigger this gate at all; it is subject only to the free-text heuristics below, and "4242" (4 digits) is below the 5-digit `LONG_DIGITS_RE` threshold, so it passes.

**(b) Free-text screening** for page titles and state-change (modal/toast/error) text -- free-text-screen.ts:56-61, consumed by safe-page-title.ts:35-45 and state-observer.ts:44-46,199-205. Adds *unanchored* (embedded-mid-string) email and URL detection on top of the same `applySafetyHeuristics` pattern set (long-digit-run 5+, phone, SSN, 16-digit grouped CC, 12+-word cap, 80-char truncation).
- **Concrete inputs that slip through both layers** (VERIFIED against the exact regexes): a person's full name ("Sarah Connor"), a company name, a street address without a 5+ digit ZIP+4 run, a dollar amount ("$4,250.00" -- commas/periods break the digit-run regex), an order/ticket ID under 5 digits, a masked card's last-4 digits, a 4-digit PIN, a 9-digit routing/account number formatted with spaces or hyphens that don't match the SSN or CC group shapes, any non-US phone number format, or free text in a non-Latin script (heuristics are pure regex, no NER, no locale awareness).

**(c) URL path screening** (`deriveRouteTemplate`, packages/normalization-engine/src/url-normalizer.ts:200-227) parameterizes integers/UUIDs/hex IDs (`:id`) and hyphenated compound slugs (`:slug`), and -- a documented, deliberate addition -- replaces the segment immediately following a fixed list of "person collection" nouns (`patients`, `users`, `customers`, `clients`, etc.) with `:id` regardless of shape, to close the single-token-name case (url-normalizer.ts:143-227). The code's own docstring (lines 121-131) states the residual, accepted gap: a single-token slug under a *non-person* collection noun (e.g. `/companies/acmecorp`, `/orders/smith`) is structurally indistinguishable from a static route word and is not parameterized -- it survives verbatim in both `page_context.url` and `routeTemplate`, which are persisted and uploaded. This is F-1 from FUNNEL_AND_SOP_REVIEW_001.md, partially remediated (compound and person-collection cases now closed) with the single-token general case explicitly left open by design choice, not oversight.

**(d) Fields that ARE screened at capture time and reach storage/transmission, resolving two 2026-07-19 findings that this audit's direct code read shows as now closed:**
- F-0 (`document.title` captured raw) -- **closed**: `getSafePageTitle()`/`screenPageTitle()` (safe-page-title.ts) is called at every emission site (VERIFIED, capture.ts imports and calls it 8 times) and is what reaches `page_context.pageTitle`.
- F-2 (`state-observer` `nodeLabel()` returned raw, unscreened `textContent`) -- **closed**: `nodeLabel()` now calls `screenStateLabel()` -> `screenFreeText()` (state-observer.ts:44-46,199-205). Also independently confirmed harmless regardless, per section 4: this field never reaches the canonical event (dropped by the normalizer, never referenced).

---

## 4. Storage -- what persists, where, how long, encrypted?, cleared how

All persistence is `chrome.storage.local` (unencrypted at the JS API level -- Chrome's own disk-level encryption-at-rest, if any, is OS/profile-dependent and outside the extension's control), `chrome.storage.sync`, and `chrome.storage.session`, all VERIFIED:

- **`ledgerium_active_session`** -- `SessionMeta` (session id, activityName, timestamps, `persistenceTruncated` flag). Scope: local. Cleared by: `store.clear()` -- only called on explicit Discard (background/index.ts:341).
- **`ledgerium_active_session_events_<sessionId>`** -- full `rawEvents[]` (incl. the raw-URL/query-string content from section 2), `canonicalEvents[]`, `policyLog[]`, `liveSteps[]`. Scope: local. Cleared by: `store.clear()` on Discard; also GC'd by `gcOrphanedEventBlobs()` (session-store.ts:368-402) -- **but this GC only runs inside `loadFromStorage()`, which is only invoked from `restoreStateIfNeeded()` when `chrome.storage.session` reports a recording was in-flight at last SW kill (background/index.ts:107-142).** A normal Stop-to-completion flow calls `clearPersistedState()` (removes the session-flag, not the events blob) and never calls `store.clear()`. **Finding: after a normal (non-discarded) recording completes, this per-session raw-events blob -- including the un-stripped-URL content -- is never deleted and has no code path that ever removes it, other than the orphan-GC firing on a later SW restart during a different in-flight session.** REASONED from the verified control flow; not independently reproduced in a live browser this session per the no-modification constraint.
- **`ledgerium_bundle_<sessionId>`** (max 25, `MAX_HISTORY_ENTRIES`) -- full canonical `SessionBundle` (normalized events, derived steps, policy log, manifest) -- **not raw events**. Scope: local. Cleared by: `deleteEntry()` on user delete from history; oldest evicted on the 26th save (history-store.ts:14-41).
- **`ledgerium_history_index`** -- lightweight index (sessionId, activityName, counts, timestamps). Scope: local. Cleared: same as above.
- **`ledgerium_settings`** -- `{uploadUrl, allowedDomains, blockedDomains}` -- API key explicitly excluded per a documented one-time migration (CHROME-002, background/index.ts:32-64). Scope: **sync** (syncs across the user's signed-in Chrome profiles). Cleared by: overwritten on Settings save.
- **`ledgerium_apikey`** -- the user's Ledgerium web-app API key, entered manually in the extension's Idle/Settings screen. Scope: **local only** (deliberately moved out of sync storage). Cleared by: overwritten on Settings save; no explicit delete path found.
- **`ledgerium_sw_state`** (chrome.storage.session) -- `{recording, sessionId, activityName}` -- survives only the browser session, cleared on browser close by Chrome itself. Cleared by: `clearPersistedState()` on stop/discard.

**Quota handling:** on a `chrome.storage.local` write error (treated as quota-exceeded), the store sets `persistenceTruncated: true` on the session meta and stops writing further events -- it does not delete old data to make room (session-store.ts:325-355, documented as an explicit append-stop policy to avoid corrupting the audit trail).

No client-side encryption of any of the above is implemented in this extension's code (REASONED -- no `crypto.subtle.encrypt`/similar call sites found in any storage write path read during this audit).

---

## 5. Transmission -- what leaves the browser, where, when, is it optional?

**Genuinely optional, VERIFIED.** Upload only fires in `handleStop()` (background/index.ts:313-328) `if (uploadUrl)`, where `uploadUrl` traces back to `settings.uploadUrl`, which defaults to the empty string (background/index.ts:22) and is only ever set by the user manually typing a Sync URL into the extension's Settings screen and clicking Save (sidepanel/screens/IdleScreen.tsx:93-97, sends `SETTINGS_UPDATED`). **With default settings, zero network requests are ever made by this extension** (REASONED from the verified `if (uploadUrl)` guard combined with the verified empty default; no other fetch/XHR call site exists in the codebase outside uploader.ts).

**What is sent, when configured:** the entire `SessionBundle` -- `sessionJson` (session meta incl. `activityName`), `normalizedEvents[]` (canonical events: screened page titles, route templates, target labels/selectors, no values), `derivedSteps[]`, `policyLog[]`, `manifest` -- as one JSON POST body to the user-configured `uploadUrl` (uploader.ts:8-65). **Raw events are never included in the bundle type** (`SessionBundle` interface, shared/types.ts:284-290) and are never uploaded.

**Transport:** HTTPS is enforced and verified for the primary upload path -- uploader.ts:15: `if (!uploadUrl || !uploadUrl.startsWith('https://')) return {success:false, error:'Upload URL must use HTTPS'}`. **Auth:** if an API key is configured, it is sent as `Authorization: Bearer <key>` (uploader.ts:32-33) over that same HTTPS connection -- the key itself is never logged (no console statement references `apiKey` in the files read).

**Cross-referenced, not independently re-verified this session (flag for the CEO):** the prior `CHROME_EXTENSION_STORE_REVIEW_001.md` (P0-2) reports a different code path -- `ProcessScreen.openInWebsite` -- reads the API key from `chrome.storage.sync` (the legacy pre-CHROME-002 location) rather than `chrome.storage.local`, and lacks the HTTPS guard uploader.ts has. This audit did not read sidepanel/screens/ProcessScreen.tsx; if that finding is still open, a second, less-guarded transmission path may exist for the "Open in Ledgerium web app" action, potentially sending the API key without HTTPS enforcement. **Recommend confirming this is fixed before relying on this audit's "HTTPS is enforced" statement as covering every export path** -- it is verified only for uploader.ts's automatic-upload-on-stop path.

---

## 6. Least-data assessment

**Does it capture on pages where recording is not active?** No -- VERIFIED. The content script is injected everywhere by manifest (`content_scripts` matches `<all_urls>`, `all_frames: true`, `run_at: document_idle`) plus a redundant programmatic `chrome.scripting.executeScript()` path for already-open tabs (injection-manager.ts) -- but index.ts's only top-level action is registering a message listener; `CaptureEngine.attachDOMListeners()` is never called until an explicit `START_SESSION` message arrives, which the background only sends to the single tab the user is actively viewing while a session is in `recording` state (background/index.ts:228-246, 462-509). So the script is *present* on every page (necessary so it can be told to start the instant the user switches to or navigates within the tab being recorded -- a legitimate architectural need for `<all_urls>`, not over-collection), but it reads/emits nothing outside an active recording session on the active tab.

**Over-collection identified against the stated purpose ("record and store user event behavior data" for SOP reconstruction):**
1. `context.url` (raw, un-stripped `location.href` including query string + hash) attached to every event -- not needed for SOP reconstruction, which uses `page_context.url`/`routeTemplate`/`domain` built separately by the normalizer from the already-sanitized flat `url` field. This raw field is dead weight that is computed, transmitted over the extension's internal message bus, and persisted to local storage, but never read by any consumer in production code (only by tests). Recommend: drop `context.url`'s raw form, or sanitize it at the same point the flat `url` field is sanitized.
2. `url_normalized` on navigation/form-submit RawEvents computed from the un-sanitized URL variable rather than the local sanitized one (section 2) -- same category, smaller surface, same recommendation.
3. `state_change_details` (screened modal/toast/error text) is computed and persisted to local raw storage but is never read by the normalizer/canonical event -- it is captured for no purpose currently connected to a consumer. Not a transmission risk today (confirmed dead in the pipeline), but it is still captured-and-stored data with no current use, which is itself a minimization gap independent of transmission risk.
4. `SENSITIVE_INPUT_TYPES` dead constant (section 3) suggests intended-but-unimplemented stricter handling for email/tel -- a design-vs-implementation gap worth resolving explicitly rather than leaving it to drift.
5. Rule 9 of `extractLabel()` (any `<div>`/`<span>` innerText <=40 chars/5 words) is the broadest and least justified rule in the label chain relative to the stated purpose -- rules 1-8 are all attribute- or role-scoped to something semantically resembling a control's *name*; rule 9 has no such scoping and is the primary vector by which arbitrary short page text (names, prices, reference numbers) becomes a captured, uploaded field. **This is the single highest-leverage recommendation in this audit** if the CEO wants the "no screen content" claim to become literally true rather than mostly true.

Everything else in the inventory (selectors, roles, element types, timing, route templates, domains, application labels, ancestor tag paths, click/keyboard/drag counts) is structurally necessary for step segmentation and SOP reconstruction and is not over-collection.

---

## 7. Chrome Web Store Data Safety disclosure -- category by category (primary deliverable)

**Personally identifiable information (name, address, email, phone, etc.):** YES -- limited, incidental. Not deliberately targeted; occurs via (a) element-label extraction reading visible button/link/div/span text and placeholder/title/aria-label attributes with only pattern-based (not identity-aware) filtering (label-extractor.ts, sections 2/3); (b) the user's own free-typed `activityName` for the recording; (c) residual single-token name-shaped URL path segments outside the person-collection-noun list (section 3c). Email/phone-typed *values* are never captured (only presence boolean + the field's own label, which is not itself PII unless the site labels the field with a real name). Evidence: capture.ts, label-extractor.ts, url-normalizer.ts.

**Health information:** No deliberate capture; the same general-purpose text-extraction paths above could incidentally surface health-context text if a user records a healthcare site and clicks/hovers an element whose short visible text names a condition/patient -- no health-specific targeting or exclusion exists either way. Evidence: same general paths as PII, above (not health-specific).

**Financial and payment information:** NO deliberate capture of values. Field-level redaction blocks selector/label capture for name/id/testid/aria-label patterns matching `credit[\s_-]*card`, `card[_-]?number`, `cvv` (sensitivity.ts:22-34,71-77) -- but classification is name-based, not content-based, so a generically-named payment field is not flagged (miss, section 3). In all cases, no code path ever transmits a typed value for any field, sensitive or not, so no card/account number is ever captured regardless. Evidence: sensitivity.ts, capture.ts:297-333.

**Authentication information (passwords, credentials):** NO capture of website passwords -- `type="password"`, `type="hidden"`, and `autocomplete*=password` are hard-excluded before any label/selector is computed (target-inspector.ts:25-28). The extension does store the user's own Ledgerium API key (an authentication credential for the extension's own upload feature, not scraped from any website) locally in chrome.storage.local and transmits it as a Bearer token over HTTPS to the user-configured upload endpoint only when upload is enabled. Evidence: target-inspector.ts, uploader.ts, background/index.ts.

**Personal communications (emails, texts, chat):** NO -- contenteditable body text (e.g. email/chat compose bodies) is captured only as a boolean presence flag, never the text itself (capture.ts:335-365). Toast/modal/error text is captured locally only and never leaves the raw-event object (sections 3d, 4) -- it does not reach the transmitted bundle. Evidence: capture.ts:362, state-observer.ts.

**Location:** NO -- no geolocation API, no IP-based location, no code path referencing `navigator.geolocation` or similar in any file read. Evidence: absence verified across all files read.

**Web history:** YES, scoped. The extension by design captures visited URLs/domains/route-templates/page-titles -- but only for pages visited while a recording session is active, only on the tab the user chose to record, and with URLs screened to origin + parameterized-route-template (not full path/query) before storage/upload. This is not passive/background browsing-history collection; it is scoped to the user-initiated recording window. Evidence: capture.ts, normalizer.ts:150-164.

**User activity (clicks, scroll, taps):** YES -- this is the core, stated purpose. Clicks, double-clicks, drags, context-menu opens, form submissions, keyboard-intent (Enter/Escape/Tab only), focus-out, window focus/blur/visibility, and derived DOM state changes (modal/toast/loading/error/dropdown open-close). Evidence: capture.ts (entire file).

**Website content (page text, images, videos):** YES -- narrow, not full-page. No screenshots, no DOM snapshots, no page-text scraping. What IS captured: (a) the visible text label of the specific element the user clicked/interacted with, when that text is a button/link, an ARIA-role control, or any short (<=40 char/<=5 word) div/span text (label-extractor.ts rules 7-9); (b) the page's `document.title`, PII-screened. Both are filtered only by pattern-based heuristics (email/URL/phone/SSN/CC-shape/word-count), not scoped to "structural label only." **This is the category where the "no screen content" claim needs qualification** -- see section 8. Evidence: label-extractor.ts, safe-page-title.ts.

**Not applicable / not collected under any category:** screenshots, screen recordings, keystroke logs, full DOM content, form field values of any kind, audio/video/camera/microphone access (no such permission is declared or used).

---

## 8. Gap between the public privacy claim and reality -- stated plainly

The claim: *"Ledgerium captures structured browser interaction events: clicks, navigation, form interactions, and the timing of each step. It does not capture screenshots, screen content, or keystrokes."* (apps/web-app/src/app/(public)/methodology/page.tsx:39)

- **"Does not capture screenshots"** -- TRUE, unqualified. No screenshot/screen-recording API is used anywhere.
- **"Does not capture keystrokes"** -- TRUE, unqualified. No keystroke is ever read; the only keys read at all are Enter/Escape/Tab as intent signals (not content), and no field's typed value is ever read or sent, screened or not.
- **"Does not capture screen content"** -- **NOT literally true.** The extension reads and -- subject only to generic PII-pattern filtering -- transmits the visible text of the element a user clicks (including arbitrary short div/span text, not just semantic button/link labels) and the page title. That is screen content in the ordinary sense of the phrase, even though it is a narrow slice of it (one element's label per interaction, not the page body) and even though the stated intent of that capture is clearly "describe which button/field was used," not "read the page." A careful reader could argue "form interactions" implicitly covers "the label of the form field," but the claim's own contrast -- screenshots/screen-content/keystrokes as the excluded category -- reads most naturally as "we don't see what's on your screen," which is not accurate for the specific, bounded case of interacted-element text and page titles.

**Recommendation for the Chrome Web Store submission and the public claim, in order of what most directly closes the gap:**
1. In the Data Safety form, answer "Website content" = collected, scoped exactly as described in section 7 (element labels of interacted elements + page titles, PII-filtered, no full-page/DOM/screenshot capture) -- do not answer "not collected" for this category.
2. Either (a) narrow the public claim to something defensible as written today -- e.g. *"...the timing of each step, and short text labels identifying which button, link, or field was used. It does not capture screenshots, full page content, form values, or keystrokes."* -- or (b) tighten `extractLabel()` rule 9 (and reconsider rules 7/8's applicability to arbitrary page text) so the claim becomes literally true. Recommendation (a) is the faster, honest path for an imminent submission; (b) is the correct longer-term fix and is flagged in section 6 item 5.
3. Independently confirm/close the `ProcessScreen.openInWebsite` API-key-storage-location and HTTPS-guard finding from the prior Chrome Store review (section 5) before finalizing the "transmission is HTTPS-only" disclosure line, since this audit verified HTTPS enforcement only for the automatic upload-on-stop path.

All other elements of the claim and of the extension's architecture (no values, no screenshots, no keystrokes, upload opt-in, local-first storage, deliberate sensitive-field exclusion) are verified accurate and are meaningfully more privacy-protective than a typical recorder extension in this category.
