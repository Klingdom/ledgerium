/**
 * Hardening tests — validates resilience under edge cases and failure modes.
 *
 * These tests specifically verify that the system handles messy, incomplete,
 * or invalid inputs without crashing or producing corrupt output.
 */

import { describe, it, expect } from 'vitest';
import { processSession } from './processSession.js';
import { validateProcessEngineInput } from './inputValidator.js';
import { analyzeWorkflowInsights } from './workflowInsights.js';
import type { ProcessEngineInput, CanonicalEventInput, DerivedStepInput } from './types.js';

const SESSION_ID = 'hardening-test';
const NOW = 1_700_000_000_000;

function evt(overrides: Partial<CanonicalEventInput> & { event_id?: string; event_type?: string; t_ms?: number }): CanonicalEventInput {
  return {
    event_id: overrides.event_id ?? 'e1',
    session_id: SESSION_ID,
    t_ms: overrides.t_ms ?? NOW,
    t_wall: new Date(overrides.t_ms ?? NOW).toISOString(),
    event_type: overrides.event_type ?? 'interaction.click',
    actor_type: overrides.actor_type ?? 'human',
    page_context: {
      url: 'https://app.com/page',
      urlNormalized: 'https://app.com/page',
      domain: 'app.com',
      routeTemplate: '/page',
      pageTitle: 'Page',
      applicationLabel: 'App',
    },
    target_summary: { label: 'Button', role: 'button', isSensitive: false },
    normalization_meta: {
      sourceEventId: overrides.event_id ?? 'e1',
      sourceEventType: overrides.event_type ?? 'interaction.click',
      normalizationRuleVersion: '1.0.0',
      redactionApplied: false,
    },
  };
}

function step(overrides: Partial<DerivedStepInput>): DerivedStepInput {
  return {
    step_id: `${SESSION_ID}-step-1`, session_id: SESSION_ID, ordinal: 1,
    title: 'Test Step', status: 'finalized', grouping_reason: 'single_action',
    confidence: 0.85, source_event_ids: ['e1'], start_t_ms: NOW, ...overrides,
  };
}

function validInput(overrides?: Partial<ProcessEngineInput>): ProcessEngineInput {
  return {
    sessionJson: { sessionId: SESSION_ID, activityName: 'Test', startedAt: new Date(NOW).toISOString() },
    normalizedEvents: [evt({ event_id: 'e1', t_ms: NOW })],
    derivedSteps: [step({ step_id: `${SESSION_ID}-step-1`, source_event_ids: ['e1'] })],
    ...overrides,
  };
}

// ─── Input validation hardening ──────────────────────────────────────────────

describe('Input Validation Hardening', () => {
  it('rejects empty sessionId', () => {
    const input = validInput();
    input.sessionJson.sessionId = '';
    const result = validateProcessEngineInput(input);
    expect(result.valid).toBe(false);
  });

  it('rejects empty activityName', () => {
    const input = validInput();
    input.sessionJson.activityName = '';
    const result = validateProcessEngineInput(input);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid startedAt', () => {
    const input = validInput();
    input.sessionJson.startedAt = 'not-a-date';
    const result = validateProcessEngineInput(input);
    expect(result.valid).toBe(false);
  });

  it('rejects endedAt before startedAt', () => {
    const input = validInput();
    input.sessionJson.startedAt = new Date(NOW + 1000).toISOString();
    input.sessionJson.endedAt = new Date(NOW).toISOString();
    const result = validateProcessEngineInput(input);
    expect(result.valid).toBe(false);
  });

  it('rejects duplicate event IDs', () => {
    const input = validInput({
      normalizedEvents: [
        evt({ event_id: 'e1', t_ms: NOW }),
        evt({ event_id: 'e1', t_ms: NOW + 100 }),
      ],
    });
    const result = validateProcessEngineInput(input);
    expect(result.valid).toBe(false);
  });

  it('rejects out-of-order events', () => {
    const input = validInput({
      normalizedEvents: [
        evt({ event_id: 'e1', t_ms: NOW + 100 }),
        evt({ event_id: 'e2', t_ms: NOW }),
      ],
    });
    const result = validateProcessEngineInput(input);
    expect(result.valid).toBe(false);
  });

  it('rejects steps referencing non-existent events', () => {
    const input = validInput({
      derivedSteps: [step({ source_event_ids: ['nonexistent_event'] })],
    });
    const result = validateProcessEngineInput(input);
    expect(result.valid).toBe(false);
  });

  it('rejects all-provisional steps (no finalized)', () => {
    const input = validInput({
      derivedSteps: [step({ status: 'provisional' })],
    });
    const result = validateProcessEngineInput(input);
    expect(result.valid).toBe(false);
  });

  it('rejects negative confidence', () => {
    const input = validInput({
      derivedSteps: [step({ confidence: -0.5 })],
    });
    const result = validateProcessEngineInput(input);
    expect(result.valid).toBe(false);
  });

  it('rejects confidence > 1', () => {
    const input = validInput({
      derivedSteps: [step({ confidence: 1.5 })],
    });
    const result = validateProcessEngineInput(input);
    expect(result.valid).toBe(false);
  });

  it('accepts valid minimal input', () => {
    const result = validateProcessEngineInput(validInput());
    expect(result.valid).toBe(true);
  });
});

// ─── Engine resilience ───────────────────────────────────────────────────────

describe('Engine Resilience', () => {
  it('handles single-step workflow without crashing', () => {
    const output = processSession(validInput());
    expect(output.sop.steps.length).toBe(1);
    expect(output.processMap.nodes.length).toBe(3); // start + 1 task + end
  });

  it('handles workflow with zero-duration steps', () => {
    const input = validInput({
      derivedSteps: [step({ duration_ms: 0 })],
    });
    const output = processSession(input);
    expect(output.sop.steps[0]!.durationLabel).toBeDefined();
  });

  it('handles workflow with very large duration', () => {
    const input = validInput({
      derivedSteps: [step({ duration_ms: 3_600_000 })], // 1 hour
    });
    const output = processSession(input);
    expect(output.sop.steps[0]!.durationLabel).toContain('m');
  });

  it('handles workflow with unknown grouping reason gracefully', () => {
    const input = validInput({
      derivedSteps: [step({ grouping_reason: 'unknown_future_reason' })],
    });
    const output = processSession(input);
    // Should fallback to single_action
    expect(output.sop.steps.length).toBe(1);
  });

  it('handles workflow with missing page context', () => {
    const input = validInput({
      derivedSteps: [step({ page_context: undefined })],
    });
    const output = processSession(input);
    expect(output.processMap.phases.length).toBeGreaterThanOrEqual(0);
  });
});

// ─── Insight generation resilience ───────────────────────────────────────────

describe('Insight Generation Resilience', () => {
  it('handles single-step workflow', () => {
    const output = processSession(validInput());
    const report = analyzeWorkflowInsights(output);
    expect(report).toBeDefined();
    expect(report.insights).toBeDefined();
  });

  it('handles workflow with all zero durations', () => {
    const input = validInput({
      normalizedEvents: [
        evt({ event_id: 'e1', t_ms: NOW }),
        evt({ event_id: 'e2', t_ms: NOW }),
      ],
      derivedSteps: [
        step({ step_id: `${SESSION_ID}-step-1`, ordinal: 1, source_event_ids: ['e1'], duration_ms: 0 }),
        step({ step_id: `${SESSION_ID}-step-2`, ordinal: 2, source_event_ids: ['e2'], duration_ms: 0 }),
      ],
    });
    const output = processSession(input);
    const report = analyzeWorkflowInsights(output);
    // Should not crash on zero total duration
    expect(report.timeBreakdown).toBeNull();
  });

  it('produces no hallucinated insights for clean workflow', () => {
    const output = processSession(validInput());
    const report = analyzeWorkflowInsights(output);
    // No high-severity insights for a simple clean workflow
    expect(report.summary.highSeverity).toBe(0);
  });
});

// ─── Template resilience ─────────────────────────────────────────────────────

describe('Template Resilience', () => {
  it('renders all template types without crashing for minimal input', async () => {
    const { renderTemplates } = await import('./templates/index.js');
    const output = processSession(validInput());

    // Each template type should handle minimal data gracefully
    for (const mapType of ['swimlane', 'bpmn_informed', 'sipoc_high_level'] as const) {
      for (const sopType of ['operator_centric', 'enterprise', 'decision_based'] as const) {
        const artifacts = renderTemplates(output, { processMap: mapType, sop: sopType });
        expect(artifacts.processMap.templateType).toBe(mapType);
        expect(artifacts.sop.templateType).toBe(sopType);
      }
    }
  });
});
