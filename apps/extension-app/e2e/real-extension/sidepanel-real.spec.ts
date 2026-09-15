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
import https from 'https';
import { execFileSync } from 'child_process';
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
 * Starts a minimal local HTTP server serving `html` (defaults to
 * FIXTURE_HTML) on an ephemeral port, reached via the `localhost` hostname.
 * `deriveAppLabel()` (shared/utils.ts:47-48) special-cases
 * `hostname === 'localhost'` to return the constant `'Local Dev'` — so if the
 * PII-laden fixture title is correctly rejected, the safe fallback value is
 * deterministic and assertable, not just "some non-PII string".
 *
 * The optional `html` parameter lets additional tests (e.g. the rule-9
 * privacy-boundary test below) serve their own fixture markup through this
 * same real-HTTP-server mechanism without duplicating the server-bootstrap
 * logic or building a parallel harness.
 */
function startFixtureServer(html: string = FIXTURE_HTML): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
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

// ─── Test 5: rule-9 privacy boundary — div/span control-detection gate ────────
//
// Regression test for commit 5df0e6a (label-extractor.ts rule 9 narrowing)
// and the associated public-claim correction in commit 0da54d8. Before
// 5df0e6a, rule 9 read the `innerText` of ANY clicked div/span (up to 40
// chars) regardless of whether the element was actually acting as a control —
// silently transmitting arbitrary visible page content (customer names,
// dollar amounts, reference numbers) as `target_label` on captured click
// events. The fix narrows rule 9 to fire ONLY when the element carries a
// genuine interactive-control affordance: an explicit interactive ARIA role
// (button/link/tab/menuitem/option/checkbox/radio/switch), or a
// non-negative `tabindex` making it keyboard-focusable. Elements that fail
// this check fall through to rule 10 (ancestor context) cleanly, without
// ever reading their own text.
//
// `label-extractor.test.ts` already covers this boundary with 17 cases
// against a jsdom-mocked DOM. Per CLAUDE.md's Extension Reliability
// Invariant, unit tests CANNOT certify that the fix behaves identically in a
// REAL Chrome content-script execution context, on a REAL click, over the
// REAL RAW_EVENT_CAPTURED message bus, persisted into REAL chrome.storage —
// exactly the class of gap that let two prior regressions (iter 097, iter
// 099) ship with fully green unit suites. This test closes that gap for the
// rule-9 privacy fix specifically.
//
// Validates, end-to-end, on real Chrome APIs with zero mocking:
//   1. REGRESSION GUARD (did the fix over-correct?) — a genuine div-based
//      control (`role="button"` + `tabindex="0"`, short text) still produces
//      a captured click event whose `target_label` is exactly the control's
//      text. If the narrowing had gone too far and started rejecting
//      legitimate div/span controls, this assertion catches it.
//   2. PRIVACY GUARD (did the fix actually close the leak?) — a plain layout
//      div with NO role and NO tabindex, containing data that must never be
//      captured (a full name, a dollar amount), produces NO captured event
//      containing either string ANYWHERE in its serialized payload — not
//      just the `target_label` field, but the full JSON-stringified event
//      (selector, ancestor path, target object, everything). The point is
//      that the string does not leave the page by any path, not merely that
//      one specific field is clean.
//   3. CAPTURE CONTINUITY (did the fix silently break capture?) — clicking
//      the plain div still produces a captured interaction event. Rule 9
//      declining to supply a label must not stop capture altogether. No
//      assertion is made on the exact fallback label value (that is rule
//      10's concern, not rule 9's).

const RULE9_FIXTURE_PAGE_TITLE = 'Ledgerium rule-9 privacy fixture';

/** Genuine control: interactive ARIA role + tabindex, short text — rule 9 SHOULD fire. */
const RULE9_CONTROL_LABEL = 'Approve invoice';

/** Plain layout content that must NEVER be captured — rule 9 must NOT fire. */
const RULE9_PII_NAME = 'Jane Q. Smith';
const RULE9_PII_AMOUNT = '$4,820.00';

const RULE9_FIXTURE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${RULE9_FIXTURE_PAGE_TITLE}</title>
</head>
<body>
  <div id="rule9-control" role="button" tabindex="0">${RULE9_CONTROL_LABEL}</div>
  <div id="rule9-plain-name">${RULE9_PII_NAME}</div>
  <div id="rule9-plain-amount">${RULE9_PII_AMOUNT}</div>
</body>
</html>`;

test('rule-9 privacy boundary: div control label captured, plain div text never leaves the page (real chrome APIs)', async () => {
  if (!fs.existsSync(DIST_PATH)) {
    throw new Error(`Extension dist not found at: ${DIST_PATH}`);
  }

  const profileDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ledgerium-real-ext-')
  );

  let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | null = null;
  let fixtureServer: Awaited<ReturnType<typeof startFixtureServer>> | null = null;

  try {
    fixtureServer = await startFixtureServer(RULE9_FIXTURE_HTML);

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
    let sw: ServiceWorkerHandle;
    const existingSws = context.serviceWorkers();
    if (existingSws.length > 0) {
      sw = existingSws[0]!;
    } else {
      sw = await context.waitForEvent('serviceworker', { timeout: SW_STARTUP_TIMEOUT_MS });
    }
    const extensionId = extensionIdFromSwUrl(sw.url());

    // ── Open + focus the real content page FIRST (same active-tab fix as
    //    tests 2 and 4 — see file-header comment on test 2 for the verified
    //    diagnosis of why this ordering matters for chrome.tabs.query()). ────
    const contentPage = await context.newPage();
    await contentPage.goto(fixtureServer.url, { waitUntil: 'domcontentloaded' });
    await contentPage.waitForSelector('#rule9-control', { timeout: 10_000 });
    await expect(contentPage).toHaveTitle(RULE9_FIXTURE_PAGE_TITLE);

    // ── Open the sidepanel in a second tab ────────────────────────────────────
    const sidepanelUrl = `chrome-extension://${extensionId}/${SIDEPANEL_RELATIVE}`;
    const sidepanel = await context.newPage();
    await sidepanel.goto(sidepanelUrl, { waitUntil: 'domcontentloaded' });
    await sidepanel.waitForSelector('#root > *', { timeout: REACT_MOUNT_TIMEOUT_MS });

    // Re-focus the real content page so it is `tab.active === true` when
    // Start Recording is clicked below.
    await contentPage.bringToFront();

    const badge = sidepanel.locator('header .badge');
    await expect(badge).toContainText('Ready', { timeout: 12_000 });

    await sidepanel.locator('#activity-name').fill('rule-9 privacy boundary test');
    const startBtn = sidepanel.getByRole('button', { name: 'Start Recording' });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    await expect(badge).toContainText('Recording', { timeout: 20_000 });

    // ── Resolve the session id from real storage ──────────────────────────────
    const sessionMeta = await readStorageValue<PersistedSessionMetaShape>(sw, STORAGE_KEY_SESSION);
    if (!sessionMeta?.sessionId) {
      throw new Error(
        'No active session meta found in chrome.storage.local after Start Recording. ' +
        'Cannot validate the rule-9 privacy boundary because there is no session to ' +
        'attribute events to.'
      );
    }
    const eventsKey = STORAGE_KEY_SESSION_EVENTS_PREFIX + sessionMeta.sessionId;

    // ── Click the genuine control div, retrying until capture is armed and
    //    the resulting event reaches storage (same poll-and-retry pattern as
    //    test 4 — the content script's onMessage listener registers ~100ms
    //    after injection, so the very first click can be dropped by design). ──
    let rawEvents: Array<Record<string, unknown>> = [];
    await expect.poll(async () => {
      await contentPage.locator('#rule9-control').click({ timeout: 2_000 }).catch(() => {});
      const persisted = await readStorageValue<PersistedSessionEventsShape>(sw, eventsKey);
      rawEvents = persisted?.rawEvents ?? [];
      return rawEvents.length;
    }, {
      timeout: 15_000,
      message:
        'ZERO raw events reached chrome.storage.local after repeatedly clicking a real ' +
        'div[role="button"][tabindex="0"] control on a real page during an active recording ' +
        'session. This means the capture pipeline is broken end-to-end for div-based controls ' +
        '(rule 9 of label-extractor.ts).',
    }).toBeGreaterThan(0);

    // ── Capture is confirmed armed — click the two plain PII-bearing divs ────
    // (no retry loop needed; mirrors test 4's debounced-input step).
    const countAfterControl = rawEvents.length;
    await contentPage.locator('#rule9-plain-name').click();
    await contentPage.locator('#rule9-plain-amount').click();

    await expect.poll(async () => {
      const persisted = await readStorageValue<PersistedSessionEventsShape>(sw, eventsKey);
      rawEvents = persisted?.rawEvents ?? [];
      return rawEvents.length;
    }, {
      timeout: 10_000,
      message:
        'Clicking the plain (non-control) divs produced NO new captured events. Capture ' +
        'continuity is broken: rule 9 correctly declining to supply a label must not stop ' +
        'the interaction from being captured at all.',
    }).toBeGreaterThanOrEqual(countAfterControl + 2);

    // ── Assertion 1: regression guard — the genuine control's label survived
    //    on a REAL click, over the REAL message bus, in REAL storage ─────────
    const controlEvent = rawEvents.find(
      (e) => e['event_type'] === 'click' && e['target_selector'] === '#rule9-control'
    );
    expect(
      controlEvent,
      'expected a captured click event for the div[role="button"][tabindex="0"] control'
    ).toBeTruthy();
    expect(controlEvent?.['target_label']).toBe(RULE9_CONTROL_LABEL);

    // ── Assertion 2: privacy guard — PII never appears ANYWHERE in ANY
    //    captured event's full serialized payload, not just target_label ────
    for (const event of rawEvents) {
      const serialized = JSON.stringify(event);
      expect(
        serialized.includes(RULE9_PII_NAME),
        `PII LEAK: a captured event contains the plain div's full-name text ` +
        `("${RULE9_PII_NAME}") somewhere in its serialized payload:\n${serialized}`
      ).toBe(false);
      expect(
        serialized.includes(RULE9_PII_AMOUNT),
        `PII LEAK: a captured event contains the plain div's dollar-amount text ` +
        `("${RULE9_PII_AMOUNT}") somewhere in its serialized payload:\n${serialized}`
      ).toBe(false);
    }

    // ── Assertion 3: capture continuity — the plain divs still produced
    //    interaction events (no assertion on their exact label value) ────────
    const nameClickEvent = rawEvents.find(
      (e) => e['event_type'] === 'click' && e['target_selector'] === '#rule9-plain-name'
    );
    const amountClickEvent = rawEvents.find(
      (e) => e['event_type'] === 'click' && e['target_selector'] === '#rule9-plain-amount'
    );
    expect(
      nameClickEvent,
      'expected a captured click event for the plain (non-control) name div — capture must ' +
      'not silently stop just because rule 9 declined to supply a label'
    ).toBeTruthy();
    expect(
      amountClickEvent,
      'expected a captured click event for the plain (non-control) amount div — capture must ' +
      'not silently stop just because rule 9 declined to supply a label'
    ).toBeTruthy();

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

// ─── Test 6: quota refusal on the automatic post-recording upload (row #186) ──
//
// Regression test for row #186: the automatic upload that runs at the end of
// every recording (background/index.ts handleStop -> uploader.ts uploadBundle)
// previously collapsed a monthly-quota refusal (403 + code 'UPGRADE_REQUIRED',
// exact shape from apps/web-app/src/app/api/sync/route.ts) into the same
// generic "Upload failed" the sidepanel shows for any other failure. The fix
// threads the shared classifySyncFailure() result through the UPLOAD_PROGRESS
// broadcast so the sidepanel can show the same quota notice the manual "Open
// in Ledgerium AI Website" path already showed.
//
// uploadBundle() enforces HTTPS (background/uploader.ts:25) before it will
// even call fetch(), so the plain-HTTP startFixtureServer() used by tests
// 2/4/5 above cannot serve as the sync endpoint here. This test stands up a
// throwaway local HTTPS server instead, using a self-signed certificate
// generated at run time via the `openssl` CLI (test-only; never bundled into
// the extension) and launches Chromium with `--ignore-certificate-errors` so
// the real background service worker's real fetch() accepts it. This is a
// REAL TLS handshake and a REAL HTTP 403 response — nothing about the sync
// request/response is mocked.
//
// The sync URL is configured the way a real user would: through the
// sidepanel's own "Sync Settings" panel (IdleScreen.tsx SyncSettings), which
// sends the real SETTINGS_UPDATED message over the real chrome.runtime
// message bus to the real background service worker.

/** Generates a throwaway self-signed cert+key pair via the `openssl` CLI. */
function generateSelfSignedCert(dir: string): { certPath: string; keyPath: string } {
  const keyPath = path.join(dir, 'key.pem');
  const certPath = path.join(dir, 'cert.pem');
  try {
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048',
      '-keyout', keyPath,
      '-out', certPath,
      '-days', '1',
      '-nodes',
      '-subj', '/CN=localhost',
    ], { stdio: 'pipe' });
  } catch (err) {
    throw new Error(
      'The `openssl` CLI is required to generate a throwaway self-signed certificate for the ' +
      'row #186 HTTPS quota-refusal test (uploadBundle enforces HTTPS, so a plain-HTTP stub ' +
      'cannot be used as the sync endpoint). Install openssl and ensure it is on PATH. ' +
      `Original error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  return { certPath, keyPath };
}

/**
 * Starts a local HTTPS server that always answers POST with 403
 * `{ error: 'Recording limit reached', code: 'UPGRADE_REQUIRED', used, limit }`
 * — the exact shape apps/web-app/src/app/api/sync/route.ts returns on the
 * monthly-quota-refusal path. Requires Chromium to be launched with
 * `--ignore-certificate-errors` (the cert is self-signed and not in any
 * trust store).
 */
function startHttpsQuotaStubServer(
  used: number,
  limit: number,
): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const certDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledgerium-https-stub-'));
    let certPath: string;
    let keyPath: string;
    try {
      ({ certPath, keyPath } = generateSelfSignedCert(certDir));
    } catch (err) {
      reject(err);
      return;
    }

    const server = https.createServer(
      { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) },
      (req, res) => {
        // Drain the request body (the extension POSTs the full session bundle) —
        // the stub does not need to inspect it, it always refuses with quota.
        req.on('data', () => {});
        req.on('end', () => {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Recording limit reached', code: 'UPGRADE_REQUIRED', used, limit }));
        });
      },
    );
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo | null;
      if (!address) {
        reject(new Error('HTTPS quota-stub server failed to bind to a port.'));
        return;
      }
      resolve({
        url: `https://localhost:${address.port}/api/sync`,
        close: () =>
          new Promise<void>((res2) => {
            server.close(() => {
              try {
                fs.rmSync(certDir, { recursive: true, force: true });
              } catch {
                // Non-fatal: temp cert dir cleanup failure does not fail the test.
              }
              res2();
            });
          }),
      });
    });
  });
}

test('automatic upload quota refusal shows the quota notice, not "Upload failed" (real chrome APIs)', async () => {
  if (!fs.existsSync(DIST_PATH)) {
    throw new Error(`Extension dist not found at: ${DIST_PATH}`);
  }

  const profileDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ledgerium-real-ext-')
  );

  let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | null = null;
  let fixtureServer: Awaited<ReturnType<typeof startFixtureServer>> | null = null;
  let quotaStub: Awaited<ReturnType<typeof startHttpsQuotaStubServer>> | null = null;

  try {
    // The sync endpoint the sidepanel will be configured to use — always
    // refuses with 403 UPGRADE_REQUIRED, used:5 of limit:5.
    quotaStub = await startHttpsQuotaStubServer(5, 5);

    // A real content page, same as tests 2/4/5, so a genuine active tab
    // exists when Start Recording is clicked (see file-header comment on
    // test 2 for why this ordering matters).
    fixtureServer = await startFixtureServer();

    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${DIST_PATH}`,
        `--load-extension=${DIST_PATH}`,
        '--disable-infobars',
        '--no-first-run',
        '--no-default-browser-check',
        // Test-only: the sync stub's certificate is self-signed. This does
        // NOT weaken anything in the extension itself — uploadBundle's
        // HTTPS-scheme guard (background/uploader.ts:25) is untouched and
        // still enforced; this flag only tells Chromium's TLS stack to
        // accept a cert that isn't in a trust store.
        '--ignore-certificate-errors',
      ],
    });

    const existingSws = context.serviceWorkers();
    let extensionId: string;
    if (existingSws.length > 0) {
      extensionId = extensionIdFromSwUrl(existingSws[0]!.url());
    } else {
      const sw = await context.waitForEvent('serviceworker', { timeout: SW_STARTUP_TIMEOUT_MS });
      extensionId = extensionIdFromSwUrl(sw.url());
    }

    const contentPage = await context.newPage();
    await contentPage.goto(fixtureServer.url, { waitUntil: 'domcontentloaded' });
    await contentPage.waitForSelector('#test-action-button', { timeout: 10_000 });

    const sidepanelUrl = `chrome-extension://${extensionId}/${SIDEPANEL_RELATIVE}`;
    const sidepanel = await context.newPage();
    await sidepanel.goto(sidepanelUrl, { waitUntil: 'domcontentloaded' });
    await sidepanel.waitForSelector('#root > *', { timeout: REACT_MOUNT_TIMEOUT_MS });

    await contentPage.bringToFront();

    const badge = sidepanel.locator('header .badge');
    await expect(badge).toContainText('Ready', { timeout: 12_000 });

    // ── Configure the sync URL the way a real user would: through the
    //    sidepanel's own Sync Settings panel (IdleScreen.tsx), not by
    //    writing to chrome.storage directly. ──────────────────────────────
    await sidepanel.getByRole('button', { name: 'Sync Settings' }).click();
    await sidepanel.getByPlaceholder('https://ledgerium.ai/api/sync').fill(quotaStub.url);
    await sidepanel.getByRole('button', { name: 'Save' }).click();
    // SyncSettings flips its Save button to "Saved" synchronously on click
    // (before the background round-trip even matters) — waiting for it is a
    // real UI signal that the click was registered, not a fixed sleep.
    await expect(sidepanel.getByRole('button', { name: 'Saved' })).toBeVisible({ timeout: 5_000 });

    // ── Start and stop a real recording. No captured interaction is needed
    //    for this test — only that a session with an uploadUrl completes. ──
    await sidepanel.locator('#activity-name').fill('row 186 quota refusal test');
    const startBtn = sidepanel.getByRole('button', { name: 'Start Recording' });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    await expect(badge).toContainText('Recording', { timeout: 20_000 });

    await sidepanel.getByRole('button', { name: 'Stop & Review' }).click();
    await expect(sidepanel.getByText('Session complete')).toBeVisible({ timeout: 20_000 });

    // ── The real background SW now calls the real uploadBundle() against
    //    the real HTTPS stub, gets a real 403 UPGRADE_REQUIRED, classifies
    //    it, and broadcasts UPLOAD_PROGRESS { status: 'failed', failure }.
    //    Generous timeout: a real TLS handshake + HTTP round-trip to
    //    localhost, plus buildBundle()/buildWorkflowReport() first. ────────
    await expect(sidepanel.getByText('Upload Limit Reached', { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(sidepanel.getByText('Monthly upload limit reached (5 of 5)')).toBeVisible();
    await expect(sidepanel.getByText('This recording is kept in Recent Recordings.', { exact: false })).toBeVisible();
    await expect(sidepanel.getByRole('button', { name: 'See plans' })).toBeVisible();

    // The generic label this failure previously always showed must be gone.
    await expect(sidepanel.getByText('Upload failed', { exact: true })).toHaveCount(0);

  } finally {
    if (context) {
      await context.close();
    }
    if (fixtureServer) {
      await fixtureServer.close();
    }
    if (quotaStub) {
      await quotaStub.close();
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {
      // Non-fatal.
    }
  }
});
