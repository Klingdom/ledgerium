import type {
  ProcessEngineInput,
  ProcessDefinition,
  CanonicalEventInput,
} from './types.js';
import { PROCESS_ENGINE_VERSION } from './types.js';
import { analyzeStep, formatDuration, uniqueSystems, uniqueDomains } from './stepAnalyzer.js';

export function buildProcessDefinition(input: ProcessEngineInput): ProcessDefinition {
  const { sessionJson, normalizedEvents, derivedSteps } = input;

  const eventById = new Map<string, CanonicalEventInput>(
    normalizedEvents.map(e => [e.event_id, e]),
  );

  const finalizedSteps = derivedSteps.filter(s => s.status === 'finalized');

  const stepDefinitions = finalizedSteps.map(step => {
    const events = step.source_event_ids
      .map(id => eventById.get(id))
      .filter((e): e is CanonicalEventInput => e !== undefined);
    return analyzeStep(step, events);
  });

  // Aggregate systems and domains across all steps
  const allSystems = uniqueSystems(normalizedEvents);
  const allDomains = uniqueDomains(normalizedEvents);

  // Estimate total duration from first to last step
  const firstStep = finalizedSteps[0];
  const lastStep = finalizedSteps[finalizedSteps.length - 1];
  const estimatedDurationMs =
    firstStep && lastStep
      ? (lastStep.end_t_ms ?? lastStep.start_t_ms) - firstStep.start_t_ms
      : undefined;

  const description = buildDescription(sessionJson.activityName, allSystems, finalizedSteps.length);
  const purpose = buildPurpose(sessionJson.activityName, allSystems);
  const scope = buildScope(allDomains, allSystems);

  return {
    definitionId: `${sessionJson.sessionId}-def`,
    name: sessionJson.activityName,
    version: '1.0',
    description,
    purpose,
    scope,
    systems: allSystems,
    domains: allDomains,
    ...(estimatedDurationMs !== undefined && { estimatedDurationMs }),
    estimatedDurationLabel: formatDuration(estimatedDurationMs),
    stepDefinitions,
    ruleVersion: PROCESS_ENGINE_VERSION,
  };
}

function buildDescription(activityName: string, systems: string[], stepCount: number): string {
  const systemList = systems.length > 0 ? ` using ${systems.join(', ')}` : '';
  return `"${activityName}" is a ${stepCount}-step workflow captured from a live browser session${systemList}. Each step represents a discrete user action or navigation event, grouped by the Ledgerium segmentation engine into logical process units.`;
}

function buildPurpose(activityName: string, systems: string[]): string {
  const systemCtx = systems.length > 0 ? ` within ${systems.join(' and ')}` : '';
  return `To document and standardize the process for performing "${activityName}"${systemCtx}, enabling repeatable execution, training, compliance review, and process improvement.`;
}

function buildScope(domains: string[], systems: string[]): string {
  const parts: string[] = [];
  if (systems.length > 0) parts.push(`Systems: ${systems.join(', ')}`);
  if (domains.length > 0) parts.push(`Domains: ${domains.join(', ')}`);
  return parts.length > 0
    ? parts.join(' | ')
    : 'Scope determined by the systems accessed during the recorded session.';
}
