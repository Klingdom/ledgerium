# MR-048 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 104-106 plus one Mode 3 correction, 2026-10-02. Commits `978cd29` (Mode 3, loop-96
flaky test), `23f7bdd` (loop 104, #284), `801b5fd` (loop 105, #286), `78d9e38` (loop 106, #279). Row
filed in the window: #287.
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md`. Everything below
that needs a row, a strike, a fix or a correction is a recommendation.

**Where the checks ran.** Main checkout at `78d9e38`. `git status --short -- apps packages scripts
compose.hostinger.yaml .github` is empty; the working-tree changes are `.claude/*` and an untracked
`data/`, which no check reads. Local Node is v24.20.0; CI pins Node 20.

**Validation run for this review — all executed at `78d9e38`, none inferred:**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `cd apps/web-app && pnpm exec vitest run`, **×5** | 3800 (loop 106) | **5 of 5 runs: 209 files, 3800 passed, exit 0** (an earlier batch of 3 is not counted: my pipeline captured neither its summary nor pnpm's exit code) | matches; **no intermittent failure in 5 runs** |
| workspace `pnpm test`, **×3** | not claimed | run 1: **269 files, 5589 passed, exit 0**. Run 2: **crashed after ~129 of 269 files** — `thread '<unnamed>' panicked at query-engine\query-engine-node-api\src\engine.rs:52:1: failed to delete napi ref`, pnpm exit 127, **no test failure reported, no result**. Run 3: **269 / 5589 passed, exit 0** | reconciles: MR-047's 5574 + 2 + 7 + 6 = 5589 (all window tests are `.test.ts`). **The crash is a finding (§2)** |
| `pnpm -r typecheck` | 0 | **exit 0**, "Scope: 11 of 12 workspace projects", 0 lines containing `error` | matches |
| `node scripts/validate-backlog.mjs` | — | **280 rows, 166 struck, 19/19 budget, clean, exit 0; open 114**; oldest open non-blocked #13 (~204 loops); median age-at-close last 10: 9 | reconciles (§2) |
| shared script, executed through the real `start.sh` (copies in scratch, local `sh`) | rejects empty/placeholder/16, accepts 32 | `start.sh` → `validate-secrets.sh`: **unset → exit 1, empty → exit 1, `short` → exit 1 ("shorter than 32"), 41 chars containing `CHANGEME` → exit 1 ("placeholder"), 44-char base64 → "Environment validated"** and proceeds | executed — **including the `$(dirname "$0")` hop and `set -e` propagation, which no test executes** (§3.2) |
| moved rule block, old vs new | "identical results" | `diff` of the BEGIN…END block in `23f7bdd^:scripts/docker-start.sh` vs `scripts/validate-secrets.sh`: **byte-identical** | holds by construction |
| `git ls-files --eol` | — | `scripts/validate-secrets.sh` and `scripts/docker-start.sh`: **`i/lf w/lf attr/text eol=lf`**; `Dockerfile` same; `.gitattributes` forces `*.sh text eol=lf` | LF everywhere it matters (§3.3) |
| contrast arithmetic (WCAG formula, node) | loop 106 ratios | §5 table | reproduces |

**Not run:** no `next build` (so no client-bundle inspection), no Docker image build, no Playwright, no
axe/public scans, no real-extension harness (no extension file changed), no dev server, no HTTP request,
no access to the VPS, its environment, its database, GitHub Actions runs, or the secret's value or
length. No `curl`/`wget`. No `git fetch` — local `origin/main` is `e1a9af5` and `main` is **12 commits
ahead** (may be stale).

**Delegation evidence.** `.claude/audit/tool-events.jsonl` (20,447 lines) still records no agent
invocation as such. What it does show is useful in the negative: the coordinator's own session wrote
`validate-secrets.sh` (heredoc, 14:32:04Z), edited `deploy.yml` and the delivery test (python,
14:32-14:35Z), and edited `signup/route.test.ts` (14:41:14Z) and `theme-contrast.test.ts` (14:45:33Z) —
but there is **no main-session write** of `admin-allowlist.ts`, `signup/route.ts` beyond two writes at
14:41:08-09Z, or the 14 product files of loop 106. Those were written by something the hook does not
see — consistent with real sub-agents, not proof. One unrecorded coordinator correction is visible:
`sed -i '299s/#047857/var(--brand-on-tint)/' globals.css` at 14:47:23Z — the agent had hardcoded the
light-theme green in `ds-tag-brand`'s border for both themes; the coordinator fixed it and the loop-106
entry does not say so. Loop 104 says "the agent ran the script matrix"; the main-session log at
14:32Z shows the coordinator writing the script itself. Attribution remains unverifiable.

---

## 1. Lead

**The window did what MR-047 asked, cleanly — and then told the CEO more than it knew. "The deploy is
safe to run again" (`SYSTEM_HEALTH`, loop 104) is true for the value GitHub holds, not for the value the
container receives; the crash-loop path is narrowed, not closed, and the step itself has never run.
Loop 105 closes the signup door but tells the CEO to verify the squat with a check that, as worded,
can miss one; and the admin addresses it protects are public in the client bundle, behind a login
throttle anyone can rotate past.**

Three things the code says that the window's summaries do not:

1. **The runner validates hop 1; the container still validates hop 2.** `deploy.yml:121-124` checks
   `secrets.NEXTAUTH_SECRET`. The container gets whatever `hostinger/deploy-on-vps@v2` makes of
   `NEXTAUTH_SECRET=${{ secrets.NEXTAUTH_SECRET }}` (`:149`) — and `deploy.yml:132-137` itself records
   that the action evaluates that block as shell (`${...}`, backticks and parentheses are interpreted;
   run 32054072270 broke on it). A base64 secret contains none of those characters, so for the
   recommended generator the two values are equal. For a hand-typed secret with `$` or a backtick they
   are not, and the in-container check (`docker-start.sh:13`) is again the only check that sees the real
   value — with `pull_policy: always` + `restart: unless-stopped` (`compose.hostinger.yaml:15,17`), an
   outage. A value saved in the Hostinger project's own settings (MR-047 §3.1) is likewise unchecked by
   the runner. Narrow, but "the two cannot diverge" (`SYSTEM_HEALTH`) is a claim about the rule, not
   the value.
2. **"Safe to run again" was written before the step ever ran.** The commit says "Not verified: the
   workflow on GitHub, the image build." The CEO-facing line drops that.
3. **The squat check, as worded, can miss.** `isAdminUnlimited` trims and lower-cases
   (`admin-allowlist.ts`), so a row stored as `Phil@Mediafier.ai` is admin. Signup stored raw casing
   until the 2026-07-09 normalisation fix (`email-normalize.ts` header), and a raw-cased row is a
   *different* unique key from `phil@mediafier.ai`. So a pre-July squat can coexist with the CEO's own
   account. "Check both admin addresses were registered by you" must be run as
   `WHERE lower(trim(email)) IN (<allowlist>)` and must return exactly one row per address — the #286
   row even says "exact lower-case account", which is the wrong test.

Nothing in the window needs reverting.

---

## 2. Q1 — Re-run the claims

All numbers reproduce (table). Pool: 113 at MR-047 + #284/#285/#286 filed at the recording = 116 →
loop 104 −1 → loop 105 −1 → loop 106 −1 +1 (#287) = **114**, as printed (280 − 166). Window: 3
closures, 1 creation (plus 3 filed at the MR-047 recording).

**Flakes — the question asked.** Web-app: 0 failures in 5 runs here, plus the coordinator's 8 after
`978cd29`. I also grepped every `not.toContain('<1-4 chars>')` in the test tree (12 hits): none asserts
against a string carrying a random id; the sync test was the only member of that class. But the
workspace run **crashed once in three** inside Prisma's native query engine (napi ref teardown panic)
with no test result. MR-047's first web-app run segfaulted in `npx` on the same Node v24.20.0. Two
reviews, two native crashes, both on the local runtime CI does not use. Not root-caused: no test file
imports `@prisma/client` or `@/db` without mocking it (grep), so something loads the engine
transitively. **What matters for the loop:** a reviewer or coordinator who runs once and sees exit 127
has no number — retry, and record the crash rather than the absence of failures. Whether CI (Node 20,
Linux) ever sees it is unknown.

**The flake's own statistic is wrong.** `978cd29`, the loop-104 entry and `SYSTEM_HEALTH` all say
"about one run in five". `uploadId` is `crypto.randomUUID()` (`sync/route.ts:120`) and appears once in
the 422 body (`:184`). A v4 UUID has 25 adjacent hex pairs that can be `e1` (version and variant
nibbles excluded), so P ≈ 1 − (255/256)²⁵ ≈ **9%, about one in eleven** (*derived*). "One in five" was
one failure in the coordinator's five runs, generalised. Harmless here, but it is an unverified
statistic that reached the CEO — §6.

---

## 3. Q2 — Loop 104: the shared script

### 3.1 Does the step run before any server-side change, with the secret only in env? Yes.

`deploy` (`deploy.yml:104`) `needs: build-and-push`; its steps are checkout (`:109`), **Validate
NEXTAUTH_SECRET** (`:121-124`, `env:` only, `run: sh scripts/validate-secrets.sh` with no `${{` in the
command), then **Deploy to Hostinger** (`:139`). No `if:`/`continue-on-error`, so a non-zero exit skips
the deploy step. The script prints the failing rule, never the value or length. The test
(`deploy-env-delivery.test.ts`, "deploy.yml validates NEXTAUTH_SECRET before the deploy step") asserts
order, env-only delivery and absence of `if:`. Sound.

What precedes it: `build-and-push` has already pushed `:latest` and `:<sha>` to the registry (`:95-96`).
That is not a server change and nothing in the repo auto-pulls (no watchtower), so it is harmless — but
"before anything changes" means "before anything on the VPS changes".

### 3.2 Is the shared script identical in behaviour? Yes — verified, not argued.

The rule block is byte-identical (diff). Behavioural deltas from moving it into a child shell, each
checked: (a) the child sees `NEXTAUTH_SECRET` only if exported — compose environment is exported, and
my run of the real `start.sh` with an env var passed confirms it; (b) `exit 1` in the child no longer
exits `start.sh` directly — `set -e` (`docker-start.sh:2`) does, verified (exit 1, "Environment
validated" never printed); (c) `$(dirname "$0")` resolves to `/app` because `CMD ["/app/start.sh"]` is
exec form (`Dockerfile:167`) and both scripts are copied to `/app` (`:109-111`); no compose file
overrides the web service's command. **Gap:** the executed tests extract the BEGIN…END block and run
*it*; none runs `start.sh` → `validate-secrets.sh`. My scratch run is the only execution of the chain.
One test that runs the real `docker-start.sh` with `NEXTAUTH_SECRET=short` up to its first exit would
lock (b) and (c).

### 3.3 Line endings — LF, by attribute, on every path that matters.

`.gitattributes`: `*.sh text eol=lf`, `Dockerfile text eol=lf`. `git ls-files --eol`: both scripts
`i/lf w/lf attr/text eol=lf`. The runner checks out on Linux (index content: LF). The image is built on
the runner from that checkout. A local Windows build would also get LF (attribute overrides
`core.autocrlf=true`). The file mode is `100644` (`23f7bdd`: "new file mode 100644"), irrelevant
because the Dockerfile `chmod +x`es it and the runner invokes it via `sh`. **No CRLF risk.** One file
in the deploy path is not attribute-protected: `compose.hostinger.yaml` is `i/lf w/mixed attr/` —
fine in the index, but a `.gitattributes` line for `*.yaml` would stop a future Windows edit from
committing CRLF into it.

### 3.4 What MR-047 asked for that did not land

- **`AUTH_SECRET` guard** (MR-047 §3.4.2: "fold into §1's fix") — not in `validate-secrets.sh`; grep
  finds no `AUTH_SECRET` handling anywhere. Latent (nothing sets it), one line.
- **`skipIf(!shAvailable && !process.env.CI)`** (§3.5) — still `describe.skipIf(!shAvailable)`
  (`deploy-env-delivery.test.ts:346-347`).
- **Umami bare `${VAR}`s** (§3.4.1) — unjustified, unflagged.

None is in a row. They were "fold into" recommendations, and the fold did not happen.

---

## 4. Q3 — Loop 105: the signup refusal

### 4.1 Indistinguishable? Yes for status, body, headers and work done.

`signup/route.ts`: email normalised (`:49`), rate-limited (`:57-63`), `findUnique` (`:64`), then
`if (existing || isAdminUnlimited(email))` returns the same `NextResponse.json({ error: 'An account
with this email already exists' }, { status: 409 })` (`:72-77`). Same constructor, same body, same
content-length; the wrapper's `x-request-id` is per-request on both. The DB lookup runs in both cases
and the allowlist check is a `Set` lookup, so the work is identical (*derived*; not timed — no server
run). The only difference an attacker could measure is the DB hit-vs-miss for an allowlisted address
with no account, which is the same as for any unregistered address answering 409 — i.e. not
distinguishable from the existing-account case it imitates.

### 4.2 Other paths to an allowlisted session — none found.

| Path | Code | Verdict |
|---|---|---|
| Credentials `authorize` | `auth.ts:35-46`: `findUserByEmailForLogin`, `compare`, returns **`user.email` from the row** | needs an existing row and its password; session email is the stored value |
| Forgot-password, no account | `forgot-password/route.ts:48-49`: no user → enumeration-safe success, **no token** | no |
| Admin reset link | `password-reset-link/route.ts:165-166`: no user → refused | no (and admin-gated) |
| Reset-password | `reset-password/route.ts:74`: `user.update` by token email — updates, never creates | no |
| Invite accept | `invites/accept/route.ts:258`: `findUnique` invitee; no create | no |
| `User.email` writers | only `admin/normalize-emails/route.ts:162` | **the loop's "no email-change feature" omits it** — admin-gated, and it can only lower-case a row that `isAdminUnlimited` already treats as admin, so no new path. But "every path that changes `User.email` was enumerated; signup was the only one" is literally false |

### 4.3 Is exporting `ADMIN_ALLOWLIST` a new exposure? No — the old one is the problem.

`admin-allowlist.ts` is imported by two `'use client'` pages (`account/page.tsx:26`,
`analytics/product/page.tsx:18`) for `isAdminUnlimited`, which closes over the `ALLOWLIST` Set — so the
two addresses are in the client bundle already (*derived*: no build was run to grep the chunk). The
export adds a name, not data.

What loop 105 changes is what that exposure is worth. With signup closed, the remaining way to an
admin session is **the admin's password**, for two addresses anyone can read from the site's JS, behind
a login throttle keyed `login:${ip}` (`auth.ts:32-33`) where the IP is the **first `X-Forwarded-For`
entry** by default (`client-ip.ts:5`, `TRUSTED_PROXY_HOPS` → 0 at `:72-78`). AUTHZ P2-2 / #225: rotate
the header, unlimited guesses. Nothing keys the login throttle on the account. This was true before
loop 105; it is now the shortest remaining path, and no row says so. **File:** a per-account login
throttle keyed on the normalised email, independent of #225's production fact. State the trade: an
attacker can then slow the admin's own logins (throttle, not lock; count failures only).

### 4.4 What the CEO is asked to check — make it the right query.

§1 item 3. And the AUTHZ audit still reads "P1-2 OPEN" (`AUTHZ_AUDIT_001.md:28,146`) — the closure,
like MR-047's retraction, did not reach the audit.

---

## 5. Q4 — Loop 106: the last shade

Ratios recomputed from the tokens in `globals.css` (WCAG relative luminance):

| Pair | Tokens | Ratio | Claim |
|---|---|---|---|
| light hover link on white | `#065F46` / `#FFFFFF` | **7.68** | — (old `brand-300` on white: **1.52**, matches the claim) |
| light hover on `--surface-primary` | `#065F46` / `#F8FAFC` | 7.34 | — |
| dark hover on primary/secondary/elevated | `#6EE7B7` / `#0D1117`, `#161B22`, `#1C2128` | 12.42 / 11.35 / 10.62 | — |
| `ds-tag-brand` dark | `#34D399` / `#0F2D27` | **7.67** | 7.67 ✓ |
| `ds-tag-brand` light | `#047857` / `#E6F5F0` | **4.88** | 4.88 ✓ — but **down from 5.21** for the old `brand-700` on `brand-50`. A light-theme regression of 0.33, still ≥ 4.5; not stated |
| chip boundary, light | border mix / `#F8FAFC` | 1.51 (fill 1.07) | tags are not controls, so SC 1.4.11 does not bind; the chip is barely visible as a shape on light surfaces |

**React Flow.** The premise "tokens resolve light there" does not hold in code: `WorkflowCanvas` paints
`!bg-white` (`WorkflowCanvas.tsx`, `Background className`) but sets no token scope, so `var(--brand-*)`
inside a canvas would resolve to the *dark* values on a white canvas in dark theme. It does not matter
for this class: **no `ds-tag-brand` is rendered inside any React Flow canvas.** None of the 8 files
using it imports `reactflow`/`@xyflow` or a `workflow-view` canvas, except `workflows/[id]/page.tsx`,
whose tag (`:374`, tool chips) is in the page header, not the canvas. Nodes carry their own opaque
per-theme `--wf-node-bg` (#255). Print: `.sop-print-root` resets `--brand-tint`/`--brand-on-tint` to
light (`globals.css:567-568`), so reports print correctly from dark mode.

**Dark pages:** the tint is opaque (`#0F2D27`), so the chip has one answer on any dark surface. Correct.

**Counts.** "Its 27 users were read": I find **25 occurrences in 8 product `.tsx` files**, identical
before and after the commit (`git grep -o`); 27 is reachable only by counting `globals.css` and the test.
The same entry opens with "counted first; the row was off by one again". Trivial — and exactly the
habit it praises.

---

## 6. Q5 — Practices

| Loop | Env-var mitigation cites delivering line | Producer-per-field | Residual class-scoped | Delegation |
|---|---|---|---|---|
| 104 | **Partly.** The commit is honest ("Not verified: the workflow on GitHub"). `SYSTEM_HEALTH` then says "the deploy is safe to run again" and "the two cannot diverge" — the delivering hop (`:149` via a shell-evaluating action, `:132-137`) is the one hop the step does not cover (§1) | n/a | "a bad secret fails the job" — true for hop 1 | claimed `devops-engineer`; main-session log shows the coordinator writing the script and workflow edit |
| 105 | n/a | **Yes** — read `authorize` and every creator rather than assuming | "self-service path to admin 1 → 0" holds; the next-shortest path (public addresses × spoofable throttle) not named | claimed `security-reviewer`; product edit not in main-session log (consistent) |
| 106 | n/a | n/a | **Yes**, class closed at every shade with guards; #287 filed for the adjacent class — the best residual statement of the window | claimed `frontend-engineer`; one coordinator fix unrecorded (§0) |

**Prose-only findings this window:** none new from the loops. **Unverified statistics that reached
the CEO:** "one run in five" (§2), "27 users" (§5). **Removed before commit:** none observed. The
practice exists; it did not fire.

**The audit-log-timestamp practice adopted at MR-047 was not used.** No loop entry cites a timestamp.
The log has them (§0); citing them costs one grep.

---

## 7. Q6 — What the window got wrong

1. **"The deploy is safe to run again"** — written before the step ran, and only for the GitHub-held
   value (§1).
2. **"One run in five"** — ~one in eleven (§2).
3. **"Every path that … changes User.email … signup was the only one"** — `normalize-emails` also does;
   harmless, but the sentence is false (§4.2).
4. **The squat check is worded as exact-match** (#286 row: "exact lower-case account") while authority
   is case-insensitive and pre-July rows kept raw case (§1.3).
5. **MR-047's fold-ins dropped silently** — `AUTH_SECRET`, CI skip, Umami (§3.4).
6. **`AUTHZ_AUDIT_001` still says P1-2 OPEN** — the third time a status change has not travelled to
   the audit (§4.4).
7. **"27 users"; the light `ds-tag-brand` ratio fell 5.21 → 4.88 unstated; the coordinator's border fix
   unrecorded** (§5, §0).
8. **Nothing to revert.** All three loops are correct as built.

---

## 8. Q7 — Next pick (loop 107)

Pool 114 > 8 → `burn-down`. Last five Areas: 102 infra/monitoring, 103 web-app/security, 104
infra/deploy, 105 security/authz, 106 web-app/a11y. No literal Area string repeats 3 of 5; under a
prefix reading, security = 2 (103, 105) and infra = 2 (102, 104). **No saturation penalty applies to
any candidate at loop 107.** (If loop 107 is security, a security pick at 108 would carry it.)

| Candidate | Score | Notes |
|---|---|---|
| **#285** reset links logged with no provider; Resend has no timeout; deadline does not abort | **11** | Filed by MR-047; follow-up pool; repo-side; secrets-in-logs class. Production likely on SMTP, so dormant — but #281 says nobody has observed that. Fix (1) first: in production the console fallback logs only "send skipped". Bound Resend with `AbortSignal.timeout`. Call (2) "may be both" in the copy rather than aborting nodemailer mid-send |
| **New: per-account login throttle** (AUTHZ P2-2, repo-side half) | I4 A5 L3 C4 E2 R2 = **12** | Not a row yet. Promote via audit-intake path 1 (the slot #286 opened). The shortest remaining path to admin (§4.3). Loop 108 |
| #277 | 11 | the misleading `isAdmin` badge matters more now that admin is allowlist-only; good loop-109 candidate |
| #273 | 11 | CEO-bound (production counts) |
| #283 | 11 | blocked on the CEO |
| #282, #278, #249-#252 | 10 | #282 should reconcile 207-vs-200 (MR-047 §4.1) |
| #287, #268 | 9 | #287 just filed; a11y was 106 |
| #275, #270, #265 | 8 | #275 small and well-specified |
| AUTHZ P2-3 (`teams/route.ts:30` `status: 'active'`) | — | one line; cold; bundle-worthy with nothing |
| AUTHZ P2-5 (analytics ingestion trusts body `userId`, no rate limit) | — | feeds admin dashboards; a better promotion than P2-3 after the login throttle |

**Pick: #285.** Then file and run the per-account login throttle at 108. If the CEO says production
has no email provider configured (i.e. #281 observed the console fallback), #285 is live, not dormant,
and its score rises.

---

## 9. Pattern — what this window adds

1. **A check is about a value at a place.** Loop 104 checks the right rule at the wrong hop for one
   class of value. "Same rules" ≠ "same value". The general form of MR-045/46/47's lesson: name the hop
   a check observes.
2. **Closing the shortest path promotes the next one.** Loop 105's residual statement was correct for
   its class (self-service) and silent about what the class's closure made primary (password guessing
   on public addresses). When a path to a privilege closes, name the next-shortest path in the entry.
3. **Statistics generalise from n=5.** "One in five" and "27" are small, and are exactly the kind the
   coordinator promised to strip before commit.
4. **Fold-ins evaporate.** "Fold into §1's fix" produced nothing three times. A recommendation that is
   not a row and not in the row being worked does not happen. Either put it in the row text or file it.

No new rule. Two clarifications: (a) a recommendation from a meta-review that is meant to ride with a
fix is copied into that row's Fix text at recording time; (b) a CEO-facing "safe" sentence carries the
"not verified" clause of the commit it summarises.

---

## 10. Q8 — CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **Is the deploy safe to run now?** | **Safer, not proven.** | A missing/short/placeholder GitHub secret now fails the job before the VPS is touched (*derived* from `deploy.yml:104-139`; the step has never run). Residual: a secret with `$`, backticks or `(` is altered by the Hostinger action's shell (`deploy.yml:132-137`) after the check — use a base64 secret. **The next push ships 12 commits (loops 99-106)** if `origin/main` is current. Watch the Validate step's log on that run |
| **Allowlisted accounts existed before anyone else could register** | **Needs the right query** | Run `SELECT id, email, createdAt FROM User WHERE lower(trim(email)) IN ('…','…')` — expect exactly one row per address, created by you. A raw-cased duplicate from before 2026-07-09 is admin too (§1.3) |
| **Prod `isAdmin` users** | Still open | Powerless since loop 98; still the only evidence of whether bootstrap was used |
| **Login throttle on the admin addresses** (new) | Needs a decision on the trade | Addresses are public in the client JS; login throttle is per-IP and spoofable until #225 is set. A per-account throttle lets an attacker slow your own logins. Approve? |
| **Undelivered variable values** (`DEMO_MODE_DISABLE_TEAMS`, `NEXTAUTH_SESSION_MAXAGE`) | Unchanged | Production: teams on, 7-day sessions (*derived*) |
| **#281** delivery test | Unchanged, now cleaner | First deploy: Validate passes → compose `:?` refusal means hop 2 failed; start means a value exists. Better observation: does the container log contain "(no provider configured"? (also settles #285's liveness) |
| **#12** schema step fails quiet | Blocked on you | Unchanged |
| **#271** extension session-id filter | Needs approval | Unchanged |
| **#283** source maps + stack-trace error page | Blocked on you | Is the hydration investigation done? |
| **Alerts (#256/#263/#266/#282)** | Repo side done; not live | Arrival unproven (#281); quiet-hour gap #282 |
| **#225** `TRUSTED_PROXY_HOPS` | Defaults `0` | Now load-bearing for admin login (§4.3) |
| **#216** extension untouched | 63 loops | Unchanged |
| **#57**, **#212**, **#190/#193**, **#191** | Unchanged | — |

---

## 11. Verdict

Every number reproduces at `78d9e38`: web-app 3800 five times running, workspace 5589 twice of three
(the third a Prisma native crash with no result, on a local Node CI does not use), typecheck 0,
validator clean at 114 open. The shared script is byte-identical to the block it replaced, executes
correctly through the real start script, and is LF by attribute. The signup refusal is
indistinguishable from the case it imitates and there is no other creation path. The last pale shade
is gone and its ratios are right; no `ds-tag-brand` sits inside a React Flow canvas.

The window's error is smaller than MR-047's and of the same family: summaries that outrun the code.
Do next: #285 (loop 107); file and run a per-account login throttle (loop 108); give the CEO the
case-insensitive squat query; amend "safe to run again" to say what was and was not verified; correct
"one in five" and "27"; update `AUTHZ_AUDIT_001` P1-2 to fixed; copy the three MR-047 fold-ins into a
row.
