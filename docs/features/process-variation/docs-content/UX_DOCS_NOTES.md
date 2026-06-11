# UX Docs Notes — Process Variants + Process Map Views
Date: 2026-06-11
Author: UX Designer agent (read-only analysis; no code changes)

---

## Purpose

This file is input for whoever writes the public-facing documentation or help
content for the Process Variants tab and the Flow Intelligence (process map)
view. It is grounded in what the components actually render — not what they
could theoretically show.

The sample dataset used throughout the UI is "Approve Expense Report (Sample)":
8 recordings across 4 structural variants (Standard ×4, Insertion ×2, Shortcut
×1, Exception ×1). All screenshot recommendations below use this sample.

---

## 1. Screenshot Inventory

Each entry names the screenshot, specifies the exact UI state to capture, and
gives a one-line caption for use in the doc.

---

### Screenshot 1 — Variant Map view (Story Map), all branches visible

**Component:** `WorkflowVariantStoryMap` inside `WorkflowVariantsMap`
**How to reach it:**
- Open "Approve Expense Report (Sample)"
- Click the "Process Variants" tab in the mode switcher
- The default sub-view is "Map" (the Map/DNA/List toggle is in the top-right
  of the variants panel; ensure "Map" is active — it renders highlighted
  in violet)

**Exact state to show:**
- The complexity slider (top-right of the canvas) is at its maximum position
  — all branches visible ("showing 2/2" or "showing 3/3" depending on how
  many distinct branches the engine resolves from the 8 recordings)
- No edge is selected (no evidence panel open at the bottom)
- The headline bar is fully readable: e.g. "62% of 8 runs follow the
  standard path. 2 branches off and rejoin."
- The green spine runs left to right; at least one amber dashed branch is
  visible below it; the shortcut path (dashed grey) is visible if present
- Fit the view so all nodes are visible (use the fitView button or zoom out)

**Caption:**
"The Map view shows the standard path (green spine) and every recorded
deviation as a branch that peels off and rejoins downstream. The headline
shows what share of runs follow the spine."

---

### Screenshot 2 — Map view with one branch edge selected (evidence panel open)

**Component:** `WorkflowVariantStoryMap` — `selectedEdge` state triggered
**How to reach it:** Same state as Screenshot 1, then click the entry edge
of the amber branch (the dashed amber line labelled something like
"2 runs · 25%")

**Exact state to show:**
- The edge is visibly selected (React Flow highlights it)
- The evidence panel is open at the bottom of the canvas: it reads
  "2 runs took this path" and below that shows the session IDs in monospace
  ("sample-variants-005  ·  sample-variants-006")
- The rest of the diagram is still fully visible behind the panel

**Caption:**
"Click any branch edge to see which recorded sessions took that path —
evidence is linked directly to source runs, not inferred."

---

### Screenshot 3 — Map view with complexity slider reduced (1 branch shown)

**Component:** `WorkflowVariantStoryMap` — `maxBranches` set to 1
**How to reach it:** Same as Screenshot 1; drag the complexity slider to the
leftmost position ("showing 1/2" or "showing 1/3")

**Exact state to show:**
- Only the highest-frequency branch is visible; any lower-frequency branches
  are hidden
- The slider position and the "showing 1/N" label are both visible
- The green spine is fully intact

**Caption:**
"The complexity slider shows only the most-frequent branches first — useful
when a process has many variants and the diagram becomes hard to read."

---

### Screenshot 4 — DNA view

**Component:** `VariantDnaStrip`
**How to reach it:** On the Process Variants tab, click "DNA" in the
Map/DNA/List toggle (the toggle is in the top-right of the variants panel)

**Exact state to show:**
- All 4 variant rows are visible (Standard, Insertion, Shortcut, Exception)
- The Standard row (most frequent, green dot) is at the top
- At least one cell in a non-standard row has the amber outline (the
  divergence highlight — this is the `outline: '1.5px solid #d97706'` style)
- Hover over one coloured token so its tooltip label is visible (e.g. "Fill &
  Submit")
- The instructional line at the top is readable: "Each row is a recorded
  path, most frequent first. Outlined cells are where the path deviates from
  the standard."

**Caption:**
"The DNA view puts every recorded variant on its own row. Amber-outlined
tokens are steps that differ from the standard path."

---

### Screenshot 5 — List view, Standard Path selected, no comparison active

**Component:** `WorkflowVariantsMap` with `view === 'list'`
**How to reach it:** On the Process Variants tab, click "List" in the toggle

**Exact state to show:**
- The left rail shows all 4 path cards (Standard Path green, Fastest blue,
  Exception Heavy red, Variant indigo — exact colours depend on how the
  engine classifies the Shortcut and Insertion variants)
- The Standard Path card is selected (ring border visible)
- The right panel shows the PathSummaryCard for the Standard Path: Frequency
  shows "50%" and "4 of 8 runs", Steps shows "5", Duration shows the
  formatted avg, Divergences shows "0"
- The Step Sequence section below shows all 5 steps without any DIVERGES
  badge
- No comparison card is active

**Caption:**
"The List view shows each classified path with its frequency, step count,
and average duration. Select a path to inspect its step sequence."

---

### Screenshot 6 — List view, Standard vs Fastest comparison active

**Component:** `WorkflowVariantsMap` — `comparePath` set to the Fastest path
**How to reach it:** In the List view, with the Standard Path selected, click
"Compare vs Standard" on the Fastest path card (or use the Quick Compare
shortcuts at the bottom of the left rail)

**Exact state to show:**
- The Standard Path card has the ring border (selected)
- The Fastest path card shows "Comparing" in indigo
- The ComparisonCard is visible in the right panel between the PathSummaryCard
  and the StepSequence: it shows the VS divider with step-count and frequency
  deltas (e.g. "−1 step", "−12% freq")
- The Step Sequence below shows the Fastest path's steps, NOT the Standard's
  — one step is absent (Notify employee is skipped in the Shortcut variant)

**Caption:**
"Pin a second path to compare step counts, duration, and frequency against
the standard in one panel."

---

### Screenshot 7 — Consistent-process view (single-path, multi-run)

**Component:** `WorkflowVariantsMap` — `SinglePathView` with
`isConsistentMultiRun === true`
**How to reach it:** This state appears when multiple recordings of a
workflow all followed the identical step sequence. The easiest way to show
it in docs is to describe it; if a live example is needed, create a workflow
with 3 identical recordings.

**Exact state to show:**
- The emerald banner reads "Consistent process — N runs, all the same path"
  with the CheckCircle icon
- The PathSummaryCard and Observed Step Sequence are visible below
- The Map/DNA/List toggle is NOT present (this view has no toggle)

**Caption:**
"When every recording follows the same sequence, the tab shows this
consistent-process banner instead of variant branches — zero variation is
a valid and useful result."

---

### Screenshot 8 — Flow Intelligence (process map) view

**Component:** `WorkflowFlowCanvas` inside the flow mode
**How to reach it:**
- Open "Approve Expense Report (Sample)"
- Click "Flow Intelligence" in the mode switcher (`WorkflowModeSwitcher`)
  — this is the first tab, showing a Workflow icon

**Exact state to show:**
- The full canvas is visible with phase group backgrounds labelled (e.g.
  "EXECUTION — 3 steps")
- At least one task node is selected (click a node) so the inspector panel
  on the right shows step detail
- The minimap is visible in the bottom-right corner (enable it via the
  toolbar if needed)
- Zoom level is comfortable — all nodes fit in the viewport

**Caption:**
"The Flow Intelligence view maps the single recording as a left-to-right
execution graph, grouped into phases. Click any node to inspect its
evidence."

---

## 2. The 5 Things a First-Time User Must Understand

These are the conceptual gaps that will cause confusion without an
explanation in the docs. Each maps to specific component behaviour.

---

### 2.1 What a branch means — and what it does NOT mean

A branch on the Map view (`WorkflowVariantStoryMap`) is a path segment that
peeled off the standard spine and later rejoined it. It was constructed from
real recorded sessions — the `evidenceRunIds` on each `StoryEdge` are the
actual session IDs.

What it does NOT mean: the branch is not a decision rule or a conditional
defined by Ledgerium. The tool does not know *why* the path diverged. It
observed that certain runs took a different sequence of steps between the
same two anchor points on the standard spine, and it drew that as a branch.
The amber "diverges" label on a node in the Map view (`StoryNodeComponent`)
simply marks the point after which at least one run peeled off — it carries
no business-rule meaning.

Docs should say: "A branch shows that some recorded runs took a different
path between two points. Ledgerium observed the difference; it did not
determine the reason."

---

### 2.2 What "N runs · X%" means on an edge label

In the Map view, the entry edge of each branch is labelled
"N runs · X%" (e.g. "2 runs · 25%"). This comes directly from
`edgeLabel()` in `WorkflowVariantStoryMap.tsx` and reflects the run-weighted
count of recorded sessions that traversed that branch, expressed as a
fraction of total runs across all variants.

Users often misread this as a process SLA target or a threshold. It is
neither. It is observed frequency only. If 2 of 8 recorded sessions took
this path, the label shows "2 runs · 25%".

The percentage is also relative to *all runs in the variant group*, not to
all runs ever recorded for the workflow name. That distinction matters if
some recordings are too old or too short to qualify for the variant group.

Docs should say: "The percentage shows what share of the recorded sessions
in this comparison group took this path. It is a count of observations, not
a designed probability or target."

---

### 2.3 Why "Consistent — N runs" is a valid and useful result

When `WorkflowVariantsMap` renders `SinglePathView` with
`isConsistentMultiRun === true`, the emerald banner reads "Consistent
process — N runs, all the same path". This is NOT an error state and is NOT
the same as "single recording — no variants yet".

The code makes this distinction explicitly in `SinglePathView`:
`isConsistentMultiRun = totalRuns >= 2`. When multiple recordings produced
identical step sequences, the variant engine correctly reports zero variation.
This is genuinely useful: it means the process is being executed
consistently.

Users who see this and assume the feature is broken need to know that it is
working correctly and telling them something positive about their process.

Docs should say: "If every recording followed the same sequence, the tab
confirms consistency rather than showing branches. This is a meaningful
result — it means the process runs the same way every time it has been
observed."

---

### 2.4 Decision conditions are observed, not inferred

The "diverges" label that appears on a backbone node in the Map view
(`StoryNodeComponent`, `data.isDecision === true`) marks a point where the
engine detected that runs split into different paths after that step. It does
NOT represent a documented decision gate, a conditional rule, or any
business logic.

The intelligence engine (`analyzeDivergence` in
`@ledgerium/intelligence-engine`) aligns variant paths against the standard
backbone using a longest-common-subsequence algorithm. It finds where paths
stop sharing the same sequence. Nothing beyond that is assumed.

Docs should say: "A 'diverges' marker does not mean Ledgerium identified a
business rule or decision condition. It means that at this point in the
recording, some sessions took a different sequence of steps. The reason is
not captured."

---

### 2.5 The DNA view shows per-step deviation, not per-step content

The `VariantDnaStrip` shows each variant as a row of colour-coded tokens.
The token colour and abbreviation (first 3 characters of the category label)
indicate the *type* of step (e.g. "FIL" = Fill & Submit, "CLK" = Click Then
Navigate), not the specific action label or the system involved.

The amber outline on a token means that step's category deviates from the
standard path at that position according to the LCS alignment in
`divergencePoints`. It does NOT mean the step failed or that something went
wrong — a "Request clarification" step (category: single_action) is outlined
because it does not appear at that position in the standard path, not because
it is an error.

Docs should say: "Each coloured block in the DNA row represents the type of
step, not its name. An amber outline means that step type appears at a
position that differs from the standard path — not that the step was
unsuccessful."

---

## 3. Copy and Labels That Will Confuse Documentation Readers

The following labels are accurate within the UI but will need clarification
or honest rewording in documentation prose.

---

### 3.1 "Exception Heavy" path classification

**Where it appears:** `PathCard` and `PathSummaryCard` role labels in the
List view.
**What the code actually does:** A path is classified "Exception Heavy" when
it contains 2 or more steps whose category is `error_handling`. This is a
threshold on step-category counts, not a severity assessment.
**Risk in docs:** Readers may interpret "Exception Heavy" as meaning the path
failed or represents a broken process.
**Honest phrasing for docs:** "The 'Exception Heavy' label means this
recorded path contained two or more error-handling steps (such as a retry
after a failed notification). It is an observation about step composition,
not a severity rating."

---

### 3.2 "Standard Path" vs the most common path

**Where it appears:** Every path card, the spine of the Map view, the
DNA strip (green dot), PathSummaryCard.
**What the code actually does:** The standard path is the `isStandard` flag
on a `ViewVariantPath`, which comes from the variant adapter. In the sample
data (`sample-variants.ts`), the Standard variant runs 4 of 8 times (50%).
The "Standard Path" label does NOT guarantee it is the most frequent path —
it is the path designated as the baseline for comparison. If `isStandard` is
false for all paths, `classifyPaths()` falls back to `paths[0]` as the
standard.
**Risk in docs:** Readers may assume "Standard" means "most common" or
"approved process". It means "the reference path used for comparisons".
**Honest phrasing for docs:** "'Standard Path' is the baseline recording
used to anchor the variant comparison. Other paths are measured against it
in step count, duration, and divergence points. In the sample dataset, the
standard path was recorded 4 times (50% of runs)."

---

### 3.3 "DIVERGES" badge on a step in the List view step sequence

**Where it appears:** `StepSequenceView` renders a red-on-amber DIVERGES
badge when `isDivergence === true` for a step.
**What the code actually does:** `isDivergence = !path.isStandard && path.divergencePoints.includes(i)`.
The divergence points are the LCS-aligned positions where this path's step
categories do not match the standard backbone. It is a structural alignment
result, not a business-rule violation.
**Risk in docs:** The word "DIVERGES" in all-caps looks alarming. Readers may
think the step caused a problem.
**Honest phrasing for docs:** "A 'DIVERGES' marker on a step means that step
appears at a position in this path that does not match the standard sequence.
It is a structural difference, not an error."

---

### 3.4 The complexity slider label "showing N/M"

**Where it appears:** `WorkflowVariantStoryMap` header bar, when
`map.branchCount > 1`.
**What the code actually does:** Filters the number of branches drawn on the
canvas to the top-N by run frequency. The spine and all backbone nodes are
always shown regardless.
**Risk in docs:** The word "complexity" is not in the visible label — the
slider only says "showing N/M". Readers may not understand what they are
controlling.
**Honest phrasing for docs:** "The slider filters the Map view to show only
the most frequently-recorded branches. Dragging it left hides lower-frequency
branches to reduce clutter. The spine (standard path) is always shown."

---

### 3.5 The "Flow Intelligence" mode label

**Where it appears:** `WorkflowModeSwitcher` — the first tab in the mode
switcher, label defined in `VIEW_MODE_LABELS.flow`.
**What the code actually does:** This opens `WorkflowCanvas` (`WorkflowFlowCanvas`),
which renders a single recording as a directed graph with phase backgrounds,
task nodes, and edge connectors. It is a single-run process map.
**Risk in docs:** "Flow Intelligence" sounds like an AI-generated insight
view. It is a deterministic visualization of one recording's step graph.
**Honest phrasing for docs:** "Flow Intelligence is a step-by-step map of a
single recording, organized into phases. It shows the exact sequence of
actions captured, grouped by stage of the process."

---

## 4. Recommended Screenshot Order for a Documentation Article

The order below moves a reader from orientation to depth, following the
natural discovery path:

1. **Screenshot 8 — Flow Intelligence (process map)**
   Establish what a single recording looks like before introducing multi-run
   comparison. Show the reader the foundation before the variation.

2. **Screenshot 5 — List view, Standard Path selected**
   Introduce the Variants tab in its most readable form. The List view makes
   the path classifications (Standard, Fastest, Longest, Exception Heavy)
   explicit as cards the reader can scan.

3. **Screenshot 7 — Consistent-process banner**
   Address the "what if there is no variation?" case early so readers don't
   think the feature is broken when they first see it. Place this immediately
   after the List intro.

4. **Screenshot 1 — Map view, all branches visible**
   Now introduce the graphical branch map. The reader already understands
   path cards from the List view, so the branches are easier to interpret.

5. **Screenshot 3 — Map view, complexity slider reduced**
   Show the complexity control in the same article section as the Map view
   so readers know how to manage a dense diagram.

6. **Screenshot 2 — Map view, evidence panel open**
   Demonstrate evidence linking immediately after the Map view introduction.
   This is the most important trust signal: the branch is not speculative;
   here are the session IDs.

7. **Screenshot 4 — DNA view**
   Introduce the DNA strip as a compact alternative for scanning many
   variants at once. By this point the reader understands divergence, so
   the amber-outline token concept lands clearly.

8. **Screenshot 6 — List view, comparison active**
   Close with the direct comparison panel. Readers who have gone through all
   prior screenshots are ready to use the quantitative delta display.

---

## 5. Assumptions That Affect Documentation Implementation

- The sample dataset ("Approve Expense Report (Sample)") must be seeded
  before screenshots are taken. The seed endpoint is
  `POST /api/sample-variants`. The idempotency check in `ensureSampleVariants`
  means running it twice is safe.
- The exact path classifications (Fastest/Longest labels, which path gets the
  Exception Heavy tag) depend on what the variant adapter and intelligence
  engine resolve at the time of seeding. The 8-recording structure in
  `sample-variants.ts` is deterministic, so classifications should be stable
  across reseeds on the same schema version.
- The evidence panel (Screenshot 2) shows session IDs from the sample
  (`sample-variants-005 · sample-variants-006`). These are internal IDs.
  The doc caption should explain that in production these point to real
  recorded sessions, not internal identifiers.
- The consistent-process state (Screenshot 7) requires a separate seeded
  workflow — the "Approve Expense Report (Sample)" set will always produce
  multiple variants by design. Creating a consistent-process example requires
  either a real user workflow with uniform recordings or a purpose-built
  seed.
- Screenshot captions should not claim the branch percentages are
  statistically significant at N=8. The sample is deliberately small. If the
  doc targets users recording larger processes, note that the same view
  scales to any run count.
