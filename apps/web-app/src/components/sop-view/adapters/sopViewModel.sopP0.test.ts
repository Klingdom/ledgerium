/**
 * Tests for the SOP P0 render-only wiring in buildSOPViewModel:
 *  - alignment pill (gated N>=2 vs single-run disclosure)
 *  - per-step evidence snippet (threaded from real signals + page context)
 *  - observed-vs-inferred outcome flag
 *  - render of computed-but-hidden fields (scope / outputs)
 *
 * The view model is the single normalization boundary, so these assert that the
 * honest derivations actually reach the UI layer.
 */

import { describe, it, expect } from 'vitest';
import { buildSOPViewModel } from './sopViewModel';

const BASE_SOP = {
  sopId: 'sop-1',
  title: 'Process Invoice',
  version: '1.0',
  purpose: 'Process an incoming invoice',
  businessObjective: 'Process an incoming invoice',
  scope: 'Applies to all AP invoices entered in NetSuite.',
  systems: ['NetSuite'],
  roles: ['AP Clerk'],
  steps: [
    {
      ordinal: 1,
      stepId: 's1',
      title: 'Open invoice form',
      category: 'click_then_navigate',
      action: 'Open the invoice form',
      system: 'NetSuite',
      actor: 'AP Clerk',
      inputs: ['Invoice number'],
      outputs: ['Invoice form open'],
      expectedOutcome: 'Invoice form loads',
      warnings: [],
      instructions: [
        { sequence: 1, instruction: 'Click New Invoice', instructionType: 'action', system: 'NetSuite', isSensitive: false, targetLabel: 'New Invoice' },
      ],
      detail: '1. Click New Invoice',
    },
    {
      ordinal: 2,
      stepId: 's2',
      title: 'Submit invoice',
      category: 'fill_and_submit',
      action: 'Fill and submit',
      system: 'NetSuite',
      inputs: ['Amount', 'Vendor'],
      outputs: ['Invoice recorded'],
      expectedOutcome: 'Confirmation message appears and record is saved',
      warnings: [],
      instructions: [
        { sequence: 1, instruction: 'Enter amount', instructionType: 'action', system: 'NetSuite', isSensitive: false, targetLabel: 'Amount' },
        { sequence: 2, instruction: 'Verify confirmation toast', instructionType: 'verify', system: 'NetSuite', isSensitive: false, targetLabel: '' },
      ],
      detail: '1. Enter amount\n✓ Verify confirmation toast',
    },
  ],
};

const WORKFLOW = { id: 'wf-1', title: 'Process Invoice', confidence: 0.9, createdAt: '2026-06-01T00:00:00.000Z', status: 'active' };

describe('buildSOPViewModel — alignment pill wiring', () => {
  it('surfaces an aligned pill when cohort intelligence has N>=2', () => {
    const vm = buildSOPViewModel(BASE_SOP, WORKFLOW, undefined, {
      sopIntelligence: {
        sopAlignment: { alignmentScore: 0.88, alignmentLevel: 'high', alignedRunCount: 7, totalRunCount: 8, driftIndicators: [] },
        documentationDrift: { score: 12, level: 'aligned', findings: [] },
        runCount: 8,
      },
    });
    expect(vm).not.toBeNull();
    expect(vm!.alignment.kind).toBe('aligned');
    expect(vm!.alignment.alignmentPct).toBe(88);
    expect(vm!.alignment.runCount).toBe(8);
    expect(vm!.alignment.hasSignal).toBe(true);
  });

  it('surfaces the single-run disclosure (NOT a verdict) when no intelligence is present', () => {
    const vm = buildSOPViewModel(BASE_SOP, WORKFLOW);
    expect(vm!.alignment.kind).toBe('insufficient');
    expect(vm!.alignment.hasSignal).toBe(false);
    expect(vm!.alignment.alignmentPct).toBeNull();
  });
});

describe('buildSOPViewModel — per-step evidence snippet', () => {
  it('threads applicationLabel + page context + target label into the evidence snippet', () => {
    const vm = buildSOPViewModel(BASE_SOP, WORKFLOW, undefined, {
      stepPageContext: { 1: { pageTitle: 'Invoices' } },
    });
    const step1 = vm!.steps[0]!;
    expect(step1.evidence.hasEvidence).toBe(true);
    expect(step1.evidence.text).toBe('NetSuite · Invoices · New Invoice');
  });

  it('omits the page when no page context is provided (no fabrication)', () => {
    const vm = buildSOPViewModel(BASE_SOP, WORKFLOW);
    const step1 = vm!.steps[0]!;
    expect(step1.evidence.text).toBe('NetSuite · New Invoice');
  });

  it('reports no evidence for a step with no system and no target label', () => {
    const sop = {
      ...BASE_SOP,
      steps: [{ ordinal: 1, stepId: 's', title: 'x', category: 'single_action', action: '', system: '', inputs: [], outputs: [], expectedOutcome: '', warnings: [], instructions: [], detail: '' }],
    };
    const vm = buildSOPViewModel(sop, WORKFLOW);
    expect(vm!.steps[0]!.evidence.hasEvidence).toBe(false);
  });
});

describe('buildSOPViewModel — observed vs inferred outcome', () => {
  it('marks a step with a verify instruction as observed', () => {
    const vm = buildSOPViewModel(BASE_SOP, WORKFLOW);
    expect(vm!.steps[1]!.outcomeObserved).toBe(true);
  });

  it('marks a step with no verify instruction as inferred', () => {
    const vm = buildSOPViewModel(BASE_SOP, WORKFLOW);
    expect(vm!.steps[0]!.outcomeObserved).toBe(false);
  });
});

describe('buildSOPViewModel — computed-but-hidden fields render', () => {
  it('exposes scope on metadata and outputs per step', () => {
    const vm = buildSOPViewModel(BASE_SOP, WORKFLOW);
    expect(vm!.metadata.scope).toBe('Applies to all AP invoices entered in NetSuite.');
    expect(vm!.steps[0]!.outputs).toEqual(['Invoice form open']);
    expect(vm!.steps[1]!.outputs).toEqual(['Invoice recorded']);
  });

  it('returns null for missing SOP and degrades gracefully', () => {
    expect(buildSOPViewModel(null)).toBeNull();
  });
});
