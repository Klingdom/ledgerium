# ARCHITECTURE — "Ask This Process"

**Status:** DRAFT (Define phase). Analysis/planning only — NO product code.
**Author:** system-architect
**Date:** 2026-06-16
**Surface:** SOP Analysis view (`SOPIntelligenceMode.tsx` → `AskThisProcessPanel`, currently a non-interactive "Coming soon" tile).
**Parent vision:** `docs/meta/AI_INTEGRATION_PLATFORM_VISION_REVIEW_001.md`. This feature is a **concrete, bounded first instance** of that vision (single-process, read-only, recommendation-class — no execution). It REUSES the vision's patterns (AIProviderAdapter, BYOK envelope encryption, two-table audit trail, trust tiers, the `recommendation-engine has ZERO provider-adapter import` rule) and does NOT reinvent them.

---

## 0. Executive Framing

"Ask This Process" lets a user type a natural-language question about **one recorded process** (the SOP currently on screen) and get back a short answer that is **grounded only in that process's observed evidence**, with **machine-checkable citations** to specific steps and source events. Example rendered answer: *"This step exists to confirm the opportunity saved — based on **step 4** (recorded 2026-06-10)."*

The product promise is honesty, not eloquence: **refuse over fabricate, cite everything.** An LLM answer is inherently non-deterministic, but Ledgerium's core invariant is determinism + evidence-traceability. The entire architecture is organized around one rule: a **DETERMINISM BOUNDARY** that keeps grounding deterministic and isolates the LLM as the single non-deterministic, non-authoritative, one-way-output component.

This is a **recommendation-class** feature (Tier A/B, dry-run-by-nature, zero execution, zero write-back). It is the lowest-risk possible on-ramp to the AI vision: there is no execution blast radius, no standing orders, no irreversibility classification — only retrieval + a disclosed derived answer.

---

## 1. Component Architecture

Five components, layered strictly. Arrows are the ONLY permitted import/data directions.

```
                       DETERMINISTIC ZONE                       │   NON-DETERMINISTIC ZONE
                                                                │
  ┌──────────────────────┐    ┌─────────────────────────────┐  │   ┌──────────────────────────┐
  │ Persisted SOP +       │    │ ask-context-builder          │  │   │ AIProviderAdapter         │
  │ intelligence          │──▶ │ (NEW pure module)            │──┼──▶│ (interface; isolated)     │
  │ (process_engine SOP,  │    │                              │  │   │  - AnthropicAdapter        │
  │  intelligenceJson,    │    │  buildAskContext(            │  │   │  - OpenAIAdapter (later)   │
  │  process_map nodes)   │    │    sop, signals, question)   │  │   │  - (BYOK key, in-process)  │
  └──────────────────────┘    │   → GroundedEvidenceBundle    │  │   └──────────────────────────┘
                               │     + CitationSet (det.)      │  │              │
                               └─────────────────────────────┘  │              │ raw text + claimed cite ids
                                            │                    │              ▼
                                            │ bundle+citations   │   ┌──────────────────────────┐
                                            ▼                    │   │ citation-validator        │
                               ┌─────────────────────────────┐  │   │ (NEW pure module)         │
                               │ ask API route                │◀─┼───│  intersect claimed cites  │
                               │ /api/workflows/[id]/ask      │  │   │  with deterministic set;  │
                               │  - auth + plan gate           │  │   │  drop hallucinated ids     │
                               │  - assembles bundle (det.)    │  │   └──────────────────────────┘
                               │  - calls adapter (non-det.)   │  │
                               │  - validates citations (det.) │  │
                               │  - persists turn (audit)      │  │
                               │  - {data,error,meta} envelope │  │
                               └─────────────────────────────┘  │
                                            │                    │
                                            ▼                    │
                               ┌─────────────────────────────┐  │
                               │ AskThisProcessPanel (UI)     │  │
                               │  renders answer + clickable   │  │
                               │  citations ("based on step 4")│  │
                               │  + "AI-generated, not         │  │
                               │  authoritative" disclosure    │  │
                               └─────────────────────────────┘  │
```

### 1.1 `ask-context-builder` (NEW pure module) — the deterministic heart

Location: `apps/web-app/src/lib/ask-this-process/contextBuilder.ts` (web-app lib, parallel to `metrics-input-adapter.ts` and `sopIntelligenceExtract.ts`). Pure, no I/O, no `Date.now()`, no `Math.random()`, no network. **Same family as the existing `adapters/sopIntelligence.ts` render-only purity contract.**

Responsibility: given (a) the already-persisted, already-computed `SOP` model, (b) the `SopIntelligenceInput` signals, (c) per-step `StepPageContextMap`, and (d) the raw question string, **deterministically** produce:

- a `GroundedEvidenceBundle` — the exact, ordered, structured context that will be handed to the LLM (and nothing else may be handed to the LLM); and
- a `CitationSet` — the closed, authoritative set of citation ids that the LLM is ALLOWED to cite (every step ordinal + every `sourceEventId` present in the bundle). The LLM may cite a subset; it may NOT introduce any id outside this set.

Determinism guarantee: `buildAskContext(sop, signals, pageContext, question)` returns byte-identical output for identical inputs. The question text influences ONLY (in v1) an optional deterministic relevance ordering/annotation (see §4); it never injects external data.

This module imports the SOP/process-engine TYPES only. It has **ZERO `AIProviderAdapter` import** (enforced; §3) — mirroring the platform rule `ai-recommendation-engine` has zero `ai-provider-adapter` dependency.

### 1.2 `AIProviderAdapter` (interface + adapters) — the only non-deterministic component

Location: `apps/web-app/src/lib/ai-provider-adapter/` (REUSE the vision's `AIProviderAdapter` interface; do NOT define a new one). The adapter is the sole holder of the provider call. It accepts a redacted, fully-assembled prompt payload (already built from the `GroundedEvidenceBundle`) + a resolved credential and returns raw text + the model's *claimed* citation ids. It performs **no grounding** and has **no access** to the database, the SOP, or any source-of-truth beyond what the route hands it.

The adapter REJECTS any payload containing forbidden fields (Tier-1 redaction stage, §6.4) — fail-loud. Credentials are decrypted in-process at call-time and never returned to the response layer (BYOK envelope-encryption pattern, vision §10.1).

### 1.3 `citation-validator` (NEW pure module) — the one-way gate back

Location: `apps/web-app/src/lib/ask-this-process/citationValidator.ts`. Pure. Takes the LLM's *claimed* citation ids and the deterministic `CitationSet`, returns only the intersection (claimed ∩ authorized), tagged with their resolved evidence (step ordinal, `sourceEventId`, recorded-at). **Any claimed id not in the deterministic set is silently dropped** (a hallucinated citation is treated as if not cited; it never reaches the UI as a "verified" reference). If, after intersection, an answer that made factual claims has zero valid citations, the route MAY downgrade the answer to a refusal (policy decision, §6.5).

### 1.4 `ask` API route

Location: `apps/web-app/src/app/api/workflows/[id]/ask/route.ts` (sibling to existing `analyze`, `share`, `variants` sub-routes). Orchestrates the pipeline, owns auth/plan-gating, persistence, and the `{data,error,meta}` envelope. Detailed in §5.

### 1.5 `AskThisProcessPanel` (UI)

The existing coming-soon tile becomes interactive. Renders the question input, the answer, **clickable citation chips** that scroll to / highlight the cited `#sop-step-{id}` element (the DOM ids already exist — `SmartStepCard` renders `id={`sop-step-${step.id}`}`), the refusal state, the evidence-used count, and a persistent **non-authoritative disclosure** ("AI-generated answer grounded in recorded evidence — review before relying on it"). Reuses the existing violet "Ask This Process" visual shell.

---

## 2. DETERMINISM BOUNDARY (the central section)

### 2.1 The boundary, stated precisely

There is exactly one non-deterministic component: the LLM call inside `AIProviderAdapter`. Everything that decides **what evidence the answer is grounded on** and **what the answer is allowed to cite** is deterministic and runs OUTSIDE the adapter.

| Stage | Deterministic? | Why |
|---|---|---|
| Load persisted SOP + intelligence + page context | YES | Read-only DB fetch of immutable/derived artifacts |
| `buildAskContext` → `GroundedEvidenceBundle` + `CitationSet` | **YES** | Pure function; same process + same question → identical bundle + identical authorized citation set |
| Prompt assembly + Tier-1 redaction | YES | Pure transform of the bundle (no external data added) |
| **LLM generation** | **NO** | The single isolated non-deterministic component |
| `citation-validator` (claimed ∩ authorized) | **YES** | Pure set intersection against the deterministic `CitationSet` |
| Refusal decision (no key / no evidence / no valid citations) | YES | Deterministic policy over deterministic inputs |
| Persistence of the turn | YES (mechanically) | Stores the question, the deterministic bundle hash, the answer text, and the validated citations |

### 2.2 The three boundary rules (the load-bearing invariants)

1. **Grounding is deterministic.** Same process + same question ⇒ identical evidence set + identical authorized citation set. The evidence selection and the citation universe are computed by a pure module (`ask-context-builder`); the question never pulls in data from outside the process; no clock, no randomness, no network influences which evidence is selected. (Reproducibility is testable: a golden-fixture test asserts `buildAskContext` is byte-identical across runs, mirroring the existing `sopIntelligence.test.ts` purity discipline.)

2. **The LLM is isolated and one-way.** The LLM generation step is the ONLY non-deterministic component, reachable solely through the `AIProviderAdapter` boundary. **`ask-context-builder` has ZERO `ai-provider-adapter` import** (enforced by a static no-import test + `madge --circular`, parallel to the vision's `ai-recommendation-engine`-zero-`ai-provider-adapter` rule). LLM output is treated as untrusted: it is filtered through `citation-validator` and may only *reference* ids the deterministic layer already authorized.

3. **No back-flow; the answer is a disclosed, non-authoritative, derived artifact.** LLM output MUST NOT flow back into the deterministic pipeline and MUST NOT be persisted as "observed" data. It never mutates the SOP, the events, the intelligence, or any computed signal. It is stored ONLY in a dedicated, clearly-flagged `AskTurn` record carrying `isAuthoritative = false` (a hard column default, never settable to true). The UI always discloses it as AI-generated. Citations point FROM the answer TO pre-existing observed evidence — never the reverse.

### 2.3 Why this preserves the platform invariant

Ledgerium's promise is "every output traceable to source events." The answer text is non-deterministic, but its **citation set is deterministic and its claims are constrained to that set.** A reviewer can always reproduce the exact evidence the answer was grounded on (the bundle is hashed and stored), and every surviving citation resolves to a real `sourceEventId` / step ordinal with a real recorded-at timestamp. The non-determinism is quarantined to prose; the trust chain (evidence → citation) remains deterministic and machine-checkable.

---

## 3. Enforcement of the boundary (architectural hard rules)

Mirrors the vision's enforcement mechanisms (§3.6 of the vision):

- **No-import test:** a unit test asserts `ask-context-builder` and `citation-validator` source files contain zero imports from `ai-provider-adapter` (string/AST scan), parallel to the existing closed-union/registry tests.
- **Circular-dependency gate:** `pnpm exec madge --circular` over the `ask-this-process` lib must be clean.
- **Purity test:** `buildAskContext` invoked twice with identical inputs returns deep-equal output; no `Date.now()` / `Math.random()` token appears in the module (lint/grep gate, same pattern as `sopIntelligence.ts`).
- **One-way-data test:** a test asserts the persistence layer writes the LLM answer ONLY to `AskTurn` and never to `Workflow`, `ProcessDefinition.intelligenceJson`, `WorkflowArtifact`, or any event store. `AskTurn.isAuthoritative` has no setter path to `true`.
- **Citation-soundness test:** for a fixture answer claiming ids `{A, B, X}` where the authorized set is `{A, B, C}`, the validator returns exactly `{A, B}` (drops `X`).

---

## 4. GROUNDING / Retrieval Design

### 4.1 v1: whole-SOP context, no vector DB (and why that is correct here)

The grounded unit is a **single recorded process**. A typical SOP is small: a handful to a few dozen steps, each with a short instruction list, an `expectedOutcome`, friction indicators, and per-step evidence signals. The entire structured SOP + computed signals comfortably fits in a single context window. **Therefore v1 passes the full structured SOP + intelligence signals as the grounded context — no embeddings, no vector store, no chunking, no retrieval ranking.** This is the simplest design that satisfies the determinism requirement, and it is honest: there is no hidden similarity-search step that could be non-deterministic or hard to reproduce.

This is stated as a deliberate v1 boundary, not an oversight. A vector/RAG retrieval layer becomes worth adding only if/when a single "process" grows large (multi-run cohorts, very long captures) — a Phase-2 concern (§9, ADR-3 deferred). When it lands, it MUST itself be deterministic (fixed embedding model version + fixed top-k + stable tie-break by ordinal) so boundary rule 1 still holds.

### 4.2 The `GroundedEvidenceBundle` shape (what gets sent to the LLM)

Built deterministically from the persisted SOP. Field selection follows the **Tier-1 privacy default** (vision §10.2): abstracted step shape, observed labels only, no raw event payloads, page titles truncated (the existing `truncatePageTitle` 40-char PII cap is reused).

```ts
interface GroundedEvidenceBundle {
  processMeta: {
    title: string;
    objective: string;          // businessObjective / purpose
    stepCount: number;
    systems: string[];
    estimatedTime: string;
    confidence: number | null;
    generatedAt: string;        // SOP.generatedAt (the "recorded" provenance)
  };
  steps: Array<{
    ordinal: number;            // CITATION KEY (step-level)
    title: string;
    action: string;
    system: string | null;
    expectedOutcome: string;
    outcomeObserved: boolean;   // honesty flag — inferred vs observed
    durationLabel: string;
    confidence: number;
    isDecisionPoint: boolean;
    decisionLabel: string | null;
    friction: Array<{ type: string; label: string; severity: string }>;
    automationHint: string | null;
    evidenceSnippet: string;    // "Salesforce · Opportunities · Save" (observed-only)
    instructions: Array<{
      sequence: number;
      text: string;
      type: 'action' | 'wait' | 'verify' | 'note';
      sourceEventId: string;    // CITATION KEY (event-level) — traceable to evidence
    }>;
  }>;
  signals: {                    // from SopIntelligenceInput — gated honestly (N>=2)
    conformance: { alignedRunCount: number; totalRunCount: number; pct: number | null } | null;
    drift: { level: string; findings: string[] } | null;
    insufficientDataDisclosure: boolean; // true when N<2; LLM told to disclose
  };
  // Deterministic provenance of THIS bundle (for reproducibility + audit):
  bundleHash: string;           // sha256 over the canonical-serialized bundle (excl. this field)
}
```

### 4.3 The `CitationSet` (the authoritative citation universe)

```ts
interface CitationSet {
  stepOrdinals: number[];                 // every step ordinal in the bundle
  sourceEventIds: string[];               // every instruction.sourceEventId in the bundle
  // resolver maps a cited id → renderable evidence reference
  resolve: Map<string | number, {
    kind: 'step' | 'event';
    stepOrdinal: number;
    sourceEventId: string | null;
    recordedAt: string;                   // SOP.generatedAt or step-level provenance
    label: string;                        // "step 4" / "step 4 · Save Opportunity"
  }>;
}
```

The LLM is instructed (system prompt) to cite ONLY from this set, using a strict citation grammar (e.g. `[[step:4]]` and `[[event:<sourceEventId>]]`). The model's claimed ids are parsed out, then intersected against the set by `citation-validator`. Citation contract is therefore **machine-checkable**: a citation is valid IFF it parses to an id present in `CitationSet`.

### 4.4 Question → evidence mapping (v1 = full context; deterministic optional ordering)

v1 maps the question to evidence by passing the **whole bundle** and letting the LLM ground its answer in it, citing what it used. There is no question-dependent filtering that could change which evidence is *available* — so grounding determinism is trivially preserved (same process ⇒ same bundle regardless of question). An optional, fully-deterministic relevance annotation (keyword/lexical overlap of question terms against step titles/actions/systems, tie-broken by ordinal) MAY be added to hint ordering — but it only annotates; it never removes evidence from the bundle, so it cannot make grounding non-reproducible. The `evidenceUsed` field in the response reports which citations actually survived validation.

---

## 5. API_SPEC

### 5.1 Endpoint

`POST /api/workflows/{id}/ask`

REST, co-located under the existing workflow route group. Auth via existing `auth()` session; 404 (not 403) for non-owned/non-existent workflow, matching the existing GET handler's ownership pattern. Plan-gated (Q-CEO-2): "Ask This Process" is a paid feature surface — gate via `hasFeature(userPlan, 'askThisProcess')`.

### 5.2 Request

```jsonc
{
  "question": "Why is this step here?",   // required, 1..500 chars, Zod-validated
  "conversationId": "uuid"                // optional; omit to start a new conversation
}
```
`workflowId` comes from the path. Question is validated with Zod (length + non-empty), matching the existing `patchSchema` pattern in the route file.

### 5.3 Response — `{ data, error, meta }` envelope (per CLAUDE.md API Design)

Success (`200`):
```jsonc
{
  "data": {
    "conversationId": "uuid",
    "turnId": "uuid",
    "answer": "This step confirms the opportunity was saved before moving on.",
    "refused": false,
    "citations": [
      { "kind": "step",  "stepOrdinal": 4, "sourceEventId": null,        "recordedAt": "2026-06-10T14:03:00Z", "label": "step 4" },
      { "kind": "event", "stepOrdinal": 4, "sourceEventId": "evt_8f3a…", "recordedAt": "2026-06-10T14:03:01Z", "label": "step 4 · Save Opportunity" }
    ],
    "evidenceUsed": { "stepsCited": [4], "eventsCited": ["evt_8f3a…"], "stepCount": 1 },
    "isAuthoritative": false,             // ALWAYS false — disclosed, non-authoritative
    "bundleHash": "sha256:…"              // reproducibility anchor
  },
  "error": null,
  "meta": {
    "provider": "anthropic",
    "model": "claude-…",
    "byok": true,                         // whether a BYOK key was used vs platform default
    "latencyMs": 1840,
    "groundingDeterministic": true
  }
}
```

Refusal (still `200` — a refusal is a valid, honest answer, not an error):
```jsonc
{
  "data": {
    "conversationId": "uuid", "turnId": "uuid",
    "answer": "I don't have evidence in this recording to answer that. This process has no recorded steps about refunds.",
    "refused": true,
    "refusalReason": "no_relevant_evidence",  // enum: no_relevant_evidence | out_of_scope | insufficient_data
    "citations": [], "evidenceUsed": { "stepsCited": [], "eventsCited": [], "stepCount": 0 },
    "isAuthoritative": false, "bundleHash": "sha256:…"
  },
  "error": null,
  "meta": { "provider": "anthropic", "model": "claude-…", "byok": true, "latencyMs": 12, "groundingDeterministic": true }
}
```

Error (`4xx`/`5xx`) — for operational failures only (auth, validation, provider down, no key):
```jsonc
{
  "data": null,
  "error": {
    "code": "PROVIDER_UNAVAILABLE",       // enum below
    "message": "The AI provider could not be reached. No answer was generated.",
    "retryable": true
  },
  "meta": { "provider": "anthropic" }
}
```
Error codes: `UNAUTHORIZED` (401), `PLAN_GATE` (402/403), `WORKFLOW_NOT_FOUND` (404), `INVALID_QUESTION` (400), `NO_AI_KEY` (409 — BYOK key missing and no platform default), `PROVIDER_UNAVAILABLE` (502), `PROVIDER_TIMEOUT` (504), `RATE_LIMITED` (429), `INTERNAL` (500).

**Honesty rule in the contract:** "refused" and "error" are distinct. A refusal is a *successful, evidence-honest non-answer* (`200`, `refused:true`). An error is an *operational failure where no judgment was made* (`4xx`/`5xx`, `error != null`). The product must never dress an operational failure as a confident answer, and never dress a confident answer over insufficient evidence.

### 5.4 Sync vs async vs streaming

- **v1: synchronous request/response.** Single-process context is small; one LLM round-trip is typically < 3s — under the platform's ">200ms ⇒ job_id" guidance the call exceeds 200ms, but a synchronous wait with a hard timeout (e.g. 25s) is acceptable for a foreground, user-initiated Q&A and avoids job-store/polling complexity in the first iteration. The route enforces a timeout and returns `PROVIDER_TIMEOUT` if exceeded.
- **v1.1 (optional, behind same contract): SSE streaming** of the answer tokens for perceived latency, with citations validated and emitted in a final `done` event (citations are validated only after the full text exists, so they cannot stream mid-answer). The persisted turn is written on stream completion. The request/response envelope is unchanged; streaming is a transport option negotiated via `Accept: text/event-stream`.
- **Async job (`job_id`)** is deferred to Phase 2 and only needed if grounding grows expensive (large cohorts / RAG) — at which point the existing async-job pattern (`>200ms ⇒ job_id`) applies cleanly.

---

## 6. Provider Abstraction, BYOK, and Failure Modes

### 6.1 `AIProviderAdapter`

REUSE the vision's interface (do not redefine). Minimum shape consumed by this feature:
```ts
interface AIProviderAdapter {
  readonly id: string;            // 'anthropic' | 'openai' | …
  readonly trustTier: 1 | 2 | 3;  // egress middleware reads this
  generate(input: {
    systemPrompt: string;
    userPrompt: string;           // assembled from GroundedEvidenceBundle (already redacted)
    maxTokens: number;
    credential: ResolvedCredential; // decrypted in-process; never logged, never returned
  }): Promise<{ text: string; claimedCitationIds: string[]; model: string; usage: {…} }>;
}
```
`claimedCitationIds` are parsed from `text` by the adapter via the citation grammar (purely mechanical), so the route gets both the prose and the raw claimed ids without itself parsing model output.

### 6.2 BYOK passthrough + default provider

- **BYOK is the default credential model** (vision D-01). The user's encrypted key is fetched from the credential vault, decrypted in-process at call-time (envelope encryption: per-tenant DEK + KMS KEK; vision §10.1), handed to the adapter, never returned to the web layer, never logged.
- **Default provider:** Anthropic (vision §4.1 — Anthropic ships first; OpenAI/Azure-OpenAI later). A **platform-managed default key** MAY back the feature for trial UX (a CEO decision, §10 D-4) so the panel is not dead for users without a key; if no BYOK key and no platform default ⇒ `NO_AI_KEY` (409) with a "connect a provider" CTA.
- **Trust-tier egress gate:** the adapter's `trustTier` is checked against the tenant's `min_tier_required`; Tier-3 providers are hard-blocked (vision §10.3). For this read-only Q&A on Tier-1 abstracted payloads, Tier-1/2 providers are permitted by default.

### 6.3 Failure modes (deterministic policy)

| Condition | Detection | Response |
|---|---|---|
| **No AI key** (no BYOK + no platform default) | credential resolve returns none | `409 NO_AI_KEY`, no LLM call, "connect a provider" CTA. Not a refusal — an operational gate. |
| **Provider error / down** | adapter throws / non-2xx | `502 PROVIDER_UNAVAILABLE`, `retryable:true`. No fabricated answer. |
| **Provider timeout** | route timeout (25s) | `504 PROVIDER_TIMEOUT`. |
| **Rate limited** | adapter 429 | `429 RATE_LIMITED`, `retryable:true`. |
| **No evidence / empty SOP** | `buildAskContext` yields zero citable steps | **Refuse** (`200`, `refused:true`, `insufficient_data`) — never call the LLM with an empty bundle. |
| **Question out of scope** | LLM returns answer with zero valid citations after validation | **Downgrade to refusal** (`no_relevant_evidence`) — see §6.5. |
| **Redaction violation** | adapter rejects payload with forbidden fields | `500 INTERNAL` in dev (fail-loud bug), generic safe error in prod; the call is blocked before egress. |
| **Insufficient-data signals (N<2)** | bundle `insufficientDataDisclosure:true` | LLM is instructed to disclose; answer may proceed but must hedge ("based on a single recording"). |

### 6.4 Tier-1 redaction stage

Between bundle and adapter, a pure redaction transform strips anything beyond the Tier-1 allowlist (step shape, observed labels, truncated page titles, friction/automation labels). No raw event payloads, no field values, no URLs beyond domain. The adapter independently re-asserts the allowlist and **rejects** non-conforming payloads (defense in depth, mirroring `policy-engine` redaction patterns).

### 6.5 The honesty downgrade (refuse over fabricate)

After `citation-validator` runs: if the answer made affirmative factual claims but produced **zero surviving citations**, the route replaces it with a deterministic refusal (`no_relevant_evidence`). This is the structural enforcement of "cite everything": an un-citable claim is, by policy, not an answer. (Pure-meta questions like "how many steps are here?" are answerable from `processMeta` and cite the process itself; the citation grammar includes a `[[process]]` token for whole-process facts so these are not spuriously refused.)

---

## 7. DATA_MODEL

Additive Prisma only (CLAUDE.md: additive migrations by default; soft deletes; required `id/created_at/updated_at`). LLM output lives ONLY here, flagged non-authoritative.

### 7.1 `AskConversation`

```prisma
model AskConversation {
  id          String     @id @default(uuid())
  workflowId  String                       // FK → Workflow, ON DELETE CASCADE
  userId      String                       // FK → User (owner; auth scope)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  deletedAt   DateTime?                    // soft delete
  turns       AskTurn[]

  workflow    Workflow   @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  @@index([workflowId, userId])
}
```

### 7.2 `AskTurn` (one question→answer exchange)

```prisma
model AskTurn {
  id              String   @id @default(uuid())
  conversationId  String                     // FK → AskConversation, CASCADE
  question        String   @db.Text          // user input (PII-bearing; see retention)
  answer          String   @db.Text          // LLM output — NON-AUTHORITATIVE
  refused         Boolean  @default(false)
  refusalReason   String?                    // enum string when refused
  isAuthoritative Boolean  @default(false)    // HARD INVARIANT: never set true (no setter path)
  bundleHash      String                     // sha256 of the deterministic grounded bundle
  provider        String                     // 'anthropic' | …
  model           String
  byok            Boolean
  latencyMs       Int
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  citations       AskCitation[]

  conversation    AskConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  @@index([conversationId])
}
```

### 7.3 `AskCitation` (machine-checkable, validated citation)

Stores only citations that SURVIVED validation (claimed ∩ authorized). Each row is reproducible from `bundleHash` + the SOP.

```prisma
model AskCitation {
  id            String   @id @default(uuid())
  turnId        String                       // FK → AskTurn, CASCADE
  kind          String                       // 'step' | 'event' | 'process'
  stepOrdinal   Int?                         // present for step/event
  sourceEventId String?                      // present for event
  recordedAt    DateTime                     // provenance timestamp of the cited evidence
  label         String                       // "step 4 · Save Opportunity"
  createdAt     DateTime @default(now())

  turn          AskTurn  @relation(fields: [turnId], references: [id], onDelete: Cascade)
  @@index([turnId])
}
```

### 7.4 Audit trail (REUSE the vision's two-table model)

Per vision §3.4 / §10: **all AI operations emit append-only audit entries.** Each `ask` call appends one `ai_audit_event` (hash-chained, `INSERT`-only, 7-year retention) recording: `userId`, `workflowId`, `turnId`, `provider`, `model`, `byok`, `bundleHash`, `refused`, citation count, latency, `previous_event_hash`. The raw provider request/response payload (if retained at all) goes to the short-retention `ai_execution_audit_payload` table (90-day, GDPR-erasable without breaking the chain). For v1, payload retention may be OFF by default (only the event row is written) — a CEO/privacy decision (§10 D-5).

### 7.5 Retention + non-authoritative semantics

- `AskTurn.answer` is **never** treated as observed data; it is excluded from every intelligence/SOP recompute query (a test asserts the recompute path does not read `AskTurn`).
- `question` text is user PII; retained for conversation continuity but subject to soft-delete + a configurable purge (default e.g. 90 days) and GDPR erasure (cascade-delete the conversation; audit-event row remains, payload row erased).
- `isAuthoritative` is a hard `false` default with no code path to set it true — enforced by test (§3).

---

## 8. Honesty Contract (carried from the existing SOP honesty discipline)

This feature inherits the exact honesty posture already encoded in `sopIntelligence.ts` / the benchmark reviews:

- **Refuse over fabricate.** No evidence ⇒ say so. No valid citations ⇒ refusal. No green-check reassurance on thin data (N<2 disclosure surfaces verbatim into the answer).
- **Cite everything.** Every affirmative claim must carry ≥1 valid citation or be downgraded to refusal.
- **Disclose the source class.** The answer is always labeled AI-generated and non-authoritative in both the API (`isAuthoritative:false`) and the UI.
- **Observed-only evidence.** The bundle contains only real captured signals (reusing `deriveStepEvidence` + `truncatePageTitle`); nothing fabricated; page titles PII-capped.

---

## 9. BUILD SEQUENCE (small, reversible iterations)

Each iteration is independently shippable + reversible, with explicit **determinism gate** and **honesty gate** that must pass before close. ADRs first (decisions before code), then deterministic core, then the isolated adapter, then route, then UI, then persistence/audit. This mirrors the vision's "ADRs → adapter → engine → route → UI" arc.

| # | Iteration | Deliverable | Determinism gate | Honesty gate |
|---|---|---|---|---|
| **A0** | **ADR-1: Determinism Boundary + Citation Contract** | `ADR_001_DETERMINISM_BOUNDARY.md` — the boundary rules, citation grammar `[[step:N]]/[[event:id]]/[[process]]`, the no-back-flow rule, `isAuthoritative=false` invariant | n/a (decision) | n/a |
| **A0b** | **ADR-2: Persistence + Audit + Retention** | `ADR_002_ASK_PERSISTENCE.md` — `AskConversation/Turn/Citation` shapes, audit two-table reuse, retention/GDPR, non-authoritative flag | n/a | n/a |
| **1** | **`ask-context-builder` pure module** | `contextBuilder.ts` + golden-fixture tests | **buildAskContext is byte-identical across runs; zero `Date.now`/`Math.random`; ZERO provider-adapter import (no-import test + madge)** | bundle contains observed-only evidence; N<2 sets `insufficientDataDisclosure` |
| **2** | **`citation-validator` pure module** | `citationValidator.ts` + tests | **claimed ∩ authorized; hallucinated id dropped (fixture test); pure** | invalid/uncitable claim ⇒ refusal-eligible |
| **3** | **`AIProviderAdapter` wiring (Anthropic) + redaction stage** | Anthropic adapter consuming the vision interface; Tier-1 redaction; BYOK resolve | adapter has no DB/SOP access; rejects forbidden-field payloads (fail-loud test) | credentials never returned/logged; refuses to egress non-allowlisted payload |
| **4** | **`/api/workflows/[id]/ask` route (sync)** | route.ts: auth + plan gate + build (det.) → adapter (non-det.) → validate (det.); `{data,error,meta}` envelope; refusal + error taxonomy | grounding pipeline runs deterministically; route asserts `groundingDeterministic:true`; timeout → `PROVIDER_TIMEOUT` | refusal vs error separation enforced; no-evidence ⇒ refuse without LLM call |
| **5** | **`AskThisProcessPanel` UI (replace coming-soon tile)** | input + answer + clickable citation chips (scroll to `#sop-step-{id}`) + non-authoritative disclosure + refusal state + evidenceUsed | citations render only validated ids; clicking resolves to a real step | disclosure always visible; refusal styled as honest non-answer, not error |
| **6** | **Persistence + audit trail** | `AskConversation/Turn/Citation` writes + append-only `ai_audit_event`; retention/purge job | bundleHash stored for reproducibility | `isAuthoritative=false` enforced; recompute path proven to ignore `AskTurn` (one-way-data test) |
| **7 (opt.)** | **SSE streaming v1.1** | stream tokens; validate citations on completion | citations validated only post-full-text; persisted turn unchanged | disclosure + refusal semantics identical to sync |
| **P2 (deferred)** | **ADR-3: RAG/retrieval (only if a process grows large)** | deterministic embedding (pinned model + top-k + ordinal tie-break) | retrieval reproducible (same process+question ⇒ same chunks) | citations still machine-checkable against retrieved set |

Sequencing notes: iterations 1–2 are pure-module deterministic wins with zero provider dependency (safe, fully testable offline). The adapter (3) is the first non-deterministic surface and is isolated. The route (4) is the first place the two zones meet — and it is exactly where the determinism boundary is operationally enforced. UI (5) and persistence (6) carry no new determinism risk. Each iteration is a candidate for a single Mode-2 directed loop; the ADRs are Mode-3-adjacent Define work (non-counting).

---

## 10. Top architectural decisions needing CEO input

1. **BYOK-only vs platform-managed default key for the Q&A trial path.** BYOK is the architecturally/competitively correct default (vision D-01), but a Q&A panel that is dead for every user without a configured key is a weak first impression. Decision: ship BYOK-only (panel shows "connect a provider" until a key exists), OR back the feature with a rate-limited platform-managed Anthropic key for trial UX (adds managed-cost + abuse-control surface). **Affects: failure-mode UX, cost model, §6.2/§6.3.**

2. **Plan gating.** Is "Ask This Process" a paid feature (Starter+/Team+ via `hasFeature(userPlan, 'askThisProcess')`), and at which tier? This sets the 402/403 gate and the conversion story. **Affects: §5.1 plan gate.**

3. **Sync vs streaming for v1, and the latency budget.** Ship synchronous (simpler, ~3s perceived wait, hard 25s timeout) for v1 and add SSE streaming in v1.1, or invest in streaming immediately for perceived speed? **Affects: §5.4, build iteration 4 vs 7.**

4. **Audit payload retention default.** Per the vision, every AI op emits an append-only audit event (7-year). Do we ALSO retain the raw provider request/response payload (90-day, GDPR-erasable) for this read-only Q&A, or keep payload retention OFF by default and store only the event row + `bundleHash`? Off-by-default is cheaper/safer; on gives full replayability. **Affects: §7.4 privacy posture, storage cost.**

5. **Conversation memory scope (single-turn vs multi-turn within a process).** v1 can treat each question as independent (single-turn, grounded fresh each time — maximally deterministic and simplest), or support multi-turn follow-ups within a conversation (prior turns become additional non-authoritative context). Multi-turn improves UX but means prior LLM output feeds the next prompt — still one-way (it never becomes observed data), but it widens the non-deterministic surface and the prompt-injection consideration. **Affects: §1.1 builder signature, §7 data model, determinism-boundary surface area.**
