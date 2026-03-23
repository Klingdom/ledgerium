// Inlined from @ledgerium/shared-types to avoid circular dep before workspace linking
type SensitivityClass =
  | 'password'
  | 'payment'
  | 'pii'
  | 'health'
  | 'government_id'
  | 'hr'
  | 'legal'
  | 'api_key'
  | 'custom';

export const SENSITIVE_INPUT_TYPES: ReadonlySet<string> = new Set([
  'password',
  'hidden',
  'email',
  'tel',
  'ssn',
  'credit-card',
]);

export const SENSITIVE_SELECTOR_PATTERNS: readonly RegExp[] = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /ssn/i,
  /social[_-]?security/i,
  /tax[_-]?id/i,
] as const;

type ClassificationResult = {
  isSensitive: boolean;
  sensitivityClass?: SensitivityClass;
};

function matchesAny(value: string, patterns: readonly RegExp[]): RegExp | undefined {
  return patterns.find((p) => p.test(value));
}

export function classifySensitivity(
  inputType?: string,
  selector?: string,
  label?: string,
): ClassificationResult {
  // Explicit password input type — highest priority
  if (inputType === 'password') {
    return { isSensitive: true, sensitivityClass: 'password' };
  }

  // Check combined selector + label text for sensitive patterns
  const combined = [selector ?? '', label ?? ''].join(' ').trim();

  if (combined.length > 0) {
    // Password / secret / token / api_key patterns
    if (
      /password/i.test(combined) ||
      /passwd/i.test(combined) ||
      /secret/i.test(combined) ||
      /token/i.test(combined) ||
      /api[_-]?key/i.test(combined)
    ) {
      return { isSensitive: true, sensitivityClass: 'password' };
    }

    // Payment patterns
    if (
      /credit[_-]?card/i.test(combined) ||
      /card[_-]?number/i.test(combined) ||
      /cvv/i.test(combined)
    ) {
      return { isSensitive: true, sensitivityClass: 'payment' };
    }

    // Government ID patterns
    if (
      /ssn/i.test(combined) ||
      /social[_-]?security/i.test(combined) ||
      /tax[_-]?id/i.test(combined)
    ) {
      return { isSensitive: true, sensitivityClass: 'government_id' };
    }
  }

  // Email / tel input types → PII (not blocking by default)
  if (inputType === 'email' || inputType === 'tel') {
    return { isSensitive: false, sensitivityClass: 'pii' };
  }

  return { isSensitive: false };
}
