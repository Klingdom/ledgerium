# UX Flows — "Ask This Process"
**Evidence-grounded Q&A on the SOP Analysis view** · Ledgerium AI · 2026-06-16
Author: UX/interaction design · Analysis & planning only (no product code)

---

## 0. Premise & non-negotiable design principle

"Ask This Process" replaces the non-interactive **"Coming soon"** tile in `SOPIntelligenceMode.tsx`
(`AskThisProcessPanel`, the sticky right-rail panel at `:511`). It lets a user ask natural-language questions
about *this specific procedure* and receive answers **grounded in the observed evidence behind every step** —
the same per-step `evidence` (`{ parts, text, hasEvidence }`, derived from real `page_context` / `sourceEventId`
signals) and `confidence` already in the `SOPViewModel`.

This is the moat. The SOP surface is the surface that *proves honesty* (per `SOP_WORLDCLASS_BENCHMARK.md`
§"Honesty fixes"). Therefore the **prime directive** of this feature:

> **It must be impossible to mistake an ungrounded answer for a grounded one.**

Three consequences that govern every flow below:
1. **Every grounded answer visibly cites the step(s) and the recorded evidence it used** — click-through to the
   cited step and its captured evidence. No citation → not presented as grounded.
2. **"Not enough evidence" is a first-class, graceful TRUST state — not a failure.** The system declining to
   fabricate is the product working *correctly*. It is styled as confidence, not as an error.
3. **General knowledge, if ever surfaced, is visually quarantined** from grounded answers and labelled as such.
   Default posture: do not answer from general knowledge at all (scoped decline).

### Honesty lessons carried forward from the benchmark
- The old disabled input "**read as broken**." Lesson: **never ship a disabled-looking affordance.** Either the
  input is live, or it is replaced by an honest, non-interactive state with no false affordance. (See §11 first-use
  + §13 error states — every non-ready state is *explained*, never a dead grey input.)
- **Observed vs inferred** must be distinguished (the green "verified" check only when `outcomeObserved`). Answers
  inherit this: a citation to *observed* evidence renders differently from a claim the model *inferred* by joining
  steps.
- **N=1 disclosure** — single-run SOPs carry "based on 1 recording." Answers about frequency/consistency on N=1
  SOPs must inherit the same disclosure and must not assert patterns that need N≥2.

---

## 1. Information architecture & entry point

### 1.1 The panel's relationship to the steps
The panel is the **conversation surface**; the step list is the **evidence corpus**. The relationship is
bidirectional and must be visible:
- **Panel → steps:** every citation in an answer is a live control that scrolls to and highlights
  `#sop-step-{id}` (the step card already carries this DOM id at `:200`), expands it, and flashes its evidence row.
- **Steps → panel (P1, scoped out of v1 critical path but designed):** each step card gains a small
  "**Ask about this step**" affordance that seeds the composer with a step-scoped question
  (e.g. *"Why is step 4 here?"*) and pre-pins step 4 as context.

### 1.2 Entry-point states (the panel header)
The sticky panel header replaces the "Coming soon" pill. It has exactly one of these states at a time, and the
state is always *named honestly*:

| State | Header label | Body |
|---|---|---|
| Ready | "Ask This Process" · green "Evidence-grounded" pill | Composer + seeded questions (§3) |
| First-use | same + a one-time intro card (§11) | Composer below intro |
| Not configured | "Ask This Process" · grey "Setup needed" pill | Honest setup explainer (§13.1) — **no dead input** |
| Provider issue | "Ask This Process" · amber "Temporarily unavailable" pill | Status explainer + retry (§13.2/13.3) |

> Design rule: the composer input is **only rendered when the feature can actually answer**. When it can't
> (no key / provider down), the input is *not shown disabled* — it is replaced by the relevant explainer state.
> This directly applies the benchmark's "disabled-input-reads-as-broken" lesson.

### 1.3 Persistent provenance strip
The panel footer keeps the existing context line and extends it into a **provenance strip** always visible while
chatting:
```
Grounded in: {stepCount} steps · {systemsCount} systems · recorded {createdAt}
{N=1 ? "· Based on 1 recording — review before trusting patterns" : "· {runCount} recordings"}
```
This sets the boundary of what "this process" means *before* the user asks, and inherits the N=1 amber treatment.

---

## 2. The conversation model (scope)

- Conversation is **scoped to this process** (this `SOPViewModel` / `ProcessDefinition`). There is no cross-process
  chat in v1. The provenance strip makes the scope boundary explicit.
- History persists **per process** (§9). Opening the SOP later restores the prior thread for that process.
- Each turn is one of: **user question**, **grounded answer** (with citations), **scoped decline** (out of scope),
  **evidence-insufficient refusal**, or **error**. These five are visually distinct (§4–§8, §13).

---

## 3. Suggested / seeded questions

### 3.1 The 3 anchors (kept from the coming-soon tile, now live)
1. **"Why is this step here?"** — step-purpose / rationale grounded in evidence.
2. **"What can be automated?"** — maps to `automationHint` + automation markers already computed per step.
3. **"Where do users get stuck?"** — maps to `frictionIndicators` / `hasHighFriction` / `frictionCount`.

These three are chosen because **the SOP already computes grounded answers for them** — they will almost always
resolve to a grounded, cited answer rather than a refusal, which builds first-use trust.

### 3.2 Honest "others" (data-derived, only shown when the data exists)
Render additional chips **only** when the backing signal is present, so a suggestion never leads to a refusal:
- If `decisions.length > 0`: *"What are the decision points?"*
- If `alignment.kind` is a measured (N≥2) value: *"Has this process drifted recently?"*
- If `errorStepCount > 0`: *"How is error recovery handled?"*
- If a step has `outcomeObserved === false`: *"Which outcomes are inferred vs observed?"* (a meta-honesty question)

Suggestion chips are **labelled by what they'll cite** on hover/focus where cheap (e.g. "uses steps 3, 7"), so the
user learns the grounding model from the suggestions themselves.

### 3.3 What is deliberately NOT suggested
No suggestions that invite ungrounded answers: cost ROI in dollars, headcount, industry benchmarks, "is this
compliant with SOX," etc. If asked anyway, they route to **scoped decline** (§7) — but we never *suggest* them.

---

## 4. FLOW A — Ask → grounded answer (the happy path)

**Flow A: a grounded, cited answer**
1. **Compose.** User types in the composer or activates a suggestion chip. Submit on Enter (Shift+Enter = newline);
   a visible "Ask" button mirrors this for pointer/AT users.
2. **Optimistic echo.** The question renders immediately as a user bubble, timestamped. The composer clears and
   stays focused. Focus is **not** stolen by the incoming answer (see a11y §12).
3. **Loading / retrieval (pre-stream).** A status row appears under the question:
   *"Searching this process's evidence…"* with an indeterminate, **reduced-motion-aware** indicator and a
   **Cancel** control. `aria-live="polite"` announces "Searching evidence."
   - If retrieval finds relevant steps, it transitions to streaming (step 4).
   - If retrieval finds nothing relevant → go to **Flow C refusal** (§6). (Refusal is decided by *retrieval*, not
     by the model's willingness — this is what makes refusal trustworthy.)
4. **Stream the answer.** Tokens stream into an assistant bubble. While streaming:
   - The bubble shows a subtle "streaming" affordance and a **Stop** control.
   - `aria-live="polite"` with **chunked** announcements (not per-token) so screen readers aren't flooded (§12).
   - Citations may stream in as inline markers (§5) and also accumulate in a **"Sources" tray** docked to the
     bottom of the bubble.
5. **Settle.** On completion:
   - The streaming affordance is replaced by a **provenance header** on the bubble (§5.2):
     *"Grounded in 3 steps · highest-confidence source: step 4 (92%)."*
   - The "Sources" tray finalizes with each citation as a click-through chip.
   - Turn actions appear: **Copy**, **Cite-check** (jump to first source), 👍/👎 **feedback**, **Ask follow-up**.
6. **Follow-up.** Composer remains scoped to the same process; the prior turn is visible context. (No
   server-side "memory" claims are made beyond the visible thread — see §9.)

**Cancel/Stop semantics:** Cancel (pre-stream) discards the turn. Stop (mid-stream) keeps the partial answer but
labels it **"Stopped — partial answer"** and still shows whatever citations were already grounded. A partial answer
never loses its citations.

---

## 5. CITATION RENDERING SPEC (the moat)

> Goal: every grounded claim is traceable to a step and its recorded evidence in **one click**, and the *grounded
> vs not* distinction is visible at a glance.

### 5.1 Inline citation markers
- Grounded sentences/claims carry an inline, superscript-style **citation chip**: `[S4]` (S = step, 4 = ordinal).
  Multiple sources: `[S3,S7]`.
- The chip is a real button (not decorative): `role="link"`-styled control, focusable, with
  `aria-label="Source: step 4, Submit Opportunity, recorded 2026-06-10"`.
- **Hover/focus → citation popover** (the provenance card, §5.3).
- **Activate → jump-to-step:** scrolls to `#sop-step-{id}`, expands the card, and flashes the evidence row inside
  it (the `step.evidence.text` line, e.g. *"Salesforce · Opportunities · Click 'Save Opportunity'"*). Focus moves
  to the step card heading; a "← back to answer" affordance returns focus to the citation chip (§12).

### 5.2 Per-bubble provenance header (always present on grounded answers)
At the top of every grounded assistant bubble:
```
◇ Grounded answer · 3 sources · model: {provider/model}
```
- The diamond/"grounded" lockup is the **visual signature of groundedness**. It is *only* rendered when the answer
  has ≥1 valid citation. No diamond, no grounded styling — by construction the user cannot see a "grounded" header
  on an uncited answer.
- The model name is shown for provenance honesty (the user knows a model wrote the prose; the *facts* are cited).

### 5.3 The citation provenance card (popover / Sources-tray chip detail)
Each source renders as:
```
┌──────────────────────────────────────────────┐
│  STEP 4 · Submit Opportunity                   │   ← step.title + ordinal
│  Salesforce · Opportunities · Save Opportunity │   ← step.evidence.text (real captured signal)
│  Recorded 2026-06-10 · confidence 92%          │   ← createdAt-derived + step.confidence
│  ● Observed evidence                           │   ← outcomeObserved === true
│  → View step in SOP   → View backing evidence  │   ← click-through controls
└──────────────────────────────────────────────┘
```
Honesty variants of the badge line (this is load-bearing):
- `step.evidence.hasEvidence === true` → **"● Observed evidence"** (green dot). Click-through goes to the real
  evidence snippet.
- `step.evidence.hasEvidence === false` but the step exists → **"◐ Step reference (no captured signal)"** (amber).
  The model used the step's *structure* (title/category) but there is **no recorded evidence snippet** to show.
  This MUST NOT render as observed evidence. Click-through goes to the step but the evidence row honestly reads
  "No captured evidence for this step."
- `outcomeObserved === false` on a cited step, when the claim concerns the *outcome* → the card appends
  **"outcome inferred, not observed"** so an inferred outcome is never dressed as verified.

### 5.4 The "based on step 4, recorded 2026-06-10" inline phrasing
Where an answer references a single dominant source, the prose itself is encouraged to name it:
> *"This step exists to record the opportunity in the CRM — **based on step 4, recorded 2026-06-10**."* `[S4]`

The inline natural-language attribution + the machine-readable `[S4]` chip reinforce each other. The date comes
from the SOP's `createdAt` provenance, never invented.

### 5.5 Confidence / provenance surfacing on the answer
- Each grounded bubble shows an aggregate provenance: **highest-confidence source** and **source count**.
- If *all* cited steps are low-confidence (`isLowConfidence`), the bubble carries a quiet amber note:
  *"Sources for this answer are low-confidence — review before acting."* (Inherits the existing per-step
  confidence model; no new score invented.)
- We never display a fabricated "answer confidence %." Confidence shown is always **the cited steps' own
  confidence**, which is real.

### 5.6 The hard invariant (enforced in design, to be enforced in impl)
- **No citation ⇒ the bubble cannot use grounded styling and cannot claim groundedness.** Such a response is
  routed to refusal (§6) or scoped decline (§7) instead of being shown as an answer. There is no fourth path where
  uncited prose appears as if it were grounded.

---

## 6. FLOW C — "Not enough evidence" refusal (a TRUST feature, not a failure)

**Flow C: evidence-insufficient refusal**
1. User asks a question that *is in scope* (it's about this process) but the recordings don't contain enough
   evidence to answer (e.g. *"How long does step 6 usually take?"* on an N=1 SOP where duration variance is
   unknowable; or *"Why did the user hesitate at step 9?"* where no friction signal exists).
2. Retrieval returns **no sufficient grounded support** → the system **declines to answer**.
3. Render the **refusal card** — styled as *calm confidence*, not red/error:

```
┌─────────────────────────────────────────────────────────┐
│  ⃝  Not enough evidence to answer this honestly           │   ← neutral/slate, NOT red
│                                                            │
│  I can only answer from what was actually recorded in     │
│  this process, and the recordings don't show enough to    │
│  answer that. I won't guess.                               │
│                                                            │
│  What's missing:  no timing data across runs (this SOP    │   ← specific, honest reason
│  is based on 1 recording).                                 │
│                                                            │
│  I CAN answer, for this process:                           │   ← redirect to the answerable
│   • Why each step exists        • What's automatable       │
│   • Where friction was observed                            │
└─────────────────────────────────────────────────────────┘
```

Design rules for refusal:
- **Tone = trustworthy, not apologetic-broken.** Copy frames declining as a *feature*: *"I won't guess."*
- **Always give the honest *reason*** ("no timing data across runs," "no friction signal recorded at step 9,"
  "this needs ≥2 recordings"). The reason is derived from the same gating signals the SOP already uses
  (`hasEvidence`, N-count, `alignment.kind === 'insufficient'`).
- **Always offer a redirect** to ≥2 question types we *can* ground for this process (reuse §3 logic — only offer
  what the data supports).
- The refusal bubble carries the **same grounded-provenance honesty**: it does NOT show the "◇ Grounded answer"
  diamond, because it isn't one. It has its own neutral signature.
- N=1 specialization: when the limiting factor is run count, the refusal explicitly says
  *"based on 1 recording — record this process again to unlock pattern questions,"* tying back to the benchmark's
  N=1 treatment and giving a concrete next action.

> Refusal is the most important screen in this feature. If it ever reads as "the AI is dumb/broken," we've lost
> the trust argument. It must read as "the AI is *principled*."

---

## 7. FLOW D — Out-of-scope ("must-not-answer") → scoped decline

**Flow D: scoped decline**
1. User asks something **outside the boundary of this process** — general knowledge, other tools, legal/compliance
   verdicts, dollar ROI, "write me code," "what's the weather," etc.
2. The system does **not** attempt a general-knowledge answer (default posture, §10). It returns a **scoped
   decline** distinct from the evidence refusal:

```
┌─────────────────────────────────────────────────────────┐
│  ⤳  That's outside what this process can tell us          │   ← distinct icon/tone from §6
│                                                            │
│  "Ask This Process" only answers from THIS procedure's    │
│  recorded evidence. That question is about {general       │
│  knowledge / another tool / a judgment we can't observe}. │
│                                                            │
│  Try asking about this process instead:                    │
│   • Why is step 3 here?   • What can be automated?         │
└─────────────────────────────────────────────────────────┘
```

- **Why two distinct decline states (§6 vs §7)?** They mean different things and the user must learn the boundary:
  §6 = *"good question about this process, but the evidence isn't there"*; §7 = *"that's not what this surface is
  for."* Collapsing them would teach the user the feature is flaky rather than scoped.
- The scoped decline **names the category** it's declining (general knowledge / other tool / unobservable
  judgment) so the boundary is *learnable*, then redirects to answerable questions for this process.
- Compliance/legal questions get a specific scoped-decline variant: *"I can show you the recorded evidence and
  drift signal; I can't render a compliance verdict."* — pointing to the alignment/drift signal (which is real)
  rather than fabricating a judgment.

### 7.1 Optional "general knowledge" answer mode (gated, off by default)
If product ever allows the model to add *general* context (e.g. "what is a CRM"), it is rendered in a **visually
quarantined block**:
```
ⓘ General knowledge — NOT from your recordings
{general answer}
```
- Grey/dashed border, distinct icon, **no diamond, no citations**, explicitly labelled "not from your recordings."
- Default = **disabled**; this is a product decision (see Decision §15.4). Until enabled, all such questions are
  scoped-declined (§7).

---

## 8. Streaming, loading & in-flight states (consolidated)

| Phase | Visual | a11y |
|---|---|---|
| Submitting | User bubble appears instantly; composer clears | focus stays in composer |
| Retrieving | "Searching this process's evidence…" + Cancel | `aria-live=polite` "Searching evidence" |
| Streaming | Tokens stream; Stop control; citations accrue in Sources tray | chunked `aria-live=polite` (§12) |
| Settled (grounded) | ◇ provenance header + Sources tray + turn actions | announce "Answer ready, 3 sources" |
| Settled (refusal/decline) | §6 / §7 cards | announce the decline + that it's intentional |
| Stopped | "Stopped — partial answer" + whatever was grounded | announce "stopped, partial answer" |

- **Reduced motion:** all streaming/flash animations respect `prefers-reduced-motion` — fall back to a static
  "answering…" label and an instant citation-highlight instead of a flash.
- **Latency honesty:** if retrieval/stream exceeds ~10s, the status updates to *"Still searching the evidence…"*
  rather than spinning silently.

---

## 9. Conversation history within a process

- **Per-process thread.** History keys to the process/`ProcessDefinition` id. Reopening the SOP restores the
  thread for *that* process only.
- **Provenance integrity over time:** a stored answer keeps its citations. If the SOP is later **re-derived**
  (new recording, ordinals shift, a cited step disappears), stored citations are **re-validated on load**:
  - Still valid → click-through works as normal.
  - Step changed/removed → the citation chip renders **"source changed since this answer"** (amber, non-clickable
    or click-to-explain). We never silently relink to a different step — that would launder provenance.
- **History controls:** clear thread (with confirm), and a per-turn timestamp. No cross-process search in v1.
- **Honesty about persistence:** the UI says exactly where history lives (this process, this workspace). No implied
  "the AI remembers everything" — only the visible thread is the memory.
- **Empty history = first-use (§11), not a blank box.**

---

## 10. The grounding contract (what "grounded" means, exactly)

Stated plainly in design so impl can't drift:
1. An answer is **grounded** iff it cites ≥1 step whose claim is supported by that step's data
   (`evidence`, `confidence`, computed markers like `automationHint`/`frictionIndicators`).
2. **Observed** grounding (`hasEvidence === true`) outranks **structural** grounding (`hasEvidence === false`,
   step reference only) and is badged differently (§5.3).
3. If the model cannot cite, it must **refuse (§6)** or **scoped-decline (§7)** — never present uncited prose as an
   answer.
4. **Inferred outcomes** (`outcomeObserved === false`) are labelled inferred wherever the claim depends on them.
5. **N≥2-gated** claims (frequency, "usually," drift, consistency) are only made when the data supports them;
   otherwise → §6 with the N=1 reason. Mirrors the existing `alignment` gating (`'insufficient'` for N<2).

---

## 11. First-use education (set honest expectations)

**Flow B: first interaction**
1. On first open of a *ready* panel, a one-time **intro card** sits above the composer:
```
┌──────────────────────────────────────────────┐
│  Ask This Process                              │
│  Answers grounded in what was actually         │
│  recorded — every answer cites the steps and   │
│  evidence it used.                             │
│                                                │
│  ✓ What it does       ✗ What it won't do        │
│   • Explains steps      • Guess or fabricate    │
│   • From your evidence  • Answer off-topic      │
│   • Cites every claim   • Make compliance calls │
│                                                │
│  [ Try: "Why is this step here?" ]  [ Got it ] │
└──────────────────────────────────────────────┘
```
2. "Got it" dismisses (persisted per user, not per process). The Try-chip seeds a known-groundable question so the
   *first* answer the user sees is a clean cited answer (teaching the citation model by example).
3. The ✓/✗ columns are the expectation contract: the user learns *before asking* that refusal/decline are expected,
   principled behaviors — so when they hit §6/§7 it confirms the contract rather than disappointing.

---

## 12. Accessibility (keyboard, screen reader, focus)

**Keyboard**
- Composer: Enter submits, Shift+Enter newline, Esc clears/cancels in-flight.
- Suggestion chips: roving tabindex, Enter/Space activates.
- Citation chips `[S4]`: focusable in reading order; Enter jumps to step; on arrival a visible
  **"← Back to answer"** control returns focus to the originating chip (no focus trap, no lost place).
- Stop/Cancel reachable by keyboard while in-flight.

**Screen reader — streamed answers**
- The answer container is `aria-live="polite"`, `aria-atomic="false"`, announced in **chunks** (sentence/clause
  granularity), never per token — per-token would flood AT.
- On settle, a single summary is announced: *"Answer ready. Grounded in 3 sources: steps 3, 4, 7."*
- Refusal/decline announce intent: *"Not enough evidence — the system declined to answer; this is expected."* so
  AT users get the trust framing, not just "no answer."

**Screen reader — citations**
- Each `[S4]` chip has a full `aria-label`: *"Source: step 4, Submit Opportunity, recorded 2026-06-10, observed
  evidence."* (or "step reference, no captured evidence" for the structural variant).
- The Sources tray is a labelled list (`aria-label="Sources for this answer"`) so a user can navigate all sources
  without parsing inline markers.

**Focus & motion**
- Incoming answers do **not** steal focus from the composer.
- Citation jump moves focus deliberately (it's a user action) and is reversible.
- All flashes/streams respect `prefers-reduced-motion`.

---

## 13. Error & not-ready states (no dead inputs — ever)

Each state **replaces the composer with an explainer** (never shows a disabled grey input), applying the
"disabled-reads-as-broken" lesson.

### 13.1 No API key / not configured
```
⚙  Ask This Process needs setup
This feature uses an AI provider to read your process's evidence.
An admin needs to connect a provider key in Settings → AI.
[ Open AI settings ]   (admins)   ·   "Ask your workspace admin" (non-admins)
```
- No composer. No fake input. Clear owner of the next action (admin vs not).
- The rest of the SOP (steps, evidence, alignment) is unaffected — the feature degrades locally, the page doesn't.

### 13.2 Provider down / network error
```
⚠  Ask is temporarily unavailable
The AI provider didn't respond. Your process and its evidence are unaffected.
[ Try again ]
```
- Amber, not red-catastrophe. Reassures that the *data* is fine; only the chat is down.
- Retry re-issues the last question (kept in composer) without losing the thread.

### 13.3 Rate-limited
```
⏳  Too many questions right now
The AI provider is rate-limiting. Try again in {N}s.
[ Retry in {N}s ]   (auto-enables on countdown)
```
- Honest, specific, with a countdown rather than a silent failure. The retry control is **disabled with a visible
  countdown reason** — which is acceptable here because the *reason and timer are shown*, unlike a dead input with
  no explanation.

### 13.4 Mid-stream failure
- Keep the partial answer, label it **"Answer interrupted — provider error,"** preserve any citations already
  grounded, offer **Resume / Retry**. Never delete a partially-grounded answer silently.

### 13.5 Empty/garbage input
- Submit is inert on empty; whitespace-only does nothing. No error shouting — just no-op with the composer
  retaining focus.

---

## 14. Mobile pattern (the rail is desktop-only today)

Today the panel is `hidden lg:block` — there is **no Ask affordance on mobile/tablet.** Design:

### 14.1 Entry
- A persistent **"Ask This Process"** action appears as a bottom-pinned bar (or a FAB-style button) on
  small viewports, below the step content. It is *not* hidden — mobile is exactly where a frontline operator is
  doing the work.
- Tapping opens a **full-height bottom sheet** (drag-to-dismiss + explicit close), not a cramped popover.

### 14.2 In-sheet behavior
- Same five turn types (§4–§8, §13). Composer docks above the keyboard; the thread scrolls.
- **Citations on mobile:** tapping `[S4]` **closes the sheet, scrolls to the step, expands it, flashes evidence**,
  and shows a **"↩ Back to answer"** snackbar/pill that reopens the sheet at the same turn. This preserves the
  click-through-to-evidence moat on a single-pane device.
- The Sources tray is a horizontally-scrollable chip row under each answer (thumb-reachable).

### 14.3 Constraints
- Streaming + reduced-motion + a11y rules from §8/§12 apply identically.
- First-use intro (§11) shows as the sheet's initial state on mobile.
- Not-ready/error states (§13) replace the sheet body, same as desktop replaces the composer.

---

## 15. Top UX decisions needing product/CEO input

1. **General-knowledge mode (§7.1): off by default, or allow quarantined general answers?**
   Recommendation: **OFF for launch.** Scoped-decline everything ungrounded. The moat is "grounded-only";
   introducing a quarantined general mode early risks blurring the line we're selling. Revisit post-launch.

2. **History persistence scope & retention (§9):** per-process forever, or session/TTL? And do answers store the
   model output, or re-generate on open? Recommendation: **persist per-process with citation re-validation on
   load**; store the answer text but mark stale citations. Needs a data/retention + privacy ruling.

3. **Provider/BYOK model & who owns the key (§13.1):** workspace-level admin key, or per-user BYOK? This drives the
   "needs setup" owner-of-next-action copy and the admin vs non-admin split. (Ties to the broader AI-platform BYOK
   direction.)

4. **Citation granularity — step-level only, or step + specific evidence event (`sourceEventId`)?**
   v1 design cites **step-level** with click-through to the step's evidence snippet (real today). Going to
   *individual evidence-event* citations is a stronger moat but needs the `sourceEventId`→event surfacing wired.
   Recommendation: **ship step-level now, design the event-level chip as the P2 upgrade** (the popover already has
   a "View backing evidence" slot for it).

5. **Confidence display on answers (§5.5):** show only the cited steps' own confidence (real), or also compute an
   aggregate "answer confidence"? Recommendation: **cited-steps confidence only — never an invented answer score.**
   Confirm this is acceptable to GTM (some buyers expect a single confidence number; we argue the honest version is
   the differentiator).

---

## Appendix A — State machine (one turn)

```
                 ┌─────────────┐
   submit ──────▶│  RETRIEVING │
                 └──────┬──────┘
        no support ┌────┴─────┐ support found
                   ▼          ▼
            ┌───────────┐  ┌───────────┐
   out-of- │  REFUSAL  │  │ STREAMING │──stop──▶ STOPPED(partial+citations)
   scope?  │   (§6)    │  └─────┬─────┘
     │     └───────────┘        │ complete
     ▼                          ▼
┌──────────────┐         ┌─────────────────┐
│ SCOPED-DECLINE│        │ GROUNDED ANSWER │  (◇ header + citations + Sources tray)
│    (§7)       │        └─────────────────┘
└──────────────┘
   (any phase) ──provider error──▶ ERROR STATE (§13.2/13.3/13.4, partial kept)
```

## Appendix B — Honesty invariants checklist (for QA/impl gate)
- [ ] No grounded ("◇") styling appears without ≥1 valid citation.
- [ ] Every citation click-through reaches the real step + its real evidence row (or honest "no captured evidence").
- [ ] `hasEvidence===false` sources never render as "observed evidence."
- [ ] `outcomeObserved===false` claims are labelled inferred.
- [ ] N=1 SOPs never assert frequency/pattern claims; they refuse with the N=1 reason.
- [ ] Refusal (§6) and scoped-decline (§7) are visually & semantically distinct, both non-error-styled.
- [ ] No not-ready/error state renders a disabled grey input (no false affordance).
- [ ] Stale citations after SOP re-derivation are flagged, never silently relinked.
- [ ] Streamed answers announce in chunks; citations have full aria-labels; focus is reversible.
- [ ] Mobile preserves click-through-to-evidence (sheet → step → back-to-answer).
```
