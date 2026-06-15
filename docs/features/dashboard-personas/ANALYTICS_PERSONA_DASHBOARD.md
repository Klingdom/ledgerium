# Analytics Persona Dashboard Specification
**Date:** 2026-06-14
**Owner:** analytics agent
**Status:** Draft — source-cited from code audit 2026-06-14

---

## Purpose

Define the metric packs, dashboard view types, instrumentation plan, and honesty guardrails for three distinct audiences of the Ledgerium workflow library dashboard. All claims about what is computable are verified against source code. Fields marked `pending-path-c-r1` or `pending-path-c-r3` in the column registry are not available today and are called out explicitly.

---

## 1. Data Inventory

### 1.1 What Ledgerium Captures Per Step

Every recorded browser event carries a `page_context` object (schema: `packages/schema-events/src/canonical-event.schema.ts`):

| Field | Type | Notes |
|---|---|---|
| `url` | string | Raw URL |
| `urlNormalized` | string | Tracking params stripped by `normalizeUrl()` |
| `domain` | string | Hostname extracted by `extractDomain()` |
| `routeTemplate` | string | Path with IDs replaced by type tokens, e.g. `/records/:id/edit` |
| `pageTitle` | string | Browser document title at capture time |
| `applicationLabel` | string | Derived by `deriveApplicationLabel()` from the domain |
| `moduleLabel` | string? | Optional sub-module label (e.g. "CRM") |

Event types captured (from `CanonicalEventTypeSchema`):

- Navigation: `open_page`, `route_change`, `tab_activated`, `app_context_changed`
- Interaction: `click`, `select`, `input_change`, `submit`, `upload_file`, `download_file`, `keyboard_shortcut`, `drag_started`, `drag_completed`
- Workflow: `wait`
- System: `error_displayed`, `modal_opened`, `modal_closed`, `toast_shown`, `loading_started/finished`, `status_changed`, `redaction_applied`, `capture_blocked`, `window_blurred/focused`
- Session: `started`, `paused`, `resumed`, `stopped`, `annotation_added`
- Derived: `step_boundary_detected`, `activity_group_created`, `variant_detected`

**Key confirmation for the product/UX audience:** Ledgerium DOES capture `applicationLabel`, `pageTitle`, `routeTemplate`, and `domain` at each step. These are populated from the URL at capture time by the normalization engine. The `toolsUsed` field on a `Workflow` record is an aggregated JSON array of distinct `applicationLabel` values seen across a workflow's steps. This makes system/application identity a first-class, computable dimension.

### 1.2 Per-Workflow Fields Available Today

Source: `apps/web-app/src/app/api/workflows/route.ts` — enriched return object per workflow.

**Workflow-level identity and timing:**

| Field | Source | Notes |
|---|---|---|
| `id`, `title` | DB | Workflow entity |
| `createdAt` | DB | When the workflow was first recorded |
| `lastViewedAt` | DB | Last time the workflow record was viewed in the UI (not a true "last run" timestamp; see honesty note) |
| `processDefinitionUpdatedAt` | `ProcessDefinition.updatedAt` | Honest proxy for "last run" until Path C R+1 ships a per-run `lastRunAt` |
| `durationMs` | DB | Single-run total duration |
| `stepCount` | DB | Step count from single-run capture |
| `confidence` | DB | Extraction confidence (0–1) |
| `toolsUsed` | DB (JSON array) | Distinct application labels observed across the workflow |
| `tags` | DB | User-applied tags |
| `isFavorite` | DB | Favorite flag |
| `description` | DB | User-authored description |

**Computed per-workflow fields (available now):**

| Field | Computed by | What it measures |
|---|---|---|
| `variationScore` | `computeVariation()` in `workflow-metrics.ts` | 0–1; derived from `stabilityScore` (preferred), variant count, or confidence. Higher = more variation. |
| `variationLabel` | same | `low / medium / high` |
| `metricsV2.runs` | `computeRuns()` | Run count from `ProcessDefinition.runCount`; floor of 1 when single-run only |
| `metricsV2.avgTimeMs` | `computeAvgTimeMs()` | Avg duration: prefers `processDefinition.avgDurationMs`, falls back to `medianDurationMs`, then `durationMs` |
| `metricsV2.healthScore.overall` | `computeHealthScoreV2()` | 0–100 composite: speed 30 + consistency 30 + dataQuality 20 + standardization 20 |
| `metricsV2.healthScore.speed` | same | Duration conformance to 30s–30min ideal band |
| `metricsV2.healthScore.consistency` | same | `(1 - variationScore) × 30` |
| `metricsV2.healthScore.dataQuality` | same | `confidence × 20` |
| `metricsV2.healthScore.standardization` | same | SOP readiness + step count proxy |
| `metricsV2.opportunityTag` | `computeOpportunityTag()` | `automate / standardize / optimize / monitor / healthy` |
| `metricsV2.aiOpportunityScore` | `computeAiOpportunityScore()` | 0–100; factors step count, duration, tool count, optimization potential |
| `metricsV2.bottleneckLabel` | `computeBottleneckLabel()` | Title of highest-severity bottleneck/delay ProcessInsight; null if none |
| `metricsV2.variantCount` | `processDefinition.variantCount` | Distinct execution path count (from ProcessDefinition when available) |
| `sopReadiness` | `computeSopReadiness()` | `ready / partial / not_ready` — based on confidence + step count |
| `bottleneckRisk` | `computeBottleneckRisk()` | `high / medium / low / none` — based on step count and duration thresholds |
| `healthStatus` | `computeHealthStatus()` | `healthy / needs_review / high_variation / stale / new` |
| `processType` | `computeProcessType()` | Heuristic: `approval / review / exception_handling / data_collection / research / coordination / transaction / general` |
| `complexityScore` | `computeComplexityScore()` | 0–100; step count + system count + duration |
| `cognitiveBurdenScore` | `computeCognitiveBurdenScore()` | 0–100; process type + system switches + step count + duration |
| `processMaturityScore` | `computeProcessMaturityScore()` | 0–100; confidence + documentation + SOP readiness + stability + run frequency + freshness |
| `documentationCompleteness` | `computeDocumentationCompleteness()` | 0–100; description + tools + tags |
| `optimizationPotential` | `computeOptimizationPotential()` | `high / medium / low`; step count + duration + confidence |
| `isStale` | `computeIsStale()` | Boolean; created >30 days ago AND viewed >14 days ago |
| `processDefinition.stabilityScore` | DB | Fraction of runs following the dominant variant (0–1) |
| `processDefinition.confidenceScore` | DB | Confidence from process definition analysis |
| `processDefinition.variantCount` | DB | Number of observed execution variants |
| `processDefinition.runCount` | DB | Total run count |

**Portfolio-level (stats object) available now:**

| Field | Meaning |
|---|---|
| `portfolioHealthScore` | Mean `healthScore.overall` across all workflows |
| `portfolioHealthScoreDelta` | Period-over-period delta (30-day prior window) |
| `medianCycleTimeMs` | Median of `metricsV2.avgTimeMs` across workflows |
| `opportunityCounts` | Count by opportunity tag (`automate / standardize / optimize / monitor / healthy`) |
| `healthBandCounts` | Count of workflows in health bands (e.g., 70–100, 40–69, 0–39) |
| `activityByWeek` | 12-week trailing recording cadence (workflows created per week) |
| `systemCoverage` | Array of `{ system: string, workflowCount: number }` — distinct apps + how many workflows use each |
| `aiOpportunityCount` | Workflows tagged `automate` |
| `avgCognitiveBurden` | Mean cognitive burden score |
| `avgMaturity` | Mean process maturity score |
| `highCognitiveBurdenCount` | Workflows with `cognitiveBurdenScore >= 60` |
| `insightChips` | Up to 5 actionable chips: high variance / bottleneck / automation candidates / needs review / healthy |
| `needsReview` | Workflows in `needs_review` or `high_variation` health status |
| `sopReady` | Workflows with `sopReadiness === 'ready'` |
| `staleCount` | Workflows meeting stale criteria |

**Intelligence engine outputs (available when multiple runs analyzed):**

From `packages/intelligence-engine/src/types.ts` — `PortfolioIntelligence`:

| Sub-output | Key fields |
|---|---|
| `metrics` (ProcessMetrics) | `runCount`, `completedRunCount`, `completionRate`, `errorStepFrequency`, `navigationStepFrequency`, `medianDurationMs`, `meanDurationMs`, `p90DurationMs`, `minDurationMs`, `maxDurationMs`, `medianStepCount`, `meanStepCount`, `uniqueSystems` |
| `timestudy` (TimestudyResult) | Per-step-position: `meanDurationMs`, `medianDurationMs`, `minDurationMs`, `maxDurationMs`, `p90DurationMs`, `stdDevMs`, `category`, `runCount` |
| `variance` (VarianceReport) | `durationVariance.stdDevMs`, `durationVariance.coefficientOfVariation`, `durationVariance.isHighVariance`, `stepCountVariance.stdDev`, `sequenceStability`, `highVarianceSteps` (per-position CoV, mean, stdDev) |
| `variants` (VariantSet) | `variantCount`, `standardPath.frequency`, per-variant `runCount`, `frequency`, `similarityToStandard` |
| `bottlenecks` (BottleneckReport) | Per-bottleneck: `position`, `category`, `meanDurationMs`, `durationRatio`, `isHighDuration`, `isHighVariance`, `coefficientOfVariation` |
| `drift` (DriftReport, optional) | `driftDetected`, `driftSignals` (type, severity, baseline vs current value, change%) |
| `standardPath` | `frequency` (fraction of runs following standard path), `pathSignature.stepCategories` |

**Step categories available from segmentation** (GroupingReason values — these appear in timestudy positions):

`click_then_navigate`, `fill_and_submit`, `single_action`, `action_button_click`, `spa_route_change`, `idle_gap`, `multi_domain_transition`, `error_recovery`, `annotation` — all using GroupingReason enum, not raw text.

### 1.3 What Is NOT Yet Available (Pending Path C R+1 or R+3)

These are in the column registry with `availability: 'pending-path-c-r1'` or `'pending-path-c-r3'`:

| Metric | Availability | Blocker |
|---|---|---|
| `throughput_time_ms` | pending-path-c-r1 | Requires per-run persistence in `metric_fact` table |
| `completion_rate_pct` | pending-path-c-r1 | Requires run-status tracking per run |
| `arrival_rate_per_day` | pending-path-c-r1 | Requires per-run timestamp table |
| `completion_rate_per_day` | pending-path-c-r1 | Same |
| `cycle_time_median_ms` | pending-path-c-r1 | Requires `processDefinition.medianDurationMs` surfaced to registry |
| `cycle_time_p95_ms` | pending-path-c-r1 | Requires per-run distribution |
| `avg_step_duration_ms` | pending-path-c-r1 | Requires `metric_fact` table |
| `median_step_duration_ms` | pending-path-c-r1 | Same |
| `step_frequency` | pending-path-c-r1 | Same |
| `step_error_rate_pct` | pending-path-c-r1 | Same |
| `variant_count` (registry column) | pending-path-c-r1 | Raw int computable today via `processDefinition.variantCount` but not yet wired in registry accessor |
| `top_variant_share_pct` | pending-path-c-r1 | Requires `intelligence.standardPathFrequency` wired to registry |
| `path_length_avg` | pending-path-c-r1 | Requires `metric_fact` |
| `path_length_stddev` | pending-path-c-r1 | Requires `metric_fact` |
| `path_similarity_avg` | pending-path-c-r1 | Requires `intelligence.sequenceStability` wired to registry |
| `error_rate_pct` | pending-path-c-r1 | Requires per-run error step count |
| `exception_rate_pct` | pending-path-c-r1 | Same |
| `failure_rate_pct` | pending-path-c-r1 | Requires per-run terminal status |
| `abandonment_rate_pct` | pending-path-c-r1 | Same |
| `clicks_per_run` | pending-path-c-r1 | Requires `metric_fact` |
| `actions_per_run` | pending-path-c-r1 | Same |
| `avg_action_duration_ms` | pending-path-c-r1 | Same |
| `application_switch_rate` | pending-path-c-r1 | Requires adjacent-boundary counting per run |
| `data_entry_time_ms` | pending-path-c-r1 | Requires step-category duration summing |
| `navigation_overhead_pct` | pending-path-c-r1 | Same |
| `is_bottleneck_step` | pending-path-c-r3 | Requires `process_run_snapshot` grain |
| `is_high_variance_step` | pending-path-c-r3 | Same |
| `max_wait_step_id` | pending-path-c-r3 | Same |

---

## 2. Per-Persona Metric Packs and Dashboard Type

### 2.1 Persona A — Lean Six Sigma Belts (Yellow, Green, Black)

**What they need:** Quantified variation, cycle time distribution, bottleneck identification, defect/error proxies, value-add analysis, and a path to Pareto ranking by waste category. They understand sigma levels, control charts, and DMAIC phases.

**Computable metric pack (today):**

| Metric | Source | LSS Relevance |
|---|---|---|
| Mean cycle time | `metricsV2.avgTimeMs` | Primary process metric |
| Variation score (0–1) | `metricsV2.variationScore` | Proxy for sigma level — low variation = capable process |
| Variation label | `metricsV2.variationLabel` | Low / medium / high classification |
| Step count | `workflow.stepCount` | Process length; longer = more opportunities for waste |
| Variant count | `processDefinition.variantCount` | Distinct execution paths = rework/non-standard routes |
| Sequence stability | `intelligence.variance.sequenceStability` | Fraction following standard path = process capability proxy |
| Bottleneck label | `metricsV2.bottleneckLabel` | Highest-severity delay step name |
| Bottleneck position + duration ratio | `intelligence.bottlenecks.bottlenecks[].durationRatio` | Step consuming disproportionate time |
| Step CoV (per position) | `intelligence.timestudy.stepPositionTimestudies[].stdDevMs / mean` | Variance hotspot at step grain |
| Error step frequency | `intelligence.metrics.errorStepFrequency` | Mean `error_handling` steps per run — defect proxy |
| Navigation step frequency | `intelligence.metrics.navigationStepFrequency` | Non-value-add navigation burden |
| Completion rate | `intelligence.metrics.completionRate` | Throughput efficiency |
| Duration stdDev | `intelligence.variance.durationVariance.stdDevMs` | Spread of cycle times |
| Duration CV | `intelligence.variance.durationVariance.coefficientOfVariation` | Relative variability (comparable across workflows) |
| Total duration stats | `intelligence.timestudy.totalDuration` (mean, median, min, max, p90, stdDev) | Full distribution shape |
| Health score — consistency sub-score | `metricsV2.healthScore.consistency` | 0–30; (1 - variationScore) × 30 |
| Opportunity tag | `metricsV2.opportunityTag` | Standardize = high variation present |
| High variance steps | `intelligence.variance.highVarianceSteps` | Steps exceeding CV threshold |
| Drift signals | `intelligence.drift.driftSignals` | Structural / timing / exception rate drift vs baseline |
| Per-step timestudy | `intelligence.timestudy.stepPositionTimestudies` | Step-level mean, median, p90, stdDev by ordinal position |

**Recommended dashboard type:** Analytical — charts + ranked tables

Specific views:
- **Pareto view:** Workflows ranked by variation score descending; bar chart of `metricsV2.variationScore` per workflow. Identifies the 20% of processes responsible for 80% of variation. Computable today.
- **Step timestudy table:** For a selected workflow with multiple runs — per-position mean / median / p90 / stdDev durations from `intelligence.timestudy.stepPositionTimestudies`. Computable when ≥2 runs exist for the workflow.
- **Consistency distribution histogram:** Bucket workflows by `metricsV2.healthScore.consistency` (0–30 in 5-point bands). Shows portfolio-level spread of process capability.
- **Bottleneck stack chart:** For a selected workflow, bar chart of mean step duration by ordinal position from the timestudy; bottleneck steps highlighted by `durationRatio >= threshold`. Computable when ≥2 runs exist.
- **Drift comparison panel:** When baseline runs provided to the intelligence engine, show before/after mean cycle time, completion rate, and exception rate. Computable from `intelligence.drift.driftSignals`.

### 2.2 Persona B — Process Documentation / Best-Path Teams

**What they need:** Which variant is the standard path, how frequently it is followed, where the process deviates, and whether documentation (SOP readiness) reflects what actually happens. Also: are captured workflows complete enough to produce a baseline?

**Computable metric pack (today):**

| Metric | Source | Documentation Relevance |
|---|---|---|
| Variant count | `processDefinition.variantCount` | How many distinct execution paths exist |
| Standard path frequency | `intelligence.variants.standardPath.frequency` | Fraction of runs following best-path |
| Sequence stability | `intelligence.variance.sequenceStability` | Fraction following standard path by signature match |
| Standard path step categories | `intelligence.standardPath.pathSignature.stepCategories` | Ordered step type sequence |
| Per-variant frequency | `intelligence.variants.variants[].frequency` | How common each deviation is |
| Variant similarity to standard | `intelligence.variants.variants[].similarityToStandard` | How different deviations are |
| Step count (median) | `intelligence.metrics.medianStepCount` | Typical process length |
| Run count | `metricsV2.runs` | Evidence volume behind the baseline |
| SOP readiness | `workflow.sopReadiness` (`ready / partial / not_ready`) | Documentation completeness proxy |
| Documentation completeness | `workflow.documentationCompleteness` (0–100) | Description + tools + tags proxy |
| Confidence | `workflow.confidence` | Extraction reliability |
| Health score — standardization | `metricsV2.healthScore.standardization` | 0–20; SOP readiness + step count proxy |
| Data quality sub-score | `metricsV2.healthScore.dataQuality` | 0–20; confidence-based |
| Process maturity score | `workflow.processMaturityScore` | 0–100 composite of confidence + docs + SOP + stability + freshness |
| Error step frequency | `intelligence.metrics.errorStepFrequency` | Steps where users encounter errors — may need documentation coverage |
| Annotation text | `CanonicalEvent.annotation_text` on `session.annotation_added` events | Free-text context added during recording |

**Recommended dashboard type:** Process detail panel + portfolio list

Specific views:
- **Variant summary card:** For a selected workflow: run count, standard path frequency, variant count, sequence stability. One row per variant with frequency and similarity score. Computable when ≥2 runs; graceful "single run" state when only 1 run.
- **Best-path step sequence:** Ordered list of step categories from `intelligence.standardPath.pathSignature.stepCategories` annotated with mean duration from the timestudy. Shows the canonical process flow with actual timing. Computable when ≥2 runs.
- **SOP readiness matrix:** Portfolio list sorted by `processMaturityScore` ascending. Highlights workflows in `not_ready` sopReadiness that have high run counts — processes with evidence but no documentation. Computable today.
- **Deviation table:** List of variant paths with `frequency`, `similarityToStandard`, and the step categories that differ from the standard. Requires intelligence engine output per workflow.

### 2.3 Persona C — Product / UX Teams (Understanding What Users Do in Browser Apps)

**What they need:** Which applications/tools are involved, which pages or routes are visited during recorded workflows, how often each system appears, and what the actual behavior pattern is across PeopleSoft / Workday / SaaS tools. This is the audience that needs the product-level view: "what are users doing in the app?"

**Confirmed captured data for this persona:**

- `page_context.applicationLabel` — per event: the named application (e.g., "Workday", "Salesforce", "PeopleSoft"). Derived from domain by `deriveApplicationLabel()`.
- `page_context.routeTemplate` — per event: the page route with IDs normalized (e.g., `/procurement/po/:id/review`).
- `page_context.pageTitle` — per event: the browser document title.
- `page_context.domain` — per event: the hostname.
- `page_context.moduleLabel` — optional per event: sub-module within an app.
- `workflow.toolsUsed` — workflow level: JSON array of distinct `applicationLabel` values observed across the workflow. This is the already-aggregated "systems" field surfaced on every workflow row today.
- `stats.systemCoverage` — portfolio level: `{ system: string, workflowCount: number }[]` — distinct apps and how many workflows involve them.

**What is NOT captured at step level (honesty):** Individual step-to-page mapping is not surfaced in the current dashboard UI or intelligence engine output. The step categories (GroupingReason values like `click_then_navigate`, `fill_and_submit`) are generated from event type sequences, not from `routeTemplate` or `pageTitle`. The intelligence engine's `StepPositionTimestudy` uses `category` (a GroupingReason), not the page context of each step. Page/route frequency analysis would require joining `CanonicalEvent.page_context` to step boundaries — the data exists in the captured events but is not aggregated by the current pipeline.

**Computable metric pack (today, from existing fields):**

| Metric | Source | Product/UX Relevance |
|---|---|---|
| Systems used per workflow | `workflow.toolsUsed` (parsed array) | Application portfolio per process |
| System count per workflow | `processDefinition` length of `toolsUsed` | How many apps the process touches |
| System-level workflow coverage | `stats.systemCoverage` | Which apps appear in the most workflows |
| System count per run | `system_count_per_run` (available in registry) | Mean distinct systems per run |
| Application switch rate | `application_switch_rate` (pending-path-c-r1) | Context switches between apps |
| Cognitive burden score | `workflow.cognitiveBurdenScore` | Proxy for user effort, driven by system count + process type + duration |
| Process type | `workflow.processType` | Heuristic category from description + tool count |
| Mean cycle time | `metricsV2.avgTimeMs` | How long users spend per process |
| Navigation step frequency | `intelligence.metrics.navigationStepFrequency` | Mean navigation.route_change events per run — page transitions |
| Error step frequency | `intelligence.metrics.errorStepFrequency` | Error_handling events per run — user friction signal |
| Step count | `workflow.stepCount` | Process length |
| Distinct applications across portfolio | `stats.systemCoverage[].system` | Full application inventory |

**Recommended dashboard type:** Usage explorer — bar charts + filterable application-centric list

Specific views:
- **Systems usage bar chart:** Bar chart of `stats.systemCoverage` — applications sorted by `workflowCount` descending. Shows which tools appear most across recorded workflows. Computable today from `extractSystems()` already running in the route handler.
- **Application-filtered workflow list:** Filter the workflow list by `toolsUsed` contains `[app name]` — already supported by `toolFilter` query parameter in the route. Allows a product team to see all workflows that touch Workday, PeopleSoft, etc.
- **Cognitive burden distribution:** Histogram of `cognitiveBurdenScore` (0–100) across workflows, segmented by `processType`. Shows which process types create the most user burden. Computable today.
- **Cross-app process map (future):** When step-level page_context is aggregated per step position, show the application sequence per workflow variant (e.g., step 1: Workday / step 2: Outlook / step 3: ServiceNow). This is computable from captured event data but requires a new aggregation pipeline joining events to step boundaries. Not a current route output.

---

## 3. New Reporting Views Per Persona (Computable Now vs. Later)

### Persona A — LSS: New Views

| View | Computable now? | Data required | Notes |
|---|---|---|---|
| Pareto chart of variation by workflow | Yes | `metricsV2.variationScore` per workflow | Sort descending; standard 80/20 view |
| Consistency distribution histogram | Yes | `metricsV2.healthScore.consistency` per workflow | Bucket by 5-point bands |
| Portfolio-level CoV trend | Yes (static) | `intelligence.variance.durationVariance.coefficientOfVariation` per workflow | No time series yet; snapshot only |
| Step-level timestudy table | Yes, when ≥2 runs | `intelligence.timestudy.stepPositionTimestudies` | Per-workflow detail view |
| Bottleneck Pareto (by step position) | Yes, when ≥2 runs | `intelligence.bottlenecks.bottlenecks[].durationRatio` | Steps sorted by durationRatio |
| Control-chart-style cycle time scatter | Yes, when ≥3 runs | `intelligence.metrics` min/mean/max/stdDev | Points ± 3σ boundaries; individual runs require Path C R+1 |
| Error rate column / filter | Yes | `intelligence.metrics.errorStepFrequency` | Non-zero = rework/defect signal |
| Value-add ratio | No (see honesty §4) | Would need V/NVA step classification | No classification model exists |
| DPMO / sigma level | No (see honesty §4) | Would need defect definition and opportunity count | Not defined in current schema |

### Persona B — Documentation: New Views

| View | Computable now? | Data required | Notes |
|---|---|---|---|
| Variant summary panel | Yes, when ≥2 runs | `intelligence.variants` | Standard path + deviations |
| Best-path step sequence with timing | Yes, when ≥2 runs | `intelligence.standardPath` + `intelligence.timestudy` | Ordered step categories + mean durations |
| SOP readiness matrix (portfolio) | Yes | `sopReadiness`, `processMaturityScore`, `runCount` | Sort by maturity ascending to find under-documented high-evidence processes |
| Run evidence progress indicator | Yes | `metricsV2.runs` | "1 of 5 runs needed for full analysis" |
| Standard path drift alert | Yes, when baseline provided | `intelligence.drift.driftSignals` where `driftType === 'structural'` | Alerts when the dominant path sequence changes |
| Free-text step name in sequence | Partially | `CanonicalEvent.target_summary.label` | Privacy policy may redact; use category labels instead |

### Persona C — Product/UX: New Views

| View | Computable now? | Data required | Notes |
|---|---|---|---|
| Systems usage bar chart | Yes | `stats.systemCoverage` | Already computed in route handler |
| Application-filtered workflow list | Yes | `toolFilter` param in route | Already supported |
| Per-workflow system badge list | Yes | `workflow.toolsUsed` (parsed array) | Already shown in "Systems" column |
| Cognitive burden by process type | Yes | `cognitiveBurdenScore`, `processType` | Group by processType, mean burden per type |
| Navigation frequency column | Yes, when ≥2 runs | `intelligence.metrics.navigationStepFrequency` | Mean page transitions per run |
| Page/route inventory per workflow | Not yet | Would need step-level `routeTemplate` aggregation | Data captured per event; not aggregated to step or workflow grain in current pipeline |
| Feature/page heatmap across workflows | Not yet | Same — step-level page_context join needed | Requires new aggregation endpoint |
| App-to-app transition matrix | Not yet | Requires adjacent-step application comparison | `application_switch_rate` is pending-path-c-r1 |

---

## 4. Honesty Guardrails

The following metrics may be tempting to display but cannot honestly be computed from what is currently captured or classified.

### 4.1 Value-Add Ratio

**Cannot show.** A value-add / non-value-add (VA/NVA) ratio requires classifying each step as value-adding (transforms the product/service), non-value-adding but required (regulatory, wait), or waste. Ledgerium captures step categories such as `fill_and_submit`, `click_then_navigate`, `error_recovery`, and `idle_gap`. The `idle_gap` category is a genuine non-value-add proxy, and `error_recovery` is a rework proxy, but these are partial signals. No model in the current codebase classifies steps as VA/NVA/waste. Displaying a "VA%" number would fabricate a classification that has not been made.

**What to show instead:** Navigation step frequency (non-value-add navigation burden), error step frequency (rework proxy), idle step count (delay proxy). Label these explicitly as proxies, not as "value-add ratio."

### 4.2 DPMO / Sigma Level

**Cannot show.** Calculating defects per million opportunities (DPMO) and converting to a sigma level requires (a) a precise definition of what constitutes a defect for each workflow, (b) the count of opportunities per unit. Neither is defined in the schema or the workflow model. `errorStepFrequency` is a count-per-run of `error_handling`-categorized steps — it is a defect proxy, not a DPMO count. The process type and step category do not define "opportunity."

**What to show instead:** Error step frequency (mean `error_handling` steps per run), exception rate (when Path C R+1 ships `exception_rate_pct`), variation score as a process capability proxy.

### 4.3 "Last Run" Timestamp

**Cannot show as precise.** The `last_run_at` registry column uses `ProcessDefinition.updatedAt` as a proxy (introduced in the current route handler as `processDefinitionUpdatedAt`). This records when the process definition record last changed, not a per-run timestamp. A true per-run `lastRunAt` requires Path C R+1 (`process_run_snapshot` table).

**What to show:** Label the column "Last Activity" or "Last Updated" until Path C R+1 ships. The code comment in `route.ts` at line 533 states this explicitly.

### 4.4 Feature Usage / "Which Features Were Used in the App"

**Cannot show from current pipeline.** While `routeTemplate` and `pageTitle` are captured per event, the current intelligence engine and route handler do not aggregate page/route frequency per workflow or per step position. `toolsUsed` gives the application list but not which pages within that application. The data is present in raw captured events, but no aggregation endpoint exists to produce "users visited /procurement/po/:id/review N times across M workflows" as a queryable metric.

**What to show now:** Application-level coverage (`stats.systemCoverage`). Label it "which applications are involved in workflows" — not "which features or pages users visit." The more granular view requires a new aggregation pipeline.

### 4.5 Per-Step Page Context in Intelligence Engine

**Not yet available.** The intelligence engine's `StepPositionTimestudy` records `category` (a GroupingReason like `fill_and_submit`) at each position — not the `routeTemplate` or `applicationLabel` of the underlying events. Steps are privacy-safe by design: they use categories, not free text or URLs. Surfacing page identity per step position would require extending the intelligence engine's step position analysis to include the majority `applicationLabel` and `routeTemplate` at each position. This is architecturally feasible but is not implemented.

### 4.6 Throughput vs. Cycle Time (Terminology)

**Do not equate.** The registry notes `throughput_time_ms` as distinct from `cycle_time_ms`, noting "Diverges from Cycle Time only at sub-process grain." At the workflow grain Ledgerium currently captures, cycle time (run end minus run start) is what is measured. Throughput time (end-to-end including wait times in a system) is a related but different concept that requires per-run timestamps in the `metric_fact` table (Path C R+1). Until then, use "cycle time" only. Do not display a metric labeled "throughput time" using `avgTimeMs` data.

---

## 5. Event Instrumentation to Measure Which Lens Gets Used

To understand which persona's views are being used and which metrics drive decisions, the following events should be added to the analytics taxonomy.

**Proposed new events (additions to `AnalyticsEvent` discriminated union in `apps/web-app/src/lib/analytics.ts`):**

```
persona_lens_viewed
  lens: 'lss' | 'documentation' | 'product_ux' | 'default'
  workflowCount: number
  — fires when a user explicitly switches to a persona-oriented view tab or preset

dashboard_pareto_opened
  workflowCount: number
  sortedBy: 'variation_score' | 'cycle_time' | 'error_rate'
  — fires when the LSS Pareto view is opened

step_timestudy_viewed
  workflowId: string
  runCount: number
  hasBottleneck: boolean
  — fires when the per-step timestudy panel is opened for a workflow

variant_summary_viewed
  workflowId: string
  variantCount: number
  standardPathFrequency: number
  — fires when the variant/documentation summary panel is opened

system_usage_chart_viewed
  systemCount: number
  topSystem: string
  — fires when the systems usage bar chart is rendered/scrolled into view

workflow_filter_applied
  filterType: 'system' | 'process_type' | 'health_status' | 'opportunity_tag' | 'sop_readiness'
  filterValue: string
  resultCount: number
  — fires when a filter is applied from any persona view

column_picker_persona_preset_applied
  presetId: string
  columnCount: number
  — fires when a persona-specific column preset is selected (e.g., "LSS View", "Documentation View")
```

**Measurement questions these events answer:**

- What fraction of users open the timestudy panel vs. just reading the list? (`step_timestudy_viewed` / sessions)
- Do LSS users engage with the Pareto view? (`dashboard_pareto_opened`)
- Which systems are users filtering by most? (`workflow_filter_applied` where `filterType === 'system'`)
- Which persona column preset is most used? (`column_picker_persona_preset_applied`)
- Does viewing the variant summary correlate with SOP readiness improvement over time? (variant_summary_viewed → sopReadiness changes)

---

## 6. P0 to P2 Analytics Additions

### P0 — Required to make the dashboard useful for these personas at all

| Item | What | Why P0 |
|---|---|---|
| P0-1 | Surface `intelligence.metrics.errorStepFrequency` and `navigationStepFrequency` in the workflow detail panel | LSS and product/UX need per-workflow error and navigation frequency; these fields are computed by the intelligence engine but not currently surfaced in the route response to the UI |
| P0-2 | Surface `intelligence.timestudy.stepPositionTimestudies` in a per-workflow detail endpoint or expandable row panel | Without per-step timing, the LSS timestudy view cannot be built. The intelligence engine produces this data; it is not currently returned by the `/api/workflows` route |
| P0-3 | Surface `intelligence.variants` (variant count, standard path frequency, per-variant frequency) in a per-workflow detail panel | Documentation persona needs this to build the variant summary view. `processDefinition.variantCount` is returned but not the per-variant breakdown |
| P0-4 | `system_count_per_run` column accessor is wired in the registry (`available`); confirm it is rendered in the picker and visible to users | This is the key metric for the product/UX systems analysis |

### P1 — Significant value, buildable before Path C

| Item | What | Why P1 |
|---|---|---|
| P1-1 | Persona column presets in the preset chip rail: "LSS View" (variation, bottleneck, error frequency, cycle time stats), "Documentation View" (variant count, standard path %, SOP readiness, maturity score), "Systems View" (systems, system count per run, cognitive burden, process type) | Presets make the column picker persona-aware without requiring new data |
| P1-2 | Pareto sort in the workflow list: sort by `variationScore` descending with a visible rank column | One-click LSS prioritization view; no new data required |
| P1-3 | Systems usage bar chart widget in the top-of-page band | `stats.systemCoverage` is already computed; building the chart is a UI iteration |
| P1-4 | Per-workflow variant summary slide-in panel | Route needs to return `intelligence.variants` data for the selected workflow; intelligence engine already produces it |
| P1-5 | `dashboard_pareto_opened`, `step_timestudy_viewed`, `variant_summary_viewed`, `system_usage_chart_viewed` event instrumentation | Measures persona engagement before building more views |

### P2 — High value, depends on Path C R+1 or new aggregation work

| Item | What | Dependency |
|---|---|---|
| P2-1 | Step-level page/route aggregation: aggregate `page_context.routeTemplate` and `applicationLabel` to step position in the intelligence engine | New intelligence engine extension; data exists in events but not wired to step positions |
| P2-2 | Application sequence per variant: "step 1 in Workday → step 2 in Outlook → step 3 in ServiceNow" | Requires P2-1 plus variant-to-step mapping |
| P2-3 | `exception_rate_pct`, `step_error_rate_pct` columns | Path C R+1 `metric_fact` table required |
| P2-4 | `variant_count` (registry), `top_variant_share_pct`, `path_similarity_avg` columns wired with accessors | Path C R+1 — `intelligence.sequenceStability` and `variants.standardPath.frequency` are already in `WorkflowMetricsInput.intelligence` but registry accessors not yet wired |
| P2-5 | Per-step bottleneck flag (`is_bottleneck_step`) | Path C R+3 `process_run_snapshot` grain |
| P2-6 | True `lastRunAt` per workflow | Path C R+1 per-run timestamp |
| P2-7 | `application_switch_rate` column | Path C R+1 adjacent-step comparison aggregation |

---

## Source References

| Claim | Source file(s) |
|---|---|
| `page_context` fields captured per event | `packages/schema-events/src/canonical-event.schema.ts` lines 48–56 |
| `applicationLabel` derivation from domain | `packages/normalization-engine/src/index.ts` exports `deriveApplicationLabel` |
| `toolsUsed` as aggregated applicationLabel array | `apps/web-app/src/app/api/workflows/route.ts` lines 449–456 |
| `systemCoverage` computation | `apps/web-app/src/app/api/workflows/route.ts` lines 271–293 (extractSystems) and 671 |
| Per-workflow enriched fields | `apps/web-app/src/app/api/workflows/route.ts` lines 504–549 |
| `WorkflowMetricsOutput` interface | `apps/web-app/src/lib/workflow-metrics.ts` lines 166–179 |
| Health score formula | `apps/web-app/src/lib/workflow-metrics.ts` lines 351–424 |
| Intelligence engine types | `packages/intelligence-engine/src/types.ts` — `PortfolioIntelligence`, `ProcessMetrics`, `TimestudyResult`, `VarianceReport`, `VariantSet`, `BottleneckReport`, `DriftReport` |
| Column registry availability | `apps/web-app/src/lib/dashboard-columns/registry.ts` — availability field per entry |
| Step categories (GroupingReason) | `packages/intelligence-engine/src/types.ts` PathSignature.stepCategories; segmentation-engine GroupingReason |
| `errorStepFrequency` and `navigationStepFrequency` | `packages/intelligence-engine/src/types.ts` lines 113–115 (ProcessMetrics) |
| `page_context` not aggregated to step positions in intelligence engine | `packages/intelligence-engine/src/timestudyAnalyzer.ts` — uses `step.category` (GroupingReason), not page_context |
| `lastViewedAt` vs true lastRunAt | `apps/web-app/src/app/api/workflows/route.ts` lines 532–537 (comment) |
| Batch B band aggregates | `apps/web-app/src/app/api/workflows/route.ts` lines 698–716 |
| Stats response shape | `apps/web-app/src/app/api/workflows/route.ts` lines 718–756 |
