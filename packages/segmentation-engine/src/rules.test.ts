/**
 * Tests for segmentation rules: constants, deriveStepTitle, calculateConfidence.
 */

import { describe, it, expect } from 'vitest';

import {
  IDLE_GAP_MS,
  CLICK_NAV_WINDOW_MS,
  RAPID_CLICK_DEDUP_MS,
  deriveStepTitle,
  calculateConfidence,
} from './rules.js';

import type { SegmentableEvent, DerivedStep, GroupingReason } from './types.js';

// ---------------------------------------------------------------------------
// Factory
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('segmentation constants', () => {
  it('IDLE_GAP_MS is 45_000', () => {
    expect(IDLE_GAP_MS).toBe(45_000);
  });

  it('CLICK_NAV_WINDOW_MS is 2_500', () => {
    expect(CLICK_NAV_WINDOW_MS).toBe(2_500);
  });

  it('RAPID_CLICK_DEDUP_MS is 1_000', () => {
    expect(RAPID_CLICK_DEDUP_MS).toBe(1_000);
  });
});

// ---------------------------------------------------------------------------
// deriveStepTitle
// ---------------------------------------------------------------------------

describe('deriveStepTitle', () => {
  // --- click_then_navigate --------------------------------------------------

  describe('click_then_navigate', () => {
    it('uses pageTitle from nav event when present', () => {
      const click = makeEvent({ event_id: 'evt-1', event_type: 'interaction.click' });
      const nav = makeEvent({
        event_id: 'evt-2',
        event_type: 'navigation.open_page',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/dashboard',
          applicationLabel: 'App',
          pageTitle: 'Dashboard',
        },
      });
      expect(deriveStepTitle([click, nav], 'click_then_navigate')).toBe(
        'Navigate to Dashboard',
      );
    });

    it('falls back to nav event routeTemplate when pageTitle is absent', () => {
      const click = makeEvent({ event_id: 'evt-1', event_type: 'interaction.click' });
      const nav = makeEvent({
        event_id: 'evt-2',
        event_type: 'navigation.open_page',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/tasks/:id',
          applicationLabel: 'App',
          pageTitle: '',
        },
      });
      // pageTitle is empty string → treated as undefined; no pageContext arg passed
      expect(deriveStepTitle([click, nav], 'click_then_navigate')).toBe(
        'Navigate to /tasks/:id',
      );
    });

    it('falls back to "page" when no nav event is present', () => {
      const click = makeEvent({ event_id: 'evt-1', event_type: 'interaction.click' });
      expect(deriveStepTitle([click], 'click_then_navigate')).toBe(
        'Navigate to page',
      );
    });
  });

  // --- fill_and_submit ------------------------------------------------------

  describe('fill_and_submit', () => {
    it('uses target label from submit event', () => {
      const input = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.input_change',
      });
      const submit = makeEvent({
        event_id: 'evt-2',
        event_type: 'interaction.submit',
        target_summary: { label: 'Expense Form' },
      });
      expect(deriveStepTitle([input, submit], 'fill_and_submit')).toBe(
        'Fill and submit Expense Form',
      );
    });

    it('falls back to pageTitle of first event when no submit target label', () => {
      const input = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.input_change',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/reports/new',
          applicationLabel: 'App',
          pageTitle: 'Create Report',
        },
      });
      const submit = makeEvent({
        event_id: 'evt-2',
        event_type: 'interaction.submit',
      });
      expect(deriveStepTitle([input, submit], 'fill_and_submit')).toBe(
        'Fill and submit Create Report',
      );
    });

    it('falls back to "form" when no context is available', () => {
      const input = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.input_change',
      });
      const submit = makeEvent({
        event_id: 'evt-2',
        event_type: 'interaction.submit',
      });
      expect(deriveStepTitle([input, submit], 'fill_and_submit')).toBe(
        'Fill and submit form',
      );
    });
  });

  // --- repeated_click_dedup -------------------------------------------------

  describe('repeated_click_dedup', () => {
    it('uses label from first event target_summary', () => {
      const click = makeEvent({
        event_id: 'evt-1',
        target_summary: { label: 'Save', selector: '#save-btn' },
      });
      expect(deriveStepTitle([click, click], 'repeated_click_dedup')).toBe(
        'Click Save',
      );
    });

    it('falls back to role when no label is present', () => {
      const click = makeEvent({
        event_id: 'evt-1',
        target_summary: { role: 'button', selector: '#btn' },
      });
      expect(deriveStepTitle([click, click], 'repeated_click_dedup')).toBe(
        'Click button',
      );
    });

    it('falls back to elementType when no label or role', () => {
      const click = makeEvent({
        event_id: 'evt-1',
        target_summary: { elementType: 'input', selector: '#inp' },
      });
      expect(deriveStepTitle([click, click], 'repeated_click_dedup')).toBe(
        'Click input',
      );
    });

    it('falls back to "element" when target_summary is entirely absent', () => {
      const click = makeEvent({ event_id: 'evt-1' });
      expect(deriveStepTitle([click, click], 'repeated_click_dedup')).toBe(
        'Click element',
      );
    });
  });

  // --- annotation -----------------------------------------------------------

  describe('annotation', () => {
    it('uses target_summary label when present', () => {
      const annotation = makeEvent({
        event_id: 'evt-1',
        event_type: 'session.annotation_added',
        target_summary: { label: 'Check approval' },
      });
      expect(deriveStepTitle([annotation], 'annotation')).toBe(
        'Check approval',
      );
    });

    it('falls back to "User annotation" when no label', () => {
      const annotation = makeEvent({
        event_id: 'evt-1',
        event_type: 'session.annotation_added',
      });
      expect(deriveStepTitle([annotation], 'annotation')).toBe(
        'User annotation',
      );
    });
  });

  // --- error_handling -------------------------------------------------------

  describe('error_handling', () => {
    it('always returns "Handle error"', () => {
      const evt = makeEvent({ event_id: 'evt-1' });
      expect(deriveStepTitle([evt], 'error_handling')).toBe('Handle error');
    });
  });

  // --- single_action --------------------------------------------------------

  describe('single_action', () => {
    it('interaction.click with label → "Click <label>"', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.click',
        target_summary: { label: 'Submit' },
      });
      expect(deriveStepTitle([evt], 'single_action')).toBe('Click Submit');
    });

    it('interaction.input_change with label → "Update <label>"', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.input_change',
        target_summary: { label: 'Amount' },
      });
      expect(deriveStepTitle([evt], 'single_action')).toBe('Update Amount');
    });

    it('interaction.submit with pageTitle → "Submit <pageTitle>"', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.submit',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/expenses',
          applicationLabel: 'App',
          pageTitle: 'Expense Report',
        },
      });
      expect(deriveStepTitle([evt], 'single_action')).toBe(
        'Submit Expense Report',
      );
    });

    it('navigation.open_page with pageTitle → "Navigate to <pageTitle>"', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'navigation.open_page',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/dashboard',
          applicationLabel: 'App',
          pageTitle: 'Dashboard',
        },
      });
      expect(deriveStepTitle([evt], 'single_action')).toBe(
        'Navigate to Dashboard',
      );
    });

    it('unrecognised event type → "Perform action"', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'workflow.wait',
      });
      expect(deriveStepTitle([evt], 'single_action')).toBe('Perform action');
    });

    it('empty events array → "Perform action"', () => {
      expect(deriveStepTitle([], 'single_action')).toBe('Perform action');
    });
  });
});

// ---------------------------------------------------------------------------
// calculateConfidence
// ---------------------------------------------------------------------------

describe('calculateConfidence', () => {
  const emptyEvents: SegmentableEvent[] = [];

  it('annotation → 1.0', () => {
    expect(calculateConfidence(emptyEvents, 'annotation')).toBe(1.0);
  });

  it('fill_and_submit → 0.9', () => {
    expect(calculateConfidence(emptyEvents, 'fill_and_submit')).toBe(0.9);
  });

  it('click_then_navigate → 0.85', () => {
    expect(calculateConfidence(emptyEvents, 'click_then_navigate')).toBe(0.85);
  });

  it('error_handling → 0.8', () => {
    expect(calculateConfidence(emptyEvents, 'error_handling')).toBe(0.8);
  });

  it('repeated_click_dedup → 0.7', () => {
    expect(calculateConfidence(emptyEvents, 'repeated_click_dedup')).toBe(0.7);
  });

  it('single_action with a concrete label → 0.75', () => {
    const evt = makeEvent({
      event_id: 'evt-1',
      target_summary: { label: 'Save' },
    });
    expect(calculateConfidence([evt], 'single_action')).toBe(0.75);
  });

  it('single_action without any label → 0.55', () => {
    const evt = makeEvent({ event_id: 'evt-1' });
    expect(calculateConfidence([evt], 'single_action')).toBe(0.55);
  });
});
