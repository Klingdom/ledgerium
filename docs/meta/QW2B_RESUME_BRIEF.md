# QW2b Resume Brief — DFG Performance Overlay (toggle)

**Created:** 2026-06-19 (handoff to a fresh session; prior session hit context limits on the large view files).
**Parent plan:** `docs/meta/DASHBOARD_WORKFLOW_COMPETITIVE_REVIEW_001.md` §3 (workflow move 1) + §6 (QW2).

## Status entering QW2b
- Working tree is GREEN (web-app: 102 files / 2026 tests pass; `pnpm --filter @ledgerium/web-app typecheck` clean). Changes are UNCOMMITTED WIP.
- **QW1 COMMITTED** (`8118c97`): dashboard stat-columns unlocked + N-attribution.
- **QW2 foundation DONE + validated (uncommitted):**
  - `apps/web-app/src/lib/dfgModel.ts` — `DfgNode` + `DfgEdge` now carry `meanDurationMs` / `medianDurationMs` / `p95DurationMs` / `durationSampleCount` (deterministic; node = sojourn time, edge = target-step time; `durationSampleCount===0` → all 0). `DFG_SCHEMA_VERSION = 2`. `Math.max(...spread)` replaced with `.reduce()` (crash fix). Tests in `dfgModel.test.ts` green.
  - `apps/web-app/src/components/workflow-view/adapters/dfgToReactFlow.ts` — carries the 4 duration fields onto React Flow node/edge `data` (see ~lines 234-235 node, 257-258 edge). Tests in `adapters/dfgToReactFlow.test.ts` (28) green.

## QW2b remaining work (one logical outcome = "DFG gains a visible performance/time overlay")
Edit ONLY `apps/web-app/src/components/workflow-view/DfgFrequencyMap.tsx` (~547 lines — READ IN CHUNKS via Grep+offset/limit) + its test if a harness exists.
1. Add a **"Frequency / Performance" segmented toggle** above the canvas (useState, default = `frequency` so current behavior is byte-identical).
2. **Performance mode rendering:** encode edge color AND node background by duration on a **3-stop scale derived from the visible data range** (min/median/max — NOT hardcoded thresholds): fast=blue/green, medium=amber, slow=red. Hold edge thickness FIXED in performance mode (avoid double-encoding). Nodes/edges with `durationSampleCount < 2` render neutral/gray + tooltip "Insufficient data for performance view". The duration fields are already on the RF node/edge `data` (from `dfgToReactFlow.ts`).
3. Add a **legend** showing the 3 duration stops with their ms values (use a `formatDurationMs`-style helper).
4. Switching modes must NOT reset the coverage slider or path highlights.
5. Fire analytics `dfg_performance_mode_toggled` (existing `track` import; add to the event discriminated union in `src/lib/analytics.ts` if needed — that's the only allowed cross-file touch).
6. While in `DfgNodeComponent`: fix the **memo break** (extract the inline `baseStyle` object so `React.memo` can bail) — low-risk, you're already there.
7. VERIFY `filterDfgByCoverage` in `dfgModel.ts` is O(E) (build a `Map<id,edge>` once, not `.find()` in loops); fix if still O(E²).

## Constraints
- Determinism: no `Date.now()`/`Math.random()` in render or build paths (analytics `Date.now()` in useEffect/callback is fine). Total-order preserved.
- Scope: do NOT touch dashboard, admin, extension, or the unrelated WIP (AskThisProcessPanel/sop-view/ask-API). Frequency mode must stay byte-identical to today.
- Validate: `pnpm --filter @ledgerium/web-app test` + `typecheck` before declaring done.

## Commit plan (after QW2b validated)
The DFG files are previously-untracked WIP. Committing a COHERENT, working DFG feature requires also committing the wiring (`WorkflowVariantsMap.tsx` / `WorkflowPageShell.tsx`) that renders `DfgFrequencyMap` — these are broader in-progress files. CONFIRM with CEO whether to include them in the QW2 commit, then commit the DFG feature set as one unit (dfgModel + dfgToReactFlow + DfgFrequencyMap + wiring + tests). Leave truly unrelated WIP (Ask-This-Process / sop-view / ask-API / analytics beyond the one event) OUT.
Push is gated in-environment — CEO runs `git push origin main`.

## Other Quick-Win wave items still pending (after QW2b)
QW3 correctness pass (stale-edges `setEdges` bug in WorkflowCanvas/swimlane; resetView setTimeout; loose `any` view-model contracts) · QW4 surface bottleneck+drift on both pages · QW5 per-step timestudy in node inspector. See REVIEW_001 §4-§6.
