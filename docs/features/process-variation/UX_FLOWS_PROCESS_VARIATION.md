# UX Flows — Workflow Clustering + Process-Variation Analysis

**Status:** Define-phase artifact
**Date:** 2026-06-10
**Owner:** ux-designer
**Consumers:** frontend-engineer, qa-engineer, product-manager, system-architect
**Source data model:** `packages/intelligence-engine/src/types.ts` — `VariantSet`, `ProcessVariant`, `PathSignature`, `VarianceReport`, `BottleneckReport`, `TimestudyResult`
**Upstream reviews:** `WORKFLOW_VIEWS_SIMPLIFICATION_REVIEW_001.md`, `REPORT_CONSOLIDATION_AND_PERFECT_REPORT_PLAN.md`, `WORKFLOWS_DASHBOARD_REVIEW_002.md`, `SOP_PROCESSMAP_REVIEW_001.md`

---

## 0. Design Intent and Scope

This document specifies the user experience for bringing workflow clustering and process-variation analysis into the product. The CEO directive is to:

1. Show users that N recordings are runs of the same process, not N separate items.
2. Let users see "workflows break off with other steps and then converge back into a common workflow."
3. Provide full features for reporting and analyzing variation.

The headline interaction is the diverge-then-reconverge visualization — the branch/rejoin diagram that makes variant structure legible at a glance. Everything else in this document supports that story.

**Governing principles for this surface:**

- Complexity is in the data, not in the UI. The diagram must be readable by a non-expert in under ten seconds.
- Evidence first. Every number links to the runs that produced it. Users can always ask "which runs?" and get a direct answer.
- Honest about data availability. A single-run workflow cannot support variant analysis. Show a clear threshold state rather than suppressed empty sections.
- Jargon-free language. No "path signature," no "variant entropy," no "conformance score" in the UI copy. Use plain-language equivalents throughout.

---

## 1. Grouping Surfacing on the Dashboard

### 1.1 The fundamental model shift

Today each `Workflow` row on the dashboard represents one recording. The new model is:

- A **Process** is a cluster of recordings of the same underlying activity. It has a name, a run count, variant count, and a health score derived from all its runs.
- A **Run** is one individual recording, belonging to exactly one Process.
- The dashboard shows Processes by default. Individual runs are accessible from the Process detail view.

This is not a visual-only change. It requires the grouping data model (a `ProcessDefinition` cluster table, already present in the Prisma schema as `ProcessDefinition`) to be surfaced in the dashboard layer.

### 1.2 Dashboard grouped state — Process card row

When a workflow has 2 or more runs grouped into a process cluster, its row gains a cluster indicator. The row still occupies a single table row; the indicator is additive, not a replacement.

**Anatomy of a grouped Process row:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [●] Invoice Processing in NetSuite               Systems  Health  Variants  │
│      14 runs · last run 2 days ago                SAP, NS   87     3 paths  │
│      ████████████████░░░░  82% follow the main path                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Row elements:**

- **Process name** (existing `workflow.title`): unchanged. No extra label.
- **Run count + last run**: "14 runs · last run 2 days ago" in 12px tertiary beneath the title. Single-run: "1 run recorded" (no "last run" subtext).
- **Variant badge** in the Variants column: shows the variant count as a compact label with a branch icon. When `variant_count === 1`, shows "1 path" in neutral color. When `variant_count >= 2`, shows "N paths" in a slightly elevated style (not alarming — variation is expected and informative). When `variant_count >= 5`, adds an amber tint because high variance may indicate unclear process definition.
- **Path coverage bar**: a thin horizontal bar beneath the title (height: 4px) in two segments — green for the fraction of runs on the standard path, neutral gray for the rest. Width fills the title cell. This is the only visual element that makes the coverage number physical and scannable without reading text. Copy alongside: "N% follow the main path". When `variant_count === 1`, bar is 100% green, copy omitted (no need to state 100%).
- **Systems column** and **Health Score column**: unchanged from the existing dashboard column set.

**Accessible equivalent:** The bar has `aria-label="Standard path coverage: N percent. N of M runs follow the main path."` and is not interactive; it is decorative paired with the adjacent text.

### 1.3 Single-run state (ungrouped)

Rows with exactly one run show:

- "1 run recorded" beneath the title in tertiary color.
- Variants column: "Not yet" in neutral tertiary (no branch icon, no number). Tooltip on hover/focus: "Record this process again to see whether different runs take different paths."
- No path coverage bar.
- Health score is shown but with a confidence indicator: a small gray circle with an info icon; tooltip reads "Score based on 1 run — accuracy improves with more recordings."

This state is not an error. It is the normal first-recording state. The UI must not make single-run workflows feel broken or incomplete relative to clustered ones.

### 1.4 Notification: a new recording is added to an existing process

When the extension finishes a recording that the grouping engine clusters into an existing ProcessDefinition, the user sees a non-blocking notification:

**In-app toast (3s auto-dismiss, no sound):**

```
[Branch icon]  "Invoice Processing" updated
Added as run 15 · 3 paths total · 79% on main path  [View →]
```

The toast links directly to the Process view for that workflow. It appears in the top-right corner, stacked with other notifications, and does not interrupt any in-progress action.

**Dashboard row update:** The row updates its run count and path coverage bar on the next data refresh (standard polling or push, depending on the existing refresh strategy). No animation on the row update — silent refresh.

### 1.5 Empty state — no workflows recorded yet

No change from the existing empty state. Variant features are additive and do not change the entry experience.

### 1.6 Preset chip: "Multiple paths"

In the existing PresetChipRail, add a new chip labeled "Multiple paths" that filters the dashboard to show only workflows with `variant_count >= 2`. This chip uses the same `opportunity_tag`-style filter mechanism established in Path D. It maps to the filter `{ field: 'variant_count', operator: 'greater_than', value: 1 }` using the filter registry.

Copy: "Multiple paths" (not "High variation" — variation is neutral; multiple paths is descriptive).

---

## 2. Cluster Review and Control

### 2.1 Entry point

From any Process row, a secondary "Manage grouping" link appears in the kebab menu. It is not promoted to the row surface by default — most users will never need to correct grouping. The link reads "Manage grouping."

Click opens the Cluster Control Panel as a slide-in drawer (right-anchored, 480px wide, full viewport height) without navigating away from the dashboard. Focus traps to the drawer; Escape closes and returns focus to the kebab trigger.

### 2.2 Cluster Control Panel layout

```
┌────────────────────────────────────────────────────────────┐
│  Manage grouping                                  [×] Close │
│  Invoice Processing in NetSuite                             │
│  14 runs grouped together by Ledgerium                      │
├────────────────────────────────────────────────────────────┤
│  WHY THESE RUNS ARE GROUPED                                 │
│  ─────────────────────────────────────────────────────────  │
│  These recordings share the same sequence of steps and      │
│  were performed in the same applications. Similarity: 89%.  │
│  [See the evidence →]                                       │
│                                                             │
│  RUNS IN THIS GROUP (14)                                    │
│  ─────────────────────────────────────────────────────────  │
│  [●] Run 15  ·  recorded Jun 8, 2026  ·  4m 22s  ·  9 steps│
│  [●] Run 14  ·  recorded Jun 7, 2026  ·  4m 55s  ·  11 steps│
│  ...                                                        │
│  [Show all 14 runs]                                         │
│                                                             │
│  ACTIONS                                                    │
│  ─────────────────────────────────────────────────────────  │
│  [Move a run to a different process]                        │
│  [Split off runs into a new process]                        │
│  [Mark two processes as the same]                           │
│  [Mark a run as "not this process"]                         │
└────────────────────────────────────────────────────────────┘
```

### 2.3 Why these runs are grouped — evidence section

The "WHY THESE RUNS ARE GROUPED" section must answer the user's first question before they ask it. It should not just state a similarity score — it should explain in plain language what the system looked at.

**Copy template:**

> "These [N] recordings all performed the same core sequence of steps: [verb phrase from top 3 step categories, e.g., 'opening a record, filling fields, and submitting']. They were all recorded using [system names]. Ledgerium measured how similar their step patterns are and found [N]% similarity, which is above the threshold for treating them as runs of the same process."

The "See the evidence" link opens an expansion panel below the copy, showing:

- A compact path signature comparison table: each run's step count, duration, and similarity score to the standard path.
- A note: "Similarity is based on the sequence of action types, not on the specific text or values entered."

This explanation is essential for trust. Users who understand the grouping logic will accept or correct it more confidently.

### 2.4 Move a run to a different process

Flow:

1. User clicks "Move a run to a different process."
2. The panel shows a run selector: a scrollable list of the 14 runs with checkboxes.
3. User selects one or more runs.
4. A process picker appears: "Move selected runs to which process?" — shows a searchable dropdown of existing process names + a "Create new process" option.
5. User selects the target process or types a name for a new one.
6. Confirmation: "Move 1 run from Invoice Processing to [target]? This affects variant counts and health scores for both processes." Two buttons: "Move" (primary) and "Cancel."
7. On confirmation: optimistic UI update in the panel. Toast: "Run moved. Undo?" with 10-second undo window.

**Undo mechanics:** Undo reverses the move via a server call. After 10 seconds, the undo option is no longer offered; the move is committed.

### 2.5 Split off runs into a new process

Flow:

1. User clicks "Split off runs into a new process."
2. Same run selector as above.
3. User selects the runs to split off.
4. Name input: "Name for the new process?" Pre-filled with the current process name plus " (variant)" as a suggestion.
5. Confirmation: "Split [N] runs into '[new name]'? The remaining [M] runs will stay in '[original name]'."
6. On confirmation: new process is created; the dashboard adds a new row for it.

**Threshold guard:** If the user tries to split all runs out of a process (leaving it empty), show an inline warning: "This would remove all runs from '[process name].' Move all runs and archive the original process instead." Offer "Archive original" as a third button.

### 2.6 Merge two processes

This flow is initiated from either process's Cluster Control Panel.

1. User clicks "Mark two processes as the same."
2. A process picker: "Which other process is the same as this one?" — searchable list of other processes.
3. Similarity preview: when user selects a candidate, show a two-row comparison:
   - Process A: [name] · N runs · avg duration · N steps
   - Process B: [name] · M runs · avg duration · M steps
   - "Estimated similarity after merge: [computed]%"
4. Confirmation: "Merge '[A]' and '[B]' into one process? All [N+M] runs will be analyzed together." Name field pre-filled with the name of the larger process; editable.
5. On confirmation: merged process replaces both rows on the dashboard. Toast: "Processes merged. Undo?" with 10-second undo window.

### 2.7 Mark a run as "not this process"

This is the simplest override. It marks a single run as ungrouped so it does not influence the process's variant or health analysis.

1. User selects a run from the list.
2. Clicks "Mark as 'not this process'."
3. Confirmation: "Remove run [N] from '[process name]'? It will be listed as an ungrouped recording." Two buttons: "Remove" and "Cancel."
4. The run is moved to an "Ungrouped recordings" section at the bottom of the dashboard (collapsed by default; count shown in section header).

**Ungrouped recordings section:**

```
▼ Ungrouped recordings (3)
  These recordings were not grouped automatically. Review or move them.
  [●] Untitled recording · Jun 5, 2026 · 2m 10s     [Move to process ↓]
  [●] NetSuite export · Jun 3, 2026 · 6m 40s         [Move to process ↓]
  [●] Invoice run · May 28, 2026 · 4m 15s             [Move to process ↓]
```

### 2.8 Accessibility

- All actions in the Cluster Control Panel are keyboard-accessible.
- The run selector uses `role="listbox"` with `aria-multiselectable="true"`.
- Every confirmation step reads the consequences back in full before the user commits.
- Destructive actions (split, merge, remove) require explicit confirmation and offer an undo path.
- No `window.confirm` or `window.alert`. All confirmations are inline within the panel.

---

## 3. The Diverge-Reconverge Visualization

This is the centerpiece of the variation story. It is the primary answer to the CEO's question: "how do you show workflows break off with other steps and then converge back?"

### 3.1 Where it lives

The visualization lives in the **Report tab** (View 2 in the 2-view structure from `WORKFLOW_VIEWS_SIMPLIFICATION_REVIEW_001.md`) inside the **`rpt-variance` Variance and Variants section**. It is also accessible from the Process-level slide-over panel on the dashboard (a compact version, described in section 3.8).

For the Report tab, this section appears sixth in the section order (after Run Metrics, before Step Duration Analysis), matching the sequence established in `REPORT_CONSOLIDATION_AND_PERFECT_REPORT_PLAN.md`.

### 3.2 Section entry: the summary banner

Before rendering the diagram, a one-line summary anchors the section. This is the single most important sentence in the section and must be legible without scrolling into the diagram.

**Copy template (multi-variant case):**

> "Across [N] runs, this process takes [K] distinct paths. [P]% of runs follow the main path end-to-end. Runs diverge most at step [S] and rejoin at step [T]."

**Copy template (single-variant case):**

> "All [N] runs follow the same path end-to-end. No variation detected."

**Copy template (below minimum threshold, < 2 runs):**

> "Recorded once. Run this process again to see whether different recordings take different paths."

The single-variant and below-threshold states do not render the diagram at all. They render only this summary sentence and a brief explanation (see section 3.9 for full empty/threshold states).

### 3.3 The Variant DNA Strip

The DNA Strip is a compact horizontal row that appears immediately below the summary banner. Its purpose is to give a scannable overview of how runs are distributed across variants before the user looks at the detailed diagram below.

```
RUNS ACROSS PATHS
─────────────────────────────────────────────────────────
  Main path (variant-1)    ██████████████████░░░░░  82%  · 11 runs
  Path B (variant-2)       ████░░░░░░░░░░░░░░░░░░░  13%  ·  2 runs
  Path C (variant-3)       █░░░░░░░░░░░░░░░░░░░░░░   5%  ·  1 run
─────────────────────────────────────────────────────────
  Click any path to highlight it in the diagram below
```

**Mechanics:**

- Each row is a horizontal bar whose length is proportional to `ProcessVariant.frequency`.
- Bars use a consistent hue system: main path is Ledgerium green (the brand color); additional variants use progressively lighter neutral tones — not different colors per variant, which would imply qualitative difference. Color intensity encodes frequency, not variant identity.
- A single-run variant ("Path C, 1 run") always renders its bar at minimum visible width so it is not invisible.
- Each row is interactive: clicking the row highlights that variant in the diagram below (all other variants dim to 30% opacity). Clicking again deselects (all variants return to full opacity). Keyboard: Tab to the row, Enter or Space to select/deselect.
- The strip is `role="listbox"` with each row as `role="option"` and `aria-selected` toggled on click.
- When a variant with 1 run is selected, a note appears below the strip: "This path was recorded once. Evidence is limited."

**Naming:**

Variants are named by the system as "Main path," "Path B," "Path C," etc. These names are system-assigned from the `variantId` field. The user cannot rename variants at this stage (variant naming is a future feature). The "Main path" label is always applied to `isStandardPath === true`. For variant-2 onwards, the system uses "Path B," "Path C," "Path D" etc. (using letters, not numbers after the first, to make it clear these are not ranked by quality — just by frequency).

### 3.4 The Diverge-Reconverge Diagram

This is the main visualization. It renders a node-edge graph showing the step sequence, branch points, and rejoin points.

**Layout:**

- The diagram renders left-to-right (horizontal flow). Each node is a step; edges connect steps in sequence.
- Shared steps (steps present in all variants) render on a single central spine.
- At a branch point, the spine splits into multiple parallel tracks — one per diverging variant.
- At a rejoin point, the parallel tracks merge back into the single spine.
- The diagram is contained in a scrollable horizontal container with a minimum height of 200px and a maximum of 400px before scroll is needed vertically. The horizontal extent grows with step count.

**Node anatomy:**

```
┌──────────────────┐
│  Step 4          │
│  Open record     │  ← step category label (plain language, not GroupingReason enum key)
│  3.2s avg        │  ← mean duration from TimestudyResult
└──────────────────┘
```

- Node width: fixed at 140px. Node height: 72px.
- Node background color encodes variant participation:
  - Shared step (on all paths): white with a green left border.
  - Variant-specific step: the node is outlined in neutral gray with a small variant label badge ("Path B only") in the top-right corner of the node.
  - Bottleneck step (from `BottleneckReport`): small amber triangle icon at bottom-right.
  - High-variance step (from `VarianceReport.highVarianceSteps`): small variance icon at bottom-right (two arrows diverging).
- Step title: plain language equivalent of the step's `category`. Translation table:
  - `click_then_navigate` → "Navigate to page"
  - `fill_and_submit` → "Fill and submit form"
  - `click_then_other` → "Click and continue"
  - `error_handling` → "Handle error"
  - `idle_gap` → "Pause (idle)"
  - `annotation` → "Review / annotate"
  - (All other GroupingReason values map similarly — full table in COPY_GUIDANCE.md)

**Edge anatomy:**

- Edges are horizontal lines with an arrowhead pointing right.
- Shared edges (connecting shared nodes): Ledgerium green, weight 2px.
- Variant-only edges: gray dashed line, weight 1.5px.
- Branch point: the edge widens into a Y-fork symbol. A label appears on the fork: "Splits here: [P]% continue normally, [Q]% take a different path."
- Rejoin point: a Y-merge symbol. Label: "Rejoins here: runs converge at [step label]."

**Branch point label copy template:**

> "[P]% continue  /  [Q]% [do something different]"

Where "[do something different]" is derived from the first step on the diverging path. Example: "82% continue / 18% handle an error first."

The exact copy is dynamically generated from the variant data. The diverging fraction is `1 - standardPath.frequency`. The label for the diverging path uses the first variant-specific step's plain-language category.

**Rejoin label copy template:**

> "Paths rejoin here after step [variant-specific step label]"

**Zoom and pan:**

- The diagram is pan-able (click and drag, or two-finger scroll on touch). Pan is not enabled by keyboard by default — keyboard users use Tab to focus individual nodes.
- A zoom control is available in the bottom-right corner of the diagram container: "+" (zoom in), "−" (zoom out), "⊡" (fit to view). All three have visible labels, not icon-only.
- Default zoom level: "fit to view" — the entire diagram is visible without panning on first render, at any step count up to approximately 15 steps. At more than 15 steps the default clips slightly and a "Scroll to see all steps →" hint appears.

**Keyboard navigation:**

- Tab enters the diagram and focuses the first node.
- Arrow keys move focus between nodes.
- Enter on a node opens a detail panel for that step (see section 3.5).
- Escape exits the diagram.
- `aria-label` on each node: "[Step label] — step [N] of [M]. [Duration] average. [Variant participation, e.g., 'On all paths' or 'Path B only']. [Bottleneck/variance flag if applicable]."

### 3.5 Step detail panel

Clicking or pressing Enter on any node in the diagram opens a compact detail panel that slides in from the right edge of the diagram container (not a full drawer — this is a 320px inset panel within the diagram area, dismissible by Escape or clicking the × button).

**Panel contents:**

```
┌─────────────────────────────────────────┐
│  Step 4 — Open record            [×]   │
│  ─────────────────────────────────────  │
│  Present in                             │
│    All 14 runs (100%)                   │
│                                         │
│  Duration                               │
│    Mean: 3.2s   Median: 2.9s   P90: 5.1s│
│    Based on 14 runs                     │
│                                         │
│  ⚠ This step has high timing variance.  │
│    Fastest: 0.8s · Slowest: 9.4s        │
│                                         │
│  On paths                               │
│    Main path · Path B · Path C          │
│                                         │
│  [View the 14 runs →]                   │
└─────────────────────────────────────────┘
```

**For a variant-only step (not on all paths):**

```
│  Present in                             │
│    2 runs (13%) · Path B only           │
│  [View these 2 runs →]                  │
```

"View the N runs" links to the runs list filtered to show only runs containing this step. The runs list is described in section 5.4.

### 3.6 Branch detail on-demand

In addition to the always-visible branch labels on the diagram, users can click a branch point to open a branch detail popup:

```
┌─────────────────────────────────────────────────────┐
│  Branch at step 7 — "Fill invoice fields"     [×]   │
│  ─────────────────────────────────────────────────  │
│  82% (11 runs)  →  Continue to "Submit form"         │
│  13%  (2 runs)  →  Go to "Handle error" first, then  │
│                    continue to "Submit form"          │
│   5%  (1 run)   →  Go to "Manual correction" and      │
│                    skip "Submit form" entirely         │
│                                                       │
│  [View 11 main-path runs]  [View 2 error-path runs]  │
└─────────────────────────────────────────────────────┘
```

This popup is the most detail-rich surface for understanding variation at a specific branch point. It should answer: "what exactly do the diverging runs do that the main-path runs don't?"

### 3.7 "Spaghetti" state — many variants

When `variant_count >= 5`, the diagram risks becoming unreadable if all variants are rendered simultaneously. Use progressive disclosure:

1. By default, render only the top 3 variants by frequency. A note below the DNA Strip reads: "Showing 3 of [N] paths. [Show all [N] paths →]"
2. The "Show all" link expands to render all variants but also adds a "Simplify view" toggle in the diagram toolbar that collapses paths with fewer than [threshold] runs. The threshold is initially set to 1 (show all), but toggling to "Show paths with 2+ runs" hides single-run outlier paths.
3. When more than 8 variants exist, an additional warning banner replaces the standard summary:

> "This process has [N] distinct paths — unusually high variation. This may mean the process isn't well-defined yet, or that different teams perform it differently. Review the paths below to find the most consistent version."

This warning is not alarming — it is informative. Color is neutral. The intent is to prompt reflection, not to flag an error.

**Single-variant state:**

When `variant_count === 1`, the diagram section collapses to just the summary banner ("All [N] runs follow the same path") and a compact single-track flow showing the standard path's step sequence. No branches, no DNA strip. A note reads: "All runs take the same path — no variation detected across [N] runs." This is a positive signal and the UI should reflect that.

### 3.8 Compact variant view on the dashboard slide-over

When a user opens the Workflow Detail Panel (right-anchored slide-over from a dashboard row click, per `WORKFLOWS_DASHBOARD_REVIEW_002.md` row #106 WDC2-P07), a compact variant strip appears in the metrics block.

**Compact strip anatomy:**

```
Paths across [N] runs
  Main path  ████████████████░  82%
  Other paths ████░            18%  (2 paths)
[See full variant diagram →]
```

The compact strip shows at most two rows: the main path and a collapsed "Other paths" row. The "See full variant diagram" link navigates to the Report tab anchored to `#rpt-variance`. It does not open the diagram inline in the slide-over — the slide-over is too narrow for the full diagram.

### 3.9 Loading and error states for the diagram

**Loading:**

A skeleton placeholder that matches the approximate shape of the diagram — a horizontal sequence of rectangular outlines connected by lines. Skeleton animation (pulse). No spinner. Copy: none during loading.

**Error (API failure):**

```
┌────────────────────────────────────────────────────────┐
│  Could not load path analysis.                         │
│  Check your connection and try again.    [Retry]       │
└────────────────────────────────────────────────────────┘
```

The Retry button re-fires the API call. If it fails again, a secondary message: "Still having trouble? The rest of the report is still available."

**Insufficient data (< 2 runs):**

```
┌────────────────────────────────────────────────────────┐
│  Path analysis                                         │
│                                                        │
│  Record this process again to see how runs compare.   │
│  Path analysis appears when you have 2 or more runs.  │
│                                                        │
│  1 run recorded so far.                               │
└────────────────────────────────────────────────────────┘
```

No diagram placeholder, no empty chart outline. The section header remains visible ("Variance and Variants") so the right-rail TOC still works.

---

## 4. Variation Reporting — Where Variant Analysis Lives

### 4.1 Placement in the 3-tab (2-view) structure

The `WORKFLOW_VIEWS_SIMPLIFICATION_REVIEW_001.md` established a 2-view structure: **Process** (map + SOP) and **Analysis** (single-scroll report). Variant analysis lives entirely in the Analysis view.

Within the Analysis view, variant analysis is distributed across two sections:

- **`rpt-variance` Variance and Variants** (section 6 of 17): the centerpiece. Contains the summary banner, DNA strip, diverge-reconverge diagram, and per-variant cycle-time comparison. This is the primary destination for the CEO's "break off and converge back" story.
- **`rpt-metrics` Run Metrics** (section 5 of 17): shows aggregate timing statistics (median, p90, range bar) and run count. Variant count appears as a supporting metric here — "N distinct paths recorded."

The existing **`rpt-scores` Process Health** section (section 3) also surfaces the `standardization_score_0_100` as one of its four sub-scores. This score is derived from variant data and links to the `rpt-variance` section with a "See path analysis ↓" anchor link.

**Do not add a standalone "Variants" tab.** The 2-view simplification is the right architecture. Embedding variant analysis inside the Analysis scroll keeps the narrative continuous: identity → diagnosis → action → evidence.

### 4.2 `rpt-variance` section: full specification

The section has three sub-sections, stacked vertically:

**Sub-section A: Paths across N runs** (always visible when N >= 2)

This is the summary banner + DNA strip described in sections 3.2 and 3.3.

**Sub-section B: How paths diverge and rejoin** (always visible when N >= 2)

This is the diverge-reconverge diagram described in section 3.4.

**Sub-section C: Per-variant detail** (collapsible, expanded by default when N < 10 runs, collapsed by default when N >= 10 runs)

A table comparing key metrics across variants. Column headers: Path, Runs, Frequency, Avg duration, Steps (avg).

```
PATH COMPARISON
─────────────────────────────────────────────────────────────────
  Path             Runs   Frequency   Avg duration   Steps (avg)
  ─────────────────────────────────────────────────────────────
  Main path         11      82%          4m 22s          9.1
  Path B             2      13%          5m 55s         11.0   ← longer than main
  Path C             1       5%          3m 10s          7.0
─────────────────────────────────────────────────────────────────
  All paths         14     100%          4m 35s          9.4
─────────────────────────────────────────────────────────────────
```

Each row in this table is clickable and highlights the corresponding variant in the diagram above (same interaction as clicking the DNA strip row). The "Runs" column value is a link to the filtered runs list.

**Duration deltas:** if a non-main-path variant has an average duration more than 20% longer or shorter than the main path, a small indicator appears in the "Avg duration" cell: "↑ 35% longer" in amber for longer (not red — longer does not necessarily mean worse), "↓ 28% shorter" in neutral green for shorter.

**Per-variant cycle-time distribution (advanced, collapsed by default):**

Below the table, an expandable section titled "Duration spread by path" shows a simple range-bar visualization per variant:

```
Duration spread by path (based on N runs)

  Main path    ────────[       ]──────────  min 2m 10s · median 4m 12s · max 7m 40s
  Path B       ──────────────[   ]────────  min 4m 30s · median 5m 55s · max 6m 45s
  Path C       ─[          ]───────────────  min 3m 10s · max 3m 10s (1 run only)
```

Range bars use the same scale. The median is marked with a vertical tick inside the bar range. For single-run variants, both endpoints are the same value and a "(1 run only)" note is appended.

### 4.3 Steps that cause variation — heatmap strip

Below the per-variant table, a heatmap row shows which step positions are where variation occurs.

```
WHERE PATHS DIVERGE  (based on 14 runs)

  Step: 1   2   3   4   5   6   7   8   9  10  11  12
        ●   ●   ●   ●   ●   ●   ◐   ●   ●   ●   ●  ─

  ● All 14 runs  ◐ Varies by path  ─ Not on all paths
```

The strip uses three symbol types:

- Filled circle (●): step present and structurally identical in all runs.
- Half-filled circle (◐): step present in all runs but with significant timing variance (CoV > 0.5 from `HighVarianceStep`), OR structurally different (different step category) across variants.
- Dash (─): step not present in all runs (variant-specific step).

Hovering or focusing any symbol opens a tooltip naming the step and its presence rate. No jargon in the tooltip — plain language only.

**Accessible equivalent:** The heatmap strip has a text summary above it for screen readers: "Most variation occurs at steps [N], [M]. Steps [P] through [Q] are consistent across all runs." The visual strip has `aria-hidden="true"`.

### 4.4 Single-run honest state

When `runCount === 1`:

The entire `rpt-variance` section renders a single informational block:

```
┌───────────────────────────────────────────────────────────────┐
│  Variance and Variants                                        │
│                                                               │
│  Recorded once.                                               │
│                                                               │
│  Run this process again to see whether different runs         │
│  take different paths. Path analysis, cycle-time spread,      │
│  and consistency scores appear when you have 2 or more runs.  │
│                                                               │
│  The step breakdown below shows the single recorded run.      │
└───────────────────────────────────────────────────────────────┘
```

The "step breakdown below" reference anchors to the `rpt-timestudy` section. This keeps the user oriented — the section is not a dead end even without multi-run data.

**Critical rule:** Do not show any variance metric (sequence stability, conformance score, deviation rate) when `runCount === 1`. A single-run "conformance score" is meaningless and would mislead. The section must be fully empty of metrics in this state.

### 4.5 Drill-down to source runs

From every quantitative element in the variant sections, users can reach the source runs. The interaction is consistent throughout:

- Every variant row in the per-variant table has a linked run count: "11 runs →" opens the filtered runs list.
- Every branch point in the diagram has "View [N] runs →" links.
- The step detail panel (section 3.5) has "View the [N] runs →."
- The duration spread bars are not directly clickable, but the per-variant table rows are, and they reveal the same data.

The filtered runs list is a simple table: Run ID, date recorded, duration, step count, variant. Each row links to the full recording detail for that run (navigating to the existing recording review experience).

---

## 5. Information Hierarchy and Progressive Disclosure

### 5.1 The four-level hierarchy

Variant and clustering information follows a strict four-level hierarchy. Each level is accessible but not forced on users who don't need it.

**Level 1 — Dashboard row (always visible):**
Run count + path coverage bar + variant badge. Answers "how many paths does this process have?" in one scan.

**Level 2 — Report section summary (click into Analysis view):**
Summary banner + DNA strip. Answers "what fraction follow the main path, and how many alternatives exist?" in ten seconds.

**Level 3 — Diverge-reconverge diagram (scroll into section):**
Answers "where exactly do paths diverge, and what do the diverging runs do instead?" Takes 30–90 seconds to read.

**Level 4 — Branch detail / step detail / run list (click within diagram):**
Answers "which specific runs did this?" with full evidence. Accessed on demand; never forced.

### 5.2 Label choices (plain language first)

| Technical term | UI label used |
|---|---|
| `variant` | path |
| `standard path` | main path |
| `deviation_rate_pct` | runs that take a different path |
| `sequence stability` | how consistent this process is |
| `conformance score` | (not surfaced by this label — use "consistency") |
| `variant entropy` | (not surfaced — absorbed into "N distinct paths") |
| `path signature` | step pattern |
| `similarity threshold` | (not surfaced — internal only) |
| `evidenceRunIds` | runs / recordings |
| `ProcessVariant.frequency` | N% of runs |
| `variant_count` | N distinct paths |
| `isStandardPath` | main path (most common) |
| `BottleneckStep` | slow step / step that takes longer than average |
| `HighVarianceStep` | step with unpredictable timing |

### 5.3 Onboarding — first encounter with variant data

The first time a user's workflow accumulates a second run and the DNA strip becomes visible, a non-blocking in-context tooltip appears near the DNA strip heading. It appears once per user (controlled by a user preference flag) and dismisses on any interaction.

**Tooltip copy:**

> "This shows how different runs of this process compare. The green bar is the most common path — your 'main path.' The gray bar shows runs that took a different route."

The tooltip has a "Got it" button that dismisses it permanently. No modal, no overlay, no blocking interaction.

### 5.4 The runs list (supporting surface)

The runs list is a supporting surface, not a primary one. It appears as a full-page view or a slide-over panel when a user clicks "View N runs →" from any evidence link in the variant sections.

**Layout (table):**

```
Runs for this variant  ·  Main path  ·  11 runs

  [Filter by date range ↓]  [Filter by duration ↓]

  Run     Recorded      Duration   Steps  Health score
  ──────────────────────────────────────────────────
  Run 15  Jun 8, 2026   4m 22s     9      88
  Run 14  Jun 7, 2026   4m 55s     11     81
  Run 11  Jun 3, 2026   3m 50s     9      92
  ...
  [Load more]
```

Each row links to the full recording detail for that run.

**Breadcrumb:** "[Process name] → Variant analysis → Main path runs"

Navigating back from a run detail page returns to the runs list, not to the top of the Report tab. This preserves context.

---

## 6. Empty, Loading, and Error States

### 6.1 Complete state taxonomy

| State | Trigger | Visual treatment | Copy (headline) |
|---|---|---|---|
| `loading` | Data fetch in progress | Skeleton shimmer on diagram container + DNA strip rows | (none) |
| `single-run` | `runCount === 1` | Full section placeholder, no metrics | "Recorded once. Run again to unlock path analysis." |
| `single-variant` | `runCount >= 2`, `variantCount === 1` | Summary banner + single-track flow only | "All [N] runs follow the same path." |
| `multi-variant` | `runCount >= 2`, `variantCount >= 2` | Full diagram + DNA strip + per-variant table | (dynamic summary from template) |
| `high-variation` | `variantCount >= 5` | Full diagram (top 3 variants by default) + warning banner | "This process has [N] distinct paths — consider reviewing." |
| `error` | API failure | Error block with retry | "Could not load path analysis." |
| `not-applicable` | Non-clustered recording | Section hidden | (none — section not rendered) |

### 6.2 Section visibility rules

The `rpt-variance` section is rendered (even in single-run placeholder state) whenever the workflow has a `ProcessDefinition` cluster. It is hidden only when the workflow is an ungrouped recording with no `ProcessDefinition` (i.e., it has never been run more than once and has not been manually grouped).

The section header ("Variance and Variants") always appears in the right-rail TOC regardless of data availability. In single-run state, clicking the TOC link scrolls to the placeholder. This keeps the TOC consistent.

### 6.3 Right-rail TOC behavior

The TOC entry for this section shows a badge when there are findings worth attention:

- When `variantCount >= 2`: show "N paths" as a supporting label in the TOC entry.
- When `variantCount >= 5`: show an amber dot next to the entry.
- When `variantCount === 1`: no badge.
- When single-run: a small gray "1 run" label.

This lets users scan the TOC for signals before scrolling into sections.

### 6.4 Accessibility for all states

- Every state has a visible, text-based summary (not just an icon or an empty area).
- The single-run placeholder has `role="status"` so screen readers announce it when it enters the viewport.
- Skeleton loaders have `aria-busy="true"` on the container and `aria-label="Loading path analysis"`.
- The error state has `role="alert"` so screen readers announce it immediately.

---

## 7. Interaction Notes and Edge Cases

### 7.1 Runs recorded at very different times

If a process has runs spread over months, the summary banner should include the date range: "Across 14 runs recorded from March to June 2026, this process takes 3 distinct paths."

Do not imply the analysis is real-time. "Across N runs" is always a historical aggregate.

### 7.2 Run that appears in multiple variant candidates

The grouping algorithm uses greedy first-match (from `variantDetector.ts`). A run is in exactly one variant. There is no "ambiguous membership" to surface. If the system later supports soft-clustering, this spec will need revision.

### 7.3 Naming collision — "Path B" if only 2 variants exist

"Path B" is used for the second variant regardless of how many variants there are. If there is only a main path and one alternative, call them "Main path" and "Path B" — not "Main path" and "Alternative path." This is more scannable in the DNA strip and in table column headers.

### 7.4 Duration delta thresholds

The 20% threshold for showing the duration delta indicator ("↑ 35% longer") is a design-time default. The threshold should be configurable by the analytics team in a constants file — not hardcoded in the component.

### 7.5 Maximum step count for the diagram

The diagram renders all steps up to 30 steps per path. At more than 30 steps, the horizontal diagram truncates and shows a "Show more steps →" control at the right edge. Clicking shows a scrollable full-width step list for the overflowing steps (not a new diagram — a text list).

### 7.6 Variant that is a complete superset of the main path

If Path B contains all the steps of the main path plus additional steps (a pure insertion variant), the diagram should clearly show the extra steps as an insertion on an otherwise-identical spine. This is a common real-world case (e.g., "handle error" inserted between two standard steps). The diagram renders this as a brief detour from the spine with a "+" node indicating the inserted step, rejoining the spine at the next shared step.

### 7.7 Plan gating

Variant analysis (the full diagram, per-variant table, and DNA strip) is gated at the Team plan tier, consistent with the plan-gating model in `REPORT_CONSOLIDATION_AND_PERFECT_REPORT_PLAN.md` §5.

**Free/Starter tier:** Show the summary banner and variant count only. The diagram area renders a plan-gate block:

```
┌─────────────────────────────────────────────────────┐
│  Path analysis is available on the Team plan.       │
│  This process has 3 distinct paths across 14 runs.  │
│  Upgrade to see how they diverge and compare.       │
│  [Compare plans →]                                  │
└─────────────────────────────────────────────────────┘
```

Crucially, the count ("3 distinct paths") is visible on free tier — the number itself is not gated, only the diagram and table detail. This creates a genuine upgrade trigger: "I can see there are 3 paths, but I need to upgrade to see what they are."

---

## 8. Assumptions and Open Questions

The following assumptions underlie this spec. They should be confirmed before implementation begins.

**A1 — ProcessDefinition clustering is the grouping mechanism.** This spec assumes the existing `ProcessDefinition` row in the Prisma schema is the correct home for the process cluster identity. If the backend introduces a separate `process_cluster` table, the grouping panel flows will need routing updates but the visual design is unchanged.

**A2 — PathSignature step categories are the branching unit.** The diverge-reconverge diagram uses `PathSignature.stepCategories` (an array of `GroupingReason` enum values) as the basis for showing which steps are shared vs. variant-specific. If step-level granularity from `workflow_step` persistence (Path C R+1) becomes available, the diagram can use step titles rather than categories for richer node labels. This is a non-breaking upgrade.

**A3 — Variant count is bounded in practice.** The "spaghetti" state handling (section 3.7) assumes fewer than ~20 variants in realistic use. If a process has 100+ variants, the progressive-disclosure approach in this spec is insufficient and a different aggregation strategy will be needed. This is not expected in the near term.

**A4 — The 2-view tab structure is confirmed.** This spec is written against the 2-view (Process / Analysis) structure recommended by `WORKFLOW_VIEWS_SIMPLIFICATION_REVIEW_001.md`. If the implementation proceeds with the current 8-tab structure instead, the `rpt-variance` section still works — it would simply live in the existing "Report" or "Intelligence" tab rather than in the Analysis view.

**A5 — Variant naming (letters vs numbers).** This spec uses "Main path," "Path B," "Path C" as system-assigned names. An alternative is "Variant 1," "Variant 2," "Variant 3." The letter-based naming is recommended because it avoids implying rank after the first one. This is a copy decision that should be confirmed with a growth-strategist review before shipping (D-4 clause 1 will fire on this surface given the number of user-visible copy strings).

**Open question OQ-1:** Should users be able to rename variants? ("Main path" and "Path B" → "Normal flow" and "Error recovery path"?) This would make the visualization significantly more useful for sharing and SOPs, but adds a data model requirement. Recommend deferring to v2 of this feature.

**Open question OQ-2:** Should the diverge-reconverge diagram be the same component used in the "Variants" mode on the Process (View 1) map, or a separate implementation? Reuse is architecturally cleaner; a single `VariantDiagram` component consumed in both contexts is the recommendation.

**Open question OQ-3:** The compact variant strip on the dashboard slide-over (section 3.8) references a slide-over feature described in backlog row #106 WDC2-P07, which is not yet shipped. If WDC2-P07 ships before this feature, the compact strip should be added as part of that component. If this feature ships first, the compact strip can be added as a follow-up when WDC2-P07 lands.

---

## 9. Handoff Checklist

For frontend-engineer:

- [ ] `VariantDiagramComponent` — accepts `VariantSet` and `TimestudyResult` as props; renders DNA strip + diverge-reconverge diagram + per-variant table
- [ ] `BranchDetailPopup` — accepts branch point data; dismissable by Escape
- [ ] `StepDetailPanel` — accepts step node data; renders within the diagram container
- [ ] `ClusterControlPanel` — slide-in drawer for grouping management actions
- [ ] `CompactVariantStrip` — accepts `VariantSet`; renders summary + 2-row DNA strip
- [ ] `RunsListView` — filtered table of runs for a given variant
- [ ] All states: loading skeleton, single-run placeholder, single-variant, multi-variant, high-variation warning, error, plan-gate

For QA:

- [ ] Single-run state: no variance metrics rendered anywhere in `rpt-variance`
- [ ] Keyboard navigation: Tab enters diagram, Arrow keys navigate nodes, Enter opens step detail, Escape closes detail and exits diagram
- [ ] All interactive elements in the Cluster Control Panel reachable by keyboard
- [ ] Undo toast appears and functions within 10-second window
- [ ] Plan-gate block renders for Free/Starter users; variant count (the number) is visible; diagram and table are hidden
- [ ] DNA strip row selection highlights diagram and updates TOC badge
- [ ] Escape closes all panels and popovers; no surface exists that cannot be dismissed by keyboard
- [ ] `aria-live` regions announce state changes (run added notification, diagram highlights)
- [ ] axe scan on the diagram surface in all states: loading, single-run, multi-variant, high-variation

For product-manager:

- [ ] Confirm plan gating tier for variant diagram (Team vs Starter)
- [ ] Confirm variant naming convention (letters vs numbers — OQ-5 above)
- [ ] Confirm whether run-rename / variant-rename is in scope for v1 (OQ-1)
- [ ] Confirm `ProcessDefinition` as the grouping identity model (A1)

---

**End of UX_FLOWS_PROCESS_VARIATION.md**
