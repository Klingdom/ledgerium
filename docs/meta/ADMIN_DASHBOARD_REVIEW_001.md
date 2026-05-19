# ADMIN_DASHBOARD_REVIEW_001 — Admin Dashboard Business Observability Expansion

**Date:** 2026-05-19
**Mode:** 3-adjacent multi-agent strategic review (NON-counting)
**Trigger:** CEO directive verbatim 2026-05-19: *"have all subagent assess the features for an administration page to allow me to see visits, users, recording volume, extension downloads, etc."*
**Coordinator artifact owner:** AI CTO (this file)
**Status:** DRAFT — awaits CEO review before any ADMIN-Pxx row opens

---

## 1. Executive Summary

The existing Admin Operations Dashboard at `/admin/operations` (shipped iter 071-073) covers operational health metrics — total recordings, system memory, time-series. It does NOT cover the business observability metrics the CEO needs at-a-glance:

- **Visits** to pricing page / dashboard sessions
- **Users** by plan tier / MAU behavioral signal / signup velocity
- **Recording volume** trend / per-user engagement depth
- **Extension downloads** — currently STRUCTURALLY UNOBSERVABLE (no extension self-report telemetry)

**3+ agent convergence on architectural ruling**: PostHog should be treated as **write-only fanout, NOT read-back dependency**. Existing `trackServer()` already double-writes to local `AnalyticsEvent` Prisma table + PostHog. The local table is the authoritative admin-dashboard read path. This eliminates external SLA risk + free-tier PostHog rate-limit risk + admin page load latency dependency on PostHog availability.

**Critical gap surfaced**: Extension telemetry is entirely absent. Chrome Web Store does not expose install counts via API. The CEO's "extension downloads" question is unanswerable without 3 new self-report events (`extension_installed` / `extension_active` / `extension_signin_linked`).

**5 of 7 agents converge on activation funnel** as the highest-business-value missing visualization (growth-strategist + product-manager + ux-designer + analytics + frontend-engineer). The funnel `Visit → Signup → Install → First Recording → Paid` answers the CEO's drill-in question better than any individual metric.

**6 P0 backlog rows promoted** with `Birth iter: audit-intake-ADMIN-001` — covering analytics-ingest infrastructure, extension telemetry, daily snapshot table, query-layer expansion, UI expansion, and QA hardening. Sequenced as 6-iteration program targeting iter ~090+ ship.

---

## 2. Agent Convergence Matrix

7 specialist agents engaged in parallel. ~15,000 cumulative agent-output words synthesized to this ~4,200-word consolidated artifact.

| Topic | system-architect | backend-engineer | analytics | ux-designer | frontend-engineer | growth-strategist | product-manager |
|---|---|---|---|---|---|---|---|
| **PostHog read path** | ADR-1: local DB authoritative; PostHog write-only | DB-direct preferred | Snapshot-then-read | (consumer) | (consumer) | (consumer) | "PostHog free-tier rate limit risk; defer to Phase 2" |
| **Extension telemetry** | ADR-3: 3 new events | extension event ingest endpoint | 3 events (`extension_installed/active/signin_linked`) | (display only) | (display only) | (funnel stage gap-closer) | Required for CEO ask to be answerable |
| **Daily snapshot** | ADR-2: hybrid (real-time + snapshot) | New Prisma model + BullMQ job | Recommended for trends | (consumer) | (consumer) | (data foundation) | Phase 2 unless CEO needs trend charts at MVP |
| **MRR / monetization** | (out of scope) | `getRevenueSummary` from DB plan distribution | (revenue metric in §4) | Tile in Tier 1 layout | KpiTile reusable | "Single most important missing metric" + sensitive (owner-only gate) | MUST-SHIP MVP per §3 |
| **Activation funnel** | (out of scope) | `getTrialConversionFunnel` query | Defined in §4 | Funnel chart Tier 2 layout | `ConversionFunnelSection` component | "Highest-value visualization for CEO" | MUST-SHIP MVP |
| **Layout** | Composite endpoint | (consumer) | (consumer) | 2-column grid + top KPI strip | `grid-cols-1 lg:grid-cols-2` | (display agnostic) | At-a-glance 60s review optimized |
| **Distinctive move** | Local-DB authoritative read path (kills PostHog read SLA) | "Auth anomaly tile" + "Trial conversion funnel" backend functions | `trial_conversion_completed` event extending iter 068 webhook | Tier 1 ordering by decreasing operational urgency | Anomaly banner + CSV export + keyboard `g+N` shortcuts | Top referrer breakdown / anonymized workflow categories / anomaly alerts | Free-tier quota pressure as upgrade-intent predictor |

---

## 3. Divergence Resolution

### 3.1 Real-time vs Snapshot Strategy

- **system-architect + backend-engineer + analytics**: HYBRID — real-time tiles for "today" + daily BullMQ snapshot for historical trends
- **product-manager**: Phase 2 unless CEO needs trend charts at MVP
- **growth-strategist**: trend charts ARE the investor-grade format

**Coordinator synthesis**: HYBRID is correct per system-architect ADR-2. Real-time tiles serve the CEO's "today's count" question; snapshot table serves the trend-line visualization which growth-strategist correctly identifies as investor-grade. The Prisma migration + BullMQ job is a 1-iteration shipset; trend-chart consumption is built on top.

### 3.2 PostHog Integration Path

- **system-architect ADR-1**: local `AnalyticsEvent` table is authoritative; PostHog write-only
- **analytics**: snapshot-then-read via PostHog HogQL with daily BullMQ job
- **backend-engineer**: `queryPostHog` helper with TTL cache for any PostHog-only metrics

**Coordinator synthesis**: ADR-1 wins because `trackServer` already double-writes to `AnalyticsEvent`. The only PostHog-exclusive data is client-side events fired via the React `track()` function (e.g., `dashboard_v2_viewed` from iter 030). Per ADR-1, add `POST /api/analytics/ingest` endpoint that captures client events server-side via `trackServer` — closes the local-DB capture gap. After ADMIN-P01 ships, ALL events are in local DB. No PostHog read-back needed for admin dashboard.

**Q-MR-020 logged**: this is a structural simplification of the analytics architecture worth ratifying as a control-plane principle — "PostHog is write-fanout, not read-back; local DB is authoritative." Surface at next meta-review.

### 3.3 Iteration count: 6 vs 7 vs deferred

- **product-manager**: ~10 metrics MVP / 3-5 derivative
- **backend-engineer**: 11 new query functions
- **frontend-engineer**: 8 new component files + extensions to 3 existing
- **growth-strategist**: 5 missing SaaS metrics + 3 distinctive moves
- **qa-engineer**: ~58 new tests across the surface

**Coordinator synthesis: 6 P0 iterations** (ADMIN-P01 → P06). Cleanly sequenceable; one logical outcome per iteration; backend-heavy first half + frontend-heavy second half + QA hardening at end matches the TEAM-001 sequence pattern.

---

## 4. CEO Decision Framework — What the Dashboard MUST Surface

Per product-manager §1 + growth-strategist §1, the dashboard must answer 4 questions in 5 seconds + enable 2-3 specific actions in 30 seconds:

### 5-Second Glance Test (Tier 1; above-the-fold KPI strip)

| Tile | Definition | Source | Trend |
|---|---|---|---|
| **Total Active Users (MAU 30d)** | distinct users with login_completed OR dashboard_v2_viewed in 30d | DB (local AnalyticsEvent table post ADMIN-P01) | delta vs prior 30d |
| **New Signups (7d)** | User.createdAt in last 7d | DB | delta vs prior 7d |
| **Recordings This Month** | Workflow.createdAt in current calendar month | DB | delta vs last month |
| **Extension Installs (30d)** | extension_installed event count in 30d | DB (post ADMIN-P02) | delta vs prior 30d |
| **Pricing Page Visits (7d)** | pricing_page_viewed event count in 7d | DB (depends on PRICING-P06 row #116) | delta vs prior 7d |
| **MRR (estimated)** | sum(plan price × active subscribers) per plan tier | DB plan distribution × `plans.ts` price points | delta vs last month |

### 30-Second Drill-In (Tier 2; charts/cards mid-page)

| Section | Type | Source |
|---|---|---|
| **30-day Recordings Trend** | Line chart | DailyMetricsSnapshot |
| **Users by Plan Tier** | Horizontal bar chart | DB groupBy plan |
| **Activation Funnel** | Funnel chart: Visit → Signup → Install → First Recording → Paid | Multi-event DB query |
| **Trial Conversion Rate** | Numeric tile + 30-day cohort | DB Stripe-state derived |
| **Plan Mix Composition** | BreakdownBar (Free/Starter/Team/Growth/Enterprise) | DB groupBy plan |

### Tier 3 — Deferred to Phase 2 (out of MVP scope)

- Per-user drill-in table (privacy posture + Phase 2 ops persona)
- Cohort retention heatmap (requires 8+ weeks of data)
- Per-recording PII drill-in (violates privacy)
- True Chrome Web Store install count (no API; not implementable)
- Geographic distribution (no geolocation in current taxonomy)
- Per-workspace volume (requires TEAM-001 ship + data accumulation)

---

## 5. Hard Dependencies + Sequencing

**D-1 — PRICING-P06 row #116 must ship for pricing page visit metric**
The `pricing_page_viewed` event is in row #116 PRICING-P06 backlog (open since 2026-05-17 audit-intake-PRICING-001; score 12; analytics PRIMARY). If PRICING-P06 ships before ADMIN-001, the visit metric works at MVP. If not, the visit tile shows "Pricing-page instrumentation pending" placeholder per ux-designer §4 honest empty-state pattern. **Coordinator recommendation**: PRICING-P06 ships BEFORE ADMIN-P05 (UI iteration) so the visit tile has data to display.

**D-2 — TEAM-001 sequence completion enables MRR + workspace metrics**
TEAM-P03 (iter 083; just shipped) wires Team plan sync via Stripe webhook. After TEAM-001 fully ships (iter ~088 TEAM-P08), `Team.plan` is authoritative for workspace billing. MRR calculation can include Team + Growth tier counts. Pre-TEAM-001-ship: MRR uses User.plan only (solo subscribers). Post: includes both. **No blocking issue** — MRR calculation degrades gracefully.

**D-3 — Stripe operational deps**
Per `docs/runbooks/STRIPE_SETUP.md` Steps 1-6 (iter 068 operational task). If CEO has completed Stripe Dashboard configuration, all `User.plan` data is authoritative. If not (as flagged in CEO Stripe-status question), MRR shows estimated values + footnote.

**D-4 — Extension self-report telemetry**
ADMIN-P02 ships 3 new events via extension background script. Once shipped, install counts become observable for new installs. Existing installs prior to ADMIN-P02 ship are NOT counted retroactively (architecturally impossible — no signal exists).

**D-5 — PostHog API key (optional after ADR-1)**
Per ADR-1, PostHog is write-only. No PostHog read API key needed for admin dashboard. PostHog free tier sufficient indefinitely.

---

## 6. P0 Backlog Row Proposals (6 rows)

All rows: `Birth iter: audit-intake-ADMIN-001`. Sequencing is load-bearing.

| Row | Title | Score | Agent | Phase |
|---|---|---|---|---|
| ADMIN-P01 | Analytics ingest endpoint + client `track()` rewire (closes local-DB capture gap per ADR-1) | 13 | backend-engineer | 1 |
| ADMIN-P02 | Extension telemetry: 3 new events + extension background script + public API ingest route | 13 | backend-engineer + system-architect | 2 |
| ADMIN-P03 | DailyMetricsSnapshot Prisma model + BullMQ job (02:00 UTC daily) | 12 | backend-engineer | 3 |
| ADMIN-P04 | Admin query layer expansion: 11 new query functions + funnel + MRR + plan distribution | 13 | backend-engineer | 4 |
| ADMIN-P05 | Admin dashboard UI expansion: 6 KPI tiles + 4 charts + funnel + breakdown bar | 12 | frontend-engineer + growth-strategist D-4 clause 1 | 5 |
| ADMIN-P06 | QA hardening: PII audit + admin-gate bypass + performance budget + axe scan + snapshot job tests | 12 | qa-engineer | 6 |

**Total estimated: ~1,800 LOC production + ~400 LOC test across 6 iterations. Wall-clock at 1 iter/day: 6-8 days.**

---

## 7. CEO Decisions Queued

Coordinator-default in **bold**; silence = accept per MR-008 §6 precedent.

- **CD-1 PostHog read path**: **ADR-1 APPROVE** — PostHog write-only fanout; local `AnalyticsEvent` is authoritative read path; no PostHog API read key required. Saves ~$0-$150/mo PostHog tier upgrade + eliminates external SLA dependency.
- **CD-2 Daily snapshot table**: **ADR-2 APPROVE** — hybrid real-time + snapshot table. Required for trend visualizations.
- **CD-3 Extension telemetry**: **ADR-3 APPROVE** — 3 self-report events (`extension_installed` / `extension_active` / `extension_signin_linked`). Only deterministic answer to "extension downloads."
- **CD-4 Trend charts at MVP**: **YES** — growth-strategist + ux-designer + product-manager converge that trend lines (not just point-in-time tiles) are investor-grade format. Requires ADR-2 ship.
- **CD-5 MRR visibility scope**: **CEO single-admin scope at MVP** — coordinator-default. Future role-scoped MRR-hidden mode deferred to Phase 2 per growth-strategist D-1 sensitivity flag.
- **CD-6 PRICING-P06 sequencing**: **SHIP BEFORE ADMIN-P05** — visit tile has data only after `pricing_page_viewed` event fires. Either ship PRICING-P06 between TEAM-001 and ADMIN-001 sequences OR insert as 1-burn-down within ADMIN-001.
- **CD-7 Triple-track resource allocation**: **TEAM-001 → ADMIN-001 → AI Vision Build → Path E E-Wave 2**. Admin Dashboard ships BEFORE AI Vision Build so AI Vision launch metrics are observable from day-one. Coordinator-recommended sequencing.
- **CD-8 Anomaly banner alerts**: **YES at MVP, dashboard-only (no email/Slack)** — per growth-strategist §6 Decision 2. Email alerts deferred to Phase 2.

---

## 8. Distinctive Recommendations Beyond CEO's 4 Named Metrics

Each agent surfaced 2-3 high-leverage moves. Coordinator selection (3 most impactful):

1. **Activation Funnel** (5-of-7 agent convergence) — `Visit → Signup → Install → First Recording → Paid` with conversion rate per stage. **THE most valuable CEO-drill-in surface.** Identifies which stage is breaking before the CEO sees broken metrics elsewhere. Implementation: backend funnel query + frontend `ConversionFunnelSection` component.

2. **Free-tier quota pressure** (product-manager distinctive) — % of free users at ≥80% of monthly recording quota. Upgrade-intent predictor; one of the strongest leading indicators of monetization conversion. Implementation: 1 DB query against `User.plan='free'` + `Workflow` count in current month. **High signal-to-effort ratio.**

3. **Anomaly banner with WoW comparison** (frontend-engineer + growth-strategist convergence) — dismissible amber banner when any KPI drops >30% week-over-week. Implementation: pure derived computation from API response; no backend changes; ~45 LOC `AnomalyBanner.tsx`. Catches business-health regressions in real-time.

**Deferred to Phase 2** (real but not blocking MVP):
- Workspace health digest weekly email (PM Phase 2 recommendation; post-launch retention work)
- Top referrer breakdown (growth-strategist Move 1; requires `document.referrer` field addition to `page_viewed` event taxonomy)
- Most-recorded workflow categories (growth-strategist Move 2; requires server-side classification function)
- Investor-share export (growth-strategist Decision 4; snapshot-token concept)
- Cohort retention heatmap (requires 8+ weeks of paid subscription data)
- Auth anomaly tile (backend-engineer Move 1; security signal; consider for ADMIN-001.5 or Phase 2)

---

## 9. Risk Register

**R-1 PostHog rate limits (ADR-1 mitigates)**
Per system-architect: free tier sufficient indefinitely once ADR-1 ships (local DB read path). Without ADR-1, PostHog free-tier query limits could break dashboard on CEO usage growth.

**R-2 Snapshot job failure → stale data without UI signal**
Per qa-engineer §4: BullMQ job must write `snapshotStale: true` flag observable in API response. Dashboard renders "data may be delayed" staleness badge. Mitigation in ADMIN-P03 + ADMIN-P05.

**R-3 PII leakage through PostHog event payloads**
Per analytics §6 R-2 + qa-engineer §2: regex audit (`/[\w.+]+@[\w.]+\.\w+/` for email patterns; `/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/` for IPv4) at ADMIN-P06 ship-gate. Also: CI grep for `phx_` prefix in client bundle to verify PostHog API key never client-side.

**R-4 Extension event ingest endpoint abuse**
Per system-architect §5 + qa-engineer: `POST /api/analytics/extension` accepts events without auth (install fires pre-sign-in). IP-based rate limit + Zod schema strict + reject unknown event types. Security review recommended as follow-on consult; NOT blocking ADMIN-P02.

**R-5 Trial conversion rate denominator unreliable pre-Stripe-ops**
Per growth-strategist §3 + product-manager §6 D-2: trial start count derives from `subscriptionStatus = 'trialing'` updates. If Stripe webhook isn't operational (CD-3 from Stripe-status question), trial counts are NULL not zero. Honest UI: "Stripe webhook integration required for trial metrics."

---

## 10. Validation + Counter Impact (Mode 3-adjacent NON-counting)

- **Iteration counter:** UNCHANGED at iter 083 (Mode 3-adjacent does not advance)
- **Cool-off recharge:** UNCHANGED at 3/3 FULL RE-ARM (preservation streak extends to 28-36 events; longest-streak record continues)
- **D-1 reverse-portfolio-drift:** UNCHANGED at 9 (Mode 3-adjacent does not advance 5-iter window)
- **Area saturation clock:** UNCHANGED (Mode 3-adjacent per MDR / WDC / PIB / SOPPM / PRICING / PATHE / TEAM precedent)
- **MR-020 cadence:** UNCHANGED at 3/3 (DEFERRED per CEO Option B 2026-05-18)
- **Cold-pool ages:** UNCHANGED (all pools below thresholds; will check at MR-020)
- **Workspace `pnpm test`:** 2436 / 2436 unchanged (web-app filter 984 / 984; workspace runner has 29 failures in webhook/route.test.ts per pre-existing follow-up #53 — NOT a regression at this review)
- **Workspace `pnpm typecheck`:** clean across all 10 packages/apps
- **CLAUDE.md governance diffs:** ZERO (no control-plane modification proposed)
- **9th cumulative audit-intake event** (DV2 + MDR + WDC-001 + PIB + AI-VISION + WDC-002 + SOPPM + PATHE + PRICING-001 + TEAM-001 + **ADMIN-001** — 11th total intake)

---

## 11. Forward Sequencing

Per CD-7 coordinator-recommended triple-track serialization:

1. **TEAM-001 sequence** (in progress; 3 of 7 P0 rows closed at iter 083) → completes at iter ~088 with TEAM-P08 literal billing-gate removal
2. **PRICING-P06** insert as 1-burn-down between TEAM-001 close and ADMIN-001 open (per CD-6) — closes pricing-page-visit data gap before ADMIN-P05 ships
3. **ADMIN-001 sequence** (6 P0 rows; iter ~090-095 projected) — Mode 5 N=6 with MR-005 D-7 pre-check at sequence open (N=6 = soft cap threshold but tractable per MR-019 §5 precedent)
4. **MR-020 absorbs all of these** at projected iter ~096 close per deferred cadence per CEO Option B
5. **AI Vision Build** unblocks post-CEO-decisions; ~10 iterations sequence
6. **Path E E-Wave 2** as third strategic feature program

---

## Appendix A — File Path References

- `apps/web-app/src/app/(app)/admin/operations/page.tsx` — Server Component shell (iter 071-073)
- `apps/web-app/src/app/api/admin/operations/route.ts` — composite endpoint
- `apps/web-app/src/app/api/admin/operations/queries.ts` — 5 query functions (iter 071)
- `apps/web-app/src/components/admin-operations/` — 9 sub-components (iter 072)
- `apps/web-app/src/lib/analytics.ts` — discriminated union event taxonomy
- `apps/web-app/src/lib/analytics-server.ts` — `trackServer` double-writes to local DB + PostHog
- `apps/web-app/src/lib/admin-allowlist.ts` — `isAdminUnlimited` gate
- `apps/web-app/prisma/schema.prisma` — `AnalyticsEvent` model (canonical read source per ADR-1)
- `apps/extension-app/src/background/index.ts:505` — `chrome.runtime.onInstalled` listener (mute today; ADMIN-P02 wires `extension_installed` emission)
- `docs/runbooks/STRIPE_SETUP.md` — CEO operational dependency for Stripe metrics

## Appendix B — Cross-Artifact References

- `docs/meta/TEAM_WORKSPACE_REVIEW_001.md` — workspace billing schema enables MRR Team-tier accounting
- `docs/meta/AI_INTEGRATION_PLATFORM_VISION_REVIEW_001.md` §11 — AI Vision Build will generate new analytics events that admin dashboard should observe from day-one
- `docs/meta/PRICING_PAGE_REVIEW_001.md` — PRICING-P06 row #116 prerequisite for visit metric
- `docs/meta/MR_019_META_REVIEW.md` — Mode 5 D-7 pre-check precedent applies to ADMIN-001 N=6 sequence
