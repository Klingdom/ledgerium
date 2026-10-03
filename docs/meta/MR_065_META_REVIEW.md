# MR-065 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 156-158, 2026-10-02 21:10 → 21:27 (−0600). Commits `7fb26d1` (loop 156, #324), `5d6aa32` (loop 157,
#336), `4c533ad` (loop 158, #345). Rows closed: #324, #336, #345. Rows filed by loops: #347 (loop 156, CEO-blocked).
**Why now:** base cadence, 3 of 3 since MR-064 (`ITERATION_LOG.md:11`).
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`, `IMPROVEMENT_BACKLOG.md`,
`ITERATION_LOG.md`, `SYSTEM_HEALTH.md`, `CHANGELOG.md` or code. No commit. Every row, strike or fix below is a
recommendation for the coordinator. Scratch went only to `…/scratchpad/` (`wr/` WorkflowRow probes run through a
`node_modules` junction, `v/` validator tamper harness over copies of the live log and backlog, `validate-157.mjs` the
pre-158 validator). `git status --short` before and after is identical (`.claude/*` modified, `data/` untracked; both
pre-existing), apart from this file.

**Validation run for this review (executed, not inferred):**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| root `pnpm test` | 6173 | **297 files, 6173 passed, exit 0** | matches |
| `apps/web-app` `pnpm test` | 4286 | **237 files, 4286 passed** | matches |
| `pnpm typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | clean | **exit 0**, 340 rows, 228 struck, open **112**, 25 strict-checked lines | matches |
| **`node scripts/run-guard-tests.mjs --manifest …`** | "guard tests total 137" | **files=6 tests=137 real_pass=136 fail=1, exit 1** | **RED at HEAD** (§4.1) |
| Loop 158 revert proof "51 of 92 fail on HEAD" | 51 | pre-158 validator + current tests: **56 of 92 fail** (55 + the one that now fails everywhere) | consistent; the count drifts because the tests read the live log |
| Loop 156 root delta 6167 → 6173 | +6 | `team-library-copy.test.ts` = 6 `it()` | matches |
| Loop 157 web-app delta 4272 → 4286 | +14 | `WorkflowRow.timeout.test.tsx` = 14 tests | matches |

**Not run:** Docker, any browser or screen reader, Playwright, any HTTP request (a `curl -I` to production was blocked by
the project's command policy, so edge headers in §5 are unverified). Loops 152-158 have never run on GitHub (§6).

---

## 1. Lead

1. **Loop 158 committed a red guard suite.** One of its own new tests reads the live backlog and asserts that row #345
   is open. The same commit struck #345, so that test now fails on every run. The CI `quality-gate` step that runs the
   guard runner (`deploy.yml:57`) would fail on the first push, and that job gates build and deploy. `main` is 10
   commits ahead of `origin/main`. The loop's log lists "guard tests total 137" but does not say they passed. They were
   last run before the strike. **Fix before pushing.** This is Mode 3 (a defect in a just-shipped deliverable), not a
   new loop (§4.1, N1).
2. **Loops 156 and 157 delivered product value, the first since loop 146, and both hold.**
   - **156:** all 5 named claims are rewritten and the scan works. But #347, the CEO decision row, names only 2 of the 4
     plan-promise strings it allowlisted. The most visible one is the Team pricing **card** bullet "Shared team
     workspace & library" (`config.ts:158`, rendered by `PricingCards.tsx:282`), and it is not in #347. Neither is the
     Solo limit "No shared team library" (`config.ts:134`). The privacy page also still describes "exporting to a team
     workspace" (`privacy/extension/page.tsx:225-226`), a path that does not exist (§2).
   - **157:** the timeout, abort, late-response guard and live region all behave as claimed under 6 adversarial probes.
     Residue (§3):
     - a 502/504 or a dropped connection still reports a definite "not deleted", which is the same untruth the row
       targeted;
     - focus is left on a button that stays disabled after the timeout;
     - one row's timeout erases another row's busy announcement.
3. **Loop 158's entry parsing works for what it parses.** Every MR-064 §4 tamper now fails. The hole has moved to the
   backlog side (§4.2): a strike whose text is not exactly `CLOSED loop N` with N > 133 is invisible to the reverse
   check. That covers "CLOSED (loop 158)", "Closed in loop 158", a backdated "CLOSED loop 120", and an "MR-065 triage"
   strike. A fabricated `(loop 9999)` entry also passes, and pushes the age metric to "~10097 loops old". This is the
   fourth validator loop in seven. Recommendation: file the residue at a modest score and **stop the arms race** until
   a real (not self-constructed) evasion appears.
4. **Part B (§5) re-scores the top 15. Two of them were already done or stale.**
   - **Close:** #90 (its ADR question is already decided).
   - **Delete:** #177 (its axe ratchet shipped as #236).
   - **Re-status as blocked (5):** four Path-E-dependent rows and #143. Their status text ("DEFERRED", "open") lets them
     read as pickable.
   - **Re-scope or re-score (8):** most fall from 13-14 to 6-12.
   - After this, the true top non-blocked score is **#94 at 12**, not 14. Scores now discriminate.
5. **New security finding:** the web app sets **no security response headers at all**: no `X-Frame-Options` or CSP
   `frame-ancestors`, no `nosniff`, no HSTS (`next.config.js` has no `headers()`, and `middleware.ts` sets none). The
   reverse proxy is not in the repo, so whether production is frameable (clickjacking on authenticated delete/archive)
   is **unverified**. This is filed as N4 (12) and recommended for loop 159.

---

## 2. Loop 156 — #324 team-library claims (`7fb26d1`): **HOLDS, with an incomplete CEO hand-off**

**Diff vs log.**
- **Strings (5):** `docs/page.tsx:1554`, `teams/page.tsx:167`, `pricing/page.tsx:34`, `public/docs.html:481`, badge
  `:485`. The log's list matches the diff exactly. Growth's REWRITE and POLISH are applied verbatim.
- **Role select:** it gets `aria-label="Role"`, plus `aria-describedby` pointing at a persistent `aria-live="polite"`
  paragraph that renders even when empty (`teams/[id]/page.tsx:168-186`). Correct pattern.
- **Scan** (`lib/team-library-copy.test.ts`):
  - 6 tests;
  - the 3 regexes catch every original phrasing;
  - the roadmap exemption is ±2 lines;
  - the allowlist is file-scoped and fails when stale.

**Surviving claims the scan misses (paraphrase search over `src`, `public`, `content`, `llms.txt`, email, extension):**

| Location | Text | Assessment |
|---|---|---|
| `lib/config.ts:158` → `PricingCards.tsx:282` | Team card feature "Shared team workspace & library" | **allowlisted "owner CEO", but not in #347**; this is the most prominent claim on the site |
| `lib/config.ts:134` → `PricingCards.tsx:294` | Solo limit "No shared team library" | allowlisted, not in #347; it implies Team has one |
| `privacy/extension/page.tsx:225-226` | data shared "when you … export[] to a team workspace" | no such export exists; legal copy, so CEO-owned; not caught (no "library") |
| `docs/page.tsx:13` (OG description), `:256-257` (hero), `:1561` (caption "start collaborating") | "team collaboration", "collaborate with your team" | mild; true only as roster and invites. Low |
| `docs/page.tsx:1883`, `pricing/page.tsx:87` | "shared team workspace" | a team workspace (roster) exists; "shared" is ambiguous. Low |
| `api/teams/[id]/invite/route.ts:181` | "Workspace collaboration requires the Team plan" | user-visible API error; low |
| email templates (`lib/email.ts`), `llms.txt`, extension `src`/manifest, `src/content` | — | **clean** |

**"workflowShare has no UI and no reader": partly overstated.**
- No UI calls `/api/workflows/[id]/share` (grep finds no client fetch).
- But the route's GET reads `db.workflowShare.findMany` (`share/route.ts:50`), and its POST and DELETE write.
- The accurate claim, matching `plans.ts:103`, is "no read path **grants access** from a share".
- The POST route accepts `shareType: 'team'` and returns success for a share that grants nothing. That is a latent
  false-success API, unreachable from the UI today.

**#347 answers its own open question.** "Portfolios" exists today, per user: the `Portfolio` model is keyed on `userId`
(`schema.prisma:256-258`), gated Team+ by the `sharedLibrary` flag (`api/portfolios/route.ts:106`). So "Team library &
portfolios" is half true.

**Recommendation.** Append to #347 (N3 below):
- the two `config.ts` strings and the privacy sentence;
- the portfolios fact;
- "remove **all four** allowlist entries".

The log's "Not changed, filed for the CEO" list should have named the card bullet. This is the recording-fidelity
pattern of MR-063 and MR-064 again, in a narrower form.

---

## 3. Loop 157 — #336 honest unknown (`5d6aa32`): **HOLDS for the hung request; three residues**

Probes: a scratch vitest file that imports the real `WorkflowRow.tsx`, with fake timers. Fetch mocks reject on
`abort`, as browsers do.

| # | Probe | Result | Assessment |
|---|---|---|---|
| P1 | hung delete and hung archive (existing tests) | unknown alert; Escape works; abort sent; no removal | ✓ |
| P7 | double click on confirm | **1** fetch | ✓ (`disabled` re-renders between discrete events) |
| P3 | unmount mid-flight (row leaves the list) | timer cleared, request aborted, region cleared to `""`, region stays in `<body>` | ✓ no leak or crash. The outcome of an aborted in-flight delete is silently dropped, which is acceptable because the row is gone |
| P2 | timeout, then Escape, then re-open confirm | new mount: confirm **enabled**, unknown alert gone | "no blind retry" holds only within one mount. Harmless: `DELETE` is idempotent (`[id]/route.ts:305` returns ok for an already-deleted row). The log should say so |
| P4 | row A delete hangs; row B archive starts 10 s later | at A's timeout the shared region is cleared to `""` **while B is still "Archiving…"**; B's later success is announced | cross-row interference: one row's timeout erases another's busy announcement. Low |
| P5 | archive returns 502 with an HTML body | alert "**Network error.** Could not archive workflow." | `res.json()` throws inside the `try`. Pre-existing, but a mislabel |
| P8 | focus: confirm focused, click, timeout | button stays `disabled` after the timeout (`isBusy \|\| isUnknown`) | jsdom keeps focus there. Browsers apply the HTML focus-fixup rule and move focus to `<body>` when a focused control becomes disabled, and nothing moves it to "Close". Escape still works (document listener) |

**The truth gap the row was about survives on the server-error paths:**
- `readFailure` for delete returns "Delete failed — workflow not deleted." for **any** non-ok response
  (`WorkflowRow.tsx:760`).
- A proxy 502/503/504, or a connection reset after the request was sent, has the same unknown outcome as a hang, yet
  claims a definite failure.
- The `catch` branch says "Could not delete workflow" when the request may have committed.

**Other items:**
- **SSR and duplication:** `announceStatus` returns early without `document`, and `getElementById` prevents duplicates.
  ✓
- **Claims:**
  - "late responses ignored": holds (`timedOut` checked after each await);
  - "region cleared on timeout and failure": holds;
  - "Cancel becomes Close with no contradicting aria-label": holds;
  - "8 of 11 fail on revert": not re-run (agent-reported, first pass).

→ N2b below (score 10).

---

## 4. Loop 158 — #345 entry-based validator (`4c533ad`)

### 4.1 The commit's own test fails: **CI-breaking**

```
✖ V4 (#345.3) real-BACKLOG tamper: striking a still-open row "CLOSED loop 155" in a backlog copy fails
  AssertionError: row #345 not found          (scripts/validate-backlog.test.mjs:528)
```

- **Cause:** line 527 looks for `/^\|\s*345\s*\|/`, an **unstruck** row #345. The same commit changed it to
  `| ~~345~~ |`. At `4c533ad^`, with #345 open, the test passes.
- **Same fragility class, not yet failing:** seven more tests bind to literal lines of the live log (`L155`, `L156`,
  three loop-153-155 lines). They fail loudly ("fixture drift") if those lines are ever edited. That is tolerable. The
  backlog test instead **self-destructs on the next routine closure**, which is not.
- **Practice gap:** the closing commit's validation must run the same command CI runs:
  `node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json`, **after** the backlog strike. Loop
  158 ran the validator (exit 0) but not the guard runner after the strike.

### 4.2 Tamper results (copies of the live log and backlog via `VALIDATE_ITERATION_LOG_FILE` / `VALIDATE_BACKLOG_FILE`)

| Tamper | Exit | Should be |
|---|---|---|
| unmodified copies | 0 (25 lines) | ✓ |
| loop 158 heading rewritten without `(loop N)`, line kept | 1 ("non-loop entry contains 1 Follow-ups line" + "#345 struck CLOSED loop 158 but no loop 158 entry") | ✓ |
| same, line deleted | 1 | ✓ |
| open row #29 struck "**CLOSED loop 158**", no claim | 1 | ✓ |
| #29 struck "**CLOSED (loop 158)**" | **0** (open 112 → 111) | FAIL: parenthesis defeats `/CLOSED\s+(?:at\s+)?loop\s+(\d+)/` |
| #29 struck "Closed in loop 158" | **0** | FAIL |
| #29 struck "**CLOSED loop 120**" (backdated below the anchor) | **0** | FAIL: `n <= fromLoop` is skipped |
| #29 struck "**MR-065 triage: deleted as stale**" | **0** | FAIL: by design, but untraceable to any MR entry |
| #29 desc "CLOSED loop 158", status cell "CLOSED loop 120" | **0** | FAIL: the last match wins, so it backdates |
| #29 struck "CLOSED loop 9999" | 1 ("no loop 9999 entry") | ✓ |
| fabricated `## … (loop 9999)` entry, `0 created, 0 closed.` | **0** | FAIL: no contiguity check |
| fabricated loop 9999 entry claiming #29 + #29 struck "CLOSED loop 9999" | **0**, and the pool line reads "**~10097 loops old**" | FAIL: a fabricated loop closes a real row and corrupts the age metric |
| loop 158 relabelled `(loop 140)` | 1 (duplicate loop) | ✓ |
| the only summary line wrapped in a ``` fence | 0 | acceptable (visible when rendered) |
| **the only summary line inside a multi-line `<!-- -->`** | **0** | FAIL: the entry's line is invisible when rendered |
| extra hidden line in a multi-line comment claiming #29 | 1 (2 lines) | ✓ |
| ZW space in the label, or a Cyrillic "Fоllow-ups", as the only line | 1 (0 lines) | ✓ |
| **Cyrillic "Fоllow-ups" decoy as a 2nd line claiming #29** | **0** | FAIL: a reader sees "closed #29", the validator sees nothing (no strike, so no pool effect; misleading only) |
| ZW inside an id `#3​45` | 1 | ✓ |
| full-width colon / NBSP after the label | 1 / 0 | ✓ / fine |
| "CLOSED loop 158" text inside an open row's description | 0 | correct (only struck rows count) |
| #345 status appends "CLOSED loop 120", loop line keeps #345 | 1 | ✓ |
| … and the loop line drops #345 to `0 closed` | **0** | FAIL (backdating again) |
| row #346 re-born `L158`, not listed as created | 0 | known limit (no reverse check for created ids), disclosed |
| a stray `~~…~~` pair spanning entries 156-157 | 0 (legacy claims 137 → 136) | FAIL, minor: `logWithoutRetractions` swallows real claims across lines |

**Pattern.**
- Every MR-064 item is closed.
- What remains is that the **backlog** side has no closed vocabulary. Any strike not spelled
  `CLOSED loop N (N > 133)` is ignored, and nothing requires every strike to be traceable.
- 18 rows are already "not datable".
- **Fix (N2a):** every struck row above `### Completed (historical)` must carry exactly one recognised tag,
  `CLOSED loop N` (an entry N exists) or `MR-NNN triage` (an `MR-NNN recorded` entry exists). Baseline the existing
  undatable rows. Loop numbers above the anchor must be contiguous. Reject a summary line inside an HTML comment, and
  flag confusable or ZW decoys.

**Claims check (the strict CEO-facing practice):**

| Claim | Verdict |
|---|---|
| "every MR-064 §4 FAIL row and items 1–6" covered | **holds** |
| "Live log exit 0 (24 lines)" | holds (25 now, including 158's own line) |
| "guard tests total 137" | **true count, false implication**: 136 pass at HEAD |
| "Grandfathering: none" | holds |
| limits (created-id reverse, line-start anchoring, hyphen-only folding, prose whitelist) | true and disclosed. The backdating and untagged-strike classes are **not** disclosed |

---

## 5. Part B — top-15 re-score (open, non-blocked, by the bold total)

**Selection:** unstruck rows above `### Completed (historical)` whose status does not match `blocked|awaiting CEO` (93
rows). Sorted by the bold total cell. #223 parses as 73 under a naive cell split; its true total is 8 (a known
malformed cell), so it is excluded. All evidence was checked at `4c533ad`.

| Row | Listed | Verdict | Corrected (I,A,L,C,E,R → total) | Evidence |
|---|---|---|---|---|
| #137 embed iframe map | 14 | **keep, re-score** | 4,4,3,4,2,2 → **11** | still true: no `(public)/embed` route. The app sets no frame headers, so an embed route must land after N4 decides frame policy |
| #138 deviation alert + public demo | 14 | **re-status → blocked (CEO item 19); split** | — | BullMQ is not a dependency anywhere (no `bullmq` in any `package.json`; same deviation class as #46/CEO item 22). The alert needs a canonical merged graph from an engine with 0 consumers. Two moves are bundled, contrary to 7(b) |
| #168 admin high-intent badges | 14 | **keep, re-score; drop the overlap flag** | 3,4,3,4,3,1 → **10** | PR-7 drawer shipped (`components/admin-operations/user-detail/`, 5 components); no badges or modals exist. The "overlap with #113/#125" flag is wrong (pricing restructure and a co-occurrence matrix are unrelated). Admin-only surface, so I = 3 |
| #90 XES/OCEL ADR | 13 | **close-as-already-done** | — | `RESEARCH_PROCESS_MINING_STANDARDS.md:7` "§1 … (decision)": XES adopt, OCEL consider. An export has no consumer, and Path C R+1 never opened |
| #94 global userPlan | 13 | **keep, re-score** | 3,5,3,5,2,2 → **12** | still one caller, `DashboardV2Shell.tsx:373`. Its pairing row #189 closed at loop 66, so path (b) (fetch once in `AppShell`) is unblocked |
| #110 SOP schema versioning | 13 | **re-scope to the remainder; repair the cell** | 2,4,2,3,2,1 → **8** | `sopSchemaVersion`/`migrateSOP`: 0 hits. The determinism half is done. Value depends on whether rendered SOP JSON is persisted and replayed; confirm before picking |
| #111 `lib/pricing/` | 13 | **re-scope** | 3,4,2,3,3,1 → **8** | `src/lib/pricing/` absent; plan data spans `config.ts`, `plans.ts` and `stripe.ts`. The archive and webhook-replay parts are speculative. Residual: one source for prices, limits and features, plus a drift test |
| #113 pricing restructure | 13 | **re-scope to table semantics** | 3,4,2,4,1,1 → **11** | categories and outcome copy shipped (`pricing/page.tsx:71-91`). Missing: `scope` on `<th>`, a caption, category rows as `<td colSpan>` instead of header cells (`:282`), "—" for not-included with no text (`:114`), and `aria-label` on an svg without `role="img"` (`:111`) |
| #124 multi-dim clustering | 13 | **re-status → blocked (CEO item 19)** | — | the 9-label taxonomy already exists (`lib/process-graph/catalog/variant-labels.ts:16-24`) with no consumer outside `lib/process-graph`; clustering is absent |
| #125 co-occurrence matrix | 13 | **re-status → blocked (CEO item 19)** | — | `@ledgerium/decision-engine` is imported by nothing outside its package |
| #129 metrics V3 | 13 | **re-status → blocked (CEO item 19)** | — | no `WorkflowMetricsOutputV3`/`metricsVersion` anywhere |
| #143 WorkspaceSwitcher | 13 | **re-status → blocked** | — | status "DEFERRED post-MVP per UMAP-001 D-02" does not match the blocked filter, so it reads as pickable |
| #150 admin query expansion | 13 | **re-scope** | 2,3,2,3,3,1 → **6** | `lib/admin-operations/queries.ts:525` `getSubscriptionBreakdown` already covers plan, status and MRR. None of trial pipeline, quota utilisation, percentiles or extension counts exist |
| #157 production migration safety | 13 | **re-scope; repair the cell** | 3,4,2,3,2,3 → **7** | backup before migrate exists (`scripts/docker-start.sh:33-44`); `--accept-data-loss` is never passed (`:47`). Residual: prod runs `prisma db push` (`:53`) while 14 migration directories exist, so migrations never apply in prod. Decide one path (devops) |
| #177 admin UI tests + axe | 13 | **delete-as-stale** | — | the axe ratchet shipped as #236 (`e2e/app/admin/admin-a11y.spec.ts`); LeaderboardTable and TimeSeriesChart tests exist. The residue is 4 presentational component tests |

**Totals:**

| Verdict | Count | Rows |
|---|---|---|
| close | 1 | #90 |
| delete | 1 | #177 |
| re-status → blocked | 5 | #138, #124, #125, #129, #143 |
| re-scope / re-score | 5 | #110, #111, #113, #150, #157 |
| keep, re-scored | 3 | #137, #168, #94 |

**Outside the top 15, same class:** #340 (12) is status `open` but waits on CEO item 19, so re-status it blocked.
Record all strikes as **MR-065 triage** (no ratio credit). Open 112 → **110** after the 2 strikes.

**Effect:**
- The highest non-blocked scores become **#94 (12)**, then #113 (11), #137 (11), #85 (11) and #212 (11).
- The follow-up pool's product rows sit at 10: #290, #299, #307, #309, #329, #249, #251, #252.
- `top-score` and `burn-down` now point at product work of similar value.

---

## 6. Governance

**Selection.**
- 156 `burn-down` #324 (11), 157 `burn-down` #336 (10), 158 `burn-down` #345 (11): MR-064's sequence exactly. The
  cool-off was kept, as recommended. No driver errors.
- Same-implementer: `frontend-engineer` 2, then `qa-engineer`.
- D-4 clause 1 fired correctly at 156 (5 strings) and 157 (7 strings).

**Ratio, loops 149-158:**

| | Count | Source |
|---|---|---|
| Closed | 10 | 9 MR-filed (#337, #339, #325, #343, #342, #344, #324, #336, #345) + 1 audit (#122) |
| Created | 9 | 1 by a loop (#347) + 8 by MR-062/063/064 (#339-#346) |
| Ratio | **1.1** | passes ≥ 0.5 |

- Still a review→fix pipeline: 9 of 10 closures are review-filed. But this window's MR-filed rows were **product
  defects** (#324 public trust copy, #336 a11y), so the pipeline delivered user value. That is the change MR-064 asked
  for.
- **Pool:** 120 (MR-064 entry) → 114 (MR-064 triage) → 112.

**Product value.** 156 (public pages, pricing FAQ, in-app empty state, invite a11y) and 157 (delete/archive truth and
a11y) are the first user-facing loops since 146.

**Cool-off.** Consumed at 149, re-armed 3/3 by 150-152, unspent through 158; it does not stack.
- **Should 159 spend it? No.** After §5, the follow-up pool reaches product rows at 10, and N4 (12, below) is
  MR-filed, so it is burn-down-eligible.
- **Spend it at 161 on #94 (12):** the highest non-blocked `top-score` row after re-scoring, and not reachable by
  burn-down.

**Area / portfolio.** Last 6: 153 ci, 154 path-e, 155 tooling, 156 web-app/trust, 157 web-app/a11y, 158 tooling. No
saturation trip. Tooling (validator/runner/CI) is still 5 of the last 9 loops.

**D-1.** The last extension touch is `871e29a` (115 loops at loop 158). It is logged "user-ack outstanding", CEO queue
item 21. Unchanged; every open extension row is CEO-gated.

**CEO queue.**

| # | Item | State |
|---|---|---|
| 1 | Push | `main...origin/main [ahead 10]` (`b956c68` → `4c533ad`). **Do not push until N1 lands**: the guard runner fails at HEAD, so `quality-gate` would go red and block deploy |
| 2 | Last CI | `a14c5e8` (loop 151) run `37088974348` **success** (2026-10-03 02:12Z). Loops 152-158 never ran on GitHub |
| 4 | Alerts | scheduled "Alerts check" still **fails** (latest `37079356379`) |
| 19 | Path E direction | open. Re-statusing #124, #125, #129, #138 and #340 makes it visible as a blocker of 5 rows |
| 21 | D-1 | open |
| 22 | TanStack deviation | open. **Add BullMQ** (listed in the CLAUDE.md tech stack, not installed; #138 assumes it) |
| #347 | plan-table library rows | open. **Expand to all 4 allowlisted strings plus the privacy sentence** (N3) |
| new | edge security headers | needs production access to read the response headers (N4) |

**Recording fidelity.** Loops 156 and 158 each under-reported one fact: #347's scope, and the guard runner's pass
state. **Practice, no rule:**
1. A closing loop's validation list must include the guard runner, run after the backlog strike.
2. A hand-off row must enumerate every allowlist or baseline entry the loop created for its owner.

---

## 7. New defects (recommended rows; not added to the backlog)

Score = I + A + L + C − E − R. Row text is written for verbatim pasting.

| Id | Row text | Type | Area | Agent | I | A | L | C | E | R | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **N1** | **Loop 158's guard suite is red at HEAD: a test reads the live backlog and needs row #345 open, and the same commit struck it.** MR-065 §4.1. `validate-backlog.test.mjs:524-535` ("V4 (#345.3) real-BACKLOG tamper") finds `/^\|\s*345\s*\|/`, which no longer exists; `run-guard-tests` reports 136/137 and exits 1, so `quality-gate` (`deploy.yml:57`) will fail on the next push. (1) Make the test pick any currently-open, non-blocked row from the live backlog (or append a synthetic open row to the copy), never a fixed id. (2) Audit the other real-file tests for dependence on mutable state (open/closed status, counts) rather than on literal lines, which fail loudly. (3) Re-run the guard runner after the change and record its line in the log. **Do as Mode 3 before the push.** | fix | tooling / ci | `qa-engineer` | 5 | 5 | 2 | 5 | 1 | 1 | **15** |
| **N2a** | **The validator ignores any strike not spelled `CLOSED loop N` with N > 133, and accepts fabricated loop numbers.** MR-065 §4.2. On copies of the live files these all exit 0: a row struck "CLOSED (loop 158)", "Closed in loop 158", backdated "CLOSED loop 120", or "MR-065 triage" with no matching MR entry; a status cell that backdates the last match; a fabricated `(loop 9999)` entry closing a real row (the pool line then reads "~10097 loops old"); a loop's only summary line inside a multi-line HTML comment; a Cyrillic-"о" decoy summary line. (1) Every struck row above `### Completed (historical)` carries exactly one recognised tag, `CLOSED loop N` with an entry N, or `MR-NNN triage` with an `MR-NNN recorded` entry; baseline the 18 undatable rows. (2) Loop numbers above the anchor are contiguous and descending. (3) A summary line inside `<!-- -->` fails. (4) A line that becomes a summary line after NFKC, ZW-stripping and confusable folding must be canonical. Tests for each, plus a real-file tamper per item (built to survive future closures, per N1). **Do not schedule before a real evasion is seen; filed so the gap is recorded.** | fix | tooling / governance | `qa-engineer` | 2 | 4 | 1 | 4 | 2 | 1 | **8** |
| **N2b** | **Delete and archive still report a definite failure when the outcome is unknown, and keyboard focus is dropped after the timeout.** MR-065 §3. (1) A 502/503/504, or a fetch that rejects after the request was sent, shows "Delete failed — workflow not deleted." / "Could not delete workflow" (`WorkflowRow.tsx:760`, the `catch` in `useConfirmRequest`). These are unknown outcomes, the same case as the timeout, so settle them as "status unknown — refresh the page to check.". (2) Archive with a non-JSON error body reports "Network error" (`res.json()` throws inside the `try`). (3) When the focused confirm button disables (busy, then permanently after a timeout), browsers move focus to `<body>`; move it to Close on settle. (4) One row's timeout or failure clears the shared status region while another row is still busy; clear only the message this hook set. Testing Library tests for each. | fix | web-app / a11y | `frontend-engineer` | 3 | 4 | 2 | 4 | 2 | 1 | **10** |
| **N3** | *(append to #347, not a new row)* **[MR-065: #347 names 2 of the 4 strings it allowlisted. Also decide: the Team pricing-card feature "Shared team workspace & library" (`config.ts:158`, rendered by `PricingCards.tsx:282`, the most prominent claim on the site) and the Solo limit "No shared team library" (`config.ts:134`). The privacy page says data is shared when you "export[] to a team workspace" (`privacy/extension/page.tsx:225-226`), which does not exist. "Portfolios" does exist, per user (`Portfolio.userId`), gated Team+ by `sharedLibrary`. After the decision, remove all four allowlist entries.]** | — | web-app / trust | CEO | — | — | — | — | — | — | — |
| **N4** | **The web app sets no security response headers; whether production is frameable is unverified.** MR-065 §1(5). `next.config.js` has no `headers()` and `src/middleware.ts` sets none: no `X-Frame-Options`/CSP `frame-ancestors`, no `X-Content-Type-Options`, no `Referrer-Policy`, no HSTS. The reverse proxy is not in the repo. If it adds none, authenticated pages with one-click destructive actions (delete/archive) can be framed (clickjacking). (1) Add `headers()` for all routes: `X-Frame-Options: DENY` plus `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. No full CSP in this row. Leave a documented exemption hook for a future embed route (#137). (2) A test pinning the header set on a public page and an `(app)` page. (3) CEO/ops: read production response headers once and record whether the edge duplicates or overrides them (HSTS belongs at the edge). | fix | security / web | `security-reviewer` | 4 | 5 | 2 | 3 | 1 | 1 | **12** |

**Annotations recommended:**
- **#345 closure note:** "[MR-065: the commit's own test `#345.3` (`validate-backlog.test.mjs:524`) needs #345
  open and fails at HEAD; the guard runner exits 1 (136/137). Strikes not spelled `CLOSED loop N>133`, and fabricated
  loop numbers, pass. See N1, N2a.]"
- **#336 closure note:** "[MR-065: holds for a hung request. 5xx and post-send network errors still claim a definite
  failure; focus is dropped after the timeout; a timeout clears other rows' busy announcement. See N2b.]"
- **#324 closure note:** "[MR-065: `workflowShare` is read by its own GET route; nothing grants access from it. Two
  allowlisted `config.ts` strings and a privacy-page sentence were not handed to the CEO; see #347.]"
- **§5 verdicts** applied as MR-065 triage.

---

## 8. Finding → row map

| Finding | Row |
|---|---|
| §4.1 test needs #345 open; guard runner red | N1 (Mode 3, before push) |
| §4.1 practice gap (guard runner after the strike) | practice in §6 |
| §4.2 untagged/backdated strikes, fabricated loops, comment-hidden line, confusable decoy, `~~` swallow | N2a |
| §3 5xx/network claims, archive non-JSON, focus loss, cross-row clearing | N2b |
| §3 P2 re-open allows retry | #336 annotation (document; DELETE is idempotent) |
| §2 card bullet, Solo limit, privacy sentence, portfolios fact | N3 → #347 append |
| §2 "no reader" overstatement; share POST false-success | #324 annotation (POST: no row while no UI calls it) |
| §2 docs/OG/caption/API "collaboration" wording | none (low; fold into #347's copy pass if the CEO picks Roadmap) |
| §1(5) no security headers | N4 |
| §5 verdicts | coordinator applies as MR-065 triage; #340 re-status |
| #138 BullMQ assumption | CEO item 22 extended |

---

## 9. Loop 159-161 picks

**Before 159 (Mode 3, non-counting): N1.** It fixes a defect in loop 158's own deliverable. Then re-run the guard
runner, then push (CEO item 1).

Pool 110-114 > 8 ⇒ `burn-down` unless the cool-off is spent.

| Loop | Pick | Score | Rule | Agent | Area | Why |
|---|---|---|---|---|---|---|
| **159** | **N4** security response headers | **12** | `burn-down` (MR-065-filed) | `security-reviewer` | security / web | highest burn-down row after N1; E1; app-wide; prerequisite for #137 |
| **160** | **N2b** unknown-outcome truth + focus on settle | **10** | `burn-down` | `frontend-engineer` (+ `growth-strategist` if ≥3 strings change) | web-app / a11y | finishes #336's purpose on the paths users actually hit (gateway errors) |
| **161** | **#94** plan known on every page | **12** | **`ceiling-cool-off: invoked`** → `top-score` | `analytics` | analytics | the true top non-blocked row after §5; burn-down cannot reach it; plan segmentation underlies the #57 retirement reading |

- **Alternatives:**
  - 159: #290 items (2)+(4), the login and forgot-password timing oracles (10, verified still true:
    `lib/auth.ts:47-50` skips bcrypt for unknown users; `forgot-password/route.ts` awaits `sendEmail` only for existing
    accounts).
  - 161: #113 re-scoped (11).
- **Area check:** security → web-app → analytics; no trip. Agents rotate.
- **Do not pick:** N2a (8). No more validator loops until a real evasion is seen.
- **Then MR-066** (base cadence after 161).

---

## 10. CEO decisions

| # | Decision | Status | Unblocks |
|---|---|---|---|
| 1 | **Push**, after N1 | 10 commits local; HEAD's guard runner is red | first CI run of loops 152-158 |
| 4 | Enable alerts | open; still failing every run | alerting |
| 19 | Path E direction | open; now visibly blocks #124, #125, #129, #138, #340 (and #126, #341) | Path E rows |
| 21 | D-1: suspend formally or resume the ack | open (115 loops) | honest control plane |
| 22 | Tech-stack deviations: TanStack Query **and BullMQ** listed but not installed | open | CLAUDE.md accuracy; #138 |
| #347 | plan-table library rows: **all 4 strings + privacy sentence** | open | trust copy; allowlist removal |
| new (N4 part 3) | read production response headers once | open | clickjacking verdict |

---

## 11. Verdict

Every count reproduces at `4c533ad`: root 6173, web-app 4286, typecheck 0, validator clean (open 112). One claim does
not: **the guard runner exits 1**. Loop 158's own test assumes a row that the same commit closed, so the next push
would fail CI.

- **Loop 156 holds.** The CEO hand-off lists 2 of 4 strings, and the most visible one is missing.
- **Loop 157 holds for the hang it targeted.** Gateway errors and dropped connections still say "not deleted".
- **Loop 158 holds against every MR-064 tamper.** The backlog side accepts untagged, backdated and fabricated closures.

The window delivered user value for the first time since loop 146. After §5 the score table discriminates: 2 of the
top 15 are struck, and 5 are correctly marked blocked. Fix N1 before pushing, then move to security headers, honest
outcomes and plan segmentation, and stop iterating on the validator.

### Appendix — reproducing

```sh
S=<scratchpad>
node scripts/run-guard-tests.mjs --manifest scripts/guard-tests.manifest.json   # files=6 tests=137 real_pass=136 fail=1, exit 1
node --test scripts/validate-backlog.test.mjs                                   # ✖ V4 (#345.3) … row #345 not found
git show 4c533ad^:scripts/validate-backlog.mjs > $S/validate-157.mjs
VALIDATE_BACKLOG_SCRIPT=$S/validate-157.mjs node --test scripts/validate-backlog.test.mjs   # 56 of 92 fail
# backlog copy: strike open row #29 with "**CLOSED (loop 158).**" (or "CLOSED loop 120", or "MR-065 triage")
VALIDATE_BACKLOG_FILE=$S/v/b.md node scripts/validate-backlog.mjs              # exit 0, open 111
# log copy: insert "## 2026-10-02 (loop 9999) — fake" + "- **Follow-ups:** 0 created, 1 closed (#29)." and strike #29 "CLOSED loop 9999"
#   -> exit 0, "oldest open non-blocked: #17 … ~10097 loops old"
grep -n "headers\|X-Frame" apps/web-app/next.config.js apps/web-app/src/middleware.ts   # nothing
grep -n "Shared team workspace & library\|No shared team library" apps/web-app/src/lib/config.ts   # :158, :134
(cd apps/web-app && pnpm test)                                                  # 237 files, 4286 passed
git status -sb                                                                  # ahead 10
```
