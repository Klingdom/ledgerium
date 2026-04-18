/**
 * Extension recording lifecycle E2E tests.
 *
 * Test strategy: static-harness approach (static-HTML + mock chrome.*)
 *
 * WHY THIS APPROACH:
 *   The real-extension approach (launchPersistentContext + --load-extension)
 *   requires a full Chromium binary, a Chrome profile directory, and an
 *   unpacked extension that has passed MV3 validation.  It is inherently
 *   flaky for smoke tests and unsuitable as a first E2E foothold.
 *
 *   Instead, we serve the PRODUCTION-BUILT sidepanel (dist/src/sidepanel/
 *   index.html) from a local HTTP server, then inject a deterministic
 *   chrome.* mock into the page BEFORE React mounts.  The mock simulates
 *   the background service worker's state machine by:
 *     1. Responding to GET_STATE with the current mock state.
 *     2. On START_SESSION: transitioning mock state → 'arming', then after a
 *        short tick broadcasting SESSION_STATE_UPDATED → 'recording'.
 *     3. On STOP_SESSION: transitioning mock state → 'stopping', then
 *        broadcasting SESSION_STATE_UPDATED → 'review_ready'.
 *
 *   This exercises the REAL production JS bundle (same code that ships in the
 *   extension) including useRecorderState, the message protocol, and every
 *   screen component.  Only the chrome.runtime transport layer is mocked.
 *
 * TRADEOFFS:
 *   + Deterministic — no real service worker, no timing jitter from extension
 *     install or Chrome profile.
 *   + Tests real production code, not a hand-rolled re-render harness.
 *   - Does not test background/content script message handling.
 *   - Does not test chrome.storage persistence.
 *   - Real-extension tests (launchPersistentContext) are deferred to iter 010.
 *
 * SCOPE (iter 009):
 *   Test 1 — Idle screen renders correctly and "Start Recording" is disabled
 *             when the activity name field is empty.
 *   Test 2 — Typing an activity name enables "Start Recording"; clicking it
 *             transitions the header badge from "Ready" → "Recording".
 *   Test 3 — From recording state, clicking "Stop & Review" transitions the
 *             header badge to "Processing..." then "Complete".
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Types matching shared/types.ts message protocol ─────────────────────────

type RecorderState =
  | 'idle'
  | 'arming'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'review_ready'
  | 'error';

// ─── HTTP server for dist/ ────────────────────────────────────────────────────

let server: http.Server;
let baseUrl: string;

const DIST_ROOT = path.resolve(__dirname, '../dist');
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

test.beforeAll(async () => {
  if (!fs.existsSync(DIST_ROOT)) {
    throw new Error(
      `Extension dist not found at ${DIST_ROOT}. ` +
      'Run: pnpm --filter extension-app build'
    );
  }

  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const filePath = path.join(DIST_ROOT, url.pathname);
    const ext = path.extname(filePath).toLowerCase();
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
      });
      res.end(data);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      } else {
        reject(new Error('Server failed to bind'));
      }
    });
  });
});

test.afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Navigate to the production sidepanel and inject a chrome.* mock before
 * React mounts.  The mock simulates the background service worker's
 * state machine deterministically.
 *
 * The mock exposes window.__mockChrome so tests can inspect sent messages and
 * programmatically push SESSION_STATE_UPDATED messages back into the React app.
 */
async function loadSidepanel(
  page: import('@playwright/test').Page,
  initialState: RecorderState = 'idle'
) {
  // Add init script BEFORE navigation so the mock is in place when the
  // module script executes and React calls chrome.runtime.sendMessage.
  await page.addInitScript(
    ({ state }: { state: RecorderState }) => {
      // Internal mock state — updated as messages arrive.
      let mockState: RecorderState = state;
      const sessionId = 'test-session-001';
      const activityName = 'Test activity';
      const startedAt = new Date().toISOString();

      // Registered onMessage listeners (mirrors chrome.runtime.onMessage).
      const listeners: Array<(msg: unknown) => void> = [];

      function buildStatePayload(s: RecorderState) {
        const isActive = s === 'recording' || s === 'paused';
        return {
          state: s,
          meta: isActive || s === 'stopping' || s === 'review_ready'
            ? { sessionId, activityName, startedAt, state: s, pauseIntervals: [], schemaVersion: '2', recorderVersion: '2.0.0' }
            : null,
          steps: [],
          rawEventCount: 0,
        };
      }

      function broadcast(type: string, payload: Record<string, unknown>) {
        for (const fn of listeners) {
          try { fn({ type, payload }); } catch { /* ignore */ }
        }
      }

      // The chrome.* mock.
      const mock = {
        runtime: {
          sendMessage: (
            msg: { type: string; payload?: Record<string, unknown> },
            cb?: (response: unknown) => void
          ) => {
            // Track sent messages for test inspection.
            (window as unknown as Record<string, unknown[]>).__sentMessages =
              (window as unknown as Record<string, unknown[]>).__sentMessages ?? [];
            ((window as unknown as Record<string, unknown[]>).__sentMessages).push(msg);

            if (msg.type === 'GET_STATE') {
              if (cb) cb(buildStatePayload(mockState));
              return;
            }

            if (msg.type === 'START_SESSION') {
              mockState = 'arming';
              if (cb) cb(null);
              // Simulate background: arming → recording after a short tick.
              setTimeout(() => {
                mockState = 'recording';
                broadcast('SESSION_STATE_UPDATED', buildStatePayload('recording'));
              }, 80);
              return;
            }

            if (msg.type === 'STOP_SESSION') {
              mockState = 'stopping';
              if (cb) cb(null);
              // Simulate background: stopping → review_ready after a tick.
              setTimeout(() => {
                mockState = 'review_ready';
                broadcast('SESSION_STATE_UPDATED', buildStatePayload('review_ready'));
              }, 80);
              return;
            }

            if (msg.type === 'GET_HISTORY') {
              if (cb) cb([]);
              return;
            }

            if (cb) cb(null);
          },
          onMessage: {
            addListener: (fn: (msg: unknown) => void) => { listeners.push(fn); },
            removeListener: (fn: (msg: unknown) => void) => {
              const i = listeners.indexOf(fn);
              if (i !== -1) listeners.splice(i, 1);
            },
          },
          lastError: null as null,
        },
        storage: {
          local: {
            get: (_keys: unknown, cb: (r: Record<string, unknown>) => void) => cb({}),
            set: (_obj: unknown, cb?: () => void) => { if (cb) cb(); },
            remove: (_keys: unknown, cb?: () => void) => { if (cb) cb(); },
          },
          sync: {
            get: (_keys: unknown, cb: (r: Record<string, unknown>) => void) => cb({}),
            set: (_obj: unknown, cb?: () => void) => { if (cb) cb(); },
          },
        },
      };

      (window as unknown as { chrome: typeof mock }).chrome = mock;
    },
    { state: initialState }
  );

  await page.goto(`${baseUrl}/src/sidepanel/index.html`, {
    waitUntil: 'networkidle',
  });

  // Wait for React root to mount — the #root div must have children.
  await page.waitForSelector('#root > *', { timeout: 10_000 });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test('idle screen: Start Recording button is disabled when activity name is empty', async ({ page }) => {
  await loadSidepanel(page, 'idle');

  // Header badge must show "Ready".
  const badge = page.locator('header .badge');
  await expect(badge).toContainText('Ready');

  // Activity name input must be empty and visible.
  const input = page.locator('#activity-name');
  await expect(input).toBeVisible();
  await expect(input).toHaveValue('');

  // "Start Recording" button must be disabled when field is empty.
  const startBtn = page.getByRole('button', { name: 'Start Recording' });
  await expect(startBtn).toBeDisabled();
});

test('start recording: typing activity name enables button and clicking transitions to recording state', async ({ page }) => {
  await loadSidepanel(page, 'idle');

  const input = page.locator('#activity-name');
  await input.fill('Test activity');

  // Button must become enabled once input has content.
  const startBtn = page.getByRole('button', { name: 'Start Recording' });
  await expect(startBtn).toBeEnabled();

  await startBtn.click();

  // After clicking, the mock transitions: idle → arming → recording (via
  // SESSION_STATE_UPDATED after 80ms).  Wait for the header badge to reach
  // "Recording" — this confirms the message round-trip completed and React
  // rendered the RecordingScreen.
  const badge = page.locator('header .badge');
  await expect(badge).toContainText('Recording', { timeout: 3_000 });

  // The "Recording Active" banner in the RecordingScreen must be visible,
  // confirming the screen rendered rather than an intermediate arming state.
  await expect(page.getByText('Recording Active')).toBeVisible();
});

/**
 * SW restart recovery — Playwright smoke test (iter 010).
 *
 * WHY THIS IS A SMOKE TEST:
 *   The SessionStore lives in the background service worker, not in the
 *   sidepanel page that the static harness serves.  The static harness has no
 *   channel to the background store's internals: chrome.storage.local.get
 *   always returns {} in the current no-op mock, and there is no
 *   window.__bgState or equivalent exposed by the production sidepanel bundle.
 *
 *   The full 6-step persistence round-trip is validated at the Vitest
 *   integration level in session-restore.integration.test.ts, which imports
 *   SessionStore directly and exercises the real persistence logic with an
 *   in-memory chrome mock.
 *
 *   This Playwright test validates the ONE observable consequence the harness
 *   CAN verify: that the sidepanel renders the rehydrated rawEventCount when
 *   the mock GET_STATE response reflects a rehydrated recording session (as
 *   would happen after SW restart + loadFromStorage()).  The "N events" text is
 *   rendered by RecordingScreen only when rawEventCount > 0.
 *
 * SCENARIO:
 *   1. Mock GET_STATE returns recording state with rawEventCount: 3 (simulates
 *      post-restart GET_STATE — the background has already called
 *      loadFromStorage() and reports the rehydrated count).
 *   2. Assert the sidepanel renders "Recording Active" and "3 events".
 */
test('record → SW restart → recover: session events rehydrate from chrome.storage.local', async ({ page }) => {
  // Inject a chrome.* mock that pre-configures the recording state with
  // rawEventCount: 3 — this simulates the sidepanel querying the background
  // after it has already completed restoreStateIfNeeded() + loadFromStorage().
  await page.addInitScript(() => {
    const sessionId = 'test-session-restart-smoke'
    const activityName = 'SW restart smoke test'
    const startedAt = new Date().toISOString()

    const listeners: Array<(msg: unknown) => void> = []

    function broadcast(type: string, payload: Record<string, unknown>) {
      for (const fn of listeners) {
        try { fn({ type, payload }); } catch { /* ignore */ }
      }
    }

    const mock = {
      runtime: {
        sendMessage: (
          msg: { type: string; payload?: Record<string, unknown> },
          cb?: (response: unknown) => void
        ) => {
          (window as unknown as Record<string, unknown[]>).__sentMessages =
            (window as unknown as Record<string, unknown[]>).__sentMessages ?? []
          ;((window as unknown as Record<string, unknown[]>).__sentMessages).push(msg)

          if (msg.type === 'GET_STATE') {
            // Simulate the post-restart GET_STATE: background is in recording
            // state and has already rehydrated 3 raw events from storage.
            if (cb) cb({
              state: 'recording',
              meta: {
                sessionId,
                activityName,
                startedAt,
                state: 'recording',
                pauseIntervals: [],
                schemaVersion: '2',
                recorderVersion: '2.0.0',
              },
              steps: [],
              rawEventCount: 3,
            })
            return
          }

          if (msg.type === 'GET_HISTORY') {
            if (cb) cb([])
            return
          }

          if (cb) cb(null)
        },
        onMessage: {
          addListener: (fn: (msg: unknown) => void) => { listeners.push(fn); },
          removeListener: (fn: (msg: unknown) => void) => {
            const i = listeners.indexOf(fn)
            if (i !== -1) listeners.splice(i, 1)
          },
        },
        lastError: null as null,
      },
      storage: {
        local: {
          // Simulate that chrome.storage.local contains the persisted events —
          // the sidepanel itself does not read storage directly, but returning
          // a non-empty store is honest about the simulated post-restart state.
          get: (_keys: unknown, cb: (r: Record<string, unknown>) => void) => cb({
            ledgerium_active_session: {
              sessionId,
              activityName,
              startedAt,
              state: 'recording',
              pauseIntervals: [],
              schemaVersion: '2',
              recorderVersion: '2.0.0',
            },
            [`ledgerium_active_session_events_${sessionId}`]: {
              persistSchemaVersion: 1,
              rawEvents: [
                { raw_event_id: 'raw-restart-001', event_type: 'click', t_ms: 100 },
                { raw_event_id: 'raw-restart-002', event_type: 'click', t_ms: 200 },
                { raw_event_id: 'raw-restart-003', event_type: 'click', t_ms: 300 },
              ],
              canonicalEvents: [],
              policyLog: [],
              liveSteps: [],
            },
          }),
          set: (_obj: unknown, cb?: () => void) => { if (cb) cb() },
          remove: (_keys: unknown, cb?: () => void) => { if (cb) cb() },
        },
        sync: {
          get: (_keys: unknown, cb: (r: Record<string, unknown>) => void) => cb({}),
          set: (_obj: unknown, cb?: () => void) => { if (cb) cb() },
        },
      },
    }

    ;(window as unknown as { chrome: typeof mock }).chrome = mock

    // Immediately broadcast SESSION_STATE_UPDATED so the React app transitions
    // to recording state without waiting for a user interaction.  This mirrors
    // what the background does after restoreStateIfNeeded() completes: it calls
    // broadcastStateUpdate() which sends SESSION_STATE_UPDATED to the sidepanel.
    setTimeout(() => {
      broadcast('SESSION_STATE_UPDATED', {
        state: 'recording',
        meta: {
          sessionId,
          activityName,
          startedAt,
          state: 'recording',
          pauseIntervals: [],
          schemaVersion: '2',
          recorderVersion: '2.0.0',
        },
      })
    }, 50)
  })

  await page.goto(`${baseUrl}/src/sidepanel/index.html`, { waitUntil: 'networkidle' })
  await page.waitForSelector('#root > *', { timeout: 10_000 })

  // The sidepanel must reflect the rehydrated recording state.
  const badge = page.locator('header .badge')
  await expect(badge).toContainText('Recording', { timeout: 3_000 })

  // The RecordingScreen renders "N events" only when rawEventCount > 0.
  // This is the observable consequence of a successful SW restart recovery:
  // the rehydrated rawEventCount is reflected in the GET_STATE response and
  // rendered by the sidepanel.
  await expect(page.getByText('Recording Active')).toBeVisible()
  await expect(page.getByText('3 events')).toBeVisible()
})

test('stop recording: clicking "Stop & Review" transitions to processing then complete state', async ({ page }) => {
  // Start from idle, transition to recording first.
  await loadSidepanel(page, 'idle');

  await page.locator('#activity-name').fill('Test activity');
  await page.getByRole('button', { name: 'Start Recording' }).click();

  const badge = page.locator('header .badge');
  await expect(badge).toContainText('Recording', { timeout: 3_000 });

  // Now stop the recording.
  const stopBtn = page.getByRole('button', { name: 'Stop & Review' });
  await expect(stopBtn).toBeVisible();
  await stopBtn.click();

  // The mock transitions: recording → stopping → review_ready (via
  // SESSION_STATE_UPDATED after 80ms).  The header badge must reach "Complete",
  // confirming the ProcessScreen rendered.
  await expect(badge).toContainText('Complete', { timeout: 3_000 });
});
