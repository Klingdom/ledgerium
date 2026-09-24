# MR-030 — Meta-Review (Mode 4, governance)

**Date:** 2026-09-24 · **Agent:** `meta-coordinator` · **Counting:** NON-counting
**Trigger:** base cadence (loops 39, 40, 41 since MR-029) **AND** the systemic finding at loop 41.
**Scope guard:** this artifact is the only file created. `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` are untouched by design — findings only.

---

## 1. Why this meta-review is mostly a sweep

Loop 41 tried to select `top-score` and the top score was invalid: **#102 (16) had already shipped
and was never struck**. Two neighbours (#107, #176) were filed wider than reality. Loop 41 audited
**14 of 117** open rows — the head of the queue — and explicitly declined to claim the rest was clean.

That is the agenda. A scoring rule reading a backlog whose rows do not correspond to the repository
is not a prioritisation mechanism; it is a random number generator with a confidence interval. The
sweep below closes that gap for every open row scoring ≥ 10.

**Method.** Every verdict is a read of the file, never of the iteration narrative — the narrative is
what caused this. `SHIPPED` requires the change to be locatable at `file:line`. Where evidence was
partial I recorded `PARTIAL`, not `SHIPPED`. Where nothing was found I recorded the grep.

**Population.** 81 open (non-struck) rows score ≥ 10. The rows verified at loop 41 (#93, #95, #101,
#102, #107, #108, #112, #121, #122, #137, #138, #168, #171, #176 — two of which are already struck)
are skipped. **69 rows audited here.**

**Result.** 9 SHIPPED · 18 PARTIAL · 42 OPEN · 0 UNVERIFIABLE.

---

## 2. Sweep verdicts

### 2.1 SHIPPED — strike these 9

| Row | Score | Verdict | Evidence | Action |
|---|---|---|---|---|
| 4 | 13 | SHIPPED | `.claude/bin/update_dashboard.py` (artifact + system-health refresh script) + `SYSTEM_HEALTH.md` at repo root + PostToolUse audit hooks `.claude/settings.json:92+` appending to `.claude/audit/change-log.md` | **strike** |
| 6 | 12 | SHIPPED | `docs/ICP_DEFINITION.md`, `docs/POSITIONING_DECISION.md`, `docs/assessments/CURRENT_STATE_POSITIONING_REVIEW.md` | **strike** |
| 72 | 11 | SHIPPED | `WorkflowRow.tsx:775` — a single `document.addEventListener('keydown', handleKeyDown)`. The three per-component listeners named in the row are gone, replaced by `// NOTE: Escape handling is centralized in WorkflowRow via useEscapeDispatch (MDR-P08)` at `:315`, `:455`, `:617` | **strike** |
| 74 | 13 | SHIPPED | Both named claims present. Chip templates now carry `{signal} → {action}`: `workflow-metrics.ts:684` `"${n} workflows show high variation → consider standardizing"`, plus `:702`, `:715`, `:727`, `:743`. Score typography de-emphasised from 28px to `text-[16px] font-semibold` at `CommandHeader.tsx:228` | **strike** |
| 87 | 10 | SHIPPED | DFG on the workflow-detail view: `components/workflow-view/adapters/dfgToReactFlow.ts`, `workflow-view/DfgFrequencyMap.tsx`, `workflow-view/WorkflowCanvas.tsx`, node/edge renderers under `workflow-view/nodes/` + `workflow-view/edges/`; wired at `app/(app)/workflows/[id]/page.tsx:28` (import) and `:460` (render) | **strike** |
| 97 | 10 | SHIPPED | `components/dashboard-v2/band/KpiTileStrip.tsx` — 4 tiles (Total Workflows / Median Cycle Time / Automation Candidates / High-Variance), rendered at `band/TopBand.tsx:190` | **strike** |
| 147 | 13 | SHIPPED | Client `track()` now writes locally: `lib/analytics.ts:839` `fetch('/api/analytics/events', …)` and `:856` `navigator.sendBeacon('/api/analytics/events', blob)`; receiver `api/analytics/events/route.ts:10` `POST` persists via `db` | **strike** |
| 172 | 11 | SHIPPED | Query: `lib/admin-operations/queries.ts:486` `getSubscriptionBreakdown()` — Prisma `groupBy` on `plan`, zero-filled `byPlan`. UI: `admin-operations/SubscriptionPlanBar.tsx` horizontal segmented bar, imported `AdminOperationsDashboard.tsx:37`, rendered `:687` | **strike** |
| 173 | 12 | SHIPPED | `queries.ts:191` computes `activationRatePct`, returned `:206`, typed `admin-operations/types.ts:133`, rendered as a KPI tile at `AdminOperationsDashboard.tsx:295-296` `label="Activation %"` | **strike** |

**Five of these score ≥ 12** (#4, #6, #74, #147, #173). #74 and #147 both score 13 — within a
handful of rows of where loop 41 stopped.

### 2.2 PARTIAL — re-scope these 18

| Row | Score | Verdict | Evidence | Action |
|---|---|---|---|---|
| 12 | 10 | PARTIAL | 13 migration directories exist under `apps/web-app/prisma/migrations/` (earliest `20260505000000_add_user_dashboard_preference`) — but there is **no init/baseline squash**, and deploy does not use them: `scripts/docker-start.sh:58` still runs `npx prisma db push --skip-generate` | re-scope to "baseline squash + switch deploy to `migrate deploy`" (overlaps #157 sub-task 1) |
| 13 | 10 | PARTIAL | Failure surfaces exist — truncation banner `sidepanel/screens/HistoryDetailScreen.tsx:130`, upload-failure classification `sidepanel/screens/ProcessScreen.tsx:237` — and `background/index.ts` calls `restoreStateIfNeeded()`. No defined SW-**interruption** recovery UX | re-scope to the SW-interruption case only |
| 35 | 10 | PARTIAL | The cited line is gone: `pricing/page.tsx:145` no longer carries it; the Starter tagline now reads `'Document solo, share cleanly'` (`pricing/page.tsx:233`). The feature-language survives elsewhere: `account/page.tsx:686` "clean exports", `docs/page.tsx:1789` "Clean exports — no watermark" | re-scope to the account + docs surfaces |
| 109 | 13 | PARTIAL | One of two hard ARIA violations is fixed: `grep -rn 'role="listitem"' components/sop-view/` → **0 hits**. The other survives: `sop-view/SOPExecutionMode.tsx:566` `role="checkbox"`. No axe spec: `find apps/web-app/e2e -ipath "*sop*"` → 0 | re-scope to checkbox restructure + axe spec |
| 124 | 13 | PARTIAL | 9-label taxonomy **shipped**: `lib/process-graph/catalog/variant-labels.ts:16-23` (`dominant_path` … `high_performance_path`). Clustering did **not**: `intelligence-engine/clustering/traceSimilarity.ts:34` `DEFAULT_SIMILARITY_WEIGHTS = { lcs: 0.6, cat: 0.4 }` — two terms, not five; `clusterSignatures.ts:4` is single-link but takes `threshold` as a plain parameter (`:39`), with no run-count adaptive table | re-scope to the similarity formula + threshold table |
| 126 | 10 | PARTIAL | Persistence shipped: `prisma/schema.prisma:783` `model ProcessGraph`, `:210` `processGraphs ProcessGraph[]`, `:200` `processGraphVersionAtIngest`. Merge engine did not: `grep -rln "mergeRuns\|mergeKey\|buildProcessGraph" packages apps/web-app/src` → 0 | re-scope to the N-run merge algorithm only |
| 128 | 12 | PARTIAL | `workflow-view/WorkflowInspectorPanel.tsx` (290 LOC) exists but is a **sections** panel (`:157-158` `<InspectorSection title="Metrics">`), not the 4-tab Overview/Evidence/Metrics/Automation spec. No variant rail: `find -iname "*VariantExplorer*"` → 0 | re-scope to tabs + variant rail |
| 131 | 12 | PARTIAL | `DecisionSOP` + `renderDecisionMarkdown` pre-exist (`process-engine/src/templates/markdownRenderer.ts:573`, exported `index.ts:121`) — the pre-Path-E baseline. It cannot consume "§3 enriched decision detection" because that does not exist (see #121 / #122 / #123) | re-scope: renderer half done; remainder blocked on the decision engine |
| 142 | 11 | PARTIAL | Email infrastructure shipped: `lib/email.ts:38` `selectEmailProvider` (`'smtp' \| 'resend' \| 'console'`), `:160` `sendEmail`. The invite path does **not** use it: `api/teams/[id]/invite/route.ts:240` builds `inviteUrl`, returns it at `:244`, never calls `sendEmail`. No `lib/email/workspace-invite.ts`; no RESEND runbook (`ls docs/runbooks/` → 8 files, none matching) | re-scope to "wire the invite route to `sendEmail`" |
| 143 | 13 | PARTIAL | Nav entry shipped: `components/AppShell.tsx:28` `{ href: '/teams', label: 'Teams', icon: Users }`. No switcher, no hook: `find -iname "*WorkspaceSwitcher*" -o -iname "use-active-workspace*"` → 0. No seat-pressure indicator | re-scope to switcher + hook |
| 144 | 11 | PARTIAL | Shipped at a different path than the row states: `app/(app)/teams/[id]/page.tsx` (256 LOC) renders members, role badges and an invite affordance (`UserPlus`, `Copy`, `Trash2`, `Mail`, `Clock` imports `:6-17`); list page `app/(app)/teams/page.tsx` (207 LOC) with a create-team flow + `createTeamError.ts`. Missing: a Settings page. `/workspace/[id]/*` does not exist and is not the shipped shape | re-scope to the Settings page; correct the path |
| 145 | 11 | PARTIAL | Acceptance page exists: `app/(app)/teams/join/page.tsx` (123 LOC), token read via `useSearchParams`, valid/invalid states handled. But it sits under `(app)` — **authenticated** — not the public route the row specifies. Bulk CSV absent (`grep -rln csv app/(app)/teams api/teams` → 0); no activity feed; no plan-change banner | re-scope: public-route variant + the three missing features |
| 150 | 13 | PARTIAL | `lib/admin-operations/queries.ts` exports 6 async query functions (`:125` `getUserVolume`, `:219`, `:290`, `:373`, `:486`, `:657`). Of the 11 named in the row: plan distribution, subscription-status and MRR all live inside `getSubscriptionBreakdown():486`; `activationRatePct` inside `getUserVolume:191`. `getRecordingQuotaUtilization` / `getTrialPipelineCount` and the rest: 0 hits | re-scope to the genuinely-absent functions |
| 151 | 12 | PARTIAL | Tiles + charts ship (`KpiTile.tsx`, `TimeSeriesChart.tsx`, `SubscriptionPlanBar.tsx`, `SubscriptionStatusBar.tsx`, `MemoryGauge.tsx`; Est. MRR `AdminOperationsDashboard.tsx:261`, Activation % `:295`). The funnel does not: `find -iname "BreakdownBar*" -o -iname "PlanMixChart*" -o -iname "ConversionFunnel*"` → 0 | re-scope to the activation funnel |
| 152 | 12 | PARTIAL | Admin-gate bypass tests exist: `api/admin/operations/route.test.ts:5-6,15` (404 unauthenticated / 404 non-allowlist / error code `not_found`). No PII regex scan, no performance-budget assertion, no axe scan in that file | re-scope to PII + perf budget + axe |
| 157 | 13 | PARTIAL | Sub-task (2) **shipped**: `compose.hostinger.yaml:67-68` `RESEND_API_KEY` + `EMAIL_FROM`; `.github/workflows/deploy.yml:142-143` the same. Sub-task (1) **open**: `scripts/docker-start.sh:58` still `prisma db push`, no `.bak-` copy. Sub-task (3) **open**: no `docs/runbooks/RESEND_WORKSPACE_SETUP.md` | re-scope to (1) + (3) |
| 175 | 11 | PARTIAL | `Est. MRR` tile ships (`AdminOperationsDashboard.tsx:261-262`, spotlight `:706-716`) but is derived from Prisma `groupBy` (`queries.ts:505` `MRR_PLANS`), **not** from Stripe: `grep -rn "subscriptions.list\|invoices.list" apps/web-app/src` → 0. No churn indicator | re-scope: drop the MRR tile; keep Stripe-sourced trial count + churn |
| 177 | 13 | PARTIAL | 6 component test files exist (`AdminOperationsDashboard`, `BackupStatusSection`, `LeaderboardTable`, `MemoryGauge`, `RefreshControl`, `TimeSeriesChart`, plus `format-utils`). Missing: `KpiTile`, `SectionCard`, `EmptyState`, `LoadingSkeleton`. No axe: `grep -n "axe\|assertAxeCompliance" e2e/app/admin-operations.spec.ts` → 0 | re-scope to 4 test files + the axe ratchet |

### 2.3 OPEN — keep these 42

| Row | Score | Verdict | Evidence (or the grep that found nothing) | Action |
|---|---|---|---|---|
| 8 | 11 | OPEN | `grep -rL "try {" apps/web-app/src/app/api --include=route.ts` → **25 of 71** route files unguarded (incl. `account/route.ts`, `keys/route.ts`, `portfolios/route.ts`, `billing/one-time-purchase/route.ts`) | keep — the row says "11"; **re-scope the count to 25** |
| 9 | 11 | OPEN | `grep -rln "logger\|structuredLog\|pino\|winston" apps/web-app/src/lib` → 0 | keep |
| 10 | 11 | OPEN | `grep -rn "checksum\|integrityHash\|bundleHash" packages apps --include=*.ts` → only `api/workflows/[id]/ask/route.ts:56 bundleHash`, an answer-determinism hash, not a pre-derivation integrity check | keep |
| 11 | 10 | OPEN | `grep -rn "(db as any)" apps/web-app/src --include=*.ts \| wc -l` → **76** | keep |
| 57 | 10 | OPEN | `app/(app)/dashboard/page.tsx:317` `if (searchParams.get('v2') !== '0') {` — flag and v1 path both still live | keep |
| 81 | 10 | OPEN | `api/workflows/route.test.ts:61` `vi.mock('@/lib/workflow-metrics', …)` and `:44` `vi.mock('@/lib/metrics-input-adapter', …)`, whose own comment reads "toMetricsInput output is discarded by the mocked computeWorkflowMetrics". No non-mocked pipeline test | keep |
| 84 | 10 | OPEN | `grep -rn "FeatureKey\|requiresFeature" lib/dashboard-columns/types.ts lib/dashboard-columns/registry.ts` → 0 | keep |
| 85 | 11 | OPEN | `api/workflows/route.ts:753` returns a bare `{ workflows, stats: { … } }` — no `{ data, error, meta }` envelope | keep |
| 90 | 13 | OPEN | `find docs -iname "*EVENT_LOG*" -o -iname "*OCEL*"` → 0; `docs/features/dashboard-v3-metrics-engine/` holds 12 files, none the ADR | keep |
| 91 | 12 | OPEN | `find docs -iname "*INFRASTRUCTURE*"` → 0 | keep |
| 92 | 13 | OPEN | `grep -rn "ErrorBoundary\|componentDidCatch\|getDerivedStateFromError" components/dashboard-v2/ app/(app)/dashboard/` → 0. The only `ErrorBoundary` in the app is under `components/demo/` | keep |
| 94 | 13 | OPEN | `lib/analytics.ts:774-775` reads `(window as any).__ledgerium_userPlan` then `if (userPlan != null) base.userPlan = userPlan` — silently omits when unset. No queue, no drain, no gate | keep |
| 96 | 11 | OPEN | Nouns still diverge: `app/(public)/page.tsx:363` `title: 'Workflow Library'`; `:414` `{/* vs. Process Mining */}`; `:417` `vs. Process Mining` | keep |
| 103 | 11 | OPEN | `lib/dashboard-columns/persistence.ts:57` `export const CURRENT_SCHEMA_VERSION = 1 as const;`; `grep -n defaultTimeRange persistence.ts` → 0 | keep |
| 105 | 11 | OPEN | `grep -c "ColumnPicker\|PresetChipRail\|SavedView\|column-picker" e2e/app/dashboard/v2-a11y.spec.ts` → **0** | keep |
| 106 | 11 | OPEN | `find apps/web-app/src -iname "*WorkflowDetailPanel*"` → 0 | keep |
| 110 | 13 | OPEN | All three determinism leaks present verbatim: `process-engine/src/templates/markdownRenderer.ts:313` and `:596` `generatedAt: sop.generatedAt ?? new Date().toISOString()`; `process-engine/src/workflowInterpreter.ts:161` `computedAt: new Date().toISOString()`. `grep -rn "sopSchemaVersion\|migrateSOP" packages/process-engine/src` → 0 | keep — **highest-confidence core-invariant violation in the pool** |
| 111 | 13 | OPEN | `grep -rn PRICING_CATALOG apps/web-app/src` → 0; `apps/web-app/src/lib/pricing/` does not exist | keep |
| 113 | 13 | OPEN | `app/(public)/pricing/page.tsx:69` `const COMPARISON_FEATURES = [` flat array intact, consumed at `:282`. No `featureCategories` | keep |
| 114 | 11 | OPEN | `find apps/web-app/src -iname "*PricingLive*"` → 0; `apps/web-app/src/components/pricing/` does not exist | keep |
| 116 | 12 | OPEN | `grep -c pricing_page_viewed apps/web-app/src/lib/analytics.ts` → **0**; none of the 7 events exist | keep |
| 123 | 10 | OPEN | `packages/decision-engine/` does not exist. `human_judgment` appears only in the pre-existing `packages/agent-intelligence/src/decision-detector.ts:175`, which is not the Path E signals-8-12 detector. Consistent with the #121 / #122 findings at loop 41 | keep |
| 125 | 13 | OPEN | `grep -rn "coOccur\|co-occurrence" packages apps/web-app/src --include=*.ts` → only a prose mention in `agent-intelligence/cross-workflow-analyzer.test.ts` | keep |
| 127 | 12 | OPEN | Dependencies present (`apps/web-app/package.json:34` `@xyflow/react`, `:36` `elkjs`) but **elkjs is entirely unused**: `grep -rn elkjs apps/web-app/src` → 0. No `app/(app)/workflows/[id]/process-map/page.tsx`, no `api/workflows/[id]/process-graph/route.ts`, no `components/process-map/` | keep |
| 129 | 13 | OPEN | `grep -rn "WorkflowMetricsOutputV3\|processConfidence\|3.0-norm" apps/web-app/src packages` → 0 | keep |
| 130 | 12 | OPEN | Only `lib/analytics.ts:42` `first_process_map_viewed` exists (emitted `:916`). **0 of the 12** named events (`process_map_node_clicked`, `variant_explorer_opened`, …) | keep |
| 132 | 11 | OPEN | `grep -rn "AI_classification\|deterministic_rule\|API_integration" packages apps/web-app/src --include=*.ts` → 0 | keep |
| 133 | 11 | OPEN | `find apps/web-app/src -iname "*PathComparator*"` → 0 | keep |
| 134 | 11 | OPEN | `grep -n "riskScore\|automationPotential\|deltaFrom" components/workflow-view/WorkflowVariantsMap.tsx` → 0 | keep |
| 135 | 10 | OPEN | `find apps packages -iname "*mermaid*" -o -iname "*agent-spec*"` → 0 | keep |
| 136 | 12 | OPEN | `grep -rn "ExecutionTheater\|replayMode" apps/web-app/src` → 0. The `requestAnimationFrame` hits in `WorkflowCanvas.tsx` are layout, not replay | keep |
| 146 | 12 | OPEN | `grep -rln "teams/join\|invite" apps/web-app/e2e` → **0**. No `e2e/workspace/` directory | keep |
| 148 | 13 | OPEN | `apps/extension-app/src/background/index.ts:526` `chrome.runtime.onInstalled.addListener(() => { loadSettings(); chrome.sidePanel.setOptions(…) })` — no telemetry emission. `grep -n extension_installed apps/web-app/src/lib/analytics.ts` → 0 | keep — **and see §6: an extension-surface row that is not CEO-blocked** |
| 149 | 12 | OPEN | `grep -n "DailyMetricsSnapshot\|daily_metrics_snapshot" apps/web-app/prisma/schema.prisma` → 0; no `apps/web-app/src/jobs/` directory | keep |
| 159 | 12 | OPEN | `app/(app)/account/page.tsx` — the only member-adjacent hit is `:491` `"Member since"`. `find -iname "UserManagementSection*"` → 0 | keep |
| 160 | 12 | OPEN | `find -iname "InviteTeammateForm*"` → 0 | keep |
| 169 | 12 | OPEN | The UI is an explicit placeholder: `admin-operations/user-detail/UserDetailActions.tsx:6` — *"All buttons are DISABLED placeholders. Real mutations ship in PR-9/PR-10."*; button `:27` `disabled`. Server side: `api/admin/users/[id]/route.ts:54-55` `/** Reserved for future schema extension. Always null until trialEndsAt is added to User. */ trialEndsAt: null`. No `extend-trial` route | keep |
| 170 | 11 | OPEN | Same file, `data-testid="action-adjust-quota"`, disabled placeholder. `find api/admin -ipath "*quota*"` → 0; `grep -rn admin_quota_set apps/web-app/src` → 0 | keep |
| 174 | 11 | OPEN | Infrastructure exists (`lib/compute-alerts.ts`, `api/admin/alerts/route.ts`, `api/admin/alerts/check/route.ts`) but no UI surface: `grep -n "computeAlerts\|AlertsStrip\|alerts" components/admin-operations/AdminOperationsDashboard.tsx` → **0**. The row is exactly right | keep |
| 178 | 10 | OPEN | `scripts/seed-demo-account.ts` exists (the cited precedent) but there is no reset counterpart; `grep -rn admin_demo_reset apps/web-app/src` → 0; no `api/admin/demo-account/` | keep |
| 191 | 10 | OPEN | `api/billing/checkout/route.ts:376-378` — `isTrialEligible = !user.stripeSubscriptionId && (user.subscriptionStatus === 'none' \|\| user.subscriptionStatus === null)`. Reverse-trial history is never consulted; `:387` still applies `trial_period_days`. The stacking the row describes is real | keep — gated on a CEO pricing decision |
| 212 | 11 | OPEN | P-5 not applied: the Bash `PreToolUse` blocklist in `.claude/settings.json` covers `curl`, `wget`, `rm -rf`, `sudo`, `git reset --hard` — **`git commit` is absent** | keep — correctly held for CEO; the agent must not self-approve an edit to its own permission config |

---

## 3. What the sweep says about the loop, not the rows

Nine SHIPPED rows were sitting in the open queue, five of them at score ≥ 12. Combined with #102,
**the backlog head was wrong about roughly one row in seven at score ≥ 10.**

The mechanism is now precisely identifiable. Every one of the nine was closed by work that was
*narrated* — in the `CLAUDE.md` Current Phase block, in `ITERATION_LOG.md` — and never struck in
`IMPROVEMENT_BACKLOG.md`. Four (#72, #74, #87, #97) are dashboard-v2 rows from the MDR / WDC / PIB
audit intakes; two (#172, #173) were closed by the admin-dashboard programme; #147 by the analytics
rewire; #4 and #6 by ordinary governance work nobody thought to reconcile.

**The narrative and the backlog are two write-paths to the same fact, and only one of them is
checked.** The iteration-log entry is written at loop close by the agent that did the work; the
backlog strike is a separate mechanical act with no gate enforcing it. Nothing in the control plane
fails when they diverge. SHIPPED rows therefore accumulate silently and *rise* in relative rank as
genuinely-open neighbours are closed around them.

---

## 4. Loops 39–41

**Loop 39** (screenshots / consent banner, score 9). Sound. It carried the `directed — self-filed`
label MR-029 required, verified by opening the regenerated PNG rather than trusting a green test, and
chose `'essential'` consent deliberately so captures would not record an analytics opt-in. It also
corrected MR-029 on the `product-manager` agent shadowing, with proof. Verdict: **legitimate**.

**Loop 40** (URL state, score 7). The strongest of the three. It caught the failure mode that matters
— 35 unit tests prove a parser, not the wiring — and added the round-trip browser test that is the
only one proving the feature's actual claim. It recorded a limitation (tier 2 of the precedence chain
collapses into tier 3) rather than hiding it. Verdict: **legitimate, high quality**.

**Loop 41** (backlog integrity, 0 product code). **Legitimate, but it stopped too early.** It was
forced, not chosen: applying P-11 to the top row disqualified it, and continuing to select would have
meant re-doing shipped work. Finding that is real work. But the loop then audited 14 of 117 rows,
declared the head clean, and deferred the remaining ~103 to a meta-review it scheduled itself.

This sweep shows what that cost: **nine more SHIPPED rows, five of them scoring ≥ 12**, including #74
(13) and #147 (13). The queue was not 1-row-wrong; it was 10-rows-wrong. A loop that discovers its
input data is corrupt and then samples 12% of it has not finished the job — it has established that
the job exists.

Not backlog-gardening *avoidance*, though. The distinguishing test is whether the gardening displaced
available product work, and it did not: the alternative was to build something already built. The
criticism is scope, not motive.

---

## 5. Follow-Up Debt ratio — recount over rows 185–224

40 rows in range. **32 struck (closed), 8 open** (#189, #190, #191, #193, #211, #212, #216, #223).

**Ratio = 32 / 40 = 0.80** (MR-029: 0.75).

Eight rows are struck but retain a residual `open` string in the trailing status column (#198, #200,
#214, #217, #218, #220, #222, #224). Each was inspected; each carries an explicit closure in the row
body (e.g. #198 "done (2026-09-23 loop 40)", #200 "CLOSED (2026-09-20 loop 33): the suite is 150/150
green"). They are genuine closures, not the staleness defect.

**None of the nine rows this sweep recommends striking falls in 185–224**, so the ratio is not
inflated by the staleness finding — it is a true 0.80 for this range.

**But the number means less than it looks.** Rows 185–224 are almost entirely *self-filed during the
recent loop series*: filed and closed within a handful of loops by the same process. They close fast
by construction. The ~103 unaudited rows below 185 — mostly audit-intake promotions from months ago —
are not in the denominator at all. 0.80 measures the throughput of recent self-generated work; it
says nothing about the standing debt, where this sweep just found a ~13% phantom rate. **Two
different quantities are being reported under one name.**

---

## 6. Is D-1 now actively harmful?

**Yes — it is suppressing a real signal, and the justification MR-029 used to declare it inert is
false.**

MR-029 ruled D-1 (reverse portfolio drift, tripped 7+ loops) inert on the grounds that "the only open
extension row is CEO-blocked" (#216). Loop 39's entry repeats it. That claim does not survive the
sweep:

- **#148 (ADMIN-P02, score 13) is an extension-surface row, genuinely open, and not CEO-blocked.**
  Its first sub-task is adding a telemetry emission to the `chrome.runtime.onInstalled` listener at
  `apps/extension-app/src/background/index.ts:526`. Selecting it clears D-1 legitimately.
- **#13 (score 10)** also carries live extension-surface residue (SW-interruption recovery UX).

So D-1 has been firing correctly for seven loops — there *is* untouched extension work — while the
coordinator, reasoning from an unaudited backlog, concluded the rule was crying wolf and stopped
treating it as information. That is the specific harm: **a true signal was reclassified as noise
because the evidence needed to act on it sat in rows nobody had checked.** The rule was not broken;
its input was.

There is a second-order cost. Every loop now logs a D-1 acknowledgement that changes nothing, which
trains the operator to skip the line. When D-1 eventually flags something urgent, the acknowledgement
will already be reflexive.

**Recommendation: do not retire or weaken D-1.** Correct the record — #148 is a clearing path — and
let loop 42 or 43 clear it by selecting extension work. If D-1 still fails to clear after that, the
rule can be re-examined against evidence rather than against a premise.

---

## 7. Loop 42 endorsement

After the sweep, the score-ordered genuinely-open head is:

| Rank | Row | Score | Status after sweep |
|---|---|---|---|
| 1 | **#108** SOPPM-P02 — variant confidence badge + N-attribution on the SOP cover | **16** | verified open at loop 41 (no SOP confidence badge); undisturbed by this sweep |
| 2 | **#95** PIB-P09 — `chipsRenderedCount` denominator in `dashboard_v2_viewed` | **15** | verified open at loop 41; unblocks the external-launch chip-click-rate gate |
| 3 | **#171** ADM-002 PR-11 — inject `referenceNowMs` into admin `queries.ts` | **15** | verified open at loop 41; prerequisite for #150 |

*(#107, also 16, is now correctly an Open-Graph-and-growth-loop row after loop 41's re-scope and is
smaller than its score implies. It should be re-scored before it is selected.)*

**Coordinator recommendation — take #148 (13) first.** Three reasons, in order: it is the only way to
clear D-1 honestly (§6); it is genuinely open with a one-line evidence anchor; and at score 13 it is
not a meaningful sacrifice against a 15–16 head whose top entries are instrumentation and copy. If
D-1 is to be a control rather than decoration, loop 42 is when that gets settled.

**Highest-integrity alternative if product value alone decides: #110 (13)** — three confirmed
violations of a Ledgerium *core* invariant (determinism) at exact `file:line`, on a user-visible
surface, ~80 LOC, no dependencies. It is the cleanest open row in the pool.

**Do not select by raw `top-score` until the §2.1 strike list is applied.** Nine of the rows the rule
can currently reach are finished work.

---

## 8. Findings summary

1. **Nine SHIPPED rows** (§2.1) sit open in the backlog; five score ≥ 12. Strike them.
2. **Eighteen rows are PARTIAL** (§2.2) — filed wider than reality, the same defect loop 41 found in
   #107 and #176, at six times the incidence. Re-scope in place.
3. **Forty-two rows are genuinely open** with cited evidence. Below the strike list, the queue is
   trustworthy.
4. **The write-path gap is structural**: closure is recorded in the narrative and never reconciled to
   the backlog, and nothing fails when the two diverge.
5. **Follow-Up Debt 0.80 over 185–224** (from 0.75) — real for that range, but it measures recent
   self-filed throughput, not standing debt.
6. **D-1 is not inert.** #148 is an open, unblocked extension row. MR-029's premise was wrong.
7. **Loop 41 was legitimate and incomplete.** A 12% sample; the remaining 88% held nine more phantoms.

---

## CEO decisions requested

1. **Apply the §2.1 strike list (9 rows: #4, #6, #72, #74, #87, #97, #147, #172, #173)?**
   Each carries a `file:line` proof. Approve as a block, or name any you want re-verified individually.

2. **Apply the §2.2 re-scopes (18 rows)?** These change row *text*, not score. Two need a score
   revision as well and are flagged: **#8** (11 unguarded routes → 25) and **#107** (16 is now too
   high after loop 41's re-scope). Approve as a block, or defer re-scoping to the selecting loop.

3. **Close the write-path gap — which mechanism?**
   (a) a loop cannot close while its iteration-log entry names a row that is not struck in the
   backlog; (b) a standing rule extending P-11 to the write side — verify before selecting *and*
   strike on close; (c) a periodic sweep on a fixed cadence. **Recommended: (a)**, because it is the
   only one that fails loudly rather than relying on diligence. (a) edits `CLAUDE.md`, so it is yours.

4. **D-1 — correct the record rather than retire the rule?** This requires acknowledging that
   MR-029's "the only open extension row is CEO-blocked" was wrong, and that #148 clears it. The
   alternative is keeping D-1 flagged-and-ignored, which I recommend against for the reasons in §6.

5. **Loop 42 selection — #148 (clears D-1) or #108 (top score)?** My recommendation is #148, with
   #110 as the alternative if product value alone decides.

6. **#191 — the reverse-trial + card-trial stacking is confirmed real** at
   `api/billing/checkout/route.ts:376-387`. It needs your pricing decision (options a / b / c in the
   row) before any loop can select it. This is a live chargeback exposure, not a hypothetical.

7. **#212 P-5** remains deliberately unapproved — it edits the agent's own permission config to block
   `git commit`. Still yours to decide. Verified not applied.
