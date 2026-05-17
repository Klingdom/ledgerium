# Workflows Dashboard Review 002 — Post-Path-D Refinements

**Date:** 2026-05-12
**Mode:** Mode 3-adjacent multi-agent strategic review (NON-counting toward improvement-loop cadence)
**Trigger:** CEO directive (2026-05-12, verbatim):
> *"Have all subagents review the current state of Workflows dashboard page and suggest improvements. For example I think the time pull down menu for which workflows to show perhaps should be All time as default. Workflow cards should also calculate average time, standard deviation, etc. when available."*
**Coordinator:** AI CTO (orchestration; zero specialist work performed)
**Agents engaged:** 8 in parallel — `product-manager` / `ux-designer` / `frontend-engineer` / `system-architect` / `analytics` / `qa-engineer` / `growth-strategist` / `competitive-researcher`
**Precedent format:** DV2-REVIEW-001 / MDR-REVIEW-001 / WDC-REVIEW-001 / PIB-REVIEW-001 / AI-VISION-REVIEW-001 (Mode 3-adjacent NON-counting; MR-005 D-5 audit-intake)
**Predecessor:** `WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001.md` (WDC-001, 2026-04-22) — covered customization design now shipped via Path D D+1 → D+6.

---

## 1. Executive Summary

This review evaluates the **post-Path-D workflows dashboard** (Path D D+1 → D+6 shipped at iter 056-063: customizable columns + filter registry + persistence + ColumnPicker + PresetChipRail + SavedView CRUD + 6-column default-pack). It responds to two CEO-signaled concerns and produces a comprehensive cross-agent analysis of remaining post-Path-D refinement opportunities.

**8-of-8 unanimous agent convergence on the central CEO signal:** **time-range default should change from `'30d'` to `'all'`**. The competitive evidence is decisive — 7 of 8 surveyed world-class process intelligence platforms (Celonis, UiPath, SAP Signavio, IBM, Apromore, ABBYY Timeline) default to full event-log / all cases. Rolling-window defaults are an outlier in the category. PM + UX + Architect + FE + Analytics + Growth + Competitive + QA all independently recommend the change. Implementation cost is **1 production LOC** at `DashboardV2Shell.tsx:161` with 1-5 test updates.

**CRITICAL architect finding — Wave A registry mis-classification:** 5 statistical `ColumnKey` entries are currently marked `availability: 'pending-path-c-r1'` but the data is ACTUALLY available today via `ProcessDefinition.medianDurationMs` (Prisma row) + `intelligenceJson` (plumbed via iter-049 contract-prep adapter). Plus 1 additional column (`ai_opportunity_score`) is computed today but missing from the registry entirely. Plus 2-3 NEW ColumnKey values can be added now via extending `parseIntelligenceJson`. **Single Mode 2 directed pick (~150-200 LOC) ships 8+ statistical columns TODAY** — directly satisfies the CEO's "when available" qualifier without waiting for Path C R+1.

**Strongest distinctive differentiation opportunity** (per Competitive): displaying **N (sample size) alongside statistics on the workflow row** is a category-first move. No surveyed competitor surfaces N with their statistical aggregations by default. Combined with Ledgerium's evidence-linked positioning ("Avg: 6.2 min (N=47 runs)"), this makes the deterministic moat visible at row-scan level — closing the PIB-REVIEW §6.1 gap that flagged the moat as "currently invisible in the UI."

**Drill-down view absence is #1 non-customization gap.** PM + UX + Analytics independently flag that the workflows dashboard has no row-detail destination — every PI competitor surfaces a process-level detail view as the second screen of the list. UX recommends a **slide-in panel pattern** (right-anchored drawer parallel to ColumnPicker; preserves list context vs full-page navigation). AI Vision-emerging risk per PM §9: AI recommendations need a landing zone; without detail view they have nowhere to display evidence.

**2 QA BLOCKERS before AI Vision Build entry:**
1. No axe test for ColumnPicker drawer (new `role="dialog"` + `aria-modal="true"` surface never WCAG-scanned)
2. Preset chip apply does NOT transfer FilterState (TD-2/TD-3 silent gap — user clicks "Automation Candidates" gets column change but no row filtering)

**Pool delta projected: 40 → 47** (7 P0 promotions; see §15). **Counter preservation across Mode 3-adjacent NON-counting:** cool-off recharge 3/3 UNCHANGED (10-event preservation streak); D-1 reverse-portfolio-drift UNCHANGED at 7; Area saturation NOT advanced; MR-017 cadence UNCHANGED at 0/3; cold-pool ages preserved.

---

## 2. Decomposition: 5 User-Signaled Themes

| # | Theme | CEO signal | Agent coverage |
|---|---|---|---|
| **T1** | Time-range default → "All time" | Direct CEO signal | 8/8 agents address |
| **T2** | Statistical aggregations on cards (avg / std-dev / etc.) "when available" | Direct CEO signal | 8/8 agents address |
| **T3** | Post-Path-D refinement gaps | Implied — "review current state and suggest improvements" | Drill-down view (PM/UX/FE/Analytics), empty-state activation (PM/UX/Growth/QA), brand voice gaps (Growth), accessibility audit (QA), info hierarchy (UX) |
| **T4** | Audit-honesty IFF chain preservation across new surfaces | Implicit invariant | All agents — preserved across 6 layers (D+1 through D+6) |
| **T5** | AI Vision build precursor signals | Forward-looking (per AI-VISION REVIEW §9 ARAR north-star) | Analytics §10 + Architect §9 + Growth §10 |

---

## 3. Cross-Agent Convergence — HIGH-CONFIDENCE Recommendations

### 3.1 Time-range default → `'all'` (8/8 AGENT UNANIMITY)

Strongest cross-agent consensus surfaced in any review to date. Sources:

| Agent | Position |
|---|---|
| `product-manager` | "Change default from `'30d'` to `'all'`. The dashboard is a library, not a feed. `'all'` matches the user's mental model of what they own." |
| `ux-designer` | "Default to `'All time'`. New users with 1-5 workflows may see 0-1 workflows if any were recorded more than 30 days ago. The portfolio health score delta disagrees with the selected time window (WDC-R14)." |
| `system-architect` | "Architecturally indifferent pre-R+1; architecturally beneficial post-R+1 (long-window `metric_fact` rows have highest cache hit-rate). Recommend SET TO `'all'`." |
| `frontend-engineer` | "Surgical change is 1 LOC at `DashboardV2Shell.tsx:161`. `'all'` early-returns workflows unchanged — no behavior change. Removes confusing `(all-time)` run-count annotation. Audit-honesty improvement, not regression." |
| `analytics` | "Recommended with `time_range` event property prerequisite: must add `time_range` to `dashboard_v2_viewed` BEFORE flipping default — otherwise before/after analysis is impossible." |
| `growth-strategist` | "`30 days` contradicts Ledgerium's `deterministic, evidence-linked, immutable` positioning. `All time` trusts the user to narrow scope. Competitive differentiation vs Scribe/Tango." |
| `competitive-researcher` | "**7 of 8 surveyed platforms default to full event-log / all cases.** The CEO's instinct is consistent with category norm. Rolling-window defaults are operational monitoring (Datadog) / product analytics (Mixpanel) pattern — wrong category." |
| `qa-engineer` | "Low backwards-compat risk. `timeRange` is not currently in `UserDashboardPreference.payload`, so no migration error. The only behavioral risk is user-visible (intended)." |

**Coordinator recommendation: ELEVATE TO HARD CEO RECOMMENDATION + APPROVE.** Surface as D-01 in §16.

### 3.2 Statistical aggregations available TODAY via Wave A registry fix (4-agent convergence)

**Critical architect-led finding:** 5 statistical `ColumnKey` entries are marked `pending-path-c-r1` but the data is plumbed today. Plus 1 entirely-missing column (`ai_opportunity_score`) + 2-3 additional fields extractable from existing `intelligenceJson`. **Total: 8+ statistical columns can flip to `availability: 'available'` in a single Mode 2 directed pick of ~150-200 LOC.**

| ColumnKey | Current registry | Should be | Data source TODAY |
|---|---|---|---|
| `cycle_time_median_ms` | `pending-path-c-r1` (mis-classified) | **`available`** | `ProcessDefinition.medianDurationMs` (Prisma row) |
| `variant_count` | `pending-path-c-r1` (mis-classified) | **`available`** | `intelligence?.variantCount` (iter-049 plumbed) |
| `top_variant_share_pct` | `pending-path-c-r1` (mis-classified) | **`available`** | `intelligence?.standardPathFrequency × 100` |
| `path_length_stddev` | `pending-path-c-r1` (mis-classified) | **`available`** | `intelligence?.stepCountVarianceStdDev` |
| `path_similarity_avg` | `pending-path-c-r1` (mis-classified) | **`available`** | `intelligence?.sequenceStability` |
| **`ai_opportunity_score`** (NEW) | NOT IN REGISTRY | **`available`** | `WorkflowMetricsOutput.aiOpportunityScore` (already computed; PIB F12 flagged hidden in HealthTooltip) |
| `cycle_time_stddev_ms` (NEW Wave B) | needs registry entry | **`available`** | extend `parseIntelligenceJson` to pluck `variance.durationVariance.stdDevMs` |
| `cycle_time_coefficient_of_variation` (NEW Wave B) | needs registry entry | **`available`** | same path → `.coefficientOfVariation` |

Source agents: `system-architect` (§1 + §4 Wave A enumeration), `frontend-engineer` (§7-9 confirmed available), `analytics` (§10 AI eligibility precursor), `qa-engineer` (§8 invariant test coverage).

### 3.3 7th default-pack column = `cycle_time_mean_ms` ("Avg Time") (8-agent convergence)

| Agent | Position |
|---|---|
| `product-manager` | "Add one statistical column to the 7-column default-pack — `cycle_time_mean_ms` (avg duration). MR-014 ASK-1 already endorsed 7-column initial pack; only the 7th column was deferred to D+6." |
| `ux-designer` | "Add visible statistical columns to default set (avg time + std dev). Available today via `metricsV2.avgTimeMs`. No Path C dependency." |
| `system-architect` | "`cycle_time_mean_ms` already `available` with non-null accessor returning `metricsV2.avgTimeMs`. Ready for default-pack promotion." |
| `frontend-engineer` | "`accessCycleTimeMeanMs` already returns `metricsV2.avgTimeMs`. Just needs `defaultVisible: true` change + label refinement from `Mean cycle time` to `Avg Time` for discoverability." |
| `analytics` | "Avg duration = universal floor — `Workflow.avgTimeMs` already API-shipped." |
| `growth-strategist` | "Label: `'Avg Time'` (8 chars). Tooltip: `'Mean cycle time across all runs in the selected window.'` (55 chars). Both within registry limits." |
| `competitive-researcher` | "Universal floor across all 8 surveyed platforms: **average duration + case count/frequency**. Median duration rising as second-tier default in Apromore + Celonis Variant Explorer + Appian." |

**Coordinator recommendation: ELEVATE + APPROVE.** Promote `cycle_time_mean_ms.defaultVisible: false → true` in same iteration as Wave A registry fix. Optional 8th default-pack column = `cycle_time_median_ms` once promoted to `available` (matches Competitive §5 rising-second-tier pattern).

### 3.4 Audit-honesty IFF chain preserved across all 6 Path D layers (7-agent convergence)

D+1 column-registry IFF + D+2 filter-registry IFF + D+3 persistence-migration graceful-degradation + D+4 picker pending-disabled + D+5 preset audit-honesty IFF (Group E) + D+6 default-pack audit-honesty IFF (Group F). Strong invariant preservation pattern across the entire Path D arc.

`qa-engineer` recommends tightening C1 IFF test to assert "available IFF data-actually-reachable" (second-order invariant: walks the registry, calls each accessor against a richly-populated row fixture, asserts non-null return). This would have caught the Wave A mis-classifications mechanically.

### 3.5 Time-range persistence in UserDashboardPreference (4-agent convergence)

Sources: PM (§2) + UX (§4) + Architect (§7) + FE (§5).

- Add `defaultTimeRange?: TimeRange` field to `UserDashboardPreference.payload`
- Increment `CURRENT_SCHEMA_VERSION` from `1` to `2` (D+3 migration protocol)
- `migratePreferences` v1→v2 branch sets `defaultTimeRange: 'all'` for legacy rows missing the field
- Backward-compat: legacy v1 documents migrate-forward at read time with no data loss; Prisma schema unchanged (JSONB payload)
- Estimated delta: ~40-60 LOC across `persistence.ts` + `route.ts` + `DashboardV2Shell.tsx` + ~8-12 new `it()` blocks
- Per-user persistence depends on D-01 (default change) shipping first

### 3.6 Drill-down view absence is #1 non-customization gap (3-agent convergence)

| Agent | Recommendation |
|---|---|
| `product-manager` | "Every PI competitor surfaces process-level detail view as the second screen of the list. It is the transition point from awareness to action. The list view is not where decisions get made; the detail view is the conversion point." |
| `ux-designer` | "Slide-in panel (right-anchored drawer, same pattern as ColumnPicker) — preserves list context. Sections: header (workflow title + opportunity tag + health score) / time metrics block / health score breakdown (promote from tooltip) / systems / actions. Row body click opens panel; Escape closes via existing `useEscapeDispatch` from MDR-P08; 'View full details →' link inside panel for full nav." |
| `analytics` | "5 new events for drill-down view: `workflow_detail_opened` (entry_point: row_click / stat_cell_click / opportunity_tag_click + stats_visible at click); `workflow_stat_drillthrough`; `workflow_stat_feedback`." |

**Coordinator recommendation: ELEVATE TO P0 AUDIT-INTAKE.** Effort: M-L (new panel component). Risk: panel design surfaces information architecture decisions (what goes in panel vs full page); consider light specialist ux-designer adjacency on entry-point and section composition.

### 3.7 WDC-P03 empty-state activation pull (row #76 already open) — 4-agent convergence

Sources: PM (§10) + UX (§10) + Growth (§6) + QA (#9 carry-forward).

Current state: "No workflows recorded yet." / "Install the browser extension to start recording workflows." / "Install extension →" (passive; describes problem, names tool, doesn't connect behavior to specific product output).

**Growth-strategist drafted replacement copy (ready to apply):**
- Headline: "No workflows recorded yet."
- Body: **"Record any digital process once — Ledgerium measures cycle time, identifies patterns, and surfaces where your team spends time."**
- CTA: **"Install extension to start →"** (transition language vs chore language)

Plus sparse-state polish: **"Your first workflow is recorded. Record 2 more to unlock health score comparison across your library."**

Plus suppress health-score widget in 0-workflow state, replace with: "Record your first workflow to see your Process Health Score."

**Coordinator recommendation: PROMOTE row #76 WDC-P03 from "still open" status to NEXT-ITERATION execution-ready with copy attached.**

### 3.8 Minimum-N thresholds (concrete numbers; 4-agent convergence)

Sources: PM (§7), Analytics (§2), Competitive (§6 Pattern 5), QA (Q7 edge cases).

Final reconciled thresholds for display-suppression:

| Statistic | Min N | Source |
|---|---|---|
| Mean (avg duration) | **N ≥ 2** | Analytics (more permissive than PM's N≥3) |
| Median / p50 | **N ≥ 3** | All 3 sources align; matches `PORTFOLIO_PRIOR_MIN_WORKFLOWS = 3` precedent |
| Std-dev / Variance / CV | **N ≥ 5** | All agree |
| p95 | **N ≥ 20** | All agree |
| p99 | **N ≥ 100** | Analytics-only specification |
| Trend direction | **N ≥ 7 windows** | Analytics — Mann-Kendall reliability threshold |
| Sparkline | **N ≥ 4 windows** | Analytics — minimum interpretable shape |

**Implementation:** thresholds belong in accessor functions (`accessors.ts`), not display layer. Accessor returns `null` below threshold → existing `formatCellValue` renders "—" via audit-honesty IFF. Recommend adding `minRunsRequired: number` to `WorkflowDashboardColumn` interface for self-documenting registry entries.

---

## 4. Cross-Agent Divergence — Requires CEO Arbitration

### 4.1 Statistics presentation: raw values vs CV % vs color-coded indicator

| Agent | Position |
|---|---|
| `product-manager` § 6 | "Explicit labels for actionable statistics. Numeric ('Median time: 4m 32s') not color-coded for duration; color reserved for health score thresholds where 60/80 band semantics are documented." |
| `ux-designer` § 6 | "Tier 1 numeric + unit (existing `formatCellValue` handles); Tier 2 color-coded coefficient-of-variation badge mirroring opportunity-tag chip pattern; REJECT distribution-bar (needs N≥10)." |
| `competitive-researcher` § 6 Pattern 3 | "Several Gartner-reviewed platforms (IBM, SAP Signavio, ServiceNow) use **color-coded cells** rather than raw std-dev values — green/amber/red on variance band. More scannable than numeric." |
| `growth-strategist` § 3-4 | "Labels 'Time Spread' (over 'Std Dev'), 'Consistency Index' (over 'CV') — describes outcome not formula. Numeric display." |

**Divergence:** PM + Growth prefer numeric display; UX + Competitive note color-coded variance indicator is more scannable at row density. Both can co-exist (numeric in cell + color-tinted band on adjacent indicator), but introduces visual complexity.

**Coordinator-recommended resolution: NUMERIC PRIMARY + OPTIONAL color tint as drill-down enhancement.** Ship numeric statistical columns now (lower risk, matches Ledgerium evidence-linked positioning); color-coded variance indicator deferred to post-launch UX iteration after observing user interaction patterns.

### 4.2 Statistics on row: with-N attribution or not?

| Agent | Position |
|---|---|
| `competitive-researcher` § 8 | "**Display N alongside the mean = category-first differentiation move.** No surveyed competitor surfaces N by default. Combined with Ledgerium's evidence-linked positioning, makes the moat visible at row-scan level. UNTESTED differentiator — pilot recommendation." |
| `analytics` § 1 | "The runs count (`WorkflowMetricsOutput.runs`) must be surfaced alongside each statistic so display layer can apply min-N thresholds. A `statisticsAvailable` boolean or `minNReached` flag per statistic makes suppression logic deterministic and testable." |
| Other 6 agents | Did not address explicitly. |

**Coordinator-recommended resolution: APPROVE N-attribution as a category-first move.** Architecturally trivial (N already in `WorkflowMetricsOutput.runs`); display-layer addition (~10 LOC formatCellValue change). Highest-leverage differentiation surfaced in the review.

### 4.3 Drill-down: slide-in panel vs full-page navigation

| Agent | Position |
|---|---|
| `ux-designer` § 8 | "Slide-in panel — preserves list context, parallels ColumnPicker pattern." |
| `product-manager` § 8 | "Workflow detail page (full-page) parallels every PI competitor's second-screen pattern." |
| Other 6 agents | Did not address explicitly. |

**Divergence:** UX prefers panel (preserves list); PM implies full-page (matches competitor pattern). Both designs are viable.

**Coordinator-recommended resolution: SLIDE-IN PANEL PRIMARY** (UX rationale — preserves list context is high-value for triage workflow); full-page detail view available via "View full details →" link inside panel (hybrid that satisfies both agent recommendations).

### 4.4 Wave A registry fix: ship NOW or wait for Path C R+1?

| Agent | Position |
|---|---|
| `system-architect` § 10 | "**Now (pre-R+1):** Mode 2 directed pick flips Wave A registry entries to `available` + adds adapter extension for stddev/CV — this is ~150 LOC, single iteration, unblocks user-visible statistics today. Recommend APPROVE." |
| `frontend-engineer` § 7-9 | "`cycle_time_mean_ms` available today, accessor wired. Pending columns need Path C R+1." |
| `qa-engineer` § 8 | "C1 IFF invariant test automatically catches new entries. Pre-Path-C addition is mechanically safe." |
| Other 5 agents | Did not address explicitly. |

**Coordinator-recommended resolution: SHIP NOW.** No agent argued against pre-R+1. Risk profile is low (mis-classification correction; existing IFF test catches future regressions).

---

## 5. Wave A Registry Mis-classification Deep-Dive

### 5.1 Migration tuple (per iter-056 D+1 architect §8 pattern)

For each pending → available column flip, 5 coordinated edits per migration:

1. `apps/web-app/src/lib/dashboard-columns/accessors.ts` — add pure accessor function + export from `AVAILABLE_ACCESSORS`
2. `apps/web-app/src/lib/dashboard-columns/registry.ts` — change `availability: 'pending-path-c-r1'` → `'available'` AND `accessor: null` → `accessor: accessXxxMs`
3. `apps/web-app/src/lib/dashboard-columns/registry.test.ts` Group F — increment "available count" lock-test (currently `expect(getDefaultVisibleColumns().length).toBe(6)`)
4. `apps/web-app/src/lib/metrics-input-adapter.ts` — extend `IntelligenceJsonSchema` to include the new field IF intelligenceJson-sourced
5. `apps/web-app/src/lib/workflow-metrics.ts` — extend `WorkflowMetricsInput.intelligence` with the new field

### 5.2 Estimated implementation cost

| Wave | Columns | Source | LOC est. | Test est. |
|---|---|---|---|---|
| Wave A (mis-classification fix) | 5 (`cycle_time_median_ms` / `variant_count` / `top_variant_share_pct` / `path_length_stddev` / `path_similarity_avg`) | Existing data; 5 accessors + 5 registry flips | ~80 LOC | ~10-15 new `it()` blocks |
| Wave A+ (NEW from registry-missing) | 1 (`ai_opportunity_score`) | Existing `metricsV2.aiOpportunityScore` | ~15 LOC | ~3 it() blocks |
| Wave B (NEW available) | 2-3 (`cycle_time_stddev_ms` / `cycle_time_coefficient_of_variation` / `is_high_duration_variance`) | Extend `parseIntelligenceJson` | ~50 LOC | ~6-8 it() blocks |
| **Total** | **8-9 columns** | | **~150-200 LOC** | **~19-26 tests** |

### 5.3 Pre-requisite: ColumnAccessorContext extension

Per architect §5 Guard 1 — required BEFORE any time-window-dependent statistical accessor ships. Today's `ColumnAccessorContext` has no `referenceNowMs`. A statistical accessor over a 7-day window would either (a) read `Date.now()` directly (violates determinism) OR (b) silently compute lifetime data while label promises 7-day (violates audit-honesty).

Proposed extension:
```typescript
interface ColumnAccessorContext {
  title: string;
  toolsUsed: string[];
  lastViewedAt: string | null;
  createdAt: string;
  metricsV2: WorkflowMetricsOutput;
  // NEW — iter-037 MDR-P03/P04 pattern extended to stats:
  referenceNowMs: number;
  activeTimeRange: TimeRange;
}
```

Estimated cost: ~50 LOC contract change + every accessor signature update + tests. **Pre-requisite for Wave A statistical columns shipping; can ship as a separate small iteration BEFORE Wave A.**

---

## 6. Time-Range Default + Persistence Design

### 6.1 Implementation sequence

| Iteration | Scope | LOC est. | Risk |
|---|---|---|---|
| **A** | Add `time_range` to `dashboard_v2_viewed` event (analytics prerequisite) | ~10 LOC | None — additive event property |
| **B** | Change default `'30d'` → `'all'` at `DashboardV2Shell.tsx:161` + test assertion of initial state + 4 cases for `'all'` range edge behavior | ~5 LOC prod + ~30 LOC test | Low — backwards-compat clean per QA §5 |
| **C** | Add `defaultTimeRange` to `UserDashboardPreference.payload` + schemaVersion 1→2 migration + v1→v2 test cases + GET/PUT route extension + DashboardV2Shell hydration | ~40-60 LOC + ~8-12 tests | Low — additive field, no Prisma migration |

**Coordinator recommendation:** Bundle A+B as one iteration (analytics prereq + default change = single logical user-visible change). Schedule C as standalone iteration immediately after to absorb persistence layer.

### 6.2 Analytics acceptance criteria (Analytics §8)

5 measurable acceptance criteria for `'all'` default validation:

1. Default acceptance rate ≥ 70% (< 30% change away within first 60s of session)
2. Bounce rate doesn't increase (with PIB-R12 segmentation fix as prerequisite)
3. First-click time p50 doesn't increase
4. Time-range changes predominantly NARROW (3:1 ratio narrowing vs widening)
5. Insight chip click rate doesn't decrease

Requires 2 new events:
- `dashboard_time_range_changed` (from_range / to_range / workflow_count_before/after / session_elapsed_ms)
- `dashboard_time_range_defaulted` (range / workflow_count) — once per `dashboard_v2_viewed` reporting active range at view time

### 6.3 Migration semantics for existing users

| Case | Behavior |
|---|---|
| New user, no existing preferences | New default `'all'` applies from `getDefaultPreferences()` |
| Existing user, no `defaultTimeRange` field in stored preferences | v1→v2 migration sets `defaultTimeRange: 'all'` |
| Existing user, explicit `defaultTimeRange` field already in stored preferences (future) | Stored value respected |

**Alternative (if CEO prefers preserving existing user expectations):** v1→v2 migration sets `defaultTimeRange: '30d'` for existing users + `'all'` only for new users via `getDefaultPreferences()`. PM §1 noted this as a possibility; recommend the unified-default approach for cleaner UX consistency.

---

## 7. Statistical Aggregations Design

### 7.1 Column inventory post-Wave A+B

After Wave A+B execution, the dashboard column registry would have **18 `available` columns** (10 today + 5 Wave A mis-classification fixes + 1 ai_opportunity_score + 2-3 Wave B additions):

**10 existing available:** workflow_title / systems / opportunity_tag / health_score / last_run_at / run_count / cycle_time_ms / cycle_time_mean_ms / case_volume / system_count_per_run

**+5 Wave A:** cycle_time_median_ms / variant_count / top_variant_share_pct / path_length_stddev / path_similarity_avg

**+1 Wave A+:** ai_opportunity_score

**+2-3 Wave B:** cycle_time_stddev_ms / cycle_time_coefficient_of_variation / [optional: is_high_duration_variance]

### 7.2 Recommended default-pack progression

| Default-pack size | Target shipping iteration | Columns |
|---|---|---|
| **6 (CURRENT)** | iter 063 D+6 (locked) | workflow_title / systems / opportunity_tag / health_score / last_run_at / run_count |
| **7 (NEXT)** | Bundle with Wave A | +cycle_time_mean_ms ("Avg Time") |
| **8 (POST-WAVE-A)** | Optional, post-validation | +cycle_time_median_ms ("Median Time") — matches Competitive §5 rising-second-tier pattern |

### 7.3 Column labels + descriptions (Growth §3-4, ready to apply)

| ColumnKey | Label (≤24c) | Description (≤80c) |
|---|---|---|
| `cycle_time_mean_ms` | **Avg Time** (8c) | Mean cycle time across all runs in the selected window. (55c) |
| `cycle_time_median_ms` | **Median Time** | (TBD — Growth follow-up) |
| `cycle_time_stddev_ms` | **Time Spread** (11c) | Standard deviation of cycle time — how much run durations vary from the mean. (78c) |
| `cycle_time_coefficient_of_variation` | **Consistency Index** (17c) | Std dev divided by mean. Lower = more consistent execution across runs. (72c) |
| `cycle_time_p95_ms` | **p95 Time** (9c) | 95th-percentile cycle time — 1 in 20 runs takes this long or longer. (69c) |
| `trend_direction` (future) | **Trend** (5c) | Direction of change in cycle time over the selected window. (59c) |
| `variant_count` | (existing) | (existing) |
| `path_length_stddev` | **Path Length Spread** | (existing pattern) |
| `ai_opportunity_score` | (TBD) | (Growth follow-up) |

### 7.4 N-attribution differentiation pattern

Per Competitive §6 Pitfall 1 + Architect §11 Risk 1, displaying N alongside the statistic is a category-first differentiation move with low implementation cost.

Visual treatment options:
- Inline: "4m 32s · N=47" (compact; matches Ledgerium evidence-linked posture)
- Cell secondary line: large stat above, small "N=47 runs" below
- Tooltip-only: hover reveals "Computed over 47 runs"

**Coordinator-recommended: inline with separator** (e.g., `"4m 32s · 47 runs"`) — most direct signal-to-noise; visible at row-scan; minimal vertical space cost.

### 7.5 Statistics on row vs drill-down (consolidated tiering)

| Statistic | Position | Rationale |
|---|---|---|
| Avg Time (mean) | DEFAULT VISIBLE | Universal floor across all competitors |
| Median Time | PICKER-SELECTABLE | Optional column; default if shipping 8-column pack |
| Variant Count | PICKER-SELECTABLE | High signal but uncommon use |
| Time Spread (std-dev) | PICKER-SELECTABLE | Category-first; show in picker for opt-in |
| Consistency Index (CV) | PICKER-SELECTABLE | Best dispersion signal (dimensionless) |
| p95 Time | PICKER-SELECTABLE | Available post-R+1; N ≥ 20 threshold |
| Trend direction | DRILL-DOWN | Requires Path C R+3 metric_rollup_daily |
| Sparkline | DRILL-DOWN | Same |
| Distribution histogram | DRILL-DOWN | Same |

---

## 8. Drill-Down View Design

Per UX §8 + PM §8 + Analytics §7 — **slide-in panel design** (right-anchored drawer, parallel to ColumnPicker pattern from iter-061).

### 8.1 Panel content sections

1. **Header:** workflow title (editable via existing `InlineEdit` pattern from iter-031) + opportunity tag chip + health score band
2. **Time metrics block:** 2×2 or 3×2 stat grid — avg run time / median / std dev / run count / last recorded date. Numeric, no charts at this stage. Path C R+1 lands trend sparkline
3. **Health score breakdown:** the 4 dimensions (Speed / Consistency / DataQuality / Standardization) currently inside HealthTooltip — promote from tooltip to panel section so always-visible
4. **Systems involved:** `toolsUsed` list rendered as named chips
5. **Actions:** Rename / Archive / Copy link — inline buttons (surface existing affordances without kebab hiding)

### 8.2 What the panel does NOT contain at this stage

- AI recommendations (Phase 2 / AI Vision Build)
- Variant tree, SOP view, run-by-run log (full detail page concern)

### 8.3 Entry/exit affordances

- Row body click opens panel (NOT navigation away — preserves list context)
- Escape closes panel via existing `useEscapeDispatch` pattern from MDR-P08 iter-041
- "View full details →" link inside panel for full route navigation (hybrid satisfying PM's competitor-pattern desire)

### 8.4 Estimated implementation cost

- New `WorkflowDetailPanel.tsx` component (~400-600 LOC)
- DashboardV2Shell integration (~50 LOC)
- 3 new analytics events (`workflow_detail_opened` / `workflow_stat_drillthrough` / `workflow_stat_feedback`)
- E2E test (axe scan + interaction)
- Total: ~1 iteration (M-L effort)

---

## 9. Empty-State + Activation Pull

### 9.1 0-workflows state (Growth §6 + UX §10 ready-to-apply copy)

**Current:** "No workflows recorded yet." / "Install the browser extension to start recording workflows." / "Install extension →"

**Proposed replacement:**
- Headline (keep): "No workflows recorded yet."
- Body: **"Record any digital process once — Ledgerium measures cycle time, identifies patterns, and surfaces where your team spends time."**
- CTA: **"Install extension to start →"** (transition language, not chore language)
- Additional: **CommandHeader health-score widget suppressed; replaced with "Record your first workflow to see your Process Health Score."**

### 9.2 1-2 workflows (sparse state) — Growth §7

**Current:** "Metrics improve as more workflows are recorded. Some scores may be incomplete." (passive)

**Proposed replacement:** "Your first workflow is recorded. Record 2 more to unlock health score comparison across your library." (positive reinforcement + specific threshold + named capability)

### 9.3 No-results from time-range filter — UX §10

When `timeFilteredWorkflows.length === 0 && allWorkflows.length > 0`, detect specifically that time-range caused the empty state and offer remediation:

**Proposed:** "No workflows recorded in this period — try a longer time range." + **"Show all time"** button that sets `timeRange='all'`.

### 9.4 Closes WDC-P03 (row #76)

Empty-state activation pull was originally promoted at WDC-001 §6 as P0 row #76; still open at iter 063 close. Growth's copy is ready; this iteration ships it.

---

## 10. Brand Voice + Copy Substitutions (Growth-Strategist Pre-Drafted)

### 10.1 POLISH substitutions ready to apply

| Location | Current | Proposed |
|---|---|---|
| PresetChipRail.tsx:150 (AI pending tooltip) | "Available after Path C R+1" | **"Coming in an upcoming release"** (remove internal release nomenclature; align with ColumnPicker pattern) |
| PresetChipRail.tsx:152 (Team-gated) | "Upgrade to Team to access this preset" | **"Team plan includes this preset — see plans →"** (capability framing) |
| WorkflowList error state | "Something went wrong" | **"Could not load workflows — check your connection and retry."** (named cause + recovery) |
| HealthTooltip gated CTA | "View plans →" | **"Compare plans →"** |
| UsageQuotaMeter at 100% | "Upgrade for more" | **"Upgrade to record without limits"** (closes PIB GS F5 volume-vs-capability gap) |

### 10.2 New copy surfaces

- 10-saved-views-reached: **"10 saved views reached — remove one to save a new view, or upgrade to Team for unlimited saved views."**
- AI-Vision precursor framing for variance-high (≤2 sentences): **"High variance in execution time often signals a step that a well-scoped AI integration could standardize. Ledgerium will identify which steps are candidates when AI suggestions ship."** (appears in insight-chip tooltip or chip-rail expansion, NOT in chip label)

### 10.3 KEEP unchanged

- All 4 time-range option labels ("Last 7 days" / "Last 30 days" / "Last 90 days" / "All time") — accurate as-is
- "Available in an upcoming release" (ColumnPicker pattern) — keep as canonical user-facing roadmap language

---

## 11. Audit-Honesty IFF Chain Preservation

### 11.1 Current state

6-layer chain operating cleanly across Path D:

| Layer | IFF mechanism |
|---|---|
| **D+1 column registry** | `accessor === null` IFF `availability !== 'available'` (registry.test.ts Group C) |
| **D+2 filter registry** | `evaluateFilter` returns `false` for non-`available` columns; `getFilterableColumns()` filters to `available + filterable` |
| **D+3 persistence** | `migratePreferences` returns `droppedKeys[]` for column keys no longer in registry (graceful degradation) |
| **D+4 picker UI** | Pending columns rendered disabled with "Available in an upcoming release" |
| **D+5 preset registry** | `PresetAvailability` 2-member; AI presets rendered disabled (Group E IFF test) |
| **D+6 default-pack** | All 6 default-pack columns are `available` with non-null accessors (Group F drift-protection F6) |

### 11.2 Recommended tightening (per QA §8)

Add a second-order invariant test: walks the entire registry, calls each accessor against a richly-populated `ColumnAccessorContext` fixture, asserts non-null return for any column with `availability === 'available'`. **This would have caught the 5 Wave A mis-classifications mechanically.**

Estimated cost: ~30 LOC test + 1 rich fixture. Critical addition before AI Vision Build introduces new accessor patterns.

---

## 12. ColumnAccessorContext Architectural Extension (Pre-Requisite)

Per Architect §5 Guard 1 — extending `ColumnAccessorContext` to carry `referenceNowMs + activeTimeRange` is the architectural prerequisite for time-window-dependent statistical columns. **Must ship BEFORE Wave A statistical columns that are time-window-aware.**

Today's risk: a `cycle_time_stddev_ms` accessor computing over a 7-day window has no clean way to know "now" or "7-day-window" without violating determinism. Three failure paths:
1. Accessor reads `Date.now()` directly → non-deterministic; iter-037 MDR-P03/P04 precedent flags this as anti-pattern
2. Accessor silently computes lifetime stats while label promises "7-day mean" → audit-honesty violation
3. Accessor receives `referenceNowMs` via threaded context (proposed) → maintains determinism + audit-honesty

**Coordinator-recommended sequence:**
1. Iteration: `ColumnAccessorContext` extension (~50 LOC contract change, every accessor signature updated, tests)
2. Iteration: Wave A registry mis-classification fix (~150-200 LOC, consumes extended context)
3. Iteration: Time-range default change + analytics prereq (~10 LOC)
4. Iteration: Time-range persistence schema v2 (~40-60 LOC)

---

## 13. Strengths Preserved (≥10)

From convergent agent emphasis:

1. **Deterministic capture pipeline** (extension → normalization → segmentation → intelligence) — operating cleanly through Path D
2. **6-layer audit-honesty IFF invariant chain** preserved across D+1 through D+6 (zero regressions)
3. **Iter-031 inline affordances** (InlineEdit / InlineArchiveConfirm / HealthTooltip) preserved across all Path D iterations including D+4/D+5/D+6
4. **MDR-P08 `useEscapeDispatch` pattern** reused at D+4 (ColumnPicker drawer) and proposed for drill-down panel
5. **WDC §4 strength #11 native `<select>` for time range** preserved per architect §5 + UX §5 — correct a11y, do not replace with Radix
6. **Frozen module-singleton pattern** (`Object.freeze` registry / filters / presets) preserved
7. **Closed-union ColumnKey** + compile-time exhaustiveness lock (iter-062 architect §4 revision pattern)
8. **Persistence v1 schema migration protocol** ready to absorb v2 schema bump
9. **iter-037 single-upstream-clock-boundary pattern** (`referenceNowMs`) ready for extension to statistical columns
10. **Path D agent rotation discipline** (frontend × 2 → qa rotation at iter 063) preserved cleanly
11. **PostHog `disable_session_recording: true` privacy posture** preserved (per PIB-REVIEW §4)
12. **Existing 20+ test files for dashboard-v2 surface** — solid invariant coverage at library level

---

## 14. Top 7 P0 Audit-Intake Promotions

Per MR-005 D-5 audit-intake protocol, the following P0 candidates are recommended for promotion to live `IMPROVEMENT_BACKLOG.md` rows with `Birth iter: audit-intake-WDC-002`:

| # | P0 | Rationale | Coordinator-recommended sequencing | Est. effort |
|---|---|---|---|---|
| **P0-1** | **`ColumnAccessorContext` extension to `referenceNowMs + activeTimeRange`** | Architectural prerequisite for ALL time-window statistical columns; iter-037 pattern extension | FIRST — before Wave A | ~50 LOC, ~6 tests, 1 iter |
| **P0-2** | **Wave A registry mis-classification fix + Wave B `cycle_time_stddev_ms` / `coefficient_of_variation` additions + `ai_opportunity_score`** (8 columns total flip to `available`) | Directly satisfies CEO "calculate average time, std dev, etc. when available" directive; ~150-200 LOC single iteration | Second after P0-1 | ~150-200 LOC, ~25 tests |
| **P0-3** | **Time-range default `'30d'` → `'all'` + `time_range` analytics event property + 6-column default-pack 7th column = `cycle_time_mean_ms`** | 8-of-8 agent unanimity; user-visible change closing CEO Signal 1 | Bundle with Wave A or third iteration | ~30 LOC, ~10 tests |
| **P0-4** | **Time-range persistence in UserDashboardPreference (schemaVersion 1→2 migration)** | Per-user preference; D+3 schema extension; depends on P0-3 shipping first | Fourth | ~40-60 LOC, ~12 tests |
| **P0-5** | **WDC-P03 empty-state activation pull (row #76 already open; ship with Growth copy)** | 4-agent convergence; ready-to-apply copy from Growth | Standalone iter (independent) | ~30 LOC, ~5 tests |
| **P0-6** | **QA BLOCKER 1 — ColumnPicker + PresetChipRail + SavedView axe regression coverage** | New `role="dialog"` surface never WCAG-scanned; ARIA pattern false-quiet risk; ship BEFORE AI Vision Build adds dashboard surfaces | Standalone iter | ~50 LOC test + Playwright fixtures, 0 prod LOC |
| **P0-7** | **Workflow Detail Panel (slide-in drill-down)** | PM #1 non-customization gap; UX/Analytics convergence; AI Vision Build pre-requisite landing zone | Standalone M-L iter | ~400-600 LOC + tests |

**Pool delta: 40 → 47** (+7 P0 promotions). Each closes a single-logical-outcome iteration unit per CLAUDE.md Mode 5 guardrail 7(b) test.

---

## 15. Cold Pool — P1/P2/P3 Findings Held in This Artifact

Per MR-005 D-5 audit-intake pattern, the following are held in cold pool (this artifact) for future PRD-trigger promotion or P0-burn-down-creates-slot promotion. Numbered for traceability.

### P1 (highest priority — 11 items)

| ID | Finding | Source agent |
|---|---|---|
| WDC2-R01 | Preset apply FilterState bridge (TD-2/TD-3 — `handleApplyPreset` / `handleApplySavedView` drop `filters: FilterSet`; saved views capture column-only) | FE TD-2 + TD-3, QA Q9 Item 1 |
| WDC2-R02 | `recent_activity` preset apply-time date injection (currently empty `filters: []`; label "Recent Activity" misleading) | QA Q9 Item 2, FE §1 obs |
| WDC2-R03 | `applyFilters` called twice per render (DashboardV2Shell + WorkflowList both call with separate `nowMs`) | FE TD-1 |
| WDC2-R04 | `extractSystems` unmemoized (re-runs on save-debounce cycles + picker open/close + every render) | FE Hot Path C |
| WDC2-R05 | `sortWorkflows` unmemoized (spreads + sorts on every render) | FE Hot Path B |
| WDC2-R06 | WorkflowRow not wrapped in `React.memo` (largest potential regression point at N=100+ workflows) | FE Hot Path E |
| WDC2-R07 | Tighten audit-honesty IFF test to assert "available IFF data-actually-reachable" (would have caught Wave A) | QA §8 + Architect §11 Risk 2 |
| WDC2-R08 | N-attribution differentiation pattern on row stats ("4m 32s · 47 runs") | Competitive §8, Architect implicit |
| WDC2-R09 | `dashboard_time_range_changed` + `dashboard_time_range_defaulted` analytics events (acceptance metric prereq) | Analytics §5 |
| WDC2-R10 | `workflow_column_sorted` event extension to existing `dashboard_v2_sort_changed` | Analytics §6 |
| WDC2-R11 | `workflow_detail_opened` + `workflow_stat_drillthrough` + `workflow_stat_feedback` analytics events | Analytics §7 |

### P2 (medium priority — 14 items)

| ID | Finding | Source agent |
|---|---|---|
| WDC2-R12 | "Reset to defaults" affordance in ColumnPicker drawer (one-click path back to 6-column default-pack) | QA Q9 Item 3 |
| WDC2-R13 | 4-column vs 6-column fallback gap when `visibleColumns` undefined (production never hits but footgun) | QA Q9 Item 4 + iter 063 obs |
| WDC2-R14 | `my_teams_bottlenecks` label vs filter mismatch (label promises team-scope; filter uses `opportunity_tag` proxy) | QA Q9 Item 5 + iter 062 obs |
| WDC2-R15 | ColumnPicker secondary-entry visibility (current trigger button is quiet right-aligned; add "Customize" text link near table header) | UX §11 + UX §12 #2 |
| WDC2-R16 | PresetChipRail "Quick views:" or "Column presets:" label (chips currently look like filters semantically) | UX §11 + §12 #2 |
| WDC2-R17 | HealthTooltip click-target visual indicator (no `cursor-pointer` / chevron / underline; users won't discover) | UX §11 |
| WDC2-R18 | Time-range selector visible label (remove `sr-only`; address WDC-R25 cold-pool) | UX §2 + §5 |
| WDC2-R19 | Time-range delta-label disagreement ("vs last 30d" regardless of selected range) — closes WDC-R14 cold-pool | UX §2 |
| WDC2-R20 | `stepCountVarianceStdDev` surfacing (already plumbed via iter-049, UNCONSUMED in `WorkflowMetricsOutput`) | FE Q7 |
| WDC2-R21 | `workflow_stat_cell_hovered` analytics event (500ms threshold + dwell bucket) | Analytics §6 Event 2 |
| WDC2-R22 | `minRunsRequired: number` field added to `WorkflowDashboardColumn` interface (formalize min-N thresholds in registry) | PM §7 + Analytics §2 + QA §8 |
| WDC2-R23 | ColumnPicker `detectActivePreset` mirror-drift between PresetChipRail.test.ts and ColumnPicker.test.ts — export from `presets.ts` | QA §11 + iter 062 obs |
| WDC2-R24 | Variance presentation choice: raw std-dev vs CV % vs color-coded indicator | Competitive §6 Pattern 3 + Growth §3 |
| WDC2-R25 | Filter-on-pending-column UX (show pending columns with "—" + header tooltip vs hide; current picker-disabled behavior is correct) | UX §9 |

### P3 (lower priority — 11 items)

| ID | Finding | Source agent |
|---|---|---|
| WDC2-R26 | `filterNowMs` stale-clock edge case for long-lived component instances (no test; low real-world risk per iter-045 obs) | QA Q2 Site 2 |
| WDC2-R27 | Statistical column null/zero/edge-case rendering tests in WorkflowRow (`avgTimeMs === 0` / `null` formatting) | QA Q7 |
| WDC2-R28 | `duration` dataType `between` filter test coverage in filters.test.ts (existing tests cover `number` not `duration`) | QA Q7 |
| WDC2-R29 | Subtext duplication: `workflow_title` cell carries 3 layers (name + systems/last-run/run-count), redundant when "Systems" column also visible | UX §3 |
| WDC2-R30 | Kebab discoverability on wide viewports with many columns (kebab position drifts; may feel unreachable on first encounter) | UX §11 |
| WDC2-R31 | Saved-view switching affordance is buried inside ColumnPicker drawer (Story 8) — promote to top-level affordance | PM Story 8 |
| WDC2-R32 | AI preset disabled tooltip language alignment at public-launch ("Coming in an upcoming release" vs "Available after Path C R+1") | Growth §5 + iter 062 obs |
| WDC2-R33 | Bundle audit observation: ColumnPicker imports full `WORKFLOW_DASHBOARD_COLUMNS` registry into client bundle | FE §3 |
| WDC2-R34 | Page IA: 3 stacked chip-strip surfaces (insight + preset + filter) — confuses new users about what each controls | UX §1 |
| WDC2-R35 | Performance baseline at large-N (>200 workflows): no test; sort stability with identical timestamps untested | QA Q6 |
| WDC2-R36 | `currentFilters={[]}` hardcoded in DashboardV2Shell prop to ColumnPicker — saved views silently capture empty filters (cannot be fixed without WDC2-R01) | FE TD-3 |

**Total cold pool: 36 items across P1/P2/P3.** Promotion paths per MR-005 D-5: (a) P0 burn-down creates a slot; (b) PRD-trigger enumerated dependency.

---

## 16. CEO Decisions Pending

### Top-tier — 8-of-8 agent convergence, recommend APPROVE

**D-01 — Time-range default `'30d'` → `'all'`**
- 8/8 agent convergence; competitive evidence decisive (7/8 platforms default to full event-log)
- Coordinator default: **APPROVE**
- Implementation: 1 production LOC; bundles cleanly with `time_range` analytics event addition

**D-02 — Wave A registry mis-classification fix + ai_opportunity_score + Wave B stats (8 columns flip to `available`)**
- 4-agent convergence (Architect + FE + Analytics + QA)
- Directly satisfies CEO "calculate average time, std dev, etc. when available" directive
- Coordinator default: **APPROVE** — ship as Mode 2 directed pick pre-Path-C-R+1
- Dependency: P0-1 ColumnAccessorContext extension must ship first

**D-03 — `ColumnAccessorContext` architectural extension (`referenceNowMs + activeTimeRange`)**
- Architect §5 Guard 1 — prerequisite for time-window-dependent stats
- Coordinator default: **APPROVE** — small (~50 LOC) iteration before D-02

**D-04 — 7th default-pack column = `cycle_time_mean_ms` ("Avg Time")**
- 7/8 agent convergence (excluding QA which didn't address column-pack)
- Coordinator default: **APPROVE** — bundle with D-02

### Mid-tier — Specific arbitrations required

**D-05 — Statistics presentation choice: numeric vs CV vs color-coded indicator**
- Divergence: PM/Growth prefer numeric; UX/Competitive note color-coded variance is more scannable
- Coordinator default: **NUMERIC PRIMARY**, with color-coded variance indicator deferred to post-launch UX iteration

**D-06 — N-attribution alongside statistics ("4m 32s · 47 runs")**
- Competitive §8: untested category-first differentiator
- Coordinator default: **APPROVE** — architecturally trivial (N already in `runs` field), highest-leverage differentiation surfaced

**D-07 — Drill-down view: slide-in panel vs full-page navigation**
- Divergence: UX panel; PM implies full-page; remaining 6 didn't address
- Coordinator default: **SLIDE-IN PANEL PRIMARY** with "View full details →" link inside panel for full-route navigation (hybrid)

**D-08 — Time-range persistence: existing-user migration strategy**
- Unified `'all'` default for all users (recommended) vs preserve `'30d'` for existing + `'all'` for new
- Coordinator default: **UNIFIED `'all'`** — cleaner UX consistency

**D-09 — WDC-P03 empty-state ship with Growth copy attached**
- 4-agent convergence; copy ready
- Coordinator default: **APPROVE** — ship row #76 with Growth-drafted copy

**D-10 — ColumnPicker drawer axe regression test (QA BLOCKER 1)**
- QA HIGH severity gap before AI Vision Build
- Coordinator default: **APPROVE** — ship standalone iter

**D-11 — Preset apply FilterState bridge (QA BLOCKER 2 / TD-2 / TD-3)**
- QA HIGH severity gap
- Coordinator default: **APPROVE** — close silent behavior gap; ~40-60 LOC adapter iteration

### Lower-tier — Operational / launch-timing

**D-12 — 5 acceptance metrics for `'all'` default validation** (Analytics §8)
- Coordinator default: **APPROVE** — formalize as #57-equivalent gate for default-change validation

**D-13 — Min-N thresholds formalized as `minRunsRequired` field in `WorkflowDashboardColumn`** (PM §7 + Analytics §2)
- Coordinator default: **APPROVE** — bundle with D-02 Wave A fix

**D-14 — 5 NEW analytics events** (`dashboard_time_range_changed` / `_defaulted` / `workflow_column_sorted` extension / `workflow_stat_cell_hovered` / `workflow_detail_opened`)
- Coordinator default: **APPROVE** — bundle by iteration that ships the relevant surface

**D-15 — 5 brand-voice POLISH substitutions** (Growth §8 + §9)
- Coordinator default: **APPROVE** — bundle as one small iteration (~30 LOC across 3 files)

**D-16 — AI Vision precursor copy** for variance-high indicator (Growth §10)
- Coordinator default: **APPROVE** when AI Vision Build approves; pre-stage copy in this artifact

**D-17 — DV2-R10 API envelope `{data, error, meta}` ratchet** (existing backlog row; QA flagged sequencing concern)
- Coordinator default: ratchet BEFORE shipping new statistical columns to avoid throwaway test code

**D-18 — N-attribution visual treatment** (inline `"4m 32s · 47 runs"` vs secondary line vs tooltip)
- Coordinator default: **INLINE WITH SEPARATOR** — most direct signal-to-noise

**D-19 — Sparse-state copy refresh** (Growth §7 "Record 2 more to unlock health score comparison")
- Coordinator default: **APPROVE** — bundle with D-09 empty-state work

**D-20 — Saved-view switching affordance promotion** (Story 8 — buried inside ColumnPicker drawer)
- Coordinator default: **DEFER** — wait for usage data; consider post-launch UX iteration

---

## 17. Implementation Sequencing Recommendation

Proposed iteration ordering (post-MR-016, post-CEO-approval-of-this-review):

| Iter# | Scope | Effort | Risk | CEO decisions addressed |
|---|---|---|---|---|
| iter 065 | **`ColumnAccessorContext` extension** (P0-1) — pre-requisite for time-window stats | S (~50 LOC, ~6 tests) | Low | D-03 |
| iter 066 | **Time-range default change + analytics prereq + 7th default-pack column** (P0-3) — closes CEO Signal 1 directly | S (~30 LOC, ~10 tests) | Low | D-01, D-04, D-12 (partial), D-14 (partial) |
| iter 067 | **Wave A registry fix + Wave B Stats + ai_opportunity_score** (P0-2) — closes CEO Signal 2 directly | M (~150-200 LOC, ~25 tests) | Low (relies on iter 065) | D-02, D-13, D-18 |
| MR-017 (Mode 4 absorption) | Mandatory at iter ~067-068 close per 3-loop cadence; absorbs this audit-intake + Path D completion lessons-learned + AI Vision Build entry trigger | Mode 4 non-counting | — | — |
| iter 068+ | **Time-range persistence v2 schema** (P0-4) | S-M (~40-60 LOC, ~12 tests) | Low | D-01-D, D-08 |
| iter 069+ | **WDC-P03 empty-state ship + Growth POLISH substitutions** (P0-5 + D-15) | S (~50 LOC + ~5 tests) | Low | D-09, D-15, D-19 |
| iter 070+ | **ColumnPicker axe regression coverage** (P0-6) | S (~50 LOC test only) | Low | D-10 |
| iter 071+ | **Preset apply FilterState bridge** (P0-7 partial — TD-2/TD-3) | S-M (~40-60 LOC + ~10 tests) | Low | D-11 |
| iter 072+ | **Workflow Detail Panel slide-in** (P0-7 full) | M-L (~400-600 LOC + ~20 tests) | Med (new UX surface) | D-07 |
| AI Vision Build entry | Post above sequence + CEO approval of AI Vision top-4 decisions | — | — | — |

**Total: 7 iterations to ship all 7 P0 promotions** (iter 065-072 inclusive of 1 Mode 4 MR-017). Path D completion + WDC-002 P0 burn-down conclude by iter ~072. AI Vision Build entry ready thereafter assuming CEO PRD approval.

---

## 18. Counter Preservation (Mode 3-adjacent NON-counting)

| Counter | At entry (iter 064 post-MR-016) | At close (post-WDC-002) | Delta |
|---|---|---|---|
| Pool | 40 | **47** | +7 P0 promotions (WDC-002-promoted) |
| Cool-off recharge | 3/3 FULL RE-ARM | 3/3 FULL RE-ARM | UNCHANGED (Mode 3-adjacent preserves; 10-event preservation streak holds) |
| D-1 reverse-portfolio-drift | 7 | 7 | UNCHANGED (Mode 3-adjacent does not advance 5-iter window) |
| Area saturation rolling-5 | RESET by iter 064 MR-016 | NOT advanced | UNCHANGED |
| MR-017 cadence | 0/3 | 0/3 | UNCHANGED (Mode 3-adjacent NON-counting) |
| #57 flag-retirement chain | 10/10 ENGINEERING-COMPLETE | 10/10 ENGINEERING-COMPLETE | UNCHANGED |
| External-launch MDR-blocker gate | 7/7 CLOSED — FULL | 7/7 CLOSED — FULL | UNCHANGED |
| Cold-pool ages | DV2=0 (post-MR-016 RESET) / MDR=7 / WDC=7 / PIB=7 | Same | Mode 3-adjacent does not increment |

**6th audit-style intake event** (DV2 iter 026 + MDR iter 032 + WDC iter 033 + PIB pre-iter-058 + AI-VISION iter pre-064 + **WDC-002 this intake** cumulative across 6 instances). Pattern operating cleanly.

---

## Appendix A — 8-Agent Engagement Summary

| Agent | Output length | Key contribution |
|---|---|---|
| `product-manager` | ~3,800 words | 12 questions covering ICP / wedge / default behavior; 8 critical user stories; 5 open CEO questions |
| `ux-designer` | ~4,200 words | Above-the-fold scan order audit; time-range selector defect inventory (3); statistical visual treatment tiers; drill-down panel design; affordance discoverability audit (5 affordances); top 5 UX improvements ranked |
| `system-architect` | ~3,500 words | **Wave A registry mis-classification finding** (5 columns flip to `available`); migration tuple per column; `ColumnAccessorContext` extension; snapshot-table architecture implications; top 3 architecture risks |
| `frontend-engineer` | ~4,100 words | Render performance audit (5 hot paths); 3 critical technical-debt items (TD-1/2/3); 3 quick wins; implementation cost estimates per change; bundle audit |
| `analytics` | ~4,000 words | Decision-relevance per statistic (9 stats); concrete min-N thresholds; 5 acceptance metrics for default change; 5 NEW events specified; 5 AI eligibility precursor stats |
| `qa-engineer` | ~3,600 words | **2 QA BLOCKERS** before AI Vision Build (axe gap + FilterState gap); 5 test coverage gaps; concrete test blocks for `'all'` default change; 6 carry-forward observations; 3 test infra improvements |
| `growth-strategist` | ~3,400 words | 6 column labels + 6 tooltip descriptions ready-to-apply; 5 POLISH substitutions; empty-state + sparse-state copy ready; AI Vision precursor copy for variance-high; 5 open positioning decisions |
| `competitive-researcher` | ~3,800 words | **7/8 surveyed platforms default to full event-log** (validates CEO instinct); statistics-on-row pattern: universal floor is avg + count; **std-dev on row = world-class-exceeding** differentiation opportunity; 5 visual treatment patterns; 5 common pitfalls; moat preservation analysis |

**Total cumulative agent output: ~30,400 words** across 8 reports synthesized to ~7,200-word artifact preserving cross-agent convergence + divergence map + open-decision enumeration.

---

## Appendix B — Source Citations + Confirmed Code Locations

Confirmed via direct code inspection during pre-delegation orientation:

- `DashboardV2Shell.tsx:161` — `useState<TimeRange>('30d')` current default state
- `filterByTimeRange` at `DashboardV2Shell.tsx:98-106` — client-side filter on `Workflow.createdAt`
- `workflow-metrics.ts:121` — `medianDurationMs: number | null` in `WorkflowMetricsInput.processDefinition`
- `workflow-metrics.ts:147-151` — Layer 3 intelligence fields (iter-049): `sequenceStability` / `stepCountVarianceStdDev` / `standardPathFrequency` / `variantCount`
- `WorkflowMetricsOutput.aiOpportunityScore` — already returned by API; PIB F12 flagged hidden in HealthTooltip only

Per-agent external citations (Competitive §): Celonis Process Explorer docs / UiPath Process Mining docs / SAP Signavio April 2025 release notes / IBM Process Mining docs / Soroco Scout Gartner reviews / Scribe Optimize launch notes / Microsoft Process Advisor docs / Apromore documentation / Appian Process Mining v5.x / ABBYY Timeline / Celonis Variant Explorer / Best Process Mining Platforms Gartner Peer Insights 2026.

---

## End of Artifact

**Coordinator action items immediately following CEO disposition:**
1. Promote 7 P0 rows to `IMPROVEMENT_BACKLOG.md` with `Birth iter: audit-intake-WDC-002`
2. Update 5 mirror artifacts (ITERATION_LOG / CHANGELOG / SYSTEM_HEALTH / CLAUDE.md / IMPROVEMENT_BACKLOG header narrative)
3. Cold pool reference held in this artifact for future PRD-trigger promotion or P0-burn-down-creates-slot promotion
4. Sequencing per §17: iter 065 = P0-1 `ColumnAccessorContext` extension as first executable Mode 2 directed pick
