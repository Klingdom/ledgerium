# Workflow Dashboard — Persona-Driven Rethink (Consolidated Review)
**Ledgerium AI** · 2026-06-14 · Status: FINAL FOR CEO · Define-phase (no product code)

Six-specialist board (PM · UX · analytics · Lean-Six-Sigma master black belt · product-analytics/browser-usage
expert · competitive) reconsidered the workflow dashboard for THREE broad audiences. Synthesizes the docs in
`docs/features/dashboard-personas/`.

## The audiences (Jobs-To-Be-Done)
1. **Lean Six Sigma belts / process-improvement PMs** — DMAIC: baseline a process, measure cycle time + variation,
   find bottlenecks, see conformance to a standard, track improvement.
2. **Baseline / best-path documenters** — capture the standard/best path, see how runs deviate, keep it fresh.
3. **Product / UX teams** — understand which **applications, pages, and tools/features** are used in browser apps
   (PeopleSoft, Workday, SaaS, private apps), in what order, how often, where users struggle.

## The answer to "better methods / reporting-dashboard options"
**Do NOT build three dashboards or add a signup questionnaire. Adopt a persona "LENS" switcher over the single
workflow-library spine.** The same recordings already contain all three audiences' data on **orthogonal group-by
axes** — the process lens collapses pages→categories to compare *runs*; the product lens collapses runs→pages to
compare *screens*; the doc lens surfaces the *standard path*. A lens is a named config (KPI band + column pack +
default sort + an above-list panel/visual + preset filters) over shared data — reusing the existing column
registry, presets, saved-views, and KPI band. This is Ledgerium's structural moat: one extension session feeds
all three (Celonis needs ERP logs, Pendo needs instrumentation, Scribe needs manual recording).

### The lenses (proven archetypes, mapped to our data)
- **Library** (default, today) — the portfolio list + KPI band.
- **Measure & Analyze (LSS)** — cycle time (mean/median/p90/stddev), **variation (CV + sequence-stability)**, a
  **Pareto** of slow/variable steps, a baseline snapshot, variant analysis as "process variation", a
  stability/standardization view, conformance-to-best-path. Headline KPIs à la UiPath: runs · avg cycle · variant
  count · (first-time-right where derivable).
- **Understand / App Usage (Product/UX)** — **applications used** (toolsUsed + systemCoverage, live today) · a
  **page/route inventory** (page_context.routeTemplate/pageTitle — captured today, needs aggregation) · **feature/
  action usage** by category/action · **page-flow/path** · time-per-app/page · cross-workflow **coverage**.
- **Document / Best Path** — the observed **standard path** + frequency + per-step deviation + **drift** + an
  exportable SOP; coverage of documented vs undocumented.

## Decisive code-confirmed findings
- **The data is far richer than the dashboard exposes.** The intelligence engine already computes timestudy
  (mean/median/**p90**/stddev), duration **CV**, sequence-stability, variants+frequency, bottleneck durationRatio,
  and structural/timing/exception **drift** — but `/api/workflows` flattens it to scalars and the library shows
  none of it. **Most high-impact moves are "surface what we already compute," not new math.**
- **Product-usage is a presentation/aggregation gap, not a capture gap.** Every event carries `page_context`
  (applicationLabel · routeTemplate · pageTitle · domain · moduleLabel). `toolsUsed` + `stats.systemCoverage` are
  live. But the engine keys off step **categories**, never pages — a product lens needs a new **page/route
  aggregation** (group-by page), not new capture.
- **Two small backend unlocks** enable most of the LSS + doc lenses: (a) surface `variance.coefficientOfVariation`
  + `stdDevMs` in `WorkflowMetricsOutput`; (b) surface `sequenceStability` (already plumbed) — unlocks the
  consistency columns + the Best-Path-Coverage column.

## Honesty boundaries (must not fabricate)
- **Cannot show** value-add % (no VA/NVA classification), DPMO / sigma level / Cp-Cpk (no defect definition,
  opportunity count, specs, takt, or customer demand). These require user-supplied inputs or a new classification
  model — flag honestly; do not invent.
- "Feature usage" is honestly **"control-label / application usage"** until a Pendo-style tagging layer exists.
- "Last Run" → **"Last Activity"** until a true per-run timestamp (Path C R+1). The engine computes **p90, not p95**.
- No population adoption (MAU/DAU), no instrumented rage/dead/error clicks, no JS-error capture today — friction is
  inferred from high-variance/backtracking steps only, and must be labeled as such.

## Prioritized roadmap (P0 → P2)
- **P0 (the highest-leverage, low-cost, maximally-differentiated move):** ship the **Measure & Analyze (LSS) lens**
  — a lens switcher + an LSS preset column pack (cycle time, variation/CV, variant count, bottleneck) + a **Pareto**
  panel (cycle time × run count, both available today) + surface CV/stdDev + sequence-stability. No competitor
  speaks DMAIC from a browser recorder.
- **P0 (correctness/reuse):** wire preset chips to apply their FilterSet (today they only change columns);
  make the systems filter system-first; surface the engine outputs the library already computes.
- **P1:** the **Understand / App Usage lens** — application-usage bar + **page/route inventory** (the new
  group-by-page aggregation) + feature/action usage + coverage. This opens the product-team market (WalkMe's space)
  with data we already capture.
- **P1:** the **Document / Best Path lens** — standard-path summary + deviation + drift + Best-Path-Coverage column.
- **P1:** happy-path **Variants slider** + N-attribution on every statistic (category-first differentiators).
- **P2:** page-flow/sankey, funnel/drop-off, control-style consistency view (needs per-run durations — deferred),
  improvement-tracking trend, exportable lens reports.

## Lens persistence + onboarding
A `role="tablist"` lens switcher in the header; client-only state (no refetch); persisted as `activeLens` in
`UserDashboardPreference` (v1→v2 migration, default `library`/`intelligence`). Optional first-run hint ("View as:
Process improvement · Product/UX · Documentation"). No questionnaire.

## Success metrics + open CEO decisions
- Metrics: lens adoption (which lenses get used), LSS-lens engagement, product-lens page-inventory usage, export rate.
- **DD-1** Confirm the lens model (vs persona-routed dashboards). Recommend lenses.
- **DD-2** Ship order — recommend **Measure & Analyze (LSS) first** (highest differentiation/cost ratio).
- **DD-3** Approve the two small backend additions (CV/stdDev + sequence-stability) + the page/route aggregation for P1.
- **DD-4** Naming of lenses (Measure / Understand / Document vs Process / Usage / Docs).
