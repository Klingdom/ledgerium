# WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001

**Artifact type:** Multi-agent review (Mode 3-adjacent, non-counting toward improvement-loop cadence)
**Date:** 2026-04-22
**Precedent:** `DASHBOARD_V2_REVIEW_001.md` (2026-04-21) + `METRICS_DASHBOARD_REVIEW_001.md` (2026-04-22)
**Audit-intake pattern:** CLAUDE.md § Audit-Intake Pattern (MR-005 Change D-5)

---

## 1. CEO Directive

Verbatim (2026-04-22):

> Still not loving the information and layout at the top of the dashboard workflows page. Have all subagents reconsider us, filters, vital information, and leverage of the metrics engine to customize how users can view workflows on the dashboards. I thought I had provided up to 30 potential workflow metrics that should be configurable as columns or data components for the workflows dashboard.

Interpretation:
- **Primary frustration:** top-of-page (`CommandHeader` + `InsightsStrip`) does not deliver the decision signal the executive JTBD requires.
- **Primary ask:** surface the Path C metrics engine (32 Tier A metrics computable today) as user-configurable columns / data components on the v2 workflow list.
- **Secondary ask:** reconsider filters and saved-view affordances in light of that column surface.

The "30 metrics" reference reconciles to the 32 Tier A metrics (Computable Today tier) enumerated in `docs/features/dashboard-v3-metrics-engine/ARCHITECTURE_METRICS_ENGINE.md` §2 — a nine-layer catalog of 93 total metrics of which 32 are wire-up-only on v2 infrastructure, 44 Tier B need modest lift, 13 Tier C require Path C persistence, and 4 Tier D are LLM-dependent.

---

## 2. Methodology

Eight specialist agents engaged in parallel:

| Agent | Lens |
|---|---|
| `product-manager` | JTBD fit, scope discipline, default-pack recommendation |
| `ux-designer` | Information hierarchy, interaction spec, column-picker UX |
| `frontend-engineer` | Column-config data model, Radix/TanStack feasibility, iter-031 affordance preservation |
| `system-architect` | API contract, persistence schema, Tier A reachability, v2↔v3 bridge discipline |
| `analytics` | LEAD/LAG/EXPLANATORY metric classification, instrumentation plan, MDR-P09 sequencing |
| `growth-strategist` | 5-second comprehension test, empty-state activation, copy audit |
| `qa-engineer` | Persistence schema versioning, determinism guard, test-matrix strategy for 32m×15f |
| `competitive-researcher` | Celonis / UiPath / Linear / Airtable / ClickUp / GitHub Projects / Scribe Optimize patterns |

Evidence surfaces read: `CommandHeader.tsx` (183 lines) · `InsightsStrip.tsx` (182 lines) · `DashboardV2Shell.tsx` (354 lines) · `WorkflowList.tsx` (full) · `WorkflowRow.tsx` (full) · `WorkflowListFilterBar.tsx` · `WorkflowRow.test.tsx` · `/api/workflows/route.ts` · `workflow-metrics.ts` · `prisma/schema.prisma` · `packages/intelligence-engine/src/index.ts` · `ARCHITECTURE_METRICS_ENGINE.md` · `UX_FLOWS_METRICS_ENGINE.md` · `COPY_PACK_METRICS.md` · `COMPETITIVE_VALIDATION_METRICS.md` · `TEST_PLAN_METRICS_ENGINE.md` · `MEASUREMENT_PLAN_METRICS_ENGINE.md` · `METRICS_DASHBOARD_REVIEW_001.md` · `DASHBOARD_V2_REVIEW_001.md` · `IMPROVEMENT_BACKLOG.md`.

No product code changes were made during review.

---

## 3. Finding Counts

| Severity | Raw findings | Unique after dedupe | Promotion path |
|---|---|---|---|
| **P0** | 12 | **4 new WDC-P0s** + 1 scope-expansion to existing `MDR-P03` | 4 × live backlog (`Birth iter: audit-intake`); 1 × amend existing row |
| **P1** | 18 | **11** | Cold pool |
| **P2** | 14 | **10** | Cold pool |
| **P3** | 6 | **4** | Cold pool |
| **Total unique** | | **29** | |

Dedupe rule: multiple agents flagging the same defect → single row, evidence aggregated. Findings that are amplifications of existing `MDR-P01`…`MDR-P09` are NOT new backlog rows; they are sequencing rationale recorded in §5 (Dependencies).

---

## 4. Strengths to Preserve (12)

Dashboard surface elements that multiple agents flagged as already correct and must NOT regress during customization work:

1. **Iter-031 interaction affordances** — `InlineEdit` (replaces `window.prompt` on rename), `InlineArchiveConfirm` (replaces `window.confirm` on archive), `HealthTooltip` Escape/blur dismissal per WCAG 2.1 SC 1.4.13 are correct and must survive column reordering. Column 1 (name) must be `locked: true` to protect these — Frontend, QA.
2. **Three-band 60/80 health thresholds** (iter-024 tightening) — correct. Do not expand bands. Growth, Analytics.
3. **Period-over-period delta** in `CommandHeader` — correct concept, time-range bug aside. Growth, UX.
4. **Insight chip color-plus-shape-plus-text** pattern — correct a11y (never color-only). Do not regress in picker UI. UX, QA.
5. **Dismissible chips per-session (not persisted)** — correct D9/PRD §5.2 decision; preserve. UX.
6. **`track()` instrumentation pattern** from iter-030 — correct extension point for new customization events. Analytics.
7. **Adapter pattern `toMetricsInput`** — correct ring-fence between v2 route and intelligence-engine; do NOT couple route.ts directly to engine fns. Architect.
8. **`computeInsightChips()` + severity icon shapes** — correct taxonomy primitive; extend, don't replace. UX, Analytics.
9. **6-state rendering machine** (loading / error / empty / no-results / sparse / ready) in `DashboardV2Shell` — correct; extend for saved-views / picker-open states. UX, Frontend.
10. **Analytics event schema versioning** already present — extend for customization events; do not fork. Analytics.
11. **Native `<select>` for time range** — correct a11y; do not replace with Radix Select unnecessarily. UX, QA.
12. **Pinned `id`/`title`/`status` in API response** — correct projection floor; keep as always-returned even when `columns` query param is present. Architect.

---

## 5. Dependency Chain — Existing MDR P0s Gate This Work

Six of the nine METRICS_DASHBOARD_REVIEW_001 P0s are prerequisites for safe customization. Shipping customization before they close AMPLIFIES the defect class into user-visible bugs:

| Existing P0 | Amplification risk if customization ships first |
|---|---|
| **MDR-P03** `Date.now()` leaks in `route.ts` | Saved views encoding date-relative filters (`stale`, `recordedThisWeek`) will silently return different rows across reloads at day boundaries. **Scope-expansion:** QA found a NEW location — `WorkflowList.applyFilters()` line 136 (`stale` filter path uses inline `Date.now()`). `MDR-P03` row must be amended to cite both locations. |
| **MDR-P04** TZ-dependent month bucketing | Any column value derived from monthly aggregates (`arrival_rate_per_day`, `avg_runs_per_month`) will differ across user timezones — breaks Ledgerium determinism invariant. |
| **MDR-P05** Shadow v1/v2 `aiOpportunityScore`+`variationScore` divergence | Column picker exposing both `stats.*` and `metricsV2.*` fields makes the up-to-30-point divergence visible in the same row — product looks broken. **This is the single hardest prerequisite.** |
| **MDR-P06** Kebab hover-gate WCAG 2.1 SC 2.1.1 failure | Any new affordance (column picker trigger, saved-view tabs, density toggle) placed in/near the row inherits the a11y blocker. |
| **MDR-P07** `aria-controls="portfolio-sidebar"` references non-existent DOM id | Column-picker panel and saved-view modal would require similar `aria-controls` patterns — shipping while P07 is open propagates the defect. |
| **MDR-P08** Concurrent document-level Escape handlers | Adding a 4th overlay (column-picker panel / saved-view modal) linearly worsens the double-dismiss class defect. |
| **MDR-P09** Bounce rate + plan tier absent from event payload | 100% of new customization events (`dashboard_column_picker_opened`, `dashboard_column_added`, etc.) would be uncohortable from day one. Column picker must ship AFTER MDR-P09 or the measurement plan is corrupt at launch. |

**Architect, Analytics, QA, Growth all independently recommend:** resolve MDR-P01→P09 BEFORE opening column-customization implementation. The endorsed iter 034-039 MDR sequence is the critical path; customization is iter 040+.

---

## 6. P0 Findings — Promoted to Live Backlog

Four new WDC-P0s (`Birth iter: audit-intake`). Promotion follows MR-005 D-5 clause 2.

### WDC-P01 — Information hierarchy inversion at top-of-page

**Evidence:** `CommandHeader.tsx` lines 97-180. Score (28px semibold) dominates visually; page title (20px), top-insight sentence (14px secondary gray, truncated `max-w-xl`), and time-range selector compete with the score for primary-read. The element users should read first — "what is this telling me AND what do I do next?" — is styled like a subheading hint.

**Flagged by:** `product-manager`, `ux-designer`, `growth-strategist`, `analytics`, `system-architect` (5 of 8).

**Fix class:** positional rework + copy rewrite. No new engineering. `computeInsightChips` label templates extend from `{signal}` to `{signal} → {action}`.

**Acceptance:** 5-second test passes for three user states (active-with-data / new-user-0-workflows / returning-with-positive-signal). Directive copy format ("3 workflows show high variance — review now") replaces descriptive copy.

### WDC-P02 — Zero column customization surface exists

**Evidence:** `WorkflowList.tsx` hard-codes 4 columns (Name, Health Score, Opportunity, Systems). `SortField` type line 57 is closed union `'health_score' | 'name' | 'opportunity'` — 3 sortable fields. No column picker, no column-visibility toggle, no column reorder, no saved views.

**Flagged by:** `product-manager`, `ux-designer`, `frontend-engineer`, `system-architect`, `qa-engineer`, `analytics`, `competitive-researcher` (7 of 8).

**Competitive reference:** Celonis (KPI card groups + Studio Views), UiPath (6-tile strip + 13 selectable metrics), Linear (⌥V to save views + Display dropdown), Airtable (first-class view sidebar), ClickUp (density + Custom Field Manager), GitHub Projects (view tabs + field checkboxes). Ledgerium is below baseline for this product class.

**Fix class:** new contract surface. Column registry (`apps/web-app/src/lib/column-registry.ts` ~200 LOC) + filter registry (`filter-registry.ts` ~150 LOC) + column-picker UI (Radix Popover + Checkbox, drawer pattern for 30-metric scale) + API projection (Zod-validated `ColumnKey` union, 400 on unknown).

**Acceptance:** 7-column default (see §8), picker drawer with metric category grouping, column persistence, `aria-colindex` announcements, no regression of iter-031 affordances (Column 1 `locked: true`).

### WDC-P03 — Empty-state "—" portfolio score has no activation pull

**Evidence:** `CommandHeader.tsx` line 164: `{isLoading ? '—' : score}` — no branch for "loaded with zero workflows." New-user activation moment is the most consequential messaging surface in the product, and it currently renders a dash.

**Flagged by:** `growth-strategist` (1 of 8), but high impact per 5-second-test methodology.

**Fix class:** component prop-branch. ~15 LOC.

**Acceptance:** when `portfolioHealthScore === null` AND workflow count `=== 0`, render "Record your first workflow to unlock your Process Health Score" with primary CTA linking to extension install. Replaces score widget entirely in empty state.

### WDC-P04 — No versioned schema for column-config persistence

**Evidence:** No `schemaVersion` field defined anywhere in the codebase for user preferences. `Prisma.User` has no preferences relation. Any localStorage or DB implementation built without schema versioning produces uncontrolled migration surface the moment a column ID is renamed or removed between deploys.

**Flagged by:** `qa-engineer`, `system-architect` (2 of 8).

**Fix class:** contract design BEFORE implementation. Schema: `{schemaVersion: 1, visibleColumns: ColumnKey[], columnOrder: ColumnKey[], filters: FilterState, savedViews: SavedView[]}`. `ColumnKey` MUST be a closed TypeScript union (not a string) so stale references fail at compile time. Migration function required for every schema-version bump — pure function, unit-tested.

**Acceptance:** schema doc lives in `docs/features/dashboard-v3-metrics-engine/PERSISTENCE_SCHEMA.md` before any picker code ships. Any saved view referencing a removed column ID degrades gracefully (shows "1 column unavailable" notice, does not crash). E2E Scenario 4 from §10 must pass.

### MDR-P03 scope expansion (not a new row)

The existing MDR-P03 row must be amended to cite `WorkflowList.applyFilters()` line 136 as a second non-deterministic location alongside the three route.ts call sites. QA found this during review. This is a scope update on an existing live row, NOT a new backlog row.

---

## 7. P1 / P2 / P3 Findings — Held in Cold Pool

### P1 (11) — promote on slot-creation or PRD-trigger per MR-005 D-5

| ID | Title | Flagged by |
|---|---|---|
| **WDC-R01** | `SortField` closed union blocks custom-column sort | PM, QA |
| **WDC-R02** | `/api/workflows` filter logic is copy-paste; needs declarative filter registry | Architect |
| **WDC-R03** | `ProcessDefinition.intelligenceJson` not consumed by route — unlocks 4-6 Tier A Layer 3 metrics (variant_share, path_similarity, stepCountVariance) at ~60 LOC adapter cost | Architect |
| **WDC-R04** | Column picker UI must group by LEAD / LAG / EXPLANATORY taxonomy; flat 30-item list is a noise-generator not insight-generator | Analytics |
| **WDC-R05** | No baseline for "default column adherence" — shipping customization without pre-customization measurement baseline violates evidence-before-interpretation | Analytics |
| **WDC-R06** | Top insight sentence positioned as afterthought (14px secondary gray below H1); should be above or full-width banner | Growth |
| **WDC-R07** | Top insight copy is descriptive ("X shows Y"), not directive ("X shows Y — do Z"); Intelligence brand claim implies next step | Growth |
| **WDC-R08** | KPI strip not filter-responsive — users applying filter see unchanged portfolio numbers, data-honesty gap | Competitive, Growth |
| **WDC-R09** | No saved-views surface — sales-blocking gap at Team Trial evaluation ("can I set up a view for my team?") | Competitive, Analytics, Growth |
| **WDC-R10** | Column customization has zero discoverability on current top surface — capability will go unused when built | Growth |
| **WDC-R11** | Column picker drawer (Pattern E, ~320px) required instead of popover when ≥12 options; drawer affords categories + search + drag reorder | Competitive, UX |

### P2 (10)

| ID | Title | Flagged by |
|---|---|---|
| **WDC-R12** | Plan gating scattered across `canSeeHealthScores` + `isGated` — needs unified `requiresFeature: FeatureKey` per column in registry | Architect |
| **WDC-R13** | "Portfolio Health" label is engineering term; user vocabulary is "Process Health" | Growth |
| **WDC-R14** | Delta label hardcoded "vs last 30d" regardless of selected `timeRange` — trust-eroding when user selects `7d` | Growth |
| **WDC-R15** | Insight chips dismiss-only; no "see all" / "what does this mean" path | Growth |
| **WDC-R16** | `FilterState` type has no plan-tier gating field — downgraded-plan saved views must degrade gracefully | QA |
| **WDC-R17** | `WorkflowRow.test.tsx` is pure-logic unit tests (no jsdom, no React render); column-visibility `aria-hidden` / focus / resize-trap gaps uncovered | QA |
| ~~**WDC-R18**~~ **DELETED MR-011** | ~~`stale` filter 30-day hardcoded constant; no PRD definition, no unit test coverage~~ Subsumed by WDC-R14 (filter/threshold definitions) + Path D R+6 column-customization scope (each filter's threshold becomes a column-config field with PRD-citable definition). Cite `docs/meta/MR_011_META_REVIEW.md` §5.2. | QA |
| **WDC-R19** | `/api/workflows` payload varies by session; HTTP-cache impossible. MVP-acceptable but document. | Architect |
| **WDC-R20** | Saved-view URL state not defined — sharing "Fix First" view with colleague needs stable URL scheme | Analytics |
| **WDC-R21** | "30 metrics" vs "data components" framing in CEO directive — are these two features or one? | Analytics |

### P3 (4)

| ID | Title | Flagged by |
|---|---|---|
| **WDC-R22** | Typo-potential for column keys — Zod-validated `ColumnKey` union with 400 on unknown query param | Architect |
| **WDC-R23** | `colSpan={5}` hardcoded in 4 empty-state `<td>` cells — must compute from `activeColumnCount` | QA |
| **WDC-R24** | `column_set_hash` implementation risk — must SHA-1 sorted canonical keys, not display labels | Analytics |
| **WDC-R25** | Time-range selector visible label is `sr-only`; visual users scan unlabeled dropdown for a feature that gates all metric values | Growth |

---

## 8. Default Column Proposal — Reconciliation

Four agents proposed a default column set. Reconciled consensus (Analytics LEAD-classified baseline):

| # | Column | Metric Key | Classification | Locked? | Default Visible? |
|---|---|---|---|---|---|
| 1 | Workflow | `title` + `applications[]` | — | **LOCKED** | Yes (always) |
| 2 | Health Score | `process_health_score_0_100` | LEAD | LOCKED | Yes |
| 3 | Opportunity | `automation_readiness_score_0_100` + verdict tag | LEAD | Unlocked | Yes |
| 4 | Runs | `case_volume` | LEAD | Unlocked | Yes |
| 5 | Avg Time | `cycle_time_ms` (median display) | LAG | Unlocked | Yes |
| 6 | Variation | `variant_count` + label | LEAD | Unlocked | Yes |
| 7 | Systems | `system_count_per_run` + chips | LEAD | Unlocked | Yes |

**Rationale for 7:** six LEAD/LAG columns above the "add more" fold, with Column 1 carrying the iter-031 `InlineEdit` / `InlineArchiveConfirm` affordances (must be `locked: true`). Health Score is also locked — triage verdict layer per Growth recommendation. Growth proposed "3-5 columns" as first-impression anchor; Analytics proposed 7 LEAD defaults; PM proposed 7 (4 current + 3 new); UX referenced 9 from `UX_FLOWS_METRICS_ENGINE.md §2.1`. Compromise at **7 with ability to shrink to 5 via picker** = meets executive "default-smart beats configurable" (PRD_DASHBOARD_V2 §2.5) while still surfacing metrics-engine depth.

The remaining **25 Tier A metrics** are picker-selectable but NOT default-visible, grouped in drawer by category:
- **Decision columns (LEAD):** 10 metrics — completion_rate, error_rate, abandonment_rate, arrival_rate, top_variant_share, path_similarity_avg, is_bottleneck_step, application_switch_rate, standardization_score, idle_bursts_count
- **Detail columns (LAG):** 5 metrics — avg_step_duration, path_length_avg, path_length_stddev, actions_per_run, data_entry_time
- **Drill-down only (EXPLANATORY):** 17 metrics — locked to workflow detail view, NOT offered in picker

3 of the 32 Tier A metrics (`aiOpportunityScore`, date-relative aggregates, `healthScore.*` breakdown) carry `deterministic: false` flag until MDR-P03/P04/P05 close — quarantined from picker.

---

## 9. Saved Views — Reconciliation

Four agents proposed named views. Canonical 5-view set (reconciled from Analytics, Growth, UX, Competitive):

| View name | Filter | Default columns | Default sort | JTBD |
|---|---|---|---|---|
| **Automation Candidates** | `opportunity_tag = 'automate'` AND `health_score ≥ 60` | Health, Opportunity, Completion, Runs, Systems, Avg Time | Runs DESC | "What's automation-ready AND healthy enough to act on?" |
| **Needs Attention** | `health_band = 'red'` OR `completion_rate < 0.7` | Health, Completion, Error, Variation, Avg Time | Health ASC | "What is broken?" |
| **Standardize** | `variant_count ≥ 3` AND `health_band ≠ 'red'` | Health, Variation, Top Variant Share, Standardization, Runs | Variation DESC | "Where is process drift?" |
| **High Volume** | `case_volume` top quartile | Health, Runs, Avg Time, Completion, Opportunity | Runs DESC | "Where does optimization have the highest leverage?" |
| **Recent Activity** | `last_run_at` within 7d | Health, Opportunity, Last Run, Runs, Completion | Last Run DESC | "What has my team worked on this week?" |

All five are **system-defined presets** (not user-created). They are hardcoded preset chips above the filter bar. User-created saved views (via picker + filter state persistence) are a distinct capability that ships AFTER the preset chips — the CEO's "not loving the layout" frustration is materially addressed by preset chips alone, without building the full picker.

Growth proposed two additional views gated to Team plan:
- **Ready to Share** — high standardization + high completion + SOP-readiness above threshold
- **My Team's Bottlenecks** — Team-plan-gated filtered to current user's team

These ship after the canonical 5 and align with Team Trial monetization motion.

---

## 10. E2E Test-Plan Sketch (QA endorsed, 12 scenarios)

Full spec in QA review output; summarized here. To be expanded to Playwright spec when customization iterations open.

1. Default view loads with correct initial 7 columns
2. Column picker opens, adds column, column appears in `<thead>`
3. Added column persists across page reload
4. Deprecated column degrades gracefully (version mismatch)
5. Filter + custom column combinatorial test
6. Saved view save + reload + restore
7. Plan-gated column degrades correctly on free tier
8. Keyboard-only column picker: open, navigate, select, close, focus returns
9. Screen reader: column picker options have correct role + label
10. 50-row × 10-custom-column render: no overflow or truncation failure
11. Inline rename while column picker is open: Escape closes correct overlay
12. Determinism guard: same data rendered twice → identical column values

**Test-matrix strategy for 32 metrics × 15 filters:**
- Unit: exhaustive per dimension, pure-function (~141 focused unit tests)
- Integration: NIST 2-way covering array (~30-40 test cases)
- E2E: 8 risk-based targeted pairs (NOT exhaustive)
- Regression: 32 snapshot tests for canonical fixture cell values

**Determinism guards required:**
- Pure-function contract: `(workflow, context: {nowMs}) => CellValue`
- `ColumnId` as closed typed enum, not string
- Saved-view schema versioned with migration function
- `applyFilters` determinism test: two identical calls → `===` equality
- 32 Tier A metric snapshot tests for engine-output stability

---

## 11. Instrumentation Plan — 6 New Analytics Events

Extends `AnalyticsEvent` union in `apps/web-app/src/lib/analytics.ts`. All events require `plan_tier` as required property — **MDR-P09 must close first** or 100% of these events are uncohortable.

| Event | Trigger | Key decision answered |
|---|---|---|
| `dashboard_column_picker_opened` | User opens picker | Is customization a power-user feature or broadly used? |
| `dashboard_column_added` | User adds column | Which metrics are most sought? Which categories dominate? |
| `dashboard_column_removed` | User removes column | Which metrics are tried + abandoned (label/signal gap)? |
| `dashboard_preset_view_applied` | User clicks preset chip | Which of 5 presets dominates? Informs default sort. |
| `dashboard_view_saved` | User saves named custom view | Custom-view-creation rate = north star for "is customization working" |
| `dashboard_column_set_reset` | User reverts to default | Reversion rate = diagnostic signal that default is correct and picker adds friction |

All events carry `view_name`, `column_count`, `column_set_hash` (SHA-1 of sorted canonical keys), `plan_tier`.

---

## 12. Competitive Context

Reference set: Celonis, UiPath, Linear, Airtable, ClickUp, Monday, GitHub Projects, Scribe Optimize.

**Adopt (5 patterns):**
1. Filter-responsive aggregate KPI strip above the table (Celonis KPI card groups, UiPath 6-tile strip)
2. Column drawer with metric categories + search + drag reorder (Airtable field panel, ClickUp Custom Field Manager)
3. Saved views as named preset chips or sidebar tabs (Linear, GitHub Projects view tabs)
4. Density toggle (ClickUp, enterprise data-table convention)
5. "Needs Attention" pinned smart-filter prominence (decision-driven view naming)

**Avoid (3 patterns):**
1. Operator-syntax search box as primary filter (Linear's `field:value` — wrong for ops-lead audience)
2. Dashboard widget canvas / drag-drop builder (Monday — too much builder-mode, slows decision speed)
3. Celonis Studio-style analyst-authoring environment (two-class UX conflicts with democratized positioning)

**Highest strategic risk — Scribe Optimize.** Nov 2025 launch + $75M Series C. Directly overlaps on frequency / duration / variance vocabulary. Ledgerium's "30 configurable metrics" only differentiates if positioned as **evidence-linked, deterministic process dimensions** — NOT as a raw count ("30+ metrics" reads as commodity checkbox). Positioning must emphasize determinism + category depth, not count.

**"30 metrics" positioning:** frame as *named metric categories that map to decisions* ("See which workflows are ready to automate, which need standardization, which carry compliance risk — in one view") rather than *"30 metrics"*. Configurability as a **team-alignment tool** ("Operations team sees health + automation; Compliance team sees conformance + data-quality — same workflows, different views") is the highest-leverage positioning frame per Competitive-Researcher §9.

---

## 13. Open CEO Decisions (6)

**Q1 — Sequencing: serialize or parallelize?**
Architect, Analytics, QA, Growth all recommend: close MDR-P01 through MDR-P09 BEFORE opening customization implementation (iter 034-039 MDR sequence = critical path; customization = iter 040+). Parallel tracks risk delivering a customization surface that fails WCAG 2.1 SC 2.1.1 at launch and whose instrumentation events are uncohortable. **Coordinator recommendation: serialize.**

**Q2 — "30 metrics" = columns, or columns + data components (KPI strip above table)?**
Analytics and Competitive-Researcher both recommend both — the columns + filter-responsive KPI strip combination. KPI strip satisfies executive-JTBD ("what's the aggregate state of my portfolio right now?"); column depth satisfies analyst-JTBD ("drill into specific metrics for specific workflows"). Different surfaces, different users, ship both.

**Q3 — Default column count: 4 (current), 5 (PM), or 7 (Analytics/Growth)?**
Reconciled in §8 as **7 default, Column 1 + Column 2 locked, picker shrinkable to 5**. CEO confirmation requested.

**Q4 — Persistence: localStorage-only, Prisma DB, or hybrid?**
Architect recommends hybrid (server-of-truth + localStorage write-through + URL shareable override). Analytics recommends server-side. QA recommends versioned from day one. localStorage-only MVP is ~100 LOC lighter but fails cross-device (which v2 users already hit on laptop + tablet per E2E auth artifact). **Coordinator recommendation: hybrid, schema versioned.**

**Q5 — Preset saved views as iter-035 bundle (Mode 2) or iter 040+ (post-MDR)?**
Analytics: preset chips require NO new API surface, NO persistence, NO column picker — only 5 hardcoded filter preset chips in header. Could ship standalone as an iter-035 addition to the MDR-P01+P02 bundle. Directly addresses CEO's "not loving the layout" frustration today. Trade-off: extends iter-035 scope (bundling test requires one-logical-outcome check under Mode 5 guardrail 7(b)).

**Q6 — Plan-tier gating strategy for 30-column surface:**
Option A: all 30 columns available all plans (broad discovery, upgrade via saved-view sharing + Team-plan presets). Option B: free plan limited to 5 columns (conversion mechanism but "crippled" impression — conflicts with PRICING_AUDIT_001 findings). Option C: all columns free, save-custom-view gated. **Coordinator recommendation: Option C.**

---

## 14. Endorsed Iteration Sequencing

**Preserves iter 034 MDR-P06+P07 a11y bundle unchanged** per MR-007 § 5. Customization work enters iter 040+ as Path D (new).

| Iter | Area | Pick | Mode | Rationale |
|---|---|---|---|---|
| 034 | web-app | MDR-P06 + MDR-P07 a11y bundle | Mode 1 | MR-007 endorsed; a11y prerequisite to picker UI |
| 035 | web-app | MDR-P01 + MDR-P02 correctness+copy | Mode 1 | Engine trust prerequisite |
| 036 | web-app | MDR-P03 + MDR-P04 determinism | Mode 1 | **Scope-expand MDR-P03 to cite `WorkflowList.applyFilters` line 136** |
| 037 | web-app | MDR-P09 bounce rate + plan tier | Mode 1 | Instrumentation prerequisite for customization events |
| 038 | web-app | MDR-P05 shadow v1/v2 convergence | Mode 1 | Hardest prerequisite; unblocks picker safety |
| 039 | web-app | MDR-P08 concurrent Escape handlers | Mode 1 | Overlay-safety prerequisite; picker is 4th overlay |
| 040 | non-web-app | Saturation-breaker burn-down | Mode 1 | MANDATORY — iter 034-039 all web-app |
| 041+ | web-app | Path D Build — customization surface | Mode 5 (TBD) | Requires MR-005 D-7 pre-check if N ≥ 6 |

**Path D Build projection** (iter 041 earliest):
- 041: Column registry + filter registry scaffolding (WDC-P02 foundation + WDC-R01 + WDC-R02)
- 042: API projection (Zod `ColumnKey` union + 400 on unknown) + `intelligenceJson` adapter (WDC-R03)
- 043: Preset saved-view chips (Q5 Option B) + "Needs Attention" prominence
- 044: Column-picker drawer UI (WDC-P02 UI, Radix + category grouping)
- 045: Persistence — hybrid localStorage + Prisma `user_dashboard_preferences` (WDC-P04)
- 046: Top-of-page rework (WDC-P01 + WDC-P03 + WDC-R06 + WDC-R07 + WDC-R13 + WDC-R14)
- 047: Instrumentation plan wire-up (6 new events per §11)
- 048: Saturation-breaker burn-down

Projected pool trajectory with full Path D: iter 040 = ~26; iter 041-048 closes 4 WDC-P0s + ~11 WDC-Rs + cold-pool promotions ⇒ iter 048 ~18. MR-007 Q4 target ≤15 by iter 040 NOT achievable (confirmed); revised ≤15 by iter ~050 if Path D closes WDC-Rs as side effect of implementation. **CEO confirmation requested on revised burn-rate target.**

---

## 15. Governance Flags

- **MR-005 D-4 specialist-invocation gate:** Path D Build iter 041+ will trigger both (a) `system-architect` new-contract ≥200 LOC adjacency (column-registry + filter-registry + API projection surface > 500 LOC), and (b) `growth-strategist` ≥3 user-visible copy strings adjacency (§14 iter 046 top-of-page rework alone touches ≥10 strings per §4 Copy Audit). Both must be invoked **adjacent to primary, not deferred to follow-up.**
- **MR-005 D-7 Mode 5 N ≥ 6 soft cap:** If Path D Build is run as Mode 5, meta-coordinator pre-check is MANDATORY before sequence begins (iter 041+ projection N=8).
- **Area saturation:** iter 034-039 are 6 consecutive web-app picks. Area-saturation rule trips at iter 037 (3-consecutive) requiring explicit continuation acknowledgement from CEO. Iter 040 MUST be non-web-app.
- **Agent-diversity:** iter 034 rotates to `frontend-engineer` (WCAG/ARIA scope). Same-implementer 4+ trip would fire at iter 037 if `frontend-engineer` persists — MDR-P09 at iter 037 naturally rotates to `backend-engineer` + `analytics`, breaking the streak.
- **Pool-size ceiling:** pool 36 at iter 033 close → ~41 at intake of this review if all 4 WDC-P0s promote. Mode 5 hard-stop (pool > 15) applies; CEO override single-use per sequence.
- **Cool-off recharge:** counter 3/3 at iter 033 close. Iter 034 MDR-P06+P07 is top-score-eligible under pool > 8 soft ceiling ⇒ cool-off consumed at iter 034.

---

## 16. Pool Impact Summary

| Before intake | +WDC-P0s | +MDR-P03 scope | Cold pool | After |
|---|---|---|---|---|
| Pool 36 | +4 | 0 (amendment only) | 25 cold (11 P1 + 10 P2 + 4 P3) | **Pool 40** |

DASHBOARD_V2_REVIEW_001 cold pool (24 items) unchanged. METRICS_DASHBOARD_REVIEW_001 cold pool (57 items) unchanged. WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001 cold pool age = 0 at artifact close; MR-006 Change D staleness triage window = iter ~043.

---

## 17. CEO Action Required

1. **Confirm Q1 serialization** (MDR P0s first, customization iter 040+). Coordinator recommendation: yes.
2. **Confirm Q2 columns + KPI strip** scope. Coordinator recommendation: both.
3. **Confirm Q3 default column count** = 7, Column 1+2 locked, picker-shrinkable-to-5.
4. **Confirm Q4 persistence strategy** = hybrid, schema-versioned.
5. **Confirm Q5 preset chips** — ship with iter 035 (Mode 2 bundle extension) or defer to iter 043.
6. **Confirm Q6 plan-tier gating** = all columns free, save-custom-view gated to Team plan.
7. **Confirm revised burn-rate target** ≤15 by iter ~050 (original MR-007 Q4 proposal was ≤15 by iter 040, not achievable with full MDR sequence + Path D).
8. **Approve or reject** 4 × WDC-P0 auto-promotion to live backlog per MR-005 D-5 clause 2 (artifact auto-promotes on CEO acknowledgement).

No iter 034 opens, no code changes, no backlog writes until CEO decisions land.

---

**Artifact close.** Review engaged 8 specialist agents, 60 raw findings → 29 unique after dedupe, 4 WDC-P0 candidates for live-backlog promotion, 25 cold-pool rows held, 0 governance diffs proposed, 12 strengths preserved, 5 adopt-patterns + 3 avoid-patterns from competitive landscape. Coordinator recommends serialized execution (MDR first, customization iter 040+), 7-column default, hybrid persistence, preset chips in iter 035, Option C plan-gating. CEO decisions (§17) required before iter 034 opens.
