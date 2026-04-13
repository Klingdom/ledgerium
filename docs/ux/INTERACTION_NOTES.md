# Interaction Notes — Workflow Report Page (Redesign)

## Version
1.0 — April 2026

---

## 1. Page Load Sequence

### Behavior
The page does not wait for all artifacts to resolve before rendering. The hero section
(Section 1) depends only on `workflow.*` fields from the DB record, which are always
present. Each section below declares its own artifact dependency and renders independently.

### Render Order
```
Frame 0ms:   Hero section renders immediately (workflow record fields)
~200ms:      Interpretation artifact resolves → Sections 2, 3, 5, 8, 9, 10 update
~200ms:      Workflow insights artifact resolves → Section 4 updates
~300ms:      Process output artifact resolves → Sections 6, 7 update
~400ms:      SOP artifact resolves → Section 11 updates
```

Each section uses its own React state/loading flag. No global page loading spinner.

### Skeleton Pattern
```tsx
// Section skeleton example (same structure for all sections)
if (!interpretation) {
  return (
    <div className="animate-pulse bg-gray-100 rounded-lg h-48 w-full" />
  );
}
```

---

## 2. Animated Metric Counters

### Trigger
All animated counters in Section 1 (hero) and Section 2 (scores) start when
the component first enters the viewport (Intersection Observer, threshold 0.3).

### Implementation Contract
```tsx
// Hook signature
function useCountUp(
  target: number,
  durationMs: number,
  options?: { delay?: number; decimals?: number }
): number

// Usage in component
const displayValue = useCountUp(confidence, 600)
// Returns a number that increments from 0 to `target` over durationMs
```

### Numbers that animate
- Hero: duration (convert to seconds, animate the second value), steps, phases, confidence %, system count
- Section 2: all four score values (0–100 integers)
- Section 2: progress bar widths (via CSS transition, not the hook)

### Numbers that do NOT animate
- Dates and formatted time strings (e.g. "14m 32s") — these appear immediately
- Step ordinals in the step list — never animate

---

## 3. Insight Card Interaction

### States
1. Collapsed (default)
2. Expanded (after click)
3. Highlighted (scrolled to from a cross-section link)

### Expand/Collapse
- Click anywhere on the card toggles expanded state
- Only one card can be expanded at a time within each category group
- If user expands a card in a different category, previously expanded card collapses

Assumption for engineering: this can be relaxed if the product prefers multiple open
simultaneously — raise with PM if needed.

### Highlighted State
When arriving via a cross-section link (e.g., "Explore automation" button from Section 5):
```
Transition: ring-2 ring-violet-400 ring-offset-1
Duration: 2000ms, then ring fades out
Behavior: card auto-expands and scrolls into view
```

### Category Filter
- Filter state lives in component-local state (no URL param needed)
- When filter changes, cards that don't match the active category get `display: none`
  (not removed from DOM — preserves expand state if user switches filters)
- Active category pill shows a count: "Automation (3)"

---

## 4. Step Row Interaction

### Expand
- Click on a step row expands it to show evidence and outcome
- Expanded steps remain expanded if user clicks another step (multiple can be open)
- Clicking an expanded step's row again collapses it

### Highlight from Insight
When an insight card mentions specific step ordinals, those step numbers are clickable
links (text-blue-600, underline on hover). Clicking one:
1. Scrolls to Section 7 (Step Breakdown)
2. Highlights the relevant step row for 2 seconds (bg-blue-50 transition, then back to normal)
3. Auto-expands the step row

---

## 5. Phase Timeline Interaction

### Hover
- Phase block shows a tooltip (not a native browser tooltip — a custom 200ms fade-in div):
  - Phase name
  - System used
  - Duration
  - Steps N–M
  - Dominant action type
- Tooltip appears above the block, centered horizontally
- Tooltip uses: bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg

### Click
- Clicking a phase block filters Section 7 (Step Breakdown) to show only steps in that phase
- The section heading gains a "Filtered: [Phase Name]" chip with an × to clear
- Phase block gets a ring-2 ring-blue-400 outline while filter is active

---

## 6. Export Dropdown

### Trigger
"Export" button in hero action bar. The button has a chevron icon.

### Dropdown
- Appears below button, right-aligned, z-50
- Closes on: click outside, Escape key, item selection
- Width: 180px

### Items
```
Download Report (JSON)      [Download icon]
Download SOP (JSON)         [Download icon]
Download Workflow (JSON)    [Download icon]
──────────────────────────
Print / Save as PDF         [Printer icon]
```

The divider separates machine-readable exports from the print option.

### Keyboard behavior
- Button opens dropdown on Enter or Space
- Arrow keys navigate items
- Enter selects focused item
- Escape closes without selecting

---

## 7. Share Flow

### States
```
State 1: Not shared
  Button: [Share icon] Share
  Style: btn-secondary (white bg, gray border)

State 2: Enabling share (loading)
  Button: spinner (16px) + "Sharing..."
  Disabled

State 3: Shared
  Button: [Link icon] Shared
  Style: btn-secondary with bg-green-50 border-green-200 text-green-700
  Secondary button appears: [Copy icon] Copy link

State 4: Copied
  Secondary button changes to: [Check icon] Copied!
  Auto-reverts to "Copy link" after 2000ms

State 5: Revoking share (click "Shared" button again)
  Confirmation tooltip (not modal): "Stop sharing? [Yes] [Cancel]"
  Tooltip appears below button, 220px wide
  Yes: revokes token, returns to State 1
  Cancel: closes tooltip, no change
```

---

## 8. "Run AI Analysis" Button

### Behavior
Clicking "Run AI Analysis" in the hero action bar:
1. If agent intelligence artifact already exists: smoothly scrolls to Section 4 (Insights)
   and shows a toast "Showing existing analysis — re-run from AI Agents view"
2. If not yet analyzed: opens the AgentIntelligenceTab in a side panel (slide-in from right,
   640px wide, overlaying the right portion of the content)
   - This side panel is new — it replaces the current tab-based experience for this action
   - Close button (×) in panel header closes it, no state change

Assumption: engineering team must confirm whether the side panel pattern is feasible with
the current routing structure. If not, the button navigates to the existing AI Agents tab view.

---

## 9. Automation Opportunity — "View Automation Steps" Link

### Behavior
- Expands an inline ordered list within the Automation Opportunity card
- List shows: the sequence of affected steps as numbered items, each with step title and duration
- Appears with the same max-height animation as insight card expand
- No navigation away from the page

---

## 10. Right Rail Navigation

### Scroll Spy
- Uses Intersection Observer on each section's top-level `<section>` element
- The nav item corresponding to the section most prominent in the viewport is highlighted
- "Most prominent" = highest intersection ratio among all observed sections
- Updates at 60fps (IntersectionObserver is passive)

### Click to Jump
- Smooth scroll to section (CSS `scroll-behavior: smooth` on the html element)
- After scroll completes, the section heading gets a brief highlight ring:
  `ring-2 ring-blue-200 ring-offset-4`, fades out after 1200ms

### Rail Hidden State
- Below 1280px: rail has `hidden` class (Tailwind `xl:block`)
- No scroll-spy behavior runs when rail is hidden (performance)

---

## 11. Micro-animation Summary Table

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Hero metric numbers | Component enters viewport | Count up from 0 | 600ms | ease-out |
| Score numbers (Section 2) | Component enters viewport | Count up from 0 | 800ms | ease-out |
| Score progress bars | Component enters viewport | width 0 → final | 800ms | cubic-bezier(0.4,0,0.2,1) |
| Phase timeline bars | Component mounts | width 0 → proportional | 500ms | ease-out |
| Insight card expand | Click card | max-height reveal | 200ms | ease-out |
| Insight card chevron | Click card | rotate 0 → 180deg | 200ms | ease-out |
| Step row expand | Click row | max-height reveal | 150ms | ease-out |
| Section skeleton → content | Artifact resolves | opacity 0 → 1 | 150ms | ease-in |
| Phase block highlight | Click in timeline | ring appear | immediate | — |
| Phase block ring fade | Filter cleared | opacity 1 → 0 | 300ms | ease-in |
| Export dropdown | Button click | opacity 0 → 1, translateY -4px → 0 | 120ms | ease-out |
| Share copy feedback | Copy button click | text swap | immediate | — |
| Insight highlighted (cross-link) | Link click | ring-2 pulse | 2000ms | — |

---

## 12. Accessibility Requirements

### Keyboard navigation
- All interactive elements are focusable in logical tab order (left→right, top→bottom)
- Skip-to-content link at page top (hidden until focused)
- Dropdown menus: standard ARIA menu pattern (`role="menu"`, `role="menuitem"`)
- Expandable cards: use `aria-expanded` on the trigger button, `aria-controls` pointing to content id

### Screen reader
- Section headings use proper `<h2>` / `<h3>` hierarchy
- Metric values have aria-label that includes the unit: `aria-label="Duration: 14 minutes 32 seconds"`
- Progress bars: `role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}`
- Animated counters: the final value is rendered in the DOM from the start for screen readers,
  the visual animation is presentational only (use `aria-live="off"` on the counter element)
- Phase timeline: each phase block has `role="button" tabIndex={0}` + appropriate aria-label

### Color
- Severity is never communicated by color alone — severity badges always include text ("high", "critical", etc.)
- Score colors are supplemented by the progress bar fill and the interpretation text below

### Motion
- `prefers-reduced-motion: reduce` disables all count-up animations and progress bar transitions
- Cards still expand/collapse but without the animated max-height (instant show/hide)

---

## 13. Engineering Handoff Notes

### Component Boundaries
Suggested new components to create for this redesign:

```
WorkflowReportPage          — top-level page component, replaces workflows/[id]/page.tsx
  ReportHero                — Section 1
  ProcessScores             — Section 2 (can reuse ScoreCard from InterpretationTab.tsx)
  PhaseTimeline             — Section 3
  InsightsFeed              — Section 4 (replaces InsightsPanel.tsx)
    InsightCard             — reusable sub-component
  AutomationOpportunities   — Section 5
    AutomationCard          — reusable sub-component
  BottlenecksList           — Section 6
  StepBreakdown             — Section 7
    StepRow                 — reusable sub-component
  ProcessStructure          — Section 8 (friction + decisions side-by-side)
  VariantPaths              — Section 9
  ReworkPatterns            — Section 10
  SOPSection                — Section 11
  SectionNavigator          — right rail
  useCountUp                — shared animation hook
  useScrollSpy              — shared scroll tracking hook
```

### Data Dependencies Per Section
| Section | Artifact | Field(s) |
|---|---|---|
| Hero | workflow record | title, stepCount, durationMs, phaseCount, confidence, toolsUsed, completionStatus, createdAt |
| Scores | workflow_interpretation | scores.* |
| Phase Timeline | workflow_interpretation | phases.* |
| Insights | workflow_insights | insights.*, summary, timeBreakdown |
| Automation | workflow_insights | insights where category=automation |
| Bottlenecks | process_output | processDefinition.stepDefinitions (filter for long steps) |
| Step Breakdown | process_output | processDefinition.stepDefinitions + processRun |
| Process Structure | workflow_interpretation | friction.*, decisions.* |
| Variants | process_map | variants (if present) |
| Rework | workflow_interpretation | rework.* |
| SOP | sop | phases, steps, completionCriteria |

### Existing Component Reuse
- `ScoreCard` from `InterpretationTab.tsx` can be extracted and reused
- Export/share logic from `workflows/[id]/page.tsx` can be lifted into `ReportHero`
- `InsightCard` in `InsightsPanel.tsx` is a good foundation but needs expand animation added
- Phase chips pattern from `InterpretationTab.tsx` (horizontal scroll phases) can be adapted

### Not Needed After Redesign
When this single-scroll report is complete, the following tabs become redundant:
- "Report" tab (replaced by Section 1 + Section 7 + Section 11)
- "Insights" tab (replaced by Section 4)
- "Interpretation" tab (replaced by Sections 2, 3, 8, 10)
PM should confirm deprecation timing before tabs are removed.

### Assumptions Requiring Confirmation
1. "Variant paths" data: the current `process_map` artifact schema was not verified to include
   explicit variant sequences. Engineering should check whether this data is available or
   if Section 9 should be deferred.
2. Automation opportunity score (0–100): the `workflow_insights` artifact provides automation
   opportunity detection but not a discrete score per opportunity. Engineering must confirm
   whether the score field exists or needs to be derived.
3. P90 times for bottlenecks: the current `processDefinition.stepDefinitions` does not
   explicitly include P90 — only `durationMs` from a single observation. For single-run
   workflows, treat `durationMs` as the actual time, not P90. Label "P90" only when
   portfolio-level aggregate data is available (future milestone).
4. "Estimated time savings" in Section 5: if the `workflow_insights` artifact does not
   provide a savings estimate field, this should display "est. savings unavailable" rather
   than invent a number.
