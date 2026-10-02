# MR-046 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 97-100, 2026-10-02. Commits `d983e42` (loop 97, #274 — ran concurrently with MR-045
and was not reviewed by it), `e1a9af5` (loop 98, #276), `28c8a03` (loop 99, #277 part 4),
`3bb26e9` (loop 100, #259). Rows filed in the window: #275, #277, #278, #279.
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md`. Everything below
that needs a row, a strike, a fix or a correction is a recommendation.

**Where the checks ran.** In the main checkout at `3bb26e9`. `git status --short -- apps packages
scripts compose.hostinger.yaml .github` is empty; the only working-tree changes are `.claude/*` and
an untracked `data/uploads`, neither of which any check reads. No worktree was needed this time.

**Validation run for this review — all executed at `3bb26e9`, none inferred:**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `cd apps/web-app && npx vitest run` | 3749 (loop 100) | **208 files, 3749 passed, exit 0** | matches |
| workspace `pnpm test` | 5536 (loop 99) + loop 100's 2 | **268 files, 5538 passed, exit 0**, first attempt | reconciles (loop 100's guard is a `.test.ts`, so the root suite counts it) |
| `pnpm -r typecheck` | 0 | **exit 0**; "Scope: 11 of 12 workspace projects"; 0 lines containing `error` | matches |
| `node scripts/validate-backlog.mjs` | — | **272 rows, 160 struck, 19/19 budget, clean, exit 0; `open 112 \| oldest open non-blocked: #13 (proposed), age not datable \| median age-at-close, last 10: 6 loops (max 191)`** | reconciles (§2) |
| Contrast ratios (loop 100) | 1.84 / 1.92 / 1.82 / 7.34 / 12.42 / 7.39-8.55 | WCAG relative-luminance formula in `node`, same hex values: **1.84, 1.92, 1.82, 7.34, 12.42, 7.39 / 7.87 / 8.55** | all reproduce (§6) |

**Not run:** no `next build`, no Playwright, no real-extension harness (no extension file changed in
the window), no dev server, no HTTP request to any route, no access to the VPS, its environment, its
database, or the Hostinger action's source. No `curl`/`wget` (deny-listed; not worked around). The
agent-delegation claims cannot be checked: `.claude/audit/tool-events.jsonl` records bash, file and
prompt events for 2026-10-02 (1012 `pre_bash`, 197 `file_change`) but no agent invocations, so "a
real rotation" is unverifiable from the repo either way. Statements marked *derived* are read from
code and config, not observed.

---

## 1. Lead

**The window built a check for "a deploy variable that never arrives" and, in the same file it checks,
missed the variable whose non-arrival matters most: if `NEXTAUTH_SECRET` does not reach the container,
production signs every session — and every admin ops token — with the string `change-me`, which is in
the repo, and the startup guard written to catch exactly this does not reject it.**

The chain, every link read from code:

1. `compose.hostinger.yaml:29` — `NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-change-me}`. If the host value is
   unset **or empty** (an unset GitHub secret renders as empty in `deploy.yml:135`), Compose supplies
   `change-me`. It is the **only** non-empty default on any secret in the file.
2. `scripts/docker-start.sh:10-23` — the guard exists for this case ("Fail fast if critical env vars
   are missing instead of silently breaking"). It rejects empty, `build-time-placeholder` and
   `ledgerium-dev-secret-change-in-production`. **It does not reject `change-me`** — the one value the
   production compose file can actually produce. Container starts; "Environment validated".
3. `next-auth/lib/env.js:22` — `config.secret ??= process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET`;
   `auth.ts` sets no `secret:`; compose sets no `AUTH_SECRET`. So `change-me` is the JWT key.
4. `admin-allowlist.ts:38-41` — admin is `session.user.email` on the allowlist, and since loop 98 that
   email comes from the token alone (`auth.ts:62-72`; nothing re-reads the user row). A forged token
   carrying an allowlisted email is an admin.
5. `admin/password-reset-link/route.ts:79-92` — the ops-token path needs **no session at all**:
   HMAC of `NEXTAUTH_SECRET` and the current minute. With `change-me`, an anonymous caller mints a
   reset link for any account (AUTHZ_AUDIT_001 P3-7 graded this "not exploitable without the secret";
   that grade assumes the secret is secret).

**Is it live?** Unknown, and nothing in the repo can say. It is live if the `NEXTAUTH_SECRET` GitHub
secret is unset/empty, or if the Hostinger action does not deliver the block the way the compose file
assumes (§5.2 — the repo's own evidence on that mechanism is thinner than loop 99 stated). Logins work
identically under `change-me`, so "the site works" is not evidence. This is MR-045's shape exactly —
a mitigation that exists in a file and may not exist in the process — found one layer down, and it
is worse: the bootstrap hole needed an empty `isAdmin` table; this one needs only an empty secret.

**Fix is small and does not depend on any variable reaching anything:** `docker-start.sh` rejects
`change-me` (and any value under 32 bytes), and the compose default becomes empty so a missing secret
hits the existing FATAL. The cost is the point: if production is currently running on `change-me`, the
next deploy fails loudly instead of serving forgeable sessions. That is a CEO-visible consequence and
belongs in the CEO table, not a surprise.

The loops themselves are sound. Loop 97's matrix is real and non-vacuous; loop 98 removed `isAdmin`
from every authorization decision; loop 99's check is correct as far as it goes; loop 100's numbers
reproduce to two decimals.

---

## 2. Q1 — Re-run the claims

All reproduce (table). Pool: 110 at MR-045 → loop 97 +1 −1 (#275/#274) → loop 98 +1 −1 (#277/#276)
→ loop 99 +1 (#278; #277 part 4 done, row stays open) → loop 100 +1 −1 (#279/#259) → **112**, as the
validator prints (272 − 160). Window: 3 closures, 4 creations. Ratio 0.75.

**Not fixed since MR-045:** "oldest open non-blocked: #13 (proposed), age not datable" — MR-045 §2
asked for a one-cell birth-loop edit on #13. Still blind. Second review asking.

---

## 3. Q2 — Loop 97: team authority (`lib/team-roles.ts`, member routes)

**The fix is correct, the test is real, and #275 is not the only remaining hole — but the others are
small.**

**Matrix.** `isActionOnHigherAuthority(actor, target) = target === 'owner' && actor !== 'owner'`
(`team-roles.ts:30-32`). Callers are pre-filtered to active owner/admin in all three handlers
(`[memberId]/route.ts:64-72, 140-148`; `members/route.ts` same pattern). Resulting table:

| actor \ target | owner | admin | member | viewer |
|---|---|---|---|---|
| owner | allow (≥2 active owners) | allow | allow | allow |
| admin | **403** | allow (peer) | allow | allow |
| member / viewer / non-member / inactive | 403 | 403 | 403 | 403 |

`authority-matrix.test.ts` runs the 5 × 4 × 3 cells against a stateful in-memory table whose `count`
honours the `status` key, plus a `twoOwnersOneRemoved` fixture. Reverting the `status: 'active'`
filter makes that fixture count 2 owners and the 409 cases pass through — so the miscount tests do
discriminate. **Non-vacuous.**

**Active-owner count.** Both guards fire only when the target is an *active* owner and count
`role: 'owner', status: 'active'` (`[memberId]/route.ts:101-104, 168-171`). A removed owner can no
longer stand in for a real one. Correct.

**Admins as peers — consistent.** Invite lets an admin grant `admin` (`invite/route.ts:106` blocks only
`owner`); PATCH lets an admin grant `admin` (`isRoleElevation`); removal lets an admin remove an admin.
One rule across all three. The asymmetry worth naming is AUTHZ P2-4 (an `admin` invite survives its
inviter's removal) — known, cold, unchanged.

**Writers re-enumerated** (`grep teamMember.(create|update|updateMany|upsert|delete)`): billing webhook
(`:369`, owner for purchaser), `invites/accept` (`:291` resurrect — **overwrites `role` from the
invite**, so a PATCH to a removed row's role is inert; `:303` create), the two member routes, and
`seat-management.ts:108` (status only; owners excluded at `:72-84`). No `user.delete` exists, so no
cascade path to zero owners. The residual "3 → 0" holds for the class it names.

**What the residual missed (none are escalations):**
1. **Teams already at zero active owners.** The fix stops new damage; nobody asked whether the bug was
   ever used. A read-only count (`teams with no active owner`) is the same kind of question as #273,
   and should ride with it.
2. **An admin can revoke an owner's pending invite** (`invite/[inviteId]/route.ts:27-34`, owner-or-
   admin, no inviter check) — interference, not escalation; same "acts on a superior" axis MR-045 asked
   loops to scope by. Worth one sentence in #275 or P2-4, not a row.
3. **Stale prose left behind:** `[memberId]/route.ts:27-33` still documents "count TeamMember rows
   with role='owner'" and "400 if sole owner" (it is active-only and 409); `team-roles.ts:19-23` — the
   `isRoleElevation` docblock is now orphaned above `isActionOnHigherAuthority`'s, so the editor shows
   the wrong doc on hover. The log and commit call the body-based route "bulk remove"; it removes one
   `userId` (`members/route.ts:128-140`).

**#275** is correctly scoped (row text covers removal + self-demotion). It is the only remaining path
to zero active owners.

---

## 4. Q3 — Loop 98: admin

**`isAdmin` is gone from every authorization decision.** `git grep isAdmin` outside tests and docs, at
`3bb26e9`, finds: the Prisma column (`schema.prisma:100`); seed scripts writing `false` (and one
writing `true`, below); the bootstrap stub's comments; `admin/users/[id]/route.ts:53,143,196` and
`UserDetailIdentity.tsx:111` (display — #277 (1)); and `teams/[id]/page.tsx:127`, a local variable
for team role, unrelated. No middleware reference (`middleware.ts` has none); no server component; the
NextAuth `authorize`/`jwt`/`session` callbacks no longer copy it (`e1a9af5` diff to `auth.ts` and
`auth-types.ts`). Because the type was removed, any `session.user.isAdmin` read would fail typecheck —
and typecheck is clean. Every `api/admin/*` and admin analytics route gates on `canAccessAdmin`,
`isAdminUnlimited`, `CRON_SECRET` or the ops token (enumerated per file).

**Stub is safe.** `admin/bootstrap/route.ts:19-26` returns 410, reads no session, no DB, no env.

**UI breakage:** none found. The only consumer of the flag is the admin user-detail badge, which reads
it from the API response, not the session. Old JWTs still carry an `isAdmin` claim for up to 7 days;
nothing reads it.

**Single source, consistent normalisation:** yes. One set (`admin-allowlist.ts:15-18`), compared via
`email.trim().toLowerCase()` (`:23`); `canAccessAdmin` delegates to it. Stale comment left at `:34`
("Bootstrap endpoint may still set it") — false since loop 98.

**Leftover not in #277:** `e2e/seed-test-db.js:216-225` seeds `admin@ledgerium.test` with
`isAdmin: true`. It is not allowlisted, so it is no longer an admin — any e2e that expected it to be
will fail or skip. `admin-a11y.spec.ts:41` is already `test.skip`; nothing else signs in as it. Dead
fixture; add to #277 (2).

**P1-2 interaction — real, and loop 98 widened it slightly.** Signup lower-cases and checks
`findUnique({ email })` (`signup/route.ts:47,63`); the database is SQLite (`schema.prisma:6`) where
`@unique` on `email` is case-sensitive; there is no email verification anywhere. So if either
allowlisted address has no account stored *exactly in lower case*, anyone can register it and is an
admin — including the session-less-adjacent `password-reset-link`. Before loop 98 that was already
true for `admin/users`, `password-reset-link` and the operations dashboard; loop 98 added the four
analytics surfaces to what a squatter gets. The marginal increase is small (reset-link was already
total), but it means **P1-2 is now the single remaining self-service path to admin**, and its
precondition is still an unanswered CEO query (two rows, exact case). And per §1, under `change-me` the
squatter does not even need to sign up.

---

## 5. Q4 — Loop 99's delivery check

### 5.1 Sound and non-vacuous — for what it checks

`deploy-env-delivery.test.ts` parses the `environment-variables: |` block (`:40-58`) and each
service's `environment:` list (`:66-102`), and fails on written-but-not-enumerated keys (`:162-169`)
and on stale allowlist entries (`:171-177`). Both parsers throw on empty, so a restructure fails loudly.
The four fixture self-tests cover undelivered, stale-delivered, stale-unwritten and allowlisted. The
allowlist reasons are accurate: `DISABLE_ADMIN_BOOTSTRAP` is read nowhere in `src` (only a comment);
`DEMO_MODE_DISABLE_TEAMS` would 404 team creation and invites (`teams/route.ts:78`,
`invite/route.ts:69`); `NEXTAUTH_SESSION_MAXAGE` is `auth.ts:55` (default 7 days).

**Three gaps, in order of consequence:**

1. **"Delivered" = "the key is listed" (`:141`), so a fail-open default is green.**
   `NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-change-me}` passes. The class the test exists for — "set by the
   deploy, not what the process runs on" — includes "listed, but the process may silently run on a
   default". §1. The test should also fail when a variable whose name matches `SECRET|PASSWORD|KEY|TOKEN`
   carries a non-empty `:-` default.
2. **A literal entry counts as delivery.** `- KEY=literal` with no `${KEY}` satisfies `:141` while
   discarding the deploy's value. `:186-192` only checks that an interpolation names its own key, not
   that one exists. None today (`NODE_ENV`, `PORT`, `DATABASE_URL`, `DATA_DIR`, `UPLOAD_DIR` are literal
   in compose but also hard-coded identically in `deploy.yml`), so this is latent.
3. **First block only** (`findIndex`, `:42`). One deploy step today; fine until a staging step appears.

### 5.2 Does the action deliver the block to the shell compose runs in?

**Repo evidence found — and it contradicts the test's header.** The header says the block "puts KEY in
the HOST environment the action runs `docker compose` under" (`:9-10`). The only empirical record of
how the action handles the block is commit `9c8309b`'s message: the failed run reported
`/home/runner/work/_temp/<id>.sh: line 46: syntax error near unexpected token '('`. That path is the
**GitHub runner**, not the VPS. So the block is interpolated into a shell script *on the runner* —
consistent with the action shipping it to Hostinger's API — and `docker compose` runs on the VPS under
Hostinger's control. Whether Hostinger then exposes the values to Compose interpolation (e.g. as a
project `.env`) is **not evidenced anywhere in the repo**.

The log's "the compose file's own comments and loop 85's history say so" is weaker than it reads: the
compose comment (`:70`) is an assertion, and loop 85 never observed a delivered value — the alerts
were never live. No in-repo observation shows *any* deploy-set variable arriving. The test therefore
proves a **necessary** condition (not listed ⇒ not delivered), not a sufficient one, and its name
overclaims. That matters precisely because of §1: if the mechanism fails wholesale, the variable
whose absence is silent is `NEXTAUTH_SECRET`. A positive observation is cheap and is the CEO's:
e.g. confirm a password-reset or invite email actually arrives (`SMTP_PASSWORD` has an empty default,
so a delivered email proves the block reaches compose).

### 5.3 #278 spot-check — the list is "read and not provided", not "a gap"

| Variable | Read at | Behaviour when absent | Verdict |
|---|---|---|---|
| `STRIPE_TEAM_PRICE_ID` (and `STARTER_`, `SOLO_`, `GROWTH_` `_PRICE_ID`) | `config.ts:85,124,151,178` → `stripePriceId` | `null`. **`stripePriceId` is read nowhere else in `src`.** Checkout uses `STRIPE_*_MONTHLY/ANNUAL_PRICE_ID` (`stripe.ts`), which deploy writes and compose delivers | **Dead config, not a gap.** 4 of 14 entries are delete-candidates, not CEO questions |
| `STRIPE_GUIDED_ONBOARDING_PRICE_ID`, `STRIPE_PROCESS_AUDIT_PRICE_ID` | `stripe.ts:273-274` → `''` | Live SKU map; empty price for a one-time purchase | **Real gap if those SKUs are sold** — CEO |
| `REVERSE_TRIAL_DAYS` | `reverse-trial.ts:54-59` | 14 | Intentional; but the documented kill switch (`0`) is unreachable in production — CEO |
| `LEDGERIUM_SIMILARITY_CLUSTERING` | `workflowGrouping.ts:32-34` | off, "byte-identical" | Intentional |
| `DB_PATH` | `storage.ts:30-31` | `DATA_DIR/ledgerium.db` = `/app/data/ledgerium.db`, same file as `DATABASE_URL` | Intentional |
| `NEXT_PUBLIC_*` (3) | build-time | Only `Dockerfile` `ARG`s matter (`Dockerfile:79-82` declares Umami only) | Belongs to the build, not the deploy block — the row should say so |

So the triage is mostly code-side and fast; only the two SKU prices, the trial kill switch and the
PostHog keys need the CEO. The row's framing ("each is either a known gap or a silent failure") makes
it look heavier and more CEO-bound than it is.

---

## 6. Q5 — Loop 100

**Ratios reproduce exactly** (table above). The badge's real parent is `--surface-secondary`
`#161B22` (`RealProductDemo.tsx:~60`), which gives 7.87:1 — inside the claimed 7.39-8.55 range.
`darkMode: 'class'` (`tailwind.config:5`), so `dark:` really is theme-scoped, not OS-scoped — the
"dark-only" justification holds.

**"The allowlist is exact" is slightly overstated.** `theme-contrast.test.ts:636-645` scrubs *every*
occurrence of `dark:text-brand-400` in `RealProductDemo.tsx`, so a second, unmeasured `dark:` use in
that file would pass. It is exact to file + token, not to line. Count-pin it (expect one occurrence)
or say "file and token". Cosmetic.

Residual "14 → 1" verified: `git grep text-brand-400 -- apps/web-app/src ':!*.test.*'` returns that
badge and one CSS comment (`globals.css:67`).

---

## 7. Q6 — Practices

| Loop | Residual class-scoped, from code? | Producer-per-field | Env-var mitigation cites delivering line | Delegation |
|---|---|---|---|---|
| 97 | **Yes** ("reduce a superior's authority / reach zero owners, 3 → 0"); writers enumerated | n/a | n/a | `security-reviewer` — claimed; unverifiable |
| 98 | **Yes** (4 → 0, 1 → 0) | n/a | **Avoided by design** — fix uses no variable. Best possible compliance | `security-reviewer` — claimed |
| 99 | Yes, for listed-ness; the class "variable the process may not run on" is wider (§5.1) | n/a | **This loop *is* the practice, mechanised** — but it stops at the file that delivers, as MR-045 asked, and the next hop (Hostinger → Compose) is unproven (§5.2) | `devops-engineer` — claimed |
| 100 | **Yes**, counted before editing; corrected the row's 13 → 14 | n/a | n/a | `frontend-engineer` — claimed |

**"Re-grades go back to the auditor" — not followed on its first opportunity.** MR-045 §6.3 said: return
P1-1 to `security-reviewer` to amend the grade with the compose evidence, then promote. `git log --
docs/meta/AUTHZ_AUDIT_001.md` shows one commit, the intake. The artifact still has no severity
definitions, still lists P1-1 and P1-3 as open defects, and still grades P3-7 on an assumption §1
undermines. #276 was promoted `MR-045-promoted` — a legitimate meta-review path, so no harm done — but
the practice adopted at the MR-045 recording has not yet been exercised once. **The audit artifact is
now the stalest security document in the repo.** Send it back: severity definitions, P1-1/P1-3 marked
closed with loop refs, P3-7 re-graded against §1.

**Agent-output quoting (MR-042 → MR-045):** not decided at the MR-045 recording either. **Fifth window.**
This review could not verify a single delegation from the repo (no agent events in the audit log), so
the practice is not academic. Adopt or strike.

**Prose-only:** "the Hostinger action exports the block to the host shell" (test header, log) — §5.2.

---

## 8. Q7 — What the window got wrong

1. **Loop 99 test header (`:9-10`) and log:** the action "puts KEY in the HOST environment the action
   runs `docker compose` under". The repo's only evidence (`9c8309b`) puts the block in a script on the
   GitHub runner; delivery to the VPS's Compose is unevidenced. "loop 85's history says so" — loop 85
   never observed a delivered value.
2. **Loop 99:** a check for undelivered variables passes `NEXTAUTH_SECRET:-change-me`, and
   `docker-start.sh` does not reject that value (§1). Not a false statement; a false sense of coverage.
3. **#278 row:** framed as 14 open decisions; at least 4 are dead config reads and 3 belong to build
   args (§5.3).
4. **Loop 97:** the residual's "every writer enumerated" holds; the log/commit's "bulk remove" names a
   single-user endpoint; route and helper docblocks left stale (§3).
5. **Loop 100:** "the allowlist is exact" — exact to file and token, not to line (§6).
6. **Process:** MR-045's auditor-amends practice not exercised; #13 cell edit not made; quoting
   practice undecided for a fifth window.
7. **Nothing to revert.** Loops 97, 98 and 100 are correct as built; loop 99's check is correct and
   should be extended, not changed.

---

## 9. Q8 — Next pick (loop 101)

Pool 112 > 8 → `burn-down`. Last five Areas: 96 evidence, 97 security/authz, 98 security/authz,
99 infra/deploy, 100 a11y. A `security/authz` pick is 3 of the last 5 → −2. An `infra/deploy` pick is
not.

| Candidate | Score | Notes |
|---|---|---|
| **New row: session-signing secret falls back to a public value** (`MR-046-promoted`) | I5 A5 L3 C4 E1 R2 = **14** (infra/deploy, no penalty) | `docker-start.sh` rejects `change-me` and secrets < 32 bytes; compose default becomes empty; extend the loop-99 test to fail on non-empty `:-` defaults for secret-named keys. Residual: *secret-named variables that can silently take a non-secret value: 1 → 0*. Agent: `devops-engineer` again (2 of 3) or `security-reviewer`. **Deploy consequence must be stated to the CEO first** |
| #267 error text through a helper | 10 | Non-security alternative |
| #275 concurrent owner removal | 8 | Small and well-specified; good follow-on |
| #278 triage | — | ~half code-only (delete dead `stripePriceId` reads); rest CEO |
| #273 + zero-owner count | — | Read-only production queries; CEO |
| #266, #265, #268, #270, #249-#252 | ≤ 10 | No change in standing this window |
| AUTHZ P2-1 / P2-2 / P2-3 / P2-5 | — | **Cold; not pickable.** Intake was ~loop 96, so clause-7 age ≥ 10 is not met, and no PRD cites them. P2-3 (`GET /api/teams` membership filter, a one-line `status: 'active'`) is the cheapest; P2-1 (JWT not revocable) gains weight from §1 — a rotated secret is currently the *only* way to kill sessions. Triage at MR-047+ |

**Pick: the new secret-fallback row**, promoted by this review on code evidence (the MR-045 §6.2
mechanism is for audit grades; this finding is the review's own). The label question — is an
`MR-046-promoted` row a "burn-down" pick? — has precedent (#276, loop 98). Say so in the Candidate
Selection block rather than let it pass.

**Before loop 101, one CEO check (no code):** is the `NEXTAUTH_SECRET` GitHub secret set and non-empty?
If it is not, production is serving forgeable sessions today and loop 101 is not a choice.

---

## 10. Pattern — what this window adds

1. **Delivery has three hops, and the window proved one.** Deploy file → Hostinger → Compose
   interpolation → `process.env`. Loop 99 mechanised the last hop. The middle hop has no observation in
   the repo at all.
2. **A default is a delivery.** Every check that asks "did the value arrive?" must also ask "what does
   the process run on if it didn't?" The answer for one variable here is a public string.
3. **Guards rot against the config they guard.** `docker-start.sh`'s placeholder list predates the
   compose file's placeholder; nobody re-read one when writing the other. Same failure as MR-045's
   compose comment nobody re-read.
4. **The practices are being adopted faster than they are exercised.** Two MR-045 practices; one done
   by design (loop 98), one not done at all. A practice that has never fired is a sentence.

No new rule. One clarification for the CEO, extending MR-045 §6.2-2: an env-var mitigation names the
delivering line **and the value the process runs on when the variable is absent**.

---

## 11. Q9 — CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **`NEXTAUTH_SECRET` set and non-empty in GitHub (new, urgent)** | Needs a check | If empty/unset, or if Hostinger does not deliver the block, production signs sessions and ops tokens with `change-me` (§1). Also approve that the fix makes such a deploy fail loudly |
| **Evidence the deploy block reaches Compose at all (new)** | Needs one observation | Has a reset/invite email ever arrived from production? `SMTP_PASSWORD` defaults empty, so one delivered email proves the mechanism (§5.2) |
| **Production `isAdmin` users** | Still open | Now powerless (loop 98). Who, and since when, still says whether bootstrap was used |
| **Allowlisted accounts (P1-2)** | Still open, now more important | Exact lower-case `User.email` rows for both addresses. P1-2 is the only self-service path to admin left (§4) |
| **`DEMO_MODE_DISABLE_TEAMS` / `NEXTAUTH_SESSION_MAXAGE` values** | Unchanged | Allowlisted in the loop-99 test pending your values. Production today: teams on, 7-day sessions. Session length now also bounds §1's and P2-1's exposure |
| **#278 triage** | Narrower than filed | Yours: the two one-time SKU prices, PostHog keys, whether the trial kill switch must be reachable. Code-only: 4 dead `stripePriceId` reads, 3 build-time vars (§5.3) |
| **#273 + teams with zero active owners** | Read-only counts | Did #274's bug ever run? Did bad invites ever exist? |
| **#12** schema step fails quiet | Blocked on you | Same family as §1: a startup step that continues on failure |
| **#271** extension session-id filter | Needs approval | Unchanged |
| **Alerts (#256/#263)** | Repo side done; not live | Delivery to the container is enumerated; arrival unproven (§5.2) |
| **AUTHZ_AUDIT_001 amendment** | Practice not yet exercised | Send back to the auditor: severity definitions, P1-1/P1-3 closed, P3-7 re-graded |
| **Agent-output quoting practice** | Fifth window | Adopt or strike |
| **#225** `TRUSTED_PROXY_HOPS` | Defaults `0` | Unchanged; still fronts login and signup throttles |
| **#216** extension untouched | 57 loops | Unchanged |
| **#57**, **#212**, **#190/#193**, **#191** | Unchanged | — |

---

## 12. Verdict

Every number reproduces at `3bb26e9` on the first attempt. Nothing in loops 97-100 needs reverting:
the team-authority rule is right and tested against real state, `isAdmin` decides nothing anywhere,
the delivery check catches what it says it catches, and the contrast work measures true.

The window's gap is the same one MR-045 named, one hop further on. The window learned "set is not
delivered" and wrote a test for it; it did not ask "delivered as what, when absent?" — and the one
variable whose absence is silent is the one that signs every session. Do first: the CEO's
`NEXTAUTH_SECRET` check; then loop 101 on the fallback, with the deploy consequence stated in advance.
Record §8 1-3 as corrections, send AUTHZ_AUDIT_001 back to its author, and make the #13 cell edit.
