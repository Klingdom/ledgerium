/**
 * Rows #375 / #378 / #385 — outbound privacy filter for PostHog events.
 *
 * Installed as posthog-js `before_send` (supported in 1.367.0; signature
 * `(cr: CaptureResult | null) => CaptureResult | null`). Runs on every event
 * immediately before it is queued, so it covers $pageview, $pageleave,
 * autocapture, $identify and anything captureEvent() sends.
 *
 *  - utm_* keys (also $initial_utm_*, $session_entry_utm_*, utm_* inside
 *    $set / $set_once) go through sanitizeUtm (#362); rejected values are
 *    dropped, not nulled.
 *  - URL-shaped values (absolute http(s), protocol-relative, root-relative with
 *    a query/fragment) and values under URL-named keys (`*url`, `*uri`, `*href`,
 *    `*referrer`, `*referer`, with or without a leading `$`) lose their query
 *    string and fragment, lose any `user:pass@` authority prefix, and have
 *    their PATH templated (#385): bearer-capability segments (`/share/<token>`)
 *    become `/share/[token]`, opaque record ids (`/workflows/<id>`) become
 *    `/workflows/[id]`, and any path segment holding an email address becomes
 *    `[email]`.
 *  - Path-named keys (`path`, `$pathname`, `*_pathname`: `$session_entry_pathname`,
 *    `$prev_pageview_pathname`, `$initial_pathname`) get the same path treatment.
 *  - Applied recursively (nested objects, arrays, properties.$set / $set_once,
 *    event.$set / $set_once), so `$initial_*` person properties are covered.
 *    utm_* keys are sanitised at any depth. Cycles and depth >= 12 are dropped.
 *
 * Pure: no I/O, never mutates its input. Out of scope: PII in non-URL custom
 * property values (bare emails in free text are not redacted), page titles,
 * and schemeless values under non-URL keys.
 */
import type { CaptureResult } from 'posthog-js';
import { sanitizeUtm } from '@/lib/utm-sanitize';

// ─────────────────────────────────────────────────────────────────────────────
// Route patterns (#385)
// ─────────────────────────────────────────────────────────────────────────────

interface RoutePattern {
  /** `:name` = dynamic segment (replaced by `[name]`); anything else is a literal. */
  readonly pattern: string;
  /**
   * secret: a bearer capability. Matched at ANY position in the path (covers a sub-path
   * deployment or a foreign host) and everything after it is collapsed into the template.
   * Otherwise (opaque id): matched at the start of the path only; the tail is kept.
   */
  readonly secret: boolean;
  /** Param values that are really static sibling routes (decoded, lower-case). */
  readonly except?: readonly string[];
}

/**
 * Every dynamic route in apps/web-app/src/app that must be templated. Kept in step with the
 * app directory by DYNAMIC_ROUTE_DECISIONS below (a test fails if a new `[param]` route appears
 * without a decision).
 */
export const ROUTE_PATTERNS: readonly RoutePattern[] = [
  // bearer capabilities: whoever holds the token can read the workflow
  { pattern: '/share/:token', secret: true },
  { pattern: '/api/share/:token', secret: true },
  // Defensive: token-in-path routes that do not exist today (invite / reset / verify tokens
  // currently travel in the query string, which is stripped). Redacted if one is ever added.
  { pattern: '/invite/:token', secret: true },
  { pattern: '/reset-password/:token', secret: true },
  { pattern: '/verify/:token', secret: true },
  { pattern: '/magic/:token', secret: true },
  // opaque record ids (page routes)
  { pattern: '/workflows/:id', secret: false },
  { pattern: '/analytics/process/:id', secret: false },
  { pattern: '/teams/:id', secret: false, except: ['join'] }, // /teams/join is a static page
  // opaque record ids (API routes)
  { pattern: '/api/workflows/:id', secret: false },
  { pattern: '/api/baselines/:id', secret: false },
  { pattern: '/api/portfolios/:id', secret: false },
  { pattern: '/api/tags/:id', secret: false },
  { pattern: '/api/insights/:id', secret: false },
  { pattern: '/api/admin/users/:id', secret: false },
  { pattern: '/api/teams/:id', secret: false },
  { pattern: '/api/teams/:id/invite/:inviteId', secret: false },
  { pattern: '/api/teams/:id/members/:memberId', secret: false },
];

export type DynamicRouteDecision = 'secret' | 'id' | 'public' | 'no-secret';

/**
 * Decision for every `[param]` route folder under src/app (group folders like `(public)` removed;
 * key = path up to and including the last dynamic segment).
 *  - secret: bearer capability, always redacted.
 *  - id: opaque cuid. Not a secret (every API route authorizes it) but templated anyway: it joins
 *    to workflow titles / owners in the app database and makes $pathname unbounded-cardinality.
 *    Cost: no per-record page-view breakdown in PostHog.
 *  - public: static marketing/content slug; useful analytics, not sensitive, left as is.
 *  - no-secret: path carries no secret (NextAuth provider names; tokens there are in the query).
 */
export const DYNAMIC_ROUTE_DECISIONS: Readonly<Record<string, DynamicRouteDecision>> = {
  'share/[token]': 'secret',
  'api/share/[token]': 'secret',
  'workflows/[id]': 'id',
  'analytics/process/[id]': 'id',
  'teams/[id]': 'id',
  'api/workflows/[id]': 'id',
  'api/baselines/[id]': 'id',
  'api/portfolios/[id]': 'id',
  'api/tags/[id]': 'id',
  'api/insights/[id]': 'id',
  'api/admin/users/[id]': 'id',
  'api/teams/[id]': 'id',
  'api/teams/[id]/invite/[inviteId]': 'id',
  'api/teams/[id]/members/[memberId]': 'id',
  'ai-opportunities/[slug]': 'public',
  'alternatives/[slug]': 'public',
  'answers/[slug]': 'public',
  'compare/[slug]': 'public',
  'competitors/[slug]': 'public',
  'departments/[slug]': 'public',
  'industries/[slug]': 'public',
  'software/[slug]': 'public',
  'sop-templates/[slug]': 'public',
  'use-cases/personas/[slug]': 'public',
  'use-cases/problems/[slug]': 'public',
  'workflow-library/[slug]': 'public',
  'api/auth/[...nextauth]': 'no-secret',
};

interface CompiledPart { readonly literal: string | null; readonly name: string }
interface CompiledPattern {
  readonly parts: readonly CompiledPart[];
  readonly secret: boolean;
  readonly except: readonly string[];
}

const COMPILED: readonly CompiledPattern[] = ROUTE_PATTERNS.map((p) => ({
  parts: p.pattern.split('/').filter(Boolean).map((s): CompiledPart =>
    s.startsWith(':') ? { literal: null, name: s.slice(1) } : { literal: s.toLowerCase(), name: '' }),
  secret: p.secret,
  except: p.except ?? [],
}));

/** Percent-decode repeatedly (double / triple encoding) until stable; tolerates malformed escapes. */
function decodeAll(s: string): string {
  let cur = s;
  for (let i = 0; i < 4; i++) {
    let next: string;
    try { next = decodeURIComponent(cur); } catch { return cur; }
    if (next === cur) return cur;
    cur = next;
  }
  return cur;
}

const EMAIL_IN_SEGMENT = /[^\s@/]+@[^\s@/]+\.[^\s@/]+/;

function isEmailSegment(segment: string): boolean {
  return EMAIL_IN_SEGMENT.test(decodeAll(segment));
}

function matchAt(segs: readonly string[], at: number, p: CompiledPattern): boolean {
  if (segs.length - at < p.parts.length) return false;
  for (let i = 0; i < p.parts.length; i++) {
    const part = p.parts[i]!;
    const seg = decodeAll(segs[at + i]!).toLowerCase();
    if (part.literal !== null) {
      if (seg !== part.literal) return false;
    } else if (p.except.includes(seg)) {
      return false;
    }
  }
  return true;
}

/** Resolve `.`, `..` and empty segments (the server and browser do before routing). */
function normalizeSegments(path: string): string[] {
  const out: string[] = [];
  for (const s of path.split('/')) {
    if (s === '' || s === '.') continue;
    if (s === '..') { out.pop(); continue; }
    out.push(s);
  }
  return out;
}

/** Returns the templated segments, or null when no route pattern matches. */
function applyRoutePatterns(segs: readonly string[]): string[] | null {
  let best: { at: number; p: CompiledPattern } | null = null;
  for (const p of COMPILED) {
    const last = p.secret ? segs.length - p.parts.length : 0;
    for (let at = 0; at <= last; at++) {
      if (!matchAt(segs, at, p)) continue;
      if (best === null || at < best.at || (at === best.at && p.parts.length > best.p.parts.length)) {
        best = { at, p };
      }
      break;
    }
  }
  if (best === null) return null;
  const { at, p } = best;
  const head = p.parts.map((part, i) => (part.literal === null ? `[${part.name}]` : segs[at + i]!));
  const rest = p.secret ? [] : segs.slice(at + p.parts.length);
  return [...segs.slice(0, at), ...head, ...rest];
}

/**
 * Template the PATH of a URL (no scheme/host/query): `/share/abc` -> `/share/[token]`,
 * `/inbox/a@b.co` -> `/inbox/[email]`. Returns the input unchanged when nothing matches.
 * Pure.
 */
export function templatePath(path: string): string {
  if (path === '') return path;
  const segs = normalizeSegments(path.replace(/\\/g, '/'));
  const templated = applyRoutePatterns(segs);
  let changed = templated !== null;
  const result = (templated ?? segs).map((s) => {
    if (isEmailSegment(s)) { changed = true; return '[email]'; }
    return s;
  });
  return changed ? `/${result.join('/')}` : path;
}

// ─────────────────────────────────────────────────────────────────────────────
// URL handling
// ─────────────────────────────────────────────────────────────────────────────

// Keys: `$` prefix is ignored; suffix match so `$referrer`, `$current_url`, `pageUrl`, `href` all count.
const URL_KEY = /(?:url|uri|href|referrer|referer)$/i;
const PATH_KEY = /path(?:name)?$/i;
const ABSOLUTE_HTTP_URL = /^https?:\/\//i;
// Root-relative (or protocol-relative) path carrying a query/fragment: `/x?y`, `//h/x#y`.
// No whitespace, so prose such as "/ and ?" is left alone.
const RELATIVE_URL_WITH_SUFFIX = /^\/[^\s?#]*[?#]\S*$/;
// Root-relative path with no whitespace and no query: only templated, never otherwise altered.
const ROOT_RELATIVE = /^\/\S*$/;
const SCHEME_AND_AUTHORITY = /^([a-z][a-z0-9+.-]*:)?\/\/([^/]*)([\s\S]*)$/i;
const MAX_DEPTH = 12;

export function stripQueryAndFragment(value: string): string {
  const cut = value.search(/[?#]/);
  return cut === -1 ? value : value.slice(0, cut);
}

function stripUserinfo(authority: string): string {
  const at = authority.lastIndexOf('@');
  return at === -1 ? authority : authority.slice(at + 1);
}

function looksLikeHost(segment: string): boolean {
  return /[.:@]/.test(segment) || segment.toLowerCase() === 'localhost';
}

/** Strip query/fragment and userinfo, template the path. Handles absolute, `//host`, `/path`, `host/path`, `rel/path`. */
function sanitizeUrl(raw: string): string {
  const value = stripQueryAndFragment(raw.trim()).replace(/\\/g, '/');
  if (/^mailto:/i.test(value)) return 'mailto:[email]';
  const abs = SCHEME_AND_AUTHORITY.exec(value);
  if (abs) return `${abs[1] ?? ''}//${stripUserinfo(abs[2]!)}${templatePath(abs[3]!)}`;
  if (value.startsWith('/')) return templatePath(value);
  const slash = value.indexOf('/');
  if (slash === -1) return isEmailSegment(value) ? '[email]' : value;
  const first = value.slice(0, slash);
  if (looksLikeHost(first)) return `${stripUserinfo(first)}${templatePath(value.slice(slash))}`;
  return templatePath(`/${value}`).slice(1); // schemeless relative path: `share/tok`
}

/** Path-named key: value is a pathname (`/share/tok`, or occasionally a full URL). */
function sanitizePathValue(raw: string): string {
  if (ABSOLUTE_HTTP_URL.test(raw) || raw.startsWith('//')) return sanitizeUrl(raw);
  const bare = stripQueryAndFragment(raw);
  return bare.startsWith('/') ? templatePath(bare) : templatePath(`/${bare}`).slice(1);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

const DROP = Symbol('drop');
const UTM_KEY = /^(?:\$initial_|\$session_entry_)?utm_/i;

function sanitizeString(value: string, parentKey: string): string {
  const key = parentKey.startsWith('$') ? parentKey.slice(1) : parentKey;
  if (URL_KEY.test(key) || ABSOLUTE_HTTP_URL.test(value) || RELATIVE_URL_WITH_SUFFIX.test(value)) {
    return sanitizeUrl(value);
  }
  if (PATH_KEY.test(key)) return sanitizePathValue(value);
  if (ROOT_RELATIVE.test(value)) return value.startsWith('//') ? sanitizeUrl(value) : templatePath(value);
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

/**
 * Row #392: the same key/value rules applied to a plain property bag (used by
 * the analytics ingest route as defence in depth). Path/url/href/referrer-named
 * strings are templated or stripped at any depth; utm_* keys are re-sanitized.
 */
export function sanitizePropertyBag(bag: Record<string, unknown>): Record<string, unknown> {
  return sanitizeBag(bag);
}

export function sanitizePostHogEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  const next: CaptureResult = { ...event };
  if (event.properties) next.properties = sanitizeBag(event.properties);
  if (event.$set) next.$set = sanitizeBag(event.$set);
  if (event.$set_once) next.$set_once = sanitizeBag(event.$set_once);
  return next;
}
