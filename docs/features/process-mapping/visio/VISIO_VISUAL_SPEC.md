# Visio-Grade Visual Spec — Ledgerium Process Maps

**Date:** 2026-06-11
**Author:** UX Designer (read-only on product code)
**Upstream artifacts read:** MAP_DESIGN_SPEC.md, LAYOUT_PLAN.md, WorkflowTaskNode.tsx, WorkflowDecisionNode.tsx, WorkflowTerminalNode.tsx, WorkflowEdge.tsx, WorkflowCanvas.tsx, WorkflowSwimlaneCanvas.tsx, constants.ts, viewModel.ts, flowAdapter.ts, swimlaneAdapter.ts
**Builds on:** MAP_DESIGN_SPEC.md P0–P2 punch-list (all items already spec'd there are NOT re-done here — this spec adds Visio-grade structure on top)
**Goal:** Make the diagrams read as a Visio cross-functional flowchart at first glance — orthogonal connectors, proper BPMN/flowchart shape vocabulary, swimlane headers, grid alignment, print-ready white background, and business-document typography.
**Constraint:** Read-only. No product code is modified by this document.

---

## How to Read This Document

MAP_DESIGN_SPEC.md fixed the legibility baseline (P0–P2 listed there).  
This spec adds the **structural visual grammar** that makes a diagram read as "professional flowchart" rather than "app screenshot":

1. **Shape vocabulary** — correct BPMN/Visio shapes, not styled rectangles
2. **Orthogonal connectors** — right-angle elbows with closed arrowheads and frequency-coded strokes
3. **Swimlane structure** — Visio cross-functional layout with real lane headers
4. **Grid + canvas** — snap grid, generous whitespace, print-ready white field, title block
5. **Color + typography** — tightened CATEGORY_STYLES, business-document type scale
6. **Honesty constraint** — decision shapes show observed data only, never inferred conditions

---

## 1. Shape Vocabulary

### 1.1 Design Benchmark

Visio cross-functional flowchart shapes and BPMN shape conventions:

| Shape | Visio / BPMN name | When to use |
|-------|-------------------|-------------|
| Filled-end pill / stadium | Terminator (ISO 5807) | Start and End |
| Rectangle with sharp or slightly rounded corners | Process box | All task steps (Navigation, Form Submit, Data Entry, etc.) |
| True diamond (rotated square) | Decision gateway (BPMN XOR gateway, ISO 5807 decision) | Observed branch points |
| Parallelogram (optional) | Data / IO | System-generated or data-import steps |
| Rounded-corner box | Sub-process (BPMN) | Currently unused — reserved for Phase C+ |

The critical gap in the current code is the task node. It uses `borderRadius: 10` (a noticeably rounded card). Visio process boxes have `borderRadius: 3–4px` — barely-visible rounding. The rounded-card look reads as "app UI card"; the sharper process box reads as "flowchart step". This is the single highest-leverage shape change.

### 1.2 Shape → ViewNodeType Mapping

| `ViewNodeType` | Target shape | Geometry | Notes |
|---|---|---|---|
| `start` | Stadium / pill | `width: 160, height: 44, borderRadius: 22` | Green-filled pill. Play icon. ✓ MAP_DESIGN_SPEC has this right. |
| `end` | Stadium / pill | `width: 160, height: 44, borderRadius: 22` | Gray-filled pill. Square icon. ✓ MAP_DESIGN_SPEC has this right. |
| `task` | Process rectangle | `width: 260, minHeight: 72, borderRadius: 3` | **Key change: reduce borderRadius from 10 → 3.** See §1.3. |
| `exception` | Process rectangle + red accent | Same dimensions as task | Red accent rail (#b91c1c). Same borderRadius: 3. |
| `decision` | True diamond | `160×160 inner square rotated 45deg, borderRadius: 8` | ✓ MAP_DESIGN_SPEC + current code have this right. |

### 1.3 WorkflowTaskNode — Visio Process Box

**File:** `apps/web-app/src/components/workflow-view/nodes/WorkflowTaskNode.tsx`

**The one change from MAP_DESIGN_SPEC that makes it read as Visio:**
```tsx
// Change FROM (current, after MAP_DESIGN_SPEC P1 applied):
borderRadius: 10

// Change TO (Visio process box):
borderRadius: 3
```

Every other dimension from MAP_DESIGN_SPEC §1.2 is correct. The left-rail 4px accent stays. Width 260 stays. The combination of:
- `borderRadius: 3` (sharp corners = flowchart box)
- `borderLeft: 4px solid accentColor` (category signal)
- `background: white` with 6% tint (clean field)
- No drop shadow in print

…produces an exact visual match to a Visio process box with a category-colored left rail.

**Handle anchor points for orthogonal routing (Section 2 depends on these):**

All four cardinal handles must be present on task nodes to support right-angle elbow routing. Currently only Top (target) and Bottom (source) handles exist. Add Left and Right:

```tsx
// TOP — incoming connector
<Handle type="target" position={Position.Top}
  style={{ width: 10, height: 10, background: '#ffffff', border: `2px solid ${n.accentColor}`, top: -5 }} />

// BOTTOM — outgoing connector (primary, sequence flow)
<Handle type="source" position={Position.Bottom} id="bottom"
  style={{ width: 10, height: 10, background: '#ffffff', border: `2px solid ${n.accentColor}`, bottom: -5 }} />

// RIGHT — outgoing connector (decision branch going right, same-lane forward)
<Handle type="source" position={Position.Right} id="right"
  style={{ width: 10, height: 10, background: '#ffffff', border: `2px solid ${n.accentColor}`, right: -5 }} />

// LEFT — incoming from left (same-lane, after swimlane adapter routes horizontally)
<Handle type="target" position={Position.Left} id="left"
  style={{ width: 10, height: 10, background: '#ffffff', border: `2px solid ${n.accentColor}`, left: -5 }} />
```

**Why four handles:** In the swimlane view (§3), nodes flow left-to-right within a lane. The current bottom/top-only handles force every connector to go up-out then down-in, which is incorrect for horizontal flow. Right-to-left handles enable proper same-lane sequence flow connectors.

**Selected state:**
```tsx
// Selected: visible selection ring (Visio-like focus outline)
boxShadow: selected
  ? `0 0 0 2px #ffffff, 0 0 0 4px ${n.accentColor}`  // white gap + colored ring
  : '0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
```
The white-gap + colored-ring pattern is how Visio, LucidChart, and Figma show selection — legible at all zoom levels.

**Hover state:**
```tsx
// Hover: border deepens, shadow lifts
// Applied via group-hover:
border: `1px solid ${n.accentColor}60`  // 38% opacity — visible but not garish
boxShadow: '0 4px 12px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)'
```

### 1.4 WorkflowDecisionNode — True Diamond

**File:** `apps/web-app/src/components/workflow-view/nodes/WorkflowDecisionNode.tsx`

MAP_DESIGN_SPEC §1.3 and the current code both have the rotated-container diamond correct. Two Visio-specific additions:

**1. Chamfer radius matches Visio exactly:**
BPMN XOR gateways in Visio use `borderRadius: 0` (sharp diamond corners). The current `borderRadius: 16` produces softened corners that look like a "squircle diamond". For Visio accuracy:
```tsx
// Change FROM:
borderRadius: 16

// Change TO (sharp BPMN diamond):
borderRadius: 4
// 4px = just enough to prevent pixelated aliasing at sharp corners, reads as sharp
```

**2. Four handle anchors at true diamond midpoints:**
In a 160×160 rotated square, the visual midpoints of the four diamond edges map to these positions in the pre-rotation coordinate system:
- Top of diamond: center-top of container = `position: Position.Top, top: -5`  
- Bottom of diamond: center-bottom = `position: Position.Bottom, bottom: -5`
- Left of diamond: center-left = `position: Position.Left, left: -5`
- Right of diamond: center-right = `position: Position.Right, right: -5`

All four should be `type="source"` on the decision node (decision branches fan out in all directions). The target is `type="target"` on the top handle (flow arrives at top).

```tsx
{/* Incoming — top of diamond */}
<Handle type="target" position={Position.Top}
  style={{ width: 10, height: 10, background: '#ffffff', border: '2px solid #b45309', top: -5 }} />

{/* Outgoing branches — bottom (primary/most-common path) */}
<Handle type="source" position={Position.Bottom} id="bottom"
  style={{ width: 10, height: 10, background: '#ffffff', border: '2px solid #b45309', bottom: -5 }} />

{/* Outgoing branches — right (alternate path) */}
<Handle type="source" position={Position.Right} id="right"
  style={{ width: 10, height: 10, background: '#ffffff', border: '2px solid #b45309', right: -5 }} />

{/* Outgoing branches — left (rare/exception path) */}
<Handle type="source" position={Position.Left} id="left"
  style={{ width: 10, height: 10, background: '#ffffff', border: '2px solid #b45309', left: -5 }} />
```

**Decision label — observed-split language only (see §6 for the honesty rule):**
```tsx
{/* Inside the counter-rotated content div */}
<span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
  textTransform: 'uppercase', color: '#b45309', display: 'block', marginBottom: 4 }}>
  ◆ Branch point
</span>
<p style={{ fontSize: 11, fontWeight: 600, color: '#78350f', lineHeight: 1.3, ... }}>
  {n.decisionLabel || n.label}
  {/* decisionLabel must be observed-data language: "3 of 16 runs diverged here" */}
  {/* NEVER: "If approved / else rejected" or any inferred condition */}
</p>
```

### 1.5 WorkflowTerminalNode — Stadium / Terminator

**File:** `apps/web-app/src/components/workflow-view/nodes/WorkflowTerminalNode.tsx`

MAP_DESIGN_SPEC §1.4 is correct. One additional Visio-specific detail:

The Visio/ISO 5807 terminator uses a true pill (borderRadius = height/2). The current `borderRadius: 20` on a `height: 40` container equals height/2 — correct. After MAP_DESIGN_SPEC P1-5 increases height to 44, set `borderRadius: 22`.

**The start node must have a clearly thicker border than the end node** to signal "entry" visually at a glance (Visio convention):
```tsx
// Start: 2.5px border — strong green ring
border: `2.5px solid ${selected ? '#059669' : '#6ee7b7'}`

// End: 1.5px border — understated, reads as "terminus"
border: `1.5px solid ${selected ? '#374151' : '#9ca3af'}`
```

---

## 2. Orthogonal Connectors

### 2.1 Why Orthogonal vs. Smooth

The current `getSmoothStepPath` with `borderRadius: 12` produces rounded-elbow paths. This is close but not authentic. Visio uses pure right-angle paths — no curve at the bend. The visual difference:

- `smoothstep` with borderRadius > 0: rounded corners — looks like a UI diagram
- `step` / `smoothstep` with `borderRadius: 0`: crisp right-angle bends — looks like Visio

**Spec:** Change `getSmoothStepPath` `borderRadius` from `12` → `0` in `WorkflowEdge.tsx`.

```tsx
// In WorkflowEdge.tsx, change FROM:
const [edgePath, labelX, labelY] = getSmoothStepPath({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  borderRadius: 12,      // ← rounded elbow
});

// Change TO (crisp orthogonal):
const [edgePath, labelX, labelY] = getSmoothStepPath({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  borderRadius: 0,       // ← right-angle elbow — the Visio look
});
```

`getSmoothStepPath` with `borderRadius: 0` already routes orthogonally — it produces proper right-angle paths. No change to the path function is needed, only the `borderRadius` argument.

### 2.2 Arrowheads

**Current state:** No `markerEnd` is passed. React Flow adds an unstyled default marker.

**Spec — three marker variants, defined once in the canvas:**

```tsx
// In WorkflowCanvas.tsx, add inside the ReactFlowProvider wrapper,
// BEFORE the ReactFlow element — a zero-size SVG with marker definitions:

<svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
  <defs>
    {/* Default: closed triangle, slate — sequence flow */}
    <marker id="arrow-seq" markerWidth="9" markerHeight="9"
            refX="7" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,7 L9,3.5 z" fill="#9ca3af" />
    </marker>

    {/* Exception/error: closed triangle, red — dashed exception paths */}
    <marker id="arrow-exc" markerWidth="9" markerHeight="9"
            refX="7" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,7 L9,3.5 z" fill="#fca5a5" />
    </marker>

    {/* Decision branch: closed triangle, amber — from decision diamonds */}
    <marker id="arrow-dec" markerWidth="9" markerHeight="9"
            refX="7" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,7 L9,3.5 z" fill="#d97706" />
    </marker>

    {/* Selected: closed triangle, indigo — any edge when selected */}
    <marker id="arrow-sel" markerWidth="9" markerHeight="9"
            refX="7" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,7 L9,3.5 z" fill="#6366f1" />
    </marker>

    {/* Handoff (cross-lane): closed triangle, violet */}
    <marker id="arrow-handoff" markerWidth="9" markerHeight="9"
            refX="7" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,7 L9,3.5 z" fill="#8b5cf6" />
    </marker>
  </defs>
</svg>
```

**Same SVG defs block must be added in `WorkflowSwimlaneCanvas.tsx`** (copy-paste, same IDs — they are in different DOM trees).

**In `WorkflowEdge.tsx`, pass `markerEnd`:**

```tsx
// Marker selection logic (add above the return):
const markerId = selected ? 'arrow-sel'
  : isException        ? 'arrow-exc'
  : (viewEdge?.type === 'decision') ? 'arrow-dec'
  : 'arrow-seq';

// In BaseEdge:
<BaseEdge
  id={id}
  path={edgePath}
  markerEnd={`url(#${markerId})`}
  style={{
    stroke: selected ? '#6366f1' : strokeColor,
    strokeWidth,
    strokeDasharray: isDashed ? '6 3' : (isException ? '6 3' : undefined),
    transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
  }}
/>
```

**`markerUnits="strokeWidth"` is important:** the arrowhead scales proportionally with the stroke weight, so frequency-coded thick edges get bigger arrowheads automatically.

### 2.3 Stroke Weight by Frequency

Visio process diagrams use uniform 1–1.5pt strokes. Ledgerium's frequency-coded strokes are a legitimate value-add but must be restrained:

| Edge role | Stroke weight | Style | Color |
|-----------|--------------|-------|-------|
| Primary / only path | `2.5px` | Solid | `#6b7280` (medium slate) |
| Common path (≥40% of runs) | `2.0px` | Solid | `#9ca3af` (light slate) |
| Occasional path (15–40%) | `1.5px` | Solid | `#9ca3af` |
| Rare path (<15%) | `1.0px` | Solid | `#9ca3af` |
| Exception / error path | `1.5px` | Dashed `6 3` | `#fca5a5` (red) |
| Decision branch | `2.0px` | Solid | `#fbbf24` (amber) |
| Cross-lane handoff (swimlane) | `2.0px` | Solid | `#8b5cf6` (violet) |

**In `flowAdapter.ts`, set `strokeWidth` based on `viewEdge.type` and any frequency data available.** The current `viewEdge.strokeWidth` default is `2`. The adapter should compute:

```ts
// In flowAdapter.ts — edge mapping (additive, replace the strokeWidth: 2 default):
function computeEdgeStrokeWidth(viewEdge: ViewEdge): number {
  if (viewEdge.type === 'exception') return 1.5;
  if (viewEdge.type === 'decision') return 2.0;
  // frequency-coded sequence edges:
  const freq = viewEdge.frequency ?? 1.0; // frequency field on ViewEdge if/when populated
  if (freq >= 0.9) return 2.5;
  if (freq >= 0.4) return 2.0;
  if (freq >= 0.15) return 1.5;
  return 1.0;
}
```

Note: `ViewEdge` does not currently carry a `frequency` field. Until that data flows through, use `2.0` as a flat default for all sequence edges (cleaner than current `1.5–4.5` range). The architecture is set up for frequency-coding when the data is plumbed.

### 2.4 Edge Label Chips — Position on Orthogonal Segments

`getSmoothStepPath` returns `labelX, labelY` at the geometric midpoint of the path. On orthogonal right-angle paths this mid-point often lands precisely at a bend corner, making the chip overlap with the corner and the nearby shape.

**Spec — label offset from the source handle to sit on the first straight horizontal or vertical segment:**

```tsx
// In WorkflowEdge.tsx, replace the label transform:

// Current:
transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,

// Spec: offset the label toward the source (30% of the path, not 50%) to avoid overlap
// For vertical flow (source below, target above): labelY biased upward from source
// Implementation: pass a custom labelOffset to the EdgeLabelRenderer:

const labelOffsetX = 0;
const labelOffsetY = -12; // 12px above the midpoint on vertical segments

<div style={{
  position: 'absolute',
  transform: `translate(-50%, -50%) translate(${labelX + labelOffsetX}px,${labelY + labelOffsetY}px)`,
  pointerEvents: 'none',
}}>
```

For the swimlane view (horizontal flow), the offset should be `labelOffsetX: 12, labelOffsetY: -14` so the chip sits above the horizontal segment rather than on top of it.

**Label chip spec (final, combining MAP_DESIGN_SPEC §2.1 with Visio standards):**

```tsx
<span style={{
  display: 'inline-block',
  fontSize: 10,
  fontWeight: 600,
  lineHeight: 1.4,
  padding: '2px 8px',
  borderRadius: 3,        // sharp corners — matches process box borderRadius
  whiteSpace: 'nowrap',
  color: isException ? '#991b1b'
       : (viewEdge?.type === 'decision') ? '#78350f'
       : '#374151',
  background: isException ? '#fef2f2'
            : (viewEdge?.type === 'decision') ? '#fef9c3'
            : '#ffffff',
  border: `1px solid ${isException ? '#fca5a5'
         : (viewEdge?.type === 'decision') ? '#fcd34d'
         : '#d1d5db'}`,
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
}}>
  {label}
</span>
```

The `borderRadius: 3` on the chip matches the process box — visual consistency throughout the diagram.

---

## 3. Swimlanes — Visio Cross-Functional Layout

### 3.1 What Makes It Read as Cross-Functional

A Visio cross-functional flowchart has three structural elements that the current swimlane implementation is missing or underimplemented:

1. **A solid left header band** — a fixed-width vertical strip on the left edge of the diagram that contains lane labels. Visio uses a gray or colored band, 90–160px wide, with the lane name rotated 90° or displayed horizontally.
2. **Lane separators** — a 1px solid horizontal line between lanes (not just a subtle border-bottom).
3. **Alternating lane tints** — Visio uses alternating light / white tints to help the eye track which lane it's in. The current single-color tint (`color06`) doesn't alternate.

The current `SwimlaneLaneHeader` component is a React Flow node (pans/zooms with the diagram). For Visio fidelity, the header band should be **fixed / sticky** — it should not scroll horizontally with the canvas, only vertically.

### 3.2 Lane Header Band — Fixed Left Strip

**Current architecture:** `laneHeader` type nodes are positioned at `x: 0` and move with the canvas. This is the practical choice for React Flow's node system.

**Visio-accurate alternative:** A positioned overlay element rendered outside React Flow that stays fixed to the left edge while the canvas scrolls horizontally.

**Spec — `SwimlaneHeaderOverlay` component (new file):**

```tsx
// apps/web-app/src/components/workflow-view/SwimlaneHeaderOverlay.tsx
// NEW FILE — read-only spec

interface Props {
  lanes: SwimlaneLane[];
  canvasTransform: { x: number; y: number; zoom: number }; // from useViewport()
}

export function SwimlaneHeaderOverlay({ lanes, canvasTransform }: Props) {
  // This element is positioned absolutely over the canvas, left-aligned.
  // It translates vertically with the canvas but NOT horizontally,
  // producing the "fixed left column" effect.

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 200,               // LANE_HEADER_WIDTH from swimlaneAdapter.ts
        zIndex: 5,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Frosted glass background — separates header from diagram */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(4px)',
        borderRight: '2px solid #e5e7eb',
      }} />

      {/* Lane label cells — translated vertically only */}
      {lanes.map((lane) => {
        // Transform lane's canvas-space y into viewport-space y:
        const viewportY = lane.bounds.y * canvasTransform.zoom + canvasTransform.y;
        const viewportH = lane.bounds.height * canvasTransform.zoom;

        return (
          <div
            key={lane.id}
            style={{
              position: 'absolute',
              left: 0,
              top: viewportY,
              width: 200,
              height: viewportH,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: '0 16px',
              borderBottom: `1px solid ${lane.color}30`,
              // Alternating tint:
              background: lane.laneIndex % 2 === 0 ? 'transparent' : `${lane.color}04`,
            }}
          >
            {/* Lane color stripe */}
            <div style={{
              width: 4,
              alignSelf: 'stretch',
              background: lane.color,
              borderRadius: 2,
              marginRight: 10,
              flexShrink: 0,
            }} />

            {/* Lane label block */}
            <div style={{ overflow: 'hidden' }}>
              <p style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#111827',
                lineHeight: 1.3,
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 150,
              }}>
                {lane.label}
              </p>
              <p style={{
                fontSize: 10,
                fontWeight: 400,
                color: '#6b7280',
                margin: 0,
                marginTop: 2,
              }}>
                {lane.stepCount} step{lane.stepCount !== 1 ? 's' : ''}
                {lane.durationLabel ? ` · ${lane.durationLabel}` : ''}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Wiring in `WorkflowSwimlaneCanvas.tsx`:**
- Import `useViewport` from `@xyflow/react`
- Import `SwimlaneHeaderOverlay`
- Inside the `SwimlaneCanvas` function, get `const viewport = useViewport()`
- Render `<SwimlaneHeaderOverlay lanes={swimlaneData.lanes} canvasTransform={viewport} />` as a sibling of the `<ReactFlow>` element (NOT inside it)
- Remove the existing `laneHeader` node type and the `laneHeaderNodes` from the node array (they are replaced by the overlay)
- Remove the `SwimlaneLaneHeader` import from `WorkflowSwimlaneCanvas.tsx`

### 3.3 Lane Separator Lines

The `SwimlaneLaneBand` component currently uses `borderBottom: 1px solid ${lane.color}22` which is barely visible. Visio lane separators are a solid `1px #d1d5db` line — color-independent, always visible.

**Spec for `SwimlaneLaneBand`:**

```tsx
// In WorkflowSwimlaneCanvas.tsx → SwimlaneLaneBand:
<div
  style={{
    position: 'absolute',
    left: 0,
    top: lane.bounds.y,
    width: Math.max(lane.bounds.width, 5000),
    height: lane.bounds.height,
    // Alternating lane background (matches header overlay):
    background: lane.laneIndex % 2 === 0
      ? 'transparent'
      : `${lane.color}05`,
    // Solid separator — always visible:
    borderBottom: '1px solid #d1d5db',
    // Thicker separator on even lanes (Visio visual rhythm):
    borderTop: lane.laneIndex === 0 ? '2px solid #d1d5db' : undefined,
    zIndex: -1,
  }}
/>
```

### 3.4 Node Alignment in Lanes (Left-to-Right Reading)

The current `swimlaneAdapter.ts` positions nodes left-to-right within a lane. This is correct for the Visio cross-functional layout.

**Spec additions:**

1. **Horizontal handle priority:** In the swimlane view, source/target positions should be `Right` / `Left` for same-lane edges (not `Bottom` / `Top`). The adapter produces `workflowEdge` type edges; the edge component receives `sourcePosition` and `targetPosition` from React Flow.

   The swimlane adapter must set `sourceHandle: 'right'` and `targetHandle: 'left'` on same-lane edges:

   ```ts
   // In swimlaneAdapter.ts → edge building loop:
   const srcSys = nodeSystemMap.get(viewEdge.sourceId);
   const tgtSys = nodeSystemMap.get(viewEdge.targetId);
   const sameLane = srcSys === tgtSys && srcSys !== '__terminal__';

   return {
     id: viewEdge.id,
     source: viewEdge.sourceId,
     target: viewEdge.targetId,
     sourceHandle: sameLane ? 'right' : undefined,  // right handle for horizontal flow
     targetHandle: sameLane ? 'left' : undefined,   // left handle for horizontal flow
     type: isHandoff ? 'handoffEdge' : 'workflowEdge',
     data: { viewEdge, isHandoff },
   };
   ```

2. **Cross-lane (handoff) edges:** Cross-lane edges use the default `Bottom` → `Top` handles (they travel vertically between lanes). This is correct — handoffs should arc up/down between lanes, not go sideways.

3. **Lane x-offset:** The swimlane adapter already adds `LANE_HEADER_WIDTH = 200` as x-offset for all nodes. With the new `SwimlaneHeaderOverlay` (which replaces the `laneHeader` nodes), this offset is still correct — nodes start at x=200, after the header band.

### 3.5 Swimlane Title Block

Above the swimlane canvas, a process title block (see §4.4) should show:

- Workflow name (bold)
- "System Swimlane" mode label
- Number of systems (e.g. "3 systems")
- Total duration

---

## 4. Grid + Canvas

### 4.1 Grid Specification — Lines Not Dots (Visio Standard)

Visio uses a fine grid of lines, not dots. The current dot grid is acceptable but the lines variant reads as more professional.

**Spec — switch to line grid in both `WorkflowCanvas.tsx` and `WorkflowSwimlaneCanvas.tsx`:**

```tsx
// Replace current Background:
<Background
  variant={BackgroundVariant.Dots}
  color="#e5e7eb"
  gap={24}
  size={1.5}
  className="!bg-white"
/>

// With line grid:
<Background
  variant={BackgroundVariant.Lines}
  color="#f3f4f6"    // very faint — grid should be barely perceptible on white
  gap={20}           // 20px grid pitch = clean snap reference
  className="!bg-white"
/>
```

**Why lines:** In Visio, the grid is visible light lines that reinforce the orthogonal connector routing. Dots don't reinforce orthogonality; lines do. The `#f3f4f6` color (vs `#e5e7eb` in MAP_DESIGN_SPEC) is lighter — on a white `#ffffff` background the contrast is intentionally low. The grid reads as a background texture, not a design element.

**Snap-to-grid behavior:** React Flow has a `snapToGrid` and `snapGrid` prop. Currently unused.
```tsx
// Add to ReactFlow element in WorkflowCanvas.tsx:
snapToGrid={false}  // nodes are not user-draggable (nodesDrawable=false), so this is moot
                    // but if drag is ever enabled, use snapGrid={[20, 20]} to match the Background gap
```

### 4.2 Canvas Padding and fitView

**Current:** `fitViewOptions={{ padding: 0.15, maxZoom: 1.5 }}` in WorkflowCanvas and `padding: 0.15` in WorkflowSwimlaneCanvas.

MAP_DESIGN_SPEC P1-10 specifies `0.25`. This spec affirms that — `0.25` (25% margin) is the right number. For the swimlane view, slightly more: `0.30` because the lane headers add structural weight on the left edge.

```tsx
// WorkflowCanvas.tsx:
fitViewOptions={{ padding: 0.25, maxZoom: 1.2 }}

// WorkflowSwimlaneCanvas.tsx:
fitViewOptions={{ padding: 0.30, maxZoom: 1.2 }}
```

`maxZoom: 1.2` (down from `1.5`) prevents "zoom-in" on initial fit that would cut off labels. The natural 1:1 zoom at fitView shows the whole diagram at comfortable reading size.

### 4.3 White Print Background

MAP_DESIGN_SPEC §4.1 specifies `className="!bg-white"` on the Background element. Affirmed. Additionally, the React Flow container div needs `print:bg-white` to override any inherited theme background:

```tsx
// In WorkflowCanvas.tsx → FlowCanvas → outer div:
<div className="absolute inset-0 print:bg-white">
  <ReactFlow ... className="workflow-flow-canvas print:bg-white">
```

### 4.4 Diagram Title Block

MAP_DESIGN_SPEC §4.3 specifies a `MapTitleBar` component. The Visio-grade version is more structured. **This spec supersedes §4.3.**

**Visio title block anatomy:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Ledgerium logomark 16px]  Workflow Name — 14px/700/black            │
│                            Flow Intelligence Map  Ledgerium AI        │
│ ───────────────────────────────────────────────────────────────────── │
│ 12 steps  ·  3 systems  ·  4m 22s avg  ·  8 runs  ·  2026-06-11      │
└──────────────────────────────────────────────────────────────────────┘
```

```tsx
// apps/web-app/src/components/workflow-view/MapTitleBar.tsx
// NEW FILE

interface Props {
  workflowName: string;
  mode: 'flow' | 'swimlane' | 'variants' | 'systems';
  meta: {
    stepCount: number;
    systemCount: number;
    avgDurationLabel: string;    // e.g. "4m 22s"
    runCount: number;
    asOfDate: string;            // ISO date string
  };
}

const MODE_LABELS: Record<string, string> = {
  flow:     'Flow Intelligence Map',
  swimlane: 'System Swimlane',
  variants: 'Variant Story Map',
  systems:  'System Topology',
};

export function MapTitleBar({ workflowName, mode, meta }: Props) {
  return (
    <div
      className="map-title-bar print:border-b-2 print:border-gray-900"
      style={{
        padding: '10px 20px 8px',
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Row 1: name + mode */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>
          {workflowName}
        </h2>
        <span style={{ fontSize: 11, fontWeight: 400, color: '#6b7280' }}>
          {MODE_LABELS[mode]}
        </span>
        <span style={{ flex: 1 }} />
        {/* Ledgerium wordmark — top-right, print provenance */}
        <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.05em' }}>
          Ledgerium AI
        </span>
      </div>

      {/* Row 2: metadata strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <MetaChip value={`${meta.stepCount}`} label="steps" />
        <MetaDot />
        <MetaChip value={`${meta.systemCount}`} label="system{s}" count={meta.systemCount} />
        <MetaDot />
        <MetaChip value={meta.avgDurationLabel} label="avg" />
        <MetaDot />
        <MetaChip value={`${meta.runCount}`} label="run{s}" count={meta.runCount} />
        <MetaDot />
        <span style={{ fontSize: 10, color: '#9ca3af' }}>
          {new Date(meta.asOfDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

function MetaChip({ value, label, count }: { value: string; label: string; count?: number }) {
  const text = count !== undefined ? label.replace('{s}', count !== 1 ? 's' : '') : label;
  return (
    <span style={{ fontSize: 10, color: '#6b7280', whiteSpace: 'nowrap' }}>
      <span style={{ fontWeight: 600, color: '#374151' }}>{value}</span>
      {' '}{text}
    </span>
  );
}

function MetaDot() {
  return <span style={{ fontSize: 10, color: '#d1d5db', padding: '0 8px' }}>·</span>;
}
```

### 4.5 Zoom Controls — Styled

**Current:** `<Controls />` is not present in `WorkflowCanvas.tsx` (it's absent from the ReactFlow element). MAP_DESIGN_SPEC §4.4 specifies adding it.

**Visio-grade control panel:**

```tsx
// Add inside <ReactFlow>:
<Controls
  showInteractive={false}  // hide the lock/unlock button — not relevant for read-only diagrams
  position="bottom-right"
/>
```

**CSS (in `globals.css`):**

```css
/* Visio-style zoom control panel */
.workflow-flow-canvas .react-flow__controls,
.workflow-swimlane-canvas .react-flow__controls {
  bottom: 16px;
  right: 16px;
  left: auto;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  border: 1px solid #e5e7eb;
  border-radius: 4px;       /* Visio uses near-square controls */
  background: #ffffff;
  overflow: hidden;
}

.workflow-flow-canvas .react-flow__controls-button,
.workflow-swimlane-canvas .react-flow__controls-button {
  border: none;
  border-radius: 0;
  background: transparent;
  color: #374151;
  width: 28px;
  height: 28px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.workflow-flow-canvas .react-flow__controls-button:hover,
.workflow-swimlane-canvas .react-flow__controls-button:hover {
  background: #f9fafb;
}

.workflow-flow-canvas .react-flow__controls-button + .react-flow__controls-button,
.workflow-swimlane-canvas .react-flow__controls-button + .react-flow__controls-button {
  border-top: 1px solid #f3f4f6;
}
```

### 4.6 Always-On Legend

MAP_DESIGN_SPEC §3.2 specifies making the legend always-on with a collapse toggle. Affirmed. One addition for Visio-grade polish:

The legend should be positioned **bottom-left** and match the diagram's typographic system. It must appear in print output.

```tsx
// In WorkflowLegend.tsx or a new WorkflowDiagramLegend.tsx
// Position:
style={{
  position: 'absolute',
  bottom: 16,
  left: 16,
  zIndex: 10,
  width: 192,
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 4,           // Matches process box borderRadius
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  fontFamily: "'Inter', system-ui, sans-serif",
}}
```

**Legend sections for the Visio-grade version:**

```
SHAPES
  ██ rect    Process step
  ◆ diamond  Branch point (observed split)
  ⬭ pill     Start / End

CONNECTIONS
  ——→   Sequence flow
  --→   Exception path
  ══→   High-frequency path

INDICATORS
  ⚠   Bottleneck
  ⚡   Decision point
  🛡   Sensitive data
```

### 4.7 Print / Export Rules

MAP_DESIGN_SPEC §4.7 specifies the `@media print` CSS. This spec extends it with the MapTitleBar behavior:

```css
@media print {
  /* Hide all interactive chrome */
  .react-flow__controls,
  .react-flow__minimap,
  .react-flow__attribution,
  [role="slider"],
  button:not(.print-visible) {
    display: none !important;
  }

  /* Force white canvas and hide dot/line grid */
  .react-flow__background {
    background: #ffffff !important;
  }
  .react-flow__background pattern {
    display: none !important;
  }

  /* Ensure title bar prints at top, not clipped */
  .map-title-bar {
    page-break-after: avoid;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Make accent colors print accurately */
  .react-flow__node {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Prevent page break in the middle of a node */
  .react-flow__node > div {
    page-break-inside: avoid;
  }

  /* Legend prints in bottom-left — keep visible */
  .workflow-legend {
    position: fixed !important;
    bottom: 0.5in;
    left: 0.5in;
    box-shadow: none !important;
    border: 0.5pt solid #d1d5db !important;
  }

  /* SwimlaneHeaderOverlay — ensure it prints */
  .swimlane-header-overlay {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Page setup: landscape for wide diagrams */
  @page {
    size: A4 landscape;
    margin: 0.5in;
  }
}
```

---

## 5. Color + Typography

### 5.1 Business-Document Palette

The revised `CATEGORY_STYLES` from MAP_DESIGN_SPEC §5.2 is adopted wholesale. Reproduced here for completeness with one further adjustment: the `text` token (used for body text inside nodes) must be `#1e293b` (near-black) for all categories, not the category-tinted values currently specified. Tinted text at 12px/600 has insufficient contrast in print.

```ts
// apps/web-app/src/components/workflow-view/constants.ts — CATEGORY_STYLES

export const CATEGORY_STYLES: Record<GroupingReason, CategoryStyle> = {
  click_then_navigate:  { label: 'Navigation',      color: '#0d9488', bg: '#f0fdfa', bgHover: '#ccfbf1', text: '#1e293b' },
  fill_and_submit:      { label: 'Form Submit',     color: '#1d4ed8', bg: '#eff6ff', bgHover: '#dbeafe', text: '#1e293b' },
  repeated_click_dedup: { label: 'Repeated Action', color: '#c2410c', bg: '#fff7ed', bgHover: '#ffedd5', text: '#1e293b' },
  single_action:        { label: 'Action',          color: '#475569', bg: '#f8fafc', bgHover: '#f1f5f9', text: '#1e293b' },
  data_entry:           { label: 'Data Entry',      color: '#6d28d9', bg: '#f5f3ff', bgHover: '#ede9fe', text: '#1e293b' },
  send_action:          { label: 'Send / Submit',   color: '#047857', bg: '#ecfdf5', bgHover: '#d1fae5', text: '#1e293b' },
  file_action:          { label: 'File Action',     color: '#b45309', bg: '#fffbeb', bgHover: '#fef3c7', text: '#1e293b' },
  error_handling:       { label: 'Error',           color: '#b91c1c', bg: '#fef2f2', bgHover: '#fee2e2', text: '#1e293b' },
  annotation:           { label: 'Annotation',      color: '#7e22ce', bg: '#faf5ff', bgHover: '#f3e8ff', text: '#1e293b' },
};
```

**Rationale for uniform `text: '#1e293b'`:** In print, at 12px/600, the body text of a flowchart node should read as near-black regardless of the category accent. The accent is signaled by the 4px left rail and the ordinal badge — the label body text does not need to repeat the hue signal.

### 5.2 Diagram Type Scale

Four levels — no exceptions:

| Token | Size | Weight | Color | Usage |
|-------|------|--------|-------|-------|
| `diagram-title` | 15px | 700 | `#111827` | Workflow name in MapTitleBar |
| `node-label` | 12px | 600 | `#1e293b` | Task node step label |
| `node-category` | 10px | 700 uppercase | category `accentColor` | Category badge, ordinal badge text |
| `node-meta` | 10px | 500 | `#4b5563` | Duration, system chip, run count |
| `node-subtext` | 9px | 400 | `#6b7280` | Edge labels at rest, legend text, metadata strip |

**Nothing below 9px anywhere in the diagram.** This includes the legend, edge labels, swimlane step counts, phase group labels.

**Font family declaration:**

```css
/* In globals.css, add to the .react-flow class (or the workflow view wrapper): */
.workflow-flow-canvas,
.workflow-swimlane-canvas {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
```

If Inter is not already loaded, add it to `apps/web-app/src/app/layout.tsx` via next/font or a `<link>` tag.

### 5.3 NODE_TYPE_STYLES Update

```ts
// apps/web-app/src/components/workflow-view/constants.ts
export const NODE_TYPE_STYLES = {
  start:     { shape: 'pill'    as const, color: '#047857', bg: '#ecfdf5', border: '#6ee7b7', label: 'Start' },
  end:       { shape: 'pill'    as const, color: '#374151', bg: '#f9fafb', border: '#9ca3af', label: 'End'   },
  task:      { shape: 'rect'    as const, color: '#475569', bg: '#ffffff', border: '#e5e7eb', label: 'Step'  },
  exception: { shape: 'rect'    as const, color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', label: 'Error' },
  decision:  { shape: 'diamond' as const, color: '#b45309', bg: '#fffbeb', border: '#fcd34d', label: 'Branch'},
};
```

**Note:** `shape: 'rounded-rect'` is renamed to `shape: 'rect'` throughout. The shape constant in code was always a string label, not a CSS class, so this is a non-breaking rename. `borderRadius: 3` on the task node is what actually produces the correct shape.

### 5.4 EDGE_STYLES Update

```ts
export const EDGE_STYLES = {
  sequence:  { stroke: '#9ca3af', strokeWidth: 2.0, animated: false },
  exception: { stroke: '#fca5a5', strokeWidth: 1.5, animated: false, strokeDasharray: '6 3' },
  decision:  { stroke: '#fbbf24', strokeWidth: 2.0, animated: false },
  handoff:   { stroke: '#8b5cf6', strokeWidth: 2.0, animated: false },  // NEW: cross-lane
};
```

---

## 6. Honesty: Decision Shapes Show Observed Data Only

**This is a non-negotiable data-integrity rule, not a design preference.**

### Rule

A `WorkflowDecisionNode` (diamond shape) marks a point where **observed process runs diverged**. It is computed from actual event data by the segmentation engine. It does NOT represent:
- A programmatic `if/else` condition
- A business rule ("if credit score > 700")
- An inferred gateway

### Enforcement in the Spec

**Label constraint:** The `decisionLabel` field on a `ViewNode` must only ever contain observed-data language. Acceptable:
- "3 of 16 runs took an alternate path"
- "Diverges at step 4 — 2 variants observed"
- *(empty — fallback to `n.label`, which is humanized from the step title)*

Never acceptable:
- "If approved"
- "Yes / No"
- "Approved / Rejected"
- Any inferred condition text

**Outgoing edge labels** from decision nodes must use count/frequency language:
- "11 runs (69%)" — acceptable
- "5 runs (31%)" — acceptable
- "Yes" — NOT acceptable
- "Main path" vs "Alt path" — acceptable only if derived from observed data (standard path / variant path)

**The `◆ Branch point` header text** (specified in §1.4) reinforces this: "branch point" describes observed behavior, not a logical gate. If a future version gains the ability to import BPMN process models with explicit gateway conditions, those nodes should use a DIFFERENT node type (e.g. `gateway` with a distinct color) to distinguish observed-data branches from modeled conditions.

**Where this appears in the implementation punch-list:**

| File | Location | Honesty check |
|------|----------|---------------|
| `WorkflowDecisionNode.tsx` | Label text | Must render `n.decisionLabel \|\| n.label` — never hardcoded "Yes/No" |
| `viewModel.ts` → `buildNormalizedViewModel` | `decisionLabel` field | Should be set from `meta.decisionLabel` which flows from the segmentation engine output |
| `flowAdapter.ts` | Decision edges | Edge label derived from `viewEdge.label` (= `raw.boundaryLabel`) — engine-generated, non-fabricated |
| `WorkflowVariantStoryMap.tsx` → `StoryNodeComponent` | `"◆ Branch"` header | Acceptable — describes observed split, not a condition |
| `WorkflowVariantStoryMap.tsx` → edge labels | `edgeLabel()` function | Must use run counts and percentages: `"3 runs · 19%"` not `"Alt path"` |

---

## 7. P0 → P2 Punch-List

This punch-list maps to specific files and lines. It is **additive to MAP_DESIGN_SPEC.md** — items already fully specified there are noted with "(↑ MAP_DESIGN_SPEC)" and should be implemented per that doc. New items introduced only here are marked **(NEW)**.

### P0 — Must Ship Before Any Demo or Screenshot

These items produce a diagram that reads as "Visio-grade" at first glance.

| ID | Change | File | Exact location / what to do |
|----|--------|------|-----------------------------|
| V-P0-1 | **Orthogonal connectors: set `borderRadius: 0`** (NEW) | `WorkflowEdge.tsx` | Line 46 — `getSmoothStepPath({ ..., borderRadius: 12 })` → `borderRadius: 0`. One-line change. |
| V-P0-2 | **Process box borderRadius: 3** (NEW) | `WorkflowTaskNode.tsx` | Line 44 — `borderRadius: 10` → `borderRadius: 3`. One-line change. |
| V-P0-3 | **Closed arrowheads on all edges** (NEW) | `WorkflowCanvas.tsx` + `WorkflowEdge.tsx` | (a) Add the `<svg><defs>` marker block (§2.2) as a sibling of the `<ReactFlow>` element in `WorkflowCanvas.tsx`. (b) In `WorkflowEdge.tsx`, add `markerEnd` selector logic per §2.2 and pass to `BaseEdge`. |
| V-P0-4 | **Same arrowheads for swimlane** (NEW) | `WorkflowSwimlaneCanvas.tsx` | Add the same `<svg><defs>` marker block (copy from WorkflowCanvas.tsx). |
| V-P0-5 | True diamond shape ↑ MAP_DESIGN_SPEC P0-4 | `WorkflowDecisionNode.tsx` | Already specced. Add: change `borderRadius: 16` → `borderRadius: 4` (§1.4). |
| V-P0-6 | Accent-ring handles on task nodes ↑ MAP_DESIGN_SPEC P0-5 | `WorkflowTaskNode.tsx` | Already specced. Additionally add Right and Left handles per §1.3 of this spec. |
| V-P0-7 | Left-rail accent + borderRadius: 3 on exception nodes (NEW) | `WorkflowTaskNode.tsx` | When `n.isExceptionPath` is true, apply `borderLeft: 4px solid #b91c1c` and `borderRadius: 3`. Currently the exception variant uses the same rounded styling as a task node. |
| V-P0-8 | Line grid (NOT dot grid) (NEW) | `WorkflowCanvas.tsx`, `WorkflowSwimlaneCanvas.tsx` | Replace `BackgroundVariant.Dots` with `BackgroundVariant.Lines`, color `#f3f4f6`, gap `20` per §4.1. |

### P1 — Professional Impression (Same Sprint as P0)

| ID | Change | File | Exact location / what to do |
|----|--------|------|-----------------------------|
| V-P1-1 | Swimlane header overlay (fixed left band) (NEW) | New file + `WorkflowSwimlaneCanvas.tsx` | Create `SwimlaneHeaderOverlay.tsx` per §3.2. In `WorkflowSwimlaneCanvas.tsx`, import `useViewport`, render overlay, remove `laneHeader` node type. |
| V-P1-2 | Solid lane separators (NEW) | `WorkflowSwimlaneCanvas.tsx` → `SwimlaneLaneBand` | Replace `borderBottom: 1px solid ${lane.color}15` → `borderBottom: 1px solid #d1d5db` per §3.3. |
| V-P1-3 | Alternating lane tints (NEW) | `WorkflowSwimlaneCanvas.tsx` → `SwimlaneLaneBand` | `background: lane.laneIndex % 2 === 0 ? 'transparent' : \`${lane.color}05\`` per §3.3. |
| V-P1-4 | Same-lane Right/Left handles + `sourceHandle`/`targetHandle` on edges (NEW) | `swimlaneAdapter.ts` | In the edge-building loop, detect same-lane edges and set `sourceHandle: 'right'`, `targetHandle: 'left'` per §3.4. |
| V-P1-5 | MapTitleBar component (NEW) | New file: `workflow-view/MapTitleBar.tsx` | Create per §4.4 spec. This supersedes MAP_DESIGN_SPEC §4.3. |
| V-P1-6 | Task node left-rail + borderRadius ↑ MAP_DESIGN_SPEC P1-1 | `WorkflowTaskNode.tsx` | Per MAP_DESIGN_SPEC. |
| V-P1-7 | Ordinal badge white-on-color ↑ MAP_DESIGN_SPEC P1-2 | `WorkflowTaskNode.tsx` | Per MAP_DESIGN_SPEC. |
| V-P1-8 | Step label font-weight: 600 ↑ MAP_DESIGN_SPEC P1-3 | `WorkflowTaskNode.tsx` | Per MAP_DESIGN_SPEC. |
| V-P1-9 | Canvas background white + line grid ↑ MAP_DESIGN_SPEC P1-7 | `WorkflowCanvas.tsx`, `WorkflowSwimlaneCanvas.tsx` | Per MAP_DESIGN_SPEC P1-7, then override dot→line per V-P0-8. |
| V-P1-10 | CATEGORY_STYLES deepened colors + uniform text token (NEW) | `constants.ts` | Apply §5.1 palette. Key change: `text: '#1e293b'` for all categories (MAP_DESIGN_SPEC §5.2 had tinted text tokens — override to `#1e293b`). |
| V-P1-11 | fitView padding 0.25 / 0.30 ↑ MAP_DESIGN_SPEC P1-10 | `WorkflowCanvas.tsx`, `WorkflowSwimlaneCanvas.tsx` | Per MAP_DESIGN_SPEC. swimlane = 0.30. |
| V-P1-12 | Edge label chip borderRadius: 3 (NEW) | `WorkflowEdge.tsx` | Label chip `borderRadius: 10` (current) → `borderRadius: 3` per §2.4. Matches process box corners. |
| V-P1-13 | Decision node diamond borderRadius: 4 (NEW) | `WorkflowDecisionNode.tsx` | Inner square `borderRadius: 16` → `borderRadius: 4` per §1.4. |
| V-P1-14 | Frequency-coded stroke widths in adapter (NEW) | `flowAdapter.ts` | Add `computeEdgeStrokeWidth` per §2.3. Default to `2.0` until frequency data is plumbed. |
| V-P1-15 | Four handles on decision node (NEW) | `WorkflowDecisionNode.tsx` | Add Right and Left source handles per §1.4. |

### P2 — Print Readiness and Completeness

| ID | Change | File | Exact location / what to do |
|----|--------|------|-----------------------------|
| V-P2-1 | `@media print` CSS block (NEW, extends MAP_DESIGN_SPEC §4.7) | `globals.css` | Add full print block per §4.7 of this spec. Add `@page { size: A4 landscape; margin: 0.5in; }`. |
| V-P2-2 | Zoom controls `<Controls />` + CSS styling (NEW) | `WorkflowCanvas.tsx` + `globals.css` | Add `<Controls showInteractive={false} position="bottom-right" />` inside `<ReactFlow>`. Add CSS per §4.5. |
| V-P2-3 | NODE_TYPE_STYLES rename + update (NEW) | `constants.ts` | `shape: 'rounded-rect'` → `shape: 'rect'`; update color tokens per §5.3. |
| V-P2-4 | EDGE_STYLES update: sequence darker + handoff added (NEW) | `constants.ts` | Per §5.4 — sequence `#9ca3af`, add `handoff: { stroke: '#8b5cf6', strokeWidth: 2.0 }`. |
| V-P2-5 | Inter font declaration on canvas containers (NEW) | `globals.css` | `.workflow-flow-canvas, .workflow-swimlane-canvas { font-family: 'Inter', system-ui, sans-serif; }` per §5.2. |
| V-P2-6 | Legend always-on + borderRadius: 4 (NEW) | `WorkflowLegend.tsx` | Per MAP_DESIGN_SPEC §3.2 + this spec §4.6. Change legend `borderRadius: 12` → `4`. |
| V-P2-7 | All category text tokens → `#1e293b` (NEW) | `constants.ts` | Per §5.1. Apply to all 9 CATEGORY_STYLES `.text` values. |
| V-P2-8 | Wire `MapTitleBar` above each canvas (NEW) | Parent shell component | The parent of `WorkflowFlowCanvas` and `WorkflowSwimlaneCanvas` (not read in this audit) needs to render `<MapTitleBar>` above the canvas. Frontend engineer must identify the shell wrapper file and wire the title bar. |
| V-P2-9 | Phase group overlay border + label size ↑ MAP_DESIGN_SPEC P1-11 | `WorkflowCanvas.tsx` → `PhaseGroupOverlay` | Per MAP_DESIGN_SPEC. |
| V-P2-10 | `swimlane-header-overlay` class on overlay div (NEW) | `SwimlaneHeaderOverlay.tsx` | Add `className="swimlane-header-overlay"` to the outer div for print CSS targeting. |
| V-P2-11 | `workflow-legend` class on legend div (NEW) | `WorkflowLegend.tsx` | Add `className="workflow-legend"` to the outer div for print CSS targeting. |
| V-P2-12 | Label offset on orthogonal segments (NEW) | `WorkflowEdge.tsx` | Apply `labelOffsetY: -12` per §2.4. Prevents chip sitting on bend corner. |
| V-P2-13 | `print-color-adjust` on accent elements (NEW) | `globals.css` | Add `.react-flow__node { -webkit-print-color-adjust: exact; print-color-adjust: exact; }` so left-rail accent colors print correctly. |
| V-P2-14 | `snapToGrid` set on ReactFlow (NEW, no-op now) | `WorkflowCanvas.tsx` | Add `snapToGrid={false}` and `snapGrid={[20, 20] as [number, number]}` to the `<ReactFlow>` element. When user-drag is ever enabled, snap will already be wired. |

---

## 8. QA Acceptance Criteria

For each item above, the frontend engineer and QA can validate against these observable checks:

### Shape Vocabulary
- [ ] Task nodes have `borderRadius: 3` — corners are visually sharp (not card-like)
- [ ] Decision nodes have a true diamond (rotated square); corners are `borderRadius: 4` — sharp points
- [ ] Start/End nodes are pills with `borderRadius: 22`
- [ ] Exception nodes have a red (`#b91c1c`) left-rail accent, not a red background flood

### Connectors
- [ ] All sequence edges have right-angle bends (no smooth curves at corners)
- [ ] All edges have a closed arrowhead at the target end
- [ ] Arrowhead color matches edge color (slate for sequence, amber for decision, red for exception)
- [ ] Edge label chips are positioned on the straight segment (not on the bend corner)
- [ ] Edge label chip corners are `borderRadius: 3` (sharp, not rounded pill)

### Swimlane
- [ ] A 200px wide header band appears on the left edge and does NOT scroll horizontally with the canvas
- [ ] Lane separators are solid `#d1d5db` lines (visible between every lane)
- [ ] Alternating lanes have a barely-visible tint on every other lane
- [ ] Same-lane edges flow horizontally (right-to-left handles), not vertically

### Canvas
- [ ] Grid is fine lines, not dots
- [ ] Canvas background is `#ffffff` (not a gray or themed color)
- [ ] `fitView` leaves 25% (flow) / 30% (swimlane) margin around the diagram
- [ ] MapTitleBar shows the workflow name, mode label, and metadata strip above the canvas
- [ ] Zoom control panel appears at bottom-right as a compact bordered box

### Print
- [ ] `Ctrl+P` (or browser print) shows: title bar, diagram on white background, legend, no controls or minimap
- [ ] Category accent rail colors print accurately (not stripped by browser)
- [ ] Page orientation is landscape

### Honesty
- [ ] Decision nodes show "◆ Branch point" header — never "Yes/No" or "If/Else"
- [ ] Outgoing decision edge labels use run counts or percentages — never inferred condition text
- [ ] Variant Story Map branch edges use count language: `"3 runs · 19%"` — never `"Alt path"`

---

## 9. Not in Scope

These are architectural changes that the previous specs (MAP_DESIGN_SPEC, LAYOUT_PLAN) have already addressed or deferred:

- **ELK layout engine** — LAYOUT_PLAN.md covers this end-to-end. This spec does not touch layout logic.
- **Node drag** — all nodes are `nodesDraggable={false}`. The snap-to-grid wiring in V-P2-14 is preparatory only.
- **Parallelogram / Data node type** — `ViewNodeType` does not include a data/IO type. Reserved for future extension.
- **BPMN import** — out of scope. If/when BPMN models are imported, gateway conditions will need a distinct node treatment separate from the observed-branch diamond.
- **Dark theme** — this spec is white-background only. A dark theme is a separate design pass.
- **Handoff edge component (`HandoffEdge.tsx`)** — not read in this audit. The `handoff` edge type in EDGE_STYLES (V-P2-4) provides the color constant. The `HandoffEdgeComponent` in `WorkflowSwimlaneCanvas.tsx` should use `stroke: '#8b5cf6', strokeWidth: 2.0` and the `arrow-handoff` marker.
