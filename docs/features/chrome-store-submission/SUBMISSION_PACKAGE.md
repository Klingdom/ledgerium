# Chrome Web Store Submission Package — Ledgerium AI Recorder v2.0.0

**Produced:** 2026-06-18 (Iteration 4 of the Chrome Web Store Submission Hardening program)
**Source review:** `docs/meta/CHROME_EXTENSION_STORE_REVIEW_001.md`
**Status:** Listing/form content READY. Permission set post-fix: `storage, sidePanel, alarms, scripting` + `host_permissions: <all_urls>` (`tabs` removed in iter 3).
**Honesty note:** Page titles + free-text DOM labels are NOT yet PII-scrubbed (review P1-2/P1-3, deferred). All copy below discloses this accurately. Do not claim scrubbing.

---

## 1. Single-Purpose Statement (form field)

> Ledgerium AI Recorder captures your browser workflow — clicks, navigation, and form-field labels — and converts it on-device into a structured process map, SOP, and exportable record that you can save locally or sync to your Ledgerium workspace.

**Viewer-objection pre-empt (paste near top of detailed description / reviewer narrative):**
> Every screen inside the extension — the process map, SOP view, and workflow report — displays only the session just recorded in the same browser session; there is no standalone viewer, library browser, or analytics dashboard. The review screens are confirmation steps within the record-and-export flow, not a separate product. A standalone history viewer was deliberately removed (iter 098) to preserve single-purpose compliance.

---

## 2. Permission Justification Strings (form fields)

| Permission | Justification (enter verbatim) |
|---|---|
| `storage` | Stores the in-progress recording session, captured event data, and the user's workspace settings/API key in local device storage so a session survives service-worker restarts and configuration persists between browser sessions. |
| `sidePanel` | The extension's entire UI — start/stop, review the process map and SOP, export or sync — is rendered in the Chrome side panel. No popup or new tab is opened for the primary flow. |
| `scripting` | Injects the capture content script into tabs already open before recording started, so the user need not reload every open tab before recording across them. |
| `alarms` | Fires a keepalive alarm (~24s) to prevent the MV3 background service worker from being suspended during an active recording session, so user interaction events are not dropped mid-session. |
| `host_permissions: <all_urls>` | The single purpose is to record workflows on any website the user chooses. Workflows routinely span multiple domains (e.g., copying between a CRM and a spreadsheet), so access cannot be a fixed origin list. No data is read, stored, or transmitted from any site the user is not actively recording; collection requires an explicit Start action. |
| Remote code | None. No `eval`, `new Function`, `importScripts`, or remotely-loaded scripts. All logic is bundled at build time. |
| `all_frames: true` (content-script scope) | The content script runs in all frames so interactions inside embedded iframes (e.g., a form/widget inside the recorded page) are captured as part of the same workflow. *(If `all_frames` is later narrowed to top-frame per review §9 Tier 3, update/remove this string.)* |

---

## 3. Data Safety / Privacy Practices Form Mapping

**Principle:** disclose every category where data is collected (captured, stored locally, or transmitted), even incidentally; transmission = explicit user sync over HTTPS only. **4 categories disclosed** (narrower than competitors' typical 6).

| Chrome category | Collected? | Notes |
|---|---|---|
| **Personally Identifiable Info** | **YES (incidental)** | Via page titles (e.g. `"Inbox (3) – phil@mediafier.ai"`) + free-text labels/ARIA text that may contain names/emails. Field VALUES never captured. Disclose until P1-2/P1-3 scrubbing ships; err toward disclosure. |
| Health & Fitness | NO | No health fields/values. |
| Financial & Payment | NO | Values never captured; payment/card fields suppressed at capture by policy engine. |
| Authentication | NO | Password fields suppressed at capture; user's own API key stored local-only, never in recorded event data. |
| Personal Communications | NO | No email body/message content read. |
| Location | NO | No geolocation/IP-geo. |
| **Web History (URLs)** | **YES** | Page URLs captured (normalized for transmission; raw incl. query persisted locally per P2-5). |
| **User Activity** | **YES (primary)** | Clicks, navigation, form-field interactions (labels/identifiers, not values), keyboard intent (Enter/Esc/Tab only). |
| **Website Content** | **YES (limited)** | Page titles + form/button labels + nearby structural text (headings/breadcrumbs). No screenshots, no page body, no images. |

For every "YES": stored on-device; transmitted only on explicit HTTPS sync to user-configured endpoint; **not sold; not for ads/profiling; app-functionality only; encrypted in transit; user can delete** (local history, user-controlled).

---

## 4. Store Listing Copy

**Short description (132 chars, exact):**
> Record any browser workflow as clicks and form labels, then export a structured process map, SOP, and JSON. All processing on-device.

**Detailed description:**

**Ledgerium AI Recorder**

Turn any browser-based workflow into a structured process map, standard operating procedure (SOP), and exportable JSON — all processed on your device, with no data leaving your browser unless you choose to sync.

*What it does*
- Records your workflow in real time as you click, navigate, and fill out forms across any website — including multi-tab flows.
- Captures interaction events (clicks, navigation, form-field labels and ARIA labels) and page URLs. It does NOT capture what you type, your keystrokes, screenshots, or form field values.
- Excludes sensitive fields at capture time: password inputs, hidden inputs, and fields classified as payment-card numbers, SSNs, tax IDs, or similar are suppressed before any data is stored.
- Processes captured events on-device with a deterministic segmentation engine that produces a structured step list, a process map, and a formatted SOP.
- Saves up to 25 completed sessions locally in your browser. You control deletion.
- Generates a downloadable Workflow Report (HTML) and an exportable JSON bundle.
- Optionally syncs the session bundle to your configured Ledgerium workspace endpoint over HTTPS with a Bearer API key. Sync is always user-initiated — nothing is transmitted automatically.

*Why it needs access to all websites*
Ledgerium's single purpose is to let you record a workflow on whichever website you are working in. Digital workflows routinely span multiple web applications — a CRM, an internal portal, a SaaS tool — in the same session. Like other professional workflow-recording tools, the extension must run on any site you navigate to during a recording. It does not read data from sites you are not actively recording, and it is not active in incognito windows.

*Privacy*
The extension captures page URLs, page titles, and the visible labels of fields/elements you interact with. Page titles and free-text labels can contain personal information (e.g., a title like "Inbox — user@example.com"); this content is stored locally and, if you choose to sync, transmitted to your configured endpoint. Values you type are never captured. The extension does not collect analytics, serve ads, or transmit data to Ledgerium except on explicit user-initiated sync. Full details in the Privacy Policy.

**Category:** Productivity. **Incognito:** not allowed (intentional).

---

## 5. In-Extension Data-Use Disclosure (P1-6 — to surface in the recording UI)

Single-sentence (approved base):
> Ledgerium captures clicks, navigation events, and form-field labels on sites you record — stored locally, never transmitted unless you sync — and never collects typed values, passwords, or payment fields.

---

## 6. Privacy Policy Draft (host at a public HTTPS URL)

```markdown
# Ledgerium AI Recorder — Privacy Policy

**Product:** Ledgerium AI Recorder (Chrome Extension, v2.0.0)
**Developer:** Ledgerium AI / Mediafier AI
**Contact:** phil@mediafier.ai
**Effective / Last updated:** 2026-06-18

## 1. What this extension does
Records user-initiated browser workflows — clicks, navigation, and form-field interaction metadata — and converts them on-device into a process map, SOP, and exportable JSON bundle.

## 2. What data is collected (only while a recording session is actively running)
- Interaction events: click targets (CSS selector, ARIA label, role, element type), navigation events (URL changes, page loads), keyboard intent (Enter/Escape/Tab only). NOT captured: keystrokes, typed text, field values.
- Page context: full page URL (incl. path/query), page title, derived domain/route. NOT captured: screenshots, video, audio.
- Form-field labels: visible label text, ARIA labels, placeholders, nearby heading/label context. NOT the value entered.
- Session metadata: start/end time, activity name you provide, step/event counts.

### Sensitive-field exclusion at capture time
Before any event is stored, sensitive elements are excluded: `<input type="password">`, `<input type="hidden">`, and fields whose name/id/data-testid/aria-label match patterns for credit-card numbers, SSNs, tax IDs, bank accounts, PINs and similar (via `@ledgerium/policy-engine`).

### Known limitation
Page titles and free-text DOM labels are captured without automated PII scrubbing. A title like "Inbox (3) — user@example.com" or a label containing a name is stored as-is. Be aware of this when recording on pages displaying personal information. Automated scrubbing is planned for a future release.

## 3. Where data is stored — local-first by default
All session data is stored in `chrome.storage.local` on your device and does not leave your browser unless you initiate a sync. Up to 25 completed sessions are retained; the oldest is evicted past the cap. You can delete any session anytime. Settings + API key are stored in `chrome.storage.local`, not in sync storage and not remotely unless you sync.

## 4. What is transmitted and when
Only when you explicitly press Sync/Export to Workspace. What is sent: the full session bundle (events, URLs, titles, labels, derived steps, metadata). Where: the HTTPS endpoint you configure (default `https://ledgerium.ai`; self-hosting supported). HTTPS is enforced in code — non-HTTPS endpoints are refused. Requests carry a Bearer API key you configure. Synced bundles are stored in your account to power Ledgerium features you use; not sold, not shared for advertising, not used for unrelated purposes.

## 5. Data we do NOT collect
No keystrokes/typed text; no field values; no screenshots/video/audio; no reading of sites you are not actively recording; no browsing history outside an active session; no telemetry/analytics; no operation in incognito.

## 6. Chrome permissions
storage, sidePanel, scripting, alarms, host_permissions `<all_urls>` — purposes as listed in the store listing and submission form.

## 7. Limited-use commitments (CWS user data policy)
Data is collected solely to create the workflow map/SOP/bundle. Not transferred to third parties except to operate the Ledgerium service at the user's explicit request; not used for unrelated purposes; not used for creditworthiness/lending; not sold; not used for advertising.

## 8. Children's privacy
Intended for professional adult use; does not knowingly collect data from individuals under 13.

## 9. Changes
Material changes reflected via the "Last updated" date.

## 10. Contact
phil@mediafier.ai
```

---

## 7. Pre-Submission Checklist (non-code — CEO actions)

**A. Privacy Policy** — [ ] finalize from §6, [ ] publish at stable public HTTPS URL, [ ] enter URL in Developer Dashboard.
**B. Data Safety form** — [ ] complete per §3 mapping (4 YES categories), [ ] mark not-sold / not-ads / encrypted-in-transit / user-deletable, [ ] save & verify summary.
**C. Permission justifications** — [ ] enter §2 strings for storage/sidePanel/scripting/alarms/`<all_urls>`; remote-code = No; `all_frames` string.
**D. Single-purpose** — [ ] enter §1 statement; [ ] paste viewer-objection expansion into description.
**E. Listing** — [ ] short desc (§4); [ ] detailed desc accurate to actual features; [ ] category = Productivity.
**F. Screenshots** — [ ] 1–5 real-UI shots (idle / recording / process map / export), [ ] NO real PII visible, [ ] optional 440×280 tile.
**G. Metadata** — [ ] confirm version `2.0.0` intent (implies prior published history — consider 1.0.0 if first public submission), [ ] confirm `incognito: not_allowed`, [ ] **resolve React Flow Pro license** (`proOptions.hideAttribution:true` requires paid license — license or remove before submit).
**H. Manual capture certification (Extension Reliability Invariant §6)** — see program §5 gate / review §5 checklist; log Chrome version + PASS per step.

**Longest-lead item:** if no privacy-policy URL exists yet, write+publish it first — everything else is one sitting once the URL is live.
