/**
 * Tests for canonicalHash — the order-stable canonical serializer + sha256
 * (ADR-001 Decision 2; feasibility R-3, the hidden non-determinism trap).
 */

import { describe, it, expect } from 'vitest';

import { canonicalSerialize, canonicalSha256 } from './canonicalHash';

describe('canonicalSerialize — order stability', () => {
  it('emits object keys in sorted order regardless of insertion order', () => {
    const a = canonicalSerialize({ b: 1, a: 2, c: 3 });
    const b = canonicalSerialize({ c: 3, a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1,"c":3}');
  });

  it('preserves array order (arrays are positional, not sorted)', () => {
    expect(canonicalSerialize([3, 1, 2])).toBe('[3,1,2]');
    expect(canonicalSerialize([1, 2, 3])).toBe('[1,2,3]');
  });

  it('omits undefined object values (absent ≡ explicit undefined)', () => {
    const withUndef = canonicalSerialize({ a: 1, b: undefined });
    const without = canonicalSerialize({ a: 1 });
    expect(withUndef).toBe(without);
    expect(withUndef).toBe('{"a":1}');
  });

  it('encodes undefined inside an array as null (positional)', () => {
    expect(canonicalSerialize([1, undefined as never, 3])).toBe('[1,null,3]');
  });
});

describe('canonicalSerialize — stable scalar formatting', () => {
  it('formats integers plainly', () => {
    expect(canonicalSerialize(4)).toBe('4');
    expect(canonicalSerialize(-2)).toBe('-2');
    expect(canonicalSerialize(0)).toBe('0');
  });

  it('formats non-integers with trimmed fixed precision', () => {
    expect(canonicalSerialize(0.5)).toBe('0.5');
    expect(canonicalSerialize(0.75)).toBe('0.75');
  });

  it('formats float noise to a stable string (0.1 + 0.2 ≡ 0.3)', () => {
    expect(canonicalSerialize(0.1 + 0.2)).toBe(canonicalSerialize(0.3));
  });

  it('encodes non-finite numbers as null (defensive)', () => {
    expect(canonicalSerialize(NaN)).toBe('null');
    expect(canonicalSerialize(Infinity)).toBe('null');
  });

  it('escapes strings unambiguously', () => {
    expect(canonicalSerialize('a"b')).toBe('"a\\"b"');
    expect(canonicalSerialize(null)).toBe('null');
    expect(canonicalSerialize(true)).toBe('true');
  });
});

describe('canonicalSha256', () => {
  it('returns a sha256:<hex> string', () => {
    const h = canonicalSha256({ a: 1 });
    expect(h).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('is identical for key-reordered equivalent objects', () => {
    expect(canonicalSha256({ a: 1, b: 2 })).toBe(canonicalSha256({ b: 2, a: 1 }));
  });

  it('differs for different values', () => {
    expect(canonicalSha256({ a: 1 })).not.toBe(canonicalSha256({ a: 2 }));
  });

  it('pins the hash of a fixed literal (serializer drift guard)', () => {
    // canonical form is {"x":1,"y":"z"}; sha256 of that exact byte string.
    expect(canonicalSha256({ x: 1, y: 'z' })).toBe(
      'sha256:36f1a5a060ee20d292cd972679b57548294b54c9c8eb485e01b7b4b00244517c',
    );
  });
});
