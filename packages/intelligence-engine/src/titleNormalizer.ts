/**
 * Workflow Title Normalizer
 *
 * Transforms raw workflow titles into structured, canonical forms for grouping.
 * Produces two signatures per title:
 *   - familySignature: action + entity + artifact (ignores qualifier)
 *   - exactSignature: action + entity + artifact + qualifier
 *
 * This powers both exact group detection (identical exactSignature) and
 * family detection (identical familySignature with different qualifiers).
 *
 * Example:
 *   "Email Customer World Cities Report"
 *     → action: "email", entity: "customer", artifact: "cities report"
 *     → qualifier: "world"
 *     → familySignature: "email:customer:cities report"
 *     → exactSignature: "email:customer:cities report:world"
 *
 *   "Email Customer US Cities Report"
 *     → same familySignature, different exactSignature
 *     → grouped into the same family, different exact groups
 *
 * Design:
 * - Deterministic: same input → same output, always
 * - Conservative: preserves business-significant tokens; only removes
 *   known noise words when safe
 * - No external dependencies (no NLP libraries, no LLM calls)
 */

import type { NormalizedTitle } from './groupingTypes.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Words that carry no process-discriminating information and can be removed
 * when they appear as standalone tokens (not as part of a compound noun).
 */
const NOISE_TOKENS = new Set([
  'the', 'a', 'an', 'to', 'for', 'in', 'on', 'at', 'of', 'with', 'from',
  'and', 'or', 'but', 'by', 'via', 'into', 'onto', 'using', 'through',
  'then', 'next', 'step', 'task', 'process', 'workflow', 'run',
]);

/**
 * Known action verbs. Order matters: first match wins when the title
 * starts with one of these. Keep alphabetically sorted within groups.
 */
const ACTION_VERBS = new Set([
  // Communication
  'email', 'send', 'notify', 'message', 'forward', 'reply', 'broadcast',
  // CRUD
  'create', 'add', 'new', 'insert', 'build', 'generate', 'make',
  'update', 'edit', 'modify', 'change', 'adjust', 'revise',
  'delete', 'remove', 'archive', 'deactivate', 'cancel',
  'read', 'view', 'open', 'check', 'review', 'inspect', 'verify', 'audit',
  // Data movement
  'upload', 'download', 'export', 'import', 'sync', 'transfer', 'migrate',
  'copy', 'move', 'backup', 'restore',
  // Processing
  'process', 'run', 'execute', 'submit', 'approve', 'reject', 'escalate',
  'assign', 'route', 'schedule', 'complete', 'close', 'finalize',
  // Search / navigation
  'search', 'find', 'lookup', 'navigate', 'browse', 'filter', 'sort',
  // Configuration
  'configure', 'setup', 'set', 'enable', 'disable', 'install', 'deploy',
  // Reporting
  'report', 'summarize', 'analyze', 'calculate', 'compute', 'aggregate',
  // File operations
  'attach', 'detach', 'print', 'scan', 'sign', 'share', 'publish',
  // Onboarding
  'onboard', 'register', 'enroll', 'activate', 'invite', 'welcome',
  // Login / auth
  'login', 'logout', 'authenticate', 'authorize',
]);

/**
 * Tokens that look like parameters — qualifiers that distinguish
 * instances of the same process (regions, IDs, dates, etc.).
 * These get extracted into the qualifier field.
 */
const PARAMETER_PATTERNS: RegExp[] = [
  // Geographic: "US", "EMEA", "APAC", "EU", country codes
  /^(?:us|usa|uk|eu|emea|apac|latam|na|sa|anz|mea|global|world|domestic|international)$/i,
  // Common region/locale qualifiers
  /^(?:north|south|east|west|central|eastern|western|northern|southern)$/i,
  // Date-like: "Q1", "2024", "Jan", "FY25"
  /^(?:q[1-4]|fy\d{2,4}|h[12]|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})$/i,
  // Numeric IDs: "#123", "ID-456"
  /^(?:#?\d+|id-?\d+)$/i,
  // Version-like: "v1", "v2.0"
  /^v\d+(?:\.\d+)*$/i,
  // Size/tier qualifiers
  /^(?:small|medium|large|xl|xxl|tier[- ]?\d|level[- ]?\d)$/i,
  // Status qualifiers
  /^(?:draft|final|pending|approved|archived|active|inactive)$/i,
];

/**
 * Known entity nouns that help identify the target of an action.
 * Used to separate entity from artifact in ambiguous titles.
 */
const ENTITY_NOUNS = new Set([
  'customer', 'client', 'user', 'employee', 'vendor', 'supplier',
  'partner', 'lead', 'contact', 'account', 'member', 'patient',
  'student', 'candidate', 'applicant', 'manager', 'admin', 'agent',
  'team', 'group', 'department', 'organization', 'company',
  'order', 'invoice', 'ticket', 'case', 'request', 'claim',
  'project', 'campaign', 'event', 'meeting', 'appointment',
]);

// ─── Separator normalization ─────────────────────────────────────────────────

/**
 * Normalize separators: underscores, hyphens, dots, camelCase splits →
 * single spaces. Collapses multiple spaces.
 */
function normalizeSeparators(input: string): string {
  // Insert space before uppercase letters in camelCase/PascalCase
  let result = input.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Replace common separators with spaces
  result = result.replace(/[_\-./\\]+/g, ' ');
  // Collapse multiple spaces
  result = result.replace(/\s+/g, ' ');
  return result.trim();
}

// ─── Plural normalization ────────────────────────────────────────────────────

/**
 * Very conservative singular normalization.
 * Only handles the safest English plural rules to avoid mangling words.
 */
function toSingular(word: string): string {
  const lower = word.toLowerCase();
  // Don't singularize short words — too risky
  if (lower.length <= 3) return lower;
  // Don't touch words that are already known vocabulary
  if (ACTION_VERBS.has(lower) || ENTITY_NOUNS.has(lower)) return lower;
  // "cities" → "city", "entries" → "entry"
  if (lower.endsWith('ies') && lower.length > 4) {
    return lower.slice(0, -3) + 'y';
  }
  // "processes" → "process", "addresses" → "address"
  if (lower.endsWith('sses')) return lower.slice(0, -2);
  if (lower.endsWith('ses') && lower.length > 5) return lower.slice(0, -1);
  // "reports" → "report", "emails" → "email"
  if (lower.endsWith('s') && !lower.endsWith('ss') && !lower.endsWith('us') && !lower.endsWith('is')) {
    return lower.slice(0, -1);
  }
  return lower;
}

// ─── Parameter detection ─────────────────────────────────────────────────────

function isParameterToken(token: string): boolean {
  return PARAMETER_PATTERNS.some(p => p.test(token));
}

// ─── Core normalizer ─────────────────────────────────────────────────────────

/**
 * Parse a raw workflow title into structured components.
 *
 * Strategy:
 * 1. Normalize separators and casing
 * 2. Tokenize
 * 3. Remove noise tokens
 * 4. Extract action (first recognized verb)
 * 5. Extract entity (first recognized entity noun after action)
 * 6. Extract qualifiers (parameter-like tokens)
 * 7. Remaining tokens form the artifact
 * 8. Build signatures
 */
export function normalizeTitle(raw: string): NormalizedTitle {
  if (!raw || raw.trim().length === 0) {
    return {
      raw,
      normalized: '',
      action: null,
      entity: null,
      artifact: null,
      qualifier: null,
      businessContext: null,
      familySignature: '',
      exactSignature: '',
    };
  }

  // Step 1: Normalize separators and case
  const separated = normalizeSeparators(raw);
  const normalized = separated.toLowerCase().trim();

  // Step 2: Tokenize
  const allTokens = normalized.split(/\s+/).filter(t => t.length > 0);

  // Step 3: Remove noise tokens (but preserve if it's the only token left)
  const meaningfulTokens = allTokens.filter(t => !NOISE_TOKENS.has(t));
  const tokens = meaningfulTokens.length > 0 ? meaningfulTokens : allTokens;

  // Step 4: Extract action (first recognized verb)
  let action: string | null = null;
  let actionIndex = -1;
  for (let i = 0; i < tokens.length; i++) {
    const singular = toSingular(tokens[i]!);
    if (ACTION_VERBS.has(singular)) {
      action = singular;
      actionIndex = i;
      break;
    }
  }

  // Step 5: Extract entity (first recognized entity noun after action)
  let entity: string | null = null;
  let entityIndex = -1;
  const searchStart = actionIndex >= 0 ? actionIndex + 1 : 0;
  for (let i = searchStart; i < tokens.length; i++) {
    const singular = toSingular(tokens[i]!);
    if (ENTITY_NOUNS.has(singular)) {
      entity = singular;
      entityIndex = i;
      break;
    }
  }

  // Step 6: Extract qualifiers (parameter-like tokens)
  const qualifiers: string[] = [];
  const artifactTokens: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    if (i === actionIndex || i === entityIndex) continue;
    const token = tokens[i]!;
    if (isParameterToken(token)) {
      qualifiers.push(token.toLowerCase());
    } else {
      artifactTokens.push(toSingular(token));
    }
  }

  // Step 7: Build artifact from remaining tokens
  const artifact = artifactTokens.length > 0 ? artifactTokens.join(' ') : null;
  const qualifier = qualifiers.length > 0 ? qualifiers.sort().join(' ') : null;

  // Step 8: Build signatures
  const familyParts = [action ?? '', entity ?? '', artifact ?? ''].filter(p => p.length > 0);
  const familySignature = familyParts.join(':');

  const exactParts = [...familyParts];
  if (qualifier) exactParts.push(qualifier);
  const exactSignature = exactParts.join(':');

  return {
    raw,
    normalized,
    action,
    entity,
    artifact,
    qualifier,
    businessContext: null, // Reserved for future enrichment
    familySignature,
    exactSignature,
  };
}

// ─── Batch normalization ─────────────────────────────────────────────────────

/**
 * Normalize an array of titles. Returns results in the same order.
 */
export function normalizeTitles(titles: string[]): NormalizedTitle[] {
  return titles.map(normalizeTitle);
}

// ─── Signature similarity ────────────────────────────────────────────────────

/**
 * Compare two normalized titles for family-level similarity.
 * Returns a score 0-1 where:
 *   1.0 = identical family signatures
 *   0.8+ = same action+entity, similar artifact
 *   0.5+ = partial overlap
 *   0.0 = no overlap
 */
export function titleFamilySimilarity(a: NormalizedTitle, b: NormalizedTitle): number {
  // Identical family signature = 1.0
  if (a.familySignature === b.familySignature) return 1.0;

  let score = 0;
  let maxScore = 0;

  // Action match (40% weight)
  maxScore += 0.4;
  if (a.action && b.action && a.action === b.action) {
    score += 0.4;
  }

  // Entity match (30% weight)
  maxScore += 0.3;
  if (a.entity && b.entity && a.entity === b.entity) {
    score += 0.3;
  }

  // Artifact similarity (30% weight) — token overlap
  maxScore += 0.3;
  if (a.artifact && b.artifact) {
    const tokensA = new Set(a.artifact.split(' '));
    const tokensB = new Set(b.artifact.split(' '));
    const intersection = [...tokensA].filter(t => tokensB.has(t)).length;
    const union = new Set([...tokensA, ...tokensB]).size;
    if (union > 0) {
      score += 0.3 * (intersection / union);
    }
  }

  return maxScore > 0 ? score / maxScore * 1.0 : 0;
}

/**
 * Check whether two titles are parameterized variants of the same process.
 * Returns true if they have the same familySignature but different qualifiers.
 * This is the key signal for family grouping.
 */
export function isParameterizedVariant(a: NormalizedTitle, b: NormalizedTitle): boolean {
  if (a.familySignature.length === 0 || b.familySignature.length === 0) return false;
  return (
    a.familySignature === b.familySignature &&
    a.exactSignature !== b.exactSignature
  );
}
