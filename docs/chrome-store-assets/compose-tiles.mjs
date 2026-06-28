/**
 * Composes 1280×800 Chrome Web Store tiles from the 7 extension sidepanel screenshots.
 *
 * Each tile: dark branded background, centred phone-frame mockup, caption text.
 * Run: node docs/chrome-store-assets/compose-tiles.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'extension');
const SCREENSHOTS = path.join(__dirname, '../../docs/extension-screenshots');

// Tile definitions — Store shows up to 5; we produce all 7 for flexibility.
const TILES = [
  {
    id: '01-record-any-workflow',
    screenshot: '04-recording-active.png',
    caption: 'Record any browser workflow',
    sub: 'Live step capture — automatically structured',
  },
  {
    id: '02-start-recording',
    screenshot: '01-idle-screen.png',
    caption: 'Name it and hit record',
    sub: 'Works in any web app, no setup required',
  },
  {
    id: '03-pause-resume',
    screenshot: '05-paused-screen.png',
    caption: 'Pause & resume any time',
    sub: 'Your progress is preserved mid-session',
  },
  {
    id: '04-processing',
    screenshot: '06-stopping-screen.png',
    caption: 'Instantly turns steps into an SOP',
    sub: 'Finalizes and syncs to your Ledgerium library',
  },
  {
    id: '05-waiting-to-capture',
    screenshot: '03-recording-empty.png',
    caption: 'Just start working',
    sub: 'Ledgerium captures every step as you go',
  },
  {
    id: '06-arming',
    screenshot: '02-arming-screen.png',
    caption: 'Session starts in seconds',
    sub: 'Zero configuration, zero interruption',
  },
  {
    id: '07-error-recovery',
    screenshot: '07-error-screen.png',
    caption: 'Handles disconnections gracefully',
    sub: 'Clear error messaging — never lose your work silently',
  },
];

// CSS for the tile HTML template
function buildHtml(screenshotDataUrl, caption, sub) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 1280px;
    height: 800px;
    overflow: hidden;
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  }
  .bg {
    width: 1280px;
    height: 800px;
    background: linear-gradient(135deg, #0f172a 0%, #0d1f1a 50%, #0a1628 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 80px;
    position: relative;
    overflow: hidden;
  }
  /* Subtle grid lines for depth */
  .bg::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  /* Ambient glow behind phone */
  .glow {
    position: absolute;
    width: 500px;
    height: 500px;
    background: radial-gradient(ellipse, rgba(16,185,129,0.15) 0%, transparent 70%);
    left: 50px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }
  /* Phone frame */
  .phone {
    position: relative;
    z-index: 1;
    width: 280px;
    height: 580px;
    border-radius: 32px;
    background: #1a1a2e;
    box-shadow:
      0 0 0 2px rgba(16,185,129,0.3),
      0 0 0 4px rgba(16,185,129,0.08),
      0 32px 80px rgba(0,0,0,0.7),
      0 0 120px rgba(16,185,129,0.12);
    overflow: hidden;
    flex-shrink: 0;
  }
  .phone img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 32px;
  }
  /* Text side */
  .copy {
    position: relative;
    z-index: 1;
    flex: 1;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .wordmark {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .wordmark-icon {
    width: 32px;
    height: 32px;
  }
  .wordmark-text {
    font-size: 18px;
    font-weight: 700;
    color: #f1f5f9;
    letter-spacing: -0.3px;
  }
  .wordmark-text span { color: #10b981; }
  .caption {
    font-size: 42px;
    font-weight: 800;
    line-height: 1.15;
    color: #f8fafc;
    letter-spacing: -1.2px;
  }
  .caption em {
    font-style: normal;
    color: #10b981;
  }
  .sub {
    font-size: 20px;
    font-weight: 400;
    line-height: 1.5;
    color: #94a3b8;
    max-width: 420px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(16,185,129,0.12);
    border: 1px solid rgba(16,185,129,0.3);
    border-radius: 999px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    color: #10b981;
    width: fit-content;
    margin-top: 8px;
    letter-spacing: 0.2px;
  }
  .badge::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
  }
</style>
</head>
<body>
<div class="bg">
  <div class="glow"></div>
  <div class="phone">
    <img src="${screenshotDataUrl}" alt="extension screenshot"/>
  </div>
  <div class="copy">
    <div class="wordmark">
      <svg class="wordmark-icon" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#20f2a6"/>
            <stop offset="1" stop-color="#0adf92"/>
          </linearGradient>
        </defs>
        <g stroke="url(#g)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">
          <path d="M70 70 L110 45 L150 70 L110 95 Z"/>
          <path d="M70 110 L110 85 L150 110 L110 135 Z" opacity="0.95"/>
          <path d="M70 150 L110 125 L150 150 L110 175 Z" opacity="0.9"/>
        </g>
      </svg>
      <span class="wordmark-text">Ledgerium <span>AI</span></span>
    </div>
    <div class="caption">${caption}</div>
    <div class="sub">${sub}</div>
    <div class="badge">Chrome Extension · Free to install</div>
  </div>
</div>
</body>
</html>`;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  for (const tile of TILES) {
    const screenshotPath = path.join(SCREENSHOTS, tile.screenshot);
    const buf = fs.readFileSync(screenshotPath);
    const b64 = buf.toString('base64');
    const dataUrl = `data:image/png;base64,${b64}`;

    const html = buildHtml(dataUrl, tile.caption, tile.sub);
    const page = await context.newPage();

    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    const outPath = path.join(OUT, `store-${tile.id}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
    await page.close();

    const outBuf = fs.readFileSync(outPath);
    const w = outBuf.readUInt32BE(16);
    const h = outBuf.readUInt32BE(20);
    const kb = Math.round(outBuf.length / 1024);
    console.log(`  ${path.basename(outPath)}: ${w}x${h} (${kb} KB)`);
  }

  await context.close();
  await browser.close();
  console.log(`\nAll ${TILES.length} tiles written to ${OUT}`);
}

run().catch(err => { console.error(err); process.exit(1); });
