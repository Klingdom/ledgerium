import { test, expect } from '@playwright/test';

test.describe('Authentication flow', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Should have link to signup
    await expect(page.getByText(/sign up free/i)).toBeVisible();
  });

  test('signup page renders correctly', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'networkidle' });

    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();

    // Should show trust signal
    await expect(page.getByText(/no screenshots/i)).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({ timeout: 15_000 });

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    await page.getByLabel('Email').fill('e2e@ledgerium.test');
    await page.getByLabel('Password').fill('TestPass123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('signup with existing email shows error', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'networkidle' });

    await page.getByLabel('Email').fill('e2e@ledgerium.test');
    await page.getByLabel('Password').fill('TestPass123!');

    // Fill name if present
    const nameField = page.getByLabel('Name');
    if (await nameField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameField.fill('Duplicate User');
    }

    await page.getByRole('button', { name: /create account/i }).click();

    // Should show duplicate error
    await expect(page.getByText(/already exists/i)).toBeVisible({ timeout: 15_000 });
  });

  test('unauthenticated access to dashboard redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated access to protected routes redirects to login', async ({ page }) => {
    await page.context().clearCookies();

    for (const route of ['/upload', '/account', '/analytics']) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    }
  });
});
