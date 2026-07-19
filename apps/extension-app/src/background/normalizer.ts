import type { RawEvent, CanonicalEvent, PolicyLogEntry } from '../shared/types.js'
import { generateId, normalizeUrl, extractDomain, deriveRouteTemplate, deriveAppLabel } from '../shared/utils.js'
import { SCHEMA_VERSION } from '../shared/constants.js'
import { RAW_TO_CANONICAL_TYPE as BASE_TYPE_MAP, NORMALIZATION_RULE_VERSION } from '@ledgerium/normalization-engine'
import { classifySensitivity } from '@ledgerium/policy-engine'

const RAW_TO_CANONICAL: Record<string, string> = {
  ...BASE_TYPE_MAP,
  // Extension-specific mappings not yet in the shared package
  context_menu:    'interaction.right_click',
  dropdown_opened: 'system.dropdown_opened',
  dropdown_closed: 'system.dropdown_closed',
}

function isSensitive(raw: RawEvent): boolean {
  if (raw.is_sensitive_target === true) return true
  const result = classifySensitivity(
    raw.target_element_type,
    raw.target_selector,
    raw.target_label,
  )
  return result.isSensitive
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
    pageTitle: raw.page_title ?? '',   // PII screening applied upstream in getSafePageTitle() (content/safe-page-title.ts)
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
