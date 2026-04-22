/**
 * Tests for target-inspector.ts
 *
 * DOM environment: manual mocks.
 * Rationale: the root vitest config uses environment:'node', no happy-dom or
 * jsdom is installed in the monorepo, and the extension has no local vitest
 * config. Manual factory functions satisfy the three DOM surface areas used
 * by isSensitiveTarget: `instanceof HTMLInputElement`, `.type`, `.autocomplete`,
 * and `.getAttribute()`.
 */

import { describe, it, expect, vi } from 'vitest'

// ─── Manual DOM mocks ─────────────────────────────────────────────────────────

/**
 * Minimal HTMLInputElement mock.
 * We need `instanceof HTMLInputElement` to return true. We do this by assigning
 * the mock class to the global `HTMLInputElement` before importing the module
 * under test — see the vi.mock approach below.
 *
 * Because vitest hoists vi.mock calls, we instead use a simpler pattern:
 * set up the global class before the module is exercised, and use
 * `Object.setPrototypeOf` to make instanceof work correctly.
 */
class MockHTMLInputElement {
  type: string
  autocomplete: string
  private attrs: Record<string, string>

  constructor(opts: { type?: string; autocomplete?: string; attrs?: Record<string, string> } = {}) {
    this.type = opts.type ?? 'text'
    this.autocomplete = opts.autocomplete ?? ''
    this.attrs = opts.attrs ?? {}
  }

  getAttribute(name: string): string | null {
    return this.attrs[name] ?? null
  }

  get tagName(): string {
    return 'INPUT'
  }
}

class MockElement {
  tagName: string
  private attrs: Record<string, string>

  constructor(tagName: string, attrs: Record<string, string> = {}) {
    this.tagName = tagName.toUpperCase()
    this.attrs = attrs
  }

  getAttribute(name: string): string | null {
    return this.attrs[name] ?? null
  }
}

// Make `instanceof HTMLInputElement` work for MockHTMLInputElement.
// We assign our mock class to the global so the runtime check resolves correctly.
const globalAny = globalThis as Record<string, unknown>
globalAny['HTMLInputElement'] = MockHTMLInputElement

// Import AFTER setting up the global so the module's instanceof checks bind
// to our mock constructor.
import { isSensitiveTarget, inspectTarget } from './target-inspector.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeInput(
  type: string,
  attrs: Record<string, string> = {},
  autocomplete = '',
): MockHTMLInputElement {
  return new MockHTMLInputElement({ type, autocomplete, attrs })
}

function makeElement(tagName: string, attrs: Record<string, string> = {}): MockElement {
  return new MockElement(tagName, attrs)
}

// ─── isSensitiveTarget — existing behaviours (must not regress) ───────────────

describe('isSensitiveTarget — DOM-type guards', () => {
  it('password input → sensitive', () => {
    expect(isSensitiveTarget(makeInput('password') as unknown as Element)).toBe(true)
  })

  it('hidden input → sensitive', () => {
    expect(isSensitiveTarget(makeInput('hidden') as unknown as Element)).toBe(true)
  })

  it('autocomplete="current-password" → sensitive', () => {
    expect(
      isSensitiveTarget(makeInput('text', {}, 'current-password') as unknown as Element),
    ).toBe(true)
  })

  it('autocomplete="new-password" → sensitive', () => {
    expect(isSensitiveTarget(makeInput('text', {}, 'new-password') as unknown as Element)).toBe(
      true,
    )
  })
})

describe('isSensitiveTarget — name attribute patterns', () => {
  it('name="password" → sensitive', () => {
    expect(isSensitiveTarget(makeInput('text', { name: 'password' }) as unknown as Element)).toBe(
      true,
    )
  })

  it('name="userPassword" → sensitive', () => {
    expect(
      isSensitiveTarget(makeInput('text', { name: 'userPassword' }) as unknown as Element),
    ).toBe(true)
  })

  it('name="secret-token" → sensitive', () => {
    expect(
      isSensitiveTarget(makeInput('text', { name: 'secret-token' }) as unknown as Element),
    ).toBe(true)
  })

  it('name="ssn" → sensitive', () => {
    expect(isSensitiveTarget(makeInput('text', { name: 'ssn' }) as unknown as Element)).toBe(true)
  })
})

describe('isSensitiveTarget — id attribute patterns', () => {
  it('id="api_key" → sensitive', () => {
    expect(isSensitiveTarget(makeInput('text', { id: 'api_key' }) as unknown as Element)).toBe(
      true,
    )
  })

  it('id="apiKey" → sensitive', () => {
    expect(isSensitiveTarget(makeInput('text', { id: 'apiKey' }) as unknown as Element)).toBe(true)
  })
})

describe('isSensitiveTarget — data-testid attribute patterns', () => {
  it('data-testid="cvv-input" → sensitive', () => {
    expect(
      isSensitiveTarget(
        makeInput('text', { 'data-testid': 'cvv-input' }) as unknown as Element,
      ),
    ).toBe(true)
  })
})

describe('isSensitiveTarget — aria-label patterns', () => {
  it('aria-label="card-number" → sensitive (matches shared /card[_-]?number/i)', () => {
    expect(
      isSensitiveTarget(
        makeInput('text', { 'aria-label': 'card-number' }) as unknown as Element,
      ),
    ).toBe(true)
  })

  it('aria-label="cvv" → sensitive', () => {
    expect(
      isSensitiveTarget(makeInput('text', { 'aria-label': 'cvv' }) as unknown as Element),
    ).toBe(true)
  })

  // Iter 027 closed this gap: shared classifier regex widened from /credit[_-]?card/i to
  // /credit[\s_-]*card/i, which now matches space-separated natural-language labels.
  // (card[_-]?number/i remains narrow — candidate for a future iteration; see
  // IMPROVEMENT_BACKLOG.md iter-027 follow-up notes.)
  it('aria-label="Credit card number" (space-separated) → sensitive via shared classifier (iter-027 gap closed)', () => {
    expect(
      isSensitiveTarget(
        makeInput('text', { 'aria-label': 'Credit card number' }) as unknown as Element,
      ),
    ).toBe(true)
  })
})

describe('isSensitiveTarget — non-sensitive inputs', () => {
  it('text input with name="username" → NOT sensitive', () => {
    expect(isSensitiveTarget(makeInput('text', { name: 'username' }) as unknown as Element)).toBe(
      false,
    )
  })

  it('anchor tag → NOT sensitive', () => {
    expect(isSensitiveTarget(makeElement('a', { href: 'https://example.com' }) as unknown as Element)).toBe(false)
  })
})

// ─── isSensitiveTarget — new patterns available via shared classifier ─────────

describe('isSensitiveTarget — patterns newly available via @ledgerium/policy-engine', () => {
  it('name="card_number" → sensitive (shared classifier pattern, not in old local regex)', () => {
    expect(
      isSensitiveTarget(makeInput('text', { name: 'card_number' }) as unknown as Element),
    ).toBe(true)
  })

  it('name="social_security_number" → sensitive (shared classifier pattern)', () => {
    expect(
      isSensitiveTarget(
        makeInput('text', { name: 'social_security_number' }) as unknown as Element,
      ),
    ).toBe(true)
  })

  it('name="tax_id" → sensitive (shared classifier pattern)', () => {
    expect(isSensitiveTarget(makeInput('text', { name: 'tax_id' }) as unknown as Element)).toBe(
      true,
    )
  })
})

// ─── inspectTarget — smoke test ───────────────────────────────────────────────

describe('inspectTarget — smoke test', () => {
  it('returns a RawEventTarget with required fields for a button element', () => {
    // inspectTarget uses extractLabel and djb2Hash — we need a minimal element
    // that satisfies getStableSelector and getAncestorPath traversal.
    const el = makeElement('button', { id: 'submit-btn', 'aria-label': 'Submit form' })
    // Attach a minimal parentElement to prevent null-traversal in getAncestorPath
    const parent = makeElement('div', {})
    ;(el as unknown as Record<string, unknown>)['parentElement'] = parent
    ;(parent as unknown as Record<string, unknown>)['parentElement'] = null

    const result = inspectTarget(el as unknown as Element)

    expect(result).toMatchObject({
      selector: expect.any(String),
      selectorFingerprint: expect.any(Number),
      role: expect.any(String),
      elementType: expect.any(String),
      interactionType: expect.any(String),
      ancestorPath: expect.any(Array),
      isSensitive: false,
    })
    // Selector should prefer the id since SAFE_ID_RE allows alphanum/dash/underscore
    expect(result.selector).toBe('#submit-btn')
  })
})
