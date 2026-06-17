# MEASUREMENT PLAN — "Ask This Process"

**Ledgerium AI** · 2026-06-16 · Product Analytics (Define phase)
**Status:** DRAFT — for CEO review. Analysis/planning only; no product code in this artifact.
**Surface:** `apps/web-app/src/components/sop-view/SOPIntelligenceMode.tsx` → `AskThisProcessPanel` (currently the non-interactive "Coming soon" tile, ~line 511).
**Reads:** `PRD_ASK_THIS_PROCESS.md` §11 (Success Metrics), `ARCHITECTURE_ASK_THIS_PROCESS.md` §2 (determinism boundary), §5 (API envelope), §7 (`AskTurn`/`AskCitation`), `SECURITY_REVIEW_ASK_THIS_PROCESS.md` §T15 / §4.12 (no-PII-in-analytics hard requirement), `apps/web-app/src/lib/analytics.ts` (taxonomy + `EnrichedEvent` + PostHog `disable_session_recording` no-content posture).

---

## 0. Measurement philosophy (read this first)

This is an **honesty-first** product. The category-defining failure mode is not low adoption — it is **a confident fabrication rendered as fact**. Therefore the measurement plan is organized around one inversion of the usual analytics priority order:

> **The primary KPI is not engagement. It is the GROUNDED-ANSWER RATE and a TWO-SIDED refusal metric. Engagement is a guardrail on top of a quality floor — never a substitute for it.**

Three load-bearing constraints shape every event and metric below:

1. **Privacy / no-content (HARD).** Per `SECURITY_REVIEW` §T15 + §4.12 and the existing PostHog `disable_session_recording: true` posture, **no question text, no answer text, and no evidence content may ever enter an analytics event.** Every property below is a **count, a bucket, a taxonomy enum, an opaque id, or a boolean.** Question/answer content lives ONLY in the internal `AskTurn` table + the short-retention audit payload table (`ARCHITECTURE` §7.4) — never in PostHog, never in app logs.

2. **Events alone cannot certify correctness (HONEST CAVEAT — see §9).** An event can tell us an answer *passed the deterministic citation-validation gate* (machine-checkable, real-time). An event **cannot** tell us the answer was *correct*, that a refusal was *appropriate*, or that the cited evidence actually *supports* the prose. Those require **human-labeled sampling against a held-out review set** — a separate, deliberate offline process. The plan says exactly which metrics are event-derived and which require labeling.

3. **Determinism boundary is the measurement anchor.** Because grounding is deterministic and every surviving citation resolves to a real `sourceEventId`/step ordinal (`ARCHITECTURE` §2), the *grounded* / *not-grounded* split is a **machine-checkable, real-time** fact emitted by the route — not a judgment call. This is what makes M-2 (grounded-answer rate) a hard, event-derived floor rather than an estimate.

---

## 1. Success metrics — PRD §11 made concrete & instrumentable

The PRD defines M-1…M-6. Below, each is made measurable: exact numerator/denominator, the event(s) it derives from, whether it is **event-derived** (real-time, automatic) or **label-derived** (needs human sampling), the window, and the minimum N before the number is trustworthy.

| ID | Metric | Exact definition (num / denom) | Source | Type | Window | Min N | Target (beta-exit) |
|---|---|---|---|---|---|---|---|
| **M-1** | **Adoption** | `count(distinct users with ≥1 ask_question_asked) ÷ count(distinct users with ≥1 sop_viewed where sopMode='intelligence')` | events | **event-derived** | trailing 28d | ≥ 50 SOP-viewers | **≥ 30%** |
| **M-2** | **Grounded-answer rate** (PRIMARY) | `count(ask_answer_grounded) ÷ count(ask_answer_grounded) + count(ask_answer_refused) + count(ask_answer_ungrounded_blocked)` — see §2 | events | **event-derived** | trailing 28d | ≥ 100 answers | **≥ 95%** of *non-refused attempts that asserted facts must be grounded*; equivalently the **ungrounded-leak rate ≤ 0%** (see §2) |
| **M-3a** | **Correct-refusal rate** | `correct refusals ÷ must-not-answer questions asked` (labeled set) | labels | **label-derived** | per review cycle | ≥ 50 must-not-answer Qs | **≥ 95%** |
| **M-3b** | **Over-refusal rate** | `wrong refusals ÷ answerable questions asked` (labeled set) | labels | **label-derived** | per review cycle | ≥ 100 answerable Qs | **≤ 10%** |
| **M-4** | **Citation resolution integrity** | `answers whose every emitted citation resolves to an existing step/event ÷ answers with ≥1 citation` | events | **event-derived** | trailing 28d | ≥ 100 cited answers | **= 100%** (a broken citation is a P0 defect, not a metric to optimize) |
| **M-5** | **Per-answer satisfaction** | `count(ask_answer_feedback where rating='up') ÷ count(ask_answer_feedback)` | events | **event-derived** (proxy) | trailing 28d | ≥ 50 rated answers | **≥ 70%** |
| **M-6** | **Time-to-first-answer p50 / p95** | `p50 / p95 of latencyMs` (deterministic answers near-instant; LLM answers measured separately via `answerPath`) | events | **event-derived** | trailing 28d | ≥ 100 answers | **p50 ≤ 5s**, **p95 ≤ 25s** (hard timeout) |

**Why M-2's denominator is constructed the way it is.** A *refusal* is a correct, honest outcome — it must NOT count against the grounded-answer rate (penalizing refusals would incentivize fabrication, the exact failure we are guarding against). So M-2 measures: **of the answers where the system asserted facts, what fraction passed the citation gate.** The honesty contract (`PRD` §8, `ARCHITECTURE` §6.5) means an assertion that fails the gate is *downgraded to a refusal* before it reaches the user — so in a correctly-built system `ask_answer_ungrounded_blocked` should be **near zero from the user's perspective**. We still emit it as a distinct event so we can watch the *internal* gate-rejection rate (a leading indicator of model/prompt drift). **The true honesty floor is: zero ungrounded assertions ever rendered to a user as fact.** M-2 ≥ 95% is the conservative public target; the internal invariant is stricter (M-4 = 100%, ungrounded-leak = 0).

---

## 2. The core quality metrics, defined honestly

### 2.1 Grounded-answer rate (M-2) — what counts as "grounded"

An answer is **grounded** — and emits `ask_answer_grounded` — **iff ALL** of these hold (all machine-checkable at the route, per `ARCHITECTURE` §2.1 / §6.5):

1. The answer made ≥1 affirmative factual claim, AND
2. After `citation-validator` runs (claimed ∩ authorized `CitationSet`), **≥1 citation survived**, AND
3. **Every** surviving citation resolves to a real step ordinal / `sourceEventId` / `[[process]]` token present in the deterministic `GroundedEvidenceBundle` (so M-4 = 100% by construction), AND
4. No claim in the answer lacked a backing citation (the route's "cite-or-downgrade" rule did not fire).

If (1) holds but (2)/(3)/(4) fail, the route **downgrades to a refusal** and emits `ask_answer_ungrounded_blocked` (internal counter) **and** `ask_answer_refused` (`refusalReason='no_relevant_evidence'`) — the user sees an honest refusal, not the ungrounded text.

```
                              ┌─ asserted facts + all cited + all resolve ──▶ ask_answer_grounded   (GOOD)
ask_question_asked ──▶ route ─┼─ asserted facts + uncited/unresolvable ────▶ ask_answer_ungrounded_blocked
                              │                                              └▶ ask_answer_refused (downgrade) (GOOD — honest)
                              ├─ no evidence in bundle / out of scope ──────▶ ask_answer_refused   (GOOD — honest)
                              └─ operational failure (no key/provider/timeout) ▶ ask_answer_error   (NOT an answer)
```

**Grounded-answer rate (event-derived):**
```
M-2 = grounded ÷ (grounded + ungrounded_blocked)
```
i.e. *of the times the model tried to assert facts, how often did it stay inside the evidence.* Target ≥ 95%. The companion **ungrounded-leak rate** = `count(ungrounded assertion that reached the user as fact)` must be **exactly 0** — and is verified not by events alone but by the §9 human sample (an event says the gate passed; only a human can confirm the gate's pass was *substantively* sound, see caveat C2).

**What this metric CANNOT tell us (caveat).** Passing the citation gate proves the answer *only references real evidence* — it does **not** prove the prose *correctly characterizes* that evidence (e.g. citing step 4 but mis-describing what step 4 does). That residual — **citation-misattribution** — is detectable ONLY by human labeling (§9, metric L-1). The event-derived M-2 is a *necessary* honesty floor, not a *sufficient* correctness guarantee. We report both and never conflate them.

### 2.2 Two-sided refusal metric (M-3) — correct-refusal vs over-refusal

Refusal honesty is **two-sided** and the two sides trade off against each other — optimizing one alone is gameable:

- A product that **never refuses** scores 0% over-refusal but fabricates on must-not-answer classes (fails M-3a).
- A product that **always refuses** scores 100% correct-refusal but is useless (fails M-3b, the R-4 over-refusal risk in `PRD` §10.2).

Both sides require a **labeled review set** — events alone cannot tell us whether a refusal was *appropriate*, because that judgment depends on whether the evidence *could* have supported an answer. The events give us the *denominators and the refusal classification the system claimed*; humans supply the *ground-truth label*.

**Construction of the labeled set (per review cycle, offline):**
- Sample is drawn from the internal `AskTurn` table (which holds the real question/answer text — never PostHog).
- Two strata, each independently sized:
  - **Must-not-answer stratum** — questions a reviewer labels as belonging to a §6.2 must-not-answer class (ROI, compliance, headcount, prediction, intent, out-of-evidence PII, world-knowledge). Min N ≥ 50.
  - **Answerable stratum** — questions a reviewer labels as answerable from the grounding context (a Q1–Q9 catalog type). Min N ≥ 100.
- Each sampled turn gets a human label: `{should_have_answered, should_have_refused}` × the system's actual `{answered, refused}` → a 2×2 confusion matrix per stratum.

| | System answered | System refused |
|---|---|---|
| **Should answer** (answerable stratum) | true-answer | **over-refusal** (FN) |
| **Should refuse** (must-not-answer stratum) | **fabrication / under-refusal** (FP — worst cell) | correct-refusal (TN) |

```
M-3a  correct-refusal rate  = correct-refusal ÷ (correct-refusal + under-refusal)      [must-not-answer stratum]    target ≥ 95%
M-3b  over-refusal rate     = over-refusal     ÷ (over-refusal + true-answer)           [answerable stratum]         target ≤ 10%
```

**The single most important cell is "under-refusal" (the system answered a must-not-answer question) — that is a fabrication, the category-defining failure.** Any under-refusal found in a review cycle is a **release-blocking honesty defect** (`PRD` §8 acceptance gate), not a metric to average away. We report the *count* of under-refusals separately and gate on **zero P0 honesty defects open** at beta-exit, independent of the rate.

**Labeling discipline (so the numbers are trustworthy):**
- Two independent reviewers label each sampled turn; **inter-rater agreement (Cohen's κ) ≥ 0.7** is itself a gate on the labeling process (a low-agreement label set produces meaningless rates).
- Reviewers see the deterministic `GroundedEvidenceBundle` for the turn (reproducible from `bundleHash`) so the "could the evidence support this?" judgment is grounded, not subjective.
- The labeled set is **held-out and refreshed each cycle** — never the same questions the prompt was tuned on (avoids teaching-to-the-test).

---

## 3. Event taxonomy

**Naming:** `snake_case`, `ask_`-prefixed, action-oriented — consistent with the existing `analytics.ts` taxonomy. All events flow through the existing `track()` → PostHog path and inherit `EnrichedEvent` (`timestamp`, `url`, `userPlan`, `sessionId`).

**Privacy invariant (applies to EVERY event below):** properties are **numeric, bucketed, taxonomy-enum, opaque-id, or boolean ONLY.** No `question`, no `answer`, no evidence text, no step titles, no page titles, no citation labels. `workflowId` is the existing opaque id already used across the taxonomy. This mirrors the `report_*` and `sop_*` events that already carry "PII-free: counts/taxonomy only, never content" docstrings.

### 3.1 Event table

| Event | When | Properties (numeric / taxonomy / boolean ONLY) | Notes |
|---|---|---|---|
| **`ask_panel_opened`** | The interactive Ask panel is first rendered/focused in a SOP-intelligence session (replaces the coming-soon tile becoming live + engaged) | `workflowId: string`; `stepCount: number`; `runCount: number`; `hasInsufficientData: boolean` (bundle N<2); `entryPoint: 'panel_focus' \| 'example_chip'`; `elapsedMsSinceSopView: number` | Funnel step 2. Distinguishes *seen* from *engaged*; `panel_focus` = clicked into input, `example_chip` = tapped an anchor prompt. |
| **`ask_question_asked`** | A question is submitted (the moment of intent) | `workflowId`; `questionCategory: QCat` (see §3.2 — taxonomy, NEVER text); `questionLengthBucket: '1' \| '2-5' \| '6-15' \| '16-40' \| '40+'` (word-count bucket, NEVER the words); `isExampleQuestion: boolean`; `nBucket: '1' \| '2-4' \| '5-19' \| '20+'` (run count of the process); `turnIndex: number` (0 = first turn in conversation); `elapsedMsSincePanelOpen: number` | Funnel step 3. `questionCategory` is a **coarse classifier output**, not the text. Length is a bucket. |
| **`ask_answer_grounded`** | Route returns a grounded answer (passed citation gate, §2.1) | `workflowId`; `questionCategory`; `nBucket`; `answerPath: 'deterministic' \| 'llm'`; `citationCount: number`; `stepsCitedCount: number`; `eventsCitedCount: number`; `usedProcessCitation: boolean`; `provider: 'anthropic' \| ...`; `byok: boolean`; `insufficientDataDisclosed: boolean`; `latencyMs: number` | Funnel step 4 + M-2 numerator. `answerPath='deterministic'` = answered from `processMeta` with no LLM call (count/shape Qs). |
| **`ask_answer_refused`** | Route returns an honest refusal (200, `refused:true`) | `workflowId`; `questionCategory`; `nBucket`; `refusalReason: 'no_relevant_evidence' \| 'out_of_scope' \| 'insufficient_data' \| 'must_not_answer_class'`; `wasDowngradeFromUngrounded: boolean` (true if this refusal came from the §2.1 downgrade path); `provider`; `latencyMs: number` | M-3 denominators (split by `questionCategory` + `refusalReason`). A refusal is GOOD — counted positively, not as a failure. |
| **`ask_answer_ungrounded_blocked`** | Internal: model asserted facts but produced zero surviving citations; route downgraded it | `workflowId`; `questionCategory`; `nBucket`; `claimedCitationCount: number`; `survivingCitationCount: number` (always 0 here by definition); `answerPath: 'llm'` | **Internal honesty-drift counter.** Pairs with an `ask_answer_refused (wasDowngradeFromUngrounded:true)`. Watch its rate as a leading indicator of prompt/model regression. |
| **`ask_answer_error`** | Operational failure (4xx/5xx) — NO judgment made | `workflowId`; `errorCode: 'NO_AI_KEY' \| 'PROVIDER_UNAVAILABLE' \| 'PROVIDER_TIMEOUT' \| 'RATE_LIMITED' \| 'INVALID_QUESTION' \| 'PLAN_GATE' \| 'INTERNAL'`; `retryable: boolean`; `provider`; `latencyMs: number` | Guardrail (error rate). **Distinct from refusal** — an error is "we couldn't run," not "we honestly declined." |
| **`ask_citation_clicked`** | User clicks a citation chip → scrolls to `#sop-step-{id}` | `workflowId`; `questionCategory`; `citationKind: 'step' \| 'event' \| 'process'`; `citationIndex: number` (position in the answer's citation list, NOT the id); `resolvedToExistingStep: boolean` | **Leading trust indicator** (§6). `resolvedToExistingStep:false` should be impossible (M-4=100%) — if it ever fires, P0 alarm. |
| **`ask_answer_feedback`** | User taps 👍/👎 on an answer | `workflowId`; `questionCategory`; `rating: 'up' \| 'down'`; `answerWasGrounded: boolean`; `answerWasRefusal: boolean`; `citationCount: number` | M-5 + the trust read in §6. Splitting by `answerWasGrounded`/`answerWasRefusal` lets us measure thumbs-up *specifically on grounded answers* and *on honest refusals*. |
| **`ask_consent_shown`** | The pre-first-ask data-egress consent gate is displayed (`SECURITY` §T7) | `workflowId`; `provider`; `byok: boolean` | Consent funnel — required because no egress may happen pre-consent. |
| **`ask_consent_granted`** | User accepts the egress consent | `workflowId`; `provider`; `byok: boolean`; `elapsedMsSinceShown: number` | Consent conversion. A low grant rate is a privacy-copy / trust problem, not a bug. |
| **`ask_provider_connect_clicked`** | `NO_AI_KEY` CTA ("connect a provider") clicked | `workflowId`; `fromState: 'no_key' \| 'provider_error'` | BYOK activation funnel (only relevant if BYOK-only per `PRD` DD-A). |
| **`ask_budget_blocked`** | A per-user/per-tenant cost cap or rate limit halted an ask before egress (`SECURITY` §T6) | `workflowId`; `capType: 'daily_budget' \| 'monthly_budget' \| 'rate_limit' \| 'token_ceiling'`; `byok: boolean` | Guardrail (cost/abuse). Distinct from `ask_answer_error` because no provider call was attempted. |

### 3.2 `questionCategory` taxonomy (`QCat`) — classifier output, never text

A coarse, deterministic-where-possible classification of question *intent* — derived from the question, but **only the resulting enum label is emitted**, never the words. Maps to the `PRD` §7 honest-question catalog + the must-not-answer classes:

```
'step_purpose'      (Q1)   'automation'        (Q2)   'friction'      (Q3)
'process_shape'     (Q4)   'conformance'       (Q5)   'decisions'     (Q6)
'timing'            (Q7)   'systems'           (Q8)   'variants'      (Q9)
'mna_roi'           'mna_compliance'   'mna_headcount'   'mna_prediction'
'mna_intent'        'mna_out_of_evidence'   'mna_world_knowledge'
'other_unclassified'
```
`mna_*` = a must-not-answer class (used directly as the M-3a denominator basis, cross-checked against the human label). `other_unclassified` is itself a signal — a high share means the classifier (or the catalog) has a gap to close.

### 3.3 What is deliberately NOT an event (and where it lives instead)

| Datum | NOT in PostHog because | Lives in |
|---|---|---|
| Question text | PII / content (`SECURITY` T15) | `AskTurn.question` (internal, soft-delete, purge ~90d, GDPR-erasable) |
| Answer text | content / may echo captured PII | `AskTurn.answer` (internal, `isAuthoritative=false`) |
| Citation labels ("step 4 · Save Opportunity") | contains observed labels | `AskCitation` (internal) |
| `bundleHash` raw value | reproducibility anchor, not an analytics dimension | `AskTurn.bundleHash` + `ai_audit_event` |
| Provider raw request/response | egress payload | short-retention `ai_execution_audit_payload` (90d, off-by-default per `PRD` DD-D / `ARCH` §10 D-4) |

---

## 4. Adoption + activation funnel

The funnel from *seeing a process* to *trusting an answer enough to come back*. Each step is event-derived; conversion between steps is the diagnostic.

```
STEP 0  SOP-intelligence view opened          sop_viewed (sopMode='intelligence')        [existing event]
   │     ─ denominator for adoption (M-1)
   ▼
STEP 1  Ask panel engaged                      ask_panel_opened
   │     ─ "did the live panel pull anyone in?"  (panel-engagement rate)
   ▼
STEP 2  First question asked                   ask_question_asked (turnIndex=0)
   │     ─ ACTIVATION moment (M-1 numerator: distinct users reaching here)
   ▼
STEP 3  Got a grounded answer                  ask_answer_grounded
   │     ─ "did the system honor the ask?"  (a refusal here is GOOD but exits the *grounded* path — tracked separately)
   ▼
STEP 4  Clicked a citation                     ask_citation_clicked
   │     ─ TRUST moment: user verified the evidence (the moat made visible)
   ▼
STEP 5  Repeat use                             ≥2 ask_question_asked across ≥2 distinct sessions/days, same user
         ─ RETENTION: the feature became a habit, not a one-time curiosity
```

**Funnel metrics:**

| Funnel metric | Definition | Beta-exit read |
|---|---|---|
| **Panel-engagement rate** | `ask_panel_opened distinct users ÷ sop_viewed(intelligence) distinct users` | informational (is the live panel noticed?) |
| **Activation rate (M-1)** | `ask_question_asked distinct users ÷ sop_viewed(intelligence) distinct users` | **≥ 30%** |
| **First-question → grounded** | `users with ask_answer_grounded ÷ users with ask_question_asked` | watch; low value + high refusal = over-refusal (M-3b) or catalog gap |
| **Citation-click-through (CTR)** | `ask_citation_clicked ÷ ask_answer_grounded` (answers that had ≥1 citation) | **≥ 25%** (leading trust indicator §6) |
| **Repeat rate** | `distinct users with ≥2 asks across ≥2 sessions ÷ distinct users with ≥1 ask`, trailing 28d | **≥ 25%** |

**Honest funnel caveat:** STEP 3 "grounded answer" is NOT the only good outcome. An honest *refusal* (`ask_answer_refused`) is a successful, trust-preserving outcome that nonetheless exits the *grounded* funnel branch. We report a parallel **"honest-outcome rate" = (grounded + refused) ÷ (grounded + refused + error)** so the funnel never punishes the product for correctly declining. A funnel that treated refusals as drop-off would incentivize exactly the fabrication we are preventing.

---

## 5. Guardrail metrics

Guardrails are metrics that must stay within bounds for the feature to be *allowed* to ship/run — they don't earn promotion, they prevent harm. All event-derived unless noted.

| Guardrail | Definition | Source | Bound | Breach action |
|---|---|---|---|---|
| **G-Latency p50** | `p50(latencyMs)` over all answers (grounded+refused), split by `answerPath` | events | p50 ≤ 5s | UX/streaming work (`ARCH` §5.4 SSE) |
| **G-Latency p95** | `p95(latencyMs)` | events | p95 ≤ 25s (= hard timeout) | provider/timeout tuning |
| **G-Error rate** | `ask_answer_error ÷ (grounded + refused + error)` | events | ≤ 2% (excl. `NO_AI_KEY`/`PLAN_GATE` which are gates, not failures) | provider reliability |
| **G-Refusal ceiling** | `ask_answer_refused ÷ (grounded + refused)` | events | ≤ 35% **as a watch ceiling, NOT a hard cap** | if breached, audit via §9 to split correct-refusal vs over-refusal before acting |
| **G-Ungrounded-block rate** | `ask_answer_ungrounded_blocked ÷ (grounded + ungrounded_blocked)` | events | ≤ 5% and **stable** | rising trend = model/prompt drift → freeze + investigate |
| **G-Cost per answer** | `total provider spend ÷ count(grounded + refused via LLM path)`, per period | provider billing + event count | ≤ $0.05 / answer (managed-key path); BYOK = informational | budget-cap / context-trim |
| **G-Budget-block rate** | `ask_budget_blocked ÷ ask_question_asked` | events | ≤ 1% | cap-tuning / abuse review |
| **G-Citation integrity** | M-4 (broken-citation rate) | events | **= 0** | **P0** — any non-zero is a release blocker |
| **G-Consent grant rate** | `ask_consent_granted ÷ ask_consent_shown` | events | ≥ 80% (watch) | privacy-copy / trust-framing review |

**On the refusal ceiling (G-Refusal ceiling).** The PRD asks for a "refusal rate ceiling." We implement it as a **watch ceiling, not a hard cap**, on purpose: a hard cap on refusals would pressure the system toward answering when it should decline — directly fighting the honesty contract. If the refusal rate exceeds 35%, the correct response is **not** "answer more" — it is "run a §9 labeling cycle to determine whether the refusals are *correct* (the process corpus is genuinely thin / out-of-catalog questions are common) or *over-cautious* (M-3b breach)." The ceiling triggers an *investigation*, never an automatic loosening of the gate.

---

## 6. Leading indicators of trust

These are the early signals — measurable in days, not the full 28d window — that the honesty promise is landing with users. They predict retention and word-of-mouth before the lagging metrics confirm it.

| Leading indicator | Definition | Why it signals trust | Healthy direction |
|---|---|---|---|
| **Citation click-through rate (CTR)** | `ask_citation_clicked ÷ ask_answer_grounded(with citations)` | Users *verifying* the evidence = they take the answer seriously enough to check it; the moat is being used as designed | ≥ 25%, rising |
| **Thumbs-up on grounded answers** | `feedback.up ÷ feedback total` **where `answerWasGrounded=true`** | Satisfaction *specifically on the answers that cited evidence* (isolates the quality of grounded answers from refusals) | ≥ 70% |
| **Thumbs-up on honest refusals** | `feedback.up ÷ feedback total` **where `answerWasRefusal=true`** | Users *approving of being told "I don't know"* = the honesty posture is read as a feature, not a failure (`SECURITY` §6 trust-moat framing) | ≥ 50% (a refusal users dislike is still honest — but a *liked* refusal is a strong trust signal) |
| **Repeat-within-7d** | distinct users asking again within 7 days of first ask | Early habit formation; predicts the 28d repeat rate | rising |
| **Consent grant rate** | `ask_consent_granted ÷ ask_consent_shown` | Willingness to send their process content = baseline trust in the privacy posture | ≥ 80% |
| **Example→custom progression** | `users who asked a non-example question ÷ users who asked any question` | Moving past the 3 anchor prompts to their *own* questions = real perceived value | ≥ 40% |

**Caveat on satisfaction as a trust proxy.** Thumbs-up measures *perceived* helpfulness, which can be **high even when an answer is subtly wrong** (a confident, well-cited but misattributed answer may earn a 👍). Therefore satisfaction (M-5 / leading-trust) is a *complement to*, never a *substitute for*, the §9 human-labeled correctness check. A divergence — high thumbs-up but rising §9 misattribution — is itself the alarm that the product is being *persuasive without being correct*, the most dangerous state for an honesty-first product.

---

## 7. Launch acceptance gates (beta-entry vs GA)

Two gates, escalating. Each is **AND-composed** — every row must hold. Honesty gates are hard blockers; engagement gates are tunable thresholds.

### 7.1 Beta-entry gate (close the panel to a controlled cohort)

Purpose: prove the honesty machinery works before exposing real users. Mostly **structural + labeled** checks; minimal live N.

| # | Gate | Threshold | Min N | Type |
|---|---|---|---|---|
| BE-1 | All `SECURITY` §5 MUST-NOT-SHIP items implemented & tested | 11/11 closed | — | structural |
| BE-2 | Determinism-boundary tests green (`ARCH` §3: no-import, purity, one-way-data, citation-soundness) | all pass | — | structural |
| BE-3 | **Zero ungrounded assertions reach the user** (M-2 internal invariant) on a seeded eval set | ungrounded-leak = 0 | ≥ 100 seeded Qs | event + label |
| BE-4 | **Correct-refusal rate (M-3a)** on labeled must-not-answer set | ≥ 90% (beta) | ≥ 50 mna Qs | label |
| BE-5 | **Zero under-refusals** (fabrication on must-not-answer) | 0 | ≥ 50 mna Qs | label |
| BE-6 | Citation integrity (M-4) | = 100% | ≥ 50 cited answers | event |
| BE-7 | Latency p95 | ≤ 25s | ≥ 50 answers | event |
| BE-8 | Inter-rater agreement on the labeling set (κ) | ≥ 0.7 | — | process |

### 7.2 GA gate (open to all eligible plans)

Purpose: prove the feature is *adopted, trusted, honest, and operationally safe* at real volume. Adds the engagement + two-sided refusal + N-floor requirements from `PRD` §11 / §9 beta-exit.

| # | Gate | Threshold | Min N | Type |
|---|---|---|---|---|
| GA-1 | **Grounded-answer rate (M-2)** | ≥ 95% | ≥ 100 answers | event |
| GA-2 | **Ungrounded-leak rate** (verified by §9 sample) | = 0 | ≥ 30 sampled answers across ≥10 users | label |
| GA-3 | **Correct-refusal rate (M-3a)** | ≥ 95% | ≥ 50 mna Qs | label |
| GA-4 | **Over-refusal rate (M-3b)** | ≤ 10% | ≥ 100 answerable Qs | label |
| GA-5 | **Zero open P0 honesty defects** (any under-refusal, any rendered fabrication, any broken citation) | 0 | — | structural |
| GA-6 | **Citation integrity (M-4)** | = 100% | ≥ 100 cited answers | event |
| GA-7 | **Adoption (M-1)** | ≥ 30% | ≥ 50 SOP-intelligence viewers | event |
| GA-8 | **Citation CTR** (leading trust) | ≥ 25% | ≥ 100 grounded answers | event |
| GA-9 | **Satisfaction on grounded answers (M-5)** | ≥ 70% | ≥ 50 rated answers | event |
| GA-10 | **Latency p50 / p95** | ≤ 5s / ≤ 25s | ≥ 100 answers | event |
| GA-11 | **Error rate** (excl. gates) | ≤ 2% | ≥ 100 attempts | event |
| GA-12 | **Cost per answer** (managed path) | ≤ $0.05 | full period | billing |
| GA-13 | **Overall beta-exit N floor** (`PRD` §9) | ≥ 30 questions across ≥ 10 users, **zero honesty-contract release-blockers open** | — | composite |

**Gate composition rule:** GA-5 (zero P0 honesty defects) and GA-2 (zero ungrounded leaks) are **non-negotiable hard blockers** — they cannot be traded against adoption or satisfaction. A feature with 50% adoption and one rendered fabrication does **not** pass. This ordering is the measurement encoding of `PRD` §8: "an answer that violates the honesty contract is a release-blocking defect, not a polish item."

---

## 8. Segmentation & analysis dimensions

Every metric above is sliceable by these (all already in-event, all privacy-safe):

- **`questionCategory` (QCat)** — which honest types are answered well vs which drive refusals (catalog-gap discovery).
- **`nBucket`** — N=1 vs N≥2 processes behave very differently (single-run forces the insufficient-data disclosure; multi-run unlocks Q3/Q5/Q7/Q9). Grounded-rate and refusal-rate MUST be read per `nBucket` or the N=1 disclosure noise masks real signal.
- **`answerPath` (`deterministic` vs `llm`)** — deterministic count/shape answers should be ~100% grounded + near-zero latency; isolating them keeps the LLM path's true quality + latency visible.
- **`byok`** — BYOK vs managed-key cohorts differ on activation friction (consent + connect funnel) and cost attribution.
- **`userPlan`** (auto-enriched via `setUserPlanForAnalytics`) — plan-tier adoption + the plan-gate funnel (`PRD` DD-B).
- **`turnIndex`** — first-turn vs follow-up behavior (if multi-turn ships per `ARCH` D-5).

---

## 9. Honest caveats — what the events CANNOT tell us

This section is load-bearing. An honesty-first product whose *measurement* over-claims would be self-refuting. The events are a real-time honesty *floor*; correctness needs sampling.

| # | Caveat | What events claim | What they CANNOT establish | How we actually measure it |
|---|---|---|---|---|
| **C1** | **Answer correctness** | An answer passed the citation gate (referenced only real evidence) | That the answer is *factually correct* / correctly characterizes the cited evidence | §9 human-labeled sample, metric **L-1 (answer-correctness rate)**: reviewers read the `AskTurn` answer + its `bundleHash`-reproducible bundle, label `{correct, misattributed, misleading}`. Target ≥ 90% correct. |
| **C2** | **Citation misattribution** | Citations resolve to real steps (M-4=100%) | That the prose *about* a cited step is accurate (citing step 4 but mis-describing it) | L-1 sub-label `misattributed`; this is the gap M-2 structurally cannot close. |
| **C3** | **Refusal appropriateness** | The system claimed a refusal of class X | Whether refusing was *correct* (could the evidence have answered?) | §2.2 two-sided labeled M-3 — the entire reason M-3 is label-derived, not event-derived. |
| **C4** | **Question-classifier accuracy** | The classifier assigned `questionCategory` | Whether the classification was *right* (a `mna_roi` mislabeled as `automation` corrupts M-3 denominators) | spot-audit of `questionCategory` vs human label during §9 cycles; report classifier confusion. |
| **C5** | **Satisfaction ≠ correctness** | Thumbs-up rate | That up-rated answers are correct (persuasive-but-wrong earns 👍) | L-1 read **alongside** M-5; divergence (high 👍 + rising misattribution) is the headline alarm. |
| **C6** | **Adoption denominator drift** | `sop_viewed(intelligence)` count | Whether non-adopters *saw* the panel (off-screen on mobile — the panel is `hidden lg:block`) | report adoption split by viewport-capability where available; treat mobile non-exposure as denominator exclusion, not low adoption. |
| **C7** | **Survivorship in feedback** | Thumbs given | Sentiment of the silent majority (raters self-select) | report feedback *coverage* (`rated ÷ total answers`); a low coverage means M-5 is a vocal-minority read, flagged as such. |

**Sampling cadence.** The §9 human-labeling cycle runs: (a) once at beta-entry (BE-3/4/5), (b) weekly during closed beta, (c) at the GA gate, (d) monthly post-GA + on any G-Ungrounded-block or G-Refusal-ceiling breach. Sample is drawn from `AskTurn` (internal content store), stratified per §2.2, sized to the min-N in §7. **No content ever leaves the internal store for this — labeling happens against the audited internal record, never PostHog.**

---

## 10. Implementation notes (for the instrumentation iteration — not code)

- All 12 events register in the `AnalyticsEvent` discriminated union in `apps/web-app/src/lib/analytics.ts`, each with a `// PII-free: counts/taxonomy only, never content` docstring matching the existing `report_*` / `sop_*` convention.
- Server-emitted events (`ask_answer_grounded` / `_refused` / `_ungrounded_blocked` / `_error` — emitted by the route, which has the validated citation set) use `trackServer()` (`analytics-server`); client-emitted events (`ask_panel_opened`, `ask_question_asked`, `ask_citation_clicked`, `ask_answer_feedback`, consent/connect/budget) use `track()`. Emitting the answer-outcome events server-side is deliberate: the grounded/refused/ungrounded split is a route-side deterministic fact (`ARCH` §2.1), so it must be measured where it is decided, not reconstructed on the client.
- `latencyMs` is the route's own measured value (already in the `meta` envelope, `ARCH` §5.3) — not a client round-trip timer (which would include network + render and corrupt M-6).
- `questionCategory` is computed by the same must-not-answer classifier the route already runs (`PRD` §6.2 / Phase-A deliverable) — analytics reuses its output, it does not re-classify.
- The §9 labeling pipeline is **not** an analytics event surface; it is an internal offline tool reading `AskTurn` + `AskCitation` + reproducing the bundle from `bundleHash`. It is out of scope for PostHog entirely.

---

## 11. Summary of targets (one-screen reference)

| Metric | Type | Beta-entry | GA | Min N |
|---|---|---|---|---|
| Grounded-answer rate (M-2) | event | ungrounded-leak = 0 | ≥ 95% | ≥ 100 answers |
| Ungrounded-leak rate | event+label | 0 | 0 | ≥ 30 sampled |
| Correct-refusal (M-3a) | label | ≥ 90% | ≥ 95% | ≥ 50 mna Qs |
| Over-refusal (M-3b) | label | — | ≤ 10% | ≥ 100 answerable |
| Under-refusal (fabrication) count | label | 0 | 0 | ≥ 50 mna Qs |
| Citation integrity (M-4) | event | 100% | 100% | ≥ 50 / ≥ 100 |
| Adoption (M-1) | event | — | ≥ 30% | ≥ 50 viewers |
| Citation CTR | event | — | ≥ 25% | ≥ 100 grounded |
| Satisfaction on grounded (M-5) | event | — | ≥ 70% | ≥ 50 rated |
| Latency p50 / p95 (M-6) | event | p95 ≤ 25s | ≤ 5s / ≤ 25s | ≥ 50 / ≥ 100 |
| Error rate | event | — | ≤ 2% | ≥ 100 |
| Cost/answer (managed) | billing | — | ≤ $0.05 | full period |
| Answer-correctness (L-1) | label | sampled | ≥ 90% | per cycle |

**The non-negotiables:** zero ungrounded assertions rendered to a user, zero under-refusals (fabrications on must-not-answer classes), 100% citation integrity. These three are hard release blockers at every gate and cannot be traded against adoption or satisfaction. Everything else is a tunable threshold.
