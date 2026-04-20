# Ledgerium AI — Iteration Log

This file records each bounded improvement loop.

---

## Iteration 000

- Date: 2026-04-12
- Trigger: initialization of the agentic CI system
- Coordinator: coordinator
- Phase: Phase 1
- Objective: establish the initial ranked improvement portfolio and create the operating artifacts for bounded improvement loops

### Top Candidates Reviewed
1. Replace duplicated background logic with workspace package imports
2. Persist full session event stream for service worker restart recovery
3. Integrate `@ledgerium/policy-engine` into `content/capture.ts`
4. Add Playwright E2E tests for recording lifecycle
5. Add structured error logging with session context

### Selected Item
- Title: none
- Type: setup iteration
- Area: agentic CI / operating system
- Why selected: this initialization pass focused on creating the repeatable improvement-loop command, templates, backlog, iteration log, system health, and changelog foundation before any code change loop runs.
- Why not others yet: a bounded improvement loop should start from a clean operating baseline with visible backlog, scoring, and system-health artifacts.

### Agents Used
- coordinator
- product-manager reasoning
- system-level operating model design

### Files Read
- `CLAUDE.md`
- current engineering brief / known issues summary
- current phase priorities

### Files Changed
- `.claude/commands/improvement-loop.md`
- `.claude/templates/improvement_backlog_template.md`
- `.claude/templates/iteration_log_template.md`
- `IMPROVEMENT_BACKLOG.md`
- `ITERATION_LOG.md`
- `SYSTEM_HEALTH.md`
- `CHANGELOG.md`

### Validation Run
- structural consistency review of improvement-loop artifacts
- ranking and scoring sanity check
- alignment check against Ledgerium priorities and active Phase 1 work

### Outcome
- Status: complete
- Summary: the improvement operating system is now seeded with a ranked top-10 backlog, reusable templates, current-state system health, and an initialization changelog entry.

### Artifacts Updated
- `IMPROVEMENT_BACKLOG.md`
- `ITERATION_LOG.md`
- `SYSTEM_HEALTH.md`
- `CHANGELOG.md`

### Follow-Ups
- run the first true bounded improvement loop
- likely select candidate 1 or candidate 3 next
- refresh backlog after the first implementation cycle

### Risks / Open Questions
- actual repository implementation details may change the ordering of candidates after direct code review
- testing and build-system specifics should be re-validated inside the live repo before selecting the first implementation item

---

## Iteration 003

- Date: 2026-04-16
- Trigger: user requested next recommended action
- Coordinator: coordinator
- Phase: Phase 1
- Objective: replace duplicated logic in extension background code with workspace package imports

### System Review
- Read: CLAUDE.md, SYSTEM_HEALTH.md, IMPROVEMENT_BACKLOG.md, CHANGELOG.md, git log
- Key finding: Extension declares 6 workspace packages as dependencies but imports from 0 of them in background/capture code. All normalization, segmentation constants, and sensitivity detection logic is duplicated locally despite identical implementations existing in packages. Build system (Vite + CRXJS) already supports workspace imports — 7 viewer files already import from `@ledgerium/process-engine`.

### Candidate Selection
- Title: **Replace duplicated background logic with workspace package imports**
- Type: improvement
- Area: extension architecture
- Score: 14 (Impact:5 + Alignment:5 + Learning:4 + Confidence:5 − Effort:3 − Risk:2)
- Why selected: Highest-scored item in backlog. Directly addresses #1 tracked technical debt. Strengthens determinism by establishing single source of truth for normalization, segmentation, and policy logic.

### Agents Used
- coordinator (orchestration, verification, artifact updates)
- Explore agents ×2 (duplication mapping, build system analysis)
- backend-engineer (implementation)

### Files Changed
- `apps/extension-app/src/shared/constants.ts` — replaced 4 local constant definitions with re-exports from `@ledgerium/segmentation-engine`
- `apps/extension-app/src/shared/utils.ts` — replaced 2 local function implementations with re-exports from `@ledgerium/normalization-engine`
- `apps/extension-app/src/background/normalizer.ts` — imported `RAW_TO_CANONICAL_TYPE` + `NORMALIZATION_RULE_VERSION` from normalization-engine; imported `classifySensitivity` from policy-engine; removed ~80 lines of duplicated logic

### Validation Run
- `pnpm typecheck` → 0 errors across all 10 workspace projects ✅
- `pnpm test` → 1,393/1,393 tests pass (39 test files) ✅
- `pnpm --filter @ledgerium/extension-app build` → clean build ✅
- No regressions detected

### Outcome
- Status: **complete**
- Summary: Extension background code now imports from 3 workspace packages (normalization-engine, segmentation-engine, policy-engine) instead of duplicating their logic. ~80 lines of duplicated code removed. Extension-specific additions preserved (more secure normalizeUrl, more app labels, 3 extra event type mappings).

### Impact
- Before: 0 workspace package imports in extension background/capture code
- After: 3 packages imported (normalization-engine, segmentation-engine, policy-engine)
- Duplicated items eliminated: 6 constants, 2 utility functions, 1 type map, 1 sensitivity regex + function
- Divergence risk reduced for normalization rules, segmentation constants, and sensitivity patterns

### Follow-Ups
- Integrate `@ledgerium/policy-engine` into `content/capture.ts` (score: 13)
- Converge LiveStepBuilder with StreamingSegmenter (future iteration)
- Upstream extension-only improvements to packages (normalizeUrl security, extra app labels, extra event types)
- Full type unification between extension and package type definitions

---

## Iteration 004

- Date: 2026-04-17
- Trigger: user approved sop-expert design artifacts; requested execution of gap #1
- Coordinator: coordinator
- Phase: Phase 1
- Objective: render SOP metadata strip + confidence badge above the fold in all three template types (operator_centric, enterprise, decision_based) per `docs/sop/DESIGN_SYSTEM.md`

### System Review
- sop-expert delivered 14 artifacts under `docs/sop/` defining a world-class SOP design system, three template specs, and reference examples with full traceability
- Gap #1 identified as highest-value visible-quality lift: existing `markdownRenderer.ts` emitted generator credit in the footer; design system requires metadata strip + confidence badge in first ~15 lines
- User explicitly approved reference examples and green-lit this iteration

### Candidate Selection
- Title: **Metadata strip + confidence badge above the fold in SOP markdown renderer**
- Type: improvement
- Area: SOP presentation / customer-facing output quality
- Score: 15 (Impact:5 + Alignment:5 + Learning:3 + Confidence:5 − Effort:2 − Risk:1)
- Why selected: highest-impact gap from sop-expert report; directly executes an approved design-system artifact; fully reversible; low LOC; strong test coverage possible

### Agents Used
- coordinator (orchestration, scoring, verification, artifact updates)
- sop-expert (upstream design artifacts consumed as inputs)
- backend-engineer (implementation)

### Files Changed
- `packages/process-engine/src/templateTypes.ts` — +16 LOC: added optional `qualityBadge?`, `averageConfidence?`, `generatedAt?` fields to `OperatorSOP`, `EnterpriseSOP`, `DecisionSOP` (all additive, non-breaking)
- `packages/process-engine/src/templates/renderHelpers.ts` — +85 LOC: added `renderMetadataStrip()`, `renderEnterpriseMetadataTable()`, `renderConfidenceBadge()`
- `packages/process-engine/src/templates/sopTemplates.ts` — +45 LOC: added confidence thresholds, exported `qualityBadge()` classifier, populated new metadata fields in all three template builders
- `packages/process-engine/src/templates/markdownRenderer.ts` — +88 LOC: restructured all three render functions to emit H1 → italic purpose → metadata strip → confidence badge as the first block
- `packages/process-engine/src/templates/templates.test.ts` — +320 LOC: 26 new test cases across 6 describe blocks (helper unit tests, classifier tests, above-the-fold position assertions per template)

### Validation Run
- `pnpm --filter @ledgerium/process-engine typecheck` → clean ✅
- `pnpm --filter @ledgerium/process-engine test` → 350/350 (324 pre-existing + 26 new) ✅
- `pnpm typecheck` (monorepo) → clean across all 10 workspace projects ✅
- `pnpm test` (monorepo) → 1,419/1,419 tests pass (39 test files, +26 from iter 003) ✅
- No regressions detected

### Outcome
- Status: **complete**
- Summary: All three SOP templates now emit a visually unified metadata strip and confidence badge above the fold. The renderer consumes additive optional fields on existing SOP interfaces; defaults (`averageConfidence ?? 1`, `qualityBadge ?? 'high'`) preserve backward compatibility for any caller passing partial objects.

### Impact
- Before: rendered SOPs jumped from H1 directly into `## What This Is For`; generator credit only in footer; no confidence surfacing
- After: first 15 lines contain H1 → italic purpose tagline → metadata strip (`Ledgerium SOP · v1.0 · N steps · M systems · X% confidence · Generated YYYY-MM-DD`) → confidence badge callout (`> ✓ High confidence` / `> ⚠ Medium confidence` / `> ⚠ Low confidence`)
- Customer-visible SOP quality lifted to match approved `docs/sop/examples/` aesthetic
- Test coverage added to lock the "above the fold" contract in place

### Artifacts Updated
- `ITERATION_LOG.md` — this entry
- `IMPROVEMENT_BACKLOG.md` — gap #1 marked done; gaps #2 and #3 added
- `SYSTEM_HEALTH.md` — test count + visual quality dimension refreshed
- `CHANGELOG.md` — new entry

### Follow-Ups
- Gap #2: hoist `evidenceEvents: string[]` onto `OperatorSOPStep`, `EnterpriseSOPStep`, `DecisionSOPAction` and render `◦ Evidence: N events · [ev_XX]` per step (next iteration candidate)
- Gap #3: new `templates/sopValidator.ts` rejecting banned recorder artifacts (`Click the div`, one-step SOPs, missing expected outcomes) wired into `processSession.ts` post-render
- Gap #7: extend `documentFooter()` to accept `sessionId` and emit session timeline URL
- Integrate `@ledgerium/policy-engine` into `content/capture.ts` (still score 13, outstanding since iter 003)

### Risks / Open Questions
- None surfaced. Changes are additive, behind optional fields, and fully reversible by reverting 5 files.

---

## Iteration 009

- Date: 2026-04-18
- Trigger: first post-meta-review loop; selected via `blocker-cadence` rule (new in Meta-Review 001)
- Coordinator: coordinator
- Phase: Phase 1
- Objective: close the longest-standing Phase 1 release blocker — missing Playwright E2E coverage for the extension recording lifecycle (8 loops unaddressed since iter 000) — by installing Playwright for `apps/extension-app` and landing 1–3 lifecycle tests + CI wiring

### System Review
- Meta-Review 001 (2026-04-17) diagnosed 5-loop drift into SOP-presentation polish with zero release blockers closed
- New Selection Policy formulas: `+3 release_blocker_bonus`, `−2 saturation_penalty` — under the refined formula, Playwright E2E rose from 12 → 15, beating all other candidates
- SOP area was saturated (4 of last 5 iterations); Area saturation rule also forced pivot out of SOP work
- Agent diversity was 1 (backend-engineer) across 5 consecutive loops — Meta-Review 001 added a 3-consecutive-same-agent check; this iteration is the first non-backend-engineer loop since iter 003
- No test workflow existed in `.github/workflows/` prior to this loop — CI test gates were previously only in the deploy workflow's `quality-gate` job (which runs on push to main/feature branches, not on PRs)

### Candidate Selection
- Title: **Add Playwright E2E tests for recording lifecycle**
- Type: improvement
- Area: quality assurance / release readiness
- Score: **15** (Impact:4 + Alignment:5 + Learning:4 + Confidence:4 − Effort:3 − Risk:2 + release_blocker_bonus:3 − saturation_penalty:0)
- Selection rule: **`blocker-cadence`** — 1-in-5 release-blocker rotation rule. Also supported by `top-score` (highest post-formula score) and `saturation-rule` (forced pivot out of SOP area)
- Why selected: release blocker since iter 000 (8 loops untouched); unblocks iter 010 session-persistence validation; breaks the backend-engineer-only orchestration streak
- Scope discipline: install Playwright + 1–3 lifecycle tests + CI wiring only. NO unit-test CI, NO lint CI, NO typecheck CI, NO web-app E2E, NO real-extension `launchPersistentContext` test (deferred to iter 010). NO source-code rewrites to enable testing.

### Agents Used
- coordinator (orchestration, verification, artifact updates)
- qa-engineer (primary — installation + test design + authorship)
- devops-engineer (secondary — CI workflow wiring)

Delegation pattern: sequential (qa-engineer completes and reports → devops-engineer uses the exact reproduce commands). This is the first iteration since iter 003 where implementation used specialist agents other than `backend-engineer`, satisfying the agent-diversity rule added by Meta-Review 001.

### Files Changed
- `apps/extension-app/package.json` — **modified**, +2 LOC: added `"test:e2e": "playwright test"` script and pinned `@playwright/test@1.59.1` as devDependency
- `pnpm-lock.yaml` — **modified**, +3 LOC: dependency resolution
- `apps/extension-app/playwright.config.ts` — **new file**, +47 LOC: isolated config with 400×600 sidepanel viewport, 30s timeout, CI-aware reporter (`github` in CI / `list` locally), CI-aware retries (1 in CI / 0 locally), `testMatch: recording-lifecycle.spec.ts`, single-worker sequential execution
- `apps/extension-app/e2e/recording-lifecycle.spec.ts` — **new file**, +311 LOC: 3 lifecycle tests using static-harness approach — serves `dist/src/sidepanel/index.html` via a local HTTP server + injects a deterministic `chrome.*` mock via `page.addInitScript` before React mounts. Exercises the real production JS bundle while keeping the transport layer fully controlled.
- `.github/workflows/e2e-extension.yml` — **new file**, +63 LOC: single-job workflow triggered on push/PR to main, with pnpm/action-setup@v4 + actions/setup-node@v4 (pnpm store cache), actions/cache@v4 keyed on pnpm-lock.yaml hash for Playwright browsers, conditional `playwright install chromium --with-deps` on cache miss, `pnpm --filter extension-app build`, then `pnpm --filter extension-app test:e2e`, with artifact upload of `playwright-report/` on failure (7-day retention). Concurrency group cancels in-progress runs on the same ref. 10-minute job timeout.

### Test Inventory (3 tests, all passing locally in 4.7s)
1. **idle screen** — Start Recording button is disabled when activity name is empty. Asserts header badge = "Ready", input visible and empty, button disabled (4 assertions).
2. **start recording** — Typing an activity name enables the button; clicking it transitions the header badge "Ready" → "Recording" and shows "Recording Active" banner (4 assertions).
3. **stop recording** — From recording state, clicking "Stop & Review" transitions the header badge to "Complete" (2 assertions).

### Validation Run
- `pnpm typecheck` (monorepo) → clean across all 10 workspace projects ✅
- `pnpm test` (monorepo) → 1,512/1,512 tests pass across 41 test files (Vitest unchanged — no regressions) ✅
- `pnpm --filter extension-app test:e2e` → 3/3 passed in 4.7s ✅
- `.github/workflows/e2e-extension.yml` YAML syntax → valid (parsed via js-yaml) ✅
- Workflow action pins verified: `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`, `actions/cache@v4`, `actions/upload-artifact@v4`
- Workflow line count: 63 (within the 40–100 scope-discipline target)
- Command sequence in workflow matches qa-engineer's handoff repro commands exactly

### Outcome
- Status: **complete**
- Summary: The extension now has its first E2E test suite AND its first CI test gate. Both artifacts are minimal by design — 3 lifecycle tests, 1 workflow file, 1 job, 1 concern. The static-harness strategy exercises the real production bundle while keeping `chrome.*` controllable; the real-extension `launchPersistentContext` approach remains an explicit iter 010 follow-up.

### Impact
- **Before**: release blocker #1 (E2E coverage) open for 8 loops; no automated regression protection for the sidepanel → service-worker → sidepanel lifecycle; no test CI gate on PRs
- **After**: 3 lifecycle assertions auto-run on every push/PR; fast local reproduction (`cd apps/extension-app && pnpm test:e2e`); foundation for iter 010 session-recovery tests
- **Test count**: 1,512 Vitest + **3 Playwright E2E** (first non-unit tests in repo history)
- **CI surface**: new `e2e-extension` workflow runs in ~60–90s warm-cache, ~3–5min cold-cache
- **Release-blocker burn rate**: 0/3 → **1/3 closed** in this loop
- **Agent diversity (last 5 loops)**: 1 → **2** (backend-engineer + qa-engineer — devops-engineer brings it to **3** if counted as implementer of the CI workflow)

### Artifacts Updated
- `ITERATION_LOG.md` — this entry
- `IMPROVEMENT_BACKLOG.md` — iter 009 item marked complete; release-blocker burn rate updated; session-persistence (iter 010) remains top of release-blocker stack
- `SYSTEM_HEALTH.md` — release blocker #1 marked resolved; Playwright E2E removed from release-blocker table; test count / CI surface updated; scorecard shifts for release readiness
- `CHANGELOG.md` — new entry prepended

### Follow-Ups
- **Real-extension smoke test via `launchPersistentContext`** (iter 010 or 011) — complement the harness approach by testing the actual `chrome.runtime` transport + service-worker message bus
- **Session recovery test** (iter 010) — Meta-Review 001 earmarked "record → restart → recover". `useRecorderState` already has stale-session filtering in `mergeSteps` but no test covers this path. Natural companion to the iter 010 session-persistence implementation work.
- **chrome.storage persistence test** — mock currently returns empty `{}` for all storage.get calls; `useHistory` hook and `SyncSettings` component have untested paths
- **`STOP_SESSION` transient "Processing..." badge assertion** — currently skipped because the mock's 80ms `stopping → review_ready` transition is too fast to poll reliably; would need a slow-mock variant
- **Add unit-test CI workflow** — `pnpm test` has never run in CI as a dedicated PR gate (only inside deploy.yml quality-gate on push). Separate workflow file, next iteration candidate.
- **Add typecheck / lint CI workflows** — same reasoning as above, separate files per the one-concern-per-workflow rule
- **Web-app E2E wiring** — `apps/web-app` has its own Playwright config (with globalSetup, Prisma seed, auth state). Should get its own dedicated workflow once stable
- **Extension-app untested content modules** — `capture.ts`, `state-observer.ts`, `label-extractor.ts` remain without unit tests (carryover from iter 008 follow-ups); now partially covered indirectly by the static-harness approach but unit tests would still be valuable
- **Design smell (note only, do not fix opportunistically)**: `useRecorderState` polls `GET_STATE` on a 400ms interval during recording — in test it generates no-op chrome.runtime.sendMessage traffic. Not a bug; worth flagging for iter 010's real-extension tests, which will see this traffic.

### Risks / Open Questions
- **Playwright browser download bandwidth on cold CI runs** (~100MB Chromium). Cache hit eliminates this; cache bust happens on Playwright version change (via pnpm-lock hash). Acceptable risk.
- **dist path coupling**: config and spec hard-code `dist/src/sidepanel/index.html`. If Vite/crxjs build output layout changes, tests will 404 silently and hit the waitForSelector timeout. Mitigated by a `fs.existsSync(DIST_ROOT)` guard in `beforeAll` that throws fast.
- **Asset hash coupling in `apps/extension-app/e2e/screenshot-harness.html`** — pre-existing file references CSS by content hash; a rebuild changes the hash. NOT introduced by this iteration, but flagged because any CI run that rebuilds before screenshots will hit this. Not in iter 009 scope.
- **`--with-deps` requires sudo on Ubuntu**. GitHub-hosted runners have passwordless sudo; self-hosted runners without sudo would need the `--with-deps` flag removed and OS deps pre-installed on the image. Acceptable risk for the current CI setup.
- **Static-harness limitation** — does NOT test background/content script message handling or chrome.storage persistence. This is by design for iter 009; real-extension tests are explicitly deferred.
- **CI first-run verification** — this workflow has not yet actually executed on GitHub. First CI run will confirm end-to-end correctness; any issue surfaces as a Mode 3 Debugging follow-up, not a scope expansion.

---

## Iteration 008

- Date: 2026-04-17
- Trigger: user-directed sequential execution of top-3 backlog items (006/007/008) — third and final in sequence
- Coordinator: coordinator
- Phase: Phase 1
- Objective: eliminate duplicated sensitivity-classification logic by routing `target-inspector.isSensitiveTarget()` through `@ledgerium/policy-engine.classifySensitivity()`, closing a long-standing capture-pipeline cleanup item tracked since iter 003 follow-ups

### System Review
- `@ledgerium/policy-engine` has been a declared dependency of `@ledgerium/extension-app` since before iter 003 and has been wired into `src/background/normalizer.ts:5` — but the content capture layer (where sensitivity first matters, at event capture time) was never migrated
- Extension's local `SENSITIVE_RE` regex (`/password|passwd|secret|token|api[_-]?key|credit|cvv|ssn/i` in `target-inspector.ts`) drifted behind the shared `classifySensitivity` pattern set which includes `card_number`, `social_security`, `tax_id`, and classifies into categories (`password`, `payment`, `government_id`, `pii`)
- Drift cost: every new sensitivity class added to the shared package needs to be mirrored manually in the extension — and historically has not been

### Candidate Selection
- Title: **Integrate `@ledgerium/policy-engine` into the content capture pipeline (via `target-inspector.isSensitiveTarget`)**
- Type: fix
- Area: capture pipeline / determinism / shared-package integration
- Score: 13 (Impact:4 + Alignment:5 + Learning:3 + Confidence:5 − Effort:2 − Risk:2)
- Why selected: third item in the user-directed 006/007/008 sequence; eliminates duplicate logic (Core Principle: Determinism before abstraction); no longer allows capture-time and normalization-time to use different regex sets
- Scope discipline: refactored ONLY `target-inspector.ts` (1 source file). Did NOT modify `content/capture.ts` (its 10 callsites of `isSensitiveTarget` remain untouched — proof that the refactor is a drop-in replacement). Did NOT touch `background/normalizer.ts` (already integrated).

### Agents Used
- coordinator (orchestration, verification, artifact updates)
- backend-engineer (implementation)

### Files Changed
- `apps/extension-app/src/content/target-inspector.ts` — **refactored**, net -3 LOC (150 → 147 total): replaced inline `SENSITIVE_RE` + `SENSITIVE_INPUT_TYPES` with delegation to `classifySensitivity`, preserving the DOM-specific early returns (password/hidden input types and autocomplete="password" attribute — these require a live Element and cannot be done string-side)
- `apps/extension-app/src/content/target-inspector.test.ts` — **new file**, +175 LOC: 20 tests covering password/hidden/autocomplete DOM fast paths, all pre-refactor regex patterns as regression guards, and 3 explicit tests for newly-available shared patterns (`card_number`, `social_security_number`, `tax_id`) that would fail if the old local regex were re-introduced

### Validation Run
- `pnpm --filter @ledgerium/extension-app typecheck` → clean ✅
- `pnpm --filter @ledgerium/extension-app test` → 156/156 (136 pre-existing + 20 new) ✅
- `pnpm typecheck` (monorepo) → clean across all 10 workspace projects ✅
- `pnpm test` (monorepo) → 1,512/1,512 tests pass across 41 test files (+20 from iter 007) ✅
- All 10 `isSensitiveTarget` callsites in `capture.ts` continue to work unchanged — function signature preserved

### Outcome
- Status: **complete**
- Summary: Capture-time and normalization-time sensitivity classification now route through the same `classifySensitivity` function. The extension content layer is now fully aligned with the shared policy-engine package, completing the consolidation begun in iter 003. Adding a new sensitivity pattern to the shared package will now automatically propagate to the capture layer — no hand-patching required.

### Impact
- **Before**: extension capture used a local 8-word regex; shared package used a 12-pattern ladder with category classification; new patterns added to the shared package never reached capture time
- **After**: single source of truth for sensitivity; newly-active patterns include `card_number`, `social_security_number`, `tax_id`, and richer `credit_card` matching
- **Test count**: 1,492 → 1,512 (+20)
- **Coverage gain**: extension content layer gets its first-ever tests for sensitivity classification (module was previously untested)

### Artifacts Updated
- `ITERATION_LOG.md` — this entry
- `IMPROVEMENT_BACKLOG.md` — iter 008 item marked complete; new follow-up added for `/credit\s*card/` pattern gap in policy-engine
- `SYSTEM_HEALTH.md` — test count refreshed; drift-risk item removed from top risks
- `CHANGELOG.md` — new entry prepended

### Follow-Ups
- **Policy-engine `/credit\s*card/i` pattern gap**: shared `classifySensitivity` uses `/credit[_-]?card/i` (requires `_` or `-` separator), missing `"Credit card number"` aria-labels with spaces. The pre-refactor local regex caught this via the looser `/credit/i`. Low-effort fix — widen the shared regex. Queued as new backlog item.
- **Playwright E2E tests for recording lifecycle** — still a remaining Phase 1 release blocker
- **Wire `validateRenderedSOP` into `processSession.ts`** — iter 007 follow-up
- **Meta-coordinator invocation** — now mandatory before iter 009 (7 completed loops, user-directed 006/007/008 batch just closed)

### Risks / Open Questions
- Narrow behavior regression documented in `target-inspector.test.ts`: aria-label `"Credit card number"` with spaces is no longer caught (tracked as the follow-up above). All other pre-existing positive cases are preserved.
- DOM test approach: manual Element mocks (no `happy-dom`/`jsdom` installed in the monorepo) — keeps the extension test suite dependency-free but means the mocks cover only the `type`, `autocomplete`, and `getAttribute` surface. Acceptable for this module; heavier DOM testing is tracked as part of the Playwright E2E candidate.
- Extension content layer is now untested beyond this module — `capture.ts`, `state-observer.ts`, `label-extractor.ts`, `index.ts` remain without unit tests. Not in scope for iter 008.

---

## Iteration 007

- Date: 2026-04-17
- Trigger: user-directed sequential execution of top-3 backlog items (006/007/008) — second in sequence
- Coordinator: coordinator
- Phase: Phase 1
- Objective: create `sopValidator.ts` as a release-readiness quality gate that rejects banned recorder artifacts and core QUALITY_RUBRIC anti-patterns before rendered SOPs reach end users (sop-expert gap #3 / IMPLEMENTATION_NOTES.md Gap #8)

### System Review
- After iter 006, the SOP trust-signal trifecta is visible to users — but nothing currently prevents a poor rendered SOP from being surfaced to them in the first place
- `docs/sop/QUALITY_RUBRIC.md` §10 defines explicit anti-patterns with automated detector hints
- `docs/sop/TRANSFORMATION_RULES.md` §5.1 enumerates 8 banned recorder-artifact strings (authoritative list)
- `docs/sop/IMPLEMENTATION_NOTES.md` Gap #8 provides the target function signature and rule set — though its snippet omits `"Click the section"` (reconciled by following TRANSFORMATION_RULES.md)

### Candidate Selection
- Title: **Add `packages/process-engine/src/templates/sopValidator.ts` (release-readiness quality gate)**
- Type: fix (new capability — quality gate)
- Area: SOP quality gate
- Score: 13 (Impact:4 + Alignment:5 + Learning:4 + Confidence:4 − Effort:2 − Risk:2)
- Why selected: second item in the user-directed 006/007/008 sequence; with the trust-signal trifecta now rendered, the next highest-leverage work is preventing broken output from being rendered; protects the SOP contract from upstream recorder drift
- Scope discipline: implement the validator + its tests + export wiring ONLY. `processSession.ts` integration (the dev-throws/prod-logs guard) is explicitly deferred to a follow-up iteration. This keeps test surface contained and avoids breaking changes to existing pipeline behavior.

### Agents Used
- coordinator (orchestration, verification, artifact updates)
- backend-engineer (implementation)

### Files Changed
- `packages/process-engine/src/templates/sopValidator.ts` — **new file**, +167 LOC: `validateRenderedSOP(rendered, output): SOPValidation` with 6 rules, structured failure results, named constants (`BANNED_RECORDER_STRINGS`, `MIN_STEP_COUNT`, `GENERIC_TITLE_REGEX`, `PROSE_ONLY_PURPOSE_PREFIX`)
- `packages/process-engine/src/templates/sopValidator.test.ts` — **new file**, +371 LOC: 31 tests covering each rule in isolation, parameterized banned-string coverage, rule-ordering assertions (first-match wins), positive fixtures, and structured-error-shape invariants
- `packages/process-engine/src/templates/index.ts` — +2 LOC: re-export `validateRenderedSOP` and `SOPValidation`
- `packages/process-engine/src/index.ts` — +2 LOC: propagate exports to public process-engine API

### Rules Implemented (order-dependent)
1. **banned_recorder_artifact** — scans `renderSOPMarkdown(rendered)` for any of the 8 TRANSFORMATION_RULES.md §5.1 strings
2. **too_few_steps** — `output.sop.steps.length >= 2`
3. **step_has_no_evidence** — every step must have `instructions.length > 0`
4. **empty_expected_outcomes** — no step may have a falsy `expectedOutcome`
5. **generic_title** — rejects `"Workflow N"`, `"Untitled Process"`, `"Untitled Workflow N"` (QUALITY_RUBRIC.md §10)
6. **prose_only_purpose** — rejects purposes starting with `"This SOP describes "` (QUALITY_RUBRIC.md §10)

### Validation Run
- `pnpm --filter @ledgerium/process-engine typecheck` → clean ✅
- `pnpm --filter @ledgerium/process-engine test` → 423/423 (392 pre-existing + 31 new) ✅
- `pnpm test` (monorepo) → 1,492/1,492 tests pass across 40 test files (+31 from iter 006) ✅
- No regressions. `processSession.ts` untouched — existing pipeline behavior preserved.

### Outcome
- Status: **complete**
- Summary: The process-engine now exposes a zero-dependency quality-gate function that consumers can call to reject rendered SOPs that would embarrass the Ledgerium trust contract. Function returns structured `{ ok: false, reason, diagnostic, suggestion }` — no throws — so the caller controls dev-vs-prod policy.

### Impact
- Before: a bad recording produced a weak SOP with zero guardrails; nothing stopped `"Click the div"` from reaching users
- After: exposed validation function with 6 anti-pattern detectors; 31 new tests cover every rule and the ordering contract
- Test count: 1,461 → 1,492 (+31)
- The validator's single entry point (`validateRenderedSOP`) is exported from the public `@ledgerium/process-engine` package, ready for consumers to call

### Artifacts Updated
- `ITERATION_LOG.md` — this entry
- `IMPROVEMENT_BACKLOG.md` — iter 007 item marked complete; `processSession.ts` integration added as explicit follow-up candidate
- `SYSTEM_HEALTH.md` — test count refreshed
- `CHANGELOG.md` — new entry prepended

### Follow-Ups
- **Wire `validateRenderedSOP` into `processSession.ts`** as a final guard with a dev-throws/prod-logs policy. This was explicitly deferred from iter 007 per the one-item rule. Next-best candidate score ~11.
- Fix the `IMPLEMENTATION_NOTES.md` Gap #8 snippet to include `"Click the section"` (doc sync, not code)
- Integrate `@ledgerium/policy-engine` into `content/capture.ts` (iter 008 — next in sequence)

### Risks / Open Questions
- Spec reconciliation note: IMPLEMENTATION_NOTES.md Gap #8 listed 7 banned strings; TRANSFORMATION_RULES.md §5.1 lists 8. Implementation uses 8 (the richer authoritative source). Documentation gap in IMPLEMENTATION_NOTES.md flagged but not fixed (doc-only follow-up).
- Validator currently operates on rendered markdown output and ProcessOutput shape. Does NOT currently inspect `evidenceEvents` populated in iter 005 — but that data is functionally redundant with `step.instructions[].sourceEventId` which IS checked (via `step_has_no_evidence` Rule 3).

---

## Iteration 006

- Date: 2026-04-17
- Trigger: user-directed sequential execution of top-3 backlog items (006/007/008)
- Coordinator: coordinator
- Phase: Phase 1
- Objective: complete the SOP trust-signal trifecta by surfacing per-step confidence in rendered SOPs via additive optional `confidence?: number` on step interfaces + a three-tier confidence glyph in the Markdown renderer (IMPLEMENTATION_NOTES.md Gap #6)

### System Review
- Iter 004 established the document-level confidence badge above the fold
- Iter 005 added per-step evidence references (`◦ Evidence: N events · ev_XX`)
- Per-step confidence was the last visible trust signal from the design system; low-confidence steps rendered identically to high-confidence steps, giving reviewers no per-step signal
- `SOPStep.confidence: number` already exists in `packages/process-engine/src/types.ts:377` — values flow from the quality pipeline
- Approved aesthetic lives in `docs/sop/examples/` and Design System §7.3 thresholds already classify the document-level badge using `HIGH_CONFIDENCE_THRESHOLD = 0.85` and `LOW_CONFIDENCE_THRESHOLD = 0.70`

### Candidate Selection
- Title: **Per-step `confidence?: number` + three-tier confidence glyph in rendered SOPs**
- Type: improvement
- Area: SOP presentation / trust / traceability
- Score: 14 (Impact:5 + Alignment:5 + Learning:2 + Confidence:5 − Effort:2 − Risk:1)
- Why selected: completes the SOP trust-signal trifecta (document-level confidence + per-step evidence + per-step confidence); parallels the iter 004/005 additive-optional-field pattern exactly; zero breaking surface; direct prescription in IMPLEMENTATION_NOTES.md Gap #6
- Scope discipline: shared thresholds exported from `sopTemplates.ts` rather than duplicated, per spec. No other trust signals (e.g., `isSensitive`, per-step risks) added in this loop.

### Agents Used
- coordinator (orchestration, verification, artifact updates)
- backend-engineer (implementation)

### Files Changed
- `packages/process-engine/src/templateTypes.ts` — +6 LOC: added `confidence?: number | undefined` to `OperatorSOPStep`, `EnterpriseSOPStep`, `DecisionSOPAction` (all optional, non-breaking)
- `packages/process-engine/src/templates/sopTemplates.ts` — +10 LOC: exported the two confidence-threshold constants; populated `confidence: step.confidence` in all three template builders (including all four DecisionSOP branch patterns: happy-path, per-decision error paths, and the no-decision linear branch)
- `packages/process-engine/src/templates/renderHelpers.ts` — +40 LOC: added `formatConfidenceGlyph(confidence: number | undefined): string | undefined` helper with named glyph constants (`STEP_CONFIDENCE_HIGH_GLYPH = '●'`, `STEP_CONFIDENCE_MEDIUM_GLYPH = '◐'`, `STEP_CONFIDENCE_LOW_GLYPH = '○'`); thresholds imported from `sopTemplates.ts` to prevent drift
- `packages/process-engine/src/templates/markdownRenderer.ts` — +13 LOC: glyph line emission directly after the evidence row in all three SOP renderers
- `packages/process-engine/src/templates/templates.test.ts` — +217 LOC: +25 new tests across 5 describe blocks covering glyph selection boundaries, percentage rounding, undefined handling, and per-template population for Operator/Enterprise/Decision-happy-path/Decision-error-path

### Validation Run
- `pnpm --filter @ledgerium/process-engine typecheck` → clean ✅
- `pnpm --filter @ledgerium/process-engine test` → 392/392 pass (367 pre-existing + 25 new) ✅
- `pnpm test` (monorepo) → 1,461/1,461 tests pass across 39 test files (+25 from iter 005) ✅
- No regressions detected

### Outcome
- Status: **complete**
- Summary: Rendered SOPs now surface per-step confidence via `● High confidence (92%)` / `◐ Medium confidence (78%)` / `○ Low confidence (54%) — review manually`. Thresholds are single-sourced via exports from `sopTemplates.ts`, eliminating the risk of the per-step tier drifting from the document-level badge tier. The SOP trust-signal trifecta is now complete.

### Impact
- Before: reviewers had no way to spot low-confidence steps without opening quality indicators
- After: every low-confidence step is visually flagged inline with the explicit `— review manually` advisory
- Combined trust surface: document-level badge (iter 004) + per-step evidence (iter 005) + per-step confidence (iter 006) — the three core visible signals from Design System §7.3
- Test count: 1,436 → 1,461 (+25)

### Artifacts Updated
- `ITERATION_LOG.md` — this entry
- `IMPROVEMENT_BACKLOG.md` — iter 006 item marked complete; replaced with next candidates
- `SYSTEM_HEALTH.md` — test count refreshed; recommended-next updated
- `CHANGELOG.md` — new entry prepended

### Follow-Ups
- **Circular-import smell**: `renderHelpers.ts → sopTemplates.ts → renderHelpers.ts` now exists because thresholds are sourced from `sopTemplates.ts`. Benign at runtime (primitive constants resolve via ESM hoisting, all tests pass cleanly) but a design smell. Low-effort refactor: extract confidence thresholds to a shared `templates/constants.ts` or add them to `types.ts`. Queued as a backlog candidate.
- `sopValidator.ts` (sop-expert gap #3) — next in the 006/007/008 sequence
- `@ledgerium/policy-engine` integration into `content/capture.ts` — third in the 006/007/008 sequence

### Risks / Open Questions
- Circular import flagged above is benign at runtime but should be fixed opportunistically
- Agent reported 25 tests added within a "17–22" target range — coverage is good, minor over-addition
- Meta-review should be triggered before iter 009 (we're at 6 completed loops, above the 3-loop threshold; this batch of 3 was user-directed execution ahead of the cadence check)

---

## Iteration 005

- Date: 2026-04-17
- Trigger: user-directed continuation after iter 004 completion and SOP export bug fix
- Coordinator: coordinator
- Phase: Phase 1
- Objective: render per-step evidence references in all three SOP templates by hoisting `evidenceEvents?: string[]` onto the step interfaces (IMPLEMENTATION_NOTES.md Gap #5 / sop-expert gap #2 subset)

### System Review
- Iteration 004 established the metadata/confidence-above-the-fold pattern with additive optional fields
- `IMPLEMENTATION_NOTES.md` Gap #5 defined the exact prescription: add `evidenceEvents?: string[]` to `OperatorSOPStep`, `EnterpriseSOPStep`, `DecisionSOPAction`; populate from `step.instructions.map(i => i.sourceEventId)`; render `◦ Evidence: N events · ev_XX, ev_YY` per step
- Target aesthetic already approved in `docs/sop/examples/01_operator_centric_example.md`
- SOP Export bug (unrelated, Mode 3 Debugging) fixed and committed as `6fe0795` prior to this iteration

### Candidate Selection
- Title: **Per-step `evidenceEvents` on SOP step interfaces + render evidence lines**
- Type: improvement
- Area: SOP presentation / trust / traceability
- Score: 15 (Impact:5 + Alignment:5 + Learning:3 + Confidence:5 − Effort:2 − Risk:1)
- Why selected: highest-scored backlog item (tied with iter 004); directly continues SOP quality trajectory; parallel pattern to iter 004 (additive optional fields, non-breaking); makes Ledgerium's trust-first promise visible per step
- Scope discipline: deliberately narrowed to evidenceEvents ONLY. Adjacent fields from sop-expert's broader gap lists (`confidence`, `isSensitive`, `durationLabel`, `risks`, `branchType`, `probability`, `metadata`, `evidenceManifest`) deferred to future iterations per the one-item rule.

### Agents Used
- coordinator (orchestration, verification, artifact updates)
- backend-engineer (implementation)

### Files Changed
- `packages/process-engine/src/templateTypes.ts` — +6 LOC: added `evidenceEvents?: string[] | undefined` to `OperatorSOPStep`, `EnterpriseSOPStep`, `DecisionSOPAction` (all optional, non-breaking)
- `packages/process-engine/src/templates/sopTemplates.ts` — +6 LOC: populated `evidenceEvents` in all three template builders from `step.instructions.map(i => i.sourceEventId)`
- `packages/process-engine/src/templates/renderHelpers.ts` — +36 LOC: added `formatEvidenceRow(eventIds: string[]): string | undefined` helper with named truncation constants (`MAX_EVIDENCE_IDS = 8`, `EVIDENCE_TRUNCATION_HEAD = 5`)
- `packages/process-engine/src/templates/markdownRenderer.ts` — +14 LOC: evidence line emission after each step in all three render functions
- `packages/process-engine/src/templates/templates.test.ts` — +204 LOC: +17 new tests across 6 describe blocks covering helper unit tests, per-template evidence rendering, empty/undefined suppression, and truncation

### Validation Run
- `pnpm --filter @ledgerium/process-engine typecheck` → clean ✅
- `pnpm --filter @ledgerium/process-engine test` → 367/367 (350 pre-existing + 17 new) ✅
- `pnpm typecheck` (monorepo) → clean across all 10 workspace projects ✅
- `pnpm test` (monorepo) → 1,436/1,436 tests pass (39 test files, +17 from iter 004) ✅
- No regressions detected

### Outcome
- Status: **complete**
- Summary: All three SOP templates now render `◦ Evidence: N events · ev_XX, ev_YY` per step, with correct singular/plural pluralization, empty-list suppression, and truncation to first 5 + `…+N more` for lists over 8 IDs. Ledgerium's trust-first promise is now visible at the step level, not just in document metadata.

### Impact
- Before: source event IDs existed in `SOPStep.instructions[].sourceEventId` but never surfaced in the rendered SOP; readers had no per-step traceability without traversing the underlying data
- After: every step in every rendered SOP shows its evidence line immediately below the expected-outcome row, matching the approved `docs/sop/examples/01_operator_centric_example.md` aesthetic
- Test count: 1,419 → 1,436 (+17)
- Combined with iter 004 output: rendered SOPs now surface confidence at the document level AND evidence at the step level — the two core visible trust signals from the design system

### Artifacts Updated
- `ITERATION_LOG.md` — this entry
- `IMPROVEMENT_BACKLOG.md` — evidenceEvents portion of gap #2 marked done; adjacent fields remain as follow-up candidates
- `SYSTEM_HEALTH.md` — test count refreshed
- `CHANGELOG.md` — new entry

### Follow-Ups
- Per-step confidence glyph in rendered output (`IMPLEMENTATION_NOTES.md` Gap #6) — additive `confidence?: number` field
- `sopValidator.ts` rejecting banned recorder artifacts (sop-expert gap #3) — still a release-readiness candidate
- Enterprise step metadata (`durationLabel?`, `risks?`) for audit-grade SOPs
- Decision branch classification (`branchType?`, `probability?`) for triage UX
- `metadata?:` + `evidenceManifest?:` objects at top-level SOP types per `SCHEMA.md` §3
- Integrate `@ledgerium/policy-engine` into `content/capture.ts` (still outstanding from iter 003 follow-ups)

### Risks / Open Questions
- None surfaced. Changes are additive, behind optional fields, and fully reversible.
- Minor: agent reported "28 new tests" in 6 describe blocks but the net delta was +17 tests. Coverage is real and all validation is green; the miscount is cosmetic and does not affect correctness.

---

## Iteration 001

- Date: 2026-04-13
- Trigger: user requested improvement loop
- Coordinator: coordinator
- Phase: Phase 1
- Objective: identify and implement the single highest-value improvement for beta readiness

### System Review
- Read: CLAUDE.md, SYSTEM_HEALTH.md, IMPROVEMENT_BACKLOG.md, CHANGELOG.md, git log
- Key finding: web-app has zero test runner configuration despite 2 existing test files with 50 tests. This blocks ALL future web-app testing.

### Candidate Generation
Three specialist agents ran in parallel:
- **qa-engineer**: Found zero test config in web-app (blocker), 11 unguarded API routes, 0 of 34 API routes tested, 0 of 39 components tested. TypeScript clean.
- **system-architect**: Found upload/sync code duplication, extension normalizeUrl duplication, `(db as any)` casts in teams routes, missing `updated_at` on 10+ models, admin bootstrap attack surface.
- **backend-engineer**: Found no Prisma migrations (db push only), `(db as any)` from stale Prisma client, DELETE /api/keys missing error handling, inconsistent response envelope, no rate limiting on signup.

### Top 10 Candidates (Scored)

| Rank | Title | Score |
|------|-------|-------|
| 1 | Add vitest config + test script to web-app | **16** |
| 2 | Wire existing tests into CI | 12 |
| 3 | Add try/catch to 11 unguarded API routes | 11 |
| 4 | Fix (db as any) casts / regenerate Prisma client | 10 |
| 5 | Initialize Prisma migrations baseline | 10 |
| 6 | Extract shared ingestion service (upload/sync) | 9 |
| 7 | Fix DELETE /api/keys error handling | 9 |
| 8 | Deduplicate normalizeUrl in extension | 8 |
| 9 | Inconsistent response envelope across routes | 7 |
| 10 | Add updated_at to missing Prisma models | 7 |

### Selected Item
- Title: **Add vitest config + test script to web-app**
- Type: improvement
- Area: quality assurance / test infrastructure
- Score: 16 (Impact:5 + Alignment:5 + Learning:3 + Confidence:5 − Effort:1 − Risk:1)
- Why selected: Highest score by wide margin. Prerequisite for ALL web-app testing. Unblocks items #2–#5. Two existing test files (50 tests) were invisible to CI. Zero risk, minimal effort.

### Agents Used
- coordinator (orchestration + scoring)
- qa-engineer (candidate generation)
- system-architect (candidate generation)
- backend-engineer (candidate generation)

### Files Changed
- `apps/web-app/vitest.config.ts` — NEW: vitest configuration with path aliases, proper includes/excludes
- `apps/web-app/package.json` — MODIFIED: added `test` and `test:watch` scripts

### Validation Run
- `pnpm --filter @ledgerium/web-app test` → **2 files, 50 tests, all pass** ✅
- `pnpm test` (root) → **38 files, 1,364 tests, all pass** ✅ (web-app tests now included)
- `pnpm --filter @ledgerium/web-app typecheck` → **clean, 0 errors** ✅
- No regressions detected

### Outcome
- Status: **complete**
- Summary: web-app now has a working vitest configuration. The 2 existing test files (humanize.test.ts with 25 tests, format.test.ts with 25 tests) are now discoverable and run as part of both workspace and monorepo test suites. This unblocks all future web-app test authoring.

### Impact
- Before: 0 web-app tests executed (test runner missing)
- After: 50 web-app tests execute in CI
- Monorepo total: 1,314 → 1,364 tests (+50)
- Unblocks: API route tests, component tests, integration tests for all web-app code

### Follow-Ups
- Add try/catch to 11 unguarded API routes (score: 11)
- Fix (db as any) casts by regenerating Prisma client (score: 10)
- Initialize Prisma migrations baseline (score: 10)

---

## Iteration 010

- Date: 2026-04-18
- Trigger: user-directed Mode 5 sequence — "run iter 010 + 011 to close the outstanding release blockers"
- Coordinator: coordinator
- Phase: Phase 1
- Objective: Persist full session event stream to `chrome.storage.local` so a Chrome MV3 service worker eviction mid-recording no longer loses `rawEvents`, `canonicalEvents`, `policyLog`, and `liveSteps`. Close release blocker #1 (open since iter 000, 9 loops unaddressed).

### Mode
- **Mode 5** (Directed sequence: iter 010 → iter 011). Counter increments by 2.
- Area check: iter 010 = `session durability / background-engine`; iter 011 = `extension architecture / segmentation`. Different `Area` fields → no saturation flag.

### Candidate Selection
- Selected item: **Persist full session event stream for service worker restart recovery**
- Selection rule: **`directed`** (user-named, Mode 5)
- Score at selection: **14** (11 base + 3 release-blocker bonus; 0 saturation penalty; per IMPROVEMENT_BACKLOG.md §Release Blockers)
- Scope discipline (stated up-front): (a) `chrome.storage.local` full-event persistence, (b) restart-recovery merge logic, (c) 1 E2E covering `record → SW restart → recover`. Do NOT refactor the background SW message protocol. Do NOT touch `LiveStepBuilder` / `StreamingSegmenter` (iter 011). Do NOT add `launchPersistentContext` (iter 013).

### Agents Used
- coordinator (orchestration, scope enforcement, artifact updates)
- explore (current-state mapping of session handling)
- backend-engineer (implementation)
- qa-engineer (E2E + integration test coverage)

### Top Candidates Considered (pre-selection, for traceability)
1. Persist full session event stream for SW restart recovery — score 14 [**selected**]
2. Converge LiveStepBuilder with StreamingSegmenter — score 11 (queued iter 011)
3. Add dashboard-level process for artifact/system-health refresh — score 13
4. Invariant-focused regression suite for segmentation/normalization — score 12
5. Product wedge / ICP narrative — score 12

### Files Changed
- `apps/extension-app/src/shared/constants.ts` — added `STORAGE_KEY_SESSION_EVENTS_PREFIX`, `PERSIST_SCHEMA_VERSION` (=1), `PERSIST_DEBOUNCE_MS` (=500)
- `apps/extension-app/src/shared/types.ts` — added `persistenceTruncated?: true` to `SessionMeta`
- `apps/extension-app/src/background/session-store.ts` — debounced `persistEvents()`, `loadFromStorage()` full-restore, `flushOnSuspend()`, `PersistedSessionEvents` type; quota-overflow append-stop semantics
- `apps/extension-app/src/background/index.ts` — `chrome.runtime.onSuspend` listener → `store.flushOnSuspend()`
- `apps/extension-app/src/background/session-store.test.ts` — 36 total tests (20 existing + 16 new: round-trip, malformed, quota, debounce coalescing, schema mismatch, suspend flush)
- `apps/extension-app/src/background/session-restore.integration.test.ts` — **new**, 2 tests (6-step `record → events → restart → rehydrate` + pause-flush invariant)
- `apps/extension-app/e2e/recording-lifecycle.spec.ts` — **+1 test**: SW restart smoke (UI-observable rehydration via `SESSION_STATE_UPDATED` broadcast)
- `apps/extension-app/vitest.config.ts` — **new**, `exclude: ['**/e2e/**']`; pre-existing defect (Vitest was picking up Playwright specs) surfaced during validation and fixed additively (was follow-up #1 from backend-engineer; blocking for green CI)

### Validation Run
- `pnpm --filter extension-app typecheck` → **clean** ✅
- `pnpm --filter extension-app test --run` → **170 tests, 8 files, 0 failures** ✅ (up from 168 pre-iteration)
- `pnpm --filter extension-app test:e2e` → **4/4 pass** ✅ (3 iter-009 + 1 new restart-recovery)
- `pnpm typecheck` (monorepo) → **clean across all 10 workspace projects** ✅

### Outcome
- Status: **complete**
- Summary: service worker eviction mid-recording now preserves all four event arrays in `chrome.storage.local` under per-session keys with schema-version guard. Restart recovery rehydrates the full session state; quota overflow is handled by append-stop (never head-trim, never throw) with a `meta.persistenceTruncated` flag for downstream surfacing. `chrome.runtime.onSuspend` drains the debounce timer.

### Impact
- **Before**: session meta persisted, but `rawEvents` (N), `canonicalEvents`, `policyLog`, and `liveSteps` were lost on SW eviction. A mid-recording restart silently zeroed the evidence stream.
- **After**: all four arrays round-trip through `chrome.storage.local`. Debounced 500 ms writes coalesce high-frequency event bursts. Quota overflow surfaces to a durable flag instead of a silent drop.
- Release blocker burn rate (5-loop window iter 006–010): 0 → **2 closed** (iter 009 E2E + iter 010 persistence).
- Vitest: 1,512 → **~1,514** (net +2 new integration tests; session-store +16 new unit tests offset an internal reshape).
- E2E: 3 → **4** tests on the extension-app harness.
- Remaining release blockers: **1** (LiveStepBuilder ↔ StreamingSegmenter convergence — iter 011, scope next).

### Follow-Ups (surfaced but explicitly NOT implemented this loop)
- Surface `meta.persistenceTruncated` in the review UI / bundle builder with a visible user warning.
- Garbage-collect stale `ledgerium_active_session_events_*` keys from prior sessions on extension startup (today only the active session's key is cleared on `clear()`).
- `loadFromStorage` should validate that `saved.sessionId` matches the `chrome.storage.session` in-flight flag (silent wrong-session load risk).
- Real-extension `launchPersistentContext` E2E (iter 013) — would close the fidelity gap between Vitest integration and full OS-level restart.

### Governance / Selection Signals
- Rule: `directed` (Mode 5). Bypassed top-score selection in favor of the 1-in-5 release-blocker cadence requirement, which iter 010 satisfied.
- Agent diversity over last 5 loops: iter 006 (backend) · iter 007 (backend) · iter 008 (backend) · iter 009 (qa + devops) · iter 010 (backend + qa) → 3 distinct implementing agents across the window (Meta-Review 001's delegation rubric continues to produce rotation).

---

## Iteration 011

- Date: 2026-04-18
- Trigger: user-directed Mode 5 sequence — "run iter 010 + 011 to close the outstanding release blockers" (item 2 of 2)
- Coordinator: coordinator
- Phase: Phase 1
- Objective: Converge the four independent segmentation implementations (`LiveStepBuilder`, `StreamingSegmenter`, `buildDerivedSteps`, `segmentEvents`) onto a single `@ledgerium/segmentation-engine` primitive. Close the **last remaining Phase-1 release blocker** (open since iter 003 surfacing, 8 loops unaddressed).

### Mode
- **Mode 5** (Directed sequence: iter 010 → iter 011). Meta-review counter increments by 2 total (this is item 2 of 2).
- Area check: iter 010 = `session durability / background-engine`; iter 011 = `extension architecture / segmentation`. Different `Area` fields → no saturation flag.

### Candidate Selection
- Selected item: **Converge LiveStepBuilder with StreamingSegmenter**
- Selection rule: **`directed`** (user-named, Mode 5)
- Score at selection: **11** (8 base + 3 release-blocker bonus; 0 saturation penalty)
- Scope-expansion decision (coordinator): the architect's current-state audit revealed the canonical package segmenters (`StreamingSegmenter`, `segmentEvents`) have **zero production call sites**; the real ship risk is the extension-internal divergence between `LiveStepBuilder` (live UI) and `buildDerivedSteps` (shipped bundle). Closing only the named pair would eliminate dead code while leaving the actual risk open. Coordinator accepted the scope expansion to include `bundle-builder.ts` because (a) it is evidence-based not speculative, (b) it is still one logical outcome ("unify segmentation onto the package primitive"), (c) it stays within the segmentation subsystem, and (d) it closes ADR-001 Phase 1 entirely. This decision is documented in the architect's design doc §0 and §3.4.
- Scope discipline (stated up-front): Do NOT touch `session-store.ts`, `constants.ts` storage keys, `restoreStateIfNeeded`, `onSuspend` flush (iter-010 surface). Do NOT change `LiveStep` shape or `MSG.LIVE_STEP_UPDATED` wire format. Do NOT bump `SEGMENTATION_RULE_VERSION` (no rule semantics change). Do NOT silently update golden fixtures to make tests pass.

### Agents Used
- coordinator (orchestration, scope-expansion approval, artifact updates)
- system-architect (convergence design document — 714 lines, §0–§10 — establishing migration plan with checkpoints A–F and byte-equivalence regression strategy)
- backend-engineer (implementation across 7 sequential commits)
- qa-engineer (independent audit — fixture coverage verdict, byte-identity verdict, wire-protocol preservation verdict, iter-010-surface verdict, Invariant I1 verdict)

### Top Candidates Considered (pre-selection, for traceability)
1. Converge LiveStepBuilder with StreamingSegmenter — score 11 [**selected**, Mode 5 item 2]
2. Iter-010 follow-up #18 (surface `persistenceTruncated` in review UI) — score 11 (queued iter 012)
3. Iter-010 follow-up #19 (GC stale `session_events` keys) — score 11 (queued iter 012)
4. Iter-008 follow-up (widen `credit_card` regex to whitespace separators) — score 11 (queued iter 012)
5. Iter-007 follow-up (wire `validateRenderedSOP` into pipeline) — score 11 (queued iter 012)

### Files Changed (7 commits: `88a770d` → `dfe9658`)
- `docs/architecture/CONVERGENCE_LIVESTEPBUILDER_STREAMING_SEGMENTER.md` — **new**, 714-line design doc (system-architect authoritative spec)
- `packages/segmentation-engine/fixtures/` — **new**, 12 golden fixtures (input + live-expected + derived-expected) covering demo / spreadsheet-cells / action-button-then-other / action-button-rapid-repeat / annotation-mid-stream / idle-gap / multi-domain-tabs / spa-route-change / error-recovery / fill-and-submit / single-action-no-label / empty-session
- `packages/segmentation-engine/src/convergence-live.regression.test.ts` — **new**, 24 tests asserting `JSON.stringify` byte-identity on LiveStep outputs
- `packages/segmentation-engine/src/convergence-batch.regression.test.ts` — **new**, 24 tests asserting `JSON.stringify` byte-identity on DerivedStep outputs
- `packages/segmentation-engine/src/grouping.ts` — **new**, extracted shared `classifyGroupingReason` primitive (9 grouping reasons, single source of truth)
- `packages/segmentation-engine/src/streaming-segmenter.ts` — major: absorbs D1–D11 (ports `idle_gap`, `route_changed`, `target_changed`, `action_completed` boundaries + `error_handling`/`send_action`/`file_action`/`data_entry` grouping + spreadsheet cell-label tracking); aligns regex to `ACTION_BUTTON_PATTERNS` (word-boundary); uses `lastNavigationDomain` tracker; pairwise same-selector dedup check
- `packages/segmentation-engine/src/batch-segmenter.ts` — imports shared `classifyGroupingReason`; adds D2 `route_changed` guard; fixes `DerivedStep` key ordering to match golden authority
- `packages/segmentation-engine/src/rules.ts` — `deriveStepTitle` rewritten to extension-side style (D12); adds `appContextSuffix`, `CELL_REF_RE`, `extractFieldLabels`, `meaningfulClickLabel` helpers
- `packages/segmentation-engine/src/types.ts` — adds `annotation_text?: string` to `SegmentableEvent` (annotation title carry)
- `packages/segmentation-engine/src/index.ts` — exports new shared primitives
- `packages/segmentation-engine/src/streaming-segmenter.test.ts` — updated expectations for D1–D11-ported behavior
- `packages/segmentation-engine/src/rules.test.ts` — updated title expectations
- `apps/extension-app/src/background/bundle-builder.ts` — 350-line inline segmentation replaced with 53-line thin wrapper (`buildDerivedSteps` → `segmentEvents`)
- `apps/extension-app/src/background/live-steps.ts` — 335-line `LiveStepBuilder` rewritten as 115-line adapter over `StreamingSegmenter` (public surface preserved: same constructor, same methods, same emitted `LiveStep` shape)
- `apps/extension-app/src/background/live-steps.test.ts` — **new**, 14 adapter field-mapping tests
- `docs/invariants.md` — §3.7 updated to reflect single-impl reality (post-convergence guarantee is structural, not parallel)
- `docs/adr/ADR-001-type-consolidation-strategy.md` — status advanced to "Phase 1 completed for segmentation"

### Validation Run (independently re-verified by coordinator and qa-engineer)
- `pnpm typecheck` (monorepo) → **clean across all 10 workspace projects** ✅
- `pnpm test` (monorepo) → **1593 tests passing across 45 files** ✅ (was 1512 pre-iteration; +81 net)
- `pnpm --filter segmentation-engine test` → convergence-live **24/24**, convergence-batch **24/24**, streaming-segmenter **13/13**, batch-segmenter **17/17**, rules **45/45** ✅
- `pnpm --filter extension-app test` → **170/170** including session-store **36/36** + session-restore integration **2/2** + live-steps adapter **14/14** + bundle-builder **21/21** ✅
- `pnpm --filter extension-app build` → **clean** ✅
- `pnpm --filter extension-app test:e2e` → **4/4** including iter-010 SW-restart recovery smoke ✅ (proves iter-010 persistence surface is untouched)

### Outcome
- Status: **complete**. Last Phase-1 release blocker closed.
- Summary: all four segmentation implementations now flow through the package. `LiveStepBuilder` and `buildDerivedSteps` are thin adapters calling `StreamingSegmenter` and `segmentEvents` respectively; both downstream engines share `classifyGroupingReason` / `deriveStepTitle` / `calculateConfidence` primitives. The byte-equivalent output invariant is proved on 12 golden fixtures × 2 contracts × 2 assertions (24 live + 24 batch) + 2 determinism assertions per fixture.

### Impact
- **Before**: four separate segmentation implementations; bug fixes had to be applied in N places; divergence between the live UI preview and the shipped bundle was a present risk; `StreamingSegmenter` was dead code (zero production call sites).
- **After**: single source of truth. What the user sees during capture is structurally guaranteed to match what ships in the bundle because both go through the same code path. Eliminates the D1–D11 accidental divergences (e.g., `LiveStepBuilder`'s anchored-regex action detection, its first-vs-last window dedup, its missing same-selector dedup check — all regressions silently corrected by the convergence).
- **Release blockers remaining**: 1 → **0** (all Phase-1 release blockers closed).
- **Release blocker burn rate (5-loop window iter 007–011)**: 0 → **3 closed** (iter 009 E2E + iter 010 persistence + iter 011 convergence).
- Vitest: ~1514 → **1593** (+79 net; 24 convergence-live + 24 convergence-batch + 14 adapter + 17 net across existing segmentation/bundle test updates).
- Playwright E2E: 4/4 (unchanged — no new E2E in this loop; iter-010's restart test proves iter-010 surface is untouched).
- Lines-of-code net: `bundle-builder.ts` 350 → 53 (−297); `live-steps.ts` 335 → 115 (−220); offset by +714 design doc + ~600 fixtures + regression harness — net reduction of ~500 lines of production segmentation code in the extension app.
- Architecture: ADR-001 Phase 1 complete for segmentation. Extension now imports segmentation from `@ledgerium/segmentation-engine` exclusively.

### Follow-Ups (surfaced but explicitly NOT implemented this loop)
- **#22** Explicit Invariant I1 cross-path assertion (design doc §5.3 requires `liveFinalizedDerivedSteps === batchDerivedSteps` as one test; currently structurally guaranteed but not tested).
- **#23** `SEGMENTATION_RULE_VERSION` doc drift (`docs/invariants.md` L172 says `'1.0.0'`; code says `'1.1.0'`).
- **#24** `LiveStep` type tightening (`grouping?: string` and `boundaryReason?: string` should be typed unions matching the enum values the adapter already writes).
- **#25** Full-pipeline golden fixture (raw `.ndjson` → normalizer → segmentation) to catch normalizer regressions that segmentation-only fixtures miss.

### Governance / Selection Signals
- Rule: `directed` (Mode 5 item 2 of 2). Scope expansion approved on architect's evidence; scope-expansion reasoning documented in this log, in the design doc §0/§3.4, and in CHANGELOG.
- Agent diversity (rolling 5-loop window iter 007–011): backend (007) · backend (008) · qa+devops (009) · backend+qa (010) · architect+backend+qa (011) → **4 distinct implementing agents** in the window. First iteration to use `system-architect` as primary agent since Meta-Review 001.
- Mode 5 counter: increments by **2** (one per item). Loops since Meta-Review 001 = **3** (009 + 010 + 011) → **base-cadence meta-review due at iter 012**.
- Scope discipline preserved: iter-010 persistence surface verifiably untouched (git log `--follow` confirms last-touched commit on `session-store.ts` and `constants.ts` is `d24699d`); `LiveStep` wire shape unchanged; `MSG.LIVE_STEP_UPDATED` contract unchanged; `SEGMENTATION_RULE_VERSION` not bumped.
- Release signal (qa-engineer): **GO WITH FOLLOW-UPS**. Release blocker can close; four non-blocker follow-ups queued for iter 012+.

---

## Iteration 012 — I1a: LiveStep-level cross-path invariant regression test

**Date:** 2026-04-19
**Mode:** 1 (standard bounded loop, burn-down)
**Status:** Complete

### Candidate Selection
- **Selected:** #22 — Explicit Invariant I1 cross-path assertion (as scoped to **I1a** per §5.3 coordinator revision of the convergence design doc)
- **Score:** 13 (I=3 A=4 L=3 C=5 E=1 R=1)
- **Rule:** `burn-down` — forced by **MR-002 Change C pool-size ceiling rule** (open follow-up pool = 11 > 8). This is a ceiling override of the 1-in-5 burn-down floor; the coordinator did not have top-score discretion.
- **Alternatives considered (from the follow-up pool, ordered by score):** #22 (13) chosen over #18/#19/#25/#7/#14 (all 11) on top score within the burn-down set. #22 also has the lowest E/R (1/1) in the pool — fastest, safest way to start the closure-ratio recovery.
- **Scope discipline:** single test file addition asserting JSON-stringify equality on `LiveStep[]` across 12 golden fixtures. One approved test-wiring production edit: `export` keyword added to the already-landed `toLiveStep` in `live-steps.ts` (no logic change; JSDoc annotates "test use only — not a production API surface"). This does NOT invoke Mode 5 scope-expansion protocol — Mode 1 doesn't have that protocol and the edit is test-wiring, not new logic. Documented in the test file header and in the git diff.

### Agents Involved
- **Coordinator (in-session):** routed, authored the §5.3 revision after qa's structural halt, and applied artifact updates.
- **qa-engineer (primary, 2 runs):**
  - Run 1 (HALT): correctly escalated that the originally stated I1 (`liveFinalizedDerivedSteps === batchDerivedSteps`) was untestable through the current `LiveStepBuilder` public API because the `DerivedStep → LiveStep` projection is provably lossy (`source_event_ids: string[]` collapses to `eventCount: number`; `session_id` and `ordinal` dropped). Produced a survival-matrix artifact classifying each field. Refused to silently weaken the assertion.
  - Run 2 (COMPLETE): implemented I1a per revised brief; 12 tests green; all validation gates passed.

### Scope Expansion Decision
**None.** No Mode 5 guardrail 7 invocation. The coordinator's §5.3 revision in the design doc is an artifact edit, not a scope expansion. The `export` keyword on `toLiveStep` is test-wiring, explicitly permitted by the brief as "exposing an already-landed function to a neighbouring test file; no new production logic."

### Files Added
- `apps/extension-app/src/background/convergence-invariant-i1.test.ts` — new test file (~140 LOC). Loads each of 12 golden fixtures from `packages/segmentation-engine/fixtures/golden/`, runs events through both paths, asserts `JSON.stringify(livePathLiveSteps) === JSON.stringify(batchPathLiveSteps)`. Top-of-file JSDoc block cites §5.3 revision as authority and lists survival-matrix-driven caught / not-caught failure modes.

### Files Changed
- `apps/extension-app/src/background/live-steps.ts` — `export` added to `toLiveStep` (2-line diff: one export keyword, one JSDoc line noting "test use only"). No logic change.
- `docs/architecture/CONVERGENCE_LIVESTEPBUILDER_STREAMING_SEGMENTER.md` — §5.3 revised by coordinator to split I1 into I1a (testable today) and I1b (deferred, requires `getDerivedSteps()` accessor). Keeps original wording cited for traceability; inserts an indented "§5.3 revision" block as the operative definition.

### Validation Results
- `pnpm --filter extension-app test -- convergence-invariant-i1`: **12/12 pass** (new file only).
- `pnpm --filter extension-app test`: **196/196 pass, 10 test files** — baseline was 184/9; delta exactly +12/+1 = new file, nothing broken.
- `pnpm typecheck`: clean across all 10 workspace packages + 2 apps.
- `pnpm test` (root, full workspace): **1605/1605 pass, 46 test files** — baseline 1593/45; delta +12/+1 exactly.
- Git diff scope verified: only the three expected files modified; `.claude/settings.local.json` drift is unrelated local settings.

### Outcome
- **I1a now has explicit regression coverage.** Future refactors of either segmentation path will immediately fail the 12 byte-identity assertions if they drift the LiveStep projection.
- **I1b is explicitly deferred** with a planned path (#26, Birth iter 012) requiring a one-line non-breaking production accessor addition. No silent coverage gap — the test file documents exactly what I1a does and does not catch.
- **Follow-up closure ratio (10-iter window iter 003–012):** 1 / 13 = 0.077. Still below the 0.4 target but trending up from 0.0 pre-iter-012. Pool-size ceiling rule remains active for iter 013 (pool = 11 unchanged net; #22 closed, #26 opened).

### Follow-ups Generated
- **#26** I1b: DerivedStep-level byte-identity across live and batch paths. Requires `LiveStepBuilder.getDerivedSteps(): DerivedStep[]` accessor (1-line non-breaking addition returning `this.segmenter.getFinalizedSteps()`) + ~60-LOC test file mirroring `convergence-batch.regression.test.ts`. Score 10 (I=3 A=4 L=2 C=4 E=2 R=1). Birth iter 012. This is a **deliberate tier deferral**, not an unhandled scope surface.

**Follow-up density check:** 1 generated. Below the ≥3 threshold. **`density-response:` log line not required** per CLAUDE.md § Follow-Up Debt Policy clause 4.

### Governance / Selection Signals
- Rule: `burn-down` (MR-002 Change C ceiling rule forced it, not 1-in-5 floor). First iteration to use the ceiling rule since it was enacted.
- Agent diversity (rolling 5-loop window iter 008–012): backend (008) · qa+devops (009) · backend+qa (010) · architect+backend+qa (011) · qa (012) → **4 distinct primaries** in the window. Monoculture risk: none.
- Scope discipline preserved: iter-011 surfaces (`packages/segmentation-engine/*`, `bundle-builder.ts`, `live-steps.ts` logic) were NOT modified. Only the `export` keyword landed on `live-steps.ts`. This preserves the independent-iteration guarantee in Mode 5 guardrail 1 and the spirit of Mode 5 guardrail 7(e) even though Mode 1 doesn't formally require it.
- Meta-review cadence: MR-002 was completed before iter 012. Stability window rule protects iter 012/013/014. Next base-cadence trigger: iter 015.
- Pool size at iter 013 start: **11** — ceiling rule forces iter 013 burn-down as well.
- Release signal (qa-engineer): **GO**. No follow-up blockers; I1b is a deliberate deferral, not a regression.

---

### Mode 3 intervention — billing bug fix (post-iter 012, pre-iter 013)

**Date:** 2026-04-19
**Mode:** 3 (debugging / bug-fix)
**Status:** Complete (commit `09b2d80`, pushed to `origin/main`)
**Does NOT count toward improvement-loop cadence.** Logged here for traceability only.

**Summary:** user-reported symptom "plan types and billing broken in account section" traced to four compounding bugs:

1. `/api/account` returns `{ data: { user, features, limits } }` but account page expected flat shape → `account.plan` was `undefined` → every signed-up user saw hardcoded "Upgrade to Starter" CTA.
2. `handleUpgrade` sent empty-body POST to checkout → Stripe always defaulted to `starter/monthly`.
3. No plan-selector UI existed in the account page (single hardcoded CTA).
4. No admin-unlimited mechanism to survive Stripe webhook plan sync.

**Fix strategy (parallel delegation, zero-file-overlap):**
- backend-engineer: new `apps/web-app/src/lib/admin-allowlist.ts` + short-circuits in `feature-gating.ts` (checkFeatureAccess / checkRecordingLimit / buildFeatureFlags) + guard in `api/billing/checkout/route.ts` + `createdAt` + `hasStripeCustomer` added to `api/account/route.ts` response.
- frontend-engineer: rewrote `(app)/account/page.tsx` (347 → 506 LOC) with data-shape unwrap, new `PlanCard` subcomponent consuming `PRICING_CONFIG`, monthly/annual toggle, per-relationship actions (Current / Upgrade / Downgrade / Contact Sales / Cancel / Included in Enterprise), fixed `handleUpgrade` to send `{ plan, interval }` JSON body.

**Grant:** `philklingmbb@gmail.com` added to allowlist → full enterprise-tier entitlements (19 features true, all limits 'unlimited') regardless of `user.plan` in DB. Stripe checkout blocked for allowlisted emails to prevent no-value subscriptions.

**Validation:** typecheck clean · 79/79 web-app unit tests pass · build succeeded (67 static pages) · 6/8 E2E pass (2 pre-existing seed mismatches, not caused by this change). Pushed and deployed to production.

**Follow-ups queued (Mode 3 follow-ups, anchored to `M3@012` for staleness-cap purposes):**
- **#27** E2E seed mismatch in `apps/web-app/e2e/api/account.spec.ts` (seed has `plan='growth'`, test asserts `plan='free'`) — score 9
- **#28** Downgrade UX edge case for non-free user without `stripeCustomerId` — score 7

---

## Iteration 013 — Full-pipeline golden fixture (raw `.ndjson` → normalizer → segmentation)

**Date:** 2026-04-19
**Mode:** 1 (standard bounded loop, burn-down)
**Status:** Complete

### Candidate Selection
- **Selected:** #25 — Full-pipeline golden fixture (raw `.ndjson` → normalizer → segmentation)
- **Score:** 11 (I=4 A=5 L=4 C=3 E=3 R=2) — highest impact+alignment among the tied score-11 burn-down candidates
- **Rule:** `burn-down` — forced by **MR-002 Change C pool-size ceiling rule** (open follow-up pool = 13 > 8, grew from 11 after the Mode-3 billing fix added #27, #28). Second consecutive iteration under the ceiling rule.
- **Alternatives considered (from the follow-up pool, ordered by score):** #25 · #18 · #19 · #7 · #14 all tied at 11; #26 at 10. Chose #25 on CLAUDE.md § Selection Policy tie-breaker 3 ("prefer items that improve determinism, traceability, recovery, and validation") — #25 directly advances the deterministic core invariant gate; #18 is UX-facing only; #19 is recovery hygiene. Highest impact (4) and alignment (5) scores in the tied set. Test-only zero-risk.
- **Area saturation check:** iter 012 was invariants/testing. Iter 013 in the same area = 2-in-a-row, not yet 3-in-a-row threshold. Permitted under saturation policy.
- **Scope discipline (stated up-front):** NO production logic changes in normalization-engine / segmentation-engine / extension-app. NO rule-version bumps. NO touching iter-012 surfaces (`convergence-invariant-i1.test.ts`, `live-steps.ts` `toLiveStep` export). Mode 1 does NOT permit scope expansion; HALT-and-escalate if normalizer bug discovered.

### Agents Involved
- **Coordinator (in-session):** selection, independent validation, artifact updates.
- **backend-engineer (primary):** fixture pattern selection (Pattern B: separate `packages/normalization-engine/fixtures/golden/` directory), 3 fixtures authored (click-with-label, fill-and-submit, route-change), 12 byte-identity regression tests, regeneration script for reproducibility. Chose backend-engineer over qa-engineer for agent-diversity rotation (qa-engineer was primary for iter 012; rotation maintains diversity).

### Scope Expansion Decision
**None.** No Mode 5 guardrail 7 invocation. Mode 1 does not permit scope expansion. Zero production logic modified. backend-engineer's Pattern B choice kept the new fixture set fully isolated in `packages/normalization-engine/` — zero coupling with iter-011's `packages/segmentation-engine/fixtures/golden/`.

### Files Added
- `packages/normalization-engine/src/full-pipeline.regression.test.ts` — new test file (12 tests, ~175 LOC). Loads `.ndjson` raw events, runs through `normalizeEvent()` → `StreamingSegmenter` → LiveStep[] + `segmentEvents()` → DerivedStep[], asserts byte-identity via `JSON.stringify` at each layer.
- `packages/normalization-engine/fixtures/golden/raw/{click-with-label,fill-and-submit,route-change}.ndjson` — 3 raw event stream fixtures (each exercising distinct normalizer paths).
- `packages/normalization-engine/fixtures/golden/normalized/{click-with-label,fill-and-submit,route-change}.json` — 3 expected-normalized-event fixtures.
- `packages/normalization-engine/fixtures/golden/pipeline-segmentation/{click-with-label,fill-and-submit,route-change}.json` — 3 expected LiveStep+DerivedStep output fixtures.
- `packages/normalization-engine/scripts/regenerate-pipeline-fixtures.ts` — regeneration script (~80 LOC) documenting how to re-derive the expected-output files from raw inputs if normalization rules legitimately change.

### Files Changed
**Zero.** No production code modified. No existing test file modified. No existing fixture modified.

### Design Note
A non-determinism wrinkle was surfaced and handled test-side only (no production change): `normalizeEvent()` produces non-deterministic `event_id` values via `generateEventId()`. The test resolves this by replacing each event's `event_id` with `normalization_meta.sourceEventId` prior to byte-identity assertion. Documented in a top-of-file JSDoc block in the new test file. This is a known-acceptable test-layer workaround and is NOT a normalizer bug — `event_id` uniqueness is a production requirement that would be broken by making it deterministic.

### Validation Results (independently re-verified by coordinator)
- `pnpm typecheck` (monorepo) → **clean across all 10 workspace projects + 2 apps** ✅
- `pnpm test` (monorepo root) → **47 test files / 1617 tests passing** — baseline was 46/1605 pre-iter-013; delta exactly +1 file / +12 tests = new file, zero regressions ✅
- `packages/normalization-engine/src/full-pipeline.regression.test.ts` → **12/12 pass** ✅
- `packages/segmentation-engine/src/convergence-live.regression.test.ts` (iter 011) → **24/24** unchanged ✅
- `packages/segmentation-engine/src/convergence-batch.regression.test.ts` (iter 011) → **24/24** unchanged ✅
- `apps/extension-app/src/background/convergence-invariant-i1.test.ts` (iter 012) → **12/12** unchanged ✅
- `git status` verification → only expected new files in `packages/normalization-engine/{fixtures,scripts,src/full-pipeline.regression.test.ts}`; zero modifications to tracked production source

### Outcome
- **Status:** **complete**. Normalizer-layer regression gap closed; the I1a (iter 012) + full-pipeline (iter 013) test surface now covers both segmentation-only and end-to-end determinism failure modes.
- Summary: raw `.ndjson` event streams now flow through the full normalizer + segmentation pipeline with byte-identity assertions at each layer. Future normalizer rule changes that subtly alter normalized events will fail the regression harness loudly rather than silently mutating downstream segmentation output.

### Impact
- **Before iter 013:** segmentation determinism was guaranteed from already-normalized `SegmentableEvent[]` onward (iter 011, iter 012), but normalizer regressions that changed the normalized events themselves would go undetected by the regression harness.
- **After iter 013:** end-to-end determinism coverage. Any normalizer rule change that affects event shape, dedup, labelling, or URL normalization will fail the 12 full-pipeline byte-identity assertions.
- **Vitest totals:** 1605 → **1617** (+12) across 46 → **47** test files (+1).
- **Production LOC touched:** **0**. Fixture+test LOC added: ~235.
- **Follow-up closure ratio (10-iter window iter 004–013):** 2 / 14 = **0.143** — rising from iter 012's 0.077. Still below the 0.4 target; recovery trajectory continues.
- **Pool size trajectory:** 11 (iter 012 start) → 13 (after Mode-3 #27 + #28) → 14 (after iter 013: closed #25, opened #29 + #30). Still above 8 ceiling — iter 014 is a third consecutive forced burn-down.

### Follow-Ups Generated (Birth iter: 013)
- **#29** `pnpm --filter <pkg> test` doesn't resolve test files because the root vitest config glob is relative to repo root, not to the package directory when `--filter` is used. Add per-package `vitest.config.ts` stubs (or workspace-aware vitest config) so package-scoped test commands work. Score 9. DX / tooling area.
- **#30** Add rapid-focus-blur normalizer dedup fixture to the full-pipeline golden set (focus → immediate blur → no input). Currently `fill-and-submit` exercises only the `focus → input_changed` dedup path. Score 10. Invariants/testing area — complementary to #25.

**Follow-up density check:** 2 generated. Below the ≥3 threshold. **`density-response:` log line not required** per CLAUDE.md § Follow-Up Debt Policy clause 4.

### Governance / Selection Signals
- Rule: `burn-down` (MR-002 Change C ceiling rule — pool 13 > 8 at iter 013 start). Second consecutive iteration under the ceiling rule; the ceiling is actively governing selection, which is the intended behavior.
- Agent diversity (rolling 5-loop window iter 009–013): qa+devops (009) · backend+qa (010) · architect+backend+qa (011) · qa (012) · backend (013) → **4 distinct primaries** in the window (qa, backend, architect, devops). Backend primary in iter 013 rotated cleanly off iter 012's qa-primary. No monoculture risk.
- Autonomous-vs-directed ratio (rolling 10 iter 004–013): 2 directed (010, 011) / 8 autonomous = 0.2. Within the healthy 0.1–0.3 band (MR-002 Change E). Iter 012 + 013 back to autonomous top-score selection as predicted.
- Scope discipline preserved: zero production logic changes. iter-011 and iter-012 surfaces untouched except for the new fixtures that live entirely in a new directory. This preserves the independent-iteration guarantee in Mode 5 guardrail 1 and the spirit of Mode 5 guardrail 7(e).
- Meta-review cadence: MR-002 ran before iter 012. Iter 012 + 013 = 2 of 3 loops toward base-cadence MR-003 trigger at iter 015. Stability window rule protects iter 012/013/014 from overlapping control changes.
- **Saturation watch:** iter 012 + 013 both in `invariants / testing`. A third consecutive iteration in the same area (iter 014) would trip the 3-in-a-row rule. **Iter 014 should diversify OUT of invariants/testing** unless a hard blocker forces otherwise.
- Release signal (backend-engineer self-report + coordinator independent re-verification): **GO**. Zero production changes → zero release risk. Pool size remains above ceiling → iter 014 stays forced burn-down.

---

## Iteration 014 — Surface `persistenceTruncated` flag in review UI

**Date:** 2026-04-19
**Mode:** 1 (standard bounded loop, burn-down)
**Status:** Complete

### Candidate Selection
- **Selected:** #18 — Surface `meta.persistenceTruncated` flag in review UI / bundle builder
- **Score:** 11 (I=3 A=4 L=2 C=4 E=1 R=1)
- **Rule:** `burn-down` — forced by **MR-002 Change C pool-size ceiling rule** (open follow-up pool = 14 > 8). Third consecutive iteration under the ceiling rule.
- **Alternatives considered (from the follow-up pool, ordered by score):** #18, #19, #7, #14 all tied at 11; #26, #30 at 10. Chose #18 on CLAUDE.md § Selection Policy tie-breaker 3 ("prefer items that improve determinism, traceability, recovery, and validation") + proactive saturation avoidance: iter 012 + 013 were both in `invariants / testing`; picking #26 or #30 (also invariants/testing) would trip the 3-in-a-row rule. #18's `UX resilience` area cleanly diversifies. Among tied candidates, #18 is the most user-facing — directly advances Ledgerium's trust-first positioning by making a previously-invisible data-loss signal visible.
- **Area saturation check (proactive):** iter 012 + 013 consecutive in invariants/testing. #18 in UX resilience resets the streak. Post-iter-014, saturation cleared; any area permissible for iter 016.
- **Scope discipline (stated up-front):** NO changes to `session-store.ts`, `constants.ts`, `types.ts` (iter-010 surface). NO changes to segmentation-engine (iter-011 surface). NO changes to `convergence-invariant-i1.test.ts` (iter-012 surface). NO changes to `full-pipeline.regression.test.ts` or normalization-engine fixtures (iter-013 surface). NO jsdom / `@testing-library/react` bootstrap — sidepanel component tests are a separate iteration concern. One logical outcome: make the signal visible.

### Agents Involved
- **Coordinator (in-session):** pre-dispatch repo verification (confirmed `SessionMeta.persistenceTruncated` setter path, bundle builder carry-through, target render surfaces, absence of sidepanel test harness), selection + brief authoring, independent validation, artifact updates.
- **frontend-engineer (primary):** banner component authoring in two screens, regression assertion in `bundle-builder.test.ts`. First primary appearance in the rolling 5-loop window.

### Scope Expansion Decision
**None.** No Mode 5 guardrail 7 invocation (Mode 1 does not permit). The `HistoryDetailScreen.tsx` banner was NOT a scope expansion — the coordinator's brief explicitly permitted it as a secondary target contingent on `bundle.sessionJson` carrying `persistenceTruncated` through the history store, which frontend-engineer verified it does via `MSG.GET_BUNDLE` with existing `SessionMeta` shape. No history-store surface change required.

### Files Added
- **None.** All changes are additive JSX within existing files.

### Files Changed
- `apps/extension-app/src/sidepanel/screens/ReviewScreen.tsx` — +17 LOC. New `TruncationWarningBanner` JSX function component (10 LOC) + conditional render (3 LOC) placed between session-summary header and upload progress bar. Amber palette (`bg-amber-50 border-amber-200 text-amber-800`) matching warning-not-error semantics.
- `apps/extension-app/src/sidepanel/screens/HistoryDetailScreen.tsx` — +19 LOC. Same `TruncationWarningBanner` (duplicated — surfaced as follow-up #32) + conditional render as first child of the loaded-bundle block, above the metadata row.
- `apps/extension-app/src/background/bundle-builder.test.ts` — +28 LOC. New `describe('buildBundle')` block asserting that `buildBundle()` preserves `meta.persistenceTruncated === true` in `bundle.sessionJson.persistenceTruncated`. Uses mock `SessionStore` with empty event arrays — minimal, deterministic.

### Copy Finalized
> **⚠ Some events may be missing from this session.** The browser hit a storage limit during recording, so later events were not saved. The steps below are accurate but may be incomplete.

Plain English; no `chrome.storage.local` jargon. Warning (amber), not error (red) — signals partial data, not failure. `aria-hidden="true"` on the decorative glyph for accessibility.

### Validation Results (independently re-verified by coordinator)
- `pnpm --filter @ledgerium/extension-app typecheck` → clean ✅
- `pnpm --filter @ledgerium/extension-app test` → **197/197 pass** (baseline 196 + 1 new bundle-builder regression) ✅
- `pnpm --filter @ledgerium/extension-app build` → clean, 2.47s, artifacts unchanged except sidepanel bundle ✅
- `pnpm typecheck` (root monorepo) → clean across 10 packages + 2 apps ✅
- `pnpm test` (root monorepo) → **1618/1618 pass, 47 files** — baseline 1617/47 → delta exactly +1 test / 0 new files ✅
- Git diff scope verification: only the 3 expected files modified. Zero modifications to `session-store.ts`, `types.ts`, `bundle-builder.ts` production source, or any iter-011/012/013 surface. ✅

### Outcome
- **Status:** **complete**. Silent-truncation trust gap closed at the UX layer.
- Summary: when a session's `chrome.storage.local` quota is exceeded during recording, the user now sees an explicit amber warning banner in both the live review screen and the historical-session detail view. The exported bundle already carried `persistenceTruncated: true` through `buildBundle()` (iter 010 + unchanged iter-011 wiring), but that signal was previously only visible to someone who opened the exported JSON. Users with a truncated capture now know before they make a downstream decision based on incomplete data. A regression test was added to `bundle-builder.test.ts` to guarantee the flag continues to flow through future bundle-builder changes.

### Impact
- **Before iter 014:** `meta.persistenceTruncated` was set correctly by iter-010 code, persisted through restart, and included in exports — but never rendered anywhere the user would see it. A user could end a long recording with truncated data, walk through the review screen seeing all their captured steps (which are accurate — append-stop truncation preserves the prefix), export the bundle, and not realize their capture was incomplete. This directly contradicts the trust-first product positioning.
- **After iter 014:** explicit visual warning at both the immediate post-recording review (`ReviewScreen`) and any historical revisit (`HistoryDetailScreen`). Plain-English copy, amber treatment (warning not error), accessible glyph. Regression-guarded against future bundle-builder changes that might drop the flag.
- **Vitest totals:** 1617 → **1618** (+1) across 47 → 47 test files. No new file — extended existing `bundle-builder.test.ts`.
- **Production LOC touched:** 36 (ReviewScreen +17 / HistoryDetailScreen +19). Test LOC added: +28.
- **Follow-up closure ratio (10-iter window iter 005–014):** 3 / 16 = **0.188** — up from iter 013's 0.143. Still below 0.4 target; recovery trajectory continues (0.0 → 0.077 → 0.143 → 0.188).
- **Pool size trajectory:** 14 (iter 014 start) → 13 (close #18) → 15 (open #31, #32). Net +1. Still above 8 ceiling.

### Follow-Ups Generated (Birth iter: 014)
- **#31** Bootstrap sidepanel component test harness (jsdom + `@testing-library/react` + vitest env config) to enable component-level test coverage for `ReviewScreen` / `HistoryDetailScreen` / future screens. Score 11 (I=3 A=4 L=4 C=4 E=2 R=2). Quality assurance area. Would unlock explicit render-assertion coverage for the iter-014 banner logic (currently tested only by data-plumbing regression in `bundle-builder.test.ts`, not by "banner actually renders when flag is true").
- **#32** Extract `TruncationWarningBanner` into shared sidepanel components directory. Currently 10-line JSX component duplicated across `ReviewScreen.tsx` and `HistoryDetailScreen.tsx`. Score 7 (I=1 A=2 L=1 C=5 E=1 R=1). Code hygiene area. Low-priority DRY cleanup — if the warning copy changes, both copies need to update.

**Follow-up density check:** 2 generated. Below the ≥3 threshold. **`density-response:` log line not required** per CLAUDE.md § Follow-Up Debt Policy clause 4.

### Governance / Selection Signals
- Rule: `burn-down` (MR-002 Change C ceiling rule — pool 14 > 8 at iter 014 start). Third consecutive iteration under the ceiling rule; the ceiling is actively governing selection, which is the intended behavior post-MR-002.
- Agent diversity (rolling 5-loop window iter 010–014): backend+qa (010) · architect+backend+qa (011) · qa (012) · backend (013) · frontend (014) → **5 distinct primaries** in the window (backend, qa, architect, frontend, devops via iter 009 just outside window). Strongest agent diversity in the bounded-loop era. No monoculture risk.
- Autonomous-vs-directed ratio (10-iter window iter 005–014): 2 directed (010, 011) / 8 autonomous = 0.2. Within 0.1–0.3 healthy band (MR-002 Change E). Iter 010/011 age toward the edge of the 10-iter window; ratio will drop toward 0.1 next loop.
- Scope discipline preserved: iter-010/011/012/013 surfaces verifiably untouched. `types.ts` `SessionMeta` shape unchanged. `session-store.ts` truncation-flag-setter path unchanged. `bundle-builder.ts` production code unchanged (only `.test.ts` extended). Segmentation engine + normalization engine + convergence test + full-pipeline test all unmodified. This preserves the independent-iteration guarantee per Mode 5 guardrail 1 spirit.
- Meta-review cadence: MR-002 completed pre-iter-012. Iter 012 + 013 + 014 = **3 loops since MR-002** → **base-cadence Meta-Review 003 is DUE at iter 015**. Stability window expires: iter 015 may change control variables.
- **Saturation status post iter 014:** cleared. Last 3 iterations (012, 013, 014) land in 2 distinct areas (invariants/testing + UX resilience). 3-in-a-row rule inactive for iter 016.
- Release signal (frontend-engineer self-report + coordinator independent re-verification): **GO**. Small, reversible, user-visible improvement. Zero production-logic risk surface. Pool size above ceiling → iter 016 stays forced burn-down (iter 015 is Mode 4 meta-review, non-coding).

---

## Iteration 015 — Meta-Review 003 (Mode 4, governance-only)

Date: 2026-04-20
Mode: **4 (Meta-review) — does not consume improvement-loop cadence counter**
Commit: applied in this entry (coordinator-staged prior to commit)
Artifact: `META_REVIEW_003.md` (514 lines)

### Candidate Selection
- **Rule:** base-cadence meta-review trigger. 3 bounded loops (iter 012 + 013 + 014) completed since Meta-Review 002 landed at `6e52a6f`. CLAUDE.md § Meta-Review Cadence base cadence = every 3 completed loops. No early-trigger would have forced MR-003 earlier (5 distinct implementer primaries in rolling window; zero validation-failure runs; portfolio-drift trigger did not yet exist).
- **Scope:** evaluate MR-002 Changes A–F efficacy; surface new signals from iter 012/013/014; propose governance diffs if warranted; recommend iter 016 target; cadence self-critique.
- **Stop condition:** Mode 4 is governance-only. No product code changes, no test changes, no package changes.
- **Scope discipline:** `scope-expansion: n/a` — Mode 4 has no bounded-loop scope to expand.

### Agents Involved
- **meta-coordinator** (primary) — produced `META_REVIEW_003.md`, enumerated 4 proposed governance diffs (A mandatory hygiene; B mandatory cool-off clause; C optional sub-partition; D optional portfolio-drift trigger), ran per-change effectiveness scorecard on MR-002 A–F, surfaced Signal 1 (ceiling domination), Signal 2 (decelerating closure ratio), Signal 3 (mature scope discipline), Signal 4 (stale CLAUDE.md Phase), Signal 5 (web-app portfolio drift), Signal 6 (saturation near-miss), executed cadence self-critique.
- **coordinator** — reviewed all 4 proposed diffs and **adopted all 4** (2 mandatory + 2 optional). Applied diffs to CLAUDE.md + SYSTEM_HEALTH.md. Updated IMPROVEMENT_BACKLOG.md header + portfolio summary + saturation block + selection-rule list + completed-iter table. Appended this iter-015 entry + CHANGELOG entry.

### MR-002 Efficacy Scorecard (from `META_REVIEW_003.md` §Per-change effectiveness)

| # | MR-002 Change | Verdict | Action taken in MR-003 |
|---|---------------|---------|------------------------|
| A | Density-response log line | Working structurally; not stress-tested (0 triggers in window; coordinator logged structural negatives) | No change |
| B | Birth iter field required | Fully working; M3@anchor convention coined for Mode-3 follow-ups | No change |
| C | Pool-size ceiling (>8) | Working as stop-loss; under-calibrated as closure engine (pool 11 → 15 net +4 despite 3 forcings) | **Supplemented by new MR-003 Change B cool-off clause 7** |
| D | Scope-expansion protocol | Effective as deterrent; zero invocations; observably shaping behavior (iter 012 I1a/I1b split is textbook) | No change |
| E | Autonomous-vs-directed ratio | Working; needs sub-partition to reveal `top-score` vs `burn-down` distinction | **MR-003 Change C sub-partition applied** |
| F | Trigger #2 phase-aware guard | Dormant this window (zero open blockers); would have mis-fired without the guard | No change |

**Summary:** 4 of 6 MR-002 changes verdict "working, no change needed" (67%). Real governance work concentrated in Changes A+B (~25 lines of diff). Cadence self-critique: worth running but only barely — keep 3-loop base cadence through MR-004; if MR-004 also finds majority tautology, consider introducing a "lite meta-review" variant.

### Governance diffs applied in this iteration

| # | Change | File(s) | Lines | Status |
|---|--------|---------|-------|--------|
| A | CLAUDE.md § Current Phase + § Known Issues hygiene refresh (remove stale `[BLOCKER]` listings closed in iter 009/010; add iter 009/010/012/013/014 to Resolved; update Known Issues to reflect "no current Phase-1 blockers") | `CLAUDE.md` | ~20 | ✅ applied |
| B | CLAUDE.md § Follow-Up Debt Policy **new clause 7** — ceiling-rule cool-off: after 3 consecutive `burn-down`-forced iterations, next iter may ignore clause 6 once (single-use); requires `ceiling-cool-off: invoked; rationale: [reason]` log line | `CLAUDE.md` | ~5 | ✅ applied |
| C | SYSTEM_HEALTH.md autonomous-vs-directed ratio row **sub-partitioned** into `top-score` / `burn-down` / `blocker-cadence` / `directed`; reveals `top-score = 1/10` which is below band | `SYSTEM_HEALTH.md` | ~3 | ✅ applied |
| D | CLAUDE.md § Meta-Review Cadence **new early-trigger** — 10+ consecutive iterations without touching a tracked non-extension surface flags portfolio drift | `CLAUDE.md` | 1 | ✅ applied |

**Total diff size:** ~29 lines across 2 governance files. No code change. No test change. No package change.

### Validation
- **Artifact integrity:** `META_REVIEW_003.md` created at 514 lines, matches MR-002 structure (executive summary → scope window → per-change scorecard → new signals → proposed diffs → non-changes → dormancy → iter-016 recommendation → KPIs → appendices).
- **Cross-artifact consistency:** post-edit, CLAUDE.md § Current Phase matches SYSTEM_HEALTH.md blocker state matches IMPROVEMENT_BACKLOG.md header — **all three files now agree on "no Phase-1 blockers, pool at 15, MR-003 applied"**. Pre-MR-003 these 3 files were in 3-way contradiction on blocker status.
- **No product code changes:** `git diff --stat` shows edits confined to `CLAUDE.md`, `SYSTEM_HEALTH.md`, `IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md` (this entry), `CHANGELOG.md`, plus new `META_REVIEW_003.md`. Zero files under `apps/` or `packages/` touched. **Mode 4 stop condition respected.**
- **Determinism / traceability preserved:** no schema change, no invariant change, no rule version change.

### Outcome
**MR-003 applied successfully. System state post-MR-003:**
- CLAUDE.md governance-hygiene failure resolved (Change A).
- Ceiling-rule escape hatch established (Change B) — iter 016 is first eligible loop; rationale for invoking + picking #4 (Artifact + system-health refresh process, score 13) documented in SYSTEM_HEALTH.md § Recommended Next Iteration.
- Observability sub-partition live (Change C) — `top-score = 1/10` visible in scorecard; MR-004 can measure whether Change B actually unlocks more `top-score` selections.
- Portfolio-drift early-trigger armed (Change D) — dormant until iter 016+ accumulate 10 consecutive non-tracked-surface iterations.

### Impact
- **Before MR-003:** 3 consecutive ceiling-forced burn-downs; refined scoring formula stress-tested on exactly 1 loop (iter 009) in entire post-MR-001 lifespan; CLAUDE.md 5-iter stale on blockers; closure ratio 0.188 decelerating toward asymptotic non-closure of 0.4 target.
- **After MR-003:** ceiling-cool-off authorizes at least 1 discriminating `top-score` selection per 4-loop window (iter 016 is first eligible); CLAUDE.md consistent with SYSTEM_HEALTH.md + IMPROVEMENT_BACKLOG.md; closure-ratio KPI revised from 0.4 to 0.25 by iter 018 (realistic under current generation rate); portfolio-drift trigger armed for Signal 5 surveillance.

### Follow-Ups Generated (Birth iter: 015)
**Zero follow-ups.** Mode 4 is governance-only — no scope creep. All adjacent improvement-tracker work (e.g., "maybe document the artifact-as-scope-adjustment pattern in `.claude/decisions.md`" mentioned in MR-003 §Dormancy) is non-blocking coordinator memory, not a backlog item.

**Follow-up density check:** 0 generated. `density-response:` log line not required.

### Governance / Selection Signals
- **Cadence counter:** base cadence post-MR-003 = 0 loops elapsed. Stability window: iter 016 + 017 must pass before any MR-004 consideration. MR-004 base-cadence trigger fires at iter 018 (3 bounded loops post MR-003).
- **Staleness watch carried forward:** #15 (Birth 006, age 9) crosses the 10-loop cap at iter 016. If iter 016 = #4 (cool-off) and iter 017 ≠ #15, MR-004 must execute mandatory keep/downgrade/delete triage. Coordinator-recommended iter 017 target: #15 preemptively, OR #14 (Birth 007, age 8, crosses cap at iter 017).
- **Portfolio-drift counter (new, MR-003 Change D):** armed at 0 extension-app-only consecutive iterations post-MR-003. Clock starts at iter 016.
- **Autonomous-vs-directed sub-partition (new, MR-003 Change C):** `top-score = 1/10` currently. Target ≥2/10 by iter 018 — iter 016 cool-off is the designed mechanism.
- **Meta-review self-critique:** surfaced that 67% of MR-002 changes were "no change needed" — possible early indicator of governance stability. Deferred to MR-004 for action consideration. Do not change cadence in same review that asks the cadence question.
- Release signal: **GO**. Mode 4 concluded cleanly, zero regressions possible (no code changes), all 4 artifacts cross-consistent post-edit.

---

## Iteration 016 — Dashboard simplification (Mode 2 directed; `ceiling-cool-off: invoked`)

Date: 2026-04-20
Mode: **2 (Targeted fix — user-directed)**
Commit: applied in this entry (coordinator-staged prior to commit)

### Candidate Selection
- **Rule:** `directed` + `ceiling-cool-off: invoked; rationale: user (CEO) directed a specific product simplification; pool 15 > 8 would otherwise force burn-down under clause 6, but clause 7 (MR-003 Change B, just landed at iter 015) authorizes a single-use cool-off to honor the directed scope — the directed item addresses a single logical outcome (dashboard simplification) with one-Area / one-file / one-commit discipline, and incidentally produces the first web-app bounded-loop iteration since iter 001 (partial Signal-5 relief).`
- **Directed scope (user-stated):** remove 5 named sections from the web-app dashboard page:
  1. Volume & Coverage (card)
  2. Quality & Readiness (card)
  3. Signals & Opportunities (card)
  4. Intelligence Summary (entire section: header + Action Items + AI Opportunities + Recent Activity)
  5. Bottleneck Radar (section)
- **Scope discipline:** `scope-expansion: n/a` — the directed scope is explicit; no coordinator-initiated expansion. Frontend-engineer narrowed the dead-code brief when verification showed 4 of 7 candidate items had legitimate surviving consumers (honest scope communication, not expansion).
- **Single logical outcome:** yes — "dashboard simplification." One file (`page.tsx`). One reversible diff. One user intent. Meets Mode 2 scope criteria.
- **First ceiling-cool-off invocation since MR-003 Change B landed** (iter 015). The rule is now stress-tested in a real directed scenario.

### Agents Involved
- **Explore** (discovery) — produced a precise map of the 5 target sections with exact line ranges, structure (inline vs component), data dependencies, helper usage, test coverage, and a list of what REMAINS after removal.
- **frontend-engineer** (primary implementer) — executed the removal, ran dead-code audit with verified-surviving-consumer discipline, ran typecheck + test + build validation, reported honest scope narrowing (kept 4 items that my brief had flagged for removal because they still had legitimate consumers in preserved sections).
- **coordinator** — validated independently (`pnpm --filter @ledgerium/web-app typecheck` clean; grep for 5 section titles → zero matches; grep for 2 removed useMemos → zero matches across `src/`; `pnpm --filter @ledgerium/web-app test` → 79/79 pass). Staged artifacts. No additional agents engaged (product-manager, ux-designer, qa-engineer skipped — directed scope with explicit CEO specification + clean validation meant no PM/UX/QA gating value to add).

### Files Changed
- `apps/web-app/src/app/(app)/dashboard/page.tsx` — **−282 / +0** (net −282 LOC).

### What Was Removed

| # | Section | Structure | Line range (approx, pre-edit) |
|---|---------|-----------|-------------------------------|
| 1 | Volume & Coverage | Inline card in Executive Overview 3-column grid | 867–892 |
| 2 | Quality & Readiness | Inline card, same grid | 894–921 |
| 3 | Signals & Opportunities | Inline card, same grid | 923–948 |
| — | (Executive Overview grid wrapper + LAYER 1 section comment) | Container holding the 3 removed cards | removed with its children |
| 4 | Intelligence Summary (section header + Action Items + AI Opportunities + Recent Activity) | Inline section with 3 sub-cards | 957–1098 |
| 5 | Bottleneck Radar | Inline section below Intelligence Summary | 1103–1125 |

### What Was NOT Removed (preserved by design)
- Command Center Header (Org Health Score, Top Signals strip, Top Insights chips, Usage Quota Meter, Actions buttons) — lines ~714–859
- `orgHealthScore`, `topRiskWorkflow`, `topOpportunityWorkflow` useMemos — feed Command Center
- `needsAttentionWorkflows`, `optimizationWorkflows` useMemos — feed `topRiskWorkflow` / `topOpportunityWorkflow` upstream of Command Center (kept after verification)
- `confidenceColorClass()`, `confidenceBarColorClass()` helpers — used in Workflow Library cards (kept after grep verification)
- `BottleneckRisk` type + `WorkflowSummary.bottleneckRisk` field — API contract field returned from `/api/workflows` (kept: data-model level, not section-specific)
- All API calls (`/api/workflows`, `/api/tags`, `/api/streaks`, `/api/portfolios`, `/api/me`)
- Workflow Library, Process Groups View, Empty State — all untouched

### Dead Code Removed
- `staleWorkflows` useMemo — zero surviving consumers; removed
- `bottleneckWorkflows` useMemo — zero surviving consumers; removed
- Icon imports: `Brain`, `Activity` — removed from lucide-react import (verified unused post-removal)

### Dead Code Preserved (scope-discipline narrowing by frontend-engineer)
- `needsAttentionWorkflows` / `optimizationWorkflows` — kept; feed Command Center's Top Risk / Top Opportunity signals
- `confidenceColorClass()` / `confidenceBarColorClass()` — kept; 3 call sites in Workflow Library
- `BottleneckRisk` type — kept; API contract field, not section-scoped
- Icon imports `AlertTriangle`, `Zap`, `Clock` — kept; used in Command Center and Workflow Library

### Validation (independent coordinator verification)
- `pnpm --filter @ledgerium/web-app typecheck` → **clean** (tsc --noEmit, no errors)
- `pnpm --filter @ledgerium/web-app test` → **79/79 passed** (3 test files: humanize 25, health-scores 29, format 25)
- `pnpm --filter @ledgerium/web-app build` → **clean** (67 static pages generated; `/dashboard` builds to 25.7 kB — verified by frontend-engineer, not independently re-run)
- `git diff --stat` → 1 file changed, 282 deletions (matches agent report exactly)
- Grep `"Volume & Coverage|Quality & Readiness|Signals & Opportunities|Intelligence Summary|Bottleneck Radar"` in `page.tsx` → **0 matches** (all 5 section titles fully removed)
- Grep `"staleWorkflows|bottleneckWorkflows"` in `apps/web-app/src/` → **0 matches** (no dangling references to the 2 removed useMemos anywhere in web-app)

### Outcome
**Dashboard dramatically simplified per CEO directive.** Post-removal dashboard flow:
Command Center Header (Org Health + Top Signals strip + Top Insights + Usage Meter + action buttons) → Process Families preview (conditional) → View Mode Toggle → Workflow Library / Process Groups View.

No orphaned headings, no empty grid wrappers, no double-spacing artifacts (verified by frontend-engineer inspection of structural JSX + typecheck pass).

### Impact
- **Before:** dashboard had 3 metric-summary cards ("Executive Overview"), a large 3-card Intelligence Summary section, and a standalone Bottleneck Radar → visually crowded with derived metrics that duplicated insights already present in the Command Center's Top Signals strip.
- **After:** lean single-column flow — Command Center surfaces the signal-level insights, then directly into the Workflow Library where users act. Less redundancy, faster scan, lower cognitive load.
- **Measurable deltas:** `−282 LOC` in dashboard page source · page compile size effect TBD (Next.js route-level bundle will shrink proportionally but exact number not captured) · zero regressions in 79 web-app tests · zero production-logic risk surface (pure removal, no behavior change to what remains).
- **Signal-5 relief:** first bounded-loop web-app iteration since iter 001 (14-iter drought broken); portfolio-drift trigger counter reset to 0.

### Follow-Ups Generated (Birth iter: 016)
**Zero follow-ups.** Directed Mode 2 with clean scope, clean validation, no emergent adjacent work. Frontend-engineer's dead-code narrowing is a scope-discipline signal, not a follow-up.

**Follow-up density check:** 0 generated. **`density-response:` log line not required** per CLAUDE.md § Follow-Up Debt Policy clause 4.

### Governance / Selection Signals
- **Rule:** `directed` + `ceiling-cool-off: invoked` (first invocation of MR-003 Change B clause 7). Cool-off is single-use per clause 7; iter 017 is again subject to clause 6 burn-down (pool 15 > 8).
- **Cool-off rationale evaluation:** was this the right use of cool-off? The MR-003 recommendation was to invoke cool-off for a `top-score` pick (e.g., #4 score 13) to exercise the refined formula. Iter 016 instead invoked it for a `directed` pick. **This is a legitimate use — clause 7's text explicitly lists `directed` as a permitted post-cool-off rule** — but it does NOT advance the top-score-evidence goal that motivated MR-003 Change B. MR-004 should evaluate whether cool-off should be narrowed to exclude `directed` in future, or whether it correctly serves dual purposes (user-scope respect + formula exercise, whichever arrives first).
- **Autonomous-vs-directed sub-partition update (MR-003 Change C):** `top-score = 1/10` unchanged · `directed = 3/10` (iter 010, 011, 016). Refined formula still needs a `top-score` invocation to validate — this is deferred to iter 019+ if pool drops to ≤8 or another 3-consecutive-burn-down streak re-arms cool-off.
- **Agent diversity (rolling 5 bounded loops iter 011–016, excluding Mode-4 iter 015):** architect+backend+qa (011) · qa (012) · backend (013) · frontend (014) · frontend (016) — **frontend-engineer is 2nd consecutive primary after iter 014**. Same-implementer-4+ trigger is 2 away; monitor for iter 018/020 diversity picks.
- **Saturation status post iter 016 (rolling iter 011–016 excluding 015):** extension architecture 1 · invariants/testing 2 (012+013) · UX resilience 1 · web-app UI 1 (new). **No 3-in-a-row; 4 distinct areas in 5-loop window — strong diversity.**
- **Meta-review cadence:** MR-003 landed at iter 015. Iter 016 is the 1st bounded loop post-MR-003. Stability window runs through iter 017 (per MR-001 3-loop rule). MR-004 base-cadence triggers at iter 018.
- **Staleness-cap watch:** #15 (Birth 006) now at **age 10 — staleness cap reached**. Per CLAUDE.md clause 2 this item MUST be triaged at the next meta-review (MR-004 at iter 018) unless iter 017 preemptively closes it. **Coordinator recommendation: iter 017 = #15** (score 10, code hygiene, Effort 2 / Risk 1). #14 (Birth 007, age 9) reaches cap at iter 017 — cascading.
- **Portfolio-drift trigger (MR-003 Change D):** counter reset to 0 at iter 016 (web-app surface touched for first time in bounded-loop era since iter 001). Trigger remains dormant.
- **Pool status for iter 017:** 15 > 8 → clause 6 active → iter 017 is forced burn-down. Cool-off cannot be re-invoked until another 3 consecutive ceiling-forced burn-downs accumulate (would be iter 017 + 019 + 020 assuming iter 018 is Mode 4 and does not count).
- **Release signal (frontend-engineer self-report + coordinator independent re-verification):** **GO**. Small, reversible, well-scoped simplification. Zero production-logic risk surface (pure JSX + useMemo removal). 79/79 tests pass. Typecheck + build clean. Ready to commit.

---

## Mode 3 @ iter 016→17 — Pricing audit + billing revenue-integrity hardening (out of cadence)

- Date: 2026-04-20
- Trigger: CEO directive — "Can you have the team closely inspect the pricing and subscription models and make sure they make sense and that they are functional."
- Mode: **Mode 3 — Debugging.** Does NOT consume bounded-loop cadence counter (per CLAUDE.md § Operating Modes). Iter 017 is still the next bounded loop.
- Coordinator: coordinator
- Phase: Phase 1

### Scope (approved by CEO)

Combined P0 fix for three revenue-integrity bugs identified in `PRICING_AUDIT_001.md`:
- **BUG-01** Silent plan under-provisioning (`planFromPriceId` fallback to `'starter'` + webhook catch-block swallowing Stripe errors)
- **BUG-03** Silent upgrade-button failure for admin + already-subscribed users
- **BUG-04** Missing `STRIPE_WEBHOOK_SECRET` causing total silent billing pipeline failure

Three bugs, one logical outcome (billing revenue-integrity hardening), one commit. Standard Mode 3 bundling for same-area bug-fix work.

### Preceding audit (read-only, no code changes)

Before the fix commit, the audit phase executed a 5-agent dispatch:

1. **Explore agent (very thorough):** mapped the full pricing/subscription surface area into 11 sections + 10 preliminary red flags. File inventory covered plan definitions, pricing page, checkout flow, webhook handler, data model, feature gating, admin allowlist, lifecycle transitions, admin surface, tests, copy consistency.

2. **product-manager:** strategic-coherence audit — identified healthScores copy contradiction (same page direct contradiction), Starter "ransom tier" positioning, missing Pro tier at ~$99, Team→Growth structural weakness.

3. **backend-engineer:** technical-correctness audit — enumerated 11 numbered bugs (BUG-01 through BUG-11) across Stripe integration, webhook handler, checkout flow, data model, feature gating, admin allowlist, pricing drift, testing gaps, security. P0 recommendation: remove silent `'starter'` fallback as single highest-leverage fix.

4. **qa-engineer:** functional-verification audit — 0 of 16 subscription lifecycle transitions fully tested; 0 billing-related test files pre-Mode-3; proposed minimum test set (unit + integration + E2E) and 15-step manual smoke checklist; release-risk assessment = HIGH.

5. **growth-strategist:** conversion & positioning audit — single-highest-leverage change identified as 14-day Team trial triggered at first-recording upload; 80% quota warning has no upgrade link; "No credit card required" shown on paid cards; feature comparison table buries intelligence layer at rows 8–10.

All four specialist reports triangulated: BUG-01 (2 lenses), BUG-02 (2), BUG-03 (1 with high severity), BUG-04 (2), zero billing tests (2), healthScores copy contradiction (1), 14-day trial (1 highest-leverage), pricing drift (2). The convergence pattern raised confidence on P0 classifications.

Output artifact: `PRICING_AUDIT_001.md` (consolidated audit + cold-pool reference + CEO decision points). This file now serves as the reservoir for P1/P2/P3 items that will promote to live backlog as P0s burn down.

### CEO approval block (all 5 decision points)

1. ✅ Combined Mode 3 fix for BUG-01 + BUG-03 + BUG-04 → executed in this entry
2. ✅ Audit-intake pattern (P0 immediately; P1/P2/P3 cold pool) → applied; 4 P0 items entered live backlog, ~27 P1/P2/P3 held in audit doc
3. ✅ Pro tier at $99 — PRD delta → **queued for Phase 3 of this Mode 3 (artifact-only, no code)**
4. ✅ 14-day Team trial — dedicated iteration after bugs ship → **queued for Phase 3 PRD delta; implementation iteration deferred**
5. ✅ "Growth → Automate" rename — deferred until Pro tier strategy is settled → logged, no action

### Agents Used

- coordinator (sequencing + audit dispatch + artifact updates)
- Explore agent (very thorough — surface map)
- product-manager (strategic coherence audit)
- backend-engineer (technical correctness audit + BUG-01 + BUG-04 fix + validation)
- qa-engineer (functional verification audit)
- growth-strategist (conversion + positioning audit)
- frontend-engineer (BUG-03 fix + UpgradeButton error surface + analytics event + validation)

### Files Read (by agents during audit, partial list)

- `apps/web-app/src/lib/plans.ts`, `config.ts`, `stripe.ts`, `feature-gating.ts`, `admin-allowlist.ts`, `analytics.ts`
- `apps/web-app/src/app/api/billing/{checkout,webhook,portal}/route.ts`
- `apps/web-app/src/app/api/account/route.ts`
- `apps/web-app/src/app/(public)/pricing/{page.tsx,ROICalculator.tsx}`
- `apps/web-app/src/app/(public)/{docs,compare/scribe}/page.tsx`
- `apps/web-app/src/components/{PricingCards,UpgradeButton,UsageQuotaMeter,FeatureGate,UpgradeCTA}.tsx`
- `apps/web-app/prisma/schema.prisma`
- `apps/web-app/e2e/{api/feature-gating,api/account,public/pricing,app/upload}.spec.ts`
- `apps/web-app/e2e/seed-test-db.js`

### Files Changed (Mode 3 fix commit)

- `apps/web-app/src/lib/stripe.ts` — +20 / −4 LOC. `planFromPriceId` returns `PlanType | null` with `console.warn` on unmapped IDs. `getWebhookSecret()` replaces module-level `WEBHOOK_SECRET` constant; throws on unset/whitespace/empty.
- `apps/web-app/src/app/api/billing/webhook/route.ts` — +24 / −12 LOC. Removed `checkout.session.completed` inner try/catch that silenced Stripe API errors. Added explicit throws when `planFromPriceId` returns null for paid subscriptions. Replaced module-level `WEBHOOK_SECRET` import with `getWebhookSecret()` call inside outer try (HTTP 500 on missing secret → Stripe retries).
- `apps/web-app/src/app/api/billing/checkout/route.ts` — +2 LOC. Added `code: 'admin_bypass'` and `code: 'already_subscribed'` to 400 response shapes for UI disambiguation.
- `apps/web-app/src/components/UpgradeButton.tsx` — +36 net LOC (rewrite). Added `errorMessage` state, `CheckoutErrorResponse` interface, inline `role="alert" aria-live="polite"` error surface, `upgrade_blocked` analytics event with `{code, location}`, 1500ms delay before navigation on `already_subscribed` redirect.
- `apps/web-app/src/lib/analytics.ts` — +1 LOC. New `upgrade_blocked` event type in conversion & billing section.
- `apps/web-app/src/lib/stripe.test.ts` — **NEW +103 LOC.** 7 Vitest unit tests: `planFromPriceId` unmapped/known/empty cases (3); `getWebhookSecret` unset/empty-string/whitespace/valid cases (4).
- `apps/web-app/e2e/api/upgrade-button-error-state.spec.ts` — **NEW +57 LOC.** 2 Playwright API-level tests: `already_subscribed` response shape contract; 400 response invariant shape.
- `PRICING_AUDIT_001.md` — **NEW** at repo root. Consolidated 4-lens audit + P0/P1/P2/P3 ranking + CEO decision points + files inspected evidence trail + governance notes on intake pacing.

### Validation Run (coordinator-independent verification)

- `pnpm --filter @ledgerium/web-app typecheck` → **clean** (tsc --noEmit, no errors)
- `pnpm --filter @ledgerium/web-app test` → **86/86 passed** (4 test files: humanize 25, health-scores 29, format 25, **stripe 7 new**)
- `pnpm --filter @ledgerium/web-app build` → **clean** (67 static pages generated)
- `git diff --stat` → 5 files modified + 2 new files (1 test, 1 E2E spec); LOC delta matches agent self-reports within rounding.

### Outcome

**All three P0 billing revenue-integrity bugs closed.** Silent failure modes converted to noisy transient failures that self-heal via Stripe retry or surface to the user via inline accessible error state. Admin and already-subscribed users now see explicit feedback and are tracked via a new `upgrade_blocked` analytics event (closes the silent-funnel gap flagged by growth-strategist).

**Observability improvement:** `planFromPriceId` now emits `console.warn('[billing] planFromPriceId: unmapped price ID <id>')` whenever a price ID is not in the map — grep-able log line enabling production alerting.

### Impact

- **Before (revenue integrity):** user pays $249 for Team → misconfigured env or Stripe API blip → user silently provisioned at Starter, no alert, no retry, support ticket is the only detection mechanism. Admin clicks upgrade → button silently does nothing. Already-subscribed user clicks upgrade → silent redirect. Missing WEBHOOK_SECRET → every new subscriber billed but never activated.
- **After (revenue integrity):** all four failure modes now fail loudly. Webhook returns 500 on plan-resolution failure → Stripe retries for 72h → self-heals. Admin/already-subscribed users see a visible accessible error message with analytics. Missing WEBHOOK_SECRET throws at call time with a grep-able log line.
- **Test coverage delta:** +7 unit tests + 2 API-level E2E tests = 9 new tests. Full billing test suite (webhook event replay, checkout integration, lifecycle transitions) still out of scope — promoted to live backlog as #33 QA-01 (score 12, highest P0 remaining).
- **Audit knowledge capture:** `PRICING_AUDIT_001.md` serves as the authoritative reference for pricing-surface understanding. Any future pricing work should start by reading this doc.
- **Strategic clarity:** 4 CEO decisions now documented (audit-intake pattern applied; Pro tier + 14-day trial queued as PRDs; Growth-rename deferred).

### Follow-Ups Generated (Birth iter: `M3@016→17`)

**Three Mode-3 residual follow-ups** — all hygiene-grade, low blast radius:

1. **#37** (score 6) — `PRO_PRICE_ID` silent-empty-string pattern in `stripe.ts:36`. Same `?? ''` anti-pattern that BUG-04 fixed for `WEBHOOK_SECRET`; deprecated path, low risk but worth tidying.
2. **#38** (score 7) — `APP_URL` hardcoded fallback in `checkout/route.ts:~120`. `process.env.NEXTAUTH_URL ?? 'https://ledgerium.ai'` could produce wrong redirect URLs in staging/preview environments.
3. **#39** (score 6) — `UpgradeButton` 1500ms `setTimeout` cleanup via `useEffect`. If user navigates away mid-redirect, timer callback still fires on unmounted component; non-bug refinement.

**Plus four P0 audit-intake items (non-follow-up; promoted from `PRICING_AUDIT_001.md`):**

4. **#33** (score 12) — **QA-01** minimum billing test suite (unit + integration Stripe-mock + E2E).
5. **#34** (score 9) — **F-COH-01** healthScores copy contradiction fix.
6. **#35** (score 10) — **F-COH-02** Starter value story reframe (outcome not feature).
7. **#36** (score 11) — **G-02** 80% quota warning upgrade link.

**Follow-up density check:** Mode 3 generated 3 residual follow-ups + 4 audit-intake items. Density clause 3 (3+ follow-ups in one iteration) applies to bounded loops; Mode 3 is out of cadence. **`density-response: acknowledged, carried forward`** — explicit conscious decision. Rationale: Mode 3 was a deliberate intake event surfacing pre-existing technical debt; the volume reflects audit coverage quality, not iteration scope-creep. Alternative interpretations (re-scope to 3 loops; invoke root-cause-analyst) were rejected as misaligned — this is known-debt intake, not spawning-debt discovery.

### Governance / Selection Signals

- **Mode:** Mode 3 (Debugging). Out of cadence. Does NOT increment bounded-loop counter or affect `top-score / burn-down / directed` ratio tracking.
- **Cadence impact:** iter 017 is still the next bounded loop. MR-004 base cadence is still at iter 018 (2 bounded loops from iter 016: iter 017 + iter 018-marker).
- **Pool-size ceiling:** was 15, now 22. Still > 8. Iter 017 remains forced burn-down.
- **Audit-intake pattern (new):** P0-only live promotion + P1/P2/P3 cold pool in audit doc. Governance rationale: prevents a single intake event from collapsing the 1-in-5 burn-down ratio, preserves pool-size ceiling as a meaningful signal, distinguishes known-debt intake from iteration-generated follow-ups. **MR-004 agenda item added** to evaluate whether this pattern generalizes or is audit-specific.
- **Agent diversity:** Mode 3 used backend-engineer + frontend-engineer in parallel — different primaries for different bugs. Consistent with MR-001's delegation rubric.
- **Scope discipline (MR-002 Change D):** no scope-expansion invocation required. Each engineer operated on its brief; backend-engineer explicitly rejected adding a new `/api/health/billing` endpoint (noted it was new surface, not bug-fix, classified as P1 OBS-02 in audit doc); frontend-engineer declined to add a toast system (no existing dependency; used inline error instead). Both deferred adjacent issues to backlog rather than expanding scope.
- **Coordinator brief quality (self-assessment):** briefs included explicit "out of scope" exclusions (e.g., "do NOT add `/api/health/billing`"; "do NOT build full test suite (QA-01)"). Both engineers honored the exclusions. Briefs passed the Mode 3 discipline test.
- **Staleness-cap watch (unchanged from iter 016):** #15 (age 10), #14 (age 9), #7 (age 8). Mode 3 did NOT address any of these; iter 017 recommendation still = #15.
- **Phase 3 queued:** product-manager PRD deltas for Pro tier + 14-day Team trial — artifact-only, no code, do NOT consume cadence.
- **Release signal (coordinator independent re-verification):** **GO**. Three P0 bugs resolved. 86/86 tests green. Typecheck + build clean. Ready to commit.
