/**
 * Artifact Generator
 *
 * Stage 9 of the Agent Intelligence transformation pipeline.
 *
 * Converts upstream pipeline outputs into deployment-ready configuration
 * artifacts: agent configs, skill manifests, integration specs, and an
 * implementation roadmap.
 *
 * All processing is deterministic: same input → same output.
 * Sort order is stable; all arrays are sorted before return.
 */

import type {
  AgentComposition,
  AgentProfile,
  AgentRole,
  SkillLibrary,
  Skill,
  IntegrationRiskAnalysis,
  IntegrationRequirement,
  IntegrationType,
  RiskItem,
  OpportunityAnalysis,
  WorkflowStructure,
  AgentConfigArtifact,
  SkillManifestArtifact,
  IntegrationConfigArtifact,
  RoadmapPhase,
  ArtifactOutput,
} from './types.js';

// ─── Setup step templates ─────────────────────────────────────────────────────

const SETUP_STEPS_BY_TYPE: Record<IntegrationType, string[]> = {
  oauth: [
    'Register OAuth2 application',
    'Configure redirect URIs',
    'Implement token refresh flow',
    'Store credentials securely',
  ],
  rest_api: [
    'Obtain API credentials',
    'Configure API base URL',
    'Implement authentication',
    'Test API connectivity',
  ],
  webhook: [
    'Register webhook endpoint',
    'Configure event subscriptions',
    'Implement webhook handler',
    'Verify webhook signatures',
  ],
  browser_rpa: [
    'Configure browser automation environment',
    'Define page selectors',
    'Implement error recovery',
    'Add screenshot-based validation',
  ],
  email_imap: [
    'Configure IMAP/SMTP credentials',
    'Set up email parsing rules',
    'Implement attachment handling',
  ],
  file_sync: [
    'Configure storage credentials',
    'Set up file sync rules',
    'Implement conflict resolution',
  ],
};

// ─── Estimated setup time by complexity ──────────────────────────────────────

function estimatedSetupTime(complexity: number): string {
  if (complexity <= 1) return '< 1 day';
  if (complexity <= 2) return '1-2 days';
  if (complexity <= 3) return '3-5 days';
  if (complexity <= 4) return '1-2 weeks';
  return '2-4 weeks';
}

// ─── Max concurrent tasks by role ────────────────────────────────────────────

function maxConcurrentTasksByRole(role: AgentRole): number {
  switch (role) {
    case 'executor':     return 5;
    case 'orchestrator': return 1;
    case 'assistant':    return 3;
    case 'monitor':      return 10;
    case 'specialist':   return 3;
  }
}

// ─── Retry policy by role ────────────────────────────────────────────────────

function retryPolicyByRole(role: AgentRole): { maxRetries: number; backoffMs: number } {
  switch (role) {
    case 'executor':     return { maxRetries: 3, backoffMs: 1000 };
    case 'orchestrator': return { maxRetries: 2, backoffMs: 2000 };
    case 'assistant':    return { maxRetries: 1, backoffMs: 5000 };
    case 'monitor':      return { maxRetries: 5, backoffMs: 500 };
    case 'specialist':   return { maxRetries: 3, backoffMs: 1000 };
  }
}

// ─── Part A: Agent Config Artifacts ──────────────────────────────────────────

function buildAgentConfigArtifact(agent: AgentProfile): AgentConfigArtifact {
  return {
    agentId: agent.agentId,
    name: agent.agentName,
    description: agent.description,
    role: agent.role,
    interactionMode: agent.interactionMode,
    config: {
      systems: agent.systems,
      tools: agent.tools,
      skills: agent.skillIds,
      maxConcurrentTasks: maxConcurrentTasksByRole(agent.role),
      requiresHumanApproval: agent.interactionMode === 'approval_required',
      retryPolicy: retryPolicyByRole(agent.role),
    },
    taskPlan: agent.tasks,
  };
}

function buildAgentConfigs(agentComposition: AgentComposition): AgentConfigArtifact[] {
  return agentComposition.agents
    .map(buildAgentConfigArtifact)
    .sort((a, b) => a.agentId.localeCompare(b.agentId));
}

// ─── Part B: Skill Manifest Artifacts ────────────────────────────────────────

function buildSkillManifestArtifact(skill: Skill): SkillManifestArtifact {
  return {
    skillId: skill.skillId,
    name: skill.skillName,
    description: skill.description,
    skillType: skill.skillType,
    inputs: skill.inputSchema,
    outputs: skill.outputSchema,
    requiredIntegrations: skill.requiredSystems.map(sys => `int-${sys}`),
    autonomous: skill.automationClassification === 'full_automation',
    reusabilityScore: skill.reusabilityScore,
  };
}

function buildSkillManifests(skillLibrary: SkillLibrary): SkillManifestArtifact[] {
  return skillLibrary.skills
    .map(buildSkillManifestArtifact)
    .sort((a, b) => a.skillId.localeCompare(b.skillId));
}

// ─── Part C: Integration Config Artifacts ────────────────────────────────────

function buildIntegrationConfigArtifact(integration: IntegrationRequirement): IntegrationConfigArtifact {
  return {
    integrationId: integration.integrationId,
    system: integration.system,
    name: integration.integrationName,
    integrationType: integration.integrationType,
    readiness: integration.readiness,
    capabilities: integration.requiredCapabilities,
    setupSteps: SETUP_STEPS_BY_TYPE[integration.integrationType],
    complexity: integration.complexity,
    estimatedSetupTime: estimatedSetupTime(integration.complexity),
  };
}

function buildIntegrationConfigs(integrationRisk: IntegrationRiskAnalysis): IntegrationConfigArtifact[] {
  return integrationRisk.integrations
    .map(buildIntegrationConfigArtifact)
    .sort((a, b) => {
      // Descending complexity, then ascending integrationId for stability
      if (b.complexity !== a.complexity) return b.complexity - a.complexity;
      return a.integrationId.localeCompare(b.integrationId);
    });
}

// ─── Part D: Implementation Roadmap ──────────────────────────────────────────

function integrationComplexitySum(integrations: IntegrationRequirement[]): number {
  return integrations.reduce((sum, i) => sum + i.complexity, 0);
}

function effortByComplexitySum(sum: number): string {
  if (sum <= 5)  return '1-2 days';
  if (sum <= 10) return '3-5 days';
  if (sum <= 15) return '1-2 weeks';
  return '2-3 weeks';
}

function effortByAgentCount(count: number): string {
  if (count <= 1) return '1-2 days';
  if (count <= 3) return '3-5 days';
  return '1-2 weeks';
}

function agentSystemIntegrationIds(
  agents: AgentProfile[],
  integrations: IntegrationRequirement[],
): string[] {
  const systems = new Set(agents.flatMap(a => a.systems));
  return integrations
    .filter(i => systems.has(i.system))
    .map(i => i.integrationId)
    .sort();
}

function riskIdsByCategories(
  risks: RiskItem[],
  categories: string[],
): string[] {
  return risks
    .filter(r => categories.includes(r.category))
    .map(r => r.riskId)
    .sort();
}

function buildRoadmap(
  agentComposition: AgentComposition,
  integrationRisk: IntegrationRiskAnalysis,
): RoadmapPhase[] {
  const { agents } = agentComposition;
  const { integrations, risks } = integrationRisk;

  const executorAgents = agents.filter(a => a.role === 'executor');
  const assistantSpecialistAgents = agents.filter(a => a.role === 'assistant' || a.role === 'specialist');
  const orchestratorAgents = agents.filter(a => a.role === 'orchestrator');
  const monitorAgents = agents.filter(a => a.role === 'monitor');

  const rawPhases: Array<{
    title: string;
    description: string;
    agentIds: string[];
    integrationIds: string[];
    riskIds: string[];
    estimatedEffort: string;
    prerequisites: number[]; // raw phase numbers before re-numbering
    alwaysInclude: boolean;
  }> = [];

  // Phase 1: Foundation — Integration Setup (always included)
  const phase1IntegrationIds = integrations
    .slice()
    .sort((a, b) => a.complexity - b.complexity || a.integrationId.localeCompare(b.integrationId))
    .map(i => i.integrationId);

  rawPhases.push({
    title: 'Foundation — Integration Setup',
    description: 'Set up required API integrations and authentication flows',
    agentIds: [],
    integrationIds: phase1IntegrationIds,
    riskIds: riskIdsByCategories(risks, ['security', 'integration']),
    estimatedEffort: effortByComplexitySum(integrationComplexitySum(integrations)),
    prerequisites: [],
    alwaysInclude: true,
  });

  // Phase 2: Quick Wins — Deploy Executor Agents
  const phase2AgentIds = executorAgents.map(a => a.agentId).sort();
  const phase2IntegrationIds = agentSystemIntegrationIds(executorAgents, integrations);

  rawPhases.push({
    title: 'Quick Wins — Deploy Executor Agents',
    description: 'Deploy fully autonomous agents that handle deterministic tasks',
    agentIds: phase2AgentIds,
    integrationIds: phase2IntegrationIds,
    riskIds: riskIdsByCategories(risks, ['reliability']),
    estimatedEffort: effortByAgentCount(executorAgents.length),
    prerequisites: [1],
    alwaysInclude: false,
  });

  // Phase 3: AI Assistance — Deploy Assistant & Specialist Agents
  const phase3AgentIds = assistantSpecialistAgents.map(a => a.agentId).sort();
  const phase3IntegrationIds = agentSystemIntegrationIds(assistantSpecialistAgents, integrations);

  rawPhases.push({
    title: 'AI Assistance — Deploy Assistant & Specialist Agents',
    description: 'Deploy AI-assisted agents that work alongside humans',
    agentIds: phase3AgentIds,
    integrationIds: phase3IntegrationIds,
    riskIds: riskIdsByCategories(risks, ['human_displacement', 'compliance']),
    estimatedEffort: effortByAgentCount(assistantSpecialistAgents.length),
    prerequisites: [1],
    alwaysInclude: false,
  });

  // Phase 4: Orchestration — Deploy Orchestrator (only if orchestrator exists)
  if (orchestratorAgents.length > 0) {
    const phase4AgentIds = orchestratorAgents.map(a => a.agentId).sort();
    rawPhases.push({
      title: 'Orchestration — Deploy Orchestrator',
      description: 'Deploy the workflow orchestrator to coordinate all agents',
      agentIds: phase4AgentIds,
      integrationIds: [],
      riskIds: riskIdsByCategories(risks, ['complexity', 'data_integrity']),
      estimatedEffort: '3-5 days',
      prerequisites: [2, 3],
      alwaysInclude: false,
    });
  }

  // Final Phase: Optimization — Monitor & Improve (always included)
  const monitorAgentIds = monitorAgents.map(a => a.agentId).sort();
  rawPhases.push({
    title: 'Optimization — Monitor & Improve',
    description: 'Monitor agent performance and optimize based on real-world data',
    agentIds: monitorAgentIds,
    integrationIds: [],
    riskIds: [],
    estimatedEffort: 'Ongoing',
    prerequisites: [], // filled after filtering
    alwaysInclude: true,
  });

  // Filter: keep phase 1, final optimization, and phases with agentIds OR integrationIds
  const keptIndices: number[] = [];
  for (let i = 0; i < rawPhases.length; i++) {
    const p = rawPhases[i];
    if (p === undefined) continue;
    const isFirst = i === 0;
    const isLast = i === rawPhases.length - 1;
    const hasContent = p.agentIds.length > 0 || p.integrationIds.length > 0;
    if (isFirst || isLast || hasContent) {
      keptIndices.push(i);
    }
  }

  // Build old index → new phase number mapping
  const oldToNew = new Map<number, number>();
  keptIndices.forEach((oldIdx, pos) => {
    oldToNew.set(oldIdx + 1, pos + 1); // rawPhases are 1-indexed by position+1
  });

  // Also need old raw phase numbers (1-based) for the prerequisites
  // rawPhases[0] = raw phase 1, rawPhases[1] = raw phase 2, etc.
  const keptRawPhaseNumbers = new Set(keptIndices.map(i => i + 1));

  // Build final phases
  const finalPhases: RoadmapPhase[] = keptIndices.map((oldIdx, pos) => {
    const p = rawPhases[oldIdx];
    if (p === undefined) {
      throw new Error(`Invariant violation: rawPhases[${oldIdx}] is undefined`);
    }
    const newPhaseNumber = pos + 1;

    // Remap prerequisites: filter to only kept phases, map to new numbers
    let prerequisites: number[];
    if (oldIdx === rawPhases.length - 1) {
      // Last (optimization) phase — prerequisites are all previous kept phases
      prerequisites = keptIndices
        .filter((_, j) => j < keptIndices.length - 1)
        .map((_, j) => j + 1);
    } else {
      prerequisites = p.prerequisites
        .filter(rawNum => keptRawPhaseNumbers.has(rawNum))
        .map(rawNum => {
          // rawNum is a 1-based raw phase number; find its new number
          const newNum = oldToNew.get(rawNum);
          return newNum ?? rawNum;
        })
        .sort((a, b) => a - b);
    }

    return {
      phase: newPhaseNumber,
      title: p.title,
      description: p.description,
      agentIds: p.agentIds,
      integrationIds: p.integrationIds,
      riskIds: p.riskIds,
      estimatedEffort: p.estimatedEffort,
      prerequisites,
    };
  });

  return finalPhases;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate deployment-ready configuration artifacts from upstream pipeline outputs.
 *
 * @param agentComposition - Stage 7 output: composed agent profiles
 * @param skillLibrary - Stage 5 output: extracted skill library
 * @param integrationRisk - Stage 8 output: integration mapping and risk assessment
 * @param opportunities - Stage 6 output: detected opportunities
 * @param workflow - Stage 4 output: workflow structure
 * @returns Complete artifact output ready for deployment
 */
export function generateArtifacts(
  agentComposition: AgentComposition,
  skillLibrary: SkillLibrary,
  integrationRisk: IntegrationRiskAnalysis,
  opportunities: OpportunityAnalysis,
  workflow: WorkflowStructure,
): ArtifactOutput {
  const agentConfigs = buildAgentConfigs(agentComposition);
  const skillManifests = buildSkillManifests(skillLibrary);
  const integrationConfigs = buildIntegrationConfigs(integrationRisk);
  const roadmap = buildRoadmap(agentComposition, integrationRisk);

  return {
    agentConfigs,
    skillManifests,
    integrationConfigs,
    roadmap,
    summary: {
      totalAgents: agentConfigs.length,
      totalSkills: skillManifests.length,
      totalIntegrations: integrationConfigs.length,
      totalPhases: roadmap.length,
      automationScore: workflow.automationScore,
      implementationReadinessScore: integrationRisk.implementationReadinessScore,
      estimatedTimeSavingsMs: opportunities.totalEstimatedTimeSavingsMs,
    },
  };
}
