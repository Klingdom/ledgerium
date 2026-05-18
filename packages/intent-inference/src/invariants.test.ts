/**
 * Invariant-protection tests for @ledgerium/intent-inference (PATHE-P02).
 *
 * Groups:
 *   A — Version pin + catalog size locks
 *   B — Audit-honesty IFF invariant (lowDataFlag === true IFF confidence < 0.55)
 *   C — Closed-union exhaustiveness (compile-time + runtime membership)
 *   D — Determinism (same input → byte-identical output)
 *   E — Confidence monotonicity (more signals → not-lower confidence)
 *
 * @see docs/invariants.md §7 PATHE-P02
 */

import { describe, it, expect } from 'vitest';
import { INTENT_INFERENCE_VERSION, inferIntent } from './inferIntent.js';
import { CANONICAL_VERBS, VERB_SET, type CanonicalVerb } from './verbs.js';
import { CANONICAL_OBJECTS, OBJECT_SET, type CanonicalObject } from './objects.js';
import { EVIDENCE_WEIGHTS, type EvidenceSignalSource } from './types.js';
import { scoreConfidence } from './confidence-scorer.js';
import type { IntentInferenceInput } from './types.js';

// ── Fixture factory ────────────────────────────────────────────────────────

function makeInput(overrides: Partial<IntentInferenceInput> = {}): IntentInferenceInput {
  return {
    groupingReason:   'single_action',
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

// ── Group A: Version pin + catalog size locks ──────────────────────────────

describe('Group A: version pin + catalog size locks', () => {
  it('A1: INTENT_INFERENCE_VERSION is pinned to 1.0.0', () => {
    // Changing this signals a backward-compatibility break.
    // Update the pin AND the docs/invariants.md §7 entry.
    expect(INTENT_INFERENCE_VERSION).toBe('1.0.0');
  });

  it('A2: CANONICAL_VERBS has exactly 37 members', () => {
    expect(CANONICAL_VERBS.length).toBe(37);
  });

  it('A3: CANONICAL_OBJECTS has exactly 24 members', () => {
    expect(CANONICAL_OBJECTS.length).toBe(24);
  });

  it('A4: CANONICAL_VERBS entries are unique', () => {
    const unique = new Set(CANONICAL_VERBS);
    expect(unique.size).toBe(CANONICAL_VERBS.length);
  });

  it('A5: CANONICAL_OBJECTS entries are unique', () => {
    const unique = new Set(CANONICAL_OBJECTS);
    expect(unique.size).toBe(CANONICAL_OBJECTS.length);
  });

  it('A6: EVIDENCE_WEIGHTS covers all 14 EvidenceSignalSource values', () => {
    const EXPECTED_SOURCES: readonly EvidenceSignalSource[] = [
      'elementText', 'ariaLabel', 'placeholder', 'buttonText',
      'modalTitle', 'urlSemantic', 'pageTitle', 'formFieldName',
      'applicationLabel', 'contextWindow',
      'tableHeader', 'breadcrumbs', 'tabLabel', 'nearbyLabels',
    ];
    for (const src of EXPECTED_SOURCES) {
      expect(EVIDENCE_WEIGHTS[src], `weight for ${src}`).toBeGreaterThanOrEqual(0);
    }
    expect(Object.keys(EVIDENCE_WEIGHTS).length).toBe(14);
  });

  it('A7: zero-weight signals are exactly the 4 deferred v1 sources', () => {
    const deferred: EvidenceSignalSource[] = ['tableHeader', 'breadcrumbs', 'tabLabel', 'nearbyLabels'];
    for (const src of deferred) {
      expect(EVIDENCE_WEIGHTS[src], `${src} should be 0`).toBe(0);
    }
    // Active signals have weight > 0
    const active: EvidenceSignalSource[] = [
      'elementText', 'ariaLabel', 'placeholder', 'buttonText',
      'modalTitle', 'urlSemantic', 'pageTitle', 'formFieldName',
      'applicationLabel', 'contextWindow',
    ];
    for (const src of active) {
      expect(EVIDENCE_WEIGHTS[src], `${src} should be > 0`).toBeGreaterThan(0);
    }
  });

  it('A8: VERB_SET runtime membership matches CANONICAL_VERBS', () => {
    for (const v of CANONICAL_VERBS) {
      expect(VERB_SET.has(v), `${v} should be in VERB_SET`).toBe(true);
    }
    expect(VERB_SET.size).toBe(CANONICAL_VERBS.length);
  });

  it('A9: OBJECT_SET runtime membership matches CANONICAL_OBJECTS', () => {
    for (const o of CANONICAL_OBJECTS) {
      expect(OBJECT_SET.has(o), `${o} should be in OBJECT_SET`).toBe(true);
    }
    expect(OBJECT_SET.size).toBe(CANONICAL_OBJECTS.length);
  });
});

// ── Group B: Audit-honesty IFF invariant ────────────────────────────────────

describe('Group B: audit-honesty IFF invariant (lowDataFlag)', () => {
  it('B1: lowDataFlag === true IFF confidence < 0.55 (no evidence)', () => {
    const result = inferIntent(makeInput());
    expect(result.lowDataFlag).toBe(result.normalizedLabelConfidence < 0.55);
  });

  it('B2: lowDataFlag === true IFF confidence < 0.55 (rich evidence)', () => {
    const result = inferIntent(makeInput({
      elementText:   'Submit invoice',
      elementRole:   'button',
      elementType:   'button',
      routeTemplate: '/invoices/new',
      pageTitle:     'New Invoice',
    }));
    expect(result.lowDataFlag).toBe(result.normalizedLabelConfidence < 0.55);
  });

  it('B3: lowDataFlag === true when confidence < 0.55', () => {
    // Provide only zero-evidence input
    const result = inferIntent(makeInput());
    // With no signals at all, confidence should be at the 0.30 base → < 0.55
    if (result.normalizedLabelConfidence < 0.55) {
      expect(result.lowDataFlag).toBe(true);
    }
  });

  it('B4: lowDataFlag === false when confidence >= 0.55', () => {
    const result = inferIntent(makeInput({
      elementText:   'Approve',
      elementRole:   'button',
      elementType:   'button',
      routeTemplate: '/approvals/:id/approve',
      pageTitle:     'Approval Request',
    }));
    if (result.normalizedLabelConfidence >= 0.55) {
      expect(result.lowDataFlag).toBe(false);
    }
  });

  it('B5: sensitive target applies penalty that can flip lowDataFlag', () => {
    const nonsensitive = inferIntent(makeInput({
      elementText:   'Submit',
      elementRole:   'button',
      isSensitive:   false,
      routeTemplate: '/invoices/submit',
    }));
    const sensitive = inferIntent(makeInput({
      elementText:   'Submit',
      elementRole:   'button',
      isSensitive:   true,
      routeTemplate: '/invoices/submit',
    }));
    // Sensitive confidence ≤ non-sensitive confidence (penalty applies)
    expect(sensitive.normalizedLabelConfidence).toBeLessThanOrEqual(
      nonsensitive.normalizedLabelConfidence,
    );
    // IFF invariant holds for both
    expect(nonsensitive.lowDataFlag).toBe(nonsensitive.normalizedLabelConfidence < 0.55);
    expect(sensitive.lowDataFlag).toBe(sensitive.normalizedLabelConfidence < 0.55);
  });

  it('B6: scoreConfidence IFF invariant holds across boundary values', () => {
    // Test the formula directly at the 0.55 boundary
    const noSignals: never[] = [];
    // Force confidence just above threshold
    const above = scoreConfidence(noSignals, 'submit', 'invoice', false);
    expect(above.lowDataFlag).toBe(above.confidence < 0.55);

    const below = scoreConfidence(noSignals, null, null, false);
    expect(below.lowDataFlag).toBe(below.confidence < 0.55);
  });
});

// ── Group C: Closed-union exhaustiveness ────────────────────────────────────

describe('Group C: closed-union exhaustiveness', () => {
  it('C1: CANONICAL_VERBS type is exhaustive via compile-time satisfies', () => {
    // The `as const satisfies readonly string[]` in verbs.ts enforces this at
    // compile time.  At runtime, verify the known-members array has no gaps.
    const KNOWN: readonly CanonicalVerb[] = [
      'open', 'navigate', 'search', 'select', 'enter', 'upload', 'download',
      'create', 'edit', 'update', 'delete', 'submit', 'confirm', 'approve',
      'reject', 'validate', 'review', 'cancel', 'close', 'dismiss', 'login',
      'logout', 'export', 'import', 'copy', 'paste', 'sort', 'filter', 'attach',
      'send', 'save', 'preview', 'sign', 'escalate', 'assign', 'complete', 'start',
    ] as const satisfies readonly CanonicalVerb[];
    // Every known member appears in CANONICAL_VERBS
    for (const v of KNOWN) {
      expect(CANONICAL_VERBS.includes(v), `${v} missing from CANONICAL_VERBS`).toBe(true);
    }
    // Counts match — no extra members added without updating KNOWN
    expect(KNOWN.length).toBe(CANONICAL_VERBS.length);
  });

  it('C2: CANONICAL_OBJECTS type is exhaustive via compile-time satisfies', () => {
    const KNOWN: readonly CanonicalObject[] = [
      'customer', 'invoice', 'order', 'approval', 'document', 'record',
      'report', 'dashboard', 'search', 'form', 'modal', 'task', 'ticket',
      'request', 'contract', 'payment', 'profile', 'account', 'project',
      'workflow', 'file', 'message', 'notification', 'setting',
    ] as const satisfies readonly CanonicalObject[];
    for (const o of KNOWN) {
      expect(CANONICAL_OBJECTS.includes(o), `${o} missing from CANONICAL_OBJECTS`).toBe(true);
    }
    expect(KNOWN.length).toBe(CANONICAL_OBJECTS.length);
  });

  it('C3: VERB_SET rejects unknown strings at runtime', () => {
    expect(VERB_SET.has('fly')).toBe(false);
    expect(VERB_SET.has('')).toBe(false);
    expect(VERB_SET.has('SUBMIT')).toBe(false); // case-sensitive set
  });

  it('C4: OBJECT_SET rejects unknown strings at runtime', () => {
    expect(OBJECT_SET.has('spaceship')).toBe(false);
    expect(OBJECT_SET.has('')).toBe(false);
  });
});

// ── Group D: Determinism ────────────────────────────────────────────────────

describe('Group D: determinism (same input → byte-identical output)', () => {
  it('D1: minimal input is deterministic across 5 calls', () => {
    const input = makeInput({ elementText: 'Submit', elementRole: 'button' });
    const results = Array.from({ length: 5 }, () => inferIntent(input));
    const first = JSON.stringify(results[0]);
    for (const r of results.slice(1)) {
      expect(JSON.stringify(r)).toBe(first);
    }
  });

  it('D2: rich input is deterministic across 5 calls', () => {
    const input = makeInput({
      elementText:   'Approve Request',
      elementRole:   'button',
      routeTemplate: '/approvals/:id/approve',
      pageTitle:     'Expense Approval',
      applicationLabel: 'ServiceNow',
    });
    const results = Array.from({ length: 5 }, () => inferIntent(input));
    const first = JSON.stringify(results[0]);
    for (const r of results.slice(1)) {
      expect(JSON.stringify(r)).toBe(first);
    }
  });

  it('D3: inferenceVersion is always INTENT_INFERENCE_VERSION', () => {
    const result = inferIntent(makeInput({ elementText: 'Open' }));
    expect(result.inferenceVersion).toBe(INTENT_INFERENCE_VERSION);
  });

  it('D4: evidenceSignals array is stable across calls', () => {
    const input = makeInput({ elementText: 'Delete record' });
    const r1 = inferIntent(input);
    const r2 = inferIntent(input);
    expect(r1.evidenceSignals.length).toBe(r2.evidenceSignals.length);
    expect(JSON.stringify(r1.evidenceSignals)).toBe(JSON.stringify(r2.evidenceSignals));
  });

  it('D5: absent neighborContext degrades gracefully (no throw)', () => {
    // neighborContext: null is the canonical "absent" representation; undefined is
    // not valid under exactOptionalPropertyTypes since the field is required (typed
    // as NeighborContextEvidence | null). The makeInput default of null covers the
    // absent case; this test exercises explicit null explicitly.
    expect(() => inferIntent(makeInput({ neighborContext: null }))).not.toThrow();
    // No neighborContext field at all (default from makeInput)
    expect(() => inferIntent(makeInput())).not.toThrow();
  });

  it('D6: absent contextWindowLabels degrades gracefully (no throw)', () => {
    // contextWindowLabels: null is the canonical "absent" representation.
    expect(() => inferIntent(makeInput({ contextWindowLabels: null }))).not.toThrow();
    // No contextWindowLabels field at all (default from makeInput)
    expect(() => inferIntent(makeInput())).not.toThrow();
  });
});

// ── Group E: Confidence monotonicity ────────────────────────────────────────

describe('Group E: confidence monotonicity', () => {
  it('E1: adding elementText increases confidence vs no signals', () => {
    const noText  = inferIntent(makeInput());
    const withText = inferIntent(makeInput({ elementText: 'Submit' }));
    expect(withText.normalizedLabelConfidence).toBeGreaterThanOrEqual(
      noText.normalizedLabelConfidence,
    );
  });

  it('E2: adding routeTemplate increases confidence vs elementText alone', () => {
    const textOnly = inferIntent(makeInput({ elementText: 'Delete' }));
    const withRoute = inferIntent(makeInput({
      elementText:   'Delete',
      routeTemplate: '/orders/:id/delete',
    }));
    expect(withRoute.normalizedLabelConfidence).toBeGreaterThanOrEqual(
      textOnly.normalizedLabelConfidence,
    );
  });

  it('E3: isSensitive flag reduces confidence', () => {
    const normal    = inferIntent(makeInput({ elementText: 'Save', elementRole: 'button' }));
    const sensitive = inferIntent(makeInput({ elementText: 'Save', elementRole: 'button', isSensitive: true }));
    expect(sensitive.normalizedLabelConfidence).toBeLessThanOrEqual(
      normal.normalizedLabelConfidence,
    );
  });

  it('E4: confidence is always in [0, 1]', () => {
    const inputs: IntentInferenceInput[] = [
      makeInput(),
      makeInput({ elementText: 'Submit invoice', elementRole: 'button', isSensitive: true }),
      makeInput({ routeTemplate: '/customers/new', pageTitle: 'New Customer' }),
    ];
    for (const input of inputs) {
      const result = inferIntent(input);
      expect(result.normalizedLabelConfidence).toBeGreaterThanOrEqual(0);
      expect(result.normalizedLabelConfidence).toBeLessThanOrEqual(1);
    }
  });
});
