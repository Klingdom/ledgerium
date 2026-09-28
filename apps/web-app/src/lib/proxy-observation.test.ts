/**
 * proxy-observation — the measurement that replaces a guess.
 *
 * The property that matters most is the one asserted last: this records header
 * SHAPE and never an address. If that ever stops being true, the module has
 * turned into an IP log.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  recordForwardedForShape,
  getProxyChainObservations,
  resetProxyChainObservations,
} from './proxy-observation.js';

const ORIGINAL_HOPS = process.env.TRUSTED_PROXY_HOPS;

beforeEach(() => {
  resetProxyChainObservations();
  delete process.env.TRUSTED_PROXY_HOPS;
});

afterEach(() => {
  if (ORIGINAL_HOPS === undefined) delete process.env.TRUSTED_PROXY_HOPS;
  else process.env.TRUSTED_PROXY_HOPS = ORIGINAL_HOPS;
});

describe('recording observations', () => {
  it('starts empty', () => {
    const s = getProxyChainObservations();
    expect(s.observations).toEqual([]);
    expect(s.totalRequests).toBe(0);
    expect(s.dominantEntryCount).toBeNull();
    expect(s.dominantShare).toBe(0);
    expect(s.shapesAgree).toBe(false);
    expect(s.suggestedTrustedProxyHops).toBeNull();
  });

  it('counts requests per shape and sorts by entry count', () => {
    recordForwardedForShape(2);
    recordForwardedForShape(1);
    recordForwardedForShape(2);
    const s = getProxyChainObservations();
    expect(s.observations).toEqual([
      { entryCount: 1, requests: 1 },
      { entryCount: 2, requests: 2 },
    ]);
    expect(s.totalRequests).toBe(3);
  });

  it('caps absurd lengths rather than growing without bound', () => {
    // A caller can send a thousand commas; that must not become a thousand keys.
    for (const n of [50, 200, 9999]) recordForwardedForShape(n);
    const s = getProxyChainObservations();
    expect(s.observations).toEqual([{ entryCount: 16, requests: 3 }]);
  });

  it('ignores nonsense input without throwing', () => {
    for (const bad of [-1, 1.5, NaN, Infinity]) recordForwardedForShape(bad);
    expect(getProxyChainObservations().totalRequests).toBe(0);
  });
});

describe('inferring the trusted-hop count', () => {
  // Corrected at loop 54. The original used the MINIMUM observed length on the
  // reasoning that "proxies append and never remove, so the minimum is safe
  // from below". The arithmetic in getClientIp says the opposite matters:
  //   hops = D  -> selects the client (correct)
  //   hops < D  -> selects a proxy address; ALL users collapse into one
  //                rate-limit bucket and logins lock out. This is the outage.
  //   hops > D  -> clamps to index 0; spoofable, but no outage.
  // So under-reporting is the dangerous direction, and the minimum
  // under-reports the moment any request skips part of the chain.

  it('excludes header-absent requests, which say nothing about depth', () => {
    for (let i = 0; i < 50; i++) recordForwardedForShape(0);
    for (let i = 0; i < 30; i++) recordForwardedForShape(2);
    const s = getProxyChainObservations();
    expect(s.dominantEntryCount).toBe(2);
    expect(s.suggestedTrustedProxyHops).toBe(2);
  });

  it('is NOT dragged down by a few requests that skipped the proxy', () => {
    // The container port is published in compose.hostinger.yaml, so a request
    // can reach the app directly carrying its own one-entry header. Under the
    // old minimum-based rule this suggested 1 against a true depth of 2 —
    // precisely the setting that locks every user out.
    for (let i = 0; i < 500; i++) recordForwardedForShape(2);
    for (let i = 0; i < 3; i++) recordForwardedForShape(1);
    const s = getProxyChainObservations();
    expect(s.dominantEntryCount).toBe(2);
    expect(s.suggestedTrustedProxyHops).toBe(2);
  });

  it('withholds a suggestion when no single shape dominates', () => {
    // A split distribution means traffic is arriving by more than one route.
    // Guessing which is authoritative is the mistake; say "keep collecting".
    for (let i = 0; i < 100; i++) recordForwardedForShape(1);
    for (let i = 0; i < 90; i++) recordForwardedForShape(2);
    const s = getProxyChainObservations();
    expect(s.shapesAgree).toBe(false);
    expect(s.suggestedTrustedProxyHops).toBeNull();
    expect(s.dominantEntryCount).toBe(1); // still reported, just not suggested
  });

  it('withholds a suggestion until the volume is there', () => {
    for (let i = 0; i < 5; i++) recordForwardedForShape(1);
    const s = getProxyChainObservations();
    expect(s.shapesAgree).toBe(true);
    expect(s.honestSampleLikely).toBe(false);
    expect(s.suggestedTrustedProxyHops).toBeNull();
  });

  it('suggests the dominant shape once volume and agreement both hold', () => {
    for (let i = 0; i < 200; i++) recordForwardedForShape(1);
    for (let i = 0; i < 5; i++) recordForwardedForShape(4); // spoofed, inflated
    const s = getProxyChainObservations();
    expect(s.honestSampleLikely).toBe(true);
    expect(s.dominantShare).toBeGreaterThan(0.9);
    expect(s.suggestedTrustedProxyHops).toBe(1);
  });

  it('spoofed long chains cannot pull the suggestion upward either', () => {
    for (let i = 0; i < 300; i++) recordForwardedForShape(2);
    for (const n of [6, 9, 16]) recordForwardedForShape(n);
    expect(getProxyChainObservations().suggestedTrustedProxyHops).toBe(2);
  });
});

describe('reporting the live configuration alongside the evidence', () => {
  it('reports 0 when TRUSTED_PROXY_HOPS is unset', () => {
    expect(getProxyChainObservations().configuredTrustedProxyHops).toBe(0);
  });

  it('reports the configured value when set', () => {
    process.env.TRUSTED_PROXY_HOPS = '2';
    expect(getProxyChainObservations().configuredTrustedProxyHops).toBe(2);
  });

  it('treats invalid configuration as 0, matching getClientIp', () => {
    for (const bad of ['', '  ', 'two', '-1', '1.5']) {
      process.env.TRUSTED_PROXY_HOPS = bad;
      expect(getProxyChainObservations().configuredTrustedProxyHops).toBe(0);
    }
  });

  it('surfaces the gap between what is observed and what is configured', () => {
    // This is the whole point: evidence says 1 hop, config still trusts none.
    for (let i = 0; i < 25; i++) recordForwardedForShape(1);
    const s = getProxyChainObservations();
    expect(s.suggestedTrustedProxyHops).toBe(1);
    expect(s.configuredTrustedProxyHops).toBe(0);
  });
});

describe('it records shape, never an address', () => {
  it('the section contains no string values at all', () => {
    recordForwardedForShape(1);
    recordForwardedForShape(3);
    const serialized = JSON.stringify(getProxyChainObservations());
    // Every leaf is a number or boolean. An IP would have to arrive as a
    // string, so the absence of strings is a structural guarantee.
    expect(serialized).not.toMatch(/"[^"]*\d+\.\d+\.\d+\.\d+/);
    expect(serialized).not.toMatch(/:\s*"/);
  });

  it('the recording function cannot accept an address — it takes a count', () => {
    // Type-level in TS; asserted here so a future signature change that widens
    // this to a string is caught as a behaviour change, not just a type edit.
    // @ts-expect-error passing an address must not type-check
    recordForwardedForShape('203.0.113.7');
    expect(getProxyChainObservations().totalRequests).toBe(0);
  });
});
