# Screen Specs — Workflow Report Page (Redesign)

## Version
1.0 — April 2026

## Layout Container

```
Page width:    min 1024px, max-w-screen-xl (1280px content), centered
Page padding:  px-6 (24px) at 1024px, px-8 (32px) at 1280px+
Main column:   flex-1, max-w-[860px]
Right rail:    w-[220px], hidden below 1280px, sticky top-[80px]
Gutter:        gap-8 (32px) between main column and rail
```

All sections use:
- `bg-white border border-gray-200 rounded-lg` (12px radius, matching existing card token)
- Section internal padding: `px-6 py-5`
- Section heading: `text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4`

---

## Section 1 — Hero (Executive Comprehension Band)

### Purpose
Users must understand: what, how long, how confident, and the top-level health in under 10 seconds.

### Layout
```
Full-width card with a subtle gradient background.
Background: linear-gradient from #f0f7ff (brand lightest) at top-left to white.
Border: 1px solid #e0eeff (brand tint, not default gray-200).
No rounded corners on top (flush with page top area if at viewport edge), rounded-lg otherwise.

Internal layout (two rows):

Row 1 — Identity bar (flex, items-center, gap-6, pb-4, border-b border-gray-100)
  [Back arrow link]  [Workflow title — text-2xl font-bold text-gray-900]  [Spacer]  [Action bar]

Row 2 — Metrics band (grid, grid-cols-6, gap-0, divide-x divide-gray-100, mt-4)
  Cell 1: Duration
  Cell 2: Steps
  Cell 3: Phases
  Cell 4: Confidence
  Cell 5: Systems used (stacked pills if >1)
  Cell 6: Completion status (badge)
```

### Identity Bar Detail

Left side:
- Back arrow (16px, gray-400, hover:gray-700) + "Back to Library" (text-sm text-gray-500)
- Workflow title (text-2xl font-bold text-gray-900, truncate with title tooltip)
- Favorite star button (22px, amber-400 when active, gray-300 when inactive)

Right side (action bar, flex gap-2):
- Share button (`btn-secondary text-xs`, green tint when active)
- Export dropdown trigger (`btn-secondary text-xs`, chevron icon)
- "Add to portfolio" button (visible if not yet in a folder, `btn-secondary text-xs`)
- "Run AI Analysis" button (`btn-primary text-xs`, violet tint `bg-violet-600 hover:bg-violet-700 text-white`)

### Metrics Band Detail

Each cell:
```
px-5 py-4
Label: text-[10px] uppercase tracking-wide text-gray-400 mb-1
Value: text-[28px] font-bold tabular-nums text-gray-900
       (animated: number counts up from 0 over 600ms on mount, using requestAnimationFrame)
Sub-label: text-xs text-gray-400
```

Cell 1 — Duration:
- Value: e.g. "14m 32s"
- No color treatment; neutral

Cell 2 — Steps:
- Value: e.g. "24"
- Sub-label: "workflow steps"

Cell 3 — Phases:
- Value: e.g. "4"
- Sub-label: "application phases"

Cell 4 — Confidence:
- Value: e.g. "91%"
- Value color: emerald-600 if >=80%, amber-600 if 60-79%, red-600 if <60%
- Sub-label: "detection confidence"
- Below value: a 4px-tall progress bar (full width of cell), same color as value

Cell 5 — Systems:
- Value: count of unique systems (e.g. "3")
- Sub-label: system name pills stacked vertically (text-[10px] bg-blue-50 text-blue-700 rounded px-1.5 py-0.5)
- Max 3 pills, "+N more" if overflow

Cell 6 — Status:
- Value: "Complete" or "Partial"
- Value color: emerald-600 if complete, amber-600 if partial
- Sub-label: formatted date (e.g. "Apr 13, 2026")

---

## Section 2 — Process Score Quartet

### Purpose
Four scores give an instant health fingerprint. This is the "dashboard within the dashboard."

### Layout
```
Section heading: "Process Intelligence"
Grid: grid-cols-4 gap-4
Each cell: card (white bg, border-gray-200, rounded-lg, px-5 py-4)
```

### Each Score Card

```
Top row: score label (text-xs text-gray-500 uppercase tracking-wide) + score number (text-[32px] font-bold tabular-nums)
Score number color:
  Complexity:      <40 = emerald-600, 40-70 = amber-600, >70 = red-600
  Friction:        <40 = emerald-600, 40-70 = amber-600, >70 = red-600
  Linearity:       >60 = emerald-600, 30-60 = amber-600, <30 = red-600 (inverted)
  Manual Intensity: gray-700 always (neutral — not inherently good or bad)

Progress bar:
  Height: 6px
  Width: full
  Background: gray-100
  Fill: matches number color
  Radius: full
  Animation: width transitions from 0% to final value over 800ms on mount (CSS transition)

Bottom row: one-line interpretation (text-[11px] text-gray-500)
  Complexity:      "Low / Moderate / High complexity"
  Friction:        "Smooth / Some friction / High friction"
  Linearity:       "Straight-through / Some branching / Highly branched"
  Manual Intensity: "Mostly automated / Mixed / Fully manual"

Hover state:
  card border transitions to border-blue-200
  A tooltip appears below (absolute, z-10) with a 2-sentence explanation of what this score means
```

---

## Section 3 — Phase Timeline

### Purpose
Show the workflow as a horizontal sequence of phases with time allocation.

### Layout
```
Section heading: "Phase Timeline"
Container: overflow-x-auto (allows horizontal scroll on narrow viewports)
Inner: flex, gap-0, items-stretch, min-width: max-content
```

### Each Phase Block
```
Width: proportional to phase duration (min 80px, flex-shrink-0)
Height: 64px
Background: white
Border: 1px solid gray-200
Radius: none (phases are flush to each other)
First phase: rounded-l-lg
Last phase: rounded-r-lg
Between phases: a 1px vertical gray-200 divider

Content (two lines):
  Line 1: phase name (text-xs font-medium text-gray-800, truncate)
  Line 2: duration + step count (text-[10px] text-gray-400)

Colored top accent bar:
  4px tall, top edge of card, full width
  Color: uses a 6-color rotation of brand palette:
    blue-500, violet-500, emerald-500, amber-500, rose-500, cyan-500
  (consistent per phase ordinal modulo 6)

Arrow connector:
  Between phases: a right-pointing chevron icon (16px, gray-300) centered vertically
  Absolute-positioned over the gap between adjacent cards
```

### Duration proportion logic
- Total visible width of timeline container = 100%
- Each phase width = (phase.durationMs / total.durationMs) * 100%, clamped to min 80px
- This requires JS calculation of container width; calculate on mount and resize

### Hover state
- Phase card lifts: `shadow-md` + `border-gray-300`
- Tooltip shows: phase system name, step range (e.g. "Steps 3–8"), dominant action type

---

## Section 4 — Insights Feed

### Purpose
Actionable findings, prioritized by severity. The most important section for process owners.

### Layout
```
Section heading row: "Insights"  +  summary badges (right side)
  Summary badges: "N critical" (red pill), "N high" (amber pill), "N medium" (gray pill)
  If zero of a severity: omit that badge

Below heading: category filter pills (horizontal scroll if needed)
  Pills: "All"  "Time Analysis"  "Rework"  "System Efficiency"  "Automation"  "Process Health"
  Active pill: bg-gray-900 text-white
  Inactive pill: bg-gray-100 text-gray-600 hover:bg-gray-200
  Filter is client-side — shows/hides cards without re-fetching

Insight cards: vertical stack, gap-3
```

### Insight Card

```
Card container:
  bg-white border border-gray-200 rounded-lg
  Left accent border: 3px solid, color by severity:
    critical: red-500
    high:     red-400
    medium:   amber-400
    low:      gray-300
    info:     blue-300

Collapsed state (default):
  px-5 py-4
  Row 1: severity badge + category badge + confidence chip (right aligned)
    Severity badge:   text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full
      critical: bg-red-100 text-red-700
      high:     bg-red-50 text-red-600
      medium:   bg-amber-50 text-amber-700
      low:      bg-gray-100 text-gray-600
      info:     bg-blue-50 text-blue-600
    Category badge:   text-[10px] bg-gray-100 text-gray-600 rounded px-2 py-0.5
    Confidence chip:  text-[10px] text-gray-400 ml-auto (right side of row)
  Row 2: title (text-sm font-semibold text-gray-900, mt-1)
  Row 3: description (text-sm text-gray-600, mt-1, max 2 lines, truncated with "..." ellipsis)
  Row 4: "Affected steps: N, N, N" (text-[10px] text-gray-400, mt-2)
         + expand chevron (right aligned, gray-400, 16px)

Expanded state (on click):
  Same rows 1-4 remain visible
  Below a gray-100 divider (mt-3 pt-3):
    Three sub-sections, each with a label (text-[10px] uppercase tracking-wide font-semibold text-gray-500):
      "Evidence"   — text-sm text-gray-700
      "Impact"     — text-sm text-gray-700
      "Suggestion" — text-sm text-gray-700, inside bg-blue-50 rounded-md px-4 py-3
  Expand animation: max-height transition from 0 to auto, 200ms ease-out
  Chevron rotates 180deg when expanded

"Take Action" row (only for automation + system_efficiency categories):
  At bottom of expanded state, separated by divider
  Button: "Explore automation" (text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded px-3 py-1.5)
  Click: scrolls to Section 5 (Automation) and briefly highlights the matched card
```

### Empty State
```
If zero insights:
  Card: bg-emerald-50 border border-emerald-200 rounded-lg px-6 py-8 text-center
  Icon: check-circle, 32px, emerald-500
  Heading: "No inefficiencies detected" (text-base font-medium text-gray-900)
  Sub: noInsightsMessage text (text-sm text-gray-500)
```

---

## Section 5 — Automation Opportunities

### Purpose
Explicit callout of what could be automated, scored, and estimated for time savings.
This is the highest-value action-driver for process owners.

### Layout
```
Section heading row: "Automation Opportunities"
  Right side: "Est. total savings: Xh Ym per run" (text-xs text-emerald-700 font-semibold)

Cards: 2-column grid (grid-cols-2 gap-4) at 1024px+, 1-column below
```

### Automation Opportunity Card
```
bg-white border border-gray-200 rounded-lg px-5 py-4

Top row:
  Automation score gauge (circular, 48px, right floated):
    SVG circle, stroke = violet-500, background stroke = gray-100
    Score 0-100 shown as arc fill
    Number in center: text-[13px] font-bold text-violet-700
  Category chip: text-[10px] bg-violet-50 text-violet-700 rounded px-2 py-0.5
  Category label: one of "Data Entry" / "File Handling" / "Cross-System Transfer" / "Navigation"

Title: text-sm font-semibold text-gray-900 mt-2

Time savings estimate: "~Xm per run saved" (text-xs text-emerald-600 font-medium mt-1)

Description: text-xs text-gray-500 mt-1

Affected steps: text-[10px] text-gray-400 mt-2

CTA: "View automation steps" (text-xs underline text-violet-700, hover: text-violet-900)
  Click: expands inline steps list

Hover state:
  border-violet-300
  Subtle box-shadow: 0 0 0 3px rgba(124,58,237,0.06)
```

### Empty State
```
Single card: bg-gray-50 border border-dashed border-gray-300 rounded-lg px-6 py-8 text-center
  Icon: zap, 24px, gray-400
  Text: "No automation opportunities identified" (text-sm text-gray-500)
```

---

## Section 6 — Bottlenecks

### Purpose
Steps running slower than average. Time-to-fix is high — these deserve visual prominence.

### Layout
```
Section heading: "Bottlenecks"
  Right side: "P90 times shown" (text-[10px] text-gray-400)

List: vertical, gap-3
```

### Bottleneck Row
```
bg-white border border-gray-200 rounded-lg px-5 py-3
flex items-center gap-4

Left: step ordinal badge (28px circle, bg-gray-100, text-sm font-semibold text-gray-700)

Center:
  Step title (text-sm font-medium text-gray-900)
  System name (text-xs text-gray-400)

Right (ml-auto, flex items-center gap-3):
  Duration bar:
    A horizontal mini bar chart (100px wide, 8px tall, rounded)
    Gray background (showing average step duration)
    Red fill (showing this step's duration)
    Proportion: (thisStep.durationMs / longestStep.durationMs) * 100%
    Avg marker: a white vertical tick at the average step position
  Duration label: text-sm font-semibold text-red-600 tabular-nums (e.g. "4m 12s P90")
  Delta label: text-[10px] text-red-400 (e.g. "3.2x avg")
```

### Empty State
```
No card shown if zero bottlenecks — section header shows:
"All steps within expected duration range" (text-sm text-gray-400)
```

---

## Section 7 — Step-by-Step Breakdown

### Purpose
Full sequential step list with duration, application, confidence, and event count.
This is the most detailed section — positioned after executive content.

### Layout
```
Section heading: "Step Breakdown"
  Right side: step count badge (text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5)
  + "Show SOP view" link (text-xs text-blue-600, scrolls to Section 11)

Container: card with overflow-hidden, divide-y divide-gray-100
```

### Step Row (Default)
```
flex items-center gap-3 px-5 py-3
hover: bg-gray-50/60 transition-colors cursor-pointer

Ordinal badge:
  28px × 28px circle, flex-shrink-0
  bg-gray-100 text-sm font-semibold text-gray-600
  (If step is a bottleneck: bg-red-50 text-red-600)
  (If step has low confidence: bg-amber-50 text-amber-600)

Step title: text-sm text-gray-800 flex-1 min-w-0 truncate

Category chip:
  text-[10px] bg-gray-100 text-gray-500 rounded px-2 py-0.5 flex-shrink-0
  (hidden below 1024px to save space)

Application chip:
  text-[10px] bg-blue-50 text-blue-600 rounded px-2 py-0.5 flex-shrink-0

Confidence dot (12px):
  emerald-500 if confidence >= 0.8
  amber-500 if 0.6–0.79
  red-500 if < 0.6
  flex-shrink-0

Duration: text-xs text-gray-400 tabular-nums w-12 text-right flex-shrink-0

Expand chevron: 16px gray-300, flex-shrink-0
```

### Step Row (Expanded, on click)
```
Expansion area below the row (bg-gray-50/50, px-5 py-3):
  Two-column layout:
    Left: "Evidence" — event count, event type breakdown (text-xs text-gray-600)
    Right: "Outcome" — grouping reason translated to plain English (text-xs text-gray-600)
  Full-width row below: source event IDs listed as truncated monospace chips
  Expand animation: same max-height pattern as insight cards
```

### Phase Divider Rows
Inserted between steps when the phase changes:
```
flex items-center gap-3 px-5 py-2 bg-gray-50/80
Phase label chip: text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-50 rounded px-2 py-0.5
Horizontal rule: flex-1 h-px bg-gray-200
```

---

## Section 8 — Friction Points and Decision Points

### Purpose
Side-by-side (2-column) view of detected friction and detected decision points.
Both are structural analysis — not actionable in the same way as insights, so secondary.

### Layout
```
Section heading: "Process Structure"

2-column grid (grid-cols-2 gap-6) at 1024px+
Below 1024px: stacked vertically (single column)

Left column: "Friction Points"
Right column: "Decision Points"
```

### Friction Point Card (within left column)
```
bg-white border border-gray-200 rounded-md px-4 py-3 mb-3

Row 1: type chip (text-[10px] uppercase) + severity badge
  type background colors:
    backtracking:        bg-amber-50 text-amber-700
    context_switching:   bg-violet-50 text-violet-700
    excessive_navigation: bg-blue-50 text-blue-700
    others:              bg-gray-100 text-gray-600

Row 2: description (text-sm text-gray-700 mt-1)
Row 3: "Steps: N, N" (text-[10px] text-gray-400 mt-1)
```

### Decision Point Card (within right column)
```
bg-white border border-gray-200 rounded-md px-4 py-3 mb-3

Row 1: step ordinal chip (font-mono text-[10px] bg-gray-100) + decision type chip + confidence badge
Row 2: step title (text-sm font-medium text-gray-800 mt-1)
Row 3: evidence (text-xs text-gray-500 mt-1)
```

### Empty States
Each column shows a simple text message if its list is empty:
  Friction: "No friction patterns detected"
  Decisions: "No decision points detected"
Both in text-sm text-gray-400.

---

## Section 9 — Variant Paths

### Purpose
Show alternative execution sequences — informs process standardization decisions.
This is a secondary section; many workflows will have zero variants.

### Layout
```
Section heading: "Execution Variants"
  Right side: "N variants observed" (text-xs text-gray-500)
  If zero variants: entire section hidden (no heading rendered)

Cards: vertical stack or 2-col grid if 4+ variants
```

### Variant Card
```
bg-white border border-gray-200 rounded-lg px-5 py-4

Top row:
  "Variant N" label (text-xs text-gray-400)
  Frequency badge: "N runs" (text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5)
  right: frequency bar (60px wide, 6px tall, bg-gray-100, fill bg-blue-400, proportion = runs/total)

Step sequence: a horizontal condensed list of step chips
  Each chip: text-[10px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-600
  Arrows between chips: "→" text-gray-300
  Max 6 chips visible, then "+N more" chip

If this is the "primary" variant:
  "Primary path" badge (emerald-50 text-emerald-700) in top row
```

---

## Section 10 — Rework Patterns

### Purpose
Loops, retries, and revisits add silent cost. This section names them explicitly.

### Layout
```
Section heading: "Rework Patterns"
  Right side: total rework occurrences (text-xs text-amber-600 font-semibold e.g. "7 total occurrences")
  If zero patterns: entire section hidden

List: vertical, gap-3
```

### Rework Row
```
bg-white border border-amber-200 rounded-lg px-5 py-4

Left: amber exclamation circle icon (20px, amber-500)

Content:
  Top: type badge (text-[10px] bg-amber-50 text-amber-700) + severity badge
  Title: description (text-sm font-medium text-gray-900 mt-1)
  Evidence: text-xs text-gray-500 mt-1

Right:
  Occurrence count: text-2xl font-bold text-amber-600 tabular-nums
  "occurrences" label: text-[10px] text-gray-400
  "Steps: N, N" : text-[10px] text-gray-400
```

---

## Section 11 — Standard Operating Procedure

### Purpose
The structured step-by-step procedure. Lower on the page because it's reference material,
not the primary action zone.

### Layout
```
Section heading: "Standard Operating Procedure"
  Right side: "Export SOP" button (text-xs btn-secondary)

Phase groupings: each phase is a sub-section
  Phase heading: text-xs font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 rounded px-3 py-1.5 mb-3

Step list within each phase: vertical stack with connecting line
  Left edge: 2px solid blue-100 line running the full height of the phase group
  Each step: left-offset by 20px, with a small dot (8px, white border 2px solid blue-200, bg white) on the line
```

### SOP Step Row
```
flex items-start gap-3 mb-4

Ordinal: text-xs font-semibold text-blue-600 w-6 text-right flex-shrink-0

Content:
  Instruction: text-sm text-gray-800
  Expected outcome: text-xs text-gray-500 mt-0.5 italic

(No expand needed — SOP steps are fully visible by default)
```

---

## Right Rail — Section Navigator

### Purpose
A sticky vertical nav that lets users jump to any section without scrolling.

### Behavior
- Appears at 1280px+ viewport width
- Collapses to nothing below 1280px (no horizontal bar replacement at this breakpoint)
- Scroll spy: the currently visible section is highlighted in the nav

### Layout
```
position: sticky top-20
width: 200px
padding: pt-2

Section title: text-[10px] uppercase tracking-widest text-gray-400 mb-3 "On this page"

Nav items: vertical list, gap-1
  Each item: text-xs text-gray-500 hover:text-gray-900 cursor-pointer px-2 py-1.5 rounded
  Active item: text-blue-700 font-medium bg-blue-50
  Left indicator: 2px solid blue-600 on left edge when active

Items (in order):
  Executive Summary
  Process Scores
  Phase Timeline
  Insights
  Automation
  Bottlenecks
  Step Breakdown
  Process Structure
  Variants (hidden if zero variants)
  Rework (hidden if zero rework patterns)
  SOP
```

---

## Responsive Behavior

### 1024px (minimum supported)
- Single column layout (no right rail)
- Section 8 (Friction + Decisions) stacks vertically
- Step row: application chip hidden, confidence dot + duration remain

### 1280px
- Main column + right rail appear side by side
- Right rail becomes sticky navigator

### 1440px+
- Content max-width stays at 860px (main) + 220px (rail) + 32px gap = 1112px total
- Outer padding increases to px-12

---

## Visual Effects

### Animated Number Counters (Hero + Score Section)
- On mount, numeric values count up from 0 to their final value
- Duration: 600ms for simple integers, 800ms for percentages
- Easing: ease-out cubic
- Implementation: custom hook `useCountUp(target, duration, easing)`
- Scores in Section 2: same counter animation + progress bar width transition

### Subtle Gradient Cards (Hero)
- Hero background: `background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 60%)`
- No other sections use gradients (avoids visual noise)

### Score Bar Animation (Section 2)
- Progress bars animate width from 0 to final value on mount
- CSS: `transition: width 800ms cubic-bezier(0.4, 0, 0.2, 1)`
- Bars only animate once (on first render, not on re-render)

### Insight Card Expand
- `max-height: 0 → max-height: 500px` (large enough for any insight content)
- `overflow: hidden`
- `transition: max-height 200ms ease-out`
- Chevron: `transform: rotate(0deg) → rotate(180deg)`, same 200ms

### Phase Timeline Proportional Widths
- Computed in JS, applied as inline `style={{ width: '...' }}`
- Minimum width of 80px ensures tiny phases are still readable

### Section Load Skeletons
- Each section shows a pulsing skeleton (using `animate-pulse` Tailwind class)
- Skeleton matches the approximate height of the loaded section
- Skeleton color: bg-gray-100
- Transition from skeleton to content: opacity fade-in 150ms

---

## Tokens Reference (Design System Alignment)

Colors:
- Brand primary: #006fc7 (blue-700 equivalent)
- Brand mid: #0c8de9
- Brand light: #f0f7ff
- Emerald (healthy/good): emerald-500 / emerald-600
- Amber (warning): amber-500 / amber-600
- Red (critical): red-500 / red-600
- Violet (AI/automation): violet-500 / violet-600 / violet-700

Typography:
- Inter font throughout
- Heading sizes: text-[28px] (metric values), text-2xl (page title), text-xl (n/a), text-base (section body)
- Label size: text-[10px] or text-[11px] uppercase tracking-wide

Cards:
- bg-white border border-gray-200 rounded-lg
- Shadow only on hover: shadow-sm or shadow-md

Spacing:
- Section gap: mb-6 (24px) between top-level sections
- Internal card padding: px-5 py-4 or px-6 py-5 depending on density
