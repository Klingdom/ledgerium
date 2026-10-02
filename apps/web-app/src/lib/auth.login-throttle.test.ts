/**
 * Row #289 — per-ACCOUNT login throttle, independent of client IP.
 * Drives the real Credentials `authorize` captured from the NextAuth config.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const captured = vi.hoisted(() => ({} as { authorize?: (c: unknown, r: unknown) => Promise<unknown> }));

vi.mock('next-auth', () => ({
  default: (cfg: { providers: Array<{ authorize: (c: unknown, r: unknown) => Promise<unknown> }> }) => {
    captured.authorize = cfg.providers[0]!.authorize;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock('next-auth/providers/credentials', () => ({
  default: (opts: unknown) => opts,
}));
vi.mock('bcryptjs', () => ({
  compare: vi.fn(async (pw: string) => pw === 'correct-password'),
}));
vi.mock('@/lib/auth-user-lookup', () => ({
  findUserByEmailForLogin: vi.fn(async (email: string) =>
    email.trim().toLowerCase() === 'admin@example.com'
      ? { id: 'u1', email: 'admin@example.com', name: 'Admin', passwordHash: 'h' }
      : null,
  ),
}));

import './auth';
import {
  resetAccountThrottles,
  LOGIN_FREE_FAILURES,
  LOGIN_MAX_DELAY_MS,
} from '@/lib/rate-limit/account-throttle';

const T0 = 1_700_000_000_000;

function req(ip: string) {
  return { headers: new Headers({ 'x-forwarded-for': ip }) };
}
function login(email: string, password: string, ip: string) {
  return captured.authorize!({ email, password }, req(ip));
}
async function failN(email: string, n: number, ipPrefix = '10.0.0.') {
  for (let i = 0; i < n; i++) {
    expect(await login(email, 'wrong', `${ipPrefix}${i}`)).toBeNull();
  }
}

describe('login per-account throttle (#289)', () => {
  beforeEach(() => {
    resetAccountThrottles();
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('refuses a correct password after N failures even from a fresh IP each time', async () => {
    await failN('admin@example.com', LOGIN_FREE_FAILURES);
    // Different IP every attempt; even the correct password is refused now.
    expect(await login('admin@example.com', 'correct-password', '203.0.113.200')).toBeNull();
  });

  it('allows the correct password once the delay has elapsed, and success resets', async () => {
    await failN('admin@example.com', LOGIN_FREE_FAILURES);
    expect(await login('admin@example.com', 'correct-password', '1.1.1.1')).toBeNull();
    vi.setSystemTime(T0 + 31_000);
    expect(await login('admin@example.com', 'correct-password', '2.2.2.2')).toMatchObject({ id: 'u1' });
    // Reset: LOGIN_FREE_FAILURES more wrong guesses are again un-delayed.
    for (let i = 0; i < LOGIN_FREE_FAILURES; i++) {
      expect(await login('admin@example.com', 'wrong', `3.3.3.${i}`)).toBeNull();
    }
    expect(await login('admin@example.com', 'correct-password', '3.3.3.99')).toBeNull(); // locked again only after 5th
  });

  it('is backoff, not lockout: delay grows but is capped at 15 minutes', async () => {
    let now = T0;
    for (let round = 0; round < 15; round++) {
      vi.setSystemTime(now);
      // Evaluated attempt after the previous delay elapsed: a wrong password.
      await login('admin@example.com', 'wrong', `9.9.9.${round}`);
      now += LOGIN_MAX_DELAY_MS + 1_000;
    }
    // Past the cap window the correct password works again.
    vi.setSystemTime(now);
    expect(await login('admin@example.com', 'correct-password', '8.8.8.8')).toMatchObject({ id: 'u1' });
  });

  it('refused attempts do not extend the lock', async () => {
    await failN('admin@example.com', LOGIN_FREE_FAILURES); // 5th failure => 30s lock
    for (let i = 0; i < 50; i++) await login('admin@example.com', 'wrong', `4.4.4.${i}`);
    vi.setSystemTime(T0 + 31_000);
    expect(await login('admin@example.com', 'correct-password', '5.5.5.5')).toMatchObject({ id: 'u1' });
  });

  it('case / whitespace variants share one bucket', async () => {
    const variants = ['admin@example.com', 'ADMIN@example.com', '  Admin@Example.COM ', 'admin@EXAMPLE.com', 'Admin@example.com'];
    for (let i = 0; i < variants.length; i++) {
      expect(await login(variants[i]!, 'wrong', `6.6.6.${i}`)).toBeNull();
    }
    expect(await login('admin@example.com', 'correct-password', '6.6.6.99')).toBeNull();
  });

  it('existing and non-existing accounts are throttled identically (same observable result and timing of lock)', async () => {
    const observe = async (email: string) => {
      resetAccountThrottles();
      vi.setSystemTime(T0);
      const trace: unknown[] = [];
      for (let i = 0; i < LOGIN_FREE_FAILURES + 2; i++) trace.push(await login(email, 'wrong', `7.7.7.${i}`));
      // correct password for the real account, still refused at +29s, allowed-evaluation at +31s
      vi.setSystemTime(T0 + 29_000);
      trace.push(await login(email, 'correct-password', '7.7.8.1'));
      return trace;
    };
    const real = await observe('admin@example.com');
    const ghost = await observe('nobody@example.com');
    // Every wrong-password / refused response is null for both; the only
    // difference is the real account's correct password, refused (null) in
    // the lock window exactly like the non-existing one.
    expect(real).toEqual(ghost);
    expect(real.every((r) => r === null)).toBe(true);
  });
});
