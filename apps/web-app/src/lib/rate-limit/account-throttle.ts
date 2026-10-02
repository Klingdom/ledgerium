/**
 * Per-ACCOUNT throttles (rows #289, #291), independent of client IP.
 *
 * Why: the per-IP limits key on a client IP derived from a caller-controlled
 * `X-Forwarded-For` header (client-ip.ts; proxy trust is row #225), so rotating
 * that header yields unlimited attempts. Admin authority rests on two public
 * addresses, so a targeted password guess against one address must be limited
 * no matter where it comes from, how much other traffic there is, or how many
 * requests run in parallel.
 *
 * STRUCTURE (#291): fixed-size typed-array tables indexed by the low
 * THROTTLE_TABLE_BITS bits of SHA-256(key || normalizeEmail(address)). The key
 * is `randomBytes(32)` drawn once at module init. State is in-process and resets
 * on restart anyway, so cross-restart determinism of the slot buys nothing, and
 * a secret key means an attacker cannot offline-search for an address that
 * collides with a chosen target. Key-prefixed SHA-256 rather than HMAC because
 * the output is never revealed, so only unpredictability matters (length
 * extension needs a known output); createHmac measured ~15x slower per call.
 * Memory is strictly bounded (~10 MB login + ~9 MB
 * forgot, allocated on first use), every operation is O(1), nothing is evicted,
 * so other traffic can never RESET or DISABLE counting for an address.
 * COLLISIONS (~1 in 1M per pair) share a counter and so only over-throttle.
 * Login slots also store a 32-bit fingerprint (other bits of the same keyed hash) of the address
 * holding the record. Rules: (1) a reservation always counts against the slot
 * whatever its fingerprint (over-throttle, never under); (2) the slot keeps the
 * fingerprint of the address that created the record (first holder while the
 * record is live; a new record after expiry/clear takes the new address's
 * fingerprint); (3) recordLoginSuccess clears ONLY when the fingerprint matches,
 * so a successful login by a colliding address cannot reset another address's
 * count or lock. Cost of rule 3: if a junk address holds the slot, the real
 * owner's success will not clear it (it expires normally, <= 24 h idle).
 * AVAILABILITY RESIDUAL (accepted, quantified): with fixed slots, an attacker
 * driving N distinct junk addresses to lock fills about 2^20 * (1 - e^(-N/2^20))
 * slots, and every real address hashing to a filled slot is refused too,
 * admins included. N = 1M junk addresses fills ~61% of slots (N = 2^20: 63%).
 * Non-existent accounts skip bcrypt, so this is cheap. Per slot, 5 reservations
 * give only a 30 s lock; 10 reach the 15 min cap, so a 15 min lock of ~61% of
 * slots costs ~10M requests, and holding it costs ~(locked slots)/900 requests
 * per second (~700 req/s for ~640k slots; re-locking is one request per slot per
 * 15 min). It requires defeating the per-IP limit, which X-Forwarded-For
 * rotation allows today and which closes once #225 TRUSTED_PROXY_HOPS is set.
 * The earlier Map design could not be mass-locked this way.
 *
 * Keys are the email the caller submitted, normalised with `normalizeEmail`
 * (the same function signup / login lookup / forgot-password use), so
 * case/whitespace variants share one bucket. Existing and non-existing
 * accounts take the identical code path (no enumeration oracle).
 *
 * LOGIN: increasing delay, never permanent lockout.
 *   - the first LOGIN_FREE_FAILURES (5) attempts are not delayed;
 *   - attempt n >= 5 starts a refusal of 30s * 2^(n-5), capped at 15 minutes.
 *     The attempt that trips the lock is itself still evaluated. Attempts
 *     refused while locked do NOT extend the lock or count, so an attacker
 *     cannot push a victim's delay past the cap and the legitimate owner is
 *     never refused for more than 15 minutes;
 *   - CONCURRENCY: `reserveLoginAttempt` counts the attempt as a (pending)
 *     failure synchronously, BEFORE the awaited password compare. A burst of N
 *     parallel attempts at an unlocked address therefore counts N, and at most
 *     the free allowance can be evaluated before the lock. A successful login
 *     clears the record (refunding the reservations); idle records expire
 *     after 24h.
 *   Cost to a guesser at the cap: ~4 guesses/hour per address after the first
 *   5 (~100/day) vs unlimited today. Lockout-weapon exposure: anyone can hold
 *   an address in a <=15 min refusal window by failing deliberately; accepted.
 *
 * FORGOT-PASSWORD: FORGOT_MAX (3) requests per address per hour. Over the
 * limit the route returns its normal success response without sending, so the
 * throttle is invisible to the caller (no flooding, no probing).
 *
 * @ledgerium-rate-limit-cold-start-acceptable-risk
 * DURABILITY: in-process memory. State resets on restart/deploy and is NOT
 * shared across instances (N instances => up to N x the attempts). Same
 * acknowledged trade-off as auth-buckets.ts; durable (Postgres/Redis) storage
 * needs a schema change and is out of scope.
 *
 * Unlike checkAuthRateLimit this has NO NODE_ENV==='test' bypass, so tests
 * exercise the real logic; tests call resetAccountThrottles().
 */
import { createHash, randomBytes } from 'node:crypto';
import { normalizeEmail } from '@/lib/email-normalize';

export const LOGIN_FREE_FAILURES = 5;
export const LOGIN_BASE_DELAY_MS = 30_000;
export const LOGIN_MAX_DELAY_MS = 15 * 60_000;
export const LOGIN_RECORD_TTL_MS = 24 * 60 * 60_000;
export const FORGOT_MAX = 3;
export const FORGOT_WINDOW_MS = 60 * 60_000;
/** Slots per table (2^20). Fixed: memory never grows with traffic. */
export const THROTTLE_TABLE_BITS = 20;
export const THROTTLE_TABLE_SIZE = 2 ** THROTTLE_TABLE_BITS;

const slotKey: Buffer = randomBytes(32);
let slotOverride: ((normalized: string) => number) | null = null;

/** Keyed-hash-derived slot and 32-bit fingerprint for an address (keyed per process). */
function derive(email: string): { slot: number; fp: number } {
  const normalized = normalizeEmail(email);
  const d = createHash('sha256').update(slotKey).update(normalized).digest();
  const slot = slotOverride ? slotOverride(normalized) : d.readUInt32BE(0) & (THROTTLE_TABLE_SIZE - 1);
  return { slot, fp: d.readUInt32BE(4) };
}

/** Slot index for an address (keyed: not predictable without the process key). */
export function accountSlot(email: string): number {
  return derive(email).slot;
}

/** TEST-ONLY: force slot selection (e.g. to create a collision); null restores keyed slots. */
export function __setSlotOverrideForTests(fn: ((normalized: string) => number) | null): void {
  slotOverride = fn;
}

interface LoginTable {
  count: Uint8Array; // attempts counted (saturates at 255)
  lockedUntil: Float64Array; // 0 = not locked
  expiresAt: Float64Array; // lastAttemptAt + TTL; 0 = empty slot
  fp: Uint32Array; // fingerprint of the address that created the record
}
interface ForgotTable {
  count: Uint8Array;
  resetAt: Float64Array;
}

let loginTable: LoginTable | null = null;
let forgotTable: ForgotTable | null = null;

function login(): LoginTable {
  return (loginTable ??= {
    count: new Uint8Array(THROTTLE_TABLE_SIZE),
    lockedUntil: new Float64Array(THROTTLE_TABLE_SIZE),
    expiresAt: new Float64Array(THROTTLE_TABLE_SIZE),
    fp: new Uint32Array(THROTTLE_TABLE_SIZE),
  });
}
function forgot(): ForgotTable {
  return (forgotTable ??= {
    count: new Uint8Array(THROTTLE_TABLE_SIZE),
    resetAt: new Float64Array(THROTTLE_TABLE_SIZE),
  });
}

/** Test-only: total slots allocated across both tables (memory-bound check). */
export function throttleTableSizes(): { login: number; forgot: number } {
  return {
    login: loginTable ? loginTable.count.length : 0,
    forgot: forgotTable ? forgotTable.count.length : 0,
  };
}

/**
 * Atomically (synchronously) check AND count a login attempt. Call before the
 * awaited password compare. allowed:false => caller must refuse (not counted,
 * lock not extended). allowed:true => the attempt is counted as a pending
 * failure; call recordLoginSuccess on success to clear it. There is no
 * separate "record failure" step: the reservation already is the failure.
 */
export function reserveLoginAttempt(
  email: string,
  nowMs: number,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const t = login();
  const { slot: i, fp } = derive(email);
  if (t.expiresAt[i]! !== 0 && nowMs > t.expiresAt[i]!) {
    t.count[i] = 0;
    t.lockedUntil[i] = 0;
    t.expiresAt[i] = 0;
  }
  const lockedUntil = t.lockedUntil[i]!;
  if (lockedUntil > nowMs) {
    return { allowed: false, retryAfterSeconds: Math.ceil((lockedUntil - nowMs) / 1000) };
  }
  const n = Math.min(t.count[i]! + 1, 255);
  t.count[i] = n;
  const over = n - LOGIN_FREE_FAILURES;
  const delay = over >= 0 ? Math.min(LOGIN_BASE_DELAY_MS * 2 ** over, LOGIN_MAX_DELAY_MS) : 0;
  t.lockedUntil[i] = delay > 0 ? nowMs + delay : 0;
  if (t.expiresAt[i]! === 0) t.fp[i] = fp; // empty slot: this address becomes the holder
  t.expiresAt[i] = nowMs + LOGIN_RECORD_TTL_MS;
  return { allowed: true };
}

/** A successful login clears the history ONLY if this address holds the slot (fingerprint match). */
export function recordLoginSuccess(email: string): void {
  const t = login();
  const { slot: i, fp } = derive(email);
  if (t.expiresAt[i]! === 0 || t.fp[i]! !== fp) return;
  t.count[i] = 0;
  t.lockedUntil[i] = 0;
  t.expiresAt[i] = 0;
}

/** Count a forgot-password request for this address. allowed:false => caller silently skips the send. */
export function checkForgotPasswordThrottle(email: string, nowMs: number): { allowed: boolean } {
  const t = forgot();
  const i = accountSlot(email);
  if (t.resetAt[i]! < nowMs) {
    t.count[i] = 1;
    t.resetAt[i] = nowMs + FORGOT_WINDOW_MS;
    return { allowed: true };
  }
  if (t.count[i]! >= FORGOT_MAX) return { allowed: false };
  t.count[i] = t.count[i]! + 1;
  return { allowed: true };
}

/** Test-only. */
export function resetAccountThrottles(): void {
  loginTable?.count.fill(0);
  loginTable?.lockedUntil.fill(0);
  loginTable?.expiresAt.fill(0);
  loginTable?.fp.fill(0);
  forgotTable?.count.fill(0);
  forgotTable?.resetAt.fill(0);
}
