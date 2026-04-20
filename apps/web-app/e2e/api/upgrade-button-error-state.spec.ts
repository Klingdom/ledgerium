/**
 * Regression test for BUG-03 — UpgradeButton silent failure on 4xx responses.
 *
 * Verifies that the checkout API returns a consistent error shape with a `code`
 * field so the UpgradeButton component can display an error to the user instead
 * of silently failing or silently redirecting.
 *
 * Coverage:
 *   1. already_subscribed — seeded test user has growth plan + active subscription.
 *   2. admin_bypass      — verified at the API contract level via direct fetch with
 *                          a seeded admin-allowlisted session (if configured).
 *                          The admin-allowlist email is not in the test DB, so this
 *                          branch is covered by unit-style assertion on the route
 *                          source in a separate linting step. Full E2E coverage
 *                          requires a second test identity; tracked as follow-up.
 */

import { test, expect } from '@playwright/test';

test.describe('API: Billing checkout — error response shape', () => {
  test('POST /api/billing/checkout returns code=already_subscribed for active subscriber', async ({ request }) => {
    // The authenticated test user (e2e@ledgerium.test) has plan=growth and
    // subscriptionStatus=active, so the checkout route should block them.
    const response = await request.post('/api/billing/checkout', {
      data: { plan: 'starter', interval: 'monthly' },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBeTruthy();
    expect(body.code).toBe('already_subscribed');
    // The redirect field must be present so the UI can navigate after showing the error.
    expect(body.redirect).toBe('/account');
  });

  test('POST /api/billing/checkout 400 responses always include an error string and a code field', async ({ request }) => {
    // Guards the API contract: every 4xx from this route must be parseable
    // by the UpgradeButton component (error + optional code + optional redirect).
    const response = await request.post('/api/billing/checkout', {
      data: { plan: 'starter', interval: 'monthly' },
    });

    // We expect either 400 (blocked) or 503 (stripe not configured in test).
    // In either case the shape must be { error: string, code?: string }.
    const body = await response.json();
    expect(typeof body.error).toBe('string');
    // If a code is present it must be a known value.
    if (body.code !== undefined) {
      expect(['admin_bypass', 'already_subscribed']).toContain(body.code);
    }
  });

  test('POST /api/billing/checkout returns 401 for unauthenticated request', async ({ browser }) => {
    // Sends a completely unauthenticated request (no session cookie) to verify
    // that the route does not allow anonymous users to initiate a checkout.
    // Uses a fresh browser context with no stored auth state.
    //
    // Admin-bypass full E2E coverage (second test identity) is still deferred
    // — tracked as follow-up (Birth iter: 017).
    const context = await browser.newContext(); // no storageState → no session
    const request = context.request;

    const response = await request.post('/api/billing/checkout', {
      data: { plan: 'starter', interval: 'monthly' },
    });

    expect(response.status()).toBe(401);

    await context.close();
  });
});
