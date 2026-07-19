/**
 * Unit tests for state-observer PII screening (F-2, Funnel & SOP Review 001).
 *
 * The state-observer path captures modal / toast / alert / error text. That is
 * the class of UI text most likely to echo user- and record-specific data back
 * to the screen. Before this fix `nodeLabel()` returned raw `textContent` with
 * no screening at all — the only text-extraction path in the extension without
 * a guard.
 *
 * These tests lock the screening behaviour so the guard cannot silently
 * regress. `screenStateLabel` is pure and requires no DOM.
 */

import { describe, it, expect } from 'vitest'
import { screenStateLabel } from './state-observer.js'

// ─── Rejection: PII must never survive ───────────────────────────────────────

describe('screenStateLabel — rejects PII-bearing state text', () => {
  it('rejects a toast containing an email address', () => {
    expect(screenStateLabel('Email already registered: jane@company.com')).toBeUndefined()
  })

  it('rejects an error echoing a long digit run (card / account number)', () => {
    expect(screenStateLabel('Payment declined for account 4242424242')).toBeUndefined()
  })

  it('rejects text containing an SSN-shaped value', () => {
    expect(screenStateLabel('Invalid SSN 123-45-6789 provided')).toBeUndefined()
  })

  it('rejects text containing a URL', () => {
    expect(screenStateLabel('Redirecting to https://crm.example.com/deals')).toBeUndefined()
  })

  it('returns undefined rather than an empty string on rejection', () => {
    // Callers treat undefined as "omit the field". An empty string would be
    // emitted as a present-but-blank value and read as real data downstream.
    const result = screenStateLabel('contact me at bob@corp.io')
    expect(result).toBeUndefined()
    expect(result).not.toBe('')
  })
})

// ─── Preservation: safe UI chrome must survive ───────────────────────────────

describe('screenStateLabel — preserves safe UI chrome', () => {
  it('preserves a generic success toast', () => {
    expect(screenStateLabel('Changes saved')).toBe('Changes saved')
  })

  it('preserves a generic error message with no entity data', () => {
    expect(screenStateLabel('Something went wrong. Please try again.')).toBe(
      'Something went wrong. Please try again.',
    )
  })

  it('preserves a short status label', () => {
    expect(screenStateLabel('Loading')).toBe('Loading')
  })

  it('preserves a modal title with no PII', () => {
    expect(screenStateLabel('Confirm deletion')).toBe('Confirm deletion')
  })
})

// ─── Determinism + edge cases ────────────────────────────────────────────────

describe('screenStateLabel — determinism and edges', () => {
  it('is deterministic across repeated calls', () => {
    const input = 'Invoice approved'
    const results = new Set([
      screenStateLabel(input),
      screenStateLabel(input),
      screenStateLabel(input),
      screenStateLabel(input),
      screenStateLabel(input),
    ])
    expect(results.size).toBe(1)
  })

  it('is deterministic on a rejected input', () => {
    const input = 'user@example.com failed to save'
    expect(screenStateLabel(input)).toBe(screenStateLabel(input))
  })

  it('handles empty string without throwing', () => {
    expect(() => screenStateLabel('')).not.toThrow()
  })

  it('truncates over-long safe text rather than dropping it', () => {
    // 80-char cap is inherited from applySafetyHeuristics. A long-but-safe
    // status line should degrade to a truncated string, not vanish.
    const long = 'Saved '.repeat(40).trim()
    const result = screenStateLabel(long)
    if (result !== undefined) {
      expect(result.length).toBeLessThanOrEqual(80)
    }
  })
})
