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

/**
 * Row #398: the bounce is a terminal track (row #249) — it is drained straight
 * into `navigator.sendBeacon` (or a keepalive fetch), so the in-page buffer is
 * always empty and cannot be observed. Observe DELIVERY instead: wrap
 * `sendBeacon` and `fetch` to record every analytics body, then call through.
 */
async function recordDelivery(page: Page, opts: { refuseBeacon?: boolean } = {}): Promise<void> {
  if (opts.refuseBeacon) {
    // Row #251 (2): the browser refuses the beacon (its queued-byte quota is
    // full). Installed BEFORE the recorder, so the recorder sees the false return.
    await page.addInitScript(() => {
      navigator.sendBeacon = () => false;
    });
  }
  await page.addInitScript(() => {
    const w = window as unknown as { __delivered: Promise<string>[] };
    w.__delivered = [];
    const isAnalytics = (u: unknown) => String(u).includes('/api/analytics/events');
    const origBeacon = navigator.sendBeacon?.bind(navigator);
    if (origBeacon) {
      navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
        const accepted = origBeacon(url, data);
        // Record only what the browser ACCEPTED: a refused beacon delivers nothing.
        if (accepted && isAnalytics(url) && data instanceof Blob) w.__delivered.push(data.text());
        else if (accepted && isAnalytics(url) && typeof data === 'string') w.__delivered.push(Promise.resolve(data));
        return accepted;
      };
    }
    const origFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' || input instanceof URL ? input : input.url;
      const sent = origFetch(input, init);
      // Record only requests that actually completed (a refused keepalive rejects).
      if (isAnalytics(url) && typeof init?.body === 'string') {
        const body = init.body;
        w.__delivered.push(sent.then(() => body, () => ''));
      }
      return sent;
    };
  });
}

/** Names of every event delivered (beacon or keepalive fetch) so far. */
async function deliveredEvents(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const w = window as unknown as { __delivered?: Promise<string>[] };
    const bodies = await Promise.all(w.__delivered ?? []);
    const names: string[] = [];
    for (const b of bodies) {
      try {
        for (const e of (JSON.parse(b).events ?? []) as Array<{ event: string }>) names.push(e.event);
      } catch { /* not JSON — ignore */ }
    }
    return names;
  });
}

/** End the visit the way a real navigation away does. */
async function firePageHide(page: Page): Promise<void> {
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
}

test('leaving without interacting produces a bounce', async ({ page }) => {
  await recordDelivery(page);
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await expect(page.getByRole('main')).toBeVisible();

  // Nothing clicked. This is a bounce.
  await firePageHide(page);

  const events = await deliveredEvents(page);
  expect(
    events.filter((e) => e === 'dashboard_bounced').length,
    'no dashboard_bounced was DELIVERED (beacon/keepalive fetch) on pagehide. Before row #242 the emitter ' +
      'was on beforeunload, which mobile browsers do not fire — so bounces from ' +
      'phones were never recorded, and phones are where people bounce.',
  ).toBe(1);
});

test('a visit with an interaction is not a bounce', async ({ page }) => {
  await recordDelivery(page);
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

  const events = await deliveredEvents(page);
  expect(
    events.filter((e) => e === 'dashboard_bounced').length,
    'a visit with a click was recorded as a bounce, which would inflate the ' +
      'bounce rate — the opposite error, and equally invisible',
  ).toBe(0);
});

/** Buffer ~75 KB of events (the MR-083 probe) so the bounce would not fit in the shared quota behind them. */
async function bufferLargeBacklog(page: Page, count = 150): Promise<void> {
  await page.evaluate((n) => {
    const w = window as unknown as { __ledgerium_events?: unknown[] };
    const buf = (w.__ledgerium_events ??= []);
    for (let i = 0; i < n; i++) {
      buf.push({ event: 'page_viewed', path: '/probe', timestamp: new Date().toISOString(), url: '/dashboard', userPlan: 'unknown', pad: 'x'.repeat(450) });
    }
  }, count);
}

test('row #251 (5): a bounce is still delivered behind a ~75 KB backlog (terminal event goes first, alone)', async ({ page }) => {
  await recordDelivery(page);
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await expect(page.getByRole('main')).toBeVisible();

  await bufferLargeBacklog(page);
  await firePageHide(page);

  const events = await deliveredEvents(page);
  expect(
    events.filter((e) => e === 'dashboard_bounced').length,
    'the bounce was lost behind a large buffered backlog: the shared ~64 KB beacon/keepalive quota refused ' +
      'the request it was in. The terminal event must be sent first and alone.',
  ).toBe(1);
});

test('row #251 (2): when sendBeacon refuses, the keepalive fetch fallback delivers the bounce', async ({ page }) => {
  await recordDelivery(page, { refuseBeacon: true });
  await page.goto(V2_URL, { waitUntil: 'networkidle' });
  await expect(page.getByRole('main')).toBeVisible();

  await firePageHide(page);

  const events = await deliveredEvents(page);
  expect(
    events.filter((e) => e === 'dashboard_bounced').length,
    'sendBeacon returned false and the bounce did not arrive via the keepalive fetch fallback',
  ).toBe(1);
});
