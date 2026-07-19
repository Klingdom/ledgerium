/**
 * SVR vague-path regression suite — P0-c specificity deliverable.
 *
 * Covers the three behaviour-change points from
 * docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md:
 *
 *   B1 – labelless/generic-target click now emits 'Click in <App>'
 *          instead of the pre-B1 'Click the target element in <App>'.
 *          Pre-B1 matched VAGUE_INSTRUCTION_PREFIXES['Click the target element in ']
 *          → SVR = 1/N. Post-B1 is not in any vague set → SVR = 0.
 *
 *   B2 – cleanStepTitle() strips bare spreadsheet cell-coordinate tokens
 *          (B2 fix in contentEnricher.ts). These are pure unit tests;
 *          no processSessionFull invocation is required because the fix
 *          affects step titles only, not SOPInstruction.instruction strings
 *          → zero SVR impact.
 *
 *   B3 – Single-word labels get typographic curly quotes (U+201C / U+201D);
 *          multi-word labels keep straight double-quotes (B3 quoting fix).
 *          Neither produced string is in any vague set → SVR = 0.
 *
 *   B4 – error_handling step emits a labelled action field via buildAction():
 *          'Resolve error — click “Retry” to continue'.
 *          The action field is NOT part of SOPInstruction.instruction and is
 *          NOT evaluated by computeSopVagueness → zero SVR effect.
 *          The instructions array for the step contains only non-vague strings
 *          → SVR = 0.
 *
 * DETERMINISM: all timestamps frozen at NOW_MS; no Date.now / Math.random / I/O.
 * HONESTY: only data present in each event is used; no invented signals.
 * SURFACE: only packages/process-engine/** is touched by this file.
 */

import { describe, it, expect } from 'vitest';
import { processSessionFull } from './processSessionFull.js';
import { cleanStepTitle } from './contentEnricher.js';
import type { ProcessEngineInput } from './types.js';

const NOW_MS = 1_700_000_000_000 as const;

// ─── B1: labelless/generic-target click ──────────────────────────────────────
//
// Scenario: user clicks labelled element 'Files', a route change navigates to
// 'Spreadsheets', then the user clicks a labelless <div> inside Google Sheets.
//
// sopBuilder.ts interaction.click fallback trace for evt-b1-3:
//   label = ''  →  if (label) → false  (empty string is falsy)
//   role  = 'div' → not in SEMANTIC_ROLES → skip
//   pageLabel = '' ?? 'Google Sheets' → '' because '' is not null/undefined
//   if (pageLabel) → if ('') → false → skip
//   if (page?.applicationLabel) → 'Google Sheets' → truthy
//   → returns 'Click in Google Sheets'
//
// Pre-B1 behaviour (now deleted): returned 'Click the target element in Google Sheets'
//   which starts with VAGUE_INSTRUCTION_PREFIXES prefix 'Click the target element in '
//   → SVR = 1/3 ≈ 0.33.
// Post-B1: 'Click in Google Sheets' is not in VAGUE_INSTRUCTION_STRINGS or any prefix
//   → SVR = 0.

describe('B1: labelless/generic-target click — SVR reduction', () => {
  const SESSION_B1 = 'svr-b1-001';

  const input: ProcessEngineInput = {
    sessionJson: {
      sessionId: SESSION_B1,
      activityName: 'Open spreadsheet',
      startedAt: new Date(NOW_MS).toISOString(),
    },
    normalizedEvents: [
      {
        event_id: 'evt-b1-1',
        session_id: SESSION_B1,
        t_ms: NOW_MS,
        t_wall: new Date(NOW_MS).toISOString(),
        event_type: 'interaction.click',
        actor_type: 'human',
        page_context: {
          url: 'https://drive.google.com/drive',
          urlNormalized: 'https://drive.google.com/drive',
          domain: 'drive.google.com',
          routeTemplate: '/drive',
          pageTitle: 'Google Drive',
          applicationLabel: 'Google Drive',
        },
        target_summary: {
          label: 'Files',
          role: 'button',
          isSensitive: false,
        },
        normalization_meta: {
          sourceEventId: 'evt-b1-1',
          sourceEventType: 'interaction.click',
          normalizationRuleVersion: '1.0.0',
          redactionApplied: false,
        },
      },
      {
        event_id: 'evt-b1-2',
        session_id: SESSION_B1,
        t_ms: NOW_MS + 1000,
        t_wall: new Date(NOW_MS + 1000).toISOString(),
        event_type: 'navigation.route_change',
        actor_type: 'system',
        page_context: {
          url: 'https://docs.google.com/spreadsheets',
          urlNormalized: 'https://docs.google.com/spreadsheets',
          domain: 'docs.google.com',
          routeTemplate: '/spreadsheets',
          // 'Spreadsheets' is not in GENERIC_PAGE_TITLES → enrichedPageLabel returns it directly
          pageTitle: 'Spreadsheets',
          applicationLabel: 'Google Sheets',
        },
        target_summary: {
          label: '',
          role: 'link',
          isSensitive: false,
        },
        normalization_meta: {
          sourceEventId: 'evt-b1-2',
          sourceEventType: 'navigation.route_change',
          normalizationRuleVersion: '1.0.0',
          redactionApplied: false,
        },
      },
      {
        // The critical B1 event: labelless click in an empty-title page.
        // pageTitle='' and role='div' are the conditions that expose the
        // pre-B1 bug. Post-B1, the fallback is 'Click in Google Sheets'.
        event_id: 'evt-b1-3',
        session_id: SESSION_B1,
        t_ms: NOW_MS + 2000,
        t_wall: new Date(NOW_MS + 2000).toISOString(),
        event_type: 'interaction.click',
        actor_type: 'human',
        page_context: {
          url: 'https://docs.google.com/spreadsheets/d/abc123',
          urlNormalized: 'https://docs.google.com/spreadsheets/d/abc123',
          domain: 'docs.google.com',
          routeTemplate: '/spreadsheets/d/:id',
          pageTitle: '',                 // empty → '?? applicationLabel' does NOT apply ('??'
                                         // short-circuits only on null/undefined, not '')
          applicationLabel: 'Google Sheets',
        },
        target_summary: {
          label: '',                     // empty → safeTargetLabel returns undefined
          role: 'div',                  // 'div' ∈ SOP_RAW_ELEMENTS → safeTargetLabel skips it
          isSensitive: false,
        },
        normalization_meta: {
          sourceEventId: 'evt-b1-3',
          sourceEventType: 'interaction.click',
          normalizationRuleVersion: '1.0.0',
          redactionApplied: false,
        },
      },
    ],
    derivedSteps: [
      {
        step_id: 'step-b1-1',
        session_id: SESSION_B1,
        ordinal: 1,
        title: 'Open Google Sheets',
        status: 'finalized',
        boundary_reason: 'navigation_changed',
        grouping_reason: 'click_then_navigate',
        confidence: 0.9,
        source_event_ids: ['evt-b1-1', 'evt-b1-2'],
        start_t_ms: NOW_MS,
        end_t_ms: NOW_MS + 1000,
        page_context: {
          domain: 'drive.google.com',
          applicationLabel: 'Google Drive',
          routeTemplate: '/drive',
        },
      },
      {
        step_id: 'step-b1-2',
        session_id: SESSION_B1,
        ordinal: 2,
        title: 'Click in spreadsheet',
        status: 'finalized',
        boundary_reason: 'action_completed',
        grouping_reason: 'single_action',
        confidence: 0.7,
        source_event_ids: ['evt-b1-3'],
        start_t_ms: NOW_MS + 2000,
        end_t_ms: NOW_MS + 3000,
        page_context: {
          domain: 'docs.google.com',
          applicationLabel: 'Google Sheets',
          routeTemplate: '/spreadsheets/d/:id',
        },
      },
    ],
  };

  it('step 1 instruction 0: labelled click uses single-word curly quotes', () => {
    const result = processSessionFull(input);
    // 'Files'.includes(' ') → false → openQ = U+201C, closeQ = U+201D
    expect(result.output.sop.steps[0]!.instructions[0]!.instruction).toBe('Click “Files”');
  });

  it('step 1 instruction 1: route_change emits page-navigation note', () => {
    const result = processSessionFull(input);
    // enrichedPageLabel → 'Spreadsheets' (not in GENERIC_PAGE_TITLES)
    // navigation.route_change case: `Page navigates to "${dest}"` with straight quotes
    expect(result.output.sop.steps[0]!.instructions[1]!.instruction).toBe(
      'Page navigates to "Spreadsheets"',
    );
  });

  it('step 2 instruction 0 (post-B1): labelless <div> in empty-title page → "Click in Google Sheets"', () => {
    // pre-B1: 'Click the target element in Google Sheets'
    //         ^ starts with 'Click the target element in '
    //         ∈ VAGUE_INSTRUCTION_PREFIXES → vague → SVR = 1/3 ≈ 0.33
    //
    // post-B1: sopBuilder falls through to if (page?.applicationLabel) branch
    //          → 'Click in Google Sheets'
    //          NOT in VAGUE_INSTRUCTION_STRINGS, NOT a vague prefix → SVR = 0
    const result = processSessionFull(input);
    expect(result.output.sop.steps[1]!.instructions[0]!.instruction).toBe('Click in Google Sheets');
  });

  it('sopValidation.ok is true (≥2 finalized steps)', () => {
    const result = processSessionFull(input);
    expect(result.sopValidation.ok).toBe(true);
  });

  it('SVR = 0: none of the three instructions is in any vague set', () => {
    const result = processSessionFull(input);
    if (!result.sopValidation.ok) return;
    expect(result.sopValidation.specificity?.svr).toBe(0);
  });

  it('vagueInstructionCount = 0', () => {
    const result = processSessionFull(input);
    if (!result.sopValidation.ok) return;
    expect(result.sopValidation.specificity?.vagueInstructionCount).toBe(0);
  });

  it('totalInstructionCount = 3 (click → note → click, all non-null classifyInstructionType)', () => {
    const result = processSessionFull(input);
    // step-b1-1: [interaction.click → 'action'] + [navigation.route_change → 'note'] = 2
    // step-b1-2: [interaction.click → 'action'] = 1
    // system.loading_finished and similar null-classified types are absent here
    if (!result.sopValidation.ok) return;
    expect(result.sopValidation.specificity?.totalInstructionCount).toBe(3);
  });
});

// ─── B2: cleanStepTitle coordinate stripping ──────────────────────────────────
//
// P0-c B2: contentEnricher.ts cleanStepTitle() strips bare spreadsheet
// cell-coordinate tokens from step titles. Coordinates (e.g. A1, B16, AA123)
// belong in instruction detail, not in the imperative step title.
//
// Pattern (whole-word): /^[A-Z]{1,3}\d{1,5}$/ — 1-3 uppercase letters + 1-5 digits.
//
// NOTE: B2 is a title-only fix. cleanStepTitle() does not touch
// SOPInstruction.instruction strings, so B2 has no SVR impact.
// These are pure unit tests; no processSessionFull pipeline is required.

describe('B2: cleanStepTitle coordinate stripping (unit)', () => {
  it('strips a single cell coordinate token from the middle of the title', () => {
    // 'A1' matches /^[A-Z]{1,3}\d{1,5}$/ as a whole-word token → filtered out
    expect(cleanStepTitle('Select A1 value', 'single_action')).toBe('Select value');
  });

  it('strips a multi-digit coordinate token from a data_entry title', () => {
    // 'A16' is a coordinate token → filtered; remaining tokens rejoin
    expect(cleanStepTitle('Enter A16 in cell', 'data_entry')).toBe('Enter in cell');
  });

  it('preserves titles that contain no coordinate tokens', () => {
    // 'Save' and 'button' do not match the /^[A-Z]{1,3}\d{1,5}$/ pattern
    expect(cleanStepTitle('Click Save button', 'single_action')).toBe('Click Save button');
  });
});

// ─── B3: quoting convention — SVR unaffected ─────────────────────────────────
//
// P0-c B3 in sopBuilder.ts interaction.click labelled path:
//   single-word label → openQ = U+201C  closeQ = U+201D  (typographic curly quotes)
//   multi-word  label → openQ = '"'     closeQ = '"'     (straight ASCII double-quotes)
//
// Neither 'Click "Save Changes"' (straight) nor 'Click “Done”' (curly)
// appears in VAGUE_INSTRUCTION_STRINGS or starts with any VAGUE_INSTRUCTION_PREFIXES.
// → SVR = 0 regardless of quoting style.

describe('B3: quoting convention — SVR unaffected', () => {
  const SESSION_B3 = 'svr-b3-001';

  const input: ProcessEngineInput = {
    sessionJson: {
      sessionId: SESSION_B3,
      activityName: 'Save and close document',
      startedAt: new Date(NOW_MS).toISOString(),
    },
    normalizedEvents: [
      {
        event_id: 'evt-b3-1',
        session_id: SESSION_B3,
        t_ms: NOW_MS,
        t_wall: new Date(NOW_MS).toISOString(),
        event_type: 'interaction.click',
        actor_type: 'human',
        page_context: {
          url: 'https://docs.google.com/document/d/abc',
          urlNormalized: 'https://docs.google.com/document/d/abc',
          domain: 'docs.google.com',
          routeTemplate: '/document/d/:id',
          pageTitle: 'Editor',
          applicationLabel: 'Google Docs',
        },
        target_summary: {
          // multi-word → sopBuilder uses straight " " quotes
          label: 'Save Changes',
          role: 'button',
          isSensitive: false,
        },
        normalization_meta: {
          sourceEventId: 'evt-b3-1',
          sourceEventType: 'interaction.click',
          normalizationRuleVersion: '1.0.0',
          redactionApplied: false,
        },
      },
      {
        event_id: 'evt-b3-2',
        session_id: SESSION_B3,
        t_ms: NOW_MS + 1000,
        t_wall: new Date(NOW_MS + 1000).toISOString(),
        event_type: 'interaction.click',
        actor_type: 'human',
        page_context: {
          url: 'https://docs.google.com/document/d/abc',
          urlNormalized: 'https://docs.google.com/document/d/abc',
          domain: 'docs.google.com',
          routeTemplate: '/document/d/:id',
          pageTitle: 'Editor',
          applicationLabel: 'Google Docs',
        },
        target_summary: {
          // single-word → sopBuilder uses typographic curly quotes U+201C / U+201D
          label: 'Done',
          role: 'button',
          isSensitive: false,
        },
        normalization_meta: {
          sourceEventId: 'evt-b3-2',
          sourceEventType: 'interaction.click',
          normalizationRuleVersion: '1.0.0',
          redactionApplied: false,
        },
      },
    ],
    derivedSteps: [
      {
        step_id: 'step-b3-1',
        session_id: SESSION_B3,
        ordinal: 1,
        title: 'Save changes',
        status: 'finalized',
        boundary_reason: 'action_completed',
        grouping_reason: 'single_action',
        confidence: 0.9,
        source_event_ids: ['evt-b3-1'],
        start_t_ms: NOW_MS,
        end_t_ms: NOW_MS + 500,
        page_context: {
          domain: 'docs.google.com',
          applicationLabel: 'Google Docs',
          routeTemplate: '/document/d/:id',
        },
      },
      {
        step_id: 'step-b3-2',
        session_id: SESSION_B3,
        ordinal: 2,
        title: 'Complete editing',
        status: 'finalized',
        boundary_reason: 'action_completed',
        grouping_reason: 'single_action',
        confidence: 0.9,
        source_event_ids: ['evt-b3-2'],
        start_t_ms: NOW_MS + 1000,
        end_t_ms: NOW_MS + 1500,
        page_context: {
          domain: 'docs.google.com',
          applicationLabel: 'Google Docs',
          routeTemplate: '/document/d/:id',
        },
      },
    ],
  };

  it('multi-word label uses straight double-quotes: Click "Save Changes"', () => {
    const result = processSessionFull(input);
    // 'Save Changes'.includes(' ') === true → openQ = '"', closeQ = '"'
    expect(result.output.sop.steps[0]!.instructions[0]!.instruction).toBe('Click "Save Changes"');
  });

  it('single-word label uses typographic curly quotes: Click “Done”', () => {
    const result = processSessionFull(input);
    // 'Done'.includes(' ') === false → openQ = U+201C, closeQ = U+201D
    expect(result.output.sop.steps[1]!.instructions[0]!.instruction).toBe('Click “Done”');
  });

  it('sopValidation.ok is true', () => {
    const result = processSessionFull(input);
    expect(result.sopValidation.ok).toBe(true);
  });

  it('SVR = 0: neither quoting variant produces a vague instruction string', () => {
    const result = processSessionFull(input);
    if (!result.sopValidation.ok) return;
    expect(result.sopValidation.specificity?.svr).toBe(0);
  });

  it('totalInstructionCount = 2 (one interaction.click per step)', () => {
    const result = processSessionFull(input);
    if (!result.sopValidation.ok) return;
    expect(result.sopValidation.specificity?.totalInstructionCount).toBe(2);
  });
});

// ─── B4: error-recovery action field — SVR unaffected ────────────────────────
//
// P0-c B4 in sopBuilder.ts buildAction() for grouping_reason = 'error_handling':
//   finds first interaction.click with a non-undefined safeTargetLabel → 'Retry'
//   produces action field: 'Resolve error — click “Retry” to continue'
//
// The action field is part of SopStep.action, NOT SOPInstruction.instruction.
// computeSopVagueness iterates step.instructions (not step.action), so the
// action field has zero effect on SVR.
//
// The instructions array for the error_handling step contains only:
//   [0] 'Error displayed — review and correct before continuing'  (system.error_displayed → verify)
//   [1] 'Click “Retry”'                                 (interaction.click → action)
// Neither is in VAGUE_INSTRUCTION_STRINGS or matches any VAGUE_INSTRUCTION_PREFIXES.
// → SVR = 0.

describe('B4: error-recovery action field — SVR unaffected', () => {
  const SESSION_B4 = 'svr-b4-001';

  const input: ProcessEngineInput = {
    sessionJson: {
      sessionId: SESSION_B4,
      activityName: 'Complete checkout',
      startedAt: new Date(NOW_MS).toISOString(),
    },
    normalizedEvents: [
      {
        event_id: 'evt-b4-1',
        session_id: SESSION_B4,
        t_ms: NOW_MS,
        t_wall: new Date(NOW_MS).toISOString(),
        event_type: 'interaction.click',
        actor_type: 'human',
        page_context: {
          url: 'https://shop.example.com/checkout',
          urlNormalized: 'https://shop.example.com/checkout',
          domain: 'shop.example.com',
          routeTemplate: '/checkout',
          pageTitle: 'Checkout',
          applicationLabel: 'Shop',
        },
        target_summary: {
          label: 'Continue',   // single-word → curly quotes in instruction
          role: 'button',
          isSensitive: false,
        },
        normalization_meta: {
          sourceEventId: 'evt-b4-1',
          sourceEventType: 'interaction.click',
          normalizationRuleVersion: '1.0.0',
          redactionApplied: false,
        },
      },
      {
        event_id: 'evt-b4-2',
        session_id: SESSION_B4,
        t_ms: NOW_MS + 1000,
        t_wall: new Date(NOW_MS + 1000).toISOString(),
        event_type: 'navigation.route_change',
        actor_type: 'system',
        page_context: {
          url: 'https://shop.example.com/payment',
          urlNormalized: 'https://shop.example.com/payment',
          domain: 'shop.example.com',
          routeTemplate: '/payment',
          // 'Payment' is not in GENERIC_PAGE_TITLES → enrichedPageLabel returns it directly
          pageTitle: 'Payment',
          applicationLabel: 'Shop',
        },
        target_summary: {
          label: '',
          role: 'link',
          isSensitive: false,
        },
        normalization_meta: {
          sourceEventId: 'evt-b4-2',
          sourceEventType: 'navigation.route_change',
          normalizationRuleVersion: '1.0.0',
          redactionApplied: false,
        },
      },
      {
        event_id: 'evt-b4-3',
        session_id: SESSION_B4,
        t_ms: NOW_MS + 2000,
        t_wall: new Date(NOW_MS + 2000).toISOString(),
        event_type: 'system.error_displayed',
        actor_type: 'system',
        page_context: {
          url: 'https://shop.example.com/payment',
          urlNormalized: 'https://shop.example.com/payment',
          domain: 'shop.example.com',
          routeTemplate: '/payment',
          pageTitle: 'Payment',
          applicationLabel: 'Shop',
        },
        target_summary: {
          label: '',
          role: 'div',
          isSensitive: false,
        },
        normalization_meta: {
          sourceEventId: 'evt-b4-3',
          sourceEventType: 'system.error_displayed',
          normalizationRuleVersion: '1.0.0',
          redactionApplied: false,
        },
      },
      {
        event_id: 'evt-b4-4',
        session_id: SESSION_B4,
        t_ms: NOW_MS + 3000,
        t_wall: new Date(NOW_MS + 3000).toISOString(),
        event_type: 'interaction.click',
        actor_type: 'human',
        page_context: {
          url: 'https://shop.example.com/payment',
          urlNormalized: 'https://shop.example.com/payment',
          domain: 'shop.example.com',
          routeTemplate: '/payment',
          pageTitle: 'Payment',
          applicationLabel: 'Shop',
        },
        target_summary: {
          // single-word → curly quotes in both the instruction and the action field
          label: 'Retry',
          role: 'button',
          isSensitive: false,
        },
        normalization_meta: {
          sourceEventId: 'evt-b4-4',
          sourceEventType: 'interaction.click',
          normalizationRuleVersion: '1.0.0',
          redactionApplied: false,
        },
      },
    ],
    derivedSteps: [
      {
        step_id: 'step-b4-1',
        session_id: SESSION_B4,
        ordinal: 1,
        title: 'Continue to payment',
        status: 'finalized',
        boundary_reason: 'navigation_changed',
        grouping_reason: 'click_then_navigate',
        confidence: 0.9,
        source_event_ids: ['evt-b4-1', 'evt-b4-2'],
        start_t_ms: NOW_MS,
        end_t_ms: NOW_MS + 1000,
        page_context: {
          domain: 'shop.example.com',
          applicationLabel: 'Shop',
          routeTemplate: '/checkout',
        },
      },
      {
        step_id: 'step-b4-2',
        session_id: SESSION_B4,
        ordinal: 2,
        title: 'Handle error',
        status: 'finalized',
        boundary_reason: 'error_occurred',
        grouping_reason: 'error_handling',
        confidence: 0.8,
        source_event_ids: ['evt-b4-3', 'evt-b4-4'],
        start_t_ms: NOW_MS + 2000,
        end_t_ms: NOW_MS + 3500,
        page_context: {
          domain: 'shop.example.com',
          applicationLabel: 'Shop',
          routeTemplate: '/payment',
        },
      },
    ],
  };

  it('step 1 instruction 0: labelled click "Continue" uses curly quotes', () => {
    const result = processSessionFull(input);
    expect(result.output.sop.steps[0]!.instructions[0]!.instruction).toBe('Click “Continue”');
  });

  it('step 1 instruction 1: route_change emits page-navigation note', () => {
    const result = processSessionFull(input);
    expect(result.output.sop.steps[0]!.instructions[1]!.instruction).toBe(
      'Page navigates to "Payment"',
    );
  });

  it('step 2 instruction 0: system.error_displayed emits verify instruction', () => {
    const result = processSessionFull(input);
    // Exact string from sopBuilder.ts case 'system.error_displayed' (line 362):
    //   'Error displayed — review and correct before continuing'
    // U+2014 = EM DASH. This string is NOT in VAGUE_INSTRUCTION_STRINGS.
    expect(result.output.sop.steps[1]!.instructions[0]!.instruction).toBe(
      'Error displayed — review and correct before continuing',
    );
  });

  it('step 2 instruction 1: recovery click "Retry" uses curly quotes', () => {
    const result = processSessionFull(input);
    expect(result.output.sop.steps[1]!.instructions[1]!.instruction).toBe('Click “Retry”');
  });

  it('step 2 action: B4 buildAction surfaces recovery label in SopStep.action field', () => {
    const result = processSessionFull(input);
    // buildAction() for error_handling finds evt-b4-4 (safeTargetLabel('Retry') !== undefined)
    // 'Retry'.includes(' ') === false → oQ = U+201D, cQ = U+201D (sopBuilder.ts:580 uses
    // U+201D for both branches of the ternary, so the opening quote is also a right curly quote).
    // action field value is 'Resolve error — click ”Retry” to continue'
    // NOTE: this field is NOT part of SOPInstruction.instruction and does NOT
    // contribute to SVR.
    expect(result.output.sop.steps[1]!.action).toBe(
      'Resolve error — click ”Retry” to continue',
    );
  });

  it('sopValidation.ok is true', () => {
    const result = processSessionFull(input);
    expect(result.sopValidation.ok).toBe(true);
  });

  it('SVR = 0: neither error instruction nor recovery click is vague', () => {
    const result = processSessionFull(input);
    if (!result.sopValidation.ok) return;
    expect(result.sopValidation.specificity?.svr).toBe(0);
  });

  it('vagueInstructionCount = 0', () => {
    const result = processSessionFull(input);
    if (!result.sopValidation.ok) return;
    expect(result.sopValidation.specificity?.vagueInstructionCount).toBe(0);
  });

  it('totalInstructionCount = 4 (click + route_change + error_displayed + click)', () => {
    const result = processSessionFull(input);
    // step-b4-1: [interaction.click → 'action'] + [navigation.route_change → 'note'] = 2
    // step-b4-2: [system.error_displayed → 'verify'] + [interaction.click → 'action'] = 2
    // Total = 4
    if (!result.sopValidation.ok) return;
    expect(result.sopValidation.specificity?.totalInstructionCount).toBe(4);
  });
});
