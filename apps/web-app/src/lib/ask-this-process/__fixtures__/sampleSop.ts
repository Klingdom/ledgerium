/**
 * Fixed, deterministic SOP fixtures for the "Ask This Process" Phase-A tests.
 *
 * These are hand-built `SOP` / `ProcessMap` artifacts (the raw `process_output`
 * shape) used by the golden / determinism / citation tests. They are stable
 * literals — no clock, no randomness — so the bundle + bundleHash are fully
 * reproducible.
 *
 * @module ask-this-process/__fixtures__/sampleSop
 */

import type { SOP, SOPStep, ProcessMap, ProcessMapNode } from '@ledgerium/process-engine';
import type { SopIntelligenceInput } from '@/components/sop-view/adapters/sopIntelligence';

function step(partial: Partial<SOPStep> & { ordinal: number; stepId: string }): SOPStep {
  const base: SOPStep = {
    ordinal: partial.ordinal,
    stepId: partial.stepId,
    title: partial.title ?? 'Untitled step',
    category: partial.category ?? 'single_action',
    action: partial.action ?? 'Do something',
    instructions: partial.instructions ?? [],
    detail: partial.detail ?? '',
    inputs: partial.inputs ?? [],
    expectedOutcome: partial.expectedOutcome ?? '',
    warnings: partial.warnings ?? [],
    durationLabel: partial.durationLabel ?? '—',
    confidence: partial.confidence ?? 0.8,
    sourceStepId: partial.sourceStepId ?? partial.stepId,
  };
  // Only attach optional fields when present (exactOptionalPropertyTypes).
  if (partial.system !== undefined) base.system = partial.system;
  if (partial.actor !== undefined) base.actor = partial.actor;
  if (partial.frictionIndicators !== undefined) base.frictionIndicators = partial.frictionIndicators;
  if (partial.isDecisionPoint !== undefined) base.isDecisionPoint = partial.isDecisionPoint;
  if (partial.decisionLabel !== undefined) base.decisionLabel = partial.decisionLabel;
  return base;
}

/**
 * A 3-step Salesforce "log opportunity" SOP. Step 2 is a decision point; step 3
 * carries a verify instruction (outcomeObserved=true) + a redundant-action
 * friction (automation candidate). Stable, citable ids.
 */
export const SAMPLE_SOP: SOP = {
  sopId: 'sop_demo_001',
  title: 'Log a Sales Opportunity',
  version: '1.0.0',
  purpose: 'Record a new opportunity in the CRM after a qualifying call.',
  scope: 'Single opportunity entry',
  systems: ['Salesforce', 'Gmail'],
  prerequisites: ['Qualified lead'],
  estimatedTime: '4m 30s',
  inputs: ['Lead details'],
  outputs: ['Saved opportunity'],
  completionCriteria: ['Opportunity visible in pipeline'],
  generatedAt: '2026-06-10T14:03:00.000Z',
  businessObjective: 'Ensure every qualified lead becomes a tracked opportunity.',
  steps: [
    step({
      ordinal: 1,
      stepId: 'step_a',
      title: 'Open Opportunities',
      action: 'Navigate to Opportunities',
      system: 'Salesforce',
      expectedOutcome: 'Opportunities list is shown',
      durationLabel: '20s',
      confidence: 0.9,
      instructions: [
        {
          sequence: 1,
          instruction: 'Click the Opportunities tab',
          eventType: 'interaction.click',
          sourceEventId: 'evt_001',
          system: 'Salesforce',
          isSensitive: false,
          redacted: false,
          targetLabel: 'Opportunities',
          instructionType: 'action',
        },
        {
          sequence: 2,
          instruction: 'Wait for the list to load',
          eventType: 'navigation.open_page',
          sourceEventId: 'evt_002',
          system: 'Salesforce',
          isSensitive: false,
          redacted: false,
          instructionType: 'wait',
        },
      ],
    }),
    step({
      ordinal: 2,
      stepId: 'step_b',
      title: 'Choose record type',
      action: 'Select opportunity record type',
      system: 'Salesforce',
      expectedOutcome: 'Record type selected',
      durationLabel: '35s',
      confidence: 0.75,
      isDecisionPoint: true,
      decisionLabel: 'Is this a renewal or a new business opportunity?',
      instructions: [
        {
          sequence: 1,
          instruction: 'Select "New Business" record type',
          eventType: 'interaction.click',
          sourceEventId: 'evt_003',
          system: 'Salesforce',
          isSensitive: false,
          redacted: false,
          targetLabel: 'New Business',
          instructionType: 'action',
        },
      ],
    }),
    step({
      ordinal: 3,
      stepId: 'step_c',
      title: 'Save Opportunity',
      action: 'Fill fields and save',
      system: 'Salesforce',
      expectedOutcome: 'Opportunity saved and visible',
      durationLabel: '1m 10s',
      confidence: 0.82,
      frictionIndicators: [
        {
          type: 'redundant_action',
          label: 'Re-entered the close date twice',
          severity: 'medium',
          stepOrdinals: [3],
        },
      ],
      instructions: [
        {
          sequence: 1,
          instruction: 'Enter the opportunity name',
          eventType: 'interaction.input_change',
          sourceEventId: 'evt_004',
          system: 'Salesforce',
          isSensitive: false,
          redacted: false,
          targetLabel: 'Opportunity Name',
          instructionType: 'action',
        },
        {
          sequence: 2,
          instruction: 'Click Save',
          eventType: 'interaction.click',
          sourceEventId: 'evt_005',
          system: 'Salesforce',
          isSensitive: false,
          redacted: false,
          targetLabel: 'Save',
          instructionType: 'action',
        },
        {
          sequence: 3,
          instruction: 'Confirm the opportunity appears in the pipeline',
          eventType: 'interaction.click',
          sourceEventId: 'evt_006',
          system: 'Salesforce',
          isSensitive: false,
          redacted: false,
          instructionType: 'verify',
        },
      ],
    }),
  ],
  notes: [],
};

function node(ordinal: number, stepId: string, pageTitle: string): ProcessMapNode {
  return {
    id: `node_${ordinal}`,
    stepId,
    ordinal,
    title: 'n',
    nodeType: 'task',
    category: 'single_action',
    categoryLabel: 'Action',
    categoryColor: '#000',
    categoryBg: '#fff',
    position: { x: 0, y: 0 },
    metadata: {
      systems: ['Salesforce'],
      durationLabel: '—',
      eventCount: 1,
      humanEventCount: 1,
      pageTitle,
      eventTypeSummary: {},
    },
  };
}

export const SAMPLE_PROCESS_MAP: ProcessMap = {
  id: 'sop_demo_001-map',
  name: 'Log a Sales Opportunity',
  version: '1.2.0',
  sessionId: 'sess_demo',
  systems: ['Salesforce'],
  phases: [],
  nodes: [
    node(1, 'step_a', 'Opportunities | Salesforce'),
    node(2, 'step_b', 'New Opportunity | Salesforce'),
    // A deliberately long page title whose PII (the customer name) sits BEYOND
    // the 40-char cap, so the truncation provably drops it from the snippet.
    node(3, 'step_c', 'Opportunity Edit — New Business — Salesforce — John Smith (Acme Corp)'),
  ],
  edges: [],
};

/** Multi-run intelligence with N=4 runs, conformance meaningful (3 of 4 align). */
export const SAMPLE_INTEL_MULTI_RUN: SopIntelligenceInput = {
  sopAlignment: {
    alignmentScore: 0.8,
    alignmentLevel: 'moderate',
    alignedRunCount: 3,
    totalRunCount: 4,
    driftIndicators: [],
    computedAt: '2026-06-10T14:03:00.000Z',
  },
  documentationDrift: {
    score: 0.2,
    level: 'minor_drift',
    findings: ['Step 2 record-type selection varies across runs'],
    computedAt: '2026-06-10T14:03:00.000Z',
  },
  runCount: 4,
};

/** Single-run intelligence (N=1) — conformance must be N<2 gated to a refusal. */
export const SAMPLE_INTEL_SINGLE_RUN: SopIntelligenceInput = {
  sopAlignment: null,
  documentationDrift: null,
  runCount: 1,
};

/** An empty SOP (no steps) — counts/shape must refuse with insufficient_data. */
export const EMPTY_SOP: SOP = {
  ...SAMPLE_SOP,
  sopId: 'sop_empty',
  steps: [],
};
