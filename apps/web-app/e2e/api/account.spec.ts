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
    expect(body.data.user.plan).toBe('free');

    // Feature flags
    expect(body.data.features).toBeTruthy();
    expect(typeof body.data.features.cleanExports).toBe('boolean');
    expect(typeof body.data.features.intelligenceLayer).toBe('boolean');

    // Free tier should NOT have premium features
    expect(body.data.features.cleanExports).toBe(false);
    expect(body.data.features.intelligenceLayer).toBe(false);

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
