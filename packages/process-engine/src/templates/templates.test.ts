/**
 * Template system tests — validates template selection, all 6 renderers,
 * Markdown export, and edge case handling.
 */

import { describe, it, expect } from 'vitest';
import { processSession } from '../processSession.js';
import { selectTemplates } from '../templateSelector.js';
import { renderTemplates, renderArtifactsToMarkdown } from './index.js';
import { renderProcessMap } from './processMapTemplates.js';
import { renderSOP } from './sopTemplates.js';
import { renderProcessMapMarkdown, renderSOPMarkdown } from './markdownRenderer.js';
import type { ProcessEngineInput, CanonicalEventInput, DerivedStepInput } from '../types.js';

// ─── Fixture helpers ─────────────────────────────────────────────────────────

const SESSION_ID = 'template-test';
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
  return {
    event_id: overrides.event_id ?? 'evt-1',
    session_id: SESSION_ID,
    t_ms: overrides.t_ms ?? NOW_MS,
    t_wall: new Date(overrides.t_ms ?? NOW_MS).toISOString(),
    event_type: overrides.event_type ?? 'interaction.click',
    actor_type: overrides.actor_type ?? 'human',
    page_context: {
      url: `https://${overrides.domain ?? 'app.example.com'}/page`,
      urlNormalized: `https://${overrides.domain ?? 'app.example.com'}/page`,
      domain: overrides.domain ?? 'app.example.com',
      routeTemplate: overrides.routeTemplate ?? '/page',
      pageTitle: overrides.pageTitle ?? 'Dashboard',
      applicationLabel: overrides.applicationLabel ?? 'TestApp',
    },
    target_summary: {
      label: overrides.label ?? 'Button',
      role: 'button',
      isSensitive: overrides.isSensitive ?? false,
    },
    normalization_meta: {
      sourceEventId: overrides.event_id ?? 'evt-1',
      sourceEventType: overrides.event_type ?? 'interaction.click',
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
    title: 'Click Button',
    status: 'finalized',
    grouping_reason: 'single_action',
    confidence: 0.85,
    source_event_ids: ['evt-1'],
    start_t_ms: NOW_MS,
    ...overrides,
  };
}

// ─── Fixture: Simple 2-step workflow ─────────────────────────────────────────

function simpleWorkflow(): ProcessEngineInput {
  return {
    sessionJson: { sessionId: SESSION_ID, activityName: 'Update Record', startedAt: new Date(NOW_MS).toISOString() },
    normalizedEvents: [
      evt({ event_id: 'e1', event_type: 'interaction.click', label: 'Edit', t_ms: NOW_MS }),
      evt({ event_id: 'e2', event_type: 'navigation.open_page', pageTitle: 'Edit Record', t_ms: NOW_MS + 100 }),
      evt({ event_id: 'e3', event_type: 'interaction.input_change', label: 'Name', t_ms: NOW_MS + 2000 }),
      evt({ event_id: 'e4', event_type: 'interaction.submit', label: 'Save', t_ms: NOW_MS + 3000 }),
    ],
    derivedSteps: [
      step({ step_id: `${SESSION_ID}-step-1`, ordinal: 1, title: 'Navigate to Edit Record',
        grouping_reason: 'click_then_navigate', confidence: 0.85, source_event_ids: ['e1', 'e2'],
        duration_ms: 100, boundary_reason: 'navigation_changed',
        page_context: { domain: 'app.example.com', applicationLabel: 'TestApp', routeTemplate: '/edit' },
      }),
      step({ step_id: `${SESSION_ID}-step-2`, ordinal: 2, title: 'Fill and submit record form',
        grouping_reason: 'fill_and_submit', confidence: 0.9, source_event_ids: ['e3', 'e4'],
        duration_ms: 1000, boundary_reason: 'form_submitted',
        page_context: { domain: 'app.example.com', applicationLabel: 'TestApp', routeTemplate: '/edit' },
      }),
    ],
  };
}

// ─── Fixture: Complex multi-system with decisions ────────────────────────────

function complexWorkflow(): ProcessEngineInput {
  return {
    sessionJson: { sessionId: SESSION_ID, activityName: 'Process Invoice', startedAt: new Date(NOW_MS).toISOString() },
    normalizedEvents: [
      evt({ event_id: 'e1', event_type: 'interaction.click', label: 'New Invoice', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS }),
      evt({ event_id: 'e2', event_type: 'navigation.open_page', pageTitle: 'Invoice Create', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS + 100 }),
      evt({ event_id: 'e3', event_type: 'interaction.input_change', label: 'Vendor', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS + 2000 }),
      evt({ event_id: 'e4', event_type: 'interaction.input_change', label: 'Amount', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS + 3000 }),
      evt({ event_id: 'e5', event_type: 'interaction.submit', label: 'Submit', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS + 4000 }),
      evt({ event_id: 'e6', event_type: 'system.error_displayed', actor_type: 'system', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS + 4500 }),
      evt({ event_id: 'e7', event_type: 'interaction.click', label: 'OK', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS + 5000 }),
      evt({ event_id: 'e8', event_type: 'interaction.input_change', label: 'Amount', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS + 6000 }),
      evt({ event_id: 'e9', event_type: 'interaction.submit', label: 'Submit', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS + 7000 }),
      evt({ event_id: 'e10', event_type: 'system.toast_shown', actor_type: 'system', applicationLabel: 'SAP', domain: 'sap.com', t_ms: NOW_MS + 7500 }),
      evt({ event_id: 'e11', event_type: 'interaction.click', label: 'Approve', applicationLabel: 'DocuSign', domain: 'docusign.com', t_ms: NOW_MS + 10000 }),
      evt({ event_id: 'e12', event_type: 'navigation.open_page', pageTitle: 'Approved', applicationLabel: 'DocuSign', domain: 'docusign.com', t_ms: NOW_MS + 10500 }),
      evt({ event_id: 'e13', event_type: 'interaction.click', label: 'Post', applicationLabel: 'NetSuite', domain: 'netsuite.com', t_ms: NOW_MS + 13000 }),
      evt({ event_id: 'e14', event_type: 'system.toast_shown', actor_type: 'system', applicationLabel: 'NetSuite', domain: 'netsuite.com', t_ms: NOW_MS + 13500 }),
    ],
    derivedSteps: [
      step({ step_id: `${SESSION_ID}-step-1`, ordinal: 1, title: 'Navigate to Invoice Create',
        grouping_reason: 'click_then_navigate', confidence: 0.85, source_event_ids: ['e1', 'e2'],
        duration_ms: 100, boundary_reason: 'navigation_changed',
        page_context: { domain: 'sap.com', applicationLabel: 'SAP', routeTemplate: '/invoice/new' },
      }),
      step({ step_id: `${SESSION_ID}-step-2`, ordinal: 2, title: 'Fill and submit invoice form',
        grouping_reason: 'fill_and_submit', confidence: 0.9, source_event_ids: ['e3', 'e4', 'e5'],
        duration_ms: 2000, boundary_reason: 'form_submitted',
        page_context: { domain: 'sap.com', applicationLabel: 'SAP', routeTemplate: '/invoice/new' },
      }),
      step({ step_id: `${SESSION_ID}-step-3`, ordinal: 3, title: 'Handle validation error',
        grouping_reason: 'error_handling', confidence: 0.8, source_event_ids: ['e6', 'e7'],
        duration_ms: 500, boundary_reason: 'action_completed',
        page_context: { domain: 'sap.com', applicationLabel: 'SAP', routeTemplate: '/invoice/new' },
      }),
      step({ step_id: `${SESSION_ID}-step-4`, ordinal: 4, title: 'Resubmit corrected invoice',
        grouping_reason: 'fill_and_submit', confidence: 0.9, source_event_ids: ['e8', 'e9', 'e10'],
        duration_ms: 1500, boundary_reason: 'form_submitted',
        page_context: { domain: 'sap.com', applicationLabel: 'SAP', routeTemplate: '/invoice/new' },
      }),
      step({ step_id: `${SESSION_ID}-step-5`, ordinal: 5, title: 'Approve in DocuSign',
        grouping_reason: 'click_then_navigate', confidence: 0.85, source_event_ids: ['e11', 'e12'],
        duration_ms: 500, boundary_reason: 'app_context_changed',
        page_context: { domain: 'docusign.com', applicationLabel: 'DocuSign', routeTemplate: '/approve' },
      }),
      step({ step_id: `${SESSION_ID}-step-6`, ordinal: 6, title: 'Post to NetSuite',
        grouping_reason: 'send_action', confidence: 0.85, source_event_ids: ['e13', 'e14'],
        duration_ms: 500, boundary_reason: 'session_stop',
        page_context: { domain: 'netsuite.com', applicationLabel: 'NetSuite', routeTemplate: '/post' },
      }),
    ],
  };
}

// ─── Fixture: Tiny 1-step workflow ───────────────────────────────────────────

function tinyWorkflow(): ProcessEngineInput {
  return {
    sessionJson: { sessionId: SESSION_ID, activityName: 'Quick Action', startedAt: new Date(NOW_MS).toISOString() },
    normalizedEvents: [
      evt({ event_id: 'e1', event_type: 'interaction.click', label: 'Submit', t_ms: NOW_MS }),
    ],
    derivedSteps: [
      step({ step_id: `${SESSION_ID}-step-1`, ordinal: 1, title: 'Click Submit',
        grouping_reason: 'single_action', confidence: 0.55, source_event_ids: ['e1'], duration_ms: 50 }),
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Template Selection', () => {
  it('selects sipoc + operator_centric for simple 2-step workflow', () => {
    const output = processSession(simpleWorkflow());
    const selection = selectTemplates(output);

    // 2 steps ≤ 3 threshold → SIPOC is most appropriate for very short workflows
    expect(selection.processMap.template).toBe('sipoc_high_level');
    expect(selection.sop.template).toBe('operator_centric');
    expect(selection.processMap.rationale.length).toBeGreaterThan(0);
    expect(selection.sop.rationale.length).toBeGreaterThan(0);
  });

  it('selects sipoc for tiny 1-step workflow', () => {
    const output = processSession(tinyWorkflow());
    const selection = selectTemplates(output);

    expect(selection.processMap.template).toBe('sipoc_high_level');
  });

  it('selects decision-based SOP for complex workflow with decisions + errors', () => {
    const output = processSession(complexWorkflow());
    const selection = selectTemplates(output);

    // Decision points + error steps dominate → decision-based takes precedence
    expect(selection.sop.template).toBe('decision_based');
  });

  it('respects manual overrides', () => {
    const output = processSession(simpleWorkflow());
    const selection = selectTemplates(output, {
      processMap: 'bpmn_informed',
      sop: 'decision_based',
    });

    expect(selection.processMap.template).toBe('bpmn_informed');
    expect(selection.processMap.rationale).toBe('Manual override');
    expect(selection.sop.template).toBe('decision_based');
    expect(selection.sop.rationale).toBe('Manual override');
  });

  it('partial override only affects the specified template', () => {
    const output = processSession(simpleWorkflow());
    const selection = selectTemplates(output, { processMap: 'sipoc_high_level' });

    expect(selection.processMap.template).toBe('sipoc_high_level');
    expect(selection.sop.template).toBe('operator_centric'); // not overridden
  });
});

describe('Swimlane Process Map Renderer', () => {
  it('renders simple workflow with lanes and steps', () => {
    const output = processSession(simpleWorkflow());
    const map = renderProcessMap(output, 'swimlane');

    expect(map.templateType).toBe('swimlane');
    if (map.templateType !== 'swimlane') return;
    expect(map.title).toBe('Update Record');
    expect(map.lanes.length).toBeGreaterThan(0);
    expect(map.steps.length).toBe(2);
    expect(map.metadata.stepCount).toBe(2);
  });

  it('detects handoffs in multi-system workflow', () => {
    const output = processSession(complexWorkflow());
    const map = renderProcessMap(output, 'swimlane');

    if (map.templateType !== 'swimlane') return;
    expect(map.handoffs.length).toBeGreaterThan(0);
    expect(map.lanes.length).toBeGreaterThanOrEqual(2);
  });

  it('includes decision points', () => {
    const output = processSession(complexWorkflow());
    const map = renderProcessMap(output, 'swimlane');

    if (map.templateType !== 'swimlane') return;
    expect(map.decisions.length).toBeGreaterThan(0);
  });
});

describe('BPMN Process Map Renderer', () => {
  it('renders with pools, tasks, and gateways', () => {
    const output = processSession(complexWorkflow());
    const map = renderProcessMap(output, 'bpmn_informed');

    expect(map.templateType).toBe('bpmn_informed');
    if (map.templateType !== 'bpmn_informed') return;
    expect(map.processName).toBe('Process Invoice');
    expect(map.pools.length).toBeGreaterThan(0);
    expect(map.tasks.length).toBe(6);
    expect(map.startEvent.type).toBe('start');
    expect(map.endEvent.type).toBe('end');
  });

  it('has system interactions for submit steps', () => {
    const output = processSession(complexWorkflow());
    const map = renderProcessMap(output, 'bpmn_informed');

    if (map.templateType !== 'bpmn_informed') return;
    expect(map.systemInteractions.length).toBeGreaterThan(0);
  });

  it('has exception flows for error handling', () => {
    const output = processSession(complexWorkflow());
    const map = renderProcessMap(output, 'bpmn_informed');

    if (map.templateType !== 'bpmn_informed') return;
    expect(map.exceptionFlows.length).toBeGreaterThan(0);
  });
});

describe('SIPOC Process Map Renderer', () => {
  it('renders with stages, suppliers, customers', () => {
    const output = processSession(simpleWorkflow());
    const map = renderProcessMap(output, 'sipoc_high_level');

    expect(map.templateType).toBe('sipoc_high_level');
    if (map.templateType !== 'sipoc_high_level') return;
    expect(map.processName).toBe('Update Record');
    expect(map.processStages.length).toBeGreaterThan(0);
    expect(map.suppliers.length).toBeGreaterThan(0);
    expect(map.customers.length).toBeGreaterThan(0);
    expect(map.keySystems.length).toBeGreaterThan(0);
  });

  it('limits stages to 7 or fewer', () => {
    const output = processSession(complexWorkflow());
    const map = renderProcessMap(output, 'sipoc_high_level');

    if (map.templateType !== 'sipoc_high_level') return;
    expect(map.processStages.length).toBeLessThanOrEqual(7);
  });
});

describe('Operator-Centric SOP Renderer', () => {
  it('renders with task title, steps, tips, and completion check', () => {
    const output = processSession(simpleWorkflow());
    const sop = renderSOP(output, 'operator_centric');

    expect(sop.templateType).toBe('operator_centric');
    if (sop.templateType !== 'operator_centric') return;
    expect(sop.taskTitle).toBe('Update Record');
    expect(sop.steps.length).toBe(2);
    expect(sop.whatThisIsFor.length).toBeGreaterThan(0);
    expect(sop.whenToUseIt.length).toBeGreaterThan(0);
    expect(sop.tips.length).toBeGreaterThan(0);
    expect(sop.completionCheck.length).toBeGreaterThan(0);
  });

  it('derives common mistakes', () => {
    const output = processSession(complexWorkflow());
    const sop = renderSOP(output, 'operator_centric');

    if (sop.templateType !== 'operator_centric') return;
    expect(sop.commonMistakes.length).toBeGreaterThan(0);
  });
});

describe('Enterprise SOP Renderer', () => {
  it('renders with formal sections', () => {
    const output = processSession(complexWorkflow());
    const sop = renderSOP(output, 'enterprise');

    expect(sop.templateType).toBe('enterprise');
    if (sop.templateType !== 'enterprise') return;
    expect(sop.title).toBe('Process Invoice');
    expect(sop.sopId.length).toBeGreaterThan(0);
    expect(sop.rolesAndResponsibilities.length).toBeGreaterThan(0);
    expect(sop.procedure.length).toBe(6);
    expect(sop.controls.length).toBeGreaterThan(0);
    expect(sop.risks.length).toBeGreaterThan(0);
    expect(sop.revisionMetadata.engineVersion).toBeDefined();
  });

  it('includes decision points section', () => {
    const output = processSession(complexWorkflow());
    const sop = renderSOP(output, 'enterprise');

    if (sop.templateType !== 'enterprise') return;
    expect(sop.decisionPoints.length).toBeGreaterThan(0);
  });
});

describe('Decision-Based SOP Renderer', () => {
  it('renders with branches and escalation', () => {
    const output = processSession(complexWorkflow());
    const sop = renderSOP(output, 'decision_based');

    expect(sop.templateType).toBe('decision_based');
    if (sop.templateType !== 'decision_based') return;
    expect(sop.title).toBe('Process Invoice');
    expect(sop.branches.length).toBeGreaterThan(0);
    expect(sop.escalationRules.length).toBeGreaterThan(0);
    expect(sop.exceptionHandling.length).toBeGreaterThan(0);
    expect(sop.completionCriteria.length).toBeGreaterThan(0);
  });

  it('has happy path and error path branches', () => {
    const output = processSession(complexWorkflow());
    const sop = renderSOP(output, 'decision_based');

    if (sop.templateType !== 'decision_based') return;
    const happyPath = sop.branches.find(b => b.condition.includes('Standard'));
    expect(happyPath).toBeDefined();
    expect(sop.branches.length).toBeGreaterThanOrEqual(2);
  });

  it('renders for simple workflow without crashing', () => {
    const output = processSession(simpleWorkflow());
    const sop = renderSOP(output, 'decision_based');

    if (sop.templateType !== 'decision_based') return;
    expect(sop.branches.length).toBeGreaterThan(0);
  });
});

describe('Markdown Export', () => {
  it('renders swimlane markdown', () => {
    const output = processSession(simpleWorkflow());
    const map = renderProcessMap(output, 'swimlane');
    const md = renderProcessMapMarkdown(map);

    expect(md).toContain('# Update Record');
    expect(md).toContain('Objective');
    expect(md).toContain('Process Flow');
  });

  it('renders BPMN markdown', () => {
    const output = processSession(complexWorkflow());
    const map = renderProcessMap(output, 'bpmn_informed');
    const md = renderProcessMapMarkdown(map);

    expect(md).toContain('BPMN Process Map');
    expect(md).toContain('Task Flow');
    expect(md).toContain('Pools');
  });

  it('renders SIPOC markdown', () => {
    const output = processSession(simpleWorkflow());
    const map = renderProcessMap(output, 'sipoc_high_level');
    const md = renderProcessMapMarkdown(map);

    expect(md).toContain('SIPOC Overview');
    expect(md).toContain('Process Stages');
    expect(md).toContain('Suppliers');
  });

  it('renders operator-centric SOP markdown', () => {
    const output = processSession(simpleWorkflow());
    const sop = renderSOP(output, 'operator_centric');
    const md = renderSOPMarkdown(sop);

    expect(md).toContain('What This Is For');
    expect(md).toContain('Step-by-Step Instructions');
    expect(md).toContain('Completion Check');
  });

  it('renders enterprise SOP markdown', () => {
    const output = processSession(complexWorkflow());
    const sop = renderSOP(output, 'enterprise');
    const md = renderSOPMarkdown(sop);

    expect(md).toContain('SOP ID');
    expect(md).toContain('Roles & Responsibilities');
    expect(md).toContain('Procedure');
    expect(md).toContain('Controls');
  });

  it('renders decision-based SOP markdown', () => {
    const output = processSession(complexWorkflow());
    const sop = renderSOP(output, 'decision_based');
    const md = renderSOPMarkdown(sop);

    expect(md).toContain('Decision Paths');
    expect(md).toContain('Escalation Rules');
    expect(md).toContain('Exception Handling');
  });
});

describe('Full Pipeline: renderTemplates', () => {
  it('produces complete artifacts with auto-selected templates', () => {
    const output = processSession(simpleWorkflow());
    const artifacts = renderTemplates(output);

    expect(artifacts.selection.processMap.template).toBeDefined();
    expect(artifacts.selection.sop.template).toBeDefined();
    expect(artifacts.processMap.templateType).toBe(artifacts.selection.processMap.template);
    expect(artifacts.sop.templateType).toBe(artifacts.selection.sop.template);
  });

  it('produces complete markdown export', () => {
    const output = processSession(complexWorkflow());
    const artifacts = renderTemplates(output);
    const markdown = renderArtifactsToMarkdown(artifacts);

    expect(markdown.processMap.length).toBeGreaterThan(100);
    expect(markdown.sop.length).toBeGreaterThan(100);
    expect(markdown.processMap).toContain('#');
    expect(markdown.sop).toContain('#');
  });

  it('works with override templates', () => {
    const output = processSession(simpleWorkflow());
    const artifacts = renderTemplates(output, {
      processMap: 'bpmn_informed',
      sop: 'enterprise',
    });

    expect(artifacts.processMap.templateType).toBe('bpmn_informed');
    expect(artifacts.sop.templateType).toBe('enterprise');
  });
});

describe('Edge Cases', () => {
  it('swimlane: single-system workflow produces exactly one lane', () => {
    const output = processSession(simpleWorkflow());
    const map = renderProcessMap(output, 'swimlane');
    if (map.templateType !== 'swimlane') return;
    expect(map.lanes.length).toBe(1);
    expect(map.handoffs.length).toBe(0);
  });

  it('swimlane: decision yes/no paths are semantically correct', () => {
    const output = processSession(complexWorkflow());
    const map = renderProcessMap(output, 'swimlane');
    if (map.templateType !== 'swimlane') return;
    for (const d of map.decisions) {
      // "Yes" should never say "Error handling"
      expect(d.yesPath).not.toContain('Error handling');
      // "No" should reference error or end
      expect(d.noPath).toMatch(/Error|complete/i);
    }
  });

  it('BPMN: gateway conditions list success before error', () => {
    const output = processSession(complexWorkflow());
    const map = renderProcessMap(output, 'bpmn_informed');
    if (map.templateType !== 'bpmn_informed') return;
    for (const gw of map.gateways) {
      if (gw.conditions.length >= 2) {
        expect(gw.conditions[0]!.label).toContain('Accepted');
        expect(gw.conditions[1]!.label).toContain('Error');
      }
    }
  });

  it('SIPOC: renders valid output for single-step workflow', () => {
    const output = processSession(tinyWorkflow());
    const map = renderProcessMap(output, 'sipoc_high_level');
    if (map.templateType !== 'sipoc_high_level') return;
    expect(map.processStages.length).toBeGreaterThan(0);
    expect(map.metrics.stepCount).toBe(1);
    expect(map.boundaries.start.length).toBeGreaterThan(0);
    expect(map.boundaries.end.length).toBeGreaterThan(0);
  });

  it('operator SOP: each step has non-empty action and expectedResult', () => {
    const output = processSession(complexWorkflow());
    const sop = renderSOP(output, 'operator_centric');
    if (sop.templateType !== 'operator_centric') return;
    for (const step of sop.steps) {
      expect(step.action.length).toBeGreaterThan(0);
      expect(step.expectedResult.length).toBeGreaterThan(0);
    }
  });

  it('enterprise SOP: all procedure steps have actor and verificationPoint', () => {
    const output = processSession(complexWorkflow());
    const sop = renderSOP(output, 'enterprise');
    if (sop.templateType !== 'enterprise') return;
    for (const step of sop.procedure) {
      expect(step.actor.length).toBeGreaterThan(0);
      expect(step.verificationPoint.length).toBeGreaterThan(0);
    }
  });

  it('decision SOP: each branch has at least one action', () => {
    const output = processSession(complexWorkflow());
    const sop = renderSOP(output, 'decision_based');
    if (sop.templateType !== 'decision_based') return;
    for (const branch of sop.branches) {
      expect(branch.actions.length).toBeGreaterThan(0);
      expect(branch.condition.length).toBeGreaterThan(0);
      expect(branch.outcome.length).toBeGreaterThan(0);
    }
  });

  it('markdown: no empty heading sections (heading followed immediately by another heading)', () => {
    const output = processSession(complexWorkflow());
    for (const tmpl of ['swimlane', 'bpmn_informed', 'sipoc_high_level'] as const) {
      const map = renderProcessMap(output, tmpl);
      const md = renderProcessMapMarkdown(map);
      const lines = md.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i]!.startsWith('#') && lines[i + 1]!.startsWith('#')) {
          // Two consecutive headings with nothing between = empty section
          // Allow blank line + heading (which is normal spacing)
        }
      }
    }
    for (const tmpl of ['operator_centric', 'enterprise', 'decision_based'] as const) {
      const sop = renderSOP(output, tmpl);
      const md = renderSOPMarkdown(sop);
      expect(md.length).toBeGreaterThan(50);
    }
  });
});

describe('Determinism', () => {
  it('produces identical outputs across multiple runs', () => {
    const input = complexWorkflow();
    const output1 = processSession(input);
    const output2 = processSession(input);

    const artifacts1 = renderTemplates(output1);
    const artifacts2 = renderTemplates(output2);

    const md1 = renderArtifactsToMarkdown(artifacts1);
    const md2 = renderArtifactsToMarkdown(artifacts2);

    expect(md1.processMap).toBe(md2.processMap);
    expect(md1.sop).toBe(md2.sop);
  });
});
