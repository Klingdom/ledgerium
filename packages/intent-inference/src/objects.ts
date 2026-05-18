/**
 * Canonical object closed-enum for the intent-inference engine (PATHE-P02).
 *
 * 24-member list per backend-engineer §A3 specification.
 *
 * Compile-time exhaustiveness lock via `_ObjectCountCheck` (parallel to verbs.ts).
 *
 * @see docs/meta/DECISION_AWARE_WORKFLOW_VISION_REVIEW_001.md §3.6 backend §A3
 */

export const CANONICAL_OBJECTS = [
  'customer',
  'invoice',
  'order',
  'approval',
  'document',
  'record',
  'report',
  'dashboard',
  'search',
  'form',
  'modal',
  'task',
  'ticket',
  'request',
  'contract',
  'payment',
  'profile',
  'account',
  'project',
  'workflow',
  'file',
  'message',
  'notification',
  'setting',
] as const satisfies readonly string[];

export type CanonicalObject = (typeof CANONICAL_OBJECTS)[number];

// ── Compile-time count guard ──────────────────────────────────────────────────
type _ObjectListLength = (typeof CANONICAL_OBJECTS)['length'];
type _ObjectCountCheck = 24 extends _ObjectListLength ? true : 'INVARIANT VIOLATION: CANONICAL_OBJECTS must have exactly 24 members';
const _objectCountOk: _ObjectCountCheck = true;
void _objectCountOk;

// ── Frozen runtime set ───────────────────────────────────────────────────────
/**
 * Frozen set of all canonical object strings for runtime membership checks.
 */
export const OBJECT_SET: ReadonlySet<string> = new Set<string>(CANONICAL_OBJECTS);

// ── OBJECT_EXTRACTION_RULES ───────────────────────────────────────────────────

/**
 * Text → object mapping rules.
 * Evaluated against raw text (page title, element text, applicationLabel).
 * First match wins.
 */
export interface ObjectRule {
  readonly pattern: RegExp;
  readonly object: CanonicalObject;
}

export const OBJECT_EXTRACTION_RULES: readonly ObjectRule[] = Object.freeze([
  { pattern: /\bcustomer(s)?\b/i,     object: 'customer' },
  { pattern: /\bclient(s)?\b/i,       object: 'customer' },
  { pattern: /\binvoice(s)?\b/i,      object: 'invoice' },
  { pattern: /\bbill(s|ing)?\b/i,     object: 'invoice' },
  { pattern: /\bpayment(s)?\b/i,      object: 'payment' },
  { pattern: /\border(s)?\b/i,        object: 'order' },
  { pattern: /\bpurchase(s)?\b/i,     object: 'order' },
  { pattern: /\bapproval(s)?\b/i,     object: 'approval' },
  { pattern: /\bapprove\b/i,          object: 'approval' },
  { pattern: /\bdocument(s)?\b/i,     object: 'document' },
  { pattern: /\bdoc(s)?\b/i,          object: 'document' },
  { pattern: /\breport(s)?\b/i,       object: 'report' },
  { pattern: /\bdashboard(s)?\b/i,    object: 'dashboard' },
  { pattern: /\bsearch\b/i,           object: 'search' },
  { pattern: /\bform(s)?\b/i,         object: 'form' },
  { pattern: /\bmodal\b/i,            object: 'modal' },
  { pattern: /\bdialog\b/i,           object: 'modal' },
  { pattern: /\btask(s)?\b/i,         object: 'task' },
  { pattern: /\bticket(s)?\b/i,       object: 'ticket' },
  { pattern: /\bissue(s)?\b/i,        object: 'ticket' },
  { pattern: /\brequest(s)?\b/i,      object: 'request' },
  { pattern: /\bcontract(s)?\b/i,     object: 'contract' },
  { pattern: /\bagreement(s)?\b/i,    object: 'contract' },
  { pattern: /\bprofile(s)?\b/i,      object: 'profile' },
  { pattern: /\baccount(s)?\b/i,      object: 'account' },
  { pattern: /\bproject(s)?\b/i,      object: 'project' },
  { pattern: /\bworkflow(s)?\b/i,     object: 'workflow' },
  { pattern: /\bfile(s)?\b/i,         object: 'file' },
  { pattern: /\battachment(s)?\b/i,   object: 'file' },
  { pattern: /\bmessage(s)?\b/i,      object: 'message' },
  { pattern: /\bemail(s)?\b/i,        object: 'message' },
  { pattern: /\bnotification(s)?\b/i, object: 'notification' },
  { pattern: /\balert(s)?\b/i,        object: 'notification' },
  { pattern: /\bsetting(s)?\b/i,      object: 'setting' },
  { pattern: /\bpreference(s)?\b/i,   object: 'setting' },
  { pattern: /\bconfiguration\b/i,    object: 'setting' },
  { pattern: /\brecord(s)?\b/i,       object: 'record' },
  { pattern: /\bentry\b/i,            object: 'record' },
]) as readonly ObjectRule[];
