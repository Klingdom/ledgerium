# MR-056 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 128-130, 2026-10-02. Commits `f859273` (loop 128, #306), `c0799c8` (loop 129, #310),
`be42c53` (loop 130, #313). Rows filed in the window: #312 (L128), #313 (L129), #314 (L130). Rows closed:
#306, #310, #313.
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md` or any audit.
Everything below that needs a row, a strike, a fix or a correction is a recommendation.

**Where the checks ran.** Main checkout at `be42c53`. Working-tree changes are `.claude/*` and an
untracked `data/`, which no check reads; `git status` was identical before and after every run below.
Local Node v24.20.0, Windows. CI pins Node 20 and takes pnpm from `packageManager` (`package.json:4`,
`pnpm@10.32.1`); the Dockerfile pins the same (`Dockerfile:16`, `:50`). Local `origin/main` ref is
`e1a9af5`; local `main` is **45 commits ahead** (46 once this review is recorded) — not "~52" as the
brief says. Nothing from MR-050 onward has run in CI.

**Validation run for this review — all executed at `be42c53`, none inferred. Verdict = exit code +
ANSI-stripped summary line.**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `apps/web-app`: `pnpm exec vitest run`, **×3** | 4123 (loop 130) | **3 of 3: 224 files, 4123 passed, exit 0** (17.1-17.5 s) | matches |
| root `pnpm test`, **×2** | 5901 | **2 of 2: 282 files, 5901 passed, exit 0** (19.4-19.5 s) | matches |
| `pnpm -r typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | clean | **exit 0**: 307 rows, 191 struck, 19/19 budget, **open 116** | reconciles (below) |
| Validator on each commit's own backlog + log + script (`git show <c>:…`) | — | `83d233b` 116 · `f859273` 116 · `c0799c8` 116 · `be42c53` 116, **all exit 0** | 114 (MR-055 entry) + #310, #311 at MR-055 recording = 116; each loop +1 −1 (#312/#306, #313/#310, #314/#313). No corruption |
| CI filters as written, **pnpm 9.15.9 and 10.32.1** (`npx -y pnpm@<v>`, version printed): `--filter @ledgerium/web-app --fail-if-no-match exec …`, `--filter extension-app --fail-if-no-match exec …` | "real filters 0, misspelt 1, both majors" | **both majors: real web-app 0, real extension-app 0 (unscoped name resolves to `@ledgerium/extension-app`), misspelt + flag 1, misspelt without flag 0** | holds |
| Same filter, **real package, missing script** (`--filter extension-app --fail-if-no-match test:e2e:nope`) | not tested by loop 128 | **pnpm 9.15.9: exit 0** ("None of the selected packages has a … script"); **pnpm 10.32.1: exit 1** (`ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`) | see §3 |
| `pnpm -r <missing script>` | — | 9.15.9 exit 0; 10.32.1 exit 1 — but only when **no** package has it | see §3 |

The CI web-app gate itself (`vitest run --no-passWithNoTests` via the filter) was run under 10.32.1 only
through the counts above (local `pnpm` is 10.32.1); under 9.15.9 I ran the filter resolution, not the full
suite. `prisma generate`, `build`, `test:e2e` and `test:e2e:real` were **not** run under either major —
only their filters were resolved.

**Not run:** Linux, Node 20, a GitHub runner, `next build`, Docker, Playwright, any browser rendering of
the changed pages, any HTTP request. No `curl`/`wget`.

---

## 1. Lead

**The window holds. Nothing reverts.** Every count reproduces, the filter fix behaves as claimed on both
majors, and every claim loops 129-130 corrected is now true against the code. The "brief practice" (truth
table first) produced real yield: loop 129's table found eight false claims where the row named three, and
loop 130's trace answered a question (does any model run?) that nobody had asked in 130 loops.

What the window got wrong has one shape, one level deeper than MR-055's: **the truth tables checked that a
feature exists, not what it does.** A route was found, so the claim was ticked.

1. **"Per-workflow export and deletion"** sits under *GDPR Considerations* (`security/page.tsx:107-113`).
   Deletion is a soft delete — `status: 'deleted'` (`api/workflows/[id]/route.ts:291-295`) — and nothing
   anywhere ever purges it (`grep` for `workflow.delete`/`deleteMany`: none). Share links do stop
   (`api/share/[token]/route.ts:21`). Under a GDPR heading, "deletion" that retains the data is the
   sharpest claim on the page.
2. **"Role-based team access (owner, admin, member, viewer)"** is now the wording on pricing, docs and
   security. Only *owner/admin vs the rest* is enforced (`teams/[id]/invite/route.ts:89`,
   `members/route.ts:150`, `lib/team-roles.ts`). No route outside role administration reads `role`;
   **`viewer` can do exactly what `member` can.** Likewise "5 users (3 recorders)" (`docs/page.tsx`
   plan table): `maxRecorders` is serialised to the client (`feature-gating.ts:263`) and enforced nowhere.
3. **"Clean exports — PDF, Markdown, JSON"** is a paid row (`pricing/page.tsx:86`, `config.ts:90`,
   `:130`) and Free is sold as "Watermarked exports" (`config.ts:65`). PDF is `window.print()` on two
   surfaces (`SOPPageShell.tsx:248-261`, `workflows/[id]/page.tsx:399-405`) with no plan check and no
   watermark — Free users get clean PDFs. Only Markdown is watermarked (`export-markdown/route.ts:72-74`).

And the "next to it" check (MR-055 §7) was applied to the three pages edited, not to `app/(public)`:

4. **`product/page.tsx:280`: "health scores, and AI-powered analysis — deterministically."** Plainly false
   after loop 130's own trace, in the tree loop 130's test walks (`PUBLIC_FILES`), and not in #314's list.
   The test's regex only targets *SOP* claims (`pricing-copy.test.ts`, `CLAIMS_AI_WROTE_IT`).
5. **The security page that loop 130 aligned on "Roadmap" still has a card titled "Audit Trail"**
   (`security/page.tsx:117`) — while pricing, docs and the same page's own enterprise list call the audit
   trail roadmap. The card's bullets are about determinism; the title is the claim.
6. **Docs, six lines below the rewritten "six plan tiers"**: the pricing screenshot's alt text still says
   "five tiers: Free, Starter, Team, Growth, and Enterprise" (`docs/page.tsx:1804`, `:1810`), and the
   screenshot it describes predates loop 129's Solo column.

None of these is new in the window; all six are siblings of claims the window fixed.

---

## 2. Q2 — Loops 129-130 (copy truth)

### 2.1 Six claims spot-checked against code

| Claim (surface) | Code | Verdict |
|---|---|---|
| Team/Growth not buyable; checkout refuses | `BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD = {team, growth}` (`checkout/route.ts:67`), 402 at `:309-320` | **true** |
| SSO / audit trail / compliance exports / custom retention are flags only | No `hasFeature`/`checkFeatureAccess`/`requireFeature` call or string key for `sso`, `rbac`, `auditTrail`, `complianceExports`, `customRetention` outside `plans.ts`; flags are serialised in `buildFeatureFlagsForPlan` but no client reads them | **true** — "Roadmap" is right |
| Role-based access is enforced (loop 129's reversal) | owner/admin gate on invite/member management; elevation rule in `team-roles.ts` | **half true** — 2 tiers enforced, 4 named (§1.2) |
| Per-workflow export and deletion (security) | export-json/markdown/bpmn routes exist; DELETE is soft, never purged | **export true; deletion overclaims** (§1.1) |
| BPMN export on Growth (docs) | `export-bpmn/route.ts:32` gated on `priorityExports` | **true** |
| llms.txt plan line (Free 5, Starter $49, Solo $89, Team/Growth waitlist) | `config.ts:51,75,114`; `plans.ts:77,85` | **true** — but hard-coded, contradicting `config.ts:105-109` "nothing else in the codebase hardcodes this figure" |

### 2.2 Is "no LLM anywhere" right?

**Yes, as far as code can show it.**

- No workspace `package.json` (root, 2 apps, 9 packages) names any of anthropic / openai / generative /
  cohere / mistral / langchain / ai-sdk / `"ai"`; none is installed at the top of `node_modules`.
- No source outside tests mentions `api.anthropic`, `api.openai`, `chat/completions`, `v1/messages`,
  `x-api-key`, bedrock, ollama. The only literal outbound `fetch` host in `apps/` + `packages/` is
  `api.resend.com` (`lib/email.ts:169`).
- The "Ask this process" route is the obvious suspect and declares itself no-LLM (`workflows/[id]/ask/route.ts:20,62`:
  `llm: false`); `intent-inference` is rules (verb/object classifiers).
- Extension: no SDK in its manifest; its "claude" hits are references to `CLAUDE.md`.

Not checked: a model call through a non-literal URL built at runtime from config. None of the env vars
in #278's list names a model provider, so I see no such path.

### 2.3 The LLM-SDK tripwire

**Well-intended, narrowly scoped, and it cannot break CI for an unrelated dependency** — it reads four
`package.json` files as text, so transitive dependencies never reach it. Its weaknesses:

1. **Too narrow on the positive side.** It covers web-app, process-engine, agent-intelligence,
   intelligence-engine. It misses the root manifest, `extension-app`, `intent-inference` and the other
   packages; and it cannot see a raw `fetch` to a model host — the most likely shape of a first,
   experimental integration. The claim it protects ("No AI rewriting") is about the product, not four
   manifests.
2. **Too broad on the negative side.** It is a substring regex over the *whole file*: a description or
   keyword containing "coherent" (`cohere`), "openai-compatible", or a dependency named for something
   else that contains `mistral` would fire. `coherent` already appears three times in this repo's source
   comments (`DashboardV2Shell.tsx:619,903,914`). Parse the JSON and test dependency *keys*.
3. **It fails without telling you why.** The assertion message is the package path. The log says the
   test "forces the 'No AI rewriting' claim to be revisited"; the failure output names neither the claim
   nor the pages. Put the pages and the claim in the message.

Recommended shape: parse every workspace manifest's `dependencies`/`devDependencies` keys against an
exact list; add a source scan for known model hosts; on failure, print "pricing/security/docs say no
model writes SOPs — revisit before merging".

### 2.4 Remaining false or stale claims, whole public surface

Searched `app/(public)/**`, `content/pages`, `app/layout.tsx`, `lib/seo`, `app/llms.txt`, `public/`,
and the repo-root static HTML.

| Where | Claim | Verdict |
|---|---|---|
| `product/page.tsx:280` | "AI-powered analysis" | **false** (§1.4). Not a positioning call — same class as #313's "AI-generated" |
| `security/page.tsx:117` | card "Audit Trail" | **false as a title** (§1.5) |
| `security/page.tsx:99-104` | "SOC 2 Alignment" card | **unverifiable**; no SOC 2 work exists. Belongs with the CEO's contract-claims list |
| `security/page.tsx:107-113` | GDPR "deletion" | **overclaims** (§1.1) |
| `security/page.tsx:128`, pricing, docs | four enforced roles | **half true** (§1.2) |
| `pricing/page.tsx:86`, `config.ts:65,90,130` | PDF a clean-export paid feature; Free watermarked | **false for PDF** (§1.3) |
| `docs/page.tsx:1810` | screenshot alt "five tiers" | **stale** (§1.6) |
| `use-cases/compliance/page.tsx:17-22,124,214` | "Generate SOC 2 audit evidence", "Built for SOC 2, ISO 27001" | **leans false** — evidence-shaped output, no compliance mapping in code. CEO list |
| `public/docs.html:331,457,529` | "AI-powered insights", "AI-Powered" badge, "every AI recommendation" | **false, but unreachable**: `next.config.js:28` redirects `/docs.html` → `/docs`. Dead file that would be served by any host that bypasses Next; delete |
| repo-root `pricing.html:154-157`, `security.html:86` (last touched `f400100`, 2026-04-13) | SSO & RBAC, audit trail, on-premise, SSO/SAML | **false — if served.** Nothing in this repo deploys them (no compose/Dockerfile reference); I cannot see whether an external host still serves them. CEO: confirm or delete |
| home title, AI Agents tab, AI-Ready, "where AI can help" | — | already in #314 |
| OG/meta (`layout.tsx:21,29`) | "AI opportunity reports" | true as wording (reports *about* AI opportunity) |
| JSON-LD (`lib/seo/jsonLd.ts:85-88`) | free offer, BusinessApplication | true |
| `sitemap.ts` | no descriptions | nothing to check |
| `terms/page.tsx:176` | no uptime guarantee | true, and contradicts "Custom SLAs — available" only if SLAs are offered; CEO list |

---

## 3. Q3 — Loop 128

**All filtered steps carry the flag; none were missed.** Every `pnpm --filter` in `.github/workflows/`
is one of the 11 (`deploy.yml:36,56`; `e2e-extension.yml:50,53,56,123,136,139`;
`e2e-web-app.yml:70,83,100`). The other six workflows use no pnpm. There are no composite actions
(`.github/actions` does not exist). The Dockerfile uses no filter. The only other `pnpm` invocations are
unfiltered: `pnpm install --frozen-lockfile` (×4), `pnpm typecheck` (`deploy.yml:39`, root script
`pnpm -r typecheck`) and `pnpm exec vitest run --no-passWithNoTests` (`deploy.yml:47`).

**What the flag does not cover, measured (table):**

1. **A renamed *script* is a different hazard from a renamed *package*.** `--fail-if-no-match` is about
   package selection. On pnpm 10.32.1 a missing script exits 1; **on pnpm 9.15.9 it exits 0**. CI and
   Docker pin 10.32.1, so CI is safe *today*; the protection rests on the `packageManager` pin, which
   loop 128's proof did not mention. If `pnpm/action-setup` ever resolves another major, `test:e2e`
   renamed in `extension-app` would pass green on 9.x.
2. **`pnpm -r typecheck` silently narrows.** It fails only when *no* package has the script. Drop
   `typecheck` from one of the 11 packages and CI keeps passing with that package unchecked. Five
   directories under `packages/` (`api-client`, `capture-core`, `renderers`, `schema-process`,
   `ui-components`) have no `package.json` at all and are not typechecked — by design per
   `Dockerfile:24-27`, but nothing asserts the eleven.

Neither needs a row this loop; (2) is a three-line assertion (count packages with `typecheck` = 11) that
belongs beside #306's work when the tooling area is next open.

---

## 4. Q4 — Practices

| Practice | Verdict |
|---|---|
| **Truth table first** (MR-055) | **Worked.** 129: eight false claims found against three named; 130: answered "does any model run?" before touching copy, and found the docs page stale end-to-end. Fewer second-guesses in review than 125-127. **Limit (§1):** rows were verified by existence ("a route exists"), not behaviour ("what the route does"). Brief change: each truth-table row records the line that *enforces* or *performs* the claim, not the line that defines it — a flag in `plans.ts` or a route file is not evidence |
| **Adjacent check** (MR-055) | **Worked on the edited pages, not on the tree.** 128 logged it properly (`ITERATION_LOG.md` loop 128, "Adjacent check"). 129 and 130 found siblings on their own pages (docs, AI wording) and filed them. Neither walked the rest of `app/(public)`, so product:280 survived a loop whose test iterates that exact directory |
| **Handbacks** (129: 1, 130: 2, plus a coordinator fix after review) | **Still brief gaps, and now invisible.** The log says "two passes", "three passes", but not why each pass was needed. MR-055 could name the three gaps it found; this window's handbacks cannot be diagnosed from the log. Log one line per handback: what the brief omitted |
| **Score-over-plan at 130** | **The deviation was right; the stated reason is not.** "#313 (11) took precedence over #309 (10)… the higher score decided it." Under the written formula both carry the **−2 saturation penalty** (3+ of the last 5 loops in `web-app`: 126, 127, 129 at loop 130 — and 125-127 at loop 129), which neither 129 nor 130 computed. With it, #313 = 9 and #299 / #290 / #278 (10, non-web-app) outrank it. The honest rationale is "user-visible direction (MR-054/055) over formula", which is a legitimate reason and should be written as such. The penalty has been silently dropped in the loop era; either apply it or record that the user-visible directive overrides it |
| Cool-off | Re-armed at 128 (3/3), correctly logged. Not consumed at 129/130 (both `burn-down`). **Charged now** |
| Agent diversity | `devops-engineer` (128), `frontend-engineer` ×2 (129-130) + `growth-strategist` adjacent both times (D-4 clause 1 correctly fired: 14 and ~20 strings). Fine |
| Recording scripts run the validator | Confirmed at every window commit (table). It caught a real malformed row at 128 |

### 4.1 #312 — the validator's message lies; what else is wrong in it?

#312 is right: `validate-backlog.mjs:89` splits on every `|`, so the advice at `:270` ("escape as `\|`")
cannot work. Three more defects, two of which matter more than #312:

1. **V4 has been blind for ~50 loops.** It recognises closures only in the form `#N closed` / `#N is
   CLOSED` (`:252`). The loop-era log writes "Follow-ups: 1 created (#314), 1 closed (#313)". Measured:
   the V4 regex matches **0** closures in loops 100-130, against **30** "N closed (#x)" phrasings in the
   same text; across the whole log its highest match is **#246**. Every row from #247 up is outside the
   one check that catches "closed in the log, never struck" — the MR-030 / loop-41 class the file was
   written for. The header (`:21-26`) honestly says V4 can only see what the log names; it does not say
   the log stopped naming in a form V4 reads.
2. **"New offenders" lists every malformed row, not new ones** (`:269`). The second false sentence in
   the same message.
3. **Budgets are counts, not identities** (`:52`, `:68-69`). At 19/19, fixing one old malformed row and
   corrupting a new one in the same commit passes clean. The fix is to pin the IDs (`[20, 45, 75, …]`)
   and fail on any ID not in the list.

These and #312 are one logical outcome: the validator says only true things and sees loop-era closures.

---

## 5. Q5 — What the window got wrong

1. **Truth tables ticked presence, not behaviour**: soft delete sold as GDPR deletion; four roles named,
   two enforced; recorder caps unenforced; PDF "clean export" ungated and unwatermarked (§1).
2. **The adjacent check stopped at the edited pages**: "AI-powered analysis" on the product page, an
   "Audit Trail" card on the security page, "five tiers" under "six tiers" in docs (§1).
3. **The tripwire guards four manifests, by substring**, and fails silently about why (§2.3).
4. **Loop 128's proof relied on the pnpm-10 pin without saying so**; a renamed script passes on pnpm 9
   even with the flag (§3).
5. **The −2 saturation penalty was not computed at 129 or 130**, and 130 justified its pick by a score the
   formula does not give (§4).
6. **Handback causes went unlogged** (§4).
7. **The brief for this review carried a wrong push count** (~52; measured 45). Small, but MR-055 §7.3
   said meta-review inputs need the same verification as agent outputs; so do briefs.
8. Nothing to revert.

---

## 6. Pattern — what this window adds

1. **"Is it built?" needs "where is it enforced?".** MR-054 said read what users read; MR-055 said read
   the whole screen; this window read the whole screen and still trusted definitions — a flag, a role
   enum, a route file. A truth-table row is evidence only when it cites the line that *does* the thing.
2. **Controls rot by format drift, not by code change.** V4 was not edited; the log's phrasing moved
   under it. Same family as MR-055's sub-area saturation reading. A control that parses prose needs a
   canary: a test that its pattern matched something in the last N loops.
3. **Practices work when they are named in the brief.** Truth-table-first was in the brief and worked;
   "adjacent" was in the brief scoped to "the page", and that is exactly how far it went.

No control-rule change proposed. Practice notes: (a) truth-table rows cite the enforcing line; (b) the
adjacent check's scope is the directory the loop's test already walks; (c) one line per handback with its
cause; (d) state the −2 penalty, or state the directive that overrides it.

---

## 7. Q6 — Next pick (loop 131)

**Constraints.** Pool 116 > 8 → `burn-down`. Cool-off charged (do not spend it on a burn-down). Last
three areas 128 test-infra, 129 web-app, 130 web-app → web-app is **legal** at 131 (not 3 consecutive),
but last five are 4 × web-app → **−2 penalty** on web-app candidates. A web-app 131 makes 129-131
consecutive and forces 132 off web-app. Agents: FE ×2, so FE at 131 is legal.

| # | Pick | Score (penalty applied) | Rule | Why |
|---|---|---|---|---|
| **1 — loop 131** | **New row: "public claims, second pass"** — product:280 "AI-powered analysis"; security "Audit Trail" card title; GDPR "deletion" → say what delete does (removed from workspace and share links; purge on request) unless the CEO funds a purge; "four roles" → state what each role can do, or name two; drop "(3 recorders)" or enforce it; PDF out of the clean-export row and Free's "watermarked" narrowed to Markdown; docs alt text; extend the test (AI-powered, enforced-role wording) and harden the tripwire (§2.3) | I4 A5 L2 C5 E2 R1 = 13 − 2 = **11** | `burn-down` (sibling of #310/#313, filed by MR-056) | Highest; user-visible; every item is a false claim on a public page; no CEO decision needed except the purge alternative. `frontend-engineer` + `growth-strategist` (≥3 strings). Truth table must cite enforcing lines |
| **2 — loop 132** | **#312 widened: "the validator says only true things"** — split on unescaped pipes (or change the advice), "New offenders" = new only, budgets pinned by ID, **V4 reads loop-era "N closed (#x)"** plus a canary that V4 matched ≥1 closure in the last 10 loops | #312 9 → widened I3 A4 L3 C5 E2 R1 = **12** | `burn-down`; `saturation-rule` if 131 is web-app | Off web-app; repairs a blind control; `qa-engineer` or `devops-engineer`. Expect V4 to surface struck-vs-closed mismatches among #247+ on first run — fix those in the same loop, they are the point |
| **3 — loop 133** | **#309** (dark-theme canvases + the browser pass loop 126 owes), with MR-055's insights-strip severity and perf-mode 1.4.1 | **10** (−2 if web-app saturation still applies = 8) | `burn-down` | User-visible a11y; `a11y-architect` primary, which loops 126-127 never used. Alternative if the area must move again: **#299** (10, security) |

Held: #311 (8) rides with #309 or after; #307 (10) and #252/#249/#251 (10) are analytics and wait for the
push; #303 matters after alerts are enabled; #278 is mostly a CEO list; #294 (9), #270, #265, #275, #290,
#287 unchanged in priority.

---

## 8. Q7 — CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **Push `main`** | **Unblocked** | **45 ahead** (46 with this review), not ~52. Counts to watch: **5901** root, **4123** web-app. The 11 filters now fail on a missing package |
| **First pnpm-10 CI run** | Waiting on the push | Confirm the *Install pnpm* step reports 10.32.1 — loop 128's script-rename protection depends on it (§3). Expect the ignored-build-scripts warning; delete one of the two `onlyBuiltDependencies` lists |
| **Alerts — enable** | After the push | Unchanged; #303 flap caveat |
| **#314 AI positioning** | **Needs your word** | Add: `product/page.tsx:280` "AI-powered analysis" is false, not ambiguous — recommend it is fixed at 131 without waiting for #314; `public/docs.html` is dead and can be deleted |
| **"Most Popular" on Team** | Needs your word | Unchanged — still on a plan nobody can buy |
| **Contract claims** — Custom SLAs, Dedicated support (both shown "available", `security/page.tsx:133-134`), "never used for training", "encrypted in transit", **SOC 2 Alignment**, compliance page "SOC 2 / ISO 27001 evidence" | Needs your word | Two added (SOC 2 card, compliance page). Terms say no uptime guarantee (`terms/page.tsx:176`); SLAs must agree with that |
| **Workflow deletion** (new) | Your call | Either fund a hard purge (and a retention window) or let 131 reword "deletion" to what it does |
| **Repo-root static site** (new) | Your call | `pricing.html`, `security.html` still sell SSO/audit trail/on-prem. Are they served anywhere? If not, delete |
| **React Flow Pro (#308)** | Unchanged | Subscribe, show attribution, or confirm licence terms |
| **#57 40% bounce target** | Unchanged | Re-confirm for the per-user estimator (#307) |
| **Email verification at signup** | Unchanged | Still the cost floor for #57 forgery |
| **#225 `TRUSTED_PROXY_HOPS`** | Defaults `0` | Unchanged |
| **#277 values** | Blocked on you | Unchanged |
| **Secret charset** | Unchanged | Applies to `CRON_SECRET` |
| **Admin-account squat check** | Unchanged | `WHERE lower(trim(email)) IN (<allowlist>)` |
| **#12** schema step fails quiet | Blocked on you | Unchanged |
| **#271** extension session-id filter | Needs approval | Unchanged |
| **#283** source maps + stack-trace page | Blocked on you | Unchanged |
| **#281** delivery test | After the push | Unchanged |
| **#216** extension untouched | **87 loops** (`871e29a`) | Unchanged |
| **Stripe Starter / Solo price IDs** (#278) | Yours | Unchanged — the page says "self-serve today"; without the IDs the cards say "Not available yet" |

---

## 9. Verdict

Every number reproduces at `be42c53`: web-app 4123 on 3 of 3, root 5901 on 2 of 2, typecheck 0,
validator clean at 116 open at every window commit; the eleven CI filters fail on a misspelt package and
pass on the real one on both pnpm majors. The "no LLM anywhere" verdict is right. All three closures are
real.

The misses are one level deeper than MR-055's: the window read the whole page and trusted definitions —
deletion that does not delete, four roles of which two differ, a clean PDF that Free already gets — and
read the whole page but not the whole tree, so "AI-powered analysis" survived the loop that proved no AI
runs. In the tooling, the validator's closure check has been blind since #246. Loop 131: the second
claims pass, citing enforcing lines. Loop 132: make the validator tell the truth.

---

### Appendix — reproducing

```sh
# filters, both majors (repo root)
for v in 9.15.9 10.32.1; do
  npx -y pnpm@$v --filter @ledgerium/web-app --fail-if-no-match exec node -e 1   # 0 / 0
  npx -y pnpm@$v --filter extension-app      --fail-if-no-match exec node -e 1   # 0 / 0
  npx -y pnpm@$v --filter extension-ap       --fail-if-no-match exec node -e 1   # 1 / 1
  npx -y pnpm@$v --filter extension-ap                         exec node -e 1   # 0 / 0
  npx -y pnpm@$v --filter extension-app --fail-if-no-match run test:e2e:nope     # 9: 0  10: 1
done
```

```js
// V4 coverage (repo root)
const log = require('fs').readFileSync('ITERATION_LOG.md', 'utf8');
const top = log.slice(0, log.indexOf('(loop 100)'));               // loops 100-130
const re = /(?:row\s+)?#(\d+)\s+(?:is\s+)?(?:CLOSED|closed)\b/g;    // validate-backlog.mjs:252
[...top.replace(/~~[\s\S]*?~~/g, '').matchAll(re)].length;          // 0
[...top.matchAll(/(\d+) closed \(([^)]*)\)/g)].length;              // 30
Math.max(...[...log.replace(/~~[\s\S]*?~~/g, '').matchAll(re)].map(m => +m[1])); // 246
```
