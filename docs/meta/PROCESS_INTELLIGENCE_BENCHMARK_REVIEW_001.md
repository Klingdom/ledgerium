# Process Intelligence Benchmark Review 001 (PIB-REVIEW-001)

**Date:** 2026-05-04
**Mode:** 3-adjacent multi-agent diagnostic review (NON-counting per CLAUDE.md § Operating Modes)
**Iteration slot:** Pre-iter-058 (does not increment improvement-loop cadence; precedents: MDR-REVIEW-001 iter 032; WDC-REVIEW-001 iter 033)
**Coordinator:** AI CTO orchestration
**Specialist agents engaged:** 7 (`competitive-researcher`, `product-manager`, `ux-designer`, `analytics`, `frontend-engineer`, `system-architect`, `growth-strategist`)
**Lineage:** Follows DASHBOARD_V2_REVIEW_001 (iter 026) + METRICS_DASHBOARD_REVIEW_001 (iter 032) + WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001 (iter 033) format precedent.

---

## §1. CEO Directive

> *"have subagents review current production dashboard and suggest improvements based on world class process intelligence programs and processes"*

The directive frames the review against world-class process intelligence platforms (Celonis EMS, Apromore, ABBYY Timeline, UiPath Process Mining, IBM Process Mining, SAP Signavio, Soroco Scout, Microsoft Process Mining, Minit, Scribe Optimize, Tonkean, Pega Process Mining) and asks each specialist agent to identify gaps relative to that benchmark while preserving Ledgerium's deterministic-evidence moat.

Scope: the production v2 workflow dashboard (`apps/web-app/src/components/dashboard-v2/`) plus the metrics surfaces it consumes (`workflow-metrics.ts`, `route.ts`, `analytics.ts`, `intelligence.ts`, `dashboard-columns/registry.ts`). Out-of-scope: extension capture pipeline, normalization/segmentation engines, SOP rendering, intake.

---

## §2. Methodology

7 specialist agents were engaged in parallel under this directive, each given a distinct review lens. Agents produced independent findings without inter-agent visibility. The coordinator deduplicated and reconciled across the 7 outputs.

| # | Agent | Lens | Raw findings |
|---|-------|------|---|
| 1 | `competitive-researcher` | World-class PI platform capability gap matrix (11 lenses) + 2025 competitive moves | 11 lenses + Top-10 ranked gaps |
| 2 | `product-manager` | Persona-by-persona job coverage; PRD §2 vs shipped surface | 14 (F1–F14) + Top-5 sequencing |
| 3 | `ux-designer` | Workflow-by-workflow UX flow analysis; world-class UX anchors | 16 (F1–F16) + Top-3 highest-impact |
| 4 | `analytics` | KPI surface completeness + #57 retirement evidence quality | 12 (F1–F12) + Top-3 measurement gaps + Top-3 KPI gaps |
| 5 | `frontend-engineer` | Component health + production-readiness latent fragility | 21 (F1–F21) |
| 6 | `system-architect` | Architecture decisions enabling world-class PI scale | 12 (F1–F12) + Top-3 decisions |
| 7 | `growth-strategist` | Positioning + activation + category narrative against $75M Scribe + Celonis EMS | 14 (F1–F14) + Top-5 |

**Total raw findings: 100** across 7 agents.

---

## §3. Finding Counts (post-dedupe)

| Severity | Raw | Unique after dedupe | Promotion path |
|----------|----:|--------------------:|----------------|
| **P0** (blocks external-launch / production-correctness / world-class positioning) | 17 | **12** | Promote to live `IMPROVEMENT_BACKLOG.md` rows #87–#98 with `Birth iter: audit-intake` per MR-005 D-5 clause 2 |
| **P1** (high-impact world-class-positioning gap or quality regression) | 36 | **27** | Cold pool — promote on burn-down slot (MR-005 D-5 clause 4) or PRD-trigger (clause 5) |
| **P2** (meaningful gap; quality / activation / scaling) | 30 | **23** | Cold pool |
| **P3** (polish / future-scope) | 17 | **13** | Cold pool |
| **TOTAL** | **100** | **75** | |

Pool delta at intake: **29 → 41** (12 P0 promotions; cold pool entries remain in this artifact per MR-005 D-5 audit-intake pattern).

---

## §4. Strengths to Preserve (12 items)

Preservation list — these are world-class properties Ledgerium already ships and which the P0/P1/P2 backlog must NOT regress:

1. **Deterministic event pipeline** (raw → canonical → derived) — every output traceable to source events; immutability preserved across the stack. World-class peers explicitly position around this property; Ledgerium ships it as default behavior.
2. **PostHog `disable_session_recording: true` privacy posture** (analytics.ts) — capture-grade privacy default no PI vendor in the comparison set ships out-of-the-box.
3. **38-column registry with audit-honesty IFF invariant** (`dashboard-columns/registry.ts`) — `accessor === null` IFF `availability !== 'available'`; zero "looks-like-data-but-is-fake" surface area.
4. **32 Tier A metrics architecturally enumerated** (`ARCHITECTURE_METRICS_ENGINE.md` §2; canonical 33A pending MR-014 ASK-2 remediation) with explicit Tier A/B/C/D computability classification.
5. **Empty-state machine with 6 distinct states** (`WorkflowList.tsx:47–53` `viewState`) — sparse, error, empty, normal, loading, gated — peer dashboards typically ship 2-3 states.
6. **Single-upstream-clock-boundary determinism** (`route.ts:485-487` `referenceNowMs`) closing 6 prior `Date.now()` leaks; matches XES timestamp determinism semantics.
7. **Ratcheting axe-core a11y regression gate** (`v2-a11y.spec.ts`) preventing silent moderate-violation accumulation; 4 distinct surface states gated.
8. **Plan-tier-gated tooltip with degradation copy** (`WorkflowRow.tsx` `HealthTooltip` `isGated` branch) — graceful degradation by plan tier without misleading values.
9. **`computeWorkflowMetrics` single-source-of-truth** consolidating v1/v2 shadow-function divergence (iter 039) — one engine, one verdict.
10. **Capture-phase click-counter `dashboard_bounced` instrumentation** (`DashboardV2Shell.tsx`) — bounce signal works across DOM event hierarchies competitors typically miss.
11. **Insight chip computed-signal copy** ("high execution variance → investigate consistency") — action-leading copy referencing only computed quantities; passes "no fabricated SLA / no fabricated cohort" honesty bar (MDR-P02 iter 035 closure).
12. **9 Define-phase artifacts under `docs/features/dashboard-v3-metrics-engine/`** with explicit Tier-by-Tier acceptance gates G-1 through G-7 — peer roadmaps typically ship at PRD-only fidelity.

---

## §5. Dependency Chain

PI-review findings interact with 4 active dependency chains:

1. **Path C R+1 → R+7** (revised PRD CEO approval pending; 5 pre-R+1 questions Q-ARCH-1 / Q-ARCH-2 / Q-GOV-4 / Q-MEAS-1 / DEP-08).
2. **Path D D+1 → D+6** (D+1 column registry shipped iter 056; D+2 filter registry endorsed iter 058 standing CEO directive).
3. **#57 v1 flag-retirement chain** at 10/10 engineering-complete (only 14d soak window remains).
4. **External-launch MDR-blocker gate** at 7/7 CLOSED — FULL.

PI-review introduces **no new hard dependencies** — every P0 either:
- (a) extends a Path C iteration (e.g., PIB-P01 DFG / PIB-P02 detail view fall under Path C R+5/R+6 surface);
- (b) is independently shippable (e.g., PIB-P06 ErrorBoundary, PIB-P10 category copy);
- (c) closes a known gap on shipped surface (e.g., PIB-P07 keyboard a11y; PIB-P08 userPlan race).

The architecture-level recommendation (PIB-P04 event-log abstraction; SA F1) is positioned as a Path C R+1 *prerequisite* — i.e., it should be decided before R+1 schema lands, not as a parallel iteration.

---

## §6. Per-agent findings

### §6.1 `competitive-researcher` (L17)

11 capability-lens findings + Top-10 ranked gaps:

| # | Lens | Severity | Gap | World-class anchor |
|---|------|---------|-----|--------------------|
| §1 | KPI strip | **P0** | No above-the-fold KPI strip ($USD savings + conformance score + throughput trend + case-volume delta) | Celonis Execution Capital |
| §2 | DFG/BPMN process map | **P1→P0** | No process-map visualization | Apromore automated BPMN; Celonis Variant Explorer; UiPath Process Insights |
| §3 | Conformance / variation | P1 | No conformance score, no allowlisting | Celonis Conformance Checker; SAP Signavio Root Cause on Event Graphs (July 2025) |
| §4 | Bottleneck / waste | P1 | No waiting/processing/rework decomposition | ABBYY Timeline |
| §5 | Opportunity prioritization | P1 | No $USD ROI framing on automation candidates | Celonis Execution Capital; Scribe Optimize $75M Series C ($1.3B 2025) |
| §6 | Filtering / segmentation | P1 | No multi-dimensional OLAP filter | Apromore + Celonis OLAP |
| §7 | Customization | P2 | No role-differentiated views | SAP Signavio |
| **§8** | **Trust signals / lineage** | **P2** | **"This is Ledgerium's primary moat... but invisible. Making it visible converts a technical property into a positioning claim that no peer can credibly match."** | **Highest-leverage messaging gap (verbatim)** |
| §9 | Real-time | P2 | No streaming Data-Core analog | Celonis Data Core |
| §10 | Predictive / prescriptive | P3 | Correctly deferred per PRD §13 MVP exclusion | UiPath Process Insights |
| §11 | Collaboration | P2 | No Slack/Teams integration | Celonis Orchestration Engine; UiPath task mining |

### §6.2 `product-manager` (L18)

14 persona-coverage findings (F1–F14):

| F# | Severity | Finding | Anchor |
|----|---------|---------|--------|
| F1 | **P0** | No workflow detail view (drill-through structurally absent) | PRD §7 story A-02 unshipped |
| F2 | **P0** | No trend/time-series (`WorkflowRowData` lines 55–63 no time-series fields) | PRD R+5 unshipped |
| F3 | **P0** | Executive portfolio view absent | `/dashboard/portfolio` PRD §11 R+7 net-new |
| F4 | P1 | Analyst no cross-process query (28 of 38 columns pending-path-c-r1) | Path C surface |
| F5 | P1 | Operator no actionable triggers | New |
| F6 | P1 | Zero onboarding path | WDC-P03 already in live backlog |
| F7 | P1 | Health score formula opaque | PRD §14 Q-GOV-4 unresolved |
| **F8** | **P1** | **No SOP/conformance view** — `route.ts:479,503-524` `sopReadiness` computed and returned but not rendered. **"The value is already computed and returned by the API"** — high-ROI standalone, no Path C dependency | **Net-new high-leverage** |
| F9 | P2 | Column customization absent | WDC-P02 row #75 |
| F10 | P2 | Time-window selection misleading (filters on `createdAt` not run activity) | New |
| F11 | P2 | No enterprise scale path (non-paginated) | New |
| F12 | P2 | Plan-tier upgrade CTA only at quota threshold | Partial overlap row #36 (closed iter 048) |
| F13 | P3 | Process-type heuristic not editable | New |
| F14 | P3 | `aiOpportunityScore` not sortable | New |

**Top-5 sequencing per PM**: (1) Detail view (R+6); (2) Trend (R+3); (3) Onboarding standalone Mode 1 burn-down; (4) SOP conformance no Path C dep; (5) Formula transparency.

### §6.3 `ux-designer` (L21)

16 UX-flow findings (F1–F16); Top-3 highest-impact ranking by UX agent:

| F# | Severity | Finding | Evidence |
|----|---------|---------|---------|
| F1 | **P0** | No process flow / DFG visualization whatsoever | `WorkflowRow.tsx` 6 cols no flow CTA; `DashboardV2Shell.tsx` no flow panel; `UX_FLOWS_METRICS_ENGINE.md §2` 9-col default but no flow viz |
| F2 | **P0** | Drill-down path breaks at the row boundary | `HealthTooltip` (`WorkflowRow.tsx:153-243`) stops at 4-dimension summary; `bottleneck_impact_score` + `bottleneck_step_label` defined but `pending-path-c-r1` |
| F3 | P1 | No variant explorer surface | `WorkflowRow.tsx:783` "High variation" badge no click behavior |
| F4 | P1 | No data freshness signal anywhere — **"the most under-leveraged asset relative to the codebase's actual capability"** | Add `metricsComputedAt: string | null` to `WorkflowRowData` |
| F5 | P1 | Insight chips informational not actionable | `InsightsStrip.tsx:155` `<span>{chip.label}</span>` no `recommendedAction` |
| F6 | P1 | Portfolio health score has no explainability | 28px top-right `CommandHeader.tsx:160` no tooltip |
| F7 | P1 | Time range filter disconnected from metric computation window | `WorkflowList.tsx:27-28`; `filterByTimeRange` filters on `createdAt` not computation window |
| F8 | P1 | Empty state has no activation pull (verifies WDC-P03) | `WorkflowList.tsx:465-486` |
| F9 | P2 | No frequency × duration scatter | `WorkflowRow.tsx:658` cycle time pending-path-c-r1 |
| **F10** | **P2→P0** | **Health score tooltip keyboard path still broken** — `<td onClick>` no `onKeyDown` (iter 046 scope-adjacent unclosed) | **WCAG 2.1 SC 2.1.1; ~5 LOC fix** |
| F11 | P2 | No comparison mode across workflows | No selection state, no checkbox column |
| F12 | P2 | Opportunity tags not quantified | `WorkflowRow.tsx:232-240` `aiOpportunityScore/100` only in tooltip |
| F13 | P2 | Density too low for comparison scanning | `py-ds-3` ~12px; ~12-13 rows/900px viewport |
| F14 | P3 | No workflow classification/tagging from dashboard | `KebabMenu` only Rename/Archive/Copy link |
| F15 | P3 | Sparse state warning not actionable | `WorkflowList.tsx:373-376` passive copy |
| F16 | P3 | No mobile experience | `WorkflowList.tsx:177-185` column hiding without dedicated mobile route |

**UX Top-3 highest-impact**: (1) step-level drill-down link from health tooltip; (2) data freshness timestamp on portfolio score and per-row health; (3) portfolio health score breakdown tooltip.

### §6.4 `analytics` (L23)

12 measurement findings + Top-3 measurement gaps + Top-3 KPI gaps:

| F# | Severity | Finding |
|----|---------|---------|
| F1 | **P0** | **Chip click rate denominator wrong** — `insight_chip_clicked` fires with `filterKey`/`severity` but chips render conditionally (count ≥ 2). **"Flawed denominator produces an unfalsifiable measurement."** Fix: add `chipsRenderedCount` to `dashboard_v2_viewed` |
| F2 | **P0** | **`userPlan` enrichment is a race condition** — `setUserPlanForAnalytics()` called after `/api/workflows` resolves; non-typed global `window.__ledgerium_userPlan`. **"All plan-tier segmentation of current v2 data is unreliable."** Bounce < 40% retirement gate may be based on contaminated data |
| F3 | P1 | Zero throughput-time decomposition (`flow_efficiency_pct` Tier B ~15 LOC not in `available` registry) |
| F4 | P1 | Conformance score and rework rate entirely absent (`conformance_score_0_100` Tier B ~80 LOC; `rework_rate_pct` Tier B ~20 LOC) |
| F5 | P1 | No time-series or trend data; no `metric_rollup_daily` table (DEP-04 still open) |
| F6 | P1 | `insight_chip_clicked` missing `chipPosition`, `totalChipsRendered`, `workflowCountAtClick` context |
| F7 | P1 | No confidence interval surfaced for variation/automation score |
| F8 | P2 | Activation funnel gap — no `first_dashboard_view` event |
| F9 | P2 | `dashboard_v2_sort_changed`/`filter_applied` instrumented but not in #57 retirement evidence |
| F10 | P2 | No anomaly detection or alerting (PRD_REVISED §13 MVP-excluded) |
| F11 | P2 | `dashboard_bounced` lacks workflow-count segmentation; should filter by `workflowCount ≥ 3` matching `PORTFOLIO_PRIOR_MIN_WORKFLOWS` |
| F12 | P3 | No self-service analyst surface (NS-1/NS-2 north-stars assume v3 column customization) |

**Top-3 measurement gaps blocking #57 retirement evidence quality**: F2 userPlan race; F1 chip-click denominator; F11 bounce-rate workflow-count filter.

**Top-3 KPI gaps for world-class PI positioning**: F3 flow efficiency / throughput decomposition; F4 conformance score and rework rate; F5 per-metric trend data.

### §6.5 `frontend-engineer` (L25)

21 component-health findings (F1–F21):

| F# | Severity | Finding |
|----|---------|---------|
| F1 | **P0** | **No ErrorBoundary anywhere in dashboard surface** — runtime exception in `WorkflowRow.tsx:278` `useEffect` or `HealthTooltip handleBlur:159` produces blank screen |
| F2 | **P0** | Health-score `<td>` not keyboard-accessible (`WorkflowRow.tsx:855-930`) |
| F3 | P1 | No TanStack Query/SWR (`DashboardV2Shell.tsx:145-179`) |
| F4 | P1 | `WorkflowRow` 879+ LOC no `React.memo` |
| F5 | P1 | No list virtualization |
| F6 | P1 | Filter/sort state not URL-serialized |
| F7 | P1 | `filterNowMs` captured once on initial mount (long-lived component drifts) |
| F8 | P1 | `WorkflowsApiResponse` cast without Zod parse |
| F9 | P1 | `vitest.config.ts` environment 'node' (already follow-up #53) |
| F10 | P1 | Parallel double-filter |
| F11–F17 | P2 | Hard-coded Tailwind, dead v1 surface, no Storybook, no charting lib, no prefetch, no i18n, `onCreatePortfolio` silent no-op |
| F18–F21 | P3 | `KebabMenu` arrow-key, feature-flag unused, `getColumnByKey` O(N), `sortWorkflows` not memoized |

**Single most concerning latent fragility (verbatim)**: F1 + F8 combination — *"invisible in development (TypeScript satisfied, tests pass), silent in staging (normal response shape), and total in production (full blank screen, no partial degradation, no recovery path for the user)."*

### §6.6 `system-architect` (L27)

12 architecture findings (F1–F12) + Top-3 architectural decisions:

| F# | Severity | Finding |
|----|---------|---------|
| F1 | **P0** | **No event-log abstraction (XES/OCEL alignment gap)** — *"single highest-leverage Path C R+1 prerequisite that is not yet on the live backlog"* |
| F2 | **P0** | **SQLite as production database** — trigger conditions: 50 concurrent users OR 1M `metric_fact` rows OR 2s p95 latency |
| F3 | P0 | No `metric_fact` cache (covered by Path C R+1 — NOT a new promotion) |
| F4 | P1 | No conformance-checking surface; DEP-08 still open |
| F5 | P1 | API envelope not standardized — already DV2-R10 row #85 |
| F6 | P1 | `intelligenceJson` opaque JSON string column |
| F7 | P1 | No DFG/process-map materialization — *"Ledgerium is the only PI vendor in the comparison set without process-map UX"* |
| F8 | P2 | No formal `Clock` interface (~50 LOC + refactor of 6 sites) |
| F9 | P2 | No plug-in/extensibility surface |
| F10 | P2 | No predictive layer (correctly deferred) |
| F11 | P3 | Observability gap |
| F12 | P3 | Multi-tenancy partial |

**Top-3 architectural decisions**:
1. **Event-log normal form before `metric_fact` lands** — *"Cost to decide now: 1 architecture iteration. Cost to decide later: 4-6 iterations + customer-visible regression."*
2. **Postgres migration trigger conditions before R+1.**
3. **`{data, error, meta}` envelope on `/api/workflows` before R+4 routes.**

### §6.7 `growth-strategist` (L29)

14 positioning findings (F1–F14) + Top-5:

| F# | Severity | Finding |
|----|---------|---------|
| F1 | **P0** | **Category identity split** — 3 nouns: "documentation" / "Process Intelligence" / "Workflow intelligence dashboard" |
| F2 | P0 | Empty-state no activation pull (verifies WDC-P03) |
| F3 | P0 | No period-over-period delta on v1 (v2 has it; v1 doesn't) |
| F4 | P1 | **Determinism moat invisible** — *"single piece of copy that most effectively defends Ledgerium's category position against a $75M competitor"* |
| F5 | P1 | Upgrade CTA value prop wrong (volume vs capability) |
| F7 | P1 | Sharing/collaboration absent |
| Others | P2/P3 | Per-agent enumerated |

**Top-5 (GS)**: sample-data empty-state; gated capability preview; upgrade CTA reframing; copy-link share action; determinism trust badge.

---

## §7. Cross-cutting themes (multi-agent convergence)

Themes that appeared across **2+ agents** with material content overlap:

| Theme | Agents | Reconciled severity |
|-------|--------|--------------------|
| **DFG / process-map absence** | competitive-researcher §2 + ux-designer F1 + system-architect F7 | **P0** (3-agent convergence; ux-designer specifically calls "no process flow visualization whatsoever"; system-architect calls Ledgerium *"only PI vendor in comparison set without process-map UX"*) |
| **Drill-down chain breakage / no detail view** | product-manager F1 + ux-designer F2 + frontend-engineer F2 | **P0** (PM identifies feature gap; UX identifies UX flow break; FE identifies a11y break — same surface, three lenses) |
| **No trend / time-series** | product-manager F2 + analytics F5 | **P0** (PM had as P0; analytics had as P1; reconcile P0 — without trend data, #57 retirement evidence is structurally incomplete) |
| **Trust-signal moat invisibility** | competitive-researcher §8 + ux-designer F4 + growth-strategist F4 + growth-strategist F10 | **P1** (4-agent; ux-designer called *"most under-leveraged asset"*; reconcile P1 — high-leverage but no correctness blocker) |
| **Empty-state activation** | product-manager F6 + ux-designer F8 + growth-strategist F2 | **N/A** — already covered by WDC-P03 (live backlog row); do not double-promote |
| **Variant explorer / variation drill-down** | competitive-researcher §3 + ux-designer F3 | P1 |
| **KPI strip above-the-fold** | competitive-researcher §1 + ux-designer F6 (partial via portfolio score explainability) + growth-strategist F3 (period-over-period on v1) | **P0** (CR called P0; UX/GS partial overlap) |
| **Opportunity ROI quantification** | competitive-researcher §5 + ux-designer F12 + growth-strategist F9 | P1 |
| **Time-window misleading** | product-manager F10 + ux-designer F7 | P1 |
| **Health-score keyboard a11y unclosed** | ux-designer F10 + frontend-engineer F2 | **P0** (FE called P0; UX called P2; reconcile P0 — WCAG 2.1 SC 2.1.1 is structural a11y blocker; iter 046 left it open) |
| **userPlan analytics race** | analytics F2 (single-agent but #57 retirement gate at risk) | **P0** |
| **Chip-click rate denominator undefined** | analytics F1 (single-agent but unfalsifiable measurement) | **P0** |
| **No ErrorBoundary** | frontend-engineer F1 (single-agent but production blank-screen risk) | **P0** |
| **No event-log abstraction (XES/OCEL)** | system-architect F1 (single-agent but Path C R+1 prerequisite) | **P0** |
| **SQLite production scale cliff** | system-architect F2 (single-agent but pre-launch decision required) | **P0** |
| **Category identity copy split** | growth-strategist F1 (single-agent but world-class positioning blocker) | **P0** |
| **No executive portfolio view** | product-manager F3 (single-agent; PRD §11 R+7) | **P0** (PRD-enumerated MVP scope; reconcile P0) |
| **No conformance score / rework rate** | analytics F4 + system-architect F4 | P1 |
| **Period-over-period delta on v1** | growth-strategist F3 | **P0** (v1 still serves users until #57 retires; period-over-period absent on the surface where it would shift category perception) |
| **API envelope `{data, error, meta}`** | system-architect F5 | N/A — already DV2-R10 row #85 |
| **No metric_fact cache** | system-architect F3 | N/A — covered by Path C R+1 |

---

## §8. Severity reconciliation table

Final coordinator verdict on disputed-severity findings:

| Finding | Initial agents | Initial range | **Reconciled** | Rationale |
|---------|----------------|---------------|---------------|-----------|
| DFG / process-map | CR §2 (P1) + UX F1 (P0) + SA F7 (P1) | P0–P1 | **P0** | UX P0 correct; CR/SA P1 understated structural impact on positioning |
| Drill-down chain | PM F1 (P0) + UX F2 (P0) + FE F2 (P0) | P0 unanimous | **P0** | Triple-agent P0 |
| Trend / time-series | PM F2 (P0) + analytics F5 (P1) | P0–P1 | **P0** | #57 retirement evidence requires; PM P0 correct |
| Health-score keyboard a11y | UX F10 (P2) + FE F2 (P0) | P0–P2 | **P0** | WCAG 2.1 SC 2.1.1 is structural a11y blocker |
| Trust-signal moat invisibility | 4 agents (P1–P2) | P1–P2 | **P1** | High-leverage but no correctness blocker |
| KPI strip above-the-fold | CR §1 (P0) + UX F6 partial + GS F3 partial | P0 (single-agent strong) | **P0** | World-class PI MVP entry-bar |
| Period-over-period delta on v1 | GS F3 (P0) | P0 (single-agent) | **P0** | Cohort still served by v1 until #57 retires |

---

## §9. P0 Promotions (12 unique items)

The following 12 P0 items promote to live `IMPROVEMENT_BACKLOG.md` rows **#87 – #98** with `Birth iter: audit-intake` per MR-005 D-5 clause 2:

| Row | ID | Title | Type | Area | I | A | L | C | E | R | Score | Notes |
|----|-----|-------|------|------|---|---|---|---|---|---|------:|-------|
| **#87** | PIB-P01 | DFG / process-map visualization (workflow-detail view companion) | improvement | web-app + path-c | 5 | 5 | 4 | 3 | 4 | 3 | **10** | UX F1 + CR §2 + SA F7; rendered on workflow detail surface; consumes Tier B `dfg_edges` (~80 LOC); blocked by Path C R+5/R+6 schema |
| **#88** | PIB-P02 | Workflow detail view (drill-through from row → step-level) | improvement | web-app + path-c | 5 | 5 | 3 | 3 | 5 | 3 | **8** | PM F1 + UX F2 + FE F2 (a11y); PRD §7 story A-02; Path C R+6 |
| **#89** | PIB-P03 | Per-workflow trend / time-series (30d sparkline + cycle-time delta) | improvement | path-c + analytics | 5 | 5 | 3 | 3 | 5 | 3 | **8** | PM F2 + analytics F5; `metric_rollup_daily` table; Path C R+3+R+5 acceptance gate |
| **#90** | PIB-P04 | Event-log abstraction decision (XES/OCEL 2.0 alignment) | architecture | path-c-r1-prereq | 4 | 5 | 5 | 4 | 2 | 3 | **13** | SA F1; Path C R+1 prerequisite ADR; `system-architect` primary; ~1 iteration; "decide now or pay 4-6 iter later" |
| **#91** | PIB-P05 | Postgres migration trigger conditions (pre-R+1 ADR) | architecture | infrastructure | 4 | 5 | 4 | 4 | 2 | 3 | **12** | SA F2; named numeric thresholds (50 concurrent / 1M rows / 2s p95); `system-architect` primary |
| **#92** | PIB-P06 | ErrorBoundary on dashboard surface | fix | web-app | 4 | 4 | 2 | 5 | 1 | 1 | **13** | FE F1; closes blank-screen production failure mode; trivial scope; `frontend-engineer` |
| **#93** | PIB-P07 | Health-score `<td>` keyboard accessibility (close iter-046 unclosed gap) | fix | web-app | 4 | 5 | 2 | 5 | 1 | 1 | **14** | UX F10 + FE F2; ~5 LOC `role="button"` + `tabIndex={0}` + `onKeyDown`; closes WCAG 2.1 SC 2.1.1; `frontend-engineer` |
| **#94** | PIB-P08 | userPlan analytics race-condition fix (gate emission on plan-set) | fix | analytics | 4 | 5 | 3 | 5 | 2 | 2 | **13** | analytics F2; #57 retirement evidence quality at risk; `analytics` + `frontend-engineer`; pool-blocking |
| **#95** | PIB-P09 | Chip-click rate denominator (`chipsRenderedCount` in `dashboard_v2_viewed`) | fix | analytics | 4 | 5 | 3 | 5 | 1 | 1 | **15** | analytics F1; closes unfalsifiable-measurement defect; #57 gate evidence; `analytics` |
| **#96** | PIB-P10 | Category identity copy unification (one noun across landing+dashboard+nav) | improvement | web-app + growth | 4 | 4 | 3 | 4 | 2 | 2 | **11** | GS F1; world-class positioning; `growth-strategist` primary + `frontend-engineer` adjacent |
| **#97** | PIB-P11 | KPI strip above-the-fold (4 tiles: throughput / conformance / ROI / variance) | improvement | web-app + path-c | 5 | 5 | 4 | 3 | 4 | 3 | **10** | CR §1; partial overlap WDC-P01 IA inversion but distinct surface (KPI tiles vs portfolio repositioning); first-fold competitive parity bar |
| **#98** | PIB-P12 | Executive portfolio view (`/dashboard/portfolio`) | improvement | web-app + path-c | 5 | 5 | 3 | 3 | 5 | 3 | **8** | PM F3; PRD §11 R+7 net-new; `frontend-engineer` + `system-architect` |

**Note on bundling under D-7 pre-check**: Of the 12, items #90 + #91 are architecture ADRs that must precede Path C R+1. Items #92, #93, #94, #95 are independently shippable Mode 1 burn-down candidates. Items #87, #88, #89, #97, #98 align to Path C iterations and absorb into R+1..R+7. Item #96 is a standalone Mode 1.

---

## §10. Cold pool (P1/P2/P3 — held in artifact per MR-005 D-5 clause 4)

### §10.1 P1 cold pool (27 items)

| ID | Title | Source agent | Score est. |
|----|-------|--------------|-----------:|
| PIB-R01 | Variant explorer surface (click "High variation" badge → variant breakdown panel) | UX F3 + CR §3 | 11 |
| PIB-R02 | Data freshness signal (`metricsComputedAt` timestamp on portfolio + per-row) | UX F4 | 12 |
| PIB-R03 | Insight chips actionable (extend `InsightChip` with `recommendedAction`) | UX F5 | 11 |
| PIB-R04 | Portfolio health score breakdown tooltip (3-line band counts) | UX F6 | 11 |
| PIB-R05 | Time-window scope-clarification callout ("Scores reflect all-time data" when range≠"all") | UX F7 + PM F10 | 10 |
| PIB-R06 | Conformance score (`conformance_score_0_100` Tier B ~80 LOC) | analytics F4 + SA F4 | 11 |
| PIB-R07 | Rework rate (`rework_rate_pct` Tier B ~20 LOC) | analytics F4 | 10 |
| PIB-R08 | Flow-efficiency / throughput-time decomposition (`flow_efficiency_pct` Tier B ~15 LOC) | analytics F3 | 10 |
| PIB-R09 | Persistent metric trend (`metric_rollup_daily` table; per-workflow 30d trend) | analytics F5 | 12 |
| PIB-R10 | Confidence-interval surfacing (`variationScoreSource` enum on output) | analytics F7 | 9 |
| PIB-R11 | Insight-chip context properties (`chipPosition`, `totalChipsRendered`, `workflowCountAtClick`) | analytics F6 | 9 |
| PIB-R12 | Bounce-rate workflow-count segmentation (filter by `workflowCount ≥ 3`) | analytics F11 | 9 |
| PIB-R13 | Trust-signal determinism badge ("evidence-linked" lineage CTA) | CR §8 + UX F4 + GS F4 + GS F10 | 12 |
| PIB-R14 | TanStack Query / SWR adoption | FE F3 | 11 |
| PIB-R15 | `WorkflowRow` `React.memo` + memoized props | FE F4 | 9 |
| PIB-R16 | List virtualization (react-window / TanStack Virtual) | FE F5 | 10 |
| PIB-R17 | Filter/sort state URL-serialization | FE F6 | 10 |
| PIB-R18 | `filterNowMs` re-capture on visibility-change / 60s interval | FE F7 | 8 |
| PIB-R19 | Zod parse on `WorkflowsApiResponse` cast | FE F8 | 11 |
| PIB-R20 | Parallel double-filter consolidation | FE F10 | 8 |
| PIB-R21 | `intelligenceJson` opaque-JSON-column schema-on-read | SA F6 | 10 |
| PIB-R22 | SOP/conformance view (PM F8) — `sopReadiness` already returned by API | PM F8 | 13 |
| PIB-R23 | Health-score formula transparency surface (close PRD §14 Q-GOV-4) | PM F7 | 10 |
| PIB-R24 | Operator actionable triggers (alert thresholds → CTA) | PM F5 | 9 |
| PIB-R25 | Sharing / collaboration (copy-link share action) | GS F7 | 9 |
| PIB-R26 | Upgrade-CTA reframing (volume → capability) | GS F5 | 9 |
| PIB-R27 | Onboarding pull (sample-data empty-state) | GS F2 + PM F6 — already partial WDC-P03 | 10 |

### §10.2 P2 cold pool (23 items)

| ID | Title | Source |
|----|-------|--------|
| PIB-R28 | Frequency × duration scatter / matrix view | UX F9 |
| PIB-R29 | Comparison mode across workflows (multi-select + diff panel) | UX F11 |
| PIB-R30 | Quantified opportunity tags (visible ROI on row) | UX F12 |
| PIB-R31 | Density toggle for comparison scanning | UX F13 + WDC cold |
| PIB-R32 | Role-differentiated views (analyst / operator / executive presets) | CR §7 |
| PIB-R33 | Real-time / streaming Data-Core analog | CR §9 |
| PIB-R34 | Slack / Teams collaboration | CR §11 + GS F7 |
| PIB-R35 | Activation funnel `first_dashboard_view` event | analytics F8 |
| PIB-R36 | Sort/filter signals in #57 retirement evidence | analytics F9 |
| PIB-R37 | Anomaly detection / alerting (post-MVP) | analytics F10 + CR §10 |
| PIB-R38 | Hard-coded Tailwind → design-token canonicalization | FE F11 |
| PIB-R39 | Dead v1 dashboard surface removal (post-#57 retirement) | FE F12 |
| PIB-R40 | Storybook component catalog | FE F13 |
| PIB-R41 | Charting library adoption (recharts / visx) | FE F14 |
| PIB-R42 | Route prefetch on row hover | FE F15 |
| PIB-R43 | i18n surface (next-intl) | FE F16 |
| PIB-R44 | `onCreatePortfolio` silent no-op closure (already DV2-R13 row #82) | FE F17 |
| PIB-R45 | Formal `Clock` interface + DI refactor 6 sites | SA F8 |
| PIB-R46 | Plug-in / extensibility surface | SA F9 |
| PIB-R47 | Predictive layer (MVP-deferred) | SA F10 + CR §10 |
| PIB-R48 | Enterprise pagination path | PM F11 |
| PIB-R49 | Time-window selection clarification (overlaps PIB-R05) | PM F10 |
| PIB-R50 | Pricing-CTA placement beyond quota threshold | PM F12 |

### §10.3 P3 cold pool (13 items)

| ID | Title | Source |
|----|-------|--------|
| PIB-R51 | `KebabMenu` arrow-key navigation | FE F18 |
| PIB-R52 | Feature-flag surface activation | FE F19 |
| PIB-R53 | `getColumnByKey` O(N) → O(1) Map | FE F20 |
| PIB-R54 | `sortWorkflows` memoization | FE F21 |
| PIB-R55 | Process-type heuristic editable | PM F13 |
| PIB-R56 | `aiOpportunityScore` sortable column | PM F14 |
| PIB-R57 | Workflow classification / tagging | UX F14 |
| PIB-R58 | Sparse-state warning actionable | UX F15 |
| PIB-R59 | Mobile experience surface | UX F16 |
| PIB-R60 | Observability gap (OpenTelemetry traces) | SA F11 |
| PIB-R61 | Multi-tenancy partial — full row-level security | SA F12 |
| PIB-R62 | Self-service analyst surface (assumes Path D R+) | analytics F12 |
| PIB-R63 | Determinism trust badge animation polish | GS F10 (lower-fidelity) |

**Cold-pool total: 63 items** (27 P1 + 23 P2 + 13 P3).

---

## §11. Competitive context (2025 momentum)

The PIB review captures the following 2025 competitive moves the dashboard should be benchmarked against:

- **Scribe Optimize** — $75M Series C (2025), $1.3B valuation (2025); explicitly positioned around opportunity-discovery via observed work. Their dashboard centers on *quantified ROI per opportunity*. Ledgerium's `aiOpportunityScore` is computed but visually unquantified at row-level (UX F12).
- **Celonis MCP server** — 2025; AI-agent-readable process intelligence. Direction-of-travel: PI dashboards as agent context, not just human dashboards. Ledgerium's `metric_fact` (Path C R+1) should be MCP-ready by design.
- **Celonis Execution Capital** — $USD-savings framing on every opportunity tile. Ledgerium has `opportunityTag` enum (`automate`/`standardize`/`optimize`/`monitor`) but no monetary translation surface.
- **SAP Signavio Root Cause on Event Graphs** — July 2025; graph-database-backed conformance analysis. Aligns with PIB-P04 event-log abstraction decision.
- **IBM Process Mining** — 2025 Gartner Magic Quadrant Leader. Dashboard centers on *case-table + activity-table + DFG triple-pane*. Ledgerium currently ships only the case-table view.
- **UiPath Process Insights** — 2024-2025 release cycle; KPI alerts + process-event triggers. Aligns with PIB-R37 anomaly-detection cold-pool item.
- **ABBYY Timeline** — waiting/processing/rework decomposition rendered as Sankey; aligns with PIB-R08 throughput-time decomposition.

**Ledgerium's defensible differentiator** (preserved across the review): deterministic event-log lineage from raw browser events through computed metrics, with audit-honesty IFF invariant enforced at registry layer. PIB-R13 (trust-signal determinism badge) makes this property *visible* in product surface — *currently invisible despite being the strongest competitive moat*.

---

## §12. CEO decision queue

The PIB review surfaces **8 CEO decisions** for explicit ratification:

1. **Severity ratification — DFG / process-map (P0 vs P1)?** Coordinator-recommended P0; CR initially P1.
2. **Severity ratification — health-score keyboard a11y (P0 vs P2)?** Coordinator-recommended P0; UX initially P2.
3. **Severity ratification — period-over-period delta on v1 (P0 vs P1)?** GS proposed P0; coordinator endorsed P0; alternative is to defer until v1 retired (which could be ≥30 days post-#57 soak).
4. **Path C R+1 prerequisite ordering**: PIB-P04 (event-log abstraction ADR) + PIB-P05 (Postgres migration triggers) added to the 5 pre-R+1 questions queue — total now **7 pre-R+1 blockers**. Confirm or downgrade.
5. **PI-review cadence absorption**: PIB-P06 (ErrorBoundary) + PIB-P07 (keyboard a11y) + PIB-P08 (userPlan race) + PIB-P09 (chip-click denominator) are independently shippable Mode 1 candidates. Disposition: insert as burn-down between Path D D+2..D+6 iterations? Or queue post-Path-D?
6. **Iter 058 endorsement preserved or rotated?** Standing CEO directive endorses iter 058 PRIMARY = Path D D+2 filter registry. PIB-P09 (chip-click denominator score 15) and PIB-P07 (keyboard a11y score 14) outscore D+2 on raw priority formula. Coordinator default: **preserve standing directive** (Mode 3-adjacent reviews are advisory; CEO standing directive overrides).
7. **Trust-signal moat (PIB-R13)** — promote from P1 cold pool to live now (closes positioning blind-spot before Scribe Optimize next launch cycle)? Or defer until #57 retirement frees v1-surface bandwidth?
8. **Workflow detail view (PIB-P02)** + **Executive portfolio view (PIB-P12)** — both marked Path C R+6 / R+7 in revised PRD. Confirm absorption into Path C, or treat as standalone post-Path-C iterations?

Silence-as-accept window opens at this artifact's publish; coordinator default if no CEO override at MR-015 close: items 1-3 ratified P0; item 4 7-blocker queue confirmed; item 5 PIB-P06/P07/P08/P09 inserted as burn-down between D+2 and D+3; item 6 standing directive preserved; item 7 PIB-R13 stays cold; item 8 absorbed into Path C R+6/R+7.

---

## §13. Iteration mechanics — counter preservation

This is a **Mode 3-adjacent diagnostic review** per CLAUDE.md § Operating Modes. It is **NON-counting** and does not increment the improvement-loop cadence.

**Counters preserved across PIB-REVIEW-001:**

- **MR-015 cadence counter UNCHANGED at 0/3** post-MR-014 reset (Mode 3-adjacent does not advance).
- **Cool-off recharge counter UNCHANGED at 3/3 FULL RE-ARM** (no consumption; cool-off remains fully armed for next `top-score`/`blocker-cadence` invocation).
- **D-1 reverse-portfolio-drift counter UNCHANGED at 2** (Mode 3-adjacent does not advance the 5-iter counting window; iter-057 carry-forward state preserved).
- **Area saturation clock UNCHANGED** (Mode 3-adjacent is non-counting for Area cadence).
- **Agent-diversity counter UNCHANGED** (no implementing-agent invoked under counted iteration).
- **#57 flag-retirement prerequisite chain UNCHANGED at 10/10 ENGINEERING-COMPLETE** (only 14d soak remains; PIB review does not advance calendar-time soak clock).
- **External-launch MDR-blocker gate UNCHANGED at 7/7 CLOSED — FULL** (PIB review is post-gate diagnostic).
- **Cold-pool ages**: DV2 4 (post-MR-013-triage); MDR/WDC RESET to 0 at MR-014 (next mandatory triage projects iter ~067+).
- **Follow-Up Debt Policy testable metric (`closed/created ≥ 0.5`)**: trailing 10-iter window UNCHANGED at **0.30 BELOW 0.5 floor** (Mode 3-adjacent non-counting preserves ratio); per MR-014 §3.2 verdict TRANSIENT not structural.

---

## §14. Iter 058 endorsement disposition

**PRIMARY iter 058 endorsement PRESERVED at Path D D+2 filter registry** under standing CEO Path D Mode 2 directive series.

Rationale for preservation despite higher PIB-P09/PIB-P07 raw scores:
- (a) Mode 3-adjacent reviews are *advisory* — they surface findings; they do not auto-override standing directives.
- (b) Path D D+2 is part of an ongoing 6-item Mode 1/Mode 2 series (D+1 through D+6) per CEO-elected "D-first, Mode 1 series" directive at iter 055; breaking the series mid-flight invokes Area-saturation risk and agent-rotation concerns.
- (c) PIB-P09 (chip-click denominator, score 15) and PIB-P07 (keyboard a11y, score 14) are independently shippable Mode 1 burn-down candidates and remain available as iter 059 / iter 060 picks if CEO elects.
- (d) Coordinator records explicit recommendation: insert PIB-P09 + PIB-P07 + PIB-P08 + PIB-P06 (4 high-leverage low-effort fixes) as a burn-down cluster between Path D D+2 and D+3 — discharges 4 P0 promotions in 4 iterations without disrupting the D+1..D+6 architectural arc.

Default if no CEO override: iter 058 = Path D D+2 filter registry; iter 059 candidate = PIB-P09 chip-click denominator (highest score, smallest scope, closest fit to analytics agent rotation post-system-architect cluster).

---

## §15. Audit-intake mechanics (MR-005 D-5)

PIB-REVIEW-001 follows the established audit-intake pattern (precedents: PRICING_AUDIT_001 iter 016; DASHBOARD_V2_REVIEW_001 iter 026; METRICS_DASHBOARD_REVIEW_001 iter 032; WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001 iter 033):

- **P0-only live promotion** at intake — 12 P0 items added to live `IMPROVEMENT_BACKLOG.md` rows #87 – #98 with `Birth iter: audit-intake`.
- **P1 / P2 / P3 cold pool retained in this artifact** — 63 items not promoted to live backlog. Promotion paths: (a) P0 burn-down creates a slot per MR-005 D-5 clause 4; (b) PRD-trigger enumerated dependency per clause 5.
- **Cold-pool age at PIB intake = 0**. Next mandatory cold-pool triage at age 10 (projected iter ~068 absent intervening Mode 4 or PRD-trigger promotions).
- **Cold-pool row tagging**: any PIB cold-pool item later promoted carries `Birth iter` = `audit-intake` per MR-005 D-5 clause 3.

Pool delta at intake: **29 → 41**.

Pool ceiling consequence: 41 > 8 soft ceiling → next non-directed iteration MUST be `burn-down` per CLAUDE.md Follow-Up Debt Policy clause 6 (cool-off available at 3/3 FULL RE-ARM if `top-score` is desired). Standing CEO Path D directive series renders iter 058 directed Mode 2 → bypasses pool > 8 ceiling via operating-mode precedence per MR-004 Change B narrowed; cool-off NOT consumed on directed picks.

---

## §16. Counters at PIB-REVIEW-001 close

| Counter | Pre-PIB | Post-PIB | Delta |
|---------|--------:|---------:|------:|
| Live backlog pool | 29 | **41** | +12 (12 P0 promotions) |
| Open follow-up subset | (within 41) | (within 41) | unchanged |
| MR-015 cadence | 0/3 | **0/3** | unchanged |
| Cool-off recharge | 3/3 FULL RE-ARM | **3/3 FULL RE-ARM** | unchanged |
| D-1 reverse-drift counter | 2 | **2** | unchanged |
| Area saturation clock | reset by MR-014 | **reset (preserved)** | unchanged |
| #57 flag-retirement chain | 10/10 ENG-COMPLETE | **10/10 ENG-COMPLETE** | unchanged |
| External-launch MDR-blocker gate | 7/7 FULL | **7/7 FULL** | unchanged |
| DV2 cold-pool age | 3 | **3** | unchanged |
| MDR cold-pool age | 0 (post-MR-014) | **0** | unchanged |
| WDC cold-pool age | 0 (post-MR-014) | **0** | unchanged |
| **PIB cold-pool age** | n/a | **0 (intake)** | new |
| Q-bank carry-forward to MR-015 | 10 | **18** | +8 (PIB §12 decisions 1-8) |

---

## §17. Follow-up disposition

**Zero follow-ups generated** by PIB-REVIEW-001 (Mode 3-adjacent rule — diagnostic review does not generate follow-ups; it generates findings, which are either promoted to live backlog or held cold).

**Density-trigger clause 3 does not fire** (zero follow-ups; clause 3 measures follow-ups per iteration, not findings per audit; the P0 audit-intake mechanism is structurally distinct).

**Scope-expansion**: not applicable (no product surface touched; review-only artifact + audit-intake mechanism + 4-mirror-artifact updates = coordinated diagnostic atomic operation).

**Density-response**: n/a (Mode 3-adjacent rule).

---

## §18. Summary

PIB-REVIEW-001 surfaces **75 unique findings** across 7 specialist agents benchmarked against world-class process intelligence platforms. **12 P0 items** promote to live `IMPROVEMENT_BACKLOG.md` rows #87 – #98 with `Birth iter: audit-intake`. **63 items** held in cold pool (27 P1 + 23 P2 + 13 P3) for promotion via P0 burn-down or PRD-trigger.

**Key strategic verdict**: Ledgerium's deterministic-evidence moat is real and defensible, but **architecturally invisible** to users — the most consequential finding is not a missing feature but a positioning blind-spot (PIB-R13 trust-signal determinism badge). Closing it converts a backend property into a category-defining product surface no peer can credibly match.

**Architectural verdict**: PIB-P04 (event-log abstraction) + PIB-P05 (Postgres migration triggers) are Path C R+1 *prerequisites* — decide before R+1 schema lands, or pay 4-6 iterations of regression cost later.

**Tactical verdict**: 4 high-leverage low-effort P0s (PIB-P06 ErrorBoundary, PIB-P07 keyboard a11y, PIB-P08 userPlan race, PIB-P09 chip-click denominator) are independently shippable Mode 1 burn-down candidates totaling ~12-15 LOC + tests. Recommended insertion as a burn-down cluster between Path D D+2 and D+3.

**Iter 058 disposition**: Path D D+2 filter registry preserved per standing CEO directive; PI-review findings are advisory.

**CEO decision queue**: 8 items (§12) under silence-as-accept window opening at publish, defaulting at MR-015 close.

---

*Artifact lineage: DASHBOARD_V2_REVIEW_001 (iter 026) → METRICS_DASHBOARD_REVIEW_001 (iter 032) → WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001 (iter 033) → **PROCESS_INTELLIGENCE_BENCHMARK_REVIEW_001 (2026-05-04, pre-iter-058)**.*
