# PRD: Frequency-Weighted Process Map (Celonis-Style DFG)
**Feature:** Process Variants — Frequency Map view
**Status:** Define-phase. Gates build.
**Date:** 2026-06-17
**Author:** product-manager agent

---

## 1. Problem and Jobs-to-Be-Done

### The decision gap the current views leave open

The Process Variants tab offers Map / DNA / List sub-views. None of them answers the single most important operational question: **"Which paths through this process actually dominate, where exactly does it fork, and which deviation is common enough to act on?"**

The existing **Map view** (`WorkflowVariantsMap.tsx` `view === 'map'`, lines 262–269) renders a branch-lane graph via `buildVariantFlowModel`. It correctly uses `analyzeDivergence` to position decision diamonds and branch steps, but every branch is drawn with the same visual weight — a rare 2%-of-runs exception looks identical to the 60%-of-runs standard path. A user cannot glance at the map and know what is dominant versus marginal.

The **List view** surfaces frequencies as percentage badges on path cards, but requires the user to mentally reconstruct the flow topology by reading cards one at a time. There is no shared topology — the user cannot see *where* a path diverges, only *that* it does.

The **DNA view** shows step-sequence strips but has no spatial layout that encodes the fork-and-rejoin structure of a process.

### Jobs-to-be-done (primary persona: ops lead / process owner, 3–50 runs recorded)

1. **Scan dominance** — in under 5 seconds, see which path accounts for the majority of runs versus which paths are statistical noise.
2. **Locate forks** — identify the exact step where the process splits, without reading a card list.
3. **Triage deviations** — decide whether a variant is common enough to standardize, investigate, or ignore, based on its run share relative to the total.
4. **Trace to evidence** — for any displayed frequency or path, know it is backed by specific recorded runs, not inferred.

### Why now

The WPVL-001 review (2026-06-17) established that `analyzeDivergence` and per-variant `frequency` / `runCount` / `evidenceRunIds` are already computed and available in the `PortfolioIntelligence` output returned by `analyzeWorkflowVariants` (`apps/web-app/src/lib/intelligence.ts` lines 541–578). The raw material for a frequency-weighted DFG exists today. The gap is entirely in the rendering layer.

---

## 2. Scope

### v1 MUST — Frequency-Weighted Directly-Follows Graph

A **directly-follows graph (DFG)** is a map where nodes are process steps and edges represent observed transitions between them. Edge thickness (stroke width) encodes how often that transition was taken — thick edges are common, thin edges are rare. This is the canonical Celonis variant explorer approach.

**v1 includes:**

| # | Requirement |
|---|-------------|
| M1 | **DFG canvas.** Nodes = observed steps (from `variantStepTitles` keyed to variant steps). Edges = observed transitions between consecutive steps. No fabricated edges, no inferred paths. |
| M2 | **Frequency-encoded edge thickness.** Stroke width is a monotonic function of the edge's run share (runs crossing that transition / total runs). Minimum stroke 1px (rare), maximum stroke 8px (dominant). The mapping is linear by default. |
| M3 | **Happy-path emphasis.** The standard path (`isStandard === true` variant, or highest-frequency variant as fallback) is rendered in a distinct color (green, consistent with existing role color `#059669` in `WorkflowVariantsMap.tsx` line 78). Non-standard edges are rendered in a neutral color (gray). |
| M4 | **Coverage slider.** A single horizontal slider labeled "Show paths covering X% of runs" (range: the standard path's frequency floor → 100%). At the minimum position, only edges belonging to the happy path render. As the slider advances, edges for progressively rarer variants appear. The graph remains start→end connected at every slider position. |
| M5 | **Variant highlight on hover / click.** Hovering or clicking a non-standard edge highlights all edges belonging to that variant's path and shows a tooltip: variant label, run count, run share %, and a "backed by N runs" evidence anchor. |
| M6 | **Legend.** Always-visible legend bar (consistent with the existing legend bar at `VariantFlowCanvasWrapper` lines 898–954) showing: thin edge = rare transition, thick edge = common transition, green = standard path, gray = variant path, diamond = fork point. |
| M7 | **Load states.** Reuse existing `VariantsStateView` for loading / error / forbidden / unprocessed. Reuse `SinglePathView` for single-run and consistent-multi-run (no variants to compare). |
| M8 | **Honesty guard.** All displayed frequencies must divide `runCount` from `evidenceRunIds.length`. No edge may appear without a backing `evidenceRunId` array. Fork-point labels use observed-count language only ("3 of 16 runs took an alternate path here") — never a fabricated business condition, consistent with the hard requirement in `variantFlowModel.ts` lines 12–15. |
| M9 | **Deterministic render.** Same `PortfolioIntelligence` input → byte-identical layout across reloads. No `Date.now()`, `Math.random()`, or unstable sort in the DFG layout path. |

### v1 LATER — explicitly deferred

These are NOT in v1 scope. Recording them here closes the "why isn't X in v1" question for the build team.

| Deferred item | Reason |
|---|---|
| Conformance coloring vs a reference BPMN/SOP model | Requires a reference model authoring surface that does not exist. Deferred to the SOP-alignment roadmap. |
| Per-edge drill-to-runs panel (click edge → list of runs that crossed it) | WPVL-P07 (evidence provenance) is a distinct scope item. Deferred to the P07 iteration. |
| Animation / flow particles showing traffic | Visual polish; no comprehension value in v1. |
| Performance / throughput overlay (cycle time heat on edges) | Requires duration data per-transition, not per-path. Deferred to Path C R+1+ when `metric_fact` persistence lands. |
| Per-step coefficient-of-variation tile | Deferred to WPVL-P01 / P02 aligned-diff work. |
| Export / share / screenshot | Post-v1 polish. |

---

## 3. Acceptance Criteria

All criteria are testable without subjective interpretation.

**AC-1 — Edge thickness is monotonic in frequency.**
Given any two edges A and B where `runShare(A) > runShare(B)`, the rendered stroke width of A is strictly greater than or equal to the stroke width of B. Verified by a unit test on the edge-weight→stroke mapping function.

**AC-2 — Minimum coverage shows only the happy path, graph stays connected.**
With the coverage slider at its minimum position, only edges belonging to the standard variant render. The rendered graph contains a path from the Start node to the End node via standard-path edges only. No orphan nodes render.

**AC-3 — Coverage slider is monotone-inclusive.**
At coverage threshold T, every edge whose variant's `frequency >= T` renders. At threshold T + ε, no edge that was hidden at T becomes hidden. Edge set is non-decreasing as the slider moves right.

**AC-4 — Every displayed frequency traces to evidenceRunIds.**
For each rendered edge or tooltip showing a count N or share X%, there exists a `evidenceRunIds` array of length N backing it. The component must not render a count that it did not receive from `evidenceRunIds`. Verified by a unit test on the DFG-builder that asserts no edge has a `runCount > evidenceRunIds.length`.

**AC-5 — No inferred edges.**
Every edge in the DFG corresponds to a consecutive step pair `(step[i], step[i+1])` observed in at least one recorded run. Edges between steps that were never adjacent in any run must not appear. Verified by asserting that the DFG edge set is a strict subset of the transition pairs extractable from `variants[*].stepCategories`.

**AC-6 — Single-run state is handled correctly.**
When `variantData.hasVariantData === false` (line 226 of `WorkflowVariantsMap.tsx`), the Frequency Map renders the same `SinglePathView` that the existing Map view renders — no DFG, no slider, correct single-run vs consistent-multi-run banner.

**AC-7 — Consistent multi-run zero-variation state.**
When all runs share the same path (variant count = 1), the DFG renders that single path with a single thick edge per transition and the slider is hidden (nothing to filter). The "Consistent process" banner from `SinglePathView` renders above or instead of the slider.

**AC-8 — Forbidden / unprocessed states pass through unchanged.**
`status === 'forbidden'` renders the upgrade CTA. `status === 'unprocessed'` renders the retry prompt. Both behaviors are verified by existing state tests.

**AC-9 — Deterministic across reloads.**
Rendering the same `PortfolioIntelligence` input twice produces byte-identical SVG/canvas output (node positions, edge stroke widths, layout). Verified by snapshot test.

**AC-10 — Honesty: no fabricated fork labels.**
Fork-point (diamond) labels contain only observed-count language. The test asserts no label matches the pattern `/if|when|condition|because|unless/i` (business-condition fabrication). Consistent with the existing hard requirement at `variantFlowModel.ts` lines 12–15.

---

## 4. Honesty and Determinism Guards (non-goals, explicitly)

The following must NEVER appear in the Frequency Map and are not in scope:

- **No inferred transition causes or conditions.** The map shows that a fork happened, not why. Fork labels are limited to run-count evidence (e.g. "3 of 16 runs took a different path here").
- **No counts not backed by runs.** A run share of "45%" means exactly `ceil(0.45 × totalRuns)` evidenceRunIds exist. The DFG builder must refuse to render an edge whose `runCount` exceeds its `evidenceRunIds.length`.
- **No fabricated edges.** Transitions between step A and step B may only appear if at least one source run contains A immediately followed by B in its step sequence.
- **No non-deterministic layout.** The existing `variantFlowModel.ts` Plan B integer-layer layout (lines 125–136) is the reference pattern. The DFG layout must follow the same deterministic contract: `layer = f(step position in backbone)`, `lane = greedy interval coloring in frequency order`, no `Date.now()`, no `Math.random()`.

These guards are verifiable: AC-4, AC-5, AC-9, and AC-10 each cover one guard.

---

## 5. Success Metric

**Leading indicator: "Frequency Map engagement depth."**

Measured by a new analytics event `frequency_map_slider_moved` emitted when the coverage slider position changes (non-PII; no step label or run ID in the payload, only the slider value as a percentage bucket: 0–25 / 26–50 / 51–75 / 76–100).

**Target:** Within 60 days of ship, ≥ 30% of Frequency Map sessions include at least one `frequency_map_slider_moved` event.

Rationale: the slider is the primary comprehension affordance. A session where the slider moves indicates the user actively explored variation, not just passively viewed the default state. The 30% target is conservative given that no baseline exists today (WPVL-P05 instrumentation is a pre-requisite or must ship together). If WPVL-P05 is not yet shipped, this metric depends on instrumentation landing in the same iteration.

Secondary (diagnostic only, no target): `frequency_map_variant_hovered` per session median. Tracks whether edge hover (AC-5 path highlight) drives engagement after slider interaction.

---

## 6. Open Questions for CEO

**Q1 — Replace the existing Map view or add a fourth sub-view?**
The current Map view (`view === 'map'`) renders the branch-lane canvas via `buildVariantFlowModel`. The Frequency Map is a different rendering of the same underlying data. Options: (a) replace the existing Map view with the Frequency Map — simpler navigation, one fewer toggle; (b) add "Freq" as a fourth sub-view alongside Map / DNA / List — preserves the branch-lane canvas for users who prefer it. Coordinator default: (a) replace, since the branch-lane canvas and the DFG answer the same question and the DFG answers it more intuitively. CEO override available.

**Q2 — Single slider or two sliders (coverage floor + rarity ceiling)?**
v1 specifies one slider: minimum coverage = standard path only, maximum = all observed paths. A two-slider approach (lower bound to hide the standard and expose only variants, upper bound to cap noise) is more powerful but adds UI complexity and requires a second comprehension concept. Coordinator default: one slider for v1. CEO override available.

**Q3 — Default slider position on open?**
Options: (a) default to 100% (show all paths, user narrows down) — shows the full complexity immediately; (b) default to the standard path only (minimum position) — shows the clean happy path, user expands to see variation; (c) default to a position that covers ≥ 80% of runs — shows dominant paths without tail noise. Coordinator default: (c), covering 80% of runs, as it balances comprehension with honest representation of variation. CEO override available.

**Q4 — Sequencing against the current endorsed pick (#101 WDC2-P02)?**
Iter 075 endorsement is `#101 WDC2-P02` (Wave A registry mis-classification + Wave B Stats). The Frequency Map is a new feature on a different surface (Variants tab, not dashboard). Options: (a) begin the Frequency Map program at iter 076 in parallel track; (b) complete the current WDC-002 P0 burn-down first, then open the Frequency Map program; (c) insert WPVL-P08 (the XS blank-first-render fix, one iteration) as an immediate Mode 2 pick before resuming WDC-002. CEO direction required before coordinator schedules build.

**Q5 — Plan-tier gate: is the Frequency Map a Team feature or available on all plans?**
The existing Map / DNA / List views are gated at the Team plan (`status === 'forbidden'` path in `WorkflowVariantsMap.tsx` lines 219–221). The Frequency Map is a variant of the same intelligence surface. Coordinator default: same Team plan gate. CEO override available if the intent is to surface a limited read-only DFG on lower tiers.

---

*This PRD is the Define-phase gate artifact. It does not authorize any product code change. Downstream agents (system-architect, frontend-engineer) must not begin implementation until the CEO resolves Q1 and Q4 at minimum, and the coordinator schedules the build iteration. Zero product code was modified in producing this document.*
