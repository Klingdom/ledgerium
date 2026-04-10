/**
 * SOP builder — generates a structured Standard Operating Procedure from
 * a recorded session bundle.
 *
 * Canonical SOP model v2.0: execution-first, evidence-backed, personalized.
 *
 * Design principles:
 * - Every section is specific to THIS workflow, not generic boilerplate
 * - Instructions are imperative, concise, and operator-directed
 * - Noise is suppressed: system events become contextual notes, not full instructions
 * - Friction points are surfaced as actionable observations
 * - Decision points are identified and labeled
 * - All content traces back to observed evidence
 *
 * SOP section order:
 * 1. Title (clean, without redundant "SOP:" prefix)
 * 2. Purpose (specific to the observed workflow)
 * 3. Trigger / when to use
 * 4. Scope (roles, systems, coverage)
 * 5. Prerequisites (derived from observed data needs)
 * 6. Procedure steps (the core — structured, categorized)
 * 7. Completion criteria (outcome-based)
 * 8. Common issues (from error patterns)
 * 9. Notes (operational, not meta-commentary)
 *
 * Step structure:
 * - Ordinal, title (imperative voice), system, action summary
 * - Sub-instructions (from events, noise-suppressed)
 * - Expected outcome, cautions, duration, confidence
 * - Friction indicators, decision point labels
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
import {
  inferBusinessObjective,
  inferTrigger,
  detectFriction,
  detectDecisionPoints,
  extractCommonIssues,
  inferRoles,
  cleanStepTitle,
  classifyInstructionType,
  computeQualityIndicators,
  generatePurpose,
  generateScope,
  generatePrerequisites,
  generateCompletionCriteria,
  generateNotes,
} from './contentEnricher.js';

// ─── Public builder ───────────────────────────────────────────────────────────

export function buildSOP(input: ProcessEngineInput): SOP {
  const { sessionJson, normalizedEvents, derivedSteps } = input;

  const eventById = new Map<string, CanonicalEventInput>(
    normalizedEvents.map(e => [e.event_id, e]),
  );

  const finalizedSteps = derivedSteps.filter(s => s.status === 'finalized');

  const allSystems = uniqueSystems(normalizedEvents);
  const allDomains = uniqueDomains(normalizedEvents);

  // ── Enrichment layer ────────────────────────────────────────────────────
  const friction = detectFriction(finalizedSteps, normalizedEvents);
  const decisionPoints = detectDecisionPoints(finalizedSteps, normalizedEvents);
  const commonIssues = extractCommonIssues(finalizedSteps, normalizedEvents);
  const roles = inferRoles(finalizedSteps, normalizedEvents);
  const businessObjective = inferBusinessObjective(
    sessionJson.activityName, finalizedSteps, normalizedEvents,
  );
  const qualityIndicators = computeQualityIndicators(
    finalizedSteps, normalizedEvents, friction,
  );

  // ── Build steps ─────────────────────────────────────────────────────────
  const steps: SOPStep[] = finalizedSteps.map(step => {
    const events = step.source_event_ids
      .map(id => eventById.get(id))
      .filter((e): e is CanonicalEventInput => e !== undefined);

    const definition = analyzeStep(step, events);
    const groupingReason = toGroupingReason(step.grouping_reason);
    const primarySystem = definition.systems[0];

    // Clean step title to imperative voice (pass events for field-level context)
    const cleanedTitle = cleanStepTitle(step.title, groupingReason, events);

    // Step-level action summary — concise, specific
    const action = buildAction(cleanedTitle, groupingReason, events);

    // Event-level instructions with noise suppression
    const instructions = buildInstructions(events, groupingReason);

    // Format instructions as readable detail text
    const detail = formatDetail(instructions);

    // Warnings from sensitive events
    const warnings: string[] = [];
    if (definition.hasSensitiveEvents) {
      warnings.push(
        'Contains sensitive data fields — do not expose values in screenshots or shared recordings.',
      );
    }

    // Step-level friction from the global friction analysis
    const stepFriction = friction.filter(f => f.stepOrdinals.includes(step.ordinal));

    // Decision point detection
    const isDecisionPoint = decisionPoints.has(step.step_id);
    const decisionLabel = decisionPoints.get(step.step_id);

    return {
      ordinal: step.ordinal,
      stepId: step.step_id,
      title: cleanedTitle,
      category: groupingReason,
      action,
      instructions,
      detail,
      ...(primarySystem !== undefined && { system: primarySystem }),
      inputs: definition.inputs,
      expectedOutcome: buildExpectedOutcome(definition.completionCondition, groupingReason, events),
      warnings,
      durationLabel: definition.durationLabel,
      confidence: definition.confidence,
      sourceStepId: step.step_id,
      ...(roles[0] !== undefined && { actor: roles[0] }),
      ...(stepFriction.length > 0 && { frictionIndicators: stepFriction }),
      ...(isDecisionPoint && { isDecisionPoint: true }),
      ...(decisionLabel !== undefined && { decisionLabel }),
    };
  });

  const totalDurationMs = derivedSteps.reduce(
    (sum, s) => sum + (s.duration_ms ?? 0),
    0,
  );

  return {
    sopId: `${sessionJson.sessionId}-sop`,
    title: sessionJson.activityName,
    version: '2.0',
    purpose: generatePurpose(sessionJson.activityName, finalizedSteps, normalizedEvents),
    scope: generateScope(sessionJson.activityName, allSystems, roles),
    systems: allSystems,
    prerequisites: generatePrerequisites(finalizedSteps, normalizedEvents, allSystems),
    estimatedTime: formatDuration(totalDurationMs) || 'Varies',
    inputs: buildSOPInputs(steps, allSystems),
    outputs: buildSOPOutputs(steps, sessionJson.activityName),
    completionCriteria: generateCompletionCriteria(
      sessionJson.activityName, finalizedSteps, normalizedEvents,
    ),
    steps,
    notes: generateNotes(finalizedSteps, normalizedEvents, friction),
    generatedAt: sessionJson.startedAt,
    // New canonical fields
    trigger: inferTrigger(sessionJson.activityName, finalizedSteps, normalizedEvents),
    roles,
    ...(commonIssues.length > 0 && { commonIssues }),
    ...(friction.length > 0 && { frictionSummary: friction }),
    businessObjective,
    qualityIndicators,
  };
}

// ─── Event-level instruction builder ─────────────────────────────────────────

/**
 * Converts a step's events into an ordered list of SOPInstructions.
 *
 * v2.0 rules:
 * 1. Non-actionable events are excluded (focus, visibility, recorder internals)
 * 2. input_change events are deduplicated per target field (last write wins)
 * 3. System events are classified as 'wait', 'verify', or 'note' (noise suppression)
 * 4. Adjacent loading_started + loading_finished are collapsed
 * 5. Sequence numbers are assigned in event occurrence order (1-based)
 */
function buildInstructions(
  events: CanonicalEventInput[],
  groupingReason: GroupingReason,
): SOPInstruction[] {
  const deduplicatedEvents = deduplicateInputChanges(events);
  const instructions: SOPInstruction[] = [];
  let seq = 0;

  for (const evt of deduplicatedEvents) {
    const instructionType = classifyInstructionType(evt.event_type);
    if (instructionType === null) continue;

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
      instructionType,
    });
  }

  return instructions;
}

/**
 * Derives a human-readable imperative instruction from one canonical event.
 *
 * v2.0 improvements:
 * - Concise language (no verbose clauses)
 * - Business-focused wording over technical descriptions
 * - System feedback events as brief context, not verbose paragraphs
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
      // Never output raw HTML element types (div, span, svg, use, p, etc.)
      // Use semantic role only for meaningful ARIA roles
      const SEMANTIC_ROLES = new Set(['button', 'link', 'tab', 'menuitem', 'option', 'checkbox', 'radio', 'switch', 'combobox', 'listbox', 'textbox']);
      if (role && SEMANTIC_ROLES.has(role)) return `Click the ${role}`;
      // Fallback: use page/section context instead of meaningless element type
      const pageLabel = page?.pageTitle ?? page?.applicationLabel;
      if (pageLabel) return `Click the target element on "${pageLabel}"`;
      // Last resort — at least include the application name if available
      if (page?.applicationLabel) return `Click the target element in ${page.applicationLabel}`;
      return 'Click the target element';
    }

    case 'interaction.input_change': {
      if (label && (isSensitive || redacted)) {
        return `Enter value in "${label}" (sensitive — do not share or display in plain text)`;
      }
      if (label) return `Enter value in "${label}"`;
      // Don't use raw element types as field names
      const INPUT_ROLES = new Set(['textbox', 'combobox', 'spinbutton', 'searchbox', 'input']);
      if (role && INPUT_ROLES.has(role)) return `Enter value in the ${role} field`;
      const fieldPage = page?.pageTitle ?? page?.applicationLabel;
      if (fieldPage) return `Enter the required value on "${fieldPage}"`;
      if (page?.applicationLabel) return `Enter the required value in ${page.applicationLabel}`;
      return 'Enter the required value';
    }

    case 'interaction.submit': {
      if (label) return `Submit via "${label}"`;
      if (role) return `Submit using the ${role}`;
      const formPage = page?.pageTitle ?? page?.applicationLabel;
      if (formPage) return `Submit the form on "${formPage}"`;
      return 'Submit the form';
    }

    case 'interaction.select': {
      if (label) return `Select option in "${label}"`;
      if (role) return `Select from the ${role}`;
      return 'Select the required option';
    }

    case 'interaction.keyboard_shortcut':
      return 'Use keyboard shortcut';

    case 'interaction.upload_file': {
      if (label) return `Upload file via "${label}"`;
      return 'Upload the required file';
    }

    case 'interaction.download_file': {
      if (label) return `Download via "${label}"`;
      return 'Download the file';
    }

    case 'interaction.drag_started': {
      if (label) return `Drag "${label}" to target`;
      return 'Drag element to target';
    }

    case 'interaction.drag_completed': {
      if (label) return `Drop "${label}" at target`;
      return 'Release at target location';
    }

    // ── Navigation events ───────────────────────────────────────────────────

    case 'navigation.open_page': {
      const dest = enrichedPageLabel(page);
      if (dest) return `Wait for "${dest}" to load`;
      return 'Wait for page to load';
    }

    case 'navigation.route_change': {
      const dest = enrichedPageLabel(page);
      if (dest) return `Page navigates to "${dest}"`;
      return 'Page route updates';
    }

    case 'navigation.tab_activated': {
      const dest = enrichedPageLabel(page);
      if (dest) return `Switch to "${dest}" tab`;
      return 'Switch browser tab';
    }

    case 'navigation.app_context_changed': {
      if (page?.applicationLabel) return `Context switches to ${page.applicationLabel}`;
      return 'Application context changes';
    }

    // ── System feedback events (concise) ────────────────────────────────────

    case 'system.modal_opened':
      return 'Dialog opens — complete required action before continuing';

    case 'system.modal_closed':
      return 'Dialog closes — continue with next step';

    case 'system.toast_shown':
      return 'Verify confirmation message appears';

    case 'system.error_displayed':
      return 'Error displayed — review and correct before continuing';

    case 'system.status_changed':
      return 'Verify status update is as expected';

    case 'system.loading_started':
      return 'Wait for system to finish processing';

    case 'system.loading_finished':
      return null; // Suppressed — loading_started covers it

    case 'system.redaction_applied':
      return 'Enter sensitive value (redacted per privacy policy)';

    // ── Annotation events ───────────────────────────────────────────────────

    case 'session.annotation_added': {
      const text = evt.annotation_text;
      if (text) return `Note: ${text}`;
      return null;
    }

    // ── Excluded events ─────────────────────────────────────────────────────

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
 * Formats instructions into readable detail text.
 *
 * Preserves chronological event order (critical for SOPs) while using
 * type-appropriate prefixes for scannability:
 * - action/wait: numbered (1. 2. 3.)
 * - verify: ✓ prefix
 * - note: → prefix
 */
function formatDetail(instructions: SOPInstruction[]): string {
  if (instructions.length === 0) {
    return 'System-initiated step — no operator action required.';
  }

  let actionNum = 0;
  const lines: string[] = [];

  for (const inst of instructions) {
    const sensitiveNote = inst.isSensitive && !inst.instruction.includes('sensitive')
      ? ' [sensitive]'
      : '';

    switch (inst.instructionType) {
      case 'action':
      case 'wait':
        actionNum++;
        lines.push(`${actionNum}. ${inst.instruction}${sensitiveNote}`);
        break;
      case 'verify':
        lines.push(`\u2713 ${inst.instruction}`);
        break;
      case 'note':
        lines.push(`\u2192 ${inst.instruction}`);
        break;
      default:
        actionNum++;
        lines.push(`${actionNum}. ${inst.instruction}${sensitiveNote}`);
    }
  }

  return lines.join('\n');
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Deduplicates input_change events by target field label.
 * Ordering preserved: deduplicated events appear at the position of the LAST edit.
 */
function deduplicateInputChanges(events: CanonicalEventInput[]): CanonicalEventInput[] {
  const lastIndexByField = new Map<string, number>();

  for (let i = 0; i < events.length; i++) {
    const evt = events[i]!;
    if (evt.event_type !== 'interaction.input_change') continue;
    const label = evt.target_summary?.label;
    if (label === undefined) continue;
    lastIndexByField.set(label, i);
  }

  return events.filter((evt, i) => {
    if (evt.event_type !== 'interaction.input_change') return true;
    const label = evt.target_summary?.label;
    if (label === undefined) return true;
    return lastIndexByField.get(label) === i;
  });
}

// ─── Privacy-safe label extraction ───────────────────────────────────────────

/**
 * Page titles too generic to be useful as destinations in SOP instructions.
 * When we encounter these, we enrich with route template or application label.
 */
const GENERIC_PAGE_TITLES = new Set([
  'home', 'dashboard', 'main', 'index', 'welcome', 'loading',
  'untitled', 'new tab', 'about:blank',
]);

/**
 * Returns a meaningful page label, enriching generic titles with route/app context.
 * "Dashboard" → "/invoices/new (NetSuite)" or "NetSuite" instead.
 */
function enrichedPageLabel(page: CanonicalEventInput['page_context']): string | undefined {
  if (!page) return undefined;
  const title = page.pageTitle;
  const isGeneric = !title || GENERIC_PAGE_TITLES.has(title.toLowerCase().trim());

  if (!isGeneric && title) return title;

  // Title is generic or empty — build from route + app
  const route = page.routeTemplate;
  const app = page.applicationLabel;
  if (route && app) return `${route} (${app})`;
  if (app) return app;
  if (route) return route;
  // Last resort: return the generic title rather than nothing
  return title || undefined;
}

/** Raw HTML element types that should not appear as labels in SOP output. */
const SOP_RAW_ELEMENTS = new Set([
  'div', 'span', 'svg', 'use', 'p', 'li', 'ul', 'section', 'article',
  'main', 'header', 'footer', 'nav', 'form', 'fieldset', 'figure', 'img',
]);

function safeTargetLabel(evt: CanonicalEventInput): string | undefined {
  const label = evt.target_summary?.label;
  if (label && label.trim()) return label;
  const role = evt.target_summary?.role;
  if (role && !SOP_RAW_ELEMENTS.has(role)) return role;
  return undefined;
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
      const navEvent = events.find(e => e.event_type.startsWith('navigation.'));
      const dest = navEvent ? enrichedPageLabel(navEvent.page_context) : undefined;
      return dest ? `Navigate to "${dest}"` : title;
    }
    case 'fill_and_submit': {
      const fsFields = events
        .filter(e => e.event_type === 'interaction.input_change' && safeTargetLabel(e))
        .map(e => safeTargetLabel(e) as string)
        .filter((l, i, arr) => arr.indexOf(l) === i)
        .slice(0, 5);
      const system = first?.page_context?.applicationLabel;
      if (fsFields.length > 0) {
        return system
          ? `Complete ${fsFields.join(', ')} and submit in ${system}`
          : `Complete ${fsFields.join(', ')} and submit`;
      }
      const formName =
        (events.find(e => e.event_type === 'interaction.submit') !== undefined
          ? safeTargetLabel(events.find(e => e.event_type === 'interaction.submit')!)
          : undefined) ??
        first?.page_context?.pageTitle ??
        'form';
      return `Complete and submit "${formName}"`;
    }
    case 'data_entry': {
      const deFields = events
        .filter(e => e.event_type === 'interaction.input_change' && safeTargetLabel(e))
        .map(e => safeTargetLabel(e) as string)
        .filter((l, i, arr) => arr.indexOf(l) === i)
        .slice(0, 5);
      return deFields.length > 0
        ? `Enter ${deFields.join(', ')}`
        : title;
    }
    case 'send_action': {
      const actionEvt = events.find(e =>
        e.event_type === 'interaction.click' && safeTargetLabel(e));
      const actionLbl = actionEvt !== undefined ? safeTargetLabel(actionEvt) : undefined;
      return actionLbl ? `Click "${actionLbl}"` : title;
    }
    case 'file_action':
      return 'Upload or attach the required file';
    case 'error_handling':
      return 'Resolve the error and continue';
    case 'annotation': {
      const text = events.find(e => e.event_type === 'session.annotation_added')?.annotation_text;
      return text ? `Note: ${text}` : title;
    }
    default:
      return title;
  }
}

// ─── Expected outcome builder ────────────────────────────────────────────────

function buildExpectedOutcome(
  completionCondition: string,
  groupingReason: GroupingReason,
  events: CanonicalEventInput[],
): string {
  const system = events[0]?.page_context?.applicationLabel;
  const systemLabel = system ?? 'the system';

  switch (groupingReason) {
    case 'fill_and_submit': {
      const pageTitle = events.find(e => e.event_type === 'interaction.submit')
        ?.page_context?.pageTitle;
      return pageTitle
        ? `Confirmation message appears and record is saved in ${systemLabel} ("${pageTitle}")`
        : `Confirmation message appears and record is saved in ${systemLabel}`;
    }
    case 'click_then_navigate': {
      const navEvt = events.find(e => e.event_type.startsWith('navigation.'));
      const dest = navEvt ? enrichedPageLabel(navEvt.page_context) : undefined;
      return dest
        ? `"${dest}" loads with expected content`
        : 'Target page loads with expected content';
    }
    case 'send_action': {
      const actionLabel = events.find(e => e.event_type === 'interaction.click')
        ?.target_summary?.label;
      return actionLabel
        ? `${systemLabel} confirms the "${actionLabel}" action was successful`
        : `${systemLabel} confirms the action was successful`;
    }
    default:
      return completionCondition;
  }
}

// ─── SOP-level field builders ─────────────────────────────────────────────────

function buildSOPInputs(steps: SOPStep[], systems: string[]): string[] {
  const seen = new Set<string>();
  const inputs: string[] = [];

  if (systems.length > 0) {
    const systemAccess = `Access to: ${systems.join(', ')}`;
    seen.add(systemAccess);
    inputs.push(systemAccess);
  }

  for (const step of steps) {
    if (step.category !== 'fill_and_submit' && step.category !== 'data_entry') continue;
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

function buildSOPOutputs(steps: SOPStep[], activityName: string): string[] {
  const outputs: string[] = [
    `"${activityName}" workflow completed`,
  ];

  const submits = steps.filter(s => s.category === 'fill_and_submit' || s.category === 'send_action');
  if (submits.length > 0) {
    outputs.push('Data submitted and recorded in system');
    const last = submits[submits.length - 1]!;
    if (last.expectedOutcome) {
      outputs.push(last.expectedOutcome);
    }
  }

  const fileSteps = steps.filter(s => s.category === 'file_action');
  if (fileSteps.length > 0) {
    outputs.push('File(s) attached or uploaded successfully');
  }

  return [...new Set(outputs)].slice(0, 6);
}
