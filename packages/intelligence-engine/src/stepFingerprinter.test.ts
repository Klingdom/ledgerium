import { describe, it, expect } from 'vitest';
import type { StepDefinition, GroupingReason } from '@ledgerium/process-engine';
import {
  fingerprintStep,
  fingerprintWorkflowSteps,
  fingerprintSimilarity,
  sequenceFingerSimilarity,
  fingerprintEvent,
  hashStepSequence,
  hashEventSequence,
} from './stepFingerprinter.js';

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

describe('fingerprintStep', () => {
  it('parses verb and object from step title', () => {
    const step = makeStep({
      ordinal: 1,
      title: 'Send email to customer',
      category: 'send_action',
      systems: ['Gmail'],
    });

    const fp = fingerprintStep(step, 'wf-1');
    expect(fp.verb).toBe('send');
    expect(fp.object).toBe('email');
    expect(fp.system).toBe('gmail');
    expect(fp.semanticSignature).toContain('send');
  });

  it('uses first verb found in title (greedy left-to-right)', () => {
    const step = makeStep({
      ordinal: 1,
      title: 'Click send button in compose modal',
      category: 'send_action',
      systems: ['Gmail'],
    });

    const fp = fingerprintStep(step, 'wf-1');
    // "click" is found first, before "send"
    expect(fp.verb).toBe('click');
    expect(fp.system).toBe('gmail');
  });

  it('infers verb from event type when title has no recognized verb', () => {
    const step = makeStep({
      ordinal: 1,
      title: 'compose modal area',
      category: 'single_action',
    });

    const fp = fingerprintStep(step, 'wf-1', 'interaction.click');
    expect(fp.verb).toBe('click');
    expect(fp.eventType).toBe('interaction.click');
  });

  it('falls back to category for verb inference', () => {
    const step = makeStep({
      ordinal: 1,
      title: 'some label without recognized words',
      category: 'fill_and_submit',
    });

    const fp = fingerprintStep(step, 'wf-1');
    expect(fp.verb).toBe('submit');
  });

  it('detects system from step systems array', () => {
    const step = makeStep({
      ordinal: 1,
      title: 'Click button',
      category: 'single_action',
      systems: ['Salesforce'],
    });

    const fp = fingerprintStep(step, 'wf-1');
    expect(fp.system).toBe('salesforce');
  });

  it('generates deterministic IDs', () => {
    const step = makeStep({
      ordinal: 3,
      title: 'Submit form',
      category: 'fill_and_submit',
    });

    const fp = fingerprintStep(step, 'wf-1');
    expect(fp.id).toBe('fp-wf-1-3');
    expect(fp.sequenceIndex).toBe(3);
  });

  it('computes confidence based on parsed field count', () => {
    const fullStep = makeStep({
      ordinal: 1,
      title: 'Download report',
      category: 'file_action',
      systems: ['Reporting'],
    });

    const fp = fingerprintStep(fullStep, 'wf-1', 'interaction.download_file');
    // verb=download, object=report, system=reporting, eventType set → 4/4 = 1.0
    expect(fp.confidence).toBe(1.0);

    const sparseStep = makeStep({
      ordinal: 1,
      title: 'do stuff here',
      category: 'single_action',
    });

    const fpSparse = fingerprintStep(sparseStep, 'wf-1');
    expect(fpSparse.confidence).toBeLessThan(1.0);
  });
});

describe('fingerprintWorkflowSteps', () => {
  it('links predecessor/successor chains', () => {
    const steps = [
      makeStep({ ordinal: 1, title: 'Navigate to page', category: 'click_then_navigate' }),
      makeStep({ ordinal: 2, title: 'Fill form', category: 'fill_and_submit' }),
      makeStep({ ordinal: 3, title: 'Submit form', category: 'fill_and_submit' }),
    ];

    const fps = fingerprintWorkflowSteps(steps, 'wf-1');

    expect(fps).toHaveLength(3);
    // First step: no predecessor, has successor
    expect(fps[0]!.precedingStepFingerprintId).toBeNull();
    expect(fps[0]!.followingStepFingerprintId).toBe(fps[1]!.id);
    // Middle step: has both
    expect(fps[1]!.precedingStepFingerprintId).toBe(fps[0]!.id);
    expect(fps[1]!.followingStepFingerprintId).toBe(fps[2]!.id);
    // Last step: has predecessor, no successor
    expect(fps[2]!.precedingStepFingerprintId).toBe(fps[1]!.id);
    expect(fps[2]!.followingStepFingerprintId).toBeNull();
  });
});

describe('fingerprintSimilarity', () => {
  it('returns 1.0 for identical semantic signatures', () => {
    const step = makeStep({
      ordinal: 1, title: 'Send email', category: 'send_action', systems: ['Gmail'],
    });

    const a = fingerprintStep(step, 'wf-1', 'interaction.click');
    const b = fingerprintStep(step, 'wf-2', 'interaction.click');
    expect(fingerprintSimilarity(a, b)).toBe(1.0);
  });

  it('returns partial similarity for shared verb but different object', () => {
    const stepA = makeStep({
      ordinal: 1, title: 'Click button', category: 'single_action',
    });
    const stepB = makeStep({
      ordinal: 1, title: 'Click link', category: 'single_action',
    });

    const a = fingerprintStep(stepA, 'wf-1');
    const b = fingerprintStep(stepB, 'wf-2');
    const sim = fingerprintSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.2);
    expect(sim).toBeLessThan(1.0);
  });
});

describe('sequenceFingerSimilarity', () => {
  it('returns 1.0 for identical sequences', () => {
    const steps = [
      makeStep({ ordinal: 1, title: 'Navigate to page', category: 'click_then_navigate' }),
      makeStep({ ordinal: 2, title: 'Submit form', category: 'fill_and_submit' }),
    ];

    const a = fingerprintWorkflowSteps(steps, 'wf-1');
    const b = fingerprintWorkflowSteps(steps, 'wf-2');
    expect(sequenceFingerSimilarity(a, b)).toBe(1.0);
  });

  it('penalizes length differences', () => {
    const stepsShort = [
      makeStep({ ordinal: 1, title: 'Navigate to page', category: 'click_then_navigate' }),
    ];
    const stepsLong = [
      makeStep({ ordinal: 1, title: 'Navigate to page', category: 'click_then_navigate' }),
      makeStep({ ordinal: 2, title: 'Submit form', category: 'fill_and_submit' }),
      makeStep({ ordinal: 3, title: 'Send email', category: 'send_action' }),
    ];

    const a = fingerprintWorkflowSteps(stepsShort, 'wf-1');
    const b = fingerprintWorkflowSteps(stepsLong, 'wf-2');
    const sim = sequenceFingerSimilarity(a, b);
    expect(sim).toBeLessThan(1.0);
    expect(sim).toBeGreaterThan(0);
  });
});

describe('event fingerprinting', () => {
  it('generates deterministic event fingerprints', () => {
    const fp = fingerprintEvent('interaction.click', 'button', 'gmail');
    expect(fp).toBe('interaction.click:button:gmail');
  });

  it('handles null fields with underscores', () => {
    const fp = fingerprintEvent('interaction.click', null, null);
    expect(fp).toBe('interaction.click:_:_');
  });

  it('hashes event sequences deterministically', () => {
    const events = ['interaction.click:button:_', 'interaction.submit:form:_'];
    const hash = hashEventSequence(events);
    expect(hash).toBe('interaction.click:button:_|interaction.submit:form:_');
  });
});

describe('hashStepSequence', () => {
  it('produces deterministic hash from fingerprints', () => {
    const steps = [
      makeStep({ ordinal: 1, title: 'Click send button', category: 'send_action' }),
      makeStep({ ordinal: 2, title: 'Download report', category: 'file_action' }),
    ];

    const fps = fingerprintWorkflowSteps(steps, 'wf-1');
    const hash = hashStepSequence(fps);
    expect(hash).toContain('|');
    expect(hash.split('|')).toHaveLength(2);

    // Same steps → same hash
    const fps2 = fingerprintWorkflowSteps(steps, 'wf-2');
    expect(hashStepSequence(fps2)).toBe(hash);
  });
});
