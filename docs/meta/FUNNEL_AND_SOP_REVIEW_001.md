# Funnel & SOP Review 001 — Consolidated Findings

**Type:** Mode 3-adjacent multi-agent strategic review (NON-counting; zero product code changed).
**Date:** 2026-07-19. **Agents:** 13 in parallel across two tracks.
**Directive (CEO, verbatim):** (a) *"review current system documentation and overall product roadmap to determine next steps in development with a focus on SEO/AEO, Marketing, Call to Action, and Sign ups"*; (b) *"review and analyze the current state SOP views and dramatically improve them and recommend how to capture more details without going against privacy first model with recorder"*.

**Track A (7 agents):** growth-strategist, market-research, competitive-researcher, analytics, ux-designer, product-manager, frontend-engineer.
**Track B (6 agents):** ux-designer, frontend-engineer, system-architect, extension-privacy-auditor, backend-engineer, qa-engineer.

**Verification standard.** Every finding below marked **[VERIFIED]** was independently re-checked by the coordinator against source after the agent reported it. Findings marked **[REPORTED]** are agent-sourced and cited but not independently re-run. One agent claim was **corrected** (see §7). Prior-session precedent for evidence discipline: an earlier page count in this session was wrong because it was inferred rather than verified.

---

## 1. Headline

**The constraint is not SEO volume, and it is not SOP feature scope. It is a systemic last-mile connection gap.**

Across both tracks, thirteen independent reviews converged on the same structural pattern: correct machinery is built, tested, and then not connected to the path a user actually travels.

| Built and correct | Connection status | Evidence |
|---|---|---|
| SOP quality gate (6 rules) | never called by ingestion | **[VERIFIED]** zero refs to `validateRenderedSOP`/`processSessionFull` in `apps/web-app`; `ingestion.ts:9,100,147` |
| `AskThisProcessPanel` (425 LOC + tested API route) | zero imports; placeholder renders instead | **[VERIFIED]** grep returns no import statements |
| `neighbor-context-extractor` (fully PII-guarded) | never called | **[REPORTED]** `target-inspector.ts:144` calls `extractLabel`, not `extractLabelWithContext` |
| `OnboardingChecklist` + extension-install prompt | unreachable for real signups | **[VERIFIED]** `signup/route.ts:70-72` seeds 5 workflows; `dashboard/page.tsx:755` gates on `totalWorkflows === 0` |
| `/demo` (interactive, no login) | not linked from any of 164 SEO pages | **[REPORTED]** grep of `components/seo/` finds no `/demo` link |
| `SOP.inputs` / `outputs` / `notes` | computed by engine, dropped by view adapter | **[VERIFIED]** built at `sopBuilder.ts:164,165,170`; zero refs in `sopViewModel.ts` |
| `sourceEventId` / `eventType` / `redacted` / `sourceStepId` | carried for traceability, dropped by adapter | **[REPORTED]** `sopViewModel.ts:196-207` |
| `interactionType` / `ancestorPath` / keyboard / drag fields | captured every event, dropped at normalizer | **[REPORTED]** `background/normalizer.ts:155-161` |
| Observed toast / error / status events | passed into `buildExpectedOutcome`, ignored | **[VERIFIED]** `sopBuilder.ts:575-608` switches on `groupingReason` only |
| `getSafePageTitle()` PII fix | code-complete, unmerged | **[REPORTED]** branch `chore/extension-capture-wip` |
| `QUALITY_RUBRIC.md` (12 categories, scored, thresholds) | unimplemented | **[REPORTED]** no scoring code in `apps/` or `packages/` |
| SEO-F2 indexation gate | registered in backlog, never executed | **[VERIFIED]** `IMPROVEMENT_BACKLOG.md:5`; program scaled 15 → 164 pages |
| `visitorId` attribution (shipped this session) | join key correct, delivery unreliable | **[VERIFIED]** `analytics.ts:781,825` vs `SignupPageClient.tsx:52,71` |
| `IS_CHROME_STORE_PUBLISHED` | exported, never consumed | **[REPORTED]** `install.ts:51` |

This is not a capability or capacity problem. The engineering is repeatedly correct. **The highest-return work is wiring, deleting, and verifying what already exists — not building more.**

---

## 2. P0 — Pre-Chrome-Web-Store privacy blockers

The extension is pending store submission with a privacy policy stating *"No screenshots — structured events only"* and a Data Safety disclosure covering "form labels" and "DOM text". Three capture-time gaps conflict with that disclosure.

| ID | Finding | Status |
|---|---|---|
| **F-0** | `document.title` captured raw at 15 call sites in `capture.ts` → reaches `page_context.pageTitle` and the upload bundle. Realistic leak documented in the codebase's own type comment (`shared/types.ts:221`: `"Inbox (3) – phil@mediafier.ai"`). Fix (`getSafePageTitle()`) is **code-complete on `chore/extension-capture-wip`, unmerged.** | **[REPORTED]**, known |
| **F-1** | Literal URL pathname reaches `page_context.url` unscreened. `deriveRouteTemplate` only substitutes integers / UUIDs / hex IDs, so a name-shaped slug (`/patients/sarah-connor/notes`) survives **in both `url` and `routeTemplate`** — the field intended as the safe version is not safe against slugs. | **[VERIFIED]** `normalizer.ts:147,150`; `url-normalizer.ts:96-109` |
| **F-2** | `state-observer.ts::nodeLabel()` returns raw `node.textContent.slice(0,80)` with **zero PII screening** — the only text path in the extension without guards. Captures modal / toast / alert / error text, the class of text designed to echo user data back. Currently latent (normalizer doesn't read `state_change_details`) but sits unguarded in `chrome.storage.local`, and is exactly the field an "capture error messages" enhancement would wire up. | **[VERIFIED]** `state-observer.ts:156-162` |

**Also:** the privacy policy **overstates** collection — it claims click coordinates and navigation referrer are captured; neither is implemented. Over-disclosure is the safer direction but is a policy-vs-behaviour mismatch a reviewer could flag.

**Recommendation:** F-0/F-1/F-2 are fixed before store submission. All three are extension-surface changes and therefore gated by the Extension Reliability Invariant real-extension harness.

---

## 3. P0 — SOP correctness and truthfulness

| ID | Finding | Status |
|---|---|---|
| **S-1** | **The SOP quality gate has never run in production.** `ingestion.ts` calls `processSession()` and `renderSOP()` directly, bypassing `processSessionFull`. All 6 validation rules are unreachable. The parked SVR/specificity effort would change nothing in production even if merged cleanly. | **[VERIFIED]** |
| **S-2** | **Expected outcomes are fabricated while the evidence sits in the same function.** `buildExpectedOutcome` switches on `groupingReason` alone and emits assertions (*"Confirmation message appears and record is saved in {system}"*). Its `events` argument already contains `system.toast_shown` / `error_displayed` / `status_changed`. Directly contradicts the "evidence-linked, deterministic" product claim. **Fix requires no new capture, no schema change, no extension work.** | **[VERIFIED]** `sopBuilder.ts:575-608` |
| **S-3** | **Sensitive interactions vanish from the SOP rather than being redacted in it.** Normalizer early-returns `system.redaction_applied` with no `target_summary`; `contentEnricher.ts` has zero references to that event type → step dropped. An SOP for a login flow omits the login. Corollary: because the non-sensitive branch hardcodes `isSensitive: false`, the sensitive-handling branches at `sopBuilder.ts:267-269,114-119` are unreachable dead code. | **[VERIFIED]** `normalizer.ts:104-132`; grep count 0 |
| **S-4** | **What you share is not what you see.** Internal view uses `SOPPageShell`; the public share link uses `<SOPTab sop={sop} />` with no `templateArtifacts`, so `hasTemplates` is falsy and it renders legacy `RawSOPView` — no Quick Start, no observed-vs-inferred badges, no evidence snippets, no alignment pill. For a product whose output exists to be handed to someone else, the recipient gets the worse document. | **[VERIFIED]** `share/[token]/page.tsx:119`; `SOPTab.tsx:28-30`; `workflows/[id]/page.tsx:485` |
| **S-5** | **The SVR baseline of 0.00% is a tautology, not evidence.** The 10 workflow fixtures are hand-authored; **156 interaction events, zero with an empty or missing label**. A vagueness metric run against them can only ever return zero. Shipping this as a baseline would have made "0% vagueness" look like proof the problem was solved. | **[VERIFIED]** independent script across `fixtures/workflows/*.json` |

---

## 4. P0/P1 — Conversion funnel

| ID | Finding | Status |
|---|---|---|
| **C-1** | **Activation runs through a developer-mode sideload.** `config.ts:16` still contains a literal `placeholder` in `chromeStoreUrl`, so **every** install CTA site-wide renders the manual path: download zip → extract to permanent folder → `chrome://extensions` → enable Developer Mode → Load unpacked → pin → copy an API key from `/account` into the extension to sync. **18 discrete user actions** from Google result to first real SOP; 7 are raw browser-developer operations. Not a dead end — the zip exists — but it is the ceiling on organic-attributed signups regardless of content volume. | **[VERIFIED]** `config.ts:16`; `install.ts:44-48` |
| **C-2** | **No activation nudge reaches a real new user.** Signup seeds 5 sample workflows, so `EmptyDashboard` — which contains the `OnboardingChecklist` and the only dashboard extension-install prompt — never renders. The sample-seeding solved a cold-start problem and silently disabled the only component built to drive extension adoption. | **[VERIFIED]** |
| **C-3** | **`signup_completed` (the event carrying `visitorId`) is unreliably delivered.** Fired at `SignupPageClient.tsx:52`, then `router.push('/dashboard')` at `:71` — an SPA transition that does not fire `beforeunload`. Buffer flushes only at ≥10 events or on `beforeunload`. A second server-side `signup_completed` **is** reliably written but carries no `visitorId`. **The attribution shipped this session is code-complete and not operationally trustworthy.** | **[VERIFIED]** `analytics.ts:781,825` |
| **C-4** | **The lightest-weight commitment is orphaned.** `/demo` is a fully public, no-login, interactive product experience. Zero of the 164 SEO pages link to it. The only non-signup path on every page is an untracked plain `<Link>` to `/product`, itself two hops from the demo. | **[REPORTED]** `Blocks.tsx:96-98,294` |
| **C-5** | **Hub pages are conversion dead ends.** 10 of 11 hubs render via `HubIndex.tsx`, which contains a breadcrumb and a link grid — zero CTA of any kind. | **[REPORTED]** `HubIndex.tsx:1-76` |
| **C-6** | **The primary paid-tier CTA is unattributed for all organic visitors.** `UpgradeButton.tsx:35-41` returns a bare `<Link>` with no `onClick` when there is no session; the only `track()` call is wired to the authenticated branch. Every anonymous visitor clicking "Start 14-Day Trial" on `/pricing` is invisible. | **[REPORTED]** |
| **C-7** | **Mobile visitors hit an unexplained wall.** No device detection anywhere in the install path. A mobile visitor can complete signup, land on a populated dashboard, and only discover at the install step that the flow requires desktop Chrome — with no messaging acknowledging it. | **[REPORTED]** |
| **C-8** | **Intent mismatch on the newest pages.** The 8 `answer` pages hardcode `ctaLabel="Start free"` — a reader searching "what is cycle time" is asked to create an account before finishing the definition. | **[REPORTED]** `AnswerPageView.tsx:134-142` |
| **C-9** | Untracked `/signup` CTAs across all 4 blog posts, `/about`, `/docs`, `/comparisons`, and all 3 on `/demo`. `/support` and `/security` have **no signup CTA at all**. | **[REPORTED]** |

---

## 5. P1 — Governance and content strategy

| ID | Finding | Status |
|---|---|---|
| **G-1** | **The gate was identified, written down, assigned an ID, and scaled past.** SEO-F2 — *"indexation health gate before Tranche-1 scaling (≥80% indexed AND <30% zero-impression over 4–6 weeks)"* — was logged 2026-06-26 at ~15 pages. Never executed. Program is now at 164 pages, deep in the Tranche-1 band it gates. SEO-F1 (GSC verification + sitemap submission) likewise unconfirmed. | **[VERIFIED]** `IMPROVEMENT_BACKLOG.md:5` |
| **G-2** | **The gate was not evaluable on the observed cadence.** Roadmap dated 2026-07-14; three-plus publishing rounds landed within **5 calendar days** against a gate whose minimum window is 14 days (indexing) and 6 weeks (zero-impression). The rule constrains when the gate can be *read*, not when the next batch may *start*. That is the hole. | **[REPORTED]** |
| **G-3** | **No GSC baseline exists and there is no GSC API integration.** Indexed %, impressions, CTR, and the page-2 opportunity segment are all unknown. Batch 1's stated 8-week target is currently unfalsifiable. | **[VERIFIED]** |
| **G-4** | **CHANGELOG has no entry after 2026-06-26** (iteration 098) despite ~10 SEO commits, Batch 1, Batch 2, and a new page type. | **[VERIFIED]** |
| **G-5** | **Scope drift.** Batch 1 overran its named 20-page list by 30%. Batch 3 is entirely untouched — `aiOpportunity` remains at 8 pages against a 500 target despite being named the thinnest, highest-commercial-intent cluster. The `answer` type was built while the architecture-recommended `versus` type was not. | **[REPORTED]** |
| **G-6** | **Competitor pages are factually stale.** WalkMe pages never mention SAP ownership (acquisition completed 2024-09-12) — zero "SAP" matches in `alternatives.ts`. Zero "Stagwell" matches anywhere despite Process Street's April 2024 acquisition. | **[VERIFIED]** |
| **G-7** | **Policy risk on further scaling.** Google's March 2026 core update enforced against scaled content abuse; May 2026 extended spam policy to AI Overview citation eligibility. This makes the tranche gate a release blocker rather than a quality nicety, and argues against the roadmap's 750-page `sopTemplate` target without per-page differentiation discipline. | **[REPORTED]**, sourced with dates |
| **G-8** | **Category positioning conflict.** `competitors.ts` mixes documentation tooling (Scribe, Tango) with enterprise process-mining (Celonis, UiPath, Soroco, ABBYY) — different buyers, price points, search behaviour. Recommendation is to commit to the documentation category. **Open tension:** the AI Integration Platform Vision moves the product toward the execution layer Celonis/UiPath occupy, so this carries a future re-positioning cost. **CEO decision, not an agent call.** | **[REPORTED]** |

---

## 6. The privacy question, answered

**Asked:** how to capture more detail without violating the privacy-first recorder model.

**Answer:** most of the highest-leverage detail is **not new capture at all** — it is already-built, already-guarded code that was never wired up. Reconnecting it carries near-zero incremental privacy risk.

- `neighbor-context-extractor.ts` is a complete module with `safeText()` guards on every field. Nothing calls it.
- Rich target fields (`interactionType`, `ancestorPath`, `selectorFingerprint`) are captured on every event and dropped at the normalizer.
- Observed outcome events are already a function argument to `buildExpectedOutcome` (S-2).

**Genuine over-redaction costing detail for no privacy gain:** a `\d{5,}` match nulls the **entire** label, so "Order #10234" becomes empty rather than "Order #####". A ≥12-word rule rejects rather than truncating, despite an 80-char truncation already existing.

**The honest limit, to be disclosed rather than implied away:** pattern-based redaction handles emails, phones, SSNs, and card numbers. It **cannot** catch a customer's name in a breadcrumb, heading, error message, or URL slug — those are prose, not patterns. Closing that would require NER, which conflicts with the determinism invariant. Residual risk is bounded by process (review-before-upload, domain scoping), not by technical guarantee.

**One boundary that should not move:** screenshots. The privacy policy and store listing both state "No screenshots — structured events only." That is a public trust commitment, not a technical gap.

---

## 7. Corrections issued during this review

1. **Agent overstatement corrected.** The roadmap agent reported the SEO program is "invisible" to `IMPROVEMENT_BACKLOG.md`. False — SEO-F1 through SEO-F7 are registered. The corrected finding (G-1) is worse: the gate was registered *and* scaled past.
2. **Coordinator error, prior to this review.** The `answer` batch was reported as 30 pages. It is **8**. The 30 came from counting `relatedTerms` cross-link slugs. Corrected in git history before push; total is **164**, not 186.

---

## 8. Recommended sequence

Each step names a measurable outcome. Per `CLAUDE.md`, work without one is incomplete.

| # | Step | Rationale | Owner | Measurable outcome |
|---|---|---|---|---|
| 1 | **Fix F-0/F-1/F-2** and run the real-extension harness | Pre-submission privacy blockers on a shipping-gated surface | `extension-privacy-auditor` + `backend-engineer` | Zero unscreened text paths; harness green; Data Safety disclosure matches behaviour |
| 2 | **Wire the SOP quality gate into ingestion** | Every quality rule and all in-flight SVR work is currently unreachable (S-1) | `backend-engineer` | `validateRenderedSOP` runs on 100% of ingested sessions; rejection rate reported |
| 3 | **Evidence-backed `expectedOutcome`** | Closes the truthfulness gap against the core product claim; zero new capture (S-2) | `backend-engineer` | 0 template-asserted outcomes where evidence exists; determinism fixture repeat-run identical |
| 4 | **Freeze net-new page authoring; pull the GSC baseline** | 164 pages, zero conversion evidence, gate never evaluated (G-1/G-3) | `growth-strategist` + `analytics` | Coverage scorecard populated per category; page-2 segment baseline established |
| 5 | **Fix `signup_completed` delivery** | The attribution shipped this session is not trustworthy (C-3) | `analytics` | `visitorId` present on ≥95% of persisted `signup_completed` rows |
| 6 | **Reconnect what exists:** `/demo` from SEO pages, hub CTAs, `AskThisProcessPanel`, share-link renderer, `OnboardingChecklist` keyed off `hasExtensionKey` | Highest value-per-unit-risk; no new features (C-2/C-4/C-5, S-4) | `frontend-engineer` | Every public page has ≥1 tracked conversion path; share view == internal view |
| 7 | **Amend the tranche gate** with a minimum calendar-spacing clause; log the compression as a governance learning | The rule cannot function at observed cadence (G-2) | `product-manager` | Amended rule in `roadmap.md`; zero same-week multi-batch shipping at next meta-review |
| 8 | **Chrome Web Store submission** | Upstream of the entire activation path; approval windows run in parallel with everything else | `chrome-web-store-expert` | Listing live; `chromeStoreUrl` flipped; sideload copy gated on `IS_CHROME_STORE_PUBLISHED` |

**Explicitly not recommended now:** writing more landing pages, adding new SOP features, or building richer capture beyond reconnecting already-guarded fields.

---

## 9. Open CEO decisions

1. **Category positioning** — documentation tooling vs. process intelligence, given the AI-vision trajectory (G-8).
2. **Tranche-gate disposition** — enforce, amend per §8 step 7, or override with a stated reason.
3. **Content freeze** — accept the pause in §8 step 4, or proceed and accept unmeasured scaling under G-7 policy risk.
4. **Screenshots** — the review recommends this boundary does not move. Confirm or revisit as a separately-consented feature.
5. **Segment cut list** — `ma-integration-leads`, `bpo-operations` cut; `government`, `education` demoted. Based on buying-behaviour mismatch, not measured demand.
6. **Residual privacy disclosure** — accept and disclose the prose-PII limit (§6), or invest in a heavier control.

---

## 10. Parked branches

- `chore/extension-capture-wip` — contains the F-0 fix. **Do not merge without the real-extension harness** per the Extension Reliability Invariant.
- `chore/process-engine-specificity-wip` — specificity module is sound; **the render-layer diffs are not.** Contains a verified quote-selection bug where both ternary branches return the same character, with a test that asserts the buggy output rather than catching it. `PROCESS_ENGINE_VERSION` not bumped despite instruction-text semantics changing. **Do not merge as-is.**

Neither branch is on `main`. Both are pushed and preserved.
