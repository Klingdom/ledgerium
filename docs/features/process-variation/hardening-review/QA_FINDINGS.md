# QA Findings — Process Variation Feature Hardening Review

**Date:** 2026-06-11
**Reviewer:** QA Engineer Agent
**Scope:** Full process-variation feature stack, read-only validation
**Test run baseline:** 2806/2806 tests pass across 114 test files (workspace `pnpm test` confirmed at review start)

---

## Section 1 — Bug List (Severity-Tagged)

---

### BUG-01 — P0 — Determinism Leak: `variantDetector.ts` `new Date().toISOString()` written into persisted `VariantSet`

**File:** `packages/intelligence-engine/src/variantDetector.ts:39`

**Evidence:**
```
const now = new Date().toISOString();
```
`now` is assigned to `VariantSet.computedAt` (line 46, empty-input path) and `VariantSet.computedAt` (line 108, normal path). The `VariantSet` is embedded inside `PortfolioIntelligence` which is returned by `analyzePortfolio` and then:

1. Stored to the DB as `intelligenceJson` in `apps/web-app/src/lib/intelligence.ts:250` (`clusterWorkflows` path).
2. Returned live over the wire from `/api/workflows/[id]/variants` and consumed by the React client.

**Determinism impact assessment:**

`computedAt` appears only in metadata — it is NOT used as a computation input anywhere downstream in the variants pipeline (confirmed: no code reads `VariantSet.computedAt` to drive logic). Therefore:

- The determinism violation does NOT corrupt the shape of branches, frequencies, evidenceRunIds, or any structural output.
- The DB-stored `intelligenceJson` will contain a different timestamp on each `clusterWorkflows` invocation, which is benign for display but prevents byte-identical comparison of stored intelligence blobs.
- The REAL RISK: existing determinism tests for `detectVariants` compare only `variantId`, `runCount`, and structural fields — they explicitly exclude `computedAt`. The test at `intelligenceEngine.test.ts:457-459` does exactly this. If a future test naively uses `toEqual` on the full `VariantSet`, it will fail intermittently.

**Severity justification:** P0 because the module's own header comment reads "Pure + DETERMINISTIC (no Date/random)" — this is a contract violation. Every other `computedAt` timestamp in the codebase follows the same pattern (see `bottleneckDetector.ts:38`, `metricsBuilder.ts:61`, etc.) and is equally present. However `variantDetector` is the only one with an explicit claim of full determinism in its doc comment without a carve-out for metadata. The contract must be corrected (either remove the claim or inject `now` as a parameter, consistent with how the fix was applied in `DashboardV2Shell.tsx` iter-038 for the `filterNowMs` boundary).

**Repro:** Call `detectVariants(bundles, opts)` twice 1ms apart; compare `.computedAt` — they will differ.

---

### BUG-02 — P1 — Visual: Head-Branch Edges Point Backward on the React Flow Canvas

**File:** `apps/web-app/src/lib/variantStoryMap.ts:161`, `apps/web-app/src/components/workflow-view/WorkflowVariantStoryMap.tsx`

**Evidence (variantStoryMap.ts:157-168):**
```typescript
const startIdx = b.divergeAfterIndex; // -1 for a head branch
const startX = (startIdx >= 0 ? startIdx : -0.6) * SPACING_X; // = -102 for head
...
const sourceBackboneId = `bb-${startIdx >= 0 ? startIdx : 0}`; // = bb-0 (x=0) for head
```

For a head-divergence branch (`divergeAfterIndex === -1`), the branch node is positioned at `x = -0.6 * 170 = -102` (left of the canvas origin), but the edge that connects to it is `source: 'bb-0'` which is at `x = 0`. The `smoothstep` edge renderer therefore draws an arrow that goes from `x=0` LEFT-ward to `x=-102` — visually backward against the left-to-right process flow direction. The rejoin edge from the branch node back to `bb-0` (reconvergeAtIndex=0) compounds this: both edges connect the same two nodes in opposite directions, React Flow will render them overlapping.

**Repro:** Record a process where a variant has extra steps BEFORE the standard path begins (e.g., a variant that starts with a login step while the standard path begins at a navigation). Open the story map. The head-branch arrow points right-to-left.

**Expected:** A virtual "before-start" node or connector should be the source, positioned to the LEFT of `bb-0`, so the arrow flows left-to-right.

---

### BUG-03 — P1 — Semantic Incorrectness: StepSequenceView Maps Variant Steps to Wrong Recording's Graph Data

**File:** `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx:520-523`

**Evidence:**
```typescript
const taskNodes = graph.nodes.filter(n => n.nodeType === 'task' || n.nodeType === 'exception' || n.nodeType === 'decision');
const matchNode = taskNodes[i];
```

`graph` is the `NormalizedViewModel` of the **current single recording** loaded on the page. `path.stepCategories` comes from a variant detected across **multiple recordings**. For any non-standard variant whose step sequence differs from the current recording:

- `taskNodes[i]` is the i-th step of THIS recording, not of the variant's recording.
- The `shortLabel`, `system`, `durationMs`, and `durationLabel` shown for variant steps come from the wrong recording.
- For variants with more steps than the current recording, `taskNodes[i]` is `undefined` for the extra steps — no crash (guarded by `{matchNode && ...}`) but the steps show no label, no system, no duration, creating silent blank rows.

**Repro:** Have two recordings where recording A has 5 steps (click, fill, submit, logout, close) and recording B (the loaded page) has 3 steps (click, fill, submit). Open variants mode, select the 5-step variant. Steps 4 and 5 show no label/system/duration. Steps 1-3 show labels from recording B, not recording A.

**Expected:** Either use only `path.stepCategories[i]` + `style.label` for display (already done for the category badge), or fetch the actual recordings behind the variant's `evidenceRunIds` and use their step data.

---

### BUG-04 — P1 — Evidence Drill Panel: `evidenceRunIds` on Branch Edges Are Variant Run IDs, Not Displayable Workflow URLs

**File:** `apps/web-app/src/components/workflow-view/WorkflowVariantStoryMap.tsx:205-207`

**Evidence:**
```typescript
<p className="mt-1 font-mono text-[9px] text-[var(--content-tertiary)] break-all leading-relaxed">
  {selectedEdge.evidenceRunIds.join('  ·  ')}
</p>
```

The IDs shown here are the `processRun.runId` values from the intelligence engine (UUIDs like `6f3a...`). These are engine-internal process run identifiers, not the `workflow.id` values the user sees in the UI or can navigate to.

The `analyzeWorkflowVariants` path in `intelligence.ts:433-459` calls `analyzePortfolio({ runs: bundles })` where each bundle's `processRun.runId` is the runId from the parsed JSON artifact — this may or may not match the database `workflow.id` depending on how the process output was stored.

For the `variantAdapter.ts` path (used when intelligence comes from the persisted `processDefinition.intelligenceJson`): `evidenceRunIds` on `ProcessVariant` are the `runId` values from `variantDetector.ts:101` which are `processRun.runId` values — again engine-internal IDs.

**Impact:** The evidence drill panel shows raw internal UUIDs. Users cannot click them to navigate to the source workflow. There is no link, no copy-to-clipboard affordance, and no mapping to the human-readable workflow title.

---

### BUG-05 — P2 — `buildVariantStoryMap` `maxBranches=0` Is Untested and Returns a Map With No Branches but Shows `shownBranchCount=0`

**File:** `apps/web-app/src/lib/variantStoryMap.ts:128`

**Evidence:**
```typescript
const shown = ranked.slice(0, Math.max(0, maxBranches));
```

Calling `buildVariantStoryMap(variants, { maxBranches: 0 })` returns a non-null map (the backbone is still present) with `shownBranchCount: 0` and `hiddenBranchCount: analysis.branches.length`. The slider in `WorkflowVariantStoryMap.tsx` has `min={1}` so users cannot reach this via the UI. However the public API of `buildVariantStoryMap` accepts 0 and the behavior (a map with spine but zero branches) is untested and semantically ambiguous — should it return `null` (like the `< 2 variants` guard) or a spine-only map?

This is a gap rather than a crash, but it is an untested edge in a production-readiness context.

---

### BUG-06 — P2 — Frequency Percentages in `VariantDnaStrip` Can Exceed 100% When `frequency` Is Not Clamped

**File:** `apps/web-app/src/components/workflow-view/VariantDnaStrip.tsx:36`

**Evidence:**
```typescript
{Math.round(v.frequency * 100)}% · {v.runCount} run{v.runCount !== 1 ? 's' : ''}
```

`v.frequency` is passed from `extractVariantsFromIntelligence` → `v.frequency ?? 0` which takes the raw value from the intelligence JSON without clamping. `detectVariants` computes `frequency = cluster.runIds.length / bundles.length` which is always 0–1 for normal input. However, if corrupted/mocked intelligence JSON contains `frequency: 1.5` (which can happen from malformed external data or a future computation bug), the display shows `150%` with no guard. The `PathCard` frequency bar additionally uses `width: Math.max(3, path.frequency * 100)%` which would render > 100% wide and overflow its container.

Same risk applies to `WorkflowVariantsMap.tsx:340`, `:367`, `:408`, `:453`, `:482`.

---

### BUG-07 — P2 — `analyzeWorkflowVariants` Loads ALL Workflows for the User on Every Variants Request (O(n) unbounded DB query)

**File:** `apps/web-app/src/lib/intelligence.ts:437`

**Evidence:**
```typescript
const all = await getWorkflowsWithOutputs(userId);
```

`getWorkflowsWithOutputs(userId)` with no `workflowIds` argument queries `db.workflow.findMany` with only `userId` + `status: 'active'` as filters. For a user with 500 recordings, this loads all 500 workflows including their `artifacts` (the large `process_output` JSON blob). Every call to `POST /api/workflows/[id]/variants` incurs this full-table scan + deserialization cost.

There is no pagination, no limit, and no timeout. The `variants` API route at `route.ts:50` calls this directly with no guard on user portfolio size. At 50+ recordings with large artifacts, this will time out or OOM in the Next.js serverless edge function.

---

### BUG-08 — P2 — `detectVariants` Greedy Cluster Assignment Is Not Symmetric — `variantId` Assignment Changes With Run Sort Order

**File:** `packages/intelligence-engine/src/variantDetector.ts:64-77`

**Evidence:**
```typescript
for (const { runId, sig } of signed) {  // sorted by runId asc
  for (const cluster of clusters) {
    const similarity = computeSignatureSimilarity(sig, cluster.representative);
    if (similarity >= options.variantSimilarityThreshold) {
      cluster.runIds.push(runId);
      assigned = true;
      break;  // first match wins
    }
  }
  if (!assigned) clusters.push({ representative: sig, runIds: [runId] });
}
```

The `representative` of a cluster is fixed as the signature of the FIRST run (in runId-sorted order) that created it. A later run with a slightly different signature may join this cluster but would NOT have created the same cluster if it had arrived first. The representative signature determines `variantId` label order, `isStandardPath` assignment (most-frequent wins after sorting), and `similarityToStandard`.

Because runs are sorted by `runId` (lexicographic string sort), a new recording whose `runId` sorts BEFORE an existing cluster's representative will create a new cluster if its similarity to the representative is below threshold — even though its similarity to ANOTHER member of the cluster might be above threshold. This is the known greedy-vs-connected-components gap. `clusterSignatures.ts` uses union-find (correct), but `detectVariants` does not.

The existing test at `intelligenceEngine.test.ts:463-469` confirms permutation-invariance of `variantCount` and `runCount` but does NOT confirm that `variantId` values or `representativeSignature` are stable across inputs with borderline similarity values. This is a gap.

---

### BUG-09 — P2 — `variantStoryMap.ts`: Conforming-Run Headline Text Can Be Misleading When Multiple Variants Each Partially Diverge

**File:** `apps/web-app/src/components/workflow-view/WorkflowVariantStoryMap.tsx:153`

**Evidence:**
```typescript
<span className="font-semibold text-[var(--content-primary)]">{conformPct}%</span> of {map.totalRuns} runs
follow the standard path. {map.branchCount} branch{...} off and rejoin.
```

`conformPct` = `map.conformingRunCount / map.totalRuns`. `conformingRunCount` is the run-weighted count of VARIANTS that produced zero branches against the backbone. This is correct when variants are discrete (all steps of variant V either all match the backbone or don't). However, it conflates variant-level conformance with run-level conformance.

The headline says "X% of N runs follow the standard path" but `conformingRunCount` is actually the summed `runCount` of variants that are structurally identical to the backbone — not the count of individual recordings that matched. For a user with `variant-1` (runCount=7, standard) and `variant-2` (runCount=3, one extra step), the headline correctly shows 70%. But if the user has `variant-1` (runCount=7, standard) and `variant-2` (runCount=3, inserts a step in the middle), `variant-2` contributes ONE branch but its three runs are counted as non-conforming. The headline reads "70% of 10 runs follow the standard path. 1 branch off and rejoins." — mathematically correct, but users may wonder "if 30% diverge, why only 1 branch?"

The deeper correctness issue: `analyzeWorkflowVariants` computes divergence across the VARIANTS (one DivergenceRun per variant, not per recording). `totalRuns` in the story map is `sum of v.runCount` — correctly representing recording counts. But the story map analysis itself treats each variant as ONE run. If variant V2 has 3 recordings all taking the same branch, they produce ONE `DivergenceBranch` with `runCount=1` (one variant), which the story map then weights by `runCountByVariant.get('variant-2') = 3`. The headline and branch-edge labels are therefore correct. No arithmetic bug — but the abstraction creates a potential semantic confusion that should be documented.

---

### BUG-10 — P3 — `VariantDnaStrip`: Step-token `key={i}` Used Instead of Stable Key

**File:** `apps/web-app/src/components/workflow-view/VariantDnaStrip.tsx:43`

**Evidence:**
```typescript
{v.stepCategories.map((cat, i) => {
  ...
  return (
    <span key={i} ...>
```

Using array index as key is a React anti-pattern. When the `variants` list is re-sorted (the strip sorts by frequency) or when the complexity slider causes re-renders, React cannot correctly reconcile identical keys across different `v.stepCategories` arrays. For a static render this is harmless, but if the parent ever updates `variants` in place (e.g., after a new fetch), step tokens may not update correctly.

---

### BUG-11 — P3 — Missing `aria-label` on Map/DNA/List Toggle Buttons; No `data-testid` Anywhere in the Variants Surface

**File:** `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx:195-209`

**Evidence:**
```typescript
<button onClick={() => setView('map')} className={...}>Map</button>
<button onClick={() => setView('dna')} className={...}>DNA</button>
<button onClick={() => setView('list')} className={...}>List</button>
```

No `data-testid` attributes anywhere in `WorkflowVariantStoryMap.tsx`, `VariantDnaStrip.tsx`, or `WorkflowVariantsMap.tsx`. The toggle group lacks `role="group"` + `aria-label`. The complexity slider has `aria-label="Number of variant branches to show"` (good), but the evidence-panel close button uses `aria-label="Close evidence"` (acceptable). However the "Map / DNA / List" buttons have no `aria-label` differentiating their purpose beyond the text label "DNA" (not self-explanatory for screen-reader users).

---

## Section 2 — Test Coverage Gaps

### GAP-01 — CRITICAL: No End-to-End Test for Variants Mode

The smoke gate (`e2e/smoke/analysis.smoke.spec.ts`) covers the Report tab and the Process (flow) tab but does NOT navigate into variants mode (`WorkflowVariantsMap`, `WorkflowVariantStoryMap`, `VariantDnaStrip`). From the smoke test evidence:

```
// 3. Switch to the Report tab → mounts WorkflowReportPage
await page.locator('nav').getByRole('button', { name: 'Report' }).first().click();
```

No equivalent navigation to the "Variants" view mode within `WorkflowPageShell`. If variants mode introduces a hydration mismatch or a runtime crash (e.g., React Flow rendering the backwards head-branch edge, or an undefined `evidenceRunIds` in the drill panel), it will not be caught pre-ship.

### GAP-02 — CRITICAL: No Golden-Fixture / Determinism Test for the Full Variants Pipeline

`analyzeWorkflowVariants` → `clusterSignatures` → `analyzePortfolio` → `detectVariants` → `buildVariantStoryMap` is a pure data pipeline with no end-to-end golden-fixture test. The individual units are tested (`clustering.test.ts`, `divergenceAnalyzer.test.ts`, `variantStoryMap.test.ts`), but there is no test that feeds real `ProcessRunBundle` fixtures through the full stack and asserts a byte-identical `VariantStoryMap` output. A change to `clusterSignatures.ts` thresholds or `analyzeDivergence` LCS tie-breaking could silently change which branches are shown to users.

### GAP-03 — HIGH: `variantDetector.ts` Has No Test Asserting `computedAt` Is Excluded From Determinism

The existing determinism test at `intelligenceEngine.test.ts:455-461`:
```typescript
it('is deterministic — same input twice produces identical output', () => {
  const r1 = detectVariants([BUNDLE_A, BUNDLE_B, BUNDLE_C], opts);
  const r2 = detectVariants([BUNDLE_A, BUNDLE_B, BUNDLE_C], opts);
  expect(r1.variants.map(v => v.variantId)).toEqual(r2.variants.map(v => v.variantId));
  expect(r1.variants.map(v => v.runCount)).toEqual(r2.variants.map(v => v.runCount));
});
```

This test does NOT assert `r1` deep-equals `r2` (it would fail because `computedAt` differs). The test only checks selected fields. This means the known `computedAt` nondeterminism is silently bypassed in testing rather than being explicitly documented. There is no test asserting `r1.computedAt !== r2.computedAt` (documenting the intentional exception) or testing that `computedAt` is the ONLY nondeterministic field.

### GAP-04 — HIGH: `divergentStepIndices` Has No Test for Repeated Categories

The existing tests use sequences like `['click', 'fill', 'submit']` where each category appears once. The LCS tie-break comment says "prefer the up move" — but for sequences with repeated categories (e.g., `['click', 'click', 'fill', 'submit']` vs backbone `['click', 'fill', 'submit']`), the tie-break path in the LCS backtracking is exercised and the "extra click" may be attributed to index 0 or index 1 depending on LCS path selection. No test covers this, and the behavior difference would affect `divergencePoints` highlighting in `VariantDnaStrip`.

### GAP-05 — HIGH: `buildVariantStoryMap` Has No Test for Head-Branch or Tail-Branch Layout

The `variantStoryMap.test.ts` tests cover:
- Single variant (returns null) ✓
- Insert in middle ✓
- Shortcut ✓
- Run-weighted conforming count ✓
- maxBranches filter ✓
- Evidence run IDs on edges ✓
- Permutation invariance ✓

Not covered:
- Head-divergence (`divergeAfterIndex === -1`): `startX = -0.6 * SPACING_X`, `sourceBackboneId = 'bb-0'` — the backward-edge bug (BUG-02) is in this path.
- Tail-divergence (`reconvergeAtIndex === backbone.length`): `endX = (backbone.length - 1 + 0.6) * SPACING_X`, `targetBackboneId = 'bb-(backbone.length-1)'`.
- Identical-step backbone (all variants conform, no branches): `buildVariantStoryMap` returns a non-null map with an empty branch list — should this return null? Currently it returns a map with `branchCount=0`. The guard at line 90-91 only returns null for fewer than 2 variants with steps, not for 0 branches.

### GAP-06 — MEDIUM: No Test for `extractVariantsFromIntelligence` With `runCount: 0` Variants

`variantAdapter.ts:extractVariantsFromIntelligence` sets `runCount: v.runCount ?? 0`. If all variants have `runCount: 0`, then in `buildVariantStoryMap`:
- `totalRuns = withSteps.reduce(...) || withSteps.length` — falls back to variant count (correct guard).
- `runShare = weight / totalRuns` where `weight = 0` for all branches — all runShares show as 0.
- Edge labels show `0 runs · 0%` for every branch.

No test covers this path. The `variantAdapter.test.ts` does not test `runCount: 0` variants.

### GAP-07 — MEDIUM: No Test for `analyzeWorkflowVariants` When the Target Workflow Is Not in Any Cluster

`intelligence.ts:452`:
```typescript
const memberIds =
  clusters.find((c) => c.memberIds.includes(workflowId))?.memberIds ?? [workflowId];
```

If `clusterSignatures` returns clusters but the `workflowId` is not in any cluster (this should not happen since every input is assigned, but the fallback `?? [workflowId]` exists), the analysis runs on just the one workflow and returns a single-run `PortfolioIntelligence`. The route at `route.ts:51-53` returns this as `{ intelligence }` with HTTP 200. The client receives single-run intelligence and `WorkflowVariantsMap` renders the `SinglePathView` (correct). This path is untested.

### GAP-08 — MEDIUM: No Test for `deriveDivergence` When `totalRuns < sumOfVariantRunCounts`

`reportDivergence.ts:56`:
```typescript
const denom = totalRuns > 0 ? totalRuns : withSig.reduce((s, v) => s + (v.runCount ?? 0), 0) || 1;
```

If caller passes `totalRuns = 3` but variants sum to `runCount = 10` (data integrity gap), then `denom = 3`, `runShare > 1.0` for branches. The existing test "falls back to summed runCounts when totalRuns is 0" covers the `totalRuns=0` branch but not `totalRuns < sum`.

---

## Section 3 — Concrete Test Plan for Production Readiness

### TP-01 — Golden-Fixture Determinism Test (Full Pipeline)

**File to create:** `apps/web-app/src/lib/variantPipeline.golden.test.ts`

**Approach:** Create 3 `ProcessRunBundle` fixtures (run-a: standard 3-step, run-b: same 3-step, run-c: 4-step with one insert). Call `analyzePortfolio({ runs: [runA, runB, runC] })` and freeze the `variants` output. Then call `buildVariantStoryMap` with the adapter output. Assert the full `VariantStoryMap` equals a serialized golden snapshot. Run twice in the same test to assert idempotency (minus `computedAt`).

**What this gates:** Changes to `traceSimilarity` weights, `analyzeDivergence` LCS tie-break, or `clusterSignatures` threshold that change which branches users see.

### TP-02 — `variantDetector.ts` Determinism Contract Test

**File to create:** `packages/intelligence-engine/src/variantDetector.determinism.test.ts`

Add two cases:
1. Call `detectVariants` twice on the same input separated by a fake 10ms `Date` advance (via Vitest `vi.useFakeTimers()`). Assert `r1.computedAt !== r2.computedAt` (documenting the known exception) and `structuralEqual(r1, r2) === true` where `structuralEqual` compares everything except `computedAt`. This makes the contract explicit and prevents a future "fix" that accidentally makes `computedAt` feed into structural output.
2. Assert the full output minus `computedAt` is byte-identical across permutations of input.

### TP-03 — `divergentStepIndices` Repeated-Category Test

**File:** add to `packages/intelligence-engine/src/divergenceAnalyzer.test.ts`

```typescript
it('handles repeated categories in a sequence deterministically', () => {
  // backbone: ['click', 'fill', 'submit']
  // steps: ['click', 'click', 'fill', 'submit'] — one extra click at index 0 or 1?
  const result = divergentStepIndices(['click', 'click', 'fill', 'submit'], ['click', 'fill', 'submit']);
  // LCS: either index 0 or 1 is flagged — test pins the deterministic choice
  expect(result).toEqual([0]); // or [1], whichever the LCS tie-break produces
  // Critical: call twice, assert identical
  expect(divergentStepIndices(['click', 'click', 'fill', 'submit'], ['click', 'fill', 'submit']))
    .toEqual(result);
});
```

### TP-04 — `buildVariantStoryMap` Head and Tail Branch Layout Tests

**File:** add to `apps/web-app/src/lib/variantStoryMap.test.ts`

```typescript
it('head-branch nodes are positioned to the LEFT of bb-0 (x < 0)', () => {
  const std = v('std', ['click', 'fill', 'submit'], 7, true);
  const headV = v('hd', ['login', 'click', 'fill', 'submit'], 3);
  const map = buildVariantStoryMap([std, headV])!;
  const branchNodes = map.nodes.filter(n => n.kind === 'branch');
  expect(branchNodes.every(n => n.x < 0)).toBe(true); // to the left of the spine
});

it('tail-branch nodes are positioned to the RIGHT of the last backbone node', () => {
  const std = v('std', ['click', 'fill', 'submit'], 7, true);
  const tailV = v('tl', ['click', 'fill', 'submit', 'logout'], 3);
  const map = buildVariantStoryMap([std, tailV])!;
  const lastBbX = (map.backbone.length - 1) * 170; // SPACING_X = 170
  const branchNodes = map.nodes.filter(n => n.kind === 'branch');
  expect(branchNodes.every(n => n.x > lastBbX)).toBe(true);
});

it('returns a non-null spine-only map when all variants conform', () => {
  const std = v('std', ['click', 'fill', 'submit'], 5, true);
  const also = v('v2', ['click', 'fill', 'submit'], 3); // identical to std
  const map = buildVariantStoryMap([std, also]);
  // Spine should exist (2 variants, both with steps) but branchCount=0
  // Current behavior: returns non-null map with 0 branches — pin this
  expect(map).not.toBeNull();
  expect(map!.branchCount).toBe(0);
  expect(map!.nodes.every(n => n.kind === 'backbone')).toBe(true);
});
```

### TP-05 — Playwright Smoke Extension: Variants Mode Navigation Gate

**File:** `apps/web-app/e2e/smoke/analysis.smoke.spec.ts` — add a new `test` block

**Required `data-testid` additions (product code changes — flagged as needed, not implemented here):**
- `data-testid="variants-mode-button"` on the Variants view-mode button in `WorkflowPageShell`
- `data-testid="variant-story-map-canvas"` on the `ReactFlow` wrapper div in `WorkflowVariantStoryMap`
- `data-testid="variant-dna-strip"` on the `VariantDnaStrip` root div
- `data-testid="variant-list-view"` on the list-mode root div in `WorkflowVariantsMap`
- `data-testid="variant-view-toggle"` on the Map/DNA/List toggle group

**Test outline:**
```typescript
test('[variants-mode] navigate to variants view, assert story map renders without crash', async ({ page }) => {
  // 1. Load the sample workflow (reuse existing /api/sample-workflow)
  const res = await page.request.post('/api/sample-workflow');
  const { id } = await res.json();
  await page.goto(`/workflows/${id}`, { waitUntil: 'networkidle' });

  // 2. Click the Variants mode button (in WorkflowPageShell mode switcher)
  await page.getByTestId('variants-mode-button').click();

  // 3. Wait for the POST /api/workflows/[id]/variants fetch to complete
  await page.waitForResponse(res => res.url().includes('/variants') && res.status() < 500, { timeout: 15_000 });

  // 4. Assert the map or single-path view renders (either is valid)
  const hasMap = await page.getByTestId('variant-story-map-canvas').isVisible().catch(() => false);
  const hasSinglePath = await page.locator('text=Single recording').isVisible().catch(() => false);
  expect(hasMap || hasSinglePath).toBe(true);

  // 5. No crashes
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  expect(pageErrors.filter(e => /crash|undefined|Application error/i.test(e))).toHaveLength(0);
});
```

### TP-06 — Invariant Test: Sum of `frequency` Across All Variants Must Be ≈ 1.0

**File:** add to `packages/intelligence-engine/src/intelligenceEngine.test.ts`

The existing test at line 488-492 covers this for `detectVariants` directly. A parallel test is needed for the FULL `analyzePortfolio` output, verifying `portfolio.variants.variants.map(v => v.frequency).reduce(sum, 0) ≈ 1.0` for various multi-run inputs.

### TP-07 — Evidence-Linkage Integrity Test

**File:** add to `packages/intelligence-engine/src/intelligenceEngine.test.ts`

```typescript
it('all evidenceRunIds in variants are valid processRun.runId values from input', () => {
  const bundles = [BUNDLE_A, BUNDLE_B, BUNDLE_VARIANT];
  const validIds = new Set(bundles.map(b => b.processRun.runId));
  const result = detectVariants(bundles, resolveOptions());
  for (const v of result.variants) {
    for (const id of v.evidenceRunIds) {
      expect(validIds.has(id), `evidenceRunId ${id} not in input bundles`).toBe(true);
    }
  }
  // All input runIds must appear in exactly one variant's evidenceRunIds
  const allEmitted = result.variants.flatMap(v => v.evidenceRunIds);
  expect(allEmitted.sort()).toEqual([...validIds].sort());
});
```

---

## Section 4 — Release Gates

The following must all pass before this feature is called production-ready.

### GATE-1 — P0 BLOCKER: Resolve or Formally Carve Out the `variantDetector.ts` `computedAt` Determinism Violation

Either:
- (a) Remove the `new Date().toISOString()` call and inject `computedAt` as an optional parameter defaulting to a constant (e.g., empty string or caller-supplied), consistent with the `nowMs` injection pattern used for other determinism fixes in this codebase (iter-037 / iter-038 precedent).
- (b) Add an explicit carve-out comment in the module header and in the `VariantSet` type: `computedAt: string; // NOTE: nondeterministic timestamp; excluded from structural comparison`.
- (c) Pin a test (`detectVariants.determinism.test.ts`) asserting that every field EXCEPT `computedAt` is byte-identical across two calls. This is the minimum gate to prevent regressions from introducing new nondeterministic fields.

### GATE-2 — P0 BLOCKER: Playwright Smoke Gate Must Cover Variants Mode (TP-05)

The existing smoke gate provides zero coverage for the variants surface. A runtime crash in `WorkflowVariantStoryMap` (e.g., React Flow hydration with the backward head-branch edge) would go undetected. TP-05 above, requiring the `data-testid` additions to product code, must land before release.

### GATE-3 — P1 MUST-FIX BEFORE GA: Head-Branch Visual Bug (BUG-02)

The backward arrow for head-divergence branches will be immediately visible to any user whose variant set includes a run that starts with extra steps before the standard process begins. This is a common real-world pattern (e.g., a user who always logs in first before the tracked process). Fix: either (a) introduce a virtual "before-start" backbone node at index -1 with `x = -SPACING_X`, or (b) clamp `sourceBackboneId` to a new synthetic `bb-pre` node for head branches.

### GATE-4 — P1 MUST-FIX: Evidence Drill Panel Must Link to Workflow Detail Pages (BUG-04)

Before shipping, the `evidenceRunIds` displayed in the drill panel must either:
- (a) Be mapped from `processRun.runId` to `workflow.id` via the existing `WorkflowWithArtifacts` data already loaded in `analyzeWorkflowVariants` — the `workflowId` IS available when building the analysis.
- (b) Show the workflow title alongside the ID.
- (c) Provide a navigable link to `/workflows/[workflowId]`.

### GATE-5 — P1 MUST-FIX: Step Sequence View Must Not Show Mismatched Recording Data (BUG-03)

`StepSequenceView` in `WorkflowVariantsMap.tsx` must be changed to display only information derivable from the variant's own `stepCategories` array (category badge, divergence highlight) without referencing `taskNodes[i]` from the current recording's graph for non-standard variants. Showing wrong labels/durations is actively misleading.

### GATE-6 — P2 SHOULD-FIX: Guard the O(n) Unbounded DB Query (BUG-07)

Add a hard limit to `getWorkflowsWithOutputs` for the variants path (e.g., `take: 100` with a comment explaining the clustering-sample rationale), or add a warning log + timeout. The `clusterSignatures` is O(n²) on top of the full query, compounding the risk.

### GATE-7 — Minimum Test Coverage (before declaring production-ready)

All of the following must pass:
- TP-01: Golden-fixture determinism test for the full pipeline
- TP-02: `computedAt` exclusion from determinism (or formal carve-out per GATE-1b)
- TP-03: Repeated-category `divergentStepIndices` test
- TP-04: Head/tail branch layout tests (and pinning the "all-conform, 0 branches" behavior)
- TP-05: Playwright smoke covering variants mode
- TP-07: Evidence-linkage integrity test

---

## Summary Table

| ID | Severity | Area | Title | Release Blocking? |
|---|---|---|---|---|
| BUG-01 | P0 | `variantDetector.ts:39` | `new Date()` determinism violation in VariantSet | Yes — GATE-1 |
| BUG-02 | P1 | `variantStoryMap.ts:161`, React Flow | Head-branch edges point backward | Yes — GATE-3 |
| BUG-03 | P1 | `WorkflowVariantsMap.tsx:520` | Step sequence shows wrong recording's labels/durations | Yes — GATE-5 |
| BUG-04 | P1 | `WorkflowVariantStoryMap.tsx:206` | Evidence drill shows unnavigable internal run IDs | Yes — GATE-4 |
| BUG-05 | P2 | `variantStoryMap.ts:128` | `maxBranches=0` untested, ambiguous behavior | No — follow-up |
| BUG-06 | P2 | Multiple `.tsx` files | Frequency > 100% possible from corrupt data | No — hardening |
| BUG-07 | P2 | `intelligence.ts:437` | O(n) unbounded DB query on every variants request | Yes — GATE-6 |
| BUG-08 | P2 | `variantDetector.ts:64` | Greedy cluster assignment: representative not stable at boundary | No — follow-up |
| BUG-09 | P2 | `WorkflowVariantStoryMap.tsx:153` | Conforming-% headline misleading for multi-diverging variants | No — doc/note |
| BUG-10 | P3 | `VariantDnaStrip.tsx:43` | Array index used as React key | No — follow-up |
| BUG-11 | P3 | Multiple `.tsx` | Missing `data-testid`, no `role="group"` on toggle | Yes — GATE-2 requires testids |
| GAP-01 | Critical | e2e | No E2E test for variants mode | Yes — GATE-2 |
| GAP-02 | Critical | unit | No golden-fixture pipeline determinism test | Yes — GATE-7 |
| GAP-03 | High | unit | `computedAt` exclusion not formally tested | Yes — GATE-7 |
| GAP-04 | High | unit | `divergentStepIndices` untested on repeated categories | Yes — GATE-7 |
| GAP-05 | High | unit | Head/tail branch layout not tested | Yes — GATE-7 |
| GAP-06 | Medium | unit | `runCount=0` variants path untested | No — follow-up |
| GAP-07 | Medium | unit | Fallback single-workflow cluster path untested | No — follow-up |
| GAP-08 | Medium | unit | `totalRuns < sumOfVariantRunCounts` path untested | No — follow-up |

**Blocker count: 4 P0/P1 bugs + 3 coverage gates = 7 hard blockers before production-ready declaration.**

---

## Validated Correct

The following were specifically probed and found correct:

- `clusterSignatures` union-find: deterministic, permutation-invariant, lexical-root union — **CORRECT** (confirmed by test + code inspection)
- `analyzeDivergence` LCS alignment and aggregation: handles insertions, shortcuts, head, tail, DFG confirmation — **CORRECT** (confirmed by divergenceAnalyzer.test.ts coverage and code inspection)
- `conformingRunCount` arithmetic in `buildVariantStoryMap`: correctly uses variant-weighted run counts, not simple variant counts — **CORRECT**
- `evidenceRunIds` chain: `processRun.runId` → `detectVariants.evidenceRunIds` → `ViewVariantPath.evidenceRunIds` → `StoryEdge.evidenceRunIds` — IDs are consistent within the chain (though not navigable in UI — BUG-04)
- Frequency sum: `sum(variants[*].frequency) ≈ 1.0` guaranteed by `detectVariants` arithmetic — **CORRECT**
- `divergentStepIndices` LCS alignment vs positional comparison: correctly flags only inserted step, not all following steps — **CORRECT** (the "tab bug" fix is verified)
- `buildVariantStoryMap` maxBranches UI binding: slider `min=1` prevents user from reaching `maxBranches=0` — **CORRECT for UI path** (programmatic API untested — BUG-05)
- 2806/2806 tests pass: no regression from review — **CONFIRMED**
