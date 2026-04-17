# Template 01 — Operator-Centric ("The Frontline SOP")

**Template type:** `operator_centric`
**TS interface:** `OperatorSOP` in `packages/process-engine/src/templateTypes.ts`
**Renderer:** `renderOperatorCentric()` in `packages/process-engine/src/templates/sopTemplates.ts`
**Markdown renderer:** `renderOperatorMarkdown()` in `packages/process-engine/src/templates/markdownRenderer.ts`

---

## Audience-fit justification (one paragraph)

The Operator-Centric SOP is for the person who has to *do the work right now*.
A warehouse operator on their Tuesday shift. A new hire on day three. A
customer-success rep helping a teammate recover from a mistake. It is written
in second person, lands in plain language, and shows exactly what "done" looks
like after each step. Everything a frontline user needs to complete the task
correctly is above the fold. A CEO can hand this to a new hire without
embarrassment because it is calm, warm, specific, and unmistakably modern —
closer to a great recipe card than to a compliance document.

---

## A. Template overview

### Goal
Help a frontline user complete a workflow correctly, on their first try, with
minimal ambiguity and maximal reassurance. Every design decision favors
execution speed over governance depth.

### Intended audience
- Frontline workers executing a known process
- New hires being trained
- Customer-success agents recovering from errors
- Anyone who opens the SOP when they are already mid-task

### Design philosophy
Warm. Direct. Confident. Humble about uncertainty. The operator is treated as
a capable adult who wants to get things done, not as a compliance subject.

### When to use (selector rule)
Default template. Selected when:
- Step count ≥ 2 AND branch ratio < 0.30 AND system count < 3 AND no significant friction.
- See `packages/process-engine/src/templateSelector.ts::selectSOPTemplate` rule 3.

### When **not** to use
- When compliance needs to sign off → use Enterprise.
- When the workflow has many branches → use Decision-Based.

---

## B. Section structure

Sections appear in this exact order. Required sections cannot be omitted;
optional sections are rendered only when content exists.

### 1. Title  — **required**

**Purpose:** one-line identification.
**Content rules:**
- Plain-language activity name; no "SOP:" prefix; no version numbers in the title.
- 3–10 words.
- Starts with the business-meaningful noun or verb phrase.

**Formatting:** `# {taskTitle}` — H1, single line, no decorative punctuation.

**Good:** `# Upload and Review Workflow in Ledgerium AI`
**Bad:** `# SOP v2.0: Workflow File Upload Procedure (Final)`

---

### 2. One-line purpose — **required**

**Purpose:** the glance-test answer to "what is this for?"
**Content rules:** one sentence, under 20 words, present tense.

**Formatting:** italic paragraph under the title.

**Good:** *Turn a recorded workflow into a shareable SOP and process map — so the team has a single source of truth for how the work actually happens.*

---

### 3. Metadata strip — **required**

**Purpose:** trust and context at a glance.
**Content:** version, step count, system count, confidence, generation date.

**Formatting:** a single italic line, separator `·`.

**Example:**
> *Ledgerium SOP · v2.0 · 12 steps · 2 systems · 92% confidence · Generated 2026-04-17*

---

### 4. Confidence badge — **required**

**Purpose:** honest signal of how much to trust the SOP.
**Content:** one of three lines (see `DESIGN_SYSTEM.md` §7.3).

**Formatting:** a one-line callout, above the fold.

**Example:**
> ✓ **High confidence** — fully evidence-linked across all 12 steps.

---

### 5. What this is for — **required**

**Purpose:** explain the purpose in 1–3 sentences, not one line.
**Content rules:**
- Business-meaningful benefit, not feature listing.
- Written as if speaking to the reader.
- No compliance language.

**Formatting:** `## What this is for` followed by a body paragraph.

---

### 6. When to use it — **required**

**Purpose:** help the reader decide if they are on the right document.
**Content rules:** 1–2 sentences describing the trigger condition.

**Formatting:** `## When to use it` followed by a body paragraph.

---

### 7. Before you begin — **required**

**Purpose:** prerequisites the user must confirm first.
**Content rules:**
- Bulleted list, 2–6 items.
- Each item is a verifiable precondition, not generic advice.

**Formatting:**
```markdown
## Before you begin
- Access to Ledgerium AI (web app) — you should already be signed in
- The workflow recording file you want to upload (JSON, from the extension)
- 3–5 minutes of uninterrupted time
```

---

### 8. Systems you'll use — **required** (renders only if `systemsNeeded` non-empty)

**Purpose:** orient the reader to the apps they'll touch.

**Formatting:**
```markdown
## Systems you'll use
- Ledgerium AI (web app)
- Your Chrome browser with the Ledgerium extension installed
```

---

### 9. Step-by-step instructions — **required**

**Purpose:** the core content; the reason this document exists.

**Step structure (per `DESIGN_SYSTEM.md` §9.2):**

```markdown
### Step 3: Upload the workflow file

Drag and drop the `.json` file onto the upload area, or click **Choose file**
to browse and pick it.

Performed in: Ledgerium AI

✓ **Expected:** the file name appears in the staging list and a toast
confirms upload started.

◦ Evidence: 2 events · ev_07, ev_08
```

**Writing rules:**
- Step title is imperative ("Upload the workflow file", not "Uploading…").
- First paragraph is 1–3 sentences, plain language.
- "Performed in" line names the system.
- Expected outcome is observable (something the user can see in the UI).
- Optional cautions use `⚠ **Watch for:** …`.
- Evidence row is **never optional** — every step cites events.
- Low-confidence steps append `⚠` to the title.

---

### 10. Common mistakes — **optional** (renders when `commonMistakes` non-empty)

**Purpose:** name the three things that go wrong most, so they don't go wrong here.

**Content rules:** 2–5 bullets, each starting with a verb ("Clicking…", "Skipping…").

---

### 11. Tips — **optional**

**Purpose:** speed up experienced users.
**Content rules:** 1–4 bullets. Each tip saves the reader meaningful time.

---

### 12. Completion check — **required**

**Purpose:** visible proof that the user is done.
**Content:** bulleted list of `✓` items.

**Formatting:**
```markdown
## Completion check
- ✓ The SOP appears in your workflow library
- ✓ The process map shows your recorded steps
- ✓ You can share the workflow with your team via the Share button
```

---

### 13. Source & evidence — **required** (one-line footer)

**Purpose:** the paper trail.
**Content:** session ID, engine version, evidence link.

**Formatting:** italic line, separated by `·`.

**Example:**
> *Derived from session `s_2026_04_17_abc123` by Ledgerium process-engine `v1.2.0` · 34 events · Open timeline: https://app.ledgerium.ai/s/abc123*

---

## C. Visual / information hierarchy

```
H1 title                         — 32px, tight tracking
italic one-liner purpose         — 16px, muted
metadata strip (italic · sep)    — 13px, muted
confidence badge callout         — padded block, colored by tier

H2: What this is for             — content para
H2: When to use it               — content para
H2: Before you begin             — bulleted list
H2: Systems you'll use           — bulleted list

H2: Step-by-step instructions
  H3: Step 1: …                  — with confidence glyph
    body para
    Performed in: …
    ✓ Expected: …
    ⚠ Watch for: … (optional)
    ◦ Evidence: …
  H3: Step 2: …
  …

H2: Common mistakes              — bulleted list (optional)
H2: Tips                         — bulleted list (optional)
H2: Completion check             — ✓-prefixed bulleted list
italic source footer             — one line
```

Rules:
- **Above the fold** = title, purpose, metadata strip, confidence badge, first H2.
- Never more than 3 levels of nesting (H1 / H2 / H3).
- Steps are the densest region; other sections are deliberately spacious.

---

## D. Writing rules

### Sentence style
- Second person ("you"), active voice, present tense.
- 8–15 words average.
- Contractions allowed ("you'll", "don't").
- Sentences end with periods, not ellipses.

### Action verbs
- Start steps with imperative verbs: `Upload`, `Select`, `Enter`, `Confirm`, `Review`.
- Avoid weak verbs: `interact with`, `perform`, `do`, `handle`.

### Role naming
- This template defaults to "you" throughout. Role attribution lives in the metadata
  and in Enterprise/Decision templates. Operator doesn't burden the reader with it.

### Step granularity
- One verb per step. If a step has two verbs joined by "and", split it — unless
  they are one atomic action from the user's perspective ("Drag and drop the file").

### Handling ambiguity
- If a step is low-confidence (<0.70), append `⚠` to the step title and add a
  one-line italic note: *"Confidence: 58% — this step's label was ambiguous in the recording. Verify before continuing."*
- Never hide low confidence.

### Decision points (inline, not full branches)
- If a step is a decision point, follow it with a `◆ Decision:` callout:

```markdown
> ◆ **Decision — did the upload succeed?**
> - **Yes** → continue to step 4.
> - **No** → see the "If the upload fails" note below.
```

- Full branching belongs to the Decision-Based template.

### Navigation instructions
- Never: "Click the div with class `btn-upload`."
- Always: "Click **Upload file** in the top-right corner."
- If the button label is ambiguous, describe its location: "Click the blue
  **Save** button at the bottom of the form."

### Systems interactions
- System-driven steps ("Wait for processing") are legitimate steps, not hidden.
- Phrase them as user-perceivable: "Wait for the spinner to finish — this usually takes 30–60 seconds."

### What to avoid
- Recorder artifacts (see banned strings in `TRANSFORMATION_RULES.md` §5.1).
- Generic completion criteria ("The workflow completes successfully").
- Repeating the title in the purpose.
- Marketing copy.
- Emoji not in the semantic token list (`DESIGN_SYSTEM.md` §6).

---

## E. Bad vs good examples

### Example 1 — Recorder artifact

❌ **Bad:** "Click the div on the page."
✅ **Good:** "Click **Upload workflow** in the top-right of the dashboard."
**Why:** the bad version leaks the recorder's view of the DOM. The good
version names what the user sees and where.

### Example 2 — Ambiguous completion

❌ **Bad:** "Submit the form."
✅ **Good:** "Click **Save workflow**. A green toast appears in the bottom-right confirming 'Workflow uploaded'."
**Why:** the good version tells the user exactly what "done" looks like.

### Example 3 — Technical jargon

❌ **Bad:** "The system will POST the payload to `/api/workflows` and return a 201 with the job ID."
✅ **Good:** "The app shows a processing screen. When it's ready, the SOP and process map appear in your workflow."
**Why:** the reader is not the engineer. Technical detail lives in the evidence footer.

### Example 4 — Compound step

❌ **Bad:** "Enter the workflow name, add tags, assign a team, and click Save."
✅ **Good:**
```
### Step 5: Name your workflow
Type a short, descriptive name in **Workflow name** (for example: *Q2 invoice intake*).
◦ Evidence: 2 events · ev_12, ev_13

### Step 6: Add any tags you want to apply
Select tags from the **Tags** dropdown. You can add or remove tags later.
◦ Evidence: 1 event · ev_14

### Step 7: Save the workflow
Click **Save**. A confirmation toast appears; the workflow is now in your library.
◦ Evidence: 1 event · ev_15
```
**Why:** each step is atomic. The reader always knows what "next" means.

### Example 5 — Hidden uncertainty

❌ **Bad:** "Click the Review button. *(The SOP has 3 low-confidence steps but doesn't mention it.)*"
✅ **Good:**
```
> ⚠ **Heads up** — 2 of 12 steps (steps 7 and 9) have lower label confidence.
> Review those before sharing this SOP with a teammate.

### Step 7: Review the derived process map ⚠
_Confidence: 62% — the recorded event labels were ambiguous._

Open the **Process map** tab and confirm the step titles match what you actually did.
◦ Evidence: 3 events · ev_19, ev_20, ev_21
```
**Why:** Ledgerium's trust promise is honesty about uncertainty. The good
version surfaces it visibly; the bad version breaks the promise.

### Example 6 — Generic purpose

❌ **Bad:** "This SOP describes the procedure for uploading a workflow to Ledgerium AI."
✅ **Good:** "Turn a recorded workflow into a shareable SOP and process map — so your team has a single source of truth for how the work actually happens."
**Why:** the good version tells the reader why they'd bother reading further.

### Example 7 — Weak completion check

❌ **Bad:**
```
## Completion check
- The process is complete
```
✅ **Good:**
```
## Completion check
- ✓ The new SOP appears in **Workflows → Library**
- ✓ The process map shows all your recorded steps in order
- ✓ You can click **Share** to generate a shareable link
```
**Why:** the good version lists things the reader can observe to know they're done.

---

## F. Rendering contract (machine-level)

- Input: `OperatorSOP` (see `templateTypes.ts`)
- Output: Markdown string via `renderOperatorMarkdown()`
- Additional output (proposed): structured JSON with the fields from `SCHEMA.md` §4

**Invariants:**
1. The rendered Markdown always contains, in this order: H1, italic purpose, metadata strip, confidence badge.
2. Every procedure step has an `◦ Evidence:` row.
3. No banned strings from `TRANSFORMATION_RULES.md` §5.1 appear.
4. `completionCheck` renders with `✓` prefix on every bullet.

Unit tests (suggested) in `sopTemplates.test.ts`:
- `renders H1 with taskTitle`
- `renders metadata strip above the first H2`
- `renders confidence badge after metadata strip`
- `every step has evidence events`
- `no banned recorder artifact strings in output`
