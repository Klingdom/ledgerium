/**
 * MutationObserver-based UI state change detector.
 *
 * Detects:
 *   modal_opened / modal_closed  — aria-modal="true", role=dialog/alertdialog
 *   toast_shown                  — aria-live, role=alert/status on added nodes
 *   loading_started / finished   — aria-busy attribute changes
 *   error_displayed              — requires ≥ 2 independent signals to fire
 *   status_changed               — generic aria-live polite updates
 *   dropdown_opened / dropdown_closed — aria-expanded changes on combobox/listbox/menu
 *
 * All detections are debounced at STATE_CHANGE_DEBOUNCE_MS to batch rapid DOM
 * churn into a single event per kind.
 */

import { STATE_CHANGE_DEBOUNCE_MS } from '../shared/constants.js'
import type { StateChangeKind } from '../shared/types.js'
import { screenFreeText } from './free-text-screen.js'

export type StateChangeCallback = (kind: StateChangeKind, details?: string) => void

/**
 * PII screening for a single state-change label candidate.
 *
 * SECURITY (F-2, Funnel & SOP Review 001): the state-observer path captures
 * modal / toast / alert / error text — precisely the class of UI text designed
 * to echo user- and record-specific data back to the screen ("Payment declined
 * — card ending 4242", "Failed to save record for Sarah Connor"). Before this
 * fix, `nodeLabel()` returned raw `textContent` with NO screening, making it
 * the only text-extraction path in the extension without a guard.
 *
 * Delegates to the shared `screenFreeText` guard. That guard — not
 * `applySafetyHeuristics` directly — is required here: the label extractor's
 * email and URL patterns are ANCHORED and therefore do not reject PII embedded
 * mid-sentence, which is the normal shape of toast and error copy. See
 * free-text-screen.ts for the full rationale.
 *
 * Returns `undefined` on rejection rather than falling through to an
 * unscreened alternative — absent beats leaked.
 *
 * Pure. Exported for unit testing; does not touch DOM globals. Mirrors the
 * `screenPageTitle` / `getSafePageTitle` split used for the F-0 fix.
 */
export function screenStateLabel(raw: string): string | undefined {
  return screenFreeText(raw) ?? undefined
}

export class StateObserver {
  private observer: MutationObserver | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private pending: Array<{ kind: StateChangeKind; details?: string }> = []

  constructor(private readonly onStateChange: StateChangeCallback) {}

  start(): void {
    if (this.observer) return
    this.observer = new MutationObserver((mutations) => {
      for (const m of mutations) this.analyzeMutation(m)
    })
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['aria-modal', 'aria-hidden', 'aria-busy', 'aria-live', 'aria-expanded', 'role'],
    })
  }

  stop(): void {
    this.observer?.disconnect()
    this.observer = null
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.pending = []
  }

  // ─── Mutation analysis ─────────────────────────────────────────────────────

  private analyzeMutation(m: MutationRecord): void {
    if (m.type === 'childList') {
      for (const node of m.addedNodes) {
        if (node instanceof Element) this.checkAddedNode(node)
      }
      for (const node of m.removedNodes) {
        if (node instanceof Element) this.checkRemovedNode(node)
      }
    } else if (m.type === 'attributes') {
      this.checkAttributeChange(m.target as Element, m.attributeName ?? '', m.oldValue)
    }
  }

  private checkAddedNode(node: Element): void {
    const role = node.getAttribute('role')
    const ariaModal = node.getAttribute('aria-modal')
    const ariaLive = node.getAttribute('aria-live')

    if (ariaModal === 'true' || role === 'dialog' || role === 'alertdialog') {
      this.schedule('modal_opened', this.nodeLabel(node))
      return
    }
    if (ariaLive === 'assertive' || role === 'alert') {
      if (this.isErrorNode(node)) {
        this.schedule('error_displayed', this.nodeLabel(node))
      } else {
        this.schedule('toast_shown', this.nodeLabel(node))
      }
      return
    }
    if (ariaLive === 'polite' || role === 'status') {
      this.schedule('toast_shown', this.nodeLabel(node))
    }
  }

  private checkRemovedNode(node: Element): void {
    const role = node.getAttribute('role')
    const ariaModal = node.getAttribute('aria-modal')
    if (ariaModal === 'true' || role === 'dialog' || role === 'alertdialog') {
      this.schedule('modal_closed', this.nodeLabel(node))
    }
  }

  private checkAttributeChange(el: Element, attr: string, oldValue: string | null): void {
    const current = el.getAttribute(attr)

    if (attr === 'aria-busy') {
      const isBusy = current === 'true'
      const wasBusy = oldValue === 'true'
      if (isBusy && !wasBusy) this.schedule('loading_started')
      else if (!isBusy && wasBusy) this.schedule('loading_finished')
    }

    if (attr === 'aria-hidden') {
      const role = el.getAttribute('role')
      const ariaModal = el.getAttribute('aria-modal')
      if (role === 'dialog' || role === 'alertdialog' || ariaModal === 'true') {
        const isHidden = current === 'true'
        this.schedule(isHidden ? 'modal_closed' : 'modal_opened', this.nodeLabel(el))
      }
    }

    // Dropdown / combobox / menu expand/collapse detection.
    // aria-expanded is used by comboboxes, listboxes, menus, and custom dropdowns.
    if (attr === 'aria-expanded') {
      const role = el.getAttribute('role')
      const isDropdownRole = role === 'combobox' || role === 'listbox' || role === 'menu' ||
                             role === 'menubar' || role === 'button' || role === 'select'
      // Also detect by tag: <select>, <details>, or any button with aria-expanded
      const isDropdownTag = el.tagName === 'SELECT' || el.tagName === 'DETAILS' || el.tagName === 'BUTTON'
      if (isDropdownRole || isDropdownTag || oldValue !== null) {
        const expanded = current === 'true'
        const wasExpanded = oldValue === 'true'
        if (expanded && !wasExpanded) {
          this.schedule('dropdown_opened' as StateChangeKind, this.nodeLabel(el))
        } else if (!expanded && wasExpanded) {
          this.schedule('dropdown_closed' as StateChangeKind, this.nodeLabel(el))
        }
      }
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Requires ≥ 2 independent signals to classify a node as an error.
   * Prevents false positives from generic container nodes.
   */
  private isErrorNode(node: Element): boolean {
    let signals = 0
    const role = node.getAttribute('role')
    const className = (node.className ?? '').toString().toLowerCase()
    const text = (node.textContent ?? '').toLowerCase()

    if (role === 'alert' || role === 'alertdialog') signals++
    if (className.includes('error') || className.includes('alert') || className.includes('danger')) signals++
    if (/\berror\b|\bfailed\b|\binvalid\b|\bdenied\b/.test(text)) signals++
    if (node.getAttribute('aria-atomic') === 'true') signals++

    return signals >= 2
  }

  /**
   * PII-screened label for an observed state-change node.
   *
   * SECURITY (F-2, Funnel & SOP Review 001): this path captures modal / toast /
   * alert / error text — precisely the class of UI text designed to echo user-
   * and record-specific data back to the screen ("Payment declined — card
   * ending 4242", "Failed to save record for Sarah Connor"). Before this fix it
   * returned raw `textContent` with NO screening, making it the only text-
   * extraction path in the extension without a guard.
   *
   * Both candidates now pass through the shared `applySafetyHeuristics` used by
   * the label extractor (email / URL / long-digit-run / phone / SSN / CC /
   * word-count rejection + 80-char truncation). A rejected candidate returns
   * `undefined` rather than falling through to an unscreened alternative —
   * absent beats leaked.
   */
  private nodeLabel(node: Element): string | undefined {
    const ariaLabel = node.getAttribute('aria-label')?.trim()
    if (ariaLabel) return screenStateLabel(ariaLabel)
    const text = node.textContent?.trim()
    if (text) return screenStateLabel(text)
    return undefined
  }

  // ─── Debounce + deduplicate ────────────────────────────────────────────────

  private schedule(kind: StateChangeKind, details?: string): void {
    // exactOptionalPropertyTypes: only include details when defined
    this.pending.push(details !== undefined ? { kind, details } : { kind })
    if (this.debounceTimer !== null) return
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      const batch = this.pending.splice(0)
      const seen = new Set<StateChangeKind>()
      for (const { kind: k, details: d } of batch) {
        if (!seen.has(k)) {
          seen.add(k)
          this.onStateChange(k, d)
        }
      }
    }, STATE_CHANGE_DEBOUNCE_MS)
  }
}
