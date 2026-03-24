/**
 * Tests for the stateless batch segmenter: segmentEvents.
 */

import { describe, it, expect } from 'vitest';

import { segmentEvents } from './batch-segmenter.js';
import type { SegmentableEvent } from './types.js';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeEvent(overrides?: Partial<SegmentableEvent>): SegmentableEvent {
  return {
    event_id: 'test-evt-1',
    event_type: 'interaction.click',
    t_ms: 0,
    session_id: 'test-session',
    normalization_meta: { sourceEventType: 'click' },
    ...overrides,
  };
}

function makeNavEvent(
  overrides?: Partial<SegmentableEvent>,
): SegmentableEvent {
  return makeEvent({
    event_id: 'nav-evt-1',
    event_type: 'navigation.open_page',
    page_context: {
      domain: 'app.com',
      routeTemplate: '/dashboard',
      applicationLabel: 'App',
      pageTitle: 'Dashboard',
    },
    ...overrides,
  });
}

const SESSION_ID = 'sess-abc';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('segmentEvents', () => {
  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  it('empty array returns zero steps, zero event count, and no warnings', () => {
    const result = segmentEvents([], SESSION_ID);
    expect(result.steps).toEqual([]);
    expect(result.event_count).toBe(0);
    expect(result.warnings).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Single events
  // -------------------------------------------------------------------------

  it('single interaction.click produces one step with single_action grouping and confidence ≥ 0.5', () => {
    const events = [makeEvent({ event_id: 'evt-1' })];
    const result = segmentEvents(events, SESSION_ID);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]!.grouping_reason).toBe('single_action');
    expect(result.steps[0]!.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('single interaction.submit produces one step with boundary_reason "form_submitted"', () => {
    const events = [
      makeEvent({ event_id: 'evt-1', event_type: 'interaction.submit' }),
    ];
    const result = segmentEvents(events, SESSION_ID);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]!.boundary_reason).toBe('form_submitted');
  });

  // -------------------------------------------------------------------------
  // Grouping: fill_and_submit
  // -------------------------------------------------------------------------

  it('input_change followed by submit within 500ms produces one fill_and_submit step with confidence 0.9', () => {
    const events = [
      makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.input_change',
        t_ms: 0,
      }),
      makeEvent({
        event_id: 'evt-2',
        event_type: 'interaction.submit',
        t_ms: 500,
      }),
    ];
    const result = segmentEvents(events, SESSION_ID);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]!.grouping_reason).toBe('fill_and_submit');
    expect(result.steps[0]!.confidence).toBe(0.9);
  });

  // -------------------------------------------------------------------------
  // Grouping: click_then_navigate
  // -------------------------------------------------------------------------

  it('click + navigation.open_page within 2500ms produces one click_then_navigate step', () => {
    const events = [
      makeEvent({ event_id: 'evt-1', event_type: 'interaction.click', t_ms: 0 }),
      makeNavEvent({ event_id: 'evt-2', t_ms: 2000 }),
    ];
    const result = segmentEvents(events, SESSION_ID);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]!.grouping_reason).toBe('click_then_navigate');
  });

  it('click + navigation.open_page outside 2500ms window produces one step classified as single_action, not click_then_navigate', () => {
    // The nav event is outside CLICK_NAV_WINDOW_MS (3000ms > 2500ms) so the
    // click_then_navigate pattern does not match. Both events accumulate into
    // the same step (no boundary fires between them) and fall through to
    // single_action classification.
    const events = [
      makeEvent({ event_id: 'evt-1', event_type: 'interaction.click', t_ms: 0 }),
      makeNavEvent({ event_id: 'evt-2', t_ms: 3000 }),
    ];
    const result = segmentEvents(events, SESSION_ID);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]!.grouping_reason).not.toBe('click_then_navigate');
  });

  // -------------------------------------------------------------------------
  // Grouping: repeated_click_dedup
  // -------------------------------------------------------------------------

  it('two clicks on the same selector within 500ms produces one repeated_click_dedup step', () => {
    const events = [
      makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.click',
        t_ms: 0,
        target_summary: { selector: '#save-btn', label: 'Save' },
      }),
      makeEvent({
        event_id: 'evt-2',
        event_type: 'interaction.click',
        t_ms: 500,
        target_summary: { selector: '#save-btn', label: 'Save' },
      }),
    ];
    const result = segmentEvents(events, SESSION_ID);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]!.grouping_reason).toBe('repeated_click_dedup');
  });

  it('two clicks on different selectors are not classified as repeated_click_dedup', () => {
    const events = [
      makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.click',
        t_ms: 0,
        target_summary: { selector: '#btn-a' },
      }),
      makeEvent({
        event_id: 'evt-2',
        event_type: 'interaction.click',
        t_ms: 100,
        target_summary: { selector: '#btn-b' },
      }),
    ];
    // Each click is treated as single_action; no dedup grouping → but both
    // end up in one accumulator unless a boundary fires between them.
    // Neither click triggers a submit/nav boundary, so they accumulate together
    // and are classified as single_action (repeated_click_dedup requires same selector).
    const result = segmentEvents(events, SESSION_ID);
    // Both events land in the same accumulator; classified as single_action.
    // The key assertion is that they are NOT classified as repeated_click_dedup.
    expect(result.steps.every((s) => s.grouping_reason !== 'repeated_click_dedup')).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Boundary: idle gap
  // -------------------------------------------------------------------------

  it('event gap > 45 000ms produces two steps; the first is finalized with boundary_reason "idle_gap"', () => {
    // When the idle gap is detected at evt-2, the accumulator containing evt-1
    // is flushed with reason 'idle_gap'. evt-2 then starts a new accumulator
    // which is flushed at the end with reason 'session_stop'.
    const events = [
      makeEvent({ event_id: 'evt-1', t_ms: 0 }),
      makeEvent({ event_id: 'evt-2', t_ms: 50_000 }),
    ];
    const result = segmentEvents(events, SESSION_ID);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]!.boundary_reason).toBe('idle_gap');
    expect(result.steps[1]!.boundary_reason).toBe('session_stop');
  });

  // -------------------------------------------------------------------------
  // Filtering: system.* and derived.* events
  // -------------------------------------------------------------------------

  it('system.capture_blocked events are excluded from all step source_event_ids', () => {
    const events = [
      makeEvent({ event_id: 'evt-1', t_ms: 0 }),
      makeEvent({
        event_id: 'sys-1',
        event_type: 'system.capture_blocked',
        t_ms: 100,
      }),
    ];
    const result = segmentEvents(events, SESSION_ID);
    const allSourceIds = result.steps.flatMap((s) => s.source_event_ids);
    expect(allSourceIds).not.toContain('sys-1');
  });

  it('derived.step_boundary_detected events are excluded from all step source_event_ids', () => {
    const events = [
      makeEvent({ event_id: 'evt-1', t_ms: 0 }),
      makeEvent({
        event_id: 'der-1',
        event_type: 'derived.step_boundary_detected',
        t_ms: 100,
      }),
    ];
    const result = segmentEvents(events, SESSION_ID);
    const allSourceIds = result.steps.flatMap((s) => s.source_event_ids);
    expect(allSourceIds).not.toContain('der-1');
  });

  // -------------------------------------------------------------------------
  // Boundary: session.stopped
  // -------------------------------------------------------------------------

  it('session.stopped event finalizes the accumulator with boundary_reason "session_stop"', () => {
    const events = [
      makeEvent({ event_id: 'evt-1', t_ms: 0 }),
      makeEvent({
        event_id: 'evt-stop',
        event_type: 'session.stopped',
        t_ms: 1000,
      }),
    ];
    const result = segmentEvents(events, SESSION_ID);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]!.boundary_reason).toBe('session_stop');
  });

  // -------------------------------------------------------------------------
  // Step ID format
  // -------------------------------------------------------------------------

  it('step IDs follow the format "<sessionId>-step-<ordinal>"', () => {
    const events = [
      makeEvent({ event_id: 'evt-1', t_ms: 0 }),
      makeEvent({ event_id: 'evt-2', t_ms: 50_000 }),
    ];
    const result = segmentEvents(events, SESSION_ID);
    expect(result.steps[0]!.step_id).toBe(`${SESSION_ID}-step-1`);
    expect(result.steps[1]!.step_id).toBe(`${SESSION_ID}-step-2`);
  });

  // -------------------------------------------------------------------------
  // Determinism
  // -------------------------------------------------------------------------

  it('calling segmentEvents twice on identical input produces deeply equal output', () => {
    const events = [
      makeEvent({ event_id: 'evt-1', t_ms: 0 }),
      makeEvent({
        event_id: 'evt-2',
        event_type: 'interaction.submit',
        t_ms: 500,
      }),
      makeNavEvent({ event_id: 'evt-3', t_ms: 600 }),
    ];
    const first = segmentEvents(events, SESSION_ID);
    const second = segmentEvents(events, SESSION_ID);
    expect(first).toEqual(second);
  });

  // -------------------------------------------------------------------------
  // Ordinal
  // -------------------------------------------------------------------------

  it('first step has ordinal 1 and second step has ordinal 2', () => {
    const events = [
      makeEvent({ event_id: 'evt-1', t_ms: 0 }),
      makeEvent({ event_id: 'evt-2', t_ms: 50_000 }),
    ];
    const result = segmentEvents(events, SESSION_ID);
    expect(result.steps[0]!.ordinal).toBe(1);
    expect(result.steps[1]!.ordinal).toBe(2);
  });

  // -------------------------------------------------------------------------
  // event_count
  // -------------------------------------------------------------------------

  it('event_count in result equals input array length including filtered events', () => {
    const events = [
      makeEvent({ event_id: 'evt-1', t_ms: 0 }),
      makeEvent({
        event_id: 'sys-1',
        event_type: 'system.capture_blocked',
        t_ms: 100,
      }),
      makeEvent({ event_id: 'evt-2', t_ms: 200 }),
    ];
    const result = segmentEvents(events, SESSION_ID);
    expect(result.event_count).toBe(3);
  });

  // -------------------------------------------------------------------------
  // Navigation domain change
  // -------------------------------------------------------------------------

  it('navigation to a different domain after same-domain events triggers a "navigation_changed" boundary', () => {
    // Three events on app.com followed by a navigation.open_page to other.com.
    // The first nav event establishes lastNavigationDomain = 'app.com'.
    // The second nav event on other.com triggers the domain-change boundary.
    const events: SegmentableEvent[] = [
      makeNavEvent({
        event_id: 'nav-1',
        t_ms: 0,
        page_context: {
          domain: 'app.com',
          routeTemplate: '/home',
          applicationLabel: 'App',
          pageTitle: 'Home',
        },
      }),
      makeEvent({ event_id: 'evt-1', event_type: 'interaction.click', t_ms: 100 }),
      makeEvent({ event_id: 'evt-2', event_type: 'interaction.click', t_ms: 200 }),
      makeNavEvent({
        event_id: 'nav-2',
        t_ms: 300,
        page_context: {
          domain: 'other.com',
          routeTemplate: '/landing',
          applicationLabel: 'Other',
          pageTitle: 'Landing',
        },
      }),
    ];
    const result = segmentEvents(events, SESSION_ID);

    // The navigation to other.com should trigger a boundary, producing at least 2 steps.
    expect(result.steps.length).toBeGreaterThanOrEqual(2);

    // The step that was finalized when the domain changed should have boundary_reason 'navigation_changed'.
    const domainChangedStep = result.steps.find(
      (s) => s.boundary_reason === 'navigation_changed',
    );
    expect(domainChangedStep).toBeDefined();
  });
});
