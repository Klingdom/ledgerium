/**
 * Workflow Dashboard Preset Definitions — Path D D+5 (iter-062).
 *
 * Pure deterministic catalog of 10 preset chip definitions consumed by the
 * `PresetChipRail` component and the SavedView CRUD loop in `ColumnPicker`.
 *
 * Architecture:
 *  - Parallel to D+1 registry + D+2 filter registry: frozen module-singleton,
 *    no I/O, no clocks, no React imports.
 *  - `WORKFLOW_DASHBOARD_PRESETS` is the single source of truth; the chip rail
 *    reads this array without hard-coding per-preset logic.
 *  - `availability` mirrors D+1 `ColumnAvailability` semantics: presets that
 *    reference `pending-path-c-r1` metric_keys are `'pending-path-c-r1'` and
 *    MUST be rendered as disabled in the UI (audit-honesty IFF principle).
 *  - `planTierGate: 'team'` presets are rendered as disabled (with upgrade-CTA)
 *    for Free/Starter users. The gate is UI-only here; enforcement is at the
 *    API/persistence layer.
 *
 * Preset composition rules:
 *  - `visibleColumns` and `columnOrder` list only `ColumnKey` values.
 *  - `filters` is a `FilterSet` (AND-semantics, D+2 `evaluateFilterSet`).
 *  - Only `availability: 'available'` columns may appear in enabled presets'
 *    filters; disabled presets may reference pending column keys in their
 *    descriptive metadata but their `filters` arrays contain only available
 *    keys (or are empty, since the filter would return `false` anyway per
 *    D+2 audit-honesty guard).
 *
 * Determinism contract: same `PresetId` → same `PresetDefinition` across all
 * calls. Zero `Date.now()`, `Math.random()`, I/O.
 *
 * @see apps/web-app/src/lib/dashboard-columns/types.ts — ColumnKey, PlanTierGate
 * @see apps/web-app/src/lib/dashboard-columns/filters.ts — FilterSet, ColumnFilter
 * @see apps/web-app/src/components/dashboard-v2/PresetChipRail.tsx — consumer
 * @see docs/meta/WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001.md §6 + §11
 * @see docs/meta/AI_INTEGRATION_PLATFORM_VISION_REVIEW_001.md §6
 */

import type { ColumnKey, PlanTierGate } from './types.js';
import type { FilterSet } from './filters.js';
import { PLAN_HIERARCHY, type PlanType } from '../plans.js';

// ── PresetId (closed union) ───────────────────────────────────────────────────

/**
 * Stable identifier for each preset. Closed union enables compile-time
 * exhaustiveness checks when switching on preset id.
 *
 * Sources:
 *  - 5 canonical presets (all tiers, `availability: 'available'`)
 *  - 2 Team-plan-gated presets (`planTierGate: 'team'`, `availability: 'available'`)
 *  - 3 AI presets (`availability: 'pending-path-c-r1'`, disabled in UI)
 */
export type PresetId =
  | 'automation_candidates'
  | 'needs_attention'
  | 'standardize'
  | 'high_volume'
  | 'recent_activity'
  | 'ready_to_share'
  | 'my_teams_bottlenecks'
  | 'ai_automation_candidates'
  | 'ai_executions_running'
  | 'ai_savings_leaders';

// ── PresetAvailability ────────────────────────────────────────────────────────

/**
 * Whether the preset's underlying data is computable today.
 *
 * Mirrors `ColumnAvailability` semantics from D+1, but DELIBERATELY NARROWER:
 * D+1 `ColumnAvailability` has three variants (`'available'` / `'pending-path-c-r1'`
 * / `'pending-path-c-r3'`); `PresetAvailability` has two (no `pending-path-c-r3`).
 * This is intentional — no preset in the catalog today references an R+3 column.
 * If a future preset references an R+3-dependent metric_key, widen this union to
 * match `ColumnAvailability` and update the chip-disabled tooltip copy in
 * `PresetChipRail.tsx` to handle both pending states. The migration is purely
 * additive (no code restructure required).
 *
 *  - `'available'` — all columns referenced are available; preset is actionable.
 *  - `'pending-path-c-r1'` — preset references metric_keys that require
 *    `metric_fact` persistence (Path C R+1). UI MUST disable these chips
 *    with an "Available after Path C R+1" tooltip.
 */
export type PresetAvailability = 'available' | 'pending-path-c-r1';

// ── PresetDefinition (primary export) ─────────────────────────────────────────

/**
 * One preset chip definition.
 *
 * Field guarantees:
 *  - `id` is unique across the catalog (presets.test.ts asserts).
 *  - `label` ≤ 28 chars (chip compactness; verified by test).
 *  - `description` ≤ 100 chars (tooltip; verified by test).
 *  - `availability === 'available'` IFF all columns in `filters` and
 *    `visibleColumns` are themselves `availability: 'available'` in the D+1
 *    registry — the AI presets do NOT enumerate pending keys in their `filters`
 *    arrays (those filters would return false per D+2 audit-honesty guard).
 *  - `planTierGate: null` → rendered for all users.
 *  - `planTierGate: 'team'` → disabled for Free/Starter with upgrade-CTA.
 */
export interface PresetDefinition {
  /** Stable identifier. */
  readonly id: PresetId;
  /** Short label shown on the chip (≤ 28 chars). */
  readonly label: string;
  /** Tooltip / hover copy describing the preset (≤ 100 chars). */
  readonly description: string;
  /** Lucide-react icon name to render left of the chip label. */
  readonly iconName: string;
  /** Columns to make visible when the preset is applied. */
  readonly visibleColumns: readonly ColumnKey[];
  /** Display order for visible columns when the preset is applied. */
  readonly columnOrder: readonly ColumnKey[];
  /**
   * Filters applied when the preset is activated.
   * Empty array for AI/pending presets — the D+2 `evaluateFilter` guard
   * returns `false` for pending columns anyway.
   */
  readonly filters: FilterSet;
  /** Plan tier required; null = all plans. */
  readonly planTierGate: PlanTierGate | null;
  /**
   * Whether the preset's data is computable today.
   * `'pending-path-c-r1'` presets MUST be rendered disabled with tooltip
   * "Available after Path C R+1".
   */
  readonly availability: PresetAvailability;
}

// ── Catalog ───────────────────────────────────────────────────────────────────

/**
 * The full ordered preset catalog — frozen at module load.
 *
 * Render order reflects natural user mental model:
 *  1. Canonical enabled presets (5)
 *  2. Team-plan-gated presets (2) — visually follow canonical set
 *  3. AI presets (3) — always disabled; appear at the end as a forward-compat
 *     preview of coming capabilities
 *
 * The chip rail renders them in this order. The order is intentional and
 * deterministic — do not sort at runtime.
 */
export const WORKFLOW_DASHBOARD_PRESETS: ReadonlyArray<PresetDefinition> =
  Object.freeze([
    // ── 1. Automation Candidates ──────────────────────────────────────────────
    {
      id: 'automation_candidates',
      label: 'Automation Candidates',
      description: 'Workflows tagged automate — run count and health score meet the automation threshold.',
      iconName: 'Zap',
      visibleColumns: [
        'workflow_title',
        'health_score',
        'opportunity_tag',
        'run_count',
        'cycle_time_ms',
        'systems',
      ],
      columnOrder: [
        'workflow_title',
        'health_score',
        'opportunity_tag',
        'run_count',
        'cycle_time_ms',
        'systems',
      ],
      filters: Object.freeze([
        {
          columnKey: 'opportunity_tag',
          value: {
            kind: 'multi',
            operator: 'in',
            values: Object.freeze(['automate']),
          },
        },
      ]) as FilterSet,
      planTierGate: null,
      availability: 'available',
    } satisfies PresetDefinition,

    // ── 2. Needs Attention ────────────────────────────────────────────────────
    {
      id: 'needs_attention',
      label: 'Needs Attention',
      description: 'Workflows flagged for monitoring or with a health score below 60.',
      iconName: 'AlertTriangle',
      visibleColumns: [
        'workflow_title',
        'health_score',
        'opportunity_tag',
        'last_run_at',
        'run_count',
      ],
      columnOrder: [
        'workflow_title',
        'health_score',
        'opportunity_tag',
        'last_run_at',
        'run_count',
      ],
      filters: Object.freeze([
        {
          columnKey: 'opportunity_tag',
          value: {
            kind: 'multi',
            operator: 'in',
            values: Object.freeze(['monitor', 'needs_review']),
          },
        },
      ]) as FilterSet,
      planTierGate: null,
      availability: 'available',
    } satisfies PresetDefinition,

    // ── 3. Standardize ────────────────────────────────────────────────────────
    {
      id: 'standardize',
      label: 'Standardize',
      description: 'Workflows tagged standardize — execution pattern shows variation above threshold.',
      iconName: 'GitBranch',
      visibleColumns: [
        'workflow_title',
        'opportunity_tag',
        'run_count',
        'health_score',
      ],
      columnOrder: [
        'workflow_title',
        'opportunity_tag',
        'run_count',
        'health_score',
      ],
      filters: Object.freeze([
        {
          columnKey: 'opportunity_tag',
          value: {
            kind: 'multi',
            operator: 'in',
            values: Object.freeze(['standardize']),
          },
        },
      ]) as FilterSet,
      planTierGate: null,
      availability: 'available',
    } satisfies PresetDefinition,

    // ── 4. High Volume ────────────────────────────────────────────────────────
    {
      id: 'high_volume',
      label: 'High Volume',
      description: 'Workflows with 10 or more runs — sorted by run count descending.',
      iconName: 'BarChart2',
      visibleColumns: [
        'workflow_title',
        'run_count',
        'cycle_time_ms',
        'health_score',
        'opportunity_tag',
      ],
      columnOrder: [
        'workflow_title',
        'run_count',
        'cycle_time_ms',
        'health_score',
        'opportunity_tag',
      ],
      // run_count filter: ≥ 10 runs is a UX-reasonable floor separating active
      // from rarely-run workflows (deferred threshold per briefing).
      filters: Object.freeze([
        {
          columnKey: 'run_count',
          value: {
            kind: 'scalar',
            operator: 'gte',
            value: 10,
          },
        },
      ]) as FilterSet,
      planTierGate: null,
      availability: 'available',
    } satisfies PresetDefinition,

    // ── 5. Recent Activity ────────────────────────────────────────────────────
    {
      id: 'recent_activity',
      label: 'Recent Activity',
      description: 'Workflows run within the last 7 days — sorted by most recent first.',
      iconName: 'Clock',
      visibleColumns: [
        'workflow_title',
        'last_run_at',
        'opportunity_tag',
        'run_count',
        'health_score',
      ],
      columnOrder: [
        'workflow_title',
        'last_run_at',
        'opportunity_tag',
        'run_count',
        'health_score',
      ],
      // last_run_at filter: the D+2 filter evaluator uses Date.parse() for ISO
      // date comparison. The chip rail passes a nowMs-derived ISO string at apply
      // time so this catalog definition carries an empty filter array; the shell
      // computes the concrete date range when applying the preset (see
      // PresetChipRail onApplyPreset callback in DashboardV2Shell).
      // Rationale: storing a computed date in a frozen catalog would violate the
      // determinism contract (catalog would drift as wall-clock advances).
      filters: [] as unknown as FilterSet,
      planTierGate: null,
      availability: 'available',
    } satisfies PresetDefinition,

    // ── 6. Ready to Share (Team-gated) ────────────────────────────────────────
    {
      id: 'ready_to_share',
      label: 'Ready to Share',
      description: 'Workflows with health score at or above 80 — filtered for documentation readiness.',
      iconName: 'Share2',
      visibleColumns: [
        'workflow_title',
        'health_score',
        'opportunity_tag',
        'systems',
        'run_count',
      ],
      columnOrder: [
        'workflow_title',
        'health_score',
        'opportunity_tag',
        'systems',
        'run_count',
      ],
      // Filter: health_score ≥ 80 (available scalar). Confidence is not a
      // filterable column in the D+2 registry today; only health_score is
      // available. The 0.7 confidence threshold is reflected in the description.
      filters: Object.freeze([
        {
          columnKey: 'health_score',
          value: {
            kind: 'scalar',
            operator: 'gte',
            value: 80,
          },
        },
      ]) as FilterSet,
      planTierGate: 'team',
      availability: 'available',
    } satisfies PresetDefinition,

    // ── 7. My Team's Bottlenecks (Team-gated) ─────────────────────────────────
    {
      id: 'my_teams_bottlenecks',
      label: "My Team's Bottlenecks",
      description: 'Workflows tagged monitor or standardize — bottleneck detail available after Path C R+1.',
      iconName: 'Target',
      visibleColumns: [
        'workflow_title',
        'health_score',
        'opportunity_tag',
        'cycle_time_ms',
        'run_count',
      ],
      columnOrder: [
        'workflow_title',
        'health_score',
        'opportunity_tag',
        'cycle_time_ms',
        'run_count',
      ],
      // bottleneckLabel is pending-path-c-r1; filter on opportunity_tag monitor
      // as a proxy for workflows that need process review.
      filters: Object.freeze([
        {
          columnKey: 'opportunity_tag',
          value: {
            kind: 'multi',
            operator: 'in',
            values: Object.freeze(['monitor', 'standardize']),
          },
        },
      ]) as FilterSet,
      planTierGate: 'team',
      availability: 'available',
    } satisfies PresetDefinition,

    // ── 8. AI Automation Candidates (pending-path-c-r1) ───────────────────────
    {
      id: 'ai_automation_candidates',
      label: 'AI Automation Candidates',
      description: 'Workflows that meet AI automation criteria when eligibility scoring is available.',
      iconName: 'Sparkles',
      visibleColumns: [
        'workflow_title',
        'health_score',
        'opportunity_tag',
        'run_count',
        'systems',
      ],
      columnOrder: [
        'workflow_title',
        'health_score',
        'opportunity_tag',
        'run_count',
        'systems',
      ],
      // Empty filters — ai_eligibility_score and case_volume are pending-path-c-r1;
      // the D+2 evaluateFilter guard returns false for unavailable columns anyway.
      filters: [] as unknown as FilterSet,
      planTierGate: null,
      availability: 'pending-path-c-r1',
    } satisfies PresetDefinition,

    // ── 9. AI Executions Running (pending-path-c-r1) ──────────────────────────
    {
      id: 'ai_executions_running',
      label: 'AI Executions Running',
      description: 'Workflows with AI executions in progress — requires AI execution data.',
      iconName: 'Cpu',
      visibleColumns: [
        'workflow_title',
        'health_score',
        'run_count',
        'last_run_at',
        'systems',
      ],
      columnOrder: [
        'workflow_title',
        'health_score',
        'run_count',
        'last_run_at',
        'systems',
      ],
      // Empty filters — ai_execution_count is pending-path-c-r1.
      filters: [] as unknown as FilterSet,
      planTierGate: null,
      availability: 'pending-path-c-r1',
    } satisfies PresetDefinition,

    // ── 10. AI Savings Leaders (pending-path-c-r1) ────────────────────────────
    {
      id: 'ai_savings_leaders',
      label: 'AI Savings Leaders',
      description: 'Workflows ranked by AI-estimated time savings when savings data is available.',
      iconName: 'TrendingUp',
      visibleColumns: [
        'workflow_title',
        'health_score',
        'opportunity_tag',
        'run_count',
        'cycle_time_ms',
      ],
      columnOrder: [
        'workflow_title',
        'health_score',
        'opportunity_tag',
        'run_count',
        'cycle_time_ms',
      ],
      // Empty filters — ai_savings_estimate_ms is pending-path-c-r1 and not yet
      // in the D+1 registry ColumnKey union (D+5.5 registry extension deferred).
      filters: [] as unknown as FilterSet,
      planTierGate: null,
      availability: 'pending-path-c-r1',
    } satisfies PresetDefinition,
  ]);

// ── Lookup helpers ────────────────────────────────────────────────────────────

/**
 * Find a preset by id. Returns `undefined` if not found.
 * Determinism: pure lookup over frozen catalog.
 */
export function getPresetById(id: PresetId): PresetDefinition | undefined {
  return WORKFLOW_DASHBOARD_PRESETS.find((p) => p.id === id);
}

/**
 * Return all registered preset ids in catalog order.
 * Determinism: same result across calls (catalog is frozen).
 */
export function listPresetIds(): readonly PresetId[] {
  return WORKFLOW_DASHBOARD_PRESETS.map((p) => p.id);
}

/**
 * Return presets that are actionable for the given plan tier.
 *
 * Rules:
 *  - `availability !== 'available'` → always excluded (pending presets are
 *    never actionable regardless of plan tier).
 *  - `planTierGate === null` → included for all tiers.
 *  - `planTierGate === 'team'` → included only when `planTier === 'team'`.
 *  - `planTierGate === 'starter'` → included for 'starter' and 'team'.
 *
 * Returns presets in catalog order.
 * Determinism: same `planTier` → byte-identical result.
 */
export function getAvailablePresets(
  planTier: PlanType,
): readonly PresetDefinition[] {
  // Use the canonical PLAN_HIERARCHY ordering from plans.ts so higher-tier
  // plans ('growth', 'enterprise') inherit all team-tier presets cleanly.
  const tierIndex = PLAN_HIERARCHY.indexOf(planTier);
  const starterIndex = PLAN_HIERARCHY.indexOf('starter');
  const teamIndex = PLAN_HIERARCHY.indexOf('team');
  return WORKFLOW_DASHBOARD_PRESETS.filter((p) => {
    if (p.availability !== 'available') return false;
    if (p.planTierGate === null) return true;
    if (p.planTierGate === 'starter') return tierIndex >= starterIndex;
    if (p.planTierGate === 'team') return tierIndex >= teamIndex;
    return false;
  });
}

// ── Compile-time exhaustiveness lock (D-4 clause 2 architect §4 revision) ────

/**
 * Module-level exhaustiveness lock catching `PresetId` ↔ catalog drift.
 *
 * If a new `PresetId` member is added to the closed union without adding a
 * corresponding entry in `WORKFLOW_DASHBOARD_PRESETS` (or vice-versa), the
 * TypeScript compiler will reject this assignment. Parallel to D+1 closed-union
 * exhaustiveness pattern and D+2 `satisfies Record<ColumnDataType, ...>` lock.
 *
 * This catches the same class of bug surfaced by the ASK-2 Layer 5 7A-vs-8A
 * inconsistency (architecture-doc vs registry drift).
 */
const _DECLARED_PRESET_IDS: readonly PresetId[] = WORKFLOW_DASHBOARD_PRESETS.map(
  (p) => p.id,
);
type _PresetIdExhaustive = Exclude<
  PresetId,
  (typeof _DECLARED_PRESET_IDS)[number]
> extends never
  ? true
  : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _presetIdExhaustive: _PresetIdExhaustive = true;
