import type { SessionBundle, CanonicalEvent, DerivedStep, BundleManifest } from '../shared/types.js'
import type { SessionStore } from './session-store.js'
import { sha256Hex, generateId } from '../shared/utils.js'
import {
  SCHEMA_VERSION, RECORDER_VERSION, SEGMENTATION_RULE_VERSION, RENDERER_VERSION,
  IDLE_GAP_MS, CLICK_NAV_WINDOW_MS, RAPID_CLICK_DEDUP_MS,
} from '../shared/constants.js'

// ─── Inline segmentation (deterministic, mirrors packages/segmentation-engine) ─

type GroupingReason = 'click_then_navigate' | 'fill_and_submit' | 'repeated_click_dedup' | 'single_action' | 'error_handling' | 'annotation'
type BoundaryReason = 'form_submitted' | 'navigation_changed' | 'idle_gap' | 'user_annotation' | 'session_stop'

function deriveTitle(events: CanonicalEvent[], reason: GroupingReason): string {
  const first = events[0]
  const page = first?.page_context
  const target = first?.target_summary

  switch (reason) {
    case 'click_then_navigate': {
      const navEvent = events.find(e => e.event_type.startsWith('navigation.'))
      const label = navEvent?.page_context?.pageTitle ?? navEvent?.page_context?.routeTemplate ?? 'page'
      return `Navigate to ${label}`
    }
    case 'fill_and_submit':
      return `Fill and submit ${page?.pageTitle ?? 'form'}`
    case 'annotation':
      return first?.annotation_text ?? 'Annotation'
    case 'error_handling':
      return 'Handle error'
    case 'repeated_click_dedup':
      return `Click ${target?.label ?? target?.role ?? 'element'}`
    case 'single_action':
    default: {
      const type = first?.event_type ?? ''
      if (type === 'interaction.click') return `Click ${target?.label ?? target?.role ?? 'element'}`
      if (type === 'interaction.input_change') return `Update ${target?.label ?? 'field'}`
      if (type === 'interaction.submit') return `Submit ${page?.pageTitle ?? 'form'}`
      if (type.startsWith('navigation.')) return `Navigate to ${page?.pageTitle ?? page?.routeTemplate ?? 'page'}`
      return 'Perform action'
    }
  }
}

function calcConfidence(events: CanonicalEvent[], reason: GroupingReason): number {
  if (reason === 'annotation') return 1.0
  if (reason === 'fill_and_submit') return 0.90
  if (reason === 'click_then_navigate') return 0.85
  if (reason === 'error_handling') return 0.80
  if (reason === 'repeated_click_dedup') return 0.70
  const hasLabel = events.some(e => e.target_summary?.label)
  return hasLabel ? 0.75 : 0.55
}

function classifyGrouping(events: CanonicalEvent[]): GroupingReason {
  if (events.length === 1 && events[0]?.event_type === 'session.annotation_added') return 'annotation'

  const hasSubmit = events.some(e => e.event_type === 'interaction.submit')
  const hasInput = events.some(e => e.event_type === 'interaction.input_change')
  if (hasSubmit && hasInput) return 'fill_and_submit'
  if (hasSubmit) return 'fill_and_submit'

  const clickIdx = events.findIndex(e => e.event_type === 'interaction.click')
  if (clickIdx >= 0) {
    const navIdx = events.findIndex((e, i) => i > clickIdx && e.event_type.startsWith('navigation.'))
    if (navIdx >= 0) {
      const clickT = events[clickIdx]!.t_ms
      const navT = events[navIdx]!.t_ms
      if (navT - clickT <= CLICK_NAV_WINDOW_MS) return 'click_then_navigate'
    }
  }

  const clicks = events.filter(e => e.event_type === 'interaction.click')
  if (clicks.length > 1) {
    const firstT = clicks[0]!.t_ms
    const lastT = clicks[clicks.length - 1]!.t_ms
    if (lastT - firstT <= RAPID_CLICK_DEDUP_MS) return 'repeated_click_dedup'
  }

  return 'single_action'
}

export function buildDerivedSteps(events: CanonicalEvent[], sessionId: string): DerivedStep[] {
  const workEvents = events.filter(
    e => !e.event_type.startsWith('system.') && !e.event_type.startsWith('derived.')
  )

  const steps: DerivedStep[] = []
  let accumulator: CanonicalEvent[] = []
  let ordinal = 0
  let lastDomain = ''

  function finalizeStep(boundaryReason: BoundaryReason): void {
    if (accumulator.length === 0) return
    ordinal++
    const reason = classifyGrouping(accumulator)
    const first = accumulator[0]!
    const last = accumulator[accumulator.length - 1]!
    const domain = first.page_context?.domain ?? ''
    steps.push({
      step_id: `${sessionId}-step-${ordinal}`,
      session_id: sessionId,
      ordinal,
      title: deriveTitle(accumulator, reason),
      status: 'finalized',
      boundary_reason: boundaryReason,
      grouping_reason: reason,
      confidence: calcConfidence(accumulator, reason),
      source_event_ids: accumulator.map(e => e.event_id),
      start_t_ms: first.t_ms,
      end_t_ms: last.t_ms,
      duration_ms: last.t_ms - first.t_ms,
      ...(first.page_context ? {
        page_context: {
          domain,
          applicationLabel: first.page_context.applicationLabel,
          routeTemplate: first.page_context.routeTemplate,
        },
      } : {}),
    })
    accumulator = []
  }

  for (let i = 0; i < workEvents.length; i++) {
    const event = workEvents[i]!
    const prev = workEvents[i - 1]

    // Idle gap boundary
    if (prev && event.t_ms - prev.t_ms > IDLE_GAP_MS) {
      finalizeStep('idle_gap')
    }

    // Navigation domain change boundary
    const newDomain = event.page_context?.domain ?? ''
    if (
      event.event_type.startsWith('navigation.') &&
      newDomain &&
      lastDomain &&
      newDomain !== lastDomain &&
      accumulator.length > 0
    ) {
      finalizeStep('navigation_changed')
    }
    if (newDomain) lastDomain = newDomain

    // Annotation boundary — finalize previous, then create annotation step
    if (event.event_type === 'session.annotation_added') {
      finalizeStep('user_annotation')
      accumulator = [event]
      finalizeStep('user_annotation')
      continue
    }

    // Session stop — finalize remaining
    if (event.event_type === 'session.stopped') {
      finalizeStep('session_stop')
      continue
    }

    accumulator.push(event)

    // Submit boundary — finalize after adding the submit event
    if (event.event_type === 'interaction.submit') {
      finalizeStep('form_submitted')
    }
  }

  // Finalize any remaining
  if (accumulator.length > 0) finalizeStep('session_stop')

  return steps
}

// ─── Bundle builder ───────────────────────────────────────────────────────────

export async function buildBundle(store: SessionStore): Promise<SessionBundle> {
  const meta = store.getMeta()
  if (!meta) throw new Error('No active session to build bundle from')

  const canonicalEvents = store.getCanonicalEvents()
  const policyLog = store.getPolicyLog()
  const derivedSteps = buildDerivedSteps(canonicalEvents, meta.sessionId)

  const sessionStr = JSON.stringify(meta)
  const eventsStr = JSON.stringify(canonicalEvents)
  const stepsStr = JSON.stringify(derivedSteps)
  const policyStr = JSON.stringify(policyLog)

  const [sessionHash, eventsHash, stepsHash, policyHash] = await Promise.all([
    sha256Hex(sessionStr),
    sha256Hex(eventsStr),
    sha256Hex(stepsStr),
    sha256Hex(policyStr),
  ])

  const manifest: BundleManifest = {
    sessionId: meta.sessionId,
    exportedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    recorderVersion: RECORDER_VERSION,
    segmentationRuleVersion: SEGMENTATION_RULE_VERSION,
    rendererVersion: RENDERER_VERSION,
    fileHashes: {
      'session.json': sessionHash,
      'normalized_events.json': eventsHash,
      'derived_steps.json': stepsHash,
      'policy_log.json': policyHash,
    },
  }

  return {
    sessionJson: meta,
    normalizedEvents: canonicalEvents,
    derivedSteps,
    policyLog,
    manifest,
  }
}
