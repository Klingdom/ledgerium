/**
 * Session expiry must not leave the previous user's plan on later events — row #355.
 *
 * Reads `window.__ledgerium_events` (see upgrade-funnel.spec.ts for why the
 * buffer, not the network, is the claim worth pinning): the event is produced by
 * the real `track()` in a real browser.
 *
 * Flow: signed in (storageState) with the plan 'team' published -> the session
 * cookie is removed (what expiry looks like) -> next-auth's focus refetch runs ->
 * the app soft-navigates to the public /pricing page, where AppShell is not
 * mounted -> `pricing_page_viewed` must not carry 'team'.
 */
import { test, expect } from '@playwright/test';

test('after session expiry a soft navigation to /pricing carries no previous-user plan', async ({ page, context }) => {
  await page.route('**/api/account', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          user: {
            id: 'u-prev', email: 'e2e@test.local', name: null, plan: 'team',
            subscriptionStatus: 'active', createdAt: '2026-01-01T00:00:00.000Z',
            hasStripeCustomer: false, pendingInvoiceUrl: null,
          },
          features: {},
          limits: { recordings: { used: 1, max: 100 }, seats: { max: 5 }, recorders: { max: 5 } },
          reverseTrial: { isActive: false, hasLapsed: false, daysRemaining: 0, plan: null, endsAt: null },
        },
      }),
    }),
  );

  await page.goto('/dashboard?v2=1', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => (window as unknown as { __ledgerium_userPlan?: unknown }).__ledgerium_userPlan === 'team');

  // Expiry: the cookie is gone. next-auth notices on the next focus/visibility event.
  await context.clearCookies();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForFunction(() => (window as unknown as { __ledgerium_userPlan?: unknown }).__ledgerium_userPlan == null);

  // Soft navigation (no reload): the module state of the tab survives.
  await page.evaluate(() => (window as unknown as { next: { router: { push(u: string): void } } }).next.router.push('/pricing'));
  await page.waitForURL('**/pricing**');
  await page.waitForFunction(() =>
    ((window as unknown as { __ledgerium_events?: Array<{ event: string }> }).__ledgerium_events ?? []).some(
      (e) => e.event === 'pricing_page_viewed',
    ),
  );

  const pricing = await page.evaluate(() => {
    const buf = (window as unknown as { __ledgerium_events?: Array<Record<string, unknown>> }).__ledgerium_events ?? [];
    return buf.filter((e) => e.event === 'pricing_page_viewed').pop();
  });
  expect(pricing).toBeDefined();
  expect(pricing!.isLoggedIn).toBe(false);
  expect(pricing!.userPlan).not.toBe('team');
});
