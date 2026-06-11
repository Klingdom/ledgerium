# Analytics Findings — Variant Story Map Hardening Review

**Artifact type:** Analytics hardening review — read-only on product code
**Date:** 2026-06-11
**Author:** analytics agent
**Scope:** Production-readiness instrumentation gap analysis for the shipped variant story map
(Map / DNA / List views, complexity slider, evidence drill panel)

**Files read:**
- `apps/web-app/src/lib/analytics.ts` — event taxonomy, privacy posture, track() pipeline
- `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx` — List/DNA view host, view toggle, path cards, step sequence
- `apps/web-app/src/components/workflow-view/WorkflowVariantStoryMap.tsx` — Map view, slider, edge click, evidence drill
- `apps/web-app/src/components/workflow-view/VariantDnaStrip.tsx` — DNA view
- `apps/web-app/src/components/workflow-view/WorkflowModeSwitcher.tsx` — four-mode switcher
- `apps/web-app/src/components/workflow-view/WorkflowPageShell.tsx` — shell, mode state, onRequestVariants lazy-load hook
- `apps/web-app/src/app/(app)/workflows/[id]/page.tsx` — handleLoadVariants, track() call sites
- `apps/web-app/src/lib/variantStoryMap.ts` — STORY_MAP_VERSION = 'variant-story/1.0.0'
- `apps/web-app/src/lib/intelligence.ts` — intelligence service, version constants
- `packages/intelligence-engine/src/clustering/clusterSignatures.ts` — CLUSTERING_ALGORITHM = 'single-link/1.0.0'
- `packages/intelligence-engine/src/index.ts` — DIVERGENCE_ALGORITHM = 'lcs-backbone/1.0.0' (via divergenceAnalyzer export)
- `docs/features/process-variation/map-review/ANALYTICS_FINDINGS.md` — previously proposed event spec

---

## 1. GAP CONFIRMATION: Zero Analytics Events Fire on the Variants Feature Today

**This is confirmed by grep evidence, not inferred.**

The grep `track(|analytics` against all files under `apps/web-app/src/components/workflow-view/` returned **zero matches**. Not a single `track()` call exists in any of the following files:

- `WorkflowVariantsMap.tsx` — no track() calls (view toggle, path card selection, compare button, step sequence clicks: all silent)
- `WorkflowVariantStoryMap.tsx` — no track() calls (slider, edge click, evidence drill panel open/close: all silent)
- `VariantDnaStrip.tsx` — no track() calls
- `WorkflowModeSwitcher.tsx` — no track() calls (the mode button onClick fires `onModeChange(mode)` but this propagates to `WorkflowPageShell` which calls `setMode` — no analytics call wired there either)
- `WorkflowPageShell.tsx` — no track() calls anywhere; the mode state is set via `setMode` with no side effect to analytics

**The only relevant call in the parent page** (`apps/web-app/src/app/(app)/workflows/[id]/page.tsx` line 136) is:

```typescript
track({ event: 'tab_switched', tab });
```

This fires on the top-level Workflow / SOP / Report tab change — NOT on the sub-mode switcher inside `WorkflowPageShell`. Switching from Flow to Variants within the Workflow tab does not fire any event.

**Summary of the gap:**

| Interaction | Currently tracked | Gap |
|---|---|---|
| Variants mode opened (Flow → Variants switch) | No | Total blind spot |
| View toggled (Map / DNA / List within variants) | No | Total blind spot |
| Complexity slider moved | No | Total blind spot |
| Branch/edge clicked (opens evidence drill panel) | No | Total blind spot |
| Evidence panel shown (run IDs displayed) | No | Total blind spot |
| Path card selected (List view) | No | Total blind spot |
| Compare vs Standard button clicked | No | Total blind spot |
| Step in StepSequenceView clicked | No | Total blind spot |
| Single-run / no-variant-data state shown | No | Total blind spot |
| Team+ plan gate hit on variants access | No — gate not yet wired in UI | No gate visible to track |

The previously produced `docs/features/process-variation/map-review/ANALYTICS_FINDINGS.md` proposed a full 7-event spec. None of those 7 events have been added to `analytics.ts` or wired into any component. That spec is entirely unimplemented.

---

## 2. Minimal Production Event Spec

These are the events required to ship with the feature. All follow the existing `AnalyticsEvent` discriminated union pattern. All are privacy-safe counters: no workflow content, no step labels, no path labels, no page titles, no URLs, no run IDs in client events.

Three version constants are available in the codebase and must appear on every variants-surface event to enable per-algorithm-version cohort analysis:

- `STORY_MAP_VERSION = 'variant-story/1.0.0'` from `apps/web-app/src/lib/variantStoryMap.ts`
- `CLUSTERING_ALGORITHM = 'single-link/1.0.0'` from `packages/intelligence-engine/src/clustering/clusterSignatures.ts`
- `DIVERGENCE_ALGORITHM = 'lcs-backbone/1.0.0'` from `packages/intelligence-engine/src/divergenceAnalyzer.ts` (re-exported via `packages/intelligence-engine/src/index.ts`)

These must be imported and threaded as props from `WorkflowPageShell` or derived inside the components from the `intelligence` prop where accessible. The version strings are constants — they do not change at runtime and carry no content.

---

### Event 1 — `variants_mode_opened` (P0)

**Trigger:** User clicks the Variants button in `WorkflowModeSwitcher`. The `onModeChange` callback fires with `mode === 'variants'` in `WorkflowPageShell.tsx`.

**Exact call site:** `WorkflowPageShell.tsx` — the `useEffect` at line 108–110 already fires when `mode === 'variants'` to trigger the lazy-load. The analytics call belongs here or in a parallel effect, deduplicated with a ref so it fires once per mode entry (not on re-renders).

**Privacy audit:** `workflow_id` is an opaque DB identifier, not a title. `has_variant_data` is a boolean structural flag from `variantAdapter.hasVariantData`. `variant_count` is an integer. `standard_path_frequency` is a float 0–1. `run_count` is an integer. `view_submode` reflects the initial sub-view state (always `'map'` on first open per `useState<'map' | 'list' | 'dna'>('map')`). No content fields.

```typescript
{
  event: 'variants_mode_opened';
  workflow_id: string;
  /** True if variantAdapter.hasVariantData = true; false = SinglePathView shown */
  has_variant_data: boolean;
  /** Number of distinct variant paths; 0 if has_variant_data = false */
  variant_count: number;
  /** Frequency of standard path (0–1); -1 if no variant data */
  standard_path_frequency: number;
  /** Total run count backing variant data; 0 if no variant data */
  run_count: number;
  /** Initial sub-view rendered; always 'map' per current useState default */
  initial_subview: 'map' | 'dna' | 'list';
  story_map_version: string;      // STORY_MAP_VERSION
  clustering_version: string;     // CLUSTERING_ALGORITHM + configHash
  divergence_version: string;     // DIVERGENCE_ALGORITHM
}
```

---

### Event 2 — `variant_view_toggled` (P0)

**Trigger:** User clicks Map / DNA / List in the three-button toggle inside `WorkflowVariantsMap.tsx` (lines 193–211). `setView` fires with the new value.

**Exact call site:** Each `onClick={() => setView('map'|'dna'|'list')}` button in `WorkflowVariantsMap.tsx`.

**Privacy audit:** `to_view` and `from_view` are string enums from a closed set. `variant_count` and `has_variant_data` are structural counts. No content.

```typescript
{
  event: 'variant_view_toggled';
  workflow_id: string;
  from_view: 'map' | 'dna' | 'list';
  to_view: 'map' | 'dna' | 'list';
  variant_count: number;
  /** Elapsed ms since variants_mode_opened in this session */
  elapsed_ms_since_mode_open: number;
  story_map_version: string;
  divergence_version: string;
}
```

---

### Event 3 — `variant_complexity_slider_changed` (P0)

**Trigger:** User moves the `<input type="range">` slider in `WorkflowVariantStoryMap.tsx` (lines 160–168). The `onChange` handler calls `setMaxBranches(Number(e.target.value))`.

**Exact call site:** The `onChange` on the range input in `StoryMapInner` in `WorkflowVariantStoryMap.tsx`. Fire on `onChange` (not `onInput`) to capture committed values, or debounce to avoid a flood of events on drag.

**Privacy audit:** `max_branches_selected` and `total_branches_available` are integer counts. They reflect structural complexity, not process content. `direction` describes whether the user narrowed or expanded the view.

```typescript
{
  event: 'variant_complexity_slider_changed';
  workflow_id: string;
  /** Value after the change — how many branches the user chose to show */
  max_branches_selected: number;
  /** map.branchCount — total branches available */
  total_branches_available: number;
  /** 'narrowed' if value decreased; 'expanded' if value increased */
  direction: 'narrowed' | 'expanded';
  story_map_version: string;
  divergence_version: string;
}
```

---

### Event 4 — `variant_branch_edge_clicked` (P0)

**Trigger:** User clicks an edge in the ReactFlow canvas in `WorkflowVariantStoryMap.tsx`. The `onEdgeClick` handler at line 183 calls `setSelectedEdgeId(edge.id)`. This opens the evidence drill panel when `selectedEdge.evidenceRunIds.length > 0`.

**Exact call site:** The `onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}` prop on `<ReactFlow>` in `StoryMapInner`.

**Privacy audit:** `edge_kind` is one of `'spine' | 'branch' | 'rejoin' | 'shortcut'` from `StoryEdge.kind` — structural topology, not content. `run_count` and `run_share_pct` are counts and percentages. `has_evidence` is a boolean reflecting whether `evidenceRunIds.length > 0`. No run IDs, no content.

```typescript
{
  event: 'variant_branch_edge_clicked';
  workflow_id: string;
  /** StoryEdge.kind from variantStoryMap.ts */
  edge_kind: 'spine' | 'branch' | 'rejoin' | 'shortcut';
  /** StoryEdge.runCount — runs that took this edge */
  run_count: number;
  /** StoryEdge.runShare * 100, rounded — share of total runs */
  run_share_pct: number;
  /** True if selectedEdge.evidenceRunIds.length > 0 (evidence panel will show) */
  has_evidence: boolean;
  /** Total branches in this map at time of click */
  total_branches: number;
  story_map_version: string;
  divergence_version: string;
}
```

---

### Event 5 — `variant_evidence_panel_shown` (P0)

**Trigger:** The evidence drill panel renders, i.e., `selectedEdge !== null && selectedEdge.evidenceRunIds.length > 0` evaluates to true in `WorkflowVariantStoryMap.tsx` (lines 191–209).

**Exact call site:** This can fire from the same `onEdgeClick` handler when `has_evidence === true`, or from a `useEffect` keyed on `selectedEdgeId`. The simplest approach is to fire it inline when `setSelectedEdgeId` produces a non-null edge with evidence in the `onEdgeClick` handler — check `map.edges.find(e => e.id === edge.id)?.evidenceRunIds.length > 0`.

**Privacy audit:** `evidence_run_count` is a count of how many run IDs are shown. The run IDs themselves are NOT included. `branch_kind` is structural topology. No content.

```typescript
{
  event: 'variant_evidence_panel_shown';
  workflow_id: string;
  /** StoryEdge.kind for the clicked edge */
  branch_kind: 'branch' | 'rejoin' | 'shortcut';
  /** Number of run IDs shown in the panel (evidenceRunIds.length) — NOT the IDs themselves */
  evidence_run_count: number;
  story_map_version: string;
  divergence_version: string;
}
```

---

### Event 6 — `variant_single_run_state_shown` (P0)

**Trigger:** `WorkflowVariantsMap` renders `<SinglePathView>` because `variantData.hasVariantData === false` (line 183–185 in `WorkflowVariantsMap.tsx`).

**Exact call site:** Inside the `if (!variantData.hasVariantData)` branch in `WorkflowVariantsMap`, fire once on mount via a `useEffect` with an empty dependency array.

**Decision it informs:** What fraction of variants mode opens are dead-ends (no multi-run data yet)? If this is > 60% of opens, the mode is being discovered before it can deliver value. The nudge copy and possibly the mode's discoverability need adjustment.

**Privacy audit:** `run_count` is the count of runs. No content.

```typescript
{
  event: 'variant_single_run_state_shown';
  workflow_id: string;
  /** How many runs this workflow has (even if < 2, so this is ≥ 1) */
  run_count: number;
  story_map_version: string;
}
```

---

### Team+ Gate Event — `plan_limit_hit` (P0, when gate is wired)

The `plan_limit_hit` event already exists in the taxonomy:

```typescript
| { event: 'plan_limit_hit'; limit: string; currentUsage: number }
```

When the variants feature is gated behind Team+ plan tier (no gate is currently wired in the UI or API — `WorkflowVariantsMap` and `WorkflowPageShell` have no plan-check), the firing call should use:

```typescript
track({ event: 'plan_limit_hit', limit: 'variants_mode', currentUsage: runCount });
```

This fires at the point where a non-Team user attempts to switch to the Variants mode and sees an upgrade prompt. No new event type is needed.

---

### Privacy Confirmation

The following properties were explicitly considered and excluded:

| Excluded property | Reason |
|---|---|
| Step labels / shortLabel | `ViewNode.shortLabel` is process content. Never in any event. |
| Path label strings | `ClassifiedPath.label` (e.g. "Variant 2") may be user-renamed. Not captured. |
| `evidenceRunIds` array | Individual run IDs in a client event risk correlation. Count only. |
| Step category sequences | A full sequence of `stepCategories` is a structural fingerprint. Only counts captured. |
| `decisionLabel` / `n.label` | Decision node labels are content. Never in any event. |
| Workflow title | Never in any event. |
| `routeTemplate` / `pageTitle` | Available on ViewNode — explicitly excluded. |
| `altSteps` string content | Off-backbone step category arrays are fingerprints. Count only. |

The existing `disable_session_recording: true` PostHog posture is unchanged. All new events flow through the existing `track()` / `sendBeacon` pipeline.

---

## 3. Quality Proxies to Monitor in Production

No runtime ground truth exists for whether the variant visualization is "correct." These proxies are observable without oracle knowledge.

### 3.1 Determinism Stability

**What to watch:** Whether `buildVariantStoryMap()` and the underlying `analyzeDivergence()` produce identical output on two calls with the same inputs.

**Proxy measurement:** After every call to `/api/workflows/[id]/variants`, the server can re-invoke the same computation on the same input and compare output hashes. Any mismatch is a P0 correctness failure.

**Operational signal:** A `client_error` with `component: 'WorkflowVariantsMap'` appearing in PostHog indicates a render failure likely caused by non-deterministic data. Zero tolerance — any occurrence triggers immediate investigation.

**Version cohort signal:** Segment `variants_mode_opened` by `story_map_version` and `divergence_version`. Any drop in subsequent engagement (view_toggled, branch_edge_clicked) correlated with a version change is evidence of a regression introduced by the algorithm change.

### 3.2 Branch and Variant Count Distribution

**What to watch:** The distribution of `variant_count` in `variants_mode_opened` events and `total_branches_available` in `variant_complexity_slider_changed` events.

**Interpretation:**
- `variant_count = 0` or `has_variant_data = false`: User opened variants mode on a single-run workflow. Unhealthy if > 60% of opens.
- `variant_count = 2–5`: Normal range for most process workflows.
- `variant_count > 10`: May indicate clustering is producing overly granular clusters (threshold too tight). Cross-reference with user correction rate.
- `total_branches_available > 8`: Evaluate whether the slider default of "show all" produces a readable Map view. High `direction: 'narrowed'` rate at high branch counts signals the default is too complex.

### 3.3 Evidence Drill Usage

**What to watch:** Rate of `variant_evidence_panel_shown` relative to `variant_branch_edge_clicked where has_evidence = true`.

**Interpretation:** If `variant_branch_edge_clicked` fires but `variant_evidence_panel_shown` does not (has_evidence = false on most clicks), either the data pipeline is not populating `evidenceRunIds` on branches, or the most-clicked branches are the spine (which has no separate evidence panel). The spine should rarely be clicked for evidence — if spine edges are being clicked, the visual distinction between spine and branch edges is insufficient.

**Target:** Among `variant_branch_edge_clicked` events where `has_evidence = true`, `variant_evidence_panel_shown` should fire within the same session at a rate ≥ 95% (it fires from the same click handler — any divergence indicates a rendering bug).

### 3.4 Gate-Hit Rate

**What to watch:** `plan_limit_hit where limit = 'variants_mode'` rate relative to `variants_mode_opened`.

**Interpretation:** Once the plan gate is wired, the ratio of gate-hit to successful open quantifies the plan-tier friction on the feature. A gate-hit rate above 30% indicates the feature is being actively sought by users who cannot access it — a conversion and pricing signal.

**Current state:** Gate not wired. No gate-hit events will fire until the plan check is implemented. This is a gap but it is also an architectural decision not yet made — variants mode is currently accessible to all users.

### 3.5 Time-to-First-Variant-Interaction (TTFVI)

**What to watch:** `elapsed_ms_since_mode_open` from `variant_view_toggled` and `variant_branch_edge_clicked` events. The first such event in a session after `variants_mode_opened` is the TTFVI.

**Interpretation:**
- p50 ≤ 30,000 ms: The initial Map view communicates variation quickly.
- p50 30,000–60,000 ms: The default state is not immediately legible.
- p50 > 60,000 ms: The variant map is not drawing engagement; the default state (standard path selected, full spine shown) is not communicating that there is something to investigate.

**Action if unhealthy:** The most likely intervention is pre-selecting the highest-deviation non-standard path as the default in `WorkflowVariantsMap.tsx` (currently defaults to the standard path: `useState<string | null>(paths.find(p => p.isStandard)?.id ?? paths[0]?.id ?? null)`).

---

## 4. Acceptance / Health Gates for Production Readiness

Gates are ordered by severity. H = hard gate (blocks GA). S = soft gate (requires written justification in release readiness artifact if not met).

### Gate A1 — All P0 Events Fire in Staging (H)

**Condition:** Manual staging walkthrough confirms all six P0 events fire in the PostHog event stream: `variants_mode_opened`, `variant_view_toggled`, `variant_complexity_slider_changed`, `variant_branch_edge_clicked`, `variant_evidence_panel_shown`, `variant_single_run_state_shown`.

**Measurement:** PostHog live event stream in the staging environment during a manual smoke test covering: open variants mode on a workflow with ≥ 2 runs → toggle to List → toggle to DNA → toggle back to Map → move slider (if ≥ 2 branches) → click a branch edge → observe evidence panel.

**Pass condition:** All 6 events appear in PostHog with correct fields and no `undefined` property values.

### Gate A2 — No Content Leakage in Any Event (H)

**Condition:** Static code review of all `track({...})` call sites for the new events confirms no string property is derived from: `ViewNode.label`, `ViewNode.shortLabel`, `ViewNode.system`, `ViewNode.pageTitle`, `ViewNode.routeTemplate`, `ClassifiedPath.label`, `StoryEdge` content fields, or `evidenceRunIds` array contents.

**Measurement:** Reviewer greps for `label`, `shortLabel`, `title`, `pageTitle`, `routeTemplate`, `system`, `evidenceRunIds` in the new track() call bodies. Zero matches required.

### Gate A3 — `variants_mode_opened` Has_variant_data Split Visible (H)

**Condition:** Within 7 days of first beta user access, at least one `variants_mode_opened` event with `has_variant_data: true` fires in PostHog. This confirms the data pipeline from `handleLoadVariants` → `/api/workflows/[id]/variants` → `setVariantIntelligence` → `WorkflowVariantsMap` intelligence prop → `buildVariantData` is functioning end-to-end.

**Rationale:** If every `variants_mode_opened` event has `has_variant_data: false` within the first week, the variant computation pipeline is broken or no users have ≥ 2 runs. Either case requires investigation before GA.

### Gate A4 — Evidence Drill Fires at Least Once (H)

**Condition:** `variant_evidence_panel_shown` fires at least once within 14 days of beta launch on a workflow with ≥ 2 branches. This is the minimum viability check for the evidence drill — the feature's core moat differentiator.

**Rationale:** If no user clicks into evidence in 14 days, either: (a) no users have multi-branch workflows yet, (b) branch edges are not visually distinct enough to invite clicks, or (c) the data pipeline is not populating `evidenceRunIds`. All three cases require action before GA.

### Gate A5 — Single-Run State Rate Measured (S)

**Condition:** `variant_single_run_state_shown` / `variants_mode_opened` ratio is measured and reported. There is no pass/fail threshold for beta, but the ratio must be known. If > 70%, the mode is being opened predominantly by users without multi-run data and the empty-state copy must be strengthened.

### Gate A6 — TTFVI Baseline Established (S)

**Condition:** At least 20 `variants_mode_opened where has_variant_data = true` events have been collected, producing an initial TTFVI distribution. No numeric target required for beta — baseline is the deliverable. Target for GA: p50 ≤ 30s.

### Gate A7 — Version Fields Present on All Events (H)

**Condition:** 100% of `variants_mode_opened` events carry non-null `story_map_version`, `clustering_version`, and `divergence_version` fields. Any event with `undefined` or `null` for these fields indicates the version constants are not being threaded through the component hierarchy correctly.

**Measurement:** PostHog query: `variants_mode_opened where story_map_version is not set` count = 0.

---

## 5. Instrumentation Punch-List (P0 → P2)

Ordered by decision-relevance. All items are additive changes to existing files.

---

### P0 Items — Required Before Any User Sees the Feature

**P0-1: Add 6 new event types to `analytics.ts` discriminated union**

File: `apps/web-app/src/lib/analytics.ts`

Add to the `AnalyticsEvent` union: `variants_mode_opened`, `variant_view_toggled`, `variant_complexity_slider_changed`, `variant_branch_edge_clicked`, `variant_evidence_panel_shown`, `variant_single_run_state_shown` with the exact shapes specified in Section 2 above.

This must happen first. TypeScript strict mode will reject `track({event: 'variants_mode_opened', ...})` calls until the type is registered. All other P0 items depend on this.

---

**P0-2: Wire `variants_mode_opened` in `WorkflowPageShell.tsx`**

File: `apps/web-app/src/components/workflow-view/WorkflowPageShell.tsx`

The existing `useEffect` at lines 108–110 already fires when `mode === 'variants'`:

```typescript
useEffect(() => {
  if (mode === 'variants' && !variantIntelligence) onRequestVariants?.();
}, [mode, variantIntelligence, onRequestVariants]);
```

A parallel `useEffect` (or an extension of this one with a `hasTrackedVariantsOpen` ref guard) should fire the analytics call. The ref guard prevents re-firing on re-renders.

The `has_variant_data`, `variant_count`, `standard_path_frequency`, and `run_count` properties require the `variantIntelligence` prop to be resolved. Two options:

- **Option A (simpler):** Fire the event when `mode === 'variants'` is first set, with `has_variant_data: variantIntelligence !== null`, and accept that the variant counts may be 0 on first open before the lazy-load completes. This gives immediate entry signal.
- **Option B (richer):** Fire the event inside `WorkflowVariantsMap.tsx` on its first mount, where `variantData` from `buildVariantData()` is already available. This requires threading `workflowRecord.id` as a prop into `WorkflowVariantsMap`.

Option B is recommended because it fires with accurate `has_variant_data` and `variant_count` values. The `workflow_id` is already passed as `workflowRecord.id` and can be threaded via Props.

---

**P0-3: Wire `variant_view_toggled` in `WorkflowVariantsMap.tsx`**

File: `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx`

The three toggle buttons at lines 193–211 each call `setView(...)`. Wrap the `setView` call to also fire analytics:

```typescript
// example for Map button
onClick={() => {
  if (view !== 'map') track({ event: 'variant_view_toggled', from_view: view, to_view: 'map', ... });
  setView('map');
}}
```

The `workflow_id` must be threaded as a new prop on `WorkflowVariantsMap`. A session-start timestamp ref (`modeOpenedAtRef`) is needed to compute `elapsed_ms_since_mode_open`.

---

**P0-4: Wire `variant_complexity_slider_changed` in `WorkflowVariantStoryMap.tsx`**

File: `apps/web-app/src/components/workflow-view/WorkflowVariantStoryMap.tsx`

The slider at line 160–168 has an existing `onChange` handler. Add an analytics call with debounce to avoid a flood on drag:

```typescript
onChange={(e) => {
  const newVal = Number(e.target.value);
  setMaxBranches(newVal);
  debouncedTrackSlider({ to: newVal, from: maxBranches, total: map.branchCount });
}}
```

Use a 500ms debounce. The `workflow_id` must be threaded through `Props` to `StoryMapInner`.

---

**P0-5: Wire `variant_branch_edge_clicked` and `variant_evidence_panel_shown` in `WorkflowVariantStoryMap.tsx`**

File: `apps/web-app/src/components/workflow-view/WorkflowVariantStoryMap.tsx`

The `onEdgeClick` handler at line 183:

```typescript
onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
```

Extend to:

```typescript
onEdgeClick={(_, edge) => {
  setSelectedEdgeId(edge.id);
  const storyEdge = map.edges.find(e => e.id === edge.id);
  if (storyEdge) {
    const hasEvidence = storyEdge.evidenceRunIds.length > 0;
    track({ event: 'variant_branch_edge_clicked', workflow_id: workflowId, edge_kind: storyEdge.kind, run_count: storyEdge.runCount, run_share_pct: Math.round(storyEdge.runShare * 100), has_evidence: hasEvidence, total_branches: map.branchCount, story_map_version: STORY_MAP_VERSION, divergence_version: DIVERGENCE_ALGORITHM });
    if (hasEvidence) {
      track({ event: 'variant_evidence_panel_shown', workflow_id: workflowId, branch_kind: storyEdge.kind, evidence_run_count: storyEdge.evidenceRunIds.length, story_map_version: STORY_MAP_VERSION, divergence_version: DIVERGENCE_ALGORITHM });
    }
  }
}}
```

The `workflowId` string must be threaded as a prop into `StoryMapInner`.

---

**P0-6: Wire `variant_single_run_state_shown` in `WorkflowVariantsMap.tsx`**

File: `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx`

In the `SinglePathView` component, add a `useEffect` that fires once on mount:

```typescript
useEffect(() => {
  track({ event: 'variant_single_run_state_shown', workflow_id: workflowId, run_count: graph.runCount ?? 1, story_map_version: STORY_MAP_VERSION });
}, []); // intentionally empty — fires once on mount
```

The `workflowId` and `graph.runCount` (or a fallback of 1) are available in context.

---

### P1 Items — Required Before GA

**P1-1: Add ErrorBoundary around variants mode in `WorkflowPageShell.tsx`**

File: `apps/web-app/src/components/workflow-view/WorkflowPageShell.tsx`

Wrap the `{mode === 'variants' && <WorkflowVariantsMap ...>}` block with an `ErrorBoundary` that fires:

```typescript
track({ event: 'client_error', message: error.message, component: 'WorkflowVariantsMap' });
```

This uses the existing `client_error` event type. Without this, render crashes in the variants surface are invisible in PostHog.

---

**P1-2: Thread `workflowId` as a prop into `WorkflowVariantsMap` and down into sub-components**

Files: `WorkflowPageShell.tsx`, `WorkflowVariantsMap.tsx`, `WorkflowVariantStoryMap.tsx`

`WorkflowPageShell` has `workflowRecord.id` available. Thread it as `workflowId: string` through:
- `WorkflowPageShell` → `WorkflowVariantsMap` props
- `WorkflowVariantsMap` → `WorkflowVariantStoryMap` props (already has `variants: ViewVariantPath[]` and `onSelectNode` — add `workflowId`)
- `WorkflowVariantStoryMap` → `StoryMapInner` (internal)

This is a prerequisite for P0-3 through P0-6.

---

**P1-3: Thread version constants into component props or import them directly**

Files: `WorkflowVariantsMap.tsx`, `WorkflowVariantStoryMap.tsx`

Import `STORY_MAP_VERSION` from `@/lib/variantStoryMap`. Import `CLUSTERING_ALGORITHM` and `DIVERGENCE_ALGORITHM` from `@ledgerium/intelligence-engine`. These are constants — no runtime resolution needed. Direct imports are cleanest.

---

**P1-4: Add `plan_limit_hit` call when Team+ gate is implemented**

File: wherever the plan check for variants access is implemented (not yet decided architecturally).

When the gate check fires, add:

```typescript
track({ event: 'plan_limit_hit', limit: 'variants_mode', currentUsage: runCount });
```

No new event type needed — `plan_limit_hit` already exists in the taxonomy.

---

### P2 Items — Post-GA Improvements

**P2-1: `variant_path_card_clicked` for List view engagement**

File: `WorkflowVariantsMap.tsx`

Add to the `PathCard` `onSelect` handler to track which path roles attract selection (standard / fastest / longest / exception / variant). Not required for beta but needed to evaluate the "standard-path-first vs deviation-first default" experiment described in the prior ANALYTICS_FINDINGS.md §5.2.

---

**P2-2: `variant_compare_opened` for Compare button usage**

File: `WorkflowVariantsMap.tsx`

Add to the `onCompare` handler on `PathCard`. Measures whether the path comparison affordance in List view is being used. Low compare rates (< 5% of List sessions) would indicate the button is not discoverable.

---

**P2-3: DNA view engagement tracking**

File: `VariantDnaStrip.tsx`

The DNA view currently has no interactive elements — it is a pure render. No events are needed at P0 or P1. If a future iteration adds hover tooltips or click-through from a DNA cell to the List or Map view, add a `variant_dna_cell_hovered` or `variant_dna_row_selected` event at that point.

---

## Implementation Note on `elapsed_ms_since_mode_open`

Several events carry `elapsed_ms_since_mode_open`. The cleanest implementation is a `useRef<number>` in `WorkflowVariantsMap` set to `Date.now()` when the component mounts (which corresponds to variants mode being active). This mirrors the `loadStartRef` pattern used in `DashboardV2Shell.tsx`. The ref is not a state value — it does not trigger re-renders — and it is read at the time each interaction event fires to compute elapsed time. This is consistent with the existing single-upstream-clock-boundary pattern established in iter 037 (MDR-P03/P04).

---

**End of ANALYTICS_FINDINGS.md**
