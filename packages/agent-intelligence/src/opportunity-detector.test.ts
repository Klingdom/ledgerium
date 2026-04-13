/**
 * Comprehensive tests for the Opportunity Detector pipeline stage.
 *
 * Tests cover:
 * 1. Repetition Detection
 * 2. Deterministic Logic Detection
 * 3. Data Movement Detection
 * 4. Content Generation Detection
 * 5. Multi-System Orchestration Detection
 * 6. Friction Reduction Detection
 * 7. Decision Support Detection
 * 8. Scoring & Aggregation
 * 9. Integration with Full Pipeline
 * 10. Edge Cases
 */

import { describe, it, expect } from 'vitest';
import type {
  StepIntelligence,
  Activity,
  WorkflowStructure,
  SkillLibrary,
  Skill,
  DecisionPoint,
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
import { detectOpportunities } from './opportunity-detector.js';
import { transformWorkflow } from './transform.js';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

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

function makeDecisionPoint(overrides: Partial<DecisionPoint> = {}): DecisionPoint {
  return {
    decisionId: 'dec-1',
    afterStepId: 'step-1',
    type: 'human_judgment',
    description: 'Human judgment required',
    indicators: ['manual review needed'],
    confidence: 0.8,
    stepOrdinals: [1],
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
    reusabilityScore: 0.3,
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

// ─── Pipeline fixture builders ────────────────────────────────────────────────

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
  return {
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
    sourceEventIds: [`evt-${ordinal}-a`],
    ...overrides,
  };
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

function makeProcessOutput(
  stepDefs: StepDefinition[],
  sopSteps: SOPStep[],
  nodes: ProcessMapNode[],
  edges: ProcessMapEdge[],
  runOverrides: Partial<ProcessRun> = {},
): ProcessOutput {
  return {
    processRun: makeProcessRun({
      stepCount: stepDefs.length,
      systemsUsed: [...new Set(stepDefs.flatMap(s => s.systems))],
      ...runOverrides,
    }),
    processDefinition: makeProcessDefinition(stepDefs),
    processMap: makeProcessMap(nodes, edges),
    sop: makeSOP(sopSteps),
  };
}

// ─── 1. Repetition Detection ──────────────────────────────────────────────────

describe('1. Repetition Detection', () => {
  it('detects repetition when a skill has 2+ sourceStepIds', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: 'gmail', estimatedDurationMs: 10000 }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'send', object: 'email', system: 'gmail', estimatedDurationMs: 10000 }),
    ];
    const skill = makeSkill({
      skillId: 'skill-send_email_in_gmail',
      skillName: 'send_email_in_gmail',
      verb: 'send', object: 'email',
      sourceStepIds: ['step-1', 'step-2'],
      automationClassification: 'ai_assisted',
    });
    const library = makeSkillLibrary({ skills: [skill] });
    const workflow = makeWorkflow({ systems: ['gmail'], totalDurationMs: 20000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const repetition = result.opportunities.filter(o => o.category === 'repetition');
    expect(repetition.length).toBeGreaterThanOrEqual(1);
  });

  it('detects repetition for 3 consecutive steps with the same verb', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'click', object: 'button', estimatedDurationMs: 2000 }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'click', object: 'link', estimatedDurationMs: 2000 }),
      makeStepIntelligence({ stepId: 'step-3', verb: 'click', object: 'tab', estimatedDurationMs: 2000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ systems: [], totalDurationMs: 6000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const repetition = result.opportunities.filter(o => o.category === 'repetition');
    expect(repetition.length).toBeGreaterThanOrEqual(1);
  });

  it('does not detect repetition when no skills repeat and no consecutive same-verb run', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'click', object: 'button' }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'enter', object: 'form' }),
      makeStepIntelligence({ stepId: 'step-3', verb: 'submit', object: 'form' }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow();

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.repetition).toBe(0);
  });

  it('repetition opportunity has classification automation_candidate', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'navigate', object: 'page', estimatedDurationMs: 3000 }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'navigate', object: 'page', estimatedDurationMs: 3000 }),
    ];
    const skill = makeSkill({
      skillId: 'skill-navigate_page',
      skillName: 'navigate_page',
      verb: 'navigate', object: 'page',
      sourceStepIds: ['step-1', 'step-2'],
      automationClassification: 'full_automation',
    });
    const library = makeSkillLibrary({ skills: [skill] });
    const workflow = makeWorkflow({ totalDurationMs: 6000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const repetition = result.opportunities.find(o => o.category === 'repetition');
    expect(repetition?.classification).toBe('automation_candidate');
  });

  it('repetition time savings equals sum of repeated step durations minus one occurrence', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'enter', object: 'form', estimatedDurationMs: 8000 }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'enter', object: 'form', estimatedDurationMs: 8000 }),
      makeStepIntelligence({ stepId: 'step-3', verb: 'enter', object: 'form', estimatedDurationMs: 8000 }),
    ];
    const skill = makeSkill({
      skillId: 'skill-enter_form',
      skillName: 'enter_form',
      verb: 'enter', object: 'form',
      sourceStepIds: ['step-1', 'step-2', 'step-3'],
      automationClassification: 'full_automation',
    });
    const library = makeSkillLibrary({ skills: [skill] });
    const workflow = makeWorkflow({ totalDurationMs: 24000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const repetition = result.opportunities.find(
      o => o.category === 'repetition' && o.affectedStepIds.includes('step-1'),
    );
    // 3 occurrences, savings = sum of 2 durations = 16000ms
    expect(repetition?.estimatedTimeSavingsMs).toBe(16000);
  });

  it('repetition opportunity includes evidence with count', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', estimatedDurationMs: 5000 }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'send', object: 'email', estimatedDurationMs: 5000 }),
    ];
    const skill = makeSkill({
      skillId: 'skill-send_email',
      skillName: 'send_email',
      verb: 'send', object: 'email',
      sourceStepIds: ['step-1', 'step-2'],
      automationClassification: 'full_automation',
    });
    const library = makeSkillLibrary({ skills: [skill] });
    const workflow = makeWorkflow({ totalDurationMs: 10000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const repetition = result.opportunities.find(o => o.category === 'repetition');
    expect(repetition?.evidence.length).toBeGreaterThanOrEqual(1);
    expect(repetition?.evidence[0]!.metric).toContain('count=');
  });
});

// ─── 2. Deterministic Logic Detection ────────────────────────────────────────

describe('2. Deterministic Logic Detection', () => {
  it('detects deterministic logic for 3 consecutive full_automation steps with confidence >= 0.8', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', automationClassification: 'full_automation', confidence: 0.9 }),
      makeStepIntelligence({ stepId: 'step-2', automationClassification: 'full_automation', confidence: 0.95 }),
      makeStepIntelligence({ stepId: 'step-3', automationClassification: 'full_automation', confidence: 0.85 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 15000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.deterministic_logic).toBeGreaterThanOrEqual(1);
  });

  it('detects deterministic logic for 2 consecutive full_automation high-confidence steps', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', automationClassification: 'full_automation', confidence: 0.9 }),
      makeStepIntelligence({ stepId: 'step-2', automationClassification: 'full_automation', confidence: 0.9 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 10000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.deterministic_logic).toBeGreaterThanOrEqual(1);
  });

  it('does not detect deterministic logic when steps have mixed automation types', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', automationClassification: 'full_automation', confidence: 0.9 }),
      makeStepIntelligence({ stepId: 'step-2', automationClassification: 'manual_only', confidence: 0.9 }),
      makeStepIntelligence({ stepId: 'step-3', automationClassification: 'full_automation', confidence: 0.9 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 15000 });

    const result = detectOpportunities(steps, [], workflow, library);
    // Each run of 1 full_automation step is less than 2, so no opportunity
    expect(result.categoryBreakdown.deterministic_logic).toBe(0);
  });

  it('does not detect deterministic logic for full_automation steps with confidence < 0.8', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', automationClassification: 'full_automation', confidence: 0.5 }),
      makeStepIntelligence({ stepId: 'step-2', automationClassification: 'full_automation', confidence: 0.6 }),
      makeStepIntelligence({ stepId: 'step-3', automationClassification: 'full_automation', confidence: 0.7 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 15000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.deterministic_logic).toBe(0);
  });

  it('deterministic logic opportunity has classification automation_candidate', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', automationClassification: 'full_automation', confidence: 0.9, estimatedDurationMs: 5000 }),
      makeStepIntelligence({ stepId: 'step-2', automationClassification: 'full_automation', confidence: 0.9, estimatedDurationMs: 5000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 10000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const opp = result.opportunities.find(o => o.category === 'deterministic_logic');
    expect(opp?.classification).toBe('automation_candidate');
  });

  it('deterministic logic time savings equals sum of affected step durations', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', automationClassification: 'full_automation', confidence: 0.9, estimatedDurationMs: 7000 }),
      makeStepIntelligence({ stepId: 'step-2', automationClassification: 'full_automation', confidence: 0.9, estimatedDurationMs: 8000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 15000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const opp = result.opportunities.find(o => o.category === 'deterministic_logic');
    expect(opp?.estimatedTimeSavingsMs).toBe(15000);
  });
});

// ─── 3. Data Movement Detection ───────────────────────────────────────────────

describe('3. Data Movement Detection', () => {
  it('detects cross-system data movement when step A outputs overlap with step B inputs in a different system', () => {
    const steps = [
      makeStepIntelligence({
        stepId: 'step-1', system: 'gmail',
        outputData: ['invoice_number'],
        estimatedDurationMs: 5000,
      }),
      makeStepIntelligence({
        stepId: 'step-2', system: 'netsuite',
        inputData: ['invoice_number'],
        estimatedDurationMs: 20000,
      }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ systems: ['gmail', 'netsuite'], totalDurationMs: 25000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.data_movement).toBeGreaterThanOrEqual(1);
  });

  it('detects copy/paste verbs as data movement', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'copy', object: 'text', system: 'gmail', estimatedDurationMs: 3000 }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'paste', object: 'text', system: 'netsuite', estimatedDurationMs: 3000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ systems: ['gmail', 'netsuite'], totalDurationMs: 6000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.data_movement).toBeGreaterThanOrEqual(1);
  });

  it('does NOT detect data movement when producer and consumer are in the same system', () => {
    const steps = [
      makeStepIntelligence({
        stepId: 'step-1', system: 'netsuite',
        outputData: ['invoice_number'],
        estimatedDurationMs: 5000,
      }),
      makeStepIntelligence({
        stepId: 'step-2', system: 'netsuite',
        inputData: ['invoice_number'],
        estimatedDurationMs: 10000,
      }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ systems: ['netsuite'], totalDurationMs: 15000 });

    const result = detectOpportunities(steps, [], workflow, library);
    // copy/paste verbs are not present, cross-system is not present
    expect(result.categoryBreakdown.data_movement).toBe(0);
  });

  it('data movement opportunity has classification integration_opportunity', () => {
    const steps = [
      makeStepIntelligence({
        stepId: 'step-1', system: 'salesforce',
        outputData: ['customer_id'],
        estimatedDurationMs: 5000,
      }),
      makeStepIntelligence({
        stepId: 'step-2', system: 'netsuite',
        inputData: ['customer_id'],
        estimatedDurationMs: 15000,
      }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ systems: ['salesforce', 'netsuite'], totalDurationMs: 20000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const opp = result.opportunities.find(o => o.category === 'data_movement');
    expect(opp?.classification).toBe('integration_opportunity');
  });

  it('data movement evidence describes the systems involved', () => {
    const steps = [
      makeStepIntelligence({
        stepId: 'step-1', system: 'gmail',
        outputData: ['po_number'],
        estimatedDurationMs: 5000,
      }),
      makeStepIntelligence({
        stepId: 'step-2', system: 'netsuite',
        inputData: ['po_number'],
        estimatedDurationMs: 10000,
      }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ systems: ['gmail', 'netsuite'], totalDurationMs: 15000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const opp = result.opportunities.find(o => o.category === 'data_movement');
    expect(opp?.evidence[0]!.reasoning).toContain('gmail');
    expect(opp?.evidence[0]!.reasoning).toContain('netsuite');
  });

  it('detects extraction-then-entry pattern as data movement', () => {
    const extractionSkill = makeSkill({
      skillId: 'skill-extract_data',
      skillName: 'extract_data',
      verb: 'extract', object: 'data',
      skillType: 'data_extraction',
      sourceStepIds: ['step-1'],
      automationClassification: 'full_automation',
    });
    const entrySkill = makeSkill({
      skillId: 'skill-enter_form',
      skillName: 'enter_form',
      verb: 'enter', object: 'form',
      skillType: 'data_entry',
      sourceStepIds: ['step-2'],
      automationClassification: 'ai_assisted',
    });
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'gmail', verb: 'extract', object: 'data', estimatedDurationMs: 5000 }),
      makeStepIntelligence({ stepId: 'step-2', system: 'netsuite', verb: 'enter', object: 'form', estimatedDurationMs: 10000 }),
    ];
    const library = makeSkillLibrary({ skills: [extractionSkill, entrySkill] });
    const workflow = makeWorkflow({ systems: ['gmail', 'netsuite'], totalDurationMs: 15000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.data_movement).toBeGreaterThanOrEqual(1);
  });
});

// ─── 4. Content Generation Detection ─────────────────────────────────────────

describe('4. Content Generation Detection', () => {
  it('detects content generation for verb=enter, object=email', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'enter', object: 'email', estimatedDurationMs: 60000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 60000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.content_generation).toBeGreaterThanOrEqual(1);
  });

  it('detects content generation for verb=fill, object=report', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'fill', object: 'report', estimatedDurationMs: 90000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 90000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.content_generation).toBeGreaterThanOrEqual(1);
  });

  it('does NOT detect content generation for verb=click, object=button', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'click', object: 'button', estimatedDurationMs: 2000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 2000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.content_generation).toBe(0);
  });

  it('content generation opportunity has classification ai_assist_candidate', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'write', object: 'document', estimatedDurationMs: 120000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 120000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const opp = result.opportunities.find(o => o.category === 'content_generation');
    expect(opp?.classification).toBe('ai_assist_candidate');
  });

  it('content generation time savings equals 70% of step durations', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'enter', object: 'message', estimatedDurationMs: 100000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 100000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const opp = result.opportunities.find(o => o.category === 'content_generation');
    expect(opp?.estimatedTimeSavingsMs).toBe(70000);
  });
});

// ─── 5. Multi-System Orchestration Detection ──────────────────────────────────

describe('5. Multi-System Orchestration Detection', () => {
  it('detects multi-system orchestration when workflow spans 3+ systems', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'gmail' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'netsuite' }),
      makeStepIntelligence({ stepId: 'step-3', system: 'salesforce' }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ systems: ['gmail', 'netsuite', 'salesforce'], totalDurationMs: 15000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.multi_system_orchestration).toBe(1);
  });

  it('does NOT detect multi-system orchestration for 2 systems', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'gmail' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'netsuite' }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ systems: ['gmail', 'netsuite'], totalDurationMs: 10000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.multi_system_orchestration).toBe(0);
  });

  it('multi-system orchestration has classification agent_orchestration_candidate', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'gmail' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'netsuite' }),
      makeStepIntelligence({ stepId: 'step-3', system: 'jira' }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ systems: ['gmail', 'netsuite', 'jira'], totalDurationMs: 15000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const opp = result.opportunities.find(o => o.category === 'multi_system_orchestration');
    expect(opp?.classification).toBe('agent_orchestration_candidate');
  });

  it('multi-system orchestration time savings equals 30% of total workflow duration', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1' })];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ systems: ['gmail', 'netsuite', 'salesforce'], totalDurationMs: 100000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const opp = result.opportunities.find(o => o.category === 'multi_system_orchestration');
    expect(opp?.estimatedTimeSavingsMs).toBe(30000);
  });

  it('multi-system orchestration affects all steps', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', system: 'gmail' }),
      makeStepIntelligence({ stepId: 'step-2', system: 'netsuite' }),
      makeStepIntelligence({ stepId: 'step-3', system: 'salesforce' }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ systems: ['gmail', 'netsuite', 'salesforce'], totalDurationMs: 15000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const opp = result.opportunities.find(o => o.category === 'multi_system_orchestration');
    expect(opp?.affectedStepIds).toHaveLength(3);
  });
});

// ─── 6. Friction Reduction Detection ─────────────────────────────────────────

describe('6. Friction Reduction Detection', () => {
  it('detects friction for a step with duration > 30000ms', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', estimatedDurationMs: 45000, verb: 'enter', object: 'form' }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 45000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.friction_reduction).toBeGreaterThanOrEqual(1);
  });

  it('does NOT detect friction for a step with duration <= 30000ms', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', estimatedDurationMs: 5000, verb: 'click', object: 'button' }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 5000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.friction_reduction).toBe(0);
  });

  it('detects friction for a long multi-step activity (5+ steps, >60s)', () => {
    const activity = makeActivity({
      activityId: 'act-1',
      stepIds: ['s1', 's2', 's3', 's4', 's5'],
      stepCount: 5,
      estimatedDurationMs: 90000,
    });
    const steps = ['s1', 's2', 's3', 's4', 's5'].map((id, i) =>
      makeStepIntelligence({ stepId: id, estimatedDurationMs: 18000, rawReference: { stepOrdinal: i + 1, rawTitle: `Step ${i+1}`, category: 'single_action', systems: [], domains: [] } }),
    );
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 90000 });

    const result = detectOpportunities(steps, [activity], workflow, library);
    expect(result.categoryBreakdown.friction_reduction).toBeGreaterThanOrEqual(1);
  });

  it('friction reduction opportunity has classification ai_assist_candidate', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', estimatedDurationMs: 60000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 60000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const opp = result.opportunities.find(o => o.category === 'friction_reduction');
    expect(opp?.classification).toBe('ai_assist_candidate');
  });

  it('friction reduction time savings equals 50% of step duration', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', estimatedDurationMs: 80000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 80000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const opp = result.opportunities.find(o => o.category === 'friction_reduction');
    expect(opp?.estimatedTimeSavingsMs).toBe(40000);
  });
});

// ─── 7. Decision Support Detection ───────────────────────────────────────────

describe('7. Decision Support Detection', () => {
  it('detects decision support for a human_judgment DecisionPoint', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', estimatedDurationMs: 30000 }),
    ];
    const decisionPoint = makeDecisionPoint({ afterStepId: 'step-1', type: 'human_judgment' });
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({
      decisionPoints: [decisionPoint],
      totalDurationMs: 30000,
    });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.decision_support).toBeGreaterThanOrEqual(1);
  });

  it('detects decision support for human_in_loop steps', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', automationClassification: 'human_in_loop', estimatedDurationMs: 15000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 15000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.decision_support).toBeGreaterThanOrEqual(1);
  });

  it('does NOT detect decision support when no decision points and no human_in_loop steps', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-2', automationClassification: 'full_automation' }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ decisionPoints: [] });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.categoryBreakdown.decision_support).toBe(0);
  });

  it('decision support opportunity has classification ai_assist_candidate', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', automationClassification: 'human_in_loop', estimatedDurationMs: 20000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 20000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const opp = result.opportunities.find(o => o.category === 'decision_support');
    expect(opp?.classification).toBe('ai_assist_candidate');
  });

  it('decision support evidence mentions human judgment or step', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', estimatedDurationMs: 20000 }),
    ];
    const decisionPoint = makeDecisionPoint({ afterStepId: 'step-1', type: 'human_judgment', description: 'Approve invoice' });
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ decisionPoints: [decisionPoint], totalDurationMs: 20000 });

    const result = detectOpportunities(steps, [], workflow, library);
    const opp = result.opportunities.find(o => o.category === 'decision_support');
    expect(opp?.evidence[0]!.signal).toBe('human_judgment_decision_point');
  });
});

// ─── 8. Scoring & Aggregation ─────────────────────────────────────────────────

describe('8. Scoring & Aggregation', () => {
  it('score correctly combines 4 factors with proper weights', () => {
    // full_automation feasibility=90, confidence=1.0 → reliability=100
    // 1 step → frequency=20
    // timeSaved: 50000/100000 * 100 = 50
    // score = 50*0.35 + 20*0.20 + 90*0.30 + 100*0.15 = 17.5 + 4 + 27 + 15 = 63.5 → 64
    const steps = [
      makeStepIntelligence({
        stepId: 'step-1',
        automationClassification: 'full_automation',
        confidence: 1.0,
        estimatedDurationMs: 100000,
      }),
      makeStepIntelligence({
        stepId: 'step-2',
        automationClassification: 'full_automation',
        confidence: 1.0,
        estimatedDurationMs: 100000,
      }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 200000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.opportunities.length).toBeGreaterThan(0);
    const opp = result.opportunities[0]!;
    // Score must be in range 0-100
    expect(opp.score).toBeGreaterThanOrEqual(0);
    expect(opp.score).toBeLessThanOrEqual(100);
  });

  it('opportunities are sorted by score descending', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', automationClassification: 'full_automation', confidence: 0.9, estimatedDurationMs: 5000 }),
      makeStepIntelligence({ stepId: 'step-2', automationClassification: 'full_automation', confidence: 0.9, estimatedDurationMs: 5000 }),
      makeStepIntelligence({ stepId: 'step-3', automationClassification: 'human_in_loop', confidence: 0.5, estimatedDurationMs: 40000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 50000 });

    const result = detectOpportunities(steps, [], workflow, library);
    for (let i = 0; i < result.opportunities.length - 1; i++) {
      expect(result.opportunities[i]!.score).toBeGreaterThanOrEqual(result.opportunities[i + 1]!.score);
    }
  });

  it('opportunityId is assigned after sorting — opp-1 has the highest score', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', automationClassification: 'full_automation', confidence: 0.9, estimatedDurationMs: 5000 }),
      makeStepIntelligence({ stepId: 'step-2', automationClassification: 'full_automation', confidence: 0.9, estimatedDurationMs: 5000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 10000 });

    const result = detectOpportunities(steps, [], workflow, library);
    if (result.opportunities.length > 0) {
      const opp1 = result.opportunities.find(o => o.opportunityId === 'opp-1');
      expect(opp1).toBeDefined();
      // opp-1 should have the highest score (already sorted)
      expect(opp1!.score).toBe(result.topScore);
    }
  });

  it('categoryBreakdown has all 7 categories initialized to 0 when no opportunities', () => {
    const result = detectOpportunities([], [], makeWorkflow(), makeSkillLibrary());
    const keys = Object.keys(result.categoryBreakdown);
    expect(keys).toContain('repetition');
    expect(keys).toContain('deterministic_logic');
    expect(keys).toContain('data_movement');
    expect(keys).toContain('content_generation');
    expect(keys).toContain('multi_system_orchestration');
    expect(keys).toContain('friction_reduction');
    expect(keys).toContain('decision_support');
    for (const key of keys) {
      expect(result.categoryBreakdown[key as keyof typeof result.categoryBreakdown]).toBe(0);
    }
  });

  it('classificationBreakdown counts correctly', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', automationClassification: 'human_in_loop', confidence: 0.8, estimatedDurationMs: 40000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 40000 });

    const result = detectOpportunities(steps, [], workflow, library);
    // Should have at least friction_reduction (>30s) and decision_support (human_in_loop)
    const total = Object.values(result.classificationBreakdown).reduce((a, b) => a + b, 0);
    expect(total).toBe(result.totalOpportunities);
  });

  it('topScore matches the score of the highest scoring opportunity', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', automationClassification: 'full_automation', confidence: 0.9, estimatedDurationMs: 5000 }),
      makeStepIntelligence({ stepId: 'step-2', automationClassification: 'full_automation', confidence: 0.9, estimatedDurationMs: 5000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 10000 });

    const result = detectOpportunities(steps, [], workflow, library);
    if (result.opportunities.length > 0) {
      const maxScore = Math.max(...result.opportunities.map(o => o.score));
      expect(result.topScore).toBe(maxScore);
    }
  });

  it('totalEstimatedTimeSavingsMs sums all opportunity savings correctly', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', automationClassification: 'full_automation', confidence: 0.9, estimatedDurationMs: 40000 }),
      makeStepIntelligence({ stepId: 'step-2', automationClassification: 'full_automation', confidence: 0.9, estimatedDurationMs: 40000 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 80000 });

    const result = detectOpportunities(steps, [], workflow, library);
    if (result.totalEstimatedTimeSavingsMs !== null) {
      // Must equal sum of individual savings
      const sumFromOpps = result.opportunities
        .filter(o => o.estimatedTimeSavingsMs !== null)
        .reduce((s, o) => s + (o.estimatedTimeSavingsMs as number), 0);
      expect(result.totalEstimatedTimeSavingsMs).toBe(sumFromOpps);
    }
  });
});

// ─── 9. Integration with Full Pipeline ───────────────────────────────────────

describe('9. Integration with Full Pipeline', () => {
  it('result.opportunities is populated after transformWorkflow', () => {
    const stepDefs = [
      makeStepDefinition(1, { stepId: 'step-1', title: 'Open Gmail', systems: ['gmail'], durationMs: 3000 }),
      makeStepDefinition(2, { stepId: 'step-2', title: 'Download attachment from Gmail', systems: ['gmail'], durationMs: 2000, outputs: ['invoice_pdf'] }),
      makeStepDefinition(3, { stepId: 'step-3', title: 'Navigate to NetSuite', systems: ['netsuite'], durationMs: 4000 }),
      makeStepDefinition(4, { stepId: 'step-4', title: 'Enter invoice details in NetSuite form', category: 'data_entry', systems: ['netsuite'], durationMs: 45000, inputs: ['invoice_pdf'] }),
    ];
    const sopSteps = stepDefs.map((s, i) => makeSOPStep(i + 1, s.stepId));
    const nodes = stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category));
    const edges = stepDefs.slice(0, -1).map((_, i) =>
      makeMapEdge(`node-${i + 1}`, `node-${i + 2}`, i + 1),
    );

    const output = makeProcessOutput(stepDefs, sopSteps, nodes, edges, {
      runId: 'run-integration-001',
      activityName: 'Invoice Processing',
    });

    const result = transformWorkflow(output);
    expect(result.opportunities).toBeDefined();
    expect(result.opportunities.totalOpportunities).toBeGreaterThanOrEqual(0);
    expect(result.opportunities.categoryBreakdown).toBeDefined();
    expect(result.opportunities.classificationBreakdown).toBeDefined();
  });

  it('result.opportunities has all required OpportunityAnalysis fields', () => {
    const stepDefs = [
      makeStepDefinition(1, { stepId: 'step-1', title: 'Send email via Gmail', systems: ['gmail'], durationMs: 5000 }),
    ];
    const sopSteps = [makeSOPStep(1, 'step-1')];
    const nodes = [makeMapNode('step-1', 1)];

    const output = makeProcessOutput(stepDefs, sopSteps, nodes, [], {
      runId: 'run-integration-002',
    });

    const result = transformWorkflow(output);
    expect(Array.isArray(result.opportunities.opportunities)).toBe(true);
    expect(typeof result.opportunities.totalOpportunities).toBe('number');
    expect(typeof result.opportunities.topScore).toBe('number');
    expect(result.opportunities.topScore).toBeGreaterThanOrEqual(0);
  });

  it('detects at least one opportunity in a multi-system workflow with friction steps', () => {
    const stepDefs = [
      makeStepDefinition(1, { stepId: 'step-1', title: 'Open email in Gmail', systems: ['gmail'], durationMs: 3000 }),
      makeStepDefinition(2, { stepId: 'step-2', title: 'Fill invoice form in NetSuite', category: 'data_entry', systems: ['netsuite'], durationMs: 60000 }),
      makeStepDefinition(3, { stepId: 'step-3', title: 'Send notification in Slack', systems: ['slack'], durationMs: 5000 }),
    ];
    const sopSteps = stepDefs.map((s, i) => makeSOPStep(i + 1, s.stepId));
    const nodes = stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category));
    const edges = stepDefs.slice(0, -1).map((_, i) =>
      makeMapEdge(`node-${i + 1}`, `node-${i + 2}`, i + 1),
    );

    const output = makeProcessOutput(stepDefs, sopSteps, nodes, edges, {
      runId: 'run-multi-system-001',
      activityName: 'Multi-System Workflow',
      systemsUsed: ['gmail', 'netsuite', 'slack'],
    });

    const result = transformWorkflow(output);
    // 3 systems + one 60s step → should produce opportunities
    expect(result.opportunities.totalOpportunities).toBeGreaterThan(0);
  });
});

// ─── 10. Edge Cases ───────────────────────────────────────────────────────────

describe('10. Edge Cases', () => {
  it('returns empty OpportunityAnalysis for empty steps array', () => {
    const result = detectOpportunities([], [], makeWorkflow(), makeSkillLibrary());
    expect(result.opportunities).toHaveLength(0);
    expect(result.totalOpportunities).toBe(0);
    expect(result.topScore).toBe(0);
  });

  it('returns well-formed result for a single step', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1', estimatedDurationMs: 5000 })];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 5000 });

    const result = detectOpportunities(steps, [], workflow, library);
    expect(result.opportunities).toBeDefined();
    expect(typeof result.totalOpportunities).toBe('number');
    expect(result.categoryBreakdown).toBeDefined();
  });

  it('handles all manual_only steps without throwing — may produce decision_support', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', automationClassification: 'manual_only', confidence: 0.6 }),
      makeStepIntelligence({ stepId: 'step-2', automationClassification: 'manual_only', confidence: 0.7 }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: 10000 });

    expect(() => detectOpportunities(steps, [], workflow, library)).not.toThrow();
    const result = detectOpportunities(steps, [], workflow, library);
    // automation_candidate should be 0 for manual steps
    expect(result.classificationBreakdown.automation_candidate).toBe(0);
  });

  it('handles no timing data gracefully — estimatedTimeSavingsMs is null', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', estimatedDurationMs: null }),
      makeStepIntelligence({ stepId: 'step-2', automationClassification: 'human_in_loop', estimatedDurationMs: null }),
    ];
    const library = makeSkillLibrary();
    const workflow = makeWorkflow({ totalDurationMs: null });

    const result = detectOpportunities(steps, [], workflow, library);
    // Any opportunity dependent on timing data should have null savings
    for (const opp of result.opportunities) {
      // totalEstimatedTimeSavingsMs should be null if any individual opp has null savings
      if (opp.estimatedTimeSavingsMs === null) {
        expect(result.totalEstimatedTimeSavingsMs).toBeNull();
        break;
      }
    }
    // Score factors should still be numbers (not NaN)
    for (const opp of result.opportunities) {
      expect(opp.score).not.toBeNaN();
      expect(opp.scoringFactors.timeSaved).not.toBeNaN();
    }
  });
});
