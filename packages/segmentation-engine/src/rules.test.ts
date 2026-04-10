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
    it('uses enriched destination for generic pageTitle like "Dashboard"', () => {
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
      // "Dashboard" is generic — enriched to route + app label
      expect(deriveStepTitle([click, nav], 'click_then_navigate')).toBe(
        'Navigate to /dashboard (App)',
      );
    });

    it('uses specific pageTitle when non-generic', () => {
      const click = makeEvent({ event_id: 'evt-1', event_type: 'interaction.click' });
      const nav = makeEvent({
        event_id: 'evt-2',
        event_type: 'navigation.open_page',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/invoices/new',
          applicationLabel: 'NetSuite',
          pageTitle: 'Create Invoice',
        },
      });
      expect(deriveStepTitle([click, nav], 'click_then_navigate')).toBe(
        'Navigate to Create Invoice',
      );
    });

    it('falls back to route + app label when pageTitle is empty', () => {
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
        'Navigate to /tasks/:id (App)',
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

    it('falls back to "element" when no label and elementType is a raw HTML tag', () => {
      const click = makeEvent({
        event_id: 'evt-1',
        target_summary: { elementType: 'input', selector: '#inp' },
      });
      // "input" is not in RAW_ELEMENT_TYPES so it shouldn't appear as a label.
      // The targetLabel function only uses role (not elementType) as fallback,
      // and filters out raw HTML element types. With no label or meaningful role,
      // the fallback is "element" with optional page context.
      expect(deriveStepTitle([click, click], 'repeated_click_dedup')).toBe(
        'Click element',
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

    it('navigation.open_page with generic pageTitle uses enriched destination', () => {
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
      // "Dashboard" is generic — enriched to route + app label
      expect(deriveStepTitle([evt], 'single_action')).toBe(
        'Navigate to /dashboard (App)',
      );
    });

    it('navigation.open_page with specific pageTitle uses it directly', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'navigation.open_page',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/invoices/new',
          applicationLabel: 'NetSuite',
          pageTitle: 'Create Invoice',
        },
      });
      expect(deriveStepTitle([evt], 'single_action')).toBe(
        'Navigate to Create Invoice',
      );
    });

    it('unrecognised event type → contextual fallback', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'workflow.wait',
      });
      // With no page context, falls back to "Interact with page"
      expect(deriveStepTitle([evt], 'single_action')).toBe('Interact with page');
    });

    it('empty events array → "Perform action"', () => {
      expect(deriveStepTitle([], 'single_action')).toBe('Perform action');
    });
  });

  // --- data_entry ------------------------------------------------------------

  describe('data_entry', () => {
    it('uses target label when present', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.input_change',
        target_summary: { label: 'Cell A11' },
      });
      expect(deriveStepTitle([evt], 'data_entry')).toBe('Enter Cell A11');
    });

    it('falls back to "field" when no label', () => {
      const evt = makeEvent({ event_id: 'evt-1', event_type: 'interaction.input_change' });
      expect(deriveStepTitle([evt], 'data_entry')).toBe('Enter field');
    });
  });

  // --- send_action -----------------------------------------------------------

  describe('send_action', () => {
    it('uses target label directly when present', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.click',
        target_summary: { label: 'Send Email' },
      });
      expect(deriveStepTitle([evt], 'send_action')).toBe('Send Email');
    });

    it('falls back to "Complete action" when no label', () => {
      const evt = makeEvent({ event_id: 'evt-1', event_type: 'interaction.click' });
      expect(deriveStepTitle([evt], 'send_action')).toBe('Complete action');
    });
  });

  // --- file_action -----------------------------------------------------------

  describe('file_action', () => {
    it('always returns "Attach file"', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.click',
        target_summary: { label: 'Upload', elementType: 'file' },
      });
      expect(deriveStepTitle([evt], 'file_action')).toBe('Attach file');
    });

    it('returns "Attach file" even with no events', () => {
      expect(deriveStepTitle([], 'file_action')).toBe('Attach file');
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

  it('send_action → 0.9', () => {
    expect(calculateConfidence(emptyEvents, 'send_action')).toBe(0.9);
  });

  it('click_then_navigate → 0.85', () => {
    expect(calculateConfidence(emptyEvents, 'click_then_navigate')).toBe(0.85);
  });

  it('file_action → 0.85', () => {
    expect(calculateConfidence(emptyEvents, 'file_action')).toBe(0.85);
  });

  it('error_handling → 0.8', () => {
    expect(calculateConfidence(emptyEvents, 'error_handling')).toBe(0.8);
  });

  it('data_entry → 0.8', () => {
    expect(calculateConfidence(emptyEvents, 'data_entry')).toBe(0.8);
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
