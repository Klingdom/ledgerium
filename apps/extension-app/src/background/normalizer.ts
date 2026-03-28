import type { RawEvent, CanonicalEvent, PolicyLogEntry } from '../shared/types.js'
import { generateId, normalizeUrl, extractDomain, deriveRouteTemplate, deriveAppLabel } from '../shared/utils.js'
import { SCHEMA_VERSION } from '../shared/constants.js'

const NORMALIZATION_RULE_VERSION = '1.0.0'

const RAW_TO_CANONICAL: Record<string, string> = {
  // Navigation
  tab_activated:       'navigation.tab_activated',
  url_changed:         'navigation.open_page',
  page_loaded:         'navigation.open_page',
  spa_route_changed:   'navigation.route_change',
  // Interaction
  click:               'interaction.click',
  dblclick:            'interaction.click',
  context_menu:        'interaction.right_click',
  input_changed:       'interaction.input_change',
  form_submitted:      'interaction.submit',
  element_focused:     'interaction.input_change',
  element_blurred:     'interaction.input_change',
  keyboard_intent:     'interaction.keyboard_shortcut',
  drag_started:        'interaction.drag_started',
  drag_completed:      'interaction.drag_completed',
  // System / window
  window_blurred:      'system.window_blurred',
  window_focused:      'system.window_focused',
  visibility_changed:  'system.visibility_changed',
  // System / UI state changes (observed via MutationObserver)
  modal_opened:        'system.modal_opened',
  modal_closed:        'system.modal_closed',
  toast_shown:         'system.toast_shown',
  loading_started:     'system.loading_started',
  loading_finished:    'system.loading_finished',
  error_displayed:     'system.error_displayed',
  status_changed:      'system.status_changed',
  dropdown_opened:     'system.dropdown_opened',
  dropdown_closed:     'system.dropdown_closed',
  // Session lifecycle
  session_start:       'session.started',
  session_pause:       'session.paused',
  session_resume:      'session.resumed',
  session_stop:        'session.stopped',
  user_annotation:     'session.annotation_added',
}

// Mirrors @ledgerium/policy-engine SENSITIVE_SELECTOR_PATTERNS (11 patterns)
const SENSITIVE_RE = /password|passwd|secret|token|api[_-]?key|credit[_-]?card|card[_-]?number|cvv|ssn|social[_-]?security|tax[_-]?id/i

function isSensitive(raw: RawEvent): boolean {
  return (
    raw.is_sensitive_target === true ||
    raw.target_element_type === 'password' ||
    SENSITIVE_RE.test(raw.target_selector ?? '') ||
    SENSITIVE_RE.test(raw.target_label ?? '')
  )
}

function actorType(canonicalType: string): 'human' | 'system' | 'recorder' {
  if (canonicalType.startsWith('session.') || canonicalType.startsWith('recorder.')) return 'recorder'
  if (canonicalType.startsWith('system.')) return 'system'
  return 'human'
}

export interface NormalizeResult {
  canonical: CanonicalEvent | null
  policyEntry: PolicyLogEntry | null
}

export function normalizeRawEvent(raw: RawEvent, blockedDomains: string[], allowedDomains: string[] = []): NormalizeResult {
  const domain = extractDomain(raw.url ?? '')
  const sessionId = raw.session_id
  const eventId = generateId()

  // Blocked domain → emit capture_blocked transparency event
  // Matches exact domain and subdomains (e.g. 'example.com' blocks 'api.example.com').
  if (domain && blockedDomains.some(blocked => domain === blocked || domain.endsWith(`.${blocked}`))) {
    const canonical: CanonicalEvent = {
      event_id: eventId,
      schema_version: SCHEMA_VERSION,
      session_id: sessionId,
      t_ms: raw.t_ms,
      t_wall: raw.t_wall,
      event_type: 'system.capture_blocked',
      actor_type: 'system',
      normalization_meta: {
        sourceEventId: raw.raw_event_id,
        sourceEventType: raw.event_type,
        normalizationRuleVersion: NORMALIZATION_RULE_VERSION,
        redactionApplied: false,
        redactionReason: `Domain ${domain} is blocked`,
      },
    }
    const policyEntry: PolicyLogEntry = {
      sessionId,
      eventId,
      t_ms: raw.t_ms,
      outcome: 'block',
      reason: `Domain blocked: ${domain}`,
    }
    return { canonical, policyEntry }
  }

  // Allowed domain list — non-empty list means only listed domains are captured.
  // Events without a URL (e.g. system events) are not subject to this check.
  if (domain && allowedDomains.length > 0 && !allowedDomains.some(allowed => domain === allowed || domain.endsWith(`.${allowed}`))) {
    const canonical: CanonicalEvent = {
      event_id: eventId,
      schema_version: SCHEMA_VERSION,
      session_id: sessionId,
      t_ms: raw.t_ms,
      t_wall: raw.t_wall,
      event_type: 'system.capture_blocked',
      actor_type: 'system',
      normalization_meta: {
        sourceEventId: raw.raw_event_id,
        sourceEventType: raw.event_type,
        normalizationRuleVersion: NORMALIZATION_RULE_VERSION,
        redactionApplied: false,
        redactionReason: `Domain ${domain} not in allowed list`,
      },
    }
    const policyEntry: PolicyLogEntry = {
      sessionId,
      eventId,
      t_ms: raw.t_ms,
      outcome: 'block',
      reason: `Domain not in allowed list: ${domain}`,
    }
    return { canonical, policyEntry }
  }

  const canonicalType = RAW_TO_CANONICAL[raw.event_type]
  if (!canonicalType) {
    return { canonical: null, policyEntry: null }
  }

  const sensitive = isSensitive(raw)

  // Sensitive target → emit redaction_applied transparency event
  if (sensitive) {
    const canonical: CanonicalEvent = {
      event_id: eventId,
      schema_version: SCHEMA_VERSION,
      session_id: sessionId,
      t_ms: raw.t_ms,
      t_wall: raw.t_wall,
      event_type: 'system.redaction_applied',
      actor_type: 'system',
      normalization_meta: {
        sourceEventId: raw.raw_event_id,
        sourceEventType: raw.event_type,
        normalizationRuleVersion: NORMALIZATION_RULE_VERSION,
        redactionApplied: true,
        redactionReason: 'Sensitive target detected',
      },
    }
    const policyEntry: PolicyLogEntry = {
      sessionId,
      eventId,
      t_ms: raw.t_ms,
      outcome: 'redact',
      reason: 'Sensitive field — content excluded',
    }
    return { canonical, policyEntry }
  }

  // Build page context
  const urlNorm = raw.url ? normalizeUrl(raw.url) : ''
  let routeTemplate = ''
  if (raw.url) {
    try {
      routeTemplate = deriveRouteTemplate(new URL(raw.url).pathname)
    } catch {
      routeTemplate = ''
    }
  }
  const appLabel = deriveAppLabel(domain)

  const pageContext: CanonicalEvent['page_context'] = raw.url ? {
    url: raw.url,
    urlNormalized: urlNorm,
    domain,
    routeTemplate,
    pageTitle: raw.page_title ?? '',
    applicationLabel: appLabel,
  } : undefined

  const targetSummary: CanonicalEvent['target_summary'] = raw.target_selector ? {
    selector: raw.target_selector,
    ...(raw.target_label !== undefined ? { label: raw.target_label } : {}),
    ...(raw.target_role !== undefined ? { role: raw.target_role } : {}),
    ...(raw.target_element_type !== undefined ? { elementType: raw.target_element_type } : {}),
    isSensitive: false,
  } : undefined

  const canonical: CanonicalEvent = {
    event_id: eventId,
    schema_version: SCHEMA_VERSION,
    session_id: sessionId,
    t_ms: raw.t_ms,
    t_wall: raw.t_wall,
    event_type: canonicalType,
    actor_type: actorType(canonicalType),
    ...(pageContext !== undefined ? { page_context: pageContext } : {}),
    ...(targetSummary !== undefined ? { target_summary: targetSummary } : {}),
    normalization_meta: {
      sourceEventId: raw.raw_event_id,
      sourceEventType: raw.event_type,
      normalizationRuleVersion: NORMALIZATION_RULE_VERSION,
      redactionApplied: false,
    },
    ...(raw.annotation_text ? { annotation_text: raw.annotation_text } : {}),
  }

  return { canonical, policyEntry: null }
}
