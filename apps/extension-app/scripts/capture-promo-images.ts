/**
 * Capture Chrome Web Store promotional images from static HTML templates.
 *
 * Produces 3 PNG files:
 *   promo-small-440x280.png    — Required small promo tile  (440×280)
 *   promo-large-920x680.png    — Optional large promo image (920×680)
 *   promo-marquee-1400x560.png — Optional marquee banner    (1400×560)
 *
 * Prerequisites:
 *   None — reads from local HTML files only.
 *
 * Usage:
 *   cd apps/extension-app && pnpm exec tsx scripts/capture-promo-images.ts
 *
 * Output: C:\Users\philk\Desktop\ledgerium-chrome-store-assets\
 */

import { chromium } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Config ──────────────────────────────────────────────────────────────────

const OUTPUT_DIR = 'C:\\Users\\philk\\Desktop\\ledgerium-chrome-store-assets';
const SAMPLES_DIR = resolve(__dirname, '..', 'public', 'samples');
// MUST be 1. The Chrome Web Store validates promotional assets against EXACT
// pixel dimensions (small tile 440x280, large 920x680, marquee 1400x560) and
// rejects anything else. Playwright's `clip` is expressed in CSS pixels, so a
// deviceScaleFactor of N emits an N-times-larger PNG: this was previously 2 and
// produced 880x560 / 1840x1360 / 2800x1120, all of which the Store rejects.
// There is no retina variant for promo tiles — do not raise this.
const DEVICE_SCALE_FACTOR = 1;
const FONT_PAINT_SETTLE_MS = 800;

interface PromoSpec {
  sourceHtml: string;
  outputPng: string;
  width: number;
  height: number;
}

const PROMOS: PromoSpec[] = [
  {
    sourceHtml: 'promo-small-440x280.html',
    outputPng: 'promo-small-440x280.png',
    width: 440,
    height: 280,
  },
  {
    sourceHtml: 'promo-large-920x680.html',
    outputPng: 'promo-large-920x680.png',
    width: 920,
    height: 680,
  },
  {
    sourceHtml: 'promo-marquee-1400x560.html',
    outputPng: 'promo-marquee-1400x560.png',
    width: 1400,
    height: 560,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function out(filename: string): string {
  return resolve(OUTPUT_DIR, filename);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });

  try {
    for (const spec of PROMOS) {
      console.log(`\n[promo] ${spec.outputPng} (${spec.width}×${spec.height})...`);

      const context = await browser.newContext({
        viewport: { width: spec.width, height: spec.height },
        deviceScaleFactor: DEVICE_SCALE_FACTOR,
        colorScheme: 'light',
      });

      const page = await context.newPage();

      try {
        const htmlPath = resolve(SAMPLES_DIR, spec.sourceHtml);
        const fileUrl = pathToFileURL(htmlPath).href;

        // Navigate directly to the template. This previously used setContent()
        // with an iframe wrapper, which silently produced BLANK BLACK images:
        // setContent() yields an about:blank document, and Chromium blocks
        // file:// iframes loaded from it, so the frame never rendered and the
        // screenshot captured only the wrapper's background. Direct navigation
        // has no data-URL length limit and no cross-origin restriction.
        await page.goto(fileUrl, { waitUntil: 'networkidle' });

        // Templates load Inter from Google Fonts; wait for it before painting.
        try {
          await page.evaluate(async () => {
            await document.fonts.ready;
          });
        } catch {
          // acceptable — proceed with fallback font rather than failing capture
        }

        // Paint settle
        await page.waitForTimeout(FONT_PAINT_SETTLE_MS);

        await page.screenshot({
          path: out(spec.outputPng),
          clip: { x: 0, y: 0, width: spec.width, height: spec.height },
        });

        console.log(`  saved ${spec.outputPng}`);
      } finally {
        await page.close();
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log('\n[done] all promo images saved to:', OUTPUT_DIR);
}

main().catch((err: unknown) => {
  console.error('[FAILED]', err);
  process.exit(1);
});
