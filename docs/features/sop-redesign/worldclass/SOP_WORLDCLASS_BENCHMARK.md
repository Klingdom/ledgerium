# SOP View — World-Class Benchmark (Consolidated)
**Ledgerium AI** · 2026-06-15 · Synthesis of the 6-specialist board (competitive · SOP-authoring expert · PM strategy ·
UX · analytics · docs)

## Verdict: **C+ today → A− with render-only work**. The moat is built and tested but DARK.
The single most important finding, unanimous across all six: **Ledgerium's SOP deficits are overwhelmingly
render/wire gaps, not capability gaps.** The `SOP`/`SOPStep`/`SOPInstruction` model already carries scope, per-step
actor, inputs, outputs, expected outcome, warnings, decision points, and per-step evidence (`sourceEventId` →
`page_context`) — the view renders ~60% of it. And the crown jewel — **`sopAlignmentEngine.analyzeSopAlignment` +
`standardizationScorer.computeDocumentationDriftScore` (alignment %, level, undocumented/unused steps, drift
indicators, a 0–100 drift score with pre-formatted findings) — is fully implemented, tested, computed, and stored in
`ProcessDefinition.intelligenceJson`, yet completely unrendered in the UI.** This is the exact "living SOP /
conformance monitoring" capability Celonis/Apromore/Skan/KYP charge enterprise prices for (on inferred ERP/desktop
telemetry) — and Celonis just **sunset its Conformance Checker (Aug 2025)**, opening a market window.

## Where Ledgerium genuinely leads (no competitor in the matrix has these)
Evidence-linked to source events · deterministic multi-run **observed** best path (not asserted) · gated by
`validateRenderedSOP` (rejects generic/evidenceless SOPs) · confidence scoring · **SOP-alignment + documentation-drift
self-scoring** · immutable evidence per step. The architecture has built the hardest part; it's invisible to a buyer
evaluating the SOP today.

## The biggest gaps (board consensus)
1. **Per-step SCREENSHOTS — the #1 visible table-stakes gap** vs Scribe/Tango/Guidde/iorad (all auto-generate).
   Honest near-term: render the per-step **EVIDENCE SNIPPET** from already-captured `page_context` ("Observed in
   Salesforce · Opportunities · Click 'Save Opportunity'") — a render path through `sopViewModel`, zero new capture.
   TRUE screenshots require `chrome.tabs.captureVisibleTab()` — a NEW extension capability gated by the Extension
   Reliability Invariant + CEO approval + the real-extension harness. Do the snippet now, screenshots later.
2. **Render the computed-but-hidden fields** — scope, per-step actor/role (RACI), inputs/outputs — pure UI.
3. **Wire the ALIGNMENT + DRIFT engines into the SOP** as a freshness/conformance signal ("92% aligned with the last
   20 runs · step 4 drifted on 2026-06-10"). The highest-leverage move — fully-built tested code, one iteration, no
   new computation. **Gate at runCount ≥ 2** (the engine returns score 0 / level critical for N=0 — must NOT render
   as a quality condemnation on a single-run SOP; it's a data-insufficiency signal).
4. **PDF/print export** — the `Printer` icon is imported in `SOPPageShell` but **wired to nothing**; export is
   Markdown-only. `window.print()` + `@media print` (force steps open, hide chrome, evidence cover). Compliance dealbreaker.
5. **Do-mode** — steps are collapsed by default (friction: click before reading); expand by default in execution mode;
   "mark as done" checkboxes; **system chip is hidden on mobile** (`hidden md:block`) — exactly when it matters most.
6. **SOP ↔ map ↔ report linkage** — step IDs/ordinals already match across surfaces; add cross-nav ("view step N in
   the process map" / "view backing evidence"). Rename modes ("Visual Process"→"Flow View", "Intelligence"→"Analysis").
7. **Versioning/freshness** — the version shows the engine schema ("2.0") not a revision; `createdAt` unrendered.
   Show "v1.0 · Generated [date] · Based on N recordings · 84% aligned".

## Honesty fixes (the SOP is the surface that proves honesty — these undercut it)
- The disabled **"Ask This Process"** input reads as broken → replace with an honest coming-soon tile (no interactive
  elements). (Directionally right per the market; an evidence-grounded version that cites `sourceEventId` would be a
  category-first — P2.)
- **Single-run SOPs** are presented as standards with no run-count disclosure → add "Based on 1 recording — review
  before distributing" + the amber N=1 treatment.
- **"Best path"** = most-frequent, NOT best-quality → label as observed-frequency. Inferred outcomes currently show a
  green "verified" check → distinguish observed vs inferred.
- Alignment/drift only when N ≥ 2; never fabricate compliance/training metrics we can't measure.

## Strategy / positioning
Own **"the SOP that writes AND maintains itself from how work is actually done."** "Writes itself" is fully true
today (every field derived from observed events). **"Maintains itself" becomes true the moment the alignment/drift
wiring ships** — and the claim is then backed by real computation, not marketing. Distinct from Scribe/Tango (static
screenshot guides, no analytics) and SweetProcess/Trainual (manual authoring). The compliance/audit angle (immutable
evidence, compliant-by-architecture) is a credible hook vs the Process-Street/Cora enforcement direction.

## Roadmap (P0 → P2 — honest; the path to A− needs NO new infrastructure)
- **P0 (render-only, high impact):** wire the **alignment/drift freshness signal** (gated N≥2) · render per-step
  **evidence snippet** (page/app/action) · render **roles/scope/inputs** · **PDF/print** (wire the Printer + print CSS) ·
  the **honesty fixes** (coming-soon tile, single-run disclosure, observed-vs-inferred).
- **P1:** do-mode (expand-by-default + mark-done) · system chip always-visible · SOP↔map↔report cross-nav ·
  versioning/freshness header · SOP-only share link · usage instrumentation (sop_viewed / step_expanded / step_checked
  — checklist completion is currently local React state, zero signal reaches analytics).
- **P2:** TRUE per-step screenshots (new gated capture) · evidence-grounded "Ask This Process" LLM (cites source
  events) · editing/override + templates · approval/versioning workflow · embed/Confluence/Notion publish · training paths.

## Open CEO decisions
- DD-1 Highest-leverage first batch — recommend **wire alignment/drift + render evidence-snippet + roles/scope/inputs +
  PDF + honesty fixes** (one render-only batch that lifts C+ → ~B+/A−).
- DD-2 True screenshots: approve the gated `captureVisibleTab()` extension capability (Extension Reliability Invariant)?
- DD-3 Editing strategy: in-platform edit vs export-and-edit.
- DD-4 Compliance segment + approval/versioning as a 2026 target?
- DD-5 First export beyond Markdown (PDF rec) + first publish target (Confluence/Notion).
