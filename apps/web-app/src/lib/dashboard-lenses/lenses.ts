/**
 * Dashboard Lenses — persona-driven reporting LENS configs (v1).
 *
 * Per `docs/features/dashboard-personas/DASHBOARD_PERSONAS_REVIEW_001.md` the
 * dashboard adopts a **lens switcher** over the single workflow-library spine:
 * the same recordings are re-framed on orthogonal group-by axes. A lens is a
 * named config controlling (a) the default column pack (visible columns + order),
 * (b) the default sort, and (c) an optional above-list panel.
 *
 * v1 wires exactly two lenses:
 *  - `library` — the default; EXACTLY today's behavior (zero regression).
 *  - `lss` — "Measure & Analyze" (Lean Six Sigma) — a column pack drawn from
 *    columns that are ALREADY `availability: 'available'` in the registry, a
 *    default sort by cycle time descending, and a Pareto above-list panel.
 *
 * HONESTY (LSS_EXPERT_REVIEW §0 + DASHBOARD_PERSONAS_REVIEW honesty boundaries):
 * the LSS lens surfaces only observed time + runs + (variant count, where data
 * exists) + bottleneck/opportunity. It does NOT fabricate value-add %, DPMO,
 * sigma, Cp/Cpk, CV, or any statistic the engine does not surface at the
 * workflow grain today. Deferred to v2: CV / stdDev / sequence-stability columns
 * (require new registry ColumnKeys + a backend addition) and DB persistence.
 *
 * Scope discipline (CEO mandate — NOTHING BREAKS):
 *  - This module adds NO ColumnKeys and flips NO `pending-*` columns. The LSS
 *    column pack is validated at module load against the registry's `available`
 *    set; any non-available key is dropped (defensive — keeps the pack honest
 *    even if the registry's availability changes underneath).
 *  - Pure module: no React, no I/O, no clocks, no randomness. Deterministic.
 *
 * Extensibility: the `Lens` union and `LENS_CONFIGS` map are built so future
 * lenses (`understand` / `document`, per the review) can be added without
 * touching the switcher or the shell wiring — only the config map grows.
 *
 * @see docs/features/dashboard-personas/DASHBOARD_PERSONAS_REVIEW_001.md
 * @see docs/features/dashboard-personas/LSS_EXPERT_REVIEW.md §2, §5 (move 3 — Pareto)
 * @see docs/features/dashboard-personas/PM_PERSONA_DASHBOARD.md I-01 / I-04
 * @see docs/features/dashboard-personas/UX_PERSONA_DASHBOARD.md A8 (lens config shape)
 */

import {
  WORKFLOW_DASHBOARD_COLUMNS,
  type ColumnKey,
} from '@/lib/dashboard-columns/index.js';

// ── Lens identity (closed union — extensible) ─────────────────────────────────

/**
 * The set of dashboard lenses. v1 wires `library` + `lss`; the additional
 * archetypes from the review (`understand` / `document`) are intentionally NOT
 * present yet — adding them is a config-map extension, not a switcher rewrite.
 */
export type Lens = 'library' | 'lss';

/** Stable default — rendered on the server and the first client paint. */
export const DEFAULT_LENS: Lens = 'library';

// ── Lens sort + panel shapes ──────────────────────────────────────────────────

/**
 * Sort field/direction a lens applies on activation. Mirrors the `SortField`
 * literal union and `SortState` shape from `WorkflowList.tsx` WITHOUT importing
 * the React component (this module stays pure). The two unions must stay in
 * sync; `lenses.test.ts` asserts each lens default sort field is a registry-
 * backed sortable concept.
 */
export type LensSortField =
  | 'health_score'
  | 'name'
  | 'opportunity'
  | 'run_count'
  | 'cycle_time'
  | 'last_run'
  | 'date_recorded'
  | 'case_volume';

export interface LensSort {
  readonly field: LensSortField;
  readonly dir: 'asc' | 'desc';
}

/**
 * Which above-list panel a lens renders between the band and the toolbar.
 * `null` = no panel (the library lens keeps today's layout exactly). `'pareto'`
 * = the LSS Pareto + variation strip (v1's only panel). Future panels
 * (`'coverage'` / `'systems-matrix'`) land with their lenses.
 */
export type LensPanel = 'pareto' | null;

// ── Lens config (primary export shape) ────────────────────────────────────────

export interface LensConfig {
  /** Stable lens identifier. */
  readonly id: Lens;
  /** Short tab label shown in the switcher. */
  readonly label: string;
  /** Accessible / tooltip description of what the lens is for. */
  readonly description: string;
  /**
   * Ordered default column pack. For `library` this is `null` — a sentinel
   * meaning "use the shell's existing DEFAULT_VISIBLE_KEYS verbatim" so the
   * default lens is byte-identical to today. For `lss` it is an explicit
   * available-only pack.
   */
  readonly columnPack: readonly ColumnKey[] | null;
  /**
   * Default sort applied when the lens is activated. `null` for `library`
   * (preserve the shell's existing default sort — date_recorded desc).
   */
  readonly defaultSort: LensSort | null;
  /** Above-list panel for this lens. */
  readonly panel: LensPanel;
}

// ── Available-column gate (honesty + scope discipline) ────────────────────────

/**
 * The set of `ColumnKey`s that are `availability: 'available'` in the registry
 * TODAY. Computed once at module load from the frozen registry — never mutates.
 * The LSS pack is filtered through this so it can only ever contain columns that
 * actually render a real value (not a "—" placeholder).
 */
const AVAILABLE_COLUMN_KEYS: ReadonlySet<ColumnKey> = new Set(
  WORKFLOW_DASHBOARD_COLUMNS.filter((c) => c.availability === 'available').map(
    (c) => c.key,
  ),
);

/**
 * Return true IFF the column key is registry-`available` today. Exported for the
 * lens-config test (asserts the LSS pack uses only available columns).
 */
export function isColumnAvailable(key: ColumnKey): boolean {
  return AVAILABLE_COLUMN_KEYS.has(key);
}

/**
 * Filter a proposed column pack down to registry-`available` keys, preserving
 * order and de-duplicating. Pure + deterministic.
 *
 * This is the scope-discipline guard: it guarantees a lens can NEVER request a
 * `pending-path-c-r1/r3` column (which would render "—"), without this module
 * having to hard-code the available set — it reads it from the registry, so the
 * gate stays correct if the registry's availability flips in a future iteration.
 */
export function resolveAvailableColumns(
  pack: readonly ColumnKey[],
): readonly ColumnKey[] {
  const seen = new Set<ColumnKey>();
  const out: ColumnKey[] = [];
  for (const key of pack) {
    if (!AVAILABLE_COLUMN_KEYS.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

// ── LSS column pack (PM I-01 / UX Lens 2, available-only for v1) ──────────────

/**
 * The "Measure & Analyze" column pack, in display order. Every entry is a
 * registry-`available` column today:
 *
 *   workflow_title       — locked row name (always rendered)
 *   run_count            — N (evidence weight; LSS reads N before any stat)
 *   cycle_time_mean_ms   — mean cycle time (the primary Measure metric)
 *   last_run_at          — last activity (ProcessDefinition.updatedAt proxy)
 *   date_recorded        — baseline anchor (when the process was first recorded)
 *   opportunity_tag      — automate / standardize / optimize verdict (bottleneck
 *                          proxy — the honest "where to focus" signal)
 *   health_score         — locked composite verdict (always rendered)
 *
 * NOT included (honesty / scope): `variant_count` is `pending-path-c-r1` in the
 * registry (no accessor) so it is intentionally OMITTED from the column pack
 * this pass — surfacing it as a registry column requires wiring the accessor
 * (registry churn, deferred to v2). The Pareto panel's variation strip reads the
 * `metricsV2.variantCount` data field directly (gated at runCount ≥ 2), which is
 * honest and touches no registry column.
 */
const LSS_RAW_COLUMN_PACK: readonly ColumnKey[] = [
  'workflow_title',
  'run_count',
  'cycle_time_mean_ms',
  'last_run_at',
  'date_recorded',
  'opportunity_tag',
  'health_score',
];

/** The LSS pack after the available-only gate (scope-safe, deterministic). */
export const LSS_COLUMN_PACK: readonly ColumnKey[] =
  resolveAvailableColumns(LSS_RAW_COLUMN_PACK);

// ── Lens config catalog (frozen module-singleton) ────────────────────────────

/**
 * The lens catalog. Frozen so it behaves as a deterministic module-singleton
 * (matching the column-registry pattern). v1 contains exactly `library` + `lss`.
 */
export const LENS_CONFIGS: Readonly<Record<Lens, LensConfig>> = Object.freeze({
  library: Object.freeze({
    id: 'library',
    label: 'Library',
    description: 'The default workflow library — your portfolio list and health band.',
    // null sentinels → the shell uses its existing defaults verbatim (no regression).
    columnPack: null,
    defaultSort: null,
    panel: null,
  }),
  lss: Object.freeze({
    id: 'lss',
    label: 'Measure & Analyze',
    description:
      'Lean Six Sigma view: cycle time, run volume, and a Pareto of where your time goes.',
    columnPack: LSS_COLUMN_PACK,
    // Default sort: longest total cycle time first — the Measure-phase entry
    // point (highest-leverage processes at the top). cycle_time desc per PM I-01.
    defaultSort: Object.freeze({ field: 'cycle_time', dir: 'desc' }),
    panel: 'pareto',
  }),
});

/** Ordered list of lenses for the switcher tablist (library first / default). */
export const LENS_ORDER: readonly Lens[] = Object.freeze(['library', 'lss']);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Validate an arbitrary stored string as a `Lens`. Returns `null` for any value
 * that is not a wired lens (defensive against a corrupted / forward-incompatible
 * localStorage entry, mirroring `parseDensity`).
 */
export function parseLens(raw: string | null | undefined): Lens | null {
  if (raw === 'library' || raw === 'lss') return raw;
  return null;
}

/** Look up a lens config by id. Returns the `library` config for any unknown id. */
export function getLensConfig(lens: Lens): LensConfig {
  return LENS_CONFIGS[lens] ?? LENS_CONFIGS.library;
}
