/**
 * DOM target metadata extraction.
 *
 * Produces a stable RawEventTarget from any DOM element:
 *   - Stable selector using priority chain: data-testid → data-qa → id →
 *     aria-label → role+name → ancestor-path → tagName
 *   - djb2 fingerprint of the selector string (for dedup without PII)
 *   - InteractionType classification based on element semantics
 *   - Ancestor path (max 4 levels, stops at body/html)
 *   - Sensitivity flag — callers should set this via isSensitiveTarget()
 *     before using the result
 */

import { djb2Hash } from '../shared/utils.js'
import { extractLabel, extractSectionContext } from './label-extractor.js'
import type { InteractionType, RawEventTarget } from '../shared/types.js'

// ─── Sensitivity ──────────────────────────────────────────────────────────────

const SENSITIVE_INPUT_TYPES = new Set(['password', 'hidden'])
const SENSITIVE_RE = /password|passwd|secret|token|api[_-]?key|credit|cvv|ssn/i

export function isSensitiveTarget(el: Element): boolean {
  if (el instanceof HTMLInputElement) {
    if (SENSITIVE_INPUT_TYPES.has(el.type.toLowerCase())) return true
    if (el.autocomplete?.toLowerCase().includes('password')) return true
  }
  const name = el.getAttribute('name') ?? ''
  const id = el.getAttribute('id') ?? ''
  const testId = el.getAttribute('data-testid') ?? ''
  const ariaLabel = el.getAttribute('aria-label') ?? ''
  return (
    SENSITIVE_RE.test(name) ||
    SENSITIVE_RE.test(id) ||
    SENSITIVE_RE.test(testId) ||
    SENSITIVE_RE.test(ariaLabel)
  )
}

// ─── Stable selector ──────────────────────────────────────────────────────────

const SAFE_ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/

function buildAncestorChain(el: Element): string {
  const parts: string[] = [el.tagName.toLowerCase()]
  let current = el.parentElement
  let depth = 0
  while (current && depth < 2) {
    const tag = current.tagName.toLowerCase()
    if (tag === 'body' || tag === 'html') break
    const testId = current.getAttribute('data-testid')
    if (testId) {
      parts.unshift(`[data-testid="${testId}"]`)
      break
    }
    const id = current.getAttribute('id')
    if (id && SAFE_ID_RE.test(id)) {
      parts.unshift(`#${id}`)
      break
    }
    parts.unshift(tag)
    current = current.parentElement
    depth++
  }
  return parts.join(' > ')
}

function getStableSelector(el: Element): string {
  const testId = el.getAttribute('data-testid')
  if (testId) return `[data-testid="${testId}"]`

  const dataQa = el.getAttribute('data-qa')
  if (dataQa) return `[data-qa="${dataQa}"]`

  const id = el.getAttribute('id')
  if (id && SAFE_ID_RE.test(id)) return `#${id}`

  const ariaLabel = el.getAttribute('aria-label')
  if (ariaLabel) return `[aria-label="${ariaLabel.slice(0, 40)}"]`

  const role = el.getAttribute('role')
  const name = el.getAttribute('name')
  if (role && name) return `${el.tagName.toLowerCase()}[role="${role}"][name="${name}"]`
  if (role) return `${el.tagName.toLowerCase()}[role="${role}"]`
  if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`

  return buildAncestorChain(el)
}

// ─── Interaction type classification ─────────────────────────────────────────

function classifyInteractionType(el: Element): InteractionType {
  const tag = el.tagName.toLowerCase()
  const inputType = el instanceof HTMLInputElement ? el.type.toLowerCase() : ''
  const role = el.getAttribute('role')?.toLowerCase()

  if (tag === 'a') return 'link_click'
  if (tag === 'button' || role === 'button') return 'button_click'
  if (tag === 'select' || role === 'listbox' || role === 'combobox') return 'dropdown_select'
  if (inputType === 'checkbox' || role === 'checkbox') return 'checkbox_toggle'
  if (inputType === 'radio' || role === 'radio') return 'radio_select'
  if (tag === 'input' || tag === 'textarea') return 'text_input'
  if (tag === 'form') return 'form_submit'
  return 'generic_click'
}

// ─── Ancestor path ────────────────────────────────────────────────────────────

function getAncestorPath(el: Element): string[] {
  const path: string[] = []
  let current = el.parentElement
  while (current && path.length < 4) {
    const tag = current.tagName.toLowerCase()
    if (tag === 'body' || tag === 'html') break
    const testId = current.getAttribute('data-testid')
    const id = current.getAttribute('id')
    const role = current.getAttribute('role')
    if (testId) path.push(`[data-testid="${testId}"]`)
    else if (id && SAFE_ID_RE.test(id)) path.push(`#${id}`)
    else if (role) path.push(`${tag}[role="${role}"]`)
    else path.push(tag)
    current = current.parentElement
  }
  return path
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Inspect a DOM element and return structured metadata.
 * Does NOT perform sensitivity checks — use isSensitiveTarget() first
 * and skip inspection for sensitive elements.
 */
export function inspectTarget(el: Element): RawEventTarget {
  const selector = getStableSelector(el)
  const sectionContext = extractSectionContext(el)
  return {
    selector,
    selectorFingerprint: djb2Hash(selector),
    label: extractLabel(el),
    role: el.getAttribute('role') ?? el.tagName.toLowerCase(),
    elementType: el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase(),
    interactionType: classifyInteractionType(el),
    ancestorPath: getAncestorPath(el),
    isSensitive: false,
    ...(sectionContext ? { sectionContext } : {}),
  }
}
