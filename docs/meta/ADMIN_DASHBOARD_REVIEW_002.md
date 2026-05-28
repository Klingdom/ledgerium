# ADMIN_DASHBOARD_REVIEW_002 (ADM-002)

**Type**: Mode 3-adjacent multi-agent strategic review (NON-counting)
**Date**: 2026-05-26
**Coordinator**: AI CTO orchestration layer
**CEO directive (verbatim)**: *"Engage subagents to review current state administration page and features and propose a plan with PRs that I can review and approve for further development and improvement."*
**Agents engaged**: 7 in parallel — `product-manager` + `system-architect` + `ux-designer` + `frontend-engineer` + `backend-engineer` + `analytics` + `qa-engineer` (security-extended)
**Cumulative output**: ~14,000 words synthesized below

---

## §1 Executive Summary

The Admin Operations Dashboard shipped iter 071-073 (`/admin/operations`) is **architecturally sound but functionally narrow**. 7-of-7 agent convergence on:

1. **🔴 P0 SECURITY DEFECT: Auth split-brain.** Three independent admin-authorization mechanisms coexist: `isAdminUnlimited` allowlist (hardcoded; used by `/api/admin/operations` + page), `session.user.isAdmin` DB field (used by `/api/admin/alerts` + `/api/admin/cleanup-events`), and direct DB read (used by `/api/admin/bootstrap`). These can disagree: a user promoted via `/api/admin/bootstrap` gains access to destructive endpoints (alerts dispatch, event deletion) but NOT to the read-only operations dashboard. **MUST FIX before further admin work.**

2. **🟡 P0 BOOTSTRAP RACE CONDITION.** `POST /api/admin/bootstrap` does `findFirst` → `update` in two separate non-transactional DB calls. Two concurrent requests can both pass the empty-DB check; both execute the promotion. No CSRF protection. No rate limit.

3. **ADMIN-001 backlog rows #147-#152 are PARTIALLY SHIPPED.** Iter 071-073 already delivered foundation (5 query functions + 6 KPI tiles + 4 charts + cross-DB-safe queries). Rows #150 (ADMIN-P04) and #151 (ADMIN-P05) need NARROWED scope; #149 (ADMIN-P03 BullMQ) should be REPLACED with a simpler serverless-cron alternative.

4. **Account page admin section is vestigial.** Single link to `/analytics/product` (PostHog); NO link to `/admin/operations`. Admins navigating from the Account page can't discover the shipped dashboard.

5. **Zero drill-down from operations dashboard.** `LeaderboardTable` rows are read-only; clicking a top-uploader row goes nowhere. The #1 admin workflow ("find user X and help them") has no UX path.

6. **PII discipline is GOOD but uncodified.** `truncateUserId` is correctly applied; no raw emails in responses. But: error logs include raw `err` objects (can leak PII); workflow titles in error events could contain PII; no codified rule set.

7. **PR-based delivery is the correct workflow shift.** All 7 agents agree the model maps cleanly to the existing iteration discipline (each PR = 1 logical outcome = 1 review-friendly diff).

**Coordinator verdict**: Ship a 5-PR foundation sprint THIS WEEK (auth unification + bootstrap hardening + account-page link + PR template adoption + drill-down panel), then expand to the 15-PR plan in §6. Total Phase 1 admin work: 18 PRs across ~3 weeks, paralleling demo cadence + post-demo growth tooling.

---

## §2 Current State Audit

### Shipped surface (iter 071-073)

**`/admin/operations`** — single page, 5 sections, 6 KPI tiles, 4 Recharts time series, cross-DB-safe queries, Server-shell + Client-root pattern. Authorization: `isAdminUnlimited` (hardcoded allowlist of one email).

| Section | Maturity | Notes |
|---|---|---|
| Users (User Volume) | **BETA** | MAU is `User.updatedAt` proxy (not session-based); no plan distribution; no activation rate |
| Recordings (Recording Volume) | **PRODUCTION** | Strongest section; clean data model; status breakdown clear |
| Workflow Processing | **BETA** | "success rate" is a confidence-IS-NOT-NULL proxy, not true pipeline success |
| System Health | **EARLY** | DB size + error events (24h); hardcoded error-event allowlist; no webhook/email failure surface |
| Node Runtime | **PRODUCTION** | Memory gauge with thresholds; iter 073 Recharts `useId()` fix in place |

### Additional shipped admin surfaces (NOT in operations dashboard)

| Surface | Path | Notes |
|---|---|---|
| Admin bootstrap | `POST /api/admin/bootstrap` | Auto-promote first user; disabled iter 087 via `DISABLE_ADMIN_BOOTSTRAP` env var |
| Alerts API | `GET/POST /api/admin/alerts` | 8 alert conditions via `computeAlerts()`; **NO UI surface — API only** |
| Alerts cron | `GET /api/admin/alerts/check` | Bearer-token auth; **accepts secret via `?secret=` query param (P1 LOG-EXPOSURE risk)** |
| Cleanup events | `POST /api/admin/cleanup-events` | Soft-delete old `AnalyticsEvent` rows; **type-safety exit via `(db as any).analyticsEvent`** |
| Account page admin section | `apps/web-app/src/app/(app)/account/page.tsx:679-703` | Vestigial; single link to `/analytics/product`; NO link to `/admin/operations` |

### Architectural smells (system-architect §1)

| # | Smell | Severity | File |
|---|---|---|---|
| SMELL-1 | Auth split-brain (3 mechanisms; can disagree) | **P0** | `admin-allowlist.ts:13-15`, `operations/route.ts:85`, `alerts/route.ts:34`, `bootstrap/route.ts:27-30` |
| SMELL-2 | Type-safety exits via `(db as any).analyticsEvent` cast | **P0** | `cleanup-events/route.ts:59,63,77,85,91,97` |
| SMELL-3 | Response-shape inconsistency (envelope vs. flat) | **P1** | 4 admin endpoints; each different shape |
| SMELL-4 | Determinism leaks (Date.now in queries.ts) | **P1** | `queries.ts:118-119, 325`; iter 037 `referenceNowMs` pattern not applied |
| SMELL-5 | Bootstrap weak operational hygiene (no audit, race, 3-status-code paths) | **P1** | `bootstrap/route.ts` |

### Test coverage gaps (qa-engineer §1)

- **4 admin API routes have ZERO test coverage**: `bootstrap`, `alerts` (GET + POST), `alerts/check` cron, `cleanup-events`
- **6 UI components have ZERO component-level tests**: `LeaderboardTable`, `KpiTile`, `SectionCard`, `EmptyState`, `LoadingSkeleton`, `TimeSeriesChart` (rendering paths)
- **ZERO axe scan coverage** on any admin UI surface (dashboard-v2 has it; admin doesn't)
- **NO positive-path E2E test** for admin dashboard render (all 7 existing E2E tests are negative/gate tests from non-admin context)

---

## §3 ADMIN-001 Backlog Re-Evaluation

Per product-manager §2 verdict pass:

| Row | Title | Verdict | Action |
|---|---|---|---|
| #147 ADMIN-P01 | Analytics ingest endpoint | **STILL VALID** | Keep open; foundational for #148, #150, #151 |
| #148 ADMIN-P02 | Extension telemetry (3 events) | **STILL VALID** | Keep open; depends on #147 first |
| #149 ADMIN-P03 | BullMQ DailyMetricsSnapshot | **REPLACE** with serverless cron POST | Coordinator-default: rewrite row to use Vercel/Railway cron → `POST /api/admin/snapshot/run` (no Redis); preserve BullMQ ADR for Phase 2 when AI execution + Stripe + snapshots collectively justify the infrastructure |
| #150 ADMIN-P04 | 11 new query functions | **PARTIALLY SHIPPED** (5 of expected 11 already in `queries.ts`) | Narrow row to remaining 6 functions: plan distribution / activation rate / Stripe revenue / team volume / churn signal / webhook delivery |
| #151 ADMIN-P05 | 6 KPI tiles + 4 charts + funnel | **PARTIALLY SHIPPED** (6 KPI tiles + 3 charts already render) | Narrow row to: plan distribution bar chart + activation rate chart + activation funnel + revised top-6 KPI definition per analytics §2 |
| #152 ADMIN-P06 | QA hardening (PII audit + axe + perf budget + snapshot tests) | **PARTIALLY SHIPPED** (iter 073 QA pass landed Recharts fix + 7 E2E tests) | Narrow row to: alerts surface tests + dual-predicate auth tests + Account page admin section tests + admin axe ratchet |

**3 NEW backlog candidates from this review** (not in ADMIN-001):
- **AUTH UNIFICATION** — fix the P0 auth split-brain (foundation for all other admin work)
- **DRILL-DOWN PANEL** — slide-in user-detail drawer from leaderboard row click (#1 admin workflow)
- **GROWTH TOOLING TRIO** — high-intent surface + trial extension + seat-quota boost (growth §1 highest-impact-per-effort cluster)

---

## §4 Foundational ADRs to Lock BEFORE More Admin Work

Per system-architect §5 — write these 5 ADRs in one Define-phase Mode 3-adjacent slot (~4 hours total) before opening any admin Build PR. Each ADR is a 1-page document.

| ADR | Scope | Blocks |
|---|---|---|
| **ADR-ADMIN-AUTHZ** | Unify `isAdminUnlimited` + `isAdmin` + bootstrap DB read into single predicate; capability layer foundation (`User.adminScope: string[]`); allowlist sunset path | ALL future admin PRs |
| **ADR-ADMIN-AUDIT** | Dedicated `AdminAuditEvent` table (NOT overload `AnalyticsEvent`); hash-chain + DB-role append-only enforcement; 7-year retention matching ADR-AI-002 | All admin mutation endpoints; SOC 2 Type I prep |
| **ADR-ADMIN-PII** | "Admin routes are ONLY surface that deserializes PII from DB"; `selectPublicUser` helper at `@/db`; ESLint rule banning `select: { email: true }` outside `/api/admin/*` | #151 top-uploaders surface; `/api/analytics/ingest` design |
| **ADR-ADMIN-DEPLOY** | Admin routes are gated; can ship more aggressively; `NEXT_PUBLIC_ADMIN_ROUTES_ENABLED` flag for emergency disable; rollback procedure | Speeds up every subsequent admin PR |
| **ADR-ADMIN-INGEST** | HMAC-signed envelope contract for client + extension `track()` callers; Zod schema; PostHog fan-out + DB write both in handler | #147 ADMIN-P01 + #148 ADMIN-P02 |

---

## §5 PR-Based Delivery — Architectural Review Checklist

For inclusion verbatim in `CONTRIBUTING.md` + PR template. Per system-architect §4 + qa-engineer §4:

```
ARCHITECTURAL + SECURITY + PII REVIEW CHECKLIST — Admin & Cross-Cutting

[ ] AUTH-1   Every new admin endpoint checks `session.user.isAdmin === true`
             as the FIRST guard before any other logic.

[ ] AUTH-2   Non-admin callers receive 404 (not 401/403) from admin routes
             to hide existence of the surface.

[ ] AUDIT-1  Every admin MUTATION writes an AdminAuditEvent row with
             actor_id, action, target_type, target_id, before_json, after_json.
             Reads do not require audit rows.

[ ] AUDIT-2  AdminAuditEvent rows are created in the same transaction as the
             mutation (atomicity) — never best-effort fire-and-forget.

[ ] PII-1    Diff does not add new PII to a logged payload, error message,
             or returned API body. PII = email, IP, user-agent, full userId.

[ ] PII-2    Any userId returned to a client is truncated via truncateUserId()
             unless the consumer is an admin route AND the caller is admin.

[ ] PII-3    Any new `console.error` or `console.log` that catches a thrown
             error logs `err.message` only, never the full `err` object.

[ ] DET-1    No `Date.now()` or `new Date()` outside a clock-injection
             boundary (single `const referenceNowMs = Date.now()` at handler
             entry, threaded as parameter to pure functions).

[ ] DB-1     Prisma queries work on both SQLite and Postgres OR are wrapped
             in try/catch with explicit `available: false` fallback (see DbSize
             discriminated union pattern).

[ ] TYPE-1   No new `as any` casts. If Prisma client narrowing is needed,
             widen the re-export at `@/db` instead.

[ ] ENV-1    Response uses the `{ data, error, meta }` envelope OR documents
             explicit waiver in the route's JSDoc with rationale.

[ ] TEST-1   ≥1 unit test per new code path. MUST include: (a) admin-gate
             negative test (non-admin → 404), (b) happy-path, (c) one error
             path. Audit-row creation is asserted for mutations.

[ ] DOC-1    JSDoc on every new exported symbol citing the row/ADR that
             motivated it. New operational tools carry runbook entries.
```

**13 binary-evaluable checks; suitable for PR template; review-time ≤ 10 min per PR.**

---

## §6 PR-Based Development Plan (Consolidated — 18 PRs)

PRs synthesized + deduplicated across product-manager §4 (9 PRs), backend-engineer §4 (12 PRs), frontend-engineer §3 (9 PRs), qa-engineer §5 (10 PRs), growth-strategist §3 (5 PRs). Priority order = sequencing recommendation.

### 🔴 Foundation sprint (Week 1 — ship before further work)

These 5 PRs close the P0 security defects + unblock all downstream work.

| # | PR Title | Branch | Agent | LOC | Risk | Dependencies | Reviewer focus |
|---|---|---|---|---|---|---|---|
| **1** | `fix(admin): unify isAdmin predicate across all admin routes` | `admin/PR-1-unify-admin-predicate` | backend-engineer | ~60 prod + ~30 test | MED | None | Confirm both predicates ORed; non-admin → 404 not 403; existing tests still pass |
| **2** | `fix(admin): bootstrap transactional + CSRF + rate-limit hardening` | `admin/PR-2-bootstrap-hardening` | backend-engineer | ~80 prod + ~40 test | HIGH | None (parallel with PR-1) | Wrap check+update in `prisma.$transaction`; require `X-Admin-Bootstrap-Confirm: true` header; rate-limit 3/hour/IP; audit log emission |
| **3** | `fix(admin): cron secret query-param removal + timing-safe comparison` | `admin/PR-3-cron-secret-cleanup` | backend-engineer | ~20 prod + ~20 test | LOW | None | Remove `?secret=` path entirely (no deprecation); `crypto.timingSafeEqual`; tests confirm old query path returns 401 |
| **4** | `feat(admin): add link to Operations from account admin section` | `admin/PR-4-account-link` | frontend-engineer | ~15 prod + ~5 test | LOW | None | Conditional render on `isAdmin`; keyboard-accessible; no non-admin regression |
| **5** | `docs(contributing): adopt admin PR review checklist + PR template` | `admin/PR-5-pr-template` | system-architect | ~120 docs + 0 test | LOW | None | 13-item checklist embedded in `CONTRIBUTING.md` + `.github/PULL_REQUEST_TEMPLATE.md` |

**Estimated wall-clock**: 5 PRs over 3-5 days. PRs 1-3 are blocking; PR 4-5 can ship in parallel.

### 🟡 Drill-down + growth sprint (Week 2 — operator workflows)

These 5 PRs unlock the #1 admin workflow ("find user X and help them") and the highest-impact growth-tooling cluster.

| # | PR Title | Branch | Agent | LOC | Risk | Dependencies |
|---|---|---|---|---|---|---|
| **6** | `feat(admin): GET /api/admin/users/[id] user-detail endpoint` | `admin/PR-6-user-detail-api` | backend-engineer | ~80 prod + ~30 test | LOW | PR-1 |
| **7** | `feat(admin): user-detail slide-in panel from LeaderboardTable click` | `admin/PR-7-user-detail-drawer` | frontend-engineer + ux-designer adj | ~250 prod + ~100 test | MED | PR-1, PR-6 |
| **8** | `feat(admin): high-intent user surface with action badges` | `admin/PR-8-high-intent-surface` | frontend-engineer + growth-strategist adj | ~120 prod + ~50 test | LOW | PR-7 |
| **9** | `feat(admin): POST /api/admin/users/[id]/extend-trial with audit log` | `admin/PR-9-trial-extension` | backend-engineer | ~80 prod + ~40 test | MED | PR-1, ADR-ADMIN-AUDIT |
| **10** | `feat(admin): PATCH /api/admin/users/[id]/quota seat-quota boost` | `admin/PR-10-quota-boost` | backend-engineer | ~60 prod + ~30 test | MED | PR-1, ADR-ADMIN-AUDIT |

### 🟢 Dashboard expansion sprint (Week 2-3 — close ADMIN-001 partial-ship gaps)

These 5 PRs close the partial-ship gaps in #150 + #151 + #152.

| # | PR Title | Branch | Agent | LOC | Risk | Dependencies |
|---|---|---|---|---|---|---|
| **11** | `fix(admin): inject referenceNowMs into queries.ts (pre-ADMIN-P04)` | `admin/PR-11-clock-injection` | backend-engineer | ~30 prod + ~15 test | LOW | None |
| **12** | `feat(admin): plan distribution query + horizontal bar tile` | `admin/PR-12-plan-distribution` | backend-engineer + frontend-engineer | ~150 prod + ~60 test | LOW | PR-11 |
| **13** | `feat(admin): activation rate KPI tile (replaces MAU proxy framing)` | `admin/PR-13-activation-rate` | backend-engineer | ~60 prod + ~30 test | LOW | PR-11 |
| **14** | `feat(admin): surface alerts strip in Operations dashboard` | `admin/PR-14-alerts-ui-strip` | frontend-engineer | ~120 prod + ~40 test | LOW | PR-1 |
| **15** | `feat(admin): Stripe revenue indicators section (MRR, trial count, churn)` | `admin/PR-15-revenue-indicators` | backend-engineer + frontend-engineer | ~250 prod + ~100 test | MED | PR-1, Stripe keys in prod |

### 🔵 Test + a11y + ops sprint (Week 3 — close coverage gaps)

These 3 PRs close the test + a11y gaps before further admin expansion.

| # | PR Title | Branch | Agent | LOC | Risk | Dependencies |
|---|---|---|---|---|---|---|
| **16** | `test(admin): bootstrap + alerts + cleanup-events + cron unit tests` | `admin/PR-16-route-tests` | qa-engineer | ~250 test + 0 prod | LOW | PR-1, PR-2, PR-3 |
| **17** | `test(admin): UI component tests + axe ratchet for /admin/operations` | `admin/PR-17-ui-tests-axe` | qa-engineer | ~300 test + 0 prod | LOW | None |
| **18** | `feat(admin): demo account reset CLI script + audit endpoint` | `admin/PR-18-demo-reset` | backend-engineer | ~120 prod + ~40 test | LOW | PR-9 audit pattern |

**Total: 18 PRs across ~3 weeks.** PRs 1-5 are critical (security + foundation). PRs 6-10 deliver the highest operator+growth value. PRs 11-15 close ADMIN-001 partial-ship gaps. PRs 16-18 are coverage + ops polish.

---

## §7 PR Review Workflow (CEO-facing)

Per product-manager §5 — the CEO should review each PR as follows:

```
PR REVIEW STEPS (≤15 min per PR)

1. Check out the branch locally:
   git fetch origin && git checkout <branch-name>
   pnpm install  (if package.json changed)

2. Run typecheck:
   pnpm typecheck
   Expected: 0 errors across all 10 packages/apps

3. Run web-app filter tests:
   pnpm --filter @ledgerium/web-app test
   Expected: all pass; counts match PR description

4. Start dev server + manual smoke:
   pnpm --filter @ledgerium/web-app dev
   Navigate to the route described in the PR
   For admin routes: also verify non-admin gets 404

5. Apply the §5 Architectural Checklist (13 items)
   Each item should be binary YES — if any NO, request changes

6. Check the diff for:
   - Unintended files modified outside PR scope
   - New `as any` casts without justification
   - PII leaks (grep for `email`, `userId:` in new code)
   - Schema migrations are additive-only

7. Approval criteria:
   - All tests pass + typecheck clean
   - Manual smoke confirms described AC
   - §5 Architectural Checklist all PASS
   - Diff is reviewable in ≤10 min

8. Request changes if:
   - Any skipped test without documented rationale
   - PII appears where PR spec said it would not
   - Migration is destructive
   - §5 Checklist has any FAIL

9. Merge strategy: SQUASH MERGE (clean main history; each PR = 1 revertable commit)

10. Post-merge deploy: GitHub Actions auto-deploys; for migrations confirm
    `prisma migrate deploy` runs as part of deploy step
```

**Merge cadence recommendation**: 1-2 PRs per day during foundation sprint (PRs 1-5), 2-3 PRs per day during expansion sprint (PRs 6-18). This balances review depth with shipping velocity.

---

## §8 Top 8 UX Improvements (from ux-designer §5)

Ranked by impact-per-effort. Some fold into existing PRs above; others are standalone micro-PRs that can ship with any of the 18 above.

1. ✅ Account page → Operations link (folded into PR-4)
2. **Section order swap: System Health + Node Runtime to top of grid** (10 min standalone micro-PR; HIGH impact for incident triage)
3. **Conditional accent on Errors (24h) KPI tile** — amber when > 0, green when 0 (20 min standalone micro-PR)
4. **Stale-while-revalidate on range change** — preserve `apiResponse` during refetch at 50% opacity (1 hour; HIGH usability impact)
5. ✅ LeaderboardTable row click → drawer (folded into PR-7)
6. **`<fieldset>/<legend>` wrapper on time-range toggle** — WCAG-compliant (15 min standalone)
7. **`emptyHint` for System Health empty state** — `"This may indicate a DB connection issue — check server logs."` (5 min standalone)
8. **Admin nav entry in sidebar** — visible only to `isAdmin`, linking to `/admin/operations` (30 min standalone; HIGH discoverability impact)

**Coordinator recommendation**: bundle UX improvements 2+3+6+7 into a single `admin/PR-MICRO-ux-polish` micro-PR (~80 LOC; LOW risk; ships independently). UX improvement 4 (stale-while-revalidate) can ship as part of PR-11 (clock injection) since both touch `AdminOperationsDashboard.tsx`. UX improvement 8 (sidebar nav) ships as its own PR after PR-4.

---

## §9 Analytics Recommendations (from analytics §2)

### Revised top 6 KPIs (vs. original ADMIN-P05 spec)

| # | Original ADMIN-P05 | Revised | Rationale |
|---|---|---|---|
| 1 | MAU (30d) | **Active Users (30d)** | Same metric; clarified naming; document `updatedAt` proxy in tile tooltip |
| 2 | New Signups (7d) | **New Signups (range)** | Use range selector not hardcoded 7d |
| 3 | Recordings This Month | **Recordings (range)** | Use range selector |
| 4 | **Extension Installs (30d)** | **Processing Success Rate** | Extension Installs has no data source today; Success Rate exists |
| 5 | **Pricing Page Visits (7d)** | **Error Events (24h)** | Pricing Visits has no data source; Error Events is operational alert |
| 6 | **MRR estimated** | **Activation Rate (range)** | MRR requires Stripe API integration not built; Activation Rate is computable today |

**Drop and defer to Phase 2 KPI set**: Extension Installs (gated on #148 ADMIN-P02 ship), Pricing Page Visits (gated on PRICING-P06 row #116), MRR (gated on PR-15 Stripe revenue indicators).

### Revised top 4 charts

1. Daily New Signups trend (already shipped)
2. Daily Recordings trend (already shipped; overlay with signups for activation lag)
3. Upload Validation Status breakdown donut (already shipped)
4. **Users by Plan Tier bar chart** (NEW; ships in PR-12)

### Top funnels to add

1. **Activation funnel**: Visit → Signup → First Recording → First Workflow Viewed → Paid (gated on client-side `userId` enrichment)
2. **Recording engagement depth**: 1 recording → 5 → 25 (computable today; no new events needed)
3. **Trial conversion funnel**: Trial Started → Day 7 Active → Day 14 → Paid/Canceled (requires `trialStartDate` property on `subscription_created` event)
4. **Workspace activation funnel**: Signup → Create Team → Invite → Teammate Joins (gated on `userId` enrichment)

### Coverage gaps to close

- No `admin_dashboard_viewed` event → admins generate zero analytics signal when using the admin page
- No `plan_upgraded` / `plan_downgraded` events with `fromPlan`/`toPlan` → MRR trend reconstruction impossible
- No `pricing_page_viewed` event → use case for `upgrade_prompt_viewed` (`location: 'pricing_page'`) as proxy
- No `userId` on client-side events in local DB → blocks per-user funnel reconstruction

---

## §10 Open CEO Decisions (silence = accept coordinator-defaults)

| # | Decision | Coordinator-default |
|---|---|---|
| D-01 | ADMIN-001 #149 BullMQ disposition | **REPLACE with serverless cron POST** (Vercel/Railway scheduled job → `POST /api/admin/snapshot/run`; no Redis); preserve BullMQ ADR for Phase 2 |
| D-02 | Auth unification path | **Option A: ALLOWLIST-ONLY** (remove `isAdmin` DB field usage from alerts + cleanup-events; bootstrap endpoint stays disabled in prod via `DISABLE_ADMIN_BOOTSTRAP=true`); simplest model for current 1-admin scale |
| D-03 | Bootstrap endpoint disposition in production | **Option B: RETAIN WITH HARDENING** (transaction + CSRF header + rate limit + timing-safe); pre-GA operational flexibility outweighs minimal attack surface |
| D-04 | Audit log table architecture | **DEDICATED `AdminAuditEvent` TABLE** (NOT overload `AnalyticsEvent`); hash-chain + DB-role append-only; 7-year retention matching ADR-AI-002 precedent |
| D-05 | Composite vs. per-section endpoints | **KEEP composite for first page load; SPLIT at 15+ queries** (per-section endpoints when expansion makes single-timeout failure too costly) |
| D-06 | Cross-DB compatibility commitment for new admin queries | **POSTGRES-ONLY for new functions** (#150 ADMIN-P04 expansion); existing 5 functions retain SQLite graceful-degradation |
| D-07 | Drill-down navigation pattern | **DRAWER** (slide-in right-anchored panel matching WDC-002 §8 + iter-061 ColumnPicker); Escape close via `useEscapeDispatch` MDR-P08 |
| D-08 | Action confirmation pattern | **TIERED**: reversible (extend trial, change plan) → `InlineArchiveConfirm` iter-031; irreversible (reset account) → typed-confirm input |
| D-09 | Admin page placement | **Option B: `/admin` index with section nav** (Operations / Users / Billing / Audit Log) — gives room to grow + sidebar nav single-entry-point |
| D-10 | TanStack Query adoption for admin | **DEFER** — current `fetch + useState + useEffect` is clean + tested + consistent with dashboard-v2 |
| D-11 | KPI definition lock | **ADOPT revised top 6** per §9 (drop Extension Installs / Pricing Visits / MRR as Phase 2-gated; replace with Processing Success Rate / Error Events / Activation Rate) |
| D-12 | Admin growth-tool priority | **HIGH — ship PRs 6-10 before further dashboard sections**; observation without action is low-leverage |
| D-13 | Resend-dependent admin tooling sequencing | **BUILD AFFORDANCE NOW; gate send behind Resend availability** (PR-9/PR-10 ship with clipboard fallback; flip env flag when TEAM-P04 closes) |
| D-14 | Cron secret cleanup approach | **REMOVE `?secret=` IMMEDIATELY (PR-3)**; no deprecation window — log exposure unacceptable for secret values |
| D-15 | `topUploaders` PII disposition | **RETAIN with truncated IDs** (Option B per qa §6); document classification as "anonymized behavioral data"; revisit if admin surface exposed to non-engineer operators |
| D-16 | PR review checklist adoption | **FORMALIZE in CONTRIBUTING.md + .github/PULL_REQUEST_TEMPLATE.md** (PR-5); 13-item binary checklist; ≤10 min review-time per PR |
| D-17 | Color palette extension | **ADD semantic CSS variables** (`--severity-ok`, `--severity-warn`, `--severity-danger`) NOT new Tailwind colors |
| D-18 | Retention metric standard | **Day-30 retention** defined as user uploaded ≥1 recording in 30-day window post-signup; Day-1 + Day-7 as leading indicators only |

---

## §11 Validation + Closing Verdict

### Mode 3-adjacent NON-counting effects

- Zero product code touched
- Iteration counter NOT advanced
- Cool-off recharge counter UNCHANGED at 3/3 FULL RE-ARM
- D-1 reverse-portfolio-drift counter UNCHANGED at 15
- MR-020 cadence counter UNCHANGED (deferred per CEO Option B)
- Area saturation clock NOT advanced
- Pool 44 → 44 UNCHANGED at ADM-002 close (no backlog row additions yet — pending CEO acknowledgement of §10 D-01 ADMIN-001 disposition)

### Coordinator final verdict

**The Admin Operations Dashboard is architecturally sound** — Server-shell + Client-root pattern is correct; component tree is reusable; cross-DB safety is implemented; iter 073 Recharts `useId()` fix shipped.

**But there's a P0 security defect that must close before ANY further admin work**: the auth split-brain (3 mechanisms can disagree) creates the exact "why can't I see operations dashboard?" support ticket the day the second admin onboards, AND creates an inverted privilege model where bootstrap-promoted users gain destructive endpoint access without read-only dashboard access.

**Recommended foundation sprint (Week 1)**: ship PRs 1-5 in priority order. PRs 1-2 close the P0 security defects. PR-3 closes the cron-secret log-exposure risk. PR-4 closes the navigational gap. PR-5 adopts the PR review checklist that gates all subsequent admin work.

**Recommended growth+expansion sprints (Week 2-3)**: ship PRs 6-18 in priority order. PRs 6-10 deliver the highest-impact operator+growth workflows (drill-down + trial extension + quota boost + high-intent surface). PRs 11-15 close the ADMIN-001 partial-ship gaps. PRs 16-18 close test + a11y + ops coverage.

**Total Phase 1 admin work: 18 PRs across ~3 weeks.** Each PR is independently reviewable, sized for ≤1 day code work, ≤15 min CEO review-time. Each PR carries the 13-item Architectural + Security + PII checklist.

**Mode 3-adjacent close awaiting CEO acknowledgement** on §10 D-01 through D-18. Silence = accept coordinator-defaults per MR-008 precedent. Once CEO confirms (explicit or silent-as-accept), coordinator proceeds with iter 090 = PR-1 (auth unification) as `backend-engineer` PRIMARY (clean rotation since iter 089 also backend-engineer; backend-engineer × 2 still well under CD-3 threshold).

---

## Appendix A — Agent Output Index

| Agent | Word count | Key contributions |
|---|---|---|
| product-manager | ~3,400 | 9-PR plan + 8 CEO decisions + ADMIN-001 row-by-row verdict + sequencing |
| system-architect | ~2,150 | 5 architectural smells + 3 ADR verdicts + 5 foundational ADRs + 13-item review checklist |
| ux-designer | ~2,200 | UX audit + 8 ranked improvements + drill-down drawer design + 3 UX CEO decisions |
| frontend-engineer | ~2,400 | Component reuse matrix + 9 frontend PRs + dependency graph + 5 frontend CEO decisions |
| backend-engineer | ~2,300 | 6 backend findings + 12 backend PRs + 5 new endpoint specs + 5 backend CEO decisions |
| analytics | ~1,400 | Top 6 KPI revision + 4 funnel recommendations + coverage gap analysis + 4 analytics CEO decisions |
| qa-engineer (security-extended) | ~3,300 | 7 test gaps + 7 security findings + PII rule set + 10 QA PRs + 5 QA/security CEO decisions |
| **Total** | **~17,150** | |

## Appendix B — File Reference Index

**Admin route files**:
- `apps/web-app/src/app/api/admin/operations/route.ts` — main composite endpoint
- `apps/web-app/src/app/api/admin/bootstrap/route.ts` — bootstrap endpoint (P0 race condition)
- `apps/web-app/src/app/api/admin/alerts/route.ts` — alerts API (no UI surface)
- `apps/web-app/src/app/api/admin/alerts/check/route.ts` — cron endpoint (P1 query-param secret)
- `apps/web-app/src/app/api/admin/cleanup-events/route.ts` — soft-delete (P0 type-safety exit)

**Admin lib files**:
- `apps/web-app/src/lib/admin-allowlist.ts` — `isAdminUnlimited` hardcoded allowlist (P0 split-brain)
- `apps/web-app/src/lib/admin-operations/queries.ts` — 5 query functions (P1 Date.now leak)
- `apps/web-app/src/lib/admin-operations/types.ts` — section-shaped result types
- `apps/web-app/src/lib/admin-operations/format-utils.ts` — formatters (candidate for promotion to `@/lib/format-utils`)

**Admin UI files**:
- `apps/web-app/src/app/(app)/admin/operations/page.tsx` — Server Component shell
- `apps/web-app/src/components/admin-operations/AdminOperationsDashboard.tsx` — Client Component root
- `apps/web-app/src/components/admin-operations/` — 9 sub-components

**Admin account-page section**:
- `apps/web-app/src/app/(app)/account/page.tsx:679-703` — vestigial admin section

**Design specs (iter 071-073)**:
- `docs/features/admin-operations-dashboard/` — 5 design specs from Define-phase prelude

## Appendix C — Prior Strategic Review Cross-References

- ADMIN_DASHBOARD_REVIEW_001 (pre-iter-071; promoted #147-#152 to backlog)
- PDLT-001 PRE_DEMO_LAUNCH_AND_TESTING_PLAN_001 (iter 089 demo prep; admin dashboard DEMO-READY)
- UMAP-001 USER_MANAGEMENT_ACCOUNT_PAGE_REVIEW_001 (re-scopes TEAM-001 UI; complementary scope to ADM-002)
- AI_INTEGRATION_PLATFORM_VISION_REVIEW_001 (ADR-AI-002 audit-event precedent referenced by ADR-ADMIN-AUDIT)
- WDC-002 WORKFLOWS_DASHBOARD_REVIEW_002 (slide-in panel UX pattern referenced by D-07)
- **ADM-002 (this artifact)**

---

**End of ADM-002.** Mode 3-adjacent NON-counting. Coordinator response delivered to CEO as inline summary with §10 decision queue.
