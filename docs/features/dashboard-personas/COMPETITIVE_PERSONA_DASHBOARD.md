# Dashboard Paradigms by Persona — Competitive Benchmark
**Ledgerium AI** · 2026-06-14 · Analysis only (read-only agent output, persisted by coordinator)

## Dashboard-type taxonomy (BI consensus)
Operational · Analytical · Strategic · Tactical · Contextual. Foundational UX = **Shneiderman's mantra:
overview first → zoom & filter → details on demand.** Research: **61% of users ignore features built for
other roles** → role-aware IA (separate views/lenses over shared data) is the recommended pattern
(Looker LookML, Power BI/Tableau report roles, Tableau "persona dashboards").

## LSS / process-improvement archetypes (Celonis, UiPath, Signavio, Apromore, iGrafx, Minitab)
| Archetype | Shows |
|---|---|
| Baseline / Discovery | as-is process graph + **happy-path %** + variant distribution; **Variants slider** (spaghetti→clean, animated) |
| Performance / Cycle Time | mean/median/stddev/percentiles per step + end-to-end; histogram + run/control chart |
| Conformance / Control | % on-path, deviation hotspots, rework, first-time-right |
| Opportunity / Pareto | which steps/variants drive 80% of delay/cost |
| Improvement tracking | before/after vs target over time (DMAIC Control) |
UiPath's Summary dashboard = 6 KPIs (traces · avg throughput · first-time-right · events · avg event cycle ·
automation rate). Minitab = the statistical depth (control charts, Cp/Cpk, Pareto) — requires ≥20–25 subgroups.

## Product/UX usage archetypes (Pendo, WalkMe, FullStory, Amplitude, Contentsquare)
| Archetype | Shows |
|---|---|
| Page/Feature inventory | pages/features, visit counts, time-on-page, adoption % |
| Flow / Path analysis | observed paths before/after a page (Amplitude **Journeys**, Pendo Paths) |
| Funnel / completion | step drop-off through a named task |
| Frustration / struggle | rage/dead/error clicks, U-turns, backtracking |
| Adoption coverage | which pages/features used by what % |
| Session replay / zone heat | per-session playback; element-level engagement |
**WalkMe** specifically serves the PeopleSoft/Workday/SAP internal-app surface Ledgerium targets.

## Documentation / baseline archetypes (Scribe/Optimize, Tango, Lucidchart, iGrafx)
Linear best-path/SOP (annotated steps + screenshots) · branching flow · **deviation/variance vs the
documented path** · coverage map · **drift tracking** (Scribe Optimize = continuous baseline from real work).

## Recommendation: a persona-LENS switcher over one shared spine
The strongest pattern for Ledgerium — proven by role-based BI + Shneiderman + the structural fact that the
SAME recordings feed all three:
- **Measure** (LSS): cycle time + variation + Pareto + conformance/best-path deviation + stability.
- **Understand** (Product/UX): app/page/feature usage + paths + funnel + coverage + friction (high-variance/backtrack).
- **Document** (Baseline): best/standard path + per-step deviation + drift + exportable SOP.
The lenses are presentations of the same evidence, not separate data products — **Ledgerium's structural moat**:
Celonis needs ERP event-log extraction, Pendo needs instrumentation, Scribe needs manual recording; Ledgerium
captures all three audiences' data automatically from one extension session.

**Category-first differentiators to lean on:** N-attribution beside every statistic ("47 runs · 4m 32s"); the
happy-path slider; observed-only paths (exact, not probabilistic); minimum-N gating surfaced as context, not hidden.

## Sources
Celonis (process overview; conformance checker; cycle-time + LSS blogs); UiPath PM (summary dashboard; automation
potential); SAP Signavio (process intelligence; conformance widget); Apromore (key features); iGrafx (process
mining + Six Sigma + VSM); Minitab/ILSSI (control charts); Six Sigma DSI (performance dashboard); Pendo; WalkMe
(+Workday); FullStory; Amplitude (Journeys); Contentsquare; Scribe Optimize; Tango; Lucidchart; Miro; Yellowfin/
Klipfolio (dashboard types); UXPin/FuseLab (role-based design); Shneiderman mantra; Looker/Power BI/Tableau
(persona dashboards). Full URLs in board transcript.
