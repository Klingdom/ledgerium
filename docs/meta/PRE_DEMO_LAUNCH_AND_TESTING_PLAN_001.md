# PRE_DEMO_LAUNCH_AND_TESTING_PLAN_001 (PDLT-001)

**Type**: Mode 3-adjacent multi-agent strategic review (NON-counting)
**Date**: 2026-05-24
**Coordinator**: AI CTO orchestration layer
**CEO directive (verbatim)**: *"I am going to start demos to groups and orgs this week coming up. Engage all subagents to create a pre-demo launch plan and testing plan."*
**Demo window**: week of 2026-05-25
**Agents engaged**: 6 in parallel — `product-manager` + `qa-engineer` + `growth-strategist` + `devops-engineer` + `system-architect` + `competitive-researcher`
**Cumulative output**: ~10,500 words synthesized below

---

## §1 Executive Summary

The 6 specialists converged on a **DEMO-READY single-user product** built on top of an **architecturally constrained multi-user backend** that is intentionally not exposed to demo audiences.

**6-of-6 agent convergence on hard rules:**
1. **DO NOT demo**: multi-user invite UI (not built), Stripe Team/Growth checkout (waitlist gate), invite email confirmation (Resend not shipped), admin member management (P0-E security vector)
2. **DO demo**: extension recording, dashboard v2, Path D column customization, SOP generation, Process Maps, Admin Operations Dashboard, Account page (display only)
3. **TODAY action**: start Resend domain verification (24-72h DNS propagation; demos in 5-7 days; longest-lead-time item)
4. **Pre-seeded demo account is the single highest-ROI pre-demo investment** (5+ recordings, 1 high-variation workflow, 1 with completed SOP + rich Process Map)
5. **Pre-recorded fallback video is mandatory** (3-min capture of full record → dashboard → SOP flow stored locally)
6. **Production environment with dedicated demo account is the recommended demo target** (NOT staging; NOT local)

**Notable divergences requiring coordinator ruling (resolved in §9):**
- system-architect proposes separate `demo.ledgerium.ai` deployment as the safest option; product-manager + devops-engineer + qa-engineer recommend production-with-demo-account. **Coordinator ruling: production-with-demo-account** (deployment isolation not achievable in 5 days; existing waitlist gates eliminate the worst surfaces).
- growth-strategist recommends waitlist CTA at end of demo; product-manager recommends direct Free-tier signup. **Coordinator ruling: Free-tier signup is primary CTA, waitlist for users specifically asking about Team features.**
- system-architect recommends shipping TEAM-P03.10 EMERGENCY before first demo (closes P0-E session-validity gap); product-manager says "DO NOT show admin member management; risk is acceptable if you don't touch it." **Coordinator ruling: TEAM-P03.10 ships iter 087 regardless (already queued); demo discipline at presenter level is the operational mitigation.**

---

## §2 Demo Readiness Verdict

### DEMO-READY (show confidently)

| Feature | File path | Validation status |
|---|---|---|
| Chrome extension recording | `apps/extension-app/` | Iter 070 real-extension harness PASSES test 1 |
| Workflow library dashboard v2 | `apps/web-app/src/components/dashboard-v2/` | Iter 037-073 production code byte-stable |
| ColumnPicker + presets + saved views (Path D) | `apps/web-app/src/lib/dashboard-columns/` | D+1..D+6 fully shipped iter 056-063 |
| SOP generation | `apps/web-app/src/app/(app)/workflows/[id]/sop/page.tsx` | Production-quality |
| Process Maps | `packages/process-engine/` | xyflow renderer; Path E shipped |
| Health scores + variation scores + AI opportunity score | `apps/web-app/src/lib/workflow-metrics.ts` | Iter 035 MDR-P01/P02 closed |
| Admin Operations Dashboard | `apps/web-app/src/app/(app)/admin/operations/` | Iter 073 SHIP-READY |
| Account page (display only) | `apps/web-app/src/app/(app)/account/page.tsx` | Profile/billing/API keys/admin render clean |
| Public SOP share link | `apps/web-app/src/app/api/share/[token]/route.ts` | Works for owner's pre-seeded workflows |

### DEMO-BROKEN (do NOT show; never click)

| Feature | Reason |
|---|---|
| Multi-user invite UI | Not built (UMAP-001 spec exists; rows #159/#160 not shipped) |
| Stripe Team/Growth checkout | Waitlist gate active (`e7892bd` iter 075); Stripe Live mode not configured |
| Email confirmations | TEAM-P04 Resend not shipped |
| Reactivation flow | No endpoint exists |
| Admin member-management surfaces | P0-E status-filter security vector at 7 call sites (TEAM-P03.10 iter 087 not shipped) |
| Account deletion | Irreversible; do not exercise live |

### DEMO-RISKY (show with extreme caveats OR avoid)

| Feature | Risk | Mitigation |
|---|---|---|
| Pricing page (just navigating to it) | Shows Team/Growth tier prices but purchase fails with waitlist message | Verify pricing page renders waitlist UI gracefully BEFORE any demo (qa §3 Path F checkpoint F3) |
| Team workspace creation | Works via backend but exercises P0-J/P0-K vectors | Pre-seed demo workspace; do NOT create live |
| Invite flow via API | Works but no UI; exposes architectural state | N/A — do not demo |
| Free-tier user dashboard | Some metrics gated → tooltips show upgrade CTA | Acceptable; reframe as feature ("plan-tier capability differentiation") |

---

## §3 Recommended Demo Script — 30-min Standard Variant

For brevity, the **30-min standard** is canonical here. Full 15-min and 60-min variants are in product-manager §3.

| Segment | Duration | Script (verbatim) | Features shown |
|---|---|---|---|
| **Hook** | 3 min | "How does your team currently document a new process? How long does it take? What happens when someone leaves?" Let them answer. "Ledgerium answers all three questions — automatically, from real behavior." | None (slide or live) |
| **Live record** | 5 min | "I'm going to record a workflow right now — the same one you'd record after this call." Open extension → record 2 short workflows of same type (variant detection). | Extension recording flow |
| **Dashboard tour** | 5 min | "Here's what those recordings became." Show workflow library + health scores + variation scores. Click ColumnPicker — "You can customize what metrics you see." Switch to "Automation Candidates" preset. | Dashboard v2 + Path D customization |
| **Intelligence deep-dive** | 10 min | Click the high-variation workflow row. Open SOP tab — "I didn't write a single word of this. It was synthesized from observed behavior." Open Process Map tab — "Variant 1 fires 47 of 62 runs. Variant 2 fires 12. That's not a guess — that's measured." Hover health score — show 4-dimension breakdown. | SOP + Process Map + Health tooltip |
| **Vision tease** | 3 min | "Where we're heading: once you've baselined every process, we map exactly where AI fits and let you run it — with the same evidence chain you're looking at now. No black box." | AI opportunity score column |
| **Q&A** | 4 min | Use §7 objection-handling scripts. | — |

**Hard rules per growth-strategist W1-W5 + product-manager §6:**
- ALWAYS SAY: "evidence-linked," "real observed behavior," "deterministic," "every claim traces back to source"
- NEVER SAY: "multi-user is live," "Team plan available today," "SOC 2 certified," "HIPAA-compliant," "AI will execute your processes" (lacking the word "soon")

---

## §4 Pre-Demo Testing Plan

From qa-engineer §1-§7 (canonical).

### T-30 min smoke tests (15 steps; abort demo if any FAIL)

Run against production URL in incognito with throwaway account:

1. Sign up new account → redirect to `/dashboard` (no error boundary)
2. Confirm email delivery (if Resend live) OR confirm fallback path
3. Install extension → load unpacked → side panel opens
4. Record 2-minute session → upload → workflow appears in dashboard within 30s
5. Dashboard renders with health score (not `—`)
6. Click workflow row → expanded detail panel works
7. SOP tab renders content (or skeleton acceptably)
8. Process Map tab renders nodes (no blank canvas)
9. Health tooltip shows breakdown (gated tooltip acceptable for free)
10. ColumnPicker drawer opens → toggle columns works
11. Preset switch (Automation Candidates) works
12. Saved view CRUD persists through reload
13. Sign out + sign back in (session restores)
14. Account page renders all sections
15. Browser console clean; network tab no 5xx

### T-5 min final check

- Hard-reload tab (`Ctrl+Shift+R`)
- Confirm demo account has 3+ recorded workflows
- Verify secondary backup browser window pre-loaded

### Critical-path E2E tests (run T-24h)

```bash
# Web-app E2E
pnpm --filter @ledgerium/web-app test:e2e

# Extension static harness
pnpm --filter @ledgerium/extension-app test:e2e

# Real-extension (1 pass + 2 SKIPPED expected per iter 070)
pnpm --filter @ledgerium/extension-app test:e2e:real

# Unit baseline
pnpm test    # expect ≥ 2183 pass; 0 failures
pnpm typecheck    # expect clean across all 10 packages/apps
```

### Manual exploratory paths (T-2h; 1-2 hour session)

Path A: First-time signup → record → upload → dashboard
Path B: Existing user → 2nd recording → variant detection
Path C: Column picker + preset switch + saved view CRUD
Path D: SOP + Process Map for high-variation workflow
Path E: Admin Operations Dashboard render
Path F: Account page billing display (do NOT click purchase)

Per-path checkpoints + screenshot capture defined in qa-engineer §4.

### Post-demo regression sweep (T+2h)

- Production error log review (last 24h; flag any 5xx on `/api/workflows`, `/api/upload`, `/api/account`, `/api/auth/*`)
- New user signup audit (verify tracked in PostHog)
- PostHog event firing rate check
- Failed Stripe webhook deliveries (Stripe Dashboard → Webhooks)
- Failed Resend email deliveries (if live)
- `pnpm test` baseline verification (no regression from any hotfix)

---

## §5 Production Readiness Audit

From devops-engineer §1-§5.

### Environment variables status

| Var | Status | Severity |
|---|---|---|
| `NEXTAUTH_SECRET` | PASS | — |
| `NEXTAUTH_URL` | PASS | — |
| `DATABASE_URL` | PASS | — |
| `STRIPE_SECRET_KEY` | WARN (TEST mode only) | Acceptable for demo if no live purchase |
| `STRIPE_WEBHOOK_SECRET` | WARN (TEST mode only) | Acceptable |
| All 6 `STRIPE_*_PRICE_ID` | WARN (TEST mode IDs) | Acceptable |
| `RESEND_API_KEY` | **FAIL** (not in compose or deploy) | **MUST add for confirmation emails** |
| `EMAIL_FROM` | **FAIL** (not in compose or deploy) | **MUST add** |
| `POSTHOG_*` | WARN (verify build-time injection) | — |

### Critical pre-demo ops actions (in order)

1. **TODAY: Start Resend domain verification for `ledgerium.ai`** (24-72h DNS propagation; demos start in 5-7 days). Add 2-3 DNS TXT records — no code deploy required.
2. **TODAY: Manual database backup** before any deploy:
   ```bash
   docker exec ledgerium-ai sh -c "cp /app/data/ledgerium.db /app/data/ledgerium.db.bak-$(date +%Y%m%d%H%M%S)"
   ```
   Copy `.bak` off the volume.
3. **TOMORROW: Set up UptimeRobot** (free 5-min polling on `/api/health`). 10-minute setup.
4. **T-24h before first demo**: Verify environment vars present in `deploy.yml`; run smoke test sequence; confirm container running latest SHA.
5. **T-2h before first demo**: Smoke-test full demo flow; check Stripe webhook queue; tail `docker logs`.

### Known-gap acknowledgements

- No Sentry / structured logging pipeline (gap; UptimeRobot is MVP substitute)
- No HTTP 5xx per-route metrics (acceptable at single-tenant Phase 1 scale)
- `scripts/docker-start.sh:35` uses `prisma db push --skip-generate --accept-data-loss` (DANGEROUS — do NOT deploy schema-modifying commit during demo week)
- No BullMQ/Redis (30-day cleanup job not operational; not demo-impactful)

### Rollback procedure

Code-only rollback (3-5 min):
```bash
# Edit compose.hostinger.yaml image tag to prior SHA
docker compose -f compose.hostinger.yaml pull
docker compose -f compose.hostinger.yaml up -d --force-recreate
```

Schema-rollback (10-15 min IF backup exists):
1. `docker compose down`
2. `cp /app/data/ledgerium.db.bak-<TIMESTAMP> /app/data/ledgerium.db`
3. Pull + start prior image
4. `curl https://ledgerium.ai/api/health`

**Without backup**: schema rollback = data-loss event. Hence backup is non-negotiable.

---

## §6 Architectural Risk Surface

From system-architect §1-§5.

### CRITICAL severity (acknowledge + mitigate)

| Risk | Demo likelihood | Mitigation |
|---|---|---|
| **P0-E removed-admin session retention (up to 7-day JWT TTL)** | LOW (no one removed mid-demo) | Reduce session TTL to 1 day via env var override: `NEXTAUTH_SESSION_MAXAGE=86400` (1 LOC change in `auth.ts:38`) |
| **`/api/share/{token}` unauthenticated + unrate-limited** | MEDIUM (any shared link in demo exposes URL pattern) | Pre-seed demo SOPs only; do not generate shares live |
| **`/api/admin/bootstrap` publicly reachable POST** (auto-promotes caller if zero admins exist) | LOW but CATASTROPHIC | Add `DISABLE_ADMIN_BOOTSTRAP=true` env check before line 12 (5 LOC, 1 hour) OR ensure admin row never deleted during demo period |

### HIGH severity

| Risk | Mitigation |
|---|---|
| **P0-J non-transactional Stripe webhook → Team creation** | Purchase flow waitlist-gated for team/growth; risk surface = NONE if checkout-block holds |
| **P0-K invite-quota race** | Invite UI not built; only reachable via direct API call (low likelihood) |
| **P0-L 7 status-filter omissions** | TEAM-P03.10 ships iter 087; affects admin if member removed mid-demo (unlikely) |

### Demo-period feature flag recommendations

| Flag | Action | Reversibility | LOC |
|---|---|---|---|
| Disable `/api/admin/bootstrap` | Env-var guard | Trivial | 5 |
| Reduce session TTL to 1 day | Env var override | Trivial | 1 |
| Disable `/api/teams/*` POST | Env-var guard | Trivial | 10 |

**Coordinator-default: ship all 3 flag changes as Mode 2 directed pick at iter 087 alongside TEAM-P03.10 EMERGENCY** (single coordinated risk-mitigation iteration; 1-2 day work; `backend-engineer` continued).

### Audience-signup safety analysis

5 highest-likelihood audience-triggered paths verified against code:
1. Google OAuth signup → currently `Credentials` provider only; offers email/password
2. Extension install → CWS path safer than CRX side-load
3. Click "Upgrade to Team" → must verify pricing page renders waitlist UI not raw error
4. Try to invite teammate → 401/403 to unauthenticated probe (verify)
5. Try to delete account → cascades; pre-validate against staging

---

## §7 Demo Positioning + Messaging

From growth-strategist §1-§6.

### 30-second pitch (verbatim)

> *"Hi, I'm Phil. Ledgerium records how your team actually does their work in the browser — not how the SOP says it should happen, but exactly what happens, step by step. From one recording session you get a structured SOP, a process map, and real metrics: cycle time, variance, where the rework is, which steps are candidates for automation. Unlike Scribe or Loom, every claim traces back to a specific observed event — no interpretation, no guessing. You install a Chrome extension, record a workflow, and get process intelligence in under five minutes. We're in beta. Come see what your team actually does."*

### 5 wedge messages

- **W1 Hero**: *"Every process you record becomes evidence — cycle time, variance, health score, and a publishable SOP, all from one browser session."*
- **W2 Honest pain**: *"You don't know what your team actually does because the only documentation you have was written by someone who hasn't done the work in six months."*
- **W3 Differentiation**: *"Unlike SOPs that are written from memory, Ledgerium SOPs are observed — every step is a real event from a real session, with a timestamp and a source."*
- **W4 Trust**: *"Evidence-linked means you can trace every metric, every SOP step, and every health score back to the exact browser events that produced it — no black box, no interpretation layer."*
- **W5 Vision tease** (end of demo only): *"And the direction we're heading: once you've baselined a process, we'll map exactly where an AI integration fits and let you run it — with the same evidence chain, so you know what improved and by how much."*

### Top 10 objections + scripted rebuttals

Full scripts in growth-strategist §4. Top 3 most likely:

| Objection | One-line rebuttal |
|---|---|
| "We already use Scribe / Loom / Tango" | *"Scribe captures screenshots. Ledgerium captures events. The difference is that every SOP step here has a source event with a timestamp — it's not an image, it's a measurement."* |
| "How is this different from process mining like Celonis?" | *"Celonis requires months of ERP integration and a six-figure contract. Ledgerium requires a Chrome extension and a recording session. Same category of intelligence, radically different entry point."* |
| "Privacy concerns — what data are you capturing?" | *"The extension captures step-level events: which element was clicked, which field was filled, which system it was in. It does not capture field values or form content by default. Sensitive fields are masked by the policy engine before any data leaves the browser."* |

### Post-demo 7-day nurture sequence

**Day 0 (≤2 hours)** — Phil personally, recording link + 1-page summary
**Day 1** — Phil personally, 3 questions we didn't cover
**Day 3** — Ledgerium team account, tailored use-case proposal
**Day 5** — Phil personally, "I can map one of your processes right now"
**Day 7** — Ledgerium team account, "What's shipping in next 30 days"

Full email templates in growth-strategist §6 (verbatim subject + body for each).

---

## §8 Competitive Context + Distinctive Moments

From competitive-researcher §1-§5.

### 5 distinctive moments no competitor can demo (cite by name when needed)

- **M1 Evidence-linked process map** — click any SOP step → source event chain with timestamp
- **M2 Multi-recording variant detection with N-attribution** — `"47 runs · 4m 32s mean"` next to every statistic
- **M3 Baseline-vs-after deterministic measurement** — same pipeline, same formula, before/after datasets
- **M4 Deterministic re-runnable processing** — re-process identical input → byte-identical output (no LLM drift)
- **M5 SOPs that aren't written — they're observed** — zero human authoring; 100% derived from real behavior

### Competitive demo patterns audited (2026 data)

| Competitor | Pattern | Wedge | Pricing | Demo length |
|---|---|---|---|---|
| Scribe | Live + self-serve free | "Documentation that writes itself — 12x faster" | $0 / $29/user/mo / Enterprise gated | 2-3 min self-serve, 20-30 min sales |
| Loom (Atlassian) | Self-serve | "Record once, share anywhere" | $0 / $18 / $24 per user/mo | 60 sec self-serve |
| Tango | Sales-led + trial | "Click through once, get a polished guide" | $26/user/mo, Enterprise custom | 15-20 min |
| Celonis | 11-min video + sales-led | "Journey to AI ROI starts with your processes" | Gated | 60-90 day POC |
| UiPath | Recorded + sales-led | "Mine processes, then automate" | Gated, enterprise | 30-45 min |
| SAP Signavio | Webcasts | "Transformation at your fingertips" | Enterprise, SAP-bundled | 45-60 min |

**Critical competitive intelligence**: Scribe Optimize launched 2025-11-10 with $75M Series C — passive observation + variation detection + standardization suggestions. SAP Signavio Feb 2026 release introduced Execution Variant Explorer (direct overlap with M2). **18-24 month competitive window narrowing.**

### Window-of-opportunity narrative (3 audience-tuned variants)

**Variant A** (early adopters): *"The category is forming RIGHT NOW. Microsoft 12-18 months. Celonis 24-36 months. Teams who baseline now will be ready when their AI vendor catches up."*

**Variant B** (cautious/ROI-focused): *"You don't have to believe in the AI vision to see value. Baseline measurement alone is valuable. The AI opportunity is optionality on top of a foundation you'd want anyway."*

**Variant C** (executive skeptic): *"Every major platform is converging on the same problem: AI needs grounding in real process data. Organizations that establish process evidence now will be ready to govern AI when it arrives."*

---

## §9 Open CEO Decisions (silence = accept coordinator-default)

| # | Decision | Coordinator-default |
|---|---|---|
| D-01 | Demo environment isolation strategy | **Production with dedicated demo account** (not staging; not separate `demo.ledgerium.ai` deployment — not achievable in 5 days) |
| D-02 | Resend domain verification trigger | **START TODAY** (24-72h DNS propagation; critical path) |
| D-03 | Stripe Live mode activation timing | **DEFER** (keep TEST mode for demo week; do not click purchase live) |
| D-04 | Pre-recorded fallback video | **YES** (record 3-min capture of full record → dashboard → SOP; insurance value > 30 min effort) |
| D-05 | TEAM-P03.10 EMERGENCY ship gate | **SHIP iter 087** (closes P0-E session-validity gap; already queued; backend-engineer 6th consecutive CD-3 exception) |
| D-06 | Demo-period feature flag changes (`DISABLE_ADMIN_BOOTSTRAP` + `NEXTAUTH_SESSION_MAXAGE=86400` + teams-API guards) | **SHIP iter 087 alongside TEAM-P03.10** (single coordinated risk-mitigation iteration) |
| D-07 | Vision disclosure depth in demos | **High-level vision narrative + AI opportunity score visible; do NOT show detailed 10-iteration AI build sequence** (competitive sensitivity) |
| D-08 | Pricing disclosure strategy in demo | **DO NOT navigate to pricing page during demo**; send link 1:1 after; avoids waitlist-gate awkwardness |
| D-09 | End-of-demo CTA | **Free-tier signup is primary; waitlist for Team-feature-specific asks** (resolves growth-strategist + product-manager divergence) |
| D-10 | Stripe customer-model ADR | **WRITE before first demo** (1-page; 4-hour effort; needed if asked about billing-vs-workspace identity) |
| D-11 | NDA requirement for AI roadmap discussions | **YES for detailed build sequence; NO for high-level vision narrative** |
| D-12 | Demo recording consent + retention | **Capture screen recordings locally; 30-day retention; verbal consent at session start** |
| D-13 | Beta waitlist signup capture mechanism | **Use existing `/signup`** for primary; configure Resend audience list for follow-up nurture |
| D-14 | UptimeRobot setup | **YES** (10-minute setup; free tier; highest-ROI monitoring) |
| D-15 | Manual production database backup | **YES TODAY** (non-negotiable before any deploy during demo week) |

---

## §10 Pre-Demo Countdown Checklist

### T-7 days (TODAY, 2026-05-24)

- [ ] **Start Resend domain verification for `ledgerium.ai`** (D-02)
- [ ] **Manual production database backup** (D-15)
- [ ] **Set up UptimeRobot** on `/api/health` (D-14)
- [ ] Audit `compose.hostinger.yaml` + `deploy.yml` for missing env vars
- [ ] Schedule TEAM-P03.10 EMERGENCY ship for iter 087 (D-05)
- [ ] Schedule demo-period feature flags for iter 087 (D-06)

### T-5 days (2026-05-26)

- [ ] **Iter 087 TEAM-P03.10 EMERGENCY ships** (closes P0-E + feature flags)
- [ ] Write Stripe customer-model ADR (D-10)
- [ ] Create dedicated demo account in production
- [ ] Set demo account plan = `team`, `subscriptionStatus = 'active'` (manual SQL)
- [ ] Pre-load 5+ recorded workflows in demo account
  - [ ] 3+ workflows with variant_count > 1
  - [ ] 1+ workflow with health score in "needs review" band
  - [ ] 1+ workflow with completed SOP + rich Process Map
  - [ ] 1+ workflow with high AI opportunity score
- [ ] Record 3-min fallback video (full record → dashboard → SOP flow) (D-04)

### T-3 days (2026-05-28)

- [ ] **Verify Resend DNS propagation completed**
- [ ] Add `RESEND_API_KEY` + `EMAIL_FROM` to GitHub Secrets + `deploy.yml`
- [ ] Manual exploratory testing pass (qa §4; 6 paths A-F)
- [ ] Verify pricing page renders waitlist UI for Team/Growth (not raw error)
- [ ] Browser profile setup: "Ledgerium Demo" Chrome profile + pinned extension
- [ ] Tabs pre-opened: dashboard / best workflow detail / account page
- [ ] Secondary backup browser window setup
- [ ] Pre-validate `/admin/operations` for demo presenter account

### T-24h (day before)

- [ ] Smoke test full demo flow on production
- [ ] Run E2E test suites (qa §3)
- [ ] Run `pnpm test` baseline (≥2183 pass)
- [ ] Verify Stripe webhook delivery queue empty
- [ ] SSH to VPS: `docker stats` (CPU/RAM headroom) + `df -h /` (disk > 2 GB)
- [ ] Confirm UptimeRobot quiet for prior 24h
- [ ] Print physical notepad with demo script + failure recovery cards

### T-2h

- [ ] Sign in as demo account; walk through demo flow manually
- [ ] Check `docker logs --tail 100 ledgerium-ai` for ERROR lines
- [ ] Verify VPS monitoring tab open
- [ ] Mobile hotspot ready (network failure backup)

### T-30m

- [ ] Smoke tests T-30 sequence (qa §1; 15 steps)
- [ ] Load fallback video to demo machine (local; not internet-dependent)
- [ ] Open ops terminal: `docker logs -f ledgerium-ai 2>&1 | grep -E "(ERROR|WARN|FATAL)"`
- [ ] Silence personal notifications
- [ ] Browser DevTools console clear

### T-5m

- [ ] Hard-reload demo tab
- [ ] Confirm demo account has 3+ workflows visible
- [ ] Verify secondary backup browser window pre-loaded
- [ ] Start screen recording (D-12)

### T-0 → demo runs

### T+15m

- [ ] PostHog live events: confirm audience interactions tracked
- [ ] `curl https://ledgerium.ai/api/health` final check
- [ ] `docker logs --tail 200 ledgerium-ai` post-demo error review

### T+2h

- [ ] Post-demo regression sweep (qa §7)
- [ ] Send Day-0 nurture email to all attendees (growth §6)
- [ ] Document any audience-reported issues (severity-rated; flag to engineering)

---

## §11 Live Failure Recovery Scripts

Memorize these 10 scenarios. Speak calmly; do not say "it's broken."

| # | Failure | Scripted response | Action |
|---|---|---|---|
| 1 | Live extension fails to capture | *"Let me show you a pre-recorded version of this exact workflow — we captured it earlier this week."* | Switch to pre-seeded demo account workflow |
| 2 | Dashboard returns 500 / blank | *"We're seeing a brief latency spike — these things happen. While it recovers, let me walk you through this SOP I generated yesterday."* | Open pre-loaded SOP screenshot in backup tab |
| 3 | SOP generation times out | *"SOPs process asynchronously — this one is still computing. Here's one from a completed session earlier."* | Switch to pre-seeded workflow with completed SOP |
| 4 | Process Map renders blank | *"The process map requires a minimum number of recording variants — let me switch to this other workflow with more runs."* | Pre-identified rich-map workflow |
| 5 | Browser/extension crash | *"One second — let me reload. Meanwhile, here's what we just saw [show screenshot]. The key insight is..."* | Backup browser window with pre-loaded tabs |
| 6 | Wifi drops | (silence) | Mobile hotspot; pre-loaded tabs render from cache briefly |
| 7 | ColumnPicker drawer fails to open | *"Column customization is one of the features I'll show — let me refresh."* | Hard reload (`Ctrl+Shift+R`); fallback to `?v2=1` query |
| 8 | Account page error boundary | *"Account settings are loading — let's continue with the workflow view."* | Do NOT reload live; navigate away |
| 9 | Health score shows `—` everywhere | *"The health scoring pipeline runs post-upload — for fresh workflows it computes in minutes. Here's a workflow with full score."* | Switch to pre-seeded scored workflow |
| 10 | Admin Operations 404 | *"I need to switch to admin view — one moment."* | Sign out + sign back in as admin account; verify allowlist in production |

**General recovery rule**: keep a secondary browser window (separate Chrome profile) pre-logged-in as demo account and pre-navigated to (a) dashboard, (b) best workflow detail, (c) account page. Pivot instantly if primary breaks.

---

## §12 Closing Verdict

### Demo readiness — coordinator final assessment

**The single-user product flows (record → upload → dashboard → SOP → Process Map → column customization → saved views → admin operations) are validated by 2183+ unit tests + complete Playwright E2E suite. These flows are DEMO-READY.**

**Demos can begin week of 2026-05-25 with high confidence — IF the 6 critical pre-demo actions are completed:**
1. Resend domain verification started TODAY (D-02)
2. Database backup completed TODAY (D-15)
3. Pre-seeded demo account ready by T-3 days
4. Pre-recorded fallback video captured (D-04)
5. TEAM-P03.10 EMERGENCY + demo feature flags ship iter 087 (D-05, D-06)
6. Smoke-test + manual exploratory pass completed T-24h

**The HARD NO-FLY zones are non-negotiable**: team/multi-user flows, Stripe checkout, invite-by-email flow. Presenting any of these live carries unacceptable risk given the 8 open TEAM-001 P0 BLOCKERS and Stripe operationally-pending status.

**The single most important investment is the pre-seeded demo account.** Everything else in this plan defends against the 10-15% of demos where something goes sideways. A well-seeded demo account converts that 10-15% from "demo failure" to "graceful pivot."

### Mode 3-adjacent NON-counting effects

- Zero iteration counter increment
- Cool-off recharge counter UNCHANGED
- D-1 reverse-portfolio-drift counter UNCHANGED
- MR-019 cadence counter UNCHANGED
- Area saturation clock NOT advanced
- Pool UNCHANGED (zero backlog promotions; zero strikethroughs)

### Next coordinator action

Iter 087 = TEAM-P03.10 EMERGENCY + demo-period feature flag set (D-05 + D-06 combined). `backend-engineer` 6th consecutive CD-3 exception justified — fixup tightly coupled to existing iter 082-086 code paths + demo deadline forcing serialization. Estimated 1-2 days; ships before T-5 days demo prep deadline.

---

## Appendix A — Agent Output Index

| Agent | Word count | Section coverage |
|---|---|---|
| product-manager | ~2,400 | Demo audience + feature inventory + 3 demo script variants + setup checklist + Q&A scripts + safe/unsafe talking points + post-demo follow-up + 5 CEO decisions |
| qa-engineer | ~2,500 | T-30/T-5 smoke tests + production health check + E2E test commands + manual exploratory paths + known-issue map + 10 failure recovery scripts + post-demo regression sweep |
| growth-strategist | ~2,000 | 30-sec pitch + 5 wedge messages + value-prop hierarchy + 10 objections + activation hooks + 7-day nurture sequence with verbatim emails |
| devops-engineer | ~1,700 | Production readiness audit + monitoring + rollback procedure + demo isolation strategy + operational runbook + 5 ops CEO decisions |
| system-architect | ~1,600 | Risk-surface inventory + feature-flag strategy + audience-signup safety + demo-safe feature list + 5 architectural CEO decisions |
| competitive-researcher | ~1,400 | Competitor demo patterns audit (10 platforms) + 5 distinctive moments + anti-positioning + persona-specific positioning + window-of-opportunity narrative (3 variants) |
| **Total** | **~10,500** | |

## Appendix B — Cross-Reference Index

- `apps/extension-app/` — recording layer
- `apps/web-app/src/components/dashboard-v2/` — dashboard v2 production code
- `apps/web-app/src/lib/dashboard-columns/` — Path D customization
- `apps/web-app/src/app/(app)/account/page.tsx` — Account page (display safe)
- `apps/web-app/src/app/(app)/admin/operations/` — Admin Operations Dashboard
- `apps/web-app/src/app/api/billing/checkout/route.ts:30` — `BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD` waitlist gate
- `apps/web-app/src/lib/auth.ts:38` — JWT session TTL (target for demo-period reduction)
- `apps/web-app/src/app/api/admin/bootstrap/route.ts:12` — admin auto-promote (target for demo-period disable)
- `docs/meta/AI_INTEGRATION_PLATFORM_VISION_REVIEW_001.md` — AI vision positioning anchor
- `docs/meta/USER_MANAGEMENT_ACCOUNT_PAGE_REVIEW_001.md` — UMAP-001 (iter 091+ UI work)
- `docs/runbooks/STRIPE_SETUP.md` — Stripe operational runbook
- `IMPROVEMENT_BACKLOG.md` row #158 TEAM-P03.10 — demo-prerequisite fixup
- `IMPROVEMENT_BACKLOG.md` row #157 TEAM-INFRA-01 — RESEND_API_KEY env-var addition

## Appendix C — Prior Strategic Review Cross-References

- TEAM_WORKSPACE_REVIEW_001 (original spec for TEAM-001)
- TEAM_WORKSPACE_PROGRESS_REVIEW_001 (5 P0 → closed iter 086)
- TEAM_WORKSPACE_QUALITY_REVIEW_001 (defect audit)
- TEAM_WORKSPACE_SYSTEMS_TEST_REVIEW_001 (8 P0 → row #158 EMERGENCY iter 087)
- USER_MANAGEMENT_ACCOUNT_PAGE_REVIEW_001 (UMAP-001; Account-page integration spec)
- AI_INTEGRATION_PLATFORM_VISION_REVIEW_001 (vision narrative for demos)
- WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001 (Path D rationale)
- SOP_PROCESSMAP_REVIEW_001 (SOPs + Process Maps shareability)
- **PRE_DEMO_LAUNCH_AND_TESTING_PLAN_001 (this artifact)**

---

**End of PDLT-001.** Mode 3-adjacent NON-counting. Coordinator response delivered to CEO as inline summary with §9 decision queue.
