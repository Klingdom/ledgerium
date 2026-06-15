# PM Persona Dashboard — Workflow Library Paradigm Rethink
**Ledgerium AI** · 2026-06-14 · Product Manager agent · Define phase (no code)

---

## Purpose

The prior dashboard-redesign board review (DASHBOARD_REDESIGN_REVIEW_001.md, 2026-06-12)
identified 24 tactical improvements to the existing library-list paradigm — sort fields,
KPI tiles, visual system, toolbar consolidation. That work is sound and should proceed.

This document asks a more foundational question: **is a single workflow-library list the
right primary paradigm for three structurally different user audiences, or does serving
those audiences require a different architectural choice at the dashboard level?**

Honesty invariant throughout: every metric and visualization cited here is grounded in
data computable from the existing `GET /api/workflows` response plus the
`packages/intelligence-engine` outputs. Fabricated, unmeasurable, or Path-C-dependent
capabilities are flagged explicitly.

---

## 1. Personas and Jobs-To-Be-Done

### 1.1 Persona A — Process Improvement Practitioner (Lean / Six Sigma)

**Who they are.** Lean Six Sigma Green Belt, Black Belt, or equivalent continuous-
improvement practitioner. May be titled "Process Engineer," "Operations Excellence
Manager," "Quality Analyst," or "CI Lead." Typically works in manufacturing, healthcare,
financial operations, or shared-services environments. Uses DMAIC (Define, Measure,
Analyze, Improve, Control) as a structured methodology.

**What they bring to the dashboard.**

| Question | DMAIC phase | Implication for Ledgerium |
|---|---|---|
| What IS the current process? (baseline) | Define / Measure | Standard path, step sequence, page/tool sequence |
| How long does it take? (cycle time) | Measure | Mean, median, p90, standard deviation, min/max |
| How much does it vary? (variation) | Measure / Analyze | CV, sequenceStability, variant count, highVarianceSteps |
| Where does it break down? (bottlenecks) | Analyze | BottleneckReport.bottlenecks, step-position timestudy |
| Is there a standard path vs. defect paths? | Analyze | VariantSet — dominant variant frequency, similarity to standard |
| Is it getting better or drifting? (control) | Control | DriftReport — structural drift, timing drift signals |
| Can we document the best path? | Improve | SOP alignment, standard path, sopReadiness score |

**Expected metric pack (LSS frame).**
- Cycle time: mean, median, p90, standard deviation — per workflow AND per step position
- Variation: coefficient of variation, stepCountVariance, sequenceStability (0–1)
- Variants: variant count, dominant-variant frequency, % following standard path
- Bottlenecks: step positions with CV >= threshold or mean >= N × portfolio mean
- Drift: structural drift, timing drift direction and magnitude (vs. baseline)
- SOP readiness: confidence score, complete/partial/not-ready tri-state

**What the current dashboard gives them.**

Serves: health score (maps loosely to quality), opportunity tag (automate/standardize/optimize
maps to CI priority), insight chips (variance-high chip is directly useful), variation
label on the row.

Does NOT serve: no cycle-time statistics (only mean/scalar; no std-dev, no p90, no
per-step breakdown), no variant-count column by default, no bottleneck view anywhere in
the dashboard, no drift signals, no comparison of baseline-vs-current runs, no SOP
alignment view. The insight chips communicate direction but give no data for a formal
measurement document.

**Critical gap.** A Green Belt doing a DMAIC Measure phase needs numbers they can put in
a control chart or VSM. The current dashboard gives them a health score and a severity
label. That is the equivalent of a factory dashboard that says "FAIR" with no run data.

---

### 1.2 Persona B — Documentation / Best-Path Seeker

**Who they are.** Anyone who wants to capture and share how a process SHOULD be done:
compliance analysts documenting audit trails, operations managers building runbooks,
HR/L&D teams capturing onboarding flows, or individual contributors who want to record
the "right way" to do something in a SaaS tool before they hand it off or automate it.

**What they bring to the dashboard.**

| Question | Ledgerium implication |
|---|---|
| What is the best (standard) path for this workflow? | StandardPathResult — most-frequent variant |
| How confident are we it IS the best path? | confidence score, runCount, sequenceStability |
| Is the documentation complete? | sopReadiness, description, toolsUsed, tags |
| Can I share or export this? | No current capability |
| Have I documented enough runs to trust the pattern? | runCount relative to MIN_RUNS_FOR_VARIANT_DETECTION (2+) |
| What pages / tools does the process touch? | systemCoverage, toolsUsed, page titles from step data |

**Expected metric pack (Documentation frame).**
- Standard path step sequence (ordered step categories, not raw page titles)
- Confidence score and run count — "how much evidence backs this?"
- SOP readiness status (ready / partial / not_ready)
- Systems/tools used in the process
- Completeness signals: description present, tags applied, runs >= threshold
- Export or share affordance

**What the current dashboard gives them.**

Serves: sopReadiness exists in the API enrichment; systems column is in the default pack;
run count is visible; health status chips include "SOP-Ready" and "Needs Attention."

Does NOT serve: no view of the standard path steps; no "completeness checklist" for a
documentation workflow; no export; no shareable link; no read-only embed for a knowledge
base; no indication of WHICH variant is standard vs. exception. The library list treats
all workflows as equivalent regardless of documentation completeness.

**Critical gap.** This persona is documenting, not measuring. They need a record that
says "here is the verified best path, backed by N runs, with 87% confidence." The current
list shows the health score (which is a quality signal, not a documentation completeness
signal) and the opportunity tag (which says "standardize" but gives no roadmap for HOW).

---

### 1.3 Persona C — Product / UX / App Researcher

**Who they are.** Product manager, UX researcher, or digital adoption analyst at a
company running browser-based software — PeopleSoft, Workday, Salesforce, ServiceNow,
or an internal SaaS workflow. They want to understand HOW users actually navigate the
application: which pages they visit, which features they use, which paths are common,
which ones are confusing or error-prone.

**What they bring to the dashboard.**

| Question | Ledgerium implication |
|---|---|
| Which pages in the app are touched most? | page titles / routes from step data (available in extension capture) |
| Which tools / features get used together? | systemCoverage, toolsUsed per workflow |
| What is the most common path through the app? | VariantSet — dominant variant, step sequence |
| Where do users go off the expected path? | Variant deviation, exception steps |
| Which flows are long / slow / error-prone? | cycle time, errorStepFrequency, bottleneck steps |
| How do different user groups navigate differently? | Variant differences across recorded sessions |
| Which features are NEVER used in recorded flows? | gap analysis — systems/pages NOT appearing in flows |

**Expected metric pack (App research frame).**
- Page/route coverage: which pages appear, in which order, how frequently
- System/tool co-occurrence: which tools are used together in the same workflow
- Navigation patterns: dominant path vs. deviation paths
- Error step frequency per workflow (proxy for friction)
- Variant comparison: how does path A differ from path B structurally
- Coverage map: what % of known app pages appear in recorded workflows

**What the current dashboard gives them.**

Serves: systemCoverage in the stats payload; toolsUsed per workflow visible in the
Systems column; insight chips (variance-high maps to "navigation inconsistency").

Does NOT serve: no page-title/route view in the dashboard (captured by the extension
but not surfaced in the workflow list); no cross-workflow systems matrix or co-occurrence
table; no variant comparison view; no "which pages are covered vs. uncovered" gap
analysis; no feature-usage analytics framing at all. The dashboard organizes by workflow
(a recording unit), but this persona wants to organize by APP PAGE or FEATURE, then see
which workflows touch it.

**Critical gap.** This persona needs to invert the current organization: instead of
"here are my 20 workflows, each touching some pages," they want "here are the 40 pages
in my app — which workflows cover them, which don't?" The current paradigm has no
support for this inversion.

---

## 2. The Core Question — Is a Single Library List the Right Primary Paradigm?

### 2.1 What the library list does well

The existing paradigm — a sortable, filterable, column-customizable table of workflow
recordings, each with health/opportunity/system signals — is well-suited for Persona A
at the portfolio level ("which of my 20 workflows most needs improvement?") and Persona B
at the inventory level ("what have I documented so far?"). It works because:

- All three personas need to navigate a growing library of recordings.
- The column registry (32 Tier A metrics, 10 display columns) gives future depth for
  any persona's metric pack once Path C R+1 unlocks the deeper data.
- Saved views, presets, and filters already give per-persona configuration without
  requiring code changes per user type.

### 2.2 Where it breaks down

The library list breaks down in three specific situations:

1. **Persona A needs a drill-down, not a list row.** A row with a health score and a
   variation label does not satisfy the DMAIC Measure phase. The practitioner needs a
   per-workflow view showing timestudy statistics, the variant breakdown, and bottleneck
   positions — essentially a structured measurement report. The library is the index;
   the report is the destination. The current product has the index but no report view.

2. **Persona B needs a quality gate view, not a health score.** Documentation completeness
   is a different dimension from process health. A workflow can have high health (consistent,
   fast) but poor documentation (no description, no tags, never exported). The library
   list has no documentation-completeness axis; it would require a new column cluster and
   a different default sort.

3. **Persona C needs to organize by APP rather than by WORKFLOW.** A workflow is a recording
   unit. An app is the subject of research. No list of workflow rows, however well filtered,
   naturally answers "which pages in Workday are covered by my recordings?" This requires
   a pivot table or a systems/coverage view that does not exist anywhere in the current
   product.

### 2.3 Recommended model — One Library, Switchable Reporting Lenses

**Do not fragment the product into multiple dashboards.** That creates navigation
complexity, duplicates shared infrastructure (filters, saved views, column registry),
and forces users to decide which dashboard they are before they know what they want.

**Do not require role assignment at signup.** Persona-targeting via a signup flow
question ("I am a Six Sigma practitioner / documenter / product researcher") creates
conversion friction and locks users into a persona before they have experienced the
product.

**The recommended model:** a single workflow library as the organizing spine, with
a set of optional **reporting lenses** — named, switchable view modes that change
what is emphasized above the table without replacing the table.

Each lens is:
- A pre-loaded saved-view template (column preset + sort + filter + KPI tile selection)
- Activatable from a "View as..." selector or a preset chip group in the command header
- Dismissible — the user can always return to the default library view
- Additive to the existing saved-view system (no new infrastructure required beyond
  the view template catalog)

Three initial lenses map to the three personas:

| Lens | Primary Persona | Above-the-fold emphasis | Default sort | Key columns |
|---|---|---|---|---|
| **Library** (default) | All | Portfolio health + activity trend | Health score asc (worst first) | Workflow, Systems, Opportunity, Health, Last Run, Runs |
| **Measure & Analyze** | LSS (A) | Cycle-time statistics + variation distribution | Cycle time desc | Workflow, Runs, Cycle Time, Variation, Variants, Bottleneck Risk |
| **Document** | Best-path (B) | Completeness status + SOP readiness | SOP readiness asc (least complete first) | Workflow, SOP Readiness, Confidence, Runs, Systems, Last Updated |
| **App Coverage** | Product/UX (C) | Systems coverage map + page frequency | (Coverage map, not a row-sort) | Pivot: App/System as row, Workflows as sub-list |

The Library lens is what ships today (plus the Batch A/B/C improvements from
DASHBOARD_REDESIGN_REVIEW_001.md). The Measure & Analyze lens is buildable from
existing data with no backend changes. The Document lens requires one new column
(documentation_completeness, derivable from existing `computeDocumentationCompleteness`
in route.ts). The App Coverage lens is a new pivot view and is the most significant
departure — it should be planned as a separate surface, not a column set.

---

## 3. Better Reporting-Dashboard Type Options

The following types are evaluated against: (a) what data exists today, (b) which persona
it serves, (c) how much it diverges from the current architecture.

### 3.1 Types that fit our data today

**Operational inventory table (current).**
Type: row-per-entity, sortable, filterable, column-customizable.
Fits: all three personas at the library level.
Strength: familiar, deterministic, column registry already built.
Gap: no analytical or statistical framing above the table.

**KPI tile strip with delta indicators.**
Type: 3–5 aggregate metrics, each with prior-period delta and optional sparkline.
Fits: Persona A (portfolio-level measure), Persona B (documentation progress), all.
Data available today: portfolioHealthScore+delta, aiOpportunityCount, recordedThisMonth,
needsReview, sopReady, medianCycleTimeMs (new Batch B field), activityByWeek (new).
Verdict: implement. Already recommended in the redesign board review. Reuse TopBand
component (`DashboardV2Shell.tsx:34` — already wired in Batch B).

**Distribution bar (opportunity split).**
Type: 5-segment horizontal bar (automate / standardize / optimize / monitor / healthy)
with click-to-filter.
Fits: Persona A (where is the improvement focus?), all.
Data: derivable client-side from `metricsV2.opportunityTag` per workflow. Available today.
Verdict: implement as a Batch B component. Compact, high signal-to-noise.

**Trend chart (recorded over time).**
Type: weekly bar chart of workflow recordings, configurable to 30/90/all.
Fits: all three personas as a "are we making progress?" signal.
Data: `activityByWeek` — new `stats` field using `referenceNowMs` deterministic boundary;
small backend addition (computeActivityByWeek in route.ts already implemented per Batch B
imports in DashboardV2Shell.tsx).
Verdict: implement. Single most universally expected dashboard chart.

**Process Health Donut.**
Type: 2-segment (healthy/at-risk) or 3-band (good/fair/poor) donut chart.
Fits: Persona A (quality overview), management reporting.
Data: derivable client-side from `metricsV2.healthScore.overall` per workflow using
60/80 thresholds already in CommandHeader.tsx.
Verdict: implement as small supplement to KPI tiles, not as primary chart.

### 3.2 LSS-specific types (Persona A)

**Pareto chart (improvement-impact ranking).**
What it is: bars sorted descending by impact metric (cycle time × frequency), with a
cumulative line — the 80/20 view of where to focus improvement effort.
Data: cycle time (`metricsV2.avgTimeMs`) × run count (`processDefinition.runCount`),
both available today. "Impact" = avgTimeMs × runCount = total time consumed by the process.
Fits: Persona A Analyze phase — identifies the highest-leverage improvement target.
Verdict: high-value for Persona A, unusual for a general library dashboard. Should be
a Measure & Analyze lens component, not part of the default Library view. Buildable
with no backend changes. Recharts BarChart + ReferenceLine pattern.

**Control chart (statistical process control).**
What it is: time-series of cycle time observations with UCL/LCL (mean ± 3σ) control limits.
Data: requires per-run timestamps and durations. These do NOT exist today — only aggregate
`avgDurationMs` and `medianDurationMs` per workflow. A true control chart requires
Path C R+1 `process_run_snapshot` table.
Verdict: defer to Path C R+1. Do not fabricate with aggregate data.

**Value stream map (VSM) visualization.**
What it is: swim-lane or linear diagram showing process steps with time annotations and
wait-time gaps.
Data: step-position timestudy (`TimestudyResult.stepPositionTimestudies`) is computable
by the intelligence engine but not surfaced in the current API response. Step categories
(not raw page titles) are privacy-safe outputs. Per-step mean/median durations available.
Verdict: the data foundation exists in the intelligence engine and could be surfaced in
a per-workflow detail panel (the slide-in panel already in the backlog as WDC2-P07 row
#106). A simplified step-sequence view (step category + mean duration per position) is
the highest-value Persona A addition that does not require Path C R+1. Flag as a P1
enhancement to the detail panel, not a library-level chart.

**Variance / box-plot distribution.**
What it is: box plot of cycle time distribution per workflow, showing median, IQR, whiskers.
Data: requires per-run durations. Does NOT exist today (only mean and median aggregate
scalars). A box plot requires the full distribution. Cannot be done honestly until
Path C R+1 lands.
Verdict: defer. Show CV and variation label as proxies today.

### 3.3 Product-analytics / UX research types (Persona C)

**Systems coverage matrix.**
What it is: rows = unique tools/systems in the library; columns = workflows; cells =
whether that system appears in that workflow. Compact heatmap.
Data: `stats.systemCoverage` (system name + workflowCount) is available today. Cross-
workflow coverage is derivable client-side from `toolsUsed` per workflow. Full matrix
is computable without backend changes.
Verdict: implement as the App Coverage lens above-the-fold element. Novel for Ledgerium;
directly answers the Persona C organizing question.

**Page / route frequency bar.**
What it is: horizontal bar chart of most-frequently-visited page titles across all
workflows, with click-to-filter to workflows containing that page.
Data: page titles are captured by the extension in step data but are NOT currently
exposed in the `GET /api/workflows` route. They exist in `ProcessDefinition` as part
of the recorded step sequence but are not projected into `WorkflowRowData`. This
requires a backend addition.
Verdict: defer to a future iteration. Flag as a Path C milestone for Persona C.

**Path flow / Sankey diagram.**
What it is: directed graph of transitions between steps/pages, width proportional to
frequency.
Data: requires per-step transition data aggregated across runs. Not available today.
Verdict: long-term vision item. Flag for the AI Integration Platform phase (AI
recommendations need a "flow visualization" landing zone per WDC2-P07 slide-in panel
design).

### 3.4 Strategic / portfolio types (management)

**Portfolio roll-up table.**
What it is: aggregated view by team, department, or portfolio group, each row showing
a team's workflow count, average health, automation candidate count.
Data: portfolio groups exist in the Prisma model (`ProcessGroupsExplorer` component
in page.tsx). The `PortfolioSidebar` component already renders a node hierarchy.
Verdict: the infrastructure for portfolio grouping exists but is disconnected from the
V2 shell. Exposing a portfolio roll-up above the library table is a P1 item — it does
not require new data, only a new aggregate query and a top-of-page component.

---

## 4. Concrete Improvements — 15 Minimum, P0 to P2

Each improvement is marked with: **P** = priority, **data** = data available today or
flagged as needing addition, **reuses** = which existing component or registry it builds
on.

---

### I-01 — Measure & Analyze Lens (Persona A preset template)
**P0 | Reuses: presets.ts, column registry, saved-view system**

Create a "Measure & Analyze" preset template that:
- Sets visible columns to: Workflow, Runs, Cycle Time (mean), Variation Label, Variant
  Count, Bottleneck Risk
- Applies default sort: Cycle Time descending (longest first = most impactful)
- Sets above-the-fold KPI emphasis to: Median Cycle Time, CV distribution, Automation
  Candidates

Data: all six columns are available today (Runs = run_count available; Cycle Time =
cycle_time_mean_ms available; Variation Label = computed; Variant Count = from
processDefinition.variantCount; Bottleneck Risk = computed in route.ts enrichment).

This is a named `PresetId` addition plus a `SavedView` template seeded for new users.
No backend change. The column registry already has the entries; only the preset
definition and the seed behavior are new.

---

### I-02 — Document Lens (Persona B preset template)
**P0 | Reuses: presets.ts, column registry, computeDocumentationCompleteness**

Create a "Document" preset template that:
- Sets visible columns to: Workflow, SOP Readiness, Confidence, Runs, Systems, Last
  Updated
- Applies default sort: SOP Readiness ascending (not_ready first — highest documentation
  debt visible first)
- Adds a "Documentation Completeness %" column derived from `computeDocumentationCompleteness`
  (already implemented in route.ts:63-91; currently not exposed as a ColumnKey)

`documentation_completeness` needs one new registry entry (`availability: 'available'`,
accessor reads the existing enriched field from the API response). Small additive change.

---

### I-03 — App Coverage Lens above-the-fold (Persona C)
**P1 | Reuses: stats.systemCoverage, WorkflowRowData.toolsUsed**

A new above-the-fold view mode (not a column change): a systems-coverage matrix showing
which systems appear in which workflows. Rows = unique systems from `stats.systemCoverage`;
each row shows the system name, workflow count, and a compact chip list of workflow names.
Clicking a system row filters the library list to workflows containing that system.

Data: `stats.systemCoverage` (available) + `toolsUsed` per workflow (available). No
backend change. Client-side pivot from the existing API payload.

This is new component work, not a preset. It occupies the "above the fold" slot when
the App Coverage lens is active, replacing the default KPI tile strip.

---

### I-04 — Pareto Chart in Measure & Analyze Lens
**P1 | Reuses: metricsV2.avgTimeMs + processDefinition.runCount, Recharts**

A horizontal bar chart (bars sorted by total time consumed = avgTimeMs × runCount)
with a cumulative percentage line (Pareto format). Surfaces the 80/20 rule: which
3–4 workflows consume 80% of the documented process time.

Data: both fields available today. Recharts already a dependency (admin operations
dashboard uses it). No backend change.

Render only when lens = "Measure & Analyze." Otherwise invisible, so it does not
add cognitive load to the default Library view.

---

### I-05 — Step-Position Timestudy in Workflow Detail Panel
**P1 | New component; data requires backend addition**

The intelligence engine's `TimestudyResult.stepPositionTimestudies` is computable
(analyzeTimestudy in intelligence engine) but not currently projected into the API
response or exposed in the dashboard. The detail panel (WDC2-P07, backlog row #106)
is already designed as a right-anchored slide-in.

Add a "Step Breakdown" section to the detail panel: step position, category label,
mean duration, and an optional std-dev indicator. This is the closest Ledgerium can
get to a VSM view without per-run data.

Data: requires a backend addition to project `timesudyResult` for the selected workflow
into the detail panel API call. The computation already exists; only the data projection
is new. Flag as Path C R+1 adjacent (the detail panel ships without this; the step
breakdown is a follow-on addition once the panel exists).

---

### I-06 — Drift Signal Badge on Workflow Rows (Persona A, Control phase)
**P1 | Reuses: DriftReport from intelligence engine, existing enrichment pipeline**

The intelligence engine computes `DriftReport` (structural drift, timing drift). This
signal is not currently surfaced anywhere in the library dashboard. A small badge or
column — "Drifting" / "Stable" / "New" — would give the LSS Control phase practitioner
an immediate signal that a controlled process is changing.

Data: drift detection requires baseline runs. `DriftReport` is available when
`IntelligenceInput.baseline` is provided. Today, only a single-window analysis is run
per workflow. Adding drift requires either (a) a second run window comparison in the
backend (a meaningful addition) or (b) using the existing `isStale` flag as a drift
proxy (honest: stale = not recently run = process may have drifted). Option (b) is
available today and could populate a "Stale" badge immediately.

Recommendation: ship the `isStale` stale badge now (already computed, never surfaced in
the list). Flag true drift detection as a future enhancement once per-run timestamps
land with Path C R+1.

---

### I-07 — SOP Readiness Column (default in Document Lens)
**P0 | Reuses: existing computeSopReadiness, route.ts enrichment**

`sopReadiness` ('ready' / 'partial' / 'not_ready') is computed in route.ts and included
in the API response enrichment but has NO column in the registry today. It appears only
in the health-score breakdown tooltip.

Add a `sop_readiness` ColumnKey to the registry (`availability: 'available'`, accessor
reads the existing `sopReadiness` field). Render as a tri-state pill (green/amber/gray).
Default-visible in the Document lens only.

This single addition directly serves Persona B's core question ("which workflows are
documented?") without any backend change.

---

### I-08 — Confidence Score Column
**P1 | Reuses: processDefinition.confidenceScore, existing registry**

`processDefinition.confidenceScore` (0–1) is available in the API response for every
workflow that has a ProcessDefinition row. It is the primary evidence signal for "how
trustworthy is this pattern?" — directly relevant to Persona B ("can I share this?")
and Persona A ("how reliable is my baseline?").

Add a `confidence_score` ColumnKey to the registry. Render as a percentage (0–100%)
with a gray/amber/green coloring at the same thresholds used in `computeSopReadiness`
(>80% = green / 50–80% = amber / <50% = gray).

---

### I-09 — Variant Count Column (default in Measure & Analyze Lens)
**P1 | Reuses: processDefinition.variantCount, WDC2-P02 registry extension**

`processDefinition.variantCount` is already plumbed through the API and was identified
in WORKFLOWS_DASHBOARD_REVIEW_002 as one of 8 registry entries that can flip to
`availability: 'available'` today. The WDC2-P02 work (row #101) covers this.

Make variant_count default-visible in the Measure & Analyze lens. A high variant count
(>3) is the single most actionable Analyze-phase signal: it tells the LSS practitioner
that multiple paths exist and standardization is worth investigating.

---

### I-10 — Documentation Completeness Progress Bar (Persona B above-the-fold)
**P1 | Reuses: computeDocumentationCompleteness, existing stats payload**

A single horizontal progress meter above the library table (visible only in Document
lens): "Documentation completeness: N of M workflows fully documented."

Breaking down: N = workflows with sopReadiness === 'ready'; M = total workflows.
A secondary breakout: partial (sopReadiness === 'partial') count.

Data: sopReady (`stats.sopReady`) and total (`stats.totalWorkflows`) are already in the
stats payload. No backend change.

This is the Persona B equivalent of the Portfolio Health Score — a single number that
tells them their progress toward a documentation goal.

---

### I-11 — "View as..." Lens Selector in CommandHeader
**P0 | New UI component; no backend change**

A segmented button or dropdown in the CommandHeader (beside the time-range selector)
with three options: "Library" (default) / "Measure & Analyze" / "Document."

Selecting a lens:
- Applies the corresponding preset template (columns, sort, filter)
- Switches the above-the-fold component (KPI tiles → Pareto chart for LSS; KPI tiles →
  completeness meter for Document)
- Persists the selection in `UserDashboardPreference.payload` alongside column visibility
  (one new field in the persistence schema)

The App Coverage lens can be a fourth option once component I-03 ships.

This is the key architectural addition. It makes the persona-differentiation visible
and actionable without routing users to separate pages or requiring profile configuration.

---

### I-12 — Seeded "Getting Started" Templates for New Users
**P0 | Reuses: SavedView seeding at onboarding**

When a new user records their first workflow, seed three saved views automatically:
"Measure & Analyze," "Document," and "App Coverage" — with appropriate column presets
and descriptive tooltips explaining what each lens is for.

This introduces persona framing at the moment of first use without requiring a signup
questionnaire. The user discovers the lenses by exploring their first recording rather
than answering a profile question.

Data: no new data. Uses the existing SavedView persistence schema (D+3). The seeding
logic runs once at first-workflow creation.

---

### I-13 — Systems Co-Occurrence Table (Persona C, P2)
**P2 | New component; derivable from existing toolsUsed per workflow**

A table showing which tools/systems appear together most frequently across workflows.
Rows = tool A; columns = tool B; cells = count of workflows where both tools appear.

For a product team auditing Workday + Excel + email patterns, this surfaces which app
combinations define their process ecosystem.

Data: derivable client-side from `toolsUsed` arrays across all workflows. No backend
change. Compact matrix, hidden behind the App Coverage lens.

---

### I-14 — Stale Workflow Badge and Count Tile (P1, all personas)
**P1 | Reuses: isStale (computed in route.ts), stats.staleCount**

`isStale` is computed per workflow in route.ts (STALE_CREATED_DAYS=30,
STALE_VIEWED_DAYS=14) but is never rendered anywhere in the dashboard.
`stats.staleCount` exists in the API response but is unused in the V2 shell.

Two additions:
- A "Stale" badge on rows where `isStale === true` (small gray pill after the workflow
  name — same pattern as the existing HealthStatus badge concept).
- A KPI tile or insight chip showing `staleCount` with a "needs re-run" label.

For Persona A: stale = the baseline is old; the process may have changed.
For Persona B: stale = the documented path may be outdated.
For Persona C: stale = the app-usage recording needs refreshing.

---

### I-15 — Evidence Count ("Backed by N runs") in the Workflow Row
**P0 | Reuses: processDefinition.runCount, existing WorkflowRow**

Add a visible "N runs" evidence indicator to every workflow row — not as a subtext
buried inside the title cell (current behavior) but as a first-class signal readable
at a glance. Format: "12 runs" in a compact muted badge beside the workflow name, or
as a standalone sortable column.

This is the single most universally readable signal across all three personas:
- Persona A: N < 5 = insufficient for a control chart; N >= 20 = statistically meaningful
- Persona B: N < 2 = cannot trust the standard path; N >= 5 = "ready to share"
- Persona C: N >= 3 = reliable app-usage pattern

The current default pack already has `run_count` as a column (available, accessor
wired). The problem is that it is not prominently styled to communicate evidence weight.
Making it visually distinct (e.g., a small pill with a different background for N < 3,
N = 3–9, N >= 10) turns a number into an evidence-quality signal.

---

## 5. Highest-Leverage Move + Success Metrics + Open CEO Decisions

### 5.1 Single Highest-Leverage Move

**Add the "View as..." lens selector and ship the Measure & Analyze lens with its
column preset, Pareto chart, and variant-count column.**

Rationale: the lens selector does three things simultaneously that no other single
change achieves:

1. It makes Ledgerium legible to a professional audience (LSS practitioners, process
   engineers) who currently see a generic inventory list and leave.
2. It reuses the entire existing column-registry, preset, and saved-view infrastructure
   (no new persistence, no new API routes) — this is an extremely high ratio of persona
   differentiation to engineering investment.
3. It opens the upgrade path for the Document and App Coverage lenses without requiring
   them to ship in the same iteration.

The Measure & Analyze lens is the most distinctive move because no direct competitor
(Scribe, Tango, UiPath Process Mining, Celonis) presents a DMAIC framing in a browser-
based process recorder. Scribe documents; UiPath/Celonis are enterprise ERP integrations.
Ledgerium's capture-from-real-behavior moat is most defensible when it speaks the
language of the practitioner who buys on methodology, not on features.

### 5.2 Success Metrics

All metrics are observable from the existing analytics taxonomy (PostHog, `track()`
discriminated union) plus small additions.

**Activation:**
- % of new users who record ≥3 workflows within 14 days of installing the extension
  (target: >40%; baseline: unknown, needs `dashboard_bounced` data from iter-038 MDR-P09)

**Lens adoption:**
- % of users with ≥3 workflows who switch to any non-default lens at least once
  (target: >25% within 30 days of lens feature ship)
- % of users who select "Measure & Analyze" lens at least once (target: >15%)
- Lens retention: % of users who, having switched to a lens, return to it on the next
  session (target: >50%; measures whether the lens answered the user's question)

**Engagement quality:**
- Click-through rate on Pareto chart bars to the detail panel (new event:
  `pareto_bar_clicked`)
- Column picker open rate in Measure & Analyze lens vs. Library lens (expects lower
  in the lens — the lens should answer the column question without requiring picker use)

**Conversion:**
- % of Measure & Analyze lens users who upgrade to Team within 30 days (hypothesis:
  LSS practitioners are enterprise buyers who unlock on methodology validation)
- Inbound deals where the prospect mentions "process improvement" or "Six Sigma" in
  the sales notes (qualitative; requires CRM tagging)

**Honesty gate:** do not ship a success metric that cannot be measured with existing
instrumentation. All six above can be wired with additions to the existing `track()`
discriminated union in `apps/web-app/src/lib/analytics.ts`.

### 5.3 Open CEO Decisions

**CD-01 — Lens naming.**
"Measure & Analyze" maps to DMAIC language and is recognizable to LSS practitioners.
It may be too jargon-heavy for a general audience. Alternative: "Process Intelligence"
(brand-aligned, less specific). "Document" is clear. "App Coverage" may need renaming
to "App Map" or "Feature Usage." Decision: accept DMAIC terminology for the LSS lens
(it IS the ICP signal), or generalize to broader language?

**CD-02 — Lens persistence scope.**
Should the selected lens persist per-user in `UserDashboardPreference` (schema D+3,
requires a new payload field — small additive change), or should it be session-only
(simpler, but users re-select every session)? Recommendation: persist it, at the cost
of a minor schema bump.

**CD-03 — "Documentation completeness" as a metric.**
The `computeDocumentationCompleteness` function in route.ts scores presence of
description, toolsUsed, and tags (0–100%). This is a proxy metric — it does not measure
whether the documented steps are CORRECT, only whether documentation fields are populated.
CEO decision: is this metric honest enough to surface to users? Recommended answer:
yes, with label "Documentation checklist" rather than "Documentation completeness,"
and with a tooltip explaining the four scored items.

**CD-04 — App Coverage lens timing.**
The App Coverage lens (I-03) is the most differentiated for Persona C but also the most
novel departure from the current paradigm. It requires a new component (systems matrix
instead of a KPI tile strip) and is the lowest-confidence persona fit of the three
(Persona C is the least-defined ICP today). CEO decision: ship App Coverage in the same
batch as Measure & Analyze, or defer it 1–2 milestones and focus on A+B first?
Recommendation: defer; ship Library + Measure & Analyze + Document first; add App
Coverage when there is customer evidence that the research persona is a real ICP.

**CD-05 — Seeded templates vs. user-discoverable lenses.**
I-12 recommends auto-seeding three saved views for new users on first recording.
This risks cluttering the saved-view list for users who do not identify with those
personas. Alternative: surface the lenses only through the "View as..." selector,
with no auto-seeding. Decision: seed or discover? Recommendation: discover (simpler,
less presumptuous), with a one-time "Have you tried..." tooltip on the lens selector
after the user's third recording.

**CD-06 — Stale-badge display threshold.**
The stale logic (STALE_CREATED_DAYS=30, STALE_VIEWED_DAYS=14) is defined in route.ts.
At this threshold, a workflow recorded 31 days ago that the user has not re-opened in
14 days is "stale." For a library of 20 workflows, this could badge a large fraction
stale immediately after a user takes a 3-week break. CEO decision: is the current
threshold appropriate for the badge, or should the badge threshold be softer (e.g.,
60-day created / 30-day viewed) than the internal stale score threshold?

---

## Appendix A — Data Availability Summary for Persona-Specific Metrics

| Metric | Available today | Requires backend addition | Requires Path C R+1 |
|---|---|---|---|
| Cycle time (mean, median) | Yes | — | — |
| Cycle time (p90, stdDev, per-run) | — | p90 needs intelligence engine projection | Full distribution needs run-snapshot |
| Variant count | Yes (processDefinition.variantCount) | — | — |
| Sequence stability | Plumbed (intelligenceJson) but not in WorkflowMetricsOutput | Small addition to expose it | — |
| Bottleneck risk | Yes (route.ts enrichment computeBottleneckRisk) | — | — |
| Step-position timestudy | Intelligence engine computes it | Needs API projection into detail panel | — |
| Drift signals | isStale available; true drift requires baseline comparison | Backend baseline-window comparison | Per-run timestamps for full drift |
| SOP readiness | Yes (route.ts enrichment computeSopReadiness) | — | — |
| Confidence score | Yes (processDefinition.confidenceScore) | — | — |
| Documentation completeness % | Yes (computeDocumentationCompleteness in route.ts) | New ColumnKey needed | — |
| Systems coverage matrix | Yes (stats.systemCoverage + toolsUsed per workflow) | — | — |
| Page/route frequency | — | Backend addition to project page titles from step data | — |
| Pareto chart (time × frequency) | Yes (avgTimeMs × runCount, client-side) | — | — |
| Control chart | — | — | Requires per-run timestamp + duration table |
| Activity trend (weekly) | Yes (activityByWeek — Batch B addition already implemented) | — | — |
| Portfolio roll-up by group | Partial (PortfolioSidebar exists but disconnected from V2) | Aggregate query per portfolio group | — |
| Error step frequency | Yes (computeWorkflowMetrics via errorStepFrequency in intelligence engine, but not exposed in WorkflowMetricsOutput today) | Small addition to surface it | — |

---

## Appendix B — Non-Duplication Note

This document is additive to DASHBOARD_REDESIGN_REVIEW_001.md (2026-06-12). The
prior board review covers the tactical improvements (KPI tiles, sort fields, toolbar
consolidation, visual system, density toggle, saved-view improvements). This document
covers the persona layer above those improvements — specifically the "View as..." lens
model and the persona-specific component/metric packs that the lens selection activates.

The 15 improvements above (I-01 through I-15) are distinct from the 24 improvements
in DASHBOARD_REDESIGN_REVIEW_001.md except where explicitly noted as "reuses." The
sequencing recommendation is: ship DASHBOARD_REDESIGN_REVIEW_001.md Batch A (P0 sort
and column quick-wins) and Batch B (KPI tiles + trend chart) first, then introduce the
lens selector (I-11) with the Measure & Analyze lens (I-01 + I-04 + I-09) as the next
milestone.
