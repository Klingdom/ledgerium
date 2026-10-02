# MR-058 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 134-136, 2026-10-02. Commits `2b0b675` (loop 134, #322), `892aa65` (loop 135, #321),
`36a8a84` (loop 136, #273 non-destructive part). Rows filed in the window: none (#321 and #322 were filed
by MR-057). Rows closed: #322, #321. #273 is still open (blocked on the CEO).
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md` or any audit.
Everything below that needs a row, a strike, a fix or a correction is a recommendation.

**Where the checks ran.** Main checkout at `36a8a84`. The working tree differs from HEAD only in `.claude/*`
and an untracked `data/`, which no check reads. `git status --short` was identical before and after every
run. Local Node v24.20.0, pnpm 10.32.1, Windows. Scratch fixtures lived in the session scratchpad. Local
`origin/main` is `e1a9af5`. `main` is **54 commits ahead** (`git rev-list --count origin/main..main`), or
55 once this review is committed. The brief's "~55" is right.

**Validation run for this review. Every check below was executed at `36a8a84`; none is inferred. Verdict =
exit code + ANSI-stripped summary line.**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `apps/web-app`: `pnpm exec vitest run`, **×3** | 4155 | **3 of 3: 228 files, 4155 passed, exit 0** | matches |
| root `pnpm test`, **×2** | 5930 | **2 of 2: 285 files, 5930 passed, exit 0** | matches |
| `pnpm -r typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | clean | **exit 0**: 315 rows, 196 struck, 14/14 baselined, **open 119**, "V4: parsed 114 closure claim(s)" | matches |
| `VALIDATE_BACKLOG_V4_SABOTAGE=1 node scripts/validate-backlog.mjs` | non-zero | **exit 1**, "V4 canary failed: V4 matched nothing…" | matches |
| `node --test scripts/*.test.mjs` (both files) | 27 pass | **tests 27, pass 27, fail 0, exit 0** | matches |
| `node scripts/check-typecheck-coverage.mjs` | 0 | **exit 0**, "pnpm 10.32.1; 11 workspace packages checked" | matches |
| Coverage script, no pnpm on `PATH` | non-zero | **exit 1**: version guard fires, and `pnpm -r ls` fails "not recognized" | correct |
| Coverage script, `CHECK_TYPECHECK_PACKAGES_JSON` = `not json` / `[]` / `null` / `{}` / nonexistent path | non-zero | **exit 1 in all five**. `{}` and `null` exit through an **uncaught TypeError** at `check-typecheck-coverage.mjs:65`, not through the intended message | fails loudly; message unclear |
| `pnpm exec tsx scripts/count-invalid-invites.ts` (local dev DB) | read-only, counts | **exit 0**, all four counts 0, no PII | matches |

Every run printed a `[stripe] … SQLITE_BUSY` line to stderr. That noise is pre-existing and did not
affect any exit code.

**Not run:** Linux, Node 20, a GitHub runner, `next build`, Docker, Playwright, any browser or screen reader,
any HTTP request, and the count script against production. Production cannot be reached from here, and
§2.4 shows the documented production invocation does not work as written anyway. No `curl` or `wget`.

---

## 1. Lead

**Every count reproduces, and nothing needs reverting.** The acceptance refactor in loop 136 is byte-identical. The
coverage guard now fails on zero packages, non-JSON output and a missing pnpm. The sabotage switch
proves the fixture canary.

**The window repeats the pattern from the last three reviews: each fix stops one step short of the full
scope.** This time one of the misses is a new defect, not an unfixed old one:

1. **Loop 136 hid refused invites from the only screen that can revoke them, but they still hold a seat
   and still block a re-invite.** `GET …/invite` now omits them (`invite/route.ts:316-336`). But
   `countPendingInvites` (`lib/workspace/seat-management.ts:144-152`, used at `invite/route.ts:210`) and the
   duplicate-pending guard (`invite/route.ts:145-156`) still count them. An owner who re-invites that person
   gets "An invite is already pending for this email address" for an invite they cannot see. The 409 does
   return an `inviteId`, but the teams page never reads it. This lasts up to 7 days (`invite/route.ts:190`).
   The loop's title is "one rule for whether an invite is valid", but the rule reaches 3 of its 5 readers.
2. **Loop 136 gave the CEO an instruction that cannot be run, and missed that the instruction is not needed.**
   Production is a SQLite file inside the container (`Dockerfile:153`, `deploy.yml:175`). The runtime image
   copies `.next`, `prisma`, `public` and `node_modules` but not `scripts/` or `src/` (`Dockerfile:92-106`),
   so `DATABASE_URL="<prod url>" … tsx scripts/count-invalid-invites.ts` has nothing to run against. More
   importantly, an invite expires 7 days after creation (`invite/route.ts:190`), and a re-invite now goes
   through #272's role check. So **no pre-#272 invite can still be pending 7 days after `942dd2c` reached
   production.** That commit is on `origin/main`. The destructive half of #273 resolves itself.
3. **Loop 135 rewrote §6.4 and left §6's opening paragraph saying the opposite.** `docs/page.tsx:1550-1551`
   reads "Teams allow multiple users to **share a workflow library**, record together, and collaborate…".
   Seventy lines lower, the rewritten §6.4 says the shared library is on the Roadmap. The same claim appears
   in the app at `teams/page.tsx:167` ("Create a team to share workflows with colleagues") and in a FAQ answer
   at `pricing/page.tsx:26` ("Anyone on your team can … view the generated SOPs and process maps"). The #321
   pin checks literal strings only, so it passes all three.

---

## 2. Q2 — Loop 136, adversarially

### 2.1 Is acceptance byte-identical?

**Yes.** I traced each refusal path, old code against new (`invites/accept/route.ts:257-272`):

| Stored invite | Old | New | Same? |
|---|---|---|---|
| role outside the set | no inviter query; 403 `invalid_invite_role` | `role !== 'owner'` → no query; `inviteRefusal` → `invalid_role` → same 403 body | yes |
| `owner`, inviter not an active member | `findFirst` (same `where`, no `select`) → `!inviter` → 403 `forbidden_role_elevation` | same query; `inviter?.role` undefined → `owner_not_from_owner` → same body | yes |
| `owner`, inviter active admin | 403 elevation | same | yes |
| `owner`, inviter active owner | proceeds | proceeds | yes |
| member/admin/viewer | proceeds | proceeds | yes |

The queries, their order and the response bodies all match, and the 45 + 31 existing accept tests pass
unmodified.

### 2.2 Does omitting refused invites hide something an owner needs?

**Yes; see §1.1.** Recommended fix, consistent with the loop's own goal: put the same predicate into
`countPendingInvites` and Guard 2. A refused invite then holds no seat and does not block a re-invite. The
re-invite upserts on `@@unique([teamId, email])` (`schema.prisma:674`) and replaces the bad row with a
validated one, which makes revoking it unnecessary. The alternative is to list refused invites as
"invalid — revoke". Both options are one outcome in one Area. The case also arises again in normal use: an
owner invite becomes `owner_not_from_owner` whenever its inviter is demoted. It is not only pre-#272 residue.

### 2.3 Does the "expired" response leak anything?

- **Body and status:** identical to a real expiry (`{error:'Invite has expired'}`, 410). Neither path calls
  `recordSuccess` or `recordFailure`, so the rate-limiter side effects match too. **No leak.**
- **Timing:** a refused *owner* invite costs one extra `teamMember.findFirst` that a real expiry skips
  (`accept/route.ts:205-210`). To someone who already holds the token, this shows that an "expired" invite
  was really an unexpired owner invite. That is negligible, because the token is the secret.
- **Inconsistency, not a leak:** the authenticated path still returns the true reason (403 +
  `invalid_invite_role` / `forbidden_role_elevation`). A logged-out user sees "expired" on the join page,
  then a different reason after signing in. The commit says the response has "no hint of why", but that
  holds only while the user is logged out. Make the authenticated path say "expired" too, or reword the
  commit's claim. This is a low-priority fix.

### 2.4 Is the count script safe?

**It reads only and prints no PII.** It calls `findMany`/`findFirst` only and prints four integers. The error
path prints `err.message` only. **It cannot reach production by default:** `.env` is
`file:./data/ledgerium.db`, a local file. Its only defect is the production instruction (§1.2), which should
either describe copying out the volume's DB file or be dropped in favour of the expiry argument.

---

## 3. Q3 — Loop 135

### 3.1 The role-capability table against the routes

| Docs claim (`docs/page.tsx:1601-1602`) | Code | Verdict |
|---|---|---|
| Owner: invite, remove, revoke, assign any role including Owner | owner/admin gates `members/[memberId]/route.ts:67,143`; elevation only by owner `:75`; sole-owner protection `:101-110,:168-175` | **true** (the sole-owner exception is unstated; acceptable) |
| Admin: same, up to Admin; cannot grant, change or remove an Owner | `isRoleElevation` `:75`; `isActionOnHigherAuthority` `:91,:159` | **true** |
| Member / Viewer: Roadmap | no member/viewer write path | **true** |

The table is correct now. One weakness: the pin's `not.toMatch(/export const (DELETE|PATCH|PUT)/)`
(`pricing-copy.test.ts`, #321 test) would miss a route written as `export async function DELETE`. The
repo's convention is `export const X = withApiRoute(...)`, so it holds today only by convention.

### 3.2 Remaining team overclaims

| Where | Claim | Verdict |
|---|---|---|
| `docs/page.tsx:1550-1551` | Teams "share a workflow library, record together" | **false** — contradicts §6.4 directly below |
| `teams/page.tsx:167` (in-app empty state) | "share workflows with colleagues and collaborate" | **false** |
| `pricing/page.tsx:26` (FAQ) | "Anyone on your team can … view the generated SOPs and process maps" | **false** — workflows are userId-scoped |
| `use-cases/compliance/page.tsx:96` | "Role-based team permissions (Team plan+)" | **overstated** — only owner/admin are enforced |
| `docs/page.tsx:1844`, `pricing/page.tsx:87-88`, `lib/config.ts:158` | "Shared team library / workspace" = Yes on Team+ | a plan promise on waitlist-only plans. **Same class as "Most Popular"**: the CEO decides |

### 3.3 Is the Viewer hint accessible?

**No.** `teams/[id]/page.tsx:176-180` renders a plain `<p>` with no `role="status"` or `aria-live`, and nothing
links it to the control through `aria-describedby`. It sits after the Send button, so a keyboard user moving
from the select to the button never reaches it. A screen-reader user who picks "Viewer" hears nothing. The
`<select>` itself has no accessible name (`:163-170`, no label or `aria-label`), and neither does the email
input, which has a placeholder only. Those two gaps predate the loop, but the hint is attached to them.

---

## 4. Q4 — Loop 134

**The coverage script fails correctly.** It exits 1 when pnpm is missing (both guards fire), on non-JSON, on
`[]` and on an unreadable path. `{}`/`null` also exit 1, but through an uncaught TypeError
(`check-typecheck-coverage.mjs:65`). Guarding with `Array.isArray(pkgs)` would give those cases the
intended message. The check that a `typecheck` script runs `tsc` looks for the token, not for what the
script does: `RUNS_TSC` accepts `echo tsc`, `tsc --version` and `tsc --noEmit || true`. That is the
exists-versus-enforced problem again, at a smaller scale. It is latent, because every real script here is
`tsc --noEmit`.

**The V4 canary can pass while V4 checks nothing.** The canary checks the parser against fixed fixture lines.
It does not check that the real log is still written in a form the parser can read. MR-057 asked for a
recency canary on the real log ("≥1 closure parsed in the top N entries"), and that was not built.
Measured in scratch copies:

| Injected line | Exit |
|---|---|
| `- **Follow-ups:** 0 created, 1 closed (#316).` | 1 (caught) |
| `- Follow-ups: 1 closed (#316).` | 1 (fixed since MR-057) |
| `- **Follow-ups:** 0 created, two closed (#316, #318).` | 1 (fixed) |
| `- **Follow-ups:** 0 created; closed #316.` | **0 — MR-057's third listed miss, still missed** |
| `- **Follow-ups:** 0 created; #316 struck.` | **0** |
| `- **Follow-up debt:** 1 closed (#316).` | **0** |
| `- **Follow-ups:** 0 created, 1 closed (#315; #316 still open).` | 1 (false positive, loud; acceptable) |

The code comment says a Follow-ups line "that says 'closed' … is reported rather than silently skipped"
(`validate-backlog.mjs:268-272`). In fact a line containing "closed" with no number in front of it fails the
`N closed` match and is skipped at `:289` without any report. Fix: any `FOLLOWUP_LINE` that contains
`closed` and yields no ids is non-canonical. Also add the real-log recency canary.

---

## 5. Q5 — Portfolio reassessment

### 5.1 Pool trend

| Review | Open | Δ |
|---|---|---|
| MR-050 … MR-053 | 113 | flat for 4 reviews |
| MR-054 | 114 | +1 |
| MR-055 | 114 | 0 |
| MR-056 | 116 | +2 |
| MR-057 | 119 | +3 |
| **MR-058** | **119** | **0** (2 closed, 2 filed by MR-057) |

**The pool has grown by 5 since MR-054 (114 → 119, about 12 loops); this window held it flat.** Of the
119 open rows, **about 20 are blocked on the CEO or ops**: #12, #107, #191, #190, #193, #216, #225, #142,
#271, #273, #277, #281, #283, #308, #314, #316, #318, #319, #320, plus #108 (blocked on a technical
dependency). **#144 says SUPERSEDED and is still counted as open, so it should be struck.**

### 5.2 (a) CEO-blocked rows: the one decision each needs, by value unblocked

| # | Row(s) | Decision | Unblocks |
|---|---|---|---|
| 1 | — | **Push `main`** (54 ahead) | first pnpm-10 CI run; all loop 128-136 guards proven in CI; alerts; #281 |
| 2 | #283 | "Is the hydration investigation done?" → yes | removes public source maps + diagnostic page from production (live exposure) |
| 3 | Terms line + #319 | Retention/purge policy, or approve rewording `terms/page.tsx:52` to "export or archive" | the last false public deletion claim, which is legal text |
| 4 | #273 | **Accept natural expiry**: give the date `942dd2c` was deployed; close #273 seven days after it | needs no production access; the count/revoke step drops out |
| 5 | #191 | Stripe card-trial stacking policy | real charges with no in-app warning |
| 6 | #314 (+ export footer, Most Popular, contract claims, "Shared team library" plan rows) | One positioning session | 5 copy rows |
| 7 | #318 | Is GitHub Pages on? (a 5-minute check) | delete 16 HTML pages claiming SSO/on-prem |
| 8 | #308 | React Flow Pro or restore attribution | Chrome Web Store compliance |
| 9 | #320 | Gate, watermark or keep PDF free | pricing consistency |
| 10 | #277, #225, secret charset, squat query, Stripe price IDs | One batch of ops values | 4-5 config rows |
| 11 | #12 | Fail-loudly deploy | schema-correctness gate |
| 12 | #271, #216 | Extension capture semantics | the extension (untouched 93 loops) |
| 13 | #57 target, email verification | Measurement policy | #57 retirement evaluation |
| 14 | #316 | Viewer definition | **not urgent**: nothing to restrict until a team data layer exists |
| 15 | #190, #193 | CLAUDE.md trims | governance hygiene |

### 5.3 (b) What remains for burn-down

**The burn-down pool is not running out.** These loop-born follow-ups (L78 or later) are unblocked and
selectable: #299, #307, #290, #278, #309, #252, #251, #249 (each 10); #294, #287, #260, #237 (9); #303, #275,
#270, #311, #265, #226 (8); #264 (7). That is **19 rows, roughly 19 loops at one per loop**. Behind them sit
about 19 iteration-era follow-ups (#27-#61), many of them stale. **The real problem is not supply. Each loop
closes about one row and about one more gets filed, so burn-down alone keeps the pool level and cannot
shrink it.**

### 5.4 (c) Should the loop pivot to feature rows?

**The rule already allows it. Cool-off is armed:** it was consumed at loop 125 (#305), re-armed at loop 128
(#306, "recharge 3 of 3", `ITERATION_LOG.md:331`), and nothing has spent it since: loops 129-136 are all
`burn-down`. Under Follow-Up Debt Policy clause 7, one pick may ignore clause 6 and select by `top-score`,
logged as `ceiling-cool-off: invoked`. Three burn-downs then re-arm it. **That gives one feature loop in four.**

The candidates checked against their own notes:

| Row | Listed | Real | Status |
|---|---|---|---|
| **#121 PATHE-P05** decision detection, signals 1-3 | **3 (parser misreads it)** | **14** (I5 A5 L4 C3 E3 R2) | **live**. P01-P04 are struck. It is the head of the Path E chain. It needs `system-architect` (D-4 clause 2) |
| #122/#123/#125/#124 Path E P06-P09 | 10-14 | — | blocked behind #121 |
| #138 PATHE-P22 | 14 | — | **stale premise**: it needs BullMQ, which is not in `apps/web-app/package.json` |
| #137 PATHE-P21 embed | 14 | — | live but downstream |
| #168 ADM-002 PR-8 | 14 | — | **overlap with #113/#125 unresolved since MR-034**; do not select |
| #149/#150 ADMIN-001 | 12/13 | — | #150 is marked MATERIALLY STALE; #149 assumes BullMQ: **stale** |
| #113 PRICING-P03 restructure | 13 | — | **largely superseded** by loops 129-135 copy fixes. The remainder is tied to #314/#320/Most Popular (CEO) |
| #111 PRICING-P01 `lib/pricing/` | 13 | — | live (no `lib/pricing/` exists); its IFF invariant needs Stripe price IDs (CEO), so it is half-blocked |

**#121 has been mis-ranked for 81 loops.** MR-034 (loop 55) flagged eight score cells that the parser cannot
read and asked for the stray `|` to be escaped. None of the eight has been escaped. One of them is the
highest-scored unblocked row in the backlog.

### 5.5 (d) Plan for loops 137-139

| Loop | Pick | Rule | Agent | Why |
|---|---|---|---|---|
| **137** | **New row: "one invite rule, all five readers"**: apply `inviteRefusal` in `countPendingInvites` and Guard 2 (or list refused invites as revocable); make the authenticated accept path's message consistent; correct the count script's production instruction | `burn-down` (follow-up of #273) | `backend-engineer` (rotates off `security-reviewer`) | This is a defect introduced in the window, and it is small |
| **138** | **New row: "what a team is, the remaining paragraphs"**: `docs:1550-1551`, `teams/page.tsx:167`, `pricing:26`, `compliance:96`; give the Viewer hint `aria-describedby` + `role="status"` and give the select and email field accessible names; widen the #321 pin to scan `PUBLIC_FILES` + teams pages for "share (a )?workflow librar\|share workflows\|anyone on your team can" | `burn-down` | `frontend-engineer` + `growth-strategist` (≥3 strings) | web-app is 2 of the last 5 loops, so no penalty |
| **139** | **#121 PATHE-P05**, after a 15-minute staleness check of its text against `lib/process-graph/` | **`ceiling-cool-off: invoked`** (top-score; cool-off armed since loop 128) | `system-architect` | This is the first top-score pick in 14 loops. Escape #121's `\|` in the same commit. If the check finds it stale, invoke cool-off on #111 instead |

The V4 "closed without a count" fix and the real-log canary (§4) are the next tooling burn-down, at loop 140 or later.
MR-059 is due after loop 139.

---

## 6. What the window got wrong

1. Loop 136 hid refused invites from the revoke UI, though they still hold a seat and block a re-invite for 7 days (§1.1).
2. Loop 136's CEO instruction cannot run (SQLite in the container; `scripts/` not in the image), and natural expiry already settles the question it was meant to answer (§1.2).
3. Loop 135 corrected §6.4 and missed §6's opening paragraph, the in-app Teams empty state and a pricing FAQ (§3.2).
4. The Viewer hint is not announced and sits next to an unlabelled select (§3.3).
5. Loop 134's comment and commit say non-canonical lines "are reported", but "closed #id" with no count, MR-057's own example, is still skipped silently. The canary checks the parser, not the log (§4).
6. **A governance miss that has carried through 81 loops:** eight unreadable score cells, one of them the top
   unblocked row (#121 at a true 14). Loop 136's "the higher-scored rows are older feature rows" was the
   moment to notice that the cool-off was armed, and nobody did.
7. #144 is SUPERSEDED but still counted as open.
8. Nothing needs reverting.

## 7. Pattern

Same as MR-055 through MR-057: **a fix covers the readers it was told about, not every reader of the
fact it changes.** Loop 136's "single predicate" fixed three of the five code paths that read an invite's
validity. Loop 135's truth table fixed the table and missed the paragraph that introduces it.
Practice note: before claiming "one rule", grep for every reader of the underlying field (`teamInvite` with
`acceptedAt: null`). Before claiming a section is corrected, read the whole section. No control-rule change
is proposed. The selection rules worked. They were not used in full, because cool-off sat armed and unused
for 8 loops while the parser hid the top row.

---

## 8. Q7 — CEO decisions, consolidated

The order follows §5.2. Status changes this window: **#273 can be decided without production access**
(accept expiry). **The Terms line is still live and is now the only false public deletion claim.** Main is
**54 ahead**. All other items are unchanged from MR-057 §9: alerts wait on the push; #281 waits on the push;
#216 and #271 concern an extension untouched for 93 loops; #316 is not urgent.

---

## 9. Verdict

Every number reproduces at `36a8a84`: web-app 4155 on 3 of 3, root 5930 on 2 of 2, typecheck 0, validator
clean (open 119), the sabotage switch fails as intended, 27/27 script tests pass, and the coverage guard
fails on zero packages, non-JSON and a missing pnpm. The acceptance refactor is byte-identical.

The misses: loop 136 hid invites that still hold seats and block re-invites, and handed the CEO an
unrunnable step whose question expiry already answers. Loop 135 left the section's opening paragraph and
two other surfaces claiming a shared library. V4 still skips "closed #id". The pool is flat at 119, the
burn-down supply is healthy, and the armed cool-off plus a mis-parsed #121 mean loop 139 should be the
first top-score pick since loop 125.

### Appendix — reproducing

```sh
# V4 miss (scratch copies; repo untouched)
{ echo "- **Follow-ups:** 0 created; closed #316."; cat ITERATION_LOG.md; } > "$S/L.md"
VALIDATE_BACKLOG_FILE="$S/B.md" VALIDATE_ITERATION_LOG_FILE="$S/L.md" node scripts/validate-backlog.mjs   # exit 0
VALIDATE_BACKLOG_V4_SABOTAGE=1 node scripts/validate-backlog.mjs                                           # exit 1
# coverage guard with no pnpm
env PATH=/c/Windows/System32 "$(command -v node)" scripts/check-typecheck-coverage.mjs                    # exit 1
CHECK_PNPM_VERSION=10.32.1 CHECK_TYPECHECK_PACKAGES_JSON='{}' node scripts/check-typecheck-coverage.mjs   # exit 1 (TypeError)
# hidden-invite readers
grep -n "countPendingInvites\|existingPending" "apps/web-app/src/app/api/teams/[id]/invite/route.ts"
```
