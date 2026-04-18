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
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns true when the event should be excluded from step construction. */
function isSystemOrDerived(event: SegmentableEvent): boolean {
  // Allow error_displayed through so error_handling grouping can detect
  // error→recovery sequences.
  if (event.event_type === 'system.error_displayed') return false;
  return (
    event.event_type.startsWith('system.') ||
    event.event_type.startsWith('derived.')
  );
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

    // --- Domain change boundary ------------------------------------------
    // Fires when ANY event arrives from a different domain, not just
    // navigation events.  This correctly segments multi-tab workflows
    // where the user switches between tabs on different domains — the
    // tab switch produces interaction events (clicks, inputs) rather
    // than navigation events, and those must still trigger a step
    // boundary.
    {
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

    // --- Same-domain route change boundary --------------------------------
    // SPA navigation within the same domain indicates the user moved to a
    // different section or view.  Finalize previous step, then skip the
    // route_change itself — it's a transition signal, not a user action.
    if (current.event_type === 'navigation.route_change') {
      if (accumulator.length > 0) {
        finalizeAccumulator('route_changed');
      }
      continue;
    }

    // --- Target context change boundary -----------------------------------
    // When the user moves from one interaction target to a significantly
    // different one (different selector) after a brief pause, finalize the
    // previous step.  This splits "Enter Subject" from "Write Email Body".
    //
    // Only triggers on interaction events (clicks, inputs) — navigation
    // and system events don't have meaningful targets.
    if (prev !== undefined && accumulator.length > 0) {
      const gap = current.t_ms - prev.t_ms;
      const prevTarget = interactionTargetKey(prev);
      const currentTarget = interactionTargetKey(current);
      if (
        gap >= TARGET_CHANGE_GAP_MS &&
        prevTarget !== undefined &&
        currentTarget !== undefined &&
        prevTarget !== currentTarget
      ) {
        finalizeAccumulator('target_changed');
      }
    }

    // Accumulate the event.
    accumulator.push(current);

    // --- Action button boundary (finalize AFTER adding the click) --------
    // Clicks on Send/Save/Submit/Delete/etc. are completion signals.
    // But defer if the next event is a rapid click on the same target
    // (rapid-click dedup takes priority over action completion).
    if (isActionButtonClick(current)) {
      const next = workable[i + 1];
      const isRapidRepeat =
        next !== undefined &&
        next.event_type === 'interaction.click' &&
        next.target_summary?.selector !== undefined &&
        next.target_summary.selector === current.target_summary?.selector &&
        next.t_ms - current.t_ms < RAPID_CLICK_DEDUP_MS;
      if (!isRapidRepeat) {
        finalizeAccumulator('action_completed');
        lastNavigationDomain = undefined;
      }
    }

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
