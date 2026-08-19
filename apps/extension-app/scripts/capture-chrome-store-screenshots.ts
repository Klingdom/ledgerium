/**
 * Capture Chrome Web Store screenshots — Ledgerium AI Recorder (BLOCKER-8).
 *
 * WHY THIS FILE EXISTS, AND WHY IT DOES NOT REUSE
 * `scripts/capture-sidepanel-screenshots.ts`:
 *
 *   That script renders each sidepanel screen from a *static HTML sample*
 *   (apps/extension-app/public/samples/*.html) iframed inside a hand-built
 *   "browser chrome" wrapper page with invented marketing copy ("Record any
 *   digital process — once.") and a fabricated address bar
 *   ("app.hubspot.com · /contacts/482671") that was never actually
 *   navigated to by anything real. None of the pixels in its output came
 *   from the running extension. It also sets `deviceScaleFactor: 2` while
 *   clipping to 1280×800 CSS pixels, which produces a 2560×1600 PNG, not
 *   the 1280×800 Chrome Web Store requires — confirmed empirically while
 *   building this script (see capture log / iteration report).
 *
 *   This script instead loads the REAL unpacked extension via
 *   chromium.launchPersistentContext() + --load-extension (the same
 *   pattern proven in e2e/real-extension/sidepanel-real.spec.ts), drives a
 *   REAL recording session against a REAL local HTTP fixture page with
 *   real clicks and real typed input, and screenshots the REAL sidepanel
 *   UI reacting to that real session — the real background service worker,
 *   the real content script, the real message bus, the real process
 *   engine. Nothing is mocked and nothing is drawn.
 *
 * WHAT "COMPOSITING" MEANS HERE, AND WHY IT IS NOT A MOCKUP:
 *
 *   Chrome's native side panel is rendered by the browser's own UI chrome,
 *   which Playwright/CDP cannot screenshot — screenshots are per-page only.
 *   There is therefore no way to automate a single screenshot showing a
 *   real webpage and the real *docked* side panel simultaneously.
 *
 *   To produce a useful, honest 1280×800 image within that hard technical
 *   constraint, this script takes two REAL, UNALTERED screenshots of the
 *   SAME live session at the SAME moment — the fixture page on the left,
 *   the real sidepanel on the right — and places them edge-to-edge with no
 *   scaling, no added text, no invented graphics, and no fake browser
 *   chrome. This mirrors literal on-screen reality for a user who has the
 *   side panel open next to the page they are recording: two real,
 *   synchronized captures, unmodified, placed side by side. No pixel in
 *   either half is invented.
 *
 * WHAT WAS NOT CAPTURED, AND WHY (say so plainly rather than fake it):
 *
 *   A completed ("Upload complete") progress state was not captured.
 *   `background/uploader.ts` enforces HTTPS-only for the sync URL
 *   (`uploadUrl.startsWith('https://')` — see BLOCKER-5), so driving a real
 *   completed upload would require standing up a locally-trusted HTTPS
 *   endpoint inside this script (self-signed cert + `--ignore-certificate-
 *   errors`), which is achievable but was judged not worth the added
 *   moving parts for one screenshot. Screenshot 04 instead shows the real,
 *   unaltered Export tab of ProcessScreen — the actual screen a user sees
 *   to export/upload a completed recording — in its ready (pre-click)
 *   state. This is still 100% real UI, just not mid-network-request.
 *
 * OUTPUT: apps/extension-app/../../docs/store-assets/chrome/
 *   01-idle.png             — fixture page + sidepanel IdleScreen
 *   02-active-recording.png — fixture page (mid form-fill) + RecordingScreen
 *   03-step-review.png      — fixture page (submitted) + ProcessScreen (Map tab)
 *   04-upload-flow.png      — fixture page (submitted) + ProcessScreen (Export tab)
 *
 * PREREQUISITE: pnpm --filter @ledgerium/extension-app build
 *
 * USAGE:
 *   cd apps/extension-app && pnpm exec tsx scripts/capture-chrome-store-screenshots.ts
 *   (or: pnpm --filter @ledgerium/extension-app capture:store-screenshots)
 *
 * Real-extension harness startup (service worker registration) is
 * occasionally flaky, matching the documented behaviour of
 * e2e/real-extension/sidepanel-real.spec.ts (retries: 1 there). If this
 * script fails on `waitForEvent('serviceworker')` or
 * `launchPersistentContext`, just re-run it.
 */

import { chromium } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Config ──────────────────────────────────────────────────────────────────

const DIST_PATH = path.resolve(__dirname, '..', 'dist');
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', '..', 'docs', 'store-assets', 'chrome');
const SIDEPANEL_RELATIVE = 'src/sidepanel/index.html';

/** Chrome Web Store's exact required screenshot size. Do not scale this. */
const TOTAL_WIDTH = 1280;
const TOTAL_HEIGHT = 800;

/**
 * Sidepanel pane width. 460px is a realistic width for Chrome's side panel —
 * users can drag-resize it well past its ~320-400px default — so this is a
 * genuinely reachable rendering of the real, unmodified sidepanel UI, not an
 * invented layout. The fixture-page pane takes the remainder of the canvas.
 */
const SIDEPANEL_WIDTH = 460;
const PAGE_WIDTH = TOTAL_WIDTH - SIDEPANEL_WIDTH;

const SW_STARTUP_TIMEOUT_MS = 20_000;
const REACT_MOUNT_TIMEOUT_MS = 15_000;

// ─── Fixture page ────────────────────────────────────────────────────────────
//
// A small, self-contained, non-PII demo page for the extension to record.
// "Acme" is a generic placeholder company name (no real company, no
// trademark). Deliberately mirrors the product's own example placeholder
// text ("e.g. Submit expense report" in IdleScreen.tsx) so the story told
// across all 4 screenshots is coherent. No network calls — the "Submit"
// button updates the DOM locally so the fixture works fully offline.

const FIXTURE_TITLE = 'Expense Report — Acme Internal Tools';

const FIXTURE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${FIXTURE_TITLE}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #F3F4F6; color: #111827;
  }
  header {
    display: flex; align-items: center; gap: 10px;
    padding: 16px 28px; background: #ffffff; border-bottom: 1px solid #E5E7EB;
  }
  .logo {
    width: 26px; height: 26px; border-radius: 6px;
    background: linear-gradient(135deg, #4338CA, #6366F1);
  }
  header h1 { font-size: 15px; margin: 0; font-weight: 700; }
  nav { margin-left: auto; display: flex; gap: 20px; font-size: 13px; color: #6B7280; }
  nav span.active { color: #4338CA; font-weight: 600; }
  main { max-width: 480px; margin: 40px auto; padding: 0 24px; }
  .card {
    background: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px;
    padding: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .card h2 { font-size: 18px; margin: 0 0 4px; }
  .card p.sub { margin: 0 0 20px; font-size: 13px; color: #6B7280; }
  label { display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; }
  .field { margin-bottom: 16px; }
  input[type="text"] {
    width: 100%; padding: 9px 12px; font-size: 14px;
    border: 1px solid #D1D5DB; border-radius: 8px; outline: none;
  }
  input[type="text"]:focus { border-color: #4338CA; box-shadow: 0 0 0 3px rgba(67,56,202,0.12); }
  button#submit-btn {
    width: 100%; padding: 10px 12px; font-size: 14px; font-weight: 600;
    background: #4338CA; color: #fff; border: none; border-radius: 8px; cursor: pointer;
  }
  button#submit-btn:hover { background: #3730A3; }
  #confirmation {
    display: none; margin-top: 16px; padding: 12px 14px; border-radius: 8px;
    background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 13px;
  }
  #confirmation.shown { display: block; }
</style>
</head>
<body>
  <header>
    <div class="logo"></div>
    <h1>Acme Internal Tools</h1>
    <nav><span class="active">Expenses</span><span>Reports</span><span>Settings</span></nav>
  </header>
  <main>
    <div class="card">
      <h2>New expense report</h2>
      <p class="sub">Submit a reimbursable expense for approval.</p>
      <div class="field">
        <label for="vendor-input">Vendor</label>
        <input id="vendor-input" type="text" placeholder="e.g. Office Supplies Co." />
      </div>
      <div class="field">
        <label for="amount-input">Amount (USD)</label>
        <input id="amount-input" type="text" placeholder="0.00" />
      </div>
      <button id="submit-btn" type="button">Submit expense report</button>
      <div id="confirmation">Expense report submitted for approval.</div>
    </div>
  </main>
  <script>
    document.getElementById('submit-btn').addEventListener('click', function () {
      document.getElementById('confirmation').classList.add('shown');
    });
  </script>
</body>
</html>`;

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
        close: () => new Promise<void>((res2) => server.close(() => res2())),
      });
    });
  });
}

// ─── Helper: resolve extension ID from a registered service worker URL ────────

function extensionIdFromSwUrl(swUrl: string): string {
  const match = swUrl.match(/^chrome-extension:\/\/([a-z]{32})\//);
  if (!match || !match[1]) {
    throw new Error(`Cannot parse extension ID from service worker URL: "${swUrl}"`);
  }
  return match[1];
}

// ─── Helper: read a PNG's actual raster dimensions from its IHDR chunk ────────
//
// Do not trust viewport/clip settings to guarantee output pixel dimensions —
// a non-default deviceScaleFactor silently multiplies them (confirmed: this
// is exactly what scripts/capture-sidepanel-screenshots.ts does, producing
// 2560x1600 output despite a 1280x800 clip). This script deliberately never
// sets deviceScaleFactor (stays at the Playwright default of 1) and this
// function independently verifies the real on-disk result either way.

function readPngDimensions(filePath: string): { width: number; height: number } {
  const buf = fs.readFileSync(filePath);
  const isPng =
    buf.length >= 33 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf.toString('ascii', 12, 16) === 'IHDR';
  if (!isPng) throw new Error(`Not a recognizable PNG (or IHDR missing) at expected offset: ${filePath}`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// ─── Helper: compose two real, unaltered screenshots side by side ─────────────
//
// See the file-header comment for why this exists and what it is not.

async function composeSideBySide(
  compositor: Page,
  leftPngPath: string,
  rightPngPath: string,
  leftWidth: number,
  rightWidth: number,
  height: number,
  outPngPath: string,
): Promise<void> {
  const leftUrl = pathToFileURL(leftPngPath).href;
  const rightUrl = pathToFileURL(rightPngPath).href;
  const totalWidth = leftWidth + rightWidth;

  const html = `<!DOCTYPE html>
<html><head><style>
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:${totalWidth}px;height:${height}px;overflow:hidden;}
  .row{display:flex;width:${totalWidth}px;height:${height}px;}
  .row img{display:block;object-fit:none;object-position:0 0;}
  .row img.left{width:${leftWidth}px;height:${height}px;}
  .row img.right{width:${rightWidth}px;height:${height}px;}
</style></head>
<body><div class="row">
  <img class="left" src="${leftUrl}" />
  <img class="right" src="${rightUrl}" />
</div></body></html>`;

  // page.setContent() leaves the document at an opaque (about:blank) origin,
  // from which Chromium blocks loading file:// image resources even with
  // --allow-file-access-from-files. Writing the compositor HTML to a real
  // file and navigating to it gives the document a genuine file:// origin,
  // from which its sibling file:// screenshot images load normally.
  const compositorHtmlPath = outPngPath.replace(/\.png$/, '.compositor.html');
  fs.writeFileSync(compositorHtmlPath, html, 'utf-8');
  try {
    await compositor.setViewportSize({ width: totalWidth, height });
    await compositor.goto(pathToFileURL(compositorHtmlPath).href, { waitUntil: 'load' });
    // Let both real, already-rendered raster images finish decoding/painting.
    await compositor.waitForTimeout(150);
    await compositor.screenshot({
      path: outPngPath,
      clip: { x: 0, y: 0, width: totalWidth, height },
    });
  } finally {
    try { fs.unlinkSync(compositorHtmlPath); } catch { /* non-fatal */ }
  }
}

// ─── Main capture flow ──────────────────────────────────────────────────────

async function waitForStepCount(sidepanel: Page, atLeast: number, timeoutMs = 12_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await sidepanel.locator('.card').count();
    if (count >= atLeast) return;
    await sidepanel.waitForTimeout(300);
  }
  throw new Error(`Timed out waiting for at least ${atLeast} step card(s) in the live step feed.`);
}

async function main(): Promise<void> {
  if (!fs.existsSync(DIST_PATH) || !fs.existsSync(path.join(DIST_PATH, 'manifest.json'))) {
    throw new Error(
      `Extension dist not found at: ${DIST_PATH}\n` +
      'Build the extension first: pnpm --filter @ledgerium/extension-app build',
    );
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledgerium-store-shots-'));
  let context: BrowserContext | null = null;
  let fixtureServer: Awaited<ReturnType<typeof startFixtureServer>> | null = null;
  let compositorBrowser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  // Intermediate raw captures live in a temp dir — only the composed 1280x800
  // outputs are written to the tracked docs/ directory.
  const rawDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledgerium-store-shots-raw-'));

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

    let extensionId: string;
    const existingSws = context.serviceWorkers();
    if (existingSws.length > 0) {
      extensionId = extensionIdFromSwUrl(existingSws[0]!.url());
    } else {
      const sw = await context.waitForEvent('serviceworker', { timeout: SW_STARTUP_TIMEOUT_MS });
      extensionId = extensionIdFromSwUrl(sw.url());
    }
    console.log(`[capture] extension id: ${extensionId}`);

    // Open the real fixture page first so it is the active tab when the
    // recorder queries chrome.tabs at session start (same fix documented in
    // sidepanel-real.spec.ts test 2/4).
    const contentPage = await context.newPage();
    await contentPage.setViewportSize({ width: PAGE_WIDTH, height: TOTAL_HEIGHT });
    await contentPage.goto(fixtureServer.url, { waitUntil: 'networkidle' });
    await contentPage.waitForSelector('#submit-btn', { timeout: 10_000 });

    const sidepanel = await context.newPage();
    await sidepanel.setViewportSize({ width: SIDEPANEL_WIDTH, height: TOTAL_HEIGHT });
    await sidepanel.goto(`chrome-extension://${extensionId}/${SIDEPANEL_RELATIVE}`, {
      waitUntil: 'domcontentloaded',
    });
    await sidepanel.waitForSelector('#root > *', { timeout: REACT_MOUNT_TIMEOUT_MS });

    await contentPage.bringToFront();

    const badge = sidepanel.locator('header .badge');
    await badge.waitFor({ state: 'visible', timeout: 12_000 });

    // Font settle before any capture.
    await sidepanel.evaluate(async () => { await document.fonts?.ready; });
    await contentPage.evaluate(async () => { await document.fonts?.ready; });
    await sidepanel.waitForTimeout(300);

    // ── State 1: idle ──────────────────────────────────────────────────────
    console.log('[capture] state 1/4: idle');
    const p1Left = path.join(rawDir, 'left-01-idle.png');
    const p1Right = path.join(rawDir, 'right-01-idle.png');
    await contentPage.screenshot({ path: p1Left, clip: { x: 0, y: 0, width: PAGE_WIDTH, height: TOTAL_HEIGHT } });
    await sidepanel.screenshot({ path: p1Right, clip: { x: 0, y: 0, width: SIDEPANEL_WIDTH, height: TOTAL_HEIGHT } });

    // ── Start a real recording session ─────────────────────────────────────
    await sidepanel.locator('#activity-name').fill('Submit expense report');
    const startBtn = sidepanel.getByRole('button', { name: 'Start Recording' });
    await startBtn.waitFor({ state: 'visible' });
    await startBtn.click();
    await badge.filter({ hasText: 'Recording' }).waitFor({ timeout: 20_000 });

    // ── Drive real interactions on the real fixture page ──────────────────
    // The content script is injected asynchronously on session start; retry
    // the first interaction until it registers as a captured step rather
    // than sleeping a fixed, unverifiable duration.
    let stepsSeen = 0;
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      await contentPage.locator('#vendor-input').click();
      await contentPage.locator('#vendor-input').fill('Acme Office Supplies Co.');
      stepsSeen = await sidepanel.locator('.card').count();
      if (stepsSeen > 0) break;
      await sidepanel.waitForTimeout(400);
    }
    if (stepsSeen === 0) {
      throw new Error('No live step registered after interacting with the fixture page — capture pipeline did not fire.');
    }

    await contentPage.locator('#amount-input').click();
    await contentPage.locator('#amount-input').fill('482.50');
    // Debounced input capture — give it time to register before the click below.
    await sidepanel.waitForTimeout(500);

    // ── State 2: active recording, mid form-fill ───────────────────────────
    console.log('[capture] state 2/4: active recording');
    await waitForStepCount(sidepanel, 1);
    const p2Left = path.join(rawDir, 'left-02-recording.png');
    const p2Right = path.join(rawDir, 'right-02-recording.png');
    await contentPage.screenshot({ path: p2Left, clip: { x: 0, y: 0, width: PAGE_WIDTH, height: TOTAL_HEIGHT } });
    await sidepanel.screenshot({ path: p2Right, clip: { x: 0, y: 0, width: SIDEPANEL_WIDTH, height: TOTAL_HEIGHT } });

    // ── Submit, then stop & review ──────────────────────────────────────────
    await contentPage.locator('#submit-btn').click();
    await contentPage.locator('#confirmation.shown').waitFor({ timeout: 5_000 });
    await sidepanel.waitForTimeout(500);

    const stopBtn = sidepanel.getByRole('button', { name: 'Stop & Review' });
    await stopBtn.waitFor({ state: 'visible' });
    await stopBtn.click();

    // ProcessScreen mounts on the Map tab by default; wait for the session
    // header ("Session complete") to confirm the transition landed.
    await sidepanel.getByText('Session complete').waitFor({ timeout: 20_000 });
    // Let the process map finish laying out.
    await sidepanel.waitForTimeout(1_200);

    // ── State 3: step review (Map tab) ─────────────────────────────────────
    console.log('[capture] state 3/4: step review');
    const p3Left = path.join(rawDir, 'left-03-review.png');
    const p3Right = path.join(rawDir, 'right-03-review.png');
    await contentPage.screenshot({ path: p3Left, clip: { x: 0, y: 0, width: PAGE_WIDTH, height: TOTAL_HEIGHT } });
    await sidepanel.screenshot({ path: p3Right, clip: { x: 0, y: 0, width: SIDEPANEL_WIDTH, height: TOTAL_HEIGHT } });

    // ── State 4: export / upload flow ──────────────────────────────────────
    console.log('[capture] state 4/4: upload flow (Export tab)');
    const exportTab = sidepanel.getByRole('button', { name: 'Export', exact: true });
    await exportTab.click();
    await sidepanel.getByRole('button', { name: 'Open in Ledgerium AI Website' }).waitFor({ timeout: 8_000 });
    await sidepanel.waitForTimeout(400);
    const p4Left = path.join(rawDir, 'left-04-export.png');
    const p4Right = path.join(rawDir, 'right-04-export.png');
    await contentPage.screenshot({ path: p4Left, clip: { x: 0, y: 0, width: PAGE_WIDTH, height: TOTAL_HEIGHT } });
    await sidepanel.screenshot({ path: p4Right, clip: { x: 0, y: 0, width: SIDEPANEL_WIDTH, height: TOTAL_HEIGHT } });

    // ── Compose all 4 pairs into final 1280x800 outputs ─────────────────────
    // file:// image sources are blocked from a page loaded via setContent()
    // (its origin is not itself file://) unless these flags are set. This
    // compositor instance never loads the extension and never navigates
    // anywhere except a static, locally-authored data/file URL — it exists
    // solely to place two already-captured real screenshots side by side.
    compositorBrowser = await chromium.launch({
      headless: true,
      args: ['--disable-web-security', '--allow-file-access-from-files'],
    });
    const compositor = await compositorBrowser.newPage();

    const targets: Array<{ left: string; right: string; out: string; label: string }> = [
      { left: p1Left, right: p1Right, out: path.join(OUTPUT_DIR, '01-idle.png'), label: 'idle' },
      { left: p2Left, right: p2Right, out: path.join(OUTPUT_DIR, '02-active-recording.png'), label: 'active recording' },
      { left: p3Left, right: p3Right, out: path.join(OUTPUT_DIR, '03-step-review.png'), label: 'step review' },
      { left: p4Left, right: p4Right, out: path.join(OUTPUT_DIR, '04-upload-flow.png'), label: 'upload flow' },
    ];

    for (const t of targets) {
      await composeSideBySide(compositor, t.left, t.right, PAGE_WIDTH, SIDEPANEL_WIDTH, TOTAL_HEIGHT, t.out);
      const dims = readPngDimensions(t.out);
      const size = fs.statSync(t.out).size;
      const ok = dims.width === TOTAL_WIDTH && dims.height === TOTAL_HEIGHT;
      console.log(
        `[capture] ${t.label.padEnd(18)} -> ${path.basename(t.out)}  ${dims.width}x${dims.height}  ${size.toLocaleString()} bytes  ${ok ? 'OK' : 'DIMENSION MISMATCH'}`,
      );
      if (!ok) {
        throw new Error(`${t.out} is ${dims.width}x${dims.height}, expected ${TOTAL_WIDTH}x${TOTAL_HEIGHT}`);
      }
    }

    console.log(`\n[capture] done — 4 screenshots written to ${OUTPUT_DIR}`);
  } finally {
    if (compositorBrowser) await compositorBrowser.close();
    if (context) await context.close();
    if (fixtureServer) await fixtureServer.close();
    await new Promise((resolve) => setTimeout(resolve, 500));
    try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch { /* non-fatal */ }
    try { fs.rmSync(rawDir, { recursive: true, force: true }); } catch { /* non-fatal */ }
  }
}

main().catch((err: unknown) => {
  console.error('[capture] FAILED:', err);
  process.exit(1);
});
