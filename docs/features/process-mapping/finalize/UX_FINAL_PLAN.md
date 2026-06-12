# UX Final Plan — Ledgerium Process-Mapping Environment

**Date:** 2026-06-12
**Author:** UX Designer (read-only on product code)
**Status:** Define-phase. No product code is modified by this document.

**Upstream artifacts read:**
- `docs/features/process-mapping/visio/VISIO_VISUAL_SPEC.md`
- `docs/features/process-mapping/visio/VISIO_LAYOUT_ROUTING_PLAN.md`
- `docs/features/process-mapping/visio/VISIO_ARCHITECTURE_REVIEW.md`
- `apps/web-app/src/components/workflow-view/WorkflowModeSwitcher.tsx`
- `apps/web-app/src/components/workflow-view/WorkflowPageShell.tsx`
- `apps/web-app/src/components/workflow-view/constants.ts`
- Screenshots: `workflow-process-map.png`, `workflow-variants-map.png`

**Constraint:** Read-only. No product code is created or modified by this document.

---

## 0. What this document finishes

The prior Visio pass (`VISIO_VISUAL_SPEC.md`, `VISIO_LAYOUT_ROUTING_PLAN.md`, `VISIO_ARCHITECTURE_REVIEW.md`) specified shapes, connectors, swimlane structure, ELK layout, and correctness/honesty rules. Those are adopted wholesale and are not re-argued here.

This document adds the layer those specs did not cover:

1. The production shell around the canvas — 6-mode switcher, chrome layout, all states
2. Canonical visual design tokens (consolidating the three prior specs)
3. Two new view designs: BPMN-class structured diagram + duration/time-based view
4. Export and print experience (key Visio parity item)
5. Honesty UI: how provenance and multi-run vs single-run is shown
6. Future editing/templates interaction concept
7. P0–P2 UX punch-list mapped to components

---

## 1. The Production Environment — Shell Architecture

### 1.1 Six-Mode Layout (from the current 4)

The current shell has four modes. The architecture review and new view designs add two more. Final 6-mode set:

| Mode key | Label | Icon (Lucide) | Short description |
|---|---|---|---|
| `flow` | Flow Intelligence | `Workflow` | Vertical/layered process flow. Single-trace or aggregate. |
| `swimlane` | System Swimlane | `Columns` | Cross-functional bands, one per system. Visio cross-functional flowchart. |
| `variants` | Process Variants | `GitBranch` | Multi-run divergence map. Backbone + branch lanes. |
| `systems` | System Interaction | `Monitor` | System-to-system topology. Node-link network. |
| `bpmn` | Structured Map | `Layout` | New: structured business-process diagram (BPMN-class). See §3. |
| `timeline` | Duration Map | `Timer` | New: duration/time-based view (Gantt/Value-Stream-class). See §3. |

**`WorkflowModeSwitcher.tsx` change required:** add `bpmn` and `timeline` to the `MODES` array and `MODE_ICONS` map. Current switcher markup renders a pill group — the same component accommodates 6 modes. The pill group should scroll horizontally on narrow viewports below 900px, not wrap.

**Horizontal scroll behavior on narrow canvas:**
- Below 900px wide: the switcher row does `overflow-x: auto; white-space: nowrap`
- No mode is hidden — all six are reachable
- Right fade gradient `::after` pseudo-element on the container signals more modes exist (8px gradient from transparent to background color)

### 1.2 Overall Shell Layout — Component Hierarchy

```
WorkflowPageShell (flex column, full height)
├── WorkflowHeader                    ← metadata band, 48px fixed
├── ModeToolbarRow                    ← mode switcher + toolbar, 44px fixed
├── DiagramTitleBar [MapTitleBar]     ← per VISIO_VISUAL_SPEC §4.4, 46px fixed
├── CanvasArea (flex row, flex-1)
│   ├── CanvasRegion (flex-1)
│   │   ├── [ActiveCanvas]            ← React Flow canvas for active mode
│   │   ├── ProvenanceBanner          ← overlays canvas top when isMultiRun=false
│   │   ├── WorkflowLegend            ← bottom-left overlay, always visible
│   │   ├── MinimapOverlay            ← bottom-right, toggled by toolbar
│   │   ├── ZoomControls              ← bottom-right (above minimap), always visible
│   │   ├── ExportButton              ← top-right corner overlay, always visible
│   │   └── SwimlaneHeaderOverlay     ← left overlay, swimlane mode only
│   └── InspectorPanel                ← slides in from right, 360px
└── InsightsStrip                     ← bottom, 40px, toggled by toolbar
```

**Heights and widths (canonical tokens):**

| Element | Size | Notes |
|---|---|---|
| `WorkflowHeader` | height: 48px | Existing. Metadata band. |
| `ModeToolbarRow` | height: 44px | Existing. Mode pills + toolbar icons. |
| `DiagramTitleBar` | height: 46px | New. Title + meta strip per §4.4 of VISIO_VISUAL_SPEC. |
| `InsightsStrip` | height: 40px | Existing. |
| `InspectorPanel` | width: 360px | Existing. |
| Total non-canvas fixed chrome | ~178px vertical | Canvas gets everything else. |

The `DiagramTitleBar` (MapTitleBar) must be added to the `WorkflowPageShell` render tree between the `ModeToolbarRow` and `CanvasArea`. It is always visible and always prints — it is structural chrome, not a toggleable overlay.

### 1.3 ModeToolbarRow — Toolbar Component Changes

The existing `WorkflowToolbar` renders zoom/fit/reset icons on the right side and toggle buttons for Labels, Metrics, Insights, Minimap. This row needs the following additions:

**Left side (after mode switcher):** no change — mode switcher stays left-aligned.

**Right side additions:**

1. **Legend toggle button** — currently in the toolbar with `showLegend` state. This remains but the legend default changes to `visible: true` (always-on per VISIO_VISUAL_SPEC §4.6). The button becomes a "hide/show legend" toggle rather than "show legend."

2. **Export/Print button** — a single `Download` icon button (Lucide `Download`) that opens a two-item dropdown:
   - "Export PNG" — triggers the PNG-export flow (§4)
   - "Print / PDF" — triggers `window.print()` (§4)
   
   The dropdown is a simple 2-item popover, same styling as existing kebab menus. No modal needed.

3. **Minimap toggle** — existing, stays in toolbar.

**Toolbar button visual spec (for the new export button):**
```
Size:        28px × 28px
Icon:        16px
Background:  transparent at rest; var(--surface-secondary) on hover
Border:      none
Border-radius: 6px
Tooltip:     "Export diagram" on hover, 300ms delay
```

### 1.4 ZoomControls — Always-Visible Panel (New)

The existing zoom handlers (`handleZoomIn`, `handleZoomOut`, `handleFitView`, `handleResetView`) are wired to the toolbar. These controls must also exist as an always-visible overlay on the canvas itself, positioned bottom-right, for users who have the toolbar scrolled away or hidden.

This is the React Flow `<Controls>` component per VISIO_VISUAL_SPEC §4.5. It replaces the need to use the toolbar for zoom — both paths work.

**Canvas-level Controls component layout:**
```
Position:     bottom-right, 16px from each edge
Z-index:      10
Contents:     zoom-in (+), zoom-out (−), fit-view (⊡), reset-view (↺)
Size per btn: 28px × 28px
Border:       1px solid #e5e7eb
Border-radius: 4px
Background:   #ffffff
Box-shadow:   0 1px 4px rgba(0,0,0,0.08)
```

The `showInteractive={false}` prop hides the lock button (irrelevant for read-only mode).

**In print:** the controls panel is hidden (`display: none !important` in `@media print`).

### 1.5 Legend — Always-On with Collapse

Per VISIO_VISUAL_SPEC §4.6, the legend is always visible by default (default `showLegend: true`).

**Default state change in `WorkflowPageShell.tsx`:**
```
// Change from:
const DEFAULT_TOOLBAR: ToolbarState = { ..., showLegend: false }

// Change to:
const DEFAULT_TOOLBAR: ToolbarState = { ..., showLegend: true }
```

**Legend position:** `position: absolute, bottom: 16px, left: 16px` within the canvas region. When the inspector is open on a narrow viewport (< 1024px), the legend must not be covered — it stays in the canvas region's coordinate space, which shrinks when the inspector overlays. No position adjustment needed; the legend is in the canvas div, not the inspector div.

**Legend collapse affordance:**
```
A small chevron icon in the legend header right-clicks to collapse.
Collapsed state: 32px × 32px pill showing just the legend icon (a colored diamond ◆).
Expanded state: 192px wide, full content per VISIO_VISUAL_SPEC §4.6.
Toggle is local state inside the legend component — not in ToolbarState.
```

**Legend sections (canonical, all modes):**

```
SHAPES
  ⬜ rect (br:3)     Process step
  ◆  diamond         Branch point (observed split only)
  ⬭  pill            Start / End

CONNECTIONS
  ——→   (2px slate)     Sequence flow
  --→   (1.5px red)     Exception / error path
  ══→   (2.5px slate)   High-frequency path (≥90% of runs)
  ~~→   (2px violet)    System handoff (swimlane mode)

INDICATORS
  ⚠   Bottleneck or friction
  🔒  Sensitive data field
  N/N  Run provenance (e.g. "1 of 8 runs")
```

The legend is mode-aware: in `systems` mode, the SHAPES section shows only the system node type. In `timeline` mode, it shows bars and milestones. The legend component receives the active mode and renders the relevant section.

### 1.6 Minimap Toggle

The minimap is off by default (`showMinimap: false`). When toggled on, React Flow's `<MiniMap>` renders at bottom-right, above the ZoomControls panel.

**Minimap visual spec:**
```
Position:     bottom-right, 16px from edge, sitting above ZoomControls
Width:        180px
Height:       120px
Border:       1px solid #e5e7eb
Border-radius: 4px
Background:   #f9fafb
Node color:   #d1d5db (desaturated, just position reference)
Mask color:   rgba(99,102,241,0.15) — indigo tint on the visible viewport
Z-index:      10
```

**In print:** minimap is hidden.

### 1.7 Empty, Loading, Error, Unprocessed, Forbidden States

These states occur at the mode level (each mode independently) as well as at the shell level. Current shell handles top-level loading/error/empty. The per-mode states are needed for `variants`, `bpmn`, and `timeline` which may not have data yet.

**Shell-level states (already handled, spec refinements below):**

**Loading state (`WorkflowSkeleton`):**
- Full-height skeleton that matches the shell chrome structure
- Skeleton rows simulate the canvas area with a pulsing gray rectangle
- The mode switcher row and header should appear (not skeleton) so the user knows the page loaded — only the canvas area skeletons
- DiagramTitleBar appears with dashes for the metadata values during loading

**Error state (`WorkflowErrorState`):**
```
Icon:        AlertCircle (Lucide), 40px, #dc2626
Title:       "Could not load diagram" (14px/600)
Message:     The error.message prop, 12px/400, #6b7280, max 2 lines
Action:      "Retry" button (secondary style)
Position:    Centered in canvas area
Background:  #ffffff
```

**Empty state (`WorkflowEmptyState`):**
```
Icon:        Workflow (Lucide), 40px, #9ca3af
Title:       "No process recorded yet" (14px/600, #374151)
Message:     "Record a workflow with the browser extension to generate a process map."
Action:      "Get Extension" button (primary/green)
Position:    Centered in canvas area
```

**Per-mode states (variants / bpmn / timeline):**

Each of these modes renders inside the canvas region div. When the mode has no data, it shows a compact per-mode placeholder that uses the same empty/loading/error treatment but is contained within the canvas area (not full-shell).

```
Mode-level loading:
  Full canvas area spinner (not skeleton)
  Spinner: 32px rotating ring, #6366f1
  Label: "Building [Mode Name]…" 11px/400, #6b7280

Mode-level unprocessed:
  Icon:        Info (Lucide), 32px, #9ca3af
  Title:       "[Mode Name] requires multiple recordings"
  Message:     "Record this workflow at least 3 times to unlock [mode name]."
  Action:      none (read-only state)
  
Mode-level forbidden:
  Icon:        Lock (Lucide), 32px, #9ca3af
  Title:       "Upgrade to unlock [Mode Name]"
  Message:     "[Mode Name] is available on the Team plan."
  Action:      "Compare plans →" link (matches the existing upgrade pattern)
  
Mode-level error:
  Same as shell-level error but scoped to the canvas area.
```

**Unprocessed state for `variants`:** already implemented via `variantsStatus` prop. The same pattern applies to `bpmn` and `timeline` — they accept a `status` prop: `'idle' | 'loading' | 'loaded' | 'unprocessed' | 'forbidden' | 'error'`.

### 1.8 Large-Graph Performance and Readability

For workflows with many steps (20+ nodes), the canvas needs density-reduction mechanisms. These are interaction-level specs, not visual tokens.

**Collapse/focus mechanisms — three levels:**

1. **Phase collapse (flow mode):** a phase group (the `PhaseGroupOverlay` band) can be collapsed to a single summary bar by clicking the phase header. When collapsed:
   - All nodes in the phase disappear from the canvas
   - A compact summary node appears: `[Phase Name] — N steps, X avg duration`
   - Edges route through the summary node (one edge in, one edge out)
   - A `+` affordance on the summary node expands it again
   - Visual: same width as the phase band, height 48px, background = the phase band color at 12% opacity, border = phase band color, border-radius: 3px

2. **System focus (swimlane mode):** clicking a lane header highlights that lane (full opacity) and dims all other lanes (30% opacity). A "Show all" button appears in the toolbar area when a lane is focused. Clicking the header again returns to full view.

3. **Zoom-adaptive labels (all modes):** at zoom below 0.5, step labels are hidden and only ordinal numbers + category color rails are shown. At zoom above 1.4, full labels + metadata show. The threshold is a component-level check on the React Flow `useViewport()` zoom value. No label DOM is removed — only the CSS `opacity: 0` state changes at zoom thresholds.

**Performance guardrail for large graphs:**
- Above 50 nodes: phase collapse is enabled by default for phases after the first
- Above 100 nodes: only the first phase renders on initial load; a "Load all phases" button appears
- These are UX thresholds, not hard technical limits — engineering can adjust based on measured React Flow performance

---

## 2. Canonical Design Tokens

This section consolidates `VISIO_VISUAL_SPEC.md`, `VISIO_LAYOUT_ROUTING_PLAN.md`, and `VISIO_ARCHITECTURE_REVIEW.md` into one reference table. Engineering uses this as the single source of truth; the three prior docs provide rationale and implementation detail.

### 2.1 Shape Tokens

| Shape | Border-radius | Width | Height | Notes |
|---|---|---|---|---|
| Task / Process box | 3px | 260px | 72px min | Left-rail 4px accent |
| Exception box | 3px | 260px | 72px min | Red left-rail `#b91c1c` |
| Decision diamond | 4px (inner square, rotated) | 160px | 160px | bounding box |
| Start pill | 22px | 160px | 44px | Green fill `#ecfdf5`, border `#6ee7b7` 2.5px |
| End pill | 22px | 160px | 44px | Gray fill `#f9fafb`, border `#9ca3af` 1.5px |
| System node (systems map) | 6px | 160px | 56px | Double border (2px outer, 1px inner gap) |
| Phase group band | 4px | full-canvas-width | auto | Colored band, no fill flood |
| Lane band (swimlane) | 0 | full-canvas-width | auto | Alternating tint, see §2.3 |

### 2.2 Connector Tokens

| Type | Stroke | Width | Dash | Arrowhead marker |
|---|---|---|---|---|
| Sequence (primary) | `#6b7280` | 2.5px | none | `arrow-seq` (slate) |
| Sequence (common, ≥40%) | `#9ca3af` | 2.0px | none | `arrow-seq` |
| Sequence (occasional, 15–39%) | `#9ca3af` | 1.5px | none | `arrow-seq` |
| Sequence (rare, <15%) | `#9ca3af` | 1.0px | none | `arrow-seq` |
| Exception / error | `#fca5a5` | 1.5px | `6 3` | `arrow-exc` (red) |
| Decision branch | `#fbbf24` | 2.0px | none | `arrow-dec` (amber) |
| Cross-lane handoff | `#8b5cf6` | 2.0px | none | `arrow-handoff` (violet) |
| Selected (any type) | `#6366f1` | 2.5px | per type | `arrow-sel` (indigo) |

All connectors: `borderRadius: 0` in `getSmoothStepPath` (crisp right-angle elbows). Arrowhead: closed triangle, 9×9px, fills match stroke color. `markerUnits="strokeWidth"` (scales with weight).

### 2.3 Color Palette (canonical)

**Category accent colors (CATEGORY_STYLES — final):**

| Category | `color` (accent) | `bg` | `text` |
|---|---|---|---|
| `click_then_navigate` | `#0d9488` | `#f0fdfa` | `#1e293b` |
| `fill_and_submit` | `#1d4ed8` | `#eff6ff` | `#1e293b` |
| `repeated_click_dedup` | `#c2410c` | `#fff7ed` | `#1e293b` |
| `single_action` | `#475569` | `#f8fafc` | `#1e293b` |
| `data_entry` | `#6d28d9` | `#f5f3ff` | `#1e293b` |
| `send_action` | `#047857` | `#ecfdf5` | `#1e293b` |
| `file_action` | `#b45309` | `#fffbeb` | `#1e293b` |
| `error_handling` | `#b91c1c` | `#fef2f2` | `#1e293b` |
| `annotation` | `#7e22ce` | `#faf5ff` | `#1e293b` |

Note: `text` is uniformly `#1e293b` (near-black) for all categories. Tinted text at 12px/600 is insufficient contrast in print.

**Surface colors:**

| Token | Value | Usage |
|---|---|---|
| Canvas background | `#ffffff` | React Flow canvas background |
| Grid line | `#f3f4f6` | Line-grid color, very faint |
| Grid gap | 20px | Line-grid pitch |
| Lane separator | `#d1d5db` | Solid 1px between swimlane bands |
| Lane tint (even) | transparent | No tint |
| Lane tint (odd) | `{lane.color}05` | 2% tint |
| Header band | `rgba(255,255,255,0.97)` | Swimlane header overlay bg |
| Header border-right | `#e5e7eb` 2px | Swimlane header right edge |

### 2.4 Typography Scale

| Token | Size | Weight | Color | Usage |
|---|---|---|---|---|
| `diagram-title` | 15px | 700 | `#111827` | Workflow name in `MapTitleBar` |
| `meta-strip` | 10px | 400 | `#6b7280` | Metadata items in `MapTitleBar` |
| `node-label` | 12px | 600 | `#1e293b` | Task node step label |
| `node-category` | 10px | 700 uppercase | category `color` | Category badge, ordinal |
| `node-meta` | 10px | 500 | `#4b5563` | Duration, system chip |
| `node-subtext` | 9px | 400 | `#6b7280` | Edge labels, legend, metadata |
| `lane-label` | 12px | 700 | `#111827` | Swimlane lane label |
| `lane-meta` | 10px | 400 | `#6b7280` | Lane step count + duration |
| `section-header` | 11px | 700 uppercase | `#374151` | Phase label, diagram section |

Nothing below 9px anywhere in the diagram.

Font family: `'Inter', system-ui, -apple-system, sans-serif`. Applied via `.workflow-flow-canvas, .workflow-swimlane-canvas` CSS class.

---

## 3. Two New View Designs

### 3.1 Structured Business-Process Map (`bpmn` mode)

**Goal:** A diagram that an ops analyst or process owner recognizes as "a proper process map" — structured with explicit event triggers, task boxes, gateway decisions, and a clear process boundary. Think Visio BPMN Collaboration Diagram or a Lucidchart BPMN template. It reuses the shared canvas chrome and shape vocabulary, but enforces stricter BPMN-class structure and adds pool/participant labeling.

**Target user:** ops leads, process analysts, external auditors. They know BPMN vocabulary and expect start events, end events, tasks, gateways, and sequence flows — labeled, organized, readable.

#### 3.1.1 Layout Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  PARTICIPANT: [Workflow Name]                     ← Pool header  │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ ○ Start ──→ [Task] ──→ ◆ Branch ──→ [Task] ──→ [Task] ● End│   │
│ │                    └──→ [Task (exception)] ──────────────┘ │   │
│ └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

Direction: **left-to-right** (`LayoutProfile.direction: 'RIGHT'`). This is the universal BPMN reading direction.

The outermost container is a "Pool" — a labeled rectangle surrounding the entire flow. This is rendered as a `PoolBoundary` overlay element (not a React Flow node), similar to how `PhaseGroupOverlay` works in flow mode: an absolutely-positioned div that wraps the canvas flow.

**Pool header:**
```
Position:   top of the canvas, full width, 28px tall
Background: #f1f5f9 (light slate)
Border-bottom: 1px solid #cbd5e1
Content:    "PARTICIPANT · [Workflow Name]" — 10px/700/uppercase/#334155
```

#### 3.1.2 Node Designs (BPMN Mode Overrides)

In `bpmn` mode, the ShapeResolver emits BPMN-class shapes. These reuse the same underlying React Flow node components but with mode-specific CSS overrides.

**Start Event (circle with play triangle):**
```
Shape:        circle (not pill), 36px diameter
Background:   #ecfdf5 (green tint)
Border:       2px solid #059669
Icon:         filled right-pointing triangle (play), 14px, #059669, centered
Label:        12px/600, below the circle, centered
```

**End Event (circle with square):**
```
Shape:        circle, 36px diameter, border 3px solid #374151
Background:   #f9fafb
Icon:         filled square, 12px, #374151, centered
Label:        below, centered
```

**Task box:** Same as VISIO_VISUAL_SPEC process box (260×72px, borderRadius: 3, left-rail 4px). The BPMN mode adds a small task-type icon in the top-right corner:
```
Task type icon area: 16px × 16px in top-right, inside node padding
Script icon (user task):  pencil icon, 10px, #6b7280
Service icon (system):    cog icon, 10px, #6b7280
(Derived from node.systems.length > 0 → service; else → user)
```

**Gateway (XOR exclusive):**
The existing decision diamond is reused. In BPMN mode, the diamond gets an `×` symbol inside it instead of `◆ Branch point`:
```
Symbol: "×" (unicode ×, not multiply sign), 20px/400, #b45309, centered in the diamond
Label:  below the diamond, 10px/400, #6b7280, observed-data language only
```

The `×` in a diamond is the canonical BPMN XOR gateway symbol. It communicates "exclusive branch" to trained BPMN readers without fabricating a condition label.

**Intermediate events (new in bpmn mode):**
When a step follows a validation error (decisionProvenance: `observed-validation`), it is shown as a BPMN intermediate error event:
```
Shape:    circle, 28px diameter, with inner circle (double ring)
Border:   1.5px solid #dc2626 (outer), 1.5px solid #dc2626 (inner, 4px inset)
Fill:     #fef2f2
Icon:     lightning bolt, 12px, #dc2626, centered
```
This appears in the sequence between the submit task and the error-handling task, replacing the start of the exception edge.

#### 3.1.3 Sequence Flow Labels

In BPMN mode, outgoing flows from a gateway carry labels. These are required for BPMN readability. Since Ledgerium only has observed data:
- Primary outgoing flow: `"Standard path · N runs"` (where N = run count of the main path)
- Alternate flow(s): `"Alt · N runs (X%)"` (count and percentage)

Never: "Yes" / "No" / "Approved" / "Rejected". Always observed-count language.

#### 3.1.4 Legend (BPMN Mode)

```
BPMN SHAPES
  ○  Start event
  ● (thick ring) End event
  ⬛ (br:3)  Task
  ◆×  Exclusive gateway (XOR)
  ○⚡ Intermediate error event

SEQUENCE FLOWS
  ——→  Sequence flow
  --→  Exception flow
  
NOTE: All branch decisions show observed run counts only.
      Gateway labels reflect actual divergence, not modeled conditions.
```

#### 3.1.5 Hover and Select Interactions

Hover on a task node:
- Node border deepens to `{accentColor}60` (38% opacity)
- Box-shadow lifts: `0 4px 12px rgba(0,0,0,0.10)`
- A small tooltip appears above the node: `"{N} events · {durationLabel} avg"`
- The tooltip is a 10px/400/`#374151` text in a white pill with `#d1d5db` border, 4px border-radius

Click on a task node:
- Opens the InspectorPanel (existing behavior, same data model)
- Selection ring: white gap (2px) + indigo ring (2px) — `0 0 0 2px #ffffff, 0 0 0 4px #6366f1`

Click on a gateway:
- InspectorPanel shows the decision provenance, outgoing run counts, and a note: "This branch point was observed in [N] of [M] runs"

Click on a sequence flow:
- Edge highlights indigo (existing behavior)
- InspectorPanel shows edge label + source/target node names

#### 3.1.6 Empty/Unprocessed State (BPMN Mode)

BPMN mode is available from single recordings (it maps the single-run flow in BPMN notation). It shows the unprocessed state only when no process data exists at all.

```
Icon:        Layout (Lucide), 32px, #9ca3af
Title:       "No structured map available"
Message:     "A structured process map is generated automatically once your workflow is processed."
```

---

### 3.2 Duration / Time-Based View (`timeline` mode)

**Goal:** A horizontal timeline showing where time is actually spent in a process — which steps are long, which are fast, where the total cycle time accumulates. Think a simplified Gantt chart or Value Stream Map (VSM) time axis. This view is immediately useful to ops users asking "where is the time going?"

**Target user:** process improvement specialists, ops managers, anyone identifying cycle-time bottlenecks. Familiar with Gantt charts and process timeline formats.

#### 3.2.1 Layout Structure

Direction: **left-to-right**, time axis.

```
                        ← TOTAL DURATION: 4m 22s (8 runs avg) →
       ┌─────────┬──────────────────────┬──────────┬───────────┐
START  │ Step 1  │      Step 2          │ Step 3   │  Step 4   │  END
       │  2s     │       8s             │  4s      │   2s      │
       └─────────┴──────────────────────┴──────────┴───────────┘
       [Navigation][   Data Entry       ][Form Sub ] [Send/Sub ]
```

Steps are drawn as proportionally-sized horizontal bars. The width of each bar is proportional to the step's `durationMs` relative to the total process duration. This gives an immediate visual of where time accumulates.

#### 3.2.2 Node Design (Timeline Bars)

Each step is rendered as a horizontal bar, not a box. The bar is a sequence, not a floating card.

**Step bar spec:**
```
Height:           56px
Width:            proportional to durationMs / totalDurationMs × canvasWidth
                  minimum width: 80px (for very short steps, so labels remain readable)
Background:       {CATEGORY_STYLES[category].bg} with 8% opacity increase
Border-left:      4px solid {CATEGORY_STYLES[category].color}
Border-radius:    0 (left-aligned with rail, no radius except the first step's left and last step's right)
  — First step: border-radius: 3px 0 0 3px
  — Last step: border-radius: 0 3px 3px 0
  — Middle steps: border-radius: 0
Content layout (inside bar):
  Top row:    Ordinal badge (16px circle, left-anchored) + Category label (10px/700/uppercase)
  Middle row: Step title (12px/600/#1e293b, truncated with ellipsis at 90% of bar width)
  Bottom row: Duration label (10px/500/#4b5563)
  Right edge: if bar is wide enough (>120px), show duration label right-aligned
```

**Duration label format:**
- Under 1 minute: `"4s"` (seconds only)
- 1–60 minutes: `"4m 22s"`
- Over 1 hour: `"1h 4m"`

**Timeline ruler above the bars:**
```
Height:   24px above the bar row
Content:  Time markers at 20% intervals: 0s, Xs, Xs, Xs, total duration
Font:     9px/400/#9ca3af
Color:    #d1d5db tick marks
```

**Step connectors in timeline mode:**
Steps are adjacent (directly touching), so no sequence-flow arrow is needed between them. A thin 1px `#d1d5db` vertical separator appears between each pair of adjacent steps.

**Exception paths in timeline:**
When a step has an exception exit, the exception path step is rendered on a second row below the main timeline, indented 24px, with a dashed red left border and connecting down-arrow:
```
Down-arrow connector: 12px dashed red (#fca5a5), 8px width, connecting main bar to exception bar
Exception bar: same proportional width but for the exception path duration
Background: #fef2f2
```

#### 3.2.3 Time-Axis Summary Row

Below the step bars, a summary row shows accumulated value vs wait:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ VALUE-ADD TIME   ████████████████████████████░░░░░░░░░░░░░░░░░░░  68%   │
│ TOTAL DURATION   4m 22s avg across 8 runs  ·  min: 19s  ·  max: 11m 3s  │
└──────────────────────────────────────────────────────────────────────────┘
```

```
Container:  full-width strip, 48px height, below the bar row
Background: #f9fafb
Border-top: 1px solid #e5e7eb
Font:       10px/600/uppercase/#374151 (labels), 10px/400/#6b7280 (values)
Value bar:  green (#059669) filled portion, gray (#e5e7eb) remainder
            height: 8px, border-radius: 4px, shows value-add percentage
```

Data source: `value-add time` = sum of durationMs for steps where `category ∈ {fill_and_submit, send_action, data_entry}`. This is a reasonable proxy for human intent; the label "Value-add" is shown with a (?) tooltip explaining the definition.

**Multi-run variance in timeline:**
When multi-run data exists (`isMultiRun: true`, `runCount ≥ 3`), each bar shows a variance indicator:
```
Variance indicator: a thin hairline (1px dashed #d97706) extending from the right edge of the bar
                    showing the p90 duration
Tooltip on hover:   "Avg: 4s · Min: 2s · Max: 11s · p90: 8s"
```

#### 3.2.4 Hover and Select Interactions

Hover on a timeline bar:
- Border deepens: `1px solid {accentColor}` (full opacity)
- Tooltip appears above: `"{step title} — {durationLabel} avg{, {runCount} runs}"`
- Tooltip spec: white pill, 10px/400/#374151, 1px #d1d5db border, 4px border-radius

Click on a timeline bar:
- Bar gets selection ring: `outline: 2px solid #6366f1, outline-offset: 2px`
- InspectorPanel opens (same data as other modes — the inspector is mode-agnostic)

Click on the summary row's value bar:
- A tooltip explains: "Value-add = steps where the user is actively entering data or submitting actions. Observation-based — not a formal VSM category."

#### 3.2.5 Legend (Timeline Mode)

```
TIMELINE
  ████  Proportional step duration (width = % of total time)
  ----  Exception / error path

INDICATORS
  4px left rail  Step category (color matches flowchart modes)
  ░ bar end      p90 duration variance (multi-run only)
  ⚠             Bottleneck: step duration > 2× average
  
VALUE-ADD BAR
  ████  Value-add steps (Data entry, Submit, Send)
  ░░░░  Other steps
```

#### 3.2.6 Empty/Unprocessed States (Timeline Mode)

Timeline mode requires duration data (`durationMs` on nodes). It shows a meaningful view from a single run.

```
Unprocessed (no duration data):
  Icon:     Timer (Lucide), 32px, #9ca3af
  Title:    "No duration data available"
  Message:  "Duration data appears once the workflow engine processes your recording."
```

When multiple runs exist but durations vary significantly:
- A yellow info banner above the timeline: "Duration shown is the average of {N} runs. Individual run times varied from {min} to {max}."
- This is the ProvenanceBanner component reused (see §5).

#### 3.2.7 Panning and Zoom in Timeline Mode

The timeline is a horizontal band. Panning is horizontal-only (vertical pan is disabled — there is nothing below the exception row). Zoom increases/decreases the bar widths proportionally, keeping the left edge fixed. The time ruler updates its markers as the user zooms.

The React Flow canvas in timeline mode uses `translateExtent` to constrain vertical pan. The `fitView` button scales the timeline to fit the full process duration in the viewport width.

---

## 4. Export and Print

### 4.1 Export Affordance

The export button is an always-visible `Download` icon in the toolbar row (right side, see §1.3). Clicking it shows a two-item dropdown:

```
┌──────────────────────────┐
│ ↓ Export PNG             │
│ 🖨  Print / PDF          │
└──────────────────────────┘
```

**Dropdown spec:**
```
Width:          180px
Background:     #ffffff
Border:         1px solid #e5e7eb
Border-radius:  6px
Box-shadow:     0 4px 16px rgba(0,0,0,0.12)
Item height:    36px
Item padding:   0 14px
Item font:      12px/400/#374151
Item hover:     background #f9fafb
Icon:           16px, left of label, #6b7280
```

### 4.2 PNG Export Flow

When "Export PNG" is selected:

1. A `<canvas>` export is triggered using the `html2canvas` or React Flow's built-in `toObject()` + SVG serialization approach. (Architecture decision for engineering — both approaches are valid; this spec does not mandate the mechanism, only the behavior.)

2. Before export, the export pipeline:
   - Forces the canvas background to `#ffffff`
   - Hides: ZoomControls, Minimap, all toolbar overlays, the ProvenanceBanner interactive elements
   - Preserves: DiagramTitleBar, Legend, all nodes and edges, the SwimlaneHeaderOverlay
   - Sets zoom to `fitView` automatically to ensure the full diagram is captured

3. The exported PNG file name: `{workflowTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-{mode}-{YYYY-MM-DD}.png`
   Example: `approve-expense-report-flow-2026-06-12.png`

4. A brief loading state replaces the export button icon: rotating spinner (200ms minimum display to avoid flash).

5. On completion, the file download begins via a synthetic `<a href>` click.

**PNG export spec:**
```
Resolution:     2× (retina) — 200% device pixel ratio
Background:     #ffffff (white, never transparent)
DiagramTitleBar: included at top of the PNG
Legend:         included at bottom-left if visible
Margins:        32px white margin on all sides outside the diagram content
Max dimensions: 4096×4096px (if diagram exceeds this, the export is clipped and a warning toast appears)
```

### 4.3 Print / PDF Flow

When "Print / PDF" is selected, `window.print()` is called. The `@media print` CSS block (per VISIO_VISUAL_SPEC §4.7, extended below) handles all formatting.

**Print CSS additions (extending VISIO_VISUAL_SPEC §4.7):**

```css
@media print {
  /* Hide all non-diagram chrome */
  .workflow-header,
  .mode-toolbar-row,
  .insights-strip,
  .inspector-panel,
  .workflow-legend button,          /* hide legend collapse toggle */
  .react-flow__controls,
  .react-flow__minimap,
  .react-flow__attribution,
  .export-dropdown,
  .provenance-banner-close,         /* hide the X button on provenance notice */
  [data-testid="workflow-mode-switcher"],
  [data-testid="workflow-toolbar"] {
    display: none !important;
  }

  /* Show diagram title bar at top */
  .map-title-bar {
    display: block !important;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    border-bottom: 1pt solid #374151 !important;
    page-break-after: avoid;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Canvas area fills the page below the title bar */
  .canvas-region {
    position: fixed;
    top: 46px;   /* DiagramTitleBar height */
    left: 0;
    right: 0;
    bottom: 0;
  }

  /* Force white */
  .react-flow__background {
    background: #ffffff !important;
  }
  .react-flow__background pattern { display: none !important; }

  /* Preserve node accent colors */
  .react-flow__node,
  .react-flow__node > div,
  .swimlane-header-overlay {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Legend stays bottom-left */
  .workflow-legend {
    position: fixed !important;
    bottom: 0.4in;
    left: 0.4in;
    box-shadow: none !important;
    border: 0.5pt solid #d1d5db !important;
    page-break-inside: avoid;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Page setup: landscape for wide diagrams */
  @page {
    size: A4 landscape;
    margin: 0.4in;
  }
  
  /* Provenance banner prints if present (users should see it in their printout) */
  .provenance-banner {
    display: block !important;
    position: fixed;
    top: 46px; /* below title bar */
    left: 0;
    right: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

**User behavior before printing:**
- The user should use `fitView` or zoom to frame the diagram before printing
- A pre-print toast notification (shown when the export dropdown is opened): "Tip: use Fit View to frame the diagram before printing."
- Toast is non-blocking, disappears after 4s, does not block the print action

**The print result looks like:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Approve Expense Report   Flow Intelligence Map                  Ledgerium AI  │
│ 5 steps · 1 system · 19s avg · 1 run · Jun 12, 2026                         │
│──────────────────────────────────────────────────────────────────────────────│
│                                                                              │
│           ○ Start                                                            │
│              │                                                               │
│    ┌─────────────────────┐                                                   │
│    │ 1 NAVIGATION 2s     │                                                   │
│    │ Open expense report │                                                   │
│    └─────────────────────┘                                                   │
│              │                                                               │
│    (... rest of diagram ...)                                                 │
│                                                                              │
│ ┌─ LEGEND ──────────────────┐                                                │
│ │ ⬛ Process step            │                                                │
│ │ ◆  Branch point           │                                                │
│ │ ——→ Sequence flow         │                                                │
│ └───────────────────────────┘                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Honesty in UX

This section addresses the architecture review's findings (C-1 through C-3) from a user-visible perspective. The underlying model changes are specified in `VISIO_ARCHITECTURE_REVIEW.md §2.3` — this section defines what users see.

### 5.1 ProvenanceBanner — Single-Run vs Multi-Run Notice

**When `isMultiRun === false` (single recording):**

A yellow informational banner appears at the top of the canvas area (overlaid on the canvas, not pushing it down):

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ⓘ  This is one recording of this workflow. Process variants and branching  │
│    appear once you have 3+ recordings.  [View Variants →]              [×] │
└────────────────────────────────────────────────────────────────────────────┘
```

**Component: `ProvenanceBanner`**

```
Position:     absolute, top: 0, left: 0, right: 0, z-index: 8
Height:       36px (single line), auto if text wraps
Background:   #fef9c3 (pale yellow)
Border-bottom: 1px solid #fde68a
Text:         11px/400/#713f12
Icon:         Info (Lucide), 14px, #b45309, left of text
CTA link:     "View Variants →" — 11px/600/#b45309, switches mode to 'variants' on click
Close button: × icon, 16px, #b45309, right edge — dismisses for the session (localStorage key)
```

The banner is dismissed per-session only (not permanently) — if the user returns, they see it again. This is intentional: a new visitor to the page should always know the provenance of what they are seeing.

**In print:** the banner is shown in the printout (see §4.3 print CSS). A printed process map should carry its provenance notice. The close button is hidden in print; the banner text and CTA text remain.

**When `isMultiRun === true`:**
No banner. The DiagramTitleBar `meta.runCount` chip shows `"8 runs"` — the run count is always visible.

### 5.2 Decision Node Provenance Markers

The architecture review defines three `decisionProvenance` values: `'observed-divergence'`, `'observed-validation'`, `'inferred'`. The UX treatment for each:

**`observed-divergence` (multi-run, sound):**
Standard diamond shape per VISIO_VISUAL_SPEC. Label: `"◆ Branch point"` header + observed-count text.
```
No additional marker needed — this is the canonical observed branch.
```

**`observed-validation` (single-run, submit→error, sound for this run):**
Diamond shape, but with a small "single-run" indicator in the top-right corner of the diamond's bounding box:
```
Indicator:    "1 run" pill badge, 8px/600, background #fef9c3, border #fde68a, border-radius: 3px
Position:     top-right of the diamond bounding box, overlapping the corner
Tooltip:      "This branch was observed in a single recording. Multi-run analysis may show more paths."
```

**`inferred` (title-regex heuristic — demoted to task):**
The ShapeResolver (per architecture review) renders this as a task box, not a diamond. UX sees no diamond — just a regular task node. No user-visible indicator of "was once inferred as a decision" is shown. This is correct: the user should not see a fabricated decision shape.

### 5.3 Run Count on Every View

The `MapTitleBar` (DiagramTitleBar) shows `runCount` in the metadata strip at all times:

```
5 steps · 1 system · 19s avg · 1 run · Jun 12, 2026
                               ↑ this chip
```

When `runCount === 1`, the chip renders as `"1 run"` in `#92400e` (amber text) to visually signal single-trace status without a banner taking space in the canvas.

When `runCount > 1`, the chip renders as `"8 runs"` in standard `#6b7280`.

This run-count signal is always visible regardless of mode — it is structural metadata, not a toggleable overlay.

### 5.4 Frequency Coding Honesty

Connector frequency coding (stroke weight by observed frequency per §2.2) is only shown when multi-run data exists. On single-run maps, all sequence connectors use the uniform `2.0px` weight. A note in the legend explains this:

```
CONNECTIONS legend section — single-run mode:
  ——→   Sequence flow (single recording)

CONNECTIONS legend section — multi-run mode:
  ══→   High-frequency path (≥90% of runs)
  ——→   Common path (40–89%)
  ──→   Occasional path (15–39%)
  ·──→  Rare path (<15%)
```

The legend dynamically shows the multi-run connector section only when `isMultiRun === true`. This prevents users from interpreting uniform strokes as "all equally frequent."

---

## 6. Future Editing and Templates (Interaction Concept Only)

This section defines the interaction concept and placement for future drag-to-edit and template gallery features. These are NOT shipped now. No implementation is implied.

### 6.1 Edit Mode Toggle

**Where it lives:** in the ModeToolbarRow, to the right of all current toolbar controls. A single `Edit` button (Pencil icon, Lucide `Pencil`) appears disabled (grayed out, tooltip: "Editing coming soon") in the current release. In a future release, this button activates Edit Mode.

**Edit Mode UX concept:**
- Activating Edit mode transitions the canvas to an editable state
- Nodes become draggable (React Flow `nodesDraggable={true}`)
- A left sidebar appears (240px wide) with a shape palette: Process box, Decision, Start/End, Annotation
- Drag from the palette onto the canvas to add a node
- Click a connector to delete it or drag its endpoint to reconnect
- A "Save as new version" button in the toolbar saves the edited layout as a user annotation layer
- The original observed layout is never modified — the edit is an overlay (annotation layer pattern from architecture review's future phase)
- Exit Edit Mode returns to the read-only view

**Edit Mode palette sidebar spec (future):**
```
Width:    240px
Position: left side, slides in from the left (like the inspector slides from the right)
Contents:
  SHAPES
    [rect] Process step   — drag to add
    [◆] Decision         — drag to add
    [pill] Start / End   — drag to add
    [rect+red] Exception — drag to add
  ANNOTATIONS
    [T] Text label        — drag to add
    [→] Arrow             — drag to add
    [rectangle] Box       — drag to add (selection/grouping)
```

### 6.2 Template Gallery (Future)

**Where it lives:** A "Templates" option in the export dropdown (below Print / PDF). When clicked, opens a modal.

**Template gallery concept:**
```
Title: "Save as Template" OR "Load Template"
Two tabs:
  "My Templates"   — templates saved from previous diagrams
  "Starter Maps"   — Ledgerium-provided example process maps
                     (Expense Approval, Onboarding, Support Ticket)

Template card (in a 3-column grid):
  Thumbnail:   miniature diagram SVG preview, 160px × 100px
  Name:        12px/600
  Steps:       "N steps" 10px/400/#6b7280
  Action:      "Use template" button

When a template is loaded:
  A new workflow is pre-populated with the template's step structure.
  The user records over it with their own behavior.
  The template provides step names and category hints; actual data replaces them on recording.
```

This feature is intentionally minimal at the concept level. The structural decision — templates live in the export dropdown, not in a top-level nav item — is the UX commitment made here. Implementation detail is deferred.

---

## 7. P0–P2 UX Punch-List

### P0 — Must ship before demo or external sharing

These items produce a environment that reads as polished and professional, and correct on honesty.

| ID | Item | Component | Spec location |
|---|---|---|---|
| E-P0-1 | DiagramTitleBar above every canvas | New `MapTitleBar`, wired in `WorkflowPageShell` | §1.2, VISIO_VISUAL_SPEC §4.4 |
| E-P0-2 | ZoomControls always-visible panel on canvas | `<Controls>` in each canvas | §1.4, VISIO_VISUAL_SPEC §4.5 |
| E-P0-3 | Legend always-on by default (`showLegend: true`) | `DEFAULT_TOOLBAR` in `WorkflowPageShell` | §1.5 |
| E-P0-4 | ProvenanceBanner for single-run maps | New `ProvenanceBanner` component | §5.1 |
| E-P0-5 | Run count chip in DiagramTitleBar, amber when 1 | `MapTitleBar` `runCount` chip | §5.3 |
| E-P0-6 | All 6 modes in `WorkflowModeSwitcher` | `WorkflowModeSwitcher.tsx` | §1.1 |
| E-P0-7 | Export/Print button in toolbar | `WorkflowToolbar` + dropdown | §1.3, §4.1 |
| E-P0-8 | `@media print` CSS block (full spec) | `globals.css` | §4.3, VISIO_VISUAL_SPEC §4.7 |
| E-P0-9 | Decision node `observed-validation` badge | `WorkflowDecisionNode` | §5.2 |
| E-P0-10 | `inferred` decisions render as tasks (not diamonds) | ShapeResolver | ARCH_REVIEW §2.3, §5.2 |
| All V-P0-* | Visio shape vocabulary (borderRadius, arrowheads, grid) | Per VISIO_VISUAL_SPEC §7 P0 list | VISIO_VISUAL_SPEC §7 |

### P1 — Professional environment (same sprint)

| ID | Item | Component | Spec location |
|---|---|---|---|
| E-P1-1 | Per-mode loading/error/unprocessed/forbidden states | Per-mode canvas components | §1.7 |
| E-P1-2 | Phase-collapse affordance (flow mode, 20+ nodes) | `PhaseGroupOverlay` + `WorkflowFlowCanvas` | §1.8 |
| E-P1-3 | Legend mode-awareness (sections adapt per mode) | `WorkflowLegend` | §1.5 |
| E-P1-4 | Legend collapse to 32px pill | `WorkflowLegend` | §1.5 |
| E-P1-5 | Frequency legend section only when `isMultiRun` | `WorkflowLegend` | §5.4 |
| E-P1-6 | System-focus dimming in swimlane mode | `WorkflowSwimlaneCanvas` | §1.8 |
| E-P1-7 | BPMN mode — basic layout and node shapes | New `WorkflowBPMNCanvas` | §3.1 |
| E-P1-8 | Timeline mode — proportional bars and time ruler | New `WorkflowTimelineCanvas` | §3.2 |
| E-P1-9 | PNG export flow | Export handler + canvas serialization | §4.2 |
| E-P1-10 | Minimap overlay spec (position, size, colors) | `WorkflowPageShell` minimap config | §1.6 |
| All V-P1-* | Visio professional impression (swimlane overlay, title bar, etc.) | Per VISIO_VISUAL_SPEC §7 P1 list | VISIO_VISUAL_SPEC §7 |

### P2 — Completeness and polish

| ID | Item | Component | Spec location |
|---|---|---|---|
| E-P2-1 | Zoom-adaptive label hiding below 0.5 zoom | All canvases, `useViewport` check | §1.8 |
| E-P2-2 | Timeline multi-run variance hairlines | `WorkflowTimelineCanvas` | §3.2.3 |
| E-P2-3 | Timeline value-add summary row | `WorkflowTimelineCanvas` | §3.2.3 |
| E-P2-4 | BPMN intermediate error event shape | `WorkflowBPMNCanvas` | §3.1.2 |
| E-P2-5 | BPMN pool boundary overlay | `WorkflowBPMNCanvas` | §3.1.1 |
| E-P2-6 | Pre-print "Tip: use Fit View" toast | Export dropdown trigger | §4.3 |
| E-P2-7 | ProvenanceBanner persisted-dismiss (localStorage) | `ProvenanceBanner` | §5.1 |
| E-P2-8 | Large-graph: collapse by default for phases >1 when >50 nodes | `WorkflowFlowCanvas` | §1.8 |
| E-P2-9 | Edit mode button (disabled, tooltip "coming soon") | `WorkflowToolbar` | §6.1 |
| E-P2-10 | Narrow-viewport mode switcher scroll + fade | `WorkflowModeSwitcher` | §1.1 |
| All V-P2-* | Print readiness, font, color tokens | Per VISIO_VISUAL_SPEC §7 P2 list | VISIO_VISUAL_SPEC §7 |

---

## 8. QA Acceptance Criteria

For each P0 item, the following are observable checks:

### Shell and Chrome
- [ ] DiagramTitleBar appears above the canvas in all 6 modes, showing workflow name + metadata strip
- [ ] Run count chip is amber-colored when `runCount === 1`
- [ ] ZoomControls panel is visible at bottom-right of canvas at all times (not only in toolbar)
- [ ] Legend is visible by default without user action
- [ ] Legend collapse: clicking the chevron collapses legend to 32px pill; clicking pill expands it
- [ ] Mode switcher shows all 6 modes; on narrow viewport (< 900px) it scrolls horizontally
- [ ] Export button shows a two-item dropdown: "Export PNG" and "Print / PDF"

### State Handling
- [ ] Loading state: canvas area shows spinner/skeleton; mode switcher and header are visible
- [ ] Error state: centered error message with "Retry" button; clicking Retry re-attempts load
- [ ] Empty state: centered empty state with "Get Extension" CTA
- [ ] Variants mode `status='unprocessed'`: shows "requires multiple recordings" message with step count required
- [ ] Variants mode `status='forbidden'`: shows upgrade prompt with "Compare plans →" link

### Honesty
- [ ] `isMultiRun === false`: ProvenanceBanner appears at top of canvas with "1 of N runs" message
- [ ] ProvenanceBanner "View Variants →" link switches mode to 'variants'
- [ ] ProvenanceBanner × button dismisses the banner; it does not reappear until page reload
- [ ] Decision nodes with `decisionProvenance='inferred'` render as task boxes, NOT diamonds
- [ ] Decision nodes with `decisionProvenance='observed-validation'` show "1 run" pill in top-right corner
- [ ] Frequency legend section does not appear when `isMultiRun === false`
- [ ] No connector label ever reads "Yes" / "No" / "If approved" / "Approved" / "Rejected"

### BPMN Mode
- [ ] Start event renders as a circle (not pill) with play triangle icon, 36px
- [ ] End event renders as a circle with thick border, filled square icon, 36px
- [ ] Task boxes show task-type icon (pencil or cog) in top-right corner
- [ ] Gateway renders as diamond with × symbol, NOT "◆ Branch point"
- [ ] Outgoing flows from a gateway show observed-count labels ("N runs · X%")
- [ ] Pool boundary overlay spans the full diagram width with participant label

### Timeline Mode
- [ ] Steps render as horizontal bars proportional to `durationMs`
- [ ] Time ruler appears above the bars with labels at 20% intervals
- [ ] Minimum bar width is 80px (very short steps are not invisible)
- [ ] First step has left-rounded corners; last step has right-rounded corners
- [ ] Summary row appears below the bars showing value-add vs total duration bar
- [ ] Exception path steps appear on a second row below the main timeline
- [ ] Multi-run variance hairlines appear when `isMultiRun === true`

### Export and Print
- [ ] `Ctrl+P` (browser print): title bar at top, canvas on white background, legend at bottom-left, no controls/minimap/toolbar
- [ ] Print: ProvenanceBanner text is visible in print output; ProvenanceBanner close button is hidden
- [ ] Print: page orientation is landscape (A4)
- [ ] Print: accent rail colors print (not stripped)
- [ ] PNG export: downloads a file named `{slug}-{mode}-{date}.png`
- [ ] PNG export: white background, title bar included, margins present

---

## 9. Assumptions and Open Questions for Engineering

1. **`bpmn` and `timeline` modes** are new canvas components that need to be created. The architecture review's `VisioCanvas` unified renderer is the target end-state, but these can be implemented as separate canvas files (`WorkflowBPMNCanvas.tsx`, `WorkflowTimelineCanvas.tsx`) in the first pass, following the existing pattern of the four current canvases.

2. **Value-add time calculation** for the timeline summary row assumes `durationMs` is available per node. If it is null, the value-add bar should be omitted rather than showing zeroes.

3. **`isMultiRun` and `runCount`** are additive fields on `NormalizedViewModel` per `VISIO_ARCHITECTURE_REVIEW.md §2.3`. The `WorkflowPageShell` needs to receive these from the view model and pass `isMultiRun` to the `ProvenanceBanner` and legend.

4. **PNG export** — the mechanism (html2canvas, React Flow's `getNodes()`/SVG, or a server-side approach) is an engineering decision. This spec defines only the behavior and output quality, not the implementation.

5. **BPMN pool boundary overlay** renders outside the React Flow canvas (like `PhaseGroupOverlay` and `SwimlaneHeaderOverlay`). It is a positioned div, not a React Flow node.

6. **Timeline canvas** does not use the standard React Flow node layout. It could be implemented as a React Flow canvas with custom node types and a custom layout (horizontal proportional placement), or as a plain React/SVG component. The React Flow approach is recommended for consistency with the inspector selection model (click → InspectorPanel) and for the zoom/pan controls reuse.

7. **Architecture review open question #2** (LEFT-to-RIGHT vs TOP-to-BOTTOM for flow mode) — this spec adopts LEFT-to-RIGHT for all modes. If the decision is reversed for the flow mode, the DiagramTitleBar mode label is the only text that would need updating. Shape, connector, and layout specs are direction-agnostic.
