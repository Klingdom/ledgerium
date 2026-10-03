/**
 * Row #290 item 2 — login must do exactly ONE bcrypt compare at the same cost
 * for every input shape, so response time does not reveal whether an address
 * is registered. Structural assertions (compare spy), not wall-clock timing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  authorize: undefined as undefined | ((c: unknown, r: unknown) => Promise<unknown>),
  user: null as null | Record<string, unknown>,
  REAL_HASH: '$2a$12$' + 'b'.repeat(53),
}));

vi.mock('next-auth', () => ({
  default: (cfg: { providers: Array<{ authorize: (c: unknown, r: unknown) => Promise<unknown> }> }) => {
    h.authorize = cfg.providers[0]!.authorize;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock('next-auth/providers/credentials', () => ({ default: (o: unknown) => o }));
vi.mock('bcryptjs', () => ({ compare: vi.fn() }));
vi.mock('@/lib/auth-user-lookup', () => ({ findUserByEmailForLogin: vi.fn(async () => h.user) }));

import './auth';
import { compare } from 'bcryptjs';
import { resetAccountThrottles } from '@/lib/rate-limit/account-throttle';

const mockCompare = vi.mocked(compare) as unknown as ReturnType<typeof vi.fn>;
let n = 0;
const login = (email: string, password: string) =>
  h.authorize!({ email, password }, { headers: new Headers({ 'x-forwarded-for': `10.1.0.${n++ % 250}` }) });

function hashUsed(): string {
  return mockCompare.mock.calls[0]![1] as string;
}

beforeEach(() => {
  resetAccountThrottles();
  mockCompare.mockReset();
  // Behaves like real bcrypt for the test: only the real user's hash matches.
  mockCompare.mockImplementation(async (pw: string, hash: string) => hash === h.REAL_HASH && pw === 'correct');
  h.user = null;
});

describe('login timing equalisation (#290 item 2)', () => {
  it('unknown email: exactly one compare, against a real cost-12 bcrypt hash, returns null', async () => {
    expect(await login('ghost@example.com', 'anything')).toBeNull();
    expect(mockCompare).toHaveBeenCalledTimes(1);
    expect(hashUsed()).toMatch(/^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/);
    expect(hashUsed()).not.toBe(h.REAL_HASH);
  });

  it('the dummy compare can never grant access, even if compare returns true', async () => {
    mockCompare.mockResolvedValue(true);
    expect(await login('ghost@example.com', 'anything')).toBeNull();
    h.user = { id: 'u2', email: 'oauth@example.com', name: null, passwordHash: '' };
    expect(await login('oauth@example.com', 'anything')).toBeNull();
    expect(mockCompare).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['empty hash (OAuth-only / no password)', ''],
    ['null hash', null],
    ['malformed hash', 'not-a-bcrypt-hash'],
  ])('user with %s: exactly one compare against the dummy hash, returns null', async (_label, hash) => {
    h.user = { id: 'u2', email: 'oauth@example.com', name: null, passwordHash: hash };
    expect(await login('oauth@example.com', 'whatever')).toBeNull();
    expect(mockCompare).toHaveBeenCalledTimes(1);
    expect(hashUsed()).toMatch(/^\$2[aby]\$12\$/);
  });

  it('known user, wrong password: exactly one compare against the stored hash, returns null', async () => {
    h.user = { id: 'u1', email: 'a@example.com', name: 'A', passwordHash: h.REAL_HASH };
    expect(await login('a@example.com', 'wrong')).toBeNull();
    expect(mockCompare).toHaveBeenCalledTimes(1);
    expect(hashUsed()).toBe(h.REAL_HASH);
  });

  it('known user, correct password: one compare, login succeeds', async () => {
    h.user = { id: 'u1', email: 'a@example.com', name: 'A', passwordHash: h.REAL_HASH };
    expect(await login('a@example.com', 'correct')).toMatchObject({ id: 'u1', email: 'a@example.com' });
    expect(mockCompare).toHaveBeenCalledTimes(1);
  });

  it('every shape does the same number of compares (1)', async () => {
    const counts: number[] = [];
    const shapes = [
      null,
      { id: 'x', email: 'x', name: null, passwordHash: '' },
      { id: 'y', email: 'y', name: null, passwordHash: h.REAL_HASH },
    ];
    for (const u of shapes) {
      mockCompare.mockClear();
      h.user = u;
      await login(`s${counts.length}@example.com`, 'pw');
      counts.push(mockCompare.mock.calls.length);
    }
    expect(counts).toEqual([1, 1, 1]);
  });
});
