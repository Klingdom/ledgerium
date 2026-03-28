/**
 * Tests for the workflow report builder.
 */

import { describe, it, expect } from 'vitest';
import { buildWorkflowReport } from './workflow-report-builder.js';
import type { SessionBundle, CanonicalEvent, DerivedStep, SessionMeta, PolicyLogEntry, BundleManifest } from '../shared/types.js';

// ─── Factories ────────────────────────────────────────────────────────────────

const SESSION_ID = 'test-session';
const NOW = '2026-01-01T00:00:00Z';

function makeCanonicalEvent(overrides: Partial<CanonicalEvent> & { event_id: string }): CanonicalEvent {
  return {
    event_id: overrides.event_id,
    schema_version: '1.0.0',
    session_id: SESSION_ID,
    t_ms: 1000,
    t_wall: NOW,
    event_type: 'interaction.click',
    actor_type: 'human',
    normalization_meta: {
      sourceEventId: overrides.event_id,
      sourceEventType: 'click',
      normalizationRuleVersion: '1.0.0',
      redactionApplied: false,
    },
    ...overrides,
  } as CanonicalEvent;
}

function makeStep(overrides: Partial<DerivedStep> & { step_id: string; ordinal: number }): DerivedStep {
  return {
    session_id: SESSION_ID,
    title: `Step ${overrides.ordinal}`,
    status: 'finalized',
    grouping_reason: 'single_action',
    confidence: 0.75,
    source_event_ids: [],
    start_t_ms: 1000,
    end_t_ms: 2000,
    duration_ms: 1000,
    page_context: {
      domain: 'app.example.com',
      applicationLabel: 'App',
      routeTemplate: '/page',
    },
    ...overrides,
  } as DerivedStep;
}

function makeBundle(overrides?: {
  events?: CanonicalEvent[];
  steps?: DerivedStep[];
}): SessionBundle {
  const events = overrides?.events ?? [
    makeCanonicalEvent({ event_id: 'evt-1', event_type: 'interaction.click', t_ms: 1000 }),
    makeCanonicalEvent({ event_id: 'evt-2', event_type: 'navigation.open_page', t_ms: 2000, actor_type: 'system' }),
    makeCanonicalEvent({ event_id: 'evt-3', event_type: 'interaction.input_change', t_ms: 3000 }),
    makeCanonicalEvent({ event_id: 'evt-4', event_type: 'interaction.click', t_ms: 5000, target_summary: { label: 'Send', role: 'button', isSensitive: false } }),
  ];

  const steps = overrides?.steps ?? [
    makeStep({ step_id: `${SESSION_ID}-step-1`, ordinal: 1, title: 'Navigate to Inbox', grouping_reason: 'click_then_navigate', confidence: 0.85, source_event_ids: ['evt-1', 'evt-2'], start_t_ms: 1000, end_t_ms: 2000, duration_ms: 1000 }),
    makeStep({ step_id: `${SESSION_ID}-step-2`, ordinal: 2, title: 'Enter Subject', grouping_reason: 'data_entry', confidence: 0.80, source_event_ids: ['evt-3'], start_t_ms: 3000, end_t_ms: 3000, duration_ms: 0 }),
    makeStep({ step_id: `${SESSION_ID}-step-3`, ordinal: 3, title: 'Send', grouping_reason: 'send_action', confidence: 0.90, source_event_ids: ['evt-4'], start_t_ms: 5000, end_t_ms: 5000, duration_ms: 0 }),
  ];

  return {
    sessionJson: {
      sessionId: SESSION_ID,
      activityName: 'Send Email',
      startedAt: NOW,
      endedAt: '2026-01-01T00:00:06Z',
      state: 'review_ready',
      pauseIntervals: [],
      schemaVersion: '1.0.0',
      recorderVersion: '0.1.0',
    } as SessionMeta,
    normalizedEvents: events,
    derivedSteps: steps,
    policyLog: [] as PolicyLogEntry[],
    manifest: {
      sessionId: SESSION_ID,
      exportedAt: NOW,
      schemaVersion: '1.0.0',
      recorderVersion: '0.1.0',
      segmentationRuleVersion: '1.1.0',
      rendererVersion: '0.1.0',
      fileHashes: {},
    } as BundleManifest,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildWorkflowReport', () => {
  it('returns a complete report with all 6 sections', () => {
    const report = buildWorkflowReport(makeBundle());
    expect(report).toHaveProperty('header');
    expect(report).toHaveProperty('executiveSummary');
    expect(report).toHaveProperty('workflowOverview');
    expect(report).toHaveProperty('metrics');
    expect(report).toHaveProperty('sop');
    expect(report).toHaveProperty('appendix');
  });

  // ─── Header ─────────────────────────────────────────────────────────────

  describe('header', () => {
    it('contains session metadata', () => {
      const { header } = buildWorkflowReport(makeBundle());
      expect(header.sessionId).toBe(SESSION_ID);
      expect(header.activityName).toBe('Send Email');
      expect(header.startedAt).toBe(NOW);
    });

    it('includes version info', () => {
      const { header } = buildWorkflowReport(makeBundle());
      expect(header.schemaVersion).toBe('1.0.0');
      expect(header.recorderVersion).toBe('0.1.0');
      expect(header.segmentationRuleVersion).toBe('1.1.0');
    });
  });

  // ─── Metrics ────────────────────────────────────────────────────────────

  describe('metrics', () => {
    it('counts steps correctly', () => {
      const { metrics } = buildWorkflowReport(makeBundle());
      expect(metrics.stepCount).toBe(3);
    });

    it('counts phases by unique applicationLabels', () => {
      const { metrics } = buildWorkflowReport(makeBundle());
      expect(metrics.phaseCount).toBeGreaterThanOrEqual(1);
    });

    it('counts tools used', () => {
      const { metrics } = buildWorkflowReport(makeBundle());
      expect(metrics.toolCount).toBeGreaterThanOrEqual(1);
      expect(metrics.toolsUsed).toContain('App');
    });

    it('computes active and idle duration', () => {
      const { metrics } = buildWorkflowReport(makeBundle());
      expect(metrics.activeDurationMs).toBeGreaterThanOrEqual(0);
      expect(metrics.idleDurationMs).toBeGreaterThanOrEqual(0);
      expect(metrics.activeDurationMs + metrics.idleDurationMs).toBe(metrics.totalDurationMs);
    });

    it('counts event types correctly', () => {
      const { metrics } = buildWorkflowReport(makeBundle());
      expect(metrics.navigationCount).toBe(1);
      expect(metrics.clickCount).toBe(2);
      expect(metrics.inputCount).toBe(1);
    });

    it('counts send actions from steps', () => {
      const { metrics } = buildWorkflowReport(makeBundle());
      expect(metrics.sendActionCount).toBe(1);
    });

    it('counts low-confidence steps (< 0.7)', () => {
      const bundle = makeBundle({
        steps: [
          makeStep({ step_id: 's-1', ordinal: 1, confidence: 0.55 }),
          makeStep({ step_id: 's-2', ordinal: 2, confidence: 0.90 }),
        ],
      });
      const { metrics } = buildWorkflowReport(bundle);
      expect(metrics.lowConfidenceStepCount).toBe(1);
    });
  });

  // ─── Executive Summary ──────────────────────────────────────────────────

  describe('executiveSummary', () => {
    it('includes activity name in title', () => {
      const { executiveSummary } = buildWorkflowReport(makeBundle());
      expect(executiveSummary.title).toContain('Send Email');
    });

    it('lists applications used', () => {
      const { executiveSummary } = buildWorkflowReport(makeBundle());
      expect(executiveSummary.applicationsUsed.length).toBeGreaterThanOrEqual(1);
    });

    it('computes workflow confidence as weighted average', () => {
      const { executiveSummary } = buildWorkflowReport(makeBundle());
      expect(executiveSummary.workflowConfidence).toBeGreaterThan(0);
      expect(executiveSummary.workflowConfidence).toBeLessThanOrEqual(1.0);
    });
  });

  // ─── Workflow Overview ──────────────────────────────────────────────────

  describe('workflowOverview', () => {
    it('lists all steps with correct ordinals', () => {
      const { workflowOverview } = buildWorkflowReport(makeBundle());
      expect(workflowOverview.steps).toHaveLength(3);
      expect(workflowOverview.steps[0]!.ordinal).toBe(1);
      expect(workflowOverview.steps[2]!.ordinal).toBe(3);
    });

    it('step entries include groupingReason', () => {
      const { workflowOverview } = buildWorkflowReport(makeBundle());
      expect(workflowOverview.steps[0]!.groupingReason).toBe('click_then_navigate');
      expect(workflowOverview.steps[1]!.groupingReason).toBe('data_entry');
      expect(workflowOverview.steps[2]!.groupingReason).toBe('send_action');
    });
  });

  // ─── SOP ────────────────────────────────────────────────────────────────

  describe('sop', () => {
    it('generates SOP with instructions', () => {
      const { sop } = buildWorkflowReport(makeBundle());
      expect(sop.phases.length).toBeGreaterThanOrEqual(1);
      const totalInstructions = sop.phases.reduce((sum, p) => sum + p.instructions.length, 0);
      expect(totalInstructions).toBeGreaterThanOrEqual(1);
    });

    it('derives expected outcomes per grouping reason', () => {
      const { sop } = buildWorkflowReport(makeBundle());
      const instructions = sop.phases.flatMap(p => p.instructions);
      const sendInstr = instructions.find(i => i.stepId.endsWith('step-3'));
      expect(sendInstr?.expectedOutcome).toContain('Action completed');
    });
  });

  // ─── Appendix ───────────────────────────────────────────────────────────

  describe('appendix', () => {
    it('links steps to evidence event IDs', () => {
      const { appendix } = buildWorkflowReport(makeBundle());
      expect(appendix.evidenceByStep[`${SESSION_ID}-step-1`]).toEqual(['evt-1', 'evt-2']);
    });

    it('counts total normalized events', () => {
      const { appendix } = buildWorkflowReport(makeBundle());
      expect(appendix.totalNormalizedEvents).toBe(4);
    });
  });

  // ─── Determinism ────────────────────────────────────────────────────────

  it('identical input produces identical output (except generatedAt)', () => {
    const bundle = makeBundle();
    const r1 = buildWorkflowReport(bundle);
    const r2 = buildWorkflowReport(bundle);
    // generatedAt will differ slightly, so compare everything else
    expect(r1.header.sessionId).toBe(r2.header.sessionId);
    expect(r1.metrics).toEqual(r2.metrics);
    expect(r1.workflowOverview.steps).toEqual(r2.workflowOverview.steps);
    expect(r1.sop.phases).toEqual(r2.sop.phases);
    expect(r1.appendix).toEqual(r2.appendix);
  });
});
