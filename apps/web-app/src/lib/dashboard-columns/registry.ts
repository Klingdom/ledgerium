/**
 * Workflow Dashboard Column Registry — catalog (iter-056 / Path D D+1).
 *
 * Single source of truth for every column the workflow library can render.
 * Closes WDC-P02 (zero column-customization surface) by enumerating the full
 * column space ahead of the picker (D+4), filter chips (D+2), persistence
 * (D+3), preset chips (D+5), and default pack (D+6) iterations.
 *
 * Entry layout:
 *  1. **Display columns (6)** — currently-rendered fields in WorkflowRow.tsx.
 *     All `availability: 'available'`, all `defaultVisible: true` (these match
 *     the 6 user-visible data points the v2 dashboard ships today).
 *  2. **Tier A metrics (32)** — canonical metric_keys from
 *     ARCHITECTURE_METRICS_ENGINE.md §2 enumerated verbatim. Most are
 *     `availability: 'pending-path-c-r1'`; a small subset is also derivable
 *     from today's `WorkflowMetricsOutput` and is marked `'available'` with a
 *     wired accessor.
 *
 * Determinism: the catalog is a frozen module-singleton. Tests assert
 * `Object.is(WORKFLOW_DASHBOARD_COLUMNS, WORKFLOW_DASHBOARD_COLUMNS)` across
 * imports and that key uniqueness, label/description budgets, and the
 * audit-honesty invariant (accessor non-null IFF available) all hold.
 *
 * Audit-honesty (Ledgerium determinism + MDR-P01/P02 precedent): a column
 * claiming computability it does not have is a Ledgerium invariant violation.
 * The registry test asserts the invariant. Path C R+1 / R+3 iterations flip
 * pending entries to available by adding the accessor + updating the literal
 * here in lockstep.
 *
 * @see types.ts — WorkflowDashboardColumn shape
 * @see accessors.ts — concrete derivations for available columns
 * @see docs/meta/WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001.md (WDC-P02 + §8)
 * @see docs/features/dashboard-v3-metrics-engine/ARCHITECTURE_METRICS_ENGINE.md §2
 * @see docs/features/dashboard-v3-metrics-engine/SNAPSHOT_TABLE_DECISION.md (iter-055)
 */

import {
  accessWorkflowTitle,
  accessSystems,
  accessOpportunityTag,
  accessHealthScore,
  accessLastRunAt,
  accessRunCount,
  accessDateRecorded,
  accessCycleTimeMs,
  accessCycleTimeMeanMs,
  accessCaseVolume,
  accessSystemCountPerRun,
} from './accessors.js';
import type { WorkflowDashboardColumn } from './types.js';

/**
 * The full registry — frozen at module load. 39 entries: 7 display columns +
 * 32 Tier A architecture metrics.
 *
 * Default-pack rationale (`defaultVisible: true` ⇔ shipped today):
 *   workflow_title · systems · opportunity_tag · health_score · last_run_at ·
 *   run_count · cycle_time_mean_ms · date_recorded
 *
 * WDC2-P03 (iter-067): expanded to 7 columns by promoting cycle_time_mean_ms
 * to default-visible.  The accessor reads WorkflowMetricsOutput.avgTimeMs
 * which is available for all processed workflows.
 *
 * Batch A / dashboard-redesign (2026-06-12): added date_recorded display column
 * (Workflow.createdAt) + promoted it to default-visible (8 default columns).
 */
export const WORKFLOW_DASHBOARD_COLUMNS: ReadonlyArray<WorkflowDashboardColumn> =
  Object.freeze([
    // ── Display columns (6) — currently rendered in WorkflowRow.tsx ─────────
    {
      key: 'workflow_title',
      label: 'Workflow',
      description: 'Workflow display title shown as the row name.',
      dataType: 'string',
      sortable: true,
      filterable: true,
      defaultVisible: true,
      defaultGroup: 'display',
      planTierGate: null,
      availability: 'available',
      accessor: accessWorkflowTitle,
    },
    {
      key: 'systems',
      label: 'Systems',
      description: 'Distinct apps/tools observed across the workflow runs.',
      dataType: 'string',
      sortable: false,
      filterable: true,
      defaultVisible: true,
      defaultGroup: 'display',
      planTierGate: null,
      availability: 'available',
      accessor: accessSystems,
    },
    {
      key: 'opportunity_tag',
      label: 'Opportunity',
      description: 'Suggested action: automate, standardize, optimize, monitor, or healthy.',
      dataType: 'enum',
      sortable: true,
      filterable: true,
      defaultVisible: true,
      defaultGroup: 'display',
      planTierGate: null,
      availability: 'available',
      accessor: accessOpportunityTag,
    },
    {
      key: 'health_score',
      label: 'Health Score',
      description: 'Composite 0–100 score across speed, consistency, data quality, standardization.',
      dataType: 'number',
      sortable: true,
      filterable: true,
      defaultVisible: true,
      defaultGroup: 'display',
      planTierGate: null,
      availability: 'available',
      accessor: accessHealthScore,
    },
    {
      key: 'last_run_at',
      label: 'Last Run',
      description: 'Timestamp of the most recent workflow activity.',
      dataType: 'date',
      sortable: true,
      filterable: true,
      defaultVisible: true,
      defaultGroup: 'display',
      planTierGate: null,
      availability: 'available',
      accessor: accessLastRunAt,
    },
    {
      key: 'run_count',
      label: 'Runs',
      description: 'Number of runs observed for this workflow.',
      dataType: 'number',
      sortable: true,
      filterable: true,
      defaultVisible: true,
      defaultGroup: 'display',
      planTierGate: null,
      availability: 'available',
      accessor: accessRunCount,
    },
    {
      // Batch A / dashboard-redesign P0 item 1 (2026-06-12).
      // Source: Workflow.createdAt — the earliest wall-clock moment the workflow
      // was created.  Accessor is a lifetime accessor (ignores referenceNowMs +
      // activeTimeRange) and satisfies the Group G lifetime-preservation contract.
      // Render as absolute date ("Jun 12, 2026") — deterministic + hydration-safe.
      key: 'date_recorded',
      label: 'Date Recorded',
      description: 'Date the workflow was first recorded in the system.',
      dataType: 'date',
      sortable: true,
      filterable: true,
      defaultVisible: true,
      defaultGroup: 'display',
      planTierGate: null,
      availability: 'available',
      accessor: accessDateRecorded,
    },

    // ── Layer 1: Operational flow (9 Tier A metrics) ────────────────────────
    {
      key: 'cycle_time_ms',
      label: 'Cycle Time',
      description: 'Run end timestamp minus run start timestamp, in milliseconds.',
      dataType: 'duration',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'flow',
      planTierGate: null,
      availability: 'available',
      accessor: accessCycleTimeMs,
    },
    {
      key: 'throughput_time_ms',
      label: 'Throughput Time',
      description: 'End-to-end run duration. Diverges from Cycle Time only at sub-process grain.',
      dataType: 'duration',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'flow',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'completion_rate_pct',
      label: 'Completion Rate',
      description: 'Share of runs reaching a complete terminal status.',
      dataType: 'percentage',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'flow',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'case_volume',
      label: 'Case Volume',
      description: 'Total number of runs grouped at the workflow entity grain.',
      dataType: 'number',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'flow',
      planTierGate: null,
      availability: 'available',
      accessor: accessCaseVolume,
    },
    {
      key: 'arrival_rate_per_day',
      label: 'Arrivals / Day',
      description: 'Daily count of new runs started.',
      dataType: 'number',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'flow',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'completion_rate_per_day',
      label: 'Completions / Day',
      description: 'Daily count of runs reaching complete status.',
      dataType: 'number',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'flow',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'cycle_time_mean_ms',
      label: 'Mean Cycle Time',
      description: 'Mean run duration across the selected time window.',
      dataType: 'duration',
      sortable: true,
      filterable: true,
      // WDC2-P03 (iter-067): promoted to default-pack (7th column) per CEO Signal 2
      // unblocked by iter-065 ColumnAccessorContext extension.  Accessor reads
      // WorkflowMetricsOutput.avgTimeMs which is always available for processed
      // workflows — audit-honesty IFF invariant preserved.
      defaultVisible: true,
      defaultGroup: 'flow',
      planTierGate: null,
      availability: 'available',
      accessor: accessCycleTimeMeanMs,
    },
    {
      key: 'cycle_time_median_ms',
      label: 'Median Cycle Time',
      description: 'Median run duration across the selected time window.',
      dataType: 'duration',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'flow',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'cycle_time_p95_ms',
      label: 'P95 Cycle Time',
      description: 'Ninety-fifth-percentile run duration across the time window.',
      dataType: 'duration',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'flow',
      planTierGate: 'starter',
      availability: 'pending-path-c-r1',
      accessor: null,
    },

    // ── Layer 2: Step performance (6 Tier A metrics) ────────────────────────
    {
      key: 'avg_step_duration_ms',
      label: 'Avg Step Duration',
      description: 'Mean duration of a step within a run.',
      dataType: 'duration',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'step',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'median_step_duration_ms',
      label: 'Median Step Duration',
      description: 'Median duration of a step within a run.',
      dataType: 'duration',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'step',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'step_frequency',
      label: 'Step Frequency',
      description: 'How often a canonical step appears per run on average.',
      dataType: 'number',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'step',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'step_error_rate_pct',
      label: 'Step Error Rate',
      description: 'Share of step occurrences classified as error handling.',
      dataType: 'percentage',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'step',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'is_bottleneck_step',
      label: 'Has Bottleneck',
      description: 'Whether the workflow contains a detected bottleneck step.',
      dataType: 'boolean',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'step',
      planTierGate: null,
      availability: 'pending-path-c-r3',
      accessor: null,
    },
    {
      key: 'is_high_variance_step',
      label: 'Has Variance Hotspot',
      description: 'Whether the workflow has a high-variance step in its path.',
      dataType: 'boolean',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'step',
      planTierGate: null,
      availability: 'pending-path-c-r3',
      accessor: null,
    },

    // ── Layer 3: Variation and conformance (5 Tier A metrics) ───────────────
    {
      key: 'variant_count',
      label: 'Variant Count',
      description: 'Number of distinct execution paths observed.',
      dataType: 'number',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'variation',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'top_variant_share_pct',
      label: 'Top Variant Share',
      description: 'Share of runs following the most-frequent variant path.',
      dataType: 'percentage',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'variation',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'path_length_avg',
      label: 'Avg Path Length',
      description: 'Mean number of steps per run.',
      dataType: 'number',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'variation',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'path_length_stddev',
      label: 'Path Length StdDev',
      description: 'Standard deviation of step count across runs.',
      dataType: 'number',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'variation',
      planTierGate: 'starter',
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'path_similarity_avg',
      label: 'Path Similarity',
      description: 'Mean similarity of variants to the standard path.',
      dataType: 'number',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'variation',
      planTierGate: 'starter',
      availability: 'pending-path-c-r1',
      accessor: null,
    },

    // ── Layer 4: Quality and outcome (4 Tier A metrics) ─────────────────────
    {
      key: 'error_rate_pct',
      label: 'Error Rate',
      description: 'Share of runs containing a classified error step.',
      dataType: 'percentage',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'quality',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'exception_rate_pct',
      label: 'Exception Rate',
      description: 'Share of runs containing an error step or a classified friction event.',
      dataType: 'percentage',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'quality',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'failure_rate_pct',
      label: 'Failure Rate',
      description: 'Share of runs whose status is failed.',
      dataType: 'percentage',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'quality',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'abandonment_rate_pct',
      label: 'Abandonment Rate',
      description: 'Share of runs reaching only a partial terminal status.',
      dataType: 'percentage',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'quality',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },

    // ── Layer 5: Human/task mining behavior (7 Tier A metrics per §2 verdict) ─
    //
    // Architecture §2 line 160 verdict: "Layer 5 verdict: 7A / 3B / 3C / 0D".
    // The Layer 5 table enumerates 8 A-tagged rows but the verdict counts 7;
    // we follow the verdict (which matches the canonical summary at §2 line
    // 232 "32 Tier A — Computable today | 32 | 34%"). `idle_bursts_count` is
    // the run-grain count of `boundary_reason='idle_gap'` transitions, which
    // structurally lives at `process_run_snapshot` per SNAPSHOT_TABLE_DECISION
    // §2.2 — i.e. Path C R+3 grain, not R+1 aggregate. We surface it via the
    // pending-path-c-r3 availability through the broader Layer 5 picker rollup
    // when R+3 lands, but it is intentionally NOT counted as a Tier A column
    // here to keep the registry at the canonical 32-Tier-A total.
    {
      key: 'clicks_per_run',
      label: 'Clicks / Run',
      description: 'Mean number of click interactions per run.',
      dataType: 'number',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'behavior',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'actions_per_run',
      label: 'Actions / Run',
      description: 'Mean number of human-actor events per run.',
      dataType: 'number',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'behavior',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'avg_action_duration_ms',
      label: 'Avg Action Duration',
      description: 'Mean duration of a human action across runs.',
      dataType: 'duration',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'behavior',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'system_count_per_run',
      label: 'Systems / Run',
      description: 'Mean number of distinct systems observed per run.',
      dataType: 'number',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'behavior',
      planTierGate: null,
      availability: 'available',
      accessor: accessSystemCountPerRun,
    },
    {
      key: 'application_switch_rate',
      label: 'App Switch Rate',
      description: 'Adjacent application boundary transitions per run.',
      dataType: 'number',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'behavior',
      planTierGate: 'starter',
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'data_entry_time_ms',
      label: 'Data Entry Time',
      description: 'Sum of step durations classified as data entry.',
      dataType: 'duration',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'behavior',
      planTierGate: null,
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    {
      key: 'navigation_overhead_pct',
      label: 'Navigation Overhead',
      description: 'Share of run duration spent on navigation steps.',
      dataType: 'percentage',
      sortable: true,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'behavior',
      planTierGate: 'starter',
      availability: 'pending-path-c-r1',
      accessor: null,
    },
    // ── Layer 6: Bottleneck and constraint (1 Tier A metric) ────────────────
    {
      key: 'max_wait_step_id',
      label: 'Slowest Step',
      description: 'Identifier of the step with the longest observed wait time.',
      dataType: 'string',
      sortable: false,
      filterable: true,
      defaultVisible: false,
      defaultGroup: 'bottleneck',
      planTierGate: 'team',
      availability: 'pending-path-c-r3',
      accessor: null,
    },
  ]);
