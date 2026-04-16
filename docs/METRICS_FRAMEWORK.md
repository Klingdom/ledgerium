# Ledgerium AI — Product Metrics Framework

**Status:** ACTIVE
**Date:** 2026-04-16
**Version:** 1.0
**Upstream:** ICP_DEFINITION.md, SUCCESS_METRICS.md, GROWTH_STRATEGY.md, PRD_v2.md, analytics-architecture.md
**Owner:** Product Manager

---

## Framework Purpose

This document defines the complete metric system for Ledgerium AI. It is the authoritative reference for:
- what the team measures and why
- how metrics connect to user value
- which metrics are leading vs. lagging indicators
- how to interpret metric movement across the tier funnel

Every metric in this document is:
- named precisely (no vague "engagement" or "activity")
- defined with a calculation formula
- tied to a specific user outcome
- classified as leading or lagging
- assigned an owner (product, engineering, growth)

Missing a metric target is not a reason to omit the metric. Use "TBD — establish baseline in first 30 days" rather than exclude.

---

## 1. North Star Metric

### Workflows That Produce a Shared SOP

**Definition:** The count of unique workflow recordings that result in an SOP being shared with at least one person outside the recorder's account, within 7 days of recording completion.

**Formula:**
```
Monthly Shared SOPs = COUNT(workflow_id WHERE sop_shared_at IS NOT NULL AND sop_shared_at <= recording_completed_at + 7 days)
```

**Why this metric, not another:**

| Alternative considered | Why rejected |
|----------------------|--------------|
| Total recordings | A recording no one acts on has no value. Volume without quality is vanity. |
| SOP views | Viewing a sample SOP counts. The north star must require a real user action on real output. |
| Active users | "Active" is undefined without a quality gate. A user who opens the app and leaves is not delivering value. |
| MRR | Revenue is an output of value delivered, not a measure of it. Optimizing MRR before PMF creates churn. |
| Total SOPs generated | Generation is deterministic — every recording produces a SOP. This is not a user decision. |

**Why this metric is correct for Ledgerium:**

The product's thesis is that it records real workflows and produces SOPs good enough to use. A shared SOP is the only behavior that confirms both halves of that thesis simultaneously:
1. The user completed a recording (the capture loop works)
2. The SOP output was good enough to share (the output quality is usable)
3. Another person received process documentation (the job-to-be-done is complete)

The north star also directly measures the PLG flywheel: every shared SOP is a distribution event that exposes a new potential user to the product.

**Current state:** Not instrumented. Implement `sop_shared` event before beta opens.

**Beta target:** 10 shared SOPs in the first 30 days of beta.
**Open beta target:** 50 shared SOPs per month by day 90.
**Growth target:** Month-over-month increase of 20%+ once baseline is established.

---

## 2. Pirate Metrics (AARRR)

Each stage lists 2-3 metrics. All metrics have calculation formulas. Metric priority within each stage is ordered highest to lowest.

---

### 2.1 Acquisition

Acquisition measures how users find and reach the signup flow. For Ledgerium's current phase (pre-PMF, solo-founder, zero paid budget), acquisition quality matters more than volume. A bad-fit user who does not activate poisons the activation rate metric and wastes feedback cycles.

---

**A1. Signup-to-ICP Match Rate**

Definition: Percentage of signups whose stated role and use case match the primary ICP (Operations Team Lead, 5-50 person team, browser-based workflow maintenance).

Formula:
```
ICP Match Rate = COUNT(signups WHERE role IN ['ops_manager','process_lead','team_lead','analyst'] AND use_case MATCHES 'sop_or_process_docs') / COUNT(all_signups) * 100
```

Data source: Collect role + primary use case in signup flow (2-field form, not optional). Do not make this a long survey — two dropdown fields max.

Current state: Not collected.
Target: >60% of signups match ICP during beta.
Why it matters: If ICP match rate is low, the activation rate will be structurally low regardless of onboarding quality. Diagnosing a conversion problem without knowing who converted is not possible.

---

**A2. Acquisition Channel Conversion Rate**

Definition: For each acquisition channel, the percentage of visitors who complete signup.

Formula:
```
Channel Conversion Rate = COUNT(signups FROM channel_X) / COUNT(sessions FROM channel_X) * 100
```

Channels to track from day 1: Direct outreach (LinkedIn), Community (Slack/Reddit), Content (organic article/post), Referral (shared SOP link), Organic (Google/undefined).

Current state: UTM parameters or referrer attribution required at signup. Not confirmed instrumented.
Target: No channel target during beta. Establish baseline. After open beta, expect referral channel to have the highest conversion rate because those users arrive with pre-built trust from a colleague's shared SOP.
Why it matters: Channel conversion rate distinguishes between a traffic problem and a messaging problem. If community drives 100 sessions and 2 signups, the problem is the landing page or the message. If referral drives 20 sessions and 8 signups, the shareable SOP is working.

---

**A3. Time-to-Signup from First Touch**

Definition: Median minutes between a user's first session on any Ledgerium page and account creation.

Formula:
```
Median(signup_at - first_session_at) across all signups in period
```

Current state: Requires session start event on marketing pages.
Target: Establish baseline. A high median (>48 hours) suggests users browse without committing — the demo page is not converting intent into action. A very low median (<2 minutes) may indicate inbound traffic is already highly qualified (good) or that users are signing up without evaluating (increases churn risk).
Why it matters: For a product with a Chrome extension install requirement, users who sign up without understanding what the product does will fail to activate. The goal is not minimum time-to-signup but optimal-quality time-to-signup.

---

### 2.2 Activation

Activation is the most important AARRR stage for Ledgerium at current phase. A user is activated when they have experienced the core product loop and perceived the value of the output.

The activation sequence for Ledgerium has two gates:
- Gate 1: Passive (sample SOP viewed) — user understands what the product produces
- Gate 2: Active (real SOP viewed from own recording) — user has experienced the product

Both gates matter but they are not equivalent. Gate 2 is the true activation event.

---

**AV1. Real Activation Rate (Primary Activation Metric)**

Definition: Percentage of signups who complete a recording and view the resulting SOP (not the sample workflow).

Formula:
```
Real Activation Rate = COUNT(users WHERE first_real_sop_viewed_at IS NOT NULL) / COUNT(all_signups) * 100
```

Calculation requires distinguishing sample workflow views from real workflow views. This requires a `is_sample` flag on the workflow record.

Current state: Defined in SUCCESS_METRICS.md. Not confirmed instrumented.
Target: >30% (beta), >40% (open beta).
Why it matters: This is the single most important activation metric. Every step of the activation funnel must work for this to fire: signup, extension install, sync configuration, first recording, successful upload, SOP generation, and SOP view.

---

**AV2. Time to First Real SOP (Speed of Activation)**

Definition: Median minutes from account creation to the first real SOP view (excluding sample workflow).

Formula:
```
Median(first_real_sop_viewed_at - account_created_at) across activated users
```

Current state: Defined in SUCCESS_METRICS.md. Not confirmed instrumented.
Target: <15 minutes (median).
Why it matters: If median time-to-activation is 90 minutes, it means users are not completing the flow in one session. Single-session activation is critical for a product that requires a Chrome extension install — if users leave before installing, the majority will not return.

---

**AV3. Extension Install Rate**

Definition: Percentage of signups who install the Chrome extension.

Formula:
```
Extension Install Rate = COUNT(users WHERE extension_installed_at IS NOT NULL) / COUNT(all_signups) * 100
```

Current state: Extension install event should fire on first sync or first recording event received by the backend.
Target: >50% (beta), >60% (open beta).
Why it matters: The extension install is the single largest friction point in the activation funnel. A user who does not install the extension cannot generate a real SOP. If this rate is low (below 30%), the problem is in the install flow, the copy on the install page, or the user's understanding of what they will get from installing.

Decompose this metric into:
- Sample SOP view → install CTA click rate
- Install CTA click → Chrome Web Store page view
- Chrome Web Store page view → extension installed

Each drop-off point has a different fix.

---

### 2.3 Retention

Retention measures whether users return to the product and continue deriving value. For Ledgerium, retention has a specific structure: users return when they have recurring workflows worth recording. Retention is not the same as daily active use — an ops team lead who records 3 workflows per week is a retained user.

---

**R1. 7-Day Return Rate (Second Recording)**

Definition: Percentage of activated users who complete a second recording within 7 days of their first.

Formula:
```
7-Day Return Rate = COUNT(users WHERE second_recording_completed_at <= first_recording_completed_at + 7 days) / COUNT(activated_users) * 100
```

Current state: Defined in SUCCESS_METRICS.md.
Target: >25% (beta), >35% (open beta).
Why it matters: A second recording within 7 days is the strongest available signal that the product has entered the user's workflow habit. If a user records once and does not return in 7 days, there is a specific intervention window: the 24-48 hour re-engagement email.

---

**R2. 30-Day Recording Cadence**

Definition: For users who are 30+ days post-signup, the median number of recordings in the most recent 30-day window.

Formula:
```
Median(COUNT(recordings WHERE recording_completed_at >= 30_days_ago) per user, WHERE account_age >= 30 days AND account_age <= 60 days)
```

Measure this cohort-by-cohort (30-60 day users, 60-90 day users) to detect if recording frequency decays over time or stabilizes.

Current state: Not instrumented.
Target: >3 recordings per user in the 30-day window for activated users. Below 2 is a churn signal.
Why it matters: Process documentation is a recurring job. If users record once and stop, the product has not entered their workflow. 3+ recordings per month suggests the product has become the documentation tool for their recurring processes.

---

**R3. SOP Share Rate Among Retained Users**

Definition: Percentage of users with 3+ recordings who have shared at least one SOP.

Formula:
```
SOP Share Rate = COUNT(users WHERE sop_shared_count >= 1 AND total_recording_count >= 3) / COUNT(users WHERE total_recording_count >= 3) * 100
```

Why condition on 3+ recordings: Users need to have experienced the product multiple times before they have established trust in the output quality. Share rate among first-recording users measures novelty, not value.

Current state: Not instrumented.
Target: >30% of users with 3+ recordings have shared at least one SOP.
Why it matters: SOP sharing is both a retention indicator and a referral trigger. A retained user who never shares is getting value but not distributing it. This metric identifies users who are candidates for a "share with your team" prompt.

---

### 2.4 Revenue

Revenue metrics measure monetization efficiency. During beta, revenue is not the primary signal — do not optimize for revenue before activation is proven. Track revenue metrics but do not let them distort product decisions before the activation loop is validated.

---

**RV1. Free-to-Paid Conversion Rate**

Definition: Percentage of free-tier users who upgrade to any paid plan within 30 days of account creation.

Formula:
```
30-Day Conversion Rate = COUNT(users WHERE subscription_upgraded_at <= account_created_at + 30 days) / COUNT(free_tier_signups) * 100
```

Current state: Billing infrastructure exists per BETA_LAUNCH_PLAN.md.
Target: >5% at 30 days (industry range: 2-5% for self-serve SaaS).
Baseline: TBD — establish in first 30 days of beta.
Why it matters: Conversion rate is a downstream output of activation and retention quality. If activation rate is above 30% and return rate is above 25%, conversion will follow. If conversion is below 2% despite good activation, the gating logic or pricing is the problem — not the product.

Decompose by trigger:
- Recording limit reached (5th workflow ceiling hit)
- Export format gate (tried to access non-JSON export)
- Process map gate (if applicable)
- User-initiated (upgraded without hitting a gate)

User-initiated upgrades are the highest-quality conversion signal — they indicate perceived value, not friction with a limit.

---

**RV2. Upgrade Trigger Distribution**

Definition: For every paid plan upgrade, the event that immediately preceded the upgrade decision.

Formula: Event log analysis — which event fired within the same session as `subscription_upgraded`.

Current state: Requires instrumentation of upgrade trigger event with a `trigger_type` property.
Target: No volume target. This is a diagnostic metric. If >70% of upgrades are triggered by hitting the recording limit, the free tier is too restrictive. If <10% are triggered by a gate, users are self-qualifying — which is a strong PMF signal.
Why it matters: The upgrade trigger tells you whether users are converting because of the product's value or because of friction. These require opposite responses.

---

**RV3. Monthly Recurring Revenue Retention (Net MRR Retention)**

Definition: For a given cohort of paying users, the percentage of their MRR that is retained 30, 60, and 90 days later (including expansions, excluding new users).

Formula:
```
Net MRR Retention = (MRR from cohort at day N) / (MRR from cohort at day 0) * 100
```

Where day 0 is the month the user first paid.

Current state: Not instrumented (insufficient paying users during beta).
Target: >90% at 30 days. >80% at 90 days.
When to start tracking: After 10+ paying users. Tracking before this creates noise that is not statistically interpretable.
Why it matters: Churn is the product's long-term kill variable. An activation rate of 40% with a monthly churn rate of 20% produces a leaky bucket. Net MRR retention above 100% (expansion MRR exceeds churn MRR) is the signal that Ledgerium is becoming a team product.

---

### 2.5 Referral

Referral measures how existing users bring new users to the product. Ledgerium has a structural referral advantage: the SOP output is a sharable artifact that non-users receive in the normal course of the user's job. Every shared SOP is a potential referral event.

---

**RF1. Shared SOP Conversion Rate**

Definition: Percentage of users who view a shared SOP link and subsequently create a Ledgerium account.

Formula:
```
Shared SOP Conversion Rate = COUNT(new_signups WHERE signup_source = 'shared_sop') / COUNT(unique_shared_sop_link_views) * 100
```

Requires: shared SOP links must carry a source parameter. New signups from those links must be attributed.

Current state: Shareable SOP links not yet built per GROWTH_STRATEGY.md.
Target: >10% conversion from shared SOP view to signup. This would make the shareable SOP the highest-quality acquisition channel in the system.
Why it matters: This is the PLG coefficient. A shared SOP conversion rate of 10% means every 10 SOP shares generates 1 new user. If the average activated user shares 3 SOPs per month, the viral coefficient approaches 0.3 — meaningful for a product at this stage.

---

**RF2. Organic Referral Rate**

Definition: Percentage of new signups whose acquisition source is attributed to referral (shared SOP link, colleague recommendation, or direct referral link) rather than content, outreach, or organic search.

Formula:
```
Organic Referral Rate = COUNT(signups WHERE acquisition_source IN ['shared_sop','referral_link','word_of_mouth']) / COUNT(all_signups) * 100
```

Current state: Requires acquisition source attribution at signup.
Target: >15% of signups during open beta. During direct outreach beta, this will be near 0% — that is expected.
Why it matters: A growing referral rate signals that the product's output quality is driving organic word-of-mouth. When referral rate starts climbing, it means the product is solving a problem people talk about.

---

## 3. Product Health Metrics

These metrics measure system reliability and output quality. They are operational in nature but product-owned in definition: the product team defines what "healthy" means; engineering implements the instrumentation.

Monitor daily. Alert when any metric crosses the degradation threshold.

---

### PH1. Recording Completion Rate

Definition: Percentage of recording sessions that result in a successfully uploaded, processed workflow visible in the web app.

Formula:
```
Recording Completion Rate = COUNT(recording_sessions WHERE workflow_visible_in_webapp = true) / COUNT(recording_sessions WHERE recording_started = true) * 100
```

Decompose failures by stage:
- Recording started but not stopped (user abandoned)
- Recording stopped but upload failed (sync error)
- Upload succeeded but processing failed (engine error)
- Processing succeeded but workflow not visible (UI/API error)

Current state: Defined in SUCCESS_METRICS.md as core metric.
Target: >95% (any value below 90% is a critical incident — users are losing recordings).
Alert threshold: Drop below 90% in any 24-hour window.

---

### PH2. SOP Generation Success Rate

Definition: Percentage of uploaded workflows that successfully produce an SOP output accessible in the web app.

Formula:
```
SOP Generation Rate = COUNT(workflows WHERE sop_generated = true AND sop_accessible = true) / COUNT(workflows WHERE upload_status = 'success') * 100
```

Current state: Not explicitly tracked separately from recording completion.
Target: >98%. SOP generation failure is a silent product failure — the user recorded a workflow but received no usable output.
Why separate from recording completion: A workflow can upload successfully but the SOP generation step can fail independently. These are different failure modes with different engineering owners.

---

### PH3. Time from Recording Stop to SOP Available

Definition: Median seconds between a user clicking "Stop Recording" in the extension and the SOP being visible in the web app.

Formula:
```
Median(sop_available_at - recording_stopped_at) in seconds
```

Current state: Not instrumented.
Target: <30 seconds (p50), <60 seconds (p95).
Why it matters: If a user stops a recording and the SOP is not visible within 60 seconds, they will navigate away and potentially miss the activation moment. Processing latency is a product experience problem, not just an engineering problem.

---

### PH4. SOP Usefulness Score

Definition: Percentage of users who respond "yes" to the post-SOP-view inline survey question: "Would you use this SOP as-is or with minor edits?"

Formula:
```
SOP Usefulness Score = COUNT(sop_usefulness_response WHERE answer = 'yes') / COUNT(sop_usefulness_response WHERE answer IN ['yes', 'no']) * 100
```

Current state: Survey not yet implemented per SUCCESS_METRICS.md.
Target: >50%. This is the most direct measure of output quality.
Why it matters: Every other metric in this framework depends on the SOP output being good enough to use. If SOP usefulness falls below 50%, the recording completion rate, activation rate, and share rate are all structurally damaged upstream. Usefulness is the quality floor.

---

### PH5. Event Capture Fidelity Rate

Definition: For recorded sessions, the percentage that contain a structurally complete event stream (no missing required fields, no schema violations, no orphaned events without parent sessions).

Formula:
```
Event Fidelity Rate = COUNT(sessions WHERE schema_valid = true AND event_count >= MIN_EVENTS_FOR_SOP) / COUNT(all_sessions) * 100
```

Where `MIN_EVENTS_FOR_SOP` is defined by the process engine team (currently the minimum event count required to produce a non-trivial SOP).

Current state: Requires validation layer in event processing pipeline.
Target: >98%.
Why it matters: A structurally invalid event stream produces a poor SOP even if the user performed the workflow correctly. This is a silent quality failure invisible to the user until they see the degraded output.

---

## 4. Tier-Specific Metrics

These metrics measure movement through the monetization funnel: Free to Starter to Team to Growth. Each conversion is a separate product decision for the user — they must experience value at the current tier before they will pay for the next.

Note: The current pricing model in GROWTH_STRATEGY.md references Free, Starter ($9, proposed), and Pro ($29). The tier naming here aligns with the 5-tier model stated in the product brief (Free, Starter, Team, Growth, Enterprise). Confirm the tier structure and update this section when the tier model is finalized.

---

### Tier: Free

**Objective:** User experiences core value within the free recording limit and self-qualifies for upgrade.

Key metrics:

| Metric | Definition | Target |
|--------|-----------|--------|
| Free-tier activation rate | % of free signups who view a real SOP | >30% |
| Free-tier recording velocity | Median days to exhaust free recording allowance | <14 days (signals the product fits recurring workflow) |
| Gate hit rate | % of free users who hit the recording ceiling | >20% (if below 20%, the free tier is too generous or users are not retained long enough to hit it) |
| Gate-to-upgrade rate | % of users who upgrade within 7 days of hitting the ceiling | >30% |

**Interpretation:** If gate hit rate is high but gate-to-upgrade rate is low, the upgrade friction or price is the problem — not the product. If gate hit rate is low, either users are not retained long enough or the free limit is too high.

---

### Tier: Starter

**Objective:** User who needed more than the free recording allowance but does not yet have team collaboration needs. Individual power user.

Key metrics:

| Metric | Definition | Target |
|--------|-----------|--------|
| Starter 30-day retention | % of Starter subscribers still active 30 days after upgrade | >80% |
| Starter recording frequency | Median recordings per month for Starter users | >5/month (justifies subscription) |
| Starter-to-Team upgrade trigger | Which event most commonly precedes a Starter-to-Team upgrade | Diagnostic — no target, monitor pattern |
| Starter churn trigger | Which event most commonly precedes cancellation | Diagnostic — monitor for "hit recording limit and lost" vs. "stopped using" |

**Interpretation:** Starter churn before 30 days indicates the user upgraded to solve a one-time need (not a recurring problem fit). Starter churn after 90 days indicates the product stopped delivering value or the user found an alternative. These require different responses.

---

### Tier: Team

**Objective:** Multiple team members are recording and sharing workflows. The product has become a team infrastructure tool, not an individual productivity tool.

Key metrics:

| Metric | Definition | Target |
|--------|-----------|--------|
| Seats activated per account | % of purchased seats where the seat holder has completed at least one recording | >60% within 30 days of team plan start |
| Cross-user workflow overlap | % of team accounts with 2+ users recording the same process type | >30% (signals the team is using Ledgerium for standardization, not just individual documentation) |
| Team SOP share rate | % of Team accounts where at least one SOP has been shared within the account | >70% within 60 days |
| Team plan expansion rate | % of Team accounts that add seats within 90 days | >20% |

**Interpretation:** Low seat activation on Team plans is a red flag — it means a manager bought the plan but their reports are not using it. This requires an onboarding intervention for team account admins, not individual users.

---

### Tier: Growth

**Objective:** The platform is embedded in team operations. Multiple departments are using it. The buyer is now a manager or executive, not an individual contributor.

Key metrics:

| Metric | Definition | Target |
|--------|-----------|--------|
| Workflow portfolio size | Median number of distinct process types documented per Growth account | >10 process types (signals breadth of adoption) |
| Department spread | % of Growth accounts with users from 2+ departments | >40% |
| Portfolio intelligence usage | % of Growth accounts that access the analytics/intelligence layer monthly | >50% |
| Annual plan rate | % of Growth accounts on annual vs. monthly billing | >50% (annual commitment signals embedded value, not trial use) |

**Interpretation:** Growth accounts that only use one department's workflows are at risk of contraction. The expansion path from Growth is depth (more recordings) and breadth (more departments). Monitor for stall patterns.

---

### Free-to-Starter Conversion Funnel (in sequence)

This is the conversion sequence to instrument as a funnel in the analytics tool:

```
1. Free signup
2. Extension installed
3. First real SOP viewed (activation)
4. Second recording completed (retention signal)
5. Recording ceiling hit
6. Upgrade prompt viewed
7. Pricing page opened
8. Starter plan selected
9. Payment completed
```

Measure drop-off at each step. The highest-value optimization is at the step with the largest absolute drop.

---

## 5. Leading vs. Lagging Indicators

This is the most operationally important section of the framework. Leading indicators predict what will happen. Lagging indicators confirm what happened. Acting on lagging indicators alone means you are always responding to problems after they have compounded.

---

### Leading Indicators

These metrics move before revenue or churn moves. Monitor weekly. Set alerts for significant shifts.

---

**L1. Sample Workflow → Real Recording Conversion Rate**

What it predicts: Activation rate 1-2 weeks ahead.

Definition: % of users who view the sample workflow and then complete a first real recording.

Why it leads: If a new user cohort views the sample workflow at normal rates but the sample-to-recording conversion drops, the install flow or the "what should I record" guidance has degraded before it shows up in the activation rate.

Monitor: Weekly, by signup cohort week.

---

**L2. Recording Completion Rate by Extension Version**

What it predicts: SOP generation rate and user frustration 3-7 days ahead.

Definition: Recording completion rate segmented by Chrome extension version.

Why it leads: A new extension release that degrades recording completion will show up in this metric before it appears in activation rate, SOP usefulness scores, or churn. Extension bugs are the most common silent killer of the user experience.

Monitor: Daily, alert on >5 percentage point drop within 24 hours of any extension version increment.

---

**L3. SOP Usefulness Score by Workflow Complexity**

What it predicts: Retention and share rate 2-4 weeks ahead.

Definition: SOP usefulness score (% "yes") segmented by workflow complexity score (the computed complexity score from the process engine, 0-100).

Why it leads: If users with high-complexity workflows (score >60) give low usefulness scores, the process engine is not handling edge cases well. These users will not return for a second recording. This predicts a retention problem before the 7-day return rate has time to reflect it.

Monitor: Weekly, track by complexity decile.

---

**L4. Extension Install-to-First-Recording Time**

What it predicts: 7-day return rate and overall activation quality.

Definition: Median minutes from extension installed event to first recording started.

Why it leads: Users who install the extension and start recording within 5 minutes are more likely to complete activation and return. Users who install and do not record for 24+ hours have a high probability of never recording. This gap identifies users who need a re-engagement nudge before they go cold.

Intervention: Trigger an in-app nudge or email at the 4-hour mark if extension is installed but no recording has started.

Monitor: Daily. Segment by acquisition channel.

---

**L5. Tab View Distribution (SOP vs. Process Map vs. Report)**

What it predicts: Which output type drives share behavior and upgrade intent.

Definition: For users who view a workflow, the distribution of time spent on the SOP tab vs. Process Map tab vs. Report tab.

Why it leads: If process map tab views are growing as a percentage of total tab views, users are discovering the process visualization output. This predicts higher share intent (the map is visual and shareable) and higher upgrade intent (team features are valuable if the map is the output you want to share). It also informs which output to lead with in activation onboarding.

Monitor: Weekly. Track as a ratio, not absolute counts, to normalize for user growth.

---

### Lagging Indicators

These metrics confirm what has already happened. They are essential for reporting, goal-setting, and retrospective analysis, but they cannot substitute for leading indicators in weekly operations.

---

**G1. Monthly Activated Users**

Definition: COUNT of users per calendar month who viewed at least one real SOP from their own recording.

Why it lags: By the time this number is calculable, the cohort that produced it has already progressed to the next phase of the funnel (or churned). It confirms whether the prior month's activation investment paid off.

Reporting cadence: Monthly.

---

**G2. Free-to-Paid Conversion Rate at 30 Days**

Definition: % of free signups from a given cohort month who converted to any paid plan within 30 days.

Why it lags: The 30-day window means you are always looking at a cohort that started a month ago. Conversion rate changes reflect decisions made 30+ days ago. Corrective action today will not show up in this metric for at least 30 days.

Reporting cadence: Monthly, by cohort.

---

**G3. Monthly Churn Rate**

Definition: % of paying users at the start of the month who cancel or downgrade by the end of the month.

Formula:
```
Monthly Churn Rate = COUNT(users WHERE subscription_cancelled_at IN current_month) / COUNT(paying_users_at_month_start) * 100
```

Why it lags: Churn is the terminal event at the end of a value-delivery failure chain. By the time a user cancels, the relevant leading indicators (recording frequency, SOP share rate, return rate) have already been declining for weeks.

Target: <5% monthly churn.
Reporting cadence: Monthly.

---

**G4. Net MRR Growth**

Definition: (New MRR + Expansion MRR) - (Churned MRR + Contraction MRR) in a calendar month.

Why it lags: MRR reflects the cumulative effect of decisions made in prior periods. A good month of MRR growth does not mean this month's work is effective — it may reflect activation work done 30-60 days ago.

Do not optimize for this metric before activation is proven. Track it as a health check, not a performance target.

Reporting cadence: Monthly.

---

**G5. Total SOPs Generated (Cumulative)**

Definition: Running total count of SOPs generated from real recordings since product launch.

Why it lags: This is a vanity metric unless decomposed by usefulness score. A large number of SOPs generated but a low usefulness score means volume without value. Track this alongside SOP usefulness score.

Why still useful: It is the one externally publishable metric ("X SOPs generated by Ledgerium users") that builds social proof. It also allows the team to verify that system throughput is growing in proportion to user growth.

Reporting cadence: Monthly for public use. Weekly internally as a system health proxy.

---

## 6. Missing Assumptions and Open Questions

The following items require resolution before the full metrics framework can be implemented. Flag these to engineering and analytics:

| # | Item | Resolution required by |
|---|------|----------------------|
| 1 | PostHog (or analytics provider) not yet connected to the backend event system. All metrics in this document require analytics instrumentation. | Before beta opens |
| 2 | The `is_sample` flag on workflows is required to distinguish sample SOP views from real SOP views. Without it, activation rate cannot be calculated accurately. | Before beta opens |
| 3 | Shared SOP links do not yet exist. The North Star Metric cannot be tracked until this feature is built. | Before open beta |
| 4 | Role + use case collection at signup is not yet implemented. ICP match rate (A1) cannot be tracked. | Before open beta |
| 5 | Upgrade trigger event with `trigger_type` property is not yet instrumented. Revenue metric RV2 cannot be tracked. | Before first paying user |
| 6 | The 5-tier naming (Free, Starter, Team, Growth, Enterprise) referenced in the product brief does not fully match the current pricing documentation. Tier names and limits must be confirmed before tier-specific metrics can be targeted. | Before pricing page goes live |
| 7 | The minimum event count required to generate a non-trivial SOP (used in PH5) is not documented. Engineering must define and publish this threshold. | Before recording completion rate reporting begins |

---

## 7. Instrumentation Priority Order

Implement analytics instrumentation in this order. Do not move to the next item until the current one is verified to fire correctly in production:

**Must have before beta:**
1. `signup_completed` — with acquisition source, role, and use case properties
2. `extension_installed` — with version and timestamp
3. `recording_started` and `recording_stopped` — with session ID
4. `workflow_uploaded` — with success/failure status and error type if failed
5. `sop_viewed` — with `is_sample` boolean and tab type (sop / process_map / report)
6. `sop_usefulness_response` — with answer (yes/no) and workflow ID
7. `subscription_upgraded` — with from_tier, to_tier, and trigger_type

**Must have before open beta:**
8. `sop_shared` — with share target type (link / email / in-app) and recipient account status (existing user / new user)
9. `recording_limit_reached` — fires when user hits the free tier ceiling
10. `upgrade_prompt_viewed` — with the user's context at time of prompt

**Must have before paid growth experiments:**
11. `shared_sop_link_viewed` — with sharer user ID, recipient session attribution
12. `signup_from_shared_sop` — links new account to originating SOP share event

---

## Appendix: Metric Quick Reference

| Metric | Type | Cadence | Owner | Current State |
|--------|------|---------|-------|--------------|
| Shared SOPs (North Star) | Product | Monthly | Product | Not instrumented |
| ICP Match Rate | Acquisition | Weekly | Growth | Not collected |
| Channel Conversion Rate | Acquisition | Weekly | Growth | Needs UTM setup |
| Real Activation Rate | Activation | Weekly | Product | Defined, not confirmed instrumented |
| Time to First Real SOP | Activation | Weekly | Product | Defined, not confirmed instrumented |
| Extension Install Rate | Activation | Daily | Product | Needs event |
| 7-Day Return Rate | Retention | Weekly | Product | Defined, not confirmed instrumented |
| 30-Day Recording Cadence | Retention | Monthly | Product | Not instrumented |
| SOP Share Rate (retained) | Retention | Monthly | Growth | Not instrumented |
| Free-to-Paid Conversion | Revenue | Monthly | Growth | Needs trigger instrumentation |
| Upgrade Trigger Distribution | Revenue | Monthly | Product | Not instrumented |
| Net MRR Retention | Revenue | Monthly | Finance | Insufficient paying users |
| Shared SOP Conversion Rate | Referral | Weekly | Growth | Feature not built |
| Organic Referral Rate | Referral | Monthly | Growth | Needs attribution |
| Recording Completion Rate | Health | Daily | Engineering | Defined, alert required |
| SOP Generation Success Rate | Health | Daily | Engineering | Not separately tracked |
| Processing Latency (p50/p95) | Health | Daily | Engineering | Not instrumented |
| SOP Usefulness Score | Health | Weekly | Product | Survey not built |
| Event Capture Fidelity | Health | Daily | Engineering | Not instrumented |
