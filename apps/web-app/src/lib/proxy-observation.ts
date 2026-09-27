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
 * not knowable from this repository, and guessing high would collapse every
 * user into one rate-limit bucket and lock everybody out of login.
 *
 * So: measure it. This records how many comma-separated entries each inbound
 * header carried, and nothing else.
 *
 * **No address is stored, logged, or returned — only counts.** The entry count
 * is not personal data and cannot be reversed into one.
 *
 * ## Reading the result
 *
 * A client that sends no `x-forwarded-for` of its own produces a header written
 * entirely by our own infrastructure, so its length equals the number of proxies
 * that appended to it. A client that spoofs the header inflates the length.
 * Proxies append, they do not remove — so:
 *
 *   **the MINIMUM observed length is a lower bound on the number of trusted
 *   hops**, and with any honest traffic at all it is the exact number.
 *
 * That is an inference, not a proof: if literally every request carried a
 * spoofed header, the minimum would overstate. `honestSampleLikely` flags
 * whether the minimum was seen often enough to rely on.
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
   * Lowest non-zero entry count seen, or null if no request has carried the
   * header. This is the lower bound on trusted hops described above.
   */
  readonly minEntryCount: number | null;
  /**
   * Whether the minimum was observed on enough requests to act on. False means
   * "keep collecting", not "the number is wrong".
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
 * How many requests must share the minimum before it is worth acting on. Low
 * on purpose: the goal is to replace a guess with evidence, not to reach
 * statistical significance.
 */
const HONEST_SAMPLE_THRESHOLD = 20;

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

  // Entry count 0 means the header was absent entirely, which says nothing
  // about proxy depth, so it is excluded from the minimum.
  const withHeader = observations.filter((o) => o.entryCount > 0);
  const minObservation = withHeader[0] ?? null;
  const minEntryCount = minObservation?.entryCount ?? null;
  const honestSampleLikely =
    minObservation !== null && minObservation.requests >= HONEST_SAMPLE_THRESHOLD;

  return {
    observations,
    totalRequests,
    minEntryCount,
    honestSampleLikely,
    suggestedTrustedProxyHops: honestSampleLikely ? minEntryCount : null,
    configuredTrustedProxyHops: getTrustedProxyHops(),
  };
}
