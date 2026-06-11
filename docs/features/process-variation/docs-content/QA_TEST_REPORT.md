# QA Test Report — Process Variation Feature (Sample Multi-Run Workflows)

**Date:** 2026-06-11
**QA Agent:** qa-engineer
**Scope:** End-to-end validation of the "Approve Expense Report (Sample)" demo seed, the variation-analysis engines, process-mapping views, and E2E coverage gap assessment.
**Read-only:** no product code modified.

---

## 1. Test Suite Runs — Pass Counts

### 1a. `pnpm --filter @ledgerium/web-app test`

Result: **72 test files, 1351 tests — ALL PASS**

Relevant subset: `src/lib/sample-variants.test.ts` — 4 tests, PASS.

### 1b. `pnpm --filter @ledgerium/intelligence-engine test`

Result: **8 test files, 178 tests — ALL PASS**

Relevant subsets:
- `src/intelligenceEngine.test.ts` — 44 tests including `detectVariants`, `analyzePortfolio`, drift, bottlenecks, variance: ALL PASS
- `src/clustering/clustering.test.ts` — clusterSignatures: ALL PASS
- `src/divergenceAnalyzer.test.ts` — analyzeDivergence: ALL PASS

### 1c. Focused run: `sample-variants`

Isolated filter output: `src/lib/sample-variants.test.ts — 4 tests, PASS` in 17 ms.

The 4 tests (runs cleanly / distinct variants / one cohort / branchy story map) ALL PASS with no assertion failures or timeouts.

---

## 2. Variation Analysis Correctness on the Sample

Evidence source: instrumented vitest trace run (temporary `qa_trace.test.ts`) executed against production engine code; trace output captured and verified below.

### 2a. Single-cohort clustering

`clusterSignatures` with threshold 0.6 over the 8 recordings produces **1 cluster of size 8**. All 8 runs — including the 4-step shortcut and the 6-step exception path — merge into one cohort. This is correct: the LCS-based `traceSimilarity` tolerates the insertions and deletions; the standard ↔ shortcut blended similarity (0.6 * lcsSim + 0.4 * catSim) clears the 0.6 threshold. The test assertion `clusters[0].size === 8` passes.

### 2b. `analyzePortfolio` variant detection

| Variant | runCount | frequency | isStandard | stepCategories (categories) |
|---|---|---|---|---|
| variant-1 (standard) | 4 | 0.5 | true | click_then_navigate, data_entry, fill_and_submit, send_action, single_action |
| variant-2 (insertion) | 2 | 0.25 | false | click_then_navigate, data_entry, single_action, fill_and_submit, send_action, single_action |
| variant-3 (exception) | 1 | 0.125 | false | click_then_navigate, data_entry, fill_and_submit, error_handling, send_action, single_action |
| variant-4 (shortcut) | 1 | 0.125 | false | click_then_navigate, data_entry, fill_and_submit, single_action |

Observed:
- `variantCount = 4` — correct; 4 distinct category sequences detected.
- `standardPath.runCount = 4` — correct; 4 of 8 runs follow the standard path (the 4 STANDARD recordings).
- `standardPath.frequency = 0.5` — correct.
- Frequency sum: 0.5 + 0.25 + 0.125 + 0.125 = **1.0** — correct; no double-count.
- `metrics.runCount = 8` — correct.

Evidence run ids on the standard path: `["sample-variants-001","sample-variants-002","sample-variants-003","sample-variants-004"]` — correct; those are the 4 STANDARD recordings.

Evidence run ids for variant-2 (insertion): `["sample-variants-005","sample-variants-006"]` — correct; those are the 2 INSERTION recordings.

### 2c. Fastest / Longest / Exception classification (UI layer)

`classifyPaths` in `WorkflowVariantsMap.tsx` assigns roles. Tracing with the 4 variants above:

- **Standard (variant-1):** `role = 'standard'`. Correct.
- **Fastest (variant-4, shortcut):** This is the shortest path (4 steps). Duration classification uses `avgDurationMs`; the adapter populates this as `null` when extracted from intelligence JSON (see `variantAdapter.ts:98`). With `avgDurationMs === null`, the `withDuration` array is empty and `fastestId = null`. Therefore **the shortcut is NOT labeled "Fastest"** — it falls through to `role = 'variant'`. This is a minor display gap (not a data integrity bug) but reduces documentation clarity.
- **Longest (variant-2, insertion):** Same null-duration issue — not labeled "Longest".
- **Exception (variant-3):** The exception variant has **1 `error_handling` step**. The `classifyPaths` threshold is `errorCategories.length >= 2`. Therefore the exception variant is labeled `role = 'variant'`, NOT `'exception'`. The "Exception Heavy" badge does NOT appear for this path in documentation screenshots.

**BUG-001 (P2 — Medium):** Exception variant not labeled "Exception Heavy" because the sample has exactly 1 error step and the threshold requires >= 2. See Section 5.

### 2d. Divergence branch structure

`analyzeDivergence` operating on the 4 variant-level runs against the 5-step backbone:

| Branch | divergeAfterIndex | reconvergeAtIndex | altSteps | skippedBackbone | runCount | frequency | dfgSplit | dfgJoin |
|---|---|---|---|---|---|---|---|---|
| insertion (variant-2) | 1 (after data_entry) | 2 (at fill_and_submit) | [single_action] | [] | 1 | 0.25 | true | true |
| exception (variant-3) | 2 (after fill_and_submit) | 3 (at send_action) | [error_handling] | [] | 1 | 0.25 | true | true |
| shortcut (variant-4) | 2 (after fill_and_submit) | 4 (at single_action) | [] | [send_action] | 1 | 0.25 | true | true |

Observations:
- 3 branches detected — correct (insertion + exception + shortcut).
- All 3 branches have `dfgConfirmedSplit = true` and `dfgConfirmedJoin = true` — both the DFG and LCS alignment agree on every branch.
- `conformingRunCount = 1` at the variant level (only variant-1 conforms exactly to the backbone when processed as a variant input). This is structurally correct: the divergence engine receives variant representatives, not individual session runs.
- Frequencies are 0.25 each because 3 of 4 variants diverge (1 conforms); this is correct for variant-level analysis. The run-weighted view (4/8 = 50% conforming) is correctly surfaced in the story map (see Section 3).

**Note on branch altSteps for insertion:** The insertion branch shows `altSteps = [single_action]` not `[single_action, fill_and_submit]`. This is correct: the LCS alignment anchors `fill_and_submit` (present in the backbone) and only the truly-inserted `single_action` ("Request clarification" category is `single_action` in the seed) becomes the alt step. The insertion branch correctly diverges after `data_entry` and rejoins at `fill_and_submit`.

---

## 3. Process Mapping — Story Map Correctness

Evidence: trace run output.

### 3a. Spine

`backbone = ["click_then_navigate","data_entry","fill_and_submit","send_action","single_action"]`
`backbone.length = 5` — matches the 5-step standard path. Correct.

### 3b. Nodes and positions

- 5 backbone nodes (bb-0 through bb-4) on the spine (y = 0, x-spaced at 170px intervals).
- 2 branch nodes (br-0-0 for the insertion single_action, br-1-0 for the exception error_handling).
- Shortcut creates no branch node (empty altSteps).
- Total: 7 nodes. Correct.

Decision flag: `bb-1` (data_entry) is marked `isDecision = true` (insertion branch diverges there). `bb-2` (fill_and_submit) is marked `isDecision = true` (exception and shortcut both diverge there). Correct.

### 3c. Branches

| Edge id | source | target | kind | runCount | runShare | evidenceRunIds |
|---|---|---|---|---|---|---|
| spine-0..3 | bb-0..3 | bb-1..4 | spine | 8 | 1.0 | [] |
| branch-0-in | bb-1 | br-0-0 | branch | 2 | 0.25 | ["sample-variants-005","sample-variants-006"] |
| rejoin-0 | br-0-0 | bb-2 | rejoin | 2 | 0.25 | ["sample-variants-005","sample-variants-006"] |
| branch-1-in | bb-2 | br-1-0 | branch | 1 | 0.125 | ["sample-variants-008"] |
| rejoin-1 | br-1-0 | bb-3 | rejoin | 1 | 0.125 | ["sample-variants-008"] |
| shortcut-2 | bb-2 | bb-4 | shortcut | 1 | 0.125 | ["sample-variants-007"] |

All 3 branches rejoin the backbone. Evidence run ids on branch edges are real session IDs (`sample-variants-005` through `sample-variants-008`). The click-a-branch evidence drill is fully operational for all 3 branches.

`branchCount = 3`, `shownBranchCount = 3` (no complexity filter active). Correct.
`totalRuns = 8`, `conformingRunCount = 4`. The headline "50% of 8 runs follow the standard path. 3 branches off and rejoin." is correct.

### 3d. Determinism

`buildVariantStoryMap` is deterministic — same variants in any input order produce a byte-identical map (verified by `variantStoryMap.test.ts` permutation-invariance test, PASS). Positions are arithmetic with no Date/Math.random.

---

## 4. E2E Gap and Playwright Test Plan

### 4a. Current gap

The existing smoke spec (`analysis.smoke.spec.ts`) navigates to `/workflows/[id]` and clicks the "Report" tab. It does NOT navigate to "Process Variants" mode. The `documentation-screenshots.spec.ts` calls `goToFirstWorkflow` and captures the flow view, swimlane, and several tabs — but has no step for entering Process Variants mode.

Zero Playwright tests currently exercise:
- The "Process Variants" mode switcher button
- The Map / DNA / List sub-view toggle within Variants mode
- The complexity-slider (branch count filter)
- The evidence drill (clicking a branch edge to reveal session IDs)
- The `WorkflowVariantStoryMap` React Flow canvas rendering
- The `VariantDnaStrip` row rendering

### 4b. Concrete Playwright test plan

The test should run on the `authenticated` project (uses the stored auth state) after seeding the sample variants via `POST /api/sample-variants`.

```
File: apps/web-app/e2e/app/workflow-variants.spec.ts
Project: authenticated
Setup: POST /api/sample-variants → get sample workflow id
```

**Step sequence:**

1. POST `/api/sample-variants` — assert 200, capture `{ id }`.
2. `page.goto(/workflows/${id})` — wait for `networkidle`.
3. Assert URL matches `/workflows/${id}` (not redirected).
4. Collect `pageErrors` and `consoleErrors` throughout.

**Enter Variants mode:**

5. `page.getByRole('button', { name: 'Process Variants' }).click()`
   - Selector: `button` containing text "Process Variants" in the mode switcher (`WorkflowModeSwitcher`).
6. Wait for the variants status to resolve: `await page.waitForTimeout(3000)` (variants are lazy-loaded via `analyzeWorkflowVariants`).
7. Assert NO "Application error" text: `expect(page.locator('text=Application error')).toHaveCount(0)`.
8. Assert the "Analyzing runs…" spinner is gone (either replaced by map or by "Not enough variation" message).

**Data-testid additions needed** (none currently exist on variants components):
- `WorkflowModeSwitcher` button for variants: `data-testid="mode-variants"` on the button where `mode === 'variants'`.
- Variants headline bar: `data-testid="variants-headline"` on the `<span>` rendering the "X% of N runs follow the standard path" summary in `WorkflowVariantStoryMap`.
- View toggle buttons: `data-testid="variants-view-map"`, `data-testid="variants-view-dna"`, `data-testid="variants-view-list"` on the three toggle buttons in `WorkflowVariantsMap`.
- DNA strip container: `data-testid="dna-strip"` on the root div of `VariantDnaStrip`.
- Path card container: `data-testid="variant-path-card"` on each `PathCard` root div.

**Assertions after Variants map loads (Map sub-view):**

9. `expect(page.locator('[data-testid="variants-headline"]')).toContainText('50%')` — standard path conformance.
10. `expect(page.locator('[data-testid="variants-headline"]')).toContainText('3 branches')` — branch count.
11. Assert React Flow canvas rendered: `expect(page.locator('.react-flow__renderer')).toBeVisible()`.

**Switch to DNA sub-view:**

12. `page.locator('[data-testid="variants-view-dna"]').click()`.
13. `await page.waitForTimeout(500)`.
14. `expect(page.locator('[data-testid="dna-strip"]')).toBeVisible()`.
15. Assert 4 rows (one per variant): `expect(page.locator('[data-testid="dna-strip"] .flex.items-center')).toHaveCount(4)`.

**Switch to List sub-view:**

16. `page.locator('[data-testid="variants-view-list"]').click()`.
17. `await page.waitForTimeout(500)`.
18. Assert 4 path cards: `expect(page.locator('[data-testid="variant-path-card"]')).toHaveCount(4)`.
19. Assert standard path card visible: `expect(page.locator('[data-testid="variant-path-card"]:has-text("Standard Path")')).toBeVisible()`.

**No client-side exception:**

20. Assert `pageErrors` contains no hydration/crash patterns.
21. Assert `page.locator('text=Application error')` has count 0.

**Missing data-testids required before this test can be written (full list):**

| Component | File | Needed attribute |
|---|---|---|
| mode-variants button | WorkflowModeSwitcher.tsx | `data-testid="mode-variants"` |
| variants headline span | WorkflowVariantStoryMap.tsx | `data-testid="variants-headline"` |
| map view button | WorkflowVariantsMap.tsx | `data-testid="variants-view-map"` |
| dna view button | WorkflowVariantsMap.tsx | `data-testid="variants-view-dna"` |
| list view button | WorkflowVariantsMap.tsx | `data-testid="variants-view-list"` |
| dna strip root | VariantDnaStrip.tsx | `data-testid="dna-strip"` |
| path card root div | WorkflowVariantsMap.tsx (PathCard) | `data-testid="variant-path-card"` |

---

## 5. Bug List

### BUG-001

**Severity:** P2 — Medium (documentation display gap; no data integrity impact)

**File:** `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx`

**Line:** 142

**Description:** The "Exception Heavy" role badge is never applied to the sample exception variant because the threshold is `errorCategories.length >= 2` and the sample exception path has exactly 1 `error_handling` step. The variant displays as `role = 'variant'` instead of `role = 'exception'`. Documentation screenshots will show a generic "Variant" badge on the exception path rather than the distinctive red "Exception Heavy" badge.

**Reproduction:**
1. Seed sample variants via `POST /api/sample-variants`.
2. Open any of the 8 workflows → Variants mode → List view.
3. Observe the "Retry notification (failed)" / exception path shows badge "Variant" in indigo, not "Exception Heavy" in red.

**Expected:** exception path (recording 8) shows red "Exception Heavy" badge in the List view path card.

**Actual:** indigo "Variant" badge.

**Fix direction:** Either lower the threshold from `>= 2` to `>= 1`, or add a second error step to the EXCEPTION recording definition in `sample-variants.ts`. Option A (threshold change) is a 1-line fix. Option B (add a second error step) better demonstrates a multi-step exception path and makes the sample richer. The sample intent comment says "a failed notification triggers an error-handling retry" which suggests a retry loop with ≥2 error steps was the design intent — the seed was under-built.

**Release impact:** Blocks accurate documentation screenshots for exception-path feature. Non-blocking for functionality.

---

### BUG-002

**Severity:** P3 — Low (missing informational labels; no incorrect data)

**File:** `apps/web-app/src/components/workflow-view/adapters/variantAdapter.ts`

**Line:** 98

**Description:** `avgDurationMs` is always set to `null` for variants extracted from intelligence JSON (`extractVariantsFromIntelligence`). This means the "Fastest" and "Longest" role badges in `classifyPaths` can never fire (they require `withDuration.length > 1`). The shortcut path, which IS the fastest path, shows as generic "Variant" rather than "Fastest".

**Reproduction:**
1. Seed sample variants → Variants mode → List view.
2. Observe the shortcut path (4 steps, shortest duration) shows badge "Variant", not "Fastest".

**Expected:** shortcut variant labeled "Fastest"; exception or insertion variant labeled "Longest".

**Actual:** all non-standard paths show "Variant".

**Fix direction:** `analyzePortfolio` produces per-variant average duration via the `timestudy` sub-analysis. The `timestudy.stepPositions` covers per-step durations. Computing average variant duration requires matching variant evidence run ids against the `timestudy` per-run data. This is a medium-complexity enrichment not currently wired into the adapter. Alternative: pass `avgDurationMs` into the `ProcessVariant` type directly from the intelligence engine.

**Release impact:** Documentation screenshots will not show Fastest / Longest labels. Cosmetic for the initial variation-analysis demo.

---

### BUG-003

**Severity:** P3 — Low (missing E2E gate)

**File:** None (gap, not a code bug)

**Description:** No Playwright test verifies that the Process Variants mode renders without a client-side exception when loaded against real multi-run data. The smoke gate (`analysis.smoke.spec.ts`) only tests the Report tab. A crash in `WorkflowVariantStoryMap`, `VariantDnaStrip`, or `buildVariantStoryMap` would not be caught by CI.

**Release impact:** Variants mode crash would escape to production without CI detection.

---

### BUG-004

**Severity:** P3 — Low (incomplete documentation spec)

**File:** `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx` and related files

**Description:** No `data-testid` attributes exist on any Variants-mode UI element (mode button, view toggle, story map headline, DNA strip, path cards). This makes the feature completely un-automatable by Playwright selectors without brittle text or class-based heuristics.

**Release impact:** Blocks authoring of the E2E test specified in Section 4.

---

## 6. GO / NO-GO — Sample Workflows for Documentation

### Verdict: CONDITIONAL GO

The sample workflows correctly demonstrate the core variation-analysis and process-mapping features with the following evidence:

**What works correctly:**

- 8 deterministic recordings seed correctly via `buildSampleVariantBundles`.
- All 8 cluster into one cohort (similarity engine works end-to-end).
- `analyzePortfolio` correctly identifies 4 distinct variants, 50% standard-path adherence, and correct run counts per variant.
- The standard path is correctly identified with the 4 STANDARD recordings.
- All frequency values are correct and sum to 1.0 (no double-counting).
- `buildVariantStoryMap` produces a correct 5-node spine with 3 rejoining branches.
- DFG cross-check confirms split and join at every branch point.
- Evidence run IDs (real session IDs) are attached to every branch edge, enabling the evidence-drill click interaction.
- `VariantDnaStrip` will render 4 rows with the standard path first.
- The complexity slider (maxBranches) works correctly (verified by unit tests).
- All 4 sample-variants unit tests pass; all 1351 web-app tests pass; all 178 intelligence-engine tests pass.

**What needs fixing before using as documentation reference:**

1. BUG-001 (P2): The exception variant is not labeled "Exception Heavy" — the most visually distinctive badge for that path type will not appear in screenshots. This requires either a 1-line threshold change or enriching the EXCEPTION seed definition to include 2 error steps.

2. BUG-002 (P3): "Fastest" and "Longest" labels will not appear — the shortcut and insertion paths both show generic "Variant" badges.

**Minimum fix to achieve GO status for documentation:**

Fix BUG-001 (P2) before taking documentation screenshots. The exception-path badge is a headline feature of the Variants List view. Either:
- Change threshold `>= 2` to `>= 1` at `WorkflowVariantsMap.tsx:142`, OR
- Add a second `error_handling` step to the EXCEPTION path in `sample-variants.ts` (e.g., "Handle retry queue" step), matching the design comment "error-handling retry".

BUG-002 (P3) can be deferred — the List view is functional and communicates variant structure clearly even without the Fastest/Longest labels.

BUG-003 and BUG-004 should be fixed before the feature is considered release-complete but do not block documentation.
