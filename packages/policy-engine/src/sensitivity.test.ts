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

    it('does NOT match space-separated "Social Security Number" (known limitation — tracked debt)', () => {
      // The pattern social[_-]?security requires _ or - separator, not space.
      // This is intentional for now: labels from DOM are usually attribute values
      // (e.g. aria-label="ssn") not human-readable sentences.
      const result = classifySensitivity(undefined, undefined, 'Social Security Number');
      expect(result.isSensitive).toBe(false);
    });

    it('does NOT match space-separated "API Key" (known limitation — tracked debt)', () => {
      const result = classifySensitivity(undefined, undefined, 'API Key');
      expect(result.isSensitive).toBe(false);
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
      // tax[_-]?id matches "tax_id" but not "Tax ID" (space not covered by [_-]?)
      const result = classifySensitivity(undefined, 'input#field-01', 'tax_id');
      expect(result.isSensitive).toBe(true);
      expect(result.sensitivityClass).toBe('government_id');
    });

    it('returns isSensitive: false when both selector and label are benign', () => {
      const result = classifySensitivity(undefined, '#search-box', 'Search');
      expect(result.isSensitive).toBe(false);
    });
  });
});

describe('SENSITIVE_INPUT_TYPES', () => {
  it('contains "password"', () => {
    expect(SENSITIVE_INPUT_TYPES.has('password')).toBe(true);
  });

  it('contains "email"', () => {
    expect(SENSITIVE_INPUT_TYPES.has('email')).toBe(true);
  });

  it('contains "tel"', () => {
    expect(SENSITIVE_INPUT_TYPES.has('tel')).toBe(true);
  });

  it('does not contain "text"', () => {
    expect(SENSITIVE_INPUT_TYPES.has('text')).toBe(false);
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
