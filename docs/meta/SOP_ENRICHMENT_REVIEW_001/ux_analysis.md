# SOP Step Followability — UX Design Review

**Type:** Mode 3-adjacent design review (NON-counting; analysis artifact only, zero code changes)
**Date:** 2026-07-12
**Directive (CEO, verbatim):** *"SOP step detail is not good enough for a human to follow. Define what a human ACTUALLY needs in each step to follow an SOP confidently, and design step formats that deliver it from PII-safe captured signals."*

**Builds on, does not repeat:** `docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md` (root-cause map, privacy guardrails, SVR metric, P0-a/b/c execution log) and `docs/meta/SOP_SPECIFICITY_REVIEW/ux_analysis.md` (the 3-signal rubric, 6-tier classification, per-category degradation ladders — already ratified and partially shipped in `sopBuilder.ts`). This review does not re-derive the rubric; it asks a narrower question the prior reviews didn't: **given a step that already clears the rubric's minimum bar, is it actually followable by a human who has never seen the screen?** The answer today is frequently no, because "has an object, a location, and a result" is necessary but not sufficient — a followable step also needs a reader to be able to (a) find the right control when more than one similar control exists, and (b) trust the text enough to act on it without second-guessing every line.

Grounded in: `packages/process-engine/src/sopBuilder.ts` (current instruction/action/outcome derivation, read in full), `apps/web-app/src/components/sop-view/SOPExecutionMode.tsx` + `types.ts` (current rendering), `apps/extension-app/src/shared/types.ts` (`RawEvent`/`CanonicalEvent` contracts), `apps/extension-app/src/content/neighbor-context-extractor.ts` (built-but-unwired signal source), and the normalizer (`apps/extension-app/src/background/normalizer.ts`, confirmed by Grep: `interactionType`, `ancestorPath`, `keyboard_intent`, `state_change_details` are captured on `RawEvent` but **not** carried onto `CanonicalEvent` — only `annotation_text` passes through). No new capture-pipeline changes are proposed here; this review works within PII-safe signals that are either already flowing to the SOP renderer today, or already designed (and privacy-cleared) in the prior review's P1-d/P1-e roadmap.

---

## 1. The Anatomy of a Followable Step

A step is followable when a person who has never seen the application can (1) locate the right screen, (2) find the right control on it without doubt, (3) perform the action, and (4) know whether it worked — all without a screenshot. That requires **six** elements, not the three the specificity rubric already checks for. The rubric's three (object / location / result) are necessary; the three below are what turn "technically specific" into "actually followable":

| # | Element | Question it answers | Rubric coverage today |
|---|---------|---------------------|------------------------|
| 1 | **Action verb** | What do I physically do? | ✅ Covered — imperative voice is already enforced (`Click`, `Enter`, `Submit`, `Select`, `Upload`, `Drag`) |
| 2 | **Target identity** | What do I click/type into? | ⚠️ Partial — present when a DOM label exists; degrades to `"the target element"` / `"the required value"` when it doesn't (see §5) |
| 3 | **Location / where** | Which app, page, or panel is this in? | ⚠️ Partial — application-level (`applicationLabel`) is reliable; page-level (`pageTitle`) is frequently the generic placeholder `"Page"`; **section/modal/table location is never surfaced** — captured by `neighbor-context-extractor.ts` but never wired to the normalizer (RC-2, prior review) |
| 4 | **Disambiguation** | If there are two similar controls, which one? | ❌ **Missing entirely.** No mechanism today distinguishes "the 'Save' button in the toolbar" from "the 'Save' button in the dialog." `ancestorPath` and `role` are captured on `RawEvent.target` but neither reaches the instruction text. This is the single biggest gap between "specific" (per the existing rubric) and "followable." |
| 5 | **Expected result** | Did I do it right? | ⚠️ Partial — `buildExpectedOutcome()` in `sopBuilder.ts:597-630` derives a real result for `fill_and_submit`, `click_then_navigate`, and `send_action`; every other category (including the single most common one, `single_action`) falls through to `completionCondition`, a step-level phrase not tied to the specific click that just happened. |
| 6 | **Screenshot-free visual cue** | How do I recognize it on screen? | ❌ **Missing for everything except click's semantic-role fallback.** `Click the {role}` (button/link/tab/checkbox/…) is the only place a visual/structural cue appears at all — `interaction.input_change`, `interaction.select`, `interaction.submit`, and every system-feedback event skip this entirely. |

**Confidence honesty is a seventh, cross-cutting requirement**, not a separate element: every one of the six above must degrade gracefully rather than fabricate when its source signal is absent (see §3). A step that gets elements 1–6 right but silently guesses at #4 or #5 is *worse* than one that admits it doesn't know — a wrong guess erodes trust in every other step in the SOP, including the correct ones.

### Why "object + location + result" (the existing rubric) is not the same test as "followable"

Take a Tier-2 step under the existing rubric — "has object, has location, no result" — e.g. `Click "Send" in Gmail`. This is followable *only if there is exactly one "Send" in the visible UI at that moment.* If the compose window has a "Send" button and a "Send test" link nearby (a realistic Gmail-adjacent layout), the rubric-passing text is ambiguous in practice. The rubric measures textual completeness; followability requires the text to resolve to a single control **and** tell the reader how they'll know they picked correctly. Disambiguation (#4) and result (#5) are the two elements that convert "grammatically specific" into "actually actionable," and they are exactly the two elements most under-built today.

---

## 2. Four Step-Format Designs

All four designs are shown against the same underlying signals (no new capture required beyond what §1 already documents as available or already-designed). Each is PII-safe by construction: every example below draws only from `applicationLabel`, `pageTitle`/`routeTemplate`, `target_summary.label`/`role`, `isSensitive`, `confidence`, and (where marked "requires P1-e") the already-privacy-cleared neighbor-context fields (`modalTitle` via aria-only, `tableHeader`, `activeTabLabel`, `nearbyLabels`, `routeTemplate`-based breadcrumb — never raw `textContent`/`breadcrumbTrail` per the prior review's §6 guardrails).

### Format A — "Action · Target · Location · Result" structured sentence (recommended default)

**What it is:** A single-sentence template that always states all four core elements in a fixed order, using an em dash to separate the doing-part from the verifying-part. This is the anatomy in §1 made literal and mechanical — if a signal is missing, that clause is omitted (never fabricated), but the *order* and *separator* stay constant so a reader builds a reading habit across 15 steps.

Template: `{Verb} "{Target}" {disambiguation clause} in {App} → {Page/Section} — {Result}`

**Before → After (fixture: `fill-and-submit.json`, real signals present):**
```
BEFORE
"Submit via "Submit Form""
detail: "1. Enter value in "Name"\n2. Enter value in "Email"\n3. Submit Form"

AFTER
Step title:  Submit "Submit Form" in App → Order Form
Detail:
  1. Enter "Name" in App → Order Form
  2. Enter "Email" in App → Order Form
  3. Click "Submit Form" — confirmation banner appears and the record saves
```

**Before → After (fixture: `error-recovery.json`, recovery label "OK" present):**
```
BEFORE
"Handle error in App"
detail: "Handle the error condition to continue the workflow"

AFTER
Step title:  Resolve error — click "OK" in App
Detail:
  1. Error dialog appears in App
  2. Click "OK" — dialog closes and the workflow resumes
```

**Why this is the primary recommendation:** it's the most teachable format — a first-time reader learns the four-clause pattern once and can then scan any step for the piece they need (skimmers read Verb+Target; careful followers read the whole sentence; auditors read only the Result clause). It also makes *omission visible*: when the disambiguation or location clause is dropped because no signal exists, the sentence gets shorter in a way a reader consciously notices ("this one doesn't tell me where") rather than silently degrading in place.

### Format B — Outcome-fused imperative (compact, single-clause)

**What it is:** Instead of a separate instruction line and a separate expected-outcome line (today's two-line pattern — detail text + `expectedOutcome` field rendered in different UI positions), fuse the two into one clause using "to": `{Verb} "{Target}" in {App} to {result}`. This trades disambiguation detail for brevity — best for the **collapsed step card subtitle**, where space is scarce, while Format A remains the expanded-detail format.

**Before → After (fixture: `demo.json`, one-word label "Other"):**
```
BEFORE
Step title:  "Click Other in Gmail"
Detail:      "Click Other to continue"

AFTER (collapsed subtitle, Format B)
Click "Other" in Gmail to select this option

AFTER (expanded detail, Format A — same step, more room)
1. Click "Other" in Gmail — this label may be abbreviated; the option selected
   depends on what "Other" refers to on screen
```

**Why pair B with A rather than picking one:** collapsed cards need scannability across a 15-step list; expanded cards need completeness for the one step a reader is stuck on. Using B for the collapsed header and A for the expanded body means the reader never sees redundant text (today's card literally repeats the same sentence at 100% and 90% length in the collapsed subtitle and the first detail line — Format B/A pairing removes that duplication by design).

### Format C — Progressive disclosure ("Details ▾" tier)

**What it is:** A second disclosure level *inside* the step card, below the always-visible imperative line. The always-visible line is Format B (verb + target + fused result). A "Where exactly ▾" toggle reveals the Format-A-style location/disambiguation clause plus the confidence-honesty note, for readers who are lost, and stays collapsed for readers who already know the app.

**Before → After (fixture: `spreadsheet-cells.json`, coordinate-only labels):**
```
BEFORE
Step title:  "Enter A16, B16, C16 in App"   [coordinates in title]
Detail:      "1. Enter value in "A16"\n2. Enter value in "B16"\n3. Enter value in "C16""

AFTER — always visible
Enter values in the spreadsheet (App)

AFTER — "Where exactly ▾" (expanded on click)
Cells A16, B16, C16 in the App spreadsheet, in the order shown.
Coordinates are grid references, not field names — check the column headers
in the sheet to confirm you're in the right cells.
```

**Why this format exists:** the current UI already has one disclosure level (collapsed card → expanded card). Format C proposes a *second*, per-detail level, reserved specifically for the two things a confident user doesn't need every time but a first-time/training user needs badly: exact location and confidence caveats. This directly answers a pattern the prior review flagged but didn't solve — `docs/meta/SOP_SPECIFICITY_REVIEW/ux_analysis.md` §3 recommends a breadcrumb be "visible without expanding the evidence card"; Format C's insight is that *not every piece of location detail belongs at the same disclosure depth* — the app name should always be visible (it's cheap and load-bearing), but modal/table/tab-level disambiguation (heavier, denser text) belongs one click deeper.

### Format D — Grouped multi-action steps with location hoisting

**What it is:** For steps with multiple instructions in the same location (the common `fill_and_submit`/`data_entry` case), state the location **once** at the step level, not once per instruction. Instructions become bare Action+Target lines; the Result is stated once at the end of the group, not per line. This is a *within-format* rule, applicable to whichever of A/B/C is chosen as the base sentence style — it governs how repetition is suppressed across a group, not the sentence grammar itself.

**Before → After (fixture: `fill-and-submit.json`, applied on top of Format A):**
```
BEFORE (each line re-derives its own instruction independently — no explicit
grouping rule; location is implicit per-line via the `system` field, not
stated)
1. Enter value in "Name"
2. Enter value in "Email"
3. Submit Form

AFTER — Format D grouping applied
In App → Order Form:
  1. Enter "Name"
  2. Enter "Email"
  3. Click "Submit Form"
  → Confirmation banner appears and the record saves
```

**Why this matters at scale:** a 15-step SOP that repeats "in Gmail" on every single line (today's per-instruction pattern, since `system` is attached per-`SOPInstruction`) trains the reader to skip the location clause entirely by step 4 — the exact failure mode the specificity work is trying to prevent, just relocated from "vague text" to "repetitive text that gets tuned out." Location should be stated at a **transition**, not on every line where it hasn't changed. This is expanded into a general numbering/grouping rule in §4.

---

## 3. Ambiguity and Low-Confidence Handling

**Principle:** an honest "I don't know, please verify" is followable. A vague, hedged sentence that pretends to be specific is not — it fails silently, at the exact moment the reader needs the SOP most (a novice, or a stressed-out operator during an incident). The system's job is not to eliminate uncertainty (impossible) but to **make uncertainty legible in-line**, at the sentence level, not just as a separate colored dot the reader has to notice and cross-reference.

### The confidence-scaled verb pattern

Today, confidence is tracked (`SOPStep.confidence`, `isLowConfidence` at `<0.7`) and rendered as a small colored dot (`ConfidenceDot` in `SOPExecutionMode.tsx:731-741`) plus a separate `outcomeObserved` badge ("Inferred" vs plain) on the *expected outcome* line only. Neither touches the *instruction* text itself — a reader can look right past a red-ish dot and read "Click the target element" as if it were a normal instruction, because grammatically it is one.

**Design rule:** every fallback tier below the "has a real label" tier gets an explicit, short, honest suffix — not a paragraph, a clause — using one of three fixed prefixes depending on what's actually missing:

| Situation | Prefix pattern | Example |
|---|---|---|
| Target unnamed, location known | `— control not labeled; confirm before...` | `Click in Gmail → Inbox — control not labeled; confirm before clicking` |
| Target unnamed, location unknown | `(not confirmed)` badge + honest imperative | `Click the highlighted item (not confirmed) — verify the right control on screen` |
| Result cannot be derived (any category outside fill_and_submit/click_then_navigate/send_action) | `Watch for:` instead of asserting a result | `Watch for: a status change or confirmation message after clicking` |

The third row is the most important addition: today, `buildExpectedOutcome()`'s `default` branch returns `completionCondition` (a step-level phrase computed once for the whole step, not this specific action) with **no signal to the reader that it's a step-level guess rather than an observed fact about this click.** Framing it as "Watch for:" instead of a flat assertion turns a potentially-wrong claim into an honest instruction to look for something — which is true regardless of whether the guess is right.

### Before → After: the known vague fallbacks in `sopBuilder.ts` today

These are the exact strings still reachable in production `deriveInstruction()` (verified by reading `packages/process-engine/src/sopBuilder.ts:238-403` in full — several tiers were fixed under P0-c, several were not):

**`interaction.click`, pageLabel known but no target label** (`sopBuilder.ts:266-268`):
```
BEFORE:  Click the target element on "Inbox"
AFTER:   Click in Gmail → Inbox — control not labeled; confirm before clicking
```
*(This tier was NOT touched by P0-c — P0-c only fixed the fully-generic case one tier below it. "the target element" is still live here today.)*

**`interaction.click`, fully generic** (`sopBuilder.ts:272`):
```
BEFORE:  Click the target element
AFTER:   Click the highlighted item (not confirmed) — verify the right control on screen
```

**`interaction.input_change`, page known but no label** (`sopBuilder.ts:284`):
```
BEFORE:  Enter the required value on "Order Form"
AFTER:   Enter a value on the Order Form in [App] — field name not captured; confirm which field
```

**`interaction.input_change`, fully generic** (`sopBuilder.ts:285-286`):
```
BEFORE:  Enter the required value in [App]  /  Enter the required value
AFTER:   Enter a value in the highlighted field (not confirmed) — confirm which field before typing
```

**`interaction.select`, fully generic** (`sopBuilder.ts:300`):
```
BEFORE:  Select the required option
AFTER:   Select an option from the dropdown — option name not captured; confirm your choice
```

**`interaction.submit`, fully generic** (`sopBuilder.ts:294`):
```
BEFORE:  Submit the form
AFTER:   Submit the form — verify all required fields are complete first
```

**`system.modal_opened` / `system.error_displayed`, always-generic today** (`sopBuilder.ts:353-354,362-363` — these never branch on any signal at all, even when a label exists elsewhere in the step's own events, unlike `buildAction`'s `error_handling` branch which *does* surface a recovery label at the step-summary level):
```
BEFORE:  Dialog opens — complete required action before continuing
AFTER:   A dialog opens — complete the highlighted fields before continuing
         (add: "{modalTitle}" dialog opens... — once P1-e wires modalTitle;
          aria-only per the prior review's privacy guard, never heading.textContent)

BEFORE:  Error displayed — review and correct before continuing
AFTER:   An error appears — watch for a message and correct it before continuing
         (add: recovery-label surfacing already exists at the step-action level
          in buildAction()'s error_handling branch — sopBuilder.ts:571-585 — but
          is not propagated down into this per-event instruction line; the two
          should be reconciled so the detail list and the step title agree)
```
The modal-title and error-text improvements marked above depend on signals the prior review already privacy-cleared but has not yet wired (`neighborContext.modalTitle`, `state_change_details`) — they are noted here as the natural fallback ceiling to design *toward*, not claimed as available today. Everything else in this table uses only signals already present in `CanonicalEvent` today.

### What never appears, under any confidence level

Carried forward from the existing rubric and restated here because it interacts with the honesty pattern above: raw HTML tag names, spreadsheet-cell coordinates *as the primary subject of a sentence*, and category labels (`data_entry`, `single_action`) never substitute for an object. The honesty suffix pattern above is not a license to relax that rule — "click the `<div>` (not confirmed)" is still unusable. The two rules compose: name the best real thing you have (role, or nothing), then mark confidence; never fabricate the "real thing" itself.

---

## 4. Step Grouping and Numbering for Coherent Long Procedures

A 15-step SOP is not 15 independent sentences — it is a single procedure a reader executes start-to-finish, often while their attention is split between the SOP and the live application. Two structural problems compound as step count grows: **numbering collision** (step ordinals vs. per-step instruction numbers) and **location noise** (repeating "in Gmail" on every line, per Format D above).

### 4.1 Two-level numbering, not two competing numbering systems

Today a step card shows an ordinal badge (`step.ordinal`, e.g. `7`) and, inside the expanded detail, a *separately-numbered* instruction list (`1. 2. 3.` — restarting from 1 every step, per `formatDetail()` in `sopBuilder.ts:414-446`). A reader following step 7 who glances away and back can lose track of whether "step 3" means the third *step* or the third *instruction inside* the current step — the two numbering systems use identical typography (`N.`).

**Recommendation:** sub-number instructions relative to their parent ordinal — `7.1`, `7.2`, `7.3` — rather than restarting at `1.` inside every card. This costs nothing (the data already exists as `step.ordinal` + `instruction.sequence`) and removes the collision entirely; a reader can always say "I'm on 7.2" unambiguously, including out loud to a colleague or in a support ticket.

### 4.2 Location stated at transitions, not on every line

Format D (§2) established the per-group rule; the procedure-level version of the same rule is: **only re-state the app/page when it changes from the previous step**, not on every step. Today `step.system` and the per-instruction `system` field are populated independently per step/instruction with no memory of what the previous step said — so a 6-step, single-app procedure says "in Gmail" six times. The fix is a simple state-carry during step-list construction: compare `step[i].system` to `step[i-1].system`; render the location clause only on the first step after a change (including step 1), and drop it (or shrink it to a small persistent breadcrumb chip, not inline prose) on every step where it's unchanged.

**Before → After (6-step single-app procedure, illustrative):**
```
BEFORE
Step 1: Click "Compose" in Gmail
Step 2: Enter "Recipient" in Gmail
Step 3: Enter "Subject" in Gmail
Step 4: Enter "Body" in Gmail
Step 5: Click "Send" in Gmail
Step 6: Verify confirmation in Gmail

AFTER
[Gmail]                                    ← persistent breadcrumb, stated once
Step 1: Click "Compose"
Step 2: Enter "Recipient"
Step 3: Enter "Subject"
Step 4: Enter "Body"
Step 5: Click "Send" — confirmation banner appears, email moves to Sent
Step 6: (folded into Step 5's result — no longer needs its own step)
```
This also surfaces multi-app transitions *more* clearly by contrast — when the location clause DOES reappear mid-procedure, its reappearance is itself the signal that the reader needs to switch windows/tabs, which is exactly the moment they most need to be told.

### 4.3 Phase headings for long, multi-system captures

The view model already computes system-grouped phases for the "Visual" mode (`SOPViewPhase`, `buildPhases()`) but Execution mode — the default, most-used mode — does not use this grouping at all; it renders one flat list of N step cards regardless of length. For procedures that cross 3+ systems or exceed roughly 8-10 steps, reuse the existing phase computation to inject a lightweight section heading between step cards: `"Part 2 — Salesforce"`. This is not a new data source (phases are already derived), only a change in which mode consumes them, and it directly answers the CEO's "reads as a coherent procedure" requirement for long captures — a reader can jump to "Part 3" instead of counting cards.

### 4.4 When to split a step vs. group it

A step with 6+ instructions inside it (a long form fill) should not become 6 individual top-level steps (that inflates ordinal count with no new decision points and defeats Format D's location-hoisting benefit) but also should not stay as one undifferentiated wall of text. The dividing line: **split when a mid-group decision or verification point exists** (e.g., a field whose value determines a later branch, or a submit that could fail); **group when the instructions are a single uninterrupted data-entry pass with one shared result** (the common `fill_and_submit` case). This mirrors the existing `isDecisionPoint`/`decisionLabel` mechanism already in the schema — it just needs to be the explicit criterion coordinators/engine authors use when tuning the segmentation-to-step boundary, rather than an accident of how many DOM events happened to fire.

---

## 5. Summary Table — What Ships from Today's Signals vs. What Needs P1-e

| Anatomy element | Available today (safe, no capture change) | Needs neighbor-context wiring (already privacy-cleared, prior review P1-e) |
|---|---|---|
| Action verb | ✅ full | — |
| Target identity | ✅ when label/role present | `nearbyLabels`/`tableHeader` would fill more gaps |
| App-level location | ✅ full | — |
| Page-level location | ⚠️ frequently generic (`"Page"`) | `routeTemplate`-based breadcrumb (already recommended, never `breadcrumbTrail` textContent) |
| Section/modal/tab disambiguation | ❌ none today | `modalTitle` (aria-only), `activeTabLabel`, `tableHeader` |
| Expected result | ⚠️ 3 of ~8 categories | error-text (`state_change_details`) for honest error-step results |
| Visual/role cue | ⚠️ click only | extend `SEMANTIC_ROLES` pattern to input/select/submit fallbacks (no new signal needed — same `role` field, just unused outside click) |
| Confidence honesty in-line | ❌ dot/badge only, not in sentence text | none — this is a pure text-generation change, no new signal required |

Two rows in this table — **visual/role cue for non-click events** and **confidence honesty in-line** — require zero new signals and zero capture-pipeline changes; they are pure rewrites of existing `deriveInstruction()` branches using data already on `CanonicalEvent` today. They are the highest-leverage, lowest-risk next step if this review is picked up for implementation, consistent with the P0-c precedent (render-layer only, `process-engine` surface, no `apps/extension-app` touch, no Extension Reliability Invariant gate).
