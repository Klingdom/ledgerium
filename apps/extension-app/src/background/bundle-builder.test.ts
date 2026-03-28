/**
 * Tests for the inline bundle-builder segmentation engine.
 *
 * This is the production segmentation path used by the Chrome extension.
 * It mirrors packages/segmentation-engine but includes additional rules
 * (target_changed, route_changed, action_completed boundaries; data_entry,
 * send_action, file_action grouping reasons).
 */

import { describe, it, expect } from 'vitest';
import { buildDerivedSteps } from './bundle-builder.js';
import type { CanonicalEvent } from '../shared/types.js';

// ─── Factories ────────────────────────────────────────────────────────────────

const SESSION_ID = 'test-session';

function makeEvent(overrides: Partial<CanonicalEvent> & { event_id?: string }): CanonicalEvent {
  return {
    event_id: overrides.event_id ?? 'evt-1',
    schema_version: '1.0.0',
    session_id: SESSION_ID,
    t_ms: 1000,
    t_wall: '2026-01-01T00:00:01Z',
    event_type: 'interaction.click',
    actor_type: 'human',
    normalization_meta: {
      sourceEventId: overrides.event_id ?? 'evt-1',
      sourceEventType: 'click',
      normalizationRuleVersion: '1.0.0',
      redactionApplied: false,
    },
    ...overrides,
  } as CanonicalEvent;
}

function makeClickEvent(id: string, t_ms: number, label?: string, selector?: string, domain?: string) {
  return makeEvent({
    event_id: id,
    t_ms,
    event_type: 'interaction.click',
    target_summary: {
      label: label ?? 'Button',
      role: 'button',
      isSensitive: false,
      ...(selector ? { selector } : {}),
    },
    page_context: {
      url: `https://${domain ?? 'app.example.com'}/page`,
      urlNormalized: `https://${domain ?? 'app.example.com'}/page`,
      domain: domain ?? 'app.example.com',
      routeTemplate: '/page',
      pageTitle: 'Page',
      applicationLabel: domain === 'mail.google.com' ? 'Gmail' : 'App',
    },
  });
}

function makeInputEvent(id: string, t_ms: number, label?: string, selector?: string, domain?: string) {
  return makeEvent({
    event_id: id,
    t_ms,
    event_type: 'interaction.input_change',
    target_summary: {
      label: label ?? 'Field',
      role: 'textbox',
      isSensitive: false,
      ...(selector ? { selector } : {}),
    },
    page_context: {
      url: `https://${domain ?? 'app.example.com'}/page`,
      urlNormalized: `https://${domain ?? 'app.example.com'}/page`,
      domain: domain ?? 'app.example.com',
      routeTemplate: '/page',
      pageTitle: 'Page',
      applicationLabel: domain === 'docs.google.com' ? 'Google Sheets' : 'App',
    },
  });
}

function makeNavEvent(id: string, t_ms: number, domain?: string, pageTitle?: string) {
  const d = domain ?? 'app.example.com';
  return makeEvent({
    event_id: id,
    t_ms,
    event_type: 'navigation.open_page',
    actor_type: 'system',
    page_context: {
      url: `https://${d}/page`,
      urlNormalized: `https://${d}/page`,
      domain: d,
      routeTemplate: '/page',
      pageTitle: pageTitle ?? 'Page',
      applicationLabel: d === 'mail.google.com' ? 'Gmail' : 'App',
    },
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildDerivedSteps', () => {
  it('returns empty array for no events', () => {
    expect(buildDerivedSteps([], SESSION_ID)).toEqual([]);
  });

  it('single click produces one step with single_action', () => {
    const events = [makeClickEvent('evt-1', 1000)];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.grouping_reason).toBe('single_action');
    expect(steps[0]!.ordinal).toBe(1);
  });

  // ─── Grouping: fill_and_submit ──────────────────────────────────────────

  it('input + submit → fill_and_submit', () => {
    const events = [
      makeInputEvent('evt-1', 1000, 'Name'),
      makeEvent({
        event_id: 'evt-2', t_ms: 2000, event_type: 'interaction.submit',
        target_summary: { label: 'Submit', role: 'button', isSensitive: false },
        page_context: { url: 'https://app.example.com/form', urlNormalized: 'https://app.example.com/form', domain: 'app.example.com', routeTemplate: '/form', pageTitle: 'Form', applicationLabel: 'App' },
      }),
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.grouping_reason).toBe('fill_and_submit');
    expect(steps[0]!.confidence).toBe(0.90);
  });

  // ─── Grouping: click_then_navigate ──────────────────────────────────────

  it('click + navigation within window → click_then_navigate', () => {
    const events = [
      makeClickEvent('evt-1', 1000, 'Inbox', undefined, 'mail.google.com'),
      makeNavEvent('evt-2', 2000, 'mail.google.com', 'Inbox'),
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.grouping_reason).toBe('click_then_navigate');
    expect(steps[0]!.confidence).toBe(0.85);
  });

  // ─── Grouping: send_action ──────────────────────────────────────────────

  it('click on Send button → send_action', () => {
    const events = [
      makeClickEvent('evt-1', 1000, 'Send'),
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.grouping_reason).toBe('send_action');
    expect(steps[0]!.confidence).toBe(0.90);
    expect(steps[0]!.title).toBe('Send');
  });

  it('click on Save button → send_action', () => {
    const events = [makeClickEvent('evt-1', 1000, 'Save')];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps[0]!.grouping_reason).toBe('send_action');
  });

  // ─── Grouping: file_action ─────────────────────────────────────────────

  it('click on file element → file_action', () => {
    const events = [makeEvent({
      event_id: 'evt-1', t_ms: 1000, event_type: 'interaction.click',
      target_summary: { label: 'Attach', role: 'button', elementType: 'file', isSensitive: false },
      page_context: { url: 'https://app.example.com/page', urlNormalized: 'https://app.example.com/page', domain: 'app.example.com', routeTemplate: '/page', pageTitle: 'Page', applicationLabel: 'App' },
    })];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.grouping_reason).toBe('file_action');
    expect(steps[0]!.confidence).toBe(0.85);
  });

  // ─── Grouping: data_entry ──────────────────────────────────────────────

  it('multiple input_change events → data_entry', () => {
    const events = [
      makeInputEvent('evt-1', 1000, 'Cell A11', '#editor'),
      makeInputEvent('evt-2', 1200, 'Cell A11', '#editor'),
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.grouping_reason).toBe('data_entry');
    expect(steps[0]!.confidence).toBe(0.80);
  });

  // ─── Grouping: repeated_click_dedup ────────────────────────────────────

  it('rapid double-click on same selector → repeated_click_dedup', () => {
    const events = [
      makeClickEvent('evt-1', 1000, 'Save', '#btn-save'),
      makeClickEvent('evt-2', 1500, 'Save', '#btn-save'),
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.grouping_reason).toBe('repeated_click_dedup');
    expect(steps[0]!.confidence).toBe(0.70);
  });

  it('rapid double-click on Save → repeated_click_dedup (NOT send_action)', () => {
    // Regression: rapid double-click on action button should be dedup, not two sends
    const events = [
      makeClickEvent('evt-1', 1000, 'Save', '#btn-save'),
      makeClickEvent('evt-2', 1800, 'Save', '#btn-save'),
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps[0]!.grouping_reason).toBe('repeated_click_dedup');
  });

  // ─── Grouping: error_handling ──────────────────────────────────────────

  it('error_displayed + human action → error_handling', () => {
    const events = [
      makeEvent({ event_id: 'evt-1', t_ms: 1000, event_type: 'system.error_displayed', actor_type: 'system' }),
      makeClickEvent('evt-2', 1500, 'OK'),
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.grouping_reason).toBe('error_handling');
    expect(steps[0]!.confidence).toBe(0.80);
  });

  // ─── Grouping: annotation ──────────────────────────────────────────────

  it('annotation event → annotation step', () => {
    const events = [
      makeEvent({ event_id: 'evt-1', t_ms: 1000, event_type: 'session.annotation_added', annotation_text: 'Test note' }),
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.grouping_reason).toBe('annotation');
    expect(steps[0]!.confidence).toBe(1.0);
  });

  // ─── Boundary: idle_gap ────────────────────────────────────────────────

  it('45s gap splits into two steps', () => {
    const events = [
      makeClickEvent('evt-1', 1000, 'A'),
      makeClickEvent('evt-2', 50000, 'B'), // 49s gap > 45s
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps).toHaveLength(2);
    expect(steps[0]!.boundary_reason).toBe('idle_gap');
  });

  // ─── Boundary: domain change ──────────────────────────────────────────

  it('domain change splits steps', () => {
    const events = [
      makeClickEvent('evt-1', 1000, 'A', undefined, 'mail.google.com'),
      makeClickEvent('evt-2', 2000, 'B', undefined, 'docs.google.com'),
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps).toHaveLength(2);
    expect(steps[0]!.boundary_reason).toBe('navigation_changed');
  });

  // ─── Boundary: target_changed ─────────────────────────────────────────

  it('target change with 2s+ gap splits steps', () => {
    const events = [
      makeInputEvent('evt-1', 1000, 'Subject', '#subject'),
      makeInputEvent('evt-2', 4000, 'Body', '#body'), // 3s gap, different target
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps).toHaveLength(2);
    expect(steps[0]!.boundary_reason).toBe('target_changed');
  });

  it('same target within 2s gap does NOT split', () => {
    const events = [
      makeInputEvent('evt-1', 1000, 'Body', '#body'),
      makeInputEvent('evt-2', 2500, 'Body', '#body'), // 1.5s gap, same target
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps).toHaveLength(1);
  });

  // ─── Boundary: action_completed ───────────────────────────────────────

  it('action button click finalizes step', () => {
    const events = [
      makeInputEvent('evt-1', 1000, 'To'),
      makeClickEvent('evt-2', 2000, 'Send'),
      makeClickEvent('evt-3', 5000, 'Other'), // after action completed
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps[0]!.boundary_reason).toBe('action_completed');
  });

  // ─── Step ID format ────────────────────────────────────────────────────

  it('step IDs follow ${sessionId}-step-${ordinal} format', () => {
    const events = [
      makeClickEvent('evt-1', 1000, 'A'),
      makeClickEvent('evt-2', 50000, 'B'),
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps[0]!.step_id).toBe(`${SESSION_ID}-step-1`);
    expect(steps[1]!.step_id).toBe(`${SESSION_ID}-step-2`);
  });

  // ─── Determinism ──────────────────────────────────────────────────────

  it('identical input produces identical output', () => {
    const events = [
      makeClickEvent('evt-1', 1000, 'Inbox'),
      makeNavEvent('evt-2', 2000, 'mail.google.com', 'Inbox'),
      makeInputEvent('evt-3', 5000, 'To'),
      makeClickEvent('evt-4', 7000, 'Send'),
    ];
    const run1 = buildDerivedSteps(events, SESSION_ID);
    const run2 = buildDerivedSteps(events, SESSION_ID);
    expect(run1).toEqual(run2);
  });

  // ─── System event filtering ────────────────────────────────────────────

  it('filters system events but keeps error_displayed', () => {
    const events = [
      makeEvent({ event_id: 'evt-1', t_ms: 1000, event_type: 'system.loading_started', actor_type: 'system' }),
      makeEvent({ event_id: 'evt-2', t_ms: 1500, event_type: 'system.error_displayed', actor_type: 'system' }),
      makeClickEvent('evt-3', 2000, 'OK'),
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    // system.loading_started should be filtered, error_displayed kept
    expect(steps).toHaveLength(1);
    expect(steps[0]!.grouping_reason).toBe('error_handling');
    // source_event_ids should not include loading_started
    expect(steps[0]!.source_event_ids).not.toContain('evt-1');
    expect(steps[0]!.source_event_ids).toContain('evt-2');
  });

  // ─── Spreadsheet cell segmentation ─────────────────────────────────────

  it('different cell labels on same selector split with target_changed', () => {
    const events = [
      makeInputEvent('evt-1', 1000, 'A16', '#waffle-editor'),
      makeInputEvent('evt-2', 4000, 'B16', '#waffle-editor'), // 3s gap, different label
    ];
    const steps = buildDerivedSteps(events, SESSION_ID);
    expect(steps).toHaveLength(2);
    expect(steps[0]!.boundary_reason).toBe('target_changed');
  });
});
