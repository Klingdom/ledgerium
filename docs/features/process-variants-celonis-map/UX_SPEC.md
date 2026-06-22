# UX Spec: Frequency-Weighted Process Map (Celonis-Style)
## Feature: Process Variants — Frequency View

**Status:** Design spec — no product code modified  
**Component:** `WorkflowVariantsMap.tsx` (Process Variants tab)  
**Grounding:** see §0 for cited file:line anchors

---

## §0 Source Anchors

| Artifact | Lines | Relevance |
|---|---|---|
| `WorkflowVariantsMap.tsx` | 234–258 | Segmented toggle: Map / DNA / List |
| `WorkflowVariantsMap.tsx` | 868–968 | `VariantFlowCanvasWrapper` legend bar pattern to reuse |
| `WorkflowVariantsMap.tsx` | 278–320 | PathCard rail + `selectedPathId` / `comparePathId` state |
| `WorkflowVariantsMap.tsx` | 949–953 | Existing honesty note copy pattern ("observed splits only") |
| `constants.ts` | 23–51 | `CATEGORY_STYLES`, `EDGE_STYLES`, `NODE_TYPE_STYLES` color tokens |
| `edges/WorkflowEdge.tsx` | 43–83 | `getSmoothStepPath`, `BaseEdge`, `strokeWidth`, `transition` |
| `edges/HandoffEdge.tsx` | 22–44 | `borderRadius: 16` smooth curve, `strokeWidth` selection state |

---

## §1 Where It Lives — Toggle Recommendation

**Decision: add a fourth button "Frequency" to the existing Map | DNA | List segmented control** (lines 236–258, `WorkflowVariantsMap.tsx`).

Do not replace or upgrade the existing Map view. The current "Map" (decision diamonds + branch lanes via `VariantFlowCanvasWrapper`) answers the question "where does the process split?" The Frequency view answers a different question: "how often does each path run?" These are distinct cognitive tasks. Replacing the existing Map view forces expert users to lose a surface they already navigate; adding a fourth button preserves both.

The resulting control reads: **Map | Frequency | DNA | List**

Placement rationale: "Frequency" is positioned second, immediately after "Map", because it shares the spatial/graph metaphor and users who open the tab wanting a process picture will scan left-to-right and encounter Frequency before the more abstract DNA strip.

**Toggle button spec** — copy the existing pill button pattern exactly:

```
data-testid="variants-view-frequency"
active class: bg-violet-600 text-white
inactive class: text-[var(--content-secondary)] hover:bg-[var(--surface-elevated)]
px-2.5 py-1 text-[10px] font-medium
label: "Frequency"
```

Default view on first open: unchanged (continues to open "Map" as today). Frequency view is opt-in.

---

## §2 Visual Encoding of Frequency

The graph is a directly-follows graph (DFG): one node per distinct step title, one directed edge per observed A→B transition. Every edge carries a `transitionCount` (how many runs crossed it). Every node carries a `visitCount` (how many runs visited it).

### 2.1 Edge Stroke Width

Linear scale: `strokeWidth = EDGE_MIN_PX + (transitionCount / maxTransitionCount) * (EDGE_MAX_PX - EDGE_MIN_PX)`

Constants:
- `EDGE_MIN_PX = 1.5` — a hairline that reads as "rare but real"
- `EDGE_MAX_PX = 10` — the dominant happy path reads as a thick spine
- `maxTransitionCount` = maximum `transitionCount` across all edges currently visible (recomputed after slider filters edges out)

Use `Math.ceil` to the nearest 0.5 px so strokes snap to readable increments. Never render below 1 px — at 1.5 px minimum a rare path is still clickable.

Reuse the `transition: 'stroke 0.15s ease, stroke-width 0.15s ease'` CSS from `WorkflowEdge.tsx` line 81.

### 2.2 Edge Color / Opacity Ramp

Use a single hue ramp anchored to `#6366f1` (Ledgerium violet, matching the active toggle color).

Opacity scale: `opacity = 0.20 + (transitionCount / maxTransitionCount) * 0.80`

This gives:
- Rarest visible edges: `opacity 0.20`, `stroke #6366f1` — very faint violet thread
- Dominant edge: `opacity 1.00`, `stroke #6366f1` — full violet

Do not change hue by frequency. Changing hue implies a qualitative difference (good/bad); opacity change communicates quantity. This matches how Celonis, Disco, and PM4Py render DFGs.

**Happy path emphasis** (the single highest-frequency path from start to end):
- Stroke: `#4f46e5` (one shade darker than `#6366f1`, `indigo-700`)
- StrokeWidth: always `EDGE_MAX_PX` regardless of formula (it is by definition `maxTransitionCount`)
- No additional decoration — thickness and saturation are sufficient signal

### 2.3 Node Sizing and Badging

Nodes remain the same rectangular shape as `NODE_TYPE_STYLES.task` (do not resize nodes by frequency — layout stability matters more than frequency encoding at the node level; the edge already carries the frequency signal).

Each node receives a **visit-count badge**: a small pill in the top-right corner of the node box.

Badge spec:
```
position: absolute, top: -6px, right: -6px
height: 16px, min-width: 20px
padding: 0 4px
border-radius: 8px
background: #f5f3ff (violet-50)
border: 1px solid #ddd6fe (violet-200)
font-size: 9px, font-weight: 600
color: #4c1d95 (violet-900)
content: visitCount formatted as integer (e.g. "47")
```

For the start and end nodes (`NODE_TYPE_STYLES.start` / `.end`), omit the badge — total run count is shown in the coverage feedback string (§3) rather than per-node.

---

## §3 The Coverage Slider

### 3.1 Single Slider (Recommended)

Use **one slider** controlling "path coverage" — the minimum percentage of total runs that a path must contribute to remain visible. This is more legible than Celonis's dual activity/connection sliders for a non-expert audience: one handle, one concept, one label.

- **Range:** 0% – 100% of total run coverage
- **Default position:** Show paths that together cover **≥ 80% of runs** (i.e., slider at 80%). At this default the user sees the happy path plus the top 2–4 variants in most real datasets, without being overwhelmed by one-off outlier paths.
- The slider filters complete paths (source→sink paths in the DFG), not individual edges. An edge stays visible as long as at least one surviving path uses it.

### 3.2 Slider Spec

Component: HTML `<input type="range">` with explicit ARIA attributes.

```
min="0" max="100" step="5"
aria-label="Path coverage — percentage of runs to include"
aria-valuemin="0" aria-valuemax="100" aria-valuenow={sliderValue}
aria-valuetext="{sliderValue}% of runs · {pathCount} paths"
```

Track styling (Tailwind + inline):
```
w-full h-1.5 rounded-full
track: bg-[var(--surface-elevated)] with violet filled portion
thumb: w-4 h-4 rounded-full bg-violet-600 border-2 border-white shadow-sm
focus-visible: outline 2px solid #6366f1 outline-offset 2px
```

Debounce: 80 ms — fast enough to feel live, slow enough to avoid re-laying the graph on every pixel drag.

Keyboard: ArrowLeft/ArrowRight adjust by `step="5"`. Home goes to 5% (minimum meaningful). End goes to 100%.

### 3.3 Live Feedback String

Immediately below the slider, render one line of live feedback. This is the primary legibility affordance.

Format: `"Showing {pct}% of runs across {n} path{s}"`

Examples:
- `"Showing 87% of runs across 4 paths"`
- `"Showing 100% of runs across 11 paths"`
- `"Showing 41% of runs — 1 path (happy path only)"`

Typography: `text-[10px] text-[var(--content-tertiary)] mt-1`

When the slider is at 100%: show `"Showing all runs ({totalRuns} total) · {n} paths"`.

The slider lives in a control bar above the canvas, inside the same `bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)]` container as the toggle row (lines 234–259). Render it as a second row within that container, separated from the toggle by a thin rule:

```
px-4 py-2 flex items-center gap-3
[Label: "Coverage"] [slider, flex-1] [feedback string, flex-shrink-0]
```

Label: `text-[10px] font-medium text-[var(--content-secondary)]` · text: "Coverage"

---

## §4 Variant Highlight on Map

When the user selects a path in the PathCard rail (left panel, `selectedPathId` state, line 301 `WorkflowVariantsMap.tsx`):

1. **Dim non-path edges:** all edges not used by the selected path render at `opacity 0.08` and `stroke #9ca3af` (slate-400). This creates a ghost network — the structure is still legible but recedes.
2. **Highlight path edges:** edges on the selected path render at full spec (§2.2) plus `strokeWidth` boosted by +2px (so a `6px` edge becomes `8px`). Color shifts to the variant's accent: use the `CATEGORY_STYLES` color for the modal step category of that variant, defaulting to `#6366f1` violet.
3. **Node highlight:** nodes on the selected path get `border: 2px solid {variantAccent}` replacing their default `border-[var(--border-subtle)]`.
4. **Non-path nodes:** `opacity 0.4`.

Transition: `opacity 0.2s ease, stroke 0.2s ease, stroke-width 0.15s ease` (extend the transition already in `WorkflowEdge.tsx` line 81).

**Diverge-then-reconverge pattern:** when a selected variant branches off the happy path and later merges back, the diverging sub-path edges highlight normally per rule 2 above. The reconvergence point node receives a small amber dot badge (`#d97706`, 6px circle) at its top-left corner to signal "this is where the variant rejoins". No additional decoration — the thick highlighted edge arriving at the node is the primary signal; the dot is secondary confirmation.

**Deselect:** clicking the canvas background or clicking the active PathCard again resets to the unselected state (all edges at full frequency encoding).

---

## §5 Legend and Honesty Note

The legend follows the same always-visible bar pattern as `VariantFlowCanvasWrapper` (lines 897–953). It renders between the control bar (toggle + slider) and the canvas, as a single compact row.

### 5.1 Legend Items

**Thickness legend** (three inline SVG swatches):

```
[1.5px line — "Rare"]   [5px line — "Common"]   [10px line — "Dominant"]
```
Each swatch: `<svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#6366f1" strokeWidth={1.5|5|10} /></svg>`
Label font: `text-[9px] text-[var(--content-secondary)]`

**Node badge legend:**
```
[pill badge "47"] = visit count
```

**Separator, then honesty note** (copy adapted from existing pattern at line 950):

`"Frequency reflects observed transitions only — no inferred conditions or decision logic"`

Font: `text-[9px] text-[var(--content-tertiary)] italic ml-auto`

Full legend bar container:
```
padding: 5px 16px
background: rgba(255,255,255,0.97)
backdropFilter: blur(8px)
borderBottom: 1px solid #e5e7eb
display: flex; alignItems: center; gap: 16px; flexShrink: 0; flexWrap: wrap
```

---

## §6 States

All states reuse existing `VariantsStateView` patterns from `WorkflowVariantsMap.tsx` lines 220–228. No new state components are needed.

| Condition | Behavior |
|---|---|
| `status === 'loading' \| 'idle'` | Render `<VariantsStateView kind="loading" />` — unchanged |
| `status === 'error'` | Render `<VariantsStateView kind="error" onRetry={onRetry} />` — unchanged |
| `status === 'unprocessed'` | Render `<VariantsStateView kind="unprocessed" onRetry={onRetry} />` — unchanged |
| `!variantData.hasVariantData` (single run or zero variation) | Render `<SinglePathView>` — unchanged. The Frequency view does not invent a DFG from a single recording. Show the same single-path view and suppress the Frequency toggle button (render it disabled with `opacity-40 cursor-not-allowed`) so the user understands the view requires multiple runs. Tooltip on hover: "Record more runs to enable the Frequency view" |
| All paths filtered out by slider (slider dragged to a position excluding every path) | Show the canvas with no edges and a centered inline notice: `"No paths match this coverage filter — drag the slider right to include more runs"` in `text-[11px] text-[var(--content-tertiary)]`. The notice sits at canvas center; the node skeleton remains visible so the user has spatial context. |
| Slider at 100% with many paths (>12 paths) | Render normally. Performance note for engineering: if the DFG exceeds 50 edges, enable React Flow's `nodesDraggable={false}` and `elementsSelectable={false}` on non-selected elements to keep 60fps. |

---

## §7 Accessibility

**Color is not the sole channel.** Frequency is encoded by both stroke-width (§2.1) AND opacity (§2.2) simultaneously. A monochrome-vision user can distinguish dominant from rare edges by thickness alone. The happy path's `strokeWidth: 10` is approximately 6.5× thicker than a rare edge at `1.5px` — legible even in print.

**Slider ARIA** (full spec in §3.2). Additionally: the live feedback string (§3.3) must be wrapped in `role="status" aria-live="polite"` so screen readers announce the current coverage value after the debounce settles.

**Edge labels as alt-channel:** the engineer may optionally render a `transitionCount` label chip on each edge using the `EdgeLabelRenderer` pattern from `WorkflowEdge.tsx` lines 87–127. This is off by default — the canvas becomes cluttered above 8 edges. A toggle "Show counts" (checkbox in the legend bar) enables them. When enabled, label format: `"47×"` or `"47%"` (user-selectable via a secondary toggle in the legend bar). Chips use the existing label chip spec from `WorkflowEdge.tsx` lines 94–127 with `borderRadius: 3`.

**Focus management:** clicking a PathCard to trigger variant highlight (§4) must not move keyboard focus away from the card. The canvas responds to the state change visually; the user's focus remains in the rail.

**Canvas keyboard navigation:** React Flow already handles Tab-to-node and Enter-to-select. No additional changes needed for the DFG nodes.

**Touch targets:** the slider thumb must be at least 44×44px touch target even if visually smaller (use `padding` expansion via pseudo-element or the existing Tailwind `h-4 w-4` thumb with a transparent `::before` hit area).

---

## §8 Data Contract (for engineering handoff)

The Frequency view requires the following computed values per edge and node in the DFG. The UX spec does not prescribe the data layer, but the frontend engineer needs to know what to request.

**Per edge:**
- `transitionCount: number` — raw count of runs that followed this A→B transition
- `transitionPct: number` — `transitionCount / totalRuns * 100`, pre-computed

**Per node:**
- `visitCount: number` — count of runs that visited this step

**Per path (for the rail and slider):**
- existing `runCount` on `ViewVariantPath` is sufficient

The slider computes visibility by sorting paths descending by `runCount`, then taking the prefix whose cumulative `runCount / totalRuns >= sliderValue / 100`. Edges are visible if any surviving path uses them.

---

*End of spec. ~1,100 words of design content. All px values, opacity values, color tokens, component names, ARIA attributes, and copy strings are production-ready as written.*
