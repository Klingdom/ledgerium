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
 * Returns true when a path segment has the structural shape of a
 * hyphen-separated compound token (2+ non-empty parts split on '-').
 *
 * This is the shape entity-bearing slugs typically take in URLs —
 * `sarah-connor`, `acme-corp-renewal`, `john-smith-llc` — because
 * multi-word display names get kebab-cased when used as identifiers.
 *
 * This is a STRUCTURAL check, not a name detector: it does not attempt to
 * recognize *what* a segment names (that fails silently on any name it
 * hasn't seen — see F-1 review). It only recognizes the compound-token
 * *shape*, deterministically, from the segment alone.
 *
 * Accepted false-positive cost: legitimate multi-word static route
 * segments that happen to share this shape (`sign-in`, `not-found`,
 * `reset-password`, `two-factor`, `getting-started`) are also flagged and
 * lose their specific label in `routeTemplate`. This is intentional —
 * privacy screening biases toward parameterizing when uncertain, since the
 * cost of over-parameterizing a safe segment (a little lost SOP context)
 * is far smaller than the cost of leaking one customer or person name.
 */
function isCompoundSlugSegment(segment: string): boolean {
  if (!segment.includes('-')) return false;
  const tokens = segment.split('-').filter((t) => t.length > 0);
  return tokens.length >= 2;
}

/**
 * Replaces path segments that look like dynamic IDs or entity-bearing
 * slugs with a parameter placeholder.
 *
 * Rules (evaluated in order):
 *  1. Pure integers → ':id'
 *  2. UUIDs (8-4-4-4-12 hex) → ':id'
 *  3. Lowercase-hex-only strings of 10+ characters → ':id'
 *  4. Hyphen-separated compound segments (2+ non-empty tokens) → ':slug'
 *     Structural signal for entity-bearing slugs — see
 *     {@link isCompoundSlugSegment} for the false-positive tradeoff this
 *     rule accepts.
 *  5. Everything else → unchanged
 *
 * Known false-negative (accepted, out of scope for this rule): a
 * *single-token* slug with no hyphen — e.g. `/patients/connor` or
 * `/companies/acmecorp` — is structurally indistinguishable from a
 * single-token static route word (`/settings`, `/reports`) by shape
 * alone, and is NOT caught by this function. Closing that gap requires
 * either a name detector (rejected — fails silently on unseen names) or
 * an allowlist of safe static route words (rejected for this product —
 * Ledgerium captures arbitrary third-party web apps, so a closed
 * vocabulary of "safe" route nouns would default-deny far more
 * legitimate static segments than it protects, gutting routeTemplate's
 * diagnostic value). This is a known, intentionally-scoped gap.
 *
 * @example
 *   deriveRouteTemplate('/tasks/123/comments/abc-def-123')
 *   // → '/tasks/:id/comments/:slug'
 *
 *   deriveRouteTemplate('/users/550e8400-e29b-41d4-a716-446655440000/profile')
 *   // → '/users/:id/profile'
 *
 *   deriveRouteTemplate('/patients/sarah-connor/notes')
 *   // → '/patients/:slug/notes'
 */
/**
 * Collection nouns whose immediately-following path segment identifies a
 * PERSON. Deliberately narrow.
 *
 * This closes the single-token false negative that the shape-based rules
 * cannot reach: `/patients/connor` and `/customers/acmecorp` are structurally
 * identical to `/settings` or `/reports` — no hyphen, no digits, nothing to
 * key on. The only remaining signal is POSITION: the segment after a
 * person-collection noun is an identifier, not a route word.
 *
 * Why this list and not a general route allowlist: a general "safe route word"
 * vocabulary is unbounded (Ledgerium records arbitrary third-party SaaS) and
 * default-denying it would gut routeTemplate's diagnostic value. The set of
 * collections that hold *people*, by contrast, is small, stable, and the
 * highest-severity leak surface — a bare surname under `/patients/` is third-
 * party health data under GDPR.
 *
 * Matched case-insensitively; singular and plural both listed because route
 * conventions vary across products.
 */
const PERSON_COLLECTION_SEGMENTS = new Set([
  'patient', 'patients',
  'user', 'users',
  'customer', 'customers',
  'client', 'clients',
  'employee', 'employees',
  'member', 'members',
  'contact', 'contacts',
  'person', 'people',
  'profile', 'profiles',
  'account', 'accounts',
  'candidate', 'candidates',
  'student', 'students',
]);

/**
 * Static route verbs that commonly follow a collection noun and are NOT
 * identifiers: `/contacts/new`, `/admin/users/list`, `/patients/search`.
 *
 * Required because the position rule alone over-fires on these — verified by
 * regression: without this exception `/contacts/new` became `/contacts/:id`
 * and broke the fill-and-submit golden fixture.
 *
 * Bounded and stable by construction: these are CRUD/navigation verbs, not
 * domain vocabulary, so unlike a general route allowlist this set does not
 * grow with the universe of third-party SaaS products.
 *
 * Residual false negative: a person whose identifier is literally one of these
 * words. Accepted as negligible.
 */
const STATIC_ROUTE_VERBS = new Set([
  'new', 'create', 'add', 'edit', 'update', 'delete', 'remove',
  'list', 'all', 'index', 'search', 'filter', 'export', 'import',
  'settings', 'preferences', 'me', 'current', 'self', 'invite',
  'archived', 'active', 'pending', 'bulk', 'batch',
]);

export function deriveRouteTemplate(pathname: string): string {
  // Split on '/' and map each segment independently.
  const segments = pathname.split('/');
  const mapped = segments.map((segment, i) => {
    if (segment === '') return segment; // preserve leading/trailing slashes

    if (INTEGER_RE.test(segment)) return ':id';
    if (UUID_RE.test(segment)) return ':id';
    if (HEX_ID_RE.test(segment)) return ':id';
    if (isCompoundSlugSegment(segment)) return ':slug';

    // Position rule: a segment directly following a person-collection noun is
    // an identifier for a person, regardless of its shape — UNLESS it is a
    // static route verb (`/contacts/new`). Scans backwards past empty segments
    // so '/patients//connor' behaves like '/patients/connor'.
    if (!STATIC_ROUTE_VERBS.has(segment.toLowerCase())) {
      let prev = i - 1;
      while (prev >= 0 && segments[prev] === '') prev--;
      const prevSegment = prev >= 0 ? segments[prev] : undefined;
      if (prevSegment !== undefined && PERSON_COLLECTION_SEGMENTS.has(prevSegment.toLowerCase())) {
        return ':id';
      }
    }

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
