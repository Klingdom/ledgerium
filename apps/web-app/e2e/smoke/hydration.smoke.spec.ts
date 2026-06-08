import { test, expect } from '@playwright/test';

/**
 * Production hydration smoke gate.
 *
 * Detects client-side/hydration crashes on public pages.  Each test
 * collects uncaught JS errors and React-specific error console messages
 * that indicate a hydration mismatch, then fails loudly if any are found.
 *
 * The canonical failure mode this gate guards against:
 *   - Server renders a <script> tag for Umami (NEXT_PUBLIC_UMAMI_SCRIPT_URL
 *     is present in the runtime environment on the VPS server).
 *   - Client bundle was built WITHOUT that var (CI/build box lacked .env.local)
 *     → client-side bundle has `undefined` inlined for NEXT_PUBLIC_UMAMI_SCRIPT_URL
 *     → condition `process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL && <Script .../>` is false
 *     → client does not create the <script> element during hydration.
 *   - React detects the DOM mismatch on hydration → throws Minified React
 *     error #418 (or #423/#425) → Next.js renders "Application error: a
 *     client-side exception has occurred" on every page.
 *
 * Static vs dynamic pages:
 *   Static pages (○ in build output, e.g. /, /login, /pricing, /docs):
 *     HTML is pre-rendered AT BUILD TIME. When no umami var at build time, the
 *     static HTML does not contain the <script> element, so the client has nothing
 *     to mismatch against even when the runtime server has the var. → No crash.
 *
 *   Dynamic pages (ƒ in build output, e.g. /share/[token], /workflows/[id]):
 *     HTML is SSR'd at REQUEST TIME using the runtime env. If the server has
 *     NEXT_PUBLIC_UMAMI_SCRIPT_URL set, SSR emits the <script>. The client
 *     hydrates with a build-time-inlined undefined → no <script> → MISMATCH → crash.
 *
 * How to reproduce the bug (before the fix):
 *   1. Build WITHOUT umami vars (remove from .env.local / unset in CI):
 *        DATABASE_URL=file:./smoke.db NEXTAUTH_SECRET=... npx next build
 *   2. Run with umami vars present at server runtime:
 *        npx playwright test --config playwright.smoke.config.ts
 *      (webServer env has NEXT_PUBLIC_UMAMI_SCRIPT_URL set — the asymmetry)
 *   3. The /share/probe-smoke test FAILS, capturing the exact hydration error.
 *      Static-page tests (/,/login,/pricing,/docs) pass regardless — the bug
 *      only manifests on SSR-at-request-time (dynamic) routes.
 *
 * After the fix (UmamiAnalytics client component loaded only in useEffect):
 *   The same build/run sequence PASSES — SSR renders nothing for Umami,
 *   so there is nothing to mismatch on hydration even on dynamic routes.
 */

// Patterns that unambiguously identify a hydration or client-side crash.
const HYDRATION_ERROR_PATTERNS = [
  /Hydration/i,
  /hydrat/i,
  /Minified React error #418/,
  /Minified React error #423/,
  /Minified React error #425/,
  /Minified React error #419/,
  /client-side exception/i,
  /Application error/i,
  /Text content does not match/i,
];

function matchesHydrationError(text: string): boolean {
  return HYDRATION_ERROR_PATTERNS.some((re) => re.test(text));
}

/**
 * Public static routes — pre-rendered at build time.
 * These pass even without the fix because static HTML is baked without the
 * Umami <script> when the var was absent at build time.
 * Included to confirm the gate doesn't generate false positives.
 */
const STATIC_PUBLIC_ROUTES = ['/', '/login', '/pricing', '/docs'];

/**
 * Dynamic SSR routes — server-rendered at request time.
 * /share/[token] is a dynamic route (ƒ in build output).  An invalid token
 * will cause Next.js to render a 404 page, which still SSR's through the root
 * layout — exercising the hydration path for dynamic pages.  This is the route
 * that WILL fail before the fix and MUST pass after.
 */
const DYNAMIC_PUBLIC_ROUTES = [
  '/share/smoke-probe-token', // invalid token → 404, but layout SSR runs at request time
];

const ALL_ROUTES = [...STATIC_PUBLIC_ROUTES, ...DYNAMIC_PUBLIC_ROUTES];

for (const route of ALL_ROUTES) {
  const isKeyRoute = DYNAMIC_PUBLIC_ROUTES.includes(route);
  test(`[hydration] ${route}${isKeyRoute ? ' [DYNAMIC — key reproduction route]' : ''} — no hydration crash or client-side exception`, async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    // Collect uncaught JS exceptions (React hydration errors show up here as
    // "Minified React error #418" etc.).
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    // Collect console error messages (Next.js also logs hydration warnings
    // and "Application error" strings to the console).
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(route, { waitUntil: 'networkidle' });

    // Wait for React hydration to complete and any deferred error boundaries
    // to render.  1.5 s is sufficient for a production build under local load.
    await page.waitForTimeout(1500);

    // Filter to only the errors that match hydration/crash patterns.
    const hydrationPageErrors = pageErrors.filter(matchesHydrationError);
    const hydrationConsoleErrors = consoleErrors.filter(matchesHydrationError);

    expect(
      hydrationPageErrors,
      `[${route}] Uncaught hydration/crash errors detected:\n${hydrationPageErrors.join('\n')}\n\nAll page errors collected:\n${pageErrors.join('\n')}`,
    ).toEqual([]);

    expect(
      hydrationConsoleErrors,
      `[${route}] Console hydration/crash errors detected:\n${hydrationConsoleErrors.join('\n')}\n\nAll console errors collected:\n${consoleErrors.join('\n')}`,
    ).toEqual([]);

    // Next.js renders this text in the page body when a client-side exception
    // is unrecoverable.  Count must be 0.
    await expect(
      page.locator('text=Application error'),
      `[${route}] Next.js "Application error" fallback was rendered — hydration crash confirmed`,
    ).toHaveCount(0);

    // The page must have meaningful content — a completely blank body is also
    // evidence of a crash even if the error text didn't land.
    const bodyText = await page.locator('body').innerText();
    expect(
      bodyText.trim().length,
      `[${route}] <body> was empty or whitespace-only — page likely crashed before rendering`,
    ).toBeGreaterThan(10);
  });
}
