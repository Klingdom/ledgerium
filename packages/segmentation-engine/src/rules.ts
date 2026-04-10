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
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Raw HTML element types that should not appear in user-facing labels.
 * When the only identifier is a generic tag name, we return undefined
 * so callers fall back to page context instead.
 */
const RAW_ELEMENT_TYPES = new Set([
  'div', 'span', 'svg', 'use', 'p', 'li', 'ul', 'section', 'article',
  'main', 'header', 'footer', 'nav', 'form', 'fieldset', 'figure', 'img',
]);

/** Best-effort label from an event's target_summary. */
function targetLabel(event: SegmentableEvent): string | undefined {
  const label = event.target_summary?.label;
  if (label && label.trim()) return label;
  // Only use role if it's a meaningful ARIA role, not a raw HTML element type.
  // "button" and "link" are useful; "div" and "span" are not.
  const role = event.target_summary?.role;
  if (role && !RAW_ELEMENT_TYPES.has(role)) return role;
  return undefined;
}

/**
 * Build a contextual fallback label using page context when the target
 * element has no meaningful label. Produces strings like:
 *   "element on Invoice Page" or "field in Salesforce"
 * instead of bare "element" or "field".
 */
function contextualFallback(
  event: SegmentableEvent | undefined,
  bareLabel: string,
  pageContext?: DerivedStep['page_context'],
): string {
  if (!event) return bareLabel;
  const pageLabel =
    event.page_context?.pageTitle ??
    pageContext?.routeTemplate ??
    event.page_context?.applicationLabel;
  if (pageLabel) {
    const system = event.page_context?.applicationLabel;
    if (system && system !== pageLabel) {
      return `${bareLabel} on ${pageLabel} (${system})`;
    }
    return `${bareLabel} on ${pageLabel}`;
  }
  return bareLabel;
}

/**
 * Page titles that are too generic to be useful as navigation destinations.
 * When we encounter these, we fall back to route template + app label
 * for a richer title like "Navigate to /orders/new (NetSuite)" instead
 * of "Navigate to Home".
 */
const GENERIC_PAGE_TITLES = new Set([
  'home', 'dashboard', 'main', 'index', 'welcome', 'loading',
  'untitled', 'new tab', 'about:blank',
]);

/** Page title from an event's page_context, with generic title detection. */
function pageTitle(event: SegmentableEvent): string | undefined {
  const t = event.page_context?.pageTitle;
  if (t === undefined || t === '') return undefined;
  // If the page title is generic, it's not useful as a navigation target.
  // Return undefined to let callers fall through to route template.
  if (GENERIC_PAGE_TITLES.has(t.toLowerCase().trim())) return undefined;
  return t;
}

/**
 * Enriched page title that, for generic page titles, combines route template
 * and application label for better navigation context.
 * Example: "Home" → "/invoices/new (NetSuite)" or "NetSuite" or undefined
 */
function enrichedPageDestination(event: SegmentableEvent): string | undefined {
  // Try the page title first — if it's specific, use it
  const title = pageTitle(event);
  if (title) return title;

  // Page title is generic or empty — build from route + app label
  const route = event.page_context?.routeTemplate;
  const app = event.page_context?.applicationLabel;

  if (route && app) return `${route} (${app})`;
  if (route) return route;
  if (app) return app;
  return undefined;
}

/** Route template from an event's page_context. */
function routeTemplate(event: SegmentableEvent): string | undefined {
  const r = event.page_context?.routeTemplate;
  return r !== undefined && r !== '' ? r : undefined;
}

// ---------------------------------------------------------------------------
// deriveStepTitle
// ---------------------------------------------------------------------------

/**
 * Produces a human-readable title for a derived step.
 *
 * Title is derived from the grouping reason and supplemented with contextual
 * data from the events and page context.
 */
export function deriveStepTitle(
  events: SegmentableEvent[],
  groupingReason: GroupingReason,
  pageContext?: DerivedStep['page_context'],
): string {
  const firstEvent = events[0];

  switch (groupingReason) {
    case 'click_then_navigate': {
      // Find the navigation event for destination context.
      const navEvent = events.find((e) =>
        e.event_type.startsWith('navigation.'),
      );
      // Use enriched destination to avoid generic titles like "Dashboard"
      const destination =
        (navEvent !== undefined ? enrichedPageDestination(navEvent) : undefined) ??
        pageContext?.routeTemplate ??
        (navEvent !== undefined ? routeTemplate(navEvent) : undefined) ??
        'page';
      return `Navigate to ${destination}`;
    }

    case 'fill_and_submit': {
      // Find the submit event for form label context.
      const submitEvent = events.find(
        (e) => e.event_type === 'interaction.submit',
      );
      const formLabel =
        (submitEvent !== undefined ? targetLabel(submitEvent) : undefined) ??
        (firstEvent !== undefined ? pageTitle(firstEvent) : undefined) ??
        pageContext?.routeTemplate ??
        'form';
      return `Fill and submit ${formLabel}`;
    }

    case 'repeated_click_dedup': {
      const label = firstEvent !== undefined ? targetLabel(firstEvent) : undefined;
      if (label) return `Click ${label}`;
      return `Click ${contextualFallback(firstEvent, 'element', pageContext)}`;
    }

    case 'error_handling': {
      return 'Handle error';
    }

    case 'data_entry': {
      const label = firstEvent !== undefined ? targetLabel(firstEvent) : undefined;
      if (label) return `Enter ${label}`;
      return `Enter ${contextualFallback(firstEvent, 'field', pageContext)}`;
    }

    case 'send_action': {
      const label = firstEvent !== undefined ? targetLabel(firstEvent) : undefined;
      if (label) return label;
      return `Complete ${contextualFallback(firstEvent, 'action', pageContext)}`;
    }

    case 'file_action': {
      return 'Attach file';
    }

    case 'annotation': {
      // The annotation event carries its text directly in the event_type
      // or normalization_meta; look for it in the first event.
      // The caller should pass the annotation text via the events array;
      // we surface the sourceEventType as a best-effort fallback.
      if (firstEvent !== undefined) {
        // Annotation events may carry a label in target_summary.
        const annotationLabel = firstEvent.target_summary?.label;
        if (annotationLabel !== undefined && annotationLabel !== '') {
          return annotationLabel;
        }
      }
      return 'User annotation';
    }

    case 'single_action': {
      if (firstEvent === undefined) return 'Perform action';

      const type = firstEvent.event_type;

      if (type === 'interaction.click') {
        const label = targetLabel(firstEvent);
        if (label) return `Click ${label}`;
        return `Click ${contextualFallback(firstEvent, 'element', pageContext)}`;
      }

      if (type === 'interaction.input_change') {
        const label = targetLabel(firstEvent);
        if (label) return `Update ${label}`;
        return `Update ${contextualFallback(firstEvent, 'field', pageContext)}`;
      }

      if (type === 'interaction.submit') {
        const label =
          pageTitle(firstEvent) ??
          pageContext?.routeTemplate ??
          'form';
        return `Submit ${label}`;
      }

      if (type.startsWith('navigation.')) {
        const title =
          enrichedPageDestination(firstEvent) ??
          pageContext?.routeTemplate ??
          'page';
        return `Navigate to ${title}`;
      }

      return `Interact with ${contextualFallback(firstEvent, 'page', pageContext)}`;
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
      const firstEvent = events[0];
      if (firstEvent !== undefined && targetLabel(firstEvent) !== undefined) {
        return 0.75;
      }
      return 0.55;
    }
  }
}
