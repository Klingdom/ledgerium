/**
 * Shared grouping classification primitive for the Ledgerium segmentation engine.
 *
 * Both the batch segmenter and streaming segmenter consume `classifyGroupingReason`
 * from this module. Extracting it here ensures the classification logic has a
 * single source of truth in the package.
 *
 * Also exports helpers used by both segmenters:
 *   - `isActionButtonClick` — detects completion/action buttons
 *   - `isFileInteraction` — detects file input interactions
 *   - `interactionTargetKey` — composite key for target-change detection
 *   - `extractPageContext` — first page_context from an accumulator
 */

import type {
  SegmentableEvent,
  DerivedStep,
  GroupingReason,
} from './types.js';

import {
  CLICK_NAV_WINDOW_MS,
  RAPID_CLICK_DEDUP_MS,
  ACTION_BUTTON_PATTERNS,
} from './rules.js';

// ---------------------------------------------------------------------------
// extractPageContext
// ---------------------------------------------------------------------------

/**
 * Extracts the page_context summary for a DerivedStep from the first event
 * in the accumulator that has page_context.
 */
export function extractPageContext(
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

// ---------------------------------------------------------------------------
// isActionButtonClick
// ---------------------------------------------------------------------------

/**
 * Returns true when a click event targets a completion/action button
 * (Send, Submit, Save, etc.). Matching is case-insensitive against the
 * target label using word-boundary regexes from rules.ts.
 */
export function isActionButtonClick(event: SegmentableEvent): boolean {
  if (event.event_type !== 'interaction.click') return false;
  const label = event.target_summary?.label;
  if (label === undefined || label === '') return false;
  return ACTION_BUTTON_PATTERNS.some((pattern) => pattern.test(label));
}

// ---------------------------------------------------------------------------
// isFileInteraction
// ---------------------------------------------------------------------------

/**
 * Returns true when a file input is being interacted with (click or change
 * on type="file" elements).
 */
export function isFileInteraction(event: SegmentableEvent): boolean {
  return event.target_summary?.elementType === 'file';
}

// ---------------------------------------------------------------------------
// interactionTargetKey
// ---------------------------------------------------------------------------

/**
 * Returns a composite key for the interaction target. Uses selector as the
 * primary key but appends the label when present — critical for spreadsheet
 * UIs where every cell shares the same selector (e.g. #waffle-rich-text-editor)
 * but has a different label (A16, B16, C16).
 *
 * The optional `lastKnownLabel` allows callers (streaming segmenter) to pass
 * the last tracked label for the selector — handles the pattern where a
 * keyboard_shortcut carries the cell reference but the subsequent input_change
 * has an empty label.
 *
 * Returns undefined for events without a meaningful target (navigation, system).
 */
export function interactionTargetKey(
  event: SegmentableEvent,
  lastKnownLabel?: string,
): string | undefined {
  if (!event.event_type.startsWith('interaction.')) return undefined;
  const selector = event.target_summary?.selector;
  const label = event.target_summary?.label?.trim() ?? lastKnownLabel ?? '';
  if (selector !== undefined && label !== '') return `${selector}::${label}`;
  return selector;
}

// ---------------------------------------------------------------------------
// classifyGroupingReason
// ---------------------------------------------------------------------------

/**
 * Determines the GroupingReason for a completed accumulator of events.
 *
 * Evaluation order matters — more specific patterns are checked first.
 * This is the single source of truth for grouping classification, consumed
 * by both the batch segmenter and streaming segmenter.
 */
export function classifyGroupingReason(
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

  // Error handling: error displayed + human action = error recovery sequence
  const hasError = events.some(
    (e) => e.event_type === 'system.error_displayed',
  );
  const hasHumanAction = events.some(
    (e) =>
      e.event_type.startsWith('interaction.') ||
      e.event_type.startsWith('navigation.'),
  );
  if (hasError && hasHumanAction) return 'error_handling';

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
  // Checked BEFORE send_action so rapid accidental double-clicks on "Save" are
  // correctly classified as dedup, not two separate send actions.
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

  // send_action: click on a completion/action button (Send, Save, etc.)
  if (events.some(isActionButtonClick)) return 'send_action';

  // file_action: interaction with a file input element
  if (events.some(isFileInteraction)) return 'file_action';

  // data_entry: input changes or keyboard intents targeting form fields
  const inputEvents = events.filter(
    (e) =>
      e.event_type === 'interaction.input_change' ||
      e.event_type === 'interaction.keyboard_shortcut',
  );
  if (inputEvents.length > 0 && inputEvents.length >= events.length * 0.5) {
    return 'data_entry';
  }

  return 'single_action';
}
