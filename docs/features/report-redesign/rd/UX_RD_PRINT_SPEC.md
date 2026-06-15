# UX R-D Print Spec — Stakeholder Deliverable (Print/PDF) + On-Screen Polish
**Date:** 2026-06-14
**Author:** ux-designer
**Scope:** Define phase — no code. Concrete specifications for frontend and QA. Covers: `@media print` rules, page layout, on-screen affordance changes, grouped nav, evidence badge, legacy cleanup, empty states, and the P0–P2 punch-list.

---

## 0. Approach and Fixed Constraints

**Print mechanism:** Client-side only. `window.print()` triggers the browser print dialog. "Save as PDF" is a first-class output of Chrome, Edge, and Safari print dialogs. No server PDF service is required or in scope.

**On-screen print affordance:** The current "Report" export button (which downloads raw JSON) is removed. Two actions replace it: "Print / Save as PDF" (triggers `window.print()`) and "Export data (JSON)" (downloads the serialized payload as today). See Section 2 for exact placement and label.

**Style delivery:** All `@media print` rules live in a scoped stylesheet imported by `WorkflowReportPage.tsx`. No Tailwind `print:` prefix is used for the structural rules — those require too much class explosion in JSX. Tailwind `print:hidden` and `print:block` helper classes are permitted for one-off show/hide declarations on specific elements where adding a CSS class is simpler than adding a stylesheet selector.

**Color:** The spec uses `color-adjust: exact; -webkit-print-color-adjust: exact` on all colored elements that must survive print (severity badges, bars, gauge fills). Without this declaration, browsers strip background colors in print mode.

---

## 1. Print / PDF Layout

### 1.1 Page Setup

```css
@media print {
  @page {
    size: A4;          /* 210mm × 297mm; also works for Letter — browser scales */
    margin: 18mm 16mm 22mm 16mm;
                       /* top right bottom left; bottom is taller for footer */
  }

  @page :first {
    margin-top: 14mm;  /* P1 header is taller; tighter top on page 1 */
  }
}
```

**Rationale for A4:** The competitive benchmark confirms every peer tool exports A4/Letter. Both fit at the browser's default print scale. Engineers must NOT hard-code Letter — `size: A4` renders correctly on both page sizes in all three target browsers.

### 1.2 Global Print Reset

```css
@media print {
  /* White canvas, black body text. No background gradients survive. */
  body,
  .workflow-report-page {
    background: #ffffff !important;
    color: #111827 !important;  /* Tailwind gray-900 */
    font-size: 10pt;
    line-height: 1.5;
  }

  /* Strip app shell chrome */
  nav,
  header.app-header,
  [data-app-nav],
  [data-tab-strip],
  [data-consent-banner] {
    display: none !important;
  }

  /* Hyperlink decoration — strip underlines and href expansion */
  a { text-decoration: none; color: inherit; }
  a[href]::after { content: ''; }

  /* Ensure SVG gauge fills survive */
  svg { color-adjust: exact; -webkit-print-color-adjust: exact; }

  /* Force all backgrounds to print — badges, bars, gauge arcs */
  * {
    color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
```

### 1.3 Elements Hidden in Print

Each of the following receives `display: none !important` in the print stylesheet. The simplest implementation is wrapping each in a `<div className="report-print-hidden">` and adding `.report-print-hidden { display: none !important; }` to the print stylesheet.

| Element | Location in component | Print rule |
|---|---|---|
| Right-rail navigator | `RightRailNavigator` (entire `<nav>`) | hidden |
| Mobile sticky TOC pill strip | new element (Section 4) | hidden |
| Insights category filter pills | `InsightsFeedSection` filter button row | hidden |
| "Run Analysis" / "Run AI Analysis" CTA buttons | `SkeletonCard` onAction buttons | hidden |
| "Share" button in report header | header action group | hidden |
| "Export data (JSON)" button | header action group | hidden |
| Expand/collapse chevrons in step breakdown | `StepBreakdownSection` `ChevronDown` icons | hidden |
| Expand/collapse chevrons in `InsightActionCard` | wherever rendered | hidden |
| Browser extension consent banner | global | hidden |
| `useCountUp` animated values | `HeroSection` metric band — see Section 5 | resolved by static rendering |

### 1.4 Page 1 Layout — What Prints

Page 1 contains everything from the top of the report through the end of the Scorecard (5 KPI tiles). If there is enough space, the variant Pareto also begins on page 1.

**Exact content order on Page 1:**

1. **Print-only page header** (hidden on screen, visible in print):
   ```
   LEDGERIUM AI — PROCESS INTELLIGENCE REPORT
   [workflow.title]                                                        [createdAt formatted as Jun 14, 2026]
   ```
   Implementation: a `<div class="report-print-header print:block hidden">` placed as the first child of `WorkflowReportPage`'s return. Contains the report title (`text-[11pt] font-semibold uppercase tracking-wide`), workflow title (`text-[16pt] font-bold`), and the date right-aligned. A 1pt bottom border separates it from the body. This div is `display: none` on screen and `display: block` in print via `print:block hidden`.

2. **Evidence-linked badge** (the on-screen badge from Section 3 prints here, immediately below the print header). The badge text "Evidence-linked" and the tooltip disclosure text "Every figure traces to recorded events — nothing modeled or inferred" are both printed inline as a single `<span>` since tooltips do not work in print. The print rendering is: `[●] Evidence-linked · Every figure traces to recorded events — nothing modeled or inferred` in `text-[8pt] text-gray-500`.

3. **Verdict block** (`ExecutiveVerdictSection` — `rpt-verdict`). The gradient background (`bg-gradient-to-br from-brand-50/70 to-white`) prints as `#f0fdf4` approximation. The `VERDICT` label prints in `text-[8pt] uppercase`. The first verdict sentence prints at `text-[12pt] font-semibold`. Supporting sentences at `text-[10pt]`.

4. **Scorecard** (`ReportScorecardSection` — `rpt-scorecard`). The 5-tile grid prints as a 5-column row. Each tile: white background, 1pt border `#e5e7eb`, 4mm padding. Tile labels at `text-[7pt] uppercase`. Values at `text-[14pt] font-semibold`. Interpretation text at `text-[8pt]`. The consistency tile's colored dot must print — it carries `color-adjust: exact`.

5. **Variant Pareto** (`VarianceVariantsSection` Pareto rows — `rpt-variance` partial): only the Pareto bar rows and the section heading print on page 1 if space allows. The divergence table is pushed to page 2 with `break-inside: avoid` on the divergence sub-section wrapper.

**Page break after scorecard (if Pareto won't fit):**

```css
@media print {
  #rpt-distribution {
    break-before: page;
  }
}
```

This ensures page 2 always starts cleanly at Cycle-Time Spread. If the Pareto does fit on page 1, the page break is before the Cycle-Time Spread section instead.

### 1.5 Page 2+ Layout — What Prints

Pages 2 and beyond contain, in this order:

| Section | Section ID | Break behavior |
|---|---|---|
| Cycle-Time Spread | `rpt-distribution` | `break-before: page` (or immediately after Pareto if it fit on P1) |
| Consistency gauge | `rpt-consistency` | `break-inside: avoid` |
| Variance & Variants (remaining) | `rpt-variance` remainder | `break-inside: avoid` on divergence table |
| Drift signals | `rpt-drift` | `break-inside: avoid` |
| Key Actions insight cards | `rpt-insight-cards` | `break-before: auto; break-inside: avoid` per card |
| Bottleneck ranking | `rpt-bottlenecks` | `break-inside: avoid` |
| Step Breakdown (all steps expanded) | `rpt-steps` | `break-inside: avoid` per step row |
| Friction & Decisions | `rpt-structure` | `break-inside: avoid` |
| Rework Patterns | `rpt-rework` | `break-inside: avoid` per card |

**Sections that do NOT print:**

| Section | Reason |
|---|---|
| `HeroSection` (`rpt-hero`) | Duplicates the print page header; the metric band is redundant after the scorecard |
| `LeadInsightSection` (`rpt-lead`) | Absorbed into the print header amber callout (see 1.6) |
| `RunMetricsSection` (`rpt-metrics`) | Redundant — scorecard + distribution cover the same ground more clearly |
| `TimestudySection` (`rpt-timestudy`) | Detail-level, not stakeholder-summary |
| `ProcessScoresSection` (`rpt-scores`) | Present on screen; omitted from print to keep stakeholder doc focused |
| `InsightsFeedSection` (`rpt-insights`) | Omitted — insight cards (`rpt-insight-cards`) serve as the curated print summary |
| `AutomationSection` (`rpt-automation`) | Automation opportunities are dense; omitted to keep PDF under 4 pages |
| All agent sections (`rpt-agents`, `rpt-skills`, `rpt-integrations`, `rpt-roadmap`) | Specialist audience, not stakeholder deliverable |
| `PhaseTimelineSection` (`rpt-phases`) | Horizontal scroll layout does not translate to print without redesign |

Implementation: add `class="report-no-print"` to each excluded section wrapper and a corresponding `.report-no-print { display: none !important; }` rule in the print stylesheet.

**The Insight Cards section (`rpt-insight-cards`) always prints expanded.** The `InsightCard` components on screen use an expand/collapse pattern. In print, the accordion is irrelevant. Add:

```css
@media print {
  .insight-card-body {
    display: block !important;  /* force all evidence + recommendation text visible */
  }
  .insight-card-chevron {
    display: none !important;
  }
}
```

This requires the `InsightCardsSection` JSX to include `className="insight-card-body"` on the collapsible content wrapper and `className="insight-card-chevron"` on the chevron icon. The current `InsightCardsSection` in `WorkflowReportPage` already renders expanded cards (it is not an accordion), so this rule is a no-op for the current implementation — it is a guard for future refactors.

**Step Breakdown in print: all steps expanded.** The current accordion collapses step evidence behind a `ChevronDown` click. In print, evidence must be visible:

```css
@media print {
  .step-detail-panel {
    display: block !important;
  }
  .step-expand-chevron {
    display: none !important;
  }
}
```

Add `className="step-detail-panel"` to the `{isExpanded && (...)}` div inside `StepBreakdownSection` and `className="step-expand-chevron"` to the `ChevronDown` icon.

### 1.6 Print Header Amber Callout

The `LeadInsightSection` amber callout ("Start here — Step N owns X% of active process time") renders on screen but not in print as its own section. Instead, the amber callout text prints as an inline note immediately below the print-only page header:

```
[LEDGERIUM AI — PROCESS INTELLIGENCE REPORT]
[Workflow Title]                                                [Date]
────────────────────────────────────────────────────────────────────
Start here: Step 3 owns 41% of active process time (1m 52s of 4m 33s).
────────────────────────────────────────────────────────────────────
```

Implementation: a second print-only element `<div class="report-print-lead hidden print:block">` immediately following the print-only page header. It conditionally renders the `LeadInsightSection` text inline (same `deriveTimeLeverage` computation, no component reuse needed — just the string). If no lead insight exists (`lev == null || lev.longestPct < 25`), this div is empty and its horizontal rules are not rendered.

### 1.7 Honesty Footer on Every Printed Page

A footer appears on every printed page. CSS running elements are not universally supported; the practical approach is a fixed-position print footer:

```css
@media print {
  .report-print-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 4mm 16mm;
    border-top: 0.5pt solid #d1d5db;  /* gray-300 */
    font-size: 7pt;
    color: #6b7280;                    /* gray-500 */
    display: flex;
    justify-content: space-between;
    background: #ffffff;
  }
}
```

The footer element is placed as the last child of `WorkflowReportPage` and is `hidden` on screen:

```html
<div class="report-print-footer hidden print:block">
  <span>Generated from {runCount} recorded run{s} · {dateRange} · All data derived from observed behavior — no modeled estimations.</span>
  <span>Ledgerium AI · {workflow.title}</span>
</div>
```

**Footer copy is mandatory and immutable.** The phrase "All data derived from observed behavior — no modeled estimations." must appear verbatim. This is the differentiator identified in `COMPETITIVE_REPORT_BENCHMARK.md`. It is not paraphraseable.

**`{runCount}`:** `intelligence.metrics.runCount ?? 1`. Displayed as "1 recorded run" or "N recorded runs".

**`{dateRange}`:** Derived from `workflow.createdAt` (first run) and `workflow.updatedAt` (last activity). Format: `Jan 5 – Jun 14, 2026`. If both dates are the same day: `Jun 14, 2026`. No library required — use `Date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`.

### 1.8 Card and Section Break Rules

```css
@media print {
  /* Prevent cards from splitting across pages */
  .card,
  .report-card,
  [class*="rounded-ds-lg"],
  [class*="rounded-ds-md"] {
    break-inside: avoid;
  }

  /* Prevent section heading from orphaning at page bottom */
  h2, h3, .report-section-heading {
    break-after: avoid;
  }

  /* Each insight card stays intact */
  #rpt-insight-cards > div > div {
    break-inside: avoid;
  }

  /* Each bottleneck row stays intact */
  #rpt-bottlenecks .divide-y > div {
    break-inside: avoid;
  }

  /* Each step row stays intact */
  #rpt-steps .divide-y > div {
    break-inside: avoid;
  }

  /* Divergence table block stays intact */
  .report-divergence-table {
    break-inside: avoid;
  }
}
```

The `break-inside: avoid` selector targeting `[class*="rounded-ds-lg"]` is broad but safe — rounded cards are the primary unit of visual containment in this layout.

### 1.9 Typography Adjustments for Print

```css
@media print {
  /* Section headings: all-caps 8pt → semibold 11pt readable heading */
  .report-section-heading {
    font-size: 9pt !important;
    font-weight: 700 !important;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #374151 !important;  /* gray-700 */
    margin-bottom: 6pt;
  }

  /* Primary body text */
  p, li, td, th {
    font-size: 9pt;
    color: #111827;
  }

  /* Secondary/tertiary text — lighten to gray-600, not gray-400 (too faint at 72dpi) */
  [class*="content-secondary"],
  [class*="content-tertiary"] {
    color: #4b5563 !important;  /* gray-600 */
  }

  /* Verdict first sentence: needs to dominate page 1 */
  .report-verdict-primary {
    font-size: 13pt !important;
    font-weight: 700 !important;
  }

  /* Scorecard tile values */
  .report-scorecard-value {
    font-size: 13pt !important;
    font-weight: 600 !important;
  }
}
```

### 1.10 Distribution Spread Bar in Print

The `CycleTimeDistributionSection` renders a pure CSS gradient range track with SVG tick marks. This prints correctly with `color-adjust: exact`. No changes needed. The gradient (`from-[var(--surface-secondary)] via-brand-200 to-amber-300/40`) resolves to hex values at print time — verify in a test print that the gradient is visible. If not, replace with a simpler `background: linear-gradient(to right, #e5e7eb, #bbf7d0, #fde68a)` hardcoded version inside a print-only override.

### 1.11 Consistency Gauge in Print

The `ConsistencyGaugeSection` SVG arc is `color-adjust: exact` and uses `stroke` attributes directly (not `background`). SVG strokes survive print without any additional rules. No changes needed.

### 1.12 Bottleneck Contribution Bars in Print

The `BottleneckContributionSection` bars use `background-color` via Tailwind classes (`bg-red-500`, `bg-red-400`). These require `color-adjust: exact` to survive. Add to the `.report-print-colors` class applied to the bar divs:

```css
@media print {
  .bottleneck-bar {
    color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
```

Add `className="bottleneck-bar"` to the `<div>` that carries the `bg-red-500`/`bg-red-400` fill inside `BottleneckContributionSection`.

---

## 2. Print / Save as PDF Affordance

### 2.1 Current State

The report page header (rendered in the parent `page.tsx`, not inside `WorkflowReportPage`) currently shows these action buttons in the top-right area:
- "Share" (existing, keep)
- "Report" (raw JSON export — REMOVE this label and action)
- "SOP" export
- "JSON" export (currently the raw payload export)
- `handleExport` at line ~263 in the parent page

The problem: "Report" is ambiguous and exports JSON, not a stakeholder PDF. Users reading "Report" expect a formatted document, not a data file.

### 2.2 New Action Button Spec

Replace the current action group with:

```
[Print / Save as PDF]  [Share]  [Export data ↓]
```

**Button 1: "Print / Save as PDF"**
- Label: `Print / Save as PDF`
- Icon: `Printer` from lucide-react (16×16), left of label
- Style: `btn-primary` (matching the existing primary button style in the codebase)
- Action: `window.print()` — wrap in `if (typeof window !== 'undefined')` for SSR safety
- Placement: leftmost in the action group (highest-priority action leads)
- On screen: always visible, always enabled
- In print: `report-print-hidden` (buttons must not appear in the PDF)

**Button 2: "Share"**
- Keep exactly as today. No changes.

**Button 3: "Export data"**
- Label: `Export data`
- Icon: `Download` from lucide-react (16×16)
- Style: `btn-secondary`
- Action: the existing JSON export behavior from `handleExport`
- Tooltip (on hover): "Downloads raw process data as JSON — for engineering and analysis use"
- In print: `report-print-hidden`

**Remove entirely:** The old "Report" button that exported JSON with a misleading label.

**SOP export:** Keep as a separate pill or dropdown item if currently present. It is not in the primary three-button group.

### 2.3 Where These Buttons Live

The buttons live in the parent `page.tsx` header, not inside `WorkflowReportPage`. The `WorkflowReportPage` component has no buttons in its JSX — they are in the parent. This spec targets the parent header. Frontend must locate `handleExport` (approx line 263 in the parent page.tsx) and update the button rendering that calls it.

---

## 3. Evidence-Linked Header Badge

### 3.1 Purpose

The competitive benchmark identifies "Process Intelligence Report header + evidence-linked badge" as the highest-trust brand move available. Every Celonis and UiPath report header declares its data provenance. Ledgerium's differentiator — data from real recorded behavior, nothing modeled — must be visible at the top of the report, not buried in the footer.

### 3.2 Placement

The badge appears in the Verdict section (`ExecutiveVerdictSection`), inline with the "VERDICT" label, to the right of it on the same line:

```
VERDICT                                              [● Evidence-linked]
```

Alternatively: immediately below the workflow title in the `HeroSection` header row. Either works; the Verdict section placement is preferred because it is the first thing a reader sees.

### 3.3 Styling

```html
<span
  class="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 cursor-default"
  title="Every figure in this report traces to recorded events — nothing modeled or inferred."
  aria-label="Evidence-linked: Every figure traces to recorded events — nothing modeled or inferred."
>
  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" aria-hidden="true"></span>
  Evidence-linked
</span>
```

- Background: `bg-emerald-50` / `#f0fdf4`
- Border: `border-emerald-200` / `#a7f3d0`
- Text: `text-emerald-700` / `#047857`, `text-[10px]`, `font-semibold`
- Green dot: `h-1.5 w-1.5 rounded-full bg-emerald-500` — matches the green "Complete" status dot used elsewhere in the dashboard

**Hover/focus:** The `title` attribute provides the tooltip text on hover without any JS interaction cost. A `TooltipProvider` / popover is not required — this is a declarative disclosure, not interactive.

**In print:** The badge prints inline as `[● Evidence-linked]` in emerald-50 background. The `color-adjust: exact` global rule covers this.

**Variant for the print page header:** On the printed document, the badge text is spelled out in full (see Section 1.2 — it becomes part of the footer, not just the badge).

### 3.4 Assumptions

The badge is purely decorative markup — no API call, no state. It renders unconditionally whenever `WorkflowReportPage` is shown. If a future state makes evidence-linkage uncertain (e.g., inferred data), the badge must be hidden for that section, not for the whole report.

---

## 4. Grouped Section Nav

### 4.1 Current State

`RightRailNavigator` renders a flat `<ul>` of up to 23 section IDs. At `hidden xl:block`, it is invisible below 1280px. There is no mobile equivalent. All entries are equal weight with no grouping.

### 4.2 Group Definition

Replace the flat `sectionIds.map()` with a group-based structure. The canonical group definition:

```
SUMMARY
  Verdict              [rpt-verdict]
  Scorecard            [rpt-scorecard]
  Overview             [rpt-hero]
  Start Here           [rpt-lead]       ← conditional (only when step owns ≥25% of time)

HEALTH & SPREAD
  Cycle-Time Spread    [rpt-distribution]
  Consistency          [rpt-consistency]
  Variance & Variants  [rpt-variance]
  Drift                [rpt-drift]

EVIDENCE
  Key Actions          [rpt-insight-cards]
  Bottlenecks          [rpt-bottlenecks]
  Step Duration        [rpt-timestudy]
  Insights             [rpt-insights]
  Step Breakdown       [rpt-steps]
  Friction & Decisions [rpt-structure]
  Rework Patterns      [rpt-rework]
  Process Health       [rpt-scores]
  Phase Timeline       [rpt-phases]
  Run Metrics          [rpt-metrics]

ACTIONS
  Automation           [rpt-automation]
  Composed Agents      [rpt-agents]
  Skill Library        [rpt-skills]
  Integrations & Risks [rpt-integrations]
  Implementation Roadmap [rpt-roadmap]
```

**Rules:**
- A group label is shown only if at least one of its section IDs is present in `visibleSections`. Empty groups render nothing (no label, no separator).
- The `ACTIONS` group renders only if `agentIntelligence` is non-null or `AutomationSection` would show content.
- The current `SECTION_LABELS` map is preserved. Only the grouping wrapper is new.

### 4.3 Right-Rail Group Styling

```
On this page                         ← nav title: text-[9px] uppercase tracking-widest text-[var(--content-tertiary)] mb-3

SUMMARY                              ← group label: text-[8px] uppercase tracking-widest text-[var(--content-tertiary)]
                                       mt-4 mb-1 px-3 font-semibold
  Verdict                            ← entry: pl-5 border-l-2 py-0.5 text-[11px]
  Scorecard                            active: border-brand-500 text-brand-600 font-semibold
  Overview                             inactive: border-transparent text-[var(--content-tertiary)] hover:text-[var(--content-secondary)]

HEALTH & SPREAD
  Cycle-Time Spread
  ...

EVIDENCE
  Key Actions
  ...

ACTIONS
  Automation
  ...
```

The `mt-4` on group labels creates visual separation between groups. The `pl-5 border-l-2` on entries creates the expected left-border active indicator, slightly indented from the group label.

**Change nav title:** "On this page" → "Report sections". `text-[9px] uppercase tracking-widest text-[var(--content-tertiary)] mb-3 font-semibold`.

### 4.4 Mobile TOC (below 1280px)

A sticky pill strip that appears when the user scrolls past the first section heading. It is `xl:hidden` (visible below 1280px, hidden above where the right-rail takes over).

**Anatomy:**

```
[Summary ▾]  [Health & Spread ▾]  [Evidence ▾]  [Actions ▾]
```

- Position: `sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[var(--border-subtle)] px-4 py-2`
- Each pill: `text-[11px] font-medium text-[var(--content-secondary)] rounded-full px-3 py-1 border border-[var(--border-subtle)]`
- Active group (based on scroll-spy active section's group): `bg-brand-50 border-brand-200 text-brand-700`
- Tapping a pill opens a dropdown `<ul>` below the strip, showing the section entries for that group. On section click: `document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })`; dropdown closes.

**Dropdown positioning:** `position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid var(--border-subtle); z-index: 40; padding: 4px 0`. Each entry: `px-4 py-2 text-[12px] text-[var(--content-primary)] hover:bg-[var(--surface-secondary)]`.

**Show/hide trigger:** The mobile TOC is shown when `window.scrollY > 120` (approximately past the Verdict section top). On first render it is hidden. A `useEffect` scroll listener or an `IntersectionObserver` on the `rpt-verdict` element can trigger this. QA must verify: no flash of the TOC on initial render; no layout shift when it appears.

**In print:** `report-print-hidden` — the mobile TOC does not appear in print.

### 4.5 `visibleSections` Array Stays as the Source of Truth

The `visibleSections` memo in `WorkflowReportPage` already correctly gates sections. The grouped nav reads `visibleSections` and maps each ID to its group — it does not re-derive visibility. The group data structure is a static constant:

```typescript
const SECTION_GROUPS: Array<{ label: string; ids: string[] }> = [
  { label: 'Summary',         ids: ['rpt-verdict', 'rpt-scorecard', 'rpt-hero', 'rpt-lead'] },
  { label: 'Health & Spread', ids: ['rpt-distribution', 'rpt-consistency', 'rpt-variance', 'rpt-drift'] },
  { label: 'Evidence',        ids: ['rpt-insight-cards', 'rpt-bottlenecks', 'rpt-timestudy', 'rpt-insights', 'rpt-steps', 'rpt-structure', 'rpt-rework', 'rpt-scores', 'rpt-phases', 'rpt-metrics'] },
  { label: 'Actions',         ids: ['rpt-automation', 'rpt-agents', 'rpt-skills', 'rpt-integrations', 'rpt-roadmap'] },
];
```

Each group renders only the IDs from its `ids` list that are also in `visibleSections`. If the intersection is empty, the group label and its entries are not rendered.

---

## 5. Legacy Overview Cleanup (RunMetrics / HeroSection count-up)

### 5.1 The Problem

`HeroSection` renders six metric cells (Duration / Steps / Phases / Confidence / Systems / Status) with `useCountUp` animations. These animate from 0 on mount. The problem: `useCountUp` for Steps animates from `0` to `N`, which means for a fraction of a second a user who looks immediately sees "STEPS 0". This is the "STEPS 0" artifact identified in the brief.

`RunMetricsSection` (`rpt-metrics`) largely duplicates the hero band: it shows "Steps analyzed", "Avg step", "Active step time", and "Total elapsed" — most of which are visible in the hero band too.

### 5.2 Recommendations

**HeroSection count-up fix (required, P0):** Respect `prefers-reduced-motion`. If `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, bypass `useCountUp` and render the final value immediately. This eliminates the "STEPS 0" artifact for all users who have accessibility motion preferences, which is required by WCAG 2.1 SC 2.3.3. For users without the preference, the count-up is acceptable but should start from a non-zero value (at least 80% of the final value) to reduce the "jumping from 0" perception. The `useCountUp` hook's `delay` options already support this.

Implementation in `HeroSection`:
```typescript
// Before the JSX return:
const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Pass reduceMotion to useCountUp:
const [steps] = useCountUp(workflow.stepCount, reduceMotion ? 0 : 700);
// duration=0 causes useCountUp to resolve immediately to final value
```

**RunMetricsSection (rpt-metrics): slim to 2 cells or remove from print.** On screen, keep the section. The gap/idle time disclosure ("Wall-clock · Xm Ys between steps") is genuinely useful and not shown anywhere else. However, this section is already excluded from print (Section 1.5). On screen, the section heading "Run Metrics" should clarify scope: rename to "Step Timing" to distinguish from the cross-run metrics in the scorecard.

**What to keep in HeroSection:** Keep all six cells. Remove the animated count-up for Duration (it delays comprehension of the most important number on the report). Duration should render as the final formatted value immediately. Steps, Phases, and Confidence can retain the count-up animation (they are secondary numbers and the animation is less disruptive for smaller values).

**The lead sentence in HeroSection** currently renders at `text-ds-sm text-[var(--content-secondary)]` — secondary gray, small. This is the most informative single sentence on the report. Upgrade to `text-ds-sm text-[var(--content-primary)]` (dark text, same size). Small change, significant legibility improvement.

### 5.3 What Is Safe to Remove Entirely

Nothing in `HeroSection` or `RunMetricsSection` should be removed entirely at this stage. The count-up artifact is fixed by the motion preference guard. The legacy overview block is useful content; the only issue is duplication with the scorecard, which is acceptable given their different roles (hero = single-run detail; scorecard = multi-run comparative).

---

## 6. Empty and Single-Run Print States

### 6.1 Single-Run Print State

When `intelligence.metrics.runCount === 1` (or intelligence is null):

- **Scorecard tiles that require multi-run data** (Consistency, Variant Count, Bottleneck) print with their honest "—" values and the `interpretation` text in smaller gray. This is already the on-screen behavior — no print-specific change needed.
- **Cycle-Time Spread section** prints the skeleton copy: "Record this workflow again to see how run durations spread across runs." Do not print a blank card — print the copy so the page does not have a mysterious gap. Add `report-print-hidden` to the `SkeletonCard` CTA button (the "Record again" button). The text remains.
- **Consistency Gauge** prints the skeleton copy: "Record this workflow again to compute a consistency score." Same pattern — print copy, not blank.
- **Drift section** does not print (it is gated on `runCount >= 2` and excluded by the print visibility logic in `visibleSections`).

**The footer on a single-run print:**
`Generated from 1 recorded run · [date] · All data derived from observed behavior — no modeled estimations.`

The phrase "1 recorded run" is honest. Do not fabricate a date range when there is only one run — use the workflow's `createdAt` date only.

### 6.2 Empty Intelligence Print State

When `intelligence` is null (no analysis run):

- Verdict section prints with whatever text `buildReportVerdict` produces for a single-run / null-intelligence state. Current behavior already handles this honestly.
- Scorecard prints with all "—" values.
- Bottleneck section prints: "Intelligence analysis not yet run — run analysis in the browser to generate bottleneck data." Add this as a `<p class="report-print-hidden:false">` element inside `BottleneckContributionSection`'s empty branch.
- Do not print blank white rectangles where data should be. Every section that renders empty on screen should render honest copy in print.

### 6.3 Honest Empty State Copy for Print

For each section that may be empty on a printed document, the printed text must be affirmatively honest — not just blank:

| Section | Printed empty copy |
|---|---|
| Cycle-Time Spread | "Not available — 2 or more runs required to compute spread." |
| Consistency | "Not available — 2 or more runs required to compute consistency score." |
| Bottlenecks | "Not available — intelligence analysis not run." |
| Key Actions | (section is omitted from print if no cards derive) |
| Drift | (section is omitted from print — requires multi-run) |

These copy strings must not appear on screen (they are handled by the existing `SkeletonCard` pattern which has CTAs). They are print-only strings rendered via `class="hidden print:block text-[8pt] text-gray-500 italic"` inside each section's empty branch.

---

## 7. P0–P2 Punch-List Mapped to Components

### P0 — Print and affordance blockers; must ship before the report is shared externally.

| ID | Issue | Affected file(s) | Fix summary |
|---|---|---|---|
| PRT-P0-01 | No `@media print` stylesheet. The report printed from browser shows app nav, right rail, filter pills, CTA buttons — the document is unusable as a stakeholder deliverable. | New `report-print.css` imported in `WorkflowReportPage.tsx` | Implement the full stylesheet from Section 1 of this spec. Target: hide app chrome; force white/black; preserve badge colors with `color-adjust: exact`; set `@page { size: A4; margin }`. |
| PRT-P0-02 | Honesty footer absent from print. The differentiating phrase "All data derived from observed behavior — no modeled estimations" does not appear in any print output. | `WorkflowReportPage.tsx` (new `report-print-footer` element) | Add the print-only fixed footer element as the last child of `WorkflowReportPage`. Text template: Section 1.7. Run-count and date are derived from props. |
| PRT-P0-03 | Print-only page header missing. Printed documents have no document identity — no workflow title, no date, no "Ledgerium AI — Process Intelligence Report" label. | `WorkflowReportPage.tsx` (new `report-print-header` element) | Add the print-only page header element as the first child of `WorkflowReportPage`. Hidden on screen via `hidden print:block`. See Section 1.4. |
| PRT-P0-04 | "Report" export button triggers JSON download with a misleading label. Users seeking a PDF click "Report" and receive a raw JSON file. | Parent `page.tsx` (action button group, `handleExport`) | Replace with three-button group: "Print / Save as PDF" (`window.print()`), "Share" (keep), "Export data" (existing JSON export renamed). See Section 2. |
| PRT-P0-05 | Step breakdown accordion collapses step evidence in print. Evidence strings are not visible in the printed document, defeating the "evidence-linked" claim. | `StepBreakdownSection` in `WorkflowReportPage.tsx` | Add `className="step-detail-panel"` to the collapsible content div. Add `className="step-expand-chevron"` to the `ChevronDown`. Print rule forces `step-detail-panel` visible and hides `step-expand-chevron`. See Section 1.5. |
| PRT-P0-06 | `useCountUp` starts from 0, producing the "STEPS 0" artifact on mount. | `HeroSection` in `WorkflowReportPage.tsx`, `useCountUp` hook | Guard with `prefers-reduced-motion`. Pass `duration=0` to `useCountUp` when motion preference is reduce. See Section 5.2. |
| PRT-P0-07 | Evidence-linked badge absent. No brand differentiator on the report. | `ExecutiveVerdictSection` in `WorkflowReportPage.tsx` | Add the badge element per Section 3. No state, no API call — purely declarative markup with `title` tooltip. |

### P1 — Nav and polish; required before broader sharing.

| ID | Issue | Affected file(s) | Fix summary |
|---|---|---|---|
| PRT-P1-01 | Right-rail nav is flat 23 entries. No grouping. Users cannot orient quickly. | `RightRailNavigator` in `WorkflowReportPage.tsx` | Replace flat `sectionIds.map()` with `SECTION_GROUPS` constant (Section 4.2). Group labels style per Section 4.3. |
| PRT-P1-02 | Right-rail nav disappears below 1280px. Zero navigation on 1024–1279px screens. | `WorkflowReportPage.tsx` (new mobile TOC element) | Add sticky mobile pill-strip TOC (`xl:hidden`). Group pills, dropdown entries on tap. See Section 4.4. |
| PRT-P1-03 | Nav title is "On this page" — generic. | `RightRailNavigator` | Change to "Report sections". `text-[9px] uppercase tracking-widest`. |
| PRT-P1-04 | Lead sentence in `HeroSection` renders in secondary gray. Most useful sentence on the page is styled as secondary content. | `HeroSection` | Change `text-[var(--content-secondary)]` to `text-[var(--content-primary)]` on the lead sentence `<p>`. One class change. |
| PRT-P1-05 | `RunMetricsSection` heading is "Run Metrics" — ambiguous (scorecard tiles are also "metrics"). | `RunMetricsSection` in `WorkflowReportPage.tsx`, `SECTION_LABELS` | Rename to "Step Timing". Update `SECTION_LABELS['rpt-metrics']` from `'Run Metrics'` to `'Step Timing'`. |
| PRT-P1-06 | Page 2+ print has no identity — if pages separate, a reader cannot identify which workflow the page belongs to. | `report-print.css` | The `report-print-footer` right-side column carries `workflow.title`. This already covers page identity. No additional change needed if PRT-P0-02 ships. |
| PRT-P1-07 | Bottleneck contribution bars (`bg-red-500`) may not survive print as colored fills on older printers/browsers. | `BottleneckContributionSection` in `WorkflowReportPage.tsx` | Add `className="bottleneck-bar"` to the fill div. Add `.bottleneck-bar { color-adjust: exact; -webkit-print-color-adjust: exact; }` to the print stylesheet. See Section 1.12. |
| PRT-P1-08 | Distribution spread gradient (`bg-gradient-to-r`) may strip in print on Chrome without explicit `color-adjust`. | `CycleTimeDistributionSection` in `WorkflowReportPage.tsx` | Add `className="report-gradient-track"` to the gradient div. Print rule: `.report-gradient-track { background: linear-gradient(to right, #e5e7eb, #bbf7d0, #fde68a) !important; color-adjust: exact; }`. See Section 1.10. |

### P2 — Improvement; defer if delivery pressure requires.

| ID | Issue | Affected file(s) | Fix summary |
|---|---|---|---|
| PRT-P2-01 | The print stylesheet needs a test matrix. Without verification, print output may differ significantly across Chrome/Edge/Safari. | QA — no code change | Create a QA checklist: print from Chrome (primary), Edge, Safari. Verify: A4 page size, footer on every page, badge visible, bars colored, no orphaned section headings. Document the test run. |
| PRT-P2-02 | The mobile TOC (P1-02) requires a `useEffect` scroll listener. On low-end devices this adds jank. | mobile TOC component | Use `IntersectionObserver` on `#rpt-verdict` instead of a scroll listener. The TOC becomes sticky after `rpt-verdict` leaves the viewport. This is more performant and simpler. |
| PRT-P2-03 | `@page :first` margin override may not be supported in all print contexts. | `report-print.css` | Test `@page :first` specifically in Chrome (supported) and Safari (supported since Safari 15.4). If not supported in the target browser set, remove and use a uniform `@page` margin. |
| PRT-P2-04 | The amber gradient in `LeadInsightSection` (`bg-amber-50/60`) may not survive print on lower-quality printers. | `LeadInsightSection` in `WorkflowReportPage.tsx` | The lead callout does not print as its own section (it is folded into the print-only header). No action needed unless the print header amber callout is requested to be colored — in which case add `color-adjust: exact` to `.report-print-lead`. |
| PRT-P2-05 | Section group dividers in the right-rail nav (new from P1-01) may overlap the active-section `border-l-2` indicator visually when the first entry in a group is active. | `RightRailNavigator` | Test at all group-entry transitions. If visual overlap occurs, add `mt-0.5` to the first entry in each group. This is a 1-line Tailwind fix. |

---

## 8. Section Print Visibility Quick Reference

This table is the canonical reference for QA validation of what appears in print.

| Section ID | Section Name | Prints? | Notes |
|---|---|---|---|
| `rpt-verdict` | Verdict | YES | Page 1, below print header |
| `rpt-scorecard` | Scorecard | YES | Page 1, below Verdict |
| `rpt-hero` | Overview (HeroSection) | NO | Replaced by print-only page header |
| `rpt-lead` | Start Here | NO | Folded into print-only header callout |
| `rpt-scores` | Process Health | NO | Omitted — stakeholder doc focus |
| `rpt-phases` | Phase Timeline | NO | Horizontal scroll does not translate to print |
| `rpt-metrics` | Step Timing | NO | Redundant with scorecard in print |
| `rpt-distribution` | Cycle-Time Spread | YES | Page 2 or 1 tail |
| `rpt-consistency` | Consistency | YES | Page 2 |
| `rpt-variance` | Variance & Variants | YES (partial) | Pareto rows + divergence table; no stat cards |
| `rpt-drift` | Drift | YES | If `runCount >= 2` |
| `rpt-insight-cards` | Key Actions | YES | All cards expanded |
| `rpt-bottlenecks` | Bottlenecks | YES | All rows |
| `rpt-timestudy` | Step Duration | NO | Detail-level, not stakeholder summary |
| `rpt-insights` | Insights Feed | NO | Replaced by Key Actions in print |
| `rpt-steps` | Step Breakdown | YES | All steps expanded |
| `rpt-structure` | Friction & Decisions | YES | |
| `rpt-rework` | Rework Patterns | YES | If present |
| `rpt-automation` | Automation | NO | Keeps PDF under 4 pages |
| `rpt-agents` | Composed Agents | NO | Specialist audience |
| `rpt-skills` | Skill Library | NO | Specialist audience |
| `rpt-integrations` | Integrations & Risks | NO | Specialist audience |
| `rpt-roadmap` | Implementation Roadmap | NO | Specialist audience |
| Print-only header | Page header | YES (print only) | `hidden print:block` |
| Print-only footer | Honesty footer | YES (print only) | `hidden print:block`, fixed position |
| Mobile TOC | Sticky pill strip | NO | `print:hidden` |

---

## 9. Assumptions

1. **Date range derivation.** `workflow.createdAt` and `workflow.updatedAt` are present on all `WorkflowSummary` objects. The footer date range is derived from these two fields. If they are identical (same-day workflow), print only one date. No library is needed — native `Date.toLocaleDateString` with `{ month: 'short', day: 'numeric', year: 'numeric' }`.

2. **Run count for footer.** `intelligence?.metrics?.runCount ?? 1`. This is the same value used throughout the report. A null intelligence payload defaults to 1 (single run, no cross-run analysis run yet).

3. **`@page` size does not force the browser to use A4.** It declares a preference. Browsers honor it in the print dialog default but users can override. This is correct and expected behavior — the specification is a default, not a constraint.

4. **`color-adjust: exact` is required for all colored fills.** Without it, Chrome (by default, with "Background graphics" unchecked) strips colors. The spec adds the property broadly. Users who have "Background graphics" checked will get full color even without the property; the property ensures color survives for users with the default setting.

5. **`window.print()` in Next.js App Router.** Must be wrapped in `typeof window !== 'undefined'` and called inside a `'use client'` component or an event handler. The parent `page.tsx` is already a client component if it handles the share/export actions.

6. **Mobile TOC scroll architecture.** The mobile TOC uses `position: sticky; top: 0`. For this to work, the page scroll must happen on the document body, not an inner overflow container. If the Next.js layout wraps the report in a scrollable div, `sticky` will not work on `body` — it must be on the inner container. Frontend must verify the scroll architecture of the report page's layout before implementing the mobile TOC.

7. **The print header is `hidden print:block`.** Tailwind's `print:block` requires the `print` variant to be enabled in `tailwind.config.ts`. Verify this is enabled. If not, use an inline `style` for the print-only elements or add `.report-print-only { display: none; } @media print { .report-print-only { display: block; } }` to the stylesheet.
