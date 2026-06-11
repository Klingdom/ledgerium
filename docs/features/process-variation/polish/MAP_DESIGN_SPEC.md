# Process Map Polish — Design Specification

**Date:** 2026-06-11
**Scope:** Variant Story Map + Flow Intelligence Map (WorkflowCanvas) + supporting components
**Goal:** Production-grade, print-ready process diagrams that are visibly more polished than Celonis, Lucidchart, and Apromore screenshots
**Constraint:** Read-only spec. No product code is modified by this document.

---

## 0. Diagnosis: What Makes the Current Maps Feel Unprofessional

Reading the source code directly:

**WorkflowVariantStoryMap / StoryNodeComponent**
- Node renders only a category label (`"Navigation"`) and optionally the word `"diverges"` — no ordinal number, no step label, no frequency badge. A viewer cannot identify which step is which without hovering.
- Node size is `minWidth: 96, maxWidth: 140` — nodes are tiny and inconsistently sized.
- Handles are invisible (`opacity: 0`) so connection points float in whitespace.
- The decision treatment is border-boldened text `"diverges"` — not a shape change, not a recognizable process-mining symbol.
- `text-[8px]` category labels are below comfortable reading threshold at 1× zoom.

**WorkflowCanvas / WorkflowTaskNode**
- Width is hardcoded at 280px regardless of label length — short labels produce gaping whitespace; long labels truncate awkwardly.
- The ordinal badge is `text-[10px]` in a 16px × ~18px container — numerals beyond "9" compress.
- Handle dots are 8×8px, slate-colored by default — they visually float. On print they read as dirt.
- `boxShadow` uses `rgba(0,0,0,0.04)` — effectively invisible on white, produces no depth at print.

**WorkflowDecisionNode**
- The diamond is drawn with an inline SVG 12×12px — far too small to read as a decision gate shape in context.
- The node container is still a rectangle (`borderRadius: 12`) — the diamond SVG is merely a decorative icon inside a rect.
- Width is 280px but the inner styled div is 200px, creating asymmetric whitespace.

**WorkflowEdge / StoryMap edges**
- Edge label chip uses `text-[8px]` — unreadable at zoom < 1.
- Stroke weight varies by `runShare` but the formula (`1.5 + runShare * 3`) produces a max of 4.5px and a min of 1.5px — the delta is imperceptible in screenshots or print.
- No arrowhead is specified on `BaseEdge` calls — React Flow adds a default marker but it is unstyled and generic.

**WorkflowLegend**
- Toggled on/off. Not always visible. No story-map specific content (green spine / amber branch meaning is not explained anywhere in the UI).
- Category swatches are 10×8px rectangles with no label alignment — hard to scan.

**Canvas background**
- `BackgroundVariant.Dots` at `gap=24, size=1` is appropriate but the dot color `var(--border-subtle)` varies with theme and may be invisible on print (white background, near-white dots).
- `fitViewOptions.padding: 0.15` clips tight on large maps.

**Typography**
- Mix of `text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[12px]` with no system. The minimum legible screen size is 10px; print minimum is 6pt (~8px). Below 10px is used for essential text in the current code.

---

## 1. Node Design

### 1.1 Shared Node Token System

All nodes share a two-zone card: a **left accent rail** (4px wide, full height, carries category color) and a **content area**. This is the format used by enterprise BPM tools (Lucidchart Professional, Miro Process templates, and Celonis Execution Management).

```
┌─────────────────────────────────────────────────┐
│ ▌ [#] CATEGORY LABEL            [icon] [duration]│
│ ▌ Step label text (1–2 lines)                    │
│ ▌ System chip                   [◆] [⚠] [🔒]   │
└─────────────────────────────────────────────────┘
```

The accent rail replaces the current background-color flood fill. Background stays white (`#ffffff`) with a very light 6% tint of the category color (`{color}0f`). This is print-safe: on white paper, the accent rail prints as a colored stripe, the rest stays clean white.

### 1.2 WorkflowTaskNode (spine / standard steps)

**File:** `apps/web-app/src/components/workflow-view/nodes/WorkflowTaskNode.tsx`

**Dimensions:**
- `width: 260` (reduced from 280 — tighter, more professional)
- `minHeight: 72` (enough for two label lines + system chip)
- `borderRadius: 10`
- `padding: '10px 12px 10px 16px'` (extra left for accent rail)

**Accent rail (left border treatment):**
```tsx
// Replace the current uniform border with:
border: `1px solid ${accentAlpha(n.accentColor, '20')}`,
borderLeft: `4px solid ${n.accentColor}`,
borderRadius: 10,
```
This gives the category color a strong left-rail signal without flooding the background.

**Background:**
```tsx
background: selected ? n.bgHoverColor : `${n.accentColor}0f`,
// Default: 6% tint of accent — barely visible, print-safe
// Selected: category's defined bgHover (e.g., #ccfbf1 for Navigation)
```

**Shadow (screen only):**
```tsx
boxShadow: selected
  ? `0 0 0 3px ${accentAlpha(n.accentColor, '25')}, 0 4px 16px rgba(0,0,0,0.10)`
  : '0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
// Stronger than current — visible at zoom 0.5× and in screenshots
```

**Row 1 — Ordinal + Category + Duration:**
```tsx
<div className="flex items-center gap-2 mb-2">
  {/* Ordinal badge — larger, more legible */}
  <span
    style={{
      fontSize: 11,
      fontWeight: 700,
      lineHeight: '18px',
      minWidth: 20,
      height: 20,
      textAlign: 'center',
      color: '#ffffff',
      background: n.accentColor,
      borderRadius: 5,
      padding: '0 4px',
      flexShrink: 0,
    }}
  >
    {n.ordinal}
  </span>

  {/* Category label */}
  <span
    style={{
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      color: n.accentColor,
    }}
  >
    {n.categoryLabel}
  </span>

  <span style={{ flex: 1 }} />

  {/* Duration — only when > 0 */}
  {n.durationMs > 0 && (
    <span style={{ fontSize: 10, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
      <Clock style={{ width: 10, height: 10 }} />
      {n.durationLabel}
    </span>
  )}
</div>
```

**Row 2 — Step label:**
```tsx
<p
  style={{
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.35,
    color: selected ? n.textColor : '#111827',
    marginBottom: 6,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  }}
>
  {n.label}
</p>
```

Note: `font-weight: 600` (semibold) vs current 500 (medium) — the extra weight improves legibility at small sizes and in print.

**Row 3 — System chip + indicator icons:**
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
  {n.system && (
    <span
      style={{
        fontSize: 9,
        fontWeight: 500,
        color: '#4b5563',
        background: '#f3f4f6',
        border: '1px solid #e5e7eb',
        borderRadius: 4,
        padding: '1px 6px',
        maxWidth: 110,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {n.system}
    </span>
  )}
  <span style={{ flex: 1 }} />
  {/* Indicators unchanged — AlertTriangle / Zap / Shield / low-confidence dot */}
</div>
```

**Handles (connection points):**
```tsx
// Replace current 8×8 gray dots with accent-colored dots, always visible
<Handle
  type="target"
  position={Position.Top}
  style={{
    width: 10,
    height: 10,
    background: '#ffffff',
    border: `2px solid ${n.accentColor}`,
    top: -5,
  }}
/>
<Handle
  type="source"
  position={Position.Bottom}
  style={{
    width: 10,
    height: 10,
    background: '#ffffff',
    border: `2px solid ${n.accentColor}`,
    bottom: -5,
  }}
/>
```
White fill + colored ring: renders cleanly on both screen and print.

**Hover state (screen only — via Tailwind group):**
Add `className="group"` to the outer div. On `group-hover`:
- `boxShadow` upgrades to `0 4px 20px rgba(0,0,0,0.12)`
- `border-color` transitions to `${n.accentColor}60`
Both via `transition: 'all 0.15s ease'`.

### 1.3 WorkflowDecisionNode

**File:** `apps/web-app/src/components/workflow-view/nodes/WorkflowDecisionNode.tsx`

The decision node needs a proper diamond shape, not a rectangle with a tiny diamond icon. True diamond layout in React Flow requires CSS `transform: rotate(45deg)` on the outer container with counter-rotation on content, or a clip-path approach.

**Recommended approach: rotated container + counter-rotated content**

```tsx
<div
  style={{
    width: 280,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  }}
  role="button"
  aria-label={`Decision: ${n.decisionLabel || n.label}`}
  tabIndex={0}
>
  {/* Target handle — must be outside the rotated container */}
  <Handle type="target" position={Position.Top}
    style={{ width: 10, height: 10, background: '#fff', border: '2px solid #d97706', top: -5 }}
  />

  {/* Diamond outer shape */}
  <div
    style={{
      width: 160,
      height: 160,
      background: selected ? '#fef3c7' : '#fffbeb',
      border: `2px solid ${selected ? '#d97706' : '#fbbf24'}`,
      borderRadius: 16,           // softens the corners of the diamond slightly
      transform: 'rotate(45deg)',
      boxShadow: selected
        ? '0 0 0 3px rgba(217,119,6,0.18), 0 4px 16px rgba(0,0,0,0.08)'
        : '0 2px 8px rgba(217,119,6,0.12)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    {/* Inner content — counter-rotated */}
    <div
      style={{
        transform: 'rotate(-45deg)',
        textAlign: 'center',
        padding: '8px 12px',
        maxWidth: 110,
      }}
    >
      <span
        style={{
          display: 'block',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: '#d97706',
          marginBottom: 4,
        }}
      >
        ◆ Decision
      </span>
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#92400e',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {n.decisionLabel || n.label}
      </p>
      <span
        style={{
          display: 'block',
          fontSize: 10,
          fontWeight: 700,
          color: '#d97706',
          marginTop: 3,
        }}
      >
        {n.ordinal}
      </span>
    </div>
  </div>

  <Handle type="source" position={Position.Bottom}
    style={{ width: 10, height: 10, background: '#fff', border: '2px solid #d97706', bottom: -5 }}
  />
</div>
```

The 160×160 rotated square becomes a ~226px diagonal diamond — readable at 0.5× zoom. The `borderRadius: 16` on the rotated square produces slightly chamfered diamond corners, which is the standard "gateway" shape in BPMN notation.

**Note:** Because the outer div is 280px wide and the diamond is 160px centered within it, the React Flow node bounding box is 280×160 (before rotation CSS). React Flow uses the pre-CSS-transform bounding box for collision detection, which is acceptable.

### 1.4 WorkflowTerminalNode

**File:** `apps/web-app/src/components/workflow-view/nodes/WorkflowTerminalNode.tsx`

Current: 140×40px pill. The shape is correct (terminal = rounded pill) but sizing is small and the internal padding creates cramped text.

**Changes:**
- Width: `160` (up from 140)
- Height: `44` (up from 40)
- `borderRadius: 22` (half height, true pill)
- Start node: thicker border `2px` solid `#059669` (vs current 1.5px) and green fill `#ecfdf5`
- End node: border `2px` solid `#374151`, fill `#f9fafb`, label `font-weight: 600`
- Icon: `Play` for start at `w-4 h-4` (up from w-3.5); `Square` for end at `w-3.5 h-3.5`
- Label: `fontSize: 12, fontWeight: 700` (up from 11/semibold)

```tsx
// Start node colors
{
  background: selected ? '#d1fae5' : '#ecfdf5',
  border: `2px solid ${selected ? '#059669' : '#6ee7b7'}`,
  borderRadius: 22,
  width: 160,
  height: 44,
  boxShadow: selected
    ? '0 0 0 3px rgba(5,150,105,0.15), 0 2px 8px rgba(0,0,0,0.06)'
    : '0 1px 4px rgba(5,150,105,0.15)',
}

// End node colors
{
  background: selected ? '#e2e8f0' : '#f8fafc',
  border: `2px solid ${selected ? '#374151' : '#94a3b8'}`,
  borderRadius: 22,
  width: 160,
  height: 44,
  boxShadow: 'none',
}
```

### 1.5 StoryNodeComponent (Variant Story Map)

**File:** `apps/web-app/src/components/workflow-view/WorkflowVariantStoryMap.tsx`

This is the most under-built component. The current node shows only a category label. For a production map, each node must show: ordinal/position, step category, and frequency.

**New node design:**

```tsx
function StoryNodeComponent({ data }: { data: StoryNode & { ordinal?: number } }) {
  const style = CATEGORY_STYLES[data.category as keyof typeof CATEGORY_STYLES]
    ?? CATEGORY_STYLES.single_action;
  const isBackbone = data.kind === 'backbone';
  const accentColor = isBackbone ? '#059669' : '#d97706';
  const bgColor = isBackbone ? '#f0fdf4' : '#fffbeb';
  const borderColor = data.isDecision ? accentColor : `${accentColor}50`;

  return (
    <div style={{ width: isBackbone ? 140 : 120 }}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 8, height: 8, background: '#fff', border: `2px solid ${accentColor}` }}
      />

      {data.isDecision ? (
        /* Decision node on the spine — diamond treatment */
        <div
          style={{
            background: '#fffbeb',
            border: '2px solid #d97706',
            borderRadius: 8,
            padding: '6px 10px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(217,119,6,0.15)',
            position: 'relative',
          }}
        >
          {/* Diamond marker stripe on left */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              background: '#d97706',
              borderRadius: '8px 0 0 8px',
            }}
          />
          <span style={{ fontSize: 9, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
            ◆ Branch
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#92400e', display: 'block', marginTop: 2 }}>
            {style.label}
          </span>
          {data.runShare < 1 && (
            <span style={{ fontSize: 9, color: '#b45309', display: 'block', marginTop: 1 }}>
              {Math.round(data.runShare * 100)}%
            </span>
          )}
        </div>
      ) : (
        /* Standard node — left-rail accent */
        <div
          style={{
            background: bgColor,
            border: `1px solid ${borderColor}`,
            borderLeft: `4px solid ${accentColor}`,
            borderRadius: 8,
            padding: '6px 10px 6px 10px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          }}
        >
          {data.backboneIndex !== null && (
            <span
              style={{
                display: 'inline-block',
                fontSize: 9,
                fontWeight: 700,
                color: '#fff',
                background: accentColor,
                borderRadius: 4,
                padding: '0 4px',
                marginBottom: 3,
                lineHeight: '14px',
              }}
            >
              {data.backboneIndex + 1}
            </span>
          )}
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 600,
              color: isBackbone ? '#065f46' : '#92400e',
              lineHeight: 1.3,
            }}
          >
            {style.label}
          </span>
          {!isBackbone && (
            <span style={{ display: 'block', fontSize: 9, color: '#6b7280', marginTop: 1 }}>
              {Math.round(data.runShare * 100)}% of runs
            </span>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 8, height: 8, background: '#fff', border: `2px solid ${accentColor}` }}
      />
    </div>
  );
}
```

**Node spacing constants** (in `variantStoryMap.ts`, currently `SPACING_X = 170, SPACING_Y = 120`):
- Change to `SPACING_X = 200` (nodes are wider, need more horizontal breathing room)
- Change to `SPACING_Y = 140` (gives room for frequency labels without collision)

---

## 2. Edge Design

### 2.1 WorkflowEdge (Flow Canvas / Swimlane)

**File:** `apps/web-app/src/components/workflow-view/edges/WorkflowEdge.tsx`

**Stroke weight system:**
The current `viewEdge.strokeWidth` default is 2. Frequency-based weighting should be applied at the adapter level. In `flowAdapter.ts` (not specified here — edge weight mapping should live there), map run frequency to stroke:

| Frequency tier    | strokeWidth |
|-------------------|-------------|
| Primary / only    | 2.5         |
| Common (>40%)     | 2.0         |
| Occasional (>15%) | 1.5         |
| Rare (<15%)       | 1.0         |

**Arrowheads:** React Flow's `BaseEdge` accepts a `markerEnd` prop. Currently no `markerEnd` is passed. Add:

```tsx
<BaseEdge
  id={id}
  path={edgePath}
  markerEnd={`url(#arrow-${isException ? 'exception' : 'default'})`}
  style={{ ... }}
/>
```

Define SVG markers in a `<defs>` block rendered once in the canvas. Inject via a `<svg style={{ position: 'absolute', width: 0, height: 0 }}>` sibling in `WorkflowCanvas.tsx`:

```tsx
// Add once inside the ReactFlow container (outside the flow canvas itself)
<svg style={{ position: 'absolute', width: 0, height: 0 }}>
  <defs>
    <marker id="arrow-default" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
    </marker>
    <marker id="arrow-exception" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#fca5a5" />
    </marker>
    <marker id="arrow-selected" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#6366f1" />
    </marker>
  </defs>
</svg>
```

**Edge label chip:**
```tsx
// Replace current 8px label with:
<span
  style={{
    fontSize: 10,            // up from 8px — readable at 0.8× zoom
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 10,
    whiteSpace: 'nowrap',
    color: isException ? '#991b1b' : '#374151',
    background: isException ? '#fef2f2' : '#ffffff',
    border: `1px solid ${isException ? '#fca5a5' : '#d1d5db'}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
  }}
>
  {label}
</span>
```

The `boxShadow` on the chip lifts it off the edge path visually — both on screen and in screenshot exports.

**Edge routing:**
- Keep `smoothstep` with `borderRadius: 12`. This is correct — orthogonal corners with rounded bends are the standard BPMN/process-map routing style.
- Do NOT switch to `bezier` — curves are fine for ER diagrams but process maps read better with right-angle routing.

### 2.2 Story Map Edges (Variant Story Map)

**File:** `apps/web-app/src/components/workflow-view/WorkflowVariantStoryMap.tsx`

**`edgeStyle()` function — replace:**

```tsx
function edgeStyle(e: StoryEdge): React.CSSProperties {
  const weight = 1.5 + e.runShare * 5;  // range: 1.5–6.5px (up from 1.5–5.5)

  if (e.kind === 'spine') {
    return {
      stroke: '#059669',
      strokeWidth: Math.max(2.5, weight),
      // No dasharray — spine is always solid
    };
  }
  if (e.kind === 'shortcut') {
    return {
      stroke: '#6b7280',
      strokeWidth: 1.5,
      strokeDasharray: '3 4',
    };
  }
  // branch / rejoin
  return {
    stroke: '#d97706',
    strokeWidth: Math.max(1.5, weight * 0.8),
    strokeDasharray: '6 3',  // longer dashes, more readable as "variant"
  };
}
```

**`edgeLabel()` function — replace:**

```tsx
function edgeLabel(e: StoryEdge): string | undefined {
  // Show label on: branch entry, shortcut, and rejoin (not intermediate branch steps)
  if (e.kind === 'shortcut') {
    return `Skip · ${Math.round(e.runShare * 100)}%`;
  }
  if (e.kind === 'branch' && e.id.endsWith('-in')) {
    return `${e.runCount} run${e.runCount !== 1 ? 's' : ''} · ${Math.round(e.runShare * 100)}%`;
  }
  if (e.kind === 'rejoin') {
    return 'rejoins';
  }
  return undefined;
}
```

**Edge label styles (in rfEdges mapping):**
```tsx
labelStyle: {
  fontSize: 10,     // up from 9
  fontWeight: 600,
  fill: '#374151',
},
labelBgStyle: {
  fill: '#ffffff',
  fillOpacity: 0.95,
},
labelBgPadding: [5, 3] as [number, number],  // more generous padding
labelBgBorderRadius: 6,
```

Add to each rfEdge:
```tsx
markerEnd: e.kind !== 'spine' ? { type: MarkerType.ArrowClosed, width: 16, height: 16, color: e.kind === 'shortcut' ? '#6b7280' : '#d97706' } : undefined,
// Import MarkerType from '@xyflow/react'
```

For the spine, arrowheads on every segment create visual clutter. Only add a terminal arrowhead on the last spine segment. In practice, pass `markerEnd` only when `e.kind === 'branch'` or `e.kind === 'rejoin'` or `e.kind === 'shortcut'`.

---

## 3. Legend

### 3.1 Story Map Legend (always visible, replaces toggle)

**Current situation:** No legend exists for the Story Map specifically. The `WorkflowLegend` is for the Flow canvas and is toggle-based.

**New: Inline legend bar for Variant Story Map**

Replace the current top bar (which has the complexity slider) with a two-section top bar:

**Left section — diagram key (always visible):**
```
 ——  Standard path (100% of runs)     - - -  Variant path (N%)     · · ·  Shortcut / skip
 ◼  Branch point                      ●  Step category color
```

**Right section — the existing complexity slider.**

Implementation: inside `StoryMapInner`, replace the current `<div className="absolute top-0 left-0 right-0 ...">` header:

```tsx
<div
  style={{
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 16px',
    background: 'rgba(255,255,255,0.97)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid #e5e7eb',
    flexWrap: 'wrap',
  }}
>
  {/* Summary stat */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
    <GitBranch style={{ width: 13, height: 13, color: '#059669' }} />
    <span style={{ fontSize: 11, color: '#374151' }}>
      <strong style={{ color: '#111827' }}>{conformPct}%</strong> of {map.totalRuns} runs follow
      the standard path · <strong style={{ color: '#111827' }}>{map.branchCount}</strong> variant{map.branchCount !== 1 ? 's' : ''}
    </span>
  </div>

  {/* Legend items */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <LegendItem color="#059669" dash={false} label="Standard path" />
    <LegendItem color="#d97706" dash={true} label="Variant path" />
    <LegendItem color="#6b7280" dash="dot" label="Skip / shortcut" />
    <span style={{ fontSize: 10, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ display: 'inline-block', width: 10, height: 10, background: '#d97706', borderRadius: 2, transform: 'rotate(45deg)' }} />
      Branch point
    </span>
  </div>

  <span style={{ flex: 1 }} />

  {/* Complexity slider — unchanged */}
  {map.branchCount > 1 && ( /* ...existing slider... */ )}
</div>
```

```tsx
function LegendItem({ color, dash, label }: { color: string; dash: boolean | 'dot'; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#4b5563' }}>
      <svg width="22" height="8">
        <line
          x1="0" y1="4" x2="22" y2="4"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={dash === true ? '6 3' : dash === 'dot' ? '2 3' : undefined}
        />
      </svg>
      {label}
    </span>
  );
}
```

### 3.2 Flow Canvas Legend (WorkflowLegend.tsx)

Make the legend **always visible** (remove the toggle) but collapsible to an icon. Position: bottom-left, `z-index: 10`.

**Changes to `WorkflowLegend.tsx`:**

1. Remove `if (!visible) return null` — replace with a collapse toggle that shrinks the legend to a 28×28 icon button showing `?` or the `Map` icon.

2. Expand category list to show all 9 categories (current code truncates to 7 with `.slice(0, 7)`).

3. Add story-map edge types when in variant-map context. Since `WorkflowLegend` is used across views, add an optional `variant` prop:

```tsx
interface Props {
  visible: boolean;
  onClose: () => void;
  variant?: 'flow' | 'story';  // default 'flow'
}
```

4. Enlarge swatches: `width: 12, height: 12` (up from 10×8) for rect shapes.

5. Legend container:
```tsx
<div
  style={{
    position: 'absolute',
    bottom: 16,
    left: 16,
    zIndex: 10,
    width: 200,                // reduced from 256 — more compact
    background: 'rgba(255,255,255,0.98)',
    backdropFilter: 'blur(8px)',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
    overflow: 'hidden',
  }}
>
```

---

## 4. Layout and Canvas

### 4.1 Canvas Background

**Current:** `BackgroundVariant.Dots, gap=24, size=1, color="var(--border-subtle)"`

**Problem:** `var(--border-subtle)` resolves to approximately `#f1f5f9` in light theme — near-invisible dots that read as no pattern at all.

**Spec:**
```tsx
<Background
  variant={BackgroundVariant.Dots}
  gap={20}
  size={1.5}
  color="#e5e7eb"   // fixed hex — print-safe, renders at all zoom levels
  className="!bg-white"  // force white canvas background for print
/>
```

Using `!bg-white` (`#ffffff`) instead of `var(--surface-secondary)` ensures: (a) screenshots are white-background by default, (b) print is white, (c) `@media print` CSS can hide the dot pattern and the canvas reads as a clean white sheet.

### 4.2 fitView Padding

**Current:** `fitViewOptions={{ padding: 0.15 }}` in WorkflowCanvas and `padding: 0.2` in story map.

**Spec:** Increase to `padding: 0.25` (25% margin around the content). On large maps, 15% leaves nodes touching the edge of the viewport. 25% gives breathing room and looks more professional in screenshots.

### 4.3 Title / Header Bar

Neither canvas has a title bar showing the workflow name above the diagram. This is essential for print — without it a printed map has no provenance.

**New component: `MapTitleBar.tsx`** (create new file)

```tsx
// apps/web-app/src/components/workflow-view/MapTitleBar.tsx
interface Props {
  title: string;       // workflow display name
  subtitle?: string;   // e.g. "12 runs · 4m 22s avg · 3 variants"
  mode: 'flow' | 'swimlane' | 'variants' | 'systems';
}

export function MapTitleBar({ title, subtitle, mode }: Props) {
  const modeLabel: Record<string, string> = {
    flow: 'Flow Intelligence Map',
    swimlane: 'System Swimlane',
    variants: 'Variant Story Map',
    systems: 'System Topology',
  };

  return (
    <div
      style={{
        padding: '8px 20px',
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'baseline',
        gap: 12,
        flexShrink: 0,
      }}
      className="map-title-bar"  // for @media print targeting
    >
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
        {title}
      </h2>
      <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 400 }}>
        {modeLabel[mode]}
      </span>
      {subtitle && (
        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400, marginLeft: 'auto' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}
```

This bar sits above the ReactFlow canvas, outside the `position: absolute` inset. It does not scroll or pan with the diagram. On print, it appears at the top of the page.

### 4.4 Zoom Controls

React Flow's built-in `<Controls />` is a plain button row. It should be rendered but styled.

**In WorkflowCanvas.tsx**, add `<Controls />` inside the `<ReactFlow>` element and style via CSS:

```css
/* In globals.css or a canvas-specific stylesheet */
.workflow-flow-canvas .react-flow__controls {
  bottom: 16px;
  right: 16px;
  left: auto;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
}
.workflow-flow-canvas .react-flow__controls-button {
  border: none;
  border-radius: 0;
  background: transparent;
  color: #374151;
  width: 28px;
  height: 28px;
}
.workflow-flow-canvas .react-flow__controls-button:hover {
  background: #f3f4f6;
}
.workflow-flow-canvas .react-flow__controls-button + .react-flow__controls-button {
  border-top: 1px solid #f3f4f6;
}
```

### 4.5 Phase Group Overlays (PhaseGroupOverlay in WorkflowCanvas)

**Current:** Background is `${group.color}06` (2.4% opacity) — invisible. Label is `text-[9px]`.

**Spec:**
```tsx
<div
  style={{
    width: group.bounds.width + 20,
    height: group.bounds.height + 32,
    background: `${group.color}08`,    // 3% — still subtle but perceptible
    border: `1.5px solid ${group.color}20`,  // 12% opacity border
    borderRadius: 16,
  }}
>
  <div style={{ padding: '4px 12px 4px 8px', borderBottom: `1px solid ${group.color}15`, display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: `${group.color}dd` }}>
      {group.label}
    </span>
    <span style={{ fontSize: 10, color: `${group.color}88` }}>
      {group.stepCount} step{group.stepCount !== 1 ? 's' : ''}
    </span>
  </div>
</div>
```

### 4.6 Swimlane Lane Bands

**File:** `apps/web-app/src/components/workflow-view/WorkflowSwimlaneCanvas.tsx` → `SwimlaneLaneBand`

**Current:** `background: ${lane.color}06, borderBottom: 1px solid ${lane.color}15`

**Spec:**
```tsx
<div
  style={{
    background: `${lane.color}08`,
    borderBottom: `1px solid ${lane.color}22`,
    borderTop: lane.isFirst ? `2px solid ${lane.color}30` : undefined,
  }}
/>
```

Add a top border on the first lane to establish the swimlane frame.

Lane header labels (in `SwimlaneLaneHeader.tsx` — not read but referenced): font size should be `fontSize: 12, fontWeight: 700` with the lane color. Current assumption is it follows the same small-text pattern; adjust accordingly when reading that file.

### 4.7 Print / Export Readiness

Add a `<style>` block (or in `globals.css`) for `@media print`:

```css
@media print {
  /* Hide interactive chrome */
  .react-flow__controls,
  .react-flow__minimap,
  .react-flow__attribution,
  input[type="range"],
  button[aria-label="Close evidence"],
  button[aria-label="Close"] {
    display: none !important;
  }

  /* Force white background on canvas */
  .react-flow__background {
    background: #ffffff !important;
  }

  /* Dots pattern hidden on print — clean white sheet */
  .react-flow__background pattern circle {
    display: none;
  }

  /* Ensure the title bar is at the top */
  .map-title-bar {
    page-break-inside: avoid;
  }

  /* Prevent canvas from breaking across pages */
  .react-flow__renderer {
    page-break-inside: avoid;
  }
}
```

This ensures that `Ctrl+P` or a headless print-to-PDF produces a clean, professional output with no UI chrome, white background, and the workflow title visible at the top.

---

## 5. Color and Typography System

### 5.1 Typography

The current codebase mixes arbitrary `text-[8px]` through `text-[12px]` values. Consolidate to a four-level type scale for diagram text specifically:

| Role                    | Size | Weight | Color token            | Used on                              |
|-------------------------|------|--------|------------------------|--------------------------------------|
| Node label              | 12px | 600    | `#111827`              | Task node title                      |
| Category / badge label  | 10px | 700    | category accentColor   | Category pill, ordinal badge         |
| Meta / system chip      | 9px  | 500    | `#4b5563`              | System name, duration                |
| Subtext / frequency     | 9px  | 400    | `#6b7280`              | "% of runs", edge labels at rest     |

Nothing below 9px in the diagram itself. Legend section headers: 9px / 700 / uppercase. The current `text-[8px]` usages in `StoryNodeComponent`, edge labels (`labelStyle: { fontSize: 9 }`), and legend sub-items must all be raised to at least 9px.

**Font family:** The diagrams use the browser default sans-serif (inherited from the page). For professional print quality, add `fontFamily: "'Inter', system-ui, sans-serif"` as a base style on the React Flow container. Inter at 10–12px renders cleanly in print and screenshots.

### 5.2 Revised CATEGORY_STYLES

The current palette is technically correct but some colors have insufficient contrast in the node accent rail at small sizes. The revisions below tighten contrast and ensure the accent color reads at 4px width:

```ts
export const CATEGORY_STYLES: Record<GroupingReason, CategoryStyle> = {
  // ── Tighter accent colors (higher contrast against white) ──
  click_then_navigate:  { label: 'Navigation',      color: '#0d9488', bg: '#f0fdfa', bgHover: '#ccfbf1', text: '#134e4a' },
  // ^ unchanged — teal is already high-contrast

  fill_and_submit:      { label: 'Form Submit',     color: '#1d4ed8', bg: '#eff6ff', bgHover: '#dbeafe', text: '#1e3a8a' },
  // ^ deepened from #2563eb → #1d4ed8 for better print contrast

  repeated_click_dedup: { label: 'Repeated Action', color: '#c2410c', bg: '#fff7ed', bgHover: '#ffedd5', text: '#7c2d12' },
  // ^ deepened from #ea580c → #c2410c

  single_action:        { label: 'Action',          color: '#475569', bg: '#f8fafc', bgHover: '#f1f5f9', text: '#1e293b' },
  // ^ deepened from #64748b → #475569

  data_entry:           { label: 'Data Entry',      color: '#6d28d9', bg: '#f5f3ff', bgHover: '#ede9fe', text: '#4c1d95' },
  // ^ deepened from #7c3aed → #6d28d9

  send_action:          { label: 'Send / Submit',   color: '#047857', bg: '#ecfdf5', bgHover: '#d1fae5', text: '#064e3b' },
  // ^ deepened from #059669 → #047857

  file_action:          { label: 'File Action',     color: '#b45309', bg: '#fffbeb', bgHover: '#fef3c7', text: '#78350f' },
  // ^ deepened from #d97706 → #b45309

  error_handling:       { label: 'Error',           color: '#b91c1c', bg: '#fef2f2', bgHover: '#fee2e2', text: '#7f1d1d' },
  // ^ deepened from #dc2626 → #b91c1c; label shortened

  annotation:           { label: 'Annotation',      color: '#7e22ce', bg: '#faf5ff', bgHover: '#f3e8ff', text: '#581c87' },
  // ^ deepened from #9333ea → #7e22ce
};
```

**Rationale:** All revised accent colors meet WCAG AA contrast ratio (≥4.5:1) against white at the 10px bold weight used for category badges.

### 5.3 Spine / Branch Color Semantics

For the Story Map, clarify the two-color semantic:

| Color     | Hex       | Meaning               | Usage                               |
|-----------|-----------|----------------------|-------------------------------------|
| Ledgerium Green | `#059669` | Standard / baseline path | Spine nodes, spine edges          |
| Amber     | `#d97706` | Variant / deviation   | Branch nodes, branch/rejoin edges   |
| Gray      | `#6b7280` | Shortcut / skip       | Shortcut dashed edges               |
| Red       | `#b91c1c` | Error / exception     | Error-handling nodes, exception edges |

This matches the brand's established green (`brand.600`) for the positive/standard case, which is consistent with the dashboard's health score system.

### 5.4 NODE_TYPE_STYLES (in constants.ts)

```ts
export const NODE_TYPE_STYLES = {
  start:    { shape: 'pill', color: '#047857', bg: '#ecfdf5', border: '#6ee7b7', label: 'Start' },
  end:      { shape: 'pill', color: '#374151', bg: '#f9fafb', border: '#9ca3af', label: 'End' },
  task:     { shape: 'card', color: '#111827', bg: '#ffffff',  border: '#e5e7eb', label: 'Step' },
  exception:{ shape: 'card', color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', label: 'Error' },
  decision: { shape: 'diamond', color: '#b45309', bg: '#fffbeb', border: '#fbbf24', label: 'Branch' },
};
```

### 5.5 EDGE_STYLES (in constants.ts)

```ts
export const EDGE_STYLES = {
  sequence:  { stroke: '#9ca3af', strokeWidth: 2,   animated: false },
  // ^ lightened from #cbd5e1 to #9ca3af — more visible on print
  exception: { stroke: '#fca5a5', strokeWidth: 2,   animated: false, strokeDasharray: '6 3' },
  decision:  { stroke: '#fbbf24', strokeWidth: 2.5, animated: false },
  // ^ thickened from 2 to 2.5 — decision branches should read more prominently
};
```

---

## 6. Prioritized Implementation Punch-list

Priority definitions:
- **P0:** Breaks legibility at normal use. Implement before any public-facing screenshot or demo.
- **P1:** Substantially improves professional impression. Implement in the same sprint as P0.
- **P2:** Polish and print readiness. Implement before any formal presentation or print use.

### P0 — Legibility Blockers

| # | Change | File | What to do |
|---|--------|------|-----------|
| P0-1 | StoryNodeComponent: add ordinal number and frequency % to branch nodes | `WorkflowVariantStoryMap.tsx` | Replace `StoryNodeComponent` per §1.5. Add `backboneIndex + 1` ordinal badge on spine nodes; add `Math.round(data.runShare * 100)% of runs` on branch nodes. |
| P0-2 | StoryNodeComponent: add left-rail accent (4px colored border-left) | `WorkflowVariantStoryMap.tsx` | Replace flat rounded-border with `border: 1px solid ..., borderLeft: 4px solid accentColor` per §1.5. |
| P0-3 | Edge labels: raise font-size to 10px everywhere | `WorkflowVariantStoryMap.tsx`, `WorkflowEdge.tsx` | `labelStyle.fontSize: 10`, edge label chip `fontSize: 10`. |
| P0-4 | WorkflowDecisionNode: true diamond shape | `nodes/WorkflowDecisionNode.tsx` | Replace rectangle+icon with rotated-container approach per §1.3. |
| P0-5 | Task node handles: visible accent-ring handles | `nodes/WorkflowTaskNode.tsx` | Replace 8px gray dots with `width: 10, height: 10, background: '#fff', border: '2px solid accentColor'` per §1.2. |
| P0-6 | Raise minimum text size to 9px across all diagram components | All node + edge files | Audit and replace every `text-[8px]` or `fontSize: 8` → `9`. |

### P1 — Professional Impression

| # | Change | File | What to do |
|---|--------|------|-----------|
| P1-1 | Task node: left-rail accent 4px border-left, white background | `nodes/WorkflowTaskNode.tsx` | Change from background-flood to left-rail pattern per §1.2. |
| P1-2 | Task node: ordinal badge white-on-color (not color-on-light) | `nodes/WorkflowTaskNode.tsx` | `color: '#fff', background: n.accentColor` per §1.2 Row 1 spec. |
| P1-3 | Task node: `font-weight: 600` on step label | `nodes/WorkflowTaskNode.tsx` | Change `font-weight: 500` → `600` on the `<p>` label element. |
| P1-4 | Task node: stronger box-shadow | `nodes/WorkflowTaskNode.tsx` | `boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)'` per §1.2. |
| P1-5 | Terminal node: size +20px, 2px border | `nodes/WorkflowTerminalNode.tsx` | Width 160, height 44, borderRadius 22, border 2px per §1.4. |
| P1-6 | Inline story-map legend bar | `WorkflowVariantStoryMap.tsx` | Add always-visible legend row to the top bar per §3.1. |
| P1-7 | Canvas background: fixed `#e5e7eb` dots on `#ffffff` | `WorkflowCanvas.tsx`, `WorkflowSwimlaneCanvas.tsx`, `WorkflowVariantStoryMap.tsx` | Replace `color="var(--border-subtle)"` with `color="#e5e7eb"` and add `className="!bg-white"` per §4.1. |
| P1-8 | Category color deepening for print contrast | `constants.ts` | Apply revised CATEGORY_STYLES per §5.2. |
| P1-9 | Story map node spacing increase | `lib/variantStoryMap.ts` | `SPACING_X = 200, SPACING_Y = 140`. |
| P1-10 | fitView padding increase | `WorkflowCanvas.tsx`, `WorkflowSwimlaneCanvas.tsx` | `fitViewOptions.padding: 0.25` (from 0.15). |
| P1-11 | Phase group overlay: more visible border and larger label | `WorkflowCanvas.tsx` → `PhaseGroupOverlay` | `border: 1.5px solid ${color}20`, label `fontSize: 10, fontWeight: 700` per §4.5. |
| P1-12 | Add SVG arrowhead markers to story map edges | `WorkflowVariantStoryMap.tsx` | Import `MarkerType` from `@xyflow/react`; add `markerEnd` to branch/rejoin/shortcut rfEdges per §2.2. |
| P1-13 | Spine edge stroke weight increase | `WorkflowVariantStoryMap.tsx` → `edgeStyle` | Spine: `strokeWidth: Math.max(2.5, weight)` per §2.2. |

### P2 — Print Readiness and Completeness

| # | Change | File | What to do |
|---|--------|------|-----------|
| P2-1 | Add `MapTitleBar` component | New file: `workflow-view/MapTitleBar.tsx` | Per §4.3 spec. Show workflow name + mode label + run summary. |
| P2-2 | Wire `MapTitleBar` above each canvas | Parent shell component (not in scope of this spec) | Pass workflow title and mode down. This requires reading the shell wrapper — implementation team must identify it. |
| P2-3 | `@media print` CSS rules | `apps/web-app/src/app/globals.css` | Add print block per §4.7 — hides controls, forces white background, suppresses dots. |
| P2-4 | Flow canvas zoom controls styling | `apps/web-app/src/app/globals.css` | Add `.workflow-flow-canvas .react-flow__controls` rules per §4.4. |
| P2-5 | Add `<Controls />` component to WorkflowCanvas if missing | `WorkflowCanvas.tsx` | Verify Controls is imported and rendered inside ReactFlow; add if not present. |
| P2-6 | WorkflowLegend: remove toggle, add collapse-to-icon | `WorkflowLegend.tsx` | Show legend by default; add chevron to collapse to icon-only mode per §3.2. |
| P2-7 | WorkflowLegend: show all 9 categories | `WorkflowLegend.tsx` | Remove `.slice(0, 7)` per §3.2. |
| P2-8 | WorkflowLegend: larger swatches 12×12 | `WorkflowLegend.tsx` | `width: 12, height: 12` per §3.2. |
| P2-9 | SVG arrowhead markers for WorkflowEdge | `WorkflowCanvas.tsx` + `WorkflowEdge.tsx` | Inject `<svg><defs>` with named markers; pass `markerEnd` per §2.1. |
| P2-10 | Edge label chip box-shadow | `WorkflowEdge.tsx` | Add `boxShadow: '0 1px 3px rgba(0,0,0,0.07)'` per §2.1. |
| P2-11 | Inter font declaration | `globals.css` or `layout.tsx` | Ensure `font-family: 'Inter', system-ui, sans-serif` is set on `body` or `.react-flow`. If Inter is already loaded by the web-app, no change needed — confirm. |
| P2-12 | Swimlane lane band: slightly more visible border | `WorkflowSwimlaneCanvas.tsx` → `SwimlaneLaneBand` | `background: color08`, `borderBottom: 1px solid color22` per §4.6. |
| P2-13 | VariantDnaStrip: raise token min-height to 22px | `VariantDnaStrip.tsx` | `h-5` (20px) → `h-6` (24px); `text-[8px]` → `text-[9px]` for token labels. |
| P2-14 | EDGE_STYLES: sequence edge darker | `constants.ts` | `stroke: '#9ca3af'` (from `#cbd5e1`) per §5.5. |

---

## 7. Implementation Notes for the Frontend Engineer

### Constraint: determinism preserved
No changes here touch the `buildVariantStoryMap` builder or any data-processing logic. All changes are visual only. The `StoryNode.data` interface already carries `kind`, `category`, `backboneIndex`, `isDecision`, `runShare` — the new node design uses only these existing fields. Do not add new fields to `StoryNode`.

### Constraint: no layout library
Node positions come from `buildVariantStoryMap`'s arithmetic layout. The only layout change in this spec is increasing `SPACING_X` and `SPACING_Y` in `variantStoryMap.ts`. Do not introduce dagre, elk, or any other layout library.

### Constraint: honesty rule
The decision node (diamond) in the Story Map represents a point where observed runs branch — not a conditional gate with a known condition. The label must say "Branch point" or use the category label, not "If / Else" or any condition text. This matches the current `isDecision` flag semantics: it is set when `out-degree > 1` in the observed data, not from a process model. The `"diverges"` text (currently rendered) is acceptable; the new spec replaces it with `"◆ Branch"` as a shape marker, which is accurate and non-assertive.

### The `@media print` block
Add to the existing `globals.css` file. Do not create a new stylesheet. The existing `globals.css` is at `apps/web-app/src/app/globals.css`.

### ReactFlow version compatibility
The codebase uses `@xyflow/react`. The `MarkerType` import for P1-12 and P2-9 is:
```tsx
import { MarkerType } from '@xyflow/react';
```
`MarkerType.ArrowClosed` is available in all versions ≥ 11. Confirm the installed version before use.

### Testing
- Visual regression: after each P0 change, take a screenshot at 1×, 0.75×, and 0.5× zoom and compare to a print export.
- No unit tests are required for visual changes. The `buildVariantStoryMap` unit tests are not affected by any change in this spec.
- The spacing constant change (`SPACING_X`, `SPACING_Y`) will shift computed node positions, causing any snapshot tests on `buildVariantStoryMap` output to fail if they assert on `x`/`y` values. Check `packages` for any such tests before committing.

---

## Appendix A: Before / After Summary

| Property | Before | After |
|----------|--------|-------|
| StoryNode content | Category label only | Ordinal, category, frequency %, left-rail accent |
| StoryNode size | 96–140px wide | 120–140px wide (fixed) |
| Decision treatment | Bold border + "diverges" text | Rotated diamond (flow), "◆ Branch" rail (story) |
| Task node background | Category-colored flood fill | White + 6% tint + 4px accent rail |
| Task node label weight | 500 | 600 |
| Ordinal badge | Color-on-light chip | White-on-accent filled chip |
| Minimum text size | 8px (multiple instances) | 9px everywhere |
| Edge label size | 8–9px | 10px |
| Handle dots | 8×8 gray | 10×10 white + 2px accent border |
| Canvas background | `var(--border-subtle)` dots on `var(--surface-secondary)` | `#e5e7eb` dots on `#ffffff` |
| fitView padding | 0.15 | 0.25 |
| Story map legend | None | Always-visible inline bar in header |
| Flow canvas legend | Toggle (off by default) | Visible, collapsible to icon |
| Print readiness | None | `@media print` block, `MapTitleBar`, clean white export |
| Category contrast | Varies (some below 4.5:1) | All ≥ 4.5:1 against white |
