# Process Variation — Hardening Review Synthesis (2026-06-11)

7-agent production-readiness review (qa, frontend, system-architect, backend, ux, process-mining algorithms, analytics). Per-agent detail in this folder. This file = the consolidated, prioritized punch-list + what's fixed.

## The user's reported symptom (root cause)
"Workflows show '3 runs (all-time)' but Variants says 'Single recording — no variants to compare yet.'"

Root cause: the 3 runs share the **same path** → the engine correctly finds **1 variant over 3 runs (zero variation)**, but the UI gate `variants.length > 1` fell through to the **single-recording** empty state and hard-coded `totalRuns=1`. Compounded by: a backend that could **silently 500** on a corrupt/old artifact (→ blank tab), and a similarity threshold that may not merge *near*-identical runs.

## FIXED in this batch (validated: typecheck, 1342 tests, build, smoke 8/8)
1. **Empty-state correctness** — multi-run-but-identical now shows a positive **"Consistent process — N runs, all the same path"** state with the real run count, instead of the false "single recording." `WorkflowVariantsMap.tsx` (totalRuns threaded; new banner).
2. **Backend resilience (BUG-1)** — per-row `try/catch` around artifact `JSON.parse` so one corrupt row can't 500 the whole user's variants analysis. `intelligence.ts`.
3. **Missing step data (BUG-2)** — filter workflows lacking `processDefinition.stepDefinitions` so `computePathSignature` can't throw. `intelligence.ts`.
4. **Honesty (UX/algorithms)** — decision-point node label "decision" → **"diverges"** (the data shows paths differ here, not a known condition).

## PENDING — prioritized backlog to reach "highly polished, production-ready"

### P0 (ship-blockers)
- **Evidence-linkage broken** (architect/qa/backend): `evidenceRunIds` carry `processRun.runId` (= `sessionId`), **not** `Workflow.id` — the drill can't navigate to the source recording and the analytics drill intersects disjoint id-spaces. Fix: carry a `runId → {workflowId,title}` map (derivable in `analyzeWorkflowVariants`) and link to `/workflows/{id}`.
- **Scaling / O(n²)** (architect/backend): `analyzeWorkflowVariants` loads ALL active workflows + `JSON.parse`s every artifact + pairwise `clusterSignatures` on **every** variants-map open, uncached, no cap. Fix: add `take` cap + step-count pre-filter now; drive cohort from the **persisted `ProcessDefinition`** (also resolves "two screens disagree") as the real fix.
- **Loading / error / upgrade states** (frontend/ux): the lazy fetch has **no** loading state (shows the placeholder), a 403 (non-Team) silently shows single-path (the 403 body already has `requiredPlan`/`upgradeUrl`), network errors have no retry. Add proper states.
- **No e2e coverage of variants mode** + **no golden-fixture determinism test** (qa): the hydration smoke gate never enters variants mode; add `data-testid`s + a Playwright path + a pipeline determinism fixture.

### P1
- **Determinism leak**: `variantDetector.ts:39` `new Date().toISOString()` → inject a clock (iter-037 `referenceNowMs` pattern). Also `intelligenceEngine.ts` `computedAt`.
- **Branch run-share double-count** (algorithms/architect): a variant that produces 2 branches has its `runCount` summed into both → shares + conforming can exceed 1.0. Correct the partition.
- **Threshold calibration**: 0.6 is an unvalidated guess; 1-insertion merges (0.61) but 1-substitution doesn't (0.52). Calibrate via the labeled hold-out (precision-biased ≥0.7); plumb threshold + version into the API. Add a **min-runs honesty gate** (don't present low-N variants as established).
- **Wrong-recording node mapping** in `StepSequenceView` (positional `taskNodes[i]` against the current recording) — wrong labels/durations for non-standard variants.
- **Head-divergence backward arrow** in the story map (source `bb-0` at x=0 but branch nodes at x=-102).
- **Zero analytics** on the feature — add the 6-event privacy-safe spec.

### P2
- Discoverability: variant-count badge on the mode switcher + library row; legend on the map; "DNA"→"Compare" labeling; cross-view selection state.
- Node labels (show step name, not just category abbrev); React.memo on the node; separate the expensive `analyzeDivergence` from the cheap top-N slice in the memo; evidence-panel max-height.

## Recommended sequencing
- **Batch 2 (P0 UX+correctness):** loading/error/upgrade states · evidence run→workflow links · branch double-count · head-divergence arrow.
- **Batch 3 (P0 robustness):** cohort-from-ProcessDefinition + N-cap · determinism clock injection · variants-mode e2e + golden determinism fixture.
- **Batch 4 (calibration + polish):** threshold calibration + min-runs gate · analytics · discoverability + visual polish.
