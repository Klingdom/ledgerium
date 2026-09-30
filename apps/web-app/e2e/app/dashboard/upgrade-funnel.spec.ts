/**
 * The upgrade funnel records prompts as well as clicks — row #238.
 *
 * ## Why this is an e2e test
 *
 * `lib/upgrade-prompt.test.ts` proves the counting rule. That says nothing
 * about whether the surfaces are wired to it, which is exactly the gap that
 * created this defect: `upgrade_clicked` was wired at four surfaces and
 * `upgrade_prompt_viewed` at one, for months, with a full unit suite passing.
 *
 * ## Why it reads the buffer rather than the network
 *
 * A first version watched for a POST to `/api/analytics/events` and saw
 * nothing, twice, for two different reasons — both of them mine rather than the
 * app's. `flushEvents` debounces by 2s, and more to the point it only runs at
 * all once **ten** events have accumulated (`analytics.ts`), with anything left
 * over delivered by `sendBeacon` on unload. A dashboard load produces two.
 *
 * So a network assertion here would be testing the batching threshold, which is
 * pre-existing and unchanged by this row. What this row changes is whether the
 * event is *produced*, and `window.__ledgerium_events` is where a produced
 * event lands — written by the real component, in a real browser, through the
 * real `track()` path. That is the claim worth pinning.
 *
 * Noted while establishing this and deliberately not fixed here: delivery of a
 * sub-batch depends on `beforeunload`, which mobile browsers frequently do not
 * fire. Row #241.
 */

import { test, expect, type Page } from '@playwright/test';
import { UNCAPPED_PLAN_ID } from '../../../src/lib/quota-meter';

const V2_URL = '/dashboard?v2=1';

/** Event names currently buffered by `lib/analytics.ts`, in order. */
async function bufferedEvents(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const buf = (window as unknown as { __ledgerium_events?: Array<{ event: string }> }).__ledgerium_events ?? [];
    return buf.map((e) => e.event);
  });
}

/** Full buffered payloads, for asserting on `location` and `plan`. */
async function bufferedPayloads(page: Page): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(() => {
    const buf = (window as unknown as { __ledgerium_events?: Array<Record<string, unknown>> }).__ledgerium_events ?? [];
    return buf;
  });
}

/** A free-tier account sitting exactly on its recording cap. */
function mockAtQuotaLimit(page: Page) {
  return page.route('**/api/account', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          user: {
            id: 'u1', email: 'e2e@test.local', name: null, plan: 'free',
            subscriptionStatus: 'none', createdAt: '2026-01-01T00:00:00.000Z',
            hasStripeCustomer: false, pendingInvoiceUrl: null,
          },
          features: {},
          limits: { recordings: { used: 5, max: 5 }, seats: { max: 1 }, recorders: { max: 1 } },
          reverseTrial: { isActive: false, hasLapsed: false, daysRemaining: 0, plan: null, endsAt: null },
        },
      }),
    }),
  );
}

test('a quota-limited dashboard records the prompt being shown, not only clicked', async ({ page }) => {
  await mockAtQuotaLimit(page);
  await page.goto(V2_URL, { waitUntil: 'networkidle' });

  // Prove the prompt is actually on screen. Without this the assertion could
  // pass on a page that never rendered the chip — and an event fired by the
  // wrong thing is worse than no event.
  await expect(page.getByText(/5 \/ 5 recordings/)).toBeVisible();

  const payloads = await bufferedPayloads(page);
  const views = payloads.filter((e) => e.event === 'upgrade_prompt_viewed');

  expect(
    views.length,
    'the quota chip rendered its upgrade CTA but recorded no upgrade_prompt_viewed. ' +
      'Before row #238 this surface recorded only the click, feeding the funnel\'s ' +
      'numerator and not its denominator.',
  ).toBe(1);

  // The location must match this surface's upgrade_clicked exactly, or the two
  // stages stop describing the same thing and the fix undoes itself quietly.
  expect(views[0]!.location).toBe('dashboard_v2_quota_chip');
  // Bound to the same constant the CTA copy uses, not a literal. Loop 70
  // pinned 'team' here while the chip's copy named Solo, so the test
  // cheerfully protected the wrong value.
  expect(views[0]!.plan).toBe(UNCAPPED_PLAN_ID);
});

test('the prompt is recorded once, not once per render', async ({ page }) => {
  await mockAtQuotaLimit(page);
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await expect(page.getByText(/5 \/ 5 recordings/)).toBeVisible();

  // Force re-renders the chip will participate in. Over-counting would inflate
  // the same denominator this row exists to correct — the identical error,
  // reversed, and no easier to spot in a dashboard.
  await page.setViewportSize({ width: 900, height: 800 });
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForTimeout(500);

  const names = await bufferedEvents(page);
  expect(
    names.filter((n) => n === 'upgrade_prompt_viewed').length,
    'upgrade_prompt_viewed fired more than once for a single prompt instance',
  ).toBe(1);
});
