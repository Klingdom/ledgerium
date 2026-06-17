# Ask This Process — Consolidated Development Plan
**Ledgerium AI · 2026-06-17 · Synthesis of the 8-specialist board** (PM · architect · UX · security · analytics · competitive · growth · backend feasibility)

Per-discipline artifacts in this folder:
`PRD_…` · `ARCHITECTURE_…` (API_SPEC + DATA_MODEL + determinism boundary) · `UX_FLOWS_…` · `SECURITY_REVIEW_…` · `MEASUREMENT_PLAN_…` · `COMPETITIVE_…` · `GROWTH_…` · `IMPLEMENTATION_FEASIBILITY_…`. This document is the master plan; the artifacts are the detail of record.

## Verdict: FEASIBLE and genuinely category-first — on one narrow, defensible axis
"Ask This Process" turns today's non-interactive "Coming soon" tile (`SOPIntelligenceMode.tsx:511`) into evidence-grounded Q&A over a single recorded process where **every answer cites the exact recorded step/`sourceEventId` or honestly refuses**. No competitor (doc-RAG: Glean/Notion/Onyx; PI copilots: Celonis/UiPath/Signavio/Apromore; capture tools: Scribe/Tango) answers from **immutable, per-step, event-level OBSERVED browser behavior with deterministic, reproducible grounding and refuse-over-fabricate**. Doc-RAG cites authored docs; PI copilots cite *inferred* ERP logs; only Ledgerium cites the event that was actually observed. **It decays fast if framed as "AI chat on an SOP"** — the durable moat is the substrate + determinism boundary + citation legality, which require the upstream capture pipeline competitors don't have.

The deterministic half is nearly free (mirrors the tested `sopIntelligence.ts` pure-module pattern). **All cost and risk are in the net-new AI substrate** (provider adapter + BYOK envelope encryption + KMS) — which does not exist yet.

## The determinism boundary (the load-bearing rule — all agents converged)
1. **Grounding is deterministic.** Same process + same question ⇒ identical evidence bundle + identical authorized `CitationSet`, from a pure server-side module (no clock/random/network). A canonical order-stable `bundleHash` makes it reproducible/auditable.
2. **The LLM is isolated and one-way.** It's the ONLY non-deterministic component, reachable solely through `AIProviderAdapter`. The context-builder has ZERO provider-adapter import (no-import test + `madge --circular`). Model output is untrusted: the `citation-validator` set-intersects claimed citations against the closed authorized set and **silently drops hallucinated ids**.
3. **No back-flow.** LLM output never re-enters the deterministic pipeline, never mutates SOP/events/signals, persisted only in `AskTurn` with a hard `isAuthoritative=false` (no setter to true). Citations point FROM answer TO pre-existing observed evidence, never the reverse.

## Corrections folded in from the feasibility pass (supersede the earlier drafts)
- **Substrate:** the context-builder MUST run server-side over the **raw `process_output` SOP artifact** (`packages/process-engine/src/types.ts` — carries `SOPStep.ordinal` + `SOPInstruction.sourceEventId`). The client `SOPViewModel`/`SOPViewInstruction` **drops `sourceEventId`** — grounding from it would make event-level citations un-emittable. (Corrects PRD §4.2.)
- **No reusable AI infra:** there is no `AIProviderAdapter`, BYOK vault, envelope/KMS, or provider SDK in the repo. Iteration 3 effectively builds the platform vision's AI+1/AI+3 substrate — treat as greenfield, the cost center.
- **No BullMQ/Redis wired** despite the stated stack → **sync-first is confirmed** (not a compromise).
- **`hasFeature(…,'askThisProcess')` doesn't exist** → add a `FeatureKey` member (or reuse `intelligenceLayer` for the multi-run tier).
- **Pricing:** use the LIVE page ($49 Starter / $249 Team); the platform vision's "$29 Starter" is stale.

## Phased build sequence (small, reversible, each with a determinism + honesty + security gate)
**ADRs first (S):** ADR-1 determinism boundary + citation grammar; ADR-2 persistence/audit/retention.

**PHASE A — deterministic, NO-LLM (ship standalone first; unanimous recommendation).**
- It-1 **ask-context-builder** (pure, server-side over raw SOP artifact) — `GroundedEvidenceBundle` + closed `CitationSet` + `bundleHash`. *S–M / Low.*
- It-2 **citation-validator** (pure) — drops uncited/hallucinated ids; the strongest anti-fabrication defense. *S / Low.*
- **Phase-A deterministic answer templates** for count/shape/decision/conformance questions — instant, zero hallucination risk, no key. **Lights the panel honestly before the June-2026 PI-copilot wave**; this is the activation path + the competitive flag-plant.

**PHASE B — the LLM substrate (the cost center).**
- It-3 **AIProviderAdapter + BYOK envelope encryption + KMS** (Claude/Anthropic first, Tier-1 ZDR only, egress allowlist; key decrypted in-worker, NEVER in LLM context/client/logs). *L / High — greenfield.*
- It-4 **`/api/workflows/[id]/ask` route** — reuse the existing `{id, userId}` ownership predicate + Zod + `{data,error,meta}`; **sync + 25s timeout**; refuse-on-no-evidence skips the LLM. *M / Medium.*
- It-5 **UI panel** — replace the coming-soon tile; inline `[S4]` citation chips → scroll/highlight `#sop-step-{id}`; per-answer "◇ Grounded · N sources" header rendered ONLY when ≥1 valid citation; honest refusal as a calm, distinct TRUST state (never red); no `dangerouslySetInnerHTML` on model output. *M / Medium.*
- It-6 **persistence + append-only hash-chained audit** (`AskTurn` + citations; `isAuthoritative=false`; no raw sensitive content in long-retention). *M / Medium.*

**PHASE C — fast-follows / deferred.** It-7 SSE streaming (same contract; citations validated in the final frame) *M, optional*; ADR-3 + RAG/cohort grounding (only when context outgrows a single small process — must stay deterministic) *deferred*; claim↔snippet entailment guard (closes the "cited but mischaracterized" residual).

## Security gate (must-not-ship-without — the hard launch gate; 11 items)
Auth + ownership on every ask · tenant-scoped retrieval only (no cross-tenant/global/vector retrieval in v1) · structured prompting (captured content as quoted DATA, never instructions) · no tool-use/execution/function-calling in v1 · output sanitization (strict markdown allowlist, no raw HTML/images/arbitrary links, never `dangerouslySetInnerHTML`, CSP) · BYOK keys never in prompt/client/logs + envelope encryption · Tier-1 ZDR/no-train provider + egress allowlist (Tier-3 hard-blocked, no SSRF) · server-side egress redaction honoring sensitivity flags · explicit consent before first egress · per-user/tenant cost caps + rate limits · immutable per-ask audit (ids/provider/cost/question-hash; no raw answer) · no question/answer/context in app logs or analytics. **Top threats:** cross-tenant evidence leak (Critical), BYOK credential exposure (Critical), prompt injection via captured content (High), data exfil via injected instruction (High), denial-of-wallet (High).

## Measurement gate (honesty-first; events certify grounding, NOT correctness)
- **Grounded-answer rate** = grounded ÷ (grounded + ungrounded_blocked), target **≥95%**; the stricter invariant is **ungrounded-leak = 0** (no ungrounded assertion ever rendered).
- **Two-sided refusal** (human-labeled, κ≥0.7): correct-refusal **≥95%**, over-refusal **≤10%**; **under-refusal (answered a must-not-answer question = fabrication) gated to ZERO — P0 blocker.**
- Taxonomy is numeric/counts only (no question/answer content; PostHog no-content posture); outcome events emitted **server-side** at the determinism boundary.
- **Correctness needs human-label sampling** (the dangerous state = high satisfaction + rising citation-misattribution = persuasive-but-wrong). Beta-exit: grounded ≥95% / correct-refusal ≥95% / over-refusal ≤10% / citation integrity 100% / satisfaction-on-grounded ≥70% / zero honesty blockers.

## Positioning & packaging (honest)
**"The only process Q&A that answers from what was actually recorded — it cites the exact step and evidence behind every answer, and says 'I don't know' when the recording doesn't show it."** Refuse-over-fabricate = the trust feature (the read-only analog of "You approve what runs"). **Packaging:** Free = deterministic no-LLM cited answers + small managed-trial-key allowance (owns the aha, zero setup); Starter $49 = single-process LLM Q&A; Team $249 = multi-run signal Q&A (friction/conformance/timing/variants — honestly gated because those signals require the Team intelligence layer); **BYOK sustained/default** (key never reaches the model = trust signal) **+ managed trial key** to kill cold-start. Launch: Phase A (flag-plant) → closed beta 10–20 multi-run users (only after all security + honesty gates green) → hardening → GA with SOC 2 Type I underway. Real consented beta quotes only; zero implied outcomes until measured.

## Open CEO decisions (consolidated; defaults recommended)
1. **Ship Phase A (deterministic, no-LLM) standalone first?** — STRONG YES across all 8 agents (activation + competitive flag-plant + zero AI risk).
2. **BYOK-only vs managed-trial-key + BYOK-sustained?** — recommend managed trial key + BYOK sustained (activation ceiling vs cold-start).
3. **Plan gating** — Free taste / Starter single-process / Team multi-run, at $49/$249.
4. **Provider sequencing** — Anthropic/Claude first, Tier-1 ZDR only; accept that It-3 builds the BYOK vault greenfield (depends on committing to that substrate now vs a scoped standalone key path).
5. **Sync vs streaming for v1** — recommend sync + 25s timeout now, SSE as v1.1.
6. **Conversation memory** — single-turn v1 (max determinism) vs multi-turn follow-ups.
7. **Audit payload retention** (event-ids + bundleHash only vs raw provider payloads 90-day GDPR-erasable) · **citation granularity** (step-level v1 → event-level P2) · **general-knowledge mode** (recommend OFF — scoped-decline everything ungrounded at launch).

## Honesty / determinism / security invariants (firm, across the whole feature)
Observed-only; cite-or-don't-claim; refuse-over-fabricate; never invent steps/metrics/conditions; LLM output non-authoritative + one-way; key never in LLM context; content-as-data not instructions; no execution in v1; no new extension capture; deterministic reproducible grounding; honest empty/refusal states distinct from errors.
