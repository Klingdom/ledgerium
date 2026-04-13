/**
 * Agent Composer
 *
 * Stage 7 of the Agent Intelligence transformation pipeline.
 *
 * Takes the full upstream output (steps, activities, skills, opportunities,
 * workflow) and composes AI agent profiles: what agents to create, what skills
 * they need, what systems they access, what tasks they handle, and how they
 * collaborate.
 *
 * Composition strategy:
 * - One agent per unique system in the workflow.
 * - Activities with no system (system === null) are grouped into a "General Task Agent".
 * - If the workflow spans 3+ systems, an orchestrator agent is created that
 *   coordinates the system-specific agents.
 *
 * All processing is deterministic: same input → same output.
 */

import type {
  StepIntelligence,
  Activity,
  WorkflowStructure,
  SkillLibrary,
  OpportunityAnalysis,
  AutomationType,
  AgentRole,
  AgentInteractionMode,
  AgentTool,
  AgentTask,
  AgentProfile,
  AgentCollaboration,
  AgentComposition,
} from './types.js';
import { SYSTEM_CAPABILITIES } from './verb-maps.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTOMATION_WEIGHTS: Record<AutomationType, number> = {
  full_automation: 100,
  ai_assisted: 70,
  human_in_loop: 40,
  manual_only: 0,
};

const ALL_AGENT_ROLES: AgentRole[] = [
  'executor',
  'assistant',
  'orchestrator',
  'monitor',
  'specialist',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Capitalize the first letter of each word in a system name.
 * Examples: "gmail" → "Gmail", "google_drive" → "Google Drive"
 */
function formatSystemName(system: string): string {
  return system
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Humanize a capability string (snake_case → Title Case).
 * Example: "send_email" → "Send Email"
 */
function humanizeCapability(capability: string): string {
  return capability
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Aggregate automation classification from a set of steps.
 * - ANY manual_only   → manual_only
 * - ANY human_in_loop → human_in_loop
 * - ALL full_automation → full_automation
 * - Otherwise → ai_assisted
 */
function aggregateAutomation(steps: StepIntelligence[]): AutomationType {
  if (steps.length === 0) return 'ai_assisted';
  if (steps.some(s => s.automationClassification === 'manual_only')) return 'manual_only';
  if (steps.some(s => s.automationClassification === 'human_in_loop')) return 'human_in_loop';
  if (steps.every(s => s.automationClassification === 'full_automation')) return 'full_automation';
  return 'ai_assisted';
}

/**
 * Compute weighted automation score (0-100) for a set of steps.
 * Weighted by duration if available, else equal weight.
 */
function computeCapabilityScore(steps: StepIntelligence[]): number {
  if (steps.length === 0) return 0;

  const totalDuration = steps.reduce(
    (sum, s) => sum + (s.estimatedDurationMs ?? 0),
    0,
  );
  const useEqualWeight = totalDuration === 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const step of steps) {
    const stepScore = AUTOMATION_WEIGHTS[step.automationClassification];
    const weight = useEqualWeight
      ? 1
      : (step.estimatedDurationMs ?? 0) > 0
        ? step.estimatedDurationMs!
        : totalDuration / steps.length;

    weightedSum += stepScore * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

/**
 * Derive agent role from the set of covered steps and whether this is an orchestrator.
 */
function deriveRole(steps: StepIntelligence[], isOrchestrator: boolean): AgentRole {
  if (isOrchestrator) return 'orchestrator';

  // Check if all steps have monitoring skill type (wait/refresh verbs)
  const monitoringVerbs = new Set(['wait', 'refresh', 'monitor', 'watch']);
  if (steps.length > 0 && steps.every(s => monitoringVerbs.has(s.verb))) {
    return 'monitor';
  }

  if (steps.every(s => s.automationClassification === 'full_automation')) {
    return 'executor';
  }

  if (steps.some(s =>
    s.automationClassification === 'human_in_loop' ||
    s.automationClassification === 'manual_only',
  )) {
    return 'assistant';
  }

  return 'specialist';
}

/**
 * Derive interaction mode from role and covered steps.
 */
function deriveInteractionMode(
  role: AgentRole,
  steps: StepIntelligence[],
): AgentInteractionMode {
  // Base mode from role
  let mode: AgentInteractionMode;
  switch (role) {
    case 'executor':      mode = 'autonomous'; break;
    case 'assistant':     mode = 'collaborative'; break;
    case 'orchestrator':  mode = 'supervised'; break;
    case 'monitor':       mode = 'autonomous'; break;
    case 'specialist':    mode = 'supervised'; break;
  }

  // Overrides: most restrictive wins
  // manual_only overrides everything → approval_required
  if (steps.some(s => s.automationClassification === 'manual_only')) {
    return 'approval_required';
  }

  // human_in_loop → collaborative (only if not already approval_required)
  if (steps.some(s => s.automationClassification === 'human_in_loop')) {
    return 'collaborative';
  }

  return mode;
}

/**
 * Build the tools array for an agent based on its system and the steps it covers.
 * Each capability in SYSTEM_CAPABILITIES becomes one AgentTool.
 * `required` is true if any covered step uses a matching verb.
 */
function buildTools(
  system: string,
  coveredSteps: StepIntelligence[],
): AgentTool[] {
  const capabilities = SYSTEM_CAPABILITIES[system];
  if (!capabilities || capabilities.length === 0) return [];

  // Build a set of verbs used by the covered steps for quick lookup
  const usedVerbs = new Set(coveredSteps.map(s => s.verb));

  return capabilities.map(capability => {
    // Check if any step verb appears in the capability string
    // e.g., "send_email" matches verb "send"
    const required = usedVerbs.size > 0 && [...usedVerbs].some(verb =>
      capability.includes(verb),
    );

    return {
      toolId: `${system}_${capability}`,
      toolName: humanizeCapability(capability),
      system,
      capability,
      required,
    } satisfies AgentTool;
  });
}

/**
 * Build the tasks array for an agent from its covered activities.
 * Each activity becomes one task.
 */
function buildTasks(
  coveredActivities: Activity[],
  allActivities: Activity[],
  skillLibrary: SkillLibrary,
): AgentTask[] {
  return coveredActivities.map((activity, idx) => {
    // Execution order is based on position in the full workflow activity list
    const executionOrder = allActivities.findIndex(
      a => a.activityId === activity.activityId,
    ) + 1;

    // Find skills whose sourceActivityIds include this activity
    const requiredSkillIds = skillLibrary.skills
      .filter(skill => skill.sourceActivityIds.includes(activity.activityId))
      .map(skill => skill.skillId);

    const requiresApproval =
      activity.automationClassification === 'human_in_loop' ||
      activity.automationClassification === 'manual_only';

    return {
      taskId: `task-${idx + 1}`,
      description: activity.purpose,
      activityIds: [activity.activityId],
      stepIds: [...activity.stepIds],
      requiredSkillIds,
      executionOrder,
      requiresApproval,
      estimatedDurationMs: activity.estimatedDurationMs,
    } satisfies AgentTask;
  });
}

/**
 * Build an empty roleDistribution record with all roles initialized to 0.
 */
function emptyRoleDistribution(): Record<AgentRole, number> {
  return Object.fromEntries(ALL_AGENT_ROLES.map(r => [r, 0])) as Record<AgentRole, number>;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Compose AI agent profiles from the full upstream pipeline output.
 *
 * @param activities - Activity[] from the activity-builder stage
 * @param skillLibrary - SkillLibrary from the skill-extractor stage
 * @param opportunities - OpportunityAnalysis from the opportunity-detector stage
 * @param workflow - WorkflowStructure from the workflow-builder stage
 * @param steps - StepIntelligence[] from the parse stage
 * @returns AgentComposition with all agent profiles and collaboration links
 */
export function composeAgents(
  activities: Activity[],
  skillLibrary: SkillLibrary,
  opportunities: OpportunityAnalysis,
  workflow: WorkflowStructure,
  steps: StepIntelligence[],
): AgentComposition {
  // Empty workflow guard
  if (activities.length === 0 || steps.length === 0) {
    return {
      agents: [],
      collaborations: [],
      agentCount: 0,
      coveredStepCount: 0,
      coverageRatio: 0,
      roleDistribution: emptyRoleDistribution(),
      averageCapabilityScore: 0,
    } satisfies AgentComposition;
  }

  // ── Phase 1: Group activities by system ────────────────────────────────────

  // Map: system → activities (null system → '' key → "General" agent)
  const systemActivityMap = new Map<string, Activity[]>();

  for (const activity of activities) {
    const key = activity.system ?? '';
    const existing = systemActivityMap.get(key);
    if (existing) {
      existing.push(activity);
    } else {
      systemActivityMap.set(key, [activity]);
    }
  }

  // Build a lookup: stepId → StepIntelligence
  const stepById = new Map<string, StepIntelligence>(steps.map(s => [s.stepId, s]));

  const uniqueSystems = workflow.systems.filter(s => s !== '');

  // ── Phase 2: Build system-specific agents ─────────────────────────────────

  const systemAgents: AgentProfile[] = [];
  let agentIndexCounter = 1;

  for (const [systemKey, systemActivities] of systemActivityMap) {
    const isNullSystem = systemKey === '';
    const system = isNullSystem ? null : systemKey;
    const agentName = isNullSystem
      ? 'General Task Agent'
      : `${formatSystemName(systemKey)} Agent`;

    // Collect all steps covered by these activities
    const coveredActivityIds = systemActivities.map(a => a.activityId);
    const coveredStepIds = [...new Set(systemActivities.flatMap(a => a.stepIds))];
    const coveredSteps = coveredStepIds
      .map(id => stepById.get(id))
      .filter((s): s is StepIntelligence => s !== undefined);

    const role = deriveRole(coveredSteps, false);
    const interactionMode = deriveInteractionMode(role, coveredSteps);

    // Skills: all skills where requiredSystems includes this agent's system
    const skillIds = system === null
      ? skillLibrary.skills
          .filter(sk => sk.requiredSystems.length === 0)
          .map(sk => sk.skillId)
      : skillLibrary.skills
          .filter(sk => sk.requiredSystems.includes(system))
          .map(sk => sk.skillId);

    // Tools: from SYSTEM_CAPABILITIES (empty for null-system agent)
    const tools = system !== null
      ? buildTools(system, coveredSteps)
      : [];

    // Tasks: one per covered activity
    const tasks = buildTasks(systemActivities, activities, skillLibrary);

    // Systems this agent touches
    const agentSystems = system !== null ? [system] : [];

    // Opportunity IDs where this system is involved
    const opportunityIds = opportunities.opportunities
      .filter(opp => system !== null && opp.systems.includes(system))
      .map(opp => opp.opportunityId);

    const automationClassification = aggregateAutomation(coveredSteps);
    const capabilityScore = computeCapabilityScore(coveredSteps);

    const avgConfidence =
      coveredSteps.length > 0
        ? Math.round(
            (coveredSteps.reduce((sum, s) => sum + s.confidence, 0) / coveredSteps.length) * 1000,
          ) / 1000
        : 0;

    const description = system !== null
      ? `Handles ${formatSystemName(systemKey)}-related tasks in the workflow`
      : 'Handles general tasks with no specific system context';

    systemAgents.push({
      agentId: `agent-${agentIndexCounter++}`,
      agentName,
      description,
      role,
      interactionMode,
      skillIds,
      tools,
      tasks,
      systems: agentSystems,
      opportunityIds,
      coveredActivityIds,
      coveredStepIds,
      automationClassification,
      capabilityScore,
      confidence: avgConfidence,
    } satisfies AgentProfile);
  }

  // ── Phase 3: Build orchestrator (only if 3+ systems) ──────────────────────

  let orchestratorAgent: AgentProfile | null = null;

  if (uniqueSystems.length >= 3) {
    const allActivityIds = activities.map(a => a.activityId);
    const allStepIds = steps.map(s => s.stepId);

    // Orchestrator: union of all agent skillIds
    const allSkillIds = [...new Set(systemAgents.flatMap(a => a.skillIds))];

    // Orchestrator tasks: one per dependency (handoffs)
    const orchestratorTasks: AgentTask[] = workflow.dependencies.map((dep, idx) => {
      const fromActivity = activities.find(a => a.activityId === dep.fromActivityId);
      const toActivity = activities.find(a => a.activityId === dep.toActivityId);

      return {
        taskId: `task-${idx + 1}`,
        description: `Coordinate handoff from ${fromActivity?.activityName ?? dep.fromActivityId} to ${toActivity?.activityName ?? dep.toActivityId}`,
        activityIds: [dep.fromActivityId, dep.toActivityId],
        stepIds: [
          ...(fromActivity?.stepIds ?? []),
          ...(toActivity?.stepIds ?? []),
        ],
        requiredSkillIds: [],
        executionOrder: idx + 1,
        requiresApproval: false,
        estimatedDurationMs: null,
      } satisfies AgentTask;
    });

    // Orchestration opportunity IDs
    const orchestratorOpportunityIds = opportunities.opportunities
      .filter(opp => opp.classification === 'agent_orchestration_candidate')
      .map(opp => opp.opportunityId);

    orchestratorAgent = {
      agentId: `agent-${agentIndexCounter++}`,
      agentName: `${workflow.workflowName} Orchestrator`,
      description: `Orchestrates the full ${workflow.workflowName} workflow across ${uniqueSystems.length} systems`,
      role: 'orchestrator',
      interactionMode: 'supervised',
      skillIds: allSkillIds,
      tools: [],
      tasks: orchestratorTasks,
      systems: [...uniqueSystems],
      opportunityIds: orchestratorOpportunityIds,
      coveredActivityIds: allActivityIds,
      coveredStepIds: allStepIds,
      automationClassification: workflow.automationClassification,
      capabilityScore: workflow.automationScore,
      confidence: workflow.confidence,
    } satisfies AgentProfile;
  }

  // ── Phase 4: Build collaborations ─────────────────────────────────────────

  // Build lookup: activityId → agentId
  const activityToAgentId = new Map<string, string>();
  for (const agent of systemAgents) {
    for (const actId of agent.coveredActivityIds) {
      activityToAgentId.set(actId, agent.agentId);
    }
  }

  const collaborations: AgentCollaboration[] = [];

  for (const dep of workflow.dependencies) {
    const fromAgentId = activityToAgentId.get(dep.fromActivityId);
    const toAgentId = activityToAgentId.get(dep.toActivityId);

    // Only create collaboration for cross-agent dependencies
    if (!fromAgentId || !toAgentId || fromAgentId === toAgentId) continue;

    const fromActivity = activities.find(a => a.activityId === dep.fromActivityId);
    const toActivity = activities.find(a => a.activityId === dep.toActivityId);

    // Data flow: intersection of fromActivity.outputs and toActivity.inputs
    const fromOutputs = fromActivity?.outputs ?? [];
    const toInputs = toActivity?.inputs ?? [];
    const dataFlow = fromOutputs.filter(o => toInputs.includes(o));

    // If orchestrator exists, all collaborations become delegation
    let collaborationType: 'handoff' | 'delegation' | 'notification';
    if (orchestratorAgent !== null) {
      collaborationType = 'delegation';
    } else if (dataFlow.length > 0) {
      collaborationType = 'handoff';
    } else {
      collaborationType = 'notification';
    }

    collaborations.push({
      fromAgentId,
      toAgentId,
      trigger: `Completion of ${fromActivity?.activityName ?? dep.fromActivityId}`,
      dataFlow,
      type: collaborationType,
    } satisfies AgentCollaboration);
  }

  // ── Phase 5: Assemble final agent list and aggregates ─────────────────────

  // Sort system agents alphabetically by name, then prepend orchestrator
  systemAgents.sort((a, b) => a.agentName.localeCompare(b.agentName));

  const allAgents: AgentProfile[] = orchestratorAgent !== null
    ? [orchestratorAgent, ...systemAgents]
    : systemAgents;

  // Re-assign sequential IDs after sorting (deterministic order)
  allAgents.forEach((agent, idx) => {
    agent.agentId = `agent-${idx + 1}`;
  });

  // Rewrite collaboration IDs to match new agent IDs
  // Build name → new ID map
  const agentNameToId = new Map<string, string>(
    allAgents.map(a => [a.agentName, a.agentId]),
  );
  // Rebuild agentId lookups after reassignment
  const finalActivityToAgentId = new Map<string, string>();
  for (const agent of allAgents) {
    for (const actId of agent.coveredActivityIds) {
      finalActivityToAgentId.set(actId, agent.agentId);
    }
  }

  // Recompute collaborations with corrected IDs
  const finalCollaborations: AgentCollaboration[] = [];
  for (const dep of workflow.dependencies) {
    const fromAgentId = finalActivityToAgentId.get(dep.fromActivityId);
    const toAgentId = finalActivityToAgentId.get(dep.toActivityId);

    // For orchestrator: it owns all activities, so same-agent dependencies are skipped
    // We only want system-agent cross-system collaborations
    if (!fromAgentId || !toAgentId) continue;

    // Filter out orchestrator self-collaborations and same-agent deps
    if (fromAgentId === toAgentId) continue;

    // Check if both are system agents (not orchestrator)
    const fromIsOrchestrator = allAgents.find(a => a.agentId === fromAgentId)?.role === 'orchestrator';
    const toIsOrchestrator = allAgents.find(a => a.agentId === toAgentId)?.role === 'orchestrator';
    if (fromIsOrchestrator || toIsOrchestrator) continue;

    const fromActivity = activities.find(a => a.activityId === dep.fromActivityId);
    const toActivity = activities.find(a => a.activityId === dep.toActivityId);

    const fromOutputs = fromActivity?.outputs ?? [];
    const toInputs = toActivity?.inputs ?? [];
    const dataFlow = fromOutputs.filter(o => toInputs.includes(o));

    let collaborationType: 'handoff' | 'delegation' | 'notification';
    if (orchestratorAgent !== null) {
      collaborationType = 'delegation';
    } else if (dataFlow.length > 0) {
      collaborationType = 'handoff';
    } else {
      collaborationType = 'notification';
    }

    finalCollaborations.push({
      fromAgentId,
      toAgentId,
      trigger: `Completion of ${fromActivity?.activityName ?? dep.fromActivityId}`,
      dataFlow,
      type: collaborationType,
    } satisfies AgentCollaboration);
  }

  // Deduplicate collaborations (same fromAgentId + toAgentId pair)
  const seenCollabPairs = new Set<string>();
  const dedupedCollaborations: AgentCollaboration[] = [];
  for (const collab of finalCollaborations) {
    const key = `${collab.fromAgentId}::${collab.toAgentId}`;
    if (!seenCollabPairs.has(key)) {
      seenCollabPairs.add(key);
      dedupedCollaborations.push(collab);
    }
  }

  // Compute aggregates (exclude orchestrator from step coverage count to avoid double-counting)
  const nonOrchestratorAgents = allAgents.filter(a => a.role !== 'orchestrator');
  const allCoveredStepIds = new Set(nonOrchestratorAgents.flatMap(a => a.coveredStepIds));
  const coveredStepCount = allCoveredStepIds.size;
  const coverageRatio = workflow.stepCount > 0
    ? Math.min(1.0, coveredStepCount / workflow.stepCount)
    : 0;

  const roleDistribution = emptyRoleDistribution();
  for (const agent of allAgents) {
    roleDistribution[agent.role] += 1;
  }

  const averageCapabilityScore =
    allAgents.length > 0
      ? Math.round(
          allAgents.reduce((sum, a) => sum + a.capabilityScore, 0) / allAgents.length,
        )
      : 0;

  return {
    agents: allAgents,
    collaborations: dedupedCollaborations,
    agentCount: allAgents.length,
    coveredStepCount,
    coverageRatio,
    roleDistribution,
    averageCapabilityScore,
  } satisfies AgentComposition;
}
