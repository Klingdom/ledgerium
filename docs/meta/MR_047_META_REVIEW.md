# MR-047 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 101-103 plus one Mode 3-adjacent amendment, 2026-10-02. Commits `6700fb5` (loop 101,
#280), `00f4120` (AUTHZ_AUDIT_001 amended by its author), `401b0b9` (loop 102, #266), `8c09dcd`
(loop 103, #267). Rows filed in the window: #281, #282, #283.
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md`. Everything below
that needs a row, a strike, a fix or a correction is a recommendation.

**Where the checks ran.** In the main checkout at `8c09dcd`. `git status --short -- apps packages
scripts compose.hostinger.yaml .github` is empty; the only working-tree changes are `.claude/*` and an
untracked `data/`, neither of which any check reads.

**Validation run for this review — all executed at `8c09dcd`, none inferred:**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `cd apps/web-app && vitest run` | 3785 (loop 103) | **First attempt (`npx vitest run`): Node segfault in the npx wrapper, exit 139, mid-run — no test result.** Second attempt (`pnpm exec vitest run`): **209 files, 3785 passed, exit 0** | matches (crash was the local Node v24.20.0 / npx process, not a test; CI runs Node 20) |
| workspace `pnpm test` | not claimed in window | **269 files, 5574 passed, exit 0**, first attempt | reconciles: MR-046's 5538 + 8 + 10 + 18 (all three loops' new tests are `.test.ts`) = 5574; +1 file (`email-test/route.test.ts`) |
| `pnpm -r typecheck` | 0 | **exit 0**; "Scope: 11 of 12 workspace projects"; 0 lines containing `error` | matches |
| `node scripts/validate-backlog.mjs` | — | **276 rows, 163 struck, 19/19 budget, clean, exit 0; open 113; oldest open non-blocked #13, birth iter 001 (inferred, by position), ~201 loops; median age-at-close last 10: 9 loops** | reconciles (§2) |
| `deploy-env-delivery.test.ts` verbose | 11-case startup matrix executed | **17 passed**, including all three "docker-start.sh … (executed)" tests (local `sh` from Git) | executed here, not skipped |
| `docker compose -f compose.hostinger.yaml config` (copy in scratch dir) | refuses without the secret | **unset → exit 1, empty → exit 1** ("required variable NEXTAUTH_SECRET is missing a value"); **`NEXTAUTH_SECRET=short` → exit 0**, renders `NEXTAUTH_SECRET: short` | `:?` behaves as claimed; a short value passes compose (§3.2) |

**Not run:** no `next build`, no Playwright, no real-extension harness (no extension file changed), no
dev server, no HTTP request to any route, no access to the VPS, its environment or database, the
Hostinger action's source, or the GitHub secret's value or length. No `curl`/`wget` (deny-listed; not
worked around). No `git fetch` — the remote-tracking ref below may be stale.

**Delegation evidence — better than last window, still not attribution.** `.claude/audit/tool-events.jsonl`
records no agent invocations (0 `subagent`/`Task` events in 20,172 lines), so *who* ran what is still
unverifiable. But the commands loop 101 claims are in the log: `gh secret list | awk '{print $1}'` at
14:04Z and two `docker compose -f compose.hostinger.yaml config` runs with `env -u NEXTAUTH_SECRET` at
14:06Z, four minutes before `6700fb5`. The checks happened; the log cannot say by whom.

---

## 1. Lead

**Loop 101 closed the public-default hole correctly, and in doing so turned the next deploy into a
two-way test whose second failure mode nobody stated: if the production secret is delivered but is
shorter than 32 characters (or contains a listed substring), the new container replaces the old one
and crash-loops — an outage, not a refused deploy. Nobody has checked the length; `gh secret list`
cannot show it. And the "not live" verdict that framed the whole loop rests on an inference MR-046
had already rejected.**

The two failure modes, every link read from code or run here:

| Production secret | Where it fails | What the site does | Who sees it |
|---|---|---|---|
| missing or empty on the VPS | `docker compose` interpolation (`compose.hostinger.yaml:32`, `:?`) — verified exit 1 here, before any container is touched | **old container keeps serving** (*derived*: interpolation fails before `up` acts) | the Hostinger action's output, if it surfaces compose errors — unevidenced |
| delivered, < 32 chars, or containing `changeme`/`placeholder`/… | `docker-start.sh:36` (or the placeholder loop `:26-34`), *inside the new container* — compose accepts it (verified: `short` renders) | `pull_policy: always` + `up` replace the old container; `start.sh` exits 1; `restart: unless-stopped` (`:17`) → **crash loop, site down**; HEALTHCHECK (`Dockerfile:163`) fails | container logs on the VPS only |

`SYSTEM_HEALTH` (loop 101) tells the CEO "if it starts, secrets are reaching the app; if it refuses
with 'NEXTAUTH_SECRET must be set', the deploy action is not delivering variables". The third outcome —
the site goes down with "shorter than 32 characters" in a log nobody is watching — is not in it.

**And the deploy will not be one change.** The local `origin/main` ref is at `e1a9af5` (loop 98);
`main` is 7 commits ahead (not fetched — may be stale, but every window entry speaks of "the next
deploy" in the future tense). The first push ships loops 99-103 and this risk together.

**"Not live" is an inference, not an observation.** The MR-046 recording (`ITERATION_LOG.md:60`) says:
"`gh secret list` shows `NEXTAUTH_SECRET` exists … The value is real today. Applying MR-045's practice:
the delivering line is `compose.hostinger.yaml:29`, which forwards it — so the real value arrives."
That is hop 1 (GitHub) plus hop 3 (compose); MR-046 §5.2 said hop 2 (Hostinger → compose) has no
observation in the repo, and the *same entry*, three bullets later, says so too. The inference then
propagated as fact: `6700fb5` ("Not live: the GitHub secret exists"), the #280 row ("Not live today"),
`CHANGELOG` ("not believed to have been in effect"). Loop 101's own log states the risk correctly
("if it does not, production has been signing with `change-me`"). The commit message and the row
should match the log.

**Fix, small, repo-side, no production access needed:** a step in `deploy.yml` *before* the Hostinger
action that reads `secrets.NEXTAUTH_SECRET` into an env var and fails the job if it is empty, under 32
characters or contains a listed placeholder — never printing it (the length test needs no echo). That
moves the crash-loop case to the runner (no deploy at all) and leaves exactly one way for the VPS to
refuse: non-delivery. Then the first deploy really is #281's clean test.

---

## 2. Q1 — Re-run the claims

All reproduce (table). Pool: 113 at the MR-046 recording (112 + #280) → loop 101 −1 +1 (#280/#281) →
loop 102 −1 +1 (#266/#282) → loop 103 −1 +1 (#267/#283) → **113**, as the validator prints (276 − 163).
Window: 3 closures, 3 creations, ratio 1.0.

**Fixed since MR-046:** #13's birth is now set (inferred by position, labelled) — asked for at MR-045
and MR-046, done at the MR-046 recording. The validator's "age not datable" line is gone.

**One environment note, not a finding:** the first web-app run segfaulted inside `npx` on Node
v24.20.0. CI pins Node 20 (`deploy.yml:27`). A reviewer who saw only the first run would have had no
number; it is recorded here so the next one retries rather than reports.

---

## 3. Q2 — Loop 101: the required secret

### 3.1 Is `${NEXTAUTH_SECRET:?…}` the right mechanism? Yes — for the case it covers.

Verified here: compose refuses unset and empty alike, with the message, at interpolation. It is the
only mechanism that fails *before* a container is replaced, which makes it the safest place to catch
non-delivery. All four compose files now use `:?` for this variable (`compose.yaml:32`,
`compose.hostinger.yaml:32`, `compose.hostinger-deploy.yaml:17`, `hostinger-paste.yaml:17`).

What it depends on and cannot know: whether Hostinger runs `docker compose` with the block in its
environment at all (#281), and whether the action fails the GitHub job when compose exits 1. A Hostinger
project that once had `NEXTAUTH_SECRET` saved in its own settings would also make the deploy start —
so "it started" proves a value exists on the VPS, not that *this deploy's block* delivered it. #281's
"confirm the first deploy starts" is weaker evidence than it reads; the presence check on the live
container's environment (#281's second option) is the better observation, and still not proof of the
block either. Say which one was used.

### 3.2 Could it produce an unsafe deploy state? Yes — the length/placeholder path (§1).

The `:?` path is safe (old container kept, *derived*). The `docker-start.sh` path is not: compose accepts
any non-empty value (verified with `short`), so a too-short real secret replaces the running container
and crash-loops. That trade was never stated. The production secret was set by a person, possibly long
before the 32-char rule; nobody in the window has looked at its length.

### 3.3 Is the placeholder list over-broad? No — negligible, and here is the number.

`docker-start.sh:16` matches substrings case-insensitively. `openssl rand -base64 32` (the recommended
generator) emits no `-` or `_`, so `change-me`, `change_me`, `replace-me`, `your-secret`,
`build-time-placeholder` and the dev default cannot occur. Only `changeme` (8) and `placeholder` (11)
can, and after lowercasing each position matches with probability 2/64: about 37 × 32⁻⁸ ≈ 3×10⁻¹¹ and
34 × 32⁻¹¹ ≈ 10⁻¹⁵ per 44-char secret. A hex secret cannot contain either word. Negligible.

### 3.4 Does the startup check cover other secrets that should be required?

`NEXTAUTH_SECRET` is the right sole hard requirement: it signs sessions and keys the ops token
(`email-test/route.ts:31`, `normalize-emails/route.ts:46`, `password-reset-link/route.ts:81`). The others
degrade visibly (`CRON_SECRET` → 503; Stripe → 503/500). Two gaps in the claim "every secret in every
compose file enumerated, the others keep empty defaults":

1. **`UMAMI_APP_SECRET` and `UMAMI_DB_PASSWORD` have no default form at all** (bare `${VAR}`,
   `compose.hostinger.yaml` umami / umami-db services). Compose renders them empty with a warning; the
   new `findSecretFallbacks` (`deploy-env-delivery.test.ts:248-262`) only inspects `:-`/`-` defaults, so
   it neither flags nor justifies them. Their readers are third-party images; what each does on empty is
   not evidenced in the repo. Not a public default — but "each justified by its reader" is not true of
   these two.
2. **`AUTH_SECRET` is unguarded.** NextAuth reads `AUTH_SECRET` *before* `NEXTAUTH_SECRET`
   (`next-auth/lib/env.js:22`, MR-046 §1). Nothing in the repo sets it (grep), so this is latent: if it
   were ever set on the host, `start.sh` would validate a variable that is not the signing key, and the
   ops token (which reads `NEXTAUTH_SECRET` directly) would diverge from the session key. One line in
   the validation block — fail if `AUTH_SECRET` is set — closes it. Not a row on its own; fold into §1's fix.

### 3.5 Does CI actually execute the block?

*Derived:* the quality gate runs root `pnpm test` on `ubuntu-latest` (`deploy.yml:16,44`); the root
config includes `apps/*/src/**/*.test.ts`, so `deploy-env-delivery.test.ts` runs and `sh` exists there.
Executed here locally (17/17). **Weakness:** `describe.skipIf(!shAvailable)` (`:314-315`) turns a missing
`sh` into a silent skip — the same vacuity this programme has guarded against elsewhere. In CI it should
fail, not skip (`skipIf(!shAvailable && !process.env.CI)`). Cosmetic today; worth one line.

---

## 4. Q3 — Loop 102: 207, SMTP deadline

### 4.1 Is 207 sound?

**Operationally, yes.** The only consumer is `.github/scripts/alerts-check.sh`, which reads the status
code without `--fail` and maps 207 → exit 6 (`:63`) *before* the generic `!= 200` branch. Caching: the
request carries `Authorization`, which RFC 9111 §3.5 forbids a shared cache to store without explicit
permission, and 207 is not heuristically cacheable; the route sets no `Cache-Control`. No CDN or proxy
config exists in the repo (MR-046 found the same), so "nothing in front rewrites 207" is *derived*,
not observed. Standard reverse proxies pass 2xx codes through.

**Semantically, it is a borrowing.** 207 is WebDAV Multi-Status with a `multistatus` XML body; this is a
JSON counts body. Harmless for a private machine consumer, and documented in the route header. One
inconsistency the window created: the manual send (`admin/alerts/route.ts:144`) answers **200** for the
same partial condition that `alerts/check` answers **207** (`check/route.ts:152-161`). Both are
documented, but two sibling routes now spell one state two ways. Pick one when #282 touches them.

The manual send's response contract changed (`sent` removed). The only in-repo fetch of
`/api/admin/alerts` is a GET (`analytics/product/page.tsx:274`), so no consumer broke.

### 4.2 Does the 20 s deadline leak?

**Bounded, not leaked — but the loser keeps running and can still deliver.** `email.ts:110` races
`sendMail` against a timer and `finally` clears the timer. Nothing aborts the send. The transporter is
not pooled, so the orphaned send holds one connection until nodemailer's own socket timeout (10 s
inactivity) or completion; `Promise.race` subscribes to both promises, so a late rejection is handled,
not unhandled. The real consequence is semantic: **a slow-but-alive server can deliver the email after
the caller has recorded failure.** For alerts that means a channel counted failed (→ 207) that actually
delivered; for password reset it means the operator sees "email delivery failed" and may mint a second
link while the first arrives. Rare, honest enough — but "a hung mail server is a failed channel" should
read "a slow one may be both".

### 4.3 Is password-reset behaviour changed visibly?

No. `forgot-password/route.ts` always returns the enumeration-safe success body; the deadline only caps
latency at ~20 s and logs failure server-side. **But the claim "password-reset email can no longer
hang" (commit, CHANGELOG) is true only under SMTP.** `sendViaResend` (`email.ts:125-127`) is a bare
`fetch` with no timeout or `AbortSignal`. The class the loop named — "a hung mail provider" — has two
members; one was bounded. And `runEmailDiagnostic` calls `transporter.verify()` + `sendMail` directly
(`:255`), outside the 20 s deadline.

### 4.4 Found at the edge, not in any row

With **no provider configured**, `sendEmail` logs the full HTML body (`email.ts:284-286`) — for password
reset that is the reset URL with the raw token, in container stdout. `forgot-password/route.ts:100` says
"Never log the raw token/resetUrl". Whether production is on the console fallback depends on
`SMTP_PASSWORD` reaching the container — which is #281's open question. So if delivery is broken, reset
tokens are in the logs *and* users are told the email was sent. File it (one row; class: secrets in
log lines), and it gives #281 a second cheap observation: does the container log contain
"(no provider configured"?

---

## 5. Q4 — Loop 103: `classifyEmailError` and the guard

**`classifyEmailError` reads no text — verified.** `email.ts:196-213` reads `code`, `responseCode`,
`errno` only; `EMAIL_ERROR_MESSAGES` interpolates nothing. The only text-bearing path is the
`console.error` of the raw error, a log. The response still echoes caller-supplied `to` and the SMTP
user/host config — operator-facing, admin-gated, not transport text.

**The guard is sound and non-vacuous.** It scans every `route.ts` under `app/` (> 70) and every non-test
file under `lib/` (> 30), collects every catch binding by name, flags `.message`/`.stack` on anything,
and has mutation fixtures plus a regression that puts the old `lib/email.ts` line back and expects one
hit. Exact allowlist with a stale-entry test.

**Its stated limits, checked against the current tree — no live instance falls through:**

| Limit | Search | Found |
|---|---|---|
| destructured `message` | `{ … message … } = err/error/e` | none |
| split lines (`err\n.message`) | lines beginning `.message`/`.stack` | none |
| raw error under another key | `<key>: err/error/e` with keys outside the six | one hit, `variantFlowModel.ts:210` (`e` is an index) — false positive |
| server actions | `'use server'` | none |
| components/pages | `error.message` in `.tsx` | client-side only (state set in the caller's browser), plus `global-error.tsx:75,83` |

The one place the limit's *rationale* is weaker than stated is `global-error.tsx`: it renders
`error.message` and `error.stack`, with `productionBrowserSourceMaps: true` (`next.config.js:6`). It
renders in the caller's own browser, so it is not a cross-user leak — but it is exactly #283, and the
guard's comment ("those render in the caller's own browser or never reach a response body") should cite
#283 as the known exception rather than imply there is none.

---

## 6. Q5 — Governance: the AUTHZ amendment

**The amendment is good work and mostly holds.** P1-3 re-graded P1 with reasons; P1-1/P1-2 stated as
conditional P0 with the query that would promote them; per-finding status verified against the tree
(I checked P2-3: `teams/route.ts:30-31` still selects by `userId` only, `:36-37` filters the nested
list — the amendment's description is exact). It says plainly that nothing was run.

**Three reservations:**

1. **The definitions were written after the dispute they settle, at the request of the party they
   overrule.** That is the MR-045 practice working as intended, but the reader should know it. The
   rubric is precondition-based, and "blast radius one team" is bolted onto P1 as a precondition. The
   result: P1 now spans "one team loses its owner" and "any account taken over" (P1-2). The auditor
   says P1-2's standing "raises its priority, not its grade" — i.e. **the grade no longer orders work.**
   Selection should cite score and impact, not grade. Say so once.
2. **Attribution is the commit's, not the auditor's.** `00f4120`'s message is in the coordinator's voice
   ("My intake re-grade … is not upheld"); the doc says "amended by the original auditor". The audit log
   cannot show an agent ran (§0). Probably true; unverifiable — the same state as every delegation since
   MR-042.
3. **The retraction did not reach every place the P0 claim lives:**

| Place | Text today | Status |
|---|---|---|
| `AUTHZ_AUDIT_001.md:100`, amendment log | P1, intake re-grade not upheld | **correct** |
| `ITERATION_LOG.md:35` | "My intake re-grade is not upheld" | **correct** (`:138`, the original intake entry, is history; corrected by `:35`) |
| `IMPROVEMENT_BACKLOG.md:266` (#274, struck) | "**re-graded to P0 at intake on coordinator verification** (the audit's own P0 definition: exploitable escalation; this one has no mitigating condition)"; provenance cell notes only that the *mechanism* was rejected | **stale** — cites a definition that did not exist and a "no mitigating condition" the auditor rejects (a granted admin role is the condition) |
| `SYSTEM_HEALTH.md:24` | "**One promoted live, re-graded P0 on verification: #274**" | **stale** — the same line's bootstrap claim was struck in place at MR-045; this one was not. The line's advice "keep `DISABLE_ADMIN_BOOTSTRAP` unset or `true`" is also moot since loop 98 (bootstrap answers 410) |
| `CHANGELOG.md` | no P0 claim for P1-3 | clean |

Correct both in place, MR-045 style: strike, "corrected at MR-047: auditor grade P1".

---

## 7. Q6 — Practices

| Loop | Env-var mitigation cites the delivering line | Producer-per-field | Residual class-scoped | Delegation |
|---|---|---|---|---|
| 101 | **Cited, and misused as proof.** `compose.hostinger.yaml:29` was cited (MR-046 recording) to conclude "the real value arrives" — hop 3 standing in for hop 2 (§1). The new code itself is excellent on MR-046's extension: the value-when-absent is now "refuse to start" | n/a | "every secret enumerated" — two bare `${VAR}` not justified (§3.4) | `devops-engineer` — claimed; its commands are in the audit log |
| 102 | n/a | n/a | "five invisible delivery failures → 0" — the hung-provider class has a second member (Resend) left open (§4.3) | `backend-engineer` — claimed |
| 103 | n/a | **Yes — the best instance yet.** Read nodemailer's `_formatError` to establish what the message contains, rather than assuming | Yes, and the guard's limits are written down (§5) | `security-reviewer` — claimed |

**Prose-only findings this window:** the third deploy outcome (§1); Resend unbounded (§4.3); console
fallback logs reset tokens (§4.4). Each needs a row or a line in an existing one.

**Agent-output quoting practice:** undecided for a **sixth** window. This review found the audit log
does record the *commands* (§0) — which partly answers the question the practice was meant to answer.
Proposal: strike the quoting practice and replace it with "a loop that claims an agent ran X cites the
audit-log timestamp of X". Cheaper, mechanical, and verifiable.

---

## 8. Q7 — What the window got wrong

1. **"Not live"** (MR-046 recording `ITERATION_LOG.md:60`, `6700fb5`, #280 row, CHANGELOG): inferred
   from GitHub-side existence plus the compose line; hop 2 unobserved. Loop 101's log is right; the
   others overstate it.
2. **The deploy test has three outcomes, and the CEO was told two** (`SYSTEM_HEALTH`, loop 101). The
   unstated one is an outage (§1).
3. **"Password-reset email can no longer hang"** (commit `401b0b9`, CHANGELOG, log): SMTP only (§4.3).
4. **"Every secret … the others keep empty defaults, each justified by its reader"**: two Umami
   variables have no default form and no justification (§3.4).
5. **The P0 retraction** is in the audit and the log but not in the #274 row or `SYSTEM_HEALTH:24` (§6).
6. **"Amended by the original auditor"** — plausible, unverifiable, and the commit is in the
   coordinator's voice (§6).
7. **Nothing to revert.** All three loops are correct as built; loop 101 needs one pre-flight step to be
   safe to ship.

---

## 9. Q8 — Next pick (loop 104)

Pool 113 > 8 → `burn-down`. Last five Areas: 99 infra/deploy, 100 web-app/a11y, 101 security/deploy,
102 infra/monitoring, 103 web-app/security. No literal Area value repeats 3 of 5; no penalty applies to
any candidate below.

| Candidate | Score | Notes |
|---|---|---|
| **#281, repo-side half: deploy pre-flight for `NEXTAUTH_SECRET`** | I5 A5 L3 C5 E1 R1 = **15** | A `deploy.yml` step before the Hostinger action: fail if the secret is empty, < 32 chars or contains a listed placeholder (read the list from `docker-start.sh` so they cannot drift); never echo it. Add `AUTH_SECRET`-is-set to the start-up block. **Must land before the next push of `main`.** Makes #281's first deploy a clean delivery test. Burn-down without a label question: #281 is a loop-101 follow-up; amend its row to split repo-side (this) from ops-side (the observation) |
| **AUTHZ P1-2 — promote now** | I5 A5 L3 C4 E2 R2 = **13** | Promotion path: Audit-Intake clause 4 — #274 and #276, both live rows derived from this audit, have closed, so a slot exists; P1-2 is the highest remaining cold item. State the irony: the slot was opened partly by a P0 grade since retracted; P1-2 earns it on impact. **Fix needs no production fact:** `signup/route.ts` is the only `User` creator (grep: `db.user.create` at `:82` only; `normalize-emails` is admin-only), so refusing self-registration of an allowlisted address closes the class *self-service path to admin: 1 → 0* regardless of the unanswered CEO query. Cost if an allowlisted person has no account: they cannot self-register — recoverable, versus account takeover. **Loop 105** |
| #277 | 11 | badge, dead code, docs — solid; no urgency |
| #273 | 11 | CEO-bound (production counts) |
| #283 | 11 | blocked on the CEO |
| #278, #279, #282, #249-#252 | 10 | #282 should also reconcile 207-vs-200 (§4.1) |
| #268 | 9 | — |
| #275, #270, #265 | 8 | #275 is small and well-specified |
| AUTHZ P2-3 | — | one-line `status: 'active'` on `teams/route.ts:31`; still cold (intake ~loop 96, clause-7 age 10 not met until ~106). Bundle with P1-2? No — different Area of harm; keep one outcome per loop |

**Pick: #281's repo-side pre-flight**, then P1-2 at loop 105. If the CEO instead confirms the secret is
≥ 32 characters, has no listed substring, and `AUTH_SECRET` is unset on the host before the next push,
the pre-flight drops to an ordinary 11 and P1-2 goes first.

---

## 10. Pattern — what this window adds

1. **A guard that fails inside the container is an outage switch.** Startup validation is correct; its
   failure mode is the site going down. Anything that can be checked before the container is replaced
   (compose `:?`, a runner step) should be, and the in-container check should be the backstop.
2. **A practice cited is not a practice applied.** "Cite the delivering line" was cited to reach exactly
   the conclusion the practice exists to block. MR-046 §10 said a default is a delivery; this window
   shows a *line* is not a delivery either — only an observation is.
3. **Stated limits are worth checking.** Loop 103 wrote its guard's limits down; checking them took ten
   minutes and found none live. That is what makes a limit a statement instead of a hedge.
4. **Retractions travel less far than claims.** The P0 claim went to four places; the retraction to two.

No new rule. One clarification for the CEO: a loop whose fix can fail at deploy time states **every**
deploy-time outcome in the CEO-facing summary, including the one that takes the site down.

---

## 11. Q9 — CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **`NEXTAUTH_SECRET` length and content (new, before the next push)** | Needs a check | Is it ≥ 32 characters, free of `changeme`/`placeholder`, and is `AUTH_SECRET` unset on the host? If not, the next deploy takes the site down (§1). Or approve the pre-flight (§9) and let the runner refuse instead |
| **#281 first deploy as the delivery test** | Ready once the above is settled | Watch it: compose refusal = not delivered; start = a value exists on the VPS (not proof the block delivered it, §3.1). Better: presence (not value) of one block-only variable in the live container, or whether logs show "(no provider configured" (§4.4) |
| **#283 source maps + stack-trace error page** | Blocked on you | Confirmed: `next.config.js:6`, `global-error.tsx:75,83`. Is the hydration investigation done? |
| **Production `isAdmin` users** | Still open | Powerless since loop 98; still the only evidence of whether bootstrap was ever used |
| **Allowlisted accounts (P1-2)** | Still open; less load-bearing after §9 | The loop-105 fix closes the path without this answer. The answer still says whether it was ever used |
| **Undelivered variable values** (`DEMO_MODE_DISABLE_TEAMS`, `NEXTAUTH_SESSION_MAXAGE`) | Unchanged | Production today: teams on, 7-day sessions (*derived*) |
| **#12** schema step fails quiet | Blocked on you | Unchanged; same family as §10.1 |
| **#271** extension session-id filter | Needs approval | Unchanged |
| **Alerts (#256/#263/#266)** | Repo side done; not live | Now fails on partial delivery too; arrival still unproven (#281); quiet-hour gap #282 |
| **Agent-output quoting practice** | Sixth window | Proposal: replace with "cite the audit-log timestamp" (§7) |
| **#225** `TRUSTED_PROXY_HOPS` | Defaults `0` | Unchanged |
| **#216** extension untouched | 60 loops | Unchanged |
| **#57**, **#212**, **#190/#193**, **#191** | Unchanged | — |

---

## 12. Verdict

Every number reproduces at `8c09dcd` (web-app on the second attempt, after a local Node crash that
produced no result). Nothing in loops 101-103 needs reverting: the secret can no longer default to a
public string, a decayed alert channel now fails the job, and the email diagnostic returns codes chosen
from structured fields — read from the library, not assumed.

The window's error is the one MR-045 and MR-046 named, now in its third form: a conclusion about
production drawn from files. "Not live" was inferred; the deploy test was described with two outcomes
when it has three, and the third is an outage. Do first: settle the secret's length (or add the
runner pre-flight) **before the next push**; then P1-2's signup refusal; correct the #274 row and
`SYSTEM_HEALTH:24` in place; file the Resend timeout and the console-fallback token log.
