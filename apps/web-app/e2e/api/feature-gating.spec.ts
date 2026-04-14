import { test, expect } from '@playwright/test';

test.describe('API: Feature gating', () => {
  test('POST /api/analytics returns 403 for free tier (requires intelligenceLayer)', async ({ request }) => {
    const response = await request.post('/api/analytics', {
      data: {},
    });

    // Free tier should be blocked
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/requires|upgrade|plan/i);
  });

  test('POST /api/teams returns 403 for free tier (requires teamWorkspace)', async ({ request }) => {
    const response = await request.post('/api/teams', {
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
