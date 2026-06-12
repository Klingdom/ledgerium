# Dashboard Competitive Benchmark — Workflow Library Redesign
**Ledgerium AI** · 2026-06-12 · Analysis only (read-only agent output, persisted by coordinator)

## 1. Top-of-page anatomy that converged across 2026 SaaS dashboards
1. A horizontal strip of **3–5 stat cards** (first ~80–120px): each = large value + **delta vs prior period** (% + arrow) + an inline **sparkline**.
2. **One primary trend chart** (line/bar, configurable range) below the strip — no competing chart at the same level.
3. The **list/table** below.

Reference pattern repeatedly cited: **Stripe** (gross volume / charges / payouts + delta + sparkline, then one trend chart). Pattern coverage:

| Pattern | Stripe | Mixpanel | Amplitude | Celonis | UiPath | Linear | Vercel | Notion'26 | Datadog |
|---|---|---|---|---|---|---|---|---|---|
| 3–5 stat tiles | ✅ | ✅ | ✅ | ✅(4) | ✅(5) | ✅ | ✅ | ✅ | ✅ |
| Delta vs prior | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ~ | ✅ |
| Inline sparkline | ✅ | ✅ | ✅ | ~ | — | ~ | ✅ | — | ✅ |
| One primary trend chart | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Progressive-disclosure drill | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ |

## 2. "Simple but information-powerful" (the constraint)
Working memory ≈ 3–4 chunks. Dashboards >12 KPIs lose adoption. Best tools show 5–9 elements above the fold, hide the rest behind drill-downs/tabs. The test for each top tile: **"if this number moved 20%, would someone act?"** — if not, it's decorative.
- **One north-star metric, visually dominant** (Stripe sizes gross volume 2–3× others).
- **4-tile rule** + group related metrics under a section header instead of adding tiles.
- **One primary chart**, not competing charts at the same weight.
- **Progressive disclosure:** summary tile → expanded chart → deep-dive drawer.
- Avoid: >5 ungrouped tiles, pie >3 slices, dual-axis, 3D/decorative gradients, 14+ cards.

## 3. Modern list/table expectations (2026)
Expected-by-default: single-column sort with arrow; **column picker** (>6 cols); **saved views** (cols+sort+filter); sticky header; **density toggle** (compact/regular/relaxed); hover highlight; **kebab row actions**; bulk select for 20+ rows; filter chips above table. Emerging: **multi-sort** (Salesforce/Linear/Notion); **inline sparklines in cells** (AWS QuickSight Apr 2026, Sigma, Datawrapper). Dated: fixed columns, modal row-edit, horizontal scroll w/o sticky first col, icon clutter, no empty-state CTA.

## 4. Recommendations for Ledgerium (fit our data: runs, cycle time, health, systems, variation, automation candidates, recorded date)
**Top-of-page set (4 tiles + 1 chart):**
- **T1 Total Workflows** (hero, largest) + Δ vs prior 30d.
- **T2 Median Cycle Time** + Δ + sparkline — the "are we getting faster" signal that separates us from Scribe.
- **T3 Automation Candidates** (`automate`-tagged count) + Δ — the pipeline-to-value metric Celonis/UiPath surface prominently.
- **T4 Avg Health Score** (number or 2-segment donut) + direction.
- **Primary chart:** Workflows Recorded over time (weekly bars, 30/90/all) — the most universally deployed top chart.
- **Exclude from tiles:** system count, variation, recorded date, last run (these are columns, not KPIs).

**List:** add **Date Recorded** (sortable, relative + absolute on hover); add sorts for Runs / Cycle Time / Last Run / Date Recorded; persist sort in saved views; optional **inline run-volume sparkline** column; **density toggle**; health score as a colored **pill**; strong empty/zero-results states.

## 5. Eight "modernize" moves (low effort → high)
1. **Δ indicators on every KPI** (raw number → signal).
2. **Replace insight-chip strip lead with a KPI tile strip**; move chips to a secondary filter row.
3. **Add a "recorded over time" trend chart** (value-proof + "are we using this").
4. **Inline sparklines in the run-count column** (static inventory → living pulse).
5. **Density toggle** (1-day build, big ergonomics win for 40+ rows).
6. **Date Recorded sortable column** (CEO ask; `createdAt` already stored).
7. **Whitespace + card separation** header (cramped, border-less UI reads as 2019).
8. **One-line narrator summary** above the list ("Your 12 workflows average 72; 3 have high variation — consider standardizing") — dashboard-as-narrator, makes the deterministic evidence visible.

## Sources
Celonis (KPI component guidelines; studio app guidelines); UiPath Process Mining (dashboards; KPI trend lists); SAP Signavio (Feb 2026 release); Stripe (dashboard home charts; basics); Amplitude; Linear (insights; dashboards); Vercel (dashboard redesign); Notion (Mar 2026 dashboards); Mixpanel (KPI template); Datadog/Grafana (best practices); AWS QuickSight (table sparklines, Apr 2026); Carbon Design System (dashboards); plus 2026 SaaS dashboard/bento/data-table design guides. Full URL list in board transcript.
