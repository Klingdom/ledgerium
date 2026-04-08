import type { SessionBundle, CanonicalEvent, DerivedStep, BundleManifest } from '../shared/types.js'
import type { SessionStore } from './session-store.js'
import { sha256Hex, generateId } from '../shared/utils.js'
import {
  SCHEMA_VERSION, RECORDER_VERSION, SEGMENTATION_RULE_VERSION, RENDERER_VERSION,
  IDLE_GAP_MS, CLICK_NAV_WINDOW_MS, RAPID_CLICK_DEDUP_MS,
} from '../shared/constants.js'

// ─── Inline segmentation (deterministic, mirrors packages/segmentation-engine) ─

const TARGET_CHANGE_GAP_MS = 2_000
const ACTION_BUTTON_PATTERNS = [
  /\bsend\b/i, /\bsubmit\b/i, /\bsave\b/i, /\bdelete\b/i,
  /\bconfirm\b/i, /\bapprove\b/i, /\breject\b/i, /\bcancel\b/i,
  /\bclose\b/i, /\bdone\b/i, /\bfinish\b/i, /\bpublish\b/i,
  /\barchive\b/i, /\bremove\b/i, /\bcreate\b/i, /\bupdate\b/i,
]

type GroupingReason = 'click_then_navigate' | 'fill_and_submit' | 'repeated_click_dedup' | 'single_action' | 'data_entry' | 'send_action' | 'file_action' | 'error_handling' | 'annotation'
type BoundaryReason = 'form_submitted' | 'navigation_changed' | 'route_changed' | 'target_changed' | 'action_completed' | 'idle_gap' | 'user_annotation' | 'session_stop'

function isActionButtonClick(event: CanonicalEvent): boolean {
  if (event.event_type !== 'interaction.click') return false
  const label = event.target_summary?.label
  if (!label) return false
  return ACTION_BUTTON_PATTERNS.some(p => p.test(label))
}

/**
 * Returns a composite key for the interaction target.  Uses selector as the
 * primary key but appends the label when present — this is critical for
 * spreadsheet-like UIs where every cell shares the same selector (e.g.
 * #waffle-rich-text-editor) but the label changes per cell (A16, B16, C16).
 *
 * When an event has an empty label, we look at the `lastKnownLabel` parameter
 * (the label from the most recent event on the same selector that DID have a
 * label).  This handles the common pattern where a keyboard_shortcut carries
 * the cell reference but the subsequent input_change has an empty label.
 */
function interactionTargetKey(event: CanonicalEvent, lastKnownLabel?: string): string | undefined {
  if (!event.event_type.startsWith('interaction.')) return undefined
  const selector = event.target_summary?.selector
  const label = event.target_summary?.label?.trim() || lastKnownLabel || ''
  if (selector && label) return `${selector}::${label}`
  return selector ?? undefined
}

function isFileInteraction(event: CanonicalEvent): boolean {
  return event.target_summary?.elementType === 'file'
}

// ── Title derivation helpers ─────────────────────────────────────────────────

/** Extract unique, meaningful field labels from a set of events */
function extractFieldLabels(events: CanonicalEvent[]): string[] {
  const labels = events
    .filter(e => e.event_type === 'interaction.input_change' && e.target_summary?.label?.trim())
    .map(e => e.target_summary!.label!.trim())
    .filter((l, i, arr) => arr.indexOf(l) === i)  // dedupe
    .filter(l => !CELL_REF_RE.test(l))             // exclude spreadsheet cell refs
    .slice(0, 3)
  return labels
}

/** Detect spreadsheet cell references (A1, B5, AA12, etc.) */
const CELL_REF_RE = /^[A-Z]{1,3}\d{1,5}$/

/** Get a readable app context suffix like " in email" or " in spreadsheet" */
function appContextSuffix(page: { applicationLabel?: string; pageTitle?: string; routeTemplate?: string } | undefined): string {
  if (!page) return ''
  const app = page.applicationLabel?.toLowerCase() ?? ''
  const title = page.pageTitle?.toLowerCase() ?? ''
  const route = page.routeTemplate?.toLowerCase() ?? ''
  if (app === 'mail' || title.includes('inbox') || title.includes('gmail') || route.includes('mail')) return ' in email'
  if (title.includes('sheets') || title.includes('spreadsheet') || route.includes('spreadsheet')) return ' in spreadsheet'
  if (title.includes('docs') || title.includes('document')) return ' in document'
  if (page.applicationLabel && page.applicationLabel !== 'Mail' && page.applicationLabel !== 'Docs') return ` in ${page.applicationLabel}`
  return ''
}

/** Get a meaningful click label, avoiding raw HTML element types */
function meaningfulClickLabel(events: CanonicalEvent[]): string {
  for (const e of events) {
    if (e.event_type === 'interaction.click' && e.target_summary) {
      const label = e.target_summary.label?.trim()
      if (label) return label
    }
  }
  // No label found — derive from context
  const first = events[0]
  const page = first?.page_context
  const ctx = appContextSuffix(page)
  return ctx ? `action${ctx}` : 'action'
}

function deriveTitle(events: CanonicalEvent[], reason: GroupingReason): string {
  const first = events[0]
  const page = first?.page_context
  const ctx = appContextSuffix(page)

  switch (reason) {
    case 'click_then_navigate': {
      const navEvent = events.find(e => e.event_type.startsWith('navigation.'))
      const dest = navEvent?.page_context?.pageTitle ?? navEvent?.page_context?.routeTemplate ?? 'page'
      return `Navigate to ${dest}`
    }
    case 'fill_and_submit': {
      const fields = extractFieldLabels(events)
      if (fields.length > 0) return `Complete ${fields.join(', ')} and submit${ctx}`
      return `Complete and submit form${ctx}`
    }
    case 'annotation':
      return first?.annotation_text ?? 'Annotation'
    case 'error_handling':
      return `Handle error${ctx}`
    case 'data_entry': {
      const fields = extractFieldLabels(events)
      if (fields.length > 0) return `Enter ${fields.join(', ')}${ctx}`
      // Spreadsheet cell detection
      const cellLabels = events
        .filter(e => e.target_summary?.label && CELL_REF_RE.test(e.target_summary.label.trim()))
        .map(e => e.target_summary!.label!.trim())
        .filter((l, i, arr) => arr.indexOf(l) === i)
        .slice(0, 3)
      if (cellLabels.length > 0) return `Enter data in cells ${cellLabels.join(', ')}${ctx || ' in spreadsheet'}`
      return `Enter data${ctx}`
    }
    case 'send_action': {
      const actionEvent = events.find(e => isActionButtonClick(e))
      const actionLabel = actionEvent?.target_summary?.label?.trim()
      if (actionLabel) return `${actionLabel}${ctx}`
      return `Send${ctx}`
    }
    case 'file_action':
      return `Attach file${ctx}`
    case 'repeated_click_dedup': {
      const label = meaningfulClickLabel(events)
      return `Click ${label}`
    }
    case 'single_action':
    default: {
      const type = first?.event_type ?? ''
      if (type === 'interaction.click') {
        const label = meaningfulClickLabel(events)
        return `Click ${label}`
      }
      if (type === 'interaction.input_change') {
        const fields = extractFieldLabels(events)
        if (fields.length > 0) return `Enter ${fields.join(', ')}${ctx}`
        return `Enter data${ctx}`
      }
      if (type === 'interaction.submit') return `Submit form${ctx}`
      if (type.startsWith('navigation.')) return `Navigate to ${page?.pageTitle ?? page?.routeTemplate ?? 'page'}`
      return `Perform action${ctx}`
    }
  }
}

function calcConfidence(events: CanonicalEvent[], reason: GroupingReason): number {
  if (reason === 'annotation') return 1.0
  if (reason === 'fill_and_submit') return 0.90
  if (reason === 'send_action') return 0.90
  if (reason === 'click_then_navigate') return 0.85
  if (reason === 'file_action') return 0.85
  if (reason === 'error_handling') return 0.80
  if (reason === 'data_entry') return 0.80
  if (reason === 'repeated_click_dedup') return 0.70
  const hasLabel = events.some(e => e.target_summary?.label)
  return hasLabel ? 0.75 : 0.55
}

function classifyGrouping(events: CanonicalEvent[]): GroupingReason {
  if (events.length === 1 && events[0]?.event_type === 'session.annotation_added') return 'annotation'

  const hasError = events.some(e => e.event_type === 'system.error_displayed')
  const hasHumanAction = events.some(e =>
    e.event_type.startsWith('interaction.') || e.event_type.startsWith('navigation.'))
  if (hasError && hasHumanAction) return 'error_handling'

  const hasSubmit = events.some(e => e.event_type === 'interaction.submit')
  const hasInput = events.some(e => e.event_type === 'interaction.input_change')
  if (hasSubmit && hasInput) return 'fill_and_submit'

  const clickIdx = events.findIndex(e => e.event_type === 'interaction.click')
  if (clickIdx >= 0) {
    const navIdx = events.findIndex((e, i) => i > clickIdx && e.event_type.startsWith('navigation.'))
    if (navIdx >= 0) {
      const clickT = events[clickIdx]!.t_ms
      const navT = events[navIdx]!.t_ms
      if (navT - clickT <= CLICK_NAV_WINDOW_MS) return 'click_then_navigate'
    }
  }

  // repeated_click_dedup before send_action (rapid double-click on Save = dedup, not two sends)
  const clicks = events.filter(e => e.event_type === 'interaction.click')
  if (clicks.length > 1) {
    const firstT = clicks[0]!.t_ms
    const lastT = clicks[clicks.length - 1]!.t_ms
    if (lastT - firstT <= RAPID_CLICK_DEDUP_MS) return 'repeated_click_dedup'
  }

  if (events.some(isActionButtonClick)) return 'send_action'
  if (events.some(isFileInteraction)) return 'file_action'

  const inputEvents = events.filter(e =>
    e.event_type === 'interaction.input_change' || e.event_type === 'interaction.keyboard_shortcut')
  if (inputEvents.length > 0 && inputEvents.length >= events.length * 0.5) return 'data_entry'

  return 'single_action'
}

export function buildDerivedSteps(events: CanonicalEvent[], sessionId: string): DerivedStep[] {
  // Filter out system noise but keep error_displayed so error_handling grouping
  // can detect error→recovery sequences.
  const workEvents = events.filter(
    e => (!e.event_type.startsWith('system.') || e.event_type === 'system.error_displayed') &&
         !e.event_type.startsWith('derived.')
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

  // Track the last known label per selector for spreadsheet-like UIs where
  // some events (input_change) have empty labels but preceding events
  // (keyboard_shortcut) carry the cell reference.
  let lastLabelBySelector = new Map<string, string>()
  let lastRoute = ''

  for (let i = 0; i < workEvents.length; i++) {
    const event = workEvents[i]!
    const prev = workEvents[i - 1]

    // Track labels per selector for target key resolution
    const sel = event.target_summary?.selector
    const lbl = event.target_summary?.label?.trim()
    if (sel && lbl) lastLabelBySelector.set(sel, lbl)

    // Idle gap boundary
    if (prev && event.t_ms - prev.t_ms > IDLE_GAP_MS) {
      finalizeStep('idle_gap')
      lastLabelBySelector = new Map()
    }

    // Domain change boundary
    const newDomain = event.page_context?.domain ?? ''
    if (
      newDomain &&
      lastDomain &&
      newDomain !== lastDomain &&
      accumulator.length > 0
    ) {
      finalizeStep('navigation_changed')
      lastLabelBySelector = new Map()
    }
    if (newDomain) lastDomain = newDomain

    // Annotation boundary
    if (event.event_type === 'session.annotation_added') {
      finalizeStep('user_annotation')
      accumulator = [event]
      finalizeStep('user_annotation')
      continue
    }

    // Session stop
    if (event.event_type === 'session.stopped') {
      finalizeStep('session_stop')
      continue
    }

    // Same-domain route change boundary — only trigger when the route
    // template actually changes (not just any SPA routing event, which
    // can fire during autocomplete selection in Gmail).
    if (event.event_type === 'navigation.route_change') {
      const newRoute = event.page_context?.routeTemplate ?? ''
      if (accumulator.length > 0 && newRoute !== lastRoute && lastRoute !== '') {
        finalizeStep('route_changed')
      }
      if (newRoute) lastRoute = newRoute
      continue
    }

    // Target context change boundary — uses label tracking for cells
    if (prev && accumulator.length > 0) {
      const gap = event.t_ms - prev.t_ms
      const prevSel = prev.target_summary?.selector
      const prevLabel = prevSel ? lastLabelBySelector.get(prevSel) : undefined
      const curSel = event.target_summary?.selector
      const curLabel = curSel ? lastLabelBySelector.get(curSel) : undefined
      const prevTarget = interactionTargetKey(prev, prevLabel)
      const currentTarget = interactionTargetKey(event, lbl || curLabel)
      if (gap >= TARGET_CHANGE_GAP_MS && prevTarget && currentTarget && prevTarget !== currentTarget) {
        finalizeStep('target_changed')
      }
    }

    accumulator.push(event)

    // Action button boundary — but defer if the next event is a rapid click
    // on the same target (rapid-click dedup takes priority over action completion)
    if (isActionButtonClick(event)) {
      const next = workEvents[i + 1]
      const isRapidRepeat = next &&
        next.event_type === 'interaction.click' &&
        next.target_summary?.selector === event.target_summary?.selector &&
        next.t_ms - event.t_ms < RAPID_CLICK_DEDUP_MS
      if (!isRapidRepeat) {
        finalizeStep('action_completed')
        lastDomain = ''
      }
    }

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

  // Sort events by t_ms — multi-tab recording can produce slightly out-of-order
  // timestamps when content scripts in different tabs emit events concurrently.
  const canonicalEvents = store.getCanonicalEvents().sort((a, b) => a.t_ms - b.t_ms)
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
