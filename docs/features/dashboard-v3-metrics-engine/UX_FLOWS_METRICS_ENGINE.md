# UX Flows — Process Intelligence Metrics Engine (v3)

**Status:** Define-phase artifact
**Date:** 2026-04-21
**Source spec:** `docs/features/dashboard-v3-metrics-engine/INPUT_SPEC.md`
**Reviews grounding:** `docs/meta/DASHBOARD_V2_REVIEW_001.md`
**v2 surface baseline:** `apps/web-app/src/components/dashboard-v2/` (6 components)
**Consumers:** frontend-engineer, qa-engineer, product-manager, system-architect

---

## 1. Design Intent

v3 exposes a 90-metric Process Intelligence Metrics Engine behind a surface that defaults to eight top-line verdicts per workflow row, offers one-click drill-down to full metric depth, and gates the portfolio view on multi-team data availability. The governing principle from INPUT_SPEC § Final Recommendation is "simple top-line metrics + deep drill-down + explainable opportunity scoring — do not make the dashboard a wall of KPIs; make the engine broad but the UI selective." v3 extends v2's proven scan-order (Command Header → Insights Strip → Workflow Intelligence List) rather than replacing it: the 4-column verdict grid becomes a configurable N-column metrics grid whose default set is chosen by executive directive. The column picker, saved views, and per-cell drill-down are additive surfaces that unlock metric depth progressively without demanding it upfront. Users who never touch the column picker get a better-informed v2; users who need step-duration distributions and bottleneck radar can reach them in two clicks.

---

## 2. CEO-Directed Default Columns

The CEO directive specifies nine default columns. v2 shipped four (WorkflowRow.tsx: Name / Systems / Opportunity / Health Score). v3 expands to nine while preserving v2's visual register.

### 2.1 Column Set

| # | Column | Primary value shown | Subtext / secondary | Source (INPUT_SPEC layer) |
|---|--------|---------------------|---------------------|---------------------------|
| 1 | Workflow Name | Title (truncated to 1 line) | Stacked: tools used · avg processing time · avg cycle time · run count | Layer 1 + Layer 2 |
| 2 | Systems | Unique system count (integer) | Avg processing time per system in tooltip | Layer 5 |
| 3 | Flow Efficiency % | `flow_efficiency_pct` integer with % unit | — | Layer 1 |
| 4 | Variants + Variation Rate | `variant_count` / `deviation_rate_pct` stacked | — | Layer 3 |
| 5 | Longest Step | Duration in human-readable format | Tool name of longest-duration step | Layer 2 |
| 6 | Avg Actions/Step | `clicks_per_run / step_count` | — | Layer 5 |
| 7 | App Switching | `application_switch_rate` per run | — | Layer 5 |
| 8 | Process Health Score | 0–100 integer + 3-band rail | Sub-score breakdown in tooltip | Layer 9 |
| 9 | Bottleneck Severity | `bottleneck_impact_score` 0–100 | Bottleneck step name in subtext | Layer 6 |

### 2.2 Visual Hierarchy Rules

Column 1 (Name) carries the most horizontal space: minimum 28% of table width at 1280px. All other columns share the remaining 72% equally (9% each at 8 remaining columns), with columns 3–9 being numeric and right-aligned. Column 2 (Systems) uses the existing pill treatment from WorkflowRow.tsx (max 3 pills + "+N" overflow) and adds a count integer in 14px/medium weight as the primary scannable value.

**Data density rule:** Each cell must have a single primary value legible at 14px/medium tabular-nums weight. Subtext is 12px/normal, color `var(--content-tertiary)`. No cell shows more than two lines of text. No cell shows more than one primary numeric value (stacked cells like Column 4 are an exception — both values are displayed at 12px/medium with a separator dot between them).

### 2.3 Truncation and Overflow

- Workflow Name: single-line truncation at container boundary; full title in `title` attribute for browser tooltip.
- Subtext line in Column 1: max two lines; truncate with ellipsis at line 2.
- Tool name in Column 5: max 16 characters; truncate with ellipsis; full name in aria-label.
- All numeric cells: tabular-nums; no truncation (numbers are never longer than 6 characters at expected scale).
- Pill overflow in Column 2: max 3 pills visible, "+N more" pill triggers a non-native popover listing all systems (Escape closes — see Section 11, DV2-R03 precedent).

### 2.4 Empty and Low-Confidence States Per Column

Every column follows the state taxonomy in Section 10. Column-specific rules:

- **Column 1 subtext:** when `avg_processing_time_ms` is null, omit that subtext token; do not show "—" in the middle of a subtext line. Render remaining tokens only.
- **Column 3 (Flow Efficiency):** when denominator `cycle_time_ms` = 0 or null, render "—" with aria-label "Flow efficiency: not available". Never show "0%" when the value is genuinely null — a 0% efficiency claim is factually different from a missing value.
- **Column 4 (Variants):** when `variant_count` = 1 and `deviation_rate_pct` = 0, render "1 variant · 0% deviation" using `var(--content-tertiary)` — low-salience because this is a good signal. When variant_count > threshold configured in workspace settings, render the variant count in amber with AlertTriangle icon (same pattern as v2 WorkflowRow.tsx high-variation badge, line 461–469).
- **Column 5 (Longest Step):** null → "—". Duration present but tool name null → show duration only, no subtext.
- **Column 8 (Health Score):** extends v2 WorkflowRow.tsx HealthTooltip. The existing 4-dimension breakdown tooltip is the starting point. v3 adds: confidence_score_0_100 from `metric_fact` displayed as "Data confidence: N%" when confidence < 80. Uses same `showTooltip` toggle pattern — click cell to open, Escape to close (fixes DV2-R03).
- **Column 9 (Bottleneck Severity):** 0 score renders as green "None detected" text (positive signal, not "—"). Score 1–39 renders in `var(--content-secondary)`. Score 40–74 renders in amber. Score 75–100 renders in red with AlertTriangle icon (same semantic hue rules as PRD_DASHBOARD_V2 §5.4).

---

## 3. Column Picker UX

### 3.1 Entry Point

A "Columns" button sits in the WorkflowList filter bar, to the right of the existing filter controls. It uses the `Columns3` icon (already imported in DashboardV2Shell.tsx line 31 and WorkflowList.tsx line 32 — reuse, do not re-import). Button label: "Columns" visible at ≥ 640px, icon-only below. Button state: default (outline), active (filled background using `var(--surface-secondary)`) when any non-default column configuration is active. aria-label: "Configure visible columns". aria-expanded on the panel.

Entry point MUST NOT use the Portfolios button pattern in WorkflowList.tsx (sidebar open/close toggle) — columns panel is a different interaction mode. The Portfolios button (line 315–336 of WorkflowList.tsx) is a full sidebar; the column picker is a focused panel that does not shift the table layout.

### 3.2 Picker Surface

The column picker is a **right-anchored drawer panel** that slides in from the right edge of the workflow table area. It does NOT use a modal or `window.prompt`/`window.confirm` (DV2-R02 no-go). It does NOT use a native `<dialog>` element (DV2-R02 no-go — use a custom `role="dialog"` div with focus trap).

Drawer dimensions: 320px wide, full height of the viewport content area. Sits above the table via z-index but does not overlay the CommandHeader or InsightsStrip. Table content compresses to remaining width (min-width: 640px before columns start hiding per responsive rules).

Focus trap: when drawer opens, focus moves to the drawer's first interactive element (search input). Tab cycles within drawer. Escape closes the drawer and returns focus to the "Columns" trigger button. This pattern is required to avoid DV2-R03 recurrence.

### 3.3 Picker Layout (ASCII sketch)

```
┌─────────────────────────────────────┐
│ Configure Columns          [×] close │  ← close button, aria-label "Close column picker", Escape also closes
├─────────────────────────────────────┤
│ [🔍 Search metrics...           ]   │  ← text input, aria-label "Search available metrics"
├─────────────────────────────────────┤
│ Filter: [All] [Tier A only]          │  ← toggle, default All
├─────────────────────────────────────┤
│ ACTIVE (9)                           │  ← sticky section header
│  ≡  Workflow Name          [pinned]  │  ← drag handle (≡) + label + pin badge (unpinnable)
│  ≡  Systems                [×]       │  ← drag handle + remove button
│  ≡  Flow Efficiency %      [×]       │
│  ... (all 9 active)                  │
├─────────────────────────────────────┤
│ AVAILABLE — Layer 1: Operational     │  ← collapsible category
│  ○  Cycle Time (median)    [+]       │
│  ○  Throughput Time        [+]       │
│  ○  Wait Time              [+]       │
│  ...                                 │
│ AVAILABLE — Layer 2: Step Performance│  ← collapsible category
│  ...                                 │
├─────────────────────────────────────┤
│ [Reset to defaults]  [Apply]         │  ← footer actions
└─────────────────────────────────────┘
```

### 3.4 Metric Categorization

Categories map to INPUT_SPEC § 5 nine layers exactly:
- Layer 1: Operational Flow
- Layer 2: Step Performance
- Layer 3: Variation and Conformance
- Layer 4: Quality and Outcome
- Layer 5: Human/Task Behavior
- Layer 6: Bottleneck and Constraint
- Layer 7: Automation and AI Opportunity
- Layer 8: Financial
- Layer 9: Composite Scores

Each layer is a collapsible section (disclosure pattern, `<details>/<summary>` or equivalent accessible equivalent). Default: all collapsed except the layer containing the currently active columns. Search overrides collapsed state — all matching metrics shown expanded.

**Tier-A-only toggle:** shows only the INPUT_SPEC § Default Metric Pack primary KPIs (8 metrics) + secondary drill-down (7 metrics) = 15 total. This is the onboarding-safe view. Toggle label: "Essentials only". Default: off (show all).

### 3.5 Add, Remove, Reorder

- **Add:** Click the [+] button on an available metric row. It moves immediately to the ACTIVE section at the bottom of the list. No confirmation required.
- **Remove:** Click the [×] button on an active metric row. It moves to the AVAILABLE section under its layer category. Pinned columns (Workflow Name + Process Health Score, per Section 5 pinned column strategy) show "pinned" badge instead of [×]. Attempting to add more than 12 active columns: the [+] button disables and shows a tooltip "Maximum 12 columns. Remove a column first." (tooltip is keyboard-accessible, Escape closes, per DV2-R03 pattern).
- **Reorder:** Drag the ≡ handle. For keyboard reordering: when focus is on a drag handle, Space activates pick-up mode; Arrow Up/Down moves the column; Space drops it. Screen reader announces: "Moved [column name] to position [N]." This satisfies the keyboard-reorderable requirement without mouse-only drag.

### 3.6 Preview Before Commit

The drawer operates in **live preview mode**: as the user adds, removes, or reorders columns, the table behind the drawer updates immediately (optimistic UI, no Apply needed for add/remove/reorder). The "Apply" button in the footer persists the configuration to user state (API call). "Reset to defaults" reverts to the CEO-directed 9 columns without persisting until Apply is pressed.

If the drawer is closed via Escape (without pressing Apply), the configuration reverts to the last persisted state. A tooltip on the close [×] button reads "Close without saving" when changes are pending.

### 3.7 Persist to User State

Column configuration is stored per-user, per-workspace. Storage key: `column_config_v1` in user preferences (API endpoint: `PATCH /users/preferences`). On first load, if no saved config exists, the CEO-directed 9-column default is applied. If a saved config references a metric key that no longer exists (metric version removed), that column is silently dropped and a warning chip appears in the InsightsStrip: "Your saved columns include 1 deprecated metric. Open column picker to review."

---

## 4. Saved Views UX

### 4.1 Create and Name

A "Save view" button appears in the filter bar, to the right of the "Columns" button. It is only active (not disabled) when either a non-default column configuration or a non-empty filter state is present.

Click "Save view": opens an **inline popover** (not a modal, not a native dialog — DV2-R02 no-go) anchored below the button. Popover contains: text input for view name (auto-focused), [Save] button, [Cancel] button. Escape closes the popover and cancels. Focus trap: Tab cycles between input, Save, Cancel.

**Auto-name fallback:** if the user presses Save with a blank or whitespace-only name, the view is saved with an auto-generated name: "[Top metric label] + filter summary". Example: "Flow Efficiency · Automate filter". The auto-name is shown in the text input as placeholder text, not value, so the user can see it but is not committed to it until they press Save.

**"Untitled" is not valid.** The Save button does not fire if the name field is empty and the auto-name computation returns null (this should not happen in practice; the auto-name algorithm always produces at least one token).

### 4.2 Default View Precedence

When the dashboard loads, the active view is determined by this priority order (highest to lowest):

1. Org-pinned view (admin-designated, applies to all users in the workspace)
2. Team-pinned view (team admin-designated, applies to team members)
3. User-saved view marked as default (user explicitly set this as their default)
4. User most-recent view (last view the user was on when they left the dashboard)
5. System default (CEO-directed 9 columns, no active filters)

The active view name is shown in the filter bar as a breadcrumb chip to the left of the "Columns" button: "[View name] ×". Clicking × on the breadcrumb returns to system default.

### 4.3 Sharing (v1)

v1 ships **copy-link (read-only)** only. Share mechanism: "Copy link" in the view overflow menu (kebab on the saved view chip) copies a URL with the view configuration encoded as query params. Recipients who open the link see the view applied but cannot edit it unless they save their own copy.

**Copy-template (fork)** — where the recipient gets a full editable copy of the view's column config and filter state — is deferred to v2 of the saved-views feature. Rationale: v1 sharing intent is "show a colleague what you're looking at"; forking adds state management complexity that is out of scope for the initial build.

### 4.4 View Management Surface

A "Views" dropdown in the filter bar lists all saved views. Each entry has a kebab menu: Set as default, Rename, Duplicate, Delete. "Set as default" replaces the current user-default view. Delete confirmation uses an **inline confirmation pattern** (button label changes to "Confirm delete" for 3 seconds, click again to confirm) — no native `window.confirm` (DV2-R02 no-go).

---

## 5. Column Overflow Strategy

At 1280px viewport width with 9 default columns, the table is dense but functional. With user-added columns (up to 12 max), overflow is expected.

### 5.1 Primary Strategy: Pinned Columns + Horizontal Scroll

**Pinned columns (always visible):** Workflow Name (Column 1) and Process Health Score (Column 8) are pinned to left and right respectively, using CSS `position: sticky`. They never scroll out of view. This matches the "name always visible, verdict always visible" principle of the v2 4-column design.

**Scrollable middle columns:** Columns 2–7 (and any user-added extras) scroll horizontally within the table. The scroll region has a visible scrollbar (not `overflow: auto` with no indicator — users must know scrolling is available). A subtle gradient fade on the right edge of the sticky name column indicates more content is scrollable. At maximum 12 columns, the scrollable region may require up to ~400px of horizontal scroll on a 1280px viewport.

**Column header sticky row:** the column header row (`<thead>`) is `position: sticky; top: 0` so headers remain visible during vertical scroll. This is already implied by the `<table>` structure in WorkflowList.tsx.

### 5.2 Fallback Strategy: Priority Collapse

If the user's viewport is narrower than 1024px (or if the user has enabled an explicit "compact" density mode — see Section 12), columns collapse in reverse priority order:
- Collapse first: App Switching (Column 7), Avg Actions/Step (Column 6)
- Collapse second: Variants + Variation Rate (Column 4), Longest Step (Column 5)
- Always visible: Workflow Name, Systems (count only), Flow Efficiency %, Process Health Score

This matches the existing v2 responsive breakpoint pattern in WorkflowRow.tsx (Systems hidden < 768px, Opportunity hidden < 480px). Each collapsed column's value moves into a "More" expandable section within the Name cell on mobile, identical to the existing v2 subtext pattern.

**Card layout** is explicitly NOT the primary or fallback strategy for this surface. Cards would break the comparative scan-across-rows purpose of the metrics grid. Cards are appropriate for the workflow detail view (Section 7), not the list.

---

## 6. Per-Cell Drill-Down Affordance

### 6.1 Hover Reveal (Definition + Formula)

On mouse hover over any metric cell (not the Name cell), a non-intrusive **info popover** appears after a 400ms delay (long enough to avoid noise during scanning, short enough to be discoverable). The popover contains:

- Metric label (14px/medium)
- One-sentence definition (12px/normal)
- Formula (12px/normal, monospace for the formula string itself)
- Last computed timestamp (12px/tertiary): "Updated 2 hours ago"
- If confidence_score_0_100 < 80: a warning row in amber — "Low confidence (score: N). Based on N runs." Per INPUT_SPEC § 9, confidence drops on too few runs, timestamp gaps, ambiguous step labeling, clustering uncertainty.

The popover appears on hover AND on keyboard focus (Tab focus on the cell triggers it). Escape closes it. This pattern resolves DV2-R03 directly: all popovers in v3 must have a keyboard-accessible dismiss path.

**DV2-R03 explicit guard:** every popover in v3 registers a `keydown` listener for Escape on mount and removes it on unmount. No popover in v3 relies on click-outside-only as the sole close mechanism. This must be enforced in the component contract for `MetricCellPopover` (the shared primitive for all per-cell popovers).

The popover does NOT auto-trigger on hover for screen reader users (screen reader mode disables hover-triggered content per WCAG 2.1 SC 1.4.13). Instead, screen reader users receive the metric definition inline in the aria-label of the cell.

### 6.2 Click to Drill Down

Clicking any metric cell (except the Name cell, which navigates to the workflow detail page) opens the **Workflow Detail View** (Section 7) filtered to that metric's layer. The cell click does not navigate away from the dashboard — the detail view opens as a slide-over panel from the right (same drawer pattern as the column picker, 560px wide), allowing comparison across rows by closing the panel and clicking a different row.

This avoids the navigational disruption of full-page navigation for comparative analysis, while still offering full-page navigation via the workflow Name cell for deep-dive work.

### 6.3 Lineage Drill-Through (INPUT_SPEC § 9)

From the per-cell popover, a "See source data" link opens a secondary popover panel showing:
- Source runs that contributed to this metric (run IDs, timestamps)
- Calculation version (`metric_version` from `metric_fact`)
- Filter hash (shows if the value was computed under a filter)

This is Phase 2 data availability — the "See source data" link is disabled (visually dimmed) until the lineage API is available. Its presence signals to users that the capability exists, without creating dead links.

---

## 7. Workflow Detail View

### 7.1 Surface

The detail view is a **full-page route** at `/workflows/[id]` (the existing route from WorkflowRow.tsx `handleRowClick`). It also doubles as a slide-over panel when accessed from the metric cell drill-down (Section 6.2). Both entry points render the same component hierarchy; layout differs based on whether the component is mounted full-page or in the slide-over container.

### 7.2 Component Hierarchy and Scan Order

```
WorkflowDetailView
├── DetailHeader                       [always shown]
│   ├── WorkflowTitle (editable inline)
│   ├── ProcessGroupBreadcrumb (if process_group_id exists)
│   ├── LastRecorded + RunCount
│   └── QuickActions (kebab: rename, archive, copy link — NO native dialogs)
│
├── KPIStrip                           [always shown — Phase 1 data]
│   ├── ProcessHealthScore (large, with band color + tooltip breakdown)
│   ├── FlowEfficiency %
│   ├── MedianCycleTime
│   ├── RunCount
│   ├── StandardizationScore
│   └── AutomationReadinessScore
│
├── ProcessPathSection                 [Phase 1 — if variant data available]
│   ├── HappyPathSummary (top variant share %, step count)
│   └── TopVariantsTable (top 3 variants by run share, collapsible)
│
├── StepDurationDistribution           [Phase 2 — requires step-level metrics]
│   ├── SectionHeader + Phase2Gate (shown if data unavailable)
│   └── StepBarChart (horizontal bars per step, sorted by duration desc)
│
├── BottleneckRadar                    [Phase 2 — requires bottleneck engine]
│   ├── SectionHeader + Phase2Gate
│   └── BottleneckList (top 3 steps by bottleneck_impact_score)
│
├── ReworkLoopInsights                 [Phase 1 — if rework_rate_pct computed]
│   ├── ReworkRateDisplay
│   └── LoopPatternList (collapsible, max 3 shown)
│
├── UserTeamVariance                   [Phase 2 — requires user/team metrics]
│   ├── SectionHeader + Phase2Gate
│   └── VarianceComparison (top performer vs median)
│
├── AIAutomationOpportunities          [Phase 1 — uses existing aiOpportunityScore]
│   ├── AutomationReadinessScore (0–100)
│   ├── OpportunityClassList (from INPUT_SPEC § 7 opportunity classes)
│   └── EstimatedSavings (if configured; null state: "Configure cost assumptions in settings")
│
└── TrendOverTime                      [Phase 2 — requires time-series rollups]
    ├── SectionHeader + Phase2Gate
    └── SparklineRow (health score trend, cycle time trend)
```

### 7.3 Progressive Disclosure Strategy

- **Phase 1 sections** (KPIStrip, ProcessPath, ReworkLoop, AIOpportunities): always rendered with real data when available.
- **Phase 2 sections** (StepDuration, BottleneckRadar, UserTeamVariance, TrendOverTime): rendered with a **Phase2Gate** placeholder that says: "Available when step-level metrics are computed." Gate is a static informational section with no spinner — it communicates future availability, not current loading.
- **Collapsible sections:** ProcessPathTopVariants, ReworkLoopPatternList, OpportunityClassList are collapsed by default (show first item visible, expand button). This keeps the detail view scannable for most users while supporting depth for power users.
- **Section ordering follows the scan path:** executive verdict (KPI strip) → process structure (path + variants) → timing detail (step duration, bottleneck) → behavioral detail (user variance) → opportunity (automation) → historical context (trend).

### 7.4 Phase 2 Gate Component

```
┌─────────────────────────────────────────────────────┐
│  [Clock icon]  Step Duration Distribution            │
│  Available after step-level metrics are computed.    │
│  Record more workflows to unlock this analysis.      │
└─────────────────────────────────────────────────────┘
```

The gate is a neutral info-register box (no amber, no red — this is not an error). Background: `var(--surface-secondary)`. Border: `var(--border-subtle)`. No CTA unless there is a specific action the user can take.

---

## 8. Executive Portfolio View

### 8.1 Surface

The portfolio view is a **separate route**: `/portfolio` (or `/dashboard/portfolio`). It is NOT embedded in the workflow list dashboard. Access: a link in the sidebar navigation or a "Portfolio" tab in the CommandHeader when multiple process groups exist.

**Data gating:** the portfolio view requires at minimum 2 process groups with at least 5 workflow definitions each. If this threshold is not met, the route renders a **pre-threshold state** (see 8.4) rather than showing empty charts. Single-user installs with no multi-team data will almost always hit this gate.

### 8.2 Component Hierarchy

```
ExecutivePortfolioView
├── PortfolioHeader
│   ├── ProcessGroupCount (large integer + label)
│   ├── TotalWorkflowCount
│   └── TimeRange selector (same component as CommandHeader)
│
├── ValueLeakageSection
│   ├── SectionTitle: "Top processes with improvement potential"
│   └── ValueLeakageTable (top 10 by annualized_value_leakage_usd or bottleneck_impact_score)
│
├── AutomationReadinessSection
│   ├── SectionTitle: "Highest automation readiness"
│   └── AutomationReadinessList (top N by automation_readiness_score_0_100)
│
├── SLARiskSection
│   ├── SectionTitle: "SLA risk"
│   └── SLARiskTable (processes sorted by sla_breach_rate_pct desc)
│
├── StandardizationHeatmap
│   ├── SectionTitle: "Standardization across process groups"
│   └── HeatmapGrid (process groups on Y axis, metric dimensions on X axis)
│
└── DepartmentComparison
    ├── SectionTitle: "By department"
    └── DepartmentTable (departments as rows, key metrics as columns)
```

### 8.3 Graceful Degradation on Single-User Data

When `process_group count < 2` OR `workflow_definition count < 5`:

- ValueLeakageSection: renders with whatever process data exists (even 1 group, 2 workflows). Section title adjusts: "Processes with most improvement potential" (drops "Top 10" if fewer than 10 exist).
- AutomationReadinessSection: renders.
- SLARiskSection: hidden (SLA breach rate requires enough runs to be meaningful — minimum 20 runs across the set; if below, show Phase2Gate).
- StandardizationHeatmap: hidden (requires multiple groups to be comparative — show "Add more workflow groups to see standardization comparison").
- DepartmentComparison: hidden if all workflows belong to one department or department field is null for all.

Each hidden section renders a compact informational notice (same Phase2Gate component as Section 7.4) explaining what data is needed to unlock it.

### 8.4 Pre-Threshold State

When the portfolio route is accessed with insufficient data:

```
┌──────────────────────────────────────────────────────────────┐
│  Executive Portfolio View                                    │
│                                                              │
│  You have N process groups and N workflow definitions.       │
│  Portfolio analytics unlock at 2 process groups with         │
│  at least 5 workflows each.                                  │
│                                                              │
│  In the meantime, you can explore individual workflows       │
│  on the Workflows dashboard.                                 │
│                                                              │
│  [Go to Workflows]                                           │
└──────────────────────────────────────────────────────────────┘
```

No charts, no empty chart containers, no "0" values in KPI tiles. Empty chart containers are more confusing than a clear explanation of what is needed.

---

## 9. Transition from v2 to v3

### 9.1 Recommended Strategy: Opt-In Preview Behind Flag, Then Auto-Redirect

v2 followed the pattern established by D1 (PRD_DASHBOARD_V2 §5 Decision D1): ship behind `?v2=1`, auto-redirect at iter 022, retire flag after 14-day soak. v3 should follow the same pattern to maintain user trust and maintain the escape hatch principle.

- **Phase A (build complete, not yet default):** v3 accessible at `?v3=1`. v2 remains default. Users who want the new column set can opt in. This matches how v2 was introduced.
- **Phase B (auto-redirect):** after v3 passes the pre-launch checklist (analytics instrumented, a11y gate passed, DV2-R02/R03 equivalents resolved), auto-redirect all users to v3. v2 accessible at `?v3=0` escape hatch.
- **Phase C (flag retirement):** after 14-day soak with zero critical regressions and PRD § 4 success metrics moving in correct direction, retire the `?v3=0` escape hatch.

INPUT_SPEC § 22 ("Make the engine broad, make the UI selective") supports this: v3 is the selective UI for the broad engine. A user coming from v2 should see a dashboard that feels familiar (same three sections, same scan order) with more columns and a column picker — not a reinvented interface.

### 9.2 In-App What's New

An in-app banner (the same DV2-R09 cold-pool item, promoted when v3 ships) appears once per user at v3 first-load: "New: 9 configurable metrics columns. Customize with the Columns button." Dismissible, not persistent after dismissal. Tied to a user preference flag so it does not reappear.

### 9.3 v2 State Preservation

Users who had active filters, sort state, or saved views in v2 have those preserved in v3 via the saved-views system (Section 4). The v2 4-column default is offered as a "Classic view" in the saved views dropdown — pre-seeded as a system view named "Classic (4 columns)" — so users can always revert to the familiar layout without hunting.

---

## 10. Empty, Low-Confidence, and Pre-Threshold State Taxonomy

Every metric column can be in one of these states. Frontend and QA must handle all of them.

### State Taxonomy

| State | Trigger condition | Visual treatment | Copy |
|---|---|---|---|
| **loading** | data fetch in progress | Skeleton shimmer (animate-pulse, existing SkeletonRow pattern from WorkflowList.tsx lines 161–188) | None — no text copy during loading |
| **no-data** | `metric_fact` does not exist for this entity + window | "—" in cell, aria-label: "[Metric name]: no data available" | In popover: "No data recorded yet for this metric." |
| **low-confidence** | `confidence_score_0_100 < 60` | Value shown with amber warning chevron icon (ChevronDown from WorkflowRow.tsx reused) + amber color on value text | In popover: "Low confidence. This metric is based on N runs." |
| **sparse** | `evidence_count < threshold` (threshold defined per metric; default: 5 for per-workflow metrics, 20 for portfolio metrics) | Value shown with "(n=N)" qualifier in 10px/tertiary, same as v2 WorkflowRow.tsx line 575–578 | In popover: "Based on fewer than [threshold] observations. Score may change as more data is collected." |
| **error** | API error on metric fetch | "!" icon in cell, aria-label: "[Metric name]: error loading" | In popover: "Could not load this metric. [Retry link]" |
| **gated** | User plan does not include this metric | Lock icon + value hidden, aria-label: "[Metric name]: upgrade required" | In popover: "This metric is available on [plan name]." + "Upgrade" link |

### Confidence Drop Signals (INPUT_SPEC § 9)

The following conditions lower displayed confidence and trigger the `low-confidence` state:
- Too few runs (`evidence_count < threshold`)
- Timestamp gaps (step timestamps missing or implausible gaps)
- Ambiguous step labeling (high `missingness_flags` count in `metric_fact`)
- Clustering uncertainty (process_group assignment is tentative)
- Missing end states (runs with status `partial` or `abandoned`)
- Incomplete sessions

### Empty State Copy Rules

- Empty state body text must be actionable or explanatory — never just "No data".
- Extension not installed: "Install the browser extension to record workflows." (link to install — existing EXTENSION_CONFIG pattern from WorkflowList.tsx line 451–459).
- No runs in time window: "No workflows recorded in this period. Try a longer time range."
- Metric not computable: "This metric requires step-level data. Record more detailed workflows."

---

## 11. Accessibility Requirements

### WCAG 2.1 AA Compliance (minimum — matches PRD_DASHBOARD_V2 §10)

- **Focus order:** Tab moves in DOM order through: CommandHeader controls → InsightsStrip chips → WorkflowList filter bar → Column picker trigger → Save view trigger → Table header sort buttons → Table rows (each row is a single tab stop) → within row: metric cells are sub-focusable via arrow keys (grid navigation pattern, `role="grid"` with `role="gridcell"`).
- **Metric cell aria-labels:** every `<td>` in the v3 metrics table carries `aria-label="[Metric name]: [value] [unit]"`. For gated cells: `aria-label="[Metric name]: upgrade required"`. For no-data: `aria-label="[Metric name]: not available"`.
- **Escape closes all popovers:** every popover, tooltip, and drawer in v3 closes on Escape. This is a hard contract: no interactive surface in v3 can be reached by keyboard and not closed by Escape. Enforced by the shared `MetricCellPopover` primitive and the column picker drawer. This directly addresses DV2-R03 and must not recur.
- **No native dialogs:** `window.alert`, `window.confirm`, `window.prompt` are forbidden in v3. The existing v2 breach (WorkflowRow.tsx lines 268, 295 — DV2-R02) must be fixed in iter 031 before v3 ships, or replicated fix must be part of v3 WorkflowRow changes. All confirmation interactions use inline confirmation patterns (label-swap + timeout) or inline form patterns.
- **Column picker keyboard reorder:** drag-and-drop reorder must have a keyboard equivalent. Pattern: Tab to drag handle, Space to pick up, Arrow keys to move, Space to drop. Announce position changes via `aria-live="assertive"` region: "Moved [column] to position [N] of [M]."
- **Screen reader announcements for async updates:** when column config is applied, announce via the existing `aria-live="polite"` region in WorkflowList.tsx (line 309): "Table updated: [N] columns visible." When filters change: "N workflows shown."
- **Color is always paired:** no metric state uses color as the only signal. Low-confidence amber includes the ChevronDown icon. Error red includes the "!" icon. Gated state includes the Lock icon. This extends the v2 principle (PRD_DASHBOARD_V2 §5.4: "Color is always paired with shape (icon) or text label").
- **Auto-refresh must not shift focus:** if the dashboard auto-refreshes data in the background, the focused element must not change. Announce the refresh completion via `aria-live="polite"` without moving focus. Never interrupt a user who is tabbing through rows.

---

## 12. Density, Spacing, and Token Compliance

### Token Compliance (extend PRD_DASHBOARD_V2 §5.4 — do not diverge)

All v3 components use the existing token set:
- Typography: 12 / 14 / 16 / 20 / 28 px only. No new sizes.
- Spacing: 4 / 8 / 12 / 16 / 24 / 32 px grid. Row padding = 12. Column gap = 16.
- Radii: 6 (chips, tags) / 10 (cards, drawer). No other values.
- Color: monochrome neutral scale + red/amber/green semantic hues only. No new semantic hues introduced for v3 metrics (no purple for AI readiness, no teal for flow efficiency — use existing amber for warnings, green for good states).
- Motion: ≤ 150ms transitions. Column picker drawer open/close: 150ms ease-out slide. No other animations.

### Density Control

v3 does not introduce a user-configurable density toggle. The 9-column default at 1280px is already near the upper boundary of what the PRD_DASHBOARD_V2 §5.4 token set can support without overflow. Adding a density toggle introduces a UI configuration surface that is not justified by the current user base.

**Density rules for the 9-column table:**
- Row height: 48px minimum (same as v2 WorkflowRow.tsx `py-ds-3` = 12px top + 12px bottom + 24px content).
- Cell horizontal padding: 12px on all columns (reduce from v2's 16px only for columns 2–9; Column 1 retains 16px left padding for visual hierarchy).
- Column 1 minimum width: 240px. All other columns minimum width: 80px. Column 9 minimum width: 100px (score + badge).
- At 9 columns × 80px min + 240px Name = 960px minimum table width. At 1280px viewport with 32px outer gutter × 2, available width = 1216px. Fits without scroll. At 12 columns: 960px + 3×80px = 1200px minimum — fits. 13+ columns would require scroll, which is handled by Section 5.1.

---

## 13. Anti-Patterns — Explicit List

v3 must NOT do any of the following:

1. **No KPI wall.** Do not render a grid of KPI tiles above the workflow list. The CommandHeader's portfolio health score is the single top-line KPI. All other metrics live in the table rows.
2. **No progress bars without target.** If a metric cell uses a bar visual (e.g., the health score rail), the bar must represent a bounded 0–100 scale with a defined maximum. Do not render a bar for unbounded metrics (cycle time in milliseconds, variant count). Use a numeric value display for unbounded metrics.
3. **No average-of-averages.** Flow efficiency %, standardization score, and other ratio metrics must be recomputed from numerator and denominator at the displayed grain, not averaged from child rows. INPUT_SPEC § Rollup Rules: "Ratios must be recomputed from numerator and denominator, not averaged from child ratios." This is a data contract requirement surfaced in the UX spec because the frontend must not request pre-averaged values from the API.
4. **No metric without unit.** Every numeric cell displays its unit: "%" for percentages, "ms" or formatted duration for times, integer for counts, "/ 100" for composite scores. The column header carries the unit for repetitive columns. No bare numbers.
5. **No score without drill-down path.** Every composite score (Health Score, Bottleneck Severity, Automation Readiness) must have a reachable popover showing contributing components. A score that cannot be explained is a score that cannot be trusted.
6. **No custom view that silently drops a pinned metric.** Workflow Name and Process Health Score are pinned. If a saved view's column config is loaded and one of these is missing from the config (e.g., config was saved before pinning was introduced), the frontend silently re-adds the pinned columns without warning. It does NOT silently omit them.
7. **No auto-refresh that shifts focus.** If background data refresh fires while a user is interacting with the table (navigating rows, using the column picker), the refresh must not move focus, re-render the column picker, or close any open popover.
8. **No color-only status.** Red/amber/green health bands are always paired with a label or icon. A blind user reading the table must receive the same status information as a sighted user.
9. **No native dialogs.** `window.confirm`, `window.prompt`, `window.alert` are banned. All confirmation, rename, and destructive-action interactions use inline patterns. (DV2-R02 — already an existing breach; v3 must not replicate.)
10. **No metric displayed at a grain it was not computed for.** If `flow_efficiency_pct` is computed at the `run` grain and the dashboard shows it at the `workflow_definition` grain, the value must be a recomputed rollup — not the value of the most recent run passed through directly. This is an engineering contract; it must be surfaced here so the frontend knows to request the correct grain from the API.

---

## 14. Open UX Questions

The following decisions require CEO input or post-usability-test data before they can be locked.

1. **Column count ceiling.** This spec proposes 12 as the maximum active column count. Is 12 the right ceiling? At 12 columns on a 1280px display the table is very dense. An alternative is 9 (default only — no additions without removing). The tradeoff: 12 allows genuine power-user customization; 9 enforces the "UI selective" principle from INPUT_SPEC § 22 more strictly. Recommendation: start with 12 max and measure column picker usage in the first 30 days. If >80% of users never add beyond default, reduce to 9.

2. **Per-cell drill-down entry point: hover popover vs dedicated "details" button.** The spec proposes hover-reveal with a 400ms delay. For users who primarily use keyboard navigation or touch devices, hover is non-functional. An alternative is a small info icon (ⓘ) at the right edge of each metric cell that is always visible and keyboard-focusable. The tradeoff: always-visible icons add visual noise to a dense table. Post-usability test input needed: do users discover the hover behavior, or do they miss it?

3. **Workflow Detail View: slide-over panel vs full-page navigation.** The spec proposes both (cell click = slide-over, name click = full page). This dual-mode behavior may confuse users who expect consistent click behavior. An alternative is name click only for all navigation, with the slide-over reserved for quick-peek only (no deep drill-down in the panel). Decision needed before detail view is built.

4. **Saved views: per-workspace vs per-user.** The spec proposes user-level views with org-pinned and team-pinned overrides. Does Ledgerium currently have a team/org data model that supports org-pinned views? If not (current schema is single-tenant per INPUT_SPEC non-spec appendix), org-pinned and team-pinned precedence tiers are dead weight until multi-tenancy ships. Recommendation: implement user-level only in v1; reserve org/team tiers for when the team model exists.

5. **Portfolio view data threshold.** The spec gates the portfolio view at 2 process groups with 5 workflow definitions each. This threshold may be too high for early customers with 10–15 workflows total, or too low for enterprise customers who want portfolio views from day one. The threshold should be configurable per workspace, with the current values as defaults. Is the product-manager aligned on these specific numbers, or is a different threshold more appropriate for the target persona described in PRD_DASHBOARD_V2 §3?

---

**End of UX_FLOWS_METRICS_ENGINE.md**
