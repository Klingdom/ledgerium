# Persona-Aware Dashboard UX — Ledgerium Workflow Intelligence
**Date:** 2026-06-14
**Author:** ux-designer
**Phase:** Define — no product code. Concrete layouts, components, interactions, buildability constraints.

---

## Preface: What this document does

The existing dashboard is built around a single mental model: a generic workflow library with health scoring. That model serves a single implicit user — someone who wants to know which processes need attention. This document identifies the three real audiences who will use Ledgerium, shows how the current single-library view fails each of them, and specifies a lens-based dashboard architecture that serves all three without fragmenting the product.

Everything here is grounded in what the current codebase actually returns. No metric is proposed that is not already computable from the `GET /api/workflows` response, the column registry, or the available `WorkflowMetricsOutput` fields. Where something requires a backend addition, it is flagged explicitly with the label `NEEDS BACKEND:`.

---

## Section 1 — The Three Personas: Needs and Current-State UX Critique

### 1.1 Persona A — Lean Six Sigma (LSS) Belt

**Who they are.** A Green or Black Belt conducting a formal process improvement project. They follow the DMAIC cycle: Define the problem, Measure baseline performance, Analyze variation sources, Improve, Control. They are comfortable with statistical concepts — standard deviation, Cpk, Pareto analysis, control charts. They are likely the person who put Ledgerium in their organization specifically to get a baseline before an improvement initiative.

**What they need from a dashboard.**

- A baseline measurement surface. They need to see cycle time statistics (mean, median, std dev, range) per process — not just a health score.
- Variation identification. Which processes have high variance? What is the coefficient of variation? Which steps account for most of the time?
- A Pareto view. They want to know which 20% of processes account for 80% of duration, error rate, or volume.
- Control-style consistency view. They want to see whether a process's performance is stable over time — not just whether it ran, but whether it ran consistently.
- Value-add ratio. What proportion of process steps are estimated value-add versus wait or rework?
- Before/after comparison frame. After an improvement project they need to compare current baseline against a prior baseline snapshot.

**Current dashboard critique for this persona.**

The current dashboard was not designed with LSS thinking at all. Specific gaps:

1. The portfolio health score (0–100) is a composite of four components (Speed, Consistency, Data Quality, Standardization). That composite is opaque to a belt who needs to decompose it. The breakdown is hidden inside a tooltip that only appears on hover of an individual row. There is no way to see the distribution of Consistency scores across all processes.
2. There is no standard deviation, coefficient of variation, or range visible anywhere. The `intelligence-engine` computes `variance.durationVariance.stdDevMs` and `variance.coefficientOfVariation`, but neither is exposed in the API response or the column registry as available columns. `NEEDS BACKEND: surfacing stdDevMs and coefficientOfVariation in WorkflowMetricsOutput and the route response.`
3. There is no Pareto. The table sorts by health score or name. A belt wants to sort by "total accumulated time" (cycle time × run count) to find the highest-impact improvement targets. The current SortField union does not include this composite.
4. There are no step-level statistics. Ledgerium captures step-level events. The belt wants to see which step in a process is the consistent bottleneck — the average and variance per step across runs. This requires a drill-down surface that does not currently exist.
5. The time range selector does not drive a "before/after" baseline comparison. A belt who ran an improvement at week 4 wants to compare weeks 1–4 against weeks 5–8. The current time range selector is a display filter, not a comparison window selector.
6. The "High Variation" preset chip exists but clicking it only changes columns — it does not filter to high-variation workflows, because presets do not currently apply data filters (a known UX gap, listed as UX-P1-07 in the existing UX review).

**Summary verdict for LSS persona.** The current dashboard gives this user a health score and an opportunity tag. A belt needs a statistical workspace. The gap between what exists and what is needed is the largest of the three personas.

---

### 1.2 Persona B — Process Documenter / Best-Path Baseline Analyst

**Who they are.** An operations manager, team lead, or business analyst whose goal is to document the official "how we do this" for a given process — either as SOPs, training material, or a reference baseline that new hires follow. They want to find the most common and most efficient path through a workflow, capture it as canonical, and surface it for others to use.

**What they need from a dashboard.**

- A "best path" indicator. Which recording of a given process most closely matches the statistically dominant path? Which run had the lowest deviation from the standard path?
- SOP readiness signal. Confidence score and run count are the two gating factors for SOP reliability. They need these prominently.
- Variant count and stability. How many distinct paths exist through this process? Is the process converging on a single path over time (stability improving) or diverging?
- A "draft SOP" action. From the best path, they want a one-click way to start a documentation artifact.
- Completeness coverage. How complete is the documentation? Are all the processes in a given system or portfolio documented?

**Current dashboard critique for this persona.**

1. Confidence score and run count are available in `WorkflowMetricsOutput` and displayed as row subtext, but they are not primary columns in the default pack. A documenter scrolling through 30 workflows wants `confidence` and `run_count` in immediately visible columns — not buried in subtext or requiring the column picker.
2. `sopReadiness` is computed server-side (`computeSopReadiness` in `route.ts:33-38`) and returned per workflow, but it is not in the default column pack. The closest signal is the "SOP ready" count in the stats object. The row-level value is invisible by default.
3. There is no "best path" highlight. The intelligence engine computes `standardPath` (via `variants.standardPath`) and `standardPathFrequency` (the fraction of runs that follow it). This information exists but is not surfaced in the dashboard list at all.
4. Variant count is computed from `processDefinition.variantCount` and is in the registry as `variant_count` with `availability: 'available'` (after the WDC-002 Wave A fix), but it is not in the default visible set. A documenter must find the column picker to enable it.
5. The dashboard has no "coverage" concept. A documenter managing documentation for a team of 20 people using 5 systems wants to see: "Workday: 3 of 8 documented, Salesforce: 5 of 12 documented." This requires grouping by system, which the current flat list does not support.
6. There is no "export to SOP" or "mark as canonical" action on a workflow row. The kebab menu has Rename, Archive, and Copy Link. No documentation action exists.

**Summary verdict for documenter persona.** The current dashboard gets partway there — it has SOP readiness signals, confidence score, and a variant count in the registry. But they are all hidden by default column choices and there is no documentation-specific workflow. A saved view with the right column pack would help considerably, but the best-path and coverage concepts require new components.

---

### 1.3 Persona C — Product / UX Team Using Browser Apps

**Who they are.** A product manager, UX researcher, or digital experience analyst at an organization that uses multiple web applications — PeopleSoft for HR, Workday for finance, Salesforce for CRM, internal SaaS tools. They are using Ledgerium to understand how employees actually use these tools: which pages are visited, in what sequence, how long steps take, which features are used and which are not. Their goal is adoption analysis, friction identification, and usage pattern documentation.

**What they need from a dashboard.**

- A systems/tools/features usage view. Which applications appear in workflows, how often, in what combination? Which specific pages or screens within an app are included in workflows?
- A coverage view. Are all expected apps covered in documented workflows? Which systems have zero workflows?
- A page-flow or sequence view. For a given application, what is the typical navigation sequence? Which pages are visited in what order?
- Usage frequency. Which pages or features appear in the most workflows? Which are used rarely?
- Session-level metrics. How long do people spend in each application during a typical workflow execution?
- Comparative analysis. Does Workday usage differ between the HR team and the Finance team?

**Current dashboard critique for this persona.**

1. The "Systems Covered" data exists in `stats.systemCoverage` (an array of `{ system: string; workflowCount: number }`) and is shown in the top-right KPI tile. But it is read-only — clicking it does nothing except show the systems chip cluster. There is no drill-down from a system name into which workflows use it, which pages within that system appear, or what the usage patterns look like.
2. The filter bar includes a "systems" multi-select filter (from `WorkflowListFilterBar`), which filters the list to workflows containing a given tool. But filtering to "Salesforce" shows a list of workflow titles — the user still has to open each workflow individually to understand what pages or features within Salesforce are involved.
3. The `toolsUsed` field on each workflow is a string array of system names. There is no page-level granularity in the stored data today. A product team wanting to know "which Workday pages appear in workflows" cannot get this from the current data model without step-level detail being exposed. `NEEDS BACKEND: step-level page/URL data exposed in a summary field per workflow.`
4. The dashboard has no systems-first view. Every view is workflow-first: a list of named workflows. A product team thinks systems-first: "show me everything we know about Workday." There is no way to group or pivot the library by system without building a manual filter.
5. The "Opportunity" column is process-intelligence framing (Automate / Standardize / Optimize / Monitor). This framing is meaningful for operations teams but less so for product teams. A product PM wants to see "Friction indicators" — which workflows have high variation or long duration within a specific app — framed as app-quality signals, not process maturity tags.

**Summary verdict for product team persona.** The current dashboard has the raw data (toolsUsed, systemCoverage, per-workflow metrics) but the presentation is entirely workflow-centric. A product team needs a system-centric entry point with drill-down into workflows per system. The needed component (a systems view) requires a perspective flip, not new data for basic coverage. Page-level usage data requires a backend addition.

---

## Section 2 — Recommended Information Architecture: The Lens System

### 2.1 Core design decision: lenses, not separate pages

The three personas are not separate enough to warrant completely separate dashboard routes. They share the same underlying data (the workflow library). What differs is:
- Which aggregate statistics appear at the top
- Which columns are default-visible in the list
- How rows are sorted by default
- Which visualizations appear above the list
- What the "most important action" is

This is exactly what the existing saved-view and preset-chip infrastructure was built for — except it currently controls only columns, not the full dashboard composition (KPI band, sort, filters). The recommendation is to extend that concept into a **dashboard lens**: a named configuration that controls the entire page's composition.

A lens controls:
- KPI band tile set (which 4–5 tiles appear and what they show)
- Default visible columns (the column pack)
- Default sort field and direction
- Default filter state
- "Above the list" visualization panel (if any)
- Available preset chips in the chip rail

A lens does NOT control:
- The underlying workflow data (same data for all lenses)
- The search input
- The time range selector
- Individual saved views (those persist across lenses)

### 2.2 The three lenses

**Lens 1 — Process Intelligence (default, current behavior)**
This is the current v2 dashboard experience with the redesign improvements from `DASHBOARD_REDESIGN_REVIEW_001.md`. No new concept — it is the baseline lens that all new users start in.

KPI tiles: Process Health gauge / Total Workflows sparkline / Avg Cycle Time distribution / AI Candidates stacked bar / Systems Covered chip cluster.
Default columns: Workflow · Runs · Avg Duration · Last Activity · Date Recorded · Opportunity · Health.
Default sort: Date Recorded, newest first.
Default filter: All workflows.
Preset chips: Automation Candidates / Needs Attention / Standardize / High Volume / Recent Activity.

**Lens 2 — Process Quality (LSS / Measurement)**
Optimized for statistical baselining and variation analysis.

KPI tiles: Avg Cycle Time with std dev band / High Variation Count / Process Stability (mean sequence stability) / Portfolio Consistency Score / Pareto indicator (top 3 highest-impact workflows by cycle time × run count).
Default columns: Workflow · Runs · Avg Duration · Std Dev Duration · Coefficient of Variation · Variant Count · Stability Score · Health.
Default sort: Cycle Time × Runs composite (highest total accumulated time first).
Default filter: All workflows.
Above-list panel: Pareto bar chart (top-N workflows by accumulated duration).
Preset chips: High Variation / Unstable Paths / High Volume / Bottleneck Risk / SOP Ready.

**Lens 3 — Documentation Coverage**
Optimized for finding what is documented, what is not, and assessing SOP readiness.

KPI tiles: SOP Ready count / Total Workflows / Coverage by System (mini grid) / Avg Confidence / Pending Review count.
Default columns: Workflow · System · Runs · Confidence · Variant Count · SOP Readiness · Last Activity.
Default sort: SOP Readiness (not ready first), then Confidence ascending.
Default filter: All workflows.
Above-list panel: Coverage grid — one row per system, columns for workflow count / SOP-ready count / avg confidence / coverage % bar.
Preset chips: SOP Ready / Needs More Runs / High Confidence / Low Confidence / Pending Review.

**Lens 4 — Systems & Tools (Product / UX)**
Optimized for understanding which applications are used and how.

KPI tiles: Unique Systems count / Total Workflows / Most Active System (name + count) / Least Documented System / Coverage percentage (workflows with ≥1 system tagged / total).
Default columns: Workflow · Systems · Page Count · Avg Duration · Runs · Last Activity.
Default sort: Systems (grouped by primary system, then by run count within system).
Default filter: All workflows.
Above-list panel: Systems Usage matrix — rows = systems, columns = workflow count / avg duration / total runs / unique pages `(NEEDS BACKEND: page-level counts)`.
Preset chips: Salesforce workflows / Workday workflows / High Step Count / Multi-System / Recently Active.

Note: Lens 4's above-list panel "unique pages" requires step-level page/URL summary data that is not currently returned by the API. The panel renders gracefully without it (showing "—" for page count) and becomes fully functional when that data is added.

---

### 2.3 The Lens Switcher — design specification

The lens switcher is a segmented control in the page header, immediately below the navigation bar and above the KPI band. It is the first thing a user sees after the nav.

**Visual design:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Workflows                                                    [All time ▾]  │
│  ──────────────────────────────────────────────────────────────────────     │
│  [⊙ Process Intelligence]  [∿ Process Quality]  [📋 Documentation]  [⬡ Systems & Tools]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

The switcher is a `role="tablist"` with four `role="tab"` buttons. The active lens tab has a green underline (2px, `var(--brand-500)`) and the label text shifts to `var(--content-primary)` weight 600. Inactive tabs are `var(--content-secondary)` weight 400.

Each tab has a small icon to the left of the label:
- Process Intelligence: a layered squares icon (the current Ledgerium logo shape)
- Process Quality: a waveform / sine icon
- Documentation: a document with checkmark
- Systems & Tools: a hexagonal grid icon

**Tab labels are short:** "Intelligence" / "Quality" / "Documentation" / "Systems". The word "Process" is dropped from the first two to keep tabs scannable at a glance.

**Switcher height:** 36px. It sits between the page title row (Zone 1, 48px) and the KPI band (Zone 2, ~100px).

**Active lens persistence:** the active lens is saved in the user's `UserDashboardPreference.payload` alongside column preferences. Key: `activeLens: 'intelligence' | 'quality' | 'documentation' | 'systems'`. Default: `'intelligence'`. This requires a minor extension to the `UserDashboardPreference` schema and the `migratePreferences` function — adding a v2 schema version with the new `activeLens` field, defaulting to `'intelligence'` for all v1 rows.

**Lens switch behavior:** switching lenses updates the KPI band, above-list panel, default column pack, sort, and preset chips in a single state update. If the user has an active data filter when switching lenses, a confirmation prompt appears: "Switching lens clears active filters. Continue?" with "Switch" and "Keep current lens" buttons. This prevents silent filter loss.

**URL parameter:** the active lens is reflected in the URL as `?lens=quality` (etc.) for shareability. On page load, if `?lens=` is present in the URL, it takes precedence over the saved preference.

---

### 2.4 Per-lens layout blueprints

Each blueprint shows the vertical stack from top to bottom. Heights are approximate.

**Lens 1 — Process Intelligence (the redesigned default)**

```
48px   [Page header: "Workflows"  |  All time ▾]
36px   [Tab: Intelligence ●  |  Quality  |  Documentation  |  Systems]
─────────────────────────────────────────────────────────────────────────
100px  [KPI band: Health Gauge | Total Workflows | Avg Duration | AI Candidates | Systems]
0–36px [Signal chips (InsightsStrip — conditional)]
─────────────────────────────────────────────────────────────────────────
12px   [Narrator: "Your 16 workflows average health 88 — all healthy."]
─────────────────────────────────────────────────────────────────────────
40px   [Toolbar row 1: Portfolios ▾ | Search | Filter ▾ | Sort ▾ | ⚙ Columns]
32px   [Preset chips: Automation Candidates | Needs Attention | Standardize | … | + Save]
32px   [Table header (sticky on scroll)]
N×44px [Workflow rows]
```

**Lens 2 — Process Quality**

```
48px   [Page header: "Workflows"  |  All time ▾]
36px   [Tab: Intelligence  |  Quality ●  |  Documentation  |  Systems]
─────────────────────────────────────────────────────────────────────────
100px  [KPI band: Avg Cycle | Std Dev | High Variation | Stability | Pareto indicator]
─────────────────────────────────────────────────────────────────────────
160px  [ABOVE-LIST PANEL: Pareto Bar Chart — top workflows by total accumulated time]
─────────────────────────────────────────────────────────────────────────
40px   [Toolbar row 1: Portfolios ▾ | Search | Filter ▾ | Sort: Cycle × Volume ▾ | ⚙]
32px   [Preset chips: High Variation | Unstable Paths | High Volume | Bottleneck Risk]
32px   [Table header]
N×44px [Workflow rows with columns: Workflow | Runs | Avg Duration | Std Dev | CV | Variants | Stability | Health]
```

**Lens 3 — Documentation**

```
48px   [Page header: "Workflows"  |  All time ▾]
36px   [Tab: Intelligence  |  Quality  |  Documentation ●  |  Systems]
─────────────────────────────────────────────────────────────────────────
100px  [KPI band: SOP Ready | Total | Coverage Grid | Avg Confidence | Pending]
─────────────────────────────────────────────────────────────────────────
140px  [ABOVE-LIST PANEL: Coverage by System grid]
─────────────────────────────────────────────────────────────────────────
40px   [Toolbar row 1: Portfolios ▾ | Search | Filter ▾ | Sort: SOP Readiness ▾ | ⚙]
32px   [Preset chips: SOP Ready | Needs More Runs | High Confidence | Low Confidence]
32px   [Table header]
N×44px [Workflow rows with columns: Workflow | System | Runs | Confidence | Variants | SOP Ready | Last Activity]
```

**Lens 4 — Systems & Tools**

```
48px   [Page header: "Workflows"  |  All time ▾]
36px   [Tab: Intelligence  |  Quality  |  Documentation  |  Systems ●]
─────────────────────────────────────────────────────────────────────────
100px  [KPI band: Unique Systems | Total Workflows | Most Active | Least Documented | Coverage %]
─────────────────────────────────────────────────────────────────────────
200px  [ABOVE-LIST PANEL: Systems Usage Matrix (see Section 3.4)]
─────────────────────────────────────────────────────────────────────────
40px   [Toolbar row 1: System ▾ (replaces Portfolios for this lens) | Search | Filter ▾ | Sort ▾ | ⚙]
32px   [Preset chips: By System chip for each detected system (dynamic)]
32px   [Table header]
N×44px [Workflow rows grouped by primary system — sticky group headers]
```

---

## Section 3 — Better Reporting Components by Persona

### 3.1 LSS — Pareto Bar Chart

**What it shows.** The top-N workflows ranked by "total accumulated process time" — a computed value of `metricsV2.avgTimeMs × metricsV2.runs`. This identifies the highest-impact improvement targets: a process that takes 15 minutes but runs 500 times contributes far more total time than a 3-hour process that runs once.

**Why Pareto, not just sort.** A sorted table shows relative rank but hides cumulative proportion. The Pareto chart adds the cumulative proportion axis (the right-side "80%" line) so a belt can identify the threshold at which a small number of processes account for most of the total time — the classic Pareto insight.

**Layout.** A horizontal bar chart, 100% width of the dashboard content area, 160px tall (fixed). Bars are green (`var(--brand-500)`) with a decreasing gradient for each subsequent bar. A secondary line overlaid in amber shows cumulative percentage (Pareto curve). The right y-axis is labelled "% cumulative time". Up to 10 bars shown; workflows with `null` accumulated time are excluded and shown below the chart as a count ("+ N workflows with no run data").

**Data.** Computed client-side from the existing `allWorkflows` array: `sort by (avgTimeMs ?? 0) * (runs ?? 0) descending, take 10`. No backend change required. The `metricsV2.avgTimeMs` and `metricsV2.runs` fields are already in the route response.

**Interaction.** Clicking a bar filters the workflow list to that single workflow. Hovering shows a tooltip: "Workflow name — Avg: 4m 12s × 47 runs = 11.8h total."

**Empty state.** If fewer than 3 workflows have both avgTimeMs and runs non-null, the chart is replaced with a callout: "Record 3 or more processes to see your impact ranking."

**Reuses the KPI band pattern.** The chart sits in the same card container as the KPI band tiles — white background, 1px border, 8px radius, 16px padding. It uses Recharts `BarChart` (already a dependency from the admin operations dashboard).

---

### 3.2 LSS — Control-Style Consistency View

**What it shows.** For a single selected workflow, a run-by-run consistency view showing whether the process is "in control" (stable and predictable) or exhibiting special-cause variation. This is the closest Ledgerium can come to an SPC (Statistical Process Control) chart with the current data model.

**Honest scope constraint.** Because there is no per-run timestamp table, this view uses `metricsV2.variationScore` (0–1) and `processDefinition.stabilityScore` as the primary indicators. A true Shewhart control chart (individual measurements with upper and lower control limits derived from 25+ data points) requires per-run duration data that does not exist yet (`NEEDS BACKEND: per-run duration records`). The chart is therefore a "consistency indicator" rather than a proper control chart, and it is labelled as such.

**Layout.** This is a slide-in detail panel (right-anchored drawer, 480px wide — the same pattern as `WorkflowDetailPanel` described in WDC-002). It opens when a user clicks a workflow row within the Quality lens.

Panel sections (top to bottom):
- Header: workflow title + system list
- Consistency indicator: a single large "Consistency" ring gauge (0–100, derived from `1 - variationScore` × 100). Color: red if < 40, amber 40–70, green > 70.
- Variant breakdown: a small donut showing the proportion of runs on the standard path (green) vs. variant paths (amber). Values from `standardPathFrequency` and `variantCount`. Shows "1 variant" through "N variants."
- Stability trend: if `stabilityScore` is available, a mini sparkline showing the evolution of the stability score over the last N process definitions (requires `processDefinition.stabilityScore` history — `NEEDS BACKEND: time-series of stabilityScore per process`). Currently shows a single data point with label "Current stability: 0.82."
- Statistical summary table: Runs / Avg Duration / Std Dev (if available, `NEEDS BACKEND: stdDevMs`) / Coefficient of Variation (if available, `NEEDS BACKEND`) / Variant Count / Confidence.

**Within the Quality lens, a simplified consistency score column appears in the row:** A small colored dot (red/amber/green) labeled "Consistency" alongside the CV if available.

---

### 3.3 LSS — Cycle Time Distribution Bar

**What it shows.** Per workflow, the spread between the minimum recorded duration, the average, and the maximum, visualized as a track with a marker. This is specified in `UX_DASHBOARD_REVIEW.md §3 Tile 3` and is reproduced here in the per-row context.

**Layout in the Quality lens.** This component appears both in the KPI band (aggregate across all workflows) and as an optional column in the table. The column variant is a 120px wide, 6px tall track with a dot marker at the mean position. Min and max are shown on hover tooltip.

**Data.** All from existing fields: `metricsV2.avgTimeMs` (mean marker), `durationMs` (single-run proxy for min=max when only 1 run). The distribution track is honest: if `runs < 2`, the marker sits at 50% of the track with a tooltip "Single recording — range not available." This is the `formatCellValue` "—" pattern extended to visual elements.

---

### 3.4 Documenter — Best Path Highlight

**What it shows.** Within a workflow row, a visual indicator of how "settled" the process path is: the fraction of runs following the dominant path, and whether a canonical SOP exists.

**Layout.** A new column: "Best Path Coverage." Value: a percentage badge showing `standardPathFrequency × 100`% with a label "N% on standard path." Colour: green if > 80%, amber 60–80%, red < 60%. When only 1 run exists, shows "1 run — not yet converged."

A secondary indicator is the "SOP Ready" badge, already computed as `sopReadiness` in the route response. In the Documentation lens this becomes a visible column with three states:
- `ready` → green "SOP Ready" badge
- `partial` → amber "Partial" badge
- `not_ready` → neutral "Draft" badge

**Best Path action.** On workflow rows where `sopReadiness === 'ready'`, a "View best path →" link appears in the kebab menu (third option, below Rename and Archive). This navigates to a to-be-built SOP detail view (out of scope for this document; flagged as a future feature that the kebab slot already provides room for).

---

### 3.5 Documenter — Coverage Grid

**What it shows.** Above the list in the Documentation lens, a compact grid showing per-system documentation coverage. Each row is one detected system; columns are: system name, total workflows, SOP-ready count, avg confidence, and a coverage progress bar.

**Layout.** A table-like panel, 140px tall (up to 5 rows visible without scrolling), with a "Show all" toggle to expand. Fixed header row. Each row:

```
System          Workflows   SOP Ready   Avg Confidence    Coverage
────────────    ─────────   ─────────   ──────────────    ──────────
Workday         8           3           0.71              [██░░░░░░] 38%
Salesforce      5           5           0.89              [████████] 100%
Excel           4           1           0.52              [██░░░░░░] 25%
Chrome          3           0           0.41              [░░░░░░░░] 0%
```

Coverage bar: 80px wide, 6px tall. Green fill for SOP-ready proportion of total. Red dot at the end if any workflows have `sopReadiness === 'not_ready'`.

**Data.** Computed client-side from `allWorkflows`:
- Group by primary system (first element of `toolsUsed`, or "Untagged" if empty)
- For each group: count total, count `sopReadiness === 'ready'`, average `processDefinition.confidenceScore`
- Coverage % = ready / total

No backend change required.

**Interaction.** Clicking a system row filters the workflow list below to workflows containing that system. The active system filter is shown as a chip in the toolbar. Clicking the chip clears it.

---

### 3.6 Product / UX Team — Systems Usage Matrix

**What it shows.** Above the list in the Systems & Tools lens, a matrix with systems as rows and key usage metrics as columns. This is the primary navigation surface for this persona — they think system-first, not workflow-first.

**Layout.** 200px tall panel (up to 6 systems visible). Columns:

```
System         Workflows   Total Runs   Avg Duration   Multi-System   Coverage
────────────   ─────────   ──────────   ────────────   ────────────   ──────────
Workday        8           143          4m 12s         6              [████░░░] 67%
Salesforce     5           89           2m 31s         4              [████████] 100%
Excel          4           22           7m 45s         2              [██░░░░░░] 25%
...
```

Column definitions:
- `Workflows`: count of workflows where this system appears in `toolsUsed`
- `Total Runs`: sum of `metricsV2.runs` across those workflows
- `Avg Duration`: mean of `metricsV2.avgTimeMs` across those workflows, formatted as a duration string
- `Multi-System`: count of workflows where this system appears alongside at least one other system (indicates cross-app workflows)
- `Coverage`: same as Documentation lens coverage — fraction with SOP readiness

**Data.** All derived client-side from the existing `allWorkflows` array. No backend change required for the columns above.

**A "Page Count" column** showing unique pages or URLs within each system is the most valuable signal for this persona, but it requires step-level page data in the API response. This column is rendered with "—" today and marked with a `(coming soon)` label in the column header until the backend adds it. `NEEDS BACKEND: per-workflow step-level page/URL summary, either as a field on WorkflowRowData or as a separate endpoint.`

**Interaction.** Clicking a system row in the matrix filters the workflow list below. The workflow list in this lens groups rows by primary system with sticky group headers (system name + workflow count). Within each group, rows sort by run count descending.

---

### 3.7 Product / UX Team — Page Flow / Sankey (deferred)

**What it shows (specification for future iteration).** For a selected system, a Sankey diagram showing the sequence of pages/screens visited within that system across all recorded workflows. Nodes are pages; edges show transitions with width proportional to frequency.

**Why deferred.** This requires per-step page/URL data in the API response that does not exist today. The Systems Usage Matrix (Section 3.6) provides the system-level entry point. When step-level page data is available, the Sankey is the next natural addition. It should open as a full-page drill-down view from the Systems & Tools lens, not as an inline component.

**Data dependency.** `NEEDS BACKEND: per-run step sequence with page identifiers, grouped by system, returned as a separate analytics endpoint. This is the primary data gap for this persona.`

---

## Section 4 — Components to Reconsider or Replace

### 4.1 Is the table the right default?

For Persona A (LSS) and Persona C (Product / UX), the answer is no — the table is not the right first view. A belt does not want a list; they want a statistical summary. A product team does not want a list; they want a systems map.

However, the table is the right default for Persona B (Documenter) and the general Persona 1 (Process Intelligence). The table is also the most useful recovery point when users want to find a specific workflow.

The resolution is not to replace the table but to introduce an above-list panel that is the primary view for Quality and Systems lenses. The table becomes the browse/find layer below the analytical layer, not the primary view. This is the role each lens's above-list panel plays.

The table remains the default for the Process Intelligence lens (the default lens for all new users) because for new users, the list is the most direct path to their workflows.

### 4.2 The PresetChipRail — reconsider scope

The current PresetChipRail applies column configurations only, not data filters. As documented in UX-P1-07, clicking "Needs Attention" changes columns but does not filter rows. This is the wrong mental model. A chip labelled "Needs Attention" must filter to attention-needing workflows.

The chips should be removed from the PresetChipRail component and reimplemented as part of a lens-aware preset system. Each lens defines its own preset chips. The "All" chip is always present and clears all lens-specific filters. The chip rail in each lens applies both the column pack AND the data filter simultaneously.

This is a breaking change to the preset data model — the `PresetDefinition` type currently has a `filters` field of type `FilterSet` that is stubbed but not applied on chip click (per the scope-adjacent observation at iter-062 close). Completing that wiring is the required change.

### 4.3 The InsightsStrip — preserve but reposition

The InsightsStrip (alert chips: "3 workflows have high variation", etc.) is good design. The chips are dismissible, severity-coded with icon + color, and click-to-filter. They should be preserved.

However, the chips currently appear above the KPI band in the vertical stack in practice. They should appear below the KPI band — after the user has seen the summary numbers and before the list. This is already the intended position but the current implementation shows them between CommandHeader and the list, which is effectively above the KPI band in the new design.

In the Quality and Documentation lenses, the InsightsStrip chips should be lens-filtered: only chips relevant to that lens's concerns appear. Example: in the Quality lens, chips about "3 SOP-ready workflows" (a Documentation concern) are suppressed; only statistical-signal chips appear. The chip relevance mapping should live in the lens configuration object.

### 4.4 The CommandHeader health score — retire as standalone widget

The current CommandHeader shows the portfolio health score as a 28px number in the top right. With the KPI band tile 1 (health gauge with arc), this is a duplicate. The CommandHeader in the new design should show only the page title, the lens switcher, and the time range selector. The health score moves entirely into the KPI band.

The portfolioHealthScoreDelta (`±N vs last 30d`) also moves into KPI tile 1's subtext. The CommandHeader becomes lighter.

### 4.5 The sidebar portfolio toggle — reconsider the pattern

The current portfolio sidebar (a right-side drawer opened by a toggle in the filter bar) creates a cognitive problem: users do not know it exists until they find the toggle, and when it is open it displaces the table content horizontally. For a list of 30 workflows, the displaced layout is disorienting.

Recommendation: in the redesigned toolbar (Row 1), the leftmost control is a "Portfolios" dropdown (a select that filters the list to a portfolio folder). This replaces both the sidebar toggle and the sidebar itself for the common case (filtering by portfolio). The full sidebar with tree navigation is available via an "Expand" link at the bottom of the dropdown, and opens as an overlay (100vh, absolute position) rather than displacing content.

---

## Section 5 — Onboarding: Picking and Changing a Lens

### 5.1 Default lens for first-time users

New users with zero workflows: the default lens is Process Intelligence. The above-list panel and KPI band show empty states with activation prompts (as specified in the UX review). The lens switcher is visible but the Quality, Documentation, and Systems lenses show a greyed tooltip on hover: "Record workflows to unlock this view."

New users with 1–2 workflows (sparse state): the Process Intelligence lens is default. No lens-switching prompt is shown — users need to orient to the core product before being offered options.

New users with 3+ workflows: no lens-switching prompt is shown automatically. The lens switcher is visible and labelled. Users discover it by scanning the page header.

### 5.2 Lens introduction moment

When a user reaches 5 workflows for the first time, a single green callout appears between the lens switcher and the KPI band (one-time, dismissible):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  You have 5 workflows — try the Quality and Systems lenses for a deeper     │
│  view of your process library.                          [Got it — dismiss]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

This callout uses a green-tinted background (`bg-green-50 border-green-200`) to match the brand. It appears only once (a `sessionStorage` flag controls dismissal; a `UserDashboardPreference` flag persists it across sessions). It does not interrupt the current lens.

### 5.3 Sensible defaults per user segment

The default lens should be persisted in `UserDashboardPreference`. On first load with no saved preference, the default is 'intelligence'. Admin users (detected via `isAdminUnlimited`) who load the dashboard for the first time could receive a different default — this is a future consideration. For now, all users start in 'intelligence'.

### 5.4 Lens label discoverability in an onboarding checklist

If the product has an onboarding checklist (the existing `OnboardingChecklist` component is present in `page.tsx`), add a step: "Try the Quality lens" with a target of clicking the Quality tab. The step completes on first Quality lens activation. This embeds lens discovery in the existing onboarding flow without a separate tour.

### 5.5 Changing lenses — interaction behavior

Clicking a lens tab:
1. Immediately updates the KPI band, above-list panel, preset chips, and table columns.
2. If the user has an active search query, the search is preserved (it filters the same data in the new lens context).
3. If the user has active data filters from the previous lens, a filter-conflict banner appears: "Some filters from the previous lens do not apply here. [View active filters] [Clear all filters]." The table shows unfiltered data for the new lens until the user resolves the conflict.
4. The URL updates to `?lens=quality` (etc.) for shareability. The back button restores the previous lens.

### 5.6 Persisting lens state

The active lens, like column preferences and saved views, is saved to `UserDashboardPreference` via the existing debounced PUT pattern on `/api/dashboard/preferences`. No separate lens endpoint is needed — lens state is one additional field in the preference payload.

The `migratePreferences` function in `persistence.ts` must be updated to handle v1 → v2 migration: v1 rows receive `activeLens: 'intelligence'` as the default, and the `CURRENT_SCHEMA_VERSION` increments from 1 to 2.

---

## Section 6 — P0–P2 UX Punch-List (Persona-Specific Additions)

The following items supplement the existing UX punch-list from `UX_DASHBOARD_REVIEW.md §7` and `DASHBOARD_REDESIGN_REVIEW_001.md`. Items are new — not duplicates of the existing lists.

### P0 — Blocks at least one persona from using the product effectively

| ID | Persona | Issue | Fix | Effort |
|----|---------|-------|-----|--------|
| PXUX-P0-01 | Quality (LSS) | Preset chip "High Variation" applies column changes only — clicking it does not filter to high-variation workflows. A belt clicking this chip expects to see only the workflows they need to investigate; instead they see all workflows with different columns. | Wire `PresetDefinition.filters` through `handleApplyPreset` to also call `onFiltersChange`. Specifically: the "High Variation" preset should set `filters.healthStatus = ['high_variation']`. | M |
| PXUX-P0-02 | Systems (Product) | The Systems & Tools lens requires a systems-first entry point. Without the lens switcher, product teams have no way to pivot from workflow-list-first to system-first. The lens switcher must ship as a unit with Lens 4. | Build the lens switcher (segmented tab control) and Lens 4 column pack + sort + KPI tiles. Above-list matrix can ship with "—" for page-count column. | L |
| PXUX-P0-03 | Documentation | SOP Readiness column is computed server-side (`sopReadiness` on each workflow) but is not in the default Documentation lens column pack. A documenter opening the product has no immediate signal about which workflows are ready. | Create the Documentation lens with `sopReadiness` as a default-visible column. The column registry already has `sopReadiness` computed — it just needs to be added to the Documentation lens column pack definition. | S |
| PXUX-P0-04 | Quality (LSS) | Std Dev Duration and Coefficient of Variation are the two most important statistical columns for a belt. They are not in the route response or the column registry. Without them the Quality lens cannot show what a belt needs. | `NEEDS BACKEND`: surface `variance.durationVariance.stdDevMs` and `variance.coefficientOfVariation` from the intelligence engine in `WorkflowMetricsOutput` and the route response. Add registry entries. This is the single highest-value backend addition for the LSS persona. | M (backend) + S (registry + column) |

### P1 — Blocks the value proposition of the lens for that persona

| ID | Persona | Issue | Fix | Effort |
|----|---------|-------|-----|--------|
| PXUX-P1-01 | Quality (LSS) | The Pareto bar chart requires "total accumulated time" = `avgTimeMs × runs`. This is a derived field, not a stored one. Computing it client-side is straightforward but `avgTimeMs` must be non-null. Currently `avgTimeMs` is null for workflows with no process definition (single-run workflows with no `avgDurationMs`). The Pareto chart's honest empty state must handle this case. | Compute Pareto data client-side. Show "—" for single-run workflows. Display count of excluded workflows below the chart. Add a tooltip on excluded items: "Needs 2+ runs to measure cycle time." | S |
| PXUX-P1-02 | Documentation | Best Path Coverage column requires `standardPathFrequency` from `WorkflowMetricsInput.intelligence.sequenceStability`. This is plumbed from `intelligenceJson` via `parseIntelligenceJson` but not currently surfaced in `WorkflowMetricsOutput` or the route API response. | `NEEDS BACKEND`: expose `intelligence.sequenceStability` in `WorkflowMetricsOutput`. Add registry column `sequence_stability`. This is a small addition since the plumbing to `parseIntelligenceJson` already exists. | S (backend) + S (column) |
| PXUX-P1-03 | Systems (Product) | The systems coverage grid and matrix both group by primary system (first element of `toolsUsed`). If `toolsUsed` is empty for some workflows, they cluster under "Untagged" — which is not useful for a product team trying to measure coverage. | Add a "Tag systems" affordance to the workflow row when in the Systems lens: a visible "Add system" button that opens an inline edit for the `toolsUsed` field. This makes coverage analysis actionable rather than read-only. | M |
| PXUX-P1-04 | All lenses | The lens switcher persists the active lens in `UserDashboardPreference`, which requires a schema version bump (v1 → v2) in `persistence.ts`. Without this, lens state resets to 'intelligence' on every page load after the user clears their browser state. | Extend `persistence.ts` with `activeLens` field in the v2 schema. Update `migratePreferences` v1→v2 branch. Update GET/PUT route Zod schemas. | S |
| PXUX-P1-05 | Quality (LSS) | The above-list Pareto chart in the Quality lens is a new panel type that does not exist in the component tree. The existing KPI band implementation (TopBand / KpiBand tiles) is separate from the list container. A new above-list panel zone is needed. | Add a `<AboveListPanel>` slot in `DashboardV2Shell` that renders lens-specific content between the KPI band and the toolbar. The slot is `null` for the Process Intelligence lens. Each lens provides its panel component via the lens config object. | M |
| PXUX-P1-06 | Documentation | The coverage grid is computed by grouping `allWorkflows` by system. This computation should be memoized (a `useMemo` on `allWorkflows`) to avoid re-running on every render. The existing `applyFilters` pattern provides the precedent. | Add a `useMemo(() => computeCoverageBySystem(allWorkflows), [allWorkflows])` hook in `DashboardV2Shell`. Pass the result as a prop to the Documentation lens above-list panel. | S |

### P2 — Improves the experience without blocking it

| ID | Persona | Issue | Fix | Effort |
|----|---------|-------|-----|--------|
| PXUX-P2-01 | Quality (LSS) | The Quality lens default sort is "Cycle Time × Runs" (accumulated time), which is a composite not currently in `SortField`. The current sort implementation is a simple field comparator. A composite sort requires a derived value. | Add `'accumulated_time'` to `SortField`. The comparator is `(a.metricsV2.avgTimeMs ?? 0) * (a.metricsV2.runs ?? 0)` — straightforward extension of `sortWorkflows()`. | S |
| PXUX-P2-02 | All lenses | Switching lenses resets the above-list panel to its initial state (no selected row, no drill-down open). If the user has a detail panel open from one lens, switching should close it cleanly and return focus to the main content area. | Add an `activeLens` dependency to any `useEffect` that manages detail-panel open state. When `activeLens` changes, close any open panel. | S |
| PXUX-P2-03 | Documentation | The "View best path →" kebab action (described in Section 3.4) needs a destination. Until a full SOP detail view is built, the action should navigate to the workflow's existing detail page (if one exists) or show a "coming soon" tooltip. | Add the kebab item with a `comingSoon` flag that renders a tooltip on click rather than navigating. No new route required for the interim state. | S |
| PXUX-P2-04 | Systems (Product) | The Systems & Tools lens groups workflow rows by primary system with sticky group headers. The grouping behavior requires sorting by system first, then by run count within system — a multi-key sort that the current `sortWorkflows()` comparator does not support. | Add a `'system_grouped'` sort option to `SortField`. The comparator: first by `toolsUsed[0] ?? 'zzz'` (alphabetical, "Untagged" last), then by `metricsV2.runs ?? 0` descending. | S |
| PXUX-P2-05 | Quality (LSS) | The KPI band in the Quality lens shows a "Pareto indicator" tile — the name and value of the single highest-impact workflow (highest `avgTimeMs × runs`). This tile has no loading skeleton. During initial data fetch it renders blank. | Add a loading skeleton (a grey pulsing bar at 28px height, 80px width) to the Pareto indicator tile using the `animate-pulse` pattern. | S |
| PXUX-P2-06 | All lenses | The lens filter-conflict banner (shown when switching lenses with active filters) has no visual design specification. Without one, implementations vary. | Define: a 36px banner between the lens switcher and the KPI band, amber background (`bg-amber-50 border-amber-200`), amber triangle icon, text in `text-amber-700`, two buttons at right ("View filters" and "Clear all"). Dismiss on "Clear all." | S |

---

## Section 7 — Assumptions and Handoff Notes

### Assumptions affecting implementation

**A1.** The lens switcher is a React state variable `activeLens` in `DashboardV2Shell`. Switching lenses does not trigger a refetch — all lens views operate on the same `allWorkflows` array already in memory. The KPI band, above-list panel, and column pack all derive from this array. Lens switching is a client-only operation after initial data load.

**A2.** The `AboveListPanel` slot in `DashboardV2Shell` is conditionally rendered. When `activeLens === 'intelligence'`, the slot renders `null`. For other lenses, it renders the corresponding panel component. The panel receives `allWorkflows` and any required derived data as props. It never fetches data independently.

**A3.** Lens-specific preset chips are defined as a `presets: PresetId[]` array in the lens configuration object. The chip rail renders the subset relevant to the active lens. The `WORKFLOW_DASHBOARD_PRESETS` catalog remains the single source of truth for preset definitions; the lens config only lists which IDs to display.

**A4.** The Documentation and Systems lenses use a `groupBy` computation over `allWorkflows` derived client-side. These computations are `useMemo`-wrapped with `allWorkflows` as the dependency. No new API calls.

**A5.** The Coverage Grid (Documentation lens) and the Systems Usage Matrix (Systems lens) are both table-like panels using HTML `<table>` elements (not divs) for accessibility. Column headers are `<th scope="col">`. Row headers are `<th scope="row">` with the system name. This is consistent with the existing `WorkflowList` table pattern.

**A6.** The Quality lens's above-list Pareto chart uses Recharts `BarChart` with a `ComposedChart` layer for the Pareto line. The chart receives pre-computed data (an array of `{ name: string; accumulatedMs: number; cumulativePct: number }`) as a prop. Recharts is already a project dependency (admin operations dashboard). The gradient ID for the bar fill must use `useId()` per the iter-073 Recharts gradient ID collision fix.

**A7.** `standardPathFrequency` is returned via `intelligence.sequenceStability` in `WorkflowMetricsInput`. The accessor for it exists in `parseIntelligenceJson` but the value is not yet in `WorkflowMetricsOutput`. Surfacing it requires a small `WorkflowMetricsOutput` extension and a corresponding route response addition. Until this backend change ships, the Best Path Coverage column shows "—" with a tooltip "Needs 2+ runs with intelligence data."

**A8.** The lens configuration object should be defined as a typed constant in a new file `apps/web-app/src/lib/dashboard-lenses/lenses.ts`. Each lens definition includes: `id`, `label`, `icon`, `defaultColumns: ColumnKey[]`, `defaultSort: SortState`, `defaultFilters: FilterState`, `presetIds: PresetId[]`, `aboveListPanel: 'pareto' | 'coverage' | 'systems-matrix' | null`, and `kpiTiles: KpiTileId[]`. The lens config is a pure module (no React, no I/O) so it can be tested independently with the same pattern as the column registry.

### Frontend engineering notes

The above-list panel requires a `<div>` between the KPI band and the toolbar in `DashboardV2Shell`'s render output. This div should have `aria-label="[Lens name] analysis panel"` and `role="region"`. The panel is not a dialog — it does not trap focus. Focus management only applies to the detail panel (slide-in drawer), which already uses the `useEscapeDispatch` pattern from MDR-P08.

The lens switcher (`role="tablist"`) should have keyboard navigation: left/right arrow keys cycle through tabs. Each tab button has `role="tab"` and `aria-selected`. The associated content area (everything below the switcher) has `role="tabpanel"` and `aria-labelledby` pointing to the active tab's ID. This is the standard ARIA tabs pattern.

The Pareto chart in the Quality lens must be deterministic: given the same `allWorkflows` input, it must produce the same output. No `Date.now()` calls, no `Math.random()`. The sort is by `(avgTimeMs * runs)` descending, ties broken by `id` alphabetically for stable rendering.

### QA validation targets

- Switching from Intelligence to Quality lens: KPI band changes to show Std Dev, Pareto indicator; above-list Pareto chart appears; column pack changes to Quality defaults; preset chips change to Quality presets. All without a network request.
- Switching from Quality to Documentation: Pareto chart disappears; Coverage grid appears; column pack changes; above-list panel transitions (no janky layout shift).
- Lens state persists across page reload (requires the `UserDashboardPreference` v2 schema migration to land).
- Coverage grid shows correct counts: if 3 of 8 Workday workflows have `sopReadiness === 'ready'`, the coverage bar shows 37.5% fill.
- Pareto chart excludes workflows where `avgTimeMs === null` and shows the excluded count below the chart.
- Lens filter-conflict banner: with system filter "Workday" active in Systems lens, switching to Quality lens shows the amber conflict banner.
- Lens switcher keyboard: Tab to reach the switcher, arrow keys cycle tabs, Enter or Space activates.
- Empty state for each lens: Quality lens with 0 workflows shows "Record processes to begin quality analysis" in place of the Pareto chart and KPI band.
