/**
 * Segmentation rules: version constants, title derivation, confidence scoring,
 * and ID generation for the Ledgerium segmentation engine.
 */

import type {
  SegmentableEvent,
  DerivedStep,
  GroupingReason,
} from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SEGMENTATION_RULE_VERSION = '1.1.0' as const;

/** Gap between consecutive events (ms) that triggers a new step boundary. */
export const IDLE_GAP_MS = 45_000 as const;

/**
 * Window (ms) after a click event within which a navigation event is
 * considered causally linked (click → navigate grouping).
 */
export const CLICK_NAV_WINDOW_MS = 2_500 as const;

/**
 * Window (ms) within which repeated clicks on the same selector are
 * collapsed into a single step.
 */
export const RAPID_CLICK_DEDUP_MS = 1_000 as const;

/**
 * Minimum time gap (ms) between events on different targets that triggers a
 * step boundary within the same domain.  This splits "Enter Subject" from
 * "Write Email Body" when the user pauses briefly between fields.
 *
 * Set conservatively — too low creates noise, too high collapses distinct actions.
 */
export const TARGET_CHANGE_GAP_MS = 2_000 as const;

/**
 * Patterns that indicate a completion/action button (Send, Submit, Save, etc.).
 * A click on a target whose label matches one of these triggers a step boundary
 * AFTER the click event, similar to form_submitted.
 */
export const ACTION_BUTTON_PATTERNS = [
  /\bsend\b/i, /\bsubmit\b/i, /\bsave\b/i, /\bdelete\b/i,
  /\bconfirm\b/i, /\bapprove\b/i, /\breject\b/i, /\bcancel\b/i,
  /\bclose\b/i, /\bdone\b/i, /\bfinish\b/i, /\bpublish\b/i,
  /\barchive\b/i, /\bremove\b/i, /\bcreate\b/i, /\bupdate\b/i,
] as const;

// ---------------------------------------------------------------------------
// generateStepId
// ---------------------------------------------------------------------------

/**
 * Generates a UUID v4 step identifier.
 * Uses crypto.randomUUID() when available; falls back to a Math.random-based
 * UUID-shaped string.
 */
export function generateStepId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Internal helpers (extension-side style, ported from bundle-builder.ts)
// ---------------------------------------------------------------------------

/**
 * Detect spreadsheet cell references (A1, B5, AA12, etc.).
 * Labels matching this pattern are treated as cell coordinates rather than
 * field names, and are excluded from field-label extraction.
 */
const CELL_REF_RE = /^[A-Z]{1,3}\d{1,5}$/;

/**
 * Get a readable app context suffix like " in email" or " in App".
 * Returns '' when no meaningful application label is present.
 */
function appContextSuffix(
  page: SegmentableEvent['page_context'] | DerivedStep['page_context'] | undefined,
): string {
  if (page === undefined) return '';
  const app = page.applicationLabel?.toLowerCase() ?? '';
  const title = 'pageTitle' in page ? (page.pageTitle?.toLowerCase() ?? '') : '';
  const route = page.routeTemplate?.toLowerCase() ?? '';
  if (
    app === 'mail' ||
    title.includes('inbox') ||
    title.includes('gmail') ||
    route.includes('mail')
  ) {
    return ' in email';
  }
  if (
    title.includes('sheets') ||
    title.includes('spreadsheet') ||
    route.includes('spreadsheet')
  ) {
    return ' in spreadsheet';
  }
  if (title.includes('docs') || title.includes('document')) return ' in document';
  if (page.applicationLabel && page.applicationLabel !== 'Mail' && page.applicationLabel !== 'Docs') {
    return ` in ${page.applicationLabel}`;
  }
  return '';
}

/**
 * Extract unique, meaningful field labels from input_change events.
 * Excludes spreadsheet cell references (A16, B16, etc.) and deduplicates.
 * Returns at most 3 labels.
 */
function extractFieldLabels(events: SegmentableEvent[]): string[] {
  return events
    .filter(
      (e) =>
        e.event_type === 'interaction.input_change' &&
        e.target_summary?.label?.trim() !== undefined &&
        e.target_summary.label.trim() !== '',
    )
    .map((e) => e.target_summary!.label!.trim())
    .filter((l, i, arr) => arr.indexOf(l) === i) // dedupe
    .filter((l) => !CELL_REF_RE.test(l))         // exclude cell refs
    .slice(0, 3);
}

/**
 * Get a meaningful click label from a set of events.
 * Returns the label of the first click event that has one,
 * or falls back to 'action{ctx}'.
 */
function meaningfulClickLabel(
  events: SegmentableEvent[],
  ctx: string,
): string {
  for (const e of events) {
    if (e.event_type === 'interaction.click' && e.target_summary) {
      const label = e.target_summary.label?.trim();
      if (label !== undefined && label !== '') return label;
    }
  }
  return ctx ? `action${ctx}` : 'action';
}

// ---------------------------------------------------------------------------
// deriveStepTitle
// ---------------------------------------------------------------------------

/**
 * Produces a human-readable title for a derived step.
 *
 * Title derivation style matches the extension-side `deriveTitle` in
 * bundle-builder.ts (canonical post-convergence style per D12).
 */
export function deriveStepTitle(
  events: SegmentableEvent[],
  groupingReason: GroupingReason,
  pageContext?: DerivedStep['page_context'],
): string {
  const firstEvent = events[0];
  const page = firstEvent?.page_context ?? pageContext;
  const ctx = appContextSuffix(page);

  switch (groupingReason) {
    case 'click_then_navigate': {
      const navEvent = events.find((e) => e.event_type.startsWith('navigation.'));
      const dest =
        navEvent?.page_context?.pageTitle ||
        navEvent?.page_context?.routeTemplate ||
        'page';
      return `Navigate to ${dest}`;
    }

    case 'fill_and_submit': {
      const fields = extractFieldLabels(events);
      if (fields.length > 0) return `Complete ${fields.join(', ')} and submit${ctx}`;
      return `Complete and submit form${ctx}`;
    }

    case 'annotation': {
      if (firstEvent !== undefined) {
        if (firstEvent.annotation_text !== undefined && firstEvent.annotation_text !== '') {
          return firstEvent.annotation_text;
        }
      }
      return 'Annotation';
    }

    case 'error_handling': {
      return `Handle error${ctx}`;
    }

    case 'data_entry': {
      const fields = extractFieldLabels(events);
      if (fields.length > 0) return `Enter ${fields.join(', ')}${ctx}`;
      // Spreadsheet cell detection
      const cellLabels = events
        .filter(
          (e) =>
            e.target_summary?.label !== undefined &&
            CELL_REF_RE.test(e.target_summary.label.trim()),
        )
        .map((e) => e.target_summary!.label!.trim())
        .filter((l, i, arr) => arr.indexOf(l) === i)
        .slice(0, 3);
      if (cellLabels.length > 0) {
        return `Enter data in cells ${cellLabels.join(', ')}${ctx || ' in spreadsheet'}`;
      }
      return `Enter data${ctx}`;
    }

    case 'send_action': {
      const actionEvent = events.find((e) => e.event_type === 'interaction.click' &&
        e.target_summary?.label?.trim() !== undefined &&
        e.target_summary.label.trim() !== '');
      const actionLabel = actionEvent?.target_summary?.label?.trim();
      if (actionLabel !== undefined && actionLabel !== '') return `${actionLabel}${ctx}`;
      return `Send${ctx}`;
    }

    case 'file_action': {
      return `Attach file${ctx}`;
    }

    case 'repeated_click_dedup': {
      const label = meaningfulClickLabel(events, ctx);
      return `Click ${label}`;
    }

    case 'single_action': {
      if (firstEvent === undefined) return 'Perform action';

      const type = firstEvent.event_type;

      if (type === 'interaction.click') {
        const label = meaningfulClickLabel(events, ctx);
        return `Click ${label}`;
      }

      if (type === 'interaction.input_change') {
        const fields = extractFieldLabels(events);
        if (fields.length > 0) return `Enter ${fields.join(', ')}${ctx}`;
        return `Enter data${ctx}`;
      }

      if (type === 'interaction.submit') {
        return `Submit form${ctx}`;
      }

      if (type.startsWith('navigation.')) {
        const dest =
          firstEvent.page_context?.pageTitle ||
          firstEvent.page_context?.routeTemplate ||
          'page';
        return `Navigate to ${dest}`;
      }

      return `Perform action${ctx}`;
    }
  }
}

// ---------------------------------------------------------------------------
// calculateConfidence
// ---------------------------------------------------------------------------

/**
 * Returns a confidence score in [0, 1] for the given step grouping.
 *
 * Higher confidence indicates that the grouping heuristic has strong evidence
 * of a meaningful user task boundary.
 */
export function calculateConfidence(
  events: SegmentableEvent[],
  groupingReason: GroupingReason,
): number {
  switch (groupingReason) {
    case 'click_then_navigate':
      return 0.85;

    case 'fill_and_submit':
      return 0.9;

    case 'annotation':
      return 1.0;

    case 'error_handling':
      return 0.8;

    case 'data_entry':
      return 0.8;

    case 'send_action':
      return 0.9;

    case 'file_action':
      return 0.85;

    case 'repeated_click_dedup':
      return 0.7;

    case 'single_action': {
      // Higher confidence when we have a concrete label to reason about.
      const hasLabel = events.some((e) => e.target_summary?.label?.trim());
      return hasLabel ? 0.75 : 0.55;
    }
  }
}
