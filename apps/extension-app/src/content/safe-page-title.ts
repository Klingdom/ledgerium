/**
 * PII-safe page title helper for content-script event capture.
 *
 * `document.title` is a high-risk PII vector: browser tab titles routinely
 * contain email addresses, names, and account identifiers (e.g.
 * "Inbox (3) – phil@mediafier.ai").  Screening MUST happen in the content
 * script before the RawEvent leaves the browser tab via the message bus.
 *
 * Design:
 *  - `screenPageTitle(rawTitle)` — pure function; usable in unit tests without DOM.
 *  - `getSafePageTitle()` — reads `document.title`, screens, falls back to app
 *    label derived from the current domain (always non-empty).
 *
 * The existing `applySafetyHeuristics` in label-extractor.ts uses an ANCHORED
 * email regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) that matches only strings that
 * ARE an email address — it would NOT reject "Inbox (3) – phil@mediafier.ai".
 * We therefore pre-screen with an unanchored pattern before delegating to the
 * shared heuristics, which handle phone, SSN, CC, digit sequences, and word
 * count limits.
 */

import { screenFreeText } from './free-text-screen.js'
import { extractDomain, deriveAppLabel } from '../shared/utils.js'

/**
 * Pure screening function for a raw page title string.
 *
 * Returns:
 *  - `''`   — input was empty or whitespace-only (safe; not a PII rejection)
 *  - `null` — PII detected; caller should substitute a safe fallback
 *  - `string` (non-empty) — screened and possibly truncated title (≤ 80 chars)
 *
 * Exported for unit testing.  Does NOT access any DOM globals.
 */
export function screenPageTitle(rawTitle: string): string | null {
  // Delegates to the shared free-text guard, which applies the UNANCHORED
  // email + URL pre-screens (page titles embed both inside longer text) before
  // the shared phone / SSN / CC / digit-run / word-count heuristics.
  //
  // This previously used a private unanchored email regex declared in this
  // file. It was consolidated into free-text-screen.ts when the same need
  // arose for state-change text (F-2) — two copies of a redaction pattern is a
  // drift risk. Consolidating also closed this function's embedded-URL gap.
  return screenFreeText(rawTitle)
}

/**
 * Returns a PII-screened page title for use in content-script event capture.
 *
 * Reads `document.title` and passes it through `screenPageTitle()`.  If
 * screening rejects the title (embedded email, phone, SSN, CC number, etc.)
 * the function falls back to the application label derived from the current
 * domain — always a non-empty, safe string (worst case: `'Local Dev'`).
 *
 * Screening happens here, in the content script, before the RawEvent is
 * posted to the background via the RAW_EVENT_CAPTURED message bus.
 */
export function getSafePageTitle(): string {
  const screened = screenPageTitle(document.title)
  if (screened !== null) return screened
  return _fallback()
}

/** @internal */
function _fallback(): string {
  const domain = extractDomain(location.href)
  return deriveAppLabel(domain)   // always non-empty ('Local Dev' at minimum)
}
