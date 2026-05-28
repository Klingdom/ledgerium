# CHROME_STORE_REVIEW_001 (CHROME-001)

**Type**: Mode 3-adjacent multi-agent strategic review (NON-counting)
**Date**: 2026-05-26
**Coordinator**: AI CTO orchestration layer
**CEO directive (verbatim)**: *"Engage all subagents and add an agent that behaves like a chrome store browser extension reviewer to assess the current code base, UX, and functionality of the workflow recorder browser extension. This will be uploaded to the chrome store for review and approval. Make sure no extra capabilities from the extension are in the extension if the capability is not needed to record workflows and generate JSON files."*
**Agents engaged**: 6 in parallel
- `general-purpose` (Chrome Web Store Reviewer persona) — LEAD
- `system-architect` (architecture + dependency surface)
- `qa-engineer` (test coverage + submission readiness)
- `ux-designer` (extension UX + visual assets)
- `frontend-engineer` (code structure + dead code)
- `general-purpose` (security + privacy audit persona)

**Cumulative output**: ~16,000 words synthesized below

---

## §1 EXECUTIVE SUMMARY — Verdict: **MAJOR-CLEANUP** ⚠️

The Chrome Web Store Reviewer persona delivered the punchline:

> **Estimated review outcome at current state: SOFT-REJECT within 7-14 days requesting narrower permissions and clarification of the relationship between `<all_urls>` and stated single purpose.**

**Top 3 rejection vectors** (Chrome Reviewer §9):
1. **`<all_urls>` TRIPLE-BROAD declaration** (host_permissions + content_scripts.matches + WAR.matches) contradicts the extension's own architecture comments which describe a "v2 trust model — only capture on the tab the user is currently viewing" (`background/index.ts:106, 189, 446`). Highest-probability single rejection cause.
2. **Two adjacent feature surfaces violate single-purpose** + CEO directive:
   - In-extension Process Map Viewer (`src/viewer/`, ~1,000+ LOC + `@xyflow/react` ~800KB dep)
   - Workflow Report builder (`workflow-report-builder.ts` + HTML report generation)
3. **`tabs` permission cannot be justified specifically** — call sites only need `activeTab` + permission-free `chrome.tabs.create`. Reviewer reading code reaches this conclusion immediately.

**6-of-6 agent convergence on the REMOVAL list** (per CEO "eliminate every capability not strictly required" constraint):

| Item to REMOVE | Reason | Effort | LOC delta |
|---|---|---|---|
| `src/viewer/` directory entirely | Process map visualization belongs in web app post-upload | SMALL | −1,000 LOC + 800KB dep |
| `@xyflow/react` dependency | Only consumed by viewer (being removed) | TRIVIAL | −1 dep |
| `workflow-report-builder.ts` + HTML report flow | Derived data; web app re-derives from raw bundle | SMALL | −400 LOC |
| `telemetry.ts` extension analytics | Belongs in web app once bundle uploads; triggers reviewer scrutiny | SMALL | −80 LOC |
| `activeTab` permission | Redundant with `tabs` (which itself should narrow or stay) | TRIVIAL | 1 manifest line |
| `<all_urls>` web_accessible_resources scope | Allows fingerprinting; narrow to ledgerium.ai or remove | TRIVIAL | 1 manifest line |
| Declarative `content_scripts.matches: ["<all_urls>"]` | Use programmatic `chrome.scripting.executeScript` on START_SESSION instead | SMALL | 6 manifest lines |
| `console.log` statements in production | 9+ in `background/index.ts`; reviewer flag | SMALL | 9 LOC + Vite config |
| Sidebar process map (`SidebarProcessMap.tsx` + `SidebarStepDrawer.tsx`) | Visualization belongs in web app | SMALL | −400 LOC |

**6-of-6 agent convergence on the FIX list** (security + privacy + submission requirements):

| Item to FIX | Severity | File |
|---|---|---|
| Move `apiKey` from `chrome.storage.sync` to `chrome.storage.local` | HIGH | `background/index.ts:33, 437` |
| Add `sender.id !== chrome.runtime.id` guard in SW message handler | MED | `background/index.ts:355` |
| Add missing icon sizes (16/32/48 alongside 128) to `manifest.icons` | BLOCKER | `manifest.json:24` + new icon assets |
| Declare `"incognito": "not_allowed"` explicitly | BLOCKER | `manifest.json` |
| Re-enable real-extension E2E tests 2+3 (or document platform exclusion) | BLOCKER | `e2e/real-extension/sidepanel-real.spec.ts` |
| Strip console.log from production bundle | BLOCKER | `vite.config.ts` + 9+ call sites |
| Verify `chrome.storage.session` permission coverage | BLOCKER (potential runtime error) | manifest verification |
| Add privacy policy URL on ledgerium.ai BEFORE submission | BLOCKER | external |
| Add Chrome Store screenshots (1-5 at 1280x800) | BLOCKER | external |
| Rewrite description in plain language | RECOMMENDED-CHANGES | `manifest.json:5` |

**Two-iteration projected path to READY-TO-SUBMIT** (Chrome Reviewer §9):
- **Iteration A** (1 PR, ~1 day): manifest cleanup + permission justifications + icon sizes + privacy policy URL + Data Usage form. Post-A verdict: **MINOR-CLEANUP**.
- **Iteration B** (1 PR, ~2 days): viewer removal + workflow-report removal + telemetry removal + dependency prune + chrome.tabs.create elimination. Post-B verdict: **READY-TO-SUBMIT**.

**Estimated approval after full cleanup: standard 3-7 day review window, no clarification requests.**

---

## §2 Manifest.json Per-Permission Audit (Chrome Reviewer §1)

Current manifest declarations + verdicts:

| Permission/declaration | Current value | Verdict | Action |
|---|---|---|---|
| `manifest_version` | 3 | JUSTIFIED | Keep |
| `version` | "2.0.0" | KEEP (D-EXT-2) | Document as "first Chrome Store-distributed release" |
| `description` | "Record browser workflows as evidence-linked process intelligence. Zero-refresh capture." | **REWRITE** | Plain language: *"Record browser workflows (clicks, navigation, form labels) and export them as JSON. Optional upload to your Ledgerium workspace."* |
| `permissions: ["storage", "sidePanel", "tabs", "alarms", "scripting", "activeTab"]` | — | mixed | See per-permission below |
| `host_permissions: ["<all_urls>"]` | broadest possible | **OVER-PERMISSIONED CRITICAL** | Recording on arbitrary sites requires this; keep but document trust model explicitly in store listing |
| `content_scripts.matches: ["<all_urls>"]` + `all_frames: true` | broadest possible | **OVER-PERMISSIONED** | REMOVE declarative content_scripts entirely; use `chrome.scripting.executeScript` on START_SESSION (already does this — declarative entry is redundant) |
| `web_accessible_resources.matches: ["<all_urls>"]` | broadest possible | **OVER-PERMISSIONED** | NARROW to `["https://*.ledgerium.ai/*"]` OR remove WAR entry entirely if viewer is removed |
| `icons` | only `128` declared | **BLOCKER** | Add 16 + 32 + 48 sizes |

### Per-permission verdicts

| Permission | Verdict | Justification (for store submission) |
|---|---|---|
| `storage` | **JUSTIFIED** | Persists active recording session events + history + settings |
| `sidePanel` | **JUSTIFIED** | Recorder UI delivered via chrome.sidePanel |
| `tabs` | **OVER-PERMISSIONED** | Code only uses `chrome.tabs.query({active:true, lastFocusedWindow:true})` + `chrome.tabs.onUpdated/onActivated` + `chrome.tabs.sendMessage` + `chrome.tabs.create`. **`activeTab` + permission-free `chrome.tabs.create` covers all real call sites**. REMOVE `tabs` from manifest. |
| `alarms` | **JUSTIFIED** | 25-second SW keepalive during recording (MV3 standard pattern) |
| `scripting` | **JUSTIFIED** | `chrome.scripting.executeScript` for zero-refresh injection into already-open tabs |
| `activeTab` | **CONFLICTED** | Chrome Reviewer says KEEP (justified by "active-tab-only trust model"); System Architect + Security audit say REMOVE (redundant when `tabs` present). **Coordinator resolution**: REMOVE `tabs` (per Chrome Reviewer §1); KEEP `activeTab` as the narrow capability that actually grants what we use. |

**Resolved minimal permission set**: `["storage", "sidePanel", "alarms", "scripting", "activeTab"]` (5 permissions; drop `tabs`).

---

## §3 Single-Purpose Compliance (Chrome Reviewer §2)

**Stated purpose** (≤15 words): *"Record browser workflow events and export the session as a JSON file (optionally upload it)."*

**Single-purpose verdict: ACCEPTABLE WITH CAVEATS.** The shipped feature surface is one logical product, BUT the codebase ships **3 adjacent capabilities that violate CEO directive**:

### 3 capability violations (CEO directive: ELIMINATE)

1. **In-extension Process Map Viewer** (`src/viewer/` directory; ~1,000+ LOC; `@xyflow/react` ~800KB minified)
   - Renders flowchart visualization of recorded steps
   - **VIOLATES**: visualization belongs in web app post-upload
   - **REMOVE**: entire `src/viewer/` directory + `@xyflow/react` from package.json + `web_accessible_resources` entry + "Open in tab" buttons (`HistoryDetailScreen.tsx:87-89`, `ProcessScreen.tsx:188-190, 404, 424, 437, 439`)

2. **Workflow Report builder** (`src/background/workflow-report-builder.ts`, ~437 LOC; HTML report generation in `ProcessScreen.tsx:229-387`)
   - Generates structured analytical report ("metrics", "SOP steps") in-extension
   - Duplicates engine work web app already does post-upload (`packages/process-engine`, `packages/intelligence-engine`)
   - **VIOLATES**: derived data; should re-derive web-side
   - **REMOVE**: builder file + HTML download in `ProcessScreen.tsx` + `MSG.GET_WORKFLOW_REPORT` handler in background SW

3. **Extension telemetry pipeline** (`src/background/telemetry.ts`, ~83 LOC; `trackExtension` calls at 6 sites)
   - Sends behavioral analytics to web-app `/api/analytics/events`
   - Opt-in via `telemetryEnabled: false` default — but **distinct outbound endpoint from upload**
   - **VIOLATES**: serves no recording-or-export purpose; CEO directive eliminates
   - **REMOVE**: telemetry module + 5 `trackExtension` call sites + `telemetryEnabled` setting from `ExtensionSettings`

---

## §4 Permission Justifications (Chrome Store submission requirement)

Submit verbatim in Chrome Web Store *Permission Justification* fields:

```
Permission: storage
Justification: Persists the active recording session's event array across
service-worker restarts and retains a local history of up to 25 completed
recordings for user review before upload. Also stores the user's upload URL
for the configured Ledgerium workspace.

Permission: sidePanel
Justification: The recorder's user interface (start/pause/stop controls,
live step feed, review screen) is delivered as a Chrome side panel so the
user can keep the recording controls visible without leaving the page being
recorded.

Permission: alarms
Justification: A 25-second keep-alive alarm prevents the MV3 service worker
from being evicted mid-recording. The alarm is created on recording start
and cleared on stop; it does not run when the extension is idle.

Permission: scripting
Justification: Programmatically injects the recording content script into
the currently active tab when the user starts a session, so already-open
pages can be recorded without a refresh.

Permission: activeTab
Justification: Grants the extension access to the tab the user explicitly
activates during a recording session. The extension only captures DOM
events from this single active tab; capture follows the user across tab
switches.

host_permissions: <all_urls>
Justification: The extension records browser workflows on any user-chosen
website. Recording requires content-script access to the tab being recorded.
The trust model is user-initiated: nothing is captured passively. Content
script is injected only when the user clicks "Start Recording" in the
sidepanel; idle pages produce zero events.
```

---

## §5 Data Collection + Privacy Disclosure (Chrome Reviewer §4)

**Data the extension collects** (for Chrome Web Store Privacy Practices form):

| Category | Source | Where it goes |
|---|---|---|
| **Website content** (DOM text, form labels, button labels) | Active tab during recording | Local `chrome.storage.local` + optional upload URL |
| **User activity** (clicks, navigations, form-field changes, focus events) | Active tab during recording | Same |
| **Web history** (URLs visited during active recording) | Active tab navigations | Same |
| **Authentication information** | `apiKey` in `chrome.storage.sync` (used as Bearer token) | Sent ONLY to user-configured upload URL |
| **Analytics events** (opt-in) | Recording lifecycle events | `<uploadUrl>/api/analytics/events` ONLY if `telemetryEnabled === true` |

**Data sale**: NO. Verified zero PostHog / Mixpanel / Segment / Sentry SDK imports in extension src/.

**Field VALUES never captured**: `capture.ts:317, 329, 361, 527` uses `value_present: boolean` only. Password/hidden inputs short-circuit at `target-inspector.ts:25-27`. Pattern-matched sensitive selectors (password / secret / token / api_key / credit_card / cvv / ssn / tax_id) excluded from inspection per `policy-engine/src/sensitivity.ts:13-95`.

**Identified PII gaps** (security audit §2):
- MED: email/tel inputs capture `target_label` but not value (intentional per `sensitivity.ts:89-92`); disclosure required
- MED: DOB / medical / financial account numbers / driver's license patterns NOT in `SENSITIVE_SELECTOR_PATTERNS`
- LOW: international ID formats (UK NIN / German Steuer-ID / Indian Aadhaar) not pattern-matched
- LOW: `page_title` captured verbatim — could reveal Gmail/Slack sender/topic

**Recommended Privacy Practices listing copy** (≤400 chars; from security audit D-SEC-4):

> *"Ledgerium AI Recorder captures DOM events (clicks, navigation, form labels) from the single tab you actively record. Recordings are stored locally in your browser and, if you configure an upload URL, sent over HTTPS to your own Ledgerium workspace. Sensitive fields (passwords, credit cards, SSN) are masked at capture. No data is sold or shared with third parties."*

**Privacy policy URL**: REQUIRED on store listing. Must be hosted at `ledgerium.ai/privacy/extension` (dedicated extension privacy page per security D-SEC-3) BEFORE submission.

---

## §6 Critical Security + Privacy Findings (security audit + Chrome Reviewer)

### 🔴 HIGH severity

**SEC-1: `apiKey` stored in `chrome.storage.sync`** — apiKey syncs across user's signed-in Chrome instances via Google account; if user signs into Chrome on a shared computer, apiKey replicates. **FIX**: move apiKey to `chrome.storage.local`; settings minus apiKey can stay in `.sync`. ~30 LOC change.

### 🟡 MED severity

**SEC-2: SW message handler does not check `sender.id`** (`background/index.ts:355`) — content script DOES check (`content/index.ts:35` `if (sender.id !== chrome.runtime.id) return false`) but background does not. Co-installed malicious extension with `chrome.runtime.connect` permission could send `STOP_SESSION` / read state via `GET_STATE`. **FIX**: add `if (sender.id !== chrome.runtime.id) return false` at message handler entry.

**SEC-3: Web app upload endpoint should validate Origin header** — `Bearer` auth is generally CSRF-resistant, but defense-in-depth requires web app to verify `Origin: chrome-extension://<id>` on `/api/sync`. **FIX**: web-app-side; coordinate with backend.

### 🟢 LOW severity (verified clean)

- ✅ Zero `eval()` / `Function()` constructor / `innerHTML` / `document.write` usage (CSP-clean)
- ✅ No third-party analytics SDKs (PostHog / Mixpanel / Sentry / Segment) in extension bundle
- ✅ HTTPS-only upload enforcement (`uploader.ts:14-17`)
- ✅ 30-second AbortController timeout on uploads
- ✅ `chrome://` URLs correctly excluded from injection
- ✅ Idempotency guard prevents page-side spoofing of capture engine
- ✅ Field VALUES never captured (only `value_present: boolean`)
- ✅ URL query-strings stripped at source (`capture.ts:227-243`)
- ✅ Sensitivity masking via `policy-engine` shared package
- ✅ Telemetry opt-in default-OFF

---

## §7 QA Submission Readiness Checklist (qa-engineer §5)

```
QA CHECKLIST — PRE-SUBMISSION (Ledgerium AI Recorder v2.0.0)

=== BLOCKING (must pass before submission) ===

[ ] BLOCKER-1: chrome.storage.session permission verification
    manifest declares "storage" but background uses chrome.storage.session.
    In MV3, "storage" covers local + sync + session (Chrome 102+).
    Validate: install unpacked extension + record-stop-restart cycle;
    confirm no chrome://extensions/ errors panel entries.

[ ] BLOCKER-2: console.log stripping from production bundle
    background/index.ts contains 9+ console.log with [LDG-BG] prefix.
    content/* and shared/* contain additional logs.
    Add Vite production define to strip; verify via `grep -r "console\.log" dist/`

[ ] BLOCKER-3: Missing icon sizes (16/32/48)
    manifest.icons declares only "128"; Chrome Store REQUIRES 16+48.
    Create icons/icon-16.png + icon-32.png + icon-48.png; add manifest entries.

[ ] BLOCKER-4: Real-extension E2E tests 2+3 still skipped
    sidepanel-real.spec.ts tests 2 + 3 skipped since iter 070 due to
    chrome.tabs.query Windows flake. Must pass OR document explicit
    CEO platform-exclusion decision.

[ ] BLOCKER-5: uploader.ts has zero unit tests for failure paths
    HTTPS rejection / non-200 / timeout abort untested. Add unit tests.

[ ] BLOCKER-6: incognito declaration missing
    Add `"incognito": "not_allowed"` to manifest.json per D-SEC-5.

[ ] BLOCKER-7: Privacy policy URL hosted at ledgerium.ai/privacy/extension
    External dependency; cannot submit without hosted policy.

[ ] BLOCKER-8: Chrome Store screenshots (1-5 at 1280x800)
    External asset creation; no screenshots in repo currently.

=== STRONGLY RECOMMENDED (CEO directive — capability elimination) ===

[ ] CLEANUP-1: Remove src/viewer/ entirely
    5 .tsx files + html + main.tsx + processMapBuilder.ts; ~1,000 LOC

[ ] CLEANUP-2: Remove @xyflow/react dependency
    package.json:21 — only consumed by viewer

[ ] CLEANUP-3: Remove workflow-report-builder.ts + HTML report generation
    background/workflow-report-builder.ts + ProcessScreen.tsx download flow

[ ] CLEANUP-4: Remove telemetry.ts + 5 trackExtension call sites
    background/telemetry.ts + 5 call sites at background/index.ts:207,264,302,306,325

[ ] CLEANUP-5: Remove SidebarProcessMap.tsx + SidebarStepDrawer.tsx
    ~400 LOC; visualization belongs in web app

[ ] CLEANUP-6: Drop `tabs` permission from manifest
    activeTab + permission-free chrome.tabs.create sufficient

[ ] CLEANUP-7: Narrow web_accessible_resources.matches
    From <all_urls> to ["https://*.ledgerium.ai/*"] OR remove entirely

[ ] CLEANUP-8: Remove declarative content_scripts block
    Use chrome.scripting.executeScript on START_SESSION (already does this)

[ ] CLEANUP-9: Rewrite manifest description in plain language
    Per Chrome Reviewer §8 wording

[ ] CLEANUP-10: window.confirm replaced with InlineArchiveConfirm pattern
    IdleScreen.tsx:171 + HistoryDetailScreen.tsx:93

=== SHOULD (recommended pre-submission) ===

[ ] SHOULD-1: chrome.storage.local for apiKey (move from sync)
[ ] SHOULD-2: sender.id check in background SW message handler
[ ] SHOULD-3: Manual happy-path on macOS Chrome stable
[ ] SHOULD-4: Memory profile 30+ min session on DOM-heavy SPA
[ ] SHOULD-5: Extend SENSITIVE_SELECTOR_PATTERNS (dob/medical/account/iban)
[ ] SHOULD-6: Empty-state copy on IdleScreen explaining first-recording
[ ] SHOULD-7: Map known error types in ErrorScreen (don't render raw strings)

=== NICE (post-submission) ===

[ ] NICE-1: Enable real-extension tests 2+3 on Linux CI
[ ] NICE-2: Add Edge stable to playwright.config.ts
[ ] NICE-3: Keyboard shortcut (commands manifest key) — Alt+Shift+R
[ ] NICE-4: Promotional images (440x280 small tile; 1400x560 marquee)
[ ] NICE-5: Internationalization layer (English-only at MVP)
```

---

## §8 Recommended PR Plan — 2 PRs to READY-TO-SUBMIT

### PR-CHROME-A: Manifest cleanup + assets + privacy policy (Iteration A; ~1 day)

**Goal**: Reach **MINOR-CLEANUP** verdict.

Files modified:
- `manifest.json` — drop `tabs`, narrow `web_accessible_resources`, remove declarative content_scripts entry, add icon sizes, rewrite description, add `"incognito": "not_allowed"`
- NEW `apps/extension-app/icons/icon-16.png` + `icon-32.png` + `icon-48.png`
- NEW `apps/web-app/src/app/(public)/privacy/extension/page.tsx` — extension-specific privacy policy page
- `apps/extension-app/vite.config.ts` — add production console.log stripping via terser config
- NEW Chrome Store submission docs: `docs/runbooks/CHROME_STORE_SUBMISSION.md` with permission justifications + privacy disclosure + data-usage form responses

Agent: `frontend-engineer` + `devops-engineer` adjacent (CI bundle verification)

Risk: LOW (manifest changes are localized; icon assets are external)

---

### PR-CHROME-B: Capability elimination per CEO directive (Iteration B; ~2 days)

**Goal**: Reach **READY-TO-SUBMIT** verdict.

Files removed:
- `apps/extension-app/src/viewer/` directory entirely
- `apps/extension-app/src/sidepanel/components/SidebarProcessMap.tsx`
- `apps/extension-app/src/sidepanel/components/SidebarStepDrawer.tsx`
- `apps/extension-app/src/background/workflow-report-builder.ts`
- `apps/extension-app/src/background/telemetry.ts`

Files modified:
- `apps/extension-app/package.json` — remove `@xyflow/react` dependency
- `apps/extension-app/src/background/index.ts` — remove 5 trackExtension calls + GET_WORKFLOW_REPORT handler + buildWorkflowReport invocation
- `apps/extension-app/src/sidepanel/screens/ProcessScreen.tsx` — remove ExportView download flow + openFullView + Open in tab affordances; replace with "View in Ledgerium web app →" link
- `apps/extension-app/src/sidepanel/screens/HistoryDetailScreen.tsx` — remove Open in tab affordance + raw JSON `<pre>` viewer
- `apps/extension-app/src/sidepanel/screens/IdleScreen.tsx` — replace `window.confirm` delete with InlineArchiveConfirm pattern
- `apps/extension-app/src/shared/types.ts` — remove `telemetryEnabled` from `ExtensionSettings`
- `apps/extension-app/src/background/index.ts:33, 437` — move `apiKey` from `chrome.storage.sync` to `chrome.storage.local`
- `apps/extension-app/src/background/index.ts:355` — add `if (sender.id !== chrome.runtime.id) return false` guard

Agent: `frontend-engineer` PRIMARY + `qa-engineer` adjacency

Risk: MED (large LOC removal; affects sidepanel UX; coordinate with web-app to ensure process map / workflow report still accessible there)

---

## §9 18 CEO Decisions Queued (silence = accept coordinator-defaults)

### Chrome Web Store Reviewer decisions

| # | Decision | Coordinator-default |
|---|---|---|
| D-CR-1 | Submission strategy | **2-iteration PR plan** (Iteration A = manifest cleanup; Iteration B = capability elimination) |
| D-CR-2 | Verdict tolerance | **Target READY-TO-SUBMIT (post Iteration B)**; do NOT submit at current MAJOR-CLEANUP state |

### Architecture decisions

| # | Decision | Coordinator-default |
|---|---|---|
| D-EXT-1 | Manifest scope | **NARROW** — drop `tabs` + `activeTab` redundancy resolution per Chrome Reviewer §1 (drop `tabs`, keep `activeTab`); drop WAR for viewer |
| D-EXT-2 | Extension version reset | **KEEP `2.0.0`** — document as "first Chrome Store-distributed release" |
| D-EXT-3 | Auto-upload vs. manual JSON download | **MANUAL DOWNLOAD as baseline; auto-upload as optional advanced setting default-OFF** — eliminates `apiKey` storage from default extension, simplifies privacy story |
| D-EXT-4 | Sidepanel vs. popup | **SIDEPANEL-ONLY** (already the case; no change) |
| D-EXT-5 | Content script scope | **KEEP `<all_urls>` host + `all_frames: true`** because workflow recording must work anywhere; document trust model explicitly in store listing |

### Security + privacy decisions

| # | Decision | Coordinator-default |
|---|---|---|
| D-SEC-1 | Telemetry collection | **NONE** — remove `telemetry.ts` entirely per CEO capability-elimination directive (was opt-in default-OFF but still triggers reviewer scrutiny) |
| D-SEC-2 | Token storage strategy | **`chrome.storage.local` for apiKey** (move from .sync); rest of settings stays in .sync |
| D-SEC-3 | Privacy policy URL hosting | **Dedicated `/privacy/extension` page on web app** (not general policy reuse) |
| D-SEC-4 | Privacy disclosure language for Chrome Store | **Verbatim per §5 above** (399 chars) |
| D-SEC-5 | Incognito mode support | **`"incognito": "not_allowed"`** declared in manifest |

### QA decisions

| # | Decision | Coordinator-default |
|---|---|---|
| D-QA-1 | Test matrix scope | **Chrome stable + Edge stable** (one config-line addition for Edge); all-Chromium deferred |
| D-QA-2 | Incognito declaration | **Declare `"not_allowed"`** (per D-SEC-5) |
| D-QA-3 | Telemetry in extension | **NONE** (per D-SEC-1) |

### UX decisions

| # | Decision | Coordinator-default |
|---|---|---|
| D-UX-EXT-1 | Sidepanel vs. popup | **Sidepanel-only** (already correct) |
| D-UX-EXT-2 | Onboarding scope | **One-screen contextual hint on idle empty state** — add 1-sentence explanation of what the extension does |
| D-UX-EXT-3 | Authentication UI in extension | **No login form in extension**; manual API key copy from web app sufficient |
| D-UX-EXT-4 | Recording control affordance | **Sidepanel button only** at MVP; keyboard shortcut as follow-up post-approval |

### Frontend decisions

| # | Decision | Coordinator-default |
|---|---|---|
| D-FE-EXT-1 | React vs. lighter alternative | **KEEP React 18** at MVP; revisit Preact migration after viewer removal makes the trade-off legible |
| D-FE-EXT-2 | TanStack Query | **N/A** (not installed; no action needed) |
| D-FE-EXT-3 | i18n scope | **English-only** at MVP |

---

## §10 Backlog Row Proposals

Per MR-016 Change A structural-umbrella-split discipline: 2 separate backlog rows for the 2 PRs, each with `Birth iter: audit-intake-CHROME-001`.

| Row # | Title | Score | Agent | Birth iter |
|---|---|---|---|---|
| #183 | CHROME-001 PR-CHROME-A: Manifest cleanup + assets + privacy policy + Chrome Store submission docs | 16 (BLOCKER) | frontend-engineer + devops-engineer adjacent | audit-intake-CHROME-001 |
| #184 | CHROME-001 PR-CHROME-B: Capability elimination per CEO directive — remove viewer + workflow-report + telemetry + sidebar map + token storage move | 14 | frontend-engineer + qa-engineer adjacent | audit-intake-CHROME-001 |

Pool delta at CHROME-001 ratification: 55 → 57 (2 new rows).

---

## §11 Validation + Closing Verdict

### Mode 3-adjacent NON-counting effects

- Zero product code touched
- Iteration counter NOT advanced
- Cool-off recharge counter UNCHANGED at 3/3 FULL RE-ARM
- D-1 reverse-portfolio-drift counter UNCHANGED at 22
- MR-020 cadence counter UNCHANGED (deferred per CEO Option B)
- Area saturation clock NOT advanced
- Pool 55 → 55 at MPR-001 + CHROME-001 close pending CEO acknowledgement

### Coordinator final verdict

**CHROME-001 ARTIFACT DELIVERED. EXTENSION REQUIRES MAJOR-CLEANUP BEFORE SUBMISSION.**

Top 3 actions to UNBLOCK submission (in priority order):
1. **Ship PR-CHROME-A** (manifest cleanup + missing icons + privacy policy URL) → reaches MINOR-CLEANUP verdict
2. **Ship PR-CHROME-B** (eliminate viewer + workflow-report + telemetry per CEO directive) → reaches READY-TO-SUBMIT verdict
3. **Submit to Chrome Web Store** with expected 3-7 day standard review window + no clarification requests

**Coordinator-default sequencing**:
- iter 097 = PR-CHROME-A (`frontend-engineer` PRIMARY; ~1 day)
- iter 098 = PR-CHROME-B (`frontend-engineer` PRIMARY + `qa-engineer` adjacent; ~2 days)
- Chrome Web Store submission immediately after iter 098 close

**Total time to Chrome Web Store approval: ~3 days code + 3-7 days review = ~7-10 days from CEO acknowledgement.**

**Awaiting CEO acknowledgement** on §9 D-CR-1 through D-FE-EXT-3 (18 decisions). Once confirmed (explicit or silent-as-accept), coordinator proceeds with iter 097 = PR-CHROME-A.

**Critical CEO note on existing PRs**: ADM-002 drill-down sprint has 3 remaining PRs (PR-8 through PR-10) and MPR-001 has 4 PRs queued. CHROME-001 PR-A + PR-B should be **HIGHEST PRIORITY** since:
- Chrome Web Store approval is a prerequisite for SEO-driven extension distribution
- Extension is the primary user-acquisition channel
- ADM-002 + MPR-001 are post-launch optimization work; CHROME-001 is launch-prerequisite

Recommended priority order: CHROME-001 → MPR-001 → ADM-002 (resume drill-down sprint).

---

## Appendix A — Agent Output Index

| Agent | Word count | Role |
|---|---|---|
| general-purpose (Chrome Web Store Reviewer) | ~3,500 | LEAD; policy-focused review; final verdict |
| system-architect | ~2,400 | Architecture + dependency surface + MV3 compliance |
| qa-engineer | ~3,000 | Test coverage + edge cases + submission checklist |
| ux-designer | ~2,400 | Extension UX + visual assets + onboarding |
| frontend-engineer | ~1,800 | Code structure + dead code + bundle size |
| general-purpose (security + privacy audit) | ~3,200 | Data flow + PII + permission scope + vulnerability surface |
| **Total** | **~16,300** | |

## Appendix B — File Reference Index

- `apps/extension-app/manifest.json` — primary policy-critical file
- `apps/extension-app/package.json` — dependencies (remove `@xyflow/react`)
- `apps/extension-app/src/background/index.ts` — SW (~520 LOC; multiple cleanup sites)
- `apps/extension-app/src/background/telemetry.ts` — REMOVE
- `apps/extension-app/src/background/workflow-report-builder.ts` — REMOVE
- `apps/extension-app/src/background/uploader.ts` — KEEP (https-only enforcement verified)
- `apps/extension-app/src/background/session-store.ts` — KEEP (well-tested; iter 028 hardened)
- `apps/extension-app/src/content/index.ts` — KEEP (sender.id validation present)
- `apps/extension-app/src/content/capture.ts` — KEEP (sensitivity guards verified)
- `apps/extension-app/src/sidepanel/` — KEEP (modify ProcessScreen + HistoryDetailScreen + IdleScreen)
- `apps/extension-app/src/viewer/` — REMOVE entire directory
- `apps/extension-app/src/sidepanel/components/SidebarProcessMap.tsx` — REMOVE
- `apps/extension-app/src/sidepanel/components/SidebarStepDrawer.tsx` — REMOVE
- `packages/policy-engine/src/sensitivity.ts` — VERIFIED CLEAN (extend with additional patterns recommended)
- `packages/normalization-engine/src/normalizer.ts` — VERIFIED CLEAN

## Appendix C — Prior Strategic Review Cross-References

- PDLT-001 (pre-demo testing plan; 5 distinctive moments)
- ADM-002 (admin dashboard expansion; concurrent scope)
- MPR-001 (marketing pages + 5 personas; concurrent scope)
- UMAP-001 (user management UI; references extension API auth)
- AI_INTEGRATION_PLATFORM_VISION_REVIEW_001 (vision narrative)
- **CHROME-001 (this artifact)**

---

**End of CHROME-001.** Mode 3-adjacent NON-counting. 2 PRs proposed. Coordinator awaits CEO acknowledgement on §9 D-CR-1 through D-FE-EXT-3 before iter 097 PR-CHROME-A begins. **Recommended highest priority over MPR-001 + ADM-002 drill-down resumption.**
