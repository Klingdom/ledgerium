# Chrome Web Store Submission Runbook

**Extension**: Ledgerium AI Recorder v2.0.0
**Artifact reference**: `docs/meta/CHROME_STORE_REVIEW_001.md`
**Target review outcome**: MINOR-CLEANUP (post PR-CHROME-A) → READY-TO-SUBMIT (post PR-CHROME-B)

---

## Pre-Submission Checklist

Run this checklist in order before uploading the `.zip` to the Chrome Web Store Dashboard.

### BLOCKING — Must Pass Before Any Submission

- [x] **BLOCKER-1: chrome.storage.session permission coverage verified — CLOSED 2026-08-16**
  **Verdict: manifest is sufficient. No manifest change made.**
  `chrome.storage.session` is a property of the single `chrome.storage` namespace
  (alongside `.local`, `.sync`, `.managed`), gated entirely by the one `"storage"`
  permission already declared in `manifest.json`. There is no separate `"session"`
  permission in the Chrome extensions permission model — this was confirmed against
  the official Chrome extension type definitions (`@types/chrome@0.0.268`,
  generated from Chrome's own API schema), where `chrome.storage.session` is
  declared as `export var session: SessionStorageArea` directly inside
  `declare namespace chrome.storage { ... }` — the same namespace `local` and
  `sync` live in, with no distinct permission annotation (`node_modules/@types/chrome/index.d.ts:8491-8528`).
  This matches Chrome's own docs: `chrome.storage.session` was added to the
  existing `storage`-permission-gated API surface in Chrome 102, not introduced
  as a new permission.
  **Access-level note (also verified, not just assumed):** `chrome.storage.session`
  defaults to `AccessLevel.TRUSTED_CONTEXTS` — i.e. readable only from the
  extension's own trusted contexts (service worker, extension pages), NOT from
  content scripts, unless the extension explicitly calls
  `chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })`.
  This extension's only 3 call sites for `chrome.storage.session` are all in
  `background/index.ts` (the MV3 service worker — lines ~97, ~101, ~108) —
  a repo-wide grep confirms `chrome.storage.session` is never referenced from
  any content-script file. The default `TRUSTED_CONTEXTS` access level is
  therefore already correct for this codebase's actual usage; no
  `setAccessLevel` call is needed and none is present.
  **Conclusion: the existing `"permissions": ["storage", ...]` declaration in
  `manifest.json` is sufficient and correct as-is. No manifest change was made**
  (manifest `permissions` is on the CEO-gated forbidden-silent-changes list per
  CLAUDE.md § Extension Reliability Invariant, and none was required here).
  Runtime validation (install unpacked → record → stop → restart browser →
  confirm no `chrome://extensions/` error panel entries) remains a recommended
  smoke-test before upload but is not a code/config change and does not block
  this verification.

- [x] **BLOCKER-2: console.log stripped from production bundle — CLOSED (iter 097; re-verified 2026-08-16)**
  `background/index.ts` contains 9+ `console.log` statements with `[LDG-BG]` prefix.
  Verify via `grep -r "console\.log" apps/extension-app/dist/`.
  Expected result: 0 matches.
  _Configured in `vite.config.ts` via `esbuild.drop: ['console', 'debugger']` for production._
  **Verification 2026-08-16:** fresh `pnpm --filter @ledgerium/extension-app build`, then
  `grep -rl "console\.log" apps/extension-app/dist/` → **0 matching files**.

- [x] **BLOCKER-3: Icon sizes 16/32/48/128 present — CLOSED (iter 097; re-verified 2026-08-16)**
  Files required:
  - `apps/extension-app/icons/icon-16.png`
  - `apps/extension-app/icons/icon-32.png`
  - `apps/extension-app/icons/icon-48.png`
  - `apps/extension-app/icons/icon-128.png`
  Chrome Store **requires** 16 + 48 as minimum; 32 + 128 are expected by Chrome UI.
  All four declared in `manifest.json` `icons` and `action.default_icon`.
  **Verification 2026-08-16:** `apps/extension-app/dist/icons/` contains
  `icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png`.

- [x] **BLOCKER-4: Real-extension E2E tests verified or excluded — CLOSED 2026-08-13**
  Previously: tests 2+3 skipped since iter 070, attributed to `chrome.tabs.query()`
  returning an empty array on Windows. **That diagnosis was wrong.** Un-skipping both
  unmodified and running them 7× produced 7 clean passes — their assertions are driven by
  the state broadcast in `handleStart()`, which fires *before* the tabs query.
  The real gap was structural: no test in the file ever opened a real content page, so
  content-script injection, `RAW_EVENT_CAPTURED` and `SessionStore` persistence were never
  exercised by any test. That is the blind spot behind the iter 097 and iter 099 capture
  regressions.
  **Resolution:** tests 2+3 un-skipped, plus a new test 4 that serves a real page over local
  HTTP, records a session, performs a real click and keystroke, then reads
  `chrome.storage.local` back through the real service worker.
  **Harness is now 4/4 passing on Windows — no platform exclusion needed.**
  Proven to catch regressions: reverting the `getSafePageTitle()` call sites fails it with a
  PII-leak message; disabling `attachDOMListeners()` fails it with a zero-events message.

- [x] **BLOCKER-5: uploader.ts failure paths tested — CLOSED 2026-08-16**
  Added `apps/extension-app/src/background/uploader.test.ts` (21 tests; 0 → 21).
  Covers: HTTPS enforcement (http/empty/ftp rejection, all short-circuiting
  before `fetch` is ever called), the success path (progress sequence,
  headers, body), non-200 handling (4xx and 5xx — both format identically,
  malformed/non-JSON error bodies, missing `error` field, 200-char message
  truncation), and timeout/abort/network failures (30s `AbortController`
  timeout, no-abort-on-timely-response, generic network errors, non-Error
  thrown values, `clearTimeout` always firing). All paths return a
  `{ success: false, error }` result rather than throwing, and
  `background/index.ts:320-327` broadcasts `result.error` to the sidepanel via
  `UPLOAD_PROGRESS` — confirmed by reading the call site — so failures do
  reach the user through the existing UI, not silently.

  **Finding — NOT fixed (test-only scope; production code is CEO-gated):**
  On a failed upload (non-2xx response OR any thrown/rejected error, including
  timeout), `uploadBundle` never calls `onProgress(100)`. The progress callback
  sequence is `10 → 40 → 90` for a non-2xx response and only `10 → 40` for a
  thrown/rejected error (fetch reject happens after the `onProgress(40)` call
  but before `onProgress(90)`, which only runs after a successful `await fetch`
  resolves). This means the UI's last-known progress value for `uploadBundle`
  itself can be left at 40% or 90% instead of a value reflecting "done, but
  failed." In practice `background/index.ts` papers over this by always
  broadcasting a final `UPLOAD_PROGRESS` at `percent: 100` with
  `status: 'failed'` once `uploadBundle` returns — so today's end-to-end
  behavior is correct — but the discrepancy is between `uploadBundle`'s
  self-reported progress and the caller's re-normalization, not something
  `uploadBundle` itself guarantees. Documented as regression-locking tests
  (`'reports progress up to 90 but never reaches 100 on a failed response'`,
  `'stops progress reporting at 40 on network failure'`); no production code
  changed.

- [x] **BLOCKER-6: `"incognito": "not_allowed"` declared in manifest — CLOSED (iter 097; re-verified 2026-08-16)**
  Confirmed present in `manifest.json` at top level.
  **Verification 2026-08-16:** read from the built `dist/manifest.json` → `incognito: "not_allowed"`.

- [x] **BLOCKER-7: Privacy policy hosted at `ledgerium.ai/privacy/extension` — CLOSED (iter 097; re-verified 2026-08-16)**
  Page exists at `apps/web-app/src/app/(public)/privacy/extension/page.tsx`.
  The privacy policy URL entered on the Chrome Web Store submission form must match exactly.
  **Verification 2026-08-16:** live fetch of `https://ledgerium.ai/privacy/extension` → **HTTP 200**,
  title `Extension Privacy Policy — Ledgerium AI Recorder`, permission disclosures present.
  _(A canonical tag was added to this page 2026-08-16; it had been shipping without one.)_

- [x] **BLOCKER-8: Chrome Store screenshots created (1–5 at 1280×800) — CLOSED 2026-08-19**
  4 screenshots at `docs/store-assets/chrome/`, verified 1280×800 by independently
  reading each file's PNG `IHDR` chunk (not assumed from viewport settings):

  | File | Dimensions | Size |
  |---|---|---|
  | `01-idle.png` | 1280×800 | ~36 KB |
  | `02-active-recording.png` | 1280×800 | ~39 KB |
  | `03-step-review.png` | 1280×800 | ~42 KB |
  | `04-upload-flow.png` | 1280×800 | ~51 KB |

  **These are real captures, not mockups.** Each screenshot loads the actual
  unpacked `dist/` build via `chromium.launchPersistentContext()` +
  `--load-extension` (the same real-extension pattern proven in
  `e2e/real-extension/sidepanel-real.spec.ts`), drives a real recording
  session — real background service worker, real content-script injection,
  real message bus, real process engine — against a real local HTTP fixture
  page (a small non-PII "Acme Internal Tools" expense-report demo form, no
  network calls, no PII, no real third-party company referenced), and
  screenshots the real sidepanel UI reacting to it. The activity name used
  ("Submit expense report") is the product's own placeholder example text.

  Chrome's native side panel is rendered by the browser's own UI chrome,
  which Playwright/CDP cannot screenshot (screenshots are per-page only), so
  there is no way to automate one screenshot showing a real webpage and the
  real *docked* side panel simultaneously. Each image is instead two real,
  unaltered screenshots of the *same live session at the same moment* — the
  fixture page on the left, the real sidepanel on the right — placed
  edge-to-edge at native resolution with no scaling, no added text, no
  invented graphics, and no fake browser chrome. This is what a user
  actually sees on screen when the side panel is open next to the page being
  recorded; no pixel in either half is invented.

  **States captured, and how each was reached:**
  1. **Idle** — fresh sidepanel load, before starting a session.
  2. **Active recording** — after clicking Start Recording, real click +
     real typed input into the fixture form's Vendor and Amount fields,
     captured through the real content-script → background pipeline; the
     live step feed shows the real derived step.
  3. **Step review** — after clicking Submit on the fixture form and then
     Stop & Review; sidepanel `ProcessScreen`, Map tab, showing the real
     process map derived from the session.
  4. **Upload flow** — same session, sidepanel `ProcessScreen` Export tab
     (Open in Ledgerium AI Website / Download Workflow Report / Export
     JSON), in its real ready (pre-click) state.

  **State NOT captured, stated plainly rather than faked:** a completed
  ("Upload complete") progress bar. `background/uploader.ts` enforces
  HTTPS-only for the sync URL (see BLOCKER-5), so driving a real completed
  upload would require standing up a locally-trusted HTTPS endpoint inside
  the capture script (self-signed cert + `--ignore-certificate-errors`).
  That is achievable but was judged not worth the added moving parts for one
  screenshot; screenshot 4 shows the real Export/upload screen instead.

  **A real defect was found and avoided, not fixed:** the pre-existing
  `scripts/capture-sidepanel-screenshots.ts` (unused — no output ever
  committed) composites a static HTML sample into a hand-built fake browser
  chrome with invented marketing copy and a fabricated address bar
  (`app.hubspot.com · /contacts/482671`) that nothing ever navigated to —
  none of its output pixels come from the running extension. It also sets
  `deviceScaleFactor: 2` while clipping to 1280×800 CSS pixels, which
  produces a **2560×1600** PNG, not the 1280×800 Chrome Web Store requires —
  confirmed empirically while building the new script. That script was left
  in place (out of scope to modify) but was not reused or repaired; the new
  script below replaces it for Store-submission purposes.

  **Regenerate when the UI changes:**
  ```bash
  pnpm --filter @ledgerium/extension-app build
  pnpm --filter @ledgerium/extension-app capture:store-screenshots
  # or, from apps/extension-app:
  #   pnpm exec tsx scripts/capture-chrome-store-screenshots.ts
  ```
  Source: `apps/extension-app/scripts/capture-chrome-store-screenshots.ts`
  (extensively commented — see its file header for the full rationale).
  Real-extension service-worker startup is occasionally flaky (same
  characteristic documented for `test:e2e:real`); just re-run on failure.
  The script independently verifies every output file's actual on-disk PNG
  dimensions from its `IHDR` chunk before declaring success — it does not
  trust viewport/clip settings, per the `deviceScaleFactor` defect above.

---

## Build and Bundle Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Run tests
pnpm --filter @ledgerium/extension-app test

# 3. Typecheck
pnpm --filter @ledgerium/extension-app typecheck

# 4. Production build
NODE_ENV=production pnpm --filter @ledgerium/extension-app build

# 5. Verify console.log stripping
grep -r "console\.log" apps/extension-app/dist/
# Expected output: (empty — 0 matches)

# 6. Verify icon files present in build output
ls apps/extension-app/dist/icons/
# Expected: icon-16.png  icon-32.png  icon-48.png  icon-128.png

# 7. Create zip for upload
cd apps/extension-app/dist
zip -r ../../../ledgerium-recorder-v2.0.0.zip .
```

---

## Chrome Web Store Permission Justification Strings

Enter these verbatim in the **Permission Justification** fields on the Chrome Web Store Developer Dashboard.

### `storage`
```
Persists the active recording session's event array across service-worker
restarts and retains a local history of up to 25 completed recordings for
user review before upload. Also stores the user's upload URL for the
configured Ledgerium workspace.
```

### `sidePanel`
```
The recorder's user interface (start/pause/stop controls, live step feed,
review screen) is delivered as a Chrome side panel so the user can keep the
recording controls visible without leaving the page being recorded.
```

### `alarms`
```
A 25-second keep-alive alarm prevents the MV3 service worker from being
evicted mid-recording. The alarm is created on recording start and cleared
on stop; it does not run when the extension is idle.
```

### `scripting`
```
Programmatically injects the recording content script into the currently
active tab when the user starts a session, so already-open pages can be
recorded without a refresh.
```

### `tabs`
```
Required to detect tab navigation events (URL changes, tab switches) via
chrome.tabs.onUpdated and chrome.tabs.onActivated during an active recording
session. Without this permission, the extension cannot track multi-tab
workflows, which is a core feature of workflow recording.
```

### `host_permissions: <all_urls>`
```
The extension records browser workflows on any user-chosen website. Recording
requires content-script access to the tab being recorded. The trust model is
user-initiated: nothing is captured passively. The content script is injected
only when the user clicks "Start Recording" in the side panel; idle pages
produce zero events.
```

---

## Chrome Web Store Privacy Practices Form

### Privacy policy URL
```
https://ledgerium.ai/privacy/extension
```

### Privacy listing copy (≤400 characters — verbatim per CHROME_STORE_REVIEW_001 §5)
```
Ledgerium AI Recorder captures DOM events (clicks, navigation, form labels)
from the single tab you actively record. Recordings are stored locally in
your browser and, if you configure an upload URL, sent over HTTPS to your
own Ledgerium workspace. Sensitive fields (passwords, credit cards, SSN) are
masked at capture. No data is sold or shared with third parties.
```

### Data collection disclosures (Chrome Web Store Data Safety section)

| Data category | Collected | Sent to server | Required |
|---|---|---|---|
| Website content (DOM text, form labels, button labels) | Yes | Only on user upload | For core functionality |
| User activity (clicks, navigations, form-field changes) | Yes | Only on user upload | For core functionality |
| Web history (URLs visited during active recording) | Yes | Only on user upload | For core functionality |
| Authentication information (API key / Bearer token) | Yes | Only to user-configured endpoint | Optional (upload feature) |
| Browsing history outside active recording | No | — | — |
| Personal communications | No | — | — |
| Financial information | No | — | — |
| Health information | No | — | — |
| Location data | No | — | — |

**Data sale**: No — verified zero third-party analytics SDKs (PostHog / Mixpanel / Segment / Sentry) in extension bundle.

**Field values never captured**: Only `value_present: boolean` is recorded. Passwords, hidden inputs, and fields matching sensitive selector patterns (password / secret / token / api_key / credit_card / cvv / ssn / tax_id) are masked at the policy-engine layer.

---

## Submission Steps

1. Navigate to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **Add new item** → upload `ledgerium-recorder-v2.0.0.zip`
3. Complete **Store listing** fields:
   - **Name**: `Ledgerium AI Recorder`
   - **Summary** (≤132 chars): `Record browser workflows and export them as JSON. Optional upload to your Ledgerium workspace.`
   - **Description**: paste from `manifest.json` description, expand with feature list
   - **Category**: `Productivity`
   - **Language**: English
4. Upload **screenshots** (1280×800, 1–5 images)
5. Complete **Privacy practices** section (see above)
6. Complete **Permission justifications** section (see above)
7. Set **Visibility**: Unlisted initially for private testing
8. Click **Submit for review**

---

## Review Timeline and Expectations

- **Standard review window**: 3–7 business days (initial submission)
- **After code changes or policy responses**: 1–3 additional business days
- **Soft-reject response time**: Respond within 30 days or item is unpublished

### Two-phase target path (per CHROME_STORE_REVIEW_001 §8)

| Phase | PR | Expected verdict | Work |
|---|---|---|---|
| A | PR-CHROME-A | **MINOR-CLEANUP** | Manifest cleanup + icons + privacy policy + console stripping |
| B | PR-CHROME-B | **READY-TO-SUBMIT** | Capability elimination (viewer / report-builder / telemetry removal) |

### If you receive a policy violation email

1. Read the cited policy section carefully
2. Reference `docs/meta/CHROME_STORE_REVIEW_001.md` §2–§6 for remediation guidance
3. Make the required code changes in a new PR
4. Re-upload the new zip to the existing Store item (do not create a new item)
5. Click **Resubmit** in the dashboard
6. Respond to the policy email with a brief explanation of changes made

---

## Post-Approval Steps

1. **Change Visibility** from Unlisted → Public in the Developer Dashboard
2. **Update `EXTENSION_CONFIG.chromeStoreUrl`** in `apps/web-app/src/lib/config.ts`:
   ```typescript
   chromeStoreUrl: 'https://chrome.google.com/webstore/detail/ledgerium-ai-recorder/<actual-id>',
   ```
3. **Update direct download link** if the `.zip` sideload path is still referenced
4. **Verify install flow** end-to-end from the Store listing
5. **Announce** via changelog + website

---

## Version Increment Guidelines

| Change type | Version bump | Store re-review required |
|---|---|---|
| Bug fix (no new permissions) | Patch (2.0.x) | No — auto-update |
| New feature (no new permissions) | Minor (2.x.0) | No — auto-update |
| New permission added | Major (x.0.0) | Yes — full re-review |
| Host permission change | Any | Yes — full re-review |

---

## Related Documents

- `docs/meta/CHROME_STORE_REVIEW_001.md` — full multi-agent review artifact
- `apps/extension-app/manifest.json` — current manifest
- `apps/web-app/src/app/(public)/privacy/extension/page.tsx` — extension privacy policy
- `apps/extension-app/vite.config.ts` — production build config
