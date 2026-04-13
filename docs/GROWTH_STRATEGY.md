# Ledgerium AI — Growth Strategy

**Status:** ACTIVE
**Date:** 2026-04-13
**Owner:** Growth Strategist
**Upstream:** ICP_DEFINITION.md, POSITIONING_DECISION.md, BETA_LAUNCH_PLAN.md, SUCCESS_METRICS.md, assessments/

---

## Strategic Foundation

Before any channel or tactic, one constraint governs everything in this document:

You are a solo founder with no marketing budget, no social proof, and a product that has not yet been validated with real users. The growth strategy that fails you is the one that tries to do too much before the core loop is proven.

The growth strategy that works is:
1. Get 5-15 real users through the core loop
2. Collect one piece of evidence that the SOP output is usable
3. Use that evidence to make the next acquisition move

Every section below is ordered with that reality in mind. Items in "Phase 1" cost nothing but your time. Items in later phases only make sense after the beta validates the loop.

---

## 1. Positioning Statements

### For the individual ops person (primary ICP)

"Ledgerium records how browser work actually happens and generates a complete SOP in minutes — without interviews, screenshots, or rewrites."

### For the team lead (expansion buyer)

"Ledgerium gives you documented proof of how your team actually executes its processes — not how they say they do — so you can onboard faster, audit cleanly, and improve from evidence."

### For the enterprise or compliance buyer (future motion)

"Ledgerium produces auditable, evidence-linked process documentation automatically — every SOP step traceable to the real browser interaction that generated it."

---

## 2. Ideal Customer Profiles

These are ordered by acquisition priority. Only pursue ICP 1 during beta.

### ICP 1 — Operations Team Lead (Primary, pursue now)

**Role:** Operations Manager, Process Lead, Sr. Analyst, Team Lead
**Company size:** 50–2,000 employees
**Industry:** Financial services, insurance, healthcare admin, SaaS operations, shared services, logistics
**Team size they support:** 5–50 people

**Pain they feel today:**
- SOPs are written from memory and go stale immediately
- Documenting a new process takes 2–4 hours of writing and review
- They know the SOP is wrong but cannot prove how or where it diverges from reality
- New hires follow incomplete SOPs and make errors that require manual correction
- Audit requests require scrambling to produce documentation that was never formally maintained

**Why Ledgerium solves it:**
- Records what actually happened — not what someone remembered
- Produces a structured SOP in minutes, not hours
- Every step is tied to a browser event, not an assumption
- The output is clean enough to share with a team member or an auditor

**Acquisition channel:** Direct outreach (LinkedIn, Slack communities), content marketing on ops-focused topics

**Where to find them:**
- LinkedIn: search "operations manager" + "SOP" or "process documentation"
- Slack communities: RevOps Co-op, Systems Thinkers, Process Street community, Notion community
- Reddit: r/operations, r/productivity (job-to-be-done discussions)
- Process Street, Trainual, Notion user forums (people already solving this problem with inadequate tools)

**What disqualifies them from ICP 1:** Their workflows happen in desktop apps (not browser-based), or they work at a company where IT controls all software installs. These users are real but cannot succeed with the current product.

---

### ICP 2 — Compliance Analyst in Regulated Industry (Secondary, pursue after 10+ validated beta users)

**Role:** Compliance Analyst, Risk Officer, Quality Manager, Internal Auditor
**Company size:** 200–10,000 employees
**Industry:** Financial services, healthcare, insurance, professional services

**Pain they feel today:**
- Producing documented evidence of process execution for audits is a manual, expensive effort
- They cannot prove that what the procedure says matches what staff actually do
- Audit remediation requires retroactive documentation that may not reflect reality

**Why Ledgerium solves it:**
- Evidence-linked output means every SOP step is traceable to a real observed action
- Deterministic processing means the same workflow always produces the same documentation — no reinterpretation
- No screenshots or content capture means no privacy risk in regulated environments

**Acquisition channel:** Vertical content (compliance-specific), warm intro through beta ops users whose compliance teams notice the audit-ready output

**Signal to start pursuing:** A beta user from ICP 1 says "our compliance team asked about this."

---

### ICP 3 — Training or Onboarding Manager (Secondary, pursue after SOP quality is validated)

**Role:** Training Manager, L&D Manager, Enablement Manager, HR Business Partner
**Company size:** 100–5,000 employees
**Industry:** Any industry with high headcount or frequent role transitions

**Pain they feel today:**
- Building training materials for complex browser-based tools takes weeks
- Recorded training becomes outdated as tools change
- New hires receive inconsistent onboarding depending on which senior person walks them through it

**Why Ledgerium solves it:**
- SOPs can be recorded from the best performer's actual workflow — not reconstructed from memory
- Output is structured and can be attached to any training system
- Updating a process means re-recording it, not rewriting a document

**Signal to start pursuing:** A beta user explicitly says "I shared this SOP with a new hire as part of onboarding."

---

### ICP 4 — AI Builder or Automation Engineer (Future, post API polish)

**Role:** AI Engineer, Automation Architect, Platform Engineer, RevOps Builder
**Company size:** Any
**Industry:** Any with active AI or RPA programs

**Pain they feel today:**
- Building AI agents or automations requires understanding what the current human workflow actually does
- Discovery is done through interviews and shadowing — slow, inaccurate, and not machine-readable
- There is no structured input format that captures real workflow behavior for automation design

**Why Ledgerium solves it:**
- Machine-readable JSON process definitions from real observed workflows
- Timing, confidence scores, and step classifications are immediately useful as automation inputs
- The "measure before you automate" use case positions Ledgerium as essential pre-automation infrastructure

**Signal to start pursuing:** Inbound requests asking about API access or JSON export.

---

## 3. Acquisition Strategy

### Priority stack for a solo founder

The rule: work down this list in order. Do not advance to the next tier until the previous one has produced validated users.

```
Tier 1 (cost: $0, time: hours)     Direct personal outreach
Tier 2 (cost: $0, time: days)      Content and community
Tier 3 (cost: low, time: weeks)    PLG and product-led distribution
Tier 4 (cost: budget required)     Paid acquisition
```

---

### Tier 1 — Direct personal outreach (start here)

This is the right acquisition motion for a product that is not yet validated. You need feedback more than you need scale.

**What to do:**
- Identify 15–20 ops team leads on LinkedIn who maintain SOPs for browser-based tools
- Write one personalized message per person. Reference something specific about their role or industry.
- Offer them early access in exchange for one 15-minute feedback call

**Template (adapt to each person):**

> "Hi [Name], I noticed you manage ops processes for [company/industry]. I'm building a tool that records real browser workflows and generates SOPs automatically — no screenshots, no video, structured data that traces every step to evidence. I'm looking for 10 ops leads to test it this month. Would you try it and give me 15 minutes of feedback? Free access, no sales pitch."

**Target:** 15 messages sent → 5 responses → 3 activated users in week 1. Iterate on the message if response rate is under 20%.

---

### Tier 2 — Content marketing

Content works when it demonstrates the product's capability through a real problem the reader already has. Generic SaaS content does not work for a no-audience solo founder.

**Topics that will work (ordered by expected performance):**

1. **"We documented every process our ops team follows — here's what we actually found"**
   Format: Case study or simulated walkthrough showing the gap between a written SOP and a recorded workflow. This is the product's core thesis. Write it from the perspective of the user discovering the discrepancy.

2. **"Why your SOPs are always wrong (and what to do about it)"**
   Format: Problem-framing post for ops managers. The answer is observation-first documentation, with Ledgerium as the tool that makes it possible. Publish on LinkedIn, cross-post to process improvement communities.

3. **"I automated my SOP writing — here's exactly what the output looks like"**
   Format: A transparent walkthrough showing an actual Ledgerium recording → SOP output. Show the real thing. Show what it looks like before and after. Publish on LinkedIn, Reddit r/operations, and relevant Slack communities. This is a product demo in article form.

4. **"How to prepare for an operations audit without spending two weeks on documentation"**
   Format: Practical guide. Mention Ledgerium's evidence-linked output as a component. Useful for regulated-industry ICP discovery.

5. **"Process mining is for enterprises. Here's what small ops teams actually need."**
   Format: Category-defining content. Positions Ledgerium against Celonis/UiPath without trying to compete — frames the space as "observation-first SOP tools" vs. "enterprise process mining."

**Distribution strategy:** For a solo founder with no audience, distribution matters more than publishing. Post the content in 2–3 relevant communities per piece (not just your own feed). Find the communities where ICP 1 already discusses SOP and process documentation pain.

**Content cadence:** One substantial piece per week during the first 60 days. Quality and distribution matter more than volume.

---

### Tier 3 — Product-led distribution

Ledgerium has two natural sharing mechanisms that create acquisition without paid spend:

**Mechanism 1: SOP as a sharable artifact**
When a user records a workflow and sends the SOP to a colleague, that colleague sees "Generated by Ledgerium" in the output footer. The SOP is both a product output and a distribution vehicle.

**What to build:** A clean "share SOP" link that lets a non-user view the SOP output without signing up. Include one call-to-action: "Record your own workflow free." Measure: shared SOP views → signups.

This is the single highest-leverage PLG feature for the current product. Build it during the beta phase, not after.

**Mechanism 2: The "free SOP" offer**
A landing page where someone inputs a description of a workflow they want to document and receives a demo SOP. This is a lead magnet that demonstrates the product before account creation.

Build this after the shareable SOP link is live and validated.

**What makes Ledgerium naturally shareable:**
- The SOP output is something a user wants colleagues to see — it validates their process work
- The process map is visual and credibility-building — people share things that make them look smart
- The "your SOP says X steps, reality is Y" framing is confrontational enough to provoke sharing

---

### Tier 4 — Paid channels (defer until activation metrics are established)

Do not spend money on paid acquisition until:
- Activation rate is above 30% (signup → first SOP viewed)
- SOP usefulness score is above 50%
- You have at least one testimonial or concrete usage stat

When those conditions are met, the first paid experiments to run:

**Experiment A: LinkedIn Thought Leadership Ads**
- Audience: Operations Managers, Process Improvement, Compliance roles
- Format: Single-image ad with the "5 steps vs. 17 steps" framing
- CTA: Free account (no credit card)
- Success metric: Cost per activated user (not cost per click)
- Budget: $500 test

**Experiment B: Google Search — Intent-matched keywords**
- Keywords: "how to write an SOP faster," "SOP automation tool," "workflow documentation software," "process documentation chrome extension"
- Avoid: "process mining" (wrong buyer intent), "screen recording" (wrong category)
- CTA: Free trial, demo page
- Budget: $300 test

**Partnership opportunities worth exploring (no budget required):**
- Notion template creators — Ledgerium SOP output drops into Notion; a co-created "process documentation" template could drive traffic from Notion's creator ecosystem
- Process Street and Trainual users — people already using these tools to manage SOPs are the exact ICP. Participate authentically in their communities before positioning Ledgerium as an alternative
- RevOps and BizOps communities — these buyers are technical, process-oriented, and influential. One genuine contribution to RevOps Co-op is worth more than a paid LinkedIn campaign

---

## 4. Activation Strategy

### The aha moment

The aha moment for Ledgerium is:

**"I recorded my real workflow and the SOP output was good enough to share with my team."**

This moment has three components:
1. The user completes a recording without friction
2. They view the SOP output
3. They judge the output as usable — not perfect, but share-worthy

Everything in the activation design should be optimized toward reaching this moment in under 15 minutes.

### The pre-aha moment (sample workflow)

Before a new user records anything, the sample workflow creates a secondary aha moment:

"I can see what this product produces before I commit to installing the extension."

This is already built. The sample workflow ("Create Purchase Order" — SAP + Outlook, 4 steps) loads on signup and shows real output immediately. This should be the first thing a new user sees in the dashboard — not an empty state, not a checklist.

**Current gap:** The sample workflow exists but may not be prominently featured as the first action. If a new user lands on an empty dashboard before the sample loads, you lose them. Confirm that the sample workflow is visible and populated within 30 seconds of signup.

### Activation funnel stages

```
Stage 1: Signup (0 min)
  → User creates account, sees sample workflow immediately
  → Activation: They open the sample SOP and view it

Stage 2: Extension Install (5 min)
  → User installs the Chrome extension
  → Friction point: Chrome Web Store flow, install confirmation
  → Reduce friction: Link directly to Chrome Web Store with one-click install text

Stage 3: First Recording (10 min)
  → User starts a recording on a real workflow
  → Friction point: Not knowing which workflow to record
  → Reduce friction: Onboarding copy says "Record any workflow you already do today — it doesn't have to be perfect"

Stage 4: First SOP Viewed (12–15 min)
  → User stops recording, workflow syncs, SOP appears
  → AHA MOMENT
  → Prompt: "Would you use this SOP as-is or with minor edits?" (yes/no inline survey — one click)

Stage 5: First Share (within 48 hours)
  → User shares SOP link with a colleague
  → This is the distribution trigger and the strongest retention signal
```

### Friction points to remove before open beta

1. **Extension sync configuration is not obvious.** If a user installs the extension but cannot figure out how to sync their recording to the web app, activation dies here. The install page must show the exact steps with screenshots.

2. **"What should I record?" is a conversion killer.** Users abandon tools when they do not know what to do first. The onboarding checklist should suggest a specific workflow type: "Try recording how you create a support ticket or submit an expense report."

3. **The sample workflow must not look like a demo.** It should look like a real op — something the user recognizes from their own job. The current sample (SAP purchase order + Outlook) is good for financial ops users. If your beta ICP skews toward SaaS ops or healthcare, consider adding a second sample that matches.

4. **Empty state after sample workflow is a dead end.** After viewing the sample, the user needs one clear next action: "Now record your own workflow." A button, not a checklist item.

### Activation metric recommendation

**Primary activation metric:** % of signups who view their first SOP (generated from a real recording, not the sample workflow)
**Target:** >30%
**Why this metric:** It captures full-funnel value — user signed up, installed extension, recorded a workflow, saw output. Every step must work for this to fire.

**Secondary activation metric:** % of activated users who share an SOP within 7 days
**Target:** >25%
**Why this metric:** This is the strongest signal that the output is valuable — users only share things that make them look good or help their team.

---

## 5. Onboarding Flow — First 5 Minutes

This is the exact sequence a new user should experience. Every step has a job.

### Minute 0 — Signup

**What happens:** User clicks "Create free account" from homepage or demo page.
**What they see:** Minimal signup form (email + password, name optional).
**What fires:** signup_completed event, sample workflow loads in background.
**Goal:** Account created, redirect to dashboard in under 30 seconds.

**Copy on signup page:** "Start free. No credit card. Your first SOP in under 10 minutes."

---

### Minute 0–1 — First dashboard view

**What they see:** Dashboard with one workflow already populated — the sample workflow. Not an empty state. Not a "welcome" splash screen. The product.
**Onboarding strip (compact, dismissible):** "This is a sample workflow. Click it to see what Ledgerium generates — then record your own."
**Goal:** User clicks the sample workflow within 60 seconds.

**What NOT to show here:** A long onboarding modal. A video tutorial. A checklist of 6 steps. A "tell us about yourself" survey.

---

### Minute 1–3 — Sample SOP view

**What they see:** The sample workflow open, SOP tab active. Real output — steps, timing, process map.
**Goal:** User spends 60–90 seconds reading the SOP and thinks "this is what my workflow would look like."
**Prompt (appears after 60 seconds on the SOP tab):** "This was generated from a recorded workflow. Want to generate one from your own process?" with a button: "Install the extension."

---

### Minute 3–5 — Extension install

**What they see:** Install page with exact steps, screenshots of the extension sidebar, and a direct link to the Chrome Web Store.
**Goal:** Extension installed and sync configured within 2 minutes.
**Copy:** "The extension captures what you click and where you navigate — no screenshots, no video, no sensitive data. Install takes 60 seconds."

**If user abandons here (does not install):** Send one email 24 hours later: "Your first SOP is waiting — here's how to record it."

---

### After minute 5 — First recording prompt

**What they see:** Extension installed, back to dashboard, onboarding prompt: "You're ready to record. Start a workflow you already do today — creating a ticket, processing an order, submitting a form."
**Goal:** User starts their first recording within 10 minutes of signup.

**After recording completes:** Auto-redirect to the new workflow. SOP tab is active. Inline prompt appears: "Would you share this SOP with a colleague?" (yes/not yet — one click).

---

### Upgrade intent trigger

**What triggers upgrade consideration:** The user tries to access their 6th workflow and sees the free tier limit. Or they try to export the SOP in a format other than JSON.

**Copy at the limit:** "You've recorded 5 workflows — enough to see what Ledgerium can do. Upgrade to Pro for unlimited recordings, full exports, and process maps." CTA: "Upgrade for $29/month."

**What NOT to do:** Gate process maps behind Pro for free users. The process map is a core differentiator. Let free users see it for their first 5 recordings. The upgrade incentive should be unlimited access, not a preview tease.

---

## 6. Pricing Strategy Recommendations

### Competitor reference

| Tool | Free | Pro | Enterprise |
|------|------|-----|-----------|
| Scribe | Limited (25 Scribes) | $29/seat/month | Custom |
| Tango | Limited | $16/seat/month | $25+/seat/month |
| Ledgerium (current) | 5 recordings, JSON export | $29/month | Custom |

### Assessment of current pricing

**What is working:**
- $29/month is market-standard for individual users in this category
- Free tier with 5 recordings is enough to evaluate the product
- No credit card required for free tier reduces friction

**What needs to change:**

**Change 1: Unlock process maps on the free tier**
The process map is the single most visually impressive output and the most differentiated from Scribe/Tango. If free users cannot see it, they cannot evangelize it. Free users who see the process map are more likely to convert and more likely to share.
Recommendation: Allow full process map access for all 5 free recordings. Gate unlimited recordings and export formats behind Pro.

**Change 2: Add annual pricing**
Monthly-only pricing leaves LTV on the table and signals early-stage instability. Offer annual billing at 2 months free ($290/year vs. $348/year). Add this before open beta. It will not affect conversion rate materially but will improve cash flow and retention signal.

**Change 3: Reframe the free tier limit as a natural milestone**
"5 recordings" sounds arbitrary. Frame it as: "Record your 5 most important workflows free — no credit card required." This reframing makes the limit feel intentional and encourages users to think about which 5 processes to capture.

**Change 4: Clarify the Enterprise tier**
The current Enterprise tier lists features (SSO, shared libraries, admin controls) that do not yet exist. Remove specific feature claims from the Enterprise tier until those features are built. Replace with: "Custom deployment for teams. Includes shared workspace, admin controls, and compliance reporting. Contact us to discuss." Do not overpromise.

**Change 5: Consider a $9/month "Starter" tier**
This is a later-phase consideration (post-PMF validation). A $9/month tier for individual users who need more than 5 recordings but do not need team features could expand the conversion funnel. Do not implement this until the $29 Pro tier has been tested with real conversion data.

---

## 7. Launch Plan — First 90 Days

This plan assumes the beta checklist in BETA_LAUNCH_PLAN.md is completed in the first two weeks. Everything here builds on that foundation.

---

### Weeks 1–2: Pre-beta polish and first users

**Goal:** Get 5 validated beta users through the core loop before doing anything else.

**Actions:**
- Complete the pre-beta checklist (product screenshots, analytics connection, activation path test)
- Write and send 15 personalized beta outreach messages to ops team leads
- Confirm the sample workflow loads within 30 seconds of signup
- Add SOP usefulness survey (one question, inline, after first SOP view)
- Add "share SOP" capability — even if it is just a copyable link for now

**Do not do yet:** Content marketing, community posts, paid experiments, press outreach.

**Success signal:** 3 users complete the full activation path (signup → extension install → first recording → SOP view).

---

### Weeks 3–4: Validate and iterate

**Goal:** Confirm what is working in the activation path. Fix what is not.

**Actions:**
- Run the weekly metrics check defined in SUCCESS_METRICS.md
- Conduct 3–5 feedback calls with beta users (15 minutes each, structured questions)
- Fix the top 1–2 friction points identified in feedback calls
- Write the first content piece: "Why your SOPs are always wrong and what to do about it"
- Publish on LinkedIn, share in 2 relevant Slack communities

**Success signal:** At least 1 beta user says "I shared this SOP with a colleague." At least 1 beta user records a second workflow unprompted.

**Decision gate:** If activation rate is below 30% after 10 signups, stop outreach and diagnose the specific step where users drop off. Fix that before adding more users.

---

### Month 2: Expand beta and build distribution foundation

**Goal:** Grow from 5 to 25 validated users. Establish one repeatable acquisition channel.

**Actions:**
- Open beta to 15–20 additional users (same ICP — ops team leads)
- Publish 4 content pieces (one per week, topics listed in Section 3)
- Add "Generated by Ledgerium" attribution to SOP output with a shareable link
- Add annual pricing option
- Begin tracking which acquisition channel each new user came from
- Identify 1–2 LinkedIn voices in the ops/process space — engage authentically with their content (not promotional)

**Success signal:** At least 2 new signups from content or community (not from your direct outreach). At least 5 total activated users have shared an SOP.

**Do not do yet:** Paid acquisition. You do not have enough data to know what message to optimize for.

---

### Month 3: Prepare for open beta and first paid experiments

**Goal:** Reach 50+ total signups with a measurable activation rate. Run one paid experiment.

**Actions:**
- Open beta publicly (remove invitation requirement)
- Update homepage with one real user quote or usage stat (even "X SOPs generated" if you can show a real number)
- Publish a case study or walkthrough from a beta user (with their permission)
- Run LinkedIn Experiment A ($500 budget — see Section 3 Tier 4)
- Add Notion export (this is the highest-value integration for ICP 1 based on competitive analysis — even a basic markdown export that pastes cleanly into Notion)
- Evaluate: Is the compliance buyer appearing organically? If yes, begin planning the compliance positioning expansion

**Success signal:** 50+ total signups, activation rate consistently above 30%, at least one piece of external content driving inbound signups.

**Do not do yet:** Enterprise sales motion, team features, AI features. The beta is validating the individual user loop. Team features come after that loop is proven.

---

## 8. Metrics to Track

### Tier 1 — Core health metrics (check weekly)

These are the metrics that tell you if the product and acquisition are working.

| Metric | Definition | Target |
|--------|-----------|--------|
| Activation rate | % of signups who view a real SOP (not sample) | >30% |
| Time to first SOP | Minutes from signup to first SOP viewed | <15 min |
| SOP usefulness score | % who answer "yes" to the inline survey | >50% |
| Return rate | % of activated users who record a 2nd workflow in 7 days | >25% |
| SOP share rate | % of activated users who share an SOP | >10% during beta, >20% post-open-beta |
| Recording completion | % of started recordings that produce a valid workflow | >80% |

### Tier 2 — Acquisition quality metrics (check weekly)

| Metric | Definition | What it tells you |
|--------|-----------|-------------------|
| Signup source | Which channel drove each signup | Where to invest more time |
| Signup-to-activation by channel | Activation rate per acquisition source | Quality vs. volume per channel |
| Extension install rate | % of signups who install the extension | Whether activation path friction is at install step |
| Sample workflow → real recording conversion | % of users who move from sample to recording | Whether sample workflow is building intent |

### Tier 3 — Conversion and retention metrics (check monthly)

| Metric | Definition | Target |
|--------|-----------|--------|
| Free-to-Pro conversion rate | % of free users who upgrade | >5% at 30 days (industry avg is 2–5%) |
| Pro monthly retention | % of Pro users still active 30 days after upgrade | >80% |
| Workflows per active user | Avg recordings per user in 30-day window | >3 (signals habit formation) |
| Churn rate | % of Pro users who cancel in a given month | <5% |

### Tier 4 — Leading indicators (watch for signals, not targets)

| Indicator | Signal it provides |
|-----------|-------------------|
| Tab switching patterns (SOP vs. Process Map vs. Report) | Which output has the most perceived value — this informs which tab to lead with |
| Export usage by format | Which export format is most used — informs integration priority |
| Feedback call sentiment by ICP | Whether the ICP definition is correct |
| Inbound message topics | What problem people are trying to solve — informs messaging refinement |

### Metric not to track (yet)

Do not track MRR as a primary metric until you have 10+ paying users. Tracking a number that moves by $29 increments creates false confidence or false panic. Track activation and retention first — revenue follows.

---

## Summary — Solo Founder Priority Stack

If you can only do three things this week:

1. Send 15 direct outreach messages to ops team leads. This is the fastest path to validated users.
2. Confirm the sample workflow is the first thing a new user sees after signup — not an empty state.
3. Add one inline question after first SOP view: "Would you use this SOP with your team?" and record the responses manually if analytics is not connected yet.

Everything else in this document is sequenced behind those three actions.

---

## Reference Documents

| Document | Role in growth strategy |
|----------|------------------------|
| `docs/ICP_DEFINITION.md` | Primary and secondary persona definitions |
| `docs/POSITIONING_DECISION.md` | Confirmed positioning axis and one-line statement |
| `docs/BETA_LAUNCH_PLAN.md` | Pre-beta checklist and beta success criteria |
| `docs/SUCCESS_METRICS.md` | Event taxonomy and metric definitions |
| `docs/assessments/CURRENT_STATE_COMPETITIVE_LENS.md` | Competitor positioning analysis |
| `docs/assessments/CURRENT_STATE_GTM_ASSESSMENT.md` | Activation path and messaging gap analysis |
| `docs/assessments/CURRENT_STATE_SYNTHESIS.md` | Cross-agent consensus on strengths and risks |
