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

// ─── Shared helper: extract field names from events ─────────────────────────

/**
 * Extracts human-readable field names from input_change events within the
 * given event set. Returns deduplicated labels in observed order, capped at
 * `limit` entries.
 */
function extractFieldNames(
  events: CanonicalEventInput[],
  limit = 6,
): string[] {
  const fields: string[] = [];
  const seen = new Set<string>();
  for (const evt of events) {
    if (evt.event_type === 'interaction.input_change' && evt.target_summary?.label) {
      const label = evt.target_summary.label.trim();
      if (label && !seen.has(label.toLowerCase())) {
        seen.add(label.toLowerCase());
        fields.push(label);
      }
    }
  }
  return fields.slice(0, limit);
}

/**
 * Resolves events for a step from the event map.
 */
function resolveStepEvents(
  step: DerivedStepInput,
  eventById: Map<string, CanonicalEventInput>,
): CanonicalEventInput[] {
  return step.source_event_ids
    .map(id => eventById.get(id))
    .filter((e): e is CanonicalEventInput => e !== undefined);
}

/**
 * Extracts the primary business entity from field names, page titles, and
 * route templates. Returns a lowercase entity noun (e.g. "invoice",
 * "customer", "employee") or null if nothing can be inferred.
 */
function inferEntityFromContext(
  events: CanonicalEventInput[],
  steps: DerivedStepInput[],
): string | null {
  // Common business entity keywords ranked by specificity
  const ENTITY_KEYWORDS: readonly string[] = [
    'invoice', 'purchase order', 'bill', 'payment', 'credit memo',
    'journal entry', 'expense report', 'vendor', 'supplier',
    'customer', 'contact', 'lead', 'opportunity', 'account', 'deal',
    'employee', 'candidate', 'applicant', 'requisition', 'timesheet',
    'ticket', 'case', 'incident', 'request', 'order', 'quote',
    'shipment', 'receipt', 'transfer', 'return', 'adjustment',
    'project', 'task', 'report', 'document', 'email', 'message',
  ];

  // Gather all text signals: page titles, route templates, field names
  const signals: string[] = [];
  for (const evt of events) {
    if (evt.page_context?.pageTitle) signals.push(evt.page_context.pageTitle);
    if (evt.page_context?.routeTemplate) signals.push(evt.page_context.routeTemplate);
    if (evt.target_summary?.label) signals.push(evt.target_summary.label);
  }
  const corpus = signals.join(' ').toLowerCase();

  for (const keyword of ENTITY_KEYWORDS) {
    if (corpus.includes(keyword)) return keyword;
  }
  return null;
}

/**
 * Determines the primary action verb for a workflow based on step patterns.
 * Returns an active-voice phrase like "create and submit", "review and approve".
 */
function inferWorkflowAction(
  steps: DerivedStepInput[],
  activityName: string,
): string {
  const nameLower = activityName.toLowerCase();
  const groupings = new Set(steps.map(s => s.grouping_reason));

  // Check activity name for semantic verbs first
  if (nameLower.includes('approv')) return 'review and approve';
  if (nameLower.includes('review')) return 'review';
  if (nameLower.includes('creat') || nameLower.includes('new')) return 'create';
  if (nameLower.includes('edit') || nameLower.includes('updat') || nameLower.includes('modif')) return 'update';
  if (nameLower.includes('delet') || nameLower.includes('remov')) return 'delete';
  if (nameLower.includes('send') || nameLower.includes('email') || nameLower.includes('compos')) return 'compose and send';
  if (nameLower.includes('upload') || nameLower.includes('import')) return 'upload';
  if (nameLower.includes('download') || nameLower.includes('export')) return 'export';
  if (nameLower.includes('search') || nameLower.includes('lookup') || nameLower.includes('find')) return 'search for';

  // Infer from step patterns
  if (groupings.has('fill_and_submit') && groupings.has('send_action')) return 'complete and submit';
  if (groupings.has('fill_and_submit')) return 'enter and submit';
  if (groupings.has('send_action')) return 'process and submit';
  if (groupings.has('file_action') && groupings.has('data_entry')) return 'prepare and upload';
  if (groupings.has('data_entry')) return 'enter';

  return 'complete';
}

/**
 * Maps known application names to likely business roles.
 * Returns null if the system is not recognized.
 */
const SYSTEM_ROLE_MAP: Record<string, string> = {
  'netsuite':       'Accounts Payable Clerk',
  'quickbooks':     'Bookkeeper',
  'xero':           'Bookkeeper',
  'salesforce':     'Sales Representative',
  'hubspot':        'Sales Representative',
  'zendesk':        'Support Agent',
  'freshdesk':      'Support Agent',
  'intercom':       'Support Agent',
  'workday':        'HR Specialist',
  'bamboohr':       'HR Specialist',
  'adp':            'HR Specialist',
  'servicenow':     'IT Administrator',
  'jira':           'Project Manager',
  'asana':          'Project Manager',
  'monday':         'Project Manager',
  'trello':         'Project Manager',
  'github':         'Developer',
  'gitlab':         'Developer',
  'bitbucket':      'Developer',
  'shopify':        'E-Commerce Operator',
  'stripe':         'Payments Administrator',
  'sap':            'ERP Operator',
  'oracle':         'ERP Operator',
  'gmail':          'Business User',
  'outlook':        'Business User',
  'google sheets':  'Data Analyst',
  'excel':          'Data Analyst',
  'tableau':        'Data Analyst',
  'looker':         'Data Analyst',
  'slack':          'Business User',
  'teams':          'Business User',
  'zoom':           'Business User',
};

/**
 * Looks up a role for a given system label using fuzzy matching against
 * the known system-role map.
 */
function roleForSystem(systemLabel: string): string | null {
  const lower = systemLabel.toLowerCase();
  for (const [key, role] of Object.entries(SYSTEM_ROLE_MAP)) {
    if (lower.includes(key)) return role;
  }
  return null;
}

/**
 * Converts an active-voice action verb to passive voice for trigger phrasing.
 * e.g. "create" → "created", "review and approve" → "reviewed and approved"
 */
function inferPassiveAction(action: string): string {
  const PASSIVE_MAP: Record<string, string> = {
    'create': 'created',
    'review and approve': 'reviewed and approved',
    'review': 'reviewed',
    'update': 'updated',
    'delete': 'deleted',
    'compose and send': 'composed and sent',
    'upload': 'uploaded',
    'export': 'exported',
    'search for': 'located',
    'complete and submit': 'completed and submitted',
    'enter and submit': 'entered and submitted',
    'process and submit': 'processed and submitted',
    'prepare and upload': 'prepared and uploaded',
    'enter': 'entered',
    'complete': 'completed',
  };
  return PASSIVE_MAP[action] ?? `${action}ed`;
}

/**
 * Capitalizes the first letter of a string.
 */
function capitalize(s: string): string {
  return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/**
 * Summarizes field names into a concise phrase.
 * e.g. ["To", "Subject", "Body"] → "To, Subject, and Body"
 */
function summarizeFields(fields: string[], max = 3): string {
  if (fields.length === 0) return '';
  const shown = fields.slice(0, max);
  if (fields.length > max) {
    return `${shown.join(', ')}, and ${fields.length - max} more field${fields.length - max > 1 ? 's' : ''}`;
  }
  if (shown.length === 1) return shown[0]!;
  if (shown.length === 2) return `${shown[0]} and ${shown[1]}`;
  return `${shown.slice(0, -1).join(', ')}, and ${shown[shown.length - 1]}`;
}

// ─── Business objective inference ────────────────────────────────────────────

/**
 * Infers a business objective by analyzing the actual entities, fields, and
 * actions observed in the workflow — not just grouping patterns.
 *
 * Strategy:
 * 1. Extract the business entity from field names, page titles, and routes
 * 2. Determine the primary action verb from activity name and step patterns
 * 3. Summarize key sub-activities (field entry, file upload, submission)
 * 4. Mention specific systems and what role they play
 */
export function inferBusinessObjective(
  activityName: string,
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
): string {
  const systems = uniqueSystems(events);
  const systemLabel = systems.length > 0 ? systems.join(' and ') : 'the system';

  const entity = inferEntityFromContext(events, steps);
  const action = inferWorkflowAction(steps, activityName);
  const fields = extractFieldNames(events, 8);

  // Build sub-activity description from observed step patterns
  const subActivities: string[] = [];
  const groupings = new Set(steps.map(s => s.grouping_reason));

  if (groupings.has('data_entry') && fields.length > 0) {
    subActivities.push(`${summarizeFields(fields, 3)} entry`);
  }
  if (groupings.has('fill_and_submit')) {
    subActivities.push('form completion');
  }
  if (groupings.has('file_action')) {
    subActivities.push('document attachment');
  }
  if (groupings.has('send_action')) {
    subActivities.push('submission for processing');
  }
  if (groupings.has('error_handling')) {
    subActivities.push('error resolution');
  }

  const subActivitySuffix = subActivities.length > 0
    ? `, including ${subActivities.join(', ')}`
    : '';

  // Use entity if discovered, otherwise fall back to cleaned activity name
  const subject = entity ?? cleanActivityName(activityName);

  return `${capitalize(action)} a ${subject} in ${systemLabel}${subActivitySuffix}`;
}

// ─── Trigger inference ───────────────────────────────────────────────────────

/**
 * Infers the trigger condition by analyzing the first step's context,
 * the starting page/system, and the overall workflow action pattern.
 *
 * Strategy:
 * 1. Examine the first page title/route for clue about the trigger context
 *    (queue, inbox, list view, form, dashboard)
 * 2. Use the workflow action verb for specificity
 * 3. Mention the starting system
 */
export function inferTrigger(
  activityName: string,
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
): string {
  if (steps.length === 0) return `When ${cleanActivityName(activityName)} is required`;

  const firstStep = steps[0]!;
  const eventById = new Map(events.map(e => [e.event_id, e]));
  const firstEvents = resolveStepEvents(firstStep, eventById);
  const firstPage = firstEvents[0]?.page_context?.pageTitle ?? '';
  const firstSystem = firstStep.page_context?.applicationLabel ?? '';
  const entity = inferEntityFromContext(events, steps);
  const action = inferWorkflowAction(steps, activityName);
  const subject = entity ?? cleanActivityName(activityName);

  const pageLower = firstPage.toLowerCase();
  const inSystem = firstSystem ? ` in ${firstSystem}` : '';

  // Detect trigger context from the first page
  const isQueue = /queue|inbox|pending|awaiting|to.?do|worklist/i.test(pageLower);
  const isListView = /list|results|search|browse|all\s/i.test(pageLower);
  const isDashboard = /dashboard|home|overview|summary/i.test(pageLower);
  const isNewForm = /new|create|add\s/i.test(pageLower);

  if (isQueue) {
    return `When a ${subject} appears in the queue${inSystem} and needs to be ${inferPassiveAction(action)}`;
  }
  if (isNewForm) {
    return `When a new ${subject} needs to be created${inSystem}`;
  }
  if (isListView) {
    return `When a ${subject} is selected from the list${inSystem} for ${action.replace(/^(review and |create |enter |complete )/, '')}processing`;
  }
  if (isDashboard && firstSystem) {
    return `When the operator navigates from ${firstSystem} dashboard to ${action} a ${subject}`;
  }

  // Fall back to action-specific trigger
  if (action.includes('review') || action.includes('approve')) {
    return `When a ${subject} requires review and approval${inSystem}`;
  }
  if (action.includes('send') || action.includes('compose')) {
    return `When a ${subject} needs to be composed and sent${inSystem}`;
  }
  if (action.includes('update') || action.includes('edit')) {
    return `When a ${subject} needs to be updated${inSystem}`;
  }

  // General fallback with system context
  if (firstPage && firstSystem) {
    return `When the operator opens "${firstPage}" in ${firstSystem} to ${action} a ${subject}`;
  }
  return `When a ${subject} needs to be ${inferPassiveAction(action)}${inSystem}`;
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
 * Infers decision points from observed behavior patterns with context-specific
 * labels derived from the preceding step's title, field names, and system.
 *
 * A decision is inferred when:
 * - An error_handling step follows a submit/send step (validation decision)
 * - The flow branches to different pages based on form submission
 * - An approval or review pattern is detected in step titles
 */
export function detectDecisionPoints(
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
): Map<string, string> {
  const decisions = new Map<string, string>();
  const eventById = new Map(events.map(e => [e.event_id, e]));

  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i]!;
    const next = steps[i + 1]!;
    const system = current.page_context?.applicationLabel ?? '';
    const systemSuffix = system ? ` in ${system}` : '';

    // Pattern: submit → error_handling = validation decision
    if (
      (current.grouping_reason === 'fill_and_submit' || current.grouping_reason === 'send_action') &&
      next.grouping_reason === 'error_handling'
    ) {
      // Extract field names from the submission step for specific label
      const stepEvents = resolveStepEvents(current, eventById);
      const fields = extractFieldNames(stepEvents, 4);
      if (fields.length > 0) {
        decisions.set(
          current.step_id,
          `Do the ${summarizeFields(fields, 2)} values pass validation?${systemSuffix ? ` (Validated${systemSuffix})` : ''}`,
        );
      } else {
        decisions.set(
          current.step_id,
          `Was "${current.title}" accepted?${systemSuffix ? ` (Validated${systemSuffix})` : ''}`,
        );
      }
    }

    // Pattern: data_entry → error_handling = validation decision
    if (current.grouping_reason === 'data_entry' && next.grouping_reason === 'error_handling') {
      const stepEvents = resolveStepEvents(current, eventById);
      const fields = extractFieldNames(stepEvents, 4);
      if (fields.length > 0) {
        decisions.set(
          current.step_id,
          `Is the entered ${summarizeFields(fields, 2)} data valid?${systemSuffix ? ` (Validated${systemSuffix})` : ''}`,
        );
      } else {
        decisions.set(
          current.step_id,
          `Is the data entered in "${current.title}" valid?${systemSuffix ? ` (Validated${systemSuffix})` : ''}`,
        );
      }
    }
  }

  // Pattern: approval/review steps detected by title semantics
  for (const step of steps) {
    if (decisions.has(step.step_id)) continue;
    const titleLower = step.title.toLowerCase();
    if (/\b(approv|reject|deny|decline)\b/.test(titleLower)) {
      const entity = inferEntityFromContext(events, steps);
      const subject = entity ?? 'the record';
      decisions.set(step.step_id, `Should ${subject} be approved or rejected?`);
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
 * Infers business roles from the systems used, action patterns, and
 * workflow semantics.
 *
 * Strategy:
 * 1. Map known systems to specific business roles using SYSTEM_ROLE_MAP
 * 2. Weight by step count — the system with the most steps determines the
 *    primary role
 * 3. Add "Manager" or "Approver" if approval patterns are detected
 * 4. Fall back to "Operator" only when no system-specific role is found
 */
export function inferRoles(
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
): string[] {
  const systems = uniqueSystems(events);
  const roles = new Set<string>();

  // Count steps per system to find the primary one
  const systemStepCounts = new Map<string, number>();
  for (const step of steps) {
    const sys = step.page_context?.applicationLabel;
    if (sys) {
      systemStepCounts.set(sys, (systemStepCounts.get(sys) ?? 0) + 1);
    }
  }

  // Map systems to roles, preferring the system with the most steps
  const sortedSystems = [...systemStepCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sys]) => sys);

  let hasMappedRole = false;
  for (const sys of sortedSystems) {
    const role = roleForSystem(sys);
    if (role) {
      roles.add(role);
      hasMappedRole = true;
    }
  }

  // Also check systems that might not have steps counted (from events only)
  for (const sys of systems) {
    const role = roleForSystem(sys);
    if (role) {
      roles.add(role);
      hasMappedRole = true;
    }
  }

  // Fall back to "Operator" only when no system-specific role is found
  if (!hasMappedRole) {
    roles.add('Operator');
  }

  // Detect approval / management patterns
  const hasApprovalPattern = steps.some(s => {
    const titleLower = s.title.toLowerCase();
    return /\b(approv|reject|deny|escalat|sign.?off)\b/.test(titleLower);
  });
  if (hasApprovalPattern) {
    roles.add('Approver / Manager');
  }

  // If there are file uploads, add document handler role
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
 * Converts a raw step title into clean SOP instruction language with
 * business-meaningful context.
 *
 * Improvements over the basic verb-prepending approach:
 * 1. Strips noise words ("Untitled", generic page names)
 * 2. Extracts business actions from page titles (e.g. "Customer Lookup Results" → "Review customer lookup results")
 * 3. Uses field context from step events when available for data_entry steps
 * 4. Ensures imperative voice appropriate to the action category
 */
export function cleanStepTitle(
  title: string,
  groupingReason: GroupingReason,
  stepEvents?: CanonicalEventInput[],
): string {
  let cleaned = title.trim();

  // Strip noise phrases from titles
  cleaned = cleaned
    .replace(/\bUntitled\s*(spreadsheet|document|page)?\b/gi, '')
    .replace(/\bLoading\.{0,3}\b/gi, '')
    .replace(/^\s*[-–—]\s*/, '')
    .trim();

  // If title became empty after cleaning, try to derive from events or use generic
  if (!cleaned) {
    cleaned = groupingReason === 'data_entry' ? 'data fields'
      : groupingReason === 'click_then_navigate' ? 'next page'
      : 'action';
  }

  // Already clean imperative form — but still apply field enrichment for data_entry
  if (/^(Navigate|Enter|Click|Submit|Select|Upload|Download|Attach|Verify|Review|Open|Save|Send|Complete|Fill)/.test(cleaned)) {
    // For data_entry with "Enter" prefix, try to add field specifics
    if (groupingReason === 'data_entry' && stepEvents && /^Enter\s/.test(cleaned)) {
      const fields = extractFieldNames(stepEvents, 3);
      if (fields.length > 0) {
        return `Enter ${summarizeFields(fields)}`;
      }
    }
    return cleaned;
  }

  // For data_entry, derive title from actual field names when possible
  if (groupingReason === 'data_entry' && stepEvents) {
    const fields = extractFieldNames(stepEvents, 3);
    if (fields.length > 0) {
      return `Enter ${summarizeFields(fields)}`;
    }
  }

  // Add imperative verb based on category
  switch (groupingReason) {
    case 'click_then_navigate': {
      // Try to extract meaningful destination from the title
      const pageMatch = cleaned.match(/(?:to|→|->)\s+(.+)/i);
      const destination = pageMatch ? pageMatch[1]!.trim() : cleaned;
      if (!cleaned.toLowerCase().startsWith('navigate')) {
        cleaned = `Navigate to ${destination}`;
      }
      break;
    }
    case 'fill_and_submit': {
      if (!cleaned.toLowerCase().startsWith('fill') && !cleaned.toLowerCase().startsWith('complete')) {
        // Try to include field context
        if (stepEvents) {
          const fields = extractFieldNames(stepEvents, 3);
          if (fields.length > 0) {
            cleaned = `Complete form with ${summarizeFields(fields)} and submit`;
            break;
          }
        }
        cleaned = `Complete and submit ${cleaned}`;
      }
      break;
    }
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
 * Generates a purpose statement grounded in what the workflow actually achieves,
 * mentioning the specific deliverable (submitted record, sent communication, etc.)
 * rather than boilerplate about step counts and evidence.
 *
 * Strategy:
 * 1. Determine the workflow's deliverable from the last meaningful step
 * 2. Mention specific entity and action
 * 3. List the key phases of work
 */
export function generatePurpose(
  activityName: string,
  steps: DerivedStepInput[],
  events: CanonicalEventInput[],
): string {
  const systems = uniqueSystems(events);
  const systemLabel = systems.length > 0 ? systems.join(' and ') : 'the target system';
  const entity = inferEntityFromContext(events, steps);
  const action = inferWorkflowAction(steps, activityName);
  const subject = entity ?? cleanActivityName(activityName);

  // Determine the workflow deliverable from the last meaningful step
  const meaningfulSteps = steps.filter(s => s.grouping_reason !== 'error_handling');
  const lastStep = meaningfulSteps[meaningfulSteps.length - 1];
  let deliverable = `a completed ${subject}`;
  if (lastStep) {
    const lastGrouping = toGroupingReason(lastStep.grouping_reason);
    if (lastGrouping === 'fill_and_submit' || lastGrouping === 'send_action') {
      deliverable = `a submitted ${subject} record`;
    } else if (lastGrouping === 'file_action') {
      deliverable = `uploaded documentation for the ${subject}`;
    } else if (lastGrouping === 'click_then_navigate') {
      deliverable = `a fully processed ${subject}`;
    }
  }

  // Build phase summary from observed action types
  const phases: string[] = [];
  const groupings = new Set(steps.map(s => s.grouping_reason));
  if (groupings.has('click_then_navigate') && steps.filter(s => s.grouping_reason === 'click_then_navigate').length >= 2) {
    phases.push('navigation');
  }
  if (groupings.has('data_entry') || groupings.has('fill_and_submit')) {
    phases.push('data entry');
  }
  if (groupings.has('file_action')) {
    phases.push('document attachment');
  }
  if (groupings.has('send_action') || groupings.has('fill_and_submit')) {
    phases.push('submission');
  }
  if (groupings.has('error_handling')) {
    phases.push('error resolution');
  }

  // Deduplicate and build
  const uniquePhases = [...new Set(phases)];
  const phaseSuffix = uniquePhases.length > 0
    ? ` The workflow covers ${uniquePhases.join(', ')}.`
    : '';

  return (
    `This procedure documents how to ${action} a ${subject} in ${systemLabel}, ` +
    `resulting in ${deliverable}.${phaseSuffix}`
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
 * Generates meaningful phase labels that include entity/field context from
 * the actual steps in the phase.
 *
 * Strategy:
 * 1. Extract field names and page titles from phase events to identify
 *    the entity or action being performed
 * 2. Combine with system label for context like
 *    "Gmail — Compose Email" or "NetSuite — Invoice Line Items"
 * 3. Fall back to grouping-pattern labels when no entity context is available
 */
export function enrichPhaseLabel(
  systemLabel: string,
  phaseSteps: Array<{ grouping_reason: string; title?: string; source_event_ids?: string[] }>,
  phaseEvents?: CanonicalEventInput[],
): string {
  if (phaseSteps.length === 0) return systemLabel;

  const groupings = phaseSteps.map(s => s.grouping_reason);
  const hasFormSubmit = groupings.includes('fill_and_submit');
  const hasDataEntry = groupings.includes('data_entry');
  const hasSendAction = groupings.includes('send_action');
  const hasNavigation = groupings.includes('click_then_navigate');
  const hasFileAction = groupings.includes('file_action');
  const hasErrorHandling = groupings.includes('error_handling');

  // Try to extract entity context from events
  let entityContext: string | null = null;
  if (phaseEvents && phaseEvents.length > 0) {
    // Check field names first — most specific signal
    const fields = extractFieldNames(phaseEvents, 3);
    if (fields.length > 0) {
      entityContext = summarizeFields(fields, 2);
    }

    // If no fields, try entity from page titles / routes
    if (!entityContext) {
      const entity = inferEntityFromContext(phaseEvents, []);
      if (entity) {
        entityContext = capitalize(entity);
      }
    }

    // If still nothing, try to use the first meaningful page title
    if (!entityContext) {
      for (const evt of phaseEvents) {
        const pageTitle = evt.page_context?.pageTitle;
        if (pageTitle && !/untitled|loading|home|dashboard/i.test(pageTitle)) {
          // Trim long page titles
          entityContext = pageTitle.length > 30 ? pageTitle.slice(0, 27) + '...' : pageTitle;
          break;
        }
      }
    }
  }

  // If no events provided, try to derive from step titles
  if (!entityContext) {
    for (const step of phaseSteps) {
      if (step.title && !/untitled|loading/i.test(step.title)) {
        // Extract the meaningful part of the title (skip verb prefixes)
        const meaningful = step.title.replace(/^(Navigate to|Enter|Complete|Submit|Attach|Resolve)\s+/i, '').trim();
        if (meaningful && meaningful.length > 2 && meaningful.length <= 40) {
          entityContext = meaningful;
          break;
        }
      }
    }
  }

  // Build the label with entity context when available
  if (entityContext) {
    if (hasFormSubmit && hasSendAction) return `${systemLabel} — Submit ${entityContext}`;
    if (hasFormSubmit) return `${systemLabel} — Complete ${entityContext}`;
    if (hasDataEntry && hasSendAction) return `${systemLabel} — Enter & Submit ${entityContext}`;
    if (hasDataEntry) return `${systemLabel} — Enter ${entityContext}`;
    if (hasSendAction) return `${systemLabel} — Send ${entityContext}`;
    if (hasFileAction) return `${systemLabel} — Upload ${entityContext}`;
    if (hasNavigation) return `${systemLabel} — ${entityContext}`;
    return `${systemLabel} — ${entityContext}`;
  }

  // Fallback: grouping-pattern labels (same as before but slightly improved)
  if (hasFormSubmit && hasSendAction) return `${systemLabel} — Data Entry & Submission`;
  if (hasFormSubmit) return `${systemLabel} — Form Completion`;
  if (hasDataEntry && hasSendAction) return `${systemLabel} — Data Entry & Confirmation`;
  if (hasDataEntry) return `${systemLabel} — Data Entry`;
  if (hasSendAction) return `${systemLabel} — Action Execution`;
  if (hasFileAction) return `${systemLabel} — Document Management`;
  if (hasErrorHandling) return `${systemLabel} — Error Resolution`;
  if (hasNavigation && phaseSteps.length > 2) return `${systemLabel} — Navigation & Review`;
  if (hasNavigation) return `${systemLabel} — Navigation`;
  return systemLabel;
}
