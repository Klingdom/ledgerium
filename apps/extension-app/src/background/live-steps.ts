/**
 * LiveStepBuilder — thin adapter over StreamingSegmenter.
 *
 * Converts the segmentation engine's DerivedStep output into the LiveStep
 * shape used by the extension sidebar. All boundary detection, grouping
 * classification, and title derivation are delegated to StreamingSegmenter
 * (the canonical implementation).
 *
 * Convergence contract (Invariant I1): finalized LiveStep objects emitted by
 * this adapter are structurally equivalent to finalized DerivedSteps produced
 * by buildDerivedSteps() for the same event sequence.
 */

import type { CanonicalEvent, LiveStep } from '../shared/types.js'

import { StreamingSegmenter } from '@ledgerium/segmentation-engine'
import type { SegmentableEvent, DerivedStep } from '@ledgerium/segmentation-engine'

// ---------------------------------------------------------------------------
// toSegmentableEvent
// ---------------------------------------------------------------------------

/**
 * Projects a single CanonicalEvent to the SegmentableEvent subset.
 * CanonicalEvent is a strict superset — this is a lossless projection for
 * all fields the segmenter needs.
 */
function toSegmentableEvent(e: CanonicalEvent): SegmentableEvent {
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
}

// ---------------------------------------------------------------------------
// toLiveStep
// ---------------------------------------------------------------------------

/**
 * Maps a DerivedStep from the segmentation engine to the LiveStep shape
 * used by the extension sidebar. This is the adapter boundary.
 *
 * `pageTitle` is resolved by LiveStepBuilder at the adapter boundary because
 * the segmentation-engine's DerivedStep.page_context does NOT carry pageTitle
 * (only domain / applicationLabel / routeTemplate). Keeping that contract
 * unchanged preserves the I1 convergence invariant against frozen golden
 * fixtures in @ledgerium/segmentation-engine.
 *
 * Exported for test use only (convergence-invariant-i1.test.ts). This is not
 * a production API surface — do not import outside of tests.
 */
export function toLiveStep(step: DerivedStep, pageTitle?: string): LiveStep {
  return {
    stepId: step.step_id,
    title: step.title,
    status: step.status,
    ...(step.boundary_reason !== undefined ? { boundaryReason: step.boundary_reason } : {}),
    grouping: step.grouping_reason,
    ...(step.page_context?.applicationLabel !== undefined
      ? { pageLabel: step.page_context.applicationLabel }
      : {}),
    ...(pageTitle !== undefined && pageTitle !== ''
      ? { pageTitle }
      : {}),
    confidence: step.confidence,
    eventCount: step.source_event_ids.length,
    startedAt: step.start_t_ms,
    ...(step.status === 'finalized' && step.end_t_ms !== undefined
      ? { finalizedAt: step.end_t_ms }
      : {}),
  }
}

// ---------------------------------------------------------------------------
// LiveStepBuilder
// ---------------------------------------------------------------------------

/**
 * Streaming live step builder — produces real-time LiveStep updates for the
 * extension sidebar.
 *
 * Thin adapter over StreamingSegmenter: all segmentation logic lives in the
 * canonical package; this class handles the CanonicalEvent → SegmentableEvent
 * projection and DerivedStep → LiveStep mapping.
 */
export class LiveStepBuilder {
  private readonly segmenter: StreamingSegmenter
  private finalizedLiveSteps: LiveStep[] = []
  private finalizedDerivedSteps: DerivedStep[] = []
  /**
   * CanonicalEvents indexed by event_id. Used at the adapter boundary to
   * resolve LiveStep.pageTitle from the FIRST source event of each step,
   * since DerivedStep.page_context does not carry pageTitle through the
   * segmentation-engine contract.
   *
   * Cleared on reset(). For very long sessions this map grows linearly with
   * event count, which is acceptable — typical recording sessions produce
   * O(hundreds) of events, well within memory budget.
   */
  private eventById = new Map<string, CanonicalEvent>()

  constructor(sessionId: string, onUpdate: (step: LiveStep) => void) {
    this.segmenter = new StreamingSegmenter(sessionId, (derivedStep) => {
      const pageTitle = this.resolvePageTitleForStep(derivedStep)
      const liveStep = toLiveStep(derivedStep, pageTitle)
      if (derivedStep.status === 'finalized') {
        this.finalizedLiveSteps.push(liveStep)
        this.finalizedDerivedSteps.push(derivedStep)
      }
      onUpdate(liveStep)
    })
  }

  private resolvePageTitleForStep(step: DerivedStep): string | undefined {
    const firstSourceId = step.source_event_ids[0]
    if (firstSourceId === undefined) return undefined
    const sourceEvent = this.eventById.get(firstSourceId)
    return sourceEvent?.page_context?.pageTitle
  }

  processEvent(event: CanonicalEvent): void {
    this.eventById.set(event.event_id, event)
    this.segmenter.processEvent(toSegmentableEvent(event))
  }

  finalize(): LiveStep[] {
    this.segmenter.finalize()
    return [...this.finalizedLiveSteps]
  }

  getProvisionalStep(): LiveStep | null {
    const step = this.segmenter.getProvisionalStep()
    if (step === null) return null
    return toLiveStep(step, this.resolvePageTitleForStep(step))
  }

  getFinalizedSteps(): LiveStep[] {
    return [...this.finalizedLiveSteps]
  }

  /**
   * Returns the raw DerivedStep array for all finalized steps, in the same
   * order as getFinalizedSteps(). Exposes the DerivedStep layer below the
   * LiveStep projection so that I1b byte-identity assertions can compare
   * directly against segmentEvents().steps without the lossy toLiveStep
   * projection.
   *
   * Returns a defensive copy — mutations to the returned array do not affect
   * internal state.
   *
   * I1b invariant (iter 053): JSON.stringify(getDerivedSteps()) MUST equal
   * JSON.stringify(buildDerivedSteps(events, sessionId)) for the same input.
   */
  getDerivedSteps(): DerivedStep[] {
    return [...this.finalizedDerivedSteps]
  }

  reset(): void {
    this.segmenter.reset()
    this.finalizedLiveSteps = []
    this.finalizedDerivedSteps = []
    this.eventById.clear()
  }
}
