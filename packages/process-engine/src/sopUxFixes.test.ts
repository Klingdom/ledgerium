/**
 * Tests for the P0-c render-layer specificity fixes harvested from the
 * parked `chore/process-engine-specificity-wip` branch (commit e9f13bf)
 * onto `main`, per docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md §4/§7:
 *
 *   B1 — labelless click reads "Click in {applicationLabel}" (not the old
 *        "Click the target element in {applicationLabel}").
 *   B3 — single-word click labels get typographic curly quotes; multi-word
 *        labels keep straight quotes.
 *   B4 — an error-recovery step surfaces the labelled recovery control,
 *        quoted with the same B3 convention.
 *
 * (B2 — coordinate-only title suppression — is tested directly against the
 * exported `cleanStepTitle()` in contentEnricher.test.ts, since that is
 * where the fix lives and where it is already unit-tested.)
 *
 * `buildSOP` is exercised directly (matching the existing pattern in
 * sopBuilder.test.ts) so these tests are anchored to the exact instruction/
 * action text a reader sees, not to a re-implementation of the private
 * `deriveInstruction()` / `buildAction()` functions.
 */

import { describe, it, expect } from 'vitest';
import { buildSOP } from './sopBuilder.js';
import type { ProcessEngineInput, CanonicalEventInput, DerivedStepInput } from './types.js';

const SESSION_ID = 'sop-ux-fixes-test-session';
const NOW_MS = 1_700_000_000_000;

function baseSessionJson(): ProcessEngineInput['sessionJson'] {
  return {
    sessionId: SESSION_ID,
    activityName: 'Test Workflow',
    startedAt: new Date(NOW_MS).toISOString(),
    endedAt: new Date(NOW_MS + 6000).toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// B1 — labelless click reads "Click in {applicationLabel}"
// ═══════════════════════════════════════════════════════════════════════════

describe('P0-c B1: labelless click instruction text', () => {
  it('reads "Click in {applicationLabel}" when there is no label, no meaningful role, ' +
     'and no pageTitle — not the old "Click the target element in {app}" phrasing', () => {
    const events: CanonicalEventInput[] = [
      {
        event_id: 'evt-1',
        session_id: SESSION_ID,
        t_ms: NOW_MS,
        t_wall: new Date(NOW_MS).toISOString(),
        event_type: 'interaction.click',
        actor_type: 'human',
        page_context: {
          url: 'https://mail.google.com/inbox',
          urlNormalized: 'https://mail.google.com/inbox',
          domain: 'mail.google.com',
          routeTemplate: '/inbox',
          // Empty (not omitted) pageTitle is what routes deriveInstruction()
          // past the "on {pageTitle}" fallback and into the
          // applicationLabel-only last resort this test targets.
          pageTitle: '',
          applicationLabel: 'Gmail',
        },
        // No target_summary at all: no label, no role.
        normalization_meta: {
          sourceEventId: 'evt-1',
          sourceEventType: 'interaction.click',
          normalizationRuleVersion: '1.0.0',
          redactionApplied: false,
        },
      },
    ];

    const derivedSteps: DerivedStepInput[] = [
      {
        step_id: `${SESSION_ID}-step-1`,
        session_id: SESSION_ID,
        ordinal: 1,
        title: 'Click action in Gmail',
        status: 'finalized',
        boundary_reason: 'session_stop',
        grouping_reason: 'single_action',
        confidence: 0.6,
        source_event_ids: ['evt-1'],
        start_t_ms: NOW_MS,
        end_t_ms: NOW_MS,
        duration_ms: 0,
        page_context: {
          domain: 'mail.google.com',
          applicationLabel: 'Gmail',
          routeTemplate: '/inbox',
        },
      },
    ];

    const sop = buildSOP({ sessionJson: baseSessionJson(), normalizedEvents: events, derivedSteps });

    expect(sop.steps[0]!.instructions[0]!.instruction).toBe('Click in Gmail');
    // Regression lock: the old, more verbose phrasing must not reappear.
    expect(sop.steps[0]!.instructions[0]!.instruction).not.toContain('the target element in');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B3 — single-word vs multi-word label quoting
// ═══════════════════════════════════════════════════════════════════════════

function buildSingleClickSop(label: string): ReturnType<typeof buildSOP> {
  const events: CanonicalEventInput[] = [
    {
      event_id: 'evt-1',
      session_id: SESSION_ID,
      t_ms: NOW_MS,
      t_wall: new Date(NOW_MS).toISOString(),
      event_type: 'interaction.click',
      actor_type: 'human',
      page_context: {
        url: 'https://app.example.com/page',
        urlNormalized: 'https://app.example.com/page',
        domain: 'app.example.com',
        routeTemplate: '/page',
        pageTitle: 'Page',
        applicationLabel: 'App',
      },
      target_summary: {
        label,
        role: 'button',
        isSensitive: false,
      },
      normalization_meta: {
        sourceEventId: 'evt-1',
        sourceEventType: 'interaction.click',
        normalizationRuleVersion: '1.0.0',
        redactionApplied: false,
      },
    },
  ];

  const derivedSteps: DerivedStepInput[] = [
    {
      step_id: `${SESSION_ID}-step-1`,
      session_id: SESSION_ID,
      ordinal: 1,
      title: `Click ${label}`,
      status: 'finalized',
      boundary_reason: 'session_stop',
      grouping_reason: 'single_action',
      confidence: 0.9,
      source_event_ids: ['evt-1'],
      start_t_ms: NOW_MS,
      end_t_ms: NOW_MS,
      duration_ms: 0,
      page_context: {
        domain: 'app.example.com',
        applicationLabel: 'App',
        routeTemplate: '/page',
      },
    },
  ];

  return buildSOP({ sessionJson: baseSessionJson(), normalizedEvents: events, derivedSteps });
}

describe('P0-c B3: single-word vs multi-word click label quoting', () => {
  it('wraps a single-word label in typographic curly quotes', () => {
    const sop = buildSingleClickSop('Retry');
    expect(sop.steps[0]!.instructions[0]!.instruction).toBe('Click “Retry”');
  });

  it('wraps a multi-word label in straight quotes (unchanged presentation)', () => {
    const sop = buildSingleClickSop('Submit Invoice');
    expect(sop.steps[0]!.instructions[0]!.instruction).toBe('Click "Submit Invoice"');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B4 — error-recovery label surfaced with correct quoting
// ═══════════════════════════════════════════════════════════════════════════

function buildErrorRecoverySop(recoveryLabel?: string): ReturnType<typeof buildSOP> {
  const events: CanonicalEventInput[] = [
    {
      event_id: 'evt-1',
      session_id: SESSION_ID,
      t_ms: NOW_MS,
      t_wall: new Date(NOW_MS).toISOString(),
      event_type: 'system.error_displayed',
      actor_type: 'system',
      page_context: {
        url: 'https://app.example.com/checkout',
        urlNormalized: 'https://app.example.com/checkout',
        domain: 'app.example.com',
        routeTemplate: '/checkout',
        pageTitle: 'Checkout',
        applicationLabel: 'App',
      },
      normalization_meta: {
        sourceEventId: 'evt-1',
        sourceEventType: 'system.error_displayed',
        normalizationRuleVersion: '1.0.0',
        redactionApplied: false,
      },
    },
  ];

  if (recoveryLabel !== undefined) {
    events.push({
      event_id: 'evt-2',
      session_id: SESSION_ID,
      t_ms: NOW_MS + 500,
      t_wall: new Date(NOW_MS + 500).toISOString(),
      event_type: 'interaction.click',
      actor_type: 'human',
      page_context: {
        url: 'https://app.example.com/checkout',
        urlNormalized: 'https://app.example.com/checkout',
        domain: 'app.example.com',
        routeTemplate: '/checkout',
        pageTitle: 'Checkout',
        applicationLabel: 'App',
      },
      target_summary: {
        label: recoveryLabel,
        role: 'button',
        isSensitive: false,
      },
      normalization_meta: {
        sourceEventId: 'evt-2',
        sourceEventType: 'interaction.click',
        normalizationRuleVersion: '1.0.0',
        redactionApplied: false,
      },
    });
  }

  const derivedSteps: DerivedStepInput[] = [
    {
      step_id: `${SESSION_ID}-step-1`,
      session_id: SESSION_ID,
      ordinal: 1,
      title: 'Resolve error',
      status: 'finalized',
      boundary_reason: 'session_stop',
      grouping_reason: 'error_handling',
      confidence: 0.7,
      source_event_ids: events.map(e => e.event_id),
      start_t_ms: NOW_MS,
      end_t_ms: NOW_MS + 500,
      duration_ms: 500,
      page_context: {
        domain: 'app.example.com',
        applicationLabel: 'App',
        routeTemplate: '/checkout',
      },
    },
  ];

  return buildSOP({ sessionJson: baseSessionJson(), normalizedEvents: events, derivedSteps });
}

describe('P0-c B4: error-recovery label surfaced in step.action', () => {
  it('surfaces a single-word recovery label with typographic curly quotes', () => {
    const sop = buildErrorRecoverySop('Retry');
    expect(sop.steps[0]!.action).toBe('Resolve error — click “Retry” to continue');
  });

  it('surfaces a multi-word recovery label with straight quotes', () => {
    const sop = buildErrorRecoverySop('Try Again');
    expect(sop.steps[0]!.action).toBe('Resolve error — click "Try Again" to continue');
  });

  it('the open and close quote characters are actually different for a single-word label ' +
     '(regression lock for the parked branch\'s broken ternary, which returned the same ' +
     'closing curly quote for both variables)', () => {
    const sop = buildErrorRecoverySop('Retry');
    const action = sop.steps[0]!.action;
    const openIdx = action.indexOf('“Retry');
    const closeIdx = action.indexOf('Retry”');
    expect(openIdx).toBeGreaterThanOrEqual(0);
    expect(closeIdx).toBeGreaterThanOrEqual(0);
    // The literal opening mark must be U+201C and the closing mark U+201D —
    // if both were U+201D (the parked branch's bug), the open assertion
    // above would fail because '“Retry' would not be found in the
    // rendered string.
  });

  it('falls back to the generic instruction when no labelled recovery click is present', () => {
    const sop = buildErrorRecoverySop(undefined);
    expect(sop.steps[0]!.action).toBe('Resolve the error and continue');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B2 sibling path — buildAction()'s data_entry branch
//
// cleanStepTitle suppresses coordinate-only labels from step.title, but
// buildAction collected field labels independently, so a spreadsheet step
// rendered a clean title beside `action: "Enter A16"`. Same defect class,
// different field. Surfaced by the P0-c harvest and fixed here.
// ═══════════════════════════════════════════════════════════════════════════

function buildDataEntrySop(fieldLabels: string[]): ReturnType<typeof buildSOP> {
  const events: CanonicalEventInput[] = fieldLabels.map((label, i) => ({
    event_id: `evt-${i + 1}`,
    session_id: SESSION_ID,
    t_ms: NOW_MS + i * 100,
    t_wall: new Date(NOW_MS + i * 100).toISOString(),
    event_type: 'interaction.input_change',
    actor_type: 'human',
    target_summary: { label, role: 'textbox' },
    page_context: {
      url: 'https://sheets.example.com/s/1',
      urlNormalized: 'https://sheets.example.com/s/1',
      domain: 'sheets.example.com',
      routeTemplate: '/s/1',
      pageTitle: 'Budget',
      applicationLabel: 'Sheets',
    },
    normalization_meta: {
      sourceEventId: `evt-${i + 1}`,
      sourceEventType: 'interaction.input_change',
      normalizationRuleVersion: '1.0.0',
      redactionApplied: false,
    },
  })) as CanonicalEventInput[];

  const derivedSteps: DerivedStepInput[] = [
    {
      step_id: `${SESSION_ID}-step-1`,
      session_id: SESSION_ID,
      ordinal: 1,
      title: 'Enter budget figures',
      status: 'finalized',
      boundary_reason: 'session_stop',
      grouping_reason: 'data_entry',
      confidence: 0.8,
      source_event_ids: events.map((e) => e.event_id),
      start_t_ms: NOW_MS,
      end_t_ms: NOW_MS + fieldLabels.length * 100,
      duration_ms: fieldLabels.length * 100,
      page_context: {
        domain: 'sheets.example.com',
        routeTemplate: '/s/1',
        applicationLabel: 'Sheets',
      },
    },
  ];

  return buildSOP({ sessionJson: baseSessionJson(), normalizedEvents: events, derivedSteps });
}

describe('B2 sibling: buildAction data_entry does not surface bare coordinates', () => {
  it('does NOT render "Enter A16" when every captured field label is a bare cell coordinate', () => {
    const action = buildDataEntrySop(['A16', 'B16']).steps[0]!.action;
    expect(action).not.toBe('Enter A16, B16');
    expect(action).not.toMatch(/\bA16\b/);
  });

  it('falls back to the cleaned step title, which carries more meaning than a coordinate', () => {
    expect(buildDataEntrySop(['A16', 'B16']).steps[0]!.action.length).toBeGreaterThan(0);
  });

  it('still uses real field names', () => {
    expect(buildDataEntrySop(['Vendor', 'Amount']).steps[0]!.action).toBe('Enter Vendor, Amount');
  });

  it('keeps the real names and drops only the coordinates when they are mixed', () => {
    const action = buildDataEntrySop(['Vendor', 'A16']).steps[0]!.action;
    expect(action).toBe('Enter Vendor');
  });

  it('does not suppress coordinate-SHAPED tokens that are part of a real field name', () => {
    // Same false-positive guard as B2's title fix: "Q4" and "PO12345" are
    // meaningful, not spreadsheet cells.
    expect(buildDataEntrySop(['Q4 Forecast', 'PO12345 Ref']).steps[0]!.action).toBe(
      'Enter Q4 Forecast, PO12345 Ref',
    );
  });
});

describe('B3 third call site: send_action uses the shared quoteLabel helper', () => {
  function buildSendActionSop(label: string): ReturnType<typeof buildSOP> {
    const events: CanonicalEventInput[] = [
      {
        event_id: 'evt-1',
        session_id: SESSION_ID,
        t_ms: NOW_MS,
        t_wall: new Date(NOW_MS).toISOString(),
        event_type: 'interaction.click',
        actor_type: 'human',
        target_summary: { label, role: 'button' },
        page_context: {
          url: 'https://app.example.com/compose',
          urlNormalized: 'https://app.example.com/compose',
          domain: 'app.example.com',
          routeTemplate: '/compose',
          pageTitle: 'Compose',
          applicationLabel: 'App',
        },
        normalization_meta: {
          sourceEventId: 'evt-1',
          sourceEventType: 'interaction.click',
          normalizationRuleVersion: '1.0.0',
          redactionApplied: false,
        },
      } as CanonicalEventInput,
    ];

    const derivedSteps: DerivedStepInput[] = [
      {
        step_id: `${SESSION_ID}-step-1`,
        session_id: SESSION_ID,
        ordinal: 1,
        title: 'Send the message',
        status: 'finalized',
        boundary_reason: 'session_stop',
        grouping_reason: 'send_action',
        confidence: 0.9,
        source_event_ids: ['evt-1'],
        start_t_ms: NOW_MS,
        end_t_ms: NOW_MS,
        duration_ms: 0,
        page_context: {
          domain: 'app.example.com',
          routeTemplate: '/compose',
          applicationLabel: 'App',
        },
      },
    ];

    return buildSOP({ sessionJson: baseSessionJson(), normalizedEvents: events, derivedSteps });
  }

  it('uses typographic curly quotes for a single-word label, matching B3/B4', () => {
    expect(buildSendActionSop('Send').steps[0]!.action).toBe('Click “Send”');
  });

  it('uses straight quotes for a multi-word label, matching B3/B4', () => {
    expect(buildSendActionSop('Send Invoice').steps[0]!.action).toBe('Click "Send Invoice"');
  });
});
