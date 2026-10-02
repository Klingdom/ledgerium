/**
 * Per-ACCOUNT throttles (row #289), independent of client IP.
 *
 * Why: the per-IP limits key on a client IP derived from a caller-controlled
 * `X-Forwarded-For` header (client-ip.ts; proxy trust is row #225), so rotating
 * that header yields unlimited attempts. Admin authority rests on two public
 * addresses, so a targeted password guess against one address must be limited
 * no matter where it comes from.
 *
 * Keys are the email the caller submitted, normalised with `normalizeEmail`
 * (the same function signup / login lookup / forgot-password use), so
 * case/whitespace variants share one bucket. Existing and non-existing
 * accounts take the identical code path (no enumeration oracle).
 *
 * LOGIN: increasing delay, never permanent lockout.
 *   - the first LOGIN_FREE_FAILURES (5) consecutive failures are not delayed;
 *   - failure n >= 5 refuses further attempts for 30s * 2^(n-5), capped at
 *     15 minutes. Attempts refused while locked do NOT extend the lock or count
 *     as failures, so an attacker cannot push a victim's delay past the cap and
 *     the legitimate owner is never refused for more than 15 minutes;
 *   - a successful login clears the record; a record idle for 24h expires.
 *   Cost to a guesser at the cap: ~4 guesses/hour per address after the first
 *   5 (~100/day) vs unlimited today. Lockout-weapon exposure: anyone can hold
 *   an address in a <=15 min refusal window by failing deliberately; accepted
 *   (a bounded delay, not a lock).
 *
 * FORGOT-PASSWORD: FORGOT_MAX (3) requests per address per hour. Over the
 * limit the route returns its normal success response without sending, so the
 * throttle is invisible to the caller (no flooding, no probing).
 *
 * @ledgerium-rate-limit-cold-start-acceptable-risk
 * DURABILITY: in-process Map. State resets on restart/deploy and is NOT shared
 * across instances (N instances => up to N x the attempts). Same acknowledged
 * trade-off as auth-buckets.ts; durable (Postgres/Redis) storage needs a schema
 * change and is out of scope. Memory is bounded by MAX_ENTRIES.
 *
 * Unlike checkAuthRateLimit this has NO NODE_ENV==='test' bypass, so tests
 * exercise the real logic; tests call resetAccountThrottles().
 */
import { normalizeEmail } from '@/lib/email-normalize';

export const LOGIN_FREE_FAILURES = 5;
export const LOGIN_BASE_DELAY_MS = 30_000;
export const LOGIN_MAX_DELAY_MS = 15 * 60_000;
export const LOGIN_RECORD_TTL_MS = 24 * 60 * 60_000;
export const FORGOT_MAX = 3;
export const FORGOT_WINDOW_MS = 60 * 60_000;
const MAX_ENTRIES = 50_000;

interface LoginRecord {
  failures: number;
  lockedUntil: number;
  lastFailureAt: number;
}
interface ForgotRecord {
  count: number;
  resetAt: number;
}

const loginRecords = new Map<string, LoginRecord>();
const forgotRecords = new Map<string, ForgotRecord>();

/** Bound memory: drop expired, then oldest unlocked entries (Map keeps insertion order). */
function trim<T>(
  map: Map<string, T>,
  isExpired: (v: T) => boolean,
  isLocked: (v: T) => boolean,
): void {
  if (map.size < MAX_ENTRIES) return;
  for (const [k, v] of map) if (isExpired(v)) map.delete(k);
  for (const [k, v] of map) {
    if (map.size < MAX_ENTRIES) break;
    if (!isLocked(v)) map.delete(k);
  }
}

/** Is login for this address currently refused? Does not count an attempt. */
export function checkLoginThrottle(
  email: string,
  nowMs: number,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const key = normalizeEmail(email);
  const rec = loginRecords.get(key);
  if (!rec) return { allowed: true };
  if (nowMs - rec.lastFailureAt > LOGIN_RECORD_TTL_MS) {
    loginRecords.delete(key);
    return { allowed: true };
  }
  if (rec.lockedUntil > nowMs) {
    return { allowed: false, retryAfterSeconds: Math.ceil((rec.lockedUntil - nowMs) / 1000) };
  }
  return { allowed: true };
}

/** Record a failed attempt (only for attempts actually evaluated, i.e. not refused). */
export function recordLoginFailure(email: string, nowMs: number): void {
  const key = normalizeEmail(email);
  trim(
    loginRecords,
    (r) => nowMs - r.lastFailureAt > LOGIN_RECORD_TTL_MS,
    (r) => r.lockedUntil > nowMs,
  );
  const prev = loginRecords.get(key);
  const fresh = !prev || nowMs - prev.lastFailureAt > LOGIN_RECORD_TTL_MS;
  const failures = (fresh ? 0 : prev.failures) + 1;
  const over = failures - LOGIN_FREE_FAILURES;
  const delay = over >= 0 ? Math.min(LOGIN_BASE_DELAY_MS * 2 ** over, LOGIN_MAX_DELAY_MS) : 0;
  loginRecords.delete(key); // re-insert to refresh insertion order
  loginRecords.set(key, {
    failures,
    lockedUntil: delay > 0 ? nowMs + delay : 0,
    lastFailureAt: nowMs,
  });
}

/** A successful login clears the address's failure history. */
export function recordLoginSuccess(email: string): void {
  loginRecords.delete(normalizeEmail(email));
}

/** Count a forgot-password request for this address. allowed:false => caller silently skips the send. */
export function checkForgotPasswordThrottle(email: string, nowMs: number): { allowed: boolean } {
  const key = normalizeEmail(email);
  trim(forgotRecords, (r) => r.resetAt < nowMs, () => false);
  const rec = forgotRecords.get(key);
  if (!rec || rec.resetAt < nowMs) {
    forgotRecords.set(key, { count: 1, resetAt: nowMs + FORGOT_WINDOW_MS });
    return { allowed: true };
  }
  if (rec.count >= FORGOT_MAX) return { allowed: false };
  rec.count += 1;
  return { allowed: true };
}

/** Test-only. */
export function resetAccountThrottles(): void {
  loginRecords.clear();
  forgotRecords.clear();
}
