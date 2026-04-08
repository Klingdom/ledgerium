import { describe, it, expect } from 'vitest';
import {
  inferBusinessObjective,
  inferTrigger,
  detectFriction,
  detectDecisionPoints,
  extractCommonIssues,
  inferRoles,
  cleanActivityName,
  cleanStepTitle,
  classifyInstructionType,
  computeQualityIndicators,
  generatePurpose,
  generateScope,
  generatePrerequisites,
  generateCompletionCriteria,
  generateNotes,
  enrichPhaseLabel,
} from './contentEnricher.js';
import type { CanonicalEventInput, DerivedStepInput } from './types.js';

// ─── Test helpers ────────────────────────────────────────────────────────────

const SESSION_ID = 'test-session-enrich';
const NOW_MS = 1_700_000_000_000;

function makeEvent(overrides: Partial<{
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
    applicationLabel = 'NetSuite',
    domain = 'app.netsuite.com',
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
      url: `https://${domain}/page`,
      urlNormalized: `https://${domain}/page`,
      domain,
      routeTemplate,
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
      redactionApplied: false,
    },
  };
}

function makeStep(overrides: Partial<DerivedStepInput> & { step_id?: string }): DerivedStepInput {
  return {
    step_id: overrides.step_id ?? `${SESSION_ID}-step-1`,
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

// ─── Business objective inference ────────────────────────────────────────────

describe('inferBusinessObjective', () => {
  it('infers submit transaction for form + send workflows', () => {
    const steps = [
      makeStep({ grouping_reason: 'fill_and_submit', ordinal: 1 }),
      makeStep({ grouping_reason: 'send_action', ordinal: 2 }),
    ];
    const events = [makeEvent({})];
    const result = inferBusinessObjective('Create Invoice', steps, events);
    expect(result.toLowerCase()).toContain('create');
    expect(result.toLowerCase()).toContain('invoice');
    expect(result).toContain('NetSuite');
  });

  it('infers data entry for form-only workflows', () => {
    const steps = [makeStep({ grouping_reason: 'fill_and_submit' })];
    const events = [makeEvent({})];
    const result = inferBusinessObjective('Customer Record', steps, events);
    expect(result).toContain('submit');
    expect(result.toLowerCase()).toContain('customer record');
  });

  it('infers entity and action for nav-heavy workflows', () => {
    const steps = [
      makeStep({ grouping_reason: 'click_then_navigate', ordinal: 1 }),
      makeStep({ grouping_reason: 'click_then_navigate', ordinal: 2 }),
      makeStep({ grouping_reason: 'click_then_navigate', ordinal: 3 }),
      makeStep({ grouping_reason: 'click_then_navigate', ordinal: 4 }),
    ];
    const events = [makeEvent({ pageTitle: 'Monthly Report' })];
    const result = inferBusinessObjective('Monthly Report', steps, events);
    expect(result.toLowerCase()).toContain('report');
    expect(result).toContain('NetSuite');
  });
});

// ─── Trigger inference ───────────────────────────────────────────────────────

describe('inferTrigger', () => {
  it('infers trigger for form submission workflow', () => {
    const steps = [
      makeStep({
        grouping_reason: 'fill_and_submit',
        source_event_ids: ['evt-1'],
        page_context: { domain: 'app.netsuite.com', applicationLabel: 'NetSuite', routeTemplate: '/invoices' },
      }),
    ];
    const events = [makeEvent({ pageTitle: 'Invoice List' })];
    const result = inferTrigger('Create Invoice', steps, events);
    expect(result).toContain('NetSuite');
    expect(result).toContain('create');
  });

  it('returns generic trigger for empty steps', () => {
    const result = inferTrigger('Test', [], []);
    expect(result).toContain('required');
  });
});

// ─── Friction detection ──────────────────────────────────────────────────────

describe('detectFriction', () => {
  it('detects error steps as friction', () => {
    const steps = [
      makeStep({ grouping_reason: 'error_handling', ordinal: 1 }),
    ];
    const friction = detectFriction(steps, []);
    expect(friction.length).toBe(1);
    expect(friction[0]!.type).toBe('repeated_error');
  });

  it('detects long wait steps', () => {
    const steps = [
      makeStep({ duration_ms: 90_000, ordinal: 1 }),
    ];
    const friction = detectFriction(steps, []);
    expect(friction.length).toBe(1);
    expect(friction[0]!.type).toBe('long_wait');
    expect(friction[0]!.severity).toBe('medium');
  });

  it('detects excessive navigation streaks', () => {
    const steps = [
      makeStep({ grouping_reason: 'click_then_navigate', ordinal: 1 }),
      makeStep({ grouping_reason: 'click_then_navigate', ordinal: 2 }),
      makeStep({ grouping_reason: 'click_then_navigate', ordinal: 3 }),
      makeStep({ grouping_reason: 'click_then_navigate', ordinal: 4 }),
    ];
    const friction = detectFriction(steps, []);
    expect(friction.some(f => f.type === 'excessive_navigation')).toBe(true);
  });

  it('detects context switching between systems', () => {
    const steps = [
      makeStep({ ordinal: 1, page_context: { domain: 'a.com', applicationLabel: 'App A', routeTemplate: '/' } }),
      makeStep({ ordinal: 2, page_context: { domain: 'b.com', applicationLabel: 'App B', routeTemplate: '/' } }),
      makeStep({ ordinal: 3, page_context: { domain: 'a.com', applicationLabel: 'App A', routeTemplate: '/' } }),
      makeStep({ ordinal: 4, page_context: { domain: 'b.com', applicationLabel: 'App B', routeTemplate: '/' } }),
    ];
    const friction = detectFriction(steps, []);
    expect(friction.some(f => f.type === 'context_switching')).toBe(true);
  });

  it('detects backtracking to previously visited pages', () => {
    const steps = [
      makeStep({
        ordinal: 1,
        grouping_reason: 'click_then_navigate',
        source_event_ids: ['evt-1'],
      }),
      makeStep({
        ordinal: 2,
        grouping_reason: 'click_then_navigate',
        source_event_ids: ['evt-2'],
      }),
      makeStep({
        ordinal: 3,
        grouping_reason: 'click_then_navigate',
        source_event_ids: ['evt-3'],
      }),
    ];
    const events = [
      makeEvent({ event_id: 'evt-1', event_type: 'navigation.open_page', pageTitle: 'Page A', routeTemplate: '/a' }),
      makeEvent({ event_id: 'evt-2', event_type: 'navigation.open_page', pageTitle: 'Page B', routeTemplate: '/b' }),
      makeEvent({ event_id: 'evt-3', event_type: 'navigation.open_page', pageTitle: 'Page A', routeTemplate: '/a' }),
    ];
    const friction = detectFriction(steps, events);
    expect(friction.some(f => f.type === 'backtracking')).toBe(true);
  });

  it('returns empty array for clean workflows', () => {
    const steps = [
      makeStep({ grouping_reason: 'fill_and_submit', ordinal: 1, duration_ms: 5000 }),
      makeStep({ grouping_reason: 'send_action', ordinal: 2, duration_ms: 2000 }),
    ];
    const friction = detectFriction(steps, []);
    expect(friction.length).toBe(0);
  });
});

// ─── Decision point detection ────────────────────────────────────────────────

describe('detectDecisionPoints', () => {
  it('detects submit → error_handling as decision', () => {
    const steps = [
      makeStep({ step_id: 's1', grouping_reason: 'fill_and_submit', ordinal: 1 }),
      makeStep({ step_id: 's2', grouping_reason: 'error_handling', ordinal: 2 }),
    ];
    const decisions = detectDecisionPoints(steps, []);
    expect(decisions.has('s1')).toBe(true);
    // New enriched label references the step title when no field names available
    expect(decisions.get('s1')).toContain('accepted');
  });

  it('detects data_entry → error_handling as decision', () => {
    const steps = [
      makeStep({ step_id: 's1', grouping_reason: 'data_entry', ordinal: 1 }),
      makeStep({ step_id: 's2', grouping_reason: 'error_handling', ordinal: 2 }),
    ];
    const decisions = detectDecisionPoints(steps, []);
    expect(decisions.has('s1')).toBe(true);
    expect(decisions.get('s1')).toContain('valid');
  });

  it('does not flag non-decision patterns', () => {
    const steps = [
      makeStep({ step_id: 's1', grouping_reason: 'click_then_navigate', ordinal: 1 }),
      makeStep({ step_id: 's2', grouping_reason: 'fill_and_submit', ordinal: 2 }),
    ];
    const decisions = detectDecisionPoints(steps, []);
    expect(decisions.size).toBe(0);
  });
});

// ─── Common issue extraction ─────────────────────────────────────────────────

describe('extractCommonIssues', () => {
  it('extracts issues from error-handling steps', () => {
    const steps = [
      makeStep({ grouping_reason: 'fill_and_submit', ordinal: 1, title: 'Submit Form' }),
      makeStep({ grouping_reason: 'error_handling', ordinal: 2, title: 'Handle Error' }),
    ];
    const issues = extractCommonIssues(steps, []);
    expect(issues.length).toBe(1);
    expect(issues[0]!.description).toContain('Submit Form');
  });

  it('returns empty for clean workflows', () => {
    const steps = [makeStep({ grouping_reason: 'single_action' })];
    const issues = extractCommonIssues(steps, []);
    expect(issues.length).toBe(0);
  });
});

// ─── Role inference ──────────────────────────────────────────────────────────

describe('inferRoles', () => {
  it('returns system-specific role for known systems', () => {
    const roles = inferRoles([makeStep({})], [makeEvent({ applicationLabel: 'NetSuite' })]);
    expect(roles).toContain('Accounts Payable Clerk');
  });

  it('returns Operator for unknown systems', () => {
    const roles = inferRoles([makeStep({})], [makeEvent({ applicationLabel: 'Custom App' })]);
    expect(roles).toContain('Operator');
  });

  it('returns multiple roles for multi-system workflows', () => {
    const events = [
      makeEvent({ applicationLabel: 'Salesforce' }),
      makeEvent({ applicationLabel: 'NetSuite' }),
      makeEvent({ applicationLabel: 'Gmail' }),
    ];
    const roles = inferRoles([makeStep({})], events);
    expect(roles.length).toBeGreaterThanOrEqual(2);
    expect(roles).toContain('Sales Representative');
    expect(roles).toContain('Accounts Payable Clerk');
  });

  it('adds Document preparer for file workflows', () => {
    const steps = [makeStep({ grouping_reason: 'file_action' })];
    const roles = inferRoles(steps, [makeEvent({})]);
    expect(roles).toContain('Document preparer');
  });
});

// ─── Title cleaning ──────────────────────────────────────────────────────────

describe('cleanActivityName', () => {
  it('removes leading articles', () => {
    expect(cleanActivityName('The Invoice Creation')).toBe('invoice Creation');
    expect(cleanActivityName('A New Order')).toBe('new Order');
  });

  it('preserves acronyms', () => {
    expect(cleanActivityName('PO Creation')).toBe('PO Creation');
  });

  it('lowercases first word when not acronym', () => {
    expect(cleanActivityName('Create Invoice')).toBe('create Invoice');
  });
});

describe('cleanStepTitle', () => {
  it('preserves already-imperative titles', () => {
    expect(cleanStepTitle('Navigate to Invoice List', 'click_then_navigate')).toBe('Navigate to Invoice List');
    expect(cleanStepTitle('Enter Amount', 'data_entry')).toBe('Enter Amount');
  });

  it('adds verb prefix for navigation steps', () => {
    const result = cleanStepTitle('Invoice List', 'click_then_navigate');
    expect(result).toBe('Navigate to Invoice List');
  });

  it('adds verb prefix for data entry steps', () => {
    const result = cleanStepTitle('Amount field', 'data_entry');
    expect(result).toBe('Enter Amount field');
  });

  it('adds verb prefix for form submit steps', () => {
    const result = cleanStepTitle('Invoice Form', 'fill_and_submit');
    expect(result).toBe('Complete and submit Invoice Form');
  });
});

// ─── Instruction type classification ─────────────────────────────────────────

describe('classifyInstructionType', () => {
  it('classifies interaction events as action', () => {
    expect(classifyInstructionType('interaction.click')).toBe('action');
    expect(classifyInstructionType('interaction.input_change')).toBe('action');
    expect(classifyInstructionType('interaction.submit')).toBe('action');
  });

  it('classifies navigation as wait', () => {
    expect(classifyInstructionType('navigation.open_page')).toBe('wait');
  });

  it('classifies system feedback as verify', () => {
    expect(classifyInstructionType('system.toast_shown')).toBe('verify');
    expect(classifyInstructionType('system.error_displayed')).toBe('verify');
  });

  it('suppresses loading_finished entirely', () => {
    expect(classifyInstructionType('system.loading_finished')).toBeNull();
  });

  it('returns null for excluded events', () => {
    expect(classifyInstructionType('system.capture_blocked')).toBeNull();
    expect(classifyInstructionType('session.started')).toBeNull();
  });
});

// ─── Quality indicators ─────────────────────────────────────────────────────

describe('computeQualityIndicators', () => {
  it('computes average confidence', () => {
    const steps = [
      makeStep({ confidence: 0.9, ordinal: 1 }),
      makeStep({ confidence: 0.8, ordinal: 2 }),
    ];
    const qi = computeQualityIndicators(steps, [], []);
    expect(qi.averageConfidence).toBe(0.85);
  });

  it('counts error steps and low confidence steps', () => {
    const steps = [
      makeStep({ confidence: 0.5, ordinal: 1, grouping_reason: 'error_handling' }),
      makeStep({ confidence: 0.9, ordinal: 2 }),
    ];
    const qi = computeQualityIndicators(steps, [], []);
    expect(qi.lowConfidenceStepCount).toBe(1);
    expect(qi.errorStepCount).toBe(1);
  });
});

// ─── Purpose generation ──────────────────────────────────────────────────────

describe('generatePurpose', () => {
  it('generates specific purpose mentioning entity, action, and systems', () => {
    const steps = [
      makeStep({ grouping_reason: 'fill_and_submit', ordinal: 1 }),
      makeStep({ grouping_reason: 'send_action', ordinal: 2 }),
    ];
    const events = [makeEvent({})];
    const purpose = generatePurpose('Create Invoice', steps, events);
    expect(purpose).toContain('NetSuite');
    expect(purpose.toLowerCase()).toContain('create');
    expect(purpose.toLowerCase()).toContain('submission');
  });

  it('does not contain boilerplate phrases', () => {
    const purpose = generatePurpose('Test', [makeStep({})], [makeEvent({})]);
    expect(purpose).not.toContain('Standard operating procedure for performing');
    // Purpose should mention what procedure documents and its deliverable
    expect(purpose).toContain('procedure documents');
  });
});

// ─── Scope generation ────────────────────────────────────────────────────────

describe('generateScope', () => {
  it('includes roles and systems', () => {
    const scope = generateScope('Create Invoice', ['NetSuite'], ['Operator']);
    expect(scope).toContain('Operator');
    expect(scope).toContain('NetSuite');
  });
});

// ─── Prerequisites generation ────────────────────────────────────────────────

describe('generatePrerequisites', () => {
  it('generates system-specific prerequisites', () => {
    const prereqs = generatePrerequisites([], [], ['NetSuite', 'Gmail']);
    expect(prereqs).toContain('Active, authenticated session in NetSuite');
    expect(prereqs).toContain('Active, authenticated session in Gmail');
  });

  it('includes field-specific prerequisites from data entry steps', () => {
    const steps = [
      makeStep({
        grouping_reason: 'fill_and_submit',
        source_event_ids: ['evt-1'],
      }),
    ];
    const events = [
      makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.input_change',
        label: 'Invoice Amount',
      }),
    ];
    const prereqs = generatePrerequisites(steps, events, ['NetSuite']);
    expect(prereqs.some(p => p.includes('Invoice Amount'))).toBe(true);
  });
});

// ─── Completion criteria ─────────────────────────────────────────────────────

describe('generateCompletionCriteria', () => {
  it('generates outcome-based criteria for submit workflows', () => {
    const steps = [
      makeStep({ grouping_reason: 'fill_and_submit', ordinal: 1 }),
    ];
    const criteria = generateCompletionCriteria('Invoice', steps, [makeEvent({})]);
    expect(criteria.some(c => c.includes('confirm'))).toBe(true);
  });

  it('adds error resolution criteria when errors present', () => {
    const steps = [
      makeStep({ grouping_reason: 'error_handling', ordinal: 1 }),
      makeStep({ grouping_reason: 'send_action', ordinal: 2 }),
    ];
    const criteria = generateCompletionCriteria('Test', steps, [makeEvent({})]);
    expect(criteria.some(c => c.includes('error'))).toBe(true);
  });
});

// ─── Phase label enrichment ──────────────────────────────────────────────────

describe('enrichPhaseLabel', () => {
  it('adds business context for form phases', () => {
    const steps = [
      { grouping_reason: 'fill_and_submit' },
      { grouping_reason: 'send_action' },
    ];
    const label = enrichPhaseLabel('NetSuite', steps);
    expect(label).toContain('NetSuite');
    expect(label).toContain('Submission');
  });

  it('labels navigation phases', () => {
    const steps = [
      { grouping_reason: 'click_then_navigate' },
      { grouping_reason: 'click_then_navigate' },
      { grouping_reason: 'click_then_navigate' },
    ];
    const label = enrichPhaseLabel('Gmail', steps);
    expect(label).toContain('Gmail');
    expect(label).toContain('Navigation');
  });

  it('returns system label for empty phases', () => {
    const label = enrichPhaseLabel('NetSuite', []);
    expect(label).toBe('NetSuite');
  });
});

// ─── Notes generation ────────────────────────────────────────────────────────

describe('generateNotes', () => {
  it('includes multi-system note when applicable', () => {
    const events = [
      makeEvent({ applicationLabel: 'App A' }),
      makeEvent({ applicationLabel: 'App B' }),
    ];
    const notes = generateNotes([], events, []);
    expect(notes.some(n => n.includes('2 systems'))).toBe(true);
  });

  it('includes high-friction note when applicable', () => {
    const friction = [
      { type: 'repeated_error' as const, label: 'Errors', severity: 'high' as const, stepOrdinals: [1] },
    ];
    const notes = generateNotes([], [], friction);
    expect(notes.some(n => n.includes('friction'))).toBe(true);
  });

  it('includes sensitive data note when applicable', () => {
    const events = [makeEvent({ isSensitive: true })];
    const notes = generateNotes([], events, []);
    expect(notes.some(n => n.includes('sensitive'))).toBe(true);
  });

  it('always includes source attribution', () => {
    const notes = generateNotes([], [], []);
    expect(notes.some(n => n.includes('evidence'))).toBe(true);
  });
});
