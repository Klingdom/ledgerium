# Template 03 — Decision-Based ("The Executive / Triage SOP")

**Template type:** `decision_based`
**TS interface:** `DecisionSOP` in `packages/process-engine/src/templateTypes.ts`
**Renderer:** `renderDecisionBased()` in `packages/process-engine/src/templates/sopTemplates.ts`
**Markdown renderer:** `renderDecisionMarkdown()` in `packages/process-engine/src/templates/markdownRenderer.ts`

---

## Audience-fit justification (one paragraph)

The Decision-Based SOP is for anyone facing a branching workflow with
uncertainty at the top — executives triaging incidents, managers deciding
whether to escalate, incident responders under time pressure, customer-support
leads handling exception cases. It reads like a great decision tree a CEO
keeps on the corner of their desk: initial assessment at the top, the three
or four realistic paths visible on one screen, each with the right next move
already spelled out. It is short enough to absorb in 30 seconds, structured
enough to follow under pressure, and honest enough that a frontline operator
trusts it because they see their edge cases acknowledged. One family with
Operator and Enterprise; one distinctive voice.

---

## A. Template overview

### Goal
Give a reader under time or decision pressure the exact branch logic they need
— no prose, no filler, no hidden paths. Visually favor the one-page answer.

### Intended audience
- Executives and managers making go/no-go calls
- Incident responders triaging a live issue
- Frontline operators facing known exception paths
- Runbook authors documenting "if this then that" playbooks

### Design philosophy
Branch-first. The reader almost never reads cover-to-cover; they jump to the
branch that matches their situation. Structure amplifies that behavior.

### When to use (selector rule)
Selected when:
- `branchRatio ≥ 0.30`, OR
- `decisionPoints ≥ 2 AND errorSteps ≥ 2`, OR
- `hasCommonIssues AND branchRatio ≥ 0.20`
- See `templateSelector.ts::selectSOPTemplate` rule 1.

### When **not** to use
- Linear workflows with no branches → use Operator-Centric.
- Deep regulated compliance use cases → use Enterprise.

---

## B. Section structure

### 1. Title + one-line purpose — **required**

Same as Operator: H1 plus italic one-liner.

### 2. Metadata strip + confidence badge — **required**

Same as Operator and Enterprise (see `DESIGN_SYSTEM.md` §9.1).

### 3. Trigger condition — **required**

The situation that invokes this SOP. One sentence; precise.

**Good:** "A workflow file upload has failed or produced unexpected SOP output."

### 4. Inputs / context needed — **required**

What the reader must have in front of them to make decisions.

### 5. Initial assessment — **required**

The reader's first move — a short checklist that determines which branch
applies. Typically 2–4 checks.

**Formatting:**
```markdown
## Initial assessment

Before picking a path, confirm:
- You have access to Ledgerium AI and the workflow is loaded
- The recording was captured on extension v1.2.0 or later
- You can see either (a) the generated SOP, (b) an error message, or (c) a processing screen

Which of these do you see? Pick the matching branch below.
```

### 6. Decision paths — **required** (the core)

The reason this template exists. One section per branch. Each branch renders as:

```markdown
### Path 1: Standard flow — no errors encountered · probability: high

The recording processed cleanly. Proceed through these steps:

1. Access the Ledgerium web app and sign in.
   ◦ Evidence: ev_01, ev_02

2. Click **Upload workflow** on the dashboard.
   ◦ Evidence: ev_03

3. Select the `.json` file.
   ◦ Evidence: ev_07

4. Wait for the SOP and process map to appear.
   ◦ Evidence: ev_19

> ✓ **Outcome** — a new SOP appears in your library, ready to share.

---

### Path 2: Upload rejected — file validation failed · probability: medium

Trigger: the upload step returned an error.

1. Review the error message in the red banner at the top of the page.
   ◦ Evidence: ev_12

2. Correct the file per the error message and resubmit at step 3 of Path 1.
   ◦ Evidence: ev_13

> ✕ **Outcome** — file re-uploaded; resume Path 1 from step 4.

---

### Path 3: Processing stalled — no output after 5 minutes · probability: low

Trigger: the processing screen has been visible for more than 5 minutes.

1. Open the browser console and check for network errors.
2. If no console error, refresh the page once.
3. If the SOP still does not appear, escalate per the escalation rules below.

> ⚠ **Outcome** — escalated to engineering; do not retry more than once.
```

**Rules:**
- Paths are ordered by observed probability, highest first.
- Each path has a title of the form `Path N: {condition} · probability: {high|medium|low}`.
- Each path has an explicit **Outcome** callout at the end, using the `✓`, `✕`, or `⚠` token to signal whether the path is a success, a failure, or a partial recovery.
- Actions within a path are numbered from 1 within the path (not document-wide).
- Evidence appears per action.

### 7. Escalation rules — **required**

When and how to hand off. Bullet list, each bullet a concrete trigger and
action.

**Good:**
- "If the same error recurs after one retry → escalate to the Ledgerium support team via the in-app chat."
- "If the workflow contains sensitive data and cannot be processed → do not retry; escalate to the data governance lead."

### 8. Exception handling — **required**

Edge cases not covered by the primary paths. A bulleted list of "if X, do Y"
statements.

### 9. Resolution outcomes — **required**

The set of observable end-states that signal the triage is complete.

### 10. Completion criteria — **required**

Same shape as Operator — bulleted list of `✓` items.

### 11. Documentation requirements — **required**

What the reader must record about this triage:
- Which path was taken
- Any deviations from the documented branches
- Outcome timestamp

### 12. Evidence footer — **required**

Standard source footer.

---

## C. Visual / information hierarchy

```
H1 title                                        — 32px
italic one-liner purpose
metadata strip
confidence badge

H2: Trigger condition                           — one-sentence paragraph
H2: Inputs / context needed                     — bulleted list
H2: Initial assessment                          — short checklist

H2: Decision paths                              — the core
  H3: Path 1: happy path · high probability
    numbered actions with inline evidence
    ✓ Outcome callout
  H3: Path 2: error recovery · medium probability
    numbered actions with inline evidence
    ✕ or ⚠ Outcome callout
  H3: Path 3: …

H2: Escalation rules                            — bulleted list
H2: Exception handling                          — bulleted list
H2: Resolution outcomes                         — bulleted list
H2: Completion criteria                         — ✓ bulleted list
H2: Documentation requirements                  — bulleted list

italic source footer
```

**Density note:** Decision-Based is the most visually open of the three
templates. Whitespace between paths is intentional; under pressure, readers
should not feel crowded.

---

## D. Writing rules

### Sentence style
- Second person for decisions ("If you see…, do…"); third person for escalation paths.
- Sentences often under 12 words.
- Active voice always.

### Action verbs
- Same imperative-first rule as Operator.
- Branch conditions always phrased as antecedents: "If {condition}…"

### Role naming
- Responders rather than operators. The reader is someone **making a call**.

### Branch granularity
- 2–5 branches is the sweet spot. More than 5 and the template is wrong; consider
  collapsing similar paths or splitting into multiple SOPs.
- The happy path is always Path 1. Error/edge paths follow in decreasing probability.

### Handling ambiguity
- Low-confidence paths surface the `⚠` glyph and an italic confidence note as
  in Operator.
- If the recorder did not observe a path, phrase it as *"Expected path — not observed in the source recording."* rather than fabricating it.

### Decision phrasing
- Every decision is a yes/no or finite-enum question.
- Enumerate all observed outcomes plus an "otherwise" escalation.

### Navigation instructions
- Same anti-recorder rules as Operator and Enterprise.

### Systems interactions
- Wait steps inside a branch use the `⟳` token if the wait exceeds 3 seconds of expected duration.

### What to avoid
- Open-ended branches ("if something else happens…") — replace with an explicit
  escalation rule.
- Numbered actions spanning multiple paths — resets per-path.
- Hiding the happy path behind the error path. The happy path is Path 1, always.

---

## E. Bad vs good examples

### Example 1 — Buried happy path

❌ **Bad:**
```
### Path 1: Upload rejected — validation failed
### Path 2: Processing stalled
### Path 3: Standard flow
```
✅ **Good:**
```
### Path 1: Standard flow — no errors encountered · probability: high
### Path 2: Upload rejected — validation failed · probability: medium
### Path 3: Processing stalled · probability: low
```
**Why:** under pressure, readers hit Path 1 first. Hiding the success case
insults the reader's time.

### Example 2 — Ambiguous branch condition

❌ **Bad:** "Path 2: If something went wrong."
✅ **Good:** "Path 2: Upload rejected — file validation failed · probability: medium"
**Why:** the good version names the trigger so the reader can match it instantly.

### Example 3 — Missing outcome

❌ **Bad:**
```
### Path 2: Upload rejected
1. Review the error.
2. Fix the file.
3. Resubmit.
```
✅ **Good:**
```
### Path 2: Upload rejected
1. Review the error banner.
2. Correct the file per the error message.
3. Resubmit at step 3 of Path 1.
> ✕ **Outcome** — file re-uploaded; resume Path 1 from step 4.
```
**Why:** every path ends with a visible outcome so the reader knows when they're done.

### Example 4 — Open-ended escalation

❌ **Bad:** "If something else happens, ask someone."
✅ **Good:** "If the same error recurs after one retry → escalate to the Ledgerium support team via in-app chat; include the session ID shown in the browser URL."
**Why:** the good version gives the triager a concrete action and the information they need to hand off cleanly.

### Example 5 — Full-paragraph action

❌ **Bad:** "To resolve the issue, you'll want to make sure that the file is less than 10 megabytes in size and also that it matches the expected schema version 1.0.0, and then you can go ahead and attempt to re-upload it by clicking on the upload button again like you did before."
✅ **Good:**
```
1. Check file size — must be under 10 MB.
2. Check schema version — must be 1.0.0.
3. Re-upload via **Upload workflow**.
◦ Evidence: ev_12, ev_13
```
**Why:** triage readers cannot parse paragraphs. Numbered atomic steps only.

### Example 6 — Fabricated unseen branch

❌ **Bad:** "Path 4: If the workflow contains more than 1000 events, expect a 30-minute processing time. *(Not observed in the recording.)*"
✅ **Good:** *(omit the path entirely, or mark it as expected-but-unobserved:)*
```
### Path 4: Large-workflow processing · probability: low · expected, not observed
Not observed in the source recording. The engine expects this path to apply
when the workflow contains more than 1000 events, but no evidence is cited
for the specific steps below. Verify with a test recording before relying on
this path.

1. Upload the large workflow.
2. Wait for the processing screen to display an estimated duration.
3. Do not retry — wait up to 30 minutes.
```
**Why:** Ledgerium does not fabricate evidence. Either cite source events, or
explicitly label the branch as unobserved.

### Example 7 — Generic completion

❌ **Bad:**
```
## Completion criteria
- The issue is resolved
```
✅ **Good:**
```
## Completion criteria
- ✓ A new SOP is visible in the Ledgerium library
- ✓ The workflow's status in the dashboard is "Ready"
- ✓ The resolution path taken was recorded in the documentation section below
```
**Why:** the good version lists observable end-states that the reader can verify.

---

## F. Rendering contract

- Input: `DecisionSOP`
- Markdown output: `renderDecisionMarkdown()`
- JSON envelope: per `SCHEMA.md` §6

**Invariants:**
1. Path 1 is always the observed happy path.
2. Paths are ordered by observed probability, highest first.
3. Every path ends with a visible Outcome callout using `✓`, `✕`, or `⚠`.
4. Every action within a path has an inline evidence reference (even if one event).
5. Actions within a path are numbered from 1.
6. No open-ended ("if something else") escalation paths.
7. Unobserved branches are explicitly labeled as such.

Unit tests (suggested):
- `Path 1 is the happy path with probability high`
- `every path has an outcome callout`
- `every action has an evidence event`
- `paths are ordered by descending observed probability`
- `no banned recorder artifact strings`
