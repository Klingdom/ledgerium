# Analytics Instrumentation Plan — Celonis-Style Frequency Map
# Process Variants Tab · Ledgerium AI

Spec owner: analytics agent
Feature surface: `WorkflowVariantsMap.tsx` (new frequency map + coverage slider)
Ground truth: `apps/web-app/src/lib/analytics.ts` (AnalyticsEvent discriminated union)
Status: INSTRUMENTATION SPEC — no product code modified

---

## 0. Baseline

Zero variant-view instrumentation exists today. The view toggle buttons at
`WorkflowVariantsMap.tsx:238-256` (data-testids `variants-view-map` / `variants-view-dna` /
`variants-view-list`) are untracked. The new frequency map and coverage slider surface
has no prior events to anchor baselines against — all targets below are projections
to be validated after the first 90-day collection window.

---

## 1. Event Schema

All events are PII-free. `workflowId` is the opaque server-assigned UUID — never
a user-provided name. No step titles, no node labels, no content strings appear in
any property. Only counts, coverage values, taxonomy roles (`PathRole`), and
category labels (enum members from the existing `CATEGORY_STYLES` taxonomy) are
permitted.

### 1.1 Discriminated-union variants to add to `AnalyticsEvent` in `analytics.ts`

Insert as a new group after the existing SOP instrumentation block:

```typescript
// ── Variants tab — Celonis frequency map (ANALYTICS_PLAN.md, 2026-06-17) ──────
// PII-free: opaque workflowId; numeric/taxonomy props only.
// No step titles, node labels, or content strings in any payload.
| {
    event: 'variant_map_viewed';
    workflowId: string;
    /** Total runs feeding the DFG. */
    totalRuns: number;
    /** Number of distinct variant paths (≥ 2 to reach this view). */
    variantCount: number;
    /** Standard-path frequency, 2 dp (0.00–1.00). */
    standardFrequency: number;
    /** Number of decision points (divergence nodes) in the flow model. */
    decisionPointCount: number;
    /** Which sub-view the user landed on: 'frequency_map' | 'dna' | 'list'. */
    initialView: 'frequency_map' | 'dna' | 'list';
  }
| {
    event: 'variant_view_toggled';
    workflowId: string;
    fromView: 'frequency_map' | 'dna' | 'list';
    toView: 'frequency_map' | 'dna' | 'list';
    /** Milliseconds since variant_map_viewed fired. */
    elapsedMsSinceVariantView: number;
  }
| {
    event: 'variant_coverage_slider_changed';
    workflowId: string;
    /** Coverage threshold at slider release (0–100, integer percent).
     *  Fire on debounced final value only — not on every tick. */
    coveragePct: number;
    /** Variant paths visible at the chosen coverage threshold. */
    visibleVariantCount: number;
    /** Total variant paths before filtering. */
    totalVariantCount: number;
    /** Milliseconds since variant_map_viewed fired. */
    elapsedMsSinceVariantView: number;
  }
| {
    event: 'variant_path_highlighted';
    workflowId: string;
    /** PathRole taxonomy label: 'standard' | 'fastest' | 'longest' | 'exception' | 'variant'. */
    pathRole: 'standard' | 'fastest' | 'longest' | 'exception' | 'variant';
    /** Frequency of the highlighted path, 2 dp. */
    pathFrequency: number;
    /** Run count of the highlighted path. */
    pathRunCount: number;
    /** Milliseconds since variant_map_viewed fired. */
    elapsedMsSinceVariantView: number;
  }
| {
    event: 'variant_node_clicked';
    workflowId: string;
    /** Category from CATEGORY_STYLES taxonomy — no label content.
     *  e.g. 'single_action' | 'navigation' | 'error_handling' | 'decision' */
    nodeCategory: string;
    /** Whether this node is a decision/divergence point. */
    isDecisionPoint: boolean;
    /** Whether the node is on the standard path spine. */
    isOnStandardPath: boolean;
    /** Milliseconds since variant_map_viewed fired. */
    elapsedMsSinceVariantView: number;
  }
| {
    event: 'variant_edge_clicked';
    workflowId: string;
    /** Edge frequency weight, 2 dp (fraction of total runs traversing this edge). */
    edgeFrequency: number;
    /** Whether this edge is on the standard path. */
    isStandardEdge: boolean;
    /** Milliseconds since variant_map_viewed fired. */
    elapsedMsSinceVariantView: number;
  }
| {
    event: 'variant_legend_viewed';
    workflowId: string;
    /** Which legend/help surface was opened: 'map_legend' | 'coverage_help'. */
    surface: 'map_legend' | 'coverage_help';
    /** Milliseconds since variant_map_viewed fired. */
    elapsedMsSinceVariantView: number;
  }
```

### 1.2 Naming rationale

The prefix `variant_` groups all events for this surface under a single namespace,
consistent with `sop_`, `report_`, `dashboard_v2_` conventions in the existing
taxonomy. `_viewed` / `_toggled` / `_changed` / `_highlighted` / `_clicked` match
the action-oriented suffix pattern used throughout `analytics.ts:44-354`.

### 1.3 Debounce rule for `variant_coverage_slider_changed`

Fire only on `pointerup` / `touchend` (slider release), not on every `input` event
during drag. This produces one event per intentional gesture, keeping volume
proportional to real decisions rather than drag steps.

---

## 2. Comprehension Success Metrics

The frequency map exists to make process variation understandable. Three leading
indicators measure whether it succeeds.

### M1 — Coverage Slider Engagement Rate

**Definition:** share of `variant_map_viewed` sessions in which at least one
`variant_coverage_slider_changed` event fires.

**Why it matters:** the coverage slider is the primary sense-making gesture on a
frequency map. A user who moves the slider is testing the "what covers 80% of my
cases?" question — the core comprehension act. Sessions where the slider is never
touched suggest the map rendered but was not used analytically.

**Baseline:** unknown (zero prior events). Establish from first 30 days of data.

**Target:** ≥ 40% of `variant_map_viewed` sessions include at least one slider
interaction, measured over a rolling 30-day window. Rationale: Celonis internal
benchmarks (public documentation) show coverage-slider engagement at ~55% for
process analysts; 40% accounts for Ledgerium's mixed analyst/ops user mix.

**Measurement window:** 30 days rolling. Review at 30 d and 90 d post-launch.

### M2 — Frequency Map Reach Rate within Variant Sessions

**Definition:** share of sessions that fire `workflow_viewed` with `tab: 'variants'`
(existing event at `analytics.ts:46`) AND subsequently fire `variant_map_viewed`
with `initialView: 'frequency_map'`.

**Why it matters:** the map is gated behind landing on the Variants tab and
choosing (or defaulting to) the Map view. Low reach means users are bouncing before
the frequency map renders — a navigation or load-time problem rather than a
comprehension problem.

**Baseline:** unknown. The `workflow_viewed` / `tab_switched` events at `analytics.ts:46`
and `:55` are already firing; reach rate can be computed from day one.

**Target:** ≥ 60% of variant tab sessions reach the frequency map (i.e., fire
`variant_map_viewed`). If below 60% at 30 d, investigate load state distribution
(`status: 'loading' | 'unprocessed' | 'forbidden'`) before attributing to UX.

**Measurement window:** 30 days rolling.

### M3 — Map-to-Downstream-Action Rate

**Definition:** share of sessions containing `variant_map_viewed` that subsequently
fire any of: `tab_switched` (to `sop` or `analysis`), `workflow_exported`, or
`upgrade_clicked` (location containing `variants`) within the same browser session.

**Why it matters:** the frequency map's job is not terminal — it should surface
"this path is a standardization candidate" or "this variant deserves its own SOP."
If users view the map but take no downstream action, the map is informing without
converting.

**Baseline:** unknown.

**Target:** ≥ 15% map-to-downstream-action rate at 90 d. This is deliberately
conservative for a first-generation frequency map. Re-evaluate at 90 d using
`variant_path_highlighted.pathRole = 'exception'` and `variant_coverage_slider_changed`
as cohort filters to distinguish engaged vs passive viewers.

**Measurement window:** 90 days rolling.

---

## 3. What Is Computable Today vs. What Needs New Computation

### Available today on the client without new computation

The `VariantFlowModelInput` interface at `variantFlowModel.ts:70-73` receives
`variants: VariantInput[]` and `totalRuns: number`. Each `VariantInput` at
`variantFlowModel.ts:47-68` carries:

- `runCount: number` — per-path case count
- `frequency: number` — per-path fraction of total runs (0–1)
- `stepCategories: string[]` — ordered category labels (no content)
- `id`, `isStandard`, `evidenceRunIds`

The built `NormalizedViewModel` (what `VariantFlowCanvasWrapper` receives as `model`)
exposes `model.variants.length`, decision-point nodes filterable via
`n.isDecisionPoint`, and edge objects with frequency weights already computed in
`buildVariantFlowModel`.

All properties required for `variant_map_viewed`, `variant_path_highlighted`,
`variant_node_clicked`, and `variant_edge_clicked` are derivable from data already
present in the component at render time. No new server computation or API call is
required to instrument these events.

### Requires new client state for instrumentation only

- `elapsedMsSinceVariantView`: a `useRef<number>` initialized with `Date.now()`
  when `variant_map_viewed` fires (parallel to `dashboardViewPerfTimestampMs` in
  `DashboardV2Shell.tsx:108`, which uses `useState` for reactivity; a `useRef` is
  sufficient here since elapsed time does not drive render).
- `coveragePct` and `visibleVariantCount` for `variant_coverage_slider_changed`:
  computed from slider state and the filtered variant list at slider release —
  both are already local component state once the slider is implemented.
- `initialView`: read from the `view` state at `WorkflowVariantsMap.tsx:187` at
  the moment `variant_map_viewed` fires (i.e., when the component mounts with
  `status === 'loaded'` and `variantData.hasVariantData === true`).

### Does not exist yet and is not needed for instrumentation

The frequency/edge-weight computation for the DFG itself (the new feature) will be
implemented by the frontend engineer. The instrumentation events do not depend on
any new server API — they consume the same `VariantFlowModelInput` data the canvas
already receives.

---

## 4. Privacy Posture

Consistent with the existing `disable_session_recording: true` PostHog posture
established at the analytics architecture level.

**What is explicitly excluded from all payloads:**

- Step titles or labels (e.g. `node.shortLabel`, `matchNode.label`, `path.label`,
  `variantStepTitles` values) — these are real user-recorded process content.
- Workflow names or portfolio names.
- System names (e.g. `matchNode.system`) — these could identify internal tooling.
- Evidence run IDs — these are internal identifiers that could be cross-referenced.
- Any string from `CATEGORY_STYLES[key].label` that is user-visible copy rather
  than a taxonomy key. Use the key (`nodeCategory: 'error_handling'`) not the
  display label (`'Error / Exception'`).

**What is permitted:**

- `workflowId`: opaque server UUID, consistent with its use across the entire
  existing taxonomy (e.g. `sop_viewed`, `report_viewed`, `workflow_viewed`).
- `pathRole`: closed enum (`'standard' | 'fastest' | 'longest' | 'exception' | 'variant'`)
  — this is a computed taxonomy classification, not user content.
- `nodeCategory`: the `CATEGORY_STYLES` key string (e.g. `'single_action'`,
  `'navigation'`, `'error_handling'`) — a taxonomy label computed from the
  segmentation engine, not derived from step content.
- All numeric fields: `runCount`, `frequency`, `coveragePct`, `decisionPointCount`,
  `visibleVariantCount`, `elapsedMs*` — pure counts and measurements.

No `growth-strategist` D-4 clause 1 adjacency is required for this spec: zero
user-visible copy strings are introduced by instrumentation itself (event names
and property keys are internal taxonomy identifiers, not UI copy).
