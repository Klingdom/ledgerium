# Workflow Process Variants — List View Comprehension Review (WPVL-001)

**Type:** Mode 3-adjacent multi-agent strategic review (NON-counting; zero product code touched)
**Date:** 2026-06-17
**Directive (CEO, verbatim):** *"Engage all subagents and create any agents that will help you analyze Workflow Process Variants view to make the process map variations more understandable. The List view within that tab makes the most sense."*
**Surface under review:** `apps/web-app/src/components/workflow-view/` — Process Variants tab (`mode === 'variants'`), specifically the **List** sub-view (`view === 'list'` branch of `WorkflowVariantsMap.tsx`).
**Agents engaged (6, parallel):** `ux-designer` · `product-manager` · `frontend-engineer` · `competitive-researcher` · `analytics` · `system-architect`.

---

## 1. Executive Summary

The Process Variants tab offers three sub-views — **Map** (flow graph), **DNA** (compact strip), **List** (path cards + detail). The CEO directive anchors comprehension on the **List view**, which is correct: a scannable, plain-language list is the right surface for a non-expert to understand *how a process varies* without parsing a spaghetti graph.

**The review produced the strongest cross-agent convergence in our review history: all 6 agents independently identified the same root defect.**

> **Root defect:** The List view **already sits on top of a correct, deterministic, evidence-linked alignment primitive** (`analyzeDivergence` / `divergentStepIndices` / LCS in `packages/intelligence-engine/`) — but the **adapter→List projection throws that alignment away and re-derives divergence *positionally*** (`taskNodes[i]`). The consequence is threefold and severe: (a) **comprehension failure** — the user cannot see *what is actually different* about a variant; (b) **correctness/honesty bug** — for any variant that inserts or skips a step, the List shows the *wrong* step labels, systems, and durations; (c) **traceability violation** — numbers are rendered that do not trace to the variant's own source runs, breaching the Ledgerium core invariant *"every output traceable to source events."*

The fix is **almost entirely client-side adapter wiring against primitives that already ship.** No schema change, no engine change, no migration. The single highest-leverage move — making the List view an **aligned standard-vs-variant step diff** (marking each step *kept / inserted / skipped / substituted*) — is a category-first move: **no surveyed competitor (Celonis, UiPath, Signavio, Apromore, Minit) surfaces this diff inline in a list row.**

**8 P0 candidates** are recommended for promotion; **~14 P1/P2/P3** held cold in this artifact per the Audit-Intake Pattern.

---

## 2. What the List View Does Today (Ground Truth)

`WorkflowVariantsMap.tsx` — the `view === 'list'` branch (~lines 277–354):

- **Left rail** — `PathCard` per path: role badge (Standard / Fastest / Longest / Exception Heavy / Variant), frequency %, frequency bar, step-count, duration, run-count; + "Quick Compare" shortcuts.
- **Right detail** (selected path) — `PathSummaryCard` (Frequency / Steps / Duration / Divergences / Errors) → optional `ComparisonCard` (3-column VS, scalar deltas only) → `StepSequenceView` (per-step rows, amber wash + `DIVERGES` badge on divergence indices) → `VariantInsightsCards` (prescriptive nudges).
- **States** — `SinglePathView` correctly distinguishes *true single recording* from *consistent multi-run (zero variation)*; load states for loading/error/forbidden/unprocessed.

Data flow: `buildVariantData(graph, intelligence)` → `classifyPaths(...)` → `ViewVariantPath[]`. The richer engine alignment (`DivergenceBranch[]` with `altSteps` / `skippedBackbone` / `evidenceRunIds`) is consumed by the **Map** view's `buildVariantFlowModel`, but **not** by the List view.

---

## 3. Cross-Agent Convergence (ranked by agreement)

| # | Finding | Agents converging | Severity |
|---|---------|-------------------|----------|
| C1 | **Positional `taskNodes[i]` lookup** shows wrong step label/system/duration for any insert/skip variant; the aligned primitive exists but is discarded | UX (F1,F4) · FE (F1) · Arch (F1,F5) · PM (F6) · Analytics (impl) — **5–6 of 6** | **P0** |
| C2 | **No aligned standard-vs-variant step DIFF** — `ComparisonCard` compares scalars only; divergence is a faint amber wash, not a legible kept/inserted/skipped diff. Category-first opportunity (no competitor does inline-row diff) | UX (F1,F2) · FE (F2) · Comp (lead rec) · Arch (contract) — **4 of 6** | **P0** |
| C3 | **No comprehension headline / variance narrative** — opens with 3 undifferentiated MiniStats (Paths/Runs/Steps); upstream `sequenceStability` / `standardPathFrequency` / `coefficientOfVariation` / `recommendedPath` computed but never surfaced | PM (F1) · Analytics (F1,F3) · Arch (F3) · UX — **4 of 6** | **P1** |
| C4 | **`avgDurationMs` always null in the List adapter path** → `fastest`/`longest` roles never fire (dead feature); duration delta — the most actionable signal — silently hidden in ComparisonCard | FE (F3) · Arch (F4) · Analytics (F6) · PM (F4) — **4 of 6** | **P1** |
| C5 | **Zero variant-view analytics instrumentation** — a Team-gated feature with no usage/comprehension data | Analytics (F5) — **1 of 6, but P0 by category** | **P0** |
| C6 | **Honesty violation: fabricated recommendation** — `VariantInsightsCards` fires *"Consider adopting it as the new baseline"* from duration alone, with no outcome/sample-size guard | PM (F2) · Arch (evidence) — **2 of 6** | **P0** |
| C7 | **`evidenceRunIds` present in the type but never surfaced** — no "backed by N runs" trust anchor, no drill-through to source recordings (moat invisible) | Arch (F5) · Comp (moat) · Analytics — **3 of 6** | **P1** |
| C8 | **`selectedPathId` useState staleness** — when intelligence loads after mount, the List opens blank until a manual click | FE (F4) — **1 of 6** | **P2** |

---

## 4. The Aligned-Diff Contract (the hero primitive)

Confirmed by `system-architect`: the alignment **already exists** in `packages/intelligence-engine/` (`analyzeDivergence(backbone, runs)` → `DivergenceBranch[]`, version-pinned `lcs-backbone/1.0.0#min1`, order-invariant, carries `evidenceRunIds`). The List view should consume a per-variant **projection** of it — pure, client-side, additive, reversible:

```ts
export type StepDiffOp = 'kept' | 'inserted' | 'skipped' | 'substituted';

export interface AlignedStep {
  op: StepDiffOp;
  standardIndex: number | null;   // null for inserted
  variantIndex: number | null;    // null for skipped
  category: string;
  label: string;                  // real recorded title (variantStepTitles), keyed by VARIANT index
  durationMs: number;
  coefficientOfVariation: number | null; // from variance.highVarianceSteps
}

export interface AlignedVariantDiff {
  pathId: string;
  isStandard: boolean;
  steps: AlignedStep[];           // alignment-correct, ordered
  divergenceCount: number;        // ops where op !== 'kept'
  evidenceRunIds: string[];       // traceability anchor
  sequenceStabilityPct: number | null;
}
```

Produced by a pure adapter `buildAlignedVariantDiff(variant, standard, intelligence)`. Smallest first cut: ship `kept`/`inserted`/`skipped` only; defer `substituted` (derivable by pairing adjacent insert+skip at the same anchor). **One alignment source feeds both Map and List** — eliminates the split-brain in C1/C2.

---

## 5. Competitive Position (why the List view is a moat)

`competitive-researcher` surveyed Celonis Variant Explorer, UiPath Process Mining, SAP Signavio, Apromore/ProM, Power Automate (Minit), Amplitude/Mixpanel, Scribe/Tango.

- **Adopt:** (1) inline step-sequence strip in every row (Celonis, Minit); (2) progressive complexity reveal (UiPath slider); (3) frequency-first **%** ranking, not raw case counts (Celonis, Amplitude); (4) **per-step deviation labels vs the standard** — *the most-copied yet most-missing convention*; (5) duration delta vs baseline badge.
- **Avoid:** conformance jargon + "Variant N" identifiers as primary framing; per-row mini-graphs; reference-model (BPMN) dependency for deviation.
- **Moat made visible:** every competitor *infers* from logs (Celonis/Signavio/UiPath) or captures *one* intentional path (Scribe/Tango). Ledgerium records **real, unedited runs** — so the List can show **"backed by N recorded sessions"** + step-level provenance on hover, anchored to raw evidence. That is a category-first, deterministic trust signal — and it requires the `evidenceRunIds` surfacing of C7.
- **The single missing convention:** *inline "+added / –skipped / ↩repeated" diff badges on the step strip, at the row level, with the most-frequent observed path as the implicit baseline (no model authoring required).*

---

## 6. Recommended P0 Set (audit-intake candidates)

Per the Audit-Intake Pattern (P0-only live promotion; rest cold). Each is independently shippable; **C1+C2 share the aligned-diff primitive and should ship as one architectural family.**

| ID | Title | Primary agent | Effort | Notes |
|----|-------|---------------|--------|-------|
| **WPVL-P01** | Aligned standard-vs-variant step diff — replace positional `taskNodes[i]` with `AlignedVariantDiff`; render kept/inserted/skipped | `system-architect` → `frontend-engineer` | M | Fixes C1 correctness/honesty bug **and** delivers C2 comprehension hero in one family; client-only |
| **WPVL-P02** | Inline diff badges + duration delta in `ComparisonCard` (sequence diff, not scalars) | `frontend-engineer` | S | Depends on P01 primitive; competitive table-stakes |
| **WPVL-P03** | Comprehension headline — replace 3 MiniStats with plain-language variance narrative (`"73% of runs follow 1 path · 12 paths observed"`); surface `sequenceStability` | `frontend-engineer` + `product-manager` | S | C3; data already on client |
| **WPVL-P04** | Remove fabricated "adopt as baseline" insight; bound all nudges to observed evidence + sample-size guard | `product-manager` → `frontend-engineer` | S | C6; determinism/honesty invariant |
| **WPVL-P05** | Variant-view analytics instrumentation (opened / toggled / path-selected / compare-invoked / insight-rendered; PII-free) | `analytics` + `frontend-engineer` | S | C5; Team-gated feature is currently dark |
| **WPVL-P06** | Populate `avgDurationMs` in LCS adapter from `variantStepDurations` → restores fastest/longest roles + duration deltas | `frontend-engineer` | S | C4; 3-line data fix, unlocks dead feature |
| **WPVL-P07** | Surface `evidenceRunIds` as "backed by N runs" trust anchor + drill-through; per-step provenance on hover | `frontend-engineer` (+ small server link) | M | C7; makes the deterministic moat visible |
| **WPVL-P08** | Fix `selectedPathId` useState staleness (effect-sync when paths load post-mount) | `frontend-engineer` | XS | C8; blank-first-render bug; ship first |

**Cold pool (held, ~14 items):** role-taxonomy rewrite to behavior-based labels ("Extra Steps" / "Fewer Steps" / "Different Sequence" / "Exception-Prone" with frequency-weighted threshold); per-step CV tile in `PathSummaryCard`; portfolio-level "standard covers only X% of runs" banner above the rail (selection-independent); `recommendedPath` surfacing; ratio-framed Divergences/Errors (denominators); typed divergence vocabulary (added/removed/substituted visual treatment); single-path-state "record another run →" CTA; progressive-reveal slider; DNA-strip extraction into shared `<CategoryChipRow>`; SinglePathView next-action; `freqDiff` label disambiguation; substituted-op derivation; hover provenance polish; consistent variant numbering across views.

---

## 7. Recommended Build Sequence (cheapest comprehension-per-effort first)

1. **WPVL-P08** (XS) — stop the blank-first-render; every later change lands on a populated view.
2. **WPVL-P06** (S) — 3-line duration fix; revives fastest/longest + duration deltas at near-zero cost.
3. **WPVL-P01 + WPVL-P02** (M, one architectural family) — the aligned diff: the hero comprehension change and the correctness/honesty fix together. `system-architect` defines `AlignedVariantDiff`; `frontend-engineer` renders it.
4. **WPVL-P03** (S) — comprehension headline.
5. **WPVL-P04** (S) — honesty fix on insights.
6. **WPVL-P05** (S) — instrumentation (so we can measure whether 1–5 worked).
7. **WPVL-P07** (M) — evidence/provenance moat.

---

## 8. Success Metrics ("variation is now more understandable")

Defined by `analytics` (baselines unknown — no events today; WPVL-P05 establishes them):

- **M1 — Standardize-decision rate:** share of List sessions invoking `variant_compare_invoked` that reach a downstream action (SOP/Report nav or row click) within the session. Target 15% within 90 days of instrumentation.
- **M2 — Selection depth:** median `variant_path_selected` per List session ≥ 2 within 90 days (depth 1 = never engaged beyond the auto-selected standard).
- **M3 — List-view reach:** ≥ 25% of variant sessions visit the List view at least once within 60 days (diagnostic for discoverability of the CEO-anchored surface).

---

## 9. Determinism & Traceability Verdict

- **Engine layer:** sound. `analyzeDivergence` is version-pinned and order-invariant; tie-breaks across `classifyPaths` / `variantFlowModel` are deterministic (id / lexical fallbacks). No `Date.now()` / `Math.random()` in the List render path.
- **Projection layer:** **violating.** Positional `taskNodes[i]` renders evidence that does not trace to the variant's source runs (C1/C5/C7). `divergencePoints` is split-brained between two adapters (one returns `[]`), so the "Divergences" headline can read 0 while branches demonstrably exist.
- **Net:** the defect is entirely in the **adapter→List projection**, not the engine. Fixing it *strengthens* all four Ledgerium core invariants (determinism, traceability, evidence-linkage, correctness) — it is the highest-alignment kind of work.

---

## 10. CEO Decisions Pending

1. **Promotion disposition** — promote the 8 P0s (WPVL-P01…P08) to the live backlog with `Birth iter: audit-intake`, holding ~14 cold? (Recommended.)
2. **Sequencing vs current endorsed pick** — iter 075 currently endorses `#101 WDC2-P02`. Insert this Variants-List program before/after, or interleave? (Recommend: schedule WPVL-P08 + P06 as quick wins, then the P01/P02 aligned-diff family as the flagship.)
3. **Scope of first cut** — ship `kept/inserted/skipped` diff only (defer `substituted`)? (Recommended for smallest reversible first slice.)
4. **Moat surfacing priority** — elevate WPVL-P07 (evidence provenance) given its category-first differentiation, or keep it after the comprehension core?

---

*Mode 3-adjacent diagnostic. Does NOT increment improvement-loop cadence. Zero CLAUDE.md governance diffs. Zero product code modified. Validation: `git status` scope = this artifact only.*
