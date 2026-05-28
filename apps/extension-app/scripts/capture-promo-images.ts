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
const DEVICE_SCALE_FACTOR = 2;
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

function buildWrapperHtml(fileUrl: string, width: number, height: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${width}px;height:${height}px;overflow:hidden;background:#000}
  iframe{
    width:${width}px;height:${height}px;border:none;display:block;
  }
</style>
</head>
<body>
  <iframe src="${fileUrl}" width="${width}" height="${height}" scrolling="no"></iframe>
</body>
</html>`;
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

        // Use setContent with a wrapper to avoid data: URL length limits
        const wrapper = buildWrapperHtml(fileUrl, spec.width, spec.height);
        await page.setContent(wrapper, { waitUntil: 'networkidle' });

        // Wait for fonts inside the iframe
        try {
          await page.evaluate(async () => {
            const iframe = document.querySelector('iframe') as HTMLIFrameElement | null;
            if (iframe?.contentDocument) {
              await (iframe.contentDocument as any).fonts?.ready;
            }
            await document.fonts.ready;
          });
        } catch {
          // acceptable — fonts may not expose ready in iframe context
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
