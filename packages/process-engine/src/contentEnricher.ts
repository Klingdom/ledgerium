/**
 * Content enricher — derives personalization intelligence from observed
 * workflow behavior to make process maps and SOPs specific, useful, and
 * grounded in reality.
 *
 * All functions are pure and deterministic.
 *
 * Enrichment categories:
 * 1. Business objective inference — what is this workflow trying to achieve?
 * 2. Trigger inference — what condition starts this workflow?
 * 3. Friction detection — where are the pain points?
 * 4. Role/actor inference — who is performing these actions?
 * 5. Decision point detection — where does the flow branch?
 * 6. Title cleaning — convert raw step titles to operational language
 * 7. Noise suppression — identify system events that should be contextual notes
 * 8. Common issue extraction — patterns of errors or retries
 */

import type {
  CanonicalEventInput,
  DerivedStepInput,
  GroupingReason,
  FrictionIndicator,
  CommonIssue,
  QualityIndicators,
} from './types.js';
import { toGroupingReason, uniqueSystems } from './stepAnalyzer.js';

// ─── Business objective inference ────────────────────────────────────────────

/**
 * Infers a business objective from the activity name and observed step patterns.
 * Uses the action sequence to determine what the workflow accomplishes.
 */
export function inferBusinessObjective(
  activityName: string,
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
): string {
  const systems = uniqueSystems(events);
  const systemLabel = systems.length > 0 ? systems.join(' and ') : 'the system';

  const hasFormSubmit = steps.some(s => s.grouping_reason === 'fill_and_submit');
  const hasSendAction = steps.some(s => s.grouping_reason === 'send_action');
  const hasFileAction = steps.some(s => s.grouping_reason === 'file_action');
  const hasDataEntry = steps.some(s => s.grouping_reason === 'data_entry');
  const navCount = steps.filter(s => s.grouping_reason === 'click_then_navigate').length;

  // Infer from observed patterns
  if (hasFormSubmit && hasSendAction) {
    return `Complete and submit a ${cleanActivityName(activityName)} transaction in ${systemLabel}`;
  }
  if (hasFormSubmit) {
    return `Enter and submit ${cleanActivityName(activityName)} data in ${systemLabel}`;
  }
  if (hasSendAction) {
    return `Execute the ${cleanActivityName(activityName)} action in ${systemLabel}`;
  }
  if (hasFileAction && hasDataEntry) {
    return `Prepare and upload ${cleanActivityName(activityName)} documentation in ${systemLabel}`;
  }
  if (hasFileAction) {
    return `Attach files for ${cleanActivityName(activityName)} in ${systemLabel}`;
  }
  if (hasDataEntry) {
    return `Enter ${cleanActivityName(activityName)} information in ${systemLabel}`;
  }
  if (navCount >= 3) {
    return `Navigate and review ${cleanActivityName(activityName)} in ${systemLabel}`;
  }
  return `Complete the ${cleanActivityName(activityName)} workflow in ${systemLabel}`;
}

// ─── Trigger inference ───────────────────────────────────────────────────────

/**
 * Infers the trigger condition that starts this workflow.
 * Based on the first step's context and the overall workflow pattern.
 */
export function inferTrigger(
  activityName: string,
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
): string {
  if (steps.length === 0) return `When ${cleanActivityName(activityName)} is required`;

  const firstStep = steps[0]!;
  const eventById = new Map(events.map(e => [e.event_id, e]));
  const firstEvents = firstStep.source_event_ids
    .map(id => eventById.get(id))
    .filter((e): e is CanonicalEventInput => e !== undefined);
  const firstPage = firstEvents[0]?.page_context?.pageTitle;
  const firstSystem = firstStep.page_context?.applicationLabel;

  const hasFormSubmit = steps.some(s => s.grouping_reason === 'fill_and_submit');
  const hasSendAction = steps.some(s => s.grouping_reason === 'send_action');

  if (hasFormSubmit || hasSendAction) {
    return firstSystem
      ? `When a new ${cleanActivityName(activityName)} needs to be created or submitted in ${firstSystem}`
      : `When a new ${cleanActivityName(activityName)} needs to be processed`;
  }

  if (firstPage && firstSystem) {
    return `When the operator opens "${firstPage}" in ${firstSystem} to begin ${cleanActivityName(activityName)}`;
  }

  return `When ${cleanActivityName(activityName)} is required`;
}

// ─── Friction detection ──────────────────────────────────────────────────────

/**
 * Detects friction points from observed workflow behavior.
 * Friction = anything that adds effort, confusion, or delay.
 */
export function detectFriction(
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
): FrictionIndicator[] {
  const indicators: FrictionIndicator[] = [];

  // 1. Repeated errors
  const errorSteps = steps.filter(s => s.grouping_reason === 'error_handling');
  if (errorSteps.length > 0) {
    indicators.push({
      type: 'repeated_error',
      label: `${errorSteps.length} error${errorSteps.length > 1 ? 's' : ''} encountered during workflow execution`,
      severity: errorSteps.length >= 3 ? 'high' : errorSteps.length >= 2 ? 'medium' : 'low',
      stepOrdinals: errorSteps.map(s => s.ordinal),
    });
  }

  // 2. Long waits (steps with duration > 30s suggest system latency or user hesitation)
  const longWaitSteps = steps.filter(s => (s.duration_ms ?? 0) > 30_000);
  if (longWaitSteps.length > 0) {
    for (const step of longWaitSteps) {
      const durationSec = Math.round((step.duration_ms ?? 0) / 1000);
      indicators.push({
        type: 'long_wait',
        label: `Step "${step.title}" took ${durationSec}s — possible system delay or user hesitation`,
        severity: durationSec > 120 ? 'high' : durationSec > 60 ? 'medium' : 'low',
        stepOrdinals: [step.ordinal],
      });
    }
  }

  // 3. Excessive navigation (> 4 consecutive click_then_navigate steps)
  let navStreak = 0;
  let navStreakStart = 0;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i]!.grouping_reason === 'click_then_navigate') {
      if (navStreak === 0) navStreakStart = i;
      navStreak++;
    } else {
      if (navStreak >= 4) {
        indicators.push({
          type: 'excessive_navigation',
          label: `${navStreak} consecutive navigation steps — user may need a direct path or shortcut`,
          severity: navStreak >= 6 ? 'high' : 'medium',
          stepOrdinals: steps.slice(navStreakStart, navStreakStart + navStreak).map(s => s.ordinal),
        });
      }
      navStreak = 0;
    }
  }
  if (navStreak >= 4) {
    indicators.push({
      type: 'excessive_navigation',
      label: `${navStreak} consecutive navigation steps — user may need a direct path or shortcut`,
      severity: navStreak >= 6 ? 'high' : 'medium',
      stepOrdinals: steps.slice(navStreakStart, navStreakStart + navStreak).map(s => s.ordinal),
    });
  }

  // 4. Context switching (alternating between systems frequently)
  const systemSwitches = countSystemSwitches(steps);
  if (systemSwitches >= 3) {
    indicators.push({
      type: 'context_switching',
      label: `Workflow switches between applications ${systemSwitches} times — high cognitive load`,
      severity: systemSwitches >= 5 ? 'high' : 'medium',
      stepOrdinals: findSystemSwitchOrdinals(steps),
    });
  }

  // 5. Repeated click dedup steps (user clicking same thing multiple times)
  const repeatedClicks = steps.filter(s => s.grouping_reason === 'repeated_click_dedup');
  if (repeatedClicks.length >= 2) {
    indicators.push({
      type: 'redundant_action',
      label: `${repeatedClicks.length} repeated click patterns detected — possible UI responsiveness issue`,
      severity: 'low',
      stepOrdinals: repeatedClicks.map(s => s.ordinal),
    });
  }

  // 6. Backtracking detection (navigating to a page already visited)
  const backtracking = detectBacktracking(steps, events);
  if (backtracking.length > 0) {
    indicators.push(...backtracking);
  }

  return indicators;
}

function countSystemSwitches(steps: DerivedStepInput[]): number {
  let switches = 0;
  let lastSystem = '';
  for (const step of steps) {
    const system = step.page_context?.applicationLabel ?? '';
    if (system && system !== lastSystem && lastSystem !== '') {
      switches++;
    }
    if (system) lastSystem = system;
  }
  return switches;
}

function findSystemSwitchOrdinals(steps: DerivedStepInput[]): number[] {
  const ordinals: number[] = [];
  let lastSystem = '';
  for (const step of steps) {
    const system = step.page_context?.applicationLabel ?? '';
    if (system && system !== lastSystem && lastSystem !== '') {
      ordinals.push(step.ordinal);
    }
    if (system) lastSystem = system;
  }
  return ordinals;
}

function detectBacktracking(
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
): FrictionIndicator[] {
  const indicators: FrictionIndicator[] = [];
  const visitedPages = new Set<string>();
  const eventById = new Map(events.map(e => [e.event_id, e]));

  for (const step of steps) {
    if (step.grouping_reason !== 'click_then_navigate') continue;
    const stepEvents = step.source_event_ids
      .map(id => eventById.get(id))
      .filter((e): e is CanonicalEventInput => e !== undefined);
    const navEvent = stepEvents.find(e => e.event_type.startsWith('navigation.'));
    const pageKey = navEvent?.page_context?.routeTemplate ?? navEvent?.page_context?.pageTitle;
    if (!pageKey) continue;

    if (visitedPages.has(pageKey)) {
      indicators.push({
        type: 'backtracking',
        label: `Returned to previously visited page "${navEvent?.page_context?.pageTitle ?? pageKey}"`,
        severity: 'medium',
        stepOrdinals: [step.ordinal],
      });
    }
    visitedPages.add(pageKey);
  }
  return indicators;
}

// ─── Decision point detection ────────────────────────────────────────────────

/**
 * Infers decision points from observed behavior patterns.
 * A decision is inferred when:
 * - An error_handling step follows a submit/send step (validation decision)
 * - The flow branches to different pages based on form submission
 */
export function detectDecisionPoints(
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
): Map<string, string> {
  const decisions = new Map<string, string>();

  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i]!;
    const next = steps[i + 1]!;

    // Pattern: submit → error_handling = validation decision
    if (
      (current.grouping_reason === 'fill_and_submit' || current.grouping_reason === 'send_action') &&
      next.grouping_reason === 'error_handling'
    ) {
      decisions.set(current.step_id, 'Was the submission accepted?');
    }

    // Pattern: data_entry → error_handling = validation decision
    if (current.grouping_reason === 'data_entry' && next.grouping_reason === 'error_handling') {
      decisions.set(current.step_id, 'Is the entered data valid?');
    }
  }

  return decisions;
}

// ─── Common issue extraction ─────────────────────────────────────────────────

/**
 * Extracts common issues from error-handling steps and friction patterns.
 */
export function extractCommonIssues(
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
): CommonIssue[] {
  const issues: CommonIssue[] = [];

  // Error handling steps become common issues
  const eventById = new Map(events.map(e => [e.event_id, e]));
  const errorSteps = steps.filter(s => s.grouping_reason === 'error_handling');
  for (const step of errorSteps) {
    const stepEvents = step.source_event_ids
      .map(id => eventById.get(id))
      .filter((e): e is CanonicalEventInput => e !== undefined);
    const errorEvent = stepEvents.find(e => e.event_type === 'system.error_displayed');
    const precedingStep = steps.find(s => s.ordinal === step.ordinal - 1);

    issues.push({
      title: errorEvent
        ? 'System error during workflow'
        : 'Exception state encountered',
      description: precedingStep
        ? `An error occurred after "${precedingStep.title}". The operator resolved it and continued the workflow.`
        : 'An error state was encountered and resolved during the workflow.',
      stepOrdinals: [step.ordinal],
    });
  }

  return issues;
}

// ─── Role inference ──────────────────────────────────────────────────────────

/**
 * Infers the primary role/actor from the workflow pattern.
 * Uses the systems accessed and action patterns to determine who is performing this.
 */
export function inferRoles(
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
): string[] {
  const systems = uniqueSystems(events);

  // All steps are human-initiated in a recorded session
  const roles = new Set<string>();
  roles.add('Operator');

  // If the workflow spans multiple systems, the actor is likely cross-functional
  if (systems.length > 2) {
    roles.delete('Operator');
    roles.add('Cross-functional operator');
  }

  // If there are file uploads, they may be a document preparer
  if (steps.some(s => s.grouping_reason === 'file_action')) {
    roles.add('Document preparer');
  }

  return [...roles];
}

// ─── Title cleaning ──────────────────────────────────────────────────────────

/**
 * Cleans an activity name for use in generated prose.
 * Strips common prefixes/suffixes and normalizes casing.
 */
export function cleanActivityName(name: string): string {
  let cleaned = name.trim();
  // Remove common leading articles and filler
  cleaned = cleaned.replace(/^(the|a|an)\s+/i, '');
  // Lowercase the first word if it's not an acronym
  if (cleaned.length > 0 && cleaned[0] === cleaned[0]!.toUpperCase()) {
    const firstWord = cleaned.split(/\s/)[0]!;
    if (firstWord !== firstWord.toUpperCase()) {
      cleaned = cleaned[0]!.toLowerCase() + cleaned.slice(1);
    }
  }
  return cleaned;
}

/**
 * Converts a raw step title into clean SOP instruction language.
 * Ensures imperative voice, removes noise words, makes titles business-focused.
 */
export function cleanStepTitle(title: string, groupingReason: GroupingReason): string {
  let cleaned = title.trim();

  // Already clean imperative form
  if (/^(Navigate|Enter|Click|Submit|Select|Upload|Download|Attach|Verify|Review|Open|Save|Send|Complete|Fill)/.test(cleaned)) {
    return cleaned;
  }

  // Add imperative verb based on category
  switch (groupingReason) {
    case 'click_then_navigate':
      if (!cleaned.toLowerCase().startsWith('navigate')) {
        cleaned = `Navigate to ${cleaned}`;
      }
      break;
    case 'fill_and_submit':
      if (!cleaned.toLowerCase().startsWith('fill') && !cleaned.toLowerCase().startsWith('complete')) {
        cleaned = `Complete ${cleaned}`;
      }
      break;
    case 'data_entry':
      if (!cleaned.toLowerCase().startsWith('enter')) {
        cleaned = `Enter ${cleaned}`;
      }
      break;
    case 'send_action':
      if (!cleaned.toLowerCase().startsWith('send') && !cleaned.toLowerCase().startsWith('submit')) {
        cleaned = `Submit ${cleaned}`;
      }
      break;
    case 'file_action':
      if (!cleaned.toLowerCase().startsWith('upload') && !cleaned.toLowerCase().startsWith('attach')) {
        cleaned = `Attach ${cleaned}`;
      }
      break;
    case 'error_handling':
      if (!cleaned.toLowerCase().startsWith('resolve')) {
        cleaned = `Resolve ${cleaned}`;
      }
      break;
  }

  return cleaned;
}

// ─── Noise classification ────────────────────────────────────────────────────

/**
 * Classifies whether an event should be a full SOP instruction or a contextual note.
 * System events like loading indicators and visibility changes are noise in
 * an SOP context — they should be noted but not elevated to full instructions.
 */
export function classifyInstructionType(
  eventType: string,
): 'action' | 'wait' | 'verify' | 'note' | null {
  // Full action instructions
  if (eventType.startsWith('interaction.')) return 'action';

  // Wait instructions (system processing)
  if (eventType === 'navigation.open_page') return 'wait';
  if (eventType === 'system.loading_started') return 'wait';
  if (eventType === 'system.loading_finished') return null; // suppress — loading_started covers it

  // Verify instructions (confirmation checks)
  if (eventType === 'system.toast_shown') return 'verify';
  if (eventType === 'system.error_displayed') return 'verify';
  if (eventType === 'system.status_changed') return 'verify';

  // Contextual notes (not actionable but worth noting)
  if (eventType === 'navigation.route_change') return 'note';
  if (eventType === 'navigation.tab_activated') return 'action';
  if (eventType === 'navigation.app_context_changed') return 'note';
  if (eventType === 'system.modal_opened') return 'note';
  if (eventType === 'system.modal_closed') return 'note';
  if (eventType === 'session.annotation_added') return 'note';

  // Excluded (null = skip entirely)
  return null;
}

// ─── Quality indicators ──────────────────────────────────────────────────────

/**
 * Computes aggregate quality indicators for the process.
 */
export function computeQualityIndicators(
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
  friction: FrictionIndicator[],
): QualityIndicators {
  const confidences = steps.map(s => s.confidence);
  const averageConfidence = confidences.length > 0
    ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100) / 100
    : 0;

  const lastStep = steps[steps.length - 1];
  const isComplete = lastStep !== undefined && lastStep.status === 'finalized';

  return {
    averageConfidence,
    lowConfidenceStepCount: steps.filter(s => s.confidence < 0.7).length,
    errorStepCount: steps.filter(s => s.grouping_reason === 'error_handling').length,
    systemCount: uniqueSystems(events).length,
    frictionCount: friction.length,
    isComplete,
  };
}

// ─── Purpose generation ──────────────────────────────────────────────────────

/**
 * Generates a specific, non-boilerplate purpose statement for the SOP.
 */
export function generatePurpose(
  activityName: string,
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
): string {
  const systems = uniqueSystems(events);
  const systemLabel = systems.length > 0 ? systems.join(' and ') : 'the target system';
  const stepCount = steps.length;

  const hasFormSubmit = steps.some(s => s.grouping_reason === 'fill_and_submit');
  const hasSendAction = steps.some(s => s.grouping_reason === 'send_action');
  const hasFileAction = steps.some(s => s.grouping_reason === 'file_action');

  const actionParts: string[] = [];
  if (hasFormSubmit) actionParts.push('completing required forms');
  if (hasFileAction) actionParts.push('attaching documentation');
  if (hasSendAction) actionParts.push('submitting for processing');

  const actionSuffix = actionParts.length > 0
    ? `, including ${actionParts.join(', ')}`
    : '';

  return (
    `This procedure guides the operator through the ${stepCount}-step process ` +
    `for ${cleanActivityName(activityName)} in ${systemLabel}${actionSuffix}. ` +
    `All steps are derived from observed workflow behavior and linked to source evidence.`
  );
}

/**
 * Generates a specific scope statement.
 */
export function generateScope(
  activityName: string,
  systems: string[],
  roles: string[],
): string {
  const parts: string[] = [];

  if (roles.length > 0) {
    parts.push(`Performed by: ${roles.join(', ')}`);
  }
  if (systems.length > 0) {
    parts.push(`Systems: ${systems.join(', ')}`);
  }
  parts.push(`Covers the complete ${cleanActivityName(activityName)} workflow from initiation to completion`);

  return parts.join('. ') + '.';
}

/**
 * Generates specific, workflow-derived prerequisites.
 */
export function generatePrerequisites(
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
  systems: string[],
): string[] {
  const prereqs: string[] = [];

  // System-specific access requirements
  for (const system of systems) {
    prereqs.push(`Active, authenticated session in ${system}`);
  }

  // Data entry prerequisites — what data does the user need?
  const dataEntrySteps = steps.filter(
    s => s.grouping_reason === 'fill_and_submit' || s.grouping_reason === 'data_entry',
  );
  if (dataEntrySteps.length > 0) {
    const eventById = new Map(events.map(e => [e.event_id, e]));
    const fields = new Set<string>();
    for (const step of dataEntrySteps) {
      const stepEvents = step.source_event_ids
        .map(id => eventById.get(id))
        .filter((e): e is CanonicalEventInput => e !== undefined);
      for (const evt of stepEvents) {
        if (evt.event_type === 'interaction.input_change' && evt.target_summary?.label) {
          fields.add(evt.target_summary.label);
        }
      }
    }
    if (fields.size > 0) {
      const fieldList = [...fields].slice(0, 5);
      prereqs.push(`Required data available: ${fieldList.join(', ')}`);
    }
  }

  // File prerequisites
  if (steps.some(s => s.grouping_reason === 'file_action')) {
    prereqs.push('Required file(s) prepared and accessible for upload');
  }

  return prereqs;
}

/**
 * Generates outcome-based completion criteria rather than mechanical counts.
 */
export function generateCompletionCriteria(
  activityName: string,
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
): string[] {
  const criteria: string[] = [];

  // Find the last meaningful step (not error handling)
  const meaningfulSteps = steps.filter(s => s.grouping_reason !== 'error_handling');
  const lastStep = meaningfulSteps[meaningfulSteps.length - 1];

  // Outcome-based criteria from last step type
  if (lastStep) {
    const grouping = toGroupingReason(lastStep.grouping_reason);
    switch (grouping) {
      case 'fill_and_submit':
      case 'send_action':
        criteria.push('System confirms successful submission (confirmation message, status update, or redirect)');
        break;
      case 'click_then_navigate': {
        const eventById = new Map(events.map(e => [e.event_id, e]));
        const lastEvents = lastStep.source_event_ids
          .map(id => eventById.get(id))
          .filter((e): e is CanonicalEventInput => e !== undefined);
        const lastPage = lastEvents.find(e => e.event_type.startsWith('navigation.'))?.page_context?.pageTitle;
        criteria.push(lastPage
          ? `Operator arrives at "${lastPage}" confirming workflow completion`
          : 'Final destination page loads successfully');
        break;
      }
      default:
        criteria.push(`The ${cleanActivityName(activityName)} record reflects the completed state`);
    }
  }

  // Error resolution criteria if errors were encountered
  if (steps.some(s => s.grouping_reason === 'error_handling')) {
    criteria.push('All encountered errors have been resolved before proceeding');
  }

  // General completion
  criteria.push(`All procedure steps executed and verified in ${uniqueSystems(events).join(', ') || 'the target system'}`);

  return criteria;
}

/**
 * Generates operational notes specific to this workflow, not boilerplate.
 */
export function generateNotes(
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
  friction: FrictionIndicator[],
): string[] {
  const notes: string[] = [];
  const systems = uniqueSystems(events);

  // Multi-system note
  if (systems.length > 1) {
    notes.push(
      `This workflow spans ${systems.length} systems (${systems.join(', ')}). ` +
      `Ensure access to all systems before starting.`,
    );
  }

  // Friction-based notes
  const highFriction = friction.filter(f => f.severity === 'high');
  if (highFriction.length > 0) {
    notes.push(
      `${highFriction.length} high-severity friction point${highFriction.length > 1 ? 's were' : ' was'} ` +
      `detected. Review the friction summary for improvement opportunities.`,
    );
  }

  // Sensitive data note
  const hasSensitive = events.some(e => e.target_summary?.isSensitive === true);
  if (hasSensitive) {
    notes.push('This workflow involves sensitive data fields. Handle values according to data classification policy.');
  }

  // Source attribution
  notes.push('This procedure was derived from observed browser workflow activity. All instructions link to source evidence.');

  return notes;
}

// ─── Enriched phase labels ───────────────────────────────────────────────────

/**
 * Generates meaningful phase labels instead of just "{System} Workflow".
 * Analyzes the steps within a phase to determine its business purpose.
 */
export function enrichPhaseLabel(
  systemLabel: string,
  phaseSteps: Array<{ grouping_reason: string }>,
): string {
  if (phaseSteps.length === 0) return systemLabel;

  const groupings = phaseSteps.map(s => s.grouping_reason);
  const hasFormSubmit = groupings.includes('fill_and_submit');
  const hasDataEntry = groupings.includes('data_entry');
  const hasSendAction = groupings.includes('send_action');
  const hasNavigation = groupings.includes('click_then_navigate');
  const hasFileAction = groupings.includes('file_action');

  // Determine phase purpose
  if (hasFormSubmit && hasSendAction) return `${systemLabel} — Data Entry & Submission`;
  if (hasFormSubmit) return `${systemLabel} — Form Completion`;
  if (hasDataEntry && hasSendAction) return `${systemLabel} — Data Entry & Confirmation`;
  if (hasDataEntry) return `${systemLabel} — Data Entry`;
  if (hasSendAction) return `${systemLabel} — Action Execution`;
  if (hasFileAction) return `${systemLabel} — Document Management`;
  if (hasNavigation && phaseSteps.length > 2) return `${systemLabel} — Navigation & Review`;
  if (hasNavigation) return `${systemLabel} — Navigation`;
  return systemLabel;
}
