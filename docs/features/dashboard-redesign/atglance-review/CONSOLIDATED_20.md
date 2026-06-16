# Workflows Dashboard — At-a-Glance & Navigation Review (Consolidated 20)
**Ledgerium AI · 2026-06-15 · Synthesis of the 6-specialist board** (UX · PM · frontend · analytics · growth · competitive)
Per-lens artifacts in this folder: `UX_/PM_/FRONTEND_/ANALYTICS_/GROWTH_/COMPETITIVE_DASHBOARD_REVIEW.md`. Analysis only — no product code changed.

## Verdict
The live surface is `<DashboardV2Shell />` (page.tsx:316 returns it for everyone; the ~1,300-LOC v1 below renders only behind `?v2=0`). It is **data-rich, honesty-exemplary, and hydration-defended** — but **built for the analyst, not the newcomer**. The data to answer the four persona questions ("which workflows matter / where's the opportunity / what changed / what do I do next") is present; only ~1.5 of 4 land at a glance. Nearly every fix is **render-only / wiring / copy** — honesty-safe and hydration-safe.

## Cross-agent convergence (independently flagged by ≥3 boards)
- **Triple "88"** — portfolio health renders 3× in one viewport (CommandHeader rail + KPI tile + HealthGauge). [UX, PM, competitive]
- **Orient before alert** — page opens on a raw bottleneck/jargon line, not "what is this / what next"; the honest `NarratorSummary` sentence exists but is buried last. [UX, PM, growth, competitive]
- **Controls that look like navigation but don't navigate** — KPI tiles fire analytics but do nothing visible; preset chips change *columns, not row filters* (deferred FilterState↔FilterSet apply); OpportunityBar/Pareto under-wired. [UX, PM, analytics, competitive]
- **Lens switcher is undiscovered jargon** — "Measure & Analyze" reads as page nav, no caption, swaps the whole view. [UX, PM, growth, competitive]
- **Jargon walls** — Pareto / "vital few" / cycle time / health / opportunity-tags unglossed. [UX, growth, analytics, competitive]
- **Empty/first-run is an analyst cockpit, not a tutorial** — never points at "open your first workflow." [PM, growth, competitive]

---

## The 20 (grouped; ranked within group)

### A — At-a-glance comprehension (understand in <10s)
1. **Orient before alert** — purpose subtitle under the H1 + promote `NarratorSummary` to the top of the band. *Benefit:* newcomer gets what+how-many+what's-wrong+next in 3s. *S.* Render-only; sentence already honest.
2. **Kill the triple-88** — keep ONE health representation (verdict/hero), drop the tile or gauge. *Benefit:* removes "are these 3 different numbers?" tax + frees prime space. *S.*
3. **Workflow list above the fold** — condense the band so the primary object (rows) appears on load. *Benefit:* the thing users came for is visible immediately. *M.*
4. **High-Variance KPI tile** — surface `highVariationCount` (today buried in narrator prose), "of K multi-run workflows". *Benefit:* the #1 Standardize signal becomes scannable. *S.* Gate denominator to runs ≥ 2.
5. **Surface hidden row signals** — variation badge (`variationLabel`) + bottleneck chip (`bottleneckLabel`) on rows. *Benefit:* belts triage the standardize/friction story by scanning. *M.* Honesty-gated (omit when absent).
6. **Honest KPI provenance + units** — "across N *timed* workflows", "delta needs ≥3 prior", "candidacy, not ROI"; tooltips on each tile. *Benefit:* the honest numbers become self-explanatory. *S.* Increases honesty.
7. **Tier-2 library-facts row + honest sparklines/deltas** — total runs · distinct systems · needs review · recorded this week; 1-line sparkline from `activityByWeek` only where a real prior period exists, else "—". *Benefit:* answers "16 workflows = how much evidence?" *S–M.*

### B — Navigation & learnability (find it, understand it, use it)
8. **Plain-language lens tabs + caption** — rename "Measure & Analyze"; add "Two views — switch anytime" from the existing honest `description`; make the switch obviously primary. *Benefit:* users discover and understand the analysis view. *S.*
9. **Make clickable things navigate** — wire KPI tiles + Pareto bars + narrator to existing filter handlers (OpportunityBar already does); downgrade truly non-interactive elements. *Benefit:* trust in affordances; at-a-glance surfaces become drill entry points. *S–M.*
10. **Fix the preset-chip over-promise** — chips filter *rows*, not just columns (close the deferred FilterState↔FilterSet apply); interim: rename to "column views". *Benefit:* one-click views do what their label says. *M (wire) / S (rename).*
11. **Unified active-filters bar + one Clear-all** — consolidate the 4 independent filter mechanisms (opportunity segment, insight chip, filter panel, presets). *Benefit:* user always knows what's constraining the list + resets in one click. *M.*
12. **Reduce the control stack** — surface Search + "Quick views:"; collapse advanced (Density/Columns/Sort) behind "Customize" with a Columns nudge. *Benefit:* removes decision paralysis from ~12 visible controls. *M.*
13. **Jargon glosses / metric tooltips** — Pareto / "vital few" / cycle time / runs / health / an opportunity-tag legend (automate/standardize/optimize/monitor/healthy). Definitions only — NO fabricated targets. *Benefit:* decode the dashboard without leaving it; tooltips can cite "derived from N observed runs" (moat). *S.*
14. **Empty/first-run as a glossed walkthrough** — suppress analyst chrome at 0 workflows; install → record → see-it-measured; rewrite the sparse copy to invite the first click instead of deferring it ("record 2 more"). *Benefit:* highest activation lever. *S–M.*
15. **Scannable dense list + disambiguate rows** — right-align numerics, sticky header, system + last-run subtitle under near-duplicate titles. *Benefit:* faster scanning; "Approve Expense Report (Sample)" rows become distinguishable. *M.*
16. **Slide-in workflow detail panel** — open a row in a panel over the dashboard instead of full-page nav. *Benefit:* triage/compare without losing list context, filters, scroll. *L.* Render-only over existing `/workflows/{id}` data.

### C — Correctness, code-health & measurement (keep it honest, safe, learnable)
17. ⚠️ **HYDRATION/DETERMINISM RISK — lift `Date.now()` out of per-row render** (`WorkflowRow.tsx:788` builds `accessorContext` with a fresh per-row clock). *Benefit:* removes a latent hydration-mismatch landmine (the code comment admits it fires the moment a time-windowed accessor consumes it) + per-row clock cost. *S.* **This is the recurring production-crash class — surface, fix deliberately under the gate.**
18. **A11y/navigation wiring cluster** — dangling `aria-controls` on lens tabs (panel only exists in LSS); lens arrow-keys activate (selection-follows-focus reconfigures the table); whole-`<tr>` click target wraps the kebab/edit input (Space opens kebab); ColumnPicker claims a focus trap it doesn't have; health breakdown keyboard-unreachable. *Benefit:* keyboard/AT users can actually navigate. *S each.*
19. **Performance/correctness cluster** — collapse the double, unmemoized filter+sort (shell computes `filteredWorkflows` then passes the *unfiltered* set to `WorkflowList`, which re-filters; nothing memoized); drive cell formatting from registry `dataType` not value-shape guessing (a count of 1500 renders "25m"); surface/retire the dead v1 branch (governance-gated on #57 soak — don't silently delete). *Benefit:* filtering runs once; values never mislabeled; less bundle/maintenance. *S–M.*
20. **Comprehension/navigation instrumentation + funnel** — wire `preset_view_applied` on the v2 PresetChipRail (zero signal today); add `lens` to `dashboard_v2_viewed`, `originSurface` to `workflow_row_clicked`, + `column_picker_opened` / `empty_state_cta_clicked` / `pareto_bar_clicked`; stand up the land→understand→navigate funnel. *Benefit:* we can actually measure whether the at-a-glance band causes navigation. *S–M.* Numeric/taxonomy only; PostHog no-content posture preserved.

## Recommended first batch (one render-only, honesty-safe, high-comprehension iteration)
**#1 orient-before-alert · #2 kill triple-88 · #8 lens rename+caption · #13 jargon glosses · #6 KPI provenance** — plus **#17** folded in as the correctness fix (it's in the same files). This is the "B+ legibility lift" with zero new engine work, zero new metrics, and it closes the one hydration landmine. Effort ~S–M, single gated iteration.

## Honesty / determinism guardrails (applied to every item)
Observed-only; no DPMO/sigma/Cp-Cpk/cost/takt; proxies labeled (exception rate ≠ defect rate; `lastRunAt` is an `updatedAt` proxy); deltas only where a real prior period exists; no `Date.now()`/`Math.random()` in render; design tokens; hydration-safe; no new extension capture.
