/**
 * Stateful streaming segmenter.
 *
 * Designed for the live recording feed in the browser extension.
 * Events are fed one at a time; the segmenter emits provisional and
 * finalized DerivedSteps via a callback as boundaries are detected.
 */

import type {
  SegmentableEvent,
  DerivedStep,
  BoundaryReason,
  GroupingReason,
} from './types.js';

import {
  CLICK_NAV_WINDOW_MS,
  RAPID_CLICK_DEDUP_MS,
  deriveStepTitle,
  calculateConfidence,
} from './rules.js';

// ---------------------------------------------------------------------------
// Internal helpers (mirrored from batch-segmenter, kept private)
// ---------------------------------------------------------------------------

function extractPageContext(
  events: SegmentableEvent[],
): DerivedStep['page_context'] | undefined {
  for (const e of events) {
    if (e.page_context !== undefined) {
      return {
        domain: e.page_context.domain,
        applicationLabel: e.page_context.applicationLabel,
        routeTemplate: e.page_context.routeTemplate,
      };
    }
  }
  return undefined;
}

function classifyGroupingReason(
  events: SegmentableEvent[],
): GroupingReason {
  if (events.length === 0) return 'single_action';

  if (
    events.length === 1 &&
    events[0]!.event_type === 'session.annotation_added'
  ) {
    return 'annotation';
  }

  const hasSubmit = events.some(
    (e) => e.event_type === 'interaction.submit',
  );
  const hasInput = events.some(
    (e) => e.event_type === 'interaction.input_change',
  );
  if (hasSubmit && hasInput) return 'fill_and_submit';

  for (let i = 0; i < events.length - 1; i++) {
    const ev = events[i]!;
    if (ev.event_type !== 'interaction.click') continue;
    for (let j = i + 1; j < events.length; j++) {
      const next = events[j]!;
      if (next.t_ms - ev.t_ms > CLICK_NAV_WINDOW_MS) break;
      if (
        next.event_type === 'navigation.route_change' ||
        next.event_type === 'navigation.open_page'
      ) {
        return 'click_then_navigate';
      }
    }
  }

  const clickEvents = events.filter(
    (e) => e.event_type === 'interaction.click',
  );
  if (clickEvents.length >= 2) {
    for (let i = 0; i < clickEvents.length - 1; i++) {
      const a = clickEvents[i]!;
      const b = clickEvents[i + 1]!;
      if (
        a.target_summary?.selector !== undefined &&
        a.target_summary.selector === b.target_summary?.selector &&
        b.t_ms - a.t_ms < RAPID_CLICK_DEDUP_MS
      ) {
        return 'repeated_click_dedup';
      }
    }
  }

  return 'single_action';
}

function buildFinalizedStep(
  events: SegmentableEvent[],
  sessionId: string,
  ordinal: number,
  stepId: string,
  boundaryReason?: BoundaryReason,
): DerivedStep | null {
  if (events.length === 0) return null;

  const groupingReason = classifyGroupingReason(events);
  const pageCtx = extractPageContext(events);
  const title = deriveStepTitle(events, groupingReason, pageCtx);
  const confidence = calculateConfidence(events, groupingReason);

  const startT = events[0]!.t_ms;
  const endT = events[events.length - 1]!.t_ms;

  const step: DerivedStep = {
    step_id: stepId,
    session_id: sessionId,
    ordinal,
    title,
    status: 'finalized',
    grouping_reason: groupingReason,
    confidence,
    source_event_ids: events.map((e) => e.event_id),
    start_t_ms: startT,
    end_t_ms: endT,
    duration_ms: endT - startT,
    ...(pageCtx !== undefined && { page_context: pageCtx }),
    ...(boundaryReason !== undefined && { boundary_reason: boundaryReason }),
  };

  return step;
}

function buildProvisionalStep(
  events: SegmentableEvent[],
  sessionId: string,
  provisionalId: string,
  ordinal: number,
): DerivedStep | null {
  if (events.length === 0) return null;

  const groupingReason = classifyGroupingReason(events);
  const pageCtx = extractPageContext(events);
  const title = deriveStepTitle(events, groupingReason, pageCtx);
  const confidence = calculateConfidence(events, groupingReason);

  const startT = events[0]!.t_ms;
  const lastT = events[events.length - 1]!.t_ms;

  const step: DerivedStep = {
    step_id: provisionalId,
    session_id: sessionId,
    ordinal,
    title,
    status: 'provisional',
    grouping_reason: groupingReason,
    confidence,
    source_event_ids: events.map((e) => e.event_id),
    start_t_ms: startT,
    end_t_ms: lastT,
    duration_ms: lastT - startT,
    ...(pageCtx !== undefined && { page_context: pageCtx }),
  };

  return step;
}

// ---------------------------------------------------------------------------
// StreamingSegmenter
// ---------------------------------------------------------------------------

/**
 * Stateful, event-driven segmenter for the live recording feed.
 *
 * Feed events one at a time via `processEvent`. The segmenter:
 *  - Emits an updated **provisional** step for every event that does not
 *    trigger a boundary.
 *  - Emits a **finalized** step (and starts a fresh provisional) whenever a
 *    step boundary is detected.
 *
 * Call `finalize()` when the recording session ends to flush remaining events.
 */
export class StreamingSegmenter {
  private readonly sessionId: string;
  private provisionalEvents: SegmentableEvent[];
  private finalizedSteps: DerivedStep[];
  private stepCounter: number;
  private lastEventT_ms: number;
  private readonly onStepUpdate: (step: DerivedStep) => void;
  /** Domain seen in the most recent navigation event, for change detection. */
  private lastNavigationDomain: string | undefined;

  constructor(
    sessionId: string,
    onStepUpdate: (step: DerivedStep) => void,
  ) {
    this.sessionId = sessionId;
    this.onStepUpdate = onStepUpdate;
    this.provisionalEvents = [];
    this.finalizedSteps = [];
    this.stepCounter = 0;
    this.lastEventT_ms = 0;
    this.lastNavigationDomain = undefined;
  }

  // -------------------------------------------------------------------------
  // processEvent
  // -------------------------------------------------------------------------

  /**
   * Feed one event into the segmenter.
   *
   * May immediately emit a finalized step via `onStepUpdate` if a boundary is
   * detected. Always emits an updated provisional step unless the event
   * itself was emitted as a finalized annotation step.
   */
  processEvent(event: SegmentableEvent): void {
    // Skip system / derived events.
    if (
      event.event_type.startsWith('system.') ||
      event.event_type.startsWith('derived.')
    ) {
      return;
    }

    this.lastEventT_ms = event.t_ms;

    // ----- Annotation: finalize previous accumulator, emit annotation step --
    if (event.event_type === 'session.annotation_added') {
      if (this.provisionalEvents.length > 0) {
        this.flushProvisionalAsFinalized('user_annotation');
      }
      // Create and emit a dedicated annotation step.
      this.stepCounter += 1;
      const annotationStepId = `${this.sessionId}-step-${this.stepCounter}`;
      const annotationStep = buildFinalizedStep(
        [event],
        this.sessionId,
        this.stepCounter,
        annotationStepId,
        'user_annotation',
      );
      if (annotationStep !== null) {
        this.finalizedSteps.push(annotationStep);
        this.onStepUpdate(annotationStep);
      }
      this.lastNavigationDomain = undefined;
      return;
    }

    // ----- Navigation domain change boundary ---------------------------------
    if (event.event_type.startsWith('navigation.')) {
      const domain = event.page_context?.domain;
      if (
        domain !== undefined &&
        this.lastNavigationDomain !== undefined &&
        domain !== this.lastNavigationDomain &&
        this.provisionalEvents.length > 0
      ) {
        this.flushProvisionalAsFinalized('navigation_changed');
      }
      if (domain !== undefined) {
        this.lastNavigationDomain = domain;
      }
    }

    // Add event to provisional accumulator.
    this.provisionalEvents.push(event);

    // ----- Submit boundary (finalize AFTER adding the submit event) ----------
    if (event.event_type === 'interaction.submit') {
      this.flushProvisionalAsFinalized('form_submitted');
      this.lastNavigationDomain = undefined;
      return;
    }

    // ----- Session stop boundary ---------------------------------------------
    if (event.event_type === 'session.stopped') {
      this.flushProvisionalAsFinalized('session_stop');
      this.lastNavigationDomain = undefined;
      return;
    }

    // ----- No boundary: emit updated provisional step -----------------------
    this.emitProvisional();
  }

  // -------------------------------------------------------------------------
  // finalize
  // -------------------------------------------------------------------------

  /**
   * Flush any remaining provisional events as a finalized step.
   * Call when the recording session ends.
   *
   * @returns All finalized steps accumulated over the session lifetime.
   */
  finalize(): DerivedStep[] {
    if (this.provisionalEvents.length > 0) {
      this.flushProvisionalAsFinalized('session_stop');
    }
    return this.getFinalizedSteps();
  }

  // -------------------------------------------------------------------------
  // getProvisionalStep
  // -------------------------------------------------------------------------

  /**
   * Returns a snapshot of the current provisional step, or null if there are
   * no events in the current accumulator.
   */
  getProvisionalStep(): DerivedStep | null {
    if (this.provisionalEvents.length === 0) return null;
    const provisionalId = `${this.sessionId}-step-provisional`;
    // The provisional ordinal is the next step number (not yet assigned).
    const nextOrdinal = this.stepCounter + 1;
    return buildProvisionalStep(
      this.provisionalEvents,
      this.sessionId,
      provisionalId,
      nextOrdinal,
    );
  }

  // -------------------------------------------------------------------------
  // getFinalizedSteps
  // -------------------------------------------------------------------------

  /** Returns a shallow copy of all finalized steps accumulated so far. */
  getFinalizedSteps(): DerivedStep[] {
    return [...this.finalizedSteps];
  }

  // -------------------------------------------------------------------------
  // reset
  // -------------------------------------------------------------------------

  /** Clears all state. Discards the current session's events and steps. */
  reset(): void {
    this.provisionalEvents = [];
    this.finalizedSteps = [];
    this.stepCounter = 0;
    this.lastEventT_ms = 0;
    this.lastNavigationDomain = undefined;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private flushProvisionalAsFinalized(boundaryReason: BoundaryReason): void {
    if (this.provisionalEvents.length === 0) return;

    this.stepCounter += 1;
    const stepId = `${this.sessionId}-step-${this.stepCounter}`;
    const step = buildFinalizedStep(
      this.provisionalEvents,
      this.sessionId,
      this.stepCounter,
      stepId,
      boundaryReason,
    );
    this.provisionalEvents = [];

    if (step !== null) {
      this.finalizedSteps.push(step);
      this.onStepUpdate(step);
    }
  }

  private emitProvisional(): void {
    const provisional = this.getProvisionalStep();
    if (provisional !== null) {
      this.onStepUpdate(provisional);
    }
  }
}
