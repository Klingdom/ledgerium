/**
 * Comprehensive tests for the Artifact Generator pipeline stage (Stage 9).
 *
 * Tests cover:
 * 1. Agent Config Artifacts
 * 2. Skill Manifest Artifacts
 * 3. Integration Config Artifacts
 * 4. Roadmap Generation
 * 5. Summary Statistics
 * 6. Edge Cases
 * 7. Integration with Full Pipeline
 */

import { describe, it, expect } from 'vitest';
import type {
  AgentProfile,
  AgentComposition,
  AgentRole,
  AgentInteractionMode,
  AgentTool,
  AgentTask,
  AgentCollaboration,
  Skill,
  SkillCluster,
  SkillLibrary,
  IntegrationRequirement,
  IntegrationReadiness,
  IntegrationType,
  RiskItem,
  RiskSeverity,
  RiskCategory,
  IntegrationRiskAnalysis,
  OpportunityAnalysis,
  WorkflowStructure,
  AutomationType,
  InferenceMethod,
} from './types.js';
import type {
  ProcessOutput,
  ProcessRun,
  ProcessDefinition,
  StepDefinition,
  ProcessMap,
  SOP,
  SOPStep,
  SOPInstruction,
  ProcessMapNode,
  ProcessMapEdge,
  GroupingReason,
} from '@ledgerium/process-engine';
import { generateArtifacts } from './artifact-generator.js';
import { transformWorkflow } from './transform.js';

// ─── Unit fixture helpers ─────────────────────────────────────────────────────

function makeAgentTool(overrides: Partial<AgentTool> = {}): AgentTool {
  return {
    toolId: 'gmail_send_email',
    toolName: 'Send Email',
    system: 'gmail',
    capability: 'send_email',
    required: true,
    ...overrides,
  };
}

function makeAgentTask(overrides: Partial<AgentTask> = {}): AgentTask {
  return {
    taskId: 'task-1',
    description: 'Handle email operations',
    activityIds: ['act-1'],
    stepIds: ['step-1'],
    requiredSkillIds: ['skill-send_email'],
    executionOrder: 1,
    requiresApproval: false,
    estimatedDurationMs: 5000,
    ...overrides,
  };
}

function makeAgentProfile(overrides: Partial<AgentProfile> = {}): AgentProfile {
  return {
    agentId: 'agent-1',
    agentName: 'Test Agent',
    description: 'A test agent',
    role: 'specialist',
    interactionMode: 'supervised',
    skillIds: ['skill-do_thing'],
    tools: [makeAgentTool()],
    tasks: [makeAgentTask()],
    systems: ['gmail'],
    opportunityIds: [],
    coveredActivityIds: ['act-1'],
    coveredStepIds: ['step-1'],
    automationClassification: 'full_automation',
    capabilityScore: 80,
    confidence: 0.9,
    ...overrides,
  };
}

function makeAgentComposition(overrides: Partial<AgentComposition> = {}): AgentComposition {
  const agents = overrides.agents ?? [];
  return {
    agents,
    collaborations: [],
    agentCount: agents.length,
    coveredStepCount: 0,
    coverageRatio: 0,
    roleDistribution: {
      executor: 0,
      assistant: 0,
      orchestrator: 0,
      monitor: 0,
      specialist: 0,
    },
    averageCapabilityScore: 0,
    ...overrides,
  };
}

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    skillId: 'skill-send_email',
    skillName: 'send_email',
    description: 'Send an email',
    skillType: 'communication',
    inputSchema: [{ name: 'recipient', description: 'Email recipient', required: true }],
    outputSchema: [{ name: 'message_id', description: 'Sent message ID', required: true }],
    requiredSystems: ['gmail'],
    sourceStepIds: ['step-1'],
    sourceActivityIds: ['act-1'],
    automationClassification: 'full_automation',
    reusabilityScore: 0.8,
    confidence: 0.9,
    verb: 'send',
    object: 'email',
    ...overrides,
  };
}

function makeSkillLibrary(overrides: Partial<SkillLibrary> = {}): SkillLibrary {
  return {
    skills: [],
    clusters: [],
    uniqueSkillCount: 0,
    reusableSkillCount: 0,
    skillTypeDistribution: {
      data_extraction: 0,
      data_entry: 0,
      navigation: 0,
      verification: 0,
      communication: 0,
      file_operation: 0,
      decision: 0,
      integration: 0,
      monitoring: 0,
    },
    ...overrides,
  };
}

function makeIntegrationRequirement(overrides: Partial<IntegrationRequirement> = {}): IntegrationRequirement {
  return {
    integrationId: 'int-gmail',
    system: 'gmail',
    integrationName: 'Gmail Integration',
    integrationType: 'oauth',
    readiness: 'api_available',
    requiredCapabilities: ['send_email', 'read_email'],
    dependentAgentIds: ['agent-1'],
    dependentSkillIds: ['skill-send_email'],
    affectedStepIds: ['step-1'],
    complexity: 2,
    notes: 'OAuth2 required',
    ...overrides,
  };
}

function makeRiskItem(overrides: Partial<RiskItem> = {}): RiskItem {
  return {
    riskId: 'risk-1',
    category: 'security',
    severity: 'medium',
    title: 'OAuth token exposure',
    description: 'Risk of token exposure',
    impact: 'Unauthorized access',
    mitigation: 'Store tokens securely',
    affectedStepIds: ['step-1'],
    affectedAgentIds: ['agent-1'],
    systems: ['gmail'],
    confidence: 0.8,
    ...overrides,
  };
}

function makeIntegrationRiskAnalysis(overrides: Partial<IntegrationRiskAnalysis> = {}): IntegrationRiskAnalysis {
  const integrations = overrides.integrations ?? [];
  const risks = overrides.risks ?? [];
  return {
    integrations,
    risks,
    integrationCount: integrations.length,
    readinessBreakdown: {
      api_available: 0,
      api_limited: 0,
      no_api: 0,
      unknown: 0,
    },
    riskCount: risks.length,
    severityBreakdown: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
    categoryBreakdown: {
      data_integrity: 0,
      security: 0,
      reliability: 0,
      compliance: 0,
      human_displacement: 0,
      integration: 0,
      complexity: 0,
    },
    overallRiskLevel: 'low',
    implementationReadinessScore: 75,
    ...overrides,
  };
}

function makeOpportunityAnalysis(overrides: Partial<OpportunityAnalysis> = {}): OpportunityAnalysis {
  return {
    opportunities: [],
    totalOpportunities: 0,
    categoryBreakdown: {
      repetition: 0,
      deterministic_logic: 0,
      data_movement: 0,
      content_generation: 0,
      multi_system_orchestration: 0,
      friction_reduction: 0,
      decision_support: 0,
    },
    classificationBreakdown: {
      automation_candidate: 0,
      ai_assist_candidate: 0,
      integration_opportunity: 0,
      agent_orchestration_candidate: 0,
    },
    topScore: 0,
    totalEstimatedTimeSavingsMs: null,
    ...overrides,
  };
}

function makeWorkflow(overrides: Partial<WorkflowStructure> = {}): WorkflowStructure {
  return {
    workflowId: 'run-test-001',
    workflowName: 'Test Workflow',
    activities: [],
    decisionPoints: [],
    systems: [],
    totalDurationMs: null,
    stepCount: 0,
    activityCount: 0,
    dependencies: [],
    automationClassification: 'full_automation',
    automationScore: 85,
    confidence: 0.9,
    ...overrides,
  };
}

// ─── Full pipeline fixture helpers ────────────────────────────────────────────

function makeProcessRun(overrides: Partial<ProcessRun> = {}): ProcessRun {
  return {
    runId: 'run-test-001',
    sessionId: 'session-001',
    activityName: 'Test Workflow',
    startedAt: '2024-01-15T09:00:00Z',
    endedAt: '2024-01-15T09:05:00Z',
    durationMs: 300000,
    durationLabel: '5m 0s',
    stepCount: 0,
    eventCount: 0,
    humanEventCount: 0,
    systemEventCount: 0,
    systemsUsed: [],
    errorStepCount: 0,
    navigationStepCount: 0,
    completionStatus: 'complete',
    engineVersion: '1.2.0',
    ...overrides,
  };
}

function makeStepDefinition(ordinal: number, overrides: Partial<StepDefinition> = {}): StepDefinition {
  const base: StepDefinition = {
    ordinal,
    stepId: `step-${ordinal}`,
    title: `Step ${ordinal}`,
    category: 'single_action',
    categoryLabel: 'Action',
    categoryColor: '#94a3b8',
    categoryBg: 'rgba(148,163,184,0.07)',
    operationalDefinition: '',
    purpose: '',
    systems: [],
    domains: [],
    inputs: [],
    outputs: [],
    completionCondition: '',
    confidence: 0.9,
    durationMs: 5000,
    durationLabel: '5s',
    eventCount: 1,
    hasSensitiveEvents: false,
    sourceEventIds: [`evt-${ordinal}-a`, `evt-${ordinal}-b`],
  };
  return { ...base, ...overrides };
}

function makeSOPInstruction(sequence: number, instruction: string): SOPInstruction {
  return {
    sequence,
    instruction,
    eventType: 'interaction.click',
    sourceEventId: `evt-sop-${sequence}`,
    isSensitive: false,
    redacted: false,
    instructionType: 'action',
  };
}

function makeSOPStep(ordinal: number, stepId: string, overrides: Partial<SOPStep> = {}): SOPStep {
  return {
    ordinal,
    stepId,
    title: `SOP Step ${ordinal}`,
    category: 'single_action',
    action: `Perform step ${ordinal}`,
    instructions: [makeSOPInstruction(1, `Perform step ${ordinal}`)],
    detail: `1. Perform step ${ordinal}`,
    inputs: [],
    expectedOutcome: `Step ${ordinal} completed`,
    warnings: [],
    durationLabel: '5s',
    confidence: 0.9,
    sourceStepId: stepId,
    ...overrides,
  };
}

function makeMapNode(stepId: string, ordinal: number, category: GroupingReason = 'single_action'): ProcessMapNode {
  return {
    id: `node-${ordinal}`,
    stepId,
    ordinal,
    title: `Node ${ordinal}`,
    nodeType: 'task',
    category,
    categoryLabel: 'Action',
    categoryColor: '#94a3b8',
    categoryBg: 'rgba(148,163,184,0.07)',
    position: { x: 0, y: ordinal * 100 },
    metadata: {
      systems: [],
      durationLabel: '5s',
      eventCount: 1,
      humanEventCount: 1,
      eventTypeSummary: {},
    },
  };
}

function makeMapEdge(source: string, target: string, index: number): ProcessMapEdge {
  return {
    id: `edge-${index}`,
    source,
    target,
    type: 'sequence',
    boundaryLabel: 'Completed',
  };
}

function makeProcessMap(nodes: ProcessMapNode[], edges: ProcessMapEdge[]): ProcessMap {
  return {
    id: 'map-001',
    name: 'Test Map',
    version: '1.0.0',
    sessionId: 'session-001',
    systems: [],
    phases: [],
    nodes,
    edges,
  };
}

function makeSOP(steps: SOPStep[]): SOP {
  return {
    sopId: 'sop-001',
    title: 'Test SOP',
    version: '1.0.0',
    purpose: 'Test purpose',
    scope: 'Test scope',
    systems: [],
    prerequisites: [],
    estimatedTime: '5 minutes',
    inputs: [],
    outputs: [],
    completionCriteria: [],
    steps,
    notes: [],
    generatedAt: '2024-01-15T09:00:00Z',
  };
}

function makeProcessDefinition(steps: StepDefinition[]): ProcessDefinition {
  return {
    definitionId: 'def-001',
    name: 'Test Process',
    version: '1.0.0',
    description: 'Test process definition',
    purpose: 'Test purpose',
    scope: 'Test scope',
    systems: [],
    domains: [],
    estimatedDurationLabel: '5m',
    stepDefinitions: steps,
    ruleVersion: '1.0.0',
  };
}

// ─── 1. Agent Config Artifacts ────────────────────────────────────────────────

describe('1. Agent Config Artifacts', () => {
  it('produces one AgentConfigArtifact per AgentProfile', () => {
    const agents = [
      makeAgentProfile({ agentId: 'agent-1', role: 'executor' }),
      makeAgentProfile({ agentId: 'agent-2', role: 'assistant' }),
    ];
    const composition = makeAgentComposition({ agents });
    const result = generateArtifacts(composition, makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    expect(result.agentConfigs).toHaveLength(2);
  });

  it('executor role has maxConcurrentTasks=5', () => {
    const agents = [makeAgentProfile({ agentId: 'agent-1', role: 'executor' })];
    const result = generateArtifacts(makeAgentComposition({ agents }), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.agentConfigs[0]!.config.maxConcurrentTasks).toBe(5);
  });

  it('orchestrator role has maxConcurrentTasks=1', () => {
    const agents = [makeAgentProfile({ agentId: 'agent-1', role: 'orchestrator' })];
    const result = generateArtifacts(makeAgentComposition({ agents }), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.agentConfigs[0]!.config.maxConcurrentTasks).toBe(1);
  });

  it('monitor role has maxConcurrentTasks=10', () => {
    const agents = [makeAgentProfile({ agentId: 'agent-1', role: 'monitor' })];
    const result = generateArtifacts(makeAgentComposition({ agents }), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.agentConfigs[0]!.config.maxConcurrentTasks).toBe(10);
  });

  it('assistant and specialist roles have maxConcurrentTasks=3', () => {
    const agents = [
      makeAgentProfile({ agentId: 'agent-1', role: 'assistant' }),
      makeAgentProfile({ agentId: 'agent-2', role: 'specialist' }),
    ];
    const result = generateArtifacts(makeAgentComposition({ agents }), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    const sorted = result.agentConfigs;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(sorted.find(a => a.agentId === 'agent-1')!.config.maxConcurrentTasks).toBe(3);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(sorted.find(a => a.agentId === 'agent-2')!.config.maxConcurrentTasks).toBe(3);
  });

  it('retryPolicy varies by role (executor=3/1000, orchestrator=2/2000, monitor=5/500)', () => {
    const agents = [
      makeAgentProfile({ agentId: 'agent-e', role: 'executor' }),
      makeAgentProfile({ agentId: 'agent-o', role: 'orchestrator' }),
      makeAgentProfile({ agentId: 'agent-m', role: 'monitor' }),
    ];
    const result = generateArtifacts(makeAgentComposition({ agents }), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    const cfg = result.agentConfigs;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(cfg.find(a => a.agentId === 'agent-e')!.config.retryPolicy).toEqual({ maxRetries: 3, backoffMs: 1000 });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(cfg.find(a => a.agentId === 'agent-o')!.config.retryPolicy).toEqual({ maxRetries: 2, backoffMs: 2000 });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(cfg.find(a => a.agentId === 'agent-m')!.config.retryPolicy).toEqual({ maxRetries: 5, backoffMs: 500 });
  });

  it('requiresHumanApproval=true when interactionMode is approval_required', () => {
    const agents = [
      makeAgentProfile({ agentId: 'agent-a', interactionMode: 'approval_required' }),
      makeAgentProfile({ agentId: 'agent-b', interactionMode: 'autonomous' }),
    ];
    const result = generateArtifacts(makeAgentComposition({ agents }), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.agentConfigs.find(a => a.agentId === 'agent-a')!.config.requiresHumanApproval).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.agentConfigs.find(a => a.agentId === 'agent-b')!.config.requiresHumanApproval).toBe(false);
  });

  it('tools and skills are copied from AgentProfile', () => {
    const tool = makeAgentTool({ toolId: 'gmail_read_email', toolName: 'Read Email' });
    const agents = [makeAgentProfile({ agentId: 'agent-1', tools: [tool], skillIds: ['skill-read_email', 'skill-send_email'] })];
    const result = generateArtifacts(makeAgentComposition({ agents }), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const cfg = result.agentConfigs[0]!;
    expect(cfg.config.tools).toEqual([tool]);
    expect(cfg.config.skills).toEqual(['skill-read_email', 'skill-send_email']);
  });

  it('taskPlan matches agent tasks array', () => {
    const task1 = makeAgentTask({ taskId: 'task-1', executionOrder: 1 });
    const task2 = makeAgentTask({ taskId: 'task-2', executionOrder: 2 });
    const agents = [makeAgentProfile({ agentId: 'agent-1', tasks: [task1, task2] })];
    const result = generateArtifacts(makeAgentComposition({ agents }), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.agentConfigs[0]!.taskPlan).toEqual([task1, task2]);
  });

  it('agentConfigs are sorted by agentId', () => {
    const agents = [
      makeAgentProfile({ agentId: 'agent-z' }),
      makeAgentProfile({ agentId: 'agent-a' }),
      makeAgentProfile({ agentId: 'agent-m' }),
    ];
    const result = generateArtifacts(makeAgentComposition({ agents }), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    const ids = result.agentConfigs.map(a => a.agentId);
    expect(ids).toEqual(['agent-a', 'agent-m', 'agent-z']);
  });
});

// ─── 2. Skill Manifest Artifacts ─────────────────────────────────────────────

describe('2. Skill Manifest Artifacts', () => {
  it('produces one SkillManifestArtifact per Skill', () => {
    const skills = [
      makeSkill({ skillId: 'skill-send_email' }),
      makeSkill({ skillId: 'skill-read_report' }),
    ];
    const library = makeSkillLibrary({ skills });
    const result = generateArtifacts(makeAgentComposition(), library, makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    expect(result.skillManifests).toHaveLength(2);
  });

  it('autonomous=true when automationClassification is full_automation', () => {
    const skills = [makeSkill({ skillId: 'skill-auto', automationClassification: 'full_automation' })];
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary({ skills }), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.skillManifests[0]!.autonomous).toBe(true);
  });

  it('autonomous=false for ai_assisted classification', () => {
    const skills = [makeSkill({ skillId: 'skill-assisted', automationClassification: 'ai_assisted' })];
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary({ skills }), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.skillManifests[0]!.autonomous).toBe(false);
  });

  it('autonomous=false for human_in_loop classification', () => {
    const skills = [makeSkill({ skillId: 'skill-hil', automationClassification: 'human_in_loop' })];
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary({ skills }), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.skillManifests[0]!.autonomous).toBe(false);
  });

  it('requiredIntegrations maps requiredSystems to int-{system}', () => {
    const skills = [makeSkill({ skillId: 'skill-multi', requiredSystems: ['gmail', 'netsuite'] })];
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary({ skills }), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.skillManifests[0]!.requiredIntegrations).toEqual(['int-gmail', 'int-netsuite']);
  });

  it('inputs and outputs are copied from inputSchema/outputSchema', () => {
    const inputs = [{ name: 'email_body', description: 'Email content', required: true }];
    const outputs = [{ name: 'sent_id', description: 'Message ID', required: false }];
    const skills = [makeSkill({ skillId: 'skill-s', inputSchema: inputs, outputSchema: outputs })];
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary({ skills }), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.skillManifests[0]!.inputs).toEqual(inputs);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.skillManifests[0]!.outputs).toEqual(outputs);
  });

  it('skillManifests are sorted by skillId', () => {
    const skills = [
      makeSkill({ skillId: 'skill-z' }),
      makeSkill({ skillId: 'skill-a' }),
    ];
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary({ skills }), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    expect(result.skillManifests.map(s => s.skillId)).toEqual(['skill-a', 'skill-z']);
  });
});

// ─── 3. Integration Config Artifacts ─────────────────────────────────────────

describe('3. Integration Config Artifacts', () => {
  it('produces one IntegrationConfigArtifact per IntegrationRequirement', () => {
    const integrations = [
      makeIntegrationRequirement({ integrationId: 'int-gmail', system: 'gmail' }),
      makeIntegrationRequirement({ integrationId: 'int-netsuite', system: 'netsuite' }),
    ];
    const analysis = makeIntegrationRiskAnalysis({ integrations });
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), analysis, makeOpportunityAnalysis(), makeWorkflow());
    expect(result.integrationConfigs).toHaveLength(2);
  });

  it('oauth integrationType → 4 setup steps starting with "Register OAuth2"', () => {
    const integrations = [makeIntegrationRequirement({ integrationId: 'int-gmail', integrationType: 'oauth' })];
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis({ integrations }), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const cfg = result.integrationConfigs[0]!;
    expect(cfg.setupSteps).toHaveLength(4);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(cfg.setupSteps[0]!).toBe('Register OAuth2 application');
  });

  it('rest_api integrationType → 4 setup steps starting with "Obtain API"', () => {
    const integrations = [makeIntegrationRequirement({ integrationId: 'int-ns', integrationType: 'rest_api' })];
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis({ integrations }), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const cfg = result.integrationConfigs[0]!;
    expect(cfg.setupSteps).toHaveLength(4);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(cfg.setupSteps[0]!).toBe('Obtain API credentials');
  });

  it('browser_rpa integrationType → 4 setup steps starting with "Configure browser"', () => {
    const integrations = [makeIntegrationRequirement({ integrationId: 'int-rpa', integrationType: 'browser_rpa' })];
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis({ integrations }), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const cfg = result.integrationConfigs[0]!;
    expect(cfg.setupSteps).toHaveLength(4);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(cfg.setupSteps[0]!).toBe('Configure browser automation environment');
  });

  it('estimatedSetupTime for complexity=1 is "< 1 day"', () => {
    const integrations = [makeIntegrationRequirement({ integrationId: 'int-easy', complexity: 1 })];
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis({ integrations }), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.integrationConfigs[0]!.estimatedSetupTime).toBe('< 1 day');
  });

  it('estimatedSetupTime for complexity=5 is "2-4 weeks"', () => {
    const integrations = [makeIntegrationRequirement({ integrationId: 'int-hard', complexity: 5 })];
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis({ integrations }), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.integrationConfigs[0]!.estimatedSetupTime).toBe('2-4 weeks');
  });

  it('integrationConfigs are sorted by complexity descending, then integrationId ascending', () => {
    const integrations = [
      makeIntegrationRequirement({ integrationId: 'int-b', complexity: 3 }),
      makeIntegrationRequirement({ integrationId: 'int-a', complexity: 5 }),
      makeIntegrationRequirement({ integrationId: 'int-c', complexity: 3 }),
    ];
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis({ integrations }), makeOpportunityAnalysis(), makeWorkflow());
    const ids = result.integrationConfigs.map(i => i.integrationId);
    expect(ids[0]).toBe('int-a'); // complexity 5 first
    expect(ids[1]).toBe('int-b'); // complexity 3, 'b' < 'c'
    expect(ids[2]).toBe('int-c');
  });

  it('capabilities are copied from requiredCapabilities', () => {
    const integrations = [makeIntegrationRequirement({ integrationId: 'int-g', requiredCapabilities: ['send_email', 'list_emails'] })];
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis({ integrations }), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.integrationConfigs[0]!.capabilities).toEqual(['send_email', 'list_emails']);
  });
});

// ─── 4. Roadmap Generation ────────────────────────────────────────────────────

describe('4. Roadmap Generation', () => {
  it('always has Phase 1 (Foundation)', () => {
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const phase1 = result.roadmap[0]!;
    expect(phase1.phase).toBe(1);
    expect(phase1.title).toContain('Foundation');
  });

  it('Phase 2 includes executor agents only', () => {
    const agents = [
      makeAgentProfile({ agentId: 'agent-exec', role: 'executor', systems: ['gmail'] }),
      makeAgentProfile({ agentId: 'agent-assist', role: 'assistant', systems: ['netsuite'] }),
    ];
    const integrations = [
      makeIntegrationRequirement({ integrationId: 'int-gmail', system: 'gmail' }),
      makeIntegrationRequirement({ integrationId: 'int-netsuite', system: 'netsuite' }),
    ];
    const result = generateArtifacts(
      makeAgentComposition({ agents }),
      makeSkillLibrary(),
      makeIntegrationRiskAnalysis({ integrations }),
      makeOpportunityAnalysis(),
      makeWorkflow(),
    );
    const phase2 = result.roadmap.find(p => p.title.includes('Quick Wins'));
    expect(phase2).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(phase2!.agentIds).toContain('agent-exec');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(phase2!.agentIds).not.toContain('agent-assist');
  });

  it('Phase 3 includes assistant and specialist agents', () => {
    const agents = [
      makeAgentProfile({ agentId: 'agent-exec', role: 'executor', systems: ['gmail'] }),
      makeAgentProfile({ agentId: 'agent-assist', role: 'assistant', systems: ['netsuite'] }),
      makeAgentProfile({ agentId: 'agent-spec', role: 'specialist', systems: ['slack'] }),
    ];
    const integrations = [
      makeIntegrationRequirement({ integrationId: 'int-gmail', system: 'gmail' }),
    ];
    const result = generateArtifacts(
      makeAgentComposition({ agents }),
      makeSkillLibrary(),
      makeIntegrationRiskAnalysis({ integrations }),
      makeOpportunityAnalysis(),
      makeWorkflow(),
    );
    const phase3 = result.roadmap.find(p => p.title.includes('AI Assistance'));
    expect(phase3).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(phase3!.agentIds).toContain('agent-assist');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(phase3!.agentIds).toContain('agent-spec');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(phase3!.agentIds).not.toContain('agent-exec');
  });

  it('Phase 4 (Orchestration) only exists if an orchestrator agent exists', () => {
    // Without orchestrator
    const agentsNoOrch = [makeAgentProfile({ agentId: 'agent-exec', role: 'executor' })];
    const resultNoOrch = generateArtifacts(makeAgentComposition({ agents: agentsNoOrch }), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    expect(resultNoOrch.roadmap.some(p => p.title.includes('Orchestration'))).toBe(false);

    // With orchestrator
    const agentsWithOrch = [
      makeAgentProfile({ agentId: 'agent-exec', role: 'executor' }),
      makeAgentProfile({ agentId: 'agent-orch', role: 'orchestrator' }),
    ];
    const resultWithOrch = generateArtifacts(makeAgentComposition({ agents: agentsWithOrch }), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    expect(resultWithOrch.roadmap.some(p => p.title.includes('Orchestration'))).toBe(true);
  });

  it('final phase is always optimization', () => {
    const agents = [makeAgentProfile({ agentId: 'agent-1', role: 'executor' })];
    const result = generateArtifacts(makeAgentComposition({ agents }), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const lastPhase = result.roadmap.at(-1)!;
    expect(lastPhase.title).toContain('Optimization');
  });

  it('empty phases (0 agents and 0 integrations) are skipped, except Phase 1 and optimization', () => {
    // No agents: only foundation and optimization
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // Middle phases (Quick Wins, AI Assistance) would have 0 agents and 0 integrations
    expect(result.roadmap.some(p => p.title.includes('Quick Wins'))).toBe(false);
    expect(result.roadmap.some(p => p.title.includes('AI Assistance'))).toBe(false);
  });

  it('phases are renumbered sequentially after skipping', () => {
    const agents = [makeAgentProfile({ agentId: 'agent-exec', role: 'executor' })];
    const result = generateArtifacts(makeAgentComposition({ agents }), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    const phaseNumbers = result.roadmap.map(p => p.phase);
    for (let i = 0; i < phaseNumbers.length; i++) {
      expect(phaseNumbers[i]).toBe(i + 1);
    }
  });

  it('Phase 1 prerequisites are empty []', () => {
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.roadmap[0]!.prerequisites).toEqual([]);
  });

  it('Quick Wins phase has Foundation as prerequisite', () => {
    const agents = [makeAgentProfile({ agentId: 'agent-exec', role: 'executor', systems: ['gmail'] })];
    const integrations = [makeIntegrationRequirement({ integrationId: 'int-gmail', system: 'gmail' })];
    const result = generateArtifacts(
      makeAgentComposition({ agents }),
      makeSkillLibrary(),
      makeIntegrationRiskAnalysis({ integrations }),
      makeOpportunityAnalysis(),
      makeWorkflow(),
    );
    const quickWins = result.roadmap.find(p => p.title.includes('Quick Wins'));
    expect(quickWins).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(quickWins!.prerequisites).toContain(1);
  });
});

// ─── 5. Summary Statistics ────────────────────────────────────────────────────

describe('5. Summary Statistics', () => {
  it('totalAgents equals agentConfigs.length', () => {
    const agents = [
      makeAgentProfile({ agentId: 'a-1' }),
      makeAgentProfile({ agentId: 'a-2' }),
    ];
    const result = generateArtifacts(makeAgentComposition({ agents }), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    expect(result.summary.totalAgents).toBe(result.agentConfigs.length);
    expect(result.summary.totalAgents).toBe(2);
  });

  it('totalSkills equals skillManifests.length', () => {
    const skills = [makeSkill({ skillId: 'sk-1' }), makeSkill({ skillId: 'sk-2' }), makeSkill({ skillId: 'sk-3' })];
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary({ skills }), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    expect(result.summary.totalSkills).toBe(result.skillManifests.length);
    expect(result.summary.totalSkills).toBe(3);
  });

  it('totalIntegrations equals integrationConfigs.length', () => {
    const integrations = [
      makeIntegrationRequirement({ integrationId: 'int-a' }),
      makeIntegrationRequirement({ integrationId: 'int-b' }),
    ];
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis({ integrations }), makeOpportunityAnalysis(), makeWorkflow());
    expect(result.summary.totalIntegrations).toBe(result.integrationConfigs.length);
    expect(result.summary.totalIntegrations).toBe(2);
  });

  it('automationScore comes from workflow.automationScore', () => {
    const workflow = makeWorkflow({ automationScore: 72 });
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), workflow);
    expect(result.summary.automationScore).toBe(72);
  });

  it('estimatedTimeSavingsMs comes from opportunities.totalEstimatedTimeSavingsMs', () => {
    const opportunities = makeOpportunityAnalysis({ totalEstimatedTimeSavingsMs: 120000 });
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis(), opportunities, makeWorkflow());
    expect(result.summary.estimatedTimeSavingsMs).toBe(120000);
  });

  it('estimatedTimeSavingsMs is null when opportunities has no timing data', () => {
    const opportunities = makeOpportunityAnalysis({ totalEstimatedTimeSavingsMs: null });
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis(), opportunities, makeWorkflow());
    expect(result.summary.estimatedTimeSavingsMs).toBeNull();
  });
});

// ─── 6. Edge Cases ────────────────────────────────────────────────────────────

describe('6. Edge Cases', () => {
  it('no agents → only foundation and optimization phases', () => {
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    expect(result.roadmap).toHaveLength(2);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.roadmap[0]!.title).toContain('Foundation');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.roadmap[1]!.title).toContain('Optimization');
  });

  it('no integrations → Phase 1 has empty integrationIds', () => {
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.roadmap[0]!.integrationIds).toEqual([]);
  });

  it('no skills → empty skillManifests', () => {
    const result = generateArtifacts(makeAgentComposition(), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    expect(result.skillManifests).toHaveLength(0);
  });

  it('no risks → no riskIds in any phase', () => {
    const agents = [makeAgentProfile({ agentId: 'agent-1', role: 'executor' })];
    const result = generateArtifacts(makeAgentComposition({ agents }), makeSkillLibrary(), makeIntegrationRiskAnalysis(), makeOpportunityAnalysis(), makeWorkflow());
    for (const phase of result.roadmap) {
      expect(phase.riskIds).toEqual([]);
    }
  });

  it('single executor agent → 3 phases (foundation, quick wins, optimization)', () => {
    const agents = [makeAgentProfile({ agentId: 'agent-exec', role: 'executor', systems: ['gmail'] })];
    const integrations = [makeIntegrationRequirement({ integrationId: 'int-gmail', system: 'gmail' })];
    const result = generateArtifacts(
      makeAgentComposition({ agents }),
      makeSkillLibrary(),
      makeIntegrationRiskAnalysis({ integrations }),
      makeOpportunityAnalysis(),
      makeWorkflow(),
    );
    expect(result.roadmap).toHaveLength(3);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.roadmap[0]!.title).toContain('Foundation');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.roadmap[1]!.title).toContain('Quick Wins');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.roadmap[2]!.title).toContain('Optimization');
  });

  it('deterministic: same input always produces same output', () => {
    const agents = [makeAgentProfile({ agentId: 'agent-1', role: 'executor' })];
    const skills = [makeSkill({ skillId: 'skill-1' })];
    const integrations = [makeIntegrationRequirement({ integrationId: 'int-gmail' })];
    const composition = makeAgentComposition({ agents });
    const library = makeSkillLibrary({ skills });
    const analysis = makeIntegrationRiskAnalysis({ integrations });
    const workflow = makeWorkflow();
    const opps = makeOpportunityAnalysis();

    const result1 = generateArtifacts(composition, library, analysis, opps, workflow);
    const result2 = generateArtifacts(composition, library, analysis, opps, workflow);
    expect(result1).toEqual(result2);
  });
});

// ─── 7. Integration with Full Pipeline ───────────────────────────────────────

describe('7. Integration with Full Pipeline', () => {
  // Build a realistic 6-step invoice processing workflow
  const stepDefs: StepDefinition[] = [
    makeStepDefinition(1, {
      stepId: 'step-inv-1',
      title: 'Open email with invoice attachment',
      category: 'click_then_navigate',
      systems: ['gmail'],
      domains: ['mail.google.com'],
      durationMs: 3000,
      sourceEventIds: ['evt-1-a', 'evt-1-b'],
    }),
    makeStepDefinition(2, {
      stepId: 'step-inv-2',
      title: 'Download PDF attachment from email',
      category: 'file_action',
      systems: ['gmail'],
      domains: ['mail.google.com'],
      outputs: ['invoice_pdf'],
      durationMs: 2000,
      sourceEventIds: ['evt-2-a'],
    }),
    makeStepDefinition(3, {
      stepId: 'step-inv-3',
      title: 'Navigate to Accounts Payable module in NetSuite',
      category: 'click_then_navigate',
      systems: ['netsuite'],
      domains: ['netsuite.com'],
      durationMs: 4000,
      sourceEventIds: ['evt-3-a', 'evt-3-b'],
    }),
    makeStepDefinition(4, {
      stepId: 'step-inv-4',
      title: 'Fill invoice form with vendor and amount details',
      category: 'data_entry',
      systems: ['netsuite'],
      domains: ['netsuite.com'],
      inputs: ['vendor_name', 'invoice_amount', 'invoice_date'],
      durationMs: 45000,
      hasSensitiveEvents: false,
      sourceEventIds: ['evt-4-a', 'evt-4-b', 'evt-4-c'],
    }),
    makeStepDefinition(5, {
      stepId: 'step-inv-5',
      title: 'Upload PDF invoice document to record',
      category: 'file_action',
      systems: ['netsuite'],
      domains: ['netsuite.com'],
      inputs: ['invoice_pdf'],
      durationMs: 5000,
      sourceEventIds: ['evt-5-a'],
    }),
    makeStepDefinition(6, {
      stepId: 'step-inv-6',
      title: 'Submit invoice for approval',
      category: 'fill_and_submit',
      systems: ['netsuite'],
      domains: ['netsuite.com'],
      outputs: ['invoice_record_id', 'approval_request'],
      durationMs: 2000,
      sourceEventIds: ['evt-6-a', 'evt-6-b'],
    }),
  ];

  const sopSteps: SOPStep[] = [
    makeSOPStep(1, 'step-inv-1', { category: 'click_then_navigate', action: 'Open email' }),
    makeSOPStep(2, 'step-inv-2', { category: 'file_action', action: 'Download PDF' }),
    makeSOPStep(3, 'step-inv-3', { category: 'click_then_navigate', action: 'Navigate to AP' }),
    makeSOPStep(4, 'step-inv-4', { category: 'data_entry', action: 'Fill form', inputs: ['vendor_name', 'invoice_amount', 'invoice_date'] }),
    makeSOPStep(5, 'step-inv-5', { category: 'file_action', action: 'Upload PDF' }),
    makeSOPStep(6, 'step-inv-6', { category: 'fill_and_submit', action: 'Submit invoice' }),
  ];

  const processMapNodes = stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category as GroupingReason));
  const processMapEdges = stepDefs.slice(0, -1).map((s, i) =>
    makeMapEdge(`node-${i + 1}`, `node-${i + 2}`, i + 1),
  );

  const output: ProcessOutput = {
    processRun: makeProcessRun({
      runId: 'run-invoice-001',
      activityName: 'Invoice Processing',
      stepCount: 6,
      systemsUsed: ['gmail', 'netsuite'],
    }),
    processDefinition: makeProcessDefinition(stepDefs),
    processMap: makeProcessMap(processMapNodes, processMapEdges),
    sop: makeSOP(sopSteps),
  };

  it('result.artifacts exists on the full pipeline output', () => {
    const result = transformWorkflow(output);
    expect(result.artifacts).toBeDefined();
  });

  it('agentConfigs.length matches agentComposition.agentCount', () => {
    const result = transformWorkflow(output);
    expect(result.artifacts.agentConfigs.length).toBe(result.agentComposition.agentCount);
  });

  it('summary.automationScore matches workflow.automationScore', () => {
    const result = transformWorkflow(output);
    expect(result.artifacts.summary.automationScore).toBe(result.workflow.automationScore);
  });

  it('summary.totalIntegrations matches integrationRisk.integrationCount', () => {
    const result = transformWorkflow(output);
    expect(result.artifacts.summary.totalIntegrations).toBe(result.integrationRisk.integrationCount);
  });

  it('summary.implementationReadinessScore matches integrationRisk.implementationReadinessScore', () => {
    const result = transformWorkflow(output);
    expect(result.artifacts.summary.implementationReadinessScore).toBe(result.integrationRisk.implementationReadinessScore);
  });

  it('roadmap has at least 2 phases', () => {
    const result = transformWorkflow(output);
    expect(result.artifacts.roadmap.length).toBeGreaterThanOrEqual(2);
  });

  it('roadmap phase numbers are sequential starting from 1', () => {
    const result = transformWorkflow(output);
    result.artifacts.roadmap.forEach((p, i) => {
      expect(p.phase).toBe(i + 1);
    });
  });
});
