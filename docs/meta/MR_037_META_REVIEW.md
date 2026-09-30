# MR-037 — Meta-review (Mode 4, governance only, NON-counting)

**Window:** loops 66, 67, 68 (counted), plus loop 65 (Mode 3 correction, non-counting) read as context.
**Cadence:** MR-036 closed at loop 64. This review was commissioned at loop 68 — **three counted loops,
exactly at the `CLAUDE.md § Meta-Review Cadence` 2-3 floor.** First on-cadence meta-review in four cycles
(MR-034 clean, MR-035 two over, MR-036 one over, MR-037 on time). Loop 68's entry flags it itself:
*"3 loops since MR-036 — MR-037 is due."*

**No product code changed. No `CLAUDE.md` edit is proposed anywhere in this document.**

Independently executed during this review, not read from prose:
`npx vitest run src/app/theme-contrast.test.ts` (**24/24 pass**), `node scripts/validate-backlog.mjs`
(`231 rows, 127 struck, 19/19 malformed-row budget used — clean`), per-commit backlog row diffs via
`git show <c> -- IMPROVEMENT_BACKLOG.md`, `git log -1 -- <the four extension paths>`, and three purpose-written
Node probes that (a) replicate the guard's file-walk, (b) apply the guard's own two predicates to the files it
does not scan, (c) recompute every WCAG figure this review cites from `globals.css` directly. I did not run
Playwright or the full web-app suite (§13).

---

## 1. Lead — what is wrong, in order of consequence

1. **Loop 68 hardwired nineteen sites onto a colour it had already measured at 1.40:1, and three of them are
   text or state indicators.** `--accent` is `#20f2a6`, defined in `:root` with **no `.light` override**
   (`globals.css:52`). Recomputed: **1.40:1** on `--surface-primary` light, **1.47:1** on white cards. Loop 65
   named this value *"the worst in the application."* Loop 68 then removed the fallback from every
   `var(--accent, …)` site — correctly, they were dead — without asking where `--accent` lands. It lands as
   the MRR figure on the admin dashboard, as every accented KPI number, and as the active-tab border of the
   lens switcher. **None of the three is covered by any open row.** **S-1.**

2. **"Every rewrite is provably zero-pixel" is false, and the counterexample is two bullets above the claim
   in the same entry — and one bullet above it in the CHANGELOG the CEO reads.** The same commit changes two
   hover backgrounds, one of which had been `transparent` and one of which was `#161B22`, to
   `--surface-elevated` (`#1C2128` dark). The entry describes both as fixes. The CHANGELOG then says *"None of
   this changes how anything looks."* **S-2.**

3. **The guard is blind to `.ts` files, which is where its own headline example lives.** `sourceFiles`
   filters `/\.(tsx|css)$/` (`theme-contrast.test.ts:163`). `band-colors.ts` — the file loop 68's commit
   message quotes at length — is not scanned. Applying the guard's own two predicates to the three unscanned
   `.ts` files yields **two offenders today**, both in that file. The guard is green because the file is out
   of scope. **S-3.**

4. **`band-colors.ts:4-6` still documents the mechanism the commit removed.** The header says *"Every color is
   expressed as a CSS `var(--token, #hexFallback)` … (matching the admin-operations `var(--accent, #20f2a6)`
   convention)."* After loop 68, **not one colour in the file is written that way.** The loop-68 entry quotes
   this exact docstring as the evidence of the defect and did not fix it. Third occurrence of this class
   (loop 55 S-2, loop 61 S-1). **S-4.**

5. **The first discharge of the hold-back convention left a false record standing.** `sop-a11y.spec.ts:117-122`
   still reads *"The dashboard is NOT [covered in light] … filed as row #232 … **It goes in with its fix.**"*
   #232 closed at loop 67 and the test shipped. The convention has a filing step and no retirement step.
   **S-5 (minor).**

**What is not wrong, and it is a lot.** Loop 68 wrote the detector before the fix and let it set the scope —
that is a genuine method change and it found 73 sites against a row that named 21. Loop 67 discharged the
loop-64 hold on time, delegated to `frontend-engineer`, and was **corrected twice by the agent it delegated to**
(§9). Loop 66 verified a duplicate-request fix in a real browser after stating plainly that a unit test
*could not* have caught the row. Loop 67 attempted a full foreground enumeration, got two numbers, and then
**published that both were wrong and why** — which is the most valuable paragraph in the window and, awkwardly,
the one loop 68 needed and did not use (§3.3). MR-036's four strikes were all verified and all discharged at
loop 65, two of them by sabotage rather than by reading.

---

## 2. Strikes

### S-1 — SHIPPED. Nineteen sites pinned to a colour measured at 1.40:1, three of them load-bearing, none of them on a row.

`globals.css:52` defines `--accent: #20f2a6` in `:root`. There is no `--accent` in the `.light` block
(derived, not read: an `awk` pass over the file's three blocks gives `--accent  root` and `--accent-muted  root`
as the only two root-only tokens). Recomputed by WCAG relative luminance against the live `.light` surfaces:

```
--accent #20f2a6  vs --surface-primary  #F8FAFC : 1.40:1
--accent #20f2a6  vs --surface-secondary #FFFFFF : 1.47:1
--accent #20f2a6  vs --surface-elevated  #FFFFFF : 1.47:1
--accent #20f2a6  vs dark --surface-primary #0D1117 : 12.90:1
```

Loop 68's diff (`git show 9067380`) includes these three lines:

| Site | Before | After | Role | Floor | Actual (light) |
|---|---|---|---|---|---|
| `AdminOperationsDashboard.tsx:725` | `text-[var(--accent,#20f2a6)]` | `text-[var(--accent)]` | MRR estimate, `text-[20px] font-semibold` | **4.5:1** — 20px at weight 600 is neither ≥24px nor ≥18.66px bold | **1.40:1** |
| `KpiTile.tsx:30` | `text-[var(--accent,#20f2a6)]` | `text-[var(--accent)]` | accented KPI value, `text-[28px] font-semibold` | 3:1 (large text) | **1.40:1** |
| `LensSwitcher.tsx:129` | `border-[var(--accent,#16a34a)]` | `border-[var(--accent)]` | **active-tab indicator**, `border-b-2` on `role="tab"` | 3:1 (SC 1.4.11, state) | **1.40:1** |

The rewrites are individually correct — the fallbacks were dead and `#20f2a6` was already rendering. The
defect is that **loop 68 touched all three lines and measured none of them**, while the whole subject of the
loop was that a colour written in the source is not the colour on screen.

`LensSwitcher.tsx` is the sharpest instance. Loop 65 fixed line **125** of that file — the focus ring — on
MR-036's S-2. Line **129**, in the same `className` array four lines below, is the active-state border and it
is on `--accent`. It was edited at loop 68. Three loops, two reviews, one array.

**And it is now unrowed.** #233 closed at loop 68. #237 covers the **fifteen phantom tokens** — `var(--X, lit)`
where `--X` is defined nowhere. `--accent` **is** defined, so it is outside #237's set by construction. The row
text confirms this: #237's enumerated set is the five `--opp-*`, both `--severity-*`, `--content-disabled` and
`--accent-subtle`. `--accent` appears in neither an open row nor a closed one's residual.

### S-2 — SHIPPED. The zero-pixel claim is false, and the CHANGELOG states it to the CEO one bullet after its own counterexample.

The claim, `ITERATION_LOG.md` loop 68: *"**Every rewrite is provably zero-pixel**, which is what made a 73-site
sweep safe … The proof is in the semantics, not in my hoping."* `CHANGELOG.md`, under **Worth saying plainly**:
*"**None of this changes how anything looks.**"*

Two sites in the same commit contradict it, and the entry describes both as visual fixes:

**(a) `AnalyticsConsent.tsx:67`** — `hover:bg-[var(--surface-tertiary)]` → `hover:bg-[var(--surface-elevated)]`.
Before: `--surface-tertiary` is undefined with no fallback, so the declaration is *invalid at computed-value
time*; `background-color` is not inherited, so it resolves to its initial value, **`transparent`**. The hover
rule therefore *overrode* the button's base `bg-[var(--surface-secondary)]` and the button went **transparent on
hover**. After: it goes to `--surface-elevated`. That is a pixel change in both themes, by intent. It is also a
correction to the entry's own diagnosis, which says the button *"has had no hover state at all."* It had one,
and it was worse than none.

**(b) `ColumnPicker.tsx:351`** — `hover:bg-[var(--surface-tertiary,var(--surface-secondary))]` →
`hover:bg-[var(--surface-elevated)]`. Before it rendered `--surface-secondary`; after, `--surface-elevated`.
Light: `#FFFFFF` → `#FFFFFF`, no change. **Dark: `#161B22` → `#1C2128`, a change.**

**Is the claim sound in principle?** For the other 71 sites, yes, and the argument is genuinely a proof rather
than an assertion: dropping a fallback from a defined token cannot change the cascade, and inlining a phantom's
fallback cannot change it either, because in both cases the rendered value was already fixed. That is the right
kind of argument for a 73-site sweep and it is why the sweep was defensible. The error is stating it
**universally** when the commit contains two deliberate exceptions the author had already identified.

**Is the verification adequate to it?** No, and not marginally — **structurally**. The repo has *zero*
pixel-diff coverage, by an explicit decision: `e2e/app/dashboard/visual-evidence.spec.ts:17` reads *"It is
deliberately NOT `toHaveScreenshot` pixel-diffing."* `grep -rn "toHaveScreenshot\|toMatchSnapshot" e2e` returns
that comment and nothing else; `find e2e -name "*-snapshots"` returns nothing. The 26 e2e assertions are axe
scans plus one request count. **Nothing in the estate can falsify a zero-pixel claim.** So the claim rests
entirely on the semantic argument, which means the semantic argument had to hold for all 73 — and the author
knew it did not for 2.

**What would have been adequate**, in order of cost:
1. **Free, and it is the honest version:** state the claim as *"71 of 73 are provably zero-pixel; 2 are
   deliberate visual fixes, here they are."* The proof is unchanged; the sentence stops being false. The
   CHANGELOG bullet becomes *"Two of these change how something looks, on purpose — see above."*
2. **Ten minutes:** the two exceptions are hover states on two named elements. `page.hover()` +
   `getComputedStyle().backgroundColor` in the existing dashboard e2e, asserting the *new* colour. That
   converts "I fixed the hover" from a claim into a check, and it is the one thing in the commit that can
   regress silently.
3. **Not warranted here:** adding `toHaveScreenshot`. It would have caught nothing the semantic argument
   missed and would have cost a baseline-maintenance regime the repo has deliberately refused.

### S-3 — The guard cannot see `.ts`, and applying its own predicates to those files fails today.

`theme-contrast.test.ts:163`:

```ts
else if (/\.(tsx|css)$/.test(name) && !name.endsWith('.test.tsx')) acc.push(p);
```

Replicating the walk exactly: the guard sees **219 files** and **4756 `var()` uses across 15 distinct tokens**.
It does not see `band-colors.ts`, `confidenceColor.ts` or `process-diff-view.ts` — **19 `var()` uses**, including
the entire Batch-B chart palette and the loop-63 single-source-of-truth for SOP confidence colour.

Applying the guard's own `isDefined` and its two offender predicates to those three files:

```
PHANTOM TOKEN  band-colors.ts: var(--token, ...)      <- the docstring's placeholder
DEAD FALLBACK  band-colors.ts: var(--accent, ...)     <- the docstring's example
-> 2 offender(s) the shipped guard cannot see
```

Both are inside a block comment. That matters for the fix, not for the finding — and it exposes a second,
smaller discrepancy: **the loop-68 entry claims two regex repairs and the code implements one.** The entry:
*"Anchored the name to a following `,` or `)` **and skipped block comments**."* The code (`:258`) is
`/var\(\s*(--[a-z][a-z0-9-]*)\s*(?:(,)|\))/g` and there is no comment-stripping anywhere in the module; the
in-file comment at `:255-257` correctly describes only the anchor. So the entry over-reports the fix, and the
two holes currently conceal each other: comment prose *would* be flagged, but the file is not read.

Widening the filter to `/\.(ts|tsx|css)$/` is a two-character change and **it fails today**, which is the
correct state — because the thing it would flag is a docstring that is false (S-4).

### S-4 — `band-colors.ts` still documents the mechanism its own commit removed.

`band-colors.ts:4-6`, unchanged by `9067380`:

> Every color is expressed as a CSS `var(--token, #hexFallback)` so it resolves to the design-system token
> when defined and to a sensible literal fallback otherwise (matching the admin-operations
> `var(--accent, #20f2a6)` convention).

After loop 68 the file contains five bare hex literals and seven bare `var()` references. **Zero colours are
written `var(--token, #hexFallback)`.** The header is now false about every line beneath it.

The loop-68 commit message quotes this docstring as the evidence: *"`band-colors.ts` states the mechanism in
its own docstring … The file has been documenting an aspiration as though it were a mechanism."* It is now
documenting a removed mechanism as though it were present, which is a strictly worse version of the same thing.

This is the third instance of one class. Loop 55 S-2: *"my correcting commit left the old rule in two JSDoc
comments in the very file it was correcting."* Loop 61 S-1: *"the top of the file contradicted the change made
at the bottom for a full governance cycle, because I never re-read it."* Loop 68: same. **Three times, each
caught by the following review, never by the loop.** I am not proposing a rule for it (§3.5), but it is the one
pattern in this codebase that has now recurred often enough to be predictable, and the check is
`git show <sha> --stat | while read f; do head -20 $f; done` on any file whose *convention* changed.

### S-5 (minor) — The hold-back convention discharged correctly and left its own record standing as a falsehood.

`sop-a11y.spec.ts:117-122` still says the dashboard is not covered in light, gives the reason, names #232, and
ends *"It goes in with its fix."* The fix went in at loop 67; `v2-a11y.spec.ts:578` is the test. The record in
`sop-a11y.spec.ts` now asserts an absence that does not exist, in the file MR-036 §5.2 praised for carrying the
hold.

There is a second-order point in *where* the hold was recorded. MR-036's clause was *"record the hold in the
file the test would live in."* Loop 64 recorded the dashboard hold in the **SOP** spec. It was discoverable by
someone opening `sop-a11y.spec.ts` and invisible to someone opening `v2-a11y.spec.ts` and wondering why there
was no light test. It worked anyway — because the same author returned three loops later — which is exactly the
property the convention exists to not depend on.

---

## 3. Q1 — did the lesson land, or is this self-flattery?

**Ruling: the *timing* changed and the *class* did not. Loop 68 is a genuine method improvement and a fourth
instance of the identical failure, one level up. And MR-036's "no rule" verdict does not just survive — loop 68
is the strongest evidence for it yet produced.**

### 3.1 What genuinely changed

Loop 68 built the detector before touching anything, and let the detector define the scope. That is new and it
is not cosmetic:

- Loops 62, 63, 64 each found the understatement **while doing the work** — by strengthening an assertion, by
  doing arithmetic the scan had not, by enumerating instead of grepping. Recovery, three times.
- Loop 68 found it **before** the work. The row said 21 sites; the guard said 73 across 18 files. Nothing was
  edited until the census existed.

That is a real behavioural change and it should be credited as one. It is also the thing that made a 73-site
sweep tractable at all.

### 3.2 What did not change

MR-036 named the class as *"an instrument's output read as the extent of the defect, when the instrument's
coverage was narrower than the defect."* Loop 68's instrument is a **syntactic** detector: it answers *is this
`var()` telling the truth about which value renders?* The defect is **semantic**: *is the value that renders
readable?* The instrument's coverage is narrower than the defect in exactly the stated way, and loop 68 read its
output — 73 sites, two classes, both fixable by rewriting — as the extent.

| # | Loop | Instrument | Reported extent | Actual extent |
|---|---|---|---|---|
| 1 | 62 (via 61) | a Playwright spec | 4/4 across three modes | the spec never rendered a SOP |
| 2 | 63 | an axe scan | one band failing | three bands failing; fixture had one value |
| 3 | 64 | a backlog row's count | 53 usages, 2 colours | 68 usages, 7 colours, plus a whole CSS layer |
| 4 | 67 | a colour-family grep | the `-400` family | `text-green-600`, a family the row never listed |
| 5 | **68** | **a `var()` syntax detector** | **73 sites, 2 syntactic classes** | **plus `--accent` at 1.40:1 as text and as a tab state, at 3 of the sites it rewrote** |

Note instance 4: loop 67 is already a fifth data point that MR-036 did not have, and the window contains two,
not one.

### 3.3 The uncomfortable part: the correct method was written down *one loop before* it was not used

Loop 67's entry, verbatim:

> I tried to derive the full scope and learned the method does not work. … `text-amber-700` sits on a hardcoded
> `bg-amber-50` chip, so measuring it against the theme surface is meaningless. **Contrast is a property of a
> pair, and the pair only exists at render time.** A foreground-only enumeration over-reports hardcoded chips
> and under-reports composited tints.

That paragraph is the best single piece of reasoning in the window. Loop 68 then performed a **foreground-only
enumeration over colour tokens** and drew its conclusions from it. The lesson was not merely un-generalised — it
was published, in the immediately preceding entry, by the same author, and then not applied.

That is the answer to *"is this a real behavioural change or am I flattering myself?"* The honest reading is:
**the practice is improving (detector-first), the diagnosis is not being carried forward across loops.** Each
loop learns the previous loop's lesson and applies it to the previous loop's shape.

### 3.4 Why MR-036's "no rule" verdict now holds *more* strongly

MR-036 declined the proposed rule ("before closing a row citing a count or a location, independently re-derive
it") on the argument that it would not have caught the one instance that escaped, because loop 64 **did**
re-derive the count and still shipped S-2.

Loop 68 pushes that argument further than MR-036 could. Loop 68 did not merely re-derive — it **built a
purpose-made instrument, ran it before touching code, disbelieved its own regex when the output looked wrong,
and corrected it.** That is the maximal form of compliance with the rule under consideration, and the same
class of defect shipped anyway. A rule mandating re-derivation is now demonstrably satisfiable in full while
the failure recurs. **Do not add it.** MR-036 was right and loop 68 is the proof.

### 3.5 What to do instead — and it is a mechanism, not a rule

The reason five instances have not produced a durable fix is that **each guard is built to the shape of the
last defect**, and the class migrates one level up each time: a spec that rendered nothing → a fixture with one
value → a grep with one shape → a fallback vs a definition → a syntax check vs a semantic defect. Every guard is
correct; every guard is the previous lesson calcified.

The countermeasure that fits this codebase's idiom is not a process control — it is **extending the guard that
already exists from syntax to semantics**, which is 20-30 lines and uses only functions already in the file:

> For every `var(--X)` appearing in a `text-…`, `border-…` or `ring-…` position, resolve `--X` against
> `globals.css` per theme and assert the applicable floor with `worstAgainstSurfaces` — 4.5:1 for `text-`,
> 3:1 for `border-`/`ring-`.

`contrastRatio`, `token`, `worstAgainstSurfaces` and `sourceFiles` are all already there. **It fails today, on
the three sites in S-1.** That is the point: it converts MR-036 §3.4's habit — *measure at the layer that
renders* — into something that cannot be forgotten by the next loop, without spending a `CLAUDE.md` control.

Its known limit, and it must be stated in the file or the guard becomes the next instrument read too widely:
this measures a foreground against **theme surfaces**, which is precisely the method loop 67 proved invalid for
hardcoded chips. So it is sound only for `var()` foregrounds on `var()` surfaces, and it must say so. A guard
that knows its own coverage is the thing none of the last five has had.

**Recorded as an MR-level recommendation. Not proposed as a `CLAUDE.md` control. Not endorsed as a loop of its
own** — it is ~25 lines and belongs folded into whichever loop next touches colour.

### 3.6 MR-036 §8.5's prediction, scored

MR-036 wrote: *"A prediction, so it can be checked against me at MR-037. The next instance of the Q1 pattern
will be in the `@layer components` / design-token layer again, not in a backlog count — because that is where
authoring and rendering are furthest apart … If MR-037 finds it somewhere else, my §3 root-cause naming was too
narrow."*

**Correct.** S-1 is in the design-token layer, on `--accent`, which §2 of MR-036 had already censused at 21
sites. The root-cause naming stands.

---

## 4. Q2 — adversarial audit of `theme-contrast.test.ts`

**Verdict: it is not a subtler loop 57. It is a real guard that I verified fires, and its coverage is
materially narrower than the two closed rows it is now load-bearing for. `ALLOWED_LITERALS` is a legitimate
mechanism whose central claim is inert.**

I ran it: **24/24 pass.** I re-derived every number it asserts from `globals.css` independently. Nothing it
asserts is wrong.

### 4.1 Why it is not the loop-57 failure

Loop 57's spec reported 4/4 while rendering nothing. Three properties here rule that out:

- **It reads the artefact the browser reads.** `CSS = readFileSync(join(__dirname,'globals.css'))` (`:35`).
  Not a restatement of hex values, which the header calls out at `:19-22` as *"the same class of mistake one
  level down."* Correct, and it is why loop 65's sabotage test (revert the token, watch it fail with the exact
  ratio) works.
- **`token()` throws on absence rather than defaulting** (`:69-77`). A missing token is a failure, not a pass —
  which is the `--status-info` near-miss encoded as a check.
- **Two explicit anti-vacuity assertions.** `expect(found.length).toBeGreaterThan(20)` (`:194`) and
  `expect(uses.length).toBeGreaterThan(50)` (`:275`), each with a comment naming loop 57. Current actuals: 82
  ring matches, 4756 `var()` uses. These are exactly the guard loop 57 lacked.

That is better hygiene than anything else in the repo's test estate. Credit stands.

### 4.2 What it still cannot see

**(a) `.ts` files — S-3.** 19 `var()` uses, 3 files, 2 live offenders. The single largest hole.

**(b) A second focus-indicator idiom entirely.** The ring regex (`:182`) is
`/focus(?:-visible)?:ring-(\[[^\]]*\]|[a-z]+-\d{2,3})/g`. The codebase also uses **outline-based** focus
indicators: `grep -rno "focus\(-visible\)\?:outline-[a-z]" src` gives **3 occurrences of
`focus-visible:outline-brand-600`** (one of them at `AnalyticsConsent.tsx:67`, a file this very commit edited).
`brand-600` is `#059669` → 3.60:1 light, so **all three pass today.** But the test's name is *"every focus ring
is the token or an explicitly measured literal"* and there are three focus indicators it has never looked at.

**(c) The semantic question entirely.** The guard checks 5 named text tokens plus `--focus-ring`. It does not
check `--accent`, `--accent-muted`, `--content-primary`, `--content-secondary`, `--content-tertiary`, or any
border token against any floor. S-1 is invisible to it. §3.5 is the fix.

**(d) A token defined only in the print block.** `isDefined` (`:260-262`) tests the whole file. A token defined
**only** inside `@media print { .sop-print-root { … } }` would read as defined, the guard would demand its
fallback be dropped, and dropping it would break the token everywhere except print. I checked: no current
instance — the print block's 15 tokens are a subset of `:root ∩ .light`. **Latent, not live**, and worth a line
in the file because the guard's own failure message would confidently instruct the wrong change.

**(e) Two whitespace-dependent slices that widen silently rather than fail.** `:126`:
`CSS.slice(printStart, CSS.indexOf('\n    }', printStart))`. If the print block's indentation changes from four
spaces, `indexOf` returns `-1`, and `slice(start, -1)` returns **everything to the end of the file minus one
character**. `printBody.includes('--focus-ring:')` would then match an occurrence outside the print block and
all six print tests would pass on a body that is not the print block. Same shape at `:72`
(`CSS.indexOf('\n}', start)`). These are the only paths by which this guard can pass vacuously, and they are
reachable by a reformat. One `expect(printStart).toBeGreaterThan(-1)` and one on the end index closes both.

**(f) The print-block test list is hardcoded, so it cannot catch the bug it was written for.** `:128` enumerates
six names by hand. The property it wants is *every theme-dependent token is reset for print* — and that is
**derivable from the file it already parses**. I derived it: 15 tokens differ between `:root` and `.light`; all
15 are present in the print block, so the guard is correct today and checks 6 of 15. A sixteenth token added to
`:root` and `.light` and forgotten in print — the exact `--status-info` near-miss the comment at `:121-123`
cites as the reason the test exists — **passes.** Deriving the list is three lines and makes the test
self-maintaining.

### 4.3 `ALLOWED_LITERALS` — a legitimate mechanism whose evidence is decoration

```ts
const ALLOWED_LITERALS: Record<string, number> = {
  'red-500': 3.6,     // #EF4444 on #F8FAFC — destructive actions, a deliberate signal
  'brand-600': 3.6,   // #059669
  'blue-500': 3.52,   // #3B82F6
};
```

**It is not a hole in the sense you are worried about.** It is closed-form (three entries, not a pattern), the
consuming test (`:214-219`) fails on anything not in it, and MR-036 §8.3 struck loop 64 precisely for *not*
recording these sites — so the list is a direct discharge of a prior strike. Adding to it requires editing the
test, which is visible in review. That is a legitimate exception mechanism.

**What is not legitimate is the justification for its shape.** The docstring says:

> Adding to this list should require measuring, which is why the number is part of the entry rather than a
> comment beside it.

The number is **never read**. The only use is `!(raw in ALLOWED_LITERALS)` at `:216` — a key test. A
`Record<string, number>` whose values nothing consumes has exactly the enforcement power of a comment; it is a
comment in a typed costume. Nothing asserts the recorded ratio is still true, so if `--surface-primary` in
`.light` is lightened, all three silently become wrong and the guard stays green.

I recomputed all three against the live stylesheet:

```
red-500   #EF4444 : 3.60:1  | allowlist records 3.6  | passes 3:1
brand-600 #059669 : 3.60:1  | allowlist records 3.6  | passes 3:1
blue-500  #3B82F6 : 3.52:1  | allowlist records 3.52 | passes 3:1
```

**All three are exactly right today.** So this is not a defect — it is the one place in the file where a claim
is presented as measured evidence and is not checked, in a file whose entire thesis is that unchecked claims
are the problem. The fix is four lines and uses `worstAgainstSurfaces`, which is already imported into scope:
store the hex, recompute, assert ≥ 3.

**So: a subtler loop 57?** No. Loop 57's spec asserted nothing about anything. This asserts true things about
real files and fires under sabotage in both directions, verified twice. It is something else and more
ordinary — **a guard whose scope is narrower than the claim made for it**, which is the same gap as S-1 in the
tooling layer rather than the colour layer. `SYSTEM_HEALTH.md:15` says *"Guard extended from focus rings to
every `var()`"*. It is extended to every `var()` **in `.tsx` and `.css`**, and that qualifier is the finding.

---

## 5. Q3 — the zero-pixel claim

Answered in full at **S-2**. In summary:

- **Sound in principle for 71 of 73.** The semantic argument is a real proof, not a hand-wave, and it is the
  right instrument for this change: a cascade argument is *stronger* than a screenshot, because it covers
  states no fixture renders.
- **False as stated**, because the commit contains two deliberate visual changes that the same entry and the
  same CHANGELOG describe as fixes.
- **The verification cannot bear on it at all.** The repo has no pixel-diff coverage by explicit design
  (`visual-evidence.spec.ts:17`); the 26 e2e assertions are axe scans plus one request count. So the claim was
  never going to be checked by the suite — which makes the two admitted exceptions the whole of the risk, and
  they are the two things the suite also does not cover.
- **What would have been adequate:** state the exception (free), and add two `getComputedStyle` hover
  assertions for the two changed hovers (ten minutes). Not `toHaveScreenshot`.

One further consequence worth stating, because it is the reason the claim matters beyond pedantry: **`ACCENT`,
`GRID_COLOR`, `AXIS_TEXT`, `TOOLTIP_BG`, `TOOLTIP_BORDER` and `TOOLTIP_TEXT` in `band-colors.ts` are JS strings
consumed as Recharts props, not CSS declarations.** Loop 68 changed them from `var(--x, #hex)` to `var(--x)`.
Wherever Recharts forwards one of these to an SVG **presentation attribute** rather than into `style`, a
`var()` does not resolve and the element renders its SVG default — and before this commit the fallback made
that invisible. I could not run the dashboard to check which path Recharts takes for each prop (§13), and
`HEALTH_BAND_COLOR` is now mixed (`poor`/`fair` bare hex, `good` a `var()`), so the two are not interchangeable
by inspection. **This is the one place where "provably zero-pixel" is not provable from the CSS cascade at
all**, because the values leave CSS. It needs a look at the rendered chart, not an argument.

---

## 6. Q4 — the debt metric: **drop it, and replace it with two numbers the loop cannot write**

### 6.1 The arithmetic, derived per commit

`git show <c> -- IMPROVEMENT_BACKLOG.md`, rows added and struck, not log prose:

| Loop | Commit | Struck | Created |
|---|---|---|---|
| 65 (Mode 3, non-counting) | `4211b3f` | (#230 closure text amended) | **#233** |
| 66 | `9d9daf2` | **#189** | **#234, #235** |
| 67 | `0d74690` | **#232** | **#236** |
| 68 | `9067380` | **#233** | **#237** |
| — | `e67e234` (docs-only, post-68) | — | **#238** |

```
Counted window (66-68):      3 closed / 4 created = 0.75        (floor 0.5)
Including loop 65:           3 closed / 5 created = 0.60
Including #238:              3 closed / 6 created = 0.50        <- exactly at the floor
```

**Two corrections to the framing in your question.** You listed four creations. There are **six** in the
period — you omitted **#233** (loop 65, the non-counting correction) and **#238**, which was filed by
`e67e234` three minutes after loop 68 and appears in no iteration entry. #238 is scored **14**, higher than any
row you listed, and it is a live analytics defect (§12).

**Trailing 10 counted loops (57, 59, 60, 61, 62, 63, 64, 66, 67, 68):**

```
created: 1,0,0,0,1,2,1,2,1,1 = 9
closed:  1,1,0,-1,0,2,1,1,1,1 = 7      (the -1 is #109 re-opened at loop 61)
ratio = 7 / 9 = 0.78                    (floor 0.5)
```

**The deduction that matters, and it is the same one for the fourth review running.** Of the 7 closures, **5**
are rows the coordinator filed inside this window or the adjacent non-counting loop: #228 (57→59), #229
(62→63), #230 (63→64), #232 (64→67), #233 (65→68). Only **#109** and **#189** originated outside.

```
externally-originated closed / created = 2 / 9 = 0.22            <- below floor
```

**Pool level, parsed from each commit** (`grep -cE "^\| [0-9]+ \|"`):

```
loop 64: 120 open   loop 65: 121   loop 66: 122   loop 67: 122   loop 68: 122   +#238: 123
```

MR-036 measured the pool **flat at 120 across ten loops**. It is now **123 — up 3 in four loops.**

### 6.2 The verdict you asked for: change or drop, not recompute

**Drop the ratio. It is not a weak signal; it is a self-referential one, and five reviews of evidence is
enough.**

The policy set a **rate** floor in order to control a **level**. That only works if the denominator is
exogenous. Here both terms are written by the agent being graded: the denominator is what the loop chose to
file, and the numerator is dominated by rows the same loop filed days earlier. The metric therefore reads
**best** exactly when a loop is filing and closing its own findings fastest — which measures throughput on
self-generated work, not debt control. It has passed in every state it has been measured in, across five
reviews, while the thing it was meant to control has done both nothing (flat at 120 for ten loops) and
something (+3 in four). **A control that passes in every state is not a control.**

MR-036 declined to amend it for a good reason: *"the fix would be a number the coordinator grades itself on."*
That objection is decisive against **re-weighting the ratio** — splitting "findings" from "deferrals" is
unfalsifiable by the person splitting. It is **not** decisive against replacing a narrated rate with a
**derived level**, and that is the disanalogy MR-036 did not have available.

**Replace it with two numbers, both computed by a script from the file, neither writable by prose:**

1. **Open-pool level and its 10-loop delta.** Today: **123, +3 over four loops.** `validate-backlog.mjs`
   already parses and counts every row; this is one additional line in its existing output
   (`231 rows, 127 struck` → add `123 open, +3 vs loop 64`). No new tooling, no new judgement, and it is the
   number MR-034, MR-035 and MR-036 all reached for informally when the ratio told them nothing.

2. **Age of the oldest open row that is not CEO-blocked.** This is what the pool level is a proxy for and what
   the ratio cannot express at all: whether the loop is working the queue or working its own recent findings.
   The current answer is stark — parsing birth cells, the oldest open rows are **#29 (loop 013)**, **#41 (017)**,
   **#42/#43/#44 (020)**, **#45/#46/#53 (021)**, **#55/#56/#57 (022)**. That is **~55 loops** on rows that are
   not blocked on anyone. Meanwhile every closure in this window was of a row aged 0-3 loops. The ratio reports
   0.78 on that. The age number reports what is actually happening.

**Both replace narration with derivation, which is the same move the loop-65 guard made on colour: read the
artefact, not the claim about it.** If you want one number rather than two, take the second — the pool level can
stay flat while the queue rots, and the age cannot.

---

## 7. Q5 — the hold-back convention

**Verdict: holding. The loop-64 hold was discharged completely and on time. The convention now has a
demonstrated failure mode — it files a record and has no step that retires it — and there is exactly one hold
outstanding, which you have not lost track of but which is one loop from being stale.**

### 7.1 The loop-64 discharge was complete

| Loop | Hold | Discharged | Evidence |
|---|---|---|---|
| 62 | 3 SOP tests | loop 63 | `grep -c "^test(" sop-a11y.spec.ts`: 1 → 4 |
| 64 | 1 dashboard light test | **loop 67** | `v2-a11y.spec.ts:578`, `test('axe: … populated dashboard, LIGHT theme')` |

And the discharge was better than a return: the fixture at `v2-a11y.spec.ts:589-595` spans all three health
bands **and** sets `portfolioHealthScoreDelta: 4`, with the comment *"The original probe only rendered some of
them, and the whole lesson of #229 and #230 is that a fixture which exercises one branch reports on one branch."*
That is the loop-63 lesson applied pre-emptively — and it paid immediately: the returning test failed on
`text-green-600` in `TopBand`/`SignalFactsRow`, a family #232 never named, because **no fixture in the repo's
history had ever set that field.** The entry's line — *"a ratchet reports on what the fixture renders, and
nothing else"* — is the correct generalisation and it was earned.

Loop 67 also honoured the convention's harder half: it did **not** round up. #236 records the residual
explicitly, including *"Nothing currently catches these — no light-theme axe test covers the admin, demo or seo
surfaces."* I checked that this is true rather than convenient: the badges still under 4.5:1 are on admin, demo
and seo surfaces, and the new light ratchet covers `/dashboard` and the three SOP modes. **The green ratchet is
not sitting over a measured live failure.** That was the single most important thing to verify in this window
and it holds.

### 7.2 The failure mode, and it is new

**The convention has a filing clause and no retirement clause**, and the first discharge exposed it: S-5. The
record at `sop-a11y.spec.ts:117-122` is now false. Add one sentence to the convention —

> …and when the hold discharges, delete or amend the record that described its absence, in the same commit as
> the returning test.

— and it is self-closing. **Recorded as an MR-level convention amendment, not a `CLAUDE.md` control**, on the
same reasoning MR-036 used: it has been followed unprompted for four loops and has two corrections, which is a
correction rate, not a rule gap.

### 7.3 The hold currently outstanding

**One, and it is recorded correctly.** `sop-a11y.spec.ts:143-148`, the Flow View light scan, carries the
loop-65 record naming MR-036 as its cause. That is not a hold — the test **ships and passes**; the comment
explains why it was added late. So on the strict definition there is **no outstanding hold**.

**But there is an outstanding coverage gap of exactly the shape a hold would have, and it is not recorded in any
spec file.** #236 states that admin, demo and seo surfaces have no light-theme axe coverage, and that
*"extending that coverage belongs in the same change or it regresses unseen."* That statement lives only in the
backlog row. `v2-a11y.spec.ts` and `sop-a11y.spec.ts` say nothing about the surfaces they do not cover. By the
convention's own logic — a record in the file that lacks the test — **that gap is currently indistinguishable
from an oversight**, which is the exact condition MR-036 §5.3 identified and loop 65 fixed for Flow View. It is
the same omission, one scope wider.

---

## 8. Q6 — delegation: one in three is not nominal, and the one that happened earned its keep

**Verdict: the control is satisfied, and the delegation was substantive rather than ceremonial — I checked. But
the *reason* given for not delegating has now been falsified once, in loop 68.**

### 8.1 The count

| Loops | Primary |
|---|---|
| 53-64 | coordinator × **12** (MR-036's finding; `a11y-architect` consulted at 63) |
| 65 | coordinator (Mode 3) — **13** |
| 66 | coordinator — **entry states 13 consecutive, "the longest-standing control breach"** |
| 67 | **`frontend-engineer` PRIMARY** — streak broken |
| 68 | coordinator — **1 consecutive** |

Against *"same implementing agent used for 4+ consecutive loops"*: post-68 the count is **1**. **Compliant.**
And loops 66, 67 and 68 each open with a derived three-line `Controls:` block stating Area, agent and extension
as facts — which is MR-036 §7.3 adopted verbatim, one loop after it was written. That is the fastest adoption
of a meta-review recommendation in the record, and it is why this section can be written from the entries
instead of reconstructed.

### 8.2 It was not nominal, and here is the evidence

A delegation is ceremonial if the specialist produces only typing. This one produced **two corrections to the
coordinator's own analysis**, both recorded in loop 67's entry:

1. **The tint measurements.** *"It computed the tint cases independently and we disagreed — which is the useful
   part. It composited over white cards, I used `--surface-primary`. Both surfaces are real.
   `bg-amber-500/15` lands at 4.30 on one and 4.55 on the other."* The disagreement **is** #236's central
   finding: the badge passes or fails depending where it sits, and the row says so instead of picking a number.
   A coordinator working alone would have had one number and no ambiguity to record.
2. **The favourite stars.** *"Its ruling on the favourite stars was right and I had under-thought the question.
   `fill-*` and `text-*` set different parts of a lucide icon; swapping only the stroke would have left a
   two-tone star with the majority of its coloured pixels still at 1.60:1."*

Two substantive corrections on a sample of one. That is a **high** yield, not a nominal one, and it argues the
control is *under*-used rather than gamed.

### 8.3 Where the reasoning fails

Loop 66's stated reason for not delegating: *"the work was a hook refactor with no specialist signal, which is
a reason and not an excuse."* Fair — and loop 66 is the one loop in the window where I would also not have
delegated.

**Loop 68 is a different case and the reason does not transfer.** It was a 73-site colour sweep across 18 files
with WCAG implications on every one, in a codebase that has spent five consecutive loops on contrast. That is a
`frontend-engineer`/a11y shape by any reading, and loop 68's entry gives no reason for keeping it — the
`Controls:` line states the agent count and stops. **And the thing loop 68 missed is precisely what the loop-67
delegation demonstrated a specialist supplies: an independent measurement of a colour against the surface it
lands on.** S-1 is three sites; the agent that caught a two-tone star at 1.60:1 would plausibly have asked what
`--accent` measures at.

So: **not nominal, and not enough.** The record now shows one delegation with a 2-for-2 correction rate and one
un-delegated loop that shipped the class of defect delegation had just caught. The control is being satisfied;
the capability it exists to import is not being used where it has demonstrated value.

---

## 9. Q7 — what else is wrong, including the deliberate calls

Beyond S-1 to S-5:

**9.1 Loop 68's self-criticism of the `MemoryGauge` tests is itself wrong.** The entry: *"Three unit tests
asserted the exact class string including a fallback and had to be updated. Worth noting they are the
mirror-style assertions I have criticised before — they pinned an implementation detail rather than a
behaviour."* `deriveMemoryBarColor(pct: number): string` — its **entire** behaviour is the string it returns.
`expect(deriveMemoryBarColor(0)).toBe('bg-[var(--accent)]')` asserts the function's contract, not a mirror of
it; there is no deeper behaviour available to assert without a renderer. The mirror pattern loop 48 flagged is
a test that *restates the implementation's logic* in the test file and checks the restatement — which is what
`accountCache.ts` was extracted at loop 66 to avoid, correctly. These three are not that. A wrong
self-criticism is a smaller problem than a missing one, but it dilutes a real lesson by attaching it to a case
it does not fit.

**9.2 The `--accent` print gap, pre-existing and now larger.** `--accent` and `--accent-muted` are the only two
tokens defined in `:root` with no `.light` override, and they are also **the only two theme tokens absent from
the `.sop-print-root` reset** (derived: the print block resets all 15 theme-dependent tokens and neither of
these). `#20f2a6` on white paper is **1.47:1**. Whether any `--accent` element reaches the SOP print surface I
did not establish (§13). It is pre-existing, and loop 68 did not make it worse — but loop 68 was the colour
audit, it enumerated `--accent` across 21 sites, and the print block is the one place this codebase has
*twice* nearly shipped an invisible token (`#229`, `#230`). Not a strike. A gap the audit was best placed to
close and did not.

**9.3 Loop 66's TTL is a scope addition, correctly argued and correctly flagged.** #189 asked for one fetch
instead of two. Loop 66 shipped in-flight dedup **plus a 30s TTL**, and the entry's reasoning is the best in
the window: an unbounded value cache *"would have served the first response for the whole SPA session, freezing
`limits.recordings.used` at its page-load value — a real regression for the quota chip."* It then states the
limit honestly — *"It bounds staleness rather than removing it"* — and names the genuine win
(`TrialStatusChip` had **unbounded** staleness because `AppShell` never remounts). MR-036 §11 raised exactly
this as *"the whole risk of the pick"* and required the entry to state which option and why. **It did.**
Recorded as a call I checked and endorse.

**9.4 A strike I drafted and killed.** Loop 66's entry says *"`upload/page.tsx:42` documents a bug where
`any`-parsing meant the usage counter and at-limit lockout **never rendered for anyone**"*, and #234 was filed
rather than fixed. Read in the entry that parses as a live revenue-affecting defect left open for two loops
while the loop did colour work. I read the file: `upload/page.tsx:39-56` now reads
`json?.data?.user?.plan` and `json?.data?.limits?.recordings?.used` with `typeof` guards, and the comment says
*"This **previously** read `data.plan` and `data.uploadCount`."* **It is fixed.** Row #234 states this
correctly; only the iteration entry's tense makes it read as current. **No defect. Killed the strike** — same
two-minute check MR-036 §12.7 recorded, aimed at the same place.

**9.5 The docs-only commit that filed #238 is outside the loop record entirely.** `e67e234` added a score-14
row three minutes after loop 68's commit, with a good commit message explaining why it was not fixed
(*"a meta-review is running and this is product code"*) — which is correct discipline. But it appears in no
iteration entry, in no `Follow-ups:` line, and in no `SYSTEM_HEALTH.md` update, so the loop-68 entry's
*"Follow-ups: 1 created (#237)"* is now understated by one against the tree. **Small, and the fix is one word
in the next entry.** It matters only because §6 is about counts and this is a count that is already wrong the
day it was written.

---

## 10. What the window got right, named because it is why the strikes are small

- **Loop 65 discharged all four MR-036 strikes, and verified the two checkable ones by sabotage rather than by
  reading.** S-1: *"I reverted `--focus-ring` in the light theme back to the broken value and ran the suite.
  All 8 SOP tests passed."* That is the correct way to test a claim about a test, and it converted a review's
  argument into a fact. It also answered the one thing MR-036 could not (§12.3): the Flow View light scan was
  added, **it passes**, so the gap was coverage and not a defect — established rather than assumed either way,
  which is precisely what MR-036 asked for.
- **Loop 68 wrote the detector before the fix.** The row said 21 sites. The detector said 73 across 18 files.
  Nothing was edited until the census existed. That is a method change, it is new, and it is the single most
  valuable thing in the window (§3.1).
- **Loop 68 disbelieved its own regex.** *"My own regex was wrong and the failure output caught it, not me —
  it matched `var(--surface-*)` inside a doc comment and reported three phantom tokens that were never code."*
  Reading a *passing-shaped* output and noticing it was wrong is the habit MR-036 §3.4 named, applied without
  being told.
- **Loop 67 published the invalidity of its own method.** Measuring 67 Tailwind text utilities via
  `resolveConfig`, getting two large numbers, checking one, and reporting *"both numbers are wrong"* with the
  reason — *"contrast is a property of a pair, and the pair only exists at render time"* — is a harder and more
  useful outcome than shipping the sweep those numbers implied.
- **Loop 66 shipped the guard a unit test could not be.** *"a unit test could not have caught this row at all,
  because the old code would have passed it while the page issued two requests."* `account-fetch.spec.ts`
  counts requests in a real browser and was sabotage-verified in both directions.
- **Loop 66 refused to test a mirror.** Faced with `environment: node` and **181 test files, none rendering a
  component**, it extracted the cache logic to `accountCache.ts` rather than restate it in a helper — naming
  the alternative as *"the mirror-drift pattern I criticised at loop 48"* and declining to add RTL mid-row as
  *"a dependency decision that deserves its own merits."* Both calls are right.
- **MR-036 §7.3 was adopted in one loop.** Loops 66, 67 and 68 each open with a derived Area / agent /
  extension line. The ritual D-1 ack is gone. Loop 68's extension line — *"`871e29a`, 25 loops"* — is a date
  and a fact, and `git log -1 -- <the four paths>` confirms `871e29a`, 2026-09-24.
- **Cadence is on time for the first time in four cycles**, and loop 68 flagged it itself.

---

## 11. Control-rule status

| Rule | Status across 66-68 |
|---|---|
| Meta-review cadence (2-3 loops) | **On time.** 3 counted loops since MR-036; flagged by loop 68. Best in four cycles. |
| Area saturation (3 consecutive) | **Held, and checked.** Loop 66 pivoted off `a11y` explicitly. 66 `perf` → 67 `a11y` → 68 `design-system`. Stated in all three entries. |
| Agent rotation (4+ consecutive) | **Cleared at loop 67**, at 13. Now 1. Compliant; see §8.3 for the part that is not. |
| D-1 reverse-portfolio drift | **Ritual retired.** Replaced by the derived three-control line, one loop after MR-036 asked. Extension: `871e29a`, 2026-09-24, verified. |
| Backlog validator | **Clean at zero headroom.** I ran it: `231 rows, 127 struck, 19/19 malformed-row budget used`. Budget fully consumed for a fourth review; the next stray `\|` fails CI. |
| P-11 (verify the row before building) | **HOLDING and strengthening.** Fired at 66 (2 call sites → 5), 67 (wrong colour family), 68 (21 sites → 73, before touching code). Also fired for me, on #234 (§9.4). |
| Follow-Up Debt ratio ≥ 0.5 | **Passing at 0.75 / 0.78 and measuring the coordinator's own filing rate.** Externally-originated closures are 2/9 = 0.22. Pool **120 → 123**. **Fifth consecutive review. §6 recommends dropping it.** |
| One-logical-outcome per loop | **Held.** 67 split (#236); 68 split (#237) and declined to invent token values — the right call, stated. |
| Selection driver logged | **Held 3/3** — `top-score` ×2, `directed` ×1, each with a reason. |
| Hold-the-test convention | **Discharged 2/2 rounds.** One stale record left standing (S-5); one unrecorded surface gap (§7.3). |
| Extension Reliability Invariant | **Guarded but unexercised, 26 loops / 32 commits** since `871e29a` (2026-09-24). #216 remains the only lever and is CEO-blocked. |

---

## 12. Loop 69 endorsement

### PRIMARY: **#238 — the upgrade funnel counts one prompt surface in four — `web-app / analytics`**

**One line:** it is the highest-scoring open row (**14**), it is the only defect in the pool that is currently
**producing a wrong number the business acts on**, and the fix already exists unused at
`UpgradeCTA.tsx:50`.

Verified now, not read: `analytics/product/page.tsx:332` defines the funnel as
`['plan_limit_hit','upgrade_prompt_viewed','upgrade_clicked','checkout_started','subscription_created']`.
`upgrade_clicked` fires from four surfaces (`teams/page.tsx`, `RecordingQuotaChip.tsx:52`,
`WorkflowRow.tsx:346`, `UpgradeButton.tsx:47`); `upgrade_prompt_viewed` fires from one (`teams/page.tsx:77`).
**The denominator is missing ~3/4 of its impressions and the error flatters the product** — prompt→click reads
far better than it is, on a number used to price and to decide conversion work. That direction is the one that
does not get questioned.

It also pivots Area cleanly off two consecutive design/a11y loops, and it is continuous with #235 (which is how
it was found) without being blocked by it.

**Three conditions, and the row states two of them:**
1. **Double-counting is the real risk.** The quota chip and health gate re-render on state changes; a naive
   mount effect over-counts the denominator and swings the error the other way. Fire once per prompt-instance
   per page view.
2. **Check the historical data after.** If prompt→click exceeds 100% in the existing series, that confirms the
   defect and dates it — which is worth more than the fix, because it tells you which past decisions were made
   on it.
3. **Not in the row, and it is the P-11 item:** `UpgradeCTA` is unrendered (#235), so "adopt it at three
   surfaces" is a component-adoption change and not an event addition. Decide first whether the event moves
   to the three existing CTAs or the three CTAs move to `UpgradeCTA`; the second is larger than the score.

### NEXT, and it is small enough to fold in anywhere: **the three `--accent` sites (S-1)**

Not a row today, which is the problem. `AdminOperationsDashboard.tsx:725`, `KpiTile.tsx:30`,
`LensSwitcher.tsx:129` — all at **1.40:1** in light, all on `--accent`, all edited by loop 68. Either give
`--accent` a `.light` value or move these three to `--brand-text` (which is `#047857` light, 5.2:1, already
per-theme and already guarded). **File it before you fix it** — it is the only S-class finding here with no row,
and #233 closed over it.

**Fold in with whichever loop takes it**, minutes not a loop:
1. **Widen the guard's file filter** to `/\.(ts|tsx|css)$/` (S-3) — and fix `band-colors.ts:4-6` (S-4), which is
   what widening it will flag.
2. **Retire the stale hold record** at `sop-a11y.spec.ts:117-122` (S-5) — one comment, now false.
3. **Two `expect`s on the print-block slice bounds** (§4.2(e)) — closes the only vacuity path in the guard.
4. **Make `ALLOWED_LITERALS` recompute** (§4.3) — four lines, uses `worstAgainstSurfaces`, already in scope.

### NOT endorsed, with reasons

- **#237** (score 9) — it is the right row and it is a **design decision with real colours in it**, correctly
  refused by loop 68. It needs a palette, not a loop. Leave it until someone decides the tokens.
- **#236** (score 10) — blocked in practice on the same decision (per-theme tints) and on light coverage for
  admin/demo/seo, which the row says must land in the same change. Larger than it scores.
- **#234 / #235** — #235 is *"find out how gating is really enforced"*, which is investigation with an unknown
  bottom; #234 is genuinely small but is the third `any`-parsing instance in one neighbourhood and would be
  better taken with #235 once gating is understood.
- **#216 shadow-DOM** — CEO-blocked, 40 loops. Still the only lever on the extension invariant. §14.
- **#57 criterion 3** — not actionable by a loop; it is a decision. §14.
- **#94, #225, #107, #108** — unchanged from MR-036: blocked, decision-gated, or roadmap.
- **§3.5's semantic extension to the guard** — ~25 lines, fails today on the three S-1 sites. **Fold in, do not
  spend a loop on it.**

---

## 13. What I could not verify

1. **Test counts.** *"web-app 3231"*, *"a11y + account e2e 26/26"*. Mode 4 — I ran only
   `theme-contrast.test.ts` (**24/24**, verified). The e2e arithmetic reconciles by reading
   (dashboard 16 + SOP 9 + account-fetch 1 = 26); the run does not.
2. **Whether `band-colors.ts`'s `var()` strings resolve in every Recharts prop.** §5's closing point. Recharts
   forwards some colour props to SVG presentation attributes, where `var()` does not resolve, and loop 68
   removed the fallbacks that made that invisible. This needs the rendered chart, and I could not run one
   without mutating `test.db` mid-review. **It is the one part of the zero-pixel claim that the CSS cascade
   cannot settle.**
3. **Whether any `--accent` element reaches the SOP print surface.** §9.2. `--accent` is absent from
   `.sop-print-root` and measures 1.47:1 on paper. I established the gap, not its consequence.
4. **Whether the light theme's admin, demo and seo surfaces currently pass axe.** #236 says they are
   uncovered, and I verified no spec covers them; I did not scan them.
5. **The `AnalyticsConsent` hover analysis** is derived from the CSS spec (a `var()` with no fallback and an
   undefined custom property is invalid at computed-value time; `background-color` is non-inherited, so it
   resolves to `transparent`), not from a browser. The conclusion — that the old hover was *inverted* rather
   than absent — follows from the spec and I did not observe it. It does not affect S-2, which stands on the
   change being visual either way.
6. **A near-miss, recorded in the same spirit as MR-036 §12.7.** My first probe reported every token in every
   `.ts` file as a phantom, which would have been a catastrophic finding about `isDefined`. It was **my
   heredoc**, which ate a backslash and turned the guard's `` `\\${n}\\s*:` `` into the literal `${n}\s*:`. I
   rebuilt the probe with `String.raw`, confirmed `isDefined('--accent') === true` and
   `isDefined('--opp-automate') === false`, and the real finding shrank from 19 offenders to 2. **The guard's
   `isDefined` is correct.** Reported because the wrong version was one paste from being S-1.

---

## 14. CEO decisions — surfaced only, nothing applied, no `CLAUDE.md` edit

Ordered by staleness. Items 1, 2 and 5 were on MR-034's and MR-036's lists and are **restored here for the
third and fourth time**; none was surfaced in loops 65-68 (`grep -in "criterion\|#57"` over the four entries
returns nothing).

1. **#216 — shadow-DOM capture semantics. ~40 loops blocked.** The standing fact, as a date: *a shipping Chrome
   extension, under a hard `CLAUDE.md` reliability invariant that records two prior capture-pipeline
   regressions, has had no source change since `871e29a`, **2026-09-24** — 32 commits and 26 loops ago — and is
   green in CI but unexercised by use.* **Fourth consecutive review to ask. Decide it, or declare the extension
   frozen for this phase and record that**, which would also retire the third line of the per-loop controls
   block.
2. **#57 criterion 3 — the chip-click-rate threshold. UNSCOREABLE since loop 48 = 20 loops.** MR-034 called it
   *"the oldest blocking decision in the set"* at six. It blocks #57 retirement and leaves loop 46's
   instrumentation inert. **Absent from MR-035, restored by MR-036, absent from loops 65-68. Restored again.**
3. **#190 / #193 — MR-020 C1-C3 and MR-021 P-1/P-2**, both `awaiting CEO approval (edits CLAUDE.md)` since
   mid-September. C2 is the cadence control, which this cycle finally met on its own.
4. **#191 — Stripe card trial stacking on the reverse trial, charging with no in-app warning.** Awaiting a
   pricing decision; ~55 loops.
5. **#212 — P-6: enforce or retire.** MR-033, MR-034 and MR-036 all asked. **Fourth ask.** A rule silently
   overridden by the standing "don't stop until complete" directive is worse than no rule.
6. **#225 — `TRUSTED_PROXY_HOPS`.** Still one number read off `/api/admin/operations` and one variable set.
   Auth rate limits remain header-bypassable until then.
7. **#107 — blocked, security review required** since loop 48.
8. **Arising from this review — the Follow-Up Debt metric.** §6 recommends **dropping the ratio** and adding
   two derived numbers to `validate-backlog.mjs`'s existing output: open-pool level with its 10-loop delta, and
   the age of the oldest open row that is not CEO-blocked. This is the first time a review has proposed
   removing rather than reinterpreting it, and the argument is that both replacements are computed from the
   file rather than narrated — which answers MR-036's objection. **Your call; nothing applied.**
9. **Arising from this review — the semantic guard extension** (§3.5). ~25 lines in a file that already has
   every helper it needs. **It fails today on three sites.** Fold in or decline.

**Three governance observations, stated rather than proposed** (all entry- or test-writing habits, no
`CLAUDE.md` edit): a discharged hold should retire its own record in the same commit (§7.2); a guard should
state its own coverage in the file, because five consecutive instruments have been read wider than they measure
(§3.5); and when a commit changes a **convention**, the file headers that describe that convention are the
first thing to re-read — three instances now (§S-4).

---

## 15. Verdict

**This is a better window than MR-036's, and it contains the same defect for the fifth time in a better
disguise.**

The method genuinely improved. Loop 68 built the detector before the fix and let it set the scope, which is a
change of kind and not of degree, and it turned a 21-site row into a 73-site census before a line was edited.
Loop 67 discharged the loop-64 hold on time, delegated for the first time in fourteen loops, and was corrected
twice by the specialist it delegated to. Loop 66 refused to test a mirror and verified a request-count fix in a
browser because it said, correctly, that a unit test could not. Loop 65 discharged four strikes and verified two
of them by reverting the fix and watching the suite stay green. MR-036's §7.3 recommendation was adopted in one
loop. The cadence was met for the first time in four cycles.

**And the defect recurred anyway, one level up, exactly where MR-036 predicted it.** The instrument was
syntactic — *does this `var()` tell the truth about what renders?* The defect was semantic — *is what renders
readable?* Loop 68 read the instrument's 73 as the extent, and in the course of rewriting those 73 it pinned
nineteen sites to a colour it had measured at **1.40:1** three loops earlier and called *"the worst value in the
application"* — including the admin dashboard's MRR figure, every accented KPI number, and the active-tab border
of the lens switcher, four lines below the ring that MR-036 struck. The correct method was written down in loop
67's entry — *"contrast is a property of a pair, and the pair only exists at render time"* — and not applied in
loop 68.

**So: a real behavioural change, and not the one that would have helped.** The answer to your first question is
that you are not flattering yourself about detector-first — it happened, it worked, it is new. You are
flattering yourself about what the detector detects.

**On the rule: MR-036's "no rule" verdict does not just survive, loop 68 is the strongest argument for it yet.**
A rule saying *re-derive before closing* is now demonstrably satisfiable in its maximal form — build the
instrument, run it first, disbelieve its output, correct it — while the failure recurs unchanged. What is
missing is not compliance. It is that each guard is built to the shape of the last defect and the class migrates
one level up each time. The fix is twenty-five lines inside the guard that already exists, not a control.

**Five strikes, none reaching a user through a functional failure, three live in code** (S-1's three sites, S-3's
filter, S-4's docstring). **One false claim in the CHANGELOG**, contradicted by the bullet above it. **No rule
change proposed, and none is needed.** What failed is the same thing that has failed for five reviews: the layer
a value is *authored* in keeps being mistaken for the layer it *renders* in — and this time it failed inside the
guard built to stop exactly that, because the guard reads the file and the defect is in the eye.

---

*MR-037. Mode 4, governance only, NON-counting. No product code changed. No `CLAUDE.md` edit proposed.
`IMPROVEMENT_BACKLOG.md`, `ITERATION_LOG.md`, `CHANGELOG.md` and `SYSTEM_HEALTH.md` untouched.*
