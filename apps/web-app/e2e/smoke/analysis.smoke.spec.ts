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

  // 3. Switch to the Report tab → mounts WorkflowReportPage and auto-loads
  //    intelligence + agent data. rpt-hero renders from the main workflow data
  //    (independent of the intelligence/agent fetches), so it appears promptly.
  // Scope to the tab nav for precision — the "Report" name collision with the old
  // export button was removed in R-D (the export button is now "Save as PDF" /
  // "Download data (JSON)"), so this selector resolves the tab uniquely.
  await page.locator('nav').getByRole('button', { name: 'Report' }).first().click();
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

/**
 * Regression for the 2026-06-09 outage: the Report crashed ("Application error" +
 * unstyled) on REAL workflow data the seeded sample never had — a
 * workflow_interpretation artifact whose friction/rework items omit `stepOrdinals`
 * and whose `decisions` is null. seed-smoke-user.js seeds workflow
 * `smoke-hostile-001` with exactly that shape. Before the asArray() hardening this
 * threw `TypeError: Cannot read properties of undefined (reading 'length')`; it must
 * now render the Report with NO client-side exception.
 */
test('[hydration] Report on hostile real-data workflow — no client-side exception (outage regression)', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/workflows/smoke-hostile-001', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/workflows\/smoke-hostile-001/); // not redirected
  await page.waitForTimeout(800);

  // Switch to the Report tab → renders Friction & Decisions + Rework from the
  // hostile interpretation artifact (the exact crash path).
  // Scope to the tab nav for precision — the old "Report" export-button name
  // collision was removed in R-D; this resolves the tab uniquely.
  await page.locator('nav').getByRole('button', { name: 'Report' }).first().click();
  await page.locator('#rpt-hero').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(1500);

  const crashErrors = [...pageErrors, ...consoleErrors].filter((t) =>
    /Cannot read propert|undefined|not iterable|Minified React error|client-side exception|Application error|hydrat/i.test(t),
  );
  expect(
    crashErrors,
    `Hostile-data Report threw a client-side exception (the outage bug):\n${crashErrors.join('\n')}\n\nAll page errors:\n${pageErrors.join('\n')}`,
  ).toEqual([]);
  await expect(page.locator('text=Application error')).toHaveCount(0);
  // The friction/rework sections actually rendered (proof we hit the crash path).
  expect(await page.locator('#rpt-structure, #rpt-rework').count()).toBeGreaterThan(0);
});
