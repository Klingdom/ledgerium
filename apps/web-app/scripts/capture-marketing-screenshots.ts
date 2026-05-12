/**
 * Capture marketing-site screenshot assets from static HTML sources.
 *
 * Refreshes all PNG assets under `apps/web-app/public/img/` used by the
 * marketing site (home hero, demo steps, product outputs, intelligence view).
 *
 * Determinism contract (preserved per-target):
 *  - viewport pinned to each target's exact consumer dimensions
 *  - device-scale-factor 2 (retina-quality output; PNG compression is loss-less)
 *  - file:// URL load — no dev-server dependency, no network race
 *  - waits for `document.fonts.ready` + 600ms paint settle before capture
 *  - explicit `clip` to viewport rectangle (prevents full-page scroll capture)
 *  - colorScheme: 'dark' for all targets (all source HTML use dark theme)
 *
 * Usage:
 *   pnpm --filter @ledgerium/web-app exec tsx scripts/capture-marketing-screenshots.ts
 *
 * Consumers (verified from source):
 *  - screenshot-dashboard.png   → (public)/page.tsx:75-92     <Image width=1200 height=700>
 *  - screenshot-intelligence.png → orphan (no current consumer); refresh for consistency
 *  - screenshot-sop.png          → demo/page.tsx:56 + product/page.tsx:108 <Image width=600 height=450>
 *  - screenshot-upload.png       → demo/page.tsx:29           <Image width=600 height=450>
 *  - screenshot-workflow.png     → demo/page.tsx:47 + product/page.tsx:102 <Image width=600 height=450>
 *  - screenshot-process-groups.png → demo/page.tsx:65         <Image width=600 height=450>
 *  - screenshot-report.png       → product/page.tsx:120 (fill thumbnail, 16:9 crop)
 */

import { chromium } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, statSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve from `apps/web-app/scripts/` → `apps/web-app/public/...`
const WEB_APP_ROOT = resolve(__dirname, '..');
const SAMPLES_DIR = resolve(WEB_APP_ROOT, 'public', 'samples');
const IMG_DIR = resolve(WEB_APP_ROOT, 'public', 'img');

const DEVICE_SCALE_FACTOR = 2;
const FONT_PAINT_SETTLE_MS = 600;

interface Target {
  /** Absolute path to the source HTML file */
  sourceHtml: string;
  /** Absolute path to the output PNG */
  outputPng: string;
  /** Viewport dimensions — must match the consumer <Image> width/height exactly */
  viewport: { width: number; height: number };
}

const TARGETS: readonly Target[] = [
  // ── T1: Hero dashboard screenshot ──────────────────────────────────────────
  // Consumer: (public)/page.tsx:75-92  <Image width=1200 height=700>
  {
    sourceHtml: resolve(WEB_APP_ROOT, 'public', 'dashboard.html'),
    outputPng: resolve(IMG_DIR, 'screenshot-dashboard.png'),
    viewport: { width: 1200, height: 700 },
  },

  // ── T2: Agent intelligence view ────────────────────────────────────────────
  // Consumer: orphan (no current consumer) — refresh for consistency
  {
    sourceHtml: resolve(SAMPLES_DIR, 'agent-intelligence-sample.html'),
    outputPng: resolve(IMG_DIR, 'screenshot-intelligence.png'),
    viewport: { width: 600, height: 450 },
  },

  // ── T3: SOP document view ──────────────────────────────────────────────────
  // Consumer: demo/page.tsx:56 + product/page.tsx:108  <Image width=600 height=450>
  {
    sourceHtml: resolve(SAMPLES_DIR, 'sop-execution-sample.html'),
    outputPng: resolve(IMG_DIR, 'screenshot-sop.png'),
    viewport: { width: 600, height: 450 },
  },

  // ── T4: Upload / start recording screen ───────────────────────────────────
  // Consumer: demo/page.tsx:29  <Image width=600 height=450>
  {
    sourceHtml: resolve(SAMPLES_DIR, 'upload-sample.html'),
    outputPng: resolve(IMG_DIR, 'screenshot-upload.png'),
    viewport: { width: 600, height: 450 },
  },

  // ── T5: Workflow detail view ───────────────────────────────────────────────
  // Consumer: demo/page.tsx:47 + product/page.tsx:102  <Image width=600 height=450>
  {
    sourceHtml: resolve(SAMPLES_DIR, 'workflow-sample.html'),
    outputPng: resolve(IMG_DIR, 'screenshot-workflow.png'),
    viewport: { width: 600, height: 450 },
  },

  // ── T6: Process groups / library view ─────────────────────────────────────
  // Consumer: demo/page.tsx:65  <Image width=600 height=450>
  {
    sourceHtml: resolve(SAMPLES_DIR, 'process-groups-sample.html'),
    outputPng: resolve(IMG_DIR, 'screenshot-process-groups.png'),
    viewport: { width: 600, height: 450 },
  },

  // ── T7: Workflow report (KPIs, charts, insights) ───────────────────────────
  // Consumer: product/page.tsx:120 (fill thumbnail; 600×450 gives 4:3 ≥ 16:9 crop coverage)
  {
    sourceHtml: resolve(SAMPLES_DIR, 'report-sample.html'),
    outputPng: resolve(IMG_DIR, 'screenshot-report.png'),
    viewport: { width: 600, height: 450 },
  },
] as const;

async function captureTarget(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  target: Target,
  index: number,
  total: number
): Promise<void> {
  const label = `[${index + 1}/${total}] ${target.outputPng.split(/[\\/]/).slice(-1)[0]}`;

  if (!existsSync(target.sourceHtml)) {
    throw new Error(`${label} — source HTML not found: ${target.sourceHtml}`);
  }

  const beforeStat = existsSync(target.outputPng) ? statSync(target.outputPng) : null;

  console.log(`\n${label}`);
  console.log(`  source: ${target.sourceHtml}`);
  console.log(`  output: ${target.outputPng}`);
  console.log(`  viewport: ${target.viewport.width}×${target.viewport.height}`);
  if (beforeStat) {
    console.log(`  before: ${beforeStat.size.toLocaleString()} bytes, mtime ${beforeStat.mtime.toISOString()}`);
  } else {
    console.log(`  before: <file does not exist>`);
  }

  const context = await browser.newContext({
    viewport: target.viewport,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: 'dark',
  });

  try {
    const page = await context.newPage();

    const fileUrl = pathToFileURL(target.sourceHtml).href;
    await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 30_000 });

    // Wait for web fonts (Inter) to load before capturing.
    await page.evaluate(async () => {
      if (document.fonts && typeof (document.fonts as { ready?: Promise<unknown> }).ready?.then === 'function') {
        await document.fonts.ready;
      }
    });

    // Brief paint settle so any post-font-load layout reflow renders.
    await page.waitForTimeout(FONT_PAINT_SETTLE_MS);

    await page.screenshot({
      path: target.outputPng,
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: target.viewport.width,
        height: target.viewport.height,
      },
    });
  } finally {
    await context.close();
  }

  const afterStat = statSync(target.outputPng);
  const delta = beforeStat ? afterStat.size - beforeStat.size : 0;
  const sign = delta >= 0 ? '+' : '';
  console.log(`  after:  ${afterStat.size.toLocaleString()} bytes, mtime ${afterStat.mtime.toISOString()}`);
  if (beforeStat) {
    console.log(`  delta:  ${sign}${delta.toLocaleString()} bytes`);
  }
}

async function main(): Promise<void> {
  console.log(`[capture] capturing ${TARGETS.length} targets…`);

  const browser = await chromium.launch({ headless: true });
  try {
    for (let i = 0; i < TARGETS.length; i++) {
      await captureTarget(browser, TARGETS[i]!, i, TARGETS.length);
    }
  } finally {
    await browser.close();
  }

  console.log(`\n[capture] all ${TARGETS.length} targets complete.`);
}

main().catch((err: unknown) => {
  console.error('[capture] FAILED:', err);
  process.exit(1);
});
