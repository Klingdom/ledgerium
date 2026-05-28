# Chrome Web Store Submission Runbook

**Extension**: Ledgerium AI Recorder v2.0.0
**Artifact reference**: `docs/meta/CHROME_STORE_REVIEW_001.md`
**Target review outcome**: MINOR-CLEANUP (post PR-CHROME-A) → READY-TO-SUBMIT (post PR-CHROME-B)

---

## Pre-Submission Checklist

Run this checklist in order before uploading the `.zip` to the Chrome Web Store Dashboard.

### BLOCKING — Must Pass Before Any Submission

- [ ] **BLOCKER-1: chrome.storage.session permission coverage verified**
  Manifest declares `"storage"` which covers `local + sync + session` in MV3 (Chrome 102+).
  Validate: install unpacked extension → record a session → stop → restart browser → confirm
  session state is correctly cleared and no errors appear in `chrome://extensions/` error panel.

- [ ] **BLOCKER-2: console.log stripped from production bundle**
  `background/index.ts` contains 9+ `console.log` statements with `[LDG-BG]` prefix.
  Verify via `grep -r "console\.log" apps/extension-app/dist/`.
  Expected result: 0 matches.
  _Configured in `vite.config.ts` via `esbuild.drop: ['console', 'debugger']` for production._

- [ ] **BLOCKER-3: Icon sizes 16/32/48/128 present**
  Files required:
  - `apps/extension-app/icons/icon-16.png`
  - `apps/extension-app/icons/icon-32.png`
  - `apps/extension-app/icons/icon-48.png`
  - `apps/extension-app/icons/icon-128.png`
  Chrome Store **requires** 16 + 48 as minimum; 32 + 128 are expected by Chrome UI.
  All four declared in `manifest.json` `icons` and `action.default_icon`.

- [ ] **BLOCKER-4: Real-extension E2E tests verified or excluded**
  `e2e/real-extension/sidepanel-real.spec.ts` tests 2+3 skipped since iter 070 due to
  `chrome.tabs.query()` returning empty array on Windows. Either re-enable on Linux CI or
  obtain explicit CEO platform-exclusion decision before submission.

- [ ] **BLOCKER-5: uploader.ts failure paths tested**
  HTTPS rejection / non-200 response / timeout abort paths have no unit tests. Add before
  submission to ensure upload failures surface clearly to users.

- [ ] **BLOCKER-6: `"incognito": "not_allowed"` declared in manifest**
  Confirmed present in `manifest.json` at top level.

- [ ] **BLOCKER-7: Privacy policy hosted at `ledgerium.ai/privacy/extension`**
  Page exists at `apps/web-app/src/app/(public)/privacy/extension/page.tsx`.
  Verify production URL resolves: `https://ledgerium.ai/privacy/extension`.
  The privacy policy URL entered on the Chrome Web Store submission form must match exactly.

- [ ] **BLOCKER-8: Chrome Store screenshots created (1–5 at 1280×800)**
  No screenshots currently in repository. Create and upload before submission.
  Recommended shots: idle state, active recording, step review screen, upload flow.

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
