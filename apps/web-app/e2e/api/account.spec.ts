import { test, expect } from '@playwright/test';

test.describe('API: Account', () => {
  test('GET /api/account returns user data with features and limits', async ({ request }) => {
    const response = await request.get('/api/account');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.data).toBeTruthy();

    // User data
    expect(body.data.user).toBeTruthy();
    expect(body.data.user.email).toBe('e2e@ledgerium.test');
    // Row #200 (loop 33): the seed creates this user on the GROWTH plan
    // (`e2e/seed-test-db.js:155`) so the plan-gating specs have an ungated
    // identity; the free-plan identity is a separate user (free@ledgerium.test).
    // This assertion said 'free' and had been failing against the seed ever since.
    expect(body.data.user.plan).toBe('growth');

    // Feature flags
    expect(body.data.features).toBeTruthy();
    expect(typeof body.data.features.cleanExports).toBe('boolean');
    expect(typeof body.data.features.intelligenceLayer).toBe('boolean');

    // Row #200 (loop 33): this identity is the GROWTH-plan seed user, so the
    // premium features are ON — `plans.ts:146-155` sets cleanExports and
    // intelligenceLayer true for growth. The assertions said false, matching the
    // free tier this user stopped being. Free-tier entitlement is covered by the
    // free-plan identity in feature-gating.spec.ts.
    expect(body.data.features.cleanExports).toBe(true);
    expect(body.data.features.intelligenceLayer).toBe(true);

    // Limits — uses "max" not "limit" per API response shape
    expect(body.data.limits).toBeTruthy();
    expect(typeof body.data.limits.recordings.used).toBe('number');
    expect(body.data.limits.recordings.max).toBeTruthy();
  });

  test('GET /api/account returns 401 without auth', async ({ request }) => {
    // Create a fresh context without auth cookies
    const response = await request.fetch('/api/account', {
      headers: {
        cookie: '',
      },
    });

    // Should be unauthorized
    expect([401, 302]).toContain(response.status());
  });
});
