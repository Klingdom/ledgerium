# Ledgerium AI -- Current State Product Recommendations

**Date:** 2026-04-09
**Basis:** Codebase review only (CLAUDE.md, project-plan.md, web-app source, Prisma schema)

---

## Scorecard Summary

| Dimension | Score (1-5) |
|-----------|-------------|
| Problem clarity | 4 |
| ICP clarity | 3 |
| MVP clarity | 3 |
| Scope discipline | 2 |
| Success metric clarity | 1 |

**Overall product readiness for beta: Not ready.**
The problem is well-defined and the engineering foundation is strong, but the product has expanded horizontally (process intelligence, teams, billing, analytics) before the vertical core experience (record -> view -> export) is complete and reliable.

---

## Prioritized Recommendations

### Priority 1: Freeze scope and finish the core loop

**Rationale:** The project plan explicitly warns against this failure mode: "The common failure mode in products like this is jumping to analytics or AI narrative layers before capture and structure are trustworthy." The codebase is currently exhibiting this exact pattern. Phase 3-4 features are being built while Phase 1 exit criteria are unmet.

**Actions:**
1. Stop building new dashboard components, insights, command center features, and process intelligence UI until Phase 1 exit criteria are met.
2. Complete extension reliability work listed in CLAUDE.md: session recovery, full event persistence, E2E tests.
3. Build or verify the extension-to-web-app upload bridge (auto-sync or one-click upload). This is the single highest-impact gap.
4. Verify SOP and process map renderers produce usable output for a single recording.
5. Create the `/install-extension` page with clear instructions (even if the extension is sideloaded for beta).

**Expected outcome:** A user can sign up, install the extension, record a workflow, see it appear in the web app, and read a generated SOP -- all in under 10 minutes with no manual JSON export step.

---

### Priority 2: Pick one ICP and orient the beta around it

**Rationale:** Four ICPs (operations, sales enablement, training, compliance) require four different onboarding flows, value propositions, and success metrics. For a beta with limited users and feedback bandwidth, focus on one.

**Recommended primary ICP:** Operations team leads who maintain SOPs for browser-based internal tools (ERP, CRM, ticketing, HR systems).

**Why this ICP:**
- Highest pain: they maintain SOPs that go stale fastest
- Clearest activation signal: "I recorded a workflow and the SOP output was usable"
- Most natural expansion path: one team lead -> their team -> adjacent teams
- Aligns with the "evidence over opinion" positioning

**Actions:**
1. Rewrite the demo page to show one concrete example: recording an expense report workflow in a specific tool and getting a usable SOP.
2. Add one real screenshot or screen recording to the demo page (currently all visual placeholders are empty gray boxes with icons).
3. Adjust homepage copy to speak to this persona specifically in the hero, then broaden in later sections.

---

### Priority 3: Define success metrics before launching beta

**Rationale:** There is zero visibility into whether the product is working. The AnalyticsEvent model exists but has no defined event taxonomy or targets. Without metrics, beta feedback will be anecdotal and unactionable.

**Recommended metrics:**

| Metric | Definition | Target |
|--------|-----------|--------|
| Activation rate | % of signups who complete one full recording + view SOP | >30% |
| Time to first value | Minutes from signup to viewing first SOP | <15 min |
| Recording completion rate | % of started recordings that produce a valid workflow | >80% |
| SOP usefulness (survey) | "Would you use this SOP as-is or with minor edits?" | >50% "yes" |
| Return rate | % of activated users who record a second workflow within 7 days | >25% |
| Upload success rate | % of upload attempts that succeed without error | >95% |

**Actions:**
1. Define the event taxonomy for the AnalyticsEvent model (page_viewed, recording_started, recording_completed, upload_attempted, upload_succeeded, sop_viewed, sop_exported, etc.).
2. Build a simple admin dashboard or database query to track these metrics from day one of beta.
3. Add the "SOP usefulness" survey prompt to the workflow detail page after first SOP view.

---

### Priority 4: Reduce the data model to what the MVP needs

**Rationale:** The Prisma schema contains 15 models. The core MVP needs approximately 6 (User, Upload, Workflow, WorkflowArtifact, ApiKey, and possibly Tag). The remaining 9 models (ProcessFamily, ProcessDefinition, ProcessVariantRecord, CanonicalComponentRecord, GroupRelationship, ProcessInsight, Team, TeamMember, TeamInvite, WorkflowShare, AnalyticsEvent) add migration complexity, query surface area, and cognitive overhead for a product that has not yet validated its core loop.

**Actions:**
1. Do not remove the existing models (they represent significant design work), but stop building UI and business logic against them until the core loop is validated.
2. Consider moving the Phase 3-4 models into a separate schema file or behind a feature flag to make the boundary explicit.
3. Document which models are "active for MVP" vs. "reserved for future phases."

---

### Priority 5: Fix the messaging tension

**Rationale:** The product currently serves two narratives:
- **Narrative A (documentation):** "Your SOPs are stale. Record what actually happens."
- **Narrative B (AI-readiness):** "You can't automate what you haven't observed."

Both are true, but they target different buyers with different urgency levels. Narrative A has immediate value (a usable SOP). Narrative B has speculative value (someday you'll use this for AI automation).

**Actions:**
1. Lead with Narrative A for the MVP. It has immediate, tangible value.
2. Move Narrative B to a secondary section ("Coming soon" or "Why this matters for AI") rather than mixing it into the primary value prop.
3. Remove or de-emphasize the "AI-fluid workflow layer" language from any user-facing material until Phase 5 is in scope.

---

### Priority 6: Add real visual content to marketing pages

**Rationale:** The homepage, demo page, and pricing page are well-written but contain zero screenshots, product images, or demo videos. Every visual element is an icon or a styled text block. The demo page, which is meant to show "how it works," has five empty gray placeholder boxes where product screenshots should be.

**Actions:**
1. Capture 3-5 screenshots of the actual product: extension recording, dashboard with a real workflow, SOP output, process map (if functional).
2. Replace the placeholder boxes on the demo page with real screenshots.
3. Consider a 60-second screen recording for the homepage hero area.

---

## What Not to Do

1. **Do not add more intelligence features** (insights, health scores, recommendations) until 10+ real users have completed the core loop successfully.
2. **Do not launch the Stripe billing flow** until the free tier experience is validated. Premature payment gates on a product with unvalidated core value will kill conversion.
3. **Do not build the AI assist layer** (Phase 5). The project plan correctly identifies this as the last phase. The temptation to add AI polish before the deterministic core is solid is the highest risk to the product.
4. **Do not build team features** until individual user value is proven. Teams are a distribution mechanism for value that must already exist.
5. **Do not split focus across multiple ICPs** during beta. Validate with one, expand to others after.
