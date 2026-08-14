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
