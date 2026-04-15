/**
 * Documentation screenshots — public (unauthenticated) pages.
 *
 * Captures a canonical screenshot of every public-facing Ledgerium AI page
 * for use in user-facing documentation.
 *
 * Run with:
 *   pnpm exec playwright test e2e/public/documentation-screenshots.spec.ts --project=public
 *
 * Output directory: apps/web-app/docs/screenshots/
 *
 * Note: these tests do NOT use storageState — they run without auth cookies.
 */

import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '../../docs/screenshots');

/** Viewport used for all documentation screenshots. */
const DOCS_VIEWPORT = { width: 1440, height: 900 };

/** Save a viewport screenshot (no vertical scrolling). */
async function screenshot(page: any, name: string) {
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: false,
  });
}

/** Save a full-page screenshot (includes content below the fold). */
async function fullPageScreenshot(page: any, name: string) {
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

// ─── Setup ──────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

// ─── Public pages ────────────────────────────────────────────────────────────

test.describe('Public page screenshots', () => {
  test('public-home', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await screenshot(page, 'public-home');
  });

  test('public-demo', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/demo', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await screenshot(page, 'public-demo');
  });

  test('public-pricing', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/pricing', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Scroll to the top to ensure pricing tier cards are fully visible.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    await screenshot(page, 'public-pricing');
  });

  test('public-install', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/install-extension', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await screenshot(page, 'public-install');
  });

  test('public-about', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/about', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await screenshot(page, 'public-about');
  });

  test('public-privacy', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/privacy', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await screenshot(page, 'public-privacy');
  });

  test('public-terms', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/terms', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await screenshot(page, 'public-terms');
  });

  test('public-login', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    // Login/signup pages use useSession() which polls — networkidle never fires
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await screenshot(page, 'public-login');
  });

  test('public-signup', async ({ page }) => {
    await page.setViewportSize(DOCS_VIEWPORT);
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await screenshot(page, 'public-signup');
  });
});
