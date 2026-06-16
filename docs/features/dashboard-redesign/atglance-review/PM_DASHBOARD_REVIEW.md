# PM Dashboard Review — At-a-Glance Comprehension & Navigation

**Author:** Product Manager (review-only, no code changed)
**Date:** 2026-06-15
**Scope:** Workflows dashboard page (`/dashboard`), Dashboard V2 surface only.
**Goal:** Increase *at-a-glance understanding* and make it *obvious how to navigate and use* the dashboard.
**Method:** Grounded in the live code + the two committed screenshots (`dashboard-list.png`, `dashboard-lss.png`).

---

## 0. What the dashboard actually is today (ground truth)

`/dashboard/page.tsx` redirects **all** users to `<DashboardV2Shell>` (line 316–318). The ~2,000 lines of v1 below the redirect are dead unless `?v2=0`. So this review is about the v2 component tree only:

- **CommandHeader** — title "Workflows" + the topInsight sentence + a time-range `<select>` (default **All time**) + Portfolio Health score (88) with a "vs last 30d" delta.
- **LensSwitcher** — a `role="tablist"` with two tabs: **Library** (default) and **Measure & Analyze** (LSS). Client-only reframe of the same data; LSS swaps the column pack + sort and shows a Pareto panel.
- **TopBand** (Library lens) — 4 KPI tiles (Total Workflows hero, Median Cycle Time, Automation Candidates, Avg Health Score) + a HealthGauge + an **OpportunityBar** (clickable stacked segments) + a **RecordedTrendChart** (weekly bars) + a one-line **NarratorSummary**.
- **InsightsStrip** — up to 5 dismissible insight chips (severity icon + label + count); clicking filters the list.
- **UnifiedToolbar** — Row 1: Portfolios · Search · Filter · Sort · Density · Columns. Row 2: **PresetChipRail** (preset + saved-view chips).
- **WorkflowList / WorkflowRow** — the table; locked Workflow + Health Score columns, dynamic middle columns from the column registry; row click → full-page `/workflows/{id}`.
- **LssParetoPanel** (LSS lens) — Pareto of total observed time (mean × runs) + cumulative line + a "Consistency signals" strip (variant spread, cycle-time spread).

The engine computes far more than the UI surfaces (see §3). The honesty discipline in the code is genuinely good — proxies are labeled, absent values render "—", no DPMO/sigma/CV is fabricated. **That discipline must be preserved; the problem is not honesty, it is legibility and guidance.**

---

## 1. Findings (numbered)

### Comprehension / "do I get it instantly?"

**F1 — There is no one-line answer to "what is this page and what do I do here."**
The first words on the page are "Workflows" and then the *highest-severity insight chip text* (CommandHeader `topInsight.label`). In the screenshot this renders as a raw, jargon-y sentence: *"Bottleneck: Step 2 is a bottleneck → investigate step owner"* — sitting directly under the title with no framing. A new PM/belt cannot tell from the top of the page that this is "a library of recorded processes, ranked by health, where you find automation/standardization opportunities." The most prominent text is an unexplained alert, not an orientation.
*At-a-glance cost:* the user's first 3 seconds are spent decoding an alert instead of understanding the page. **High.**

**F2 — Two competing "health" numbers with no relationship explained.**
The CommandHeader shows **Portfolio Health 88**; the TopBand shows **Avg Health Score 88** in a KPI tile *and* a HealthGauge reading **88**. That is the same number rendered three times in the top 400px (header rail, KPI tile, gauge) — see `dashboard-list.png`. A first-time user reasonably assumes three different things are being measured. This is redundant *and* confusing.

**F3 — The Opportunity Mix bar is the most decision-relevant visual but is visually dead and unexplained.**
`OpportunityBar` is the honest "where's the work" signal (automate / standardize / optimize / monitor / healthy). In `dashboard-list.png` it renders as a **solid green bar labeled only "Healthy 16"** with the header "OPPORTUNITY MIX" and "16 tagged." There is no legend telling a newcomer that this bar *is* the automation/standardization opportunity map, and no hint that the segments are clickable filters. When everything is "Healthy," the single most valuable persona signal collapses to a green stripe that reads as decorative.

**F4 — "Automation Candidates: 0" is stated three times with no "why" and no next step.**
KPI tile "Automation Candidates 0 of 16 workflows," plus the same count drives the AI-candidate path. Zero is a *fine, honest* number, but presented bare it reads as "nothing to do here / the feature is empty." There's no honest one-line explanation of what makes a workflow an automation candidate (the rule is `aiOpportunityScore ≥ 60 AND ≥2 systems AND health ≥ 40` per `workflow-metrics.ts`), so the user can neither trust nor act on the 0.

**F5 — The NarratorSummary (the one component literally designed to explain the page at a glance) is buried below the charts.**
`buildNarrator()` produces exactly the plain-language sentence a newcomer needs ("Your 16 workflows average a health score of 88…"). But TopBand renders it as **Row 3 — under the KPI tiles, gauge, opportunity bar, and trend chart.** The sentence that should orient the reader is the last thing they reach. In the screenshot it appears as small grey text ("Your 16 workflows average a health score of 88.") *below* the entire band, easy to miss.

**F6 — The RecordedTrendChart answers a question almost no persona is asking, yet occupies ~40% of the band.**
"Workflows recorded per week" is an *activity/vanity* chart (how much I recorded), not a *process-intelligence* chart (which processes matter / where time goes). For the stated personas — Lean belts, process baseliners, UX/product teams — "what changed in my processes" matters far more than "how many did I record." It's prominent real estate spent on the least decision-relevant signal.

### Navigation / "how do I use this?"

**F7 — The two lenses look like passive tabs, not the primary mode switch they are.**
`LensSwitcher` renders "Library | Measure & Analyze" as a thin underlined tablist directly under the header (`dashboard-list.png`). It is the single most important navigation control on the page — it reframes everything — yet it's styled identically to a sub-section tab and carries no affordance explaining that "Measure & Analyze" is the Lean-Six-Sigma analysis view. New users will read past it. The label "Measure & Analyze" is also LSS-insider language with no plain-English gloss visible (the explanation only exists in a `title` tooltip).

**F8 — Three separate filtering mechanisms with overlapping scope and no shared "you are filtering by X" state.**
A user can narrow the list via (a) **OpportunityBar segment click**, (b) **InsightsStrip chip click**, (c) **UnifiedToolbar Filter panel** (systems/opportunity/health/needs-attention), and (d) **PresetChipRail** chips. These are wired to *different* state (`filters.opportunity`, `insightFilterKey`, `FilterState`, preset application) and there is **no single unified "active filters" summary with one Clear-all**. A user who clicks an opportunity segment, then a chip, then opens Filter, has no consolidated view of what is currently constraining the list. This is the #1 navigation-comprehension risk.

**F9 — Preset chips and saved-view chips are powerful but undiscoverable and semantically ambiguous.**
`PresetChipRail` (Row 2 of the toolbar) shows chips like *Automation Candidates · Needs Attention · Standardize · High Volume · Recent Activity · Ready to Share · My Team's Bottlenecks · AI Automation Candidates* (see `dashboard-list.png`). Problems: (a) they sit *below* the search/filter row, visually subordinate, so users read them as tags not as one-click views; (b) some are plan-gated/AI-pending and render in a disabled/greyed style with no inline "why"; (c) "Automation Candidates" preset chip duplicates the "Automation Candidates" KPI tile and the OpportunityBar's automate segment — three doors to the same idea, none labeled as the same thing. Applying a preset currently only changes **columns**, not filters (`handleApplyPreset` sets `visibleColumns` only — the filter apply is explicitly deferred in the shell), so the chip's name ("Automation Candidates") *over-promises*: clicking it does not actually filter to automation candidates.

**F10 — Column customization is hidden behind a single "Columns" button and the picker's value is opaque.**
The registry defines ~40 columns; only ~26 are computable today (`available`), the rest are `pending-path-c-r*` placeholders. The "Columns" button gives no hint that there's a rich metric catalog behind it, and a user who opens it sees a long list where most entries are disabled/pending with little explanation of what each metric means or why it's locked. Discoverability of the dashboard's headline feature ("customize which of ~30 metrics you see") is near zero from the default view.

**F11 — No drill-down preview; every row click is a full-page navigation away.**
`handleRowClick` does `router.push('/workflows/{id}')`. There is no slide-in detail panel. To compare two workflows or peek at why one is unhealthy, the user must leave the dashboard and come back, losing list context, filters, and scroll position. For a "scan the library and triage" workflow this is high-friction and breaks the at-a-glance loop.

**F12 — The row tooltip / health breakdown is keyboard-trap-adjacent and discovery is hover-only.**
The health-score cell opens a `HealthTooltip` on hover/click; the score breakdown (the "why is this 86?") is the key comprehension payload but is only reachable by hovering the right-most numeric cell. There is no visible affordance that the score is explainable.

### Empty / activation path

**F13 — The empty state is honest but flat, and the real onboarding asset is orphaned.**
`WorkflowList` empty state: "No workflows recorded yet." + "Install extension to start →" + "Upload a recording →". Functional, but it does not show the user *what they'll get* (no preview of the health/opportunity/Pareto payoff), and there is a fully-built `OnboardingChecklist` component that is **not wired into v2 at all** (grep confirms zero references in `dashboard-v2/`). The sparse state ("Record 2 more to unlock health score comparison") is good — the empty state should borrow that "here's the payoff" framing.

**F14 — Auto-seed behavior makes the empty state nearly unreachable, which hides the first-run story.**
v1 auto-seeds a sample workflow; the v2 shell relies on server seeding for the demo. In practice most accounts land on a populated dashboard immediately, so the team rarely *sees* the cold-start path — yet that path is exactly where at-a-glance comprehension matters most for activation. The empty/first-run experience is under-invested precisely because it's rarely observed internally.

### Redundancy / low-value cut candidates

**F15 — The "88" triple (F2), the recorded-per-week chart (F6), and the duplicated Automation-Candidates doors (F9) are the clearest cut/consolidate targets.** None of them add at-a-glance value proportional to the space and attention they consume; each adds a "wait, is this the same thing?" tax.

**F16 — Density + Columns + Sort + Filter + Portfolios + Search is six controls in one toolbar row with no grouping or hierarchy.** For a first-time user this is a wall of equally-weighted controls. The high-value ones (Search, the preset views, the lens switch) are not visually prioritized over the low-frequency ones (Density).

### Computed-but-hidden signals the engine already produces (comprehension upside)

The engine (`workflow-metrics.ts`, `WorkflowMetricsOutput`) already computes signals that would *directly* answer persona questions but are not surfaced (or are buried) on the dashboard:

- **F17 — `variationLabel` (low/medium/high)** per workflow → the "where's the standardization opportunity" answer. It feeds the narrator's `highVariationCount` clause but is not a glanceable column or badge in the Library lens by default. This is the single most persona-relevant hidden signal for Lean belts.
- **F18 — `bottleneckLabel` (step name)** is computed and surfaces only as the raw header alert (F1). Rendered as a per-row "⛔ Step 2" chip it would make "what changed / where's the friction" scannable.
- **F19 — `variantCount` / `standardPathFrequency` / `stabilityScore`** exist on `processDefinition` and drive the LSS variation strip, but in the Library lens they're hidden behind `pending-path-c-r1` registry columns. The honest subset (variantCount where runs ≥ 2) is already rendered as row subtext in LSS — it could be a glanceable Library signal too.
- **F20 — `aiOpportunityScore` (0–100)** is the audit number behind the automate tag; it is hidden in the health tooltip. Surfacing it (honestly, as "automation fit 0–100, proxy") next to the opportunity tag would make the "0 candidates" number explainable (F4).

None of these require new capture or fabricated stats — they are render/wiring of already-computed, honesty-vetted values.

---

## 2. Do the personas get their four core questions answered?

| Persona question | Answered today? | Where it breaks |
|---|---|---|
| **Which workflows matter?** | Partially | Pareto answers it (LSS lens only); Library lens has no "impact/volume rank" by default. Default sort is date_recorded, not impact. |
| **Where's the automation / standardization opportunity?** | Weakly | OpportunityBar + automate tag exist but are visually dead (F3), over-promised by the preset chip (F9), and variation (the standardize signal) is hidden (F17). |
| **What changed?** | No | The only "change" signal is the recorded-per-week chart (activity, not process change). No "new this week / health moved / new high-variation" delta callout. |
| **What do I do next?** | No | The narrator is buried (F5); there is no single "Top thing to do" line. The header alert (F1) is the closest thing but is unframed jargon. |

**Net:** the data to answer all four exists; the *presentation* answers ~1.5 of 4 at a glance.

---

## 3. Recommended priority cut (sequenced, render/wiring-first, honesty-preserving)

**P0 — Orient before you alert.** Add a single plain-English page-purpose + "next action" line at the very top, and demote the raw bottleneck alert beneath it. Promote `NarratorSummary` to the top of the band (F1, F5). *Render-only.* **S.**

**P0 — Kill the "88" triple.** Keep one canonical health surface (recommend the CommandHeader rail as the portfolio number; drop the redundant KPI tile *or* the gauge — not both). Reclaim the space for a "what changed" or "top action" element (F2, F15). *Render-only.* **S.**

**P0 — Make the lens switch obviously the primary mode control + gloss "Measure & Analyze."** Strengthen the LensSwitcher styling and add a visible sub-label ("Lean Six Sigma: where your time goes") instead of a tooltip-only description (F7). *Render-only.* **S.**

**P0 — One unified "active filters" bar with a single Clear-all**, fed by all four filter sources (opportunity segment, insight chip, filter panel, preset). One place that always says "Showing: automate · health < 60 [Clear]" (F8). *Wiring (read existing state, render a summary).* **M.**

**P1 — Make OpportunityBar self-explanatory and obviously interactive.** Add an inline legend/caption ("Click a segment to filter — automate / standardize / optimize / monitor / healthy") and an affordance cue; show counts even at 1 segment (F3). *Render-only.* **S.**

**P1 — Fix the preset-chip over-promise.** Either wire `handleApplyPreset` to also apply the preset's filters (so "Automation Candidates" actually filters), or rename chips to "column views" until filters are wired — do not let a chip named "Automation Candidates" change only columns (F9). *Wiring.* **M** (filter apply) / **S** (rename).

**P1 — Surface the two highest-value hidden signals as glanceable Library elements:** a per-row **variation badge** (`variationLabel`) and a per-row **bottleneck chip** (`bottleneckLabel`), both honesty-gated and rendered "—"/absent when unavailable (F17, F18). *Wiring of computed values into existing row.* **M.**

**P1 — Explain "Automation Candidates: 0."** One honest caption under the tile/segment stating the rule in plain words and exposing `aiOpportunityScore` (labeled proxy) on the row (F4, F20). *Render + wiring.* **S–M.**

**P2 — Slide-in workflow detail panel** so triage keeps list context instead of full-page navigation (F11). *New render-only panel reading existing `/workflows/{id}` data.* **L.**

**P2 — Rework the empty/first-run state** to show the payoff (mini health/opportunity preview) and wire the orphaned `OnboardingChecklist` (F13, F14). *Wiring of an existing component + render.* **M.**

**P2 — De-emphasize / make optional the recorded-per-week chart**; reclaim band space for a "what changed this period" strip (new this week / health delta / new high-variation), all from already-computed counts (F6). *Render-only.* **M.**

**P3 — Add a "Columns" discoverability hint** ("Customize ~30 process metrics") and inline "why locked" text on pending columns in the picker (F10). *Render-only.* **S.**

**Cut/consolidate:** the duplicate health number (F2), one of the three Automation-Candidates doors (F9), and the recorded-per-week chart's prominence (F6). Move Density behind an overflow/"⋯" so the toolbar leads with Search + views (F16).

---

## 4. Hard-constraint compliance note

Every recommendation above is **render-only or wiring of already-computed, honesty-vetted values**. No new metric, benchmark, target, DPMO/sigma/CV, cost, or takt is proposed; proxies (aiOpportunityScore, variationLabel) stay labeled as proxies and render "—"/absent when data is missing. No new extension capture. All proposed elements are deterministic and SSR-safe (no `Date.now()`/`Math.random()` in render; reuse the shell's existing clock-injection and `useLens`/`useDensity` SSR-safe patterns).
