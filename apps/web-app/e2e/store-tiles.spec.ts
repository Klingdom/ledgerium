/**
 * Composes 1280×800 Chrome Web Store promotional tiles from extension screenshots.
 *
 * Each tile: dark Ledgerium-branded backdrop, centered phone-frame mockup, copy.
 *
 * Run:
 *   cd apps/web-app && npx playwright test e2e/store-tiles.spec.ts --config=e2e/extension-screenshots.config.ts
 *
 * Output: docs/chrome-store-assets/extension/store-*.png
 */

import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../docs/extension-screenshots');
const OUT_DIR = path.resolve(__dirname, '../../../docs/chrome-store-assets/extension');

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
    caption: 'Pause &amp; resume any time',
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
    sub: 'Clear error messaging — never lose work silently',
  },
];

function buildTileHtml(screenshotDataUrl: string, caption: string, sub: string): string {
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
    background: linear-gradient(140deg, #0a1628 0%, #0d1f1a 45%, #0f1729 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 72px;
    position: relative;
    overflow: hidden;
    padding: 0 80px;
  }
  /* Subtle grid */
  .bg::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(16,185,129,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(16,185,129,0.035) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }
  /* Ambient glow */
  .glow {
    position: absolute;
    width: 560px;
    height: 560px;
    background: radial-gradient(ellipse, rgba(16,185,129,0.13) 0%, transparent 70%);
    left: 60px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }
  /* Corner accent lines */
  .bg::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.4) 30%, rgba(16,185,129,0.7) 50%, rgba(16,185,129,0.4) 70%, transparent 100%);
  }
  /* Phone frame */
  .phone {
    position: relative;
    z-index: 1;
    width: 268px;
    height: 556px;
    border-radius: 30px;
    background: #0f172a;
    box-shadow:
      0 0 0 2px rgba(16,185,129,0.35),
      0 0 0 5px rgba(16,185,129,0.07),
      0 40px 100px rgba(0,0,0,0.75),
      0 0 140px rgba(16,185,129,0.10);
    overflow: hidden;
    flex-shrink: 0;
  }
  .phone img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }
  /* Text side */
  .copy {
    position: relative;
    z-index: 1;
    flex: 1;
    max-width: 560px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .wordmark {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
  .wordmark-text {
    font-size: 17px;
    font-weight: 700;
    color: #cbd5e1;
    letter-spacing: -0.2px;
  }
  .wordmark-text span { color: #10b981; }
  .caption {
    font-size: 44px;
    font-weight: 800;
    line-height: 1.12;
    color: #f8fafc;
    letter-spacing: -1.5px;
  }
  .sub {
    font-size: 19px;
    font-weight: 400;
    line-height: 1.55;
    color: #94a3b8;
    max-width: 440px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(16,185,129,0.10);
    border: 1px solid rgba(16,185,129,0.28);
    border-radius: 999px;
    padding: 9px 18px;
    font-size: 13px;
    font-weight: 600;
    color: #34d399;
    width: fit-content;
    margin-top: 10px;
    letter-spacing: 0.15px;
  }
  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
    flex-shrink: 0;
  }
</style>
</head>
<body>
<div class="bg">
  <div class="glow"></div>
  <div class="phone">
    <img src="${screenshotDataUrl}" alt="Ledgerium AI extension screenshot"/>
  </div>
  <div class="copy">
    <div class="wordmark">
      <svg width="30" height="30" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="wg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#20f2a6"/>
            <stop offset="1" stop-color="#0adf92"/>
          </linearGradient>
        </defs>
        <g stroke="url(#wg)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">
          <path d="M70 70 L110 45 L150 70 L110 95 Z"/>
          <path d="M70 110 L110 85 L150 110 L110 135 Z" opacity="0.95"/>
          <path d="M70 150 L110 125 L150 150 L110 175 Z" opacity="0.9"/>
        </g>
      </svg>
      <span class="wordmark-text">Ledgerium <span>AI</span></span>
    </div>
    <div class="caption">${caption}</div>
    <div class="sub">${sub}</div>
    <div class="badge">
      <span class="badge-dot"></span>
      Chrome Extension &nbsp;·&nbsp; Free to install
    </div>
  </div>
</div>
</body>
</html>`;
}

test.beforeAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

for (const tile of TILES) {
  test(`store tile: ${tile.id}`, async ({ browser }) => {
    const screenshotPath = path.join(SCREENSHOTS_DIR, tile.screenshot);
    const buf = fs.readFileSync(screenshotPath);
    const b64 = buf.toString('base64');
    const dataUrl = `data:image/png;base64,${b64}`;

    const html = buildTileHtml(dataUrl, tile.caption, tile.sub);

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const outPath = path.join(OUT_DIR, `store-${tile.id}.png`);
    await page.screenshot({ path: outPath, fullPage: false });

    await context.close();
  });
}
