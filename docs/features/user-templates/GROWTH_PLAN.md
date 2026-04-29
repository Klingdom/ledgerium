# Growth Plan: User-Uploaded Templates

**Feature:** Custom Template Upload
**Author:** Growth Strategist
**Date:** 2026-04-18
**Status:** Pre-launch — awaiting GA readiness

---

## 1. One-Line Positioning

**Three candidates:**

A. "Your format. Ledgerium's evidence. No reformatting."
B. "Record once. Render in your approved template. File without touching it."
C. "The SOP Ledgerium generates now matches the template your compliance team approved."

**Selected: B**

Reason: Option B names the complete job-to-be-done in one sentence (record → render → file) and makes the elimination of manual reformatting the explicit promise. Option A is too terse to carry meaning without context. Option C names the compliance buyer but signals too narrow an audience for a Growth-tier feature that must convert ops leads broadly. Option B works for both the general ops lead and the compliance buyer without sacrificing specificity.

---

## 2. Primary ICP for This Feature

**Process Documentation Lead at a mid-market organization (50–500 employees) who already has an approved internal SOP format.**

This persona converts fastest because the pain is measurable and currently absorbed as direct labor: every Ledgerium recording that produces an SOP they cannot file directly requires manual reformatting before it reaches their documentation system. That reformatting step is already a known cost. The template feature eliminates it. No persuasion is needed — the buyer already knows they have the problem. The conversion motion is: demonstrate that their format works in Ledgerium, and the friction to upgrade disappears.

The secondary ICP — compliance officer in a regulated industry — has higher long-term willingness to pay but a longer activation path: they need to verify audit traceability, involve legal review of where templates are stored, and may require SSO before the trial can reach a decision-maker. Do not optimize the initial launch for this persona. Activate ops leads first; let compliance personas surface through expansion.

---

## 3. Tier Placement

**Gate at Growth and above. No preview, no upload, no save for Free, Starter, or Team.**

Reasoning:

- **Free:** Five recordings per month, no `cleanExports`, no `healthScores`. Users on this tier are evaluating whether Ledgerium's core output is useful. Template formatting is not their blocker. Showing a locked preview here adds noise without conversion signal.

- **Starter:** `cleanExports` and `healthScores` are unlocked, but `sharedLibrary`, `teamWorkspace`, and `priorityExports` are not. This is a single-seat plan. No organization adopts a company-approved SOP template for one person — it is a team or org artifact. A custom template on Starter would be used once and abandoned. Do not offer it here.

- **Team:** Team-scoped access with `sharedLibrary`, `teamWorkspace`, and `intelligenceLayer` — the right structural fit for shared templates. However, Team is capped at 5 seats and 3 recorders. The segments who most need custom templates (regulated-industry ops teams, BPO, consulting) are predominantly in Growth/enterprise size brackets. More importantly, the upgrade prompt from Team to Growth already requires justification — adding custom templates to Growth gives the first concrete, non-analytical reason a Team user should upgrade. Granting it at Team eliminates that lever.

- **Growth:** First tier with `priorityExports`, `crossWorkflowComparison`, `advancedAnalytics`, and `agentComposition`. The Growth buyer is already paying for organizational-scale value. Custom templates fit naturally: they compound `priorityExports` (your format, delivered at priority speed), and the `sharedLibrary` means the template benefits the whole team. This is the right unlock tier.

- **Enterprise:** Full access including `auditTrail` and `complianceExports`. At Enterprise, custom templates become an audit-compliance asset — the template version that produced an artifact is traceable alongside the `auditTrail`. Post-MVP, template versioning and the private team library belong here.

**Specific gating decisions:**

| Tier | Can see feature exists? | Can upload? | Can activate? | Notes |
|------|------------------------|-------------|---------------|-------|
| Free | No | No | No | Not surfaced |
| Starter | No | No | No | Not surfaced |
| Team | Yes (locked with upgrade prompt) | No | No | Upgrade prompt on Templates settings page |
| Growth | Yes | Yes | Yes | Full feature |
| Enterprise | Yes | Yes | Yes | Full feature + future versioning/audit hooks |

The upgrade prompt for Team tier users should appear on the Templates settings page, not as a modal interrupt. Let the user navigate there intentionally, see what is available, and encounter the prompt in context.

---

## 4. Launch Sequence

**Week 1 — Closed beta (invite-only)**

Criteria for closed beta participants: current Growth or Enterprise paying users who have recorded at least 5 workflows and have exported at least once. This cohort has already validated Ledgerium's core loop. Target 8–12 participants. Invite via direct email from the founder, not a broadcast. Ask each participant to upload a template they are already using internally. The goal is not to collect feature feedback — it is to find the first real-world template that works end-to-end and generates a quotable outcome.

Measurement gate to exit Week 1: at least 3 participants have an active custom template and at least 1 has rendered a new recording through it successfully.

**Weeks 2–3 — Public beta + feedback loop**

Open the upload flow to all Growth and Enterprise users with a beta badge on the Settings > Templates page. Send a single in-product message to eligible users: "Custom templates are in beta — upload your SOP format and every new recording renders in it." Collect structured feedback: upload success/failure rate, upload-to-activation rate, and the fallback rate (recordings that could not apply the template). If fallback rate exceeds 15%, pause and fix schema documentation before proceeding. Run a weekly 30-minute user call with any beta participant willing to share their template. Purpose: find the schema edge cases before GA.

**Weeks 4–5 — GA launch**

Remove the beta badge. Update the Growth tier feature page to list custom templates as a named capability. Send a one-time changelog email to all Growth and Enterprise users. Issue a product update post for the changelog/blog. Do not announce on social until a customer quote is in hand. The quote must reference a specific outcome: "we eliminated X hours of reformatting per week" or "our compliance team accepted the output without changes." Update the Growth tier upgrade page to include custom templates in the feature comparison table alongside `cleanExports`, `healthScores`, and `priorityExports`.

**Week 6 — Paid promotion + case study**

Publish a single case study based on the best Week 1 beta result. The case study format: one paragraph on the before state (manual reformatting burden), one paragraph on what they uploaded and what changed, one paragraph with a specific measured outcome. Distribute via LinkedIn (one post, targeting ops and quality management), the existing customer email list, and a targeted LinkedIn ad against the ops-manager persona in financial services and healthcare. Run the ad for two weeks with a $500 test budget. Success metric for the ad: cost per Growth trial start below $120.

---

## 5. Acquisition Experiments

**Experiment 1 — "Upload your template" empty-state CTA on the dashboard**

Hypothesis: Growth and Enterprise users who have not yet uploaded a template will activate the feature at a higher rate if the dashboard empty state for the Templates gallery surfaces the CTA directly rather than requiring navigation to Settings.

Assignment unit: workspace (to avoid split-brain between teammates in the same workspace).

Test: 50% of eligible workspaces (Growth/Enterprise, no active template) see the current Settings-only path. 50% see a persistent "Upload your SOP template" card in the main Templates gallery with a direct upload action.

Success metric: template upload rate within 14 days of seeing the card. Baseline estimate: 0% (feature is new). Target: 15% upload rate in the treatment group.

Duration: 3 weeks.

Minimum detectable effect: 10 percentage-point lift over control.

**Experiment 2 — Template step in the onboarding checklist**

Hypothesis: New Growth-tier users who see "Upload your template" as step 3 of the onboarding checklist (after "record your first workflow" and "view your first SOP") will activate the feature faster than users who discover it through Settings navigation.

Assignment unit: user account (new Growth signups only, post-GA).

Test: 50% see the existing 2-step onboarding checklist (record + view). 50% see a 3-step checklist adding "Your recordings can render in your own template — upload it here."

Success metric: percentage of new Growth users who upload and activate a template within their first 7 days.

Duration: 4 weeks (minimum 100 new Growth signups per arm needed for significance).

Minimum detectable effect: 8 percentage-point lift.

**Experiment 3 — Side-by-side compare view (custom vs. default)**

Hypothesis: Growth users who have uploaded but not yet activated a template will activate at a higher rate if they can see a side-by-side preview of their uploaded template rendering vs. the default system template before committing.

Assignment unit: user account (Growth/Enterprise users who have an uploaded but inactive template).

Test: 50% see the current activate button with no preview. 50% see an "Compare to default" link next to the activate button that opens a split-view showing both renders for the user's most recent recording.

Success metric: upload-to-activation rate within 48 hours of the split-view being available.

Duration: 3 weeks.

Minimum detectable effect: 15 percentage-point lift over control baseline.

---

## 6. Onboarding Copy

**Empty state — Templates gallery (no templates uploaded)**

"Your recordings are ready. Now make the output yours.
Upload your SOP or process-map template — every new recording renders in your format automatically, with all evidence links intact."

**Upload success toast**

"Template uploaded. Activate it in Settings > Templates when you're ready — new recordings will render in your format from that point forward."

**First-time preview callout (on the template detail page after upload)**

"This is how your next recording will look. Every field maps to an observed event from the recording — nothing is generated. Activate to apply it to all new workflows."

**Cross-sell to Growth (shown to Team tier users on the Templates settings page)**

"Custom templates are available on the Growth plan. Upload your approved SOP format once — every recording your team makes renders in it automatically, with no post-processing.
See Growth plan details."

---

## 7. Lifecycle Triggers

**Trigger 1 — Template uploaded but not activated after 48 hours**

Channel: in-product notification (not email — too early in the relationship to interrupt).
Message: "Your template is uploaded but not active yet. Activate it in Settings > Templates and your next recording will render in your format. It takes 10 seconds."
Condition: send once, only if no activation event has fired within 48 hours of upload.
Analytic event to track: `upgrade_prompt_viewed` with `location: template_activation_nudge`.

**Trigger 2 — Template has rendered 10 SOPs**

Channel: email.
Subject: "Your template has produced 10 SOPs this week"
Body: "Your custom template is working. Here are the 10 workflows it rendered this week: [list with titles and dates]. Each one was filed in your format with no manual reformatting. If any recording fell back to the system template, [here's why and how to fix it]." Include a one-question feedback prompt: "Did any of these outputs still need manual editing? Yes / No."
Purpose: this email closes the feedback loop on output quality and surfaces reformatting friction that the product cannot detect automatically.

**Trigger 3 — User on Team tier exports a workflow after the custom-templates feature reaches GA**

Channel: in-product banner (shown once, dismissible, on the workflow export confirmation screen).
Message: "This export used Ledgerium's default template. On the Growth plan, your whole team's recordings render in your approved format automatically — no reformatting before filing."
Condition: user is on Team tier, has completed at least one export, custom-templates feature is GA.
Analytic event to track: `upgrade_prompt_viewed` with `location: export_template_upsell`.

---

## 8. Risks to Adoption

**Risk 1 — Schema friction kills upload-to-activation rate**

Specific risk: users who attempt to upload a template discover that the `UserTemplateSchema v1` JSON format is unfamiliar and give up before completing an upload. The upload-to-activation target of 70% (from PRD success metrics) will not be reached if the schema itself is the blocker.

Mitigation: ship a downloadable starter template file alongside the upload UI — a working JSON file pre-populated with all available `ProcessOutput` fields and comment strings explaining each one. Do not launch without this file. Gate Week 2 public beta exit on confirming that at least 5 of the 8–12 closed beta participants uploaded their template without requesting support.

**Risk 2 — Fallback rate undermines trust in the feature**

Specific risk: if recordings fall back to the system template silently or with an unclear error message, users conclude the feature is unreliable and deactivate. A deactivated template is a churned upgrade reason.

Mitigation: the fallback notification in the workflow detail view (per PRD P0.6) must name the specific missing `ProcessOutput` field that caused the fallback, not a generic error. Additionally, monitor the fallback rate in PostHog from day one of public beta. If the rate exceeds 10% across beta users, pause GA and fix the top-failing field mapping before proceeding.

**Risk 3 — Feature is activated by the wrong persona and creates a support burden**

Specific risk: free or Starter tier users who encounter the feature description in marketing copy attempt to access it, cannot, and file support tickets asking how to use templates. This is a messaging and gating problem, not a product problem — but it creates support cost before the feature has generated any revenue.

Mitigation: do not mention user-uploaded templates in any marketing copy targeting Free or Starter users. Gate the feature page and any in-product references to Growth/Enterprise tier users only. The upgrade prompt for Team tier users is the only cross-tier exposure, and it should be scoped to the Settings page, not surfaced in onboarding or feature announcements sent to all tiers.

---

## 9. Launch Success Bar

At the **4-week mark post-GA**, the launch is a pass if ALL of the following are true:

| Metric | Pass Threshold | Measurement Source |
|--------|---------------|-------------------|
| Upload-to-activation rate | >= 60% of users who uploaded a template have activated it | analytics: `template_activated` event / `template_uploaded` event |
| Active templates in eligible workspaces | >= 15% of Growth/Enterprise workspaces have at least one active custom template | analytics: workspace-level query on active template count |
| Fallback rate | < 15% of recordings in workspaces with an active template fall back to system template | analytics: `artifactType` distribution on recordings in custom-template workspaces |
| Reformatting survey response | >= 30% of surveyed users with an active template report "no manual reformatting needed" | post-recording survey introduced at launch (baseline = 0) |
| Zero support escalations for schema interpretation | No Tier 2 support tickets citing inability to understand the template JSON format | support ticket triage tag |

If two or more of these fail at 4 weeks, trigger a structured retrospective before any paid promotion spend (Week 6 activities pause). The case study and ad spend in Week 6 are contingent on passing at least 4 of the 5 metrics.
