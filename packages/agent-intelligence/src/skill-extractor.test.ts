/**
 * Comprehensive tests for the Skill Extractor pipeline stage.
 *
 * Tests cover:
 * - Skill identification (tuple deduplication)
 * - Skill naming (snake_case, system suffix)
 * - Input/output schema derivation
 * - Reusability scoring rules
 * - Skill clustering (exact match + verb+object variations)
 * - SkillLibrary aggregate metrics
 * - Integration with full transformWorkflow pipeline
 * - Edge cases: empty input, single step, manual-only, system-agnostic
 */

import { describe, it, expect } from 'vitest';
import type {
  StepIntelligence,
  Activity,
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
import { extractSkills } from './skill-extractor.js';
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
    inferenceMethod: 'deterministic',
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

// ─── Pipeline fixture builders (reuse pattern from transform.test.ts) ─────────

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

/** Build a minimal ProcessOutput for a list of step definitions. */
function makeProcessOutput(stepDefs: StepDefinition[], runId = 'run-test-001'): ProcessOutput {
  const sopSteps = stepDefs.map((s, i) => makeSOPStep(i + 1, s.stepId, { category: s.category }));
  const nodes = stepDefs.map((s, i) => makeMapNode(s.stepId, i + 1, s.category));
  const edges = stepDefs.slice(0, -1).map((s, i) =>
    makeMapEdge(`node-${i + 1}`, `node-${i + 2}`, i + 1),
  );
  return {
    processRun: makeProcessRun({ runId }),
    processDefinition: makeProcessDefinition(stepDefs),
    processMap: makeProcessMap(nodes, edges),
    sop: makeSOP(sopSteps),
  };
}

// ─── 1. Skill Identification ──────────────────────────────────────────────────

describe('Skill Identification', () => {
  it('single step produces exactly one skill', () => {
    const steps = [makeStepIntelligence()];
    const activities = [makeActivity()];
    const lib = extractSkills(steps, activities);
    expect(lib.skills).toHaveLength(1);
    expect(lib.uniqueSkillCount).toBe(1);
  });

  it('two steps with the same verb+object+system produce one skill with both step IDs', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: 'gmail' }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'send', object: 'email', system: 'gmail' }),
    ];
    const activities = [makeActivity({ stepIds: ['step-1', 'step-2'] })];
    const lib = extractSkills(steps, activities);
    expect(lib.skills).toHaveLength(1);
    const skill = lib.skills[0]!;
    expect(skill.sourceStepIds).toContain('step-1');
    expect(skill.sourceStepIds).toContain('step-2');
  });

  it('steps with different verbs produce different skills', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: 'gmail' }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'download', object: 'file', system: 'gmail' }),
    ];
    const activities = [makeActivity({ stepIds: ['step-1', 'step-2'] })];
    const lib = extractSkills(steps, activities);
    expect(lib.skills).toHaveLength(2);
  });

  it('steps with same verb+object but different systems produce different skills', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: 'gmail' }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'send', object: 'email', system: 'outlook' }),
    ];
    const activities = [makeActivity({ stepIds: ['step-1', 'step-2'] })];
    const lib = extractSkills(steps, activities);
    expect(lib.skills).toHaveLength(2);
    const skillNames = lib.skills.map(s => s.skillName);
    expect(skillNames).toContain('send_email_in_gmail');
    expect(skillNames).toContain('send_email_in_outlook');
  });

  it('steps with same verb+object+null system deduplicate into one skill', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'click', object: 'button', system: null }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'click', object: 'button', system: null }),
      makeStepIntelligence({ stepId: 'step-3', verb: 'click', object: 'button', system: null }),
    ];
    const activities = [makeActivity({ stepIds: ['step-1', 'step-2', 'step-3'] })];
    const lib = extractSkills(steps, activities);
    expect(lib.skills).toHaveLength(1);
    expect(lib.skills[0]!.sourceStepIds).toHaveLength(3);
  });

  it('three distinct tuples produce three skills', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: 'gmail' }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'fill', object: 'form', system: 'netsuite' }),
      makeStepIntelligence({ stepId: 'step-3', verb: 'navigate', object: 'page', system: null }),
    ];
    const activities = [makeActivity({ stepIds: ['step-1', 'step-2', 'step-3'] })];
    const lib = extractSkills(steps, activities);
    expect(lib.skills).toHaveLength(3);
  });
});

// ─── 2. Skill Naming ──────────────────────────────────────────────────────────

describe('Skill Naming', () => {
  it('verb=send, object=email, system=null → skillName=send_email, skillId=skill-send_email', () => {
    const steps = [makeStepIntelligence({ verb: 'send', object: 'email', system: null })];
    const lib = extractSkills(steps, [makeActivity()]);
    const skill = lib.skills[0]!;
    expect(skill.skillName).toBe('send_email');
    expect(skill.skillId).toBe('skill-send_email');
  });

  it('verb=fill, object=form, system=netsuite → skillName=fill_form_in_netsuite', () => {
    const steps = [makeStepIntelligence({ verb: 'fill', object: 'form', system: 'netsuite' })];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.skills[0]!.skillName).toBe('fill_form_in_netsuite');
  });

  it('verb=navigate, object=page, system=null → skillName=navigate_page', () => {
    const steps = [makeStepIntelligence({ verb: 'navigate', object: 'page', system: null })];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.skills[0]!.skillName).toBe('navigate_page');
  });

  it('verb=download, object=file, system=google_drive → skillName=download_file_in_google_drive', () => {
    const steps = [makeStepIntelligence({ verb: 'download', object: 'file', system: 'google_drive' })];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.skills[0]!.skillName).toBe('download_file_in_google_drive');
  });

  it('skill description is human-readable and includes the system when present', () => {
    const steps = [makeStepIntelligence({ verb: 'fill', object: 'form', system: 'netsuite' })];
    const lib = extractSkills(steps, [makeActivity()]);
    const desc = lib.skills[0]!.description;
    expect(desc).toContain('Fill');
    expect(desc).toContain('form');
    expect(desc).toMatch(/netsuite/i);
  });

  it('send verb uses "via" preposition in description', () => {
    const steps = [makeStepIntelligence({ verb: 'send', object: 'email', system: 'gmail' })];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.skills[0]!.description).toContain('via');
  });

  it('non-communication verb uses "in" preposition in description', () => {
    const steps = [makeStepIntelligence({ verb: 'fill', object: 'form', system: 'salesforce' })];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.skills[0]!.description).toContain('in');
    expect(lib.skills[0]!.description).not.toContain('via');
  });
});

// ─── 3. Input / Output Schema ─────────────────────────────────────────────────

describe('Input/Output Schema', () => {
  it('step with 2 inputData fields produces 2 input schema entries', () => {
    const steps = [
      makeStepIntelligence({
        verb: 'fill',
        object: 'form',
        inputData: ['email_address', 'subject'],
      }),
    ];
    const lib = extractSkills(steps, [makeActivity()]);
    const skill = lib.skills[0]!;
    expect(skill.inputSchema).toHaveLength(2);
    expect(skill.inputSchema.map(s => s.name)).toContain('email_address');
    expect(skill.inputSchema.map(s => s.name)).toContain('subject');
  });

  it('input schema entries have required=true', () => {
    const steps = [makeStepIntelligence({ inputData: ['vendor_name'] })];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.skills[0]!.inputSchema[0]!.required).toBe(true);
  });

  it('output schema entries have required=false', () => {
    const steps = [makeStepIntelligence({ outputData: ['invoice_record_id'] })];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.skills[0]!.outputSchema[0]!.required).toBe(false);
  });

  it('multiple steps merged — union of all inputs/outputs (no duplicates)', () => {
    const steps = [
      makeStepIntelligence({
        stepId: 'step-1',
        verb: 'fill',
        object: 'form',
        system: null,
        inputData: ['vendor_name', 'amount'],
        outputData: ['form_id'],
      }),
      makeStepIntelligence({
        stepId: 'step-2',
        verb: 'fill',
        object: 'form',
        system: null,
        inputData: ['amount', 'due_date'],
        outputData: ['form_id', 'record_id'],
      }),
    ];
    const activities = [makeActivity({ stepIds: ['step-1', 'step-2'] })];
    const lib = extractSkills(steps, activities);
    const skill = lib.skills[0]!;
    // Inputs: vendor_name, amount, due_date (deduplicated)
    expect(skill.inputSchema).toHaveLength(3);
    // Outputs: form_id, record_id (deduplicated)
    expect(skill.outputSchema).toHaveLength(2);
  });

  it('step with no inputs/outputs produces empty schemas', () => {
    const steps = [makeStepIntelligence({ inputData: [], outputData: [] })];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.skills[0]!.inputSchema).toHaveLength(0);
    expect(lib.skills[0]!.outputSchema).toHaveLength(0);
  });

  it('requiredSystems collected from source steps', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: 'gmail' }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'send', object: 'email', system: 'gmail' }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2'] })]);
    expect(lib.skills[0]!.requiredSystems).toEqual(['gmail']);
  });

  it('system-agnostic skill has empty requiredSystems', () => {
    const steps = [makeStepIntelligence({ verb: 'click', object: 'button', system: null })];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.skills[0]!.requiredSystems).toHaveLength(0);
  });
});

// ─── 4. Reusability Scoring ───────────────────────────────────────────────────

describe('Reusability Scoring', () => {
  it('single occurrence has a low base score (< 0.5)', () => {
    const steps = [
      makeStepIntelligence({
        verb: 'fill',
        object: 'form',
        system: 'netsuite',
        automationClassification: 'ai_assisted',
      }),
    ];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.skills[0]!.reusabilityScore).toBeLessThan(0.5);
  });

  it('2 occurrences gives mid-range score', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'fill', object: 'form', system: 'netsuite' }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'fill', object: 'form', system: 'netsuite' }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2'] })]);
    // Base 0.5 + possible bonuses
    expect(lib.skills[0]!.reusabilityScore).toBeGreaterThanOrEqual(0.5);
  });

  it('3+ occurrences gives high base score (>= 0.8)', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'click', object: 'button', system: null }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'click', object: 'button', system: null }),
      makeStepIntelligence({ stepId: 'step-3', verb: 'click', object: 'button', system: null }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2', 'step-3'] })]);
    expect(lib.skills[0]!.reusabilityScore).toBeGreaterThanOrEqual(0.8);
  });

  it('system-agnostic skill gets bonus vs system-specific skill (same verb+object+count)', () => {
    const stepsAgnostic = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'fill', object: 'form', system: null, automationClassification: 'ai_assisted' }),
    ];
    const stepsSpecific = [
      makeStepIntelligence({ stepId: 'step-2', verb: 'fill', object: 'form', system: 'netsuite', automationClassification: 'ai_assisted' }),
    ];
    const libAgnostic = extractSkills(stepsAgnostic, [makeActivity({ stepIds: ['step-1'] })]);
    const libSpecific = extractSkills(stepsSpecific, [makeActivity({ activityId: 'act-2', stepIds: ['step-2'] })]);
    expect(libAgnostic.skills[0]!.reusabilityScore).toBeGreaterThan(libSpecific.skills[0]!.reusabilityScore);
  });

  it('full_automation skill gets higher score than manual_only (1 occurrence, system-agnostic)', () => {
    const stepsAuto = [
      makeStepIntelligence({ verb: 'navigate', object: 'page', system: null, automationClassification: 'full_automation' }),
    ];
    const stepsManual = [
      makeStepIntelligence({ verb: 'navigate', object: 'page', system: null, automationClassification: 'manual_only' }),
    ];
    const libAuto = extractSkills(stepsAuto, [makeActivity()]);
    const libManual = extractSkills(stepsManual, [makeActivity()]);
    expect(libAuto.skills[0]!.reusabilityScore).toBeGreaterThan(libManual.skills[0]!.reusabilityScore);
  });

  it('reusability score is capped at 1.0', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'click', object: 'button', system: null, automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'click', object: 'button', system: null, automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-3', verb: 'click', object: 'button', system: null, automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-4', verb: 'click', object: 'button', system: null, automationClassification: 'full_automation' }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2', 'step-3', 'step-4'] })]);
    expect(lib.skills[0]!.reusabilityScore).toBeLessThanOrEqual(1.0);
  });

  it('confidence is the average of source step confidence scores', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: null, confidence: 0.8 }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'send', object: 'email', system: null, confidence: 0.6 }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2'] })]);
    expect(lib.skills[0]!.confidence).toBeCloseTo(0.7, 2);
  });
});

// ─── 5. Skill Clustering ──────────────────────────────────────────────────────

describe('Skill Clustering', () => {
  it('single skill produces a single cluster', () => {
    const steps = [makeStepIntelligence({ verb: 'send', object: 'email', system: null })];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.clusters).toHaveLength(1);
    expect(lib.clusters[0]!.skillIds).toHaveLength(1);
  });

  it('two identical skills (same skillName from same tuple) produce one cluster', () => {
    // After dedup, two steps with same tuple = one skill → one cluster
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: 'gmail' }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'send', object: 'email', system: 'gmail' }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2'] })]);
    expect(lib.skills).toHaveLength(1);
    expect(lib.clusters).toHaveLength(1);
    expect(lib.clusters[0]!.occurrenceCount).toBe(2);
  });

  it('same verb+object with different systems → one cluster with canonical base name', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: 'gmail' }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'send', object: 'email', system: 'outlook' }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2'] })]);
    expect(lib.skills).toHaveLength(2); // Two distinct skills (different systems)
    expect(lib.clusters).toHaveLength(1); // Grouped under canonical "send_email"
    const cluster = lib.clusters[0]!;
    expect(cluster.canonicalSkillName).toBe('send_email');
    expect(cluster.skillIds).toHaveLength(2);
  });

  it('cluster clusterId is cluster-{canonicalSkillName}', () => {
    const steps = [makeStepIntelligence({ verb: 'fill', object: 'form', system: 'netsuite' })];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.clusters[0]!.clusterId).toBe('cluster-fill_form');
  });

  it('workflowCount is always 1 (per-workflow extraction)', () => {
    const steps = [makeStepIntelligence({ verb: 'click', object: 'button', system: null })];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.clusters[0]!.workflowCount).toBe(1);
  });

  it('all unique skills → each skill in its own cluster', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: null }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'fill', object: 'form', system: null }),
      makeStepIntelligence({ stepId: 'step-3', verb: 'navigate', object: 'page', system: null }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2', 'step-3'] })]);
    expect(lib.clusters).toHaveLength(3);
  });

  it('cluster occurrenceCount is sum of sourceStepIds across member skills', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: 'gmail' }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'send', object: 'email', system: 'gmail' }),
      makeStepIntelligence({ stepId: 'step-3', verb: 'send', object: 'email', system: 'outlook' }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2', 'step-3'] })]);
    // Two distinct skills: send_email_in_gmail (2 steps) + send_email_in_outlook (1 step)
    // One cluster: send_email with occurrenceCount=3
    expect(lib.clusters).toHaveLength(1);
    expect(lib.clusters[0]!.occurrenceCount).toBe(3);
  });

  it('cluster averageConfidence is mean of member skill confidence scores', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: 'gmail', confidence: 0.9 }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'send', object: 'email', system: 'outlook', confidence: 0.7 }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2'] })]);
    expect(lib.clusters[0]!.averageConfidence).toBeCloseTo(0.8, 2);
  });
});

// ─── 6. SkillLibrary Metrics ──────────────────────────────────────────────────

describe('SkillLibrary Metrics', () => {
  it('uniqueSkillCount equals skills.length', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: null }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'fill', object: 'form', system: null }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2'] })]);
    expect(lib.uniqueSkillCount).toBe(lib.skills.length);
  });

  it('reusableSkillCount counts only skills with reusabilityScore >= 0.6', () => {
    // 3+ occurrences of click button → high reusability score
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'click', object: 'button', system: null, automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'click', object: 'button', system: null, automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-3', verb: 'click', object: 'button', system: null, automationClassification: 'full_automation' }),
      // Single occurrence of manual fill form → low reusability
      makeStepIntelligence({ stepId: 'step-4', verb: 'fill', object: 'form', system: 'netsuite', automationClassification: 'manual_only' }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2', 'step-3', 'step-4'] })]);
    const manuallyCountedReusable = lib.skills.filter(s => s.reusabilityScore >= 0.6).length;
    expect(lib.reusableSkillCount).toBe(manuallyCountedReusable);
  });

  it('skillTypeDistribution sums to uniqueSkillCount', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: null }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'fill', object: 'form', system: null }),
      makeStepIntelligence({ stepId: 'step-3', verb: 'navigate', object: 'page', system: null }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2', 'step-3'] })]);
    const distTotal = Object.values(lib.skillTypeDistribution).reduce((a, b) => a + b, 0);
    expect(distTotal).toBe(lib.uniqueSkillCount);
  });

  it('skillTypeDistribution correctly counts communication skills', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: null }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'notify', object: 'user', system: null }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2'] })]);
    expect(lib.skillTypeDistribution.communication).toBe(2);
  });

  it('skillTypeDistribution contains all SkillType keys', () => {
    const steps = [makeStepIntelligence()];
    const lib = extractSkills(steps, [makeActivity()]);
    const expectedKeys = [
      'data_extraction', 'data_entry', 'navigation', 'verification',
      'communication', 'file_operation', 'decision', 'integration', 'monitoring',
    ];
    for (const key of expectedKeys) {
      expect(lib.skillTypeDistribution).toHaveProperty(key);
    }
  });

  it('sourceActivityIds links skills to their activities', () => {
    const steps = [makeStepIntelligence({ stepId: 'step-1', verb: 'send', object: 'email', system: 'gmail' })];
    const activities = [makeActivity({ activityId: 'act-42', stepIds: ['step-1'] })];
    const lib = extractSkills(steps, activities);
    expect(lib.skills[0]!.sourceActivityIds).toContain('act-42');
  });
});

// ─── 7. Integration with Full Pipeline ───────────────────────────────────────

describe('Integration with Full Pipeline', () => {
  it('transformWorkflow populates skillLibrary on invoice processing (6-step workflow)', () => {
    const stepDefs: StepDefinition[] = [
      makeStepDefinition(1, { stepId: 'step-inv-1', title: 'Open email with invoice attachment', category: 'click_then_navigate', systems: ['gmail'], durationMs: 3000 }),
      makeStepDefinition(2, { stepId: 'step-inv-2', title: 'Download PDF attachment from email', category: 'file_action', systems: ['gmail'], outputs: ['invoice_pdf'], durationMs: 2000 }),
      makeStepDefinition(3, { stepId: 'step-inv-3', title: 'Navigate to Accounts Payable module in NetSuite', category: 'click_then_navigate', systems: ['netsuite'], durationMs: 4000 }),
      makeStepDefinition(4, { stepId: 'step-inv-4', title: 'Fill invoice form with vendor and amount details', category: 'data_entry', systems: ['netsuite'], inputs: ['vendor_name', 'invoice_amount'], durationMs: 45000 }),
      makeStepDefinition(5, { stepId: 'step-inv-5', title: 'Upload PDF invoice document to record', category: 'file_action', systems: ['netsuite'], inputs: ['invoice_pdf'], durationMs: 5000 }),
      makeStepDefinition(6, { stepId: 'step-inv-6', title: 'Submit invoice for approval', category: 'fill_and_submit', systems: ['netsuite'], outputs: ['invoice_record_id'], durationMs: 2000 }),
    ];
    const result = transformWorkflow(makeProcessOutput(stepDefs, 'run-invoice-int-001'));

    expect(result.skillLibrary).toBeDefined();
    expect(result.skillLibrary.skills.length).toBeGreaterThan(0);
    expect(result.skillLibrary.uniqueSkillCount).toBe(result.skillLibrary.skills.length);
    // Should have clusters
    expect(result.skillLibrary.clusters.length).toBeGreaterThan(0);
    // Distribution keys should all be present
    expect(result.skillLibrary.skillTypeDistribution).toHaveProperty('navigation');
    expect(result.skillLibrary.skillTypeDistribution).toHaveProperty('file_operation');
  });

  it('transformWorkflow — skills correctly trace back to source step IDs', () => {
    const stepDefs: StepDefinition[] = [
      makeStepDefinition(1, { stepId: 'step-t1', title: 'Send report email via Gmail', category: 'send_action', systems: ['gmail'], durationMs: 3000 }),
      makeStepDefinition(2, { stepId: 'step-t2', title: 'Fill form in NetSuite', category: 'data_entry', systems: ['netsuite'], durationMs: 5000 }),
    ];
    const result = transformWorkflow(makeProcessOutput(stepDefs, 'run-trace-001'));

    const allSourceStepIds = result.skillLibrary.skills.flatMap(s => s.sourceStepIds);
    // Every step should appear in at least one skill
    for (const step of result.steps) {
      expect(allSourceStepIds).toContain(step.stepId);
    }
  });

  it('transformWorkflow — skillLibrary reusableSkillCount is consistent with skills', () => {
    const stepDefs: StepDefinition[] = [
      makeStepDefinition(1, { stepId: 'step-r1', title: 'Navigate to dashboard', category: 'click_then_navigate', systems: ['salesforce'], durationMs: 2000 }),
      makeStepDefinition(2, { stepId: 'step-r2', title: 'Click export button', category: 'single_action', systems: ['salesforce'], durationMs: 1000 }),
      makeStepDefinition(3, { stepId: 'step-r3', title: 'Download report file', category: 'file_action', systems: ['salesforce'], durationMs: 3000 }),
    ];
    const result = transformWorkflow(makeProcessOutput(stepDefs, 'run-reuse-001'));

    const { skillLibrary } = result;
    const expectedReusable = skillLibrary.skills.filter(s => s.reusabilityScore >= 0.6).length;
    expect(skillLibrary.reusableSkillCount).toBe(expectedReusable);
  });
});

// ─── 8. Edge Cases ────────────────────────────────────────────────────────────

describe('Edge Cases', () => {
  it('empty steps returns empty skill library', () => {
    const lib = extractSkills([], []);
    expect(lib.skills).toHaveLength(0);
    expect(lib.clusters).toHaveLength(0);
    expect(lib.uniqueSkillCount).toBe(0);
    expect(lib.reusableSkillCount).toBe(0);
  });

  it('empty steps skillTypeDistribution has all keys set to 0', () => {
    const lib = extractSkills([], []);
    for (const count of Object.values(lib.skillTypeDistribution)) {
      expect(count).toBe(0);
    }
  });

  it('single step produces exactly one skill and one cluster', () => {
    const steps = [makeStepIntelligence({ verb: 'click', object: 'button', system: null })];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.skills).toHaveLength(1);
    expect(lib.clusters).toHaveLength(1);
  });

  it('all manual steps — skills still extracted with manual_only classification', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'review', object: 'document', system: null, automationClassification: 'manual_only' }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'annotate', object: 'record', system: null, automationClassification: 'manual_only' }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2'] })]);
    expect(lib.skills.length).toBeGreaterThan(0);
    for (const skill of lib.skills) {
      expect(skill.automationClassification).toBe('manual_only');
    }
  });

  it('steps with no system produce system-agnostic skills with empty requiredSystems', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'click', object: 'button', system: null }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'navigate', object: 'page', system: null }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2'] })]);
    for (const skill of lib.skills) {
      expect(skill.requiredSystems).toHaveLength(0);
    }
  });

  it('skill automation aggregates any manual_only → manual_only', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'fill', object: 'form', system: null, automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'fill', object: 'form', system: null, automationClassification: 'manual_only' }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2'] })]);
    expect(lib.skills[0]!.automationClassification).toBe('manual_only');
  });

  it('skill automation — all full_automation → full_automation', () => {
    const steps = [
      makeStepIntelligence({ stepId: 'step-1', verb: 'navigate', object: 'page', system: null, automationClassification: 'full_automation' }),
      makeStepIntelligence({ stepId: 'step-2', verb: 'navigate', object: 'page', system: null, automationClassification: 'full_automation' }),
    ];
    const lib = extractSkills(steps, [makeActivity({ stepIds: ['step-1', 'step-2'] })]);
    expect(lib.skills[0]!.automationClassification).toBe('full_automation');
  });

  it('verb not in VERB_TO_SKILL_TYPE defaults skillType to navigation', () => {
    const steps = [makeStepIntelligence({ verb: 'unknownverb', object: 'something', system: null })];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.skills[0]!.skillType).toBe('navigation');
  });

  it('skill verb and object fields are preserved from source steps', () => {
    const steps = [makeStepIntelligence({ verb: 'export', object: 'report', system: 'salesforce' })];
    const lib = extractSkills(steps, [makeActivity()]);
    expect(lib.skills[0]!.verb).toBe('export');
    expect(lib.skills[0]!.object).toBe('report');
  });

  it('large input: 10 distinct steps produce 10 skills', () => {
    const verbs = ['click', 'send', 'fill', 'navigate', 'download', 'upload', 'verify', 'create', 'search', 'approve'];
    const steps = verbs.map((verb, i) =>
      makeStepIntelligence({ stepId: `step-${i + 1}`, verb, object: 'item', system: null }),
    );
    const lib = extractSkills(steps, [makeActivity({ stepIds: steps.map(s => s.stepId) })]);
    expect(lib.skills).toHaveLength(10);
    expect(lib.uniqueSkillCount).toBe(10);
  });
});
