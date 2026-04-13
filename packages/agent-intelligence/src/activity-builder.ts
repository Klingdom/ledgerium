/**
 * Activity Builder
 *
 * Groups consecutive StepIntelligence objects into logical Activity units.
 *
 * Grouping strategy:
 * 1. System boundary: consecutive steps on the same system form one activity
 * 2. Boundary detection: a step that navigates to a NEW system starts a new activity
 * 3. Single-step activities: steps with no system context or that are isolated
 *
 * Activity naming:
 * - Single step → use step's inferredIntent
 * - Form fill + submit on same system → "Complete [object] in [system]"
 * - File action → "[verb] [object] [from/to] [system]"
 * - Multi-step same system → "[action verb] in [system]"
 * - Multi-step multi-system → descriptive summary
 *
 * Automation aggregation:
 * - ALL full_automation → full_automation
 * - ANY manual_only → manual_only
 * - ANY human_in_loop → human_in_loop
 * - Otherwise → ai_assisted
 */

import type { StepIntelligence, Activity, AutomationType } from './types.js';

// ─── Activity naming helpers ──────────────────────────────────────────────────

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatSystem(system: string): string {
  const overrides: Record<string, string> = {
    gmail: 'Gmail',
    google_drive: 'Google Drive',
    google_docs: 'Google Docs',
    google_sheets: 'Google Sheets',
    google_calendar: 'Google Calendar',
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
    figma: 'Figma',
    workday: 'Workday',
    sap: 'SAP',
    xero: 'Xero',
  };
  return overrides[system] ?? system.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Determine the name for an activity based on its constituent steps.
 */
function buildActivityName(steps: StepIntelligence[]): string {
  if (steps.length === 0) return 'Unknown activity';
  if (steps.length === 1) {
    return steps[0]!.inferredIntent;
  }

  const primarySystem = steps[0]!.system;
  const systemLabel = primarySystem ? formatSystem(primarySystem) : null;

  // Check for fill + submit pattern (form workflow)
  const hasFormFill = steps.some(s => s.verb === 'fill' || s.verb === 'enter');
  const hasSubmit = steps.some(s => s.verb === 'submit' || s.verb === 'send');
  if (hasFormFill && hasSubmit && systemLabel) {
    const formObject = steps.find(s => s.verb === 'fill' || s.verb === 'enter')?.object;
    const obj = formObject ?? 'form';
    return `Complete ${obj} in ${systemLabel}`;
  }

  // Check for file operation pattern
  const fileStep = steps.find(s => ['upload', 'download', 'export', 'import', 'attach'].includes(s.verb));
  if (fileStep && systemLabel) {
    const preposition = ['upload', 'import', 'attach'].includes(fileStep.verb) ? 'to' : 'from';
    return `${capitalizeFirst(fileStep.verb)} ${fileStep.object} ${preposition} ${systemLabel}`;
  }

  // Generic: use the last step's verb as the "completing action"
  const lastStep = steps[steps.length - 1]!;
  if (systemLabel) {
    return `${capitalizeFirst(lastStep.verb)} in ${systemLabel}`;
  }

  // Multi-system: use the first step's intent as a summary
  return steps[0]!.inferredIntent;
}

/**
 * Build the purpose description for an activity.
 */
function buildActivityPurpose(steps: StepIntelligence[]): string {
  if (steps.length === 0) return '';
  if (steps.length === 1) {
    return steps[0]!.inferredIntent;
  }

  const verbs = [...new Set(steps.map(s => s.verb))];
  const entities = [...new Set(steps.map(s => s.entity).filter((e): e is string => e !== null))];
  const system = steps[0]!.system;
  const systemLabel = system ? formatSystem(system) : null;

  if (entities.length > 0 && systemLabel) {
    return `${verbs.slice(0, 2).map(capitalizeFirst).join(' and ')} ${entities[0]} in ${systemLabel}`;
  }
  if (systemLabel) {
    return `Perform ${verbs.length} actions in ${systemLabel}`;
  }
  return `Perform ${steps.length} steps across ${[...new Set(steps.map(s => s.system).filter((s): s is string => s !== null))].length} systems`;
}

// ─── Automation aggregation ───────────────────────────────────────────────────

/**
 * Compute the aggregate automation classification for a group of steps.
 *
 * Rules:
 * - ANY manual_only → manual_only
 * - ANY human_in_loop → human_in_loop
 * - ALL full_automation → full_automation
 * - Otherwise → ai_assisted
 */
function aggregateAutomation(steps: StepIntelligence[]): AutomationType {
  if (steps.some(s => s.automationClassification === 'manual_only')) return 'manual_only';
  if (steps.some(s => s.automationClassification === 'human_in_loop')) return 'human_in_loop';
  if (steps.every(s => s.automationClassification === 'full_automation')) return 'full_automation';
  return 'ai_assisted';
}

// ─── Duration aggregation ─────────────────────────────────────────────────────

/**
 * Sum step durations. Returns null if any step lacks duration data.
 */
function sumDurations(steps: StepIntelligence[]): number | null {
  if (steps.some(s => s.estimatedDurationMs === null)) return null;
  return steps.reduce((sum, s) => sum + (s.estimatedDurationMs ?? 0), 0);
}

// ─── Step grouping ────────────────────────────────────────────────────────────

/**
 * Determine the effective system key for grouping purposes.
 * Navigation steps that introduce a new system break the current group.
 */
function getGroupingSystem(step: StepIntelligence): string {
  return step.system ?? '__none__';
}

/**
 * Group consecutive steps by system boundary.
 * A step with a different system than the preceding step starts a new group.
 * Steps with no system are grouped with the preceding system if the verb is
 * not 'navigate' (navigation always breaks the group).
 */
function groupStepsBySystemBoundary(steps: StepIntelligence[]): StepIntelligence[][] {
  if (steps.length === 0) return [];

  const groups: StepIntelligence[][] = [];
  let current: StepIntelligence[] = [];
  let currentSystem: string = getGroupingSystem(steps[0]!);

  for (const step of steps) {
    const stepSystem = getGroupingSystem(step);

    // A navigate step to a different system always starts a new group
    const isSystemChange = stepSystem !== currentSystem && stepSystem !== '__none__';
    const isNavigateNewSystem = step.verb === 'navigate' && isSystemChange;

    if (current.length === 0) {
      current.push(step);
      currentSystem = stepSystem !== '__none__' ? stepSystem : currentSystem;
    } else if (isSystemChange || isNavigateNewSystem) {
      groups.push(current);
      current = [step];
      currentSystem = stepSystem !== '__none__' ? stepSystem : currentSystem;
    } else {
      current.push(step);
      // Update currentSystem if this step has a more specific system
      if (stepSystem !== '__none__') {
        currentSystem = stepSystem;
      }
    }
  }

  if (current.length > 0) groups.push(current);

  return groups;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Group StepIntelligence objects into logical Activity units.
 *
 * @param steps - Ordered array of enriched step intelligence objects
 * @returns Array of Activity objects, each grouping related steps
 */
export function buildActivities(steps: StepIntelligence[]): Activity[] {
  if (steps.length === 0) return [];

  const groups = groupStepsBySystemBoundary(steps);

  return groups.map((groupSteps, index) => {
    const activityId = `act-${index + 1}`;
    const activityName = buildActivityName(groupSteps);
    const purpose = buildActivityPurpose(groupSteps);

    // Collect all unique systems and inputs/outputs
    const systems = [...new Set(
      groupSteps
        .map(s => s.system)
        .filter((s): s is string => s !== null),
    )];
    const primarySystem = systems[0] ?? null;

    const inputs = [...new Set(groupSteps.flatMap(s => s.inputData))];
    const outputs = [...new Set(groupSteps.flatMap(s => s.outputData))];

    const automationClassification = aggregateAutomation(groupSteps);
    const estimatedDurationMs = sumDurations(groupSteps);

    // Average confidence across all steps
    const confidence = groupSteps.reduce((sum, s) => sum + s.confidence, 0) / groupSteps.length;

    return {
      activityId,
      activityName,
      stepIds: groupSteps.map(s => s.stepId),
      purpose,
      system: primarySystem,
      systems,
      inputs,
      outputs,
      estimatedDurationMs,
      stepCount: groupSteps.length,
      automationClassification,
      confidence: Math.round(confidence * 1000) / 1000,
    } satisfies Activity;
  });
}
