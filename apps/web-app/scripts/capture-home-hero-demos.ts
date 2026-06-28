/**
 * capture-home-hero-demos.ts
 *
 * Regenerates the four live-app hero demo PNGs used on the Ledgerium home page
 * and product page.  All captures are taken from the running Next.js dev server
 * against public, auth-free routes that render deterministic fixture data.
 *
 * Determinism contract:
 *  - deviceScaleFactor 2 (retina; output PNG is 2400×1500 on disk, displayed at
 *    1200×750 by the browser — matches the consumer <Image> aspect ratio ~16:10)
 *  - colorScheme: 'dark' (all Ledgerium UI is dark-mode-default)
 *  - localStorage['ledgerium_analytics_consent'] set to 'essential' via
 *    context.addInitScript() BEFORE any navigation — suppresses consent banner
 *  - CSS [data-consent-banner]{display:none!important} injected as belt-and-braces
 *  - document.fonts.ready + FONT_PAINT_SETTLE_MS paint settle before capture
 *  - Element-level screenshot (page.locator().screenshot()) for clean framing
 *    — no viewport clip required; element boundary IS the crop boundary
 *  - workflow-view: waits for .react-flow__node to be visible (ReactFlow rendered)
 *  - sop-view: clicks the SOP tab first, then waits for SOP content
 *
 * Source routes (public, auth-free, fixture-driven):
 *  - /product — renders DemoAnnotatedDashboardHeader (Container 1),
 *               DemoAnnotatedWorkflowViews (Container 2, tabs: flow + sop),
 *               DemoAnnotatedReport (Container 3)
 *  - /        — renders DemoDashboard (home hero); used for dashboard.png
 *
 * Output files:
 *  apps/web-app/public/img/demo/workflow-view.png
 *  apps/web-app/public/img/demo/sop-view.png
 *  apps/web-app/public/img/demo/report-view.png
 *  apps/web-app/public/img/demo/dashboard.png
 *
 * Usage:
 *   # Dev server must be running first:
 *   pnpm --filter @ledgerium/web-app dev
 *
 *   # Then in a separate terminal:
 *   pnpm --filter @ledgerium/web-app exec tsx scripts/capture-home-hero-demos.ts
 *
 *   # Optional — override the base URL (default: http://localhost:3000):
 *   BASE_URL=http://localhost:3001 pnpm --filter @ledgerium/web-app exec tsx scripts/capture-home-hero-demos.ts
 */

import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { statSync, existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WEB_APP_ROOT = resolve(__dirname, '..');
const DEMO_IMG_DIR = resolve(WEB_APP_ROOT, 'public', 'img', 'demo');

const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:3000';
const DEVICE_SCALE_FACTOR = 2;

/**
 * Time to wait after document.fonts.ready for post-font-load layout reflow
 * and any CSS animation settle.  Larger than the marketing script because
 * Next.js hydration + ReactFlow layout takes additional time.
 */
const FONT_PAINT_SETTLE_MS = 1_200;

/**
 * Additional wait after clicking the SOP tab to allow the lazy-loaded
 * DemoSOPInner component to fully hydrate and paint before capture.
 */
const SOP_TAB_SETTLE_MS = 1_500;

/**
 * Timeout for waiting for key selectors (ReactFlow nodes, SOP content, etc.)
 */
const SELECTOR_TIMEOUT_MS = 20_000;

// ─── Consent suppression ───────────────────────────────────────────────────────

/**
 * Script injected into every page context before navigation.
 * Sets the analytics consent key so the banner component renders nothing.
 * Value 'essential' is one of the two accepted values that suppress the banner
 * (the other being 'full') — see AnalyticsConsent.tsx CONSENT_KEY logic.
 */
const SUPPRESS_CONSENT_SCRIPT = `
  try {
    localStorage.setItem('ledgerium_analytics_consent', 'essential');
  } catch (_) {
    // In case localStorage is blocked in this context — belt-and-braces
  }
`;

/**
 * CSS injected via page.addStyleTag() as a belt-and-braces banner suppressor
 * in case the component renders before our localStorage write is read.
 */
const SUPPRESS_CONSENT_CSS = `
  [data-consent-banner],
  [data-radix-dialog-overlay],
  [role="dialog"][aria-label*="consent" i],
  [role="dialog"][aria-label*="cookie" i] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function logFile(label: string, outputPath: string, beforeSize: number | null): void {
  const stat = existsSync(outputPath) ? statSync(outputPath) : null;
  if (stat) {
    const delta = beforeSize !== null ? stat.size - beforeSize : 0;
    const sign = delta >= 0 ? '+' : '';
    console.log(
      `  ${label}: ${stat.size.toLocaleString()} bytes${beforeSize !== null ? ` (${sign}${delta.toLocaleString()})` : ''} — ${outputPath.split(/[\\/]/).slice(-1)[0]}`,
    );
  }
}

// ─── Captures ─────────────────────────────────────────────────────────────────

/**
 * Capture: workflow-view.png
 *
 * Source:  /product — section[aria-label="Workflow views demo"]
 * Wait:    .react-flow__node visible (confirms ReactFlow rendered a populated map)
 * Crop:    The browser-chrome inner div (rounded-xl border) — the first child div
 *          of the section after the label row (which is a sibling, not a child
 *          of the captured element).
 *
 * We capture the entire section and let element.screenshot() handle the crop.
 * The section has a label row above the chrome frame; we capture the chrome frame
 * directly to exclude that label row from the output.
 */
async function captureWorkflowView(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
): Promise<void> {
  console.log('\n[1/4] workflow-view.png — Process Maps tab (ReactFlow)');

  const outputPath = resolve(DEMO_IMG_DIR, 'workflow-view.png');
  const beforeSize = existsSync(outputPath) ? statSync(outputPath).size : null;

  const context = await browser.newContext({
    // Wider viewport so the full container renders without layout collapse
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: 'dark',
  });

  try {
    await context.addInitScript(SUPPRESS_CONSENT_SCRIPT);

    const page = await context.newPage();
    await page.addStyleTag({ content: SUPPRESS_CONSENT_CSS });

    console.log(`  navigating to ${BASE_URL}/product …`);
    await page.goto(`${BASE_URL}/product`, { waitUntil: 'networkidle', timeout: 45_000 });

    // Belt-and-braces: inject CSS again after navigation (some SPAs re-render)
    await page.addStyleTag({ content: SUPPRESS_CONSENT_CSS });

    // Wait for fonts
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });

    // Wait for ReactFlow nodes to be present and visible in the DOM.
    // This is the critical gate that prevents capturing an empty process map.
    console.log('  waiting for .react-flow__node …');
    await page.waitForSelector('.react-flow__node', {
      state: 'visible',
      timeout: SELECTOR_TIMEOUT_MS,
    });

    // Paint settle after ReactFlow layout completes
    console.log(`  paint settle ${FONT_PAINT_SETTLE_MS}ms …`);
    await page.waitForTimeout(FONT_PAINT_SETTLE_MS);

    // Capture the browser chrome frame div (first child inside the section,
    // after the label row). The label row is a <div class="mb-3 flex …">
    // and the chrome frame is the next sibling: <div class="overflow-hidden rounded-xl …">
    //
    // Selector: the direct div child with class 'overflow-hidden rounded-xl' inside
    // the workflow views section.
    const chromeFrame = page.locator(
      'section[aria-label="Workflow views demo"] > div.overflow-hidden.rounded-xl',
    );

    await chromeFrame.waitFor({ state: 'visible', timeout: SELECTOR_TIMEOUT_MS });

    console.log('  capturing element …');
    await chromeFrame.screenshot({
      path: outputPath,
      type: 'png',
    });
  } finally {
    await context.close();
  }

  logFile('  written', outputPath, beforeSize);
}

/**
 * Capture: sop-view.png
 *
 * Source:  /product — same section, SOP tab clicked
 * Steps:   1. Navigate and wait for initial hydration (flow tab)
 *          2. Click the SOP tab button (#tab-sop)
 *          3. Wait for SOP content to appear (#panel-sop not hidden)
 *          4. Capture the same chrome frame element
 */
async function captureSOPView(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
): Promise<void> {
  console.log('\n[2/4] sop-view.png — SOP tab');

  const outputPath = resolve(DEMO_IMG_DIR, 'sop-view.png');
  const beforeSize = existsSync(outputPath) ? statSync(outputPath).size : null;

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: 'dark',
  });

  try {
    await context.addInitScript(SUPPRESS_CONSENT_SCRIPT);

    const page = await context.newPage();
    await page.addStyleTag({ content: SUPPRESS_CONSENT_CSS });

    console.log(`  navigating to ${BASE_URL}/product …`);
    await page.goto(`${BASE_URL}/product`, { waitUntil: 'networkidle', timeout: 45_000 });

    await page.addStyleTag({ content: SUPPRESS_CONSENT_CSS });

    // Wait for fonts and initial hydration
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });

    // Wait for the tab button to be clickable
    console.log('  waiting for SOP tab button …');
    await page.waitForSelector('#tab-sop', {
      state: 'visible',
      timeout: SELECTOR_TIMEOUT_MS,
    });

    // Brief settle for initial paint before clicking
    await page.waitForTimeout(500);

    // Click the SOP tab
    console.log('  clicking SOP tab …');
    await page.click('#tab-sop');

    // Wait for the SOP panel to become visible (hidden attribute removed)
    console.log('  waiting for SOP panel content …');
    await page.waitForSelector('#panel-sop:not([hidden])', {
      state: 'visible',
      timeout: SELECTOR_TIMEOUT_MS,
    });

    // Allow the lazy-loaded DemoSOPInner component to finish rendering
    console.log(`  SOP settle ${SOP_TAB_SETTLE_MS}ms …`);
    await page.waitForTimeout(SOP_TAB_SETTLE_MS);

    await page.addStyleTag({ content: SUPPRESS_CONSENT_CSS });

    // Capture the same chrome frame
    const chromeFrame = page.locator(
      'section[aria-label="Workflow views demo"] > div.overflow-hidden.rounded-xl',
    );

    await chromeFrame.waitFor({ state: 'visible', timeout: SELECTOR_TIMEOUT_MS });

    console.log('  capturing element …');
    await chromeFrame.screenshot({
      path: outputPath,
      type: 'png',
    });
  } finally {
    await context.close();
  }

  logFile('  written', outputPath, beforeSize);
}

/**
 * Capture: report-view.png
 *
 * Source:  /product — DemoAnnotatedReport component
 * Root:    div.mx-auto.w-full.max-w-5xl.overflow-hidden.rounded-xl
 *
 * The report is loaded via next/dynamic so we wait for meaningful content
 * before capturing.
 */
async function captureReportView(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
): Promise<void> {
  console.log('\n[3/4] report-view.png — Workflow Report');

  const outputPath = resolve(DEMO_IMG_DIR, 'report-view.png');
  const beforeSize = existsSync(outputPath) ? statSync(outputPath).size : null;

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: 'dark',
  });

  try {
    await context.addInitScript(SUPPRESS_CONSENT_SCRIPT);

    const page = await context.newPage();
    await page.addStyleTag({ content: SUPPRESS_CONSENT_CSS });

    console.log(`  navigating to ${BASE_URL}/product …`);
    await page.goto(`${BASE_URL}/product`, { waitUntil: 'networkidle', timeout: 45_000 });

    await page.addStyleTag({ content: SUPPRESS_CONSENT_CSS });

    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });

    // Scroll to the report section to ensure it's in the rendering viewport
    // (lazy loading or intersection observers could defer render)
    console.log('  scrolling to report section …');
    await page.evaluate(() => {
      const reportEl = document.querySelector('.max-w-5xl.overflow-hidden.rounded-xl');
      if (reportEl) {
        reportEl.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });

    // Wait for the report container with its distinctive class combo
    console.log('  waiting for report container …');
    await page.waitForSelector('.max-w-5xl.overflow-hidden.rounded-xl', {
      state: 'visible',
      timeout: SELECTOR_TIMEOUT_MS,
    });

    // Wait for report content to hydrate — look for elements inside the report
    // that would only appear after the dynamic component renders
    await page.waitForTimeout(FONT_PAINT_SETTLE_MS);

    await page.addStyleTag({ content: SUPPRESS_CONSENT_CSS });

    // Capture the report root element
    // DemoAnnotatedReport root: div.mx-auto.w-full.max-w-5xl.overflow-hidden.rounded-xl
    const reportEl = page.locator('div.mx-auto.w-full.max-w-5xl.overflow-hidden.rounded-xl');

    await reportEl.first().waitFor({ state: 'visible', timeout: SELECTOR_TIMEOUT_MS });

    console.log('  capturing element …');
    await reportEl.first().screenshot({
      path: outputPath,
      type: 'png',
    });
  } finally {
    await context.close();
  }

  logFile('  written', outputPath, beforeSize);
}

/**
 * Capture: dashboard.png
 *
 * Source:  /product — DemoAnnotatedDashboardHeader (Container 1)
 * Root:    section[aria-label="Dashboard header demo"] browser chrome frame
 *
 * No ReactFlow; wait for fonts + paint settle is sufficient.
 */
async function captureDashboard(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
): Promise<void> {
  console.log('\n[4/4] dashboard.png — Dashboard Header');

  const outputPath = resolve(DEMO_IMG_DIR, 'dashboard.png');
  const beforeSize = existsSync(outputPath) ? statSync(outputPath).size : null;

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: 'dark',
  });

  try {
    await context.addInitScript(SUPPRESS_CONSENT_SCRIPT);

    const page = await context.newPage();
    await page.addStyleTag({ content: SUPPRESS_CONSENT_CSS });

    console.log(`  navigating to ${BASE_URL}/product …`);
    await page.goto(`${BASE_URL}/product`, { waitUntil: 'networkidle', timeout: 45_000 });

    await page.addStyleTag({ content: SUPPRESS_CONSENT_CSS });

    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });

    // Wait for the dashboard section heading / content
    console.log('  waiting for dashboard section …');
    await page.waitForSelector('section[aria-label="Dashboard header demo"]', {
      state: 'visible',
      timeout: SELECTOR_TIMEOUT_MS,
    });

    console.log(`  paint settle ${FONT_PAINT_SETTLE_MS}ms …`);
    await page.waitForTimeout(FONT_PAINT_SETTLE_MS);

    await page.addStyleTag({ content: SUPPRESS_CONSENT_CSS });

    // Capture the browser chrome frame inside the dashboard section
    const chromeFrame = page.locator(
      'section[aria-label="Dashboard header demo"] > div.overflow-hidden.rounded-xl',
    );

    await chromeFrame.waitFor({ state: 'visible', timeout: SELECTOR_TIMEOUT_MS });

    console.log('  capturing element …');
    await chromeFrame.screenshot({
      path: outputPath,
      type: 'png',
    });
  } finally {
    await context.close();
  }

  logFile('  written', outputPath, beforeSize);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('[capture-home-hero-demos] starting');
  console.log(`  base URL:     ${BASE_URL}`);
  console.log(`  output dir:   ${DEMO_IMG_DIR}`);
  console.log(`  scale factor: ${DEVICE_SCALE_FACTOR}×`);
  console.log(`  color scheme: dark`);
  console.log('');
  console.log('  Consent suppression: localStorage["ledgerium_analytics_consent"] = "essential"');
  console.log('  + CSS [data-consent-banner]{display:none!important}');

  const browser = await chromium.launch({ headless: true });

  try {
    await captureWorkflowView(browser);
    await captureSOPView(browser);
    await captureReportView(browser);
    await captureDashboard(browser);
  } finally {
    await browser.close();
  }

  console.log('\n[capture-home-hero-demos] all 4 captures complete.');
  console.log('  Verify with: ls -la apps/web-app/public/img/demo/');
}

main().catch((err: unknown) => {
  console.error('[capture-home-hero-demos] FAILED:', err);
  process.exit(1);
});
