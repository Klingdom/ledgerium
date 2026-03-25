/**
 * MutationObserver-based UI state change detector.
 *
 * Detects:
 *   modal_opened / modal_closed  — aria-modal="true", role=dialog/alertdialog
 *   toast_shown                  — aria-live, role=alert/status on added nodes
 *   loading_started / finished   — aria-busy attribute changes
 *   error_displayed              — requires ≥ 2 independent signals to fire
 *   status_changed               — generic aria-live polite updates
 *
 * All detections are debounced at STATE_CHANGE_DEBOUNCE_MS to batch rapid DOM
 * churn into a single event per kind.
 */

import { STATE_CHANGE_DEBOUNCE_MS } from '../shared/constants.js'
import type { StateChangeKind } from '../shared/types.js'

export type StateChangeCallback = (kind: StateChangeKind, details?: string) => void

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
      attributeFilter: ['aria-modal', 'aria-hidden', 'aria-busy', 'aria-live', 'role'],
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

  private nodeLabel(node: Element): string | undefined {
    const ariaLabel = node.getAttribute('aria-label')?.trim()
    if (ariaLabel) return ariaLabel.slice(0, 80)
    const text = node.textContent?.trim()
    if (text) return text.slice(0, 80)
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
