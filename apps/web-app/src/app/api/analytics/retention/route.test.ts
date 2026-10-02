/** GET /api/analytics/retention — admin gate is the allowlist, not User.isAdmin (row #276). */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { authMock, userFindMany, eventFindMany } = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindMany: vi.fn(),
  eventFindMany: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ auth: () => authMock() }));
vi.mock('@/db', () => ({
  db: { user: { findMany: userFindMany }, analyticsEvent: { findMany: eventFindMany } },
}));

describe('GET /api/analytics/retention admin gate', () => {
  beforeEach(() => {
    vi.resetModules();
    authMock.mockReset();
    userFindMany.mockReset().mockResolvedValue([]);
    eventFindMany.mockReset().mockResolvedValue([]);
  });

  it('401 when unauthenticated', async () => {
    authMock.mockResolvedValue(null);
    const { GET } = await import('./route');
    expect((await GET()).status).toBe(401);
  });

  it('403 for isAdmin:true session NOT on the allowlist', async () => {
    authMock.mockResolvedValue({ user: { id: 'u', email: 'user@example.com', isAdmin: true } });
    const { GET } = await import('./route');
    expect((await GET()).status).toBe(403);
    expect(userFindMany).not.toHaveBeenCalled();
  });

  it('allows an allowlisted user', async () => {
    authMock.mockResolvedValue({ user: { id: 'a', email: 'phil@mediafier.ai' } });
    const { GET } = await import('./route');
    expect((await GET()).status).toBe(200);
  });
});
