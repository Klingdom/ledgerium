/**
 * Tests for segmentation rules: constants, deriveStepTitle, calculateConfidence.
 *
 * deriveStepTitle expectations align with the extension-side deriveTitle style
 * (post-convergence per D12).
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
    it('uses pageTitle from navigation event', () => {
      const click = makeEvent({ event_id: 'evt-1', event_type: 'interaction.click' });
      const nav = makeEvent({
        event_id: 'evt-2',
        event_type: 'navigation.open_page',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/inbox',
          applicationLabel: 'App',
          pageTitle: 'Inbox',
        },
      });
      expect(deriveStepTitle([click, nav], 'click_then_navigate')).toBe(
        'Navigate to Inbox',
      );
    });

    it('uses routeTemplate when pageTitle is absent', () => {
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
    it('lists field labels from input_change events', () => {
      const input1 = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.input_change',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/page',
          applicationLabel: 'App',
          pageTitle: 'Page',
        },
        target_summary: { label: 'Name' },
      });
      const input2 = makeEvent({
        event_id: 'evt-2',
        event_type: 'interaction.input_change',
        target_summary: { label: 'Email' },
      });
      const submit = makeEvent({
        event_id: 'evt-3',
        event_type: 'interaction.submit',
      });
      expect(deriveStepTitle([input1, input2, submit], 'fill_and_submit')).toBe(
        'Complete Name, Email and submit in App',
      );
    });

    it('falls back to "Complete and submit form" when no input labels', () => {
      const input = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.input_change',
      });
      const submit = makeEvent({
        event_id: 'evt-2',
        event_type: 'interaction.submit',
      });
      expect(deriveStepTitle([input, submit], 'fill_and_submit')).toBe(
        'Complete and submit form',
      );
    });

    it('appends app context when available', () => {
      const input = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.input_change',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/form',
          applicationLabel: 'MyApp',
          pageTitle: 'Page',
        },
        target_summary: { label: 'Subject' },
      });
      const submit = makeEvent({ event_id: 'evt-2', event_type: 'interaction.submit' });
      expect(deriveStepTitle([input, submit], 'fill_and_submit')).toBe(
        'Complete Subject and submit in MyApp',
      );
    });
  });

  // --- repeated_click_dedup -------------------------------------------------

  describe('repeated_click_dedup', () => {
    it('uses label from first click event', () => {
      const click = makeEvent({
        event_id: 'evt-1',
        target_summary: { label: 'Save', selector: '#save-btn' },
      });
      expect(deriveStepTitle([click, click], 'repeated_click_dedup')).toBe(
        'Click Save',
      );
    });

    it('falls back to "Click action" when no label and no app context', () => {
      const click = makeEvent({
        event_id: 'evt-1',
        target_summary: { selector: '#btn' },
      });
      expect(deriveStepTitle([click, click], 'repeated_click_dedup')).toBe(
        'Click action',
      );
    });

    it('uses app context in fallback when available', () => {
      const click = makeEvent({
        event_id: 'evt-1',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/page',
          applicationLabel: 'CRM',
          pageTitle: 'Page',
        },
        target_summary: { selector: '#btn' },
      });
      expect(deriveStepTitle([click, click], 'repeated_click_dedup')).toBe(
        'Click action in CRM',
      );
    });
  });

  // --- annotation -----------------------------------------------------------

  describe('annotation', () => {
    it('uses annotation_text when present', () => {
      const annotation = makeEvent({
        event_id: 'evt-1',
        event_type: 'session.annotation_added',
        annotation_text: 'Note the process here',
      });
      expect(deriveStepTitle([annotation], 'annotation')).toBe(
        'Note the process here',
      );
    });

    it('falls back to "Annotation" when no annotation_text', () => {
      const annotation = makeEvent({
        event_id: 'evt-1',
        event_type: 'session.annotation_added',
      });
      expect(deriveStepTitle([annotation], 'annotation')).toBe(
        'Annotation',
      );
    });
  });

  // --- error_handling -------------------------------------------------------

  describe('error_handling', () => {
    it('returns "Handle error" without app context', () => {
      const evt = makeEvent({ event_id: 'evt-1' });
      expect(deriveStepTitle([evt], 'error_handling')).toBe('Handle error');
    });

    it('appends app context when available', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/page',
          applicationLabel: 'MyApp',
          pageTitle: 'Page',
        },
      });
      expect(deriveStepTitle([evt], 'error_handling')).toBe('Handle error in MyApp');
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

    it('interaction.click without label → "Click action<ctx>"', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.click',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/page',
          applicationLabel: 'App',
          pageTitle: 'Page',
        },
      });
      expect(deriveStepTitle([evt], 'single_action')).toBe('Click action in App');
    });

    it('interaction.input_change with label → "Enter <label><ctx>"', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.input_change',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/page',
          applicationLabel: 'App',
          pageTitle: 'Page',
        },
        target_summary: { label: 'Amount' },
      });
      expect(deriveStepTitle([evt], 'single_action')).toBe('Enter Amount in App');
    });

    it('interaction.input_change without label → "Enter data<ctx>"', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.input_change',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/page',
          applicationLabel: 'App',
          pageTitle: 'Page',
        },
      });
      expect(deriveStepTitle([evt], 'single_action')).toBe('Enter data in App');
    });

    it('interaction.submit → "Submit form<ctx>"', () => {
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
      expect(deriveStepTitle([evt], 'single_action')).toBe('Submit form in App');
    });

    it('navigation.open_page uses pageTitle', () => {
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
      expect(deriveStepTitle([evt], 'single_action')).toBe('Navigate to Dashboard');
    });

    it('navigation.open_page falls back to routeTemplate when no pageTitle', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'navigation.open_page',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/invoices/new',
          applicationLabel: 'NetSuite',
          pageTitle: '',
        },
      });
      expect(deriveStepTitle([evt], 'single_action')).toBe(
        'Navigate to /invoices/new',
      );
    });

    it('unrecognised event type → "Perform action<ctx>"', () => {
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

  // --- data_entry ------------------------------------------------------------

  describe('data_entry', () => {
    it('uses field labels from input_change events', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.input_change',
        target_summary: { label: 'Amount' },
      });
      expect(deriveStepTitle([evt], 'data_entry')).toBe('Enter Amount');
    });

    it('detects spreadsheet cell references → "Enter data in cells <cells><ctx>"', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.input_change',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/page',
          applicationLabel: 'App',
          pageTitle: 'Page',
        },
        target_summary: { label: 'A16' },
      });
      expect(deriveStepTitle([evt], 'data_entry')).toBe('Enter data in cells A16 in App');
    });

    it('falls back to "Enter data" when no label', () => {
      const evt = makeEvent({ event_id: 'evt-1', event_type: 'interaction.input_change' });
      expect(deriveStepTitle([evt], 'data_entry')).toBe('Enter data');
    });

    it('appends " in spreadsheet" when no app context and cell refs present', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.input_change',
        target_summary: { label: 'B5' },
      });
      expect(deriveStepTitle([evt], 'data_entry')).toBe('Enter data in cells B5 in spreadsheet');
    });
  });

  // --- send_action -----------------------------------------------------------

  describe('send_action', () => {
    it('uses click target label with app context', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.click',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/page',
          applicationLabel: 'App',
          pageTitle: 'Page',
        },
        target_summary: { label: 'Save' },
      });
      expect(deriveStepTitle([evt], 'send_action')).toBe('Save in App');
    });

    it('uses label without context when no app context', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.click',
        target_summary: { label: 'Send Email' },
      });
      expect(deriveStepTitle([evt], 'send_action')).toBe('Send Email');
    });

    it('falls back to "Send<ctx>" when no label', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.click',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/page',
          applicationLabel: 'App',
          pageTitle: 'Page',
        },
      });
      expect(deriveStepTitle([evt], 'send_action')).toBe('Send in App');
    });
  });

  // --- file_action -----------------------------------------------------------

  describe('file_action', () => {
    it('returns "Attach file" without app context', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.click',
        target_summary: { label: 'Upload', elementType: 'file' },
      });
      expect(deriveStepTitle([evt], 'file_action')).toBe('Attach file');
    });

    it('appends app context when available', () => {
      const evt = makeEvent({
        event_id: 'evt-1',
        event_type: 'interaction.click',
        page_context: {
          domain: 'app.com',
          routeTemplate: '/page',
          applicationLabel: 'MyApp',
          pageTitle: 'Page',
        },
        target_summary: { label: 'Upload', elementType: 'file' },
      });
      expect(deriveStepTitle([evt], 'file_action')).toBe('Attach file in MyApp');
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
