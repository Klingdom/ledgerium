/**
 * Capture Chrome Web Store product screenshots from the live Next.js app.
 *
 * Produces 3 screenshots at 1280×800:
 *   02-dashboard-workflow-library.png  — Workflow Dashboard v2 with demo data
 *   03-sop-detail-view.png             — SOP detail for "Sales lead qualification"
 *   04-process-map.png                 — Process Map for "Sales lead qualification"
 *
 * Prerequisites:
 *   1. Next.js dev server running at http://localhost:3000
 *   2. Demo DB seeded: cd apps/web-app && DATABASE_URL="file:../prisma/data/ledgerium.db" pnpm seed:demo
 *
 * Usage:
 *   cd apps/web-app && pnpm exec tsx scripts/capture-chrome-store-screenshots.ts
 *
 * Output: C:\Users\philk\Desktop\ledgerium-chrome-store-assets\
 */

import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = 'C:\\Users\\philk\\Desktop\\ledgerium-chrome-store-assets';
const VIEWPORT = { width: 1280, height: 800 };
const DEMO_EMAIL = 'demo@ledgerium.ai';
const DEMO_PASSWORD = 'Demo2026!Workspace';

// Auth state cached between pages in same context
const AUTH_STATE_PATH = resolve(__dirname, '../e2e/.auth/chrome-store-user.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function out(filename: string): string {
  return resolve(OUTPUT_DIR, filename);
}

async function waitForNetworkIdle(page: Page, timeout = 3000): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // acceptable — page may have long-polling
  }
}

async function settle(page: Page, ms = 1200): Promise<void> {
  await page.waitForTimeout(ms);
}

async function dismissCookieBanners(page: Page): Promise<void> {
  // Dismiss any cookie/consent overlays that might obscure content
  const selectors = [
    'button:has-text("Accept")',
    'button:has-text("Accept all")',
    'button:has-text("Got it")',
    'button:has-text("Dismiss")',
  ];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 500 })) {
        await el.click();
        await page.waitForTimeout(300);
      }
    } catch {
      // no such element
    }
  }
}

// ─── Auth: sign in and save session ──────────────────────────────────────────

async function ensureAuth(browser: Browser): Promise<void> {
  // Check if we already have a valid session
  if (existsSync(AUTH_STATE_PATH)) {
    console.log('  [auth] using cached session');
    return;
  }

  console.log('  [auth] logging in as demo user...');
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

  // Fill login form
  await page.fill('input[type="email"], input[name="email"], #email', DEMO_EMAIL);
  await page.fill('input[type="password"], input[name="password"], #password', DEMO_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard|app)/, { timeout: 15_000 });
  await waitForNetworkIdle(page);

  // Save auth state
  await context.storageState({ path: AUTH_STATE_PATH });
  await context.close();
  console.log('  [auth] session saved');
}

// ─── Screenshot 02: Dashboard workflow library ────────────────────────────────

async function captureWorkflowLibrary(context: BrowserContext): Promise<void> {
  console.log('\n[02] Workflow Library Dashboard...');
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForNetworkIdle(page);
    await dismissCookieBanners(page);

    // Wait for workflow rows to load
    await page.waitForSelector(
      'table tbody tr, [data-testid="workflow-row"], .workflow-row, tr[class*="workflow"]',
      { timeout: 15_000 }
    ).catch(async () => {
      // Fallback: wait for any table or list content
      await page.waitForSelector('table, [role="table"], main .flex', { timeout: 10_000 }).catch(() => {});
    });

    // Extra settle for charts/health scores
    await settle(page, 1500);

    await page.screenshot({
      path: out('02-dashboard-workflow-library.png'),
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });
    console.log('  saved 02-dashboard-workflow-library.png');
  } finally {
    await page.close();
  }
}

// ─── Screenshot 03: SOP detail view ──────────────────────────────────────────

async function captureSopDetail(context: BrowserContext): Promise<void> {
  console.log('\n[03] SOP Detail — Sales lead qualification...');
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForNetworkIdle(page);
    await dismissCookieBanners(page);

    // Wait for workflow list to render
    await page.waitForSelector('table, [role="table"], main', { timeout: 15_000 }).catch(() => {});
    await settle(page, 1000);

    // Click on "Sales lead qualification" row — navigates to /workflows/[id]
    const salesLeadRow = page.locator('text="Sales lead qualification"').first();
    await salesLeadRow.waitFor({ timeout: 10_000 });
    await salesLeadRow.click();

    // Wait for full page navigation to /workflows/[id]
    await page.waitForURL(/\/workflows\/[a-z0-9-]+/, { timeout: 15_000 });
    await waitForNetworkIdle(page, 5000);
    await settle(page, 1200);

    // Click SOP tab — use nav-scoped selector to avoid matching the export "SOP" button
    // The tab nav is: <nav class="flex gap-ds-6 ..."> containing tab buttons
    // The export buttons appear earlier in the DOM and also contain text "SOP" — must exclude them
    const sopTab = page.locator('nav button:has-text("SOP")').first();
    if (await sopTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sopTab.click();
      await waitForNetworkIdle(page, 3000);
      await settle(page, 1500);
    } else {
      console.log('  [warn] SOP tab not found — capturing default tab');
    }

    await page.screenshot({
      path: out('03-sop-detail-view.png'),
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });
    console.log('  saved 03-sop-detail-view.png');
  } finally {
    await page.close();
  }
}

// ─── Screenshot 04: Process map view ─────────────────────────────────────────

async function captureProcessMap(context: BrowserContext): Promise<void> {
  console.log('\n[04] Process Map — Sales lead qualification...');
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForNetworkIdle(page);
    await dismissCookieBanners(page);

    // Wait for workflow list to render
    await page.waitForSelector('table, [role="table"], main', { timeout: 15_000 }).catch(() => {});
    await settle(page, 1000);

    // Click on "Sales lead qualification" row — navigates to /workflows/[id]
    const salesLeadRow = page.locator('text="Sales lead qualification"').first();
    await salesLeadRow.waitFor({ timeout: 10_000 });
    await salesLeadRow.click();

    // Wait for full page navigation to /workflows/[id]
    await page.waitForURL(/\/workflows\/[a-z0-9-]+/, { timeout: 15_000 });
    await waitForNetworkIdle(page, 5000);
    await settle(page, 1200);

    // The default tab on page load is "Workflow" (process map view) — no click needed.
    // But click it explicitly to ensure it's active in case state differs.
    const mapTab = page.locator('button:has-text("Workflow")').first();
    if (await mapTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mapTab.click();
      await waitForNetworkIdle(page, 3000);
      await settle(page, 1500);
    } else {
      console.log('  [warn] Workflow tab not found — capturing default view');
      await settle(page, 1500);
    }

    await page.screenshot({
      path: out('04-process-map.png'),
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });
    console.log('  saved 04-process-map.png');
  } finally {
    await page.close();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });

  try {
    // Ensure auth
    await ensureAuth(browser);

    // Create authenticated context
    const context = await browser.newContext({
      viewport: VIEWPORT,
      storageState: AUTH_STATE_PATH,
    });

    try {
      await captureWorkflowLibrary(context);
      await captureSopDetail(context);
      await captureProcessMap(context);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log('\n[done] all web-app screenshots saved to:', OUTPUT_DIR);
}

main().catch((err: unknown) => {
  console.error('[FAILED]', err);
  process.exit(1);
});
