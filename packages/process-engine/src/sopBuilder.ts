/**
 * SOP builder — generates a structured Standard Operating Procedure from
 * a recorded session bundle.
 *
 * SOP granularity: EVENT level.
 *
 * Each SOP step corresponds to one segmented step (a logical user action),
 * but the content within each step is derived from individual events.
 * Every meaningful observed event becomes a numbered SOPInstruction.
 *
 * Design rules:
 * - Instructions are imperative, action-oriented, and actor-directed
 * - Sensitive data fields are flagged but values are never surfaced
 * - input_change events are deduplicated per target field (last edit wins)
 *   because repeated edits to the same field represent one logical entry action
 * - System events that require user awareness (errors, modals, toasts) appear
 *   as contextual instructions, not skipped
 * - Non-actionable events (focus change, visibility) are excluded
 * - detail is always formatted from instructions — never separately authored
 */

import type {
  ProcessEngineInput,
  SOP,
  SOPStep,
  SOPInstruction,
  CanonicalEventInput,
  GroupingReason,
} from './types.js';
import {
  analyzeStep,
  formatDuration,
  uniqueSystems,
  uniqueDomains,
  toGroupingReason,
} from './stepAnalyzer.js';

// ─── Public builder ───────────────────────────────────────────────────────────

export function buildSOP(input: ProcessEngineInput): SOP {
  const { sessionJson, normalizedEvents, derivedSteps } = input;

  const eventById = new Map<string, CanonicalEventInput>(
    normalizedEvents.map(e => [e.event_id, e]),
  );

  const finalizedSteps = derivedSteps.filter(s => s.status === 'finalized');

  const allSystems = uniqueSystems(normalizedEvents);
  const allDomains = uniqueDomains(normalizedEvents);

  const steps: SOPStep[] = finalizedSteps.map(step => {
    const events = step.source_event_ids
      .map(id => eventById.get(id))
      .filter((e): e is CanonicalEventInput => e !== undefined);

    const definition = analyzeStep(step, events);
    const groupingReason = toGroupingReason(step.grouping_reason);
    const primarySystem = definition.systems[0];

    // Step-level action summary
    const action = buildAction(step.title, groupingReason, events);

    // Event-level instructions (the core of the SOP)
    const instructions = buildInstructions(events, groupingReason);

    // Format instructions as readable numbered text
    const detail = formatDetail(instructions, events);

    // Warnings from sensitive events
    const warnings: string[] = [];
    if (definition.hasSensitiveEvents) {
      warnings.push(
        'This step involves sensitive data fields. ' +
        'Do not expose values in screenshots, shared recordings, or clipboard history.',
      );
    }

    return {
      ordinal: step.ordinal,
      stepId: step.step_id,
      title: step.title,
      category: groupingReason,
      action,
      instructions,
      detail,
      ...(primarySystem !== undefined && { system: primarySystem }),
      inputs: definition.inputs,
      expectedOutcome: definition.completionCondition,
      warnings,
      durationLabel: definition.durationLabel,
      confidence: definition.confidence,
      sourceStepId: step.step_id,
    };
  });

  const totalDurationMs = derivedSteps.reduce(
    (sum, s) => sum + (s.duration_ms ?? 0),
    0,
  );

  const prerequisites = buildPrerequisites(allSystems, allDomains);
  const notes = buildNotes(finalizedSteps.length, allSystems);
  const sopInputs = buildSOPInputs(steps, allSystems);
  const sopOutputs = buildSOPOutputs(steps, sessionJson.activityName);
  const completionCriteria = buildCompletionCriteria(steps, sessionJson.activityName);

  return {
    sopId: `${sessionJson.sessionId}-sop`,
    title: `SOP: ${sessionJson.activityName}`,
    version: '1.0',
    purpose:
      `Standard operating procedure for performing "${sessionJson.activityName}". ` +
      `Generated deterministically from a live browser session recording. ` +
      `All procedure instructions are evidence-based — each instruction corresponds ` +
      `to one observed user or system event.`,
    scope: allSystems.length > 0
      ? `Applies to users performing this activity in: ${allSystems.join(', ')}`
      : 'Applies to users performing this browser-based workflow.',
    systems: allSystems,
    prerequisites,
    estimatedTime: formatDuration(totalDurationMs) || 'Varies',
    inputs: sopInputs,
    outputs: sopOutputs,
    completionCriteria,
    steps,
    notes,
    generatedAt: sessionJson.startedAt,
  };
}

// ─── Event-level instruction builder ─────────────────────────────────────────

/**
 * Converts a step's events into an ordered list of SOPInstructions.
 *
 * Rules applied in order:
 * 1. Non-actionable events are excluded (focus, visibility, recorder internals)
 * 2. input_change events are deduplicated per target field label (last write wins)
 * 3. Each remaining event becomes exactly one SOPInstruction
 * 4. Sequence numbers are assigned in event occurrence order (1-based)
 */
function buildInstructions(
  events: CanonicalEventInput[],
  groupingReason: GroupingReason,
): SOPInstruction[] {
  // Deduplicate input_change events: for each target field, keep the last occurrence.
  // This eliminates per-keystroke noise while preserving the final entered value.
  const deduplicatedEvents = deduplicateInputChanges(events);

  const instructions: SOPInstruction[] = [];
  let seq = 0;

  for (const evt of deduplicatedEvents) {
    const instruction = deriveInstruction(evt, groupingReason);
    if (instruction === null) continue;

    seq++;
    const label = safeTargetLabel(evt);

    instructions.push({
      sequence: seq,
      instruction,
      eventType: evt.event_type,
      sourceEventId: evt.event_id,
      ...(evt.page_context?.applicationLabel !== undefined && {
        system: evt.page_context.applicationLabel,
      }),
      isSensitive: evt.target_summary?.isSensitive ?? false,
      redacted: evt.normalization_meta.redactionApplied,
      ...(label !== undefined && { targetLabel: label }),
    });
  }

  return instructions;
}

/**
 * Derives a single human-readable imperative instruction from one canonical event.
 * Returns null for events that have no actionable meaning in a SOP context.
 *
 * Instructions follow the pattern: [verb] + [object] + [context/qualifier]
 * - verb: imperative present tense ("Click", "Enter", "Wait for", etc.)
 * - object: UI element label, page title, or system name
 * - qualifier: sensitivity warning, page load state, etc.
 */
function deriveInstruction(
  evt: CanonicalEventInput,
  _groupingReason: GroupingReason,
): string | null {
  const label = safeTargetLabel(evt);
  const page = evt.page_context;
  const isSensitive = evt.target_summary?.isSensitive ?? false;
  const redacted = evt.normalization_meta.redactionApplied;
  const role = evt.target_summary?.role;

  switch (evt.event_type) {

    // ── Human interaction events ────────────────────────────────────────────

    case 'interaction.click': {
      if (label) return `Click "${label}"`;
      if (role) return `Click the ${role}`;
      if (page?.pageTitle) return `Click an element on "${page.pageTitle}"`;
      return 'Click the element';
    }

    case 'interaction.input_change': {
      if (label && (isSensitive || redacted)) {
        return (
          `Enter the required value in "${label}" ` +
          `(sensitive — do not share, screenshot, or copy this value)`
        );
      }
      if (label) return `Enter a value in "${label}"`;
      if (role) return `Enter a value in the ${role} field`;
      return 'Enter a value in the field';
    }

    case 'interaction.submit': {
      if (label) return `Click "${label}" to submit the form`;
      if (role) return `Click the ${role} to submit`;
      return 'Submit the form';
    }

    case 'interaction.select': {
      if (label) return `Make a selection in "${label}"`;
      if (role) return `Select an option from the ${role}`;
      return 'Select an option from the list';
    }

    case 'interaction.keyboard_shortcut': {
      return 'Use the keyboard shortcut to trigger the action';
    }

    case 'interaction.upload_file': {
      if (label) return `Upload the required file using "${label}"`;
      return 'Upload the required file using the file chooser';
    }

    case 'interaction.download_file': {
      if (label) return `Download the file via "${label}"`;
      return 'Download the file';
    }

    case 'interaction.drag_started': {
      if (label) return `Begin dragging "${label}" to its target location`;
      return 'Begin dragging the element to its target';
    }

    case 'interaction.drag_completed': {
      if (label) return `Release "${label}" at the target location to complete the drag`;
      return 'Release the element at the target location';
    }

    // ── Navigation events ───────────────────────────────────────────────────

    case 'navigation.open_page': {
      if (page?.pageTitle) return `Wait for "${page.pageTitle}" to finish loading`;
      if (page?.routeTemplate) return `Wait for page at "${page.routeTemplate}" to load`;
      return 'Wait for the page to finish loading';
    }

    case 'navigation.route_change': {
      if (page?.pageTitle) return `Page navigates to "${page.pageTitle}"`;
      if (page?.routeTemplate) return `Route changes to "${page.routeTemplate}"`;
      return 'The page route changes';
    }

    case 'navigation.tab_activated': {
      if (page?.pageTitle) return `Switch to the "${page.pageTitle}" browser tab`;
      return 'Switch to the relevant browser tab';
    }

    case 'navigation.app_context_changed': {
      if (page?.applicationLabel) {
        return `Application context switches to ${page.applicationLabel}`;
      }
      return 'The application context changes';
    }

    // ── System feedback events ──────────────────────────────────────────────
    // These require user awareness even though they are system-generated.

    case 'system.modal_opened': {
      return (
        'A dialog or modal window opens — complete the required action inside it ' +
        'before continuing with the next instruction'
      );
    }

    case 'system.modal_closed': {
      return 'The dialog or modal window closes and control returns to the main page';
    }

    case 'system.toast_shown': {
      return (
        'System displays a notification or confirmation message — ' +
        'verify it confirms the expected outcome before proceeding'
      );
    }

    case 'system.error_displayed': {
      return (
        'System displays an error message — ' +
        'review the error, correct the issue, and retry before continuing'
      );
    }

    case 'system.status_changed': {
      return 'System status updates — verify the new status is as expected';
    }

    case 'system.loading_started': {
      return 'System begins processing — wait for it to complete before interacting';
    }

    case 'system.loading_finished': {
      return 'System processing completes — the page or data is now ready';
    }

    case 'system.redaction_applied': {
      return (
        'Sensitive data captured at this point (value redacted per privacy policy) — ' +
        'enter the required value carefully'
      );
    }

    // ── Session / annotation events ─────────────────────────────────────────

    case 'session.annotation_added': {
      const text = evt.annotation_text;
      if (text) return `Note: ${text}`;
      return 'Workflow annotation recorded at this point';
    }

    // ── Explicitly excluded events ──────────────────────────────────────────
    // These have no actionable meaning in a procedure context.

    case 'system.capture_blocked':
    case 'system.window_blurred':
    case 'system.window_focused':
    case 'system.visibility_changed':
    case 'session.started':
    case 'session.paused':
    case 'session.resumed':
    case 'session.stopped':
    case 'derived.step_boundary_detected':
    case 'derived.activity_group_created':
    case 'derived.variant_detected':
      return null;

    default:
      return null;
  }
}

/**
 * Formats the instructions list into a numbered, human-readable string.
 * Falls back to a descriptive message when no instructions are generated.
 */
function formatDetail(
  instructions: SOPInstruction[],
  events: CanonicalEventInput[],
): string {
  if (instructions.length === 0) {
    // No actionable instructions — describe what was observed
    const hasSystemEvents = events.some(e => e.actor_type === 'system');
    if (hasSystemEvents && events.every(e => e.actor_type !== 'human')) {
      return 'This step contains only system-generated events. No user interaction is required.';
    }
    return 'No actionable instructions were derived from this step\'s events.';
  }

  return instructions
    .map(i => {
      const sensitiveNote = i.isSensitive && !i.instruction.includes('sensitive')
        ? ' ⚠ sensitive field'
        : '';
      return `${i.sequence}. ${i.instruction}${sensitiveNote}`;
    })
    .join('\n');
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Deduplicates input_change events by target field label.
 *
 * When the same field is edited multiple times (e.g. backspace + retype),
 * only the last occurrence is kept. The field is identified by target_summary.label.
 * Events without a target label are kept as-is (cannot deduplicate without identity).
 * All non-input_change events pass through unchanged.
 *
 * Ordering is preserved: deduplicated events appear at the position of the LAST
 * edit to that field, maintaining chronological instruction ordering.
 */
function deduplicateInputChanges(events: CanonicalEventInput[]): CanonicalEventInput[] {
  // Identify the last index for each (event_type=input_change, label) pair
  const lastIndexByField = new Map<string, number>();

  for (let i = 0; i < events.length; i++) {
    const evt = events[i]!;
    if (evt.event_type !== 'interaction.input_change') continue;
    const label = evt.target_summary?.label;
    if (label === undefined) continue; // no identity — can't deduplicate
    lastIndexByField.set(label, i);
  }

  return events.filter((evt, i) => {
    if (evt.event_type !== 'interaction.input_change') return true;
    const label = evt.target_summary?.label;
    if (label === undefined) return true; // no label — always keep
    return lastIndexByField.get(label) === i; // keep only the last occurrence
  });
}

// ─── Privacy-safe label extraction ───────────────────────────────────────────

/**
 * Returns the target label for an event, but only if the event is not sensitive
 * or redacted. Sensitive events may expose the field name (which is safe) but
 * never the value (which is not captured anyway).
 *
 * The field label itself (e.g. "Password", "SSN") is acceptable in SOP output
 * because it names WHAT to fill in, not the actual value.
 */
function safeTargetLabel(evt: CanonicalEventInput): string | undefined {
  // Field labels (names) are safe to surface — they identify the target, not the value
  return evt.target_summary?.label ?? evt.target_summary?.role;
}

// ─── Step-level action builder ────────────────────────────────────────────────

function buildAction(
  title: string,
  groupingReason: GroupingReason,
  events: CanonicalEventInput[],
): string {
  const first = events[0];
  switch (groupingReason) {
    case 'click_then_navigate': {
      const dest = events
        .find(e => e.event_type.startsWith('navigation.'))
        ?.page_context?.pageTitle;
      return dest ? `Navigate to "${dest}"` : title;
    }
    case 'fill_and_submit': {
      const submitTarget = events.find(e => e.event_type === 'interaction.submit');
      const formName =
        (submitTarget !== undefined ? safeTargetLabel(submitTarget) : undefined) ??
        first?.page_context?.pageTitle ??
        'form';
      return `Complete and submit the "${formName}"`;
    }
    case 'error_handling':
      return 'Resolve the error or exception state';
    case 'annotation': {
      const text = events.find(e => e.event_type === 'session.annotation_added')?.annotation_text;
      return text ? `Note: ${text}` : title;
    }
    default:
      return title;
  }
}

// ─── SOP-level field builders ─────────────────────────────────────────────────

/**
 * Builds the SOP-level inputs list (§15.2 "Required inputs or access").
 * Aggregates unique, meaningful inputs across all steps.
 */
function buildSOPInputs(steps: SOPStep[], systems: string[]): string[] {
  const seen = new Set<string>();
  const inputs: string[] = [];

  // System access is always the first input
  if (systems.length > 0) {
    const systemAccess = `Access to: ${systems.join(', ')}`;
    seen.add(systemAccess);
    inputs.push(systemAccess);
  }

  // Collect field-level inputs from fill_and_submit steps
  for (const step of steps) {
    if (step.category !== 'fill_and_submit') continue;
    for (const input of step.inputs) {
      if (
        input.includes('interface') ||
        input.includes('the application') ||
        seen.has(input)
      ) continue;
      seen.add(input);
      inputs.push(input);
    }
  }

  // Collect upload inputs
  for (const step of steps) {
    for (const instr of step.instructions) {
      if (
        instr.eventType === 'interaction.upload_file' &&
        !seen.has('Required file(s) to upload')
      ) {
        seen.add('Required file(s) to upload');
        inputs.push('Required file(s) to upload');
      }
    }
  }

  return inputs.slice(0, 10);
}

/**
 * Builds the SOP-level outputs list (§15.2 "Outputs").
 */
function buildSOPOutputs(steps: SOPStep[], activityName: string): string[] {
  const outputs: string[] = [
    `"${activityName}" process completed`,
  ];

  const submits = steps.filter(s => s.category === 'fill_and_submit');
  if (submits.length > 0) {
    outputs.push('Form data submitted and recorded in system');
    const last = submits[submits.length - 1]!;
    if (last.expectedOutcome) {
      outputs.push(last.expectedOutcome);
    }
  }

  const navigations = steps.filter(s => s.category === 'click_then_navigate');
  if (navigations.length > 0) {
    const lastNav = navigations[navigations.length - 1]!;
    outputs.push(`Final destination page loaded: "${lastNav.title}"`);
  }

  // Deduplicate
  return [...new Set(outputs)].slice(0, 6);
}

/**
 * Builds the SOP-level completion criteria (§15.2 "Completion criteria").
 */
function buildCompletionCriteria(steps: SOPStep[], activityName: string): string[] {
  const criteria: string[] = [
    `All ${steps.length} procedure step${steps.length === 1 ? '' : 's'} executed in sequence`,
  ];

  const submits = steps.filter(s => s.category === 'fill_and_submit');
  if (submits.length > 0) {
    criteria.push(
      'Final form submission acknowledged by the system ' +
      '(confirmation message, redirect, or updated record status)',
    );
  }

  const navigations = steps.filter(s => s.category === 'click_then_navigate');
  if (navigations.length > 0) {
    const last = navigations[navigations.length - 1]!;
    criteria.push(
      `Destination page has fully loaded (step ${last.ordinal}: "${last.title}")`,
    );
  }

  const errors = steps.filter(s => s.category === 'error_handling');
  if (errors.length > 0) {
    criteria.push('All error states encountered during the process have been resolved');
  }

  criteria.push(
    `The "${activityName}" record or outcome is visible and reflects the completed state in the target system`,
  );

  return criteria;
}

function buildPrerequisites(systems: string[], domains: string[]): string[] {
  const prereqs: string[] = [];
  if (systems.length > 0) {
    prereqs.push(`Active, authenticated session in: ${systems.join(', ')}`);
  } else if (domains.length > 0) {
    prereqs.push(`Access to: ${domains.join(', ')}`);
  }
  prereqs.push('Sufficient permissions to perform all recorded actions');
  prereqs.push('All required data and reference information available before starting');
  return prereqs;
}

function buildNotes(stepCount: number, systems: string[]): string[] {
  const notes: string[] = [
    `This SOP was generated deterministically from a ${stepCount}-step recorded browser session.`,
    'All procedure instructions are derived from observed events — no AI inference was applied to produce step content.',
    'Confidence scores on each step indicate the segmentation engine\'s certainty in the step boundary.',
    'Sensitive data fields are identified but values are never included in SOP output.',
  ];
  if (systems.length > 1) {
    notes.push(
      `This workflow spans multiple systems: ${systems.join(', ')}. ` +
      `Ensure authenticated access to all systems before starting.`,
    );
  }
  return notes;
}
