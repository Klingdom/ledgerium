# SOP vs World-Class SOP / PI Products — Competitive Benchmark
**Ledgerium AI** · 2026-06-15 · Analysis only (read-only agent output, persisted by coordinator)

## Capability matrix (condensed) — Ledgerium vs Scribe/Tango/SweetProcess/Process Street/Trainual/Whale/Document360/iorad/Guidde
**Ledgerium LEADS / UNIQUE (but mostly "computed, not rendered"):** evidence-linked to source events · deterministic
multi-run **observed** best path · confidence scoring · **SOP-alignment score** · **documentation-drift score** ·
immutable evidence per step. No competitor in the matrix has any of these.
**Table-stakes Ledgerium LACKS:** **per-step screenshots** (Scribe/Tango/Guidde/iorad auto-generate — the #1 visible
gap) · **PDF export** (Markdown only) · embed (Confluence/Notion) · approval workflows · version control · training/
quizzes · in-app guided walkthrough · working AI "Ask SOP".
**Computed-but-NOT-rendered:** actor/role (RACI) · step inputs/outputs · scope · SOP-alignment · documentation-drift.

## Market strategy shifts (2026)
- **Screenshots are the floor**, not a premium feature ("visuals processed ~60,000× faster than text"); every leading
  SOP tool auto-captures per step. Ledgerium captures the evidence (`sourceEventId`/`page_context`) but renders none.
- **"Living procedures" + conformance monitoring** is the upper-segment direction (Skan.ai, KYP.ai, Celonis Process
  Adherence, Apromore): connect the documented SOP to actual behavior, score the gap, alert on drift. **Ledgerium
  already computes this** (alignment + drift) — competitors approximate it on inferred ERP/desktop telemetry.
- **MARKET WINDOW:** Celonis sunset its Conformance Checker (Aug 2025; no new dev) — the most rigorous "documented vs
  actual" tool is leaving active development with no pure-play heir. Ledgerium's per-run, per-step, evidence-linked
  alignment/drift is structurally more granular than what Celonis provided.
- **Conversational SOP** ("Ask This Process") emerging (Process Street Cora, Document360 Eddy, Guru GPT) — Ledgerium's
  disabled input is directionally right but reads as broken; an evidence-grounded version (answers cite the
  `sourceEventId`) would be a category-first.
- **Compliance/audit:** Process Street "Cora" agent + ISO/SOC2/HIPAA/21-CFR-11; Ledgerium's immutable evidence is
  compliant-by-architecture — a selling point not yet surfaced. **Scribe** ($1.3B, 5M users, Optimize) is the direct
  collision — screenshot-based + aggregate analytics, not deterministic evidence; the framing battle matters.

## Highest-leverage moves (honest; mostly render-only)
1. **Surface the SOP-alignment + documentation-drift score** as a freshness/conformance signal ("Last validated
   against 12 runs on 2026-06-10 · drift detected in step 3"). Fully computed + tested + dark — **the moat made
   visible in one iteration; no new computation.** Gate at runCount ≥ 2.
2. **Render per-step EVIDENCE SNIPPET** from captured `page_context` ("Observed in Salesforce · Opportunities · Click
   'Save Opportunity'") — honest near-term before true screenshots (which need a new gated capture capability).
3. **Render computed-but-hidden fields** — actor/role (RACI), inputs/outputs, scope — pure UI, zero engine change.
4. **PDF/print export** (the Printer icon is imported but wired to nothing; only Markdown today) — compliance dealbreaker.
5. **Fix the honesty negatives** — disabled "Ask This Process" → coming-soon tile; single-run run-count disclosure;
   inferred outcomes shown with a "verified" check.
6. Do-mode (expand by default + "mark done"); system chip always-visible (incl mobile); SOP↔map↔report linkage;
   versioning/freshness header; SOP-only share link → embed/Confluence (later).

## Grade vs world-class SOP: C+ (→ A− with render-only work)
Biggest gap: per-step screenshots + non-rendered computed fields. Biggest defensible advantage: evidence-linked,
deterministic, per-run SOP **with a self-scoring alignment/drift signal** — no competitor has it; Celonis just exited
the conformance tool category. **The path from C+ to A− requires no new infrastructure — render what's already computed.**

## Sources
Scribe (+Optimize; $75M Series C, $1.3B); Tango; SweetProcess; Process Street (+Cora compliance agent); Trainual;
Whale; Document360 (Eddy AI; MCP/AI-docs trends); iorad; Guidde; Glitter; Celonis (Conformance Checker docs +
sunset; Process Adherence Manager); Apromore; Skan.ai (SOPs from process intelligence); KYP.ai (Forrester Strong
Performer Q3 2025); ISO 9001 §7.5.3; conformance-checking literature. Full URLs in board transcript.
