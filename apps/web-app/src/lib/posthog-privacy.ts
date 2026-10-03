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
 *  - Any string whose key is a known URL key, or whose value is an absolute
 *    http(s) URL or a root-relative path with a query/fragment, loses its query
 *    string and fragment. Applied recursively (nested objects, arrays,
 *    properties.$set / $set_once, event.$set / $set_once); utm_* keys are
 *    sanitised at any depth. Cycles and depth > 12 are dropped.
 *
 * Pure: no I/O, never mutates its input. Out of scope: PII in URL paths and
 * in non-utm custom property values that are not URLs (bare emails in free text are not redacted).
 */
import type { CaptureResult } from 'posthog-js';
import { sanitizeUtm } from '@/lib/utm-sanitize';


const UTM_KEY = /^(?:\$initial_|\$session_entry_)?utm_/i;
const URL_KEY = /(?:^|_)(?:url|referrer)$/i;
const ABSOLUTE_HTTP_URL = /^https?:\/\//i;
// Root-relative (or protocol-relative) path carrying a query/fragment: `/x?y`, `//h/x#y`.
// No whitespace, so prose such as "/ and ?" is left alone.
const RELATIVE_URL_WITH_SUFFIX = /^\/[^\s?#]*[?#]\S*$/;
const MAX_DEPTH = 12;

export function stripQueryAndFragment(value: string): string {
  const cut = value.search(/[?#]/);
  return cut === -1 ? value : value.slice(0, cut);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

const DROP = Symbol('drop');

function sanitizeString(value: string, parentKey: string): string {
  if (URL_KEY.test(parentKey) || ABSOLUTE_HTTP_URL.test(value) || RELATIVE_URL_WITH_SUFFIX.test(value)) {
    return stripQueryAndFragment(value);
  }
  return value;
}

/** Recursive value sanitizer. `ancestors` guards cycles; depth is capped. Returns DROP to omit. */
function sanitizeValue(
  value: unknown, parentKey: string, ancestors: object[], depth: number,
): unknown {
  if (typeof value === 'string') return sanitizeString(value, parentKey);
  if (value === null || typeof value !== 'object') return value;
  const isArr = Array.isArray(value);
  if (!isArr && !isPlainObject(value)) return value; // Date etc.: untouched
  if (depth >= MAX_DEPTH || ancestors.includes(value)) return DROP;
  const chain = [...ancestors, value];
  if (isArr) {
    const out: unknown[] = [];
    for (const item of value) {
      const clean = sanitizeValue(item, parentKey, chain, depth + 1);
      if (clean !== DROP) out.push(clean);
    }
    return out;
  }
  return sanitizeObject(value as Record<string, unknown>, chain, depth + 1);
}

function sanitizeObject(
  bag: Record<string, unknown>, ancestors: object[], depth: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(bag)) {
    if (UTM_KEY.test(key)) {
      if (value === null || value === undefined) continue;
      const clean = typeof value === 'string' ? sanitizeUtm(value) : null;
      if (clean !== null) out[key] = clean;
      continue;
    }
    const clean = sanitizeValue(value, key, ancestors, depth);
    if (clean !== DROP) out[key] = clean;
  }
  return out;
}

function sanitizeBag(bag: Record<string, unknown>): Record<string, unknown> {
  return sanitizeObject(bag, [bag], 0);
}

export function sanitizePostHogEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  const next: CaptureResult = { ...event };
  if (event.properties) next.properties = sanitizeBag(event.properties);
  if (event.$set) next.$set = sanitizeBag(event.$set);
  if (event.$set_once) next.$set_once = sanitizeBag(event.$set_once);
  return next;
}
