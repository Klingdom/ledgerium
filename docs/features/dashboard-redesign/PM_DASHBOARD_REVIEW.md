# PM Dashboard Review — Workflow Intelligence Dashboard
**Date:** 2026-06-12
**Author:** product-manager agent
**Status:** Define phase — no product code

---

## 1. Current-State Assessment

### 1.1 Page structure (what the page actually renders today)

The dashboard renders in three vertically stacked sections inside `DashboardV2Shell`:

**Section 1 — CommandHeader**
- Page title: "Workflows" (20px, left-aligned)
- A single top-insight sentence from the highest-severity chip (truncated, max-w-xl)
- Right side: native `<select>` time-range picker (7d / 30d / 90d / All) with no visible label
- Right side: Portfolio Health Score widget — a 28px integer in red/amber/green, a 64px wide progress rail, and a delta line ("±N vs last 30d")

**Section 2 — InsightsStrip**
- A horizontal wrap of up to 5 dismissible chips (critical/warning/info/positive), each showing icon + dot + label + count badge + X
- Clicking a chip applies a filter to the list
- Chips are rendered below the header but before the list

**Section 3 — WorkflowList**
- PresetChipRail — horizontal scrollable row of 10 preset chips (Automation Candidates, Standardize, etc.)
- "Customize columns" button (right-aligned) that opens a ColumnPicker drawer
- Filter bar — "Needs attention" toggle chip + filter icon + system pills (one per unique tool) + Opportunity `<select>` + Health Status `<select>` + active-filter chip display
- Table with dynamic columns driven by user preferences
  - Default columns: Workflow (sortable), Systems, Opportunity (sortable), Health Score (sortable), Last Run (in subtext only — not a column header), Run Count (in subtext only — not a column header)
  - Sort is client-side only; options are: name asc/desc, health_score asc/desc, opportunity grouped

### 1.2 Data available per workflow (from route.ts)

The API returns per-workflow:
- `id`, `title`, `createdAt`, `updatedAt`, `lastViewedAt`
- `toolsUsed` (string[])
- `metricsV2` — `WorkflowMetricsOutput`: `healthScore` (overall + breakdown + isGated), `runs` (= processDefinition.runCount), `avgTimeMs`, `variationScore`, `variationLabel`, `opportunityTag`, `aiOpportunityScore`
- `processDefinition` — `{ runCount, variantCount, stabilityScore, confidenceScore }` (nullable)
- Derived enrichment: `isStale`, `bottleneckRisk`, `sopReadiness`, `complexityScore`, `cognitiveBurdenScore`, `processMaturityScore`, `healthStatus`, `optimizationPotential`

The API also returns page-level stats (currently unused in the V2 shell):
- `portfolioHealthScore`, `portfolioHealthScoreDelta`
- `totalWorkflows`, `recordedThisWeek`, `recordedThisMonth`, `needsReview`, `sopReady`, `staleCount`
- `aiOpportunityCount`, `avgDuration`, `avgStepCount`, `avgConfidence`
- `optimizationOpportunities`, `highCognitiveBurdenCount`, `systemCoverage`
- `insightChips`, `topInsights`

### 1.3 What is strong

- Health score design is clean: integer + color band + delta is compact and honest.
- Insight chips are well-designed — severity-coded, dismissible, click-to-filter. The information is actionable.
- Column picker (D+4/D+5) is a genuine differentiator — letting users surface the metrics they care about.
- Audit-honesty posture is sound throughout — "—" for nulls, no fabricated metrics.
- Deterministic sort and filter logic (no ambiguity about what the user sees).
- The `createdAt` field is available in every workflow object — it just is not surfaced anywhere in the list UI.

### 1.4 What is cluttered, missing, or confusing

**Top-of-page region**
- The page title "Workflows" is generic — it orients the user to a noun, not to an action or a status. Users who just recorded their first workflow have no indication of what they should do next.
- The Portfolio Health Score is the only aggregate stat shown. The API already computes `needsReview`, `recordedThisWeek`, `aiOpportunityCount`, `staleCount` — none appear anywhere above the fold.
- The time-range select has no visible label. The `sr-only` class hides it from sighted users — they have to infer context.
- The top-insight sentence (one line from the highest-severity chip) is truncated and easily missed. It does no visual work on its own.
- There are zero charts or infographics. A purely text-and-number header misses an opportunity to make status legible at a glance.

**List controls**
- Three layers of filter/preset UI stack vertically before the table: (1) PresetChipRail, (2) "Customize columns" button bar, (3) Filter bar. On a real screen with 6–20 workflows, this three-band control area consumes ~25% of vertical space before the user sees a single workflow row.
- The filter bar mixes two conceptually different things: quick filters (Needs Attention) and dropdown selects (Opportunity, Health Status). The result feels like a shelf of unrelated controls rather than a coherent filter panel.
- The "Portfolios" toggle is buried inside the filter bar as an icon button — it is easy to miss and its purpose is not clear unless users already know what portfolios are.

**Sort**
- Only 3 sort fields exist today: `name`, `health_score`, `opportunity`. The CEO has explicitly requested: Runs, Cycle Time, Last Run, Date Recorded, Case Volume. None of those are currently sortable.
- Sort is client-side only. This is fine for small sets but means sort state is lost on refresh.

**List columns**
- "Last Run" is shown only as subtext inside the Workflow title cell, not as a sortable column header.
- "Runs" is shown only as subtext inside the Workflow title cell, not as a sortable column.
- `createdAt` (Date Recorded) is never surfaced to the user at all — it is computed in `filterByTimeRange` but never displayed.
- The "Cycle Time" column exists in the registry but is not in the default pack. Users must open the column picker to find it.

**Navigation**
- There is no search box in the V2 shell. The old V1 `page.tsx` has a search input; the V2 shell has none.
- No way to export or share the current view.
- No way to quickly record a new workflow from within the dashboard (the extension handles this, but there is no CTA pointing to it unless the list is empty).

---

## 2. The 20 Major Improvements

Priority key: **P0** = must-have for a coherent product; **P1** = high-impact, near-term; **P2** = meaningful improvement, can queue behind P1.

Effort key: **S** = 1–2 days; **M** = 3–5 days; **L** = 1–2 weeks.

---

### #1 — Date Recorded field in the workflow list [CEO explicit]

**Priority:** P0 | **Effort:** S

**Problem:** `createdAt` is available in every `WorkflowRowData` object but never displayed. Users cannot answer "when did I record this workflow?" by looking at the list.

**Proposed change:** Add `date_recorded` as a new `ColumnKey` entry in the column registry with `availability: 'available'`, an accessor that returns `ctx.createdAt` (ISO string), and `defaultVisible: true`. Render it as a formatted date in the list row using `formatDateRelative`. Mark it sortable.

**User value:** Users can immediately answer "what did I record recently?" and sort by recording date to track their documentation cadence over time.

**Data source verification:** `WorkflowRowData.createdAt` — present in every API response, always populated, never null. No backend change required. Accessor reads an existing top-level field.

---

### #2 — Sort options for Runs, Cycle Time, Last Run, Date Recorded, Case Volume [CEO explicit]

**Priority:** P0 | **Effort:** M

**Problem:** The current `SortField` type in `WorkflowList.tsx` only allows `'health_score' | 'name' | 'opportunity'`. The five CEO-requested sort fields are not wired.

**Proposed change and data source reconciliation per field:**

| Sort Field | Data Source | Backend Change? |
|---|---|---|
| **Runs** | `metricsV2.runs` (= `processDefinition.runCount`). Available today via `accessRunCount`. | No — already in API response |
| **Cycle Time** | `metricsV2.avgTimeMs` (mean run duration). Available today via `accessCycleTimeMeanMs`. | No — already in API response |
| **Last Run** | `WorkflowRowData.lastViewedAt` (proxy; see honesty note below). | No — field present today |
| **Date Recorded** | `WorkflowRowData.createdAt`. | No — field present today |
| **Case Volume** | `metricsV2.runs` (same value as Runs — see honesty note below). | No — same field |

**Honesty note — Last Run:** `lastViewedAt` is a view timestamp, not a run timestamp. The column registry comment in `accessors.ts` explicitly documents this proxy. The label "Last Run" should show a tooltip "(based on last viewed activity until run history lands)" until Path C R+1 ships an actual `workflow_runs` table. Do not silently present view time as run time.

**Honesty note — Case Volume vs Runs:** `case_volume` and `run_count` both read `metricsV2.runs` in the current accessor implementation (see `accessors.ts` lines 103–143). They are identical values today. Do not present them as two distinct sort dimensions — expose one as "Runs / Case Volume" or pick one label. Recommend "Runs" as the column header with "Case Volume" available as an alias in the column picker description. This can be revisited once Path C R+1 delivers a dedicated case-volume metric.

**Implementation:** Extend `SortField` type. Add `sortWorkflows` branches for each field. Sort against `metricsV2.runs`, `metricsV2.avgTimeMs`, `lastViewedAt`, and `createdAt`. Null values sort last. No backend change required for any of these fields — all data is in the client-side `WorkflowRowData` payload.

**User value:** Users can immediately find their highest-volume workflows, longest cycle-time offenders, most recently active workflows, and newest recordings without manual scanning.

---

### #3 — KPI summary strip: 4–5 aggregate stats above the list

**Priority:** P0 | **Effort:** M

**Problem:** The top of the page shows only a single Portfolio Health Score. The API already computes `needsReview`, `aiOpportunityCount`, `totalWorkflows`, `staleCount`, and `recordedThisWeek` — none are visible. Users have no at-a-glance summary of their portfolio's condition.

**Proposed change:** Render a horizontal strip of 4–5 compact stat tiles between the CommandHeader and the InsightsStrip. Each tile shows a number, a label, and a trend direction where data is available. Suggested tiles:

| Tile | Value | Source field |
|---|---|---|
| Total Workflows | `stats.totalWorkflows` | API already returns |
| Needs Attention | `stats.needsReview` | API already returns |
| AI Opportunity | `stats.aiOpportunityCount` | API already returns |
| Recorded This Month | `stats.recordedThisMonth` | API already returns |
| Stale | `stats.staleCount` | API already returns |

Each tile is a clickable shortcut that applies the corresponding filter to the list below (e.g., clicking "Needs Attention" activates the `needsAttention` filter). No new API computation required — these are already in the stats payload but unused in the V2 shell.

**User value:** Users see the state of their library in 3 seconds without reading any rows.

---

### #4 — Replace the single Portfolio Health Score widget with a proper top-of-page infographic

**Priority:** P1 | **Effort:** M

**Problem:** A single integer + a 64px rail is a missed opportunity for a "simple but information-powerful" header region. The score tells users "something is X" but not "why" or "compared to what."

**Proposed change:** Replace the right-side score widget with a compact "Process Health" mini-visualization using data already available:

- A donut chart or segmented arc showing the distribution of workflows across health bands: green (≥80) / amber (60–79) / red (<60). Source: iterate `allWorkflows` client-side grouping by `metricsV2.healthScore.overall`.
- A delta line under the arc: "+N vs last 30d" using existing `portfolioHealthScoreDelta`.
- A score badge in the center of the donut.

This is computable entirely from the existing per-workflow `metricsV2.healthScore.overall` fields that are already in the API response. No new backend work. The donut does more visual work than the progress rail — three colored segments convey "mostly healthy with a few problems" in a way the linear rail cannot.

**Alternative (simpler):** A horizontal 3-zone bar (stacked bar chart, no external library needed) showing counts of workflows in each health band. Same data, lower implementation risk.

**User value:** Users understand portfolio composition at a glance — not just the average score but the distribution.

---

### #5 — Replace the generic "Workflows" page title with a status-aware headline

**Priority:** P1 | **Effort:** S

**Problem:** "Workflows" is a noun. It orients the user to a database object, not to the state of their work. A user with 12 workflows and 3 needing attention has no indication of that above the fold.

**Proposed change:** Derive a short headline from the stats payload. Rules (in priority order):

1. If `stats.needsReview > 0`: "Process Library · **N workflows need attention**"
2. Else if `stats.staleCount > 0`: "Process Library · **N workflows are stale**"
3. Else if `stats.recordedThisWeek > 0`: "Process Library · **N recorded this week**"
4. Default: "Process Library" (neutral; removes the verb-less "Workflows")

The secondary headline renders in 14px below the primary — same position as today's `topInsight` sentence. This does not remove the InsightsStrip; it makes the header sentence data-driven rather than static.

**User value:** The page immediately communicates whether action is needed. Reduces the need to scan the list to assess status.

---

### #6 — Inline search field in the list header

**Priority:** P0 | **Effort:** S

**Problem:** The V2 shell has no search. The old `page.tsx` has a full-text search input hooked to the API. The V2 shell passes `sort=health_score&dir=asc` as a hardcoded URL with no search param. Users with 20+ workflows cannot find a specific one without scrolling.

**Proposed change:** Add a search input to the filter bar (or as a standalone row above the filter bar). Initially implement as client-side filter on `workflow.title` against the already-fetched `allWorkflows` array (no API change). When the list grows large enough to need server-side search, the API already accepts a `search` param — wiring it is a one-line change.

**User value:** Findability. Essential for any user with more than ~15 workflows.

---

### #7 — Consolidate the three control bands into two

**Priority:** P1 | **Effort:** M

**Problem:** Three visual bands above the table consume significant vertical space: (1) PresetChipRail, (2) "Customize columns" button bar, (3) filter bar. The "Customize columns" button lives in its own horizontal bar that does nothing else — it is a single button that occupies a full-width band.

**Proposed change:** Move the "Customize columns" trigger into the right end of the filter bar. The filter bar already has horizontal space after its controls. Result: two bands above the table — preset chips (band 1) and filter + column controls (band 2). The ColumnPicker drawer remains unchanged.

**User value:** More of the table is visible without scrolling. The control hierarchy becomes clear: presets (band 1) → fine-grained filter and column control (band 2) → data.

---

### #8 — Surface "Last Run" and "Runs" as proper first-class columns, not subtext

**Priority:** P1 | **Effort:** S

**Problem:** Today both "Last Run" and "Runs" are rendered only as subtext inside the Workflow title cell. They are not in the default column set as standalone sortable columns. Users cannot sort by them from the column headers.

**Proposed change:** Both `last_run_at` and `run_count` are already in the column registry with `availability: 'available'` and `defaultVisible: true`. The issue is that the table header does not render sort buttons for these columns in the dynamic-column path — they are only shown as subtext inside the name cell. Wire them into the sortable header path with a `SortButton` for each, consistent with how the `opportunity_tag` column gets a sort button.

**User value:** "Last Run" and "Runs" become visible, scannable, and sortable dimensions — consistent with what users would expect from any process intelligence platform.

---

### #9 — Add a "Cycle Time" column to the default visible set

**Priority:** P1 | **Effort:** S

**Problem:** `cycle_time_mean_ms` has `availability: 'available'` and an accessor wired to `metricsV2.avgTimeMs`. It was added as the 7th default-visible column at iter-067. However users still need to open the column picker to see it. It provides one of the most immediately legible signals — "this workflow takes 4 minutes on average" — and should be in the default view.

**Proposed change:** Confirm `cycle_time_mean_ms.defaultVisible = true` (already set at iter-067). Ensure the WDC2-P05 empty-state improvements account for it. The format function already handles duration formatting (see `formatCellValue` in WorkflowRow — values >1000ms are formatted as `Xm Ys`).

**User value:** Average duration is visible by default, giving users an immediate sense of which workflows are time-intensive without touching any settings.

---

### #10 — Add a "Date Recorded" column to the default visible set (ties to #1)

**Priority:** P0 | **Effort:** S (paired with #1)

**Problem:** See #1. Beyond just being available in the picker, `date_recorded` should be visible by default. It answers a fundamental provenance question for any user managing a library of recordings.

**Proposed change:** Once the `date_recorded` column key and accessor are added (improvement #1), set `defaultVisible: true`. Use `formatDateRelative` for display (same function used by the existing lastViewedAt rendering). Position it as the 8th default column — after run_count.

**User value:** Every row immediately shows when it was recorded, which drives trust in the data ("is this fresh?") and supports audit / governance use cases.

---

### #11 — "Record a workflow" CTA persistent in the header (not only in empty state)

**Priority:** P1 | **Effort:** S

**Problem:** The extension install / record CTA only appears in the empty state. Users who already have workflows but want to record more have no visible prompt. The only path is knowing to use the browser extension.

**Proposed change:** Add a small "Record new workflow →" button in the CommandHeader (or at the top of the filter bar) that links to the extension store or opens an inline guide for users who already have the extension. When the user has the extension, this could link to a "start recording" help page. When they do not, it links to the store. Use the same `EXTENSION_CONFIG.chromeStoreUrl` target already in the empty state.

**User value:** Users are reminded to grow their library. Improves library growth rate — which is the primary metric that makes the rest of the platform more valuable.

---

### #12 — Persistent filter state across page refreshes

**Priority:** P1 | **Effort:** S

**Problem:** All filter and sort state is ephemeral — it lives in React `useState`. Refreshing the page resets everything. Users who apply a specific filter ("show me Automate opportunities") lose it on every navigation.

**Proposed change:** Serialize active filters and sort state into the URL as query params (e.g., `?sort=run_count&dir=desc&opportunity=automate`). Read them back on mount. The API already accepts `sort`, `dir`, and filter params. The client-side filter state can be derived from URL params on hydration. This also makes the view shareable.

**User value:** Users return to the same view after navigation. Shareable links become possible ("here is the filter I want you to review").

---

### #13 — Health band distribution mini-chart in the insights strip (ties to #4)

**Priority:** P1 | **Effort:** S

**Problem:** The InsightsStrip shows text chips that convey individual conditions. There is no visual that shows the overall portfolio composition — what share of workflows are healthy vs at risk.

**Proposed change:** Prepend a compact distribution graphic to the InsightsStrip (or make it an optional first "chip" that is never dismissible). A horizontal segmented bar — green/amber/red — sized proportionally to the count of workflows in each health band. Show counts on hover. Computed client-side from `allWorkflows` after initial load.

Data: group `allWorkflows` by `metricsV2.healthScore.overall` into `<60`, `60–79`, `≥80` bands. Width of each segment = count / total. This is pure client arithmetic, no new API work.

**User value:** One graphic answers "how healthy is my library overall?" — the InsightsStrip provides the details.

---

### #14 — Opportunity summary: a visual breakdown of the 5 tags

**Priority:** P1 | **Effort:** S

**Problem:** The `aiOpportunityCount` (automate tag) is computed in stats but only shown as a number if surfaced via the KPI strip (#3). There is no visual that shows the distribution of opportunity tags across the library.

**Proposed change:** A small horizontal grouped bar or icon-count row showing the count per `opportunityTag` (automate / standardize / optimize / monitor / healthy). Position it as part of the top-of-page region, below the KPI strip. Clicking a tag applies the corresponding opportunity filter to the list. All data is from the already-fetched `allWorkflows` array — group by `metricsV2.opportunityTag`.

**User value:** Users immediately see "I have 4 automatable workflows and 2 needing standardization" — which is the core value proposition of the platform.

---

### #15 — Time range picker: visible label and better positioning

**Priority:** P1 | **Effort:** S

**Problem:** The time-range `<select>` has a `sr-only` label — it is invisible to sighted users. The control sits flush against the health score widget in the top-right corner without any visual separation or heading. Users must infer that it controls the list below.

**Proposed change:** Remove `sr-only` from the label and display it visibly as "Period:" before the select. Move the time-range control to the left of the filter bar (or integrate it as the first filter in the filter bar), where filter controls live conceptually. The health score widget stands alone in the top-right as a portfolio-level KPI (it already has its own label "Portfolio Health").

**User value:** Users understand what the time selector does and where it sits in the information hierarchy. Reduces confusion about whether the health score or the list or both respond to the time selector.

---

### #16 — Sortable "Opportunity" column with visual sort indicator

**Priority:** P1 | **Effort:** S

**Problem:** The `opportunity_tag` column already has a sort button (see `WorkflowList.tsx` lines 432–447), but the sort logic groups by `OPPORTUNITY_ORDER` which places "Monitor" first. The business priority order should be: **Automate** (highest value) → Standardize → Optimize → Monitor → Healthy. The current order inverts this — "monitor" (lowest urgency) sorts to the top.

**Proposed change:** Reverse the `OPPORTUNITY_ORDER` mapping so that `automate: 0` is the highest-priority entry and descending sort brings the best opportunities to the top. Default sort when the user clicks "Opportunity" for the first time should be `desc` (best opportunities first), not `asc`.

**User value:** Clicking "Opportunity" sort immediately shows the highest-value automation candidates at the top. Aligns the list default with the user's intent.

---

### #17 — System-coverage strip: which apps are most represented

**Priority:** P2 | **Effort:** S

**Problem:** The API computes `systemCoverage` (an array of `{ system, workflowCount }` ordered by count) but the V2 shell never uses it. The InsightsStrip does not show which apps dominate the user's library.

**Proposed change:** Add a "Top systems" section as part of the KPI strip (#3) or as a compact icon-pill row. Show the top 3–5 systems by workflow count as named pills with their count. Clicking a system pill applies the system filter to the list. This reuses `stats.systemCoverage` which is already computed in the API response.

**User value:** Users immediately see "my most-recorded app is Salesforce (7 workflows)" which focuses their attention on where they have the most data.

---

### #18 — Stale workflow badge or callout in the list

**Priority:** P1 | **Effort:** S

**Problem:** `isStale` is computed per workflow (30 days since creation + 14 days since last view). The health status filter includes "Stale" but there is no visual indicator in the list rows themselves. Users who do not know to filter will never see the staleness signal.

**Proposed change:** Add a subtle "Stale" badge (amber dot or "!" icon) to the Workflow title cell subtext for workflows where `isStale === true`. This is already computable in the client since `metricsV2.healthScore` is present, but `isStale` is a per-workflow enriched field that needs to be threaded from the API response into `WorkflowRowData` (it is returned by the route but not in the current `WorkflowRowData` interface). Effort is small — add `isStale: boolean` to the type and render an amber indicator in the name cell.

**User value:** Staleness is surfaced proactively without requiring the user to apply a filter. Drives re-recording behavior.

---

### #19 — Export current view to CSV

**Priority:** P2 | **Effort:** M

**Problem:** There is no way to export workflow data. Operations teams and managers frequently need to share process library status in reports or spreadsheets.

**Proposed change:** Add an "Export" button (icon only or icon + label on wider screens) in the CommandHeader or in the filter bar right side. Export generates a CSV from the current filtered and sorted `sortedWorkflows` array client-side (no new API endpoint for MVP). Columns exported: title, createdAt, lastViewedAt, runs, cycleTimeMean, healthScore, opportunityTag, systems. The `date_recorded` field (#1) and the cycle time column (#9) are natural export candidates.

**User value:** Managers can include process library status in reports without screenshots. Supports enterprise sales motion.

---

### #20 — Workflow detail slide-in panel (drill-down without full navigation)

**Priority:** P1 | **Effort:** L

**Problem:** Clicking a workflow row navigates to a detail page. There is no lightweight way to see the health score breakdown, top insights, run count, and cycle time for a single workflow without losing the list context. Users who want to scan several workflows must navigate back and forth.

**Proposed change:** Implement a right-anchored slide-in drawer that opens when the user clicks a workflow row. The drawer shows: title, health score breakdown (the 4 components: Speed, Consistency, Data Quality, Standardization), opportunity tag, run count, cycle time mean, last run, date recorded, systems, and the top 1–2 insights from the workflow's insight data. A "View full details →" link at the bottom navigates to the existing detail page. The drawer overlays the list but does not replace it — pressing Escape or clicking outside closes it and returns focus to the row.

All data for the drawer is already in the `WorkflowRowData` payload. No new API call needed for MVP.

**User value:** Users can quickly compare several workflows without losing context. Reduces navigation friction dramatically for users managing libraries of 10+ workflows.

---

### #21 — Configurable default sort (persist the user's preferred sort)

**Priority:** P2 | **Effort:** S

**Problem:** The list always resets to `health_score asc` on load. Users who prefer "most runs first" or "most recently recorded first" must re-sort every session.

**Proposed change:** Extend the `UserDashboardPreference` payload (which already persists `visibleColumns` and `savedViews`) to include `defaultSort: { field: SortField, dir: SortDir }`. Initialize sort state from preferences on load. The existing `scheduleSave` debounced PUT handles persistence without additional API work.

**User value:** The list behaves consistently with the user's working style. Reduces the most frequent repetitive interaction on the page.

---

### #22 — Empty-state improvement: show the value proposition, not just a link

**Priority:** P0 | **Effort:** S

**Problem:** The current empty state shows: "No workflows recorded yet." → copy → "Install extension to start →". This is functional but bare. For a new user, this is the first thing they see after signup. It needs to communicate the product value before asking for installation effort.

**Proposed change:** Redesign the empty state with three visual cards showing what the user will get: (1) "Measure Cycle Time — see how long any process actually takes" (2) "Surface Patterns — identify where variance is highest" (3) "Find AI Opportunities — discover where automation fits". Below the cards, the install CTA. This uses no product data — it is static copy and icons.

**User value:** Higher extension install conversion. The user understands why they should install before being asked to.

---

## 3. Top-of-Page Graphics / Infographics Direction

The CEO brief is "simple but information-powerful." The constraint is: only surface what we can compute from captured data.

**Recommended top-of-page region composition (left to right, within existing header layout):**

### 3.1 Portfolio Health Donut (replaces the current score + rail widget)
- A 60×60px donut showing health band distribution: green/amber/red arc segments, count in center
- Computed from `allWorkflows.map(w => w.metricsV2.healthScore.overall)` — pure client-side grouping
- Replaces the 64px linear rail + 28px score; score becomes the center number of the donut
- Delta line ("±N vs last 30d") remains below the donut

### 3.2 KPI Strip (sits below the donut row, above the InsightsStrip)
5 compact stat tiles in a horizontal row: Total Workflows · Needs Attention · AI Opportunities · Recorded This Month · Stale
All tiles are clickable filters. All values are from the existing stats payload.

### 3.3 Opportunity Distribution Bar (one row, inside or adjacent to the InsightsStrip)
A horizontal segmented bar showing the count of workflows per opportunity tag (Automate / Standardize / Optimize / Monitor / Healthy). Each segment is the tag's color. Width is proportional to count. Click a segment to filter.
Computed client-side from `allWorkflows`.

### 3.4 What NOT to include
- Trend lines over time: no time-series data is available for portfolio health (only a 30-day delta is computed)
- System performance graphs: `avgDuration` is available but a single-bar chart for one number is not worth rendering
- Heatmaps, complex scatter plots: the data density does not justify them at current library sizes

---

## 4. Streamline and Modernize

### 4.1 What to remove or consolidate

| Current element | Recommendation |
|---|---|
| "Customize columns" in its own full-width bar | Move into the right end of the filter bar (#7) |
| `sr-only` time-range label | Make visible; move to filter bar (#15) |
| Top-insight sentence as the only subheadline | Replace with status-aware headline (#5); keep InsightsStrip for the detail |
| PresetChipRail + filter bar as two separate bands | Keep both but collapse visual gap between them; they are conceptually adjacent |
| System pills in the filter bar (can flood the bar when many tools exist) | Cap at 4 visible + "+N more" overflow; expand on click |

### 4.2 Information hierarchy

Current hierarchy is flat — Portfolio Health, insights, presets, filters, columns, data all feel like peers. The redesigned hierarchy should be:

1. **Status** (Portfolio Health donut + KPI strip + status-aware headline) — "how is my library?"
2. **Focus** (InsightsStrip + Opportunity bar) — "where do I need to act?"
3. **Navigation** (presets + filters + sort + search) — "show me what I care about"
4. **Data** (table) — "here are the rows"

Each layer answers a progressively more specific question.

### 4.3 The single most important action the page should drive

**Record more workflows.** The platform's value compounds with library size. Every other feature (health scores, insights, opportunity detection) becomes more meaningful when the user has 10+ workflows versus 2–3. The page should make "record a new workflow" feel like a natural next step, not something that only appears in the empty state.

Secondary action: **Act on the top insight**. If the InsightsStrip shows "4 workflows with high variance", clicking that chip and reviewing those 4 workflows is the highest-value thing a user can do in one session. The information hierarchy should guide them there.

---

## 5. Success Metrics for the Redesign

### 5.1 Engagement

| Metric | Baseline | Target | Measurement |
|---|---|---|---|
| Time-to-first-meaningful-action (sort, filter, or row click) | Unknown (establish at launch) | < 20 seconds from page load | `dashboard_v2_viewed` → first `workflow_row_clicked` or `dashboard_v2_filter_applied` elapsed time |
| Dashboard bounce rate | Establish with existing `dashboard_bounced` event | < 30% | `dashboard_bounced` / `dashboard_v2_viewed` |
| Sort usage rate | ~0% (only 3 options, rarely used) | ≥ 25% of sessions use a non-default sort | `dashboard_v2_sort_changed` events per session |
| Insight chip CTR | Establish baseline | ≥ 15% of sessions interact with at least one chip | `insight_chip_clicked` / `dashboard_v2_viewed` |

### 5.2 Library growth

| Metric | Baseline | Target | Measurement |
|---|---|---|---|
| Workflows recorded per user per week | Establish at launch | ≥ 1.5/week for active users | `stats.recordedThisWeek` per user per week |
| Extension install rate from dashboard | Unknown | ≥ 30% of new users install within 1 session | Extension install analytics + `dashboard_v2_viewed` attribution |

### 5.3 Feature adoption

| Metric | Baseline | Target | Measurement |
|---|---|---|---|
| Column picker open rate | Establish | ≥ 20% of users open picker at least once | New event: `column_picker_opened` |
| "Date Recorded" column enabled rate | 0% (new column) | ≥ 40% of users enable it within 30 days | Column preference persistence stats |
| Sort by Runs / Cycle Time / Last Run usage | 0% (new) | ≥ 20% of sort interactions use new sort fields | `dashboard_v2_sort_changed.column` breakdown |

### 5.4 Conversion (paid upgrade)

| Metric | Baseline | Target | Measurement |
|---|---|---|---|
| Free → paid upgrade CTR from dashboard | Establish | ≥ 3% of free-tier sessions result in upgrade click | `upgrade_clicked` / `dashboard_v2_viewed` where `userPlan === 'free'` |

---

## 6. Open Questions for CEO

**Q1 — Runs vs Case Volume label:** `run_count` and `case_volume` in the column registry both read `metricsV2.runs` today. They are the same number. Should they be presented as one column ("Runs") or two (with "Case Volume" reserved until Path C R+1 delivers a distinct case-level count)? Recommendation: one column labeled "Runs" for now; add "Case Volume" as a distinct column at R+1 when the metric diverges from run count.

**Q2 — Last Run data quality disclosure:** `lastViewedAt` is a view timestamp used as a proxy for "last run." The label "Last Run" is a simplification. Should the column carry a visible "(approximate)" annotation or tooltip until Path C R+1 delivers actual run timestamps? Or is "Last Viewed" a more honest default label? Recommendation: rename to "Last Activity" with a tooltip explaining it reflects last view, not necessarily last execution.

**Q3 — Default sort:** The current default is `health_score asc` (worst first). Should the redesign change the default to `health_score desc` (best first) or `date_recorded desc` (newest first) to match a "what did I last record?" entry pattern? Both are valid — this is a product philosophy choice about whether the page opens as a task list (worst first) or a discovery surface (newest first).

**Q4 — KPI strip placement:** Should the 5-tile KPI strip replace the current header area entirely, or should it sit between the header and the InsightsStrip? Option A: moves Portfolio Health into the KPI strip alongside the other stats (unified stat row). Option B: keeps Portfolio Health large in the header and adds the KPI strip as a second row. Recommendation: Option B for continuity; revisit at the next UX design pass.

**Q5 — Cycle Time column in the default pack:** `cycle_time_mean_ms` was added as the 7th default-visible column at iter-067. Users who customized their columns before that change may not see it. Should a one-time migration prompt users to reset to the new defaults, or is silent adoption on new accounts sufficient?

**Q6 — Search: client-side or API-backed?** Client-side search on the title field is fast to implement and works well for libraries under ~100 workflows. API-backed search (already implemented in `route.ts` via the `search` query param) handles large libraries better. What is the target library size threshold where we should switch? Recommendation: ship client-side search first; instrument the `p99` of `allWorkflows.length` in the `dashboard_v2_viewed` event; migrate to API search when p50 exceeds 50 workflows.

**Q7 — Export:** Is CSV export sufficient, or is a PDF summary view ("process library report") needed for the enterprise sales motion? If PDF, that is a separate medium-effort feature (L). CSV is straightforward (S).
