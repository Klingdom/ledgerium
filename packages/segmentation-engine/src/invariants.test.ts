/**
 * Invariant regression suite for @ledgerium/segmentation-engine.
 *
 * AUTHORITY: docs/invariants.md
 *
 * PURPOSE: Every assertion in this file locks a constant or versioned behaviour
 * that is documented in docs/invariants.md (or that represents a gap between
 * the docs and the actual source — noted explicitly per-group). A failing test
 * means either:
 *   (a) an undocumented breaking change has landed — revert it, OR
 *   (b) the value was intentionally changed — update docs/invariants.md, bump
 *       the relevant rule version, and obtain architectural approval before
 *       changing this test.
 *
 * Iteration: 051 — D-1 reverse-portfolio-drift clearance (segmentation-engine
 * surface touch). See CLAUDE.md § Meta-Review Cadence and MR-012.
 */

import { describe, it, expect } from 'vitest';

import {
  SEGMENTATION_RULE_VERSION,
  IDLE_GAP_MS,
  CLICK_NAV_WINDOW_MS,
  RAPID_CLICK_DEDUP_MS,
  calculateConfidence,
  segmentEvents,
} from './index.js';

import type {
  BoundaryReason,
  GroupingReason,
  SegmentableEvent,
} from './types.js';

// ---------------------------------------------------------------------------
// Fixture factory
// ---------------------------------------------------------------------------

let _seq = 0;

function makeEvent(overrides: Partial<SegmentableEvent> = {}): SegmentableEvent {
  _seq += 1;
  return {
    event_id: `inv-evt-${_seq}`,
    session_id: 'inv-session',
    t_ms: _seq * 1_000,
    event_type: 'interaction.click',
    normalization_meta: { sourceEventType: 'click' },
    ...overrides,
  };
}

/** Reset counter so fixtures are deterministic regardless of test-run order. */
function resetSeq() {
  _seq = 0;
}

// ---------------------------------------------------------------------------
// Group A — Rule version + magic-number constants
// docs/invariants.md §3.1
// ---------------------------------------------------------------------------

describe('Group A — rule version + magic-number constants (docs/invariants.md §3.1)', () => {
  it('SEGMENTATION_RULE_VERSION equals 1.1.0', () => {
    expect(
      SEGMENTATION_RULE_VERSION,
      [
        'docs/invariants.md §3.1 pins SEGMENTATION_RULE_VERSION = "1.1.0".',
        'Changing this value requires: architectural approval, a new rule version,',
        'and a docs/invariants.md update.',
        'NOTE: docs/invariants.md §3.1 currently says "1.0.0" — this is a known',
        'docs-drift. The source is authoritative; update docs before closing.',
      ].join(' '),
    ).toBe('1.1.0');
  });

  it('IDLE_GAP_MS equals 45 000', () => {
    expect(
      IDLE_GAP_MS,
      [
        'docs/invariants.md §3.1 pins IDLE_GAP_MS = 45_000.',
        'Changing this value requires: architectural approval, a new rule version,',
        'and a docs/invariants.md update.',
      ].join(' '),
    ).toBe(45_000);
  });

  it('CLICK_NAV_WINDOW_MS equals 2 500', () => {
    expect(
      CLICK_NAV_WINDOW_MS,
      [
        'docs/invariants.md §3.1 pins CLICK_NAV_WINDOW_MS = 2_500.',
        'Changing this value requires: architectural approval, a new rule version,',
        'and a docs/invariants.md update.',
      ].join(' '),
    ).toBe(2_500);
  });

  it('RAPID_CLICK_DEDUP_MS equals 1 000', () => {
    expect(
      RAPID_CLICK_DEDUP_MS,
      [
        'docs/invariants.md §3.1 pins RAPID_CLICK_DEDUP_MS = 1_000.',
        'Changing this value requires: architectural approval, a new rule version,',
        'and a docs/invariants.md update.',
      ].join(' '),
    ).toBe(1_000);
  });
});

// ---------------------------------------------------------------------------
// Group B — Confidence-score table
// docs/invariants.md §3.5
//
// NOTE: docs/invariants.md §3.5 documents 6 GroupingReasons.
// Three reasons — data_entry, send_action, file_action — are present in the
// source (rules.ts:calculateConfidence) but NOT listed in current docs.
// These 3 represent a docs-drift. The source is authoritative.
// The docs should be updated in a follow-up iteration.
// ---------------------------------------------------------------------------

describe('Group B — confidence-score table (docs/invariants.md §3.5)', () => {
  const DOCS_NOTE =
    'docs/invariants.md §3.5 pins this confidence score. ' +
    'Changing it requires architectural approval + new rule version + docs update.';

  const DRIFT_NOTE =
    'NOTE: data_entry / send_action / file_action are NOT currently listed in ' +
    'docs/invariants.md §3.5 — this is a known docs-drift. Source is authoritative.';

  function oneEvent(label?: string): SegmentableEvent[] {
    return [
      makeEvent({
        event_type: 'interaction.click',
        ...(label !== undefined && {
          target_summary: { label },
        }),
      }),
    ];
  }

  it('click_then_navigate → 0.85', () => {
    resetSeq();
    expect(
      calculateConfidence(oneEvent(), 'click_then_navigate'),
      DOCS_NOTE,
    ).toBe(0.85);
  });

  it('fill_and_submit → 0.9', () => {
    resetSeq();
    expect(
      calculateConfidence(oneEvent(), 'fill_and_submit'),
      DOCS_NOTE,
    ).toBe(0.9);
  });

  it('annotation → 1.0', () => {
    resetSeq();
    expect(
      calculateConfidence(oneEvent(), 'annotation'),
      DOCS_NOTE,
    ).toBe(1.0);
  });

  it('error_handling → 0.8', () => {
    resetSeq();
    expect(
      calculateConfidence(oneEvent(), 'error_handling'),
      DOCS_NOTE,
    ).toBe(0.8);
  });

  it('data_entry → 0.8 (docs-drift: not listed in docs/invariants.md §3.5)', () => {
    resetSeq();
    expect(
      calculateConfidence(oneEvent(), 'data_entry'),
      `${DOCS_NOTE} ${DRIFT_NOTE}`,
    ).toBe(0.8);
  });

  it('send_action → 0.9 (docs-drift: not listed in docs/invariants.md §3.5)', () => {
    resetSeq();
    expect(
      calculateConfidence(oneEvent(), 'send_action'),
      `${DOCS_NOTE} ${DRIFT_NOTE}`,
    ).toBe(0.9);
  });

  it('file_action → 0.85 (docs-drift: not listed in docs/invariants.md §3.5)', () => {
    resetSeq();
    expect(
      calculateConfidence(oneEvent(), 'file_action'),
      `${DOCS_NOTE} ${DRIFT_NOTE}`,
    ).toBe(0.85);
  });

  it('repeated_click_dedup → 0.7', () => {
    resetSeq();
    expect(
      calculateConfidence(oneEvent(), 'repeated_click_dedup'),
      DOCS_NOTE,
    ).toBe(0.7);
  });

  it('single_action with concrete label → 0.75', () => {
    resetSeq();
    expect(
      calculateConfidence(oneEvent('Submit'), 'single_action'),
      DOCS_NOTE,
    ).toBe(0.75);
  });

  it('single_action without label → 0.55', () => {
    resetSeq();
    // No target_summary → no label (omit the key entirely to satisfy
    // exactOptionalPropertyTypes — undefined and absent are equivalent here).
    const noLabelEvent: SegmentableEvent = {
      event_id: 'inv-no-label',
      session_id: 'inv-session',
      t_ms: 1_000,
      event_type: 'interaction.click',
      normalization_meta: { sourceEventType: 'click' },
      // target_summary intentionally omitted
    };
    expect(
      calculateConfidence([noLabelEvent], 'single_action'),
      DOCS_NOTE,
    ).toBe(0.55);
  });
});

// ---------------------------------------------------------------------------
// Group C — BoundaryReason union completeness
// docs/invariants.md §3.6
//
// The const-array satisfies pattern produces a TypeScript compile error if a
// new BoundaryReason member is added without updating this test.
//
// NOTE: docs/invariants.md §3.6 lists 7 members. The actual source union has
// 10 members. Three members — route_changed, target_changed, action_completed
// — are present in types.ts but NOT in the current docs. These represent a
// docs-drift. The source is authoritative; the docs should be updated.
// ---------------------------------------------------------------------------

const ALL_BOUNDARY_REASONS = [
  'form_submitted',
  'navigation_changed',
  'route_changed',
  'target_changed',
  'action_completed',
  'app_context_changed',
  'idle_gap',
  'user_annotation',
  'session_stop',
  'explicit_boundary',
] as const satisfies readonly BoundaryReason[];

// Reverse completeness check: if a new BoundaryReason is added to types.ts
// without updating ALL_BOUNDARY_REASONS, this produces a compile error.
type _BoundaryCompletenessCheck =
  Exclude<BoundaryReason, (typeof ALL_BOUNDARY_REASONS)[number]> extends never
    ? true
    : false;
const _boundaryCompletenessOk: _BoundaryCompletenessCheck = true;
void _boundaryCompletenessOk;

describe('Group C — BoundaryReason union completeness (docs/invariants.md §3.6)', () => {
  it('ALL_BOUNDARY_REASONS covers all 10 members of BoundaryReason', () => {
    expect(
      ALL_BOUNDARY_REASONS.length,
      [
        'docs/invariants.md §3.6 pins the BoundaryReason union membership.',
        'Adding a new member requires updating ALL_BOUNDARY_REASONS here,',
        'docs/invariants.md §3.6, and a rule-version bump.',
        'NOTE: docs/invariants.md §3.6 currently lists 7 members;',
        'source has 10. route_changed / target_changed / action_completed',
        'are present in types.ts but absent from docs — docs-drift to fix.',
      ].join(' '),
    ).toBe(10);
  });

  it('ALL_BOUNDARY_REASONS members are byte-identical to the source union', () => {
    const sorted = [...ALL_BOUNDARY_REASONS].sort();
    expect(
      sorted,
      [
        'docs/invariants.md §3.6 pins BoundaryReason member names.',
        'Renaming a member is a breaking change requiring architectural approval.',
      ].join(' '),
    ).toEqual([
      'action_completed',
      'app_context_changed',
      'explicit_boundary',
      'form_submitted',
      'idle_gap',
      'navigation_changed',
      'route_changed',
      'session_stop',
      'target_changed',
      'user_annotation',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Group D — GroupingReason union completeness
// docs/invariants.md §3.4
//
// NOTE: docs/invariants.md §3.4 documents 6 GroupingReasons.
// Three reasons — data_entry, send_action, file_action — are present in the
// source (types.ts:GroupingReason) but NOT listed in current docs.
// These represent a docs-drift. Source is authoritative.
// ---------------------------------------------------------------------------

const ALL_GROUPING_REASONS = [
  'fill_and_submit',
  'click_then_navigate',
  'repeated_click_dedup',
  'annotation',
  'error_handling',
  'data_entry',
  'send_action',
  'file_action',
  'single_action',
] as const satisfies readonly GroupingReason[];

// Reverse completeness check.
type _GroupingCompletenessCheck =
  Exclude<GroupingReason, (typeof ALL_GROUPING_REASONS)[number]> extends never
    ? true
    : false;
const _groupingCompletenessOk: _GroupingCompletenessCheck = true;
void _groupingCompletenessOk;

describe('Group D — GroupingReason union completeness (docs/invariants.md §3.4)', () => {
  it('ALL_GROUPING_REASONS covers all 9 members of GroupingReason', () => {
    expect(
      ALL_GROUPING_REASONS.length,
      [
        'docs/invariants.md §3.4 pins the GroupingReason union membership.',
        'Adding a new member requires updating ALL_GROUPING_REASONS here,',
        'docs/invariants.md §3.4, and a rule-version bump.',
        'NOTE: docs/invariants.md §3.4 currently lists 6 members;',
        'source has 9. data_entry / send_action / file_action are present',
        'in types.ts but absent from docs — docs-drift to fix.',
      ].join(' '),
    ).toBe(9);
  });

  it('ALL_GROUPING_REASONS members are byte-identical to the source union', () => {
    const sorted = [...ALL_GROUPING_REASONS].sort();
    expect(
      sorted,
      [
        'docs/invariants.md §3.4 pins GroupingReason member names.',
        'Renaming a member is a breaking change requiring architectural approval.',
      ].join(' '),
    ).toEqual([
      'annotation',
      'click_then_navigate',
      'data_entry',
      'error_handling',
      'file_action',
      'fill_and_submit',
      'repeated_click_dedup',
      'send_action',
      'single_action',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Group E — Step-ID format
// docs/invariants.md §3.2
// ---------------------------------------------------------------------------

describe('Group E — step_id format (docs/invariants.md §3.2)', () => {
  it('first step step_id matches /^[a-zA-Z0-9-]+-step-1$/', () => {
    resetSeq();
    const events: SegmentableEvent[] = [
      makeEvent({ event_type: 'interaction.click' }),
    ];
    const result = segmentEvents(events, 'test-session');
    expect(result.steps.length).toBeGreaterThanOrEqual(1);
    const firstStepId = result.steps[0]!.step_id;
    expect(
      firstStepId,
      [
        'docs/invariants.md §3.2 pins step_id format as {sessionId}-step-{ordinal}.',
        'The first step must have an ordinal of 1.',
        'Changing this format breaks cross-system step references.',
      ].join(' '),
    ).toMatch(/^[a-zA-Z0-9-]+-step-1$/);
  });

  it('second step step_id ends with -step-2', () => {
    resetSeq();
    // Two click events separated by enough time to force separate steps
    // (IDLE_GAP_MS = 45_000 ms; use a gap larger than that).
    const events: SegmentableEvent[] = [
      makeEvent({ event_type: 'interaction.click', t_ms: 1_000 }),
      makeEvent({ event_type: 'interaction.click', t_ms: 1_000 + 45_001 }),
    ];
    const result = segmentEvents(events, 'test-session');
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
    const secondStepId = result.steps[1]!.step_id;
    expect(
      secondStepId,
      [
        'docs/invariants.md §3.2 pins step_id format as {sessionId}-step-{ordinal}.',
        'The second step must have an ordinal of 2.',
        'Changing this format breaks cross-system step references.',
      ].join(' '),
    ).toMatch(/-step-2$/);
  });
});

