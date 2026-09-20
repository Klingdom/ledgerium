import { test, expect } from '@playwright/test';

/**
 * Row #200 (loop 33): these ran under the `api` project's storageState — the
 * GROWTH-plan user (`seed-test-db.js:155`) — so "free tier is blocked" was
 * being asserted against an identity that is not on the free tier. POST
 * /api/teams answered 200 (correctly, for growth) and the test read that as a
 * gating failure. They now use the free-plan identity produced by the
 * `free-auth-setup` project, the same fixture v2-plan-gating.spec.ts uses.
 */
const FREE_STATE = './e2e/.auth/free-user.json';

test.describe('API: Feature gating (free-plan identity)', () => {
  test('POST /api/analytics returns 403 for free tier (requires intelligenceLayer)', async ({ browser }) => {
    const context = await browser.newContext({ storageState: FREE_STATE });
    const response = await context.request.post('/api/analytics', {
      data: {},
    });

    // Free tier should be blocked
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/requires|upgrade|plan/i);
  });

  test('POST /api/teams returns 403 for free tier (requires teamWorkspace)', async ({ browser }) => {
    const context = await browser.newContext({ storageState: FREE_STATE });
    const response = await context.request.post('/api/teams', {
      data: { name: 'Test Team' },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/requires|upgrade|plan/i);
  });

  test('GET /api/workflows returns 200 (available to all tiers)', async ({ request }) => {
    const response = await request.get('/api/workflows');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    // Workflows API returns { workflows: [...], stats: {...} }
    expect(body.workflows).toBeDefined();
    expect(Array.isArray(body.workflows)).toBe(true);
  });
});
