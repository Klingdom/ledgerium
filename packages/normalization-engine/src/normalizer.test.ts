import { describe, it, expect, beforeEach } from 'vitest'
import {
  normalizeEvent,
  normalizeSession,
  NORMALIZATION_RULE_VERSION,
  RAW_TO_CANONICAL_TYPE,
} from './normalizer.js'
import type { RawEvent } from './normalizer.js'

// ---------------------------------------------------------------------------
// Test fixture factory
// ---------------------------------------------------------------------------

let seq = 0
function makeRaw(overrides: Partial<RawEvent> = {}): RawEvent {
  seq++
  return {
    raw_event_id: `raw-${seq}`,
    session_id: 'session-test',
    t_ms: seq * 100,
    t_wall: new Date(seq * 100).toISOString(),
    event_type: 'click',
    schema_version: '1.0.0',
    ...overrides,
  }
}

// Reset seq before each describe to avoid test-order sensitivity in IDs
function resetSeq() { seq = 0 }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('NORMALIZATION_RULE_VERSION', () => {
  it('is exactly "1.0.0" (invariant)', () => {
    expect(NORMALIZATION_RULE_VERSION).toBe('1.0.0')
  })
})

describe('RAW_TO_CANONICAL_TYPE', () => {
  it('maps all documented raw event types', () => {
    const expectedMappings: Record<string, string> = {
      tab_activated: 'navigation.tab_activated',
      url_changed: 'navigation.open_page',
      page_loaded: 'navigation.open_page',
      spa_route_changed: 'navigation.route_change',
      click: 'interaction.click',
      dblclick: 'interaction.click',
      input_changed: 'interaction.input_change',
      form_submitted: 'interaction.submit',
      element_focused: 'interaction.input_change',
      element_blurred: 'interaction.input_change',
      session_start: 'session.started',
      session_pause: 'session.paused',
      session_resume: 'session.resumed',
      session_stop: 'session.stopped',
      user_annotation: 'session.annotation_added',
    }
    for (const [raw, canonical] of Object.entries(expectedMappings)) {
      expect(RAW_TO_CANONICAL_TYPE[raw]).toBe(canonical)
    }
  })
})

// ---------------------------------------------------------------------------
// normalizeEvent
// ---------------------------------------------------------------------------

describe('normalizeEvent', () => {
  beforeEach(() => resetSeq())

  describe('basic mapping', () => {
    it('maps click → interaction.click', () => {
      const { canonical } = normalizeEvent(makeRaw({ event_type: 'click' }))
      expect(canonical?.event_type).toBe('interaction.click')
    })

    it('maps form_submitted → interaction.submit', () => {
      const { canonical } = normalizeEvent(makeRaw({ event_type: 'form_submitted' }))
      expect(canonical?.event_type).toBe('interaction.submit')
    })

    it('maps session_start → session.started with actor_type recorder', () => {
      const { canonical } = normalizeEvent(makeRaw({ event_type: 'session_start' }))
      expect(canonical?.event_type).toBe('session.started')
      expect(canonical?.actor_type).toBe('recorder')
    })

    it('assigns actor_type "human" for interaction events', () => {
      const { canonical } = normalizeEvent(makeRaw({ event_type: 'click' }))
      expect(canonical?.actor_type).toBe('human')
    })

    it('assigns actor_type "system" for system.* events (blocked domain)', () => {
      const { canonical } = normalizeEvent(
        makeRaw({ event_type: 'click', url: 'https://blocked.example.com/' }),
        ['blocked.example.com'],
      )
      expect(canonical?.event_type).toBe('system.capture_blocked')
      expect(canonical?.actor_type).toBe('system')
    })

    it('returns warning and null canonical for unknown event type', () => {
      const { canonical, policyEntry, warning } = normalizeEvent(
        makeRaw({ event_type: 'mouse_hover' }),
      )
      expect(canonical).toBeNull()
      expect(policyEntry).toBeNull()
      expect(warning).toContain('Unknown event_type')
      expect(warning).toContain('mouse_hover')
    })
  })

  describe('page context', () => {
    it('populates page_context when URL is provided', () => {
      const { canonical } = normalizeEvent(
        makeRaw({
          event_type: 'click',
          url: 'https://app.salesforce.com/leads?utm_source=test',
          page_title: 'Leads',
        }),
      )
      expect(canonical?.page_context).toBeDefined()
      expect(canonical?.page_context?.domain).toBe('app.salesforce.com')
      expect(canonical?.page_context?.applicationLabel).toBe('Salesforce')
      expect(canonical?.page_context?.pageTitle).toBe('Leads')
      // Tracking params should be stripped
      expect(canonical?.page_context?.urlNormalized).not.toContain('utm_source')
    })

    it('omits page_context when no URL is provided', () => {
      const { canonical } = normalizeEvent(
        makeRaw({ event_type: 'click', url: undefined }),
      )
      expect(canonical?.page_context).toBeUndefined()
    })
  })

  describe('domain blocking', () => {
    it('produces system.capture_blocked for blocked domain', () => {
      const { canonical, policyEntry } = normalizeEvent(
        makeRaw({ event_type: 'click', url: 'https://blocked.example.com/page' }),
        ['blocked.example.com'],
      )
      expect(canonical?.event_type).toBe('system.capture_blocked')
      expect(policyEntry?.outcome).toBe('block')
    })

    it('blocks subdomains when base domain is blocked', () => {
      const { canonical } = normalizeEvent(
        makeRaw({ event_type: 'click', url: 'https://sub.blocked.com/page' }),
        ['blocked.com'],
      )
      expect(canonical?.event_type).toBe('system.capture_blocked')
    })

    it('does not block when blocked domain list is empty', () => {
      const { canonical } = normalizeEvent(
        makeRaw({ event_type: 'click', url: 'https://any.com/' }),
        [],
      )
      expect(canonical?.event_type).toBe('interaction.click')
    })
  })

  describe('sensitive target redaction', () => {
    it('produces system.redaction_applied when is_sensitive_target is true', () => {
      const { canonical, policyEntry } = normalizeEvent(
        makeRaw({ event_type: 'click', is_sensitive_target: true, target_label: 'password' }),
      )
      expect(canonical?.event_type).toBe('system.redaction_applied')
      expect(policyEntry?.outcome).toBe('redact')
    })

    it('strips target label when redacted', () => {
      const { canonical } = normalizeEvent(
        makeRaw({
          event_type: 'input_changed',
          is_sensitive_target: true,
          target_label: 'Password',
          target_selector: 'input[name="password"]',
        }),
      )
      expect(canonical?.target_summary?.label).toBeUndefined()
      expect(canonical?.normalization_meta.redactionApplied).toBe(true)
    })

    it('redacts when target_element_type is "password"', () => {
      const { canonical } = normalizeEvent(
        makeRaw({ event_type: 'input_changed', target_element_type: 'password' }),
      )
      expect(canonical?.event_type).toBe('system.redaction_applied')
    })

    it('redacts when selector contains "password"', () => {
      const { canonical } = normalizeEvent(
        makeRaw({ event_type: 'input_changed', target_selector: 'input[name="password"]' }),
      )
      expect(canonical?.event_type).toBe('system.redaction_applied')
    })

    it('does not redact benign target', () => {
      const { canonical } = normalizeEvent(
        makeRaw({
          event_type: 'click',
          target_selector: 'button#submit',
          target_label: 'Submit',
        }),
      )
      expect(canonical?.event_type).toBe('interaction.click')
      expect(canonical?.target_summary?.label).toBe('Submit')
      expect(canonical?.normalization_meta.redactionApplied).toBe(false)
    })
  })

  describe('normalization_meta invariants', () => {
    it('sourceEventId matches input raw_event_id', () => {
      const raw = makeRaw({ raw_event_id: 'evt-abc-123' })
      const { canonical } = normalizeEvent(raw)
      expect(canonical?.normalization_meta.sourceEventId).toBe('evt-abc-123')
    })

    it('normalizationRuleVersion is "1.0.0"', () => {
      const { canonical } = normalizeEvent(makeRaw())
      expect(canonical?.normalization_meta.normalizationRuleVersion).toBe('1.0.0')
    })

    it('schema_version is "1.0.0"', () => {
      const { canonical } = normalizeEvent(makeRaw())
      expect(canonical?.schema_version).toBe('1.0.0')
    })
  })
})

// ---------------------------------------------------------------------------
// normalizeSession
// ---------------------------------------------------------------------------

describe('normalizeSession', () => {
  beforeEach(() => resetSeq())

  it('returns empty result for empty input', () => {
    const result = normalizeSession([])
    expect(result.events).toHaveLength(0)
    expect(result.policyLog).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('deduplicates rapid duplicate clicks on the same selector', () => {
    const events = [
      makeRaw({ event_type: 'click', t_ms: 0, target_selector: '#btn' }),
      makeRaw({ event_type: 'click', t_ms: 150, target_selector: '#btn' }), // within 300ms
    ]
    const result = normalizeSession(events)
    const clickEvents = result.events.filter(e => e.event_type === 'interaction.click')
    expect(clickEvents).toHaveLength(1)
  })

  it('does NOT deduplicate clicks on different selectors', () => {
    const events = [
      makeRaw({ event_type: 'click', t_ms: 0, target_selector: '#btn-a' }),
      makeRaw({ event_type: 'click', t_ms: 150, target_selector: '#btn-b' }),
    ]
    const result = normalizeSession(events)
    const clickEvents = result.events.filter(e => e.event_type === 'interaction.click')
    expect(clickEvents).toHaveLength(2)
  })

  it('does NOT deduplicate clicks outside 300ms window', () => {
    const events = [
      makeRaw({ event_type: 'click', t_ms: 0, target_selector: '#btn' }),
      makeRaw({ event_type: 'click', t_ms: 400, target_selector: '#btn' }),
    ]
    const result = normalizeSession(events)
    const clickEvents = result.events.filter(e => e.event_type === 'interaction.click')
    expect(clickEvents).toHaveLength(2)
  })

  it('drops element_focused when immediately followed by another focus', () => {
    const events = [
      makeRaw({ event_type: 'element_focused', t_ms: 0 }),
      makeRaw({ event_type: 'element_focused', t_ms: 50 }),
    ]
    const result = normalizeSession(events)
    // Only one focus event should remain after dedup
    const focusEvents = result.events.filter(e =>
      e.normalization_meta.sourceEventType === 'element_focused',
    )
    expect(focusEvents).toHaveLength(1)
  })

  it('drops focus+blur pair with no input between them', () => {
    const events = [
      makeRaw({ event_type: 'element_focused', t_ms: 0 }),
      makeRaw({ event_type: 'element_blurred', t_ms: 100 }),
    ]
    const result = normalizeSession(events)
    // Neither focus nor blur should appear
    const focusEvents = result.events.filter(e =>
      e.normalization_meta.sourceEventType === 'element_focused' ||
      e.normalization_meta.sourceEventType === 'element_blurred',
    )
    expect(focusEvents).toHaveLength(0)
  })

  it('collects warnings for unknown event types', () => {
    const events = [makeRaw({ event_type: 'custom_event' })]
    const result = normalizeSession(events)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('Unknown event_type')
  })

  it('populates policyLog for redacted events', () => {
    const events = [
      makeRaw({ event_type: 'input_changed', is_sensitive_target: true }),
    ]
    const result = normalizeSession(events)
    expect(result.policyLog).toHaveLength(1)
    expect(result.policyLog[0]?.outcome).toBe('redact')
  })

  it('normalizes a mixed batch correctly', () => {
    const events = [
      makeRaw({ event_type: 'session_start', t_ms: 0 }),
      makeRaw({ event_type: 'click', t_ms: 1000, url: 'https://app.example.com/' }),
      makeRaw({ event_type: 'input_changed', t_ms: 2000 }),
      makeRaw({ event_type: 'form_submitted', t_ms: 3000 }),
      makeRaw({ event_type: 'session_stop', t_ms: 4000 }),
    ]
    const result = normalizeSession(events)
    expect(result.events.length).toBeGreaterThanOrEqual(5)
    expect(result.warnings).toHaveLength(0)
  })
})
