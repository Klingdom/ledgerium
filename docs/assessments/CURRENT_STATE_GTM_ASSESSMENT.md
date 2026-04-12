# Current State GTM Assessment

**Date:** 2026-04-09
**Scope:** Web app public pages, analytics, onboarding, and sample workflow — as found in the codebase.

---

## 1. Messaging Clarity

**Verdict: Strong, with room for refinement.**

The homepage headline — "Your SOP says 5 steps. Your team takes 17." — is concrete, provocative, and immediately frames the problem. The subhead ("Record how work actually happens in the browser. Get structured workflows, SOPs, and process maps — automatically.") clearly states what the product does and what the user gets.

The "How it works" section (Record / Process / Use) is tight and scannable. The "Why it matters" section articulates the gap between documented and actual processes. The "What you get" section enumerates concrete outputs: workflow steps, SOPs, process maps, library, history, reports.

**Strengths observed:**
- The homepage avoids vague AI/ML language and instead leads with observable, deterministic outputs.
- Each section answers a clear question: what is this, how does it work, why should I care, what do I get, who is it for.
- The trust strip ("Deterministic / Private / No AI guessing / Free to start") reinforces the core positioning concisely.

**Gaps observed:**
- No product screenshots, videos, or interactive demos anywhere on the homepage, demo page, or install page. The demo page uses placeholder icon boxes (gray rectangles with icons) where visuals should be. This significantly reduces credibility for a new visitor who has never seen the product.
- The homepage does not show a real workflow output example. A user must sign up and either record or load the sample workflow to see any actual product output.

---

## 2. Audience Targeting

**Verdict: Broad but intentional.**

The homepage "Who uses Ledgerium" section names four audiences: Operations, Sales Enablement, Training, and Compliance. Each gets a one-line value prop.

The CLAUDE.md engineering brief defines core users as: operators/ICs recording workflows, team leads/process improvement leaders, compliance/risk teams, and engineers/AI builders needing machine-readable process definitions.

**Observation:** The homepage messaging targets the first three groups well. The fourth group (engineers/AI builders) is not addressed in any public-facing page. This may be intentional for launch scope, but it is worth noting since the engineering brief treats them as a core persona.

The pricing page addresses individual users (Free, Pro) and teams (Enterprise), which aligns with the audience segments. The Enterprise tier is contact-sales only, with no self-serve path.

---

## 3. Activation Path Clarity

**Verdict: The path exists but has a critical visual gap.**

The intended activation path, reconstructed from the codebase:

1. Homepage or demo page -> "Create free account" (signup)
2. Signup page -> email/password form -> auto-login -> redirect to `/dashboard`
3. Onboarding checklist appears (4 steps: install extension, first workflow, view SOP, view process map)
4. Sample workflow API (`POST /api/sample-workflow`) creates a realistic "Create Purchase Order" workflow so users can explore output immediately without recording

**Strengths:**
- The sample workflow is a well-designed time-to-value accelerator. It generates a complete 4-step, multi-system workflow (SAP + Outlook) with all artifacts (SOP, process map, report) so users see real output before committing to the extension install.
- Onboarding steps are context-aware: "install extension" checks `hasExtensionKey`, "first workflow" checks `workflowCount > 0`. This avoids showing completed steps as incomplete.
- Signup is minimal: name (optional), email, password. Low friction.

**Gaps:**
- The signup page fires `signup_completed` after account creation but does not track the onboarding funnel steps (those events exist in the analytics taxonomy but depend on the onboarding checklist being rendered in the dashboard, which was not reviewed here).
- There is no Google OAuth on the signup page despite the engineering brief listing OAuth2 (Google) in the tech stack. This may be expected for current phase.
- The demo page is a static walkthrough, not an interactive demo. Users cannot experience the product without signing up.

---

## 4. Onboarding Completeness

**Verdict: Structurally solid, localStorage-based.**

The onboarding system (`src/lib/onboarding.ts`) defines 4 steps:

| Step | Title | Completion trigger |
|------|-------|--------------------|
| `install_extension` | Install the browser extension | `hasExtensionKey` context check |
| `first_workflow` | Record or upload your first workflow | `workflowCount > 0` context check |
| `view_sop` | Explore your generated SOP | Manual step completion tracking |
| `view_process_map` | Review your process map | Manual step completion tracking |

State is persisted in `localStorage` under `ledgerium_onboarding`. The system tracks `isDismissed`, `completedSteps`, `startedAt`, and `completedAt`.

**Strengths:**
- The steps logically guide a user from setup to value (install -> record -> view outputs).
- Dismissibility is supported — users can opt out.
- Completion checking uses real context (workflow count, extension key presence), not just click tracking.

**Gaps:**
- Onboarding state is localStorage-only. It does not survive browser changes or device switches. For an early-stage product this is acceptable.
- There is no server-side onboarding state, meaning onboarding analytics depend entirely on client-side event firing.

---

## 5. Analytics / Measurement Readiness

**Verdict: Well-structured taxonomy, no backend integration yet.**

The analytics module (`src/lib/analytics.ts`) defines a comprehensive typed event taxonomy covering:

- **Authentication:** signup_completed, login_completed, login_failed, logout
- **Onboarding:** onboarding_started, onboarding_step_completed, onboarding_completed, onboarding_dismissed
- **Activation milestones:** first_workflow_uploaded, first_sop_viewed, first_process_map_viewed, first_export
- **Workflow lifecycle:** workflow_uploaded, workflow_viewed, workflow_exported, workflow_deleted, workflow_favorited, sample_workflow_loaded
- **Feature usage:** tab_switched, analysis_run, insights_viewed
- **Sharing/collaboration:** share_link_created/disabled/copied, shared_workflow_viewed
- **Teams:** team_created, team_invite_sent/accepted, team_member_removed
- **Tags/organization:** tag_created/deleted/assigned/removed, tag_filter_applied
- **Conversion:** upgrade_prompt_viewed

The comment header states events are "buffered client-side and logged server-side" and "ready for PostHog/Segment/Mixpanel integration via sendToBackend()."

**Observation:** The taxonomy is unusually mature for a pre-launch product. It covers the full activation funnel (signup -> first workflow -> first SOP view -> first export), engagement loops (workflow_viewed, tab_switched), and conversion signals (upgrade_prompt_viewed). However, without an actual analytics backend connected, none of these events are being collected or analyzed.

---

## 6. Trust Signals Present

**Verdict: Privacy and determinism messaging is strong. Social proof is absent.**

**Trust signals found in the codebase:**
- Homepage trust strip: "Deterministic / Private / No AI guessing / Free to start"
- Install extension page: explicit "Captured" vs. "Not captured" comparison (no screenshots, no video, no keystrokes, no background activity)
- Pricing FAQ: "Your workflow data is stored in your personal account and never shared with third parties. Sensitive field values are automatically redacted during capture."
- Pricing footer: "Your data is never shared or used for training."
- Install page: "Sensitive field values (passwords, financial data) are automatically redacted."

**Trust signals NOT found:**
- No customer logos, testimonials, or case studies
- No security certifications or compliance badges (SOC2, GDPR, etc.)
- No third-party validation or press mentions
- No open-source code references or audit trail transparency
- No data residency or processing location information

This is expected for a pre-launch product but will be a significant gap for enterprise and compliance buyers once outreach begins.

---

## Summary

| Dimension | Status | Priority to address |
|-----------|--------|---------------------|
| Messaging clarity | Strong headline and structure, missing product visuals | High — add screenshots/demo before any paid acquisition |
| Audience targeting | Four segments named, engineer persona absent from public pages | Medium — acceptable for initial launch |
| Activation path | Signup -> sample workflow -> onboarding checklist is solid | Medium — interactive demo would reduce signup friction |
| Onboarding | 4-step checklist with context-aware completion | Low — functionally complete for beta |
| Analytics readiness | Comprehensive taxonomy defined, no backend connected | High — must connect before measuring any growth experiments |
| Trust signals | Privacy/determinism strong, social proof absent | Medium — expected for pre-launch, critical for enterprise |
