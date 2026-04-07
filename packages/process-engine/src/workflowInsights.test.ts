import { describe, it, expect } from 'vitest';
import { processSession } from './processSession.js';
import { analyzeWorkflowInsights } from './workflowInsights.js';
import type { ProcessEngineInput, CanonicalEventInput, DerivedStepInput } from './types.js';

const SESSION_ID = 'insight-test';
const NOW = 1_700_000_000_000;

function evt(overrides: Partial<{
  event_id: string; event_type: string; actor_type: 'human' | 'system'; t_ms: number;
  label: string; app: string; domain: string; page: string; route: string;
}>): CanonicalEventInput {
  return {
    event_id: overrides.event_id ?? 'e1', session_id: SESSION_ID,
    t_ms: overrides.t_ms ?? NOW, t_wall: new Date(overrides.t_ms ?? NOW).toISOString(),
    event_type: overrides.event_type ?? 'interaction.click',
    actor_type: overrides.actor_type ?? 'human',
    page_context: {
      url: `https://${overrides.domain ?? 'app.com'}/${overrides.route ?? 'page'}`,
      urlNormalized: `https://${overrides.domain ?? 'app.com'}/${overrides.route ?? 'page'}`,
      domain: overrides.domain ?? 'app.com', routeTemplate: overrides.route ?? '/page',
      pageTitle: overrides.page ?? 'Page', applicationLabel: overrides.app ?? 'App',
    },
    target_summary: { label: overrides.label ?? 'Button', role: 'button', isSensitive: false },
    normalization_meta: {
      sourceEventId: overrides.event_id ?? 'e1', sourceEventType: overrides.event_type ?? 'interaction.click',
      normalizationRuleVersion: '1.0.0', redactionApplied: false,
    },
  };
}

function step(overrides: Partial<DerivedStepInput>): DerivedStepInput {
  return {
    step_id: `${SESSION_ID}-step-1`, session_id: SESSION_ID, ordinal: 1,
    title: 'Click Button', status: 'finalized', grouping_reason: 'single_action',
    confidence: 0.85, source_event_ids: ['e1'], start_t_ms: NOW, ...overrides,
  };
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

function cleanWorkflow(): ProcessEngineInput {
  return {
    sessionJson: { sessionId: SESSION_ID, activityName: 'Clean Task', startedAt: new Date(NOW).toISOString() },
    normalizedEvents: [
      evt({ event_id: 'e1', event_type: 'interaction.click', t_ms: NOW }),
      evt({ event_id: 'e2', event_type: 'navigation.open_page', t_ms: NOW + 500 }),
      evt({ event_id: 'e3', event_type: 'interaction.submit', label: 'Save', t_ms: NOW + 5000 }),
    ],
    derivedSteps: [
      step({ step_id: `${SESSION_ID}-step-1`, ordinal: 1, title: 'Navigate to page',
        grouping_reason: 'click_then_navigate', source_event_ids: ['e1', 'e2'],
        duration_ms: 500, page_context: { domain: 'app.com', applicationLabel: 'App', routeTemplate: '/page' } }),
      step({ step_id: `${SESSION_ID}-step-2`, ordinal: 2, title: 'Submit form',
        grouping_reason: 'fill_and_submit', source_event_ids: ['e3'],
        duration_ms: 4500, page_context: { domain: 'app.com', applicationLabel: 'App', routeTemplate: '/page' } }),
    ],
  };
}

function reworkWorkflow(): ProcessEngineInput {
  return {
    sessionJson: { sessionId: SESSION_ID, activityName: 'Rework Task', startedAt: new Date(NOW).toISOString() },
    normalizedEvents: [
      evt({ event_id: 'e1', event_type: 'interaction.input_change', label: 'Name', t_ms: NOW }),
      evt({ event_id: 'e2', event_type: 'interaction.submit', label: 'Save', t_ms: NOW + 3000 }),
      evt({ event_id: 'e3', event_type: 'system.error_displayed', actor_type: 'system', t_ms: NOW + 3500 }),
      evt({ event_id: 'e4', event_type: 'interaction.click', label: 'OK', t_ms: NOW + 4000 }),
      evt({ event_id: 'e5', event_type: 'interaction.input_change', label: 'Name', t_ms: NOW + 5000 }),
      evt({ event_id: 'e6', event_type: 'interaction.submit', label: 'Save', t_ms: NOW + 8000 }),
      evt({ event_id: 'e7', event_type: 'system.error_displayed', actor_type: 'system', t_ms: NOW + 8500 }),
      evt({ event_id: 'e8', event_type: 'interaction.click', label: 'OK', t_ms: NOW + 9000 }),
      evt({ event_id: 'e9', event_type: 'interaction.submit', label: 'Save', t_ms: NOW + 12000 }),
      evt({ event_id: 'e10', event_type: 'system.toast_shown', actor_type: 'system', t_ms: NOW + 12500 }),
    ],
    derivedSteps: [
      step({ step_id: `${SESSION_ID}-step-1`, ordinal: 1, title: 'Fill form',
        grouping_reason: 'fill_and_submit', source_event_ids: ['e1', 'e2'],
        duration_ms: 3000, page_context: { domain: 'app.com', applicationLabel: 'App', routeTemplate: '/form' } }),
      step({ step_id: `${SESSION_ID}-step-2`, ordinal: 2, title: 'Handle error',
        grouping_reason: 'error_handling', source_event_ids: ['e3', 'e4'],
        duration_ms: 500, page_context: { domain: 'app.com', applicationLabel: 'App', routeTemplate: '/form' } }),
      step({ step_id: `${SESSION_ID}-step-3`, ordinal: 3, title: 'Resubmit form',
        grouping_reason: 'fill_and_submit', source_event_ids: ['e5', 'e6'],
        duration_ms: 3000, page_context: { domain: 'app.com', applicationLabel: 'App', routeTemplate: '/form' } }),
      step({ step_id: `${SESSION_ID}-step-4`, ordinal: 4, title: 'Handle error again',
        grouping_reason: 'error_handling', source_event_ids: ['e7', 'e8'],
        duration_ms: 500, page_context: { domain: 'app.com', applicationLabel: 'App', routeTemplate: '/form' } }),
      step({ step_id: `${SESSION_ID}-step-5`, ordinal: 5, title: 'Final submit',
        grouping_reason: 'fill_and_submit', source_event_ids: ['e9', 'e10'],
        duration_ms: 500, page_context: { domain: 'app.com', applicationLabel: 'App', routeTemplate: '/form' } }),
    ],
  };
}

function multiSystemWorkflow(): ProcessEngineInput {
  return {
    sessionJson: { sessionId: SESSION_ID, activityName: 'Multi-System', startedAt: new Date(NOW).toISOString() },
    normalizedEvents: [
      evt({ event_id: 'e1', event_type: 'interaction.input_change', label: 'Vendor', app: 'SAP', domain: 'sap.com', t_ms: NOW }),
      evt({ event_id: 'e2', event_type: 'interaction.submit', label: 'Submit', app: 'SAP', domain: 'sap.com', t_ms: NOW + 10000 }),
      evt({ event_id: 'e3', event_type: 'interaction.click', label: 'Approve', app: 'DocuSign', domain: 'docusign.com', t_ms: NOW + 20000 }),
      evt({ event_id: 'e4', event_type: 'navigation.open_page', page: 'Done', app: 'DocuSign', domain: 'docusign.com', t_ms: NOW + 21000 }),
      evt({ event_id: 'e5', event_type: 'interaction.click', label: 'Post', app: 'NetSuite', domain: 'netsuite.com', t_ms: NOW + 30000 }),
      evt({ event_id: 'e6', event_type: 'system.toast_shown', actor_type: 'system', app: 'NetSuite', domain: 'netsuite.com', t_ms: NOW + 31000 }),
    ],
    derivedSteps: [
      step({ step_id: `${SESSION_ID}-step-1`, ordinal: 1, title: 'Submit in SAP',
        grouping_reason: 'fill_and_submit', source_event_ids: ['e1', 'e2'],
        duration_ms: 10000, page_context: { domain: 'sap.com', applicationLabel: 'SAP', routeTemplate: '/form' } }),
      step({ step_id: `${SESSION_ID}-step-2`, ordinal: 2, title: 'Approve in DocuSign',
        grouping_reason: 'click_then_navigate', source_event_ids: ['e3', 'e4'],
        duration_ms: 1000, boundary_reason: 'app_context_changed',
        page_context: { domain: 'docusign.com', applicationLabel: 'DocuSign', routeTemplate: '/approve' } }),
      step({ step_id: `${SESSION_ID}-step-3`, ordinal: 3, title: 'Post to NetSuite',
        grouping_reason: 'send_action', source_event_ids: ['e5', 'e6'],
        duration_ms: 1000, boundary_reason: 'app_context_changed',
        page_context: { domain: 'netsuite.com', applicationLabel: 'NetSuite', routeTemplate: '/post' } }),
    ],
  };
}

function heavyDataEntryWorkflow(): ProcessEngineInput {
  const events: CanonicalEventInput[] = [];
  const steps: DerivedStepInput[] = [];
  let t = NOW;
  let eIdx = 1;

  for (let i = 1; i <= 5; i++) {
    const evtId = `e${eIdx++}`;
    events.push(evt({ event_id: evtId, event_type: 'interaction.input_change', label: `Field ${i}`, t_ms: t }));
    const evtId2 = `e${eIdx++}`;
    events.push(evt({ event_id: evtId2, event_type: 'interaction.submit', label: 'Save', t_ms: t + 5000 }));
    steps.push(step({
      step_id: `${SESSION_ID}-step-${i}`, ordinal: i, title: `Enter data set ${i}`,
      grouping_reason: i % 2 === 0 ? 'data_entry' : 'fill_and_submit',
      source_event_ids: [evtId, evtId2], duration_ms: 5000,
      page_context: { domain: 'app.com', applicationLabel: 'App', routeTemplate: `/form${i}` },
    }));
    t += 6000;
  }

  return {
    sessionJson: { sessionId: SESSION_ID, activityName: 'Data Entry Heavy', startedAt: new Date(NOW).toISOString() },
    normalizedEvents: events,
    derivedSteps: steps,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Workflow Insights: Clean Workflow', () => {
  const output = processSession(cleanWorkflow());
  const report = analyzeWorkflowInsights(output);

  it('produces valid report structure', () => {
    expect(report.hasInsights).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.insights).toBeDefined();
    expect(Array.isArray(report.insights)).toBe(true);
  });

  it('has few or no insights for clean workflow', () => {
    expect(report.summary.highSeverity).toBe(0);
  });

  it('generates time breakdown', () => {
    expect(report.timeBreakdown).not.toBeNull();
    if (report.timeBreakdown) {
      expect(report.timeBreakdown.totalDurationMs).toBeGreaterThan(0);
      expect(report.timeBreakdown.longestStepOrdinal).toBeDefined();
    }
  });
});

describe('Workflow Insights: Rework Detection', () => {
  const output = processSession(reworkWorkflow());
  const report = analyzeWorkflowInsights(output);

  it('detects multiple errors as rework', () => {
    const reworkInsights = report.insights.filter(i => i.category === 'rework');
    expect(reworkInsights.length).toBeGreaterThan(0);
  });

  it('detects form resubmission pattern', () => {
    const resubmit = report.insights.find(i => i.id.startsWith('resubmission_'));
    expect(resubmit).toBeDefined();
    if (resubmit) {
      expect(resubmit.confidence).toBe('high');
      expect(resubmit.suggestion.length).toBeGreaterThan(0);
    }
  });

  it('has evidence tied to specific steps', () => {
    for (const insight of report.insights) {
      expect(insight.stepOrdinals.length).toBeGreaterThan(0);
      expect(insight.evidence.length).toBeGreaterThan(0);
    }
  });
});

describe('Workflow Insights: Multi-System', () => {
  const output = processSession(multiSystemWorkflow());
  const report = analyzeWorkflowInsights(output);

  it('detects system efficiency issues for 3-system workflow', () => {
    // With 3 systems and 2 switches, context switching may or may not trigger
    // depending on threshold. But cross-system data transfer should be detected.
    const systemInsights = report.insights.filter(i => i.category === 'system_efficiency' || i.category === 'automation');
    expect(systemInsights.length).toBeGreaterThan(0);
  });

  it('detects cross-system data transfer', () => {
    const transfer = report.insights.find(i => i.id === 'cross_system_data_transfer');
    expect(transfer).toBeDefined();
    if (transfer) {
      expect(transfer.severity).toBe('high');
    }
  });
});

describe('Workflow Insights: Heavy Data Entry', () => {
  const output = processSession(heavyDataEntryWorkflow());
  const report = analyzeWorkflowInsights(output);

  it('detects heavy data entry', () => {
    const dataEntry = report.insights.find(i => i.id === 'heavy_data_entry');
    expect(dataEntry).toBeDefined();
    if (dataEntry) {
      expect(dataEntry.category).toBe('automation');
    }
  });
});

describe('Workflow Insights: General Invariants', () => {
  const fixtures = [
    { name: 'clean', fn: cleanWorkflow },
    { name: 'rework', fn: reworkWorkflow },
    { name: 'multi-system', fn: multiSystemWorkflow },
    { name: 'heavy-data-entry', fn: heavyDataEntryWorkflow },
  ];

  for (const { name, fn } of fixtures) {
    describe(`[${name}]`, () => {
      const output = processSession(fn());
      const report = analyzeWorkflowInsights(output);

      it('all insights have required fields', () => {
        for (const i of report.insights) {
          expect(i.id.length).toBeGreaterThan(0);
          expect(i.category.length).toBeGreaterThan(0);
          expect(i.title.length).toBeGreaterThan(0);
          expect(i.description.length).toBeGreaterThan(10);
          expect(i.evidence.length).toBeGreaterThan(0);
          expect(i.impact.length).toBeGreaterThan(0);
          expect(i.suggestion.length).toBeGreaterThan(0);
          expect(['high', 'medium', 'low']).toContain(i.confidence);
          expect(['high', 'medium', 'low']).toContain(i.severity);
          expect(i.stepOrdinals.length).toBeGreaterThan(0);
        }
      });

      it('summary counts match insights array', () => {
        expect(report.summary.totalInsights).toBe(report.insights.length);
        expect(report.summary.highSeverity).toBe(report.insights.filter(i => i.severity === 'high').length);
      });

      it('insights are sorted by severity (high first)', () => {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
        for (let i = 1; i < report.insights.length; i++) {
          expect(order[report.insights[i]!.severity]!).toBeGreaterThanOrEqual(
            order[report.insights[i - 1]!.severity]!,
          );
        }
      });

      it('no duplicate insight IDs', () => {
        const ids = report.insights.map(i => i.id);
        expect(new Set(ids).size).toBe(ids.length);
      });
    });
  }
});
