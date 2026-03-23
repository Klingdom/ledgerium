import type { CanonicalEvent, LiveStep } from '../shared/types.js'
import { CLICK_NAV_WINDOW_MS, RAPID_CLICK_DEDUP_MS } from '../shared/constants.js'

// Streaming live step builder — mirrors batch segmenter logic for the sidebar feed

export class LiveStepBuilder {
  private sessionId: string
  private accumulator: CanonicalEvent[] = []
  private finalizedSteps: LiveStep[] = []
  private stepCounter = 0
  private onUpdate: (step: LiveStep) => void

  constructor(sessionId: string, onUpdate: (step: LiveStep) => void) {
    this.sessionId = sessionId
    this.onUpdate = onUpdate
  }

  processEvent(event: CanonicalEvent): void {
    if (event.event_type.startsWith('system.') || event.event_type.startsWith('derived.')) return

    // Annotation — finalize current, emit annotation step
    if (event.event_type === 'session.annotation_added') {
      this.finalizeAccumulator('user_annotation')
      const step = this.buildStep([event], 'annotation', 'user_annotation', true)
      this.finalizedSteps.push(step)
      this.onUpdate(step)
      return
    }

    this.accumulator.push(event)

    // Submit → finalize immediately
    if (event.event_type === 'interaction.submit') {
      this.finalizeAccumulator('form_submitted')
      return
    }

    // Navigation domain change → finalize
    if (event.event_type.startsWith('navigation.') && this.accumulator.length > 1) {
      const prev = this.accumulator[this.accumulator.length - 2]
      if (prev?.page_context?.domain && event.page_context?.domain &&
          prev.page_context.domain !== event.page_context.domain) {
        this.accumulator.pop()
        this.finalizeAccumulator('navigation_changed')
        this.accumulator = [event]
      }
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
      boundaryReason,
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

    const type = first?.event_type ?? ''
    if (type === 'interaction.click') return `Click ${target?.label ?? target?.role ?? 'element'}`
    if (type === 'interaction.input_change') return `Update ${target?.label ?? 'field'}`
    if (type === 'interaction.submit') return `Submit ${page?.pageTitle ?? 'form'}`
    if (type.startsWith('navigation.')) return `Navigate to ${page?.pageTitle ?? page?.routeTemplate ?? 'page'}`
    return 'Perform action'
  }

  private calcConfidence(events: CanonicalEvent[], grouping: string): number {
    if (grouping === 'annotation') return 1.0
    if (grouping === 'fill_and_submit') return 0.90
    if (grouping === 'click_then_navigate') return 0.85
    if (grouping === 'error_handling') return 0.80
    if (grouping === 'repeated_click_dedup') return 0.70
    return events.some(e => e.target_summary?.label) ? 0.75 : 0.55
  }

  private classifyGrouping(events: CanonicalEvent[]): string {
    if (events.length === 1 && events[0]?.event_type === 'session.annotation_added') return 'annotation'
    const hasSubmit = events.some(e => e.event_type === 'interaction.submit')
    const hasInput = events.some(e => e.event_type === 'interaction.input_change')
    if (hasSubmit) return hasInput ? 'fill_and_submit' : 'fill_and_submit'

    const clickIdx = events.findIndex(e => e.event_type === 'interaction.click')
    if (clickIdx >= 0) {
      const navIdx = events.findIndex((e, i) => i > clickIdx && e.event_type.startsWith('navigation.'))
      if (navIdx >= 0 && events[navIdx]!.t_ms - events[clickIdx]!.t_ms <= CLICK_NAV_WINDOW_MS) {
        return 'click_then_navigate'
      }
    }

    const clicks = events.filter(e => e.event_type === 'interaction.click')
    if (clicks.length > 1 && clicks[clicks.length - 1]!.t_ms - clicks[0]!.t_ms <= RAPID_CLICK_DEDUP_MS) {
      return 'repeated_click_dedup'
    }

    return 'single_action'
  }
}
