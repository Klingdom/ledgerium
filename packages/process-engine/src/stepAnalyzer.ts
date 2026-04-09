/**
 * Step analyzer — derives per-step intelligence from canonical events.
 *
 * All functions are pure and deterministic: same input → same output.
 * No side effects, no randomness, no browser/UI dependencies.
 */

import type {
  CanonicalEventInput,
  DerivedStepInput,
  GroupingReason,
  StepDefinition,
} from './types.js';
import { CATEGORY_CONFIG } from './types.js';

// ─── Duration formatting ──────────────────────────────────────────────────────

export function formatDuration(ms: number | undefined): string {
  if (!ms || ms < 100) return '< 1s';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

// ─── Event type → human label ─────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  'interaction.click':            'Click',
  'interaction.input_change':     'Enter data',
  'interaction.submit':           'Submit form',
  'interaction.keyboard_shortcut':'Keyboard shortcut',
  'interaction.drag_started':     'Drag started',
  'interaction.drag_completed':   'Drag completed',
  'interaction.select':           'Select option',
  'navigation.open_page':         'Navigate to page',
  'navigation.route_change':      'Route change',
  'navigation.tab_activated':     'Switch tab',
  'navigation.app_context_changed': 'App context changed',
  'session.annotation_added':     'Annotation',
  'system.modal_opened':          'Modal opened',
  'system.modal_closed':          'Modal closed',
  'system.toast_shown':           'Toast message shown',
  'system.error_displayed':       'Error displayed',
  'system.loading_started':       'Loading started',
  'system.loading_finished':      'Loading finished',
  'system.status_changed':        'Status changed',
  'system.redaction_applied':     'Sensitive data (redacted)',
  'system.capture_blocked':       'Capture blocked',
};

export function eventTypeLabel(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] ?? eventType.replace(/[._]/g, ' ');
}

// ─── Data extraction helpers ──────────────────────────────────────────────────

function uniqueSystems(events: CanonicalEventInput[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const e of events) {
    const label = e.page_context?.applicationLabel;
    if (label && !seen.has(label)) {
      seen.add(label);
      result.push(label);
    }
  }
  return result;
}

function uniqueDomains(events: CanonicalEventInput[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const e of events) {
    const domain = e.page_context?.domain;
    if (domain && !seen.has(domain)) {
      seen.add(domain);
      result.push(domain);
    }
  }
  return result;
}

function humanEvents(events: CanonicalEventInput[]): CanonicalEventInput[] {
  return events.filter(
    e => e.actor_type === 'human' || e.event_type === 'session.annotation_added',
  );
}

/** Raw HTML element types that should never appear in user-facing output. */
const RAW_ELEMENT_TYPES = new Set(['div', 'span', 'svg', 'use', 'p', 'li', 'ul', 'section', 'article', 'main', 'header', 'footer', 'nav', 'form', 'fieldset', 'figure', 'img']);

function targetLabel(event: CanonicalEventInput): string | undefined {
  const label = event.target_summary?.label;
  if (label && label.trim()) return label;
  // Only use role if it's a meaningful ARIA role, not a raw HTML element type
  const role = event.target_summary?.role;
  if (role && !RAW_ELEMENT_TYPES.has(role)) return role;
  return undefined;
}

function hasSensitiveEvents(events: CanonicalEventInput[]): boolean {
  return events.some(
    e => e.target_summary?.isSensitive === true || e.event_type === 'system.redaction_applied',
  );
}

// ─── Grouping reason guard ────────────────────────────────────────────────────

const VALID_GROUPING_REASONS: ReadonlySet<string> = new Set<GroupingReason>([
  'click_then_navigate',
  'fill_and_submit',
  'repeated_click_dedup',
  'single_action',
  'data_entry',
  'send_action',
  'file_action',
  'error_handling',
  'annotation',
]);

function toGroupingReason(raw: string): GroupingReason {
  return VALID_GROUPING_REASONS.has(raw) ? (raw as GroupingReason) : 'single_action';
}

// ─── Field name humanization ─────────────────────────────────────────────────

/** Maps common field name patterns to descriptive input labels. */
const FIELD_TYPE_SUFFIXES: ReadonlyArray<[RegExp, string]> = [
  [/^email$/i, 'Email address'],
  [/^phone$/i, 'Phone number'],
  [/^amount$/i, 'Amount'],
  [/^price$/i, 'Price'],
  [/^date$/i, 'Date'],
  [/^name$/i, 'Name'],
  [/^address$/i, 'Address'],
  [/^url$/i, 'URL'],
  [/^description$/i, 'Description'],
  [/^password$/i, 'Password'],
  [/^username$/i, 'Username'],
  [/^vendor$/i, 'Vendor name'],
  [/email/i, 'Email address'],
  [/phone/i, 'Phone number'],
  [/amount/i, 'Amount'],
  [/date/i, 'Date'],
  [/close.?date/i, 'Close date'],
];

function humanizeFieldInput(fieldName: string): string {
  for (const [pattern, label] of FIELD_TYPE_SUFFIXES) {
    if (pattern.test(fieldName)) return label;
  }
  // If the field name already reads naturally (e.g. "Opportunity Name"), return as-is
  return fieldName;
}

// ─── Inputs / Outputs derivation ─────────────────────────────────────────────

function deriveInputs(
  groupingReason: GroupingReason,
  events: CanonicalEventInput[],
  systems: string[],
): string[] {
  const systemCtx = systems.length > 0 ? systems[0] : 'the application';

  switch (groupingReason) {
    case 'click_then_navigate': {
      const navPage = events.find(e => e.event_type.startsWith('navigation.'))
        ?.page_context?.pageTitle;
      return [
        'Current page context',
        navPage ? `Target: ${navPage}` : 'Navigation target URL',
        `Access to ${systemCtx}`,
      ];
    }

    case 'fill_and_submit': {
      const fields = events
        .filter(e => e.event_type === 'interaction.input_change' && targetLabel(e))
        .map(e => targetLabel(e) as string)
        .filter((l, i, arr) => arr.indexOf(l) === i)
        .slice(0, 5);
      return [
        ...fields.map(f => humanizeFieldInput(f)),
        `${systemCtx} form`,
      ];
    }

    case 'data_entry': {
      const fields = events
        .filter(e => e.event_type === 'interaction.input_change' && targetLabel(e))
        .map(e => targetLabel(e) as string)
        .filter((l, i, arr) => arr.indexOf(l) === i)
        .slice(0, 5);
      return [
        ...fields.map(f => humanizeFieldInput(f)),
        `Access to ${systemCtx}`,
      ];
    }

    case 'send_action': {
      const actionLabel = events.find(e => e.event_type === 'interaction.click' && targetLabel(e))
        ?.target_summary?.label;
      return [
        actionLabel ? `"${actionLabel}" button available` : 'Completion action available',
        'All prerequisite data entered',
        `Access to ${systemCtx}`,
      ];
    }

    case 'file_action':
      return ['File to upload/attach', `Access to ${systemCtx}`, 'File browser or drag target'];

    case 'error_handling':
      return ['Error state from prior action', 'User response/correction'];

    case 'annotation': {
      const text = events.find(e => e.event_type === 'session.annotation_added')?.annotation_text;
      return text ? [`Annotation: "${text}"`] : ['User annotation text'];
    }

    default: {
      const first = events[0];
      if (!first) return ['User action'];
      const label = targetLabel(first);
      return label ? [`"${label}" element`, `${systemCtx} interface`] : [`${systemCtx} interface`];
    }
  }
}

function deriveOutputs(
  groupingReason: GroupingReason,
  events: CanonicalEventInput[],
  systems: string[],
): string[] {
  const systemCtx = systems.length > 0 ? systems[0] : 'the application';

  switch (groupingReason) {
    case 'click_then_navigate': {
      const navPage = events.find(e => e.event_type.startsWith('navigation.'))
        ?.page_context?.pageTitle;
      return navPage
        ? [`"${navPage}" page loaded in ${systemCtx}`, 'Navigation state updated']
        : ['Target page loaded in browser', 'Navigation state updated'];
    }

    case 'fill_and_submit':
      return [
        `Record created or updated in ${systemCtx}`,
        'Confirmation of successful submission',
      ];

    case 'data_entry':
      return [`Data saved in ${systemCtx}`, 'Fields accepted by the system'];

    case 'send_action': {
      const actionLabel = events.find(e => e.event_type === 'interaction.click')
        ?.target_summary?.label;
      return actionLabel
        ? [`"${actionLabel}" action confirmed by ${systemCtx}`, `${systemCtx} state updated`]
        : [`Action confirmed by ${systemCtx}`, `${systemCtx} state updated`];
    }

    case 'file_action':
      return ['File attached or uploaded', `${systemCtx} reflects the file`];

    case 'error_handling':
      return ['Error state resolved or acknowledged', 'Workflow resumed'];

    case 'annotation':
      return ['Annotation recorded in session timeline'];

    case 'repeated_click_dedup': {
      const firstEvt = events[0];
      const label = firstEvt !== undefined ? targetLabel(firstEvt) : undefined;
      return label !== undefined
        ? [`"${label}" action triggered on ${systemCtx}`]
        : [`Action triggered on ${systemCtx}`];
    }

    default: {
      const first = events[0];
      if (first?.event_type === 'interaction.input_change') {
        return ['Field value updated'];
      }
      if (first?.event_type === 'interaction.submit') {
        return ['Form data submitted', `${systemCtx} state updated`];
      }
      return ['Page updated accordingly'];
    }
  }
}

function deriveCompletionCondition(
  groupingReason: GroupingReason,
  events: CanonicalEventInput[],
): string {
  const ccSystems = uniqueSystems(events);
  const ccSystemCtx = ccSystems[0] ?? 'the system';

  switch (groupingReason) {
    case 'click_then_navigate': {
      const navPage = events.find(e => e.event_type.startsWith('navigation.'))
        ?.page_context?.pageTitle;
      return navPage
        ? `"${navPage}" loads successfully`
        : 'Target page loads successfully';
    }
    case 'fill_and_submit': {
      const ccFields = events
        .filter(e => e.event_type === 'interaction.input_change' && targetLabel(e))
        .map(e => targetLabel(e) as string)
        .filter((l, i, arr) => arr.indexOf(l) === i)
        .slice(0, 5);
      return ccFields.length > 0
        ? `Form fields (${ccFields.join(', ')}) accepted and submission confirmed`
        : 'Form submitted and confirmation received';
    }
    case 'data_entry':
      return 'All required values entered and accepted by the system';
    case 'send_action': {
      const actionLabel2 = events.find(e => e.event_type === 'interaction.click')
        ?.target_summary?.label;
      return actionLabel2
        ? `"${actionLabel2}" action confirmed by ${ccSystemCtx}`
        : `Action confirmed by ${ccSystemCtx}`;
    }
    case 'file_action':
      return 'File upload completes and file appears in the interface';
    case 'error_handling':
      return 'Error acknowledged and workflow can continue';
    case 'annotation':
      return 'Annotation text saved to session record';
    case 'repeated_click_dedup': {
      const firstEvt2 = events[0];
      const label = firstEvt2 !== undefined ? targetLabel(firstEvt2) : undefined;
      return label !== undefined ? `"${label}" responds to the click action` : 'UI responds to click';
    }
    default: {
      const first = events[0];
      if (first?.event_type === 'interaction.input_change') {
        return 'Field value accepted and cursor moves to next field or action';
      }
      // Use page context for a more specific completion condition
      const defaultPage = first?.page_context?.pageTitle ?? first?.page_context?.applicationLabel;
      return defaultPage
        ? `Action completed on "${defaultPage}"`
        : 'Action completed and page updates accordingly';
    }
  }
}

// ─── Operational definition derivation ───────────────────────────────────────

export function deriveOperationalDefinition(
  step: DerivedStepInput,
  events: CanonicalEventInput[],
  groupingReason: GroupingReason,
): string {
  const systems = uniqueSystems(events);
  const domains = uniqueDomains(events);
  const appLabel = systems[0] ?? domains[0] ?? 'the application';

  switch (groupingReason) {
    case 'click_then_navigate': {
      const dest = events.find(e => e.event_type.startsWith('navigation.'))
        ?.page_context?.pageTitle ?? 'the next page';
      return `Navigate to "${dest}" in ${appLabel} to proceed with the next phase.`;
    }

    case 'fill_and_submit': {
      const fields = events
        .filter(e => e.event_type === 'interaction.input_change' && targetLabel(e))
        .map(e => targetLabel(e) as string)
        .filter((l, i, arr) => arr.indexOf(l) === i)
        .slice(0, 5);
      const fieldList = fields.length > 0 ? ` with ${fields.join(', ')} fields` : '';
      return `Complete the form${fieldList} and submit in ${appLabel}.`;
    }

    case 'repeated_click_dedup': {
      const firstEvt = events[0];
      const label = firstEvt !== undefined ? targetLabel(firstEvt) : undefined;
      return `Click "${label ?? 'the target element'}" in ${appLabel}.`;
    }

    case 'data_entry': {
      const deFields = events
        .filter(e => e.event_type === 'interaction.input_change' && targetLabel(e))
        .map(e => targetLabel(e) as string)
        .filter((l, i, arr) => arr.indexOf(l) === i)
        .slice(0, 5);
      const deFieldList = deFields.length > 0 ? ` ${deFields.join(', ')}` : '';
      return `Enter${deFieldList} in ${appLabel}.`;
    }

    case 'send_action': {
      const actionEvt = events.find(e => e.event_type === 'interaction.click');
      const actionLbl = actionEvt !== undefined ? targetLabel(actionEvt) : undefined;
      return `Click "${actionLbl ?? 'the action button'}" in ${appLabel} to execute the action.`;
    }

    case 'file_action':
      return `Attach or upload the required file in ${appLabel}.`;

    case 'error_handling': {
      // Find the preceding action context if available
      const precedingAction = events.find(e => e.event_type === 'system.error_displayed');
      const prevLabel = precedingAction !== undefined ? targetLabel(precedingAction) : undefined;
      return prevLabel
        ? `Resolve the error that occurred after "${prevLabel}" in ${appLabel}.`
        : `Resolve the error that occurred in ${appLabel}.`;
    }

    case 'annotation': {
      const text = events.find(e => e.event_type === 'session.annotation_added')?.annotation_text;
      return text
        ? `Annotation: "${text}"`
        : 'Annotation recorded at this point in the workflow.';
    }

    case 'single_action':
    default: {
      const first = events[0];
      if (first === undefined) return `Perform the required action in ${appLabel}.`;
      const label = targetLabel(first);
      if (first.event_type === 'interaction.click') {
        return `Click ${label !== undefined ? `"${label}"` : 'the target element'} in ${appLabel}.`;
      }
      if (first.event_type === 'interaction.input_change') {
        return label !== undefined
          ? `Enter data in the "${label}" field in ${appLabel}.`
          : `Enter the required data in ${appLabel}.`;
      }
      if (first.event_type.startsWith('navigation.')) {
        const dest = first.page_context?.pageTitle ?? first.page_context?.routeTemplate;
        return dest !== undefined
          ? `Navigate to "${dest}" in ${appLabel}.`
          : `Navigate to the target page in ${appLabel}.`;
      }
      return `Perform the required action in ${appLabel}.`;
    }
  }
}

function derivePurpose(groupingReason: GroupingReason, _step: DerivedStepInput): string {
  switch (groupingReason) {
    case 'click_then_navigate': return 'Opens a new page or view to proceed to the next stage of the workflow.';
    case 'fill_and_submit':     return 'Captures and submits structured data to the system, completing a data entry transaction.';
    case 'repeated_click_dedup': return 'Triggers a specific UI control, representing a deliberate user intent.';
    case 'data_entry':           return 'Enters or updates data in the system, building toward a complete record.';
    case 'send_action':          return 'Executes a completion action (send, save, submit) that advances the workflow.';
    case 'file_action':          return 'Attaches or uploads a file as part of the workflow.';
    case 'error_handling':       return 'Resolves an exception or error state to allow the workflow to continue.';
    case 'annotation':           return 'Records contextual information about the workflow at this point.';
    default:                     return 'Performs a discrete user interaction within the workflow.';
  }
}

// ─── Main analyzer ────────────────────────────────────────────────────────────

export function analyzeStep(
  step: DerivedStepInput,
  events: CanonicalEventInput[],
): StepDefinition {
  const groupingReason = toGroupingReason(step.grouping_reason);
  const category = CATEGORY_CONFIG[groupingReason];
  const systems = uniqueSystems(events);
  const domains = uniqueDomains(events);

  return {
    ordinal: step.ordinal,
    stepId: step.step_id,
    title: step.title,
    category: groupingReason,
    categoryLabel: category.label,
    categoryColor: category.color,
    categoryBg: category.bg,
    operationalDefinition: deriveOperationalDefinition(step, events, groupingReason),
    purpose: derivePurpose(groupingReason, step),
    systems,
    domains,
    inputs: deriveInputs(groupingReason, events, systems),
    outputs: deriveOutputs(groupingReason, events, systems),
    completionCondition: deriveCompletionCondition(groupingReason, events),
    confidence: step.confidence,
    ...(step.duration_ms !== undefined && { durationMs: step.duration_ms }),
    durationLabel: formatDuration(step.duration_ms),
    eventCount: events.length,
    hasSensitiveEvents: hasSensitiveEvents(events),
    // Traceability: preserve source event IDs for downstream inspection (§19.1)
    sourceEventIds: [...step.source_event_ids],
  };
}

// ─── Re-exports for package-internal use ─────────────────────────────────────

export {
  uniqueSystems,
  uniqueDomains,
  humanEvents,
  targetLabel,
  hasSensitiveEvents,
  toGroupingReason,
};
