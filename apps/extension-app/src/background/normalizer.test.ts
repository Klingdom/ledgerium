/**
 * Tests for apps/extension-app/src/background/normalizer.ts
 *
 * F-1 privacy fix regression coverage: page_context.url previously carried
 * the raw, unscreened URL pathname (entity-bearing slugs like
 * "/patients/sarah-connor" reached the server verbatim). This suite locks
 * the fixed behavior: `url` is now populated with origin + the already
 * screened routeTemplate, and routeTemplate itself now parameterizes
 * compound (kebab-case, multi-word) slug segments in addition to the
 * pre-existing integer/UUID/hex rules.
 *
 * No test file previously existed for this module.
 */
import { describe, it, expect } from 'vitest'
import { normalizeRawEvent } from './normalizer.js'
import type { RawEvent } from '../shared/types.js'

let seq = 0

function makeRaw(overrides: Partial<RawEvent> = {}): RawEvent {
  seq += 1
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

describe('normalizeRawEvent — F-1 privacy fix', () => {
  describe('page_context.url no longer leaks the raw path (Part 1)', () => {
    it('does not include an entity-bearing slug in page_context.url', () => {
      const { canonical } = normalizeRawEvent(
        makeRaw({ url: 'https://app.example.com/patients/sarah-connor/notes' }),
        [],
      )
      expect(canonical?.page_context?.url).not.toContain('sarah-connor')
      expect(canonical?.page_context?.url).toBe(
        'https://app.example.com/patients/:slug/notes',
      )
    })

    it('does not include a company-name slug in page_context.url', () => {
      const { canonical } = normalizeRawEvent(
        makeRaw({ url: 'https://app.example.com/deals/acme-corp-renewal' }),
        [],
      )
      expect(canonical?.page_context?.url).not.toContain('acme-corp-renewal')
      expect(canonical?.page_context?.url).toBe(
        'https://app.example.com/deals/:slug',
      )
    })

    it('populates url as origin + routeTemplate for a safe static route (byte-identical to before when no dynamic segment is present)', () => {
      const { canonical } = normalizeRawEvent(
        makeRaw({ url: 'https://app.salesforce.com/leads' }),
        [],
      )
      expect(canonical?.page_context?.url).toBe('https://app.salesforce.com/leads')
      expect(canonical?.page_context?.routeTemplate).toBe('/leads')
    })

    it('strips query string and fragment from page_context.url', () => {
      const { canonical } = normalizeRawEvent(
        makeRaw({ url: 'https://app.example.com/orders/42?token=secret#panel' }),
        [],
      )
      expect(canonical?.page_context?.url).toBe('https://app.example.com/orders/:id')
      expect(canonical?.page_context?.url).not.toContain('token')
      expect(canonical?.page_context?.url).not.toContain('panel')
    })

    it('returns an empty url when the URL is malformed', () => {
      const { canonical } = normalizeRawEvent(
        makeRaw({ url: 'not a valid url %%' }),
        [],
      )
      expect(canonical?.page_context?.url).toBe('')
      expect(canonical?.page_context?.routeTemplate).toBe('')
    })

    it('omits page_context entirely (and therefore url) when no URL is provided', () => {
      const { canonical } = normalizeRawEvent(makeRaw(), [])
      expect(canonical?.page_context).toBeUndefined()
    })
  })

  describe('routeTemplate compound-slug parameterization (Part 2, via deriveRouteTemplate)', () => {
    it('parameterizes a kebab-case name slug', () => {
      const { canonical } = normalizeRawEvent(
        makeRaw({ url: 'https://app.example.com/patients/sarah-connor' }),
        [],
      )
      expect(canonical?.page_context?.routeTemplate).toBe('/patients/:slug')
    })

    it('still parameterizes a pure-integer id segment (regression)', () => {
      const { canonical } = normalizeRawEvent(
        makeRaw({ url: 'https://app.example.com/tasks/123' }),
        [],
      )
      expect(canonical?.page_context?.routeTemplate).toBe('/tasks/:id')
    })

    it('still parameterizes a UUID segment (regression)', () => {
      const { canonical } = normalizeRawEvent(
        makeRaw({
          url: 'https://app.example.com/users/550e8400-e29b-41d4-a716-446655440000/profile',
        }),
        [],
      )
      expect(canonical?.page_context?.routeTemplate).toBe('/users/:id/profile')
    })

    it('still parameterizes a 10+ char lowercase hex segment (regression)', () => {
      const { canonical } = normalizeRawEvent(
        makeRaw({ url: 'https://app.example.com/reports/abc123def456' }),
        [],
      )
      expect(canonical?.page_context?.routeTemplate).toBe('/reports/:id')
    })

    it('does not over-parameterize safe single-word static route segments', () => {
      const { canonical } = normalizeRawEvent(
        makeRaw({ url: 'https://app.example.com/dashboard' }),
        [],
      )
      expect(canonical?.page_context?.routeTemplate).toBe('/dashboard')
    })

    it('does not over-parameterize a multi-segment static path with no dynamic segments', () => {
      const { canonical } = normalizeRawEvent(
        makeRaw({ url: 'https://app.example.com/contacts/new' }),
        [],
      )
      expect(canonical?.page_context?.routeTemplate).toBe('/contacts/new')
    })
  })

  describe('determinism', () => {
    it('produces byte-identical page_context across repeated calls with the same input', () => {
      const raw = makeRaw({
        url: 'https://app.example.com/patients/sarah-connor/visits/123',
      })
      const first = normalizeRawEvent(raw, [])
      const second = normalizeRawEvent(raw, [])
      expect(first.canonical?.page_context).toEqual(second.canonical?.page_context)
      expect(first.canonical?.page_context?.url).toBe(
        'https://app.example.com/patients/:slug/visits/:id',
      )
    })
  })

  describe('edge cases', () => {
    it('handles the root path', () => {
      const { canonical } = normalizeRawEvent(
        makeRaw({ url: 'https://app.example.com/' }),
        [],
      )
      expect(canonical?.page_context?.routeTemplate).toBe('/')
      expect(canonical?.page_context?.url).toBe('https://app.example.com/')
    })

    it('handles a trailing slash after a compound slug', () => {
      const { canonical } = normalizeRawEvent(
        makeRaw({ url: 'https://app.example.com/patients/sarah-connor/' }),
        [],
      )
      expect(canonical?.page_context?.routeTemplate).toBe('/patients/:slug/')
      expect(canonical?.page_context?.url).toBe(
        'https://app.example.com/patients/:slug/',
      )
    })
  })
})

// ── Row #215 (loop 28): user-authored annotations meet the PII screen ─────────
//
// Page titles and state-change text were screened; annotation_text was not, so
// a note containing an SSN uploaded verbatim. These also pin the thing the
// obvious fix would have broken: reusing the label-shaped screen would drop any
// note of 12+ words and truncate at 80 chars.
describe('normalizeRawEvent — annotation_text screening', () => {
  it('keeps a clean annotation verbatim', () => {
    const { canonical } = normalizeRawEvent(makeRaw({ annotation_text: 'Approved by finance' }), [])
    expect(canonical?.annotation_text).toBe('Approved by finance')
    expect(canonical?.normalization_meta.redactionApplied).toBe(false)
  })

  it('keeps a LONG clean annotation at full length — no truncation, no word cap', () => {
    const note =
      'This step waits on the finance team to approve the invoice batch before the run can continue, which is usually the slowest part of the whole process and the reason cycle time varies.'
    expect(note.length).toBeGreaterThan(80)
    expect(note.split(/\s+/).length).toBeGreaterThan(12)
    const { canonical } = normalizeRawEvent(makeRaw({ annotation_text: note }), [])
    expect(canonical?.annotation_text).toBe(note)
  })

  it('drops an annotation containing an SSN, and says so', () => {
    const { canonical, policyEntry } = normalizeRawEvent(
      makeRaw({ annotation_text: 'customer SSN 123-45-6789' }),
      [],
    )
    expect(canonical?.annotation_text).toBeUndefined()
    expect(canonical?.normalization_meta.redactionApplied).toBe(true)
    expect(canonical?.normalization_meta.redactionReason).toMatch(/Annotation/)
    expect(policyEntry?.outcome).toBe('redact')
  })

  it('drops annotations containing an email, a URL, a card number or a phone number', () => {
    for (const text of [
      'ping bob@example.com about this',
      'see https://internal.example.com/doc',
      'card 4111 1111 1111 1111 on file',
      'call 555-867-5309 first',
    ]) {
      const { canonical } = normalizeRawEvent(makeRaw({ annotation_text: text }), [])
      expect(canonical?.annotation_text, text).toBeUndefined()
    }
  })

  it('emits no policy entry and no redaction flag when there is no annotation', () => {
    const { canonical, policyEntry } = normalizeRawEvent(makeRaw(), [])
    expect(canonical?.annotation_text).toBeUndefined()
    expect(canonical?.normalization_meta.redactionApplied).toBe(false)
    expect(policyEntry).toBeNull()
  })

  it('is deterministic for the same input', () => {
    const a = normalizeRawEvent(makeRaw({ raw_event_id: 'fixed', annotation_text: 'Approved by finance' }), [])
    const b = normalizeRawEvent(makeRaw({ raw_event_id: 'fixed', annotation_text: 'Approved by finance' }), [])
    expect(a.canonical?.annotation_text).toBe(b.canonical?.annotation_text)
  })
})
