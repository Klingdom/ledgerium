import type { SessionBundle, CanonicalEvent, DerivedStep, BundleManifest } from '../shared/types.js'
import type { SessionStore } from './session-store.js'
import { sha256Hex } from '../shared/utils.js'
import { SCHEMA_VERSION, RECORDER_VERSION, SEGMENTATION_RULE_VERSION, RENDERER_VERSION } from '../shared/constants.js'

import { segmentEvents } from '@ledgerium/segmentation-engine'
import type { SegmentableEvent } from '@ledgerium/segmentation-engine'

// ---------------------------------------------------------------------------
// toSegmentableEvents
// ---------------------------------------------------------------------------

/**
 * Projects a CanonicalEvent array to the SegmentableEvent subset consumed
 * by the package segmentation engine.  CanonicalEvent is a strict superset —
 * this is a lossless projection for all fields the segmenter needs.
 */
function toSegmentableEvents(events: CanonicalEvent[]): SegmentableEvent[] {
  return events.map((e): SegmentableEvent => {
    const seg: SegmentableEvent = {
      event_id: e.event_id,
      session_id: e.session_id,
      t_ms: e.t_ms,
      event_type: e.event_type,
      normalization_meta: { sourceEventType: e.normalization_meta.sourceEventType },
    }
    if (e.page_context !== undefined) {
      seg.page_context = {
        domain: e.page_context.domain,
        routeTemplate: e.page_context.routeTemplate,
        applicationLabel: e.page_context.applicationLabel,
        pageTitle: e.page_context.pageTitle,
      }
    }
    if (e.target_summary !== undefined) {
      const ts: SegmentableEvent['target_summary'] = {}
      if (e.target_summary.selector !== undefined) ts.selector = e.target_summary.selector
      if (e.target_summary.label !== undefined) ts.label = e.target_summary.label
      if (e.target_summary.role !== undefined) ts.role = e.target_summary.role
      if (e.target_summary.elementType !== undefined) ts.elementType = e.target_summary.elementType
      seg.target_summary = ts
    }
    if (e.annotation_text !== undefined) {
      seg.annotation_text = e.annotation_text
    }
    return seg
  })
}

// ---------------------------------------------------------------------------
// buildDerivedSteps — thin wrapper over the canonical package segmenter
// ---------------------------------------------------------------------------

/**
 * Produces deterministic DerivedSteps for a session.
 *
 * Delegates entirely to `segmentEvents` from @ledgerium/segmentation-engine
 * (the canonical implementation). This wrapper projects CanonicalEvent to
 * SegmentableEvent before calling the package and casts the result back to
 * the extension's DerivedStep type (structurally identical).
 */
export function buildDerivedSteps(events: CanonicalEvent[], sessionId: string): DerivedStep[] {
  const segmentableEvents = toSegmentableEvents(events)
  const result = segmentEvents(segmentableEvents, sessionId)
  // The package DerivedStep and extension DerivedStep are structurally
  // identical — same fields, same types, same optional semantics.
  return result.steps as unknown as DerivedStep[]
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
