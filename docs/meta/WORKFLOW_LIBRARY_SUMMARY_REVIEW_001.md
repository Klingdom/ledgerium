# WORKFLOW LIBRARY — Portfolio Summary / Baseline Timestudy Band (REVIEW_001)

**Type:** CEO-directed Mode 3-adjacent multi-agent metric-determination review (NON-counting; no product code changed).
**Date:** 2026-06-19
**Directive (verbatim):** *"I would like total averages for runs, cycle time, case volume, system/run, and health score at the top and bottom of the workflow dashboard library of workflows. Also engage subagents to determine the best metrics to summarize at the top and bottom of the workflow library. I want a view which I would use as a baseline timestudy report."*
**Panel:** product-manager, analytics, ux-designer, system-architect, competitive-researcher.
**Live surface (grounded):** `/dashboard` renders `DashboardV2Shell` (`page.tsx:317`). A rich **top band** already exists (`TopBand.tsx`: NarratorSummary + `KpiTileStrip` 4 tiles + HealthGauge + SignalFactsRow + trend). There is **no bottom band**. Aggregates are computed deterministically in `lib/dashboard-band-stats.ts`. Per-workflow data already in the client list: `metricsV2.runs`, `metricsV2.avgTimeMs`, `toolsUsed[]`, `metricsV2.healthScore.overall`+`isGated`.

---

## 1. Verdict

Everything the CEO asked for is **computable today, client-side, with zero new server plumbing** — every metric derives from the workflow list already in the browser. The right shape is a **two-part document frame**: the existing **top band = portfolio overview** (all workflows), and a **new bottom band = "Portfolio Timestudy" footer** that summarizes the **currently filtered/shown** set. Filter the library to a process group, read the footer totals, screenshot/export, re-measure later. That footer is the "baseline timestudy report."

**The single architectural rule:** one deterministic source — extend `dashboard-band-stats.ts` with `computePortfolioSummary(slice)` feeding **both** bands so they can never disagree. All arithmetic lives there; the band components are pure presentation. (Matches the existing `computeMedianCycleTimeMs` / `computeTotalRuns` pattern.)

**The honesty crux (resolved):** we do **not** have a raw per-run duration array yet (it lands at Path C R+1). So every portfolio cycle-time/systems aggregate today is a **proxy on per-workflow values** and must be labeled with its denominators (N workflows · M runs). The differentiator — **evidence-count provenance ("4m 32s · 47 runs")** — is something **no surveyed competitor (Celonis, UiPath, Signavio, Power Automate, Disco, Scribe) surfaces**; lean into it.

---

## 2. Cross-agent convergence
- **Top = portfolio scope; bottom = filtered "this view" scope** (PM, UX, architect). Not a mirror. Scope label mandatory: *"across N of M workflows."*
- **One deterministic `computePortfolioSummary`** in `dashboard-band-stats.ts`, no server changes, recomputed on the filtered set via `useMemo` (architect, analytics).
- **Honest denominators + "—" states + plan-gating** for health score; proxies labeled (all five).
- **Evidence-count provenance is the moat** — surface "N runs observed" as a first-class number (competitive, analytics, PM).
- **Avoid average-of-averages** without disclosing weighting (competitive, analytics) — but **don't fake per-case precision** we don't have (architect).

---

## 3. The CEO's 5 metrics — honest definitions

| CEO metric | Honest definition (today's data) | Source | Notes |
|---|---|---|---|
| **runs** | Avg runs/workflow = Σruns / run-bearing count | `metricsV2.runs` | also show **Total Observed Runs** (Σruns) — the evidence base |
| **case volume** | **Total Observed Runs** = Σ `metricsV2.runs` | already `stats.totalRuns` | distinct from avg runs; the portfolio workload |
| **cycle time** | per-workflow duration aggregate (see §4 weighting) | `metricsV2.avgTimeMs` (timed-only) | **proxy** — per-workflow, not per-run, until Path C R+1 |
| **systems/run** | Avg distinct systems **per workflow** | `toolsUsed.length` | label honestly: per-workflow (no run-grain system attribution exists) |
| **health score** | Portfolio avg over **ungated** workflows | `healthScore.overall`/`isGated` | **plan-gated**: all-gated → upsell state, never a number |

---

## 4. The weighting decision (coordinator ruling — needs CEO confirm)

`metricsV2.avgTimeMs` is a per-workflow representative duration; the raw per-run array doesn't exist yet. Two honest options:
- **(A) Median of per-workflow durations** — robust ("typical workflow"); what the top strip already shows; doesn't overstate precision.
- **(B) Case-weighted mean** = Σ(avgTimeMs × runs) / Σruns — answers "where does the org's time concentrate" (the timestudy/BI-footer standard); but on a per-workflow proxy it *looks* per-case without being so.

**Ruling:** keep **(A) median** in the top band (unchanged), and show **(B) case-weighted mean** as the bottom timestudy headline — **explicitly labeled** "case-weighted across M runs · per-workflow mean × runs (proxy)." Both carry N/M denominators. Same logic for systems/run: present **"Avg Systems / Workflow (observed)"** (honest), not "per run." True per-run cycle time + **Total Observed Process Time** (Σ run durations) defer to **Path C R+1**.

---

## 5. Recommended build

### TOP band (portfolio overview — extend existing)
- **+1 tile: "Total Observed Runs"** (`stats.totalRuns`) — the evidence-base anchor + the moat made visible. Existing 4 tiles unchanged. *(P0, S)*

### BOTTOM band — **"Portfolio Timestudy"** footer (new; reflects the filtered set)
- **Scope header row:** `Portfolio Timestudy · across N of M workflows · recorded [earliest – latest]` + **Export** (print) affordance. *(header P0; date range + export P1)*
- **5 stat tiles** (grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`, hero = cycle time):
  1. **Avg Cycle Time** (hero) — case-weighted mean (proxy label) · "across N timed · M runs"
  2. **Total Cases** — Σ runs in view
  3. **Avg Runs / Workflow** — Σruns / run-bearing N
  4. **Avg Systems / Workflow** — mean `toolsUsed.length` (observed)
  5. **Avg Health Score** — ungated mean; gated → "Upgrade to see" *(plan-gated)*
- Non-interactive static tiles (no honest single filter), reusing the existing `TileShell` + provenance-tooltip pattern.

### Honest states (encode in code, not copy)
- 0 workflows → band hidden. 0 filter results → scope header only ("No workflows match"), no zero tiles. Single-run-only → "record more runs for trends." Free-tier health → "—" + upsell. Every average shows its denominator.

### Single source + scope
- `computePortfolioSummary(rows)` in `dashboard-band-stats.ts` (pure, deterministic, ~100 LOC + ~15 tests). One `useMemo` over `filteredWorkflows` feeds the bottom band; `stats.*` supplies the "of M total" labels. No server changes for MVP.

---

## 6. Prioritized plan
- **P0 (S/M):** `computePortfolioSummary` + the bottom "Portfolio Timestudy" band (5 tiles, scope label) + top "Total Observed Runs" tile. All client-side. *This is the CEO's ask.*
- **P1 (M):** recorded-date-range header + **Export/print** affordance (a `@media print` stylesheet showing top band + list + footer only) → makes it a shareable baseline report. Cycle-time **p10–p90 spread** + **% multi-run coverage** (baseline-quality signal).
- **P2 (defer to Path C R+1):** true per-run case-weighted cycle time + **Total Observed Process Time** (Σ run durations) — the timestudy crown jewel, blocked on per-run duration data. Server-pagination-safe "of all" denominators.
- **Anti-scope:** benchmark/industry comparisons (Signavio/Celonis mix observed + estimated — Ledgerium's observed-only is the differentiator; never add this).

---

## 7. Open decisions for CEO
1. **Cycle-time number:** confirm median (top) + case-weighted-mean (bottom, labeled proxy), or pick one.
2. **Systems metric:** confirm **"Avg Systems / Workflow (observed)"** (honest) vs a "per-run" weighted proxy.
3. **Bottom band scope:** confirm **filtered/this-view** with "N of M" label (recommended) — so it works as a per-process-group baseline.
4. **Export/print** (P1) in this build or later?
5. Confirm deferral of **Total Observed Process Time** + true per-run weighting to **Path C R+1**.

---

*Mode 3-adjacent diagnostic. No iteration counter incremented. No product code changed. Consolidated from 5 specialist analyses. Build is proposed; execution pending CEO confirmation of §7.*
