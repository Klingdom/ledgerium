# PERSONA-DRIVEN FEATURE DISCOVERY (DISCOVERY_001)

**Type:** CEO-directed Mode 3-adjacent multi-agent persona simulation + feature discovery (NON-counting; no product code changed).
**Date:** 2026-06-19
**Directive (verbatim):** *"Engage all subagents and simulate the different personas that ledgerium.ai is targeted for and determine top ten feature requests and system enhancements based on top 10 personas. I will review and prioritize from there."*
**Panel (8):** market-research (persona authority) · product-manager (ops/CI/analyst) · growth-strategist (SMB/team-lead/buyer) · competitive-researcher (automation/consultant, sourced) · ux-designer (daily users) · system-architect (IT/CIO + platform) · security/compliance (CISO/audit) · analytics (data-consumer/exec + adoption measurement).

> **Ground-truth corrections (architect, verified against live schema/API):** teams/orgs already shipped (`Team`/`TeamMember`/`TeamInvite`/`WorkflowShare`, workspace Stripe); `ApiKey` (SHA-256, team-scoped) exists but no public `/api/v1` consuming route; **`ProcessGraph`/`Node`/`Edge`/`Variant` schema + full `lib/process-graph/` exist with ZERO producer** (`prisma.processGraph.create` → 0 matches; the dormant-schema flag is real; `computedAtMs: BigInt` already designed in); `TeamMember.role` is a free `String`, not an enforced enum; per-workflow export (BPMN/JSON/Markdown) + `/share/[token]` exist. Feature notes below reflect this — several "new" asks are *finishing half-built assets*.

---

## PART 1 — TOP 10 PERSONAS (ranked by strategic value = reach × willingness-to-pay × moat-fit)

| # | Persona | #1 Job-To-Be-Done | Buying role | Tier | Why it ranks here |
|---|---|---|---|---|---|
| 1 | **Ops Manager / Process Owner** | Keep processes accurate, auditable, trainable without chasing tribal knowledge | Initiator + user + SMB buyer | Starter→Team | Largest segment, acute pain, direct moat-fit, PLG entry — **wedge #1 (volume)** |
| 2 | **Compliance / Audit / Risk Officer** (regulated) | Produce auditor-verifiable evidence that processes ran as documented | Economic buyer / strong gatekeeper | Team→Enterprise | Premium WTP; **the moat IS the product** (determinism = admissible evidence) — **wedge (premium)** |
| 3 | **Automation Analyst / RPA Developer** | Find what's worth automating + accurate maps to build from | Initiator + user (IT sign-off) | Team→Growth | Converts Ledgerium into "process intelligence" in buyers' minds; bridge to AI vision — **wedge (category credibility)** |
| 4 | **IT Leader / CIO / CTO** | Approve tools that reduce risk without new data/security liability | Economic buyer + gatekeeper | Team→Enterprise | Controls the "yes" at Team+; session-scoped capture converts them from blocker to approver |
| 5 | **Team Lead / People Manager** | Cut new-hire time-to-productivity with current, followable SOPs | Initiator + user; viral sharer | Free→Team | Volume + sharing/virality + the **Team-tier conversion** driver |
| 6 | **Process-Improvement / Lean Six Sigma / CI** | Find highest-variance/waste processes + evidence to prioritize | Initiator + champion | Team→Growth | Pre-sold on evidence; timestudy/variance maps directly onto DMAIC |
| 7 | **CISO / Security & Privacy lead** | Ensure the recorder doesn't exfiltrate PII or add attack surface | Gatekeeper (veto) | Growth→Enterprise | Veto-holder above ~100 seats; converting them unlocks the segment |
| 8 | **Internal Consultant / Transformation / COO office** (incl. exec/economic buyer) | Prioritize a portfolio of improvement/automation initiatives with defensible evidence | Economic buyer / influencer | Growth→Enterprise | Enterprise deal catalyst; portfolio/ROI buyer; high ACV |
| 9 | **Business / Operations Analyst** | Produce accurate process docs/reports fast; feed BI/decks | User + initiator; PLG discoverer | Free→Starter | PLG discovery driver; the "data-out" demand engine |
| 10 | **Founder / SMB Owner / Solopreneur** | Document the business enough to delegate/hire | Buyer + user + initiator | Free→Starter | Top-of-funnel volume + word-of-mouth |

*Dropped/merged from the seed:* Customer-Success/Enablement (moat doesn't fit their customer-facing docs); Knowledge/L&D (merged into #5); BPO/Shared-Services (price-compressor; elements live in #2/#8). Exec/COO economic-buyer folds into #8.

**Win-first wedge:** #1 (volume) + #3 (category credibility) + #2 (premium) — together they cover volume, positioning, and pricing power.

---

## PART 2 — TOP 10 FEATURE REQUESTS / SYSTEM ENHANCEMENTS (ranked by cross-persona demand × moat-fit × unblock-power)

Effort S/M/L. "Moat" = leverages the deterministic/evidence-linked advantage no competitor can copy. Persona numbers reference Part 1.

### F1 — PII / secret redaction & masking AT CAPTURE (client-side, enforced, demonstrable)
- **Personas:** 7 (hard-block), 2, 9, 4 — unblocks healthcare/finance/HR verticals.
- **What:** detect & mask passwords/PII/account-numbers on-device *before* anything leaves the endpoint; configurable allow/deny domains + field denylist; visible proof ("3 fields masked"); review-at-finalize. Evidence record stores a marker, not the value.
- **Why / moat:** the #1 trust blocker for any recorder; deterministic, policy-engine-based execution is the edge. The CISO's single adoption blocker today.
- **Effort:** L. **Build note:** the `policy-engine` already does sensitivity scrubbing — productize it *in the content script* + add the review UI + proof.

### F2 — Editable documentation layer over the immutable evidence
- **Personas:** 1, 5, 10, 9. **The "capture-to-trust loop" fix.**
- **What:** rename step labels to plain language, add step notes/instructions, **hide** noise steps (misclicks/hovers), flag "captured in error" — all on a **display layer**; the evidence layer stays immutable and feeds the intelligence engine.
- **Why / moat:** without it the SOP is technically accurate but unreadable → users re-record or revert to Google Docs; this is the layer that makes determinism *human-usable* without breaking immutability.
- **Effort:** M. **Build note:** requires a clean evidence-layer/documentation-layer separation (architecturally the most important UX bet).

### F3 — Sharing & export: view-only links + SOP/Report export (PDF/Markdown/Notion) + CSV/Excel of metrics
- **Personas:** 1, 5, 10, 9, 2, 8.
- **What:** unauthenticated read-only share link (clean doc view, optional expiry/password); PDF/Markdown/Notion SOP export; CSV/Excel of the library metrics + intelligence tables.
- **Why / moat:** the primary downstream value (docs reach the people who execute) + a **viral acquisition loop** (every shared SOP is a branded "generated from real recordings" impression) + gets evidence into decks/BI. Currently a closed loop.
- **Effort:** S–M. **Build note:** `/share/[token]` + per-workflow BPMN/JSON/Markdown export already exist — generalize to bulk/clean-view/CSV.

### F4 — Named baseline snapshot + before/after comparison (delta + confidence) → ROI
- **Personas:** 6, 1, 9, 8 (exec ROI).
- **What:** tag a "baseline" recording and an "after" recording; show cycle-time/step/variant/bottleneck deltas with % change + confidence (N-based); ROI = Δtime × run-frequency × configurable rate.
- **Why / moat:** the DMAIC Measure→Control loop **and** the single most-cited "must-have number" (cycle-time reduction with confidence) **and** the renewal/board ROI story — defensible because before & after are observed, not estimated.
- **Effort:** M. **Build note:** `DriftReport` (baselineValue/currentValue/changePercent) is already designed for this.

### F5 — Surface the engine: per-step timestudy + bottleneck/variant Pareto + evidence drill-down in the Report/dashboard
- **Personas:** 6, 1, 9, 3. **Cheapest high-leverage move.**
- **What:** per-step mean/median/p90/std-dev/CV table; bottleneck & high-variance Pareto with cumulative line; variant diverge/reconverge story; click any finding → the exact runs (`evidenceRunIds`) that produced it.
- **Why / moat:** the engine already computes all of this — **the dashboard's surface vastly under-exposes it**. The drill-down makes the moat *visible* (every number has a receipt). No competitor links a finding to the runs that produced it.
- **Effort:** S–M (presentation gap, not computation).

### F6 — Evidence-linked SOP-conformance / deviation detection + drift alerts
- **Personas:** 2 (LEAPFROG), 1, 8, exec.
- **What:** compare executed runs to the approved SOP → flag missing/extra/out-of-order steps, each linked to evidence; alert on drift ("process no longer matches the approved SOP" / cycle-time +20% vs prior window).
- **Why / moat:** **the auditor's core deliverable, done from observed evidence (not estimates)** — category-unique; + proactive drift monitoring closes the "SOPs go stale silently" pain.
- **Effort:** M–L.

### F7 — Tamper-evident evidence chain + audit-ready export that preserves the trace (+ retention/legal hold)
- **Personas:** 2 (LEAPFROG hard-block), 7.
- **What:** hash-chain/append-only signed evidence + trusted timestamps + "verify integrity"; export to audit-binder PDF/Word where each step/figure **retains** its evidence link + integrity hash; configurable retention + immutable legal hold + defensible disposal.
- **Why / moat:** converts "a recording" into **admissible evidence**; makes determinism *provable* to an examiner and *survive the export* — the moment the moat matters most.
- **Effort:** M–L.

### F8 — Enterprise trust & control plane: enforced RBAC + immutable access/audit log + SSO/SCIM + SOC 2 / DPA pack
- **Personas:** 4, 7, 2, 8 — the procurement/approval gate.
- **What:** promote string-roles → enforced role enum at the **API boundary**; distinct append-only `audit_event` (actor/action/resource/time, SIEM-exportable); SSO (SAML/OIDC) + SCIM; SOC 2 Type II + signable DPA + sub-processor list + security questionnaire pack.
- **Why / moat:** no mid-market/enterprise deal opens without these; converts IT/CISO from gatekeeper to approver. The session-scoped/user-initiated model is a *latent* advantage to market to the DPO.
- **Effort:** M–L. **Build note:** teams already exist; RBAC enforcement + audit log = M; SSO via NextAuth OIDC = M, SCIM = L; SOC 2 = a program, not code.

### F9 — Public API + webhooks + connectors (BI / RPA / ticketing / docs) + automation handoff artifact
- **Personas:** 4, 3 (switch-driver LEAPFROG), 9, 8, exec.
- **What:** versioned `/api/v1/*` read API (key-auth via existing `ApiKey`, RBAC-gated, paginated) + HMAC-signed outbound webhooks; connectors to Power BI/Tableau, UiPath/Power Automate/n8n, ServiceNow/Jira, Confluence/SharePoint; **step-level, evidence-linked automation handoff artifact** (BPMN/structured JSON) + step-level automation scoring.
- **Why / moat:** turns Ledgerium from a silo into a **system of record wired into the stack** (the integration/ROI/renewal gate); the automation handoff (session-traceable, platform-agnostic) is a genuine leapfrog vs UiPath's closed loop.
- **Effort:** M (key-verify middleware S; stable contract + webhooks + handoff schema is the bulk). **Build note:** `ApiKey` exists — build the consuming surface.

### F10 — FOUNDATION: stand up the persisted versioned ProcessGraph producer + engine determinism hardening
- **Personas:** ALL (analyst drill-down · consultant versioned comparison · compliance immutable record · automation stable IDs · IT auditable record · scale).
- **What:** wire a writer into the analyze path that emits rows to the **existing** `ProcessGraph`/`Node`/`Edge`/`Variant` schema (versioned, addressable); harden engine determinism (inject `computedAt`/single-clock-boundary, version-pin caches, pin the variant-hash algo — DEP-08).
- **Why / moat:** **the single highest-leverage platform bet — finishing the half-built dormant schema** unblocks F4/F6/F7/F9 and makes the moat a *persisted record* instead of a runtime artifact. Without determinism hardening, persisted graphs aren't reproducible and the moat collapses on the first "why did my map change?".
- **Effort:** M (schema + `lib/process-graph/` done; build the producer + the bounded determinism pattern already proven in `route.ts`).

---

## PART 3 — Also surfaced (11–15; strong, persona-attributed — for the prioritization menu)
- **F11 Activation pack** (Founder/10, Team Lead/5): onboarding templates ("record one of these first"), guided first-recording, **session naming on stop**, library keyword search + tagging — directly lifts first-recording completion + return rate.
- **F12 Team-tier monetization** (Team Lead/5): **contributor-link recording** (record without an account), onboarding bundles / new-hire tracks, SOP **view analytics** — the features that make Team tier a collaboration product, not "more recordings for one person."
- **F13 Exec/portfolio layer** (8, exec): portfolio rollup / executive summary band, **ROI dollar-value dashboard**, scheduled/emailed digests, trend-over-time charts — the renewal/board narrative (depends on F4).
- **F14 Recording hygiene for analysts** (9, 3, 6): pre-record environment/variant tagging + **exclude-recording-from-analysis** (quarantine test/training runs so they don't pollute baselines).
- **F15 KPI methodology glossary** (9, 2): in-product formula/denominator/min-N definitions per metric — closes the "where does this number come from?" credibility gap (cheap, all tiers).

---

## PART 4 — Cross-cutting read & recommended sequencing

**The recurring insight across all 8 lenses:** Ledgerium's engine and moat (deterministic, evidence-linked, immutable) are **far stronger than what the product surface exposes**, and the highest-value features are either (a) *surfacing the engine* (F5), (b) *making the moat human-usable* (F2/F3) and *provable* (F6/F7), or (c) *finishing half-built platform assets* (F8/F9/F10). The determinism moat is also the **security/compliance moat** — but it's currently invisible to the buyers who matter most (CISO/auditor).

**Sequencing logic (for prioritization, CEO decides):**
1. **Cheap, multi-persona, visible now:** F5 (surface the engine) + F3 (sharing/export) + F11 activation.
2. **Trust foundation:** F2 (editable doc layer) + F1 (capture-side redaction).
3. **Retention anchor & differentiator:** F4 (baseline/ROI) → F6 (conformance/drift).
4. **Premium-wedge + deal-gate:** F7 (tamper-evident/audit export) + F8 (RBAC/audit/SSO/SOC2).
5. **Platform bets that unblock the rest:** F10 (graph producer + determinism hardening) → F9 (public API/webhooks/connectors/automation handoff).

**Anti-scope (don't chase):** ERP event-log connectors / full BPM governance suites (Celonis/Signavio moats irrelevant to the browser wedge); becoming an RPA execution engine (stay the intelligence layer); LLM-estimated metrics (would destroy the "measured, not estimated" moat — the core wedge vs Scribe Optimize's $75M LLM-inferred push).

---

*Mode 3-adjacent diagnostic. No iteration counter incremented. No product code changed. Consolidated from 8 specialist persona simulations (full outputs retained in session). Personas + features are proposed; the CEO reviews and prioritizes.*
