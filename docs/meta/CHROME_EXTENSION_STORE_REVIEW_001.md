# CHROME_EXTENSION_STORE_REVIEW_001

**Type:** CEO-directed Mode 3-adjacent multi-agent review (NON-counting)
**Date:** 2026-06-18
**Subject:** `apps/extension-app/` (Ledgerium AI Recorder v2.0.0, Chrome MV3) — Chrome Web Store submission readiness + permission/function minimization
**Directive (CEO, verbatim):** *"Engage all subagents, create a google chrome store expert subagent... fully review and analyze the current chrome browser extension. I am going to be submitting the final extension to the chrome store for review. Make sure the extension doesn't have any permissions or functions that aren't needed to record and store the appropriate user event behavior data."*

**Agents engaged (8):** chrome-web-store-expert (new), extension-privacy-auditor (new), security-engineer (via general-purpose), qa-engineer, system-architect, competitive-researcher, product-manager, frontend-engineer.
**New persistent subagents created:** `.claude/agents/chrome-web-store-expert.md`, `.claude/agents/extension-privacy-auditor.md`.
**Constraint honored:** review/recommend only. ZERO source or manifest edits (Extension Reliability Invariant — `permissions`/`host_permissions`/`content_scripts` are forbidden-silent-change items; all changes require CEO approval + real-extension harness validation).

---

## 1. Headline Verdict

**NOT-READY for first-pass submission — but no deep rework required.** The capture architecture is sound, minimization-first, and the manifest contains no illegal permission and no remote code. Two **P0 code blockers** and a set of **non-code submission-form items** stand between the current build and a clean review. The permission set is *nearly* minimal — exactly **one declared permission (`tabs`) is removable**.

Direct answer to the CEO question — *"any permissions or functions not needed?"*:
- **Permissions: YES, one removable** — `tabs` is declared but unused (proven by exhaustive grep). Removable with zero behavior change **while `<all_urls>` is retained**. Removing it also drops the "Read your browsing history" install warning.
- **Functions: substantially minimal**, with 4 dead functions in `injection-manager.ts` and an over-broad `all_frames` capture default that can be narrowed.
- **Data: minor over-collection** — raw page titles and free-text DOM labels are transmitted without PII scrubbing (no values/keystrokes/screenshots are ever captured — those are correctly excluded at capture time).

---

## 2. Permission ↔ Usage Matrix (chrome-web-store-expert)

| Declared | Verdict | Evidence | Note |
|---|---|---|---|
| `storage` | **KEEP** | background/index.ts, session-store.ts, history-store.ts, IdleScreen/ProcessScreen | Core to session persistence + settings + API key. |
| `sidePanel` | **KEEP** | index.ts:525,530 + manifest `side_panel` | Entire UI lives in the side panel. |
| `scripting` | **KEEP** | injection-manager.ts:46 `executeScript` | Injects content script into already-open tabs. |
| `alarms` | **KEEP (P1 justify)** | index.ts:71-84 keepalive (`periodInMinutes: 0.4`) | SW liveness during recording. Reviewers may question; justify. |
| `tabs` | **REMOVE — candidate (P1)** | All `chrome.tabs.*` sites need NO `tabs` permission; only `tab.url` is read (index.ts:468/481/492/508, injection-manager.ts:75-78,125), and `<all_urls>` already grants that. No code reads `title`/`favIconUrl`/`pendingUrl`. | Removable while `<all_urls>` held. Drops "Read your browsing history" warning. **P0 capture-pipeline surface — CEO approval + real-extension test required.** |
| `host_permissions: <all_urls>` | **KEEP (P1 justify)** | Content-script target + `tab.url` reads + upload fetch | #1 scrutiny vector; cannot narrow without breaking "record any site". Needs single-purpose justification. |
| `content_scripts: <all_urls>` + `all_frames:true` | **KEEP scope / NARROW frames (P1)** | content/index.ts, capture.ts | See §5 — `all_frames` is over-broad and narrowable to top-frame. |

**Remote code / CSP / hygiene:** CLEAN. No `eval`/`new Function`/`importScripts`/remote `<script>`. No `web_accessible_resources`, no CSP override, no `externally_connectable`, no leftover `"key"`. HTTPS enforced on upload (uploader.ts:15). Icons + name + version valid. `incognito: not_allowed`.

---

## 3. Submission Blockers (ranked, cross-agent reconciled)

### P0 — WILL block / hard defects (fix before submit)
- **P0-1 Stored XSS in downloadable Workflow Report** *(security)* — `ProcessScreen.tsx:252-377` builds a full HTML document by string-concatenating captured third-party page content (step titles, labels, SOP text, activity name) with **zero HTML escaping**. A page the user records can plant `<img onerror=...>`/`<script>` in a label; it persists in history and executes whenever the report is downloaded/opened. **Fix:** `escapeHtml()` every interpolation (or build via `textContent`). Label PII heuristics are NOT an output encoder.
- **P0-2 API-key storage-area mismatch → silent auth failure** *(security Finding 3 + frontend P0-B — independent convergence)* — `ProcessScreen.openInWebsite` (`:390-445`) reads the API key from `chrome.storage.sync` (`ledgerium_settings.apiKey`), but the CHROME-002 migration moved the key to `chrome.storage.local`. Result: the primary Export/Sync CTA usually sends **no** key and silently falls back. Same path also **lacks the HTTPS guard** that `uploader.ts:15` enforces (API key could go over cleartext if `uploadUrl` is `http://`). **Fix:** read key from `storage.local`; enforce `https://`; validate `data.workflowId` before `chrome.tabs.create`.

### P0 (non-code) — required submission-form / listing items
- **P0-3 Live privacy-policy URL** + completed **Data Safety / "limited use"** disclosure covering browsing-activity + form-label capture. Hard requirement; rejection without it.
- **P0-4 Permission justification strings + single-purpose statement** in the form (drafts in §6/§7).

### P1 — likely reviewer friction / data + UX (fix before or with submission)
- **P1-1 Debug console spam shipped to prod** *(frontend P0-A + security P2 + privacy P2)* — six `[LDG-UI]` `console.log` calls in `ProcessScreen.tsx` (557,559,570,583,614,618) + full-URL logs in background (index.ts:245,481,508) and content (content/index.ts:29). Reviewers open DevTools; debug noise is a rejection signal and leaks URLs. **Fix:** gate behind a `DEBUG` flag / strip in prod build.
- **P1-2 Raw `page_title` captured + transmitted unscrubbed** *(privacy P1-1)* — `capture.ts:573` → `normalizer.ts:151` → bundle (`bundle-builder.ts:32`) → uploaded. Titles routinely embed emails/names (the codebase's own type comment: `"Inbox (3) – phil@mediafier.ai"`). **Fix:** scrub/truncate titles before they enter CanonicalEvent.
- **P1-3 Free-text label / neighbor-context PII gaps** *(privacy P1-2)* — `label-extractor.ts:124-152` + neighbor-context (breadcrumbs/table headers/nearby labels) capture arbitrary `innerText`; heuristics catch emails/digits but not names. Transmitted in bundle. **Fix:** prefer stable attrs (aria-label/data-testid); restrict neighbor text.
- **P1-4 `state_change_details` bypasses all PII heuristics** *(privacy P1-3)* — `state-observer.ts:156-162` emits raw 80-char `textContent` (toast/modal/error text e.g. "Payment failed for card ending 4242"). Stored locally (not transmitted today). **Fix:** route through `applySafetyHeuristics`.
- **P1-5 Background `onMessage` skips sender validation** *(security Finding 2)* — `index.ts:362` ignores `sender` for privileged messages (SETTINGS_UPDATED can overwrite API key; DELETE_HISTORY destroys data). Bounded today (no `externally_connectable`, content script doesn't relay `window.postMessage`), but asymmetric trust is a latent escalation. **Fix:** reject `sender.id !== runtime.id`; reject privileged actions where `sender.tab` is present.
- **P1-6 No in-extension data-use disclosure** *(frontend P1-D)* — Chrome user-data policy expects a disclosure within the extension surface, not just a URL. **Fix:** one sentence in the recording flow describing what is captured + that it stays local unless synced.
- **P1-7 No HTTPS enforcement on Sync-URL save** *(frontend P1-B)* — IdleScreen accepts `http://` sync URL. **Fix:** validate `https://` on save.
- **P1-8 `SessionTimer` counts during pause** *(frontend P1-C)* — `accumulatedRef` never updated on pause; elapsed time is wrong after resume. Minor but visible to reviewers who test pause.
- **P1-9 Recording-active banner gated on `meta !== null`** *(frontend P1-A)* — race can leave the body silent about active recording (Header badge still shows). Consent-transparency flag.

### P2 — polish (won't independently reject)
- React Flow `proOptions.hideAttribution:true` requires a **Pro license** *(product/frontend)* — confirm licensing or show attribution.
- `email`/`tel` inputs marked non-sensitive (values still never stored) — document decision *(privacy P2-4)*.
- Raw `context.url` (query+fragment) persisted locally *(privacy P2-5)*; redundant timing fields *(P2-6)*; two divergent `normalizeUrl` impls *(P2-8)*.
- `aria-label` missing on icon buttons; focus-ring `emerald-500/20` fails WCAG 1.4.11 3:1; raw-JSON `<pre>` dump in HistoryDetail; `window.confirm` for deletes *(frontend P2-A..E)*.
- No cancel affordance on Arming/Stopping spinner screens *(frontend P1-F)*.

---

## 4. Minimization / Architecture (system-architect)

- **`all_frames: true` is over-broad — narrow to top frame.** Capture engine is already frame-aware; the code itself documents an iframe "message flood" risk (capture.ts:86-89). Recommend `allFrames:false`. **(capture surface — CEO approval + real-ext test).**
- **Static + programmatic injection is partly redundant.** Background always calls `injectIntoTab()` before START_SESSION, so the programmatic path alone covers all cases. Dropping the static `content_scripts` declaration would align with the v2 "inject only while recording, active tab only" model and shrink blast radius. **(highest review-story value; capture surface — CEO approval + real-ext test).**
- **`@xyflow/react` bloat** — full graph library shipped to render a vertical step list (one component, `SidebarProcessMap.tsx`). No remote fetch (CSS bundled), so it's bloat not policy. Replaceable with CSS/flexbox. Product-gated.
- **Dead code — safe cleanup, no gate:** `injection-manager.ts` `ensureAllTabsInjected`, `onTabLoadDuringRecording`, `onTabActivatedDuringRecording` (+ its dead import at index.ts:1), `isTabConfirmed` — all exported/imported but never called. ~half the file.
- **SessionStore defensive machinery** looks over-built but each branch is bug-anchored (iter-028). Leave as-is for submission.

---

## 5. QA / Reliability Gate (qa-engineer)

- **Tests:** 227/227 pass (11 files); typecheck clean. Manifest `content_scripts` block intact (iter-097 regression NOT reintroduced). Extension `src` has zero uncommitted diffs.
- **Critical coverage GAP:** `content/capture.ts` (CaptureEngine), `background/index.ts` (message handlers incl. RAW_EVENT_CAPTURED), and `injection-manager.ts` have **zero unit tests** — the exact surfaces of the iter-097/099 regressions. `session-store.ts` + `live-steps.ts` are well covered.
- **Real-extension E2E gate is weak:** only 1 of 3 tests runs (idle/GET_STATE); the 2 capture-path tests are SKIPPED (Windows `chrome.tabs.query` flake). The passing test would NOT have caught iter-097/099.
- **MANDATORY before submit:** run the full manual checklist in a real Chrome profile (build → load unpacked → record on a real site → confirm `RAW_EVENT_CAPTURED` + non-null canonical events → multi-tab → stop → bundle non-empty → password-field redaction). Per Extension Reliability Invariant §6, log the manual evidence. **Verdict: CONDITIONALLY SHIP-READY pending manual capture certification.**

---

## 6. Draft Permission Justification Strings (for submission form)

- **storage:** "Stores the in-progress recording, captured event data, and the user's workspace settings/API key locally so a session survives service-worker restarts."
- **sidePanel:** "The recorder's entire UI (start/stop, review, export, upload) is presented in the side panel."
- **scripting:** "Injects the capture content script into tabs already open before recording started, so users need not reload every tab."
- **alarms:** "Keeps the background service worker alive during an active recording session so no user events are dropped."
- **host_permissions `<all_urls>`:** "The extension's single purpose is to let users record a workflow on any website they choose. Capturing clicks, navigation, and form-field labels requires access to whichever site the user is actively recording. No data is read from sites the user is not actively recording."

---

## 7. Single Purpose + Listing (product-manager)

- **Single-purpose: PASSES.** All 15 user functions chain to record → process on-device → review → export/sync. One flag: Process Map / SOP / Workflow Report could read as a "viewer inside a recorder" — answerable (gated to the just-recorded session; a standalone viewer was deliberately removed at iter-098). Pre-empt in the listing narrative.
- **Single-purpose statement (form):** *"Ledgerium AI Recorder captures your browser workflow — clicks, navigation, and form labels — and converts it into a structured process map, SOP, and exportable JSON that you can save locally or sync to your Ledgerium workspace."*
- **Description:** current copy undersells (omits process map / SOP / report / on-device processing). Recommended short + detailed copy + an accurate 2-category data disclosure drafted in agent output.
- **Listing soft issues:** confirm React Flow Pro license; version `2.0.0` implies prior published history — confirm; `incognito: not_allowed` is fine.

---

## 8. Competitive Benchmark (competitive-researcher)

- `<all_urls>` + content scripts is the **accepted, standard** posture for the recorder category (Scribe, Tango, Loom, UI.Vision). Broad scope is **defensible and necessary** — no reduction warranted; `activeTab` cannot do continuous cross-navigation capture.
- Ledgerium's 5-permission MV3 footprint is **leaner than Scribe's current surface** and far leaner than UI.Vision (14 perms, MV2). A narrow, accurate **2-category** data disclosure (vs Tango's 6) is an enterprise positioning asset.
- Broad host permissions trigger **extended review**, not auto-rejection, when single-purpose is clear and the listing proactively justifies access (model on Loom's published "must record anywhere" framing). Every future `manifest.json` change re-enters review (Jira Assistant precedent) — validates the Extension Reliability Invariant governance.
- Reinforces §2: audit whether `tabs` is needed alongside `<all_urls>` (it is not).

---

## 9. Recommended Action Plan (all code/manifest items require CEO approval + real-ext validation per Extension Reliability Invariant)

**Tier 1 — submission blockers (do first):**
1. P0-1 escape HTML in Workflow Report (security; no capture-surface risk).
2. P0-2 fix API-key storage area + HTTPS guard in `openInWebsite` (security/frontend).
3. P0-3 publish privacy policy URL + complete Data Safety / limited-use form.
4. P0-4 enter permission justification strings + single-purpose statement (§6/§7).
5. Run the mandatory manual capture-certification checklist (§5); log evidence.

**Tier 2 — strongly recommended (low risk, high review value):**
6. Remove `tabs` permission (manifest — CEO approval + real-ext test). Drops browsing-history warning, zero behavior change.
7. Strip/guard `[LDG-UI]` + URL console logs (P1-1).
8. Scrub page-title + tighten label/state PII (P1-2/3/4) — minimization the CEO asked for.
9. Add in-extension data-use disclosure sentence (P1-6); HTTPS guard on Sync-URL save (P1-7).
10. Delete dead `injection-manager.ts` exports (safe, no gate).

**Tier 3 — minimization / polish (post-submit or with Tier 2):**
11. Narrow `all_frames` → top frame; collapse to single injection mechanism (capture surface — real-ext test).
12. Background sender validation (P1-5); SessionTimer pause fix (P1-8); recording-banner race (P1-9).
13. Replace `@xyflow/react`; resolve React Flow Pro license; a11y polish (P2 cluster).

---

## 10. Cross-Agent Convergence Notes
- **`tabs` removable** — independently reached by chrome-web-store-expert (grep proof) and competitive-researcher (MV3 host-permission doctrine). HIGH confidence.
- **API-key storage mismatch (P0-2)** — independently surfaced by security (Finding 3) and frontend (P0-B). HIGH confidence; this is a real functional defect on the primary CTA.
- **Console debug spam** — flagged by frontend, security, and privacy. HIGH confidence.
- **No P0 disagreements.** Privacy/architecture findings are additive (minimization), not contradictory.

---

*This is a Mode 3-adjacent diagnostic. No iteration counter incremented. No product code or manifest modified. Two new persistent subagent definitions added under `.claude/agents/`. All capture-surface recommendations are gated on CEO approval + real-extension harness validation per the Extension Reliability Invariant.*
