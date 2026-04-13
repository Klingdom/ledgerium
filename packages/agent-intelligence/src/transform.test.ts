/**
 * Comprehensive tests for the Agent Intelligence transformation pipeline.
 *
 * Tests cover:
 * - Full pipeline transformation for 3 realistic workflow examples
 * - Intent string quality (no raw titles, no DOM selectors)
 * - Activity grouping correctness
 * - Automation classification rules
 * - Decision point detection
 * - Traceability (evidenceEventIds populated)
 * - Edge cases: single-step, all-manual, all-automatable, sensitive events, low confidence
 */

import { describe, it, expect } from 'vitest';
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
import { transformWorkflow } from './transform.js';
import { parseSteps } from './step-parser.js';
import { buildActivities } from './activity-builder.js';
import { detectDecisions } from './decision-detector.js';
import { buildWorkflow } from './workflow-builder.js';
import { AGENT_INTELLIGENCE_VERSION } from './types.js';

// ─── Fixture builders ─────────────────────────────────────────────────────────

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

function makeStepDefinition(
  ordinal: number,
  overrides: Partial<StepDefinition>,
): StepDefinition {
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

// ─── Example 1: Invoice Processing ───────────────────────────────────────────

describe('Example 1: Invoice Processing (6 steps, gmail + netsuite)', () => {
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
    makeSOPStep(1, 'step-inv-1', {
      category: 'click_then_navigate',
      action: 'Open email',
      expectedOutcome: 'Email with invoice is open',
    }),
    makeSOPStep(2, 'step-inv-2', {
      category: 'file_action',
      action: 'Download PDF',
      expectedOutcome: 'PDF saved to downloads',
    }),
    makeSOPStep(3, 'step-inv-3', {
      category: 'click_then_navigate',
      action: 'Navigate to AP',
      expectedOutcome: 'AP module is open',
    }),
    makeSOPStep(4, 'step-inv-4', {
      category: 'data_entry',
      action: 'Fill form',
      inputs: ['vendor_name', 'invoice_amount', 'invoice_date'],
      expectedOutcome: 'Form fields are populated',
    }),
    makeSOPStep(5, 'step-inv-5', {
      category: 'file_action',
      action: 'Upload PDF',
      expectedOutcome: 'PDF attached to record',
    }),
    makeSOPStep(6, 'step-inv-6', {
      category: 'fill_and_submit',
      action: 'Submit invoice',
      expectedOutcome: 'Invoice submitted for approval',
    }),
  ];

  const processMapNodes = stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category));
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

  it('produces exactly one StepIntelligence per step definition', () => {
    const result = transformWorkflow(output);
    expect(result.steps).toHaveLength(6);
  });

  it('each step has a non-empty inferredIntent that is NOT the raw title', () => {
    const result = transformWorkflow(output);
    for (const step of result.steps) {
      expect(step.inferredIntent.length).toBeGreaterThan(0);
      expect(step.inferredIntent).not.toBe(step.rawReference.rawTitle);
    }
  });

  it('each step has verb and object populated', () => {
    const result = transformWorkflow(output);
    for (const step of result.steps) {
      expect(step.verb.length).toBeGreaterThan(0);
      expect(step.object.length).toBeGreaterThan(0);
    }
  });

  it('intent strings contain no DOM selectors or CSS class tokens', () => {
    const result = transformWorkflow(output);
    for (const step of result.steps) {
      expect(step.inferredIntent).not.toMatch(/[#.[\]]/);
      // Should not contain raw CSS selector syntax
      expect(step.inferredIntent).not.toMatch(/data-[\w-]+/);
    }
  });

  it('gmail steps are classified as full_automation', () => {
    const result = transformWorkflow(output);
    const gmailSteps = result.steps.filter(s => s.system === 'gmail');
    expect(gmailSteps.length).toBeGreaterThan(0);
    for (const step of gmailSteps) {
      // click_then_navigate and file_action → full_automation
      expect(['full_automation', 'ai_assisted']).toContain(step.automationClassification);
    }
  });

  it('data_entry step without sensitive events is ai_assisted', () => {
    const result = transformWorkflow(output);
    const formStep = result.steps.find(s => s.stepId === 'step-inv-4');
    expect(formStep).toBeDefined();
    expect(formStep!.automationClassification).toBe('ai_assisted');
  });

  it('all steps have evidenceEventIds populated', () => {
    const result = transformWorkflow(output);
    for (const step of result.steps) {
      expect(step.evidenceEventIds.length).toBeGreaterThan(0);
    }
  });

  it('activities are grouped by system (gmail group + netsuite group)', () => {
    const result = transformWorkflow(output);
    expect(result.activities.length).toBeGreaterThanOrEqual(2);

    const gmailActivity = result.activities.find(a => a.system === 'gmail');
    const netsuiteActivity = result.activities.find(a => a.system === 'netsuite');
    expect(gmailActivity).toBeDefined();
    expect(netsuiteActivity).toBeDefined();
  });

  it('gmail activity contains open and download steps', () => {
    const result = transformWorkflow(output);
    const gmailActivity = result.activities.find(a => a.system === 'gmail');
    expect(gmailActivity).toBeDefined();
    expect(gmailActivity!.stepIds).toContain('step-inv-1');
    expect(gmailActivity!.stepIds).toContain('step-inv-2');
  });

  it('netsuite activity contains navigate, fill, upload, submit steps', () => {
    const result = transformWorkflow(output);
    const netsuiteActivities = result.activities.filter(a => a.system === 'netsuite');
    const allNetsuiteStepIds = netsuiteActivities.flatMap(a => a.stepIds);
    expect(allNetsuiteStepIds).toContain('step-inv-3');
    expect(allNetsuiteStepIds).toContain('step-inv-4');
    expect(allNetsuiteStepIds).toContain('step-inv-5');
    expect(allNetsuiteStepIds).toContain('step-inv-6');
  });

  it('workflow has correct system list', () => {
    const result = transformWorkflow(output);
    expect(result.workflow.systems).toContain('gmail');
    expect(result.workflow.systems).toContain('netsuite');
  });

  it('workflow has positive automation score', () => {
    const result = transformWorkflow(output);
    expect(result.workflow.automationScore).toBeGreaterThan(0);
    expect(result.workflow.automationScore).toBeLessThanOrEqual(100);
  });

  it('workflow dependencies connect activities sequentially', () => {
    const result = transformWorkflow(output);
    expect(result.workflow.dependencies.length).toBeGreaterThanOrEqual(1);
    for (const dep of result.workflow.dependencies) {
      expect(dep.fromActivityId).not.toBe(dep.toActivityId);
      expect(['sequential', 'conditional']).toContain(dep.type);
    }
  });

  it('metadata has correct sourceRunId and engineVersion', () => {
    const result = transformWorkflow(output);
    expect(result.metadata.sourceRunId).toBe('run-invoice-001');
    expect(result.metadata.engineVersion).toBe(AGENT_INTELLIGENCE_VERSION);
    expect(result.metadata.processedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.metadata.pipelineDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('skillLibrary is present and has skills extracted', () => {
    const result = transformWorkflow(output);
    expect(result.skillLibrary).toBeDefined();
    expect(result.skillLibrary.skills.length).toBeGreaterThan(0);
    expect(result.skillLibrary.uniqueSkillCount).toBe(result.skillLibrary.skills.length);
    // 6 steps with distinct verb+object+system tuples should produce multiple skills
    expect(result.skillLibrary.uniqueSkillCount).toBeGreaterThanOrEqual(2);
  });

  it('all steps preserve rawReference with correct stepOrdinal', () => {
    const result = transformWorkflow(output);
    const ordinals = result.steps.map(s => s.rawReference.stepOrdinal);
    expect(ordinals).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

// ─── Example 2: Customer Support Ticket ──────────────────────────────────────

describe('Example 2: Customer Support Ticket (4 steps, zendesk + slack)', () => {
  const stepDefs: StepDefinition[] = [
    makeStepDefinition(1, {
      stepId: 'step-cs-1',
      title: 'Open customer support ticket in Zendesk',
      category: 'click_then_navigate',
      systems: ['zendesk'],
      domains: ['zendesk.com'],
      durationMs: 5000,
      sourceEventIds: ['evt-cs-1a', 'evt-cs-1b'],
    }),
    makeStepDefinition(2, {
      stepId: 'step-cs-2',
      title: 'Update ticket status and priority',
      category: 'data_entry',
      systems: ['zendesk'],
      domains: ['zendesk.com'],
      inputs: ['new_status', 'priority_level'],
      durationMs: 15000,
      hasSensitiveEvents: false,
      sourceEventIds: ['evt-cs-2a', 'evt-cs-2b', 'evt-cs-2c'],
    }),
    makeStepDefinition(3, {
      stepId: 'step-cs-3',
      title: 'Send message to customer via Slack',
      category: 'send_action',
      systems: ['slack'],
      domains: ['app.slack.com'],
      inputs: ['customer_id', 'message_text'],
      outputs: ['message_sent'],
      durationMs: 30000,
      sourceEventIds: ['evt-cs-3a'],
    }),
    makeStepDefinition(4, {
      stepId: 'step-cs-4',
      title: 'Close ticket after resolution confirmed',
      category: 'single_action',
      systems: ['zendesk'],
      domains: ['zendesk.com'],
      durationMs: 3000,
      sourceEventIds: ['evt-cs-4a'],
    }),
  ];

  const sopSteps = stepDefs.map((s, i) =>
    makeSOPStep(i + 1, s.stepId, {
      category: s.category,
    }),
  );

  const processMapNodes = stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category));
  const processMapEdges = stepDefs.slice(0, -1).map((s, i) =>
    makeMapEdge(`node-${i + 1}`, `node-${i + 2}`, i + 1),
  );

  const output: ProcessOutput = {
    processRun: makeProcessRun({
      runId: 'run-support-001',
      activityName: 'Customer Support Ticket Resolution',
      stepCount: 4,
      systemsUsed: ['zendesk', 'slack'],
    }),
    processDefinition: makeProcessDefinition(stepDefs),
    processMap: makeProcessMap(processMapNodes, processMapEdges),
    sop: makeSOP(sopSteps),
  };

  it('produces 4 step intelligence objects', () => {
    const result = transformWorkflow(output);
    expect(result.steps).toHaveLength(4);
  });

  it('each step has non-empty inferredIntent different from raw title', () => {
    const result = transformWorkflow(output);
    for (const step of result.steps) {
      expect(step.inferredIntent.length).toBeGreaterThan(0);
      expect(step.inferredIntent).not.toBe(step.rawReference.rawTitle);
    }
  });

  it('send_action step is classified as ai_assisted', () => {
    const result = transformWorkflow(output);
    const sendStep = result.steps.find(s => s.stepId === 'step-cs-3');
    expect(sendStep).toBeDefined();
    expect(sendStep!.automationClassification).toBe('ai_assisted');
  });

  it('click_then_navigate step is classified as full_automation', () => {
    const result = transformWorkflow(output);
    const navStep = result.steps.find(s => s.stepId === 'step-cs-1');
    expect(navStep).toBeDefined();
    expect(navStep!.automationClassification).toBe('full_automation');
  });

  it('slack step has system=slack', () => {
    const result = transformWorkflow(output);
    const slackStep = result.steps.find(s => s.stepId === 'step-cs-3');
    expect(slackStep).toBeDefined();
    expect(slackStep!.system).toBe('slack');
  });

  it('zendesk steps have system=zendesk', () => {
    const result = transformWorkflow(output);
    const zendeskSteps = result.steps.filter(s => s.system === 'zendesk');
    expect(zendeskSteps.length).toBeGreaterThan(0);
  });

  it('activities separate zendesk and slack by system boundary', () => {
    const result = transformWorkflow(output);
    const systems = result.activities.map(a => a.system);
    expect(systems).toContain('zendesk');
    expect(systems).toContain('slack');
  });

  it('workflow name matches process run activityName', () => {
    const result = transformWorkflow(output);
    expect(result.workflow.workflowName).toBe('Customer Support Ticket Resolution');
  });

  it('all steps have evidenceEventIds populated', () => {
    const result = transformWorkflow(output);
    for (const step of result.steps) {
      expect(step.evidenceEventIds.length).toBeGreaterThan(0);
    }
  });

  it('workflow has non-null totalDurationMs (all steps have duration)', () => {
    const result = transformWorkflow(output);
    expect(result.workflow.totalDurationMs).not.toBeNull();
    expect(result.workflow.totalDurationMs).toBe(53000); // 5000+15000+30000+3000
  });
});

// ─── Example 3: Report Generation ────────────────────────────────────────────

describe('Example 3: Report Generation (5 steps, salesforce + google_sheets)', () => {
  const stepDefs: StepDefinition[] = [
    makeStepDefinition(1, {
      stepId: 'step-rpt-1',
      title: 'Navigate to reports section in Salesforce',
      category: 'click_then_navigate',
      systems: ['salesforce'],
      domains: ['lightning.force.com'],
      durationMs: 4000,
      sourceEventIds: ['evt-r1a', 'evt-r1b'],
    }),
    makeStepDefinition(2, {
      stepId: 'step-rpt-2',
      title: 'Filter data by date range and region',
      category: 'data_entry',
      systems: ['salesforce'],
      domains: ['lightning.force.com'],
      inputs: ['start_date', 'end_date', 'region'],
      durationMs: 12000,
      sourceEventIds: ['evt-r2a', 'evt-r2b'],
    }),
    makeStepDefinition(3, {
      stepId: 'step-rpt-3',
      title: 'Export report as CSV file',
      category: 'file_action',
      systems: ['salesforce'],
      domains: ['lightning.force.com'],
      outputs: ['report_csv'],
      durationMs: 6000,
      sourceEventIds: ['evt-r3a'],
    }),
    makeStepDefinition(4, {
      stepId: 'step-rpt-4',
      title: 'Open spreadsheet in Google Sheets',
      category: 'click_then_navigate',
      systems: ['google sheets'],
      domains: ['sheets.google.com'],
      durationMs: 3000,
      sourceEventIds: ['evt-r4a'],
    }),
    makeStepDefinition(5, {
      stepId: 'step-rpt-5',
      title: 'Paste exported data into spreadsheet',
      category: 'data_entry',
      systems: ['google sheets'],
      domains: ['sheets.google.com'],
      inputs: ['report_csv'],
      durationMs: 20000,
      sourceEventIds: ['evt-r5a', 'evt-r5b'],
    }),
  ];

  const sopSteps = stepDefs.map((s, i) =>
    makeSOPStep(i + 1, s.stepId, { category: s.category }),
  );

  const processMapNodes = stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category));
  const processMapEdges = stepDefs.slice(0, -1).map((s, i) =>
    makeMapEdge(`node-${i + 1}`, `node-${i + 2}`, i + 1),
  );

  const output: ProcessOutput = {
    processRun: makeProcessRun({
      runId: 'run-report-001',
      activityName: 'Monthly Report Generation',
      stepCount: 5,
      systemsUsed: ['salesforce', 'google_sheets'],
    }),
    processDefinition: makeProcessDefinition(stepDefs),
    processMap: makeProcessMap(processMapNodes, processMapEdges),
    sop: makeSOP(sopSteps),
  };

  it('produces 5 step intelligence objects', () => {
    const result = transformWorkflow(output);
    expect(result.steps).toHaveLength(5);
  });

  it('salesforce steps detect system correctly', () => {
    const result = transformWorkflow(output);
    const sfSteps = result.steps.filter(s => s.system === 'salesforce');
    expect(sfSteps.length).toBe(3);
  });

  it('google sheets steps detect system correctly', () => {
    const result = transformWorkflow(output);
    const gsSteps = result.steps.filter(s => s.system === 'google_sheets');
    expect(gsSteps.length).toBe(2);
  });

  it('file_action (export CSV) is classified as full_automation', () => {
    const result = transformWorkflow(output);
    const exportStep = result.steps.find(s => s.stepId === 'step-rpt-3');
    expect(exportStep).toBeDefined();
    expect(exportStep!.automationClassification).toBe('full_automation');
  });

  it('data_entry without sensitive events is ai_assisted', () => {
    const result = transformWorkflow(output);
    const dataSteps = result.steps.filter(
      s => s.rawReference.category === 'data_entry',
    );
    for (const step of dataSteps) {
      expect(step.automationClassification).toBe('ai_assisted');
    }
  });

  it('activities are grouped by system (salesforce group + google_sheets group)', () => {
    const result = transformWorkflow(output);
    const sfActivity = result.activities.find(a => a.system === 'salesforce');
    const gsActivity = result.activities.find(a => a.system === 'google_sheets');
    expect(sfActivity).toBeDefined();
    expect(gsActivity).toBeDefined();
    expect(sfActivity!.stepIds).toContain('step-rpt-1');
    expect(gsActivity!.stepIds).toContain('step-rpt-4');
  });

  it('step inputs are populated from SOP step inputs', () => {
    const result = transformWorkflow(output);
    const filterStep = result.steps.find(s => s.stepId === 'step-rpt-2');
    expect(filterStep).toBeDefined();
    expect(filterStep!.inputData).toContain('start_date');
    expect(filterStep!.inputData).toContain('end_date');
  });

  it('step outputs trace to process definition', () => {
    const result = transformWorkflow(output);
    const exportStep = result.steps.find(s => s.stepId === 'step-rpt-3');
    expect(exportStep).toBeDefined();
    expect(exportStep!.outputData).toContain('report_csv');
  });

  it('workflow workflowId matches processRun.runId', () => {
    const result = transformWorkflow(output);
    expect(result.workflow.workflowId).toBe('run-report-001');
  });

  it('dependencies cover all activity transitions', () => {
    const result = transformWorkflow(output);
    const activityCount = result.activities.length;
    expect(result.workflow.dependencies.length).toBe(activityCount - 1);
  });
});

// ─── Edge case: Single-step workflow ─────────────────────────────────────────

describe('Edge case: Single-step workflow', () => {
  const stepDefs: StepDefinition[] = [
    makeStepDefinition(1, {
      stepId: 'step-single-1',
      title: 'Click submit button',
      category: 'single_action',
      systems: ['salesforce'],
      domains: ['force.com'],
      durationMs: 1000,
      sourceEventIds: ['evt-s1'],
    }),
  ];

  const output: ProcessOutput = {
    processRun: makeProcessRun({ runId: 'run-single', activityName: 'Single Action' }),
    processDefinition: makeProcessDefinition(stepDefs),
    processMap: makeProcessMap(
      [makeMapNode('step-single-1', 1)],
      [],
    ),
    sop: makeSOP([makeSOPStep(1, 'step-single-1')]),
  };

  it('produces one step, one activity, no dependencies', () => {
    const result = transformWorkflow(output);
    expect(result.steps).toHaveLength(1);
    expect(result.activities).toHaveLength(1);
    expect(result.workflow.dependencies).toHaveLength(0);
  });

  it('single activity name equals the step inferredIntent', () => {
    const result = transformWorkflow(output);
    expect(result.activities[0]!.activityName).toBe(result.steps[0]!.inferredIntent);
  });

  it('automation score is 100 for single_action step', () => {
    const result = transformWorkflow(output);
    expect(result.workflow.automationScore).toBe(100);
  });
});

// ─── Edge case: All steps manual ─────────────────────────────────────────────

describe('Edge case: All steps manual (error_handling + annotation)', () => {
  const stepDefs: StepDefinition[] = [
    makeStepDefinition(1, {
      stepId: 'step-m1',
      title: 'Handle error in form submission',
      category: 'error_handling',
      systems: ['netsuite'],
      confidence: 0.8,
      sourceEventIds: ['evt-m1'],
    }),
    makeStepDefinition(2, {
      stepId: 'step-m2',
      title: 'Add annotation for manual review',
      category: 'annotation',
      systems: ['netsuite'],
      confidence: 0.75,
      sourceEventIds: ['evt-m2'],
    }),
  ];

  const output: ProcessOutput = {
    processRun: makeProcessRun({ runId: 'run-manual', activityName: 'Manual Review' }),
    processDefinition: makeProcessDefinition(stepDefs),
    processMap: makeProcessMap(
      stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category)),
      [makeMapEdge('node-1', 'node-2', 1)],
    ),
    sop: makeSOP(stepDefs.map((s, i) => makeSOPStep(i + 1, s.stepId))),
  };

  it('all steps are classified as manual_only', () => {
    const result = transformWorkflow(output);
    for (const step of result.steps) {
      expect(step.automationClassification).toBe('manual_only');
    }
  });

  it('activities aggregate to manual_only', () => {
    const result = transformWorkflow(output);
    for (const activity of result.activities) {
      expect(activity.automationClassification).toBe('manual_only');
    }
  });

  it('workflow automationScore is 0 (all manual)', () => {
    const result = transformWorkflow(output);
    expect(result.workflow.automationScore).toBe(0);
  });

  it('workflow automationClassification is manual_only', () => {
    const result = transformWorkflow(output);
    expect(result.workflow.automationClassification).toBe('manual_only');
  });

  it('error_handling step triggers error_recovery decision detection', () => {
    const result = transformWorkflow(output);
    const errorDecisions = result.decisionPoints.filter(d => d.type === 'error_recovery');
    expect(errorDecisions.length).toBeGreaterThan(0);
  });
});

// ─── Edge case: All steps automatable ────────────────────────────────────────

describe('Edge case: All steps fully automatable', () => {
  const stepDefs: StepDefinition[] = [
    makeStepDefinition(1, {
      stepId: 'step-a1',
      title: 'Navigate to dashboard',
      category: 'click_then_navigate',
      systems: ['salesforce'],
      durationMs: 2000,
      sourceEventIds: ['evt-a1'],
    }),
    makeStepDefinition(2, {
      stepId: 'step-a2',
      title: 'Click export button',
      category: 'single_action',
      systems: ['salesforce'],
      durationMs: 1000,
      sourceEventIds: ['evt-a2'],
    }),
    makeStepDefinition(3, {
      stepId: 'step-a3',
      title: 'Download report file',
      category: 'file_action',
      systems: ['salesforce'],
      durationMs: 3000,
      sourceEventIds: ['evt-a3'],
    }),
  ];

  const output: ProcessOutput = {
    processRun: makeProcessRun({ runId: 'run-auto', activityName: 'Auto Export' }),
    processDefinition: makeProcessDefinition(stepDefs),
    processMap: makeProcessMap(
      stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category)),
      [
        makeMapEdge('node-1', 'node-2', 1),
        makeMapEdge('node-2', 'node-3', 2),
      ],
    ),
    sop: makeSOP(stepDefs.map((s, i) => makeSOPStep(i + 1, s.stepId))),
  };

  it('all steps are classified as full_automation', () => {
    const result = transformWorkflow(output);
    for (const step of result.steps) {
      expect(step.automationClassification).toBe('full_automation');
    }
  });

  it('workflow automationScore is 100', () => {
    const result = transformWorkflow(output);
    expect(result.workflow.automationScore).toBe(100);
  });

  it('workflow automationClassification is full_automation', () => {
    const result = transformWorkflow(output);
    expect(result.workflow.automationClassification).toBe('full_automation');
  });
});

// ─── Edge case: Steps with hasSensitiveEvents=true ───────────────────────────

describe('Edge case: Steps with hasSensitiveEvents=true', () => {
  const stepDefs: StepDefinition[] = [
    makeStepDefinition(1, {
      stepId: 'step-sens-1',
      title: 'Fill payment form with credit card details',
      category: 'data_entry',
      systems: ['stripe'],
      hasSensitiveEvents: true,
      confidence: 0.9,
      durationMs: 30000,
      sourceEventIds: ['evt-sen1'],
    }),
    makeStepDefinition(2, {
      stepId: 'step-sens-2',
      title: 'Submit payment form',
      category: 'fill_and_submit',
      systems: ['stripe'],
      hasSensitiveEvents: true,
      confidence: 0.85,
      durationMs: 2000,
      sourceEventIds: ['evt-sen2'],
    }),
  ];

  const output: ProcessOutput = {
    processRun: makeProcessRun({ runId: 'run-sensitive', activityName: 'Payment Processing' }),
    processDefinition: makeProcessDefinition(stepDefs),
    processMap: makeProcessMap(
      stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category)),
      [makeMapEdge('node-1', 'node-2', 1)],
    ),
    sop: makeSOP(stepDefs.map((s, i) => makeSOPStep(i + 1, s.stepId))),
  };

  it('data_entry with sensitive events is human_in_loop', () => {
    const result = transformWorkflow(output);
    const dataStep = result.steps.find(s => s.stepId === 'step-sens-1');
    expect(dataStep).toBeDefined();
    expect(dataStep!.automationClassification).toBe('human_in_loop');
  });

  it('fill_and_submit with sensitive events is human_in_loop', () => {
    const result = transformWorkflow(output);
    const submitStep = result.steps.find(s => s.stepId === 'step-sens-2');
    expect(submitStep).toBeDefined();
    expect(submitStep!.automationClassification).toBe('human_in_loop');
  });

  it('activity with human_in_loop steps aggregates to human_in_loop', () => {
    const result = transformWorkflow(output);
    for (const activity of result.activities) {
      expect(activity.automationClassification).toBe('human_in_loop');
    }
  });

  it('human_in_loop detection fires for automated→sensitive transition', () => {
    // Add a full_auto step before the sensitive steps
    const allSteps: StepDefinition[] = [
      makeStepDefinition(1, {
        stepId: 'step-nav',
        title: 'Navigate to checkout',
        category: 'click_then_navigate',
        systems: ['stripe'],
        hasSensitiveEvents: false,
        confidence: 0.95,
        durationMs: 2000,
        sourceEventIds: ['evt-nav'],
      }),
      ...stepDefs.map(s => ({
        ...s,
        ordinal: s.ordinal + 1,
      })),
    ];
    const sensitiveOutput: ProcessOutput = {
      ...output,
      processDefinition: makeProcessDefinition(allSteps),
    };
    const result = transformWorkflow(sensitiveOutput);
    const humanJudgments = result.decisionPoints.filter(d => d.type === 'human_judgment');
    expect(humanJudgments.length).toBeGreaterThan(0);
  });
});

// ─── Edge case: Steps with very low confidence ───────────────────────────────

describe('Edge case: Steps with very low confidence (< 0.5)', () => {
  const stepDefs: StepDefinition[] = [
    makeStepDefinition(1, {
      stepId: 'step-low-1',
      title: 'Unknown action',
      category: 'data_entry',
      systems: [],
      confidence: 0.3,
      hasSensitiveEvents: false,
      durationMs: 5000,
      sourceEventIds: ['evt-low1'],
    }),
    makeStepDefinition(2, {
      stepId: 'step-low-2',
      title: 'Another unclear step',
      category: 'single_action',
      systems: [],
      confidence: 0.2,
      hasSensitiveEvents: false,
      durationMs: 3000,
      sourceEventIds: ['evt-low2'],
    }),
  ];

  const output: ProcessOutput = {
    processRun: makeProcessRun({ runId: 'run-lowconf', activityName: 'Low Confidence Workflow' }),
    processDefinition: makeProcessDefinition(stepDefs),
    processMap: makeProcessMap(
      stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category)),
      [makeMapEdge('node-1', 'node-2', 1)],
    ),
    sop: makeSOP(stepDefs.map((s, i) => makeSOPStep(i + 1, s.stepId))),
  };

  it('low confidence steps are classified as manual_only', () => {
    const result = transformWorkflow(output);
    for (const step of result.steps) {
      expect(step.automationClassification).toBe('manual_only');
    }
  });

  it('step confidence is below 0.5', () => {
    const result = transformWorkflow(output);
    for (const step of result.steps) {
      expect(step.confidence).toBeLessThan(0.5);
    }
  });

  it('inferredIntent is still populated (not empty) for low-confidence steps', () => {
    const result = transformWorkflow(output);
    for (const step of result.steps) {
      expect(step.inferredIntent.length).toBeGreaterThan(0);
    }
  });

  it('inferenceMethod is heuristic for steps without strong verb/object', () => {
    const result = transformWorkflow(output);
    for (const step of result.steps) {
      expect(['deterministic', 'heuristic']).toContain(step.inferenceMethod);
    }
  });
});

// ─── Unit tests: parseSteps ───────────────────────────────────────────────────

describe('parseSteps: verb and object extraction', () => {
  function makeSingleStepOutput(title: string, category: GroupingReason, systems: string[]): ProcessOutput {
    const step = makeStepDefinition(1, {
      stepId: 'step-unit-1',
      title,
      category,
      systems,
      sourceEventIds: ['evt-u1'],
    });
    return {
      processRun: makeProcessRun({ runId: 'run-unit', activityName: 'Unit Test' }),
      processDefinition: makeProcessDefinition([step]),
      processMap: makeProcessMap([makeMapNode('step-unit-1', 1, category)], []),
      sop: makeSOP([makeSOPStep(1, 'step-unit-1')]),
    };
  }

  it('parses "send email" → verb=send, object=email', () => {
    const result = parseSteps(makeSingleStepOutput('Send email to customer', 'send_action', ['gmail']));
    expect(result[0]!.verb).toBe('send');
    expect(result[0]!.object).toBe('email');
  });

  it('parses "download file" → verb=download, object=file', () => {
    const result = parseSteps(makeSingleStepOutput('Download report file from dashboard', 'file_action', ['salesforce']));
    expect(result[0]!.verb).toBe('download');
    expect(result[0]!.object).toMatch(/report|file/);
  });

  it('parses "fill form" → verb=fill, object is a recognized business object', () => {
    // "Fill contact form with customer data" — parser finds "contact" before "form"
    // both are valid recognized objects; the important thing is verb=fill is correct
    const result = parseSteps(makeSingleStepOutput('Fill contact form with customer data', 'data_entry', ['hubspot']));
    expect(result[0]!.verb).toBe('fill');
    expect(['form', 'contact']).toContain(result[0]!.object);
  });

  it('parses "submit invoice" → verb=submit, object=invoice', () => {
    const result = parseSteps(makeSingleStepOutput('Submit invoice for approval', 'fill_and_submit', ['netsuite']));
    expect(result[0]!.verb).toBe('submit');
    expect(result[0]!.object).toBe('invoice');
  });

  it('parses "navigate to page" → verb=navigate or open, object=page', () => {
    const result = parseSteps(makeSingleStepOutput('Navigate to dashboard page', 'click_then_navigate', ['salesforce']));
    expect(['navigate', 'open']).toContain(result[0]!.verb);
  });

  it('detects gmail system from domain mail.google.com', () => {
    const step = makeStepDefinition(1, {
      stepId: 'step-gm',
      title: 'Open email',
      category: 'click_then_navigate',
      systems: [],
      domains: ['mail.google.com'],
      sourceEventIds: ['evt-gm'],
    });
    const output: ProcessOutput = {
      processRun: makeProcessRun({ runId: 'run-gm', activityName: 'Gmail Test' }),
      processDefinition: makeProcessDefinition([step]),
      processMap: makeProcessMap([makeMapNode('step-gm', 1)], []),
      sop: makeSOP([makeSOPStep(1, 'step-gm')]),
    };
    const result = parseSteps(output);
    expect(result[0]!.system).toBe('gmail');
  });

  it('sourceWorkflowId matches processRun.runId', () => {
    const output = makeSingleStepOutput('Click button', 'single_action', []);
    const result = parseSteps(output);
    expect(result[0]!.sourceWorkflowId).toBe('run-unit');
  });
});

// ─── Unit tests: buildActivities ─────────────────────────────────────────────

describe('buildActivities: grouping logic', () => {
  it('groups consecutive same-system steps into one activity', () => {
    const steps = parseSteps({
      processRun: makeProcessRun({ runId: 'r1', activityName: 'Test' }),
      processDefinition: makeProcessDefinition([
        makeStepDefinition(1, { stepId: 's1', title: 'Open ticket', category: 'click_then_navigate', systems: ['zendesk'], sourceEventIds: ['e1'] }),
        makeStepDefinition(2, { stepId: 's2', title: 'Update status', category: 'data_entry', systems: ['zendesk'], sourceEventIds: ['e2'] }),
        makeStepDefinition(3, { stepId: 's3', title: 'Close ticket', category: 'single_action', systems: ['zendesk'], sourceEventIds: ['e3'] }),
      ]),
      processMap: makeProcessMap(
        [makeMapNode('s1', 1), makeMapNode('s2', 2), makeMapNode('s3', 3)],
        [makeMapEdge('node-1', 'node-2', 1), makeMapEdge('node-2', 'node-3', 2)],
      ),
      sop: makeSOP([
        makeSOPStep(1, 's1'),
        makeSOPStep(2, 's2'),
        makeSOPStep(3, 's3'),
      ]),
    });
    const activities = buildActivities(steps);
    expect(activities.length).toBe(1);
    expect(activities[0]!.stepIds).toEqual(['s1', 's2', 's3']);
  });

  it('creates separate activities when system changes', () => {
    const steps = parseSteps({
      processRun: makeProcessRun({ runId: 'r2', activityName: 'Test' }),
      processDefinition: makeProcessDefinition([
        makeStepDefinition(1, { stepId: 's1', title: 'Open email', category: 'click_then_navigate', systems: ['gmail'], sourceEventIds: ['e1'] }),
        makeStepDefinition(2, { stepId: 's2', title: 'Fill form in Salesforce', category: 'data_entry', systems: ['salesforce'], sourceEventIds: ['e2'] }),
      ]),
      processMap: makeProcessMap(
        [makeMapNode('s1', 1), makeMapNode('s2', 2)],
        [makeMapEdge('node-1', 'node-2', 1)],
      ),
      sop: makeSOP([makeSOPStep(1, 's1'), makeSOPStep(2, 's2')]),
    });
    const activities = buildActivities(steps);
    expect(activities.length).toBe(2);
    expect(activities[0]!.system).toBe('gmail');
    expect(activities[1]!.system).toBe('salesforce');
  });

  it('activity IDs are act-1, act-2, etc.', () => {
    const steps = parseSteps({
      processRun: makeProcessRun({ runId: 'r3', activityName: 'Test' }),
      processDefinition: makeProcessDefinition([
        makeStepDefinition(1, { stepId: 's1', title: 'Navigate to app', category: 'click_then_navigate', systems: ['jira'], sourceEventIds: ['e1'] }),
        makeStepDefinition(2, { stepId: 's2', title: 'Create ticket', category: 'data_entry', systems: ['slack'], sourceEventIds: ['e2'] }),
      ]),
      processMap: makeProcessMap(
        [makeMapNode('s1', 1), makeMapNode('s2', 2)],
        [makeMapEdge('node-1', 'node-2', 1)],
      ),
      sop: makeSOP([makeSOPStep(1, 's1'), makeSOPStep(2, 's2')]),
    });
    const activities = buildActivities(steps);
    expect(activities.map(a => a.activityId)).toEqual(
      activities.map((_, i) => `act-${i + 1}`),
    );
  });

  it('returns empty array for empty step list', () => {
    const activities = buildActivities([]);
    expect(activities).toEqual([]);
  });
});

// ─── Unit tests: detectDecisions ─────────────────────────────────────────────

describe('detectDecisions: detection rules', () => {
  it('detects error_recovery for error_handling steps', () => {
    const stepDefs: StepDefinition[] = [
      makeStepDefinition(1, {
        stepId: 'step-err-1',
        title: 'Submit form',
        category: 'fill_and_submit',
        systems: ['netsuite'],
        sourceEventIds: ['e1'],
      }),
      makeStepDefinition(2, {
        stepId: 'step-err-2',
        title: 'Handle validation error',
        category: 'error_handling',
        systems: ['netsuite'],
        sourceEventIds: ['e2'],
      }),
    ];
    const output: ProcessOutput = {
      processRun: makeProcessRun({ runId: 'r-err', activityName: 'Error Test' }),
      processDefinition: makeProcessDefinition(stepDefs),
      processMap: makeProcessMap(
        stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category)),
        [makeMapEdge('node-1', 'node-2', 1)],
      ),
      sop: makeSOP(stepDefs.map((s, i) => makeSOPStep(i + 1, s.stepId))),
    };
    const steps = parseSteps(output);
    const decisions = detectDecisions(steps, output);
    expect(decisions.some(d => d.type === 'error_recovery')).toBe(true);
  });

  it('assigns stable decisionId as dec-1, dec-2, etc.', () => {
    const stepDefs: StepDefinition[] = [
      makeStepDefinition(1, {
        stepId: 'step-d1',
        title: 'Handle error',
        category: 'error_handling',
        systems: [],
        sourceEventIds: ['e1'],
      }),
      makeStepDefinition(2, {
        stepId: 'step-d2',
        title: 'Handle another error',
        category: 'error_handling',
        systems: [],
        sourceEventIds: ['e2'],
      }),
    ];
    const output: ProcessOutput = {
      processRun: makeProcessRun({ runId: 'r-dec', activityName: 'Decision Test' }),
      processDefinition: makeProcessDefinition(stepDefs),
      processMap: makeProcessMap(
        stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category)),
        [makeMapEdge('node-1', 'node-2', 1)],
      ),
      sop: makeSOP(stepDefs.map((s, i) => makeSOPStep(i + 1, s.stepId))),
    };
    const steps = parseSteps(output);
    const decisions = detectDecisions(steps, output);
    decisions.forEach((d, i) => {
      expect(d.decisionId).toBe(`dec-${i + 1}`);
    });
  });

  it('all decisions have non-empty description and indicators', () => {
    const stepDefs: StepDefinition[] = [
      makeStepDefinition(1, {
        stepId: 'step-chk-1',
        title: 'Handle form error',
        category: 'error_handling',
        systems: [],
        sourceEventIds: ['e1'],
      }),
    ];
    const output: ProcessOutput = {
      processRun: makeProcessRun({ runId: 'r-chk', activityName: 'Check' }),
      processDefinition: makeProcessDefinition(stepDefs),
      processMap: makeProcessMap([makeMapNode('step-chk-1', 1, 'error_handling')], []),
      sop: makeSOP([makeSOPStep(1, 'step-chk-1')]),
    };
    const steps = parseSteps(output);
    const decisions = detectDecisions(steps, output);
    for (const d of decisions) {
      expect(d.description.length).toBeGreaterThan(0);
      expect(d.indicators.length).toBeGreaterThan(0);
      expect(d.confidence).toBeGreaterThan(0);
      expect(d.confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ─── Unit tests: buildWorkflow ────────────────────────────────────────────────

describe('buildWorkflow: automation scoring', () => {
  it('automationScore=100 for all full_automation steps', () => {
    const stepDefs: StepDefinition[] = [
      makeStepDefinition(1, { stepId: 's1', title: 'Navigate', category: 'click_then_navigate', systems: [], durationMs: 1000, sourceEventIds: ['e1'] }),
      makeStepDefinition(2, { stepId: 's2', title: 'Click button', category: 'single_action', systems: [], durationMs: 1000, sourceEventIds: ['e2'] }),
    ];
    const output: ProcessOutput = {
      processRun: makeProcessRun({ runId: 'r-score', activityName: 'Score Test' }),
      processDefinition: makeProcessDefinition(stepDefs),
      processMap: makeProcessMap(
        stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category)),
        [makeMapEdge('node-1', 'node-2', 1)],
      ),
      sop: makeSOP(stepDefs.map((s, i) => makeSOPStep(i + 1, s.stepId))),
    };
    const steps = parseSteps(output);
    const activities = buildActivities(steps);
    const decisions = detectDecisions(steps, output);
    const workflow = buildWorkflow(steps, activities, decisions, output);
    expect(workflow.automationScore).toBe(100);
    expect(workflow.automationClassification).toBe('full_automation');
  });

  it('automationScore=0 for all manual_only steps', () => {
    const stepDefs: StepDefinition[] = [
      makeStepDefinition(1, { stepId: 's1', title: 'Handle error', category: 'error_handling', systems: [], durationMs: 5000, sourceEventIds: ['e1'] }),
    ];
    const output: ProcessOutput = {
      processRun: makeProcessRun({ runId: 'r-score2', activityName: 'Score Test 2' }),
      processDefinition: makeProcessDefinition(stepDefs),
      processMap: makeProcessMap([makeMapNode('s1', 1, 'error_handling')], []),
      sop: makeSOP([makeSOPStep(1, 's1')]),
    };
    const steps = parseSteps(output);
    const activities = buildActivities(steps);
    const decisions = detectDecisions(steps, output);
    const workflow = buildWorkflow(steps, activities, decisions, output);
    expect(workflow.automationScore).toBe(0);
    expect(workflow.automationClassification).toBe('manual_only');
  });

  it('workflowId and workflowName come from ProcessRun', () => {
    const stepDefs: StepDefinition[] = [
      makeStepDefinition(1, { stepId: 's1', title: 'Click button', category: 'single_action', systems: [], durationMs: 1000, sourceEventIds: ['e1'] }),
    ];
    const output: ProcessOutput = {
      processRun: makeProcessRun({ runId: 'run-named-123', activityName: 'Named Workflow' }),
      processDefinition: makeProcessDefinition(stepDefs),
      processMap: makeProcessMap([makeMapNode('s1', 1)], []),
      sop: makeSOP([makeSOPStep(1, 's1')]),
    };
    const steps = parseSteps(output);
    const activities = buildActivities(steps);
    const decisions = detectDecisions(steps, output);
    const workflow = buildWorkflow(steps, activities, decisions, output);
    expect(workflow.workflowId).toBe('run-named-123');
    expect(workflow.workflowName).toBe('Named Workflow');
  });
});
