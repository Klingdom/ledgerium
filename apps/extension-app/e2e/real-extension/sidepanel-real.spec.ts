/**
 * Real-extension E2E harness — Ledgerium AI Recorder (iter 070).
 *
 * Counterpart to: e2e/recording-lifecycle.spec.ts (static-harness, 4 tests)
 *
 * WHY THIS EXISTS:
 *   The static harness serves dist/ via HTTP and mocks chrome.* — fast and
 *   deterministic, ideal for CI.  But it cannot exercise:
 *     - The REAL MV3 background service worker (background/index.ts)
 *     - Real chrome.runtime.sendMessage transport between sidepanel and SW
 *     - Real chrome.storage.local persistence
 *     - Real content-script injection
 *
 *   This harness loads the actual unpacked extension via
 *   chromium.launchPersistentContext() + --load-extension and validates
 *   the full sidepanel ↔ service-worker message protocol on real Chrome APIs.
 *
 * PREREQUISITE:
 *   Extension must be built first: pnpm --filter extension-app build
 *   Tests will throw a clear error if dist/ is missing.
 *
 * EXTENSION-ID RESOLUTION PATTERN (MV3 service worker):
 *   MV3 extensions use a service worker, not a background page.
 *   Playwright exposes service workers via context.serviceWorkers().
 *   After launchPersistentContext resolves, we wait for the SW to register
 *   (context.waitForEvent('serviceworker')) and parse the extension ID from
 *   the SW's URL: chrome-extension://<id>/service-worker-loader.js
 *   That <id> is then used to construct the sidepanel URL:
 *   chrome-extension://<id>/src/sidepanel/index.html
 *
 * STABILITY:
 *   Real-extension tests are flakier than the static harness.  retries: 1 is
 *   always on in playwright.real-ext.config.ts.  Tests use waitFor patterns
 *   with generous timeouts rather than fixed waitForTimeout delays.
 *   Tests that are not stable on Windows on first attempt are marked .skip()
 *   with a comment — re-enable as platform support matures.
 *
 * WINDOWS NOTES:
 *   - headless: false is required; extension loading does not work reliably
 *     with headless Chromium on Windows in Playwright 1.59.x
 *   - Profile dirs use os.tmpdir() which resolves correctly on Windows
 *   - fs.rmSync with { recursive: true, force: true } is cross-platform safe
 *   - Path separators: path.resolve() normalises separators on all platforms
 */

import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import http from 'http';
import type { AddressInfo } from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Constants ────────────────────────────────────────────────────────────────

const DIST_PATH = path.resolve(__dirname, '../../dist');
const SIDEPANEL_RELATIVE = 'src/sidepanel/index.html';

/** Timeout for waiting for the service worker to register after extension load. */
const SW_STARTUP_TIMEOUT_MS = 20_000;

/** Timeout for waiting for the React root to mount inside the sidepanel. */
const REACT_MOUNT_TIMEOUT_MS = 15_000;

// ─── Helper: resolve extension ID from a registered service worker URL ────────

/**
 * Parse the extension ID from a chrome-extension:// service worker URL.
 *
 * chrome-extension://<extension-id>/service-worker-loader.js
 *                   ^^^^^^^^^^^^^^^^
 * Returns the extension ID string, or throws if the URL is not parseable.
 */
function extensionIdFromSwUrl(swUrl: string): string {
  // URL format: chrome-extension://<id>/path
  const match = swUrl.match(/^chrome-extension:\/\/([a-z]{32})\//);
  if (!match || !match[1]) {
    throw new Error(
      `Cannot parse extension ID from service worker URL: "${swUrl}". ` +
      'Expected format: chrome-extension://<32-char-id>/...'
    );
  }
  return match[1];
}

// ─── Helper: local HTTP fixture server (real capture-pipeline validation) ─────
//
// Content scripts are declared in manifest.json with `"matches": ["<all_urls>"]`
// (see manifest.json:15). `<all_urls>` expands to http(s)/file/ftp schemes — it
// does NOT include `data:` URLs, and `file://` requires the
// "Allow access to file URLs" extension toggle, which is OFF by default and
// cannot be flipped from a fresh unpacked-extension profile in this harness.
// A real local HTTP server is therefore the only reliable way to get a page
// that Chrome will genuinely content-script-inject into, using only Node
// built-ins (no new dependency).
//
// The <title> below is the EXACT canonical PII string already used by this
// repo's own PII-screening unit tests (safe-page-title.test.ts:41,
// live-steps.test.ts:152) — an email address embedded mid-string, which is
// the case the unanchored EMAIL regex in free-text-screen.ts exists to catch.

const FIXTURE_PAGE_TITLE = 'Inbox (3) – phil@mediafier.ai';

const FIXTURE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${FIXTURE_PAGE_TITLE}</title>
</head>
<body>
  <h1>Ledgerium real-extension capture fixture</h1>
  <button id="test-action-button">Do the thing</button>
  <input id="test-text-input" type="text" placeholder="type here" />
</body>
</html>`;

/**
 * Starts a minimal local HTTP server serving FIXTURE_HTML on an ephemeral
 * port, reached via the `localhost` hostname. `deriveAppLabel()`
 * (shared/utils.ts:47-48) special-cases `hostname === 'localhost'` to
 * return the constant `'Local Dev'` — so if the PII-laden fixture title is
 * correctly rejected, the safe fallback value is deterministic and
 * assertable, not just "some non-PII string".
 */
function startFixtureServer(): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(FIXTURE_HTML);
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo | null;
      if (!address) {
        reject(new Error('Fixture HTTP server failed to bind to a port.'));
        return;
      }
      resolve({
        url: `http://localhost:${address.port}/`,
        close: () => new Promise<void>(res2 => server.close(() => res2())),
      });
    });
  });
}

// ─── Helper: read chrome.storage.local from the real background SW ────────────
//
// Session events are persisted under a session-scoped key by SessionStore
// (background/session-store.ts). The exact key/shape (verified by reading
// that file, not guessed):
//   STORAGE_KEY_SESSION               = 'ledgerium_active_session'
//     -> SessionMeta, including `sessionId`
//   STORAGE_KEY_SESSION_EVENTS_PREFIX = 'ledgerium_active_session_events_'
//     -> STORAGE_KEY_SESSION_EVENTS_PREFIX + sessionId ->
//        { persistSchemaVersion, rawEvents, canonicalEvents, policyLog, liveSteps }
// (see shared/constants.ts:13,31 and session-store.ts's PersistedSessionEvents
// interface). The literals are duplicated here rather than imported from
// src/shared/constants.ts to keep this harness self-contained and free of
// any runtime import from production source — this file is test code only.

const STORAGE_KEY_SESSION = 'ledgerium_active_session';
const STORAGE_KEY_SESSION_EVENTS_PREFIX = 'ledgerium_active_session_events_';

type LedgeriumExtensionContext = Awaited<ReturnType<typeof chromium.launchPersistentContext>>;
type ServiceWorkerHandle = ReturnType<LedgeriumExtensionContext['serviceWorkers']>[number];

/**
 * Reads a single key out of chrome.storage.local by evaluating inside the
 * REAL background service worker's execution context (not a mock). Returns
 * `undefined` if the key is not present.
 */
async function readStorageValue<T>(sw: ServiceWorkerHandle, key: string): Promise<T | undefined> {
  return sw.evaluate((storageKey: string) => {
    return new Promise<unknown>(resolve => {
      // `chrome` is a real global inside the extension service worker's own
      // execution context (this callback runs there, not in this Node file).
      // @ts-ignore -- e2e/** is intentionally outside tsconfig's `include`.
      chrome.storage.local.get([storageKey], (result: Record<string, unknown>) => {
        resolve(result[storageKey]);
      });
    });
  }, key) as Promise<T | undefined>;
}

interface PersistedSessionMetaShape {
  sessionId?: string;
}

interface PersistedSessionEventsShape {
  rawEvents?: Array<Record<string, unknown>>;
}

// ─── Test 1: Extension loads and sidepanel mounts ─────────────────────────────
//
// Validates:
//   - The extension installs without errors in a fresh profile
//   - The service worker registers (extension ID resolved from SW URL)
//   - Navigating to chrome-extension://<id>/src/sidepanel/index.html works
//   - React mounts (#root > *) and the idle screen shows "Ready" badge
//
// This is the foundational smoke test — if this fails, tests 2 and 3 are moot.

test('extension loads and sidepanel mounts with Ready badge (real chrome APIs)', async () => {
  // Verify dist/ exists before attempting to load — fail with a clear message.
  if (!fs.existsSync(DIST_PATH)) {
    throw new Error(
      `Extension dist not found at: ${DIST_PATH}\n` +
      'Build the extension first: pnpm --filter extension-app build'
    );
  }
  if (!fs.existsSync(path.join(DIST_PATH, 'manifest.json'))) {
    throw new Error(
      `manifest.json not found in dist/. Extension may not have built correctly.\n` +
      `Expected: ${path.join(DIST_PATH, 'manifest.json')}`
    );
  }

  // Create a fresh temporary profile directory for this test run.
  // mkdtempSync on Windows resolves to %TEMP%\ledgerium-real-ext-XXXXXX
  const profileDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ledgerium-real-ext-')
  );

  let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | null = null;

  try {
    // Launch Chromium with the unpacked extension loaded.
    // headless: false is required on Windows for extension loading to work
    // with Playwright 1.59.x — headless mode does not support extension APIs
    // (service workers, chrome.storage, chrome.runtime.sendMessage) reliably.
    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${DIST_PATH}`,
        `--load-extension=${DIST_PATH}`,
        // Suppress the "Chrome is being controlled" infobars that can
        // interfere with layout in the sidepanel window.
        '--disable-infobars',
        // Reduce noise in CI environments.
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    // ── Resolve the extension ID from the MV3 service worker ──────────────────
    //
    // MV3 extensions register a service worker (not a background page).
    // Playwright 1.59+ exposes service workers via context.serviceWorkers().
    // We wait for the first SW to register then parse the extension ID from
    // its chrome-extension:// URL.
    //
    // Alternative approaches tried / considered:
    //   context.backgroundPages() — returns [] for MV3 (background page is MV2)
    //   chrome.management.getSelf() via eval — requires 'management' permission
    //                                           not declared in the manifest
    //   Reading manifest.json key — extension ID is not in manifest; it is
    //                               assigned by Chrome on install
    //
    // The waitForEvent('serviceworker') pattern is the canonical approach for
    // MV3 extension ID discovery in Playwright.

    let extensionId: string;

    const existingSws = context.serviceWorkers();
    if (existingSws.length > 0) {
      // SW was already registered before we started waiting (fast load).
      extensionId = extensionIdFromSwUrl(existingSws[0].url());
    } else {
      // Wait for the SW to register — it should happen within SW_STARTUP_TIMEOUT_MS.
      const sw = await context.waitForEvent('serviceworker', {
        timeout: SW_STARTUP_TIMEOUT_MS,
      });
      extensionId = extensionIdFromSwUrl(sw.url());
    }

    // ── Open the sidepanel ──────────────────────────────────────────────────────

    const sidepanelUrl = `chrome-extension://${extensionId}/${SIDEPANEL_RELATIVE}`;

    // Open a new page and navigate to the sidepanel URL.
    const page = await context.newPage();
    await page.goto(sidepanelUrl, { waitUntil: 'domcontentloaded' });

    // Wait for React to mount — #root must have at least one child element.
    await page.waitForSelector('#root > *', { timeout: REACT_MOUNT_TIMEOUT_MS });

    // ── Assert idle state ───────────────────────────────────────────────────────
    //
    // On first load with a fresh profile:
    //   - The background SW sends GET_STATE → responds with { state: 'idle' }
    //   - The sidepanel renders IdleScreen with header badge showing "Ready"
    //
    // This assertion validates the full real message round-trip:
    //   sidepanel → chrome.runtime.sendMessage(GET_STATE)
    //   → real background SW handler → returns { state: 'idle' }
    //   → sidepanel React state update → renders "Ready" badge

    const badge = page.locator('header .badge');
    await expect(badge).toContainText('Ready', { timeout: 12_000 });

    // The activity name input should be visible and empty in idle state.
    const activityInput = page.locator('#activity-name');
    await expect(activityInput).toBeVisible();

    // "Start Recording" button should be disabled until an activity name is typed.
    const startBtn = page.getByRole('button', { name: 'Start Recording' });
    await expect(startBtn).toBeDisabled();

  } finally {
    // Always close the context and clean up the profile dir, even on failure.
    if (context) {
      await context.close();
    }
    // Give the browser process a moment to release file handles (Windows).
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {
      // Non-fatal: temp dir cleanup failure does not fail the test.
      // Windows may lock files briefly after context.close().
    }
  }
});

// ─── Test 2: Real start-session round-trip through service worker ─────────────
//
// Validates:
//   - Typing an activity name and clicking Start Recording sends START_SESSION
//     through the REAL chrome.runtime.sendMessage to the REAL background SW
//   - The real background SW's handleStart() transitions state → 'recording'
//   - The real SW broadcasts SESSION_STATE_UPDATED back to the sidepanel
//   - The sidepanel transitions to RecordingScreen ("Recording Active" banner)
//
// This is the critical scenario the static-harness CANNOT test — it validates
// that the real background/sidepanel message protocol works end-to-end on
// real Chrome APIs without any mocking.
//
// RE-ENABLED (iter following 070) — root cause of the original skip, verified:
//
//   The ORIGINAL skip comment theorised that
//   chrome.tabs.query({ active: true, lastFocusedWindow: true }) inside
//   handleStart() (background/index.ts) could return an empty array on a
//   freshly-launched context, adding "timing variance to the 'recording'
//   state broadcast" and causing flakiness.
//
//   That theory does not hold up under inspection of handleStart()'s actual
//   control flow: sm.transition('recording') + store.updateState('recording')
//   + broadcastStateUpdate() (background/index.ts ~line 224-226) all run
//   BEFORE the chrome.tabs.query() call (~line 232). The 'Recording' badge
//   and "Recording Active" banner this test asserts on are driven entirely
//   by that broadcast — they do not depend on the tab query's result at all.
//   Confirmed empirically: this test, un-skipped with ZERO code changes,
//   passed 4/4 consecutive runs (0 retries) prior to the fix below being
//   applied.
//
//   The REAL defect in the original test was a design gap, not a flake: the
//   test only ever opened ONE page — the sidepanel itself (a
//   chrome-extension:// tab) — so a real content tab was NEVER the active
//   tab when Start Recording was clicked. chrome.tabs.query({active:true})
//   could only ever resolve to the sidepanel's own tab (or, if a default
//   about:blank tab from launchPersistentContext happened to still be
//   active, nothing capture-relevant). That meant chrome.scripting.
//   executeScript() (injectIntoTab) and the START_SESSION tabs.sendMessage
//   in handleStart() were being aimed at a tab that could never receive
//   them — invisible to this test's assertions, but exactly the kind of gap
//   that let iter-097/iter-099-class regressions ship with green tests.
//
//   FIX: open and focus a real HTTP page FIRST, then re-focus it (via
//   bringToFront()) immediately before clicking Start Recording — so a real
//   content tab is genuinely `tab.active === true` at the moment handleStart()
//   runs its chrome.tabs.query(). Playwright can still interact with the
//   (backgrounded) sidepanel page via CDP regardless of which tab is
//   frontmost, so this does not require juggling focus mid-interaction.
//
//   This test still only validates STATE-MACHINE plumbing (badge / banner
//   text), not that captured events actually reach storage — see the new
//   real-capture-pipeline test below for that.

test('real start-session round-trip: sidepanel → SW → recording state (real chrome APIs)', async () => {
  if (!fs.existsSync(DIST_PATH)) {
    throw new Error(`Extension dist not found at: ${DIST_PATH}`);
  }

  const profileDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ledgerium-real-ext-')
  );

  let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | null = null;
  let fixtureServer: Awaited<ReturnType<typeof startFixtureServer>> | null = null;

  try {
    fixtureServer = await startFixtureServer();

    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${DIST_PATH}`,
        `--load-extension=${DIST_PATH}`,
        '--disable-infobars',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    // Resolve extension ID.
    const existingSws = context.serviceWorkers();
    let extensionId: string;
    if (existingSws.length > 0) {
      extensionId = extensionIdFromSwUrl(existingSws[0].url());
    } else {
      const sw = await context.waitForEvent('serviceworker', {
        timeout: SW_STARTUP_TIMEOUT_MS,
      });
      extensionId = extensionIdFromSwUrl(sw.url());
    }

    // ── Open + focus a real content page FIRST (the fix) ─────────────────────
    const contentPage = await context.newPage();
    await contentPage.goto(fixtureServer.url, { waitUntil: 'domcontentloaded' });
    await contentPage.waitForSelector('#test-action-button', { timeout: 10_000 });

    const sidepanelUrl = `chrome-extension://${extensionId}/${SIDEPANEL_RELATIVE}`;
    const page = await context.newPage();
    await page.goto(sidepanelUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#root > *', { timeout: REACT_MOUNT_TIMEOUT_MS });

    // Opening the sidepanel as a new tab makes IT the active tab by default —
    // re-focus the real content page so it is genuinely `tab.active === true`
    // when Start Recording is clicked below. Interacting with `page` (the
    // sidepanel) below still works even though it is not the frontmost tab:
    // Playwright drives it directly over its own CDP session.
    await contentPage.bringToFront();

    // Confirm idle state first.
    const badge = page.locator('header .badge');
    await expect(badge).toContainText('Ready', { timeout: 12_000 });

    // Type an activity name and click Start Recording.
    const activityInput = page.locator('#activity-name');
    await activityInput.fill('real e2e smoke test');

    const startBtn = page.getByRole('button', { name: 'Start Recording' });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    // The REAL background SW's handleStart() must:
    //   1. Transition SM: idle → arming
    //   2. Broadcast SESSION_STATE_UPDATED { state: 'arming' }
    //   3. Transition SM: arming → recording
    //   4. Broadcast SESSION_STATE_UPDATED { state: 'recording' }
    //   5. Query chrome.tabs for the active tab (now: contentPage) and inject
    //
    // The sidepanel receives SESSION_STATE_UPDATED via its onMessage listener
    // and updates React state, transitioning to RecordingScreen.
    //
    // Generous 20_000ms timeout because real SW startup can be slow.
    await expect(badge).toContainText('Recording', { timeout: 20_000 });
    await expect(page.getByText('Recording Active')).toBeVisible({ timeout: 12_000 });

  } finally {
    if (context) {
      await context.close();
    }
    if (fixtureServer) {
      await fixtureServer.close();
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {
      // Non-fatal.
    }
  }
});

// ─── Test 3: Real chrome.storage persistence ──────────────────────────────────
//
// Validates:
//   - After starting a real session via the real SW, chrome.storage.local
//     contains the persisted session meta (ledgerium_active_session key)
//   - This validates the real MV3 storage layer that the static harness mocks
//
// RE-ENABLED (iter following 070) — same root-cause finding as test 2 above:
//   this test's assertions are on SessionStore.initSession()'s write of
//   `ledgerium_active_session` meta (activityName / sessionId), which happens
//   even earlier in handleStart() than the 'recording' state broadcast — well
//   before the chrome.tabs.query() call the original skip comment blamed.
//   Trivially unblocked: verified 3/3 consecutive passes (0 retries) with
//   ZERO code changes, by removing .skip() alone. Left as originally written
//   (no fixture-page fix needed — this test does not exercise tab injection).

test('real chrome.storage persistence: session meta persisted after start (real chrome APIs)', async () => {
  if (!fs.existsSync(DIST_PATH)) {
    throw new Error(`Extension dist not found at: ${DIST_PATH}`);
  }

  const profileDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ledgerium-real-ext-')
  );

  let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | null = null;

  try {
    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${DIST_PATH}`,
        `--load-extension=${DIST_PATH}`,
        '--disable-infobars',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    const existingSws = context.serviceWorkers();
    let extensionId: string;
    if (existingSws.length > 0) {
      extensionId = extensionIdFromSwUrl(existingSws[0].url());
    } else {
      const sw = await context.waitForEvent('serviceworker', {
        timeout: SW_STARTUP_TIMEOUT_MS,
      });
      extensionId = extensionIdFromSwUrl(sw.url());
    }

    const sidepanelUrl = `chrome-extension://${extensionId}/${SIDEPANEL_RELATIVE}`;
    const page = await context.newPage();
    await page.goto(sidepanelUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#root > *', { timeout: REACT_MOUNT_TIMEOUT_MS });

    const badge = page.locator('header .badge');
    await expect(badge).toContainText('Ready', { timeout: 12_000 });

    await page.locator('#activity-name').fill('storage persistence test');
    await page.getByRole('button', { name: 'Start Recording' }).click();

    // Wait for real recording state.
    await expect(badge).toContainText('Recording', { timeout: 20_000 });

    // ── Inspect chrome.storage.local from the extension context ────────────────
    //
    // We retrieve the service worker and use page.evaluate() via a new page
    // opened to the sidepanel's chrome-extension:// origin, which has access
    // to the real chrome.storage.local API.
    //
    // The SessionStore.initSession() in the background (session-store.ts) writes
    // the session meta to chrome.storage.local under key 'ledgerium_active_session'.

    const storageResult = await page.evaluate(async () => {
      return new Promise<Record<string, unknown>>((resolve) => {
        // @ts-ignore — chrome is available in the real extension page context
        chrome.storage.local.get(['ledgerium_active_session'], (result: Record<string, unknown>) => {
          resolve(result);
        });
      });
    });

    // The session meta must exist in storage after a real session starts.
    expect(storageResult).toHaveProperty('ledgerium_active_session');
    const sessionMeta = storageResult['ledgerium_active_session'] as Record<string, unknown>;
    expect(sessionMeta).toHaveProperty('activityName', 'storage persistence test');
    expect(sessionMeta).toHaveProperty('sessionId');
    expect(typeof sessionMeta['sessionId']).toBe('string');

  } finally {
    if (context) {
      await context.close();
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {
      // Non-fatal.
    }
  }
});

// ─── Test 4: Real capture pipeline — event reaches storage, PII is screened ───
//
// This is the test the harness was missing. Tests 1-3 validate sidepanel UI
// state and message-bus plumbing, but NONE of them prove that a real user
// interaction on a real page ever produces a captured event that reaches the
// background — which is precisely the failure mode of the two prior
// regressions this file's header documents (iter 097 content_scripts removal,
// iter 099 pageTitle signature change). Both shipped with 3890/3890-class
// green unit tests; neither would have been caught by tests 1-3 either, since
// none of them ever open a real content page or dispatch a real DOM event.
//
// Validates, end-to-end, on real Chrome APIs with zero mocking:
//   1. CAPTURE WORKS AT ALL — a real click + real typed input on a real HTTP
//      page, while a session is recording, produces at least one raw event
//      that reaches chrome.storage.local via the full
//      content-script -> RAW_EVENT_CAPTURED -> background -> SessionStore
//      pipeline. Zero captured events is a hard failure with a message that
//      names the pipeline stage, not a silent pass.
//   2. THE PAGE TITLE IS PII-SCREENED — this branch's own privacy fix routes
//      15 call sites in capture.ts through getSafePageTitle() instead of
//      raw document.title. This test's fixture page's real <title> contains
//      the canonical PII case from this repo's own unit tests
//      ('Inbox (3) – phil@mediafier.ai'). We assert that PII never appears in
//      any captured event's page_title (flat field) or context.pageTitle
//      (nested field — both are set independently in capture.ts) AND that the
//      captured click event's page_title equals the exact deterministic
//      fallback value ('Local Dev', per deriveAppLabel('localhost')) — i.e.
//      not just "no PII leaked", but "the correct screened value was used".
//
// If this test's PII assertions ever fail, it means the privacy fix on this
// branch has a real gap that no unit test caught, because unit tests exercise
// getSafePageTitle() / screenPageTitle() in isolation with jsdom-mocked
// document.title — they cannot prove the 15 call sites in capture.ts are
// actually wired to it in a real browser, on a real event, over the real
// message bus.
//
// ACTIVE-TAB FIX: same pattern as test 2 — the fixture page is opened first
// and re-focused via bringToFront() immediately before Start Recording is
// clicked, so it is genuinely the active tab when handleStart() queries
// chrome.tabs and injects the content script.

test('real capture pipeline: a real click + typed input reach storage as PII-screened events (real chrome APIs)', async () => {
  if (!fs.existsSync(DIST_PATH)) {
    throw new Error(`Extension dist not found at: ${DIST_PATH}`);
  }

  const profileDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ledgerium-real-ext-')
  );

  let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | null = null;
  let fixtureServer: Awaited<ReturnType<typeof startFixtureServer>> | null = null;

  try {
    fixtureServer = await startFixtureServer();

    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${DIST_PATH}`,
        `--load-extension=${DIST_PATH}`,
        '--disable-infobars',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    // ── Resolve the extension ID + get a handle on the real background SW ────
    // We need the SW handle (not just its URL) later, to evaluate() inside
    // its execution context and read chrome.storage.local directly.
    let sw: ServiceWorkerHandle;
    const existingSws = context.serviceWorkers();
    if (existingSws.length > 0) {
      sw = existingSws[0]!;
    } else {
      sw = await context.waitForEvent('serviceworker', { timeout: SW_STARTUP_TIMEOUT_MS });
    }
    const extensionId = extensionIdFromSwUrl(sw.url());

    // ── Open + focus the real content page FIRST ──────────────────────────────
    // No real page was ever opened at all in the pre-existing tests 2/3 — this
    // is the fix (see file-header comment on test 2 for the verified diagnosis).
    const contentPage = await context.newPage();
    await contentPage.goto(fixtureServer.url, { waitUntil: 'domcontentloaded' });
    await contentPage.waitForSelector('#test-action-button', { timeout: 10_000 });
    // Sanity check on the fixture itself, independent of the extension: if
    // this ever fails, the bug is in this test file, not the extension.
    await expect(contentPage).toHaveTitle(FIXTURE_PAGE_TITLE);

    // ── Open the sidepanel in a second tab ────────────────────────────────────
    const sidepanelUrl = `chrome-extension://${extensionId}/${SIDEPANEL_RELATIVE}`;
    const sidepanel = await context.newPage();
    await sidepanel.goto(sidepanelUrl, { waitUntil: 'domcontentloaded' });
    await sidepanel.waitForSelector('#root > *', { timeout: REACT_MOUNT_TIMEOUT_MS });

    // Re-focus the real content page so it is `tab.active === true` when
    // Start Recording is clicked below (opening the sidepanel as a new tab
    // made IT active by default). Interacting with `sidepanel` below still
    // works even though it is not the frontmost tab — Playwright drives it
    // over its own CDP session regardless of tab-strip focus.
    await contentPage.bringToFront();

    const badge = sidepanel.locator('header .badge');
    await expect(badge).toContainText('Ready', { timeout: 12_000 });

    await sidepanel.locator('#activity-name').fill('real capture pipeline test');
    const startBtn = sidepanel.getByRole('button', { name: 'Start Recording' });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    await expect(badge).toContainText('Recording', { timeout: 20_000 });

    // ── Resolve the session id from real storage ──────────────────────────────
    // SessionStore.initSession() writes this synchronously (before the
    // 'recording' broadcast even fires), so it is available as soon as the
    // badge shows 'Recording'.
    const sessionMeta = await readStorageValue<PersistedSessionMetaShape>(sw, STORAGE_KEY_SESSION);
    if (!sessionMeta?.sessionId) {
      throw new Error(
        'No active session meta found in chrome.storage.local after Start Recording. ' +
        'SessionStore.initSession() never wrote ' + STORAGE_KEY_SESSION + ' — capture ' +
        'cannot be validated because there is no session to attribute events to.'
      );
    }
    const eventsKey = STORAGE_KEY_SESSION_EVENTS_PREFIX + sessionMeta.sessionId;

    // ── Interact with the real page and poll storage for a captured event ────
    //
    // handleStart() injects the content script into the active tab and sends
    // START_SESSION with a deliberate ~100ms delay after injection (see
    // background/index.ts comment at that call site) to let the freshly
    // injected module's onMessage listener register. Rather than hard-code
    // that (or any other) magic number as a fixed sleep, we retry the click
    // itself inside expect.poll() until a raw event appears in storage: if
    // the very first click lands before capture is actually armed on the
    // page, it is silently dropped by design (isCapturing() guard in
    // capture.ts) and the next poll iteration clicks again. This is a
    // waitFor-style assertion, not a fixed-duration sleep, and it fails fast
    // (at the poll timeout) rather than masking a real break with a long wait.
    let rawEvents: Array<Record<string, unknown>> = [];
    await expect.poll(async () => {
      await contentPage.locator('#test-action-button').click({ timeout: 2_000 }).catch(() => {});
      const persisted = await readStorageValue<PersistedSessionEventsShape>(sw, eventsKey);
      rawEvents = persisted?.rawEvents ?? [];
      return rawEvents.length;
    }, {
      timeout: 15_000,
      message:
        'ZERO raw events reached chrome.storage.local after repeatedly clicking a real button ' +
        'on a real page during an active recording session. This means the capture pipeline ' +
        '(content script -> RAW_EVENT_CAPTURED message bus -> background -> SessionStore) is ' +
        'broken end-to-end -- exactly the class of regression this test exists to catch ' +
        '(see CLAUDE.md "Extension Reliability Invariant", known regressions: iter 097 ' +
        'content_scripts removal, iter 099 pageTitle signature change).',
    }).toBeGreaterThan(0);

    // Also exercise the debounced text-input capture path (captureDebouncedInput
    // in capture.ts, INPUT_DEBOUNCE_MS = 300ms) for a second, independent
    // event type. Capture is confirmed armed at this point (the poll above
    // already succeeded), so no retry-loop is needed here — just a poll for
    // the event count to grow, which absorbs the debounce delay without a
    // fixed sleep.
    const rawEventCountBeforeInput = rawEvents.length;
    await contentPage.locator('#test-text-input').fill('some typed text, not PII');
    await expect.poll(async () => {
      const persisted = await readStorageValue<PersistedSessionEventsShape>(sw, eventsKey);
      rawEvents = persisted?.rawEvents ?? [];
      return rawEvents.length;
    }, {
      timeout: 8_000,
      message: 'Typed input into a real <input> did not produce a new captured raw event.',
    }).toBeGreaterThan(rawEventCountBeforeInput);

    // ── Assertion 1: capture actually happened ────────────────────────────────
    expect(rawEvents.length, 'expected at least one captured raw event in storage').toBeGreaterThan(0);

    // ── Assertion 2: PII screening held on EVERY captured event, on BOTH
    //    fields that carry the page title (capture.ts sets both independently:
    //    the flat `page_title` on click/nav/input handlers, and the nested
    //    `context.pageTitle` on every event via buildContext()) ─────────────
    for (const event of rawEvents) {
      const flatTitle = event['page_title'];
      const contextObj = event['context'] as Record<string, unknown> | undefined;
      const nestedTitle = contextObj?.['pageTitle'];

      const fieldsToCheck: Array<[string, unknown]> = [
        ['page_title', flatTitle],
        ['context.pageTitle', nestedTitle],
      ];

      for (const [fieldName, value] of fieldsToCheck) {
        if (typeof value !== 'string') continue; // field not set on this event type — nothing to check
        const eventType = String(event['event_type']);

        expect(
          value.includes('@'),
          `PII LEAK on captured "${eventType}" event, field "${fieldName}" = "${value}": ` +
          'contains "@" -- the real document.title PII was not screened out before the ' +
          'RawEvent left the content script.'
        ).toBe(false);

        expect(
          value.includes('phil@mediafier.ai'),
          `PII LEAK on captured "${eventType}" event, field "${fieldName}" = "${value}": ` +
          'contains the raw PII email address from document.title verbatim.'
        ).toBe(false);
      }
    }

    // ── Assertion 3: the CORRECT safe fallback was used, not just "no PII" ───
    // extractDomain('http://localhost:PORT/').hostname === 'localhost', and
    // deriveAppLabel('localhost') deterministically returns 'Local Dev'
    // (shared/utils.ts:47-48). If PII screening incorrectly rejected a benign
    // title, or accepted the real PII title, this assertion would fail even
    // if assertion 2 above happened to pass by accident.
    const clickEvent = rawEvents.find(e => e['event_type'] === 'click');
    expect(clickEvent, 'expected a captured "click" raw event for the button interaction').toBeTruthy();
    expect(clickEvent?.['page_title']).toBe('Local Dev');
    expect((clickEvent?.['context'] as Record<string, unknown> | undefined)?.['pageTitle']).toBe('Local Dev');

  } finally {
    if (context) {
      await context.close();
    }
    if (fixtureServer) {
      await fixtureServer.close();
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {
      // Non-fatal.
    }
  }
});
