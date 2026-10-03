/**
 * Row #375 (MR-071 §4) — outbound privacy filter for PostHog events.
 *
 * Installed as posthog-js `before_send` (supported in 1.367.0; signature
 * `(cr: CaptureResult | null) => CaptureResult | null`). Runs on every event
 * immediately before it is queued, so it covers $pageview, $pageleave,
 * autocapture, $identify and anything captureEvent() sends.
 *
 *  - utm_* keys (also $initial_utm_*, $session_entry_utm_*, utm_* inside
 *    $set / $set_once) go through sanitizeUtm (#362); rejected values are
 *    dropped, not nulled.
 *  - Any string property whose key is a known URL key, or whose value is an
 *    absolute http(s) URL, loses its query string and fragment.
 *
 * Pure: no I/O, never mutates its input. Out of scope: PII in URL paths and
 * in non-utm custom property values that are not URLs.
 */
import type { CaptureResult } from 'posthog-js';
import { sanitizeUtm } from '@/lib/utm-sanitize';


const UTM_KEY = /^(?:\$initial_|\$session_entry_)?utm_/i;
const URL_KEY = /(?:^|_)(?:url|referrer)$/i;
const ABSOLUTE_HTTP_URL = /^https?:\/\//i;

export function stripQueryAndFragment(value: string): string {
  const cut = value.search(/[?#]/);
  return cut === -1 ? value : value.slice(0, cut);
}

function sanitizeBag(bag: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(bag)) {
    if (UTM_KEY.test(key)) {
      if (value === null || value === undefined) continue;
      const clean = typeof value === 'string' ? sanitizeUtm(value) : null;
      if (clean !== null) out[key] = clean;
    } else if (typeof value === 'string' && (URL_KEY.test(key) || ABSOLUTE_HTTP_URL.test(value))) {
      out[key] = stripQueryAndFragment(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function sanitizePostHogEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  const next: CaptureResult = { ...event };
  if (event.properties) next.properties = sanitizeBag(event.properties);
  if (event.$set) next.$set = sanitizeBag(event.$set);
  if (event.$set_once) next.$set_once = sanitizeBag(event.$set_once);
  return next;
}
