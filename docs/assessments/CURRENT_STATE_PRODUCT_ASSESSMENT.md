# Ledgerium AI -- Current State Product Assessment

**Date:** 2026-04-09
**Basis:** Codebase review only (CLAUDE.md, project-plan.md, web-app source, Prisma schema)

---

## 1. Problem Statement Clarity

**Score: 4/5**

The problem is well-articulated across multiple surfaces:

- **CLAUDE.md:** "eliminates process theater and stale documentation by capturing structured signals of real work"
- **Homepage:** "Your SOP says 5 steps. Your team takes 17." -- punchy, specific, immediately understandable.
- **Project plan:** "Reality before opinion. Evidence before interpretation. Determinism before abstraction."

The problem statement is strong on the *documentation gap* angle (SOPs are stale, written from memory). It is weaker on quantifying the business cost of this gap. The homepage mentions automating broken workflows as a risk, but does not connect Ledgerium's output to measurable business outcomes (time saved, errors prevented, compliance risk reduced).

**What lowers the score:** The problem framing oscillates between two related but distinct problems:
1. "Documentation is stale" (a knowledge management problem)
2. "You can't automate what you haven't observed" (a process improvement / AI-readiness problem)

These are related but have different buyers, urgency, and willingness to pay. The messaging tries to serve both without choosing.

---

## 2. ICP Clarity

**Score: 3/5**

**Stated in CLAUDE.md:**
- Operators and individual contributors recording their workflows
- Team leads and process improvement leaders
- Compliance and risk teams
- Engineers and AI builders who need grounded, machine-readable process definitions

**Homepage "Who uses Ledgerium" section:**
- Operations
- Sales Enablement
- Training
- Compliance

This is four distinct ICPs. For an MVP/early product, this is too broad. Each persona has different:
- Entry points (who installs the extension?)
- Workflows to record (operational vs. sales vs. training)
- Value metrics (time saved vs. compliance coverage vs. onboarding speed)
- Buying authority and budget justification

**GAP:** There is no primary ICP identified. No persona is prioritized over others. The pricing page and demo page speak generically to "you" without targeting a specific role or use case.

**What would raise the score:** Pick one ICP for beta (e.g., "operations team leads who maintain SOPs for browser-based workflows") and orient the entire onboarding, demo, and messaging around that persona. The others can follow.

---

## 3. Workflow Clarity (Install to Value)

**Score: 3/5**

The demo page describes a 5-step flow: Record -> Work -> Stop/Review -> Get SOP/Map -> Save to Library.

The actual implementation reveals the user journey is:
1. Sign up on web app (email/password -- found in Prisma schema, no OAuth yet despite roadmap mentioning it)
2. Get an API key (ApiKey model exists in schema)
3. Install Chrome extension (referenced in marketing, `/install-extension` link exists)
4. Record a workflow in the extension
5. Upload the session JSON to the web app (upload page exists, processes JSON files)
6. View workflow in dashboard with steps, SOP, process map

**Gaps in the journey:**
- **Extension-to-web-app connection:** The upload page expects manual JSON file upload. The pricing page mentions "Extension auto-sync" as a Pro feature, but GAP: no evidence of auto-sync implementation was found in the files reviewed.
- **Extension install flow:** `/install-extension` is linked from homepage and demo but GAP: no evidence this page exists or that the extension is published to the Chrome Web Store.
- **First-value latency:** A user must sign up, install an extension, record something, manually export JSON from the extension, then upload it to the web app. This is a multi-step process with significant friction for a first experience.

---

## 4. MVP Coherence

**Score: 3/5**

**Core loop alignment:** The stated core value is "capture real workflows -> produce SOPs and process maps." The implementation supports this through:
- Upload flow (accepts session JSON)
- Workflow model with steps, phases, duration, confidence
- WorkflowArtifact model supporting: process_output, workflow_report, source_bundle, sop, process_map
- Dashboard showing workflows with metrics

**Where coherence breaks:**

The data model has advanced entities that go well beyond the stated Phase 1 MVP:
- `ProcessFamily` (Phase 4 concept -- portfolio management)
- `ProcessDefinition` with family hierarchy, variant records, stability scores
- `CanonicalComponentRecord` (reusable step patterns across workflows)
- `GroupRelationship` (polymorphic entity relationships)
- `ProcessInsight` (bottleneck detection, anomaly detection)
- `ProcessVariantRecord` (execution path variants within process groups)
- `Team`, `TeamMember`, `TeamInvite`, `WorkflowShare` (collaboration -- Phase 3+)
- `AnalyticsEvent` (product analytics)
- Stripe integration (`stripeCustomerId`, `stripeSubscriptionId`)

The Prisma schema represents roughly Phase 4 of the roadmap while CLAUDE.md states "Phase 0 complete -- Phase 1 starting."

---

## 5. Feature Sprawl Risk

**Score: 2/5 (high sprawl risk)**

Evidence of significant feature sprawl:

| Feature | Roadmap Phase | Current State |
|---------|--------------|---------------|
| Process families and hierarchy | Phase 4 | Schema built, UI components exist (ProcessGroupsExplorer in dashboard) |
| Process variants and deviation tracking | Phase 2-3 | Schema built with full variant model |
| Canonical components / reusable patterns | Phase 4 | Schema built |
| Team workspaces and invites | Phase 3 | Schema built |
| Workflow sharing | Phase 3 | Schema built |
| Process insights (bottleneck, anomaly) | Phase 4 | Schema built, UI references in dashboard |
| Stripe billing | Phase 3+ | Schema fields and pricing config built |
| Tags and organization | Not in roadmap | Schema built |
| Command Center components | Not in roadmap | Referenced in recent commits |
| "Operational signal strip" | Not in roadmap | Referenced in recent commits |

The recent git history (last 5 commits) shows active work on: command center components, health scores, insights, bottleneck detection, process preview, signal sentences, recommendation center, and operational signal strip. These are all Phase 4-5 features.

**Risk:** The core capture-to-output loop (Phase 1) is described as incomplete in CLAUDE.md (extension still has duplicated logic, no E2E tests, no session recovery), while the web app has advanced analytics and intelligence features. This inversion -- building the analytics layer before the capture layer is trustworthy -- is explicitly called out as the primary risk in the project plan: "The common failure mode in products like this is jumping to analytics or AI narrative layers before capture and structure are trustworthy."

---

## 6. Requirements Maturity

**Score: 4/5**

The project plan (`docs/project-plan.md`) is unusually thorough for an early-stage product:
- 6 phases with clear exit criteria per phase
- Explicit data model with field-level definitions
- Detailed segmentation rules with specific thresholds
- Open design decisions tracked with recommended defaults
- Priority sequencing explicitly stated
- Risk table with mitigations

**What lowers the score:** The requirements are engineering-focused. There are no user stories, no acceptance criteria written from the user's perspective, no usability requirements, and no performance budgets for the web app experience.

---

## 7. Success Metric Clarity

**Score: 1/5**

**GAP:** No success metrics are defined anywhere in the reviewed files.

There are no:
- Activation metrics (what counts as a successfully onboarded user?)
- Engagement metrics (what usage pattern indicates value?)
- Retention metrics (what signals a user will stay?)
- Business metrics (conversion targets, revenue targets, churn thresholds)
- Product quality metrics (SOP accuracy, time to first output, user satisfaction)

The project plan has engineering exit criteria (tests pass, golden files match, exports work) but no product success criteria. The analytics model (`AnalyticsEvent`) exists in the schema, and the upload page calls `track()`, but there is no evidence of defined events, funnels, or target metrics.

---

## Summary Scorecard

| Dimension | Score (1-5) | Notes |
|-----------|-------------|-------|
| Problem clarity | 4 | Strong articulation, slight dual-framing tension |
| ICP clarity | 3 | Four ICPs listed, none prioritized |
| Workflow clarity (install to value) | 3 | Flow described but has manual upload friction |
| MVP coherence | 3 | Core loop exists but data model far exceeds MVP |
| Scope discipline | 2 | Significant Phase 3-4 features built before Phase 1 completion |
| Requirements maturity | 4 | Thorough engineering spec, weak on user-facing criteria |
| Success metric clarity | 1 | No defined success metrics |
