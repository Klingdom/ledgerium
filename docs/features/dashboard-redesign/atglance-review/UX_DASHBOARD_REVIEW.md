# UX Review — Workflows Dashboard "At a Glance" Comprehension & Navigation

**Reviewer:** Senior UX / interaction designer (analysis only — no product code modified)
**Date:** 2026-06-15
**Goal:** Maximize *at-a-glance* understanding and make navigation obvious for a brand-new user.
**Grounded in:** live screenshots (`apps/web-app/public/docs/screenshots/dashboard-list.png`, `dashboard-lss.png`) + the actual v2 component tree under `apps/web-app/src/components/dashboard-v2/` (the page renders `<DashboardV2Shell />` immediately — `page.tsx:316-318`; the rest of `page.tsx` is the `?v2=0` v1 fallback and is NOT what users see).

**Scope note:** The live surface = `DashboardV2Shell` → `CommandHeader` + `LensSwitcher` + `TopBand` (KpiTileStrip + HealthGauge + OpportunityBar + RecordedTrendChart + NarratorSummary) + `InsightsStrip` + `UnifiedToolbar` (search/filter/sort/density/columns + PresetChipRail) + `WorkflowList`/`WorkflowRow`; LSS lens adds `LssParetoPanel`.

All proposed changes obey the hard constraints: **honesty** (observed-only; no fabricated metrics/targets), **determinism + hydration safety** (no `Date.now()`/`Math.random()` in render, design tokens, SSR-safe), **no new extension capture**, and **prefer render-only/wiring fixes**.

---

## Top-level assessment

The dashboard is information-*rich* but comprehension-*poor* for a first-time user. The screenshots show **the same portfolio-health number ("88") rendered three times within one viewport** (CommandHeader top-right, the "AVG HEALTH SCORE" KPI tile, and the HealthGauge), a **redundant `2 tabs` + `4-tile band` + `2 charts` + `narrator sentence` + `insight chip` stack** that pushes the actual workflow list below the fold, and **two competing "Workflows" labels** (global nav item + page H1). The "what is this / what do I do next" question is not answerable in <10s because there is no single orienting sentence and the primary object (the workflow rows) isn't visible on load. The bones are honest and deterministic; the problem is **hierarchy, redundancy, and label collisions**, almost all fixable render-only.

---

## Findings

### 1. The portfolio-health score is rendered THREE times in one viewport — highest redundancy on the page
**Problem:** `CommandHeader.tsx:148-201` renders "PORTFOLIO HEALTH 88" top-right; `KpiTileStrip.tsx:174-181` renders an "AVG HEALTH SCORE 88" tile; `HealthGauge.tsx` renders an arc gauge reading "88 / HEALTH" — all the same `portfolioHealthScore` value (`DashboardV2Shell.tsx:772, 803, 97`). The screenshot confirms three "88"s stacked vertically. The KPI tile and the gauge sit side-by-side in `TopBand.tsx:91-99` showing the identical number twice within ~150px.
**At-a-glance benefit:** Removing two of the three frees the most valuable real estate (top of page) and removes the "why is this number everywhere — are they different?" confusion. Pick ONE canonical health representation (recommend: keep the CommandHeader score+delta as the executive summary; drop the redundant gauge OR the AVG HEALTH tile, repurposing that tile slot for a non-duplicated metric).
**Effort:** S (delete/relocate one or two render blocks)
**Honesty/determinism note:** Pure removal; no new metric. Safe.

### 2. The real object — the workflow list — is below the fold on load
**Problem:** Between the H1 and the first workflow row, the screenshot stacks: CommandHeader, the Library/Measure tablist, a 4-tile KPI strip + gauge, an OpportunityBar, a 12-week bar chart, a narrator sentence, an insight chip, then the entire UnifiedToolbar (search/filter/sort/columns) + PresetChipRail (`DashboardV2Shell.tsx:763-908`). In the `dashboard-list.png` screenshot the table header ("Workflow … Health Score") is only just appearing at the very bottom. A first-time user cannot see "this is a list of my recorded workflows" without scrolling.
**At-a-glance benefit:** The user's mental model is "my workflows." Getting ≥2 rows above the fold makes the page self-explanatory instantly. Collapse/condense the band (see #1, #6, #7) so the list starts higher.
**Effort:** M (band density + collapse defaults)
**Honesty/determinism note:** Layout-only; no data change.

### 3. No single orienting sentence answers "what is this page" in <10s
**Problem:** The H1 is just "Workflows" (`CommandHeader.tsx:117-119`). The only descriptive sentence is `topInsight.label` (e.g. "Bottleneck: Step 2 is a bottleneck → investigate step owner", `CommandHeader.tsx:120-124`) — that's a *specific finding*, not an orientation. The NarratorSummary ("Your 16 workflows average a health score of 88.", `NarratorSummary.tsx:34-68`) IS the orienting sentence but it's buried at the bottom of the band, below two charts. A newcomer reads a cryptic bottleneck string first and an explanatory sentence last.
**At-a-glance benefit:** Promote the narrator sentence to directly under the H1 (replacing or preceding the bottleneck insight), so the first thing read is "Your 16 workflows average a health score of 88. 3 have high variation — consider standardizing." That answers what + how-many + what's-wrong in one line.
**Effort:** S (move `NarratorSummary` mount above `TopBand`, or render its sentence in the header)
**Honesty/determinism note:** `buildNarrator` is already pure/honest (omits clauses with no data). No change to its logic.

### 4. Two competing "Workflows" labels create a navigation hall-of-mirrors
**Problem:** The global nav's first item is "Workflows" → `/dashboard` (`AppShell.tsx:22`), and the page's own H1 is also "Workflows" (`CommandHeader.tsx:118`). Directly below the H1 is a *second* tab row "Library / Measure & Analyze" (`LensSwitcher` via `lenses.ts:202-221`). A new user sees "Workflows" twice and two different tab strips and cannot tell which control changes what.
**At-a-glance benefit:** Disambiguate. Either rename the page H1 to something the nav item is not (e.g. "Process Intelligence" — already the v1 H1 at `page.tsx:766`), or rename the lens tabs to read as views of *this* page ("Library view" / "Measure & Analyze"). Reduces "am I on the right screen / which tab do I click" hesitation.
**Effort:** S (string change)
**Honesty/determinism note:** Copy-only. (≥3 user-visible strings if lens labels change — route through brand-voice consult per CLAUDE.md D-4 clause 1.)

### 5. The "Library / Measure & Analyze" lens tablist is not self-explanatory and looks like page-level navigation
**Problem:** `LensSwitcher.tsx` renders a `role="tablist"` with a brand underline identical to a top-level page tab. Labels "Library" and "Measure & Analyze" (`lenses.ts:204, 213`) don't tell a newcomer what switching does — there's a `title`/`description` tooltip ("Lean Six Sigma view…") but tooltips are undiscoverable. The screenshot shows the tabs with no affordance hint that "Measure & Analyze" swaps the entire view to a Pareto chart + a different column pack.
**At-a-glance/navigation benefit:** Add a one-line caption under the active tab ("Re-frames the same workflows — Library lists them; Measure & Analyze shows where your time goes") OR an inline `ⓘ`. Makes the most powerful navigation control discoverable instead of accidental.
**Effort:** S (caption text bound to `getLensConfig(activeLens).description`, already available)
**Honesty/determinism note:** Reuses the existing honest `description` string; deterministic.

### 6. KPI tiles look clickable but their behavior is invisible and inconsistent with their meaning
**Problem:** Every KPI tile is a `<button>` that fires `dashboard_kpi_tile_clicked` analytics but performs **no visible action** (`KpiTileStrip.tsx:89-118`) — clicking "Total Workflows" or "Median Cycle Time" does nothing the user can see. They have `hover:bg` + `focus-visible:ring`, so they *signal* "clickable" but lead nowhere. Meanwhile the OpportunityBar segments and insight chips ARE real filters. This trains users that "clickable ≠ does anything," undermining trust in every affordance.
**At-a-glance/navigation benefit:** Either (a) make tiles non-interactive (`<div>` + `aria` label, drop the button affordance) so only things that DO something look clickable, or (b) wire each tile to a real action (e.g. "Automation Candidates" → applies the `automate` opportunity filter, which already exists via `handleOpportunitySegmentClick`). Recommend (b) for the 2 tiles that map to a real filter and (a) for the rest. Clarifies the affordance contract.
**Effort:** S (a) / M (b, wiring to existing handlers)
**Honesty/determinism note:** No new metric; reuses existing filter handlers. Safe.

### 7. The band stacks two charts the newcomer can't interpret without prior knowledge
**Problem:** `TopBand.tsx:101-113` renders an OpportunityBar (stacked %) AND a 12-week RecordedTrendChart side by side. In `dashboard-list.png` the OpportunityBar shows a solid green bar labeled only "OPPORTUNITY MIX … Healthy 16" with no explanation of what "opportunity" means here, and the trend chart's Y-axis ticks read "3 / 3 / 3" (degenerate axis, `RecordedTrendChart.tsx:68-69` `computeYTicks` on a near-flat series) — visually noisy, low information. A newcomer doesn't know "opportunity mix" = automation verdicts.
**At-a-glance benefit:** (a) Add a plain-language sublabel to OpportunityBar ("How automatable each workflow looks"); (b) suppress or compress the trend chart when the series is degenerate/flat (it already suppresses <3 recordings via `shouldSuppressTrend`, but a flat non-zero series still renders a confusing 3/3/3 axis). Reduces visual clutter that adds zero comprehension.
**Effort:** S (sublabel) / M (degenerate-axis guard)
**Honesty/determinism note:** Sublabel must describe the real signal; trend guard is presentational. Deterministic (buckets are server-computed).

### 8. "Median Cycle Time 25s" and the Pareto "1m 36s · 5 runs" use no glanceable unit label / definition
**Problem:** The KPI tile shows "MEDIAN CYCLE TIME / 25s / across 16 workflows" (`KpiTileStrip.tsx:152-161`). A newcomer doesn't know "cycle time" = end-to-end run duration, nor whether 25s is good or bad. There is no benchmark and (honestly) cannot be one — but there's also no definition. Same for the LSS panel's "Total observed time" and "Cycle-time spread" (`LssParetoPanel.tsx:307-313`).
**At-a-glance benefit:** Add a hover/`title` definition or a tiny `ⓘ` on the metric labels ("Cycle Time = average end-to-end run duration"). Turns an opaque number into an understood one without claiming a target.
**Effort:** S (tooltip/`title` on labels)
**Honesty/determinism note:** Definition only — no benchmark, no target. Fully honest.

### 9. The KPI "Automation Candidates 0 of 16" reads as a dead-end with no next step
**Problem:** Screenshot shows "AUTOMATION CANDIDATES / 0 / of 16 workflows" — honest, but for a new user with 0 candidates it's a flat zero with no guidance on how candidates get identified or what to do. Combined with the all-green "Healthy 16" opportunity bar, the page says "everything's fine, nothing to do," which gives a newcomer no next action.
**At-a-glance/navigation benefit:** When automation candidates = 0, the tile (or narrator) could honestly say what unlocks the signal ("Candidates appear once a workflow has 2+ runs" — IF that's the real gating rule per the metrics engine). Gives direction without fabricating a number.
**Effort:** S (conditional secondary text)
**Honesty/determinism note:** Only assert the real gating rule from `workflow-metrics`/`dashboard-band-stats`; verify before wording. Don't invent a threshold.

### 10. Six+ stacked control surfaces create high cognitive load before the first row
**Problem:** Navigation/controls are spread across: LensSwitcher (tabs), then UnifiedToolbar Row 1 (Portfolios, Search, Filter, Sort, Density, Columns — `UnifiedToolbar.tsx:133-292`), then UnifiedToolbar Row 2 (PresetChipRail of ~8 chips — visible in screenshot: "Automation Candidates / Needs Attention / Standardize / High Volume / Recent Activity / Ready to Share / My Team's Bottlenecks / AI Automation Candidates"), plus the column header sort buttons. That's three+ ways to filter/sort (preset chips, Filter panel, Sort dropdown, column headers) presented at once. A newcomer faces decision paralysis.
**At-a-glance/navigation benefit:** The preset chips ARE the most newcomer-friendly entry (named intents). Consider collapsing the advanced Filter/Sort/Density/Columns controls behind a single "Customize" affordance for first-run, surfacing only Search + presets prominently. Reduces the control count visible at first glance from ~12 to ~4.
**Effort:** M (progressive disclosure wrapper around existing controls)
**Honesty/determinism note:** Pure relocation; every handler already exists. No data change.

### 11. Preset chips mix scopes (personal vs "Team") and AI labels without legend
**Problem:** The chip rail shows chips suffixed "Team" ("Ready to Share Team", "My Team's Bottlenecks Team") and "AI Automation Candidates" alongside neutral ones, with no key for what the suffix/styling means (`PresetChipRail.tsx`). A newcomer can't tell which chips are gated, team-scoped, or AI-specific.
**At-a-glance/navigation benefit:** Group or visually section the chips (e.g. "Quick views" vs "Team" vs "AI") or add a tiny scope icon. Makes the navigation menu legible at a glance.
**Effort:** S–M (grouping/labels in PresetChipRail render)
**Honesty/determinism note:** Reflect real gating only; don't show a chip as available if it's plan-gated. Deterministic.

### 12. The LSS "Measure & Analyze" view has no entry orientation — newcomer lands on a Pareto chart cold
**Problem:** `dashboard-lss.png` shows the LSS lens opens directly into "Time impact (Pareto)" with a bar+line chart, a legend of 10 identical "Approve Expense Report (Sample)" rows, and a "CONSISTENCY SIGNALS … 15s – 33s" strip (`LssParetoPanel.tsx`). The vital-few sentence ("12 of 16 workflows account for ~80% of total observed time — the vital few", `LssParetoPanel.tsx:131-138`) is good, but "Pareto," "vital few," and the cumulative-% line require Lean Six Sigma literacy. There's no "what am I looking at / what do I do with this."
**At-a-glance benefit:** Add one plain sentence under the panel header ("The few workflows that eat most of your time — fix these first") and a legend for the orange cumulative line (currently unlabeled in the chart). Makes a specialist view usable by a non-specialist.
**Effort:** S (caption + line legend)
**Honesty/determinism note:** Describes the real Pareto honestly; no fabricated stat. Deterministic SVG.

### 13. Identical sample-data rows make the LSS legend look broken
**Problem:** In `dashboard-lss.png` the Pareto legend lists "Approve Expense Report (Sample)" 10 times with near-identical "1m 36s total · 5 runs" values. This is auto-seeded sample data (`page.tsx` admin seed), but to a newcomer it reads as a rendering bug or duplicate workflows.
**At-a-glance benefit:** When the set is dominated by seeded samples, label them ("Sample" badge is in the title, but the repetition still confuses) or de-duplicate visually. Prevents the "is this broken?" reaction on first view.
**Effort:** S (sample-detection note) / M (legend de-dup)
**Honesty/determinism note:** Don't hide real duplicate processes — only clarify seeded samples. Deterministic.

### 14. The H1 area's date-line and chart axes add chrome without comprehension value
**Problem:** (v1 fallback `page.tsx:768-770` shows "Operational command center · {weekday, date}" — a `suppressHydrationWarning` `new Date()`; the v2 CommandHeader avoids this, good.) In v2 the equivalent low-value chrome is the trend chart's degenerate axis (#7) and the OpportunityBar's "16 tagged" micro-label. Each pixel of chrome competes with the list for attention.
**At-a-glance benefit:** Trim non-actionable chrome so the eye lands on the score → narrator → list path.
**Effort:** S
**Honesty/determinism note:** Note: any date string in render MUST keep `timeZone:'UTC'` + `suppressHydrationWarning` (the v1 line already does; don't introduce new client `new Date()` in v2). Determinism-critical.

### 15. Visual scanning order fights the priority order
**Problem:** F-pattern scanning lands first on top-left (H1 "Workflows" + a cryptic bottleneck string) then top-right (the "88" score). The most newcomer-relevant content (narrator sentence + the list) is bottom-center/below-fold. The strongest color/size cue on the page (the large green "88" and green opportunity bar) signals "all good," which paradoxically deprioritizes the one warning chip ("Bottleneck…").
**At-a-glance benefit:** Re-rank: H1 → narrator one-liner → (single) health score → list, with the warning insight elevated as the call-to-action rather than buried as a chip. Aligns eye path with intent.
**Effort:** M (reorder header/band blocks)
**Honesty/determinism note:** Reorder only.

### 16. Loading state is a 5-row skeleton but the band/header pop in separately — staged flash
**Problem:** `WorkflowList` shows 5 `SkeletonRow`s while loading (`WorkflowList.tsx:659-660`), but `TopBand` returns `null` while loading (`TopBand.tsx:65`) and CommandHeader shows "—" for the score (`CommandHeader.tsx:186`). So on load the user sees: header with "—", no band, skeleton rows — then the band suddenly appears and pushes the list down (layout shift). The `SKELETON_MIN_MS=300` guard (`DashboardV2Shell.tsx:121`) smooths the list but not the band insertion.
**At-a-glance benefit:** Reserve the band's vertical space during load (skeleton band) so the list doesn't jump. Reduces the disorienting reflow on every page load.
**Effort:** M (band skeleton)
**Honesty/determinism note:** Skeleton placeholders only; no fabricated values. Deterministic.

### 17. Empty / sparse / no-results states are honest but the empty CTA is the only path and assumes the extension
**Problem:** Empty state (`WorkflowList.tsx:684-712`) leads with "Install extension to start →" then a secondary "Upload a recording →". Good copy, honest. But a brand-new user who can't install the extension (e.g. on mobile, locked-down browser) sees install as the primary path. Sparse-state notice ("Record 2 more to unlock health score comparison", `WorkflowList.tsx:529`) is good. No-results (`:715-732`) is clear.
**At-a-glance/navigation benefit:** Minor — consider equal-weight Install vs Upload for users who can't install, and confirm the empty state is reachable (the v2 shell derives `empty` only when `filteredWorkflows.length===0 && !anyFiltersActive`, `DashboardV2Shell.tsx:740` — but admin auto-seed in v1 may mask it; verify v2 newcomers actually hit it).
**Effort:** S
**Honesty/determinism note:** Honest as-is.

### 18. Mobile/responsive: dense control row + many columns degrade poorly
**Problem:** `UnifiedToolbar` Row 1 packs 6 controls with `flex-wrap` (`:133`) and several `hidden sm:inline` labels — on narrow screens the buttons become icon-only with no text, hurting discoverability. The table hides Systems (`md:table-cell`) and Opportunity (`sm:table-cell`) columns (`WorkflowList.tsx:569, 586`), and the band's KPI grid drops to 2-col (`KpiTileStrip.tsx:133`). The 3× health-score redundancy (#1) is worst on mobile where vertical space is scarcest.
**At-a-glance/navigation benefit:** On mobile, collapse to: narrator + score + search + presets + list. Fixing #1/#10 disproportionately helps mobile.
**Effort:** M
**Honesty/determinism note:** Responsive layout only.

### 19. Accessibility of comprehension — strong ARIA, but two gaps
**Problem:** ARIA is genuinely good (tablist roving tabindex in `LensSwitcher`, `aria-sort` on headers, `role="status"` on score/narrator, `aria-label`s on chips/segments, color+icon+text on insight chips per `InsightsStrip.tsx`). Gaps: (a) the **three duplicate "88" health values** each carry their own `aria-label` ("Portfolio health: 88…", "Avg Health Score: 88", "Portfolio health gauge: 88…") so a screen-reader user hears the same number three times — same redundancy as #1 but worse for AT. (b) The KPI tiles announce as buttons ("Total Workflows: 16") implying action that doesn't happen (#6) — misleading for AT.
**At-a-glance/comprehension benefit:** Fixing #1 (dedupe) and #6 (button→div or wire action) directly fixes the AT experience too. Net: less repetition, honest affordances.
**Effort:** S (falls out of #1/#6)
**Honesty/determinism note:** Improves honesty of the affordance contract.

### 20. Contrast & color-meaning are mostly handled, but "all green" reduces signal
**Problem:** The team has clearly invested in contrast (delta uses `--content-secondary` not tertiary for WCAG AA, green-400/red-400 chosen for ~7:1 on dark — `CommandHeader.tsx:96-102`; gauge text uses `--content-primary` for contrast — `HealthGauge.tsx:110`). The risk is *semantic*: with a healthy portfolio nearly every element is green (score, gauge, opportunity bar, "new this week" chip), so the one amber warning ("Bottleneck…") doesn't stand out. Color is doing redundancy, not signal.
**At-a-glance benefit:** Reserve saturated color for *actionable* states; render "all healthy" in a calmer neutral so the rare warning pops. Improves signal-to-noise.
**Effort:** S–M (token usage on band)
**Honesty/determinism note:** Token-based; deterministic.

---

## Cross-cutting recommendation

The single highest-leverage move is **collapsing the triple health-score redundancy (#1) and promoting the honest narrator sentence (#3) to the top**, which together let the workflow list rise above the fold (#2) and fix the AT repetition (#19) — all render-only. After that, **disambiguating the duplicate "Workflows" labels and the lens tabs (#4, #5)** and **making clickable things actually do something (#6)** remove the bulk of newcomer hesitation. None of these require new infrastructure, new metrics, or new capture — they are deletions, relocations, copy, and wiring to existing handlers.

---

## Honesty & determinism ledger (applies to every proposal above)

- No proposal adds a metric, benchmark, target, or percentage the engine doesn't already compute. Definitions/tooltips describe existing observed values only.
- No new `Date.now()`/`Math.random()` in render. Existing band data is server-computed against `referenceNowMs`; the one in-render `Date.now()` (`DashboardV2Shell.tsx:669` `filterNowMs`) is memoized and must stay so.
- Any date rendered client-side must keep `timeZone:'UTC'` + `suppressHydrationWarning` (existing pattern in `format.ts` / v1 header).
- All color cues stay paired with text/icon (existing convention in `InsightsStrip`/`OpportunityBar`) — do not regress to color-only.
- Changes touching ≥3 user-visible strings (e.g. #4 lens labels, #5 captions, #7/#8/#12 sublabels) should route through the brand-voice consult per CLAUDE.md D-4 clause 1.
