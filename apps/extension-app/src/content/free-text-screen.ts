/**
 * PII screening for FREE-TEXT capture surfaces.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * `applySafetyHeuristics` in label-extractor.ts was written for *element
 * labels* — short, structural strings like "Save Invoice" or "Submit". Two of
 * its patterns are anchored accordingly:
 *
 *   EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/   // matches only if the string IS an email
 *   URL_RE   = /^https?:\/\//i                 // matches only if the string STARTS with a URL
 *
 * That is correct for labels but insufficient for free text, where PII appears
 * *embedded mid-sentence*:
 *
 *   "Email already registered: jane@company.com"     → EMAIL_RE does not match
 *   "Redirecting to https://crm.example.com/deals"   → URL_RE does not match
 *
 * Free-text surfaces in this extension are page titles (F-0) and state-change
 * text from modals / toasts / alerts / errors (F-2). Both are high-risk: error
 * and toast copy is *designed* to echo user- and record-specific data back to
 * the screen.
 *
 * The F-0 fix solved the embedded-email case with a private regex inside
 * safe-page-title.ts. Rather than copy that workaround into a second file —
 * duplicate redaction regex sets across files is an already-flagged drift risk
 * — the screen lives here once and is shared.
 *
 * Ref: F-0 / F-2, docs/meta/FUNNEL_AND_SOP_REVIEW_001.md §2.
 */

import { applySafetyHeuristics } from './label-extractor.js'

/** Unanchored email — catches addresses embedded anywhere in a longer string. */
const EMBEDDED_EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/

/** Unanchored URL — catches links embedded anywhere, not just at position 0. */
const EMBEDDED_URL_RE = /https?:\/\//i

/**
 * Screen an arbitrary free-text string for PII.
 *
 * Returns:
 *  - `''`     — input was empty / whitespace-only (safe; not a PII rejection)
 *  - `null`   — PII detected; caller substitutes a safe fallback or omits
 *  - `string` — screened and possibly truncated (≤ 80 chars)
 *
 * Order matters: the unanchored pre-screens run FIRST, because
 * `applySafetyHeuristics` would otherwise pass an embedded address through.
 * After the pre-screen it delegates to the shared heuristics so there is a
 * single source of truth for phone / SSN / CC / digit-run / word-count / length
 * rules rather than two implementations that can drift apart.
 *
 * Pure. No DOM access. Deterministic: same input always yields same output.
 */
export function screenFreeText(raw: string): string | null {
  if (!raw.trim()) return ''
  if (EMBEDDED_EMAIL_RE.test(raw)) return null
  if (EMBEDDED_URL_RE.test(raw)) return null
  return applySafetyHeuristics(raw)
}
