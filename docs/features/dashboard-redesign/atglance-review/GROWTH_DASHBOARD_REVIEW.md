# Growth & Activation Review — Workflows Dashboard "At a Glance"

**Reviewer:** growth-strategist (activation lens)
**Date:** 2026-06-15
**Scope:** `apps/web-app/src/components/dashboard-v2/*` (the live default surface — `page.tsx` renders `<DashboardV2Shell />` for all users; the long v1 page is only the `?v2=0` fallback).
**Goal evaluated:** Can a first-time OR returning non-expert user, in the first ~10 seconds, answer (a) *What am I looking at?* (b) *What do I do next?* (c) *How do I navigate this?*
**Hard constraint honored:** Honesty is the moat. Every copy suggestion below references only signals the engine already computes (observed time, runs, variant count, opportunity tag, health score, recorded-this-month). No fabricated benchmarks, outcomes, social proof, or LSS statistics the engine does not surface. All suggestions are render-only / copy / wiring — no new capture, no determinism or hydration risk.

Sources read: `DashboardV2Shell.tsx`, `CommandHeader.tsx`, `WorkflowList.tsx` (all 6 states), `LensSwitcher.tsx` + `lenses.ts`, `LssParetoPanel.tsx`, `PresetChipRail.tsx`, `UnifiedToolbar.tsx`, `InsightsStrip.tsx`, `TopBand.tsx` + `KpiTileStrip.tsx` + `NarratorSummary.tsx`, screenshots `dashboard-list.png`, `dashboard-lss.png`, `dashboard-empty.png`.

---

## Executive summary

The dashboard is **dense, honest, and visually strong** — the TopBand KPI tiles, health gauge, opportunity mix, weekly trend, and Pareto are all real and well-labeled. The honesty discipline is exemplary (median-cycle-time shows "across N workflows", health is the only tile with a delta, absent values render "—"). **But the page over-indexes on the analyst and under-indexes on the newcomer.** There is no one-line statement of *what this product is*, no first-run orientation, and several controls (Lenses, Columns, preset chips, Pareto) are powerful but unexplained — a non-expert meets jargon walls ("Pareto", "the vital few", "Cycle-time spread", "Consistency signals", "Opportunity: automate/standardize") with no gloss. The empty/first-run state is honest but thin, and the *moment a user opens their first workflow* is never pointed at. The fastest activation wins are pure copy: a purpose subtitle, a glossed first-row tooltip on each control, a "where to start" cue in sparse state, and gentle gating-tooltip honesty.

Severity legend: **P0** = blocks a newcomer from understanding/navigating · **P1** = high activation friction · **P2** = polish.

---

## 1. (P0) No one-line "what is this / what to do" purpose statement anywhere on the page

**Problem.** `CommandHeader` renders the H1 "Workflows" and, *only if* a top insight chip exists, a single insight sentence beside it (e.g. *"Bottleneck: Step 2 is a bottleneck → investigate step owner"* in the screenshot). For a first-time user that subtitle is **a cryptic alarm, not an orientation** — it presumes the user already knows what a bottleneck/step-owner is and what the page is for. When there is no top insight, the H1 stands completely alone. There is nothing that says *what Ledgerium does with these workflows* or *why the user is here*.

**At-a-glance benefit.** A purpose line is the single highest-leverage orientation element — it frames every number below it.

**Suggestion (render-only).** Add a persistent, honest one-line purpose subtitle under the H1 that does **not** depend on insight data. Demote the insight sentence to the TopBand/InsightsStrip (where chips already live) so it stops masquerading as the page description.

> **"Workflows"**
> *Every digital process you record, measured from real behavior — cycle time, variation, and where AI could help.*

This claims only what we compute (cycle time ✓, variation ✓, opportunity/automation tag ✓). It is identical for new and returning users and never fabricates an outcome.

---

## 2. (P0) First-run / empty state has weak activation pull and no "what happens next"

**Problem.** Two empty paths exist and they disagree in strength:
- The **v2 list empty state** (`WorkflowList.tsx`, `state === 'empty'`) is decent: *"No workflows recorded yet."* + honest body + **"Install extension to start →"** + "Upload a recording →". Good.
- But the **band, header score, lenses, toolbar, preset rail, and column picker all still render** around it. A user with zero workflows sees a full analyst cockpit wrapped around an empty table — the chrome implies "you should already understand all this," which is intimidating, not inviting. `CommandHeader` does swap in *"Record your first workflow to see your Process Health Score"* (good, honest), and `TopBand` correctly suppresses itself at 0 workflows (good) — but the **Lens tabs, the Columns button, the preset chips, and the Filter/Sort/Density controls remain live and meaningless** with no data.

**Activation benefit.** The first session is the only moment activation is decided. Reducing the empty-state surface to *one obvious action* raises install/upload conversion.

**Suggestions.**
1. **In `empty` state, suppress the analyst chrome** the user can't yet use: hide the LensSwitcher, the preset chip rail, Columns, Sort, Density, and Filter (render-only conditional on `listState === 'empty'`). Keep Search hidden too — nothing to search. Leave only the header + the empty-state CTA block.
2. **Strengthen the empty-state body into a 3-step "what happens" mini-walkthrough** (copy-only), so the value loop is legible before any data exists:

   > **No workflows yet — here's how Ledgerium works:**
   > **1. Record** — install the extension and capture any digital process once.
   > **2. Measure** — we time it, find the steps, and flag variation automatically.
   > **3. Act** — see where to standardize or automate.
   > **[ Install extension to start → ]**  ·  Already recorded elsewhere? *Upload a recording →*

   Every verb maps to a real capability. No numbers, no claims.

---

## 3. (P0) The Lens switcher ("Library" / "Measure & Analyze") is undiscoverable and unexplained

**Problem.** `LensSwitcher` renders a tablist with two tabs: **"Library"** and **"Measure & Analyze"**. To a newcomer:
- It looks like two *pages*, not two *views of the same data* — and nothing says switching is free/non-destructive.
- **"Measure & Analyze"** is a Lean Six Sigma DMAIC phase name. The only explanation is a `title` tooltip (`config.description` = *"Lean Six Sigma view: cycle time, run volume, and a Pareto of where your time goes."*) — invisible on touch, easy to miss on hover, and itself jargon-laden ("Lean Six Sigma", "Pareto").
- The screenshots confirm the two tabs sit with no sub-label; clicking the second one drops the user into a Pareto chart with zero framing.

**Navigation benefit.** Telling users these tabs exist *and what each is for* is the difference between "two confusing pages" and "two helpful lenses."

**Suggestions.**
1. **Rename the LSS tab to a plain-language label** and keep the expert term as a secondary gloss, not the headline. Label: **"Time & Impact"** (or **"Measure"**), with the tooltip/description rewritten jargon-first-avoided:

   > *"See where your time goes — longest processes first, with a chart of the few that drive most of the work."*

   ("Lean Six Sigma" and "Pareto" can stay in docs; they don't belong in a first-run tooltip.)
2. **Add a one-line caption under the tablist** (render-only) clarifying these are views, not destinations:

   > *Two views of the same workflows — switch any time.*

3. Consider a tiny `(i)` affordance on the tablist that toggles a one-sentence "what's a lens?" line, so the explanation is reachable without hover.

---

## 4. (P0) Lean Six Sigma jargon wall in the "Measure & Analyze" panel with no gloss

**Problem.** `LssParetoPanel` is honest and beautiful but speaks fluent black-belt: **"Time impact (Pareto)"**, **"the vital few"**, **"total observed time"**, **"Consistency signals"**, **"Variants"**, **"Cycle-time spread"**. A line-ops user or PM will not know what a Pareto is, what "the vital few" means, or what "variants" are. The panel explains the *math* ("12 of 16 workflows account for ~80% of total observed time") but never the *so-what* in plain words.

**At-a-glance benefit.** One plain-language lead sentence turns an intimidating chart into an obvious insight.

**Suggestions (copy-only).**
1. **Lead the panel with a plain takeaway sentence** above the chart, before "Time impact (Pareto)":

   > *A few workflows eat most of your time. The tallest bars below are where focus pays off most.*

2. **Re-title the section header** to lead with meaning and keep "Pareto" as a parenthetical for the experts:

   > **"Where your time goes"**  ·  *(Pareto)*  ·  `{total} total observed time`

3. **Gloss "Variants" and "the vital few" inline.** "Variants" → keep the word but add a hover/sub: *"distinct ways this process was performed."* "the vital few" → keep but make the sentence self-explaining: *"…account for ~80% of total observed time — the few workflows worth tackling first."*
4. **"Consistency signals"** label → *"How consistent are these runs?"* and keep the honest "needs 2+ runs" / "—" fallbacks exactly as they are (they're a model of honesty).

---

## 5. (P1) Power controls (Columns, preset chips, Filter, Density) have no discoverability or purpose cue

**Problem.** `UnifiedToolbar` packs Portfolios · Search · Filter · Sort · Density · Columns into one row, then a preset chip rail below. Each is a bare icon+label. A newcomer doesn't know:
- That **"Columns"** lets them choose which of ~30 metrics to show (the product's core differentiator — `WDC-P02` was literally about exposing the metric library).
- That the **preset chips** ("Automation Candidates", "Needs Attention", "Standardize", "High Volume", "Recent Activity", "Ready to Share", "My Team's Bottlenecks", "AI Automation Candidates") are *one-click saved views* — they read like static tags.
- That **Density** even is what it is.

There are no tooltips on Filter/Sort/Density/Columns triggers; the preset chips only get a `title` tooltip that, for disabled chips, says *"Coming in an upcoming release"* or *"Team plan includes this preset — see plans →"* — but the **enabled** chips' tooltips are just the raw `preset.description`, and there is no row-level "these are quick views" framing.

**Navigation benefit.** Users adopt customization only if they discover it. A tiny purpose cue on first encounter unlocks the column library and preset views — the dashboard's most distinctive capability.

**Suggestions.**
1. **Add `title` tooltips (and `aria-label` already exist) to each toolbar trigger** with a plain purpose:
   - Columns → *"Choose which metrics to show — pick from your full workflow metric set."*
   - Filter → *"Narrow the list by system, health, or opportunity."*
   - Sort → *"Reorder the list (longest, newest, worst health…)."*
   - Density → *"Row height — compact, regular, or relaxed."*
2. **Label the preset rail.** Add a small leading label on Row 2: a non-interactive **"Quick views:"** prefix (render-only) so the chips read as actions, not tags.
3. **First-run nudge on the Columns button (copy-only, dismissible).** A one-time hint badge — *"New: customize your columns →"* — is the single best lever to surface the metric library. (Implement as a session-dismissible class; no persistence required for the lightweight version.)

---

## 6. (P1) The returning-user "what changed since last time" hook is thin and ambiguous

**Problem.** The only "since last time" signals are:
- `KpiTileStrip` Avg Health tile: *"+N vs last 30d"* (good, honest, the only true delta).
- Total Workflows tile: *"+N recorded this month"* (good).
- An InsightsStrip of chips (dismissible per session).

But there's no consolidated *"here's what's new for you"* line, and the **"vs last 30d" / "this month"** windows are **inconsistent with the header's time-range selector** (which now defaults to **"All time"** per `iter-067`). A returning user reading "All time" at the top, then "+3 recorded this month" and "+5 vs last 30d" below, gets **three different time frames on one screen** with no explanation of which governs what. That's an at-a-glance comprehension tax.

**At-a-glance benefit.** A returning user should get a "welcome back, here's the delta" read in one glance; mismatched windows undercut it.

**Suggestions.**
1. **Make the NarratorSummary returning-user-aware (copy-only, real stats).** It already builds an honest sentence from `totalWorkflows / avgHealthScore / highVariationCount / opportunityCounts`. Add an optional lead clause when `recordedThisMonth > 0`:

   > *"3 new workflows since last month. Your 16 workflows average a health score of 88. …"*

   (Only fires when `recordedThisMonth > 0`; otherwise the existing sentence stands — honest omission preserved.)
2. **Clarify the time-frame scoping.** Add a 1-line caption near the time-range select: *"Filters the list below — KPI deltas are always vs the prior 30 days."* This removes the three-window confusion without changing behavior.

---

## 7. (P1) Opportunity tags ("automate / standardize / optimize / monitor / healthy") are unglossed verdicts

**Problem.** The Opportunity column, the OpportunityBar segments, the narrator ("X are automation candidates / X need remediation before automation"), and preset chips all use the opportunity taxonomy. These are *verdicts* the engine assigns — but a newcomer doesn't know the rubric. "Standardize" vs "Optimize" vs "Monitor" is meaningful to a process analyst, opaque to everyone else. There is no legend.

**At-a-glance benefit.** A one-time legend turns five mystery words into an actionable map.

**Suggestion (render-only).** Add a compact, dismissible legend row beneath the OpportunityBar (it's the natural home — the segments are right there):

> **Automate** = repeatable & stable · **Standardize** = same process, many ways · **Optimize** = slow or heavy · **Monitor** = needs more runs · **Healthy** = no action needed.

Every definition reflects the actual scoring inputs (runs, variation, cycle time) — no fabricated thresholds stated as fact. Alternatively, attach these as `title` tooltips on each OpportunityBar segment and each Opportunity cell.

---

## 8. (P1) The "open your first workflow" moment is never pointed at

**Problem.** The entire activation thesis is: record → **open a workflow → see the SOP / flow / variants / evidence**. But nothing on the dashboard tells the user that *a row is clickable and that's where the value is*. In the **sparse** state (`WorkflowList.tsx`, 1–2 workflows) the notice says: *"Your first workflow is recorded. Record 2 more to unlock health score comparison across your library."* — which (a) is honest but **points away from the value** (it asks for more recording before any reward) and (b) never says *"open the one you have to see what we found."* A first-time recorder's first instinct should be to **click their workflow and be amazed**, not to go record two more.

**Activation benefit.** Getting a user into their *first workflow detail* is the aha-moment; the sparse copy currently defers it.

**Suggestion (copy-only).** Rewrite the sparse notice to point at the immediate reward first, then the library benefit as secondary:

> *"Your first workflow is ready — open it to see the steps, timing, and where it can improve. Record 2 more to compare health across your library."*

This claims only what the detail page shows (steps ✓, timing ✓, opportunity ✓). For the very first row, also consider a subtle "Open →" affordance hint on hover so the click target is unmistakable.

---

## 9. (P2) "Process Health Score" / "Portfolio Health" is an unexplained composite

**Problem.** A big number (88) sits top-right under "Portfolio Health" and recurs as a gauge and a KPI tile, with a colored rail and a "vs last 30d" delta. A newcomer has no idea what goes into it or what "good" is. The 3-band thresholds (poor/fair/good at 60/80) are invisible.

**At-a-glance benefit.** One tooltip makes the hero number trustworthy instead of arbitrary.

**Suggestion (copy-only).** Add a `title`/`aria-describedby` tooltip on the Portfolio Health widget and the HealthGauge:

> *"A 0–100 composite of confidence, SOP readiness, maturity, and review status across your workflows. 80+ is good, 60–79 fair, under 60 needs attention."*

States only the documented composition and the existing band thresholds — no invented benchmark.

---

## 10. (P2) "Cycle Time", "Runs", "Variants", "Conformance/Stability" terms used without first-encounter glosses

**Problem.** Column headers and tiles use **"Cycle Time"**, **"Runs"**, **"Last Run"**, **"Date Recorded"**, **"Median Cycle Time"**, and the LSS panel uses **"Variants"** and **"Cycle-time spread"**. "Cycle Time" especially is process-jargon (many users would call it "how long it takes"). The column registry *has* `description` fields (passed to non-sortable `<th title>`), but the **sortable** headers (Cycle Time, Runs, Last Run, Date Recorded, Opportunity, Health) render via `SortButton` with **no `title`** — so the most important columns have no gloss.

**At-a-glance benefit.** Tooltips on every column header let a non-expert decode the table without leaving the page.

**Suggestion (render-only).** Pass the registry `description` (or a plain gloss) as a `title` on the sortable `<th>`/`SortButton` too:
- Cycle Time → *"How long a run of this process takes, on average."*
- Runs → *"How many times this process has been recorded."*
- Last Run → *"When this process was most recently active."*
- Health Score → (see finding 9).

---

## 11. (P2) Disabled preset/feature tooltips leak internal language ("Path C R+1", "an upcoming release")

**Problem.** `PresetChip` disabled tooltip for AI/pending presets is *"Coming in an upcoming release"* (acceptable) — but the component comment and several places still reference internal milestones. The plan-gated tooltip *"Team plan includes this preset — see plans →"* is good and honest. Keep auditing that **no user-facing string** references internal codenames (Path C, R+1, iter numbers). This is a brand-voice hygiene item, not a bug.

**Suggestion.** Ensure every disabled-state string is user-meaningful: pending → *"Coming soon"*; plan-gated → keep current. (No fabricated "available date.")

---

## 12. (P2) No lightweight "first-run tip" / help affordance to explain the dashboard once

**Problem.** There's a global `?` help icon in the top nav (screenshots) but nothing dashboard-specific. A non-expert has no "tour" or even a single dismissible "Welcome — here's how to read this" card on first visit.

**Activation benefit.** A one-time, dismissible orientation card materially lifts first-session comprehension without nagging returning users.

**Suggestion (render-only, session-dismissible).** On first dashboard view (no persistence required for v1 — a session flag is fine), show a slim dismissible banner above the band:

> *New here? This page lists every process you've recorded and scores each for time, consistency, and automation fit. Click any row to dig in. [Got it]*

Only claims real capabilities; disappears on dismiss; never shown to users with an active filter/search.

---

## Honesty audit (passed)

The dashboard is a strong example of the honesty moat and **none of the above weakens it**:
- Median cycle time shows "across N workflows" (honest denominator). ✓
- Avg Health is the only tile with a delta (only one with a true prior value). ✓
- Absent values render "—"; single-run variation renders "needs 2+ runs"; sparse Pareto refuses to draw an 80/20 story under 3 bars. ✓
- NarratorSummary omits clauses it can't support rather than fabricating. ✓

Every copy suggestion in this review is constrained to those same real signals. No suggestion introduces a benchmark, a fabricated outcome, social proof, a new capture path, or a non-deterministic value.

---

## Top 8 candidate improvements (ranked)

| # | Title | Problem | At-a-glance / navigation / activation benefit | Effort |
|---|-------|---------|-----------------------------------------------|--------|
| 1 | **Purpose subtitle under "Workflows"** | H1 stands alone; the only subtitle is a cryptic insight alarm that presumes expertise | First-time users instantly learn *what this is*; frames every metric below | **S** |
| 2 | **Glossed first-run / empty state walkthrough + suppress analyst chrome at 0 workflows** | Empty list is wrapped in lenses/columns/chips that are meaningless and intimidating; CTA lacks a "what happens next" | Highest activation lever — one obvious action + a legible record→measure→act loop raises install/upload conversion | **S–M** |
| 3 | **Plain-language Lens tab rename + "two views, switch anytime" caption** | "Measure & Analyze" (DMAIC jargon) reads as a separate page; switching feels destructive/unexplained | Users discover the second view exists and what it's for; navigation clarity | **S** |
| 4 | **Plain takeaway lead + gloss on the Pareto/LSS panel** | "Pareto / the vital few / Consistency signals / Variants / Cycle-time spread" jargon wall with no so-what | Turns an intimidating expert chart into an obvious "focus here" insight | **S** |
| 5 | **Point at the "open your first workflow" moment (rewrite sparse notice)** | Sparse copy defers the aha-moment ("record 2 more") instead of inviting the click into the first detail page | Drives users into their first workflow detail — the actual activation aha | **S** |
| 6 | **Toolbar/control discoverability tooltips + "Quick views:" label + Columns nudge** | Columns/Filter/Sort/Density/preset-chips are bare icons; the metric-library differentiator is hidden | Unlocks the dashboard's most distinctive capability (custom columns + saved views) | **S–M** |
| 7 | **Opportunity-tag legend (automate/standardize/optimize/monitor/healthy)** | Five verdict words drive bar, narrator, chips, column — no rubric shown | Makes the central taxonomy actionable for non-analysts in one glance | **S** |
| 8 | **Column-header + Health-Score glosses (tooltips on sortable `<th>`)** | "Cycle Time", "Runs", "Health Score", "Last Run" used without first-encounter definitions; sortable headers have no `title` | Lets a non-expert decode the whole table without leaving the page | **S** |
