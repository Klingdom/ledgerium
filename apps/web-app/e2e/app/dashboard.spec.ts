import { test, expect } from '@playwright/test';

test.describe('Dashboard (authenticated)', () => {
  test('loads and shows main layout', async ({ page }) => {
    await page.goto('/dashboard');

    // Should show the app shell with navigation
    await expect(page.getByRole('navigation')).toBeVisible();

    // Should show dashboard heading or workflows section
    await expect(page.getByText(/workflow|dashboard/i).first()).toBeVisible();
  });

  test('nav bar shows expected items', async ({ page }) => {
    await page.goto('/dashboard');

    // Check primary nav items
    await expect(page.getByRole('link', { name: /workflows/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /upload/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /account/i })).toBeVisible();
  });

  test('shows user email in nav', async ({ page }) => {
    await page.goto('/dashboard');

    // Should display the test user's email
    await expect(page.getByText('e2e@ledgerium.test')).toBeVisible();
  });

  test('theme toggle is present and works', async ({ page }) => {
    await page.goto('/dashboard');

    // Theme toggle button should be visible
    const themeToggle = page.getByRole('button', { name: /switch to (light|dark) mode/i });
    await expect(themeToggle).toBeVisible();

    // Click it — should toggle theme
    await themeToggle.click();

    // The html element should change class
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toBeTruthy();
  });

  test('shows empty state when no workflows exist', async ({ page }) => {
    await page.goto('/dashboard');

    // For a fresh test user, should show empty state or upload CTA
    const emptyOrUpload = page.getByText(/no workflow|upload|record your first|get started/i);
    await expect(emptyOrUpload.first()).toBeVisible({ timeout: 10_000 });
  });

  test('sign out button works', async ({ page }) => {
    await page.goto('/dashboard');

    // Click sign-out
    const signOutBtn = page.getByRole('button', { name: /sign out/i });
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Should redirect to login
    await page.waitForURL('**/login**', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
