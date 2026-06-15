# PM Status Review — Ledgerium AI Product
**Date:** 2026-06-14
**Author:** product-manager
**Type:** Honest, read-only status assessment
**Scope:** Live product across extension, web app, public site, billing

---

## 1. WHAT IS SHIPPED

### 1.1 Chrome Extension (capture pipeline)
**Maturity: Solid**

The extension (MV3, Manifest v2.0.0, published to Chrome Web Store) captures real user behavior end-to-end. The pipeline is: content script DOM listener → RAW_EVENT_CAPTURED message bus → background service worker → normalizer → live step builder → upload bundle. The capture pipeline has CEO-mandated reliability guarantees (the Extension Reliability Invariant), a real-extension E2E harness using `launchPersistentContext` (iter 070), and 230+ extension-app unit tests. A real-extension validation gate is required before any manifest or capture-pipeline change.

Shipped capabilities: start/stop recording, session persistence across service-worker restarts, domain allow/block lists, policy engine (PII sensitivity detection, credit-card regex, sensitive selectors), live step building from streaming segmentation, upload bundle to API. The sidepanel UI shows recording state, step list, history, and process map preview.

Known limitations: The Chrome Web Store listing and extension download flow depend on the CEO completing the Store submission. The `launchPersistentContext` E2E harness has 2 of 3 tests skipped due to a `chrome.tabs.query()` Windows flake that has not been resolved.

### 1.2 Dashboard — Workflow Library (DashboardV2Shell)
**Maturity: Improving**

The v2 dashboard is the primary authenticated landing page. It renders a table of recorded workflows with health scores, opportunity tags, variation scores, and tool context. The column system is genuinely sophisticated: a 38-key closed-union column registry, column picker drawer, 10 preset chip modes (Automation Candidates, Standardize, etc.), saved views with Prisma-persisted preferences, and versioned preference migrations.

Shipped via the dashboard-redesign Batch A (June 2026): Date Recorded column, sortable columns (runs / cycle time / last run / date recorded / case volume), correct default sort (newest first), dead empty-state CTA fixed (`/install` replacing a dead Chrome Store placeholder), sortable column headers with `aria-sort`.

What is still the v2 shell but not yet visually redesigned: no top-of-page KPI tiles or trend chart, health score still buried top-right rather than leading the page, six stacked control bands (CommandHeader + InsightsStrip + PresetChipRail + filter bar + table header) before the first workflow row. The Batch B (top-of-page graphics) and Batch C (unified toolbar, search, visual modernization) are designed but not shipped. The "last run" column is wired to `lastViewedAt` (a view timestamp, not a run timestamp) and labeled somewhat misleadingly — the design spec documents this.

### 1.3 Workflow Detail — Process Map (4 modes, Variants-on-flow)
**Maturity: Improving (strong foundation, visual finish in flight)**

The workflow detail page exposes three tabs: Workflow (process map), SOP, Report.

The Workflow tab hosts `WorkflowPageShell` with a four-mode switcher:
- **Flow Intelligence** — step-by-step trace, React Flow canvas, node inspector panel
- **System Swimlane** — cross-system view organized by tool
- **Process Variants** — multi-run variant story map, lazy-loaded cohort intelligence via `POST /api/workflows/[id]/variants`, with a full status machine (idle / loading / loaded / unprocessed / forbidden / error) and explicit retry
- **System Topology** — system-to-system handoff graph

The Variants mode ships the variant DNA strip and diverge/reconverge story. The engine (`variantFlowModel.ts`) has 39 assertions in its test suite and is the most tested component in the map surface.

The honesty chokepoint is in place (commit e11b82b removed title-regex fabricated decision labels). The `decisionProvenance` field is planned but not yet wired across all four adapters (this is P0 of the mapping finalize plan). ELK layered layout is planned (P1) but not yet shipping — all four modes currently use the variant builder's deterministic Plan-B arithmetic as the layout fallback. Orthogonal connectors, MapTitleBar, and the Visio-grade visual tokens are in the finalize plan (P0-B) but not yet shipped.

The two new views (Cycle-Time Distribution Histogram and BPMN — per the master plan's D-1 decision; PM_FINAL_PLAN preferred Timeline + SIPOC, coordinator deferred to master plan) are designed but not shipped. The CEO has an open D-1 decision on which two views to build.

Print CSS for the map modes does not yet exist. Export is JSON-only.

### 1.4 SOP View (3 modes)
**Maturity: Improving**

The SOP tab renders via `SOPPageShell` with three modes: Execution (step checklist format), Visual (card layout), Intelligence (analysis overlay). Template artifacts are supported: `template_sop_operator_centric`, `template_sop_enterprise`, `template_sop_decision_based`. A 30-second dwell timer fires `sop_section_viewed` and a usefulness survey.

Export is JSON-only (`handleExport('sop')` downloads the raw SOP artifact). There is no PDF or HTML export. No screenshot capture per step (this is in the future roadmap, not the current plan). The SOP↔Report linkage ("executed N times → view Report") is identified as a gap but not yet shipped.

### 1.5 Report View (17 sections, verdict + scorecard + evidence layers)
**Maturity: Improving (significant recent progress)**

The Report tab (`WorkflowReportPage`) is the highest-investment surface in the product and has received four sequential improvement batches since the June 2026 redesign review.

What is shipped in the R-A through R-D sequence:
- **R-A (cohort fix):** The critical bug where the Report called `analyzeWorkflow()` on a single-run bundle (returning `runCount:1` even for 16-recording samples) is fixed. `/analyze` now calls `analyzeWorkflowVariants` for cohort analysis — the same source as the Variants tab. Report and Variants now derive identical figures.
- **R-B (verdict + scorecard + honesty):** Executive summary (deterministic template, observed-only, 3-sentence), 5-tile KPI scorecard (Cycle Time / Consistency / Variant Count / Bottleneck Step / Automation Score), variant frequency Pareto chart. Honesty fixes: CV with interpretation bands, bottleneck run-count context, "no inefficiencies" gated at runCount ≥ 2.
- **R-C (distribution + gauge + cards):** Cycle-time distribution, bottleneck contribution ranking, consistency gauge, insight cards with evidence anchors, drift section.
- **R-D (print + PDF + nav):** "Save as PDF" via `window.print()` (primary stakeholder action), "Download data (JSON)" (relabeled, honest), print CSS (`@media print` extension scoped to `report-print-root`), right-rail nav grouping, evidence-linked "Process Intelligence Report" header badge.

All R-A through R-D charts are pure SVG/CSS — no Recharts, no client-only rendering that would break hydration. The smoke gate tests (`analysis.smoke.spec.ts`) remain passing.

What is explicitly deferred: contract unification (R-E — the private `IntelligenceData` family vs the engine's `PortfolioIntelligence`) and per-run timestamp ranges in the PDF footer.

### 1.6 Pricing + Billing (Stripe)
**Maturity: Improving (code-complete; operationally gated)**

Four tiers: Free (5 recordings/mo), Starter ($49/mo), Team ($249/mo), Growth ($799/mo), plus Enterprise. Annual billing at ~17% discount. 14-day trial on all paid plans via `TRIAL_PERIOD_DAYS` env var. Webhook coverage extends to `invoice.payment_succeeded` and `customer.subscription.trial_will_end`.

Code is complete as of iter 068 ("CODE-COMPLETE" per CLAUDE.md). The operational dependency is the CEO completing the Stripe Dashboard configuration (Steps 1-6 of `docs/runbooks/STRIPE_SETUP.md`). The product advertises 14-day free trials in the FAQ, but the Stripe infrastructure cannot execute them until those steps are complete. Multi-user seat management and team invite flow are stated as "Q3 2026" in the FAQ.

### 1.7 Public Site
**Maturity: Solid**

Shipped pages: homepage, `/product`, `/pricing` (with ROI calculator), `/install`, `/install-extension`, `/docs` (full documentation with sidebar nav), `/blog` (one published post), `/about`, `/security`, `/privacy`, `/compare/scribe`, `/use-cases/{operations,compliance,ai-implementation}`, `/share/[token]` (public sharing).

The homepage hero is strong ("Your SOP says 5 steps. Your team takes 17.") and has an embedded live demo iframe. The social proof strip shows "1,393 tests passing" — this number is stale relative to the 2,183 tests in the current test suite. The `/compare/scribe` page is live and positions Ledgerium against Scribe directly.

The public demo link from the homepage (`/dashboard.html`) is a static HTML file, not the live app. The gap between what the homepage promises and what a first-time user experiences after signup is meaningful.

### 1.8 Admin Operations Dashboard
**Maturity: Solid**

An internal-only admin dashboard at `/admin/operations` (gated by `isAdminUnlimited`). Ships 5 dashboard sections via a Server Component shell + Client dashboard, Recharts-powered memory gauge, 34 backend tests + 72 frontend tests + 7 Playwright E2E tests. This is operational infrastructure, not a user-facing product surface.

### 1.9 Docs
**Maturity: Improving**

A full `/docs` page with sidebar navigation covering Quick Start, Dashboard, Workflow Detail, Process Variants, Process Intelligence, Recommendations, Teams, Account, Sharing, Exporting, Pricing, Privacy, FAQ. Content appears substantive. Screenshots are referenced but it is unclear how current they are relative to recent UI changes.

---

## 2. WHAT IS IN FLIGHT / DEFERRED

### In the plan, not yet shipped (near-term, design-complete)

- **Dashboard Batch B (P1 top-of-page graphics):** 4 KPI tiles with 30d deltas, "recorded over time" trend chart (weekly bars), portfolio health donut, opportunity distribution bar, one-line narrator summary. All from existing `stats` payload. Design is finalized; one new `stats.activityByWeek` field needed.
- **Dashboard Batch C (P1 streamline):** Unified toolbar (3 control surfaces → 1 two-row), global search, density toggle, health score as colored pill, stable hover affordances, stale badge, persist sort in saved views, modern visual system (typography, whitespace, card radius). The most visible "does this look 2026?" signal.
- **Dashboard Batch D (P2):** Inline run-volume sparklines, CSV export, slide-in workflow detail panel, bulk select.
- **Map finalize P0 (honesty hardening + ShapeResolver + layout fallback):** `decisionProvenance` field across all four adapters, `ShapeResolver` truth table, lift variant builder's Plan-B arithmetic to all modes, Visio visual tokens (orthogonal connectors, `borderRadius: 3`, closed arrowheads), `MapTitleBar`. 2 iterations planned.
- **Map finalize P1 (ELK + new views):** ELK layered layout with determinism tests, orthogonal edge router, Cycle-Time Distribution Histogram, BPMN 2.0 view + export. 3–4 iterations planned. Two new views require CEO D-1 decision (Histogram + BPMN vs Timeline + SIPOC).
- **Map finalize P2 (print + export + polish):** Print CSS for all 6 modes, PNG/PDF export button, loading/empty states, performance guard, `VisioCanvas` unification.
- **Report R-E (contract unification):** Retire 6 private `IntelligenceData` interfaces, unify to engine `PortfolioIntelligence`, build typed selectors. Deferred from R-D deliberately.
- **SOP PDF / HTML export:** Currently JSON only. No design spec exists yet for a proper SOP export artifact.
- **Stripe operationalization:** CEO must complete runbook Steps 1-6.

### Deferred to future phases (not near-term)

- ELK determinism test suite (`elkLayout.test.ts`)
- Map↔SOP run-count linkage ("executed N times → view Report")
- Process Timeline view (PM preferred; architect recommended Histogram; master plan chose Histogram + BPMN)
- SIPOC Summary view (PM preferred; deferred to P2 as runners-up)
- SOP screenshots per step
- User editing of process maps (major architectural work; provenance/honesty hard problems documented)
- User-provided Visio templates / BPMN import
- Evidence drill-down per finding (run IDs → specific steps) — identified as the moat-made-visible feature; not yet shipped
- AI recommendations (the "AI Vision Build" program — ADR-AI-001/002/003 not started; blocked on 5 open CEO decisions)
- Multi-user team workspaces (Q3 2026, per FAQ)
- Per-run timestamp ranges in PDF footer (deferred to R-E)
- Inline run-count sparklines (Batch D)
- Provenance/run-count on every Report finding (partially in R-B/R-C; not comprehensive)

---

## 3. RELEASE READINESS

**The product is not yet launch-ready for a confident external launch. It is ready for a controlled beta.**

### Top Blockers

**B1 — Core value loop is incomplete at the critical moment (Report)**
The Report cohort bug was fixed (R-A), and the Report is now genuinely useful after R-B/R-C/R-D. But the data contract (R-E, private `IntelligenceData`) is still unresolved. The report's private lossy interface silently drops fields like `stdDevMs`, `isHighVariance`, `standardPath`, `evidenceRunIds` that the engine already computes. Users with multiple runs see a report that is correct but does not yet surface its most valuable signals (variant story, timestudy p90, evidence drill-down).

**B2 — Process map visual quality is not yet "Visio-grade"**
The four map modes render correctly and are honest, but they do not yet look like a professional process-mapping deliverable. No orthogonal connectors, no `MapTitleBar`, no `decisionProvenance` discipline across all adapters, no print/export. A user who opens a map and then opens Visio will notice immediately. The mapping finalize plan is well-scoped but not yet started in code.

**B3 — Dashboard visual system is dated**
Six stacked control bands before the first workflow row. No top-of-page numbers or graphics despite 17 stats being aggregated by the API. Default sort was confusing (now fixed in Batch A), but the overall visual language reads 2022, not 2026. Batches B and C are designed and ready to build.

**B4 — Stripe billing is code-complete but not operationally live**
The FAQ advertises 14-day free trials and four plan tiers. None of this works until the Stripe Dashboard configuration is complete. A user on a paid plan clicking "upgrade" enters a non-functioning payment flow.

**B5 — Multi-user workspaces are promised but absent**
The pricing page sells Team (5 users) and Growth (15 users). The FAQ honestly discloses that "multi-user invites are launching Q3 2026," but a buyer evaluating Team tier for a team of 5 today cannot actually use the core team feature they are paying for. This is a credibility gap on the pricing page.

**B6 — SOP export is JSON-only**
The SOP is arguably the product's most immediate user value ("get an SOP from a recording"). Downloading a JSON file is not a usable SOP artifact. The MVP need is a clean HTML or PDF export; the current "Download SOP" button produces a JSON blob.

**B7 — Deploy story unclear**
CLAUDE.md references a `pull_policy` fix as a known issue, but the current deploy status (Railway/Render) is not confirmed in the artifacts reviewed. The extension is submitted to the Chrome Web Store but the status of that submission is also unclear.

### What a Controlled Beta Requires at Minimum

1. Stripe operational (CEO action, ~45 min per runbook)
2. Report R-E (contract unification — makes the Report trustworthy at the data layer)
3. Map P0-A and P0-B (visual quality threshold for the core differentiator)
4. SOP PDF/HTML export (even a basic `window.print()` equivalent)
5. Dashboard Batch B (KPI tiles — the page currently looks empty for a new user with no top-of-page data)

---

## 4. FEATURE COMPLETENESS vs VALUE PROPOSITION

**The stated value proposition:** Record real workflows → get structured SOPs, process maps, and process intelligence → act on them.

| Loop stage | Shipped | Gaps |
|---|---|---|
| **Record** | Chrome extension captures real behavior end-to-end, with policy engine, normalization, live steps, and upload. Extension is in the Chrome Web Store. | The extension install flow on the public site has two paths (`/install`, `/install-extension`) — minor UX duplication. No mobile/Firefox. |
| **Process map** | Four modes, variants-on-flow, React Flow canvas, node inspector, variant DNA strip, cohort intelligence. Honest labels (no fabricated decisions post e11b82b). | Not yet Visio-grade visually. No print/export. ELK layout not shipped. Two planned new views not started. Provenance discipline incomplete across adapters. |
| **SOP** | Three view modes (Execution, Visual, Intelligence), template selection, 30-second dwell tracking. | Export is JSON only — this is the most critical usability gap in the core loop. No screenshots. No PDF. |
| **Report** | 17 sections, verdict, KPI scorecard, variant Pareto, distribution, consistency gauge, drift section, insight cards with evidence anchors, print/Save as PDF (R-D). Cohort bug fixed (R-A). | Contract still lossy (R-E). Evidence drill-down (run IDs → specific steps) not yet shipped. "The moat made visible" moment is described in design but not yet in product. |
| **Act** | None. AI recommendations, integration connections, execution (the full AI Vision Build) are not started. Automation opportunity score is computed and shown, but clicking it produces no action. | The "act" stage is entirely unbuilt. The product surfaces where AI could connect but does not initiate anything. This is a known future phase. |

**The core loop from the user's perspective today:** record → see a process map (good, improving) → read an SOP (good, but can only export as JSON) → read a Report (significantly improved, not yet complete) → ... nothing. There is no "act" surface at all.

This is honest for a platform that has been positioning itself correctly as "measure first." But the jump from "here is your automation opportunity score: 72" to "here is what to do about it" is entirely missing. A user who records 10 workflows, sees a 72 automation score, and then has no next step will churn. This is the biggest strategic gap.

---

## 5. OVERALL STATUS GRADE

### Grade: B-

**Justification:** Ledgerium has built a genuinely differentiated technical foundation — deterministic capture, a real process intelligence engine with 93 metric tiers, honest evidence-linked outputs, a sophisticated column registry, and a cohort-level variant analysis that no equivalent tool at this price point has. The product team has shipped substantively in the June 2026 sprint: the dashboard Batch A, the full R-A through R-D report sequence (including a print-to-PDF flow and the cohort analysis bug fix), and a process-mapping finalize plan that is well-reasoned. The engineering quality bar is high (2,183 tests, determinism invariants enforced, honesty chokepoint in place).

The B- reflects three honest gaps. First, the visual quality of the most-seen surfaces (dashboard, process map) has not yet caught up to the product's analytical sophistication — a first-time visitor or buyer will form a judgment in 10 seconds and the current map and dashboard visuals do not yet communicate "professional process-mapping tool." Second, the core loop has a broken link: SOP export is JSON-only, and there is no "act" surface at all. Third, the billing infrastructure that the pricing page sells is not operationally functional. The product is at controlled-beta quality, not GA quality.

---

## Top 5 Priorities to Move the Needle

**P1 — Stripe operational (CEO action, 45 min)**
Complete `docs/runbooks/STRIPE_SETUP.md` Steps 1-6. This is not an engineering task. Nothing else in the monetization strategy works until this is done. Blocking all revenue.

**P2 — Map finalize P0 (Visio-grade visual quality)**
Ship P0-A (honesty hardening + ShapeResolver + layout fallback lifted to all modes) and P0-B (Visio visual tokens: orthogonal connectors, `borderRadius: 3`, closed arrowheads, `MapTitleBar`). The process map is the product's most memorable moment — it needs to look like a professional deliverable, not a React Flow demo. This is the highest visual impact work available. Estimated 2 iterations.

**P3 — SOP export (PDF/HTML, not JSON)**
The SOP is the product's most universally understood value deliverable. "I recorded a workflow and got an SOP" is the pitch. "I recorded a workflow and got a JSON file" is not. A `window.print()` implementation with clean print CSS (parallel to what was just shipped for the Report in R-D) would close this gap in one iteration. This directly determines whether a free-tier user can actually use the product's output.

**P4 — Dashboard Batch B (top-of-page KPI tiles + trend chart)**
The dashboard currently has no data summary above the workflow list. For any user with 5+ recordings, the page leads with six stacked control bands and then a table. Batch B adds 4 KPI tiles (with 30d deltas) and a "recorded over time" trend chart — both computable from the existing `stats` payload with one small additive field. This converts the dashboard from an inventory page to a process intelligence page. One iteration.

**P5 — Evidence drill-down in the Report**
The Report describes findings (bottleneck, high variance step, automation candidate). But none of these findings link to the specific run IDs or step sequences that produced them. "Evidence-linked AI recommendations" is stated as the product's moat — but users cannot access the evidence from the Report today. Shipping evidence anchors (finding → run ID → step) makes the moat visible and creates a "this is what no one else has" moment. This is the R-E contract unification plus the evidence nav pass; it is a 2-iteration effort but is the most strategically differentiated deliverable available.
