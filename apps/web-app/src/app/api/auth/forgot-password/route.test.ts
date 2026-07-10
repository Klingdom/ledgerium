/**
 * Unit tests for POST /api/auth/forgot-password.
 *
 * Root-cause context (2026-07-09): (1) email-normalization inconsistency —
 * signup previously stored/looked-up email RAW while this route lowercased,
 * so any mixed-case signup could never be found here; (2) sendEmail()'s
 * return value was previously ignored, so delivery failures were invisible
 * while the route still reported generic success.
 *
 * Covers:
 *  - Enumeration-safe response shape (always the generic success message)
 *  - 400 when email is missing / not a string
 *  - Unknown email → generic success, no token/email side effects
 *  - Known email → normalizes lookup, invalidates prior tokens, creates a
 *    new token, and calls sendEmail with a reset URL
 *  - Delivery failure is logged server-side (without leaking the raw token
 *    or reset URL) while the client-facing response stays unchanged
 *  - Delivery success does NOT log an error
 *
 * Mocking strategy (mirrors signup/route.test.ts):
 *  - vi.mock('@/db')        — spy on db.user.findUnique / passwordResetToken.*
 *  - vi.mock('@/lib/email') — controls sendEmail's return value
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
    passwordResetToken: { updateMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}));

import { db } from '@/db';
import { sendEmail } from '@/lib/email';
import { POST } from './route';

const mockUserFindUnique = db.user.findUnique as ReturnType<typeof vi.fn>;
const mockTokenUpdateMany = db.passwordResetToken.updateMany as ReturnType<typeof vi.fn>;
const mockTokenCreate = db.passwordResetToken.create as ReturnType<typeof vi.fn>;
const mockSendEmail = sendEmail as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// `any` justified: vi.spyOn's overload resolution for `console.error` does not
// produce a stable named type across vitest versions; this is a test-only
// mock handle used solely for .mockRestore()/.toHaveBeenCalledWith().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let consoleErrorSpy: any;

beforeEach(() => {
  vi.clearAllMocks();
  mockTokenUpdateMany.mockResolvedValue({ count: 0 });
  mockTokenCreate.mockResolvedValue({ id: 'token_1' });
  mockSendEmail.mockResolvedValue({ success: true });
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('POST /api/auth/forgot-password', () => {
  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns generic enumeration-safe success for an unknown email', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ email: 'ghost@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('If an account exists with this email, a reset link has been sent.');
    expect(mockTokenCreate).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('normalizes mixed-case / whitespace email before lookup', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    await POST(makeRequest({ email: '  Samantha.Myers@EquipmentShare.com  ' }));

    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { email: 'samantha.myers@equipmentshare.com' },
    });
  });

  it('returns the same generic success response for a known email', async () => {
    mockUserFindUnique.mockResolvedValue({ email: 'user@example.com' });

    const res = await POST(makeRequest({ email: 'user@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('If an account exists with this email, a reset link has been sent.');
  });

  it('invalidates prior unused tokens and creates a new one for a known email', async () => {
    mockUserFindUnique.mockResolvedValue({ email: 'user@example.com' });

    await POST(makeRequest({ email: 'user@example.com' }));

    expect(mockTokenUpdateMany).toHaveBeenCalledWith({
      where: { email: 'user@example.com', usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    expect(mockTokenCreate).toHaveBeenCalledOnce();
    const createCall = mockTokenCreate.mock.calls[0]![0];
    expect(createCall.data.email).toBe('user@example.com');
    expect(typeof createCall.data.tokenHash).toBe('string');
    expect(createCall.data.tokenHash).toHaveLength(64); // sha256 hex
  });

  it('calls sendEmail with the reset link for a known email', async () => {
    mockUserFindUnique.mockResolvedValue({ email: 'user@example.com' });

    await POST(makeRequest({ email: 'user@example.com' }));

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const call = mockSendEmail.mock.calls[0]![0];
    expect(call.to).toBe('user@example.com');
    expect(call.html).toContain('/reset-password?token=');
  });

  it('logs a delivery failure server-side without leaking the token/URL, response unchanged', async () => {
    mockUserFindUnique.mockResolvedValue({ email: 'user@example.com' });
    mockSendEmail.mockResolvedValue({ success: false });

    const res = await POST(makeRequest({ email: 'user@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('If an account exists with this email, a reset link has been sent.');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[forgot-password] email delivery failed for',
      'user@example.com',
    );

    // Never log the raw token or reset URL.
    const loggedArgs = consoleErrorSpy.mock.calls.flat().join(' ');
    expect(loggedArgs).not.toMatch(/reset-password\?token=/);
  });

  it('does not log an error when delivery succeeds', async () => {
    mockUserFindUnique.mockResolvedValue({ email: 'user@example.com' });
    mockSendEmail.mockResolvedValue({ success: true });

    await POST(makeRequest({ email: 'user@example.com' }));

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
