# QA Findings — Variant-Aware Process Map (Define-Phase Review)

**Date:** 2026-06-10
**Agent:** qa-engineer
**Surface under review:** `WorkflowVariantsMap` + supporting adapters and engines
**Review type:** Define-phase testability and risk assessment (read-only; no product code modified)
**Source artifacts read:**
- `apps/web-app/src/components/workflow-view/WorkflowCanvas.tsx`
- `apps/web-app/src/components/workflow-view/adapters/flowAdapter.ts`
- `apps/web-app/src/components/workflow-view/adapters/variantAdapter.ts`
- `apps/web-app/src/components/workflow-view/adapters/viewModel.ts`
- `apps/web-app/src/components/workflow-view/hooks/useWorkflowViewModel.ts`
- `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx`
- `apps/web-app/src/components/workflow-view/WorkflowPageShell.tsx`
- `apps/web-app/src/components/workflow-view/nodes/WorkflowDecisionNode.tsx`
- `apps/web-app/src/components/workflow-view/constants.ts`
- `apps/web-app/src/lib/process-graph/validation/topology.ts` + `.test.ts`
- `apps/web-app/src/lib/process-graph/adapters/variant-hash.ts` + `.test.ts`
- `packages/intelligence-engine/src/divergenceAnalyzer.ts` + `.test.ts`
- `packages/intelligence-engine/src/clustering/clusterSignatures.ts`
- `packages/intelligence-engine/src/clustering/traceSimilarity.ts`
- `packages/intelligence-engine/src/clustering/clustering.test.ts`
- `apps/web-app/playwright.smoke.config.ts`
- `apps/web-app/e2e/smoke/hydration.smoke.spec.ts`
- `apps/web-app/e2e/smoke/analysis.smoke.spec.ts`
- `docs/features/process-variation/PRD_PROCESS_VARIATION.md`
- `docs/features/process-variation/UX_FLOWS_PROCESS_VARIATION.md`

---

## Executive Summary

The variant map surface has three tiers of risk. The highest risk tier is
**determinism**: node position computation currently relies on raw `position`
fields passed through from the engine (`viewModel.ts:320`) with no layout
algorithm of record in the front-end adapter layer; any non-determinism in
how upstream callers populate those coordinates propagates directly into
React Flow and into SSR/hydration. The second tier is **hydration-safety**:
`WorkflowCanvas.tsx` is `'use client'` and wrapped in `ReactFlowProvider`,
which is the correct pattern, but `WorkflowVariantsMap.tsx` does not currently
render a React Flow canvas — it renders a scrollable HTML panel. That means
the hydration risk profile for variants mode is *different* from flow mode and
must be assessed separately. The third tier is **evidence linkage**: the
`DivergenceBranch.evidenceRunIds` field exists and is populated correctly by
`divergenceAnalyzer.ts`, but nothing in the current variant adapter
(`variantAdapter.ts`) passes `evidenceRunIds` into `ViewVariantPath` or into
the rendered step sequence. This is a correctness gap against the UX spec
(`UX_FLOWS_PROCESS_VARIATION.md §2.3`) and the PRD evidence-linked moat claim.

---

## 1. Determinism Risks

### 1-A. Node position source is opaque — no deterministic layout contract exists

**File:** `apps/web-app/src/components/workflow-view/adapters/viewModel.ts:320`
**Finding:** `position: { x: raw.position?.x ?? 0, y: raw.position?.y ?? 0 }` reads
positions directly from the engine's `processMap.nodes[n].position` field. There is no
layout algorithm in the front-end adapter. The adapter does not enforce any constraint on
these values and falls back silently to `{x:0, y:0}` for missing data.

This means layout determinism is entirely the responsibility of the caller that populates
`processMap.nodes[n].position`. If that caller uses any non-deterministic source (insertion
order from a `Map`, object key iteration, `Math.random`, floating-point arithmetic whose
result varies across JS engines) the position will vary run-to-run and will diverge between
server render and client hydration.

**Why this matters for the variant map specifically:** `variantAdapter.ts:61-71` passes
`viewNode.position` through verbatim into `VariantFlowNode.position`. If the variant map
ever switches to a React Flow canvas (which the UX spec implies for the diverge-reconverge
diagram), any layout nondeterminism will produce a hydration mismatch.

**Required action before shipping:** Identify the canonical source of node positions and add
a determinism invariant test: same input → byte-identical `position` values on repeated calls.
If positions are computed by a pure function, pin that function with a golden-fixture test.
If they come from the database, confirm the DB query is deterministically ordered and that
floating-point serialization is stable across Postgres versions.

### 1-B. `classifyPaths` sort is unstable when `frequency` ties exist

**File:** `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx:141-146`
**Finding:**
```typescript
.sort((a, b) => {
  if (a.isStandard) return -1;
  if (b.isStandard) return 1;
  return b.frequency - a.frequency;
});
```
The tiebreaker for equal `frequency` is undefined. `Array.prototype.sort` is not guaranteed
to be stable in all JS engines for equal elements, and even with stable sort, which variant
appears first when two share the same frequency is an artifact of input order — which itself
depends on how `extractVariantsFromIntelligence` iterates the raw array.

**Consequence:** The path cards render in a different order depending on input order. The
initially-selected path (`paths.find(p => p.isStandard)?.id ?? paths[0]?.id`) may differ.
This is observable UI nondeterminism even though it is not a hydration crash.

**Required action:** Add a deterministic final tiebreaker to the sort, for example:
`|| a.id.localeCompare(b.id)`. Add a unit test asserting sort stability under equal-frequency inputs.

### 1-C. `fastestId`/`longestId` resolution is nondeterministic on duration ties

**File:** `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx:78-83`
**Finding:**
```typescript
const fastestId = withDuration.length > 1
  ? withDuration.reduce((min, p) =>
      (p.avgDurationMs ?? Infinity) < (min.avgDurationMs ?? Infinity) ? p : min).id
  : null;
```
`reduce` returns whichever element appears first in the array when durations are equal, which
depends on the sort order established in 1-B above. The `fastest` / `longest` role badge
assignment is therefore not deterministic across input permutations.

**Required action:** Add a tiebreaker by `id` in the reduce comparison: use
`p.id < min.id ? p : min` as the final fallback.

### 1-D. `extractVariantsFromIntelligence` uses array index as fallback id

**File:** `apps/web-app/src/components/workflow-view/adapters/variantAdapter.ts:91`
**Finding:** `id: v.variantId ?? \`variant-${i + 1}\``
The fallback `variant-${i + 1}` makes the variant ID depend on array position in the raw
intelligence JSON. If the upstream source ever changes the ordering of variants in the
intelligence blob (for example, a sort added to the intelligence engine output), all fallback
ids shift and any persisted selection state or URL-encoded `selectedPathId` becomes invalid.

**Required action:** Document that `variantId` must always be populated by the intelligence
engine before this adapter is wired to live data. Add a validation assertion or a test that
rejects variants with missing `variantId` rather than silently falling back to index-based ids.

### 1-E. `buildNormalizedViewModel` uses `Map` iteration for system edges — iteration order depends on insertion order

**File:** `apps/web-app/src/components/workflow-view/adapters/viewModel.ts:446-456`
**Finding:**
```typescript
for (const [key, data] of handoffCounts) {
```
`Map` iteration order in JavaScript is insertion order, which is the order edges were
processed. Edge processing order is the order of `model.edges`, which reflects the order of
`rawEdges` from the engine. If the engine ever changes the emission order of edges (for
example, by sorting them differently), the `systemEdges` array and the derived `totalHandoffs`
count both change.

**This is a low-severity determinism risk** (the system edges array is not rendered in the
variant map directly), but it is the same class of nondeterminism that caused historical
production crashes. It should be logged here for completeness and addressed when
`WorkflowSystemsMap` ships.

---

## 2. Hydration Risks

### 2-A. `WorkflowVariantsMap` renders as a scrollable HTML panel — not a React Flow canvas

**File:** `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx`
**Finding:** The current implementation renders a flex layout with a left rail of path cards
and a right panel of step sequences. It does not mount a `ReactFlowProvider` or `ReactFlow`
canvas. All interactive elements are plain HTML (`<button>`, `<div>`).

**SSR behavior:** The parent `WorkflowPageShell.tsx` is `'use client'` (line 1) and
`WorkflowVariantsMap.tsx` itself is `'use client'` (line 1). The component is conditionally
rendered based on `mode === 'variants'` (WorkflowPageShell.tsx:298). Default mode is `'flow'`
(WorkflowPageShell.tsx:82), so variants mode is not rendered on the server-side initial render.

**Key observation:** Because mode starts as `'flow'` and `useState` is client-side only, the
variants canvas is never SSR'd in the current architecture. This is **hydration-safe by
default** because the server never emits variants-mode HTML. However, this property depends
entirely on the initial `mode` state being `'flow'`. If a future change persists the active
mode to a URL param or cookie that the server reads, variants-mode would be SSR'd and any
non-determinism inside `WorkflowVariantsMap` would become a hydration crash.

**Required action:**
1. Document the "variants mode is never SSR'd" invariant explicitly with a comment in
   `WorkflowPageShell.tsx`. This prevents future engineers from accidentally enabling SSR
   for variants mode without a full hydration review.
2. When the diverge-reconverge React Flow canvas ships (the upgrade from the current HTML
   panel to an actual graph canvas per the UX spec), that canvas must be wrapped in
   `ReactFlowProvider` exactly as `WorkflowFlowCanvas` does today, and it must be covered
   by the hydration smoke gate.

### 2-B. The hydration smoke gate does not reach variants mode

**File:** `apps/web-app/e2e/smoke/analysis.smoke.spec.ts`
**Finding:** The authenticated smoke gate navigates to `/workflows/${id}`, waits for the
Process view, then clicks the Report tab. It does not click the Variants tab in the
workflow visualization mode switcher. No smoke test currently:
- Navigates to variants mode
- Checks for hydration errors on the variants panel
- Verifies the path card rail renders
- Verifies the step sequence section renders without crashes

**Why this matters:** The variants mode involves `useMemo` computations (classifyPaths,
buildVariantData) and conditional rendering branches. If any branch produces a content
mismatch between server (empty, since mode starts as 'flow') and client (populated, after
React hydrates and the user clicks 'Variants'), the error would not be caught.

In the current implementation this is not a hydration risk (see 2-A), but the smoke gate
gap must be closed before variants mode ships.

### 2-C. `useState` initial value in `WorkflowVariantsMap` depends on `paths` array

**File:** `apps/web-app/src/components/workflow-view/WorkflowVariantsMap.tsx:155-158`
**Finding:**
```typescript
const [selectedPathId, setSelectedPathId] = useState<string | null>(
  paths.find(p => p.isStandard)?.id ?? paths[0]?.id ?? null,
);
```
The initial state is computed from `paths`, which is derived from `classifyPaths(variantData.paths, graph)`.
This means the initial `selectedPathId` depends on data fetched at render time.

**If variants mode is ever SSR'd** (see 2-A), the server would compute `selectedPathId`
based on the server-side `paths` array. The client would recompute it independently during
hydration. If the two disagree (for example because variant ordering is nondeterministic per
1-B), React would emit a hydration mismatch.

**Required action:** Before enabling SSR for variants mode, move the `useState` initial
value to `null` (always) and set it in a `useEffect` after mount. This pattern is the
standard defense against SSR/client `useState` mismatch.

### 2-D. `WorkflowCanvas.tsx` contains a `setTimeout` in `resetView`

**File:** `apps/web-app/src/components/workflow-view/WorkflowCanvas.tsx:101-103`
**Finding:**
```typescript
resetView: () => {
  reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
  setTimeout(() => reactFlowInstance.fitView({ padding: 0.15, duration: 300 }), 50);
},
```
This `setTimeout` is not a hydration risk because `onCanvasReady` is only called from
`useEffect` (already client-side), but it is a flakiness risk in tests: any test that calls
`resetView` and then immediately asserts canvas state may see stale state if the 50ms has
not elapsed. This should be noted for test authors covering the toolbar's reset button.

---

## 3. Test Strategy for the Variant-Aware Map

### 3-A. Golden-fixture determinism tests (pure layer: adapters + engines)

These tests must run in the Vitest workspace (not Playwright) and must assert
byte-identical output for the same input across repeated calls.

**Target: `buildVariantData` in `variantAdapter.ts`**

Test group BVD (buildVariantData):
- BVD-1: single-path input (no variants) → `hasVariantData: false`, all nodes get `pathIds: ['default']`, all `opacity: 1.0`, zero `isDivergencePoint` flags
- BVD-2: two variants input → `hasVariantData: true`, node list length matches model.nodes length
- BVD-3: determinism — same `model` and `intelligence` input → byte-identical output across three calls
- BVD-4: `extractVariantsFromIntelligence` with a well-formed intelligence blob → variant ids and labels match input
- BVD-5: `extractVariantsFromIntelligence` with `variantId` missing → fallback ids are index-based; logged as a design-gap signal (see 1-D)
- BVD-6: empty `intelligence.variants.variants` array → empty variants list, `hasVariantData: false`
- BVD-7: `intelligence` is `null` or `undefined` → empty variants list, no throw

**Target: `classifyPaths` in `WorkflowVariantsMap.tsx`**

Test group CP (classifyPaths):
- CP-1: empty paths → produces single 'observed' path from graph, `role: 'standard'`
- CP-2: two paths, one standard → standard always sorts first
- CP-3: equal-frequency non-standard paths → sort order is deterministic (id-ordered tiebreaker after 1-B fix)
- CP-4: fastest/longest assignment when durations are available → roles assigned to correct variant
- CP-5: fastest/longest tie → deterministic winner (id-ordered after 1-C fix)
- CP-6: exception-heavy path detection → role assigned when `error_handling` count >= 2
- CP-7: permutation-invariant — same paths in any input order → byte-identical classified output

**Target: `analyzeDivergence` (already tested in `divergenceAnalyzer.test.ts`)**

The existing test suite covers conformance, divergence shapes, aggregation, and determinism.
The following are missing and must be added:

- DA-7: `evidenceRunIds` are present and non-empty on every returned branch
- DA-8: `evidenceRunIds` are sorted lexicographically (not insertion-order) — this is the
  traceability guarantee; if sorting fails, auditors cannot reproduce which runs diverged
- DA-9: `conformingRunCount + sum(branch.runCount)` MAY exceed `totalRuns` (a single run
  can contribute to multiple branches); document this invariant explicitly in the test
- DA-10: `conformingFrequency + sum(branch.frequency)` is NOT required to sum to 1.0;
  assert that neither value individually exceeds 1.0

**Target: `buildNormalizedViewModel` in `viewModel.ts`**

Test group VM (viewModel):
- VM-1: determinism — same processOutput → byte-identical NormalizedViewModel on repeated calls
- VM-2: position passthrough — node positions match raw.position exactly; no arithmetic applied
- VM-3: frequency field on ViewNode is always `null` from this adapter (variant frequency is not set here)
- VM-4: `variants: []` always in the output of `buildNormalizedViewModel` (populated by intelligence layer, not here)
- VM-5: `normalizeSystemId` is deterministic for the same system string

### 3-B. Invariant tests (evidence linkage, frequency math)

These test the contracts that the UX spec requires but that no existing test covers.

**Evidence linkage invariants (EL):**
- EL-1: every `DivergenceBranch` has `evidenceRunIds.length === branch.runCount`
- EL-2: the union of `conformingRunIds` (not yet in the interface — see gap below) and
  all `branch.evidenceRunIds` must cover every input run id exactly once per run
  (note: a single run can appear in multiple branches if it diverges at multiple points,
  so this invariant needs care — see DA-9)
- EL-3: `ViewVariantPath` does NOT currently carry `evidenceRunIds` — this is a correctness
  gap. The interface must be extended to carry run ids before the "See the evidence" UX
  flow (UX spec §2.3) can be built. Test that the adapter populates this field.

**Frequency sum invariant (FS):**
- FS-1: `variants.reduce((s, v) => s + v.frequency, 0)` must equal `1.0` (±0.001) when
  the variant list comes from a well-formed source; if a variant is missing its frequency
  the adapter must assign a computed value from `runCount / totalRuns` rather than `0`
- FS-2: `conformingFrequency` from `analyzeDivergence` is a value in [0, 1]; does not need
  to be 1 - sum(branch.frequency) because branches are run-level, not path-level

**Decision point invariant (DP):**
- DP-1: every node with `isDecisionPoint: true` in the ViewNode list corresponds to exactly
  one node with `isDivergencePoint: true` in the variant adapter output when variant data
  is available — this is the visual contract between the topology layer and the variant layer
- DP-2: the `divergencePoints` array in `ViewVariantPath` (currently always `[]` per
  `extractVariantsFromIntelligence:98`) must be populated before the diverge-reconverge
  diagram can be rendered; test that it is non-empty when variant data is available

### 3-C. Accessibility tests

The variant map introduces new interactive surfaces not covered by existing axe scans in
`v2-a11y.spec.ts`. The following must be added before ship:

**A11y targets:**
- PathCard `<button>` elements must have visible focus indicators and `aria-label` values
  that include the path role and frequency (e.g., `aria-label="Standard Path — 78% of runs"`)
- ComparePathId button ("Compare vs Standard") must have a distinct `aria-label` distinguishing
  it from the card's primary select action
- StepSequenceView step buttons must have `aria-label` that includes ordinal and step label
  (currently the button has no explicit `aria-label` — only visible text)
- The "Quick Compare" buttons in the left rail must be distinguishable by screen reader
  (currently they render identical structure for multiple paths)
- Path coverage bar on the dashboard row (per UX spec §1.2) requires `aria-label` =
  `"Standard path coverage: N percent. N of M runs follow the main path."`
- SinglePathView info banner must have `role="status"` or be announced as non-interactive

**Axe gate extension:**
Add to `apps/web-app/e2e/app/dashboard/v2-a11y.spec.ts` or a new
`workflow-view-variants-a11y.spec.ts`:
- Mount the `WorkflowVariantsMap` in variants mode with seeded data
- Run `assertAxeCompliance` on the full variants panel
- Assert zero critical/serious violations
- Assert `maxModerate: 0` ratchet per the existing pattern

### 3-D. Playwright hydration smoke gate extension

The current smoke gate (`analysis.smoke.spec.ts`) must be extended with a variants-mode check.

**New test: `[hydration] variants mode renders without crash`**

Preconditions: use the same seeded workflow from the existing `POST /api/sample-workflow`
call, but the sample workflow must include at least 2 runs grouped into a process cluster
to produce non-empty variant data.

Steps:
1. Navigate to `/workflows/${id}` (already done by existing test)
2. Click the Variants mode tab in `WorkflowModeSwitcher`
3. Wait for the variants panel to be visible (`locator('.variants-panel')` or a stable
   data-testid attribute — see gap below)
4. Wait 1500ms for React effects and data fetches to settle
5. Assert no `pageerror` or console `error` events matching `HYDRATION_ERROR_PATTERNS`
6. Assert `page.locator('text=Application error')` count is 0
7. Assert at least one path card is rendered

**Additional assertions specific to variants mode:**
- Assert that at least one `roleLabel` badge is visible (e.g., "Standard Path" or "Observed")
- Assert that the step sequence renders at least one step row
- Assert that no step row shows `undefined` or `[object Object]` as its label text

**Gap: missing `data-testid` attributes.** The current `WorkflowVariantsMap.tsx` has no
`data-testid` attributes on any element. Playwright locators based on visible text are
fragile for copy changes. Before the smoke gate test can be written stably, the following
attributes must be added (list is not exhaustive; implementation engineer adds as needed):
- `data-testid="variants-panel"` on the outermost `<div className="absolute inset-0 flex">`
- `data-testid="path-card"` on each `PathCard` root element
- `data-testid="step-sequence"` on the `StepSequenceView` root element
- `data-testid="single-path-view"` on the `SinglePathView` root element

---

## 4. Edge Cases to Cover

### 4-A. Single run (no variant data)

**Current behavior:** `buildVariantData` returns `hasVariantData: false` when `variants.length === 0`.
`WorkflowVariantsMap` renders `SinglePathView` instead of the multi-path layout.
**Test:** BVD-1 above. Also verify that `SinglePathView` renders the info banner with
the correct copy "Single recording — no variants to compare yet" and that the step
sequence uses `graph.nodes` not a fallback.

**Missing edge case:** what if `processRun` has `runCount: 1` but the model was somehow
given a non-empty `variants` array? This should not happen in production but the adapter
should be tested for this state: variant data present but only one run → `hasVariantData`
should be `false` (or at minimum the displayed run count must not be 0).

### 4-B. Exactly 2 runs, one variant each

**Risk:** `classifyPaths` logic for `fastestId`/`longestId` requires `withDuration.length > 1`.
With exactly 2 paths both having duration data, both `fastestId` and `longestId` are set,
and the role assignment fires for one path as both fastest and longest if they are the same
path — which is impossible by construction, but the code allows `fastestId === longestId`
if both reduce calls pick the same element. Add a test asserting that `fastestId !== longestId`
when there are exactly 2 distinct paths.

### 4-C. Identical runs (all runs follow the same path)

**Current behavior:** `analyzeDivergence` returns `conformingRunCount === totalRuns`,
`branches: []`. `buildVariantData` with all-conforming runs would have `variants` populated
with a single entry (`isStandard: true`, `frequency: 1.0`). `hasVariantData` would be
`false` (because `variants.length === 0` → returns `extractVariantsFromIntelligence(intelligence)`
→ if that also returns one item, `hasVariantData = variants.length > 1` = `false`).

**Test:** Verify that all-identical-runs produces the `SinglePathView` with the path's
duration correctly populated (not `'—'`) and step count equals the actual step count.

### 4-D. Fully disjoint runs (zero LCS overlap)

**Risk:** `analyzeDivergence` with fully disjoint runs produces branches whose `altSteps`
cover the entire run and `skippedBackbone` covers the entire backbone. The `frequency`
for each branch is `1/totalRuns`. The `conformingRunCount` is `0`.

**Test:** Verify that `conformingFrequency === 0` and that every branch has non-empty
`evidenceRunIds`. Verify that `dfgConfirmedSplit` and `dfgConfirmedJoin` flags are set
correctly when the backbone has only one possible successor for each step (out-degree === 1
throughout → `dfgConfirmedSplit: false` for all branches when all runs are disjoint).

### 4-E. Spaghetti (many variants, e.g. 20 paths)

**Risk:** `classifyPaths` renders all paths as cards. With 20 paths, the left rail becomes
very tall. The "Quick Compare" section filters to `paths.filter(p => !p.isStandard).slice(0, 3)`,
so only 3 appear. But the path card rail renders all 20 with no pagination or overflow control.

**Test:** Render with 20 variants and assert:
- No `undefined` or `NaN` values appear in rendered frequency bars
- The left rail is scrollable (CSS `overflow-y-auto` is present)
- At most 3 entries appear in Quick Compare section

**Performance risk:** `clusterSignatures` is O(n²) pairwise. With 20 runs of 50-step
signatures, this is 190 similarity computations. Not a functional issue, but should be
noted for the measurement plan.

### 4-F. Repeated step categories (same category appears multiple times in one path)

**Risk:** `StepSequenceView` uses `path.stepCategories.map((cat, i) => ...)` with key
`${path.id}-step-${i}`. If the same category appears multiple times, the keys are still
unique (indexed), but `matchNode` is resolved by `taskNodes[i]` — positional matching
between the variant's `stepCategories` array and the graph's `taskNodes` array. If the
variant has a different number of steps than the graph's taskNodes, `matchNode` is `undefined`
for out-of-bounds indices. The button renders but `matchNode.shortLabel` throws.

**Test:** Render with a variant whose `stepCategories.length > graph.nodes.filter(task).length`
and assert no `Cannot read properties of undefined` error. The component must handle
`matchNode === undefined` gracefully (it currently does — `{matchNode && ...}` guards are in
place — but this should be explicitly tested).

### 4-G. Empty or missing `intelligence` prop

**Current behavior:** `WorkflowPageShell.tsx:300-301` passes:
```typescript
intelligence={processOutput?.intelligence ?? processOutput?.processDefinition?.intelligence}
```
If both are `undefined`, `intelligence` is `undefined`. `buildVariantData` calls
`extractVariantsFromIntelligence(undefined)`, which returns `[]` safely. `hasVariantData`
becomes `false`. `SinglePathView` renders.

**Test:** Verify that `intelligence={undefined}` produces `SinglePathView` with no console
errors. This is the most common initial state for any workflow that has not yet been analyzed.

### 4-H. `avgDurationMs: null` for all variants

**Current behavior:** `extractVariantsFromIntelligence:98` always sets `avgDurationMs: null`.
In `classifyPaths`, `withDuration = paths.filter(p => p.avgDurationMs !== null)` will be empty.
`fastestId` and `longestId` will be `null`. No fastest/longest badge is assigned.

**Test:** Verify that when all `avgDurationMs` are null, no path card shows a fastest/longest
badge, and `durationLabel` renders as `'—'` for all paths (not `'0'` or `'undefined'`).

---

## 5. Concrete Release Gates

The following gates must all pass before the variant-aware map can be declared ship-ready.
They are ordered by dependency: later gates can only be defined once earlier ones are built.

### Gate 1 — Determinism certified (P0, blocks all subsequent gates)

**Condition:** All four determinism fixes identified in Section 1 are implemented and have
passing Vitest tests:
- `classifyPaths` sort tiebreaker by id (1-B)
- `fastestId`/`longestId` tiebreaker by id (1-C)
- `variantId` missing → validation assertion rather than silent index fallback (1-D)
- `viewModel.ts` system-edge Map iteration → stable sort before iteration (1-E)

**Evidence artifact:** Vitest run showing test groups CP, BVD, and VM all green.

### Gate 2 — `evidenceRunIds` plumbed into `ViewVariantPath` (P0, evidence-linked moat)

**Condition:** `ViewVariantPath.evidenceRunIds: string[]` field is added to the interface
and populated by `variantAdapter.ts` (bridging from `DivergenceBranch.evidenceRunIds`).
Every variant path card's "See the evidence" flow (per UX spec §2.3) can display which
run ids produced it.

**Test:** Invariant test EL-3 passes: `viewVariantPath.evidenceRunIds.length > 0` for every
non-conforming path when `analyzeDivergence` has returned branches with evidence.

**Evidence artifact:** Vitest test EL-3 green.

### Gate 3 — `divergencePoints` populated in `ViewVariantPath` (P1, required for diverge-reconverge diagram)

**Condition:** `ViewVariantPath.divergencePoints` (currently always `[]`) is populated from
`DivergenceBranch.divergeAfterIndex` before the React Flow diverge-reconverge canvas ships.

**Test:** Invariant test DP-2 passes when variant data is available.

### Gate 4 — Vitest unit test suite green (P0)

**Condition:** All test groups defined in Section 3-A and 3-B are implemented and pass:
BVD-1 through BVD-7, CP-1 through CP-7, EL-1 through EL-3, FS-1 through FS-2, DP-1
through DP-2, DA-7 through DA-10, VM-1 through VM-5.

**Minimum count:** At least 30 substantive `it()` blocks specifically for the variant map
surface (in addition to existing tests). This satisfies the MR-006 Change C ≥12 threshold
per iteration.

### Gate 5 — No axe critical/serious violations in variants mode (P1)

**Condition:** `assertAxeCompliance` run on the rendered `WorkflowVariantsMap` with at
least 2 seeded variants reports zero critical, zero serious violations, and
`moderate.length ≤ 0` (matching the ratchet established in DV2-R04 iter-046 for other
surfaces).

**Evidence artifact:** Playwright axe-scan test in `v2-a11y.spec.ts` or a new
`workflow-view-variants-a11y.spec.ts`, result green.

### Gate 6 — Hydration smoke gate covers variants mode (P0 for any SSR-capable future state, P1 now)

**Condition:** `analysis.smoke.spec.ts` includes the new variants-mode test defined in
Section 3-D. The test passes in a production build against the smoke database with
`TZ=UTC` server / `America/New_York` browser (matching the existing asymmetry pattern).

**Evidence artifact:** Playwright smoke gate run showing all three tests green: existing
Analysis view test, new Variants mode test, and existing hostile-data regression test.

### Gate 7 — `selectedPathId` `useState` initial value is SSR-safe (P1 — preemptive)

**Condition:** `WorkflowVariantsMap.tsx` initializes `selectedPathId` to `null` (constant,
not derived from `paths`) and sets it to `paths[0]?.id` in a `useEffect`. Comment in
`WorkflowPageShell.tsx` documents the "variants mode is never SSR'd" invariant.

This gate is P1 because the current architecture never SSR's variants mode. It becomes
P0 the moment any future change enables mode persistence via URL params.

### Gate 8 — Performance baseline established for spaghetti case (P2)

**Condition:** `clusterSignatures` with 20 members each having 50-step signatures runs to
completion in under 500ms in the Vitest environment (a `performance.now()` assertion).
Document this baseline in `MEASUREMENT_PLAN_PROCESS_VARIATION.md`.

---

## Summary of Blockers vs Follow-ups

| # | Finding | Severity | Gate | Blocks Ship? |
|---|---------|----------|------|-------------|
| 1-A | Node position source opaque — no determinism contract | P0 | Gate 1 | YES |
| 1-B | `classifyPaths` sort unstable on frequency tie | P0 | Gate 1 | YES |
| 1-C | `fastestId`/`longestId` nondeterministic on duration tie | P0 | Gate 1 | YES |
| 1-D | Missing `variantId` → index-based fallback id | P1 | Gate 1 | YES |
| 1-E | System-edge Map iteration order | Low | Gate 1 | No (systems map, not variants) |
| 2-A | Variants mode never SSR'd — invariant undocumented | P1 | Gate 7 | No (preemptive) |
| 2-B | Smoke gate does not cover variants mode | P1 | Gate 6 | YES before external launch |
| 2-C | `useState` initial value derived from data — SSR risk if mode persisted | P1 | Gate 7 | No (preemptive) |
| 2-D | `setTimeout` in `resetView` — test flakiness risk | Low | — | No |
| 3-EL-3 | `evidenceRunIds` not plumbed into `ViewVariantPath` | P0 | Gate 2 | YES |
| 3-DP-2 | `divergencePoints` always `[]` | P1 | Gate 3 | YES (for diverge diagram) |
| 3-data-testid | No `data-testid` attributes on variants panel | P1 | Gate 6 | YES (for smoke gate) |

**P0 blockers (must be resolved before feature ships):** 1-A, 1-B, 1-C, 1-D, 2-B, EL-3, data-testid gap
**P1 items (must be resolved before external launch or when SSR is enabled):** 2-A, 2-C, DP-2, Gate 5 axe scan
**Low / preemptive items:** 1-E, 2-D, Gate 8 performance baseline
