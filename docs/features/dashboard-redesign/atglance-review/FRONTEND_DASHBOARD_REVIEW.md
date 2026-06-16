# Frontend Code Review — Workflows Dashboard (At-a-Glance + Navigation)

**Reviewer:** senior frontend engineer (code review only — no product code modified)
**Date:** 2026-06-15
**Scope:** `apps/web-app/src/app/(app)/dashboard/page.tsx`, `apps/web-app/src/components/dashboard-v2/**`, `apps/web-app/src/lib/dashboard-lenses/{lenses,pareto}.ts`, `apps/web-app/src/lib/dashboard-columns/*`, `apps/web-app/src/app/api/workflows/route.ts`
**Goal lens:** make the dashboard easy to understand at a glance and easy to navigate.
**Hard constraints honored in every fix sketch:** hydration-safe + deterministic (no `Date.now()`/`Math.random()` in render; dates via UTC `formatDate`; design tokens), honesty (no fabricated data), no new extension capture, render-only/wiring preferred.

---

## Executive summary

The **render surface is overwhelmingly hydration-safe and deterministic** — this is the single most important finding given the recurring production-crash class. Every chart is either pure SVG/CSS (`HealthGauge`, `OpportunityBar`, `LssParetoPanel`) or a hardened Recharts instance (`RecordedTrendChart`: `isAnimationActive={false}`, `useId()` gradient, pre-computed buckets). All `localStorage`-backed UI state (`density.ts`, `lens.ts`) uses the correct SSR-safe deferred-read pattern (stable default on server + first paint, reconcile in a post-mount effect). Pareto/lens libs are pure, deterministic, honesty-gated modules. Dates render through UTC `formatDate`. No `Math.random()` anywhere.

The real issues are concentrated in **(a) one genuine latent determinism hazard** (`WorkflowRow` `Date.now()` in render), **(b) the dead/orphaned v1 dashboard** that all users bypass yet still ships in the bundle, **(c) wasted/duplicated filtering + missing memoization** over the workflow list, and **(d) a cluster of navigation/a11y wiring defects** — a dangling `aria-controls`, a non-trapping "modal" dialog, a whole-`<tr>` click target wrapping nested interactives, and selection-follows-focus on the lens tabs that fires a full column/sort swap per arrow key. None block render today, but several directly degrade the at-a-glance/navigation goal.

Severity legend: **P0** correctness/crash-class · **P1** meaningful UX/perf/a11y · **P2** maintainability/polish.

---

## Findings

### 1. `Date.now()` called in render, per row — latent hydration/determinism hazard — **P1 (hydration-adjacent)**
**File:** `apps/web-app/src/components/dashboard-v2/WorkflowRow.tsx:788`
```ts
referenceNowMs: Date.now(),
activeTimeRange: timeRange ?? 'all',
```
`accessorContext` is built **in render**, once **per row**, and seeds `referenceNowMs` with a fresh `Date.now()`. Today this is harmless *only because* every wired accessor is a "lifetime" accessor that ignores the field (verified in `accessors.ts` — `AVAILABLE_ACCESSORS` are all pure scalar reads). The code comment itself flags the trap: the moment a Wave A time-windowed accessor consumes `referenceNowMs`, this becomes (a) **non-deterministic** (each row gets a different clock; identical inputs → different output) and (b) a **hydration-mismatch risk** if any accessor output is ever rendered server-side. It is also a per-row `Date.now()` cost on every list render.
**Fix sketch:** lift a single `referenceNowMs` snapshot to a stable `WorkflowList`-level boundary (`const nowMs = useMemo(() => Date.now(), [])` already exists at `WorkflowList.tsx:423`) and pass it down as a prop, so all rows in one render share one wall-clock value — matching the `route.ts:439` single-upstream-clock pattern. Until Wave A lands, this is the cheap pre-emptive fix; do it *with* Wave A at the latest. Render-only.

### 2. Entire v1 dashboard (~1300 LOC) is dead/orphaned but ships — **P1 (maintainability + bundle)**
**File:** `apps/web-app/src/app/(app)/dashboard/page.tsx:316-318` (early return) and the ~1000 LOC of `DashboardPageContent` + sub-components below it.
```ts
if (searchParams.get('v2') !== '0') {
  return <DashboardV2Shell />;
}
// v1 fallback — only rendered when ?v2=0 is explicitly present
```
All users get `DashboardV2Shell`; the entire v1 implementation (`MetricCard`, `IntelligenceList`, the v1 `WorkflowRow`, all v1 filter/preset/tag state) only renders behind a `?v2=0` escape hatch that per `CLAUDE.md` is past its soak window (#57 flag retirement ENGINEERING-COMPLETE). It is a maintenance tax (two `WorkflowRow` implementations, two filter models) and inflates the client bundle for the dashboard route. It also contains the only **`new Date().toLocaleDateString(...)` in-render** call on this page (line 769) — safe only because of `suppressHydrationWarning`, but it is exactly the pattern we want gone.
**Fix sketch:** retire the v1 branch per the #57 flag-retirement plan; reduce `page.tsx` to the `Suspense` wrapper + `DashboardV2Shell`. Pure deletion once CEO confirms soak complete (governance-gated, not a silent fix).

### 3. Workflow list is filtered twice and never memoized — **P1 (render performance)**
**Files:** `DashboardV2Shell.tsx:693` + `WorkflowList.tsx:447-450`
The shell computes `filteredWorkflows = applyFilters(portfolioFilteredWorkflows, …)` (line 693) **only to drive `deriveState()`**, then passes the *unfiltered* `portfolioFilteredWorkflows` to `<WorkflowList workflows={…}/>` (line 887), which **re-runs `applyFilters` again** (line 449) and then `sortWorkflows` (line 450). So filtering executes twice per render, and **none** of `timeFilteredWorkflows`, `portfolioFilteredWorkflows`, the shell's `filteredWorkflows`, the list's `filteredWorkflows`, or `sortedWorkflows` are wrapped in `useMemo`. On every keystroke/hover-driven re-render the full filter+sort pipeline re-runs over the whole list.
**Fix sketch:** memoize the derived chains (`timeFilteredWorkflows`, `portfolioFilteredWorkflows`, `filteredWorkflows`, `sortedWorkflows`) keyed on their real inputs; pass the already-filtered+sorted array (or at least the shared `filteredWorkflows`) into `WorkflowList` so the work happens once. Deterministic, render-only. Pairs with finding #4.

### 4. `WorkflowList` and shell each snapshot their own `Date.now()` for age filters — **P2 (determinism hygiene)**
**Files:** `DashboardV2Shell.tsx:669` (`filterNowMs`) and `WorkflowList.tsx:423` (`nowMs`)
Both are `useMemo(() => Date.now(), [])` (hydration-safe — post-mount, client-only), but they are **two independent clock boundaries** for the *same* logical render. The shell's `applyFilters` (driving `deriveState`) and the list's `applyFilters` (driving the rendered rows) can therefore evaluate "stale > 30 days" against two slightly different `now` values, which can in principle disagree at a boundary row → state machine says `ready`/`sparse` for a count the list doesn't render.
**Fix sketch:** once #3 collapses filtering to one place, there is one `nowMs`. If kept separate, pass `filterNowMs` down to `WorkflowList` as a prop so both call sites share one boundary (mirrors `route.ts` single-upstream-clock pattern).

### 5. Dangling `aria-controls` on lens tabs + panel only conditionally exists — **P1 (a11y / navigation)**
**Files:** `LensSwitcher.tsx:86` (`aria-controls="dashboard-lens-panel"` on **every** tab) and `DashboardV2Shell.tsx:788` (panel rendered only when `activeLens === 'lss'`); `LssParetoPanel.tsx:125` advertises `aria-labelledby="lens-tab-lss"`.
When the **Library** lens is active, both tabs point `aria-controls` at `#dashboard-lens-panel`, which **does not exist in the DOM** (the panel renders only for LSS). The LSS panel also `aria-labelledby="lens-tab-lss"` — fine — but the Library tab claiming to control a non-existent panel is a broken ARIA reference that screen readers expose as a dead relationship. Hurts the navigation goal for AT users.
**Fix sketch:** only set `aria-controls` on a tab when its panel is actually rendered (i.e. on the LSS tab, and only while LSS is active), or render a persistent (possibly empty/`hidden`) panel element with that id. Wiring-only.

### 6. Lens tabs use selection-follows-focus → arrow key triggers full column/sort swap — **P1 (a11y + perf)**
**File:** `LensSwitcher.tsx:42-49` (`focusTab` calls `onLensChange` on every arrow move)
Arrow-key navigation across the tablist both moves focus **and** activates the lens (`onLensChange`). In the shell, `handleLensChange` (`DashboardV2Shell.tsx:548`) swaps the visible column pack, the sort, and emits a `dashboard_lens_changed` analytics event. So a user arrowing across two tabs to *read* labels involuntarily reconfigures the entire table and fires analytics. ARIA permits selection-follows-focus, but it is the wrong choice when activation is expensive/destructive.
**Fix sketch:** move focus with the arrow keys (roving tabindex) but **activate only on Enter/Space/click**. Decouple `focusTab` (focus only) from activation. Wiring-only.

### 7. `aria-modal="true"` dialog has no focus trap despite JSDoc claim — **P1 (a11y / navigation)**
**File:** `ColumnPicker.tsx:27-31` (JSDoc says "focus trap") vs `:603-613` (focus-on-open + return-on-close only; no Tab-cycle containment)
The drawer is `role="dialog" aria-modal="true"` but Tab focus can escape to the page behind it; there is no `Tab`/`Shift+Tab` wrap at the first/last focusable element. For a modal this is a real keyboard-navigation defect, and the comment overstates the behavior.
**Fix sketch:** add a focusable-boundary trap (query focusable children, wrap on Tab at the ends) or render the drawer with an inert backdrop. Self-contained wiring change. (Escape dismiss + focus return are already correct.)

### 8. Whole `<tr>` is the click target and wraps nested interactives; Space opens kebab — **P1 (a11y + navigation surprise)**
**File:** `WorkflowRow.tsx:897-908` (`<tr onClick tabIndex={0}>`) containing the kebab `<button>` (`:1148`), the health-cell click-toggle (`:1057`), and the inline edit `<input>` (`:509`).
The row is a clickable, focusable element that *contains* multiple independently-interactive controls. `e.stopPropagation()` is sprinkled on the children to stop double-firing, but the pattern is fragile (nested interactive in a clickable container) and `handleRowKeyDown` maps **Space → open kebab** (`:859`) — an unconventional binding (Space usually activates the focused control, not a sibling menu). For at-a-glance scanning + keyboard navigation this is a frequent foot-gun.
**Fix sketch:** make the **name cell** the single navigational affordance (a `<Link>`/button to `/workflows/:id`) rather than the whole `<tr>`; drop `onClick`/`tabIndex` from `<tr>`. Keep kebab/health-cell as their own controls. Re-evaluate the Space binding (let Space activate the focused control). Wiring/markup change, no new infra.

### 9. Health-score cell is click-toggleable but not keyboard-operable; only color/title convey tier — **P1 (a11y)**
**File:** `WorkflowRow.tsx:1055-1141`
The health `<td onClick>` toggles the breakdown tooltip but is a `<td>` with `role="group"` and no `tabIndex`/`onKeyDown` — keyboard users cannot open the breakdown (the existing `useEscapeDispatch` only *closes* it). The colored tier pill is `aria-hidden` and the integer is `aria-hidden`; the accessible name lives only in the cell `aria-label`. At-a-glance this is fine for sighted users, but the breakdown is keyboard-unreachable.
**Fix sketch:** make the tooltip trigger a real `<button>` with `aria-expanded`/`aria-controls` and `onKeyDown` (Enter/Space), or expose the breakdown via a focusable affordance. Wiring/markup.

### 10. `formatCellValue` heuristics can mislabel/mis-scale generic column values — **P2 (honesty-adjacent correctness)**
**File:** `WorkflowRow.tsx:73-100`
The generic cell formatter infers type from the *value shape*: any `number > 1000` is rendered as a **duration** (`Xm Ys`), and a number in `0..100` that "includes a `.`" is rendered as a **percentage**. A legitimate count like `1500` would render as "25m"; an integer percentage like `42` would render as a bare `42` while `42.0` renders `42.0%`. This only affects registry columns rendered through the generic path (today most go through dedicated blocks), but it is a latent honesty/clarity bug as more columns flip `available`.
**Fix sketch:** drive formatting from the column registry's `dataType`/unit metadata (already present — `colDef.dataType` is used for dates at `:1038`) instead of value-shape guessing. Render-only, registry-driven.

### 11. `availableSystems` derived unmemoized over `allWorkflows` every render — **P2 (perf)**
**File:** `DashboardV2Shell.tsx:695` (`const availableSystems = extractSystems(allWorkflows);`)
`extractSystems` builds a `Set` + sort over every workflow on **every** shell render (including each search keystroke, since `searchInput` lives in the shell). Cheap for small N, but it is pure and trivially memoizable.
**Fix sketch:** `const availableSystems = useMemo(() => extractSystems(allWorkflows), [allWorkflows]);` Render-only.

### 12. Two parallel sort-field source-of-truth lists must be hand-kept in sync — **P2 (maintainability)**
**Files:** `WorkflowList.tsx:77-85` (`SortField`), `UnifiedToolbar.tsx:49-57` (`SORT_OPTIONS`), `lenses.ts:66-74` (`LensSortField`), and the literal `field as LensSortField & SortState['field']` casts in `DashboardV2Shell.tsx:570/598`.
The sortable-field union is redeclared in three places plus the toolbar's option list, kept in sync only by casts and a test. Adding a sort column requires edits in 3+ files with no compile-time guarantee they agree.
**Fix sketch:** export one canonical `SortField` union (and ideally one `SORT_OPTIONS` catalog) and import it everywhere; let `LensSortField` be a re-export or `satisfies SortField`. Type-only refactor.

### 13. `<select>` "Active sort" transient option can render a non-token raw field label — **P2 (polish)**
**File:** `UnifiedToolbar.tsx:241-245`
When the active sort isn't in the preset menu (e.g. a column header toggled the alternate direction), the select surfaces `{sort.field} ({sort.dir})` — a raw machine identifier (`date_recorded (asc)`) shown to the user. Minor at-a-glance clarity nit.
**Fix sketch:** map field→label via the canonical catalog from #12 so the transient option reads "Date Recorded (oldest first)". Render-only.

### 14. `exactOptionalPropertyTypes` conditional-spread pattern is used correctly — **(no action; positive note)**
**Files:** `DashboardV2Shell.tsx:882` (`{...(userPlan !== undefined ? { userPlan } : {})}`), `WorkflowList.tsx:743-745`, `UnifiedToolbar.tsx:311`
Optional props are passed via conditional object spread rather than `prop={maybeUndefined}`, which is the correct pattern under `exactOptionalPropertyTypes`. No violations found across the reviewed surface. Keep this pattern.

### 15. Error/loading/empty/sparse handling is robust and honest — **(no action; positive note)**
**Files:** `WorkflowList.tsx` 6-state machine (`:447-769`), `DashboardV2Shell.tsx:737-744` `deriveState`, band suppression (`TopBand.tsx:65`, `RecordedTrendChart.tsx:46`, `LssParetoPanel.tsx:59`).
The state machine cleanly distinguishes `empty` vs `no-results` vs `sparse`; the skeleton has a `SKELETON_MIN_MS` floor to avoid flash; charts honestly suppress below 3 data points instead of drawing misleading slopes; missing values render "—" everywhere. This is good at-a-glance discipline — preserve it.

### 16. Recharts (`RecordedTrendChart`) is the only heavy chart dep on the band — **P2 (bundle)**
**File:** `RecordedTrendChart.tsx:22-30` imports `recharts`.
It is correctly hydration-hardened, but Recharts is a large client dependency loaded on the main dashboard route for a single small weekly bar chart, while the sibling visuals (`HealthGauge`, `OpportunityBar`, `LssParetoPanel`) prove pure SVG/CSS is sufficient and lighter.
**Fix sketch (optional):** consider a pure-SVG bar chart (mirroring `LssParetoPanel`'s approach) to drop Recharts from the critical dashboard bundle, or `next/dynamic` it. Not urgent; bundle-only.

---

## Confirmed-clean (explicitly checked, no issue)

- **Hydration:** no `Date.now()`/`Math.random()`/locale/timezone in any *rendered* output that risks mismatch. `density.ts` + `lens.ts` use the correct SSR-safe deferred-read hook. `useId()` pins all SVG/Recharts gradient ids. Dates render via UTC `formatDate`/`formatWeekTick`. The one in-render `toLocaleDateString` is in the dead v1 branch and guarded by `suppressHydrationWarning` (finding #2).
- **Determinism:** `pareto.ts` and `lenses.ts` are pure (no clock/random/I/O, stable id-tiebreak sorts). `sortWorkflows` has a stable id tiebreak (`WorkflowList.tsx:137`). `route.ts` uses a single `referenceNowMs` upstream boundary (server-side; not a hydration concern).
- **Honesty:** "—" for absent values throughout; band/Pareto/narrator suppress rather than fabricate; LSS pack gated to registry-`available` columns; no invented CV/sigma/percentages.
- **A11y positives:** `aria-sort` correctly on `<th>` (not the button); insight chips avoid nested-interactive (separate filter + dismiss buttons); kebab reachable via `group-focus-within`/`focus-visible` (MDR-P06); centralized single Escape dispatch (`useEscapeDispatch`); native `<select>` controls; `aria-live` list announcements.

---

## Ranked Top 8 (delivered in the return summary)
See the agent return message for the ranked candidate list with effort estimates.
