# Ledgerium AI — Product Requirements Document v2

**Version:** 2.0
**Supersedes:** PRD.md (v1.0, 2026-04-12)
**Date:** 2026-04-13
**Status:** Active — governs Phase 3 scoping and all downstream build decisions
**Author:** Product Manager Agent

---

## 1. Product Vision

Ledgerium AI is a deterministic, evidence-linked process intelligence platform that converts real browser workflow activity into agent-ready operational intelligence. Where Phase 1 proved that captured workflows produce trustworthy SOPs, and Phase 2 delivered the agent intelligence pipeline that classifies every step by automation type and composes proposed AI agents from observable evidence, Phase 3 closes the loop: users can act on the intelligence the platform produces. The north star is a system where an operations team lead records a workflow once, receives a complete agent composition and integration risk assessment grounded in observed behavior, and can move directly from that intelligence into execution — with every output traceable to the source recording.

---

## 2. Problem Statement

### P1: Documentation does not reflect how work actually happens

Operations team leads write SOPs from memory or observation. The documented process diverges from reality the moment it is written. There is no systematic mechanism to detect drift between the written process and the executed process. Ledgerium's evidence-linked SOP generation addresses this directly — but only when users record consistently, which the current onboarding friction prevents.

### P2: Teams cannot assess which workflows are ready to automate

Organizations are being asked to identify automation candidates for AI agents, but they have no structured baseline of current-state workflows. Ledgerium's agent intelligence pipeline already classifies automation readiness per step and composes agent profiles — but this output currently sits in a detail view that few users reach. The intelligence is not surfaced where decisions are made.

### P3: AI agent design is disconnected from observed operational evidence

Teams designing AI agents for business processes typically start from idealized process descriptions, not observed execution data. The result is agents designed for the clean-path workflow, not the actual one with its decision points, retries, and integration friction. Ledgerium's 9-stage pipeline produces agent compositions from raw workflow recordings — but there is no mechanism to deploy, export, or act on those compositions.

### P4: Process knowledge is siloed in individual contributor heads

When a skilled employee records their workflow, that recording exists in their personal Ledgerium workspace. There is no structured path for that workflow to become a team asset, a training artifact, or a shared baseline. The Teams and Portfolio models exist in the schema but are not connected to a collaboration workflow.

---

## 3. User Personas

### Persona 1: The Operations Team Lead (Primary — current ICP)

**Name:** Dana, Operations Lead at a 40-person SaaS company
**Job title:** Head of Operations / Senior Ops Manager
**Job-to-be-done:** Document how the team executes recurring processes so new hires onboard faster, existing procedures survive staff turnover, and the team can identify where time is being wasted.
**Current behavior:** Writes SOPs in Notion or Confluence from observation and interviews. Updates them manually when processes change. Uses Loom to record walkthroughs.
**Pain:** SOPs go stale within weeks. She cannot tell which processes are candidates for automation without conducting a manual audit. She does not have the technical vocabulary to evaluate AI agent proposals from vendors.
**What she needs from Ledgerium:** Record once, get a SOP she can use immediately, understand which parts of her team's workflows are already automatable, and share that intelligence with her manager or a vendor.
**Upgrade trigger:** She records 3+ workflows and wants to see patterns across them, or she wants to share workflows with team members.

### Persona 2: The Process Improvement Analyst (Secondary — emerging)

**Name:** Marcus, Process Improvement Analyst at a 200-person financial services company
**Job title:** Business Process Analyst / Continuous Improvement Specialist
**Job-to-be-done:** Identify bottlenecks, redundant steps, and automation opportunities across high-volume browser workflows, and present evidence-backed recommendations to leadership.
**Current behavior:** Conducts process observation sessions, maps workflows in Visio or Lucidchart, writes analysis reports manually.
**Pain:** Observation sessions are expensive and do not scale. Process maps become outdated before the analysis is presented. Recommendations lack quantitative evidence.
**What he needs from Ledgerium:** Cross-workflow pattern detection, bottleneck radar, automation opportunity scoring, and exportable evidence for recommendations.
**Upgrade trigger:** He wants portfolio-level analysis across a department's workflow library (requires team plan + multiple recordings).

### Persona 3: The AI Implementation Lead (Emerging — Phase 3 target)

**Name:** Priya, Director of AI Implementation at a 500-person company
**Job title:** AI Transformation Lead / Head of Intelligent Automation
**Job-to-be-done:** Identify which business processes are highest-value targets for AI agent deployment, design the agent architectures, and present implementation roadmaps to leadership.
**Current behavior:** Runs workshops to document current-state processes, maps tool integrations manually, estimates automation readiness based on opinion.
**Pain:** Current-state process documentation is unreliable. Automation readiness assessments are subjective. Agent designs are built on assumed process flows, not observed ones.
**What she needs from Ledgerium:** The agent composition output (Stage 7), integration risk analysis (Stage 8), and deployment artifact generation (Stage 9) — grounded in observed recordings, not interviews.
**Upgrade trigger:** She wants to export agent configuration artifacts and integration maps for her engineering team, or she needs to share agent compositions across multiple stakeholders.

### Persona 4: The Team Manager / Buyer (Buyer — not primary user)

**Name:** Chris, VP of Operations or COO
**Job title:** VP Operations / Chief Operating Officer
**Job-to-be-done:** Understand how his team's time is actually spent on recurring browser workflows, identify where AI can reduce operational overhead, and demonstrate that process improvements are grounded in evidence.
**Current behavior:** Relies on team leads for process knowledge. Reviews Notion SOPs that are often outdated. Has a board mandate to present an AI automation roadmap.
**What she needs from Ledgerium:** A portfolio view of team workflows, process health scores, automation opportunity scores, and exportable evidence for AI planning.
**Buying context:** Signs off on team plan purchases. Does not use the product daily. Needs to see org-level intelligence before committing budget.

---

## 4. Feature Inventory

### Phase 1 — DONE: Core Capture and Processing

| Feature | Status | Notes |
|---------|--------|-------|
| Chrome extension recording lifecycle (Start, Pause, Resume, Stop) | Done | Service worker session persistence gap is a known issue |
| Live step feed (streaming segmentation) | Done | Streaming/batch parity requires ongoing test discipline |
| Five-file session bundle export | Done | |
| Extension review screen (Map, SOP, Export tabs) | Done | |
| Web app upload (manual JSON drag-and-drop) | Done | Auto-sync from extension is unverified |
| Web app dashboard with workflow list | Done | |
| Web app workflow detail page (SOP, Process Map, Evidence, Report tabs) | Done | |
| SOP generation (process-engine) | Done | End-to-end functional verification required |
| Process map rendering (React Flow, interactive) | Done | Deterministic SVG renderer not implemented |
| Email and password authentication | Done | OAuth deferred |
| Sample workflow generation on first login | Done | |
| API key management | Done | |
| Tags and workflow tagging | Done | |
| Billing infrastructure (Stripe models, UpgradeButton) | Partial | Webhook handler completeness unconfirmed |
| Extension install page and Chrome Web Store publish | Unknown | Critical gap for new user acquisition |
| E2E tests (Playwright) | Not built | Explicit known gap |
| Golden-file renderer regression tests | Not built | Explicit known gap |

### Phase 2 — DONE: Agent Intelligence Pipeline and Portfolio Organization

| Feature | Status | Notes |
|---------|--------|-------|
| 9-stage agent intelligence pipeline (transformWorkflow) | Done | All stages deterministic, no LLM calls |
| Step parsing and semantic enrichment (Stage 1) | Done | |
| Activity building — logical step groupings (Stage 2) | Done | |
| Decision point detection — branch and retry points (Stage 3) | Done | |
| Workflow structure with dependencies and automation scoring (Stage 4) | Done | |
| Skill extraction and skill library (Stage 5) | Done | |
| AI and automation opportunity detection (Stage 6) | Done | |
| Agent profile composition (Stage 7) | Done | |
| Integration risk analysis (Stage 8) | Done | |
| Deployment artifact generation — config artifacts (Stage 9) | Done | |
| Cross-workflow intelligence (analyzePortfolio) | Done | |
| Portfolio organization (folders, projects, business units, departments) | Done | Nested hierarchy with sort order |
| Portfolio sidebar and workflow assignment to portfolios | Done | |
| Process definition grouping (families, exact groups, variants) | Done | Schema and analysis logic exist |
| Process insights (bottleneck, loop, redundant step, drift, anomaly) | Done | |
| Teams schema (Team, TeamMember, TeamInvite, WorkflowShare) | Done | Schema only; team UI is not connected |
| Analytics event tracking (PostHog integration + DB events) | Done | |
| Engagement streak tracking | Done | |
| Process Groups Explorer dashboard view | Done | |
| Bottleneck radar | Done | |
| AI opportunities panel | Done | |
| Org health score | Done | |

### Phase 3 — NEXT: Close the Loop (See Section 5 for full prioritization)

| Candidate Feature | Priority |
|-------------------|----------|
| Onboarding wizard (guided first-run experience) | P0 |
| AI-powered SOP generation (LLM layer for narrative enhancement) | P0 |
| Agent intelligence output surface (surfacing agent composition to users) | P0 |
| Export and sharing (agent artifacts, Slack, Notion) | P1 |
| Team collaboration UI (connect schema to user-facing flows) | P1 |
| Extension auto-sync (bridge the recording-to-web gap) | P1 |
| Process comparison and diff view (variant-level comparison) | P2 |
| API for third-party integrations | P2 |

### Phase 4 — FUTURE: Scale and Platform

| Candidate Feature | Rationale |
|-------------------|-----------|
| Agent deployment and execution (run composed agents) | Requires agent runtime infrastructure outside current stack |
| Real-time dashboard (WebSocket live updates) | Deferred until user base justifies infrastructure cost |
| Mobile browser support | Non-Chrome browsers out of scope until core loop is validated |
| Enterprise SSO and admin controls | Deferred until enterprise ICP is validated |
| Zapier and webhook integration marketplace | Deferred until API layer (Phase 3) is stable |
| Predictive process intelligence (forecast bottlenecks, drift alerts) | Requires corpus of recordings per process; deferred |

---

## 5. Phase 3 Prioritization

### Priority Framework

- **P0:** Required to unlock the core value loop for the current ICP. Without these, users cannot get from recording to a meaningful, actionable output.
- **P1:** Significantly improves activation, retention, or the handoff to the next persona tier.
- **P2:** High value but does not block current ICP from getting full value.

---

### P0-1: Onboarding Wizard

**User story:** As a new user, I want a guided first-run experience that walks me through extension installation, my first recording, and my first SOP view so that I reach value in under 10 minutes without reading documentation.

**Problem it solves:** The current activation path (signup → find API key → install extension → record → export JSON → upload) has at least 6 steps with no guidance. This is the single highest-friction point in the funnel.

**Acceptance criteria:**
- Post-signup, user lands on a step-by-step onboarding screen with explicit steps: Install Extension, Connect Extension (API key), Record Your First Workflow, View Your SOP.
- Each step has a clear completion state (checkmark when done). Step completion is detected automatically where possible (API key created, first upload received).
- User can skip the wizard and access the dashboard directly, but the wizard resurfaces until completion.
- Wizard completion fires an analytics event: `onboarding_completed`.
- On completion, the user is navigated to their first workflow's SOP view.
- The wizard does not block access to the product at any point.

**Edge cases:**
- User installs extension before completing signup — the wizard must detect API key linkage on next login.
- User completes a recording but fails to upload — the wizard should prompt the upload step explicitly.

**Effort:** M
**Expected impact:** Increase activation rate (signup to first SOP view) from current unknown baseline toward the PRD v1 target of 30%.

---

### P0-2: AI-Powered SOP Generation (LLM Narrative Layer)

**User story:** As an operations team lead, I want my recorded workflow steps to produce a clearly written, human-readable SOP that I can share with my team without editing so that I can stop writing documentation manually.

**Problem it solves:** The current SOP output is deterministic and accurate but reads as structured data, not as a procedure a team member can follow. The agent intelligence pipeline already extracts semantic intent per step — an LLM layer that converts this structured intelligence into polished SOP prose is the highest-leverage use of the LLM integration.

**Acceptance criteria:**
- On workflow upload completion, the system generates an LLM-enhanced SOP in addition to the existing deterministic SOP artifact.
- The LLM-enhanced SOP preserves all evidence references from the deterministic SOP — no step can appear in the enhanced SOP without a corresponding source in the deterministic output.
- The LLM call input is the deterministic SOP artifact and the step intelligence output from the agent intelligence pipeline (Stage 1 output). No raw event data is sent to the LLM.
- If the LLM call fails or times out, the system falls back to the deterministic SOP without surfacing an error to the user — the deterministic SOP is always the baseline.
- The enhanced SOP is displayed in a dedicated tab on the workflow detail page labeled "AI SOP."
- The enhanced SOP is copyable as plain text with a single button click.
- The system logs the LLM model version used and the token count in the workflow artifact metadata.
- LLM-generated prose cannot introduce steps, systems, or actions that are not present in the deterministic SOP. The generation prompt must include an explicit constraint to this effect.

**Edge cases:**
- Workflow with a single step: the enhanced SOP should still produce a valid procedure, not hallucinate complexity.
- Workflow with 100+ steps: the LLM call must be chunked or summarized to stay within context window limits. The chunking strategy must be defined before build.
- The user edits the AI SOP — edits are stored against the workflow and do not trigger re-generation.

**Effort:** M
**Expected impact:** Improve SOP usefulness rating (target: 50%+ of users rating SOP as usable as-is or with minor edits). This is the primary output quality lever.

**Constraint flagged:** LLM integration requires Claude API key management, prompt versioning, and cost tracking. These are not currently in the architecture. Engineering must define the LLM service boundary before this feature enters build.

---

### P0-3: Agent Intelligence Output Surface

**User story:** As an operations team lead or AI implementation lead, I want to see the agent composition and automation opportunity analysis from my recorded workflows so that I can understand which processes are candidates for AI automation and what an agent for each workflow would look like.

**Problem it solves:** The 9-stage agent intelligence pipeline runs on every workflow upload and produces agent compositions, skill libraries, integration risk assessments, and deployment artifacts — but none of this output is surfaced to the user in the current UI. The transformation result is computed and discarded.

**Acceptance criteria:**
- Workflow detail page includes a new tab labeled "Agent Intelligence."
- The Agent Intelligence tab displays:
  - Automation readiness score for the workflow (from WorkflowStructure.automationScore)
  - Per-step automation classification (from StepIntelligence.automationType) shown as a visual breakdown
  - Detected AI opportunities (from OpportunityAnalysis) listed by category with evidence
  - Proposed agent profiles (from AgentComposition) showing role, tools, skills, and interaction mode
  - Integration risk summary (from IntegrationRiskAnalysis) showing risk items by severity
- All displayed data traces to the workflow's deterministic pipeline output — no inference beyond what the pipeline produces.
- Each agent profile shows a "Copy Agent Config" button that copies the AgentConfigArtifact JSON to clipboard.
- The tab is visible only for workflows that have a completed agent intelligence analysis. Workflows uploaded before this feature is deployed show a "Re-analyze" button that triggers a new pipeline run.

**Edge cases:**
- Pipeline returns an empty agent composition (workflow has no automatable steps): display an explicit "No automation opportunities detected" state with the reason.
- User has not upgraded to Pro: gate full agent profile detail behind the Pro plan; show automation readiness score and opportunity count on free plan.

**Effort:** M
**Expected impact:** This is the primary feature that justifies Pro conversion for the AI Implementation Lead persona. It also surfaces the unique value of the agent intelligence pipeline that currently goes unseen.

---

### P1-1: Export and Sharing (Agent Artifacts and External Destinations)

**User story:** As an operations team lead or AI implementation lead, I want to export my workflow's agent intelligence artifacts to formats my team uses (Notion, Slack, PDF) so that I can share findings without requiring my colleagues to log into Ledgerium.

**Acceptance criteria:**
- From the workflow detail page, user can export:
  - SOP as Markdown or plain text
  - Agent composition as JSON (the existing AgentConfigArtifact)
  - Integration risk summary as a structured report (Markdown)
  - Skill manifest as JSON (the existing SkillManifestArtifact)
- Slack export: sends a formatted message to a user-configured Slack webhook containing workflow name, automation readiness score, top opportunity, and a link to the workflow.
- Notion export: creates a Notion page via Notion API containing the SOP in Notion block format.
- All exports are logged as analytics events.
- Export failures surface a visible error with the failure reason — no silent failures.

**Assumption flagged:** Slack and Notion integrations require OAuth flows for user authorization. This adds scope. If effort is constrained, defer Notion to Phase 4 and deliver Markdown export and Slack webhook (no OAuth required) as the Phase 3 deliverable.

**Effort:** M (Markdown + Slack webhook only), L (including Notion OAuth)
**Expected impact:** Reduces friction for users sharing workflow intelligence with colleagues who are not Ledgerium users. Accelerates word-of-mouth spread.

---

### P1-2: Team Collaboration UI

**User story:** As a team manager, I want to invite my team members to Ledgerium and share workflows with them so that process knowledge is a team asset, not siloed in individual accounts.

**Problem it solves:** The Team, TeamMember, TeamInvite, and WorkflowShare data models are fully built in the schema but there is no team creation, invite, or workflow sharing UI. The team plan is listed on the pricing page but cannot be activated by users.

**Acceptance criteria:**
- User can create a team from account settings.
- User can invite team members by email. Invite sends an email with an accept link. Invite expires after 7 days.
- Invited user accepts the invite and joins the team. If they do not have a Ledgerium account, signup is prompted.
- Team owner can assign roles: owner, admin, member, viewer.
- User can share a workflow with a team (viewer or editor permission).
- Shared workflows appear in the team member's dashboard under a "Shared with me" section.
- Workflow share is logged as an analytics event.
- Team plan is required to invite more than 1 additional member. Free plan supports sharing a workflow via public share link only.

**Edge cases:**
- Invited user already has a Ledgerium account — they join the team without re-signing up.
- Team owner removes a member — all shared workflow access for that member is revoked.

**Effort:** L
**Expected impact:** Unlocks team plan conversion (the only path to team revenue). Enables the buyer persona (VP Ops) to see team-level workflow intelligence.

---

### P1-3: Extension Auto-Sync

**User story:** As an operations team lead, I want my recorded workflows to appear in the web app automatically after I stop recording so that I do not have to manually export a JSON file and upload it.

**Problem it solves:** The manual export-upload path (stop recording → export JSON from extension → navigate to web app → drag-and-drop upload) is the highest-friction step in the activation flow. It loses the majority of non-technical users. The gap was identified in CURRENT_STATE_MVP_GAPS.md as Critical.

**Acceptance criteria:**
- After the user clicks Stop, the extension automatically uploads the session bundle to the web app via the existing POST /api/upload endpoint using the user's stored API key.
- The upload happens in the background. The extension shows an upload progress indicator in the sidebar.
- On upload success, the extension shows a link to the workflow in the web app.
- On upload failure, the extension shows a visible error and offers the manual JSON export as a fallback. The error includes the failure reason (network, auth, server error).
- If no API key is configured, the extension prompts the user to connect their account.
- Sync can be disabled in extension settings for users who prefer manual export.

**Edge cases:**
- Large session bundles (>10MB) may time out on the upload request. The extension must implement a retry with backoff (max 3 attempts).
- Service worker termination during upload must not result in a silent partial upload. The upload must be atomic from the web app's perspective.

**Effort:** M
**Expected impact:** Expected to increase recording completion rate (recordings that produce a viewable web app workflow) from the current unknown baseline toward the 80% target in SUCCESS_METRICS.md.

---

### P2-1: Process Comparison and Diff View

**User story:** As an operations team lead, I want to compare two recordings of the same workflow side-by-side so that I can see how execution varies across runs and identify the most common path versus the exceptions.

**Acceptance criteria:**
- From the dashboard or workflow detail page, user can select two workflows and open a comparison view.
- Comparison view shows steps aligned side-by-side with color coding: matching steps (green), steps present only in the first recording (yellow), steps present only in the second recording (red).
- Duration difference is shown per step.
- Summary statistics: shared step count, divergent step count, duration delta.
- Comparison is available only for workflows that share the same ProcessDefinition (same process group).

**Effort:** M
**Expected impact:** Directly enables the Process Improvement Analyst persona to produce evidence-backed variance analysis.

---

### P2-2: Public API for Third-Party Integrations

**User story:** As an AI implementation lead or developer, I want to access Ledgerium workflow intelligence via a documented REST API so that I can integrate workflow data and agent compositions into my own tooling and automation systems.

**Acceptance criteria:**
- API endpoints available (authenticated via existing API key):
  - GET /api/v1/workflows — list user's workflows with pagination
  - GET /api/v1/workflows/:id — full workflow with artifacts
  - GET /api/v1/workflows/:id/agent-intelligence — agent composition, opportunities, risk
  - GET /api/v1/workflows/:id/sop — SOP artifact (deterministic and AI-enhanced if available)
  - POST /api/v1/uploads — upload a session bundle programmatically
- API responses conform to the existing `{ data, error, meta }` response envelope.
- All endpoints enforce user-scoped access — no cross-user data access.
- API is documented (OpenAPI spec) and the documentation is accessible at /api/docs.
- Rate limiting is enforced per API key (limits defined at build time, tied to plan).

**Effort:** L
**Expected impact:** Enables the AI Implementation Lead persona to integrate Ledgerium intelligence into existing agent design tooling. Creates a foundation for the webhook and Zapier integration in Phase 4.

---

## 6. Success Metrics

### Activation (Measure from beta launch)

| Metric | Definition | Target | Instrument |
|--------|-----------|--------|------------|
| Activation rate | % of signups who view their first SOP | >= 30% | PostHog funnel: `signup_completed` → `first_sop_viewed` |
| Time to first value | Minutes from signup to first SOP view | < 10 minutes | Timestamp delta |
| Onboarding completion rate | % of new signups who complete the onboarding wizard | >= 60% | `onboarding_completed` event |
| Recording completion rate | % of started recordings that produce a viewable web app workflow | >= 80% | `recording_started` (extension) → `workflow_uploaded` (web) |

### Retention (Measure from week 2 of beta)

| Metric | Definition | Target | Instrument |
|--------|-----------|--------|------------|
| 7-day return rate | % of activated users who record a 2nd workflow within 7 days | >= 25% | `workflow_uploaded` count per user in 7-day window |
| 30-day active users | % of signups with at least one workflow event in a 30-day rolling window | >= 20% | PostHog active user definition |

### Output Quality (Measure from beta launch, ongoing)

| Metric | Definition | Target | Instrument |
|--------|-----------|--------|------------|
| SOP usefulness | % of users who rate SOP as usable as-is or with minor edits | >= 50% | Post-view survey (in-app) |
| Agent intelligence surface engagement | % of activated users who open the Agent Intelligence tab | >= 40% | `agent_intelligence_tab_viewed` event |
| Export usage | % of workflows where user exports at least one artifact | >= 20% | `artifact_exported` event |

### Revenue (Measure from Phase 3 launch)

| Metric | Definition | Target | Instrument |
|--------|-----------|--------|------------|
| Pro conversion rate | % of activated free users who upgrade to Pro within 30 days | >= 5% | Stripe `checkout.session.completed` event |
| Team plan conversion | % of Pro users who upgrade to Team within 60 days | >= 10% of Pro users | Stripe subscription plan change |

### Beta Gate Rule (inherited from PRD v1, updated)

- 4 of 5 activation and retention targets met: proceed to open beta
- 2 to 3 met: iterate on failing metrics, re-test within 2 weeks
- Fewer than 2 met: stop beta, diagnose — ICP is wrong, output quality is insufficient, or activation has a critical blocker

---

## 7. Non-Goals

The following are explicitly excluded from Phase 3. Any request to build these must be escalated.

| Item | Reason for exclusion |
|------|---------------------|
| Agent deployment and execution (running composed agents against live systems) | Requires an agent runtime infrastructure with sandboxing, credential management, and audit logging that is architecturally distinct from the current platform. This is a Phase 4+ decision after the agent composition output is validated. |
| Real-time dashboard with WebSocket live updates | No validated user need for sub-second dashboard refresh. Polling is sufficient at current user scale. |
| Mobile browser support | Chrome extension is the capture mechanism. Mobile Chrome does not support extensions. Recording on mobile is architecturally impossible without a separate capture strategy. |
| Non-Chrome browser support | Firefox and Edge extensions are a Phase 4 consideration after core Chrome experience is proven. |
| Enterprise SSO and SAML | No enterprise ICP validation. Builds before ICP validation are wasted. |
| Zapier integration marketplace | Blocked on the public API (Phase 3 P2). Zapier integration is Phase 4. |
| Predictive drift alerts (forecast process deviation before it happens) | Requires a corpus of repeated recordings per process group. The current user base does not have sufficient recording volume to validate this. |
| Natural language workflow search | Nice-to-have but no user evidence that keyword search is insufficient. Deferred. |
| Chrome extension marketplace (recording templates shared publicly) | Community features require critical mass not yet established. |

---

## 8. Technical Constraints

These are current-state facts that constrain what can be shipped in Phase 3. Source: schema, CLAUDE.md, CURRENT_STATE_MVP_GAPS.md.

| Constraint | Implication |
|------------|-------------|
| SQLite in production | Concurrent write throughput is limited. Any async job queue for LLM calls must account for write contention. Migration to PostgreSQL is a Phase 4 consideration; do not plan Phase 3 features that require it. |
| No async job queue | LLM SOP generation (P0-2) will run synchronously unless BullMQ + Redis are added. For workflows under 50 steps, synchronous is acceptable. For larger workflows, this will cause request timeouts. Engineering must define the boundary before build. |
| Local filesystem for uploaded files | Single-instance deployment only. No horizontal scaling. S3/MinIO migration is required before Phase 3 features that increase storage demand (e.g., AI-enhanced SOP artifacts per workflow). |
| Service worker session persistence gap | Extension auto-sync (P1-3) depends on the reliability of the session bundle at Stop time. If events are lost due to service worker termination, auto-sync uploads an incomplete bundle. This bug must be fixed before auto-sync is built. |
| No LLM integration layer | The LLM SOP generation feature (P0-2) requires a Claude API integration that does not exist. Prompt versioning, cost tracking, API key rotation, and error handling must all be designed before build starts. |
| Stripe webhook completeness unconfirmed | Team plan billing (required for P1-2 team collaboration) depends on Stripe webhooks updating subscription status. If webhooks are not functional, team plan gating will not work. Engineering must verify Stripe end-to-end before P1-2 build. |
| No E2E test coverage | Recording lifecycle reliability is untested at integration level. Phase 3 features that depend on reliable recording-to-web flow (auto-sync, onboarding wizard) are at risk without E2E coverage. E2E tests for the core activation path must be written before Phase 3 launch. |

---

## 9. Open Questions

These must be resolved before the indicated Phase 3 feature enters build. Each is a decision gap, not a known answer.

| # | Question | Blocks | Urgency | Who Resolves |
|---|----------|--------|---------|--------------|
| 1 | Is extension auto-sync (POST /api/upload from extension) functional, or is manual JSON the only verified path? | P1-3 (Auto-sync) | Critical | Engineering |
| 2 | Is the Chrome extension published to the Web Store, or is it install-by-ZIP only? | P0-1 (Onboarding) | Critical | Product + Engineering |
| 3 | Is Stripe billing end-to-end functional (checkout → webhook → subscription status update)? | P1-2 (Team Collaboration), Revenue Metrics | Critical | Engineering |
| 4 | What is the LLM service boundary for SOP generation? Which Claude model, what token limits, what cost per workflow at P0 and P1 scale? | P0-2 (AI SOP) | High | Engineering + Product |
| 5 | Should the Agent Intelligence tab (P0-3) be visible on free plan (with feature gating) or hidden entirely? | P0-3 gating strategy | High | Product |
| 6 | Are streaming and batch segmentation outputs tested for parity? | All recording-dependent features | High | Engineering |
| 7 | For the process comparison feature (P2-1), does the ProcessDefinition grouping run automatically on every upload, or is it a manual batch operation? | P2-1 (Process Comparison) | Medium | Engineering |
| 8 | Does the AI Implementation Lead persona have sufficient recording volume to validate the agent composition output in Phase 3 beta, or does the team need a seeded corpus of demo workflows? | P0-3 (Agent Intelligence surface) | Medium | Product |
| 9 | What is the acceptable LLM latency for SOP generation? If synchronous generation takes >5 seconds, does engineering build async job processing before Phase 3 launch, or ship synchronous with a loading state? | P0-2 architecture decision | Medium | Engineering + Product |
| 10 | Is the first beta cohort operations team leads (documentation wedge) or AI implementation leads (agent design wedge)? The Phase 3 P0 features serve both personas but the onboarding messaging must pick one. | P0-1 (Onboarding messaging) | Medium | Product |

---

## Appendix A: Phase 2 Exit Criteria (Confirmation Required)

Before Phase 3 build begins, confirm the following Phase 2 artifacts are complete and verified:

- [ ] Agent intelligence pipeline (transformWorkflow) runs end-to-end on a real uploaded workflow without error
- [ ] All 9 pipeline stage outputs are stored or accessible per workflow
- [ ] Portfolio organization (create, nest, assign workflows to portfolios) is functional end-to-end
- [ ] Process groups, families, and variant detection are confirmed to trigger on upload (not just a schema artifact)
- [ ] Dashboard views (bottleneck radar, AI opportunities, org health) render with real data, not stubs
- [ ] Analytics event tracking (PostHog + DB) is confirmed firing for core events

---

## Appendix B: Phase 3 Sequence Recommendation

Recommended build sequence within Phase 3, accounting for dependencies:

1. Extension reliability (E2E tests + service worker persistence fix) — this is a prerequisite for auto-sync and onboarding
2. Onboarding wizard (P0-1) — highest activation leverage, unblocked
3. Extension auto-sync (P1-3) — unblocked after extension reliability work
4. LLM service boundary design (engineering spike for P0-2) — must run in parallel with onboarding build
5. AI-powered SOP generation (P0-2) — begins after LLM spike is complete
6. Agent Intelligence tab surface (P0-3) — unblocked; can run in parallel with SOP generation
7. Team Collaboration UI (P1-2) — requires Stripe verification first
8. Export and sharing (P1-1) — can run in parallel with team collaboration
9. Process comparison view (P2-1) — after core P0 and P1 features are stable
10. Public API (P2-2) — last, depends on stable artifact schema from P0-3
