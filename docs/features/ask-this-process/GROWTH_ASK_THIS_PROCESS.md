# GROWTH + LAUNCH PLAN — "Ask This Process"

**Ledgerium AI** · 2026-06-16 · growth-strategist (Define phase)
**Status:** DRAFT — for CEO review. Analysis / planning only — NO product code.
**Feature:** Evidence-grounded, citation-backed Q&A over a single recorded process. Replaces the non-interactive "Coming soon" tile in `apps/web-app/src/components/sop-view/SOPIntelligenceMode.tsx` (`AskThisProcessPanel`, ~line 511).
**Reads from:** `PRD_ASK_THIS_PROCESS.md`, `ARCHITECTURE_ASK_THIS_PROCESS.md`, `SECURITY_REVIEW_ASK_THIS_PROCESS.md`, `COMPETITIVE_ASK_THIS_PROCESS.md`, `docs/meta/AI_INTEGRATION_PLATFORM_VISION_REVIEW_001.md`, live pricing at `apps/web-app/src/app/(public)/pricing/page.tsx`.

> **One-line honesty constraint for everything below:** every claim in this plan must be backable by the shipped feature. No fabricated outcomes, no invented benchmarks, no borrowed social proof, no "10x faster" numbers we cannot measure. The product's entire reason to exist is that it refuses to fabricate — the *marketing* has to hold the same line, or we undermine the thing we're selling.

---

## 1. Positioning — the honest, differentiated story

### 1.1 The one-sentence positioning statement

> **"Ask This Process is the only process Q&A that answers from what was actually recorded — it cites the exact step and evidence behind every answer, and says 'I don't know' when the recording doesn't show it."**

Three load-bearing clauses, each true of the shipped feature, none embellished:

1. **"from what was actually recorded"** — the grounding context is built deterministically from the immutable observed event chain (`sourceEventId` → `page_context`), not from authored docs (doc-RAG) and not from inferred event logs (process-mining copilots). This is the M1 moat from the platform vision, rendered as a feature.
2. **"cites the exact step and evidence"** — every factual claim carries a machine-checkable citation to a step ordinal / `sourceEventId` that resolves to a real recorded action. The citation-validator drops any cited id outside the deterministic `CitationSet`, so a hallucinated citation can never reach the UI as "verified."
3. **"says 'I don't know'"** — when the evidence isn't there, it refuses or scopes down honestly. A refusal is a first-class, successful, well-styled answer (`200`, `refused:true`) — never an error dressed as an answer, never a confident guess.

### 1.2 The category line (what we actually are)

We are **not** "AI chat on your SOP." That framing is already commoditizing (Dashworks sunset into HubSpot; Glean positioning as "the layer beneath the interface") and the enterprise PI copilots (Celonis, UiPath, Signavio, Apromore) will out-brand and out-distribute us on the generic version within 2–3 quarters.

We are: **evidence-grounded process Q&A** — answers from observed behavior, cited to the recorded action, honest about what it can't see. The defensibility is the **substrate** (immutable observed events) and the **determinism boundary** (reproducible grounding + mechanical citation-legality check), not the chat box and not "we have citations" (everyone has citations).

### 1.3 The wedge: refuse-over-fabricate is a TRUST FEATURE, not a limitation

This is the heart of the positioning and the thing no competitor can comfortably say.

The market in mid-2026 is **flooded with confident, ungrounded AI chat.** Every PI copilot, every knowledge tool, every "ask your data" surface answers fluently — and the 2026 research consensus is blunt: RAG answers carry *the tone of someone holding the documents,* so users **stop checking as hard** even when the answer is unsupported or contradicts its own citation. Confident-but-wrong is the default failure mode of the entire category.

Ledgerium's counter-position is to make **honesty a demonstrable, testable property:**

- **The refusal is the feature.** "I don't have evidence in this recording to answer that" is not a weakness to hide — it is the proof that every *non*-refusal is trustworthy. A tool that never says "I don't know" is a tool you cannot trust when it says "yes."
- **The citation is the receipt.** You don't have to take the answer on faith; click the chip, land on the exact recorded step, verify it yourself. The evidence snippet (`"Salesforce · Opportunities · Save"`) shows the grounding inline before you even click.
- **The boundary is reproducible.** The grounding context is hashed (`bundleHash`); a reviewer can re-derive the exact evidence the answer stood on. No competitor offers reproducible grounding.

**Messaging crystallization:** *"Most AI answers sound confident whether or not they're right. This one shows you the recording behind every answer — and tells you when there isn't one."*

This is the read-only-Q&A analog of the platform's **"You approve what runs"** trust reframe. There is nothing to approve here because the feature never acts — so the trust line shifts from *consent before action* to **honesty before assertion**: *"It cites, or it says it doesn't know."*

### 1.4 Why this lands in a market flooded with confident-but-ungrounded AI

| Market reality (mid-2026) | The trap it creates | Ledgerium's honest wedge |
|---|---|---|
| Doc-RAG Q&A is table-stakes + commoditizing | "Cited chat" reads as a feature, not a product | We don't sell cited chat; we sell **cited answers over observed evidence the others don't have** |
| PI copilots (Celonis/UiPath/Signavio/Apromore) racing into "ask your process" — Signavio's premium agent ships **this month** | They will own "talk to your process" mindshare | They answer over **inferred** logs; we answer over **observed** per-event evidence with run-level provenance + N≥2 honesty |
| Every tool answers fluently; users "stop checking as hard" | Confident-but-wrong erodes trust the moment one bad answer lands | We **refuse over fabricate** and keep the non-authoritative disclosure persistently visible — *especially* once trust builds, which is exactly when users stop checking |
| Capture tools (Scribe/Tango) could bolt on a chatbot with screenshots that *look* like evidence | Prettier-but-fabricating beats us in a demo | Make **reproducibility + refusal a sales weapon**: ask both tools a must-not-answer question; watch theirs fabricate and ours decline with a scoped honest answer |

**The honest caveat we hold internally:** "category-first" decays fast if the framing is only "AI chat on an SOP." The durable version is narrow and load-bearing — *deterministic grounding boundary + machine-checkable per-event citations + refuse-over-fabricate.* Marketing must relentlessly stay on that axis, never the generic one.

### 1.5 What we will NOT claim (honesty guardrails for all copy)

- ❌ No outcome numbers we can't measure ("save 10 hours/week", "cut errors 40%"). We have **zero** Ask-This-Process usage data at launch (baseline is the dead tile).
- ❌ No fabricated benchmarks or "rated #1" — we have none.
- ❌ No borrowed/implied social proof ("trusted by teams at…") until we have real, named, consented beta quotes.
- ❌ No "fully accurate / never wrong" — the prose can still be unfaithful even when the citation is legal; we say "AI-generated, grounded in your recorded evidence — review before relying on it," and we mean it.
- ❌ No "compliant / audit-ready / certified" language tied to the answers — observation is not certification (it's literally a must-not-answer class).
- ✅ We CAN claim, truthfully: *cites the exact recorded step* · *refuses when the evidence isn't there* · *grounding is reproducible* · *your key is never sent to the model* · *your content goes to a zero-retention provider and is never used for training* · *only you can ask about your processes.*

---

## 2. Packaging — BYOK vs managed, and which plan tier

### 2.1 Anchor to the live pricing reality

Live tiers (`pricing/page.tsx`): **Free $0** (5 workflows/mo, watermarked) · **Starter $49** (15 workflows, clean exports, process health scores) · **Team $249** (full intelligence layer: bottleneck/friction/automation/variation) · **Growth $799** · **Enterprise** custom. The **intelligence layer gates at Team.** (Note: the platform-vision Option C table references a "$29 Starter" — that is stale; this plan aligns to the **live $49 Starter**.)

### 2.2 The Option-C principle applied to a READ-ONLY surface

Platform Option C = *"AI free to see, paid to act."* Ask This Process never acts (no execution, no dry-run — it's strictly read-only), so there is no "execution paywall" to sell against. The correct translation of Option C's spirit is:

> **Free to *taste*, paid to *rely on it*. Don't bury the aha behind a wall (avoid Option A), but make the tool you lean on daily a paid surface.**

### 2.3 Recommended packaging

**A. Free taste (every plan, including Free) — the deterministic, no-LLM Phase-A answers.**
The Phase-A deterministic templates (count / shape / decision / conformance — "how many steps / systems / decisions?", "does this match how it's run?") have **zero hallucination risk, near-instant latency, and no provider/key dependency.** Ship these to *everyone*, including Free, as a small monthly allowance of LLM-backed questions OR unlimited deterministic answers. This:
- lights the panel up honestly for every user (kills the "Coming soon" credibility tax),
- demonstrates the citation interaction (click chip → jump to step) before any paywall,
- is the aha-without-friction moment (no key required to see a cited answer).

**B. Paid surface — full conversational Q&A gates at Team (the intelligence-layer tier).**
The richest answers (Q3 "where do users get stuck", Q5 conformance/drift, Q7 timing, Q9 variants) are **built from the intelligence layer signals** (bottlenecks, variance, variants, timestudy, alignment/drift). Those signals already gate at **Team**. Gating full Ask-This-Process at **Team** is therefore *honest and consistent* — you can't honestly answer "where do users get stuck across runs" on a plan that doesn't compute the multi-run signals. **Plan gate:** `hasFeature(userPlan, 'askThisProcess')` at Team+.
- **Starter** gets the single-process answers that don't need the intelligence layer (Q1 step-purpose, Q2 automation hints, Q4 shape, Q6 decisions, Q8 systems) — a meaningful middle tier, honestly scoped to "this recording" not "across runs."
- **Free** gets the deterministic taste (A).

**C. BYOK vs managed — recommend BYOK default, with a managed trial key to remove the cold-start.**
- **BYOK is the architecturally + competitively + security-defensible default** (platform D-01): the user's encrypted key is worker-held, never in LLM-visible context, never returned to the client. It is *itself a trust signal* — "we never send your API key to the model" — and it aligns with the n8n-style BYOK pricing the competitive landscape validates.
- **The cold-start risk is real:** a Q&A panel that is dead for every user without a configured key is a weak first impression and will tank activation. **Recommendation: back the Phase-A deterministic answers (no provider needed) for everyone, and back a rate-limited, managed Anthropic trial key for a small number of LLM-backed questions during trial / on Free**, so the very first grounded, cited answer requires **no setup**. After the taste, the upgrade/connect moment is: *"Connect your AI provider to keep asking — your key stays server-side and is never sent to the model."* (This is open CEO decision DD-A / architecture D-10; recommend the managed-trial-key path for activation, BYOK for sustained use.)

### 2.4 The upgrade / connect moments (honest, specific copy)

Mirroring the platform's "name the specific thing about to happen" handoff discipline:

- **Free → taste exhausted:** *"You've used your free grounded answers this month. Upgrade to Team to ask unlimited questions about this process — every answer cited to the recorded step."*
- **Starter → multi-run questions:** *"To answer 'where do users get stuck across runs,' Ledgerium needs the intelligence layer — bottleneck, variance, and conformance analysis. That's on Team."* (Honest: it literally can't answer this without the gated signals.)
- **Connect-a-provider (BYOK):** *"Connect an AI provider to ask in your own words. Your API key is stored encrypted and held server-side — it is never sent to the AI model, never returned to your browser, never logged."*

### 2.5 Packaging summary table

| Plan | Ask This Process scope | Provider | Honesty rationale |
|---|---|---|---|
| **Free $0** | Deterministic taste (count/shape/decision/conformance) + small managed-key LLM allowance | Managed trial key (rate-limited) | Light the panel honestly; aha without setup; no false "Coming soon" |
| **Starter $49** | Single-process LLM Q&A (step-purpose, automation hints, shape, decisions, systems) — scoped to "this recording" | BYOK (managed trial during 14-day trial) | Honestly excludes multi-run questions (no intelligence layer on Starter) |
| **Team $249** | Full Q&A incl. multi-run signals (friction, conformance/drift, timing, variants) — the intelligence-layer answers | BYOK | Consistent with intelligence-layer gate; can't honestly answer cross-run Qs below Team |
| **Growth / Enterprise** | Team + (future) portfolio/cross-process Q&A, permission-aware citations, residency | BYOK + custom endpoints (Enterprise) | Phase-2 surface; not over-promised at v1 |

---

## 3. The activation moment — the aha

**The aha = the first grounded, cited answer the user can verify in one click.**

Concretely: the user opens a recorded process, types (or one-taps an anchor question), and gets back a short answer with a clickable citation chip — *"This step confirms the opportunity was saved — based on **step 4** (recorded 2026-06-10)"* — clicks the chip, and the page scrolls to and highlights that exact step. **The moment they see the answer land on a real, recorded action, the moat stops being abstract.**

Two design rules make the aha fire reliably:

1. **The deterministic Phase-A answers ARE the activation path.** They return near-instantly, require no key, and carry real citations. The first thing a brand-new user can do — even on Free, even with no provider configured — is ask "how many steps and decisions are here?" and get a cited, instant, correct answer. That is the lowest-friction possible first grounded answer. Ship Phase A first specifically to own the activation moment before the LLM lands.
2. **Pair the chip with the inline evidence snippet** (Onyx/Danswer pattern). Show `"Salesforce · Opportunities · Save"` next to the citation so grounding is visible *before* the click. The snippet is the honest near-term stand-in for the per-step screenshot we can't yet show.

**The counter-aha to design AGAINST:** the first answer being a fabrication, or a citation that resolves to nothing. One bad ungrounded answer on this surface — the surface whose whole job is to prove Ledgerium tells the truth — does outsized brand damage (see §6 risks). The citation-validator + downgrade-to-refusal is what protects the aha.

**Activation metric (from PRD M-1):** ≥30% of users who open the SOP Analysis view ask ≥1 question (trailing 28d). Leading indicator of aha: `ask_process_citation_clicked` rate — a click-through to verify is the behavioral signature of "I trust this enough to check it."

---

## 4. Honest lifecycle / onboarding copy

The job of onboarding copy here is **expectation-setting, not hype.** Set what it can answer, what it can't, what the citation means, and what the honest refusal means — so the refusal reads as integrity, not breakage.

### 4.1 First-open panel intro (replaces the "Coming soon" tile)

> **Ask this process.** Ask a plain-language question about *this recording* and get an answer grounded in the evidence behind every step — cited to the exact recorded action. If the recording doesn't show it, it'll tell you so rather than guess.
>
> *AI-generated, grounded in your recorded evidence. Review before relying on it.* (persistent, never dismissed)

### 4.2 What it can / can't answer (set on first use)

> **It can answer about this recording:** what a step does and why it's here · what looks automatable · where users get stuck (across runs, when you have more than one) · how many steps / systems / decisions · whether the SOP matches how the work is actually done · which step takes longest · what systems it touches.
>
> **It won't answer** (and will tell you why): ROI or dollar savings (no cost data is recorded) · whether it's "compliant" (we observe behavior, we don't certify regulation) · why a person *chose* to do something (we see what was done, not intent) · anything about your *other* processes (v1 answers about this one) · field values that weren't captured. When you ask one of these, you'll get a clear, specific decline — and, where we can, what you *could* ask instead.

### 4.3 The citation explainer (one-time tooltip on first answer)

> **The chip is the receipt.** Every fact in an answer links to the recorded step it came from. Click it to jump to that step and check it yourself. If an answer can't be tied to a recorded step, it won't be shown as an answer — it'll be an honest "I don't have evidence for that."

### 4.4 The honest refusal (the copy that builds trust)

- **No evidence:** *"I don't have evidence in this recording to answer that. This process has no recorded steps about refunds."*
- **Scope-down (recommended over flat-no, per PRD DD-E):** *"I can tell you which steps look automatable and how often they occurred — but not a dollar value. Ledgerium doesn't record labor-cost data."*
- **Single-run honesty (N<2):** *"Based on this one recording, I can flag friction observed in this run — but I can't tell you it's a recurring sticking point. Record this process a few more times to see patterns across runs."*
- **Out of scope:** *"That's about a different process — I only answer about the one you're looking at."*
- **Operational failure (NOT a refusal — never dressed as an answer):** *"The AI provider couldn't be reached, so no answer was generated. Try again in a moment."*

### 4.5 BYOK / trust copy at the connect moment

> **Your key never reaches the model.** Connect an AI provider to ask in your own words. Your API key is encrypted, held server-side, and used only to fetch the answer — it is never placed in the prompt, never sent to the AI model, never returned to your browser, and never logged. Your process content goes only to a zero-retention provider that won't train on it. Every ask is logged to your audit trail.

> Surface the security posture as a **feature**, not fine print. (Security review §6.)

---

## 5. Launch sequence — closed beta → GA, gated by the must-not-ship list

### 5.0 HARD launch gate (what must be true before the panel becomes interactive)

The interactive panel **cannot ship to a single external user** until every item on the security review's MUST-NOT-SHIP list (§5) is in place. These are P0 release blockers, not polish:

- ✅ Tenant-scoped retrieval with per-evidence-id ownership assertion (no cross-tenant leak)
- ✅ Structured prompting (process content as quoted data, never instructions)
- ✅ Output sanitization (strip active HTML / images / arbitrary clickable links; never `dangerouslySetInnerHTML` on model output)
- ✅ No tool-use / no execution in the v1 path
- ✅ BYOK keys never in prompt / never to client / never logged + envelope encryption
- ✅ Tier-1 ZDR-by-default provider routing + egress allowlist (no Tier-3, no SSRF)
- ✅ Server-side egress redaction honoring sensitivity flags
- ✅ Explicit consent gate before first egress
- ✅ Per-user / per-tenant cost cap + rate limit
- ✅ Immutable per-ask audit log (no raw sensitive answer in long-retention)
- ✅ No raw content in application logs / analytics

**Plus the honesty release-blockers** (PRD §8): an answer that asserts an uncited fact, cites something outside the `CitationSet`, fabricates, or fails N-gating is a release-blocking defect.

### 5.1 Phase 0 — Phase-A deterministic launch (internal → Free, no LLM)

- **Ship:** the deterministic, no-LLM answer templates (count/shape/decision/conformance) replacing the "Coming soon" tile. No provider, no key, no egress — therefore **none of the security egress blockers apply yet.**
- **Why first:** plants the flag on the honesty axis (cited, instant, zero-hallucination answers) **before the June-2026 PI-copilot wave defines "ask your process" as inferred-log chat.** Lights the panel honestly. Owns the activation moment with zero risk.
- **Gate to next phase:** citation-resolution = 100% (every chip resolves to a real step); deterministic-answer purity test green (byte-identical grounding); zero `dangerouslySetInnerHTML`.

### 5.2 Phase 1 — Closed beta (LLM, BYOK + managed trial key)

- **Cohort:** 10–20 process owners from the existing user base (mirrors the platform vision's closed-beta-of-10–20 pattern). Pick users with **multi-run processes** so N≥2 answers (the differentiated ones) actually fire.
- **What ships:** the interactive LLM panel (Anthropic, Tier-1 ZDR), citation-validation gate, refusal path, anchor Q1–Q3 + gated Q5/Q7/Q9 — **only after every §5.0 blocker is green.**
- **What we measure (beta-exit gates, from PRD §11, N≥30 questions across ≥10 users):**
  - **Grounded-answer rate ≥ 95%** (ungrounded should be refusals, not assertions)
  - **Correct-refusal rate ≥ 95%** on must-not-answer questions / **over-refusal ≤ 10%** on answerable ones (the two-sided GRACE-style refusal metric)
  - **Citation resolution = 100%** (a broken citation is a defect)
  - **Satisfaction ≥ 70%** thumbs-up
  - **Zero open honesty-contract release-blockers**
- **The most important beta output is LANGUAGE, not metrics.** Per platform-vision launch discipline: *the strongest positioning is assembled from what beta users say when asked "what does this do for you?"* Their words ("it actually told me it didn't know"; "I clicked and it was the real step") are more credible than our marketing — and become the **only** social proof we're allowed to use (real, named, consented).

### 5.3 Phase 2 — Honesty hardening + instrumentation

- Full instrumentation (`ask_process_question_asked` with type + N bucket, `_answer_grounded`, `_answer_refused` with class, `_citation_clicked`, `_answer_rated`). **Counts/flags only — no question or answer content to PostHog** (privacy tier preserved).
- Refusal-honesty review against a labeled question set; N-gating audit; lightweight claim↔snippet entailment check as the residual guard the set-check doesn't cover (the prose can be unfaithful even when the citation is legal — competitive §3 trap #4).

### 5.4 Phase 3 — GA + measured marketing

- **Public launch only after beta-exit gates pass + the SOC 2 Type I posture is underway** (Layer-2 buyer dynamic; security review demands DPA/DPIA + EU AI Act transparency notice before public launch).
- **Marketing built from beta language**, leading with the **citation-to-`sourceEventId` demo and the refusal demo**, never "AI chat on your SOP." The sales weapon: *ask a competitor's tool a must-not-answer question and watch it fabricate; ask ours and watch it decline honestly.*
- **No outcome claims** until we have measured, real data we can stand behind.

### 5.5 Launch sequence at a glance

| Phase | Audience | What ships | Gate to advance |
|---|---|---|---|
| **0** | Internal → Free | Deterministic no-LLM cited answers (replace dead tile) | 100% citation resolution; purity test green |
| **1** | Closed beta (10–20) | LLM panel (BYOK + managed trial), citation-validator, refusal path | **All §5.0 must-not-ship items green** + honesty blockers clear |
| **2** | Beta + hardening | Full instrumentation; refusal-honesty + N-gating audit | Beta-exit metrics (M-1..M-6) met on N≥30 |
| **3** | GA | Team-gated full Q&A; Starter scoped; Free taste; marketing from beta language | SOC 2 Type I underway; DPA/DPIA; zero honesty blockers |

---

## 6. Risks (and how the plan holds the honesty line)

| # | Risk | Why it's serious for THIS feature | Mitigation |
|---|---|---|---|
| **G-1** | **AI-washing perception** — read as "yet another AI chatbot" me-too | The PI copilots out-brand us on the generic frame; if we sound generic we lose | Never market "AI chat on your SOP." Lead with the cited-to-recorded-action demo + the refusal demo. Stay relentlessly on the observed-evidence / determinism / refuse-over-fabricate axis. |
| **G-2** | **Over-promising** — copy claims accuracy/outcomes the feature can't back | We have zero usage data at launch; the prose can be unfaithful even with a legal citation | §1.5 honesty guardrails are hard rules. "AI-generated, review before relying on it" stays persistently visible. No outcome numbers until measured. |
| **G-3** | **Trust damage from ONE bad ungrounded answer** | This is *the* surface that proves Ledgerium tells the truth — a single fabrication inverts the whole brand | The citation-validator (claimed ∩ authorized, drop hallucinated ids) + downgrade-to-refusal is the structural defense. Phase-A deterministic answers carry zero hallucination risk. Beta-exit gate: grounded-answer ≥95%, citation resolution =100%. |
| **G-4** | **Fake/hallucinated citation reaches the UI as "verified"** | A citation that looks real but resolves to nothing manufactures false trust — worse than no citation | Machine-checkable citation grammar + set-intersection; acceptance test {A,B,X} ∩ {A,B,C} = {A,B}. A hallucinated id can never render as verified. |
| **G-5** | **Confident tone → users stop checking** | 2026 research: sourced answers make users "stop checking as hard," exactly when an unfaithful one slips through | Keep the non-authoritative disclosure visible *permanently*, not just early. Keep answers short and bind each claim tightly to its citation. |
| **G-6** | **Cold-start kills activation** (dead panel without a key) | A BYOK-only panel is dead for most users on first open → no aha | Phase-A deterministic answers + managed trial key give the first cited answer with zero setup. BYOK is the *sustain* model, not the *taste* model. |
| **G-7** | **Privacy/consent misstep on egress** | Process content (possibly PII) leaving to a provider without informed consent damages the data-sovereignty brand | Explicit consent gate before first egress; Tier-1 ZDR/no-train default; server-side redaction honoring sensitivity flags; surface the posture as a feature. |
| **G-8** | **Borrowed/implied social proof** before we've earned it | "Trusted by teams at…" with no consented references is dishonest and brand-corrosive | Use ONLY real, named, consented beta quotes captured in Phase 1. No implied proof, no logos we don't have rights to, no invented testimonials. |
| **G-9** | **Fast follower (Scribe/Tango) demos prettier screenshots** | Their visible screenshots out-shine our text snippet even though they're less honest | Close the per-step screenshot gap on the roadmap; make reproducibility + refusal a *demonstrable* sales weapon competitors can't pass. |

---

## 7. Top 5 growth decisions (for CEO)

1. **DD-A — Managed trial key vs BYOK-only for the taste.** *Recommendation: ship Phase-A deterministic answers to everyone (no key) + a rate-limited managed Anthropic key for a small LLM-backed allowance on Free/trial, with BYOK as the sustained model.* This removes the cold-start that would otherwise kill activation. Reverse path (BYOK-only) is cleaner operationally but leaves the panel dead for most first-time users. **Decision needed because it sets the activation ceiling.**

2. **Plan-gate placement: full Q&A at Team, scoped Q&A at Starter, deterministic taste on Free.** *Recommendation: confirm.* It's honest (multi-run answers literally need the Team-gated intelligence layer) and it follows Option C's "don't bury the aha" rule (Free sees a real cited answer). **Decision needed because it sets the conversion story and the `hasFeature` gate.**

3. **Ship Phase A (deterministic, no-LLM) FIRST as a standalone release.** *Recommendation: yes — plant the honesty flag before the June-2026 PI-copilot wave and own the activation moment with zero hallucination/egress risk.* Reverse path (hold for the full LLM experience) leaves the dead "Coming soon" tile up longer and cedes timing. **Decision needed because it sets launch sequencing.**

4. **Marketing frame: lock to "cited to the recorded action + refuses when it can't" — explicitly NOT "AI chat on your SOP."** *Recommendation: adopt the §1.1 positioning statement and the refusal-as-trust wedge; ban generic-chatbot framing and all unmeasured outcome claims.* **Decision needed because the generic frame loses to the enterprise copilots and the honesty frame is the only durable one.**

5. **Social proof policy: real, named, consented beta quotes ONLY; zero implied proof or outcome numbers until measured.** *Recommendation: adopt as a hard rule — the product's credibility IS honesty, so the marketing must hold the same line; the beta's primary deliverable is quotable user language, not a metric.* **Decision needed because one fabricated/implied claim on this surface undermines the exact thing we're selling.**
