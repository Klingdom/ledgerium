/** Row #362 — the one UTM sanitizer. Rejected values must come back null, never partial. */
import { describe, it, expect } from 'vitest';
import { sanitizeUtm, sanitizeFirstTouchRecord, UTM_MAX_LENGTH } from './utm-sanitize';

describe('sanitizeUtm: at-sign family is dropped entirely', () => {
  it.each([
    ['plain @', 'jane@example.com'],
    ['encoded %40', 'jane%40example.com'],
    ['lowercase hex', 'a%40b.com'],
    ['double-encoded %2540', 'a%2540b.com'],
    ['triple-encoded %252540', 'a%252540b.com'],
    ['fullwidth U+FF20', 'jane＠example.com'],
    ['small U+FE6B', 'jane﹫example.com'],
    ['fullwidth percent', 'a％４０b.com'],
    ['encoded fullwidth', 'a%EF%BC%A0b.com'],
    ['nesting deeper than the decode cap', 'a' + '%25'.repeat(6) + '40b'],
  ])('%s', (_label, input) => {
    expect(sanitizeUtm(input)).toBeNull();
  });

  it('still drops an address even when it sits past the cap', () => {
    expect(sanitizeUtm('c'.repeat(100) + '@x.co')).toBeNull();
  });
});

describe('sanitizeUtm: cap on a code-point boundary', () => {
  it('never ends in a lone surrogate and never exceeds 64 code points', () => {
    // 63 ASCII + emoji: the emoji straddles UTF-16 unit 64.
    const v = sanitizeUtm('a'.repeat(63) + '\u{1F600}\u{1F600}')!;
    expect(Array.from(v)).toHaveLength(UTM_MAX_LENGTH);
    expect(v.endsWith('\u{1F600}')).toBe(true);
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(v)).toBe(false);
  });
  it('caps long ASCII at 64', () => {
    expect(sanitizeUtm('x'.repeat(500))).toHaveLength(64);
  });
  it('removes lone surrogates from input', () => {
    expect(sanitizeUtm('ab\uD83D')).toBe('ab');
  });
});

describe('sanitizeUtm: robustness', () => {
  it('does not throw on malformed percent sequences', () => {
    expect(() => sanitizeUtm('%E0%A4%A')).not.toThrow();
    expect(sanitizeUtm('100%')).toBe('100%');
    expect(sanitizeUtm('%zz')).toBe('%zz');
  });
  it('strips control and format characters and trims', () => {
    expect(sanitizeUtm('  go\u0000o​gle\n\t ')).toBe('google');
    expect(sanitizeUtm('a%0Ab')).toBe('ab');
  });
  it('is null for null, undefined, blank and control-only', () => {
    expect(sanitizeUtm(null)).toBeNull();
    expect(sanitizeUtm(undefined)).toBeNull();
    expect(sanitizeUtm('   ')).toBeNull();
    expect(sanitizeUtm('\u0001\u0002')).toBeNull();
  });
  it('leaves benign values unchanged', () => {
    expect(sanitizeUtm('google')).toBe('google');
    expect(sanitizeUtm('spring_sale-2026')).toBe('spring_sale-2026');
  });
  it('is deterministic', () => {
    expect(sanitizeUtm('a%2540b')).toBe(sanitizeUtm('a%2540b'));
  });
});

describe('sanitizeFirstTouchRecord', () => {
  it('sanitizes utm_* keys, omits rejected ones, passes other strings, drops non-strings', () => {
    expect(
      sanitizeFirstTouchRecord({
        utm_source: 'google',
        utm_term: 'a%2540b.com',
        utm_content: 'x'.repeat(200),
        landing_path: '/pricing',
        n: 5,
      }),
    ).toEqual({ utm_source: 'google', utm_content: 'x'.repeat(64), landing_path: '/pricing' });
  });
});
