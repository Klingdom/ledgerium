# Phase 0 — Clustering Threshold Calibration Report

**Program:** Cross-Workflow Intelligence (T1→T6). **Phase:** 0 (calibration + reconciliation).
**Date:** 2026-07-12. **Status:** Provisional threshold established on local data; **production re-run required before T3 ships** (the calibration gate).

---

## 1. What Phase 0 delivered
- **Deterministic calibration harness** — `packages/intelligence-engine/src/calibration/calibrateThreshold.ts` (pure, 17 tests). Computes the pairwise `traceSimilarity` distribution + a threshold sweep over `clusterSignatures`, and recommends a threshold by **widest stable plateau** (ties → higher/more-conservative threshold). `CALIBRATION_VERSION = 'calibration/1.0.0'`.
- **Runnable script** — `apps/web-app/scripts/calibrate-clustering.ts` (`pnpm --filter @ledgerium/web-app calibrate:clustering`). Read-only; derives each workflow's `PathSignature` via the same `computePathSignature()` the app already uses; calibrates **per user** (matching production's per-user clustering scope) + a reference-only global pool.
- **Composite-distance contract + build spec** — `BUILD_SPEC.md` defines the versioned `workflowSimilarity(a,b)` (0.45 signature + 0.25 fingerprint + 0.20 systems-Jaccard + 0.10 duration-band, renormalized when duration is null) and the new `WorkflowSimilarityEdge` table.
- **AI-score reconciliation** — `AI_SCORE_RECONCILIATION.md`: the two scores are **legitimately distinct** (per-workflow live `automate` gate vs per-group automation opportunity), NOT a duplicate. Resolution = documented two-score contract + hard non-mixing rule; **no risky merge before T1**.

## 2. Calibration result (local dev data — 46 workflows / 3 users)
Global reference pool (N=21) pairwise-similarity histogram shows a **clear natural separation**:

| bucket | pairs | | bucket | pairs |
|---|---|---|---|---|
| [0.60,0.70) | 43 | | **[0.80,0.90)** | **0 ← gap** |
| [0.70,0.80) | 35 | | [0.90,1.00] | 17 |

Threshold sweep — clustering is **stable across [0.75, 0.95]** (plateau); cluster count does not change through that range:

| threshold | clusters (global) | merged pairs |
|---|---|---|
| 0.50–0.70 | 4–8 | 114→52 (over-merging) |
| **0.75–0.95** | **11 (stable)** | 17 (stable) |

**Recommended provisional threshold: 0.90–0.95.** The empty [0.80, 0.90) bucket is a genuine gap separating "same process" (≥0.90) from "similar" (0.60–0.80); any threshold in that gap yields identical, stable clusters. The harness picks **0.95** (most conservative, fewest merges) per the confirm-not-auto-merge stance.

## 3. Gate before T3 (relationship graph / family browser)
1. **Re-run against production data** with a widened sweep (`min:0.3`) — the local set is small (3 users) and most per-user plateaus sit at the top of the default 0.5–0.95 range; a larger, representative dataset may shift the natural gap. The harness supports this with zero code change (`opts.min/max/step`).
2. **Confirm-not-auto-merge:** T3 must present family groupings as suggestions the user confirms, never silent auto-merges. A false merge of two genuinely different processes is a trust violation.
3. **Sign off** the finalized production threshold as a versioned constant (folded into the `workflowSimilarity` version hash).

## 4. Validation
`pnpm --filter @ledgerium/intelligence-engine test` → **195 pass** (+17); intelligence-engine + web-app typecheck clean. Harness is pure/deterministic (permutation-invariant, no clock/random/IO). Zero changes to `clusterSignatures`, `traceSimilarity`, or any existing scorer — purely additive, read-only analysis.

## 5. Next: T1 — Portfolio Time-Sink Ranking
Pure aggregation of already-trusted per-process bottleneck/timing across the library — zero clustering risk, does not depend on the finalized threshold. Ready to build.
