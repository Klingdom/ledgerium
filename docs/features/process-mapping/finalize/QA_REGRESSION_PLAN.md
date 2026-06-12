# QA Regression Plan — Visio-Grade Process-Mapping Overhaul

**Date:** 2026-06-12
**Author:** qa-engineer (READ-ONLY analysis — no product code modified)
**Scope:** NOTHING BREAKS regression-risk analysis and validation plan for the planned Visio-grade process-mapping overhaul: ELK layered layout, orthogonal routing, ShapeResolver, 2 new view adapters (systems view expansion + SwimlaneHeaderOverlay), mode-switcher expansion, and P0–P2 polish.
**Artifacts read:**
- `docs/features/process-mapping/visio/VISIO_ARCHITECTURE_REVIEW.md`
- `docs/features/process-mapping/visio/VISIO_LAYOUT_ROUTING_PLAN.md`
- `docs/features/process-mapping/visio/VISIO_VISUAL_SPEC.md`
- `apps/web-app/src/lib/variantFlowModel.test.ts`
- `packages/process-engine/src/contentEnricher.test.ts`
- `apps/web-app/playwright.smoke.config.ts`
- `apps/web-app/e2e/smoke/hydration.smoke.spec.ts`
- `apps/web-app/e2e/app/variants-screenshots.spec.ts`
- `apps/web-app/src/components/workflow-view/**` (all adapter + component files enumerated)
- `apps/web-app/src/lib/variantFlowModel.ts` (interface via tests)

**Baseline test count at analysis time:** 2839 passing / 116 files (workspace `pnpm test`); 1373 passing / 72 files (web-app filter)

---

## 0. Executive Summary

The overhaul touches four load-bearing contracts simultaneously: the graph data model
(`NormalizedViewModel`), the layout computation path (from sync fallback arithmetic to async
ELK), the React hydration boundary (ELK is async and must never run on the server), and
the honesty invariant (decision labels must never be fabricated). Two of these were the site
of the production hydration-crash crisis and the P0 honesty findings (Architecture Review
§1, §3.2, §3.3). They are the highest-risk surfaces.

The existing `variantFlowModel.test.ts` suite and the `contentEnricher.test.ts` honesty
invariant tests are the primary regression anchors. Neither covers the hydration surface of
the canvas itself — that gap is confirmed by VISIO_ARCHITECTURE_REVIEW.md §3.2: "There is
no flash-specific smoke test in the repo today." That gap must be closed before P1 merges.

---

## 1. Invariant Inventory

The following invariants must hold through every stage of the overhaul. Each is traced to an
existing test or a new test required by this plan.

### INV-1 — Layout Determinism
**Contract:** identical `LayoutInput` (frozen node order, frozen edge order, fixed shape sizes,
frozen ELK option set) produces byte-identical positions AND edge bend points on every call,
in every environment (CI, local, production build).
**Scope:** both `layoutFallback` (pure arithmetic) and `layoutElk` (ELK bundled).
**Existing test (fallback):**
`apps/web-app/src/lib/variantFlowModel.test.ts` — "produces byte-identical nodes and
positions on repeated calls" (compares `coordsA` to `coordsB` element-by-element).
**Existing test (permutation):**
`apps/web-app/src/lib/variantFlowModel.test.ts` — "is permutation-invariant (same result
regardless of variant order)".
**Gap:** No test exists yet for `layoutElk` (module `apps/web-app/src/lib/mapLayout/elkLayout.ts`
does not yet exist). Required new tests: see §3, NEW-T1.
**Determinism-threat fields:** `variantDetector.ts:39` `computedAt: new Date().toISOString()` —
the Architecture Review (Finding C-6) flags this field must be excluded from any layout
signature. The `layoutSignature()` function in the routing plan correctly excludes it, but
this must be verified by a test.

### INV-2 — Hydration Safety (the production-crisis invariant)
**Contract:** SSR and first client render must produce identical markup. ELK's `layout()`
is async and must run only inside `useEffect` (client-only). The first render of every canvas
mode must use the synchronous fallback positions so `server-markup === first-client-markup`.
No `Date.now()` or environment-dependent value may appear in any field that flows into
rendered HTML.
**Existing gate:**
`apps/web-app/playwright.smoke.config.ts` + `e2e/smoke/hydration.smoke.spec.ts` — 5
routes tested (4 static + 1 dynamic SSR). Catches Minified React errors #418, #423, #425,
#419 and "Application error" body text.
**Gap 1 (confirmed by architecture review §3.2):** The smoke gate covers `/`, `/login`,
`/pricing`, `/docs`, `/share/smoke-probe-token`. It does NOT cover any workflow canvas page
(`/workflows/[id]`), which is the exact route that will SSR the new `VisioCanvas` component.
**Gap 2:** The existing smoke covers public routes only. The workflow page requires auth.
The analysis spec `e2e/app/variants-screenshots.spec.ts` visits `/workflows/${workflowId}`
but only asserts "no uncaught page errors" — it does not assert against hydration-error
console patterns. Required new test: see §3, NEW-T2.
**MapTitleBar `asOfDate` risk:** VISIO_VISUAL_SPEC §4.4 specifies `MapTitleBar` renders
`new Date(meta.asOfDate).toLocaleDateString(...)`. If `asOfDate` is computed at render
time (e.g. `new Date().toISOString()`), TZ-divergence between server (UTC) and browser
(America/New_York per smoke config) will produce a mismatch. The field must be a static
string supplied from the data layer, not computed at render time.

### INV-3 — Forward-Only Edges
**Contract:** In RIGHT or DOWN layout direction, every edge's target position must be
greater-than-or-equal to its source position on the primary axis. No backward arrows.
**Existing test:**
`apps/web-app/src/lib/variantFlowModel.test.ts` — "all edges flow forward — no backward
arrows" (asserts `tx >= sx` for every edge, in the 6-variant fixture and the 2-variant
minimal case).
**Scope today:** variant mode only. After the overhaul the fallback `layoutEngine` and
the `OrthogonalEdgeRouter` must enforce this for all four modes.
**Gap:** No forward-edge test exists for flow, swimlane, or systems modes. The swimlane
mode currently uses the adapter's x-positions; after ELK integration a backward edge is
possible if the lane-pin override breaks ELK's routing. Required new tests: see §3, NEW-T3.

### INV-4 — Honesty: Observed-Only Decision Labels
**Contract (two parts):**
(a) `decisionLabel` must match `/\d+ of \d+ run/` and must not match
`/\bif\b|\belse\b|\bwhen\b|\bthen\b|\bcondition\b|\bgate\b/i`.
(b) `detectDecisionPoints` path (iii) (title-regex `approv|reject|deny|decline`) must
NEVER produce a `decision` node or a `decisionLabel` in the form
`"Should X be approved or rejected?"`.
**Existing tests:**
`apps/web-app/src/lib/variantFlowModel.test.ts` — "decision labels use observed-count
language (never fabricated conditions)"; "edges carry honest frequency labels".
`packages/process-engine/src/contentEnricher.test.ts` — "does NOT fabricate a condition
from approval/rejection keywords in step titles (honesty invariant)"; "only produces
observed-validation decisions (submit→error or data_entry→error)".
**Gap:** The honesty invariant is tested end-to-end for the variant path and for the raw
`detectDecisionPoints` function. However, there is no test verifying that when the
`ShapeResolver` (new stage (b)) receives a `ViewNode` with `decisionProvenance:'inferred'`,
it returns `VisioShape:'process'` (not `'decision'`). Required new test: see §3, NEW-T4.

### INV-5 — Orthogonal Segments (No Diagonals)
**Contract:** Every segment of every edge polyline returned by `layoutElk` or the Plan-B
Manhattan router must be strictly axis-aligned: for any two consecutive points p[i] and
p[i+1], either `|dx| < 0.5` (vertical segment) or `|dy| < 0.5` (horizontal segment).
Not both non-zero.
**Existing test:** None.
**Required new test:** see §3, NEW-T5.

### INV-6 — Spine Collinearity
**Contract:** Under `DOWN` direction, all spine/backbone nodes must share the same x
coordinate (form a straight vertical column). Under `RIGHT` direction, same y coordinate.
**Existing test:** None (the variant builder's Plan-B layout produces this by integer
arithmetic but it is not asserted).
**Required new test:** see §3, NEW-T6.

### INV-7 — ShapeResolver Totality
**Contract:** `resolveShape(node, mode)` is a total function — every `ViewNodeType` ×
`decisionProvenance` combination maps to exactly one `VisioShape`. No input combination
may throw or return `undefined`. The mapping `inferred → process` is load-bearing.
**Existing test:** None.
**Required new test:** see §3, NEW-T7.

### INV-8 — ELK Module Isolation (Client-Only)
**Contract:** The `elkjs` module must NOT be importable from any server-side code path.
Specifically: `apps/web-app/src/lib/mapLayout/elkLayout.ts` must not be imported by any
file that lacks `'use client'` and is not a test file.
**Existing test:** None.
**Existing signal:** `playwright.smoke.config.ts` comment block documents the exact
failure mode (SSR + client bundle asymmetry). Architecture review §3.2 specifies
"importing `elkjs` at module scope in a file that SSRs" as a named risk.
**Required new test:** see §3, NEW-T8.

### INV-9 — `exactOptionalPropertyTypes` Compliance
**Contract:** All new interfaces (`LayoutInput`, `LaidOutGraph`, `RoutedEdge`, `ShapeSpec`,
`ViewNode` additions of `decisionProvenance`) must satisfy TypeScript `exactOptionalPropertyTypes`
— no `field?: T` that accepts `undefined` where the intent is "absent".
**Existing gate:** `pnpm typecheck` (workspace-wide strict mode, enforced on all 10
packages/apps). This gate catches this class of error at compile time.
**Risk:** the `layoutSignature` function serializes optional fields with `?? null` — the
test that verifies order-sensitivity (NEW-T1d) confirms these fields are handled
correctly.

### INV-10 — Existing Smoke 8/8 Preserved
**Contract:** the 5 existing smoke routes (4 static + 1 dynamic) must continue to pass
with zero hydration errors through every P0/P1/P2 merge.
**Test:** `apps/web-app/e2e/smoke/hydration.smoke.spec.ts` (5 tests).
Also: `apps/web-app/e2e/app/variants-screenshots.spec.ts` (1 test) which navigates the
variants map and flow mode and asserts no uncaught errors.

---

## 2. Risk Map

Risk rating: LOW (existing tests catch it), MED (partial coverage or indirect signal),
HIGH (no existing test; requires new test or manual verification).

### Change 1 — ELK Layered Layout Engine (`apps/web-app/src/lib/mapLayout/elkLayout.ts`, `elkOptions.ts`, `useElkLayout.ts`)

| Failure mode | Risk | Catch mechanism |
|---|---|---|
| ELK option drift between environments (CI uses different JVM/WASM than prod) yields different x/y | HIGH | NEW-T1: run-to-run equality of positions + bend points; must run in CI under the same Node/WASM as prod |
| `useElkLayout` instantiates ELK during SSR (`typeof window` guard fails) → imports `elkjs` in server context → hydration crash | HIGH | NEW-T2: workflow-page smoke; also NEW-T8: module-import scope check |
| `layoutSignature` accidentally includes `computedAt` from `VariantSet` → cache thrash, or more critically: different signature server vs client | MED | NEW-T1d: signature order-sensitivity test |
| ELK `LAYER_SWEEP` crossing-minimization produces different order under concurrent calls (shared ELK instance race) | MED | `useElkLayout` uses `useRef` singleton; `cancelled` flag prevents stale resolution. Architecture review confirms the `semiInteractive` + `considerModelOrder` option set is determinism-sufficient. Test: run two concurrent calls on same graph and assert identical output (NEW-T1). |
| ELK version bump (`^0.11.1` allows patch bumps) silently shifts geometry | MED | NEW-T1: primary gate is run-to-run equality (version-agnostic); secondary: numeric snapshot that trips on any geometry shift |
| Node `width`/`height` measured from DOM instead of fixed constants → font-dependent geometry → machine-specific layout → hydration mismatch | HIGH | VISIO_LAYOUT_ROUTING_PLAN §1.3 "anti-footgun" explicitly forbids DOM measurement. Must verify in code review that only constants `280×72` / `280×88` are passed. NEW-T1 confirms positions are byte-identical, which would fail if DOM measurement were used in CI. |
| `useElkLayout` `useEffect` dependency array includes non-serialized object identity → infinite re-layout loop | MED | `sig = layoutSignature(graph)` is the sole dependency (string). Test: assert `layoutElk` is called exactly once for a stable graph (NEW-T2 indirectly; unit test of hook is out of scope for this plan — covered by manual review). |

### Change 2 — Orthogonal Custom Edge (`apps/web-app/src/components/workflow-view/edges/WorkflowEdge.tsx`)

| Failure mode | Risk | Catch mechanism |
|---|---|---|
| `orthogonalPath()` receives a diagonal ELK point (ELK sub-pixel drift) → renders a non-orthogonal segment → diagram looks wrong | LOW | NEW-T5: axis-aligned assertion on every edge segment returned by `elkLayout`. `orthogonalPath` has a defensive L-bend insert for diagonals. |
| `elkPoints` present on server (SSR) → `orthogonalPath` called with ELK points → different SVG path server vs client → hydration mismatch | HIGH | The `data.elkPoints` field is only populated inside `useElkLayout`'s `useEffect` (client-only). On SSR, `data.elkPoints` is `undefined` → `getSmoothStepPath` fallback. Must verify `elkPoints` is never set outside the effect. NEW-T2 (workflow-page smoke) catches the symptom. |
| `borderRadius: 12 → 0` in `getSmoothStepPath` changes path string → test or visual snapshot breaks | LOW | Existing visual behaviour change is intentional (V-P0-1). No snapshot tests exist for edge paths — low breakage risk. |
| `markerEnd` references SVG marker IDs that are not in the DOM (e.g. `arrow-seq`) → connectors render without arrowheads | MED | The `<svg><defs>` block must be rendered as a sibling of `<ReactFlow>` in both `WorkflowCanvas.tsx` and `WorkflowSwimlaneCanvas.tsx`. Manual visual check required. Playwright screenshot from `variants-screenshots.spec.ts` provides an indirect signal. |

### Change 3 — ShapeResolver (`apps/web-app/src/components/workflow-view/render/shapeResolver.ts`)

| Failure mode | Risk | Catch mechanism |
|---|---|---|
| `inferred` decision node routes to `decision` shape (diamond) instead of `process` (rect) → fabricated condition visible in UI | HIGH | NEW-T4: ShapeResolver truth-table test asserts `inferred → process`; INV-4 honesty tests. |
| New `VisioShape` type is not total over all `ViewNodeType` inputs → runtime `undefined` access in node renderer | HIGH | NEW-T7: exhaustiveness test iterating all `ViewNodeType` values. TypeScript `exactOptionalPropertyTypes` + strict null checks provide compile-time backstop. |
| ShapeSpec `width`/`height` differ between modes → `layoutFallback` and ELK receive different sizes for the same node type → cross-mode layout divergence | MED | NEW-T7: assert ShapeSpec widths are mode-consistent for the same node type. |

### Change 4 — `layoutFallback` generalization (lift Plan-B from `variantFlowModel.ts`)

| Failure mode | Risk | Catch mechanism |
|---|---|---|
| Variant mode positions change (byte-identity regression) after lifting Plan-B into `layoutEngine.ts` | HIGH | INV-1 existing test: "produces byte-identical nodes and positions on repeated calls". If the fallback is lifted correctly, this test must continue to pass without re-pinning. If positions shift, the test fails loudly. |
| Flow mode introduces a collision (two nodes overlap) that was absent with the simple `position.y = index * GAP` layout | MED | NEW-T3: forward-edge test for flow mode (forward-only position is a proxy for no-collision on the primary axis). Visual check via `variants-screenshots.spec.ts` flow-mode screenshot. |
| `buildPhases` (consecutive-run-length grouping) and the new `laneKey:'phase'` profile compute different phase boundaries → swimlane and flow disagree on system regions (Finding C-5) | MED | This is an intentional fix. Regression: the old swimlane behaviour must not regress before the new `laneBands` computation is wired. Manual review. |

### Change 5 — `SwimlaneHeaderOverlay` + swimlane adapter changes (V-P1-1, V-P1-4)

| Failure mode | Risk | Catch mechanism |
|---|---|---|
| Removing `laneHeader` nodes from the React Flow node array while retaining their position references → null position access in downstream consumers | HIGH | Explicit code review: confirm all `laneHeader` node references are removed from `nodeTypes`, `buildSwimlaneData` output, and any downstream consumers before merge. |
| `useViewport()` called outside a `ReactFlowProvider` context → runtime error | MED | `SwimlaneHeaderOverlay` must be rendered inside the provider wrapper. Architecture spec shows it as a sibling of `<ReactFlow>` which is inside the provider. Unit test is impractical; manual review required. |
| ELK `fixedY` override for swimlane (§4.1) leaves ELK-computed edge endpoints offset from the pinned node border → handoff edges miss their source/target handles | MED | Visual check via `variants-screenshots.spec.ts` (does not currently exercise swimlane). Manual review. NEW-T2 (workflow-page smoke) will catch a JS exception if the offset causes a rendering error. |
| `sourceHandle: 'right'` / `targetHandle: 'left'` set on same-lane edges but the Right/Left handles are not yet added to `WorkflowTaskNode.tsx` (V-P0-6/V-P1-15) → React Flow edge connects to default handle → silent mis-routing | MED | These must land in the same P0/P1 commit. Code review: confirm handle additions precede or accompany adapter changes. |

### Change 6 — Mode Switcher Expansion + `VisioCanvas` shell (P1-4)

| Failure mode | Risk | Catch mechanism |
|---|---|---|
| `VisioCanvas` imports `elkjs` at module scope (not inside effect) → breaks SSR → hydration crash on `/workflows/[id]` | HIGH | NEW-T8 + NEW-T2. |
| One of the four existing mode views (`flow`, `variants`, `swimlane`, `systems`) fails to receive the updated `NormalizedViewModel` fields (`decisionProvenance`, `runCount`, `isMultiRun`) → rendering with `undefined` fields → visual defect or runtime error | MED | NEW-T4 (ShapeResolver handles `null` decisionProvenance). TypeScript strict null check: if `decisionProvenance` is added as a required field, compiler errors surface any consumer that doesn't pass it. |
| `variants-screenshots.spec.ts` `workflow-mode-variants` testid no longer present after mode switcher refactor → e2e test fails | MED | If testid renames are made, the e2e spec must be updated in the same commit. |

### Change 7 — Visual Polish (P0–P2: `borderRadius`, `CATEGORY_STYLES`, `EDGE_STYLES`, `constants.ts`, `globals.css`)

| Failure mode | Risk | Catch mechanism |
|---|---|---|
| `NODE_TYPE_STYLES` rename `'rounded-rect' → 'rect'` breaks a string comparison somewhere | LOW | `grep -r "rounded-rect"` before and after merge. TypeScript won't catch this if the type is `string`. |
| `globals.css` print media block hides elements that were previously visible in non-print context | LOW | Visual check. The print block uses `@media print` — no runtime impact on normal render. |
| `MapTitleBar` renders `new Date(meta.asOfDate).toLocaleDateString(...)` client-side with a TZ-dependent result → hydration mismatch (INV-2) | HIGH | NEW-T2 smoke will catch the symptom. Code review must verify `asOfDate` is a stable static value (from `ProcessDefinition.createdAt` or similar), not `Date.now()`. |

---

## 3. New Tests Required

All new test files are in `apps/web-app/src/lib/mapLayout/` (unit, Vitest, Node/WASM, no browser)
or in existing test files (extension of existing describes). No product code is modified by
this section.

### NEW-T1 — ELK Layout Determinism Suite
**File:** `apps/web-app/src/lib/mapLayout/elkLayout.test.ts` (NEW)
**Test framework:** Vitest (async, runs under Node/WASM — bundled ELK runs without a browser)

```
describe('elkLayout — determinism')
  it('T1a: positions byte-identical for identical input — two fresh ELK instances, same frozen GRAPH')
    // Run r1 = elkLayout(makeElk(), GRAPH); r2 = elkLayout(makeElk(), GRAPH)
    // Assert JSON.stringify(r1.positions) === JSON.stringify(r2.positions)
    // Assert JSON.stringify(r1.edgePoints) === JSON.stringify(r2.edgePoints)

  it('T1b: edge sections are orthogonal — every segment axis-aligned')
    // For every edgePoints[id], for each consecutive pair pts[i]/pts[i+1]:
    // Assert Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5 (not both > 0.5)

  it('T1c: spine nodes are collinear on the cross-axis under DOWN direction')
    // GRAPH has isSpine=true on backbone nodes
    // Assert new Set(SPINE_IDS.map(id => positions[id].x)).size === 1

  it('T1d: layoutSignature changes when node order changes (order-sensitivity guard)')
    // sig1 = layoutSignature(GRAPH); sig2 = layoutSignature({...GRAPH, nodes: [...GRAPH.nodes].reverse()})
    // Assert sig1 !== sig2
    // (Confirms ELK is always fed a deterministic frozen order, not an accidentally reversed one)

  it('T1e: layoutSignature is unchanged when computedAt field added to input (C-6 exclusion guard)')
    // sig1 = layoutSignature(GRAPH)
    // sig2 = layoutSignature({...GRAPH, _computedAt: new Date().toISOString()})
    // Assert sig1 === sig2  (computedAt is never part of the signature)

  it('T1f: numeric snapshot — fails loudly on ELK version bump that shifts geometry')
    // toMatchSnapshot() on a small fixed-graph positions result
    // This is a secondary tripwire: it will fail on an intentional ELK upgrade,
    // forcing a review of whether the geometry change is acceptable.
```

**GRAPH fixture for all T1 tests:** a fixed, frozen object with 5 nodes (start, 3 task, end),
4 sequence edges, `direction: 'DOWN'`, all `width: 280, height: 72`. Defined as a `const`
at the top of the file. Never derived at runtime.

### NEW-T2 — Workflow Canvas Hydration Smoke
**File:** `apps/web-app/e2e/smoke/hydration.smoke.spec.ts` — EXTEND existing file
OR new file `apps/web-app/e2e/smoke/canvas.smoke.spec.ts`

**Approach:** Add a new `project` to `playwright.smoke.config.ts` called `canvas-authed`
(depends on the existing `setup` project) that exercises the workflow page. The test seeds
a minimal workflow (or reuses the sample-variants seed from `variants-screenshots.spec.ts`)
and navigates to `/workflows/${id}`.

```
test('[hydration] /workflows/[id] — no hydration crash on workflow canvas page', ...)
  // Collect pageerror + console errors with matchesHydrationError()
  // Navigate to /workflows/${workflowId} (seeded workflow)
  // Wait networkidle + 2000ms (enough for ELK effect to settle)
  // Assert pageErrors matching HYDRATION_ERROR_PATTERNS === []
  // Assert consoleErrors matching HYDRATION_ERROR_PATTERNS === []
  // Assert page.locator('text=Application error').toHaveCount(0)
  // Assert body.innerText().trim().length > 10

test('[hydration] /workflows/[id]?mode=flow — flow mode canvas no crash')
test('[hydration] /workflows/[id]?mode=swimlane — swimlane canvas no crash')
test('[hydration] /workflows/[id]?mode=systems — systems canvas no crash')
```

This directly closes the gap identified in VISIO_ARCHITECTURE_REVIEW §3.2: "There is no
flash-specific smoke test in the repo today."

### NEW-T3 — Forward-Edge Invariant for Flow, Swimlane, Systems Modes
**File:** `apps/web-app/src/components/workflow-view/adapters/flowAdapter.test.ts` (NEW)
**File:** `apps/web-app/src/components/workflow-view/adapters/swimlaneAdapter.test.ts` (NEW)

Pattern (mirroring `variantFlowModel.test.ts` "all edges flow forward"):

```
it('T3a: flowAdapter — all edges flow forward after layoutFallback (DOWN direction)')
  // Build a NormalizedViewModel with known ordinal positions
  // Run buildFlowData() + layoutFallback()
  // For every edge: assert target.position.y >= source.position.y (DOWN = y-axis)

it('T3b: swimlaneAdapter — all intra-lane edges flow left-to-right after layoutFallback (RIGHT direction)')
  // Build a swimlane model, run layoutFallback with direction:'RIGHT'
  // For every same-lane edge: assert target.position.x >= source.position.x
```

### NEW-T4 — ShapeResolver Honesty: `inferred` Never Reaches Diamond
**File:** `apps/web-app/src/components/workflow-view/render/shapeResolver.test.ts` (NEW)

```
describe('resolveShape — honesty invariant')
  it('T4a: inferred decisionProvenance → shape:process (never decision)')
    const node: ViewNode = { nodeType: 'decision', decisionProvenance: 'inferred', ... }
    expect(resolveShape(node, 'flow').shape).toBe('process')
    // This is the load-bearing chokepoint for Finding C-1

  it('T4b: observed-divergence decisionProvenance → shape:decision')
    expect(resolveShape({ nodeType: 'decision', decisionProvenance: 'observed-divergence' }, 'flow').shape).toBe('decision')

  it('T4c: observed-validation decisionProvenance → shape:decision')
    expect(resolveShape({ nodeType: 'decision', decisionProvenance: 'observed-validation' }, 'flow').shape).toBe('decision')

  it('T4d: null decisionProvenance on a task node → shape:process')
    expect(resolveShape({ nodeType: 'task', decisionProvenance: null }, 'flow').shape).toBe('process')

describe('resolveShape — totality invariant')
  it('T4e / NEW-T7: every ViewNodeType × every decisionProvenance → exactly one VisioShape (no undefined, no throw)')
    const nodeTypes: ViewNodeType[] = ['start', 'end', 'task', 'decision', 'exception']
    const provenances = ['observed-divergence', 'observed-validation', 'inferred', null]
    for (const nodeType of nodeTypes)
      for (const prov of provenances)
        expect(() => resolveShape({ nodeType, decisionProvenance: prov }, 'flow')).not.toThrow()
        expect(resolveShape({ nodeType, decisionProvenance: prov }, 'flow').shape).toBeTruthy()
```

### NEW-T5 — Orthogonal Segment Assertion (covered by T1b above)
T1b in `elkLayout.test.ts` covers ELK output. Additionally extend NEW-T3 to assert
the Plan-B Manhattan router output is also axis-aligned:

```
it('T5: Plan-B manhattanDown/manhattanRight connectors are axis-aligned')
  // Call manhattanDown({x:0,y:0,w:280,h:72}, {x:0,y:200,w:280,h:72})
  // For each consecutive pair: assert Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5
```

### NEW-T6 — Spine Collinearity (covered by T1c above)
T1c in `elkLayout.test.ts` covers ELK. For the Plan-B fallback, extend the existing
`variantFlowModel.test.ts`:

```
it('T6: backbone (vfm-bb-*) nodes are collinear on x-axis (fallback layout)')
  const model = buildVariantFlowModel({ variants: ALL_VARIANTS, totalRuns: TOTAL_RUNS })!
  const backboneXs = model.nodes.filter(n => n.id.startsWith('vfm-bb-')).map(n => n.position.x)
  expect(new Set(backboneXs).size).toBe(1)
```

This test belongs in the existing `variantFlowModel.test.ts` file (additive, under the
determinism describe block).

### NEW-T7 — ShapeResolver Totality (rolled into NEW-T4, test T4e above)

### NEW-T8 — ELK Module Import Isolation
**File:** `apps/web-app/src/lib/mapLayout/elkLayout.test.ts` — add as a non-async test

```
it('T8: elkLayout module does not import elkjs at the top level (import path guard)')
  // Read the source of elkLayout.ts and assert it does not contain a top-level
  // `import ELK from 'elkjs'` statement outside a function body.
  // This can be done with a static text check:
  const src = fs.readFileSync(path.join(__dirname, 'elkLayout.ts'), 'utf-8')
  // The import must be inside a function (dynamic import or inside makeElk())
  // Assert: no module-scope static import of elkjs (the only safe pattern is
  // `import type ...` or a dynamic `await import(...)` inside a function).
  expect(src).not.toMatch(/^import\s+ELK\s+from\s+'elkjs/m)
```

**Rationale:** This is a cheap static guard against the exact failure mode documented in
the production-crisis history and the architecture review §3.2. The dynamic import
pattern inside `makeElk()` is the only safe form.

### NEW-T9 — Per-New-View Computability + Honesty (systems mode)
**File:** `apps/web-app/src/components/workflow-view/adapters/systemAdapter.test.ts` (NEW)

The systems map currently uses `i * 300` row layout (Finding C-5, Architecture Review §2.1).
After the overhaul it should route through `layoutFallback` with `laneKey:'none'`.

```
it('T9a: systemAdapter positions are deterministic (byte-identical on repeated calls)')
it('T9b: systemAdapter — no fabricated decision nodes (system nodes use subprocess shape, never diamond)')
it('T9c: systemAdapter — edge labels are observed-only (frequency/boundary language)')
```

### NEW-T10 — Large-Graph Performance Budget
**File:** `apps/web-app/src/lib/mapLayout/elkLayout.test.ts` — add as an async test

```
it('T10: ELK layout completes in < 500ms for a 50-node, 60-edge graph (performance budget)')
  const LARGE_GRAPH: LayoutGraph = { direction: 'DOWN',
    nodes: Array.from({length: 50}, (_, i) => ({id: `n${i}`, width: 280, height: 72})),
    edges: Array.from({length: 49}, (_, i) => ({id: `e${i}`, source: `n${i}`, target: `n${i+1}`})),
  }
  const t0 = Date.now()
  await elkLayout(makeElk(), LARGE_GRAPH)
  expect(Date.now() - t0).toBeLessThan(500)
```

**Rationale:** The architecture review notes "current scale (a spine + decisions / top-N
variants / lane bands) is sub-frame on main thread." 50 nodes / 60 edges is an upper bound
for the current product scale. This budget should be revisited if the system ever processes
significantly larger workflows. On a P2 timeline, this becomes a CI-enforced contract.

---

## 4. Validation Gate (Per-Merge Checklist)

Run these commands in order before declaring any P0/P1/P2 iteration shipped. Every
command must produce the stated pass result with zero failures.

### Step 1 — TypeScript (all 10 packages/apps)
```
pnpm typecheck
```
**Pass:** Zero errors across all packages. This catches `exactOptionalPropertyTypes`
violations, missing interface fields, and any import of `elkjs` types in server-side files.

### Step 2 — Unit Tests (workspace)
```
pnpm test
```
**Pass:** All tests pass. Count must be >= baseline (currently 2839). Zero new failures.
**After P0:** All existing `variantFlowModel.test.ts` assertions green (INV-1, INV-3, INV-4).
All existing `contentEnricher.test.ts` honesty assertions green (INV-4).
**After P1:** NEW-T1 through NEW-T10 added and green. Count increases by >= 15 new tests.
**Regression tripwire:** If the T1f numeric snapshot fires (ELK geometry changed), stop and
review before merging — this is not an automatic pass.

### Step 3 — web-app filter (faster iteration check)
```
pnpm --filter @ledgerium/web-app test
```
**Pass:** All 72+ test files pass. No regressions vs baseline (1373 tests).

### Step 4 — process-engine filter
```
pnpm --filter @ledgerium/process-engine test
```
**Pass:** All tests pass. The `detectDecisionPoints` honesty invariant tests must be green.

### Step 5 — Production Build
```
cd apps/web-app && pnpm build
```
**Pass:** Zero build errors. `elkjs` must appear only in client bundles (check build output
for any SSR bundle that includes `elkjs`). Any server-bundle inclusion of `elkjs` is a
blocker — stops Step 6.
**How to check:** `next build` output lists module inclusion. Run:
```
pnpm build 2>&1 | grep -i "elkjs"
```
The string `elkjs` must not appear in the SSR bundle analysis. If it does, `elkjs` has
leaked into a server-side import path and will cause a hydration crash in production.

### Step 6 — Playwright Smoke (production hydration gate)
```
cd apps/web-app
DATABASE_URL=file:./smoke.db NEXTAUTH_SECRET=smoke-secret-not-for-prod npx next build
npx playwright test --config playwright.smoke.config.ts
```
**Pass:** All 5 existing routes green (zero hydration errors). After NEW-T2 is added:
all workflow-canvas smoke tests green.
**This step reproduces the production VPS condition** (server UTC, browser America/New_York,
build-time env vs runtime env asymmetry). Any `MapTitleBar` `new Date()` TZ divergence
will appear here as a Minified React error.

### Step 7 — Variants E2E Screenshots
```
npx playwright test e2e/app/variants-screenshots.spec.ts --project=authenticated
```
**Pass:** Test completes without uncaught page errors. Screenshots written to
`apps/web-app/public/docs/screenshots/`. Both `workflow-variants-map` and
`workflow-process-map` screenshots must show a non-empty diagram (visual review required
for first run after ELK integration — confirm layout looks correct, not blank).

### Step 8 (P1+ only) — ELK-specific assertions
After `apps/web-app/src/lib/mapLayout/elkLayout.ts` is shipped:
```
pnpm --filter @ledgerium/web-app test -- --reporter=verbose src/lib/mapLayout/elkLayout.test.ts
```
**Pass:** All T1a–T1f, T8, T10 tests green. T1f snapshot must be committed alongside the
test (not ignored) so future ELK version bumps trigger a deliberate review.

---

## 5. Go / No-Go Checklist for Production-Ready

This checklist gates a production merge. All items must be checked YES.

### Correctness
- [ ] **INV-4a:** `variantFlowModel.test.ts` "decision labels use observed-count language" — PASSES
- [ ] **INV-4b:** `contentEnricher.test.ts` "does NOT fabricate a condition from approval/rejection keywords" — PASSES
- [ ] **NEW-T4 / T4a:** `shapeResolver.test.ts` asserts `inferred decisionProvenance → shape:process` — PASSES
- [ ] **INV-3:** `variantFlowModel.test.ts` "all edges flow forward" — PASSES (both fixtures)
- [ ] **NEW-T3:** Flow and swimlane forward-edge tests — PASSES

### Determinism
- [ ] **INV-1:** `variantFlowModel.test.ts` "byte-identical nodes and positions on repeated calls" — PASSES (unchanged positions confirm Plan-B lift was byte-identical)
- [ ] **NEW-T1a:** `elkLayout.test.ts` ELK positions byte-identical run-to-run — PASSES
- [ ] **NEW-T1b / T1d:** ELK segments orthogonal + layout signature excludes `computedAt` — PASSES

### Hydration Safety (the production-crisis gate)
- [ ] **Step 5:** `pnpm build` — `elkjs` does NOT appear in SSR bundle output
- [ ] **NEW-T8:** `elkLayout.test.ts` static import guard — no top-level `import ELK from 'elkjs'` — PASSES
- [ ] **Step 6:** All existing smoke routes (5) — ZERO hydration errors
- [ ] **NEW-T2:** Workflow canvas smoke (3–4 routes) — ZERO hydration errors
- [ ] **MapTitleBar review:** `asOfDate` is a static string from the data layer, not `Date.now()` or `new Date()` at render time — CONFIRMED BY CODE REVIEW

### Test Coverage
- [ ] `pnpm test` count >= baseline 2839 + at least 15 new tests from NEW-T1 through NEW-T10
- [ ] `pnpm typecheck` — zero errors

### Visual / Manual
- [ ] `variants-screenshots.spec.ts` screenshots reviewed: variant map shows non-empty ELK layout, flow mode shows non-empty flow map, no blank canvas
- [ ] Swimlane mode: header overlay stays fixed left when diagram is panned horizontally (manual check)
- [ ] Decision nodes display "◆ Branch point" header — never "Yes/No", "If approved", or any inferred conditional (manual check in variants view with a multi-run workflow)
- [ ] All sequence edges have closed arrowheads at the target end (manual check — confirms SVG `<defs>` marker block was added)

### Performance
- [ ] **NEW-T10:** 50-node ELK layout completes in < 500ms — PASSES

### Cleanup (P2 gate only)
- [ ] **P2-4:** If adapter deletion was performed, confirm all four canvas modes still render correctly under `VisioCanvas` with the mode-profile routing
- [ ] **NODE_TYPE_STYLES rename:** `grep -r "rounded-rect"` across `src/` returns zero hits after rename

---

## 6. Artifact Cross-References

| Claim | Source artifact | Location |
|---|---|---|
| No smoke test covers the workflow canvas | VISIO_ARCHITECTURE_REVIEW.md | §3.2 "no flash-specific smoke test in the repo today" |
| ELK must be client-only in `useEffect` | VISIO_LAYOUT_ROUTING_PLAN.md | §3.2 "Hydration safety (precise)" |
| ELK options are frozen for determinism | VISIO_LAYOUT_ROUTING_PLAN.md | §1.2, §1.3 "proof, not assertion" |
| `inferred` decision → task (not diamond) | VISIO_ARCHITECTURE_REVIEW.md | §2.3, §3.3 |
| `computedAt` must be excluded from layout signature | VISIO_ARCHITECTURE_REVIEW.md | Finding C-6, §3.1 |
| Hydration crash production history | `playwright.smoke.config.ts` | Comment block, lines 8–18 |
| Forward-only edge test (existing) | `variantFlowModel.test.ts` | Line 208–215, Line 316–323 |
| Honesty test: no fabricated conditional | `contentEnricher.test.ts` | Lines 273–286 |
| No `Date`/`Math.random` in layout | VISIO_LAYOUT_ROUTING_PLAN.md | §1.3 |
| `borderRadius: 0` visual spec | VISIO_VISUAL_SPEC.md | §2.1 V-P0-1 |
| Fixed node sizes (anti-footgun) | VISIO_LAYOUT_ROUTING_PLAN.md | §1.3 "anti-footgun" |
| `MapTitleBar` TZ-risk from `toLocaleDateString` | VISIO_VISUAL_SPEC.md | §4.4 |
