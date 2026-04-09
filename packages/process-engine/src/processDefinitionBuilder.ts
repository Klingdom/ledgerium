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
  const scope = buildScope(allDomains, allSystems, finalizedSteps.length);

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
  const systemScope = systems.length > 1
    ? ` spanning ${systems.join(' and ')}`
    : systems.length === 1
      ? ` in ${systems[0]}`
      : '';
  return `"${activityName}" is a ${stepCount}-step workflow${systemScope}, covering the end-to-end process from initiation through completion.`;
}

function buildPurpose(activityName: string, systems: string[]): string {
  const systemCtx = systems.length > 0
    ? ` in ${systems.join(' and ')}`
    : '';
  return `Standardize how "${activityName}" is performed${systemCtx} to ensure consistent execution, accurate data handling, and reliable outcomes.`;
}

function buildScope(domains: string[], systems: string[], stepCount: number): string {
  if (systems.length === 0 && domains.length === 0) {
    return `This process covers a ${stepCount}-step workflow from initiation to completion.`;
  }
  const systemClause = systems.length > 0
    ? `across ${systems.join(' and ')}`
    : '';
  return `This process covers the end-to-end workflow from initiation to completion ${systemClause}, encompassing ${stepCount} step${stepCount !== 1 ? 's' : ''}.`.replace(/  +/g, ' ');
}
