# Analytics Review — At-a-Glance KPIs + Navigation/Comprehension Instrumentation

**Date:** 2026-06-15
**Phase:** Define / Analysis only — NO product code changes
**Author:** Product-analytics specialist
**Goal:** ONE thing — increase user understanding *at a glance* and make navigation *obvious* — viewed through the lens of (a) WHICH honest signals to surface at the top of the page and (b) HOW to instrument comprehension + navigation so we can prove it works.

**Scope grounding (real code read):**
- `apps/web-app/src/app/(app)/dashboard/page.tsx`, `components/dashboard-v2/*` (CommandHeader, DashboardV2Shell, WorkflowList, WorkflowRow, UnifiedToolbar, ColumnPicker, PresetChipRail, LensSwitcher, LssParetoPanel, `band/*`)
- `lib/dashboard-band-stats.ts`, `lib/dashboard-lenses/{lenses,pareto}.ts`, `lib/dashboard-columns/*`, `app/api/workflows/route.ts`, `lib/analytics.ts`
- Screenshots: `public/docs/screenshots/dashboard-list.png` (Library lens), `dashboard-lss.png` (Measure & Analyze lens)

**Relationship to the prior review:** `docs/features/dashboard-redesign/ANALYTICS_DASHBOARD_REVIEW.md` (2026-06-12) drove **Batch B** — the top-of-page band that is now SHIPPED. Since then a **lens switcher** (`library` / `lss`) plus a Pareto panel shipped (2026-06-15). This review measures the CURRENT state against the at-a-glance goal and identifies the residual gaps the prior review could not see — chiefly **lens/navigation comprehension instrumentation** and **a few honest aggregates still hidden in the engine**.

---

## 0. EXECUTIVE SUMMARY — what's shipped, what's missing

**Already shipped and good** (verified in code):
- Top band: 4 KPI tiles (Total Workflows · Median Cycle Time · Automation Candidates · Avg Health Score) + Health gauge + Opportunity-mix bar + "Workflows recorded per week" trend + a one-line Narrator sentence. All computed server-side from a single `referenceNowMs` boundary (`dashboard-band-stats.ts`), hydration-safe, honesty-labeled (only Avg Health shows a delta; "across N workflows" provenance on cycle time).
- Lens switcher with two lenses: **Library** (today's list, zero regression) and **Measure & Analyze (LSS)** (cycle-time/run column pack + a Pareto "where your time goes" panel). The Pareto is honesty-clean: "total observed time = mean × N", excludes null/zero-run workflows, attaches `· N runs`.

**The biggest remaining gap is NOT more KPIs — it is comprehension/navigation instrumentation.** The dashboard now has *three navigation surfaces stacked* (KPI tiles → opportunity segments → lens switcher → preset chips → column picker → sort → filters → row open). We can measure tile clicks, opportunity-segment clicks, lens changes, sort, and filter — but we CANNOT measure: preset chip applies (on v2), column-picker opens, LSS-Pareto bar clicks, empty-state CTA clicks, or a single end-to-end "land → understand → navigate" funnel. **We are surfacing comprehension aids we cannot prove are understood.**

**Top priority:** close the navigation-instrumentation gaps (§4) and stand up the comprehension funnel (§5), then add the 2-3 honest aggregates still hidden in the engine (§3).

---

## 1. CURRENT AT-A-GLANCE STATE (from the screenshots + code)

### 1.1 What reads at a glance today (Library lens — `dashboard-list.png`)
The top band gives a genuine "instantly legible" answer to four questions:
1. **How big is my library?** → `16` Total Workflows, `+16 recorded this month`.
2. **How long do things take?** → `25s` Median Cycle Time, `across 16 workflows` (honest provenance).
3. **Where can I automate?** → `0` Automation Candidates `of 16 workflows`.
4. **Is the library healthy?** → `88` Avg Health Score + gauge + `— vs last 30d`.

Plus the Opportunity Mix bar (`Healthy 16`) and the weekly recording trend. This is a strong at-a-glance baseline.

### 1.2 What does NOT read at a glance yet
- **Provenance is inconsistent across tiles.** "across 16 workflows" appears on cycle time but the Automation Candidates tile says "of 16 workflows" — and neither says how many of those workflows actually have *runs* behind them. With a sample where every workflow is "Approve Expense Report (Sample)" at ~5 runs (see `dashboard-lss.png`), the user cannot tell "16 workflows" from "16 recordings of one workflow." (Honest, but not self-explanatory.)
- **The delta is empty** (`— vs last 30d`) because the prior 30-day cohort has < 3 workflows. Correct behavior, but the tile shows a dash with no explanation of *why* — a hover/tooltip "needs ≥3 workflows in the prior period" would make the absence legible.
- **"High-variance" is computed but not surfaced as a tile.** `highVariationCount` flows into the Narrator sentence ("3 have high variation — consider standardizing") but there is no scannable number for it in the KPI strip. It is one of the most decision-relevant signals (drives the Standardize action) yet it is buried in prose.
- **Recently-changed / drift is invisible.** The route surfaces `lastRunAt` (a `processDefinition.updatedAt` proxy) per row, and the engine computes `documentationDrift`, but there is no "N changed this week" or "N drifted from SOP" aggregate at the top.

### 1.3 Measure & Analyze lens (`dashboard-lss.png`)
The Pareto reads well: "**12 of 16** workflows account for ~80% of total observed time — the vital few", `18m 46s total observed time`, with `· N runs` on each row. This is exactly the right honesty posture (observed time, N attached, vital-few framed). Two at-a-glance gaps:
- The **bars are unlabeled on the x-axis** in the screenshot (every row is the same sample title) — the Pareto's value is the *ranking*, but without distinct titles a user can't act. This is a fixture artifact, not a code bug, but the empty/degenerate case (all-identical totals) should be detectable.
- The lens switch itself is **not obviously a navigation primitive** — "Library / Measure & Analyze" reads like tabs but there is no affordance hint that the column pack + sort + panel all change. (Comprehension risk — measure it, see §5.)

---

## 2. THE HONEST AT-A-GLANCE KPI SET (recommended top-of-page numbers)

Principle: every number must be (a) computable TODAY from `GET /api/workflows` `stats` or the per-workflow array, (b) **observed-only** — NO DPMO, sigma, Cp/Cpk, CV, takt, cost, or time-saved, and (c) carry a "based on N" provenance where N < the library size. Proxies are labeled as proxies.

### 2.1 Tier-1 KPI tiles (KEEP — already shipped, refine provenance)

| # | Tile | Value source | Provenance line (recommended) | Honesty note |
|---|---|---|---|---|
| 1 | **Total Workflows** (hero) | `stats.totalWorkflows` | `+N recorded this month` (shipped) | Clean count. |
| 2 | **Median Cycle Time** | `computeMedianCycleTimeMs(metricsV2.avgTimeMs[])` | **`median across N timed workflows`** (tighten: only count non-null cycle times, not all 16) | Median across **workflow means**, not runs — NOT a per-run median. Label exactly "across workflows". |
| 3 | **Automation Candidates** | `stats.aiOpportunityCount` (opportunityTag = `automate`) | `of M workflows` (shipped) | `aiOpportunityScore` is a **proxy** (step count × duration × tools). NOT ROI. Tooltip must say "candidacy, not value." |
| 4 | **Avg Health Score** | `stats.portfolioHealthScore` | `±D vs last 30d` (only real delta) | Mean of deterministic per-workflow scores — the single most defensible aggregate. |

### 2.2 Tier-1 ADD — the one missing scannable number

| # | Tile | Value source | Provenance | Why it earns a slot |
|---|---|---|---|---|
| 5 | **High-Variance Workflows** | client count of `metricsV2.variationScore > 0.7` (already computed into `highVariationCount`) | **`of K multi-run workflows (N≥2)`** | This is the **Standardize** decision trigger and the most actionable LSS signal. It is in the Narrator prose but not scannable. Gate the denominator to runs ≥ 2 (variation is undefined for a single run) and label so. **Effort: S** (data already in band-stats + narrator input). |

### 2.3 Tier-2 secondary stats row (small, below the tiles — KEEP scannable, not hero)

All available in `stats` today; surface as a compact "library facts" row, NOT as hero tiles:
- **Total runs across library** = client sum of `metricsV2.runs` (the honest denominator behind everything — answers "16 workflows = how much evidence?").
- **Distinct systems** = `stats.systemCoverage.length` (+ top-1 system name).
- **Needs review** = `stats.needsReview` (healthStatus needs_review OR high_variation) — links to the Needs-Attention preset.
- **Recorded this week** = `stats.recordedThisWeek` (activation pulse, finer than "this month").

### 2.4 Tier-3 / DEFER (honest but not at-a-glance)
- **Stale count** (`stats.staleCount`) — a re-engagement trigger, belongs in messaging not the KPI band.
- **SOP-ready** (`stats.sopReady`) — secondary; keep in a "library facts" tooltip, not a tile.
- **Avg maturity / avg confidence / cognitive burden** — NOT calibrated for headline display (per prior review §6); keep row-level only.

### 2.5 Opportunity Mix bar (KEEP — shipped, it is the best navigation aggregate)
The stacked Opportunity bar doubles as a **filter control** (`onSegmentClick`). This is the single most valuable at-a-glance-to-navigation bridge on the page: a user sees the mix AND clicks to drill in. Preserve and instrument fully (already has `dashboard_opportunity_segment_clicked`).

### 2.6 Computed-but-HIDDEN engine signals that could become honest aggregates

| Signal | Where it lives today | At-a-glance candidate | Honesty / effort |
|---|---|---|---|
| `variantCount` per workflow | `metricsV2.variantCount` (route), used in Pareto variation strip | "N workflows have ≥2 execution variants" — a Standardize signal | Honest at runs ≥ 2 only; **portfolio average is NOT meaningful** (per prior §6 reject). Surface as a COUNT, never an average. **Effort: S.** |
| `documentationDrift` | intelligence engine; `processDefinition.intelligenceJson` | "N workflows drifted from their SOP" | Plumbed via `parseIntelligenceJson` but **not yet in `stats`** — needs a small route addition to aggregate. Label "drifted from documented path." **Effort: M** (route aggregate). |
| `sequenceStability` | `WorkflowMetricsInput.intelligence.sequenceStability` | portfolio "% of runs on the standard path" | Plumbed but not exposed in `WorkflowMetricsOutput`/`stats`. **Effort: M.** Honest if gated to multi-run workflows. |
| `lastRunAt` (proxy) | route returns it per row (`processDefinition.updatedAt`) | "**N recently changed** (this week)" aggregate | It is a **proxy for run recency** (updatedAt, not a true `lastRunAt`). Must label "recently changed (approx)". **Effort: S** client-side count. |

**Hard NO (do not surface):** DPMO, sigma level, Cp/Cpk, CV, takt time, hours/cost saved, completion rate as a portfolio KPI, p90 (per-workflow means ≠ per-run distribution). These were correctly excluded by the prior review §6 and remain excluded.

---

## 3. ARE THE CURRENT NUMBERS SELF-EXPLANATORY? (comprehension audit)

| Element | Self-explanatory? | Fix (render-only / wiring) |
|---|---|---|
| Total Workflows `16` `+16 this month` | Yes | — |
| Median Cycle Time `25s` `across 16 workflows` | **Partly** — "16" overcounts; should be "across N *timed* workflows" | Tighten provenance denominator to non-null cycle times. **S** |
| Automation Candidates `0` `of 16` | **Partly** — `0` with no "why" reads as broken | Add a one-line empty hint: "No workflows meet the automate threshold yet" + tooltip on the proxy nature. **S** |
| Avg Health `88` `— vs last 30d` | **No** — the dash is unexplained | Tooltip: "Delta needs ≥3 workflows in the prior 30d." **S** |
| Opportunity Mix `Healthy 16` | Yes (legend + counts) | — |
| Pareto "12 of 16 … vital few" | Yes — strong honesty framing | Detect degenerate all-equal case (identical totals) and soften copy. **S** |
| Lens switcher "Library / Measure & Analyze" | **No** — looks like tabs; doesn't signal that columns+sort+panel change | Add a sublabel/tooltip per lens (descriptions already exist in `LENS_CONFIGS`); MEASURE comprehension via §5 funnel. **S** |
| Narrator sentence | Yes — built only from real stats, omits clauses with no data | — (good model for honesty) |

**Net:** the numbers are *honest* but several are **not self-explanatory at the dash level** (empty deltas, proxy tiles, overcounted denominators). All fixes are render-only copy/tooltip/provenance — no new data.

---

## 4. INSTRUMENTATION GAPS — navigation events MISSING vs. `analytics.ts` today

### 4.1 What IS instrumented (verified wired in code)
| Event | Fired from | Captures |
|---|---|---|
| `dashboard_v2_viewed` | DashboardV2Shell:355 | load + `workflowCount`, `hasActiveFilters`, `portfolioFilterActive`, `time_range` |
| `dashboard_lens_changed` | DashboardV2Shell:578 | `lens`, `workflowCount` ✅ (good — lens IS instrumented) |
| `dashboard_v2_sort_changed` | WorkflowList:435 | `column`, `direction` ✅ |
| `dashboard_v2_filter_applied` | WorkflowListFilterBar (×4) | `filterType`, `filterValue` ✅ |
| `dashboard_kpi_tile_clicked` | band/KpiTileStrip | `tileId`, `value` ✅ |
| `dashboard_opportunity_segment_clicked` | band/OpportunityBar | `segment`, `count` ✅ |
| `insight_chip_clicked` | InsightsStrip | `severity`, `filterKey` ✅ |
| `workflow_row_clicked` | WorkflowRow:846 | `workflowId`, `elapsedMsSinceDashboardView`, `healthBand` ✅ (this is "row_opened") |
| `dashboard_bounced` | DashboardV2Shell:639 | `workflowCount`, `elapsedMsSinceDashboardView` ✅ |

### 4.2 What is NOT instrumented (the gaps)

| Missing event | Surface that's un-instrumented | Why it matters for navigation/comprehension | Effort |
|---|---|---|---|
| **`preset_view_applied`** on v2 | `PresetChipRail` / `UnifiedToolbar.onApplyPreset` → DashboardV2Shell `handleApplyPreset`. The event EXISTS in taxonomy (`analytics.ts:152`) and is fired on the **old** `dashboard/page.tsx:738` but **NOT on the v2 chip rail.** | Preset chips ("Automation Candidates", "Needs Attention", "Standardize"…) are the single most prominent navigation affordance below the band (see screenshot). We cannot tell if anyone uses them. **Highest-value gap.** | **S** (one `track()` at `handleApplyPreset`) |
| **`dashboard_column_picker_opened`** (new) | `ColumnPicker` open. No event when the picker drawer opens. | Column customization is the headline "configurable metrics" feature; zero usage signal today. Also a comprehension proxy (do users understand they can customize?). | **S** |
| **`dashboard_pareto_bar_clicked`** (new) | `LssParetoPanel` bars. The Pareto is the LSS lens's headline visual but bars don't emit / don't drill into a row. | Measures whether the "vital few" framing drives navigation to the high-leverage workflows — the entire point of the LSS lens. | **S** (event) / **M** (if wiring a drill-through) |
| **`empty_state_cta_clicked`** (new) | `WorkflowList` empty state → "/install" CTA (`WorkflowList.tsx:694`) and CommandHeader activation prompt. | Activation funnel's terminal click is invisible — we can't measure the zero-workflow → install conversion. | **S** |
| **`dashboard_density_changed`** (new) | density toggle (`UnifiedToolbar` / `density.ts`) | Low priority, but a comprehension/ergonomics signal. | **S** |

### 4.3 Two enrichment gaps on EXISTING events (deepen, don't add)
- **`dashboard_v2_viewed` should carry `lens` and `density`.** Today it does not record which lens the user landed on. Without it, every downstream event is un-segmentable by lens — we can't answer "do LSS-lens users navigate differently?" Add `lens` (+ optional `presetActive`) to the existing payload. **Effort: S.**
- **`workflow_row_clicked` should carry the active `lens` and `sortColumn`.** To attribute a row-open to the navigation path that produced it (band tile? opportunity segment? preset? Pareto?), add a lightweight `originSurface` enum. This is what turns the funnel in §5 from counts into attribution. **Effort: S-M.**

### 4.4 Honesty/privacy posture for all new events (PostHog)
- **No workflow content** in any property — `workflowId` (opaque) + taxonomy labels + numeric aggregates ONLY. (Matches the SOP/report instrumentation precedent in `analytics.ts`.) No titles, no system names *as free text* (system filter already uses `filterValue: system` — acceptable as it's a tool name, but prefer hashing/whitelisting if a system name could be PII; flag for review).
- **Determinism + hydration safety:** all events fire on user interaction (client), never during SSR/first paint. The band aggregates are computed server-side with the `referenceNowMs` boundary — no `Date.now()` in render. New events must follow this (no clock in render path).
- **Render-only / wiring preferred:** every gap in §4.2 is a single `track()` call at an existing callback site — no new data fetch, no schema change. §4.3 enrichments add fields to existing payloads.

---

## 5. THE COMPREHENSION + NAVIGATION FUNNEL ("land → understand → navigate")

Today we can measure *load* (`dashboard_v2_viewed`) and *bounce* (`dashboard_bounced`) but there is **no defined funnel for whether a user understood the page and then navigated to a workflow.** Proposed minimal funnel (all events either exist or are §4.2/§4.3 additions):

```
STEP 0  LAND            dashboard_v2_viewed         (exists; +add `lens`)
            │
STEP 1  ORIENT          ≥1 of:                       "did they engage with a comprehension aid?"
   (understand signal)    dashboard_kpi_tile_clicked
                          dashboard_opportunity_segment_clicked
                          dashboard_pareto_bar_clicked   (NEW)
                          insight_chip_clicked
            │
STEP 2  NARROW          ≥1 of:                       "did they shape the view?"
   (navigation intent)    dashboard_v2_filter_applied
                          dashboard_v2_sort_changed
                          preset_view_applied            (WIRE on v2)
                          dashboard_lens_changed
                          dashboard_column_picker_opened (NEW)
            │
STEP 3  ARRIVE          workflow_row_clicked         (exists; +add `originSurface`/`lens`)
   (navigate)             OR empty_state_cta_clicked (NEW, zero-workflow branch)
```

**Funnel definitions (deterministic, session-scoped via `dashboardViewPerfTimestampMs` already tracked):**
- **Comprehension rate** = sessions reaching STEP 1 / sessions at STEP 0. *Hypothesis target: > 35%* (a band that "reads at a glance" should pull at least a third of users into one orient action; if lower, the band is decorative).
- **Navigation rate** = sessions reaching STEP 3 / STEP 0. The primary success metric of the dashboard.
- **Orient→Arrive lift** = navigation rate among sessions that did STEP 1 vs. those that didn't. *If positive and significant, it proves the at-a-glance aids cause navigation* — the core thesis of this redesign.
- **Bounce** = `dashboard_bounced` (STEP 0 with zero trackable interaction) — already instrumented; it is the funnel's drop-off floor.

**Per-surface attribution** (needs `originSurface` on `workflow_row_clicked`, §4.3): answers "which at-a-glance element drives the most workflow opens — KPI tile, opportunity segment, Pareto bar, preset, or raw list scroll?" This directly tells us which comprehension aids to invest in vs. retire.

**Lens comprehension check** (needs `lens` on `dashboard_v2_viewed`, §4.3): compare navigation rate Library vs. LSS. If LSS users bounce more, the lens switch is confusing (a comprehension failure) rather than a power feature — and we'd only know with this segmentation.

---

## 6. HONESTY GUARDRAILS (carried forward + lens-specific)

Unchanged from the prior review §6 and re-affirmed for the lens era:
- **Never** ROI / time-saved / cost — no baseline, frequency, or headcount data exists.
- **Never** DPMO / sigma / Cp/Cpk / CV / takt — the LSS lens deliberately omits these (`lenses.ts` honesty block); the Pareto uses **observed time only** and the variation strip uses **variant count + cycle spread**, explicitly NOT a CV.
- **Always** attach N — "median across N *timed* workflows", "· N runs", "of M workflows". Single-run "medians" are single samples; label "across workflows" never "across runs".
- **Proxies labeled as proxies** — `aiOpportunityScore` = candidacy not value; `lastRunAt` = `updatedAt` proxy → "recently changed (approx)"; `confidence` = capture confidence not accuracy.
- **Degenerate-case honesty** — suppress trend/Pareto framing when < 3 data points (prior §6); detect the all-identical-totals Pareto and soften "vital few" copy.
- **Empty ≠ broken** — `0` candidates and `—` deltas need a one-line "why", not a bare value (§3).

---

## 7. RANKED RECOMMENDATIONS (top 8)

Format: **Title** — what it surfaces/measures — at-a-glance / navigation benefit — effort — honesty note.

1. **Wire `preset_view_applied` on the v2 PresetChipRail** — measures the most prominent below-band navigation control (currently zero signal on v2; event only fires on the legacy page). — Unlocks Step-2 of the funnel and "which preset drives navigation." — **S** — Taxonomy + privacy posture already exist; opaque labels only.
2. **Stand up the land→understand→navigate funnel (§5) + enrich `dashboard_v2_viewed` with `lens`/`density` and `workflow_row_clicked` with `originSurface`** — turns isolated clicks into a comprehension/navigation funnel with per-surface attribution. — Proves (or disproves) that the at-a-glance band causes navigation — the redesign's whole thesis. — **M** — Numeric/taxonomy enrichment only; no content; deterministic.
3. **Add a "High-Variance Workflows" KPI tile (Tile 5)** — surfaces `highVariationCount` as a scannable number with `of K multi-run workflows` provenance. — Makes the #1 Standardize signal at-a-glance instead of buried in Narrator prose. — **S** — Data already in band-stats; gate denominator to runs ≥ 2.
4. **Add `dashboard_column_picker_opened` + `empty_state_cta_clicked` events** — measures customization-feature discovery and the zero-workflow → install activation click. — Two invisible navigation/activation surfaces become measurable. — **S** — One `track()` per callback; no content.
5. **Tighten KPI provenance + add empty/dash tooltips** — "across N *timed* workflows" (not all 16), "delta needs ≥3 prior-period workflows", "candidacy not ROI" on the automate tile. — Makes existing honest numbers *self-explanatory* at a glance. — **S** — Render-only copy; strictly increases honesty.
6. **Instrument the LSS Pareto bars (`dashboard_pareto_bar_clicked`) and (optionally) wire a row drill-through** — measures whether the "vital few" framing drives navigation to high-leverage workflows. — Connects the LSS lens's headline visual to actual navigation. — **S** (event) / **M** (drill-through) — Observed time only; N attached; no fabricated metric.
7. **Add a Tier-2 "library facts" row: Total runs · Distinct systems · Needs review · Recorded this week** — surfaces the evidence denominator and three honest counts without competing with the hero tiles. — Answers "16 workflows = how much evidence?" at a glance; links Needs-review to its preset. — **S** — All in `stats` today; counts not averages.
8. **Surface a "Recently changed / drifted from SOP" aggregate** — count of workflows with recent `lastRunAt`-proxy change and/or `documentationDrift`. — A "what moved since I last looked?" at-a-glance signal that currently has no top-of-page representation. — **M** (drift needs a route aggregate) / **S** (recently-changed count client-side) — Label `lastRunAt` as an `updatedAt` proxy ("recently changed (approx)"); drift gated to multi-run workflows.

---

## 8. CONSTRAINTS CHECK (all recommendations comply)
- **Honesty:** observed-only; every proxy labeled; no DPMO/sigma/cost/takt; N attached everywhere. ✅
- **Determinism + hydration safety:** band aggregates already server-computed via `referenceNowMs`; all new events fire on interaction, never in render. ✅
- **PostHog privacy:** opaque `workflowId` + numeric aggregates + taxonomy labels only; no workflow/step content; matches existing SOP/report event precedent. ✅
- **No new extension capture:** zero. All signals derive from `GET /api/workflows` (existing `stats` + per-workflow array) or are client-side interaction events. ✅
- **Render-only / wiring preferred:** Items 1, 3, 4, 5, 6(event), 7 are pure wiring/copy. Item 2 is event enrichment. Item 8 (drift) is the only one needing a small route aggregate. ✅
