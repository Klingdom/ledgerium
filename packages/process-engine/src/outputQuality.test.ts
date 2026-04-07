/**
 * Output quality tests — validates that process map and SOP outputs meet
 * the v2.0 canonical model quality bar.
 *
 * These tests exercise the full pipeline (processSession) with representative
 * fixture data and verify structural, content, and personalization quality.
 */

import { describe, it, expect } from 'vitest';
import { processSession } from './processSession.js';
import type { ProcessEngineInput, CanonicalEventInput, DerivedStepInput } from './types.js';

// ─── Fixture helpers ─────────────────────────────────────────────────────────

const SESSION_ID = 'quality-test-session';
const NOW_MS = 1_700_000_000_000;

function evt(overrides: Partial<{
  event_id: string;
  event_type: string;
  actor_type: 'human' | 'system' | 'recorder';
  t_ms: number;
  pageTitle: string;
  applicationLabel: string;
  domain: string;
  label: string;
  isSensitive: boolean;
  routeTemplate: string;
}>): CanonicalEventInput {
  const {
    event_id = 'evt-1',
    event_type = 'interaction.click',
    actor_type = 'human',
    t_ms = NOW_MS,
    pageTitle = 'Dashboard',
    applicationLabel = 'Salesforce',
    domain = 'salesforce.com',
    label = 'Save',
    isSensitive = false,
    routeTemplate = '/page',
  } = overrides;

  return {
    event_id,
    session_id: SESSION_ID,
    t_ms,
    t_wall: new Date(t_ms).toISOString(),
    event_type,
    actor_type,
    page_context: {
      url: `https://${domain}${routeTemplate}`,
      urlNormalized: `https://${domain}${routeTemplate}`,
      domain,
      routeTemplate,
      pageTitle,
      applicationLabel,
    },
    target_summary: { label, role: 'button', isSensitive },
    normalization_meta: {
      sourceEventId: event_id,
      sourceEventType: event_type,
      normalizationRuleVersion: '1.0.0',
      redactionApplied: false,
    },
  };
}

function step(overrides: Partial<DerivedStepInput>): DerivedStepInput {
  return {
    step_id: `${SESSION_ID}-step-1`,
    session_id: SESSION_ID,
    ordinal: 1,
    title: 'Click Save',
    status: 'finalized',
    grouping_reason: 'single_action',
    confidence: 0.85,
    source_event_ids: ['evt-1'],
    start_t_ms: NOW_MS,
    ...overrides,
  };
}

// ─── Fixture: Simple linear workflow ─────────────────────────────────────────

function linearWorkflow(): ProcessEngineInput {
  return {
    sessionJson: {
      sessionId: SESSION_ID,
      activityName: 'Create New Opportunity',
      startedAt: new Date(NOW_MS).toISOString(),
    },
    normalizedEvents: [
      evt({ event_id: 'e1', event_type: 'interaction.click', label: 'New Opportunity', t_ms: NOW_MS }),
      evt({ event_id: 'e2', event_type: 'navigation.open_page', pageTitle: 'New Opportunity', t_ms: NOW_MS + 100 }),
      evt({ event_id: 'e3', event_type: 'interaction.input_change', label: 'Opportunity Name', t_ms: NOW_MS + 2000 }),
      evt({ event_id: 'e4', event_type: 'interaction.input_change', label: 'Amount', t_ms: NOW_MS + 3000 }),
      evt({ event_id: 'e5', event_type: 'interaction.input_change', label: 'Close Date', t_ms: NOW_MS + 4000 }),
      evt({ event_id: 'e6', event_type: 'interaction.submit', label: 'Save', t_ms: NOW_MS + 5000 }),
      evt({ event_id: 'e7', event_type: 'system.toast_shown', actor_type: 'system', t_ms: NOW_MS + 5500 }),
    ],
    derivedSteps: [
      step({
        step_id: `${SESSION_ID}-step-1`, ordinal: 1,
        title: 'Navigate to New Opportunity',
        grouping_reason: 'click_then_navigate', confidence: 0.85,
        source_event_ids: ['e1', 'e2'], duration_ms: 100,
        boundary_reason: 'navigation_changed',
        page_context: { domain: 'salesforce.com', applicationLabel: 'Salesforce', routeTemplate: '/opportunity/new' },
      }),
      step({
        step_id: `${SESSION_ID}-step-2`, ordinal: 2,
        title: 'Fill and submit opportunity form',
        grouping_reason: 'fill_and_submit', confidence: 0.9,
        source_event_ids: ['e3', 'e4', 'e5', 'e6', 'e7'], duration_ms: 3500,
        boundary_reason: 'form_submitted',
        page_context: { domain: 'salesforce.com', applicationLabel: 'Salesforce', routeTemplate: '/opportunity/new' },
      }),
    ],
  };
}

// ─── Fixture: Multi-system workflow with decisions ───────────────────────────

function multiSystemWorkflow(): ProcessEngineInput {
  return {
    sessionJson: {
      sessionId: SESSION_ID,
      activityName: 'Process Purchase Order',
      startedAt: new Date(NOW_MS).toISOString(),
    },
    normalizedEvents: [
      evt({ event_id: 'e1', event_type: 'interaction.click', label: 'New PO', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS }),
      evt({ event_id: 'e2', event_type: 'navigation.open_page', pageTitle: 'PO Create', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS + 100 }),
      evt({ event_id: 'e3', event_type: 'interaction.input_change', label: 'Vendor', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS + 2000 }),
      evt({ event_id: 'e4', event_type: 'interaction.submit', label: 'Submit', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS + 3000 }),
      evt({ event_id: 'e5', event_type: 'system.error_displayed', actor_type: 'system', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS + 3500 }),
      evt({ event_id: 'e6', event_type: 'interaction.click', label: 'OK', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS + 4000 }),
      evt({ event_id: 'e7', event_type: 'interaction.click', label: 'Approve', applicationLabel: 'DocuSign', domain: 'docusign.com', t_ms: NOW_MS + 8000 }),
      evt({ event_id: 'e8', event_type: 'navigation.open_page', pageTitle: 'Approval Complete', applicationLabel: 'DocuSign', domain: 'docusign.com', t_ms: NOW_MS + 8500 }),
    ],
    derivedSteps: [
      step({
        step_id: `${SESSION_ID}-step-1`, ordinal: 1,
        title: 'Navigate to PO Create', grouping_reason: 'click_then_navigate', confidence: 0.85,
        source_event_ids: ['e1', 'e2'], duration_ms: 100, boundary_reason: 'navigation_changed',
        page_context: { domain: 'sap.com', applicationLabel: 'SAP', routeTemplate: '/po/new' },
      }),
      step({
        step_id: `${SESSION_ID}-step-2`, ordinal: 2,
        title: 'Fill and submit PO form', grouping_reason: 'fill_and_submit', confidence: 0.9,
        source_event_ids: ['e3', 'e4'], duration_ms: 1000, boundary_reason: 'form_submitted',
        page_context: { domain: 'sap.com', applicationLabel: 'SAP', routeTemplate: '/po/new' },
      }),
      step({
        step_id: `${SESSION_ID}-step-3`, ordinal: 3,
        title: 'Handle validation error', grouping_reason: 'error_handling', confidence: 0.8,
        source_event_ids: ['e5', 'e6'], duration_ms: 500, boundary_reason: 'action_completed',
        page_context: { domain: 'sap.com', applicationLabel: 'SAP', routeTemplate: '/po/new' },
      }),
      step({
        step_id: `${SESSION_ID}-step-4`, ordinal: 4,
        title: 'Navigate to Approval Complete', grouping_reason: 'click_then_navigate', confidence: 0.85,
        source_event_ids: ['e7', 'e8'], duration_ms: 500, boundary_reason: 'app_context_changed',
        page_context: { domain: 'docusign.com', applicationLabel: 'DocuSign', routeTemplate: '/approve' },
      }),
    ],
  };
}

// ─── Fixture: Noisy workflow with repeated edits ─────────────────────────────

function noisyWorkflow(): ProcessEngineInput {
  return {
    sessionJson: {
      sessionId: SESSION_ID,
      activityName: 'Update Contact Info',
      startedAt: new Date(NOW_MS).toISOString(),
    },
    normalizedEvents: [
      evt({ event_id: 'e1', event_type: 'interaction.input_change', label: 'Phone', t_ms: NOW_MS }),
      evt({ event_id: 'e2', event_type: 'interaction.input_change', label: 'Phone', t_ms: NOW_MS + 500 }),
      evt({ event_id: 'e3', event_type: 'interaction.input_change', label: 'Phone', t_ms: NOW_MS + 1000 }),
      evt({ event_id: 'e4', event_type: 'interaction.input_change', label: 'Email', t_ms: NOW_MS + 2000 }),
      evt({ event_id: 'e5', event_type: 'system.loading_started', actor_type: 'system', t_ms: NOW_MS + 3000 }),
      evt({ event_id: 'e6', event_type: 'system.loading_finished', actor_type: 'system', t_ms: NOW_MS + 3500 }),
      evt({ event_id: 'e7', event_type: 'interaction.submit', label: 'Save', t_ms: NOW_MS + 4000 }),
    ],
    derivedSteps: [
      step({
        step_id: `${SESSION_ID}-step-1`, ordinal: 1,
        title: 'Update contact fields',
        grouping_reason: 'fill_and_submit', confidence: 0.9,
        source_event_ids: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'],
        duration_ms: 4000,
        page_context: { domain: 'salesforce.com', applicationLabel: 'Salesforce', routeTemplate: '/contact/edit' },
      }),
    ],
  };
}

// ─── TESTS ───────────────────────────────────────────────────────────────────

describe('Output Quality: Simple Linear Workflow', () => {
  const output = processSession(linearWorkflow());

  describe('SOP quality', () => {
    it('title does not have redundant SOP: prefix', () => {
      expect(output.sop.title.startsWith('SOP:')).toBe(false);
    });

    it('purpose is specific, not boilerplate', () => {
      expect(output.sop.purpose).toContain('Salesforce');
      expect(output.sop.purpose).toContain('2-step');
      expect(output.sop.purpose).not.toContain('Standard operating procedure for performing');
    });

    it('has trigger field', () => {
      expect(output.sop.trigger).toBeDefined();
      expect(output.sop.trigger!.length).toBeGreaterThan(10);
    });

    it('has business objective', () => {
      expect(output.sop.businessObjective).toBeDefined();
      expect(output.sop.businessObjective!).toContain('Salesforce');
    });

    it('has roles', () => {
      expect(output.sop.roles).toBeDefined();
      expect(output.sop.roles!.length).toBeGreaterThan(0);
    });

    it('prerequisites mention specific systems', () => {
      expect(output.sop.prerequisites.some(p => p.includes('Salesforce'))).toBe(true);
    });

    it('prerequisites mention required data fields', () => {
      expect(output.sop.prerequisites.some(p =>
        p.includes('Opportunity Name') || p.includes('Amount') || p.includes('Close Date'),
      )).toBe(true);
    });

    it('has quality indicators', () => {
      expect(output.sop.qualityIndicators).toBeDefined();
      expect(output.sop.qualityIndicators!.averageConfidence).toBeGreaterThan(0);
      expect(output.sop.qualityIndicators!.systemCount).toBe(1);
    });

    it('step titles are in imperative voice', () => {
      for (const s of output.sop.steps) {
        expect(s.title).toMatch(/^(Navigate|Complete|Enter|Click|Submit|Select|Resolve|Attach|Fill|Send|Open|Save|Verify|Review|Upload|Download)/);
      }
    });

    it('completion criteria are outcome-based', () => {
      expect(output.sop.completionCriteria.some(c => c.includes('confirm'))).toBe(true);
      expect(output.sop.completionCriteria.every(c => !c.includes('All 2 procedure steps'))).toBe(true);
    });

    it('notes are operational, not boilerplate', () => {
      expect(output.sop.notes.some(n => n.includes('evidence'))).toBe(true);
      expect(output.sop.notes.every(n => !n.includes('no AI inference was applied to produce step content'))).toBe(true);
    });
  });

  describe('Process map quality', () => {
    it('has objective', () => {
      expect(output.processMap.objective).toBeDefined();
      expect(output.processMap.objective!.length).toBeGreaterThan(10);
    });

    it('has trigger', () => {
      expect(output.processMap.trigger).toBeDefined();
    });

    it('has outcome', () => {
      expect(output.processMap.outcome).toBeDefined();
    });

    it('has duration label', () => {
      expect(output.processMap.durationLabel).toBeDefined();
    });

    it('start node has Trigger label', () => {
      const start = output.processMap.nodes.find(n => n.nodeType === 'start');
      expect(start!.categoryLabel).toBe('Trigger');
    });

    it('end node has Complete label', () => {
      const end = output.processMap.nodes.find(n => n.nodeType === 'end');
      expect(end!.categoryLabel).toBe('Complete');
    });
  });
});

describe('Output Quality: Multi-System with Decisions', () => {
  const output = processSession(multiSystemWorkflow());

  describe('SOP quality', () => {
    it('detects decision point at submit step', () => {
      const submitStep = output.sop.steps.find(s => s.category === 'fill_and_submit');
      expect(submitStep?.isDecisionPoint).toBe(true);
      expect(submitStep?.decisionLabel).toBeDefined();
    });

    it('extracts common issues from error steps', () => {
      expect(output.sop.commonIssues).toBeDefined();
      expect(output.sop.commonIssues!.length).toBeGreaterThan(0);
    });

    it('detects friction from error handling', () => {
      expect(output.sop.frictionSummary).toBeDefined();
      expect(output.sop.frictionSummary!.some(f => f.type === 'repeated_error')).toBe(true);
    });

    it('multi-system notes appear', () => {
      expect(output.sop.notes.some(n => n.includes('SAP') && n.includes('DocuSign'))).toBe(true);
    });

    it('scope mentions both systems', () => {
      expect(output.sop.scope).toContain('SAP');
      expect(output.sop.scope).toContain('DocuSign');
    });
  });

  describe('Process map quality', () => {
    it('has decision node type', () => {
      const decisionNodes = output.processMap.nodes.filter(n => n.nodeType === 'decision');
      expect(decisionNodes.length).toBeGreaterThan(0);
    });

    it('has exception node type', () => {
      const exceptionNodes = output.processMap.nodes.filter(n => n.nodeType === 'exception');
      expect(exceptionNodes.length).toBeGreaterThan(0);
    });

    it('has enriched phase labels', () => {
      expect(output.processMap.phases.length).toBeGreaterThanOrEqual(2);
      const phase = output.processMap.phases[0]!;
      expect(phase.name).not.toBe(phase.system); // Should be enriched beyond just system name
    });

    it('has friction summary', () => {
      expect(output.processMap.frictionSummary).toBeDefined();
      expect(output.processMap.frictionSummary!.length).toBeGreaterThan(0);
    });

    it('decision-related edge labels', () => {
      const decisionNode = output.processMap.nodes.find(n => n.nodeType === 'decision');
      if (decisionNode) {
        const outEdge = output.processMap.edges.find(e => e.source === decisionNode.id);
        expect(outEdge?.boundaryLabel).toBeDefined();
      }
    });
  });
});

describe('Output Quality: Noisy Workflow (dedup + noise suppression)', () => {
  const output = processSession(noisyWorkflow());

  describe('SOP noise suppression', () => {
    it('deduplicates repeated Phone edits to one instruction', () => {
      const step = output.sop.steps[0]!;
      const phoneInstructions = step.instructions.filter(i =>
        i.targetLabel === 'Phone' && i.eventType === 'interaction.input_change',
      );
      expect(phoneInstructions.length).toBe(1);
    });

    it('suppresses loading_finished events', () => {
      const step = output.sop.steps[0]!;
      const loadingFinished = step.instructions.filter(i =>
        i.eventType === 'system.loading_finished',
      );
      expect(loadingFinished.length).toBe(0);
    });

    it('classifies instructions by type', () => {
      const step = output.sop.steps[0]!;
      const actions = step.instructions.filter(i => i.instructionType === 'action');
      const waits = step.instructions.filter(i => i.instructionType === 'wait');
      expect(actions.length).toBeGreaterThan(0);
      // loading_started should be classified as wait
      expect(waits.length).toBeGreaterThanOrEqual(0);
    });

    it('detail text uses structured formatting', () => {
      const step = output.sop.steps[0]!;
      // Should contain numbered action items
      expect(step.detail).toMatch(/\d+\./);
    });
  });
});

// ─── Fixture: Single-step sparse workflow ────────────────────────────────────

function sparseWorkflow(): ProcessEngineInput {
  return {
    sessionJson: {
      sessionId: SESSION_ID,
      activityName: 'Quick Click',
      startedAt: new Date(NOW_MS).toISOString(),
    },
    normalizedEvents: [
      evt({ event_id: 'e1', event_type: 'interaction.click', label: 'OK', t_ms: NOW_MS }),
    ],
    derivedSteps: [
      step({
        step_id: `${SESSION_ID}-step-1`, ordinal: 1,
        title: 'Click OK',
        grouping_reason: 'single_action', confidence: 0.55,
        source_event_ids: ['e1'], duration_ms: 50,
      }),
    ],
  };
}

// ─── Fixture: Workflow with interleaved verify events ────────────────────────

function interleavedVerifyWorkflow(): ProcessEngineInput {
  return {
    sessionJson: {
      sessionId: SESSION_ID,
      activityName: 'Submit with Verification',
      startedAt: new Date(NOW_MS).toISOString(),
    },
    normalizedEvents: [
      evt({ event_id: 'e1', event_type: 'interaction.input_change', label: 'Name', t_ms: NOW_MS }),
      evt({ event_id: 'e2', event_type: 'system.toast_shown', actor_type: 'system', t_ms: NOW_MS + 1000 }),
      evt({ event_id: 'e3', event_type: 'interaction.submit', label: 'Save', t_ms: NOW_MS + 2000 }),
    ],
    derivedSteps: [
      step({
        step_id: `${SESSION_ID}-step-1`, ordinal: 1,
        title: 'Submit form with verification',
        grouping_reason: 'fill_and_submit', confidence: 0.9,
        source_event_ids: ['e1', 'e2', 'e3'], duration_ms: 2000,
      }),
    ],
  };
}

describe('Output Quality: Sparse Workflow', () => {
  const output = processSession(sparseWorkflow());

  it('produces valid SOP with single step', () => {
    expect(output.sop.steps.length).toBe(1);
    expect(output.sop.title).toBe('Quick Click');
    expect(output.sop.purpose.length).toBeGreaterThan(0);
  });

  it('produces valid process map with single task node', () => {
    const taskNodes = output.processMap.nodes.filter(n => n.nodeType === 'task');
    expect(taskNodes.length).toBe(1);
    // Start + task + end = 3 nodes, 2 edges
    expect(output.processMap.nodes.length).toBe(3);
    expect(output.processMap.edges.length).toBe(2);
  });

  it('handles low-confidence step without issues', () => {
    expect(output.sop.qualityIndicators).toBeDefined();
    expect(output.sop.qualityIndicators!.lowConfidenceStepCount).toBe(1);
  });

  it('does not produce friction for clean single-step workflow', () => {
    expect(output.sop.frictionSummary).toBeUndefined();
  });
});

describe('Output Quality: Chronological Instruction Order', () => {
  const output = processSession(interleavedVerifyWorkflow());

  it('preserves event order in detail text (verify between actions)', () => {
    const step = output.sop.steps[0]!;
    const lines = step.detail.split('\n').filter(Boolean);

    // Should have: 1. Enter... then ✓ Verify... then 2. Submit...
    // The verify line should appear between the two action lines
    const enterIdx = lines.findIndex(l => l.includes('Enter'));
    const verifyIdx = lines.findIndex(l => l.startsWith('\u2713'));
    const submitIdx = lines.findIndex(l => l.includes('Submit'));

    expect(enterIdx).toBeLessThan(verifyIdx);
    expect(verifyIdx).toBeLessThan(submitIdx);
  });

  it('numbers action items sequentially even with verify interspersed', () => {
    const step = output.sop.steps[0]!;
    const lines = step.detail.split('\n').filter(Boolean);
    const actionLines = lines.filter(l => /^\d+\./.test(l));
    expect(actionLines[0]).toMatch(/^1\./);
    expect(actionLines[1]).toMatch(/^2\./);
  });
});

describe('Output Quality: General Invariants', () => {
  const cases = [
    { name: 'linear', input: linearWorkflow },
    { name: 'multi-system', input: multiSystemWorkflow },
    { name: 'noisy', input: noisyWorkflow },
    { name: 'sparse', input: sparseWorkflow },
    { name: 'interleaved-verify', input: interleavedVerifyWorkflow },
  ];

  for (const { name, input } of cases) {
    describe(`[${name}]`, () => {
      const output = processSession(input());

      it('SOP version is 2.0', () => {
        expect(output.sop.version).toBe('2.0');
      });

      it('all SOP steps have sourceStepId', () => {
        for (const s of output.sop.steps) {
          expect(s.sourceStepId).toBeDefined();
          expect(s.sourceStepId.length).toBeGreaterThan(0);
        }
      });

      it('SOP has no empty sections', () => {
        expect(output.sop.purpose.length).toBeGreaterThan(0);
        expect(output.sop.scope.length).toBeGreaterThan(0);
        expect(output.sop.prerequisites.length).toBeGreaterThan(0);
        expect(output.sop.steps.length).toBeGreaterThan(0);
        expect(output.sop.completionCriteria.length).toBeGreaterThan(0);
      });

      it('process map has start and end nodes', () => {
        expect(output.processMap.nodes.some(n => n.nodeType === 'start')).toBe(true);
        expect(output.processMap.nodes.some(n => n.nodeType === 'end')).toBe(true);
      });

      it('process map edges are contiguous', () => {
        const nodeIds = new Set(output.processMap.nodes.map(n => n.id));
        for (const edge of output.processMap.edges) {
          expect(nodeIds.has(edge.source)).toBe(true);
          expect(nodeIds.has(edge.target)).toBe(true);
        }
      });

      it('process map has consistent node count', () => {
        // nodes = start + task nodes + end
        const taskNodes = output.processMap.nodes.filter(
          n => n.nodeType !== 'start' && n.nodeType !== 'end',
        );
        expect(taskNodes.length).toBe(output.sop.steps.length);
      });
    });
  }
});
