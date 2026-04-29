/**
 * Invariant regression suite for @ledgerium/normalization-engine.
 *
 * AUTHORITY: docs/invariants.md
 *
 * PURPOSE: Every assertion in this file locks a constant or versioned behaviour
 * documented in docs/invariants.md (or representing a drift between docs and
 * actual source — noted explicitly per group). A failing test means either:
 *   (a) an undocumented breaking change has landed — revert it, OR
 *   (b) the value was intentionally changed — update docs/invariants.md, bump
 *       the relevant rule version, and obtain architectural approval before
 *       changing this test.
 *
 * Iteration: 051 — D-1 reverse-portfolio-drift clearance (normalization-engine
 * surface touch). See CLAUDE.md § Meta-Review Cadence and MR-012.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  NORMALIZATION_RULE_VERSION,
  RAW_TO_CANONICAL_TYPE,
  normalizeEvent,
  normalizeSession,
} from './normalizer.js';

import type { RawEvent } from './normalizer.js';

// ---------------------------------------------------------------------------
// Fixture factory
// ---------------------------------------------------------------------------

let _seq = 0;

function makeRaw(overrides: Partial<RawEvent> = {}): RawEvent {
  _seq += 1;
  return {
    raw_event_id: `inv-raw-${_seq}`,
    session_id: 'inv-session',
    t_ms: _seq * 100,
    t_wall: new Date(_seq * 100).toISOString(),
    event_type: 'click',
    schema_version: '1.0.0',
    ...overrides,
  };
}

beforeEach(() => {
  _seq = 0;
});

// ---------------------------------------------------------------------------
// Group A — Rule version
// docs/invariants.md §6
// ---------------------------------------------------------------------------

describe('Group A — rule version (docs/invariants.md §6)', () => {
  it('NORMALIZATION_RULE_VERSION equals 1.0.0', () => {
    expect(
      NORMALIZATION_RULE_VERSION,
      [
        'docs/invariants.md §6 pins NORMALIZATION_RULE_VERSION = "1.0.0".',
        'Changing this value requires: architectural approval, a new rule version,',
        'and a docs/invariants.md update.',
      ].join(' '),
    ).toBe('1.0.0');
  });
});

// ---------------------------------------------------------------------------
// Group B — RAW_TO_CANONICAL_TYPE completeness
// docs/invariants.md §2.5
//
// NOTE: docs/invariants.md §2.5 lists 15 type mappings. The actual source
// (normalizer.ts:RAW_TO_CANONICAL_TYPE) has 28 mappings. Thirteen mappings —
// keyboard_intent, drag_started, drag_completed, window_blurred,
// window_focused, visibility_changed, modal_opened, modal_closed, toast_shown,
// loading_started, loading_finished, error_displayed, status_changed —
// are present in the source but NOT listed in the current docs.
// These represent a docs-drift. The source is authoritative;
// docs should be updated in a follow-up iteration.
// ---------------------------------------------------------------------------

describe('Group B — RAW_TO_CANONICAL_TYPE completeness (docs/invariants.md §2.5)', () => {
  const DOCS_NOTE =
    'docs/invariants.md §2.5 pins RAW_TO_CANONICAL_TYPE. ' +
    'Adding or removing a mapping is a breaking change requiring architectural approval. ' +
    'NOTE: docs/invariants.md §2.5 currently lists 15 mappings; source has 28. ' +
    '13 mappings are present in source but absent from docs — docs-drift to fix.';

  it('RAW_TO_CANONICAL_TYPE has exactly 28 entries', () => {
    expect(
      Object.keys(RAW_TO_CANONICAL_TYPE).length,
      DOCS_NOTE,
    ).toBe(28);
  });

  it('RAW_TO_CANONICAL_TYPE content is byte-identical to source', () => {
    expect(
      RAW_TO_CANONICAL_TYPE,
      DOCS_NOTE,
    ).toEqual({
      // Navigation
      tab_activated:      'navigation.tab_activated',
      url_changed:        'navigation.open_page',
      page_loaded:        'navigation.open_page',
      spa_route_changed:  'navigation.route_change',
      // Interaction
      click:              'interaction.click',
      dblclick:           'interaction.click',
      input_changed:      'interaction.input_change',
      form_submitted:     'interaction.submit',
      element_focused:    'interaction.input_change',
      element_blurred:    'interaction.input_change',
      keyboard_intent:    'interaction.keyboard_shortcut',
      drag_started:       'interaction.drag_started',
      drag_completed:     'interaction.drag_completed',
      // System — window / visibility
      window_blurred:     'system.window_blurred',
      window_focused:     'system.window_focused',
      visibility_changed: 'system.visibility_changed',
      // System — UI state changes
      modal_opened:       'system.modal_opened',
      modal_closed:       'system.modal_closed',
      toast_shown:        'system.toast_shown',
      loading_started:    'system.loading_started',
      loading_finished:   'system.loading_finished',
      error_displayed:    'system.error_displayed',
      status_changed:     'system.status_changed',
      // Session lifecycle
      session_start:      'session.started',
      session_pause:      'session.paused',
      session_resume:     'session.resumed',
      session_stop:       'session.stopped',
      user_annotation:    'session.annotation_added',
    });
  });
});

// ---------------------------------------------------------------------------
// Group C — Pre-normalization dedup constants
// docs/invariants.md §2.6
//
// The 300 ms rapid-click dedup threshold is hardcoded in normalizer.ts.
// These behavioural tests lock the observable contract.
// ---------------------------------------------------------------------------

describe('Group C — pre-normalization dedup constants (docs/invariants.md §2.6)', () => {
  const DOCS_NOTE_DEDUP =
    'docs/invariants.md §2.6 rule 1: rapid duplicate clicks on the same ' +
    'selector within 300 ms are collapsed. Changing the 300 ms threshold ' +
    'requires architectural approval and a docs/invariants.md update.';

  const DOCS_NOTE_FOCUS =
    'docs/invariants.md §2.6 rule 3: a net-zero focus/blur pair ' +
    '(focus immediately followed by blur with no intervening input) ' +
    'is dropped. Changing this rule requires architectural approval.';

  const DOCS_NOTE_FOCUS2 =
    'docs/invariants.md §2.6 rule 2: a superseded focus ' +
    '(focus immediately followed by another focus) — the first is dropped. ' +
    'Changing this rule requires architectural approval.';

  it('rapid duplicate click within 299 ms on same selector is dropped', () => {
    // Two click events 290 ms apart on the same selector → only one canonical.
    const raw1 = makeRaw({ event_type: 'click', target_selector: '#btn', t_ms: 1_000 });
    const raw2 = makeRaw({ event_type: 'click', target_selector: '#btn', t_ms: 1_290 });
    const result = normalizeSession([raw1, raw2]);
    const clickEvents = result.events.filter(
      (e) => e.event_type === 'interaction.click',
    );
    expect(
      clickEvents.length,
      DOCS_NOTE_DEDUP,
    ).toBe(1);
  });

  it('two clicks 310 ms apart on same selector are both kept', () => {
    // 310 ms >= 300 ms threshold → both survive dedup.
    const raw1 = makeRaw({ event_type: 'click', target_selector: '#btn', t_ms: 1_000 });
    const raw2 = makeRaw({ event_type: 'click', target_selector: '#btn', t_ms: 1_310 });
    const result = normalizeSession([raw1, raw2]);
    const clickEvents = result.events.filter(
      (e) => e.event_type === 'interaction.click',
    );
    expect(
      clickEvents.length,
      DOCS_NOTE_DEDUP,
    ).toBe(2);
  });

  it('net-zero focus/blur pair (focus → immediate blur, no input) is dropped', () => {
    // element_focused immediately followed by element_blurred → both dropped.
    const rawFocus = makeRaw({ event_type: 'element_focused' });
    const rawBlur  = makeRaw({ event_type: 'element_blurred' });
    const result = normalizeSession([rawFocus, rawBlur]);
    // element_focused and element_blurred both map to interaction.input_change,
    // so a dropped pair means zero interaction.input_change events.
    const inputEvents = result.events.filter(
      (e) => e.event_type === 'interaction.input_change',
    );
    expect(
      inputEvents.length,
      DOCS_NOTE_FOCUS,
    ).toBe(0);
  });

  it('superseded focus (focus → focus) drops the first focus', () => {
    // Two consecutive element_focused events → only the second survives.
    const rawFocus1 = makeRaw({ event_type: 'element_focused' });
    const rawFocus2 = makeRaw({ event_type: 'element_focused' });
    const result = normalizeSession([rawFocus1, rawFocus2]);
    const inputEvents = result.events.filter(
      (e) => e.event_type === 'interaction.input_change',
    );
    expect(
      inputEvents.length,
      DOCS_NOTE_FOCUS2,
    ).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Group D — Sensitive-target detection regex
// docs/invariants.md §5.4
//
// The regex /password|passwd|secret|token|api[_-]?key|credit|cvv|ssn/i is
// module-private in normalizer.ts. We verify it through the observable
// contract: a target_selector matching the pattern causes the canonical
// event_type to become 'system.redaction_applied'.
// ---------------------------------------------------------------------------

describe('Group D — sensitive-target detection regex (docs/invariants.md §5.4)', () => {
  const DOCS_NOTE_SENSITIVE =
    'docs/invariants.md §5.4 pins the SENSITIVE_SELECTOR_RE pattern: ' +
    '/password|passwd|secret|token|api[_-]?key|credit|cvv|ssn/i. ' +
    'A target_selector matching this pattern must yield event_type = ' +
    '"system.redaction_applied". Changing the regex requires architectural ' +
    'approval and a docs/invariants.md update.';

  it('target_selector containing "password" triggers redaction', () => {
    const raw = makeRaw({
      event_type: 'click',
      target_selector: 'user-password-input',
    });
    const { canonical } = normalizeEvent(raw);
    expect(
      canonical?.event_type,
      DOCS_NOTE_SENSITIVE,
    ).toBe('system.redaction_applied');
  });

  it('target_selector containing "secret" triggers redaction', () => {
    const raw = makeRaw({
      event_type: 'input_changed',
      target_selector: 'input[name="secret_key"]',
    });
    const { canonical } = normalizeEvent(raw);
    expect(
      canonical?.event_type,
      DOCS_NOTE_SENSITIVE,
    ).toBe('system.redaction_applied');
  });

  it('target_selector containing "credit" triggers redaction', () => {
    const raw = makeRaw({
      event_type: 'click',
      target_selector: '#credit-card-number',
    });
    const { canonical } = normalizeEvent(raw);
    expect(
      canonical?.event_type,
      DOCS_NOTE_SENSITIVE,
    ).toBe('system.redaction_applied');
  });

  it('target_selector containing "api_key" triggers redaction', () => {
    const raw = makeRaw({
      event_type: 'click',
      target_selector: 'input.api_key',
    });
    const { canonical } = normalizeEvent(raw);
    expect(
      canonical?.event_type,
      DOCS_NOTE_SENSITIVE,
    ).toBe('system.redaction_applied');
  });

  it('target_selector containing "cvv" triggers redaction', () => {
    const raw = makeRaw({
      event_type: 'click',
      target_selector: 'input#cvv',
    });
    const { canonical } = normalizeEvent(raw);
    expect(
      canonical?.event_type,
      DOCS_NOTE_SENSITIVE,
    ).toBe('system.redaction_applied');
  });

  it('target_selector containing "ssn" triggers redaction', () => {
    const raw = makeRaw({
      event_type: 'click',
      target_selector: '#ssn-field',
    });
    const { canonical } = normalizeEvent(raw);
    expect(
      canonical?.event_type,
      DOCS_NOTE_SENSITIVE,
    ).toBe('system.redaction_applied');
  });

  it('benign target_selector does NOT trigger redaction', () => {
    const raw = makeRaw({
      event_type: 'click',
      target_selector: '#submit-button',
    });
    const { canonical } = normalizeEvent(raw);
    expect(
      canonical?.event_type,
      'A non-sensitive selector must not be redacted (docs/invariants.md §5.4).',
    ).toBe('interaction.click');
  });
});
