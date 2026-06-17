# PRD — "Ask This Process" (Evidence-Grounded Q&A on the SOP Analysis View)

**Ledgerium AI** · 2026-06-16 · Product Manager (Define phase)
**Status:** DRAFT — for CEO review. Analysis/planning only; no product code in this artifact.
**Feature surface:** `apps/web-app/src/components/sop-view/SOPIntelligenceMode.tsx` ("Ask This Process" panel, currently a non-interactive "Coming soon" tile at ~line 511)
**Category position:** the category-first moat — *answers grounded in observed evidence, with citations to the source events behind every step.*
**Roadmap anchor:** `docs/features/sop-redesign/worldclass/SOP_WORLDCLASS_BENCHMARK.md` §Roadmap **P2** ("evidence-grounded 'Ask This Process' LLM that cites source events") + §Honesty fixes.
**Platform alignment:** `docs/meta/AI_INTEGRATION_PLATFORM_VISION_REVIEW_001.md` (BYOK; MVP = recommendations + dry-run only; determinism boundary; security vectors V1/V5; trust tiers; audit trail).

---

## 1. Problem Statement

The SOP Analysis view already carries the hardest-won asset Ledgerium owns: a deterministic, evidence-linked process model where **every step traces to the observed events that produced it** (`SOPInstruction.sourceEventId` → `page_context`), enriched by a fully-built intelligence engine (alignment, drift, variants, bottlenecks, timestudy, automation opportunity — all with `evidenceRunIds` provenance). Yet a user evaluating a recorded process cannot *ask it anything*. The "Ask This Process" panel is a **non-interactive "Coming soon" tile** that promises "answers grounded in the observed evidence behind every step" and shows three example questions but offers no interaction.

The consequences:

1. **The moat is dark.** A buyer evaluating Ledgerium against Scribe / Tango / Celonis sees a static document, not the live, evidence-citing intelligence that differentiates us. The benchmark board's verdict — "the moat is built and tested but DARK" — applies acutely here.
2. **The intelligence is locked behind reading.** To answer "why is this step here?" or "where do users get stuck?", a user must manually read steps, cross-reference the Analysis sections, and the alignment/variant signals — work the system can already do deterministically.
3. **Coming-soon promises erode trust** the longer they sit unfulfilled — and a fabricating chatbot bolted on naively would erode it far worse. The honesty contract is the whole point: this surface is *the surface that proves Ledgerium tells the truth.*

**The opportunity:** ship a conversational interface where a user asks natural-language questions about a single recorded process and gets answers that are **grounded in observed evidence, cite their sources (sourceEventId / step ordinal / runs), and refuse to fabricate.** This is category-first: no competitor in the 17-platform landscape grounds AI answers in an immutable, event-level evidence chain (M1 in the platform vision).

---

## 2. Who It's For (Personas) + Jobs-To-Be-Done

The SOP personas (carried from the SOP redesign + platform-vision Layer-1 ICP).

| Persona | Who | Primary JTBD this feature serves |
|---|---|---|
| **P1 — Lean Six Sigma belt (Green/Black)** | Process improvement practitioner running DMAIC / Kaizen | "When I analyze a recorded process, help me **locate waste, variation, and bottlenecks with evidence I can defend** in a review — so I don't have to manually trawl every step." |
| **P2 — Process Owner / Ops Manager** | Owns a workflow, accountable for it running well | "When I open a process, let me **ask plain-language questions and get trustworthy answers about what's happening and what could improve** — without learning the analytics UI." |
| **P3 — Product / UX team** | Designs the tool or the experience the process runs on | "When I study a recorded flow, help me **see where users hesitate, retry, or get stuck, and on which screens** — grounded in real captured behavior, not my assumptions." |
| **P4 — Process-improvement reviewer / auditor (secondary)** | Signs off on documented processes | "When I review an SOP, let me **interrogate its claims and confirm each answer is backed by observed runs** before I trust or distribute it." |

**Shared JTBD across personas:** *"Turn the process I'm looking at into something I can have a conversation with — and trust the answers because each one shows me the evidence and admits when it doesn't know."*

**Explicitly NOT served in v1:** anyone wanting cross-process / portfolio questions, ROI/financial projections, compliance attestations, or AI that executes changes. See §6 Non-Goals.

---

## 3. Goals & Non-Goals (Summary)

**Goals (v1)**
- Conversational, read-only Q&A scoped to **one recorded process** (the SOP currently open).
- Every answer **grounded in observed evidence** and **cites its sources** (step ordinal(s), `sourceEventId`(s), and/or run counts).
- The system **refuses or scopes down honestly** ("not enough evidence to answer that") rather than fabricating.
- Make the moat **visible and demonstrable** — the answer card visibly shows the evidence it used.

**Non-Goals (v1)** — see §6 for the full list with rationale.
- No execution / no actions taken (recommendation/answer surface only — aligns with platform-vision dry-run-only MVP and pushes even further: this surface is *read-only*).
- No cross-process or portfolio-level questions.
- No fabricated facts, metrics, conditions, or steps — ever.
- No answers to question classes the evidence cannot support (ROI, compliance, headcount, legal).
- No persistent chat memory / multi-turn reasoning chains beyond a lightweight follow-up in v1 (deferred — see §9).

---

## 4. MVP Boundary (Tight)

> **MVP scope line:** *Read-only natural-language Q&A grounded in a single recorded process's observed evidence, where every answer cites its sources (step ordinal / sourceEventId / run counts) or honestly declines — no execution, no cross-process queries, no fabricated facts.*

### 4.1 In scope (v1)

1. **Interactive panel** replacing the coming-soon tile: an input, a send affordance, the 3 anchor example questions as one-tap prompts, and an answer area.
2. **Single-process grounding context** assembled deterministically from already-computed, render-safe data: the `SOPViewModel` (steps, instructions, evidence snippets, decisions, insights, recommendations, metadata, workflow DNA, alignment pill) + the backing `PortfolioIntelligence` signals (variance, variants, bottlenecks, timestudy, alignment/drift) with their `evidenceRunIds`.
3. **The 3 anchor question types + 3–5 additional honest question types** the evidence can actually answer (§7).
4. **Honesty contract enforced as a hard gate** (§8): citation-required, refuse-on-insufficient-evidence, observed-only, must-not-answer classes (§6.2).
5. **Answer card with visible citations**: each answer renders the steps/evidence/runs it used, cross-navigable to those steps (the SOP↔step linkage already exists).
6. **BYOK provider connection** consistent with the platform AI vision (credentials never in LLM-visible context; worker-held; Tier-1/Tier-2 providers only).
7. **Instrumentation** for adoption, grounded-answer rate, refusal-honesty, satisfaction (§11).

### 4.2 Deferred (NOT in v1) — and why

| Deferred item | Why deferred |
|---|---|
| Cross-process / "compare to my other processes" | Requires portfolio-grounding + cohort retrieval; v1 scope is one process. Phase 2. |
| Any execution / "fix this for me" / "automate step 4" | Read-only by design; execution is platform-vision Phase 2 (dry-run-first, audit trail, R0–R4 classification). This surface never executes. |
| Per-step screenshots in answers | TRUE screenshots need the gated `chrome.tabs.captureVisibleTab()` capability (Extension Reliability Invariant + CEO approval). v1 cites the evidence *snippet* (app·page·action) we already have. |
| ROI / labor-cost / savings-in-dollars answers | No labor-cost config exists; `ai_savings_estimate_ms` is Tier C. Must-not-answer in v1 (§6.2). |
| Compliance / "is this SOX/HIPAA compliant?" answers | We observe behavior; we do not certify against regulation. Must-not-answer (§6.2). |
| Persistent multi-turn memory / agentic reasoning chains | v1 is single-question + one lightweight follow-up. Chain-depth cap aligns with platform vector V2. Phase 2. |
| Editing the SOP from an answer ("apply this") | Editing strategy is an open SOP decision (benchmark DD-3). Out of scope. |
| Voice / multilingual | Post-MVP. |

### 4.3 Determinism boundary (HARD architectural rule)

Consistent with the platform vision §3.7: **the LLM is a presentation/retrieval layer over deterministic facts — it is NEVER the source of facts.** Concretely:

- A deterministic **grounding context builder** (pure, render-safe, no `Date.now()`, no new computation) assembles the candidate evidence for a question from `SOPViewModel` + `PortfolioIntelligence`. This is the *only* place facts come from.
- The LLM's job is to (a) select which evidence is relevant, (b) phrase a grounded answer, and (c) emit the citation set it used. **It may not introduce a fact not present in the grounding context.**
- A post-generation **citation-validation gate** verifies every cited `sourceEventId` / step ordinal / run reference exists in the grounding context; any answer that asserts a fact without a backing citation, or cites something not in context, is **rejected and replaced with a refusal** ("I couldn't ground that answer in the evidence").
- This mirrors the existing honesty machinery: the alignment pill gating at N≥2, the observed-vs-inferred outcome flag, the evidence-snippet "omit when absent" rule.

---

## 5. User Stories & Acceptance Criteria

Format: each story is from a persona, with acceptance criteria (AC). "Grounded" = backed by citations present in the grounding context; "refusal-honest" = declines clearly rather than guessing.

### 5.1 Anchor question 1 — "Why is this step here?"

**Story (P1/P2):** As a process owner, I ask "why is step 4 here?" and get an answer explaining the step's role grounded in what was observed.

**AC:**
- AC-1.1 The answer describes the step using only its observed fields: action, system, the evidence snippet (app · page · action), preceding/following step relationship, and whether it's a decision point / error-handling / friction point — all already in `SOPViewStep`.
- AC-1.2 The answer **cites the step ordinal and the step's `sourceEventId`(s)**. If the step has `evidence.hasEvidence === false`, the answer says so ("this step has no captured evidence snippet") rather than inventing context.
- AC-1.3 If the question references a step that doesn't exist (e.g. "step 99"), the system says the process has N steps and asks which one.
- AC-1.4 The answer never invents a *purpose* not derivable from observed signals (e.g. it must not assert "this is a compliance check" unless a captured signal supports it).

### 5.2 Anchor question 2 — "What can be automated?"

**Story (P1/P3):** As a belt, I ask "what can be automated here?" and get the steps flagged with automation opportunity, with evidence.

**AC:**
- AC-2.1 The answer is built from the steps carrying `automationHint` and the recommendation set (`SOPRecommendation` of type `automation`), plus the automation-opportunity signal from intelligence — never a free-form LLM guess.
- AC-2.2 Each automation candidate **cites the affected step ordinal(s)** and the observed signal that motivates it (e.g. repetitive data-entry steps; high-frequency rule-based actions).
- AC-2.3 The answer is framed as an **observation-grounded suggestion**, not a directive, and explicitly does NOT promise execution ("Ledgerium does not run changes — this is a recommendation").
- AC-2.4 If no step carries an automation signal, the answer says "I don't see automation candidates in the observed evidence" — it does not fabricate one.
- AC-2.5 No dollar/ROI figure is produced (deferred / must-not-answer §6.2). If asked for savings, it scopes to "I can tell you which steps look automatable, but not the dollar value."

### 5.3 Anchor question 3 — "Where do users get stuck?"

**Story (P3/P1):** As a UX researcher, I ask "where do users get stuck?" and get the friction/bottleneck points with evidence.

**AC:**
- AC-3.1 The answer is built from `frictionIndicators` / `hasHighFriction` per step, `BottleneckReport.bottlenecks`, and `VarianceReport.highVarianceSteps` — all observed signals with `evidenceRunIds`.
- AC-3.2 Each "stuck point" **cites the step ordinal(s) and the run evidence** (e.g. "step 6 took >1.5× the average across N runs"). The cited number of runs is shown honestly.
- AC-3.3 **N-gating honesty:** if the process is a single run (N=1) or N<2, bottleneck/variance/friction-frequency signals are NOT meaningful — the answer discloses "based on 1 recording, I can flag friction observed in this run but can't tell you it's a recurring sticking point." It never presents a single-run signal as a pattern. (Mirrors the alignment-pill N≥2 gate.)
- AC-3.4 If no friction/bottleneck/variance signal exists, the answer says so plainly.

### 5.4 Additional honest question types (3–5) — §7 defines the full catalog; representative stories below

- **Story (P1) — process shape:** "How many steps / systems / handoffs are in this process?" → answered from `workflowDNA` + `metadata`; cites the computed counts. (AC: numbers match the rendered DNA traits exactly; no rounding-into-a-different-number.)
- **Story (P4) — conformance/freshness:** "Does this SOP match how the work is actually done?" → answered from the **alignment pill** (`N of M runs follow this SOP`) with N≥2 gating; if N<2, returns the "based on 1 recording — review before distributing" disclosure. (AC: the answer reproduces the honest conformance fraction, never a tautological "100% aligned.")
- **Story (P2) — decisions/branches:** "What are the decision points?" → answered from `decisions[]`; cites step ordinal + the observed branch conditions; if a branch's condition wasn't observed, it says the branch exists but the condition wasn't captured.
- **Story (P1) — timing:** "Which step takes the longest?" → answered from `timestudy.stepPositionTimestudies` with N≥2 gating and `evidenceRunIds`; single-run timing is disclosed as single-observation, not a benchmark.
- **Story (P3) — systems/evidence:** "What systems does this touch, and where?" → answered from `metadata.systems` + per-step evidence snippets; cites the steps where each system appears.

### 5.5 Cross-cutting honesty stories

- **Story (refusal-honesty):** As any user, when I ask something the evidence can't support, I get a clear, specific decline that tells me *why* and *what I could ask instead* — not a confident-sounding guess. (AC: refusal names the missing evidence class; offers an answerable reframing where one exists.)
- **Story (citation always):** As a skeptical reviewer, every factual claim in an answer shows me the evidence it used, and I can click through to the cited step. (AC: zero factual answers render without at least one citation; citation links resolve to existing steps.)
- **Story (BYOK trust):** As a security-minded owner, when I connect a provider, I'm told my key is held server-side and the LLM never sees it, and only Tier-1/Tier-2 providers are allowed. (AC: copy + enforcement match platform vision §10.)

---

## 6. Non-Goals & "Must-Not-Answer" Classes (HARD requirements)

### 6.1 Non-goals (capability boundaries)

1. **No execution / no side effects.** This surface answers; it never acts. (Stricter than platform-vision MVP, which allows dry-run; here even dry-run is out of scope.)
2. **No cross-process / portfolio questions.** Grounding is one process. "Compare this to my other workflows" → decline + "v1 answers about this process only."
3. **No fabrication of steps, metrics, conditions, outcomes, systems, or timings.** If it isn't in the grounding context, it isn't in the answer.
4. **No persistent agentic chains** (chain-depth cap; aligns with platform vector V2).
5. **No editing / authoring** of the SOP from the panel.

### 6.2 Must-not-answer classes (honestly declined or scoped)

These are questions whose honest answer the *observed evidence cannot support*. The system MUST decline or scope them — never bluff.

| Class | Example question | Required behavior |
|---|---|---|
| **ROI / financial** | "What's the ROI of automating this?" / "How much money will this save?" | Decline the dollar figure; scope to what's observable ("I can tell you which steps look automatable and how often they occurred, but not a dollar value — Ledgerium has no labor-cost data"). |
| **Compliance / regulatory** | "Is this process SOX/HIPAA/GDPR compliant?" | Decline; clarify Ledgerium observes behavior and provides an immutable evidence trail, but does not certify regulatory compliance. |
| **Headcount / staffing / cost** | "How many people do I need?" / "What does this cost to run?" | Decline; no labor or cost data is observed. |
| **Predictions / forecasts** | "Will this break next quarter?" / "How long will it take next time?" | Decline forecasting; may report observed historical timing with N-gating, framed as past observation not prediction. |
| **Causal / motivational claims about humans** | "Why did the user do X?" (intent) | Scope to the observed action; decline to attribute intent ("I can tell you what was done and on which screen, not why the person chose to"). |
| **Out-of-evidence factual** | "What's the customer's name in step 3?" (PII / not captured) | Decline; evidence snippets are PII-capped and observed-only; do not surface field values not present. |
| **General world knowledge** | "What's the best CRM?" | Decline; out of scope — this surface answers about *this recorded process*. |

**Honesty default:** when uncertain whether a question is answerable, **decline and offer an answerable reframing** rather than risk an ungrounded answer. A false "I don't know" is cheap; a confident fabrication is a category-defining failure.

---

## 7. Honest Question-Type Catalog (what the evidence can answer)

The deterministic grounding context can answer these, each mapped to its evidence source. Anything outside this catalog routes to refusal/scoping.

| # | Question type | Evidence source (already computed) | Citations emitted |
|---|---|---|---|
| Q1 | **Why is this step here?** | `SOPViewStep` (action, system, evidence snippet, neighbors, decision/error/friction flags) | step ordinal + `sourceEventId`(s) |
| Q2 | **What can be automated?** | `automationHint` per step + `SOPRecommendation[type=automation]` + automation-opportunity signal | affected step ordinals + motivating signal |
| Q3 | **Where do users get stuck?** | `frictionIndicators`, `BottleneckReport`, `VarianceReport.highVarianceSteps` | step ordinals + `evidenceRunIds` + N |
| Q4 | **Process shape** (steps / systems / handoffs / decisions count) | `workflowDNA` + `metadata` | computed counts (match rendered DNA) |
| Q5 | **Conformance / freshness** (does the SOP match reality?) | alignment pill (`N of M runs follow this SOP`), drift findings | aligned/total run counts (N≥2 gated) |
| Q6 | **Decision points & branches** | `decisions[]` (question, options, conditions) | step ordinal + observed conditions |
| Q7 | **Timing** (longest/slowest step, total duration) | `timestudy` (per-position + total, with stdDev) | step ordinal + `evidenceRunIds` + N (gated) |
| Q8 | **Systems & evidence** (what's touched, where) | `metadata.systems` + per-step evidence snippets | steps where each system appears |
| Q9 | **Variants** (are there different ways this runs?) | `VariantSet` (standard path + variants, frequency) | variant frequencies + `evidenceRunIds` (N≥2 gated) |

(Q1–Q3 are the anchor questions already shown in the coming-soon tile; Q4–Q9 are the additional honest types.)

**Gating rule baked into the catalog:** Q3, Q5, Q7, Q9 depend on multi-run signals and MUST apply the N≥2 disclosure when N<2 — exactly as `deriveAlignmentPill` does. Single-run answers are framed as "observed in this one recording," never as patterns.

---

## 8. The Honesty Contract (HARD requirement)

This is the load-bearing requirement. The SOP surface is the surface that proves Ledgerium tells the truth; a fabricating Q&A bot would invert that.

1. **Observed-only.** Every fact in an answer must originate from the deterministic grounding context (`SOPViewModel` + `PortfolioIntelligence`). The LLM selects and phrases; it never sources facts.
2. **Cite or don't claim.** Every factual assertion carries at least one citation (step ordinal / `sourceEventId` / `evidenceRunIds` / computed count). An answer with an uncited factual claim is **invalid** and is replaced by a refusal.
3. **Refuse over fabricate.** When the grounding context lacks support, the system returns an explicit, specific "not enough evidence" message — naming the missing evidence class and (where possible) an answerable reframing.
4. **N-gating.** Multi-run signals (conformance, bottlenecks, variance, timing patterns, variants) are disclosed honestly at N<2 and never presented as patterns from a single run. Reuse the existing N≥2 gate semantics.
5. **Observed vs inferred.** Where a field is inferred (e.g. `outcomeObserved === false`), the answer marks it as inferred, never as verified — mirroring the existing observed-vs-inferred SOP rule.
6. **No PII surfacing beyond what the SOP already shows.** Evidence snippets are already PII-capped/truncated; answers may not reconstruct or surface field-level values.
7. **No execution language.** Answers must not imply Ledgerium will act ("I'll automate that") — it recommends and explains only.
8. **Determinism-traceable.** The grounding context for an answer is reproducible (no clock/random); the citation set is verifiable against it. This is what makes the answer auditable — the M1 moat.
9. **Provider safety (BYOK).** The user's API key is server/worker-held and never placed in LLM-visible context; only Tier-1/Tier-2 providers are permitted (platform vision §10.2–§10.3, V5 mitigation). The grounding context sent to the provider follows the redaction tiers (Tier-1 default: abstracted step shape; raw excerpts only on explicit opt-in).

**Acceptance gate:** an answer that violates 1, 2, 3, 4, or 7 is a **release-blocking defect**, not a polish item.

---

## 9. Phased Delivery Outline

A Mode-1 series (not a Mode-5 batch), consistent with platform-vision build discipline. Each phase is independently shippable and gated by the honesty contract.

| Phase | Deliverable | Notes |
|---|---|---|
| **A — Grounding substrate (no LLM)** | Pure, render-safe **grounding-context builder** + **citation model** + the question-type → evidence-source mapping (§7) + the **must-not-answer classifier** (§6.2). Includes deterministic answer templates for Q4/Q6/Q8 (count/shape questions answerable WITHOUT an LLM at all). | Ships value + the honesty machinery before any LLM call. Validates the determinism boundary. `system-architect` primary (new contract surface). |
| **B — Read-only Q&A with BYOK provider** | Interactive panel (replaces coming-soon tile), single-provider (Anthropic) BYOK connection, LLM-phrased answers over the Phase-A grounding context, **citation-validation gate**, refusal path. Anchor Q1–Q3 + Q5/Q7/Q9 (gated). | `frontend-engineer` + `growth-strategist` (copy) + provider plumbing per platform vision. Closed beta. |
| **C — Honesty hardening + instrumentation** | Full instrumentation (§11), refusal-honesty review against a labeled question set, N-gating audit, citation-resolution cross-nav to steps, satisfaction signal. | Beta-exit gate evaluation. |
| **Deferred (Phase 2)** | Lightweight follow-up turns; second provider; cross-process (portfolio) grounding; per-step screenshots in answers; export an answer with its evidence. | Each is its own decision; none in v1. |

**Beta-exit criteria:** §11 thresholds met on a minimum sample (N≥30 questions across ≥10 users), zero honesty-contract release-blockers open.

---

## 10. Dependencies & Risks

### 10.1 Dependencies

| Dependency | Status | Impact if absent |
|---|---|---|
| `SOPViewModel` + adapters (`sopViewModel.ts`, `sopIntelligence.ts`) | **Shipped** | Grounding substrate. Available today. |
| `PortfolioIntelligence` signals (alignment/drift/variance/variants/bottlenecks/timestudy) in `ProcessDefinition.intelligenceJson` | **Shipped, computed, stored** | The multi-run answer sources (Q3/Q5/Q7/Q9). Benchmark notes alignment/drift wiring lands as P0. |
| Per-step `sourceEventId` evidence chain (`SOPInstruction.sourceEventId`) | **Shipped** | The citation primitive. Without it there is no honesty contract. |
| BYOK credential vault + provider adapter + worker (platform-vision AI+1/AI+3) | **NOT built** (net-new per AI vision) | Hard blocker for Phase B. Phase A ships without it. |
| Trust-tier / payload-redaction enforcement (platform-vision §10.2–§10.3) | **NOT built** | Required before any process evidence leaves to a provider. |
| Analytics event taxonomy additions | New events needed | §11 metrics unmeasurable without them. |

### 10.2 Risks

| # | Risk | Mitigation |
|---|---|---|
| R-1 | **LLM fabricates / hallucinates an ungrounded answer** (category-defining failure; ties to platform vector V4) | Determinism boundary (§4.3): LLM never sources facts; **citation-validation gate** rejects uncited/unverifiable claims → refusal. Phase-A deterministic templates for count/shape questions bypass the LLM entirely. |
| R-2 | **Prompt injection via captured page content** (platform vector V1) | Grounding context passed as quoted structured data, not interpolated instructions; Tier-1 redaction default (abstracted step shape); output-schema enforcement; no tool-use. |
| R-3 | **Credential exposure** (platform vector V5) | BYOK key worker-held, never in LLM-visible context; egress allowlist; Tier-1/Tier-2 providers only. |
| R-4 | **Over-refusal** (so cautious it's useless) | Phase-A deterministic answers guarantee a floor of always-answerable questions (counts/shape/decisions); refusal-honesty review tunes the must-not-answer classifier against a labeled set. Track refusal-honesty as a *two-sided* metric (§11). |
| R-5 | **N=1 single-run processes** present thin/insufficient signal | N≥2 gating reuses the existing alignment-pill pattern; single-run answers are explicitly framed as single-observation; the panel discloses sample size. |
| R-6 | **Latency** (LLM 2–10s) makes the panel feel broken | Stream/spinner UX; deterministic answers (Phase A) return instantly; LLM calls off the request path per platform-vision rule. |
| R-7 | **Cost run-away / denial-of-wallet** (platform vector V3) | Per-tenant budget cap; question rate-limit; concise grounding context (abstracted, not raw events). |
| R-8 | **Scope creep into execution / cross-process** | This PRD's MVP boundary (§4) + non-goals (§6) are firm; each deferred item is its own future decision. |

---

## 11. Success Metrics (Measurable)

Baseline today: **zero** (non-interactive tile). All metrics require the new instrumentation in Phase C.

| # | Metric | Definition | Target (beta exit) |
|---|---|---|---|
| **M-1 Adoption** | Panel engagement rate | unique users who ask ≥1 question ÷ unique users who open the SOP Analysis view, trailing 28d | **≥ 30%** |
| **M-2 Grounded-answer rate** | grounded answers ÷ total answers generated (an answer is "grounded" iff it passed the citation-validation gate with ≥1 resolvable citation) | **≥ 95%** (the honesty floor; ungrounded answers should be refusals, not assertions) |
| **M-3 Refusal-honesty** | (a) **correct-refusal rate** = correct refusals ÷ must-not-answer questions asked; (b) **over-refusal rate** = wrong refusals ÷ answerable questions asked (measured against a labeled review set) | (a) **≥ 95%**, (b) **≤ 10%** |
| **M-4 Citation resolution** | answers whose citations all resolve to existing steps/runs ÷ answers with citations | **= 100%** (a broken citation is a defect) |
| **M-5 Satisfaction** | thumbs-up ÷ rated answers (lightweight per-answer 👍/👎) | **≥ 70%** |
| **M-6 Time-to-first-answer p50** | from question submit to answer rendered (deterministic answers should be near-instant) | **≤ 5s** p50 |

**Instrumentation (new analytics events, PostHog — counts/flags only, no payloads, per platform-vision privacy tier):** `ask_process_question_asked` (with question-type classification + N bucket), `ask_process_answer_grounded`, `ask_process_answer_refused` (with refusal-class), `ask_process_citation_clicked`, `ask_process_answer_rated` (up/down). No question text or answer content to PostHog; content lives in the internal audit log only (platform-vision §3.4).

---

## 12. Open CEO Decisions

1. **DD-A — BYOK vs managed for this surface.** Inherit platform-vision D-01 (coordinator default: **BYOK passthrough**). Confirm "Ask This Process" uses the same BYOK model and ships its provider connection alongside (or after) the AI-vision credential vault. Reverse path: a managed/Ledgerium-funded inference model for this single read-only surface to lower the activation barrier (no key required to try it).
2. **DD-B — Phase A first-shippable scope.** Approve shipping **Phase A (deterministic, no-LLM answers for count/shape/decision/conformance questions)** as a standalone first release that lights up the panel honestly before the LLM lands — or hold until the full LLM experience is ready.
3. **DD-C — Provider sequencing & gating.** Confirm Anthropic-only at v1 (per platform-vision D-04), Tier-1/Tier-2 only, and that this surface depends on the AI-vision credential-vault/redaction work landing first (vs. a scoped, standalone credential path for read-only Q&A).
4. **DD-D — Default redaction tier for the grounding context.** Confirm **Tier-1 (abstracted step shape) as the default** payload sent to the provider, with raw evidence excerpts only on explicit per-process opt-in. This trades some answer richness for the strongest privacy default.
5. **DD-E — Refusal vs scoped-answer policy for borderline classes.** For must-not-answer classes (ROI, compliance, prediction), confirm the product voice: **hard decline** vs **decline-the-claim-but-offer-the-observable** (PRD recommends the latter — scope down to what's observed rather than a flat "no").

---

## 13. Appendix — Grounding-Context Sources (traceability map)

| Question intent | View-model / engine field | Honesty gate |
|---|---|---|
| Step purpose / role | `SOPViewStep` (action, system, evidence, neighbors, flags) + `instructions[].sourceEventId` | `evidence.hasEvidence`; observed-vs-inferred (`outcomeObserved`) |
| Automation | `SOPViewStep.automationHint`, `SOPRecommendation[automation]` | no ROI; recommendation-not-execution |
| Friction / stuck | `frictionIndicators`, `BottleneckReport`, `VarianceReport.highVarianceSteps` | N≥2; `evidenceRunIds` |
| Conformance | `AlignmentPill` (`alignedRunCount`/`runCount`), `DocumentationDrift` | N≥2 disclosure; no tautological 100% |
| Timing | `TimestudyResult.stepPositionTimestudies` + total | N≥2; single-run = single-observation |
| Variants | `VariantSet` (standard path + variants + frequency) | N≥2; `evidenceRunIds` |
| Shape / counts | `SOPWorkflowDNA`, `SOPMetadata` | numbers match rendered DNA exactly |
| Decisions | `SOPViewDecision[]` | observed conditions only; uncaptured branch disclosed |
| Systems | `SOPMetadata.systems` + per-step evidence | observed-only; PII-capped |

Every row's facts already exist, already carry provenance (`sourceEventId` / `evidenceRunIds`), and are already render-safe. **"Ask This Process" is a retrieval-and-phrasing layer over facts Ledgerium already computes — not a new source of truth.** That is precisely what makes the honesty contract enforceable and the moat real.
