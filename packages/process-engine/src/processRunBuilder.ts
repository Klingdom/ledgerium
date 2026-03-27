import type { ProcessEngineInput, ProcessRun } from './types.js';
import { PROCESS_ENGINE_VERSION } from './types.js';
import { formatDuration, uniqueSystems } from './stepAnalyzer.js';

export function buildProcessRun(input: ProcessEngineInput): ProcessRun {
  const { sessionJson, normalizedEvents, derivedSteps } = input;

  const finalizedSteps = derivedSteps.filter(s => s.status === 'finalized');

  const humanEventCount = normalizedEvents.filter(e => e.actor_type === 'human').length;
  const systemEventCount = normalizedEvents.filter(e => e.actor_type === 'system').length;

  const durationMs = sessionJson.endedAt
    ? new Date(sessionJson.endedAt).getTime() - new Date(sessionJson.startedAt).getTime()
    : undefined;

  const completionStatus: ProcessRun['completionStatus'] =
    sessionJson.endedAt !== undefined && finalizedSteps.length > 0 ? 'complete' : 'partial';

  // Run-level metrics from step classification (engine spec §16.2)
  const errorStepCount = finalizedSteps.filter(s => s.grouping_reason === 'error_handling').length;
  const navigationStepCount = finalizedSteps.filter(s => s.grouping_reason === 'click_then_navigate').length;

  // Systems accessed during this run (§16.2 run-level context)
  const systemsUsed = uniqueSystems(normalizedEvents);

  return {
    runId: sessionJson.sessionId,
    sessionId: sessionJson.sessionId,
    activityName: sessionJson.activityName,
    startedAt: sessionJson.startedAt,
    ...(sessionJson.endedAt !== undefined && { endedAt: sessionJson.endedAt }),
    ...(durationMs !== undefined && { durationMs }),
    durationLabel: formatDuration(durationMs),
    stepCount: finalizedSteps.length,
    eventCount: normalizedEvents.length,
    humanEventCount,
    systemEventCount,
    systemsUsed,
    errorStepCount,
    navigationStepCount,
    completionStatus,
    engineVersion: PROCESS_ENGINE_VERSION,
  };
}
