# Ledgerium AI — Tier Feature Implementation Roadmap

**Version:** 1.0
**Date:** 2026-04-13
**Status:** Active
**Owner:** Product Team
**Depends on:** PRD.md, ARCHITECTURE.md, PRICING_CONFIG (config.ts)

---

## 1. Pricing Tier Definitions

| Tier | Price | Seats | Recorders | Recordings/mo | Target |
|------|-------|-------|-----------|---------------|--------|
| **Free** | $0 | 1 | 1 | 5 | Trial users |
| **Starter** | $49/mo ($41 annual) | 1 | 1 | 15 | Operations team leads |
| **Team** | $249/mo ($207 annual) | 5 | 3 | Unlimited | Process improvement teams |
| **Growth** | $799/mo ($665 annual) | 15 | 10 | Unlimited | AI implementation leads |
| **Enterprise** | Custom | Custom | Custom | Unlimited | Compliance & scale orgs |

Source: `apps/web-app/src/lib/config.ts` → `PRICING_CONFIG`

---

## 2. Current State Audit

### What EXISTS and works:
| Feature | Location | Status |
|---------|----------|--------|
| Free recording limit (5/mo) | `api/upload/route.ts:26-35`, `api/sync/route.ts:60` | Hardcoded, not monthly-reset |
| SOP + process map generation | `packages/process-engine/src/` | Works for all users |
| Share via public link | `api/share/[token]/route.ts` | Works |
| 3 SOP templates + 3 map templates | `process-engine/src/sopTemplates.ts`, `processMapTemplates.ts` | Works, ungated |
| Intelligence engine | `packages/intelligence-engine/src/` | Fully built, NOT gated |
| Bottleneck detection | `intelligence-engine/src/bottleneckDetector.ts` | Works, ungated |
| Automation scoring | `intelligence-engine/src/automationScorer.ts` | Works, ungated |
| Variant detection | `intelligence-engine/src/variantAnalyzer.ts` | Works, ungated |
| Team model + roles | `prisma/schema.prisma` Team/TeamMember | Models exist |
| Agent composition | `packages/agent-intelligence/src/agent-composer.ts` | Code only, no API/UI |
| Cross-workflow analysis | `agent-intelligence/src/cross-workflow-analyzer.ts` | Code only, no API/UI |
| Integration risk | `agent-intelligence/src/integration-risk-analyzer.ts` | Code only, no API/UI |
| Docker deployment | `Dockerfile`, `scripts/docker-start.sh` | Works |
| Stripe integration | `lib/stripe.ts`, `api/billing/` | Only 2 tiers (free/pro) |

### What does NOT exist:
- Feature gating middleware (checking plan before serving features)
- Stripe configuration for Starter/Team/Growth price IDs
- Starter recording limit (15/mo)
- Monthly recording count reset
- Watermarked exports for Free tier
- Clean (non-watermarked) exports for paid tiers
- Basic process health scores
- JSON export endpoint
- Personal workspace concept
- Team-scoped workflows (workflows are user-scoped only)
- Shared library UI for teams
- Advanced analytics dashboard (Growth)
- BPMN XML export
- SSO (SAML/OAuth2)
- RBAC middleware enforcement
- Audit trail logging system
- Compliance export functionality
- Custom retention policies

---

## 3. Dependency Diagram

```
Phase F1: FOUNDATION
├── Plan type system + feature map
├── Feature gating middleware
├── Stripe 5-tier configuration
├── Webhook plan resolution
└── Recording limit per tier
    │
    ├──────────────────────────────┐
    ▼                              ▼
Phase F2: FREE + STARTER      Phase F3: TEAM + GROWTH
├── Watermarked exports        ├── Gate intelligence layer
├── Clean exports              ├── Team-scoped workflows
├── JSON export endpoint       ├── Shared library UI
├── Health scores              ├── Seat/recorder enforcement
└── Personal workspace         ├── Cross-workflow comparison UI
                               ├── Agent composition UI
                               ├── Integration risk UI
                               ├── Advanced analytics dashboard
                               └── BPMN XML export
                                   │
                                   ▼
                            Phase F4: ENTERPRISE
                            ├── SSO (SAML + OAuth2)
                            ├── RBAC enforcement
                            ├── Audit trail system
                            ├── Compliance exports
                            ├── Custom retention policies
                            └── Enterprise admin dashboard
```

**F2 and F3 can run in parallel after F1 completes.**
**F4 depends on F3 (team workspace must exist for enterprise features).**

---

## 4. Phase F1 — Foundation

**Priority:** CRITICAL — blocks all other phases
**Estimated effort:** Medium (3-5 days)
**Agents:** backend-engineer, system-architect

### F1.1: Plan Type System

| Field | Value |
|-------|-------|
| **Feature** | Define PlanType enum and PLAN_FEATURES constant |
| **Tier** | All |
| **Status** | Not started |
| **Dependencies** | None |
| **Effort** | S |
| **File** | `apps/web-app/src/lib/plans.ts` (new) |
| **Success criteria** | Type-safe plan definitions; legacy "pro" maps to "starter" |
| **Acceptance criteria** | - PlanType union covers all 5 tiers - PLAN_FEATURES maps each tier to limits + 19 feature flags - toPlanType() handles "pro" → "starter" migration - getPlanConfig() returns correct config for any plan - TypeScript compilation passes with strict mode |

### F1.2: Feature Gating Middleware

| Field | Value |
|-------|-------|
| **Feature** | Server-side feature access guards |
| **Tier** | All |
| **Status** | Not started |
| **Dependencies** | F1.1 |
| **Effort** | M |
| **File** | `apps/web-app/src/lib/feature-gating.ts` (new) |
| **Success criteria** | Any API route can gate access with one function call |
| **Acceptance criteria** | - requireFeature(user, feature) returns 403 with upgrade info if plan lacks feature - hasFeature(user, feature) returns boolean - checkRecordingLimit(user) counts current month uploads - buildFeatureFlags(user) returns client-consumable feature object |

### F1.3: Stripe Multi-Tier Configuration

| Field | Value |
|-------|-------|
| **Feature** | Configure Stripe for all 5 tiers with monthly + annual prices |
| **Tier** | Starter, Team, Growth |
| **Status** | Not started (only PRO_PRICE_ID exists) |
| **Dependencies** | F1.1 |
| **Effort** | M |
| **File** | `apps/web-app/src/lib/stripe.ts` (update) |
| **Success criteria** | Stripe price IDs map to correct plan types |
| **Acceptance criteria** | - STRIPE_PRICES defines monthly + annual price IDs for Starter/Team/Growth - planFromPriceId() resolves any price ID to correct PlanType - Checkout route accepts plan + interval parameters - Environment variables documented in .env.example |

### F1.4: Webhook Plan Resolution

| Field | Value |
|-------|-------|
| **Feature** | Webhook resolves plan from Stripe price ID instead of hardcoding "pro" |
| **Tier** | All paid |
| **Status** | Not started (hardcodes "pro" at webhook/route.ts:44) |
| **Dependencies** | F1.3 |
| **Effort** | S |
| **File** | `apps/web-app/src/app/api/billing/webhook/route.ts` (update) |
| **Success criteria** | Subscription events correctly set user plan to starter/team/growth |
| **Acceptance criteria** | - checkout.session.completed resolves plan from price ID - subscription.updated resolves plan from current price ID - subscription.deleted reverts to "free" - Legacy "pro" subscriptions still work |

### F1.5: Recording Limit Per Tier

| Field | Value |
|-------|-------|
| **Feature** | Enforce recording limits: Free=5, Starter=15, Team+=unlimited |
| **Tier** | Free, Starter |
| **Status** | Partial (Free=5 hardcoded, no monthly reset) |
| **Dependencies** | F1.1, F1.2 |
| **Effort** | S |
| **Files** | `api/upload/route.ts`, `api/sync/route.ts` (update) |
| **Success criteria** | Upload routes use centralized limit check with monthly count |
| **Acceptance criteria** | - Monthly upload count derived from uploads table (uploadedAt in current month) - Free users blocked at 5/month - Starter users blocked at 15/month - Team+ users never blocked - Error response includes used/limit counts |

### Phase F1 Success Metrics
- [ ] All 5 plan types compile and resolve correctly
- [ ] Feature gating returns 403 for unauthorized access attempts
- [ ] Stripe checkout works for all 3 paid tiers
- [ ] Webhook correctly sets plan for all tiers
- [ ] Recording limits enforced per tier with monthly reset
- [ ] /api/account returns correct features and limits
- [ ] Zero regressions in existing functionality

---

## 5. Phase F2 — Free + Starter Tier Completion

**Priority:** High — enables first paid conversions
**Estimated effort:** Medium (3-5 days)
**Agents:** backend-engineer, frontend-engineer
**Depends on:** Phase F1

### F2.1: Watermarked Exports (Free)

| Field | Value |
|-------|-------|
| **Feature** | Free tier exports include Ledgerium watermark/branding |
| **Tier** | Free |
| **Status** | Not started |
| **Dependencies** | F1.2 (feature gating) |
| **Effort** | S |
| **Success criteria** | Free export markdown includes watermark banner; paid does not |
| **Acceptance criteria** | - Markdown exports include "Generated by Ledgerium AI — Free Plan" header/footer for free users - JSON exports include watermark metadata field - Paid plans get clean exports without watermark - Watermark is visually distinct but not obstructive |

### F2.2: JSON Export Endpoint

| Field | Value |
|-------|-------|
| **Feature** | Export workflow as structured JSON (Starter+) |
| **Tier** | Starter+ |
| **Status** | Not started (data stored as JSON but no export endpoint) |
| **Dependencies** | F1.2 |
| **Effort** | S |
| **Success criteria** | GET /api/workflows/[id]/export-json returns complete workflow JSON |
| **Acceptance criteria** | - Returns session bundle with steps, SOP, process map, metadata - Gated to Starter+ (Free gets 403 with upgrade CTA) - Content-Disposition header for file download - Includes schema version and integrity hash |

### F2.3: Basic Process Health Scores (Starter+)

| Field | Value |
|-------|-------|
| **Feature** | Simple health score per workflow based on complexity, duration, step count |
| **Tier** | Starter+ |
| **Status** | Not started |
| **Dependencies** | F1.2 |
| **Effort** | M |
| **Success criteria** | Every workflow shows a 0-100 health score on dashboard |
| **Acceptance criteria** | - Health score computed from: step count, duration, confidence, variant count - Score displayed on workflow card in dashboard - Gated to Starter+ plans - Deterministic: same workflow always produces same score - Algorithm documented |

### F2.4: Clean Export Formatting (Starter+)

| Field | Value |
|-------|-------|
| **Feature** | Remove watermark from exports for paid plans |
| **Tier** | Starter+ |
| **Status** | Not started (coupled with F2.1) |
| **Dependencies** | F2.1, F1.2 |
| **Effort** | S |
| **Success criteria** | Paid tier exports are clean, professional format |
| **Acceptance criteria** | - No Ledgerium branding in export body - Professional headers/metadata only - Format matches marketing promise ("Clean exports") |

### F2.5: Personal Workspace (Starter+)

| Field | Value |
|-------|-------|
| **Feature** | Named workspace for organizing workflows |
| **Tier** | Starter+ |
| **Status** | Not started |
| **Dependencies** | F1.2 |
| **Effort** | M |
| **Success criteria** | Starter users see "My Workspace" with folder organization |
| **Acceptance criteria** | - Dashboard shows workspace name and organization - Portfolios serve as workspace folders - Workspace settings page (name, preferences) - Gated to Starter+ |

### Phase F2 Success Metrics
- [ ] Free exports visually distinguishable from paid exports
- [ ] JSON export endpoint functional and gated
- [ ] Health scores display on all workflow cards for Starter+
- [ ] Personal workspace renders for Starter+ users
- [ ] Free users see upgrade prompts for gated features
- [ ] Export download rate measurable via analytics

---

## 6. Phase F3 — Team + Growth Tier Completion

**Priority:** High — core revenue drivers ($249-$799/mo)
**Estimated effort:** Large (7-10 days)
**Agents:** backend-engineer, frontend-engineer, system-architect
**Depends on:** Phase F1

### F3.1: Gate Intelligence Layer (Team+)

| Field | Value |
|-------|-------|
| **Feature** | Restrict intelligence features to Team+ plans |
| **Tier** | Team+ |
| **Status** | Not started (all intelligence currently ungated) |
| **Dependencies** | F1.2 |
| **Effort** | M |
| **Success criteria** | Free/Starter users cannot access intelligence endpoints |
| **Acceptance criteria** | - Bottleneck analysis API gated to Team+ - Automation scoring API gated to Team+ - Variant detection API gated to Team+ - Dashboard hides intelligence panels for Free/Starter - Upsell CTA shown in place of gated features |

### F3.2: Team-Scoped Workflows

| Field | Value |
|-------|-------|
| **Feature** | Workflows can belong to a Team, visible to all team members |
| **Tier** | Team+ |
| **Status** | Not started (workflows are user-scoped only) |
| **Dependencies** | F1.2, existing Team model |
| **Effort** | L |
| **Success criteria** | Team members see shared workflows in their dashboard |
| **Acceptance criteria** | - Add optional teamId to Workflow model (Prisma migration) - Upload route accepts teamId parameter - Dashboard shows personal + team workflows - Team members with viewer+ role see team workflows - Existing user workflows unaffected |

### F3.3: Shared Library & Portfolio UI (Team+)

| Field | Value |
|-------|-------|
| **Feature** | Team-level shared library with portfolio organization |
| **Tier** | Team+ |
| **Status** | Partial (Portfolio model exists, no team-level UI) |
| **Dependencies** | F3.2 |
| **Effort** | M |
| **Success criteria** | Teams have a shared library page with portfolio folders |
| **Acceptance criteria** | - /team/[slug]/library page shows all team workflows - Portfolio folders organize team workflows - Team members can add/remove workflows from portfolios - Search and filter within shared library |

### F3.4: Seat & Recorder Enforcement (Team+)

| Field | Value |
|-------|-------|
| **Feature** | Enforce seat limits (Team=5, Growth=15) and recorder limits |
| **Tier** | Team, Growth |
| **Status** | Not started |
| **Dependencies** | F1.1, F3.2 |
| **Effort** | M |
| **Success criteria** | Cannot invite beyond seat limit; cannot add recorders beyond limit |
| **Acceptance criteria** | - Team invite blocked when at seat limit - Clear error message with current/max counts - Recorder count tracked (members with active API keys) - Upgrade CTA when limit reached |

### F3.5: Cross-Workflow Comparison UI (Growth+)

| Field | Value |
|-------|-------|
| **Feature** | UI for comparing workflows side-by-side with portfolio analysis |
| **Tier** | Growth+ |
| **Status** | Code exists (`cross-workflow-analyzer.ts`), no API/UI |
| **Dependencies** | F1.2, F3.1 |
| **Effort** | L |
| **Success criteria** | Growth users can compare 2+ workflows and see analysis |
| **Acceptance criteria** | - API endpoint exposes cross-workflow analysis - Comparison page with side-by-side view - Highlights differences, common patterns, efficiency gaps - Gated to Growth+ |

### F3.6: AI Agent Composition UI (Growth+)

| Field | Value |
|-------|-------|
| **Feature** | UI showing AI agent profiles generated from workflow analysis |
| **Tier** | Growth+ |
| **Status** | Code exists (`agent-composer.ts`), no API/UI |
| **Dependencies** | F1.2, F3.1 |
| **Effort** | L |
| **Success criteria** | Growth users see AI agent recommendations per workflow |
| **Acceptance criteria** | - API endpoint exposes agent composition results - Agent profile cards showing roles, tasks, skills, system access - Export agent specs as JSON - Gated to Growth+ |

### F3.7: Integration Risk Assessment UI (Growth+)

| Field | Value |
|-------|-------|
| **Feature** | UI showing integration risk analysis across 7 categories |
| **Tier** | Growth+ |
| **Status** | Code exists (`integration-risk-analyzer.ts`), no API/UI |
| **Dependencies** | F1.2, F3.1 |
| **Effort** | M |
| **Success criteria** | Growth users see risk assessment dashboard |
| **Acceptance criteria** | - API endpoint exposes risk analysis - Risk dashboard with 7 category scores - Recommendations for risk mitigation - Gated to Growth+ |

### F3.8: Advanced Analytics Dashboard (Growth+)

| Field | Value |
|-------|-------|
| **Feature** | Enhanced analytics with trends, comparisons, and insights |
| **Tier** | Growth+ |
| **Status** | Partial (basic analytics page exists) |
| **Dependencies** | F3.1, F3.5 |
| **Effort** | L |
| **Success criteria** | Growth users see advanced analytics with cross-workflow metrics |
| **Acceptance criteria** | - Time-series trends for process metrics - Team-level analytics aggregation - Process family performance comparisons - Export analytics reports - Gated to Growth+ |

### F3.9: BPMN XML Export (Growth+)

| Field | Value |
|-------|-------|
| **Feature** | Export process maps as BPMN 2.0 XML |
| **Tier** | Growth+ |
| **Status** | Not started (BPMN markdown template exists, no XML) |
| **Dependencies** | F1.2 |
| **Effort** | M |
| **Success criteria** | Export produces valid BPMN 2.0 XML importable by standard tools |
| **Acceptance criteria** | - GET /api/workflows/[id]/export-bpmn returns BPMN XML - Valid against BPMN 2.0 schema - Importable in Camunda, Signavio, or similar - Gated to Growth+ |

### Phase F3 Success Metrics
- [ ] Intelligence features return 403 for Free/Starter users
- [ ] Team workflows visible to all team members
- [ ] Shared library functional with search and filters
- [ ] Seat limits enforced on team invites
- [ ] Cross-workflow, agent composition, and risk UIs functional
- [ ] Advanced analytics dashboard live for Growth users
- [ ] BPMN export validates against standard schema

---

## 7. Phase F4 — Enterprise Tier

**Priority:** Medium — high value but high effort
**Estimated effort:** XL (15-20 days)
**Agents:** backend-engineer, frontend-engineer, system-architect, devops-engineer
**Depends on:** Phase F3

### F4.1: SSO Integration

| Field | Value |
|-------|-------|
| **Feature** | SAML 2.0 and OAuth2 SSO providers |
| **Tier** | Enterprise |
| **Status** | Not started (credentials-only auth) |
| **Dependencies** | F1.2 |
| **Effort** | XL |
| **Success criteria** | Enterprise users can log in via their identity provider |
| **Acceptance criteria** | - SAML 2.0 SP implementation - OAuth2 provider support (Okta, Azure AD, Google Workspace) - SSO configuration per team/org - JIT user provisioning - Session management compatible with SSO |

### F4.2: RBAC Enforcement

| Field | Value |
|-------|-------|
| **Feature** | Role-based access control middleware |
| **Tier** | Enterprise |
| **Status** | Partial (TeamMember roles exist, not enforced) |
| **Dependencies** | F3.2 (team-scoped data) |
| **Effort** | L |
| **Success criteria** | All routes enforce role permissions |
| **Acceptance criteria** | - Owner: full access - Admin: manage members, all workflows - Member: create/edit own, view shared - Viewer: read-only access - Role checks on all team API routes |

### F4.3: Audit Trail System

| Field | Value |
|-------|-------|
| **Feature** | Append-only audit log of all significant actions |
| **Tier** | Enterprise |
| **Status** | Not started |
| **Dependencies** | F4.2 |
| **Effort** | L |
| **Success criteria** | All user actions logged with actor, action, target, timestamp |
| **Acceptance criteria** | - AuditLog model in Prisma (append-only) - Log: auth events, data access, exports, sharing, admin actions - Audit log viewer UI for admins - Filterable by actor, action type, date range - Cannot be deleted or modified |

### F4.4: Compliance Export

| Field | Value |
|-------|-------|
| **Feature** | Export audit trail and process data for compliance purposes |
| **Tier** | Enterprise |
| **Status** | Not started |
| **Dependencies** | F4.3 |
| **Effort** | M |
| **Success criteria** | Compliance officers can export full audit trail + process records |
| **Acceptance criteria** | - Export audit log as CSV/JSON with configurable date range - Export all process records with evidence links - Include data lineage and integrity hashes - Scheduled export option (weekly/monthly) |

### F4.5: Custom Retention Policies

| Field | Value |
|-------|-------|
| **Feature** | Configurable data retention and automatic cleanup |
| **Tier** | Enterprise |
| **Status** | Not started |
| **Dependencies** | F4.3 (audit trail must log deletions) |
| **Effort** | M |
| **Success criteria** | Enterprise admins set retention periods; data auto-purged |
| **Acceptance criteria** | - RetentionPolicy model: entity type, retention days, action (archive/delete) - Admin UI for policy configuration - Background job for policy enforcement - Audit trail records all automated deletions - Default: 365 days for workflows, 90 days for analytics |

### F4.6: Enterprise Admin Dashboard

| Field | Value |
|-------|-------|
| **Feature** | Centralized admin panel for enterprise management |
| **Tier** | Enterprise |
| **Status** | Not started |
| **Dependencies** | F4.1-F4.5 |
| **Effort** | L |
| **Success criteria** | Admins manage SSO, RBAC, retention, and audit from one page |
| **Acceptance criteria** | - SSO configuration panel - Member management with role assignment - Retention policy editor - Audit log viewer - Usage analytics per team/member |

### Phase F4 Success Metrics
- [ ] SSO login functional with at least 2 providers
- [ ] RBAC enforced on all team routes
- [ ] Audit trail captures all significant events
- [ ] Compliance export generates valid reports
- [ ] Retention policies auto-execute on schedule
- [ ] Enterprise admin dashboard fully functional

---

## 8. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Stripe price ID misconfiguration** | Users charged wrong amount | Medium | Test all tiers in Stripe test mode before production |
| **Legacy "pro" users broken** | Paying customers lose access | High | toPlanType() maps "pro" → "starter"; migration tested |
| **Monthly recording reset missing** | Users blocked permanently after limit | High | Count uploads by month (uploadedAt), not cumulative uploadCount |
| **Team data leaks** | Users see other teams' workflows | Critical | Team-scoped queries always include teamId filter |
| **Feature gate bypass** | Free users access paid features | Medium | Server-side enforcement; never rely on client-only checks |
| **BPMN export invalid** | Enterprise customers can't import | Medium | Validate against BPMN 2.0 schema in tests |
| **SSO integration complexity** | Enterprise launch delayed | High | Start with one provider (Okta/Azure AD), expand later |

---

## 9. Open Assumptions

1. **Monthly reset mechanism:** uploadCount field is cumulative. Must query by date range instead. Confirm this approach before F1.5.
2. **Legacy "pro" migration:** Existing "pro" users map to "starter". Confirm this is acceptable commercially.
3. **Stripe product structure:** One product per tier vs. one product with multiple prices. Decide before F1.3.
4. **Team billing:** Does the team creator pay, or is billing per-seat? Current model: team creator's plan governs.
5. **Enterprise pricing:** Handled via manual Stripe invoices or custom checkout? Decide before F4.

---

## 10. Handoff Notes

### For System Architect
- Design FEATURE_GATING_DESIGN.md with middleware patterns and data flow
- Confirm team-scoped workflow schema change won't break existing queries

### For Backend Engineer
- Implement F1 first — all other phases depend on it
- Use existing db patterns (Prisma, NextResponse)
- Maintain deterministic behavior

### For Frontend Engineer
- After F1: implement feature-gated UI components
- Upsell pattern: show locked feature outline with upgrade CTA
- useFeatureGate() hook for conditional rendering

### For QA Engineer
- Test matrix: every feature × every plan tier
- Regression: existing workflows must not break
- Edge cases: plan upgrade mid-session, downgrade with existing data

### For Analytics
- Track: feature_gated events (which features, which users hit gates)
- Track: upgrade_prompt_shown, upgrade_clicked
- Track: export_downloaded with plan context
