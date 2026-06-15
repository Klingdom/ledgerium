# R-D Architecture Decisions — PDF/Print, Export, Contract, Determinism

**Author:** system-architect
**Date:** 2026-06-14
**Mode:** READ-ONLY decision record. No code changes. Scope: de-risk the R-D batch (PDF export + contract-unify + evidence-linked header + nav grouping) before any code lands.
**Inputs:** `ARCH_REPORT_REVIEW.md` §4.4/§5, `UX_REPORT_REVIEW.md` §5, `REPORT_REDESIGN_REVIEW_001.md` P0-5 / R-3 / R-4, live source (`WorkflowReportPage.tsx`, `workflows/[id]/page.tsx`, `globals.css`).

---

## 0. TL;DR (the five decisions)

| # | Decision | Verdict |
|---|---|---|
| 1 | **PDF approach** | **Client-side `@media print` + `window.print()`.** No server-side PDF. No new dependency. Reuse the existing `@media print` block in `globals.css:245`. |
| 2 | **Export rework** | Replace the report's raw-JSON button with **"Print / Save as PDF"** (`window.print()`). **Keep** raw JSON but **relabel honestly** to **"Download data (JSON)"**. Removes the smoke-gate naming collision as a bonus. |
| 3 | **Contract unification** (private `IntelligenceData` → engine `PortfolioIntelligence`) | **DEFER.** Ship R-D print/PDF without touching the data layer. Unification is a separate, dedicated P1 pass (its own iteration). Documented entry conditions below. |
| 4 | **Determinism / hydration** | Print path adds **zero** new render-time non-determinism. The footer date range is computed **from real run timestamps** (`workflow.createdAt` / `workflow.updatedAt`, both already props), **UTC-pinned**, never `Date.now()`. |
| 5 | **Risk / sequencing** | R-D = **two independently-reversible slices**: (D-1) print CSS + button relabel + print header/footer; (D-2) nav grouping + evidence-linked header. Contract-unify is **out of R-D**. Tests that must stay green enumerated in §5. |

Net R-D blast radius for the shippable stakeholder deliverable: **`globals.css` (one scoped `@media print` extension) + `page.tsx` (two button labels + one `onClick`) + `WorkflowReportPage.tsx` (print header/footer + a `print:` class or two).** No engine, no API, no contract, no Prisma. Fully reversible.

---

## 1. PDF / PRINT APPROACH — confirmed: client-side print

### 1.1 Decision

**Use `@media print` + `window.print()`. Reject server-side PDF (puppeteer/playwright/headless-chrome, or a hosted PDF service) for R-D.**

### 1.2 Justification vs server-side PDF

| Axis | Client print (`window.print`) | Server-side PDF (puppeteer/playwright) |
|---|---|---|
| **Infra cost** | Zero. Browser's own print engine. | A headless-Chrome process per export (200–500MB RSS, cold-start seconds), a queue/worker, or a paid 3rd-party API. On Railway/Render this is a real cost + ops burden. |
| **New dependency** | **None.** | `puppeteer`/`playwright-core` + a bundled Chromium (~300MB) **or** an external SaaS (new secret, new failure mode, data egress of process content to a third party — a privacy regression for an "observed-behavior, evidence-linked" product). |
| **Determinism** | The exact DOM the user already sees, re-laid-out by print CSS. WYSIWYG. | A **second** render path that must reproduce the client render server-side — re-fetch all five artifacts, re-run intelligence, re-hydrate. A divergence between screen and PDF is a new class of bug (the same single-source-of-truth hazard `ARCH_REPORT_REVIEW.md` §1.5 / MDR-P05 warns against). |
| **Hydration** | Irrelevant — print operates on the already-hydrated client tree. The charts are **pure SVG/CSS** (R-B/R-C shipped no Recharts — see §1.4), so there is no `ssr:false` chart to be absent in a print render. | Would require server-rendering the whole report including any client-only charts; reintroduces exactly the hydration surface the smoke gate (`analysis.smoke.spec.ts`) exists to protect. |
| **Auth / data access** | Already in the user's authenticated session; no token plumbing. | The PDF worker needs its own authenticated path to the Team+-gated intelligence (`analyze/route.ts:27`, `variants/route.ts:28`) — new auth surface. |
| **"Save as PDF"** | Built into Chrome/Edge/Safari print dialog. The user gets a real PDF for free. | Produces a PDF file directly — the *only* genuine advantage, and it does not outweigh the above for a stakeholder-share use case. |

**Conclusion:** the only thing server-side PDF buys is a one-click file instead of a two-click print-dialog → "Save as PDF". That convenience does not justify a headless-browser fleet, a new dependency or SaaS, a second divergent render path, and a privacy/egress regression. R-2 / R-3 in `REPORT_REDESIGN_REVIEW_001.md` already framed this as a stakeholder-share deliverable, which print-to-PDF satisfies. **Client print is the correct R-D choice.**

### 1.3 Exactly HOW to trigger it cleanly

There is **already** an `@media print` block at `globals.css:245-265` that (a) sets body to white/black, (b) marks `.ds-step` / `.ds-section` `break-inside: avoid`, (c) hides `nav, button, .no-print`. R-D **extends** this block; it does not invent a new mechanism.

1. **Trigger.** The header "Print / Save as PDF" button calls `window.print()` from a click handler. Guard SSR per `UX_REPORT_REVIEW.md` handoff note 11: the call only runs in a browser click handler, so `typeof window` is already defined; no extra guard strictly needed, but keep the call inside the `onClick` (never at module/render scope). No `useEffect`, no auto-print.

2. **Scope the print CSS to the report.** Do **not** rely on the global `nav, button` hide alone — it is too broad and already correct for chrome, but the report has its own surfaces to linearize. Add a report-scoped rule set. Recommended anchor: wrap the report main column (`WorkflowReportPage.tsx:2898-2938`, the `flex gap-8` root) with a stable class (e.g. `report-print-root`) and write `@media print { .report-print-root { ... } }`. This keeps print rules from leaking into the dashboard/other routes.

3. **Hide the right rail + interactive chrome in print.** The right-rail `RightRailNavigator` (`WorkflowReportPage.tsx:2941`) is screen-only navigation — add `no-print` (already globally hidden via `globals.css:262`) or a `print:hidden` to its wrapper. The global `button` hide already removes the category-filter pills and "Run analysis" CTAs — **verify** this does not also hide content that happens to be a `<button>` (the insight cards expand via buttons; in print they should show **expanded**, see point 5). The detail-page chrome already carries `no-print` (`page.tsx:350` actions, `:382` tab strip, `:506` guidance) — preserved.

4. **Linearize.** The report is a single `space-y-10` column already (`WorkflowReportPage.tsx:2901`), so linearization is mostly free. In print: drop the `flex gap-8` two-column split to a single column (the rail is hidden, so `flex-1 min-w-0` already fills) and remove `gap-8`. Add `break-inside: avoid` to section wrappers (the report sections are `<div id="rpt-*">` not `.ds-section`, so either add `.ds-section` to those wrappers or target `[id^="rpt-"]` in the print block).

5. **Force a fully-rendered, non-partial state.** This is the real gotcha (the task's "page isn't in a partially-loaded state"). The report's intelligence/agent data loads via **client fetch after tab open** (`page.tsx:111-118` auto-fires `/analyze` + `/agent-intelligence`). A user can hit print before those resolve, printing skeletons. Mitigations, in order of preference:
   - **Print only renders what is loaded, honestly.** Each section already has its own empty/skeleton state. A printed skeleton is not a crash — but it is a poor artifact. Acceptable floor.
   - **Recommended:** the print button is in the report header which only exists on the Report tab; gate its enabled state (or show a small "report still loading…" affordance) until the two fetches settle. The page already tracks these via `setIntelligenceLoading`/`setAgentLoading` (`page.tsx:64-68`) — those flags are currently unused for render but are available. **Do not** block print hard; a stakeholder may legitimately want the partial. Prefer a soft hint over a hard disable.
   - **Accordions/disclosures expand in print.** Insight cards (`InsightActionCard`), step breakdown rows, and any `<details>`/`<summary>` collapse hide evidence. In print they must show expanded so the PDF is complete (`UX_REPORT_REVIEW.md` §5.1). For native `<details>`, `@media print { details { } details > *:not(summary) { display: block !important; } }` or force `[open]`. For React-state accordions (`expandedStep`), a pure CSS print rule cannot force them open — accept collapsed-in-print for R-D, or add a `print:block` on the always-rendered evidence. **Decision: accept current expand-state in print for R-D; full "expand-all-in-print" is a P1 polish item** (it touches multiple components and is not required for a usable stakeholder PDF — the top-of-report verdict/scorecard/KPIs/charts/tables are the load-bearing content and they are always rendered).

6. **Page breaks + running header.** Per `UX_REPORT_REVIEW.md` §5.1: `@page { margin: 1in; }` and `break-before: page` before the major group boundaries (e.g. before `#rpt-insights`, before `#rpt-automation`). Keep this minimal for R-D — a single sensible break before the "Evidence" group is enough; aggressive break tuning is polish.

### 1.4 Gotchas — explicitly checked

- **Recharts?** — **Not a risk.** R-B and R-C shipped the charts as **pure SVG/CSS** (deterministic, hydration-safe — the scorecard/verdict/distribution/consistency/Pareto are CSS bars + inline SVG, confirmed by the imports in `WorkflowReportPage.tsx:17-47`: no `recharts`, no `next/dynamic`). So there is **no `ssr:false` chart that would be missing from the print render**, and no `useId()` gradient-collision concern. The `ARCH_REPORT_REVIEW.md` §4.3 "charts client-only" guidance applies only **if** Recharts is adopted later; R-D inherits the safe pure-SVG state and should **not** introduce Recharts (doing so would resurrect the hydration/print risk the smoke gate guards).
- **Consent / cookie banner.** Any analytics/consent banner is app-shell chrome — it must carry `no-print` (the global `nav, button, .no-print` hide covers buttons; verify the banner container itself is `no-print` so it does not print as an empty bar). Flag for the implementer to confirm the banner element, not just its buttons, is excluded.
- **The right-rail** is the other obvious print artifact — covered in point 3 (hide it).
- **Animated count-ups** (`useCountUp` in the hero) — print captures whatever value is current. Since print fires on a settled page, the final value is shown; no action needed. (If a user prints mid-animation they see an interim number — cosmetic only, low risk.)
- **Background gradients / colors.** Browsers strip backgrounds in print by default. The verdict/KPI cards use brand gradients; if the printed artifact must keep them, the implementer sets `print-color-adjust: exact` on those cards. **Decision: let backgrounds drop to white in print** (cleaner, more ink-friendly stakeholder doc); only force-color the few elements where color encodes meaning (consistency green/amber/red dots, severity pills) via `print-color-adjust: exact` on those specific elements.

---

## 2. THE CURRENT EXPORT — what it does today, and the honest replacement

### 2.1 What `handleExport` does today

`page.tsx:263-284`. It is a **raw-JSON file download**, not a report export:

- `handleExport('report')` → `JSON.stringify(workflowReport ?? null, null, 2)` of the **`workflow_report` artifact** (the legacy `ReportTab` artifact: `header/executiveSummary/metrics/sop`), filename `…-report.json`. **Note:** this is *not* the `WorkflowReportPage` content and not the resolved `intelligence` — it is a stale, often-null artifact. Calling it "Report" is misleading.
- `handleExport('sop')` → `JSON.stringify(sopArtifact)` → `…-sop.json`.
- `handleExport('workflow')` → `JSON.stringify(processOutput)` → `…-workflow.json`.

All three: `Blob` → `URL.createObjectURL` → synthetic `<a>` click → `track({ event: 'workflow_exported', format })`. The three buttons live in the `no-print` actions cluster (`page.tsx:367-376`): **"Report"** (Download icon), **"SOP"** (Download icon), **"JSON"** (FileJson icon).

### 2.2 The honest replacement

**Goal:** stop labeling a raw-JSON dump of a stale artifact as "Report", and give the report a real "Print / Save as PDF" action — without breaking the JSON download for engineering handoff/data-portability (`UX_REPORT_REVIEW.md` §5.2 keeps a JSON export deliberately).

Recommended button set in the actions cluster:

1. **"Print / Save as PDF"** — `onClick={() => window.print()}` (Printer/FileText icon). This is the primary stakeholder action. It replaces the misleading **"Report"** raw-JSON button.
2. **"Download data (JSON)"** — keep `handleExport` but relabel. Honest naming makes clear it is the data payload, not the rendered report. For R-D, point it at the **most useful** payload — recommend `processOutput` (the full process definition) and/or the resolved `intelligence`, not the stale `workflowReport` artifact. **Minimal-change option:** keep the existing three JSON buttons but relabel "Report" → "Report data (JSON)" so no honesty claim is broken; **preferred option:** collapse to one "Download data (JSON)" + add Print. Either is acceptable; the preferred is cleaner.
3. **"SOP"** / **"JSON"** existing buttons — keep as-is or fold under the single data export; not load-bearing for R-D.

**Bonus correctness — removes a real test hazard.** The smoke gate (`analysis.smoke.spec.ts:62-63, 123-124`) **explicitly works around** the fact that there is both a tab named "Report" and an **export button named "Report"** (`page.tsx:368`): it scopes with `page.locator('nav').getByRole('button', { name: 'Report' })`. Relabeling the export button away from "Report" **eliminates that collision**. The implementer must keep the smoke selector working — scoping to `nav` still resolves the tab uniquely, so relabeling the export button is **safe and improves** the test surface. **Do not** rename the **tab** button "Report" (the smoke gate and users depend on it).

**Analytics:** keep emitting `workflow_exported`; add a distinct event for the print action (e.g. `report_printed`) so the two intents are measurable separately (consistent with the product's measurement principle). Print can be tracked from the `onClick` before `window.print()`.

---

## 3. CONTRACT UNIFICATION — DEFER (recommended)

### 3.1 Decision

**DEFER** unifying the report's private `IntelligenceData` (`WorkflowReportPage.tsx:237-252` family, lines 171-252) into the engine's `PortfolioIntelligence`. **R-D ships print/PDF + header + nav without touching the data contract.**

### 3.2 Why defer (regression-risk assessment)

The unification is real, correct, and worth doing (`ARCH_REPORT_REVIEW.md` §3, `REPORT_REDESIGN_REVIEW_001.md` P1-13) — but it is a **data-layer** change, and R-D's shippable value (a stakeholder PDF) is a **presentation** change. Coupling them violates one-logical-outcome and imports avoidable risk:

- **Different blast radius.** Print/PDF touches CSS + two buttons + a header. Contract-unify deletes 6 private interfaces (`IntelligenceData`, `IntelligenceVariance`, `IntelligenceVariant`, `IntelligenceBottleneck`, `IntelligenceMetrics`, `TimestudyStep` — `WorkflowReportPage.tsx:171-252`) and rewires **every** consumer that currently optional-chains them: `deriveLeadFigures` (`:642-737`), `VarianceVariantsSection`, `DriftSection`, `TimestudySection`, `BottleneckContributionSection`, `CycleTimeDistributionSection`, `ConsistencyGaugeSection`, plus the three R-B/R-C pure modules' input types (`reportVerdict.ts`, `reportScorecard.ts`, `reportEvidence.ts`). That is a wide, deep edit.
- **It is also a wiring change underneath.** `ARCH_REPORT_REVIEW.md` §1.5 shows the report's `intelligence` prop is currently the **single-run** `/analyze` output; the honest contract assumes the **cohort** source. The R-A fix (per `REPORT_REDESIGN_REVIEW_001.md` "FIXED this iteration") repointed `/analyze` at `analyzeWorkflowVariants`, so the **source** is now cohort — but the **typed shape** is still the lossy private one. Unifying the type now would surface every place the private shape silently dropped `stdDevMs` / `isHighVariance` / `standardPath` / `evidenceRunIds` (§1.4) — each is a deliberate, test-worthy presentation decision, not a mechanical rename.
- **The `asArray()` outage guard.** The report defends against malformed artifact JSON at runtime (`WorkflowReportPage.tsx:55-57`, the 2026-06-09 outage anchor). Tightening types to the engine contract does **not** remove the runtime hazard — the guard must survive — but it does change where the boundary lives. That belongs in a focused pass with the hostile-data smoke regression (`analysis.smoke.spec.ts:109-138`) front-of-mind, not bundled with a CSS change.
- **R-D ships value either way.** The print/PDF deliverable reads the *already-resolved, already-rendered* values. It is **agnostic** to whether those values came through a private interface or the engine type. Deferring unification costs R-D nothing.

**Net:** unifying now risks destabilizing the data layer (the exact thing the task warns against) for zero R-D benefit. Defer.

### 3.3 What "do it later" entails (so the deferral is honest, not a black hole)

A dedicated **R-E (or R-D.2) contract-unify pass**, single logical outcome:
1. Introduce the shared `ProcessIntelligence` contract module (`ARCH_REPORT_REVIEW.md` §3.1) — alias the engine `PortfolioIntelligence` + the two `analyzeWorkflowVariants` enrichments (`variantStepTitles`, `variantStepDurations`); **do not re-declare fields**.
2. Delete the 6 private interfaces (`WorkflowReportPage.tsx:171-252`); replace with imports.
3. Move `asArray()` into the contract's pure, unit-tested **selectors** (`selectStandardPath`, `selectSequenceStability`, `selectHighVarianceSteps`, `selectCrossRunBottlenecks`, `selectEvidenceRunCount`). Render code stops optional-chaining raw.
4. Type `WorkflowPageShell.variantIntelligence: any` → `ProcessIntelligence` so Report + Variants provably read one object.
5. Re-type the R-B/R-C pure-module inputs against the shared selectors; their existing unit tests (`reportVerdict.test.ts`, `reportScorecard.test.ts`, `reportEvidence.test.ts`) are the regression net.
6. **Gates that must stay green:** the two smoke specs in `analysis.smoke.spec.ts` (hydration + hostile-data outage regression), the intelligence-engine unit suite (untouched, proves engine-faithfulness), and the three report pure-module test files.

This is a clean, reversible, well-fenced pass — **just not R-D**.

---

## 4. DETERMINISM + HYDRATION-SAFETY for the print path

### 4.1 The rule

The print path must add **zero** new render-time non-determinism. Specifically: **no `Date.now()`, no `new Date()` (un-pinned), no `Math.random()`, no `toLocaleString()` without a fixed `timeZone`, in render.** This is the Ledgerium determinism invariant and the precise thing the hydration smoke gate (`analysis.smoke.spec.ts` patterns, esp. `/Text content does not match/`) fails on. `window.print()` itself runs in an event handler (not render) so it is inherently safe.

### 4.2 The footer / metadata date range — compute it honestly + deterministically

`UX_REPORT_REVIEW.md` §5.3 / RPT-P2-07 wants a printed identifier line: "Ledgerium AI — Process Intelligence Report · [date range] · generated [date]". The hazard: a naive `new Date().toLocaleDateString()` for "generated" is **non-deterministic** (clock-dependent → hydration mismatch) and **dishonest** (the report content is observed history, not "now").

**What real timestamps are available to the report (deterministic, already props):**
- `workflow.createdAt` (`WorkflowReportPage.tsx:70`) — when this workflow record was created.
- `workflow.updatedAt` (`:71`) — last update.
- The engine stamps `computedAt` server-side on every intelligence block (`types.ts:128,163,199,243,274,310,346`) — the deterministic "as analyzed" time, if surfaced through the contract.
- Per-run provenance exists via `evidenceRunIds` (`types.ts:126,146,153,…`) — but these are **ids**, not timestamps, so they cannot directly yield a date range without joining to run records (a data-layer reach R-D should avoid).

**Decision — the date line, in priority order:**

1. **"Generated" / "as of" date** = the engine's `computedAt` if the contract surfaces it (it is the honest "when this analysis was produced" stamp, deterministic, server-set). If not surfaced in R-D (contract-unify deferred), use **`workflow.updatedAt`** as the proxy — it is a real, deterministic, server-supplied timestamp already in props. **Never** `Date.now()`.
2. **"Date range"** of observed behavior — R-D should **not** fabricate a multi-run min/max range it cannot honestly derive. The report does **not** today have per-run start/end timestamps in props (only `workflow.createdAt`/`updatedAt` and `evidenceRunIds`). So:
   - **Honest R-D scope:** show a **single recorded date** — `workflow.createdAt` ("Recorded Jun 14, 2026") — not a fabricated range. This is true for the single-run case and a defensible "first recorded" for cohorts.
   - A true **first-run → last-run range** requires run-record timestamps reaching the report. That is a **data-layer addition** → fold it into the deferred contract-unify pass (R-E), where the cohort run set is already in scope, **not** R-D. Until then, do not print a range you cannot source.
3. **Formatting** — UTC-pinned, value-driven, exactly the existing safe pattern: `new Date(workflow.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC' })` — the proven hydration-safe idiom already used at `ReportTab.tsx:38`. Pinning `timeZone: 'UTC'` makes server and client render identical → no mismatch.

**Honesty guard:** if a timestamp prop is null/empty, render "—", never a guessed date. Same discipline as the rest of the report (no fabricated numbers).

### 4.3 Hydration

Print introduces no SSR/CSR boundary of its own (it re-lays-out the already-hydrated tree). The only hydration risks are (a) a non-deterministic date in the new footer — **eliminated by §4.2's UTC-pinned, value-driven rule**, and (b) introducing Recharts — **explicitly not done in R-D** (§1.4). The smoke gate (`analysis.smoke.spec.ts`) remains the backstop and must pass unchanged.

---

## 5. RISK / SEQUENCING + contracts that must not break

### 5.1 Sequencing — R-D as two independently-reversible slices

- **D-1 (the stakeholder deliverable — ship first):** print CSS extension in `globals.css` (scoped `@media print` for the report) + "Print / Save as PDF" button + relabel "Report" export → "Download data (JSON)" / "Report data (JSON)" + print header/footer with UTC-pinned recorded date (§4.2). **Files:** `globals.css`, `page.tsx`, `WorkflowReportPage.tsx`. No engine/API/contract. Fully reversible (CSS + labels + one handler).
- **D-2 (presentation polish — ship second, independent):** grouped right-rail nav (4 categories per `UX_REPORT_REVIEW.md` §2.6) + evidence-linked header badge ("Process Intelligence Report: [Workflow]"). **Files:** `WorkflowReportPage.tsx` (`SECTION_IDS`/`SECTION_LABELS` → grouped structure at `:348-398`, `RightRailNavigator`). Pure presentation; no data change.
- **OUT of R-D:** contract-unify (§3 → its own R-E pass); any Recharts adoption; server-side PDF; per-run timestamp range plumbing.

Each slice is one logical outcome, own commit, own validation.

### 5.2 Tests / contracts that MUST NOT break

| Gate | Location | Why it's at risk in R-D | Mitigation |
|---|---|---|---|
| **Hydration smoke** | `e2e/smoke/analysis.smoke.spec.ts` (test 1) | New footer date could reintroduce a render-time clock value → `Text content does not match`. | UTC-pinned, value-driven date only (§4.2). No `Date.now()` in render. |
| **Hostile-data outage regression** | `analysis.smoke.spec.ts:109-138` | Print/header edits must not disturb the `asArray()` guard or the friction/rework render path. | Touch only CSS + buttons + footer; leave `asArray()` (`:55-57`) and the section bodies untouched. |
| **Tab-vs-export "Report" name collision** | smoke selector `nav.getByRole('button',{name:'Report'})` (`:62-63, 123-124`) | Relabeling the export button is the intent; renaming the **tab** would break the selector. | Relabel the **export** button (removes the collision); never rename the **tab** button. Re-run smoke. |
| **R-B/R-C pure modules** | `reportVerdict.ts/.test.ts`, `reportScorecard.ts/.test.ts`, `reportEvidence.ts/.test.ts` | R-D must not change their inputs/outputs (contract-unify, which would, is deferred). | D-1/D-2 don't import or alter these modules. Tests stay green byte-for-byte. |
| **Existing `@media print` behavior** | `globals.css:245-265` | Extending the block could over-hide content (`button` hide already aggressive) or leak report rules to other routes. | Scope new rules to a `report-print-root` wrapper; verify dashboard/SOP print unaffected. |
| **Intelligence-engine suite** | `packages/intelligence-engine/src/*.test.ts` | Should be wholly untouched in R-D. | R-D touches no engine/contract; suite must remain green as the engine-faithfulness guarantee. |
| **Existing JSON export** | `handleExport` (`page.tsx:263-284`) + `workflow_exported` analytics | Relabel/repoint must not break the download or the event. | Keep the `Blob`/`createObjectURL` mechanism + `track('workflow_exported')`; only change label + (optionally) which payload it serializes. |

### 5.3 Key risks (ranked)

- **R1 — Partial-load print** (medium): user prints before `/analyze`+`/agent-intelligence` settle → skeleton PDF. Mitigation: soft "loading" hint on the print button via the existing loading flags (`page.tsx:64-68`); never hard-block. (§1.3 point 5.)
- **R2 — Print CSS leakage / over-hiding** (medium): the global `button` hide + new report rules accidentally hide content or affect other routes. Mitigation: scope to `report-print-root`; manual print-preview of report + dashboard + SOP. (§1.3 point 2/3.)
- **R3 — Footer date non-determinism** (low, high-consequence): any un-pinned date reintroduces a hydration mismatch. Mitigation: §4.2 UTC-pinned rule is mandatory; smoke gate is the backstop.
- **R4 — Scope creep into contract-unify** (medium): the temptation to "just type it properly while here." Mitigation: §3 hard line — contract-unify is R-E, not R-D.
- **R5 — Legacy `ReportTab` confusion** (low): `ReportTab.tsx` is the unwired older renderer (`ARCH_REPORT_REVIEW.md` R4); a contributor could add print to the wrong file. Mitigation: all R-D print work targets `WorkflowReportPage.tsx` (the live report) — note it in the commit.

---

## Appendix — file/line index (verified this pass)

| Concern | Location |
|---|---|
| Existing `@media print` block (extend this) | `apps/web-app/src/app/globals.css:245-265` |
| Report main column root (wrap for print scoping) | `WorkflowReportPage.tsx:2898-2942` |
| Report footer (add UTC date line here) | `WorkflowReportPage.tsx:2934-2937` |
| Right rail (hide in print) | `WorkflowReportPage.tsx:2941` (`RightRailNavigator`) |
| `asArray()` outage guard (must survive) | `WorkflowReportPage.tsx:55-57` |
| Private lossy `IntelligenceData` family (defer; do NOT touch in R-D) | `WorkflowReportPage.tsx:171-252` |
| `deriveLeadFigures` (consumer of private types) | `WorkflowReportPage.tsx:642-737` |
| Section id/label arrays (group for D-2 nav) | `WorkflowReportPage.tsx:348-398` |
| `handleExport` (raw JSON; relabel) | `page.tsx:263-284` |
| Export buttons "Report"/"SOP"/"JSON" (relabel "Report") | `page.tsx:367-376` |
| Detail-page chrome already `no-print` | `page.tsx:350, 382, 506` |
| Auto-fire `/analyze` + `/agent-intelligence` on Report open | `page.tsx:111-118` |
| Unused loading flags (use for print soft-hint) | `page.tsx:64-68` |
| Hydration-safe UTC date idiom (reuse) | `ReportTab.tsx:38` |
| `workflow.createdAt` / `updatedAt` props (deterministic dates) | `WorkflowReportPage.tsx:70-71` |
| Engine `computedAt` stamps (honest "as analyzed") | `packages/intelligence-engine/src/types.ts:128,163,199,243,274,310,346` |
| R-B/R-C pure modules (must not change in R-D) | `reportVerdict.ts`, `reportScorecard.ts`, `reportEvidence.ts` (+ `.test.ts`) |
| Hydration + hostile-data smoke gates | `apps/web-app/e2e/smoke/analysis.smoke.spec.ts` (tabs scoped to `nav` to avoid "Report" collision) |
