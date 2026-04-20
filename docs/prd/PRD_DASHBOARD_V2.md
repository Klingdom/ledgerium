# PRD — Workflow Intelligence Dashboard v2

**Status:** Approved (2026-04-20, coordinator-delegated per CEO authority)
**Author:** product-manager (coordinator-delegated)
**Date:** 2026-04-20
**Mode 5 item:** 1/5 (Path B dashboard redesign sequence — renumbered post-MR-004 to 5 iterations: 018 PRD+governance → 019 burn-down #15 → 020 metrics engine → 021 UI build → 022 accessibility/polish)
**Supersedes dashboard surface from:** iter 016 simplification (commit fb7bed1)

---

## Decisions Locked (D1–D10)

All 10 open decisions resolved on 2026-04-20 per CEO directive ("Accept all recommendations and move forward with the best subagent recommendation unless high risk then send to me for approval"). PM recommendations accepted as-is.

| # | Decision | Locked answer |
|---|---|---|
| D1 | Route strategy | Option B — ship behind `?v2=1` query flag on `/dashboard`; auto-redirect all users to v2 at iter 022 close; retire flag in a post-Path-B follow-up after 14-day soak |
| D2 | Health Score formula | Option C — run both `computeHealthScore()` (v1, existing) and `computeHealthScoreV2()` (CEO's 0.30/0.30/0.20/0.20) in parallel. v1 continues to serve existing UI paths; v2 serves new dashboard exclusively. Post-Path-B follow-up item will retire v1 after output distribution comparison. |
| D3 | Bottleneck data source | Derive from `ProcessInsight` rows of type `bottleneck`/`delay` where available; render "—" otherwise. No heuristic fabrication. No schema expansion in this sequence. |
| D4 | View Mode Toggle | Move "Process Groups" to a secondary nav link outside the dashboard shell. Do not render toggle inside v2 layout. |
| D5 | Portfolio Sidebar | Collapse by default. "Portfolios" icon button in the filter bar expands it. |
| D6 | Systems column | Use `workflow.toolsUsed` (parsed as `parsedTools: string[]`). Render up to 3 text chips; overflow as "+N" with tooltip. Render "—" on empty. |
| D7 | Time range scope | UI-only filter over returned data; default 30d; Runs column annotated "(all-time)" until API-driven time-range follow-up lands. D7 logged as a Phase-2 follow-up backlog item. |
| D8 | Plan gating | Free tier sees Health Score integer (ungated) and Opportunity tag (ungated); breakdown tooltip remains Starter+ gated. Matches existing gate on `healthScore` detail structure. |
| D9 | Insights strip source | Reuse existing `topInsights` + aggregate stats from `GET /api/workflows` response. No new API endpoint or computation pass. Chip cap: 4. |
| D10 | Breaking column change | Drop Steps and Active columns (raw data, not intelligence). Tags move to workflow detail page (accessible via row click; `tag=` filter still available in filter bar). **SOP readiness demotes to Health Score subtext** (small type, Starter+ only) + insight chip when `sopReady` count is notably low. SOP does not retain a standalone column. |

**Coordinator risk note:** D10 SOP demotion was flagged as the highest-risk product decision in the iter 018 decision surface. CEO delegation authorized acceptance. If post-launch analytics show SOP engagement drops meaningfully, reverse in a Phase-2 iteration by re-promoting SOP to a standalone column between Opportunity and Health Score.

---

## 1. Problem & Goal

**Who has the problem.** Any Ledgerium user with 5+ recorded workflows. Currently the dashboard shows a 10-column inline grid table (Favorite, Name, Health, Steps, Duration, Confidence, SOP, Tags, Active, Actions) that communicates data inventory, not process intelligence. Users must mentally assemble a picture from raw fields.

**What the pain is.** The current layout requires significant scanning to answer the first question any operations professional asks: "which of my workflows needs attention right now?" There is no natural reading order, no hierarchy between summary and detail, and no interpretive signal surfaced at the top.

**Job to be done.** When a user opens the dashboard, they need to understand the health of their workflow portfolio and identify where to focus — within 5 seconds, without training.

**Why now.** Phase 2 entry is unblocked. The iter 016 simplification removed clutter but did not replace it with signal. The metrics engine and enriched fields already computed in the API are not surfaced effectively. This redesign makes the existing intelligence visible.

**Goal.** Redesign the primary workflows view as a process intelligence control center with three sections only: Command Header, Insights Strip, Workflow Intelligence List. The design language is minimalist and premium (Linear/Notion register). The primary constraint is comprehension in under 5 seconds.

---

## 2. Non-Goals (explicit exclusions from CEO spec)

The following are explicitly out of scope for this redesign and must not be reintroduced:

- Chart galleries or BI-style visualisations
- Volume & Coverage, Quality & Readiness, Signals & Opportunities, Intelligence Summary, and Bottleneck Radar sections (removed in iter 016 commit fb7bed1 — do not re-add)
- A drill-down detail page for individual workflows (separate future item)
- A chatbot or conversational interface on this page
- A variant explorer UI on this page
- Generic admin panels or spreadsheet-style exports on this page
- Fake insight text: any text in the Insights Strip must be computed from real data or must not appear at all
- Any new route at `/workflows` unless D1 resolves to that path (see Open Decisions)

---

## 3. Users & Moments

**Primary persona.** Operations lead or process owner, 1–50 workflows recorded, checks the dashboard at the start of their workday to triage what needs attention. Not an analyst. Has no patience for raw numbers without context.

**Secondary persona.** Power user or team admin, 50+ workflows, uses filters and sort to find automation candidates or high-variance processes for remediation.

**User moment (primary).** Opens `/dashboard` after recording several workflows over the past week. Wants to know: are my processes healthy, which one is the worst, and what should I do about it.

**User moment (secondary).** Preparing a process audit. Filters by system or opportunity type to produce a focused view. Exports or shares individual workflow links from row quick-actions.

**Buying context.** The dashboard is the primary daily-use surface of the product. It must deliver visible intelligence value to justify plan upgrades. Starter+ users see the Health Score breakdown; free users see a gated state that makes the value legible without being functionally useful.

---

## 4. Success Metrics

All metrics assume baseline = current dashboard behavior as of iter 016 close.

| Metric | Baseline | Target | How Measured |
|--------|----------|--------|--------------|
| Time to first workflow row click (proxy for "understood in 5s") | Unknown — establish via session recording on launch | p50 < 8s, p95 < 15s from page load | Umami event: `workflow_row_click`, timestamp delta from `dashboard_view` |
| Bounce rate from dashboard (left without clicking anything) | Unknown — establish on launch | Reduce by 20% vs baseline within 30 days | Umami: sessions with zero events after `dashboard_view` |
| Health Score column engagement | N/A (not yet a column) | > 50% of sessions include a sort or filter on health within 30 days | Umami: `dashboard_sort`, `dashboard_filter` events |
| p95 time-to-interactive (dashboard page) | Unknown — measure via Lighthouse CI on iter 018 branch | <= 2.5s on desktop, <= 4s on mobile | Lighthouse CI in PR check (iter 021) |
| Insight chip click-through rate | N/A | > 15% of sessions with >=5 workflows include at least one chip click | Umami: `insight_chip_click` |
| Upgrade CTA conversion from gated health state | Baseline from current Starter gate | 10% lift vs current gated health score prompt | Umami: `upgrade_cta_click` with source=`health_gate` |

**Incompleteness flag.** "Understandable in under 5 seconds" is not directly measurable without a usability study. The time-to-first-click proxy is the closest instrumentation available within this build sequence. A post-launch task-completion survey (5 participants, moderated) is recommended at iter 022 to validate the proxy.

---

## 5. Page Structure (the 3 sections)

### Section 1 — Command Header

A single thin bar across the top of the content area. Not a full-width hero.

Contents:
- Page title: "Workflows" (not "Dashboard")
- Time range selector: controls the window for Runs count and AvgTime computation. Options: 7d / 30d / 90d / All. Default: 30d. Resolution of D7 may change whether this is UI-only or API-driven.
- Overall portfolio health score: single integer 0–100. Computed as the mean of all workflow healthScores in the current user's active workflow set. Label: "Portfolio Health". Display: large number + color band (red < 40, amber 40–69, green 70+). Non-color semantic: screen reader reads "Portfolio health: [N], [poor/fair/good]".
- Top insight sentence: one line of natural language derived from the highest-severity undismissed ProcessInsight or, if none exist, derived from the aggregate stats (e.g., "3 workflows have not been reviewed in 30 days"). Must be blank if no insight is computable — do not render a placeholder.

Explicitly absent from Command Header: KPI tiles, sparklines, usage meter (move to account/settings), action buttons (new recording CTA moves to an add button near the list header), charts.

### Section 2 — Insights Strip

A horizontal row of chips rendered below the Command Header and above the list. Chips are dismissible per session (not persisted to DB in v2 — client state only).

Chip anatomy: severity dot (red/amber/blue) + natural language label + optional count badge. Non-color: severity is also conveyed via ARIA label and icon shape (circle=info, triangle=warning, octagon=critical).

Chip sources and generation rules:
- "N workflows show high execution variance" — fires when >= 2 workflows have variationScore > 0.7. Count = number of qualifying workflows.
- "[Step name or workflow name] drives X% of total delay" — fires when a ProcessInsight of type `bottleneck` or `delay` exists with severity `critical` or `warning`. Uses insight title directly.
- "N workflows are strong automation candidates" — fires when >= 2 workflows have aiOpportunityScore >= 60.
- "N workflows have low confidence and need review" — fires when >= 2 workflows have healthStatus `needs_review`.
- "N workflows are stale" — fires when staleCount >= 2.

Rules: maximum 5 chips rendered at once, ordered by severity descending. Chips only appear if their condition is true with real data. No chip renders for zero-count conditions.

Clicking a chip applies a filter to Section 3 (e.g., clicking the variance chip filters to variationScore > 0.7). The active filter state is shown in the list filter bar. Chips are not navigation elements — they do not change the route.

### Section 3 — Workflow Intelligence List (hero section)

A full-width table / list. This is the primary interaction surface.

**Columns (in order):**

| Column | Source field | Notes |
|--------|-------------|-------|
| Workflow Name | `workflow.title` | Primary link. Subtext: last run date (relative). |
| Systems | `workflow.toolsUsed` (parsed JSON array) | Render as icon pills or text chips. Max 3 visible, "+N" overflow. See D6. |
| Runs | `processDefinition.runCount` or heuristic (see §7.1) | Integer. "—" if unknown. |
| Avg Time | `processDefinition.avgDurationMs` or `workflow.durationMs` | Human-formatted (e.g., "4m 30s"). |
| Variation | `variationScore` | Rendered as Low / Medium / High label + color band. Non-color: text label always shown. |
| Bottleneck | Derived (see §7.4 and D3) | Step name or "—" if not available. |
| Health Score | `computeHealthScoreV2()` (see §7.5) | 0–100 integer + color band. Plan-gated per D8. |
| Opportunity | `computeOpportunityTag()` (see §7.6) | One of: Automate / Standardize / Optimize / Monitor / None. Tag chip. |

**Optional subtext per row (render only if minimalist):** last run date (already in Name column), confidence score as secondary text under Health Score, owner (deferred — no owner field in current schema).

**Default sort:** Health Score ascending (worst first). This is the "process intelligence" sort — surfaces workflows needing the most attention.

**Available sorts:** Health Score (asc/desc), Runs (desc), Avg Time (desc), Variation (desc), Name (asc/desc).

**Available filters:** System (multi-select from toolsUsed values present in the user's workflow set), Opportunity (Automate / Standardize / Optimize / Monitor), Health Status (healthy / needs_review / high_variation / stale).

**Row interactions:**
- Click row: navigates to workflow detail page (existing route — do not build detail page in this sequence).
- Hover: shows quick action bar (Edit name, Archive, Copy link). No expand-in-place.
- Keyboard: Tab moves between rows; Enter activates row click; Space activates hover quick actions.

**Responsive:** on viewports < 768px, hide Systems and Bottleneck columns, keep Name / Health Score / Opportunity. On < 480px, keep Name and Health Score only.

---

## 6. Data Model Additions / API Changes

**No new Prisma schema migrations are required for iter 019.** All source data for v2 metrics exists in the current schema. The metrics engine (iter 019) operates on already-fetched workflow + processDefinition data.

**API changes required (iter 019):**

1. Add `sort=health_score` and `dir=asc` as valid sort params. Currently health score sorting is not supported server-side (health score is computed post-query). For v2 the default sort must be by health score ascending. Because `computeHealthScoreV2` is a pure function, server-side sort can be applied after enrichment in the same route handler — no schema change needed.

2. Add `opportunity` filter param: `GET /api/workflows?opportunity=automate`. Applied post-enrichment, same pattern as existing `healthFilter`.

3. Add `time_range` param: `GET /api/workflows?time_range=30d`. Controls whether Runs and AvgTime are drawn from `processDefinition` (all-time) or a time-windowed subquery. See D7 for scope decision.

4. Response envelope change: add `stats.portfolioHealthScore` (mean of all workflow healthScores in the unfiltered set, 0–100 integer) and `stats.insightChips` (array of computed InsightChip objects — see §7 interface).

**No new tables. No migrations in iter 019.**

---

## 7. Metrics Engine Specification

The metrics engine is a standalone TypeScript module at `apps/web-app/src/lib/workflow-metrics.ts`. It must be pure (no I/O, no DB calls), deterministic (same inputs = same outputs), and fully typed. The route handler calls it; the module does not import from route files.

All functions are exported individually. No class-based API.

```typescript
// apps/web-app/src/lib/workflow-metrics.ts

export interface WorkflowMetricsInput {
  id: string;
  confidence: number | null;
  stepCount: number | null;
  durationMs: number | null;
  phaseCount: number | null;
  toolsUsed: string[];           // pre-parsed from JSON
  createdAt: Date;
  lastViewedAt: Date | null;
  processDefinition: {
    runCount: number;
    variantCount: number;
    avgDurationMs: number | null;
    medianDurationMs: number | null;
    stabilityScore: number | null;
    confidenceScore: number | null;
  } | null;
  processInsights: Array<{
    insightType: string;           // 'bottleneck' | 'delay' | 'variance' | etc.
    severity: string;
    title: string;
    observedValue: string | null;
  }>;
}

export interface WorkflowMetricsOutput {
  runs: number | null;
  avgTimeMs: number | null;
  variationScore: number;          // 0–1
  variationLabel: 'low' | 'medium' | 'high';
  bottleneckLabel: string | null;  // step name or null
  healthScore: HealthScoreV2;
  opportunityTag: OpportunityTag;
  confidence: number | null;       // pass-through for subtext
  isTrendReady: boolean;           // §7.8
}

export interface HealthScoreV2 {
  overall: number;     // 0–100
  efficiency: number;  // 0–25
  consistency: number; // 0–25
  reliability: number; // 0–20 (scaled from 0–25 input; see §7.5)
  standardization: number; // 0–20 (scaled; see §7.5)
  isGated: boolean;    // true if caller should hide breakdown
}

export type OpportunityTag = 'automate' | 'standardize' | 'optimize' | 'monitor' | 'none';

export interface InsightChip {
  id: string;           // stable key for React keying
  severity: 'critical' | 'warning' | 'info';
  label: string;        // natural language, pre-rendered
  filterKey: string;    // e.g. 'variationScore_gt_0.7'
  count: number;
}
```

### 7.1 Runs

**Source priority:**
1. `processDefinition.runCount` if processDefinition is non-null and runCount > 0.
2. `1` (the workflow itself is one run) as a floor if processDefinition is null.
3. Returns `null` only if the workflow has never been analyzed and stepCount is null.

**Time-range scoping:** In v2 initial release, Runs always reflects all-time count from processDefinition. Time-range-scoped runs require a new DB query pattern (see D7) and are deferred unless D7 resolves to API-driven.

```typescript
export function computeRuns(input: WorkflowMetricsInput): number | null
```

### 7.2 Avg Time

**Source priority:**
1. `processDefinition.avgDurationMs` if non-null.
2. `processDefinition.medianDurationMs` if avgDurationMs is null.
3. `workflow.durationMs` as single-run fallback.
4. Returns `null` if all three are null.

Display format: caller formats via existing `formatDuration()` utility.

```typescript
export function computeAvgTimeMs(input: WorkflowMetricsInput): number | null
```

### 7.3 Variation

**Source priority:**
1. `1 - processDefinition.stabilityScore` if stabilityScore is non-null. (Higher stability = lower variation.)
2. `processDefinition.variantCount / 10` capped at 1 if stabilityScore is null but variantCount > 0.
3. `1 - confidence` if processDefinition is null and confidence is non-null. Proxy: low confidence implies process inconsistency.
4. `0.5` (unknown default) if all sources are null.

**Label thresholds:**
- `>= 0.67` → `'high'`
- `>= 0.34` → `'medium'`
- `< 0.34` → `'low'`

```typescript
export function computeVariation(input: WorkflowMetricsInput): { score: number; label: 'low' | 'medium' | 'high' }
```

### 7.4 Bottleneck

**Data gap acknowledged.** There is no per-step latency model in the current schema. Step-level duration breakdown does not exist. This column cannot show a specific step name derived from timing data in v2.

**Recommended source (D3 option c):** Derive from ProcessInsight rows of type `bottleneck` or `delay` attached to this workflow (`processInsights` field in input). If one or more such insights exist, display the title of the highest-severity one, truncated to 30 characters. If no such insights exist, display "—".

This makes the column honest: it shows real observed bottleneck signals when available, and is transparent when data is absent. It does not display a fabricated value.

**If D3 resolves differently,** the interface above is designed to accommodate: `bottleneckLabel` is nullable and the implementation can be swapped without changing the output type.

```typescript
export function computeBottleneckLabel(input: WorkflowMetricsInput): string | null
```

### 7.5 Health Score

**Formula conflict:** The existing `computeHealthScore()` uses four equally-weighted 0–25 dimensions (completeness, confidence, duration, complexity) that do not map to the CEO's four dimensions (efficiency, consistency, reliability, standardization).

**Recommendation (D2):** Implement `computeHealthScoreV2()` as a new function alongside the existing `computeHealthScore()`. Do not delete or modify `computeHealthScore()` — it is referenced in the plan gating path and has established behavior. Map the CEO's formula to available signals as described below. After iter 019 ships, run both functions in parallel for one iteration and compare output distributions. A follow-up item will retire the old function once parity is confirmed.

**CEO formula:** `healthScore = 0.30 × efficiency + 0.30 × consistency + 0.20 × reliability + 0.20 × standardization`

**Dimension mapping to available signals:**

| Dimension | Weight | Source signals | Scoring |
|-----------|--------|---------------|---------|
| efficiency | 0.30 (→ 0–30 pts) | `durationMs` vs ideal range (30s–30min), `stepCount` relative to complexity | Linear interpolation within ideal range = 30 pts; outside floor = 5 pts; null = 0 |
| consistency | 0.30 (→ 0–30 pts) | `variationScore` (inverted) | `(1 - variationScore) * 30`, rounded |
| reliability | 0.20 (→ 0–20 pts) | `confidence` (extraction confidence as proxy for process reliability) | `confidence * 20`, rounded; null = 0 |
| standardization | 0.20 (→ 0–20 pts) | `processMaturityScore` proxy: sopReadiness (ready=20, partial=10, not_ready=0) + documentation completeness | `(sopReadiness_pts + docScore_pts) / 2` capped at 20 |

**Output range:** 0–100 (sum of four dimension scores). Same range as existing function.

**Explainability:** `HealthScoreV2` exposes all four sub-scores. The frontend renders them in a tooltip on the health score cell (Starter+ only). Free tier sees the overall integer with no breakdown tooltip.

```typescript
export function computeHealthScoreV2(input: WorkflowMetricsInput): HealthScoreV2
```

### 7.6 Opportunity Tag

**Decision tree (deterministic, in priority order):**

1. **Automate** — if `aiOpportunityScore >= 60` AND `toolsUsed.length >= 2`. Rationale: multi-system workflows with high automation signal are the primary automation target.
2. **Standardize** — if `variationScore >= 0.67` AND `healthScoreV2.overall >= 40`. Rationale: high variation but not unhealthy — process exists but needs consistency.
3. **Optimize** — if `healthScoreV2.efficiency < 15` AND `healthScoreV2.overall >= 40`. Rationale: otherwise-reasonable workflows with poor efficiency scores.
4. **Monitor** — if `healthScoreV2.overall < 40` OR `healthScoreV2.reliability < 8`. Rationale: low-health or low-confidence workflows that need data quality attention before they can be acted on.
5. **None** — if none of the above conditions are met.

Rules are evaluated top-to-bottom; first match wins. All thresholds are named constants in the metrics module (not magic numbers inline).

```typescript
export function computeOpportunityTag(input: WorkflowMetricsInput, healthScore: HealthScoreV2): OpportunityTag
```

### 7.7 Confidence

Pass-through from `workflow.confidence`. Exposed in `WorkflowMetricsOutput` for use as optional subtext under the Health Score column. No new computation.

### 7.8 Trend-readiness (reserved)

`isTrendReady: boolean` — true if `processDefinition.runCount >= 5`. Indicates whether trend analysis (future Phase 2 feature) is possible. Included in output interface now so the frontend can reserve the column interaction without a metrics engine change later. No UI rendering in v2.

### Portfolio Health Score (aggregate)

```typescript
export function computePortfolioHealthScore(workflows: WorkflowMetricsOutput[]): number
// Returns mean of all workflow healthScore.overall values, rounded to integer.
// Returns 0 for empty array.
```

### Insight Chips (aggregate)

```typescript
export function computeInsightChips(
  workflows: WorkflowMetricsOutput[],
  processInsights: Array<{ insightType: string; severity: string; title: string }>,
): InsightChip[]
// Returns up to 5 chips, ordered by severity descending.
// Each chip fires only when its count condition is met (see §5 Section 2 rules).
```

---

## 8. Component Hierarchy (target)

All new components live under `apps/web-app/src/components/dashboard-v2/`. The existing `dashboard/page.tsx` is refactored to use these components; it is not replaced wholesale until the feature flag resolves (see D1).

```
apps/web-app/src/components/dashboard-v2/
  index.ts                          — barrel export, named exports only
  DashboardV2Shell.tsx              — top-level layout: Header + Strip + List
  CommandHeader.tsx                 — Section 1: title, time range, portfolio score, top insight
  TimeRangeSelector.tsx             — controlled select; emits onChange(range: TimeRange)
  PortfolioHealthBadge.tsx          — score + color band + aria label
  InsightsStrip.tsx                 — Section 2: chip row + dismiss logic
  InsightChip.tsx                   — single chip: severity dot + label + count + dismiss
  WorkflowIntelligenceList.tsx      — Section 3: filter bar + table
  WorkflowListFilterBar.tsx         — system / opportunity / health filters + active chip display
  WorkflowListTable.tsx             — semantic <table> with sort headers
  WorkflowListRow.tsx               — single row; all columns; hover quick actions
  WorkflowListSkeleton.tsx          — loading state: 5-row skeleton
  WorkflowListEmpty.tsx             — empty state: no workflows recorded yet
  WorkflowListNoResults.tsx         — no-results state: filters match nothing
  WorkflowListError.tsx             — error state: API failed
  WorkflowListSparseData.tsx        — sparse state: < 3 workflows, metrics incomplete notice
  HealthScoreCell.tsx               — score integer + color band + breakdown tooltip (Starter+)
  OpportunityTagChip.tsx            — tag chip: Automate / Standardize / Optimize / Monitor / None
  SystemsPillList.tsx               — icon pills + "+N" overflow
  VariationLabel.tsx                — Low / Medium / High + color + aria
```

**Existing components preserved (not deleted in this sequence):**
- `ProcessGroupsExplorer` — behavior per D4
- `PortfolioSidebar` — behavior per D5
- `OnboardingChecklist`, `UsageQuotaMeter`, `ExtensionStatusToast` — kept but relocated per layout design decisions in iter 020

**Data flow:** `DashboardV2Shell` owns the time range and filter state. It passes them as props to `CommandHeader`, `InsightsStrip`, and `WorkflowIntelligenceList`. No prop drilling past two levels — `WorkflowListFilterBar` and `WorkflowListTable` receive only the slice they need. TanStack Query hook for `GET /api/workflows` lives in `DashboardV2Shell`; child components receive data as props.

---

## 9. States

| State | Trigger condition | Component |
|-------|------------------|-----------|
| loading | API in-flight | `WorkflowListSkeleton` — 5 rows, column-matched widths. Header renders with score = "—". |
| empty | `workflows.length === 0` AND no filter active | `WorkflowListEmpty` — "No workflows recorded yet." + link to browser extension. |
| no-results | `workflows.length === 0` AND filter active | `WorkflowListNoResults` — "No workflows match your filters." + clear-filters button. |
| error | API returns non-200 or TanStack Query error | `WorkflowListError` — "Something went wrong loading your workflows." + retry button. |
| sparse-data | `0 < workflows.length < 3` | Render list normally but prepend `WorkflowListSparseData` notice: "Metrics improve as more workflows are recorded. Some scores may be incomplete." |

Loading skeletons must match the column widths of the real table exactly (avoids layout shift). Use `animate-pulse` or equivalent. Minimum display time: 300ms (prevents flash for fast connections).

---

## 10. Accessibility Commitments

- The Workflow Intelligence List renders as a semantic `<table>` with `<thead>`, `<tbody>`, `<th scope="col">` for column headers, and `<th scope="row">` for workflow name cells.
- Health Score column: color band is NOT the only indicator. The integer value is always present. Screen reader reads: "Health score: [N], [poor/fair/good]" via `aria-label`.
- Opportunity tag: color is NOT the only indicator. The text label ("Automate", "Standardize", etc.) is always present.
- Variation label: text label always present; color band is supplementary.
- Severity dot on insight chips: supplemented by icon shape (circle/triangle/octagon) and ARIA label.
- Keyboard navigation: Tab cycles through interactive elements in DOM order. Sort headers are `<button>` elements with `aria-sort` attributes. Row quick actions are accessible via keyboard (focus-visible states required).
- Focus states: all interactive elements must have visible focus rings. No `outline: none` without a custom focus style.
- Minimum contrast: all text meets WCAG AA (4.5:1 for body, 3:1 for large text).
- Time range selector: `<select>` or accessible custom combobox. If custom, must support keyboard open/close/selection.

---

## 11. Mock Data Plan

**Problem.** Current seed has 2 test users and no realistic multi-workflow fixtures. The metrics engine and UI states cannot be developed or visually tested without representative data.

**Required for iter 019 (metrics engine):** Unit test fixtures covering:
- Workflow with all fields populated (processDefinition with runCount=10, stabilityScore=0.8, processInsights with a bottleneck)
- Workflow with null processDefinition (single recording)
- Workflow with null confidence, null durationMs (sparse)
- Workflow with variationScore > 0.7 and aiOpportunityScore > 60 (should tag Automate)
- Workflow with healthScoreV2.overall < 40 (should tag Monitor)

These fixtures live in `apps/web-app/src/lib/__tests__/workflow-metrics.fixtures.ts`.

**Required for iter 020 (frontend):** A dev-mode seed that creates 12 workflows with varied health scores, opportunity tags, and systems for the logged-in dev user. This extends the existing `apps/web-app/e2e/seed-test-db.js` with a new `seedDashboardV2Dev()` function. It must not overwrite existing test users.

**Required for iter 021 (E2E):** The E2E suite uses the iter 020 seed to assert all five UI states (loading, empty, no-results, error, sparse-data) are reachable.

---

## 12. Plan Gating Policy

Pending D8 resolution. Current system behavior: `healthScores` feature is Starter+ only (free tier receives no `healthScore` object in the API response).

**PM recommendation for v2:** Apply the existing gate to the `HealthScoreV2` breakdown tooltip only. The `healthScore.overall` integer is visible to all plans as a column value but renders with a lock icon and "Upgrade to see breakdown" tooltip on free tier. The Opportunity tag column is visible to all plans (it is a derived interpretation, not a raw score breakdown).

Rationale: showing the score integer makes the value legible for conversion; hiding the breakdown creates upgrade motivation. Hiding the column entirely removes the incentive to upgrade. The Opportunity tag being ungated increases perceived value of the free tier without exposing the underlying scoring logic.

The `isGated` field in `HealthScoreV2` is set by the route handler (not the metrics engine) based on plan check. The metrics engine always computes the full breakdown; gating is a presentation-layer concern.

---

## 13. Open Decisions (CEO must answer before iter 019 starts)

**D1 — Route strategy.** Evolve `/dashboard` in place (current page is replaced iteratively) OR ship new components behind a `?v2=1` query flag on `/dashboard` OR build at a new `/workflows` canonical route and redirect `/dashboard` to it.

- Option A (in-place): lower deployment risk, no redirect logic, existing analytics events continue to fire. Harder to A/B test.
- Option B (query flag): allows side-by-side comparison, easier rollback. Adds a flag cleanup step.
- Option C (new route): cleanest long-term URL, separates v1 and v2 cleanly. Requires redirect, updates to nav links, analytics event renaming.

PM recommendation: Option B (query flag `?v2=1`) for the build sequence, with automatic redirect to `/dashboard?v2=1` for all users at iter 021 close. Retire the flag and clean up at a subsequent iteration after 14-day soak. This preserves rollback without permanent URL debt.

**D2 — Health Score formula.** Replace `computeHealthScore()` with CEO's 0.30/0.30/0.20/0.20 formula, OR map existing dimensions to CEO dimensions, OR run both in parallel.

PM recommendation: Run both in parallel (Option C) for iter 019–020. Existing `computeHealthScore()` continues to serve existing UI paths unchanged. New `computeHealthScoreV2()` serves the v2 dashboard exclusively. A follow-up backlog item retires the old function after output distribution comparison at iter 022. This is the safest path given the existing plan-gating dependency on `healthScores`.

**D3 — Bottleneck data source.** (a) Derive from ProcessInsight rows, (b) heuristic from variationScore + step name, (c) show "—" when no ProcessInsight exists, (d) add step-latency schema (scope expansion).

PM recommendation: Option (a/c combined) — derive from ProcessInsight where available, show "—" otherwise. Option (d) is out of scope for this sequence. Option (b) would fabricate a bottleneck label that is not evidence-backed, which violates the core principle of no fake insight text.

**D4 — Process Groups view / View Mode Toggle.** Keep as-is, hide behind a feature flag, or remove from v2.

- Keep: adds complexity to the v2 layout; CEO spec does not mention it.
- Flag: preserves functionality for users relying on it; cleans up the v2 layout.
- Remove: breaking change for any user using Process Groups.

PM recommendation: Move the View Mode Toggle to a secondary navigation link (e.g., a "Process Groups" link in the left nav or a tab above the list). Do not render it inside the v2 dashboard shell. This preserves the feature without complicating the primary layout.

**D5 — Portfolio Sidebar.** Keep, collapse-by-default, or remove from v2.

PM recommendation: Collapse by default. Add a "Portfolios" icon button in the list filter bar that expands the sidebar. This reduces initial cognitive load while preserving the feature for users who use it.

**D6 — Systems column data source.** Use `workflow.toolsUsed` (per workflow) OR `ProcessDefinition.systems` (per process family). How to handle > 3 systems.

PM recommendation: Use `workflow.toolsUsed` (already parsed in the enrichment layer as `parsedTools: string[]`). `ProcessDefinition.systems` is sparsely populated and introduces join complexity. Render up to 3 system names as text chips; overflow as "+N" with a tooltip listing all. If toolsUsed is empty, render "—".

**D7 — Time range scope.** UI-only filter over returned data OR API-driven query (changes what `GET /api/workflows` returns). Default value and option set.

- UI-only: simpler implementation; time range only affects columns that are derived from time (Runs, AvgTime). The full workflow list is always returned; filtering is client-side. Limitation: Runs will always reflect all-time from processDefinition regardless of range selection.
- API-driven: accurate scoped Runs and AvgTime; requires a time-windowed join or subquery on processDefinition or a new WorkflowRun query pattern.

PM recommendation: UI-only for v2 (Option A). The time range selector primarily communicates recency context to the user, not a strict data filter. Add a visible "(all-time)" annotation to the Runs column header until API-driven time-range is implemented. Log D7 as a follow-up backlog item for Phase 2. Default: 30d.

**D8 — Plan gating for v2 health score.** Free tier sees Health Score column integer (ungated) but breakdown tooltip is Starter+ gated. Opportunity tag column is ungated. (PM recommendation stated in §12.)

CEO must confirm or override this recommendation. If the override is "hide the column entirely on free tier," the `WorkflowListTable` must receive an `isHealthGated: boolean` prop and conditionally render or replace the column with an upgrade prompt cell.

**D9 — Insights Strip source.** Reuse existing `topInsights` / aggregate `stats` from `GET /api/workflows` response, OR add a new computation pass specifically for chip generation.

PM recommendation: Reuse existing stats and ProcessInsight data already returned by the API. The `computeInsightChips()` function (§7) accepts the enriched workflow array and the topInsights array already in the response — no new API endpoint needed. New computation pass is unnecessary complexity for v2.

**D10 — Breaking column change.** Current users lose Steps, SOP, Tags, and Active columns. SOP readiness in particular is a product-differentiating signal.

PM recommendation:
- Steps and Active: remove. Not intelligence signals; raw data fields.
- Tags: move to workflow detail page (accessible via row click). Tags as a filter are still available via the existing `tag` query param which can be surfaced in the filter bar if needed.
- SOP readiness: do not expose as a standalone column. Surface it as: (1) a subtext annotation under the Health Score cell showing "SOP ready / partial / not ready" in small type for Starter+ users, and (2) an insight chip if `sopReady` count is notably low relative to total workflows. This preserves the signal's discoverability without requiring a dedicated column.

CEO must confirm whether any of these four columns must be retained as primary columns. If SOP readiness must be a column, insert it between Opportunity and Health Score and reduce the responsive hiding threshold.

---

## 14. Rollout Plan (sequence across iter 018–021)

| Iter | Mode 5 item | Primary deliverable | Artifact gate |
|------|------------|--------------------|----|
| 018 | 1/4 — PRD + scaffolding | This PRD (done). Coordinator updates IMPROVEMENT_BACKLOG and SYSTEM_HEALTH. Open decisions D1–D10 resolved by CEO before iter 019 begins. No code changes. | PRD_DASHBOARD_V2.md complete. D1–D10 resolved. |
| 019 | 2/4 — Metrics engine | `apps/web-app/src/lib/workflow-metrics.ts` implemented and tested. All exports from §7 implemented. Unit tests cover all fixture cases from §11. API route updated to call new engine and return `portfolioHealthScore` + `insightChips` in stats. No UI changes. | `pnpm test` passes. `pnpm typecheck` clean. Test coverage >= 90% on metrics module. |
| 020 | 3/4 — Frontend components | All components from §8 implemented. `dashboard/page.tsx` (or `/dashboard?v2=1` per D1) renders new shell. All five states from §9 reachable. Dev seed from §11 merged. Accessibility markup from §10 in place. | `pnpm typecheck` clean. Storybook or manual review of all 5 states. Lighthouse score recorded as baseline. |
| 021 | 4/4 — E2E + release gate | Playwright E2E suite covering: page load renders list, default sort is worst-health-first, insight chip click applies filter, plan gating renders lock icon on free tier, all 5 UI states reachable. RELEASE_READINESS.md updated. | `pnpm test` passes including E2E. RELEASE_READINESS checklist complete. |

**Dependency order is strict.** Iter 020 cannot begin until iter 019 metrics engine tests are green. Iter 021 cannot begin until iter 020 dev seed is merged and components render without TypeScript errors.

---

## 15. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| D1–D10 not resolved before iter 019 | Medium | High — blocks implementation decisions | Coordinator must surface D1–D10 to CEO immediately after iter 018 close. Iter 019 start is gated. |
| HealthScoreV2 produces systematically different rankings than V1, confusing existing users | Medium | Medium | Run both in parallel (D2 recommendation). V2 dashboard is flag-gated until iter 021. No user sees V2 score without opt-in or flag. |
| Bottleneck column is "—" for most workflows (no ProcessInsights populated) | High | Low | Column renders "—" honestly. Documented in §7.4. Users understand sparse data via the §9 sparse-data state notice. |
| Mock data insufficient to test sparse-data state | Medium | Medium | Fixtures defined in §11 include a sparse case explicitly. Iter 019 is blocked until fixtures are written. |
| Performance regression from post-query health score sort on large workflow sets | Low | Medium | Health score sort is O(n) over an in-memory array already fetched. For n < 1000 this is negligible. Flag for review if any user reaches 500+ workflows in Phase 2. |
| Accessibility failures in custom components (e.g., chip dismiss, sort headers) | Medium | High | Explicit accessibility commitments in §10. Iter 021 E2E includes keyboard navigation assertions. No accessibility regression is acceptable for release. |
| CEO overrides D8 to hide health column entirely on free tier | Low | Medium | `isHealthGated` prop design in §8 accommodates this. Frontend component renders upgrade prompt cell without structural change to table. |
