# Workflow Detail Views — Simplification Review 001

**Date:** 2026-05-29
**Type:** Mode 3-adjacent multi-agent strategic review (NON-counting; zero product-code changes)
**Directive (CEO, verbatim):** *"Review the different main views on the workflows page — Workflow, SOP, Report, Insights, Interpretation, Intelligence, AI Agents, and Evidence — and propose a radically more simplified and reduced number of views without losing any functionality. It should be a natural progression of viewing process map and SOP variants available and then all the metrics, insights, automations, and recommendations."*

**Agents engaged (5, parallel):** Explore (evidence map) · competitive-researcher · product-manager · ux-designer · system-architect · frontend-engineer.

---

## 1. Headline finding

The current page has **8 parallel tabs**. The evidence shows this is both **redundant** and **without competitive precedent**:

- **Redundancy (from code audit):**
  - `Report` (1170 LOC) is *already* a single-scroll aggregator that re-renders Insights + Interpretation + Bottlenecks + Automation + Scores + Phases + Rework.
  - `Insights` is a strict **subset** of `Interpretation` (same `workflow_interpretation` data; Interpretation is the superset).
  - `Evidence` is a raw-JSON mirror of data the `Workflow` view already renders.
  - `Intelligence` and `AI Agents` bottleneck/automation data is *already echoed* inside `Report`.
- **No precedent (from competitive research):** Across 13 leading tools (Scribe, Tango, Celonis, UiPath, MS Power Automate, ABBYY, Signavio, Apromore…), the **maximum** number of surfaces in a single-process view is **4–5**, and that one tool is the documented outlier. Every other tool uses **single-scroll progressive disclosure**. **8 tabs is ~2× the ceiling and matches no competitor.**

The universal industry pattern is a single narrative: **overview → flow/map → steps (with evidence INLINE) → metrics/variants → recommendations LAST.** This is *exactly* the CEO's stated progression.

---

## 2. Recommendation — collapse 8 views into **2**

A 2-view structure maps 1:1 onto the CEO's two-stage narrative ("view the process map + SOP variants, **then** all the metrics, insights, automations, recommendations"):

### View 1 — **Process** ("what is this workflow?")
A focused, mostly-visual view. Default landing.
- **Process Map** (top, full real-estate): the existing `WorkflowPageShell` canvas with its mode switcher — **Flow / Swimlane / Variants / Systems** — kept verbatim. **Variants are a mode here (a filter on the map), not a tab.**
- **Procedure / SOP** (below): the existing `SOPPageShell` with a segmented **Operator / Enterprise / Decision-based** template switcher. Per-step **evidence renders inline** in the step card (screenshots/source-event counts), and friction indicators move inline onto the step they belong to.
- **Raw JSON** is an **export action** in the header (download/copy) — the `Evidence` tab is retired, not its function.

### View 2 — **Analysis** ("how does it perform & what should change?")
A single progressive scroll, backboned by the existing `WorkflowReportPage` (which is already this exact pattern). Sticky right-rail table-of-contents. Top-to-bottom order:
1. **Overview** — metrics band (duration, steps, phases, confidence, systems, status)
2. **Process Health** — complexity / friction / linearity / manual-intensity scores
3. **Phases** — phase timeline
4. **Insights** — category-filtered insight feed (absorbs the old Insights + Interpretation tabs)
5. **Friction & Decisions**
6. **Rework patterns**
7. **Step breakdown**
8. **Bottlenecks** (multi-run)
9. **Variance & Variants detail** (multi-run)
10. **Automation opportunities** — *recommendations begin here, terminal*
11. **AI Agents** — composed agents, skills, integration risks, implementation roadmap
12. **Raw evidence (JSON)** — collapsed `<details>` disclosure for power users

> **Recommendations are always last** — consistent with every competitor and with Ledgerium's "evidence-first, recommendation-last" positioning.

**Net: 8 → 2 views. Zero functionality removed.**

### The one open decision: 2 views vs 3
The `ux-designer` argued for a **3rd view** ("Recommendations") so automation/agents get a first-class destination for sales demos, and because the map wants full-viewport (which a single mega-scroll would crush — addressed here by keeping the map in View 1).
- **Coordinator recommendation: 2 views.** The CEO explicitly bundled "metrics, insights, automations, and recommendations" as one downstream stage, and "recommendations terminal" is satisfied by their position at the bottom of Analysis.
- **Choose 3 views instead** only if you want a dedicated demo surface to jump straight to automation ROI. Trivial to split later — it's the same terminal sections promoted to their own tab.

---

## 3. Functionality-preservation map (proof nothing is lost)

| Current capability | Current tab | New home |
|---|---|---|
| Process map — Swimlane / BPMN / SIPOC templates | Workflow | View 1 → Map (mode switcher, unchanged) |
| Step list | Workflow | View 1 → Map / inspector |
| SOP — Operator / Enterprise / Decision templates | SOP | View 1 → Procedure (template switcher) |
| Per-step evidence (screenshots, source events) | Evidence / Workflow inspector | View 1 → **inline in each step card** |
| Raw JSON inspector + export | Evidence | View 1 header **export action** + View 2 bottom disclosure |
| Hero metrics | Report | View 2 → Overview |
| Complexity/friction/linearity/manual scores | Report / Interpretation | View 2 → Process Health |
| Phase timeline | Report / Interpretation | View 2 → Phases |
| Insight feed (categories, severity) | Insights / Report | View 2 → Insights (single source: `workflow_insights`) |
| Decisions / friction / rework | Interpretation / Report | View 2 → Friction & Decisions / Rework |
| Bottlenecks, step-duration stats | Intelligence / Report | View 2 → Bottlenecks |
| Variance + variant comparison (multi-run) | Intelligence | View 2 → Variance & Variants + View 1 Variants map mode |
| Automation opportunities | AI Agents / Report | View 2 → Automation |
| Composed agents, skills, integration risk, roadmap | AI Agents | View 2 → AI Agents |
| Lazy `/analyze` + `/agent-intelligence` calls | Intelligence / AI Agents | View 2 → auto-trigger on scroll-reveal (button fallback on error) |
| Multi-run gating | Intelligence | Preserved as inline empty-state ("record more runs to unlock") |

**Retired as tabs (content fully absorbed):** Insights, Interpretation, Report (becomes View 2 itself), Intelligence, AI Agents, Evidence.
**Kept whole, untouched internally:** `WorkflowPageShell`, `SOPPageShell` (and all their template switchers).

---

## 4. Why this is *better*, not just smaller

- **Traceability becomes visible.** Event → step → evidence → insight → recommendation is one unbroken vertical narrative. No competitor offers this in a single scroll; it makes Ledgerium's "deterministic, evidence-linked" moat tangible.
- **No more "which view is authoritative?"** Today the same number can render in 4 places via 4 code paths (a traceability risk — they can drift). Consolidation declares one render-owner per block.
- **Template selection persists** across the visit (shells stay mounted) — a free UX win over the current tab-reset behavior.

---

## 5. Migration plan — small, reversible, safe (deploy on the working base)

Architect's sequencing (each step independently shippable; additive-first; destructive step soak-gated). **Do NOT big-bang.**

- **Step 0 — Instrument & confirm.** Add a usage counter to all 8 tabs (learn what's actually used); grep-confirm the dead `ReportTab` import; confirm `interpretation.insights` vs `workflow_insights` overlap. *(No UX change.)*
- **Step 1 — Auto-load lazy analysis** behind the current Report (IntersectionObserver fires `/analyze` + `/agent-intelligence`; button stays as error fallback). *Validates the lazy pattern in isolation.*
- **Step 2–4 — Fold-in (additive, zero removals):** absorb Intelligence-detail, AI-Agents-detail, and Insights `timeBreakdown` into Report sections; parity-check that the old tab and the new section render identically **before** retiring anything.
- **Step 5 — Introduce the new 2-view nav + `?view=` URL state** alongside the old tabs (behind a flag / internal first). Reversible by flag.
- **Step 6 — Demote Evidence** to a JSON export action + bottom disclosure.
- **Step 7 — Retire the duplicate tabs** (Insights/Interpretation/Intelligence/AI-Agents); redirect old in-app links to `?view=analysis#<anchor>`.
- **Step 8 — Delete dead components** (soak-gated on Step 0 usage data): `InsightsPanel`, `InterpretationTab`, `IntelligenceTab`, `AgentIntelligenceTab`, dead `ReportTab`.

**Effort:** ~3–4 careful iterations; only **~80–120 LOC net-new** — the rest is recomposition of existing, working components. Recommended **first shippable slice:** collapse the 5 analytical tabs (Insights/Interpretation/Intelligence/AI-Agents/Evidence) into Report → instantly **5 tabs**, lowest risk, fully reversible.

---

## 6. Risks & required wiring (flag before build)

1. **Activation metrics are tab-keyed.** `completeStep('view_sop')`, `completeStep('view_process_map')`, `first_sop`/`first_map` activation, and the 30-second SOP dwell survey (`SOPUsefulnessSurvey`) all fire on `activeTab` changes. These MUST be re-wired to the new panes/sections (IntersectionObserver) or they silently break. *(Analytics owner sign-off.)*
2. **Docs anchors.** Each tab links to `/docs#<anchor>`; 5 anchors lose their tab. Keep the doc sections alive and redirect retired anchors so external links don't 404. *(Docs owner.)*
3. **Deep-link risk is ~zero today** — tab state is local React state, no `?tab=` URLs exist. Adding `?view=` is a net improvement (panes become deep-linkable).
4. **React Flow always-mounted cost.** In a combined layout the map canvas mounts even when scrolled away. Keeping the map in its **own View 1** (not one giant scroll) largely sidesteps this; if ever combined, use intersection-gated mount (~20 LOC).
5. **Hydration:** the whole page is already `'use client'` with a client-side fetch — no RSC boundary to cross. The app's prior hydration incidents were extension-side, not here. Low risk, but keep the big client component out of a Server-Component shell.
6. **Single render-owner per block** must be enforced during fold-in (Step 2–4 parity checks) to prevent duplicate/divergent numbers.

---

## 7. CEO decisions

1. **2 views (recommended) vs 3 views** (split Recommendations into its own tab for demos)? *Default: 2.*
2. **Lazy analysis:** auto-trigger on scroll-reveal (recommended; cheap, deterministic) vs keep explicit "Run analysis" button? *Default: auto-trigger with button fallback.*
3. **View naming:** "Process" / "Analysis" (recommended) — alternatives: "Process" / "Insights", or "Map & SOP" / "Intelligence".
4. **Build timing:** defer to next week's improvement cycle (consistent with "I will not change anything today"); first slice = collapse the 5 analytical tabs.

---

*This is a Define/Design artifact only. No product code was changed. Source: code audit of `apps/web-app/src/app/(app)/workflows/[id]/page.tsx` + 9 view components + 2 lazy routes, cross-referenced with a 13-tool competitive benchmark.*
