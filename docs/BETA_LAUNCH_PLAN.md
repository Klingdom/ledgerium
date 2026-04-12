# Ledgerium AI — Beta Launch Plan

**Status:** ACTIVE
**Date:** 2026-04-12
**Goal:** Launch limited beta with 5-15 users within 2 weeks

---

## Current State (as of assessment)

| Item | Status |
|------|--------|
| Core loop (record → auto-sync → view SOP) | ✅ Working |
| Extension built and functional | ✅ Done |
| Web app with SOP/workflow/report output | ✅ Done |
| Signup/login/onboarding | ✅ Done |
| Sample workflow for instant time-to-value | ✅ Done |
| Pricing and billing infrastructure | ✅ Done |
| Analytics event taxonomy | ✅ Defined |
| Product screenshots on marketing pages | ❌ Placeholder boxes |
| Analytics backend connected | ❌ Not connected |
| ICP chosen | ❌ Not chosen |
| Success metrics defined | ❌ Not defined |
| Category positioning resolved | ❌ Ambiguous |

---

## Pre-Beta Checklist (Do These Before Inviting Anyone)

### Week 1: Product Polish + GTM Foundations

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| 1 | Capture 5 real product screenshots | Phil | Screenshots of: extension sidebar recording, dashboard with workflows, SOP output, process map, workflow detail page |
| 1 | Replace demo page placeholder boxes with real screenshots | Phil | Demo page has real visuals |
| 1 | Add at least 1 product image to homepage hero area | Phil | Homepage shows the product |
| 2 | Decide on positioning (see POSITIONING_DECISION.md) | Phil | One-line positioning statement committed |
| 2 | Update homepage primary persona to ops team leads | Phil | "Who uses Ledgerium" section leads with ops |
| 3 | Connect PostHog (free tier) to analytics endpoint | Phil | Events flowing to PostHog dashboard |
| 3 | Build activation funnel view in PostHog | Phil | Can see signup → install → record → SOP view |
| 4-5 | Test full activation path end-to-end 3 times | Phil | Confirmed: signup → extension install → sync config → record → view SOP all works unassisted |

### Week 2: Beta Recruitment + Launch

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| 6 | Write beta invitation email/message | Phil | Personalized outreach to 10-15 ops team leads |
| 6 | Prepare 2-minute "how to get started" video or doc | Phil | Loom or written guide covering install → first recording |
| 7-8 | Send beta invitations (5-15 users) | Phil | Invitations sent with clear expectations |
| 9-14 | Monitor activation funnel daily | Phil | Daily check: who signed up, who installed, who recorded, who viewed SOP |

---

## Beta User Criteria

**Ideal beta user:**
- Operations team lead or process owner
- Maintains SOPs for browser-based internal tools
- Team of 5-50 people
- Willing to record 2-3 real workflows and provide feedback
- Available for a 15-minute feedback call after 1 week

**Where to find them:**
- LinkedIn (search: "operations manager" + industry keywords)
- Professional communities (process improvement, ops management)
- Personal network referrals
- Indie Hackers / Product Hunt early-access communities

**What to tell them:**
> "I'm building a tool that records how browser work actually happens and generates SOPs automatically. I'm looking for ops team leads who maintain SOPs for internal tools. Would you try it for a week and tell me if the output is usable?"

---

## Beta Success Criteria

After 2-4 weeks of beta:

| Metric | Target | What it means |
|--------|--------|---------------|
| ≥ 5 users complete full activation path | Must hit | The product works for real users |
| ≥ 30% activation rate (signup → SOP view) | Healthy | Onboarding isn't losing people |
| ≥ 50% say "SOP is usable as-is or with minor edits" | Product-market fit signal | The output has real value |
| ≥ 25% record a second workflow within 7 days | Retention signal | The product is becoming a habit |
| ≥ 2 users share an SOP with a colleague | Distribution signal | The output is good enough to share |

**If all 5 are met:** Proceed to open beta.
**If 3-4 are met:** Iterate on the weak metric, then re-test.
**If < 3 are met:** Stop and diagnose — either the ICP is wrong, the output quality is insufficient, or the activation path has critical friction.

---

## What NOT to Build Before Beta

1. ❌ More intelligence features (process groups, command center, insights)
2. ❌ Team/collaboration features
3. ❌ AI-assisted features (Phase 5)
4. ❌ Additional SOP modes or workflow view modes
5. ❌ Enterprise pricing tier delivery
6. ❌ OAuth / Google sign-in (nice to have, not blocking)

The beta validates whether the core loop creates value. Everything else waits.

---

## Post-Beta Decision Tree

```
Beta results →
  All 5 metrics met?
    YES → Open beta (50-100 users) + start building integrations
    NO  → Which metric failed?
      Activation < 30%? → Fix onboarding friction
      SOP quality < 50%? → Fix output generation
      Return < 25%? → Fix second-session value
      Zero shares? → The output isn't share-worthy → biggest problem
```

---

## Reference Documents

| Document | Purpose |
|----------|---------|
| `docs/POSITIONING_DECISION.md` | Category positioning choice |
| `docs/SUCCESS_METRICS.md` | Metric definitions and targets |
| `docs/ICP_DEFINITION.md` | Primary and secondary ICP profiles |
| `docs/assessments/CURRENT_STATE_SYNTHESIS.md` | Full strategic assessment |
| `docs/assessments/CURRENT_STATE_PRIORITY_ACTIONS.md` | Prioritized action list |
