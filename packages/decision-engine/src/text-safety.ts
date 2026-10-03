/**
 * Text safety at the engine boundary (loop 144, row #331 items 2, 3, 7, 8, 9).
 *
 * Inputs must already be sanitized upstream; this module is the enforcement
 * layer, so a missed upstream redaction can never reach an output field.
 *
 * Free-text rule (item 7). A string is "free text" when it carries instance
 * data rather than a UI state or control name:
 *   - any digit (counts, amounts, dates, ids),
 *   - a redaction placeholder ([email] / [redacted] / [number]),
 *   - (uiState / actorRole / offeredOptions only) a capitalised word in the
 *     middle of a string that also has lowercase-initial words, i.e. a proper
 *     name in a sentence ("Welcome back, Jane Doe"). Fully Title-Case strings
 *     ("Confirm Delete") are NOT flagged: modal titles are Title Case.
 * Known limit: names inside labels, and names in all-Title-Case strings, are
 * undetectable without a dictionary; they rely on the upstream contract.
 */

import { SENSITIVE_SELECTOR_PATTERNS } from '@ledgerium/policy-engine';

export const MAX_TEXT_CHARS = 200;
export const MAX_DESCRIPTION_CHARS = 200;

// Bare hosts count ("ops@localhost"): any local@host form is an address.
const EMAIL_RE = /[^\s@<>"']+@[^\s@<>"']+/gu;
// IBAN-like: 2 letters + 2 check digits + 2..7 groups of 4 (+ short tail), spaced or not.
const IBAN_RE = /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?\b/gu;
// Phone / long digit runs, optional leading "+" and separators " ().-".
const LONG_DIGITS_RE = /\+?\d[\d\s().-]{7,}\d/gu;
const PLACEHOLDER_RE = /\[(?:email|redacted|number)\]/u;
const DIGIT_TOKEN_RE = /[^\s]*\p{Nd}[^\s]*/gu;

export const nfc = (s: string): string => s.normalize('NFC');

/** Deterministic cut at a word boundary with a trailing "…" (never exceeds max). */
export function capText(s: string, max: number): string {
  if (s.length <= max) return s;
  const room = max - 1;
  let cut = s.slice(0, room);
  const space = cut.lastIndexOf(' ');
  if (space > 0) cut = cut.slice(0, space);
  return `${cut.trimEnd()}…`;
}

/**
 * NFC-normalise, strip sensitive content, bound length.
 * policy-engine sensitive patterns (secret/token/card/ssn...) blank the whole
 * string; email addresses and long digit runs are replaced in place.
 */
export function redactText(raw: string): string {
  const s = nfc(raw);
  if (SENSITIVE_SELECTOR_PATTERNS.some((p) => p.test(s))) return '[redacted]';
  return s.replace(EMAIL_RE, '[email]').replace(IBAN_RE, '[number]').replace(LONG_DIGITS_RE, '[number]');
}

export const sanitizeText = (raw: string): string => capText(redactText(raw), MAX_TEXT_CHARS);

/**
 * Output-boundary mask for text-carrying result fields (label, nodeLabel,
 * outcomeKey, prefixKeys). Same patterns as sanitizeText but NO length cap, so
 * structural keys are never truncated. Idempotent: inputs were already
 * sanitized, so on keys built from sanitized steps this is a no-op and
 * identity (decisionId, grouping) is unchanged; it only bites if a key ever
 * reaches output unsanitized.
 */
export const maskOutputText = (s: string): string => redactText(s);

export const sanitizeOptional = (v: string | null | undefined): string | null | undefined =>
  v === null || v === undefined ? v : sanitizeText(v);

function hasMidSentenceName(s: string): boolean {
  const words = s.split(/\s+/u).filter((w) => w !== '');
  const hasLowerInitial = words.some((w) => /^\p{Ll}/u.test(w));
  if (!hasLowerInitial) return false;
  return words.slice(1).some((w) => /^\p{Lu}\p{Ll}+[,.;:]?$/u.test(w));
}

export function isFreeText(s: string, checkNames: boolean): boolean {
  if (/\p{Nd}/u.test(s) || PLACEHOLDER_RE.test(s)) return true;
  return checkNames && hasMidSentenceName(s);
}

/** Replace digit-bearing tokens by '#': the structural shape of a label. */
export const maskFreeText = (s: string): string => s.replace(DIGIT_TOKEN_RE, '#');

/** Safe-to-quote form of a label: free-text tokens never appear verbatim. */
export const safeLabel = (s: string): string => maskFreeText(s);

export const capDescription = (s: string): string => capText(s, MAX_DESCRIPTION_CHARS);

// --- sha-256 (pure, deterministic; no node:crypto so the package stays portable) ---

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function utf8Bytes(s: string): number[] {
  const out: number[] = [];
  const enc = unescape(encodeURIComponent(s));
  for (let i = 0; i < enc.length; i++) out.push(enc.charCodeAt(i));
  return out;
}

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

export function sha256Hex(input: string): string {
  const bytes = utf8Bytes(input);
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const hi = Math.floor(bitLen / 0x100000000);
  const lo = bitLen >>> 0;
  for (const w of [hi, lo]) for (let s = 24; s >= 0; s -= 8) bytes.push((w >>> s) & 0xff);

  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Array<number>(64).fill(0);
  for (let off = 0; off < bytes.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = ((bytes[off + 4 * i]! << 24) | (bytes[off + 4 * i + 1]! << 16) | (bytes[off + 4 * i + 2]! << 8) | bytes[off + 4 * i + 3]!) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15]!, 7) ^ rotr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(w[i - 2]!, 17) ^ rotr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h as [number, number, number, number, number, number, number, number];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i]! + w[i]!) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    const add = [a, b, c, d, e, f, g, hh];
    for (let i = 0; i < 8; i++) h[i] = (h[i]! + add[i]!) >>> 0;
  }
  return h.map((x) => x.toString(16).padStart(8, '0')).join('');
}
