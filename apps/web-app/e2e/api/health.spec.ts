import { test, expect } from '@playwright/test';

test.describe('API: Health check', () => {
  test('GET /api/health returns 200 with ok status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeTruthy();
  });
});
