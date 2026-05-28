/**
 * Capture Chrome Web Store product screenshots for the extension sidepanel.
 *
 * Produces 2 screenshots at exactly 1280×800:
 *   01-sidepanel-active-recording.png  — RecordingScreen with live step feed
 *   05-sidepanel-review-complete.png   — ProcessScreen, Map tab, with process map
 *
 * Strategy:
 *   Each sidepanel HTML file (400×600) is loaded in a 1280×800 viewport
 *   and positioned within a simulated browser-chrome wrapper so the final
 *   screenshot matches the Chrome Web Store 1280×800 requirement exactly.
 *
 * Prerequisites:
 *   None — uses local file:// URLs; no dev server required.
 *
 * Usage:
 *   cd apps/extension-app && pnpm exec tsx scripts/capture-sidepanel-screenshots.ts
 *
 * Output: C:\Users\philk\Desktop\ledgerium-chrome-store-assets\
 */

import { chromium } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, existsSync, statSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Config ──────────────────────────────────────────────────────────────────

const OUTPUT_DIR = 'C:\\Users\\philk\\Desktop\\ledgerium-chrome-store-assets';
const SAMPLES_DIR = resolve(__dirname, '..', 'public', 'samples');
const VIEWPORT = { width: 1280, height: 800 };
const DEVICE_SCALE_FACTOR = 2;
const FONT_PAINT_SETTLE_MS = 1800;

// ─── Targets ─────────────────────────────────────────────────────────────────

interface Target {
  sourceHtml: string;
  outputPng: string;
  label: string;
}

const TARGETS: readonly Target[] = [
  {
    sourceHtml: resolve(SAMPLES_DIR, 'sidepanel-recording.html'),
    outputPng: resolve(OUTPUT_DIR, '01-sidepanel-active-recording.png'),
    label: '01-sidepanel-active-recording.png',
  },
  {
    sourceHtml: resolve(SAMPLES_DIR, 'sidepanel-process-map.html'),
    outputPng: resolve(OUTPUT_DIR, '05-sidepanel-review-complete.png'),
    label: '05-sidepanel-review-complete.png',
  },
] as const;

// ─── Wrapper page HTML ────────────────────────────────────────────────────────
// Renders the sidepanel (400×600) inside a simulated browser-chrome on a
// 1280×800 dark-gradient marketing canvas.  The sidepanel is framed with
// a realistic browser-chrome top bar and a subtle drop shadow so it looks
// like a real browser extension popup in a product screenshot.

function buildWrapperHtml(sidepanelFileUrl: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{
    width:1280px;height:800px;overflow:hidden;
    background: linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f2a1e 100%);
    display:flex;align-items:center;justify-content:center;
    font-family:'Inter',-apple-system,sans-serif;
  }

  /* ── Background decoration ── */
  .bg-grid{
    position:fixed;top:0;left:0;width:100%;height:100%;
    background-image:
      linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
    background-size:48px 48px;
    pointer-events:none;
  }
  .bg-glow{
    position:fixed;
    width:600px;height:600px;
    border-radius:50%;
    background:radial-gradient(circle, rgba(5,150,105,.18) 0%, transparent 70%);
    top:-100px;right:-100px;
    pointer-events:none;
  }
  .bg-glow2{
    position:fixed;
    width:400px;height:400px;
    border-radius:50%;
    background:radial-gradient(circle, rgba(59,130,246,.1) 0%, transparent 70%);
    bottom:-80px;left:80px;
    pointer-events:none;
  }

  /* ── Scene layout ── */
  .scene{
    position:relative;
    display:flex;align-items:center;gap:64px;
    z-index:1;
  }

  /* ── Headline copy ── */
  .headline{
    color:#fff;
    max-width:380px;
    flex-shrink:0;
  }
  .headline-badge{
    display:inline-flex;align-items:center;gap:6px;
    background:rgba(5,150,105,.2);
    border:1px solid rgba(5,150,105,.35);
    border-radius:20px;
    padding:4px 12px;
    margin-bottom:16px;
  }
  .badge-dot{width:6px;height:6px;border-radius:50%;background:#10b981}
  .badge-text{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#10b981}
  .headline h2{font-size:32px;font-weight:700;line-height:1.2;margin-bottom:12px;color:#f1f5f9}
  .headline p{font-size:14px;color:#94a3b8;line-height:1.6;margin-bottom:24px}
  .feature-list{list-style:none;display:flex;flex-direction:column;gap:8px}
  .feature-list li{display:flex;align-items:center;gap:8px;font-size:13px;color:#cbd5e1}
  .feature-list li::before{content:'';width:6px;height:6px;border-radius:50%;background:#10b981;flex-shrink:0}

  /* ── Browser chrome frame ── */
  .browser-frame{
    border-radius:12px;
    overflow:hidden;
    box-shadow:
      0 25px 60px rgba(0,0,0,.55),
      0 0 0 1px rgba(255,255,255,.08);
    flex-shrink:0;
  }
  .browser-toolbar{
    display:flex;align-items:center;gap:10px;
    background:#1e1e1e;
    padding:10px 14px;
    border-bottom:1px solid rgba(255,255,255,.06);
  }
  .traffic-lights{display:flex;gap:6px}
  .tl{width:12px;height:12px;border-radius:50%}
  .tl-red{background:#ff5f57}
  .tl-yellow{background:#ffbd2e}
  .tl-green{background:#28c840}
  .address-bar{
    flex:1;
    background:rgba(255,255,255,.07);
    border:1px solid rgba(255,255,255,.06);
    border-radius:6px;
    height:26px;
    display:flex;align-items:center;
    padding:0 10px;
    gap:6px;
    margin:0 8px;
  }
  .address-icon{width:10px;height:10px;border-radius:50%;background:rgba(16,185,129,.6)}
  .address-text{font-size:10px;color:rgba(255,255,255,.4)}
  .ext-icon{
    width:22px;height:22px;border-radius:5px;
    background:linear-gradient(135deg,#059669,#047857);
    display:flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:700;color:#fff;
    cursor:pointer;
    position:relative;
  }
  .ext-icon::after{
    content:'';
    position:absolute;top:-3px;right:-3px;
    width:8px;height:8px;border-radius:50%;
    background:#10b981;
    border:1.5px solid #1e1e1e;
    animation:pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse{0%{opacity:1}50%{opacity:.4}100%{opacity:1}}

  /* ── Sidepanel inside frame ── */
  .sidepanel-host{
    width:400px;
    height:600px;
    overflow:hidden;
    background:#F9FAFB;
    position:relative;
  }
  .sidepanel-host iframe{
    width:400px;
    height:600px;
    border:none;
    display:block;
  }
</style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="bg-glow"></div>
  <div class="bg-glow2"></div>

  <div class="scene">
    <!-- Left: headline copy -->
    <div class="headline">
      <div class="headline-badge">
        <span class="badge-dot"></span>
        <span class="badge-text">Ledgerium AI</span>
      </div>
      <h2>Record any digital process — once.</h2>
      <p>Watch your work. Turn it into structured SOPs, process maps, and cycle-time intelligence automatically.</p>
      <ul class="feature-list">
        <li>Captures every click, form fill, and navigation</li>
        <li>Builds a live step feed as you work</li>
        <li>Generates SOPs and process maps instantly</li>
        <li>Measures cycle time and identifies bottlenecks</li>
      </ul>
    </div>

    <!-- Right: browser chrome + sidepanel -->
    <div class="browser-frame">
      <div class="browser-toolbar">
        <div class="traffic-lights">
          <div class="tl tl-red"></div>
          <div class="tl tl-yellow"></div>
          <div class="tl tl-green"></div>
        </div>
        <div class="address-bar">
          <div class="address-icon"></div>
          <span class="address-text">app.hubspot.com · /contacts/482671</span>
        </div>
        <div class="ext-icon">L</div>
      </div>
      <div class="sidepanel-host">
        <iframe src="${sidepanelFileUrl}" scrolling="no" title="Ledgerium sidepanel"></iframe>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Capture ──────────────────────────────────────────────────────────────────

async function captureTarget(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  target: Target,
  index: number,
  total: number
): Promise<void> {
  const label = `[${index + 1}/${total}] ${target.label}`;

  if (!existsSync(target.sourceHtml)) {
    throw new Error(`${label} — source HTML not found: ${target.sourceHtml}`);
  }

  console.log(`\n${label}`);
  console.log(`  source: ${target.sourceHtml}`);
  console.log(`  output: ${target.outputPng}`);

  const beforeStat = existsSync(target.outputPng) ? statSync(target.outputPng) : null;
  if (beforeStat) {
    console.log(`  before: ${beforeStat.size.toLocaleString()} bytes`);
  }

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: 'light',
  });

  try {
    const page = await context.newPage();

    // Build wrapper HTML that iframes the sidepanel source
    const sidepanelUrl = pathToFileURL(target.sourceHtml).href;
    const wrapperHtml = buildWrapperHtml(sidepanelUrl);

    // Load wrapper via setContent. Use 'domcontentloaded' — NOT 'networkidle' —
    // because the iframed sidepanel HTML contains Google Fonts <link> tags which
    // never resolve in file:// context, causing networkidle to hang indefinitely.
    await page.setContent(wrapperHtml, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Wait for fonts
    await page.evaluate(async () => {
      if (document.fonts && typeof (document.fonts as { ready?: Promise<unknown> }).ready?.then === 'function') {
        await document.fonts.ready;
      }
    });

    // Wait for iframe to fully paint
    await page.waitForTimeout(FONT_PAINT_SETTLE_MS);

    // Also wait for iframe fonts if accessible
    try {
      const frame = page.frames()[1];
      if (frame) {
        await frame.evaluate(async () => {
          if (document.fonts && typeof (document.fonts as { ready?: Promise<unknown> }).ready?.then === 'function') {
            await document.fonts.ready;
          }
        });
        await page.waitForTimeout(300);
      }
    } catch {
      // iframe fonts not accessible cross-origin — acceptable
    }

    await page.screenshot({
      path: target.outputPng,
      type: 'png',
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });

    const afterStat = statSync(target.outputPng);
    const delta = beforeStat ? afterStat.size - beforeStat.size : 0;
    const sign = delta >= 0 ? '+' : '';
    console.log(`  saved:  ${afterStat.size.toLocaleString()} bytes`);
    if (beforeStat) console.log(`  delta:  ${sign}${delta.toLocaleString()} bytes`);
    console.log(`  OK`);
  } finally {
    await context.close();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`[sidepanel-capture] capturing ${TARGETS.length} targets → ${OUTPUT_DIR}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-gpu',
      '--disable-web-security',       // allow file:// iframe to load without cross-origin block
      '--allow-file-access-from-files', // allow file:// resources from file:// pages
    ],
  });

  try {
    for (let i = 0; i < TARGETS.length; i++) {
      await captureTarget(browser, TARGETS[i]!, i, TARGETS.length);
    }
  } finally {
    await browser.close();
  }

  console.log(`\n[sidepanel-capture] done — ${TARGETS.length} screenshots saved.`);
}

main().catch((err: unknown) => {
  console.error('[sidepanel-capture] FAILED:', err);
  process.exit(1);
});
