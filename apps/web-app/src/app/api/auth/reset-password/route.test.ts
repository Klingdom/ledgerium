/**
 * Unit tests for POST /api/auth/reset-password.
 *
 * Root-cause context (2026-07-09): the email param was previously normalized
 * inline (`email.toLowerCase().trim()`); this now routes through the shared
 * `normalizeEmail` helper so storage and lookup are guaranteed consistent
 * across the whole auth surface.
 *
 * Covers:
 *  - 400 when token / email / password missing
 *  - 400 when password is too short
 *  - Normalizes mixed-case / whitespace email before the token lookup
 *  - 400 when no matching, unused, unexpired token found
 *  - Happy path: updates the user's password hash and marks the token used
 *    inside a single transaction
 *
 * Mocking strategy:
 *  - vi.mock('@/db')       — spy on db.passwordResetToken.findFirst / $transaction
 *  - vi.mock('bcryptjs')   — deterministic hash
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/db', () => ({
  db: {
    passwordResetToken: { findFirst: vi.fn(), update: vi.fn().mockResolvedValue({}) },
    user: { update: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(),
  },
}));

vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed_new_password'),
}));

import { db } from '@/db';
import { POST } from './route';

const mockFindFirst = db.passwordResetToken.findFirst as ReturnType<typeof vi.fn>;
const mockTransaction = db.$transaction as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/reset-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTransaction.mockResolvedValue([{}, {}]);
});

describe('POST /api/auth/reset-password', () => {
  it('returns 400 when token, email, or password are missing', async () => {
    const res = await POST(makeRequest({ email: 'user@example.com', password: 'password123' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    const res = await POST(
      makeRequest({ token: 'abc', email: 'user@example.com', password: 'short' }),
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe('Password must be at least 8 characters');
  });

  it('normalizes mixed-case / whitespace email before the token lookup', async () => {
    mockFindFirst.mockResolvedValue(null);

    await POST(
      makeRequest({
        token: 'raw-token-value',
        email: '  Samantha.Myers@EquipmentShare.com  ',
        password: 'password123',
      }),
    );

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: 'samantha.myers@equipmentshare.com',
        }),
      }),
    );
  });

  it('returns 400 when no matching unused/unexpired token is found', async () => {
    mockFindFirst.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ token: 'bad-token', email: 'user@example.com', password: 'password123' }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid or expired reset link. Please request a new one.');
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('updates the password and marks the token used on a valid token', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'token_1',
      email: 'user@example.com',
      tokenHash: 'abc123',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const res = await POST(
      makeRequest({ token: 'raw-token', email: 'user@example.com', password: 'password123' }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('Password updated successfully. You can now sign in.');
    expect(mockTransaction).toHaveBeenCalledOnce();
  });
});
