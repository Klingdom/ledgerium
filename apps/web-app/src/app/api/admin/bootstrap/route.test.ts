/**
 * POST /api/admin/bootstrap — retired (row #276 / AUTHZ_AUDIT_001 P1-1).
 *
 * The endpoint must be incapable of conferring admin authority regardless of
 * environment variables, session, or database state. The production condition
 * is DISABLE_ADMIN_BOOTSTRAP UNSET, so every test runs with it unset.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUserUpdate, mockUserFindFirst, mockUserUpdateMany, mockTransaction, mockAuth } = vi.hoisted(() => ({
  mockUserUpdate: vi.fn(),
  mockUserFindFirst: vi.fn(),
  mockUserUpdateMany: vi.fn(),
  mockTransaction: vi.fn(),
  mockAuth: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    user: { update: mockUserUpdate, findFirst: mockUserFindFirst, updateMany: mockUserUpdateMany },
    $transaction: mockTransaction,
  },
}));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));


describe('POST /api/admin/bootstrap (retired)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.DISABLE_ADMIN_BOOTSTRAP;
  });

  it('refuses a non-allowlisted signed-in user and never writes isAdmin (DISABLE_ADMIN_BOOTSTRAP unset)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', email: 'attacker@example.com' } });
    const { POST } = await import('./route');
    const res = await POST();
    expect(res.status).toBe(410);
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockUserUpdateMany).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('also refuses an allowlisted user and writes nothing (allowlist needs no promotion)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'a1', email: 'phil@mediafier.ai' } });
    const { POST } = await import('./route');
    const res = await POST();
    expect(res.status).toBe(410);
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('refuses when no admin row exists and no session at all', async () => {
    mockAuth.mockResolvedValue(null);
    mockUserFindFirst.mockResolvedValue(null);
    const { POST } = await import('./route');
    const res = await POST();
    expect(res.status).toBe(410);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('is identical with the kill-switch set (no env variable changes behaviour)', async () => {
    process.env.DISABLE_ADMIN_BOOTSTRAP = 'false';
    mockAuth.mockResolvedValue({ user: { id: 'u1', email: 'attacker@example.com' } });
    const { POST } = await import('./route');
    const res = await POST();
    delete process.env.DISABLE_ADMIN_BOOTSTRAP;
    expect(res.status).toBe(410);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});
