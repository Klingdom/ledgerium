/**
 * Test fixtures for workflow-metrics.ts
 *
 * Five archetypes matching PRD §11 Mock Data Plan.
 * All typed as WorkflowMetricsInput.
 *
 * @see docs/prd/PRD_DASHBOARD_V2.md §11
 */

import type { WorkflowMetricsInput } from '../workflow-metrics.js';

/**
 * Fixture 1: Workflow with all fields populated.
 * processDefinition.runCount=10, stabilityScore=0.8, processInsights with a bottleneck.
 */
export const FIXTURE_FULL: WorkflowMetricsInput = {
  id: 'fixture-full',
  confidence: 0.85,
  stepCount: 8,
  durationMs: 120_000,      // 2 min — inside ideal range
  phaseCount: 3,
  toolsUsed: ['Salesforce', 'Slack', 'Jira'],
  createdAt: new Date('2026-01-15T10:00:00Z'),
  lastViewedAt: new Date('2026-04-01T09:00:00Z'),
  processDefinition: {
    runCount: 10,
    variantCount: 2,
    avgDurationMs: 115_000,
    medianDurationMs: 110_000,
    stabilityScore: 0.8,
    confidenceScore: 0.87,
  },
  processInsights: [
    {
      insightType: 'bottleneck',
      severity: 'warning',
      title: 'Salesforce data entry step',
      observedValue: '45s avg',
    },
    {
      insightType: 'variance',
      severity: 'info',
      title: 'Step 3 varies by user',
      observedValue: null,
    },
  ],
};

/**
 * Fixture 2: Workflow with null processDefinition (single recording).
 */
export const FIXTURE_SINGLE_RECORDING: WorkflowMetricsInput = {
  id: 'fixture-single-recording',
  confidence: 0.72,
  stepCount: 5,
  durationMs: 90_000,        // 1.5 min — inside ideal range
  phaseCount: 2,
  toolsUsed: ['Excel'],
  createdAt: new Date('2026-03-10T08:00:00Z'),
  lastViewedAt: null,
  processDefinition: null,
  processInsights: [],
};

/**
 * Fixture 3: Workflow with null confidence, null durationMs (sparse data).
 */
export const FIXTURE_SPARSE: WorkflowMetricsInput = {
  id: 'fixture-sparse',
  confidence: null,
  stepCount: 2,
  durationMs: null,
  phaseCount: null,
  toolsUsed: [],
  createdAt: new Date('2026-02-01T12:00:00Z'),
  lastViewedAt: null,
  processDefinition: null,
  processInsights: [],
};

/**
 * Fixture 4: Workflow with variationScore > 0.7 and aiOpportunityScore > 60.
 * Should tag 'automate' (rule 1: high AI score + multi-tool, taking priority over standardize).
 *
 * variationScore = 1 - stabilityScore = 1 - 0.2 = 0.8 (> 0.67 → high)
 * toolsUsed.length = 3 (>= 2) and AI score > 60 (high steps + long duration)
 */
export const FIXTURE_AUTOMATE: WorkflowMetricsInput = {
  id: 'fixture-automate',
  confidence: 0.65,
  stepCount: 20,             // high step count → high AI score
  durationMs: 600_000,       // 10 min → high AI score
  phaseCount: 4,
  toolsUsed: ['SAP', 'Outlook', 'SharePoint'],  // 3 tools
  createdAt: new Date('2025-12-01T09:00:00Z'),
  lastViewedAt: new Date('2026-03-01T09:00:00Z'),
  processDefinition: {
    runCount: 7,
    variantCount: 4,
    avgDurationMs: 590_000,
    medianDurationMs: 580_000,
    stabilityScore: 0.2,     // variation = 0.8 (> 0.67)
    confidenceScore: 0.65,
  },
  processInsights: [],
};

/**
 * Fixture 5: Workflow with healthScoreV2.overall < 40 (should tag 'monitor').
 *
 * Designed to produce low overall:
 * - efficiency: durationMs null → 0
 * - consistency: variationScore = 0.5 default → (1-0.5)*30 = 15
 * - reliability: confidence null → 0
 * - standardization: stepCount null → 0
 * overall = 0 + 15 + 0 + 0 = 15 (< 40)
 */
export const FIXTURE_MONITOR: WorkflowMetricsInput = {
  id: 'fixture-monitor',
  confidence: null,
  stepCount: null,
  durationMs: null,
  phaseCount: null,
  toolsUsed: [],
  createdAt: new Date('2026-04-01T10:00:00Z'),
  lastViewedAt: null,
  processDefinition: null,
  processInsights: [],
};
