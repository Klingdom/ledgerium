import { describe, it, expect } from 'vitest';
import type { StepDefinition, GroupingReason } from '@ledgerium/process-engine';
import { fingerprintWorkflowSteps } from './stepFingerprinter.js';
import { detectComponents } from './componentDetector.js';
import type { StepFingerprint } from './groupingTypes.js';

function makeStep(overrides: Partial<StepDefinition> & { ordinal: number; title: string; category: GroupingReason }): StepDefinition {
  return {
    stepId: `step-${overrides.ordinal}`,
    categoryLabel: 'Test',
    categoryColor: '#000',
    categoryBg: '#fff',
    operationalDefinition: '',
    purpose: '',
    systems: [],
    domains: [],
    inputs: [],
    outputs: [],
    completionCondition: '',
    confidence: 0.8,
    durationLabel: '< 1s',
    eventCount: 1,
    hasSensitiveEvents: false,
    sourceEventIds: [],
    ...overrides,
  };
}

describe('detectComponents', () => {
  it('detects shared components across workflows', () => {
    const stepsA = [
      makeStep({ ordinal: 1, title: 'Navigate to page', category: 'click_then_navigate' }),
      makeStep({ ordinal: 2, title: 'Send email', category: 'send_action', systems: ['Gmail'] }),
    ];
    const stepsB = [
      makeStep({ ordinal: 1, title: 'Download report', category: 'file_action' }),
      makeStep({ ordinal: 2, title: 'Send email', category: 'send_action', systems: ['Gmail'] }),
    ];

    const fpsA = fingerprintWorkflowSteps(stepsA, 'wf-1');
    const fpsB = fingerprintWorkflowSteps(stepsB, 'wf-2');

    const fpMap = new Map<string, StepFingerprint[]>([
      ['wf-1', fpsA],
      ['wf-2', fpsB],
    ]);

    const result = detectComponents({ fingerprintsByWorkflow: fpMap });

    // "Send Email" should be detected (appears in 2 workflows with verb=send, object=email)
    expect(result.components.length).toBeGreaterThan(0);
    const sendEmail = result.components.find(c => c.canonicalVerb === 'send' && c.canonicalObject === 'email');
    expect(sendEmail).toBeDefined();
    expect(sendEmail!.usageCount).toBe(2);
  });

  it('respects minOccurrences threshold', () => {
    const stepsA = [
      makeStep({ ordinal: 1, title: 'Send email', category: 'send_action' }),
    ];
    const stepsB = [
      makeStep({ ordinal: 1, title: 'Download report', category: 'file_action' }),
    ];

    const fpsA = fingerprintWorkflowSteps(stepsA, 'wf-1');
    const fpsB = fingerprintWorkflowSteps(stepsB, 'wf-2');

    const fpMap = new Map<string, StepFingerprint[]>([
      ['wf-1', fpsA],
      ['wf-2', fpsB],
    ]);

    // Each pattern appears only once → no components with threshold 2
    const result = detectComponents({ fingerprintsByWorkflow: fpMap }, 2);
    expect(result.components).toHaveLength(0);

    // With threshold 1, both should appear
    const result1 = detectComponents({ fingerprintsByWorkflow: fpMap }, 1);
    expect(result1.components.length).toBeGreaterThan(0);
  });

  it('maps fingerprints to their detected component', () => {
    const steps = [
      makeStep({ ordinal: 1, title: 'Send email', category: 'send_action' }),
    ];

    const fpsA = fingerprintWorkflowSteps(steps, 'wf-1');
    const fpsB = fingerprintWorkflowSteps(steps, 'wf-2');

    const fpMap = new Map<string, StepFingerprint[]>([
      ['wf-1', fpsA],
      ['wf-2', fpsB],
    ]);

    const result = detectComponents({ fingerprintsByWorkflow: fpMap });
    // Both fingerprints should map to the same component
    const compIdA = result.fingerprintToComponent.get(fpsA[0]!.id);
    const compIdB = result.fingerprintToComponent.get(fpsB[0]!.id);
    expect(compIdA).toBeDefined();
    expect(compIdA).toBe(compIdB);
  });

  it('sorts components by usage count', () => {
    const stepsWf1 = [
      makeStep({ ordinal: 1, title: 'Send email', category: 'send_action' }),
      makeStep({ ordinal: 2, title: 'Download report', category: 'file_action' }),
    ];
    const stepsWf2 = [
      makeStep({ ordinal: 1, title: 'Send email', category: 'send_action' }),
      makeStep({ ordinal: 2, title: 'Download report', category: 'file_action' }),
    ];
    const stepsWf3 = [
      makeStep({ ordinal: 1, title: 'Send email', category: 'send_action' }),
    ];

    const fpMap = new Map<string, StepFingerprint[]>([
      ['wf-1', fingerprintWorkflowSteps(stepsWf1, 'wf-1')],
      ['wf-2', fingerprintWorkflowSteps(stepsWf2, 'wf-2')],
      ['wf-3', fingerprintWorkflowSteps(stepsWf3, 'wf-3')],
    ]);

    const result = detectComponents({ fingerprintsByWorkflow: fpMap });
    // "Send email" (3 uses) should come before "Download report" (2 uses)
    expect(result.components.length).toBeGreaterThanOrEqual(2);
    expect(result.components[0]!.usageCount).toBeGreaterThanOrEqual(result.components[1]!.usageCount);
  });

  it('tracks group and family counts when mappings provided', () => {
    const steps = [
      makeStep({ ordinal: 1, title: 'Send email', category: 'send_action' }),
    ];

    const fpMap = new Map<string, StepFingerprint[]>([
      ['wf-1', fingerprintWorkflowSteps(steps, 'wf-1')],
      ['wf-2', fingerprintWorkflowSteps(steps, 'wf-2')],
      ['wf-3', fingerprintWorkflowSteps(steps, 'wf-3')],
    ]);

    const result = detectComponents({
      fingerprintsByWorkflow: fpMap,
      workflowToGroup: new Map([['wf-1', 'group-a'], ['wf-2', 'group-a'], ['wf-3', 'group-b']]),
      workflowToFamily: new Map([['wf-1', 'fam-1'], ['wf-2', 'fam-1'], ['wf-3', 'fam-2']]),
    });

    const sendEmail = result.components.find(c => c.canonicalVerb === 'send');
    expect(sendEmail).toBeDefined();
    expect(sendEmail!.groupCount).toBe(2);
    expect(sendEmail!.familyCount).toBe(2);
  });
});
