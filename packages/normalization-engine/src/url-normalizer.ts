/**
 * URL normalization utilities for the Ledgerium normalization engine.
 * Strips tracking parameters, extracts domains, derives route templates,
 * and maps hostnames to human-readable application labels.
 */

// ---------------------------------------------------------------------------
// Tracking params
// ---------------------------------------------------------------------------

export const TRACKING_PARAMS: ReadonlySet<string> = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'ref',
  'source',
  '_ga',
]);

// ---------------------------------------------------------------------------
// normalizeUrl
// ---------------------------------------------------------------------------

/**
 * Strips well-known tracking query parameters from a URL.
 * Returns the original string unchanged when the URL cannot be parsed.
 */
export function normalizeUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  const keysToDelete: string[] = [];
  for (const key of parsed.searchParams.keys()) {
    if (TRACKING_PARAMS.has(key)) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    parsed.searchParams.delete(key);
  }

  // Preserve trailing '?' only when params remain; URL serializer handles this.
  return parsed.toString();
}

// ---------------------------------------------------------------------------
// extractDomain
// ---------------------------------------------------------------------------

/**
 * Returns the hostname of a URL, or an empty string if the URL is malformed.
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// deriveRouteTemplate
// ---------------------------------------------------------------------------

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INTEGER_RE = /^\d+$/;
// Lowercase hex string of 10 or more characters (no hyphens — pure hex run)
const HEX_ID_RE = /^[0-9a-f]{10,}$/;

/**
 * Replaces path segments that look like dynamic IDs with ':id'.
 *
 * Rules (evaluated in order):
 *  1. Pure integers → ':id'
 *  2. UUIDs (8-4-4-4-12 hex) → ':id'
 *  3. Lowercase-hex-only strings of 10+ characters → ':id'
 *  4. Everything else → unchanged
 *
 * @example
 *   deriveRouteTemplate('/tasks/123/comments/abc-def-123')
 *   // → '/tasks/:id/comments/:id'
 *
 *   deriveRouteTemplate('/users/550e8400-e29b-41d4-a716-446655440000/profile')
 *   // → '/users/:id/profile'
 */
export function deriveRouteTemplate(pathname: string): string {
  // Split on '/' and map each segment independently.
  const segments = pathname.split('/');
  const mapped = segments.map((segment) => {
    if (segment === '') return segment; // preserve leading/trailing slashes

    if (INTEGER_RE.test(segment)) return ':id';
    if (UUID_RE.test(segment)) return ':id';
    if (HEX_ID_RE.test(segment)) return ':id';

    return segment;
  });
  return mapped.join('/');
}

// ---------------------------------------------------------------------------
// deriveApplicationLabel
// ---------------------------------------------------------------------------

/**
 * Known hostname-part → display label mappings (case-insensitive key lookup).
 */
const KNOWN_APP_LABELS: ReadonlyMap<string, string> = new Map([
  ['netsuite', 'NetSuite'],
  ['salesforce', 'Salesforce'],
  ['workday', 'Workday'],
  ['servicenow', 'ServiceNow'],
  ['sap', 'SAP'],
]);

/**
 * Capitalizes a plain ASCII string (first char upper, rest unchanged).
 */
function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s[0]!.toUpperCase() + s.slice(1);
}

/**
 * Derives a human-readable application label from a hostname.
 *
 * Strategy:
 *  1. 'localhost' → 'Local Dev'
 *  2. Strip 'www.' prefix, then split on '.'.
 *  3. Check each part against KNOWN_APP_LABELS (case-insensitive).
 *  4. Fall back to capitalizing the first meaningful hostname part.
 *
 * @example
 *   deriveApplicationLabel('system.netsuite.com')  // → 'NetSuite'
 *   deriveApplicationLabel('app.salesforce.com')   // → 'Salesforce'
 *   deriveApplicationLabel('localhost')             // → 'Local Dev'
 *   deriveApplicationLabel('myapp.example.com')    // → 'Myapp'
 */
export function deriveApplicationLabel(hostname: string): string {
  const lower = hostname.toLowerCase();

  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '::1') {
    return 'Local Dev';
  }

  // Strip trailing dot (FQDN) and www prefix.
  const stripped = lower.replace(/\.$/, '').replace(/^www\./, '');
  const parts = stripped.split('.');

  // Scan all parts for a known mapping (e.g. 'system.netsuite.com' → 'netsuite').
  for (const part of parts) {
    const known = KNOWN_APP_LABELS.get(part);
    if (known !== undefined) return known;
  }

  // Fall back to capitalizing the first non-empty part.
  const firstMeaningful = parts.find((p) => p.length > 0) ?? stripped;
  return capitalize(firstMeaningful);
}
