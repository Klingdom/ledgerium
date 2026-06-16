import { describe, it, expect } from 'vitest'
import { formatDuration, formatConfidence, formatDate, formatDateRelative, formatDateTime } from './format.js'

// ─── formatDuration ───────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('returns "< 1s" for null', () => {
    expect(formatDuration(null)).toBe('< 1s')
  })

  it('returns "< 1s" for undefined', () => {
    expect(formatDuration(undefined)).toBe('< 1s')
  })

  it('returns "< 1s" for 0', () => {
    expect(formatDuration(0)).toBe('< 1s')
  })

  it('returns "< 1s" for values under 100ms', () => {
    expect(formatDuration(99)).toBe('< 1s')
  })

  it('returns milliseconds for 100ms–999ms', () => {
    expect(formatDuration(100)).toBe('100ms')
    expect(formatDuration(500)).toBe('500ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  it('returns seconds for 1s–59s', () => {
    expect(formatDuration(1000)).toBe('1s')
    expect(formatDuration(5000)).toBe('5s')
    expect(formatDuration(59_000)).toBe('59s')
  })

  it('returns minutes and seconds for 60s+', () => {
    expect(formatDuration(60_000)).toBe('1m')
    expect(formatDuration(90_000)).toBe('1m 30s')
    expect(formatDuration(125_000)).toBe('2m 5s')
  })

  it('omits seconds when even minutes', () => {
    expect(formatDuration(120_000)).toBe('2m')
    expect(formatDuration(300_000)).toBe('5m')
  })
})

// ─── formatConfidence ─────────────────────────────────────────────────────────

describe('formatConfidence', () => {
  it('returns empty string for null', () => {
    expect(formatConfidence(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatConfidence(undefined)).toBe('')
  })

  it('formats 0 as "0%"', () => {
    expect(formatConfidence(0)).toBe('0%')
  })

  it('formats 1 as "100%"', () => {
    expect(formatConfidence(1)).toBe('100%')
  })

  it('rounds to nearest integer', () => {
    expect(formatConfidence(0.856)).toBe('86%')
    expect(formatConfidence(0.504)).toBe('50%')
  })

  it('formats 0.5 as "50%"', () => {
    expect(formatConfidence(0.5)).toBe('50%')
  })

  it('formats 0.75 as "75%"', () => {
    expect(formatConfidence(0.75)).toBe('75%')
  })
})

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('')
  })

  it('formats a valid ISO date string', () => {
    const result = formatDate('2026-01-15T10:00:00Z')
    // Should contain month, day, year in some form
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2026/)
  })
})

// ─── formatDateTime (atglance-review #15 row disambiguator) ───────────────────

describe('formatDateTime', () => {
  it('returns empty string for null/undefined (honest fallback)', () => {
    expect(formatDateTime(null)).toBe('')
    expect(formatDateTime(undefined)).toBe('')
  })

  it('renders an absolute UTC date + 24h time — deterministic across timezones', () => {
    // 14:05 UTC must render as "14:05" regardless of the test runner's TZ.
    const result = formatDateTime('2026-06-12T14:05:00Z')
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/12/)
    expect(result).toMatch(/2026/)
    expect(result).toMatch(/14:05/)
  })

  it('is deterministic — same input yields the same string (no Date.now())', () => {
    const a = formatDateTime('2026-01-01T00:00:00Z')
    const b = formatDateTime('2026-01-01T00:00:00Z')
    expect(a).toBe(b)
  })

  it('two recordings at different times produce different disambiguators', () => {
    const morning = formatDateTime('2026-06-12T09:00:00Z')
    const evening = formatDateTime('2026-06-12T21:30:00Z')
    expect(morning).not.toBe(evening)
  })
})

// ─── formatDateRelative ───────────────────────────────────────────────────────

describe('formatDateRelative', () => {
  it('returns empty string for null', () => {
    expect(formatDateRelative(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatDateRelative(undefined)).toBe('')
  })

  it('returns "just now" for very recent dates', () => {
    const now = new Date().toISOString()
    expect(formatDateRelative(now)).toBe('just now')
  })

  it('returns minutes ago for dates within the hour', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatDateRelative(fiveMinutesAgo)).toBe('5m ago')
  })

  it('returns hours ago for dates within the day', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60_000).toISOString()
    expect(formatDateRelative(threeHoursAgo)).toBe('3h ago')
  })

  it('returns days ago for dates within the week', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString()
    expect(formatDateRelative(twoDaysAgo)).toBe('2d ago')
  })

  it('returns formatted date for dates older than one week', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60_000).toISOString()
    const result = formatDateRelative(twoWeeksAgo)
    // Should NOT be a relative string — should be a formatted date
    expect(result).not.toMatch(/ago/)
    expect(result).not.toBe('just now')
    expect(result.length).toBeGreaterThan(0)
  })
})
