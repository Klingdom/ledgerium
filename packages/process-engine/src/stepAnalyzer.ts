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

function targetLabel(event: CanonicalEventInput): string | undefined {
  return event.target_summary?.label ?? event.target_summary?.role;
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
  'error_handling',
  'annotation',
]);

function toGroupingReason(raw: string): GroupingReason {
  return VALID_GROUPING_REASONS.has(raw) ? (raw as GroupingReason) : 'single_action';
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
        ...fields.map(f => `${f} value`),
        `${systemCtx} form`,
      ];
    }

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
    case 'click_then_navigate':
      return ['New page loaded in browser', 'Updated navigation state'];

    case 'fill_and_submit':
      return [
        'Form data submitted to system',
        'Server-side state updated',
        `Confirmation or redirect from ${systemCtx}`,
      ];

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
      return ['UI state updated'];
    }
  }
}

function deriveCompletionCondition(
  groupingReason: GroupingReason,
  events: CanonicalEventInput[],
): string {
  switch (groupingReason) {
    case 'click_then_navigate':
      return 'Target page has fully loaded';
    case 'fill_and_submit':
      return 'Form submitted and confirmation received (redirect or toast message)';
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
      return 'UI reflects the completed action';
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
        ?.page_context?.pageTitle ?? 'another page';
      return `The user navigated to "${dest}" on ${appLabel}. This step captures the click that triggered navigation and the resulting page load as a single logical action.`;
    }

    case 'fill_and_submit': {
      const fields = events
        .filter(e => e.event_type === 'interaction.input_change' && targetLabel(e))
        .map(e => targetLabel(e) as string)
        .filter((l, i, arr) => arr.indexOf(l) === i)
        .slice(0, 3);
      const fieldList = fields.length > 0 ? ` (${fields.join(', ')})` : '';
      return `The user completed a form${fieldList} and submitted it on ${appLabel}. This step groups the data entry actions and final submission into a single transactional unit.`;
    }

    case 'repeated_click_dedup': {
      const firstEvt = events[0];
      const label = firstEvt !== undefined ? targetLabel(firstEvt) : undefined;
      return `The user clicked "${label ?? 'an element'}" on ${appLabel}. Multiple rapid clicks on the same target were deduplicated into a single logical action to eliminate noise.`;
    }

    case 'error_handling':
      return `The user encountered and responded to an error or unexpected state on ${appLabel}. This step captures the error recovery interaction pattern within the workflow.`;

    case 'annotation': {
      const text = events.find(e => e.event_type === 'session.annotation_added')?.annotation_text;
      return text
        ? `A manual workflow annotation was recorded: "${text}". This marks a contextual boundary or note within the process.`
        : 'A manual workflow annotation was added at this point. This marks a contextual boundary or note within the process.';
    }

    case 'single_action':
    default: {
      const first = events[0];
      if (first === undefined) return `An action was performed on ${appLabel}.`;
      const label = targetLabel(first);
      if (first.event_type === 'interaction.click') {
        return `The user clicked${label !== undefined ? ` "${label}"` : ' an element'} on ${appLabel}. This is a discrete UI interaction that does not directly trigger navigation.`;
      }
      if (first.event_type === 'interaction.input_change') {
        return `The user entered or updated data${label !== undefined ? ` in the "${label}" field` : ''} on ${appLabel}.`;
      }
      if (first.event_type.startsWith('navigation.')) {
        const dest = first.page_context?.pageTitle ?? first.page_context?.routeTemplate;
        return `The user navigated${dest !== undefined ? ` to "${dest}"` : ''} on ${appLabel}.`;
      }
      return `A single interaction was performed on ${appLabel}.`;
    }
  }
}

function derivePurpose(groupingReason: GroupingReason, step: DerivedStepInput): string {
  const base = `Step ${step.ordinal} of the workflow.`;
  switch (groupingReason) {
    case 'click_then_navigate': return `${base} Opens a new page or view, enabling the user to proceed to the next stage of the process.`;
    case 'fill_and_submit':     return `${base} Captures and submits structured data to the system, completing a data entry transaction.`;
    case 'repeated_click_dedup': return `${base} Triggers a specific UI control, representing a deliberate user intent.`;
    case 'error_handling':       return `${base} Resolves an exception or error state to allow the workflow to continue.`;
    case 'annotation':           return `${base} Records contextual information about the process at this point.`;
    default:                     return `${base} Performs a discrete user interaction within the workflow.`;
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
