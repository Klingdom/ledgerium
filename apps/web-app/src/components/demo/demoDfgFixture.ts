/**
 * demoDfgFixture — a static, deterministic sample process for the public /demo
 * live process-map embed.
 *
 * This is illustrative SAMPLE data, not a real customer recording. It is built
 * through the REAL deterministic builder (`buildDirectlyFollowsGraph`) so the
 * embedded `DfgFrequencyMap` renders exactly as it does in the product — same
 * frequency encoding, same performance-mode color scale, same coverage filter.
 *
 * Process: "Submit expense report" recorded 47 times, producing 4 variants:
 *  - Standard happy path (28 runs)
 *  - Fast path that skips Finance review (9 runs)
 *  - Rework path where receipts are rejected and re-attached (6 runs — a loop)
 *  - Exception path with an approval escalation (4 runs)
 *
 * Durations are tuned so Manager approval + Finance review read as the slow
 * steps in performance mode. No Date.now / Math.random — fully deterministic.
 *
 * MAINTAIN: update if the VariantInput / DirectlyFollowsGraph contract changes
 * (see lib/variantFlowModel.ts and lib/dfgModel.ts). TypeScript will flag drift.
 */

import { buildDirectlyFollowsGraph, type VariantInput } from '@/lib/dfgModel';

const SEC = 1000;

const DEMO_VARIANTS: VariantInput[] = [
  // ── Standard happy path — most runs ──────────────────────────────────────
  {
    id: 'demo-standard',
    isStandard: true,
    runCount: 28,
    frequency: 0.6,
    stepCategories: [
      'click_then_navigate',
      'single_action',
      'data_entry',
      'file_action',
      'send_action',
      'single_action',
      'single_action',
      'single_action',
    ],
    stepTitles: [
      'Open expense portal',
      'Create new report',
      'Add line items',
      'Attach receipts',
      'Submit for approval',
      'Manager approval',
      'Finance review',
      'Reimbursed',
    ],
    stepDurationsMs: [8 * SEC, 22 * SEC, 95 * SEC, 64 * SEC, 12 * SEC, 186 * SEC, 238 * SEC, 6 * SEC],
    evidenceRunIds: ['EXP-1042', 'EXP-1051', 'EXP-1067', 'EXP-1090'],
  },

  // ── Fast path — small amounts skip Finance review ────────────────────────
  {
    id: 'demo-fast',
    isStandard: false,
    runCount: 9,
    frequency: 0.19,
    stepCategories: [
      'click_then_navigate',
      'single_action',
      'data_entry',
      'file_action',
      'send_action',
      'single_action',
      'single_action',
    ],
    stepTitles: [
      'Open expense portal',
      'Create new report',
      'Add line items',
      'Attach receipts',
      'Submit for approval',
      'Manager approval',
      'Reimbursed',
    ],
    stepDurationsMs: [8 * SEC, 21 * SEC, 72 * SEC, 58 * SEC, 11 * SEC, 152 * SEC, 6 * SEC],
    evidenceRunIds: ['EXP-1033', 'EXP-1048', 'EXP-1072'],
  },

  // ── Rework path — receipts rejected, re-attached + re-submitted (loop) ───
  {
    id: 'demo-rework',
    isStandard: false,
    runCount: 6,
    frequency: 0.13,
    stepCategories: [
      'click_then_navigate',
      'single_action',
      'data_entry',
      'file_action',
      'send_action',
      'file_action',
      'send_action',
      'single_action',
      'single_action',
      'single_action',
    ],
    stepTitles: [
      'Open expense portal',
      'Create new report',
      'Add line items',
      'Attach receipts',
      'Submit for approval',
      'Attach receipts',
      'Submit for approval',
      'Manager approval',
      'Finance review',
      'Reimbursed',
    ],
    stepDurationsMs: [
      8 * SEC, 23 * SEC, 110 * SEC, 70 * SEC, 13 * SEC, 95 * SEC, 12 * SEC, 210 * SEC, 250 * SEC, 6 * SEC,
    ],
    evidenceRunIds: ['EXP-1019', 'EXP-1080'],
  },

  // ── Exception path — finance escalation back to manager ──────────────────
  {
    id: 'demo-exception',
    isStandard: false,
    runCount: 4,
    frequency: 0.08,
    stepCategories: [
      'click_then_navigate',
      'single_action',
      'data_entry',
      'file_action',
      'send_action',
      'single_action',
      'single_action',
      'single_action',
      'single_action',
      'single_action',
    ],
    stepTitles: [
      'Open expense portal',
      'Create new report',
      'Add line items',
      'Attach receipts',
      'Submit for approval',
      'Manager approval',
      'Finance review',
      'Manager approval',
      'Finance review',
      'Reimbursed',
    ],
    stepDurationsMs: [
      8 * SEC, 24 * SEC, 100 * SEC, 62 * SEC, 12 * SEC, 190 * SEC, 240 * SEC, 175 * SEC, 230 * SEC, 6 * SEC,
    ],
    evidenceRunIds: ['EXP-1007', 'EXP-1099'],
  },
];

/** The built sample process map — deterministic, consumed by the /demo embed. */
export const DEMO_DFG = buildDirectlyFollowsGraph(DEMO_VARIANTS);

/** Number of variants in the sample process (for the embed's analytics payload). */
export const DEMO_VARIANT_COUNT = DEMO_VARIANTS.length;

/** Standard-path frequency, for the embed's analytics payload. */
export const DEMO_STANDARD_FREQUENCY = 0.6;
