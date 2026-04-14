# Process Map Visualization Strategy

**Status:** Canonical — supersedes informal assumptions about diagram rendering  
**Author:** UX Designer  
**Date:** 2026-04-14  
**Audience:** Engineering, product, QA  
**Upstream artifacts read:**
- `docs/process-map-sop-standard.md`
- `docs/10-product/ledgerium_ui_ux_visualization_spec.md`
- `docs/10-product/ledgerium_ui_ux_specification.md`
- `apps/web-app/src/components/workflow-view/` (current implementation)

---

## Executive Summary

The current "Flow Intelligence Map" (three modes: flow, variants, systems) is built on
@xyflow/react and already has sound bones. The core problem the founder has identified
is real: the primary flow mode shows a **vertical node chain** that is labeled a
swimlane but does not behave as one. Phase groups are rendered as background overlays
behind a single column of nodes, not as distinct horizontal or vertical lanes that
spatially separate actors or systems.

This document defines:
1. What the taxonomy of process visualizations is and when each applies to Ledgerium data
2. Why @xyflow/react remains the right library (and why Mermaid.js is wrong for this use case)
3. A concrete recommendation: four named view modes replacing the current three
4. What a true swimlane layout requires structurally
5. The visual design principles that make maps shareable and trustworthy

---

## 1. Process Map Taxonomy

### 1.1 Simple Flowchart

**What it is:** Nodes connected by directional edges, left-to-right or top-to-bottom.
No lanes. No actor separation.

**When appropriate:** Single-actor, single-system workflows. Quick overview. Exploratory
reading. Works when the reader only needs to understand sequence, not responsibility.

**Ledgerium applicability:** Valid for the "Flow Intelligence Map" (current flow mode)
when a workflow is single-system. Inadequate as the only representation for multi-actor
or multi-system workflows because it loses the cross-functional story entirely.

---

### 1.2 Swimlane Diagram (Cross-Functional Flowchart)

**What it is:** A flowchart partitioned into horizontal or vertical bands (lanes). Each
lane represents one actor, role, or system. Nodes sit inside the lane that owns that
step. Edges crossing lane boundaries represent handoffs.

**What makes it a real swimlane (not just labeled regions):**
- Nodes are spatially confined within their lane
- The lane boundary is a visual constraint, not a decoration
- Handoff edges cross the lane divider visually, making handoffs obvious at a glance
- A reader can scan one lane in isolation and see that actor's full workload

**When appropriate:** Any workflow involving more than one system, role, or team.
This is the most common format in enterprise process documentation because it answers
"who does what" at a glance.

**Ledgerium applicability:** High. Most recorded workflows touch 2-4 systems (Salesforce,
SAP, email, internal portals). The Systems topology view already identifies these
boundaries. A swimlane layout would surface the cross-system story inside the primary
diagram rather than requiring a mode switch.

---

### 1.3 BPMN 2.0 Diagrams

**What it is:** A standardized notation with specific shapes for tasks, events,
gateways (XOR, AND, OR), pools, and swimlanes. ISO 19510 compliant. The format
enterprise architects and process consultants recognize natively.

**When appropriate:** Formal process documentation. BPM platform exports. Compliance
and audit contexts. When a client needs to import the diagram into a BPM tool.

**Ledgerium applicability:** Medium-term. Not needed for MVP product experience but
required for "formal export" use cases. bpmn.io / bpmn-js is the standard renderer
for web. BPMN is output-format territory, not primary viewing territory.

---

### 1.4 Value Stream Maps

**What it is:** Lean manufacturing notation showing material and information flow,
with time ladders below each step showing process time vs. wait time.

**When appropriate:** Manufacturing, logistics, supply chain. Cycle-time waste
identification.

**Ledgerium applicability:** Low. Ledgerium captures digital workflows. Value stream
notation does not align with UI interaction data. The closest analog Ledgerium already
covers through bottleneck detection and friction scoring — without the VSM notation.

---

### 1.5 Sequence Diagrams

**What it is:** Time-ordered interaction between actors shown as vertical lifelines
with horizontal arrows between them. UML standard.

**When appropriate:** API interactions, system-to-system integration flows,
developer documentation.

**Ledgerium applicability:** Low for primary UX. Potentially useful as a secondary
technical export for developers analyzing system integration opportunities. Not a
primary view mode.

---

### 1.6 State Machines

**What it is:** States as nodes, transitions as edges with trigger labels.
Object-oriented. Represents the lifecycle of one entity.

**When appropriate:** User account status, order status, ticket lifecycle.

**Ledgerium applicability:** Low. Ledgerium captures user activity sequences, not
entity state transitions. Friction detection and decision nodes partially cover this
territory, but the notation does not fit.

---

### 1.7 Sankey / Flow Diagrams

**What it is:** Flow widths proportional to volume/frequency. Shows where work
splits and merges.

**When appropriate:** Multi-run aggregated data. Variant frequency analysis.
"Where do most runs go wrong" visualizations.

**Ledgerium applicability:** Medium-future. Currently Ledgerium is single-run.
Once multi-run aggregation is implemented (a documented future extension in
`process-map-sop-standard.md`), a Sankey variant frequency view would be
powerful. Not for Phase 1.

---

## 2. Library Comparison for Web Rendering

### 2.1 Mermaid.js

**What it does:** Text-to-diagram rendering via a declarative syntax. Renders to SVG.
Supports flowchart, sequence, gantt, pie, and basic swimlane ("swimlane" subgraph).

**Pros:**
- Zero-dependency string output (trivial to generate from LLM or template)
- Embeds easily in markdown, Notion, GitHub
- Correct for lightweight share contexts where interactivity is not needed
- Good for developer documentation

**Cons — disqualifying for Ledgerium primary use:**
- No meaningful interactivity (click handlers, selection state, inspector panels)
- Swimlane support is limited; "subgraph" is not a true lane — it is a group box
- Layout engine is a Dagre fork with limited tunability; cannot guarantee node
  placement quality on complex graphs
- Custom node styling is severely constrained (node shape + fill only)
- Cannot render friction indicators, confidence dots, decision icons, or duration
  chips inside nodes without hacking the SVG post-render
- No inspector panel architecture possible
- Cannot zoom/pan programmatically to support the toolbar controls Ledgerium
  already has
- Performance degrades visibly on graphs with 15+ nodes

**Verdict:** Mermaid is appropriate as a **secondary export format** — generate
a Mermaid representation for embedding in Notion, sharing in Slack, or API consumers.
It is not appropriate as the primary interactive diagram renderer.

---

### 2.2 @xyflow/react (React Flow)

**What it does:** A React-first node-edge diagram library. Handles rendering,
pan/zoom, selection, minimap, and custom node/edge components via React.

**Pros:**
- Already in Ledgerium's dependency tree at v12.10.1
- Custom node rendering via React components: Ledgerium already has WorkflowTaskNode,
  WorkflowDecisionNode, WorkflowTerminalNode with full design system styling
- Full interactivity: click, selection, hover, inspector panel integration
- Pan, zoom, fit-view, minimap — all already implemented
- Phase group background overlays already built
- Arbitrary layout possible via layout engine (currently positional via viewModel)
- No additional bundle weight (already installed)
- Active development, good documentation

**Cons:**
- Does not have a native swimlane layout concept; swimlanes require a custom
  layout algorithm to position nodes in column/row slots per lane
- BPMN shapes not native (would need custom node types or SVG shapes)
- Layout computation is manual (Dagre or ELK.js can compute positions; current
  implementation uses ordinal-based vertical positioning)

**Verdict:** @xyflow/react is the correct and only necessary library for all
interactive diagram modes. The missing capability (true swimlane layout) is a
layout algorithm problem, not a library problem.

---

### 2.3 Dagre (dagre-d3 / @dagrejs/dagre)

**What it is:** A graph layout engine that computes node positions for directed
acyclic graphs.

**Current state:** Not yet in Ledgerium dependencies. Position calculation is
currently done manually in viewModel via ordinal-based y-position.

**Recommendation:** Add `@dagrejs/dagre` (or the maintained fork `@xyflow/react`
recommends: `elkjs` for complex layouts). Use it in the flowAdapter to compute
positions automatically instead of manual ordinal placement. This is especially
important for the swimlane layout, where nodes must be placed within lane bands.

---

### 2.4 ELK.js (Eclipse Layout Kernel)

**What it is:** A more powerful layout engine than Dagre, supporting hierarchical
layouts, swimlane algorithms, orthogonal edge routing, and layered layouts.

**Pros over Dagre:** Handles swimlane layouts natively, produces cleaner edge routing
for complex graphs, configurable algorithms (layered, force, box, etc.).

**Cons:** ~2MB bundle weight, async API (layout computation is async), more complex
configuration.

**Verdict:** ELK.js is the right choice if Ledgerium pursues a true swimlane layout
with horizontal lanes and proper edge routing. The async overhead is acceptable for
a diagram that loads once per page view.

---

### 2.5 bpmn-js (bpmn.io)

**What it is:** Full BPMN 2.0 editor and renderer.

**Recommendation:** Use only as an export-side concern. When users request BPMN
export, serialize Ledgerium's process map into BPMN 2.0 XML and provide a downloadable
`.bpmn` file. Do not embed bpmn-js as an interactive viewer in the primary product —
the bundle is heavy (~500KB), the API is opinionated, and the rendering aesthetic
does not match Ledgerium's design system.

---

### 2.6 D3.js

**Verdict:** Skip. Total implementation effort for a production-grade interactive
diagram in D3 is 6-10x more than @xyflow/react for equivalent output. No advantage
in this context.

---

### 2.7 GoJS

**Verdict:** Commercial license ($1,400+/developer/year). Mature but expensive and
creates a vendor dependency. The @xyflow/react solution covers all required capabilities
without the cost or lock-in.

---

## 3. Recommendation

### Primary library: @xyflow/react (already installed, keep)

### Layout engine to add: ELK.js for swimlane mode, Dagre for basic flow mode

**Rationale for adding ELK.js:** The current flowAdapter uses manual ordinal-based
y-positioning (sequential vertical stack). This is readable for linear flows but:
- Produces poor layouts for branching paths (exception edges go to the side, decision
  nodes have two outputs, but both outputs stack vertically)
- Cannot produce proper swimlane bands without lane-aware position computation
- Does not handle parallel paths at all

ELK's `layered` algorithm with `LAYERED` strategy handles these cases correctly.

### Secondary format: Mermaid.js for export only

Add a `toMermaid(processMap)` serializer that converts the Ledgerium process map
structure to Mermaid flowchart syntax. This enables:
- Notion / Confluence embedding
- Slack previews
- API consumers who need text-based diagrams
- GitHub README embedding

This serializer lives in the process-engine package, not the web app.

---

## 4. Four View Modes (Replacing Current Three)

The current three modes are: `flow` | `variants` | `systems`

**Recommended: four modes:** `flow` | `swimlane` | `systems` | `variants`

---

### Mode 1: Flow Intelligence Map (existing, enhanced)

**Label in UI:** "Flow Map"  
**Icon:** Workflow (current)

**What it shows:**
Sequential process flow as a top-to-bottom node-edge diagram. Phase groups
appear as labeled background regions. This is the default view and the first
thing users see.

**Data it emphasizes:**
- Step sequence and categories
- Decision points and exception paths
- Per-step friction indicators and duration
- Phase/system grouping via background regions

**When to use it:**
Overview of any workflow. Single-system workflows. Reading the process narrative.

**Current gaps to fix:**
- Decision nodes should visually branch (two outbound edges going to different
  columns, not stacking vertically)
- Exception path edges should use a dashed red style and route to the side, not
  through the normal vertical flow
- Phase group label should appear at the top edge of the region, not obscured by nodes
- Layout should use Dagre or ELK to compute positions rather than ordinal stacking
  so that branching flows render correctly

**Rough layout:**
```
[Start node]
     |
[Step 1 — Navigation]          ← phase group A background begins
     |
[Step 2 — Data Entry]
     |
[Step 3 — Form Submit]  ----decision edge---- [Exception path node]
     |  (accepted)
[Step 4]                                      ← phase group B background begins
     |
[End node]
```

---

### Mode 2: Swimlane Map (new mode — the key gap)

**Label in UI:** "Swimlane"  
**Icon:** Columns (or Table2 from lucide)

**What it shows:**
The same process steps laid out in horizontal lanes, one lane per system or role.
Steps are positioned within their lane. Edges crossing lane boundaries show handoffs.

**Data it emphasizes:**
- Which system/role owns each step
- Cross-system handoffs (the crossing edges)
- Volume of work per lane (step count, time share)
- Parallel paths within phases

**When to use it:**
Multi-system workflows (most real workflows). Communicating process to managers
and cross-functional teams. Identifying where handoffs create friction.

**What makes this a true swimlane (not the current fake version):**

1. Lanes are visually distinct horizontal bands with a background color per lane
2. Each lane has a header on the left side: system name, step count, time share
3. Node positions are constrained to their lane's y-band
4. Handoff edges that cross from one lane to another are styled distinctly
   (bold, colored, with a handoff indicator icon at the crossing point)
5. A reader can read one lane in isolation to understand that system's workload
6. Lane height is proportional to the number of steps in that lane (minimum height applies)

**Lane assignment rule:**
Lane assignment = `ViewNode.system` (already derived in the view model from
`DerivedStep.page_context.applicationLabel`). This field is non-null with a
fallback of "Unknown System". Each unique system value becomes one lane.

**Layout algorithm:**
Use ELK.js with the `layered` algorithm. Configure lane bands by setting
node y-positions to the center of their lane band. ELK handles horizontal
node ordering within each lane to minimize edge crossings.

**Rough layout:**
```
LANE HEADER          |  LANE CONTENT
─────────────────────┼──────────────────────────────────────────────
Salesforce CRM       │  [Navigate to Leads] → [Enter Lead Data] → [Submit Form]
Steps: 4  · 8m 30s   │
─────────────────────┼──────────────────────────────────────────────
                     │           ↓ handoff (bold crossing edge with label)
─────────────────────┼──────────────────────────────────────────────
SAP ERP              │              [Open PO Module] → [Enter PO Data] → [Submit PO]
Steps: 3  · 5m 10s   │
─────────────────────┼──────────────────────────────────────────────
                     │                             ↓ handoff
─────────────────────┼──────────────────────────────────────────────
Email Client         │                                    [Send Confirmation]
Steps: 1  · 45s      │
```

**Handoff indicator:**
When an edge connects a node in lane A to a node in lane B, render a small
handoff badge at the point where the edge crosses the lane divider.
Badge content: arrow icon + "Handoff" label. Color: violet-600 (matching the
existing handoff color in WorkflowSystemsMap).

**Empty state:**
If the workflow has only one system, show a contextual message:
"This workflow runs entirely within [System Name]. Swimlane view is most useful
for cross-system workflows."
Below the message, render the Flow Map as a fallback.

---

### Mode 3: System Interaction Map (existing, minor enhancements)

**Label in UI:** "Systems" (current)  
**Icon:** Monitor (current)

**What it shows:**
Network topology of systems involved. Which systems connect. Handoff timeline.
Friction signals from context switching.

**Current implementation status:** Already well-built. Minor gaps:
- System nodes in the network diagram are click-navigable but do not clearly
  communicate that clicking opens the detail panel (no cursor: pointer affordance
  visible on the cards)
- The "Single-system workflow" empty state message is appropriate
- The handoff timeline section should link edge clicks to the step in the flow map
  (cross-mode navigation)

**No major changes needed.**

---

### Mode 4: Variant Paths (existing, keep)

**Label in UI:** "Variants" (current)  
**Icon:** GitBranch (current)

**What it shows:** Alternative execution sequences.

**Current implementation status:** Acceptable. Future enhancement when multi-run
aggregation lands: replace the step-chip list with an actual Sankey or branching
flow diagram showing variant frequency as edge weight.

**No changes needed for now.**

---

### Mode order in the switcher

Recommended order: `Flow Map` | `Swimlane` | `Systems` | `Variants`

Flow Map is the default and the simplest. Swimlane is the power view for
cross-functional analysis. Systems is the topology view. Variants is specialized.

---

## 5. True Swimlane Design — Structural Requirements

This section is implementation guidance for the swimlane adapter.

### 5.1 Data requirements

The swimlane adapter needs from the NormalizedViewModel:
- `graph.nodes` — each with `system` (lane assignment), `ordinal` (ordering within lane),
  `position` (to be replaced by swimlane layout), and all display properties
- `graph.edges` — each with source/target (to detect cross-lane edges)
- `graph.phases` — to extract system labels and colors
- `graph.systems` — to get per-system step count and duration

All of these exist in the current NormalizedViewModel. No schema changes needed.

### 5.2 Lane computation algorithm

```
1. Collect unique systems from graph.nodes, excluding terminal nodes (start/end)
   Systems maintain their order of first appearance (preserves chronological flow)

2. Assign each system a lane index (0, 1, 2...)

3. Compute lane bands:
   LANE_HEADER_WIDTH = 180px
   NODE_WIDTH = 280px (existing constant)
   LANE_MIN_HEIGHT = 120px
   LANE_PADDING_V = 24px

   For each lane:
     stepCount = nodes in this lane
     laneHeight = max(LANE_MIN_HEIGHT, ceil(stepCount / COLUMNS_PER_LANE) * (NODE_HEIGHT + V_GAP) + LANE_PADDING_V * 2)
     laneY = sum of heights of all previous lanes

4. Position nodes within their lane:
   Nodes in the same lane are ordered by ordinal
   Place them left-to-right in the lane's y-band
   Multiple nodes per row allowed (max 3 per row) — ELK handles this

5. Detect cross-lane edges:
   edge is a handoff if sourceNode.system !== targetNode.system
   Store this on the edge as viewEdge.isHandoff = true
   The edge type in the flow adapter maps to a new 'handoffEdge' type
```

### 5.3 Lane header component

A new `SwimlaneLaneHeader` component renders in the left column.

```
Width: 180px (matches LANE_HEADER_WIDTH)
Height: matches the lane band height
Background: lane color at 4% opacity (same as existing phase group overlay logic)
Left border: 3px solid lane color at 60% opacity
Content (vertically centered):
  - System name (text-sm font-semibold)
  - Step count chip (text-[10px])
  - Duration (text-[10px] text-gray-500)
  - Time share bar (4px tall, full width, lane color fill)
```

### 5.4 Handoff edge component

A new `HandoffEdge` extends the existing `WorkflowEdge`. Additional rendering:
- Stroke: violet-400, strokeWidth: 2, strokeDasharray: none
- Mid-point badge: position at 50% of edge length
  - Small pill: "Handoff" text, violet-50 bg, violet-600 text, 8px border-radius
  - Only shown when toolbar.showLabels is true (follows existing toggle)
- Arrow head: violet-500 (existing color system)

### 5.5 Parallel paths

If two nodes in the same lane have the same ordinal (parallel execution), position
them in the same horizontal row at different x positions. ELK handles this via
its `LAYERED` algorithm which supports concurrent layers.

### 5.6 Decision nodes in swimlane view

Decision nodes (nodeType === 'decision') remain in their home lane. The two outbound
edges branch within the same lane (accepted path) or cross to the next lane
(exception path). The exception edge uses the handoff styling even if it stays
within the same lane, because it represents a non-standard path.

---

## 6. Visual Design Principles for Best-in-Class Process Maps

This section defines what "beautiful" means for Ledgerium diagrams specifically —
tied to usability, not aesthetics for its own sake.

### 6.1 Node design (current state is good — keep and refine)

The current WorkflowTaskNode design is solid:
- 280px wide, 12px border-radius
- Category accent color as border
- Ordinal badge + category label + duration in the header row
- Title in the body (2-line clamp)
- System chip + indicator icons in the footer

**Refinements needed:**
- The node height should be fixed (currently varies with content). Fix at 88px for
  task nodes, 56px for terminal nodes, 72px for decision nodes. Consistent heights
  allow ELK to produce correct layouts without height estimation errors.
- Add a subtle inner shadow on selected state (existing glow ring is correct; add
  `inset 0 1px 3px rgba(0,0,0,0.04)` as well for depth)
- Decision nodes should use a diamond or chevron shape (the current WorkflowDecisionNode
  already exists — verify it uses a diamond shape, not a rectangle with different color)
- Friction indicator icons (AlertTriangle) should have a tooltip with the friction type,
  not just "Bottleneck detected". Already has aria-label; add a visible tooltip on hover.

### 6.2 Edge design

**Normal sequence edges:** Thin (1.5px), gray-300, animated SVG markerEnd arrow.
**Exception edges:** Dashed (4px dash, 2px gap), red-400, markerEnd arrow.
**Handoff edges (swimlane mode):** Solid, violet-400, 2px, with mid-point handoff badge.
**Decision edges:** Label visible ("Accepted" / "Validation failed") — already in the
process map standard. Ensure the WorkflowEdge component renders edge labels.

**Edge routing:** ELK's `ORTHOGONAL` edge routing produces cleaner diagrams than the
default curved edges React Flow provides. Straight orthogonal edges with 90-degree
bends read more professionally in swimlane diagrams. Implement via ELK routing option
when in swimlane mode. Keep curved edges in flow mode (softer, more approachable).

### 6.3 Color system

Follow the existing design system. Per-category accent colors are already defined
in `CATEGORY_STYLES` in the constants file. Reinforce:

| Step category | Node accent color | Rationale |
|---|---|---|
| click_then_navigate | teal-500 | Navigation = movement |
| fill_and_submit | blue-500 | Forms = primary work |
| data_entry | violet-500 | Data = information |
| send_action | emerald-500 | Completion = success |
| file_action | amber-500 | Caution = attachments |
| error_handling | red-500 | Error = danger |
| annotation | purple-500 | Notes = supplementary |
| start / end | gray-400 | Terminal = neutral |
| decision | orange-500 | Decision = choice |

Lane colors in swimlane mode: use the phase color already assigned in `ViewPhase.color`.
This ensures color consistency between the phase timeline in the workflow report
and the swimlane lanes.

### 6.4 Typography on nodes

- Node title: 12px, font-medium (current) — correct
- Category label: 8px, uppercase, bold — at the limit of legibility; do not go smaller
- Duration: 10px, tabular-nums — correct
- System chip: 9px — correct
- Ordinal badge: 10px, bold — correct

Do not add more text rows to nodes. Three rows is the maximum before nodes become
unreadable at zoom levels users typically use (0.6x to 1.2x).

### 6.5 Canvas background

Current: dot grid pattern in gray-200, surface-secondary background. This is correct.
In swimlane mode, the lane bands replace the open canvas — the dot grid should only
appear in the areas outside the swimlane layout bounds (padding areas), not inside
lane bands.

### 6.6 Status indicators on nodes

These must be visible at a glance without opening the inspector:

| Signal | Visual treatment | Location on node |
|---|---|---|
| Bottleneck (high friction) | AlertTriangle icon, red-500, 12px | Bottom-right of node |
| Decision point | Zap icon, amber-500, 12px | Bottom-right of node |
| Low confidence | 6px amber dot | Bottom-right, leftmost |
| Sensitive data | Shield icon, blue-500, 12px | Bottom-right of node |
| Exception path | Red dashed border on entire node | Node border |

**Do not stack icons** — if a node has 3+ indicators, show the highest-severity one
and a "+N" badge that expands on hover to show all indicators.

### 6.7 Subtle interaction animations

These are the animations that make the diagram feel alive without being distracting:

| Interaction | Animation |
|---|---|
| Node hover | border opacity transitions from 15% → 100% of accent color, 150ms |
| Node selection | Box shadow expands, border goes full accent color, 150ms |
| Inspector panel open | Panel slides in from right, 200ms ease-out (already implemented) |
| Mode switch | Canvas fades out at 0.3 opacity, new layout fades in, 200ms |
| Fit view | React Flow's built-in fitView with duration: 300ms (already implemented) |
| Handoff badge appear | Scale-in from 0.8x to 1x, 150ms on hover over edge |

No bouncing. No spring physics. No particles.

### 6.8 Light / dark theme support

The current web app has a ThemeToggle component and CSS variable system.
Process map nodes use CSS variables (`var(--surface-secondary)`, `var(--content-primary)`)
for backgrounds and text. Ensure:
- Node background uses `var(--surface-elevated)` in dark mode
- Node text uses `var(--content-primary)` (already done)
- Phase group overlays use `color + '06'` opacity (already done — the low opacity
  works in both themes)
- Canvas dot grid color inverts: use `var(--border-subtle)` not hardcoded `#e2e8f0`
  (this is currently hardcoded in WorkflowCanvas.tsx — fix this)
- Inspector panel uses CSS variables throughout (already the case)

### 6.9 What makes a diagram shareable

The process map is the artifact users share externally. That means:

1. **No clutter above the diagram.** When a workflow is opened via a share link
   (`/share/[token]`), the toolbar and mode switcher should still be present but
   the app chrome (nav sidebar, account header) should be absent. The diagram
   should fill most of the viewport.

2. **The default view on share links should be swimlane mode** (once implemented)
   because it communicates the most process intelligence at a glance to someone
   who has never seen Ledgerium before.

3. **Export to PNG / SVG.** React Flow supports `toSvg()` and `toJpeg()` via the
   `@xyflow/react` instance. Expose a "Download diagram" button in the toolbar that
   calls `reactFlowInstance.toSvg()` and triggers a download. This is a one-session
   effort and removes the need to explain how to screenshot the diagram.

4. **Mermaid text export.** A "Copy as Mermaid" button in the export dropdown
   generates a text representation. This lets users paste into Notion, Confluence,
   and GitHub without needing Ledgerium access.

---

## 7. Implementation Priorities

Work is sequenced by user impact, not technical interest.

### Priority 1 — Fix the current Flow Map layout (1-2 days)

The existing flow mode is good but has layout quality issues.

- Replace manual ordinal y-positioning in `viewModel.ts` with Dagre layout
- Decision nodes must produce two outbound edges that visually branch (not both
  going straight down)
- Exception edges must route to the side or below the main path, not overlap it
- Phase group labels must not be obscured by nodes (z-index issue in current overlay)
- Fix hardcoded canvas dot grid color (`#e2e8f0` → `var(--border-subtle)`)
- Fix decision node shape: ensure WorkflowDecisionNode uses a visual diamond/chevron
  shape, not a rectangle that differs only by color

**Acceptance criteria:**
- A 10-step flow with one decision point renders the decision's two outgoing paths
  visually side by side
- Exception path edge is visually dashed/red and routes to the side
- Phase group label is visible at the top of the region without being covered by a node

---

### Priority 2 — Add the Swimlane mode (3-5 days)

This is the highest-value new capability. It makes Ledgerium genuinely best-in-class
for cross-functional process maps.

**Tasks:**
- Add ELK.js as a dependency
- Create `apps/web-app/src/components/workflow-view/adapters/swimlaneAdapter.ts`
  - Input: NormalizedViewModel
  - Output: FlowNode[] with lane-aware positions, FlowEdge[] with isHandoff flag,
    SwimlaneLane[] with position and metadata
- Create `SwimlaneLaneHeader` component (renders in the left column, 180px wide)
- Create `HandoffEdge` component extending WorkflowEdge
- Create `WorkflowSwimlaneCanvas` as a new canvas variant
- Add `swimlane` to the `WorkflowViewMode` type
- Add Swimlane option to WorkflowModeSwitcher
- Handle single-system empty state in swimlane mode

**Acceptance criteria:**
- A 3-system workflow renders as 3 horizontal bands with correct lane headers
- Edges crossing between lanes have the handoff badge
- A single-system workflow shows the informational fallback message
- Clicking a node in swimlane mode opens the same inspector panel as flow mode
- Toolbar toggles (labels, metrics, minimap) work the same as in flow mode
- Export to PNG from swimlane mode produces a correct image

---

### Priority 3 — PNG / SVG export from diagram (0.5 days)

- Add `reactFlowInstance.toSvg()` call on a "Download diagram" button in WorkflowToolbar
- Filename: `[workflow-title]-process-map.svg`
- Also provide `toJpeg()` for PNG download
- Both options in a compact dropdown below the existing toolbar controls

---

### Priority 4 — Mermaid export serializer (1 day)

- Add `toMermaidFlowchart(processMap: ProcessMap): string` to the process-engine package
- Output: valid Mermaid flowchart syntax with LR or TD direction
- Include phase subgraphs
- Include node labels and edge labels
- Expose "Copy as Mermaid" in the web app export dropdown

---

### Priority 5 — BPMN export (future, not now)

Defer until there is explicit customer demand for BPM tool integration.
When the time comes: use bpmn-js on the server side only (Node.js) to serialize
ProcessMap to BPMN 2.0 XML. Do not add bpmn-js to the web app bundle.

---

## 8. What Not to Do

These are explicit anti-patterns for process map visualization in Ledgerium.

- **Do not use Mermaid as the primary diagram renderer.** It cannot support the
  inspector panel, selection state, or interactivity that makes the diagram useful.
  Use it only for text export.

- **Do not add BPMN.js to the web app bundle.** It is too heavy and too opinionated.
  BPMN is an export format, not a viewing format for Ledgerium's primary UX.

- **Do not implement swimlanes as background overlays only.** The current fake-swimlane
  is exactly this problem. Real lanes constrain node positions. Overlays do not.

- **Do not add more than four view modes.** The mode switcher already has three.
  Adding the swimlane mode brings it to four. Beyond four modes, the switcher
  becomes a navigation problem, not a visualization feature.

- **Do not animate layout transitions when switching modes.** Node positions change
  completely between modes. Animating individual nodes to new positions creates visual
  chaos. Instead: fade the canvas out, swap the layout, fade in.

- **Do not make nodes taller than 100px.** At zoom levels users actually use in
  the canvas, a taller node means fewer nodes are visible simultaneously. Three rows
  of content is the maximum a node should carry. Detail belongs in the inspector panel.

---

## 9. Connecting This to Existing Architecture

### How this maps to current components

| This document | Current file |
|---|---|
| Flow Map (enhanced) | `WorkflowCanvas.tsx` + `flowAdapter.ts` |
| Swimlane Map (new) | New: `WorkflowSwimlaneCanvas.tsx` + `swimlaneAdapter.ts` |
| System Map | `WorkflowSystemsMap.tsx` (existing, minor fixes) |
| Variant Map | `WorkflowVariantsMap.tsx` (existing, no changes) |
| View mode type | `types.ts` — add `'swimlane'` to `WorkflowViewMode` |
| Mode switcher | `WorkflowModeSwitcher.tsx` — add Swimlane option |
| Shell | `WorkflowPageShell.tsx` — add mode === 'swimlane' branch |

### What data fields drive lane assignment

```
ViewNode.system
  ← derived from DerivedStep.page_context.applicationLabel
  ← captured in CanonicalEvent.page_context.applicationLabel
  ← inferred from URL + page title in the recorder
```

This is a deterministic, already-populated field. No new capture or inference needed.

### Where friction indicators live on nodes

```
ViewNode.frictionIndicators[]   → AlertTriangle icon on WorkflowTaskNode
ViewNode.hasHighFriction        → red border on WorkflowTaskNode
ViewNode.isDecisionPoint        → Zap icon on WorkflowTaskNode
ViewNode.isLowConfidence        → amber dot on WorkflowTaskNode
ViewNode.hasSensitiveData       → Shield icon on WorkflowTaskNode
```

All of these already exist in the ViewNode interface and are already rendered
in WorkflowTaskNode. The "do not stack icons" rule (section 6.6) is a new
constraint on the renderer.

---

## 10. Assumptions and Open Questions

**Assumption 1:** ELK.js async layout computation is acceptable for the swimlane
adapter. A loading state (skeleton canvas with lane outlines) should be shown
while ELK computes positions. This is typically under 200ms for graphs of the
size Ledgerium generates.

**Assumption 2:** Lane assignment is always `ViewNode.system`. If role-based lanes
(per-person assignments) are ever required, the swimlaneAdapter would need a second
lane-type configuration. This is not in scope but the adapter should accept a
`laneBy: 'system' | 'role'` parameter for future use.

**Assumption 3:** The share link default view should be swimlane mode, not flow mode.
This should be confirmed by the product owner before implementation because it
changes the first impression for all shared links.

**Open question:** Should the swimlane view be available on the share page before
it is available in the authenticated app? The share page is where external viewers
(managers, clients) see the diagram — arguably the highest-value surface for swimlane.
Engineering should clarify which route gets the feature first.
