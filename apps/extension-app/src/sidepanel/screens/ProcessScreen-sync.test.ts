// ProcessScreen-sync.test.ts — security regression tests for the three
// openInWebsite defects fixed in this iteration (CHROME-002 audit).
//
// Coverage matrix:
//   (a) resolveApiKey  — reads from chrome.storage.local via STORAGE_KEY_APIKEY,
//                        NOT from sync storage.
//   (b) isSyncUrlSafe  — rejects non-https URLs before any fetch occurs.
//   (c) sanitizeWorkflowId — rejects invalid chars; encodes valid IDs.
//
// All three helpers are pure / near-pure exports from ProcessScreen.tsx,
// making them testable without a React or chrome.runtime environment.
// resolveApiKey uses chrome.storage.local which is stubbed via vi.stubGlobal.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveApiKey, isSyncUrlSafe, sanitizeWorkflowId } from './ProcessScreen.js'
import { STORAGE_KEY_APIKEY } from '../../shared/constants.js'

// ─── (a) resolveApiKey — reads from local, not sync ──────────────────────────

describe('resolveApiKey — Defect 1 fix (CHROME-002: key lives in local storage)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('reads the API key from chrome.storage.local using STORAGE_KEY_APIKEY', async () => {
    // Arrange: stub chrome.storage.local.get to return a key
    const mockGet = vi.fn().mockImplementation((keys: string[], callback: (result: Record<string, unknown>) => void) => {
      expect(keys).toContain(STORAGE_KEY_APIKEY)
      callback({ [STORAGE_KEY_APIKEY]: 'ldg_test_key_123' })
    })
    vi.stubGlobal('chrome', {
      storage: {
        local: { get: mockGet },
      },
    })

    const result = await resolveApiKey()

    expect(result).toBe('ldg_test_key_123')
    expect(mockGet).toHaveBeenCalledOnce()
    // The key argument must reference STORAGE_KEY_APIKEY — not 'ledgerium_settings'
    const callArgs = mockGet.mock.calls[0]![0] as string[]
    expect(callArgs).toContain(STORAGE_KEY_APIKEY)
    expect(callArgs).not.toContain('ledgerium_settings')
  })

  it('returns undefined when the key is absent from local storage', async () => {
    const mockGet = vi.fn().mockImplementation((_keys: string[], callback: (result: Record<string, unknown>) => void) => {
      callback({})
    })
    vi.stubGlobal('chrome', {
      storage: {
        local: { get: mockGet },
      },
    })

    const result = await resolveApiKey()
    expect(result).toBeUndefined()
  })

  it('returns undefined when the stored value is an empty string', async () => {
    const mockGet = vi.fn().mockImplementation((_keys: string[], callback: (result: Record<string, unknown>) => void) => {
      callback({ [STORAGE_KEY_APIKEY]: '' })
    })
    vi.stubGlobal('chrome', {
      storage: {
        local: { get: mockGet },
      },
    })

    const result = await resolveApiKey()
    expect(result).toBeUndefined()
  })

  it('does NOT read from chrome.storage.sync for the API key', async () => {
    const syncGet = vi.fn()
    const localGet = vi.fn().mockImplementation((_keys: string[], cb: (r: Record<string, unknown>) => void) => {
      cb({ [STORAGE_KEY_APIKEY]: 'ldg_local_key' })
    })
    vi.stubGlobal('chrome', {
      storage: {
        sync: { get: syncGet },
        local: { get: localGet },
      },
    })

    await resolveApiKey()

    expect(syncGet).not.toHaveBeenCalled()
    expect(localGet).toHaveBeenCalledOnce()
  })
})

// ─── (b) isSyncUrlSafe — HTTPS enforcement ────────────────────────────────────

describe('isSyncUrlSafe — Defect 2 fix (no API key over cleartext)', () => {
  it('returns true for an https:// URL', () => {
    expect(isSyncUrlSafe('https://ledgerium.ai/api/sync')).toBe(true)
  })

  it('returns true for any https:// URL regardless of path', () => {
    expect(isSyncUrlSafe('https://example.com')).toBe(true)
    expect(isSyncUrlSafe('https://sub.domain.tld/path?q=1')).toBe(true)
  })

  it('returns false for an http:// URL', () => {
    expect(isSyncUrlSafe('http://ledgerium.ai/api/sync')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isSyncUrlSafe('')).toBe(false)
  })

  it('returns false for a URL with no scheme', () => {
    expect(isSyncUrlSafe('ledgerium.ai/api/sync')).toBe(false)
  })

  it('returns false for ftp:// URL', () => {
    expect(isSyncUrlSafe('ftp://ledgerium.ai/upload')).toBe(false)
  })

  it('returns false for a URL that contains https but does not start with it', () => {
    // A URL that sneaks https later in the string must still be rejected
    expect(isSyncUrlSafe('http://evil.com?redirect=https://ledgerium.ai')).toBe(false)
  })
})

// ─── (c) sanitizeWorkflowId — server value validation ────────────────────────

describe('sanitizeWorkflowId — Defect 3 fix (no raw server value in tab URL)', () => {
  it('returns the encoded ID for a valid alphanumeric ID', () => {
    expect(sanitizeWorkflowId('abc123')).toBe('abc123')
  })

  it('returns the encoded ID for an ID with hyphens and underscores', () => {
    expect(sanitizeWorkflowId('wf-001_test')).toBe('wf-001_test')
  })

  it('encodes an ID that contains percent-encodable but allowed chars', () => {
    // Pure alphanumeric/hyphen/underscore — encodeURIComponent leaves them as-is
    const id = 'Workflow_ID-123'
    const result = sanitizeWorkflowId(id)
    expect(result).toBe(encodeURIComponent(id))
  })

  it('returns null for an ID containing a path-traversal sequence (../evil)', () => {
    expect(sanitizeWorkflowId('../evil')).toBeNull()
  })

  it('returns null for an ID containing a space', () => {
    expect(sanitizeWorkflowId('a b')).toBeNull()
  })

  it('returns null for an ID containing a forward slash', () => {
    expect(sanitizeWorkflowId('abc/def')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(sanitizeWorkflowId('')).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(sanitizeWorkflowId(undefined)).toBeNull()
  })

  it('returns null for null', () => {
    expect(sanitizeWorkflowId(null)).toBeNull()
  })

  it('returns null for a numeric value (not a string)', () => {
    expect(sanitizeWorkflowId(42)).toBeNull()
  })

  it('returns null for an ID containing a semicolon', () => {
    expect(sanitizeWorkflowId('id;DROP')).toBeNull()
  })

  it('returns null for an ID containing angle brackets', () => {
    expect(sanitizeWorkflowId('<script>')).toBeNull()
  })

  it('returns null for an ID containing a percent sign', () => {
    // A raw % in the ID could be used to inject encoded chars
    expect(sanitizeWorkflowId('id%2F')).toBeNull()
  })

  it('the returned value is safe to interpolate into a URL path segment', () => {
    // Valid IDs must survive a round-trip: decodeURIComponent(sanitizeWorkflowId(id)) === id
    const id = 'WF-2024_Jan-Report'
    const safe = sanitizeWorkflowId(id)
    expect(safe).not.toBeNull()
    expect(decodeURIComponent(safe!)).toBe(id)
  })
})
