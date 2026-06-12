# UX Dashboard Review — Ledgerium Process Intelligence Dashboard
**Date:** 2026-06-12
**Author:** ux-designer
**Scope:** Define phase — no code. Covers current UX critique, modernized layout, top-of-page graphics design, workflow list UX, interaction polish, visual system, and P0→P2 punch-list.

---

## 1. Current UX Critique

### What exists today (observed from source + screenshot)

The current dashboard (`DashboardV2Shell` → `CommandHeader` → `InsightsStrip` → `WorkflowList`) is structurally sound but has accumulated debt across three separate review cycles. Reading the screenshot of the live UI and the component code together surfaces the following problems.

### 1.1 Visual hierarchy

**What a user sees first:** The page title "Workflows" at 20px/medium weight followed immediately by the time-range `<select>` in the top right. The portfolio health score (a large 28px number) competes with the page title rather than anchoring the page's purpose.

**What attention does:** Scatters. There is no single dominant anchor at the top. The health score is right-aligned, so it reads last on an F-pattern scan. The insight chips below are the most visually interesting element but sit in the second section. The workflow table below the chips starts with tiny 12px column headers and dense rows.

**Problems:**
- The page title "Workflows" is too generic and too small (20px/medium) to establish context. Users cannot tell at a glance whether they are on a monitoring screen or a document library.
- The portfolio health score is the most important number on the page but it is right-aligned and visually secondary to the filter row.
- The time-range selector appears before the health score in the DOM but visually beside it — the relationship between the two is not clear. (Is the time range filtering the health score? It is not, currently.)
- The delta label (`+N vs last 30d`) is rendered in 12px below the score and is easy to miss.

### 1.2 Density and clutter

**Top region (v1 page.tsx, still visible via ?v2=0):** Three stacked layers — heading row, org health row, top-signal chips row, top-insights chips row — produce four visual bands before the user reaches any content. Some of these bands are empty when data is sparse, leaving awkward blank gaps.

**V2 shell (DashboardV2Shell):** More restrained. But the `PresetChipRail` + the `Customize columns` button + the `WorkflowListFilterBar` create three separate horizontal control rows stacked before the table. A user arriving for the first time sees: header → insight chips → preset rail → columns button → filter bar → table header → table rows. That is six horizontal bands of chrome before meaningful content.

**The filter bar (WorkflowListFilterBar) and the preset chip rail do overlapping jobs.** The preset rail applies column configurations; the filter bar applies data filters. Both are horizontal strips of controls. From a user perspective, the distinction is invisible. The columns button is then a third mechanism that pops a drawer. Three separate surfaces for what a user experiences as "configure the view."

### 1.3 Redundancy

- The insight chips from `InsightsStrip` and the signal chips from the v1 top region communicate the same kinds of signals (N need review, N AI candidates) with different visual treatments.
- "Needs Attention", "AI-Ready", "Recently Added" in the preset rail and "Needs Attention" as a filter in the filter bar are the same concept via two different paths.
- The portfolio sidebar toggle exists as both a button in the filter bar ("Portfolios") and is controlled by `portfolioSidebarOpen` state. When collapsed, its existence is unclear.
- The `Customize columns` trigger and the column picker drawer are split from the preset rail visually even though they all control column state.

### 1.4 Friction in the list and controls

- **No numeric run counts visible by default.** The subtext in `WorkflowRow` says "N steps · Xm" but there is no "N runs" column visible without customization. Run count is one of the most meaningful signals in a process intelligence tool.
- **No date recorded column by default.** `createdAt` exists on every workflow but is not a visible column in the 6-column default pack. Users cannot tell how old a workflow is without clicking into it.
- **Sort only covers three fields** (health_score, name, opportunity). Duration, run count, last viewed, and date recorded are not sortable from the header.
- **The health score is always right-aligned**, breaking the natural left-to-right reading flow for a data table where the name comes first and the health summary comes last. For a table, right-alignment of the metric column is standard practice, but the score needs a clearer visual encoding (color band is thin at 1.5px height).
- **Empty and loading states** are correct in behavior but the loading skeleton only shows 5 rows. If the user has 30 workflows, the layout jump on data arrival is jarring.

### 1.5 What is good and should be preserved

- The 3-band health score rail (red/amber/green with a progress bar fill) is clean and communicates status without requiring number interpretation.
- Insight chips in `InsightsStrip` — dismissible, severity-coded with both color and icon shape — are accessible and scannable.
- The table `<thead>` with `aria-sort` on column headers is correct and should stay.
- The `ColumnPicker` drawer pattern is solid; it just needs to be surfaced more intuitively.
- The `PresetChipRail` concept is good; the presets need to include data filters, not just column configurations.

---

## 2. Modernized Layout: Page Skeleton Top to Bottom

The redesign consolidates the page into four clearly separated zones. The goal is: one dominant visual (the KPI band), one control row, one content area. No nested chrome layers.

### Zone 1 — Page header (40px tall, full width)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Process Intelligence              [Time range ▾]    [+ Record]  [Actions ▾] │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Left:** Title "Process Intelligence" at 24px/semibold. Below it in 13px/regular: the workflow count and health delta as prose — "24 workflows · Health 87 (+3 this month)". This replaces the current separate heading row + org-health row with a single, dense header.

**Right:** Time range selector (compact pill button group: 7d / 30d / 90d / All; default All). Primary CTA "Record" (opens extension or upload route). Secondary overflow "Actions" button for analytics, recommendations, upload.

**This eliminates:** The large standalone "Org Health" circle, the stacked signal chips row, and the separate heading with date subtitle. All of that information is either in the KPI band (zone 2) or in the prose subtitle.

**Height:** 48px total including 8px vertical padding.

---

### Zone 2 — KPI / Insight Band (the new centerpiece, see Section 3 for detail)

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Health Gauge │  Total Runs  │  Avg Cycle   │  AI Cands    │  Coverage    │
│  [donut]     │  [sparkline] │  [bar chart] │  [number]    │  [chip cloud]│
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

Five tiles in a horizontal row. Each tile is a card (white/elevated surface, 1px border, 8px radius, 16px internal padding). On mobile they collapse to a 2-column grid with the fifth tile full-width below.

Height: 96px per tile (fixed). The graphics inside are sized to fill 48px of that height, leaving room for label above and subtext below.

Each tile is interactive — clicking it applies a filter or navigates to a drill-down. See Section 3 for full specification.

---

### Zone 3 — Signal chips (dismissible, contextual, appears only when signals exist)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠ 3 need review  ·  ⚡ 2 AI candidates  ·  ✓ No critical risks            │
└─────────────────────────────────────────────────────────────────────────────┘
```

This is the current `InsightsStrip` component, kept essentially unchanged but moved below the KPI band and constrained to one row (overflow hidden on mobile). Chips remain dismissible per session. The strip is hidden when no chips exist.

Height: 36px when visible. 0px when not.

---

### Zone 4 — Workflow list (the main content area)

This zone replaces the current multi-band control cluster (PresetChipRail + columns button + FilterBar) with a single unified toolbar.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Portfolios ▾]  [🔍 Search...]  [Filter ▾]  [Sort: Date Recorded ▾]  [⚙ Columns] │
│ All  |  Needs Review  |  AI-Ready  |  High Variation  |  Stale  |  + Saved  │
└─────────────────────────────────────────────────────────────────────────────┘
│ TABLE HEADER ROW (sticky)                                                   │
│  Workflow  ·  Systems  ·  Runs ↓  ·  Avg Cycle  ·  Date  ·  Health  ·  ··· │
├─────────────────────────────────────────────────────────────────────────────┤
│  Row 1                                                                      │
│  Row 2                                                                      │
│  ...                                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Toolbar row 1 (controls):** Left group: Portfolios dropdown (replaces sidebar toggle). Center: Search input (flex-grow). Right group: Filter dropdown (opens filter panel), Sort dropdown, Columns gear button (opens ColumnPicker drawer). All in a single 40px-tall row.

**Toolbar row 2 (preset views / saved views):** Horizontal scrollable strip of preset chips. These function as quick-apply filters — clicking a chip applies both column config AND data filter simultaneously. The right end has a "+ Saved" button to save the current view. Chips: All | Needs Review | AI-Ready | High Variation | Stale | (user saved views). This merges the current PresetChipRail (column-only) with the v1 preset views (filter-only) into a unified concept.

**Sticky table header:** On scroll, the header row sticks to the top of the viewport (below the page header). This is important for long lists.

**Column defaults (see Section 4 for full spec).**

---

### Zone summary: vertical flow

```
48px   Zone 1  Page header
96px   Zone 2  KPI band
0–36px Zone 3  Signal chips (conditional)
40px   Zone 4a Toolbar row 1
32px   Zone 4b Preset / saved-view chips
32px   Zone 4c Table header (sticky)
N×44px Zone 4d Table rows
```

Total above-the-fold at 1280px height with 10 rows: header visible at ~280px from top. The KPI band is the dominant first impression.

---

## 3. Top-of-Page Graphics: Five Visualizations

The KPI band contains five tiles. Each is designed to show one thing clearly without requiring number literacy. The selection criterion: each visualization must communicate something a user cannot get by reading a number alone — either trend, distribution, or composition.

### Tile 1 — Process Health Gauge

**What it shows:** The portfolio health score as a semi-circular gauge (donut arc, half-circle). The fill arc represents the score (0–100). The score number is shown centered inside the arc at 28px/semibold.

**Data consumed:**
- `stats.portfolioHealthScore` (integer 0–100)
- `stats.portfolioHealthScoreDelta` (integer or null — period delta)

**Visual:**
```
     ╭───────────╮
    /  ●●●●●○○○  \
   |     87       |
    \             /
     ╰───────────╯
      +3 this month
```
Arc segments: 0–59 = red, 60–79 = amber, 80–100 = green. The filled portion uses the appropriate segment color. The unfilled portion is `var(--border-subtle)`. Arc stroke-width: 8px. Total diameter: 64px (fits in 96px tile height with label above).

**Label above arc:** "PROCESS HEALTH" in 10px/500/uppercase/tracked.

**Subtext below:** Delta shown as "+3 this month" (green) or "−5 this month" (red) or "— no prior data" (neutral). If delta is null, show "First month" in neutral color.

**On click:** No filter action. Navigates to `/analytics` for full health drill-down.

**Why it earns its space:** The gauge encodes both magnitude and band membership in a single glance. A number alone (87) is ambiguous without knowing the scale. The arc fill communicates "mostly healthy" visually before the user reads the number. The delta communicates trend. Together they answer "are we getting better or worse?"

**Size:** 64px wide × 64px tall within the tile. Tile width: 180px (or flex-equal in 5-tile row).

**States:** Loading = pulsing grey arc. Empty (no workflows) = grey arc, 0 center, copy "Record workflows to see health score."

---

### Tile 2 — Activity Sparkline (Total Runs / Recording Trend)

**What it shows:** A small area sparkline of recording activity over the last 30 days. X-axis: days. Y-axis: cumulative or per-day count. The primary number shown is total run count (total recordings in the library, all time). The sparkline gives temporal context.

**Data consumed:**
- `stats.totalWorkflows` (integer — total recorded workflows, used as headline number)
- `stats.recordedThisWeek` (integer — for annotation)
- `stats.recordedThisMonth` (integer — for annotation)
- Per-workflow `createdAt` dates (for computing the 30-day bucketed sparkline client-side from the `allWorkflows` array already in memory)

**Visual:**
```
TOTAL WORKFLOWS
24
▁▂▁▃▄▄▅▆▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▃▂▁
+8 this week
```
Sparkline: 120px wide × 32px tall. Line color: `var(--brand-500)` (Ledgerium green). Fill: 10% opacity green. No axis labels — the shape communicates trend, not precise per-day values.

**Headline number:** 24 at 28px/semibold above the sparkline.

**Label above:** "TOTAL WORKFLOWS" in 10px/500/uppercase.

**Subtext below:** "+N this week" in 12px. If recordedThisWeek is 0, show "None this week" in neutral color.

**On click:** No filter. Scrolls to the workflow table (anchor behavior).

**Why it earns its space:** The headline number is useful but the sparkline answers "is this growing?" A declining sparkline — even with a high total count — signals that recording has stopped. This is a critical signal for a tool that derives value from continuous capture.

**Computation note:** The 30-day bucketed sparkline is derived client-side from `allWorkflows.map(w => w.createdAt)`. No new API field required.

**States:** Loading = 3 skeleton lines. Empty = flat line at zero, copy "Start recording to see activity."

---

### Tile 3 — Avg Cycle Time with Distribution Bar

**What it shows:** The average duration across all workflows as a headline number, with a small horizontal distribution bar showing the spread (min / avg / max encoded as a track with a marker).

**Data consumed:**
- `stats.avgDuration` (ms, integer — average across all workflows)
- Per-workflow `metricsV2.cycleTimeMs` or `durationMs` for min/max derivation (computed client-side)

**Visual:**
```
AVG CYCLE TIME
2m 26s
|────●────────────|
0s            12m
```
Distribution track: 120px wide, 4px tall, rounded. Left cap = min duration, right cap = max duration. The marker (●, 8px circle) is positioned at the average. Track background: `var(--border-subtle)`. Marker: `var(--brand-500)`. Labels below the track: min value left-aligned, max value right-aligned at 10px/regular.

**Headline number:** avgDuration formatted as human-readable time (2m 26s) at 28px/semibold.

**Label above:** "AVG CYCLE TIME" in 10px/500/uppercase.

**Subtext below:** "across N workflows" in 12px neutral.

**On click:** Applies sort by duration descending to the workflow table.

**Why it earns its space:** Average duration alone is ambiguous — 2m 26s could be consistent or wildly variable. The distribution bar immediately communicates range. If min is 30s and max is 45m, the average is nearly useless for planning. This is visible at a glance.

**States:** Loading = pulsing bar. Empty = "—" in place of number, flat neutral track.

**Honest rendering:** If fewer than 2 workflows have duration data, show "—" and "Not enough data" subtext. Never extrapolate.

---

### Tile 4 — AI Candidates Count with Opportunity Breakdown

**What it shows:** The count of workflows tagged `automate` (AI opportunity candidates), with a small horizontal stacked bar showing the breakdown of all four opportunity tags (automate / standardize / optimize / monitor).

**Data consumed:**
- `stats.aiOpportunityCount` (integer)
- `stats.totalWorkflows` (integer)
- Per-workflow `metricsV2.opportunityTag` for the breakdown (client-side, already in memory)

**Visual:**
```
AI CANDIDATES
3
[■■■░░░░░░░░░░░░░░] 3 of 24
automate  standardize  optimize  monitor
```
Stacked bar: 120px wide × 8px tall. Segments left-to-right: automate (violet), standardize (blue), optimize (amber), monitor (neutral grey). Each segment is proportional to its count. Segments with 0 count are omitted. No axis labels on the bar — the absolute counts are in the legend row below.

**Headline number:** `stats.aiOpportunityCount` at 28px/semibold in violet if >0, neutral if 0.

**Label above:** "AI CANDIDATES" in 10px/500/uppercase.

**Legend row below bar:** Four small colored dots with counts at 10px: `● 3 automate  ● 5 standardize  ● 8 optimize  ● 8 monitor`. Only non-zero segments shown.

**On click:** Applies `opportunity = automate` filter to the workflow table.

**Why it earns its space:** The raw count (3) is useful but the breakdown bar shows the full portfolio composition — how many workflows are in each stage of the optimization spectrum. A portfolio of all "monitor" workflows is very different from one with mostly "automate" candidates. The bar communicates this distribution in 4px of height.

**States:** Loading = pulsing grey bar. Empty (0 workflows) = bar hidden, copy "Record workflows to discover AI opportunities."

---

### Tile 5 — Systems Coverage Chip Cluster

**What it shows:** The top systems (tools/apps) observed across all workflows as a compact chip cluster. The count of unique systems is the headline number.

**Data consumed:**
- `stats.systemCoverage` (array of `{ system: string; workflowCount: number }`)
- Maximum 6 systems shown, ordered by workflowCount descending.

**Visual:**
```
SYSTEMS COVERED
11 unique
[Salesforce] [Workday] [Excel]
[Slack]  [Chrome] +6 more
```
System chips: pill shape, 6px radius, 20px height, 8px horizontal padding, 12px text. Background: `var(--surface-secondary)`. Border: `var(--border-default)`. Text: `var(--content-secondary)`. The chip width is determined by the system name. Chips wrap to 2 rows maximum.

**Headline number:** Count of unique systems at 28px/semibold. Below: "unique apps recorded".

**Label above:** "SYSTEMS COVERED" in 10px/500/uppercase.

**On click on a chip:** Applies `systems = [system]` filter to the workflow table.

**On click on "+N more":** Opens the Filter dropdown pre-populated to the systems panel.

**Why it earns its space:** Process intelligence value is tied to breadth of coverage. A team with workflows across 11 systems has much richer evidence than one with 2. The chip cluster communicates both volume (the count) and identity (which systems), enabling users to immediately spot gaps. It is also the most direct entry point to the system filter.

**States:** Loading = 3 grey pill skeletons. Empty = "No systems recorded yet."

---

### KPI band composition summary

| # | Tile | Headline | Graphic type | Size | Click action |
|---|------|----------|--------------|------|--------------|
| 1 | Process Health | Integer 0–100 | Semi-circular gauge | 64px diameter | Navigate /analytics |
| 2 | Total Workflows | Integer count | Area sparkline | 120×32px | Scroll to list |
| 3 | Avg Cycle Time | Duration string | Distribution bar + marker | 120×4px | Sort by duration |
| 4 | AI Candidates | Integer count | Stacked proportion bar | 120×8px | Filter automate |
| 5 | Systems Covered | Integer count | Chip cluster | 2-row wrap | Filter by system |

**What is deliberately excluded:** Confidence score average (too abstract without context), cognitive burden (requires explanation), maturity score (same), needs-review count (covered by signal chips in zone 3). Those belong in analytics drill-downs, not in the primary KPI band.

---

## 4. Workflow List UX

### 4.1 Default column set (revised from current 6-column pack)

The redesigned default pack is 7 columns. "Date Recorded" replaces "systems" in the visible default (systems are in tile 5 of the KPI band and in the filter dropdown — they do not need a column by default for most users).

| Position | Column key | Label | Width | Sortable | Notes |
|----------|-----------|-------|-------|----------|-------|
| 1 (locked) | `workflow_title` | Workflow | flex-grow | Yes (name asc/desc) | Always first, locked |
| 2 | `run_count` | Runs | 72px | Yes | Integer, right-aligned. "—" if no runs recorded |
| 3 | `cycle_time_mean_ms` | Avg Cycle | 88px | Yes | Duration string. "—" if N<2 |
| 4 | `last_run_at` | Last Run | 96px | Yes | Relative date ("3 days ago") |
| 5 | `created_at` | Recorded | 96px | Yes | Relative date ("Apr 10") |
| 6 | `opportunity_tag` | Opportunity | 100px | Yes | Colored chip |
| 7 (locked) | `health_score` | Health | 80px | Yes | Integer + mini rail, right-aligned |
| kebab | — | — | 32px | — | Rename / archive / copy link |

**Column key notes:**
- `run_count`: uses `metricsV2.runCount` or falls back to `processDefinition?.runCount`. If the workflow has no process definition, show "1 run" (the recording itself counts as one observation).
- `cycle_time_mean_ms`: uses `metricsV2.cycleTimeMeanMs` when available (Wave B column from WDC-002). Falls back to `durationMs`. Shows "—" with tooltip "Needs 2+ runs" when only one recording exists.
- `created_at`: formatted as short date ("Jun 10") for recent items, "Jun 10, 2025" for items older than 12 months. On hover, a tooltip shows the full ISO date.
- `last_run_at`: same formatting as `created_at` applied to `lastViewedAt`. If null, show "—".

### 4.2 Sort control design

**Column header sort:** Every sortable column header is a button with `aria-sort`. Clicking once sorts ascending; clicking again reverses. The active sort column shows a filled arrow (▲ / ▼). Inactive columns show a neutral double-arrow (⇅) on hover only (not always visible — reduces noise). The double-arrow appears on `focus-visible` even when not hovered.

**Sort menu (overflow):** The toolbar "Sort" dropdown provides all sort options including fields not currently in the visible column set. Options:

```
Sort by
─────────
● Date Recorded (newest first) ← default
  Name (A → Z)
  Runs (most first)
  Avg Cycle Time (longest first)
  Last Run (most recent first)
  Health Score (worst first)
  Opportunity (automate first)
```

The active sort is indicated with a filled dot (●). This dropdown is for users who want to sort by a column they have hidden.

**Default sort:** Date Recorded descending (newest first). Rationale: new users want to see their most recent recordings. Power users wanting health triage use the health score column sort.

### 4.3 Row density

**Row height:** 44px. Current v2 rows are approximately 48–52px. The reduction comes from tighter padding — 8px vertical (was 12px).

**Subtext line under workflow name:** Keep the systems + step count subtext but at 11px, capped to one line, truncated with ellipsis. Example: "Salesforce · Workday  ·  7 steps". Do not show run count in the subtext row — it is now a dedicated column.

**Systems in subtext:** Show the top 2 system names only (truncate with "+N" if more). The systems tile in the KPI band shows the full list.

**Row striping:** No background alternating stripes. Use a 1px bottom border at `var(--border-subtle)`. The current implementation already does this.

**Hover state:** On row hover, show a very subtle `var(--surface-secondary)` background (the current `group-hover` pattern is fine). Do NOT show the kebab menu on hover alone — it jumps the layout. Instead, always reserve the 32px kebab column width; show the button at full opacity on hover and at reduced opacity (20%) at rest. This prevents the layout shift that currently occurs.

### 4.4 Opportunity tag column

Current: colored chip with icon and text. Keep this as-is — it is a good implementation. Add one enhancement: the chip color should match the KPI band segment color for that opportunity type to create visual connection between the top band and the table.

- automate: violet (`bg-violet-50 border-violet-200 text-violet-700`)
- standardize: blue (`bg-blue-50 border-blue-200 text-blue-700`)
- optimize: amber (`bg-amber-50 border-amber-200 text-amber-700`)
- monitor: neutral grey
- healthy: green

### 4.5 Health score column

Current: integer + thin progress rail (1.5px). Upgrade to: integer in color + small 4px-tall colored segment bar showing the 3-band composition of the score (Speed / Consistency / Data Quality / Standardization).

```
Health
  87
  ████░░░░ (4 segments, relative widths)
```

On hover over the health cell, show the breakdown tooltip (current behavior, kept).

For locked users (free tier): show score with lock icon, tooltip shows "Upgrade to see breakdown." This is the current behavior — keep it.

### 4.6 Empty state

**Zero workflows (first-time user):**
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│     [extension icon]                                │
│                                                     │
│     Record any digital process once.                │
│     Ledgerium measures cycle time, identifies       │
│     patterns, and surfaces where your team          │
│     spends time.                                    │
│                                                     │
│     [Install extension to start →]                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```
Centered vertically in the table body. The KPI band above shows all "—" placeholders (not hidden — the band structure is visible to communicate what the user is unlocking).

**Filtered to zero (no-results):**
```
┌─────────────────────────────────────────────────────┐
│   No workflows match your filters.                  │
│   [Clear filters]                                   │
└─────────────────────────────────────────────────────┘
```
Compact — 2 lines. The KPI band above still shows the full portfolio stats (unfiltered), so users can see they have workflows even if the filtered view is empty.

**Loading state:**
5 skeleton rows at 44px height each. Column widths match the actual columns to prevent layout jump on data arrival. Use the `animate-pulse` pattern already in the codebase.

**Sparse state (1–2 workflows):**
Show the workflow rows normally (no separate "sparse" view). The amber sparse notice banner is currently positioned above the table — move it into a persistent callout inside the KPI band tile 2 (Activity tile), replacing the sparkline with a more direct "Record 2 more workflows to unlock comparison" prompt. This is less disruptive than a full-width amber banner.

---

## 5. Interaction Polish: Search, Filter, Columns, Saved Views

### 5.1 The unified toolbar

Replace the three-row control cluster (PresetChipRail + Customize columns button + FilterBar) with a two-row toolbar:

**Row 1 — Data controls (40px):**
```
[Portfolios ▾]  [🔍 Search workflows...]  [Filter ▾]  [Sort: Date ▾]  [⚙ Columns]
```

- **Portfolios dropdown:** replaces the sidebar toggle button. Opens an inline dropdown listing portfolio folders. "All Workflows" is the default item. A "+ Create" option at the bottom. Width: 160px.
- **Search input:** flex-grow (fills remaining space). Same visual as current — magnifier icon, placeholder "Search workflows...".
- **Filter dropdown button:** text "Filter" with a count badge showing active filter count (e.g., "Filter · 2"). Opens a panel (not a modal) below the toolbar showing Systems (multi-select), Health Status (single select), and Opportunity (single select). The panel closes on click-outside.
- **Sort dropdown:** shows the current sort field name, e.g., "Sort: Date ▾". Opens the sort menu described in Section 4.2.
- **Columns gear button:** Icon only (⚙), 32px×32px. Opens the ColumnPicker drawer. Tooltip "Customize columns". This is the same drawer as the current ColumnPicker — keep its internals, just relocate the trigger.

**Row 2 — Preset / saved-view chips (32px):**
```
[All] · [Needs Review] · [AI-Ready] · [High Variation] · [Stale] · [Weekly] · [my_view] · [+ Save view]
```

These chips apply both column config AND data filters simultaneously. A chip that is "active" has a filled background. When active, the filter dropdown badge count reflects the chip's filters.

The "+ Save view" button at the right saves the current combination of visible columns + active filters as a named view. It opens a small inline popover with a text input (name the view, press Enter to save, Escape to cancel).

**Relationship to current PresetChipRail:** This replaces it. The new chips are more powerful (they apply filters, not just column configs). The old PresetChipRail's per-plan gating behavior (team-tier presets disabled) carries over.

### 5.2 Filter panel (expanded from Filter button)

```
┌──────────────────────────────────────────┐
│ Filter                           [Clear] │
├──────────────────────────────────────────┤
│ Health Status                            │
│  ○ All  ○ Healthy  ○ Needs Review        │
│  ○ High Variation  ○ Stale               │
├──────────────────────────────────────────┤
│ Opportunity                              │
│  ○ All  ○ Automate  ○ Standardize        │
│  ○ Optimize  ○ Monitor  ○ Healthy        │
├──────────────────────────────────────────┤
│ Systems                                  │
│  □ Salesforce  □ Workday  □ Excel        │
│  □ Slack  □ Notion  [+ show all]         │
└──────────────────────────────────────────┘
```

Width: 280px. Anchors to the "Filter" button. Closes on click-outside or Escape. Applying any filter immediately updates the table (live filtering — no "Apply" button needed for radio selects). Multi-select systems require a brief debounce (150ms) before filtering.

The current `WorkflowListFilterBar` is replaced by this panel. The "Needs Attention" toggle from the current filter bar becomes a preset chip "Needs Review" in row 2, not a filter panel option.

### 5.3 Column picker drawer

**Keep the existing ColumnPicker drawer** as-is (it is well-implemented). Two changes:

1. The trigger moves from a standalone text button above the table to the ⚙ icon button in toolbar row 1.
2. Add a "Reset to default" link at the bottom of the drawer (calls `setVisibleColumns(DEFAULT_VISIBLE_KEYS)` with no API round-trip needed except the debounced save).

### 5.4 Saved views

**Keep the existing SavedView CRUD** from ColumnPicker. Surface them as chips in toolbar row 2 alongside the preset chips. When a saved view is active, its chip has a filled background. A long-press or right-click on a saved-view chip shows a mini context menu: "Rename" / "Delete".

**Discoverability improvement:** When no saved views exist, the "+ Save view" button in the chip row has a subtle animation on first visit (a soft pulse, once, that stops after 3 seconds). This draws attention to the feature without being intrusive.

### 5.5 Search behavior

- Debounce: 200ms (same as current).
- Live results update: table updates in place without a loading state for searches that return quickly (< 100ms). For slower responses, show a thin loading bar at the top of the table body.
- Keyboard: pressing Escape clears the search field and returns focus to the search input (so the user can type again). Pressing Escape a second time collapses the active filter state entirely if no text is in the input.
- "No results" state: inline in the table body with a one-line message and "Clear" link. Does not clear the KPI band.

---

## 6. Modern Visual System

### 6.1 Spacing

Adopt an 8px base unit with a 4px half-step. All padding, gap, and margin values are multiples of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Internal chip padding, icon gutters |
| `--space-2` | 8px | Row padding top/bottom, badge padding |
| `--space-3` | 12px | Table cell padding horizontal |
| `--space-4` | 16px | Card internal padding, section gap |
| `--space-6` | 24px | Section spacing (between zones 1–4) |
| `--space-8` | 32px | Page horizontal gutter |

The current codebase uses `ds-*` tokens (px-ds-4, py-ds-3 etc.) which map to a similar scale. These tokens are compatible — the redesign uses the same system, just tightens some of the vertical padding.

### 6.2 Typography

| Role | Size | Weight | Line height | Color token |
|------|------|--------|-------------|-------------|
| Page title | 20px | 600 | 1.25 | `--content-primary` |
| KPI headline number | 28px | 600 | 1 | Context-dependent (see tiles) |
| KPI tile label | 10px | 500 | 1.2 | `--content-secondary` uppercase tracked |
| KPI subtext | 12px | 400 | 1.4 | `--content-tertiary` |
| Table column header | 12px | 500 | 1.2 | `--content-secondary` uppercase tracked |
| Row primary text | 14px | 500 | 1.4 | `--content-primary` |
| Row subtext | 11px | 400 | 1.3 | `--content-tertiary` |
| Chip label | 12px | 500 | 1.2 | Context-dependent |
| Tooltip | 12px | 400 | 1.4 | `--content-primary` on `--surface-elevated` |

The current type scale is already close. The main change: the table column headers move from `text-[12px] font-medium text-[var(--content-secondary)]` to `text-[11px] font-medium text-[var(--content-tertiary)] uppercase tracking-wider`. This reduces visual competition with row content.

### 6.3 Color

The Ledgerium brand green (`#22c55e` approximation, `var(--brand-500)`) is used for:
- Active states (selected chip, active sort arrow)
- Primary CTA button
- KPI band sparkline fill
- Focus rings (`focus-visible:ring-green-500`)

No new colors. The three health bands (red / amber / green) are standard Tailwind `red-600` / `amber-600` / `green-600` for text, with corresponding `50` and `200` variants for backgrounds and borders. This matches the current implementation.

**Dark mode:** The current implementation uses CSS custom properties (`var(--surface-primary)`, `var(--content-primary)`, etc.). The redesign is compatible with this system — no new hard-coded colors.

### 6.4 Card treatment

KPI tiles: white background (`var(--surface-elevated)`), `1px solid var(--border-default)` border, `8px` border-radius, `16px` padding, `shadow-sm` (0 1px 3px rgba(0,0,0,0.06)). No heavy card shadow — these sit in a light band, not floating.

On hover: border color transitions to `var(--border-focus)` (or `--brand-200`) at `150ms`. This is the same pattern as current workflow row hover.

### 6.5 Table visual treatment

**No card wrapper around the table.** The table sits on the page background directly. The toolbar rows above it have a `1px border-bottom` to visually separate controls from content. The table header row has a `1px border-bottom` (current implementation already does this with `border-b border-[var(--border-subtle)]`).

**Row separators:** 1px `var(--border-subtle)` lines between rows. No outer border on the table. This is the current behavior — keep it.

**Sticky header:** `position: sticky; top: 48px; z-index: 10; background: var(--surface-primary);`. The `top: 48px` offsets below the app navigation bar (assumed to be 48px). This requires the page-level `overflow: auto` to be on the main content scroll container, not the document body.

### 6.6 Honesty conventions (non-negotiable)

- Any metric that requires N ≥ 2 workflows to be meaningful shows "—" not a fabricated or extrapolated value. The `formatCellValue` helper already does this for `null` — extend it to also handle `undefined` and `0` when 0 would be meaningless (e.g., `avgDuration = 0` when no workflows have duration data).
- The delta on the health gauge shows "—" (not "+0") when `portfolioHealthScoreDelta === null`.
- The distribution bar on tile 3 (Avg Cycle Time) shows a flat line if min === max (single workflow or identical durations), not a false range.
- Opportunity tag stacked bar on tile 4 shows empty state message if all tags are null/undefined, rather than a bar of one solid color that might suggest all workflows are in one bucket.

---

## 7. P0–P2 UX Punch-list

Items are mapped to the component they affect and the effort level (S = small, M = medium, L = large).

### P0 — Must ship before any public-facing release

| ID | Issue | Component | Fix | Effort |
|----|-------|-----------|-----|--------|
| UX-P0-01 | No "Date Recorded" column visible by default. Users cannot determine recency without opening each workflow. | `WorkflowList` (default column pack) | Add `created_at` to `DEFAULT_VISIBLE_KEYS` at position 5 (before `opportunity_tag`). Remove `systems` from default pack — it is now in the KPI band. | S |
| UX-P0-02 | No run count column visible by default. Run count is a primary quality signal for process intelligence — a workflow with 1 run is an observation, not a pattern. | `WorkflowList` (default column pack) | Add `run_count` to `DEFAULT_VISIBLE_KEYS` at position 2 (after workflow title). | S |
| UX-P0-03 | Three separate overlapping control surfaces (PresetChipRail + "Customize columns" button + FilterBar) produce six horizontal bands before content. Users do not understand which surface does what. | `DashboardV2Shell`, `WorkflowList` | Consolidate to a two-row unified toolbar per Section 5.1. The filter panel replaces `WorkflowListFilterBar`. | L |
| UX-P0-04 | The portfolio health score (the page's primary number) is right-aligned and visually smaller than the page title due to competing elements. It is the last thing a user reads on an F-pattern scan. | `CommandHeader` | Redesign header per Section 2 Zone 1. Move score into KPI band tile 1 per Section 3 Tile 1. | M |
| UX-P0-05 | The insight chip row (`InsightsStrip`) and the top-signal chips in the v1 dashboard (still accessible via `?v2=0`) communicate the same signals with different layouts. If/when v1 is retired, the v2 insight strip must carry all critical signals. Audit: confirm `InsightsStrip` covers needs-review count, AI candidates count, stale count. | `InsightsStrip`, `computeInsightChips` | Verify all critical signal types from v1 are produced by `computeInsightChips`. Add any missing chip types. | S |

### P1 — Must ship before GA launch

| ID | Issue | Component | Fix | Effort |
|----|-------|-----------|-----|--------|
| UX-P1-01 | KPI band does not exist in v2. The top of the page shows only a health score number and the insight strip. There are no at-a-glance graphics. | New `KpiBand` component | Build per Section 3 specification. 5 tiles: health gauge, activity sparkline, cycle time distribution, AI candidates stacked bar, systems chip cluster. | L |
| UX-P1-02 | Sort only covers 3 fields (health_score, name, opportunity). Runs, Avg Cycle Time, Last Run, and Date Recorded are not sortable. | `WorkflowList` sort logic + `SortButton` | Add sort fields: `run_count`, `cycle_time_mean_ms`, `last_run_at`, `created_at`. Extend `SortState` type. Add sort options to sort dropdown (toolbar row 1). | M |
| UX-P1-03 | Row hover reveals the kebab menu by changing it from hidden to visible, causing a layout shift that makes adjacent content jump. | `WorkflowRow` | Always render the kebab column at full width (32px). Animate opacity 0.2 → 1.0 on hover, no layout shift. The current `opacity-0 group-hover:opacity-100` is correct but verify no `display: none` is present. | S |
| UX-P1-04 | The "Customize columns" trigger button is visually isolated from the preset chip rail and the filter bar, making it unclear that these three surfaces are all about the same "view" concept. | `DashboardV2Shell` | Move trigger into toolbar row 1 as a ⚙ icon button (Section 5.1). | S |
| UX-P1-05 | Health score progress rail is 1.5px tall — too thin to be read at a distance or by users with reduced visual acuity. | `WorkflowRow` health cell | Increase rail height to 4px. Consider showing colored dot badges instead of the rail for the breakdown tooltip preview. | S |
| UX-P1-06 | The `created_at` date of each workflow (when it was recorded) is not visible anywhere in the default view. A user with 20 workflows cannot tell which are recent without opening each. | `WorkflowRow`, column registry | Add `created_at` column rendering. Format as short date (e.g., "Jun 10") with full date on hover tooltip. | S |
| UX-P1-07 | Preset chips (PresetChipRail) apply column configurations only, not data filters. A user clicking "AI-Ready" expects to see only AI-candidate workflows. Currently it changes columns but not rows. | `PresetChipRail`, `DashboardV2Shell` | Extend preset definitions to include `filters: FilterSet` alongside `visibleColumns`. When a preset is applied via `handleApplyPreset`, also call `onFiltersChange` with the preset's filter values. | M |
| UX-P1-08 | The portfolio sidebar is collapsed by default and the toggle button is small and unlabeled on mobile. Portfolio navigation is a core organizational feature but is visually buried. | `DashboardV2Shell`, toolbar | Replace the sidebar toggle with a "Portfolios" dropdown in toolbar row 1 (Section 5.1). | M |

### P2 — Meaningful improvement, defer if necessary

| ID | Issue | Component | Fix | Effort |
|----|-------|-----------|-----|--------|
| UX-P2-01 | The table header row does not stick to the viewport on scroll for long lists. Users lose column context when scrolling past row 10. | `WorkflowList` `<thead>` | Add `position: sticky; top: 96px` (offset = nav height + page header height). Set background to `var(--surface-primary)` on the sticky row to prevent see-through. | S |
| UX-P2-02 | No visual indicator of which preset or saved view is active once the user scrolls past the chip row. A user who applied "Needs Review" and scrolled down to the table has no reminder of the active filter context. | `WorkflowList` filter bar / toolbar | Show the active filter state as a compact badge in the table header row: "Filtered: Needs Review ✕" with a dismiss button. This is a single line in the sticky header. | S |
| UX-P2-03 | The insights strip chips (`InsightsStrip`) are dismissible per session but the dismissal state is not communicated to the user. Dismissed chips simply vanish without confirmation. After refresh they reappear. | `InsightsStrip` | On dismiss, briefly show "Dismissed until refresh" as a 1s fade-out tooltip. This sets accurate expectations about the non-persistent behavior. | S |
| UX-P2-04 | The sparse state banner ("Record 2 more workflows to unlock...") is an amber full-width banner that competes visually with error states. It is not an error — it is an activation prompt. | `WorkflowList` sparse state | Replace the amber banner with an inline nudge card within the table body after the last workflow row, using neutral styling. Or move it into KPI tile 2 (activity sparkline) as described in Section 4.6. | S |
| UX-P2-05 | The time range selector (7d / 30d / 90d / All) applies only to the workflow list — it does NOT filter the KPI band stats. This is not communicated to the user. A user selecting "7d" and seeing the KPI band still show "24 total workflows" will be confused. | `CommandHeader`, `DashboardV2Shell`, KPI band | Option A: apply time range to KPI band (requires API change — significant). Option B (recommended): add a sub-label "Showing all time" under the KPI band with a link to the time range selector. This makes the disconnect explicit. | S (Option B) |
| UX-P2-06 | The "Cycle Time" column label is ambiguous — it could mean "how long one step takes" or "how long the whole process takes." The column shows end-to-end process duration. | `WorkflowList` column header, `dashboard-columns/registry.ts` | Rename column label from "Cycle Time" (or "Avg Cycle") to "Avg Duration" for the dashboard. "Cycle Time" is a formal process-mining term; "Avg Duration" is immediately understandable. Update the column description accordingly. | S |
| UX-P2-07 | The kebab menu on workflow rows has three options (Rename, Archive, Copy Link). "Copy Link" is buried inside the kebab. For a tool that aims to be shared with teams, link copying should be more prominent. | `WorkflowRow` kebab menu | Add a hover-revealed "Copy link" icon button (chain link icon) directly on the row, to the left of the kebab. 24×24px, opacity 0.3 at rest, 1.0 on row hover. | S |
| UX-P2-08 | The column picker drawer (`ColumnPicker`) has no "Reset to defaults" affordance. Users who have heavily customized their columns have no easy way to return to the default pack. | `ColumnPicker` | Add a "Reset to defaults" link at the bottom of the drawer (Section 5.3). | S |

---

## Assumptions and Handoff Notes

**Assumptions affecting implementation:**

1. The KPI band (Zone 2) derives the sparkline for Tile 2 client-side from `allWorkflows.map(w => w.createdAt)`. No new API field is required.

2. The distribution bar min/max for Tile 3 is derived client-side from `allWorkflows.map(w => w.metricsV2.cycleTimeMeanMs ?? w.durationMs)`. No new API field required.

3. The stacked proportion bar for Tile 4 is derived client-side from `allWorkflows.map(w => w.metricsV2.opportunityTag)`. No new API field required.

4. The systems chip cluster (Tile 5) uses `stats.systemCoverage` which is already returned by `/api/workflows`. No new API field required for basic rendering; per-system click-to-filter uses the existing `filters.systems` state.

5. `run_count` as a default visible column requires `metricsV2.runCount` to be populated. If that field is not yet available in the wave B statistics (WDC-002 #101), fall back to `processDefinition?.runCount` and then to `1` as a minimum. The "—" state only fires when the field returns null explicitly.

6. The health gauge SVG arc can be implemented as an SVG `<path>` or `<circle>` with `stroke-dashoffset`. Recharts is already in the dependency list (used in admin operations dashboard) — it provides `RadialBarChart` or `PieChart` that can render the half-circle. Use whichever is less markup.

7. The sparkline (Tile 2) can be implemented with Recharts `AreaChart` at `width={120} height={32}` with `margin={{ top: 0, right: 0, bottom: 0, left: 0 }}`, axes hidden, and tooltip disabled. This is a display-only component.

8. Font rendering: the `tabular-nums` class should be applied to all numeric KPI tile values to prevent layout shift as numbers change on data load. The current `CommandHeader` already does this for the health score.

**Frontend engineering notes:**

- The KPI band tiles should each be their own small component file (e.g., `KpiHealthGauge.tsx`, `KpiActivitySparkline.tsx`, `KpiCycleTile.tsx`, `KpiAiTile.tsx`, `KpiSystemsTile.tsx`) assembled in a parent `KpiBand.tsx`. This matches the existing component-per-concern pattern.
- All KPI tiles receive their data as props from `DashboardV2Shell` — no additional fetches. The existing `/api/workflows` response already contains all required fields.
- The unified toolbar replaces `WorkflowListFilterBar` and the existing `PresetChipRail`-plus-columns-button region. The `WorkflowListFilterBar` component can be refactored into a `FilterPanel` (the dropdown panel content) while the toolbar chrome lives in `DashboardV2Shell`.

**QA validation targets:**

- KPI band renders all 5 tiles in loading, empty, sparse (1–2 workflows), and populated states.
- All 5 tiles show "—" or appropriate empty-state copy when data is absent — never fabricated numbers.
- Sort by each of the 7 sortable fields produces correctly ordered rows (test with at least 5 workflows of known values).
- The "Date Recorded" column shows the workflow's `createdAt` date correctly formatted, not the `lastViewedAt` or `updatedAt` dates.
- Clicking any KPI tile that applies a filter (tiles 3, 4, 5) updates the workflow table and shows the active filter badge in the toolbar.
- The ColumnPicker "Reset to defaults" link restores the 7-column default pack and triggers a debounced save.
- Pressing Escape from inside the ColumnPicker drawer returns focus to the ⚙ trigger button.
- Row hover does not cause a layout shift (kebab column is always reserved at 32px).
- The health rail renders at 4px height at all viewport widths.
