# MEASUREMENT PLAN — Workflow Clustering and Process-Variation Analysis

**Artifact type:** Analytics deliverable — pre-build Define phase
**Status:** Draft — awaiting PRD and architecture approval before build begins
**Date:** 2026-06-10
**Author:** analytics agent
**Input artifacts:**
- `packages/intelligence-engine/src/groupingTypes.ts` — ProcessGroup, ProcessFamily, ProcessVariantRecord, WorkflowRunRecord, ClusteringScores, DeviationPoint interfaces
- `packages/intelligence-engine/src/variantDetector.ts` — greedy first-match variant clustering, `variantSimilarityThreshold`, path signatures
- `packages/intelligence-engine/src/variantAnalyzer.ts` — deviation scoring, `deviationScore`, classification (`standard` / `minor` / `major` / `outlier`)
- `packages/intelligence-engine/src/scoringConfig.ts` — `DEFAULT_SCORING_CONFIG`, exact-group thresholds (verified ≥ 0.90, likely ≥ 0.82), family thresholds (sameFamily ≥ 0.80), `SCORING_MODEL_VERSION = '1.0.0'`
- `apps/web-app/src/lib/analytics.ts` — existing `AnalyticsEvent` union, `track()`, `setUserPlanForAnalytics()`, PostHog integration pattern
- `docs/features/dashboard-v3-metrics-engine/MEASUREMENT_PLAN_METRICS_ENGINE.md` — established taxonomy conventions (`v3_` prefix, snake_case properties, no PII rule, `column_set_hash` pattern)

**Consumers:** product-manager, backend-engineer, frontend-engineer, coordinator, growth-strategist, system-architect

---

## 1. Measurement Intent

Workflow clustering answers one question users cannot answer themselves: "Are these recordings the same process?" Process-variation analysis answers the follow-on: "Where does it diverge, and does that divergence matter?"

Both capabilities produce intelligence only if two conditions hold: (a) the clustering engine groups correctly without requiring users to correct it constantly, and (b) users actually open the variation view and find it actionable. A clustering engine that silently mis-groups is worse than no clustering — it embeds wrong process identities across all downstream metrics. A variation view nobody opens is instrumentation cost with no return.

This plan therefore treats measurement at two layers simultaneously:

**Layer 1 — Engine quality.** Because clustering has no user-facing ground truth at runtime, quality must be measured by proxy: intra-cluster similarity, user-correction rate, determinism across re-runs, and the fraction of recordings left ungrouped. These signals are the audit trail that distinguishes "engine working well" from "engine making quiet errors."

**Layer 2 — Feature value.** Adoption, engagement depth, and the link to downstream behavior (does variation insight drive repeat recording? does it change the user's annotation or process-correction behavior?) are the evidence that clustering is worth the complexity it introduces.

Every metric defined below has a decision it informs and an action threshold. Metrics without a named decision are not included.

---

## 2. Terminology Grounding

Terms used throughout this document map directly to types in the intelligence-engine source to eliminate ambiguity between the analytics artifact and the implementation.

| Term used here | Source type / constant | Definition |
|---|---|---|
| **Process group** | `ProcessGroup` (`groupingTypes.ts`) | An exact cluster of recordings that share the same normalized workflow identity (exact-group score ≥ 0.82 per `exactGroupThresholds.minimum`) |
| **Process family** | `ProcessFamily` (`groupingTypes.ts`) | A broader grouping of related process groups that share family-level signals (familyScore ≥ 0.80 per `familyThresholds.sameFamily`) |
| **Variant** | `ProcessVariantRecord` (`groupingTypes.ts`) | A distinct execution path within a process group, identified by `detectVariants()` using the configured `variantSimilarityThreshold` |
| **Standard path** | `ProcessVariant.isStandardPath = true` (`variantDetector.ts`) | The most frequent execution path in a group; serves as the canonical reference for deviation measurement |
| **Deviation score** | `VariantDistanceResult.deviationScore` (`variantAnalyzer.ts`) | 0 = identical to canonical path, 1 = completely different; deviation < 0.15 = standard, > 0.50 = outlier |
| **Singleton** | A recording with `processGroupId = null` (`WorkflowRunRecord`) | A recording the engine could not assign to any process group |
| **Confidence band** | `ScoringConfidenceBand` | `verified` (≥ 0.90) / `high_confidence` (≥ 0.82) / `moderate_confidence` (≥ 0.70) / `low_confidence` (≥ 0.55) / `possible_match` |
| **Clustering model version** | `SCORING_MODEL_VERSION = '1.0.0'` | Semver string that must be captured on every clustering event to support version-based cohort analysis when the algorithm changes |
| **Intra-cluster similarity** | Mean `ClusteringScores.exactGroupScore` across all runs in a group | Proxy for precision — how well the assigned runs actually match each other |
| **User correction** | A merge, split, or "not the same process" action taken by the user on an auto-generated group | The inverse-quality signal: high correction rate = engine quality problem |

---

## 3. Clustering Quality Metrics (the hard part — no ground truth at runtime)

### 3.1 Intra-Cluster Similarity Score

**What it measures:** The mean `ClusteringScores.exactGroupScore` across all `WorkflowRunRecord` entries assigned to each `ProcessGroup`. This is the engine's own confidence expressed as a distribution across live data.

**Why it matters:** `exactGroupScore` is computed from 8 weighted signals (name similarity, start/end anchors, ordered step overlap, event overlap, system match, artifact similarity, intent similarity). A process group where the mean score is 0.85+ is well-formed. A group where the mean drops to 0.65 means the engine is grouping runs that do not strongly match — a precision proxy failure.

**Measurement approach:** Server-side, per grouping run. Compute the mean and p10 of `exactGroupScore` for every `ProcessGroup` after each materialization cycle. Log to the internal metrics table.

**Thresholds:**

| Signal | Action |
|---|---|
| Mean `exactGroupScore` ≥ 0.85 for ≥ 80% of groups | Green — engine operating in intended range |
| Any group with mean `exactGroupScore` < 0.75 and runCount ≥ 5 | Amber — flag for manual review; do not surface variation analysis for that group until score recovers |
| Any group with mean `exactGroupScore` < 0.65 | Red — treat as incorrect grouping; suppress from user-facing output; file quality incident |

**Dashboard:** Weekly chart of mean intra-cluster similarity distribution across all active groups, segmented by `confidenceBand`.

---

### 3.2 Singleton Rate

**What it measures:** The percentage of uploaded workflow recordings that end up with `processGroupId = null` — i.e., could not be assigned to any group.

**Why it matters:** A high singleton rate means the feature is providing no value for those recordings. It can indicate the clustering threshold is set too high (rejecting valid matches) or that users are recording genuinely one-off tasks. These are different problems requiring different responses.

**Formula:** `singleton_rate = count(WorkflowRunRecord where processGroupId IS NULL) / count(WorkflowRunRecord) × 100`

**Segmentation:** Break down by:
- User tenure cohort (new users in first 7 days tend to record exploratory one-offs)
- Recording count per user (users with < 3 recordings have structural singleton risk regardless of algorithm quality)
- `confidenceBand` distribution of the nearest-neighbor candidate that was rejected (i.e., what score would the singleton have gotten if the threshold were 10% lower)

**Target at ship:** Singleton rate ≤ 40% among users with ≥ 5 recordings. Among users with ≥ 10 recordings, singleton rate ≤ 25%.

**Decision:** If singleton rate among 10+ recording users exceeds 35% at 30 days post-launch, review the `exactGroupThresholds.minimum` (currently 0.82) for possible lowering to 0.78, pending a labeled hold-out validation (see §7).

---

### 3.3 Cluster Stability (Determinism Check)

**What it measures:** Whether re-running the grouping engine on an identical set of inputs produces identical group assignments. The engine is designed to be deterministic (sorted by `runId`, greedy first-match, no randomness in `variantDetector.ts`), but this must be verified in production because the inputs to each materialization run may include ordering side effects from concurrent writes.

**Measurement approach:** After each materialization run, re-run the engine on the same input set with the same `SCORING_MODEL_VERSION` and compare:
- Same process group IDs for each `WorkflowRunRecord.originalWorkflowId`
- Same `variantId` assignment for each run
- Same `standardPath` designation

Log a `clustering_stability_check_failed` internal event with a count of assignments that changed between runs. This is a pure engineering health check — it does not need a UI surface but must be in the monitoring pipeline.

**Target:** 100% stable — zero assignment changes between same-input re-runs. Any instability is a P0 correctness bug, not a metric to be tolerated.

**Note:** Changes that occur because new recordings were added between runs are NOT instability — those are legitimate group evolution events. The stability check must use a fixed input snapshot.

---

### 3.4 User Correction Rate (Primary Inverse-Quality Signal)

**What it measures:** The number of user-initiated corrections to auto-generated groups per 100 auto-generated groupings. Three correction types are tracked separately because they imply different engine failure modes:

- **Merge** — user asserts two groups are the same process (false negative: engine split what should be together)
- **Split** — user asserts runs in a group are not the same process (false positive: engine joined what should be separate)
- **Reject** — user marks a run as "not this process" from inside a group view without specifying the correct group

**Formula:** `correction_rate = (merges + splits + rejects) / auto_groups_presented × 100`

Where `auto_groups_presented` is the count of auto-generated groups the user has been exposed to (visible in the UI, not just computed in the backend).

**Target at ship:** User correction rate ≤ 15% per 100 auto-grouped recordings presented. Correction rate > 25% is a hard quality gate failure — halt further feature rollout and diagnose algorithm parameters.

**Segmentation by correction type:**
- Split rate > 10% alone indicates threshold is too loose (false positives dominating)
- Merge rate > 10% alone indicates threshold is too strict (false negatives dominating)
- Reject rate is the ambiguous signal — may indicate recordings that genuinely belong to no group, or edge cases in anchor matching

**Note on instrumentation:** The correction actions must be captured immediately on the client (events defined in §5 below) and linked to the `processGroupId` and `clustering_model_version` at the time of the correction so that quality can be tracked per algorithm version, not just globally.

---

### 3.5 Confidence Band Distribution

**What it measures:** The distribution of `ProcessGroup.confidenceBand` values across all active groups at any given time: `verified` / `high_confidence` / `moderate_confidence` / `low_confidence` / `possible_match`.

**Target:** At 30 days post-launch, ≥ 60% of groups with runCount ≥ 3 should be in `verified` or `high_confidence` bands. Groups in `low_confidence` or `possible_match` should be flagged in the UI with a "Needs review" indicator rather than surfaced as confident process identities.

**Decision:** If the distribution shows > 20% of groups in `low_confidence` or `possible_match` at 60 days, the scoring model requires recalibration — specifically examining which of the 8 `exactGroupWeights` signals are contributing least to verified groupings.

---

## 4. Variation-Insight Metrics

### 4.1 Variant Count Distribution

**What it measures:** For each process group, the number of distinct variants detected by `detectVariants()`. Distribution across all groups: % with 1 variant (no divergence observed), 2–3 variants, 4–5 variants, 6+ variants.

**Why it matters:** Groups with a single variant contain only the standard path — no divergence to show. Groups with 2–3 variants are where the variation view is most interpretable. Groups with 6+ variants may indicate a process with too many execution paths to be meaningfully analyzed (or a grouping that should be split).

**Target:** Among groups with runCount ≥ 5, ≥ 50% should show 2+ variants by 60 days. If < 30% show any variation at 30 days, either the `variantSimilarityThreshold` is set too loosely (merging distinct paths into one variant) or users are executing processes very consistently — both are different findings requiring different responses.

**Segmentation:** By `confidenceBand` (variation analysis is only meaningful for high-confidence groups), by runCount bucket (≥ 5 / ≥ 10 / ≥ 20 runs).

---

### 4.2 Standard Path Coverage Rate

**What it measures:** The percentage of runs in a group that are classified as following the standard path (`ProcessVariant.isStandardPath = true`). Expressed as `standardPath.frequency × 100`.

**Why it matters:** If 95%+ of runs follow the standard path, the variation view has low value — there is barely any variation to surface. If < 50% of runs follow the standard path, the "standard path" label may be misleading — users may be confused about which path is actually canonical.

**Target:** The useful range for surfacing variation insights is 50–90% of runs on the standard path. Groups where standard path coverage is > 95% should de-emphasize the variation view (e.g., show a "Consistent execution" summary rather than a full variant explorer).

**Presented metric in the UI:** `% runs on standard path` shown as a single number on the process group summary card. This is the primary "is there variation worth exploring?" signal for users.

---

### 4.3 Variation-View Engagement Depth

The variation view has four engagement levels, each representing a deeper commitment to using the insight:

| Level | Signal | Event |
|---|---|---|
| 1 — Section viewed | User opened the variation tab or section | `process_variation_viewed` |
| 2 — Branch clicked | User clicked on a specific variant in the diverge diagram | `process_variant_clicked` |
| 3 — Run drilled | User navigated from a variant to an individual run within it | `process_variant_run_drilled` |
| 4 — Comparison opened | User opened a side-by-side comparison of two variants | `process_variant_comparison_opened` |

**Target engagement depth funnel (among users who reach Level 1):**
- Level 2 engagement: ≥ 40% of Level 1 sessions
- Level 3 engagement: ≥ 20% of Level 1 sessions
- Level 4 engagement: ≥ 10% of Level 1 sessions

If the Level 2 rate is below 20%, the variant visualization is not communicating meaningful differences — either the diverge diagram is unclear or the variants are too similar to invite investigation.

---

### 4.4 Time-to-First-Variation-Insight

**What it measures:** Elapsed time from a user's first `process_variation_viewed` event to their first `process_variant_clicked` event within the same session. Expressed as p50 and p90.

**Why it matters:** This is the variation-view analog of the Time-to-First-Insight metric from `MEASUREMENT_PLAN_METRICS_ENGINE.md` §4 (NS-4). It measures whether the variation surface delivers value quickly or requires exploratory navigation before the user understands what they are looking at.

**Target:** p50 < 45 seconds from `process_variation_viewed` to `process_variant_clicked`. p90 < 120 seconds. If p50 > 90 seconds, the initial view of the variation surface is not communicating "here is a difference you should look at" effectively — the UX needs to surface the most significant deviation point prominently on first load.

---

### 4.5 Diverge-Reconverge View Engagement

The diverge→reconverge visualization is a specific sub-view that shows where a process execution path branches away from the standard path and where it returns to it. Engagement with this view is tracked separately from general variation engagement because it represents the highest-value insight surface.

**Metrics:**
- Sessions where the diverge-reconverge view is rendered per total variation sessions (`process_variation_diverge_reconverge_viewed`)
- Mean divergence point position (which step in the sequence is the most common divergence) — captured as `diverge_step_index` on the event
- Reconvergence rate: % of shown divergences that show a reconvergence point (i.e., the paths rejoin before the end of the process)

**Target:** ≥ 30% of variation sessions reach the diverge-reconverge view at 60 days.

---

## 5. North Star and Guardrail Metrics

### North Star: Variation-Insight Action Rate (VIAR)

**Definition:** Among users who view the variation analysis for a process group, the percentage who take a downstream action within the same session or within 48 hours of the session. Downstream actions are:

- Recording a new run of the same process (`workflow_uploaded` where the recording is assigned to the same `processGroupId`)
- Correcting a variant label or group name
- Sharing the variation view (`process_variation_shared`)
- Exporting or copying the divergence data

**Why this is the north star:** Variation analysis is only valuable if it changes behavior. A user who sees 3 variants and immediately records the same process again is using the insight to build a richer evidence base — that is the feedback loop the feature is designed to create. VIAR directly measures whether the insight is actionable, not just interesting.

**Baseline:** Not established. Capture for 14 days before making any targets (there is no v2 equivalent).

**Target:** VIAR ≥ 20% at 60 days post-launch. This means at least 1 in 5 variation views results in the user doing something with the insight.

**Events:** `process_variation_viewed` → (within 48h) → `workflow_uploaded` where `processGroupId` matches, OR `process_group_name_edited`, OR `process_variation_shared`.

---

### Activation Tie-In: Repeat Recording Rate by Grouping Status

**Definition:** Among users with at least one process group containing 3+ runs, the 14-day repeat recording rate (additional `workflow_uploaded` events) compared to users who have recordings but no formed process group.

**Hypothesis:** Users whose recordings cluster into a recognizable process group see more value in recording more runs of that process. Variation analysis makes the "what does another recording give me?" question answerable.

**Measurement:** Cohort comparison. Split users into:
- Cohort A: Has at least one process group with runCount ≥ 3
- Cohort B: Has recordings but no formed process group (all singletons)

Measure 14-day recording rate (uploads per active user per week) for each cohort.

**Target:** Cohort A 14-day recording rate ≥ 1.5× Cohort B. If this ratio is not observed at 60 days, the grouping feature is not creating the feedback loop needed to justify its build cost.

---

### Retention Tie-In: Grouped-Process Return Visit Rate

**Definition:** Among users who have viewed the variation analysis for a process group, the percentage who return to that same group's variation view within 7 days.

**Why it matters:** A single variation view could be a novelty visit. A return visit within 7 days indicates the user found the information useful enough to come back — either to track changes or to share with a colleague.

**Target:** ≥ 25% of variation-view users return to the same group's variation surface within 7 days.

---

### Guardrail Metrics

These monitor for regressions. A guardrail breach at or above the red threshold blocks the clustering feature from being promoted to GA regardless of north-star performance.

| Guardrail | Green | Amber | Red | Source |
|---|---|---|---|---|
| Clustering determinism | 100% stable | — | Any instability event | Server-side stability check (§3.3) |
| Mean intra-cluster similarity | ≥ 0.85 for ≥ 80% of groups | 0.75–0.85 for any group with N ≥ 5 | < 0.75 for any group with N ≥ 5 | Server-side per-group metric |
| User correction rate | ≤ 15% | 15–25% | ≥ 25% | Client events (§5 below) |
| Singleton rate (users with ≥ 5 recordings) | ≤ 40% | 40–60% | ≥ 60% | Server-side |
| Variation view p95 render time | ≤ 2.5s | 2.5–4s | ≥ 4s | Lighthouse CI / server timing |
| `api_error` rate on clustering endpoints | ≤ 0.5% | 0.5–1% | ≥ 1% | Existing `analytics.ts api_error` event |
| `client_error` rate in variation view | ≤ 0.3% | 0.3–0.7% | ≥ 0.7% | Existing `analytics.ts client_error` event |

---

## 6. Instrumentation: Analytics Event Definitions

All events below must be added to the `AnalyticsEvent` discriminated union in `apps/web-app/src/lib/analytics.ts` before any component fires them. Events follow the established conventions from the existing taxonomy: snake_case properties, no PII, no workflow content, no step labels, no URL paths beyond route templates.

The `clustering_model_version` property is required on every clustering-surface event. It captures `SCORING_MODEL_VERSION` from `scoringConfig.ts` at the time the surface rendered. This enables per-algorithm-version cohort analysis when the scoring model is bumped.

The `process_group_id` property is always an opaque server-assigned identifier — never the group name, workflow title, or any content derived from recorded steps.

---

### Grouping Surface Events

#### `process_group_viewed`

**Trigger:** User navigates to or opens the summary view for a specific process group. Fires once per navigation; does not re-fire on scroll.

**Decision:** Which process groups are users opening? At what confidence band? Do users preferentially open high-confidence groups (confirming quality) or investigate low-confidence groups (indicating they are reviewing engine output)?

```typescript
{
  event: 'process_group_viewed';
  process_group_id: string;           // opaque server ID — no content
  run_count: number;                  // runs in the group at time of view
  variant_count: number;              // variants detected at time of view
  confidence_band: 'verified' | 'high_confidence' | 'moderate_confidence' | 'low_confidence' | 'possible_match';
  singleton_runs_in_group: number;    // count of runs the engine was uncertain about
  clustering_model_version: string;   // SCORING_MODEL_VERSION e.g. '1.0.0'
  entry_point: 'library_row' | 'search' | 'notification' | 'direct_link';
  plan_tier: string;                  // from setUserPlanForAnalytics side-channel
}
```

---

#### `process_group_name_edited`

**Trigger:** User renames a process group (accepts or confirms a new name for an auto-generated group name).

**Decision:** How often are auto-generated group names rejected? High rename rate = auto-naming quality problem or user-preference signal.

```typescript
{
  event: 'process_group_name_edited';
  process_group_id: string;
  clustering_model_version: string;
  /** Was the auto-generated name accepted without modification before this rename? */
  had_prior_manual_name: boolean;
}
```

Note: the new name itself is NOT captured — it may contain business-sensitive process descriptions. Only the action and the group ID are tracked.

---

#### `process_group_merged`

**Trigger:** User merges two auto-detected groups into one (asserting they are the same process).

**Decision:** Merge events are false-negative signals. High merge rate among groups with similar confidence bands indicates the `exactGroupThresholds.minimum` should be lowered. Merge events should be reviewed weekly against the `clustering_model_version` to detect model regressions.

```typescript
{
  event: 'process_group_merged';
  source_group_id: string;            // the group being merged in
  target_group_id: string;            // the group receiving the merge
  source_confidence_band: 'verified' | 'high_confidence' | 'moderate_confidence' | 'low_confidence' | 'possible_match';
  target_confidence_band: 'verified' | 'high_confidence' | 'moderate_confidence' | 'low_confidence' | 'possible_match';
  /** Similarity score between the two groups at time of merge (from engine). */
  inter_group_similarity: number;
  clustering_model_version: string;
}
```

---

#### `process_group_split`

**Trigger:** User splits a process group into two separate groups (asserting that some runs are not the same process).

**Decision:** Split events are false-positive signals. High split rate indicates the threshold is too permissive. The `split_run_count` helps distinguish "splitting off 1 outlier" from "splitting a group roughly in half" — the latter indicates a more serious grouping error.

```typescript
{
  event: 'process_group_split';
  process_group_id: string;
  run_count_before_split: number;
  split_run_count: number;            // how many runs moved to the new group
  clustering_model_version: string;
  confidence_band: 'verified' | 'high_confidence' | 'moderate_confidence' | 'low_confidence' | 'possible_match';
}
```

---

#### `process_run_rejected_from_group`

**Trigger:** User removes a single run from a group by marking it "not this process" without specifying a new group.

**Decision:** Rejection events indicate runs at the edge of the cluster threshold. The `run_exact_group_score` helps distinguish "near-threshold edge case" from "clearly wrong assignment."

```typescript
{
  event: 'process_run_rejected_from_group';
  process_group_id: string;
  /** The run's exactGroupScore from ClusteringScores at the time it was assigned. */
  run_exact_group_score: number;
  clustering_model_version: string;
}
```

---

### Variant and Branch View Events

#### `process_variation_viewed`

**Trigger:** User opens or navigates to the variation/variants tab or section within a process group view. Fires once per view-entry; does not re-fire on scroll or tab switch within the same session.

**Decision:** What fraction of process group views progress to variation analysis? Entry-point distribution tells us whether users discover variation via structured navigation or direct linking.

```typescript
{
  event: 'process_variation_viewed';
  process_group_id: string;
  variant_count: number;
  /** Frequency of the standard path (0-1 from ProcessVariant.frequency). */
  standard_path_frequency: number;
  run_count: number;
  clustering_model_version: string;
  entry_point: 'group_view_tab' | 'insight_chip' | 'direct_link' | 'notification';
}
```

---

#### `process_variant_clicked`

**Trigger:** User clicks on a specific variant in the variant list or diverge diagram, expanding it or navigating to its detail.

**Decision:** Which variants attract investigation? `variant_rank` tells us whether users investigate the second-most-common variant (Variant 2, ranked by frequency) or go directly to outliers. `deviation_score` tells us whether users are attracted to small or large deviations.

```typescript
{
  event: 'process_variant_clicked';
  process_group_id: string;
  /** Rank by frequency within the group; 1 = most common (standard path). */
  variant_rank: number;
  /** 0 = identical to standard path, 1 = completely different. */
  deviation_score: number;
  /** 'standard' | 'minor' | 'major' | 'outlier' from VariantClassification. */
  deviation_classification: string;
  /** Frequency of this variant across all runs (0-1). */
  variant_frequency: number;
  run_count_in_variant: number;
  clustering_model_version: string;
}
```

---

#### `process_variant_run_drilled`

**Trigger:** User clicks through from a variant to view an individual run that belongs to that variant.

**Decision:** This is the deepest engagement level — the user wants to see what actually happened in a specific execution. High drill rate from major/outlier variants = users are using variation analysis for root-cause investigation.

```typescript
{
  event: 'process_variant_run_drilled';
  process_group_id: string;
  variant_rank: number;
  deviation_classification: string;
  /** Position in the variant's run list (1 = first listed run). */
  run_position_in_variant: number;
  clustering_model_version: string;
}
```

---

#### `process_variant_comparison_opened`

**Trigger:** User opens a side-by-side or step-diff comparison between two variants.

**Decision:** Comparison is the highest-effort engagement. Users who open comparisons are actively diagnosing process inconsistency, not just browsing.

```typescript
{
  event: 'process_variant_comparison_opened';
  process_group_id: string;
  /** Rank of the first variant in the comparison. */
  variant_a_rank: number;
  /** Rank of the second variant in the comparison. */
  variant_b_rank: number;
  /** Deviation score of the non-standard variant being compared. */
  deviation_score_b: number;
  clustering_model_version: string;
}
```

---

#### `process_variation_diverge_reconverge_viewed`

**Trigger:** User views the diverge→reconverge visualization within a variant or comparison view.

**Decision:** Adoption of the diverge-reconverge view specifically. If this view is rarely opened relative to `process_variant_clicked`, the navigation path to reach it is too deep or not visible enough.

```typescript
{
  event: 'process_variation_diverge_reconverge_viewed';
  process_group_id: string;
  /** Index of the step in the standard path where divergence begins. */
  diverge_step_index: number;
  /** Index of the step in the standard path where reconvergence occurs. -1 if no reconvergence. */
  reconverge_step_index: number;
  /** True if the paths rejoin before the end of the process. */
  has_reconvergence: boolean;
  clustering_model_version: string;
}
```

---

### Reporting Drill-Down Events

#### `process_variation_shared`

**Trigger:** User copies a shareable link to the variation view for a specific process group.

**Decision:** Sharing is the clearest signal of perceived value — the user thinks this is worth showing to someone else.

```typescript
{
  event: 'process_variation_shared';
  process_group_id: string;
  /** What level of the variation view was shared. */
  share_scope: 'group_summary' | 'variant_detail' | 'diverge_reconverge';
  clustering_model_version: string;
}
```

---

#### `process_group_export_triggered`

**Trigger:** User initiates an export of the process group's variation data (CSV, PDF, or copy to clipboard).

**Decision:** Export is the operational use signal — the user needs the data in another tool. High export rate = the variation insight is being used downstream in other workflows (documentation, process improvement, reporting).

```typescript
{
  event: 'process_group_export_triggered';
  process_group_id: string;
  export_format: 'csv' | 'pdf' | 'clipboard' | 'other';
  export_scope: 'summary' | 'all_variants' | 'specific_variant';
  clustering_model_version: string;
}
```

---

### 6.1 Events Excluded and Why

The following were considered and excluded:

- **`process_step_label_viewed`** — step labels contain recorded workflow content. Tracking which step labels are viewed would expose content that may contain PII or sensitive business process details. Excluded unconditionally.
- **`process_group_similarity_score_rendered`** — a page-load side effect, not a user action. The score is surfaced in the confidence band, which is tracked on `process_group_viewed`.
- **`process_variant_path_hover`** — hover events on path nodes are unreliable (mouse-over is not intent). Engagement is captured via `process_variant_clicked` and `process_variation_diverge_reconverge_viewed` instead.
- **`clustering_run_completed`** — this is a server-side operational event, not a product analytics event. It belongs in the internal metrics pipeline, not in the PostHog-forwarded `AnalyticsEvent` union.

---

## 7. Acceptance Gates: "Good Enough to Ship"

These are the minimum conditions that must be TRUE before the clustering and variation features are promoted from private beta to GA. Each gate maps to a specific metric defined above.

### Gate 1 — Clustering Determinism (Hard Gate)

**Condition:** Zero instability events across 14 consecutive days of production materialization.

**Measurement:** Server-side stability check (§3.3).

**Action if failed:** P0 correctness bug. No GA until resolved. Not negotiable.

---

### Gate 2 — Intra-Cluster Similarity Floor (Hard Gate)

**Condition:** ≥ 80% of process groups with runCount ≥ 3 have mean `exactGroupScore` ≥ 0.82 (`high_confidence` band or above).

**Measurement:** Server-side per-group metric, sampled over 14 days in beta.

**Action if failed:** Algorithm parameter review before GA. Specifically: examine the `exactGroupThresholds.minimum` (0.82 currently) and the weight distribution in `exactGroupWeights`. Do not lower the threshold without a labeled hold-out test (§8.1).

---

### Gate 3 — User Correction Rate (Hard Gate)

**Condition:** User correction rate (merge + split + reject combined) ≤ 15% per 100 auto-grouped recordings presented.

**Measurement:** Client events `process_group_merged`, `process_group_split`, `process_run_rejected_from_group`, normalized against count of process group views.

**Timeline:** Requires minimum 50 correction-eligible user sessions (users who have viewed at least one auto-generated group). This is likely achievable within 7–14 days of private beta with 10–20 beta users.

**Action if failed:** Do not proceed to GA. Analyze correction type distribution: if split-dominant, loosen threshold; if merge-dominant, tighten threshold. Re-validate with labeled hold-out before changing parameters.

---

### Gate 4 — Singleton Rate (Soft Gate, Reviewable)

**Condition:** Singleton rate ≤ 40% among beta users with ≥ 5 recordings.

**If failed:** Does not block GA, but requires a written explanation in the launch readiness artifact of why the singleton rate is high and what the remediation plan is. Acceptable explanations: "beta users are recording genuinely one-off tasks" (verify via interview), "sample size too small to form groups" (check recording counts), or "title normalization is not grouping close variants" (check `titleNormalizer.ts`).

---

### Gate 5 — Variation View Delivers Insight (Required for Variation Feature GA)

**Condition:** Among beta users who view the variation analysis for a group with 2+ variants (runCount ≥ 5), ≥ 30% engage at Level 2 or deeper (`process_variant_clicked` fires).

**Measurement:** `process_variant_clicked` / `process_variation_viewed` among qualifying groups.

**Action if failed:** The initial variation view is not communicating actionable differences. Revisit UX: surface the highest-`deviation_score` variant prominently on first load rather than requiring the user to navigate to it.

---

### Gate 6 — Instrumentation Coverage

**Condition:** All 11 event types defined in §6 have fired in production for at least 48 hours of beta usage. Confirmed via PostHog event list.

**Action if failed:** Roll back or hot-fix before GA. Same rule as `MEASUREMENT_PLAN_METRICS_ENGINE.md` §12 Gate 1.

---

## 8. Experiment Design

### 8.1 Labeled Hold-Out for Algorithm Quality Validation

**Purpose:** Establish ground truth for cluster precision and recall without relying on user corrections alone.

**Method:**

1. Select a set of 30–50 recordings from internal Ledgerium usage or from willing beta users who grant explicit permission for their recordings to be used in algorithm testing. These must be recordings where a human reviewer can determine the correct grouping (same process / different process).

2. Have 2 reviewers independently label each recording pair as: same process / different process / ambiguous. Compute inter-rater agreement (Cohen's kappa). Only use pairs where reviewers agree.

3. Run the clustering engine on the labeled set with `SCORING_MODEL_VERSION = '1.0.0'` and compare assignments against labels.

4. Compute:
   - **Proxy precision:** `correctly_grouped_pairs / all_grouped_pairs`
   - **Proxy recall:** `correctly_grouped_pairs / all_same_process_pairs_in_labeled_set`
   - **Singleton precision:** `correctly_left_ungrouped / all_singletons_produced`

5. Acceptance threshold: proxy precision ≥ 0.85 AND proxy recall ≥ 0.75. Below these thresholds, the `exactGroupThresholds` parameters require adjustment before GA.

**When to re-run:** Every time `SCORING_MODEL_VERSION` is bumped. The labeled set is the regression baseline for the algorithm.

**Privacy note:** Labeled recordings used in algorithm testing must be anonymized before any human reviewer sees them. Step labels, page titles, and any content fields must be stripped. Only structural signals (step count, event types, system names, duration) are reviewed.

---

### 8.2 Staged Rollout for Reporting Value Validation

**Purpose:** Validate that the variation-analysis surface drives the activation and retention behaviors hypothesized in §5 (north star, repeat recording rate, return visit rate) before investing in full feature build-out.

**Design:**

- **Stage 1 — Private beta (10–20 users, 14 days):** Full clustering and variation features enabled. Collect all events defined in §6. Primary objective: validate Gates 1–6 above. No control group needed at this stage — this is correctness verification, not causal attribution.

- **Stage 2 — Staged rollout (50% of eligible users, 30 days):** Enable clustering for a random 50% of users with ≥ 3 recordings. The other 50% see recordings as individual items without group assignment. Compare:
  - 14-day repeat recording rate (§5 activation tie-in) between groups
  - 7-day return visit rate between groups
  - User correction rate in the 50% group (confirms Gate 3 holds at larger scale)

  **Success condition:** Cohort with clustering enabled shows ≥ 1.5× repeat recording rate relative to control. If this does not hold at 30 days, the clustering feature is not creating the feedback loop and the variation-insight investment should be paused.

- **Stage 3 — GA (100% of users with ≥ 3 recordings):** Full rollout with all variation features. Monthly north-star (VIAR) tracking begins.

**Eligibility rule for rollout:** Clustering features activate only for users with ≥ 3 total recordings. Below this threshold, no meaningful group can form and the singleton rate would be structurally 100% — surfacing the feature early creates a bad first impression.

---

### 8.3 Variation View UX Experiment

**Purpose:** Test whether surfacing the highest-`deviation_score` variant prominently on first load of the variation view (rather than a ranked list starting with the standard path) improves Level 2 engagement.

**Hypothesis:** Users who see the most divergent variant first understand the variation surface faster and are more likely to click through (higher TTFVI, higher Level 2 rate).

**Control:** Variant list sorted by frequency descending (standard path first, then Variant 2, Variant 3...).

**Variant:** Variant list sorted by `deviation_score` descending for the first view, with the standard path pinned as a reference row (not Position 1).

**Primary metric:** `process_variant_clicked` rate within first 30 seconds of `process_variation_viewed`.

**Secondary metric:** `process_variant_run_drilled` rate within the session.

**MDE:** 10 percentage points on Level 2 engagement rate (from 40% target to 50%).

**Estimated sample size:** 80 users per arm (assumes 14-day run time with private beta scale; re-evaluate sample size at Stage 2).

**Note:** This experiment requires ≥ 2 variants per group to be meaningful. Exclude single-variant groups from the experiment population.

---

## 9. Dashboard Specification

### 9.1 Weekly Engineering Health Dashboard

Reviewed by engineering lead. Purpose: catch quality regressions before users do.

| Metric | Chart type | Threshold lines |
|---|---|---|
| Clustering stability events (should be 0) | Running count | Red at 1 |
| Mean intra-cluster similarity distribution | Box plot by confidence band | Amber at 0.75, red at 0.65 |
| Singleton rate (users with ≥ 5 recordings) | Line, 7-day rolling | Amber at 40%, red at 60% |
| User correction rate (7-day rolling) | Line | Amber at 15%, red at 25% |
| Split rate vs. merge rate (separate lines) | Dual line | Used to diagnose threshold direction |
| `api_error` rate on clustering endpoints | Line | Red at 1% |

---

### 9.2 Weekly Product Dashboard

Reviewed by PM and CEO. Purpose: track feature adoption and insight value.

| Metric | Chart type | Cadence |
|---|---|---|
| Process groups formed (cumulative and weekly new) | Area chart | Weekly |
| Variation view funnel (Level 1 → 2 → 3 → 4) | Step funnel | Weekly |
| VIAR (Variation-Insight Action Rate) | Line, 7-day rolling | Weekly |
| Repeat recording rate: grouped vs. ungrouped users | Dual line | Weekly |
| Time-to-first-variation-insight p50 / p90 | Line | Weekly |
| Diverge-reconverge view reach rate | % of variation sessions | Weekly |

---

### 9.3 Monthly Algorithm Performance Report

Reviewed by engineering lead and PM. Purpose: evaluate whether the algorithm is improving or degrading as the user base grows.

| Metric | Source | Action threshold |
|---|---|---|
| Confidence band distribution across all groups | Server-side | < 60% in verified + high_confidence → recalibrate |
| Correction rate by `clustering_model_version` | Client events | Any version with rate > 20% → investigate |
| Variant count distribution (1 / 2-3 / 4-5 / 6+) | Server-side | < 30% of groups with N ≥ 5 showing 2+ variants → review `variantSimilarityThreshold` |
| Standard path coverage distribution | Server-side | > 30% of groups with standard path coverage > 95% → variation surface has low value for those groups |
| Labeled hold-out precision / recall (re-run quarterly) | Internal testing | Any drop below 0.85 precision or 0.75 recall → algorithm review |

---

## 10. Integration with Existing Taxonomy

### 10.1 Events That Extend the Existing Union

All 11 events in §6 are new entries in the `AnalyticsEvent` union. They do not replace any existing events.

The following existing events are relevant to interpretation alongside the new events:

| Existing event | Relevance |
|---|---|
| `workflow_uploaded` | Used to compute repeat recording rate (§5 activation tie-in). No change needed. |
| `dashboard_v2_viewed` | Sessions without a subsequent `process_group_viewed` indicate users who are not yet exploring clustering. |
| `workflow_row_clicked` | Entry points into process group views often originate from workflow library row clicks. |
| `upgrade_clicked` | If plan-gating applies to variation analysis features (e.g., multi-variant comparison requires Team plan), track via existing `upgrade_clicked` with `location: 'process_variation_comparison'`. |

### 10.2 Schema Extension Rule

Same rule as `MEASUREMENT_PLAN_METRICS_ENGINE.md` §9.3: all events must be added to the `AnalyticsEvent` union in `apps/web-app/src/lib/analytics.ts` before any component fires them. TypeScript strict mode enforcement catches fires that miss the union.

### 10.3 Property Naming Conventions

Follows the existing analytics.ts conventions:
- All property keys: `snake_case`
- IDs: opaque string, never content-derived
- Numeric fields: raw numbers (not bucketed), unless cardinality risk exists (use buckets only for timestamps — express as ms)
- No field named `title`, `label`, `name`, `content`, `step`, `url`, `path`, or any property that could contain recorded workflow content

The `clustering_model_version` property is the version-tagging convention for this feature, paralleling the `SEGMENTATION_RULE_VERSION` and `NORMALIZATION_RULE_VERSION` pinning conventions in `packages/segmentation-engine` and `packages/normalization-engine`.

---

## 11. What This Plan Deliberately Does Not Include

- **Cluster labels or group names in any event.** Group names may contain business-sensitive process descriptions recorded from real user behavior. Only opaque IDs flow through analytics.
- **Step-level content.** The diverge-reconverge view shows step positions and deviation types (`substitution` / `insertion` / `deletion` / `reorder` from `DeviationPoint.deviationType`) but never the step label text. The `diverge_step_index` property captures position, not content.
- **Inter-user comparison.** This plan measures individual user behavior against their own process groups. Cross-user benchmarking is a Phase 2 concern requiring explicit opt-in and multi-tenant data density.
- **ML model attribution.** The clustering algorithm is deterministic (as verified by Gate 1 and §3.3). If a probabilistic model is introduced in a future version, this measurement plan must be revised to add model calibration metrics.

---

**End of MEASUREMENT_PLAN_PROCESS_VARIATION.md**
