# DOCS DRAFT — Process Variants & Process Map update
# Date: 2026-06-11
# Author: docs-engineer
# Status: DRAFT — ready for frontend-engineer JSX integration
#
# Deliverables in this file
#  1. Section 3.x  — "Process variants" (new, proposed id="process-variants")
#  2. Section 3.1 update — four-mode table addition to "Process Map (Workflow tab)"
#  3. Screenshot list — filenames + descriptions + placement cues
#
# -------------------------------------------------------------------
# CONVENTIONS USED
# - Headings map to <H2 id=...>, <H3 id=...>, <H4>
# - Image placeholders written as Screenshot blocks
# - Tip/Note/Warning call-outs use their block-quote prefix
# - StepList items are numbered lists under "How to" headings
# - UL items are plain bullet lists
# - Everything in this file is user-facing prose only;
#   integration notes are in DOCS_DRAFT.integration.md (companion file)
# -------------------------------------------------------------------

---

## PART A — UPDATE TO EXISTING SECTION 3.1

The existing section 3.1 "Process Map (Workflow tab)" in the docs page contains a
four-row toolbar table that lists:
  Flow Intelligence | Swimlane | Process Variants | System Interaction

That table is **already correct** and matches the four modes in the shipped
WorkflowModeSwitcher component (`flow` / `swimlane` / `variants` / `systems`).

The section currently has body text that says:

  "The Workflow tab renders your recorded process as an interactive visual map.
   It has multiple display modes selectable from the sub-toolbar."

Proposed ADDITION — insert this paragraph immediately after the sentence above,
before the H4 "Flow Intelligence mode (default)":

---

### Proposed insert — Process Map section, four modes intro paragraph

The four modes give you different views of the same recording data:

- **Flow Intelligence** (default) — Step-by-step execution path with phases,
  decisions, and friction points.
- **Swimlane** — Cross-functional view organised by system or application, one
  lane per tool detected.
- **Process Variants** — Shows how the process differs across multiple recordings
  of the same workflow. Requires at least two recordings of the same process.
- **System Interaction** — Cross-system handoffs and integration patterns, focused
  on where work moves between applications.

Select any mode using the toggle in the sub-toolbar. The selected recording does
not change — only the view changes.

---

Screenshot slot for section 3.1:

```
Screenshot: workflow-process-map.png
Alt:        Workflow tab showing the mode-switcher toolbar with four buttons —
            Flow Intelligence, Swimlane, Process Variants, System Interaction —
            with Flow Intelligence active and the flow canvas visible.
Caption:    The Workflow tab mode switcher. Four views; the same recording data.
Placement:  Directly after the four-mode paragraph above, before the H4 "Flow
            Intelligence mode (default)".
```

---

## PART B — NEW SECTION 3.x  "Process variants"

Proposed position: after section 3.1 "Process Map (Workflow tab)" and its
SectionDivider, before section 3.2 "SOP Tab". Proposed id: `process-variants`.

This becomes section 3.2 in the numbered structure if inserted there, pushing
existing 3.2–3.8 to 3.3–3.9. Alternatively insert it as the last sub-section of
the Workflow Detail section (before section 4) to avoid renumbering. The exact
section number is a frontend-engineer call; the id `process-variants` is fixed.

---

### FULL PROSE — ready to translate to JSX

---

## 3.x Process variants

**Outcome:** After reading this you will be able to open the Variants view, read
the variant map and DNA strip, compare paths, and understand what the "Consistent"
state means.

---

### What it is

When you record the same process more than once, Ledgerium compares the recordings
to show you how execution varied. Some runs follow the most-common path. Others
take an extra step, skip a step, or hit an error-handling detour. The Process
Variants view surfaces these differences so you can see, at a glance, which paths
exist and how often each one is taken.

Variation detection is based entirely on what was observed in the recordings. The
tool reports the frequency of each path and the steps where paths diverge or
rejoin. It does not infer the conditions that caused a run to take one path versus
another.

---

### How to open it

1. Open any workflow from your dashboard.
2. Click the **Workflow** tab.
3. In the sub-toolbar, select **Process Variants**.

```
Screenshot: workflow-variants-map.png
Alt:        Workflow tab with "Process Variants" active in the mode switcher.
            The canvas shows a green standard-path spine running left to right,
            with an amber dashed branch peeling off after the second step and
            rejoining at the fourth step. The header bar reads "62% of 8 runs
            follow the standard path. 2 branches off and rejoin." A complexity
            slider sits in the top-right corner.
Caption:    The Process Variants map — the green spine is the most-common path;
            amber branches show where some runs took different steps.
Placement:  Immediately after the "How to open it" steps.
```

> **Note**  Variant analysis requires at least two recordings of the same process.
> If you have only one recording, the view shows a single-path summary instead.
> See "Single recording state" below.

---

### The variant map

The map renders on an interactive canvas (scroll to zoom, drag to pan). It
shows:

- **Green spine** — the backbone path followed by the largest share of runs.
  Solid green edges connect each backbone step in sequence.
- **Amber branches** — paths that diverge from the spine and later rejoin. A
  dashed amber edge leaves the backbone at the divergence point, one or more
  steps occur on the branch, and a dashed amber rejoin edge returns to the
  backbone. Each branch edge is labelled with the run count and percentage
  (for example: "2 runs · 25%").
- **"diverges" marker** — steps that act as branch points carry a small
  "diverges" label in the node to indicate that some runs went a different way
  at this point.
- **Step nodes** — each node shows the step category (for example: Navigation,
  Data Entry, Send). Backbone nodes have a green tint; branch nodes have an
  amber tint.

The header bar summarises the data: how many runs follow the standard path (as a
percentage), the total run count, and the number of distinct branches. For
example: "62% of 8 runs follow the standard path. 2 branches off and rejoin."

#### Complexity slider

When there are multiple branches, a slider in the top-right corner of the map
controls how many branches are shown. Drag it left to show fewer branches (the
most-frequent ones remain); drag it right to show all. This is useful when a
process has many low-frequency edge cases that would otherwise crowd the canvas.
The slider is labelled "showing N/M" where N is the current count and M is the
total.

#### Clicking a branch for evidence

Click any edge on the map to see which recordings took that path. A panel at
the bottom of the canvas lists the run IDs for the selected edge. Click the
close button (✕) to dismiss it.

```
Screenshot: workflow-variants-evidence.png
Alt:        The variant map canvas with an amber branch edge selected. A panel
            at the bottom of the canvas reads "2 runs took this path" and lists
            two run IDs in monospace text. A close (✕) button is visible at the
            right edge of the panel.
Caption:    Click any edge to see which recordings took that path — evidence
            links trace every branch to its source runs.
Placement:  After the "Clicking a branch for evidence" paragraph.
```

---

### The DNA strip

Select **DNA** in the view toggle (top right of the Variants canvas) to switch to
the DNA strip view. This presents each recorded path as a horizontal row of
colour-coded step tokens, sorted from most to least frequent.

```
Screenshot: workflow-variants-dna.png
Alt:        The Variants DNA view. Three rows are visible. The top row is labelled
            "Standard Path · 50% · 4 runs" and shows a sequence of small coloured
            blocks. The second row is labelled "25% · 2 runs" with a slightly
            longer sequence. The third row shows one block with an amber outline.
            A note above the rows reads "Each row is a recorded path, most
            frequent first. Outlined cells are where the path deviates from the
            standard."
Caption:    DNA view — each row is one distinct execution path. Amber-outlined
            cells are steps that differ from the standard path.
Placement:  After the H4 "The DNA strip".
```

What to read in each row:

- **Path label** — the name for this path (for example: "Standard Path" for the
  most common sequence) and its percentage and run count.
- **Colour-coded tokens** — each token represents one step, coloured by category.
  Hover over a token to see the category name.
- **Amber outline** — a token with an amber outline is a step that differs from
  the standard path at that position. Steps without an outline match the standard
  path.

Use the DNA view when you want to scan many paths at once. The map view is better
for understanding the flow structure; the DNA view is better for spotting exactly
which steps differ.

---

### The list view

Select **List** in the view toggle to open the path detail panel. The list view
has two areas:

**Left rail — path cards.** One card per distinct execution path. Each card shows:

- A role badge: **Standard Path** (green), **Fastest** (blue), **Longest**
  (amber), **Exception Heavy** (red), or **Variant** (indigo).
- The path label and frequency percentage.
- Step count, average duration, and run count.
- A frequency bar showing the path's share of all runs.
- A **Compare vs Standard** button on non-standard paths.

Click a card to select that path. The right panel updates to show its detail.

**Right panel — path detail.** When a path is selected:

- A summary row shows: frequency percentage and run count, step count (with
  delta versus the standard), average duration (with delta versus the standard),
  divergence point count, and error step count.
- A **step sequence list** shows every step in this path with its category and
  duration. Steps where this path diverges from the standard are highlighted in
  amber and labelled **DIVERGES**.
- Click any step to highlight that node in the process map and open it in the
  inspector panel.

```
Screenshot: workflow-variants-list.png
Alt:        The Variants list view. On the left: three path cards — "Standard
            Path" (green badge, 50%, 4 runs), "Fastest" (blue badge, 12% −2 steps
            delta), "Exception Heavy" (red badge, 12%). The Standard Path card is
            selected. On the right: a summary row with five metric tiles, then a
            step sequence list. One step in the list is highlighted amber and
            labelled "DIVERGES".
Caption:    List view — select any path to inspect its step sequence and compare
            it to the standard.
Placement:  After the "The list view" section.
```

#### Comparing two paths

On any non-standard path card, click **Compare vs Standard** to overlay a
side-by-side comparison. A comparison card appears in the right panel showing both
paths with their step counts, durations, and percentage frequency. Use the **Quick
Compare** shortcuts at the bottom of the left rail to jump to the most common
pairings.

#### Path insights

Below the step sequence, the panel may show **Path Insights** cards. These surface
observations derived from the recorded data:

| Insight | Meaning |
|---|---|
| Low Adherence | The standard path accounts for less than 50% of runs — most recordings took a different route. |
| Faster Alternative | This path is faster than the standard on average. |
| Exception-Heavy Path | This path contains two or more error-handling steps. |
| Extra Steps Detected | This path has more than two steps beyond the standard path. |
| Friction in Standard Path | Friction points are present on the standard path. |

These insights describe what was observed in the recordings. They do not explain
why runs took different paths.

---

### Single recording state

If you open the Variants mode on a workflow that has only one recording, the view
shows a single-path summary instead of the map.

A blue banner reads: "Single recording — no variants to compare yet. Record this
workflow multiple times to discover how the process varies across runs."

The step sequence for that single recording is shown below the banner so you can
still inspect the path.

---

### Consistent process state

If you have recorded the same workflow more than once and every recording followed
the exact same sequence of steps, the Variants view shows:

A green banner reading: "Consistent process — N runs, all the same path. All N
recordings followed the identical sequence, so there is no variation to compare
yet."

The step sequence is shown below so you can inspect the path. No DNA strip or
branch map appears because there is nothing to compare.

> **Tip**  A consistent result across multiple runs is a meaningful finding: it
> means the process was executed the same way every time. This is useful evidence
> for standardisation work.

---

### Plan availability

Variant analysis is a **Team plan** feature. On Free and Starter plans, selecting
Process Variants mode shows an upgrade prompt: "Variant analysis is a Team feature
— upgrade to compare how your process varies across runs." The upgrade link goes to
the pricing page.

> **Important**  If you see "This recording isn't analyzed yet" instead of the
> variant map, the workflow is still being processed. Wait a moment and click
> **Retry**, or reload the page.

---

### Common questions

**Q: How many recordings do I need before the variant map appears?**
A: Two. As soon as you have two or more recordings of the same process, the
variant map can show whether they followed the same or different paths.

**Q: Why does the map show "62% of 8 runs" — where does Ledgerium find 8 runs?**
A: Ledgerium groups recordings by process similarity. All recordings of the same
process (matching the same workflow title in your library) are included in the
variant analysis. In this example, 8 separate recordings exist for this workflow.

**Q: Does Ledgerium tell me why a run took a different path?**
A: No. The tool shows observed frequencies — how often each path was taken and
at which steps paths diverged or rejoined. It does not infer the conditions or
business rules that caused a run to branch. The branch labels show run counts and
percentages only.

**Q: What does the complexity slider do?**
A: It controls how many branches are visible on the map at once. Low-frequency
branches (for example, a single exception run) can be hidden to keep the canvas
readable. All branches are still recorded; the slider is display-only.

**Q: The "Fastest" badge is on a path with fewer steps — is that just because it
skips steps?**
A: Yes, if a path skips steps it will usually run faster. The Fastest badge marks
the path with the lowest average recorded duration, regardless of reason. The step
count delta (shown as "-2 steps vs std" on the path card) tells you how many
fewer steps that path used.

---

## PART C — SCREENSHOT LIST

All screenshots should be captured via Playwright against the seeded
"Approve Expense Report (Sample)" workflow created by `ensureSampleVariants()`
in `apps/web-app/src/lib/sample-variants.ts`. That seed produces 8 recordings:
standard path ×4, insertion-branch ×2, shortcut ×1, exception ×1.

Capture settings:
- Viewport: 1800×1120 (900×560 × 2 device-scale-factor)
- Color scheme: dark
- Wait: `document.fonts.ready` + 600 ms paint settle + `networkidle`
- Auth: use saved Playwright auth state at `apps/web-app/e2e/.auth/user.json`

---

### Screenshot 1 — workflow-process-map.png

**Section:** 3.1 Process Map (Workflow tab) — after four-mode intro paragraph
**URL:** `/workflows/<sample-variants-id>` (Workflow tab, Flow Intelligence mode
active)
**Setup:** Navigate to the sample variant workflow. Ensure the Workflow tab is
active and the mode switcher shows "Flow Intelligence" as the selected mode.
No drawers or panels open.
**What to show:** The mode switcher toolbar clearly showing all four buttons
(Flow Intelligence, Swimlane, Process Variants, System Interaction) with
"Flow Intelligence" highlighted. The flow canvas visible behind.
**Filename:** `workflow-process-map.png`
**Alt text for docs page:**
  "Workflow tab sub-toolbar showing four mode buttons: Flow Intelligence
   (active), Swimlane, Process Variants, and System Interaction."
**Caption for docs page:**
  "The Workflow tab mode switcher. Four views of the same recording data."

---

### Screenshot 2 — workflow-variants-map.png

**Section:** 3.x Process variants — after "How to open it" steps
**URL:** `/workflows/<sample-variants-id>` (Workflow tab, Process Variants mode,
Map sub-view)
**Setup:** Click the Workflow tab, then click "Process Variants" in the mode
switcher. Ensure the "Map" sub-view toggle is selected (not "DNA" or "List").
Wait for the React Flow canvas to render (wait for the header bar text to
contain "runs follow the standard path").
**What to show:**
  - Green spine running left to right across the canvas
  - At least one amber dashed branch peeling off and rejoining
  - The header bar at the top of the canvas showing the conformance percentage,
    total run count, and branch count
  - The complexity slider visible in the top-right (when there are 2+ branches)
  - Edge labels showing run count and percentage on at least one branch
  - A "diverges" label visible on at least one branch node
**Filename:** `workflow-variants-map.png`
**Alt text for docs page:**
  "Process Variants map view showing a green standard-path spine with amber
   dashed branches peeling off and rejoining. The header reads '62% of 8 runs
   follow the standard path. 2 branches off and rejoin.'"
**Caption for docs page:**
  "The Process Variants map — green spine is the most-common path; amber
   branches show where some runs took different steps."

---

### Screenshot 3 — workflow-variants-evidence.png

**Section:** 3.x Process variants — after "Clicking a branch for evidence"
**URL:** Same as screenshot 2 (Map sub-view of Process Variants)
**Setup:** Click on one of the amber branch edges on the canvas to trigger the
evidence panel. Wait for the bottom panel to appear (contains "N runs took this
path" and a run ID list).
**What to show:**
  - The canvas visible in the background with the selected edge (amber branch)
  - The evidence panel at the bottom: "N runs took this path" heading, run IDs
    in monospace, and the close (✕) button
**Filename:** `workflow-variants-evidence.png`
**Alt text for docs page:**
  "Variant map with a branch edge selected. A panel at the bottom reads '2 runs
   took this path' and lists run IDs. A close button sits at the right edge."
**Caption for docs page:**
  "Click any edge to see which recordings took that path."

---

### Screenshot 4 — workflow-variants-dna.png

**Section:** 3.x Process variants — after "The DNA strip" heading
**URL:** Same workflow, Process Variants mode, **DNA sub-view** selected
**Setup:** Click "Process Variants" mode, then click the "DNA" button in the
view toggle (top right of the canvas area).
**What to show:**
  - Three or more path rows visible
  - The top note "Each row is a recorded path, most frequent first.
    Outlined cells are where the path deviates from the standard."
  - At least one row with amber-outlined cells (divergence indicators)
  - The "Standard Path" green dot indicator visible on the first row's label
  - The percentage and run count labels on each row
**Filename:** `workflow-variants-dna.png`
**Alt text for docs page:**
  "Variants DNA view showing four rows of colour-coded step tokens. The first
   row is labelled 'Standard Path · 50% · 4 runs'. Some tokens in the later
   rows have amber outlines indicating divergence from the standard path."
**Caption for docs page:**
  "DNA view — each row is one recorded path. Amber-outlined tokens are steps
   that differ from the standard path."

---

### Screenshot 5 — workflow-variants-list.png

**Section:** 3.x Process variants — after "The list view" section heading
**URL:** Same workflow, Process Variants mode, **List sub-view** selected
**Setup:** Click "Process Variants" mode, then click the "List" button in the
view toggle. The view should show the left path-cards rail and the right detail
panel. Select the Standard Path card (click it) so the detail panel is populated.
**What to show:**
  - Left rail: at least three path cards with distinct role badges (Standard
    Path green, and at least one other role — Fastest/Longest/Exception Heavy)
  - At least one card showing a frequency bar and the run count
  - Right panel: the five-metric summary row at the top (Frequency, Steps,
    Duration, Divergences, Errors tiles)
  - The step sequence list below with at least one step showing the amber
    DIVERGES badge (select a non-standard path if needed to surface this)
  - The path card selected state (ring highlight)
**Filename:** `workflow-variants-list.png`
**Alt text for docs page:**
  "Variants list view. Left rail shows three path cards with role badges:
   Standard Path (green), Fastest (blue), Exception Heavy (red). Right panel
   shows five metric tiles and a step sequence list with one step labelled
   DIVERGES in amber."
**Caption for docs page:**
  "List view — select any path to inspect its steps and compare it to the
   standard."

---

## PART D — SIDEBAR_LINKS ADDITION

Add to the `SIDEBAR_LINKS` array in `apps/web-app/src/app/(public)/docs/page.tsx`.
Insert after `{ id: 'workflow-detail', label: 'Workflow Detail View' }`:

```ts
{ id: 'process-variants', label: 'Process Variants' },
```

(Or keep it as a sub-section anchor without a top-level sidebar entry, at the
frontend-engineer's discretion — the H2 id `process-variants` enables deep-linking
either way.)

---

## PART E — VOICE CHECKLIST

Self-check against docs voice rules before integration:

- [x] Verb-first imperatives: "Open", "Click", "Select", "Drag"
- [x] Sentence case in all headings
- [x] No marketing adjectives (no "powerful", "intelligent", "seamless")
- [x] Concrete numbers where present: "2 branches", "8 runs", "50%"
- [x] Computed-signal language: "62% of 8 runs follow the standard path"
- [x] Audit-honest: plan gate says "Team plan" verbatim; gated UI copy
      reproduced verbatim ("Variant analysis is a Team feature")
- [x] No fabricated decision conditions: "does not infer the conditions"
      stated explicitly in two places
- [x] Evidence-linked: every branch percentage trace noted
- [x] Single recording state and consistent state both documented honestly
      (neither framed as failure)

---

## NOTES FOR frontend-engineer INTEGRATION

See companion file `DOCS_DRAFT.integration.md` for the exact JSX patch,
SIDEBAR_LINKS delta, and verification checklist.

The new section uses only components already present in `docs/page.tsx`:
`H2`, `H3`, `H4`, `P`, `UL`, `Screenshot`, `StepList`, `Note`, `Tip`,
`Warning`, `TableWrap`/`TH`/`TD`, `SectionDivider`.

No new components are needed.
