/**
 * Tests for label-extractor.ts — specifically rule 9 (short visible text on
 * divs/spans "acting as controls").
 *
 * DOM environment: manual mocks, matching target-inspector.test.ts convention.
 * Rationale: jsdom (available locally in apps/extension-app for React
 * component tests) does not implement `HTMLElement.prototype.innerText`
 * (requires a layout engine jsdom does not provide) — reads return `undefined`
 * rather than the assigned text, which would silently defeat every assertion
 * in this file. Lightweight class-based mocks give full, deterministic
 * control over `innerText`, attributes, and ancestor traversal instead.
 *
 * This suite covers ONLY the rule-9 predicate change (iter: privacy-tighten).
 * It does not attempt to re-verify rules 1-8, 10, 11 beyond what's needed to
 * prove correct fall-through behavior.
 */

import { describe, it, expect } from 'vitest'
import { extractLabel } from './label-extractor.js'

// ─── Manual DOM mocks ─────────────────────────────────────────────────────────

class MockDocument {
  getElementById(_id: string): MockElement | null {
    return null
  }
  querySelector(_selector: string): MockElement | null {
    return null
  }
}

class MockElement {
  tagName: string
  isContentEditable: boolean
  innerText: string | undefined
  parentElement: MockElement | null = null
  ownerDocument: MockDocument
  private attrs: Record<string, string>

  constructor(
    tagName: string,
    opts: {
      attrs?: Record<string, string>
      innerText?: string
      isContentEditable?: boolean
      doc?: MockDocument
    } = {},
  ) {
    this.tagName = tagName.toUpperCase()
    this.attrs = opts.attrs ?? {}
    this.innerText = opts.innerText
    this.isContentEditable = opts.isContentEditable ?? false
    this.ownerDocument = opts.doc ?? new MockDocument()
  }

  getAttribute(name: string): string | null {
    return this.attrs[name] ?? null
  }

  closest(_selector: string): MockElement | null {
    return null
  }

  querySelector(_selector: string): MockElement | null {
    return null
  }
}

function makeControl(
  tag: 'div' | 'span',
  attrs: Record<string, string>,
  innerText: string,
  opts: { isContentEditable?: boolean } = {},
): MockElement {
  return new MockElement(tag, {
    attrs,
    innerText,
    isContentEditable: opts.isContentEditable ?? false,
  })
}

// ─── Rule 9 — genuine control affordance required ─────────────────────────────

describe('extractLabel — rule 9: divs/spans with interactive ARIA role', () => {
  it('div with role="button" and short text still yields its label', () => {
    const el = makeControl('div', { role: 'button' }, 'Save')
    expect(extractLabel(el as unknown as Element)).toBe('Save')
  })

  it('div with role="checkbox" (not covered by rule 8) yields its label via rule 9', () => {
    const el = makeControl('div', { role: 'checkbox' }, 'Remember me')
    expect(extractLabel(el as unknown as Element)).toBe('Remember me')
  })

  it('span with role="switch" yields its label via rule 9', () => {
    const el = makeControl('span', { role: 'switch' }, 'Dark mode')
    expect(extractLabel(el as unknown as Element)).toBe('Dark mode')
  })

  it('div with role="radio" yields its label via rule 9', () => {
    const el = makeControl('div', { role: 'radio' }, 'Option A')
    expect(extractLabel(el as unknown as Element)).toBe('Option A')
  })
})

describe('extractLabel — rule 9: divs/spans with non-negative tabindex', () => {
  it('div with tabindex="0" and no ARIA role still yields its label', () => {
    const el = makeControl('div', { tabindex: '0' }, 'Dismiss')
    expect(extractLabel(el as unknown as Element)).toBe('Dismiss')
  })

  it('div with tabindex="3" (any non-negative value) yields its label', () => {
    const el = makeControl('div', { tabindex: '3' }, 'Next step')
    expect(extractLabel(el as unknown as Element)).toBe('Next step')
  })

  it('div with tabindex="-1" (removed from tab order, not a control) does NOT yield a label from rule 9', () => {
    const el = makeControl('div', { tabindex: '-1' }, 'Panel')
    expect(extractLabel(el as unknown as Element)).toBe('')
  })
})

describe('extractLabel — rule 9 PRIVACY CASE: plain layout div/span must NOT leak arbitrary page text', () => {
  it('a plain layout div with no role/tabindex containing a person\'s name yields NO label (privacy fix)', () => {
    // This is the exact defect EXTENSION_PRIVACY_DISCLOSURE_001.md identified:
    // rule 9 previously applied to every div/span regardless of control affordance,
    // so a name sitting in a bare <div> would be captured and transmitted.
    const el = makeControl('div', {}, 'Jane Doe')
    expect(extractLabel(el as unknown as Element)).toBe('')
  })

  it('a plain layout span with a short dollar amount yields NO label (privacy fix)', () => {
    const el = makeControl('span', {}, '$4,200')
    expect(extractLabel(el as unknown as Element)).toBe('')
  })

  it('a div with role="presentation" (explicitly non-interactive ARIA role) yields NO label from rule 9', () => {
    const el = makeControl('div', { role: 'presentation' }, 'Some text')
    expect(extractLabel(el as unknown as Element)).toBe('')
  })
})

describe('extractLabel — rule 9: contenteditable still excluded regardless of control affordance', () => {
  it('div with role="button" AND isContentEditable=true is excluded (never capture editable user text)', () => {
    const el = makeControl('div', { role: 'button' }, 'User typed text', {
      isContentEditable: true,
    })
    expect(extractLabel(el as unknown as Element)).toBe('')
  })

  it('div with tabindex="0" AND isContentEditable=true is excluded', () => {
    const el = makeControl('div', { tabindex: '0' }, 'User typed text', {
      isContentEditable: true,
    })
    expect(extractLabel(el as unknown as Element)).toBe('')
  })
})

describe('extractLabel — rule 9: 40-char / 5-word bounds still enforced for qualifying elements', () => {
  it('a genuine control (role="checkbox") exceeding 40 characters is rejected by rule 9', () => {
    const longText = 'This label text is deliberately long enough to exceed forty characters'
    expect(longText.length).toBeGreaterThan(40)
    const el = makeControl('div', { role: 'checkbox' }, longText)
    expect(extractLabel(el as unknown as Element)).toBe('')
  })

  it('a genuine control (role="switch") exceeding 5 words is rejected by rule 9', () => {
    const el = makeControl('span', { role: 'switch' }, 'one two three four five six')
    expect(extractLabel(el as unknown as Element)).toBe('')
  })

  it('a genuine control at exactly the 40-char / 5-word boundary is accepted', () => {
    const el = makeControl('div', { role: 'radio' }, 'one two three four five')
    expect('one two three four five'.length).toBeLessThanOrEqual(40)
    expect(extractLabel(el as unknown as Element)).toBe('one two three four five')
  })
})

describe('extractLabel — rule 9 decline falls through cleanly to rule 10', () => {
  it('a plain div (rule 9 declines) still resolves via ancestor aria-label (rule 10)', () => {
    const el = makeControl('div', {}, 'Jane Doe')
    const ancestor = new MockElement('div', { attrs: { 'aria-label': 'Row actions' } })
    el.parentElement = ancestor
    expect(extractLabel(el as unknown as Element)).toBe('Row actions')
  })

  it('an over-length genuine control (rule 9 declines on length) still resolves via ancestor aria-label (rule 10)', () => {
    const longText = 'This label text is deliberately long enough to exceed forty characters'
    const el = makeControl('div', { role: 'checkbox' }, longText)
    const ancestor = new MockElement('div', { attrs: { 'aria-label': 'Preferences panel' } })
    el.parentElement = ancestor
    expect(extractLabel(el as unknown as Element)).toBe('Preferences panel')
  })
})
