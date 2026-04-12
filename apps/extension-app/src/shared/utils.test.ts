import { describe, it, expect } from 'vitest'
import {
  generateId,
  nowIso,
  normalizeUrl,
  extractDomain,
  deriveRouteTemplate,
  deriveAppLabel,
  djb2Hash,
  sha256Hex,
} from './utils.js'

// ─── generateId ──────────────────────────────────────────────────────────────

describe('generateId', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateId()).toBe('string')
    expect(generateId().length).toBeGreaterThan(0)
  })

  it('returns unique values on each call', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateId()))
    expect(ids.size).toBe(20)
  })
})

// ─── nowIso ───────────────────────────────────────────────────────────────────

describe('nowIso', () => {
  it('returns a valid ISO 8601 string', () => {
    const iso = nowIso()
    expect(() => new Date(iso)).not.toThrow()
    expect(new Date(iso).toISOString()).toBe(iso)
  })
})

// ─── normalizeUrl ─────────────────────────────────────────────────────────────

describe('normalizeUrl', () => {
  it('strips known UTM parameters', () => {
    const url = 'https://example.com/page?utm_source=google&utm_medium=cpc&keep=1'
    const result = normalizeUrl(url)
    expect(result).not.toContain('utm_source')
    expect(result).not.toContain('utm_medium')
    expect(result).toContain('keep=1')
  })

  it('strips fbclid and gclid', () => {
    const url = 'https://example.com/?fbclid=abc&gclid=xyz&q=hello'
    const result = normalizeUrl(url)
    expect(result).not.toContain('fbclid')
    expect(result).not.toContain('gclid')
    expect(result).toContain('q=hello')
  })

  it('strips ref and source parameters', () => {
    const url = 'https://example.com/?ref=nav&source=email&page=1'
    const result = normalizeUrl(url)
    expect(result).not.toContain('ref=')
    expect(result).not.toContain('source=')
    expect(result).toContain('page=1')
  })

  it('strips sensitive credential parameters (token, api_key, secret, etc.)', () => {
    const url = 'https://example.com/callback?token=abc123&code=xyz&state=s1&keep=1'
    const result = normalizeUrl(url)
    expect(result).not.toContain('token=')
    expect(result).not.toContain('code=')
    expect(result).not.toContain('state=')
    expect(result).toContain('keep=1')
  })

  it('strips api_key and access_token parameters', () => {
    const url = 'https://example.com/?api_key=secret&access_token=tok&q=search'
    const result = normalizeUrl(url)
    expect(result).not.toContain('api_key')
    expect(result).not.toContain('access_token')
    expect(result).toContain('q=search')
  })

  it('strips URL fragments (which can contain OAuth tokens)', () => {
    const url = 'https://example.com/callback?code=abc#access_token=tok'
    const result = normalizeUrl(url)
    expect(result).not.toContain('#')
    expect(result).not.toContain('access_token=tok')
  })

  it('preserves non-tracking, non-sensitive query params', () => {
    const url = 'https://example.com/search?q=hello&page=2'
    const result = normalizeUrl(url)
    expect(result).toContain('q=hello')
    expect(result).toContain('page=2')
  })

  it('returns raw input for invalid URLs', () => {
    const bad = 'not-a-url'
    expect(normalizeUrl(bad)).toBe(bad)
  })

  it('handles URL with no query string', () => {
    const url = 'https://example.com/path'
    expect(normalizeUrl(url)).toBe(url)
  })
})

// ─── extractDomain ────────────────────────────────────────────────────────────

describe('extractDomain', () => {
  it('extracts hostname from a valid URL', () => {
    expect(extractDomain('https://app.example.com/path?q=1')).toBe('app.example.com')
  })

  it('returns empty string for invalid URL', () => {
    expect(extractDomain('not-a-url')).toBe('')
  })

  it('handles localhost', () => {
    expect(extractDomain('http://localhost:3000/path')).toBe('localhost')
  })
})

// ─── deriveRouteTemplate ─────────────────────────────────────────────────────

describe('deriveRouteTemplate', () => {
  it('replaces numeric segments with :id', () => {
    expect(deriveRouteTemplate('/users/12345/profile')).toBe('/users/:id/profile')
  })

  it('replaces UUID segments with :id', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(deriveRouteTemplate(`/records/${uuid}/edit`)).toBe('/records/:id/edit')
  })

  it('replaces long hex segments with :id', () => {
    expect(deriveRouteTemplate('/commit/abcdef1234567890')).toBe('/commit/:id')
  })

  it('preserves short non-id segments', () => {
    expect(deriveRouteTemplate('/api/v2/accounts')).toBe('/api/v2/accounts')
  })

  it('handles root path', () => {
    expect(deriveRouteTemplate('/')).toBe('/')
  })

  it('handles mixed path', () => {
    expect(deriveRouteTemplate('/orgs/42/settings/billing')).toBe('/orgs/:id/settings/billing')
  })
})

// ─── deriveAppLabel ───────────────────────────────────────────────────────────

describe('deriveAppLabel', () => {
  it('returns "Local Dev" for localhost', () => {
    expect(deriveAppLabel('localhost')).toBe('Local Dev')
  })

  it('returns "Local Dev" for IP addresses', () => {
    expect(deriveAppLabel('192.168.1.1')).toBe('Local Dev')
  })

  it('returns "Local Dev" for empty string', () => {
    expect(deriveAppLabel('')).toBe('Local Dev')
  })

  it('returns known app label for netsuite', () => {
    expect(deriveAppLabel('my.netsuite.com')).toBe('NetSuite')
  })

  it('returns known app label for salesforce', () => {
    expect(deriveAppLabel('mycompany.salesforce.com')).toBe('Salesforce')
  })

  it('returns known app label for github', () => {
    expect(deriveAppLabel('github.com')).toBe('GitHub')
  })

  it('returns known app label for jira', () => {
    expect(deriveAppLabel('myteam.atlassian.jira.com')).toBe('Jira')
  })

  it('capitalizes first segment for unknown hostnames', () => {
    expect(deriveAppLabel('myapp.example.com')).toBe('Myapp')
  })

  it('handles single-part hostname', () => {
    expect(deriveAppLabel('intranet')).toBe('Intranet')
  })
})

// ─── djb2Hash ─────────────────────────────────────────────────────────────────

describe('djb2Hash', () => {
  it('returns a number', () => {
    expect(typeof djb2Hash('hello')).toBe('number')
  })

  it('is deterministic', () => {
    expect(djb2Hash('test-input')).toBe(djb2Hash('test-input'))
  })

  it('returns different values for different inputs', () => {
    expect(djb2Hash('foo')).not.toBe(djb2Hash('bar'))
  })

  it('returns a non-negative 32-bit unsigned integer', () => {
    const h = djb2Hash('anything')
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThanOrEqual(0xffffffff)
  })

  it('handles empty string', () => {
    expect(djb2Hash('')).toBe(5381)
  })
})

// ─── sha256Hex ────────────────────────────────────────────────────────────────

describe('sha256Hex', () => {
  it('returns a hex string', async () => {
    const result = await sha256Hex('hello')
    expect(result).toMatch(/^[0-9a-f]+$/)
  })

  it('is deterministic', async () => {
    const a = await sha256Hex('consistent-input')
    const b = await sha256Hex('consistent-input')
    expect(a).toBe(b)
  })

  it('returns different hashes for different inputs', async () => {
    const a = await sha256Hex('input-one')
    const b = await sha256Hex('input-two')
    expect(a).not.toBe(b)
  })

  it('handles empty string', async () => {
    const result = await sha256Hex('')
    expect(result.length).toBeGreaterThan(0)
  })
})
