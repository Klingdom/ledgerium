import { test, expect } from '@playwright/test';

test.describe('API: Authentication', () => {
  test('POST /api/auth/signup rejects duplicate email', async ({ request }) => {
    const response = await request.post('/api/auth/signup', {
      data: {
        email: 'e2e@ledgerium.test',
        password: 'AnotherPass123!',
        name: 'Duplicate',
      },
    });

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/already exists/i);
  });

  test('POST /api/auth/signup rejects invalid email', async ({ request }) => {
    const response = await request.post('/api/auth/signup', {
      data: {
        email: 'not-an-email',
        password: 'TestPass123!',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/auth/signup rejects short password', async ({ request }) => {
    const response = await request.post('/api/auth/signup', {
      data: {
        email: 'newuser@example.com',
        password: 'short',
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/8 characters/i);
  });

  test('POST /api/auth/signup creates new user', async ({ request }) => {
    const uniqueEmail = `e2e-${Date.now()}@ledgerium.test`;
    const response = await request.post('/api/auth/signup', {
      data: {
        email: uniqueEmail,
        password: 'TestPass123!',
        name: 'New E2E User',
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.id).toBeTruthy();
    expect(body.email).toBe(uniqueEmail);
  });
});
