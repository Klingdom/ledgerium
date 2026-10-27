import { describe, it, expect } from 'vitest';
import { classifySensitivity, SENSITIVE_INPUT_TYPES, SENSITIVE_SELECTOR_PATTERNS } from './sensitivity.js';

describe('classifySensitivity', () => {
  describe('password inputType — highest priority', () => {
    it('returns isSensitive: true and sensitivityClass: "password" for inputType "password"', () => {
      const result = classifySensitivity('password');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('password');
    });

    it('password inputType takes priority over an unrelated selector', () => {
      const result = classifySensitivity('password', 'username-field', 'Username');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('password');
    });
  });

  describe('email inputType — PII, not blocking', () => {
    it('returns isSensitive: false with sensitivityClass: "pii" for inputType "email"', () => {
      const result = classifySensitivity('email');
      expect(result.isSensitive).toBe(false);
      expect(result.sensitivityClass).toBe('pii');
    });
  });

  describe('tel inputType — PII, not blocking', () => {
    it('returns isSensitive: false with sensitivityClass: "pii" for inputType "tel"', () => {
      const result = classifySensitivity('tel');
      expect(result.isSensitive).toBe(false);
      expect(result.sensitivityClass).toBe('pii');
    });
  });

  describe('selector patterns', () => {
    it('returns isSensitive: true when selector contains "ssn"', () => {
      const result = classifySensitivity(undefined, 'input#ssn-field');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('government_id');
    });

    it('returns isSensitive: true when selector contains "credit"', () => {
      const result = classifySensitivity(undefined, 'input.credit_card_number');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('payment');
    });

    it('returns isSensitive: true when selector contains "api_key"', () => {
      const result = classifySensitivity(undefined, 'input#api_key');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('password');
    });

    it('returns isSensitive: true when selector contains "token"', () => {
      const result = classifySensitivity(undefined, 'input[name="token"]');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('password');
    });

    it('returns isSensitive: true when selector contains "secret"', () => {
      const result = classifySensitivity(undefined, 'input.secret-value');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('password');
    });

    it('returns isSensitive: true when selector contains "cvv"', () => {
      const result = classifySensitivity(undefined, '#cvv-input');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('payment');
    });
  });

  describe('label patterns', () => {
    // NOTE: Patterns use [_-]? separators — space-separated labels like
    // "Social Security Number" do NOT match. This is a known limitation
    // tracked as technical debt: sensitivity patterns should be extended
    // to handle space-separated human-readable labels.

    it('returns isSensitive: true for label "social_security"', () => {
      const result = classifySensitivity(undefined, undefined, 'social_security');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('government_id');
    });

    it('returns isSensitive: true for label "CVV"', () => {
      const result = classifySensitivity(undefined, undefined, 'CVV');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('payment');
    });

    it('returns isSensitive: true for label "api_key"', () => {
      const result = classifySensitivity(undefined, undefined, 'api_key');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('password');
    });

    // Gap closed loop 221: these were pinned here as "known limitation"; the
    // label is how the field is named on screen, so a space must match.
    it('matches space-separated "Social Security Number" (gap closed loop 221)', () => {
      const result = classifySensitivity(undefined, undefined, 'Social Security Number');
      expect(result).toEqual({ isSensitive: true, sensitivityClass: 'government_id' });
    });

    it('matches space-separated "API Key" (gap closed loop 221)', () => {
      const result = classifySensitivity(undefined, undefined, 'API Key');
      expect(result).toEqual({ isSensitive: true, sensitivityClass: 'password' });
    });
  });

  describe('non-sensitive inputs', () => {
    it('returns isSensitive: false when all arguments are undefined', () => {
      const result = classifySensitivity(undefined, undefined, undefined);
      expect(result.isSensitive).toBe(false);
      expect(result.sensitivityClass).toBeUndefined();
    });

    it('returns isSensitive: false for plain selector "username"', () => {
      const result = classifySensitivity(undefined, 'input#username', 'Username');
      expect(result.isSensitive).toBe(false);
    });

    it('returns isSensitive: false for inputType "text" with benign selector', () => {
      const result = classifySensitivity('text', 'input#first-name', 'First Name');
      expect(result.isSensitive).toBe(false);
    });

    it('returns isSensitive: false for inputType "number" with benign selector', () => {
      const result = classifySensitivity('number', '#quantity', 'Quantity');
      expect(result.isSensitive).toBe(false);
    });
  });

  describe('case insensitivity', () => {
    it('detects "SSN" (uppercase) in selector', () => {
      const result = classifySensitivity(undefined, 'input#SSN');
      expect(result.isSensitive).toBe(true);
    });

    it('detects "PASSWORD" (uppercase) in selector', () => {
      const result = classifySensitivity(undefined, 'input#PASSWORD');
      expect(result.isSensitive).toBe(true);
    });

    it('detects "Credit_Card" (mixed case) in selector', () => {
      const result = classifySensitivity(undefined, 'input.Credit_Card');
      expect(result.isSensitive).toBe(true);
    });

    it('detects "social_security" (lowercase) in label', () => {
      const result = classifySensitivity(undefined, undefined, 'social_security');
      expect(result.isSensitive).toBe(true);
    });
  });

  describe('combined selector and label', () => {
    it('detects sensitivity when only label contains underscore-separated sensitive pattern', () => {
      // A label alone is enough to flag the field (spaced labels: loop 221 block below)
      const result = classifySensitivity(undefined, 'input#field-01', 'tax_id');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('government_id');
    });

    it('returns isSensitive: false when both selector and label are benign', () => {
      const result = classifySensitivity(undefined, '#search-box', 'Search');
      expect(result.isSensitive).toBe(false);
    });
  });

  describe('widened credit_card separator coverage (iter-027)', () => {
    it('detects "credit card" (single space) in selector as payment', () => {
      const result = classifySensitivity(undefined, 'input[aria-label="credit card"]');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('payment');
    });

    it('detects "credit  card" (double space) in selector as payment', () => {
      const result = classifySensitivity(undefined, 'input[aria-label="credit  card"]');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('payment');
    });

    it('detects "Credit Card" (mixed case with space) in label as payment', () => {
      const result = classifySensitivity(undefined, undefined, 'Credit Card');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('payment');
    });

    it('detects "credit_-card" (mixed separators) in selector as payment', () => {
      const result = classifySensitivity(undefined, 'input.credit_-card');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('payment');
    });

    it('detects "credit\\tcard" (tab separator) in label as payment', () => {
      const result = classifySensitivity(undefined, undefined, 'credit\tcard');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('payment');
    });

    it('does NOT match "creditxcard" (non-separator character) — negative control', () => {
      const result = classifySensitivity(undefined, 'input.creditxcard', 'creditxcard');
      expect(result.isSensitive).toBe(false);
    });
  });
});

describe('SENSITIVE_INPUT_TYPES (row #218 — the set and the behaviour agree)', () => {
  // These replace four membership assertions that asserted nothing about
  // behaviour: the set was consulted by no production code, so "email is in the
  // set" was true while email inputs were classified NOT sensitive.

  it('every member is actually classified sensitive — drift lock', () => {
    for (const type of SENSITIVE_INPUT_TYPES) {
      expect(classifySensitivity(type).isSensitive, type).toBe(true);
    }
  });

  it('classifies hidden inputs as sensitive (was handled only at one call site)', () => {
    const result = classifySensitivity('hidden');
    expect(result.isSensitive).toBe(true);
    expect(result.sensitivityClass).toBe('custom');
  });

  it('keeps password as its own class, ahead of the generic set check', () => {
    expect(classifySensitivity('password')).toEqual({
      isSensitive: true,
      sensitivityClass: 'password',
    });
  });

  it('does NOT list email or tel — they are pii but deliberately not blocking', () => {
    expect(SENSITIVE_INPUT_TYPES.has('email')).toBe(false);
    expect(SENSITIVE_INPUT_TYPES.has('tel')).toBe(false);
    for (const type of ['email', 'tel']) {
      expect(classifySensitivity(type)).toEqual({ isSensitive: false, sensitivityClass: 'pii' });
    }
  });

  it('does NOT list ssn or credit-card — not HTML input types; caught by pattern instead', () => {
    expect(SENSITIVE_INPUT_TYPES.has('ssn')).toBe(false);
    expect(SENSITIVE_INPUT_TYPES.has('credit-card')).toBe(false);
    expect(classifySensitivity('text', 'input.ssn').isSensitive).toBe(true);
    expect(classifySensitivity('text', 'input.credit-card').isSensitive).toBe(true);
  });

  it('leaves ordinary text inputs alone', () => {
    expect(SENSITIVE_INPUT_TYPES.has('text')).toBe(false);
    expect(classifySensitivity('text').isSensitive).toBe(false);
  });
});

describe('SENSITIVE_SELECTOR_PATTERNS', () => {
  it('is a non-empty readonly array of RegExp', () => {
    expect(SENSITIVE_SELECTOR_PATTERNS.length).toBeGreaterThan(0);
    for (const pattern of SENSITIVE_SELECTOR_PATTERNS) {
      expect(pattern).toBeInstanceOf(RegExp);
    }
  });
});

/**
 * Loop 221. Every multi-word term must be caught however its words are
 * separated: a space (how labels are written: "Tax ID"), `_` or `-` (how ids
 * and names are written: `tax_id`), several of them, or none. Before loop 221
 * only "credit card" allowed a space, and "Taxpayer ID" matched nothing.
 *
 * Each case is checked twice: through `classifySensitivity` (what the
 * recorder and normalizer call) and against `SENSITIVE_SELECTOR_PATTERNS`
 * (what the policy rules and the decision engine's text redaction read).
 * The two hold separate copies of the expressions, so both must agree.
 */
describe('multi-word terms match with any separator (loop 221)', () => {
  const TERMS: ReadonlyArray<{ words: [string, string]; sensitivityClass: string }> = [
    { words: ['API', 'Key'], sensitivityClass: 'password' },
    { words: ['Credit', 'Card'], sensitivityClass: 'payment' },
    { words: ['Card', 'Number'], sensitivityClass: 'payment' },
    { words: ['Social', 'Security'], sensitivityClass: 'government_id' },
    { words: ['Tax', 'ID'], sensitivityClass: 'government_id' },
    { words: ['Taxpayer', 'ID'], sensitivityClass: 'government_id' },
    { words: ['Tax Payer', 'ID'], sensitivityClass: 'government_id' },
  ];
  const SEPARATORS = ['', ' ', '  ', '_', '-', ' - ', '\t'];

  for (const { words, sensitivityClass } of TERMS) {
    for (const sep of SEPARATORS) {
      const text = `${words[0]}${sep}${words[1]}`;
      it(`${JSON.stringify(text)} as a label is ${sensitivityClass}`, () => {
        expect(classifySensitivity('text', '#field-01', text)).toEqual({ isSensitive: true, sensitivityClass });
        expect(SENSITIVE_SELECTOR_PATTERNS.some((p) => p.test(text))).toBe(true);
      });
      it(`${JSON.stringify(text.toLowerCase())} in a selector is ${sensitivityClass}`, () => {
        const selector = `input[name="${text.toLowerCase()}"]`;
        expect(classifySensitivity('text', selector)).toEqual({ isSensitive: true, sensitivityClass });
        expect(SENSITIVE_SELECTOR_PATTERNS.some((p) => p.test(selector))).toBe(true);
      });
    }
  }

  it('the labels HR forms use for these fields are flagged', () => {
    for (const label of ['Taxpayer ID', 'Taxpayer Identification Number', 'Tax Identification Number', 'Tax Payer ID', 'Tax ID Number', 'Social Security Number', 'Card Number']) {
      expect(classifySensitivity('text', '#field-01', label).isSensitive, label).toBe(true);
    }
  });

  it('neighbouring words that are not these terms stay unflagged', () => {
    for (const label of ['Tax rate', 'Taxonomy', 'Social media', 'Security question', 'Card holder', 'Phone number', 'Key results']) {
      expect(classifySensitivity('text', '#field-01', label), label).toEqual({ isSensitive: false });
      expect(SENSITIVE_SELECTOR_PATTERNS.some((p) => p.test(label)), label).toBe(false);
    }
  });

  it('no pattern in the list uses the narrow one-separator form', () => {
    for (const p of SENSITIVE_SELECTOR_PATTERNS) expect(p.source).not.toContain('[_-]?');
  });
});
