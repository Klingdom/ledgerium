/**
 * Static URL route-pattern → intent hint table (PATHE-P02 §A2 Rule 2 supplement).
 *
 * Each entry maps a regex against a *normalised* route template (produced by
 * `deriveRouteTemplate()`) to a partial intent hint.  Both `verb` and `object`
 * are optional — a route may hint at one without constraining the other.
 *
 * Evaluation order: first match wins.  Patterns are ordered from most-specific
 * (deepest path / longest prefix) to most-general.
 *
 * Determinism guarantee: no runtime state; pure lookup table.
 *
 * @see verbs.ts — URL_PATH_VERB_MAP (terminal-segment → verb, §A2 Rule 2)
 * @see evidence-extractor.ts — consumes this table as urlSemantic evidence
 */

import type { CanonicalVerb } from './verbs.js';
import type { CanonicalObject } from './objects.js';

export interface UrlPatternHint {
  readonly verb?: CanonicalVerb;
  readonly object?: CanonicalObject;
}

export interface UrlPattern {
  readonly pattern: RegExp;
  readonly hint: UrlPatternHint;
}

/**
 * Static URL pattern table evaluated against route templates.
 * Order: specific → general; first match wins.
 */
export const URL_PATTERNS: readonly UrlPattern[] = Object.freeze([
  // ── Auth ─────────────────────────────────────────────────────────────────
  { pattern: /\/(sign-?in|log-?in|auth\/login)\b/i,       hint: { verb: 'login' } },
  { pattern: /\/(sign-?out|log-?out|auth\/logout)\b/i,     hint: { verb: 'logout' } },

  // ── Approval workflows ───────────────────────────────────────────────────
  { pattern: /\/approvals?\/\:id\/approve\b/i,             hint: { verb: 'approve',  object: 'approval' } },
  { pattern: /\/approvals?\/\:id\/reject\b/i,              hint: { verb: 'reject',   object: 'approval' } },
  { pattern: /\/approvals?\b/i,                            hint: { object: 'approval' } },

  // ── Invoices ─────────────────────────────────────────────────────────────
  { pattern: /\/invoices?\/new\b/i,                        hint: { verb: 'create',  object: 'invoice' } },
  { pattern: /\/invoices?\/\:id\/edit\b/i,                 hint: { verb: 'edit',    object: 'invoice' } },
  { pattern: /\/invoices?\/\:id\/submit\b/i,               hint: { verb: 'submit',  object: 'invoice' } },
  { pattern: /\/invoices?\b/i,                             hint: { object: 'invoice' } },

  // ── Orders ───────────────────────────────────────────────────────────────
  { pattern: /\/orders?\/new\b/i,                          hint: { verb: 'create',  object: 'order' } },
  { pattern: /\/orders?\/\:id\/edit\b/i,                   hint: { verb: 'edit',    object: 'order' } },
  { pattern: /\/orders?\b/i,                               hint: { object: 'order' } },

  // ── Contracts ────────────────────────────────────────────────────────────
  { pattern: /\/contracts?\/new\b/i,                       hint: { verb: 'create',  object: 'contract' } },
  { pattern: /\/contracts?\/\:id\/sign\b/i,                hint: { verb: 'sign',    object: 'contract' } },
  { pattern: /\/contracts?\/\:id\/edit\b/i,                hint: { verb: 'edit',    object: 'contract' } },
  { pattern: /\/contracts?\b/i,                            hint: { object: 'contract' } },

  // ── Payments ─────────────────────────────────────────────────────────────
  { pattern: /\/payments?\/new\b/i,                        hint: { verb: 'create',  object: 'payment' } },
  { pattern: /\/payments?\b/i,                             hint: { object: 'payment' } },

  // ── Customers / Accounts / Profiles ──────────────────────────────────────
  { pattern: /\/customers?\/new\b/i,                       hint: { verb: 'create',  object: 'customer' } },
  { pattern: /\/customers?\/\:id\/edit\b/i,                hint: { verb: 'edit',    object: 'customer' } },
  { pattern: /\/customers?\b/i,                            hint: { object: 'customer' } },

  { pattern: /\/accounts?\/new\b/i,                        hint: { verb: 'create',  object: 'account' } },
  { pattern: /\/accounts?\/\:id\/edit\b/i,                 hint: { verb: 'edit',    object: 'account' } },
  { pattern: /\/accounts?\b/i,                             hint: { object: 'account' } },

  { pattern: /\/profiles?\/edit\b/i,                       hint: { verb: 'edit',    object: 'profile' } },
  { pattern: /\/profiles?\b/i,                             hint: { object: 'profile' } },

  // ── Projects ─────────────────────────────────────────────────────────────
  { pattern: /\/projects?\/new\b/i,                        hint: { verb: 'create',  object: 'project' } },
  { pattern: /\/projects?\/\:id\/edit\b/i,                 hint: { verb: 'edit',    object: 'project' } },
  { pattern: /\/projects?\b/i,                             hint: { object: 'project' } },

  // ── Tickets / Issues ─────────────────────────────────────────────────────
  { pattern: /\/tickets?\/new\b/i,                         hint: { verb: 'create',  object: 'ticket' } },
  { pattern: /\/tickets?\/\:id\/edit\b/i,                  hint: { verb: 'edit',    object: 'ticket' } },
  { pattern: /\/tickets?\b/i,                              hint: { object: 'ticket' } },

  { pattern: /\/issues?\/new\b/i,                          hint: { verb: 'create',  object: 'ticket' } },
  { pattern: /\/issues?\b/i,                               hint: { object: 'ticket' } },

  // ── Requests ─────────────────────────────────────────────────────────────
  { pattern: /\/requests?\/new\b/i,                        hint: { verb: 'create',  object: 'request' } },
  { pattern: /\/requests?\b/i,                             hint: { object: 'request' } },

  // ── Tasks ────────────────────────────────────────────────────────────────
  { pattern: /\/tasks?\/new\b/i,                           hint: { verb: 'create',  object: 'task' } },
  { pattern: /\/tasks?\/\:id\/edit\b/i,                    hint: { verb: 'edit',    object: 'task' } },
  { pattern: /\/tasks?\b/i,                                hint: { object: 'task' } },

  // ── Workflows ────────────────────────────────────────────────────────────
  { pattern: /\/workflows?\/new\b/i,                       hint: { verb: 'create',  object: 'workflow' } },
  { pattern: /\/workflows?\b/i,                            hint: { object: 'workflow' } },

  // ── Documents / Files ────────────────────────────────────────────────────
  { pattern: /\/documents?\/new\b/i,                       hint: { verb: 'create',  object: 'document' } },
  { pattern: /\/documents?\/\:id\/edit\b/i,                hint: { verb: 'edit',    object: 'document' } },
  { pattern: /\/documents?\b/i,                            hint: { object: 'document' } },

  { pattern: /\/files?\/upload\b/i,                        hint: { verb: 'upload',  object: 'file' } },
  { pattern: /\/files?\/download\b/i,                      hint: { verb: 'download',object: 'file' } },
  { pattern: /\/files?\b/i,                                hint: { object: 'file' } },

  // ── Reports ──────────────────────────────────────────────────────────────
  { pattern: /\/reports?\/new\b/i,                         hint: { verb: 'create',  object: 'report' } },
  { pattern: /\/reports?\/\:id\/export\b/i,                hint: { verb: 'export',  object: 'report' } },
  { pattern: /\/reports?\b/i,                              hint: { object: 'report' } },

  // ── Dashboards ───────────────────────────────────────────────────────────
  { pattern: /\/dashboards?\b/i,                           hint: { verb: 'navigate',object: 'dashboard' } },

  // ── Messages / Notifications ─────────────────────────────────────────────
  { pattern: /\/messages?\/new\b/i,                        hint: { verb: 'create',  object: 'message' } },
  { pattern: /\/messages?\b/i,                             hint: { object: 'message' } },
  { pattern: /\/notifications?\b/i,                        hint: { object: 'notification' } },

  // ── Settings ─────────────────────────────────────────────────────────────
  { pattern: /\/settings?\b/i,                             hint: { verb: 'navigate',object: 'setting' } },
  { pattern: /\/preferences?\b/i,                          hint: { verb: 'navigate',object: 'setting' } },
  { pattern: /\/configuration\b/i,                         hint: { verb: 'navigate',object: 'setting' } },

  // ── Generic CRUD verbs ────────────────────────────────────────────────────
  { pattern: /\/new\b/i,                                   hint: { verb: 'create' } },
  { pattern: /\/create\b/i,                                hint: { verb: 'create' } },
  { pattern: /\/edit\b/i,                                  hint: { verb: 'edit' } },
  { pattern: /\/delete\b/i,                                hint: { verb: 'delete' } },
  { pattern: /\/upload\b/i,                                hint: { verb: 'upload' } },
  { pattern: /\/download\b/i,                              hint: { verb: 'download' } },
  { pattern: /\/export\b/i,                                hint: { verb: 'export' } },
  { pattern: /\/import\b/i,                                hint: { verb: 'import' } },
  { pattern: /\/search\b/i,                                hint: { verb: 'search' } },
  { pattern: /\/preview\b/i,                               hint: { verb: 'preview' } },
  { pattern: /\/submit\b/i,                                hint: { verb: 'submit' } },
]) as readonly UrlPattern[];

/**
 * Match a route template against the URL pattern table.
 * Returns the first matching hint, or null if no pattern matches.
 */
export function matchUrlPattern(routeTemplate: string): UrlPatternHint | null {
  for (const entry of URL_PATTERNS) {
    if (entry.pattern.test(routeTemplate)) {
      return entry.hint;
    }
  }
  return null;
}
