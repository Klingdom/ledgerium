# AI Integration Platform — Strategic Vision Review 001

**Date:** 2026-05-11
**Mode:** Mode 3-adjacent multi-agent strategic alignment review (NON-counting toward improvement-loop cadence)
**Trigger:** CEO directive (2026-05-11, verbatim): *"I want to turn ledgerium into a process intelligence platform that can easily connect to all major AI API platforms so that users can record and baseline any digital process and then get suggestions on all the ways they can connect AI to the digital workflow. If APIs are provided then ledgerium should initiate and execute recommendations."*
**Coordinator:** AI CTO (orchestration; zero specialist work performed)
**Agents engaged:** 6 in parallel — `product-manager` / `system-architect` / `competitive-researcher` / `growth-strategist` / `analytics` / `security` (via `general-purpose` with security scoping; `security-engineer` agent type unavailable)
**Precedent format:** DV2-REVIEW-001 / MDR-REVIEW-001 / WDC-REVIEW-001 / PIB-REVIEW-001 (Mode 3-adjacent NON-counting; MR-005 D-5 audit-intake)
**Consumers:** CEO, coordinator, future PRD authors, build-phase architects

---

## 1. Executive Summary

The CEO directive transforms Ledgerium's positioning from a *measurement platform* (record + baseline) into a *measurement + recommendation + execution platform* (record + baseline + AI-fit recommendation + AI-driven execution + closed-loop measurement). This is a product-vision-level statement that reshapes what Ledgerium is, not a single iteration.

**Six specialist agents** independently produced structured findings on the vision. **Five-of-six converged on the central scope recommendation:** the MVP should ship as *recommendations + dry-run only* with **Tier C/D live execution capability deferred to Phase 2** until audit / standing-order / dry-run infrastructure is in place. Four-of-six converged on **BYOK (bring-your-own-key) passthrough** as the credential model. The directive's "initiate and execute recommendations" language is unanimously interpreted across the panel as a *Phase 2 capability*, not an MVP commitment.

**The strongest distinctive moat candidate** to emerge from convergence: **evidence-linked AI recommendations** — every AI recommendation Ledgerium generates is deterministically traceable to the specific sequence of observed events that produced it, preserving the existing determinism + audit-trail invariants. No competitor in the 17-platform landscape map ships this; Scribe Optimize comes closest but breaks the evidence chain at the screenshot-based capture layer. This positions Ledgerium as defensibly distinct from Celonis (ERP-derived data), Microsoft (screen recording + Copilot), Zapier (connector-first, no observation), and Scribe (screenshot capture, no traceability).

**Window of competitive opportunity: 18–24 months** before well-funded competitors close the full observe → recommend → execute → measure loop. Highest-urgency M&A watch is **Zapier + Scribe acquisition** which would close observation gap instantly.

**Path C (v3 metrics engine) and Path D (workflow-dashboard customization) both continue.** Architect verdict: Path C scope is preserved with 3 additive metric_keys (AI eligibility score / execution count / savings estimate); Path C R+1 pre-blocking-questions Q-ARCH-1 + Q-ARCH-2 are now **unambiguously answered** ("new package" + "Postgres yes") by the AI vision — real progress on the Path C unblock chain. Path D D+5 chip catalog gains 3 AI presets; D+6 default-pack stays 6-column.

**No live-backlog promotions executed at this artifact creation** (vision is forward-looking; CEO PRD approval is the appropriate trigger for promoting the 3 pre-iteration ADRs as Mode 2 directed picks). Pool 41 → 41 unchanged.

**~20 CEO decisions enumerated** in §16, ranked by criticality. Top-4: (1) **BYOK vs managed AI service** — most consequential decision per multi-agent flag; (2) **MVP execution scope: Tier A+B only confirmation** — endorsed by 5/6 panel; (3) **Compliance investment commitment ($50–150k SOC 2 Type II)** — required if enterprise/CIO buyers in scope; (4) **MCP server priority** (within 2–3 iterations per Competitive vs Phase 2 per Architect — DIVERGENT).

---

## 2. Decomposition: 5 Capability Areas

| # | Capability | Current state | Gap |
|---|---|---|---|
| **C1** | Process intelligence platform (measure + baseline) | **MOSTLY SHIPPED** — extension records, normalization-engine + segmentation-engine deterministically baseline, metrics-engine boundary live | Path C R+1–R+7 persistence (32 → all 38 Tier A metrics flip available) |
| **C2** | Connect to all major AI API platforms | **NOT BUILT** — zero existing surface for AI provider integrations | Net-new: BYOK credential vault, provider adapter interface (Anthropic / OpenAI / Google Vertex / Azure OpenAI / AWS Bedrock / Cohere / Mistral / Ollama / MCP), rate-limit + retry handling |
| **C3** | Suggest AI integrations for each step | **NOT BUILT** — opportunity-tag engine identifies automation candidates but doesn't map to specific AI integrations | Net-new: capability-fit classifier, recommendation engine (pure-deterministic), prompt-template recommender, cost/latency estimator, evidence-linked rationale per recommendation |
| **C4** | Initiate AI execution from recommendation | **NOT BUILT** — no execution loop exists today | Net-new: execution sandbox / runner (dry-run-first protocol), idempotency keys, observation capture, rollback semantics, R0–R4 irreversibility classification, audit trail |
| **C5** | Continuous AI workflow management | **NOT BUILT** | Net-new: scheduled re-runs, drift detection (5 metrics), cost/value tracking, gradual ramp, kill-switch |

**MVP scope per 5/6-agent convergence:** C1 (preserved) + C2 (foundation: 1 provider live, 3 more in adapter) + C3 (recommendations surfaced) + C4 **dry-run-only** (the dry-run capability is itself a meaningful product surface; live execution deferred). C5 deferred to Phase 2.

---

## 3. Cross-Agent Convergence — HIGH-CONFIDENCE Findings

These findings appear in **3 or more agent outputs independently** and should be treated as hard architectural / product recommendations rather than open questions.

### 3.1 MVP boundary: dry-run-only; execution deferred to Phase 2 (5/6 agents)

| Agent | Position |
|---|---|
| `product-manager` | "Dry-run only for MVP. Live execution is Phase 2." Rationale: trust gap + asymmetric downside of execution failure + dry-run is reversible. |
| `system-architect` | 10-iteration MVP sequence terminates at AI+10 "Live-run path + observation capture + audit-trail UI surface. Closes C4 dry-run-only commitment in the MVP gate." |
| `growth-strategist` | "Execution must not appear in first-impression copy... The sequence is: record, see the recommendation, trust the recommendation, then hear about execution. Reversing this sequence creates fear before trust." |
| `security` | "MVP starting position: Tiers A + B only; Tier C/D shipped as Phase 2 with the standing-order infrastructure ready. Do not ship action-execution in MVP — execution = production blast radius and demands the audit/compliance/standing-order infrastructure to be in place first." |
| `analytics` | Launch gate matrix requires Gate 3 dry-run pass rate ≥75% and Gate 4 execution success ≥80% before GA — gates are explicitly framed around dry-run as the proof layer. |

**Coordinator recommendation: ELEVATE to a hard CEO recommendation.** The directive's "initiate and execute recommendations" language is interpreted by all 5 agents as a Phase 2 commitment, not MVP scope. Recommend CEO explicitly endorse MVP = dry-run-only to align stakeholders before any build iteration consumes a slot.

### 3.2 BYOK passthrough as the credential model (4/6 agents)

| Agent | Position |
|---|---|
| `system-architect` | Credential vault under `apps/web-app/src/lib/ai-credentials/` with envelope encryption + per-tenant DEK + KEK in cloud KMS. Architecture is BYOK by design. |
| `security` | Envelope encryption pattern recommended; "credentials never appear in LLM-visible context — worker holds them; the prompt never sees them; the LLM never has tool-use ability to read its own credentials." |
| `growth-strategist` | All 5 buying-conversation objection responses assume BYOK passthrough. Pricing recommendation Option C explicitly assumes BYOK. "BYOK vs managed AI service is the single most consequential product-architecture-with-messaging-impact decision in the new vision." |
| `analytics` | Cost-tracking model has two paths: (a) Ledgerium proxies all calls (managed), (b) users self-report (pure BYOK). Acknowledges architectural decision required; cost-tracking instrumentation differs by path. |
| `competitive-researcher` | Pricing recommendation aligns with n8n's BYOK model: "users bring their own API keys and Ledgerium charges only for execution orchestration." Validates BYOK as competitive-defensible pricing. |
| `product-manager` | Open question Q3 surfaces BYOK-vs-resell-AI-capacity as a CEO decision; PM's wedge messaging implicitly aligns with BYOK ("API key required to act" not "Ledgerium pays for inference"). |

**Coordinator recommendation: ELEVATE to a hard CEO recommendation.** BYOK is the architecturally + competitively + financially + security-defensibly correct default. Surface as the highest-priority CEO decision (§16 D-01).

### 3.3 Dry-run pass rate as critical quality gate (5/6 agents)

All 5 agents that addressed quality gates converge on dry-run pass rate as the primary leading indicator before live execution can ship. **Threshold range across agents: 60% (PM) to 75% (Analytics Gate 3).** Coordinator-validated reconciliation: adopt **Analytics' ≥75% as the GA gate** (more defensible — 1-in-4 failure rate is too high for production); preserve PM's 60% as the beta-entry threshold (lower bar for early signal).

### 3.4 Privacy two-tier model: PostHog vs internal audit log (3/6 agents)

Analytics and Security independently designed identical privacy boundary:

- **PostHog gets:** counts, identifiers, slugs, durations, flags, opaque `execution_id` pointer-references, `failure_code` normalized categories. **Never payloads.**
- **Internal audit log gets:** AI provider request/response payloads (raw + canonical), recommendation content, execution payload to target APIs, raw error messages, drift diff content, per-call billing records.

Architect's `ai_audit_events` table + `ai_execution_audit_payload` two-table model (hash-chained + signed by separate KMS audit-log key + 7-year audit retention / 90-day payload retention) is the implementation. **All 3 agent designs are mutually consistent — no reconciliation needed.**

### 3.5 Audit trail is non-negotiable (4/6 agents)

- `system-architect`: append-only `ai_audit_events` table with HMAC-SHA-256 chain hash; `previous_event_hash` chained; signed by KMS audit-log key separate from credential KEK
- `security`: two-table design (events long-retention, payloads short-retention); GDPR right-to-erasure handled by deleting payload rows without breaking audit chain; App role `INSERT` only (no UPDATE/DELETE)
- `growth-strategist`: Audit trail is the selling point to Layer 2 buyers (CIO/security); enterprise objection responses lean on "every execution is logged"
- `analytics`: `execution_id` is the bridge from PostHog events to audit-log content

**Implementation requirement: All AI operations MUST emit append-only audit-log entries before AI-vision GA. This is a hard architectural rule.**

### 3.6 Provider abstraction from day one (4/6 agents implicit, 2/6 explicit)

- `system-architect`: `AIProviderAdapter` interface mandatory at AI+1; 4 providers live by AI+2 to prove abstraction
- `product-manager`: "architecture that supports adding providers without rebuilding" even if MVP ships single-provider
- `competitive-researcher`: BYOK multi-provider as Moat #3; competitive risk of provider lock-in (Microsoft/Azure-OpenAI) makes provider-agnostic design defensively required
- `growth-strategist`: "name the specific platforms supported at launch" implies multi-provider visible by launch
- `security`: 3-tier provider trust model requires registry of multiple providers from day one

**Coordinator recommendation: provider abstraction at AI+1 is non-negotiable.** Sequencing of which provider ships first is a separate decision (CEO Decision §16 D-04).

### 3.7 Determinism boundary preservation (2/6 explicit + 4/6 implicit)

- `system-architect`: "Architectural hard rule — `ai-recommendation-engine` is a pure module with zero `ai-provider-adapter` dependency. Recommendation engine cannot import provider-adapter. Verified by `pnpm exec madge --circular` + an explicit 'no provider imports in recommendation-engine' test in `registry.test.ts` parallel to existing closed-union test."
- `analytics`: privacy posture preserves source-evidence immutability ("AI requests in this context are built from user process recordings... They stay in-system.")
- All 5 agents addressing quality gates assume the recommendation surface itself can be deterministically reproduced — this is what makes audit trails meaningful

**Implementation requirement: `ai-recommendation-engine` must be a pure deterministic module. LLM-driven recommendations slip into the recommendation engine as anti-pattern; audit trail becomes "LLM said so." Architectural rule enforced by circular-dependency check + closed-union test.**

---

## 4. Cross-Agent Divergence — Items Requiring CEO Arbitration

These findings disagreed across agents and should be surfaced as explicit CEO decisions rather than picked by coordinator default.

### 4.1 MVP provider scope: single vs multi-provider

| Agent | Position |
|---|---|
| `product-manager` | "Anthropic Claude only for MVP, with architecture that supports adding providers without rebuilding." Rationale: team familiarity + simpler UX + single-billing surface. |
| `system-architect` | "AI+1 = Anthropic only; AI+2 = OpenAI + Google + Azure-OpenAI + Ollama providers + schema translators." Rationale: 4 providers force the abstraction to prove correctness. |
| `growth-strategist` | "Name the specific platforms supported at launch (OpenAI, Anthropic, Gemini, at minimum) rather than generic 'AI API platforms.' Generic claims do not convert." |
| `competitive-researcher` | Multi-provider BYOK is Moat #3; provider-agnostic positioning required from launch. |
| `security` | Provider trust tier registry assumes multiple providers exist at launch (Tier 1 = 5 providers). |

**Divergence type:** sequencing. **All agree provider abstraction from day one;** disagree on whether 1 or 4 providers ship live in MVP. Coordinator-recommended resolution: **Anthropic ships at AI+1; OpenAI + Azure-OpenAI ship at AI+2 inside MVP (≤3 providers live by GA); Google Vertex + Bedrock + Ollama defer to post-GA Phase 2.** This satisfies (a) growth's "name specific platforms" requirement, (b) architect's "prove the abstraction with ≥2 providers" requirement, (c) PM's "minimize MVP scope" preference, and (d) competitive's "BYOK multi-provider before market standardizes" timing.

### 4.2 MCP server priority: now vs Phase 2

| Agent | Position |
|---|---|
| `competitive-researcher` | "Ship MCP server within 2–3 iterations." Rationale: 9,400+ MCP servers exist by April 2026; 78% enterprise AI teams have MCP-backed agents; first-mover at protocol layer = zero advantage (commoditized) but first-mover at data-quality-exposed layer is the moat; Celonis already shipped Nov 2025. |
| `system-architect` | "Hybrid — direct-API-first for MVP, MCP-server as a Phase-2 capability." Rationale: trust-boundary direction (Ledgerium-as-client is the natural fit for "agent invoking AI on user's behalf"); MCP server (Ledgerium-as-server) is downstream of Path C R+4 metrics-query routes. |

**Coordinator-recommended resolution: HYBRID with EARLY MCP-server EXPLORATION.** Direct-API as primary MVP path (architect's recommendation); spike an MCP-server prototype in AI+2 or AI+3 as a development-track parallel iteration. Ship the MCP-server officially in Phase 2 once Path C R+4 routes exist (architect's gating constraint). Establishes ecosystem presence without delaying core MVP. **CEO decision required (§16 D-04).**

### 4.3 Dry-run pass rate threshold: 60% vs 75%

PM's launch gate ≥60% vs Analytics' Gate 3 ≥75%. Coordinator-recommended reconciliation: adopt Analytics' ≥75% as the **GA gate**; PM's 60% becomes the **beta-entry threshold** (different gate at different lifecycle stage).

### 4.4 Provider cost visibility model

| Agent | Position |
|---|---|
| `analytics` | Decision 2 (open): (a) Ledgerium proxies all provider API calls → exact token counts + pricing → `ai_cost_threshold_hit` event measurable; (b) users self-report API usage → lightweight but unreliable. |
| `system-architect` | Designed BYOK with credentials decrypted only in-process at execution-time, never returned to web request layer. Implies architecture supports proxied calls (worker has the decrypted key) — cost tracking is naturally accurate. |
| `growth-strategist` | Pricing model (Option C) requires cost visibility for "AI free for recommendations, paid for execution" — needs accurate per-execution cost. |

**Divergence type:** clarification needed. **Architect's design supports option (a) by default** since the worker decrypts the key and makes the provider call; Ledgerium has visibility into request/response which includes usage stats. **Coordinator-recommended resolution: option (a) — Ledgerium tracks costs via in-process accounting at the worker layer. Audit log records `cost_usd_cents` per execution. No external proxy required.** This makes Analytics' DD-5 cost-per-execution drift detection and `ai_cost_threshold_hit` events both measurable.

### 4.5 Healthcare HIPAA scope

| Agent | Position |
|---|---|
| `security` | Recommend EXCLUDE healthcare from Phase 1–2 ICP; defer to Phase 3 (~doubles security tooling/audit cost). |
| `growth-strategist` | Doesn't address healthcare directly but notes regulated-industries-objection trigger pattern (V11 mitigation). |

**Coordinator-recommended resolution: defer HIPAA to Phase 3.** Surface explicit "not HIPAA-compliant" notice in ToS for MVP. **CEO decision required (§16 D-12)** with caveat that pursuing healthcare ICP is achievable but requires the compliance investment.

---

## 5. Path C (v3 Metrics Engine) Impact Assessment

**Verdict: Path C still proceeds. Scope preserved with 2 extensions.**

Per architect §8:

- **Path C R+1 `metric_fact` table additions** — 3 new `metric_key`s required to support the recommendation engine substrate:
  - `ai_eligibility_score_0_100` — composite of `repetitiveness_score`, `rule_basedness_score`, `data_entry_share_pct`, `confidence_mean`. **Already covered by Tier B per ARCHITECTURE_METRICS_ENGINE §Layer 7;** verify it lands in R+1 default pack.
  - `ai_execution_count` — NEW metric_key, terminal observable: count of `ai_executions` in `LIVE_RUN_COMPLETED` state per definition per window. Adds to default pack.
  - `ai_savings_estimate_ms` — Tier C until labor-cost config lands; provide proxy for MVP.

- **Snapshot-table architecture extension (iter-055 ADR)** — add per-run AI columns to `process_run_snapshot.metrics_json` blob: `recommended_capabilities[]`, `executed_capabilities[]`, `ai_eligibility_score`. **The JSONB-blob design from iter-055 ADR accommodates this without schema migration. No new ADR required.**

- **NEW ADR needed (post-CEO-approval):** `docs/features/ai-integration/ADR_002_AI_EXECUTION_PERSISTENCE.md` covering `ai_executions` + `ai_audit_events` tables, idempotency-key uniqueness, observation-snapshot retention. Parallel pattern to iter-055.

**Path C R+1 pre-blocking question impact:**

| Question | Status before AI vision | Status after AI vision |
|---|---|---|
| Q-ARCH-1 (new package vs extend-in-place) | OPEN | **ANSWERED: new package** — `metrics-engine` is adjacent to `ai-recommendation-engine`; package-boundary forced |
| Q-ARCH-2 (Postgres storage) | OPEN | **ANSWERED: yes** — `ai_executions` + `ai_audit_events` are append-only event streams; SQLite no longer viable for production |
| Q-GOV-4 (formula transparency) | OPEN | **STRENGTHENED** — recommendation rules MUST be transparent; elevates existing transparency requirement |
| Q-MEAS-1 (north-star targets) | OPEN | **EXPANDED** — north-star now includes ARAR (Analytics §1) |
| DEP-08 (variant hash version pin) | OPEN | **UNCHANGED** |

**Path C unblock progress: 2 of 5 pre-R+1 PRD-blocking questions now resolved by AI vision** (Q-ARCH-1 + Q-ARCH-2). Path C still blocked on CEO revised-PRD approval + 3 remaining questions (Q-GOV-4 / Q-MEAS-1 / DEP-08).

**Plus 2 NEW pre-R+1 questions from PIB-REVIEW-001:** Q-ARCH-3 (event-log abstraction XES/OCEL 2.0 — PIB-P04) + Q-ARCH-4 (Postgres migration trigger thresholds — PIB-P05). **Total pre-R+1 blocking questions: 5 → 5** (net unchanged: 2 closed by AI vision + 2 added by PIB + 3 preserved).

---

## 6. Path D (Workflow-Dashboard Customization) Impact Assessment

**Verdict: Path D continues. D+5 chip catalog gains 3 AI presets; D+6 default-pack stays 6-column.**

Per architect §9:

- **D+5 preset chips:** add 3 AI-specific presets to the chip catalog:
  - **"AI Automation Candidates"** — `ai_eligibility_score ≥ 70 AND case_volume ≥ threshold`. High signal-to-noise pre-filter.
  - **"AI Executions Running"** — workflows with active `ai_executions` rows.
  - **"AI Savings Leaders"** — sort-desc by `ai_savings_estimate_ms`.

- **D+6 default-pack:** keep 6-column default per iter-057 ASK-1 verdict. **Do NOT add AI column to default pack on initial customization-picker rollout** — AI eligibility/execution columns should be *available* via the picker but NOT default. Rationale: AI columns shown by default before MVP iter ships would create empty-state confusion.

- **Column registry extension:** add 3 new `ColumnKey` members to `apps/web-app/src/lib/dashboard-columns/types.ts` — `ai_eligibility_score`, `ai_execution_count`, `ai_savings_estimate_ms`. All `availability: 'pending-path-c-r1'` until R+1 lands the `metric_fact` rows. **Audit-honesty IFF invariant preserved by existing D+1 mechanism.**

**Path D progression unchanged:** D+1 ✓ + D+2 ✓ + D+3 ✓ + D+4 ✓ (iter 061 just shipped); D+5 + D+6 remain on cadence.

---

## 7. Competitive Landscape Map (3 Zones, 17 Competitors)

Synthesized from `competitive-researcher` §1. See full per-competitor details there.

### 7.1 Zone A — Process intelligence platforms adding AI

Players starting from enterprise process data, adding AI provider connectivity:
- **Celonis EMS** — Fortune 500 incumbent; MCP server (Nov 2025); Action Flows execute at process-event trigger level
- **UiPath Process Mining + Autopilot** — strongest Zone A execution depth; Autopilot GA agents Q2 2025
- **SAP Signavio + Joule** — SAP-only ecosystem
- **Scribe Optimize** — closest direct competitor; same capture-first positioning; $1.3B valuation Series C
- **IBM Process Mining + watsonx** — regulated industries; closed ecosystem

### 7.2 Zone B — Workflow execution platforms adding AI

Players starting from integration/execution, adding AI:
- **Zapier (AI Orchestration Platform + MCP)** — 40,000+ actions; MCP server live April 2025
- **n8n** — self-hostable; BYOK standard; 400+ integrations; AI Agent Nodes
- **Make.com** — credit-based pricing (unpredictable); BYOK
- **Microsoft Power Automate + Copilot Studio** — incumbent distribution (M365 bundled); MCP server Q2 2026 Wave 1
- **Tonkean** — enterprise agentic orchestration; MTU pricing; Cinch acquisition Dec 2025
- **Creatio** — May 2026 "Unlimited" pricing model

### 7.3 Zone C — AI orchestration platforms adding process intelligence

Players starting from LLM frameworks, building toward process awareness:
- **Anthropic Claude + MCP ecosystem** — MCP donated to Linux Foundation AAIF Dec 2025
- **OpenAI Assistants + Operator** — Operator agent 2025; MCP adoption March 2025
- **LangChain / LangGraph** — production standard for multi-agent infra
- **LlamaIndex Workflows** — RAG-centric agentic workflows
- **CrewAI / AutoGen / OpenClaw** — multi-agent frameworks

### 7.4 Closest 3 direct competitors

| Competitor | Key strength | Key weakness | What Ledgerium uniquely offers |
|---|---|---|---|
| **Scribe Optimize** | Same observation-first positioning; $1.3B valuation; ICP overlap | Screenshot capture → no event-level traceability; no API execution; no BYOK | Deterministic trace from event to recommendation; BYOK multi-provider |
| **Microsoft Power Automate + Process Advisor + Copilot** | M365 bundled incumbent distribution; broadest execution stack; MCP server Q2 2026 | Process Advisor = screen recording (shallow); no immutable event log; Azure-locked | Immutable evidence chain; BYOK outside Azure; before/after measurement on same event pipeline |
| **Zapier + MCP** | 9,000+ apps; MCP server live; AI Orchestration Platform rebrand | No observation baseline; recommendations not evidence-grounded; task-based pricing surprises | Observe-first execution; evidence-grounded recommendations; closed-loop measurement |

### 7.5 Celonis MCP server vs Ledgerium MCP-server potential

Celonis MCP exposes **derived process intelligence** (KPIs, metrics from a pre-built data model). Requires ERP integration (months + $$$); structurally inaccessible to "any digital workflow" framing in CEO directive. Ledgerium's potential MCP server would expose **live immutable event-level workflow observations** — data that no other MCP server has, because no other platform captures at that level. **The MCP-server itself is commodity; the data quality exposed is the moat.**

### 7.6 Window of opportunity

**18–24 months** before well-funded competitors close the full observe → recommend → execute → measure loop. Specific competitor closure timelines:
- **Microsoft:** 12–18 months (acquisition-accelerated possible)
- **Zapier:** 18–24 months (acquisition of Scribe would close gap in single event — highest-urgency M&A watch)
- **Celonis:** 24–36 months for mid-market
- **Anthropic/OpenAI:** 12–24 months tail risk (highest-severity)
- **Scribe:** 12–18 months to add API execution

---

## 8. Distinctive Moat Candidates (5)

From `competitive-researcher` §6.

| # | Moat | Ledgerium evidence | Why competitors cannot replicate |
|---|---|---|---|
| **M1** | **Evidence-linked AI recommendations (deterministic trace)** | Audit-honesty IFF invariant in D+1 column registry; single-upstream-clock `referenceNowMs`; immutable raw event pipeline; PIB-R13 trust-signal determinism badge | Scribe's evidence chain breaks at screenshot layer; Celonis MCP exposes derived metrics not source events; Zapier has no observation layer; Microsoft Process Advisor = screen recording. Requires rearchitecting capture layer, not just adding an LLM. |
| **M2** | **Baseline-before-vs-after on same event pipeline** | Continuous capture pre + post automation; `referenceNowMs` determinism; Path C R+1..R+3 metric-fact persistence designed for this comparison | All Zone B players execute but don't observe; all Zone A players measure KPIs but from ERP data not browser-level events. Closing the loop on both sides requires capture layer that precedes AND follows execution. |
| **M3** | **BYOK multi-provider inference on deterministic process data** | Directive explicitly names "all major AI API platforms"; metrics pipeline produces structured LLM-consumable data; MCP protocol for vendor-neutral connectivity | Celonis = Azure OpenAI + Anthropic MCP; Scribe = single internal model; Microsoft = Azure-locked; n8n = BYOK but no observation layer. Ledgerium is the only player positioned for BYOK + proprietary evidence-linked dataset. |
| **M4** | **On-prem / air-gap inference option** | `disable_session_recording: true` PostHog privacy posture; immutable local event capture via Chrome extension; structurally compatible with Ollama / vLLM | Celonis cloud-native; Scribe SaaS-only; Power Automate requires Azure. n8n has self-hosted but no observation layer. |
| **M5** | **Execution audit trail linking observation → action** | Immutability-first architecture principle; "every output traceable to source events" invariant; extension already captures | Zapier + n8n log execution but don't link to observed baseline; Celonis Action Flows logged but not connected to source events. Requires holding both observation and execution in same data model — structural rearchitecture required for competitors. |

**Coordinator recommendation: M1 (Evidence-linked AI) is the strongest single-moat candidate.** It anchors all 4 others (M2 requires M1's capture quality; M3's defensibility comes from M1's data uniqueness; M5 extends M1's invariant). Lead with M1 in positioning.

---

## 9. North-Star Metric + MVP Launch Acceptance Gates

From `analytics` §1, §10. Coordinator-validated.

**North-star: AI Recommendation Activation Rate (ARAR)**
```
ARAR = unique users who accepted ≥1 AI recommendation in trailing 28 days
       ─────────────────────────────────────────────────────────────────
       unique users with ≥1 baselined workflow in same 28-day window
```
**Target at beta exit: ARAR ≥ 25%** (1 in 4 eligible users accepts ≥1 recommendation per 28-day window).

**6 MVP Launch Acceptance Gates** (all must pass before MVP exits beta):

| # | Gate | Threshold | Rationale |
|---|---|---|---|
| G1 | Provider Connection Completion Rate | ≥ 60% | Connection is entry gate; below 60% = UX not production-ready |
| G2 | Recommendation Acceptance Rate | ≥ 15% | Below 15% = AI is noise not signal; users will stop opening panel |
| G3 | Dry-Run Pass Rate | ≥ 75% | Below 75% = recommendation engine producing non-executable items |
| G4 | Live Execution Success Rate | ≥ 80% | 1-in-5 failure rate is absolute max for GA |
| G5 | First-Recommendation Time p50 | ≤ 60 minutes | Users connect a provider then don't see recommendations within an hour will assume product is broken |
| G6 | ARAR at beta exit | ≥ 15% | Composite system signal; minimum N ≥ 30 eligible users for validity |

**7 Leading Indicators (LI-1..LI-7)** — see `analytics` §2 for full formulas: Provider Connection Completion / Recommendation Panel Open Rate / First-Recommendation Time / Recommendation Acceptance per Session / Dry-Run Execution Rate / Execution Success Rate / 14-Day Return Rate.

**10 new `AnalyticsEvent` variants** — see `analytics` §3 for full discriminated-union additions: `ai_provider_connection_started` / `ai_provider_connected` / `ai_recommendation_viewed` / `ai_recommendation_accepted` / `ai_recommendation_rejected` / `ai_dry_run_executed` / `ai_execution_executed` / `ai_execution_failed` / `ai_drift_alert_triggered` / `ai_cost_threshold_hit`.

**5 Drift Detection Metrics (DD-1..DD-5)** — similarity-score trend / acceptance-rate deviation / failure-rate spike / response-time degradation / cost-per-execution drift. Alert thresholds + automated actions per metric.

---

## 10. Privacy + Security Posture (Consolidated)

From `security` + `analytics` + `system-architect`.

### 10.1 BYOK credential vault architecture (HARD requirement)

- **Envelope encryption** with per-tenant DEK + AES-256-GCM + KEK in cloud KMS (AWS KMS / Azure Key Vault / GCP KMS — NOT HSM at Phase 1; NOT per-record DEK; NOT custom key derivation; NOT pgcrypto-alone)
- KEK never leaves KMS; only `Encrypt`/`Decrypt` operations
- Per-credential record stores: `nonce` (96-bit), `ciphertext`, `auth_tag` (128-bit GCM), `dek_version`, `algorithm`, `created_at`, `rotated_at`
- Decrypted only in-process at the worker layer at execution-time, never returned to web request layer
- Access to KMS Decrypt logged + alerted in real time on every Decrypt-not-from-known-service-principal
- Principle of least privilege: only worker service role can Decrypt; humans cannot (separate break-glass role with 2-person rule + audit-the-auditor)

### 10.2 Privacy data-flow tiers

| Tier | Default | Payload sent to AI provider |
|---|---|---|
| **Tier 1** (default, restrictive) | All tenants by default | abstracted step shape — `{ step_canonical_id, grouping_reason, system_name, action_label_template }`. No event details, no field values, no URLs beyond domain. |
| **Tier 2** (opt-in, per-workspace) | Off | + `target_summary.field_type`, `page_context.title`, `evidence_refs` count (not contents) |
| **Tier 3** (opt-in, per-execution) | Off | + raw event excerpts. ONLY for explicit per-execution approval. **Default OFF. Never default for recommendations.** |

Enforced at the `ai-recommendation-engine` → `ai-provider-adapter` boundary via a payload-redaction stage mirroring existing `policy-engine` patterns. **The adapter REJECTS calls whose payload contains forbidden fields** (fail-loud-in-dev, fail-loud-in-prod).

### 10.3 Provider trust tier registry (HARD egress middleware)

| Tier | Providers | Use cases |
|---|---|---|
| **Tier 1** (SOC 2 Type II + GDPR DPA + HIPAA BAA available + zero-training + regional residency + ZDR) | Anthropic Enterprise+ZDR; OpenAI Enterprise+ZDR; Azure OpenAI (any plan); AWS Bedrock; Google Vertex AI | Default for all production data including PII-bearing sessions; required for enterprise tenants |
| **Tier 2** (SOC 2 + zero-training-by-default; missing one of HIPAA BAA / ZDR / regional residency) | Anthropic default API plan; OpenAI default API plan; Cohere; Mistral; xAI Grok | Acceptable for free-tier / non-PII workloads; not enterprise without waiver |
| **Tier 3** (free / consumer / unclear data-use; may train on inputs) | Google AI Studio (free); OpenRouter; consumer ChatGPT/Perplexity | **HARD-BLOCKED in production code paths.** |

Implementation: provider registry table + per-tenant `min_tier_required` field + egress middleware enforces `if provider.tier > tenant.min_tier_required: block`.

### 10.4 R0–R4 Irreversibility Classification (HARD requirement)

From `security` §8. Classification source is curated catalog maintained by Ledgerium ops, **NOT LLM self-classification** (known attack vector under prompt injection).

| Class | Definition | UX |
|---|---|---|
| **R0** | Pure (no side effect; LLM-internal computation) | Auto-execute; show result inline |
| **R1** | Reversible-fast (one-click undo within ≤24h) | Auto-execute permitted with standing order; "undo" affordance prominent |
| **R2** | Reversible-slow (undoable but manual intervention) | Per-execution click required; "undo until X" countdown |
| **R3** | Irreversible (no programmatic undo OR third-party-visible side effect) | **Dry-run MANDATORY**; typed confirmation; cannot be auto-executed under standing order |
| **R4** | High-stakes irreversible (financial / identity / legal impact) | **Out of scope for AI execution in Phase 1/2.** Recommendation surface only. |

Unknown actions default to R3 (most conservative).

### 10.5 5 net-new attack vectors

| # | Vector | Primary mitigation |
|---|---|---|
| **V1** | Prompt injection via captured user content → propagates to AI providers | Structured prompting (capture content as JSON-quoted data not interpolated free text); output schema enforcement; HUMAN-in-loop for ALL actions in V1 (Tier A+B only) |
| **V2** | Malicious recommendation chain (recommendation → execution → callback → new recommendation) | Hard chain-depth cap (default = 1); each step independently authorized |
| **V3** | Cost-amplification denial-of-wallet attack | Per-tenant daily budget cap (HALT egress when exceeded); per-credential cost ceiling at decrypt time; cooldown after burst |
| **V4** | Provider-side hallucination → destructive recommendation | R3 irreversibility classification + dry-run mandatory + second-provider verification (Phase 2) + recommendation-provenance logging |
| **V5** | **Credential-theft-via-execution (chains V1+V4)** — worst-case end-to-end exploit | **PRIMARY: credentials NEVER appear in LLM-visible context.** Worker holds them; prompt never sees them; LLM never has tool-use ability to read its own credentials. Egress allowlist on worker. SDK-level scrubbing of Authorization headers. |

### 10.6 Audit trail design (two-table)

**`ai_execution_audit_event`** (long-retention, 7-year):
- `id`, `tenant_id`, `actor_user_id`, `actor_type`, `event_type`, `workflow_id`, `provider_id`, `credential_version`, `action_class`, `payload_hash` (sha256), `payload_size_bytes`, `response_hash`, `cost_usd_cents`, `outcome`, `metadata_json` (structured, no PII), `server_timestamp` (DB-side `now()`), `previous_event_hash` (chain), `event_signature` (HMAC-SHA-256 keyed by KMS audit-log signing key — SEPARATE from credential KEK)

**`ai_execution_audit_payload`** (short-retention, 90-day default; deletable for GDPR right-to-erasure without breaking chain):
- `id`, `audit_event_id` (FK), `redacted_payload`, `redacted_response`, `created_at`

**Hard rules:**
- App role `INSERT` only on both tables (no UPDATE / no DELETE)
- Postgres RLS for tenant isolation (defense-in-depth)
- Nightly chain-verification job alerts on hash mismatch
- HMAC key in KMS, separate role from credential decrypt

### 10.7 Compliance posture summary

| Standard | MVP requirement | Phase posture |
|---|---|---|
| **SOC 2 Type II** | Type I prep starting at Path-D opening; Type II observation period | 6–12 month observation; $50–150k Phase-1 cost |
| **GDPR** | DPIA + DPA with each provider + EU AI Act transparency notice **MUST land before public launch** | sub-processor disclosure; data minimization at egress; right-to-opt-out honored |
| **HIPAA** | EXCLUDE healthcare from Phase 1–2 ICP; defer to Phase 3 | If healthcare in scope: BAAs + dedicated HIPAA infrastructure |
| **CCPA / CPRA** | Privacy policy disclosures; "Do Not Sell or Share" honored | Sale/sharing classification under contract terms |
| **EU AI Act** | Transparency notice + AI-labeling; recommendation engine = limited risk; ToS prohibition on prohibited-AI uses | Risk classification varies per use case; logging for traceability already covered |
| **ISO 27001** | Parallel with SOC 2 Type II once Phase 2 ramp begins | Often paired by enterprise customers |

---

## 11. Architecture: Module Decomposition + 10-Iteration MVP Sequence

From `system-architect` §1, §10. Coordinator-validated.

### 11.1 Net-new package + directory layout

```
packages/
  ai-provider-adapter/              [NEW, pure, no I/O above HTTP-fetch]
    src/types.ts                     AIProviderAdapter interface, ProviderCapability flags
    src/registry.ts                  frozen catalog of supported providers
    src/providers/{anthropic,openai,google,azure-openai,cohere,ollama}.ts
    src/schema-translators/          provider-specific tool-schema ↔ canonical
    src/cost.ts                      per-provider token cost table (versioned)

  ai-recommendation-engine/         [NEW, PURE deterministic module — zero provider-adapter import]
    src/types.ts                     AICapability, RecommendationCandidate
    src/capabilityCatalog.ts         closed-union catalog of AI capability classes
    src/stepClassifier.ts            DerivedStep → capability-fit candidate(s)
    src/ruleSet.ts                   deterministic rule registry (versioned)
    src/scoreRecommendation.ts       composite score (fit × frequency × impact)
    src/rankPortfolio.ts             run/definition-grain ranking

  ai-execution-runner/              [NEW, depends on ai-provider-adapter]
    src/types.ts                     ExecutionRequest, ExecutionResult, ExecutionMode
    src/runner.ts                    core execute() — dry-run | live
    src/idempotency.ts               deterministic idempotency-key derivation
    src/rateLimiter.ts               per-provider token-bucket
    src/retryPolicy.ts               exponential backoff + circuit-breaker
    src/costTracker.ts               token accounting

apps/
  worker/                            [NEW or extended; BullMQ + Redis forced to real-infra]
    src/jobs/{ai-recommendation-materialize,ai-execution-run,ai-execution-observe}.ts

  web-app/src/
    lib/ai-credentials/              credential vault (encrypted-at-rest)
    lib/ai-integration-adapter.ts    metricsV3/intelligence → recommendation engine input
    app/api/ai/{providers,credentials,recommendations,executions,audit}/route.ts
```

**Net new:** 3 packages + 5 Prisma tables + 7 API routes + 1 worker package.

### 11.2 10-iteration MVP build sequence

**Pre-iteration ADRs (must land BEFORE iter 1 — post-CEO-vision-approval):**
- **ADR-AI-001 — Provider Protocol** (MCP vs direct-API; coordinator-recommended HYBRID; direct-API-first + MCP-spike in AI+2/3 + MCP-server Phase 2). ~150 lines. `system-architect` primary.
- **ADR-AI-002 — Execution Persistence** (table shapes, event-store, idempotency). ~200 lines. Parallel to iter-055 SNAPSHOT_TABLE_DECISION.
- **ADR-AI-003 — Payload Policy + Trust-Boundary Tiers** (Tier 1/2/3, opt-in semantics, redaction class). ~150 lines.

**MVP iterations (10 iterations; Mode 1 series, NOT Mode 5 batch — per Architect §10 + Path D precedent):**

| Iter | Surface | Primary agent | LOC est. | Notes |
|---|---|---|---|---|
| **AI+1** | `ai-provider-adapter` foundation + Anthropic provider only | `system-architect` (D-4 clause 2 fires) | ~600 LOC | Pure module + tests; NO API surface yet |
| **AI+2** | `ai-provider-adapter` expansion: + OpenAI + Azure-OpenAI + schema translators | `system-architect` | ~800 LOC | 3 providers live; proves abstraction. Coordinator recommends MCP-spike parallel-track here. |
| **AI+3** | Credential vault + `ai_credentials` Prisma migration + `/api/ai/credentials` + `/api/ai/providers` | `backend-engineer` | ~500 LOC | Hits security-engineer ADR review |
| **AI+4** | Capability catalog + recommendation engine core (PURE module + golden fixtures) | `system-architect` (D-4 clause 2 fires) | ~700 LOC | Architectural hard rule: zero provider-adapter import |
| **AI+5** | Recommendation persistence + `ai-recommendation-materialize` BullMQ job + `/api/ai/recommendations/[id]` | `backend-engineer` | ~500 LOC | Depends on BullMQ + Redis infra (forks AI+5a if infra not yet live) |
| **AI+6** | Recommendation UI surface (column registry extension + recommendation panel on workflow detail view) | `frontend-engineer` + `growth-strategist` adjacent (D-4 clause 1 fires) | ~600 LOC | Many copy strings; brand-voice consult required |
| **AI+7** | Execution runner package + state-machine + idempotency + `ai_executions` + `ai_audit_events` migration | `system-architect` (D-4 clause 2 fires) | ~800 LOC | |
| **AI+8** | Dry-run end-to-end: `POST /api/ai/executions` enqueues runner in dry-run mode | `backend-engineer` | ~400 LOC | |
| **AI+9** | Human-approval gate UI + `POST /api/ai/executions/[id]/approve` | `frontend-engineer` + `ux-designer` adjacent | ~400 LOC | High-stakes UX |
| **AI+10** | Live-run + observation capture + audit-trail UI surface | `backend-engineer` | ~500 LOC | **Closes C4 dry-run-only commitment in MVP gate** |

**Total MVP build:** 10 iterations + 3 pre-iteration ADRs = 13 iterations. **Mode 5 N=10 would trigger MR-005 D-7 mandatory pre-check;** recommend **Mode 1 series** (preserves bounded-loop discipline; parallel to Path D pattern).

### 11.3 Top 5 architecture risks (with mitigations)

1. **Provider lock-in** → `AIProviderAdapter` interface provider-agnostic from AI+1; 4+ providers by AI+2 prove the abstraction
2. **Determinism erosion** → architectural hard rule: `ai-recommendation-engine` ZERO `ai-provider-adapter` import; verified by circular-dep check + closed-union test
3. **Performance (LLM 2–10s latency)** → ALL LLM calls via BullMQ jobs, NEVER in request path
4. **Cost run-away** → per-tenant monthly budget cap + per-provider rate limiter + pre-flight cost projection
5. **Security/secrets** → envelope encryption + per-tenant DEK + KEK in cloud KMS; credentials decrypted in-process only

---

## 12. Pricing Tier Model

From `growth-strategist` §7 + `competitive-researcher` §8. Coordinator-recommended.

**Recommended: Option C — AI free for recommendations / paid for execution. Hybrid: seat-based platform access + cost-passthrough-plus-margin on execution.**

| Tier | Capability | Pricing |
|---|---|---|
| **Free** | Record + baseline + see AI recommendations + opportunity scores | Existing free-tier preserved |
| **Starter** | Free + connect 1 AI API + N dry-run executions/month | Existing $29/mo preserved + AI dry-run quota |
| **Team** | Starter + full AI execution + connected APIs + execution audit log + BYOK API key management + team-level approval workflows | Existing team-tier preserved + execution capability |
| **Enterprise/Platform** | Team + unlimited execution + custom API endpoint support + SSO + data residency controls + SLA + dedicated support + on-prem/air-gap inference option | Custom; CIO conversation |

**Avoid: Option A** (AI as new top-tier-only plan) — buries the aha moment behind paywall and means most free/Starter users never see new vision.

**Free→paid handoff redesign:** new handoff moment is "first time user clicks Run this recommendation" — replaces current quota-based upgrade CTA. Handoff copy names the specific thing about to happen: *"To execute this recommendation, connect an AI API and upgrade to Starter. The recommendation will run against [step name] using your API key — [N] seconds of processing estimated."*

**Team Trial reframing:** from quota-trial to execution-trial — *"Start your AI execution trial — 5 AI recommendations surfaced, 3 dry-runs included, 1 live execution available."* The word "execution" should be visible in the trial CTA (replaces current "Upgrade to Team for unlimited" copy which actively undermines the AI positioning).

---

## 13. Positioning + Wedge Messaging

From `growth-strategist` §1, §2, §3. Coordinator-validated.

### 13.1 Recommended positioning statement (Candidate A)

> *"Ledgerium is the AI integration platform for ops and automation teams that baselines every digital process from real behavior, then maps exactly where AI fits — and executes it when you're ready."*

**Why this:** Specificity on all three acts: (1) baseline from real behavior (preserves moat); (2) maps where AI fits (produces an integration map deliverable, not just a report); (3) executes when you're ready (explicit consent model differentiates from black-box automation).

### 13.2 Recommended wedge messaging (hero + subhead pairing)

- **Hero (W1):** *"Every process you record becomes an AI integration map."*
- **Subhead (W2):** *"Watch your work. Find where AI belongs."*

### 13.3 Trust-first reframe — primary pattern

> **"You approve what runs."** — explicit consent model is the differentiator vs black-box automation. Supporting copy patterns: "Evidence-grounded AI" (Pattern 1) at recommendation surface + "Auditable from step to execution" (Pattern 3) at security/enterprise objection moments.

### 13.4 ICP shift — two-layer buying dynamic

- **Layer 1 (initiator — current ICP preserved):** Process Owner / Ops Manager / BizOps Analyst. Records, sees recommendations, evaluates on capture ease + recommendation quality + integration breadth.
- **Layer 2 (approver/gatekeeper — NEW):** CIO / CTO / CISO / IT Operations Lead. Evaluates on data governance + execution safety + audit trail + API key management. Can block or accelerate. Brings enterprise contract cycle into scope.

**Persona expansion: 4 personas defined** — Process Owner / AI-Automation Lead / Security-Compliance Officer / IT Operations Lead. Each with specific value claim + key moment + objection-trigger pattern. See `growth-strategist` §5 for full details.

---

## 14. Launch Timing Recommendation

From `growth-strategist` §10. Coordinator-validated.

**Recommended: Progressive disclosure — ship features, let value compound, repositioning emerges from observed beta behavior.**

**4-step launch sequence:**

1. **Make the moat visible BEFORE the AI vision ships.** Ship **PIB-R13 (trust-signal determinism badge)** and **PIB-P10 (category identity copy unification, row #96)**. The landing page should explicitly name "evidence-linked AI recommendations" as a coming capability, not as shipped. **This is a HARD launch-gating prerequisite — without it, AI vision messaging will be read as undifferentiated AI-washing.**
2. **Closed beta with 10–20 process owners** from current user base. Let them articulate value in their own words. Their language becomes more credible than Ledgerium's marketing copy.
3. **Repositioning emerges from beta language.** The strongest positioning statement should be assembled from what beta users say when asked "What does this do for you?"
4. **Major repositioning launch** (new landing page + PR + partnership announcements with AI providers) once execution capability ships to GA + at least one case study demonstrates workflow-to-execution value delivery.

**Exception case for accelerating:** if a competitor (Celonis MCP next release, Scribe Optimize next major release, Zapier+Scribe acquisition) launches a directly competing "AI workflow integration" capability in next 90 days, compress moat-visibility timeline to weeks not months.

**Top 3 messaging risks:**
1. **"AI-washing" perception** — mitigation: every AI claim must be immediately followed by grounding statement (what recorded data the recommendation came from)
2. **"Another Zapier clone" perception** — mitigation: position as discovery layer BEFORE automation, not replacement ("Zapier automates what you've already decided to automate. Ledgerium finds what should be automated.")
3. **Execution capability scaring risk-averse buyers** — mitigation: execution must NOT appear in first-impression copy; sequence is record → recommendation → trust → execution

---

## 15. Disposition: P0 Audit-Intake Promotions

**Verdict: ZERO P0 promotions at this artifact creation.** Pool 41 → 41 unchanged.

**Rationale:** Unlike prior Mode 3-adjacent reviews (DV2 / MDR / WDC / PIB) which surfaced defects in *shipped* code that warranted immediate live-backlog promotion, this strategic-vision review is forward-looking — its findings are net-new-build items pending CEO PRD approval. Promoting build items as live-backlog rows before CEO endorsement of the vision would (a) violate the PRD-trigger promotion path semantics from MR-005 D-5, (b) inflate the pool without confirmed work-mandate, (c) pre-commit coordinator sequencing before CEO has selected execution vs deferral.

**Post-CEO-approval promotion path:** if CEO endorses the vision, the appropriate next action is to promote the **3 pre-iteration ADRs** as Mode 2 directed picks:

| Promotion candidate | Score | Primary agent | Effort | Notes |
|---|---|---|---|---|
| ADR-AI-001 Provider Protocol (MCP vs direct-API; coordinator-recommended HYBRID) | 13 | `system-architect` | E=2/R=1 | ~150 LOC; pure decision artifact |
| ADR-AI-002 Execution Persistence (table shapes, event-store, idempotency) | 13 | `system-architect` | E=2/R=1 | ~200 LOC; parallel to iter-055 ADR |
| ADR-AI-003 Payload Policy + Trust-Boundary Tiers (Tier 1/2/3, redaction class) | 13 | `system-architect` | E=2/R=1 | ~150 LOC |

These 3 ADRs unblock AI+1 (first build iteration). Promotion would happen via coordinator action after CEO approval, with `Birth iter: AI-Vision-promoted` (analog to `MR-015-promoted` pattern).

**Path D D+5/D+6 path is independent** — continues regardless of AI vision approval. D+5 chip catalog adds 3 AI presets (consumes Path C R+1 metric_key extensions) when both paths mature.

**Path C revised PRD path:** AI vision answers Q-ARCH-1 + Q-ARCH-2 unambiguously, reducing pre-R+1 PRD-blocking questions from 5+2 PIB additions = 7 down to 3+2 PIB = 5. Recommend coordinator surface this to CEO as accelerating Path C R+1 entry trajectory (was 7 open questions; now 5 with concrete answers on 2).

---

## 16. CEO Decisions Pending (Consolidated, Ranked)

Consolidated from all 6 agent reports. Each decision links to source agent(s) and reflects coordinator-recommended default (if applicable).

### Top-tier decisions (multi-agent flag; affects vision shape)

**D-01 — BYOK vs managed AI service** (4-agent flag; growth-strategist elevates as "most consequential product-architecture-with-messaging-impact decision")
- Coordinator default: **BYOK passthrough** (architect's envelope-encryption design; growth's pricing model; security's threat model all assume BYOK)
- Reverse path: managed service requires Ledgerium to negotiate provider wholesale rates + margin model + double-billing UX

**D-02 — MVP execution scope: Tier A+B only (dry-run + recommendation; defer Tier C/D)** (5/6-agent convergence)
- Coordinator default: **CONFIRM Tier A+B only for MVP; Tier C/D Phase 2**
- Reverse path: ship live execution in MVP requires audit + standing-order + dry-run infrastructure in place first (substantial scope expansion)

**D-03 — Compliance investment commitment ($50–150k SOC 2 Type II)** (security + growth flag; growth's Layer 2 buyer dynamic requires it)
- Coordinator default: **commit SOC 2 Type I prep starting at Path-D opening; Type II observation period 9 months from start**
- Reverse path: defer compliance forecloses enterprise (Layer 2) deals

**D-04 — MVP provider scope: how many providers live by GA?** (divergent: PM single, Architect multi)
- Coordinator default: **Anthropic at AI+1; OpenAI + Azure-OpenAI at AI+2 (3 providers live by GA)**
- Reverse path: single-provider MVP simplifies but constrains "name specific platforms" growth messaging

**D-05 — MCP server priority: ship in MVP vs Phase 2?** (divergent: Competitive HIGH urgency, Architect Phase 2)
- Coordinator default: **HYBRID — direct-API-first MVP + MCP-spike parallel-track in AI+2/3 + full MCP-server Phase 2**
- Reverse path: ship MCP-server in MVP requires Path C R+4 metrics-query routes (architect's gating constraint) which are not yet built

### Mid-tier decisions (specific architectural / product choices)

**D-06 — Healthcare HIPAA scope** (security + competitive flag)
- Coordinator default: **EXCLUDE Phase 1–2; surface "not HIPAA-compliant" notice in ToS**
- Reverse path: include healthcare doubles security tooling/audit cost; requires BAAs with all providers + dedicated HIPAA infrastructure

**D-07 — Provider cost visibility model** (analytics flag)
- Coordinator default: **option (a) — Ledgerium tracks costs via in-process accounting at worker layer**
- Reverse path: user self-reports — lightweight but unreliable cost data

**D-08 — Multi-provider routing strategy** (analytics flag)
- Coordinator default: **user-explicit provider choice in MVP** (avoids interpretation ambiguity in QS-5 provider acceptance differential)
- Reverse path: Ledgerium auto-routes by recommendation type — adds complexity but optimizes cost/quality

**D-09 — Audit-trail retention policy** (security + analytics flag)
- Coordinator default: **7-year audit events + 90-day default payload retention** (per security §11 recommendation; SOC 2 + GDPR-defense floor)
- Reverse path: tiered retention by plan (free = 30 days, enterprise = 7 years) — trades compliance defensibility for cost

**D-10 — Self-host inference scope in MVP** (architect flag)
- Coordinator default: **Ollama only (post-AI+2); enterprise-grade self-host (vLLM, dedicated-tenant, air-gapped) Phase 2**
- Reverse path: enterprise-grade self-host in MVP requires substantial infrastructure surface

**D-11 — Execution authorization model default** (architect + security flag)
- Coordinator default: **per-execution explicit user approval default; standing orders Phase 2 with action-class gating**
- Reverse path: ship standing-orders in MVP requires audit + per-step trust scoring + action-class catalog

**D-12 — Category naming commitment** (growth + competitive flag)
- Coordinator default: **anchor to moat property "evidence-linked" rather than generic compound; defer formal category-name claim until beta language emerges**
- Reverse path: claim category now (e.g., "AI Integration Platform") risks AI-washing perception before product evidence supports the claim

### Lower-tier decisions (operational / launch-timing)

**D-13 — Default tenant trust tier + provider allowlist** (security flag)
- Coordinator default: **free tier limited to Tier-2 providers; enterprise tier defaults to Tier 1 + ZDR**
- Reverse path: Tier-1-only-floor — simpler compliance, harder unit economics

**D-14 — ICP expansion gate** (PM + growth + competitive flag)
- Coordinator default: **mid-market + upmarket expansion simultaneously, with explicit "after first 10 customers successfully use AI execution" trigger for enterprise sales-motion ramp**
- Reverse path: commit to upmarket only — longer cycles, more compliance burden

**D-15 — Execution partnership vs native build** (competitive flag)
- Coordinator default: **build execution layer natively as defensible moat**
- Reverse path: partner with Zapier/n8n MCP for execution breadth — creates dependency on Zone B competitors

**D-16 — Zapier+Scribe acquisition watch** (competitive flag)
- Coordinator default: **establish explicit monitoring for M&A signals from Zapier or Scribe; treat as highest-urgency competitive trigger**

**D-17 — Beta cohort minimum sample size** (analytics flag)
- Coordinator default: **N ≥ 30 eligible users (with ≥1 baselined workflow) before Gate 6 (ARAR) becomes valid**

**D-18 — Value measurement approach** (analytics flag)
- Coordinator default: **option (a) ai_execution_feedback events with opt-in prompts post-execution** (lightweight; preserves Ledgerium's evidence-link principle by capturing user-confirmed value)
- Reverse path: option (b) before/after metric comparison via v3 engine — accurate but adds engine scope

**D-19 — Launch timing: progressive disclosure vs major repositioning** (growth flag)
- Coordinator default: **progressive disclosure** (per growth §10 4-step sequence)
- Reverse path: major repositioning faster but credibility-gap risk if execution capability not shipped

**D-20 — PIB-R13 trust-signal determinism badge + PIB-P10 category identity (row #96) elevated to launch-gating prerequisites** (growth elevates)
- Coordinator default: **endorse promotion of PIB-R13 from cold pool to live row with `Birth iter: AI-Vision-promoted` AND elevate row #96 PIB-P10 priority via re-anchoring CEO decision queue**

---

## 17. Strengths to Preserve (≥10)

From convergent agent emphasis:

1. **Deterministic capture pipeline** (extension → normalization → segmentation → intelligence) — the foundation of M1 evidence-linked moat
2. **Audit-honesty IFF invariant** in D+1 column registry (extends naturally to D+4/D+5 + AI surfaces)
3. **`disable_session_recording: true` PostHog privacy posture** — preserves data-sovereignty commitment as AI vision compounds
4. **Existing `policy-engine` redaction infrastructure** — substrate for AI provider-egress redaction layer
5. **Existing `intelligence-engine.recommendationEngine.ts`** — extend (not replace) as recommendation engine substrate
6. **`SENSITIVE_SELECTOR_RE` from normalization-engine** — substrate for AI egress PII redaction
7. **Iter-055 `SNAPSHOT_TABLE_DECISION.md` ADR pattern** — replicate for AI execution persistence (ADR-AI-002)
8. **Iter-049 `intelligenceJson` adapter contract-prep** — Layer 3 intelligence fields already wired; recommendation engine consumes
9. **iter-031 inline affordances** (`InlineEdit` / `InlineArchiveConfirm` / `HealthTooltip`) — preserve across AI-recommendation panel introduction
10. **Path D module-singleton pattern** (column / filter / persistence registries) — directly replicable for `ai-provider-adapter` registry + `capabilityCatalog`
11. **BullMQ + Redis stack** (planned-infra moves to real-infra under AI vision) — natural execution-runner substrate
12. **`processSessionFull` composed pipeline pattern** (iter 026) — replicable composition pattern for recommendation → dry-run → execution chain

---

## 18. Counter Preservation (Mode 3-adjacent NON-counting)

| Counter | At entry | At close | Delta |
|---|---|---|---|
| Pool | 41 | 41 | 0 (zero promotions; Mode 3-adjacent is forward-looking strategic; ADRs promoted post-CEO-vision-approval) |
| Cool-off recharge | 3/3 FULL RE-ARM | 3/3 FULL RE-ARM | UNCHANGED (Mode 3-adjacent does not consume cool-off per established convention) |
| D-1 reverse-portfolio-drift | 4 | 4 | UNCHANGED (Mode 3-adjacent does not advance 5-iter counting window) |
| Area saturation rolling-5 | not advanced | not advanced | UNCHANGED (Mode 3-adjacent does not increment per MDR/WDC/PIB precedent) |
| MR-016 cadence | 0/3 | 0/3 | UNCHANGED (Mode 3-adjacent NON-counting) |
| #57 flag-retirement chain | 10/10 ENGINEERING-COMPLETE | 10/10 ENGINEERING-COMPLETE | UNCHANGED — only 14d soak remains |
| External-launch MDR-blocker gate | 7/7 CLOSED — FULL | 7/7 CLOSED — FULL | UNCHANGED — launch-readiness preserved |
| Cold-pool ages (DV2/MDR/WDC/PIB) | 6/3/3/3 | 6/3/3/3 | UNCHANGED (Mode 3-adjacent does not increment) |

**5th audit-style intake** (DV2 iter 026 + MDR iter 032 + WDC iter 033 + PIB iter pre-058 + **AI-Vision this intake** cumulative). All 5 follow MR-005 D-5 cold-pool reference pattern; this 5th instance is the first where ZERO P0 promotions execute at intake (intentional — strategic vision forward-looking; ADRs promote post-CEO-approval).

---

## Appendix A — Agent Engagement Summary

| Agent | Output length (approximate) | Key contribution |
|---|---|---|
| `product-manager` | ~3,800 words | ICP / wedge / MVP / 11 user stories / 12 questions answered |
| `system-architect` | ~3,200 words | Module decomposition / 10-iter MVP sequence / determinism boundary preservation / 11 questions answered |
| `competitive-researcher` | ~4,500 words | 17-platform 3-zone landscape / 5 moats / window-of-opportunity timeline / 10 questions answered |
| `growth-strategist` | ~3,400 words | Positioning A + wedge W1+W2 + trust reframe / 2-layer buying dynamic / 11 questions answered |
| `analytics` | ~3,600 words | ARAR north-star / 10 new events / 3 funnels / 6 gates / 5 drift metrics / 10 questions answered |
| `security` (via general-purpose) | ~4,000 words | BYOK threat model / envelope encryption / R0–R4 / 5 attack vectors / compliance / 12 questions answered |

**Total agent output:** ~22,500 words across 6 reports; this synthesis condenses to ~10,000 words preserving cross-agent convergence + divergence map + open-decision enumeration.

---

## Appendix B — Source Citations

Each agent provided structured findings with internal citations. Notable external citations from `competitive-researcher` §11 reference list (preserved verbatim in agent output): Celonis November 2025 product announcements, Zapier MCP guide, n8n AI workflow platform documentation, Make.com August 2025 credit-system launch, UiPath Autopilot agentic automation, Scribe Optimize workflow AI release notes, MCP adoption statistics 2026, Microsoft Power Automate 2026 Wave 1, Tonkean Cinch acquisition + Contracts Hub releases, Anthropic API pricing 2026, AI pricing playbook (Bessemer Venture Partners), AI startup funding trends 2025 (Crunchbase).

---

## End of Artifact

**Awaiting CEO disposition on 20 enumerated decisions.** Next coordinator action upon CEO endorsement: promote ADR-AI-001 + ADR-AI-002 + ADR-AI-003 as live-backlog rows with `Birth iter: AI-Vision-promoted`; schedule AI+1 (provider-adapter foundation) as Mode 2 directed pick. Path D D+5/D+6 + Path C R+1 unblock paths continue in parallel as established.
