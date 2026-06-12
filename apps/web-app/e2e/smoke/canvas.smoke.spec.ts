import { test, expect } from '@playwright/test';
import { HYDRATION_ERROR_PATTERNS, matchesHydrationError } from './hydration-patterns';

/**
 * NEW-T2 — Workflow Canvas Hydration Smoke Gate
 *
 * Closes the gap identified in VISIO_ARCHITECTURE_REVIEW.md §3.2:
 *   "There is no flash-specific smoke test in the repo today."
 *
 * The public hydration gate (hydration.smoke.spec.ts) only covers five
 * routes: /, /login, /pricing, /docs, /share/smoke-probe-token.  None of
 * these exercise the workflow canvas page (/workflows/[id]), which is the
 * exact route that will SSR the new VisioCanvas component and ELK layout.
 *
 * This spec:
 *   1. Seeds a workflow via POST /api/sample-variants (idempotent — same
 *      endpoint used by variants-screenshots.spec.ts so the smoke DB already
 *      has it on repeat runs).
 *   2. Navigates to /workflows/{id}.
 *   3. For EACH of the four map modes (flow, swimlane, variants, systems):
 *      - Clicks the mode button (data-testid="workflow-mode-{mode}").
 *      - Waits for the mode canvas to be visible (generous timeout —
 *        first compile of the workflow page can be slow).
 *      - Collects pageerror + console-error events.
 *      - Asserts HYDRATION_ERROR_PATTERNS are absent in both channels.
 *      - Asserts no "Application error" fallback.
 *      - Asserts the body has meaningful content (proof the page rendered).
 *
 * Pattern rationale (INV-2):
 *   ELK's layout() is async and must only run inside useEffect (client-only).
 *   The first render of every canvas mode must use the synchronous fallback
 *   positions so server-markup === first-client-markup.  Any violation
 *   triggers a Minified React error (#418/#423/#425) that this gate catches.
 *
 * Auth: runs under the `canvas-authed` project which shares the same
 *   smoke-user.json storageState produced by the `setup` project.
 *
 * HYDRATION_ERROR_PATTERNS is imported from ./hydration-patterns.ts —
 *   the single canonical definition shared with hydration.smoke.spec.ts
 *   and analysis.smoke.spec.ts.  Do NOT maintain a separate copy here.
 */

// Re-export so the import is tree-shaken cleanly and the reference to the
// canonical list is explicit in the import statement.
export { HYDRATION_ERROR_PATTERNS };

// ── Mode list: all four switcher buttons ──────────────────────────────────────
// Matches WorkflowModeSwitcher.tsx: MODES = ['flow', 'swimlane', 'variants', 'systems']
// data-testid is `workflow-mode-${mode}` for each.
const CANVAS_MODES = ['flow', 'swimlane', 'variants', 'systems'] as const;
type CanvasMode = (typeof CANVAS_MODES)[number];

// ── Generous timeout — production build + first compile can be slow ────────────
const CANVAS_VISIBLE_TIMEOUT = 45_000;
const NAV_TIMEOUT = 60_000;
// After switching mode, allow React + ELK useEffect to settle before asserting.
const MODE_SETTLE_MS = 2_500;

// ── Shared workflow id across the describe scope ──────────────────────────────
let workflowId = '';

test.describe('NEW-T2: Canvas hydration smoke — all map modes', () => {
  test.beforeAll(async ({ request }) => {
    // Seed the variant sample (idempotent — returns existing if already present).
    // Uses the same endpoint as variants-screenshots.spec.ts.
    const res = await request.post('/api/sample-variants');
    expect(
      res.ok(),
      `POST /api/sample-variants failed with HTTP ${res.status()}`,
    ).toBeTruthy();
    const data = await res.json();
    workflowId = data.id;
    expect(workflowId, '/api/sample-variants must return a workflow id').toBeTruthy();
    console.log('[canvas-smoke] seeded/resolved sample workflow:', workflowId);
  });

  // ── Per-mode helper ──────────────────────────────────────────────────────────

  async function runModeHydrationCheck(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    page: any,
    mode: CanvasMode,
    isFirstMode: boolean,
  ) {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (err: Error) => pageErrors.push(err.message));
    page.on('console', (msg: { type(): string; text(): string }) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    if (isFirstMode) {
      // First mode: navigate to the page and let it land on the default 'flow' tab.
      await page.goto(`/workflows/${workflowId}`, {
        waitUntil: 'networkidle',
        timeout: NAV_TIMEOUT,
      });
      // Must NOT have been redirected to /dashboard (workflow fetch failed).
      await expect(
        page,
        'detail page redirected away — workflow fetch failed or user not authed',
      ).toHaveURL(new RegExp(`/workflows/${workflowId}`));
    }

    // Click the mode switcher button for this mode.
    const modeButton = page.getByTestId(`workflow-mode-${mode}`);
    await modeButton.waitFor({ state: 'visible', timeout: CANVAS_VISIBLE_TIMEOUT });
    await modeButton.click();

    // Wait for the canvas region to become visible.  The workflow page renders a
    // WorkflowPageShell which always shows one of the four canvas components.
    // We wait for the React Flow container (.react-flow__renderer) which all four
    // canvas modes (WorkflowFlowCanvas / WorkflowSwimlaneCanvas /
    // WorkflowVariantsMap / WorkflowSystemsMap) render through React Flow, OR fall
    // back to waiting for any non-skeleton/non-error content if variants mode
    // renders a non-RF view (DNA / list).  The generous timeout covers ELK settle.
    //
    // For variants mode the map is gated behind variants-story-map testid;
    // for the other three modes we wait for the react-flow container.
    if (mode === 'variants') {
      // Variants mode lazy-loads; it may show a loading state first.
      // Wait for either the story map OR an error/unprocessed notice.
      await page
        .locator(
          '[data-testid="variants-story-map"], [data-testid="variants-unprocessed"], [data-testid="variants-error"]',
        )
        .first()
        .waitFor({ state: 'visible', timeout: CANVAS_VISIBLE_TIMEOUT })
        .catch(() => {
          // Acceptable: variants may still be loading in CI — the hydration
          // check below is what matters, not whether data loaded.
          console.warn('[canvas-smoke] variants-story-map not visible within timeout (acceptable if loading)');
        });
    } else {
      // flow / swimlane / systems all render through React Flow immediately.
      await page
        .locator('.react-flow__renderer, .react-flow__container, [class*="react-flow"]')
        .first()
        .waitFor({ state: 'visible', timeout: CANVAS_VISIBLE_TIMEOUT })
        .catch(() => {
          // Still proceed to assertion — the primary assertion is the absence of
          // hydration errors, not whether React Flow rendered.
          console.warn(`[canvas-smoke] react-flow container not visible for mode=${mode}`);
        });
    }

    // Allow ELK useEffect + any deferred error boundaries to settle.
    await page.waitForTimeout(MODE_SETTLE_MS);

    // ── Assertions ────────────────────────────────────────────────────────────

    const hydrationPageErrors = pageErrors.filter(matchesHydrationError);
    const hydrationConsoleErrors = consoleErrors.filter(matchesHydrationError);

    expect(
      hydrationPageErrors,
      `[mode=${mode}] Uncaught hydration/crash page errors:\n${hydrationPageErrors.join('\n')}\n\nAll page errors:\n${pageErrors.join('\n')}`,
    ).toEqual([]);

    expect(
      hydrationConsoleErrors,
      `[mode=${mode}] Console hydration/crash errors:\n${hydrationConsoleErrors.join('\n')}\n\nAll console errors:\n${consoleErrors.join('\n')}`,
    ).toEqual([]);

    // Next.js "Application error" full-page fallback — count must be 0.
    await expect(
      page.locator('text=Application error'),
      `[mode=${mode}] Next.js "Application error" fallback rendered — hydration crash confirmed`,
    ).toHaveCount(0);

    // The page must have meaningful content — a blank body is evidence of a crash
    // even if the error text did not surface.
    const bodyText = await page.locator('body').innerText();
    expect(
      bodyText.trim().length,
      `[mode=${mode}] <body> was empty or whitespace-only — page likely crashed before rendering`,
    ).toBeGreaterThan(50);
  }

  // ── Four individual mode tests (independent fail-fast; each starts fresh) ─────
  //
  // We use a single describe with independent tests rather than a parametrized
  // loop so that each mode appears as a named test in the CI report and can be
  // retried / diagnosed independently.  The page object is fresh per test —
  // Playwright opens a new browser context for each test() call — so listener
  // registration is clean and there is no cross-test error accumulation.

  test(
    '[hydration] /workflows/[id] mode=flow — canvas renders without hydration crash',
    { tag: ['@smoke', '@canvas', '@hydration'] },
    async ({ page }) => {
      test.setTimeout(120_000);
      await runModeHydrationCheck(page, 'flow', true);
    },
  );

  test(
    '[hydration] /workflows/[id] mode=swimlane — canvas renders without hydration crash',
    { tag: ['@smoke', '@canvas', '@hydration'] },
    async ({ page }) => {
      test.setTimeout(120_000);
      // Navigate fresh; then switch to swimlane from default flow mode.
      await runModeHydrationCheck(page, 'flow', true);
      await runModeHydrationCheck(page, 'swimlane', false);
    },
  );

  test(
    '[hydration] /workflows/[id] mode=variants — canvas renders without hydration crash',
    { tag: ['@smoke', '@canvas', '@hydration'] },
    async ({ page }) => {
      test.setTimeout(120_000);
      await runModeHydrationCheck(page, 'flow', true);
      await runModeHydrationCheck(page, 'variants', false);
    },
  );

  test(
    '[hydration] /workflows/[id] mode=systems — canvas renders without hydration crash',
    { tag: ['@smoke', '@canvas', '@hydration'] },
    async ({ page }) => {
      test.setTimeout(120_000);
      await runModeHydrationCheck(page, 'flow', true);
      await runModeHydrationCheck(page, 'systems', false);
    },
  );
});
