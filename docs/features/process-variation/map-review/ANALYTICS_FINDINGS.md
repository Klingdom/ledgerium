# Analytics Findings — Multi-Run Process Map (Variants + Decision Points)

**Artifact type:** Analytics deliverable — Define phase, read-only on product code
**Date:** 2026-06-10
**Author:** analytics agent
**Scope:** Variant map, decision-node interaction, and diverge→reconverge visualization
**Upstream artifacts read:**
- `apps/web-app/src/lib/analytics.ts` — existing event taxonomy, privacy posture, PostHog pattern
- `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx` — variant map component, path classification, comparison card, step sequence view
- `apps/web-app/src/components/workflow-view/WorkflowModeSwitcher.tsx` — four modes: flow / swimlane / variants / systems
- `apps/web-app/src/components/workflow-view/WorkflowPageShell.tsx` — shell that hosts all four modes, inspector panel
- `apps/web-app/src/components/workflow-view/nodes/WorkflowDecisionNode.tsx` — decision node rendered via ReactFlow
- `apps/web-app/src/components/workflow-view/adapters/variantAdapter.ts` — `buildVariantData()`, `VariantAdapterOutput`, `hasVariantData` flag
- `apps/web-app/src/components/detail/WorkflowReportPage.tsx` — "Where runs diverge" section (`VarianceVariantsSection`), `deriveDivergence()`, backbone spine, branch cards
- `packages/intelligence-engine/src/divergenceAnalyzer.ts` — `analyzeDivergence()`, `DivergenceAnalysis`, `DivergenceBranch`, `DIVERGENCE_ALGORITHM = 'lcs-backbone/1.0.0'`, `evidenceRunIds`
- `packages/intelligence-engine/src/clustering/clusterSignatures.ts` — `clusterSignatures()`, `CLUSTERING_ALGORITHM = 'single-link/1.0.0'`, `DEFAULT_CLUSTER_THRESHOLD = 0.6`, version hash
- `packages/intelligence-engine/src/clustering/traceSimilarity.ts` — similarity weights, blended score
- `docs/features/process-variation/MEASUREMENT_PLAN_PROCESS_VARIATION.md` — existing clustering/variation measurement plan (process groups, variants, correction events)

**Privacy posture inherited from codebase:**
- `disable_session_recording: true` is set in PostHog
- No workflow content, step labels, page titles, URLs, or process names in any event
- All IDs are opaque server-assigned identifiers
- Events are counters and structural signals only

---

## 1. The Outcome We Want

The variant map succeeds if it moves users from passive observation to active understanding and action.
The specific outcome is: a user who opens the variants mode understands where their process is inconsistent, can identify which divergence matters, and takes a downstream action as a result (records another run, annotates, shares, or investigates a specific branch).

There is no runtime ground truth for clustering quality and no oracle for whether the variant visualization is "correct." All quality measurement is therefore by proxy. This section defines those proxies precisely.

### 1.1 Proxy Metrics for Clustering Quality

Clustering quality cannot be directly observed in production. Four proxies serve as its measurement:

**Intra-cluster similarity** (server-side)
The mean `traceSimilarity` score across all pairs within a cluster produced by `clusterSignatures()`. Because `clusterSignatures.ts` uses a `DEFAULT_CLUSTER_THRESHOLD = 0.6` with union-find connected components, any pair within a cluster has at least 0.6 pairwise similarity. The _mean_ across all pairs (not just adjacent) is the precision proxy. A cluster with mean pairwise similarity ≥ 0.80 is well-formed. A cluster with mean dropping to 0.65 contains outlier members that are being carried in via transitive chain links — a connected-components failure mode specific to single-link clustering.

**Singleton rate**
Recordings not assigned to any cluster. Structural ceiling: if a user has < 3 recordings, singleton rate is 100% regardless of algorithm quality. The meaningful signal is singleton rate among users with ≥ 5 recordings. Singleton rate ≤ 40% in that cohort is the target.

**Determinism hard-gate**
`clusterSignatures()` is designed deterministic: inputs sorted by id, union toward lexicographically smaller root, no Date/random, version hash `single-link/1.0.0#<configHash>`. Similarly `analyzeDivergence()` uses `DIVERGENCE_ALGORITHM = 'lcs-backbone/1.0.0'`, stable sort by `runId`, deterministic LCS tie-break. The gate is binary: same inputs must produce byte-identical outputs on every re-run. Any instability is a P0 correctness bug. No tolerance.

**User correction rate**
The inverse quality signal. User merges, splits, and run-rejections per 100 auto-grouped recordings presented. Target ≤ 15%. At > 25%, halt rollout. This is inherited from `MEASUREMENT_PLAN_PROCESS_VARIATION.md §3.4` and applies equally to the map surface where group membership is visible.

### 1.2 Proxy Metrics for Variant Map Value

Because there is no ground truth for whether the map "correctly" identified a meaningful variation, value is proxied by:

- **Engagement depth:** did the user click into a variant, compare two variants, or drill to a source run? These are progressive evidence that the surface is legible and actionable.
- **Branch click rate on diverge→reconverge view:** the `WorkflowReportPage.tsx` "Where runs diverge" section renders branch cards with `afterLabel` and `runs` count from `deriveDivergence()`. A user clicking "View source run" from that card is the clearest evidence click — they traced a divergence back to a real recording.
- **Repeat recording rate cohort lift:** users who have engaged with variant data at Level 2+ should show higher 14-day repeat recording rates than users who viewed a workflow without variant data. This is the activation signal.
- **Standard path frequency displayed vs. engagement rate:** `WorkflowVariantsMap.tsx` shows `standard_path_frequency` prominently ("`${Math.round(path.frequency * 100)}%` of runs follow the standard path"). When this number is between 50–90%, variation is meaningful and visible. Tracking which frequency ranges attract deeper engagement calibrates the UX threshold for when to surface the variant mode prominently.

---

## 2. Engagement and Value Metrics for the Variant and Decision Map

### 2.1 Map-Mode Navigation

**What:** User switches to variants mode via `WorkflowModeSwitcher`. The four modes are `flow`, `swimlane`, `variants`, `systems` (from `WorkflowModeSwitcher.tsx` and `types.ts`). The existing `tab_switched` event in `analytics.ts` already fires on mode changes. We extend it with variant-specific context.

**Primary signal:** `variants_mode_opened` (new event — distinct from generic `tab_switched` because the variants mode has preconditions and a richer state worth capturing).

**Decision it informs:** What fraction of workflow views reach the variant mode? Among those, what is the `has_variant_data` split? If most users opening variants mode see the `SinglePathView` (the "record more runs" nudge), the mode is being discovered before it can deliver value — entry-point guidance may need adjustment.

### 2.2 Variant Selected (Path Card Click)

**What:** User clicks a `PathCard` in the left rail of `WorkflowVariantsMap.tsx`. `setSelectedPathId(path.id)` is called. The selected path changes the right-pane detail view.

**Decision it informs:** Which paths attract selection — standard, fastest, longest, exception-heavy, or generic variant? `path_role` from `classifyPaths()` in `WorkflowVariantsMap.tsx` determines the role classification. If users overwhelmingly select only the standard path, they are not exploring variants.

### 2.3 Two-Variant Compare (Compare Button)

**What:** User clicks the "Compare vs Standard" button on a non-standard `PathCard`. `setComparePathId()` fires, surfacing the `ComparisonCard`. This is the highest-effort engagement action in the map.

**Decision it informs:** Are users using the comparison affordance? If the compare button is clicked in < 5% of variant-mode sessions, it is either not discoverable or the map is not communicating that comparison is valuable.

### 2.4 Decision-Point Inspected

**What:** User clicks a `WorkflowDecisionNode` in the flow or swimlane canvas (rendered in `WorkflowFlowCanvas` / `WorkflowSwimlaneCanvas`). The inspector panel opens via `handleSelectNode`. The `WorkflowDecisionNode.tsx` renders decision nodes with `aria-label="Decision: ..."` — these are action targets.

**Decision it informs:** Are decision points drawing investigation? High decision-node click rate relative to task-node click rate indicates users understand the branching points. A decision-node click rate that equals task-node click rate suggests users don't distinguish decision nodes from regular steps.

### 2.5 Branch → Source Run Drill (Evidence Click)

**What:** In `WorkflowReportPage.tsx`, the "Where runs diverge" section renders branch cards from `deriveDivergence()`. Each branch card shows `afterLabel`, `altSteps`, `runs_pct`, and carries `evidenceRunIds` (directly from `DivergenceBranch.evidenceRunIds` in `divergenceAnalyzer.ts`). A user clicking "View source run" from a branch card is navigating from a divergence point to the raw recording that produced it — this is the "evidence-linked moat made visible" moment described in `divergenceAnalyzer.ts`.

**Decision it informs:** Is the evidence link being used? The `evidenceRunIds` property is the core differentiator. If branch cards are rendered but evidence clicks are near zero, the CTA is not compelling or not visible.

### 2.6 Time to First Variation Insight (TTFVI)

**What:** Elapsed milliseconds from the `variants_mode_opened` event to the first `variant_path_card_clicked` event within the same session on the same workflow.

**Decision it informs:** Is the initial state of the variant map legible enough that users quickly identify a path to investigate? p50 target < 30 seconds. p90 target < 90 seconds. If p50 > 60 seconds, the default state (standard path selected, full detail pane shown) is not communicating variation quickly — the highest-deviation variant should be surfaced more prominently on initial load.

### 2.7 Show-All / Spaghetti Mode Usage

**What:** `WorkflowVariantsMap.tsx` currently shows the top 3 paths via `Quick Compare` shortcuts (`paths.filter(p => !p.isStandard).slice(0, 3)`). If a "show all paths" or expanded view toggle is added, its click rate is a signal of whether users want more than 3 variants.

**Decision it informs:** If < 5% of sessions with 4+ variants use "show all," the top-3 truncation is correct. If > 30% use it, users need more paths visible by default. Track `variant_show_all_clicked` when this affordance exists.

---

## 3. Concrete Privacy-Safe Event Specification

All events below are new entries to the `AnalyticsEvent` discriminated union in `apps/web-app/src/lib/analytics.ts`. They follow the established conventions: snake_case, no content, no PII, no step labels, no workflow titles, counters only.

**Version tagging:** `divergence_version` captures `DIVERGENCE_ALGORITHM` (`'lcs-backbone/1.0.0'`) from `divergenceAnalyzer.ts`. `clustering_version` captures `CLUSTERING_ALGORITHM` (`'single-link/1.0.0'`) plus config hash from `clusterSignatures.ts`. Both are required on every map-surface event to enable per-algorithm-version cohort analysis. This parallels the `SEGMENTATION_RULE_VERSION` pattern in the segmentation engine.

---

### Event 1 — `variants_mode_opened`

**Trigger:** User clicks the "Variants" tab in `WorkflowModeSwitcher` (specifically `mode === 'variants'`). Fires once per mode-entry; does not re-fire on re-renders.

**Firing location:** `WorkflowPageShell.tsx` in the `onModeChange` handler when `mode === 'variants'`.

**Privacy audit:** No workflow content. `has_variant_data` is a boolean derived from `variantAdapter.ts:buildVariantData()` `hasVariantData` flag — it reflects structural data availability, not process content. `variant_count` is a count integer. `standard_path_frequency` is a float 0–1. None of these expose what the workflow does.

```typescript
{
  event: 'variants_mode_opened';
  /** workflowId — opaque DB id, not the workflow title */
  workflow_id: string;
  /** True if variantAdapter.hasVariantData = true (≥2 variants); false = SinglePathView */
  has_variant_data: boolean;
  /** Number of distinct variant paths; 0 if has_variant_data = false */
  variant_count: number;
  /** Frequency of standard path (0–1 from ViewVariantPath.frequency); -1 if no variant data */
  standard_path_frequency: number;
  /** Total run count backing this workflow's variant data */
  run_count: number;
  /** From DIVERGENCE_ALGORITHM constant in divergenceAnalyzer.ts */
  divergence_version: string;
  /** From CLUSTERING_ALGORITHM + configHash in clusterSignatures.ts */
  clustering_version: string;
}
```

---

### Event 2 — `variant_path_card_clicked`

**Trigger:** User clicks a `PathCard` in the left rail (`onSelect` callback in `WorkflowVariantsMap.tsx`). Fires on each path selection change.

**Firing location:** `PathCard` `onSelect` handler in `WorkflowVariantsMap.tsx`.

**Privacy audit:** `path_role` is the classification label from `classifyPaths()`: `'standard' | 'fastest' | 'longest' | 'exception' | 'variant'` — these are structural labels, not content. `step_count` is an integer. `deviation_from_standard_pct` is a computed percentage. No step content, no labels.

```typescript
{
  event: 'variant_path_card_clicked';
  workflow_id: string;
  /** From ClassifiedPath.role */
  path_role: 'standard' | 'fastest' | 'longest' | 'exception' | 'variant';
  /** 1-based rank by frequency; 1 = standard/most frequent */
  path_rank: number;
  /** ClassifiedPath.stepCategories.length */
  step_count: number;
  /** ClassifiedPath.frequency * 100, rounded to integer */
  frequency_pct: number;
  /** ClassifiedPath.stepCountDelta relative to standard path; 0 for standard */
  step_count_delta_vs_standard: number;
  /** Count of error_handling steps in this path */
  error_step_count: number;
  /** ClassifiedPath.runCount */
  run_count_in_path: number;
  /** Total variant count for this workflow at time of click */
  total_variant_count: number;
  /** Elapsed ms since variants_mode_opened for this session */
  elapsed_ms_since_mode_open: number;
  divergence_version: string;
  clustering_version: string;
}
```

---

### Event 3 — `variant_compare_opened`

**Trigger:** User clicks "Compare vs Standard" on a non-standard `PathCard` (`onCompare` handler; `comparePathId` becomes non-null, surfacing `ComparisonCard`).

**Firing location:** `PathCard` `onCompare` handler in `WorkflowVariantsMap.tsx`.

**Privacy audit:** Structural counters and roles only. `step_diff` is an integer delta. `freq_diff_pct` is a frequency difference. `deviation_classification` is a string enum — no content.

```typescript
{
  event: 'variant_compare_opened';
  workflow_id: string;
  /** Role of the primary path (always 'standard' in current Quick Compare shortcuts) */
  primary_path_role: 'standard' | 'fastest' | 'longest' | 'exception' | 'variant';
  /** Role of the secondary path being compared */
  secondary_path_role: 'standard' | 'fastest' | 'longest' | 'exception' | 'variant';
  /** Rank of secondary path by frequency */
  secondary_path_rank: number;
  /** Step count difference (secondary - primary) */
  step_diff: number;
  /** Frequency difference in percentage points (secondary - primary, signed) */
  freq_diff_pct: number;
  /** Whether comparison was opened via Quick Compare shortcut or manual Compare button */
  entry_point: 'quick_compare_shortcut' | 'path_card_button';
  divergence_version: string;
  clustering_version: string;
}
```

---

### Event 4 — `decision_node_inspected`

**Trigger:** User clicks a `WorkflowDecisionNode` in the flow or swimlane canvas, opening the inspector panel for that node. Detected when `selection.type === 'node'` and the corresponding `viewNode.nodeType === 'decision'` in `WorkflowPageShell.tsx`.

**Firing location:** `handleSelectNode` in `WorkflowPageShell.tsx` when the resolved node's `nodeType` is `'decision'`.

**Privacy audit:** `ordinal` is a 1-based integer position in the flow. `confidence` is a float from the engine. No step labels, no decision label text, no content from the node.

```typescript
{
  event: 'decision_node_inspected';
  workflow_id: string;
  /** ViewNode.ordinal — 1-based position in step sequence */
  step_ordinal: number;
  /** ViewNode.confidence — engine confidence score 0–1 */
  confidence: number;
  /** Which view mode was active when the node was clicked */
  active_mode: 'flow' | 'swimlane';
  /** Whether variant data is available for this workflow */
  has_variant_data: boolean;
  divergence_version: string;
  clustering_version: string;
}
```

---

### Event 5 — `divergence_branch_evidence_clicked`

**Trigger:** User clicks "View source run" (or equivalent evidence CTA) from a branch card in the "Where runs diverge" section of `WorkflowReportPage.tsx`. This fires when the user navigates from a `DivergenceBranch` to one of its `evidenceRunIds`.

**Firing location:** Branch card link/button in the `VarianceVariantsSection` of `WorkflowReportPage.tsx`.

**Privacy audit:** `branch_rank` is the frequency-ordered position of the branch (1 = most frequent non-standard branch). `diverge_step_index` and `reconverge_step_index` are integer positions from `DivergenceBranch` — positions in the backbone, not step content. `alt_step_count` is a count. `has_reconvergence` is boolean. None of these expose what the steps do.

```typescript
{
  event: 'divergence_branch_evidence_clicked';
  workflow_id: string;
  /** 1-based rank of this branch by frequency among all non-standard branches */
  branch_rank: number;
  /** DivergenceBranch.divergeAfterIndex — backbone position where branch starts */
  diverge_step_index: number;
  /** DivergenceBranch.reconvergeAtIndex — backbone position where branch rejoins; -1 if no reconvergence */
  reconverge_step_index: number;
  /** DivergenceBranch.altSteps.length — how many off-backbone steps this branch takes */
  alt_step_count: number;
  /** DivergenceBranch.skippedBackbone.length — backbone steps skipped */
  skipped_step_count: number;
  /** DivergenceBranch.dfgConfirmedSplit — DFG cross-check passed */
  dfg_confirmed_split: boolean;
  /** DivergenceBranch.dfgConfirmedJoin — DFG cross-check passed */
  dfg_confirmed_join: boolean;
  /** DivergenceBranch.runCount / totalRuns */
  branch_frequency: number;
  /** Total number of branches shown for this workflow */
  total_branch_count: number;
  divergence_version: string;
  clustering_version: string;
}
```

---

### Event 6 — `step_sequence_step_clicked`

**Trigger:** User clicks a row in the `StepSequenceView` inside `WorkflowVariantsMap.tsx`. The button calls `onSelectNode(matchNode.id)`. This opens the inspector for that step.

**Firing location:** `StepSequenceView` step button `onClick` in `WorkflowVariantsMap.tsx`.

**Privacy audit:** `step_position` is an integer index. `is_divergence_point` is a boolean (the amber-highlighted step that differs from standard). `category` is a step category string from `CATEGORY_STYLES` (e.g. `'single_action'`, `'fill_and_submit'`) — these are structural action types, not content. No step labels exposed.

```typescript
{
  event: 'step_sequence_step_clicked';
  workflow_id: string;
  /** 0-based index of step in StepSequenceView */
  step_position: number;
  /** True if this step is highlighted as a divergence (isDivergence flag in StepSequenceView) */
  is_divergence_point: boolean;
  /** ViewNode.category — structural step category, never content */
  category: string;
  /** Which path's sequence was being viewed */
  path_role: 'standard' | 'fastest' | 'longest' | 'exception' | 'variant';
  divergence_version: string;
  clustering_version: string;
}
```

---

### Event 7 — `variant_show_all_clicked`

**Trigger:** User clicks a "Show all variants" affordance when the list is truncated beyond the current 3-item `Quick Compare` subset. (This affordance does not exist yet; this event spec is ready for when it is built.)

**Firing location:** Show-all toggle in `WorkflowVariantsMap.tsx` left rail.

```typescript
{
  event: 'variant_show_all_clicked';
  workflow_id: string;
  /** Total number of variants available for this workflow */
  total_variant_count: number;
  /** Number of variants visible before clicking show all */
  visible_count_before: number;
  divergence_version: string;
  clustering_version: string;
}
```

---

### 3.1 Privacy Confirmation

The following properties were explicitly considered and excluded from all events above:

| Excluded property | Reason |
|---|---|
| Step label / title text | Direct workflow content. `WorkflowDecisionNode` renders `n.decisionLabel || n.label` — these are never captured in events. |
| Path label string | `ClassifiedPath.label` (e.g. "Variant 2") is UI display text that may be renamed by users. Not captured. |
| `evidenceRunIds` array contents | The run IDs themselves are opaque, but emitting the full array on a client event risks log volume and correlation issues. `branch_rank` is used instead. |
| `altSteps` string content | The off-backbone step categories are captured only as counts (`alt_step_count`), not as the category strings themselves, because a sequence of category strings is a structural fingerprint of the process. |
| Workflow title or name | Never in any event. |
| Page titles, URLs, route templates | `ViewNode` carries `pageTitle` and `routeTemplate` — these are explicitly excluded. |
| Decision label text | `WorkflowDecisionNode` renders `n.decisionLabel || n.label` — never captured. |

**The `disable_session_recording: true` PostHog posture is unchanged.** All new events flow through the existing `track()` / `sendBeacon` pipeline and forward to PostHog as counters.

---

## 4. Acceptance / Ship Gates for the Variant Map

Gates are ordered by severity. All hard gates (H) must pass before GA. Soft gates (S) require written justification in the launch readiness artifact if not met but do not block GA.

### Gate M1 — Determinism (Hard Gate)

**Condition:** `analyzeDivergence()` called twice with identical inputs (same `backbone`, same `DivergenceRun[]` array with the same run IDs) produces byte-identical `DivergenceAnalysis.branches` output in 100% of test cases. `clusterSignatures()` with the same `ClusterMemberInput[]` produces byte-identical `ClusterResult` in 100% of test cases.

**Measurement:** Server-side re-run check after each materialization, parallel to the existing `MEASUREMENT_PLAN_PROCESS_VARIATION.md §3.3` stability check. Log `variant_map_determinism_failed` internal event with a diff count when instability is detected.

**Threshold:** Zero instability events across 14 consecutive production days.

**Action if failed:** P0 correctness bug. No GA. Specifically suspect: (a) input ordering before `analyzeDivergence()` — the `ordered` sort in `analyzeDivergence.ts` relies on stable `runId` strings; (b) concurrent writes adding runs between the two re-run inputs; (c) floating-point accumulation in `traceSimilarity` under different JIT compilation paths.

---

### Gate M2 — Stable Re-Render (Hard Gate)

**Condition:** The `WorkflowVariantsMap` renders with byte-identical output (same path classification, same `selectedPathId` default, same `StepSequenceView` content) on two successive React renders with unchanged props. No layout shift on prop stability.

**Measurement:** Playwright visual regression test: mount `WorkflowVariantsMap` twice with the same `graph` and `intelligence` props, capture screenshot diff. Diff must be zero pixels.

**Threshold:** 100% stable across all test fixtures.

**Action if failed:** Investigate `useMemo` dependencies in `WorkflowVariantsMap.tsx` — `buildVariantData` and `classifyPaths` memoize on `[graph, intelligence]` and `[variantData.paths, graph]` respectively. Instability would indicate a reference identity issue leaking through the memo boundaries.

---

### Gate M3 — Variant Map Engagement Threshold (Soft Gate)

**Condition:** Among workflow views where `has_variant_data = true` (i.e., `WorkflowVariantsMap` renders the full path-card view rather than `SinglePathView`), ≥ 30% of sessions produce at least one `variant_path_card_clicked` event within 60 seconds of `variants_mode_opened`.

**Measurement:** `variant_path_card_clicked` rate / `variants_mode_opened where has_variant_data = true`, windowed to 60 seconds elapsed_ms.

**Target:** ≥ 30% within 14 days of private beta (minimum 30 qualifying sessions needed for signal).

**Action if not met:** The default state showing the standard path selected with full detail pane is not surfacing the most interesting divergence prominently enough. Consider leading with the highest-deviation non-standard path selected by default, or showing a summary stat ("3 of 10 runs took a different path") more prominently before the path list.

---

### Gate M4 — Evidence Click Fires in Production (Hard Gate)

**Condition:** `divergence_branch_evidence_clicked` fires at least once in production within the first 7 days of any beta user having a workflow with ≥ 2 divergence branches rendered in `WorkflowReportPage.tsx`.

**Measurement:** PostHog event list confirms at least one `divergence_branch_evidence_clicked` event.

**Rationale:** If not a single user clicks through from a divergence branch to a source run within the first week of availability, the evidence link is either not visible, not compelling, or the branch cards are not being rendered due to a data pipeline gap. This event firing at all is a minimum viability check.

---

### Gate M5 — Correction Rate Ceiling (Hard Gate, inherited)

**Condition:** User correction rate (merge + split + reject actions on clustering results) ≤ 15% per 100 auto-grouped recordings presented. This is the same Gate 3 from `MEASUREMENT_PLAN_PROCESS_VARIATION.md §7`.

**Additional constraint for map surface:** The map surface makes clustering assignment visible (users see which runs are grouped together). This increases correction exposure. The 15% ceiling must hold _after_ map launch, not just before.

---

### Gate M6 — No PII Event Leak (Hard Gate)

**Condition:** Static audit of all firing sites for events 1–7 above confirms no string property concatenates workflow title, step label, page title, `decisionLabel`, `n.label`, or any `ViewNode` content field.

**Measurement:** Code review checklist item in the PR that adds the events to `analytics.ts` and wires the firing sites. The reviewer must grep for `label`, `title`, `decisionLabel`, `shortLabel`, `system`, `routeTemplate`, `pageTitle` in all new `track({...})` calls.

---

### Gate M7 — TTFVI p50 ≤ 30s (Soft Gate)

**Condition:** Time-to-first-variation-insight p50 (measured as elapsed ms from `variants_mode_opened` to first `variant_path_card_clicked` in the same session, for sessions where `has_variant_data = true`) is ≤ 30,000 ms.

**Measurement:** Server-side aggregation of `elapsed_ms_since_mode_open` from `variant_path_card_clicked` events, filtered to `has_variant_data = true` sessions.

**Action if not met:** The variant map's initial loaded state is not communicating variation fast enough. Candidate interventions: (a) surface `standard_path_frequency` as a prominent callout ("Only 45% of runs follow the standard path — 3 variants detected") above the path list; (b) pre-select the highest-deviation non-standard path instead of the standard path as the default; (c) add divergence point count to the overview header in the left rail.

---

## 5. Experiment Design

### 5.1 Does the Variant Map Increase Repeat Recording?

**Hypothesis:** Users who engage with the variant map (at Level 2 — `variant_path_card_clicked` or deeper) are more likely to record additional runs of the same workflow within 14 days than users who viewed the same workflow without entering variant mode.

**Rationale:** The variant map answers "what would I learn from recording this again?" by showing what different runs looked like. A user who sees that 30% of their runs took a different path has a clear reason to record again — to see which path they follow next. This is the activation feedback loop the feature is designed to create.

**Design:**

Cohort A (treatment): Users who opened a workflow in variants mode and produced at least one `variant_path_card_clicked` event (engaged at Level 2+).

Cohort B (control): Users who viewed the same workflow (opened the workflow detail page, `workflow_viewed` fired) but never switched to variants mode. Matched on workflow run count at time of first view (±1 run bucket) and user tenure cohort (first 30 days / 30–90 days / 90+ days).

**Primary metric:** 14-day repeat recording rate — count of `workflow_uploaded` events where the workflow is assigned to the same `processGroupId` as the viewed workflow, within 14 days of the qualifying view.

**Secondary metrics:**
- 7-day return visit rate to the same workflow's variants mode (`variants_mode_opened` with the same `workflow_id` within 7 days)
- Time to next recording from first `variant_path_card_clicked` (p50, p90)

**Success condition:** Cohort A 14-day repeat recording rate ≥ 1.5× Cohort B. If this ratio is not observed at 45 days with N ≥ 40 per cohort, the variant map is not creating the evidence-building feedback loop, and deeper UX diagnosis is needed before further investment.

**Confounders to control:**
- Workflows with single recordings are excluded from both cohorts (no variant data, structurally equal experience).
- Users who explicitly navigated to variants mode but saw `SinglePathView` (no variant data) are excluded from Cohort A — they did not receive the treatment.
- Users with > 20 recordings are capped to avoid power-user distortion.

**Minimum sample size:** 40 users per cohort for 80% power to detect a 1.5× effect with σ estimated from pre-launch recording rate variance. Achievable within 30 days of private beta at moderate growth.

---

### 5.2 Standard-Path-First vs. Highest-Deviation-First Default

**Hypothesis:** Displaying the highest-deviation non-standard path as the initially selected path (rather than the standard path) improves TTFVI (p50) and Level 2 engagement rate within the first 30 seconds of `variants_mode_opened`.

**Rationale:** The current `WorkflowVariantsMap.tsx` defaults to the standard path selected (`useState<string | null>(paths.find(p => p.isStandard)?.id ?? paths[0]?.id ?? null)`). The standard path is the most familiar but the least surprising — it shows users what they already expect. The variant with the largest `stepCountDelta` or highest error step ratio is the most informationally surprising and may draw faster investigation.

**Control:** Standard path selected by default on `variants_mode_opened` (current behavior).

**Variant:** The non-standard path with the highest `stepCountDelta > 0` OR `error_step_count > 0` is pre-selected on first render. The standard path is still visible in the left rail but not defaulted.

**Assignment:** Random 50/50 split on `workflow_id` (not user-level, so the same user sees consistent behavior across sessions for the same workflow). Requires a feature flag passed as a prop to `WorkflowVariantsMap`.

**Primary metric:** `variant_path_card_clicked` where `path_role !== 'standard'` within 30 seconds of `variants_mode_opened` (i.e., within `elapsed_ms_since_mode_open ≤ 30000`). This directly measures whether the variant treatment draws non-standard path investigation faster.

**Secondary metric:** `variant_compare_opened` rate within the session (does the variant treatment also improve comparison behavior?).

**Guardrail metric:** `variants_mode_opened` → session bounce rate (user immediately switches back to `flow` mode). If the variant treatment increases this rate by > 10 percentage points, the pre-selected deviation path is confusing rather than clarifying.

**MDE:** 10 percentage points improvement on the 30-second non-standard path click rate (from an estimated 25% baseline to 35%).

**Minimum sample:** 80 workflows per arm (workflows with ≥ 2 variants and runCount ≥ 3). Estimated within 45 days of private beta.

**Instrumentation required:** The `track('variants_mode_opened', { ... })` event must include an `experiment_arm` field: `'standard_default' | 'deviation_default'`. This is added to the event spec only during the experiment window. After experiment conclusion, the field is removed from production.

---

### 5.3 Cohort Analysis by `divergence_version` and `clustering_version`

This is not an A/B experiment but a mandatory analytical protocol. Every time `DIVERGENCE_ALGORITHM` or `CLUSTERING_ALGORITHM` is bumped (a new version constant is published in `divergenceAnalyzer.ts` or `clusterSignatures.ts`), the following cohort analysis runs automatically within 14 days of the version change:

1. Segment all `variants_mode_opened` events by `divergence_version` value.
2. Compare the Level 2 engagement rate (`variant_path_card_clicked` / `variants_mode_opened`) between the old version cohort and the new version cohort.
3. Compare TTFVI p50 between cohorts.
4. Compare `divergence_branch_evidence_clicked` rate per variation session between cohorts.

**Decision rule:** If any of these metrics degrades by > 15% relative in the new version cohort, the version bump is a regression and must be investigated before the old version is deprecated. This is the product-metrics analog of the determinism hard-gate — the hard-gate catches algorithmic correctness, this cohort analysis catches user-visible quality degradation that is technically correct but experientially worse.

---

## 6. Dashboard Specification

### 6.1 Engineering Health Dashboard (weekly review)

| Metric | Chart type | Alert threshold |
|---|---|---|
| Variant map determinism failures | Running count | Red at 1 |
| `variants_mode_opened` error rate (`client_error` events in variant map component) | % of opens | Red at 0.5% |
| `SinglePathView` rate (sessions where `has_variant_data = false`) | % | Informational; flag if > 70% (most users not reaching variant value) |
| `divergence_branch_evidence_clicked` per day | Count | Alert if 0 for 7 consecutive days post-launch |
| p95 render time for variants mode (Lighthouse / server timing) | Line | Amber at 2.5s, red at 4s |

### 6.2 Product Engagement Dashboard (weekly review)

| Metric | Chart type | Target |
|---|---|---|
| Variants mode funnel: `variants_mode_opened` → `variant_path_card_clicked` → `variant_compare_opened` | Step funnel | L2 ≥ 30%; L3 ≥ 10% |
| TTFVI p50 and p90 | Line | p50 ≤ 30s, p90 ≤ 90s |
| `divergence_branch_evidence_clicked` / `variants_mode_opened` | Rate line | Target ≥ 5% at 60 days |
| `decision_node_inspected` / total node clicks | Rate | Informational (no target until baseline) |
| 14-day repeat recording rate: variant-engaged vs. control cohort | Dual line | Target 1.5× lift |
| `variant_show_all_clicked` / sessions with variant_count ≥ 4 | Rate | Decision trigger at > 30%: default to showing more paths |

### 6.3 Version Cohort Report (triggered on algorithm version bumps)

Runs on-demand within 14 days of any `divergence_version` or `clustering_version` change.

| Metric | Old version | New version | Regression threshold |
|---|---|---|---|
| L2 engagement rate | n% | n% | > 15% relative decline = regression |
| TTFVI p50 | ms | ms | > 20% increase = regression |
| Evidence click rate | n% | n% | > 20% relative decline = regression |
| User correction rate | n% | n% | > 5pp increase = regression |

---

## 7. Integration with Existing Taxonomy

### Events that extend without replacing

All 7 events above are additive to the `AnalyticsEvent` union. The following existing events interact with them and require no change:

| Existing event | Interaction |
|---|---|
| `tab_switched` with `tab: 'variants'` | Already fires on mode switch via `view_mode_changed` / `tab_switched`. The new `variants_mode_opened` provides richer context (has_variant_data, run_count, versions). The two events may co-exist during transition; `variants_mode_opened` is the authoritative variant-mode entry event. |
| `workflow_viewed` | Sessions that include `workflow_viewed` but not `variants_mode_opened` indicate users who saw the workflow but did not explore variants. Used in the repeat recording experiment control cohort. |
| `workflow_uploaded` | Downstream action for the north-star Variation-Insight Action Rate (VIAR) and the repeat recording experiment primary metric. No change needed. |
| `first_process_map_viewed` | Activation event. Users who first visit the process map view and then open variants mode within the same session represent the highest-intent early adopters. |
| `api_error` | Existing guardrail for endpoint errors. If divergence computation or variant data loading produces API errors, they flow through this event with `endpoint: '/api/workflows/[id]'` or `endpoint: '/api/process-groups/[id]/variants'`. No new event needed. |
| `client_error` | Existing guardrail for component errors. `WorkflowVariantsMap` render errors (e.g., from malformed `intelligence` payload) should fire `client_error` with `component: 'WorkflowVariantsMap'`. Wire this via an ErrorBoundary wrapping the variants mode in `WorkflowPageShell.tsx`. |

### Schema extension rule

All 7 events must be added to the `AnalyticsEvent` discriminated union in `apps/web-app/src/lib/analytics.ts` before any component fires them. TypeScript strict mode and the discriminated union enforce this at compile time. This is the same rule applied to all prior analytics additions in the codebase.

---

## 8. What This Plan Deliberately Does Not Include

- **Step category sequences as event properties.** `DivergenceBranch.altSteps` is an array of step category strings (e.g., `['fill_and_submit', 'navigation']`). Even though these are structural rather than content labels, a full sequence is a fingerprint of the process execution path. Only counts are captured (`alt_step_count`).
- **`evidenceRunIds` as event properties.** These are run IDs that map to individual recordings. Emitting them client-side creates a correlation risk. Branch position and counts are sufficient for analytics.
- **Cross-user variant comparison.** All metrics are per-workflow or per-user on their own data. Cross-user benchmarking ("your process diverges more than average") requires multi-tenant density and explicit opt-in. Out of scope.
- **Session recording re-enablement.** `disable_session_recording: true` is a deliberate privacy posture. No event in this plan requires session replay to interpret. All events are structured counters interpretable without watching user sessions.
- **ML attribution.** The clustering (`clusterSignatures`) and divergence (`analyzeDivergence`) algorithms are deterministic. The `clustering_version` and `divergence_version` properties on every event provide version-based attribution without probabilistic model scoring.

---

**End of ANALYTICS_FINDINGS.md**
