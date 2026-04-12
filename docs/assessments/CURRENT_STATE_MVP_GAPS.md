# Ledgerium AI -- Current State MVP Gaps

**Date:** 2026-04-09
**Basis:** Codebase review only (CLAUDE.md, project-plan.md, web-app source, Prisma schema)

---

## 1. Promised But Not Built

These capabilities are described in the project plan or marketing pages but have no evidence of implementation in the reviewed files.

### 1.1 Extension Auto-Sync
- **Promise:** Pricing page lists "Extension auto-sync" as a Pro feature. Demo page says "Your workflow syncs to the web app."
- **Reality:** The upload page (`/upload`) accepts manual JSON file uploads via drag-and-drop. No API endpoint or extension code for automatic sync was found in the reviewed files.
- **Impact:** High. Manual JSON export + upload is the single biggest friction point in the user journey.

### 1.2 Chrome Extension Installation Flow
- **Promise:** Homepage and demo page link to `/install-extension`. Final CTA says "Install extension."
- **Reality:** GAP: no `/install-extension` page was found in the reviewed files. No evidence the extension is published to the Chrome Web Store.
- **Impact:** High. New users following the marketing CTA hit a dead end.

### 1.3 Process Map Visualization
- **Promise:** Homepage, demo page, and pricing all prominently feature "Process Maps" as a core output. The project plan specifies a deterministic SVG renderer.
- **Reality:** `WorkflowArtifact` model has `artifact_type: "process_map"` suggesting the schema supports it, but GAP: no evidence of a working process map renderer was found in the reviewed files. The demo page shows a placeholder icon instead of an actual screenshot.
- **Impact:** High. Process maps are featured as one of three core outputs on every marketing surface.

### 1.4 SOP Generation
- **Promise:** "Get a structured SOP" is step 4 of the demo flow. Pricing lists "Basic SOP generation" (Free) and "Advanced SOP generation" (Pro).
- **Reality:** `WorkflowArtifact` supports `artifact_type: "sop"`. GAP: the SOP renderer described in Phase 1.7 of the project plan was not found in the reviewed files. It is unclear whether SOP generation is functional or a stored artifact type only.
- **Impact:** High. SOPs are the primary output promised to users.

### 1.5 OAuth / Google Sign-In
- **Promise:** CLAUDE.md tech stack lists "Auth: JWT + OAuth2 (Google) (Phase 3+)."
- **Reality:** Prisma schema has `passwordHash` field, suggesting email/password auth only. No OAuth fields or provider columns exist in the User model.
- **Impact:** Low for MVP (email/password is acceptable), but noted for accuracy.

### 1.6 Deterministic Renderers (Golden-Test Quality)
- **Promise:** Project plan specifies renderers that produce identical SVG/Markdown bytes for the same input, with golden-test regression suites.
- **Reality:** GAP: no renderer packages or golden test fixtures were found in the reviewed files.
- **Impact:** Medium. The determinism promise is a core differentiator but requires these renderers to be meaningful.

---

## 2. Built But Not Connected

These features exist in the data model or UI but appear disconnected from the core user journey.

### 2.1 Process Intelligence Layer (Families, Groups, Variants)
- **Built:** ProcessFamily, ProcessDefinition (with hierarchy), ProcessVariantRecord, CanonicalComponentRecord, GroupRelationship -- a full process portfolio data model.
- **Not connected to:** The core upload flow. A user uploads a session JSON and gets a Workflow. The connection from Workflow to ProcessDefinition exists as a nullable foreign key (`processDefinitionId`), but the grouping/family assignment logic is not evident from the upload page.
- **Question:** Is process grouping triggered automatically on upload, or is it a separate batch operation?

### 2.2 Process Insights
- **Built:** ProcessInsight model with types: bottleneck, loop, redundant_step, delay, variance, drift, anomaly. Dashboard imports show insight-related UI.
- **Not connected to:** A single workflow recording. Insights require multiple runs of the same process. With a free tier of 5 recordings and no auto-sync, reaching the threshold for meaningful insights is difficult.

### 2.3 Team and Collaboration Features
- **Built:** Team, TeamMember, TeamInvite, WorkflowShare models. Enterprise pricing tier described.
- **Not connected to:** Any apparent team UI in the reviewed files. User model references teams but the dashboard reviewed does not show team-related views.

### 2.4 Stripe Billing
- **Built:** User model has `stripeCustomerId` and `stripeSubscriptionId`. UpgradeButton component exists on pricing page. Stripe price ID referenced in config.
- **Not connected to:** GAP: no evidence of Stripe webhook handlers, checkout session creation, or subscription management flows in the reviewed files. Subscription status field exists but it is unclear what updates it.

### 2.5 Tags
- **Built:** Tag and WorkflowTag models with color support.
- **Not connected to:** The dashboard import list includes Tag-related icons, suggesting some UI exists, but tags are not mentioned in any marketing material or user-facing description.

---

## 3. Missing for a Viable Beta

These are capabilities that do not exist but are necessary for a user to get repeatable value from the product.

### 3.1 Zero-Friction Onboarding
- **Missing:** A guided first-run experience. User signs up, then needs to: get an API key, install extension, record, export JSON, upload. No onboarding flow guides them through this.
- **Required for beta:** At minimum, a post-signup page that walks through extension installation and first recording.

### 3.2 Extension-to-Web Bridge
- **Missing:** Any mechanism for the extension to send recordings to the web app without manual file export/upload. This could be direct API upload from extension, or a simple clipboard/paste mechanism.
- **Required for beta:** The manual JSON export step will lose the majority of non-technical users.

### 3.3 Workflow Detail View
- **Partially present:** Dashboard shows workflow list. Individual workflow detail page was not reviewed but likely exists given the data model.
- **Required for beta:** Users need to see their workflow steps, SOP output, and evidence in a clear detail view.

### 3.4 Error Recovery and Edge Cases
- **Missing (per CLAUDE.md):** Session recovery after service worker restart, full event persistence to chrome.storage.local, E2E tests for the recording lifecycle.
- **Required for beta:** A recording that silently fails or loses data on a service worker restart will destroy trust immediately.

### 3.5 Success Metrics and Analytics Framework
- **Missing:** Any defined activation metric, retention signal, or conversion funnel. AnalyticsEvent model exists but no event taxonomy or targets.
- **Required for beta:** You cannot run a beta without knowing what "success" looks like.

---

## 4. Over-Built Relative to Core Problem

These features are sophisticated but premature given the current state of the core capture-to-output loop.

### 4.1 Process Family Hierarchy
The three-tier model (ProcessFamily -> ProcessDefinition/ExactGroup -> ProcessVariantRecord) with confidence bands, explanation JSON, intent signatures, and cross-entity relationships is a Phase 4 capability. Building and maintaining this before the basic "record -> view steps -> read SOP" loop is reliable adds complexity without user value.

### 4.2 Canonical Component Detection
CanonicalComponentRecord tracks reusable step patterns across workflows with automation opportunity scores and volatility metrics. This requires a large corpus of recordings to be meaningful. With a free tier of 5 recordings and no auto-sync, this feature cannot demonstrate value.

### 4.3 Command Center and Operational Signals
Recent commits add: health score computation, operational signal strip, insights panel, bottleneck detection, action recommendations, and process preview components. These are portfolio analytics features that require many recorded workflows to produce meaningful output. They are being built before the single-workflow experience is complete.

### 4.4 Group Relationships (Polymorphic Graph)
GroupRelationship is a polymorphic edge table connecting families, groups, variants, workflows, and components. This is a graph-database pattern implemented in SQLite. It adds query complexity and maintenance burden for a capability that requires a mature process library to be useful.

### 4.5 Detailed Pricing and Billing
Three pricing tiers with Stripe integration, upgrade flows, and limit enforcement are built. For a pre-beta product with no published extension and no auto-sync, monetization infrastructure is premature. A simple access-controlled beta would suffice.

---

## Summary: Gap Priority Matrix

| Gap | Severity | Category |
|-----|----------|----------|
| Extension auto-sync / upload bridge | Critical | Promised, not built |
| Extension install page / Chrome Web Store | Critical | Promised, not built |
| Post-signup onboarding flow | Critical | Missing for beta |
| Session recovery / recording reliability | Critical | Missing for beta |
| SOP generation (verify functional) | High | Possibly built, needs verification |
| Process map rendering (verify functional) | High | Possibly built, needs verification |
| Success metrics definition | High | Missing for beta |
| Deterministic renderers with golden tests | Medium | Promised, not built |
| Team features UI | Low | Built but disconnected |
| Stripe webhook / subscription management | Low | Built but disconnected |
