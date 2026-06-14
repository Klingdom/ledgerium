# Report View — Consolidated Review + Flagship Plan
**Ledgerium AI** · 2026-06-14 · Status: FINAL FOR CEO

Six-specialist board review of the workflow **Report** view (`WorkflowReportPage.tsx`). Goal: make
it one of the best pages on the site, and fix the variance/variants misreporting. Synthesizes:
`REPORT_VARIANCE_VARIANTS_ROOTCAUSE.md` · `PM_REPORT_REVIEW.md` · `UX_REPORT_REVIEW.md` ·
`ANALYTICS_REPORT_REVIEW.md` · `ARCH_REPORT_REVIEW.md` · `COMPETITIVE_REPORT_BENCHMARK.md`.

## The bug (root-caused; FIXED this iteration)
**Consensus across backend + architecture + analytics:** the Report tab calls `POST /api/workflows/[id]/analyze`
→ `analyzeWorkflow()` which loads **one** workflow → `analyzePortfolio({ runs: [1 bundle] })` → engine
returns `runCount:1, variantCount:1, sequenceStability:1.0, highVarianceSteps:[]`. The
`VarianceVariantsSection` then short-circuits on `runCount < 2` to *"Recorded once. Run this workflow
again…"* — **even for the 16-recording sample**, which the Variants tab renders correctly because it
uses the **cohort** analyzer (`analyzeWorkflowVariants`, group ∪ similarity-cluster). The TypeScript
shapes match; the defect is purely single-run vs cohort population.
**Fix shipped:** point the `/analyze` route at `analyzeWorkflowVariants` (same Team+ gate, same return
shape; genuine single-run still falls back to 1 bundle → honest "recorded once"). Now Report and
Variants derive identical figures from the same cohort. Verified by e2e (the 16-run sample no longer
shows the single-run placeholder).

## Current state
A consolidation-complete single-scroll report (17 sections, right-rail scroll-spy) — the right
analytical categories exist, but it reads as a **data dump with decision islands**, not a decision-grade
report. Strengths: "Start Here" bottleneck callout, automation confidence banding, the variant
diverge/reconverge story. It lacks a verdict, leads with raw counts, hides computed signals (drift,
distributions, per-step variance, evidence run-ids), and exports raw JSON (not a shareable artifact).

## Prioritized improvements

### P0 — correctness + trust
1. **Variance/variants cohort fix** — ✅ DONE this iteration.
2. **Executive summary / verdict** — auto-generated, observed-only, 3 sentences (consistency → variants
   → top action). The single highest-leverage move; converts the dump into a document. *(template-based,
   zero LLM — deterministic.)*
3. **Metric honesty fixes** (analytics P0s): CV shown with interpretation bands + the engine's own
   `HIGH_VARIANCE_CV_THRESHOLD` disclosed; resolve the "active process time" (Σ step vs workflow
   duration) silent contradiction; bottleneck rows show run-count context + isHighDuration/isHighVariance;
   timestudy shows per-step run counts; gate "no inefficiencies detected" at runCount ≥ 2; suppress raw
   `pathSignature` hashes as variant identities.
4. **Surface the Drift Report** — the engine computes `drift.driftSignals[]`; the report has no drift
   section. (Earlier vs recent runs; uniquely deterministic via immutable timestamps.)
5. **PDF export** — replace the raw-JSON export with a shareable 2-page PDF (verdict + KPI tiles +
   variant chart / distribution + bottleneck table + an "all data from observed behavior" footer).

### P1 — best-in-class presentation (reuse dashboard band + Recharts, deterministic/hydration-safe)
6. **5-tile KPI scorecard** — Cycle Time (median) · Consistency (CV, color-coded) · Variant Count ·
   Bottleneck Step · Automation Score — each with a threshold interpretation.
7. **Variant frequency Pareto chart** as the dominant visual (run counts, %, "Reference path"; group
   1-2-run outliers as "Unique executions").
8. **Cycle-time distribution** (min/median/p90/max spread + reference line).
9. **Bottleneck contribution ranking** (% of total cycle time, run-count context).
10. **Consistency-score gauge** ("based on observed behavior, not a defined target").
11. **Insight cards** (Standardize / Automate / Investigate) with **evidence anchors (run #s)** → drill.
12. **Evidence linkage + nav** — finding → run → step; group the 17-entry nav into 4 categories; mobile
    TOC; section reorder (Insights → Automation directly; Bottlenecks before Automation).
13. **Unify the data contract** — Report + Variants tab + dashboard consume ONE shared
    `ProcessIntelligence` contract (delete the report's private lossy `IntelligenceData`); shared
    `InsightBand` reusing dashboard band components.

### P2 — polish + positioning
14. Human-readable variant labels · run-count/provenance badge · **"evidence-linked" header badge**
    ("Process Intelligence Report: [Workflow]") · report sharing/deep-link · process-owner metric labels.

## Sequencing (Mode-1 batches, each gated)
- **R-A (this iteration):** variance/variants cohort fix ✅ (+ e2e).
- **R-B:** executive summary/verdict + 5-tile scorecard + variant Pareto + the P0 honesty fixes.
- **R-C:** cycle-time distribution + bottleneck ranking + consistency gauge + insight cards + drift section.
- **R-D:** PDF export + unify the intelligence contract + evidence-linked header + nav grouping.

## Open CEO decisions
- **R-1** Executive summary: deterministic template (recommended) vs LLM.
- **R-2** Should multi-run report intelligence stay Team+ gated (it is today), consistent with the
  Variants tab? (The fix kept the existing gate — flag for pricing intent.)
- **R-3** PDF export scope (2-page stakeholder layout vs full).
- **R-4** Proceed R-B → R-D as a gated Mode-1 series.
