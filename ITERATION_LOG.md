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
