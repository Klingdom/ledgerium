/**
 * processSessionFull tests — exercises the composed derive → render → validate pipeline.
 *
 * Scope:
 *   - Happy path: valid input → ok: true sopValidation
 *   - Failure path 1: single-step input → too_few_steps
 *   - Failure path 2: banned recorder artifact in event label → banned_recorder_artifact
 *   - Determinism: same input produces identical SOPValidation twice
 *   - Structural regression: result shape contains all three fields
 *   - Invalid input: throws (same as processSession)
 *   - Override forwarding: overrides parameter reaches renderTemplates
 *
 * Fixture pattern follows processSession.test.ts (shared makeEvent / makeInput helpers).
 */

import { describe, it, expect } from 'vitest';
import { processSessionFull } from './processSessionFull.js';
import type { ProcessEngineInput } from './types.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SESSION_ID = 'test-session-psf-001';
const NOW_MS = 1_700_000_000_000;

function makeEvent(
  overrides: Partial<{
    event_id: string;
    event_type: string;
    actor_type: 'human' | 'system' | 'recorder';
    t_ms: number;
    pageTitle: string;
    applicationLabel: string;
    domain: string;
    label: string;
    isSensitive: boolean;
    redactionApplied: boolean;
  }>,
) {
  const {
    event_id = 'evt-1',
    event_type = 'interaction.click',
    actor_type = 'human',
    t_ms = NOW_MS,
    pageTitle = 'Invoice Dashboard',
    applicationLabel = 'NetSuite',
    domain = 'app.netsuite.com',
    label = 'Submit invoice',
    isSensitive = false,
    redactionApplied = false,
  } = overrides;

  return {
    event_id,
    session_id: SESSION_ID,
    t_ms,
    t_wall: new Date(t_ms).toISOString(),
    event_type,
    actor_type,
    page_context: {
      url: `https://${domain}/page`,
      urlNormalized: `https://${domain}/page`,
      domain,
      routeTemplate: '/page',
      pageTitle,
      applicationLabel,
    },
    target_summary: {
      label,
      role: 'button',
      isSensitive,
    },
    normalization_meta: {
      sourceEventId: event_id,
      sourceEventType: event_type,
      normalizationRuleVersion: '1.0.0',
      redactionApplied,
    },
  } as const;
}

/**
 * A valid two-step input that satisfies all SOP quality-gate rules.
 * Step titles and event labels are deliberately meaningful (not generic).
 */
function makeInput(overrides?: {
  steps?: ProcessEngineInput['derivedSteps'];
  events?: ProcessEngineInput['normalizedEvents'];
  activityName?: string;
}): ProcessEngineInput {
  const events = overrides?.events ?? [
    makeEvent({ event_id: 'evt-1', event_type: 'interaction.click',        t_ms: NOW_MS,         label: 'Open invoice form' }),
    makeEvent({ event_id: 'evt-2', event_type: 'navigation.open_page',     t_ms: NOW_MS + 100,   label: 'Invoice List', pageTitle: 'Invoice List' }),
    makeEvent({ event_id: 'evt-3', event_type: 'interaction.input_change', t_ms: NOW_MS + 3000,  label: 'Amount' }),
    makeEvent({ event_id: 'evt-4', event_type: 'interaction.submit',       t_ms: NOW_MS + 5000,  label: 'Submit invoice' }),
  ];

  const steps = overrides?.steps ?? [
    {
      step_id: `${SESSION_ID}-step-1`,
      session_id: SESSION_ID,
      ordinal: 1,
      title: 'Navigate to Invoice List',
      status: 'finalized' as const,
      boundary_reason: 'navigation_changed',
      grouping_reason: 'click_then_navigate',
      confidence: 0.85,
      source_event_ids: ['evt-1', 'evt-2'],
      start_t_ms: NOW_MS,
      end_t_ms: NOW_MS + 100,
      duration_ms: 100,
      page_context: {
        domain: 'app.netsuite.com',
        applicationLabel: 'NetSuite',
        routeTemplate: '/invoices',
      },
    },
    {
      step_id: `${SESSION_ID}-step-2`,
      session_id: SESSION_ID,
      ordinal: 2,
      title: 'Fill and submit invoice',
      status: 'finalized' as const,
      boundary_reason: 'form_submitted',
      grouping_reason: 'fill_and_submit',
      confidence: 0.90,
      source_event_ids: ['evt-3', 'evt-4'],
      start_t_ms: NOW_MS + 3000,
      end_t_ms: NOW_MS + 5000,
      duration_ms: 2000,
      page_context: {
        domain: 'app.netsuite.com',
        applicationLabel: 'NetSuite',
        routeTemplate: '/invoices/new',
      },
    },
  ];

  return {
    sessionJson: {
      sessionId: SESSION_ID,
      activityName: overrides?.activityName ?? 'Vendor invoice intake',
      startedAt: new Date(NOW_MS).toISOString(),
      endedAt: new Date(NOW_MS + 6000).toISOString(),
    },
    normalizedEvents: events,
    derivedSteps: steps,
  };
}

/**
 * Single-step input — triggers Rule 2 (too_few_steps) in validateRenderedSOP.
 */
function makeSingleStepInput(): ProcessEngineInput {
  return makeInput({
    events: [
      makeEvent({ event_id: 'evt-1', event_type: 'interaction.click', t_ms: NOW_MS, label: 'Save record' }),
    ],
    steps: [
      {
        step_id: `${SESSION_ID}-step-1`,
        session_id: SESSION_ID,
        ordinal: 1,
        title: 'Save the record',
        status: 'finalized' as const,
        boundary_reason: 'form_submitted',
        grouping_reason: 'single_click',
        confidence: 0.85,
        source_event_ids: ['evt-1'],
        start_t_ms: NOW_MS,
        end_t_ms: NOW_MS + 100,
        duration_ms: 100,
        page_context: {
          domain: 'app.netsuite.com',
          applicationLabel: 'NetSuite',
          routeTemplate: '/records',
        },
      },
    ],
  });
}

/**
 * Two-step input where event labels contain a banned recorder artifact string.
 * Uses 'Click the div' to trigger Rule 1 (banned_recorder_artifact).
 */
function makeBannedArtifactInput(): ProcessEngineInput {
  return makeInput({
    events: [
      makeEvent({ event_id: 'evt-1', event_type: 'interaction.click',    t_ms: NOW_MS,        label: 'Click the div' }),
      makeEvent({ event_id: 'evt-2', event_type: 'navigation.open_page', t_ms: NOW_MS + 100,  label: 'Invoice List', pageTitle: 'Invoice List' }),
      makeEvent({ event_id: 'evt-3', event_type: 'interaction.click',    t_ms: NOW_MS + 3000, label: 'Click the div' }),
      makeEvent({ event_id: 'evt-4', event_type: 'interaction.submit',   t_ms: NOW_MS + 5000, label: 'Submit' }),
    ],
    steps: [
      {
        step_id: `${SESSION_ID}-step-1`,
        session_id: SESSION_ID,
        ordinal: 1,
        title: 'Navigate to invoice list',
        status: 'finalized' as const,
        boundary_reason: 'navigation_changed',
        grouping_reason: 'click_then_navigate',
        confidence: 0.85,
        source_event_ids: ['evt-1', 'evt-2'],
        start_t_ms: NOW_MS,
        end_t_ms: NOW_MS + 100,
        duration_ms: 100,
        page_context: {
          domain: 'app.netsuite.com',
          applicationLabel: 'NetSuite',
          routeTemplate: '/invoices',
        },
      },
      {
        step_id: `${SESSION_ID}-step-2`,
        session_id: SESSION_ID,
        ordinal: 2,
        title: 'Submit invoice form',
        status: 'finalized' as const,
        boundary_reason: 'form_submitted',
        grouping_reason: 'fill_and_submit',
        confidence: 0.90,
        source_event_ids: ['evt-3', 'evt-4'],
        start_t_ms: NOW_MS + 3000,
        end_t_ms: NOW_MS + 5000,
        duration_ms: 2000,
        page_context: {
          domain: 'app.netsuite.com',
          applicationLabel: 'NetSuite',
          routeTemplate: '/invoices/new',
        },
      },
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('processSessionFull — result shape', () => {
  it('returns output, artifacts, and sopValidation', () => {
    const result = processSessionFull(makeInput());
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('artifacts');
    expect(result).toHaveProperty('sopValidation');
  });

  it('output carries all four ProcessOutput fields', () => {
    const { output } = processSessionFull(makeInput());
    expect(output).toHaveProperty('processRun');
    expect(output).toHaveProperty('processDefinition');
    expect(output).toHaveProperty('processMap');
    expect(output).toHaveProperty('sop');
  });

  it('artifacts carries processMap, sop, and selection', () => {
    const { artifacts } = processSessionFull(makeInput());
    expect(artifacts).toHaveProperty('processMap');
    expect(artifacts).toHaveProperty('sop');
    expect(artifacts).toHaveProperty('selection');
  });
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('processSessionFull — happy path', () => {
  it('returns sopValidation ok: true for a valid two-step session', () => {
    const { sopValidation } = processSessionFull(makeInput());
    expect(sopValidation).toEqual({ ok: true });
  });

  it('artifacts.sop is the RenderedSOP that drove sopValidation', () => {
    const { artifacts, sopValidation } = processSessionFull(makeInput());
    // Structural: if sopValidation passed, rendered title must be non-generic.
    // We assert the rendered SOP has a templateType (proving it went through the renderer).
    expect(artifacts.sop).toHaveProperty('templateType');
    expect(sopValidation.ok).toBe(true);
  });
});

// ─── Failure path 1: too_few_steps ───────────────────────────────────────────

describe('processSessionFull — failure: too_few_steps', () => {
  it('returns sopValidation ok: false with reason too_few_steps for a single-step session', () => {
    const { sopValidation } = processSessionFull(makeSingleStepInput());
    expect(sopValidation.ok).toBe(false);
    if (!sopValidation.ok) {
      expect(sopValidation.reason).toBe('too_few_steps');
      expect(sopValidation.diagnostic).toContain('minimum');
      expect(sopValidation.suggestion).toBeTruthy();
    }
  });

  it('still returns a fully-populated output even when sopValidation fails', () => {
    const { output, artifacts } = processSessionFull(makeSingleStepInput());
    expect(output.processRun).toBeDefined();
    expect(output.sop.steps).toHaveLength(1);
    expect(artifacts.sop).toHaveProperty('templateType');
  });
});

// ─── Failure path 2: banned_recorder_artifact ────────────────────────────────

describe('processSessionFull — failure: banned_recorder_artifact', () => {
  it('returns sopValidation ok: false with reason banned_recorder_artifact when label is "Click the div"', () => {
    const { sopValidation } = processSessionFull(makeBannedArtifactInput());
    expect(sopValidation.ok).toBe(false);
    if (!sopValidation.ok) {
      expect(sopValidation.reason).toBe('banned_recorder_artifact');
      expect(sopValidation.diagnostic).toContain('Click the div');
      expect(sopValidation.suggestion).toBeTruthy();
    }
  });
});

// ─── Determinism ─────────────────────────────────────────────────────────────

describe('processSessionFull — determinism', () => {
  it('produces identical sopValidation for the same valid input called twice', () => {
    const input = makeInput();
    const first  = processSessionFull(input);
    const second = processSessionFull(input);
    expect(first.sopValidation).toEqual(second.sopValidation);
  });

  it('produces identical sopValidation for the same failing input called twice', () => {
    const input = makeSingleStepInput();
    const first  = processSessionFull(input);
    const second = processSessionFull(input);
    expect(first.sopValidation).toEqual(second.sopValidation);
  });

  it('produces identical artifacts.selection for the same input called twice', () => {
    const input = makeInput();
    const first  = processSessionFull(input);
    const second = processSessionFull(input);
    expect(first.artifacts.selection).toEqual(second.artifacts.selection);
  });
});

// ─── Invalid input (throws) ───────────────────────────────────────────────────

describe('processSessionFull — invalid input', () => {
  it('throws when sessionJson.sessionId is empty', () => {
    const bad = {
      sessionJson: {
        sessionId: '',
        activityName: 'Bad',
        startedAt: new Date(NOW_MS).toISOString(),
        endedAt:   new Date(NOW_MS + 1000).toISOString(),
      },
      normalizedEvents: [],
      derivedSteps: [],
    } as unknown as ProcessEngineInput;

    expect(() => processSessionFull(bad)).toThrow('[process-engine] Invalid input');
  });

  it('throws when sessionJson.activityName is empty', () => {
    const bad = {
      sessionJson: {
        sessionId: 'sess-bad',
        activityName: '',
        startedAt: new Date(NOW_MS).toISOString(),
        endedAt:   new Date(NOW_MS + 1000).toISOString(),
      },
      normalizedEvents: [],
      derivedSteps: [],
    } as unknown as ProcessEngineInput;

    expect(() => processSessionFull(bad)).toThrow('[process-engine] Invalid input');
  });
});

// ─── Override forwarding ──────────────────────────────────────────────────────

describe('processSessionFull — override forwarding', () => {
  it('overrides are forwarded: explicit sop template type appears in artifacts.selection', () => {
    const { artifacts } = processSessionFull(makeInput(), { sop: 'enterprise' });
    expect(artifacts.selection.sop.template).toBe('enterprise');
  });
});
