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

/**
 * HTML input `type` values this classifier treats as sensitive on the type
 * ALONE, before any selector/label inspection. `classifySensitivity` consults
 * this set, so the list and the behaviour cannot drift (row #218).
 *
 * Previously it also listed `email`, `tel`, `ssn` and `credit-card` and was
 * consulted by nothing — it documented an intent the code did not implement:
 *  - `email` / `tel` are deliberately NOT blocking. They are classed `pii`
 *    below with `isSensitive: false`, because a field being an email box is
 *    not on its own a reason to redact the step (the VALUE is never captured
 *    either way). Listing them here implied a screen that did not exist.
 *  - `ssn` / `credit-card` are not HTML input types at all, so as type values
 *    they could never match. Those cases are caught by the selector/label
 *    patterns below, which is where they belong.
 *
 * `hidden` stays and is now honoured here. It had been handled only at one
 * call site (`content/target-inspector.ts`), whose comment read "hidden is not
 * caught by classifySensitivity at all" — a gap each caller had to remember.
 */
export const SENSITIVE_INPUT_TYPES: ReadonlySet<string> = new Set([
  'password',
  'hidden',
]);

export const SENSITIVE_SELECTOR_PATTERNS: readonly RegExp[] = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /credit[\s_-]*card/i,
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

  // Any other type in the set (today: `hidden`). Hidden inputs routinely carry
  // tokens, session ids and prefilled record keys, and their selector/label can
  // name them. Classed `custom` rather than `password`: it is sensitive by
  // container, not by a known category.
  if (inputType !== undefined && SENSITIVE_INPUT_TYPES.has(inputType)) {
    return { isSensitive: true, sensitivityClass: 'custom' };
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
      /credit[\s_-]*card/i.test(combined) ||
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
