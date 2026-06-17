# IMPLEMENTATION FEASIBILITY + BUILD PLAN — "Ask This Process"

**Status:** DRAFT (Define phase). Analysis/planning only — NO product code.
**Author:** backend-engineer (feasibility review of the system-architect ARCHITECTURE doc)
**Date:** 2026-06-17
**Reads:** `ARCHITECTURE_ASK_THIS_PROCESS.md`, `PRD_ASK_THIS_PROCESS.md`, `SECURITY_REVIEW_ASK_THIS_PROCESS.md`, `docs/meta/AI_INTEGRATION_PLATFORM_VISION_REVIEW_001.md`, and the real code: `apps/web-app/src/app/api/workflows/[id]/route.ts`, `.../[id]/analyze/route.ts`, `SOPIntelligenceMode.tsx`, `adapters/sopViewModel.ts`, `adapters/sopIntelligence.ts`, `packages/process-engine/src/types.ts`, `apps/web-app/src/lib/intelligence.ts`, `lib/plans.ts`, `sop-view/types.ts`.

**Verdict: FEASIBLE.** The deterministic core (iterations 1–2) is low-risk and can ship offline with zero provider dependency. The genuine cost and risk are concentrated in the **net-new AI substrate** (provider adapter + BYOK envelope encryption + egress middleware + audit tables), which the architecture correctly REUSES from the vision — but **none of that substrate exists in the repo today** (verified). This doc grounds the architecture in the actual codebase, flags the threading gaps and the "harder-than-it-looks" items, and gives a per-iteration build/test/effort/risk plan.

---

## 0. Ground-truth audit of the codebase (what's real today)

I verified each architecture assumption against the repo. Results:

| Assumption in ARCHITECTURE | Reality in repo | Consequence |
|---|---|---|
| Owned-workflow route + ownership predicate `{ id, userId }`, 404-on-non-owned, Zod `patchSchema` | **TRUE.** `route.ts:40-41,164-165,247-248`; `patchSchema` at `:12`. Sibling sub-routes exist: `analyze/`, `share/`, `variants/`, `export-*`, `integration-risk/`, `agent-*`. | The `ask/route.ts` slots in cleanly next to `analyze/route.ts`. Reuse `auth()` + ownership verbatim. |
| `sopIntelligence.ts` is pure, render-only, no `Date.now()` | **TRUE.** Pure transforms; `truncatePageTitle` 40-char PII cap at `:255`; `deriveAlignmentPill` N≥2 gate at `:117`. | The builder's purity discipline + N≥2 honesty gate are a direct copy of an existing, tested pattern. Low risk. |
| `SOPInstruction.sourceEventId` + `SOPStep.ordinal` present (the citation primitive) | **TRUE — but ONLY on the raw engine SOP** (`process-engine/types.ts:336-358`, `:360-394`). | **The citation keys exist in the persisted `process_output` artifact, not in the view model.** See gap G-1. |
| Builder consumes `SOPViewModel` (per PRD §4.2) | **PARTIALLY FALSE.** `SOPViewInstruction` (`sop-view/types.ts:130-137`) has **no `sourceEventId`**; `StepPageContextMap` is `Record<number,{pageTitle?}>` (`:293`). The view model **drops the event-level citation key**. | **G-1 (load-bearing):** the deterministic builder must read the **raw `process_output` SOP artifact server-side**, not the client view model. The view model is lossy for citations. |
| `#sop-step-{id}` DOM ids exist for citation scroll-to | **TRUE.** `SOPIntelligenceMode.tsx:200` renders `id={`sop-step-${step.id}`}`. | UI citation chips can scroll/highlight with zero new DOM plumbing. **But** the DOM id is `step.id` (a string stepId), while citations key on `ordinal` (number). See gap G-2. |
| `AIProviderAdapter` interface + adapters exist to REUSE | **FALSE.** No `apps/web-app/src/lib/ai-provider-adapter/` dir; no `anthropic`/`openai`/`@ai-sdk` dependency in any `package.json`. | **Net-new.** The "REUSE the vision's interface (do not redefine)" instruction has nothing to reuse yet — the interface itself is net-new (this feature is the first instance). |
| BYOK credential vault + envelope encryption exist | **FALSE.** No `credentialVault`/`envelope`/`byok` implementation anywhere (grep is clean — the few hits are retention-policy/dashboard, unrelated). | **Net-new and the single biggest cost.** KMS integration, per-tenant DEK, Prisma credential table — all greenfield. |
| BullMQ/Redis available for async jobs (stated tech stack) | **FALSE in practice.** No `bullmq`/`ioredis` dependency in any `package.json`; no `new Queue`/`new Worker`. The stack doc lists it; the repo doesn't wire it. | Reinforces the **sync-first** recommendation (§4). Standing up BullMQ purely for this feature is disproportionate. |
| Two-table audit (`ai_execution_audit_event` + payload) exists | **FALSE.** Net-new Prisma models. | Net-new (iteration 6). |
| `hasFeature(userPlan, 'askThisProcess')` gate exists | **FALSE.** `FeatureKey` union (`plans.ts:15-34`) has no `askThisProcess`; `analyze/` gates on `intelligenceLayer` via `checkFeatureAccess`. | Add a `FeatureKey` member (1-line union + per-plan boolean) OR reuse `intelligenceLayer`. CEO decision DD-B/Q-CEO-2. |

**Net assessment:** the architecture is sound and the deterministic half is nearly free (it mirrors `sopIntelligence.ts`). The non-deterministic half is **entirely greenfield AI platform plumbing** that the vision deferred to "AI+1/AI+3, NOT built." This feature cannot ship interactive Q&A without building (a scoped slice of) that plumbing first. That is the real schedule driver.

---

## 1. The deterministic ask-context-builder — built from EXISTING data

### 1.1 Source of truth: the raw `process_output` artifact, server-side (NOT the view model)

`buildAskContext` must run **server-side in the route** over the **raw persisted SOP**, because that is the only place `sourceEventId` + `ordinal` survive together. Concretely:

- The route already loads `workflow.artifacts` (`route.ts:42`). The `process_output` artifact's `contentJson` parses to `ProcessOutput` (`process-engine/types.ts:487`) whose `.sop.steps[].instructions[].sourceEventId` and `.sop.steps[].ordinal` are the citation keys. The `.processMap.nodes[].metadata.pageTitle/routeTemplate` supply the evidence snippet inputs.
- `ProcessDefinition.intelligenceJson` (already fetched at `route.ts:47`) supplies the multi-run signals (`sopAlignment`, `documentationDrift`, and — if present — variance/variants/bottleneck/timestudy with `evidenceRunIds`). The route already runs `extractSopIntelligence(...)` (`:111`).

So **everything the bundle needs is already persisted and already loaded by the GET handler.** The builder is a pure transform over `(rawSop, sopIntelligenceInput, pageContextFromMapNodes, question)` → `GroundedEvidenceBundle + CitationSet`. No engine call, no new computation. This is the same family as `sopIntelligence.ts` (pure, render-safe).

**G-1 (confirmed gap, low effort to close):** the builder takes the **raw SOP artifact**, not `SOPViewModel`. PRD §4.2 names the view model as the substrate; that is wrong for the citation primitive. Mitigation: build server-side over `process_output`. This is *easier*, not harder — no new threading through the client, and it keeps PII (`sourceEventId`, raw page titles) server-side where it belongs.

### 1.2 What's already available vs what needs threading

| Bundle field | Source (already persisted) | Threading needed |
|---|---|---|
| `processMeta.{title,objective,stepCount,systems,estimatedTime,confidence,generatedAt}` | raw SOP (`title`,`businessObjective`/`purpose`,`steps.length`,`systems`,`estimatedTime`,`generatedAt`) + workflow record | None — direct read. |
| `steps[].{ordinal,title,action,system,expectedOutcome,confidence,isDecisionPoint,decisionLabel,friction,durationLabel}` | raw `SOPStep` (`process-engine/types.ts:360`) | None — direct read. |
| `steps[].outcomeObserved` (honesty flag) | view model computes it (`sop-view/types.ts:106`), engine does **not** expose it on raw SOP | **Thread:** port the `outcomeObserved` derivation (verify-type instruction / system-feedback exists) into the builder, OR compute from `instructions[].instructionType === 'verify'`. ~10 LOC, deterministic. |
| `steps[].evidenceSnippet` | derive via existing `deriveStepEvidence` (`sopIntelligence.ts:220`) over `{applicationLabel, pageTitle(map node), actionLabel(first instruction targetLabel)}` | Reuse `deriveStepEvidence` + `truncatePageTitle` verbatim. None new. |
| `steps[].instructions[].sourceEventId` | raw `SOPInstruction.sourceEventId` | None — **the citation primitive, present.** |
| `steps[].automationHint` | view model computes it; raw SOP does not carry a single `automationHint` field | **Thread:** port the `buildRecommendations`/automation-hint derivation, or read `SOPRecommendation[type=automation]` from the template artifact. ~15 LOC. |
| `signals.{conformance,drift,insufficientDataDisclosure}` | `extractSopIntelligence` output (already in route) + `deriveAlignmentPill` N≥2 gate | Reuse `deriveAlignmentPill` to set `insufficientDataDisclosure = (kind === 'insufficient')`. None new. |
| `bundleHash` | sha256 over canonical-serialized bundle | New: a deterministic canonical serializer (stable key order) + `crypto.createHash('sha256')` (Node `crypto` already imported in `route.ts:4`). ~20 LOC. **Watch:** canonicalization must be order-stable or the hash is non-reproducible — see R-3. |

**Conclusion:** ~80% of the builder is direct reads of already-persisted data; ~20% is porting two small honesty derivations (`outcomeObserved`, `automationHint`) that today live in the view-model adapter. No engine invocation, no new DB columns, no migration for iteration 1. **Effort: S.**

### 1.3 CitationSet construction (deterministic, closed)

`CitationSet.stepOrdinals` = every `ordinal` in the bundle; `sourceEventIds` = every `instruction.sourceEventId`; plus the `[[process]]` token for whole-process facts (`processMeta` counts). The `resolve` map is built in the same pass. This is a pure fold over the bundle — trivially deterministic and trivially testable (golden fixture).

---

## 2. AIProviderAdapter (Claude first) + BYOK + redaction

### 2.1 Net-new, but scope it tightly

There is no adapter and no SDK in the repo. For this feature, **do not boil the ocean** on the full vision multi-provider abstraction. Build the minimal interface the architecture specifies (§6.1) with exactly one implementation (`AnthropicAdapter`) plus a redaction pre-stage. Add the `@anthropic-ai/sdk` (or a thin `fetch` against the Messages API — preferable to avoid a heavy dep and keep egress allow-listing explicit) dependency to `apps/web-app`.

The adapter contract (from §6.1) is clean: `generate({systemPrompt, userPrompt, maxTokens, credential}) → {text, claimedCitationIds, model, usage}`. Key properties to enforce in code:

- **No DB/SOP access.** The adapter module imports zero `@/db`, zero process-engine. Enforce with the same no-import test used for the builder (§3 of architecture). This is the "adapter is isolated" guarantee.
- **Citation parse is mechanical.** The adapter parses `[[step:N]]`/`[[event:id]]`/`[[process]]` tokens out of `text` via regex into `claimedCitationIds`. Pure string work — testable without a network call.
- **`maxTokens` ceiling** enforced by the adapter (cost cap, T6).

### 2.2 BYOK key retrieval + envelope decryption in-worker, never in LLM context

This is the **highest-effort, highest-risk** net-new piece. The decrypt must happen **in the route/server process at call-time** (Next.js API route runs server-side; there is no separate "worker" today — see R-1), the plaintext key handed to the adapter as `credential`, and **never** placed into `systemPrompt`/`userPrompt`, never returned in `{data,error,meta}`, never logged. Concretely:

- **Credential store (net-new Prisma model):** `AiProviderCredential { id, userId, provider, ciphertext, nonce, authTag, dekVersion, createdAt, updatedAt, deletedAt }`. Envelope encryption: per-tenant DEK (AES-256-GCM) wrapped by a KEK in cloud KMS (vision §10.1). The KEK never leaves KMS (Encrypt/Decrypt only).
- **Decrypt path:** route resolves the credential row (owned by `session.user.id`) → KMS `Decrypt(wrappedDek)` → AES-GCM decrypt ciphertext → plaintext key in a local `const` → pass to adapter → **never assign to any field that crosses a serialization boundary.** A unit test asserts the response object and the audit row contain no substring of a sentinel key (T5).
- **Header scrubbing:** if using the SDK, configure it to not log `Authorization`; if using raw `fetch`, never log the request headers.
- **Egress allowlist (T11/SSRF):** the adapter's base URL is a hard-coded constant for Anthropic; no custom endpoints in v1.

**Honesty note for the plan:** the vision's "worker holds credentials, LLM never has tool-use to read its own credentials" is automatically satisfied here because v1 has **zero tool-use** — the model is text-in/text-out. The credential simply never enters the prompt string. This collapses vector V5 (per SECURITY_REVIEW §3.1). Good.

### 2.3 Platform-managed default key (CEO decision D-4 / DD-A)

If CEO approves a rate-limited platform key for trial UX, the resolve path falls back to an env-held platform key when no BYOK row exists. This adds a managed-cost + abuse-control surface (T6 budget caps become load-bearing). If BYOK-only, no fallback → `NO_AI_KEY` (409). **Recommendation:** ship BYOK-only for the first interactive release (smallest abuse surface, honest "connect a provider" CTA), add the managed default behind the same code path in a follow-up once budget caps are proven.

---

## 3. citation-validator (the one-way gate back)

Pure module, the easiest non-trivial piece. Input: `claimedCitationIds: string[]` (from adapter) + `CitationSet`. Output: the **intersection**, resolved to renderable references; **every claimed id not in the set is silently dropped.** No I/O, no clock.

Implementation notes:
- Parse `[[step:4]]` → `{kind:'step', ordinal:4}`; `[[event:evt_…]]` → `{kind:'event', sourceEventId}`; `[[process]]` → `{kind:'process'}`. Reject anything that doesn't parse to a member of `CitationSet`.
- After intersection, apply the **honesty downgrade** (§6.5): if the answer made affirmative claims but produced **zero** surviving citations, the route replaces it with a deterministic `no_relevant_evidence` refusal. (Note: "made affirmative claims" is itself a heuristic — see R-4. v1 can use the simple rule "non-refusal answer with zero valid citations ⇒ downgrade," accepting that a legitimately citation-free meta-answer must carry `[[process]]`.)
- The validator is where the determinism boundary is *operationally enforced on the way back*. It is small (~60 LOC) and exhaustively golden-testable.

**This module + the builder are the two pure wins** and should ship first (iterations 1–2), fully offline.

---

## 4. The /api/workflows/[id]/ask route — sync vs streaming vs job

### 4.1 RECOMMENDATION: synchronous request/response with a hard timeout for v1; SSE streaming as a fast-follow (v1.1); BullMQ job DEFERRED.

**Rationale (grounded in the repo, not just the architecture):**

1. **BullMQ/Redis is not wired in this repo** (verified — no dependency, no queue). The architecture's ">200ms ⇒ job_id" guideline is a CLAUDE.md convention, but standing up a Redis + BullMQ worker tier *solely* for a foreground, user-initiated Q&A is disproportionate and adds an entire ops surface (queue, worker process, job-status polling route, job store table). The latency profile does not justify it: whole-SOP context is small (a handful to a few dozen steps), one Claude round-trip is typically 1–4s.

2. **Sync is the smallest correct surface.** The route does: auth + ownership (reuse verbatim) → plan gate → load artifacts (already done by GET) → `buildAskContext` (det.) → redact (det.) → `adapter.generate` (non-det., **wrapped in a 25s timeout via `Promise.race` / `AbortController`**) → `citationValidator` (det.) → persist turn → `{data,error,meta}`. On timeout → `PROVIDER_TIMEOUT` (504). On no-evidence → refuse **without calling the LLM** (saves cost + latency). This is one file, no new infra.

3. **Latency budget:** target p50 ≤ 5s (PRD M-6). Sync wait with a spinner is acceptable for a click-to-ask panel. Hard 25s timeout caps the tail. Next.js route handlers must not exceed the platform's function timeout — confirm the deploy target (Railway/Render long-running Node, not Vercel's stricter serverless cap) allows a 25s handler; if on a serverless cap (~10–15s), set the LLM timeout below it. **(Open infra check — R-2.)**

4. **SSE streaming (v1.1)** improves *perceived* latency materially and is a clean fast-follow: stream answer tokens, but **validate + emit citations only in the final `done` event** (citations cannot stream — they're validated against the full text). The persisted turn writes on stream completion. The request/response envelope is unchanged; transport negotiated via `Accept: text/event-stream`. Next.js App Router supports streaming responses natively (`ReadableStream`), so no new infra. Defer to v1.1 only because it doubles the route's test surface (mid-stream abort, partial-write-then-fail).

5. **BullMQ job (`job_id`)** becomes correct **only** if grounding grows expensive (Phase-2 RAG/cohort retrieval) — at which point you stand up the queue once, for the right reason. Don't pre-build it.

**Decision table:**

| Option | v1 fit | Cost to build now | When it's right |
|---|---|---|---|
| **Sync + hard timeout** ✅ | **Best** | Low (one route, no infra) | Small single-process context, foreground Q&A. **This is v1.** |
| SSE streaming | Good (perceived speed) | Medium (streaming route + abort/partial tests) | v1.1 fast-follow, same contract. |
| BullMQ job_id | Poor for v1 | High (Redis + worker + job store + polling route) — **none wired today** | Phase 2, when RAG/cohort grounding is expensive. |

### 4.2 Envelope + taxonomy

Reuse `NextResponse.json` with the `{data,error,meta}` shape (architecture §5.3). Honesty rule baked into the contract: **refusal = `200` + `refused:true`** (a successful evidence-honest non-answer); **error = `4xx/5xx` + `error!=null`** (operational failure, no judgment). Error enum exactly per §5.3 (`UNAUTHORIZED`/`PLAN_GATE`/`WORKFLOW_NOT_FOUND`/`INVALID_QUESTION`/`NO_AI_KEY`/`PROVIDER_UNAVAILABLE`/`PROVIDER_TIMEOUT`/`RATE_LIMITED`/`INTERNAL`). Zod-validate `{question:1..500, conversationId?:uuid}` mirroring `patchSchema`.

---

## 5. Prisma additive model + migration

Additive only (CLAUDE.md). Four net-new models (3 ask + 1 credential) plus the audit pair:

- `AskConversation` (architecture §7.1) — FK → Workflow CASCADE, FK → User, soft delete, `@@index([workflowId,userId])`.
- `AskTurn` (§7.2) — `isAuthoritative Boolean @default(false)` **with no code path to set true** (enforced by test §3 of architecture). Stores `bundleHash`, `provider`, `model`, `byok`, `latencyMs`, `refused`, `refusalReason`.
- `AskCitation` (§7.3) — only validated (claimed ∩ authorized) citations; reproducible from `bundleHash` + SOP.
- `AiProviderCredential` (net-new, §2.2 above) — envelope-encrypted BYOK key.
- `ai_audit_event` + `ai_audit_payload` (§7.4 / vision two-table) — append-only, hash-chained event row (7-year) + short-retention payload (90-day, GDPR-erasable). **v1: payload retention OFF by default** (event row + `bundleHash` only) per CEO decision D-4 — cheaper/safer; replayability via `bundleHash` + SOP, not stored prose.

Migration is additive (new tables + new FKs on existing `Workflow`/`User` inverse relations). Zero changes to existing columns. One Prisma migration, `pnpm prisma migrate`. **Effort: S** for the schema; the **retention/purge job** (soft-delete + configurable purge, GDPR cascade) is a separate small surface (iteration 6).

**One-way-data invariant (load-bearing):** a test asserts the intelligence/SOP recompute path (`intelligence.ts`, `extractSopIntelligence`) never reads `AskTurn`. LLM output is excluded from every recompute query. `isAuthoritative` is hard-`false`. This is the structural enforcement of "the answer never becomes observed data."

---

## 6. Test strategy per iteration

The honest principle: **test the deterministic wrapper exhaustively; mock the non-deterministic adapter.** Never assert on real LLM output.

| Iter | What's tested | How |
|---|---|---|
| **1 builder** | byte-identical output across runs; zero `Date.now`/`Math.random`; ZERO provider-adapter import; observed-only evidence; N<2 sets `insufficientDataDisclosure`; `bundleHash` stable | Golden-fixture test (mirror `sopIntelligence.test.ts`): feed a fixed `process_output` + `intelligenceJson`, assert deep-equal across two invocations and a frozen expected snapshot. **No-import test** (string/AST scan of the source file). **`madge --circular`** over the lib. Grep gate for `Date.now`/`Math.random` tokens. |
| **2 validator** | claimed ∩ authorized; hallucinated id dropped; pure | Fixture: authorized `{step:1,step:4,event:evt_a}`, claimed `{step:4,event:evt_a,event:evt_HALLUCINATED,step:99}` ⇒ returns exactly `{step:4,event:evt_a}`. Plus the downgrade rule: non-refusal + zero valid citations ⇒ `no_relevant_evidence`. |
| **3 adapter + redaction** | adapter has no DB/SOP access; rejects forbidden-field payloads (fail-loud); credentials never returned/logged; `[[…]]` parse is correct | No-import test on adapter source. Redaction test: payload with a raw-event field ⇒ adapter throws. Citation-parse unit tests on canned `text`. **Credential-leak test:** inject a sentinel key, assert it appears in no log call, no response, no audit row. **Mock the network** — never hit Anthropic in CI. |
| **4 route (sync)** | auth required (401); non-owned ⇒ 404; bad question ⇒ 400; no-key ⇒ 409; **no-evidence ⇒ refuse WITHOUT calling adapter** (assert mock adapter not invoked); timeout ⇒ 504; refusal vs error separation; `{data,error,meta}` shape; `groundingDeterministic:true` | Vitest route test with mocked `auth()`, mocked `db`, **mocked adapter** returning canned `{text,claimedCitationIds}`. Assert the deterministic pipeline runs and the citation set is enforced. Playwright e2e for the happy path against a stub provider. |
| **5 UI** | citations render only validated ids; clicking scrolls to a real `#sop-step-{id}`; disclosure always visible; refusal styled as honest non-answer; **no `dangerouslySetInnerHTML` on model output** (SECURITY T3) | Component tests (`@testing-library/react`). Render an answer with one valid + one (already-dropped) citation; assert only the valid chip renders and resolves. Assert the non-authoritative disclosure node is always present. Sanitization test: feed a `<script>`/markdown-image answer, assert it renders inert. |
| **6 persistence + audit** | `bundleHash` stored; `isAuthoritative=false` enforced (no setter path); **recompute path ignores `AskTurn`** (one-way-data test); append-only audit row written; no raw answer in long-retention if payload-off | Integration test against a test DB. One-way-data test greps the recompute query surface for `AskTurn`. Audit hash-chain continuity test. |
| **7 SSE (opt.)** | citations validated only post-full-text; persisted turn unchanged; disclosure/refusal identical to sync; mid-stream abort persists nothing | Streaming-route test with a chunked mock; assert citations appear only in the final `done` frame; assert abort leaves no `AskTurn`. |

**Honesty/security gate tests that must pass before the panel goes interactive (SECURITY §5 MUST-NOT-SHIP):** tenant-scoped retrieval with per-evidence-id ownership assertion; structured prompting (process content as quoted data); output sanitization (no active HTML/images/arbitrary links); no tool-use; BYOK never in prompt/client/logs; Tier-1 default + egress allowlist; egress redaction honoring `hasSensitiveData`/`isSensitive`; consent gate; cost cap + rate limit; immutable audit; no PII in logs/analytics. Each maps to a test above or a route guard.

---

## 7. Rollout: feature flag, plan gate, cost caps

- **Feature flag:** ship the route + UI behind an env/remote flag (`ASK_THIS_PROCESS_ENABLED`) so the interactive panel can be dark-launched per-cohort. The "Coming soon" tile stays for flagged-off users.
- **Plan gate:** add `askThisProcess` to `FeatureKey` (`plans.ts:15`) + per-plan booleans, OR reuse `intelligenceLayer` (Team+). Gate via `checkFeatureAccess(user, ...)` exactly as `analyze/route.ts:31` does → `403 PLAN_GATE`. **CEO decision (DD-B / Q-CEO-2):** which tier.
- **Consent gate:** explicit opt-in before first egress (SECURITY T7), naming the provider + no-train guarantee; persist consent on the user/tenant; re-consent on provider/tier change.
- **Cost caps (SECURITY T6, load-bearing if a managed key is used):** per-user + per-tenant daily/monthly budget; per-ask input+output token ceiling (enforced in adapter); rate limit (asks/min, asks/day); halt egress on cap. On BYOK these protect the user's own key (a trust signal); on a managed key they protect Ledgerium.
- **Provider trust tier:** Anthropic = Tier-1 (ZDR) by default; Tier-3 hard-blocked; no custom endpoints v1.

---

## 8. Effort + risk per iteration

Effort: S ≈ ≤½ iteration, M ≈ 1 iteration, L ≈ 1 large/2 iterations. Risk reflects determinism/security blast radius.

| # | Iteration | Reuse vs net-new | Effort | Risk | Notes |
|---|---|---|---|---|---|
| **A0/A0b** | ADR-1 (boundary + citation grammar) + ADR-2 (persistence/audit/retention) | net-new docs | S | Low | Define-phase, non-counting. Decisions before code. |
| **1** | `ask-context-builder` pure module | **Reuse** `deriveStepEvidence`/`truncatePageTitle`/`deriveAlignmentPill`; net-new bundle/hash/CitationSet | **S–M** | **Low** | ~80% direct reads of persisted data; port `outcomeObserved` + `automationHint` derivations (~25 LOC). Watch canonical hash (R-3). Ships fully offline. |
| **2** | `citation-validator` pure module | net-new (~60 LOC) | **S** | **Low** | Pure set intersection + downgrade rule. Exhaustively golden-testable. Ships offline. |
| **3** | `AIProviderAdapter` (Anthropic) + redaction + **BYOK envelope decrypt** | **Net-new** (no SDK, no vault today) | **L** | **High** | **The cost center.** KMS integration, per-tenant DEK, `AiProviderCredential` model, redaction pre-stage, no-import isolation, credential-leak tests. First non-deterministic surface. |
| **4** | `/api/workflows/[id]/ask` route (sync) | **Reuse** auth+ownership+Zod+envelope pattern; net-new orchestration | **M** | **Medium** | First place both zones meet — boundary enforced operationally. Timeout, refusal-vs-error taxonomy, no-evidence-skips-LLM. Confirm handler-timeout vs deploy cap (R-2). |
| **5** | `AskThisProcessPanel` UI | **Reuse** `#sop-step-{id}` DOM ids + violet shell; net-new input/answer/chips | **M** | **Medium** | Citation chips, disclosure, refusal state. **New rendering sink** ⇒ sanitizing markdown allowlist, no `dangerouslySetInnerHTML` (SECURITY T3). Resolve ordinal→`step.id` (G-2). |
| **6** | Persistence + audit + retention/purge | net-new Prisma (additive) | **M** | **Medium** | Migration is S; audit hash-chain + one-way-data invariant + GDPR purge carry the risk. |
| **7 (opt.)** | SSE streaming v1.1 | **Reuse** Next.js `ReadableStream`; net-new streaming route variant | **M** | **Medium** | Doubles route test surface (abort/partial). Same contract. Fast-follow. |
| **P2** | ADR-3 RAG/retrieval | deferred | — | — | Only if a process grows large; must stay deterministic. |

**Critical-path observation:** iterations 1, 2, 5 are cheap and low-risk. **Iteration 3 (BYOK/KMS/adapter) is the schedule and risk driver** and is entirely greenfield — it is effectively a scoped slice of the vision's AI+1/AI+3 work. If the org wants to ship value early, **iterations 1 + 2 (+ Phase-A deterministic no-LLM answers for count/shape/decision/conformance questions per PRD §9 Phase A) can ship as a standalone honest release before any provider plumbing exists.** That is the highest-ROI sequencing and de-risks the boundary before the LLM lands.

---

## 9. Top 5 implementation risks (what's harder than it looks)

1. **BYOK envelope encryption + KMS is greenfield and is the real cost — there is no vault to "reuse."** The architecture says "REUSE the vision's BYOK pattern," but verified: no credential vault, no KMS integration, no provider SDK, no `AiProviderCredential` model exist. Iteration 3 is effectively building the vision's AI+1/AI+3 substrate scoped to one feature. Mitigation: scope to a single provider + single credential model; do not build multi-provider routing; treat KMS/DEK as the dedicated spike with its own credential-leak test gate.

2. **The citation primitive is lost in the view model — the builder must run server-side over the raw `process_output` artifact (G-1).** `SOPViewInstruction` has no `sourceEventId`; PRD §4.2 names the view model as the substrate, which would silently make every event-level citation un-emittable. Mitigation (already the recommendation): build over the raw SOP server-side. This also keeps `sourceEventId` + raw page titles server-side (privacy win). Cheap to do right, catastrophic if missed.

3. **The deterministic `bundleHash` is a hidden non-determinism trap.** Reproducibility (boundary rule 1, the whole audit story) depends on a **canonical, order-stable** serialization of the bundle. `JSON.stringify` over objects with non-deterministic key order, `Set`/`Map` iteration, or floating `confidence` formatting will produce different hashes for identical inputs and silently break the reproducibility claim. Mitigation: a dedicated canonical serializer (sorted keys, fixed number formatting, arrays in ordinal order) + a golden hash test that pins the exact sha256.

4. **The "honesty downgrade" (refuse when zero valid citations) is a policy heuristic that can over-refuse OR under-refuse.** Deciding an answer "made affirmative factual claims" is not mechanically clean: a legitimate meta-answer ("this process has 7 steps") must carry `[[process]]` or it gets wrongly downgraded; an LLM that paraphrases without citing gets correctly refused but feels broken to the user (PRD R-4 over-refusal). Mitigation: require the system prompt to ALWAYS emit `[[process]]` for whole-process facts; ship Phase-A deterministic templates for count/shape/decision/conformance so those never depend on the LLM at all; track refusal-honesty as a two-sided metric (PRD M-3).

5. **Prompt injection via attacker-authored captured content is structural and unavoidable (SECURITY T1/T2).** Page titles, app/target labels, and observed text in the bundle are attacker-controllable (a poisoned Jira/Salesforce/Zendesk record the user recorded). v1 is defensible ONLY because there is no tool-use and credentials are never in context — but the residual is "model emits attacker-chosen text," which becomes an **exfil/XSS vector if the answer is rendered as rich markdown** (T2/T3/T14). Mitigation (MUST-NOT-SHIP-WITHOUT): structured prompting (content as quoted JSON data, never instructions), output sanitization (strip active HTML/images/arbitrary links), no `dangerouslySetInnerHTML`, CSP, and Tier-1 egress redaction honoring `hasSensitiveData`/`isSensitive`. The SOP view currently uses **zero `dangerouslySetInnerHTML`** — that invariant MUST be preserved for the answer sink.

### Secondary risks (track, not top-5)
- **R-2 deploy handler timeout:** a 25s sync LLM wait may exceed a serverless function cap. Confirm the deploy target allows long-running Node handlers (Railway/Render) or lower the LLM timeout below the cap.
- **G-2 ordinal→DOM-id mismatch:** citations key on `ordinal` (number); DOM ids are `sop-step-${step.id}` (string stepId). The UI needs an ordinal→stepId map (trivially built from the view model) to resolve citation clicks.
- **Cost/denial-of-wallet** if a managed key ships before budget caps (T6) — gate managed-key on caps being live.

---

## 10. Recommended sequencing (one-line)

ADR-1/2 → **(1) builder** → **(2) validator** → *[optional Phase-A deterministic no-LLM release here]* → **(3) adapter + BYOK/KMS [cost center]** → **(4) sync route** → **(5) UI** → **(6) persistence/audit** → **(7) SSE fast-follow**. Each is one Mode-2 directed loop; ADRs are Mode-3-adjacent (non-counting). Ship 1+2 (+Phase-A) independently to light the panel honestly before the LLM substrate lands.
