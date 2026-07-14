# Time-Study Intelligence — Cross-Workflow Relationship & Compare UX

**Mode:** Mode 3-adjacent design review (NON-counting; analysis artifact only, zero code changes)
**Author:** ux-designer
**Date:** 2026-07-12
**Trigger:** CEO directive — "a dramatically improved time-study view that lets a user VISUALLY compare any workflows and SEE RELATIONSHIPS across all workflows (cluster/compare/contrast)."

---

## 0. Grounding: what data actually exists today

Everything below is designed against real, already-computed fields — nothing here requires
inventing a new statistical concept, only new *views* onto existing engine output (and, in two
places, a small new deterministic pure module flagged explicitly as future engineering scope,
not something this artifact builds).

| Field | Source | What it gives the UI |
|---|---|---|
| `PathSignature.stepCategories[]` / `.signature` | `types.ts` | The privacy-safe category sequence of a run — the raw material for any diff/similarity/alignment computation |
| `ProcessVariant.{frequency, isStandardPath, similarityToStandard, evidenceRunIds}` | `types.ts` / `VariantSet` | Ready-made "how common is this path, how far from standard" — no new math needed for intra-family variant framing |
| `VarianceReport.{sequenceStability, highVarianceSteps, durationVariance}` | `types.ts` | Stability + step-level variance, already scored |
| `BottleneckReport.bottlenecks[].{durationRatio, isHighDuration, isHighVariance}` | `types.ts` | Ranked slow/unstable steps, already scored |
| `TimestudyResult.stepPositionTimestudies[]` (mean/median/p90/stdDev per ordinal) | `timestudyAnalyzer.ts` | Per-step duration distribution — the raw material for box-range bars |
| `evidenceRunIds` on *every* sub-report | all of the above | The traceability contract — every visual claim must resolve back to specific runs |
| `dashboard-columns/registry.ts` (~38 `ColumnKey`s, ~10 `available` today) | web-app | Confirms which of the "32 Tier A metrics" are actually renderable now vs. `pending-path-c-r1` |
| `computeWorkflowComparison` / `MetricDelta` / `ComparisonConfidence` | `workflow-comparison.ts` | The existing baseline/after delta + confidence-gating pattern (`low` at n&lt;2 runs) — reused, not replaced |

**Architectural stance carried through every design below:** Ledgerium is determinism-first.
Force-directed graph layouts (physics simulations that "settle") are explicitly **rejected** as a
primary rendering technique because their resting position is not a pure function of the input —
re-render the same data, get a visually different layout. Every relationship/cluster view below
uses a layout that is a deterministic pure function of the metrics (a 2-axis scatter, or a
similarity matrix fed through deterministic hierarchical clustering) so the picture a user sees
today is the picture they'll see tomorrow given the same data, and is testable like any other
Ledgerium output.

---

## 1. Design — Process Relationship Map (two toggleable lenses)

**Route:** `/compare/relationships` (see §5 for why nested under `/compare`, not a new nav item)

### 1A. Positioning Map (buildable now, zero new algorithms) — default lens

**Layout:** Full-width Recharts `ScatterChart` (same import family already used by
`RecordedTrendChart` / `TimeSeriesChart`), one bubble per workflow.

- **X axis:** median cycle time (`cycle_time_median_ms` / `TimestudyResult.totalDuration.medianMs`)
- **Y axis:** sequence stability (`VarianceReport.sequenceStability`, 0–1, "how consistently the same path is followed")
- **Bubble radius:** run count (`ProcessMetrics.runCount`) — a workflow with 2 runs is visibly smaller/lighter than one with 200; this prevents a sparse process from looking as trustworthy as a well-observed one
- **Bubble color:** `opportunityTag` using the existing `OPPORTUNITY_COLOR` token map from `band-colors.ts` (automate=blue, standardize=amber, optimize=orange, monitor=red, healthy=green) — reusing an already-shipped semantic palette instead of inventing a new one
- **Quadrant labels (static background bands, not data):** top-right "Stable & Fast," bottom-right "Fast but chaotic," top-left "Stable but slow — standardize," bottom-left "Slow & chaotic — automate first"

**Interaction model:**
- Hover → tooltip: title, n runs, stability %, cycle time, and — if runCount &lt; 5 — an inline
  "based on only N runs" caveat (same honesty register as `/compare`'s confidence badge)
- Click a bubble → right-side drawer: workflow snapshot + two buttons, **"Add to compare tray"**
  and **"Show similar workflows"** (jumps to §1B pre-focused on this node)
- Drag-select (marquee) across bubbles → populates the compare tray with everything inside the
  box, then a persistent bottom bar offers **"Compare N selected →"** (Design 2) or
  **"Rank steps across N selected →"** (Design 4)
- Zero new clustering math: two metrics that already exist, plotted honestly. This is the
  "everyday" lens — the one a user opens first.

**Insight made obvious:** at a glance, which corner of the portfolio a workflow lives in —
fast-and-stable "keep as-is" work vs. slow-and-chaotic "biggest opportunity" work — without
reading a single number.

### 1B. Family Similarity Dendrogram (deeper lens; needs one new pure module)

**Layout:** horizontal dendrogram, leaves = workflows (right edge), branches merge leftward;
merge height = `1 − similarity`. Rendered as plain SVG lines computed from a layout function —
no Recharts primitive fits a tree, and none is needed; the layout math (which x/y each leaf and
merge-node gets) is itself a small, pure, fully-unit-testable function, matching the
`sopBuilder.ts` / `sopValidator.ts` style already in the repo.

**New deterministic primitive required (flagged for `system-architect` at build time, not built
here):** a cross-workflow similarity function — Jaccard or edit-distance over
`PathSignature.stepCategories[]` pairs, generalizing the existing intra-family
`similarityToStandard` computation to *any two* workflows' signatures — plus a standard
average-linkage agglomerative clustering routine over the resulting matrix. Both are pure,
side-effect-free, and trivially golden-fixture-testable, consistent with `intelligence-engine`'s
existing style. This is explicitly **not** a force simulation — same input, same tree, always.

**Interaction model:**
- A horizontal **similarity threshold slider** (e.g., 0–100%) sweeps a vertical cut-line across
  the dendrogram; a live badge reads "**4 families** at 65% similarity." Dragging the slider is
  the entire interaction — no button, immediate visual feedback (families merge/split live).
- Click a bracket (a cluster) → selects every member workflow into the compare tray in one action
  — this is literally "browse families of related workflows" made concrete: sweep the slider
  until a cluster of interest appears, click it, you now have an N-way selection.
- Each leaf still carries the honesty treatment from 1A (dashed/lighter for n&lt;5-run workflows).

**Insight made obvious:** structural families the eye can't reconstruct from a flat list — "these
6 workflows are basically the same process happening in 3 departments," surfaced by shared step
sequence, not by name-matching.

---

## 2. Design — N-Way Process Diff (aligned swimlanes)

**Route:** `/compare?ids=a,b,c,...` (2–6 workflows recommended; see §6 for the &gt;6 fallback)

**Layout:** one horizontal swimlane per selected workflow (or per variant, when invoked from
Design 3). Each lane is a strip of step blocks placed under a shared **spine** of aligned
columns — not raw ordinal position, but *aligned* position, computed the way a text/code diff
aligns two sequences.

**New deterministic primitive required (flagged for build, not built here):** a pure
sequence-alignment function over `stepCategories[]` (classic LCS-based alignment — the same
family of algorithm as `git diff`), producing a merged spine plus, per lane, a classification for
every block:

- **Matched (solid green fill):** same category, same relative position across compared lanes
- **Reordered (amber outline):** present in this lane, but at a different aligned position than in the majority/spine
- **Removed (red dashed ghost slot):** present in the spine / other lanes, absent here
- **Added (blue dashed block):** present here, absent from the spine / other lanes

Block **width is proportional to `meanDurationMs`** for that step position/category
(`StepPositionTimestudy.meanDurationMs`) — so the diff is simultaneously a *structural* diff and
a *time* diff: a matched-but-wider block instantly reads as "same step, much slower here."

**Interaction model:**
- Two view-mode toggle: **"Aligned steps"** (columns = diff spine, described above) vs.
  **"Same-scale timeline"** (columns = elapsed wall-clock time, a literal proportional Gantt row
  per workflow) — toggling answers two different questions ("where does the process differ
  structurally" vs. "where does the absolute time go")
- Hover any block → tooltip with mean/median/p90 duration, run count, and a **"View evidence →"**
  link built from that block's `evidenceRunIds`, opening the underlying run(s) — every diff claim
  traces to source events, per the North Star
- Top summary strip (extends the existing `/compare` deltas-table pattern from
  `workflow-comparison.ts`, but per-step instead of whole-process): plain-language one-liners like
  *"Workflow B has 2 extra steps and is 38% slower at step 4 (fill_and_submit)."*
- A persistent **compare tray** (populated from Design 1's marquee/cluster click, or from
  checkboxes added to `WorkflowRow` in the library) carries the selection across routes —
  same interaction shape as a shopping-cart, so a user can wander from the library to the
  relationship map to the diff without re-selecting anything

**Insight made obvious:** exactly where two-or-more processes structurally diverge and which of
those divergences actually costs time — a "process diff" that reads like a code review, not a
spreadsheet.

---

## 3. Design — Variant Divergence Overlay (single-family "metro map")

**Route:** `/analytics/process/[id]/variants` (drill-down from the existing Process Families /
Standardization cards in `analytics/page.tsx` §3 and §5 — see §5)

**Layout:** a subway-map metaphor for one process family's own variants
(`VariantSet.variants[]`). The standard path (`isStandardPath: true`) renders as a bold horizontal
spine, left to right by aligned step position. Every other variant peels off as a thinner branch
line at the exact ordinal where its `stepCategories` first diverges from the spine, and rejoins
the spine if/when the sequences reconverge.

- **Line thickness** ∝ `ProcessVariant.frequency` (how common this path is)
- **Line/segment color** ∝ bottleneck/variance heat — a segment glows amber/red if that step
  position appears in `BottleneckStep`/`HighVarianceStep` for that variant, reusing the same
  "Standardization Opportunities" amber-card visual language already in `analytics/page.tsx`
  §5, just applied at the step level instead of the whole-process level
- **Branch-point marker:** a small dot exactly where divergence begins — instantly shows *when*
  in the process paths start to differ, not just *that* they differ

**Interaction model:**
- Click a branch → filters the run list to that variant's `evidenceRunIds` and opens a compact
  2-row instance of the Design 2 diff component (spine vs. this one variant) — reusing the same
  diff-block visual grammar at minimal scope
- This is the natural replacement/enhancement for the current bare variant list on
  `analytics/process/[id]/page.tsx` — same route family, richer picture

**Insight made obvious:** *where* in a single process people start doing things differently, and
whether that divergence is rare-and-harmless or frequent-and-costly (line thickness × glow, read
together).

---

## 4. Design — Time-Study Bottleneck Ranking (cluster-wide)

**Route:** `/compare/timestudy?ids=a,b,c,...` (scoped to whatever set is in the compare tray, or
to "all workflows" / the currently-filtered library set when reached from
`PortfolioTimestudyBand`)

**Layout, three stacked panels:**

1. **Ranked bottleneck bars** — Recharts `BarChart` with `layout="vertical"` (horizontal bars),
   one bar per step category, sorted by `durationRatio` computed **across the whole selected
   set** (extends `BottleneckReport` from single-process to the N-workflow comparison scope).
   Each bar carries a "**2.3× slower than avg step**" ratio badge, a variance-flag icon when
   `isHighVariance`, and is itself **segmented by contributing workflow** (small-multiples inside
   the bar) so "step X is a bottleneck" resolves further to "...mostly because of Workflow B."
2. **Variant time-delta table** — for every variant surfaced in Design 3 across the selected
   workflows, a sortable table: time added/removed vs. its standard path, in both ms and %,
   with an evidence link per row — "worst offenders" sorted to the top.
3. **Step duration range bars** — for any step selected from panel 1, a compact horizontal range
   built directly from `StepPositionTimestudy` (min → p90 as the bar, median as a tick, mean as a
   diamond marker) — a lightweight box-plot rendered with plain SVG/divs (no new charting
   dependency), giving distribution shape without a heavyweight box-plot library.

**Interaction model:** click a bar in panel 1 → panel 3 populates for that step; click a row in
panel 2 → jumps into Design 3's overlay pre-focused on that variant. Everything here is a drill
path, never a dead end.

**Insight made obvious:** *exactly* where time is going across everything being compared, ranked,
attributable to specific workflows and specific runs — the single most decision-useful screen for
someone trying to decide what to fix first.

---

## 5. Entry points + navigation

The goal is to make "compare these" / "show me everything like this" a 1–2 click reach from
wherever the user already is, without adding a new top-level nav item (favor fewer steps over more
flexibility; the existing `/compare` route already owns the "look at 2+ workflows together"
mental model).

- **Workflow Library (`WorkflowList` / `WorkflowRow`):** add a row-level checkbox (reusing the
  existing `KebabMenu` affordance style) → a floating **compare tray** bottom bar appears once
  ≥1 row is checked: *"2 selected · Compare · Show relationships · Clear"*. This is the primary
  entry point — most users start from the library, not from an analytics page.
- **`WorkflowRow` kebab menu:** add **"Show similar workflows"** → jumps to `/compare/relationships?focus=<id>`, landing on Design 1B pre-zoomed to that workflow's neighborhood.
- **`PortfolioTimestudyBand`:** the existing "Avg Cycle Time" hero tile becomes a link into
  Design 4, scoped to whatever filter is currently active — reusing the band's existing
  "across N of M workflows" scope-honesty line verbatim.
- **`/analytics` Process Families (§3) and Standardization Opportunities (§5) cards:** add a
  secondary **"Compare variants →"** action opening Design 3 directly (these cards already carry
  `def.id` and `variantCount`), alongside the existing detail-page link.
- **`/compare` top-tab switcher (new):** `Before / After` (existing 2-workflow ROI view,
  unchanged) · `Relationships` (Design 1) · `Diff` (Design 2) · `Time Study` (Design 4) — one
  route family, four lenses, instead of four disconnected pages.

---

## 6. Empty / low-data / honesty states

Every state below follows the pattern already established by `/compare`'s confidence badge and
`PortfolioTimestudyBand`'s "no fabricated numbers" tiles — never hide a data point, never imply
confidence the sample doesn't support.

- **&lt;2 workflows total:** identical full-page empty state to the existing `/compare` card
  ("Record at least two workflows to compare") — reused verbatim across all four routes.
- **n=1 run per workflow:** bubble/lane/bar rendered with reduced opacity + dashed outline
  ("provisional" treatment) instead of full-color — a sparse map must not *look* as confident as
  a well-observed one. Tooltip carries the same "record 2+ runs for a defensible comparison" copy
  already used in `/compare`.
- **Isolated workflow (no neighbor above a minimum similarity floor):** shown at the map's
  periphery, greyed, labeled "No similar workflows yet" — never silently dropped
  (traceability over convenience).
- **Single-variant family (`standardPath.frequency === 1.0`):** Design 3 shows just the spine with
  "This process runs the same way every time — no variants observed," not an empty canvas.
- **Plan-gated dimensions** (health-based coloring, etc.): the legend/axis entry stays visible with
  "Upgrade to see health-based coloring" rather than disappearing — mirrors the existing
  `healthGated` / `isGated` treatment already shipped in `WorkflowsApiResponse` and
  `PortfolioTimestudyBand`.
- **Selection too large for a readable diff (&gt;6–8 workflows in Design 2):** auto-suggest a
  redirect rather than rendering unreadable noise — *"12 selected — that's hard to read
  side-by-side. Showing the relationship map instead; pick 2–6 for a detailed diff."*
- **Zero shared steps across the selection:** if pairwise similarity ≈ 0, Design 2's spine
  degenerates to all-red/all-blue noise — detect this and show *"These don't share any comparable
  steps — they may not be the same kind of process"* instead of a diff.
- **Evidence linkage is non-negotiable everywhere:** every bubble, diff block, ranked bar, and
  range bar carries an `evidenceRunIds`-backed link back to the source runs. No summary number
  is ever presented without a path back to the events that produced it.

---

## 7. Summary of what's buildable now vs. needs new engineering

| Design | Buildable today (existing fields/components) | Needs a new pure module first |
|---|---|---|
| 1A Positioning Map | Yes — `Recharts ScatterChart`, existing metrics, existing color tokens | — |
| 1B Similarity Dendrogram | Layout renderer only | Cross-workflow similarity + agglomerative clustering (pure, testable) |
| 2 N-Way Diff | Time-per-step bars, evidence links, tray/selection UI | Sequence-alignment/diff function over `stepCategories[]` |
| 3 Variant Overlay | Fully — `VariantSet`, `BottleneckReport`, `VarianceReport` already have everything needed | — |
| 4 Time-Study Ranking | Mostly — extend `BottleneckReport` scope from one process to a selected set (small aggregation, not new algorithm) | — |

This split is intentional: Designs 1A, 3, and 4 could reach a first shippable iteration with zero
new deterministic primitives, while 1B and 2 each need exactly one small, pure, unit-testable
module — both natural `system-architect`-adjacent candidates per the CLAUDE.md D-4
specialist-invocation gate when build time comes.
