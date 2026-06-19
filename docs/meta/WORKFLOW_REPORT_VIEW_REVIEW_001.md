# WORKFLOW REPORT VIEW — Usability / Information-Control Review (REVIEW_001)

**Type:** CEO-directed Mode 3-adjacent multi-agent review (NON-counting; no product code changed).
**Date:** 2026-06-19
**Directive (verbatim intent):** *"Engage all subagents … analyze the workflow report view to assess usability, information, user experience and other key measures to dramatically improve usability and information control and understanding."*
**Panel (8 specialist lenses, all completed):** product-manager, ux-designer (carrying the *information-architecture / cognitive-load* remit), frontend-engineer, system-architect, analytics (carrying the *comprehension-measurement* remit), growth-strategist, competitive-researcher, qa-engineer.
**Surface under review (real code, grounded):**
- `apps/web-app/src/components/detail/WorkflowReportPage.tsx` (3094 lines — the single-scroll report)
- pure modules: `reportSections.ts`, `reportMeta.ts`, `reportVerdict.ts`, `reportScorecard.ts`, `reportEvidence.ts`, `reportDivergence.ts`; entry `ReportTab.tsx`
- route `app/(app)/workflows/[id]/page.tsx`; prior plan `docs/features/report-view/REPORT_CONSOLIDATION_AND_PERFECT_REPORT_PLAN.md`

> Note on "create agents": new persistent agent types can't be spawned reliably mid-session, so two missing specialized remits were assigned explicitly — **IA / cognitive-load → ux-designer** and **comprehension-measurement → analytics**.

---

## 1. Executive verdict

**The report is right in concept and wrong in hierarchy.** The content is largely correct, the determinism/honesty engineering is genuinely best-in-class, and the evidence-linked moat is real. But the surface is a **data inventory dressed as a document**: it renders ~23 always-on sections in a fixed linear order (~7,700–9,200px ≈ 7–8 screens), leads with metadata and stacked summaries instead of the answer, repeats the same metrics 2–3×, and gives the reader **zero control** over visibility, order, density, collapse, or focus. The product's #1 differentiator — every figure traces to recorded events — is whispered in a badge tooltip and a footer rather than led with.

**Six independent lenses converged on the same three failures:**
1. **Lead with the answer, not metadata.** Five "summary-ish" blocks (Verdict → Scorecard → Hero(6-metric band) → "Start Here" Lead → Key Actions) stack before any evidence; they *delay* the body rather than replace it. (PM, growth, ux, competitive)
2. **The 23-section single scroll is the root usability failure.** The most actionable sections (Automation, Bottlenecks, Roadmap) sit ≥5 screens down. (ux quantified the scroll; PM; competitive — *no* process-mining tool ships an in-report TOC/collapse, a first-mover gap.)
3. **No information control.** The CEO's explicit ask — collapse, exec-vs-detail, density, focus, saved views — does not exist today. (ux, frontend, architect, competitive.)

**Two cross-cutting truths the redesign must honor:**
- **Fix the data contract before adding controls** (architect): 7 sections re-derive metrics off the raw artifact blob, bypassing the single `deriveLeadFigures`. Hidden/reordered sections are *current derivation sites*, so user-hiding before consolidation risks honesty drift.
- **You cannot prove improvement yet** (analytics + PM): the report fires essentially **one** analytics event (`report_viewed`); 6 of 7 needed events are *typed* in `analytics.ts` but have *no call sites*. Instrument first, then restructure against a baseline.

---

## 2. Cross-agent convergence map

| Theme | PM | UX/IA | FE | Arch | Analytics | Growth | Competitive | QA |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Lead with verdict/action, demote metadata | ● | ● | | | | ● | ● | |
| Progressive disclosure / collapse / exec-mode | ● | ● | ● | ● | | | ● | ●(gates) |
| Information-control affordances (CEO ask) | ● | ● | ● | ● | | ● | ● | ●(gates) |
| Eliminate metric redundancy (single canonical home) | ● | ● | | ● | | ● | | ●(threshold dup) |
| Data-contract single-source (`deriveReportModel`) before controls | | | ● | ● | | | | ● |
| Measurement gap — instrument section/nav/scroll | ● | | | | ● | | ● | |
| Moat made visible (per-metric provenance, drill-down) | ● | | | | | ● | ● | |
| Correctness pre-reqs (scroll-spy, print, dangling nav) | | | ● | | | | | ● |

Eight-of-eight agreement that the report needs a **lead-first + progressive-disclosure + user-controlled** restructure, gated by a data-contract consolidation and preceded by instrumentation + a handful of correctness fixes.

---

## 3. The diagnosis (grounded)

**3.1 Scroll & front-loading (ux).** DOM order of 23 sections totals ~7,700–9,200px on a 15-step multi-run workflow. The reader passes five summary blocks, then Process Health, Phase Timeline, four "Health & Spread" sections, a step-timing table, an insights feed, *then* reaches Automation (≈5,500px) and Roadmap (deepest). Most stakeholder readers stop before the actionable content.

**3.2 IA mismatch (ux + qa).** The right-rail nav groups sections into **Summary / Health & Spread / Evidence / Actions**, but DOM order ≠ nav-group order. The "Evidence" group's 10 sections are scattered across DOM positions 5–8 and 13–19, with "Health & Spread" (9–12) and "Automation" (15) embedded inside them. A reader who uses the nav to model the document gets an inaccurate map. (`reportMeta.ts` SECTION_GROUPS vs the JSX render order at `WorkflowReportPage.tsx:3045–3075`.)

**3.3 Redundancy (ux + arch + growth).** Cycle time → Scorecard + Cycle-Time Distribution + Step Timing; consistency → Scorecard tile + Consistency gauge; variant count → Scorecard + Variance&Variants; the Hero band's 6 metrics overlap the Scorecard. Every occurrence looks equally authoritative; the report never teaches which is canonical.

**3.4 Honesty drift risk at the composition layer (arch — highest-severity structural finding).** `deriveLeadFigures` (line 608) centralizes only the *lead* figures (Verdict + Scorecard). At least **7 sections re-derive the same metrics off the raw `intelligence` blob** with their own fallbacks (lines 996, 1131, 1711, 1731–1734, 1780–1790, 1999/2076 double-compute, 2283). The bottleneck "% of cycle time" in the Verdict and the ranking in `BottleneckContributionSection` are computed independently and *can disagree*. Section visibility is **double-gated**: the `visibleSections` mega-useMemo (lines 2892–2975) re-runs `deriveDistribution`/`deriveConsistencyScore`/`deriveInsightCards`, while each section *also* `return null`s internally — if they diverge, the nav lists a section that renders nothing (or vice-versa).

**3.5 Measurement (analytics).** Only `report_viewed` is fired (`WorkflowReportPage.tsx:3000`). The taxonomy in `analytics.ts` already *defines* `report_section_viewed`, `report_insight_card_expanded`, `report_key_action_card_viewed`, `report_evidence_anchor_viewed`, `report_print_clicked`, `report_data_export_clicked` — **typed but never called**. Scroll-spy already computes `activeId` and is never wired to `track()`. We therefore cannot answer "is the 23-section report understood or overwhelming?"

**3.6 Correctness pre-reqs surfaced by QA (must fix before piling on features):**
- **P0 print-integrity bug** — `StepBreakdownSection` (line ~1340) uses `{isExpanded && <div…>}` conditional render; collapsed step detail is **unmounted and lost from print/PDF** (an evidence-linked deliverable losing evidence). Any new collapse feature replicates this at scale.
- **P0 scroll-spy thrash** — `useScrollSpy([...visibleSections])` spreads a new array every render → IntersectionObserver disconnect/reconnect on every parent re-render, resetting `activeId`. Adding collapse/density state multiplies parent renders and worsens this geometrically.
- **P0 dangling nav links** — five sections fall through the `visibleSections` catch-all `return true` (rpt-hero/insights/automation/bottlenecks/steps); when e.g. `InsightCardsSection` returns null on empty cards, the nav item is a dead anchor.
- **P1** — `ComposedAgentsSection`/`IntegrationsSection` use `?? []` instead of the post-outage `asArray()` (crash risk on non-array truthy artifact values); `HIGH_VARIANCE_CV_THRESHOLD` is defined twice (`reportScorecard.ts` + `reportEvidence.ts`) and can silently diverge; `deriveTimeLeverage` is called twice.

---

## 4. The redesign direction (consolidated)

**The framing shift (all lenses):** from *"show every computed signal; trust the reader to find what matters"* → *"lead with the answer; offer the evidence on demand; let the reader control the depth."*

**4.1 Irreducible Executive one-screen** (what's always-on):
- One interpretive **lead** sentence as the dominant element (e.g., *"Step 7 owns 41% of process time and runs 3.2× slower than average — start here."*) — the `buildReportVerdict` output promoted to the top, single-run-safe.
- A **3-tile compact scorecard** (cycle time · consistency · top bottleneck) with run-count qualification.
- The **evidence-linked disclosure** ("All figures from observed behavior — no benchmarks, no estimates") elevated **above the fold**, not in a hover tooltip.
- Reader-intent anchors: **Diagnose · Find automation · Share**.

**4.2 Progressive-disclosure model** (PM + ux + competitive):
- **Collapsed-by-default, expand on click:** the diagnostic body (Process Health, Phase Timeline, Distribution, Consistency, Variance, Step Timing/Duration, Step Breakdown) — each header shows a one-line status ("Bottlenecks · 2 found") so value is visible without the scroll. **Always mounted for print.**
- **Default-collapsed deep/plan-gated:** Composed Agents, Skill Library, Integrations, Roadmap.
- **Honesty-gated full suppression** (not collapse) on single-run: Variance, Variants, Distribution, Drift.

**4.3 Information-control affordances** (the CEO ask):
- Per-section **collapse/expand** + **collapse-all / expand-all**.
- **Executive vs Full** mode (Executive = Summary cluster + Roadmap; everything else collapsed).
- **Density** toggle (comfortable/compact) — spacing only, never a data slice.
- **Sticky exec mini-summary** bar (verdict band word + run count + top action) once scrolled past the verdict.
- **Show/hide sections + saved view** preferences, persisted.
- **Focus this section** (dim the rest; Escape to exit, reusing the centralized-dispatch pattern).
- *Invariant:* every control is **pure-presentational** and can only **subtract** from what the data gate already permits; it must never change a figure, surface cross-run language at runCount<2, or hide the non-hideable Verdict/Scorecard. Print always renders Full.

**4.4 IA correction:** make **DOM order match nav-group order**; constrain user reorder to **within-group** only (qa guardrail); relabel groups for reader intent (growth: "Health & Spread"→"Spread & Patterns", "Evidence"→"Detail").

**4.5 The moat made visible** (growth + competitive — the differentiator no competitor has): **per-metric provenance** ("from N events · date range") on every figure, and **evidence drill-down** (metric → the source runs that produced it; `evidenceRunIds` already threaded). Competitive note: Celonis/Signavio are racing toward *AI-generated* annotations that can hallucinate; Ledgerium's deterministic, traceable annotations are strictly stronger for regulated buyers — **lean into it, do not chase LLM summaries.**

---

## 5. Prioritized findings (consolidated, reconciled across lenses)

Severity reconciled; each item cites the originating lens(es) + file anchor. Effort S/M/L.

### P0 — correctness pre-reqs (do FIRST; they gate everything else)
- **RPT-P0-1 Scroll-spy reference stability** — remove the `[...visibleSections]` spread / memoize input. `useScrollSpy.ts:23` + `WorkflowReportPage.tsx:2752`. *(QA, FE)* — **S**
- **RPT-P0-2 Step-breakdown print integrity** — replace conditional render with CSS `hidden print:block` (or dual-element) so collapsed detail prints. `WorkflowReportPage.tsx:~1340`. *(QA)* — **S**
- **RPT-P0-3 Dangling nav links** — give the five catch-all sections explicit gates mirroring their internal null condition (esp. `rpt-insights` = `deriveInsightCards(...).length>0`). `WorkflowReportPage.tsx:2975`. *(QA)* — **S**

### P0 — measurement (unblocks every redesign decision)
- **RPT-P0-4 Wire `report_section_viewed` + `report_nav_used`** (hoist scroll-spy `activeId`; add call sites in nav handlers). Add `report_nav_used` to the union. *(Analytics, PM)* — **S/M**
- **RPT-P0-5 Add 3 new event variants** (`report_nav_used`, `report_step_expanded`, `report_insight_filter_changed`, `report_scroll_depth`) + wire `report_step_expanded`, `report_insight_filter_changed`, milestone `report_scroll_depth`, and the already-typed `report_print_clicked`. PII-free, deterministic. `analytics.ts` + section handlers. *(Analytics)* — **S/M**

### P0 — lead recomposition (cheap, highest immediate comprehension gain)
- **RPT-P0-6 Lead-first hierarchy** — make the verdict sentence the dominant element; move "Start Here" lead **above** the scorecard; demote Hero's 6-metric band to a compact subtitle; elevate the evidence-linked disclosure above the fold. Component reorder, no logic change. *(Growth P0-A/B/C, PM Move 1, UX)* — **S**

### P0 — data contract (architect sign-off; gates user-controlled hiding)
- **RPT-P0-7 `deriveReportModel` single-source** — promote `deriveLeadFigures` into one pure module feeding *all* sections + a `presence` map; route the 7 redundant derivations through it. Golden-fixture byte-identity parity test. `WorkflowReportPage.tsx:608, 1711, 1731–1734, 1780–1790, 1999/2076, 2283`. *(Architect)* — **M**
- **RPT-P0-8 Section registry** — replace the `visibleSections` `if`-ladder with a declarative `REPORT_SECTIONS` registry (`id → {group,label,gate(model),defaultVisible}`), folding `SECTION_IDS`/`SECTION_LABELS`/`SECTION_GROUPS`; removes double-gating. Parallels the dashboard column registry. *(Architect)* — **M**

### P1 — information control (the CEO ask; after P0-7/8)
- **RPT-P1-1 Per-section collapse + collapse-all** (aria-expanded/controls; CSS-visibility not unmount; focus-return). *(FE P1-3, UX P1-1, QA a11y)* — **M**
- **RPT-P1-2 Executive vs Full mode** (default-collapse deep sections). *(PM, UX, FE — S after P1-1)* — **S**
- **RPT-P1-3 Sticky exec mini-summary bar.** *(FE P1-2, UX P0-3)* — **S/M**
- **RPT-P1-4 IA reorder: DOM = nav order; relabel groups; within-group reorder only.** `reportSections.ts`/`reportMeta.ts`/render order. *(UX P0-1, Growth P2-A, QA constraint)* — **M**
- **RPT-P1-5 Redundancy removal** — single canonical home per metric; others reference, not re-state (only safe after P0-7). *(UX, Arch, Growth)* — **S/M**
- **RPT-P1-6 Copy pass** — verdict label, single-run baseline framing, consequence language, sub-header, automation gated-vs-absent split (KEEP/POLISH/REWRITE strings in growth report). *(Growth P1)* — **S**
- **RPT-P1-7 Density toggle** (spacing-only). *(FE P1-1, UX P2, Competitive R6)* — **S**
- **RPT-P1-8 Migrate the variant diverge/reconverge story into the report at run-grain** (honesty-suppressed single-run). *(PM Move 3)* — **M**
- **RPT-P1-9 asArray + threshold-dedup + single `deriveTimeLeverage`** correctness. *(QA P1)* — **S**

### P2 — persistence, polish, differentiator depth
- **RPT-P2-1 Saved view preferences** — new `UserReportPreference` (clone `UserDashboardPreference` stack: versioned JSON payload + never-throws migration + graceful drop + `GET/PUT /api/report/preferences`). Effective-visibility = data-gate ∧ ¬hidden ∧ mode. *(Arch, FE, Competitive R5)* — **L**
- **RPT-P2-2 Per-metric provenance indicators** ("from N events · range") — the moat made visible; unoccupied by any competitor. *(Growth, Competitive Part 3)* — **M**
- **RPT-P2-3 Evidence drill-down** (metric → source runs; uses `evidenceRunIds`). *(PM P1-3, Competitive)* — **L**
- **RPT-P2-4 Automation confidence banding + gated/absent empty-state split.** *(PM P0-3, Growth P1-B)* — **S**
- **RPT-P2-5 Section heading visual hierarchy + "what this means" subtitles** (reuse `cvBand`). *(UX P1-2/P1-3)* — **S**
- **RPT-P2-6 Mobile TOC data-presence indicators; empty-cluster "run analysis" prompt; focus mode.** *(UX P2)* — **S/M**

### Required test gates accompanying any restructure (QA)
Fixtures: **null-artifact**, **single-run**, **zero-section (runCount≥2, empty lists)**, **wrong-typed artifact**, **agent-intelligence-absent**, **collapse-state-restored-but-runtime-single-run** (preference must never override data gate). Plus: scroll-spy single-observer test, print-includes-collapsed test, SSR===CSR aria-expanded test, within-group-reorder candidate-list test, ProcessStructure "no inefficiencies" single-run gate. The seeded sample is **insufficient** (it never hits the malformed shapes that caused the 2026-06-09 outage).

---

## 6. Recommended sequencing (reconciled with the architect's ordering constraint + QA gates)

1. **Wave 0 — Correctness + Measurement (quick wins, ship first):** RPT-P0-1/2/3 (correctness) + RPT-P0-4/5 (instrument) + RPT-P1-9. Small, self-contained, unblocks data + protects print/nav. Start a **14–30 day measurement soak** to baseline reach/dwell/nav/abandon before the big restructure.
2. **Wave 1 — Lead recomposition (RPT-P0-6) + copy pass (RPT-P1-6):** cheap, biggest immediate comprehension win, no contract change.
3. **Wave 2 — Data contract (RPT-P0-7 `deriveReportModel` + RPT-P0-8 registry):** architect sign-off + golden-fixture parity. Mandatory **before** any user-controlled hiding.
4. **Wave 3 — Information control (RPT-P1-1…4, P1-7):** collapse + exec mode + sticky summary + IA reorder + density, on the consolidated model, with the QA fixture suite.
5. **Wave 4 — Differentiator + persistence (RPT-P2-1/2/3) + variant migration (RPT-P1-8):** saved views, per-metric provenance, evidence drill-down.

**Anti-scope (do NOT chase):** LLM-generated executive summaries (undermines the determinism moat — competitive SKIP-8); role-based separate canonical views (defer until saved-views usage shows role segmentation — SKIP-7); OCPM/BPMN/what-if/ERP connectors.

---

## 7. CEO decisions requested

1. **Approve the redesign direction?** Lead-first + progressive disclosure + user-controlled information control, gated by data-contract consolidation, preceded by measurement.
2. **Measurement-first?** Recommend shipping Wave 0 (correctness + instrumentation) and running a 14–30 day soak before the large restructure, so every later decision reads against a baseline (PM Move 2 + analytics P0). Approve?
3. **Backlog promotion (governance):** per the audit-intake pattern, promote the P0 rows (RPT-P0-1…8) into the live `IMPROVEMENT_BACKLOG.md` and hold P1/P2 as a cold pool in this artifact? (Default if silent: P0-only promotion.)
4. **Green-light the persistence backend** (RPT-P2-1 `UserReportPreference`, a 1:1 clone of `UserDashboardPreference`) for saved report views?
5. **Wave cadence:** run these as CEO-directed Mode 2 quick-win iterations (like QW1–QW3), or batch as a Mode 5 directed sequence (≥6 items would trigger the MR-005 D-7 pre-check)?

---

## 8. What to preserve (do not regress)
- The pure-module determinism/honesty contract (`reportVerdict/Scorecard/Evidence/Meta/Divergence`): no Date.now/Math.random, value-driven UTC-pinned dates, observed-only, single-run-vs-multi-run gating, `null`→"—".
- `deriveLeadFigures` as the shared lead derivation (extend it; don't fork it).
- The print/PDF deliverable layer (all controls `report-no-print`; print always Full).
- `asArray()` defensive coercion (extend to the two `?? []` stragglers).
- The evidence-linked moat — it is the brand; the redesign should make it **louder**, never softer.

---

*Mode 3-adjacent diagnostic. No iteration counter incremented. No product code changed. Consolidated from 8 specialist analyses (full agent outputs retained in session). Build waves are proposed; execution is subsequent CEO-directed iterations.*
