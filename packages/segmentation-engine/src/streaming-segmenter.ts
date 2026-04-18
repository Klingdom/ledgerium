/**
 * Stateful streaming segmenter.
 *
 * Designed for the live recording feed in the browser extension.
 * Events are fed one at a time; the segmenter emits provisional and
 * finalized DerivedSteps via a callback as boundaries are detected.
 *
 * All boundary rules and grouping classifications are aligned with the
 * batch segmenter (segmentEvents) via shared primitives from grouping.ts.
 * After iter-011 convergence, feeding the same event sequence through
 * StreamingSegmenter and segmentEvents produces identical finalized steps.
 */

import type {
  SegmentableEvent,
  DerivedStep,
  BoundaryReason,
} from './types.js';

import {
  IDLE_GAP_MS,
  RAPID_CLICK_DEDUP_MS,
  TARGET_CHANGE_GAP_MS,
  deriveStepTitle,
  calculateConfidence,
} from './rules.js';

import {
  extractPageContext,
  classifyGroupingReason,
  isActionButtonClick,
  interactionTargetKey,
} from './grouping.js';

// ---------------------------------------------------------------------------
// Step builders (internal)
// ---------------------------------------------------------------------------

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
    ...(boundaryReason !== undefined && { boundary_reason: boundaryReason }),
    grouping_reason: groupingReason,
    confidence,
    source_event_ids: events.map((e) => e.event_id),
    start_t_ms: startT,
    end_t_ms: endT,
    duration_ms: endT - startT,
    ...(pageCtx !== undefined && { page_context: pageCtx }),
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
 *
 * Boundary rules (aligned with batch segmenter after iter-011 convergence):
 *  - idle_gap: gap > IDLE_GAP_MS between consecutive events (D1)
 *  - route_changed: SPA navigation to a different route template (D2, guarded)
 *  - target_changed: different interaction target after TARGET_CHANGE_GAP_MS (D3)
 *  - action_completed: click on completion button (D4, one-event lookahead)
 *  - form_submitted: interaction.submit event
 *  - navigation_changed: event from different domain
 *  - user_annotation: session.annotation_added event
 *  - session_stop: session.stopped event or explicit finalize()
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

  /**
   * Last seen route template, for SPA route-change boundary detection.
   * Only fires a boundary when lastRouteTemplate !== '' AND the route changes.
   * (Mirrors the buildDerivedSteps guard — prevents the first route_change from
   * splitting an empty accumulator.)
   */
  private lastRouteTemplate: string;

  /**
   * Tracks the last known label for each selector.
   * Used for spreadsheet cell-aware target-change detection (D3).
   */
  private lastLabelBySelector: Map<string, string>;

  /**
   * The previous event processed (for target-change gap measurement).
   */
  private prevEvent: SegmentableEvent | undefined;

  /**
   * When true, the previous event was an action-button click that wants to
   * finalize on the NEXT event. If the next event is a rapid repeat click on
   * the same selector, defer (let dedup handle it). Otherwise, finalize BEFORE
   * processing the new event. (D4 — one-event lookahead approach for streaming.)
   */
  private pendingActionBoundary: boolean;

  /** Selector of the action button that set pendingActionBoundary. */
  private pendingActionSelector: string | undefined;

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
    this.lastRouteTemplate = '';
    this.lastLabelBySelector = new Map();
    this.prevEvent = undefined;
    this.pendingActionBoundary = false;
    this.pendingActionSelector = undefined;
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
    // ----- System/derived event filter (D5: keep system.error_displayed) ----
    if (
      event.event_type.startsWith('system.') &&
      event.event_type !== 'system.error_displayed'
    ) {
      return;
    }
    if (event.event_type.startsWith('derived.')) {
      return;
    }

    // ----- Pending action boundary (D4) -------------------------------------
    // If the previous event was an action-button click, resolve the deferred
    // boundary now. If this event is a rapid repeat on the same selector, let
    // dedup handle it naturally (clear pending). Otherwise, flush BEFORE
    // accumulating this event.
    if (this.pendingActionBoundary) {
      const isRapidRepeat =
        event.event_type === 'interaction.click' &&
        this.pendingActionSelector !== undefined &&
        event.target_summary?.selector === this.pendingActionSelector &&
        event.t_ms - this.lastEventT_ms < RAPID_CLICK_DEDUP_MS;

      if (isRapidRepeat) {
        // Dedup takes priority — clear pending without flushing.
        this.pendingActionBoundary = false;
        this.pendingActionSelector = undefined;
      } else {
        // Flush the previous accumulator (which includes the action button click).
        this.pendingActionBoundary = false;
        this.pendingActionSelector = undefined;
        this.flushProvisionalAsFinalized('action_completed');
        this.lastNavigationDomain = undefined;
      }
    }

    // ----- Track label-per-selector for target-change cell detection --------
    const evtSelector = event.target_summary?.selector;
    const evtLabel = event.target_summary?.label?.trim();
    if (evtSelector !== undefined && evtLabel !== undefined && evtLabel !== '') {
      this.lastLabelBySelector.set(evtSelector, evtLabel);
    }

    // ----- Idle gap boundary (D1, BEFORE accumulating) ----------------------
    if (
      this.provisionalEvents.length > 0 &&
      this.lastEventT_ms > 0 &&
      event.t_ms - this.lastEventT_ms > IDLE_GAP_MS
    ) {
      this.flushProvisionalAsFinalized('idle_gap');
      this.lastNavigationDomain = undefined;
      this.lastLabelBySelector = new Map();
    }

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
      this.lastEventT_ms = event.t_ms;
      this.prevEvent = undefined;
      return;
    }

    // ----- Domain change boundary -------------------------------------------
    // Fires on ANY event from a different domain (not just navigation events)
    // so that multi-tab workflows are correctly segmented when the user
    // switches between tabs on different domains.
    {
      const domain = event.page_context?.domain;
      if (
        domain !== undefined &&
        this.lastNavigationDomain !== undefined &&
        domain !== this.lastNavigationDomain &&
        this.provisionalEvents.length > 0
      ) {
        this.flushProvisionalAsFinalized('navigation_changed');
        this.lastLabelBySelector = new Map();
      }
      if (domain !== undefined) {
        this.lastNavigationDomain = domain;
      }
    }

    // ----- Same-domain route change boundary (D2, guarded) ------------------
    // Only fires when the route template actually changes AND a lastRoute
    // is already known (guard prevents first route_change from splitting an
    // empty accumulator when no prior route exists).
    if (event.event_type === 'navigation.route_change') {
      const newRoute = event.page_context?.routeTemplate ?? '';
      if (
        this.provisionalEvents.length > 0 &&
        newRoute !== this.lastRouteTemplate &&
        this.lastRouteTemplate !== ''
      ) {
        this.flushProvisionalAsFinalized('route_changed');
      }
      if (newRoute !== '') {
        this.lastRouteTemplate = newRoute;
      }
      // route_change is a boundary marker — do NOT add to accumulator.
      this.lastEventT_ms = event.t_ms;
      this.prevEvent = event;
      this.emitProvisional();
      return;
    }

    // ----- Target context change boundary (D3, with label tracking) ---------
    // When the user moves from one interaction target to a significantly
    // different one after a brief pause, finalize the previous step.
    if (this.prevEvent !== undefined && this.provisionalEvents.length > 0) {
      const gap = event.t_ms - this.prevEvent.t_ms;
      const prevSel = this.prevEvent.target_summary?.selector;
      const prevLabelKnown = prevSel !== undefined
        ? this.lastLabelBySelector.get(prevSel)
        : undefined;
      const curSel = event.target_summary?.selector;
      const curLabelKnown = curSel !== undefined
        ? this.lastLabelBySelector.get(curSel)
        : undefined;
      const prevTarget = interactionTargetKey(this.prevEvent, prevLabelKnown);
      const currentTarget = interactionTargetKey(event, evtLabel ?? curLabelKnown);
      if (
        gap >= TARGET_CHANGE_GAP_MS &&
        prevTarget !== undefined &&
        currentTarget !== undefined &&
        prevTarget !== currentTarget
      ) {
        this.flushProvisionalAsFinalized('target_changed');
      }
    }

    // Add event to provisional accumulator.
    this.provisionalEvents.push(event);
    this.lastEventT_ms = event.t_ms;
    this.prevEvent = event;

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

    // ----- Action button boundary (D4) ----------------------------------------
    // Clicks on Send/Save/Submit/etc. are completion signals. Defer by one event
    // so we can check if the next event is a rapid repeat on the same selector
    // (in which case dedup takes priority over action_completed).
    if (isActionButtonClick(event)) {
      this.pendingActionBoundary = true;
      this.pendingActionSelector = event.target_summary?.selector;
      // Emit provisional (not finalized yet — deferred).
      this.emitProvisional();
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
    // Resolve any pending action boundary first (the recording ended, so
    // no next event is coming).
    if (this.pendingActionBoundary && this.provisionalEvents.length > 0) {
      this.pendingActionBoundary = false;
      this.pendingActionSelector = undefined;
      this.flushProvisionalAsFinalized('action_completed');
      this.lastNavigationDomain = undefined;
      return this.getFinalizedSteps();
    }
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
    this.lastRouteTemplate = '';
    this.lastLabelBySelector = new Map();
    this.prevEvent = undefined;
    this.pendingActionBoundary = false;
    this.pendingActionSelector = undefined;
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
