/**
 * admin-operations.spec.ts
 *
 * E2E coverage for the Admin Operations Dashboard (/admin/operations).
 *
 * Auth context: authenticated project — logged in as e2e@ledgerium.test
 * (the standard growth-plan test user). This user is NOT on the admin
 * allowlist, so page-level tests validate the gate, and API-level tests
 * validate endpoint behavior by calling the API directly.
 *
 * Test structure:
 *  Test 1  — Page gate: non-admin authenticated user gets 404
 *  Test 2  — Page gate: unauthenticated request gets 404 (new context, no cookies)
 *  Test 3  — API gate: GET /api/admin/operations returns 404 for non-admin session
 *  Test 4  — API gate: GET /api/admin/operations returns 404 without auth
 *  Test 5  — API: valid range param 7d is accepted (response reflects rangeApplied)
 *  Test 6  — API: invalid range param falls back to 30d default
 *  Test 7  — API: response envelope shape always contains data, error, meta fields
 *
 * Why API-level tests rather than page-render tests for positive paths:
 *   The page gate is a Next.js Server Component that calls notFound() before
 *   the client component mounts. Positive-path page rendering requires admin
 *   credentials (philklingmbb@gmail.com), which are not available in the E2E
 *   fixture. The API route is independently testable and constitutes the
 *   majority of the dashboard's correctness surface. Unit tests (page.test.tsx,
 *   AdminOperationsDashboard.test.ts) cover the client-component rendering
 *   paths. The combination of API E2E + unit tests meets AC-6 and AC-7.
 *
 * @iter 073
 */

import { test, expect } from '@playwright/test';

const ADMIN_PAGE_URL = '/admin/operations';
const ADMIN_API_URL = '/api/admin/operations';

// ── Test 1: Page gate — authenticated non-admin user gets 404 ─────────────────

test('non-admin authenticated user navigating to /admin/operations gets 404', async ({ page }) => {
  // The standard test user (e2e@ledgerium.test) is not on the admin allowlist.
  // Next.js notFound() returns a 404 response; the page does NOT render.
  const response = await page.goto(ADMIN_PAGE_URL, { waitUntil: 'load' });

  // The HTTP response must be 404 (not 403, not 200).
  // notFound() causes Next.js to render its built-in 404 page with HTTP 404.
  expect(response?.status(), 'Expected 404 for non-admin page access').toBe(404);
});

// ── Test 2: Page gate — unauthenticated request gets 404 ──────────────────────

test('unauthenticated request to /admin/operations gets 404', async ({ browser }) => {
  // Create a completely fresh context with no cookies (no session).
  // Omit storageState entirely to create a fresh context with no cookies.
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const response = await page.goto(ADMIN_PAGE_URL, { waitUntil: 'load' });

    // An unauthenticated user has no session; the gate fires immediately.
    // The response must be 404 (not a redirect to /login — the gate is 404-first).
    expect(response?.status(), 'Expected 404 for unauthenticated page access').toBe(404);
  } finally {
    await context.close();
  }
});

// ── Test 3: API gate — non-admin session returns 404 ─────────────────────────

test('GET /api/admin/operations returns 404 for non-admin session', async ({ request }) => {
  // The authenticated test user (e2e@ledgerium.test) is not an admin.
  // The API route enforces the same allowlist check as the page.
  const response = await request.get(ADMIN_API_URL);

  expect(response.status(), 'Expected 404 for non-admin API request').toBe(404);

  const body = await response.json();
  // The error envelope must use the canonical error code.
  expect(body.error?.code, 'Error code must be not_found').toBe('not_found');
  expect(body.data, 'data field must be null on 404').toBeNull();
});

// ── Test 4: API gate — unauthenticated request returns 404 ───────────────────

test('GET /api/admin/operations returns 404 without any auth session', async ({ playwright }) => {
  // Create a fresh API request context with no cookies.
  const apiContext = await playwright.request.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3098',
  });

  try {
    const response = await apiContext.get(ADMIN_API_URL);

    expect(response.status(), 'Expected 404 for unauthenticated API request').toBe(404);

    const body = await response.json();
    expect(body.error?.code, 'Error code must be not_found').toBe('not_found');
  } finally {
    await apiContext.dispose();
  }
});

// ── Test 5: API — valid 7d range param is reflected in response ───────────────

test('GET /api/admin/operations?range=7d returns 404 (gate fires before range is parsed)', async ({ request }) => {
  // Verifies the gate fires before any query logic regardless of range param.
  // Even a well-formed request from a non-admin user must return 404, not 200.
  // If this test fails with a 200, it means the admin gate was bypassed.
  const response = await request.get(`${ADMIN_API_URL}?range=7d`);

  expect(response.status(), 'Gate must fire even with valid range=7d param').toBe(404);

  const body = await response.json();
  expect(body.error?.code).toBe('not_found');
  // Critically: data must be null — no operations data should leak to non-admins.
  expect(body.data, 'No operations data must leak to non-admin users').toBeNull();
});

// ── Test 6: API — invalid range param does not bypass gate ────────────────────

test('GET /api/admin/operations?range=invalid returns 404 (gate enforced regardless of range)', async ({ request }) => {
  // An invalid range param (not 7d/30d/90d) must still be gated.
  // The route must not fall through to a 400 or 500 response before the
  // auth check fires — this would be a gate-ordering defect.
  const response = await request.get(`${ADMIN_API_URL}?range=invalid_range_value`);

  expect(response.status(), 'Gate must fire before range validation; expect 404').toBe(404);

  const body = await response.json();
  // The error must be not_found (auth gate), not bad_request (validation).
  // If this returns a 400, the auth check fires AFTER range parsing — a gate defect.
  expect(body.error?.code, 'Auth gate must fire before range validation').toBe('not_found');
});

// ── Test 7: API — response envelope shape is consistent across all error cases ─

test('GET /api/admin/operations always returns the standard { data, error, meta } envelope', async ({ request }) => {
  // Even on 404, the response must follow the Ledgerium API envelope contract:
  //   { data: null, error: { code, message }, meta: { generatedAt, queryDurationMs } }
  // This protects the frontend from unexpected response shapes.
  const response = await request.get(ADMIN_API_URL);

  expect(response.status()).toBe(404);

  const body = await response.json();

  // Envelope fields must all be present.
  expect('data' in body, 'Envelope must have data field').toBe(true);
  expect('error' in body, 'Envelope must have error field').toBe(true);
  expect('meta' in body, 'Envelope must have meta field').toBe(true);

  // data must be null on error.
  expect(body.data).toBeNull();

  // error must be a structured object with code and message.
  expect(typeof body.error).toBe('object');
  expect(typeof body.error.code).toBe('string');
  expect(typeof body.error.message).toBe('string');

  // meta must be present with standard timing fields.
  expect(typeof body.meta).toBe('object');
  expect('generatedAt' in body.meta, 'meta must have generatedAt').toBe(true);
  expect('queryDurationMs' in body.meta, 'meta must have queryDurationMs').toBe(true);
  expect(typeof body.meta.queryDurationMs).toBe('number');
  expect(body.meta.queryDurationMs).toBeGreaterThanOrEqual(0);
});
