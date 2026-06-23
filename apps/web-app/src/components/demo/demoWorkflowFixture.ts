/**
 * demoWorkflowFixture — canonical 5-workflow demo dataset.
 *
 * All timestamps are offsets from the frozen clock anchor:
 *   DEMO_NOW_MS = 1_700_000_000_000  (2023-11-14T22:13:20Z)
 *
 * This is plain-data only — no server imports, no Math.random(), no Date.now().
 * The metricsV2 shapes are internally consistent:
 *   healthScore.overall = speed + consistency + dataQuality + standardization
 *
 * Per-row derivations:
 *  1. Approve Expense Report  — health 82  speed 22 + consistency 26 + dq 14 + std 20 = 82
 *  2. Create Purchase Order   — health 91  speed 30 + consistency 28 + dq 18 + std 15 = 91
 *  3. Process Customer Refund — health 71  speed 28 + consistency 20 + dq 12 + std 11 = 71
 *  4. Onboard New Vendor      — health 64  speed 18 + consistency 18 + dq 12 + std 16 = 64
 *  5. Monthly Payroll Close   — health 57  speed 22 + consistency 14 + dq 12 + std  9 = 57
 */

import type { WorkflowRowData } from '@/components/dashboard-v2/WorkflowRow';

// Frozen clock anchor — never use Date.now() or Math.random() here.
export const DEMO_NOW_MS = 1_700_000_000_000;

// Helper: offset-based ISO string from DEMO_NOW_MS
function ts(offsetMs: number): string {
  return new Date(DEMO_NOW_MS - offsetMs).toISOString();
}

const H = 60 * 60 * 1000;
const D = 24 * H;

export const DEMO_WORKFLOW_ROWS: WorkflowRowData[] = [
  {
    // ── 1. HERO workflow (row-click opens drill-down) ──────────────────────
    id: 'demo-01-approve-expense-report',
    title: 'Approve Expense Report',
    toolsUsed: ['Concur', 'Slack'],
    createdAt: ts(14 * D),
    updatedAt: ts(2 * H),
    lastViewedAt: ts(2 * H),
    processDefinitionUpdatedAt: ts(2 * H),
    isStale: false,
    metricsV2: {
      runs: 16,
      avgTimeMs: 120_000,        // ~2 min
      variationScore: 0.42,
      variationLabel: 'medium',
      bottleneckLabel: 'Review line items',
      healthScore: {
        overall: 82,
        speed: 22,
        consistency: 26,
        dataQuality: 14,
        standardization: 20,
        isGated: false,
      },
      opportunityTag: 'standardize',
      aiOpportunityScore: 52,
      confidence: 0.87,
      variantCount: 3,
      medianDurationMs: 118_000,
      sequenceStability: 0.68,
      standardPathFrequency: 0.75,
      stepCountVarianceStdDev: 1.2,
    },
  },
  {
    // ── 2. Create Purchase Order ───────────────────────────────────────────
    id: 'demo-02-create-purchase-order',
    title: 'Create Purchase Order',
    toolsUsed: ['SAP', 'Outlook'],
    createdAt: ts(21 * D),
    updatedAt: ts(5 * H),
    lastViewedAt: ts(5 * H),
    processDefinitionUpdatedAt: ts(5 * H),
    isStale: false,
    metricsV2: {
      runs: 23,
      avgTimeMs: 272_000,        // ~4 min 32 s
      variationScore: 0.19,
      variationLabel: 'low',
      bottleneckLabel: 'Enter vendor + line items',
      healthScore: {
        overall: 91,
        speed: 30,
        consistency: 28,
        dataQuality: 18,
        standardization: 15,
        isGated: false,
      },
      opportunityTag: 'healthy',
      aiOpportunityScore: 34,
      confidence: 0.93,
      variantCount: 2,
      medianDurationMs: 269_000,
      sequenceStability: 0.91,
      standardPathFrequency: 0.87,
      stepCountVarianceStdDev: 0.4,
    },
  },
  {
    // ── 3. Process Customer Refund ─────────────────────────────────────────
    id: 'demo-03-process-customer-refund',
    title: 'Process Customer Refund',
    toolsUsed: ['Salesforce', 'Stripe', 'Zendesk'],
    createdAt: ts(7 * D),
    updatedAt: ts(38 * 60 * 1000),     // 38 min ago
    lastViewedAt: ts(38 * 60 * 1000),
    processDefinitionUpdatedAt: ts(38 * 60 * 1000),
    isStale: false,
    metricsV2: {
      runs: 34,
      avgTimeMs: 190_000,        // ~3 min 10 s
      variationScore: 0.55,
      variationLabel: 'medium',
      bottleneckLabel: 'Issue refund in Stripe',
      healthScore: {
        overall: 71,
        speed: 28,
        consistency: 20,
        dataQuality: 12,
        standardization: 11,
        isGated: false,
      },
      opportunityTag: 'automate',
      aiOpportunityScore: 74,
      confidence: 0.81,
      variantCount: 5,
      medianDurationMs: 185_000,
      sequenceStability: 0.58,
      standardPathFrequency: 0.62,
      stepCountVarianceStdDev: 1.8,
    },
  },
  {
    // ── 4. Onboard New Vendor ──────────────────────────────────────────────
    id: 'demo-04-onboard-new-vendor',
    title: 'Onboard New Vendor',
    toolsUsed: ['Coupa', 'DocuSign', 'Slack'],
    createdAt: ts(30 * D),
    updatedAt: ts(1 * D),
    lastViewedAt: ts(1 * D),
    processDefinitionUpdatedAt: ts(1 * D),
    isStale: false,
    metricsV2: {
      runs: 8,
      avgTimeMs: 298_000,        // ~4 min 58 s
      variationScore: 0.61,
      variationLabel: 'high',
      bottleneckLabel: 'Upload W-9 + banking docs',
      healthScore: {
        overall: 64,
        speed: 18,
        consistency: 18,
        dataQuality: 12,
        standardization: 16,
        isGated: false,
      },
      opportunityTag: 'automate',
      aiOpportunityScore: 68,
      confidence: 0.72,
      variantCount: 4,
      medianDurationMs: 310_000,
      sequenceStability: 0.49,
      standardPathFrequency: 0.50,
      stepCountVarianceStdDev: 2.3,
    },
  },
  {
    // ── 5. Monthly Payroll Close ───────────────────────────────────────────
    id: 'demo-05-monthly-payroll-close',
    title: 'Monthly Payroll Close',
    toolsUsed: ['Workday', 'Excel', 'ADP'],
    createdAt: ts(60 * D),
    updatedAt: ts(3 * D),
    lastViewedAt: ts(3 * D),
    processDefinitionUpdatedAt: ts(3 * D),
    isStale: false,
    metricsV2: {
      runs: 6,
      avgTimeMs: 680_000,        // ~11 min 20 s
      variationScore: 0.71,
      variationLabel: 'high',
      bottleneckLabel: 'Reconcile hours in Excel',
      healthScore: {
        overall: 57,
        speed: 22,
        consistency: 14,
        dataQuality: 12,
        standardization: 9,
        isGated: false,
      },
      opportunityTag: 'monitor',
      aiOpportunityScore: 45,
      confidence: 0.65,
      variantCount: 6,
      medianDurationMs: 700_000,
      sequenceStability: 0.38,
      standardPathFrequency: 0.33,
      stepCountVarianceStdDev: 3.1,
    },
  },
];

/** The HERO workflow (first row — used for drill-down demos). */
export const DEMO_HERO_WORKFLOW = DEMO_WORKFLOW_ROWS[0]!;
