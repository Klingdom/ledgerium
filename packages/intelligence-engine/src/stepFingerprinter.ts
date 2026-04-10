/**
 * Step / Event Fingerprinter
 *
 * Transforms raw step definitions (from the process engine) into canonical
 * fingerprints that enable cross-workflow step matching. Each fingerprint
 * extracts:
 *   - verb, object, qualifier (parsed from step title + events)
 *   - system, screen context
 *   - event type, target type
 *   - semantic signature for matching
 *   - candidate canonical component mapping
 *
 * Examples:
 *   Raw: "Click send button in Gmail compose modal"
 *   → verb: "send", object: "email", system: "gmail",
 *     event_type: "interaction.click", component: "send_email"
 *
 *   Raw: "Download report CSV from reporting page"
 *   → verb: "download", object: "report", qualifier: "csv",
 *     system: "reporting_app", component: "export_report_csv"
 *
 * Design:
 * - Deterministic: same input → same output
 * - No LLM calls — rule-based parsing only
 * - Fingerprints are privacy-safe (no sensitive field values)
 */

import type { StepDefinition } from '@ledgerium/process-engine';
import type { StepFingerprint } from './groupingTypes.js';

// ─── Verb extraction ────────────────────────────────────────────────────────���

/**
 * Canonical verbs recognized from step titles and event types.
 * Maps raw forms → canonical verb.
 */
const VERB_MAP: Record<string, string> = {
  // Click actions
  click: 'click', clicked: 'click', clicking: 'click',
  press: 'click', pressed: 'click', tap: 'click', tapped: 'click',
  select: 'select', selected: 'select', choose: 'select', chose: 'select', pick: 'select',
  // Navigation
  navigate: 'navigate', navigated: 'navigate', go: 'navigate', open: 'open', opened: 'open',
  visit: 'navigate', visited: 'navigate', browse: 'navigate',
  // Data entry
  enter: 'enter', entered: 'enter', type: 'enter', typed: 'enter',
  input: 'enter', fill: 'fill', filled: 'fill', write: 'enter',
  // Submit / send
  submit: 'submit', submitted: 'submit', send: 'send', sent: 'send',
  post: 'send', posted: 'send',
  // File operations
  upload: 'upload', uploaded: 'upload',
  download: 'download', downloaded: 'download',
  attach: 'attach', attached: 'attach',
  export: 'export', exported: 'export',
  import: 'import', imported: 'import',
  save: 'save', saved: 'save',
  // CRUD
  create: 'create', created: 'create', add: 'create', added: 'create', new: 'create',
  update: 'update', updated: 'update', edit: 'edit', edited: 'edit', modify: 'update',
  delete: 'delete', deleted: 'delete', remove: 'delete', removed: 'delete',
  // Review / verification
  review: 'review', reviewed: 'review', check: 'verify', checked: 'verify',
  verify: 'verify', verified: 'verify', confirm: 'verify', confirmed: 'verify',
  approve: 'approve', approved: 'approve', reject: 'reject', rejected: 'reject',
  // Search
  search: 'search', searched: 'search', find: 'search', found: 'search',
  lookup: 'search', filter: 'filter', filtered: 'filter', sort: 'sort',
  // Communication
  email: 'email', emailed: 'email', notify: 'notify',
  message: 'message', forward: 'forward', reply: 'reply',
  // Configuration
  configure: 'configure', setup: 'configure', set: 'configure',
  enable: 'enable', disable: 'disable', toggle: 'toggle',
  // Misc
  wait: 'wait', scroll: 'scroll', expand: 'expand', collapse: 'collapse',
  close: 'close', closed: 'close', dismiss: 'close',
  copy: 'copy', copied: 'copy', paste: 'paste',
  drag: 'drag', drop: 'drop',
  login: 'login', logout: 'logout', sign: 'sign',
  print: 'print', share: 'share', publish: 'publish',
};

/**
 * Maps event types from the canonical event schema to implied verbs.
 * Used as fallback when the step title doesn't contain a recognized verb.
 */
const EVENT_TYPE_VERB_MAP: Record<string, string> = {
  'interaction.click': 'click',
  'interaction.select': 'select',
  'interaction.input_change': 'enter',
  'interaction.submit': 'submit',
  'interaction.upload_file': 'upload',
  'interaction.download_file': 'download',
  'interaction.keyboard_shortcut': 'shortcut',
  'interaction.drag_started': 'drag',
  'interaction.drag_completed': 'drag',
  'navigation.open_page': 'navigate',
  'navigation.route_change': 'navigate',
  'navigation.tab_activated': 'navigate',
  'navigation.app_context_changed': 'navigate',
  'session.annotation_added': 'annotate',
  'system.modal_opened': 'open',
  'system.modal_closed': 'close',
};

// ─── Object extraction ───────────────────────────────────────────────────────

/**
 * Common UI/business objects recognized from step titles.
 * Maps raw forms → canonical object.
 */
const OBJECT_MAP: Record<string, string> = {
  // UI elements
  button: 'button', btn: 'button', link: 'link', tab: 'tab',
  menu: 'menu', dropdown: 'dropdown', modal: 'modal', dialog: 'modal',
  popup: 'modal', form: 'form', field: 'field', input: 'field',
  checkbox: 'checkbox', radio: 'radio', toggle: 'toggle', switch: 'toggle',
  textarea: 'text_area', page: 'page', panel: 'panel', sidebar: 'sidebar',
  header: 'header', footer: 'footer', table: 'table', row: 'row', cell: 'cell',
  // Business objects
  email: 'email', message: 'message', notification: 'notification',
  report: 'report', document: 'document', doc: 'document', file: 'file',
  spreadsheet: 'spreadsheet', csv: 'csv', pdf: 'pdf',
  invoice: 'invoice', order: 'order', ticket: 'ticket', case: 'case',
  customer: 'customer', client: 'customer', contact: 'contact',
  user: 'user', account: 'account', profile: 'profile',
  project: 'project', task: 'task', item: 'item', record: 'record',
  payment: 'payment', transaction: 'transaction', receipt: 'receipt',
  template: 'template', draft: 'draft',
  comment: 'comment', note: 'note', annotation: 'annotation',
  attachment: 'attachment', image: 'image', photo: 'image',
  dashboard: 'dashboard', chart: 'chart', graph: 'chart',
  setting: 'setting', preference: 'setting', config: 'setting',
  filter: 'filter', search: 'search', query: 'search',
};

// ─── System detection ───────────────────────────────────��────────────────────

/**
 * Infer system from domain or application label.
 * Maps common domains/labels to canonical system names.
 */
const SYSTEM_MAP: Record<string, string> = {
  'gmail': 'gmail', 'mail.google.com': 'gmail',
  'google drive': 'google_drive', 'drive.google.com': 'google_drive',
  'google docs': 'google_docs', 'docs.google.com': 'google_docs',
  'google sheets': 'google_sheets', 'sheets.google.com': 'google_sheets',
  'google calendar': 'google_calendar', 'calendar.google.com': 'google_calendar',
  'slack': 'slack', 'app.slack.com': 'slack',
  'jira': 'jira', 'atlassian.net': 'jira',
  'confluence': 'confluence',
  'salesforce': 'salesforce', 'force.com': 'salesforce', 'lightning.force.com': 'salesforce',
  'hubspot': 'hubspot', 'app.hubspot.com': 'hubspot',
  'notion': 'notion', 'notion.so': 'notion',
  'airtable': 'airtable', 'airtable.com': 'airtable',
  'github': 'github', 'github.com': 'github',
  'gitlab': 'gitlab', 'gitlab.com': 'gitlab',
  'azure devops': 'azure_devops', 'dev.azure.com': 'azure_devops',
  'trello': 'trello', 'trello.com': 'trello',
  'asana': 'asana', 'app.asana.com': 'asana',
  'monday': 'monday', 'monday.com': 'monday',
  'zendesk': 'zendesk', 'zendesk.com': 'zendesk',
  'intercom': 'intercom', 'app.intercom.com': 'intercom',
  'stripe': 'stripe', 'dashboard.stripe.com': 'stripe',
  'shopify': 'shopify', 'admin.shopify.com': 'shopify',
  'quickbooks': 'quickbooks', 'app.qbo.intuit.com': 'quickbooks',
  'outlook': 'outlook', 'outlook.office.com': 'outlook', 'outlook.live.com': 'outlook',
  'teams': 'ms_teams', 'teams.microsoft.com': 'ms_teams',
  'sharepoint': 'sharepoint',
  'linkedin': 'linkedin', 'linkedin.com': 'linkedin',
  'twitter': 'twitter', 'x.com': 'twitter',
  'figma': 'figma', 'figma.com': 'figma',
};

function normalizeSystem(systems: string[], domains: string[]): string | null {
  // Try systems first (application labels from the process engine)
  for (const sys of systems) {
    const lower = sys.toLowerCase();
    if (SYSTEM_MAP[lower]) return SYSTEM_MAP[lower]!;
    // Partial match: if the system label contains a known key
    for (const [key, canonical] of Object.entries(SYSTEM_MAP)) {
      if (lower.includes(key)) return canonical;
    }
  }
  // Try domains
  for (const domain of domains) {
    const lower = domain.toLowerCase();
    if (SYSTEM_MAP[lower]) return SYSTEM_MAP[lower]!;
    for (const [key, canonical] of Object.entries(SYSTEM_MAP)) {
      if (lower.includes(key)) return canonical;
    }
  }
  // Fall back to first system if any
  return systems[0]?.toLowerCase() ?? null;
}

// ─── Label parsing ───────────────────────────────────────────────────────────

interface ParsedLabel {
  verb: string | null;
  object: string | null;
  qualifier: string | null;
  remainingTokens: string[];
}

/**
 * Parse a step title into verb/object/qualifier.
 * Uses a greedy left-to-right scan: first verb, first object, then remaining
 * tokens as qualifier material.
 */
function parseLabel(rawLabel: string): ParsedLabel {
  const normalized = rawLabel
    .toLowerCase()
    .replace(/[_\-./\\]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = normalized.split(' ').filter(t => t.length > 0);

  let verb: string | null = null;
  let verbIndex = -1;
  let object: string | null = null;
  let objectIndex = -1;
  const qualifierTokens: string[] = [];

  // Find verb
  for (let i = 0; i < tokens.length; i++) {
    const mapped = VERB_MAP[tokens[i]!];
    if (mapped) {
      verb = mapped;
      verbIndex = i;
      break;
    }
  }

  // Find object (after verb if found, else from start)
  const objStart = verbIndex >= 0 ? verbIndex + 1 : 0;
  for (let i = objStart; i < tokens.length; i++) {
    const mapped = OBJECT_MAP[tokens[i]!];
    if (mapped) {
      object = mapped;
      objectIndex = i;
      break;
    }
  }

  // Remaining tokens → qualifier candidates
  for (let i = 0; i < tokens.length; i++) {
    if (i === verbIndex || i === objectIndex) continue;
    // Skip noise words in step labels
    const t = tokens[i]!;
    if (['the', 'a', 'an', 'to', 'for', 'in', 'on', 'at', 'of', 'with', 'from'].includes(t)) continue;
    qualifierTokens.push(t);
  }

  return {
    verb,
    object,
    qualifier: qualifierTokens.length > 0 ? qualifierTokens.join(' ') : null,
    remainingTokens: qualifierTokens,
  };
}

// ─── Semantic signature ─────────────────────────────────���────────────────────

/**
 * Build a semantic signature for cross-workflow matching.
 * Format: "verb:object:system:eventType"
 * Null components become "_" to maintain positional consistency.
 */
function buildSemanticSignature(
  verb: string | null,
  object: string | null,
  system: string | null,
  eventType: string | null,
): string {
  return [verb ?? '_', object ?? '_', system ?? '_', eventType ?? '_'].join(':');
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a fingerprint for a single step definition.
 *
 * @param step - The step definition from the process engine
 * @param workflowRunId - ID of the workflow run this step belongs to
 * @param dominantEventType - Most frequent event type in this step (optional)
 * @param targetElementType - Primary target element type (optional)
 * @param screenContext - Route template or page title (optional)
 */
export function fingerprintStep(
  step: StepDefinition,
  workflowRunId: string,
  dominantEventType?: string,
  targetElementType?: string,
  screenContext?: string,
): StepFingerprint {
  // Parse the step title
  const parsed = parseLabel(step.title);

  // Use event type to infer verb if title parsing didn't find one
  let verb = parsed.verb;
  if (!verb && dominantEventType) {
    verb = EVENT_TYPE_VERB_MAP[dominantEventType] ?? null;
  }

  // Infer verb from step category as last resort
  if (!verb) {
    const categoryVerbMap: Record<string, string> = {
      click_then_navigate: 'navigate',
      fill_and_submit: 'submit',
      data_entry: 'enter',
      send_action: 'send',
      file_action: 'file_action',
      error_handling: 'handle_error',
    };
    verb = categoryVerbMap[step.category] ?? null;
  }

  // Detect system from step's systems/domains
  const system = normalizeSystem(step.systems, step.domains);

  // Build semantic signature
  const eventType = dominantEventType ?? null;
  const semanticSig = buildSemanticSignature(verb, parsed.object, system, eventType);

  // Normalized label: lowercase, separator-normalized, trimmed
  const normalizedLabel = step.title
    .toLowerCase()
    .replace(/[_\-./\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    id: `fp-${workflowRunId}-${step.ordinal}`,
    workflowRunId,
    sequenceIndex: step.ordinal,
    rawLabel: step.title,
    normalizedLabel,
    verb,
    object: parsed.object,
    qualifier: parsed.qualifier,
    system,
    screenContext: screenContext ?? null,
    eventType,
    targetType: targetElementType ?? null,
    precedingStepFingerprintId: null, // Linked after all steps are fingerprinted
    followingStepFingerprintId: null,
    optionalityScore: 1.0, // Default: always present (adjusted during group analysis)
    determinismScore: step.confidence,
    semanticSignature: semanticSig,
    canonicalComponentId: null, // Mapped during component detection
    confidence: computeFingerprintConfidence(verb, parsed.object, system, eventType),
  };
}

/**
 * Fingerprint all steps in a workflow and link predecessor/successor chains.
 */
export function fingerprintWorkflowSteps(
  steps: StepDefinition[],
  workflowRunId: string,
  eventTypePerStep?: Map<number, string>,
  targetTypePerStep?: Map<number, string>,
  screenContextPerStep?: Map<number, string>,
): StepFingerprint[] {
  const sorted = [...steps].sort((a, b) => a.ordinal - b.ordinal);

  // First pass: generate fingerprints
  const fingerprints = sorted.map(step =>
    fingerprintStep(
      step,
      workflowRunId,
      eventTypePerStep?.get(step.ordinal),
      targetTypePerStep?.get(step.ordinal),
      screenContextPerStep?.get(step.ordinal),
    ),
  );

  // Second pass: link predecessor/successor
  for (let i = 0; i < fingerprints.length; i++) {
    if (i > 0) {
      fingerprints[i]!.precedingStepFingerprintId = fingerprints[i - 1]!.id;
    }
    if (i < fingerprints.length - 1) {
      fingerprints[i]!.followingStepFingerprintId = fingerprints[i + 1]!.id;
    }
  }

  return fingerprints;
}

// ─── Fingerprint similarity ──────────────────────────────────────────────────

/**
 * Compare two step fingerprints for semantic similarity.
 * Returns 0-1 where 1.0 = identical semantic identity.
 */
export function fingerprintSimilarity(a: StepFingerprint, b: StepFingerprint): number {
  // Identical semantic signature = perfect match
  if (a.semanticSignature === b.semanticSignature) return 1.0;

  let score = 0;
  let maxWeight = 0;

  // Verb match (35% weight)
  maxWeight += 0.35;
  if (a.verb && b.verb && a.verb === b.verb) score += 0.35;

  // Object match (25% weight)
  maxWeight += 0.25;
  if (a.object && b.object && a.object === b.object) score += 0.25;

  // System match (20% weight)
  maxWeight += 0.2;
  if (a.system && b.system && a.system === b.system) score += 0.2;

  // Event type match (10% weight)
  maxWeight += 0.1;
  if (a.eventType && b.eventType && a.eventType === b.eventType) score += 0.1;

  // Target type match (10% weight)
  maxWeight += 0.1;
  if (a.targetType && b.targetType && a.targetType === b.targetType) score += 0.1;

  return maxWeight > 0 ? score : 0;
}

/**
 * Compute sequence-level fingerprint similarity between two ordered arrays.
 * Uses a positional alignment approach: for each position, computes pairwise
 * similarity and averages across the shorter sequence length.
 */
export function sequenceFingerSimilarity(a: StepFingerprint[], b: StepFingerprint[]): number {
  if (a.length === 0 && b.length === 0) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  const minLen = Math.min(a.length, b.length);
  const maxLen = Math.max(a.length, b.length);

  let totalSim = 0;
  for (let i = 0; i < minLen; i++) {
    totalSim += fingerprintSimilarity(a[i]!, b[i]!);
  }

  // Penalize length difference
  const avgSim = totalSim / minLen;
  const lengthPenalty = minLen / maxLen;

  return avgSim * 0.8 + lengthPenalty * 0.2;
}

// ─── Event fingerprint (lightweight) ─────────────────────────────────────────

/**
 * Generate a lightweight event-level fingerprint for sequence hashing.
 * Returns a colon-delimited string: "eventType:targetType:system".
 */
export function fingerprintEvent(
  eventType: string,
  targetType: string | null,
  system: string | null,
): string {
  return [eventType, targetType ?? '_', system ?? '_'].join(':');
}

/**
 * Hash an ordered array of event fingerprints into a single string.
 * Uses a simple join for deterministic comparison.
 */
export function hashEventSequence(eventFingerprints: string[]): string {
  return eventFingerprints.join('|');
}

/**
 * Hash an ordered array of step fingerprints (by semantic signature).
 */
export function hashStepSequence(fingerprints: StepFingerprint[]): string {
  return fingerprints.map(f => f.semanticSignature).join('|');
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Confidence in the fingerprint based on how many fields were successfully parsed.
 */
function computeFingerprintConfidence(
  verb: string | null,
  object: string | null,
  system: string | null,
  eventType: string | null,
): number {
  let parsed = 0;
  let total = 4;
  if (verb) parsed++;
  if (object) parsed++;
  if (system) parsed++;
  if (eventType) parsed++;
  // Minimum confidence of 0.2 (we always have the raw label)
  return Math.max(0.2, parsed / total);
}
