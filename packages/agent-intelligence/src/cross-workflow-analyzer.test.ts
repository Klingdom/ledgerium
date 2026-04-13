/**
 * Comprehensive tests for the Cross-Workflow Intelligence Analyzer.
 *
 * Tests cover:
 * - Shared skills (base name matching across workflows)
 * - Shared systems (co-occurrence across workflows)
 * - Shared skill sequence patterns
 * - Common system pair patterns
 * - Similar structure patterns
 * - Shared bottleneck patterns
 * - Portfolio summary statistics
 * - Edge cases (empty, single workflow, identical workflows)
 * - Integration with real transformWorkflow output
 */

import { describe, it, expect } from 'vitest';
import type {
  TransformationResult,
  WorkflowStructure,
  StepIntelligence,
  Activity,
  DecisionPoint,
  SkillLibrary,
  Skill,
  SkillCluster,
  OpportunityAnalysis,
  Opportunity,
  AgentComposition,
  IntegrationRiskAnalysis,
  ArtifactOutput,
  SkillType,
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
import { analyzePortfolio } from './cross-workflow-analyzer.js';
import { transformWorkflow } from './transform.js';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

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

function makeSkillCluster(overrides: Partial<SkillCluster> = {}): SkillCluster {
  return {
    clusterId: 'cluster-click_button',
    canonicalSkillName: 'click_button',
    skillIds: ['skill-click_button'],
    occurrenceCount: 1,
    workflowCount: 1,
    averageReusabilityScore: 0.5,
    averageConfidence: 0.9,
    ...overrides,
  };
}

function makeSkillLibrary(overrides: Partial<SkillLibrary> = {}): SkillLibrary {
  const skills = overrides.skills ?? [];
  return {
    skills,
    clusters: overrides.clusters ?? [],
    uniqueSkillCount: skills.length,
    reusableSkillCount: skills.filter(s => s.reusabilityScore >= 0.6).length,
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

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    activityId: 'act-1',
    activityName: 'Test Activity',
    stepIds: ['step-1'],
    purpose: 'Test',
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

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    opportunityId: 'opp-1',
    category: 'repetition',
    classification: 'automation_candidate',
    title: 'Repeated action',
    description: 'Repeated action detected',
    affectedStepIds: ['step-1'],
    affectedActivityIds: ['act-1'],
    relatedSkillIds: [],
    systems: [],
    evidence: [],
    score: 50,
    scoringFactors: { timeSaved: 50, frequency: 50, feasibility: 50, reliability: 50 },
    estimatedTimeSavingsMs: 10000,
    confidence: 0.8,
    ...overrides,
  };
}

function makeOpportunityAnalysis(overrides: Partial<OpportunityAnalysis> = {}): OpportunityAnalysis {
  const opportunities = overrides.opportunities ?? [];
  return {
    opportunities,
    totalOpportunities: opportunities.length,
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
    topScore: opportunities.length > 0 ? Math.max(...opportunities.map(o => o.score)) : 0,
    totalEstimatedTimeSavingsMs: opportunities.reduce(
      (sum, o) => (sum === null || o.estimatedTimeSavingsMs === null ? null : sum + o.estimatedTimeSavingsMs),
      0 as number | null,
    ),
    ...overrides,
  };
}

function makeAgentComposition(overrides: Partial<AgentComposition> = {}): AgentComposition {
  return {
    agents: [],
    collaborations: [],
    agentCount: 0,
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

function makeIntegrationRiskAnalysis(overrides: Partial<IntegrationRiskAnalysis> = {}): IntegrationRiskAnalysis {
  return {
    integrations: [],
    risks: [],
    integrationCount: 0,
    readinessBreakdown: {
      api_available: 0,
      api_limited: 0,
      no_api: 0,
      unknown: 0,
    },
    riskCount: 0,
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
    implementationReadinessScore: 80,
    ...overrides,
  };
}

function makeArtifactOutput(overrides: Partial<ArtifactOutput> = {}): ArtifactOutput {
  return {
    agentConfigs: [],
    skillManifests: [],
    integrationConfigs: [],
    roadmap: [],
    summary: {
      totalAgents: 0,
      totalSkills: 0,
      totalIntegrations: 0,
      totalPhases: 0,
      automationScore: 50,
      implementationReadinessScore: 80,
      estimatedTimeSavingsMs: null,
    },
    ...overrides,
  };
}

function makeWorkflow(overrides: Partial<WorkflowStructure> = {}): WorkflowStructure {
  return {
    workflowId: 'wf-001',
    workflowName: 'Test Workflow',
    activities: [],
    decisionPoints: [],
    systems: [],
    totalDurationMs: 30000,
    stepCount: 3,
    activityCount: 1,
    dependencies: [],
    automationClassification: 'full_automation',
    automationScore: 80,
    confidence: 0.9,
    ...overrides,
  };
}

function makeTransformationResult(overrides: Partial<TransformationResult> = {}): TransformationResult {
  const workflow = overrides.workflow ?? makeWorkflow();
  return {
    steps: overrides.steps ?? [],
    activities: overrides.activities ?? [],
    workflow,
    decisionPoints: overrides.decisionPoints ?? [],
    skillLibrary: overrides.skillLibrary ?? makeSkillLibrary(),
    opportunities: overrides.opportunities ?? makeOpportunityAnalysis(),
    agentComposition: overrides.agentComposition ?? makeAgentComposition(),
    integrationRisk: overrides.integrationRisk ?? makeIntegrationRiskAnalysis(),
    artifacts: overrides.artifacts ?? makeArtifactOutput(),
    metadata: overrides.metadata ?? {
      engineVersion: '0.1.0',
      processedAt: '2024-01-15T09:00:00Z',
      sourceRunId: workflow.workflowId,
      pipelineDurationMs: 10,
    },
  };
}

// ─── Process pipeline fixture builders (for integration tests) ────────────────

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

function makeMapEdge(from: number, to: number): ProcessMapEdge {
  return {
    id: `edge-${from}-${to}`,
    source: `node-${from}`,
    target: `node-${to}`,
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

function makeProcessOutput(stepDefs: StepDefinition[], runId = 'run-test-001'): ProcessOutput {
  const sopSteps = stepDefs.map((s, i) => makeSOPStep(i + 1, s.stepId, { category: s.category }));
  const nodes = stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category));
  const edges = stepDefs.slice(0, -1).map((_, i) => makeMapEdge(i + 1, i + 2));
  return {
    processRun: makeProcessRun({ runId }),
    processDefinition: makeProcessDefinition(stepDefs),
    processMap: makeProcessMap(nodes, edges),
    sop: makeSOP(sopSteps),
  };
}

// ─── 1. Shared Skills ─────────────────────────────────────────────────────────

describe('Shared Skills', () => {
  it('same base skill in 2 workflows → shared skill detected', () => {
    const skill = makeSkill({ verb: 'send', object: 'email', skillName: 'send_email_in_gmail', requiredSystems: ['gmail'], sourceStepIds: ['step-1'] });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      skillLibrary: makeSkillLibrary({ skills: [skill] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      skillLibrary: makeSkillLibrary({ skills: [skill] }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.sharedSkills).toHaveLength(1);
    expect(result.sharedSkills[0]!.skillName).toBe('send_email');
  });

  it('same verb+object, different systems → still shared (base name match)', () => {
    const skill1 = makeSkill({ verb: 'fill', object: 'form', skillName: 'fill_form_in_netsuite', requiredSystems: ['netsuite'], sourceStepIds: ['step-1'] });
    const skill2 = makeSkill({ verb: 'fill', object: 'form', skillName: 'fill_form_in_salesforce', requiredSystems: ['salesforce'], sourceStepIds: ['step-2'] });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      skillLibrary: makeSkillLibrary({ skills: [skill1] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      skillLibrary: makeSkillLibrary({ skills: [skill2] }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.sharedSkills).toHaveLength(1);
    expect(result.sharedSkills[0]!.skillName).toBe('fill_form');
    expect(result.sharedSkills[0]!.systems).toContain('netsuite');
    expect(result.sharedSkills[0]!.systems).toContain('salesforce');
  });

  it('skill in only 1 workflow → NOT in sharedSkills', () => {
    const skill = makeSkill({ verb: 'upload', object: 'file', skillName: 'upload_file' });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      skillLibrary: makeSkillLibrary({ skills: [skill] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      skillLibrary: makeSkillLibrary({ skills: [] }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.sharedSkills).toHaveLength(0);
  });

  it('workflowCount and totalOccurrences computed correctly', () => {
    const skill1 = makeSkill({
      verb: 'navigate', object: 'page', skillName: 'navigate_page',
      sourceStepIds: ['step-1', 'step-2'],
    });
    const skill2 = makeSkill({
      verb: 'navigate', object: 'page', skillName: 'navigate_page',
      sourceStepIds: ['step-3'],
    });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      skillLibrary: makeSkillLibrary({ skills: [skill1] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      skillLibrary: makeSkillLibrary({ skills: [skill2] }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.sharedSkills[0]!.workflowCount).toBe(2);
    expect(result.sharedSkills[0]!.totalOccurrences).toBe(3); // 2 + 1
  });

  it('isLibraryCandidate true when workflowCount>=2 AND reusabilityScore>=0.5', () => {
    const skill = makeSkill({ verb: 'send', object: 'email', reusabilityScore: 0.7 });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      skillLibrary: makeSkillLibrary({ skills: [skill] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      skillLibrary: makeSkillLibrary({ skills: [skill] }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.sharedSkills[0]!.isLibraryCandidate).toBe(true);
  });

  it('isLibraryCandidate false when averageReusabilityScore < 0.5', () => {
    const skill = makeSkill({ verb: 'send', object: 'email', reusabilityScore: 0.3 });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      skillLibrary: makeSkillLibrary({ skills: [skill] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      skillLibrary: makeSkillLibrary({ skills: [skill] }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.sharedSkills[0]!.isLibraryCandidate).toBe(false);
  });

  it('sorted by workflowCount desc then totalOccurrences desc', () => {
    const skillA = makeSkill({ skillId: 'skill-send_email', verb: 'send', object: 'email', skillName: 'send_email', sourceStepIds: ['s1'] });
    const skillB = makeSkill({ skillId: 'skill-fill_form', verb: 'fill', object: 'form', skillName: 'fill_form', sourceStepIds: ['s2', 's3', 's4'] });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      skillLibrary: makeSkillLibrary({ skills: [skillA, skillB] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      skillLibrary: makeSkillLibrary({ skills: [skillA, skillB] }),
    });
    const r3 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-003' }),
      skillLibrary: makeSkillLibrary({ skills: [skillB] }),
    });
    const result = analyzePortfolio([r1, r2, r3]);
    // fill_form appears in 3 workflows, send_email in 2 — fill_form should be first
    expect(result.sharedSkills[0]!.skillName).toBe('fill_form');
    expect(result.sharedSkills[1]!.skillName).toBe('send_email');
  });

  it('averageReusabilityScore and averageConfidence computed correctly', () => {
    const skill1 = makeSkill({ verb: 'send', object: 'email', reusabilityScore: 0.6, confidence: 0.8 });
    const skill2 = makeSkill({ verb: 'send', object: 'email', reusabilityScore: 0.4, confidence: 1.0 });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      skillLibrary: makeSkillLibrary({ skills: [skill1] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      skillLibrary: makeSkillLibrary({ skills: [skill2] }),
    });
    const result = analyzePortfolio([r1, r2]);
    const shared = result.sharedSkills[0]!;
    expect(shared.averageReusabilityScore).toBeCloseTo(0.5, 2);
    expect(shared.averageConfidence).toBeCloseTo(0.9, 2);
  });

  it('multiple different shared skills all appear in output', () => {
    const skillA = makeSkill({ skillId: 'skill-a', verb: 'send', object: 'email', skillName: 'send_email' });
    const skillB = makeSkill({ skillId: 'skill-b', verb: 'fill', object: 'form', skillName: 'fill_form' });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      skillLibrary: makeSkillLibrary({ skills: [skillA, skillB] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      skillLibrary: makeSkillLibrary({ skills: [skillA, skillB] }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.sharedSkills).toHaveLength(2);
  });
});

// ─── 2. Shared Systems ────────────────────────────────────────────────────────

describe('Shared Systems', () => {
  it('same system in 2 workflows → shared system detected', () => {
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001', systems: ['salesforce'] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002', systems: ['salesforce'] }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.sharedSystems).toHaveLength(1);
    expect(result.sharedSystems[0]!.system).toBe('salesforce');
  });

  it('system in only 1 workflow → NOT in sharedSystems', () => {
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001', systems: ['netsuite'] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002', systems: ['gmail'] }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.sharedSystems).toHaveLength(0);
  });

  it('sharedIntegrationValue: high for 3+ workflows, medium for 2', () => {
    const r1 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-001', systems: ['slack'] }) });
    const r2 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-002', systems: ['slack'] }) });
    const r3 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-003', systems: ['slack'] }) });

    const two = analyzePortfolio([r1, r2]);
    expect(two.sharedSystems[0]!.sharedIntegrationValue).toBe('medium');

    const three = analyzePortfolio([r1, r2, r3]);
    expect(three.sharedSystems[0]!.sharedIntegrationValue).toBe('high');
  });

  it('totalStepCount aggregated correctly across workflows', () => {
    const steps1 = [
      makeStepIntelligence({ stepId: 'step-1', system: 'netsuite' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'netsuite' }),
    ];
    const steps2 = [
      makeStepIntelligence({ stepId: 'step-3', system: 'netsuite' }),
    ];
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001', systems: ['netsuite'] }),
      steps: steps1,
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002', systems: ['netsuite'] }),
      steps: steps2,
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.sharedSystems[0]!.totalStepCount).toBe(3);
  });

  it('associatedSkills collected correctly from skills using this system', () => {
    const skill = makeSkill({ verb: 'fill', object: 'form', skillName: 'fill_form', requiredSystems: ['netsuite'] });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001', systems: ['netsuite'] }),
      skillLibrary: makeSkillLibrary({ skills: [skill] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002', systems: ['netsuite'] }),
      skillLibrary: makeSkillLibrary({ skills: [skill] }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.sharedSystems[0]!.associatedSkills).toContain('fill_form');
  });

  it('sorted by workflowCount desc then totalStepCount desc then system asc', () => {
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001', systems: ['gmail', 'netsuite'] }),
      steps: [makeStepIntelligence({ system: 'gmail' }), makeStepIntelligence({ system: 'netsuite' })],
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002', systems: ['gmail', 'netsuite'] }),
      steps: [makeStepIntelligence({ system: 'gmail' }), makeStepIntelligence({ system: 'netsuite' })],
    });
    const r3 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-003', systems: ['gmail'] }),
      steps: [makeStepIntelligence({ system: 'gmail' })],
    });
    const result = analyzePortfolio([r1, r2, r3]);
    // gmail in 3 workflows, netsuite in 2 → gmail first
    expect(result.sharedSystems[0]!.system).toBe('gmail');
    expect(result.sharedSystems[1]!.system).toBe('netsuite');
  });

  it('workflowIds array contains all workflow IDs where system appears', () => {
    const r1 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-001', systems: ['slack'] }) });
    const r2 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-002', systems: ['slack'] }) });
    const result = analyzePortfolio([r1, r2]);
    expect(result.sharedSystems[0]!.workflowIds).toContain('wf-001');
    expect(result.sharedSystems[0]!.workflowIds).toContain('wf-002');
  });
});

// ─── 3. Shared Skill Sequences ────────────────────────────────────────────────

describe('Shared Skill Sequences', () => {
  it('same 2-step sequence in 2 workflows → pattern detected', () => {
    const steps1 = [
      makeStepIntelligence({ stepId: 's1', verb: 'navigate', object: 'page' }),
      makeStepIntelligence({ stepId: 's2', verb: 'fill', object: 'form' }),
      makeStepIntelligence({ stepId: 's3', verb: 'submit', object: 'form' }),
    ];
    const steps2 = [
      makeStepIntelligence({ stepId: 's4', verb: 'navigate', object: 'page' }),
      makeStepIntelligence({ stepId: 's5', verb: 'fill', object: 'form' }),
      makeStepIntelligence({ stepId: 's6', verb: 'download', object: 'file' }),
    ];
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      steps: steps1,
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      steps: steps2,
    });
    const result = analyzePortfolio([r1, r2]);
    const seqPatterns = result.patterns.filter(p => p.patternType === 'shared_skill_sequence');
    expect(seqPatterns.length).toBeGreaterThan(0);
  });

  it('same 3-step sequence preferred over 2-step when longer qualifies', () => {
    const steps = [
      makeStepIntelligence({ stepId: 's1', verb: 'navigate', object: 'page' }),
      makeStepIntelligence({ stepId: 's2', verb: 'fill', object: 'form' }),
      makeStepIntelligence({ stepId: 's3', verb: 'submit', object: 'form' }),
    ];
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      steps: steps,
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      steps: steps,
    });
    const result = analyzePortfolio([r1, r2]);
    const seqPatterns = result.patterns.filter(p => p.patternType === 'shared_skill_sequence');
    // Should have a 3-step pattern
    const has3Step = seqPatterns.some(p => p.patternName.includes('navigate_page → fill_form → submit_form'));
    expect(has3Step).toBe(true);
    // Should NOT have 2-step subsets of the 3-step pattern (deduplication)
    const hasNavigateFill = seqPatterns.some(p =>
      p.patternName === 'Shared sequence: navigate_page → fill_form' &&
      !p.patternName.includes('submit_form')
    );
    expect(hasNavigateFill).toBe(false);
  });

  it('no common sequences → no shared_skill_sequence pattern', () => {
    const steps1 = [
      makeStepIntelligence({ stepId: 's1', verb: 'send', object: 'email' }),
      makeStepIntelligence({ stepId: 's2', verb: 'download', object: 'file' }),
    ];
    const steps2 = [
      makeStepIntelligence({ stepId: 's3', verb: 'fill', object: 'form' }),
      makeStepIntelligence({ stepId: 's4', verb: 'submit', object: 'report' }),
    ];
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      steps: steps1,
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      steps: steps2,
    });
    const result = analyzePortfolio([r1, r2]);
    const seqPatterns = result.patterns.filter(p => p.patternType === 'shared_skill_sequence');
    expect(seqPatterns).toHaveLength(0);
  });

  it('confidence is 0.8 for sequences in 2 workflows', () => {
    const steps = [
      makeStepIntelligence({ stepId: 's1', verb: 'open', object: 'email' }),
      makeStepIntelligence({ stepId: 's2', verb: 'download', object: 'file' }),
    ];
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      steps,
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      steps,
    });
    const result = analyzePortfolio([r1, r2]);
    const seqPatterns = result.patterns.filter(p => p.patternType === 'shared_skill_sequence');
    expect(seqPatterns[0]!.confidence).toBe(0.8);
  });

  it('confidence is 0.9 for sequences in 3+ workflows', () => {
    const steps = [
      makeStepIntelligence({ stepId: 's1', verb: 'open', object: 'email' }),
      makeStepIntelligence({ stepId: 's2', verb: 'download', object: 'file' }),
    ];
    const r1 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-001' }), steps });
    const r2 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-002' }), steps });
    const r3 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-003' }), steps });
    const result = analyzePortfolio([r1, r2, r3]);
    const seqPatterns = result.patterns.filter(p => p.patternType === 'shared_skill_sequence');
    expect(seqPatterns[0]!.confidence).toBe(0.9);
  });

  it('pattern contains workflowIds for all matching workflows', () => {
    const steps = [
      makeStepIntelligence({ stepId: 's1', verb: 'navigate', object: 'page' }),
      makeStepIntelligence({ stepId: 's2', verb: 'fill', object: 'form' }),
    ];
    const r1 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-001' }), steps });
    const r2 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-002' }), steps });
    const result = analyzePortfolio([r1, r2]);
    const seqPatterns = result.patterns.filter(p => p.patternType === 'shared_skill_sequence');
    expect(seqPatterns[0]!.workflowIds).toContain('wf-001');
    expect(seqPatterns[0]!.workflowIds).toContain('wf-002');
  });
});

// ─── 4. Common System Pairs ───────────────────────────────────────────────────

describe('Common System Pairs', () => {
  it('two systems co-occurring in 2 workflows → pattern detected', () => {
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001', systems: ['gmail', 'netsuite'] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002', systems: ['gmail', 'netsuite'] }),
    });
    const result = analyzePortfolio([r1, r2]);
    const pairPatterns = result.patterns.filter(p => p.patternType === 'common_system_pair');
    expect(pairPatterns.length).toBeGreaterThan(0);
    expect(pairPatterns[0]!.patternName).toContain('gmail');
    expect(pairPatterns[0]!.patternName).toContain('netsuite');
  });

  it('systems not co-occurring in 2+ workflows → no pair pattern', () => {
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001', systems: ['gmail'] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002', systems: ['netsuite'] }),
    });
    const result = analyzePortfolio([r1, r2]);
    const pairPatterns = result.patterns.filter(p => p.patternType === 'common_system_pair');
    expect(pairPatterns).toHaveLength(0);
  });

  it('confidence is 0.7 for system pair in 2 workflows', () => {
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001', systems: ['slack', 'jira'] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002', systems: ['slack', 'jira'] }),
    });
    const result = analyzePortfolio([r1, r2]);
    const pairPatterns = result.patterns.filter(p => p.patternType === 'common_system_pair');
    expect(pairPatterns[0]!.confidence).toBe(0.7);
  });

  it('confidence is 0.85 for system pair in 3+ workflows', () => {
    const r1 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-001', systems: ['slack', 'jira'] }) });
    const r2 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-002', systems: ['slack', 'jira'] }) });
    const r3 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-003', systems: ['slack', 'jira'] }) });
    const result = analyzePortfolio([r1, r2, r3]);
    const pairPatterns = result.patterns.filter(p => p.patternType === 'common_system_pair');
    expect(pairPatterns[0]!.confidence).toBe(0.85);
  });

  it('frequency reflects number of workflows where pair co-occurs', () => {
    const r1 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-001', systems: ['gmail', 'drive'] }) });
    const r2 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-002', systems: ['gmail', 'drive'] }) });
    const r3 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-003', systems: ['gmail', 'drive'] }) });
    const result = analyzePortfolio([r1, r2, r3]);
    const pairPatterns = result.patterns.filter(p => p.patternType === 'common_system_pair');
    expect(pairPatterns[0]!.frequency).toBe(3);
  });
});

// ─── 5. Similar Structure ─────────────────────────────────────────────────────

describe('Similar Structure', () => {
  it('workflows with matching activity/system/automation → similar_structure pattern', () => {
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001', activityCount: 3, systems: ['a', 'b'], automationScore: 70 }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002', activityCount: 3, systems: ['c', 'd'], automationScore: 75 }),
    });
    const result = analyzePortfolio([r1, r2]);
    const structPatterns = result.patterns.filter(p => p.patternType === 'similar_structure');
    expect(structPatterns.length).toBeGreaterThan(0);
  });

  it('workflows with very different structures → no similar_structure pattern', () => {
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001', activityCount: 10, systems: ['a', 'b', 'c', 'd'], automationScore: 20 }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002', activityCount: 1, systems: ['x'], automationScore: 90 }),
    });
    const result = analyzePortfolio([r1, r2]);
    const structPatterns = result.patterns.filter(p => p.patternType === 'similar_structure');
    expect(structPatterns).toHaveLength(0);
  });

  it('tolerance: ±1 activities, ±1 systems, ±15 automation score', () => {
    // Exactly at boundary: should match
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001', activityCount: 5, systems: ['a', 'b', 'c'], automationScore: 60 }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002', activityCount: 6, systems: ['a', 'b', 'c', 'd'], automationScore: 75 }),
    });
    const atBoundary = analyzePortfolio([r1, r2]);
    const atBoundaryPatterns = atBoundary.patterns.filter(p => p.patternType === 'similar_structure');
    expect(atBoundaryPatterns.length).toBeGreaterThan(0);

    // One step beyond boundary: should NOT match
    const r3 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-003', activityCount: 8, systems: ['a', 'b', 'c', 'd', 'e', 'f'], automationScore: 30 }),
    });
    const beyondBoundary = analyzePortfolio([r1, r3]);
    const beyondPatterns = beyondBoundary.patterns.filter(p => p.patternType === 'similar_structure');
    expect(beyondPatterns).toHaveLength(0);
  });

  it('evidence contains pair descriptions', () => {
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001', activityCount: 3, systems: ['a', 'b'], automationScore: 70 }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002', activityCount: 3, systems: ['c', 'd'], automationScore: 72 }),
    });
    const result = analyzePortfolio([r1, r2]);
    const structPatterns = result.patterns.filter(p => p.patternType === 'similar_structure');
    expect(structPatterns[0]!.evidence[0]).toContain('wf-001');
    expect(structPatterns[0]!.evidence[0]).toContain('wf-002');
  });
});

// ─── 6. Shared Bottlenecks ────────────────────────────────────────────────────

describe('Shared Bottlenecks', () => {
  it('friction_reduction opportunity on same system in 2 workflows → bottleneck pattern', () => {
    const opp1 = makeOpportunity({
      category: 'friction_reduction',
      systems: ['netsuite'],
    });
    const opp2 = makeOpportunity({
      category: 'friction_reduction',
      systems: ['netsuite'],
    });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      opportunities: makeOpportunityAnalysis({ opportunities: [opp1] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      opportunities: makeOpportunityAnalysis({ opportunities: [opp2] }),
    });
    const result = analyzePortfolio([r1, r2]);
    const bottlenecks = result.patterns.filter(p => p.patternType === 'shared_bottleneck');
    expect(bottlenecks.length).toBeGreaterThan(0);
    expect(bottlenecks[0]!.patternName).toContain('netsuite');
  });

  it('decision_support opportunity on same system in 2 workflows → bottleneck pattern', () => {
    const opp1 = makeOpportunity({ category: 'decision_support', systems: ['salesforce'] });
    const opp2 = makeOpportunity({ category: 'decision_support', systems: ['salesforce'] });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      opportunities: makeOpportunityAnalysis({ opportunities: [opp1] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      opportunities: makeOpportunityAnalysis({ opportunities: [opp2] }),
    });
    const result = analyzePortfolio([r1, r2]);
    const bottlenecks = result.patterns.filter(p => p.patternType === 'shared_bottleneck');
    expect(bottlenecks.length).toBeGreaterThan(0);
  });

  it('non-friction/decision categories → no bottleneck pattern', () => {
    const opp1 = makeOpportunity({ category: 'data_movement', systems: ['netsuite'] });
    const opp2 = makeOpportunity({ category: 'repetition', systems: ['netsuite'] });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      opportunities: makeOpportunityAnalysis({ opportunities: [opp1] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      opportunities: makeOpportunityAnalysis({ opportunities: [opp2] }),
    });
    const result = analyzePortfolio([r1, r2]);
    const bottlenecks = result.patterns.filter(p => p.patternType === 'shared_bottleneck');
    expect(bottlenecks).toHaveLength(0);
  });

  it('frequency reflects workflow count with bottleneck', () => {
    const opp = makeOpportunity({ category: 'friction_reduction', systems: ['jira'] });
    const r1 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-001' }), opportunities: makeOpportunityAnalysis({ opportunities: [opp] }) });
    const r2 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-002' }), opportunities: makeOpportunityAnalysis({ opportunities: [opp] }) });
    const r3 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-003' }), opportunities: makeOpportunityAnalysis({ opportunities: [opp] }) });
    const result = analyzePortfolio([r1, r2, r3]);
    const bottlenecks = result.patterns.filter(p => p.patternType === 'shared_bottleneck');
    expect(bottlenecks[0]!.frequency).toBe(3);
  });
});

// ─── 7. Portfolio Summary ─────────────────────────────────────────────────────

describe('Portfolio Summary', () => {
  it('workflowCount equals results.length', () => {
    const r1 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-001' }) });
    const r2 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-002' }) });
    const r3 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-003' }) });
    const result = analyzePortfolio([r1, r2, r3]);
    expect(result.summary.workflowCount).toBe(3);
  });

  it('totalStepCount sums stepCount across all workflows', () => {
    const r1 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-001', stepCount: 5 }) });
    const r2 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-002', stepCount: 3 }) });
    const result = analyzePortfolio([r1, r2]);
    expect(result.summary.totalStepCount).toBe(8);
  });

  it('sharedSkillCount equals sharedSkills.length', () => {
    const skill = makeSkill({ verb: 'send', object: 'email', skillName: 'send_email' });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      skillLibrary: makeSkillLibrary({ skills: [skill] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      skillLibrary: makeSkillLibrary({ skills: [skill] }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.summary.sharedSkillCount).toBe(result.sharedSkills.length);
  });

  it('averageAutomationScore computed correctly (rounded to integer)', () => {
    const r1 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-001', automationScore: 60 }) });
    const r2 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-002', automationScore: 80 }) });
    const result = analyzePortfolio([r1, r2]);
    expect(result.summary.averageAutomationScore).toBe(70);
  });

  it('totalEstimatedTimeSavingsMs is null if any workflow has null', () => {
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      opportunities: makeOpportunityAnalysis({ totalEstimatedTimeSavingsMs: 10000 }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      opportunities: makeOpportunityAnalysis({ totalEstimatedTimeSavingsMs: null }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.summary.totalEstimatedTimeSavingsMs).toBeNull();
  });

  it('totalEstimatedTimeSavingsMs sums when none are null', () => {
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      opportunities: makeOpportunityAnalysis({ totalEstimatedTimeSavingsMs: 5000 }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      opportunities: makeOpportunityAnalysis({ totalEstimatedTimeSavingsMs: 3000 }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.summary.totalEstimatedTimeSavingsMs).toBe(8000);
  });

  it('portfolioSkillDistribution initializes all 9 SkillType keys to 0 for empty portfolio', () => {
    const result = analyzePortfolio([]);
    const dist = result.summary.portfolioSkillDistribution;
    const expectedKeys: SkillType[] = [
      'data_extraction', 'data_entry', 'navigation', 'verification',
      'communication', 'file_operation', 'decision', 'integration', 'monitoring',
    ];
    for (const key of expectedKeys) {
      expect(dist[key]).toBe(0);
    }
  });

  it('portfolioSkillDistribution counts unique skills once regardless of workflow count', () => {
    const navigationSkill = makeSkill({
      skillId: 'skill-navigate_page',
      verb: 'navigate', object: 'page', skillName: 'navigate_page',
      skillType: 'navigation',
    });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      skillLibrary: makeSkillLibrary({ skills: [navigationSkill] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      skillLibrary: makeSkillLibrary({ skills: [navigationSkill] }),
    });
    const result = analyzePortfolio([r1, r2]);
    // navigate_page appears in both workflows but should count as 1 in distribution
    expect(result.summary.portfolioSkillDistribution['navigation']).toBe(1);
  });
});

// ─── 8. Edge Cases ────────────────────────────────────────────────────────────

describe('Edge Cases', () => {
  it('empty results array → empty output with all zeros', () => {
    const result = analyzePortfolio([]);
    expect(result.sharedSkills).toHaveLength(0);
    expect(result.sharedSystems).toHaveLength(0);
    expect(result.patterns).toHaveLength(0);
    expect(result.summary.workflowCount).toBe(0);
    expect(result.summary.totalStepCount).toBe(0);
    expect(result.summary.totalUniqueSkills).toBe(0);
    expect(result.summary.sharedSkillCount).toBe(0);
    expect(result.summary.averageAutomationScore).toBe(0);
    expect(result.summary.totalEstimatedTimeSavingsMs).toBeNull();
  });

  it('single workflow → no shared skills, no shared systems, no patterns', () => {
    const skill = makeSkill({ verb: 'send', object: 'email' });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001', systems: ['gmail'] }),
      skillLibrary: makeSkillLibrary({ skills: [skill] }),
    });
    const result = analyzePortfolio([r1]);
    expect(result.sharedSkills).toHaveLength(0);
    expect(result.sharedSystems).toHaveLength(0);
    expect(result.patterns).toHaveLength(0);
    expect(result.summary.workflowCount).toBe(1);
  });

  it('two identical workflows → all skills shared, all systems shared', () => {
    const skill = makeSkill({ verb: 'send', object: 'email', skillName: 'send_email_in_gmail', requiredSystems: ['gmail'] });
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001', systems: ['gmail'] }),
      skillLibrary: makeSkillLibrary({ skills: [skill] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002', systems: ['gmail'] }),
      skillLibrary: makeSkillLibrary({ skills: [skill] }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.sharedSkills).toHaveLength(1);
    expect(result.sharedSystems).toHaveLength(1);
  });

  it('workflows with no skills → empty sharedSkills', () => {
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001' }),
      skillLibrary: makeSkillLibrary({ skills: [] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002' }),
      skillLibrary: makeSkillLibrary({ skills: [] }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.sharedSkills).toHaveLength(0);
  });

  it('workflows with no systems → empty sharedSystems', () => {
    const r1 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-001', systems: [] }),
    });
    const r2 = makeTransformationResult({
      workflow: makeWorkflow({ workflowId: 'wf-002', systems: [] }),
    });
    const result = analyzePortfolio([r1, r2]);
    expect(result.sharedSystems).toHaveLength(0);
  });

  it('pattern IDs are stable strings of form "pattern-N"', () => {
    const steps = [
      makeStepIntelligence({ stepId: 's1', verb: 'navigate', object: 'page' }),
      makeStepIntelligence({ stepId: 's2', verb: 'fill', object: 'form' }),
    ];
    const r1 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-001', systems: ['netsuite', 'gmail'] }), steps });
    const r2 = makeTransformationResult({ workflow: makeWorkflow({ workflowId: 'wf-002', systems: ['netsuite', 'gmail'] }), steps });
    const result = analyzePortfolio([r1, r2]);
    for (let i = 0; i < result.patterns.length; i++) {
      expect(result.patterns[i]!.patternId).toBe(`pattern-${i + 1}`);
    }
  });
});

// ─── 9. Integration (with real transformWorkflow output) ──────────────────────

describe('Integration with transformWorkflow', () => {
  it('produces valid CrossWorkflowIntelligence structure from two real transformed workflows', () => {
    const output1 = makeProcessOutput([
      makeStepDefinition(1, {
        stepId: 'step-inv-1',
        title: 'Open email with invoice attachment',
        category: 'click_then_navigate',
        systems: ['gmail'],
      }),
      makeStepDefinition(2, {
        stepId: 'step-inv-2',
        title: 'Download PDF attachment from email',
        category: 'file_action',
        systems: ['gmail'],
      }),
      makeStepDefinition(3, {
        stepId: 'step-inv-3',
        title: 'Navigate to NetSuite accounts module',
        category: 'click_then_navigate',
        systems: ['netsuite'],
      }),
      makeStepDefinition(4, {
        stepId: 'step-inv-4',
        title: 'Fill invoice form in NetSuite',
        category: 'data_entry',
        systems: ['netsuite'],
      }),
    ], 'run-invoice-001');

    const output2 = makeProcessOutput([
      makeStepDefinition(1, {
        stepId: 'step-exp-1',
        title: 'Open email with expense report',
        category: 'click_then_navigate',
        systems: ['gmail'],
      }),
      makeStepDefinition(2, {
        stepId: 'step-exp-2',
        title: 'Download expense attachment',
        category: 'file_action',
        systems: ['gmail'],
      }),
      makeStepDefinition(3, {
        stepId: 'step-exp-3',
        title: 'Navigate to NetSuite expense module',
        category: 'click_then_navigate',
        systems: ['netsuite'],
      }),
      makeStepDefinition(4, {
        stepId: 'step-exp-4',
        title: 'Fill expense form details',
        category: 'data_entry',
        systems: ['netsuite'],
      }),
    ], 'run-expense-001');

    const r1 = transformWorkflow(output1);
    const r2 = transformWorkflow(output2);

    const portfolio = analyzePortfolio([r1, r2]);

    // Structure is valid
    expect(Array.isArray(portfolio.sharedSkills)).toBe(true);
    expect(Array.isArray(portfolio.sharedSystems)).toBe(true);
    expect(Array.isArray(portfolio.patterns)).toBe(true);
    expect(typeof portfolio.summary).toBe('object');
    expect(portfolio.summary.workflowCount).toBe(2);
    expect(portfolio.summary.portfolioSkillDistribution).toBeDefined();
  });

  it('shared systems detected between two gmail+netsuite workflows', () => {
    const makeGmailNetsuiteOutput = (runId: string, prefix: string): ProcessOutput =>
      makeProcessOutput([
        makeStepDefinition(1, { stepId: `${prefix}-1`, title: 'Open email', systems: ['gmail'], category: 'click_then_navigate' }),
        makeStepDefinition(2, { stepId: `${prefix}-2`, title: 'Fill form in NetSuite', systems: ['netsuite'], category: 'data_entry' }),
      ], runId);

    const r1 = transformWorkflow(makeGmailNetsuiteOutput('run-001', 'a'));
    const r2 = transformWorkflow(makeGmailNetsuiteOutput('run-002', 'b'));
    const portfolio = analyzePortfolio([r1, r2]);

    const systemNames = portfolio.sharedSystems.map(s => s.system);
    expect(systemNames).toContain('gmail');
    expect(systemNames).toContain('netsuite');
  });

  it('portfolioSkillDistribution has all required keys', () => {
    const output = makeProcessOutput([
      makeStepDefinition(1, { title: 'Navigate to page', category: 'click_then_navigate', systems: [] }),
    ], 'run-001');
    const r1 = transformWorkflow(output);
    const r2 = transformWorkflow({ ...output, processRun: makeProcessRun({ runId: 'run-002' }) });
    const portfolio = analyzePortfolio([r1, r2]);

    const expectedKeys: SkillType[] = [
      'data_extraction', 'data_entry', 'navigation', 'verification',
      'communication', 'file_operation', 'decision', 'integration', 'monitoring',
    ];
    for (const key of expectedKeys) {
      expect(portfolio.summary.portfolioSkillDistribution[key]).toBeGreaterThanOrEqual(0);
    }
  });
});
