/**
 * Priority-ordered semantic label extraction with privacy safety heuristics.
 *
 * Priority (primary — explicit labels):
 *   1. aria-label
 *   2. aria-labelledby (resolved)
 *   3. label[for] (resolved via id)
 *   4. wrapping <label> parent
 *   5. placeholder
 *   6. title attribute
 *   7. aria-describedby (resolved, as supplementary context)
 *   8. data-testid (humanised)
 *   9. innerText for buttons and links only
 *
 * Priority (contextual — inferred from DOM structure):
 *  10. Closest wrapping/adjacent <label> by DOM proximity
 *  11. Closest <fieldset> <legend> ancestor
 *  12. Closest heading ancestor (h1-h6)
 *  13. Closest landmark section label (aria-label on parent section/nav/main)
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

  // 4. Wrapping <label> parent — covers <label><input/></label> patterns
  //    common in modern frameworks (React, Material UI, Ant Design)
  const wrappingLabel = el.closest('label')
  if (wrappingLabel) {
    // Extract text excluding the input element's own text
    const clone = wrappingLabel.cloneNode(true) as HTMLElement
    for (const input of clone.querySelectorAll('input, select, textarea')) {
      input.remove()
    }
    const text = clone.textContent?.trim()
    if (text) {
      const safe = applySafetyHeuristics(text)
      if (safe) return safe
    }
  }

  // 5. placeholder
  const placeholder = el.getAttribute('placeholder')?.trim()
  if (placeholder) {
    const safe = applySafetyHeuristics(placeholder)
    if (safe) return safe
  }

  // 6. title attribute
  const title = el.getAttribute('title')?.trim()
  if (title) {
    const safe = applySafetyHeuristics(title)
    if (safe) return safe
  }

  // 7. aria-describedby — supplementary description (may be verbose,
  //    but better than nothing when all other labels are missing)
  const describedBy = el.getAttribute('aria-describedby')?.trim()
  if (describedBy) {
    // aria-describedby can reference multiple IDs separated by spaces
    const ids = describedBy.split(/\s+/)
    const parts: string[] = []
    for (const refId of ids) {
      const refEl = doc.getElementById(refId)
      const text = refEl?.textContent?.trim()
      if (text) parts.push(text)
    }
    if (parts.length > 0) {
      const combined = parts.join(' ')
      const safe = applySafetyHeuristics(combined)
      if (safe) return safe
    }
  }

  // 8. data-testid (humanised — convert hyphens/underscores to spaces)
  const testId = el.getAttribute('data-testid')?.trim()
  if (testId) {
    const humanised = testId.replace(/[-_]/g, ' ')
    const safe = applySafetyHeuristics(humanised)
    if (safe) return safe
  }

  // 9. innerText for interactive leaf elements only
  const tag = el.tagName.toLowerCase()
  if (tag === 'button' || tag === 'a') {
    const text = (el as HTMLElement).innerText?.trim()
    if (text) {
      const safe = applySafetyHeuristics(text)
      if (safe) return safe
    }
  }

  // ── Contextual fallbacks (inferred from DOM structure) ────────────────

  // 10. Adjacent <label> sibling — covers <label>Name</label><input/> patterns
  const prevSibling = el.previousElementSibling
  if (prevSibling?.tagName.toLowerCase() === 'label') {
    const text = prevSibling.textContent?.trim()
    if (text) {
      const safe = applySafetyHeuristics(text)
      if (safe) return safe
    }
  }

  // 11. Closest <fieldset> → <legend> ancestor — provides group context
  //     e.g., "Payment Details", "Shipping Address"
  const fieldset = el.closest('fieldset')
  if (fieldset) {
    const legend = fieldset.querySelector(':scope > legend')
    const text = legend?.textContent?.trim()
    if (text) {
      const safe = applySafetyHeuristics(text)
      if (safe) return safe
    }
  }

  // 12. Closest heading ancestor (h1-h6) — provides section context
  //     Walk up the DOM to find the nearest preceding heading
  const sectionHeading = findNearestHeading(el)
  if (sectionHeading) {
    const safe = applySafetyHeuristics(sectionHeading)
    if (safe) return safe
  }

  // 13. Closest landmark section with aria-label — provides region context
  //     e.g., <section aria-label="Payment Information"><button/>
  const landmark = el.closest('[aria-label]')
  if (landmark && landmark !== el) {
    const landmarkLabel = landmark.getAttribute('aria-label')?.trim()
    if (landmarkLabel) {
      const safe = applySafetyHeuristics(landmarkLabel)
      if (safe) return safe
    }
  }

  return ''
}

/**
 * Walk up the DOM from an element to find the nearest heading (h1-h6).
 * Checks siblings before the element, then moves to parent and repeats.
 * Stops after 4 levels to avoid expensive traversal.
 */
function findNearestHeading(el: Element): string | null {
  let current: Element | null = el
  let depth = 0
  while (current && depth < 4) {
    // Check preceding siblings for a heading
    let sibling = current.previousElementSibling
    while (sibling) {
      const tag = sibling.tagName.toLowerCase()
      if (/^h[1-6]$/.test(tag)) {
        return sibling.textContent?.trim() ?? null
      }
      sibling = sibling.previousElementSibling
    }
    current = current.parentElement
    depth++
  }
  return null
}

/**
 * Extract the section context for an element — the name of the nearest
 * containing section, fieldset, or landmark.
 * Returns null if no meaningful section context is found.
 *
 * This is exposed separately from extractLabel() so callers can use it
 * for contextual enrichment: "Click element in the Payment section"
 */
export function extractSectionContext(el: Element): string | null {
  // 1. Fieldset legend
  const fieldset = el.closest('fieldset')
  if (fieldset) {
    const legend = fieldset.querySelector(':scope > legend')
    const text = legend?.textContent?.trim()
    if (text) return applySafetyHeuristics(text)
  }

  // 2. Landmark aria-label (section, nav, main, aside, form with aria-label)
  const landmark = el.closest('section[aria-label], nav[aria-label], main[aria-label], aside[aria-label], form[aria-label]')
  if (landmark) {
    const label = landmark.getAttribute('aria-label')?.trim()
    if (label) return applySafetyHeuristics(label)
  }

  // 3. Closest heading
  return findNearestHeading(el)
}
