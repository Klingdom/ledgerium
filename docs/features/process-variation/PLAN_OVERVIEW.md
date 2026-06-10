# Workflow Clustering + Process-Variation Analysis — Complete Plan

**Date:** 2026-06-10 · **Type:** Define-phase multi-agent plan (product-manager, system-architect, ux-designer, analytics, competitive-researcher, process-mining algorithms specialist). **Design only — no product code changed.**

This is the index + synthesis. Six detailed artifacts sit beside it in `docs/features/process-variation/`:
| Artifact | Owner | What it gives you |
|---|---|---|
| `PRD_PROCESS_VARIATION.md` | product-manager | problem, personas, stories+acceptance, MVP boundary, metrics, open questions |
| `ARCHITECTURE_CLUSTERING_VARIATION.md` | system-architect | pipeline, data model, contracts, 7-iteration sequencing |
| `ALGORITHMS_CLUSTERING_VARIATION.md` | algorithms specialist | exact formulas + pseudocode, determinism proofs, worked example |
| `UX_FLOWS_PROCESS_VARIATION.md` | ux-designer | dashboard grouping, cluster control, the diverge→reconverge diagram, reporting |
| `MEASUREMENT_PLAN_PROCESS_VARIATION.md` | analytics | clustering-quality proxies, 11 events, acceptance gates, experiments |
| `RESEARCH_PROCESS_MINING_STANDARDS.md` | competitive-researcher | XES/BPMN/DFG, IMf/Split Miner, trace clustering, conformance, adopt/avoid |

---

## 1. The problem, in one line

`clusterWorkflows()` (`apps/web-app/src/lib/intelligence.ts`) groups recordings **only when their path signature is byte-identical.** So the moment a human does the same process slightly differently, it fragments into many singleton "processes" — and `detectVariants()` never sees real variation. Today every recording is an island; users can't see *"this is the 12th run of the same process, and here's where the runs differ."*

**The good news (all 6 agents converged on this):** the hard parts are already built and unused. `pathSignature.ts` ships `computeSignatureSimilarity` (bigram-Jaccard + count-ratio); `variantAnalyzer.ts` ships LCS/Wagner-Fischer `computeVariantDistance`; there are `exactGroupScorer`, `familyScorer`, `componentReuseScorer`, `detectVariants`, `analyzeVariance`. **MVP is wiring these into the grouping decision — not inventing algorithms.**

## 2. Recommended approach (best-in-class, deterministic)

- **Cluster "same/similar":** a deterministic blended similarity — `0.45·LCS + 0.25·shingle-Jaccard + 0.15·category-Jaccard + 0.15·system-Jaccard` (reusing the existing LCS + bigram-Jaccard), with an **LCS hard floor** to protect precision; **MinHash+LSH** candidate generation for scale (O(n) not O(n²)); **single-link/connected-components** agglomeration with **stable tie-breaking** and a pinned `ALGORITHM_VERSION` hash so re-runs are byte-identical. Incremental on each new recording: join nearest cluster above threshold, else spawn; merge/split only in an auditable batch reconcile.
- **Variants:** reuse `detectVariants`/`buildVariantRecords` fed a *cluster* (not a signature group); deterministic standard-path selection (most-frequent, total-ordered tie-break).
- **Diverge→reconverge** (the headline the CEO asked for): **LCS-backbone star-alignment** across the cluster's runs → explicit `(divergeAfter, reconvergeAt, altSteps, % of runs, evidenceRunIds)`, cross-checked by **DFG out-degree>1 (split) / in-degree>1 (join)**. No reference model required; every branch traces to the exact source runs — the evidence-linked moat made visible.
- **Standards:** internal **DFG**; **XES** for export; **IMf / Split Miner → BPMN** when discovered models are needed (Phase 3). **Avoid** neural embeddings / Fuzzy Miner / token replay (non-deterministic or evidence-breaking).

## 3. UX in one picture

- **Dashboard/library:** a process row shows *"Process X · 14 runs · 3 variants · 82% follow the standard path"* (run-count subtext + a 4px path-coverage bar + variant badge). A new recording shows *"added to <process> (run 15)."* Single-run rows look intentional ("1 run recorded · Variants: Not yet"), never broken.
- **Cluster control:** a slide-in drawer that **shows the grouping evidence first** ("grouped on step sequence + apps, 88% similar"), then offers **move / split / merge / not-this-process** with a 10-second undo (no `window.confirm`).
- **The diverge→reconverge diagram (centerpiece):** a left→right graph with shared steps on a green **spine**, variant-only steps **branching** off and **rejoining** ("82% continue · 18% handle an error first → paths rejoin here"), a **Variant DNA strip** above it, and click-through from any branch to the **source runs**. Lives **inside the Report's `rpt-variance` section** (no new tab); spaghetti (5+ variants) defaults to top-3 + "show all."
- **Honest stats:** single-run suppresses variant metrics entirely with a clear "record again to unlock" — no fake "(1 run)" numbers.

## 4. Phased roadmap (each phase independently shippable, gate-green, reversible)

**Phase 1 — MVP (cluster + see the variation).** Build the similarity-clustering engine as pure, unwired, tested modules; then wire it into grouping **behind a flag with exact-signature fallback**; populate variant records; surface the **variant distribution + standard path** in the Report's Variance & Variants section and the **grouping signal** on the dashboard. *Outcome: recordings auto-group, and a multi-run process shows "N runs · K variants · X% standard path."*

**Phase 2 — fast-follow (the diverge→reconverge story + control).** Ship the LCS-backbone divergence detector + the **branch diagram / Variant DNA** visualization, and the **cluster review/override** drawer (merge/split/move/not-this-process with evidence + undo).

**Phase 3 — later (depth).** Alignment-based conformance + per-step **deviation heatmap**; **BPMN discovery** (IMf/Split Miner) for discovered models/SOPs; **log-to-log variant comparison**; XES/OCEL export.

Maps onto the architect's 7 iterations (C+1 pure engine → C+2 variant records → C+3 flagged live grouping → C+4 divergence → C+5 LSH scale → C+6 review/override → C+7 conformance/BPMN). Highest-leverage first move: **wire `computeSignatureSimilarity` into grouping = ~80% of the capability.**

## 5. How we know it works (measurement)

No ground truth at runtime, so clustering quality is measured by **proxies**: mean intra-cluster similarity (the engine's own confidence), **singleton rate** (segmented by recording count), and the inverse-quality signal **user-correction rate** (split/merge/reject per N auto-groups) — plus a **determinism hard-gate (100% stable re-runs)**. Variation value is measured by variant-view engagement (section viewed, branch clicked, drill-to-run) and time-to-first-variation-insight. **11 privacy-safe events** (counters, never workflow content), cohorted by `clustering_model_version`. Ship gates: determinism 100%, intra-cluster similarity ≥ threshold, user-correction rate < ~15%. Validate with a **labeled hold-out** (human-labeled, content-stripped pairs) + a **staged rollout** (does grouping increase repeat recording?).

## 6. Decisions the CEO needs to make

1. **Diverge→reconverge in Phase 1 or Phase 2?** (PRD OQ-1.) It's the headline you asked for; pulling it into MVP is heavier but more impactful. Default: Phase 2.
2. **Manual cluster override in Phase 1 or Phase 2?** (PRD OQ-5.) Default: Phase 2 — but mis-grouping with no override erodes trust, so consider a minimal "not-this-process" escape hatch in MVP.
3. **Similarity threshold.** Agents proposed a conservative band (≈0.72 merge, hysteresis 0.78/0.86 to stop re-cluster thrash). Lower = more grouping + more false merges; higher = more singletons. Recommend starting conservative + tuning from the correction-rate signal.
4. **Plan gating.** Variant **count** visible to all; the **diagram + drill-down** gated to Team/Growth (a concrete upgrade trigger). Confirm.
5. **Schema note (coordinator/architect flag):** `Workflow.variantId`/`variantFingerprint` are reserved by prior Path-E work — use a dedicated additive `clusterVariantRecordId` column rather than dual-writing. Approve.

## 7. Principles held throughout

Deterministic (no `Date`/`random` in any decision path; pinned seeds; stable total-order sorts; version-hash-gated recompute) · evidence-linked (every cluster, variant, and branch traces to immutable source events) · additive migrations · reuse-over-reinvent · no parallel UI surface (extends the existing Workflow/SOP/Report structure). Nothing here ships until it passes the standard gates (typecheck · tests · build · the hydration smoke gate) — and, per current operating reality, nothing deploys until validated end-to-end.

---
*Define-phase artifact set. Recommended next step: CEO resolves §6, then Phase 1 opens as a Mode 1/Mode 2 iteration series starting with the pure clustering-similarity engine (architect C+1), which is reversible and ships behind a flag.*
