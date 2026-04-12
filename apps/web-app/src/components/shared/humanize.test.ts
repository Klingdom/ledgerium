import { describe, it, expect } from 'vitest'
import {
  humanizeStepLabel,
  humanizeShortLabel,
  humanizeInstructionText,
  type InstructionContext,
} from './humanize.js'

// ─── humanizeStepLabel ────────────────────────────────────────────────────────

describe('humanizeStepLabel', () => {
  function label(overrides: Partial<Parameters<typeof humanizeStepLabel>[0]>): string {
    return humanizeStepLabel({
      rawTitle: '',
      category: 'click',
      categoryLabel: 'Click',
      ...overrides,
    })
  }

  it('preserves a good title (3+ words, not weak)', () => {
    const result = label({ rawTitle: 'Submit the invoice form' })
    expect(result).toBe('Submit the invoice form')
  })

  it('uses action field when title is empty and action is good', () => {
    const result = label({ rawTitle: '', action: 'Approve the expense report' })
    expect(result).toBe('Approve the expense report')
  })

  it('falls back to categoryLabel when title and action are empty', () => {
    const result = label({ rawTitle: '', category: 'form_submit', categoryLabel: 'Form Submit' })
    expect(result).toBe('Form Submit')
  })

  it('enriches a short non-weak title with system context', () => {
    const result = label({ rawTitle: 'Submit', system: 'NetSuite' })
    expect(result).toBe('Submit in NetSuite')
  })

  it('enriches a short non-weak title with pageTitle when no system', () => {
    const result = label({ rawTitle: 'Submit', pageTitle: 'Invoice Page' })
    expect(result).toBe('Submit on Invoice Page')
  })

  it('replaces a known weak title using system context', () => {
    const result = label({ rawTitle: 'click element', categoryLabel: 'Click', system: 'Salesforce' })
    expect(result).toBe('Click in Salesforce')
  })

  it('replaces a known weak title using pageTitle context', () => {
    const result = label({ rawTitle: 'action', categoryLabel: 'Action', pageTitle: 'Dashboard' })
    expect(result).toBe('Action on Dashboard')
  })

  it('builds context label with system and routeTemplate when title is empty', () => {
    const result = label({ rawTitle: '', categoryLabel: 'Click', system: 'GitHub', routeTemplate: '/repos/:id' })
    expect(result).toBe('Click at /repos/:id (GitHub)')
  })

  it('appends ordinal as last resort when no context available', () => {
    const result = label({ rawTitle: 'action', categoryLabel: 'Action', ordinal: 3 })
    expect(result).toBe('Action — step 3')
  })

  it('uses instruction text with target label as high-priority source', () => {
    const instructions: InstructionContext[] = [
      { text: 'Click "Submit Invoice"', type: 'action', system: 'NetSuite', targetLabel: 'Submit Invoice', isSensitive: false },
    ]
    const result = label({ rawTitle: 'click element', instructions })
    expect(result).toBe('Click "Submit Invoice"')
  })

  it('does not duplicate system name in enriched title', () => {
    const result = label({ rawTitle: 'Submit in NetSuite', system: 'NetSuite' })
    // Title already contains system — should not double-append
    expect(result).not.toContain('NetSuite in NetSuite')
  })

  it('rejects titles starting with known weak prefixes', () => {
    const result = label({ rawTitle: 'Click the target element', system: 'Workday' })
    expect(result).not.toBe('Click the target element')
  })

  it('enriches HTML-tag-first titles with system context (treated as short but non-weak)', () => {
    // "div the main content area" is not a "good" title (first word is a raw HTML tag)
    // but it is also not in the WEAK_TITLES set, so the function enriches it with system context
    const result = label({ rawTitle: 'div the main content area', categoryLabel: 'Click', system: 'NetSuite' })
    expect(result).toContain('NetSuite')
  })
})

// ─── humanizeShortLabel ───────────────────────────────────────────────────────

describe('humanizeShortLabel', () => {
  it('returns the full label if it is within maxLen', () => {
    expect(humanizeShortLabel('Short label', 35)).toBe('Short label')
  })

  it('truncates at a word boundary with ellipsis', () => {
    const long = 'Submit the invoice approval form for review'
    const result = humanizeShortLabel(long, 30)
    expect(result.length).toBeLessThanOrEqual(31) // maxLen + possible '…'
    expect(result.endsWith('…')).toBe(true)
  })

  it('uses default maxLen of 35', () => {
    const long = 'A'.repeat(40)
    const result = humanizeShortLabel(long)
    expect(result.length).toBeLessThanOrEqual(36)
  })

  it('preserves labels exactly at the boundary', () => {
    const exact = 'A'.repeat(35)
    expect(humanizeShortLabel(exact, 35)).toBe(exact)
  })
})

// ─── humanizeInstructionText ──────────────────────────────────────────────────

describe('humanizeInstructionText', () => {
  it('returns empty string for empty text', () => {
    expect(humanizeInstructionText('', 'Submit', 'NetSuite')).toBe('')
  })

  it('replaces generic "Click the target element" with target label', () => {
    const result = humanizeInstructionText('Click the target element', 'Submit Invoice', 'NetSuite')
    expect(result).toBe('Click "Submit Invoice"')
  })

  it('replaces generic "Click the target element" with system when no target label', () => {
    const result = humanizeInstructionText('Click the target element', '', 'Workday')
    expect(result).toBe('Click the required element in Workday')
  })

  it('replaces generic "Click the target element" with fallback when no context', () => {
    const result = humanizeInstructionText('Click the target element', '', '')
    expect(result).toBe('Click the indicated element')
  })

  it('replaces generic "Enter the required value" with target label', () => {
    const result = humanizeInstructionText('Enter the required value', 'Email Address', 'Salesforce')
    expect(result).toBe('Enter value in "Email Address"')
  })

  it('replaces generic "Enter the required value" with system when no target label', () => {
    const result = humanizeInstructionText('Enter the required value', '', 'HubSpot')
    expect(result).toBe('Enter the required value in HubSpot')
  })

  it('passes through specific instruction text unchanged', () => {
    const specific = 'Navigate to the Invoices module and select the pending entry'
    const result = humanizeInstructionText(specific, '', '')
    expect(result).toBe(specific)
  })

  it('cleans empty quoted strings from instruction text', () => {
    const result = humanizeInstructionText('Click "" to proceed', '', '')
    expect(result).not.toContain('""')
    expect(result).toBe('Click to proceed')
  })
})
