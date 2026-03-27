/**
 * Core normalization engine: transforms raw browser-captured events into
 * structured canonical events, applying policy (block/redact) inline.
 *
 * All external package imports are avoided deliberately — types and minimal
 * policy logic are defined locally until packages are fully linked.
 */

import {
  normalizeUrl,
  extractDomain,
  deriveRouteTemplate,
  deriveApplicationLabel,
} from './url-normalizer.js';

// ---------------------------------------------------------------------------
// Local type definitions (mirror schema — kept in sync manually until linked)
// ---------------------------------------------------------------------------

export interface RawEvent {
  raw_event_id: string;
  session_id: string;
  t_ms: number;
  t_wall: string;
  event_type: string;
  url?: string;
  url_normalized?: string;
  page_title?: string;
  target_selector?: string;
  target_label?: string;
  target_role?: string;
  target_element_type?: string;
  is_sensitive_target?: boolean;
  value_present?: boolean;
  annotation_text?: string;
  schema_version: string;
}

export interface PolicyDecision {
  outcome: 'allow' | 'block' | 'redact';
  reason: string;
  redactionApplied: boolean;
}

export interface CanonicalEvent {
  event_id: string;
  schema_version: '1.0.0';
  session_id: string;
  t_ms: number;
  t_wall: string;
  event_type: string;
  actor_type: 'human' | 'system' | 'recorder';
  page_context?: {
    url: string;
    urlNormalized: string;
    domain: string;
    routeTemplate: string;
    pageTitle: string;
    applicationLabel: string;
    moduleLabel?: string;
  };
  target_summary?: {
    selector?: string;
    selectorConfidence?: number;
    label?: string;
    role?: string;
    elementType?: string;
    isSensitive: boolean;
    sensitivityClass?: string;
  };
  normalization_meta: {
    sourceEventId: string;
    sourceEventType: string;
    normalizationRuleVersion: string;
    redactionApplied: boolean;
    redactionReason?: string;
  };
  annotation_text?: string;
}

export interface PolicyLogEntry {
  sessionId: string;
  eventId: string;
  t_ms: number;
  outcome: 'allow' | 'block' | 'redact';
  reason: string;
}

export interface NormalizationResult {
  events: CanonicalEvent[];
  policyLog: PolicyLogEntry[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const NORMALIZATION_RULE_VERSION = '1.0.0' as const;

export const RAW_TO_CANONICAL_TYPE: Record<string, string> = {
  // Navigation
  tab_activated:      'navigation.tab_activated',
  url_changed:        'navigation.open_page',
  page_loaded:        'navigation.open_page',
  spa_route_changed:  'navigation.route_change',
  // Interaction
  click:              'interaction.click',
  dblclick:           'interaction.click',
  input_changed:      'interaction.input_change',
  form_submitted:     'interaction.submit',
  element_focused:    'interaction.input_change',
  element_blurred:    'interaction.input_change',
  keyboard_intent:    'interaction.keyboard_shortcut',
  drag_started:       'interaction.drag_started',
  drag_completed:     'interaction.drag_completed',
  // System — window / visibility
  window_blurred:     'system.window_blurred',
  window_focused:     'system.window_focused',
  visibility_changed: 'system.visibility_changed',
  // System — UI state changes
  modal_opened:       'system.modal_opened',
  modal_closed:       'system.modal_closed',
  toast_shown:        'system.toast_shown',
  loading_started:    'system.loading_started',
  loading_finished:   'system.loading_finished',
  error_displayed:    'system.error_displayed',
  status_changed:     'system.status_changed',
  // Session lifecycle
  session_start:      'session.started',
  session_pause:      'session.paused',
  session_resume:     'session.resumed',
  session_stop:       'session.stopped',
  user_annotation:    'session.annotation_added',
};

// ---------------------------------------------------------------------------
// Inline policy helpers (minimal — full policy-engine not linked yet)
// ---------------------------------------------------------------------------

const SENSITIVE_SELECTOR_RE = /password|passwd|secret|token|api[_-]?key|credit|cvv|ssn/i;

/**
 * Returns true when the raw event's target should be treated as sensitive
 * and its content redacted.
 */
function isSensitiveTarget(raw: RawEvent): boolean {
  if (raw.is_sensitive_target === true) return true;
  if (raw.target_element_type?.toLowerCase() === 'password') return true;
  if (
    raw.target_selector !== undefined &&
    SENSITIVE_SELECTOR_RE.test(raw.target_selector)
  ) {
    return true;
  }
  return false;
}

/**
 * Returns true when capture from the event's domain should be blocked
 * entirely (no canonical event produced, policy log entry written instead).
 */
function shouldBlock(raw: RawEvent, blockedDomains: string[]): boolean {
  if (blockedDomains.length === 0) return false;
  const domain = raw.url !== undefined ? extractDomain(raw.url) : '';
  if (domain === '') return false;
  return blockedDomains.some(
    (blocked) => domain === blocked || domain.endsWith(`.${blocked}`),
  );
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/**
 * Generates a UUID v4 string.
 * Uses the platform crypto API when available; falls back to a pseudo-random
 * implementation suitable for non-security-critical ID generation.
 */
export function generateEventId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  // Fallback: construct a UUID-shaped string from Math.random.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Actor-type derivation
// ---------------------------------------------------------------------------

const RECORDER_EVENT_PREFIXES = ['session.'];

function deriveActorType(
  canonicalType: string,
): 'human' | 'system' | 'recorder' {
  if (RECORDER_EVENT_PREFIXES.some((p) => canonicalType.startsWith(p))) {
    return 'recorder';
  }
  if (canonicalType.startsWith('system.')) {
    return 'system';
  }
  return 'human';
}

// ---------------------------------------------------------------------------
// Page context builder
// ---------------------------------------------------------------------------

function buildPageContext(
  raw: RawEvent,
): CanonicalEvent['page_context'] | undefined {
  if (raw.url === undefined && raw.url_normalized === undefined) {
    return undefined;
  }

  const rawUrl = raw.url ?? '';
  const normalizedUrl =
    raw.url_normalized !== undefined
      ? raw.url_normalized
      : normalizeUrl(rawUrl);
  const domain = extractDomain(normalizedUrl || rawUrl);

  let pathname = '';
  try {
    pathname = new URL(normalizedUrl || rawUrl).pathname;
  } catch {
    // best-effort
  }

  const routeTemplate = deriveRouteTemplate(pathname);
  const applicationLabel = deriveApplicationLabel(domain);

  return {
    url: rawUrl,
    urlNormalized: normalizedUrl,
    domain,
    routeTemplate,
    pageTitle: raw.page_title ?? '',
    applicationLabel,
  };
}

// ---------------------------------------------------------------------------
// normalizeEvent
// ---------------------------------------------------------------------------

export function normalizeEvent(
  raw: RawEvent,
  blockedDomains: string[] = [],
  allowedDomains: string[] = [],
): {
  canonical: CanonicalEvent | null;
  policyEntry: PolicyLogEntry | null;
  warning?: string;
} {
  // 1. Map raw type → canonical type.
  const canonicalType = RAW_TO_CANONICAL_TYPE[raw.event_type];
  if (canonicalType === undefined) {
    return {
      canonical: null,
      policyEntry: null,
      warning: `Unknown event_type "${raw.event_type}" — skipped (raw_event_id=${raw.raw_event_id})`,
    };
  }

  // 2. Domain block check.
  if (shouldBlock(raw, blockedDomains)) {
    const domain = raw.url !== undefined ? extractDomain(raw.url) : 'unknown';
    const blockedEvent: CanonicalEvent = {
      event_id: generateEventId(),
      schema_version: '1.0.0',
      session_id: raw.session_id,
      t_ms: raw.t_ms,
      t_wall: raw.t_wall,
      event_type: 'system.capture_blocked',
      actor_type: 'system',
      normalization_meta: {
        sourceEventId: raw.raw_event_id,
        sourceEventType: raw.event_type,
        normalizationRuleVersion: NORMALIZATION_RULE_VERSION,
        redactionApplied: false,
        redactionReason: `Domain blocked: ${domain}`,
      },
    };
    const policyEntry: PolicyLogEntry = {
      sessionId: raw.session_id,
      eventId: raw.raw_event_id,
      t_ms: raw.t_ms,
      outcome: 'block',
      reason: `Domain blocked: ${domain}`,
    };
    return { canonical: blockedEvent, policyEntry };
  }

  // 2b. Allowed domain list — non-empty list means only listed domains are captured.
  // Events without a URL (e.g. session lifecycle events) bypass this check.
  if (allowedDomains.length > 0 && raw.url !== undefined && raw.url !== '') {
    const domain = extractDomain(raw.url);
    if (
      domain !== '' &&
      !allowedDomains.some((a) => domain === a || domain.endsWith(`.${a}`))
    ) {
      const blockedEvent: CanonicalEvent = {
        event_id: generateEventId(),
        schema_version: '1.0.0',
        session_id: raw.session_id,
        t_ms: raw.t_ms,
        t_wall: raw.t_wall,
        event_type: 'system.capture_blocked',
        actor_type: 'system',
        normalization_meta: {
          sourceEventId: raw.raw_event_id,
          sourceEventType: raw.event_type,
          normalizationRuleVersion: NORMALIZATION_RULE_VERSION,
          redactionApplied: false,
          redactionReason: `Domain not in allowed list: ${domain}`,
        },
      };
      const policyEntry: PolicyLogEntry = {
        sessionId: raw.session_id,
        eventId: raw.raw_event_id,
        t_ms: raw.t_ms,
        outcome: 'block',
        reason: `Domain not in allowed list: ${domain}`,
      };
      return { canonical: blockedEvent, policyEntry };
    }
  }

  // 3. Sensitivity check.
  const sensitive = isSensitiveTarget(raw);
  let redactionApplied = false;
  let redactionReason: string | undefined;
  let canonicalEventType = canonicalType;

  if (sensitive) {
    redactionApplied = true;
    redactionReason = 'Sensitive target — label and value redacted';
    canonicalEventType = 'system.redaction_applied';
  }

  // 4. Page context.
  const pageContext = buildPageContext(raw);

  // 5. Target summary (omit label/value when redacted).
  let targetSummary: CanonicalEvent['target_summary'] | undefined;
  if (
    raw.target_selector !== undefined ||
    raw.target_label !== undefined ||
    raw.target_role !== undefined ||
    raw.target_element_type !== undefined
  ) {
    targetSummary = {
      selector: raw.target_selector,
      selectorConfidence: raw.target_selector !== undefined ? 1.0 : undefined,
      label: redactionApplied ? undefined : raw.target_label,
      role: raw.target_role,
      elementType: raw.target_element_type,
      isSensitive: sensitive,
      sensitivityClass: sensitive ? 'credential' : undefined,
    };
  }

  // 6. Actor type.
  const actorType = deriveActorType(canonicalEventType);

  // 7. Build canonical event.
  const canonical: CanonicalEvent = {
    event_id: generateEventId(),
    schema_version: '1.0.0',
    session_id: raw.session_id,
    t_ms: raw.t_ms,
    t_wall: raw.t_wall,
    event_type: canonicalEventType,
    actor_type: actorType,
    ...(pageContext !== undefined && { page_context: pageContext }),
    ...(targetSummary !== undefined && { target_summary: targetSummary }),
    normalization_meta: {
      sourceEventId: raw.raw_event_id,
      sourceEventType: raw.event_type,
      normalizationRuleVersion: NORMALIZATION_RULE_VERSION,
      redactionApplied,
      ...(redactionReason !== undefined && { redactionReason }),
    },
    ...(raw.annotation_text !== undefined && {
      annotation_text: raw.annotation_text,
    }),
  };

  const policyEntry: PolicyLogEntry | null = sensitive
    ? {
        sessionId: raw.session_id,
        eventId: raw.raw_event_id,
        t_ms: raw.t_ms,
        outcome: 'redact',
        reason: redactionReason ?? 'Sensitive target',
      }
    : null;

  return { canonical, policyEntry };
}

// ---------------------------------------------------------------------------
// normalizeSession
// ---------------------------------------------------------------------------

/**
 * Normalizes an ordered array of raw events for a single session.
 *
 * Deduplication rules applied before normalization:
 *  - Rapid duplicate clicks on the same selector within 300 ms are collapsed.
 *  - `element_focused` / `element_blurred` pairs where a focus event is
 *    immediately followed by another focus (net-zero focus change) are
 *    dropped.
 */
export function normalizeSession(
  rawEvents: RawEvent[],
  blockedDomains: string[] = [],
  allowedDomains: string[] = [],
): NormalizationResult {
  const events: CanonicalEvent[] = [];
  const policyLog: PolicyLogEntry[] = [];
  const warnings: string[] = [];

  // -- Pre-processing: deduplication pass ----------------------------------

  const deduplicated: RawEvent[] = [];

  for (let i = 0; i < rawEvents.length; i++) {
    const current = rawEvents[i]!;

    // Rapid duplicate click deduplication
    if (
      (current.event_type === 'click' || current.event_type === 'dblclick') &&
      current.target_selector !== undefined
    ) {
      const prev = deduplicated[deduplicated.length - 1];
      if (
        prev !== undefined &&
        (prev.event_type === 'click' || prev.event_type === 'dblclick') &&
        prev.target_selector === current.target_selector &&
        current.t_ms - prev.t_ms < 300
      ) {
        // Skip this duplicate click.
        continue;
      }
    }

    // Collapse element_focused when immediately followed by another focus.
    if (current.event_type === 'element_focused') {
      const next = rawEvents[i + 1];
      if (next !== undefined && next.event_type === 'element_focused') {
        // This focus is immediately superseded — skip it.
        continue;
      }
    }

    // Drop isolated element_blurred that follow immediately after a focus
    // with no intervening input (net-zero interaction).
    if (current.event_type === 'element_blurred') {
      const prev = deduplicated[deduplicated.length - 1];
      if (prev !== undefined && prev.event_type === 'element_focused') {
        // Focus → immediate blur with no input — discard both.
        deduplicated.pop();
        continue;
      }
    }

    deduplicated.push(current);
  }

  // -- Normalization pass ---------------------------------------------------

  for (const raw of deduplicated) {
    const { canonical, policyEntry, warning } = normalizeEvent(
      raw,
      blockedDomains,
      allowedDomains,
    );

    if (warning !== undefined) {
      warnings.push(warning);
    }

    if (canonical !== null) {
      events.push(canonical);
    }

    if (policyEntry !== null) {
      policyLog.push(policyEntry);
    }
  }

  return { events, policyLog, warnings };
}
