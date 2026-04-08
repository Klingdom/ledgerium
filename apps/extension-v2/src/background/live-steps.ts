import type { CanonicalEvent, LiveStep } from '../shared/types.js'
import { CLICK_NAV_WINDOW_MS, RAPID_CLICK_DEDUP_MS, IDLE_GAP_MS } from '../shared/constants.js'

/**
 * Streaming live step builder — produces real-time steps for the sidebar feed.
 *
 * v2.1: Improved to match batch segmenter boundaries more closely:
 * - target_changed: different interaction target → finalize
 * - route_changed: SPA navigation → finalize
 * - action_completed: Send/Submit/Save button → finalize
 * - idle_gap: >45s silence → finalize
 * - data_entry/send_action/file_action grouping support
 */

const SEND_ACTION_PATTERNS = /^(send|submit|save|confirm|approve|delete|remove|publish|post|create|update|done|finish|complete|close)/i

export class LiveStepBuilder {
  private sessionId: string
  private accumulator: CanonicalEvent[] = []
  private finalizedSteps: LiveStep[] = []
  private stepCounter = 0
  private lastEventT = 0
  private onUpdate: (step: LiveStep) => void

  constructor(sessionId: string, onUpdate: (step: LiveStep) => void) {
    this.sessionId = sessionId
    this.onUpdate = onUpdate
  }

  processEvent(event: CanonicalEvent): void {
    // Filter system noise but keep error_displayed for error_handling grouping
    if (event.event_type.startsWith('derived.')) return
    if (event.event_type.startsWith('system.') && event.event_type !== 'system.error_displayed') return

    // Annotation — finalize current, emit annotation step
    if (event.event_type === 'session.annotation_added') {
      this.finalizeAccumulator('user_annotation')
      const step = this.buildStep([event], 'annotation', 'user_annotation', true)
      this.finalizedSteps.push(step)
      this.onUpdate(step)
      return
    }

    // ── Boundary checks BEFORE accumulating ──────────────────────────────

    // Idle gap: if >45s since last event, finalize the current step
    if (this.accumulator.length > 0 && this.lastEventT > 0 && event.t_ms - this.lastEventT > IDLE_GAP_MS) {
      this.finalizeAccumulator('idle_gap')
    }

    // Domain change: different app/system → finalize
    if (this.accumulator.length > 0) {
      const prevDomain = this.lastAccumulatorDomain()
      const currDomain = event.page_context?.domain
      if (prevDomain && currDomain && prevDomain !== currDomain) {
        this.finalizeAccumulator('navigation_changed')
      }
    }

    // Route change (SPA navigation within same domain)
    if (event.event_type === 'navigation.route_change' || event.event_type === 'navigation.spa_route_changed') {
      if (this.accumulator.length > 0) {
        this.finalizeAccumulator('route_changed')
      }
      // Don't add the route_change event to the new accumulator — it's a boundary marker
      this.lastEventT = event.t_ms
      return
    }

    // Target changed: if the user interacts with a different element, finalize
    if (this.accumulator.length > 0 && event.actor_type === 'human' && event.target_summary?.selector) {
      const prevTarget = this.lastHumanTargetSelector()
      if (prevTarget && prevTarget !== event.target_summary.selector) {
        // Only finalize if there's been >2s since last event (avoid splitting rapid sequences)
        const timeSinceLast = event.t_ms - this.lastEventT
        if (timeSinceLast > 2000) {
          this.finalizeAccumulator('target_changed')
        }
      }
    }

    // ── Accumulate the event ─────────────────────────────────────────────

    this.accumulator.push(event)
    this.lastEventT = event.t_ms

    // ── Boundary checks AFTER accumulating ───────────────────────────────

    // Submit → finalize immediately
    if (event.event_type === 'interaction.submit') {
      this.finalizeAccumulator('form_submitted')
      return
    }

    // Action button click (Send, Save, Submit, etc.) → finalize
    if (event.event_type === 'interaction.click') {
      const label = event.target_summary?.label ?? ''
      if (label && SEND_ACTION_PATTERNS.test(label.trim())) {
        this.finalizeAccumulator('action_completed')
        return
      }
    }

    // File input → finalize as file_action
    if (event.event_type === 'interaction.input_change' &&
        event.target_summary?.elementType === 'file') {
      this.finalizeAccumulator('target_changed')
      return
    }

    // Emit updated provisional step
    const provisional = this.buildProvisional()
    if (provisional) this.onUpdate(provisional)
  }

  finalize(): LiveStep[] {
    this.finalizeAccumulator('session_stop')
    return [...this.finalizedSteps]
  }

  getProvisionalStep(): LiveStep | null {
    return this.buildProvisional()
  }

  getFinalizedSteps(): LiveStep[] {
    return [...this.finalizedSteps]
  }

  reset(): void {
    this.accumulator = []
    this.finalizedSteps = []
    this.stepCounter = 0
    this.lastEventT = 0
  }

  private lastAccumulatorDomain(): string | undefined {
    for (let i = this.accumulator.length - 1; i >= 0; i--) {
      const d = this.accumulator[i]?.page_context?.domain
      if (d) return d
    }
    return undefined
  }

  private lastHumanTargetSelector(): string | undefined {
    for (let i = this.accumulator.length - 1; i >= 0; i--) {
      const e = this.accumulator[i]!
      if (e.actor_type === 'human' && e.target_summary?.selector) {
        return e.target_summary.selector
      }
    }
    return undefined
  }

  private finalizeAccumulator(boundaryReason: string): void {
    if (this.accumulator.length === 0) return
    this.stepCounter++
    const step = this.buildStep(
      this.accumulator,
      this.classifyGrouping(this.accumulator),
      boundaryReason,
      true,
    )
    this.finalizedSteps.push(step)
    this.accumulator = []
    this.onUpdate(step)
  }

  private buildProvisional(): LiveStep | null {
    if (this.accumulator.length === 0) return null
    return this.buildStep(this.accumulator, this.classifyGrouping(this.accumulator), undefined, false)
  }

  private buildStep(
    events: CanonicalEvent[],
    grouping: string,
    boundaryReason: string | undefined,
    finalized: boolean,
  ): LiveStep {
    const first = events[0]!
    const last = events[events.length - 1]!
    const stepId = finalized
      ? `${this.sessionId}-step-${this.stepCounter}`
      : `${this.sessionId}-step-provisional`

    return {
      stepId,
      title: this.deriveTitle(events, grouping),
      status: finalized ? 'finalized' : 'provisional',
      ...(boundaryReason !== undefined ? { boundaryReason } : {}),
      grouping,
      ...(first.page_context?.applicationLabel
        ? { pageLabel: first.page_context.applicationLabel }
        : {}),
      confidence: this.calcConfidence(events, grouping),
      eventCount: events.length,
      startedAt: first.t_ms,
      ...(finalized ? { finalizedAt: last.t_ms } : {}),
    }
  }

  private deriveTitle(events: CanonicalEvent[], grouping: string): string {
    const first = events[0]
    const page = first?.page_context
    const target = first?.target_summary

    if (grouping === 'annotation') return first?.annotation_text ?? 'Annotation'
    if (grouping === 'fill_and_submit') return `Fill and submit ${page?.pageTitle ?? 'form'}`
    if (grouping === 'click_then_navigate') {
      const nav = events.find(e => e.event_type.startsWith('navigation.'))
      return `Navigate to ${nav?.page_context?.pageTitle ?? nav?.page_context?.routeTemplate ?? 'page'}`
    }
    if (grouping === 'repeated_click_dedup') return `Click ${target?.label ?? target?.role ?? 'element'}`
    if (grouping === 'error_handling') return 'Handle error'
    if (grouping === 'send_action') {
      const clickEvt = events.find(e => e.event_type === 'interaction.click' && e.target_summary?.label)
      return clickEvt?.target_summary?.label ?? 'Submit action'
    }
    if (grouping === 'file_action') return 'Attach file'
    if (grouping === 'data_entry') {
      // Use field labels for a better title
      const fields = events
        .filter(e => e.event_type === 'interaction.input_change' && e.target_summary?.label)
        .map(e => e.target_summary!.label!)
        .filter((l, i, arr) => arr.indexOf(l) === i)
        .slice(0, 2)
      if (fields.length > 0) return `Enter ${fields.join(', ')}`
      return `Enter ${page?.pageTitle ?? 'data'}`
    }

    const type = first?.event_type ?? ''
    if (type === 'interaction.click') return `Click ${target?.label ?? target?.role ?? 'element'}`
    if (type === 'interaction.input_change') return `Enter ${target?.label ?? 'data'}`
    if (type === 'interaction.submit') return `Submit ${page?.pageTitle ?? 'form'}`
    if (type.startsWith('navigation.')) return `Navigate to ${page?.pageTitle ?? page?.routeTemplate ?? 'page'}`
    return 'Perform action'
  }

  private calcConfidence(events: CanonicalEvent[], grouping: string): number {
    if (grouping === 'annotation') return 1.0
    if (grouping === 'fill_and_submit') return 0.90
    if (grouping === 'click_then_navigate') return 0.85
    if (grouping === 'file_action') return 0.85
    if (grouping === 'error_handling') return 0.80
    if (grouping === 'data_entry') return 0.80
    if (grouping === 'send_action') return 0.90
    if (grouping === 'repeated_click_dedup') return 0.70
    return events.some(e => e.target_summary?.label) ? 0.75 : 0.55
  }

  private classifyGrouping(events: CanonicalEvent[]): string {
    if (events.length === 1 && events[0]?.event_type === 'session.annotation_added') return 'annotation'

    // Error handling: error displayed + human action
    const hasError = events.some(e => e.event_type === 'system.error_displayed')
    const hasHumanAction = events.some(e => e.actor_type === 'human')
    if (hasError && hasHumanAction) return 'error_handling'

    const hasSubmit = events.some(e => e.event_type === 'interaction.submit')
    const hasInput = events.some(e => e.event_type === 'interaction.input_change')

    // Fill and submit: input change + form submit
    if (hasSubmit && hasInput) return 'fill_and_submit'

    // File action: file input interaction
    if (events.some(e => e.target_summary?.elementType === 'file')) return 'file_action'

    // Send action: click on a Send/Submit/Save-style button
    const sendClick = events.find(e =>
      e.event_type === 'interaction.click' &&
      e.target_summary?.label &&
      SEND_ACTION_PATTERNS.test(e.target_summary.label.trim()),
    )
    if (sendClick) return 'send_action'

    // Click then navigate
    const clickIdx = events.findIndex(e => e.event_type === 'interaction.click')
    if (clickIdx >= 0) {
      const navIdx = events.findIndex((e, i) => i > clickIdx && e.event_type.startsWith('navigation.'))
      if (navIdx >= 0 && events[navIdx]!.t_ms - events[clickIdx]!.t_ms <= CLICK_NAV_WINDOW_MS) {
        return 'click_then_navigate'
      }
    }

    // Repeated click dedup
    const clicks = events.filter(e => e.event_type === 'interaction.click')
    if (clicks.length > 1 && clicks[clicks.length - 1]!.t_ms - clicks[0]!.t_ms <= RAPID_CLICK_DEDUP_MS) {
      return 'repeated_click_dedup'
    }

    // Data entry: majority of events are input changes
    const inputCount = events.filter(e => e.event_type === 'interaction.input_change' || e.event_type === 'interaction.keyboard_shortcut').length
    if (inputCount > 0 && inputCount >= events.length * 0.5) return 'data_entry'

    return 'single_action'
  }
}
