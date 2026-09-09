# CHROME_STORE_SUBMISSION_READINESS_001

**Type:** Chrome Web Store Expert audit (review-and-recommend only; zero files modified)
**Date:** 2026-09-09
**Auditor:** chrome-web-store-expert persona
**Scope:** `apps/extension-app/` (Ledgerium AI Recorder v2.0.0, Chrome MV3)
**Constraint honored:** no source or manifest edits made. All findings are VERIFIED against the current repo state read directly, or REASONED from that state plus current Chrome Web Store policy (fetched live, not from training memory alone).

**Context for this audit:** Three prior artifacts exist —
`docs/meta/CHROME_STORE_REVIEW_001.md` (2026-05-26), `CHROME_STORE_REVIEW_002.md` (2026-05-27), and
`CHROME_EXTENSION_STORE_REVIEW_001.md` (2026-06-18) — and they **disagree with each other** on two
permission questions (`tabs` vs `activeTab`) across three consecutive passes. Commit `449af69`
(2026-08-19) declared "all 8 blockers now closed," but that referred to a narrower 8-item checklist
in `docs/runbooks/CHROME_STORE_SUBMISSION.md`, not the full MAJOR-CLEANUP scope the first two audits
called for. No listing has ever been created (`chromeStoreUrl` is still a placeholder). This audit
re-verifies everything against **today's** code rather than trusting any prior artifact's narrative.

---

## 1. GO / NO-GO VERDICT

### **CONDITIONAL GO — code is materially closer to submittable than the trailing docs suggest, but do not click Submit until 3 concrete gaps close.**

This is better news than the CEO's three-week-old audit trail implies. Re-reading the actual source
today shows several of the MAJOR-CLEANUP findings from May/June have quietly been fixed in the
interim (see SS6 "Already fixed" table) - the manifest is in fact leaner than any of the three prior
audits evaluated. The remaining gaps are narrow and mostly non-code.

**Rejection-probability drivers, ranked:**

| # | Driver | Est. contribution to reject/soft-reject risk | Type |
|---|---|---|---|
| 1 | **Small promo tile (440x280) does not exist as a PNG** - only an unrendered HTML source file. This is a Chrome Web Store Dashboard **required** listing asset (per current developer.chrome.com/docs/webstore/cws-dashboard-listing, "Graphic Assets (mandatory except marquee tile)"). Without it the listing tab cannot be completed. | **Will block submission**, not "may" | Asset gap |
| 2 | **No listing has ever been drafted or created.** `chromeStoreUrl: '.../placeholder'` (`apps/web-app/src/lib/config.ts:16`) confirms zero submission attempt exists today. Detailed description, category, and the Data Safety form have never been entered into the Dashboard (only drafted in a runbook). | Blocks submission (nothing to reject yet) | Process gap |
| 3 | **`<all_urls>` + `content_scripts: <all_urls>` is the highest-scrutiny combination in the manifest** and will trigger Google's "in-depth review" queue (days-to-weeks, not the 3-7 day standard window) regardless of code quality - this is a **timeline risk, not a rejection risk**, if the justification text is precise (SS2). | Timeline, not rejection, if justified well | Review-queue risk |
| 4 | **Single-purpose drift is unresolved**: `SidebarProcessMap.tsx`, `SidebarStepDrawer.tsx`, `@xyflow/react` (`package.json:22`), and `workflow-report-builder.ts` + its HTML-report generator in `ProcessScreen.tsx` are still present. Three consecutive audits disagreed on how serious this is (SS3). It is a **defensible product shape**, not a clear violation, but it is the one item most likely to draw a reviewer clarification email if the listing narrative doesn't pre-empt it. | Moderate - clarification-request risk, not certain rejection | Judgment call |
| 5 | Stale runbook content (`docs/runbooks/CHROME_STORE_SUBMISSION.md` still includes a `tabs` permission justification block for a permission that is **no longer declared** in the manifest) - harmless to Chrome's reviewer (the Dashboard only shows justification fields for permissions actually present), but a real risk that whoever executes the runbook pastes stale text or gets confused about current state. | Execution-error risk, not a Store-policy risk | Docs hygiene |

**What is NOT a blocker, contrary to what the trailing docs imply:** the manifest today is
**already** at the minimal permission set every prior audit converged on recommending
(`storage`, `sidePanel`, `alarms`, `scripting`, `host_permissions: <all_urls>` - no `tabs`, no
`activeTab`, no `web_accessible_resources`). Icons (4 sizes), `incognito: not_allowed`, HTTPS-only
upload enforcement, production console-log stripping, and 4 real (non-mockup) 1280x800 screenshots
all VERIFY as done - see SS6.

**Bottom line: do not submit today** (item 1 alone prevents completing the listing form). **Do
submit within days**, not weeks, once the promo tile exists and the Dashboard fields are actually
entered - the code-side work is close to finished.

---

## 2. `<all_urls>` RISK ASSESSMENT

### Verdict: KEEP `<all_urls>` on both `host_permissions` and `content_scripts.matches`. Do not narrow before submission.

**Is broad host permission justifiable for this single purpose? Yes -- VERIFIED, not just claimed.**

The product's own description is "record browser workflows... on any user-chosen website." I traced
the actual capture-arming code path rather than trusting the comment:

- `apps/extension-app/src/content/capture.ts:63-105` (`startCapture()`) is the **only** call site that
  invokes `attachDOMListeners()` (`capture.ts:86`). `attachDOMListeners()` is never called from module
  load or the constructor.
- `apps/extension-app/src/content/index.ts:15-30` shows the content script, once loaded, does nothing
  but construct a `CaptureEngine` and register a `chrome.runtime.onMessage` listener -- it attaches
  **zero** DOM listeners until it receives `MSG.START_SESSION` from the background service worker.
- `MSG.START_SESSION` is sent only in response to an explicit user action in the side panel (traced
  through `background/index.ts`), and on every subsequent tab-switch/navigation **during an
  already-active recording** (`background/index.ts:462-482` `onUpdated`, `background/index.ts:486-509`
  `onActivated` -- both explicitly gate on `sm.state !== 'recording'`).

**VERIFIED: the "nothing is captured until the user clicks Start Recording" trust-model claim is
literally true in the current code**, not aspirational. That is the load-bearing fact for the
justification text.

**Why a narrower alternative would break function -- REASONED from the actual injection code, not
assumed:**

- **`activeTab`** grants access only to the tab active *at the moment of a user gesture on the
  extension*, and -- critically -- it does not survive a tab switch or a new navigation without a
  fresh user gesture. But `background/index.ts:486-509` (`chrome.tabs.onActivated`) and
  `background/index.ts:462-482` (`chrome.tabs.onUpdated`) both **automatically** call
  `injectIntoTab(tabId)` and send `START_SESSION` **without any new user gesture** every time the
  user switches tabs or navigates during an active session -- this is literally the "follow the user
  across Salesforce -> Gmail -> an internal portal" feature the product sells. `activeTab` cannot
  authorize those automatic, non-gesture-triggered injections. Adopting it would silently stop
  capture the instant a recording session touched a second tab or a new navigation -- precisely the
  kind of regression the Extension Reliability Invariant exists to prevent.
- **`optional_host_permissions` + `chrome.permissions.request()`** has the same fatal flaw: Chrome
  requires `permissions.request()` to be called from within a user gesture. The automatic
  re-injection on `onUpdated`/`onActivated` above is **not** a user gesture -- it fires from a
  background event listener. Narrowing to optional host permissions would mean every new domain the
  user's workflow touches mid-recording would need its own permission prompt, and the code has no
  gesture available at that moment to legally request it. This is not a UX inconvenience to smooth
  over later -- it is a hard Chrome platform constraint that would break cross-tab capture outright.
- **User-triggered injection only (drop the declarative `content_scripts` block, keep `scripting`)**
  was independently recommended by the system-architect persona in the June-18 audit as "partly
  redundant," reasoning that `injectIntoTab()` is already called explicitly in both tab-lifecycle
  listeners. Reading the code, that reasoning is not obviously wrong -- but it is contradicted by
  **direct incident history**: `CLAUDE.md` records that removing `content_scripts` at iter-097 "broke
  capture entirely," and it is explicitly listed on the Extension Reliability Invariant's
  forbidden-silent-changes list for exactly that reason. One theoretical code-reading argument for
  redundancy does not outweigh one proven production incident. **Recommendation: do not attempt this
  narrowing before submission.** If pursued later, it must go through the CEO-approval + real-extension
  harness gate `CLAUDE.md` already mandates, as a change fully isolated from anything else -- and even
  then the review-risk payoff is small, because `host_permissions: <all_urls>` remains required
  regardless (it is what actually grants the scripting/tabs.sendMessage access on arbitrary domains),
  so removing the declarative `content_scripts.matches` entry alone would not eliminate the
  highest-scrutiny element of the manifest -- it would just remove one of two `<all_urls>` declarations
  that both point at the same underlying access.

**Net honest weighing: review risk vs. reliability risk favor KEEP, not narrow.** The review-risk
reduction from narrowing is small (`<all_urls>` in `host_permissions` triggers the in-depth queue on
its own; dropping the parallel `content_scripts.matches` entry does not remove that trigger). The
reliability risk of narrowing is proven, not theoretical (it has already broken production once on
this exact block). This is a rare case where the conservative, do-nothing choice is also the
correct policy-engineering choice.

**What the justification field must say** (draft, refined from the three prior drafts to make the
"why not narrower" case explicit, since Google's stated 2026 review guidance for `<all_urls>` is
specifically "explain why your extension cannot function with narrower host permissions"):

```
host_permissions: <all_urls>
Ledgerium AI Recorder lets a user record a workflow that spans multiple
websites in one session (for example: copy a value from an internal
portal, paste it into a CRM, submit a form in a third system). The
extension cannot know in advance which sites a given user's workflow will
touch. The content script attaches zero event listeners on any page until
the user explicitly clicks "Start Recording" in the side panel -- idle
pages produce no events and no data is read. Once a recording is active,
the extension automatically re-attaches to whichever tab or page the user
navigates to next, without further clicks, so the workflow capture is not
interrupted mid-task. A permission scoped to one site, or requested per-site
at the moment of navigation, cannot support this because Chrome requires a
user gesture to grant a new host permission, and page navigation during an
active recording is not a user gesture the extension can attach that
request to. No data is read from any tab the user has not started
recording on.
```

---

## 3. SINGLE-PURPOSE COMPLIANCE

**Stated purpose:** record browser workflow events (clicks, navigation, form-field labels) and
export them as a JSON bundle, with optional upload. That is narrow and defensible on its face.

**Where it drifts -- VERIFIED still present today:**

| Surface | File(s) | Status |
|---|---|---|
| Process-map flowchart viewer (sidebar) | `src/sidepanel/components/SidebarProcessMap.tsx`, `SidebarStepDrawer.tsx` | Present |
| Graph-visualization dependency | `package.json:22` `"@xyflow/react": "^12.10.1"` | Present |
| Downloadable HTML "Workflow Report" (executive summary, SOP, metrics) | `src/background/workflow-report-builder.ts`, generation logic + Map/SOP tabs in `src/sidepanel/screens/ProcessScreen.tsx:306-450` | Present |

The standalone in-extension **viewer app** (`src/viewer/`) flagged by the first two audits **has**
been removed -- VERIFIED: no `src/viewer/` directory exists in the current tree, and there is no
`web_accessible_resources` block left in `manifest.json` (it existed only to expose that viewer).
That is real, unreflected progress the trailing docs don't credit.

**Three audits, three different severities on what remains** -- worth being honest about the
disagreement rather than picking one side:
- CHROME-001 / CHROME-002 (May 26/27): called the Map/SOP/report surface a "second product,"
  MAJOR-CLEANUP, recommend removal.
- CHROME_EXTENSION_STORE_REVIEW_001 (June 18, the most granular, most recent pass): re-classified
  it as **"MIXED"** -- stats + Export tab are core, but concluded overall **"Single-purpose: PASSES"**
  because the map/report are generated *only from the just-recorded session's own data*, not a
  general-purpose tool a user could point at arbitrary content. It recommended pre-empting the
  concern in the store listing narrative rather than removing the surface.

**My assessment, reading the current code directly:** the June-18 read is the more defensible one.
`workflow-report-builder.ts` (VERIFIED, header comment) explicitly frames the report as "the primary
report artifact... generated automatically when a recording completes... the source of truth for any
downstream rendering" of the *same* session -- it is not a second, independent capability, it is a
second *view* of the one thing the extension collects. Competitor products in this exact category
(Scribe, Tango, per the June-18 competitive-researcher findings) ship the equivalent in-extension
step-list view without drawing single-purpose rejections. **This is a defensible product shape, not
a clear policy violation** -- but it is the one item in this entire audit that is a genuine judgment
call rather than a fact, and it is the most likely source of a reviewer clarification email if the
listing description doesn't address it head-on.

**Recommendation:** do not remove this surface as a submission prerequisite (removing it is real
engineering effort for a probability-reducing, not risk-eliminating, benefit). Instead, write the
detailed description (Section 4) to explicitly frame the Map/SOP/report tabs as "review your own
just-recorded session before exporting or uploading it" -- pre-empt the question rather than have it
show up as a rejection reason.

**Minor drift not worth blocking on:** dead exported functions `ensureAllTabsInjected`,
`isTabConfirmed` in `src/background/injection-manager.ts:72,147` are unused (VERIFIED via grep -- only
`injectIntoTab`, `onTabActivatedDuringRecording`, `clearInjectionState` are imported by
`background/index.ts:1`). Harmless to a reviewer, but it is dead code the CEO's own "no functions
that aren't needed" directive calls out; safe cleanup, no capture-surface risk, not a submission
blocker.

---

## 4. REQUIRED LISTING FIELDS -- READINESS STATE

Sourced against the current official Chrome Web Store docs (`developer.chrome.com/docs/webstore/cws-dashboard-listing` and `/program-policies/listing-requirements/`, fetched live for this audit) plus repo state.

| Field | Requirement | Current state | Status |
|---|---|---|---|
| **Name** | Required, accurate | `manifest.json:3` `"Ledgerium AI Recorder"` | **READY** (VERIFIED) |
| **Short description / Summary** | Required, <=132 chars, plain language | `manifest.json:5`, 128 chars (VERIFIED via direct count), plain language, accurately describes function | **READY** (VERIFIED) |
| **Detailed description** | Required (rejected if blank); no formal length cap enforced but expected to explain features/benefits comprehensively | Not drafted -- only the 128-char summary exists anywhere in the repo; `docs/runbooks/CHROME_STORE_SUBMISSION.md:335` says "paste from manifest.json description, expand with feature list" -- i.e. explicitly deferred, never written | **NOT READY** -- nice-to-have quality gap, not a hard blocker on its own (won't be "blank"), but should be written before submitting, and should address Section 3's single-purpose framing |
| **Category** | Required | Runbook proposes "Productivity" -- reasonable fit, never entered into a Dashboard (no listing exists) | **NOT READY** (process -- no listing exists yet) |
| **Language** | Required | English; content is English-only throughout | **READY** (REASONED) |
| **Screenshots** | Required: >=1, <=5, at 1280x800 or 640x400 | 4 files at `docs/store-assets/chrome/01-idle.png` through `04-upload-flow.png`, independently verified 1280x800 via PNG `IHDR` chunk per the commit message and re-confirmed present on disk by this audit; captured from the **real** built extension via `chromium.launchPersistentContext()`, not a mockup | **READY** (VERIFIED -- files exist, generation method is legitimate) |
| **Small promo tile (440x280)** | Required per current Dashboard docs ("mandatory except marquee tile") | Only an **HTML source** exists (`apps/extension-app/public/samples/promo-small-440x280.html`, a hand-styled marketing mockup) plus an unrun generation script (`scripts/capture-promo-images.ts`). **No PNG has ever been produced or committed** -- VERIFIED via filesystem search, zero `*promo*.png` files anywhere in the repo | **NOT READY -- BLOCKER** |
| **Marquee tile (1400x560)** | Optional | Script exists (`capture-promo-images.ts`) but unrun; not needed | N/A -- optional, skip |
| **Icon (128x128, plus 16/32/48 in the extension itself)** | Required | `manifest.json:24-29` declares all 4 sizes; `dist/icons/` VERIFIED to contain all 4 files matching manifest paths | **READY** (VERIFIED) |
| **Privacy policy URL** | Required | `apps/web-app/src/app/(public)/privacy/extension/page.tsx` exists, is dated effective 2026-06-18, and (per the Aug-16 runbook verification, not independently re-fetched live by this audit) resolves at `https://ledgerium.ai/privacy/extension` | **READY**, with one caveat: re-verify the live URL still returns 200 at actual submission time -- a 3-week-old verification is not a guarantee against site changes since then |
| **Single-purpose statement** | Required (Dashboard field, distinct from the manifest description) | Drafted in `CHROME_EXTENSION_STORE_REVIEW_001.md` Section 7; not yet entered into any Dashboard because no listing exists | **DRAFTED, NOT ENTERED** |
| **Permission justifications** (one per requested permission + host permission) | Required for each declared permission | Drafted for `storage`/`sidePanel`/`alarms`/`scripting`/`host_permissions` in `docs/runbooks/CHROME_STORE_SUBMISSION.md:244-288` -- **but that file also still includes a stale justification block for `tabs` (lines 273-279), a permission the manifest no longer declares.** Whoever executes the runbook must skip that block. | **DRAFTED for the 5 that matter; runbook needs a manual skip, not a fix, at submission time** |
| **Data-usage disclosures (Data Safety form)** | Required | Drafted in the runbook (table at lines 308-321); not yet entered into a Dashboard | See Section 5 for the exact answers this audit derived from the code |
| **Account requirement disclosure** | Required if the item needs an account to use core functionality | The **core recording/export function needs no account** -- VERIFIED: nothing in `content/`, `background/session-store.ts`, or the JSON-export path (`ProcessScreen.tsx:273-294`) touches auth. Only the **optional** upload/sync feature requires a Ledgerium account (API key). Disclose: "No account required for core functionality; an account is required only if you choose to upload/sync a recording to a Ledgerium workspace." | **READY to state** (REASONED from code) |
| **YouTube video link** | Listed under "Graphic Assets" on the current official Dashboard-fields page fetched for this audit, but historically not enforced as a hard gate in the live Dashboard UI | None exists in the repo | **UNCERTAIN -- verify directly in the Dashboard at submission time**; not treated as a go/no-go blocker here because the evidence for strict enforcement is mixed, but budget time for it in case the field is mandatory when you reach it |

---

## 5. DATA-USAGE DECLARATION -- DERIVED FROM WHAT THE CODE ACTUALLY DOES

These are the exact answers the Data Safety / Privacy Practices form questions resolve to, derived
by tracing the actual capture and storage code, not by reusing the prior drafts verbatim.

**Data collected (per current Chrome Web Store data-category taxonomy):**

| Category | Collected? | Evidence | Sent off-device? |
|---|---|---|---|
| Website content / form data | **Yes** | `content/label-extractor.ts`, `content/neighbor-context-extractor.ts` capture visible label text and nearby DOM context; `content/target-inspector.ts:145` captures `label`/`role`/`elementType` -- never field *values* except a boolean (`value_present`, `capture.ts:330,362,528`) | Only if the user clicks upload/sync (`background/uploader.ts`, HTTPS-only enforced at `uploader.ts:15` per the runbook's cited unit tests) |
| Web browsing activity / history | **Yes, scoped to the active recording** | `capture.ts:204-219` captures URL + title on navigation, but only while `isRecording` is true (`attachHistoryListeners` is only wired inside `startCapture()`) | Same -- local until user-initiated upload |
| Authentication information | **Yes -- the user's own Ledgerium API key, stored to authenticate the user's own optional upload** | `background/index.ts:23,59-62` -- stored in `chrome.storage.local` (VERIFIED migrated off `chrome.storage.sync`, see Section 6) | Sent only to the user-configured upload URL as a Bearer header (`uploader.ts:32-33`), never anywhere else |
| Personally identifiable information | **Partially, and actively minimized, not absent** | Page titles are screened for embedded emails/phones/SSNs/CC numbers before capture (`content/safe-page-title.ts`, VERIFIED -- falls back to a domain-derived label on any PII match); passwords, hidden fields, and named-sensitive fields (password/secret/token/api_key/credit_card/cvv/ssn/tax_id patterns) are excluded from inspection entirely (`content/target-inspector.ts:21-42`, delegating to `@ledgerium/policy-engine`'s `classifySensitivity`). Free-text neighbor-context extraction (`neighbor-context-extractor.ts`) and `state_change_details` (raw modal/toast text, `state-observer.ts`) are **not** run through the same heuristics as page titles -- this is a genuine, if narrow, residual PII-leak surface flagged by the June-18 audit and still present. Answer honestly on the form: **"Yes, may contain PII in edge cases"** -- do not certify a hard "no PII" -- that would be a misrepresentation given the known gap. |
| Keystroke content / typed text | **No** -- VERIFIED: `capture.ts:387-412` (`captureKeyboardIntent`) only fires for `Enter`/`Escape`/`Tab` (`INTENT_KEYS`, `capture.ts:25`) and records the key name (not typed content); the codebase's own type comments and privacy-policy copy match this. | -- | Confirms the CEO's claim: TRUE |
| Screenshots / screen content | **No** -- VERIFIED: zero references to `chrome.tabs.captureVisibleTab` or any screenshot/canvas API anywhere in `src/` | -- | Confirms the CEO's claim: TRUE |
| Financial / health / location | **No** | Nothing in the codebase touches any of these categories; financial-looking field types (credit card, etc.) are explicitly excluded, not collected-then-redacted | -- |
| Personal communications | **No** | -- | -- |

**Certification checkboxes (per current CWS Privacy Practices tab conventions):**
- "I do not sell or transfer user data to third parties" -- **check YES (true)**: VERIFIED zero
  third-party analytics/SDK imports in `apps/extension-app/src/` (telemetry.ts, the one outbound
  non-user-configured endpoint flagged by all three prior audits, has been removed -- VERIFIED, no
  `telemetry.ts` file exists in the current tree).
- "I do not use or transfer user data for purposes unrelated to my item's single purpose" -- **check
  YES**, conditioned on Section 3's framing being accurate (the Map/SOP/report views operate only on
  the session's own data).
- "This item does not collect or use data for personalized advertising / creditworthiness / lending" --
  **check YES**, nothing in the codebase does this.

**Required checkbox that must be answered honestly, not optimistically:** if the Dashboard asks
whether data handling has been reviewed for accuracy against the actual code, do not tick "verified"
without re-running the manual capture-certification checklist referenced in
`CHROME_EXTENSION_STORE_REVIEW_001.md` Section 5 -- the real-extension E2E harness only exercised 1 of
3 capture-path scenarios per the QA finding in that document as of June 18 (the Aug-13 runbook entry
claims this was subsequently fixed to 4/4 passing; this audit did not independently re-run it -- see
Section 7 checklist item 5).

---

## 6. BLOCKERS vs. NICE-TO-HAVES

### BLOCKERS (must resolve before Submit can be clicked)

| # | Item | Evidence | Fix owner |
|---|---|---|---|
| B-1 | Small promo tile PNG (440x280) does not exist | Filesystem search found zero `*promo*.png` files; only `apps/extension-app/public/samples/promo-small-440x280.html` (unrendered source) + `apps/extension-app/scripts/capture-promo-images.ts` (unrun script) | Engineering -- run the existing script, verify output dimensions the same way BLOCKER-8's screenshot script did (read the PNG `IHDR` chunk, don't trust viewport settings -- the same script family has a documented `deviceScaleFactor` bug per `docs/runbooks/CHROME_STORE_SUBMISSION.md:184-191`) |
| B-2 | No Chrome Web Store listing exists | `apps/web-app/src/lib/config.ts:16` `chromeStoreUrl: '.../placeholder'`; no Dashboard item has been created | Human (Google account, $5 one-time registration fee, Developer Dashboard) |
| B-3 | Detailed description, category, single-purpose statement, permission justifications, and Data Safety form have never been entered anywhere but a local runbook | `docs/runbooks/CHROME_STORE_SUBMISSION.md` -- all drafted, zero submitted | Human, using Sections 4/5 of this document plus the runbook |

### SHOULD-FIX (real, but won't independently cause rejection)

| # | Item | Evidence | Notes |
|---|---|---|---|
| S-1 | Stale `tabs` permission justification still in the runbook | `docs/runbooks/CHROME_STORE_SUBMISSION.md:273-279` -- manifest has no `tabs` permission (VERIFIED, `manifest.json:7`) | Skip this block when filling the Dashboard; do not paste it |
| S-2 | Detailed description not written | See Section 4 | Write it; use Section 3's framing for the Map/SOP surface |
| S-3 | Background service-worker message handler does not validate `sender.id` | `apps/extension-app/src/background/index.ts:362` -- parameter renamed `_sender` (unused), unlike the content script's own check at `content/index.ts:35` (`if (sender.id !== chrome.runtime.id) return false`) | Real security gap (a co-installed malicious extension with `runtime.connect` could send privileged messages), not a Chrome Store policy violation -- Chrome does not require this check to approve a listing |
| S-4 | Sync-URL field accepts `http://` at save time | `apps/extension-app/src/sidepanel/screens/IdleScreen.tsx:76-126` has no scheme validation | Mitigated in practice -- `uploader.ts:15` enforces HTTPS-only at actual send time (VERIFIED unit-tested per the runbook's BLOCKER-5 entry) -- this is defense-in-depth, not a live vulnerability |
| S-5 | Dead exported functions in `injection-manager.ts` | `ensureAllTabsInjected` (line 72), `isTabConfirmed` (line 147) -- unused, VERIFIED via grep of all call sites | Contradicts the CEO's own "no functions that aren't needed" directive; zero capture-surface risk to delete (not imported anywhere) |
| S-6 | Single-purpose surface (Map/SOP/report) unresolved across 3 audits | Section 3 | Judgment call -- recommend addressing via listing copy, not code removal, ahead of first submission |

### NICE-TO-HAVE (post-submission or opportunistic)

- Marquee promo tile (1400x560) -- optional per Chrome docs.
- YouTube video link -- uncertain enforcement; low cost to add later if the Dashboard blocks on it.
- Re-run the full real-extension manual capture checklist (`CHROME_EXTENSION_STORE_REVIEW_001.md`
  Section 5) fresh before zipping, since it has not been re-verified by this audit and the harness has
  a known historical blind spot (only 1 of 3 capture-path scenarios exercised as of that document's
  writing -- the Aug-13 runbook entry claims this was subsequently fixed to 4/4 passing; worth a
  fresh run, not a fresh audit).
- `@xyflow/react` bundle-size reduction (replace with CSS/flexbox) -- cosmetic, no policy impact.

### Already fixed since the trailing audits (verified today, not credited by any prior artifact)

- `viewer/` standalone app: **removed** (no `src/viewer/` directory exists).
- `telemetry.ts` + non-user-configured analytics endpoint: **removed** (no file exists; VERIFIED via file listing).
- `tabs` permission: **removed** from the manifest (VERIFIED, `manifest.json:7`); resolves the CHROME-001-vs-CHROME-002 disagreement in favor of the June-18 recommendation.
- `activeTab`: **not present** -- the redundancy question the first two audits argued about is moot; it was never re-added.
- `web_accessible_resources`: **removed** (was only needed by the now-removed viewer).
- API key storage: **migrated to `chrome.storage.local`** with a one-time migration path from legacy `chrome.storage.sync` data (`background/index.ts:34-62`, with dedicated tests in `settings-migration.test.ts`) -- the June-18 audit's P0-2 "silent auth failure" finding is resolved.
- Stored-XSS in the downloadable HTML report (June-18 P0-1): **fixed** -- `ProcessScreen.tsx` now runs every interpolated value through an `escapeHtml()` function (VERIFIED, 20+ call sites at lines 333-442).
- Raw, unscrubbed `page_title` (June-18 P1-2): **fixed** -- `content/safe-page-title.ts` screens titles for embedded PII before capture, with a safe domain-derived fallback.
- Console-log stripping in production: **VERIFIED live** -- `dist/` contains zero `console.log` occurrences (checked directly, not just re-reading the runbook's claim), and `vite.config.ts` esbuild `drop` config confirms why.
- Icons, `incognito: not_allowed`, and real (non-mockup) screenshots: **VERIFIED present in `dist/`** exactly matching the source manifest.

---

## 7. SUBMISSION CHECKLIST (execute in order)

Items marked **[HUMAN]** cannot be done by an agent -- account, payment, or policy-acceptance actions.

1. **[HUMAN]** Create/confirm a Google account for the Developer Dashboard; pay the one-time $5 registration fee if not already paid.
2. Generate the missing promo tile. Run the existing `capture-promo-images.ts` script (or regenerate `promo-small-440x280.html` into a PNG by another means), then independently verify the output is exactly 440x280 by reading the file's actual PNG dimensions -- do not trust a viewport/clip setting, per the documented `deviceScaleFactor` bug in the sibling screenshot script.
3. Write the detailed description (Section 4), incorporating the single-purpose framing from Section 3 (frame the Map/SOP/report tabs as "review your own session," not a separate tool).
4. Re-verify the privacy policy URL is live: fetch `https://ledgerium.ai/privacy/extension` and confirm HTTP 200 at submission time, not relying on the 2026-08-16 verification.
5. Re-run the full test suite and a fresh production build as a final gate: `pnpm --filter @ledgerium/extension-app test`, `pnpm --filter @ledgerium/extension-app typecheck`, `NODE_ENV=production pnpm --filter @ledgerium/extension-app build`, then re-check `dist/` for zero `console.log` occurrences and the 4 icon files -- do not assume the copy already in `dist/` today is still current if any code has changed since it was built.
6. Recommended, not required: manually load the freshly-built `dist/` as an unpacked extension in a real Chrome profile and run one real recording session end-to-end (record, multi-tab, stop, export JSON, and separately test the optional upload path) before zipping -- this is the one gate nothing in this audit substitutes for, per the Extension Reliability Invariant's own validation rule.
7. Zip `dist/` for upload (`cd apps/extension-app/dist && zip -r ../../../ledgerium-recorder-v2.0.0.zip .`).
8. **[HUMAN]** Log into the Chrome Web Store Developer Dashboard, click "Add new item," and upload the zip.
9. **[HUMAN]** Complete the Store Listing tab: name, the description from step 3, category (Productivity, or your final choice), language (English), the 4 real screenshots, and the promo tile from step 2.
10. Enter the single-purpose statement and the 5 permission justifications (storage / sidePanel / alarms / scripting / host_permissions `<all_urls>`) from Section 2 and the runbook -- **skip the stale `tabs` block** (S-1).
11. Complete the Privacy Practices / Data Safety form using the exact answers derived in Section 5 of this document, including the honest "may contain PII in edge cases" answer rather than a blanket "no PII."
12. Enter the privacy policy URL from step 4.
13. **[HUMAN]** Read and accept the Chrome Web Store Developer Program Policies / Terms, if not already accepted on this account.
14. **[HUMAN]** Set visibility (Unlisted for private testing first, or Public) and click Submit for review.
15. After first-pass approval, update `apps/web-app/src/lib/config.ts:16` (`chromeStoreUrl`) with the real listing URL -- this is the one code change this whole process ends in, and it happens *after* approval, not before.
