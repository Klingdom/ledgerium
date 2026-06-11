# Frontend Hardening Review — Variant Story Map, DNA Strip, Variants Map
Date: 2026-06-11
Reviewer: frontend-engineer
Scope: WorkflowVariantStoryMap, VariantDnaStrip, WorkflowVariantsMap, variantStoryMap.ts (builder),
WorkflowPageShell (lazy-load wiring), page.tsx (variants fetch lifecycle)

---

## 1. Runtime Robustness Bugs

### P0 — Critical crashes or silent data corruption

**BUG-FE-01 [P0] — Stale `selectedEdgeId` crashes evidence panel after `variants` prop change**
File: `WorkflowVariantStoryMap.tsx:92, 145`

When the parent's `variantIntelligence` resolves and `WorkflowVariantsMap` re-renders,
`variantData.paths` changes and a new `map` is computed by `useMemo`. The `selectedEdgeId`
state is NOT reset when `variants`/`map` change. `map.edges.find(e => e.id === selectedEdgeId)`
then returns `undefined` but the `?? null` coalesces it to `null` — the panel disappears
silently. This is not a crash, but if a future React version or a concurrent-mode tear causes
the `StoryMapInner` to remount with the same state key, the stale id could reference a
different edge in the new map producing wrong evidence. Fix: add a `useEffect` that clears
`selectedEdgeId` whenever `map` changes.

```
// WorkflowVariantStoryMap.tsx:94-107  — map useMemo
// WorkflowVariantStoryMap.tsx:92      — selectedEdgeId state
// Needs: useEffect(() => setSelectedEdgeId(null), [map]);
```

**BUG-FE-02 [P0] — ReactFlow `fitView` fires before nodes are in the viewport when `map` changes**
File: `WorkflowVariantStoryMap.tsx:177-178`

`fitView` is a static prop on `<ReactFlow>`. React Flow v11+ honours `fitView` only on the
initial render; subsequent node changes (slider adjustment, `variants` prop swap) do NOT
trigger a re-fit. The graph can be partially visible or shifted out of view when the slider
reduces branch count. The existing `WorkflowCanvas.tsx` solves this correctly using
`useReactFlow().fitView()` inside a `useEffect` keyed on graph changes. The story map has no
`useReactFlow` hook at all, so programmatic re-fit is impossible.

Fix: import `useReactFlow`, store the instance in a ref, and call `instance.fitView({ padding: 0.2 })`
inside a `useEffect` keyed on `map` (or on `rfNodes.length`).

**BUG-FE-03 [P0] — `maxBranches` slider initialises to 99 and never resets when `variants` changes**
File: `WorkflowVariantStoryMap.tsx:91`

`useState(99)` is the initial complexity value. If the user navigates away and returns, or if
`variantIntelligence` resolves after a delay, the component is mounted fresh — but the
`maxBranches=99` sentinel is correct on first mount. However the `Math.min(maxBranches, map.branchCount)`
clamp in the slider's `value` prop only fixes the rendered thumb, not the internal state:
`edgeLabel` / `buildVariantStoryMap` still receive `maxBranches=99` which is correct, but
`map.shownBranchCount` in the headline text uses the actual builder result. This is consistent.
The real risk: if the user drags the slider to, say, 2 on a 10-branch workflow, then a prop
change triggers a rebuild with a new variant set that now has only 1 branch, the slider's
`min={1} max={map.branchCount}` equals `max={1}`, while `maxBranches=2` in state. React
renders `value={Math.min(2,1)}=1` so the slider appears correct, but `buildVariantStoryMap`
receives `maxBranches=2` not `1`. The builder's `Math.max(0, maxBranches)` clamp (`variantStoryMap.ts:128`)
means it shows 1 branch correctly — no crash, but the `shownBranchCount` headline would show
`1/1` while the user's mental model expects `2`. Low severity in isolation but combined with
BUG-FE-02 produces a confusing UX loop.

**BUG-FE-04 [P0] — `selectedPathId` initialises from `paths` computed at render time but is never reset when `variantData` changes**
File: `WorkflowVariantsMap.tsx:171-173`

```ts
const [selectedPathId, setSelectedPathId] = useState<string | null>(
  paths.find(p => p.isStandard)?.id ?? paths[0]?.id ?? null,
);
```

`useState` initialiser runs only once per mount. When `intelligence` prop changes (the lazy
POST resolves), `variantData` and `paths` are recomputed via `useMemo`, but `selectedPathId`
still holds the id from the initial render (likely `'observed'` from `classifyPaths`'s
fallback). `paths.find(p => p.id === selectedPathId)` returns `undefined → null` so the
entire right-panel of the List view becomes blank without any error message.

Fix: add a `useEffect` that resets `selectedPathId` when `variantData.hasVariantData` changes
from false to true, or when `paths[0]?.id` changes identity.

**BUG-FE-05 [P0] — `StoryNodeComponent` does not display any human-readable label**
File: `WorkflowVariantStoryMap.tsx:30-62`

The node renders `style.label` (the category label, e.g. "Navigation") and a "decision" badge,
but no step title, step number, system, or any other identifying text. Every backbone node of
the same category (e.g. a 6-step process with 3 "Navigation" nodes) is visually identical.
This is not a runtime crash but is a critical readability failure for the feature's core
purpose.

The `data` object passed to the node IS `StoryNode` from the builder (`WorkflowVariantStoryMap.tsx:115`
— `data: n`). `StoryNode` exposes `category`, `kind`, `backboneIndex`, `isDecision`, and
`runShare` but no `title` or `shortLabel` — these were not added to `StoryVariantInput` or
`StoryNode`. The `StoryVariantInput` type has `stepCategories: string[]` (category keys only,
no titles). Fix requires either: (a) adding `stepTitles?: string[]` to `StoryVariantInput` and
threading through titles from `ViewVariantPath`, or (b) showing ordinal numbers as the minimum
fallback. At minimum, the `backboneIndex` (0-based) is available in `data` and should be
rendered as `{data.backboneIndex + 1}` for backbone nodes.

### P1 — Functional errors that degrade the feature

**BUG-FE-06 [P1] — `edgeLabel` only fires for `branch...-in` and `shortcut` edges; rejoin edges carry the same evidence but show no label and cannot open the evidence panel on click**
File: `WorkflowVariantStoryMap.tsx:74-79`

The `edgeLabel` function checks `e.id.endsWith('-in')` for branch edges. Rejoin edges
(`id: 'rejoin-${lane}'`) and intermediate branch-step edges (`id: 'branch-${lane}-${k}'`)
silently receive `undefined` labels. The `onEdgeClick` handler DOES set `selectedEdgeId` for
these edges, and `selectedEdge.evidenceRunIds` IS populated. So clicking any branch-step
mid-segment or the rejoin arc correctly opens the evidence panel, which is fine. But the user
cannot see from the canvas that these edges are clickable — there is no visual affordance.
Rejoin edges also produce duplicate "path" information that the user cannot access unless they
happen to click. This is acceptable for rejoin-only arcs but branch-step mid-segment edges
should carry labels too.

**BUG-FE-07 [P1] — `StandardPath` path.id matches may fail when no `isStandard` flag is set**
File: `WorkflowVariantsMap.tsx:75, 116`

`classifyPaths` line 75: `const standard = paths.find(p => p.isStandard) ?? paths[0]!`. Then
line 116: `if (p.isStandard || p.id === standard.id)`. When `extractVariantsFromIntelligence`
returns paths where `isStandard` is set correctly on the variant matching `isStandardPath=true`,
this is fine. But the `buildVariantData` path (`variantAdapter.ts:54`) prefers
`model.variants` (from the view model) over the intelligence extraction. If `model.variants`
is empty AND `intelligence` is null (during the loading window), `variantData.paths` is `[]`,
`classifyPaths([])` is called — it returns the single "Observed" fallback path, and
`variantData.hasVariantData` is `false`. The `SinglePathView` renders. No crash.

However, if `model.variants` has entries but none has `isStandard: true` (engine returns
variants without a marked standard), `classifyPaths` falls back to `paths[0]!` as the
standard. The non-null assertion is safe because the `paths.length === 0` guard is in
`buildVariantData → hasVariantData` logic, not `classifyPaths`. But if caller invokes
`classifyPaths` with a non-empty array where no entry is `isStandard`, the logic is correct by
design (first entry is treated as standard). No crash.

**BUG-FE-08 [P1] — Evidence panel `break-all` leaks long UUID strings out of the panel boundary on narrow canvases**
File: `WorkflowVariantStoryMap.tsx:205-207`

```tsx
<p className="mt-1 font-mono text-[9px] text-[var(--content-tertiary)] break-all leading-relaxed">
  {selectedEdge.evidenceRunIds.join('  ·  ')}
</p>
```

`break-all` forces breaks anywhere in the run id string, which looks broken with UUIDs. With
many run ids the panel could overflow the canvas vertically (it is `bottom-3 left-3 right-3`
with no `max-h` constraint). Fix: add `max-h-28 overflow-y-auto` and use `truncate` or
`line-clamp-3` with a "show all" toggle; use `overflow-wrap: break-word` instead of
`break-all`.

**BUG-FE-09 [P1] — `StepSequenceView` matches graph nodes to path steps by raw index (`taskNodes[i]`), not by content or id**
File: `WorkflowVariantsMap.tsx:522-524`

```ts
const taskNodes = graph.nodes.filter(n => n.nodeType === 'task' || ...);
const matchNode = taskNodes[i];
```

For the standard path this is coincidentally correct because `path.stepCategories` has the same
length as `taskNodes`. For variant paths with insertions or deletions, `stepCategories.length`
differs from `taskNodes.length`, so `taskNodes[i]` is undefined for the extra positions (safe —
`matchNode` is just undefined so labels/durations are suppressed) or the WRONG node for later
positions (silently associates the wrong system/label). This is a display-only error but
misleads users who click "DIVERGES" steps expecting the correct inspector panel to open.
`onSelectNode(matchNode.id)` will select the wrong node in the inspector.

**BUG-FE-10 [P1] — `comparePathId` is never cleared when `selectedPathId` changes**
File: `WorkflowVariantsMap.tsx:174, 244-245`

If the user selects path A, clicks "Compare vs Standard" to set `comparePathId = B`, then
clicks on path B in the card list (`setSelectedPathId(B)`), the comparison card shows "B vs B"
because both `selectedPath` and `comparePath` resolve to the same object. No crash; the
comparison deltas are all zero/dashes, which is confusing.

Fix: in `onSelect` of `PathCard`, also call `setComparePathId(null)` if the newly selected id
matches `comparePathId`.

**BUG-FE-11 [P1] — `VariantDnaStrip` uses index `i` as `key` for step tokens**
File: `VariantDnaStrip.tsx:45`

```tsx
key={i}
```

This is stable within a single variant row, but if the parent `sorted` array is re-ordered
(e.g., user records a new run that changes frequency rankings and the component re-renders),
React reconciles by index and may reuse stale DOM nodes with mismatched colour/outline states.
Use `key={`${v.id}-${i}`}` which is already formed in `WorkflowVariantsMap.tsx:526` as a
pattern.

**BUG-FE-12 [P1] — `VariantDnaStrip` does not handle empty `stepCategories`**
File: `VariantDnaStrip.tsx:39-58`

If a variant has `stepCategories: []`, the inner `flex-wrap` div renders empty. The row still
renders (with only the label/stats column) producing a visual gap. This happens for the
`buildVariantStoryMap` filter path (`withSteps.filter(v => v.stepCategories.length > 0)`) but
the DNA strip does NOT share this filter — it receives the raw `variantData.paths`. The
`extractVariantsFromIntelligence` code defaults to `v.pathSignature?.stepCategories ?? []`.
Fix: add a guard `if (v.stepCategories.length === 0) return null;` before the row.

### P2 — Minor correctness/display issues

**BUG-FE-13 [P2] — `WorkflowVariantsMap` `VariantInsightsCards` uses `i` as `key`**
File: `WorkflowVariantsMap.tsx:651`

Same index-as-key pattern. Low risk because `insights` is recomputed fresh each render and is
not a long list, but inconsistent with project conventions.

**BUG-FE-14 [P2] — `ClassifiedPath.roleLabel` for `'variant'` role is always the literal string `` `Variant` `` with no disambiguating number**
File: `WorkflowVariantsMap.tsx:111`

When there are 5 non-standard, non-fastest, non-longest, non-exception paths, every card shows
"Variant" as the role badge. No disambiguation. Fix: append `${i+1}` or the frequency rank.

---

## 2. Hydration Safety

**HYDRATION-01 [P0 risk] — React Flow CSS is imported inside `'use client'` component files but is a side-effect import**
Files: `WorkflowVariantStoryMap.tsx:22`, `WorkflowCanvas.tsx:27`, `WorkflowSwimlaneCanvas.tsx:31`

```ts
import '@xyflow/react/dist/style.css';
```

In Next.js 14+ App Router, CSS side-effect imports inside `'use client'` components are
bundled by the client layer. This is safe as long as the component is never server-rendered.
The page (`app/(app)/workflows/[id]/page.tsx`) is itself `'use client'` so these components
cannot be SSR'd — the import is safe in the current setup.

However: the project has a prior hydration crisis (mentioned in brief). The protection is
structural, not explicit. The risk re-emerges if: (a) someone converts the page to a Server
Component and imports `WorkflowPageShell` without a `dynamic(..., { ssr: false })` wrapper, or
(b) tests or Storybook render these components in a Node environment. The existing
`WorkflowCanvas.tsx` and `WorkflowSwimlaneCanvas.tsx` have the same import pattern and have
apparently been stable, so this is a pre-existing accepted pattern.

**Verdict: currently safe; the new story-map file does not introduce any new SSR risk beyond
the existing canvas files. No immediate fix required. The `'use client'` boundary is
correctly applied at the component level, and the page entry-point is also `'use client'`.**

**HYDRATION-02 [PASS] — `buildVariantStoryMap` is deterministic**

The builder uses no `Date`, `Math.random`, `window`, or `document`. Node positions are
arithmetic (`i * SPACING_X`, `(lane+1) * SPACING_Y`). Sorting uses explicit tie-breakers on
stable string comparisons. The `version` field embeds `analysis.version` from the divergence
engine which is a deterministic constant string. The builder is safe to call on both client and
server (it imports only from `@ledgerium/intelligence-engine`, which is pure TypeScript).

**HYDRATION-03 [PASS] — `VariantDnaStrip` is deterministic**

Sort is `b.frequency - a.frequency || a.id.localeCompare(b.id)` — stable tie-break. No
`Date`/`window`. Safe.

**HYDRATION-04 [PASS] — `WorkflowVariantsMap` state initialisation**

`useState` for `selectedPathId`, `comparePathId`, `view` uses only values derived from `paths`
(which comes from a pure adapter) — no `window`, `Date`, or random. No mismatch risk.

**HYDRATION-05 [LOW RISK] — React Flow's internal viewport state uses `window.devicePixelRatio` and canvas dimensions**

React Flow reads DOM dimensions on mount to compute the initial viewport. This is inherently
client-only behaviour. The `ReactFlowProvider` wrapper in `WorkflowVariantStoryMap.tsx:216`
ensures the provider and its children are client-only. The `fitView` static prop computes on
mount. No hydration mismatch because the component tree is behind a `'use client'` boundary
that is never streamed from the server in the current routing setup.

The smoke gate (per brief) does not navigate to variants mode, so variants-specific hydration
errors would not be caught by the gate. No additional protection is needed beyond the existing
`'use client'` boundary.

---

## 3. UX / Loading / Error States

**UX-01 [P0] — No loading skeleton when variant intelligence POST is in-flight**

When the user clicks the "Variants" mode tab, `WorkflowPageShell.tsx:109` fires
`onRequestVariants()`. In `page.tsx:194`, `handleLoadVariants` sets
`variantLoadFiredRef.current = true` and fires the POST. The result arrives asynchronously.
During this window, `variantIntelligence` is still `null`, so `WorkflowVariantsMap` receives
`intelligence={null}`, `buildVariantData` returns `{ hasVariantData: false, paths: [...fallback] }`,
and the **`SinglePathView` is rendered** — the fallback "single recording" banner that says
"Record this workflow multiple times...".

From the user's perspective: they clicked "Variants", saw the "single recording" placeholder,
and 1–3 seconds later the real data appeared — or worse, if they only have one recording, they
can't tell whether the placeholder is the real answer or a loading state. There is no spinner,
no "Analysing variants..." text, no progress indication.

**Recommended fix:** Pass a `variantIntelligenceLoading: boolean` prop through
`WorkflowPageShell` to `WorkflowVariantsMap`. When loading, render a skeleton/spinner in place
of `SinglePathView`. In `page.tsx`, track `const [variantLoading, setVariantLoading] = useState(false)`
alongside the existing `variantLoadFiredRef`. Set it `true` before the fetch, `false` in
`finally`.

**UX-02 [P0] — 403 (non-Team plan) produces a silent `SinglePathView` with misleading guidance**

When `/api/workflows/[id]/variants` returns 403 (`checkFeatureAccess` gate, `route.ts:28-38`),
`handleLoadVariants` in `page.tsx:199-201`:

```ts
if (!res.ok) {
  variantLoadFiredRef.current = false;
  return;
}
```

`variantIntelligence` remains `null`. The Variants tab silently shows `SinglePathView` with the
message "Record this workflow multiple times to discover how the process varies" — which is
**factually wrong** for a user with existing multi-run recordings on a Free/Starter plan. They
have the data; they need to upgrade. There is no upgrade CTA, no mention of the feature gate.

The 403 response body carries `{ requiredPlan, upgradeUrl: '/pricing' }` (see `route.ts:33-37`)
which is discarded.

**Recommended fix:** Distinguish the 403 case from genuine network errors. Read
`res.json()` on non-ok responses, detect `status === 403`, set a `variantGated: boolean` state,
pass it through `WorkflowPageShell` to `WorkflowVariantsMap`, and render an upgrade-CTA banner
instead of `SinglePathView`.

**UX-03 [P1] — Network error / 500 also shows `SinglePathView` silently**

`handleLoadVariants` in `page.tsx:205-207` catches exceptions and resets the fired ref to allow
retry, but does NOT surface any error state. The 500 case inside the try block (`res.ok` check
at `page.tsx:199`) also silently returns. The user sees the same `SinglePathView` fallback as
if they had a single recording.

**Recommended fix:** Track `variantError: string | null` state; pass to variants view; render a
`WorkflowErrorState`-styled panel with a "Try again" button that resets `variantLoadFiredRef`
and re-invokes `onRequestVariants`.

**UX-04 [P1] — `WorkflowVariantStoryMap` empty-state copy is dismissive and inaccurate**
File: `WorkflowVariantStoryMap.tsx:136-141`

```tsx
<p ...>Not enough variation to map yet. Switch to List, or record this process again.</p>
```

This fires when `buildVariantStoryMap` returns `null` (< 2 variants with steps). The copy
directs users to "record this process again" which is correct for the single-run case, but
for the case where the POST succeeded and returned 1 variant (all runs identical), "not enough
variation" is the right message — the copy becomes confusing when combined with BUG-UX-02
(where this state is also shown for gated/error cases). The switch-to-List suggestion is good
but lacks a button.

**UX-05 [P2] — `WorkflowVariantsMap` view toggle buttons have no `aria-pressed` attribute**
File: `WorkflowVariantsMap.tsx:193-210`

The three toggle buttons (Map / DNA / List) are unstyled `<button>` elements with no
`role="group"` on the container and no `aria-pressed` state. Screen readers cannot determine
which view is active. Fix: add `aria-pressed={view === 'map'}` etc. to each button, and wrap
in `<div role="group" aria-label="Variant view mode">`.

---

## 4. Polish Gaps

**POLISH-01 [P1] — Decision-node visual affordance is weak — only a thicker border, no shape differentiation**
File: `WorkflowVariantStoryMap.tsx:45-46, 55-56`

Decision nodes use `borderWidth: 2` vs `borderWidth: 1` and show a small "decision" text badge.
The design convention in `WorkflowCanvas.tsx` (and `constants.ts:42`) uses a diamond shape for
decision nodes. The story-map backbone nodes are all rectangles regardless of `isDecision`.
Users who rely on the flow map convention will not recognise divergence points. At minimum, add
a diamond SVG or a distinct background pattern for `isDecision` nodes.

**POLISH-02 [P1] — Edge label clutter with many branches**
File: `WorkflowVariantStoryMap.tsx:74-80, 125-129`

Every `branch...-in` and `shortcut` edge gets a label. With 5+ branches, labels overlap each
other and overlap with nodes. React Flow does not auto-hide overlapping labels. Fix: suppress
labels when `map.shownBranchCount > 4` (or when the canvas viewport zoom is below a threshold
via `useViewport`), showing only the run-count on hover via a `title` attribute.

**POLISH-03 [P1] — `StoryNodeComponent` node has zero title text visible**
Already filed as BUG-FE-05. At minimum, the backbone index (step ordinal) must be rendered for
navigability. This is both a bug and a polish item.

**POLISH-04 [P1] — `VariantDnaStrip` has no empty state and no explanation of the divergence colour when all paths are standard**

When there is only one path (the fallback "Observed" path), the strip renders a single row with
no divergence highlighting. The explanatory paragraph "Outlined cells are where the path
deviates" is accurate but unnecessary. More importantly, there is no "Record more runs to
compare" prompt alongside the empty-ish data.

**POLISH-05 [P2] — Visual consistency: story-map uses hardcoded `#ecfdf5` / `#fffbeb` backgrounds that differ from the `var(--surface-*)` tokens**
Files: `WorkflowVariantStoryMap.tsx:44-45`, `variantStoryMap.ts` (no tokens there, but the
node data drives these colours).

The rest of the dashboard uses CSS custom property tokens (`var(--surface-elevated)`,
`var(--surface-secondary)`). The story-map node backgrounds are hardcoded light-theme greens
and ambers. In dark theme (the app default, `html.dark`), the node cards will appear
light-on-dark as islands, which is acceptable, but they diverge from the visual language of
the flow canvas nodes which use `CATEGORY_STYLES.bg` (also hardcoded but at least
centralised). Consider exposing `nodeBackground` as a CSS variable override.

**POLISH-06 [P2] — `WorkflowVariantsMap` `PathCard` compare affordance inconsistency: standard path has no compare button but `Quick Compare` section includes `standard vs variant` shortcuts that set `selectedPathId` to standard anyway**
File: `WorkflowVariantsMap.tsx:373, 254-264`

Standard path has no "Compare vs Standard" button (correct — can't compare against itself).
But `Quick Compare` shortcuts call `setSelectedPathId(standardPath?.id ?? null)` on both sides
of the comparison — so after clicking a quick-compare shortcut, both `selectedPath` and the
quick-compare target can become `standardPath`, which produces a "VS" panel with all-zero
deltas. Add a guard: `if (p.id === standardPath?.id) return null;` in the Quick Compare map.

**POLISH-07 [P2] — `WorkflowVariantsMap` does not expose the `onSelectNode` callback for the Map/DNA views**

In the Map sub-view (`view === 'map'`), `WorkflowVariantStoryMap` receives `onSelectNode` but
only uses it via `onPaneClick(() => { onSelectNode(null); ... })`. Clicking a canvas NODE in
the story map does not call `onSelectNode` — the React Flow `onNodeClick` is wired nowhere.
The inspector panel in `WorkflowPageShell` will therefore never open from the story map canvas.
In the DNA sub-view (`view === 'dna'`), `onSelectNode` is not even passed to `VariantDnaStrip`.

**POLISH-08 [P2] — Slider aria and responsiveness**
File: `WorkflowVariantStoryMap.tsx:158-169`

The slider has `aria-label="Number of variant branches to show"` which is correct. However:
- It lacks `aria-valuemin`, `aria-valuemax`, `aria-valuenow` (these are on the `<input type="range">` natively, so screen readers can read them, but the current `value` and range are not described in terms of the domain — "1 of 10 branches").
- On screens narrower than ~600px the header bar (`flex items-center gap-2 px-4 py-2`) wraps awkwardly; the `w-20` slider compresses further. Add `flex-wrap` or collapse the slider to a compact icon button on small screens.
- The `whitespace-nowrap` label `showing {n}/{total}` is not associated with the slider via `aria-describedby`.

**POLISH-09 [P2] — No tooltip or hover affordance on canvas node click**
File: `WorkflowVariantStoryMap.tsx:173-188`

The story-map canvas has `onPaneClick` but no `onNodeClick`. Nodes are not buttons; users have
no cue that clicking a node does anything (it does nothing in fact — see POLISH-07). The cursor
remains default. Add `cursor: 'default'` to nodes explicitly or `onNodeClick` to open a
tooltip.

---

## 5. Performance

**PERF-01 [P1] — `buildVariantStoryMap` is called with `useMemo([variants, maxBranches])` — the full layout rebuild runs on every slider tick**
File: `WorkflowVariantStoryMap.tsx:94-107`

`buildVariantStoryMap` calls `analyzeDivergence` (which runs an LCS algorithm across all
variant pairs) on every slider change. For 20+ variants, `analyzeDivergence` is
`O(n * m)` per variant pair where `m` is backbone length. The slider fires on every `input`
event (continuous drag). This means the LCS computation + node/edge array construction runs
10–20 times per second during a drag gesture.

Fix: separate the concerns. Call `buildVariantStoryMap` without the `maxBranches` constraint
once (keyed only on `variants`), store the full ranked branch list, and apply the
complexity filter as a cheap slice of the already-computed `ranked` array during the separate
`rfNodes`/`rfEdges` useMemo. This collapses the O(n) layout rebuild (no LCS) on slider change.
Or add a `useTransition` / `useDeferredValue` around `maxBranches` to debounce the slider.

**PERF-02 [P1] — `nodeTypes` and `edgeTypes` are defined at module scope which is correct, but `StoryNodeComponent` is not `React.memo`-wrapped**
File: `WorkflowVariantStoryMap.tsx:30-62, 64`

React Flow re-renders all visible nodes when `rfNodes` or `rfEdges` change. Since `rfNodes` is
recreated on every `maxBranches`/`variants` change, `StoryNodeComponent` renders for every
node on every slider tick. The component is simple but wrapping it in `React.memo` is a free
win, especially with 30+ backbone nodes.

**PERF-03 [P2] — `VariantDnaStrip` re-sorts on every render**
File: `VariantDnaStrip.tsx:18-20`

```ts
const sorted = [...variants].sort(...)
```

This is O(n log n) on every render. Wrap in `useMemo([variants])`.

**PERF-04 [P2] — `classifyPaths` runs `withDuration.reduce` twice (fastest AND longest) — fine for < 100 paths**
File: `WorkflowVariantsMap.tsx:82-99`

No practical issue at current data sizes; noted for completeness.

---

## 6. Concrete Fix Plan (P0 → P2)

### P0 — Must fix before shipping as production-ready

| ID | File | Fix |
|---|---|---|
| BUG-FE-01 | `WorkflowVariantStoryMap.tsx:92` | Add `useEffect(() => setSelectedEdgeId(null), [map])` after map useMemo |
| BUG-FE-02 | `WorkflowVariantStoryMap.tsx:177` | Import `useReactFlow`; store instance in ref; add `useEffect(() => instance.fitView({padding:0.2}), [map])` |
| BUG-FE-04 | `WorkflowVariantsMap.tsx:171` | Add `useEffect` resetting `selectedPathId` when `variantData.hasVariantData` flips true or `paths[0]?.id` changes |
| BUG-FE-05 | `WorkflowVariantStoryMap.tsx:30, variantStoryMap.ts:27` | Add at minimum `ordinal` (= `backboneIndex + 1`) rendering in node; add `stepTitles?` to `StoryVariantInput` as next step |
| UX-01 | `page.tsx:194`, `WorkflowPageShell.tsx:59`, `WorkflowVariantsMap.tsx:167` | Thread `variantIntelligenceLoading: boolean` prop; render skeleton in `SinglePathView` slot while loading |
| UX-02 | `page.tsx:194-208` | Detect 403, read `requiredPlan`/`upgradeUrl` from body, thread `variantGated` prop, render upgrade CTA |

### P1 — High polish / functional improvements

| ID | File | Fix |
|---|---|---|
| BUG-FE-06 | `WorkflowVariantStoryMap.tsx:74` | Show affordance on rejoin edges (distinct label or hover tooltip) |
| BUG-FE-07 | `WorkflowVariantsMap.tsx:75` | No crash, but add comment documenting the fallback assumption |
| BUG-FE-08 | `WorkflowVariantStoryMap.tsx:191-209` | Add `max-h-28 overflow-y-auto` to evidence panel; change `break-all` to `overflow-wrap: break-word`; truncate long id list |
| BUG-FE-09 | `WorkflowVariantsMap.tsx:522` | Replace index-match with content-match: find `taskNodes` by matching `cat === node.category` relative to the path sequence, or display without inspector link for mismatched paths |
| BUG-FE-10 | `WorkflowVariantsMap.tsx:244` | Clear `comparePathId` in `onSelect` when new id equals current `comparePathId` |
| BUG-FE-11 | `VariantDnaStrip.tsx:45` | Change `key={i}` to `key={`${v.id}-${i}`}` |
| BUG-FE-12 | `VariantDnaStrip.tsx:40` | Guard `if (v.stepCategories.length === 0) return null` |
| UX-03 | `page.tsx:199-208` | Track `variantError` state; pass through; render retry CTA |
| UX-05 | `WorkflowVariantsMap.tsx:193` | Add `role="group"` + `aria-label` on toggle container; add `aria-pressed` on each toggle button |
| POLISH-01 | `WorkflowVariantStoryMap.tsx:36-47` | Distinguish decision node shape (diamond outline or rotated square) |
| POLISH-02 | `WorkflowVariantStoryMap.tsx:125` | Suppress edge labels when `shownBranchCount > 4`; consider viewport-zoom-aware suppression |
| POLISH-06 | `WorkflowVariantsMap.tsx:255` | Guard Quick Compare shortcuts to exclude standard-vs-standard pair |
| POLISH-07 | `WorkflowVariantStoryMap.tsx:183` | Wire `onNodeClick` to call `onSelectNode(node.id)` |
| PERF-01 | `WorkflowVariantStoryMap.tsx:94` | Separate LCS computation (keyed on variants) from complexity filter (keyed on maxBranches) |
| PERF-02 | `WorkflowVariantStoryMap.tsx:30` | Wrap `StoryNodeComponent` in `React.memo` |

### P2 — Polish and minor corrections

| ID | File | Fix |
|---|---|---|
| BUG-FE-13 | `WorkflowVariantsMap.tsx:651` | Use stable key for insights cards |
| BUG-FE-14 | `WorkflowVariantsMap.tsx:111` | Append frequency rank or index to "Variant" role label |
| POLISH-04 | `VariantDnaStrip.tsx:22` | Add empty-variant guard and a "Record more runs" prompt when only 1 path present |
| POLISH-05 | `WorkflowVariantStoryMap.tsx:44` | Audit hardcoded colour values; consider CSS variable tokens for node backgrounds |
| POLISH-08 | `WorkflowVariantStoryMap.tsx:158` | Add `aria-describedby` linking slider to showing-count label; add flex-wrap on small screens |
| POLISH-09 | `WorkflowVariantStoryMap.tsx:173` | Add `onNodeClick` or explicit cursor-default to clarify clickability |
| PERF-03 | `VariantDnaStrip.tsx:18` | Wrap sort in `useMemo([variants])` |

---

## Areas Needing QA Attention

1. Variants tab when workflow has exactly 1 recording (SinglePathView is correct answer, but
   loading state and error state are indistinguishable — QA should confirm the loading spinner
   appears and then resolves to SinglePathView, not stale loading forever).

2. Variants tab when user is on Free/Starter plan (403 path). Confirm upgrade CTA renders
   rather than the misleading SinglePathView.

3. Slider drag with 5+ branches: confirm no layout freeze > 200ms per frame; confirm fitView
   re-centres after drag completes.

4. Evidence panel on shortcut edges: click a dashed shortcut arc, confirm panel opens. Click
   a rejoin arc, confirm panel opens (it does, but the clickable area is narrow).

5. DNA strip with 20+ variants: confirm horizontal token overflow scrolls, not overflows the
   page.

6. Inspector panel in Map view: confirm that clicking a backbone node does NOT open the
   inspector (because `onNodeClick` is not wired). After POLISH-07 is applied, confirm it does
   open with the correct node.

7. Dark theme (default): confirm story-map node card backgrounds are legible against the dark
   canvas background (hardcoded `#ecfdf5` green on `--surface-secondary: #161B22`).

---

## Deviations / Blockers

No backend gaps were discovered during this review. The `/api/workflows/[id]/variants` route
and its 403 response contract are already correctly structured; the frontend simply needs to
consume the 403 body fields (`requiredPlan`, `upgradeUrl`) that are already being returned.

The `StoryVariantInput` type gap (no `stepTitles`) is a data-contract limitation between the
frontend builder and the view model. Fixing BUG-FE-05 fully requires either extending
`ViewVariantPath` with titles or adding title lookup in the story-map component — both are
frontend-only changes with no backend dependency.
