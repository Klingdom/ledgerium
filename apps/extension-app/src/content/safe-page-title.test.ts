/**
 * Unit tests for safe-page-title.ts — PII screening for document.title.
 *
 * Tests for `screenPageTitle` (pure function) and `getSafePageTitle` (reads DOM).
 *
 * Environment: jsdom (configured in apps/extension-app/vitest.config.ts),
 * which allows setting document.title and location.href.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screenPageTitle, getSafePageTitle } from './safe-page-title.js'

// ─── screenPageTitle (pure) ───────────────────────────────────────────────────

describe('screenPageTitle — empty / whitespace-only input', () => {
  it('returns empty string for empty input', () => {
    expect(screenPageTitle('')).toBe('')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(screenPageTitle('   ')).toBe('')
  })
})

describe('screenPageTitle — email address detection (F-0 primary fix)', () => {
  it('rejects a title that IS a bare email address', () => {
    expect(screenPageTitle('phil@mediafier.ai')).toBeNull()
  })

  it('rejects a title with an email embedded in surrounding text (the critical case)', () => {
    // This is the exact pattern that the anchored EMAIL_RE in label-extractor
    // would MISS. EMAIL_IN_TITLE_RE catches it.
    expect(screenPageTitle('Inbox (3) – phil@mediafier.ai')).toBeNull()
  })

  it('rejects a title with an email in the middle', () => {
    expect(screenPageTitle('Welcome user@example.com to the platform')).toBeNull()
  })

  it('rejects a title with a subdomain-format email', () => {
    expect(screenPageTitle('Dashboard — admin@app.company.io | Home')).toBeNull()
  })
})

describe('screenPageTitle — phone number detection', () => {
  it('rejects a title containing a US phone number', () => {
    expect(screenPageTitle('Call 555-867-5309 for support')).toBeNull()
  })

  it('rejects a title with a compact phone number', () => {
    expect(screenPageTitle('Support: 4155551234')).toBeNull()
  })
})

describe('screenPageTitle — SSN detection', () => {
  it('rejects a title containing a Social Security Number pattern', () => {
    expect(screenPageTitle('File: 123-45-6789 Report')).toBeNull()
  })
})

describe('screenPageTitle — credit card detection', () => {
  it('rejects a title containing a credit card number pattern', () => {
    expect(screenPageTitle('Payment 4111 1111 1111 1111 processed')).toBeNull()
  })
})

describe('screenPageTitle — safe titles pass through', () => {
  it('passes a normal application title unchanged', () => {
    expect(screenPageTitle('Dashboard | Ledgerium')).toBe('Dashboard | Ledgerium')
  })

  it('passes a short title with no PII', () => {
    expect(screenPageTitle('Home')).toBe('Home')
  })

  it('truncates a title that exceeds 80 characters', () => {
    const long = 'A'.repeat(100)
    const result = screenPageTitle(long)
    expect(result).not.toBeNull()
    expect(result!.length).toBeLessThanOrEqual(80)
  })

  it('passes a title with numbers that are not PII patterns', () => {
    // "1234" is only 4 digits — below the long-digit threshold of 5 consecutive
    expect(screenPageTitle('Step 1234 of onboarding')).toBe('Step 1234 of onboarding')
  })

  it('rejects a title that contains 5 or more consecutive digits (long-digit heuristic)', () => {
    // 5-digit sequence triggers the LONG_DIGITS_RE in applySafetyHeuristics
    expect(screenPageTitle('Order #12345 shipped')).toBeNull()
  })

  it('rejects a title that looks like a full URL', () => {
    expect(screenPageTitle('https://app.example.com/dashboard')).toBeNull()
  })

  it('rejects a title with too many words (≥12 words = verbose body copy)', () => {
    // 12+ words → applySafetyHeuristics returns null
    const wordy = 'one two three four five six seven eight nine ten eleven twelve'
    expect(screenPageTitle(wordy)).toBeNull()
  })
})

// ─── getSafePageTitle (DOM-dependent) ────────────────────────────────────────

describe('getSafePageTitle — reads document.title and screens it', () => {
  const originalTitle = document.title

  afterEach(() => {
    document.title = originalTitle
  })

  it('returns the screened title when it contains no PII', () => {
    document.title = 'Dashboard | Ledgerium'
    expect(getSafePageTitle()).toBe('Dashboard | Ledgerium')
  })

  it('returns empty string when document.title is empty', () => {
    document.title = ''
    expect(getSafePageTitle()).toBe('')
  })

  it('falls back to app label when title contains an embedded email', () => {
    document.title = 'Inbox (3) – phil@mediafier.ai'
    // jsdom location.href = 'http://localhost/' → extractDomain → 'localhost'
    // deriveAppLabel('localhost') → 'Local Dev'
    const result = getSafePageTitle()
    expect(result).not.toBe('')
    expect(result).not.toContain('@')           // email must be gone
    expect(result).not.toContain('phil')        // name must be gone
    expect(result).toBe('Local Dev')
  })

  it('falls back to app label when title looks like a phone number', () => {
    document.title = 'Call 555-867-5309'
    const result = getSafePageTitle()
    expect(result).not.toContain('555')
    expect(result.length).toBeGreaterThan(0)   // non-empty fallback
  })

  it('returns a safe non-empty string even when title is an SSN pattern', () => {
    document.title = '123-45-6789'
    const result = getSafePageTitle()
    expect(result).not.toContain('123')
    expect(result.length).toBeGreaterThan(0)
  })
})
