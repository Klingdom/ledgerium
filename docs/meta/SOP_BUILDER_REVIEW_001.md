# SOP Builder Review 001 — Consolidated Findings

**Type:** Mode 3-adjacent multi-agent strategic review (NON-counting; zero product code changed).
**Date:** 2026-07-20. **Agents:** 10 in parallel, including one new agent type created for this review (`sop-domain-expert`).
**Directive (CEO, verbatim):** *"review the current state workflow SOP views - Execution SOP, Flow View, and Analysis to determine realworld improvements that can be made to make the SOP section the most capable and powerful SOP builder on the market today."*

**Predecessor:** `docs/meta/FUNNEL_AND_SOP_REVIEW_001.md` (2026-07-19, 13 agents). Its findings are relied on, not re-derived. Every item below tagged **[VERIFIED]** was independently re-checked by the coordinator against source after the agent reported it.

---

## 1. Verdict

**"Most powerful SOP builder" is not currently a claim the product can make, for two independent reasons — and the second one is new.**

**Reason one — it is not a builder.** There are zero mutation paths. All eleven surveyed competitors (Scribe, Tango, Guidde, Trainual, Process Street, SweetProcess, Document360, Whatfix, Dozuki, MaintainX, Whale) have step editing. It is the definitional capability of the category. A tool that cannot be edited is a *generator*, which is a different product.

**Reason two — the document would be rejected by a quality manager on sight.** This is the finding the predecessor review did not reach, and it is more serious than the missing editor:

- `sopBuilder.ts:158` emits **`version: '2.0'` as a hardcoded literal**, with zero increment logic anywhere in the package. **[VERIFIED]** Every SOP the system has ever produced carries the identical version string.
- `generatedAt` is the *recording start time* (`sopBuilder.ts:171`), not a document date.
- There is no approver, no effective date, no revision history, no supersession, no review cadence.

Against **ISO 9001:2015 clause 7.5.2** (identification, and review and approval for suitability) this is a clean major nonconformity, not a judgement call. Clause 7.5.3.2 (version control, prevention of unintended use of obsolete documents) adds a minor.

**The third reason, which is the sharpest:** the fields a reader trusts most are template-generated.

---

## 2. A new failure class

The predecessor review's headline was **built, then never connected**. That pattern holds and extends (§4). But this review surfaces a *different* and more corrosive class:

**Template-generated content occupying the fields a reader trusts most, and constants occupying the fields a controlled document is defined by.**

All **[VERIFIED]** at `packages/process-engine/src/templates/sopTemplates.ts`:

| Line | Emitted content | Problem |
|---|---|---|
| `:209` | `` `${step.system} accepts the submission` `` | Every decision point's success condition, invented |
| `:212` | `` `${step.system} returns an error` `` | Every failure condition, invented |
| `:239` | `controls.push('Verify system confirmation at each submission step before continuing')` | **Unconditional control assertion.** A quality manager is audited against controls their documents claim |
| `:371` | `escalationRules.push('...escalate to a supervisor or system administrator')` | Invents an org structure the system has never observed |

Plus `deriveCommonMistakes()` and `deriveTips()`, which fire canned prose off structural triggers — *"Submitting forms before all required fields are complete"* appears whenever any `error_handling` step exists, regardless of what the error was.

This is the same truthfulness defect as the predecessor's S-2 (fabricated `expectedOutcome`), but in the governance and training sections, and **it would survive an S-2 fix.** It is deterministic guessing — defensible as an engineering property, indefensible as a truth claim, in a product whose entire differentiator is "traceable to observed evidence, not guessed."

**The cheapest quality improvement available is deletion.** Removing the fabricated content makes the document shorter, more honest, and materially closer to signable — before a single feature is built.

---

## 3. The rubric miscounts itself

`docs/sop/QUALITY_RUBRIC.md` §4.10 defines score **3** as requiring *"review cadence and next review date"* for Enterprise. **[VERIFIED]** The `EnterpriseSOP.revisionMetadata` type carries only `{ generatedAt, engineVersion, basedOn }` — no such fields exist. Maximum achievable is **2**.

The rubric's §8 worked example scores that category **3** and publishes a normalized **94 / "Best-in-class — ready to feature."** §9.3 sets the marketing-feature threshold at ≥90.

So the exemplar the team calibrates quality against scores itself on a criterion the data model cannot satisfy, and the marketing bar rests on that miscount. Fix the rubric or fix the type — but do not keep scoring against it.

---

## 4. Verified findings

### P0 — Correctness and integrity

| ID | Finding | Status |
|---|---|---|
| **B-1** | `version: '2.0'` hardcoded; zero increment logic in the package | **[VERIFIED]** `sopBuilder.ts:158` |
| **B-2** | Fabricated decision conditions, controls, escalation, common-mistakes (§2) | **[VERIFIED]** `sopTemplates.ts:209,212,239,371` |
| **B-3** | **Duplicate-artifact race producing non-deterministic exports.** `WorkflowArtifact` has only `@@index([workflowId])` — no unique constraint on `(workflow_id, artifact_type)`. `workflows/[id]/route.ts:66-95` does a non-atomic `hasTemplates` check then `createMany` **on a GET**. Two concurrent GETs both write. `export-markdown/route.ts:50` reads with `findFirst`. Same workflow, different exported document. | **[VERIFIED]** |
| **B-4** | **Raw evidence is not in the off-host backup.** Uploads live at `/app/data/uploads` inside the `ledgerium-data` named volume, so they survive redeploys. But `scripts/db-backup.sh` backs up only `sqlite3 .backup` of `ledgerium.db`. After the volume-loss event the runbook itself names as its threat model, you restore every workflow row and every `process_output` with every `source_bundle` path dangling — regeneration impossible, evidence-linkage claim void. | **[VERIFIED]** — independent of SOP work |
| **B-5** | SOP quality gate never runs in production (predecessor S-1) | **[VERIFIED]** by predecessor |

### P0 — Blockers before any authoring code

| ID | Finding | Status |
|---|---|---|
| **B-6** | **web-app cannot run component tests.** `environment: 'node'`; zero `@testing-library` / `jsdom` deps; **9 `.test.tsx` files, zero call `render()`** — all are mirror-tests re-implementing component logic. 3,991 LOC across 8 `sop-view` components has zero render coverage, and the tooling to write it isn't installed. | **[VERIFIED]** |
| **B-7** | **The view model is not edit-aware.** `buildSOPViewModel` is all-or-nothing. `buildPhases` mutates `step.phaseId` as a side effect while folding across the array; `buildDecisions` looks one step ahead, so editing step N's category silently changes step N−1's decision text. No partial-invalidation path; the model is a pure `useMemo` over props, held in state nowhere. | **[REPORTED]**, cited |
| **B-8** | **Memoization already defeated in production.** `page.tsx` has 10 `useState` hooks and zero `useMemo`, rebuilding `workflowRecord` / `sopTemplates` / `sopStepPageContext` as fresh literals every render. Clicking Share or toggling favourite triggers a full SOP view-model rebuild today. Editing would amplify this structurally. | **[REPORTED]**, cited |
| **B-9** | **No persistence surface for SOP content.** `WorkflowArtifact` has no `updatedAt` and zero `.update()`/`.upsert()` calls anywhere; the existing PATCH route touches only flat `Workflow` columns. No precedent exists in the codebase for patching a JSON artifact blob. | **[REPORTED]**, cited |

### P1 — Built and not connected (pattern continues)

| ID | Finding | Status |
|---|---|---|
| **B-10** | **`WorkflowShare` is fully built and has zero frontend callers.** Prisma model at `schema.prisma:550-566` with `sharedWith`, `shareType` (user\|team), `sharedBy`, unique constraint, two indexes — and `permission` defaulting to `viewer` with **`editor` already in the enum**. Full GET/POST/DELETE route at `api/workflows/[id]/share/route.ts` with team-membership checks and server-side analytics. Nothing calls it. **This is "assign an SOP to a person" — the entire point of an SOP — built and unreachable.** | **[VERIFIED]** |
| **B-11** | **The SOP surface is entirely uninstrumented.** `sop_mode_switched`, `sop_step_expanded`, `sop_step_checked` all have **zero call sites**. The single `sop_mode_switched` match in the tree is a code comment at `SOPPageShell.tsx:114` *claiming* coverage that does not exist. Three modes and a step checklist shipped; nobody can see if any of it is used. | **[VERIFIED]** |
| **B-12** | **Enterprise plan flags gate nothing.** `auditTrail`, `complianceExports`, `customRetention`, `rbac` — zero consuming files outside the flag definition and its test. | **[VERIFIED]** |
| **B-13** | **The entire SOP surface is ungated by plan.** Zero `hasFeature`/`useFeatureGate` references anywhere in `sop-view/`. A free user who records twice gets the Living-SOP conformance signal — the strongest document-control capability in the product — for nothing. | **[VERIFIED]** |
| **B-14** | **Audit trail self-destructs.** `ProcessEvidenceReview` records reviewer + timestamp + action, then soft-deletes on `retention_until_ms` and **hard-deletes at day +30** (`schema.prisma:778-783`). An audit trail with a 30-day hard-delete is telemetry. | **[VERIFIED]** |
| **B-15** | **No job queue exists.** Zero `bullmq`/`ioredis` anywhere, despite `CLAUDE.md` listing "Queue: BullMQ + Redis" and the standard "async jobs >200ms return job_id". Regeneration is the one operation that needs it. | **[VERIFIED]** |
| **B-16** | Undeclared regeneration on a read path: `workflows/[id]/route.ts:66-95` renders templates on GET, stamped `schemaVersion: '1.0.0'` hardcoded — a false vintage | **[VERIFIED]** |

### P1 — Redundancy and fabrication in the view layer

| ID | Finding | Status |
|---|---|---|
| **B-17** | **Four independent step-card implementations** (`ExecutionStepCard`, `VisualStepCard`, `SmartStepCard`, plus `SOPStepCardCompact` which is **dead code** with zero call sites), three `SectionLabel` copies, two confidence indicators, and `recommendations[]` rendered **three times** — a user reading all modes sees the same suggestion up to three times with no acknowledgement. | **[REPORTED]**, cited |
| **B-18** | **All five "Real vs Expected" rows are fake.** Two set `expected` to the same formula as `actual` (100% match by construction); three hardcode `expected: '0'`. | **[REPORTED]**, cited |
| **B-19** | `decision_based` template collapses to a single unconditional branch whenever no `error_handling` step sits at exactly `ordinal + 1` — a "Decision-Based SOP" that is a numbered list | **[REPORTED]**, cited |

---

## 5. The architecture answer

Two agents reached the same design independently, from different directions. That is the strongest signal in this review.

**Human edits do not break determinism, because they are not nondeterminism — they are a second input.**

Today: `SOP = G(evidence)`, `G` pure.
Proposed: `rendered = M( G(evidence), overlay )`, where `M` is a pure total merge and the overlay is append-only.

Both functions stay deterministic. The claim becomes: ***"Given the same recorded evidence and the same edit history, Ledgerium reproduces the same document, byte for byte."*** That is stronger than anything a competitor can say.

Invariants are violated only if edits (a) mutate `G`'s output in place, or (b) flow back into `G`'s input. Both are avoidable by construction.

**Convergent design decisions:** generated artifact never mutated; per-field overlay granularity (not whole-doc, not whole-step); append-only supersession rather than deletion; provenance as a first-class four-valued origin (`observed` / `derived` / `authored` / `absent`), generalizing the `outcomeObserved` boolean that already exists.

**Unresolved fork:** the architect proposes a content-addressed event log; backend proposes relational overlay tables. These may be compatible (log as write path, relational projection for reads) but that has not been established and must be before either is built.

**Unresolved hard problem — flagged by both, solved by neither:** *orphaned overlays after regeneration.* If step 7 carries an edit and regeneration changes the step count, does the edit follow the semantically-same step or is it now wrong? That needs step-identity stability across re-derivation, which neither agent verified. **This must be answered before authoring is built, not during.**

**Migration gift with an expiry date:** because zero mutation paths have ever existed, every stored SOP is provably 100% engine-derived. That certainty is available exactly once and is destroyed the moment authoring ships. **Stamp provenance before, not after.**

---

## 6. A coupling nobody would have caught separately

Fixing S-2 (stop fabricating `expectedOutcome`) and flipping validator **rule 4** (empty `expectedOutcome` → reject) to hard-reject are **coupled changes**.

Once outcomes stop being fabricated, some steps will legitimately have no observed outcome event. Rule 4 would then reject documents that are *more* honest than before. Shipping these independently makes an honesty fix look like a regression.

Related: the gate should land as **warn/annotate first, reject second, with a measurement window between.** Nobody knows the real-world rejection rate, because the gate has never run against real sessions — and the 10 fixtures pass trivially, so they cannot tell us. Flipping straight to reject risks rejecting an unknown fraction of currently-passing sessions.

---

## 7. Recommended sequence

Authoring is **not** next. Six things must land first, and most are cheap.

| # | Step | Why first | Owner |
|---|---|---|---|
| 1 | **Delete the fabricated governance content** (§2) | Makes the document more honest and closer to signable with zero new features. Cheapest quality gain available. | `backend-engineer` |
| 2 | **Real version identity + approver + effective date** | B-1 is the disqualifying finding. Without an incrementing version, two people holding two copies cannot tell which is current — the founding problem SOPs exist to solve. | `backend-engineer` + `system-architect` |
| 3 | **Fix B-3** (unique constraint + move the write off the GET path) and **B-4** (back up raw evidence) | Both are integrity defects independent of SOP work. B-4 voids the evidence-linkage claim on restore. | `backend-engineer` + `devops-engineer` |
| 4 | **Wire the quality gate** — warn-only, then measure, then decide reject (§6) | B-5. Activates 6 built rules for every session. | `backend-engineer` |
| 5 | **Wire `WorkflowShare` UI** (B-10) | Highest return, lowest risk in the review. UI against a finished, permissioned backend. Turns a share from informational into operational. | `frontend-engineer` |
| 6 | **Instrument the SOP surface** (B-11) — three dead events, plus provenance carried through the adapter | Three modes shipped with zero usage data. Also the prerequisite for edit-location analytics, the highest-value signal the product could collect. | `analytics` + `frontend-engineer` |
| 7 | **Install jsdom + testing-library; consolidate four step-cards into one; fix the memo defeat** (B-6, B-17, B-8) | Prerequisites for touching these files safely. Otherwise an edit affordance gets built four times and drifts. | `frontend-engineer` + `qa-engineer` |
| 8 | **Then**: step-level text correction with provenance | The MVP of authoring — highest-weighted rubric category, lowest determinism risk, unlocks every later rung. | `frontend-engineer` + `backend-engineer` |

**Explicitly do not build:** free-form diagram authoring; unconstrained AI rewrite of step text; real-time collaborative editing; a fourth or fifth template variant while `decision_based` remains unread and degenerate.

---

## 8. Positioning

The product **never calls itself an SOP builder anywhere in its own copy** — the only match in the tree is a code comment referencing `sopBuilder.ts`. It is invisible to the highest-intent term in the category while competitors own it.

Recommended resolution: keep the term for SEO entry, subvert the verb in the same sentence.

> *"Ledgerium is the SOP builder where the SOP writes itself — record the process once, and get a step-by-step procedure with every instruction traced to the moment it happened."*

**"Deterministic, evidence-linked" is an engineering virtue, not a buyer benefit.** Nobody searches for it. The buyer-legible translation already exists in the product and is under-used: the **Living-SOP conformance pill** — *"2 of 5 runs deviate from this SOP — see exactly where."* Falsifiable, concrete, and a direct answer to the homepage's own headline. It is also the natural value-triggered upgrade moment, replacing the current quota wall.

**Straight answer on the category question:** do not chase "most powerful." Scribe has $75M at a $1.3B valuation and 94% Fortune 500 penetration; feature parity is achievable engineering, distribution parity is not. The defensible position is narrower and currently uncontested — **no surveyed competitor can tell you what changed between two observations of the same process**, because none holds an immutable observation record. That is reachable only after editing exists, because a document nobody can correct is a document nobody re-records.

---

## 9. Open CEO decisions

1. **Sequence** — accept §7 (repair before authoring), or direct authoring first.
2. **The overlay fork** — event log vs. relational tables. Needs resolution before either is built.
3. **Orphaned-overlay semantics** (§5) — unresolved by both agents; needs a product decision.
4. **Audit-trail retention** (B-14) — the 30-day hard-delete may be a deliberate privacy posture. If so, nothing should be described as an audit trail. If not, it is an unwind.
5. **Plan gating** (B-12, B-13) — Enterprise flags gate nothing; the SOP surface gates nothing. Where does the paywall go?
6. **Regulated-buyer features** — e-signature, training records, immutable audit. The domain expert's recommendation: **do not build speculatively.** Each needs a named customer as trigger.

---

## 10. New agent

`.claude/agents/sop-domain-expert.md` was created for this review — the roster had 20+ agents and nobody who knew what a professionally good SOP is. It produced the findings in §2, §3, and B-1/B-14, none of which the other nine reached. It is registered and available for future sessions.
