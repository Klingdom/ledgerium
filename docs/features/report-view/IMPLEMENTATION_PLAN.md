# Report Consolidation — Complete Implementation Plan

**Date:** 2026-06-08 · **Authors:** system-architect, frontend-engineer, qa-engineer, devops-engineer (multi-agent).

> ## ✅ STATUS — Slice 1a SHIPPED on branch `feat/report-consolidation` (not pushed, not deployed)
> **2026-06-08:** deleted dead `InterpretationTab.tsx` (zero importers on the 2-view lineage) + version-controlled the smoke gate. Gates: **typecheck ✓ · web-app tests 1310/1310 ✓ · `next build` ✓ · hydration smoke 5/5 ✓.** Commits `6a55612`, `c9a4988`.
> **Evidence-driven re-scope:** the original "extend smoke gate to the Analysis view via `/share/[token]`" step was based on a *wrong assumption* — verified that `/share/[token]` renders the legacy `ReportTab`, **not** the Analysis `WorkflowReportPage`, and the real Analysis route `/workflows/[id]` is **auth-gated**, while the smoke config is public-only by design. Covering it requires an **auth + seeded-workflow harness** → split out as **Slice 1b** (§10). Slice 1a deploys nothing and adds no prod risk.
>
> ## ✅ STATUS — Slice 1b SHIPPED (2026-06-09, same branch, not pushed)
> Authenticated Analysis-view hydration gate. The harness creates the populated sample workflow **server-side** via `POST /api/sample-workflow` (no app-module imports in test code), logs in a seeded user, loads the Process view, switches to **Analysis**, and asserts `WorkflowReportPage` renders (`rpt-*` present) with **zero hydration/client-side exceptions** in a prod build. **Gate: 7/7 pass in 49s** (5 public + auth setup + authed Analysis) · typecheck ✓. Commit `1145a5d`. This is now the per-slice runtime gate for all later Report slices.
>
> ## ✅ STATUS — Slice 2 SHIPPED (2026-06-09, same branch, not pushed)
> Added the `rpt-metrics` **Run Metrics** section to `WorkflowReportPage` (steps analyzed · avg step · active step time · **longest step + its % of process time** = the highest-leverage signal). It prefers the authoritative `insights.timeBreakdown` (migrated from `InsightsPanel`) and otherwise computes the figures deterministically from `processOutput` step durations, so it renders for single-run workflows too. Pure render → hydration-safe; gated in `visibleSections` so it never shows empty. Deleted dead `InsightsPanel.tsx`. **Gates: typecheck ✓ · tests 1310/1310 ✓ · build ✓ · smoke 7/7 ✓** (the authed Analysis test now renders `rpt-metrics` for the sample). Commit `6bd09c9`. **Deferred (Slice 2c):** the hero-prose lead sentence + standalone `rpt-lead` callout — they restructure the existing hero, so they carry more regression risk than the additive section work and are split out.
>
> ## ✅ STATUS — Slice 2c SHIPPED (2026-06-09, same branch, not pushed)
> Finished Slice 2's vision **additively** (no hero restructure): the hero now carries a deterministic interpretive lead sentence under the title (steps · systems · phases · duration · confidence), and a prominent `rpt-lead` **"Start here"** callout sits directly beneath it, naming the step that owns the most process time. Extracted a shared `deriveTimeLeverage()` helper (single source of truth for `rpt-lead` + `rpt-metrics`; prefers `insights.timeBreakdown`, else computes from `processOutput`) and removed the now-duplicate subtle line from Run Metrics. `rpt-lead` gated to show only with a clear ≥25% leader. **Gates: typecheck ✓ · tests 1310/1310 ✓ · build ✓ · smoke 7/7 ✓** (authed Analysis renders hero sentence + `rpt-lead` + `rpt-metrics`). Commit `b3852f4`.
>
> ## ✅ STATUS — Slice 3 SHIPPED (3a + 3b) (2026-06-09, same branch, not pushed)
> Migrated the Intelligence story into the Report and retired the duplicate tab. **3a** (`214793e`): added `rpt-variance` (sequence stability · duration CV · high-variance count · variant distribution with standard-path %/per-variant frequency) and `rpt-timestudy` (per-step mean/median/p90) — both **multi-run only**, with an honest "record again to unlock" nudge at one run; typed the previously-`any` intelligence payload. **3b** (`0db3825`): removed the `IntelligenceTab` fold from the Analysis view and **deleted `IntelligenceTab.tsx`**, preserving its cross-run metrics (runs · completion · median duration) inside `rpt-variance` so **no functionality was lost**. **Gates (each commit): typecheck ✓ · tests 1310/1310 ✓ · build ✓ · smoke 7/7 ✓.** Note: the populated multi-run path isn't smoke-covered (the seeded sample is single-run) — a 2-run smoke fixture would close that gap (candidate future harness work).
>
> ## ✅ STATUS — Slice 4 SHIPPED (4a + 4b) (2026-06-09, same branch, not pushed)
> Migrated the AI-Agents content into the Report and retired the last duplicate tab. **4a** (`97f17dd`): added `rpt-agents` (composed-agent cards: role · capability · systems · task/skill counts), `rpt-skills` (skills table + unique/reusable counts), `rpt-integrations` (integrations table + risks list + overall-risk banner), `rpt-roadmap` (phased timeline); typed the previously-`any` agent payload. **Deliberately did NOT migrate** the `toLocaleString(processedAt)` footer (hydration hazard) or the buggy `SummaryBanner` (read `result` not `resolved`) — both erased by deletion. **4b** (`7c87d92`): removed the `AgentIntelligenceTab` fold and **deleted the file**; the Analysis view is now a single consolidated `WorkflowReportPage` + raw evidence. The sample renders all four agent sections, so this slice's render paths ARE smoke-covered. **Gates (each commit): typecheck ✓ · tests 1310/1310 ✓ · build ✓ · smoke 7/7 ✓.**
>
> **Consolidation status:** the 8 original detail tabs are now 2 views (Process | Analysis); InterpretationTab, InsightsPanel, IntelligenceTab, AgentIntelligenceTab all retired; the Report is the single analytical surface. Remaining: **Slice 5** (evidence drill-down + ROI/confidence banding) and the deferred **Slice 6** (optional file split). Still nothing deployed — the production flash remains the only deploy gate.
>
> ## ✅ STATUS — Slice 5 SHIPPED (2026-06-09, same branch, not pushed) — CONSOLIDATION COMPLETE
> `rpt-automation` now carries **confidence banding** ("Estimates based on N recorded run(s) · low/medium/high confidence", with a "record again to sharpen" nudge at one run) — the evidence basis of the estimates made explicit; turns a raw score into an honest budget conversation. Commit `a1273c6`. **Gates: typecheck ✓ · tests 1310/1310 ✓ · build ✓ · smoke 7/7 ✓.**
> **Honestly deferred (Slice 5d, data slice):** run-grain evidence drill-down ("click to the runs that produced this finding") and hrs/month ROI — the opportunity payload carries no per-finding run IDs or run cadence, so these require an API/data-layer change, out of the presentation-only scope of this plan. Insight-level evidence is already shown via `InsightActionCard`.
> **All presentation slices (1–5) are done.** The only remaining items are the optional **Slice 6** (file split) and the **Slice 5d data slice** — neither blocks the consolidation, which is functionally complete on `feat/report-consolidation`. Nothing deployed; the flash is still the sole deploy gate.
>
> ## ✅ STATUS — Multi-agent review + Slice 7 review-fixes SHIPPED (2026-06-09, same branch, not pushed)
> Ran a 4-agent review (qa / frontend / ux / system-architect) over the consolidation. **Flash verdict: NOT reintroduced** — independent hydration audit + frontend-engineer's verdict + smoke 7/7 all agree; `layout.tsx` (the Umami source) is untouched and the consolidation net-*removed* a `toLocaleString` hazard. **No P0 bugs.** **Slice 7** (`47506ec`) fixed the 8 concrete code findings: memoize `visibleSections` (scroll-spy churn); add nav gates for `rpt-scores`/`rpt-phases`/`rpt-structure`; precompute Step-Breakdown phase dividers (no `let`-in-map); stable Insights keys; drop invalid `border-current/20`; "Process Intelligence"→"Process Health"; export `?? null` guard; hero `h1`→`h2` + remove dead `report`/`sop` props + `mainRef`. **Gates: typecheck ✓ · tests 1310/1310 ✓ · build ✓ · smoke 7/7 ✓.**
>
> **Best flash lead from the review (NOT fixed here — belongs to the flash investigation):** `src/lib/format.ts:18` `formatDate()` uses `toLocaleDateString()` **without a fixed timezone**, rendered on the SSR detail-page header (`page.tsx`, `workflow.createdAt`). **Pre-existing** (predates this branch), but it's a TZ-dependent SSR render the **smoke gate cannot catch** (server+client same machine) and is exactly the environment-flash class (VPS UTC vs user-browser TZ near a day boundary). Top candidate root cause for the real flash; one-line fix (`timeZone:'UTC'` or numeric format) when the flash is tackled.
>
> **Deferred (UX judgment calls, separate slice):** section reorder (metrics/variance cluster before Insights; Bottlenecks before Automation), remove "Start Here" from the TOC, group the 17-item TOC into Analysis/Recommendations/Evidence, "Analysis" tab label, Start-Here↔Run-Metrics longest-step redundancy. **Architecture (worthwhile, not urgent):** move payload interfaces to a shared engine-derived module; type the `page.tsx` `any` data boundary; verify `skillName` vs engine `name`.

> ## ⛔ THE ONE RULE
> **Building this feature is low-risk. Deploying ANYTHING to production is NOT safe yet** — because the "flash → unstyled" crash is an **unsolved, environment-level deploy bug** independent of this feature. This plan delivers a fully-built, fully-validated feature **on a branch**. It does **not** authorize a production deploy. **Demo from a local production build, never from a fresh prod deploy, until the flash is root-caused with live evidence.**

---

## 1. Build vs. Deploy — two independent tracks

| | **Build track (this plan)** | **Deploy track (blocked, separate)** |
|---|---|---|
| Goal | A perfect, validated Report on a branch | A safe production release |
| Gate | typecheck + test + build + Playwright smoke (local) | flash root-caused + DB backup + staging-smoke-green + manual verify |
| Blocker | none | the **unsolved environment flash** |
| Prod impact | **zero** (never merged to `main`/deployed) | — |

The feature's completeness does **not** unblock deploy. The 8-tab `main` snapshot stays the live product until the flash is solved.

---

## 2. The slices (ordered, independently shippable, individually reversible)

Each slice = one branch off the prior, one PR, **all gates green (§5) before the next starts.** Rule: **additive-then-retire** — a duplicate render path is never deleted until its typed replacement renders and passes the gate.

| Slice | Scope | Files touched | Retire (after replacement is gate-green) | Risk |
|---|---|---|---|---|
| **1a ✅** | Delete dead code + version-control the smoke gate | delete `InterpretationTab.tsx`; add `playwright.smoke.config.ts` + `e2e/smoke/hydration.smoke.spec.ts` to VCS | `InterpretationTab.tsx` | Low |
| **1b ✅** | Extend the smoke gate to the **authenticated Analysis view** (§10) | `playwright.smoke.config.ts` (+globalSetup +projects), `e2e/smoke/{analysis.smoke.spec,auth.smoke.setup,global-setup-smoke}.ts`, `seed-smoke-user.js` | — | Med |
| **2 ✅** | `rpt-metrics` Run Metrics (steps/avg/active-time + **longest-step leverage**, prefers `timeBreakdown` else computes from `processOutput`) + delete dead `InsightsPanel` | `WorkflowReportPage.tsx` | `InsightsPanel.tsx` ✓ | Low |
| **2c ✅** | Hero interpretive lead sentence (additive) + standalone `rpt-lead` "Start here" callout + shared `deriveTimeLeverage` helper | `WorkflowReportPage.tsx` | — | Low (additive; no hero restructure) |
| **3a ✅** | `rpt-variance` (variance + variant distribution; multi-run, honest single-run nudge) + `rpt-timestudy` (per-step mean/median/p90, multi-run) + typed intelligence payload | `WorkflowReportPage.tsx` | — | Med |
| **3b ✅** | Retire `IntelligenceTab` (remove fold from `page.tsx` + delete file); preserve its cross-run metrics in `rpt-variance` | `WorkflowReportPage.tsx`, `page.tsx` | `IntelligenceTab.tsx` ✓ | Med |
| **4a ✅** | `rpt-agents` + `rpt-skills` + `rpt-integrations` + `rpt-roadmap` (typed agent payload; toLocaleString footer + buggy SummaryBanner NOT migrated) | `WorkflowReportPage.tsx` | — | Med |
| **4b ✅** | Retire `AgentIntelligenceTab` (remove fold from `page.tsx` + delete file) | `page.tsx` | `AgentIntelligenceTab.tsx` ✓ | Med |
| **5 ✅** | Automation **confidence banding** (evidence basis = recorded-run count). Run-grain evidence drill-down + hrs/mo ROI **deferred** (need per-finding run IDs + cadence = data-layer change, out of presentation-only scope) | `WorkflowReportPage.tsx` | — | Low (additive) |
| **5d** | Evidence drill-down (run IDs/step sequences per finding) + hrs/mo ROI — **data slice** (requires API to thread per-finding run linkage + run cadence) | API + `WorkflowReportPage.tsx` | — | Med-High |
| **6** (opt) | Extract `WorkflowIntelligenceSections.tsx` (byte-identical refactor) | new file + `WorkflowReportPage.tsx` | — | Low |

**Final `SECTION_IDS` order:** `rpt-hero · rpt-lead · rpt-scores · rpt-phases · rpt-metrics · rpt-timestudy(gated) · rpt-variance(gated runCount>1) · rpt-steps · rpt-structure · rpt-rework(gated) · rpt-bottlenecks · rpt-insights · rpt-automation · rpt-agents(gated) · rpt-skills(gated) · rpt-integrations(gated) · rpt-roadmap(gated)`. Right-rail TOC grouped into **Analysis / Recommendations / Evidence**.

**Net:** ~600 LOC, **mostly recomposition** (lift section components verbatim from the tabs). No schema/API change. `WorkflowReportPage` grows ~1170→~1720 LOC (split is optional Slice 6).

---

## 3. Type contracts to add (the real risk surface — front-loaded into typecheck)

The tabs pass `metrics/timestudy/variance/variants/agentComposition/...` as `any`. Migrating = **promoting those to named optional interfaces** on `WorkflowReportPage` (no runtime change; the shapes already exist at runtime). Add to `IntelligenceData`: `metrics`, `timestudy` (incl. `totalDuration` mean/median/p90/max), `variance` (sequenceStability, durationVariance.coefficientOfVariation, highVarianceSteps), `variants` (variantCount, variants[] with isStandardPath/frequency/runCount/pathSignature.signature). Add to `AgentIntelligenceData`: `agentComposition`, `skillLibrary`, `integrationRisk`, `artifacts.roadmap`, `metadata`. Add to `InsightsData`: `timeBreakdown`. **All optional** → existing callers keep typechecking. The `any` is removed structurally when the tab files are deleted.

---

## 4. 🔴 Hydration / flash-prevention audit (run on every `WorkflowReportPage` diff)

`WorkflowReportPage.tsx` is **clean today** (grep-verified: no `process.env`, no `new Date()`/`Math.random()` in render, no `dangerouslySetInnerHTML`, no `typeof window`/`useLayoutEffect`). The job is to **keep it clean.** Per slice, confirm:
- [ ] Still `'use client';` — **no new server-component boundary**, no `async` component, no server-only import pulled in.
- [ ] **No `process.env.NEXT_PUBLIC_*`** in render (the prime flash suspect — build-vs-runtime divergence).
- [ ] **No `new Date()`/`Date.now()`/`Math.random()`** in render. **⚠ Do NOT migrate `AgentIntelligenceTab`'s `new Date(metadata.processedAt).toLocaleString()` (line ~662)** — it's locale/TZ-divergent (hydration-mismatch). Drop the metadata line, or use the deterministic `formatDate` from `@/lib/format`.
- [ ] **No `dangerouslySetInnerHTML`.** Recorded strings render as JSX text (auto-escaped) — keep it that way.
- [ ] **No `typeof window`/`useLayoutEffect`** branching that diverges server vs client.
- [ ] Every new section handles `null`/empty data without throwing (a thrown render IS the unstyled-crash class) — reuse the existing per-section `SkeletonCard`/`visibleSections`-gate pattern.
- [ ] No new top-level dependency import (don't change the build graph).
- [ ] `useScrollSpy`/`useCountUp` stay client-only (already `useEffect`-gated, deterministic initial state — confirmed safe). New sections don't add hook usage.
- [ ] typecheck + smoke gate green = empirical proof the above held.

---

## 5. Verification gate per slice (MANDATORY — all green before "done")

Run in order. **Build-passing ≠ working; the smoke gate is the validation of record.**
1. `pnpm typecheck` (root) → exit 0. *(Catches the `any→typed` contract regressions — the main risk.)*
2. `pnpm test` (root) → all pass, zero new failures. *(+ new render tests per §6.)*
3. `pnpm --filter ./apps/web-app build` → exit 0.
4. **Playwright hydration smoke gate** — build **without** umami vars, run the smoke config (webServer sets umami at runtime → reproduces the asymmetry):
   ```
   cd apps/web-app
   DATABASE_URL=file:./smoke.db NEXTAUTH_SECRET=smoke-secret-not-for-prod npx next build
   npx playwright test --config playwright.smoke.config.ts
   ```
   **Slice 1 extends this gate to load a workflow detail/Analysis page** (use a seeded `/share/[token]` route to avoid auth), asserting: no console/hydration error, no "Application error", and **each `rpt-*` section id present** (existing + the slice's new ones). Every later slice is then smoke-covered.
5. **Manual checks** (against `next start` of the build, NOT `next dev`) — see §6 checklist.

Gate failure → **revert-first**, don't patch forward.

### New-section unit/render tests (per slice, jsdom, before merge)
For each new section: **data-present**, **single-run/empty** (variance/timestudy must SUPPRESS on 1 run — honest-stats; a P0 if violated), **multi-run**, **null lazy data** (renders SkeletonCard + CTA, no crash), **XSS** (a step title `<script>` renders as text, not markup). Plus a **section-presence lock** test (all existing `rpt-*` ids still in the DOM) so a rename/removal fails fast. No brittle HTML snapshots.

---

## 6. Demo-safe path (no production deploy)

**Recommended for an imminent demo — local production build:**
```
cd apps/web-app
DATABASE_URL=file:./smoke.db NEXTAUTH_SECRET=demo-local npx next build
npx playwright test --config playwright.smoke.config.ts   # must be GREEN
npx next start -p 3000                                     # demo from http://localhost:3000
```
If the smoke gate fails, **stop — do not demo this build.** Alternative: build the Docker image and run it locally (`docker run -p 3001:3000 …`) for a closer-to-VPS check. **Keep prod on the working snapshot, untouched.**

**Pre-demo checklist (all must be green):** typecheck ✓ · test ✓ · build ✓ · smoke ✓ · single-run page (rpt-variance/timestudy suppressed, console clean) ✓ · multi-run page (variant story renders, run counts inline, console clean) ✓ · no-analysis page (agent sections show CTA, no crash) ✓ · Process/SOP/dashboard visually unchanged ✓ · running `next start` not `next dev` ✓ · **no prod deploy planned before flash solved** ✓.

---

## 7. Deploy pipeline — ONLY when the flash is solved

**Prerequisite (unblocks deploy):** reproduce the flash on a staging instance that mirrors the VPS (cheap: a `compose.staging.yaml` service running a pushed `:<sha>` image with umami vars set at runtime), capture the **live console error + Network 404**, confirm the cause (suspected: SSR-emitted Umami `<script>` from `NEXT_PUBLIC_UMAMI_*` set at runtime but not at build → hydration mismatch; fix = load Umami in `useEffect` only — already drafted in the smoke spec), apply fix, **prove with the smoke gate against the container.** Don't declare it solved on a local `next start` pass alone.

**Gated sequence (each step is a stop-gate):**
1. **DB backup** on the VPS, copied off-container, verified non-zero. *(Stop if it fails.)*
2. **Deploy to staging** (the `:<sha>` image; hardened `docker-start.sh` with backup-on-boot + **no `--accept-data-loss`**). Confirm logs: `DB backed up:` + `Database ready`, no `FATAL`.
3. **Smoke gate green on staging** in a real browser (all routes incl. dynamic `/share/`). + 2-min manual check: no flash, no console errors, no asset 404s.
4. **Manual functional verify** the Report feature on staging (run the actual demo there first).
5. **Prod deploy** — pull the **`:<sha>` tag** (not `latest`), swap the container, `ledgerium-data` volume preserved.
6. **Verify prod** immediately (browser + smoke against live domain).

**CI hardening:** add a smoke-gate step to `quality-gate` in `deploy.yml` (build-without-umami → smoke-with-umami) so `build-and-push` can't ship a hydration-crashing image. *(`build-and-push` already `needs: quality-gate`.)*

**Hard "DO NOT DEPLOY IF":** flash not root-caused with real evidence · smoke skipped or any failure · no verified DB backup · candidate image's `docker-start.sh` still contains `--accept-data-loss` (verify: `docker run --rm --entrypoint cat …:<sha> /app/start.sh | grep accept-data-loss` returns empty) · within ~2 hours of a demo · stacking on a <24h-old unverified deploy.

---

## 8. Rollback (one step — CI tags every build with `:<sha>`)
```
docker stop ledgerium-ai && docker rm ledgerium-ai
docker run -d --name ledgerium-ai --restart unless-stopped -p 3000:3000 \
  -v ledgerium-data:/app/data --env-file /etc/ledgerium/prod.env \
  ghcr.io/klingdom/ledgerium:<PREVIOUS_SHA>
```
Volume (DB) preserved. **Worst case (DB corrupted):** copy the pre-deploy backup over `ledgerium.db` + restart (the boot script also keeps 10 rolling backups). Maintain a `DEPLOY_LOG.txt` of the last 3 SHAs so the previous tag is at hand.

---

## 9. Effort + the recommended first slice
~**12–15 hrs** across 6 reversible slices (mostly recomposition; per-slice time is dominated by running the 4-gate sequence). **D-4 clause 1** (≥3 new user-visible section strings) → `growth-strategist` brand-voice adjacency on slices 2–4.

**Slice 1a — DONE (2026-06-08, branch `feat/report-consolidation`).** Delete `InterpretationTab.tsx` + version-control the smoke gate. All four gates green (typecheck · 1310 tests · build · 5/5 smoke). Not pushed, not deployed.

---

## 10. Slice 1b — authenticated Analysis-view smoke coverage ✅ DONE (2026-06-09)

**Built exactly as specced below. Gate: 7/7 pass in 49s; typecheck ✓; commit `1145a5d`. No deploy.**

**Why split:** the smoke config is **public-pages-only by design** (no `globalSetup`, no auth; `smoke.db` carries no workflows). The Analysis view lives at the **auth-gated** `/workflows/[id]`, and `/share/[token]` renders the *legacy* `ReportTab`, not `WorkflowReportPage` — so there is no public surface to bolt onto. Real coverage needs a small, careful harness; rushing it into 1a would have added a flaky infra surface (the exact "new issue" risk to avoid).

**Build spec (Med risk, isolated to test infra — no app code):**
1. **Smoke seed** — new `e2e/smoke/seed-smoke-db.js` (mirrors `seed-test-db.js`): one `growth` user **and one workflow with a complete `ProcessOutput` + intelligence + agent payload** so the Analysis view renders *populated* (an empty render won't exercise the real hydration path). Source the payload from a committed fixture (e.g. one of `fixtures/workflows/*.json`) for determinism.
2. **Auth** — add a `globalSetup` to `playwright.smoke.config.ts` that seeds `smoke.db` then mints a NextAuth session `storageState` (replicate `auth.setup.ts` against the prod build on :3099), gated behind a second Playwright project so the existing public tests stay auth-free.
3. **Spec** — new `e2e/smoke/analysis.smoke.spec.ts`: load `/workflows/{seededId}` (Analysis view), assert the same hydration/crash predicates **plus** each `rpt-*` section id is present and `<body>` is non-trivial. This becomes the per-slice runtime gate every later Report slice (2–6) depends on.
4. **Determinism guard** — assert no `Text content does not match` console error specifically on this route (catches the `toLocaleString()`-class hazard before any agent content migrates).

**Acceptance:** the new authed smoke test passes against a no-umami prod build; the 5 public tests still pass; total run < 90 s. Still **no deploy.**

---
*Per `docs/meta/SESSION_RETRO_AND_GUARDRAILS_001.md`: this feature adds no new prod risk and no new prod safety. The risk is the unsolved environment flash; the only path through it is evidence, not confidence.*
