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
import { compare } from 'bcryptjs';
import {
  resetAccountThrottles,
  reserveLoginAttempt,
  checkForgotPasswordThrottle,
  accountSlot,
  recordLoginSuccess,
  __setSlotOverrideForTests,
  throttleTableSizes,
  THROTTLE_TABLE_SIZE,
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

// ── Row #291: saturation, memory bound, concurrency ─────────────────────────
describe('login per-account throttle (#291): cannot be reset, disabled or bypassed', () => {
  const TARGET = 'admin@example.com';
  const JUNK = 50_000;

  // The slot key is random per process, so a fixed probe address collides with
  // one of 50,000 junk slots in ~5% of runs. Collision is the documented
  // over-throttle trade-off, not the property under test, so the probe is
  // chosen from slots the junk set does not use (found before any writes).
  function junkSlots(prefix: string): Set<number> {
    const slots = new Set<number>();
    for (let i = 0; i < JUNK; i++) slots.add(accountSlot(`${prefix}${i}@junk.example`));
    return slots;
  }
  function nonColliding(base: string, slots: Set<number>): string {
    for (let k = 0; ; k++) {
      const addr = `${base}+${k}@example.com`;
      if (!slots.has(accountSlot(addr))) return addr;
    }
  }
  function saturate(prefix: string, now: number): void {
    for (let i = 0; i < JUNK; i++) {
      const addr = `${prefix}${i}@junk.example`;
      for (let j = 0; j < 10; j++) reserveLoginAttempt(addr, now);
    }
  }
  function guessOverSeconds(addr: string, seconds: number): number {
    let evaluated = 0;
    for (let s = 0; s < seconds; s++) {
      if (reserveLoginAttempt(addr, T0 + s * 1000).allowed) evaluated++;
    }
    return evaluated;
  }

  beforeEach(() => {
    resetAccountThrottles();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
    vi.mocked(compare).mockImplementation(async (pw: string) => pw === 'correct-password');
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('(a) 4 failures, then 50,000 locked junk addresses, then the 5th failure still locks the target', () => {
    const target = nonColliding('admin', junkSlots('a'));
    for (let i = 0; i < 4; i++) expect(reserveLoginAttempt(target, T0).allowed).toBe(true);
    saturate('a', T0);
    expect(reserveLoginAttempt(target, T0).allowed).toBe(true); // 5th evaluated
    expect(reserveLoginAttempt(target, T0).allowed).toBe(false); // now locked: count survived
  });

  it('(b) after saturation with locked junk, 1,000 guesses over 1,000 s evaluate exactly as many as the unsaturated control', () => {
    const fresh = nonColliding('fresh-target', junkSlots('b'));
    const control = guessOverSeconds(fresh, 1000);
    expect(control).toBeLessThan(15); // the throttle really bites (5 free + a few backoffs)
    resetAccountThrottles();
    saturate('b', T0);
    expect(guessOverSeconds(fresh, 1000)).toBe(control);
  });

  it('(c) memory is strictly bounded: table size is fixed no matter how many addresses are seen', () => {
    reserveLoginAttempt('seed@example.com', T0);
    checkForgotPasswordThrottle('seed@example.com', T0);
    const before = throttleTableSizes();
    expect(before.login).toBe(THROTTLE_TABLE_SIZE);
    expect(before.forgot).toBe(THROTTLE_TABLE_SIZE);
    saturate('c', T0);
    for (let i = 0; i < 20_000; i++) checkForgotPasswordThrottle(`f${i}@junk.example`, T0);
    expect(throttleTableSizes()).toEqual(before);
    // every slot index is inside the table
    for (let i = 0; i < 1000; i++) {
      const s = accountSlot(`slot${i}@x.io`);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(THROTTLE_TABLE_SIZE);
    }
  });

  it('forgot-password: 3/hour per address is not reset by 50,000+ other addresses', () => {
    const target = nonColliding('admin', junkSlots('g'));
    for (let i = 0; i < 2; i++) expect(checkForgotPasswordThrottle(target, T0).allowed).toBe(true);
    for (let i = 0; i < JUNK; i++) checkForgotPasswordThrottle(`g${i}@junk.example`, T0);
    expect(checkForgotPasswordThrottle(target, T0).allowed).toBe(true); // 3rd
    expect(checkForgotPasswordThrottle(target, T0).allowed).toBe(false); // 4th refused
  });

  it('(d) 50 parallel wrong-password attempts: at most the free allowance (5) reach the password compare', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    vi.mocked(compare).mockImplementation(async () => {
      await gate; // simulate slow bcrypt
      return false;
    });
    vi.mocked(compare).mockClear();
    const burst = Array.from({ length: 50 }, (_, i) => login(TARGET, 'wrong', `172.16.0.${i}`));
    // let every authorize run up to its first await / compare
    await new Promise((r) => setImmediate(r));
    expect(vi.mocked(compare).mock.calls.length).toBeLessThanOrEqual(LOGIN_FREE_FAILURES);
    release();
    const results = await Promise.all(burst);
    expect(results.every((r) => r === null)).toBe(true);
    expect(vi.mocked(compare).mock.calls.length).toBe(LOGIN_FREE_FAILURES);
    // and the address is now locked, even for the correct password
    expect(await login(TARGET, 'correct-password', '172.16.1.1')).toBeNull();
  });

  it('(e) success after reservations clears them; refused attempts still do not extend the lock', async () => {
    for (let i = 0; i < 4; i++) expect(await login(TARGET, 'wrong', `10.9.0.${i}`)).toBeNull();
    expect(await login(TARGET, 'correct-password', '10.9.1.1')).toMatchObject({ id: 'u1' });
    // history cleared: 4 more wrong guesses do not lock, correct password works
    for (let i = 0; i < 4; i++) expect(await login(TARGET, 'wrong', `10.9.2.${i}`)).toBeNull();
    expect(await login(TARGET, 'correct-password', '10.9.3.1')).toMatchObject({ id: 'u1' });
    // lock, then hammer while refused, lock still expires on schedule
    for (let i = 0; i < LOGIN_FREE_FAILURES; i++) await login(TARGET, 'wrong', `10.9.4.${i}`);
    for (let i = 0; i < 20; i++) expect(await login(TARGET, 'wrong', `10.9.5.${i}`)).toBeNull();
    vi.setSystemTime(T0 + 31_000);
    expect(await login(TARGET, 'correct-password', '10.9.6.1')).toMatchObject({ id: 'u1' });
  });

  it("(f) a successful login by a colliding address does NOT clear the target's count or lock", () => {
    const COLLIDER = 'attacker-owned@example.com';
    __setSlotOverrideForTests(() => 12345); // force both addresses into one slot
    try {
      expect(accountSlot(TARGET)).toBe(accountSlot(COLLIDER));
      for (let i = 0; i < LOGIN_FREE_FAILURES; i++) expect(reserveLoginAttempt(TARGET, T0).allowed).toBe(true);
      expect(reserveLoginAttempt(TARGET, T0).allowed).toBe(false); // locked
      recordLoginSuccess(COLLIDER); // attacker logs into own account
      expect(reserveLoginAttempt(TARGET, T0).allowed).toBe(false); // lock survives
      // the real holder's success does clear
      recordLoginSuccess(TARGET);
      expect(reserveLoginAttempt(TARGET, T0 + 1).allowed).toBe(true);
    } finally {
      __setSlotOverrideForTests(null);
    }
  });
});
