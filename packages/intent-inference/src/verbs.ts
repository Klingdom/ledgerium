/**
 * Canonical verb closed-enum for the intent-inference engine (PATHE-P02).
 *
 * 37-member list per backend-engineer §A2 specification.
 * The spec document lists 37 verbs; the implementation below contains exactly 37.
 *
 * Compile-time exhaustiveness lock: the `_VerbCount` type assertion below
 * will produce a type error if any verb is added or removed without updating
 * the count guard, catching drift at compile time (parallel to PATHE-P01
 * Group A pattern and iter 051 segmentation-engine invariant pattern).
 *
 * @see docs/meta/DECISION_AWARE_WORKFLOW_VISION_REVIEW_001.md §3.6 backend §A2
 */

export const CANONICAL_VERBS = [
  'open',
  'navigate',
  'search',
  'select',
  'enter',
  'upload',
  'download',
  'create',
  'edit',
  'update',
  'delete',
  'submit',
  'confirm',
  'approve',
  'reject',
  'validate',
  'review',
  'cancel',
  'close',
  'dismiss',
  'login',
  'logout',
  'export',
  'import',
  'copy',
  'paste',
  'sort',
  'filter',
  'attach',
  'send',
  'save',
  'preview',
  'sign',
  'escalate',
  'assign',
  'complete',
  'start',
] as const satisfies readonly string[];

export type CanonicalVerb = (typeof CANONICAL_VERBS)[number];

// ── Compile-time count guard ──────────────────────────────────────────────────
// CANONICAL_VERBS must have exactly 37 members.  If verbs are added or removed,
// the `_VerbExhaustive` type will produce a compile-time error.
//
// Usage: if TypeScript reports "Type 'never' does not satisfy..." — update the
// list AND update this comment to reflect the new expected count.
type _VerbListLength = (typeof CANONICAL_VERBS)['length'];
// This type-level assertion will error if the count deviates from 37.
type _VerbCountCheck = 37 extends _VerbListLength ? true : 'INVARIANT VIOLATION: CANONICAL_VERBS must have exactly 37 members';
// Evaluate to keep TS from eliminating as unused:
const _verbCountOk: _VerbCountCheck = true;
void _verbCountOk;

// ── Frozen mirror for runtime exhaustiveness ─────────────────────────────────
/**
 * Frozen array of all canonical verb strings.
 * Use for runtime membership checks: `VERB_SET.has(candidate)`.
 */
export const VERB_SET: ReadonlySet<string> = new Set<string>(CANONICAL_VERBS);

// ── ACTION_VERB_RULES ─────────────────────────────────────────────────────────

/**
 * Priority-ordered text → verb mapping rules.
 *
 * Each rule maps a regex pattern against raw text to a canonical verb.
 * Evaluated in order; first match wins (§A2 Rule 1 — action-button text match).
 *
 * These patterns extend `ACTION_BUTTON_PATTERNS` from `segmentation-engine/src/rules.ts`
 * with explicit verb mappings for intent-inference.
 */
export interface VerbRule {
  readonly pattern: RegExp;
  readonly verb: CanonicalVerb;
}

/**
 * Rules evaluated against element text / aria-label to derive canonical verb.
 * Ordered from most specific to most general.
 */
export const ACTION_VERB_RULES: readonly VerbRule[] = Object.freeze([
  // Completion / destructive actions
  { pattern: /\bsubmit\b/i,   verb: 'submit' },
  { pattern: /\bsend\b/i,     verb: 'send' },
  { pattern: /\bsave\b/i,     verb: 'save' },
  { pattern: /\bdelete\b/i,   verb: 'delete' },
  { pattern: /\bremove\b/i,   verb: 'delete' },
  { pattern: /\barchive\b/i,  verb: 'delete' },
  { pattern: /\bconfirm\b/i,  verb: 'confirm' },
  { pattern: /\bapprove\b/i,  verb: 'approve' },
  { pattern: /\breject\b/i,   verb: 'reject' },
  { pattern: /\bdeny\b/i,     verb: 'reject' },
  { pattern: /\bcancel\b/i,   verb: 'cancel' },
  { pattern: /\bdiscard\b/i,  verb: 'cancel' },
  { pattern: /\bclose\b/i,    verb: 'close' },
  { pattern: /\bdismiss\b/i,  verb: 'dismiss' },
  { pattern: /\bdone\b/i,     verb: 'complete' },
  { pattern: /\bfinish\b/i,   verb: 'complete' },
  { pattern: /\bcomplete\b/i, verb: 'complete' },
  { pattern: /\bpublish\b/i,  verb: 'submit' },
  // Creation
  { pattern: /\bcreate\b/i,   verb: 'create' },
  { pattern: /\badd\b/i,      verb: 'create' },
  { pattern: /\bnew\b/i,      verb: 'create' },
  // File actions
  { pattern: /\bupload\b/i,   verb: 'upload' },
  { pattern: /\bdownload\b/i, verb: 'download' },
  { pattern: /\battach\b/i,   verb: 'attach' },
  { pattern: /\bexport\b/i,   verb: 'export' },
  { pattern: /\bimport\b/i,   verb: 'import' },
  // Viewing / navigation
  { pattern: /\bsearch\b/i,   verb: 'search' },
  { pattern: /\bfilter\b/i,   verb: 'filter' },
  { pattern: /\bsort\b/i,     verb: 'sort' },
  { pattern: /\bpreview\b/i,  verb: 'preview' },
  { pattern: /\bopen\b/i,     verb: 'open' },
  // Edit
  { pattern: /\bedit\b/i,     verb: 'edit' },
  { pattern: /\bupdate\b/i,   verb: 'update' },
  { pattern: /\bmodify\b/i,   verb: 'edit' },
  { pattern: /\brename\b/i,   verb: 'edit' },
  // Auth
  { pattern: /\bsign[\s-]?in\b/i,  verb: 'login' },
  { pattern: /\blog[\s-]?in\b/i,   verb: 'login' },
  { pattern: /\bsign[\s-]?out\b/i, verb: 'logout' },
  { pattern: /\blog[\s-]?out\b/i,  verb: 'logout' },
  // Workflow actions
  { pattern: /\bescalate\b/i,  verb: 'escalate' },
  { pattern: /\bassign\b/i,    verb: 'assign' },
  { pattern: /\bvalidate\b/i,  verb: 'validate' },
  { pattern: /\breview\b/i,    verb: 'review' },
  { pattern: /\bsign\b/i,      verb: 'sign' },
  { pattern: /\bcopy\b/i,      verb: 'copy' },
  { pattern: /\bpaste\b/i,     verb: 'paste' },
  { pattern: /\bstart\b/i,     verb: 'start' },
  // Input
  { pattern: /\benter\b/i,    verb: 'enter' },
  { pattern: /\btype\b/i,     verb: 'enter' },
  { pattern: /\bfill\b/i,     verb: 'enter' },
  // Selection
  { pattern: /\bselect\b/i,   verb: 'select' },
  { pattern: /\bchoose\b/i,   verb: 'select' },
  { pattern: /\bpick\b/i,     verb: 'select' },
  { pattern: /\bcheck\b/i,    verb: 'select' },
]) as readonly VerbRule[];

// ── URL_PATH_VERB_MAP ─────────────────────────────────────────────────────────

/**
 * URL terminal path segment → canonical verb mapping (§A2 Rule 2).
 * Evaluated against the last non-empty segment of a route template.
 * Keys are lowercase; segment is lowercased before lookup.
 */
export const URL_PATH_VERB_MAP: Readonly<Record<string, CanonicalVerb>> = {
  new:      'create',
  create:   'create',
  add:      'create',
  edit:     'edit',
  update:   'update',
  delete:   'delete',
  remove:   'delete',
  approve:  'approve',
  reject:   'reject',
  confirm:  'confirm',
  submit:   'submit',
  search:   'search',
  upload:   'upload',
  download: 'download',
  export:   'export',
  import:   'import',
  preview:  'preview',
  review:   'review',
  login:    'login',
  logout:   'logout',
  signin:   'login',
  signout:  'logout',
  assign:   'assign',
  complete: 'complete',
  close:    'close',
  cancel:   'cancel',
};

// ── CANONICAL_EVENT_TYPE_VERB_MAP ─────────────────────────────────────────────

/**
 * Canonical event type → default verb when no other evidence fires (§A2 Rule 4).
 */
export const CANONICAL_EVENT_TYPE_VERB_MAP: Readonly<Record<string, CanonicalVerb>> = {
  'interaction.click':        'select',
  'interaction.submit':       'submit',
  'interaction.input_change': 'enter',
  'interaction.select':       'select',
  'interaction.upload_file':  'upload',
  'interaction.download_file':'download',
  'interaction.keyboard_shortcut': 'select',
  'navigation.open_page':     'navigate',
  'navigation.route_change':  'navigate',
  'navigation.tab_activated': 'navigate',
};
