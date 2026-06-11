# Process Variants Tab — Complete Review + Recommended UX (2026-06-10)

Multi-agent review (product-manager, ux-designer, frontend-engineer, system-architect, competitive-researcher, analytics, qa-engineer, process-mining specialist) of the Workflow view's **Process Variants** tab. Per-agent detail in this folder: `PM_FINDINGS.md`, `UX_FINDINGS.md`, `FRONTEND_FINDINGS.md`, `ARCHITECTURE_FINDINGS.md`, `COMPETITIVE_FINDINGS.md`, `ANALYTICS_FINDINGS.md`, `QA_FINDINGS.md`, `PROCESSMINING_FINDINGS.md`.

## TL;DR — Why the Variants tab does not analyze multiple runs

It is fed a **single recording**, never the aggregated multi-run data — confirmed by the data path:

1. **Wrong input (the primary bug).** `WorkflowPageShell.tsx:301` passes
   `intelligence={processOutput?.intelligence ?? processOutput?.processDefinition?.intelligence}`.
   `processOutput` is **one recording's** artifact (`{processRun, processDefinition, processMap, sop}`). The embedded `processDefinition` is the single-run definition — it has **no `.intelligence`** field. The real multi-run aggregate (`ProcessDefinition.intelligenceJson`, built by `clusterWorkflows` → `analyzePortfolio`, containing `variants.variants[]`) and the page's separately-fetched `intelligenceData` (`page.tsx:50`) are **never threaded into the tab**. → `intelligence` is effectively `undefined`.

2. **Adapter consequence.** `variantAdapter.buildVariantData` → `extractVariantsFromIntelligence(undefined)` returns `[]`; `model.variants` is hard-coded `[]` (`viewModel.ts:474`); so `hasVariantData = variants.length > 1` is `false` → the tab renders the **single-path fallback** ("no variants to compare yet"). It also hard-codes `isDivergencePoint: false` and `divergencePoints: []` (`variantAdapter.ts:68,99`) and never calls the new `analyzeDivergence`.

3. **Upstream data collapse (why even wiring it isn't enough).** `clusterWorkflows` groups runs **only by byte-identical path signature** (similarity clustering shipped in Phase 1 but is **flag-OFF**). So slightly-different runs of the same process are split into **separate ProcessDefinitions** (separate islands). Any one workflow's `intelligenceJson` therefore usually contains a **single variant** → nothing to compare even if it were wired in.

Net: three compounding causes — **(1) the tab is wired to single-run data, (2) the adapter is a stub that ignores the divergence engine, (3) clustering collapses real variance into separate islands.** All three must be addressed to make the tab actually show multi-run variance.

## Secondary defects the board found (all evidence-cited)
- `StepSequenceView` marks divergence by array **index**, not LCS alignment — one inserted step falsely flags everything after it as "diverges" (`WorkflowVariantsMap.tsx`).
- `WorkflowDecisionNode` has a single outgoing handle → cannot draw a branch from a decision.
- Report's "Where runs diverge" renders raw enum keys (`fill_and_submit`) instead of plain language.
- `variantDetector.ts:39` uses `new Date().toISOString()` — a determinism leak (must inject a clock before any reproducible merge).
- 7 QA P0s: nondeterministic `classifyPaths`/fastest/longest sorts (need stable tie-breaks), missing `evidenceRunIds` on `ViewVariantPath`, no `data-testid`s, smoke gate doesn't cover variants mode.
- The Path E `process-graph` model (decision points + conditions + variants + evidence, deterministic variant-hash) is fully built but **has no producer** — no engine assembles N runs into one `ProcessGraph`.

## Recommended UX — "one story map," cutting-edge but easy to read

Unanimous direction (UX + competitive + process-mining): **replace the card-list with a single frequency-weighted process map on the existing React Flow canvas**, designed so a non-expert reads it in seconds.

1. **One map, standard path = green spine.** Left→right. The most-common path is a bold green spine ("the usual way — 7 of 10 runs"). This is the LCS backbone we already compute.
2. **Branches peel off and rejoin.** Where runs deviate, a thin amber branch leaves the spine and **reconverges** downstream, labeled in plain language: **"After *Fill form*, 3 of 10 runs (30%) did *Validate* first → rejoin at *Submit*."** Shortcuts (skipped steps) shown as a dashed bypass. (Direct render of `analyzeDivergence` output we already ship in the Report.)
3. **Decision points, honest.** At a real split, a neutral **diamond** "Observed split — N of M runs," each exit edge labeled "N runs · X%." **Never** a fabricated condition/XOR rule (evidence-linkage invariant). If the branch correlates with an observed attribute (e.g., a URL), surface it on click as "Observed correlate," not "Condition."
4. **Complexity slider (spaghetti→clean).** Default shows paths covering ~80% of runs ("showing 3 of 5 variants · 80% of runs"); drag to reveal rare paths. Numeric, deterministic.
5. **Variant DNA strip (companion).** A frequency-sorted row-per-variant strip aligned on the backbone for at-a-glance "where do they differ"; click a row → highlights that path on the map.
6. **Everything clicks to evidence.** Any branch/decision/step → "View the N runs" (the deterministic moat made visible) via `evidenceRunIds`.
7. **Honest empty/single-run states.** 1 run → "First recording — run this again to compare." ≥2 identical runs → positive "Consistent — all N runs follow the same path" (not a fake "1 variant").
8. **Deterministic layout.** ELK layered (`elkjs@0.11.1` already installed, currently unused), layout-once + cache positions so filtering never reshuffles the map (Mennens 2019 stability); no force-directed/random layout. Client-only render (hydration-safe).

**Adopt / Avoid:** ADOPT frequency-weighted DFG + green-spine + reconverging branches + neutral decision diamonds + complexity slider + Variant DNA + ELK layout. AVOID inferred BPMN gateways, fabricated condition labels, Sankey-as-primary, and any nondeterministic layout.

## Fix plan (sequenced, reversible, validated like Phase 1/2)
- **V0 — Feed it real data (the unlock).** Thread the aggregated multi-run intelligence (ProcessDefinition `intelligenceJson` / clustered run set) into `WorkflowPageShell` → `WorkflowVariantsMap`. Without this, nothing else matters.
- **V1 — Wire the divergence engine into the adapter.** Replace the stub: `variantAdapter` consumes `analyzeDivergence` (branches, divergence points, `evidenceRunIds`); fix the LCS-vs-index bug; add stable tie-breaks; carry `evidenceRunIds` on `ViewVariantPath`.
- **V2 — Render the story map.** ELK layered layout; green spine + reconverging branches + neutral decision diamonds + plain-language labels; multi-handle decision node.
- **V3 — Controls + evidence + DNA strip.** Complexity slider, click-to-runs, Variant DNA companion, honest states; `data-testid`s + extend the hydration smoke gate to variants mode.
- **Dependency:** real variance only appears once **similarity clustering (Phase 1 flag) is ON** so near-identical runs group into one process — gate that on the key-churn cleanup the architect flagged.

Each step: pure-first where possible, flag-gated, typecheck + tests + hydration smoke gate before ship. Fix `variantDetector.ts:39` clock leak first (determinism).
