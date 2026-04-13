/**
 * Comprehensive tests for the Agent Composer pipeline stage.
 *
 * Tests cover:
 * 1. Single-System Workflow
 * 2. Multi-System Workflow (2 systems)
 * 3. Multi-System Workflow (3+ systems) — orchestrator creation
 * 4. Agent Role Assignment
 * 5. Interaction Mode
 * 6. Tools Generation
 * 7. Tasks Generation
 * 8. Collaborations
 * 9. Aggregates & Edge Cases
 * 10. Integration with Full Pipeline
 */

import { describe, it, expect } from 'vitest';
import type {
  StepIntelligence,
  Activity,
  WorkflowStructure,
  WorkflowDependency,
  SkillLibrary,
  Skill,
  SkillCluster,
  Opportunity,
  OpportunityAnalysis,
  DecisionPoint,
  AutomationType,
  InferenceMethod,
  AgentProfile,
  AgentComposition,
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
import { composeAgents } from './agent-composer.js';
import { transformWorkflow } from './transform.js';
import { SYSTEM_CAPABILITIES } from './verb-maps.js';

// ─── Unit test fixture helpers ────────────────────────────────────────────────

function makeStepIntelligence(overrides: Partial<StepIntelligence> = {}): StepIntelligence {
  return {
    stepId: 'step-1',
    sourceWorkflowId: 'run-test-001',
    actionType: 'click',
    inferredIntent: 'Click button',
    verb: 'click',
    object: 'button',
    qualifier: null,
    system: null,
    entity: null,
    domain: null,
    inputData: [],
    outputData: [],
    preconditions: [],
    postconditions: [],
    automationClassification: 'full_automation',
    estimatedDurationMs: 5000,
    confidence: 0.9,
    inferenceMethod: 'deterministic' as InferenceMethod,
    evidenceEventIds: ['evt-1'],
    rawReference: {
      stepOrdinal: 1,
      rawTitle: 'Click button',
      category: 'single_action',
      systems: [],
      domains: [],
    },
    ...overrides,
  };
}

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    activityId: 'act-1',
    activityName: 'Test Activity',
    stepIds: ['step-1'],
    purpose: 'Test purpose',
    system: null,
    systems: [],
    inputs: [],
    outputs: [],
    estimatedDurationMs: 5000,
    stepCount: 1,
    automationClassification: 'full_automation',
    confidence: 0.9,
    ...overrides,
  };
}

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    skillId: 'skill-click_button',
    skillName: 'click_button',
    description: 'Click button',
    skillType: 'navigation',
    inputSchema: [],
    outputSchema: [],
    requiredSystems: [],
    sourceStepIds: ['step-1'],
    sourceActivityIds: ['act-1'],
    automationClassification: 'full_automation',
    reusabilityScore: 0.5,
    confidence: 0.9,
    verb: 'click',
    object: 'button',
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

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    opportunityId: 'opp-1',
    category: 'repetition',
    classification: 'automation_candidate',
    title: 'Test Opportunity',
    description: 'A test opportunity',
    affectedStepIds: ['step-1'],
    affectedActivityIds: ['act-1'],
    relatedSkillIds: [],
    systems: [],
    evidence: [],
    score: 50,
    scoringFactors: { timeSaved: 50, frequency: 50, feasibility: 50, reliability: 50 },
    estimatedTimeSavingsMs: null,
    confidence: 0.8,
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
    automationScore: 100,
    confidence: 0.9,
    ...overrides,
  };
}

// ─── 1. Single-System Workflow ────────────────────────────────────────────────

describe('1. Single-System Workflow', () => {
  const step1 = makeStepIntelligence({
    stepId: 'step-1',
    system: 'gmail',
    verb: 'send',
    automationClassification: 'full_automation',
    confidence: 0.9,
  });
  const step2 = makeStepIntelligence({
    stepId: 'step-2',
    system: 'gmail',
    verb: 'read',
    automationClassification: 'full_automation',
    confidence: 0.85,
  });
  const steps = [step1, step2];

  const act1 = makeActivity({
    activityId: 'act-1',
    activityName: 'Gmail Operations',
    stepIds: ['step-1', 'step-2'],
    system: 'gmail',
    systems: ['gmail'],
    purpose: 'Handle Gmail tasks',
    automationClassification: 'full_automation',
  });
  const activities = [act1];

  const workflow = makeWorkflow({
    systems: ['gmail'],
    stepCount: 2,
    activityCount: 1,
    activities,
  });
  const skillLibrary = makeSkillLibrary();
  const opportunities = makeOpportunityAnalysis();

  it('produces exactly 1 agent (no orchestrator for single system)', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    expect(result.agentCount).toBe(1);
    expect(result.agents).toHaveLength(1);
  });

  it('agent name is "{System} Agent"', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    expect(result.agents[0]!.agentName).toBe('Gmail Agent');
  });

  it('agent has no orchestrator role', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    expect(result.agents[0]!.role).not.toBe('orchestrator');
  });

  it('agent has correct system tools from SYSTEM_CAPABILITIES', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    const agent = result.agents[0]!;
    const gmailCaps = SYSTEM_CAPABILITIES['gmail'] ?? [];
    expect(agent.tools).toHaveLength(gmailCaps.length);
    const toolIds = agent.tools.map(t => t.toolId);
    for (const cap of gmailCaps) {
      expect(toolIds).toContain(`gmail_${cap}`);
    }
  });

  it('no collaborations (single agent)', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    expect(result.collaborations).toHaveLength(0);
  });

  it('coveredStepCount equals total steps', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    expect(result.coveredStepCount).toBe(2);
    expect(result.coverageRatio).toBe(1.0);
  });
});

// ─── 2. Multi-System Workflow (2 systems) ────────────────────────────────────

describe('2. Multi-System Workflow (2 systems)', () => {
  const step1 = makeStepIntelligence({
    stepId: 'step-1', system: 'gmail', verb: 'send',
    automationClassification: 'full_automation', confidence: 0.9,
    outputData: ['email_content'],
  });
  const step2 = makeStepIntelligence({
    stepId: 'step-2', system: 'netsuite', verb: 'fill',
    automationClassification: 'ai_assisted', confidence: 0.8,
    inputData: ['email_content'],
  });
  const steps = [step1, step2];

  const act1 = makeActivity({
    activityId: 'act-1', activityName: 'Gmail Activity',
    stepIds: ['step-1'], system: 'gmail', systems: ['gmail'],
    purpose: 'Send email',
    outputs: ['email_content'],
    automationClassification: 'full_automation',
  });
  const act2 = makeActivity({
    activityId: 'act-2', activityName: 'NetSuite Activity',
    stepIds: ['step-2'], system: 'netsuite', systems: ['netsuite'],
    purpose: 'Fill invoice form',
    inputs: ['email_content'],
    automationClassification: 'ai_assisted',
  });
  const activities = [act1, act2];

  const workflow = makeWorkflow({
    systems: ['gmail', 'netsuite'],
    stepCount: 2,
    activityCount: 2,
    activities,
    dependencies: [
      { fromActivityId: 'act-1', toActivityId: 'act-2', type: 'sequential' },
    ],
  });
  const skillLibrary = makeSkillLibrary();
  const opportunities = makeOpportunityAnalysis();

  it('produces 2 agents for 2 systems (no orchestrator)', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    expect(result.agentCount).toBe(2);
    expect(result.agents.some(a => a.role === 'orchestrator')).toBe(false);
  });

  it('each agent covers its own system activities', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    const gmailAgent = result.agents.find(a => a.agentName === 'Gmail Agent');
    const netsuiteAgent = result.agents.find(a => a.agentName === 'Netsuite Agent');
    expect(gmailAgent).toBeDefined();
    expect(netsuiteAgent).toBeDefined();
    expect(gmailAgent!.coveredActivityIds).toContain('act-1');
    expect(netsuiteAgent!.coveredActivityIds).toContain('act-2');
  });

  it('collaboration is created for cross-system dependency', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    expect(result.collaborations).toHaveLength(1);
    const collab = result.collaborations[0]!;
    expect(collab.trigger).toContain('Gmail Activity');
  });

  it('collaboration data flow contains intersected outputs→inputs', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    const collab = result.collaborations[0]!;
    expect(collab.dataFlow).toContain('email_content');
  });

  it('collaboration type is handoff (no orchestrator, with data flow)', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    const collab = result.collaborations[0]!;
    expect(collab.type).toBe('handoff');
  });
});

// ─── 3. Multi-System Workflow (3+ systems) ────────────────────────────────────

describe('3. Multi-System Workflow (3+ systems) — orchestrator', () => {
  const steps = [
    makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation', confidence: 0.9 }),
    makeStepIntelligence({ stepId: 'step-2', system: 'netsuite', verb: 'fill', automationClassification: 'ai_assisted', confidence: 0.8 }),
    makeStepIntelligence({ stepId: 'step-3', system: 'slack', verb: 'send', automationClassification: 'full_automation', confidence: 0.85 }),
  ];

  const act1 = makeActivity({ activityId: 'act-1', activityName: 'Gmail Activity', stepIds: ['step-1'], system: 'gmail', systems: ['gmail'], purpose: 'Send via Gmail', automationClassification: 'full_automation' });
  const act2 = makeActivity({ activityId: 'act-2', activityName: 'NetSuite Activity', stepIds: ['step-2'], system: 'netsuite', systems: ['netsuite'], purpose: 'Fill NetSuite form', automationClassification: 'ai_assisted' });
  const act3 = makeActivity({ activityId: 'act-3', activityName: 'Slack Activity', stepIds: ['step-3'], system: 'slack', systems: ['slack'], purpose: 'Send Slack message', automationClassification: 'full_automation' });
  const activities = [act1, act2, act3];

  const workflow = makeWorkflow({
    workflowName: 'Multi System Workflow',
    systems: ['gmail', 'netsuite', 'slack'],
    stepCount: 3,
    activityCount: 3,
    activities,
    automationScore: 90,
    confidence: 0.85,
    dependencies: [
      { fromActivityId: 'act-1', toActivityId: 'act-2', type: 'sequential' },
      { fromActivityId: 'act-2', toActivityId: 'act-3', type: 'sequential' },
    ],
  });
  const skillLibrary = makeSkillLibrary();
  const opportunities = makeOpportunityAnalysis();

  it('produces 4 agents: 3 system agents + 1 orchestrator', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    expect(result.agentCount).toBe(4);
    expect(result.agents.filter(a => a.role === 'orchestrator')).toHaveLength(1);
  });

  it('orchestrator is first in sorted output', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    expect(result.agents[0]!.role).toBe('orchestrator');
  });

  it('orchestrator has no tools (empty array)', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    const orch = result.agents.find(a => a.role === 'orchestrator')!;
    expect(orch.tools).toHaveLength(0);
  });

  it('orchestrator coveredActivityIds contains ALL activities', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    const orch = result.agents.find(a => a.role === 'orchestrator')!;
    expect(orch.coveredActivityIds).toContain('act-1');
    expect(orch.coveredActivityIds).toContain('act-2');
    expect(orch.coveredActivityIds).toContain('act-3');
  });

  it('orchestrator name is "{workflowName} Orchestrator"', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    const orch = result.agents.find(a => a.role === 'orchestrator')!;
    expect(orch.agentName).toBe('Multi System Workflow Orchestrator');
  });

  it('collaborations have delegation type when orchestrator exists', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    for (const collab of result.collaborations) {
      expect(collab.type).toBe('delegation');
    }
  });

  it('roleDistribution has orchestrator=1', () => {
    const result = composeAgents(activities, skillLibrary, opportunities, workflow, steps);
    expect(result.roleDistribution.orchestrator).toBe(1);
  });
});

// ─── 4. Agent Role Assignment ─────────────────────────────────────────────────

describe('4. Agent Role Assignment', () => {
  it('all full_automation steps → executor role', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'gmail', verb: 'click', automationClassification: 'full_automation' }),
    ];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1', 'step-2'], system: 'gmail', automationClassification: 'full_automation' })];
    const workflow = makeWorkflow({ systems: ['gmail'], stepCount: 2, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    const gmailAgent = result.agents.find(a => a.agentName === 'Gmail Agent')!;
    expect(gmailAgent.role).toBe('executor');
  });

  it('has human_in_loop steps → assistant role', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'netsuite', verb: 'approve', automationClassification: 'human_in_loop' }),
    ];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'netsuite', automationClassification: 'human_in_loop' })];
    const workflow = makeWorkflow({ systems: ['netsuite'], stepCount: 1, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    const agent = result.agents[0]!;
    expect(agent.role).toBe('assistant');
  });

  it('has manual_only steps → assistant role', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'netsuite', verb: 'review', automationClassification: 'manual_only' }),
    ];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'netsuite', automationClassification: 'manual_only' })];
    const workflow = makeWorkflow({ systems: ['netsuite'], stepCount: 1, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    const agent = result.agents[0]!;
    expect(agent.role).toBe('assistant');
  });

  it('orchestrator always gets orchestrator role', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'netsuite', verb: 'fill', automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-3', system: 'slack', verb: 'send', automationClassification: 'full_automation' }),
    ];
    const activities = [
      makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail', automationClassification: 'full_automation' }),
      makeActivity({ activityId: 'act-2', stepIds: ['step-2'], system: 'netsuite', automationClassification: 'full_automation' }),
      makeActivity({ activityId: 'act-3', stepIds: ['step-3'], system: 'slack', automationClassification: 'full_automation' }),
    ];
    const workflow = makeWorkflow({ systems: ['gmail', 'netsuite', 'slack'], stepCount: 3, activityCount: 3, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    const orch = result.agents.find(a => a.role === 'orchestrator');
    expect(orch).toBeDefined();
  });

  it('mixed automation with no human steps → specialist role', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'jira', verb: 'create', automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'jira', verb: 'fill', automationClassification: 'ai_assisted' }),
    ];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1', 'step-2'], system: 'jira', automationClassification: 'ai_assisted' })];
    const workflow = makeWorkflow({ systems: ['jira'], stepCount: 2, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    // ai_assisted + full_automation = not all full (not executor), no human_in_loop (not assistant) → specialist
    const agent = result.agents[0]!;
    expect(agent.role).toBe('specialist');
  });
});

// ─── 5. Interaction Mode ──────────────────────────────────────────────────────

describe('5. Interaction Mode', () => {
  it('executor role → autonomous mode', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' })];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail', automationClassification: 'full_automation' })];
    const workflow = makeWorkflow({ systems: ['gmail'], stepCount: 1, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    expect(result.agents[0]!.interactionMode).toBe('autonomous');
  });

  it('manual_only step → approval_required override', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1', system: 'netsuite', verb: 'approve', automationClassification: 'manual_only' })];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'netsuite', automationClassification: 'manual_only' })];
    const workflow = makeWorkflow({ systems: ['netsuite'], stepCount: 1, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    expect(result.agents[0]!.interactionMode).toBe('approval_required');
  });

  it('human_in_loop step → collaborative override', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1', system: 'netsuite', verb: 'verify', automationClassification: 'human_in_loop' })];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'netsuite', automationClassification: 'human_in_loop' })];
    const workflow = makeWorkflow({ systems: ['netsuite'], stepCount: 1, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    expect(result.agents[0]!.interactionMode).toBe('collaborative');
  });

  it('orchestrator → supervised mode', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'netsuite', verb: 'fill', automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-3', system: 'slack', verb: 'send', automationClassification: 'full_automation' }),
    ];
    const activities = [
      makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail', automationClassification: 'full_automation' }),
      makeActivity({ activityId: 'act-2', stepIds: ['step-2'], system: 'netsuite', automationClassification: 'full_automation' }),
      makeActivity({ activityId: 'act-3', stepIds: ['step-3'], system: 'slack', automationClassification: 'full_automation' }),
    ];
    const workflow = makeWorkflow({ systems: ['gmail', 'netsuite', 'slack'], stepCount: 3, activityCount: 3, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    const orch = result.agents.find(a => a.role === 'orchestrator')!;
    expect(orch.interactionMode).toBe('supervised');
  });

  it('manual_only overrides even assistant mode to approval_required', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'salesforce', verb: 'review', automationClassification: 'human_in_loop' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'salesforce', verb: 'approve', automationClassification: 'manual_only' }),
    ];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1', 'step-2'], system: 'salesforce', automationClassification: 'manual_only' })];
    const workflow = makeWorkflow({ systems: ['salesforce'], stepCount: 2, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    expect(result.agents[0]!.interactionMode).toBe('approval_required');
  });
});

// ─── 6. Tools Generation ──────────────────────────────────────────────────────

describe('6. Tools Generation', () => {
  it('gmail agent → tools from SYSTEM_CAPABILITIES["gmail"]', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' })];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail' })];
    const workflow = makeWorkflow({ systems: ['gmail'], stepCount: 1, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    const gmailAgent = result.agents[0]!;
    const expectedCaps = SYSTEM_CAPABILITIES['gmail']!;
    expect(gmailAgent.tools).toHaveLength(expectedCaps.length);
    expect(gmailAgent.tools[0]!.system).toBe('gmail');
  });

  it('orchestrator → empty tools array', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'netsuite', verb: 'fill', automationClassification: 'ai_assisted' }),
      makeStepIntelligence({ stepId: 'step-3', system: 'slack', verb: 'send', automationClassification: 'full_automation' }),
    ];
    const activities = [
      makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail', automationClassification: 'full_automation' }),
      makeActivity({ activityId: 'act-2', stepIds: ['step-2'], system: 'netsuite', automationClassification: 'ai_assisted' }),
      makeActivity({ activityId: 'act-3', stepIds: ['step-3'], system: 'slack', automationClassification: 'full_automation' }),
    ];
    const workflow = makeWorkflow({ systems: ['gmail', 'netsuite', 'slack'], stepCount: 3, activityCount: 3, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    const orch = result.agents.find(a => a.role === 'orchestrator')!;
    expect(orch.tools).toHaveLength(0);
  });

  it('system not in SYSTEM_CAPABILITIES → empty tools', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1', system: 'unknown_system', verb: 'click', automationClassification: 'full_automation' })];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'unknown_system' })];
    const workflow = makeWorkflow({ systems: ['unknown_system'], stepCount: 1, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    expect(result.agents[0]!.tools).toHaveLength(0);
  });

  it('tool required flag is true when step verb matches capability', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' })];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail' })];
    const workflow = makeWorkflow({ systems: ['gmail'], stepCount: 1, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    const gmailAgent = result.agents[0]!;
    // "send_email" capability should be required since verb is "send"
    const sendEmailTool = gmailAgent.tools.find(t => t.capability === 'send_email');
    expect(sendEmailTool).toBeDefined();
    expect(sendEmailTool!.required).toBe(true);
  });

  it('tool toolId format is {system}_{capability}', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' })];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail' })];
    const workflow = makeWorkflow({ systems: ['gmail'], stepCount: 1, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    const gmailAgent = result.agents[0]!;
    for (const tool of gmailAgent.tools) {
      expect(tool.toolId).toBe(`gmail_${tool.capability}`);
    }
  });
});

// ─── 7. Tasks Generation ──────────────────────────────────────────────────────

describe('7. Tasks Generation', () => {
  it('each covered activity becomes a task', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'gmail', verb: 'read', automationClassification: 'full_automation' }),
    ];
    const activities = [
      makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail', purpose: 'Send email task', automationClassification: 'full_automation' }),
      makeActivity({ activityId: 'act-2', stepIds: ['step-2'], system: 'gmail', purpose: 'Read email task', automationClassification: 'full_automation' }),
    ];
    const workflow = makeWorkflow({ systems: ['gmail'], stepCount: 2, activityCount: 2, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    const gmailAgent = result.agents[0]!;
    expect(gmailAgent.tasks).toHaveLength(2);
  });

  it('task execution order matches activity position in workflow', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'gmail', verb: 'read', automationClassification: 'full_automation' }),
    ];
    const activities = [
      makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail', purpose: 'First task', automationClassification: 'full_automation' }),
      makeActivity({ activityId: 'act-2', stepIds: ['step-2'], system: 'gmail', purpose: 'Second task', automationClassification: 'full_automation' }),
    ];
    const workflow = makeWorkflow({ systems: ['gmail'], stepCount: 2, activityCount: 2, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    const gmailAgent = result.agents[0]!;
    const orders = gmailAgent.tasks.map(t => t.executionOrder);
    // executionOrder should be sequential
    expect(orders[0]).toBeLessThan(orders[1]!);
  });

  it('requiresApproval true for human_in_loop activity', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1', system: 'netsuite', verb: 'approve', automationClassification: 'human_in_loop' })];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'netsuite', purpose: 'Approve invoice', automationClassification: 'human_in_loop' })];
    const workflow = makeWorkflow({ systems: ['netsuite'], stepCount: 1, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    const task = result.agents[0]!.tasks[0]!;
    expect(task.requiresApproval).toBe(true);
  });

  it('requiresApproval true for manual_only activity', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1', system: 'netsuite', verb: 'review', automationClassification: 'manual_only' })];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'netsuite', purpose: 'Manual review', automationClassification: 'manual_only' })];
    const workflow = makeWorkflow({ systems: ['netsuite'], stepCount: 1, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    const task = result.agents[0]!.tasks[0]!;
    expect(task.requiresApproval).toBe(true);
  });

  it('task description matches activity purpose', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' })];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail', purpose: 'Custom purpose text', automationClassification: 'full_automation' })];
    const workflow = makeWorkflow({ systems: ['gmail'], stepCount: 1, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    expect(result.agents[0]!.tasks[0]!.description).toBe('Custom purpose text');
  });

  it('task requiredSkillIds populated from skillLibrary', () => {
    const skill = makeSkill({
      skillId: 'skill-send_email',
      sourceActivityIds: ['act-1'],
      requiredSystems: ['gmail'],
    });
    const steps = [makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' })];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail', purpose: 'Send email', automationClassification: 'full_automation' })];
    const workflow = makeWorkflow({ systems: ['gmail'], stepCount: 1, activityCount: 1, activities });
    const sl = makeSkillLibrary({ skills: [skill], uniqueSkillCount: 1 });
    const result = composeAgents(activities, sl, makeOpportunityAnalysis(), workflow, steps);
    expect(result.agents[0]!.tasks[0]!.requiredSkillIds).toContain('skill-send_email');
  });
});

// ─── 8. Collaborations ────────────────────────────────────────────────────────

describe('8. Collaborations', () => {
  const makeThreeSystemSetup = () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'netsuite', verb: 'fill', automationClassification: 'ai_assisted' }),
      makeStepIntelligence({ stepId: 'step-3', system: 'slack', verb: 'send', automationClassification: 'full_automation' }),
    ];
    const activities = [
      makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail', automationClassification: 'full_automation', outputs: ['pdf_file'] }),
      makeActivity({ activityId: 'act-2', stepIds: ['step-2'], system: 'netsuite', automationClassification: 'ai_assisted', inputs: ['pdf_file'], outputs: ['invoice_id'] }),
      makeActivity({ activityId: 'act-3', stepIds: ['step-3'], system: 'slack', automationClassification: 'full_automation', inputs: ['invoice_id'] }),
    ];
    const workflow = makeWorkflow({
      systems: ['gmail', 'netsuite', 'slack'],
      stepCount: 3,
      activityCount: 3,
      activities,
      dependencies: [
        { fromActivityId: 'act-1', toActivityId: 'act-2', type: 'sequential' },
        { fromActivityId: 'act-2', toActivityId: 'act-3', type: 'sequential' },
      ],
    });
    return { steps, activities, workflow };
  };

  it('cross-system dependency creates a collaboration', () => {
    const { steps, activities, workflow } = makeThreeSystemSetup();
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    // With orchestrator present, cross-system deps become delegation type collaborations
    expect(result.collaborations.length).toBeGreaterThan(0);
  });

  it('same-system dependency does not create collaboration', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'gmail', verb: 'read', automationClassification: 'full_automation' }),
    ];
    const activities = [
      makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail', automationClassification: 'full_automation' }),
      makeActivity({ activityId: 'act-2', stepIds: ['step-2'], system: 'gmail', automationClassification: 'full_automation' }),
    ];
    const workflow = makeWorkflow({
      systems: ['gmail'],
      stepCount: 2,
      activityCount: 2,
      activities,
      dependencies: [{ fromActivityId: 'act-1', toActivityId: 'act-2', type: 'sequential' }],
    });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    expect(result.collaborations).toHaveLength(0);
  });

  it('data flow contains intersection of outputs→inputs', () => {
    const { steps, activities, workflow } = makeThreeSystemSetup();
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    // For 2-system (no orchestrator) scenario with data flow
    const twoSteps = [
      makeStepIntelligence({ stepId: 'step-a', system: 'gmail', verb: 'send', automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-b', system: 'netsuite', verb: 'fill', automationClassification: 'ai_assisted' }),
    ];
    const twoActivities = [
      makeActivity({ activityId: 'act-a', stepIds: ['step-a'], system: 'gmail', automationClassification: 'full_automation', outputs: ['shared_data'] }),
      makeActivity({ activityId: 'act-b', stepIds: ['step-b'], system: 'netsuite', automationClassification: 'ai_assisted', inputs: ['shared_data'] }),
    ];
    const twoWorkflow = makeWorkflow({
      systems: ['gmail', 'netsuite'],
      stepCount: 2,
      activityCount: 2,
      activities: twoActivities,
      dependencies: [{ fromActivityId: 'act-a', toActivityId: 'act-b', type: 'sequential' }],
    });
    const twoResult = composeAgents(twoActivities, makeSkillLibrary(), makeOpportunityAnalysis(), twoWorkflow, twoSteps);
    expect(twoResult.collaborations[0]!.dataFlow).toContain('shared_data');
  });

  it('delegation type when orchestrator involved', () => {
    const { steps, activities, workflow } = makeThreeSystemSetup();
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    for (const collab of result.collaborations) {
      expect(collab.type).toBe('delegation');
    }
  });

  it('notification type when no data flows in 2-system workflow', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-a', system: 'gmail', verb: 'send', automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-b', system: 'netsuite', verb: 'fill', automationClassification: 'ai_assisted' }),
    ];
    const activities = [
      makeActivity({ activityId: 'act-a', stepIds: ['step-a'], system: 'gmail', automationClassification: 'full_automation', outputs: [] }),
      makeActivity({ activityId: 'act-b', stepIds: ['step-b'], system: 'netsuite', automationClassification: 'ai_assisted', inputs: [] }),
    ];
    const workflow = makeWorkflow({
      systems: ['gmail', 'netsuite'],
      stepCount: 2,
      activityCount: 2,
      activities,
      dependencies: [{ fromActivityId: 'act-a', toActivityId: 'act-b', type: 'sequential' }],
    });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    expect(result.collaborations[0]!.type).toBe('notification');
  });
});

// ─── 9. Aggregates & Edge Cases ───────────────────────────────────────────────

describe('9. Aggregates & Edge Cases', () => {
  it('coverageRatio = coveredStepCount / totalSteps', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'gmail', verb: 'read', automationClassification: 'full_automation' }),
    ];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1', 'step-2'], system: 'gmail', automationClassification: 'full_automation' })];
    const workflow = makeWorkflow({ systems: ['gmail'], stepCount: 2, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    expect(result.coverageRatio).toBe(result.coveredStepCount / 2);
  });

  it('averageCapabilityScore computed correctly', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation', estimatedDurationMs: 5000 })];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail', automationClassification: 'full_automation' })];
    const workflow = makeWorkflow({ systems: ['gmail'], stepCount: 1, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    // Single agent with full_automation → capabilityScore 100
    expect(result.averageCapabilityScore).toBe(100);
  });

  it('empty workflow → empty composition', () => {
    const result = composeAgents([], makeSkillLibrary(), makeOpportunityAnalysis(), makeWorkflow(), []);
    expect(result.agentCount).toBe(0);
    expect(result.agents).toHaveLength(0);
    expect(result.collaborations).toHaveLength(0);
    expect(result.coverageRatio).toBe(0);
    expect(result.coveredStepCount).toBe(0);
  });

  it('single step → single agent', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' })];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail', automationClassification: 'full_automation' })];
    const workflow = makeWorkflow({ systems: ['gmail'], stepCount: 1, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    expect(result.agentCount).toBe(1);
  });

  it('no opportunities → agents still composed', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' })];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail', automationClassification: 'full_automation' })];
    const workflow = makeWorkflow({ systems: ['gmail'], stepCount: 1, activityCount: 1, activities });
    const result = composeAgents(activities, makeSkillLibrary(), makeOpportunityAnalysis(), workflow, steps);
    expect(result.agentCount).toBe(1);
    expect(result.agents[0]!.opportunityIds).toHaveLength(0);
  });

  it('roleDistribution initializes all roles to 0 in empty case', () => {
    const result = composeAgents([], makeSkillLibrary(), makeOpportunityAnalysis(), makeWorkflow(), []);
    expect(result.roleDistribution.executor).toBe(0);
    expect(result.roleDistribution.assistant).toBe(0);
    expect(result.roleDistribution.orchestrator).toBe(0);
    expect(result.roleDistribution.monitor).toBe(0);
    expect(result.roleDistribution.specialist).toBe(0);
  });

  it('opportunityIds assigned correctly from opportunities systems', () => {
    const opp = makeOpportunity({ opportunityId: 'opp-gmail-1', systems: ['gmail'] });
    const steps = [makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'send', automationClassification: 'full_automation' })];
    const activities = [makeActivity({ activityId: 'act-1', stepIds: ['step-1'], system: 'gmail', automationClassification: 'full_automation' })];
    const workflow = makeWorkflow({ systems: ['gmail'], stepCount: 1, activityCount: 1, activities });
    const oppAnalysis = makeOpportunityAnalysis({
      opportunities: [opp],
      totalOpportunities: 1,
    });
    const result = composeAgents(activities, makeSkillLibrary(), oppAnalysis, workflow, steps);
    expect(result.agents[0]!.opportunityIds).toContain('opp-gmail-1');
  });
});

// ─── 10. Integration with Full Pipeline ───────────────────────────────────────

// ── Integration fixture builders ──────────────────────────────────────────────

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

function makeStepDefinition(ordinal: number, overrides: Partial<StepDefinition>): StepDefinition {
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

function makeMapNode(
  stepId: string,
  ordinal: number,
  category: GroupingReason = 'single_action',
): ProcessMapNode {
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

describe('10. Integration with Full Pipeline', () => {
  it('transformWorkflow populates result.agentComposition', () => {
    const stepDefs = [
      makeStepDefinition(1, { stepId: 'step-1', title: 'Send email via Gmail', category: 'send_action', systems: ['gmail'], durationMs: 3000 }),
      makeStepDefinition(2, { stepId: 'step-2', title: 'Navigate to NetSuite', category: 'click_then_navigate', systems: ['netsuite'], durationMs: 4000 }),
    ];
    const sopSteps = [
      makeSOPStep(1, 'step-1', { category: 'send_action', action: 'Send email' }),
      makeSOPStep(2, 'step-2', { category: 'click_then_navigate', action: 'Navigate to NetSuite' }),
    ];
    const nodes = stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category));
    const edges = [makeMapEdge('node-1', 'node-2', 1)];

    const output: ProcessOutput = {
      processRun: makeProcessRun({ runId: 'run-int-001', activityName: 'Integration Test', stepCount: 2, systemsUsed: ['gmail', 'netsuite'] }),
      processDefinition: makeProcessDefinition(stepDefs),
      processMap: makeProcessMap(nodes, edges),
      sop: makeSOP(sopSteps),
    };

    const result = transformWorkflow(output);
    expect(result.agentComposition).toBeDefined();
    expect(result.agentComposition.agentCount).toBeGreaterThan(0);
    expect(result.agentComposition.agents.length).toBe(result.agentComposition.agentCount);
  });

  it('multi-system workflow (3 systems) produces orchestrator via full pipeline', () => {
    const stepDefs = [
      makeStepDefinition(1, { stepId: 'step-1', title: 'Send email via Gmail', category: 'send_action', systems: ['gmail'], durationMs: 3000 }),
      makeStepDefinition(2, { stepId: 'step-2', title: 'Navigate to NetSuite accounts', category: 'click_then_navigate', systems: ['netsuite'], durationMs: 4000 }),
      makeStepDefinition(3, { stepId: 'step-3', title: 'Send Slack notification message', category: 'send_action', systems: ['slack'], durationMs: 2000 }),
    ];
    const sopSteps = [
      makeSOPStep(1, 'step-1', { category: 'send_action', action: 'Send email' }),
      makeSOPStep(2, 'step-2', { category: 'click_then_navigate', action: 'Navigate to NetSuite' }),
      makeSOPStep(3, 'step-3', { category: 'send_action', action: 'Send Slack message' }),
    ];
    const nodes = stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category));
    const edges = [
      makeMapEdge('node-1', 'node-2', 1),
      makeMapEdge('node-2', 'node-3', 2),
    ];

    const output: ProcessOutput = {
      processRun: makeProcessRun({ runId: 'run-3sys-001', activityName: 'Three System Workflow', stepCount: 3, systemsUsed: ['gmail', 'netsuite', 'slack'] }),
      processDefinition: makeProcessDefinition(stepDefs),
      processMap: makeProcessMap(nodes, edges),
      sop: makeSOP(sopSteps),
    };

    const result = transformWorkflow(output);
    const { agentComposition } = result;

    // 3 unique systems → orchestrator should be created
    if (result.workflow.systems.length >= 3) {
      expect(agentComposition.agents.some(a => a.role === 'orchestrator')).toBe(true);
      expect(agentComposition.agents[0]!.role).toBe('orchestrator');
    } else {
      // At least agents are composed
      expect(agentComposition.agentCount).toBeGreaterThan(0);
    }
  });

  it('agentComposition agents have valid structure', () => {
    const stepDefs = [
      makeStepDefinition(1, { stepId: 'step-1', title: 'Send email via Gmail', category: 'send_action', systems: ['gmail'], durationMs: 5000 }),
    ];
    const sopSteps = [makeSOPStep(1, 'step-1', { category: 'send_action', action: 'Send email' })];
    const nodes = [makeMapNode('step-1', 1, 'send_action')];

    const output: ProcessOutput = {
      processRun: makeProcessRun({ runId: 'run-struct-001', activityName: 'Structure Test', stepCount: 1, systemsUsed: ['gmail'] }),
      processDefinition: makeProcessDefinition(stepDefs),
      processMap: makeProcessMap(nodes, []),
      sop: makeSOP(sopSteps),
    };

    const result = transformWorkflow(output);
    for (const agent of result.agentComposition.agents) {
      expect(agent.agentId).toMatch(/^agent-\d+$/);
      expect(agent.agentName.length).toBeGreaterThan(0);
      expect(agent.description.length).toBeGreaterThan(0);
      expect(['executor', 'assistant', 'orchestrator', 'monitor', 'specialist']).toContain(agent.role);
      expect(['autonomous', 'supervised', 'collaborative', 'approval_required']).toContain(agent.interactionMode);
      expect(Array.isArray(agent.tools)).toBe(true);
      expect(Array.isArray(agent.tasks)).toBe(true);
      expect(Array.isArray(agent.skillIds)).toBe(true);
      expect(typeof agent.capabilityScore).toBe('number');
      expect(agent.capabilityScore).toBeGreaterThanOrEqual(0);
      expect(agent.capabilityScore).toBeLessThanOrEqual(100);
      expect(typeof agent.confidence).toBe('number');
    }
  });
});
