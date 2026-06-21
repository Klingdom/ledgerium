/**
 * Refresh the Playwright auth state by logging in against the dev server.
 *
 * Strategy: Drive the real React login form.
 *
 * The login form uses React controlled inputs (useState) + NextAuth
 * credentials + redirect:false + router.push(). We wait for full React
 * hydration before filling the form, then submit via Enter key.
 *
 * Key design decisions:
 *  1. Wait for `#email` input to be both visible AND enabled — this is a
 *     reliable indicator that React has hydrated the controlled input.
 *  2. Use `fill()` to set both fields (sets value AND triggers React's
 *     synthetic change events, updating useState).
 *  3. Submit with Enter key on the password field (triggers form onSubmit).
 *  4. After submit, poll for /dashboard URL using waitForURL with a generous
 *     timeout — NextAuth credentials + router.push is a soft navigation, no
 *     network navigation event fires.
 *  5. Once on /dashboard, save context.storageState().
 */

import { chromium } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WEB_APP_ROOT = resolve(__dirname, '..');
const AUTH_STATE_PATH = resolve(WEB_APP_ROOT, 'e2e', '.auth', 'user.json');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

const EMAIL = process.env.AUTH_EMAIL ?? 'e2e@ledgerium.test';
const PASSWORD = process.env.AUTH_PASSWORD ?? 'TestPass123!';

async function main() {
  console.log(`[refresh-auth] Logging in against ${BASE_URL} as ${EMAIL} …`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();

  // Step 1: Navigate to the login page
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 45_000 });
  console.log('[refresh-auth] Login page loaded —', page.url());

  // Step 2: Wait for React to fully hydrate the form.
  // The login form is a React controlled component ('use client'). During SSR,
  // the <form> is rendered without an onsubmit attribute and inputs have
  // value="" with no disabled attribute. React hydration attaches synthetic
  // event handlers AFTER the JS bundle executes and the virtual DOM reconciles.
  //
  // Reliable hydration signal: wait for #email input to be visible AND enabled.
  // Once the email input is not disabled, React has hydrated the controlled input
  // and the event delegation system is active.
  //
  // Note: window.__NEXT_ROUTER_STATE_TREE is NOT set by Next.js 14 App Router in
  // this app configuration — using it as a hydration signal caused permanent
  // timeouts. The #email-visible signal is sufficient.
  const emailInput = page.locator('#email');
  await emailInput.waitFor({ state: 'visible', timeout: 15_000 });

  // Small settle buffer after input is visible to ensure event delegation is wired.
  await page.waitForTimeout(500);
  console.log('[refresh-auth] Login form visible, React event handlers ready');

  // Step 3: Fill credentials using Playwright fill() — this sets the DOM value
  // AND fires the synthetic React change events (updating useState).
  await emailInput.fill(EMAIL);

  const passwordInput = page.locator('#password');
  await passwordInput.waitFor({ state: 'visible', timeout: 5_000 });
  await passwordInput.fill(PASSWORD);
  console.log('[refresh-auth] Credentials filled');

  // Step 4: Submit the form by clicking the submit button.
  // Clicking the <button type="submit"> fires both the native click event and
  // React's synthetic event delegation chain, which triggers the form's
  // onSubmit handler (handleSubmit). Pressing Enter on a controlled input was
  // unreliable because the native form's GET action fired before React's
  // onSubmit replaced it.
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.waitFor({ state: 'visible', timeout: 5_000 });
  await submitButton.click();
  console.log('[refresh-auth] Submit button clicked');

  // Step 5: Wait for navigation to /dashboard.
  // NextAuth credentials with redirect:false + router.push() is a client-side
  // soft navigation — no Playwright network navigation event fires.
  // waitForURL polls for the URL pattern.
  try {
    await page.waitForURL(`${BASE_URL}/dashboard**`, { timeout: 30_000 });
    console.log('[refresh-auth] Dashboard URL reached:', page.url());
  } catch {
    // Capture current state for debugging
    const currentUrl = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    console.error('[refresh-auth] waitForURL timed out. Current URL:', currentUrl);
    console.error('[refresh-auth] Page text:', bodyText);

    // Check if there's an error message visible on the login page
    const errorEl = await page.locator('[role="alert"]').textContent().catch(() => null);
    if (errorEl) {
      console.error('[refresh-auth] Error message visible:', errorEl);
    }

    throw new Error(`Expected to navigate to /dashboard but ended up at: ${currentUrl}`);
  }

  // Step 6: Wait for the dashboard to fully hydrate (ensures session cookie is set)
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
  await page.waitForTimeout(2000);
  console.log('[refresh-auth] Dashboard fully loaded, saving auth state …');

  // Step 7: Save auth state
  mkdirSync(resolve(WEB_APP_ROOT, 'e2e', '.auth'), { recursive: true });
  await context.storageState({ path: AUTH_STATE_PATH });
  console.log(`[refresh-auth] Auth state saved to ${AUTH_STATE_PATH}`);

  await browser.close();
  console.log('[refresh-auth] Done.');
}

main().catch((err) => {
  console.error('[refresh-auth] FAILED:', err);
  process.exit(1);
});
