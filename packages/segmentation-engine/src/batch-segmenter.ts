/**
 * Stateless batch segmenter.
 *
 * Given the full ordered list of canonical events for a session, produces a
 * deterministic set of DerivedSteps. Same input always yields the same output
 * (no randomness — step IDs are index-based).
 */

import type {
  SegmentableEvent,
  DerivedStep,
  BoundaryReason,
  GroupingReason,
  SegmentationResult,
} from './types.js';

import {
  SEGMENTATION_RULE_VERSION,
  IDLE_GAP_MS,
  CLICK_NAV_WINDOW_MS,
  RAPID_CLICK_DEDUP_MS,
  deriveStepTitle,
  calculateConfidence,
} from './rules.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns true when the event should be excluded from step construction. */
function isSystemOrDerived(event: SegmentableEvent): boolean {
  return (
    event.event_type.startsWith('system.') ||
    event.event_type.startsWith('derived.')
  );
}

/**
 * Extracts the page_context summary for a DerivedStep from the first event
 * in the accumulator that has page_context.
 */
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

/**
 * Determines the GroupingReason for a completed accumulator of events.
 *
 * Evaluation order matters — more specific patterns are checked first.
 */
function classifyGroupingReason(
  events: SegmentableEvent[],
): GroupingReason {
  if (events.length === 0) return 'single_action';

  // Annotation step (single event of type session.annotation_added)
  if (
    events.length === 1 &&
    events[0]!.event_type === 'session.annotation_added'
  ) {
    return 'annotation';
  }

  // fill_and_submit: ends with submit AND has at least one input_change
  const hasSubmit = events.some(
    (e) => e.event_type === 'interaction.submit',
  );
  const hasInput = events.some(
    (e) => e.event_type === 'interaction.input_change',
  );
  if (hasSubmit && hasInput) return 'fill_and_submit';

  // click_then_navigate: a click followed within CLICK_NAV_WINDOW_MS by navigation
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

  // repeated_click_dedup: multiple clicks on same selector within RAPID_CLICK_DEDUP_MS
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

// ---------------------------------------------------------------------------
// Step builder
// ---------------------------------------------------------------------------

function buildStep(
  events: SegmentableEvent[],
  sessionId: string,
  ordinal: number,
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
    step_id: `${sessionId}-step-${ordinal}`,
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

// ---------------------------------------------------------------------------
// segmentEvents
// ---------------------------------------------------------------------------

/**
 * Stateless batch segmentation.
 *
 * Processes an ordered array of SegmentableEvents for a single session and
 * returns a SegmentationResult containing DerivedSteps, the rule version,
 * and any warnings.
 *
 * This function is **deterministic** — step IDs are derived from the session
 * ID and ordinal index; no random values are used.
 */
export function segmentEvents(
  events: SegmentableEvent[],
  sessionId: string,
): SegmentationResult {
  const warnings: string[] = [];
  const steps: DerivedStep[] = [];

  // Filter out system.* and derived.* events before processing.
  const workable = events.filter((e) => !isSystemOrDerived(e));

  let accumulator: SegmentableEvent[] = [];
  let stepCounter = 0;
  let lastNavigationDomain: string | undefined;

  const finalizeAccumulator = (boundaryReason: BoundaryReason): void => {
    if (accumulator.length === 0) return;
    stepCounter += 1;
    const step = buildStep(accumulator, sessionId, stepCounter, boundaryReason);
    if (step !== null) steps.push(step);
    accumulator = [];
  };

  for (let i = 0; i < workable.length; i++) {
    const current = workable[i]!;
    const prev = workable[i - 1];

    // --- Idle gap boundary -----------------------------------------------
    if (
      prev !== undefined &&
      current.t_ms - prev.t_ms > IDLE_GAP_MS
    ) {
      finalizeAccumulator('idle_gap');
      lastNavigationDomain = undefined;
    }

    // --- Annotation: finalize previous, then create annotation step -------
    if (current.event_type === 'session.annotation_added') {
      if (accumulator.length > 0) {
        finalizeAccumulator('user_annotation');
      }
      // Create dedicated annotation step.
      stepCounter += 1;
      const annotationStep = buildStep(
        [current],
        sessionId,
        stepCounter,
        'user_annotation',
      );
      if (annotationStep !== null) steps.push(annotationStep);
      lastNavigationDomain = undefined;
      continue;
    }

    // --- Session stop: finalize remaining --------------------------------
    if (current.event_type === 'session.stopped') {
      accumulator.push(current);
      finalizeAccumulator('session_stop');
      lastNavigationDomain = undefined;
      continue;
    }

    // --- Navigation domain change ----------------------------------------
    if (current.event_type.startsWith('navigation.')) {
      const domain = current.page_context?.domain;
      if (
        domain !== undefined &&
        lastNavigationDomain !== undefined &&
        domain !== lastNavigationDomain &&
        accumulator.length > 0
      ) {
        finalizeAccumulator('navigation_changed');
      }
      if (domain !== undefined) {
        lastNavigationDomain = domain;
      }
    }

    // Accumulate the event.
    accumulator.push(current);

    // --- Submit boundary (finalize AFTER adding the submit event) --------
    if (current.event_type === 'interaction.submit') {
      finalizeAccumulator('form_submitted');
      lastNavigationDomain = undefined;
    }
  }

  // Finalize any remaining accumulated events at the end.
  if (accumulator.length > 0) {
    finalizeAccumulator('session_stop');
  }

  if (steps.length === 0 && workable.length > 0) {
    warnings.push(
      `Session ${sessionId}: ${workable.length} events produced no steps — check event types.`,
    );
  }

  return {
    steps,
    rule_version: SEGMENTATION_RULE_VERSION,
    event_count: events.length,
    warnings,
  };
}
