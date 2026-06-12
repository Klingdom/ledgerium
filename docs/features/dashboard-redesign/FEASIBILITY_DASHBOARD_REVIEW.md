# Dashboard Redesign — Technical Feasibility & Data-Availability Review

**Date:** 2026-06-12
**Phase:** Define (no code)
**Author:** system-architect
**Scope:** Bound the dashboard redesign to what can be built cleanly against today's data model and contracts. Per-field source mapping, change sizing, risk, and a sequence that ships the cheap wins first.

---

## 0. TL;DR — what's real today

The single most important data fact for this redesign:

> **There is no run-level table.** Prisma has no `WorkflowRun` / `ProcessRun` / `workflow_runs` model (confirmed: grep `model.*Run` returns nothing in `schema.prisma`). "Runs" is an aggregate **`Int` column** `ProcessDefinition.runCount`. Per-run timestamps, per-run durations, and per-run sequences **do not exist** at query time.

Consequences that constrain every requested feature:

1. **A true "last run" timestamp does not exist.** The column the v2 dashboard labels "Last Run" is wired to `Workflow.lastViewedAt` — a *view* timestamp, not a run timestamp. This is already documented as a known proxy in `accessors.ts:85-97`. Sorting by it is feasible **today** but the label is semantically dishonest and should be either relabeled ("Last Activity") or backed by a real field before it claims "Last Run".
2. **"Case Volume" and "Runs" are the same number.** Both `run_count` and `case_volume` accessors return `ctx.metricsV2.runs`, which resolves to `ProcessDefinition.runCount` (`accessors.ts:103-105`, `141-143`; `workflow-metrics.ts:227-240`). Offering both as distinct sort fields would mislead users — they sort identically.
3. **Cycle Time is an aggregate mean, not a distribution.** `avgTimeMs` = `ProcessDefinition.avgDurationMs` (fallback `medianDurationMs`, then `Workflow.durationMs`) — `workflow-metrics.ts:251-264`. There is **no array of per-run durations**, so a true cycle-time histogram is **not computable** from the existing API; only a single mean/median scalar per workflow exists.

The redesign should therefore propose: (a) the 5 sort fields + Date Recorded as quick wins (4 of 6 are clean; 2 carry honesty caveats), (b) top-of-page KPI/coverage graphics that ride the existing `stats` payload, and (c) defer any true per-run visualization (real histogram, real activity timeline) behind a Path C R+1 `metric_fact` / `process_run_snapshot` build — which is already planned in `SNAPSHOT_TABLE_DECISION.md`.

---

## 1. Sort fields — source, existence, change required

The v2 list (`WorkflowList.tsx`) currently sorts **client-side** over already-fetched rows. Its `SortField` union is exactly three values (`WorkflowList.tsx:65`):

```
type SortField = 'health_score' | 'name' | 'opportunity';
```

`sortWorkflows()` (`WorkflowList.tsx:81-97`) is a pure in-memory comparator over `WorkflowRowData`. It does **not** call the API on sort change (only emits a `dashboard_v2_sort_changed` analytics event, `WorkflowList.tsx:306-316`).

Important architectural note: the route (`route.ts:367-374`) has a **separate, unused-by-v2** server-side `orderBy` whitelist (`title`, `step_count`, `last_viewed`, `views`, `confidence`, `duration`, `created_at`). The v2 dashboard ignores it and sorts client-side. **Two valid implementation paths exist for new sorts:**

- **Path SORT-A (client-side, recommended for the 5 quick-win fields):** extend `WorkflowList.SortField` + the `sortWorkflows()` comparator + add `SortButton` headers. Reuses the registry accessor for value derivation. No API change, no Prisma change. Correct when the value is already present on `WorkflowRowData` / `metricsV2` (all 5 requested fields are). Caveat: client-side sort only orders the rows already returned; if pagination is ever added server-side this must move to Path SORT-B. Today the route returns the full set (`findMany` with no `take`, `route.ts:379-387`), so client-side sort is complete and correct.
- **Path SORT-B (server-side `orderBy`):** add a case to the `orderByField` map (`route.ts:367-374`) + a `SortField`→`sort` param wire-through. Only worth it for fields backed by a real indexed Prisma column. Of the requested fields, only **Date Recorded** (`createdAt`, already indexed `schema.prisma:129`) is a clean server-side candidate.

### Per-field verdict

| Sort field | Exact source field | Exists today? | Registry entry | Accessor wired? | Cleanest path | Effort |
|---|---|---|---|---|---|---|
| **Runs** | `WorkflowMetricsOutput.runs` ← `ProcessDefinition.runCount` (`workflow-metrics.ts:227-240`) | ✅ Yes | `run_count` (`registry.ts:131-143`, `sortable: true`) | ✅ `accessRunCount` (`accessors.ts:103-105`) | SORT-A: add `'runs'` to `SortField`, comparator reads `a.metricsV2.runs ?? -1` | **S** |
| **Cycle Time** | `WorkflowMetricsOutput.avgTimeMs` ← `ProcessDefinition.avgDurationMs` (`workflow-metrics.ts:251-264`) | ✅ Yes (mean scalar only) | `cycle_time_ms` (`registry.ts:146-158`, `available`) + `cycle_time_mean_ms` (default-visible since iter-067) | ✅ `accessCycleTimeMs` (`accessors.ts:119-121`) | SORT-A: comparator reads `a.metricsV2.avgTimeMs ?? Infinity` (nulls last) | **S** |
| **Last Run** | `Workflow.lastViewedAt` (**proxy — NOT a run timestamp**) | ⚠️ Proxy only | `last_run_at` (`registry.ts:118-130`) | ✅ `accessLastRunAt` (`accessors.ts:95-97`) returns `ctx.lastViewedAt` | SORT-A works **mechanically**; **honesty gate required** (see §1.1) | **S** (sort) / **M** (if relabel + real field) |
| **Date Recorded** | `Workflow.createdAt` (`schema.prisma:105`, indexed `:129`) | ✅ Yes | ❌ **Not in registry** (no `date_recorded` key) | ❌ none | SORT-A **+ new registry column** (see §2); OR SORT-B server `createdAt` orderBy | **S** |
| **Case Volume** | `WorkflowMetricsOutput.runs` ← `ProcessDefinition.runCount` (**identical to Runs**) | ⚠️ Duplicate of Runs | `case_volume` (`registry.ts:185-197`, `available`) | ✅ `accessCaseVolume` (`accessors.ts:141-143`) — same value as `accessRunCount` | SORT-A trivially works, but **see §1.2: do not ship as a distinct sort** | **S** (but recommend NOT shipping) |

### 1.1 "Last Run" — the timestamp honesty problem (must-resolve)

There is **no true last-run timestamp** in the data model. Options, cheapest first:

- **Option L1 (relabel, S):** Keep wiring to `lastViewedAt`, **rename the column/sort to "Last Activity"** and update `registry.ts:118-130` label + description + the accessor doc. Honest, zero new data. Recommended for the quick-win phase.
- **Option L2 (derive a real proxy, M):** Use `Workflow.updatedAt` (`schema.prisma:106`, `@updatedAt`) instead of `lastViewedAt`. `updatedAt` changes when the workflow record is re-processed/edited — closer to "last run" than "last view" but still not a run timestamp. Requires adding `updatedAt` to the response (it is already on the row via spread `route.ts:499`) + a new accessor. Marginal honesty gain; not recommended over L1.
- **Option L3 (real last-run field, L):** Add `Workflow.lastRunAt DateTime?` populated at ingest, OR build the run-snapshot table (Path C R+1, `SNAPSHOT_TABLE_DECISION.md §2.2`). This is the only path to a *true* "Last Run". Defer to the deeper-redesign phase.

**Recommendation:** ship L1 (relabel "Last Activity") in the quick-win phase. Reserve "Last Run" as a label for when L3 lands.

### 1.2 "Case Volume" — undefined-as-distinct (flag)

"Case Volume" is **not independently defined** in today's data: its accessor returns the identical value as Runs (`ProcessDefinition.runCount`). In process-mining terms, *case volume* = number of cases (process instances) = number of runs, so this is actually **correct** — they *are* the same metric under a single-grain model. Shipping both as separate sort fields would produce two columns/sorts that always agree, which reads as a bug.

**Recommendation:** Pick **one** label. Either keep "Runs" (operational framing) or rename to "Case Volume" (process-mining framing), but do not surface both as distinct sortable columns until a future model distinguishes *cases* from *runs* (e.g. multi-instance cases). Flag in the redesign PRD as a naming decision, not a data gap.

### 1.3 Net: of 5 requested sorts, 3 are clean, 2 carry caveats

- **Clean (S):** Runs, Cycle Time, Date Recorded.
- **Caveat — relabel before ship:** Last Run → "Last Activity" (L1).
- **Caveat — do not ship as distinct:** Case Volume (duplicate of Runs).

---

## 2. Date Recorded column — confirm the wiring

`createdAt` is the cleanest possible addition: it is a required, indexed `DateTime` already present on every row and already spread into the API response (`route.ts:499` `...workflowBase`). The only reason it is not sortable/visible today is that **no registry column exists for it**.

Exact changes (Define-level enumeration, no code):

1. **`types.ts:75-120`** — add `'date_recorded'` to the `ColumnKey` closed union (Layer/display group; this is a `display`-group column, not an architecture metric). *Note: extending `ColumnKey` is a closed-union change that `registry.test.ts` exhaustiveness assertions will force you to handle — see §4.*
2. **`accessors.ts`** — add `accessDateRecorded: ColumnAccessor<string> = (ctx) => ctx.createdAt` (the context already carries `createdAt: string`, `types.ts:224`). Add to `AVAILABLE_ACCESSORS` (`accessors.ts:166-177`). It is a **lifetime accessor** — ignores `referenceNowMs`/`activeTimeRange`, so it satisfies the Group G lifetime-preservation contract automatically.
3. **`registry.ts`** — add the entry: `dataType: 'date'`, `availability: 'available'`, `sortable: true`, `filterable: true`, `defaultVisible: false` (do not auto-add to the 7-col default pack without a UX call), `defaultGroup: 'display'`, `accessor: accessDateRecorded`.
4. **`index.ts:29-41`** — re-export `accessDateRecorded` from the barrel.
5. **`WorkflowList.tsx`** — `createdAt` renders via the existing generic dynamic-header path (`WorkflowList.tsx:461-472`) automatically once it is in `visibleColumns`; for **sort**, add `'date_recorded'` to `SortField` (`:65`) + a comparator branch reading `new Date(a.createdAt).getTime()`. `WorkflowRow` cell rendering uses the registry accessor (already generic).

**Effort: S.** No Prisma change, no API change, no migration. This is the lowest-risk item in the whole redesign and should land first.

---

## 3. Top-of-page graphics — feasibility per candidate

Charting lib: **Recharts `^3.8.1` is already a web-app dependency** (`apps/web-app/package.json:38`) and is already used in the admin operations dashboard (Recharts gradient `useId()` fix shipped iter-073). No new dependency needed. `date-fns` is **not** a web-app dep (it is used elsewhere in the monorepo) — avoid pulling it into render paths; format dates with a pure helper.

**Determinism / hydration rules for all charts (hard requirements):**
- Charts must be **client components** (`'use client'`) and SVG-based (Recharts renders SVG). Do not server-render chart internals that depend on viewport/animation.
- **No `Date.now()` / `Math.random()` / `new Date()` in render.** Any "now"-relative computation (e.g. "this week") must be computed **server-side** from the single `referenceNowMs` boundary (`route.ts:433`) and passed down as data — exactly the pattern already enforced across the v2 surface (MDR-P03). Recharts auto-generates internal IDs; pin chart `id`s explicitly to avoid the gradient-collision class of bug fixed in iter-073 (`useId()` per instance).
- Disable chart entrance animation (`isAnimationActive={false}`) for the flash-safety smoke and for deterministic snapshot tests.

| Visualization | Data needed | Available in `/api/workflows stats` today? | Change required | New endpoint? | Effort |
|---|---|---|---|---|---|
| **KPI tiles** (Total workflows, Recorded this week/month, Needs review, SOP ready, Avg confidence, Avg cycle time, Optimization opps, AI opportunity count) | scalars | ✅ **All already present** in `stats`: `totalWorkflows`, `recordedThisWeek`, `recordedThisMonth`, `needsReview`, `sopReady`, `avgConfidence`, `avgDuration`, `optimizationOpportunities`, `aiOpportunityCount`, `staleCount`, `favoriteCount` (`route.ts:687-717`) | **None** — pure presentational tiles over existing payload | No | **S** |
| **Health donut** (portfolio health composition / band distribution) | `portfolioHealthScore` (single 0-100) is present (`route.ts:707`); a **band breakdown** (count of healthy / needs-review / high-variation) is **partially** present (`needsReview` exists; "healthy" count is not a stat) | ⚠️ Partial | Either (a) render donut from `portfolioHealthScore` + derive bands client-side from the already-returned `workflows[]` array (each row has `metricsV2.healthScore.overall`), OR (b) add a `healthBandCounts` object to `stats` server-side (small, ~10 LOC in the stats block) for cleanliness | No (option a) / No, same endpoint (option b) | **S–M** |
| **Cycle-time mini-histogram** | a **distribution of run durations** | ❌ **NOT available** — only per-workflow mean scalar exists (`avgTimeMs`); no per-run duration array | Two honest options: (a) **portfolio histogram across workflows** — bucket each workflow's `avgTimeMs` into duration bins (computable client-side from `workflows[].metricsV2.avgTimeMs`); this is a histogram of *workflow means*, not of runs — label it accordingly; OR (b) **true per-run histogram** → requires Path C R+1 `process_run_snapshot` (out of scope, **L**) | No (option a) / Yes — new metric_fact/snapshot persistence (option b, deferred) | **S** (option a, honestly labeled) / **L** (option b) |
| **Activity sparkline** (workflows recorded over time) | a **time series of created/updated counts** | ❌ Not in `stats` (only `recordedThisWeek` / `recordedThisMonth` point-in-time counts) | The raw material exists — every row carries `createdAt`. Two paths: (a) **client-side bucketing** of the returned `workflows[].createdAt` into N day/week buckets (deterministic if buckets derive from server `referenceNowMs`); OR (b) add a `recordedTimeSeries: {bucketStartMs, count}[]` to `stats` computed server-side from `referenceNowMs` (cleaner, keeps "now" off the client). Option (b) recommended for determinism. | No, same endpoint (recommended option b) | **S–M** |
| **Systems coverage** (top systems by workflow count) | `stats.systemCoverage: {system, workflowCount}[]` | ✅ **Already present and sorted desc** (`extractSystems`, `route.ts:266-288`, `:658`, `:703`) | **None** — feed directly into a horizontal bar chart | No | **S** |

### 3.1 Graphics summary

- **3 of 5 candidates ride the existing payload with zero API change:** KPI tiles, systems-coverage bar, and (with client-side band derivation) the health donut.
- **2 need a small same-endpoint addition for cleanliness/determinism:** health-band counts and the activity sparkline time-series. Both are ~10-30 LOC additions inside the existing `stats` block — **no new endpoint**. Strongly prefer server-side computation over client-side "now"-bucketing to keep determinism.
- **1 candidate is data-blocked:** a *true* cycle-time histogram needs per-run durations (Path C R+1). A portfolio histogram of workflow-mean durations is an honest S-effort substitute that should be labeled "distribution of average cycle time across workflows," not "run cycle-time distribution."

**No new endpoint is required for any top-of-page graphic** in the recommended option set. Everything rides `/api/workflows` `stats`.

---

## 4. Risk / effort + contracts that must not break

### Tests & contracts at risk

| Surface | What it asserts | Risk from this redesign |
|---|---|---|
| **`registry.test.ts`** | Frozen catalog; **closed-union exhaustiveness** (`Exclude<ColumnKey, ...> extends never`); audit-honesty IFF (`accessor !== null IFF availability === 'available'`); label ≤24 chars, description ≤80 chars; key uniqueness; Tier-A count; **Group G lifetime-preservation** (existing accessors return identical values across two `referenceNowMs` × two `activeTimeRange`) | **HIGH attention.** Adding `date_recorded` to `ColumnKey` forces updates to exhaustiveness assertions and any per-key enumeration counts. New accessor must satisfy IFF (set `availability: 'available'` + non-null accessor) and Group G (must be lifetime — `createdAt`/`lastViewedAt` are, so OK). Label "Last Activity" (≤24) and any new description (≤80) must respect budgets. **Mitigation: any new column is a registry-test-first change.** |
| **`WorkflowList.test.tsx`** | `applyFilters` determinism with injected `nowMs`; sort comparator behavior; state machine; `totalColCount` colspan math (`WorkflowList.tsx:336`) | **MEDIUM.** New `SortField` values + comparator branches need new test cases. `totalColCount` is derived from `dynamicHeaderKeys.length` — adding default-visible columns shifts colspan in empty/error rows; existing colspan assertions may need updating. |
| **`route.test.ts`** | `stats` shape; determinism via `referenceNowMs`; MDR-P05 single-source-of-truth (deletion locks); UTC month boundary (MDR-P04) | **MEDIUM** *only if* stats gains `healthBandCounts` / `recordedTimeSeries`. Additive fields are safe (response is additive-only per existing convention), but the new time-series MUST derive from `referenceNowMs` (not a fresh `Date.now()`) or it breaks the determinism tests. No existing field semantics change. |
| **Flash-safety smoke** (`globals.css` color-token lint + render smoke) | No `Date`/random in render; client-only charts; color tokens (the recent `lint-color-tokens.mjs` + shared severity/impact components) | **MEDIUM.** New chart components must use design-system color tokens (`SeverityPill` / `ImpactBadge` / `--content-*` vars), not raw hex, or trip the color-token lint. Charts must be client components with animation disabled for the smoke. |
| **`presets.ts` / `presets.test.ts`** | Preset chips reference `ColumnKey`s + module-level exhaustiveness lock | **LOW.** Adding a `ColumnKey` may trip the preset exhaustiveness lock if presets enumerate all keys; verify the new key is handled or excluded. |
| **`persistence.ts` / migration** | Versioned schema; dropped-key graceful degradation | **LOW.** Adding a column is additive; existing saved views without the new key degrade gracefully (the persistence layer already drops/ignores unknown keys). No migration needed to *add* a column. |

### Effort ladder

| Change | Effort | Notes |
|---|---|---|
| Date Recorded column (registry + accessor + sort) | **S** | Lowest risk; registry-test-first |
| Runs / Cycle Time / Last-Activity sort fields | **S** | Client-side comparator extension; values already on `metricsV2` |
| "Last Activity" relabel (honesty fix) | **S** | Label + description + accessor doc only |
| Case Volume sort | **S to skip** | Recommend NOT shipping as distinct (duplicate of Runs) |
| KPI tiles + systems-coverage bar + health donut (client-derived bands) | **S** | Zero API change |
| `stats.healthBandCounts` + `stats.recordedTimeSeries` (server, determinism-clean) | **M** | Additive `stats` fields; must use `referenceNowMs` |
| Activity sparkline + portfolio cycle-time histogram (charts) | **M** | Recharts client components, animation off, pinned ids |
| True "Last Run" timestamp (`lastRunAt` field or run table) | **L** | Path C R+1 / new ingest write; deferred |
| True per-run cycle-time histogram | **L** | `process_run_snapshot` (`SNAPSHOT_TABLE_DECISION.md §2.2`); deferred |

---

## 5. Recommended implementation sequence

Sequence is ordered by (value ÷ risk), front-loading contained registry+sort changes before any chart work, and deferring everything that needs a new data tier.

### Phase 1 — Quick wins (contained registry + sort; no API/Prisma change)
Single Mode 2 / small Mode 1 iteration, registry-test-first:

1. **Date Recorded column** — `ColumnKey` + accessor + registry entry + barrel re-export + `SortField` branch (§2). *Closes the cleanest gap; exercises the registry-extension path that every later column reuses.*
2. **Five sort fields** in one comparator extension (§1): `runs`, `cycle_time` (avgTimeMs), `date_recorded`, **`last_activity`** (relabeled from "Last Run" per L1), and a **decision** on Case Volume (recommend: do not add as distinct; document the Runs≡CaseVolume equivalence in the PRD).
3. **"Last Run" → "Last Activity" honesty relabel** (`registry.ts:118-130`) shipped in the same iteration so the sort never claims a run timestamp it doesn't have.

Gate: `registry.test.ts`, `WorkflowList.test.tsx`, `route.test.ts` green; colspan assertions updated; color-token lint clean.

### Phase 2 — Top-of-page graphics (rides existing `stats`; additive)
2a. **Zero-API-change visuals first:** KPI tiles + systems-coverage horizontal bar + health donut (bands derived client-side from returned `workflows[]`). All Recharts client components, `isAnimationActive={false}`, pinned ids, design-system color tokens.
2b. **Then the two additive `stats` fields** (`healthBandCounts`, `recordedTimeSeries`) computed server-side from `referenceNowMs`, unlocking a clean health donut and the activity sparkline without client-side "now" math.
2c. **Portfolio cycle-time histogram** of `avgTimeMs` across workflows — honestly labeled as a distribution of workflow means, not runs.

Gate: route-determinism tests pass with new additive fields sourced from `referenceNowMs`; flash-safety smoke passes with charts mounted.

### Phase 3 — Deeper redesign (needs a new data tier; defer)
3a. **True "Last Run" timestamp** — add `Workflow.lastRunAt` populated at ingest OR adopt `process_run_snapshot` (Path C R+1). Then re-promote the "Last Run" label and back the sort with a real run timestamp.
3b. **True per-run cycle-time histogram** + real activity timeline — built on `metric_fact` / `process_run_snapshot` per `SNAPSHOT_TABLE_DECISION.md`. This is the only path to genuine distribution/timeline visuals.

---

## 6. Open decisions for the redesign PRD (not data gaps — naming/scope calls)

1. **Last Run vs Last Activity label** — recommend "Last Activity" until a real run timestamp lands (§1.1).
2. **Runs vs Case Volume** — pick one label; do not ship both as distinct sortable columns while they share a source (§1.2).
3. **Default-pack composition** — should Date Recorded join the 7-column default pack, or stay picker-only (`defaultVisible: false`)? UX call; defaulting to picker-only avoids shifting `totalColCount` for all users.
4. **Stats additivity** — confirm `healthBandCounts` + `recordedTimeSeries` are acceptable additive `stats` fields (they are backward-compatible; existing consumers ignore unknown keys).
5. **Cycle-time histogram framing** — accept the workflow-mean histogram as the Phase-2 deliverable with an honest label, or hold the histogram entirely until Path C R+1 per-run data.

---

## Appendix — file/line reference index

- Workflows query + `stats` shape: `apps/web-app/src/app/api/workflows/route.ts:292-719` (stats block `:572-717`, `referenceNowMs` boundary `:433`, server orderBy whitelist `:367-374`, Prisma includes `:382-386`).
- Prisma models: `apps/web-app/prisma/schema.prisma` — `Workflow` `:88-133` (createdAt `:105` indexed `:129`, updatedAt `:106`, lastViewedAt `:103`); `ProcessDefinition` `:259-302` (runCount `:265`, avgDurationMs `:267`, medianDurationMs `:268`). **No run-level model exists.**
- Column registry: `apps/web-app/src/lib/dashboard-columns/types.ts` (`ColumnKey` `:75-120`, `ColumnAccessorContext` `:216-259`), `registry.ts` (display cols `:66-143`, Tier A `:146+`), `accessors.ts` (`accessLastRunAt` proxy note `:85-97`, `accessCaseVolume`≡`accessRunCount` `:103-105`/`:141-143`, `AVAILABLE_ACCESSORS` `:166-177`), `index.ts` (barrel + helpers).
- v2 list sort: `apps/web-app/src/components/dashboard-v2/WorkflowList.tsx` (`SortField` `:65`, `sortWorkflows` `:81-97`, `applyFilters` `:101-172`, dynamic headers `:430-473`, `totalColCount` `:336`).
- Metrics output: `apps/web-app/src/lib/workflow-metrics.ts` (`WorkflowMetricsOutput` `:166+`, `computeRuns` `:227-240`, `computeAvgTimeMs` `:251-264`).
- Adapter: `apps/web-app/src/lib/metrics-input-adapter.ts:106-162`.
- Charting: Recharts `^3.8.1` confirmed at `apps/web-app/package.json:38`. `date-fns` NOT a web-app dep.
- Snapshot/persistence architecture for deferred per-run work: `docs/features/dashboard-v3-metrics-engine/SNAPSHOT_TABLE_DECISION.md`.
