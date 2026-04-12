# Ledgerium AI — Priority Actions

**Date:** 2026-04-12
**Based on:** Synthesis of Product Manager, Market Research, and Growth Strategist assessments.

---

## Top 5 Next Actions (Ordered by Impact)

### 1. FREEZE SCOPE — Finish the core loop before adding intelligence features

**What:** Stop building dashboard intelligence, process groups UI, command center, insights, and recommendation features. Return to Phase 1 exit criteria.

**Why:** The project plan explicitly warns: "The common failure mode in products like this is jumping to analytics or AI narrative layers before capture and structure are trustworthy." The codebase is exhibiting this exact pattern. 15+ schema models exist for Phase 3-4 concepts while Phase 1 items (extension E2E tests, session recovery, auto-sync) remain incomplete.

**Deliverable:** A user can sign up → install extension → record a workflow → see it appear in the web app → read the generated SOP — all in under 10 minutes with no manual JSON export step.

**Category:** Product refinement
**Effort:** 2-3 weeks
**Impact:** Critical — nothing else matters if this doesn't work

---

### 2. ADD PRODUCT VISUALS — Screenshots on every marketing page

**What:** Capture 5 real product screenshots (extension recording, dashboard, SOP output, process map, workflow detail) and replace the gray placeholder boxes on the demo page. Add at least one to the homepage hero area.

**Why:** All three assessments independently flagged this. The demo page — the page designed to show "how it works" — contains zero product visuals. Visitors cannot evaluate the product before signing up.

**Deliverable:** Demo page has real screenshots. Homepage has at least one product image. Install page shows the extension sidebar.

**Category:** GTM preparation
**Effort:** 1-2 days
**Impact:** High — lowest-effort change with highest conversion impact

---

### 3. PICK ONE ICP — Orient the beta around a single persona

**What:** Choose one primary ICP for the first beta cohort. The two strongest candidates from the assessments:

| Candidate | Strengths | Weaknesses |
|-----------|-----------|------------|
| **Ops team leads maintaining browser-workflow SOPs** | Broadest market, clearest activation signal, natural expansion path | Invites Scribe/Tango comparison |
| **Compliance analysts in regulated industries** | Highest defensibility, strongest differentiation alignment, budget availability | Narrower market, longer sales cycle |

**Recommendation:** Start with ops team leads (Candidate A) for the limited beta because they can self-serve and provide fast feedback. Position for compliance (Candidate B) as the next wedge once the core loop is validated.

**Deliverable:** One concrete workflow example on the demo page. Homepage copy adjusted to speak to the chosen persona. Sample workflow reflects their context.

**Category:** Market validation
**Effort:** 3-5 days
**Impact:** High — eliminates "who is this for?" confusion

---

### 4. DEFINE SUCCESS METRICS — Know what "working" looks like before beta

**What:** Define and instrument 6 core metrics:

| Metric | Definition | Target |
|--------|-----------|--------|
| Activation rate | % of signups who view their first SOP | > 30% |
| Time to first value | Minutes from signup to first SOP view | < 15 min |
| Recording completion | % of started recordings that produce a valid workflow | > 80% |
| SOP usefulness | "Would you use this SOP as-is?" (post-view survey) | > 50% yes |
| Return rate | % of activated users who record a 2nd workflow in 7 days | > 25% |
| Upload success | % of upload attempts that succeed | > 95% |

**Why:** Currently scored 1/5. The AnalyticsEvent model exists with a comprehensive taxonomy, but no backend is connected and no targets are defined. Beta feedback without metrics is anecdotal.

**Deliverable:** Analytics provider connected (PostHog recommended). 6 metrics tracked from day 1 of beta. Simple admin view or query to monitor them.

**Category:** Product refinement + GTM preparation
**Effort:** 3-5 days
**Impact:** High — can't run a beta without knowing if it's working

---

### 5. RESOLVE THE CATEGORY QUESTION — Decide how to position against Scribe/Tango

**What:** Make an explicit strategic decision:

| Option A: Lean into documentation | Option B: Lean into evidence/compliance |
|---|---|
| Compete on SOP quality and speed | Compete on trustworthiness and auditability |
| Broader market, more competitors | Narrower market, fewer competitors |
| Need to add visual output eventually | Can lead with structured data as the product |
| Message: "Better SOPs, faster" | Message: "Process evidence you can audit" |

**Why:** Currently, the messaging sounds like Scribe/Tango but the product is structurally different. This invites an unfavorable comparison. Resolving this determines homepage copy, demo content, pricing positioning, and feature priorities.

**Deliverable:** A one-page positioning document that states: "We are a [category] for [persona] who need [outcome]. We are not [anti-positioning]."

**Category:** Market validation
**Effort:** 1 day (decision), 3-5 days (implementation)
**Impact:** High — determines all downstream messaging and feature priorities

---

## Recommended Next Phase

**Phase recommendation: Product Refinement + GTM Preparation (parallel)**

The product has strong engineering but has expanded beyond what the core loop justifies. The marketing has strong messaging but no visual proof. The recommended next phase runs two workstreams in parallel:

**Workstream A: Product Refinement (2-3 weeks)**
1. Freeze scope to Phase 1
2. Verify extension → web app sync works end-to-end
3. Verify SOP and process map output quality with 5 real recordings
4. Connect analytics backend
5. Define and instrument success metrics

**Workstream B: GTM Preparation (1-2 weeks)**
1. Add product screenshots to all marketing pages
2. Pick one ICP and adjust demo page
3. Resolve the Scribe/Tango positioning question
4. Prepare 5-10 beta user invitations with clear expectations
5. Surface the "60 seconds to first SOP" claim prominently

**Exit criteria for this phase:**
- [ ] A non-technical user can complete the full loop (signup → install → record → view SOP) unassisted
- [ ] 6 success metrics are instrumented and collecting data
- [ ] Demo page has real product screenshots
- [ ] One ICP is explicitly prioritized
- [ ] 5+ beta users invited with specific activation targets

**After this phase:** Launch limited beta (5-15 users), collect metrics for 2-4 weeks, then decide whether to expand to open beta or iterate on core experience.
