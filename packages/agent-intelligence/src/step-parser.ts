/**
 * Step Parser Engine
 *
 * Converts each StepDefinition + corresponding SOPStep pair (from ProcessOutput)
 * into a StepIntelligence object with enriched semantic fields.
 *
 * Parsing is fully deterministic and rule-based — no LLM calls.
 * All outputs trace back to source event IDs.
 *
 * Design:
 * - Verb/object parsing: greedy left-to-right scan of step title tokens
 * - System detection: SYSTEM_MAP lookup against step systems[] and domains[]
 * - Intent construction: verb + object + system + qualifier template
 * - Automation classification: category + hasSensitiveEvents + confidence rules
 * - Confidence: computed from how many fields were deterministically parsed
 */

import type { ProcessOutput, StepDefinition, SOPStep } from '@ledgerium/process-engine';
import type { StepIntelligence, AutomationType, InferenceMethod } from './types.js';
import {
  VERB_MAP,
  OBJECT_MAP,
  SYSTEM_MAP,
  EVENT_TYPE_VERB_MAP,
  VERB_TO_ACTION_TYPE,
  CATEGORY_TO_AUTOMATION,
} from './verb-maps.js';

// ─── Internal parsed label ────────────────────────────────────────────────────

interface ParsedLabel {
  verb: string | null;
  object: string | null;
  qualifier: string | null;
}

// ─── Label parsing ────────────────────────────────────────────────────────────

/**
 * Tokenize a raw step title and extract verb, object, and qualifier.
 * Greedy left-to-right: first recognized verb, then first recognized object.
 * Remaining non-noise tokens become the qualifier.
 */
function parseLabel(rawLabel: string): ParsedLabel {
  const normalized = rawLabel
    .toLowerCase()
    .replace(/[_\-./\\]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = normalized.split(' ').filter(t => t.length > 0);

  let verb: string | null = null;
  let verbIndex = -1;
  let object: string | null = null;
  let objectIndex = -1;
  const qualifierTokens: string[] = [];

  const NOISE = new Set(['the', 'a', 'an', 'to', 'for', 'in', 'on', 'at', 'of', 'with', 'from', 'and', 'or', 'by']);

  for (let i = 0; i < tokens.length; i++) {
    const mapped = VERB_MAP[tokens[i] ?? ''];
    if (mapped !== undefined) {
      verb = mapped;
      verbIndex = i;
      break;
    }
  }

  const objStart = verbIndex >= 0 ? verbIndex + 1 : 0;
  for (let i = objStart; i < tokens.length; i++) {
    const mapped = OBJECT_MAP[tokens[i] ?? ''];
    if (mapped !== undefined) {
      object = mapped;
      objectIndex = i;
      break;
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    if (i === verbIndex || i === objectIndex) continue;
    const t = tokens[i] ?? '';
    if (NOISE.has(t)) continue;
    // Skip selector-like tokens (very short, purely numeric, or containing special chars)
    if (/^[#.[\]()>~+*=]/.test(t)) continue;
    if (/^\d+$/.test(t)) continue;
    qualifierTokens.push(t);
  }

  return {
    verb,
    object,
    qualifier: qualifierTokens.length > 0 ? qualifierTokens.slice(0, 3).join(' ') : null,
  };
}

// ─── System detection ─────────────────────────────────────────────────────────

/**
 * Resolve a canonical system name from the step's systems[] and domains[] arrays.
 * Tries exact match first, then partial match. Falls back to the first system value.
 */
function resolveSystem(systems: string[], domains: string[]): string | null {
  const sources = [...systems, ...domains];
  for (const src of sources) {
    const lower = src.toLowerCase();
    if (SYSTEM_MAP[lower] !== undefined) return SYSTEM_MAP[lower] ?? null;
    for (const [key, canonical] of Object.entries(SYSTEM_MAP)) {
      if (lower.includes(key)) return canonical;
    }
  }
  return systems[0]?.toLowerCase() ?? null;
}

// ─── Intent construction ──────────────────────────────────────────────────────

/**
 * Build a human-readable intent string from parsed components.
 * Never returns raw CSS selectors or DOM element IDs.
 * Always produces something meaningful.
 */
function buildInferredIntent(
  verb: string | null,
  object: string | null,
  system: string | null,
  qualifier: string | null,
  rawTitle: string,
): string {
  if (!verb && !object) {
    // Fall back to cleaned raw title
    return cleanTitle(rawTitle);
  }

  const systemLabel = system ? formatSystem(system) : null;

  // Special compound intents
  if (verb === 'send' && object === 'email') {
    return systemLabel ? `Send email via ${systemLabel}` : 'Send email';
  }
  if (verb === 'email' && object === null) {
    return systemLabel ? `Send email via ${systemLabel}` : 'Send email';
  }
  if ((verb === 'fill' || verb === 'enter') && object === 'form') {
    return systemLabel ? `Fill form in ${systemLabel}` : 'Fill form';
  }
  if (verb === 'submit' && object === 'form') {
    return systemLabel ? `Submit form in ${systemLabel}` : 'Submit form';
  }
  if (verb === 'navigate' || verb === 'open') {
    if (qualifier) {
      const cleaned = capitalizeWords(qualifier.replace(/[_-]/g, ' '));
      return systemLabel
        ? `Navigate to ${cleaned} in ${systemLabel}`
        : `Navigate to ${cleaned}`;
    }
    if (object && object !== 'page') {
      return systemLabel ? `Open ${object} in ${systemLabel}` : `Open ${object}`;
    }
    return systemLabel ? `Navigate to ${systemLabel}` : 'Navigate to page';
  }
  if (verb === 'download') {
    const obj = object ?? 'file';
    return systemLabel ? `Download ${obj} from ${systemLabel}` : `Download ${obj}`;
  }
  if (verb === 'upload') {
    const obj = object ?? 'file';
    return systemLabel ? `Upload ${obj} to ${systemLabel}` : `Upload ${obj}`;
  }
  if (verb === 'export') {
    const obj = object ?? 'data';
    return systemLabel ? `Export ${obj} from ${systemLabel}` : `Export ${obj}`;
  }
  if (verb === 'import') {
    const obj = object ?? 'data';
    return systemLabel ? `Import ${obj} into ${systemLabel}` : `Import ${obj}`;
  }
  if (verb === 'search' || verb === 'filter') {
    const obj = object ?? 'records';
    return systemLabel ? `${capitalizeFirst(verb)} ${obj} in ${systemLabel}` : `${capitalizeFirst(verb)} ${obj}`;
  }
  if (verb === 'login') {
    return systemLabel ? `Log in to ${systemLabel}` : 'Log in';
  }
  if (verb === 'logout') {
    return systemLabel ? `Log out of ${systemLabel}` : 'Log out';
  }

  // Generic template: [Verb] [object] [in system]
  const verbLabel = capitalizeFirst(verb ?? 'Perform');
  const objectLabel = object ?? (qualifier ? qualifier.split(' ')[0] ?? '' : 'action');
  if (systemLabel) {
    return qualifier && qualifier !== objectLabel
      ? `${verbLabel} ${objectLabel} in ${systemLabel}`
      : `${verbLabel} ${objectLabel} in ${systemLabel}`;
  }
  return qualifier && qualifier !== objectLabel
    ? `${verbLabel} ${objectLabel}`
    : `${verbLabel} ${objectLabel}`;
}

function formatSystem(system: string): string {
  const overrides: Record<string, string> = {
    gmail: 'Gmail',
    google_drive: 'Google Drive',
    google_docs: 'Google Docs',
    google_sheets: 'Google Sheets',
    google_calendar: 'Google Calendar',
    google_forms: 'Google Forms',
    slack: 'Slack',
    jira: 'Jira',
    confluence: 'Confluence',
    salesforce: 'Salesforce',
    hubspot: 'HubSpot',
    github: 'GitHub',
    gitlab: 'GitLab',
    azure_devops: 'Azure DevOps',
    trello: 'Trello',
    asana: 'Asana',
    monday: 'Monday.com',
    zendesk: 'Zendesk',
    intercom: 'Intercom',
    stripe: 'Stripe',
    shopify: 'Shopify',
    quickbooks: 'QuickBooks',
    netsuite: 'NetSuite',
    outlook: 'Outlook',
    ms_teams: 'Microsoft Teams',
    sharepoint: 'SharePoint',
    linkedin: 'LinkedIn',
    figma: 'Figma',
    workday: 'Workday',
    sap: 'SAP',
    xero: 'Xero',
  };
  return overrides[system] ?? capitalizeWords(system.replace(/_/g, ' '));
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function capitalizeWords(s: string): string {
  return s.split(' ').map(w => capitalizeFirst(w)).join(' ');
}

/**
 * Clean a raw step title for display — strip selectors, DOM refs, and noise.
 */
function cleanTitle(rawTitle: string): string {
  return rawTitle
    .replace(/#[\w-]+/g, '')          // strip CSS IDs
    .replace(/\.[a-z][\w-]*/g, '')    // strip CSS classes
    .replace(/\[[\w="' ]+\]/g, '')    // strip attribute selectors
    .replace(/\s+/g, ' ')
    .trim()
    || 'Perform action';
}

// ─── Automation classification ────────────────────────────────────────────────

/**
 * Determine automation classification using category, sensitivity, verb, and confidence.
 *
 * Rules (in priority order):
 * 1. confidence < 0.5 → manual_only (too uncertain to automate)
 * 2. error_handling → manual_only
 * 3. annotation → manual_only
 * 4. data_entry + hasSensitiveEvents → human_in_loop
 * 5. fill_and_submit + hasSensitiveEvents → human_in_loop
 * 6. send_action → ai_assisted (human review before sending)
 * 7. data_entry without sensitive → ai_assisted
 * 8. fill_and_submit without sensitive → ai_assisted
 * 9. click_then_navigate → full_automation
 * 10. single_action → full_automation
 * 11. file_action → full_automation
 * 12. repeated_click_dedup → full_automation
 * 13. Default: category-level default from CATEGORY_TO_AUTOMATION
 */
function classifyAutomation(
  category: string,
  hasSensitiveEvents: boolean,
  confidence: number,
): AutomationType {
  if (confidence < 0.5) return 'manual_only';

  switch (category) {
    case 'error_handling':
      return 'manual_only';
    case 'annotation':
      return 'manual_only';
    case 'data_entry':
      return hasSensitiveEvents ? 'human_in_loop' : 'ai_assisted';
    case 'fill_and_submit':
      return hasSensitiveEvents ? 'human_in_loop' : 'ai_assisted';
    case 'send_action':
      return 'ai_assisted';
    case 'click_then_navigate':
      return 'full_automation';
    case 'single_action':
      return 'full_automation';
    case 'file_action':
      return 'full_automation';
    case 'repeated_click_dedup':
      return 'full_automation';
    default: {
      const defaultClass = CATEGORY_TO_AUTOMATION[category as keyof typeof CATEGORY_TO_AUTOMATION];
      return defaultClass ?? 'manual_only';
    }
  }
}

// ─── Confidence calculation ───────────────────────────────────────────────────

/**
 * Compute step-level confidence based on how many semantic fields were resolved.
 * Returns a value between 0.2 (raw title only) and 1.0 (all fields resolved).
 */
function computeStepConfidence(
  verb: string | null,
  object: string | null,
  system: string | null,
  sourceConfidence: number,
): number {
  let parsed = 0;
  if (verb) parsed++;
  if (object) parsed++;
  if (system) parsed++;
  const parseRatio = parsed / 3;
  // Blend parse ratio with upstream confidence
  const blended = parseRatio * 0.5 + sourceConfidence * 0.5;
  return Math.max(0.2, Math.min(1.0, blended));
}

/**
 * Determine how fields were inferred.
 */
function computeInferenceMethod(
  verb: string | null,
  object: string | null,
): InferenceMethod {
  if (verb && object) return 'deterministic';
  if (verb || object) return 'heuristic';
  return 'heuristic';
}

// ─── Preconditions / postconditions ──────────────────────────────────────────

/**
 * Derive preconditions for a step based on its ordinal and category.
 * These are conservative, always-true statements useful for agent planning.
 */
function derivePreconditions(
  step: StepDefinition,
  sopStep: SOPStep | undefined,
): string[] {
  const conditions: string[] = [];

  if (step.ordinal > 1) {
    conditions.push('Previous step has completed successfully');
  }
  if (step.category === 'fill_and_submit' || step.category === 'data_entry') {
    if (sopStep?.inputs && sopStep.inputs.length > 0) {
      conditions.push(`Required input data is available: ${sopStep.inputs.slice(0, 2).join(', ')}`);
    } else {
      conditions.push('Required input data is available');
    }
  }
  if (step.category === 'send_action') {
    conditions.push('Content to be sent has been prepared and reviewed');
  }
  if (step.category === 'file_action') {
    conditions.push('File system access is available');
  }
  if (step.systems.length > 0) {
    conditions.push(`${step.systems[0]} is accessible and user is authenticated`);
  }

  return conditions;
}

/**
 * Derive postconditions for a step based on its category and outputs.
 */
function derivePostconditions(
  step: StepDefinition,
  sopStep: SOPStep | undefined,
): string[] {
  const conditions: string[] = [];

  if (sopStep?.expectedOutcome) {
    conditions.push(sopStep.expectedOutcome);
  }

  if (step.outputs.length > 0) {
    conditions.push(`Output produced: ${step.outputs.slice(0, 2).join(', ')}`);
  }

  switch (step.category) {
    case 'click_then_navigate':
      conditions.push('User has navigated to the next page or view');
      break;
    case 'fill_and_submit':
    case 'send_action':
      conditions.push('Form or action has been submitted successfully');
      break;
    case 'data_entry':
      conditions.push('Data has been entered into the target field(s)');
      break;
    case 'file_action':
      conditions.push('File operation has completed');
      break;
    case 'error_handling':
      conditions.push('Error has been acknowledged or recovery action has been taken');
      break;
  }

  return conditions;
}

// ─── SOPStep lookup ───────────────────────────────────────────────────────────

/**
 * Find the matching SOPStep for a given StepDefinition by stepId.
 */
function findSopStep(output: ProcessOutput, stepId: string): SOPStep | undefined {
  return output.sop.steps.find(s => s.stepId === stepId || s.sourceStepId === stepId);
}

// ─── Entity detection ─────────────────────────────────────────────────────────

/**
 * Detect the primary business entity involved in a step from its title and object.
 * Returns the object if it's a business entity, not a UI element.
 */
const BUSINESS_ENTITIES = new Set([
  'email', 'invoice', 'order', 'ticket', 'case', 'customer', 'contact',
  'user', 'account', 'project', 'task', 'payment', 'transaction', 'receipt',
  'document', 'file', 'report', 'record', 'draft', 'template', 'contract',
  'product', 'service', 'vendor', 'data', 'csv', 'pdf', 'spreadsheet',
]);

function detectEntity(object: string | null): string | null {
  if (!object) return null;
  return BUSINESS_ENTITIES.has(object) ? object : null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Parse all steps from a ProcessOutput into StepIntelligence objects.
 *
 * @param output - Full process engine output
 * @returns Array of enriched step intelligence objects, one per StepDefinition
 */
export function parseSteps(output: ProcessOutput): StepIntelligence[] {
  const { processRun, processDefinition } = output;
  const steps = processDefinition.stepDefinitions;

  return steps.map(step => {
    const sopStep = findSopStep(output, step.stepId);

    // 1. Parse label into verb / object / qualifier
    const parsed = parseLabel(step.title);

    // 2. Fallback: infer verb from category if title parsing failed
    let verb = parsed.verb;
    if (!verb) {
      const categoryVerbFallback: Record<string, string> = {
        click_then_navigate: 'navigate',
        fill_and_submit: 'submit',
        data_entry: 'enter',
        send_action: 'send',
        file_action: 'upload',
        error_handling: 'handle',
        single_action: 'click',
        repeated_click_dedup: 'click',
        annotation: 'annotate',
      };
      verb = categoryVerbFallback[step.category] ?? null;
    }

    // 3. Detect system
    const system = resolveSystem(step.systems, step.domains);

    // 4. Compute confidence
    const confidence = computeStepConfidence(verb, parsed.object, system, step.confidence);

    // 5. Classify automation
    const automationClassification = classifyAutomation(
      step.category,
      step.hasSensitiveEvents,
      confidence,
    );

    // 6. Build intent
    const inferredIntent = buildInferredIntent(
      verb,
      parsed.object,
      system,
      parsed.qualifier,
      step.title,
    );

    // 7. Collect input/output data
    const inputData = [
      ...(sopStep?.inputs ?? []),
      ...step.inputs,
    ].filter((v, i, arr) => arr.indexOf(v) === i); // deduplicate

    const outputData = [...step.outputs];

    // 8. Derive preconditions / postconditions
    const preconditions = derivePreconditions(step, sopStep);
    const postconditions = derivePostconditions(step, sopStep);

    // 9. Action type and inference method
    const actionType = (verb ? (VERB_TO_ACTION_TYPE[verb] ?? verb) : 'click');
    const inferenceMethod = computeInferenceMethod(verb, parsed.object);

    return {
      stepId: step.stepId,
      sourceWorkflowId: processRun.runId,
      actionType,
      inferredIntent,
      verb: verb ?? 'click',
      object: parsed.object ?? 'element',
      qualifier: parsed.qualifier,
      system,
      entity: detectEntity(parsed.object),
      domain: step.domains[0] ?? null,
      inputData,
      outputData,
      preconditions,
      postconditions,
      automationClassification,
      estimatedDurationMs: step.durationMs ?? null,
      confidence,
      inferenceMethod,
      evidenceEventIds: [...step.sourceEventIds],
      rawReference: {
        stepOrdinal: step.ordinal,
        rawTitle: step.title,
        category: step.category,
        systems: [...step.systems],
        domains: [...step.domains],
      },
    } satisfies StepIntelligence;
  });
}
