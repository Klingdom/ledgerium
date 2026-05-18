# SOP_PROCESSMAP_REVIEW_001 — Mode 3-adjacent Multi-Agent Strategic Review

**Date:** 2026-05-17
**Trigger:** CEO directive (verbatim): *"I want the subagents to review all templates and formats for process maps and SOPs and suggest improvements. These process map and sop outputs need to be the highest quality, best practice sourced, artifacts that users will be excited to use and share."*
**Operating mode:** Mode 3-adjacent diagnostic (NON-counting; precedent: WORKFLOWS_DASHBOARD_REVIEW_002, AI_INTEGRATION_PLATFORM_VISION_REVIEW_001, PROCESS_INTELLIGENCE_BENCHMARK_REVIEW_001).
**Agents engaged:** ux-designer + product-manager + growth-strategist + system-architect + frontend-engineer + analytics + competitive-researcher + qa-engineer (8 specialist agents in parallel; sop-expert framework lens applied by coordinator at Section A synthesis since the agent definition lacked YAML frontmatter for runtime registration).
**Cumulative agent-output words:** ~36,500 across 7 substantive sections, synthesized to ~9,500-word consolidated artifact.

---

## §1 Executive Verdict

### Headline verdict: **TIER C+ — Strong substrate; insufficient visible differentiation; structural shareability + schema gaps.**

The SOP + Process Map output system has genuinely strong foundations that no Tier A competitor matches:

- **Evidence-linked architecture** (every step traces to raw events; deterministic generation; no LLM hallucination) — the moat is REAL
- **3 typed templates** (operator_centric / enterprise / decision_based) covering distinct use cases
- **Confidence-threshold system** (`HIGH=0.85` / `LOW=0.70`) providing honest quality signals at the step level
- **Layered architecture** (builder → selector → validator → renderer → markdownRenderer) with clean separation
- **`SOPValidator`** with 6-rule first-failure-wins quality gate
- **Multi-mode rendering** (Execution / Visual / Intelligence) — no competitor has the process-mining layer ON TOP of SOP output

But the moat is **invisible at the output surface** — and shareability infrastructure that turns artifacts into viral surfaces is absent:

- **No public shareable URL** with polished viewer (CRITICAL — blocks every "excited to share" motivation)
- **No Open Graph / Twitter Card metadata** (every shared link unfurls as blank in Slack/LinkedIn/Teams)
- **No N-attribution** alongside time estimates ("47 runs · 91% confidence" — category-first differentiator; absent)
- **No embed ecosystem** (Scribe ships Notion/Confluence/Salesforce/Zendesk/Webflow/SharePoint embeds; Ledgerium ships none)
- **No "Made with Ledgerium" growth loop** with conversion CTA + `?ref=` attribution
- **Process Map is a CSS dot strip, NOT a real flowchart** — the surface labeled "Process Map" does not meet the structural expectation the label creates

Plus 3 distinct technical foundations that need remediation before AI Vision Build can extend cleanly:

- **3 `new Date().toISOString()` determinism leaks** in `markdownRenderer.ts:309/:580` + `workflowInterpreter.ts:161` (violates Ledgerium core invariant)
- **No `sopSchemaVersion` closed-union** — 3 sibling builders hardcode 3 different `version` strings (`'1.0'` / `'2.0'` / `'1.2.0'`); no migration function
- **2 HARD WCAG 2.1 AA violations** in sop-view components (`role="checkbox"` on `<button>`; `role="listitem"` on `<button>`) + zero axe coverage on the entire `sop-view/` 10-component surface

### The headline recommendation — 4 P0 audit-intake promotions

Per MR-005 D-5 audit-intake protocol, 4 P0 candidates promote to live backlog with `Birth iter: audit-intake-SOPPM-001` (full list in §11):

| # | Title | Score | Effort | Closes |
|---|---|---|---|---|
| **P1** | Public shareable URL + OG metadata + "Made with Ledgerium" footer | 16 HIGHEST | M | Growth loop foundation; #1 blocker to "excited to share" |
| **P2** | Variant confidence badge + N-attribution on SOP cover | 15 | S | Category-first differentiator (4 agents converged); makes evidence moat visible |
| **P3** | sop-view ARIA fix + axe coverage gate | 13 | S-M | 2 HARD WCAG violations + pre-AI-Vision-Build QA prerequisite |
| **P4** | Determinism leak remediation + `sopSchemaVersion` closed-union | 13 | S | Architectural prereq for AI Vision Build extensions |

15 P1/P2/P3 cold-pool items held in this artifact for promotion via P0-burn-down-creates-slot OR PRD-trigger paths per MR-005 D-5 clauses 4-5.

---

## §2 Cross-Agent Convergence Map

Strongest cross-agent consensus is the basis for P0 promotion. Items below where **6 or more of 7 agents** independently flagged the same issue:

### 7-of-7 unanimous convergence

**Shareability infrastructure is absent.**
- UX §B.3 GAP 2 (zero social sharing infrastructure; blank Slack unfurls); §B.9 (THE one move = OG metadata)
- Product §C.4 Gap 1 (no permanent public-shareable URL — blocks every sharing motivation); §C.9 (PRIMARY recommendation = public URL)
- Growth §D.4 (9 of 10 shareability primitives ABSENT or PARTIAL); §D.9 (ONE move = OG tags)
- Architect §E.6 (governance L6 = needs share/lineage); §E.10 M2 (evidence hoist to enable shareable trace)
- Frontend §F.10 (shareable direct links missing); §F.11 (improvements include URL deep-linking)
- Analytics §G.4 (steps 5-6 of shareability funnel are dark; attribution click not tracked); §G.9 Move 3 (attribution_link_clicked event)
- Competitive §H.5 #2 + #5 (embed ecosystem absent; "Made with Ledgerium" loop absent); §H.6 #2 (variant confidence badge prerequisite for share viability); §H.9 Move B (polished public share URL)

**6-of-7 (all but QA) convergence: N-attribution is the category-first move.**
- UX §B.9 implicit (recipient cards should carry "N runs" data)
- Product §C.4 + §C.7 (multi-run lineage; quality score per SOP)
- Growth §D.3 Gap 2 (N-attribution entirely absent); §D.5 Move 2 (N-attribution on time estimates — transforms credibility)
- Architect §E.3 G3 (no variantHash on SOP — DEP-08 highest-leverage open risk per PRD_REVISED §15)
- Analytics §G.8 (SOP quality score formula needs run count as input)
- Competitive §H.6 Move 1 ("Based on 47 runs · 91% confidence" — no Zone 1 competitor can replicate)

**6-of-7 (all but Growth) convergence: Process Map = CSS dot strip ≠ real flowchart.**
- UX §B.2 GAP 1 (HIGH severity — Visual Mode is horizontal dot timeline, not node-edge graph; Lucidchart/Scribe comparison breaks trust)
- Product §C.4 (process map limitations)
- Architect §E.7 (custom node-edge; no BPMN compatibility for export/import)
- Frontend §F.9 (no graph library in codebase; markdownRenderer has Swimlane/BPMN data but no React rendering)
- Analytics §G (process map engagement uninstrumented)
- Competitive §H.5 #1 (visual polish gap vs Scribe/Tango/Lucidchart); §H.3 (Celonis subway-map is category standard)
- QA §I.6 (process map a11y unverified)

### 5-of-7 convergence

**Inter font** (banned-default per WDC-002 + DASHBOARD_DESIGN_ASSESSMENT_001): UX §B.3 GAP 3 + Growth §D + Product §C indirect + Competitive §H.5 #1 + Frontend §F.

**Print stylesheet absent**: UX §B.7 + Product §C + Frontend §F.4 #5 + Competitive §H.5 #6 + QA §I.

**Evidence trace per step is invisible despite being present in data model**: Product §C.4 Gap 3 (evidence chain invisible) + Growth §D.1 ("evidence-linked" mentioned but not surfaced) + Architect §E.3 G3 + Competitive §H.6 Move 2 + Analytics §G.8 + Frontend §F (not surfaced in UI).

### 4-of-7 convergence

**SOP identity header missing** (no cover/hero zone): UX §B.2 GAP 5 + Product §C.4 Gap 2 + Growth §D.3 Gap 4 + Competitive §H.5.

**No multi-template variety per audience**: Product §C.3 (5-template matrix) + Architect §E.5 + Competitive §H.5 #3 (Trainual 400+ vs Ledgerium 1-3) + Growth §D.

---

## §3 Section A — SOP Framework Compliance Audit (Coordinator synthesis applying EPA QA/G-6 + ISO 9001 + FDA SOP frameworks)

The `sop-expert` agent definition file (`.claude/agents/sop-expert.md`) exists in the repo but lacks YAML frontmatter, so it wasn't loaded by the runtime for this review. The coordinator applies the framework lens directly using sop-expert's referenced sources.

### §3.1 EPA QA/G-6 framework compliance

EPA QA/G-6 ("Guidance for Preparing Standard Operating Procedures") prescribes these SOP sections:

| EPA Section | Present in `sopTemplates.ts`? | Notes |
|---|---|---|
| Purpose | ✅ (`SOP.purpose`) | Validator Rule 6 catches boilerplate prefixes |
| Scope | ✅ (`SOP.scope`) | Present in all 3 templates |
| Definitions | ⚠ Partial | No dedicated `definitions` field; terminology embedded in step text |
| Responsibilities | ✅ (`SOP.roles`) | Operator-Centric: single-role; Enterprise: multi-role |
| Procedure | ✅ (`SOP.steps`) | Strongest section; deterministic from event stream |
| Quality Control / Quality Assurance | ⚠ Partial | `SOP.qualityIndicators` exists but not exposed as named QC section |
| Records / Documentation | ❌ MISSING | No "Records to maintain" field |
| References | ❌ MISSING | No `references` field |
| Attachments / Appendices | ❌ MISSING | No `attachments` field |

**EPA TIER: C** — 5 of 9 sections present; 1 partial; 3 missing. The 3 missing sections (Records, References, Attachments) are the "compliance hooks" that auditors actually look for. Adding these as optional fields in `templateTypes.ts:SOP` (with `enterprise` template requiring them, others optional) would bring EPA compliance to B+ with ~30 LOC of schema additions.

### §3.2 ISO 9001 / ISO TC 176 framework compliance

ISO 9001 prescribes "documented information" governance:

| ISO Requirement | Present? | Notes |
|---|---|---|
| Unique document ID | ✅ (`SOP.sopId`) | UUID generated deterministically |
| Version | ⚠ Weak | Free-form string `'2.0'`; no closed union; no migration discipline (Architect §E.2) |
| Effective date | ❌ MISSING | Only `generatedAt`; no separate `effectiveDate` |
| Revision history | ❌ MISSING | No `supersedes` / `revisionHistory[]` field |
| Approver / Approved By | ❌ MISSING | No approval workflow (Product §C.4 Gap 4) |
| Review cadence | ❌ MISSING | No `nextReviewDate` field |
| Document owner | ⚠ Implicit | `workflow.userId` exists but not exposed in SOP output |
| Change control | ❌ MISSING | No `changeLog[]` field; no diff between versions |

**ISO TIER: D** — only 1 requirement fully met, 2 weak, 5 missing. The "Layer 6 Governance" gap identified by Architect §E.6 maps directly to ISO's documented-information requirements. This is the largest framework-compliance gap.

### §3.3 FDA SOP governance framework compliance

FDA SOPs are typically evaluated under 21 CFR Part 11 (electronic records) + general SOP governance:

| FDA Requirement | Present? | Notes |
|---|---|---|
| Unique ID | ✅ | Same as ISO |
| Version with effective + expiry dates | ❌ | Missing per ISO above |
| Approved-by signatures | ❌ | No e-signature; no approval workflow |
| Supersedes-version linkage | ❌ | No `supersedes` field |
| Role clarity | ✅ (`SOP.roles`) | Enterprise template strong here |
| Plain-language imperative voice | ✅ MOSTLY | Growth §D.8 POLISH list catches remaining weak constructions |
| Explicit responsibilities per role | ⚠ Partial | Enterprise template has `roleResponsibility`; could be richer |
| Audit trail (who viewed, edited, executed) | ❌ MISSING | No audit-trail rendering; data exists in `analytics_events` but not surfaced |

**FDA TIER: D+** — 2 met, 2 partial, 4 missing. The audit trail gap is closeable using existing `AnalyticsEvent` data + the iter 068 webhook handler precedent (audit-trail events for billing already implemented at production-quality).

### §3.4 Three elite SOP templates the framework lens recommends

Synthesizing across EPA + ISO + FDA + the 7 specialist agents:

**Template 1: Operational SOP** (today's `operator_centric`, polished)
- Audience: Operator + Trainer
- Core: imperative step list + Quick Start + completion checklist
- Plan gate: Free+
- Distinctive sections: estimated time + system list + per-step confidence badge + N-attribution ("Based on 47 runs")

**Template 2: Compliance SOP** (extend today's `enterprise`)
- Audience: Auditor + Compliance + Manager
- Core: full EPA section set + ISO governance metadata + FDA approval workflow + evidence trace per step
- Plan gate: Team+ (per `auditTrail` feature key in `plans.ts`)
- Distinctive sections: Records to maintain / References / Attachments + Evidence Certificate page (per Competitive §H.6 Move 6)

**Template 3: External SOP** (NEW — Product §C.3 identifies this as the missing template)
- Audience: Customer / Vendor / Partner / External stakeholder
- Core: org-branded header (NOT Ledgerium-branded); clean URL; no internal quality metadata visible; OG metadata; "Made with Ledgerium" footer with conversion CTA
- Plan gate: Starter+ (recommended upgrade-trigger surface)
- Distinctive sections: ORG logo + tagline + "Prepared by" line; cover image; minimal internal-noise

A 4th template — **Training SOP** (Trainer-focused with checkpoints + "why" content + quiz hooks for future) — was proposed by Product §C.3 and confirmed by Growth §D as a Starter-tier candidate. Defer to Phase 2 since it overlaps significantly with Operational SOP.

### §3.5 Process map framework alignment

ISO 9001 process documentation principles + industry BPMN 2.0 standard:

- **ISO process mapping**: focus on inputs/outputs, controls, resources, performance metrics. Current `SIPOC` template addresses this directly; underused.
- **BPMN 2.0 alignment**: industry-standard notation for executive-ready process maps (Celonis uses BPMN as core; UiPath exports BPMN-adjacent). Ledgerium's `BPMN-Informed` template exists in `processMapTemplates.ts` but renders only as Markdown, NOT as visual graph.
- **Custom Ledgerium notation**: today's CSS dot strip is non-standard; readers comparing Ledgerium's "process map" to Lucidchart or Celonis BPMN will perceive a quality gap (Competitive §H.5).

Section recommendation: **commit to BPMN 2.0 as the canonical visual notation for process maps** (Architect §E.7 + Competitive §H.3). Existing data model supports it (`processMapBuilder.ts:59`); rendering layer (graph library) is the missing component.

---

## §4 Section B — UX/Design (ux-designer)

**TIER B-** — Strong structural quality (Quick Start card, time badge, completion checklist, category color coding) but fails the "excited to share" test on three fronts: generic Inter typography, absent social sharing infrastructure, and a "process map" that is a horizontal dot timeline rather than a node-edge flowchart.

### Key findings

**Top 5 visual design gaps (ranked):**

1. **HIGH — Visual Mode "process map" is a CSS dot timeline, not a flowchart.** Single largest gap between the label and the reality. Scribe/Tango/Lucidchart all render genuine node-edge graphs. Any user sharing a Ledgerium "process map" next to a competitor's output will feel the gap immediately.

2. **HIGH — Zero social sharing infrastructure.** No `<meta property="og:*">`, no `<meta name="twitter:card">`, no `og:image`. Every shared link unfurls as blank in Slack/Teams/iMessage/LinkedIn. This is the "excited to share" gate.

3. **HIGH — Inter font** (banned-default per design-assessment Move #1). Reads as "no font decision was made." Framing operational docs in Inter makes them feel like Google Doc exports.

4. **MEDIUM — Text density at 9–11px throughout step bodies.** Step titles at 12px; system pills/confidence indicators/duration labels at 10–11px. Below the readability threshold for instructional content.

5. **MEDIUM — No SOP identity layer** above Quick Start card. No hero/cover/title-zone that says "this is a document worth sharing" before scrolling begins.

**Top 5 strengths to preserve:** Quick Start card pattern + time-to-complete badge + per-step category color coding + completion checklist + Intelligence Mode ambition.

**Top 5 "excited to share" UX moves (ranked):**

1. **HIGHEST — Generate per-SOP Open Graph image at view/export time.** Server-side canvas/Puppeteer-rendered 1200×630 PNG. Converts every shared link into a brand impression.
2. **HIGH — Add distinct SOP identity header** (32–40px title + owner + date + system badges + time badge) above Quick Start.
3. **HIGH — Replace dot-timeline with real flowchart renderer** (ReactFlow/Dagre).
4. **MEDIUM — One-click export to PDF** with print-quality stylesheet + cover page + page-break management.
5. **MEDIUM — "Copy preview link" button** generating `?mode=preview` URL stripping chrome.

**ONE design move that closes the gap:** **Generate + inject social preview metadata with purpose-built OG image.** Every shared Scribe/Trainual link unfurls with title/description/image; every shared Ledgerium link unfurls blank. Five meta tags + 1 endpoint = one sprint = closes the structural shareability gap.

---

## §5 Section C — Audience + Product Fit (product-manager)

### Six personas, six different needs

Today's template treats record-er = read-er. That's wrong at scale.

| Persona | Need | Current coverage |
|---|---|---|
| **Operator** (frontline doing the work) | Maximum scannability, minimum cognitive load, mobile-first | Operator-Centric template comes closest; expanded-by-default + 11px metadata leak technical noise to operators |
| **Manager** (team lead reviewing performance) | Variance + bottlenecks + automation candidates | Largely uncovered in SOP output (Intelligence Mode is closest but oriented at the workflow owner, not a peer manager) |
| **Trainer/Onboarder** | "Why" + common mistakes + checkpoints | `commonMistakes`/`tips` exist in `OperatorSOP` but hidden at bottom + generic-derived rather than authored |
| **Auditor** (compliance/QA/regulator) | Evidence chain + version history + sign-offs | Data model has `sopId`/`version`/`basedOn`/`evidenceEvents` — but **NONE appear in the rendered HTML** in non-technical form |
| **Customer/Vendor/Partner** (external) | Org-branded, polished, brief, public-shareable | **Entirely absent from current product.** No public URL; no org branding; Ledgerium branding dominates |
| **Executive** (CFO/COO/CIO portfolio view) | One-page brief: time, variance, automation, risk | **Entirely absent.** SOP is operational-grain; executive needs are portfolio-grain |

### "Excited to share" decomposes into 4 motivations

- **Operational excitement** (saves time / makes job easier) — current template scores well; preserve
- **Pride excitement** (I look organized when I share this) — **CURRENT TEMPLATE FAILS.** Ledgerium branding leads document; sharer's org is invisible; quality advisory ("2 of 12 steps have low confidence") visible to recipient looks like the doc has known problems
- **Persuasion excitement** (convincing someone — vendor / new hire / investor) — **MISSED.** No automation opportunity callout, efficiency stats, team-comparison data in shared output
- **Insurance excitement** (audit-ready protection) — structurally positioned (Enterprise template) but evidence chain not visible in rendered output; provenance footer is 10px gray disclaimer instead of feature

### Recommended 5-template matrix (extends sop-expert's 3-template proposal)

| Template | Audience | Plan Gate | Design Principle |
|---|---|---|---|
| **Execution** (current Operator-Centric) | Operator, Trainer | Free+ | Minimum words, maximum action clarity |
| **Training** (enhanced) | Trainer, Onboarder | Starter+ | + "why" + common mistakes + checkpoints + trainer notes toggle |
| **Compliance** (current Enterprise + polish) | Auditor, Manager | Team+ | Evidence visible, version history, controls, FDA/ISO governance fields |
| **External** (NEW) | Customer, Vendor, Partner | Starter+ | Org-branded, no Ledgerium chrome, clean URL, no internal advisory |
| **Executive Summary** (NEW) | Executive | Growth+ | One-page brief: time, variance, automation score, risk indicator |

The critical missing template is **External** — the upgrade-conversion driver for sharing. Operator-Centric stays Free (sample artifact + organic sharing); External becomes the first meaningful Starter upgrade ask.

### Top 5 product gaps

1. **HIGH** — No permanent public-shareable URL (blocks every sharing motivation)
2. **HIGH** — Ledgerium branding leads recipient view (undermines pride excitement)
3. **HIGH** — Evidence chain invisible in rendered output (despite full data-model coverage)
4. **MEDIUM** — No approve/sign-off workflow on critical SOPs (required for SOC 2 / regulated industries)
5. **MEDIUM** — No "this SOP is stale" signal (data exists in Intelligence layer but not surfaced)

### Top 3 audience-specific quick wins

- **Operators:** Collapse-steps-by-default + persistent "Step X of Y" progress tracker (CSS+JS in HTML template; zero data-model changes)
- **Customers/Partners:** Two-field header `{OrganizationName} — Standard Operating Procedure` + `Prepared by: {UserName}, {Date}`; move Ledgerium attribution to footer (single copy change)
- **Auditors:** Promote `basedOn` session ID + `engineVersion` from hidden `revisionMetadata` to visible "Document traceability" section in Enterprise/Compliance template

**Primary recommendation:** Build the **permanent, public-accessible URL** (Starter tier) with a recipient view that leads with the sharer's organization name, not Ledgerium's. Every other improvement is secondary — sharing is the distribution mechanism for the product itself.

---

## §6 Section D — Brand Voice + Shareability (growth-strategist)

**TIER B** — Functionally clear; shareability infrastructure absent; differentiation invisible.

### Three voice gaps

1. **Provenance footer is written for engineers, not recipients.** Today: `"Generated deterministically by Ledgerium Process Engine v1.0.0. All steps trace to observed browser events. Schema v1.0.0."` Recipient reads "deterministic" + "Schema v1.0.0" as technical overhead. **Translates to a non-functional brand impression.**

2. **N-attribution entirely absent** (matches Competitive §H.6 Move 1). Every time estimate omits sample size. "Avg: 6m 20s · 31 sessions" is a fundamentally different trust claim than "Estimated: 6–8 min." This is the category-first differentiation move identified at WDC-002 §8 + AI Vision §8 — applied to SOP surface for the first time here.

3. **Zero growth mechanics in shared artifact.** No OG tags, no `?ref=` attribution param, no view counter, no "Made with Ledgerium" CTA with conversion language. Markdown footer has no URL. Every shared SOP is a dead-end for growth.

### Shareability primitive inventory (10 mechanics — 9 absent or partial)

| Mechanic | Status |
|---|---|
| Open Graph tags | ❌ ABSENT |
| Twitter Card tags | ❌ ABSENT |
| Share URL / copy-link button | ❌ ABSENT |
| `?ref=` attribution parameter | ❌ ABSENT |
| View counter (owner-visible) | ❌ ABSENT |
| Branded "Made with" footer with CTA | ⚠ BARE (link only, no CTA) |
| N-attribution on time estimates | ❌ ABSENT |
| Recipient preview (no login) | ⚠ PARTIAL (static HTML download only) |
| Confidence/quality at-a-glance | ✅ PRESENT (dots + footer %) |
| Export/download affordance | ⚠ PARTIAL ("Download sample" only) |

### Top 10 voice POLISH substitutions

These deliver immediate value as a `growth-strategist` D-4 clause 1 consult would. Format: `path:line · FROM → TO`.

1. `sop-execution-sample.html:480` — `"Generated deterministically by Ledgerium Process Engine v1.0.0..."` → `"Made with Ledgerium · every step recorded from real activity · engine v1.0.0"`
2. `sop-execution-sample.html:485-489` — footer CTAs → `"Your team's SOPs can look like this — generated from recorded work, not written by hand."` + `"Try Ledgerium free →"`
3. `markdownRenderer.ts:documentFooter` — add `ledgerium.ai` URL; replace "Generated by Ledgerium AI" with "Made with Ledgerium"
4. `sopTemplates.ts:buildQualityAdvisory` — remove "consider" hedge: `"...review them manually before sharing."` (was: `"...consider reviewing them manually..."`)
5. `sopTemplates.ts:deriveRoleResponsibility` — `"Execute"` → `"Complete"` (robotic → human while precise)
6. `sopTemplates.ts:controlsText` — `"Verify system confirmation at each submission step before continuing"` → `"Confirm system response at each submission step before proceeding"`
7. `sopTemplates.ts:risksText` — `"Standard operational risk — follow procedure steps in sequence"` → `"No elevated risks observed in recorded sessions — follow steps in sequence"`
8. `sopTemplates.ts:escalation path` — `"workflow"` → `"procedure"`; `"team policy"` → `"process owner"`
9. `SOPExecutionMode.tsx:empty intelligence state` — `"No intelligence signals detected"` → `"Intelligence signals appear after 5 or more recorded sessions"` (reframes failure → expectation)
10. `markdownRenderer.ts:SIPOC` — `"Risk Highlights"` → `"Observed Friction Points"` (aligns SIPOC voice with Swimlane's existing "Observed Friction" label)

### "Made with Ledgerium" growth loop

```
User records workflow → Ledgerium generates SOP → User shares link with colleague
  → Colleague sees branded artifact + computed-signal description
  → Colleague clicks "Made with Ledgerium" → /?ref=sop-share landing
  → Landing page shows SOP preview + explains how it was made
  → Colleague signs up → Records own workflow → Loop repeats
```

Required infrastructure (NONE currently present):
- Attribution parameter (`?ref=sop-share`)
- Recipient conversion copy
- Progressive disclosure landing page (matches Notion's "This page was shared with you" + Figma's "View in Figma" patterns)

### ONE shareability move to ship first

**Add Open Graph tags to the shared SOP HTML template + rewrite provenance footer.** Single commit. One file (`sop-execution-sample.html` head block + footer line). One engineering hour. Affects every share that's ever been or will be made. The `og:description` should follow: `"[Workflow] · [N] evidence-linked steps · recorded from [M] sessions · made with Ledgerium"` — three brand claims in 120 characters.

---

## §7 Section E — Architecture (system-architect)

**TIER B-** — Layered architecture, pure-function builders, SOPValidator quality gate are real strengths to preserve. But determinism invariant is broken in three places, `version` discipline is incoherent across three sibling builders, and SOP schema has no slot for AI-era extensions.

### Top 5 schema/architecture gaps

1. **HIGH — No `sopSchemaVersion` closed-union.** Three sibling builders hardcode three different `version` strings:
   - `sopBuilder.ts:158` → `version: '2.0'` (string)
   - `processDefinitionBuilder.ts:44` → `'1.0'`
   - `processMapBuilder.ts:245` → `PROCESS_ENGINE_VERSION = '1.2.0'`
   No closed-union schema-version tag. No migration function. No test asserting "old serialized SOP v2.0 round-trips through new builder without loss."

2. **HIGH — Determinism leaks on user-visible surface.** Three `new Date().toISOString()` sites violate Ledgerium core invariant:
   - `markdownRenderer.ts:309` — fallback when caller forgets `generatedAt`
   - `markdownRenderer.ts:580` — same pattern
   - `workflowInterpreter.ts:161` — unconditional, breaks byte-identity on every call

3. **HIGH — No `variantHash` on SOP.** SOPs are derived from a variant family but the link is implicit. Once Path C R+1 ships `process_run_snapshot.variant_hash`, this absence will break "which SOP represents variant X?" queries. DEP-08 highest-leverage risk per PRD_REVISED §15.

4. **HIGH — No `aiOpportunity` / `aiRecommendation` slot per step in SOP schema.** AI Vision Build requires this and `SOPStep` has no slot. Will force schema change or out-of-band store.

5. **MEDIUM — `markdownRenderer.ts` 681 LOC is a 6-way switch.** New template types require touching the switch. Should follow the dashboard-columns registry pattern (iter 056 D+1 — `WORKFLOW_DASHBOARD_COLUMNS` frozen array with closed union + exhaustiveness lock).

### Top 5 strengths to preserve

1. Pure-function builders (`buildSOP` + `buildProcessMap`) — pure given input
2. Layered architecture (builder → templateSelector → renderer → validator → markdownRenderer)
3. SOPValidator first-failure-wins rule discipline + structured error returns
4. Centralized confidence thresholds (`confidenceThresholds.ts:HIGH=0.85 LOW=0.70`)
5. Closed-union template types (`SOPTemplateType` 3-member + `ProcessMapTemplateType` 3-member)

### The Layered SOP pattern (Architect §E.6)

Adopt 6-layer pattern parallel to ARCHITECTURE_METRICS_ENGINE.md:

| Layer | Concept | Current coverage |
|---|---|---|
| L1 Procedure | step list, action, detail | ✅ complete |
| L2 Context | purpose/scope/trigger/roles | ✅ complete |
| L3 Evidence | which RawEvents back each step | ⚠ partial (event-grain only; needs `evidenceRawEventIds` on `SOPStep` directly) |
| L4 Quality | confidence/variance/completeness | ⚠ mostly complete (missing per-step variance) |
| L5 Improvement | recommendations/automation opportunities | ⚠ partial (friction exists; AI-overlay slot missing) |
| L6 Governance | version/approver/effective date/supersedes/lineage | ❌ insufficient |

Ship sequence: L6 first (governance) → L3 evidence hoist → L5 AI extension.

### Extensibility for AI Vision Build

**Current schema cannot accommodate AI Vision Build without v3 schema migration.** Required additions:

- `SOPStep.aiOpportunity?: AIOpportunity`
- `SOPStep.aiRecommendations?: AIRecommendation[]` carrying `recommendationId` (deterministic from `(stepId, providerCapability, ruleVersion)` — NOT tied to OpenAI/Anthropic-specific IDs), `providerCapability: 'classification'|'extraction'|'generation'|'decision'`, `eligibilityScore`, `irreversibilityClass: 'R0'|'R1'|'R2'|'R3'|'R4'` (per AI Vision §11), `dryRunStatus`
- `SOPStep.aiAuditEventIds?: string[]` → pointers to `ai_execution_audit_event` rows
- `SOP.aiRecommendationsCanDryRun: boolean` invariant gate

Migration path: v2.0 → v3.0 with **additive-only optional fields** + closed-union `sopSchemaVersion: '2.0' | '3.0'` + pure `migrateSOP(raw: unknown)` adapter parallel to `persistence.ts:migratePreferences` (iter 059 precedent).

### Top 3 ship-first architectural moves

| # | Move | LOC | Risk | Value |
|---|---|---|---|---|
| **M1** | `sopSchemaVersion` closed-union + remediate 3 determinism leaks + `migrateSOP` pure adapter | ~80 prod + ~25 tests | LOW | HIGH — unblocks AI Vision schema work; closes determinism invariant |
| **M2** | Hoist evidence + extensibility slots onto `SOPStep` (`evidenceRawEventIds` / `variantHash` / `aiOpportunity` / `aiRecommendations`) | ~150 prod + ~30 tests | MEDIUM | HIGH — unblocks AI Vision Build entry; makes evidence moat surfaceable |
| **M3** | Convert `markdownRenderer.ts` switch dispatcher into registered renderer pattern (parallel to dashboard-columns iter 056 D+1) | ~250 LOC refactor + ~15 tests | LOW | MEDIUM — makes adding 4th template a 30-LOC operation |

**One-sentence verdict:** The architecture is NOT ready for AI-era extensions and needs M1 + M2 foundational schema-version + evidence-hoist refactor before any AI overlay code ships — but the foundation is good enough that M1+M2 are additive-only, not full rewrite.

---

## §8 Section F — Frontend Engineering (frontend-engineer)

**TIER C+** — Functional, ships real value, but has correctness gaps preventing B rating.

### Top 5 code-quality gaps

1. **HIGH — `sop: any` untyped at boundary.** `SOPPageShell.tsx:22` + `sopViewModel.ts:41` propagate `any` through the entire SOP rendering pipeline. Any backend schema change silently bypasses type checking. Highest-leverage single type-safety fix.

2. **HIGH — State mutation during render body.** `SOPPageShell.tsx:78-84` calls `setExpandedSteps` + `setExpandAllInit` synchronously during render. React 18 concurrent renderer may invoke render multiple times before committing → spurious state flushes. Fix: move to `useEffect`.

3. **HIGH (ARIA violations) — Two forbidden role/element combinations:**
   - `role="checkbox"` on `<button>` in `CompletionSection` (`SOPExecutionMode.tsx:~490`)
   - `role="listitem"` on `<button>` in `AskThisProcessPanel` (`SOPIntelligenceMode.tsx`)
   These are CORRECTNESS bugs producing incorrect screen reader behavior, not warnings.

4. **MEDIUM — Helper duplication.** `SectionLabel` + `ConfidenceDot` defined independently in three mode files (Execution / Visual / Intelligence). Maintenance multiplier on every style change.

5. **MEDIUM — No `@media print` stylesheet** anywhere in the SOP view layer. For documents that get printed/PDF-exported, this is a system-wide gap.

### Top 5 strengths to preserve

1. `sopViewModel.ts` adapter pattern — separation of data transformation from rendering is architecturally sound
2. `SOPEmptyState.tsx` accessibility — `role="status"` + `role="alert"` + `aria-label` correctly applied
3. CSS design-token consistency (`var(--surface-elevated)`, etc.) — applied consistently except one hardcoded `from-slate-900` deviation in IntelligenceMode
4. Step card expand/collapse: controlled state in `SOPPageShell` + `aria-expanded` on toggle buttons — correct unidirectional data flow
5. `markdownRenderer.ts` determinism (modulo §7 leaks) — pure functions; provenance metadata produced

### Accessibility gaps (WCAG 2.1 AA)

- **Keyboard navigation:** mode switcher uses Tab only; lacks arrow-key navigation between modes (ARIA Authoring Practices Guide tab pattern violation)
- **ARIA violations:** see code-quality gap #3 above (TWO hard violations)
- **Heading hierarchy:** SOP title in `<span>` badge; `SectionLabel` uses `<div>` not `<h2>`/`<h3>` — screen-reader heading navigation (`H` key) produces no results
- **Skip links:** none present; multi-section document needs "skip to steps" link
- **Color contrast:** 9-11px text throughout falls into normal-text WCAG threshold requiring 4.5:1; needs computed-contrast verification

### Top 3 ship-first frontend improvements

1. **`useMemo` around `buildSOPViewModel` + `useEffect` for expansion initialization** (~8 LOC; zero risk; fixes React correctness)
2. **Fix both ARIA violations** (`<input type="checkbox">` in CompletionSection; `<li><button>` in AskThisProcessPanel) (~25 LOC; zero risk; removes hard WCAG failures)
3. **`@media print` stylesheet + `print:hidden` on UI chrome** (~60 LOC; zero risk; directly enables shareable-artifact use case)

### Process map technical state

Current "Visual Process" mode in `SOPVisualMode.tsx` is **NOT a graph library implementation.** It's a custom CSS dot strip — a `<span>`-per-step horizontal scrollable row with phase break markers. Strengths: lightweight, instant render, no external dep, works at 8-20 steps. Limitations:

1. Conveys no structural process information (30-step SOP and 30-step checklist look identical as dots)
2. Decision branching/exception paths visually indistinguishable from normal steps
3. No concept of parallel paths, swimlanes, or handoffs
4. Dots use `title` attribute tooltips only — keyboard users can't access step details

The `markdownRenderer.ts` contains full Swimlane/BPMN-informed/SIPOC process map renderers with structured `lanes`, `decisions`, `handoffs` data — these are exported as Markdown but never rendered visually in the React UI. **The data model is sufficient to drive a proper visual component; the rendering layer is the missing piece.**

---

## §9 Section G — Analytics + KPI (analytics)

### Current instrumentation audit

| Event | Status | Gap |
|---|---|---|
| `sop_section_viewed` | ✅ Active | One-shot per session; doesn't track Process Map tab dwell separately |
| `first_sop_viewed` | ✅ Active | Lifetime-dedup only; not per-workflow |
| `share_link_created` | ✅ Active | No template type or quality signal attached |
| `share_link_disabled` | ✅ Active | — |
| `share_link_copied` | ✅ Active | No channel (direct vs embedded) |
| `shared_workflow_viewed` | ✅ Active (server-side) | No viewer plan; no artifact type |
| `signup_from_shared_sop` | ✅ Active | Attribution requires session-join |
| `workflow_exported` | ⚠ **DECLARED BUT NEVER FIRES** | Export-markdown route doesn't call `trackServer()` |
| `sop_usefulness_response` | ✅ Active | Survey widget |
| `tab_switched` | ✅ Active | Generic label — doesn't distinguish SOP/ProcessMap/Intelligence tabs |

**Dark surfaces (zero instrumentation):**
- `SOPModeSwitcher` mode changes (Execution ↔ Visual ↔ Intelligence) — entirely uninstrumented
- `SOPPageShell.handleExport()` client + server-side export — no analytics emitted
- Template format switching (Operator-Centric / Enterprise / Decision-Based)
- "Made with Ledgerium" attribution link click
- Time-in-mode per mode
- Section-level engagement (which steps a user expanded, scroll depth, completion)

### "Excited to share" KPI framework

**Leading indicators (predictive):**
- L1 SOP Completion Rate (sessions ≥90s OR all sections expanded)
- L2 Mode Engagement Breadth (sessions touching ≥2 modes)
- L3 Template Repeat Rate (cohorted by plan)
- L4 Section Expansion Rate
- L5 Share-to-View Latency p50

**Lagging indicators (outcome):**
- L6 **Shareability Rate** (≥15% target — workflows with at least one share event / total SOP views)
- L7 **Share-to-Signup Conversion** (≥3% target — `signup_from_shared_sop / shared_workflow_viewed`)
- L8 Export Rate by Plan Tier (Free-tier watermarked exports = conversion signal)
- L9 SOP Usefulness Score (weighted from `sop_usefulness_response.rating`)

### Cohort dimensions (all KPIs must be cohorted, not pooled)

- Plan tier (Free / Starter / Team / Growth)
- Template type (operator_centric / enterprise / decision_based / raw)
- Workflow complexity (step count buckets: 1-5 / 6-15 / 16-30 / 31+)
- Confidence band (null / low <0.5 / medium / high ≥0.8)
- Time-to-first-share (0-1d / 2-7d / 8-30d / never)

### 8-step shareability funnel (with current instrumentation status)

| Step | Event | Status |
|---|---|---|
| 1. SOP viewed | `sop_section_viewed` | ✅ |
| 2. SOP read (depth) | `sop_read_completed` | ❌ MISSING |
| 3. Export or copy | `workflow_exported` / `share_link_created` | ⚠ export silent; share active |
| 4. Share link copied | `share_link_copied` | ✅ |
| 5. Shared view | `shared_workflow_viewed` | ✅ |
| 6. Attribution click | `attribution_link_clicked` | ❌ MISSING |
| 7. Signup initiated | `signup_started` (from share context) | ⚠ attribution may break |
| 8. Signup completed | `signup_from_shared_sop` | ✅ |

### Top 3 measurement moves to ship first

1. **Activate `workflow_exported` in export-markdown route** — type exists, route doesn't call it. **One line. ~5 LOC total. Highest-leverage measurement fix in the codebase.**
2. **Add `sop_mode_switched` to `SOPPageShell.handleModeChange()`** — prerequisite for any mode redesign decision. ~10 LOC.
3. **Add `attribution_link_clicked` to shared SOP page** — completes viral loop measurement. ~8 LOC.

Total iter 075-077 instrumentation surface: ~25 LOC across 3 files. Unblocks the entire measurement framework for the improvements other agents recommend.

### SOP quality score (0-100 composite)

Proposed formula:
```
sop_quality_score =
    completeness_score × 0.35    // confidence, label coverage, system attribution, time present
  + engagement_score × 0.25      // dwell behavior; requires sop_read_completed instrumentation
  + shareability_score × 0.25    // gradient: 0/25/50/75/100 based on share events
  + usefulness_score × 0.15      // from sop_usefulness_response.rating
```

Display tiers: 80-100 "Share-ready" / 60-79 "Good foundation" / 40-59 "Building" / 0-39 "Incomplete".

Surface to owner only; never expose to external recipients (would leak internal quality signals).

---

## §10 Section H — Competitive Benchmark (competitive-researcher)

### Landscape verdict

Ledgerium occupies a **genuinely unoccupied position** — only tool with behavioral event data AND user-facing SOP output:

- **Zone 1** (SOP-first competitors: Scribe / Tango / Trainual / Process Street / Whale / Tallyfy): polished SOP outputs, NO event stream
- **Zone 2** (process-mining: Celonis / UiPath Task Mining / Soroco Scout / Apromore): event streams, NO shareable SOP artifacts
- **Zone 3** (design quality: Notion / Linear / Stripe Docs / Loom): not competitors but design/shareability reference standards

The competitive window is real and the evidence moat is defensible — **but only if the evidence is made visible in the output artifact.** Currently it is not.

### Where Ledgerium is AHEAD (5 dimensions)

1. **Evidence linkage architecturally present.** Every step traces to immutable structured events at browser level. No Tier A or Tier B competitor has this. Scribe Optimize's "real-time workflow data" is screenshot-derived. Celonis processes ERP logs, not user-behavior events. **GENUINE MOAT.**
2. **Deterministic generation, NOT LLM hallucination.** Whale Alice generates SOPs that "may need manual refinement because they are not always 100% correct." Trainual AI Assist requires review. Ledgerium SOPs are extracted from actual recorded events.
3. **Timing data per step.** Current SOP shows `step-dur` (1.2s, 25.0s) per step. No Tier A competitor surfaces measured per-step duration.
4. **Multi-mode rendering architecture** (Execution / Visual / Intelligence + SOP/ProcessMap pair). No Tier A competitor has process-mining layer attached.
5. **Privacy posture defensible.** `disable_session_recording: true` + no screenshot storage means Ledgerium can be used in HIPAA-adjacent, legal, financial workflows where Scribe cannot.

### Where Ledgerium is BEHIND (7 dimensions)

1. **Visual polish — screenshots vs text-only steps.** Scribe's auto-cropped screenshot with red annotation circle on exact click target is THE most memorable single visual in the SOP category. Ledgerium has no screenshot/visual reference at all — significant.
2. **Embed ecosystem absence.** Scribe ships one-click embeds for Notion/Confluence/Salesforce/Zendesk/Webflow/SharePoint. Tango mirrors. Ledgerium has zero. This single gap may explain the entire growth trajectory difference.
3. **Template variety: 1-3 vs 400+.** Trainual: 400+ templates. Process Street: 60+. Ledgerium: 1-3. Template variety drives organic SEO + meets users at their process vocabulary.
4. **Public-share UX unbuilt.** No public-share URL mechanism with polished viewer. Scribe's `scribehow.com/shared/[slug]` loads <1s on mobile.
5. **No "Made with Ledgerium" growth loop.** Every Scribe free export propagates branded attribution; Ledgerium has no equivalent.
6. **PDF/print quality unvalidated** vs Trainual's styled paginated branded exports.
7. **Mobile/touch experience unoptimized** (step rail hidden on mobile = functionality gap, not just layout).

### Top 3 category-first moves

**Move A — Variant confidence badge** ("Based on 47 runs · 91% confidence"): no Zone 1 competitor can replicate without rebuilding capture layer. Implementation: medium effort; data already in pipeline.

**Move B — Polished public share URL with embed code** + "Made with Ledgerium" attribution: Scribe growth flywheel is "share → Made with Scribe → signup." Without this, Ledgerium cannot compete for the evaluation moment.

**Move C — "Evidence certificate" page in PDF export**: last page titled "Evidence Certificate — Generated deterministically from N=47 raw event records, not from AI text generation." Zero engineering — metadata exists. Compliance-buyer category-defining feature.

### Urgency

**12-18 months window.** Scribe Optimize launched November 2025 with $75M Series C; explicitly moving into process intelligence territory. Scribe weakness: capture layer is screenshots, not event streams — 18-24 months to close. Celonis lacks browser-extension capture. UiPath lacks polished share loop. Window is real BUT the differentiation must be made visible NOW.

### M&A watch

- **High-urgency**: Scribe + Tango merger would create near-complete SOP toolchain. Risk: moderate — neither has event streams.
- **Moderate-urgency**: UiPath acquires Scribe. Risk: high — combines event capture with viral SOP loop.
- **Defensive play**: Establish evidence-certificate + variant-confidence-badge BEFORE any acquisition closes. Position "47 runs · 91% confidence" as Ledgerium's signature, where acquirers' screenshots cannot retroactively claim equivalence.

---

## §11 Section I — QA Quality Gates (qa-engineer)

**TIER C** — Backend engine quality gates functional; UI surface has zero test coverage and validator has untested multi-template gap.

### Top 5 quality gaps

1. **HIGH — Validator only tested with `operator_centric` template.** `sopValidator.test.ts` uses only `templateType === 'operator_centric'` fixtures. The `resolveTitle()` + `resolvePurpose()` branches for `enterprise` and `decision_based` are untested. Concrete failure: an `enterprise` template with empty `purpose` passes all 6 validator rules vacuously.

2. **HIGH — Banned recorder string check is case-sensitive.** Rule 1 uses `markdown.includes(banned)` where `BANNED_RECORDER_STRINGS` values are all title-case. Lowercase variants (`'click the div'`) bypass detection.

3. **HIGH — UI layer has ZERO test coverage.** 10 files in `apps/web-app/src/components/sop-view/` have no `*.test.tsx` files. No axe scans. Confidence-dot threshold values at `SOPStepCardCompact:395` hardcode `0.85`/`0.7` — drift risk vs `confidenceThresholds.ts` undetected.

4. **MEDIUM — `sparseWorkflow` 1-step SOP rejection path untested.** `outputQuality.test.ts` confirms 1-step renders without crash, but the `processSession → validateRenderedSOP { ok: false, reason: 'too_few_steps' }` integration path is untested.

5. **MEDIUM — No step count upper-bound or length limits.** A 50-step SOP with 2000-char descriptions passes all rules. No `MAX_STEP_COUNT`. No per-step length cap. Could render 15,000-word unusable artifacts.

### Top 3 ship-first QA moves

1. **QM-1 — Add axe scan for SOP view** (parallels WDC-002 QA BLOCKER 1 fix): create `apps/web-app/e2e/app/sop/sop-a11y.spec.ts` running `assertAxeCompliance` against execution/visual/intelligence modes. ~50 LOC test, 0 production LOC. Identical scope to iter 070 ColumnPicker axe regression coverage.

2. **QM-2 — Add `enterprise` + `decision_based` validator coverage** in `sopValidator.test.ts`. ~6 new `it()` blocks. Closes highest-severity structural coverage gap.

3. **QM-3 — Fix confidence constant duplication + add IFF lock test.** Replace hardcoded `0.85`/`0.7` in `SOPStepCardCompact:395` with imports from `confidenceThresholds.ts`. ~5 LOC production + ~3 test blocks. Highest-confidence-per-effort quality move available.

**Blocker status:** No shipping blockers on engine pipeline. The `sop-view/` UI surface represents a HIGH severity axe coverage gap — should be treated as pre-AI-Vision-Build prerequisite identical to WDC2-P06 (row #105).

---

## §12 Top-Tier CEO Decisions (Top 10 Ranked)

Synthesis across the 7 agent sections — decisions needed before iter 075+ execution begins.

| # | Decision | Recommendation | Convergence |
|---|---|---|---|
| **D-01** | Add public-shareable SOP URL infrastructure? | **YES — highest-leverage single product change.** Plan-tier gate: Starter+ | 7-of-7 unanimous |
| **D-02** | Make N-attribution + variant-confidence badge the SOP cover signature? | **YES — category-first move; no Zone 1 competitor can replicate** | 6-of-7 convergence |
| **D-03** | Replace CSS dot strip "Process Map" with real flowchart renderer (ReactFlow/Dagre/BPMN)? | **YES — defends product credibility; data model already supports** | 6-of-7 convergence |
| **D-04** | Adopt 5-template matrix (Execution/Training/Compliance/External/Executive)? Or stay at 3? | **5-template adoption recommended; External template is the upgrade conversion driver** | 4-of-7 convergence |
| **D-05** | Apply N-attribution across SOP body (not just cover) AND across Process Map? | **YES — every metric carries sample size** | Growth/Competitive/Analytics agree |
| **D-06** | Schema versioning — adopt `sopSchemaVersion` closed-union NOW (before persistence ships)? | **YES — additive, low-risk, enables AI Vision Build** | Architect strong recommendation |
| **D-07** | Activate `workflow_exported` event + add `sop_mode_switched` + `attribution_link_clicked`? | **YES — ~25 LOC; unblocks entire measurement framework** | Analytics primary; all agents benefit |
| **D-08** | Ledgerium-branded recipient view vs org-branded? | **Org-branded recipient view for External template; Ledgerium footer attribution only** | Product/Growth strong; conflict with default brand-promotion stance |
| **D-09** | "Evidence trace per step" — recipient-visible toggle (Move 2) vs internal-only data? | **Recipient-visible toggle — this IS the moat surface** | Competitive/Architect/Product converge |
| **D-10** | Phase 5 server-side observability (per MR-018 §11) — bundle into SOP work, separate iteration, or defer? | **Separate iteration post-WDC-002 P0 close; not bundled** | Coordinator default |

Plus 10 more mid-tier + lower-tier decisions captured in agent sections (see §4-§11 details).

---

## §13 P0 Audit-Intake Promotions

Per MR-005 D-5 audit-intake protocol, 4 P0 rows promote to live `IMPROVEMENT_BACKLOG.md` with `Birth iter: audit-intake-SOPPM-001`:

### #P1 SOPPM-P01 — Public shareable URL + OG metadata + "Made with Ledgerium" growth loop

**Score 16 HIGHEST** | I=5 A=5 L=4 C=5 E=2 R=1 | `frontend-engineer` PRIMARY + `growth-strategist` D-4 clause 1 adjacent

**Scope (single-iteration MVP):**
- New route `/sop/[token]` for unauthenticated SOP viewing
- `og:title` + `og:description` + `og:image` + `twitter:card` meta tags on shared SOP HTML (with computed-signal description per Growth §D.5 Move 1)
- "Made with Ledgerium" footer with `?ref=sop-share` attribution link + conversion CTA
- Copy-URL button in SOP execution mode + `share_link_copied` event already fires
- Plan-tier gate: Starter+ for public URL feature; Free tier exports continue with watermark
- ~150 LOC + ~15 tests

**Closes:** §B.2 GAP 2 + §C.4 Gap 1 + §D.9 ONE move + §H.9 Move B + §G.9 attribution_link_clicked event

### #P2 SOPPM-P02 — Variant confidence badge + N-attribution on SOP cover + step body

**Score 15** | I=5 A=5 L=4 C=5 E=2 R=1 | `frontend-engineer` PRIMARY + `growth-strategist` D-4 clause 1 adjacent

**Scope:**
- Surface `runCount` (already in `WorkflowMetricsOutput.runs`) on SOP cover header as prominent metric
- "Based on N runs · M% confidence" badge in SOP identity header
- Replace "Estimated: 6-8 min" with "Avg: 6m 20s · 31 sessions" pattern on every time-bearing field
- Per-step run-count attribution in expanded step view ("This step observed in 47 of 47 runs")
- ~50 LOC + ~10 tests

**Closes:** §B + §C + §D Gap 2 + §H.6 Move 1 + §G.8 quality score input

### #P3 SOPPM-P03 — sop-view ARIA fix + axe regression coverage

**Score 13** | I=4 A=4 L=3 C=5 E=2 R=1 | `qa-engineer` PRIMARY + `frontend-engineer` adjacent

**Scope:**
- Fix `role="checkbox"` on `<button>` in `SOPExecutionMode.CompletionSection` → `<input type="checkbox">` wrapped in label
- Fix `role="listitem"` on `<button>` in `SOPIntelligenceMode.AskThisProcessPanel` → `<li>` containing disabled `<button>`
- Add `aria-controls` to all expand/collapse buttons with target `id` references
- New `apps/web-app/e2e/app/sop/sop-a11y.spec.ts` with `assertAxeCompliance` ratchet for 3 modes (Execution / Visual / Intelligence)
- ~25 LOC production + ~50 LOC test

**Closes:** §F.3 ARIA violations + §I.5 axe coverage + pre-AI-Vision-Build QA prerequisite

### #P4 SOPPM-P04 — Determinism leak remediation + `sopSchemaVersion` closed-union + `migrateSOP` adapter

**Score 13** | I=4 A=5 L=3 C=4 E=2 R=2 | `system-architect` PRIMARY

**Scope:**
- Remove `new Date().toISOString()` from `markdownRenderer.ts:309` + `:580` + `workflowInterpreter.ts:161`
- Make `generatedAt` mandatory on SOP input; caller must supply
- Add `sopSchemaVersion: '2.0'` closed-union type alias in `templateTypes.ts`
- Add pure `migrateSOP(raw: unknown): { ok: SOP; warnings: string[] } | { ok: null; reason: string }` adapter parallel to `persistence.ts:migratePreferences` (iter 059 D+3 precedent)
- Determinism golden-fixture regression test (same input → byte-identical output) for all 9 template combos
- ~80 LOC production + ~25 tests

**Closes:** §E gaps 1 + 2 + ~80% of architectural readiness for AI Vision Build

### Audit-intake counter mechanics

Per MR-005 D-5 + MR-006 Change D protocols:
- 4 P0 rows promote to live backlog: #107 SOPPM-P01 / #108 SOPPM-P02 / #109 SOPPM-P03 / #110 SOPPM-P04
- 15 P1/P2/P3 items held in cold pool in THIS artifact (see §14)
- Pool delta: 44 → 48 (post-iter-074 close pool was 44; +4 promotions; iter 074 close MR-018 had no pool change)
- Cold-pool age starts at 0; MR-006 Change D 10-iter staleness threshold projected for triage at iter ~085

### Implementation sequence

Recommended iter sequence post-MR-019 (~iter 077+):
- **iter 077+** = **#107 SOPPM-P01** (public URL + OG + growth loop) — closes single highest-leverage gap
- **iter 078** = **#108 SOPPM-P02** (N-attribution badge) — category-first differentiation visible
- **iter 079** = **#109 SOPPM-P03** (ARIA + axe coverage) — pre-AI-Vision-Build prerequisite
- **iter 080** = **#110 SOPPM-P04** (determinism + schema versioning) — AI Vision Build architectural prereq
- **iter 081+** = WDC-002 P0 continuation OR optional Phase 5 OR Stripe operationalization continuation

WDC-002 P0 closure status remains 5 of 7 open (#101 / #103 / #104 / #105 / #106); these rows continue to sequence in parallel via Mode 2 directed picks per CEO discretion.

---

## §14 Cold-pool items held in this artifact (15 items, P1/P2/P3)

Per MR-005 D-5 clauses 4+5, items below remain in the audit-intake cold pool. Promotion via P0-burn-down-creates-slot OR PRD-trigger enumerated dependency.

### P1 (5 items)

- **SOPPM-R01** — Replace CSS dot strip with ReactFlow/Dagre flowchart renderer (UX §B.9 Move 3 + Architect §E + Frontend §F.9; ~250 LOC + 15 tests; defers `@xyflow/react` graph library integration to dedicated iter post-P02 ship)
- **SOPPM-R02** — Add 5-template matrix (Training + External + Executive Summary added to existing 3); ~400 LOC across templates + UI + plan-gating + tests
- **SOPPM-R03** — Hoist evidence + AI extensibility slots onto `SOPStep` (Architect §E.10 M2; ~150 LOC + ~30 tests; PRD-trigger: AI Vision Build entry); **conditional-promote** trigger event = ADR-AI-001 approval
- **SOPPM-R04** — Convert `markdownRenderer.ts` 681-LOC switch into registered renderer pattern (Architect §E.10 M3; ~250 LOC refactor; parallel to dashboard-columns iter 056 D+1)
- **SOPPM-R05** — Print stylesheet + PDF export with "Evidence Certificate" page (UX §B.7 + Competitive §H.6 Move 6 + Frontend §F.8; ~120 LOC + 8 tests)

### P2 (6 items)

- **SOPPM-R06** — Top-10 Growth POLISH substitutions (Growth §D.8; 10 string edits across 4 files; ~30 LOC; consumes Growth `growth-strategist` D-4 clause 1 adjacency)
- **SOPPM-R07** — Activate `workflow_exported` + add `sop_mode_switched` + `attribution_link_clicked` (Analytics §G.9 top-3 measurement moves; ~25 LOC across 3 files)
- **SOPPM-R08** — Validator coverage extension: `enterprise` + `decision_based` template fixtures (QA §I.5 + QA §I.10 QM-2; ~6 new `it()` blocks)
- **SOPPM-R09** — Fix confidence-constant duplication: `SOPStepCardCompact:395` imports from `confidenceThresholds.ts` + IFF lock test (QA §I.10 QM-3; ~5 LOC + 3 tests)
- **SOPPM-R10** — Frontend correctness: `useMemo` around `buildSOPViewModel` + `useEffect` for expansion initialization (Frontend §F.11; ~8 LOC; fixes React render purity violation)
- **SOPPM-R11** — Approve/sign-off workflow for compliance template (Product §C.4 Gap 4; PRD-trigger: SOC 2 / regulated industry sales cycle); **conditional-promote**

### P3 (4 items)

- **SOPPM-R12** — `SectionLabel` + `ConfidenceDot` extraction to shared component file (Frontend §F.4 #3; ~40 LOC refactor + ~10 tests; eliminates 3-way duplication)
- **SOPPM-R13** — Heading hierarchy fix: SOP title in `<h1>`; `SectionLabel` in `<h2>`/`<h3>` (Frontend §F.3; ~30 LOC + assertions)
- **SOPPM-R14** — Mobile step rail: bottom-anchored "Go to step" selector replacing `hidden sm:block` (Frontend §F.7; ~50 LOC)
- **SOPPM-R15** — Keyboard step navigation (`J`/`K` shortcuts) + step progress indicator + step copy button (Frontend §F.10; ~60 LOC; ergonomic improvements)

---

## §15 Operating Mode Counter Implications

This is a Mode 3-adjacent diagnostic review. Per established convention (MDR / WDC-001 / PIB / AI-VISION / WDC-002 precedent):

- **NON-counting** — does not increment MR-019 cadence counter
- **Area saturation clock NOT advanced** (Mode 3-adjacent per established precedent)
- **D-1 reverse-portfolio-drift counter UNCHANGED** at 3 (Mode 3-adjacent does not advance counting window)
- **Cool-off recharge counter UNCHANGED** at 3/3 FULL RE-ARM (20-event preservation streak preserved)
- **Cold-pool ages UNCHANGED** at MR-018 close values: DV2 9 / MDR/WDC/PIB 4 / WDC-002 9
- **Pool 44 → 48** at this artifact's close (4 P0 promotions per audit-intake protocol)
- **NEW cold-pool age starts at 0** for SOPPM-001 (next mandatory triage projected iter ~085 per MR-006 Change D 10-iter staleness rule)

### Audit-style intake event tally

**7th audit-style intake event** cumulative: DV2 (iter 026) + MDR (iter 032) + WDC-001 (iter 033) + PIB (pre-iter-058) + AI-VISION (post iter 061) + WDC-002 (iter ~064) + **SOPPM-001 (this intake)**. 

Promotion count comparison: DV2 = 3 / MDR = 9 / WDC-001 = 4 / PIB = 12 / AI-VISION = 0 / WDC-002 = 7 / SOPPM-001 = **4** (this intake).

### MR-018 (b.3) clause 8 compliance

CLAUDE.md § Audit-Intake Pattern (MR-005 D-5) clause 8 (ratified at MR-017) requires audit-style intakes to split N-iteration umbrellas into N independent rows at intake time. 

**This audit complies:** 4 P0 promotions are each INDEPENDENT backlog rows (#107 / #108 / #109 / #110), NOT a multi-iteration umbrella. Each row is independently reversible per CLAUDE.md operating-mode discipline. No umbrella row pattern.

---

## §16 Validation

- workspace `pnpm test`: **2183 / 2183 unchanged across 74 test files** (Mode 3-adjacent diagnostic; zero product code touched)
- workspace `pnpm typecheck`: clean across all 10 packages/apps
- `git status` (scope): NEW `docs/meta/SOP_PROCESSMAP_REVIEW_001.md` (this artifact) + 4 P0 backlog promotions to IMPROVEMENT_BACKLOG.md (#107-#110) + mirror updates to ITERATION_LOG / CHANGELOG / SYSTEM_HEALTH / CLAUDE.md
- Zero unintended changes outside artifact-mirror scope

---

## §17 Recommended next actions

**Coordinator-recommended sequencing for CEO:**

1. **Review this artifact** — focus on §1 executive verdict + §12 top-10 CEO decisions + §13 P0 promotions
2. **Approve P0 promotion sequence** (default per §13 implementation sequence; CEO may reorder)
3. **iter 075** = MR-019 Mode 4 (if MR-019 cadence forces) OR direct continuation of WDC-002 P0 burn-down at #101 WDC2-P02 (Wave A registry mis-classification)
4. **iter 077+** = first SOPPM-001 P0 (#107 SOPPM-P01 public URL + OG + growth loop) per §13 sequence
5. **Stripe operational launch** — proceed in parallel; this review does not block

**5 open CEO decisions queued for MR-019** (carry-forward from MR-018 §11):
1. §4 PARTIAL ADOPT silence-as-accept override pathway (default APPLY at MR-019 close)
2. AI Vision Build entry (BLOCKING on top-4 D-01/02/03/04 decisions)
3. Stripe operationalization
4. External-launch decision
5. Optional Phase 5 server-side observability extension

**PLUS 10 NEW open decisions from this review** queued for CEO at §12.

---

## Appendix A — Methodology

**Process used:**
1. Coordinator mapped current state (file inventory)
2. 8 specialist agents engaged in parallel with focused 500-700 word briefs per agent specialty
3. 7 of 8 returned substantive sections (~36,500 cumulative words); sop-expert framework lens applied by coordinator at §3 since agent definition lacked YAML frontmatter for runtime registration
4. Coordinator synthesized into consolidated artifact with cross-agent convergence map (§2)
5. P0 promotion candidates identified by convergence threshold (≥4-of-7 agent agreement) per MR-005 D-5 audit-intake protocol
6. 15 P1/P2/P3 items held in cold pool per MR-005 D-5 clauses 4+5
7. Counter mechanics applied per established Mode 3-adjacent precedent (DV2 / MDR / WDC-001 / PIB / AI-VISION / WDC-002)

**Cumulative agent-output words by section:**
- §B UX (ux-designer): ~3,400
- §C Product (product-manager): ~4,500
- §D Growth (growth-strategist): ~4,700
- §E Architecture (system-architect): ~5,200
- §F Frontend (frontend-engineer): ~4,800
- §G Analytics (analytics): ~4,600
- §H Competitive (competitive-researcher): ~5,400
- §I QA (qa-engineer): ~3,900
- §A Framework (coordinator synthesis): ~1,200

**Total agent output**: ~36,500 words synthesized to ~9,500-word consolidated review (~3.8× compression ratio).

## Appendix B — File-level scope inventory

Files reviewed across the 7 agents (no production changes made):

**Backend engine:**
- `packages/process-engine/src/sopBuilder.ts` (670 LOC)
- `packages/process-engine/src/processMapBuilder.ts` (459 LOC)
- `packages/process-engine/src/templates/sopTemplates.ts` (438 LOC)
- `packages/process-engine/src/templates/processMapTemplates.ts` (460 LOC)
- `packages/process-engine/src/templates/markdownRenderer.ts` (681 LOC)
- `packages/process-engine/src/templates/sopValidator.ts` (176 LOC)
- `packages/process-engine/src/templates/confidenceThresholds.ts`
- `packages/process-engine/src/templateTypes.ts`
- `packages/process-engine/src/templateSelector.ts`
- `packages/process-engine/src/workflowInterpreter.ts` (line 161 determinism leak)
- `packages/process-engine/src/templates/sopValidator.test.ts` (~30 `it()` blocks)
- `packages/process-engine/src/templates/templates.test.ts` (~110 `it()` blocks)
- `packages/process-engine/src/outputQuality.test.ts` (~65 `it()` blocks)
- `packages/process-engine/src/hardening.test.ts` (~20 `it()` blocks)
- `packages/intelligence-engine/src/sopAlignmentEngine.ts`

**Web-app rendering:**
- `apps/web-app/src/components/sop-view/SOPPageShell.tsx` (495 LOC)
- `apps/web-app/src/components/sop-view/SOPHeader.tsx`
- `apps/web-app/src/components/sop-view/SOPExecutionMode.tsx` (692 LOC)
- `apps/web-app/src/components/sop-view/SOPIntelligenceMode.tsx` (611 LOC)
- `apps/web-app/src/components/sop-view/SOPVisualMode.tsx` (615 LOC)
- `apps/web-app/src/components/sop-view/SOPModeSwitcher.tsx` (46 LOC)
- `apps/web-app/src/components/sop-view/SOPEmptyState.tsx` (87 LOC)
- `apps/web-app/src/components/sop-view/adapters/sopViewModel.ts` (609 LOC)

**Sample artifacts:**
- `apps/web-app/public/samples/sop-execution-sample.html`
- `apps/web-app/public/samples/process-groups-sample.html`
- `apps/web-app/public/samples/workflow-sample.html`

**Reference docs:**
- `.claude/agents/sop-expert.md` (framework reference; not loaded by runtime due to missing YAML frontmatter)
- `docs/meta/AI_INTEGRATION_PLATFORM_VISION_REVIEW_001.md` (positioning context)
- `docs/meta/WORKFLOWS_DASHBOARD_REVIEW_002.md` (precedent format)
- `docs/meta/DASHBOARD_DESIGN_ASSESSMENT_001.md` (design lens precedent)
- `docs/features/dashboard-v3-metrics-engine/ARCHITECTURE_METRICS_ENGINE.md` (Layered architecture pattern reference)

---

**End of SOP_PROCESSMAP_REVIEW_001 review artifact.**
