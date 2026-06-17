# ADR-001 — Determinism Boundary + Citation Grammar ("Ask This Process")

- **Status:** Accepted
- **Date:** 2026-06-17
- **Phase:** A (deterministic, NO-LLM foundation)
- **Supersedes / refines:** the boundary statement in `ARCHITECTURE_ASK_THIS_PROCESS.md` §2 and `DEVELOPMENT_PLAN.md` "determinism boundary". Folds in the feasibility correction (`IMPLEMENTATION_FEASIBILITY_ASK_THIS_PROCESS.md` §1.1): the citation primitive lives on the **raw `process_output` SOP artifact**, not the client `SOPViewModel`.
- **Scope of this ADR:** the load-bearing decisions for Phase A only — the determinism boundary, the citation grammar, the "grounded vs refused" contract, and the non-authoritative one-way rule. It deliberately decides nothing about the provider adapter, BYOK, persistence, or the API route (those are later ADRs / iterations).

---

## Context

Ledgerium's product promise is *determinism + evidence-traceability*: every output must be reproducible and traceable to source events. "Ask This Process" introduces an LLM, which is inherently non-deterministic. The architecture resolves the tension with **one rule**: keep all *grounding* deterministic and quarantine the LLM as the single non-deterministic, non-authoritative, one-way component.

Phase A builds the deterministic foundation **with no LLM at all**: a pure context-builder, a pure citation-validator, and pure deterministic answer templates. This ADR records the decisions those modules encode so that the later (Phase B) LLM substrate cannot weaken them.

CEO mandate for this work: **honesty is the moat (cite-or-refuse; never fabricate)** and **determinism is the core contract**. This engine is the anti-hallucination gate.

---

## Decision 1 — The Determinism Boundary

There is exactly **one** non-deterministic component in the whole feature: the LLM call, reachable only through `AIProviderAdapter` (Phase B). Everything that decides **what evidence an answer is grounded on** and **what an answer is allowed to cite** is deterministic and runs **outside** the adapter.

| Stage | Deterministic? | Built in |
|---|---|---|
| Load persisted SOP (`process_output`) + intelligence signals | YES (read-only) | route (Phase B) |
| `buildAskContext` → `GroundedEvidenceBundle` + `CitationSet` + `bundleHash` | **YES** (pure) | **Phase A** |
| Deterministic answer templates (count / shape / decision / conformance) | **YES** (pure) | **Phase A** |
| LLM generation | **NO** (isolated) | Phase B |
| `validateCitations` (claimed ∩ authorized) | **YES** (pure) | **Phase A** |
| Refusal / scoped-decline decision | **YES** (pure policy) | **Phase A** |

### The three boundary rules (the invariants)

1. **Grounding is deterministic.** Same SOP artifact ⇒ byte-identical `GroundedEvidenceBundle`, identical closed `CitationSet`, identical `bundleHash`. No clock (`Date.now()`), no `Math.random()`, no `new Date()`-of-now, no network, no I/O in the grounding modules. Any timestamp in the bundle comes from a value **stored on the artifact** (e.g. `SOP.generatedAt`), formatted UTC — never the wall clock. Input ordering does not change the output: the builder sorts/normalizes into a canonical order before serializing.

2. **The LLM is isolated and one-way.** The grounding modules (`contextBuilder`, `citationValidator`, `answerTemplates`) have **ZERO** import of any provider/LLM/network module. Enforced by a static no-import test over the module directory (+ `madge --circular` when available), mirroring the platform-vision rule "`ai-recommendation-engine` has zero `ai-provider-adapter` import". Model output is **untrusted**: it is filtered through `validateCitations` and may only *reference* ids the deterministic layer already authorized.

3. **No back-flow; the answer is a disclosed, non-authoritative, derived artifact.** LLM output (and any answer text these modules produce) is `isAuthoritative = false`. It MUST NOT re-enter the deterministic pipeline, MUST NOT mutate the SOP / events / intelligence, and is persisted only in a dedicated `AskTurn` record (Phase B) whose `isAuthoritative` has no setter path to `true`. Citations point **FROM** the answer **TO** pre-existing observed evidence — never the reverse.

**Phase-A consequence:** the deterministic answer templates are themselves non-authoritative derived artifacts. They carry `isAuthoritative: false` exactly like an LLM answer would, even though no model was involved — the honesty disclosure is a property of *the answer surface*, not of *who phrased it*.

---

## Decision 2 — The Citation Grammar (the closed, machine-checkable contract)

A citation is a reference from an answer to one authorized member of the closed `CitationSet`. There are exactly **three** citation kinds. The textual grammar (the tokens a Phase-B LLM will be instructed to emit, and that `validateCitations` parses) is:

```
[[step:<ordinal>]]      step-level    — <ordinal> is a 1-based integer SOPStep.ordinal
[[event:<sourceEventId>]]  event-level — <sourceEventId> is a SOPInstruction.sourceEventId
[[process]]             process-level — a whole-process fact (counts/shape from processMeta)
```

Grammar rules (decided here, enforced by the parser + validator):

- **Step token:** `[[step:N]]` where `N` matches `^[1-9][0-9]*$`. Authorized IFF `N ∈ CitationSet.stepOrdinals`.
- **Event token:** `[[event:ID]]` where `ID` is a non-empty opaque string with no `]` character (so the token cannot be ambiguously terminated). Authorized IFF `ID ∈ CitationSet.sourceEventIds`.
- **Process token:** `[[process]]` — always authorized when the bundle is non-empty (it cites the process itself; `processMeta` counts are facts of the bundle). It is the **only** legal citation for whole-process meta facts ("how many steps are here?"), so such answers are never spuriously refused for lack of a step/event id.
- **Anything else** (malformed token, unknown kind, an `N`/`ID` not in the set) is **dropped silently** by the validator. A claimed id outside the `CitationSet` can never survive — that is the structural anti-fabrication guarantee.
- A citation is **valid IFF** it parses to a token whose id is a member of `CitationSet`. The contract is therefore machine-checkable by pure set membership.

The `CitationSet` is **closed**: it is the exhaustive set of every `step` ordinal and every `event` sourceEventId present in the `GroundedEvidenceBundle`, plus the `process` token. Nothing outside the bundle is citable.

`bundleHash` (canonical, order-stable): the bundle is serialized by a dedicated canonical serializer (object keys emitted in a fixed declared order; arrays in their already-canonical order; numbers formatted via a fixed rule) and hashed with sha256. The hash **excludes** the `bundleHash` field itself. Identical SOP ⇒ identical hash; reordered input ⇒ identical hash (the builder canonicalizes first). A pinned-hash golden test guards against silent serializer drift — the single biggest hidden non-determinism trap (feasibility R-3).

---

## Decision 3 — "Grounded" vs "Refused" (refusal is a first-class result)

Every Phase-A answer is one of exactly two result kinds — never an error, never a fabrication:

- **`grounded`** — the templates deterministically derived the answer **only** from the `GroundedEvidenceBundle`, and it carries ≥1 citation drawn from the `CitationSet`. A grounded answer with **zero** valid citations is a contradiction in terms and is **downgraded to a refusal** (this is the structural enforcement of "cite or don't claim").

- **`refused`** (a.k.a. scoped-decline) — an **honest, successful non-answer**. It names *why* it cannot answer (a refusal-reason class) and, where one exists, offers an answerable reframing. It carries **zero** citations and `isAuthoritative: false`. A refusal is distinct from an error: an error is an operational failure where *no judgment was made*; a refusal is a *deliberate evidence-honest decision not to assert*.

Refusal-reason classes (Phase A):

| reason | when |
|---|---|
| `insufficient_data` | the bundle has no citable evidence to support the question — e.g. empty SOP, or an N≥2-gated question (conformance / variation / timing) on a single-recording cohort (N<2). |
| `out_of_scope` | the question is a **must-not-answer** class the observed evidence cannot support: ROI/financial, compliance/regulatory, headcount/cost, prediction/forecast, human intent/motivation, out-of-evidence factual (PII / field values), or general world knowledge. |
| `no_relevant_evidence` | the question is in-scope and a template *type* might apply, but no evidence in this specific process matches it — and a free-form question that no deterministic template can ground. |

**Honesty default:** when uncertain whether a question is answerable, **decline (with reframing) rather than risk an ungrounded answer.** A false "I don't know" is cheap; a confident fabrication is a category-defining failure. Must-not-answer classes follow the *scope-down* voice (PRD DD-E): decline the unsupported claim, then name what *is* observable ("I can't give a dollar figure — Ledgerium has no labor-cost data — but I can tell you which steps look automatable").

**N-gating:** conformance / variation / timing answers require N≥2 (the existing `deriveAlignmentPill` gate). At N<2 they refuse with `insufficient_data` and the single-recording disclosure — never presented as a pattern.

---

## Consequences

- The honesty machinery (cite-or-refuse, closed citation universe, N-gating, must-not-answer) ships and is fully testable **before any LLM exists**. Phase B reuses these exact modules; it cannot widen the citation universe or bypass the refusal policy.
- A reviewer can always reproduce the exact evidence an answer was grounded on (`bundleHash` + the SOP) and every surviving citation resolves to a real ordinal / sourceEventId. The non-determinism (Phase B prose) is quarantined; the trust chain (evidence → citation) stays deterministic and machine-checkable.
- The deterministic templates guarantee a *floor* of always-answerable questions (count / shape / decision / conformance), directly mitigating over-refusal (PRD R-4) — those answers never depend on a model.

## Rejected alternatives

- **Ground from the client `SOPViewModel`.** Rejected: `SOPViewInstruction` drops `sourceEventId`, which would make every event-level citation un-emittable. The builder consumes the raw `process_output` SOP artifact server-side (feasibility G-1). This also keeps `sourceEventId` + raw page titles server-side (a privacy win).
- **`JSON.stringify` for the bundle hash.** Rejected: key order / number formatting are not guaranteed stable, silently breaking reproducibility. A dedicated canonical serializer + pinned-hash test is mandatory.
- **Treat a citation-free answer as valid.** Rejected: it inverts the honesty contract. Zero valid citations ⇒ refusal (except whole-process meta facts, which MUST carry `[[process]]`).
