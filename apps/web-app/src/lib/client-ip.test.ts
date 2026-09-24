import { describe, it, expect, afterEach } from 'vitest';
import { getClientIp, type ClientIpRequestLike } from './client-ip';

/** Builds a minimal request-like object with the given headers. */
function makeReq(headers: Record<string, string>): ClientIpRequestLike {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  };
}

const ORIGINAL_TRUSTED_PROXY_HOPS = process.env.TRUSTED_PROXY_HOPS;

afterEach(() => {
  if (ORIGINAL_TRUSTED_PROXY_HOPS === undefined) {
    delete process.env.TRUSTED_PROXY_HOPS;
  } else {
    process.env.TRUSTED_PROXY_HOPS = ORIGINAL_TRUSTED_PROXY_HOPS;
  }
});

describe('getClientIp', () => {
  describe('default behavior (TRUSTED_PROXY_HOPS unset — 0 trusted hops)', () => {
    it('returns the single entry when x-forwarded-for has exactly one', () => {
      const req = makeReq({ 'x-forwarded-for': '203.0.113.7' });
      expect(getClientIp(req)).toBe('203.0.113.7');
    });

    it('returns the FIRST entry (today\'s spoofable behavior, unchanged) for a multi-entry list', () => {
      const req = makeReq({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1, 10.0.0.2' });
      expect(getClientIp(req)).toBe('1.2.3.4');
    });

    it('trims whitespace around entries', () => {
      const req = makeReq({ 'x-forwarded-for': '  198.51.100.9  ,  10.0.0.1  ' });
      expect(getClientIp(req)).toBe('198.51.100.9');
    });

    it('handles IPv6 entries', () => {
      const req = makeReq({ 'x-forwarded-for': '2001:db8::1, 10.0.0.1' });
      expect(getClientIp(req)).toBe('2001:db8::1');
    });

    it('falls back to x-real-ip when x-forwarded-for is absent', () => {
      const req = makeReq({ 'x-real-ip': '192.0.2.55' });
      expect(getClientIp(req)).toBe('192.0.2.55');
    });

    it('falls back to x-real-ip when x-forwarded-for is empty/blank', () => {
      const req = makeReq({ 'x-forwarded-for': '   ', 'x-real-ip': '192.0.2.66' });
      expect(getClientIp(req)).toBe('192.0.2.66');
    });

    it('falls back to x-real-ip when x-forwarded-for contains only empty entries', () => {
      const req = makeReq({ 'x-forwarded-for': ' , , ', 'x-real-ip': '192.0.2.77' });
      expect(getClientIp(req)).toBe('192.0.2.77');
    });

    it('returns "unknown" when both headers are absent', () => {
      const req = makeReq({});
      expect(getClientIp(req)).toBe('unknown');
    });

    it('returns "unknown" when both headers are absent or blank', () => {
      const req = makeReq({ 'x-forwarded-for': '', 'x-real-ip': '   ' });
      expect(getClientIp(req)).toBe('unknown');
    });
  });

  describe('spoofed leading entry with TRUSTED_PROXY_HOPS configured', () => {
    it('hops=1: returns the LAST entry (the nearest trusted proxy appended it), ignoring a spoofed leading entry', () => {
      process.env.TRUSTED_PROXY_HOPS = '1';
      // Attacker sets a fake leading entry; the real proxy appends the real client IP.
      const req = makeReq({ 'x-forwarded-for': '9.9.9.9, 203.0.113.42' });
      expect(getClientIp(req)).toBe('203.0.113.42');
    });

    it('hops=2: returns the entry two positions in from the end', () => {
      process.env.TRUSTED_PROXY_HOPS = '2';
      const req = makeReq({ 'x-forwarded-for': '9.9.9.9, 203.0.113.42, 10.0.0.5, 10.0.0.6' });
      // len=4, index = len - hops = 2 -> '10.0.0.5'
      expect(getClientIp(req)).toBe('10.0.0.5');
    });

    it('hops greater than entry count clamps to the first entry rather than returning undefined', () => {
      process.env.TRUSTED_PROXY_HOPS = '5';
      const req = makeReq({ 'x-forwarded-for': '9.9.9.9, 203.0.113.42' });
      expect(getClientIp(req)).toBe('9.9.9.9');
    });

    it('hops exactly equal to entry count resolves to the first entry (index 0)', () => {
      process.env.TRUSTED_PROXY_HOPS = '2';
      const req = makeReq({ 'x-forwarded-for': '9.9.9.9, 203.0.113.42' });
      expect(getClientIp(req)).toBe('9.9.9.9');
    });

    it('hops configured but x-forwarded-for absent still falls back to x-real-ip', () => {
      process.env.TRUSTED_PROXY_HOPS = '1';
      const req = makeReq({ 'x-real-ip': '192.0.2.88' });
      expect(getClientIp(req)).toBe('192.0.2.88');
    });
  });

  describe('TRUSTED_PROXY_HOPS parsing edge cases (all behave as 0)', () => {
    it('unset behaves as 0', () => {
      delete process.env.TRUSTED_PROXY_HOPS;
      const req = makeReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
      expect(getClientIp(req)).toBe('1.2.3.4');
    });

    it('blank string behaves as 0', () => {
      process.env.TRUSTED_PROXY_HOPS = '   ';
      const req = makeReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
      expect(getClientIp(req)).toBe('1.2.3.4');
    });

    it('non-numeric string behaves as 0', () => {
      process.env.TRUSTED_PROXY_HOPS = 'not-a-number';
      const req = makeReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
      expect(getClientIp(req)).toBe('1.2.3.4');
    });

    it('negative number behaves as 0', () => {
      process.env.TRUSTED_PROXY_HOPS = '-1';
      const req = makeReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
      expect(getClientIp(req)).toBe('1.2.3.4');
    });

    it('non-integer number behaves as 0', () => {
      process.env.TRUSTED_PROXY_HOPS = '1.5';
      const req = makeReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
      expect(getClientIp(req)).toBe('1.2.3.4');
    });

    it('"0" explicitly behaves as 0', () => {
      process.env.TRUSTED_PROXY_HOPS = '0';
      const req = makeReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
      expect(getClientIp(req)).toBe('1.2.3.4');
    });
  });

  describe('never throws on missing request shape (NextAuth authorize() call sites)', () => {
    it('req undefined returns "unknown"', () => {
      expect(getClientIp(undefined)).toBe('unknown');
    });

    it('req null returns "unknown"', () => {
      expect(getClientIp(null)).toBe('unknown');
    });

    it('req.headers undefined returns "unknown"', () => {
      expect(getClientIp({})).toBe('unknown');
    });

    it('req.headers.get undefined returns "unknown"', () => {
      expect(getClientIp({ headers: {} })).toBe('unknown');
    });
  });
});
