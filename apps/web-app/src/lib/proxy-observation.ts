/**
 * Observes the SHAPE of inbound `x-forwarded-for` headers, so the number of
 * reverse proxies in front of this app can be measured rather than guessed.
 *
 * Why this exists: the auth rate limits on login, signup and password reset key
 * on the client IP, and `getClientIp` currently takes the FIRST entry of
 * `x-forwarded-for` — which is whatever the caller sent, making those limits
 * bypassable by rotating a header. The fix is to count from the right instead,
 * which requires knowing how many hops to trust. `compose.hostinger.yaml` shows
 * the reverse proxy is external and provisioned by the host, so that number is
 * not knowable from this repository — and guessing it too LOW collapses every
 * user behind that proxy into one rate-limit bucket and locks everybody out of
 * login (see the direction table below; an earlier version of this comment had
 * that backwards).
 *
 * So: measure it. This records how many comma-separated entries each inbound
 * header carried, and nothing else.
 *
 * **No address is stored, logged, or returned — only counts.** The entry count
 * is not personal data and cannot be reversed into one.
 *
 * ## Reading the result
 *
 * With D appending proxies in front, an honest request (one that sends no
 * `x-forwarded-for` of its own) arrives carrying exactly D entries, with the
 * real client at index 0. `getClientIp` selects `entries[len - hops]`, so the
 * correct setting is **hops = D**, i.e. the entry count honest traffic carries.
 *
 * **Appending is a convention, not a guarantee.** nginx with `$remote_addr`,
 * Traefik without `trustedIPs`, Envoy with `skip_xff_append` and Caddy with
 * `header_up` all REPLACE instead. A replacing OUTERMOST proxy is harmless
 * here — it simply yields a one-entry header. A replacing INNER proxy discards
 * the client address altogether, and no value of `TRUSTED_PROXY_HOPS` recovers
 * it; the tell is a dominant shape stuck at 1 while the deployment plainly has
 * more hops than that.
 *
 * ## Which way is dangerous — corrected at loop 54
 *
 * An earlier version of this file claimed the minimum was "safe from below"
 * because guessing HIGH causes an outage. **That is backwards**, and the
 * arithmetic is worth stating rather than asserting:
 *
 *   hops = D  → selects the client. Correct.
 *   hops < D  → selects a PROXY's address. Every user behind that proxy
 *               resolves to the same value, collapsing them into one
 *               rate-limit bucket: one person's failed logins lock out
 *               everybody. **This is the outage.**
 *   hops > D  → index goes negative and clamps to 0, which is the client for
 *               honest traffic and the spoofed entry for a forged header.
 *               Reintroduces spoofability; does NOT cause an outage.
 *
 * So the dangerous direction is UNDER-setting, and any estimator here must not
 * under-report. The minimum does exactly that when some traffic reaches the app
 * without traversing the full proxy chain — the container port is published in
 * `compose.hostinger.yaml`, so direct-to-container requests are possible, and a
 * single such request carrying a one-entry header would drag a minimum-based
 * estimate below D and produce the lockout.
 *
 * Therefore this reports the **mode** — the entry count the bulk of traffic
 * carries — and withholds a suggestion entirely when no single shape dominates,
 * because a split distribution is exactly the signal that something is reaching
 * the app by more than one path.
 */

import { getTrustedProxyHops } from './client-ip.js';

/** A single observed header shape. */
export interface ProxyChainObservation {
  /** Number of comma-separated entries in `x-forwarded-for`. 0 = header absent. */
  readonly entryCount: number;
  /** How many requests carried that shape since this process started. */
  readonly requests: number;
}

export interface ProxyChainSection {
  readonly observations: readonly ProxyChainObservation[];
  readonly totalRequests: number;
  /**
   * The entry count carried by the LARGEST share of header-bearing requests,
   * or null if none have arrived. This — not the minimum — is the estimate of
   * proxy depth; see the correction note above for why.
   */
  readonly dominantEntryCount: number | null;
  /** Fraction of header-bearing requests carrying `dominantEntryCount`, 0–1. */
  readonly dominantShare: number;
  /**
   * Whether one shape clearly dominates. False means requests are arriving by
   * more than one path, and no single hop count describes them all.
   */
  readonly shapesAgree: boolean;
  /**
   * Whether the dominant shape was observed on enough requests to act on, AND
   * dominates clearly enough. False means "keep collecting" or "traffic is
   * arriving by more than one route", not "the number is wrong".
   */
  readonly honestSampleLikely: boolean;
  /**
   * The value to set `TRUSTED_PROXY_HOPS` to, or null while the evidence is
   * too thin. Advisory only — nothing reads this to change behaviour.
   */
  readonly suggestedTrustedProxyHops: number | null;
  /** What `TRUSTED_PROXY_HOPS` is set to right now. */
  readonly configuredTrustedProxyHops: number;
}

/**
 * Absurd header lengths must not grow this map without bound — a caller can
 * send a thousand commas. Anything longer is bucketed at the cap.
 */
const MAX_TRACKED_ENTRY_COUNT = 16;

/**
 * How many requests must share the dominant shape before it is worth acting on.
 * Low on purpose: the goal is to replace a guess with evidence, not to reach
 * statistical significance.
 */
const HONEST_SAMPLE_THRESHOLD = 20;

/**
 * How dominant the leading shape must be before it is worth acting on. A split
 * distribution means traffic is reaching the app by more than one route, and
 * the wrong choice between them is the lockout described above.
 */
const DOMINANT_SHARE_THRESHOLD = 0.9;

/**
 * Per-process, in-memory, and deliberately not persisted.
 *
 * Consequence worth knowing before acting on the numbers: if the app ever runs
 * more than one worker or replica, `/api/admin/operations` reports the slice
 * belonging to whichever process served that request, not the whole fleet. The
 * SHAPE of the distribution is what matters and does not change between
 * workers, so the suggested value stays correct — but `totalRequests` will read
 * low, and a redeploy resets everything to zero.
 */
const counts = new Map<number, number>();

/**
 * Record one observation. Called from `getClientIp` on every request that
 * derives an address; must stay trivially cheap and must never throw.
 */
export function recordForwardedForShape(entryCount: number): void {
  if (!Number.isInteger(entryCount) || entryCount < 0) return;
  const key = Math.min(entryCount, MAX_TRACKED_ENTRY_COUNT);
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

/** Test-only reset. Module state is per-process and intentionally not persisted. */
export function resetProxyChainObservations(): void {
  counts.clear();
}


export function getProxyChainObservations(): ProxyChainSection {
  const observations: ProxyChainObservation[] = [...counts.entries()]
    .map(([entryCount, requests]) => ({ entryCount, requests }))
    .sort((a, b) => a.entryCount - b.entryCount);

  const totalRequests = observations.reduce((sum, o) => sum + o.requests, 0);

  // Entry count 0 means no header at all — a health check, an internal call, or
  // a direct hit on the published container port. It says nothing about proxy
  // depth and must not influence the estimate.
  const withHeader = observations.filter((o) => o.entryCount > 0);
  const headerRequests = withHeader.reduce((sum, o) => sum + o.requests, 0);

  const dominant = withHeader.reduce<ProxyChainObservation | null>(
    (best, o) => (best === null || o.requests > best.requests ? o : best),
    null,
  );

  const dominantShare = dominant !== null && headerRequests > 0
    ? dominant.requests / headerRequests
    : 0;

  // Two independent conditions, both required. Volume alone is not enough: a
  // split distribution means requests are arriving by more than one path, and
  // guessing which is authoritative is precisely the mistake that locks users
  // out. Better to report "keep collecting" than to suggest a number that
  // might be low.
  const enoughVolume = dominant !== null && dominant.requests >= HONEST_SAMPLE_THRESHOLD;
  const shapesAgree = dominantShare >= DOMINANT_SHARE_THRESHOLD;
  const confident = enoughVolume && shapesAgree;

  return {
    observations,
    totalRequests,
    dominantEntryCount: dominant?.entryCount ?? null,
    dominantShare,
    shapesAgree,
    honestSampleLikely: confident,
    suggestedTrustedProxyHops: confident ? (dominant?.entryCount ?? null) : null,
    configuredTrustedProxyHops: getTrustedProxyHops(),
  };
}
