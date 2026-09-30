/**
 * The bounce event is actually produced when a visit ends — row #242.
 *
 * ## Why this test exists at all
 *
 * The bounce predicate had nine passing unit tests. They were written against
 * a *copy* of the logic in the test file, under a docstring saying "Logic
 * mirrors DashboardV2Shell's handleBeforeUnload", and every one of them stayed
 * green while the real handler sat on `beforeunload` — which iOS Safari and
 * Chrome on Android routinely never fire.
 *
 * So the event was never produced for those users, and the failure was
 * invisible to the entire suite, because the trigger was the one part the copy
 * did not reproduce.
 *
 * This asserts on the trigger, in a browser, which is the only place it is
 * real.
 */

import { test, expect, type Page } from '@playwright/test';

const V2_URL = '/dashboard?v2=1';

async function bufferedEvents(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const buf = (window as unknown as { __ledgerium_events?: Array<{ event: string }> }).__ledgerium_events ?? [];
    return buf.map((e) => e.event);
  });
}

/** End the visit the way a real navigation away does. */
async function firePageHide(page: Page): Promise<void> {
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
}

test('leaving without interacting produces a bounce', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await expect(page.getByRole('main')).toBeVisible();

  // Nothing clicked. This is a bounce.
  await firePageHide(page);

  const events = await bufferedEvents(page);
  expect(
    events.filter((e) => e === 'dashboard_bounced').length,
    'no dashboard_bounced was produced on pagehide. Before row #242 the emitter ' +
      'was on beforeunload, which mobile browsers do not fire — so bounces from ' +
      'phones were never recorded, and phones are where people bounce.',
  ).toBe(1);
});

test('a visit with an interaction is not a bounce', async ({ page }) => {
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await expect(page.getByRole('main')).toBeVisible();

  // The click counter is a capture-phase listener on the shell's own root, so
  // the click has to land on a descendant of it. A first attempt clicked
  // `main` at its top-left corner, which is padding on an ancestor — the
  // listener never saw it, and the test reported a bounce that the product
  // would also have reported. Right answer, wrong reason.
  const heading = page.getByRole('heading').first();
  await expect(heading).toBeVisible();
  await heading.click();
  await page.waitForTimeout(200);

  await firePageHide(page);

  const events = await bufferedEvents(page);
  expect(
    events.filter((e) => e === 'dashboard_bounced').length,
    'a visit with a click was recorded as a bounce, which would inflate the ' +
      'bounce rate — the opposite error, and equally invisible',
  ).toBe(0);
});
