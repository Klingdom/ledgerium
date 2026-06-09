import { test, expect } from '@playwright/test';

/**
 * Authenticated Analysis-view hydration smoke gate (Report-consolidation Slice 1b).
 *
 * The public hydration gate (hydration.smoke.spec.ts) cannot reach the surface
 * that matters for the Report-consolidation work: the Analysis view lives on the
 * auth-gated, dynamic route /workflows/[id], and /share/[token] renders the
 * legacy ReportTab — not WorkflowReportPage. This spec authenticates (storageState
 * from auth.smoke.setup.ts), creates a populated sample workflow server-side, then
 * loads BOTH the Process and Analysis views in a production build and fails loudly
 * on any hydration/client-side crash.
 *
 * This is the per-slice runtime gate every later Report slice (2–6) depends on:
 * if migrating a section into WorkflowReportPage ever reintroduces a hydration
 * mismatch (e.g. a non-deterministic toLocaleString in render), this fails.
 */

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

const matchesHydrationError = (text: string): boolean =>
  HYDRATION_ERROR_PATTERNS.some((re) => re.test(text));

test('[hydration] authenticated Analysis view (/workflows/[id]) — Process + Analysis render, no client-side exception', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // 1. Create the populated sample workflow server-side (full app context —
  //    runs ensureSampleWorkflow, no app modules imported into this test).
  const res = await page.request.post('/api/sample-workflow');
  expect(res.ok(), `POST /api/sample-workflow failed: ${res.status()}`).toBeTruthy();
  const { id } = await res.json();
  expect(id, 'sample-workflow id missing from response').toBeTruthy();

  // 2. Load the detail page — default Process view, on the dynamic auth-gated route.
  await page.goto(`/workflows/${id}`, { waitUntil: 'networkidle' });
  // Must NOT have been redirected to /dashboard (that means the workflow fetch failed).
  await expect(
    page,
    'detail page redirected away — workflow fetch failed',
  ).toHaveURL(new RegExp(`/workflows/${id}`));
  await page.waitForTimeout(1000);

  // 3. Switch to the Analysis view → mounts WorkflowReportPage and auto-loads
  //    intelligence + agent data. rpt-hero renders from the main workflow data
  //    (independent of the intelligence/agent fetches), so it appears promptly.
  await page.getByRole('button', { name: 'Analysis' }).click();
  await page.locator('#rpt-hero').waitFor({ state: 'visible', timeout: 30_000 });
  // Give the intelligence/agent fetches time to resolve and render their sections.
  await page.waitForTimeout(2500);

  // ── Assertions ────────────────────────────────────────────────────────────
  const hydrationPageErrors = pageErrors.filter(matchesHydrationError);
  const hydrationConsoleErrors = consoleErrors.filter(matchesHydrationError);

  expect(
    hydrationPageErrors,
    `Uncaught hydration/crash errors on Analysis view:\n${hydrationPageErrors.join('\n')}\n\nAll page errors:\n${pageErrors.join('\n')}`,
  ).toEqual([]);

  expect(
    hydrationConsoleErrors,
    `Console hydration/crash errors on Analysis view:\n${hydrationConsoleErrors.join('\n')}\n\nAll console errors:\n${consoleErrors.join('\n')}`,
  ).toEqual([]);

  await expect(
    page.locator('text=Application error'),
    'Next.js "Application error" fallback rendered — hydration crash confirmed',
  ).toHaveCount(0);

  // The Report actually rendered its sections (not an empty/crashed body).
  expect(
    await page.locator('[id^="rpt-"]').count(),
    'no rpt-* sections rendered — Analysis view did not populate',
  ).toBeGreaterThan(0);

  const bodyText = await page.locator('body').innerText();
  expect(
    bodyText.trim().length,
    'Analysis <body> was empty/whitespace — page likely crashed before rendering',
  ).toBeGreaterThan(50);
});
