# UX Findings — Process Variants Feature: Production-Readiness Polish Review

**Date:** 2026-06-11
**Reviewer:** UX Designer agent
**Scope:** Read-only audit of Map/DNA/List variant story map feature. No product code modified.
**Files read:** WorkflowVariantsMap.tsx, WorkflowVariantStoryMap.tsx, VariantDnaStrip.tsx, WorkflowModeSwitcher.tsx, types.ts (VIEW_MODE_LABELS), WorkflowPageShell.tsx, adapters/variantAdapter.ts

---

## 1. DISCOVERABILITY

### The core problem

The CEO could not find this feature. After reading the code, the reasons are unambiguous.

**Problem 1 — "Process Variants" is the fourth tab in a flat four-button switcher.**
The mode switcher renders `flow | swimlane | variants | systems` as visually identical pill buttons (WorkflowModeSwitcher.tsx line 14, WorkflowPageShell.tsx line 271). There is no count, no badge, no indicator that variants exist or how many there are. A user scanning the page sees four identical labels and has no reason to believe the third one contains a fundamentally different kind of insight — a cross-run divergence map — rather than just a different visual arrangement of the same data.

**Problem 2 — The label is generic.**
The mode label is "Process Variants" (types.ts line 38). The word "variants" carries no immediate meaning to an operations user who has not read documentation. Compare to the Flow mode label "Flow Intelligence," which has a strong action-leading quality. "Process Variants" reads like a tab heading, not an invitation.

**Problem 3 — There is no ambient signal on the workflow library row.**
The dashboard `WorkflowMetadata` type carries `variantCount: number` and `totalRuns: number` (types.ts lines 96-97). Neither is surfaced on the workflow library row as a discoverability hook. A user browsing the library has no way to know that a given workflow has 5 variants before they open it.

**Problem 4 — There is no entry-point from any downstream surface.**
The variant map has no cross-link from the SOP view, from the insights strip, or from any workflow-level metric card. If the insights strip fires a "Low Adherence" warning (WorkflowVariantsMap.tsx line 598-606), there is no link that takes the user directly into variants mode. The variant count in WorkflowMetadata is computed but never visually anchored to a "click to see why" action.

**Problem 5 — Lazy-load is silent.**
When the user first clicks "Process Variants," the shell fires `onRequestVariants()` (WorkflowPageShell.tsx lines 108-110) but there is no loading indicator. If the fetch takes 2+ seconds the component just sits on the current canvas view, giving no feedback. The user has no way to know whether they clicked correctly or whether the feature exists at all.

**Problem 6 — No onboarding nudge for the zero-variant state.**
When a workflow has only one run, `SinglePathView` renders a blue info banner reading "Single recording — no variants to compare yet" (WorkflowVariantsMap.tsx line 687-691). This is informational but passive. It does not link to the record button, does not explain what the user will get by recording again, and does not show how many runs are typically needed before the map becomes interesting.

### Concrete fixes

**F1. Variant badge on the mode button (P0)**
Add a small count chip next to the "Process Variants" label on the mode button when `variantCount > 1`. Example: `Process Variants · 4`. This is a single prop change on WorkflowModeSwitcher — the count is already available in `viewModel.metadata.variantCount`. The badge should only appear when there is something to see, so it functions as a signal not decoration.

Suggested label with badge:
```
Process Variants  [4]
```
Where `[4]` is a violet-tinted chip matching the active state color of the inner toggle (`bg-violet-600 text-white`).

**F2. Rename the mode and change its tooltip copy (P1)**
Change the label from `Process Variants` to `Variants` (shorter, still readable) and rewrite the description from "Compare execution paths and identify deviations" to "See how this workflow runs differently across recordings — divergence points, fastest path, exception patterns." This matches what the feature actually delivers.

**F3. Variant count + CTA on the workflow library row (P1)**
On the workflow library row (or workflow card), render a small annotation:
- When `totalRuns >= 2 && variantCount >= 2`: `N variants detected →` linking directly to the workflow detail page pre-selecting the variants mode. This requires passing a `?mode=variants` query param or similar and having the shell honor it as an initial state override.
- When `totalRuns === 1`: `1 recording` with a muted style, no variant link.

This surface is not part of the current files read, so the specific component is not named here — this is an engineering scope note.

**F4. "See why" link from the insights strip (P1)**
When the insights strip (WorkflowInsightsStrip) fires an insight that has a variant dimension — Low Adherence, Exception-Heavy Path, Faster Alternative — append a button that switches mode to `variants` and optionally pre-selects the relevant path. The link copy should be "Compare paths →". This requires a mode-switch callback to be threaded from the insights strip down to the shell, which is currently possible because the shell already owns the mode state.

**F5. Loading indicator during lazy fetch (P0)**
Between the user clicking the Variants tab and `variantIntelligence` arriving (WorkflowPageShell.tsx line 309-315), render a skeleton or spinner inside the canvas area. The current code renders the `WorkflowVariantsMap` immediately with `intelligence={undefined}`, which silently falls back to single-path display. The user cannot distinguish "loading" from "no variants exist."

**F6. Actionable single-run state (P1)**
Replace the passive info banner in `SinglePathView` with a state that tells the user what to do and what they will get. See Section 3 for the exact copy.

---

## 2. CLARITY OF THE MAP

### What a non-expert sees in 5 seconds on the Map view

The Map view renders a React Flow canvas (WorkflowVariantStoryMap.tsx). The headline bar reads:
> `{conformPct}% of {totalRuns} runs follow the standard path. {branchCount} branches off and rejoin.`

The green spine is visually distinct from amber dashed branches. Edge labels read `{N} runs · {X}%`. A complexity slider appears when `branchCount > 1`. Clicking an edge opens an evidence panel showing run IDs.

**What works:**
- The green spine / amber branch color coding is a reasonable convention. Green = normal, amber = deviation is a standard signal pattern.
- The edge label `N runs · X%` provides the most critical piece of information (observed frequency) in a compact form.
- The `conformPct%` headline gives an immediate summary number.

**What does not work in 5 seconds:**

**C1. There is no legend.**
The map relies on color and edge style to encode meaning but provides no in-canvas legend. A user does not know that green spine = standard path, amber dashed = branch, grey dashed = shortcut (edgeStyle in WorkflowVariantStoryMap.tsx lines 68-72). The label "decision" appears inside nodes marked `isDecision` (line 56-57) but the word "backbone" and "branch" never surface to the user.

**C2. Node labels are category abbreviations, not step names.**
StoryNodeComponent (WorkflowVariantStoryMap.tsx lines 30-62) renders `style.label` — the category label from CATEGORY_STYLES — not the step title. A node on the standard path renders as "CLICK" or "FORM" rather than "Open invoice" or "Submit approval." A non-expert user scanning the map sees a grid of colored boxes with category labels. They cannot identify which specific step is the divergence point without clicking through to the List view.

**C3. Decision nodes say "decision" but give no condition.**
Nodes marked `isDecision` render a small sub-label "decision" (WorkflowVariantStoryMap.tsx line 57). There is no tooltip explaining what the decision condition is, nor is there any connection between the decision node on the Map and the node detail in the inspector. The honesty constraint matters here: the code does not compute a decision condition from the data — it only marks a node as a divergence point. The label "decision" implies more semantic richness than the underlying data supports.

**C4. The complexity slider has no explained purpose.**
The slider label reads "showing N/M" (WorkflowVariantStoryMap.tsx line 159). A user encountering this for the first time does not know what "branches" means in this context or why reducing the count would help. The slider appears without introduction.

**C5. The evidence panel renders raw UUIDs.**
When a user clicks an edge, the evidence panel (WorkflowVariantStoryMap.tsx lines 191-209) renders run IDs as a monospace UUID list: `abc-123-def · 456-ghi-789`. This is accurate but unusable. A user cannot do anything with raw IDs unless there is a link to each run.

### Recommended copy and visual refinements

**R1. Add an inline legend strip above or below the canvas.**
A three-item strip is sufficient:
- Green solid line: Standard path (most runs)
- Amber dashed line: Variant branch
- Grey dashed line: Shortcut (skipped steps)

This does not require a separate component — a `<div>` of three labeled color swatches pinned to the top-left of the canvas, below the headline bar.

**R2. Change "decision" to "divergence point" (P1)**
The sub-label on decision-marked nodes currently says "decision" (line 57 of WorkflowVariantStoryMap.tsx). Since the underlying data does not contain a decision condition — it marks the node as a point where paths diverge — the honest label is "divergence point." This does not fabricate a condition. It accurately describes what is observed.

**R3. Add step name to the StoryNodeComponent tooltip (P1)**
The node component (StoryNodeComponent, WorkflowVariantStoryMap.tsx) has access to `data.label` or equivalent from the node's data shape. It should render a `title` attribute on the outer div with the step name so hovering a node reveals the human-readable label. This does not require the step name to appear inside the node (which would break the layout) but makes the map scannable on hover.

**R4. Rename the slider and add a one-line explanation (P2)**
Change the slider label from "showing N/M" to "Showing top N of M variants". Add a one-line tooltip or nearby annotation: "Reduce to focus on the most common deviations." This explains the feature's purpose without adding visual weight.

**R5. Replace UUID evidence with run count + "View runs →" link (P1)**
The evidence panel currently shows raw run IDs. Replace with: `{N} runs took this path` (already present as a heading, line 195) plus a "View runs →" link that could route to a filtered runs list. If that routing is not available, at minimum do not render the UUIDs — they create visual noise without actionable value. The heading alone is more useful than the heading plus a UUID list.

---

## 3. STATE DESIGN

The following states exist or are missing from the current implementation.

### State 1 — Loading (MISSING)

**When:** User clicks "Process Variants" (or "Variants") tab for the first time. `onRequestVariants` fires but `variantIntelligence` is not yet available.

**What happens today:** `WorkflowVariantsMap` receives `intelligence={undefined}`. `buildVariantData` returns `hasVariantData: false` (variantAdapter.ts line 58). `SinglePathView` renders — indistinguishable from the "no data" state.

**Correct behavior:** Render a loading skeleton in the canvas area.

**Copy:**
```
Analysing runs…
Comparing paths across your recordings to find where the process diverges.
```

**Implementation note:** The shell already has an `isLoading` prop pattern for the main view. A new `isLoadingVariants` boolean (true while `mode === 'variants' && !variantIntelligence && onRequestVariants was called`) would drive a `WorkflowVariantsSkeleton` component that shows three shimmer lines representing a spine and two branches.

### State 2 — Single run (EXISTS, needs copy refinement)

**When:** `totalRuns === 1`. `hasVariantData` is false. `SinglePathView` renders.

**Current copy:**
> "Single recording — no variants to compare yet"
> "Record this workflow multiple times to discover how the process varies across runs. Variant analysis requires at least 2 recordings of the same process."

**Problems:** Passive. Does not tell the user what they get for recording again. Does not link to the record action. The "Observed Path" shown below is useful but the section header "Observed Step Sequence" is technical.

**Recommended copy:**
```
Headline: One recording so far
Body: Record this workflow again to see how the process varies — where people diverge, which path is fastest, and where exceptions happen. Two or more recordings unlock the full variant map.
CTA button: Record now →   (links to extension/record entry point)
```

Below the banner, relabel "Observed Step Sequence" to "Your recorded steps" for plain-language clarity.

### State 3 — Two or more identical runs ("consistent")

**When:** `totalRuns >= 2` but all runs produce identical step-category sequences. `buildVariantStoryMap` would return a map with 0 branches. The `WorkflowVariantStoryMap` null-map fallback fires (WorkflowVariantStoryMap.tsx lines 134-142).

**Current copy:** "Not enough variation to map yet. Switch to List, or record this process again."

**Problems:** This conflates two distinct states: (a) not enough runs yet vs (b) the runs are consistent. These have opposite implications. If runs are consistent, that is a signal of process stability, not a data gap. The current copy implies the user needs to do more work when the correct message might be "your process is running consistently."

**Recommended copy:**
```
Headline: Consistent across {N} recordings
Body: All {N} recordings followed the same path. Ledgerium will surface deviations automatically as new recordings come in.
Secondary action: View in List →  (switches sub-view to list, where the single standard path is visible)
```

Add a small green consistency indicator — a checkmark or "Consistent" badge — to reinforce that this is a good signal rather than an error.

### State 4 — Team plan gate (CURRENTLY SILENT — P0)

**When:** User is on Free or Starter plan. `buildVariantData` in variantAdapter.ts has no plan-gating logic visible. However, the broader system has plan-tier gating. The `WorkflowMetadata.variantCount` field is populated regardless of plan.

**What happens today:** The code does not show a plan gate on the Variants tab or inside the view. A Free-tier user who has recorded multiple runs may see the full map, or they may see a single-path view depending on whether the intelligence data is fetched. The current `variantAdapter.ts` has no plan-tier check. This may be an intentional decision, but if Team+ is intended to be the gate (per the original PRD for process variants), the current implementation is silently non-gating or silently restricts without explaining why.

**If gating is intended — recommended state:**
Show the map in a blurred/locked state with an overlay:

```
Headline: Process variant analysis
Subhead: See exactly where your process diverges and why.
[Unlock on Team plan →]

Sample stat (non-blurred): This workflow has 4 variants across 12 runs.
```

Do not show a blank screen or silently redirect to single-path. Show the feature and gate it explicitly so the user knows what they are missing and can act.

**If gating is not intended** — this is not a UX issue; note for engineering to verify the intended plan scope.

### State 5 — Error loading variant data (MISSING)

**When:** `onRequestVariants` fires but the fetch fails.

**What happens today:** `variantIntelligence` remains `undefined`. `SinglePathView` renders — indistinguishable from the single-run state.

**Correct behavior:**
```
Headline: Could not load variant data
Body: Check your connection and try again.
[Retry]
```

### State 6 — High-complexity spaghetti (EXISTS, partially)

**When:** `branchCount` is large (e.g. 15+ variants). The complexity slider is present but defaults to showing all branches (maxBranches = 99, WorkflowVariantStoryMap.tsx line 91).

**Current behavior:** The map renders all branches at once, which for highly variable processes will produce an unreadable diagram.

**Recommended improvement:** Default `maxBranches` to 3 on first render (top 3 by frequency), not 99. The slider still lets users expand. Add explanatory copy near the slider:
```
Showing top {N} variants · {conformPct}% of runs accounted for
```
This defaults to a readable view for high-complexity processes and gives users the slider as a progressive disclosure mechanism.

---

## 4. THE MAP / DNA / LIST THREE-VIEW MODEL

### Is three views right?

Yes, but the rationale is not communicated. The three views serve genuinely different cognitive tasks:
- Map: spatial understanding of where paths diverge and reconverge
- DNA: dense multi-row comparison — scanning many variants at once for structural patterns
- List: sequential detail — step-by-step breakdown of one path

The problem is the user does not know this before choosing. A user clicking "DNA" for the first time has no way to predict what they will see.

### Is DNA discoverable and labeled clearly?

No.

The label "DNA" (WorkflowVariantsMap.tsx line 202) is a metaphor. It is evocative to people familiar with process analysis tooling but opaque to a first-time user. The VariantDnaStrip.tsx description string (line 7 in the component docstring) accurately describes it as "each recorded path as a row of color-coded step tokens," which is exactly what users need to know before clicking.

**Recommended relabeling:**
- `Map` → keep as `Map` (clear, common mental model)
- `DNA` → rename to `Compare` or `Heatmap`
- `List` → keep as `List`

The tooltip/title attribute on each button (currently set to `VIEW_MODE_LABELS[mode].description`) can carry the explanation. The current description for variants is generic ("Compare execution paths and identify deviations"). Each sub-view button should have its own tooltip:
- Map: "Visualize where paths branch and rejoin"
- Compare: "Scan all variants side by side, step by step"
- List: "Drill into one path with step detail and comparison"

### Cross-navigation (click branch → highlight in DNA/List, evidence → runs)

**Current state:** There is no cross-navigation between views. Clicking a branch in the Map opens an evidence panel in the same Map view. Switching to DNA or List resets all selections. There is no mechanism to say "I selected this branch in the Map — show me which row it is in DNA."

This is a significant gap in a multi-view feature. The `selectedEdgeId` state (WorkflowVariantStoryMap.tsx line 92) and `selectedPathId` state (WorkflowVariantsMap.tsx line 171) are entirely local. They are not shared with the parent or with the shell.

**Recommended fix (P1):**
Lift `selectedPathId` out of WorkflowVariantsMap into the parent, thread it as a prop, and use it to:
- In DNA: add a highlight ring to the row matching the selected variant id
- In List: pre-select the matching path card

This gives the user a coherent "I found something interesting in the Map, let me see the detail in List" journey. Engineering note: this requires a small state lift (selectedPathId from local to parent prop) and prop threading to VariantDnaStrip and the List panel.

**Evidence → runs:**
The evidence panel currently shows raw UUIDs (WorkflowVariantStoryMap.tsx lines 191-209). The `evidenceRunIds` array in the variant data contains run IDs that should link to individual run views if such views exist. See R5 in Section 2.

---

## 5. PRIORITIZED POLISH PUNCH-LIST

Priority definitions:
- P0: Feature is broken or misleading in a way that a first-time user would give up or be misled. Fix before any external demo.
- P1: Feature is functional but a non-trivial user task fails or is significantly harder than it should be. Fix before external launch.
- P2: Improvement to polish and clarity. Fix in the release cycle following launch.

---

### P0 — BLOCKING

**P0-1. Loading state is missing (component: WorkflowPageShell.tsx + WorkflowVariantsMap.tsx)**
When `mode === 'variants'` and `variantIntelligence` is being fetched, the user sees either the previous canvas or a silent single-path view. Add a `WorkflowVariantsSkeleton` component. The condition is `mode === 'variants' && !variantIntelligence && fetchHasBeenCalled`. Without this, the feature appears broken on first click.

Suggested skeleton copy:
```
Analysing variant paths…
```
With three shimmer lines (one wide green spine, two narrower amber branches).

**P0-2. Variant badge on the mode switcher button (component: WorkflowModeSwitcher.tsx)**
Add `variantCount` as an optional prop to `WorkflowModeSwitcher`. When `variantCount > 1`, render a small badge: `{variantCount}` next to the Variants label. Without this, a user scanning the mode buttons has no reason to click Variants over Flow or Swimlane.

Suggested badge: a violet `rounded-full px-1.5 py-0.5 text-[9px] font-bold bg-violet-100 text-violet-700` span after the label text. Active state: white text on violet-600 background (matching the current active button style).

**P0-3. Team-plan gate must be explicit, not silent (component: WorkflowVariantsMap.tsx)**
If Team+ gating is intended, the current implementation silently shows single-path view without explaining why. Implement an explicit gate overlay. If gating is not intended, confirm this and close the item. Either outcome must be explicit — silence is not a valid product state here.

**P0-4. "decision" label is semantically inaccurate (component: WorkflowVariantStoryMap.tsx, line 57)**
The sub-label "decision" on nodes where `data.isDecision === true` implies a branching condition that the data does not contain. The data marks these as divergence points (where recorded paths differ). Change the label to "diverges here". This is an honesty fix, not a style fix.

Suggested copy inside StoryNodeComponent:
```
// was: <span>decision</span>
<span className="mt-0.5 block text-[8px] font-semibold text-emerald-700">diverges here</span>
```

---

### P1 — LAUNCH-BLOCKING

**P1-1. No legend on the Map canvas (component: WorkflowVariantStoryMap.tsx)**
Add a three-item inline legend pinned to the bottom-left of the canvas. No new component needed — a positioned `<div>` inside the `absolute inset-0` container will do.

Content:
```
— (green solid)    Standard path
-- (amber dashed)  Variant branch
.. (grey dashed)   Shortcut (skipped steps)
```

**P1-2. Node labels show category abbreviations, not step names (component: WorkflowVariantStoryMap.tsx, StoryNodeComponent)**
StoryNodeComponent renders `style.label` (a category name like "CLICK" or "FORM"). This is not enough for a user to identify which step they are looking at. Add the `data.label` (the step title) as a `title` attribute on the outer container div so hovering a node shows the step name. If `data.label` is not currently passed through the node data shape built in `buildVariantStoryMap`, it should be added.

**P1-3. Evidence panel renders raw UUIDs (component: WorkflowVariantStoryMap.tsx, lines 204-207)**
Remove the UUID list from the evidence panel. Replace with:
```
{N} runs took this branch
```
If run-detail routing exists, add a "View these runs →" link. If not, the count alone is more useful than opaque IDs.

Suggested replacement for lines 204-207:
```tsx
<p className="mt-1 text-[10px] text-[var(--content-secondary)]">
  {selectedEdge.runCount} run{selectedEdge.runCount !== 1 ? 's' : ''} recorded on this branch.
  {/* Add routing link here when run-list filtering is available */}
</p>
```

**P1-4. Rename "DNA" to "Compare" and add sub-view tooltips (component: WorkflowVariantsMap.tsx, lines 199-211)**
The `DNA` label is opaque to first-time users. Rename to `Compare`. Update title attributes on each of the three sub-view buttons:
- Map: `title="Visualize where paths branch and rejoin"`
- Compare: `title="Scan all variants side by side"`
- List: `title="Step-by-step detail for one path"`

**P1-5. Cross-navigation: lift selectedPathId to shared state (components: WorkflowVariantsMap.tsx + VariantDnaStrip.tsx)**
Lift `selectedPathId` out of `WorkflowVariantsMap` local state. Pass it as a prop to `VariantDnaStrip` and to the List panel. When a path is selected in the Map, switching to Compare should highlight that variant row. Switching to List should pre-select that path card.

**P1-6. Single-run empty state needs an actionable CTA (component: WorkflowVariantsMap.tsx, SinglePathView)**
Replace the passive info banner with the copy specified in Section 3, State 2. Add a "Record now →" button if the record action is accessible from this context, or a "Learn how →" link to a help page. The section heading "Observed Step Sequence" should read "Your recorded steps."

**P1-7. "Consistent" state needs its own message (component: WorkflowVariantStoryMap.tsx, lines 134-142)**
When `!map` fires because all runs are identical (no branches), the current copy says "Not enough variation to map yet." This is wrong for consistent processes. Implement the distinction described in Section 3, State 3. The `StoryMapInner` null-map branch should check whether `variants.length > 1` and all runs are structurally identical before showing this state, and use the appropriate copy.

**P1-8. Default maxBranches to 3, not 99 (component: WorkflowVariantStoryMap.tsx, line 91)**
Change `useState(99)` to `useState(3)`. For high-complexity processes this prevents an unreadable default view. Users can expand via the slider. The slider label should change to: "Showing top {N} of {M} variants".

---

### P2 — POLISH

**P2-1. Slider has no stated purpose (component: WorkflowVariantStoryMap.tsx, lines 157-169)**
Add a brief tooltip or `title` on the slider: "Show fewer variants to focus on the most common deviations."

**P2-2. Quick Compare section header is too small to notice (component: WorkflowVariantsMap.tsx, lines 252-269)**
The "Quick Compare" section heading is `text-[9px] font-semibold text-[var(--content-tertiary)] uppercase`. This is the same visual weight as tertiary labels throughout the panel. At that size it is unlikely to register as a distinct interactive section. Increase to `text-[10px]` and use a slightly more prominent color for the section heading.

**P2-3. "DIVERGES" badge in StepSequenceView is aggressively styled (component: WorkflowVariantsMap.tsx, line 566-569)**
The amber "DIVERGES" badge in the List view step sequence is visually prominent. This is appropriate for a true divergence. Consider adding a tooltip: "This step differs from the standard path." The step row background `bg-amber-50/30` is subtle enough; the badge itself is readable but could use a `title` attribute for accessibility.

**P2-4. SummaryMetric "Divergences" label needs a tooltip (component: WorkflowVariantsMap.tsx, PathSummaryCard)**
The metric "Divergences: {N} deviation points" (line 411) may confuse users who do not know what a deviation point means in this context. Add a `title` attribute: "Steps where this path differs from the standard path."

**P2-5. Insights heading is tertiary weight (component: WorkflowVariantsMap.tsx, line 647)**
"PATH INSIGHTS" is rendered as `text-[9px] font-semibold text-[var(--content-tertiary)] uppercase`. Given that these are the most actionable items on the page (Low Adherence, Exception-Heavy, Faster Alternative), the heading should be at least `text-[10px] text-[var(--content-secondary)]` to not visually compete with the surrounding cards in the wrong direction.

**P2-6. DNA strip instruction text is below the fold for wide variant sets (component: VariantDnaStrip.tsx, line 25-27)**
The instruction "Each row is a recorded path, most frequent first. Outlined cells are where the path deviates from the standard." appears before the rows. For users with many variants this is useful, but the text could be improved: "Each row is one recorded path. Amber-outlined steps are where that run deviated from the most common path." The word "standard" is used throughout the feature with different implied meanings (standard path vs. standard configuration). "Most common path" is more precise given that `isStandard` is determined by frequency (variantAdapter.ts line 95, `isStandardPath: v.isStandardPath === true`).

---

## Summary

The feature is architecturally complete and the data model is honest. The core issues are:

1. The feature is not discoverable — no badge, no ambient signal, silent loading.
2. The Map view requires color-encoding knowledge the user does not have — no legend, "decision" instead of "diverges here."
3. Several states (loading, consistent runs, plan gate, error) are either missing or misleading.
4. The three-view model is sound but the DNA label is opaque and there is no cross-navigation between views.
5. The evidence panel renders raw UUIDs with no actionable link.

All P0 items must be resolved before this feature can be demonstrated to the CEO without the same discoverability failure repeating.
