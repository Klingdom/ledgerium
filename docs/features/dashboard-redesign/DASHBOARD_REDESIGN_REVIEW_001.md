# Dashboard Redesign — Consolidated Review (≥20 Major Improvements)
**Ledgerium AI** · 2026-06-12 · Status: FINAL FOR CEO · Define-phase (no product code yet)

Six-specialist board review of the `/dashboard` workflow-library page. Synthesizes:
`PM_DASHBOARD_REVIEW.md` · `UX_DASHBOARD_REVIEW.md` · `ANALYTICS_DASHBOARD_REVIEW.md` ·
`FEASIBILITY_DASHBOARD_REVIEW.md` · `COMPETITIVE_DASHBOARD_BENCHMARK.md` · `GROWTH_DASHBOARD_REVIEW.md`.

## Current-state summary
The v2 dashboard (`DashboardV2Shell`) has real depth — CommandHeader, InsightsStrip, a customizable
table (column registry/picker/presets/saved-views), filters. But it reads cluttered and dated:
- **Six horizontal control bands** before the first row (CommandHeader → InsightsStrip → PresetChipRail →
  Customize button → FilterBar → table header). Three overlapping control surfaces do related things with
  no shared language.
- The most important number (portfolio health, 28px) sits **top-right** — read last on an F-scan.
- **No top-of-page graphics** (no KPI tiles, no trend chart) despite the API already aggregating ~17 stats.
- **Sort limited to 3 fields** (health_score | name | opportunity) — none of the metrics users care about.
- Per-workflow signals (runs, cycle time, recorded date, last activity) are buried as subtext, not columns.
- Empty-state CTA links to a **placeholder Chrome Web Store URL** (dead in prod) — should be `/install`.

## Resolved metric definitions (honesty — the board reconciled these)
- **Runs** = `processDefinition.runCount` (clean). ✅
- **Cycle Time** = `metricsV2.avgTimeMs` (avgDuration→median→duration priority). ✅
- **Date Recorded** = `Workflow.createdAt` (already in every row). ✅
- **Last Run** — there is **no run table**; the v2 "Last Run" is wired to `lastViewedAt` (a *view* timestamp = dishonest). Honest fix: back it with **`processDefinition.updatedAt`** (when the process last gained/changed a run) and label **"Last Run"**, OR label "Last Activity." A true per-run `lastRunAt` lands with Path C R+1. ⚠ relabel/rewire.
- **Case Volume** — in process-mining a *case* = a run instance, so **Case Volume ≡ Runs (`runCount`) today**. Honest to ship as an alias, but it sorts identically to Runs. A *distinct* Case Volume (e.g. production cases vs test recordings) requires data we don't capture → defer the distinction to Path C R+1. ⚠ alias-of-Runs.

All five requested sorts are therefore deliverable honestly; only Last Run needs a rewire and Case Volume is an alias of Runs (surface one, note the other).

---

## The ≥20 major improvements (ranked, P0 → P2)

### P0 — quick wins + correctness (ship first; small, contained)
1. **Date Recorded column** (CEO ask) — new `ColumnKey: date_recorded` = `createdAt`; relative ("3d ago") + absolute on hover. Registry-test-first (closed-union exhaustiveness). **S.**
2. **Sort by Runs / Cycle Time / Last Run / Date Recorded / Case Volume** (CEO ask) — extend `SortField` + comparator in `WorkflowList.tsx` (client-side over the returned set; no API change). Last Run rewired to `processDefinition.updatedAt` (honest); Case Volume = Runs alias. **S/M.**
3. **Default sort → Date Recorded, newest first** (today: health_score asc, unlabeled/confusing). **S.**
4. **Make Runs + Last Run first-class columns** (not subtext) in the default pack. **S.**
5. **Fix the dead empty-state CTA** — `chromeStoreUrl` placeholder → `/install`; restore the `/upload` secondary CTA v2 dropped. **S, P0 activation.**
6. **Sortable column headers with arrow + aria-sort** for every sortable column (not just a hidden control). **S.**

### P1 — top-of-page graphics (simple but information-powerful; all from existing `stats`, Recharts already a dep)
7. **KPI tile strip (4 tiles)** at the top: **Total Workflows** (hero), **Median Cycle Time**, **Automation Candidates**, **Avg Health Score** — each with a **delta vs prior 30d**. Replaces the top-right-buried health number. **M.**
8. **"Recorded over time" trend chart** (weekly bars, 30/90/all) — the most universal top-of-page chart; doubles as product-value proof. Needs a small additive `stats.activityByWeek` from the existing `referenceNowMs` boundary (deterministic). **M.**
9. **Portfolio Health donut/gauge** (2–3 segment: healthy/at-risk) replacing the flat rail. **S/M.**
10. **Cycle-time mini-distribution** (min/avg/max track or small histogram of workflow means) — honest "workflow-mean" substitute until per-run data lands. **M.**
11. **Opportunity distribution bar** (automate/standardize/optimize/monitor/healthy split) — the single most decision-relevant aggregate; click a segment → filter the list. **S/M.**
12. **One-line "narrator" summary** above the list ("Your 12 workflows average 72; 3 have high variation — consider standardizing") — dashboard-as-narrator; makes deterministic evidence visible. **S.**

### P1 — streamline / modernize the layout + list
13. **Consolidate the 3 control surfaces into ONE two-row toolbar** (Row 1: portfolio · search · filter · sort · columns; Row 2: preset + saved-view chips). Kills the six-band stack. **M.**
14. **Preset chips apply columns AND filter together** (today PresetChipRail only changes columns) — fixes the silent gap. **S/M.**
15. **Global search field** over title/system (absent today). **S.**
16. **Density toggle** (compact/regular/relaxed) — expected in every modern table; big win for 40+ rows. **S.**
17. **Health score as a colored pill/badge** inline (number on hover) — reduces scan noise. **S.**
18. **Stable hover affordances** — reserve the kebab column (opacity transition, no layout shift). **S.**
19. **Stale badge** on rows past the staleness threshold (we already compute `isStale`). **S.**
20. **Persist sort inside saved views** (alongside column visibility). **S/M.**
21. **Modern visual system** — whitespace, 16–24px card padding, subtle 1px border + 4px radius, typography scale; the single strongest "this looks 2026" signal. **M.**

### P2 — power features + depth
22. **Inline run-volume sparkline column** (40×24, optional) — turns the static inventory into a living pulse (AWS QuickSight Apr-2026 pattern). **M** (needs per-period run counts).
23. **Export to CSV** of the current (filtered/sorted/columned) view. **S/M.**
24. **Slide-in workflow detail panel** (preserve list context) + **bulk select + actions** for large libraries. **M/L.**

*(24 items — exceeds the 20 minimum. Full per-item problem/value/effort detail in the role artifacts.)*

---

## Top-of-page direction (the CEO's "graphs/graphics/infographics")
Recommended final set, uncluttered: **4 KPI tiles (with deltas) + one "recorded over time" trend chart + a one-line narrator summary**, with the **health donut** and **opportunity bar** as the two supporting graphics. Everything is computable from the existing `stats` payload (items 7–12) plus two small additive deterministic `stats` fields (activity-by-week, health-band counts). Charts client-only, animations off, pinned gradient ids, design-token colors (per the iter-073 collision + color-lint conventions).

## Sequencing (Mode-1 series, each gated)
- **Batch A (P0 quick wins):** items 1–6 — Date Recorded + 5 sorts + default-sort + dead-CTA fix. One contained registry+sort+empty-state change; lowest risk; directly delivers the CEO's explicit asks.
- **Batch B (P1 top-of-page):** items 7–12 — KPI strip + trend chart + health donut + opportunity bar + narrator. (+ the two additive stats fields.)
- **Batch C (P1 streamline):** items 13–21 — unified toolbar, search, density, pills, visual system.
- **Batch D (P2):** items 22–24 — sparklines, CSV export, detail panel, bulk actions.

## Open CEO decisions
- **DD-1** "Last Run" — back with `processDefinition.updatedAt` and keep the label "Last Run" (recommended), or label "Last Activity"?
- **DD-2** "Case Volume" — surface as an alias of Runs now (sorts identically), or omit until a distinct case metric exists?
- **DD-3** KPI tile set — confirm the 4 (Total Workflows / Median Cycle Time / Automation Candidates / Avg Health)?
- **DD-4** Default sort → Date Recorded desc (recommended) vs keep health-based?
- **DD-5** Proceed Batch A → D as a Mode-1 series?

**Recommendation:** start **Batch A** immediately (it is the CEO's explicit ask, smallest, lowest-risk), gated by the registry/WorkflowList tests + flash-safety smoke, then proceed B→D.
