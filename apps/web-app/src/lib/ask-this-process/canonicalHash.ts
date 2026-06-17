/**
 * canonicalHash — the order-stable canonical serializer + sha256 hash for the
 * `GroundedEvidenceBundle` (ADR-001 Decision 2; feasibility R-3).
 *
 * This is the single biggest hidden non-determinism trap: `JSON.stringify` does
 * NOT guarantee stable object-key order across engines/versions and does not pin
 * number formatting, so it cannot back a reproducibility claim. This module
 * provides a deterministic serializer:
 *
 *   - object keys are emitted in SORTED order (lexicographic),
 *   - arrays are emitted in their (already-canonical) input order,
 *   - numbers are formatted via a fixed rule (integers as-is; non-integers fixed
 *     to a stable decimal form; non-finite → null),
 *   - strings/booleans/null are emitted unambiguously.
 *
 * The result is fed to sha256. Determinism: same logical value ⇒ byte-identical
 * canonical string ⇒ identical hash. A pinned-hash golden test guards drift.
 *
 * PURE: no `Date.now()` / `Math.random()` / network / I/O.
 *
 * @module ask-this-process/canonicalHash
 */

import { createHash } from 'node:crypto';

/** A JSON-ish value the canonical serializer accepts. */
export type CanonicalValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

/**
 * Format a number into a stable, engine-independent decimal string.
 * - non-finite (NaN / ±Infinity) → "null" (defensive; bundle should not carry these)
 * - integers → their plain decimal ("4", "-2", "0")
 * - non-integers → fixed to 6 decimal places then trailing zeros trimmed
 *   ("0.5", "0.333333"). This pins the formatting so 0.1+0.2-style float noise
 *   cannot perturb the hash across runs.
 */
function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return 'null';
  if (Number.isInteger(n)) return String(n);
  // Fixed-precision then trim trailing zeros (and a dangling '.') for stability.
  const fixed = n.toFixed(6);
  const trimmed = fixed.replace(/0+$/, '').replace(/\.$/, '');
  return trimmed;
}

function quoteString(s: string): string {
  // JSON.stringify on a STRING is deterministic (it only escapes a fixed set of
  // characters); the non-determinism risk is object KEY ORDER, which we handle
  // ourselves below. So this is safe and unambiguous for scalar strings.
  return JSON.stringify(s);
}

/**
 * Canonically serialize a value to a stable string. Object keys are sorted;
 * arrays preserve order; `undefined` object-values are OMITTED (so an absent
 * optional field and an explicit `undefined` hash identically). `undefined`
 * inside an array is encoded as `null` (arrays are positional — we cannot drop
 * an element without shifting indices).
 */
export function canonicalSerialize(value: CanonicalValue): string {
  if (value === null || value === undefined) return 'null';

  const t = typeof value;
  if (t === 'string') return quoteString(value as string);
  if (t === 'number') return formatNumber(value as number);
  if (t === 'boolean') return (value as boolean) ? 'true' : 'false';

  if (Array.isArray(value)) {
    const parts = value.map((v) => (v === undefined ? 'null' : canonicalSerialize(v)));
    return `[${parts.join(',')}]`;
  }

  // Plain object: emit keys in sorted order; omit keys whose value is undefined.
  const obj = value as { [key: string]: CanonicalValue };
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const v = obj[k];
    if (v === undefined) continue;
    parts.push(`${quoteString(k)}:${canonicalSerialize(v)}`);
  }
  return `{${parts.join(',')}}`;
}

/**
 * sha256 a value via the canonical serializer. Returns `sha256:<hex>`.
 */
export function canonicalSha256(value: CanonicalValue): string {
  const serialized = canonicalSerialize(value);
  const hex = createHash('sha256').update(serialized, 'utf8').digest('hex');
  return `sha256:${hex}`;
}
