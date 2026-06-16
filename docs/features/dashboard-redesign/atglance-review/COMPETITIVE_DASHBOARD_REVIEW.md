# Competitive Dashboard Review — At-a-Glance Comprehension & Navigation

**Artifact type:** Mode 3-adjacent competitive-research review (analysis only — no product code changed)
**Date:** 2026-06-15
**Author:** competitive-researcher
**Surface under review:** Ledgerium **workflows dashboard page** — `apps/web-app/src/components/dashboard-v2/*` (rendered via `DashboardV2Shell`; `page.tsx` redirects all users to it)
**Scope:** How world-class dashboards make themselves understandable AT A GLANCE and easy to navigate, mapped honestly to Ledgerium's observed-only / evidence-linked surface.

---

## 1. Current-state read (grounded in screenshots + source)

Read from `dashboard-list.png`, `dashboard-lss.png`, and the component tree. Ledgerium's workflows dashboard is **already strong** — it is not a blank slate. It currently ships:

- **Command header** (`CommandHeader.tsx`): page title "Workflows", an inline time-range `<select>` (default now `All time`, WDC2-P03), a **portfolio health score** (integer 88 + 3-band rail + period-over-period delta `— vs last 30d`), and a one-line **top-insight sentence** ("Bottleneck: Step 2 is a bottleneck → investigate step owner").
- **Lens switcher** (`LensSwitcher.tsx`): two tabs — **Library** and **Measure & Analyze** — re-framing the same in-memory data client-side (no refetch). This is a genuine differentiator.
- **TopBand** (`band/TopBand.tsx`): a 4-tile **KPI strip** (Total Workflows, Median Cycle Time, Automation Candidates, Avg Health Score) + a **HealthGauge** radial, an **OpportunityBar** (clickable segmented bar → opportunity filter), a **RecordedTrendChart** (weekly bars), and a **NarratorSummary** one-liner ("Your 16 workflows average a health score of 88.").
- **Insights strip** (`InsightsStrip.tsx`): dismissable chips driven by computed signals.
- **Unified toolbar** (`UnifiedToolbar.tsx`): Portfolios toggle, search, Filter, Sort, density (Regular), **Columns** (customization picker), plus a **preset chip rail** (Automation Candidates, Needs Attention, Standardize, High Volume, Recent Activity, Ready to Share, My Team's Bottlenecks, AI Automation Candidates).
- **Workflow list** (`WorkflowList.tsx` / `WorkflowRow.tsx`): customizable columns, health-score band coloring, sort headers, inline rename/archive, kebab menu.
- **LSS Pareto panel** (`LssParetoPanel.tsx`): "Time impact (Pareto)" — "12 of 16 workflows account for ~80% of total observed time — the vital few," with a Pareto bar+cumulative-line chart and per-workflow `total · runs` attribution.

**Honest critique of the current screenshots** (the gap competitive patterns should close):

1. **The KPI strip reads as four near-identical dark cards** with no visual ranking — the eye has no entry point. World-class dashboards establish a single hero/verdict first, then supporting tiles.
2. **"AUTOMATION CANDIDATES 0 of 16"** and **"OPPORTUNITY MIX — Healthy 16"** present a fully-green, all-healthy state with no "so what / what next." A perfectly-healthy portfolio is a *navigation dead-end* — there is no obvious next action.
3. **The trend chart Y-axis labels are broken** ("3 / 3 / 3" placeholder ticks) and a single tall June bar dominates — the chart currently communicates almost nothing at a glance.
4. **Redundant health surfaces**: the header score (88), the AVG HEALTH SCORE tile (88), and the HealthGauge (88) all show the same number three times — triple-spend of prime real estate on one metric.
5. **The Pareto labels are all identical** ("Approve Expense Report (Sample)" ×10) — in a real account this is fine, but it exposes that the list has no secondary disambiguator (system, last-run, variant count) to make near-duplicate rows scannable.
6. **Density default "Regular"** + many columns risks a wide, hard-to-scan grid; numeric alignment / right-alignment is not guaranteed.
7. **No persistent "what changed since last visit" surface** — the delta exists only on the single health score.

These are exactly the problems the patterns below address.

---

## 2. Best-practice patterns (named) → who does it well → Ledgerium application

For each pattern: **honesty guard** — Ledgerium is observed-only and evidence-linked. No pattern below recommends fabricated metrics, predictive/forecast numbers we can't back, or BPMN/sigma "theater." Every recommendation maps to data Ledgerium already computes (`metricsV2`, opportunity tags, health score, runs, variant count, cycle time, observed time).

### A. AT-A-GLANCE COMPREHENSION

#### A1. Verdict-first / hero metric (one number reads before everything else)
- **Pattern:** Establish a single primary "verdict" the eye lands on first, with 3–5 supporting metrics ranked below it; never present 4+ equal-weight tiles. Visual hierarchy decides what reads first. ([UXPin][uxpin], [Improvado][improvado])
- **Who does it well:** Stripe (one headline figure dominates, everything else is secondary); Amplitude (a lead chart/metric anchors each board); UiPath Process Mining "Summary dashboard" leads with a KPI bar where the most important KPI is emphasized. ([UiPath summary][uipath-summary], [Improvado][improvado])
- **Ledgerium application:** The portfolio health score is *already* the natural hero — but it's currently tied for attention with three other tiles + a duplicate gauge. **Promote one verdict line** (health score + the single most important computed signal, e.g. "88 — healthy; 12 of 16 workflows drive 80% of observed time") and **demote the KPI tiles to a smaller supporting row.** Kill the duplicate: show the gauge OR the tile, not both.
- **Benefit:** at-a-glance. **Effort:** S (recompose existing TopBand; no new data).

#### A2. KPI strip with deltas + sparklines (each tile says its own trend)
- **Pattern:** A horizontal KPI bar of headline numbers, each carrying a period-over-period delta and a tiny sparkline so "the number AND its direction" read together. Right-align numerics; group related KPIs. ([UiPath dashboards/KPIs][uipath-kpi], [Microsoft Fabric sparklines][fabric-sparkline], [Setproduct table guide][setproduct])
- **Who does it well:** UiPath/Celonis KPI bars; Power BI sparkline-in-KPI-card; Stripe Sigma KPI tiles. ([uipath-kpi][uipath-kpi], [fabric-sparkline][fabric-sparkline])
- **Ledgerium application:** Ledgerium already has the delta plumbing (`portfolioHealthScoreDelta`, `activityByWeek`). Extend the *honest* deltas to more tiles **only where a prior-period value genuinely exists** (health score has one; cycle time and total-recorded can if the API returns prior-window aggregates). Add a 1-line sparkline to Median Cycle Time and Total Workflows from `activityByWeek`. Where no prior period exists, render "—" (the codebase already does this honestly).
- **Benefit:** at-a-glance. **Effort:** M (sparkline component + ensure API returns prior-window aggregates; render "—" otherwise).

#### A3. "What changed" / narrative takeaway (verdict sentence, not just numbers)
- **Pattern:** Explicitly state the takeaway in plain language — "what changed, why it matters, what to do" — above the data, not buried in it. 2026 BI tools lead with the narrative. ([IWU data storytelling][iwu], [Devimus][devimus], [Parseable][parseable])
- **Who does it well:** Dot (AI narrative analysis with full audit trail per insight); Amplitude insight summaries; the modern "data storytelling" pattern. ([getdot][getdot], [parseable][parseable])
- **Ledgerium application:** **This is Ledgerium's strongest natural fit and its moat made visible.** The `NarratorSummary` + `topInsight` already exist but are generic ("Your 16 workflows average a health score of 88"). Make the narrator **verdict-first and evidence-linked**: "Step 2 in *Approve Expense Report* is your top bottleneck (observed in 5 of 5 runs) → investigate step owner," with the sentence **linking to the evidence** that produced it. Because Ledgerium is observed-only, every narrator claim can cite the runs it's derived from — no competitor's AI summary can do this with a deterministic trace. Do NOT fabricate "why" or predictions — only state what the observed evidence supports.
- **Benefit:** at-a-glance. **Effort:** M (richer narrator template wired to existing insight/evidence IDs).

#### A4. Status color system (consistent semantic palette + non-color redundancy)
- **Pattern:** A small, consistent semantic color system (e.g. green/amber/red bands) applied identically everywhere, with shape/label redundancy for accessibility. Visual hierarchy + grouping reduce cognitive load. ([UXPin][uxpin], [IxDF progressive disclosure][ixdf])
- **Who does it well:** Process-mining tools' frequency/time heat coloring; Looker/Sigma conditional formatting; Power BI bullet/threshold coloring. ([uipath-charts][uipath-charts])
- **Ledgerium application:** Ledgerium already has a 3-band health system (red <60 / amber 60–79 / green ≥80) and dot indicators. **Audit for consistency** — ensure the same thresholds + colors drive the header score, the gauge, the tile, the row band, and the opportunity bar so a color means exactly one thing across the whole page. Keep the dot+label redundancy already present.
- **Benefit:** at-a-glance. **Effort:** S (consistency audit; tokens already exist).

#### A5. Scannable dense list (right-aligned numbers, one wrap column, sticky header, ellipsis+tooltip)
- **Pattern:** Left-align text, **right-align all numerics** (durations, counts, percentages, scores); reserve wrapping for ONE description column; sticky header on scroll; single-line ellipsis + tooltip for overflow; zebra/row-hover for tracking; trailing kebab for row actions. ([Setproduct][setproduct], [Pencil & Paper][pencilpaper], [UX Planet][uxplanet])
- **Who does it well:** Looker/Sigma data tables; Linear's list rows; enterprise BI grids. ([setproduct][setproduct])
- **Ledgerium application:** The workflow list already has customizable columns, sort headers and a kebab. **Enforce right-alignment on all numeric columns** (cycle time, runs, steps, health score, variant count), add a **sticky table header** (and consider freezing the Workflow-title column on horizontal scroll), and add a **secondary disambiguator under the title** (primary system + last-run relative time) so near-identical titles are still scannable — directly fixes the "Approve Expense Report ×10" problem visible in the Pareto screenshot.
- **Benefit:** at-a-glance + navigation. **Effort:** M (alignment + sticky header + subtitle line).

#### A6. Progressive disclosure (summary first, detail on demand)
- **Pattern:** Show the 3–5 most important things first; push detail into drilldowns, expandable rows, and tabs. Reveal capability as it becomes relevant. ([IxDF][ixdf], [UXPin][uxpin], [GitNexa][gitnexa])
- **Who does it well:** Linear (command palette/features revealed on readiness); Stripe (detail behind expanders); process-mining variant sliders (happy-path first, zoom to variants). ([uipath-variants][uipath-charts], [saasui-flows][saasui])
- **Ledgerium application:** The Library / Measure&Analyze lens split *is* good progressive disclosure. Extend it: (1) the all-green TopBand should **collapse to a thin summary bar when nothing needs attention** (reclaim the vertical space the four-identical-tiles currently waste), expanding on click; (2) make workflow rows **expandable** to reveal the evidence/variant detail inline instead of forcing a full-page navigation; (3) keep the LSS Pareto as the "zoom-in" lens it already is.
- **Benefit:** at-a-glance + navigation. **Effort:** M.

### B. NAVIGATION & LEARNABILITY

#### B1. Empty state as the tutorial (first-run guidance is the dashboard)
- **Pattern:** The empty state isn't an apology for missing data — it's a step-by-step setup guide that walks the user to first value. ([SaaSUI examples][saasui-examples], [Procreator][procreator])
- **Who does it well:** Stripe (empty integration page = inline step-by-step with code); Amplitude (role-based onboarding inside the dashboard). ([saasui-examples][saasui-examples], [procreator][procreator])
- **Ledgerium application:** Ledgerium already suppresses the band at 0 workflows and shows a `WDC2-P05` activation prompt — good. Strengthen it into a **3-step first-run guide on the workflows page itself**: (1) Install the recorder extension → (2) Record your first browser workflow → (3) See it measured here. Tie the steps to the real install/record events the product already fires. This is honest (no fake data) and turns the empty workflows page into the activation surface.
- **Benefit:** navigation/learnability. **Effort:** M.

#### B2. Saved views / named views (encode a question, return to it)
- **Pattern:** Let users save a filter+column+sort configuration as a named view and switch between views as first-class navigation — not re-filtering from scratch each visit. ([UiPath dashboards][uipath-intro], [GitNexa][gitnexa])
- **Who does it well:** Looker/Sigma saved views; Amplitude saved charts; process-mining saved dashboard filters. ([uipath-intro][uipath-intro])
- **Ledgerium application:** **Already substantially built** — `SavedView` CRUD + preset chip rail (Automation Candidates, Needs Attention, Standardize, etc.) exist. The gap (flagged in source as deferred): preset/saved-view **apply currently changes columns but not the row filter** (`handleApplySavedView` / `handleApplyPreset` set `visibleColumns` only). **Close the FilterState↔FilterSet apply gap** so a chip actually filters rows — this is the single highest-leverage navigation fix because the chips *look* like navigation but don't fully navigate yet.
- **Benefit:** navigation. **Effort:** M (wire the deferred filter apply).

#### B3. Command palette (keyboard-first jump-to-anything)
- **Pattern:** A ⌘K command palette to jump to any workflow, filter, lens, or action — revealed when usage signals readiness, not forced on day one. ([SaaSUI flows][saasui], [GitNexa][gitnexa])
- **Who does it well:** Linear (the canonical example); Stripe; Amplitude. ([saasui][saasui])
- **Ledgerium application:** Add a ⌘K palette scoped to: jump to a workflow by name, apply a preset/lens, jump to Measure & Analyze, open the column picker. Source it from the in-memory `allWorkflows` + the existing preset catalog — no new backend. Reveal a subtle "Press ⌘K" hint after the user has ≥N workflows.
- **Benefit:** navigation/learnability. **Effort:** M.

#### B4. Control discoverability + inline help/tooltips (teach in context)
- **Pattern:** The best 2026 onboarding is "invisible" — a tooltip when a control is first reached, an inline hint beside a control, a "what's next" nudge after a milestone. Teach in small doses tied to the current task. ([SaaSUI examples][saasui-examples], [GitNexa][gitnexa])
- **Who does it well:** Linear, Amplitude role-based guidance, Stripe progressive hints. ([saasui-examples][saasui-examples])
- **Ledgerium application:** Add **definition tooltips** to every computed metric the user can't be expected to know on sight — "Cycle time = observed wall-clock per run," "Automation candidate = opportunity tag `automate` (health ≥ 40 + repetition)," "Health score = 4-component composite." Crucially, each tooltip should be able to say **"derived from N observed runs"** — reinforcing the evidence-linked moat. First-time hints on the Lens switcher and Columns picker.
- **Benefit:** learnability. **Effort:** S–M (tooltips on existing metrics; copy review by growth-strategist).

#### B5. Drill paths (clear, reversible summary→detail navigation)
- **Pattern:** Every summary element drills to its detail and back; KPIs link to the rows that compose them; charts link to the underlying traces. Process-mining: toggle Frequency/Time, slide variants, drill to traces. ([ProcessMind analyze][processmind], [uipath-variants][uipath-charts])
- **Who does it well:** Celonis/UiPath variant→trace drill; Looker drill-to-row. ([uipath-charts][uipath-charts])
- **Ledgerium application:** Make the at-a-glance surfaces **clickable into the list filtered to their cause**: the "Automation Candidates" tile → list filtered to `automate`; the Pareto "vital few" bars → those workflow rows; the narrator bottleneck sentence → that workflow's evidence. The OpportunityBar already does this (segment click → filter) — extend the same affordance to the KPI tiles and the narrator. Always reversible (clear-filter chip already exists).
- **Benefit:** navigation. **Effort:** S–M (wire existing tiles to existing filter handlers).

#### B6. Comparison / "vs prior period" framing as a first-class control
- **Pattern:** A period selector that drives comparison everywhere, so every metric can show "vs last period." Default the process-intelligence view to the full event log (not a rolling window). ([Improvado][improvado], [Gartner process-mining][gartner])
- **Who does it well:** Stripe Sigma date-compare; Celonis full-event-log default. ([gartner][gartner])
- **Ledgerium application:** Ledgerium already defaults to "All time" (correct per process-intelligence convention) and has a time-range select. **Make the time-range a true comparison driver**: when a bounded range is chosen, show the per-tile "vs prior equivalent window" delta honestly (render "—" when the prior window has insufficient data — the codebase's existing honesty pattern). Do not invent deltas for "All time."
- **Benefit:** at-a-glance + navigation. **Effort:** M (API prior-window aggregates).

---

## 3. Anti-patterns to avoid (honesty guardrails)

- **No fabricated predictive metrics.** 2026 BI trend is descriptive→predictive, but Ledgerium is observed-only. Do NOT add forecast/ML-projection numbers we can't trace to evidence. State only what observed runs support.
- **No BPMN/sigma "theater."** Don't render Six-Sigma DPMO/capability indices or a full BPMN model unless the data genuinely backs them. The LSS lens is honest *because* it's a Pareto of actually-observed time — keep it evidence-bounded.
- **No metric duplication for visual filler.** The triple-88 (header/tile/gauge) is the cautionary example — one verdict, supporting detail, no triplication.
- **No deltas without a real prior period.** Render "—", never a zero or a guessed value.
- **Don't reveal the command palette / advanced controls on day one.** Progressive disclosure: surface them on readiness.

---

## 4. Strengths to preserve

The dashboard already does several world-class things — these should be protected, not refactored away:
- The **Library / Measure & Analyze lens split** (good progressive disclosure; client-only re-frame).
- The **evidence-linked narrator + insight chips** (the moat — strengthen, don't replace).
- The **clickable OpportunityBar → filter** drill (extend this affordance pattern).
- The **honest "—" rendering** for absent data (a discipline most competitors lack).
- **All-time default** for the time range (correct process-intelligence convention).
- The **column customization + preset/saved-view scaffolding** (finish the filter-apply, don't rebuild).

---

## 5. Sources

- [UXPin — Dashboard Design Principles: The Definitive Guide (2026)][uxpin]
- [Improvado — What is a KPI Dashboard? (2026)][improvado]
- [IxDF — What is Progressive Disclosure? (updated 2026)][ixdf]
- [UiPath Process Mining — Summary dashboard][uipath-summary]
- [UiPath Process Mining — Dashboards and KPIs][uipath-kpi]
- [UiPath Process Mining — Working with dashboards and charts (variants/frequency-time)][uipath-charts]
- [UiPath Process Mining — Introduction to dashboards][uipath-intro]
- [Gartner Peer Insights — Process Mining / Process Intelligence Platforms 2026][gartner]
- [ProcessMind — Process Analytics & Dashboards (bottleneck detection)][processmind]
- [SaaSUI — SaaS Onboarding UX Examples (Stripe/Linear/Amplitude patterns)][saasui-examples]
- [SaaSUI — SaaS Onboarding Flows That Convert in 2026][saasui]
- [Procreator — SaaS Dashboards That Nail Onboarding][procreator]
- [GitNexa — SaaS Dashboard UX Patterns: 2026 Guide][gitnexa]
- [IWU — Data Storytelling: Turn Dashboards Into Decisions (2026)][iwu]
- [Parseable — Best Dashboarding Tools 2025 (narrative/why-it-changed)][parseable]
- [GetDot.AI — Best BI Tools for Data Visualization 2026 (AI narrative + audit trail)][getdot]
- [Devimus — Analytics & KPIs in 2026][devimus]
- [Setproduct — Data Table UI Design Reference (2026)][setproduct]
- [Pencil & Paper — Enterprise Data Table UX Patterns][pencilpaper]
- [UX Planet — Best Practices for Usable Data Tables][uxplanet]
- [Microsoft Fabric — Sparklines in tables/KPI cards][fabric-sparkline]

[uxpin]: https://www.uxpin.com/studio/blog/dashboard-design-principles/
[improvado]: https://improvado.io/blog/kpi-dashboard
[ixdf]: https://ixdf.org/literature/topics/progressive-disclosure
[uipath-summary]: https://docs.uipath.com/process-mining/automation-cloud/latest/user-guide/summary-dashboard
[uipath-kpi]: https://docs.uipath.com/process-mining/automation-cloud/latest/user-guide/dashboards-and-kpis
[uipath-charts]: https://docs.uipath.com/process-mining/automation-cloud/latest/user-guide/working-with-dashboards-and-charts
[uipath-intro]: https://docs.uipath.com/process-mining/automation-cloud/latest/user-guide/introduction-to-dashboards
[gartner]: https://www.gartner.com/reviews/market/process-mining-platforms
[processmind]: https://processmind.com/product/analyze
[saasui-examples]: https://www.saasui.design/blog/saas-onboarding-ux-examples
[saasui]: https://www.saasui.design/blog/saas-onboarding-flows-that-actually-convert-2026
[procreator]: https://procreator.design/blog/saas-dashboards-that-nail-user-onboarding/
[gitnexa]: https://www.gitnexa.com/blogs/saas-dashboard-ux-patterns
[iwu]: https://www.indwes.edu/articles/2026/01/data-storytelling-managers-dashboards-into-decisions
[parseable]: https://www.parseable.com/blog/predictive-dashboarding-tools
[getdot]: https://www.getdot.ai/blog/bi-tools-for-data-visualization
[devimus]: https://devimus.com/blog/analytics-kpi-guide-2026
[setproduct]: https://www.setproduct.com/blog/data-table-ui-design
[pencilpaper]: https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables
[uxplanet]: https://uxplanet.org/best-practices-for-usable-and-efficient-data-table-in-applications-4a1d1fb29550
[fabric-sparkline]: https://community.fabric.microsoft.com/t5/Service/When-will-Sparklines-amp-Bullet-Graph-Visualisations-be/m-p/1414

---

## 6. Top 8 adoptable patterns (ranked)

| # | Pattern | Who does it well | Ledgerium application | Benefit | Effort |
|---|---------|------------------|----------------------|---------|--------|
| 1 | **Verdict-first / hero metric** (one number reads first; kill the triple-88) | Stripe, Amplitude, UiPath summary | Promote one health verdict line + single key signal; demote KPI tiles to a smaller supporting row; show gauge OR tile, not both | At-a-glance | S |
| 2 | **Evidence-linked "what changed" narrator** (verdict sentence that cites its runs) | Dot, Amplitude, data-storytelling | Make `NarratorSummary`/`topInsight` verdict-first and link to the evidence runs that produced it — the moat made visible; observed-only, no fabricated "why" | At-a-glance | M |
| 3 | **Finish saved-view / preset filter apply** (chips that actually navigate) | Looker, Sigma, Amplitude | Close the deferred FilterState↔FilterSet gap so preset/saved-view chips filter rows, not just columns | Navigation | M |
| 4 | **Scannable dense list** (right-align numerics, sticky header, title subtitle) | Looker, Sigma, Linear | Right-align all numeric columns, sticky table header, add system + last-run subtitle under title (fixes near-duplicate rows) | At-a-glance + nav | M |
| 5 | **Drill paths from at-a-glance surfaces** (KPI/Pareto/narrator → filtered list) | Celonis, UiPath, Looker | Wire KPI tiles + Pareto bars + narrator sentence to the existing filter handlers (OpportunityBar already does this) — reversible | Navigation | S–M |
| 6 | **KPI deltas + sparklines** (number AND direction together) | UiPath/Celonis KPI bar, Power BI | Add honest deltas + 1-line sparklines from `activityByWeek` to tiles where a prior period genuinely exists; "—" otherwise | At-a-glance | M |
| 7 | **Empty state as first-run tutorial** (workflows page = activation surface) | Stripe, Amplitude | Turn the 0-workflow prompt into a 3-step guide (install recorder → record first workflow → see it measured), tied to real product events | Learnability | M |
| 8 | **Inline help / metric tooltips** ("derived from N observed runs") | Linear, Amplitude, Stripe | Definition tooltips on every computed metric; each can cite the observed-run count — reinforces evidence-linked moat; first-time hints on lens + columns | Learnability | S–M |

**Quick wins (do first):** #1 (S), #5 (S–M), #8 (S–M) — all low effort, high at-a-glance/learnability return, no new backend.
**Highest strategic leverage:** #2 (narrator-as-moat) and #3 (finish the filter apply so the navigation chips actually work).
