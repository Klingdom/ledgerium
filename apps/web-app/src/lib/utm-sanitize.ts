/**
 * Row #362 (MR-068 §2) — the single UTM value rule for every analytics path
 * (pricing_page_viewed, signup_completed first-touch spread, UTMCapture storage).
 *
 * Pure, no I/O, no imports. Returns the cleaned value or null when the value
 * must be dropped entirely. The rejected value is never logged or returned.
 *
 * Steps: remove lone surrogates -> repeat { NFKC, decodeURIComponent } until
 * stable (max UTM_MAX_DECODE_PASSES; still-changing at the cap means deeper
 * nesting than any honest tag, so fail closed) -> strip control/format chars
 * -> trim -> reject any at-sign form -> cap at UTM_MAX_LENGTH code points.
 *
 * At-sign family rejected: '@', '%40' (any case, incl. leftovers of nested
 * encoding), and compatibility forms U+FF20 / U+FE6B (folded by NFKC).
 * Out of scope: other PII shapes (phone numbers, names) and non-email
 * identifiers; no character whitelist is applied.
 */
export const UTM_MAX_LENGTH = 64;
export const UTM_MAX_DECODE_PASSES = 3;

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const CONTROL_OR_FORMAT = /[\p{Cc}\p{Cf}]/gu;
const AT_SIGN_FORMS = /@|%40|＠|﹫/i;

export function sanitizeUtm(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;

  let s = raw.replace(LONE_SURROGATE, '');
  let stable = false;
  for (let i = 0; i < UTM_MAX_DECODE_PASSES; i++) {
    const folded = s.normalize('NFKC');
    let decoded: string;
    try {
      decoded = decodeURIComponent(folded);
    } catch {
      // Malformed percent sequence: nothing more to decode; keep the raw text.
      s = folded;
      stable = true;
      break;
    }
    s = decoded;
    if (decoded === folded) {
      stable = true;
      break;
    }
  }
  if (!stable) {
    // Still decoding after the cap: check one more fold/decode; if it still moves, drop.
    const folded = s.normalize('NFKC');
    try {
      if (decodeURIComponent(folded) !== folded) return null;
    } catch {
      /* malformed => cannot decode further */
    }
    s = folded;
  }

  s = s.normalize('NFKC').replace(CONTROL_OR_FORMAT, '').trim();
  if (s === '' || AT_SIGN_FORMS.test(s)) return null;

  const points = Array.from(s);
  const capped = points.length > UTM_MAX_LENGTH ? points.slice(0, UTM_MAX_LENGTH).join('') : s;
  const out = capped.trim();
  return out === '' ? null : out;
}

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const UTM_KEY_SET: ReadonlySet<string> = new Set(UTM_KEYS);

export type FirstTouchFieldSanitizer = (value: string) => string | null;

/**
 * Whitelist sanitizer for a stored first-touch record (row #392). A key is kept
 * only if it is a utm_* key (sanitizeUtm) or is named in `fields` with its own
 * sanitizer; every other key is dropped, so a field added to UTMCapture without
 * a sanitizer never reaches an event. Rejected values are omitted (not null) so
 * the signup_completed spread never carries them. `fields` is injected (not
 * imported) because posthog-privacy already imports this module.
 */
export function sanitizeFirstTouchRecord(
  input: Record<string, unknown>,
  fields: Readonly<Record<string, FirstTouchFieldSanitizer>> = {},
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v !== 'string') continue;
    const clean = UTM_KEY_SET.has(k)
      ? sanitizeUtm(v)
      : Object.prototype.hasOwnProperty.call(fields, k)
        ? fields[k]!(v)
        : null;
    if (clean !== null) result[k] = clean;
  }
  return result;
}
