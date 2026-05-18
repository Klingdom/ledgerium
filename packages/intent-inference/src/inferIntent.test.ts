/**
 * Behavior fixtures for `inferIntent()` (PATHE-P02 §A7).
 *
 * 6 named scenarios validating end-to-end verb+object+label+confidence
 * behavior across representative input shapes.
 *
 * These tests complement the structural invariant tests in `invariants.test.ts`.
 * Each fixture exercises a distinct evidence-path to ensure the full pipeline
 * produces the expected observable outputs.
 *
 * Determinism contract verified: each fixture is called twice; results must be
 * structurally identical (via `toEqual`).
 *
 * @see inferIntent.ts — orchestrator under test
 * @see invariants.test.ts — structural/invariant tests (Groups A-E)
 */

import { describe, it, expect } from 'vitest';
import { inferIntent, INTENT_INFERENCE_VERSION } from './inferIntent.js';
import type { IntentInferenceInput } from './types.js';

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Minimal valid input; individual fixtures override specific fields.
 */
function makeInput(overrides: Partial<IntentInferenceInput> = {}): IntentInferenceInput {
  return {
    groupingReason:   'action_button',
    elementText:      null,
    elementRole:      null,
    elementType:      null,
    isSensitive:      false,
    routeTemplate:    null,
    pageTitle:        null,
    applicationLabel: null,
    selector:         null,
    neighborContext:  null,
    contextWindowLabels: null,
    ...overrides,
  };
}

// ── Fixture 1: Submit button on invoice page ──────────────────────────────────

describe('Fixture 1 — submit button on invoice page', () => {
  const input = makeInput({
    groupingReason:   'action_button',
    elementText:      'Submit Invoice',
    elementRole:      'button',
    elementType:      'submit',
    routeTemplate:    '/invoices/:id/review',
    pageTitle:        'Invoice #1042',
  });

  it('resolves verb to "submit"', () => {
    const output = inferIntent(input);
    expect(output.verb).toBe('submit');
  });

  it('resolves object to "invoice"', () => {
    const output = inferIntent(input);
    expect(output.object).toBe('invoice');
  });

  it('produces normalizedLabel "Submit invoice"', () => {
    const output = inferIntent(input);
    expect(output.normalizedLabel).toBe('Submit invoice');
  });

  it('label length is ≤ 60 characters', () => {
    const output = inferIntent(input);
    expect(output.normalizedLabel.length).toBeLessThanOrEqual(60);
  });

  it('confidence > 0.55 (multiple signals agree)', () => {
    const output = inferIntent(input);
    expect(output.normalizedLabelConfidence).toBeGreaterThan(0.55);
  });

  it('lowDataFlag is false (high-evidence case)', () => {
    const output = inferIntent(input);
    expect(output.lowDataFlag).toBe(false);
  });

  it('inferenceVersion equals INTENT_INFERENCE_VERSION', () => {
    const output = inferIntent(input);
    expect(output.inferenceVersion).toBe(INTENT_INFERENCE_VERSION);
  });

  it('produces identical results on second call (determinism)', () => {
    const first  = inferIntent(input);
    const second = inferIntent(input);
    expect(second).toEqual(first);
  });
});

// ── Fixture 2: Search input field ─────────────────────────────────────────────

describe('Fixture 2 — search input field', () => {
  const input = makeInput({
    groupingReason:   'form_field',
    elementText:      null,
    elementRole:      'searchbox',
    elementType:      'search',
    routeTemplate:    '/customers',
    pageTitle:        'Customer List',
    selector:         'input[name="search"]',
  });

  it('resolves verb to "search" (from formFieldName / grouping reason)', () => {
    const output = inferIntent(input);
    // search comes from selector name="search" (formFieldName signal)
    // or pageTitle "Customer List" for object
    expect(output.verb).toBe('search');
  });

  it('resolves object to "customer" (from pageTitle "Customer List")', () => {
    const output = inferIntent(input);
    expect(output.object).toBe('customer');
  });

  it('normalizedLabel is "Search customer"', () => {
    const output = inferIntent(input);
    expect(output.normalizedLabel).toBe('Search customer');
  });

  it('produces identical results on second call (determinism)', () => {
    const first  = inferIntent(input);
    const second = inferIntent(input);
    expect(second).toEqual(first);
  });
});

// ── Fixture 3: Approve button in approval modal ───────────────────────────────

describe('Fixture 3 — approve button in approval modal', () => {
  const input = makeInput({
    groupingReason:   'action_button',
    elementText:      'Approve',
    elementRole:      'button',
    elementType:      'button',
    routeTemplate:    '/approvals/:id',
    pageTitle:        'Approval Request #77',
    neighborContext:  {
      modalTitle:       'Approve Purchase Request',
      tableHeader:      null,
      breadcrumbTrail:  ['Home', 'Approvals', 'Request #77'],
      activeTabLabel:   null,
      nearbyLabels:     [],
    },
  });

  it('resolves verb to "approve" (element text "Approve" wins)', () => {
    const output = inferIntent(input);
    expect(output.verb).toBe('approve');
  });

  it('resolves object to "approval"', () => {
    const output = inferIntent(input);
    expect(output.object).toBe('approval');
  });

  it('produces normalizedLabel "Approve approval"', () => {
    const output = inferIntent(input);
    expect(output.normalizedLabel).toBe('Approve approval');
  });

  it('lowDataFlag is false (multiple signals: elementText + url + modal)', () => {
    const output = inferIntent(input);
    expect(output.lowDataFlag).toBe(false);
  });

  it('evidenceSignals contains at least one signal with inferredVerb "approve"', () => {
    const output = inferIntent(input);
    const approveSignal = output.evidenceSignals.find(s => s.inferredVerb === 'approve');
    expect(approveSignal).toBeDefined();
  });

  it('produces identical results on second call (determinism)', () => {
    const first  = inferIntent(input);
    const second = inferIntent(input);
    expect(second).toEqual(first);
  });
});

// ── Fixture 4: Navigation event ───────────────────────────────────────────────

describe('Fixture 4 — navigation event (route_change)', () => {
  const input = makeInput({
    groupingReason:   'route_changed',
    elementText:      null,
    elementRole:      null,
    elementType:      null,
    routeTemplate:    '/dashboard',
    pageTitle:        'Dashboard',
  });

  it('resolves verb to "navigate"', () => {
    const output = inferIntent(input);
    expect(output.verb).toBe('navigate');
  });

  it('resolves object to "dashboard" (from pageTitle / routeTemplate)', () => {
    const output = inferIntent(input);
    expect(output.object).toBe('dashboard');
  });

  it('normalizedLabel is "Navigate dashboard"', () => {
    const output = inferIntent(input);
    expect(output.normalizedLabel).toBe('Navigate dashboard');
  });

  it('produces identical results on second call (determinism)', () => {
    const first  = inferIntent(input);
    const second = inferIntent(input);
    expect(second).toEqual(first);
  });
});

// ── Fixture 5: Sensitive field → reduced confidence ───────────────────────────

describe('Fixture 5 — sensitive field input', () => {
  const nonSensitiveInput = makeInput({
    groupingReason:  'form_field',
    elementText:     'Account Number',
    elementRole:     'textbox',
    elementType:     'text',
    isSensitive:     false,
    routeTemplate:   '/accounts/:id/edit',
    pageTitle:       'Edit Account',
  });

  const sensitiveInput = makeInput({
    ...nonSensitiveInput,
    isSensitive: true,
  });

  it('sensitive flag reduces normalizedLabelConfidence', () => {
    const nonSensitive = inferIntent(nonSensitiveInput);
    const sensitive    = inferIntent(sensitiveInput);
    expect(sensitive.normalizedLabelConfidence).toBeLessThan(
      nonSensitive.normalizedLabelConfidence,
    );
  });

  it('sensitive result has lower or equal confidence than non-sensitive', () => {
    const nonSensitive = inferIntent(nonSensitiveInput);
    const sensitive    = inferIntent(sensitiveInput);
    // Sensitivity penalty is -0.20 (§A5)
    expect(sensitive.normalizedLabelConfidence).toBeLessThanOrEqual(
      nonSensitive.normalizedLabelConfidence,
    );
  });

  it('sensitive low-confidence result has lowDataFlag === true when confidence < 0.55', () => {
    const output = inferIntent(sensitiveInput);
    // Audit-honesty IFF invariant must hold
    expect(output.lowDataFlag).toBe(output.normalizedLabelConfidence < 0.55);
  });

  it('verb and object are unaffected by sensitivity flag', () => {
    const nonSensitive = inferIntent(nonSensitiveInput);
    const sensitive    = inferIntent(sensitiveInput);
    // Sensitivity affects only confidence, not verb/object resolution
    expect(sensitive.verb).toBe(nonSensitive.verb);
    expect(sensitive.object).toBe(nonSensitive.object);
  });

  it('produces identical results on second call for sensitive input (determinism)', () => {
    const first  = inferIntent(sensitiveInput);
    const second = inferIntent(sensitiveInput);
    expect(second).toEqual(first);
  });
});

// ── Fixture 6: No-evidence input → fallback label ────────────────────────────

describe('Fixture 6 — no-evidence input (all null)', () => {
  const input = makeInput({
    groupingReason:   'idle_gap',
    elementText:      null,
    elementRole:      null,
    elementType:      null,
    isSensitive:      false,
    routeTemplate:    null,
    pageTitle:        null,
    applicationLabel: null,
    selector:         null,
    neighborContext:  null,
    contextWindowLabels: null,
  });

  it('verb is null (no evidence to classify)', () => {
    const output = inferIntent(input);
    expect(output.verb).toBeNull();
  });

  it('object is null (no evidence to extract)', () => {
    const output = inferIntent(input);
    expect(output.object).toBeNull();
  });

  it('normalizedLabel is "Interact with element" (§A4 tier 4 fallback)', () => {
    const output = inferIntent(input);
    expect(output.normalizedLabel).toBe('Interact with element');
  });

  it('lowDataFlag is true (minimum confidence with no signals)', () => {
    const output = inferIntent(input);
    expect(output.lowDataFlag).toBe(true);
  });

  it('normalizedLabelConfidence < 0.55 (IFF lowDataFlag)', () => {
    const output = inferIntent(input);
    expect(output.normalizedLabelConfidence).toBeLessThan(0.55);
  });

  it('evidenceSignals array is empty (no source text to extract)', () => {
    const output = inferIntent(input);
    // With all inputs null, no text evidence can be extracted — signals array is empty.
    // The pipeline ran; it simply produced zero signals, which is the honest result.
    expect(output.evidenceSignals.length).toBe(0);
  });

  it('produces identical results on second call (determinism)', () => {
    const first  = inferIntent(input);
    const second = inferIntent(input);
    expect(second).toEqual(first);
  });
});
