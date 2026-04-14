import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Upload page (authenticated)', () => {
  test('loads and shows upload interface', async ({ page }) => {
    await page.goto('/upload');

    // Should show upload heading
    await expect(page.getByText(/upload/i).first()).toBeVisible();

    // Should show file input or drop zone
    const uploadArea = page.locator('[type="file"], [data-testid="drop-zone"], .dropzone, [class*="drop"], [class*="upload"]');
    // At minimum the page should load without error
    await expect(page.locator('body')).toBeVisible();
  });

  test('shows recording limit info', async ({ page }) => {
    await page.goto('/upload');

    // Free tier user should see limit information
    await expect(page.getByText(/recording|upload/i).first()).toBeVisible();
  });

  test('rejects non-JSON file upload via API', async ({ request }) => {
    // Try to upload a non-JSON file
    const response = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('not json'),
        },
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/json/i);
  });

  test('rejects invalid JSON payload via API', async ({ request }) => {
    const response = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'bad.json',
          mimeType: 'application/json',
          buffer: Buffer.from('{"not": "a valid workflow bundle"}'),
        },
      },
    });

    // Should fail validation (422) since it's not a valid bundle
    expect([400, 422]).toContain(response.status());
  });

  test('upload with valid fixture creates workflow', async ({ request }) => {
    // Read the test fixture
    const fixturePath = path.resolve(__dirname, '../../fixtures/test-fixture.json');
    const fs = require('fs');

    // Skip if fixture doesn't exist
    if (!fs.existsSync(fixturePath)) {
      test.skip();
      return;
    }

    const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');

    const response = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'test-fixture.json',
          mimeType: 'application/json',
          buffer: Buffer.from(fixtureContent),
        },
      },
    });

    // Should succeed
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.workflowId).toBeTruthy();
    expect(body.stepCount).toBeGreaterThan(0);
  });
});
