# Product Usage Expert Review — Serving Product/UX Teams from Ledgerium Recorded Sessions

**Author lens:** Product analytics + digital-adoption research expert (reference frame: Pendo, WalkMe, FullStory, Glassbox, Amplitude).
**Date:** 2026-06-14
**Mode:** Read-only product code review + web research. No code written.
**Audience for the recommendations:** Ledgerium product/eng leadership deciding whether the workflow dashboard should grow a product-usage / digital-adoption lens.

---

## 0. Ground truth — what we ACTUALLY capture per step (confirmed by reading code)

This section is the load-bearing foundation for everything below. I read the capture path, the normalization/route-template logic, the process-engine output contract, the intelligence engine, and the workflows API. Findings are cited to source.

### 0.1 Per-event page / route / application identity — RICH (better than I expected)

Every raw event carries a `context` object built by `CaptureEngine.buildContext()` (`apps/extension-app/src/content/capture.ts:556-576`):

| Field | Source | Example | Honesty note |
|---|---|---|---|
| `url` | `location.href` | `https://system.netsuite.com/app/accounting/...` | Query + fragment stripped on emit (`sanitizeUrl`, `:541`) |
| `urlNormalized` | `normalizeUrl()` | tracking params removed | `packages/normalization-engine/src/url-normalizer.ts:32` |
| `pageTitle` | `document.title` | "Create Sales Order — NetSuite" | **The single richest human-readable page signal we have** |
| `application.domain` | `extractDomain()` | `system.netsuite.com` | hostname only |
| `application.routeTemplate` | `deriveRouteTemplate(pathname)` | `/app/accounting/transactions/:id` | IDs → `:id` (integer / UUID / 10+ hex). `url-normalizer.ts:96` |
| `application.label` | `deriveAppLabel(domain)` | `NetSuite` | **Only ~15 hostnames are mapped**; everything else = capitalized first hostname part (see 0.5) |
| `moduleLabel` | optional on CanonicalEvent `page_context` | — | declared in contract (`process-engine/src/types.ts:90`) but not populated by capture today |

This means **page-level and application-level analytics are fundamentally capturable from data we already collect**. Page identity = `pageTitle` + `routeTemplate` + `domain`. App identity = `application.label` + `domain`.

### 0.2 Per-event "feature / tool" identity — DOM-SIGNAL ONLY (the honest limit)

When the user clicks/types/drags, `inspectTarget()` (`apps/extension-app/src/content/target-inspector.ts:139`) attaches:

- `target_label` — the visible label of the control (from `label-extractor.ts`). E.g. "Save", "Submit Expense", "Add Line".
- `target_role` — ARIA role or tag name (`button`, `link`, `combobox`…).
- `target_element_type` — input type / tag.
- `interactionType` — classified into `link_click | button_click | dropdown_select | checkbox_toggle | radio_select | text_input | form_submit | generic_click` (`target-inspector.ts:97`).
- `selector` / `selectorFingerprint` — stable selector via priority chain `data-testid → data-qa → id → aria-label → role+name → ancestor-path` (`:73`), hashed with djb2 for PII-free dedup.
- `ancestorPath` — up to 4 levels of DOM ancestry.

**This is exactly the same raw material Pendo/FullStory use to tag features** — a CSS/attribute selector plus a visible label. The crucial honesty point: **a "feature" in Pendo is a human-curated tag over these selectors. We capture the selectors; we do NOT yet have the curation layer that turns "click on `[data-testid=submit-expense]`" into the durable business feature "Submit Expense Report."** More on this in §3.

### 0.3 Step-level (derived) identity — page context survives, but the analytical key is CATEGORY not PAGE

After segmentation, each `DerivedStep` carries `page_context: { domain, applicationLabel, routeTemplate }` (`process-engine/src/types.ts:124-128`) and a `grouping_reason` (the step category). The process-engine `StepDefinition` additionally carries `systems[]`, `domains[]`, and `ProcessMapNodeMetadata` carries `pageTitle`, `routeTemplate`, `dominantAction`, and `eventTypeSummary` (a `Record<eventType, count>`) — see `types.ts:238-270`.

**So at the step/run/map level we retain page title + route template + dominant action.** The data is there.

### 0.4 The cross-workflow intelligence layer keys off CATEGORY, not page/feature

This is the most important structural finding for this review. `PathSignature` (`packages/intelligence-engine/src/types.ts:93`) is a colon-joined sequence of **`GroupingReason` step categories** — `click_then_navigate:fill_and_submit:...`. Variants, standard path, drift, bottlenecks, and timestudy are **all computed over category sequences and step *positions*, never over page titles or feature labels** (`StepPositionTimestudy.category`, `ProcessMetrics.uniqueSystems`).

Consequence: **the entire portfolio intelligence engine answers "what *kind* of step" and "which *system*," but never "which *page*" or "which *feature*" across workflows.** Page/feature aggregation across the library does not exist today. That is the whole opportunity.

### 0.5 What the workflows API surfaces today (the current dashboard's data ceiling)

`apps/web-app/src/app/api/workflows/route.ts` returns, per workflow row: `toolsUsed[]` (parsed from a stored JSON string, `:449`), `stepCount`, `durationMs`, `confidence`, plus a large derived-intelligence block (health, variation, bottleneck risk, SOP readiness, opportunity tag, complexity, cognitive burden). The dashboard is a **workflow LIBRARY list** — one row per recorded workflow. There is **no page inventory, no route inventory, no per-app time rollup, and no feature/action frequency table** exposed by this API. `systemsUsed` exists at the run level but is not aggregated into a portfolio "app usage" view.

**Bottom line of §0:** We capture page, route, app, action, label, duration, and event counts per step. We aggregate almost none of it along the page/app/feature axis. The product-usage lens is a **presentation + aggregation gap, not a capture gap** — with one genuine exception (true feature identity, §3).

---

## 1. The product/UX team's jobs-to-be-done — and which our data can answer

A product/UX team analyzing *browser-app usage* (PeopleSoft, Workday, Salesforce, in-house apps) is doing the WalkMe-Discovery / Pendo / FullStory job: understand **which apps, pages, and features get used, in what order, how often, where time goes, and where users struggle** ([WalkMe Discovery delivers "click-by-click data... to understand usage in the context of the jobs people are trying to get done"](https://www.walkme.com/data/)).

| # | JTBD | Can our captured data answer? | Evidence / gap |
|---|---|---|---|
| 1 | **Which applications/systems are used, and how much** | ✅ YES | `application.label`/`domain` per event; `systemsUsed`/`uniqueSystems` per run. Needs cross-workflow rollup only. |
| 2 | **Which pages/screens are touched, and how often** | ✅ YES (page title + route) | `pageTitle` + `routeTemplate` per event/step. No aggregation surface exists yet. |
| 3 | **Which tools/features are touched** | ⚠️ PARTIAL — by *action + label*, not true feature | `target_label` + `interactionType` are DOM signals; no feature-tag curation layer (§3). Honest answer = "control-label usage," not "feature usage." |
| 4 | **In what sequence (navigation flow / page-to-page)** | ✅ YES (page-flow) / ⚠️ category-only cross-workflow | Per-session we have ordered `routeTemplate`/`pageTitle`; we can build a real page-flow sankey. Cross-workflow variants are category-keyed (§0.4), not page-keyed. |
| 5 | **Where users spend time (per app / per page / per step)** | ✅ YES | `duration_ms` per step + page_context per step → time-per-page and time-per-app are directly computable. Timestudy exists per-position. |
| 6 | **Where users struggle (friction / rework)** | ⚠️ PARTIAL | We have **derived** friction (`FrictionIndicator`: excessive_navigation, retry, backtracking, long_wait, repeated_error, context_switching) and error-handling steps — but **NOT** FullStory-style raw frustration primitives (rage/dead/error clicks). We have the inputs to compute *some* of them (see §3, §5). |
| 7 | **Coverage across workflows (which apps/pages appear in how many recorded workflows)** | ✅ YES | Every workflow's steps carry page_context + systems; a coverage heatmap is a pure aggregation. |
| 8 | **Adoption / frequency over time (is page X used more this month)** | ⚠️ DEPENDS on recording cadence | We record discrete *workflows*, not always-on telemetry. Frequency = "how often this page appears across recorded sessions," which is honest but **not** a true MAU/DAU adoption metric (§3, §4). |

**Net:** JTBD 1, 2, 5, 7 are fully answerable today from existing fields. JTBD 4 is answerable per-session (page-flow) and honestly partial cross-workflow. JTBD 3, 6, 8 are partial and must be framed honestly.

---

## 2. The reporting VIEWS this audience expects — and the exact field each needs

These are the canonical views a Pendo/WalkMe/Amplitude user reaches for. For each I specify what it shows and the **exact captured field** it consumes. All are buildable from §0 data unless flagged.

### View A — Application / System Usage ("which apps, how much")
- **Shows:** Ranked list of applications with: # workflows touching it, total steps in it, total time spent in it, # distinct pages within it, % of portfolio time. Bar chart of time-share per app.
- **Reference pattern:** [WalkMe "Application Usage Analytics — monitor software usage and adoption at the application, department, and user level"](https://www.walkme.com/data/); Pendo cross-app analytics.
- **Fields:** `application.label` (group key), `domain`, step `duration_ms`, step count, `pageTitle`/`routeTemplate` (distinct-page count). **All present. Build = aggregation.**
- **Honesty:** "time spent" = sum of step durations *while recording*, not wall-clock app usage.

### View B — Page / Screen Inventory ("page tagging" table)
- **Shows:** Table of every distinct page touched: `pageTitle`, `routeTemplate`, owning app, # workflows it appears in, total visits (event count), total/median time on page, top actions on that page. This is Ledgerium's analog of [Pendo Page tagging — "track how many people are using your app, where they spend most of their time, and how frequently they return"](https://support.pendo.io/hc/en-us/articles/360032292151-Page-tagging).
- **Fields:** `pageTitle` + `routeTemplate` (composite group key), `domain`/`application.label`, `duration_ms`, navigation/click event counts. **All present.**
- **Honesty:** `routeTemplate` collapses IDs (`/orders/:id`) — good for grouping, but two semantically different screens that share a route template will merge. `pageTitle` disambiguates most cases; surface both.

### View C — Feature / Tool Usage Breakdown ("what gets clicked")
- **Shows:** Ranked table of interacted controls: `target_label` + `interactionType` + owning page, with click/use frequency and # workflows. Pendo's [Feature tagging](https://support.pendo.io/hc/en-us/articles/360031950492-Feature-tagging) ("UI elements you've tagged... to understand usage patterns") is the reference — but see the honesty caveat.
- **Fields:** `target_label`, `interactionType`, `target_role`, `selectorFingerprint` (stable dedup key), `pageTitle` (context). **All present.**
- **Honesty (critical):** Without a curation/tagging layer this is **"control-label frequency,"** not "feature usage." Same logical feature can appear under varying labels/selectors across app versions; unlabeled controls fall back to ancestor-path selectors. Ship it labeled honestly as "Most-used controls (observed)," not "Feature adoption."

### View D — Page-Flow / Navigation Sankey ("how users move between screens")
- **Shows:** Sankey/flow of page-to-page transitions ordered by `t_ms`, widths = transition frequency, with detours and backtracks visible. This is [Amplitude Pathfinder — "the real-world map of all the paths users are actually taking, including detours, dead ends, and unexpected routes"](https://amplitude.com/docs/analytics/charts/legacy-charts/legacy-charts-pathfinder).
- **Fields:** ordered `routeTemplate`/`pageTitle` sequence per session (from `spa_route_changed` / `page_loaded` / navigation steps), `domain`. **All present per-session.**
- **Build note:** Per-workflow this is trivial. Cross-workflow aggregation needs a **page-keyed** flow graph that does NOT exist today (the engine is category-keyed, §0.4). This is net-new aggregation, but over existing fields.

### View E — Time-Spent-per-App / per-Page ("where the time goes")
- **Shows:** Treemap or stacked bar: total recorded time partitioned by app → page → step category. Drill from app to page to step.
- **Fields:** `duration_ms` (step), `page_context.{applicationLabel, routeTemplate, pageTitle}`, `grouping_reason` (category split). **All present.**
- **Honesty:** Time is observed-during-recording; long single-action gaps may be idle (the engine already flags `idle_gap`-style long waits, `workflowInsights.ts:190`). Label idle-suspect time distinctly.

### View F — Cross-Workflow Coverage Heatmap ("apps × workflows" / "pages × workflows")
- **Shows:** Matrix: rows = apps (or pages), columns = workflows, cell = present/absent or intensity (steps/time). Reveals which screens are workflow-critical vs. rarely touched, and concentration of a workflow in one app.
- **Fields:** per-workflow set of `application.label` / `(pageTitle, routeTemplate)` + step counts. **All present.**
- **Honesty:** Coverage = "appears in recorded workflows," not "used by N% of population." It answers *process* coverage, not *adoption* coverage — which is exactly the honest framing (§4).

### View G (stretch, honest) — Struggle / Friction-by-Page
- **Shows:** Pages ranked by friction density: error-handling steps, backtracking, excessive-navigation, long waits, redundant actions — attributed to the page where they occurred.
- **Fields:** existing derived `FrictionIndicator[]` + `error_handling` category + step `stepOrdinals` mapped to step `pageTitle`. **Derived signals exist; page-attribution is the new join.**
- **Honesty:** This is **inferred** friction from observed behavior, NOT FullStory's instrumented [rage/dead/error clicks](https://help.fullstory.com/hc/en-us/articles/360020624154-Rage-Clicks-Error-Clicks-Dead-Clicks-and-Thrashed-Cursor-Frustration-Signals). We can *approximate* rage-click (rapid same-selector clicks — capture even dedups them at 300ms, `capture.ts:255`) and dead-click later, but today's friction is process-level inference.

---

## 3. HONESTY — what we do NOT capture, and what we'd need to add

The product team's credibility test is whether we over-claim. Be explicit:

**What we genuinely do NOT have:**
1. **True feature identity / business semantics.** We capture *that* a control labeled "Approve" of role `button` was clicked on page X. We do NOT know it is the "Invoice Approval" feature, that approval is a permissioned high-value action, or that it belongs to the "AP Close" capability. Pendo/WalkMe solve this with a **human tagging/curation step** ([Pendo "Features are UI elements you've labeled or 'tagged' using defined rules"](https://support.pendo.io/hc/en-us/articles/360031950492-Feature-tagging)). We have zero curation layer. **This is the #1 honesty gap.**
2. **Population adoption metrics (MAU/DAU/return rate per page or feature).** We record discrete workflow sessions on demand, not always-on per-user telemetry across a deployed population. Pendo "how frequently they return" and Amplitude retention are **out of scope** with the current capture model. We can honestly report "frequency within recorded sessions," never "% of employees who used page X this month."
3. **Instrumented frustration primitives** (rage/dead/error/thrashed-cursor as FullStory defines them). We have inferred friction, not measured frustration signals. We notably do **not** capture client-side JS errors (FullStory "error click" needs the console-error join) or mouse-thrash.
4. **True module/sub-app identity beyond domain + route.** `moduleLabel` is declared in the contract but not populated. Single-domain mega-apps (Workday, Salesforce) put everything under one host; `routeTemplate` + `pageTitle` carry the load and sometimes blur.
5. **Field-level / value semantics.** Sensitive values are redacted by design (`is_sensitive_target`, presence-only events). We can count "a field was filled," not what or why — correct and non-negotiable for the honest, observed-only posture.

**What we'd need to capture/add to deliver a *credible* digital-adoption view:**
- **(a) A feature-tag curation layer** mapping `selectorFingerprint` (+ `target_label`, page) → durable, user-named "Feature" entities, surviving label drift. This is the single highest-leverage addition and it reuses data we already have (selectors are stable and PII-free). It mirrors exactly Pendo's tag-after-the-fact model.
- **(b) Optional richer page tagging / page-rules** (Pendo "Page rules") to merge route-template variants into named Pages and split over-collapsed ones.
- **(c) Populate `moduleLabel`** from page-title heuristics or per-customer config to disambiguate mega-app modules.
- **(d) Lightweight frustration capture** (rapid-repeat-click counts pre-dedup; optional console-error listener) to graduate from inferred to measured struggle — opt-in, privacy-reviewed.
- **(e) Page-keyed aggregation store** (the page/feature analog of the existing category-keyed intelligence) so Views B/C/D/F are queryable across the library without re-deriving per request.

Frame the whole lens as **"observed product usage"** — honest, evidence-linked, and explicitly *not* a population telemetry product.

---

## 4. How this differs from the LSS / process lens — does it deserve its own mode?

**The current dashboard is a *process-mining* lens.** Its primitives are **step categories, variants, standard paths, cycle time, bottlenecks, drift** — all keyed on `GroupingReason` and step position (§0.4). The question it answers is *"how is this PROCESS performed, how consistent is it, and where is the waste?"* Audience: ops / process-excellence / LSS / automation.

**The product-usage lens is an *adoption / app-analytics* lens.** Its primitives are **applications, pages, features/controls, navigation flows, time-per-screen, coverage.** The question it answers is *"how is this APPLICATION used — which screens and tools, in what flow, where do users struggle?"* Audience: product managers, UX researchers, app owners, IT/DAP teams.

These are **orthogonal projections of the same captured event stream.** The process lens collapses pages into categories to compare *runs*; the product lens collapses runs into pages to compare *screens*. Same evidence, different group-by axis. This is precisely the WalkMe ([Workflows Analytics — "see how apps are used, in what context and where users are experiencing friction"](https://www.walkme.com/data/)) vs. process-mining distinction.

**Verdict: YES — it deserves its own lens/mode, not just more columns.** Reasons:
1. The group-by axis is fundamentally different (page/app/feature vs. category/position). Bolting page columns onto the workflow-row list cannot deliver Views A/B/D/F — those require app- and page-grain rows, not workflow-grain rows.
2. The audience and JTBD diverge (PM/UX/IT vs. ops/LSS). A "Usage" mode toggle (alongside the existing library/process view) matches how Pendo separates "Product" analytics from journey/funnel surfaces.
3. It **reuses 90% of existing capture** and most existing derived signals — the incremental surface is aggregation + presentation, which is cheap relative to the differentiation.
4. It preserves the honesty invariant: every number traces to an observed event with `evidenceRunIds`/`sourceEventIds` already in the contract.

Recommended shape: a **lens switcher** (Process ⇄ Usage) over the same library, where Usage mode swaps the workflow-row table for app/page/feature/flow views and re-grains the data by page_context.

---

## 5. The 6–10 highest-impact moves — ranked, honest about data limits

Ranked by (impact to product audience × honesty-safety) ÷ (build cost). Each notes the data limit.

**1. Ship an Application/System Usage view (View A).** Highest impact, lowest cost — pure aggregation of `application.label` + step `duration_ms` + counts the API already has at run level. Instantly answers JTBD 1/5/7. *Limit:* time = recorded-time, label honestly.

**2. Ship a Page/Screen Inventory (View B) — Ledgerium's "page tagging" table.** `pageTitle` + `routeTemplate` group-by with frequency + time-on-page. This is the single most recognizable product-analytics artifact and we capture every field. *Limit:* route-template ID-collapse; show `pageTitle` alongside to disambiguate.

**3. Introduce a dedicated "Usage" lens/mode** (per §4) rather than overloading the workflow list. Establishes the page/app group-by surface that Views A–F live in, and signals to product buyers that Ledgerium does app analytics, not just process mining. *Limit:* none — organizational/UX move.

**4. Build the per-session Page-Flow Sankey (View D, per-workflow first).** [Amplitude-Pathfinder-style](https://amplitude.com/docs/analytics/charts/legacy-charts/legacy-charts-pathfinder) navigation map from ordered `routeTemplate`/`pageTitle`. Per-workflow it is trivial and visually compelling; defer the harder cross-workflow page-keyed aggregation. *Limit:* cross-workflow flow needs new page-keyed graph (item 8).

**5. Add a Feature-Tag curation layer (the credibility unlock).** Map `selectorFingerprint`+label+page → user-named Features (Pendo's tag-after-the-fact model). Converts View C from "control-label frequency" into honest **feature usage**. Highest *strategic* value, medium build. *Limit:* requires human curation; until tagged, label View C as "observed controls."

**6. Ship Time-Spent-per-App/Page treemap (View E)** with explicit idle-time flagging (reuse the existing long-single-action/`idle_gap` heuristic). Directly answers "where does the time go," the question every app owner asks. *Limit:* idle vs. work ambiguity — flag, don't hide.

**7. Cross-Workflow Coverage Heatmap (View F).** Apps/pages × workflows matrix. Cheap aggregation, uniquely Ledgerium (process-aware coverage). *Limit:* coverage ≠ population adoption; frame as process coverage.

**8. Stand up a page-keyed aggregation store** (the page/feature analog of the category-keyed intelligence engine) so Views B/C/D/F query fast and stay deterministic/traceable. Enabling infrastructure for items 2/4/7 at scale. *Limit:* net-new persistence; additive, no capture change.

**9. Friction-by-Page (View G), honestly inferred.** Attribute existing `FrictionIndicator`s + error-handling steps + backtracking to the page they occurred on. Differentiates from pure clickstream tools by linking struggle to *process* context. *Limit:* inferred, not instrumented frustration — never call it "rage clicks."

**10. (Optional, gated) Lightweight measured-frustration capture.** Add pre-dedup rapid-repeat-click counts and an opt-in console-error join to approach [FullStory frustration signals](https://help.fullstory.com/hc/en-us/articles/360020624154-Rage-Clicks-Error-Clicks-Dead-Clicks-and-Thrashed-Cursor-Frustration-Signals). Only after privacy review and only opt-in. *Limit:* the one item here that needs new *capture*; sequence last, behind a privacy gate, and never silently.

**Sequencing logic:** 1→2→3 are near-free aggregation wins that establish the lens; 4/6/7 fill out the view set; 5 is the strategic credibility unlock; 8 is the scale enabler; 9/10 push into struggle analytics with honesty guardrails. Everything 1–9 is **zero new capture** — it monetizes data we already collect. Only 10 touches the (protected) capture pipeline and must follow the Extension Reliability Invariant.

---

## Appendix — citations

- Pendo Page tagging — usage, time-spent, return frequency: https://support.pendo.io/hc/en-us/articles/360032292151-Page-tagging
- Pendo Feature tagging — features as tagged UI elements: https://support.pendo.io/hc/en-us/articles/360031950492-Feature-tagging
- Pendo Product Analytics (auto-capture, trends): https://www.pendo.io/product/analytics/
- Amplitude Pathfinder — sankey/path of real user routes, detours, dead ends: https://amplitude.com/docs/analytics/charts/legacy-charts/legacy-charts-pathfinder
- FullStory frustration signals — rage/dead/error click, thrashed cursor: https://help.fullstory.com/hc/en-us/articles/360020624154-Rage-Clicks-Error-Clicks-Dead-Clicks-and-Thrashed-Cursor-Frustration-Signals
- WalkMe digital adoption analytics — application usage + workflows + form analytics, Discovery click-by-click data: https://www.walkme.com/data/

## Appendix — primary code evidence

- Per-event context (url/route/title/app): `apps/extension-app/src/content/capture.ts:556-599`
- DOM target/feature signals: `apps/extension-app/src/content/target-inspector.ts:73-151`
- Route templating + app labeling: `packages/normalization-engine/src/url-normalizer.ts:96-169`; `apps/extension-app/src/shared/utils.ts:39-56`
- Step-level page_context + map node metadata (pageTitle/routeTemplate/dominantAction/eventTypeSummary): `packages/process-engine/src/types.ts:111-129, 238-270`
- Category-keyed (not page-keyed) intelligence: `packages/intelligence-engine/src/types.ts:93-129`
- Derived friction signals: `packages/process-engine/src/types.ts:435-453`; `packages/process-engine/src/workflowInsights.ts:213-348`
- Current workflows API (library list, no page/app aggregation): `apps/web-app/src/app/api/workflows/route.ts:384-509`
