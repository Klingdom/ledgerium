/**
 * `/api/account` is requested once per dashboard load — row #189.
 *
 * ## Why this is an e2e test and not a unit test
 *
 * `accountCache.test.ts` proves the cache deduplicates concurrent callers. That
 * is necessary and not sufficient: it says nothing about whether the two
 * components on the dashboard actually go through the cache. Before this row
 * they did not — `TrialStatusChip` in `AppShell` and `RecordingQuotaChip` in
 * `CommandHeader` each called `fetch('/api/account')` directly, so the unit
 * test would have passed just as happily while the page issued two requests.
 *
 * So this counts requests in a real browser, which is the only place the claim
 * in the row is actually true or false.
 */

import { test, expect } from '@playwright/test';

test('the dashboard issues exactly one /api/account request', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.pathname === '/api/account') requests.push(req.url());
  });

  await page.goto('/dashboard', { waitUntil: 'networkidle' });

  // Prove the account-dependent chrome actually mounted. Without this, a
  // dashboard that failed to render either chip would report zero requests and
  // pass — a green tick for a page that never exercised the thing under test.
  await expect(page.getByRole('main')).toBeVisible();

  expect(
    requests.length,
    `expected exactly 1 request to /api/account, saw ${requests.length}. ` +
      'Before row #189 this was 2: TrialStatusChip and RecordingQuotaChip each ' +
      'self-fetched. If this is 2 again, a component has gone back to calling ' +
      'fetch directly instead of using useAccount.',
  ).toBe(1);
});

/**
 * MR-038 S-3. The spec above visits `/dashboard`, but loop 72's change was to
 * `/account` and `/upload` — so the claim "two requests to one" was made about
 * two pages this file never loads, and was wrong for both: `useAccount`'s own
 * mount effect ran alongside the page's added `refetch()`, giving two requests
 * on a cold cache. A test whose title names its surface, sitting next to a
 * claim about different surfaces, is the whole failure in miniature.
 */
for (const path of ['/account', '/upload']) {
  test(`${path} issues exactly one /api/account request`, async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (req) => {
      if (new URL(req.url()).pathname === '/api/account') requests.push(req.url());
    });

    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.getByRole('main')).toBeVisible();

    expect(
      requests.length,
      `expected exactly 1 request to /api/account on ${path}, saw ${requests.length}. ` +
        'These pages are alwaysFresh: they must bust the cache on mount rather than ' +
        'load from it and then bust, which is two requests wearing one intention.',
    ).toBe(1);
  });
}
