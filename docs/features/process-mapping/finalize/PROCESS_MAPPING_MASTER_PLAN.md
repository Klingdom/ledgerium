# Process Mapping — FINAL Master Plan
**Ledgerium AI** · Date: 2026-06-12 · Status: FINAL FOR CEO APPROVAL (Define-phase; no product code)

Goal: a **highly polished, production-ready process-mapping environment that is as good as or better
than Visio**, plus two additional familiar views, with a thoroughly-reviewed plan that **does not
break anything**, and a **future** roadmap for user editing + template upload.

Source artifacts (this doc synthesizes + adjudicates them):
- `finalize/PM_FINAL_PLAN.md` · `finalize/ARCH_FINAL_PLAN.md` · `finalize/UX_FINAL_PLAN.md`
- `finalize/COMPETITIVE_BENCHMARK.md` · `finalize/QA_REGRESSION_PLAN.md`
- `visio/{VISIO_VISUAL_SPEC,VISIO_LAYOUT_ROUTING_PLAN,VISIO_ARCHITECTURE_REVIEW}.md`

---

## 1. What "better than Visio" means (success criteria)
- **Auto-generated from evidence** (Visio is hand-drawn): every view computed deterministically from
  captured runs.
- **Comprehension:** a non-technical user identifies the longest path, a branch, and a bottleneck in ≤60s.
- **Print/export:** clean A4-landscape print + 2× PNG export for every mode, white background.
- **Determinism:** byte-identical layout for fixed input (CI-tested) → reproducible + hydration-safe.
- **Honesty:** zero fabricated conditions/values; observed-only labels everywhere (engine-enforced).
- **Performance:** first paint ≤400ms; ELK settle ≤1s for ≤50 nodes.
- **Coverage:** six named modes from one data contract.

## 2. Finalized architecture (one renderer, all modes)
A single unified pipeline behind the existing `NormalizedViewModel` seam (additive-then-switch-over,
so nothing breaks):
1. **Honest pure graph model** — add `decisionProvenance` (`observed | observed-validation | inferred`)
   and `isMultiRun`; the variant builder's honesty discipline is lifted to the shared layer. (The
   title-regex fabrication is **already removed** — commit `e11b82b`; the chokepoint prevents reintro.)
2. **ShapeResolver** — `ViewNodeType × provenance → Visio shape` truth table, **fixed sizes** (determinism);
   `inferred` decisions render as **process boxes**, not diamonds.
3. **LayoutEngine** — lift `variantFlowModel.ts`'s proven deterministic Plan-B layered arithmetic to
   **all** modes as the synchronous fallback; **ELK `layered` + `edgeRouting=ORTHOGONAL`** layered on top,
   **client-only** with the sync fallback for SSR/first paint (this is what keeps it hydration-safe).
4. **OrthogonalEdgeRouter** — consume ELK bend points; deterministic Manhattan elbows as fallback;
   forward-only edges preserved.
5. **VisioCanvas** — one canvas driven by a `LayoutProfile` per mode (lane key + direction); the two new
   views slot in as `LayoutProfile` + adapter, **no new canvas**.

ELK config is frozen + deterministic (no randomized pass; explicit node sizes; no `INTERACTIVE`).

## 3. The two new views — RECOMMENDATION + the open decision
The specialists split. I recommend the **evidence + enterprise-standard pair**, which the competitive
benchmark backs hardest and which both pass the computability + honesty filters:

### ✅ Recommended
- **A. Cycle-Time Distribution Histogram** — run-duration histogram + p50/p85/p95 + mean/median +
  outliers. Fully computable from existing `cycle_time_*_ms` + per-run durations. **Table-stakes** in
  every process-mining tool and the single most recognizable gap vs them; a distinct statistical lens.
- **B. BPMN 2.0 view + export** — observed graph in BPMN notation; XOR gateways at observed divergence,
  annotated with **observed frequencies only (never conditions)**; BPMN 2.0 XML export. Universal
  enterprise standard, direct **Scribe Optimize parity**, integration motion (Camunda/Bizagi/Signavio).

### Runners-up (PM's picks — strong, carried as Phase-2 candidates)
- **Process Timeline** (per-step duration bars + bottleneck markers) — overlaps the histogram's time
  lens; excellent Phase-2 add.
- **SIPOC summary** — high Lean familiarity but Supplier/Customer aren't captured (would be labeled
  "Systems entry/exit" to stay honest) — weaker data fit.

> **DECISION D-1 (CEO):** confirm the two views. Default if silent: **Histogram + BPMN** (per competitive
> evidence). The honesty objection to BPMN is resolved by frequency-only gateway labels — the same
> discipline `variantFlowModel` already uses.

## 4. The polished production environment (UX)
Six-mode switcher (Flow · Swimlane · Variants · Systems · **Histogram** · **BPMN**); always-visible
zoom/pan/fit/reset overlay; always-on collapsible legend; title bar; minimap toggle; **Export (PNG) /
Print (A4 landscape, white bg)**; full loading/error/empty/unprocessed/forbidden states per mode;
large-graph readability (frequency focus). **Honesty in UX:** a dismissible "single trace of N runs"
provenance banner when `isMultiRun === false`; run-count chip turns amber at 1; observed-validation
decisions get a "1 run" pill; frequency legend only shown when multi-run.

## 5. Nothing-breaks gate (QA)
**Preserved invariants:** layout determinism, hydration/flash-safety, forward-only edges, observed-only
honesty, `exactOptionalPropertyTypes`, smoke 8/8, `variantFlowModel.test.ts` (39 assertions),
`contentEnricher.test.ts` honesty tests.

**New tests required before merge:**
- ELK determinism (run-to-run byte equality of positions **and** bend points; orthogonal-segment +
  spine-collinearity; perf budget <500ms @ 50 nodes/60 edges).
- **Canvas hydration smoke** for `/workflows/[id]` in each mode (the existing smoke gate doesn't
  pattern-match hydration on the canvas) — **merge blocker**.
- **`elkjs` must NOT appear in the SSR bundle** (build-grep) — **merge blocker** (this is the
  production hydration-crash class).
- ShapeResolver totality (`inferred → process`, never diamond); per-new-view computability + honesty.

**Validation gate (every P0/P1/P2 merge):** `pnpm typecheck` · `pnpm test` (≥2839) ·
web-app + process-engine + intelligence-engine tests · production `next build` · smoke 8/8 ·
variants e2e + screenshots. No regression in counts.

## 6. Sequencing (Mode 1 series — NOT a Mode-5 N=8 batch)
- **P0 (correctness + safe core):** honesty chokepoint (`decisionProvenance` + ShapeResolver routing) ·
  lift deterministic Plan-B layered layout + orthogonal Manhattan routing to all modes (sync, no ELK
  yet) · canvas hydration smoke + forward-edge tests for flow/swimlane/systems.
- **P1 (Visio parity + new views):** ELK layered + orthogonal routing client-only (with fallback) ·
  **Cycle-Time Histogram** · **BPMN view + export** · finalized shape/connector/swimlane tokens.
- **P2 (polish):** PNG export + print CSS · empty/loading/perf states · frequency-threshold slider ·
  Process Timeline (Phase-2 view).

Each step is independently shippable and gated by its named test. Flow direction: **RIGHT for all modes**
(Visio cross-functional/BPMN read horizontally; consistency) — **DECISION D-2 (CEO)**, default RIGHT.
observed-validation single-run decisions: keep diamond with **dashed** distinct marking + observed label
— **DECISION D-3 (CEO)**, default keep-dashed.

## 7. FUTURE roadmap (separate phase — NOT now): editable maps/SOPs + template upload
User stories: edit/annotate a generated map; author/edit an SOP; upload a company template/shape library.
**Hard problems:** determinism vs user edits; provenance/honesty when a user overrides observed data;
template format + shape reconciliation; conflict resolution when the underlying runs update.

**Hooks to leave in P0–P2 so this never requires a rewrite and cannot corrupt the evidence invariant:**
- An **overrides/annotation layer kept SEPARATE from the observed graph** (observed layout never mutated).
- An **`origin: observed | authored | template` provenance flag** so imported/edited content **cannot
  masquerade as observed evidence** (UI marks authored content distinctly).
- `ShapeResolver` built as a **registry** with a reserved `shapeOverrides` slot (template shape libraries).
- `MapTitleBar` with a reserved `hasUserEdits` prop; "Edit mode" + "Templates" entry points stubbed/disabled.

## 8. Open CEO decisions
- **D-1** Two new views — recommend **Histogram + BPMN** (default if silent); PM preferred Timeline + SIPOC.
- **D-2** Flow direction — recommend **RIGHT** for all modes (default).
- **D-3** observed-validation single-run diamonds — recommend **keep, dashed** (default).
- **D-4** BPMN export format scope — BPMN 2.0 XML now, or view-only first?
- **D-5** Run as a **Mode 1 iteration series** (recommended) vs a Mode-5 batch (would trigger the
  mandatory N≥6 pre-check).

**On approval, P0 begins** (honesty chokepoint + deterministic layered/orthogonal layout lifted to all
modes + the canvas hydration smoke) — the lowest-risk, highest-correctness step, fully gated.
