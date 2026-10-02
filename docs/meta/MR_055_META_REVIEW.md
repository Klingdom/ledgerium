# MR-055 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 125-127, 2026-10-02. Commits `35c723d` (loop 125, #305 + #34), `9527dba` (loop 126,
#268), `7343567` (loop 127, #231). Rows filed in the window: #309 (loop 126). Rows closed: #305, #34,
#268, #231.
**Date:** 2026-10-02
**Scope constraint honoured:** no product code changed. No edits to `CLAUDE.md`,
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md`, `SYSTEM_HEALTH.md` or any audit.
Everything below that needs a row, a strike, a fix or a correction is a recommendation.

**Where the checks ran.** Main checkout at `7343567`. Working-tree changes are `.claude/*` and an
untracked `data/`, which no check reads; `git status` was identical after every run below (the
Playwright run wrote only ignored files). Local Node v24, Windows. CI pins Node 20 and takes pnpm from
`packageManager` (`package.json:4`, `pnpm@10.32.1`). `origin/main` is `e1a9af5`; local `main` is
**41 commits ahead** (42 once this review is recorded) — nothing from MR-050 onward has run in CI.

**Validation run for this review — all executed at `7343567`, none inferred. Verdict = exit code +
ANSI-stripped summary line.**

| Check | Claimed | Measured here | Result |
|---|---|---|---|
| `apps/web-app`: `pnpm exec vitest run`, **×3** | 4110 (loop 127) | **3 of 3: 224 files, 4110 passed, exit 0** (16.5-16.7 s) | matches |
| root `pnpm test`, **×2** | 5888 | **2 of 2: 282 files, 5888 passed, exit 0** (18.3-18.6 s) | matches (`SOPVisualMode.test.tsx` is web-app-only, as the log says) |
| `pnpm -r typecheck` | 0 | **exit 0** | matches |
| `node scripts/validate-backlog.mjs` | clean | **exit 0**: 302 rows, 188 struck, 19/19 budget, **open 114** | reconciles (below) |
| Validator on each commit's own backlog + log + script (`git show <c>:…`) | — | `4ded708` 117 · `35c723d` 115 · `9527dba` 115 · `7343567` 114, **all exit 0** | 114 (MR-054) + #305..#308 − #82 = 117; −#305 −#34 = 115; +#309 −#268 = 115; −#231 = 114. No corruption |
| `pnpm install --frozen-lockfile`, **pnpm 10.32.1** (`npx -y pnpm@10.32.1`, printed `10.32.1`) | "frozen install 0" | **exit 0**, "Lockfile is up to date, resolution step is skipped" | holds on the pinned major |
| same, **pnpm 9.15.9** (printed `9.15.9`) | — | **exit 0**, same line | holds on the old major |
| `pnpm exec playwright test e2e/app/sop/sop-a11y.spec.ts --project=authenticated` (config `webServer`: `next dev -p 3098`, SQLite seed) | "not run locally" | **9 passed, exit 0** (incl. both auth setups and the edited keyboard test) | **the spec passes** — see §4.3 for what it does not test |
| Contrast recomputation, 7 fixes + 3 exemptions (WCAG 2.x, script in appendix) | ledger values | all 10 reproduce to two decimals; one "before" value differs by surface (§3.1) | holds |

**How the install was run, and one artefact of it.** Each install ran in a scratch directory holding only
the tracked `package.json` files, `pnpm-lock.yaml`, `pnpm-workspace.yaml` and (second attempt)
`apps/web-app/prisma/`. The first attempt omitted the Prisma schema; both majors resolved and linked the
lockfile cleanly and then failed in the web-app `postinstall` (`prisma generate`: schema not found,
exit 1). That failure was my harness, not the lockfile; with the schema present both exit 0. I report it
because "exit 1" is in the scratch logs.

**Answered by the install, open since MR-054 §2.2:** both majors honour the `package.json:22` allow-list
(`better-sqlite3`, `esbuild`) and **ignore** `pnpm-workspace.yaml:4` (`@prisma/client`, `prisma`):
pnpm 9.15.9 prints "build scripts that were ignored: @prisma/client, @prisma/engines, core-js, prisma,
protobufjs"; pnpm 10.32.1 prints "Ignored build scripts: @prisma/client@6.19.2, … prisma@6.19.2 …". So
the workspace-yaml list is dead on both. Harmless today — the web-app's own `postinstall` and both
workflows run `prisma generate` explicitly — but one of the two lists should be deleted so nobody edits
the wrong one.

**Not run:** Linux, Node 20, a GitHub runner, `next build`, Docker, any screen reader, any real
colour-vision simulation, any HTTP request beyond the local Playwright server, production data. No
`curl`/`wget`.

---

## 1. Lead

**The window holds. Nothing reverts.** Every count reproduces, the frozen lockfile installs on both
pnpm majors, the e2e spec the log said was unrun passes (9/9, run here), and every contrast ratio I
recomputed matches the ledger. Three user-visible loops in a row, each closing a real defect — the
portfolio turn MR-054 asked for happened.

What the window got wrong has one shape: **each loop fixed the defect it was named for and walked past
its sibling on the same screen.**

1. **Loop 125 made the pricing page's FAQ true and left its table and its badge false.** The FAQ now says
   the intelligence layer is "Available on Solo and above" (`pricing/page.tsx:38`); the comparison table
   directly below has **no Solo column at all** (`:259-276`: Free, Starter, Team, Growth, Enterprise), so
   a reader of the table sees intelligence starting at Team. And **"Most Popular" sits on Team** in both
   the cards (`PricingCards.tsx:109-111`, `config.ts` `highlighted: true`) and the table (`page.tsx:268`) —
   a plan nobody can buy (`checkout/route.ts:67`, `:309-321`, HTTP 402). That is the #305 class (a claim
   false against the code) four lines from the string loop 125 rewrote (`PricingCards.tsx:253-256`).
2. **Loop 126's ledger exempts a colour-only signal on a false reason.** The insights-strip dots are
   exempt because "severity is carried by the chip text and icon" (`WORKFLOW_MAP_CONTRAST_268.md:90`,
   `:128`). The icon is declared (`WorkflowInsightsStrip.tsx:12-14`) and **never rendered** — the chip is
   a dot plus `insight.label` (`:37-38`), and the labels name the finding, not the severity
   (`useWorkflowViewModel.ts:112-131`). Severity there is colour only (SC 1.4.1).
3. **Loop 127 added a dependency the codebase had explicitly said must be decided on its own merits.**
   `accountCache.ts:6-11`: adding `@testing-library/react` + jsdom is "a real dependency decision that
   should be taken on its own merits, not smuggled in as a side effect". Loop 127 added both as a side
   effect of #231 — disclosed ("done beyond the brief"), which is better than silent, but the decision
   was still not taken on its merits, and that comment is now stale.

Plus one carried-in error: loop 125's cool-off rationale says the resource had been "fully re-armed since
iter 029" (`ITERATION_LOG.md:71`, `:113`); the last consumption was **iter 048** (`ITERATION_LOG.md:3107`,
`:3598`). The error is MR-054's (§6.2, "last invocation … is iter 029"), copied forward. The conclusion —
charged — still holds.

---

## 2. Q2 — Loop 125

### 2.1 Is every new string true against the code?

| String (where) | Code | Verdict |
|---|---|---|
| "Free, Starter, and Solo are fully self-serve single-user plans" (FAQ `page.tsx:30`; banner `:194`) | Starter/Solo go to Stripe Checkout (`PricingCards.tsx:88-95`); only `team`/`growth` are blocked (`checkout/route.ts:67`) | **true by design, conditional in fact.** The cards fail closed to "Not available yet" / "We're still setting up purchasing" when the price is unconfigured (`PricingCards.tsx:202-214`, `:257-260`), and #278 records `STRIPE_STARTER_PRICE_ID` / `STRIPE_SOLO_PRICE_ID` as delivered by no deploy file. If production lacks them, the banner says "self-serve today" above a disabled button. The banner said the same of Starter before loop 125; the loop extended it to Solo without checking |
| Team/Growth "not sold through checkout"; checkout refusal (`checkout/route.ts:313-314`, `checkout-error.ts:64-65`) | `BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD = {team, growth}` → 402 | **true**; the two strings are byte-identical |
| Waitlist mailto (`route.ts:314`; cards `PricingCards.tsx:218-226`) | `mailto:hello@ledgerium.ai?subject=Team Plan Waitlist`, `waitlistMailto` field | **true** |
| "Team and Growth, which include the multi-user workspace and invites" | invite route gates on the **workspace** plan's `teamWorkspace` (`teams/[id]/invite/route.ts:161-179`, 403) | **true**. Sibling not fixed: that 403 says "upgrade at /pricing" (`:174`), a page that cannot sell Team |
| "Team workspaces and shared libraries are part of the Team and Growth plans" | `sharedLibrary: true` for team (`plans.ts:142`), growth, enterprise; not solo | **true** — the overruled POLISH was right to be overruled |
| "Available on Solo and above. Starter includes basic process health scores only." (`page.tsx:38`) | `starter.healthScores: true` (`plans.ts:91`), `intelligenceLayer` false; `solo.intelligenceLayer: true` (`:123`) | **true** — and contradicted by the comparison table, which has no Solo column (§1) |

### 2.2 Other lapsed or stale promises in public copy

Searched `apps/web-app/src`, `apps/extension-app/src`, `docs/store-assets`,
`docs/features/chrome-store-submission/` for quarter/month-year tokens and "coming soon / launching /
upcoming release".

- **No other lapsed date.** `src/content/pages/{alternatives,compare,competitors}.ts` carry ~40
  "June/July 2026" tokens, all `verifiedAsOf` or "As of …" — retrospective, not promises. `docs/page.tsx:260`
  "Last updated April 2026" is retrospective. `docs/store-assets/chrome/` is images only; the submission
  package has no dated claim. No email template carries one (`lib/email.ts`, `lib/notifications.ts`).
- **One live contradiction between two public pages:** pricing lists "SSO & RBAC — Coming soon" for
  Enterprise (`pricing/page.tsx:94`); the security page lists "Role-based access control — **Available on
  Enterprise**" (`security/page.tsx:129`). Both cannot be true. (`plans.ts` sets `rbac`/`sso`/`auditTrail`
  true for enterprise, but no code outside `plans.ts` reads those keys — so "coming soon" is the likelier
  truth and the security page is the likelier lie. Not verified further.)
- **"Most Popular" on Team** (§1) and the **missing Solo column** (§1).
- Undated "coming soon" on in-app surfaces (`ColumnPicker.tsx:745`, `PresetChipRail.tsx:169`,
  `SOPIntelligenceMode.tsx:533`) cannot lapse; not findings.

Recommended row (~12, I4 A5 L2 C5 E1 R1; ≥3 strings → `growth-strategist` adjacent): **pricing-page claims
coherence** — Solo column in the table (or drop the Solo references to it), remove "Most Popular" from a
plan with no purchasers, reconcile RBAC between pricing and security, and make the "self-serve today"
banner conditional on the same availability the cards already fetch. Bind each with a test like
`pricing-copy.test.ts` already does for #34.

### 2.3 The fixed-reference-date test: guard or theatre?

**Half a guard.** At `REFERENCE_DATE = '2026-10-02'` (`pricing-copy.test.ts:17`) it reliably stops anyone
re-introducing a date that had lapsed by 2 October 2026 (revert proof in the log; I did not re-run the
revert). It **cannot** catch the failure that actually happened: a date that was in the future when
written and lapsed later. "Launching Q4 2026" written today passes today and passes forever, until someone
remembers to bump the constant. The escape hatch (`COPY_DATE_REFERENCE` "in CI", `:15`) is wired nowhere —
`grep` finds no reference in `.github/`. And the scan stops at `app/(public)` plus four files
(`:57-63`); `src/content/pages/` — the SEO pages — is outside it.

**A better deterministic design, cheapest first:**

1. **Ban forward-dated promises; no clock needed.** In scanned public copy, fail on *any* quarter or
   month-year token not preceded by retrospective phrasing (the `RETROSPECTIVE_RE` already exists). A
   promise with no date cannot lapse; this is fully deterministic and catches the class when it is
   written, not when it expires. It is also what loop 125 decided as copy policy ("no date").
2. If the CEO wants a date shown, it goes in a typed registry (`DATED_CLAIMS: {text, expires, owner}`) the
   test allow-lists, and the expiry is checked against **the HEAD commit date** (`git log -1 --format=%cs`,
   injected by CI as `COPY_DATE_REFERENCE`). That is reproducible per commit and advances by itself.
   "Date of the last commit touching the file" (the brief's option) has the constant's flaw — it does not
   move unless the file is edited.
3. Widen the scan to `src/content/` with `verifiedAsOf:` added to the retrospective pattern.

The unescaped `.` the log admits (`toMatch(/Available on Solo and above./)`) is harmless.

---

## 3. Q3 — Loop 126

### 3.1 Spot-check: 7 fixes, 3 exemptions, recomputed

Each colour was checked at the cited code site and recomputed (appendix).

| Ledger row | Code | Ledger | Recomputed |
|---|---|---|---|
| DFG neutral perf fill `#6b7280` on canvas | `mapColors.ts` `PERF_NEUTRAL_COLOR` | 4.83 | **4.83** |
| DFG fast perf fill `#059669` | `PERF_FAST_COLOR` | 3.77 | **3.77** |
| White glyph on start terminal `#15803d` | `TERMINAL_START.bg` | 5.02 | **5.02** |
| Frequency edge `#6366f1` @ 0.85 (was @ 0.20) | `EDGE_MIN_OPACITY = 0.85`; `uiOpacity` `DfgFrequencyMap.tsx:73-76` | 3.47 (1.29) | **3.47 (1.29)** |
| Variants legend note → `--content-tertiary` on `--surface-secondary` | light `#475569`/`#FFFFFF`, dark `#7C8CA1`/`#161B22` (`globals.css:18,7,124,116`) | 7.58 / 5.04 | **7.58 / 5.04** |
| Systems card, dark: `--content-primary` on old `#ffffff` → on `--surface-elevated` | `globals.css:11,8` | 1.23 → 13.13 | **1.23 → 13.13** |
| Violet icons, dark: `violet-600` → `--map-violet-fg` on `--surface-elevated` | `globals.css:98` | 2.84 → 8.77 | **2.84 → 8.77** |
| Exempt: visit-badge border `#ddd6fe` | `mapColors.ts` `BADGE.border` | exempt, "identified by text and fill" | border 1.39; **fill `#f5f3ff` vs canvas 1.10** — the fill identifies nothing; the 9.99:1 text does. Exemption right, reason half wrong |
| Exempt: de-emphasised edge @ 0.08 | `DfgFrequencyMap.tsx:749-751` | exempt | **1.07:1** — the graph's other edges vanish while a node is selected. Defensible as a transient state; it is content, not decoration |
| Exempt: insights-strip status dots | `WorkflowInsightsStrip.tsx:12-14, 37` | "chip text and icon carry severity" | **false** — no icon rendered; labels do not name severity (§1). amber-500 on amber-50 = 2.07:1 |

One "before" value is surface-specific, not wrong: `#9ca3af` measures 2.54 on `#ffffff` (DFG row) and
2.39 on the dark theme's `rgba(255,255,255,0.97)` strip (= `#f8f8f8`, variants row). Totals table:
102 + 99 + 32 = 233 per file and overall — arithmetic reconciles.

### 3.2 Is width-only frequency encoding perceptible? Does any colour-blind / greyscale case lose information?

- **Frequency mode:** width runs 1.5 → 10 px linear, snapped to 0.5 px (`DfgFrequencyMap.tsx:65-70`) —
  about 18 levels. Rank differences at the low end (1.5 vs 2.0 vs 3.0) read; neighbouring mid-range
  widths (5.0 vs 5.5) do not. Opacity now spans 0.85-1.00, which carries essentially nothing, so the
  **redundant second channel is gone**; the exact count exists only in a hover `<title>` (`:355-361`).
  Frequency mode is single-hue indigo, so greyscale and colour-blind users lose nothing *beyond* that lost
  redundancy. The trade was right for 1.4.11 (1.29 → 3.47); it was a design decision taken by
  `frontend-engineer` and the coordinator, with no `ux-designer` and no `a11y-architect` (both exist in
  `.claude/agents/`).
- **Performance mode loses information, and the loop made it slightly worse.** Fast / medium / slow are
  carried by fill colour only; the duration is in a hover `title` (`DfgFrequencyMap.tsx:243-247`). In
  greyscale the new fills separate by **1.18:1** (fast vs medium) and **1.28:1** (fast vs slow) — was
  1.48:1 for fast vs slow with the old 500-level pair. For red-green colour vision (green `#059669` vs red
  `#dc2626`, near-equal luminance) the categories collapse. Pre-existing as an SC 1.4.1 gap; the loop's
  darkening for 1.4.11 narrowed the luminance spread without anyone checking 1.4.1.
- **Insights strip:** severity is colour-only (§1).

### 3.3 Did any fix change light-theme appearance unexpectedly?

Nothing broke, but several fixes change what *every* user sees, because the React Flow canvases are
white in both themes:

- DFG edges: the faintest edge goes from ~20% to 85% ink — the map gets visibly denser for everyone.
- Perf palette and terminals darkened (`#10b981→#059669`, `#f59e0b→#d97706`, `#22c55e→#15803d`,
  `#ef4444→#b91c1c`).
- Selected system card loses its cyan tint (selection is now the border only); the compare-state indigo
  wash is gone.
- Violet/cyan accents shift one step darker in light (`--map-violet-fg #6D28D9`, `--map-cyan-fg #0E7490`).

All are recorded in the ledger as intended. None was looked at in a browser — the ledger says so
(`WORKFLOW_MAP_CONTRAST_268.md`, *Not covered*), and #309 carries the browser pass. Light-theme legend
strips and toggles are unchanged in practice (`--surface-secondary` is `#FFFFFF` in light,
`globals.css:116`).

Minor: the DFG header documents two width formulas — render `[1.5, 10]` (`:10`) and "for adapter contract
tests" `1 + weight * 4` → `[1.0, 5.0]` (`:16`). Pre-existing, but the loop that rewrote the header for spec
drift left a second formula in it.

---

## 4. Q4 — Loop 127

### 4.1 The roving tabindex against WAI-ARIA

Correct mechanics: one `tabIndex=0` (`SOPVisualMode.tsx:273`), Arrow/Home/End move focus and the stop,
the stop follows focus (`onFocus` → `setRovingOrdinal`), hooks precede the early return. **Wrong
container role:** the strip is `role="group"` (`:236`). The APG pattern for a single-tab-stop row of
buttons with arrow navigation is `role="toolbar"`; a group tells a screen-reader user nothing about arrow
keys, so the one tab stop looks like the only control. `aria-orientation` is unnecessary on a toolbar
(horizontal is the default); Up/Down also moving is harmless. Listbox would be wrong — these are not
selectable options.

### 4.2 Is the detail panel announced?

**Probably not on keyboard focus, and I could not verify it.** `aria-describedby` is set only when
`shown === dot.ordinal` (`:275`), and `shown` becomes that dot only in the render that `onFocus` triggers —
i.e. *after* the focus event the screen reader reads. The description target also mounts in that same
render (`:322-330`). NVDA/JAWS generally read name + description at focus time and do not re-announce a
description added afterwards. The accessible name (`Step N: shortTitle`) is announced; the new
system/duration detail may never be. Not a live region (correctly — it would chatter on hover). Fix
shape: give each button a permanently rendered, visually hidden description (or put system and duration
in its name) and keep the visual panel for sighted users. No screen reader was run here.

Two smaller defects: the Escape handler is a bare `document` listener (`:182`) with no
`stopPropagation`, installed whenever anything is hovered — the class MDR-P08 centralised on the
dashboard; and `role="tooltip"` on a static in-flow panel is tolerable but not what the role is for.

### 4.3 The e2e change — run

Ran it (table): **9 passed, exit 0**, including `the Flow View process strip is reachable and
scrollable by keyboard`. But that test (`sop-a11y.spec.ts:93-109`) now calls `firstStep.focus()` and
asserts `toBeFocused()` — it proves the attribute, not that Tab reaches the strip, not arrow movement, not
scrolling. Its title claims "scrollable by keyboard" and its comment claims it checks the tab stop
"actually does something"; neither is tested. The loop's jsdom tests cover arrows/Home/End; nothing in a
real browser does. `e2e-web-app.yml` runs on PRs and via `workflow_call` from `deploy.yml` (`:32-35`), so
the log's "the CI e2e job runs it" is true for a push to `main`.

### 4.4 Do the new dev dependencies affect bundle or CI?

- **Client bundle:** no. No non-test source imports either package (the one `src` hit is the stale comment
  in `accountCache.ts:9`).
- **CI:** install grows by `jsdom` (~4.2 MB unpacked) plus `@testing-library/react`; frozen install passes
  on both majors (table).
- **Production image:** yes, slightly. The Docker builder runs a full `pnpm install --frozen-lockfile`
  (`Dockerfile:43`) and the runner copies the builder's `node_modules` wholesale (`:93`, `:99`) with no
  prune — dev dependencies already ship (Playwright, Prisma CLI); this adds jsdom to them. Pre-existing
  pattern, one more instance.

---

## 5. Q5 — Practices

| Practice | Verdict |
|---|---|
| Cool-off invocation at 125 | **Correctly logged and correctly used** — exact `ceiling-cool-off: invoked` line, rationale, consumption stated, recharge counted 1/3 (126) and 2/3 (127). **Rationale's history is wrong** (iter 029 vs iter 048, §1), inherited from MR-054. Loop 128 `burn-down` re-arms it (3/3) |
| Agent diversity | `frontend-engineer` ×3 (125-127) — the log says so (`ITERATION_LOG.md:11`). Loop 128 must differ. Worth noting: two a11y loops ran without `a11y-architect`, and an encoding trade-off ran without `ux-designer` |
| **Area saturation — the rule is read two ways** | Loops 125-127 are `web-app / pricing / trust`, `web-app / a11y`, `web-app / a11y`. Loop 127's log says "two consecutive a11y loops; no saturation" (`:10`), counting the sub-area. That is not new: the loop era has counted sub-areas for a long time ("correctness / a11y / analytics, so no saturation", `ITERATION_LOG.md:1183`; `:2113`), while the iteration-era trips counted `web-app` (iter 029-031, 037-039, 071-073 in `CLAUDE.md`), and one loop applied the −2 *penalty* on `web-app` while checking the *block* on sub-areas (`:2580`). Under the iteration-era reading saturation **tripped at loop 127**; under loop-era practice it did not. MR-054 §6.2 used the sub-area reading too. **Needs one ruling**; the loop-128 pick below is non-web-app, so it is safe under both |
| Coordinator caught 3 design gaps in review (overruled POLISH, DFG spec drift, unmeasured scrollbar) | **Good catches, all three of brief defects.** The overruled POLISH happened because the coordinator's fact sheet omitted `sharedLibrary` (the log says so, `ITERATION_LOG.md:67`); the spec drift because the brief did not say a changed encoding must update its spec; the scrollbar because "measured" was not a stated acceptance criterion. Keep the review; move each into the brief: (a) copy reviewers get a fact sheet generated from `plans.ts`/the route, not written by hand; (b) any change to a documented visual encoding names the spec section and gets `ux-designer` adjacent; (c) every contrast claim is measured, with the numbers in the log |
| "Second agent on a trust boundary" (MR-052) | Fired at 125 (`growth-strategist`) — and missed "Most Popular" and the table because it reviewed the six changed strings, not the page. Same edge MR-054 §8 named: a review scoped to the diff cannot see the sibling |
| Recording scripts run the validator | Confirmed at every window commit (table) |

---

## 6. Q6 — What the window got wrong

1. **Loop 125 left two false claims on the page it was fixing:** "Most Popular" on an unbuyable plan, and
   a comparison table without the Solo column the new FAQ points to (§1, §2.1). Also the RBAC
   contradiction with the security page (§2.2).
2. **The date guard does not guard the failure that happened** — a future date lapsing — and its CI
   injection is unwired (§2.3).
3. **Loop 126 exempted a colour-only severity signal on a false reason** (§1, §3.1), and darkened the perf
   palette without checking that greyscale/colour-blind users can still tell its categories apart — they
   could barely before (1.48) and less now (1.28) (§3.2).
4. **An encoding trade-off and two a11y loops ran without the agents built for them** (`ux-designer`,
   `a11y-architect`) (§3.2, §5).
5. **Loop 127:** wrong container role; detail description likely unannounced on focus; global Escape
   listener; an e2e test whose title claims more than it asserts (§4).
6. **A dependency policy was overridden as a side effect** and the comment stating it left stale (§1).
7. **Area saturation is read on sub-areas in the loop era and on `web-app` in the iteration era**, and
   nobody has ruled which is right; three consecutive `web-app` loops trip one reading and not the other
   (§5).
8. **Cool-off history mis-cited** (iter 029 for iter 048), copied from MR-054 (§1).
9. Nothing to revert.

---

## 7. Pattern — what this window adds

1. **"Fix the named defect" is now reliable; "fix the screen" is not.** All four closures are real. Each
   left a sibling of the same class within a few lines: the badge above the rewritten string, the table
   below the rewritten FAQ, the dot beside the measured chip, the role around the new buttons. MR-054 said
   "turn to users by reading what users read"; the loops read the row, not the screen. Practice note: a
   user-visible loop's acceptance includes one pass over the whole surface it touches, logged as
   "siblings checked: …".
2. **Reviews scoped to a diff cannot find what the diff did not touch.** The growth review saw six
   strings; the page had eight claims.
3. **The meta-review is now a source of errors as well as a filter.** One of this window's misses
   (cool-off history) was MR-054's, carried forward verbatim; MR-054 also applied the unresolved
   sub-area reading of saturation without flagging that it was a reading. Meta-review numbers
   and rule readings need the same "verify against the source" the coordinator applies to agents —
   MR-012 Change A already says this for backlog rows; it applies to rule-state claims too.

No control-rule change proposed. Practice notes above. One clarification is needed rather than a change:
whether Area saturation counts the top-level surface (`web-app`) or the sub-area. Recommendation: the
top-level surface, which is what the rule's purpose (portfolio spread) and every iteration-era trip
used; it would have forced a non-web-app loop at 128, which is what §8 picks anyway.

---

## 8. Q7 — Next pick (loop 128)

**Constraints.** Pool 114 > 8 → `burn-down` (clause 6); the cool-off is at 2/3 and cannot be invoked.
Agent ≠ `frontend-engineer`. **Area ≠ web-app** under the top-level reading of saturation (§5); under the
sub-area reading a fourth web-app loop is legal, but a fourth consecutive web-app loop is exactly what the
rule exists to stop. Last five: 123 security/analytics, 124 security/authz, 125-127 web-app.

| Candidate | Score | Area | For / against |
|---|---|---|---|
| **#306** `--fail-if-no-match` on every filtered CI step | **12** | test-infra / ci | Highest score in the list; one-line-per-step; verified fix (MR-054 §2.3, both majors). **Lands before the push**, so the first pnpm-10 CI run already has it. Born at MR-054 (L124) — "follow-up" in the same stretched sense MR-054 accepted for #301-#304 |
| #303 alert re-arm flap | 8 | infra / monitoring | Genuine loop-left follow-up (L121); matters only once alerts are on (after the push) |
| #278 14 env vars no deploy file provides | 10 | infra / deploy | Includes the Starter/Solo price IDs behind "self-serve today" (§2.1); mostly a CEO decision list, not a bounded fix |
| #299 / #290 / #275 | 10 / 10 / 8 | security | Real, but the arc 109-124 just spent 16 loops here |
| #307, #309, #287, #252/#249/#251 | 9-10 | web-app | Held this loop (top-level saturation reading); #309 and #287 are next-up user-visible |

**Loop 128: #306**, `burn-down`, `devops-engineer` primary (or `qa-engineer`), Area `test-infra / ci`.
Acceptance: every `pnpm --filter …` test/e2e step in `deploy.yml`, `e2e-web-app.yml`, `e2e-extension.yml`
carries `--fail-if-no-match`; proven exit 1 on a misspelled package and exit 0 on the real one, on 9.15.9
and 10.32.1, with the exact workflow lines. This re-arms the cool-off (3/3).

**Then back to users (129-130),** keeping MR-054's direction: **129 = new row "pricing-page claims
coherence"** (§2.2; ~12; `growth-strategist` adjacent; it can take the re-armed cool-off if it is not
treated as a follow-up), **130 = #309** (dark-theme canvases + the browser pass loop 126 owes) with
`a11y-architect` primary — and the insights-strip severity (§3.1) and perf-mode 1.4.1 (§3.2) added to
#309 or filed beside it. Loop 127's role/description fixes (§4) are a small row for `a11y-architect`.

---

## 9. Q8 — CEO decisions — surfaced, nothing applied

| Item | Status | What changed this window |
|---|---|---|
| **Push `main`** | **Unblocked** | 41 ahead (42 with this review). Frozen install exits 0 on pnpm 10.32.1 and 9.15.9 after loop 127's lockfile change (measured). Watch the *Install pnpm* step (fallback: `version: 10.32.1` in the action), the counts **5888** / **4110**, and the e2e job (9/9 locally for the SOP spec). Ideally after #306 lands |
| **First pnpm-10 CI run** | Waiting on the push | Expect the "Ignored build scripts: @prisma/client … prisma" warning — harmless, both workflows run `prisma generate`. Delete one of the two `onlyBuiltDependencies` lists |
| **Alerts — enable** | After the push | Unchanged; #303's 4-hour flap caveat unchanged |
| **Launch date for Team / Growth** | **Your call; nothing shows a date now** | If you give one, it should go through a dated-claims registry with an expiry, not into copy (§2.3) |
| **"Most Popular" on Team** (new) | **Needs your word** | It sits on a plan no one can buy. Remove it, or move it to a plan that sells |
| **Stripe price IDs for Starter / Solo** (new framing of #278) | Yours | The page says "fully self-serve today"; if production lacks the price IDs, the cards say "Not available yet" beneath it |
| **React Flow Pro (#308)** | Unchanged | Subscribe, show attribution, or confirm the licence terms; five sites incl. the extension |
| **#57 40% bounce target** | Unchanged | Re-confirm for the per-user estimator (#307) |
| **Email verification at signup** | Unchanged | Still what makes #57 forgery cost more than a free signup |
| **#225 `TRUSTED_PROXY_HOPS`** | Defaults `0` | Unchanged |
| **#277 values** | Blocked on you | Unchanged |
| **Secret charset** | Unchanged | Applies to `CRON_SECRET` |
| **Admin-account squat check** | Unchanged | `WHERE lower(trim(email)) IN (<allowlist>)` |
| **#12** schema step fails quiet | Blocked on you | Unchanged |
| **#271** extension session-id filter | Needs approval | Unchanged |
| **#283** source maps + stack-trace page | Blocked on you | Unchanged |
| **#281** delivery test | After the push | Unchanged |
| **#216** extension untouched | **84 loops** (`871e29a`) | Unchanged |

---

## 10. Verdict

Every number reproduces at `7343567`: web-app 4110 on 3 of 3, root 5888 on 2 of 2, typecheck 0,
validator clean at 114 open and at each window commit; frozen install exits 0 on both pnpm majors; the
SOP e2e spec passes 9/9 here. All four closures are real, and ten recomputed contrast ratios match.

The misses are siblings: "Most Popular" on an unbuyable plan and a table without Solo beside loop 125's
true FAQ; a false exemption and a narrowed perf palette beside loop 126's measured fixes; a group that
should be a toolbar and a description that likely never speaks beside loop 127's roving tabindex. Area
saturation trips at 127 on one reading of the rule and not the other; rule it. Loop 128: #306, off web-app, not
`frontend-engineer`, before the push. Then the pricing page, whole.

---

### Appendix — reproducing §3

```js
// WCAG 2.x relative luminance; alpha composited over the backing first.
//  #6b7280/#fff 4.83   #059669/#fff 3.77   #fff/#15803d 5.02
//  #6366f1@0.85/#fff 3.47 (@0.20: 1.29)
//  #475569/#fff 7.58   #7C8CA1/#161B22 5.04   #9ca3af/#fff 2.54, /#f8f8f8 2.39
//  #E2E8F0/#fff 1.23 -> /#1C2128 13.13   #7c3aed/#1C2128 2.84 -> #C4B5FD 8.77
//  badge border #ddd6fe/#fff 1.39, fill #f5f3ff/#fff 1.10
//  #94A3B8@0.08/#fff 1.07   amber-500/amber-50 2.07   red-500/red-50 3.44
//  greyscale separation: #059669 vs #d97706 1.18, vs #dc2626 1.28 (old #10b981 vs #ef4444 1.48)
//  scrollbar thumb/track: dark 5.04, light 7.58, print #6b7280/#f8fafc 4.62
```

```sh
# install, both majors, scratch copy of tracked manifests + lockfile + workspace yaml + prisma/
npx -y pnpm@10.32.1 install --frozen-lockfile --prefer-offline   # exit 0
npx -y pnpm@9.15.9  install --frozen-lockfile --prefer-offline   # exit 0
# e2e (apps/web-app)
pnpm exec playwright test e2e/app/sop/sop-a11y.spec.ts --project=authenticated --reporter=list   # 9 passed, exit 0
```
