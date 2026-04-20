# PRD: Pro Tier — $99/month

**Status:** Approved — 2026-04-20 (coordinator-delegated per CEO directive "move forward with your suggestions")
**Owner:** product-manager
**Approved by:** coordinator (CEO delegation)
**Created:** 2026-04-20
**Approved:** 2026-04-20
**Mode 3 origin:** PRICING_AUDIT_001.md decision point 3
**Phase:** Define → ready for Design (UX + system-architect handoff)
**Open questions:** 0 (all 5 resolved — see §12 Decisions Locked)

---

## 1. Problem Statement

The current paid ladder runs: Starter ($49) → Team ($249) → Growth ($799). The jump from Starter to Team is 5.1×. The audit finding F-COH-04 (P2, `PRICING_AUDIT_001.md §Part 1`) names the consequence directly: "solo power-users who need bottleneckAnalysis + automationScoring but have no team either downgrade to Starter within 30 days or skip Ledgerium entirely." These are users who have outgrown Starter's 15-recording cap and feature set, but have no legitimate use for Team's multi-seat, shared-library, or team-workspace capabilities. They are forced to either over-buy (pay $249 for features they do not need) or churn.

The job to be done: a solo practitioner — ops lead, consultant, process analyst — who captures workflows regularly, needs the intelligence layer to surface insights, and works alone. They will pay for genuine analytical value. They will not pay a team-tier premium for collaboration infrastructure they have no use for.

The gap is structural: Ledgerium's strongest differentiator (intelligence layer — bottleneck analysis, automation scoring, variant detection) is today gated entirely behind a $249/month paywall that bundles it with team infrastructure. The Pro tier decouples the intelligence differentiator from the collaboration stack and makes it accessible to the solo buyer.

Evidence: `PRICING_AUDIT_001.md §Part 1 F-COH-04`, `apps/web-app/src/lib/plans.ts` (intelligence layer features locked at `team` and above), `apps/web-app/src/lib/config.ts` (Starter = 15 recordings, 1 recorder, no intelligence layer; Team = unlimited + 3 recorders + 5 viewer seats).

---

## 2. Goals / Non-Goals

### Goals

- Create a defensible, clearly differentiated tier for the solo power-user ICP at $99/month.
- Unlock the intelligence layer (bottleneckAnalysis, automationScoring, variantDetection) for solo buyers without bundling team infrastructure.
- Raise the ceiling on Starter → paid conversion by narrowing the commitment jump from 5.1× to 2.0× ($49 → $99).
- Provide a clear upgrade narrative: Starter users who hit the 15-recording cap or want analytical depth have a natural next step.
- Produce a settled Pro tier strategy so that the "Growth → Automate" rename decision (F-COH-03, deferred at audit decision point 5) can be resolved. See §11.

### Non-Goals

- Pro is NOT a team-collaboration product. It does not unlock `teamWorkspace`, `sharedLibrary`, or multi-seat access.
- This PRD does NOT cover the 14-day Team trial (G-01, separate parallel PRD).
- This PRD does NOT include implementation steps, file-level instructions, or code.
- This PRD does NOT decide A/B test design, launch sequence, or email campaign content.
- This PRD does NOT expand scope to backlog items F-COH-05, F-COH-06, F-COH-07, or G-11. Those remain in the audit cold pool.

---

## 3. Target User (ICP)

**Primary persona — Solo Process Analyst / Power Individual**

- Job title: Operations lead, process consultant, workflow analyst, business analyst, solo founder running ops.
- Works alone or in a small org where "team" tooling is irrelevant but process rigor is high.
- Records workflows regularly (>15/month — immediately hits Starter cap).
- Needs to identify bottlenecks and automation candidates — this is the output they present to stakeholders or clients.
- Has individual budget authority up to ~$100–150/month without procurement. Above that, requires a business case.
- Pain today: Starter is too shallow, Team is too expensive for a solo budget, and the intelligence layer is invisible to them (audit finding G-03: no preview or teaser in free/starter tiers).

**Secondary persona — Team Lead evaluating Ledgerium solo before team commit**

- Wants to validate the intelligence layer against real workflows before requesting a Team seat purchase.
- Pro gives them a 2.0× commitment step to de-risk personal evaluation.
- Likely to convert to Team within 2–3 months if the intelligence layer delivers value.

**Buying context:** individual credit card, SaaS self-serve. No procurement cycle. Decision is personal. Price sensitivity inflects sharply above $99 for solo buyers (assumption — see §12 Open Questions, item 1).

Evidence for ICP signal: `PRICING_AUDIT_001.md §Part 1 F-COH-04` (solo user persona named explicitly), `PRICING_AUDIT_001.md §Part 4 G-01` (intelligence layer invisible to buyers before $249 commitment), `apps/web-app/src/lib/config.ts` (Starter cap = 15 recordings/month makes solo power-users hit the ceiling quickly).

---

## 4. Positioning Delta

| Comparison | One-line positioning |
|---|---|
| Pro vs Starter | Pro gives you the intelligence layer — bottleneck analysis, automation scoring, variant detection — and removes the recording cap. Starter gives you clean exports and basic health scores only. |
| Pro vs Team | Team gives you a shared workspace, multiple recorders, and viewer seats for collaboration. Pro is for solo work only — same intelligence depth, no team infrastructure. |

Pro is the intelligence tier for one person. Team is the collaboration tier for a group.

This positioning resolves the current Starter value problem (audit F-COH-02: "Starter = clean exports" reads as a ransom, not a tier). Pro makes Starter's value story coherent: Starter is the individual document-and-export tier; Pro is the individual analyze-and-act tier; Team is the collaborate-and-scale tier.

---

## 5. Feature Allocation

Source of truth for current feature state: `apps/web-app/src/lib/plans.ts`.

| Feature | Free | Starter | **Pro (proposed)** | Team | Growth | Enterprise |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| cleanExports | — | yes | yes | yes | yes | yes |
| healthScores | — | yes* | yes | yes | yes | yes |
| personalWorkspace | — | yes | yes | yes | yes | yes |
| intelligenceLayer | — | — | **yes** | yes | yes | yes |
| bottleneckAnalysis | — | — | **yes** | yes | yes | yes |
| automationScoring | — | — | **yes** | yes | yes | yes |
| variantDetection | — | — | **yes** | yes | yes | yes |
| sharedLibrary | — | — | — | yes | yes | yes |
| teamWorkspace | — | — | — | yes | yes | yes |
| advancedAnalytics | — | — | — | — | yes | yes |
| crossWorkflowComparison | — | — | — | — | yes | yes |
| agentComposition | — | — | — | — | yes | yes |
| integrationRisk | — | — | — | — | yes | yes |
| priorityExports | — | — | — | — | yes | yes |
| sso | — | — | — | — | — | yes |
| rbac | — | — | — | — | — | yes |
| auditTrail | — | — | — | — | — | yes |
| complianceExports | — | — | — | — | — | yes |
| customRetention | — | — | — | — | — | yes |

*`healthScores` on Starter is a copy-contradiction per audit F-COH-01. That contradiction must be resolved (in a separate iteration) before Pro ships. Resolution options: relabel Starter feature as "basic process health indicators" or move to Pro-only. This PRD assumes it remains on Starter with a relabeled description.

**Cannibalization risk check:** No features move DOWN from Team to Pro. The intelligence layer features (bottleneckAnalysis, automationScoring, variantDetection) are additive to Pro — they are not removed from Team. No cannibalization of Team revenue.

**Starter devaluation risk check:** No features move UP from Starter to Pro. Starter retains cleanExports, healthScores (relabeled), personalWorkspace, and its existing recording quota. Pro adds the intelligence layer on top of that feature set. Starter is not devalued; it is repositioned as a narrower document-and-export tier.

**No-move confirmation:** sharedLibrary and teamWorkspace do NOT move to Pro. This is the hard boundary that separates Pro from Team.

---

## 6. Quota / Limits

| Dimension | Free | Starter | Pro (proposed) | Team |
|---|---|---|---|---|
| Recordings/month | 5 | 15 | **Unlimited** | Unlimited |
| Recorder seats | 1 | 1 | **1** | 3 |
| Viewer seats | 0 | 0 | **0** | 5 |
| Total seats | 1 | 1 | **1** | 8 (3+5) |
| Shared library | No | No | **No** | Yes |
| Team workspace | No | No | **No** | Yes |
| Storage (per account) | 1 GB | 5 GB | **25 GB** | 100 GB |
| API rate limit | 60 req/min | 120 req/min | **240 req/min** | 480 req/min |

Rationale for unlimited recordings at Pro: The Starter cap (15/month) is the primary friction point for the solo power-user persona. Removing it is the core value unlock at $99. A secondary recording cap on Pro would undermine the tier's positioning and create support overhead. Evidence: `apps/web-app/src/lib/plans.ts` (Team is already unlimited; Pro adopts the same limit to match intelligence-layer positioning).

Storage and API limits are proportional assumptions. TBD — needs analytics validation (see §12, item 2).

---

## 7. Pricing Rationale

**Why $99?**

The $49 → $99 step is a 2.0× increase. The $99 → $249 step is a 2.5× increase. This creates a near-geometric ladder ($49 → $99 → $249 → $799) that is easier to justify and narrate than the current 5.1× cliff between Starter and Team.

**Anchor strategy:** $99/month is a well-established SaaS "prosumer" anchor price point. It signals professional-grade tooling without triggering procurement processes at most SMBs. The intelligence layer (bottleneck analysis, automation scoring) has measurable ROI value — a single automation opportunity identified per month justifies the price for most ops practitioners. Evidence cited: `PRICING_AUDIT_001.md §Part 1 F-COH-04` (solo power-user persona + price gap framing).

**Competitive context:** Scribe sits at $23/user (source: `PRICING_AUDIT_001.md §Part 4`). Pro at $99 is 4.3× Scribe, justified only if the intelligence layer is experienced before payment. This reinforces the dependency on audit G-01 (14-day Team trial, separate PRD) as a complementary conversion mechanism. Without an intelligence-layer trial, the $99 ask is a blind purchase.

**ARPU impact:** Current effective ARPU across the self-serve tiers is unknown. Assumption: if 30% of new Starter signups convert to Pro instead of Team, and 10% of existing Starter users upgrade within 60 days of launch, ARPU lift is positive. Exact ARPU baseline and target: TBD — needs analytics (see §8 and §12).

---

## 8. Success Metrics

All metrics require a pre-launch baseline measurement. Baseline period: 30 days before Pro launch date.

| Metric | Baseline (before) | Target (90 days post-launch) | Leading indicator | Measurement method |
|---|---|---|---|---|
| Starter → Pro conversion rate | 0% (tier does not exist) | 8–15% of new Starter signups convert to Pro within 30 days | Weekly Starter cohort upgrade rate | Stripe subscription events + analytics |
| New-signup tier distribution: Starter % | TBD — needs analytics | Starter share decreases by ≥10 percentage points vs baseline (absorbed by Pro) | Daily signup-by-plan breakdown | Analytics events on `/signup?plan=` |
| New-signup tier distribution: Team % | TBD — needs analytics | Team share holds flat or decreases ≤5 percentage points (no cannibalization) | Daily signup-by-plan breakdown | Analytics events |
| ARPU (self-serve tiers) | TBD — needs analytics | Increases by ≥15% vs baseline | Monthly Stripe MRR report | Stripe revenue data |
| Downgrade rate Team → Pro | TBD — needs analytics | ≤3% of active Team subscribers downgrade to Pro within 90 days | Weekly Stripe subscription change events | Stripe webhook data |
| Existing Starter → Pro upgrade rate (60-day window post-launch) | N/A | ≥5% of existing Starter subscribers upgrade | Cohort upgrade funnel | Stripe + DB |
| Pro churn rate (Month 2 onward) | No baseline | ≤8%/month (comparable to Team churn) | Month-2 retention cohort | Stripe subscription data |

If Team → Pro downgrade exceeds 5% at 30 days, this is a cannibalization signal requiring immediate review. The Pro feature allocation (no sharedLibrary, no teamWorkspace) is designed to prevent this; if it occurs, the root cause is likely pricing sensitivity, not feature overlap.

---

## 9. Risks and Mitigations

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Team cannibalization: existing Team users downgrade to Pro | High | Low | Hard enforcement: Pro excludes teamWorkspace and sharedLibrary. Monitor Team → Pro downgrade rate weekly for 90 days (§8 metric). If >3%, investigate whether team features are actually valued. |
| Starter devaluation: Starter feels pointless once Pro exists | Medium | Medium | Reframe Starter as the document-and-export tier (resolves F-COH-02 simultaneously). Starter retains 15 recordings/month + clean exports. Users who hit the cap are the Pro target — this is intentional. |
| Pricing page confusion: four self-serve tiers is cognitively expensive | Medium | Medium | Pro must have a one-line differentiator visible without table expansion. Positioning: "Intelligence layer for individuals." The UX owner must solve the four-tier comparison table layout — this is a dependency, not a PRD decision. |
| Migration friction for existing users | Low | Low | No existing users are on Pro (new tier). No existing plans change. No forced migration. Existing Starter and Team users are unaffected unless they choose to upgrade. |
| Pro underperforms: insufficient conversion from Starter | Low | Medium | If Starter → Pro conversion is <5% at 60 days, trigger a pricing review. Root cause hypothesis: intelligence layer is invisible to Starter users before they consider upgrading (compounds G-03 in the audit). Mitigation is contingent on intel-layer preview work (audit F-COH-07, cold pool). |
| Technical debt: webhook fallback BUG-01 under-provisions Pro users | High | High if not resolved | BUG-01 must be resolved (Mode 3, already approved) before Pro ships. A new price ID mapped to `'pro'` slug in a system with a silent fallback is a revenue-integrity risk. This is a hard dependency. |

---

## 10. Dependencies

These are work items that must exist before Pro can ship. They are listed as artifact or system requirements, not implementation instructions.

1. **Stripe Price object:** A new Stripe Price ID must be created for Pro Monthly ($99) and Pro Annual. This price ID must be mapped in the billing system. The env var name convention to use is `STRIPE_PRO_PRICE_ID` (consistent with `STRIPE_STARTER_PRICE_ID` and `STRIPE_TEAM_PRICE_ID` naming in `apps/web-app/src/lib/config.ts`).

2. **Plan type addition:** The `PlanType` union in `apps/web-app/src/lib/plans.ts` does not currently include `'pro'`. A `pro` entry must be added to `PLAN_FEATURES`, `PLAN_HIERARCHY`, and `toPlanType`. Note: `toPlanType` already maps legacy `'pro'` strings to `'starter'` — this mapping must be updated to map to the new `'pro'` plan type rather than coercing to `'starter'`.

3. **Feature gating:** All 19 feature keys must have correct boolean assignments for the `pro` tier per the feature allocation table in §5. The intelligence layer features (intelligenceLayer, bottleneckAnalysis, automationScoring, variantDetection) must be enabled. Team-only features (teamWorkspace, sharedLibrary) must remain disabled.

4. **Pricing page UX:** The pricing page must display Pro as a card positioned between Starter and Team. The data contract requirement: Pro card must expose `id: 'pro'`, `price: 99`, `annualPrice` (TBD — see §12 item 3), `seats: '1 recorder'`, a positioning line that communicates "intelligence layer, solo" (not to be confused with Team), and the standard `features` and `limits` arrays. UX owns layout and design; the data contract is a product requirement.

5. **BUG-01 resolution (hard gate):** The silent `'starter'` fallback in `planFromPriceId` must be removed before Pro ships. An unresolved BUG-01 would silently under-provision Pro subscribers to Starter. Evidence: `PRICING_AUDIT_001.md §Part 2 BUG-01`. This bug fix was already approved (Mode 3 action, audit decision point 1).

6. **Analytics events:** The following events must fire for Pro tier measurement (§8): `plan_upgraded` with `{from: 'starter', to: 'pro'}`, `plan_downgraded` with `{from: 'team', to: 'pro'}`, `signup_completed` with `{plan: 'pro'}`. These are instrumentation requirements, not implementation instructions.

7. **Copy coherence resolution (F-COH-01, F-COH-02):** The healthScores copy contradiction and the "clean exports" Starter framing must be resolved before or alongside Pro launch. If Starter's copy is not fixed, the Starter → Pro upgrade narrative is incoherent. Evidence: `PRICING_AUDIT_001.md §Part 1 F-COH-01, F-COH-02`.

8. **Billing test coverage:** Per the QA audit (§Part 3), there are zero automated tests on the checkout/webhook lifecycle. The minimum test set specified in the audit must cover the Pro tier's price ID and plan activation path before Pro ships. This is a quality gate, not a post-launch item.

---

## 11. Impact on "Growth → Automate" Rename Decision

Audit finding F-COH-03 (`PRICING_AUDIT_001.md §Part 1`) identifies that the "Growth" tier name does not communicate its AI/automation differentiator. The rename to "Automate" was deferred at audit decision point 5 pending the outcome of this PRD.

**Recommendation with Pro tier settled:** rename Growth to "Automate."

The four-tier logic with Pro in place is: Starter (document) → Pro (analyze, solo) → Team (collaborate) → Automate (automate at scale). This is a coherent capability ladder. "Growth" as a name implies seat scale, which is Team's job. "Automate" makes the Growth tier's actual differentiators (agentComposition, integrationRisk, advancedAnalytics) legible to buyers scanning the pricing page.

The rename does not require slug changes. `toPlanType` in `plans.ts` already handles legacy string coercion. The display label change is a low-effort copy operation (audit F-COH-03 rates effort M, but the effort is primarily coordination, not code).

**Condition:** this rename should ship in the same release as Pro, or immediately after. Shipping Pro without renaming Growth leaves the top of the self-serve ladder incoherent — users reaching the Team → Growth step will still see "Growth" next to "Automate" features. A phased rename (Pro ships first, rename ships one iteration later) is acceptable if coordination risk requires it.

---

## 12. Decisions Locked

The 5 open questions have been resolved by coordinator delegation per CEO directive ("move forward with your suggestions or assumptions on pro tier and team trial"). All decisions are reversible and scoped to the reversibility that shipping data will enable.

### D1 — Launch at $99 fixed. No pre-launch price validation.

**Decision:** Ship Pro at $99/month as a fixed price.

**Rationale:** Price is a reversible variable; running a pricing-page A/B test or user interviews adds 2–4 weeks of delay for uncertain signal (low-traffic pricing pages produce low-statistical-power tests, and 5–8 Starter interviews produce anecdote, not conversion data). Shipping with full telemetry (see §8 metrics) produces higher-power data faster.

**Commitment:** Pricing retrospective at 90 days post-launch using the §8 metric pack. If Starter→Pro conversion underperforms target (<5%), run a formal price-discovery iteration with downward-price test ($79) or value-clarity test (copy/feature emphasis). If ARPU lift exceeds target by >50%, evaluate upward test ($119).

**Supersedes:** former Open Question #1.

### D2 — Ship proposed quota defaults. Instrument in parallel.

**Decision:** Ship the §6 quota proposals as-is — 25 GB storage, 240 req/min API rate limit, unlimited recordings, 1 recorder seat, 0 viewer seats.

**Rationale:** Instrumenting current usage first would add weeks of delay and still produce only Starter/Team distributions (Pro distribution is inherently post-hoc). The proposed numbers are defensibly proportional to adjacent tiers (Starter: 5 GB / 120 req/min ; Pro: 25 GB / 240 req/min ; Team: 100 GB / 480 req/min).

**Commitment:** Storage utilization and API-rate-burst distributions are instrumented as part of §10 Dependency #6 (analytics events — extended here to include `storage_usage_snapshot` daily aggregate and `api_rate_burst_exceeded` server-side event). Retrospective at 90 days; tighten or loosen quota numbers based on observed p95.

**Supersedes:** former Open Question #2.

### D3 — Annual Pro price: $82/month ($984/year).

**Decision:** Annual Pro price is **$82/month** billed annually ($984 upfront), representing a 17% discount vs $99 monthly. Matches the discount curve of Starter and Team.

**Rationale:** Consistency across the ladder. Buyers comparing annual savings across tiers will see the same 17% pattern, reducing pricing-page confusion. Stripe Price object must be created for both `pro_monthly` ($99) and `pro_annual` ($984) with the existing naming pattern in `config.ts`.

**Dependency addition:** §10 Dependency #1 now explicitly requires two Stripe Price IDs: `STRIPE_PRO_PRICE_ID` (monthly) and `STRIPE_PRO_ANNUAL_PRICE_ID` (annual). Both must be mapped in `planFromPriceId` (which, post-BUG-01, correctly throws on unmapped IDs — so forgetting either price ID fails noisy).

**Supersedes:** former Open Question #3.

### D4 — Launch comms: single low-pressure announcement to existing Starter users. No discount.

**Decision:** Send a single plain announcement email to existing Starter subscribers on launch day. Position Pro as a new option now available. No time-limited discount, no upgrade incentive, no urgency framing.

**Rationale:** Ledgerium's voice is evidence-linked and low-pressure. A discount signals "Pro is worth less than $99," which contradicts the pricing rationale. An urgency frame signals scarcity where none exists. Low-pressure communication preserves brand coherence and produces cleaner conversion signal (no discount-induced pull-forward that noise-corrupts the conversion metric).

**Dependency addition:** §10 Dependency #6 extended to include one transactional email ("Pro is available — here's how it compares") owned by the growth-strategist post-approval. Email must fire once per existing Starter subscriber on launch day; idempotency-guarded to avoid double-sends if the launch is rolled back and re-executed.

**Supersedes:** former Open Question #4.

### D5 — Trial × Pro interaction: Team trial is Free-only. Pro users cannot start a Team trial.

**Decision:** The 14-day Team trial feature (separate PRD `PRD_TEAM_TRIAL.md`) is restricted to users on the Free plan. Users on **any** paid plan — including Pro, Starter, Team, Growth, Enterprise — are ineligible to start a Team trial.

**Rationale:**

- **State-machine simplicity:** the trial end-state collapses to one path: Free → Trial → {Converted-to-Team | Expired-to-Free}. No Pro → Trial → Pro state, no Starter → Trial → Starter state. One state machine, fully deterministic (Ledgerium principle).
- **Churn protection:** if Pro users could trial Team, a Pro → trial → downgrade-to-Starter path would exist (trial ends, Pro user recognizes Team is overkill, downgrades). This path represents negative ARPU. Blocking Pro trials eliminates the class entirely.
- **Upgrade honesty:** Pro users who believe they need Team should upgrade via the standard path — they've demonstrated willingness to pay. A trial is an activation mechanism for Free → paid, not a re-evaluation mechanism for paid → paid.

**Dependency addition:** the Team Trial PRD §3 eligibility rule is updated (in that PRD, in this same approval pass) to state "Any user on the Free plan" → already stated, but the wording "Starter users have already converted" is extended to include all paid tiers (Pro, Team, Growth, Enterprise).

**Supersedes:** former Open Question #5 and Team-Trial-PRD §3 eligibility ambiguity.

---

**All 5 decisions take effect as of approval date (2026-04-20).** Pro tier is unblocked for Design phase entry. Implementation dependencies (§10) remain; none of them are changed by these decisions.
