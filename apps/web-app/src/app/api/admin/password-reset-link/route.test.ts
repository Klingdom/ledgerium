/**
 * Unit tests for POST /api/admin/password-reset-link.
 *
 * Covers:
 *  - 404 when unauthenticated (no session)
 *  - 404 when session exists but caller is not admin
 *  - 400 when email is missing / not a string
 *  - 404 when admin + unknown email
 *  - 200 happy path — resetUrl + expiresAt returned, token row created whose
 *    hash matches the token embedded in resetUrl
 *  - email is normalized before lookup (mixed-case input still finds the user)
 *  - prior unused tokens for the email are invalidated
 *  - 500 when a DB query throws
 *  - response envelope shape: data / error / meta fields present
 *
 * Mocking strategy (mirrors admin/users/[id]/route.test.ts):
 *  - vi.mock('@/lib/auth') — controls session
 *  - vi.mock('@/lib/admin-allowlist') — controls canAccessAdmin
 *  - vi.mock('@/db') — controls all Prisma calls
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHash, createHmac } from 'crypto';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/admin-allowlist', () => ({
  canAccessAdmin: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
    passwordResetToken: { updateMany: vi.fn(), create: vi.fn() },
  },
}));

import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { db } from '@/db';
import { POST } from './route';

// ── Typed mock references ─────────────────────────────────────────────────────

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockCanAccessAdmin = canAccessAdmin as ReturnType<typeof vi.fn>;
const mockUserFindUnique = db.user.findUnique as ReturnType<typeof vi.fn>;
const mockTokenUpdateMany = db.passwordResetToken.updateMany as ReturnType<typeof vi.fn>;
const mockTokenCreate = db.passwordResetToken.create as ReturnType<typeof vi.fn>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/password-reset-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const ADMIN_SESSION = { user: { email: 'phil@mediafier.ai' } };
const NON_ADMIN_SESSION = { user: { email: 'not-admin@example.com' } };

beforeEach(() => {
  vi.clearAllMocks();
  mockTokenUpdateMany.mockResolvedValue({ count: 0 });
  mockTokenCreate.mockResolvedValue({ id: 'token_1' });
});

describe('POST /api/admin/password-reset-link', () => {
  it('returns 404 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    mockCanAccessAdmin.mockReturnValue(false);

    const res = await POST(makeRequest({ email: 'user@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.data).toBeNull();
    expect(json.error).toEqual({ code: 'not_found', message: 'Not Found' });
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when session exists but caller is not admin', async () => {
    mockAuth.mockResolvedValue(NON_ADMIN_SESSION);
    mockCanAccessAdmin.mockReturnValue(false);

    const res = await POST(makeRequest({ email: 'user@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error?.code).toBe('not_found');
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('returns 400 when email is missing', async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockCanAccessAdmin.mockReturnValue(true);

    const res = await POST(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error?.code).toBe('bad_request');
  });

  it('returns 400 when email is not a string', async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockCanAccessAdmin.mockReturnValue(true);

    const res = await POST(makeRequest({ email: 12345 }));

    expect(res.status).toBe(400);
  });

  it('returns 404 when admin + unknown email', async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockCanAccessAdmin.mockReturnValue(true);
    mockUserFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ email: 'ghost@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.data).toBeNull();
    expect(json.error).toEqual({ code: 'not_found', message: 'Not Found' });
    expect(mockTokenCreate).not.toHaveBeenCalled();
  });

  it('returns 200 with a valid resetUrl + matching token hash for a real user', async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockCanAccessAdmin.mockReturnValue(true);
    mockUserFindUnique.mockResolvedValue({
      id: 'user_1',
      email: 'samantha.myers@equipmentshare.com',
    });

    const res = await POST(makeRequest({ email: 'samantha.myers@equipmentshare.com' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error).toBeNull();
    expect(typeof json.data.resetUrl).toBe('string');
    expect(typeof json.data.expiresAt).toBe('string');

    const url = new URL(json.data.resetUrl);
    expect(url.pathname).toBe('/reset-password');
    const rawToken = url.searchParams.get('token');
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/); // 32 bytes hex-encoded
    // URLSearchParams.get() decodes automatically, so compare against the
    // decoded value rather than the encoded one.
    expect(url.searchParams.get('email')).toBe('samantha.myers@equipmentshare.com');

    // Token row created whose stored hash matches the raw token in the URL.
    expect(mockTokenCreate).toHaveBeenCalledOnce();
    const createCall = mockTokenCreate.mock.calls[0]![0];
    expect(createCall.data.email).toBe('samantha.myers@equipmentshare.com');
    const expectedHash = createHash('sha256').update(rawToken!).digest('hex');
    expect(createCall.data.tokenHash).toBe(expectedHash);

    // expiresAt is ~1h out (matches self-serve window; limits takeover window).
    const expiresAtMs = new Date(json.data.expiresAt).getTime();
    const nowMs = Date.now();
    expect(expiresAtMs - nowMs).toBeGreaterThan(59 * 60 * 1000);
    expect(expiresAtMs - nowMs).toBeLessThanOrEqual(60 * 60 * 1000 + 5000);
  });

  it('normalizes mixed-case email before lookup', async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockCanAccessAdmin.mockReturnValue(true);
    mockUserFindUnique.mockResolvedValue({
      id: 'user_1',
      email: 'samantha.myers@equipmentshare.com',
    });

    await POST(makeRequest({ email: '  Samantha.Myers@EquipmentShare.com  ' }));

    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { email: 'samantha.myers@equipmentshare.com' },
    });
  });

  it('invalidates prior unused tokens for the email before minting a new one', async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockCanAccessAdmin.mockReturnValue(true);
    mockUserFindUnique.mockResolvedValue({ id: 'user_1', email: 'user@example.com' });

    await POST(makeRequest({ email: 'user@example.com' }));

    expect(mockTokenUpdateMany).toHaveBeenCalledWith({
      where: { email: 'user@example.com', usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
  });

  it('returns 500 when a DB query throws', async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockCanAccessAdmin.mockReturnValue(true);
    mockUserFindUnique.mockRejectedValue(new Error('db down'));

    const res = await POST(makeRequest({ email: 'user@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error?.code).toBe('internal_error');
  });

  it('response envelope always has data / error / meta fields', async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockCanAccessAdmin.mockReturnValue(true);
    mockUserFindUnique.mockResolvedValue({ id: 'user_1', email: 'user@example.com' });

    const res = await POST(makeRequest({ email: 'user@example.com' }));
    const json = await res.json();

    expect(json).toHaveProperty('data');
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('meta');
    expect(typeof json.meta.generatedAt).toBe('string');
    expect(typeof json.meta.durationMs).toBe('number');
  });
});

// ── Server-to-server ops-token auth path (mint-reset-link GitHub Action) ────────

describe('POST /api/admin/password-reset-link — ops-token auth', () => {
  const OPS_LABEL = 'admin-password-reset-link.v1';
  const SECRET = 'test-nextauth-secret-value';
  const originalSecret = process.env.NEXTAUTH_SECRET;

  function validOpsToken(secret: string): string {
    const windowMinute = Math.floor(Date.now() / 60000);
    return createHmac('sha256', secret).update(`${OPS_LABEL}:${windowMinute}`).digest('hex');
  }

  function makeRequestWithToken(body: unknown, token: string | null): NextRequest {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (token !== null) headers['x-ops-token'] = token;
    return new NextRequest('http://localhost/api/admin/password-reset-link', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    // No interactive admin session on the ops-token path.
    mockAuth.mockResolvedValue(null);
    mockCanAccessAdmin.mockReturnValue(false);
    process.env.NEXTAUTH_SECRET = SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = originalSecret;
  });

  it('200 with a valid ops token even without an admin session', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user_1', email: 'samantha@example.com' });
    const res = await POST(makeRequestWithToken({ email: 'samantha@example.com' }, validOpsToken(SECRET)));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.resetUrl).toContain('/reset-password?token=');
  });

  it('404 when the ops token is wrong', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user_1', email: 'samantha@example.com' });
    const res = await POST(makeRequestWithToken({ email: 'samantha@example.com' }, 'deadbeef'));
    expect(res.status).toBe(404);
  });

  it('404 when no token is provided and no admin session', async () => {
    const res = await POST(makeRequestWithToken({ email: 'samantha@example.com' }, null));
    expect(res.status).toBe(404);
  });

  it('404 when NEXTAUTH_SECRET is unset (ops path disabled)', async () => {
    delete process.env.NEXTAUTH_SECRET;
    // A token computed against some other secret must not authorize.
    const res = await POST(makeRequestWithToken({ email: 'samantha@example.com' }, validOpsToken(SECRET)));
    expect(res.status).toBe(404);
  });
});
