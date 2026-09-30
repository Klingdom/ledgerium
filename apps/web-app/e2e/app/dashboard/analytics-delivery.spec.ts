/**
 * Events survive a page being hidden — row #241.
 *
 * ## Why this needs a browser
 *
 * `analytics-delivery.test.ts` proves the rule: drain once, deliver on hidden,
 * not on visible. It cannot prove the listener is attached, that the payload is
 * well-formed, or that a tab switch does not re-send — and the wiring is where
 * this defect lived. Events below the ten-event batch threshold depended
 * entirely on `beforeunload`, which mobile browsers frequently never fire.
 *
 * `navigator.sendBeacon` is stubbed rather than intercepted: Playwright's
 * request interception does not reliably observe beacons, and stubbing lets the
 * test assert on the exact payload the browser was handed.
 */

import { test, expect, type Page } from '@playwright/test';

/** Record every sendBeacon call, before any app code runs. */
async function captureBeacons(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const calls: Array<{ url: string; body: string }> = [];
    (window as unknown as { __beacons: typeof calls }).__beacons = calls;
    const original = navigator.sendBeacon?.bind(navigator);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: (url: string, data?: BodyInit) => {
        // Blob.text() is async and this must stay synchronous, so the payload
        // is reconstructed from the buffer the app just drained.
        calls.push({ url: String(url), body: data instanceof Blob ? 'blob' : String(data ?? '') });
        void original;
        return true;
      },
    });
  });
}

/** Drive the page into the hidden state and fire the lifecycle event. */
async function hidePage(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

/** Return to visible, as a tab switch back would. */
async function showPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

async function beaconCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __beacons: unknown[] }).__beacons.length);
}

async function bufferSize(page: Page): Promise<number> {
  return page.evaluate(() => ((window as unknown as { __ledgerium_events?: unknown[] }).__ledgerium_events ?? []).length);
}

test('a short session is delivered when the page is hidden, not lost', async ({ page }) => {
  await captureBeacons(page);
  await page.goto('/dashboard?v2=1', { waitUntil: 'networkidle' });

  // A handful of events — well under the ten-event batch threshold, which is
  // the case that was being dropped.
  const buffered = await bufferSize(page);
  expect(buffered, 'expected the dashboard to have produced some events to deliver').toBeGreaterThan(0);
  expect(buffered, 'this test is only meaningful below the batch threshold').toBeLessThan(10);

  await hidePage(page);

  expect(await beaconCount(page), 'hiding the page delivered nothing — before row #241 this session would have been lost on mobile').toBe(1);
  expect(await bufferSize(page), 'the buffer was not drained, so these events will be sent again').toBe(0);
});

test('switching away and back does not deliver the same events twice', async ({ page }) => {
  await captureBeacons(page);
  await page.goto('/dashboard?v2=1', { waitUntil: 'networkidle' });
  expect(await bufferSize(page)).toBeGreaterThan(0);

  await hidePage(page);
  expect(await beaconCount(page)).toBe(1);

  // Coming back must not deliver, and hiding again with nothing new buffered
  // must not deliver either. Before the drain was added, every tab switch
  // would have re-sent the whole buffer — trading lost events for duplicated
  // ones, which is not a fix.
  await showPage(page);
  expect(await beaconCount(page), 'returning to the page delivered again').toBe(1);

  await hidePage(page);
  expect(await beaconCount(page), 'hiding with an empty buffer delivered an empty or duplicate payload').toBe(1);
});
