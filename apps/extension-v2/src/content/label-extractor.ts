/**
 * Priority-ordered semantic label extraction with privacy safety heuristics.
 *
 * Priority:
 *   1. aria-label
 *   2. aria-labelledby (resolved)
 *   3. label[for] (resolved via id)
 *   4. placeholder
 *   5. title attribute
 *   6. data-testid (humanised)
 *   7. innerText for buttons and links only
 *
 * Safety heuristics reject any candidate that:
 *   - Looks like an email address
 *   - Looks like a URL
 *   - Is a long digit sequence (≥ 5 consecutive digits, e.g. credit cards)
 *   - Contains 12 or more words (verbose body copy, not a label)
 *   - Is empty or only whitespace
 *
 * Returns empty string when no safe label can be found.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\//i
const LONG_DIGITS_RE = /\d{5,}/

const MAX_LABEL_CHARS = 80
const MAX_LABEL_WORDS = 12

function applySafetyHeuristics(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null
  if (EMAIL_RE.test(text)) return null
  if (URL_RE.test(text)) return null
  if (LONG_DIGITS_RE.test(text.replace(/[\s\-]/g, ''))) return null
  if (text.split(/\s+/).length >= MAX_LABEL_WORDS) return null
  return text.slice(0, MAX_LABEL_CHARS)
}

export function extractLabel(el: Element): string {
  const doc = el.ownerDocument

  // 1. aria-label
  const ariaLabel = el.getAttribute('aria-label')?.trim()
  if (ariaLabel) {
    const safe = applySafetyHeuristics(ariaLabel)
    if (safe) return safe
  }

  // 2. aria-labelledby (resolve referenced element)
  const labelledBy = el.getAttribute('aria-labelledby')?.trim()
  if (labelledBy) {
    const refEl = doc.getElementById(labelledBy)
    const text = refEl?.textContent?.trim()
    if (text) {
      const safe = applySafetyHeuristics(text)
      if (safe) return safe
    }
  }

  // 3. label[for] linked to this element's id
  const id = el.getAttribute('id')
  if (id) {
    const labelEl = doc.querySelector(`label[for="${CSS.escape(id)}"]`)
    const text = labelEl?.textContent?.trim()
    if (text) {
      const safe = applySafetyHeuristics(text)
      if (safe) return safe
    }
  }

  // 4. placeholder
  const placeholder = el.getAttribute('placeholder')?.trim()
  if (placeholder) {
    const safe = applySafetyHeuristics(placeholder)
    if (safe) return safe
  }

  // 5. title attribute
  const title = el.getAttribute('title')?.trim()
  if (title) {
    const safe = applySafetyHeuristics(title)
    if (safe) return safe
  }

  // 6. data-testid (humanised — convert hyphens/underscores to spaces)
  const testId = el.getAttribute('data-testid')?.trim()
  if (testId) {
    const humanised = testId.replace(/[-_]/g, ' ')
    const safe = applySafetyHeuristics(humanised)
    if (safe) return safe
  }

  // 7. innerText for interactive leaf elements only
  const tag = el.tagName.toLowerCase()
  if (tag === 'button' || tag === 'a') {
    const text = (el as HTMLElement).innerText?.trim()
    if (text) {
      const safe = applySafetyHeuristics(text)
      if (safe) return safe
    }
  }

  return ''
}
