# UX Report Review — Ledgerium Workflow Report Page
**Date:** 2026-06-14
**Author:** ux-designer
**Scope:** Define phase — no code. Full UX critique, modernized layout, graphics specification, Variance & Variants redesign, print/export, states, and P0–P2 punch-list for `WorkflowReportPage.tsx`.

---

## 1. UX Critique: What Exists Today

### 1.1 What is there

`WorkflowReportPage` is a single-scroll document with a right-rail sticky nav ("On this page"). It renders up to 17 named sections fed by five data sources: `workflow`, `insights`, `interpretation`, `intelligence`, `agentIntelligence`, and `processOutput`. The right-rail navigator uses `useScrollSpy` to track active section.

The screenshot (`workflow-report-tab.png`) shows the live state: a dark-background hero band at the top with six metric cells (Duration, Steps, Phases, Confidence, Systems, Status), then four loading-skeleton cards labeled "PROCESS INTELLIGENCE," then a "PHASE TIMELINE" empty state, then the right rail.

`ReportTab.tsx` is a lighter, older sibling — a flat document layout (Header → Key Metrics → Observations → Steps → SOP Summary → Attribution) rendered when only the basic `report` JSON is available. Its typography is small and purely textual.

### 1.2 Reading order and hierarchy

**What a reader sees first:** The hero band. It is branded (`from-brand-50/80 to-white`, soft blue gradient) and renders six metric cells in a horizontal band. The title is `text-ds-2xl font-bold` — correct. The lead sentence below the title is good ("A 7-step process across 2 systems in 2 phases, completing in 4m at 88% extraction confidence.").

**What happens after the hero:** The reader drops immediately into "Start Here" (the amber `LeadInsightSection`), then "Process Health" (four `ProcessHealthScoreBar` tiles), then "Phase Timeline." This is a reasonable order but the transition from the hero to the health tiles has no visual breathing room — both are card components with similar padding, so the page reads as one long stream without clear chapter breaks.

**Reading flow problems:**

- The six metric cells in the hero (Duration / Steps / Phases / Confidence / Systems / Status) are arranged in a `grid-cols-2 sm:grid-cols-3 xl:grid-cols-6` pattern. At 1280px they become one row of six. The values are all `text-[28px] font-bold` — same weight, same size. There is no visual hierarchy among them. Duration is the most important number for most readers, but it sits next to Steps (which most readers do not immediately value equally). Status (a text badge "Active") in the same cell-size as the duration number looks odd — the encoding does not match the data type.

- The `SectionHeading` component (`text-[11px] font-semibold uppercase tracking-widest text-[var(--content-tertiary)]`) is used for every section label. This is correct practice — subdued section labels do not compete with content. But because every section uses the exact same treatment and the same `space-y-10` gap between sections, the page feels flat. A 40px gap between "Process Health" and "Phase Timeline" looks the same as the gap between "Phase Timeline" and "Run Metrics." There are no visual chapter markers, no sense of the report having acts.

- The right-rail nav has 17 entries for a fully-populated report. At 12px text and `space-y-0.5`, this is approximately 290px of nav for a 1920px-tall page. Users with partial data may see 7–8 nav entries, which is manageable. With full AI analysis, 17 entries makes the nav feel like an index rather than navigation. Some entries are dead in common scenarios (Timestudy requires 2+ runs; Rework requires detected patterns; Agents/Skills/Integrations/Roadmap require agent analysis). The visible-sections logic (`visibleSections` memo) correctly hides unavailable entries, but users are not told why entries appear or disappear.

### 1.3 Information density

**Hero band:** Good density. Six cells in one band is slightly crowded on tablet (the `grid-cols-3` breakpoint puts Systems in a spanning cell). The animated count-up on Duration (`useCountUp`) is a nice touch but adds interaction cost — a reader who wants to skim the number must wait for it to finish.

**Process Health section:** Four `ProcessHealthScoreBar` tiles in a `grid-cols-4` grid. Each tile has a label, a score number, a progress bar, and an interpretation string. This is effective for a single-run view. For multi-run workflows, these four scores are single-run interpretation values — there is no multi-run trend context shown. A score of "68 — Some friction" has very different meaning if it has been stable at 68 for 10 runs versus if it jumped from 45 to 68 on the latest run. The absence of trend context makes these tiles episodic observations rather than process intelligence.

**Phase Timeline:** A horizontal scroll of colored phase cards. Good visual treatment. However, at narrow viewport widths (`min-w-[80px]`), long phase names ("Sales Review and Qualification") are truncated. There is no tooltip on truncated names.

**Insights Feed section:** Has category filter pills and severity badges. The `InsightActionCard` pattern (expand/collapse) is correct. The severity badge positioning is slightly awkward — the badges are rendered inside `flex items-center gap-3 mb-4 flex-wrap` alongside the `SectionHeading`, which means severity badges share a baseline with the section label. This creates a cramped heading area.

**Bottlenecks section:** Uses `BottleneckRow` component. No chart. The bottleneck list is purely textual. A reader cannot visually compare bottleneck severities without reading each row's duration numbers.

**Variance & Variants section:** See Section 4 for detailed critique.

**Step Breakdown:** 17+ rows in an accordion list. Each step shows: ordinal badge, title, category chip, system chip, confidence dot, duration, expand chevron. Expanding reveals evidence and instructions. This is correct information architecture (scan → expand) but the list has no grouping affordance beyond phase dividers. A 30-step process renders as 30 accordion items — dense and hard to scan.

**Process Structure (Friction & Decisions):** Two columns side by side. Good. Cards per friction point and per decision point. The `FRICTION_TYPE_COLORS` and `SEVERITY_BADGE_CLASSES` mappings are correct. The evidence text below each card is appropriately styled as secondary.

**Agent sections (Composed Agents, Skill Library, Integrations, Roadmap):** These are deep and specialized. They appear after the general process sections. The Skill Library table and Integrations table are plain tabular layouts — no charts, no visual encoding beyond a thin reusability bar. The Roadmap uses a vertical timeline pattern.

### 1.4 Navigation between sections

The right-rail nav exists and uses scroll-spy. This is good. Problems:

- The nav is `hidden xl:block` — it disappears below 1280px. On 1024–1279px viewport widths (common laptop screens), there is zero section navigation. The reader has no way to jump sections without scrolling manually or using browser find. This is a significant usability gap for a document with 10+ sections.
- The nav has no visual grouping. All 17 entries are equal-weight links. A reader cannot tell at a glance which entries are "overview" level versus "deep analysis."
- There is no mobile TOC. A top-of-page collapsed TOC that expands on tap would serve mobile users.
- The "Start Here" entry in the nav (`rpt-lead`) only appears when a time-leverage leader exists (step owns ≥25% of process time). When it appears, it is the first entry after "Overview." When it disappears, the nav jumps. This state-dependent first entry creates inconsistent nav structure.

### 1.5 How a reader gets from summary to evidence

The current path is:
1. Hero (summary numbers)
2. Lead Insight ("Start here" callout)
3. Process Health (4 score tiles)
4. Insights Feed (categorized insight cards with expand for evidence)

This path is reasonable but has two gaps:

**Gap 1 — no single executive summary.** There is no paragraph or structured "key findings" block that a reader can read in 30 seconds to understand what the report concludes. The hero gives raw numbers. The "Start here" callout gives one timing signal. To understand what the process is doing well and poorly, a reader must scroll through the full insights feed. A busy stakeholder or manager will not do this.

**Gap 2 — the link from insight to evidence is buried.** The `InsightActionCard` allows expansion to see `evidence`, `impact`, and `suggestion`. But these cards appear in the Insights section, which is section 8 in the scroll order (after hero, lead, scores, phases, run metrics, variance, timestudy). By the time a reader reaches insights, they have already scrolled through a lot of content. And the step references in insight cards (`stepOrdinals: [3, 7]`) are not linked to the Step Breakdown section. A reader who sees "Step 7 is a bottleneck" cannot click Step 7 to jump there.

### 1.6 What is cluttered, buried, or hard to parse

**Cluttered:**
- The hero metrics band: six equal-weight cells. No visual distinction between primary metrics (Duration, Steps) and secondary metadata (Status).
- The Insights section heading area: severity badge chips share a row with the section label in an awkward flex layout.
- The Variance & Variants section: six stat cards (3 top, 3 bottom) plus variant rows plus a divergence graph, all in one section with no sub-headings. It is the most information-dense section and has no visual chapter within it.

**Buried:**
- The automation opportunity cards. They appear after Bottlenecks, which appears after Insights, which appears after Timestudy. A reader interested in automation (a primary use case for Ledgerium) must scroll past roughly 2000px of content to find the automation section.
- The `AutomationScoreChip` inside each opportunity card is a good component but is flanked by text and in a 2-col grid — it does not visually dominate as a primary metric.
- The lead sentence ("A 7-step process...") is well-written but renders at `text-ds-sm text-[var(--content-secondary)]` — secondary color, small size. It is the most informative single sentence on the page and it reads in gray below the title.

**Hard to parse:**
- Duration CV (`cv.toFixed(2)`) in the Variance section. A Coefficient of Variation of `0.34` means nothing to most readers without a scale. There is no interpretation band (e.g., "<0.3 = consistent, 0.3–0.6 = moderate, >0.6 = high variation").
- The variant `pathSignature.signature` strings shown in the variant cards are long hash-like strings in `font-mono truncate` — completely opaque to business users.
- The bottleneck rows show `durationRatio` implicitly (the `BottleneckRow` component presumably shows how much longer the step is than average) but the relative severity is not visually encoded in the list — a step that is 4x the average looks the same as a step that is 1.2x the average.

---

## 2. Modernized Layout: Top to Bottom

The redesigned report has three structural acts: an executive summary act (0–viewport), a metrics intelligence act (scroll-1), and a deep-evidence act (scroll-2+). A persistent side nav and a mobile sticky TOC bar serve navigation within all acts.

### 2.1 Page structure overview

```
┌─────────────────────────────────────────────────────────────────┐
│  REPORT HEADER                                         48px     │
│  Workflow title + metadata + print/export CTA                   │
├─────────────────────────────────────────────────────────────────┤
│  EXECUTIVE SUMMARY BAND                               112–160px │
│  Key findings hero (2–4 finding callout tiles)                  │
├─────────────────────────────────────────────────────────────────┤
│  KPI / INSIGHT BAND                                    96px     │
│  5 metric tiles: health, cycle time distribution,               │
│  variance gauge, variant breakdown, automation score            │
├─────────────────────────────────────────────────────────────────┤
│  PHASE TIMELINE SWIMLANE                              ~100px     │
│  Phase cards with step ranges and durations                     │
├──────────────────────────────────────────┬──────────────────────┤
│  DEEP SECTIONS (main content, 720px)     │  STICKY SIDE NAV     │
│                                          │  (grouped, 200px)    │
│  Process Health                          │                      │
│  Run Metrics (multi-run only)            │  Overview            │
│  Variance & Variants                     │  Health & Metrics    │
│  Step Duration Analysis                  │  ── Process Scores   │
│  Insights Feed                           │  ── Run Metrics      │
│  Automation Opportunities                │  ── Variance         │
│  Bottlenecks                             │  Evidence            │
│  Step Breakdown                          │  ── Insights         │
│  Friction & Decisions                    │  ── Bottlenecks      │
│  Rework Patterns                         │  ── Steps            │
│  Agent Analysis (if present)             │  ── Friction         │
│  Implementation Roadmap (if present)     │  AI & Automation     │
│                                          │  ── Automation       │
│                                          │  ── Agents           │
│                                          │  ── Roadmap          │
└──────────────────────────────────────────┴──────────────────────┘
```

### 2.2 Report header (48px)

**Left:** `← Back to Library` link (existing pattern, keep). Below: the workflow title at `text-2xl font-bold`, status badge, and the lead sentence ("A 7-step process across 2 systems...") at `text-sm text-[var(--content-secondary)]`.

**Right:** Three action buttons — `Print / PDF`, `Share`, `Export JSON`. The print button triggers `window.print()` with a print stylesheet applied. Keep the existing Share dialog.

**The "Start Here" callout:** Move the amber `LeadInsightSection` into the header row as a compact inline highlight. It becomes a horizontal pill banner directly below the title row, not a separate section.

```
Weekly Sales Pipeline Review  [Active]

Step 3 owns 41% of active process time (1m 52s of 4m 33s) — optimize or automate first.

[Print / PDF]  [Share]  [Export JSON]
```

This removes "Start Here" from the section list (it was `rpt-lead` in the nav), replacing it with a persistent anchor. The amber styling remains.

### 2.3 Executive summary band

A structured "key findings" hero that summarizes the report in under 30 seconds of reading. This is the single biggest usability gap in the current report.

**Layout:** A 2×2 grid of "finding tiles" (or 3×1 on narrow screens). Each tile presents one finding in plain language, derived deterministically from available data.

```
┌─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│  PROCESS TYPE       │  EFFICIENCY SIGNAL  │  TOP FRICTION       │  RECOMMENDATION     │
│                     │                     │                     │                     │
│  Linear transaction │  Moderate friction  │  Context switching  │  Automate Step 3:   │
│  across Salesforce  │  Score: 62/100      │  at Step 4 (high)   │  ~1m 52s savings    │
│  and Google Sheets  │  Manual intensity:  │                     │  per run            │
│                     │  moderate (54/100)  │                     │                     │
└─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┘
```

**Data sourcing per tile:**
- Tile 1 (Process Type): `interpretation.processType` + `interpretation.processTypeConfidence` + `workflow.toolsUsed`. Falls back to step count + systems if processType is absent.
- Tile 2 (Efficiency Signal): `interpretation.scores` (friction + manualIntensity). If absent, shows overall health from `insights.summary`.
- Tile 3 (Top Friction): Highest-severity `interpretation.friction[0]`. If none, shows "No friction detected" with green icon.
- Tile 4 (Recommendation): Highest-score automation opportunity from `agentIntelligence.opportunities`. If none, falls back to the highest-impact insight suggestion from `insights.insights` sorted by severity.

**Tile treatment:** White card, `border border-[var(--border-subtle)]`, `rounded-ds-lg`, `px-5 py-4`. The tile label is `text-[10px] uppercase tracking-widest text-[var(--content-tertiary)] mb-2`. The finding text is `text-sm text-[var(--content-primary)]` with bold emphasis on the key value. No icon needed — the label does the work.

**Honesty rule:** A tile that has no data shows "No data yet" in tertiary color. It does not disappear. The 2×2 grid is always rendered (preserves layout stability). The leading summary sentence from `interpretation.summary` (currently unused in the UI) becomes the prose lede above the finding tiles:

```
[interpretation.summary text, max 2 sentences, text-sm text-[var(--content-secondary)], mb-4]
```

### 2.4 KPI insight band (96px)

Five tiles in one horizontal row, reusing the dashboard KPI band visual language from `UX_DASHBOARD_REVIEW.md` Section 3. Each tile: 96px tall, white background, `border border-[var(--border-subtle)]`, `rounded-ds-lg`, `px-4 py-3`, `shadow-sm`.

See Section 3 of this document for full graphic specifications.

### 2.5 Phase timeline swimlane

Keep the existing horizontal scroll of phase cards but add two improvements:

1. **Duration proportion widths.** If all phases have `durationMs`, render each card's width proportional to its share of total phase duration (min-width 80px to preserve readability). This makes the timeline a Gantt-like proportional view rather than equal-width columns.
2. **Hover tooltip.** On phase card hover, a tooltip shows: phase name, step range, dominant action, dominant system.

The swimlane header changes from `SectionHeading` to a row with the heading left and the total duration right-aligned:

```
PHASE TIMELINE                                                    Total: 4m 02s
[Phase 1: Prep] ──────────── [Phase 2: Entry] ────────── [Phase 3: Review] ────
```

### 2.6 Deep sections with grouped sticky nav

Below the phase timeline, the two-column layout begins: main content (flex-1) + sticky side nav (200px, `xl:block`).

**Section grouping in the nav** (replace the flat 17-item list):

```
On this page

Overview
  ─ Process Summary       [rpt-hero]
  ─ Start Here            [rpt-lead, conditional]

Health & Metrics
  ─ Process Health        [rpt-scores]
  ─ Run Metrics           [rpt-metrics]
  ─ Variance & Variants   [rpt-variance]
  ─ Step Duration         [rpt-timestudy]

Evidence
  ─ Insights              [rpt-insights]
  ─ Bottlenecks           [rpt-bottlenecks]
  ─ Step Breakdown        [rpt-steps]
  ─ Friction & Decisions  [rpt-structure]
  ─ Rework Patterns       [rpt-rework]

AI & Automation
  ─ Automation            [rpt-automation]
  ─ Agents                [rpt-agents]
  ─ Skills                [rpt-skills]
  ─ Integrations          [rpt-integrations]
  ─ Roadmap               [rpt-roadmap]
```

Group labels are `text-[9px] uppercase tracking-widest text-[var(--content-tertiary)] px-3 py-1 mt-3` above their entries. Entries under each group are `pl-5 border-l-2` with the current active styling. Groups with no visible entries are hidden entirely.

**Mobile TOC (below 1280px):** A sticky horizontal pill strip that appears when the user scrolls past the KPI band. It shows the group labels only (Overview, Health, Evidence, AI). Tapping a group opens a dropdown with the section entries. This replaces the completely absent navigation currently available on non-XL screens.

**Section titles:** Upgrade from `SectionHeading` (11px uppercase) to a two-level heading system:

- **Group dividers:** A thin rule above the first section in each group with the group name as a label: `text-[10px] uppercase tracking-widest text-[var(--content-tertiary)]`, 1px border above.
- **Section headings:** `text-sm font-semibold text-[var(--content-primary)] mb-4` (14px semibold). Not uppercase. This gives sections visual identity at a glance.

### 2.7 Section rendering order (revised from current)

The current order places Variance & Variants after Run Metrics, which is correct. The following change is recommended:

**Move Automation Opportunities before Bottlenecks.** Automation is a primary use case. Currently it appears at position 9 in the scroll (after Insights). Recommended position: position 6 (after Insights, before Bottlenecks). Rationale: insights say "what" is wrong; automation says "what to do about it"; bottlenecks and steps provide supporting evidence. This is how executive reports in Celonis and similar tools order their sections.

Revised section order:
1. Hero (Overview)
2. Process Scores (Health)
3. Phase Timeline
4. Run Metrics
5. Variance & Variants
6. Step Duration (Timestudy)
7. Insights Feed
8. Automation Opportunities (moved up from position 9)
9. Bottlenecks
10. Step Breakdown
11. Friction & Decisions
12. Rework Patterns
13. Composed Agents
14. Skill Library
15. Integrations & Risks
16. Implementation Roadmap

---

## 3. Specific Graphics for the Report

All charts use Recharts (already a project dependency). All are deterministic and hydration-safe: no `Date.now()` inside chart data derivation, no `Math.random()`, no window-dependent values. Data is derived from props at render time. Chart dimensions are fixed (not percentage-based), preventing hydration mismatch.

### Graphic 1 — Cycle Time Distribution Histogram

**What it shows:** The distribution of step durations for the current workflow run (single-run) or across runs (multi-run). For a single run, it shows step-duration frequency bucketed into 5–8 equal-width bins (e.g., 0–30s, 30s–1m, 1m–2m, 2m–5m, 5m+). For multi-run, it shows run duration distribution (using per-run `meanDurationMs` from `intelligence.timestudy`).

**Data source:**
- Single run: `processOutput.processDefinition.stepDefinitions[*].durationMs` (filter null, bucket into bins).
- Multi-run: `intelligence.timestudy.stepPositionTimestudies[*].meanDurationMs` (one bar per step position, sorted by position).

**Chart type:** Recharts `BarChart`. X-axis: duration buckets (single-run) or step positions (multi-run). Y-axis: count (single-run) or duration in seconds (multi-run). No axes shown at small size — tooltips provide values.

**Size:** Full-width of the section content area at ~560px wide, 100px tall. This is a narrow histogram — enough to show shape without requiring much vertical space.

**Colors:**
- Single-run bars: `var(--brand-500)` (Ledgerium green) for normal steps, `red-500` for identified bottleneck positions.
- Multi-run bars: `brand-400` with a `red-200` overlay segment on bottleneck positions.

**Tooltip:** On hover, shows bucket range or step name + position, value (count or duration).

**Placement:** At the top of the "Run Metrics" section, above the 4-tile stat cards. It replaces the current stat-only presentation with a visual that communicates distribution before numbers.

**Empty state:** Section shows "—" with copy "No step timing data available for this run."
**Single-step state:** A single bar. Not hidden — the bar communicates that the entire run is in one step duration bucket.

**Honesty note:** The chart title distinguishes: "Step durations — this run" (single) vs "Per-step mean duration across N runs" (multi). Never shows statistical spread for a single-run workflow.

---

### Graphic 2 — Variance / Consistency Gauge

**What it shows:** How consistent this process is across runs. A semi-circular gauge (half-donut) where 0% = maximally inconsistent and 100% = perfectly consistent. The displayed value is `sequence_stability` (0–1 scaled to 0–100). A secondary label shows the CV interpretation band.

**Data source:**
- Primary: `intelligence.variance.sequenceStability` (0–1). Displayed as `Math.round(stability * 100)%`.
- Secondary: `intelligence.variance.durationVariance.coefficientOfVariation`. Categorized: <0.2 = "Very consistent," 0.2–0.4 = "Consistent," 0.4–0.7 = "Moderate variation," 0.7–1.0 = "High variation," >1.0 = "Highly variable."

**Chart type:** Recharts `PieChart` with two segments (filled and unfilled), rendered as a 180-degree arc (half-circle). The same pattern as the dashboard health gauge from `UX_DASHBOARD_REVIEW.md` Section 3 Tile 1.

**Size:** 120px wide × 70px tall. Rendered inside a card tile alongside the CV label.

**Colors:** The arc fill color is determined by stability value:
- ≥80%: `brand-500` (green) — consistent process
- 60–79%: `amber-500` — moderate variation
- <60%: `red-500` — high variation

**Text inside arc:** The stability percentage (`78%`) at `text-xl font-bold`, centered below the arc.

**Below the gauge:** The CV interpretation string ("Moderate variation") at `text-xs text-[var(--content-secondary)]`.

**Placement:** At the top of the "Variance & Variants" section, left-side of a 3-column layout alongside the run count tile and the variant count tile.

**Single-run state:** The gauge is hidden. Replace with: "Run this workflow again to measure consistency." This is the existing behavior — keep it, but render the replacement copy at the same visual weight and size as the gauge.

**Multi-run ≥2 state:** Always render. If `sequenceStability` is null, show gauge arc empty (unfilled) with "—" in center and copy "Stability data not available."

---

### Graphic 3 — Variant Frequency Bar Chart

**What it shows:** How often each process variant (distinct execution path) is observed across runs. A horizontal bar chart where each row is a variant and bar width = frequency percentage.

**Data source:** `intelligence.variants.variants[*]` (sorted by frequency descending). Each item: `variantId`, `frequency` (0–1), `runCount`, `isStandardPath`.

**Chart type:** A custom horizontal bar list (NOT Recharts — it is simpler and more legible as plain div bars). Each variant gets a row:

```
[Standard]  ████████████████████████░░░░░░  78%  (14 runs)
[Variant B]  ████░░░░░░░░░░░░░░░░░░░░░░░░░  17%  (3 runs)
[Variant C]  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░   5%  (1 run)
```

Bar height: 12px. Gap between rows: 10px. Bar colors:
- Standard path: `brand-500` (Ledgerium green)
- All other variants: `var(--content-tertiary)` at 60% opacity

Labels: variant ID left, percentage right in `tabular-nums`, run count below in `text-xs text-[var(--content-tertiary)]`.

**The current variant card list** (each variant in a card with a thin 1px progress bar) is replaced by this chart. The Pareto structure (most frequent first) is preserved.

**Size:** Full section width, variable height (N rows × 22px + gaps).

**Below the chart:** The divergence section (where runs branch off the standard path and rejoin) — unchanged in data, but styled with a proper sub-heading "Where runs diverge from the standard path" at `text-sm font-semibold` instead of the `<h4>` with a `GitBranch` icon.

**Placement:** After the 3-tile stat row (runs, completion, median duration) within the Variance & Variants section.

**State when variantList.length === 0 but intelligence exists:** Show "No variant data available yet." in a skeleton card.
**State when only 1 variant exists:** Show the single bar labeled "All runs follow one path." No divergence section.

---

### Graphic 4 — Bottleneck Comparison Bars

**What it shows:** Step duration relative to the process average — which steps take disproportionately long. Each bottleneck step is shown as a horizontal bar representing its mean duration; the average step duration is shown as a reference line.

**Data source:**
- `intelligence.bottlenecks.bottlenecks[*]`: `position`, `meanDurationMs`, `overallMeanStepDurationMs`, `durationRatio`.
- `processOutput.processDefinition.stepDefinitions`: for step titles.

**Chart type:** Recharts `BarChart` horizontal (layout "vertical"). Each bar represents a bottleneck step. The reference line is a `ReferenceLine` at `overallMeanStepDurationMs`. Bar color: `red-400` when `durationRatio > 2`, `amber-400` when `durationRatio 1.5–2`, `brand-400` when `durationRatio 1.0–1.5`.

**Size:** Full section width, approximately 120px tall (scales with number of bottlenecks, max 4–6 bottlenecks shown before scroll).

**What is shown for each bar:** Step title (truncated to 30 chars) as Y-axis label, duration in seconds as bar value, the ratio `(N× avg)` as a text annotation on the right end of each bar.

**Reference line:** A dashed vertical line at `overallMeanStepDurationMs` labeled "Process avg" in `text-[10px] text-[var(--content-tertiary)]`.

**This replaces** the current plain list of `BottleneckRow` components. The list is kept below the chart as a data table for screen readers and print.

**Placement:** Top of the Bottlenecks section, followed by the detail rows (which remain for evidence).

**Empty state:** Existing `SkeletonCard` with "Run intelligence analysis" CTA — keep it.
**Single-bottleneck state:** Single bar — still informative, no special handling needed.

---

### Graphic 5 — Process Health Radar (Optional, Multi-Run Only)

**What it shows:** The four process health scores (Complexity, Friction, Linearity, Manual Intensity) as a radar chart — a single glance communicates the process "fingerprint."

**Data source:** `interpretation.scores` — complexity, friction, linearity, manualIntensity (all 0–100).

**Chart type:** Recharts `RadarChart` with `PolarGrid`, `PolarAngleAxis`, and one `Radar`. Size: 160px × 160px.

**Colors:** Fill `brand-500` at 20% opacity, stroke `brand-600` at 100%.

**When to show:** Only when all four score values are present. Placed at the top of the "Process Health" section, left-aligned alongside the four score tiles (which remain to the right).

**When not to show:** If `interpretation.scores` is null, the existing loading skeleton continues to show.

**This is additive** — the four `ProcessHealthScoreBar` tiles remain. The radar gives an overview gestalt; the tiles give the individual values. Together they serve two reading modes: quick scan (radar) and number inspection (tiles).

**Placement:** Top-left of the Process Health section within a 2-col layout (`grid-cols-[160px_1fr]`).

---

### Graphic 6 — Step Duration Timeline (Timestudy)

**What it shows:** A horizontal dot plot of mean duration per step position, with P90 shown as an error bar above. This replaces the current plain table view.

**Data source:** `intelligence.timestudy.stepPositionTimestudies[*]`: position, meanDurationMs, medianDurationMs, p90DurationMs.

**Chart type:** Recharts `ComposedChart` with a `Line` (mean), `Scatter` (individual positions), and `ErrorBar` for P90. X-axis: step position. Y-axis: duration in seconds. Tooltip on hover shows all three values.

**Size:** Full section width, 120px tall.

**Colors:** Line and dots: `brand-500`. P90 error bars: `brand-300` dashed. Bottleneck positions are highlighted with a `red-400` dot overlaid.

**Below the chart:** The existing plain table remains as an accessible data companion. It is `details`/`summary` collapsed by default ("Show data table") — visible for print, minimized for screen.

**Placement:** Top of the "Step Duration Analysis" section.

---

## 4. Variance & Variants Section: Redesign

The current `VarianceVariantsSection` is the most information-dense section in the report and the least visually organized. It has three distinct stories that deserve distinct visual treatment: (1) the consistency story, (2) the path-variety story, and (3) the divergence story. They are currently intermixed as stat cards and variant cards.

### 4.1 Current problems

- Six stat cards (two rows of three) precede the variant list. These cards use identical card treatment with no visual distinction between the cross-run performance metrics (runs analyzed, completion, median duration) and the variance-specific metrics (sequence stability, duration CV, high-variance steps). A reader cannot tell which row is "how the process performed" versus "how variable the process is."

- The duration CV value is shown as a raw decimal (`0.34`). This number is meaningless without a scale. No interpretation band is shown.

- The variant IDs (`V1`, `V2`, `A3-B7-C2` etc.) are machine-generated strings shown prominently as the variant label. Business users have no way to understand what makes V1 different from V2 from the variant card alone — the `pathSignature.signature` string is cryptographic. The meaningful difference (which steps are in the variant) is not surfaced at all.

- The divergence section ("Where runs diverge") uses inline prose ("After step X → Y → Z → rejoins at W") to describe branches. This is correct information but hard to parse as prose when there are 3+ branch variants.

### 4.2 Single-run state

**Show a clear unlock message, not a hidden section.** The current single-run card ("Recorded once. Run this workflow again to unlock variance, variant paths, and trend analysis.") is correct in honesty. Improve the visual:

```
┌──────────────────────────────────────────────────────────────────┐
│  VARIANCE & VARIANTS                                             │
│                                                                  │
│  [Icon: GitBranch, 32px, brand-200]                             │
│                                                                  │
│  This workflow has been recorded once.                           │
│  Record it again to unlock:                                      │
│                                                                  │
│  ● Consistency score — how much run time varies                  │
│  ● Variant paths — which steps differ across runs                │
│  ● Standard path frequency — what % follow the usual flow        │
│                                                                  │
│  [Record this workflow again →]                                  │
└──────────────────────────────────────────────────────────────────┘
```

The unlock message uses a feature-preview format, not a disabled/skeleton state. It sets expectations and motivates action.

### 4.3 Multi-run layout (≥2 runs)

**Sub-section 1: Consistency story** (top of section)

Two components side by side in a `grid-cols-[auto_1fr]` layout:

Left: The variance/consistency gauge (Graphic 2 above — 120×70px half-arc).
Right: A 2×2 mini-stat grid:

```
Sequence stability    Duration CV
78%                   0.34 — Moderate variation

High-variance steps   Completion rate
2 steps               94%
```

The CV value is always accompanied by its interpretation band label ("Very consistent" / "Consistent" / "Moderate variation" / "High variation" / "Highly variable"). This is the single most important improvement to the variance section — the raw number is currently useless to non-technical readers.

The two-component layout gives the gauge room to be legible while the stat grid provides the precise values.

**Sub-section 2: Path variety story** (middle of section)

A clear sub-heading: `text-sm font-semibold text-[var(--content-primary)] mt-6 mb-3` — "How runs split across paths"

Below: The variant frequency bar chart (Graphic 3 above). Each variant row should include:
- The frequency bar (visual)
- The variant ID (keep — useful for reference)
- Run count and percentage
- A brief path description where derivable from `pathSignature.signature`

**Improve variant legibility:** If `intelligence.variants.variants[*].pathSignature.signature` can be reverse-mapped to step categories (it is presumably a comma- or dash-delimited sequence of step-category codes), then each variant row should show a compact step-type sequence as small colored chips:

```
[Standard]  ████████████████████░░░  78%  14 runs
            [click] → [type] → [click] → [navigate] → [click]

[Variant B]  ████░░░░░░░░░░░░░░░░░░  17%  3 runs
            [click] → [type] → [navigate] → [click]   (skips step 3)
```

If the signature cannot be reverse-mapped to human-readable steps, show the signature in `font-mono text-[10px] text-[var(--content-tertiary)]` but do not make it the primary identifier. The run count is the primary value.

**The standard path** gets visual prominence: `border-brand-200 bg-brand-50/30` background on its row (current behavior, keep), plus a "STANDARD PATH" label in `text-[10px] uppercase tracking-widest text-brand-600`.

**Sub-section 3: Divergence story** (bottom of section)

Sub-heading: "Where runs leave the standard path"

Replace the current inline prose ("After step X → alt step Y → rejoins at Z") with a structured table:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Branch point       Alternate steps       Rejoins at    Runs   Share  │
├────────────────────────────────────────────────────────────────────────┤
│  After "Input form" Skip to "Export"      Step 6        3      17%    │
│  After "Review"    [Extra approval step]  Step 8        1       5%    │
└────────────────────────────────────────────────────────────────────────┘
```

Column headers: `text-[10px] uppercase tracking-wide text-[var(--content-tertiary)]`.
Row content: `text-sm text-[var(--content-primary)]` for branch points and rejoin, `text-amber-600 font-medium` for alternate steps.

The DFG-confirmed flag (`b.dfgConfirmed`) becomes a small `●` indicator in the "Branch point" cell — hover tooltip "Branch confirmed by directly-follows graph analysis."

When there are no branches (all runs follow the standard path): show "All runs follow the standard path end-to-end — no divergence detected." in a `bg-brand-50 border border-brand-200 rounded-ds-md` callout with a `CheckCircle` icon. This is a positive finding and should read as one.

### 4.4 What world-class looks like

Celonis displays variant comparison as a process graph (DFG — directly-follows graph) overlaid with frequency thickness. Apromore shows conformance deviation as a heat-map on a swimlane. Both require a separate process model rendering library (not currently in Ledgerium's stack).

The Ledgerium approach for now: the variant frequency chart plus the divergence table delivers the same information without a process graph renderer. It is honest about what the data supports. The standard path "backbone" representation (chips showing step categories in sequence) substitutes for a graph view while remaining buildable with Recharts + Tailwind.

The one upgrade that would bring this closest to world-class without a full graph renderer: a **step-level heatmap** on the Step Breakdown section. Each step row gets a background color intensity based on how often it appears in variants vs. the standard path. Steps that are "stable" (in every variant) are neutral; steps that are "optional" (skipped in some variants) are amber; steps that are "anomalous" (only appear in rare variants) are red. This visual reinforces the variant story in the step list.

---

## 5. Print / PDF Presentation

The report must be printable as a stakeholder document. The current footer ("Generated from observed workflow behavior · Evidence-backed · Ledgerium AI") is correct and should remain.

### 5.1 Print stylesheet structure

Apply via `@media print` in a report-scoped CSS file or via a Tailwind `print:` prefix where supported.

**What shows in print:**
- Report header (title, metadata, lead sentence)
- Executive summary band (all 4 finding tiles)
- KPI band (all 5 tiles — rendered as static values, no animated charts)
- Phase timeline
- Process Health section
- Insights Feed (all expanded — no accordion in print; show all evidence)
- Automation Opportunities
- Bottlenecks
- Step Breakdown (all steps expanded — no accordion)
- Friction & Decisions
- Rework Patterns

**What is hidden in print:**
- The right-rail navigator (`print:hidden`)
- Category filter pills (Insights section)
- "Run Analysis" action buttons (SkeletonCard CTAs)
- The app navigation bar and tab strip

**Print-specific additions:**
- Page breaks before major section groups: `print:break-before-page` before "Insights Feed" and before "AI & Automation" group.
- A print header on page 2+: `@page { margin: 1in; }` with a running header showing workflow title and page number via CSS counters.
- Section headings receive `print:text-base print:font-bold` to ensure legibility at 72dpi.
- Charts: All Recharts components should render normally in print. Ensure `width` is specified as fixed integers (not percentages) — Recharts already does this when explicit width is passed.

### 5.2 PDF export CTA

The "Print / PDF" button in the report header triggers `window.print()`. Modern browsers (Chrome, Edge, Safari) offer "Save as PDF" in the print dialog. No server-side PDF generation required.

A secondary "Export JSON" button exports the raw data payload for the workflow (all five data sources serialized). This is useful for engineering handoff and data portability. The button is already referenced in the current export pattern.

### 5.3 Printable finding tiles

The executive summary band's 4 finding tiles must print cleanly. Each tile should be `min-h-[100px]` to ensure borders are visible in print and content does not bleed into adjacent tiles.

Recommendation: For the printed header, include a horizontal rule and a "Ledgerium AI — Process Intelligence Report" string with the `createdAt` date. This makes the printed document identifiable when separated from its browser context.

---

## 6. Empty, Single-Run, Sparse, and Loading States

Every state must be honest. No fabricated data; no placeholder numbers.

### 6.1 Full loading state (data not yet fetched)

All five data sources (`insights`, `interpretation`, `intelligence`, `agentIntelligence`, `processOutput`) are null on initial render. The existing `SkeletonCard` component is used but inconsistently — some sections show `animate-pulse` cards; others wait silently.

**Recommended:** On initial load, show:
- Hero section: animated skeleton for the 6-metric band (current `ProcessScoresSection` skeleton pattern — `animate-pulse` cards with grey bar placeholders). Also show the title and lead sentence from `workflow` props (these are always present — the hero has real content on first render).
- All other sections below: render one full-height `animate-pulse` rectangle per section (`h-32 rounded-ds-lg bg-[var(--surface-secondary)] animate-pulse`) as a placeholder. This gives readers a structural preview of the document while data loads.
- Do NOT show the executive summary band while loading. Show a single `animate-pulse` rectangle at the band's expected height.

### 6.2 Single-run state

A workflow that has been recorded exactly once has full data for: `interpretation`, `insights`, `processOutput`. It has partial or absent data for: `intelligence` (no multi-run metrics, no variance, no variants, no timestudy), `agentIntelligence` (may be present if AI analysis was run).

**What to show:**
- Hero: Normal — single-run data is complete.
- Executive Summary band: Normal — all tiles derive from single-run data.
- KPI band: Cycle time tile shows the single-run duration (not mean — it is one observation). Variance gauge is hidden and replaced with the unlock message (see 4.2). Variant chart is replaced with unlock message.
- Process Health: Normal — `interpretation.scores` is single-run.
- Phase Timeline: Normal.
- Run Metrics: Shows with caveats. A single-run badge "1 recording" appears beside the section heading. Metrics derived from single runs (avg step duration, longest step) are shown normally. Metrics that require ≥2 runs (CV, trend) are shown as "—" with tooltip "Needs 2+ runs."
- Variance & Variants section: Shows the unlock card (Section 4.2 above).
- Timestudy section: Hidden (the `runCount < 2` guard is correct — keep it).

### 6.3 Sparse state (2–4 runs)

At 2–4 runs, variance and variant metrics are present but imprecise. A global sparse banner is not needed. Instead, inline disclosures on affected metrics:

- Variance gauge: Renders normally, but below the gauge shows "Based on N runs — record more to improve accuracy" in `text-[10px] text-[var(--content-tertiary)]`.
- Duration CV interpretation band: If N < 5, the band label is suffixed with "*" and a footnote at the bottom of the Variance section reads "* CV estimate from fewer than 5 runs — treat as directional."
- Automation confidence banner (current behavior — `runCount >= 10 → high confidence, >= 2 → medium, < 2 → low`): Keep. The `medium confidence` label at 2–4 runs is correct and honest.

### 6.4 No intelligence analysis run state

When `intelligence` is null (analysis not yet run), the following sections show their `SkeletonCard` with the "Run Analysis" CTA:
- Bottlenecks: existing behavior, keep.
- Variance & Variants: shows null-check exit — change this. Instead of `return null`, show the existing unlock card with an additional CTA: "Run intelligence analysis to see variance data." This is more discoverable than silently hiding the section.

When `agentIntelligence` is null, sections Automation, Agents, Skills, Integrations, Roadmap are either null-returned or show skeleton cards. The Automation section should always render (it is a primary section) and show its skeleton CTA. The agent sections can remain null-returned.

### 6.5 Error state

Currently, the `asArray` defensive helper prevents most null-access errors. But if a data source arrives in an unexpected shape (not an object, or missing a required nested property), individual sections silently render empty. There is no error boundary per section.

**Recommended:** Add a per-section `ErrorBoundary` wrapper in React. If a section throws, it renders: "This section encountered an error. Other sections are unaffected." with a report bug link. This prevents one malformed data source from silently blanking a section without any user feedback.

---

## 7. P0–P2 UX Punch-List

### P0 — Required before any wider sharing of the Report tab

| ID | Issue | Component | Fix | Effort |
|----|-------|-----------|-----|--------|
| RPT-P0-01 | No executive summary. Readers must scroll the full document to understand conclusions. A busy stakeholder or manager cannot get value in 30 seconds. | New `ExecutiveSummaryBand` | Add a 4-tile finding band (Section 2.3). Sources: `interpretation.processType`, `interpretation.scores`, `interpretation.friction[0]`, `agentIntelligence.opportunities[0]`. All four must handle null gracefully. | M |
| RPT-P0-02 | Duration CV is shown as a raw decimal (`0.34`) with no interpretation. Non-technical readers cannot derive meaning from this number. | `VarianceVariantsSection` | Add CV interpretation bands: <0.2 = "Very consistent", 0.2–0.4 = "Consistent", 0.4–0.7 = "Moderate variation", 0.7–1.0 = "High variation", >1.0 = "Highly variable." Show the band label alongside or below the number in `text-xs text-[var(--content-secondary)]`. | S |
| RPT-P0-03 | Right-rail navigator is hidden below 1280px. On 1024–1279px screens (common laptop) there is zero section navigation. | `RightRailNavigator` | Add a mobile/tablet TOC: a sticky collapsed pill strip below the KPI band on screens narrower than 1280px. On tap, it expands to show section groups and entries (see Section 2.6). | M |
| RPT-P0-04 | The side nav has 17 flat entries with no grouping. Users cannot quickly identify which sections are overview vs deep analysis vs AI-only. | `RightRailNavigator` | Group entries into 4 labeled categories: Overview, Health & Metrics, Evidence, AI & Automation (Section 2.6 specification). | S |
| RPT-P0-05 | Automation Opportunities appear at position 9 in the scroll. For a tool that prioritizes AI automation as a primary value proposition, automation findings should follow immediately after insights. | `WorkflowReportPage` render order | Move `AutomationSection` from its current position (after Bottlenecks) to position 8: after InsightsFeedSection, before BottlenecksSection. One-line reorder in the JSX return. | S |
| RPT-P0-06 | The Insights section heading and severity badges are in the same flex row, creating visual clutter and misaligned baseline. | `InsightsFeedSection` | Separate the heading from severity badges into two rows. `SectionHeading` on its own line; severity badges as a secondary row below it in `flex items-center gap-2 mb-4`. | S |
| RPT-P0-07 | The variant path content is cryptographic (`pathSignature.signature` strings in `font-mono truncate`). Business readers see machine strings where they expect plain-language path descriptions. | `VarianceVariantsSection` variant rows | Suppress the `pathSignature.signature` display by default. Only show it on expand/hover as a `details`/`summary` disclosure ("Show path signature"). The primary variant information is frequency, run count, and the standard-path flag. | S |

### P1 — Required before GA launch or external sharing

| ID | Issue | Component | Fix | Effort |
|----|-------|-----------|-----|--------|
| RPT-P1-01 | No KPI band with charts at the top of the report. The dashboard has a KPI tile strip; the report has none. A report opened standalone has no graphical summary above the fold. | New `ReportKpiBand` | 5-tile KPI band: health score (gauge), overall duration (single value), consistency (variance gauge), variants (count), automation score (chip). See Section 3 for full spec. Reuse dashboard KPI tile visual pattern. | L |
| RPT-P1-02 | The bottleneck list is purely textual. Steps with 4× average duration look identical to steps with 1.2× average duration. No visual encoding of severity. | `BottlenecksSection` | Add bottleneck comparison bar chart (Graphic 4, Section 3). Recharts horizontal `BarChart` with reference line at average. Existing `BottleneckRow` list remains as accessible data companion below. | M |
| RPT-P1-03 | Single-run variant section returns `null` (section disappears from page and nav). This is confusing — users do not know the feature exists. | `VarianceVariantsSection` | Replace null-return with the structured unlock card (Section 4.2). The unlock card should be shown at the full section height (~200px) with the feature preview bullet list and a "Record again" CTA. | S |
| RPT-P1-04 | The phase timeline cards use equal-width columns regardless of phase duration. A 10-minute phase and a 30-second phase get the same card width — misleading visual proportion. | `PhaseTimelineSection` | Apply proportional widths based on `phase.durationMs` share. Minimum card width: 80px (current behavior — keep as floor). If any phase has null `durationMs`, fall back to equal widths and add a footnote "Phase durations not available — showing equal widths." | M |
| RPT-P1-05 | Step insights reference step ordinals (e.g., `stepOrdinals: [3, 7]`) but there is no link from insight cards to the corresponding step in the Step Breakdown section. | `InsightActionCard`, `StepBreakdownSection` | Add anchor links from step ordinal references in insight cards: clicking "Step 7" scrolls to and highlights Step 7 in the Step Breakdown section. Use `document.getElementById('rpt-step-7')` or equivalent. Add `id="rpt-step-{ordinal}"` to each step row. | M |
| RPT-P1-06 | No print stylesheet. The report as printed from browser shows nav bars, action buttons, filter pills, and other chrome that is irrelevant in a paper document. | Global print CSS or Tailwind `print:` variants | Add `print:hidden` to: right-rail nav, category filter pills, Run Analysis CTA buttons, share button, page navigation. Add `print:break-before-page` at Insights section start. Add print header with workflow title + date. | S |
| RPT-P1-07 | The Process Health section has four score tiles but no visual summary of the overall process shape. Four separate bars communicate independent dimensions; they do not communicate how the dimensions relate. | `ProcessScoresSection` | Add process health radar chart (Graphic 5, Section 3) as a 160×160px component to the left of the score tiles. Only renders when all four scores are present. | M |
| RPT-P1-08 | The Timestudy table (per-step mean/median/p90) is the most data-rich section but is presented as a plain table with no visual encoding. Users cannot quickly identify which steps have the widest spread. | `TimestudySection` | Add step duration timeline chart (Graphic 6, Section 3) above the table. Show the table collapsed in a `<details>` element labeled "Show data table" — expanded by default in print. | M |
| RPT-P1-09 | The step breakdown section has no visual distinction between steps that appear in all variants vs steps that are "optional" (skipped in some variants). | `StepBreakdownSection` | Add a step-consistency heat indicator. If variant data is available, each step row gets a small colored dot to the right of its ordinal badge: green = appears in all variants, amber = skipped in some variants, grey = data unavailable. Tooltip: "In all N variants" or "Skipped in M of N variants." | M |
| RPT-P1-10 | The `ReportTab` (the older, lighter version) and `WorkflowReportPage` coexist with no clear user-facing explanation of which they are seeing and why. The tab label is "Report" for both. | `ReportTab`, workflow detail page | Add a contextual notice at the top of `ReportTab` when `WorkflowReportPage` is not yet available: "Full process intelligence report is being generated. This is the initial extraction report." This sets expectations. | S |

### P2 — Meaningful improvement, defer if necessary

| ID | Issue | Component | Fix | Effort |
|----|-------|-----------|-----|--------|
| RPT-P2-01 | The six hero metric cells have no visual hierarchy — Duration, Steps, Phases, Confidence, Systems, and Status all render at identical scale. The most important number (Duration) does not visually lead. | `HeroSection` metric band | Give Duration a larger headline size (`text-4xl` vs current `text-[28px]`) and make it the leftmost dominant cell. Confidence and Status should be visually secondary (smaller label weight, no large number for Status — it is a badge not a metric). | S |
| RPT-P2-02 | The animated count-up (`useCountUp`) on metric cells introduces a delay before the reader can read the key numbers. A reader who lands on the page and immediately looks at the metrics sees numbers counting up from 0. This is distracting and delays comprehension. | `HeroSection` | Make count-up optional and disabled by default for screen readers (`prefers-reduced-motion`). Consider whether the animation adds enough delight to justify the comprehension cost — if numbers jump from 0→88% in 900ms, the endpoint is visible for only a fraction of the reading time. | S |
| RPT-P2-03 | Section transitions have no visual chapter markers. The space between sections is a uniform `space-y-10` (40px). There is no sense of the report having three acts. | `WorkflowReportPage` layout | Add a thin horizontal rule with a gradient fade (`bg-gradient-to-r from-[var(--border-subtle)] via-[var(--border-subtle)] to-transparent`) between major section groups (Health group → Evidence group → AI group). | S |
| RPT-P2-04 | The rework patterns section shows `totalOccurrences` as a badge but individual rework items show their occurrence count as a `text-2xl font-bold text-amber-600` number on the right side of each card. This is visually prominent for a secondary data point. | `ReworkPatternsSection` | Reduce the individual occurrence counter to `text-sm font-semibold` inline with the description. The total occurrences badge on the section heading is the right visual anchor. | S |
| RPT-P2-05 | The Skill Library table and Integrations table have no visual encoding beyond a progress bar and dot-complexity indicator. The tables feel like raw data exports rather than curated intelligence. | `SkillLibrarySection`, `IntegrationsSection` | Add a summary callout above each table: "N of N skills are reusable across other workflows" / "N integrations are API-ready." These summary sentences save readers from scanning the full table to get the headline finding. | S |
| RPT-P2-06 | There is no cross-reference between the Automation Opportunities section and the Bottlenecks section. An automation opportunity at Step 3 and a bottleneck at Step 3 are the same evidence shown in two sections without any link between them. | `AutomationSection`, `BottlenecksSection` | When an automation opportunity's step position matches a bottleneck position, add a cross-reference chip in the automation card: "Bottleneck confirmed — Step 3 is also the top bottleneck (4.2× avg)." Data join: `opportunities[*].stepOrdinal` (if present) matched against `bottlenecks[*].position`. | M |
| RPT-P2-07 | The footer ("Generated from observed workflow behavior · Evidence-backed · Ledgerium AI") appears at the very bottom of the page, far from the executive audience who will care most about the evidence basis. | `WorkflowReportPage` footer | Keep the footer. Add a secondary confidence disclosure at the top of the executive summary band, immediately below the lead sentence: "Based on N recorded run(s) · Extraction confidence: N% · Generated Jun 14, 2026." One line, `text-[11px] text-[var(--content-tertiary)]`. | S |
| RPT-P2-08 | The "On this page" nav label is generic. On a document that is meant to be shared with stakeholders, this phrase has no brand identity or context. | `RightRailNavigator` | Change "On this page" to "Report sections" (`text-[10px] font-semibold uppercase tracking-widest`). Minor but improves the document feel. | S |
| RPT-P2-09 | The `LeadInsightSection` only appears when one step owns ≥25% of process time. For short or highly distributed processes (no step dominates), the section is hidden and readers receive no "start here" signal at all. | `LeadInsightSection`, `WorkflowReportPage` | When the ≥25% threshold is not met, fall back to the highest-severity insight from `insights.insights[0]` as the "Start here" callout. If no insights exist, show nothing (current behavior). The 25% threshold guards against showing a trivial time-leverage leader; using the highest-severity insight as a fallback ensures the callout is always present when meaningful data exists. | S |

---

## Assumptions and Handoff Notes

**Assumptions affecting implementation:**

1. The executive summary band (Section 2.3) derives all four tiles from already-loaded props. No additional API calls are needed. The `interpretation.summary` string from the AI interpretation pipeline becomes the prose lede.

2. The variance gauge (Graphic 2) uses `PieChart` from Recharts with two data points (filled and unfilled), constrained to a 180-degree arc via `startAngle={180} endAngle={0}`. The same pattern used for the dashboard health gauge is directly reusable here.

3. The variant frequency chart (Graphic 3) is implemented as plain `div`-based horizontal bars (not Recharts). This avoids chart library overhead for a simple proportional bar. Bar widths are set via `style={{ width: \`\${Math.round(frequency * 100)}%\` }}`. All bars are constrained to a parent with `overflow: hidden`.

4. The bottleneck comparison chart (Graphic 4) uses Recharts `BarChart` with `layout="vertical"`. The Y-axis `dataKey` is the step title (truncated). The X-axis `dataKey` is `meanDurationMs`. A `ReferenceLine` is added at `x={overallMeanStepDurationMs}`. This requires all bottleneck items to share the same `overallMeanStepDurationMs` value — which is true from the data interface.

5. The radar chart (Graphic 5) uses Recharts `RadarChart`. The `data` prop is an array of 4 objects: `[{dimension: "Complexity", value: 68}, {dimension: "Friction", value: 45}, ...]`. The `Radar` component fills at 20% opacity. The chart renders in SSR mode with static width (no `ResponsiveContainer` — use fixed `width={160} height={160}` to prevent hydration mismatch).

6. Proportional phase card widths (Section 2.5) require a total phase duration. If any phase has null `durationMs`, all cards fall back to equal widths (the current `min-w-[80px]` pattern). A footnote is added in that case.

7. The mobile sticky TOC (Section 2.6) uses a `position: sticky; top: 0` strip, shown only below 1280px (`xl:hidden`). It requires the section scroll container to have `overflow: auto` on the page content wrapper, not the document body. Confirm the app's scroll architecture before implementing.

8. The step-reference anchor links (P1-05) assume step ordinals are stable — they are, since they are ordinal positions in the extracted step list and do not change. The `id="rpt-step-{ordinal}"` attribute is added to each step row's wrapper div.

9. Print styles use `@media print` with Tailwind's `print:` variant prefix where possible. The print header (workflow title + date) is implemented as a `<div class="hidden print:block">` element positioned at the top of the report.

10. The CV interpretation bands (P0-02) use fixed breakpoints. These thresholds are standard in statistical process control (SPC) literature (Wheeler, "Understanding Statistical Process Control") and are appropriate for process-duration consistency analysis. They are not configurable — they are deterministic constants.

**Frontend engineering notes:**

- The `ExecutiveSummaryBand` component should be a single new file in `apps/web-app/src/components/detail/`. It receives `interpretation`, `insights`, and `agentIntelligence` as props and renders the 4-tile grid. Each tile is a small sub-component or inline JSX.
- The `ReportKpiBand` component follows the same structure as `KpiBand` on the dashboard — a parent that receives all needed stats as props and renders N tile sub-components. Reuse the tile card CSS pattern (`bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-ds-lg px-4 py-3 shadow-sm`).
- The grouped right-rail nav replaces the flat `sectionIds.map()` in `RightRailNavigator` with a group-definition structure: `const SECTION_GROUPS = [ { label: 'Overview', ids: ['rpt-hero', 'rpt-lead'] }, { label: 'Health & Metrics', ids: ['rpt-scores', 'rpt-metrics', 'rpt-variance', 'rpt-timestudy'] }, ... ]`.
- Recharts `BarChart` and `RadarChart` should be imported lazily (`next/dynamic` with `ssr: false`) to prevent SSR hydration issues with chart dimensions. The gauge `PieChart` is safe to render server-side at fixed dimensions.
- The print CTA button triggers `window.print()` — wrap in `typeof window !== 'undefined'` check for SSR safety.
- All chart color values should use CSS custom properties where possible (`var(--brand-500)` etc.) to support dark mode. Where Recharts requires hex values (some `fill=` props), use the Tailwind color tokens from the theme config rather than hard-coded hex.

**QA validation targets:**

- Executive summary band renders all 4 tiles in both populated and empty states — none show "undefined" or raw null values.
- CV interpretation band label appears next to the CV value in all tested states: `cv = 0.15` → "Very consistent," `cv = 0.55` → "Moderate variation," `cv = 0.95` → "High variation."
- Single-run variant section shows the unlock card, not a blank section.
- Right-rail nav shows grouped entries. Groups with zero visible sections are hidden entirely (no empty group labels).
- Mobile TOC appears below 1280px and hides above 1280px (`xl:hidden` on the mobile TOC, `hidden xl:block` on the right rail — verify there is no gap in between where neither appears, e.g., at 1280px exactly).
- Automation section renders at position 8 (after Insights, before Bottlenecks) in the scroll order.
- Print view hides: right-rail nav, filter pills, "Run Analysis" buttons, app navigation. Shows: all section content with headings.
- Proportional phase timeline: a phase with 50% of total time has a card approximately 50% of the total timeline width (within min-width floor). A phase with null `durationMs` causes all cards to render at equal widths.
- The variance gauge renders as a semi-circle for `sequenceStability = 0.78`, with `brand-500` fill color and "78%" label inside the arc.
- Step ordinal references in insight cards link to the correct expanded step row in the Step Breakdown section.
- The bottleneck bar chart's reference line sits at `overallMeanStepDurationMs`, visually between the fastest and slowest bottleneck bars in all test cases.
