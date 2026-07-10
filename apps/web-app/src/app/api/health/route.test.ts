/**
 * Unit tests for GET /api/health — email observability section.
 *
 * Only covers the new `email` block (2026-07-09, password-reset-email
 * reliability fix). The DB observability block is exercised implicitly via
 * the happy-path connectivity check; deep DB-observability coverage
 * (size/disk-pressure) is out of scope here and unchanged by this fix.
 *
 * Mocking strategy:
 *  - vi.mock('@/db') — db.$queryRaw resolves so `status` stays 'ok'
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    $queryRaw: vi.fn().mockResolvedValue([{ '1': 1 }]),
  },
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('GET /api/health — email observability', () => {
  it('reports all-false booleans when no email env vars are configured', async () => {
    const { GET } = await import('./route');
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.email).toEqual({
      providerConfigured: false,
      fromConfigured: false,
      siteUrlConfigured: false,
    });
  });

  it('reports true for each configured env var independently', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'Ledgerium AI <noreply@ledgerium.ai>';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://ledgerium.ai';

    const { GET } = await import('./route');
    const res = await GET();
    const json = await res.json();

    expect(json.email).toEqual({
      providerConfigured: true,
      fromConfigured: true,
      siteUrlConfigured: true,
    });
  });

  it('never includes the raw secret value — booleans only', async () => {
    process.env.RESEND_API_KEY = 're_super_secret_value';

    const { GET } = await import('./route');
    const res = await GET();
    const text = JSON.stringify(await res.json());

    expect(text).not.toContain('re_super_secret_value');
  });

  it('does not affect status when email is unconfigured (non-fatal)', async () => {
    const { GET } = await import('./route');
    const res = await GET();
    const json = await res.json();

    expect(json.status).toBe('ok');
  });
});
