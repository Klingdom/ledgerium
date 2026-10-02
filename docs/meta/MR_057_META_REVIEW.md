# MR-057 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 131-133, 2026-10-02. Commits `2ccf3a5` (pick correction), `9d2dad7` (loop 131, #312),
`0846385` (loop 132, #317), `98bad4b` (loop 133, #315). Rows filed in the window: #318, #319, #320
(L133). Rows closed: #312, #317, #315.
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md` or any audit.
Everything below that needs a row, a strike, a fix or a correction is a recommendation.

**Where the checks ran.** Main checkout at `98bad4b`. Working-tree changes are `.claude/*` and an
untracked `data/`, which no check reads; `git status --short` was identical before and after every run.
Local Node v24.20.0, pnpm 10.32.1, Windows. Every scratch fixture lived in the session scratchpad, not the
repo. Local `origin/main` is `e1a9af5`; `main` is **50 commits ahead** (`git rev-list --count
origin/main..main`), 51 once this review is recorded. The brief's "~50" is right this time.

**Validation run for this review — all executed at `98bad4b`, none inferred. Verdict = exit code +
ANSI-stripped summary line.**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `apps/web-app`: `pnpm exec vitest run`, **×3** | 4133 (loop 133) | **3 of 3: 224 files, 4133 passed, exit 0** | matches |
| root `pnpm test`, **×2** | 5911 | **2 of 2: 282 files, 5911 passed, exit 0** | matches |
| `pnpm -r typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | clean | **exit 0**: 313 rows, 194 struck, 14/14 baselined malformed, **open 119** | matches; pool trend in §5 |
| `node --test scripts/validate-backlog.test.mjs` | 13 pass | **tests 13, pass 13, fail 0, exit 0** | matches |
| `node scripts/check-typecheck-coverage.mjs` (pnpm 10.32.1) | 0, "11 packages" | **exit 0**, "11 workspace packages checked" | matches |
| `node --test scripts/check-typecheck-coverage.test.mjs` | 4 pass | **tests 4, pass 4, exit 0** | matches |
| `npx -y pnpm@9.15.9 exec node scripts/check-typecheck-coverage.mjs` (`--version` printed 9.15.9) | 1 | **exit 1**, message names `--fail-if-no-match` | matches |
| V4 claim count | 109 (loop 131) | **112** at HEAD (27 prose-form + 86 Follow-ups-form ids, all known rows) | consistent: 131-133 added closures; 0 mismatches (validator exit 0) |

**Not run:** Linux, Node 20, a GitHub runner, `next build`, Docker, Playwright, any browser rendering of
the changed pages, any HTTP request. Loop 133's revert proof ("stashing the 5 copy files fails 9 tests")
was **not** reproduced — stashing in the main checkout would have touched the `.claude/*` changes. No
`curl`/`wget`.

---

## 1. Lead

**The window holds; nothing reverts.** Every count reproduces, V4 now catches a real mismatch, the
coverage script refuses pnpm 9, and the five enforcement claims I spot-checked are as loop 133 says.

What the window got wrong is MR-056's lesson applied one ring short — again — plus one error that is
MR-056's own:

1. **The roles table loop 133 rewrote still overclaims, in the line that says it is enforced.**
   `docs/page.tsx:1601-1602`: Owner "manage billing, delete the team"; Admin "manage all workflows and
   portfolios" — directly above "Owner and Admin permissions are enforced today" (`:1614`). There is no
   team-delete route (`app/api/teams/[id]/` holds only `invite/` and `members/`), checkout reads no team
   role, and workflows and portfolios are scoped by `userId` (`api/portfolios/route.ts:131`; `plans.ts:103`
   "no `teamId` on Workflow/Portfolio"). What owner/admin actually enforce is invite, revoke, role change
   and removal (`invite/route.ts:89`, `members/route.ts:150`, `members/[memberId]/route.ts`, `invite/[inviteId]/route.ts:31`).
2. **The Terms page still promises deletion.** `terms/page.tsx:52`: "You can export or delete your data any
   time". Workflow delete is a soft delete (`api/workflows/[id]/route.ts:291-295`); there is no account
   deletion endpoint at all (no `DELETE` in `app/api/account/route.ts`). This is the GDPR claim loop 133
   fixed on the security page, one directory over, in the tree its test walks.
3. **The pin's name is wider than its assertion.** `pricing-copy.test.ts:321` is titled "…so no page promises
   deletion"; it asserts only against `security` (`:325`, `:328`). Exists-vs-enforced, inside the test.
4. **#316's premise is wrong — and the error is MR-056's.** MR-056 called the unenforced viewer role "an
   authorization defect" and #316 says a viewer "can presumably create, edit or delete team-scoped content".
   There is no team-scoped content. Every team route a member can reach is a read of the roster or pending
   invites (`members/route.ts:56-61`, `invite/route.ts:299-304`); every write is owner/admin. Viewer =
   member = *read the roster*. Nothing is exposed. SYSTEM_HEALTH ("That's a real access-control bug")
   repeats it to the CEO. The live defect is narrower: the **in-app invite picker offers "Viewer"**
   (`teams/[id]/page.tsx:169-170`) with nothing to say it differs from Member in name only.

---

## 2. Q2 — Loop 131 (validator)

### 2.1 Is V4 checking something now?

**Yes.** Deliberate mismatches in scratch copies of the real backlog + log (`VALIDATE_*` seams):

| Injected at the top of the log | Exit | Verdict |
|---|---|---|
| `- **Follow-ups:** 0 created, 1 closed (#316).` | **1**, "V4 #316 is described as closed…" | caught |
| `Row #316 is CLOSED.` | **1** | caught (old prose form still read) |
| `- **Follow-ups:** 0 created, 1 closed (#315; #316 still open).` | **1** | false positive, but loud — acceptable |
| `- Follow-ups: 1 closed (#316).` (not bold) | **0** | **missed** |
| `- **Follow-ups:** 0 created, two closed (#316, #318).` | **0** | **missed** |
| `- **Follow-ups:** 0 created; closed #316.` | **0** | **missed** |

The 121 bold `Follow-ups:` lines are today's format, so V4 is live *today*. But it is the same control
that went blind once by format drift, and MR-056 §6.2 / §7 asked for a **canary** — "V4 matched ≥1 closure
in the last N loops". Loop 131 did not add it (`validate-backlog.test.mjs` has no such case; the
real-repo test at `:147` asserts only exit 0). A drift to the un-bolded form would pass silently again.

### 2.2 The "stale baseline fails" rule

**Acceptable.** Fixing a malformed row forces its id out of `MALFORMED_ROW_BASELINE`
(`validate-backlog.mjs:57`) in the same commit; the failure message names the id and the constant. The
only awkward case is a row *renumbered or deleted* — also fails, which is the right answer. Cost: one line
per fix. Keep.

### 2.3 `\\|` (escaped backslash, then pipe)

**Handled consistently with GitHub.** `split(/(?<!\\)\|/)` (`:91`) does not split `C:\\|`; the row
stays 15 cells and passes. cmark-gfm scans `\|` as an escaped pipe regardless of what precedes the
backslash, so the validator and the rendered table agree. An escaped pipe at a cell's end (`a \| |`) also
parses correctly. The backlog today has 26 `\|` and zero `\\|`. No defect.

---

## 3. Q3 — Loop 132 (typecheck coverage)

**It works on today's workspace and passes on nothing elsewhere.** Fixtures under the scratchpad,
`CHECK_PNPM_VERSION=10.32.1`, each with a TS package lacking `typecheck`:

| Shape | Result | Verdict |
|---|---|---|
| `.tsx`-only package | exit 1 | caught |
| unquoted glob `- packages/*` | exit 1 | caught |
| flow YAML `packages: ['apps/*', 'packages/*']` | **exit 0, "0 workspace packages checked"** | **vacuous pass** |
| nested `packages/**` | **exit 0, 0 checked** | **vacuous pass** |
| explicit path `- tools/q` | **exit 0, 0 checked** | **vacuous pass** |
| `.mts`-only package | **exit 0** | missed (`hasTs` matches `.tsx?$` only) |
| `"typecheck": "echo ok"` | **exit 0** | presence, not behaviour — exists-vs-enforced again |

1. **Zero packages found is reported as OK** (`check-typecheck-coverage.mjs:62`). The glob regex (`:43`)
   reads only one-level `x/*` block entries; any other spelling of `pnpm-workspace.yaml` makes the gate
   check nothing and say "all TS packages have a typecheck script". Fix: fail when `checked === 0`, and
   fail on any glob line it cannot parse.
2. **Ordering is fine.** Both wirings run after `pnpm install --frozen-lockfile` and before Typecheck
   (`deploy.yml:33,39,42,47`; `e2e-web-app.yml:65,68`). The script reads only files and `pnpm --version`,
   so install order cannot make it vacuous.
3. **The extension workflow has no version guard.** `e2e-extension.yml` (`:30`, `:50-56`) runs
   `pnpm --filter extension-app --fail-if-no-match test:e2e` — the exact renamed-script case MR-056 measured
   passing on pnpm 9 — and never runs the script. The pnpm pin protects it; the guard does not.
4. The extension *package* is covered (`apps/extension-app` typecheck = `tsc --noEmit`). The five
   `package.json`-less directories under `packages/` hold zero TS files (`git ls-files`), so their omission
   is harmless today.

---

## 4. Q4 — Loop 133 (enforcement-level copy)

### 4.1 Five claims spot-checked against code

| Claim (as loop 133 now states it) | Code | Verdict |
|---|---|---|
| Delete = archive, retained, not purged | `status: 'deleted'` update (`workflows/[id]/route.ts:291-295`); no `workflow.delete`/`deleteMany` anywhere | **true** |
| PDF is the print dialog, ungated | `window.print()` in click handlers, no plan check (`SOPPageShell.tsx:248-261`, `workflows/[id]/page.tsx:300-306`) | **true** |
| Only owner/admin enforced | owner/admin gates at `invite/route.ts:89`, `members/route.ts:150`, `members/[memberId]/route.ts` PATCH, `invite/[inviteId]/route.ts:31`; `team-roles.ts` decides elevation only | **true** — and, per §1.4, member/viewer have no write path to differ on |
| No recorder limit | `maxRecorders` serialised (`feature-gating.ts:263`), read by nothing | **true** (seats, by contrast, are enforced: `invite/route.ts:183-212`) |
| Markdown watermark gated on plan | `if (!isCleanExport)` prepend/append (`export-markdown/route.ts:72-74`); pinned by `pricing-copy.test.ts` | **true** |

### 4.2 Remaining enforcement-level overclaims — public *and* in-app

| Where | Claim | Verdict |
|---|---|---|
| `docs/page.tsx:1601` | Owner: "manage billing, delete the team" | **false** — no team-delete route; billing has no team-role gate |
| `docs/page.tsx:1602` | Admin: "manage all workflows and portfolios" | **false** — userId-scoped; no team content exists |
| `terms/page.tsx:52` | "You can export or delete your data any time" | **false** — soft delete; no account deletion |
| `privacy/page.tsx:172` | "manage or delete workflows within the platform" | borderline-true ("within the platform"); reword with the Terms line for consistency |
| `teams/[id]/page.tsx:169-170` (app) | invite role picker: Member / Viewer | **implies** a difference that does not exist |
| `account/page.tsx:671` (app upsell) | "Starter includes … clean exports" | true (Markdown/JSON are gated) |
| `export-markdown/route.ts:11,14` | "Upgrade for clean exports" / "remove this watermark" | true |
| `dashboard/page.tsx:611` (app) | `confirm('Delete this workflow?')` | says delete, does archive; low-stakes, but the same word |
| `analytics/product/page.tsx:302` | "permanently delete … events" | admin-only purge of analytics events; true |
| In-app upgrade prompts for PDF, settings promising deletion | none found | — |

---

## 5. Q5 — Practices

| Practice | Verdict |
|---|---|
| **Enforcement-level truth table** (MR-056) | **Worked on the rows it named, not on the rows it wrote.** Loop 133 reworded the roles table and kept two capability claims nobody traced (§1.1). Brief change: every *new or rewritten* capability sentence gets a truth-table row too, not only the ones the backlog named |
| **Adjacent check** | **Directory-wide by assertion, not by reading.** The new pins walk `PUBLIC_FILES` for AI-powered, recorders and roles, but deletion is pinned to one file (§1.2-1.3). Each pin's scope must equal its title |
| **`density-response: scope-guard-adjacent` at 133** | **Correctly applied.** Three follow-ups, each anchored to a named CEO decision (Pages, retention, pricing) — the "blocked-on-other-item" anchor the clause allows. Caveat: #318 is #315's own part (6), so #315 earned a closure while one of its seven parts became a new row. Legitimate (blocked), but it is 1 closed + 1 created for one piece of work |
| **Pick-order corrections** (`2ccf3a5`; 132 deferring #316) | **Both were right under the formula, and right in substance** — for a reason nobody gave: #316 has no exploitable surface (§1.4). The scoring did *not* under-weight a real authz defect; MR-056's framing over-weighted a definitional one. **No security-bias or release-blocker bonus for #316.** A security bias would have spent loop 131 on a role with nothing to restrict |
| Handback logging (MR-056 §4) | 133 logs "two passes" without causes. Not done |
| Saturation penalty | Computed correctly at 132 (#315 12 − 2) and 133 (web-app 2 of 5, none). MR-056's correction landed |

### 5.1 Follow-Up Debt Policy ratio, loops 124-133

From the `Follow-ups:` lines (`ITERATION_LOG.md:44-402`): **closed 11, created 7 → 1.57** (loop-only).
Counting rows the two meta-reviews in that window filed (MR-055: #310, #311; MR-056: #315, #316, #317),
created is 12 → **0.92**. Both pass ≥ 0.5.

**The pool is not trending down.** Validator `open` was 116 at MR-056 (`be42c53`) and is **119** now:
three closures against six filings. Four of the six (#318, #319, #320, and #316 in substance) are blocked
on CEO decisions loops cannot make. The ratio passes while the pool grows — the MR-040 objection, live
again.

---

## 6. What the window got wrong

1. Loop 133's rewritten roles table claims owner/admin capabilities that do not exist (§1.1).
2. "Delete your data any time" survives on the Terms page; the deletion pin is security-page-only but
   named "no page" (§1.2-1.3).
3. **MR-056 (my predecessor's review) mis-classified #316 as an authorization defect**, without tracing
   what a member can do; #316 inherited "presumably", and SYSTEM_HEALTH told the CEO it was "a real
   access-control bug". It is a definition gap blocked on a team data layer that does not exist (§1.4).
4. Loop 132's guard reports OK on zero packages, misses `.mts`, checks script presence not content, and
   is absent from the one workflow whose example motivated it (§3).
5. Loop 131 shipped V4 without MR-056's canary; V4 already misses un-bolded and word-number forms (§2.1).
6. Pool 116 → 119 in a window that "closed" three rows (§5.1).
7. Nothing to revert.

---

## 7. Pattern — what this window adds

1. **Writing is not exempt from the truth table.** MR-056 said cite the enforcing line; 133 did, for the
   claims it was handed, and wrote new claims in the same edit without one.
2. **A control is as wide as its smallest assertion, not its name.** The deletion pin, the coverage guard
   ("all TS packages") and V4 each report a wider result than they check. Rule for briefs: a guard's
   success message may only state what it actually checked, including the count (0 is a failure).
3. **Verify the severity, not only the claim.** An "authz defect" that nobody traced to a write path
   bent two picks' worth of discussion and the CEO summary.

No control-rule change proposed. Practice notes: (a) new/rewritten capability sentences get truth-table
rows; (b) pin scope = pin title; (c) guards fail on zero items checked; (d) a severity word
("authorization", "security") in a row needs the route that makes it so.

---

## 8. Q7 — Next pick (loop 134)

**Constraints.** Pool 119 > 8 → `burn-down`. Cool-off charged; do not spend it on a burn-down. Last five:
129 web, 130 web, 131 tooling, 132 test-infra, 133 web → web-app is **3 of 5 → −2** on web-app
candidates; not 3 consecutive, so web-app is legal. `frontend-engineer` ×1 at 133.

| # | Pick | Score | Rule | Why |
|---|---|---|---|---|
| **1 — loop 134** | **New row (MR-057): "capability and deletion claims the code does not keep, third pass"** — `docs/page.tsx:1601-1602` (state only invite/revoke/role/remove), `terms/page.tsx:52` and `privacy/page.tsx:172` (export and archive), in-app invite picker (hide Viewer or label it "same access as Member for now"), `dashboard/page.tsx:611` confirm wording; widen the deletion pin to `PUBLIC_FILES` and make every #315 pin's scope match its title | I4 A5 L2 C5 E1 R1 = 14 − 2 = **12** | `burn-down` (sibling of #315) | A false sentence on the Terms page outranks tooling. `frontend-engineer` + `growth-strategist` (≥3 strings). Terms wording: CEO may want sight of it; the fix makes the page claim *less*, so it need not wait |
| **2 — loop 135** | **#273** — stop returning an invalid stored role from `invites/accept` and exclude invalid-role invites from `GET …/invite`; the production count and revoke stay CEO/ops | **11** (Area `security / authz`) | `burn-down` | A real, traced residue of an escalation path, unlike #316. `security-reviewer` — rotates off FE. Leaves the row partially done; log the split |
| **3 — loop 136** | **New row (MR-057): "guards that pass on nothing"** — coverage script fails at 0 packages and on unparseable globs, reads `.mts/.cts`, runs in `e2e-extension.yml`; V4 canary (fail if no `Follow-ups:` closure parsed in the top 10 loop entries) | I3 A4 L3 C5 E1 R1 = **13**, honestly I2 → **12** | `burn-down` | Off web-app; `devops-engineer`. Latent today (current YAML parses), hence third |

Alternatives at 10: #299 (rate limiter), #290 (login throttle), #309 (−2 → 8).

**#316 — hold; do not start.** Nothing exists to restrict (§1.4), and no artifact defines a viewer:
`team-roles.ts:4` orders roles and cites UMAP-001 §3 AC-11, which defines role *display/editing*
(`USER_MANAGEMENT_ACCOUNT_PAGE_REVIEW_001.md:85`), not viewer capabilities; TEAM-001 reviews list the enum
only. Recommend re-scoping #316 to "blocked — CEO definition of viewer and member capabilities, and the team
data layer (#143/#159 family)", correcting "presumably…" and the I/R dimensions, and moving the in-app
picker label into pick 1. The recorder limit belongs with the team data layer, not with roles.

---

## 9. Q8 — CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **Push `main`** | **Unblocked** | **50 ahead** (51 with this review). Counts to watch: **5911** root, **4133** web-app, 13 + 4 node:test cases |
| **First pnpm-10 CI run** | Waiting on the push | `deploy.yml` now *fails* if *Install pnpm* resolves < 10 — the first run is the proof. `e2e-extension.yml` still relies on the pin alone |
| **Alerts — enable** | After the push | Unchanged; #303 flap caveat |
| **#314 AI positioning** | Needs your word | "AI-powered analysis" now fixed; remaining AI labels are positioning, not false-by-code |
| **Export footer "Ledgerium AI"** | Needs your word | Product name; not an AI claim. Recommend keep |
| **"Most Popular" on Team** | Needs your word | Unchanged — still on a plan nobody can buy |
| **Contract claims** (SLAs, dedicated support, SOC 2 card, compliance page, "never used for training") | Needs your word | Add: **Terms "delete your data any time"** — fixed by pick 1 unless you fund deletion |
| **#308 React Flow Pro** | Unchanged | Subscribe, attribute, or confirm licence |
| **#318 GitHub Pages** | Needs your check | Is Pages on for this repo? If not, delete the 16 root HTML files |
| **#319 retention / purge** | Needs your word | Gates any real "deletion" claim, including Terms and account deletion (none exists) |
| **#320 PDF gating** | Needs your word | Gate, watermark, or keep free (today's copy says free-by-omission) |
| **#316 viewer definition** | **Needs your word, and is not urgent** | Today a viewer and a member can both only see the roster. MR-056's "real access-control bug" was wrong. Define viewer/member when the team workspace is built |
| **#57 bounce target** | Unchanged | Re-confirm for the per-user estimator (#307) |
| **Email verification at signup** | Unchanged | Cost floor for #57 forgery |
| **#225 `TRUSTED_PROXY_HOPS`** | Defaults `0` | Unchanged |
| **#277 values** | Blocked on you | Unchanged |
| **Secret charset** | Unchanged | Applies to `CRON_SECRET` |
| **Admin-account squat query** | Unchanged | `WHERE lower(trim(email)) IN (<allowlist>)` |
| **#12** schema step fails quiet | Blocked on you | Unchanged |
| **#271** extension session-id filter | Needs approval | Unchanged; extension untouched 90 loops |
| **#283** source maps + stack-trace page | Blocked on you | Unchanged |
| **#281** delivery test | After the push | Unchanged |
| **#216** extension untouched | **90 loops** (`871e29a`) | Unchanged |
| **Stripe Starter / Solo price IDs** (#278) | Yours | Unchanged |

---

## 10. Verdict

Every number reproduces at `98bad4b`: web-app 4133 on 3 of 3, root 5911 on 2 of 2, typecheck 0,
validator clean (open 119), 13 + 4 script tests green, pnpm 9 refused. V4 catches a deliberate closure of
an open row. The five enforcement claims hold.

The misses: the roles table loop 133 rewrote still claims owner/admin powers that do not exist; the Terms
page still promises deletion; the deletion pin checks one file under a "no page" title; the coverage guard
reports OK when it checked nothing. And MR-056 inflated #316 into an authorization defect that has no
write path to defend — the deferrals were right. Loop 134: the third claims pass, with the Terms line.

---

### Appendix — reproducing

```sh
# V4: a deliberate closure claim against an open row (scratch copies; repo untouched)
cp IMPROVEMENT_BACKLOG.md "$S/B.md"
{ echo "- **Follow-ups:** 0 created, 1 closed (#316)."; cat ITERATION_LOG.md; } > "$S/L.md"
VALIDATE_BACKLOG_FILE="$S/B.md" VALIDATE_ITERATION_LOG_FILE="$S/L.md" node scripts/validate-backlog.mjs  # exit 1
# same with "- Follow-ups: 1 closed (#316)."                                                     # exit 0 (missed)

# coverage guard on a workspace it cannot parse (fixture dir A, TS package with no typecheck)
echo "packages: ['apps/*', 'packages/*']" > A/pnpm-workspace.yaml
CHECK_TYPECHECK_ROOT=A CHECK_PNPM_VERSION=10.32.1 node scripts/check-typecheck-coverage.mjs        # exit 0, "0 checked"
npx -y pnpm@9.15.9 exec node scripts/check-typecheck-coverage.mjs                                   # exit 1
```
