/**
 * Unit tests for findUserByEmailForLogin (lib/auth-user-lookup.ts).
 *
 * Root-cause context (2026-07-09): login always did a raw, exact-case
 * `db.user.findUnique({ where: { email } })`. Signup is being fixed to store
 * a normalized (lowercased/trimmed) email going forward, so login must look
 * up by the normalized form to find NEW accounts — while still finding any
 * PRE-EXISTING account row that may have been stored under a different
 * casing before this fix (fallback lookup), so no currently-working login
 * regresses.
 *
 * Mocking strategy: vi.mock('@/db') — spy on db.user.findUnique.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
  },
}));

import { db } from '@/db';
import { findUserByEmailForLogin } from './auth-user-lookup';

const mockFindUnique = db.user.findUnique as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('findUserByEmailForLogin', () => {
  it('looks up by the normalized email first', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 'u1', email: 'user@example.com' });

    const user = await findUserByEmailForLogin('User@Example.com');

    expect(mockFindUnique).toHaveBeenNthCalledWith(1, { where: { email: 'user@example.com' } });
    expect(user).toEqual({ id: 'u1', email: 'user@example.com' });
  });

  it('does not perform a second lookup when the normalized lookup succeeds', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 'u1', email: 'user@example.com' });

    await findUserByEmailForLogin('User@Example.com');

    expect(mockFindUnique).toHaveBeenCalledTimes(1);
  });

  it('falls back to the raw as-typed email when normalized lookup misses and casing differs', async () => {
    mockFindUnique
      .mockResolvedValueOnce(null) // normalized lookup miss
      .mockResolvedValueOnce({ id: 'u2', email: 'Legacy.User@Example.com' }); // raw fallback hit

    const user = await findUserByEmailForLogin('Legacy.User@Example.com');

    expect(mockFindUnique).toHaveBeenNthCalledWith(1, {
      where: { email: 'legacy.user@example.com' },
    });
    expect(mockFindUnique).toHaveBeenNthCalledWith(2, {
      where: { email: 'Legacy.User@Example.com' },
    });
    expect(user).toEqual({ id: 'u2', email: 'Legacy.User@Example.com' });
  });

  it('does not perform a redundant second lookup when raw email is already normalized', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const user = await findUserByEmailForLogin('user@example.com');

    // rawEmail === normalizedEmail, so the fallback branch must not fire —
    // it would be an identical, wasted duplicate query.
    expect(mockFindUnique).toHaveBeenCalledTimes(1);
    expect(user).toBeNull();
  });

  it('returns null when neither the normalized nor the raw lookup finds a user', async () => {
    mockFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const user = await findUserByEmailForLogin('Nobody@Example.com');

    expect(user).toBeNull();
  });

  it('trims surrounding whitespace as part of normalization', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 'u3', email: 'user@example.com' });

    await findUserByEmailForLogin('  user@example.com  ');

    expect(mockFindUnique).toHaveBeenNthCalledWith(1, { where: { email: 'user@example.com' } });
  });
});
