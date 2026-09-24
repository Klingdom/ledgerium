/**
 * getClientIp — centralized, spoof-aware client-IP derivation.
 *
 * BACKGROUND (backlog row #225): six call sites across the app each derived
 * the client IP by taking the FIRST entry of `x-forwarded-for` (XFF). Proxies
 * conventionally APPEND their own hop to XFF, so index [0] is whatever the
 * ORIGINAL CALLER supplied — an attacker can set an arbitrary
 * `x-forwarded-for: 1.2.3.4` header and every per-IP rate limit keyed on
 * "the first entry" (login, signup, forgot-password) becomes bypassable by
 * rotating that one header value per request.
 *
 * WHY THE DEFAULT DOES NOT SIMPLY SWITCH TO "THE LAST ENTRY": the correct fix
 * for a spoofable XFF is to count trusted hops from the END of the list (the
 * proxy nearest to this server is the most recently appended, rightmost,
 * entry) and take the entry exactly `N` hops in from the right, where `N` is
 * the number of trusted reverse proxies in front of this app. But this app's
 * reverse proxy is EXTERNAL and provisioned by the hosting platform
 * (see compose.hostinger.yaml) — the number of trusted hops is NOT knowable
 * from this repository. Guessing wrong in the "last entry" direction is worse
 * than the current bug: if the real hop count is 0 (no proxy appends, or the
 * proxy forwards XFF verbatim) but we assumed 1, every distinct user would
 * resolve to the value the proxy happens to put last — potentially the same
 * value for every request — collapsing all users into one rate-limit bucket
 * and throttling every login/signup for everyone. That is an availability
 * outage, strictly worse than today's spoofable-but-functional limiter.
 *
 * THE FIX SHIPPED HERE: behavior is UNCHANGED by default (`TRUSTED_PROXY_HOPS`
 * unset/blank/invalid → 0 trusted hops → first entry, exactly like every call
 * site before this change). The trusted-hop count is centralized behind one
 * environment variable so that once the Hostinger-provisioned proxy's exact
 * XFF-hop behavior is confirmed, flipping to the safe behavior is a one-line
 * config change (`TRUSTED_PROXY_HOPS=1` for a single reverse proxy in front
 * of the app) rather than a code change across six call sites.
 */

/**
 * Minimal shape this module needs from a request — deliberately looser than
 * `NextRequest` so it works against NextAuth's `request` parameter (which can
 * be `undefined` at some internal call sites) without importing next/server
 * here or forcing callers to pass a full NextRequest.
 */
export interface ClientIpRequestLike {
  headers?: {
    get?: (name: string) => string | null;
  };
}

/**
 * Parses `TRUSTED_PROXY_HOPS` into a non-negative integer.
 * Absent, blank, non-numeric, or negative → 0 (today's behavior: trust
 * nothing, take the first XFF entry).
 */
function getTrustedProxyHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS;
  if (raw === undefined) return 0;

  const trimmed = raw.trim();
  if (trimmed === '') return 0;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) return 0;

  return parsed;
}

/**
 * Splits a raw `x-forwarded-for` header value into trimmed, non-empty
 * entries, left-to-right (client-supplied first, nearest-proxy last).
 */
function parseForwardedForEntries(rawHeader: string): string[] {
  return rawHeader
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Resolves the client IP for rate-limiting and audit purposes.
 *
 * - `TRUSTED_PROXY_HOPS` unset/blank/invalid/negative → 0 → first XFF entry
 *   (today's behavior, unchanged; spoofable by design until the trusted hop
 *   count is confirmed and configured).
 * - `TRUSTED_PROXY_HOPS=N` (N > 0) → the entry `N` positions in from the END
 *   of the list (the value the Nth-from-last trusted proxy appended). If the
 *   list has fewer than `N` entries, clamps to the first entry rather than
 *   returning `undefined`.
 * - No `x-forwarded-for` header, or it parses to zero usable entries → falls
 *   back to `x-real-ip` (trimmed, non-empty), then to the literal
 *   `'unknown'`.
 * - Never throws: `req`, `req.headers`, and `req.headers.get` may all be
 *   absent (NextAuth's `authorize(credentials, request)` can invoke this
 *   without a request in some internal call paths) — every access is
 *   optional-chained.
 */
export function getClientIp(req: ClientIpRequestLike | null | undefined): string {
  const xffRaw = req?.headers?.get?.('x-forwarded-for');
  const entries = xffRaw ? parseForwardedForEntries(xffRaw) : [];

  if (entries.length > 0) {
    const hops = getTrustedProxyHops();

    if (hops === 0) {
      // Default, unchanged behavior: first entry (the original caller).
      return entries[0] as string;
    }

    // Take the entry `hops` positions in from the end. Clamp to the first
    // entry (rather than returning undefined) if there are fewer entries
    // than trusted hops — e.g. a request that never actually passed through
    // all N configured proxies.
    const indexFromStart = entries.length - hops;
    const clampedIndex = indexFromStart >= 0 ? indexFromStart : 0;
    return entries[clampedIndex] as string;
  }

  const realIp = req?.headers?.get?.('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}
