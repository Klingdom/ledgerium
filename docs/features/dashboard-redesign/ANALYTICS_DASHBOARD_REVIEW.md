# Analytics Dashboard Review — Top-of-Page Metrics & Visualizations

**Date:** 2026-06-12
**Phase:** Define (no implementation)
**Author:** Analytics agent
**Scope:** Top-of-page KPI tiles, charts, and infographics for the redesigned
Ledgerium dashboard. Every metric cited here is either computable today from
existing API fields or requires an explicitly-flagged backend addition. No
fabricated data.

---

## 1. DATA INVENTORY

All fields below are sourced from the `GET /api/workflows` response. The
response contains two surfaces: the `stats` object (aggregate, computed once
per request) and the per-workflow array (from which aggregate distributions can
be derived client-side). The intelligence engine
(`packages/intelligence-engine/`) supplies deeper run-level fields once a
`ProcessDefinition` row exists for a workflow.

### 1.1 Count metrics

| Metric | Source field | Available now? |
|---|---|---|
| Total workflows in library | `stats.totalWorkflows` | Yes |
| Workflows recorded this week | `stats.recordedThisWeek` — count of `workflow.createdAt >= referenceNowMs - 7d` | Yes |
| Workflows recorded this calendar month | `stats.recordedThisMonth` — UTC-boundary count | Yes |
| Stale workflows (not viewed in 14 d AND older than 30 d) | `stats.staleCount` | Yes |
| Favorites | `stats.favoriteCount` | Yes |
| Workflows needing review (healthStatus = 'needs\_review' OR 'high\_variation') | `stats.needsReview` | Yes |
| Automation candidates (opportunityTag = 'automate') | `stats.aiOpportunityCount` | Yes |
| SOP-ready workflows (sopReadiness = 'ready') | `stats.sopReady` | Yes |
| High cognitive burden count (cognitiveBurdenScore >= 60) | `stats.highCognitiveBurdenCount` | Yes |

### 1.2 Cycle-time metrics

| Metric | Source | Available now? | Notes |
|---|---|---|---|
| Mean cycle time (per-workflow) | `metricsV2.avgTimeMs` — priority: `processDefinition.avgDurationMs` → `processDefinition.medianDurationMs` → `workflow.durationMs` | Yes | Single-run fallback uses raw `durationMs` |
| Median cycle time (per-workflow) | `processDefinition.medianDurationMs` | Yes if `processDefinition` row exists; null otherwise | Only meaningful at ≥2 runs |
| p90 cycle time (per-workflow) | `intelligence-engine ProcessMetrics.p90DurationMs` | Needs backend addition — not currently surfaced in the API response | `buildMetrics()` computes it; `WorkflowMetricsOutput` does not expose it |
| Portfolio-level mean cycle time | Client-side average of `metricsV2.avgTimeMs` across all workflows with non-null values | Yes — computable from existing per-workflow array | |
| Cycle-time standard deviation | `intelligence-engine VarianceReport.durationVariance.stdDevMs` | Needs backend addition — see §6 | `computeVariation()` in `workflow-metrics.ts` derives a proxy score but does not expose stdDev |

### 1.3 Health and quality

| Metric | Source | Available now? |
|---|---|---|
| Portfolio health score (0–100) | `stats.portfolioHealthScore` — mean of all `metricsV2.healthScore.overall` values | Yes |
| Portfolio health score delta (vs prior 30 d) | `stats.portfolioHealthScoreDelta` | Yes (null if prior cohort < 3 workflows) |
| Distribution of health bands (poor / fair / good) | Client-side bucket of `metricsV2.healthScore.overall` per workflow: < 60 = poor, 60–79 = fair, >= 80 = good | Yes |
| Average confidence score | `stats.avgConfidence` (0–1) | Yes |
| Average process maturity score (0–100) | `stats.avgMaturity` | Yes |

### 1.4 Variation and process intelligence

| Metric | Source | Available now? |
|---|---|---|
| Distribution of opportunityTags (automate / standardize / optimize / monitor / healthy) | Client-side count over `metricsV2.opportunityTag` per workflow | Yes |
| Count of high-variation workflows (variationScore > 0.7) | Derivable client-side from per-workflow `metricsV2.variationScore` | Yes |
| Variant count per workflow | `metricsV2.variantCount` — from `processDefinition.variantCount` | Yes if processDefinition row exists |
| Sequence stability (fraction of runs on standard path) | `WorkflowMetricsInput.intelligence.sequenceStability` — plumbed from `processDefinition.intelligenceJson` by `parseIntelligenceJson()` in `metrics-input-adapter.ts` | Plumbed but not yet exposed in `WorkflowMetricsOutput` or the API stats object; small addition needed |

### 1.5 Systems coverage

| Metric | Source | Available now? |
|---|---|---|
| Systems observed in library (distinct tools) | `stats.systemCoverage` — array of `{ system: string; workflowCount: number }` sorted descending | Yes |
| Count of distinct systems | `stats.systemCoverage.length` | Yes |
| Workflows per system | `stats.systemCoverage[n].workflowCount` | Yes |

### 1.6 Recency and activity

| Metric | Source | Available now? |
|---|---|---|
| Most recently viewed workflow IDs | `stats.recentlyViewedIds` (top 3, sorted by `lastViewedAt` desc) | Yes |
| Last-viewed timestamp per workflow | `workflow.lastViewedAt` (nullable) in the per-workflow array | Yes |
| Per-day recording activity sparkline | `workflow.createdAt` timestamps in the per-workflow array, bucketed by calendar day | Yes — derivable client-side; no backend change needed |
| Per-day run activity sparkline | Not available — runs are counted in `processDefinition.runCount` (a total, not a time-series); individual run timestamps are not in the API response | Needs backend addition — see §4 |

### 1.7 Run / case volume

| Metric | Source | Available now? |
|---|---|---|
| Total runs across library | Client-side sum of `metricsV2.runs` (which reads `processDefinition.runCount`) across all workflows with non-null values | Yes |
| Per-workflow run count | `metricsV2.runs` — source priority: `processDefinition.runCount` (> 0) → 1 (single-run floor if stepCount non-null) → null | Yes |

---

## 2. RECOMMENDED VISUALIZATION SET

Six visualizations, in display order top-to-bottom, left-to-right. Each must
pass the "so what" test: it should prompt a specific decision or action, not
merely confirm that data exists.

---

### VIZ-01: Portfolio Health Score — Stat tile + gauge

**Chart type:** Large numerical stat tile with a semicircular gauge (0–100 arc)
and a color band (red < 60 / amber 60–79 / green >= 80), plus a one-line delta
versus prior 30 days.

**Exact data:**
- Primary number: `stats.portfolioHealthScore`
- Delta: `stats.portfolioHealthScoreDelta` (with +/= /− prefix and arrow icon)
- Band color: derived from the 60/80 thresholds already in `CommandHeader.tsx`

**So what:** Answers "is my process library getting healthier or worse?" in
one glance. The delta surfaces trend before the user has to look at individual
rows. This is the single most defensible aggregate signal Ledgerium can claim
— it is a mean of deterministically computed per-workflow scores, not an
opinion.

**Current state:** Already rendered in `CommandHeader.tsx`. The redesign
should make the gauge more visually prominent and move it to a dedicated tile
so it reads at scan speed alongside the other KPI tiles.

---

### VIZ-02: Opportunity Distribution — Horizontal stacked bar or five-cell donut

**Chart type:** A horizontal 100% stacked bar with five segments, one per
`opportunityTag` value, labeled by count and percentage. Alternatively a small
5-segment donut. The bar is preferable because it communicates priority order
(automate > standardize > optimize > monitor > healthy maps naturally left to
right from highest action-value to resolved).

**Exact data:**
Client-side count of `metricsV2.opportunityTag` across the per-workflow array.
Five buckets:
- `automate` (blue/accent) — `stats.aiOpportunityCount` is available as a
  shortcut for the automate count; remaining four bucketed from per-workflow data
- `standardize` (amber)
- `optimize` (orange)
- `monitor` (red)
- `healthy` (green)

**So what:** Answers "where should I focus this sprint?" in aggregate. A high
`monitor` share means the library needs remediation before any AI automation
work starts. A high `automate` share means there are ready AI integration
candidates. This distribution is the top conversion signal for upsell — users
who see a high automate count and then click "automate" are the target
upgrade-to-Starter/Team cohort.

**Reject alternative:** Do not show this as a list of counts (e.g., "7
workflows need standardization"). The distribution format communicates
proportion, which is what the user needs to allocate attention.

---

### VIZ-03: Cycle Time Distribution — Small histogram or median+range stat tile

**Chart type:** A compact histogram (5–7 buckets covering < 1 min / 1–5 min /
5–15 min / 15–30 min / 30–60 min / > 60 min) or, if screen space is
constrained, a stat tile showing median with a min–max range bar.

**Exact data:**
- Primary: median of `metricsV2.avgTimeMs` across the per-workflow array
  (display as "X m Y s"; null workflows excluded)
- Histogram: bucket each workflow's `metricsV2.avgTimeMs` into the ranges
  above; height = workflow count
- Range annotation: min and max of the same distribution

**So what:** Answers "is this library full of quick transactions or long
complex processes?" Long cycle times (> 30 min) are the strongest predictor of
automation ROI. A right-skewed histogram (most workflows short but one or two
very long outliers) surfaces the highest-value targets immediately.

**Honesty note:** The median uses `processDefinition.avgDurationMs` as
priority-1 source, falling back to single-run `durationMs`. When a workflow has
only one run, the "median" is actually a single sample. The tile label must read
"Median cycle time (across workflows)" not "Median cycle time (across runs)" to
prevent misreading.

---

### VIZ-04: Systems Landscape — Horizontal bar chart (top N systems)

**Chart type:** Horizontal bar chart of the top 6–8 systems by workflow count,
bars proportional to `systemCoverage[n].workflowCount`, with a system name
label on the y-axis.

**Exact data:** `stats.systemCoverage` (already sorted descending by
`workflowCount`). Show top 8 entries. Add a final "Other" bar if
`systemCoverage.length > 8` using the remainder.

**So what:** Answers "which systems are most embedded in our processes?" The
system with the highest workflow count is the primary integration target for
the AI recommendation phase. This also flags breadth — a library that touches
15 distinct systems has higher cognitive burden than one concentrated in 3.
Directly informs the AI platform build sequencing (which provider to integrate
first).

**Reject alternative:** Do not show systems as a word cloud or tag list. Bar
charts allow direct comparison of counts.

---

### VIZ-05: Library Health Breakdown — Three-band stat tiles (Poor / Fair / Good)

**Chart type:** Three small stat tiles side by side, each showing a count and
percentage. Not a chart — three labeled numbers are faster to read.

**Exact data:**
Client-side bucket of `metricsV2.healthScore.overall` per workflow:
- Poor (< 60): count and percentage
- Fair (60–79): count and percentage
- Good (>= 80): count and percentage

**So what:** Complements VIZ-01 (the portfolio average) by showing the
distribution behind the average. An average of 72 means something very
different if it is 20 workflows all scoring 72 versus 10 scoring 90 and 10
scoring 54. This breakdown surfaces bimodal libraries that the average conceals.

**Relationship to VIZ-01:** VIZ-01 is the headline number; VIZ-05 is the
supporting context. They should appear adjacent.

---

### VIZ-06: Recording Activity — 30-day sparkline

**Chart type:** A small area sparkline showing recordings per day over the
trailing 30 days. Width approximately 120 px; height 32 px; no axis labels
(context is "activity trend"). A tooltip on hover shows the exact count for a
given day.

**Exact data:** Client-side bucketing of `workflow.createdAt` by calendar day
(UTC) over the trailing 30 days. Each day's value is the count of workflows
where `createdAt` falls in that calendar day. The per-workflow array is already
in the API response.

**So what:** Answers "is the team actively recording or has capture stalled?"
Stalled capture is the primary leading indicator of churn. A flat or declining
sparkline is an in-product trigger for activation messaging or re-engagement.

**Backend gap note:** This sparkline covers new workflow recordings only (by
`createdAt`). It does NOT show run counts over time — see §4 for the backend
addition required for a run-activity sparkline.

---

### Rejected metrics (with reasons)

| Metric | Reason for rejection |
|---|---|
| Average confidence score as headline tile | Confidence (0–1 extraction quality) is an internal signal useful for per-workflow diagnosis, not a portfolio summary a user acts on. The health score already incorporates it as the `dataQuality` sub-component. Surfacing both would cause confusion about which number to trust. |
| Average cognitive burden score | Cognitive burden is a heuristic proxy (step count × system switches × duration × process type). The formula in `route.ts` is reasonable for ranking rows but the absolute number 0–100 is not calibrated against any external benchmark. Showing it as a headline invites over-interpretation. |
| Average process maturity score | Same concern as cognitive burden — composite of confidence, documentation completeness, stability, run count, and freshness. Useful for row-level sorting (WDC2-P02 registry column) but not yet calibrated for portfolio-level headline display. |
| SOP-ready count as headline | `stats.sopReady` (confidence > 0.8 AND stepCount > 0) is a useful secondary signal but not a primary portfolio health indicator. It should appear in a secondary stats row below the main tiles, not in the top-level visualization set. |
| Completion rate (from intelligence engine) | `ProcessMetrics.completionRate` (completed runs / total runs) is a strong signal but is only meaningful for workflows with `processDefinition` rows and multiple runs. At typical library sizes (5–30 workflows), this will be null or 1.0 for most rows. Not ready for a top-of-page tile. |
| Variant count portfolio average | Per-workflow `processDefinition.variantCount` is valuable for individual rows. A portfolio average of variant count has no actionable interpretation ("your workflows average 2.3 variants"). |

---

## 3. SORT FIELD COMPUTABILITY

The five requested sort fields, with source confirmation and backend gap flags.

### Runs

**Computable:** Yes.
**Source:** `metricsV2.runs`, computed by `computeRuns()` in `workflow-metrics.ts`.
Priority order: `processDefinition.runCount` (if > 0) → 1 (single-run floor if
`stepCount` is non-null) → null.
**Backend sort:** Not currently a Prisma `orderBy` field because `runs` is a
computed value derived from `processDefinition.runCount`. Client-side sort on
the enriched array works at current library sizes. If server-side pagination is
added later, this would need to be a denormalized column on the `Workflow` table
or sorted via a `processDefinition.runCount` join.
**Display label:** "Runs" (matches `metricsV2.runs`).

### Cycle Time

**Computable:** Yes, with caveats.
**Source:** `metricsV2.avgTimeMs`, computed by `computeAvgTimeMs()`. Priority:
`processDefinition.avgDurationMs` → `processDefinition.medianDurationMs` →
`workflow.durationMs`.
**Caveat:** The field name `avgTimeMs` is slightly misleading when the
fallback to `workflow.durationMs` is used — that is a single-run duration, not
an average across runs. The column header should read "Avg cycle time" with a
footnote "Single run where < 2 runs available."
**Backend sort:** Not a native DB column. Client-side sort on enriched array.
Same pagination caveat as Runs.

### Last Run

**This field does not exist yet.**
**Closest proxy:** `workflow.lastViewedAt` — but this is the last time the
workflow was *viewed in the product*, not the last time a recording run was
executed. These are semantically different. `lastViewedAt` is a dashboard
interaction signal; "last run" in process intelligence terms means the
`ProcessRun.recordedAt` or the `processDefinition.updatedAt` timestamp.
**Gap:** The API does not currently return a `lastRunAt` timestamp. The
`processDefinition` Prisma model's `updatedAt` field (surfaced in
`w.processDefinition` via the route's `include: { processDefinition: true }`)
is the closest available proxy — it is updated when the process definition is
rebuilt after a new run. This should be explicitly named `processDefinition.updatedAt`
in the sort implementation and labeled "Last run (approx)" in the UI until a
dedicated `lastRunAt` column is added.
**Backend gap:** A `lastRunAt` denormalized column on `Workflow` (updated on
each new `processSession()` output persistence) is the correct long-term fix.
Flag as a small backend addition.

### Date Recorded

**Computable:** Yes.
**Source:** `workflow.createdAt` — the timestamp at which the workflow record
was created in the database, which corresponds to when the first recording was
processed.
**Backend sort:** Already a native Prisma `orderBy` field (`'createdAt'` is
the default sort). This is the only sort option that currently runs at the DB
level.
**Display label:** "Date recorded."

### Case Volume

**Clarification:** "Case volume" is not a distinct field from "Runs" at the
current data model level. In process intelligence terminology, a "case" is a
single execution of a process — which maps to a `ProcessRun`. The `processDefinition.runCount`
field counts distinct `ProcessRun` records grouped under this process definition.
Therefore Case Volume = Runs = `metricsV2.runs` from `processDefinition.runCount`.

If the product intends Case Volume to mean something distinct (for example,
"distinct users who executed the process" or "distinct sessions" rather than
"distinct process runs"), that concept is not yet in the data model. Under the
current model, implement Case Volume as an alias for Runs with the label
"Cases (runs)." Document the alias in the column tooltip.

---

## 4. TREND / ACTIVITY ELEMENT

### Recordings over time (sparkline) — Available now

Source: `workflow.createdAt` from the per-workflow array.
Computation: bucket by `Math.floor((createdAt.getTime() - windowStart) / dayMs)`
for the trailing 30 days. The per-workflow array is already returned by the API
with `createdAt` included in the base `workflowBase` spread (route.ts line 499).
No backend change needed. Client-side only.
Display: 30 buckets of equal width. Each bucket's height = count of workflows
created on that day. Days with zero recordings show a zero-height bar.
This data is precise to the day and is not a proxy.

### Runs over time (sparkline) — Needs backend addition

The `processDefinition.runCount` field is a running total, not a time-series.
Individual `ProcessRun` records are not returned by the workflows API.
To support a "runs per day" sparkline, one of the following is needed:

Option A (preferred, minimal scope): Add a `recentRunDates` field to the
`processDefinition` Prisma include in the route query — a list of
`ProcessRun.recordedAt` timestamps for the trailing 30 days. This would be an
array of timestamps, not a full ProcessRun payload.

Option B: A dedicated `/api/analytics/activity` endpoint that returns a
pre-aggregated `{ date: string; runCount: number; recordingCount: number }[]`
array for the trailing 30 days. More work but cleaner for the frontend.

Until this is implemented, the sparkline should show recordings only (Option
from above) and be labeled "Workflows recorded per day." Do not label it "Cases
per day" or "Runs per day" — that would be a lie.

---

## 5. EVENT INSTRUMENTATION

The following events should be added to `analytics.ts` to measure whether the
redesigned dashboard improves engagement. They follow the existing
snake\_case, action-oriented taxonomy.

### New events

```
dashboard_kpi_tile_clicked
  tileId: 'portfolio_health' | 'opportunity_distribution' | 'cycle_time' |
          'systems_landscape' | 'health_breakdown' | 'activity_sparkline'
  value: number | null   // the numeric value shown on the tile at click time

dashboard_sort_applied
  column: 'runs' | 'cycle_time' | 'last_run' | 'date_recorded' | 'case_volume' | string
  direction: 'asc' | 'desc'
  // Note: dashboard_v2_sort_changed already exists in the taxonomy (analytics.ts:134).
  // Align column name values with the existing event or extend it with the new
  // column names — do not create a duplicate event.

dashboard_opportunity_segment_clicked
  segment: 'automate' | 'standardize' | 'optimize' | 'monitor' | 'healthy'
  count: number
  // Fired when user clicks a segment in VIZ-02 to filter the workflow list.

dashboard_cycle_time_bucket_clicked
  bucketLabel: string   // e.g. '5–15 min'
  count: number
  // Fired when user clicks a histogram bucket in VIZ-03 to filter the list.

dashboard_system_bar_clicked
  system: string        // tool name, e.g. 'Salesforce'
  workflowCount: number
  // Fired when user clicks a system bar in VIZ-04 to filter the list.
```

### Existing events to preserve and extend

`dashboard_v2_viewed` — already instruments `workflowCount`, `hasActiveFilters`,
`portfolioFilterActive`, `time_range`. No change needed; this event remains the
dashboard load signal.

`dashboard_v2_sort_changed` — already exists. Ensure the `column` field value
vocabulary covers the new sort options: `'runs'`, `'cycle_time'`, `'last_run'`,
`'date_recorded'`, `'case_volume'`. The existing `string` type allows this
without a union change.

`insight_chip_clicked` — already exists. No change needed.

`dashboard_bounced` — already exists (MDR-P09). No change needed.

### Key measurement questions these events answer

1. Are users engaging with the top-of-page tiles, or ignoring them? (KPI tile
   click rate per tile; goal: > 20% of sessions click at least one tile)
2. Which opportunity segments drive the most filter actions? (distribution of
   `dashboard_opportunity_segment_clicked.segment`)
3. Does showing cycle time distribution increase click-through to long-duration
   workflows? (correlation between `dashboard_cycle_time_bucket_clicked` on
   buckets > 30 min and subsequent `workflow_row_clicked`)
4. Which sort column do users prefer? (distribution of `dashboard_sort_applied.column`)
5. Does the systems landscape bar chart drive workflow filter behavior?
   (`dashboard_system_bar_clicked` rate)

---

## 6. HONESTY GUARDRAILS

The following metrics are tempting to include but must not appear in the
redesigned top-of-page because the data is either absent, not yet calibrated,
or structurally misleading at this product stage.

### Must not show: ROI or time-saved estimates

There is no data on how long the process took before Ledgerium measurement, how
many people execute the process, or what frequency it runs at in production.
Any "hours saved" or "cost saved" figure would be fabricated. The
`aiOpportunityScore` is a proxy based on step count, duration, and tool count
— it predicts automation candidacy, not economic value. Do not label it as ROI
or savings.

### Must not show: Completion rate as a portfolio KPI

`ProcessMetrics.completionRate` (from the intelligence engine) represents the
fraction of recorded sessions that completed without truncation. At current
library sizes, most workflows either have `processDefinition = null` (so the
field is unavailable) or have all sessions complete (completionRate = 1.0). A
KPI tile showing "98% completion rate" communicates nothing actionable. It
should not appear until there is sufficient data density to make partial
completions meaningful (typically > 5 runs per workflow across a majority of
the library).

### Must not show: Trend lines with < 7 data points

A 30-day sparkline with fewer than 7 non-zero days should display as a flat
zero line with the label "Not enough recording activity yet" rather than
rendering a misleading upward slope from a cluster of recent recordings. The
client-side bucketing logic must suppress the sparkline chart entirely and
render an activation prompt if the total bucket count is < 3.

### Must not show: Confidence as a primary "accuracy" metric

`workflow.confidence` (and `stats.avgConfidence`) reflects extraction
confidence — how reliably the event capture pipeline matched actions to step
types during normalization. It does not measure whether the documented process
is accurate, complete, or correct. Labeling it "accuracy" or "reliability" in
the UI violates PRD §7 honest-labels principle (noted in `workflow-metrics.ts`
module header). If shown at all, the field must be labeled "Capture confidence"
and explained in a tooltip.

### Must not show: Per-workflow run counts as "cases" without qualification

`processDefinition.runCount` counts the number of times the extension captured
and processed a session for this workflow. If a user records the same process
twice to test it, that is 2 runs. It is not necessarily 2 independent business
cases. Until Ledgerium can distinguish test recordings from production
recordings, labeling this field "business cases" would over-claim. Use "Runs"
or "Recorded runs" as the label.

### Must not show: p90 cycle time until the backend exposes it

`intelligence-engine ProcessMetrics.p90DurationMs` is computed by
`buildMetrics()` but is not currently returned in the API response. The
`WorkflowMetricsOutput` interface does not include a p90 field. Do not
approximate p90 by client-side sorting — the per-workflow array contains per-workflow
averages, not individual run durations, so sorting them and taking the 90th
percentile gives the 90th percentile of per-workflow means, not the 90th
percentile of individual run durations. These are different numbers. Either add
p90 to the backend response (small addition to `WorkflowMetricsOutput`) or
omit it from the dashboard until then.

---

## Summary: backend additions required for full spec

| Addition | Priority | Effort estimate |
|---|---|---|
| `lastRunAt` denormalized column on `Workflow` table (or `processDefinition.updatedAt` as proxy with honest labeling) | Medium — needed for "Last Run" sort to be semantically correct | Small: one Prisma migration + one route field |
| `recentRunDates` array on processDefinition in the route response (for runs-per-day sparkline) | Low — nice to have; the recordings sparkline works without it | Small: extend Prisma `include` + client bucketing |
| `p90DurationMs` in `WorkflowMetricsOutput` (surfaced from `processDefinition` or intelligence engine) | Low — the median is sufficient for MVP | Small: add field to output type + route handler |
| Cycle-time stdDev in API response (for cycle-time distribution tooltip enrichment) | Low | Small: compute from per-workflow array client-side using existing `avgTimeMs` values as approximation, OR expose from `VarianceReport.durationVariance.stdDevMs` |

All other visualizations and sort fields described in this document are
computable from the current API response without schema or route changes.
