# SOP Step Specificity — UX Analysis

Mode 3-adjacent design review. No code changes. Analysis grounded in real fixtures and production code.

---

## 1. Specificity Rubric

A step detail is **specific and reader-actionable** when it contains all three of the following signals. Missing any one of them degrades usability for the person who must follow or train on the SOP.

### The Three Required Signals

**Signal 1 — Object: What to interact with**
The named element, field, button, or control. Not "the element", "the button", "it", or "the target". The name the user would see on screen.

- Specific: "Click 'Send'"
- Weak: "Click the button"
- Unusable: "Click the target element"

**Signal 2 — Location/Context: Where in the application**
The application name, page name, section, modal title, or screen region. This distinguishes the same action across different contexts.

- Specific: "in Gmail, on the Compose modal"
- Adequate: "in Gmail"
- Weak: "in the application"
- Missing: _(nothing — reader cannot locate the control)_

**Signal 3 — Expected Result: What changes after the action**
Navigation, confirmation message, state change, or form submission. This tells the reader whether they performed the action correctly.

- Specific: "the email moves to Sent and the compose window closes"
- Adequate: "the form submits"
- Missing: _(nothing — reader cannot verify success)_

### Tier Classification

| Tier | Has Object | Has Location | Has Result | Example | Reader Experience |
|------|-----------|--------------|------------|---------|-------------------|
| 1 — Specific | Yes | Yes | Yes | "Click 'Send' in Gmail — compose window closes and email moves to Sent" | Fully actionable |
| 2 — Partial | Yes | Yes | No | "Click 'Send' in Gmail" | Actionable, success unverifiable |
| 3 — Located | Yes | No | No | "Click 'Send'" | Actionable if context is obvious |
| 4 — Generic | No | Partial | No | "Click in Gmail" | Locates but doesn't identify |
| 5 — Weak | No | No | No | "Click the button" | Reader must guess everything |
| 6 — Unusable | HTML term | None | None | "Click the target element" | Reader cannot follow |

**Production status:** The current system reaches Tier 1–2 for steps with strong DOM labels ("Click Send in Gmail", "Complete Name, Email and submit in App") and falls to Tier 5–6 for labelless or coordinate-only steps ("Click the target element", "Click action in App", "Enter A16 in App").

### What Never Qualifies as Specific

- Raw HTML tag names as the object (`div`, `span`, `button`, `input`)
- Spreadsheet cell coordinates as the semantic object (`A16`, `B16`)
- Category label as the action (`data_entry`, `single_action`, `error_handling`)
- `"the element"`, `"the required value"`, `"the target"` — these are placeholders, not descriptions

---

## 2. Improved Phrasing Patterns and Degradation Ladders

### Resolving the Title Derivation Design Decision (Architecture Doc L180)

The unresolved question: for a labelless click, should the step title read:
- (A) "Click action in Gmail" — LiveStepBuilder pattern
- (B) "Click element on {pageTitle}" — rules.ts pattern
- (C) "Click button" — rules.ts with role

**Decision: none of these is correct. Use "Click in {applicationLabel}".**

Rationale for rejecting each current option:

- Option A: "Click action" — "action" is a category word, not a verb. It tells the reader nothing beyond "something was clicked". The app context ("in Gmail") is the only useful part.
- Option B: "Click element on {pageTitle}" — "element" is a technical term that SOP readers don't use. When pageTitle is "Page" (the fixture placeholder), this degrades to "Click element on Page" — worse than nothing.
- Option C: "Click button" — gives the element role (useful) but no location context. A reader following step 7 of 15 cannot act on "Click button" without looking at the screen.

**Chosen pattern: `"Click in {applicationLabel}"`**

Why: The application name is the most recognizable contextual signal. "Click in Gmail" tells the reader they are acting in Gmail even when the specific control is unidentified. It's honest (we don't claim to know which element), located (we know which app), and imperative.

When applicationLabel is generic ("App"): fall through to pageTitle. "Click on {pageTitle}" is better than "Click in App". When both are generic, show "Click (element not identified)" with a low-confidence badge — never "Click the target element".

### Degradation Ladders per interactionType

#### interaction.click / single_action

| Level | Condition | Title Pattern | Example |
|-------|-----------|--------------|---------|
| 1 | Semantic label present | `Click '{label}' in {appLabel}` | "Click 'Send' in Gmail" |
| 2 | One-word label (potentially truncated) | `Click '{label}' in {appLabel}` + quotes to signal ambiguity | "Click 'Other' in Gmail" |
| 3 | Element role known, no label | `Click {role} in {appLabel}` | "Click link in Gmail" |
| 4 | App label present, no label or role | `Click in {appLabel}` | "Click in Gmail" |
| 5 | App label is generic ("App"), pageTitle is real | `Click on {pageTitle}` | "Click on Inbox" |
| 6 | Both app and page are generic | `Click (element not identified)` + confidence badge | — |

NEVER produce: "Click the target element", "Click element on Page", "Click action in App"

**Current code path** (in `buildContextLabel` at `humanize.ts:299`): produces "Click action in App" at Level 4–6. Change: use the verb directly ("Click") without "action"; the category label ("Click action") was designed for display, not for title construction.

#### interaction.input_change / data_entry

| Level | Condition | Title Pattern | Example |
|-------|-----------|--------------|---------|
| 1 | Semantic label(s) present | `Enter {label} in {appLabel}` | "Enter Name, Email in Salesforce" |
| 2 | Coordinate-only labels (A16, B16) | `Enter data in {appLabel} spreadsheet` | "Enter data in App spreadsheet" |
| 3 | No label, pageTitle known | `Enter data in {appLabel} on {pageTitle}` | "Enter data in App on Order Form" |
| 4 | No label, only appLabel | `Enter data in {appLabel}` | "Enter data in Salesforce" |
| 5 | All generic | `Enter data (field not identified)` + confidence badge | — |

NEVER produce: "Enter A16 in App" (coordinate-only labels in the title), "Enter the required value"

**Coordinate detection rule**: if `target_summary.label` matches `/^[A-Z]{1,3}\d+$/` (spreadsheet cell reference pattern) OR if `selector` includes `waffle-editor` or `sheets`, suppress the label from the title. The label is still useful in the detail line but not as the primary identifier.

#### interaction.submit / fill_and_submit

| Level | Condition | Title Pattern | Example |
|-------|-----------|--------------|---------|
| 1 | Form label + field labels known | `Submit {formLabel} with {fieldList} in {appLabel}` | "Submit Login Form with Email, Password in Salesforce" |
| 2 | Field labels known, no form label | `Complete {fieldList} and submit in {appLabel}` | "Complete Name, Email and submit in App" _(current behavior — already good)_ |
| 3 | Submit label only | `Submit {submitLabel} in {appLabel}` | "Submit form in Salesforce" |
| 4 | No labels | `Submit form in {appLabel}` | "Submit form in App" |

The fill-and-submit pattern currently works well when labels are present. The fixture "Complete Name, Email and submit in App" is Tier 2 — actionable. Preserve this pattern.

#### click_then_navigate

| Level | Condition | Title Pattern | Example |
|-------|-----------|--------------|---------|
| 1 | Origin label + destination page | `Navigate to {destinationPage} via '{label}' in {appLabel}` | "Navigate to Orders via 'Sidebar' in Salesforce" |
| 2 | Destination page only | `Navigate to {destinationPage} in {appLabel}` | "Navigate to Orders in Salesforce" |
| 3 | Origin label only | `Click '{label}' to navigate in {appLabel}` | "Click 'Orders' to navigate in Salesforce" |
| 4 | No labels, route known | `Navigate to {routeTemplate} in {appLabel}` | "Navigate to /orders in Salesforce" |
| 5 | Nothing | `Navigate in {appLabel}` | "Navigate in Salesforce" |

#### system.error_displayed / error_handling

| Level | Condition | Title Pattern | Example |
|-------|-----------|--------------|---------|
| 1 | Error text + recovery action label | `Handle error: {errorText} — click '{recoveryLabel}' in {appLabel}` | "Handle error: Connection failed — click 'OK' in App" |
| 2 | Recovery action label only | `Dismiss error — click '{recoveryLabel}' in {appLabel}` | "Dismiss error — click 'OK' in App" |
| 3 | Error text only | `Handle error: {errorText} in {appLabel}` | "Handle error: Connection failed in App" |
| 4 | Nothing | `Handle error in {appLabel}` + confidence badge | "Handle error in App" — _(current minimum, acceptable only with badge)_ |

The error_handling category will frequently land at Level 4 because error dialog text is often not captured. This is expected and honest. The badge signals to the SOP reader that this step's detail was derived from context, not direct observation.

#### repeated_click_dedup

| Level | Condition | Title Pattern | Example |
|-------|-----------|--------------|---------|
| 1 | Label present | `Click '{label}' multiple times in {appLabel}` | "Click 'Add Row' multiple times in Airtable" |
| 2 | No label | `Perform repeated action in {appLabel}` | "Perform repeated action in Airtable" |

#### annotation (keyboard shortcut / keyboard intent)

| Level | Condition | Title Pattern | Example |
|-------|-----------|--------------|---------|
| 1 | Key + intent clear | `Press {key} to {intent} in {appLabel}` | "Press Enter to submit in Gmail" |
| 2 | Key known, no intent | `Press {key} in {appLabel}` | "Press Enter in Gmail" |
| 3 | Intent only | `Use keyboard shortcut to {intent} in {appLabel}` | "Use keyboard shortcut to submit in Gmail" |

### Special Case: One-Word Labels ("Other", "Save", "OK")

One-word labels like "Other" are technically present in the DOM but semantically weak. They are frequently truncated UI text, secondary actions without clear naming, or system-generated labels from modal footers.

**Handling:**
- Keep the label but add typographic quotes in both the title and detail: "Click 'Other' in Gmail" (not "Click Other in Gmail")
- The quotes visually signal to the reader that this label may be abbreviated or context-dependent
- Do not fabricate a better label — the reader's mental model of the screen they will see should match what's in the SOP
- In the purpose/expected-result field, add: "The exact action depends on what 'Other' refers to in context at runtime"

Current code gap: `enrichShortTitle()` at `humanize.ts:286` appends "in {system}" but does not add quotes around short labels. This is a one-line change.

---

## 3. Visual Evidence and Breadcrumb Placement

### Breadcrumbs (Implement Now — Display Only)

**What:** A small secondary line below the step title showing the application and page context where the action occurred.

**Pattern:** `{applicationLabel} › {pageTitle}` or `{applicationLabel} › {routeTemplate}`

**Examples:**
- "Gmail › Compose" (applicationLabel + pageTitle, both known)
- "Salesforce › /orders/new" (applicationLabel + routeTemplate when pageTitle is generic)
- "Gmail" (applicationLabel only, pageTitle is generic "Page")

**Where to render:** Directly below the step title, in the evidence area that `deriveStepEvidence()` already populates. The evidence chips already surface applicationLabel and pageTitle in a card view. The change is to also surface them as a styled breadcrumb inline on the step card — visible without expanding the evidence card.

**Why:** A user following step 9 of 15 in a multi-application workflow needs to know at a glance which application they should have open. The breadcrumb provides this without the user having to read the full step detail.

**Implementation note:** `deriveStepEvidence()` already constructs `applicationLabel` and `pageTitle` per step. The view layer just needs to render them as a breadcrumb chip row above the instruction list.

**Priority: High value, low-medium effort** — this is a display-only change with no pipeline changes required.

### Screenshot Thumbnails (Design Spec for Later)

**What:** A thumbnail screenshot captured at each step finalization event, showing the browser state immediately after the action completed.

**Where to render:**
- Collapsed by default as a small thumbnail chip labeled "View screenshot" next to the step title
- Expands inline (not in a modal) on click, filling the step card width
- Falls back gracefully to nothing if no screenshot is available — do not show a broken image placeholder or a blank grey box

**Data requirement:** This requires capture pipeline changes. The content script would need to capture a screenshot at `step.finalizedAt` using `chrome.tabs.captureVisibleTab()` and store it in extension local storage or upload to S3/MinIO. This is architecturally feasible — the BullMQ ingest pipeline already handles blob uploads — but it is not a display-layer change.

**Privacy note:** Screenshots capture the full visible browser tab, which may include sensitive data not covered by the existing `isSensitive` field detection. A privacy gate would need to apply the same domain/selector sensitivity rules before capturing. This is a non-trivial policy question that the security agent should evaluate before implementation.

**Priority: High reader value for new users and training contexts. High implementation effort.** Do not block the specificity improvements in Sections 1–2 waiting for this.

---

## 4. Per-Step Purpose Derivation

### The Current Problem

The `expectedOutcome` field on each raw SOP step comes from LLM generation and consistently produces category-level boilerplate:

| Category | Current boilerplate |
|----------|-------------------|
| click_then_navigate | "Opens a new page or view to proceed to the next stage of the workflow" |
| data_entry | "Captures the required input for this stage of the process" |
| send_action | "Triggers the action and advances the workflow to the next stage" |
| error_handling | "Resolves the error condition and returns the workflow to a working state" |
| single_action | "Performs the required action to progress the workflow" |

These are identical for every step in the same category. A reader following a 15-step SOP will encounter the same purpose statement four times for different navigation steps and learn nothing from it.

### Derivation Rules

Purpose should be derived from the available signals at the step level — not from the category. When insufficient signals exist, the purpose field should be left empty rather than filled with boilerplate.

**click_then_navigate:**
- Full: "Opens {destinationPageTitle} in {applicationLabel}"
  → "Opens the Orders page in Salesforce"
- No destination: "Navigates to the next section in {applicationLabel}"
  → "Navigates to the next section in Salesforce"
- Generic: omit the purpose field — "Navigates in App" adds nothing

**data_entry (named fields):**
- Full: "Records {field1} and {field2} for this transaction"
  → "Records Name and Email for this transaction"
- Many fields: "Records {fieldCount} fields — {field1}, {field2}, and {fieldCount-2} more"
  → "Records 5 fields — Name, Email, and 3 more"
- No labels: omit the purpose field

**fill_and_submit:**
- Full: "Submits {fieldList} to {applicationLabel}"
  → "Submits Name and Email to the App"
- Partial: "Submits the form in {applicationLabel}"

**send_action:**
- Email context: "Sends the composed message via {applicationLabel}"
  → "Sends the composed message via Gmail"
- Generic: "Triggers the submission in {applicationLabel}"

**single_action (click, labelless):**
- Do not synthesize a purpose — there is no honest derivation possible without knowing what the click did.
- Leave the purpose empty and let the confidence badge carry the signal that this step is uncertain.

**error_handling:**
- With recovery label: "Dismisses the '{recoveryLabel}' dialog and resumes the workflow"
  → "Dismisses the 'OK' dialog and resumes the workflow"
- Without: "Clears the error condition to continue"

**annotation / keyboard shortcut:**
- With intent: "Submits the form using the keyboard shortcut instead of the mouse"
- Without: omit

### Before / After Transformations for Fixture Examples

**Fixture: fill-and-submit.json** (happy path — mostly working)

```
BEFORE
Step title:  "Complete Name, Email and submit in App"
Detail:      "1. Enter value in "Name"\n2. Enter value in "Email"\n3. Submit Form"
Purpose:     "Completes a multi-field form to progress the workflow to the next stage."

AFTER
Step title:  "Complete Name, Email and submit in App"  [no change — already Tier 2]
Detail:      "1. Enter your Name\n2. Enter your Email\n3. Click 'Submit Form'"
Purpose:     "Records Name and Email, then submits the form"
```

Change: purpose is derived from the actual field list, not from the category. Detail uses "Enter your Name" (imperative, specific) not "Enter value in Name" (passive-technical).

**Fixture: single-action-no-label.json** (worst case)

```
BEFORE
Step title:  "Click action in App"
Detail:      "Click the target element"
Purpose:     "Performs the required action to progress the workflow."

AFTER
Step title:  "Click in App"
Detail:      "Click the element — the recorder did not capture a label for this element"
Purpose:     [empty — no honest derivation possible]
Confidence:  badge shown (step.isLowConfidence = true)
```

Change: title drops "action" (a category word, not a verb), detail is honest about the missing label, purpose is empty rather than boilerplate, confidence badge is visible.

**Fixture: spreadsheet-cells.json** (coordinate-only labels)

```
BEFORE
Step title:  "Enter A16, B16, C16 in App"  [coordinates in title]
Detail:      "1. Enter value in "A16"\n2. Enter value in "B16"\n3. Enter value in "C16""
Purpose:     "Captures the required input for this stage of the process."

AFTER
Step title:  "Enter data in App spreadsheet"
Detail:      "Enter values in cells A16, B16, and C16 in the spreadsheet"
Purpose:     "Records spreadsheet data at coordinates A16, B16, and C16"
```

Change: coordinate labels suppressed from title (they are reference coordinates, not semantic labels), title uses the spreadsheet-detected fallback, coordinates appear in detail and purpose where they provide useful positional reference.

**Fixture: error-recovery.json** (error + recovery click)

```
BEFORE
Step title:  "Handle error in App"
Detail:      "Handle the error condition to continue the workflow"
Purpose:     "Resolves the error condition and returns the workflow to a working state."

AFTER
Step title:  "Dismiss error — click 'OK' in App"
Detail:      "Click 'OK' on the error dialog to dismiss it and continue"
Purpose:     "Dismisses the 'OK' dialog and resumes the workflow"
```

Change: the recovery action label ("OK") is available in the fixture and should be surfaced in both the title and detail. The current title ignores this label. Purpose uses the specific recovery action, not the generic error_handling template.

**Fixture: demo.json — "Click Other in Gmail"** (weak one-word label)

```
BEFORE
Step title:  "Click Other in Gmail"
Detail:      "Click Other to continue"

AFTER
Step title:  "Click 'Other' in Gmail"
Detail:      "Click 'Other' in Gmail — this label may refer to a secondary action; confirm the correct element on screen"
Purpose:     "Selects the 'Other' option in Gmail"
```

Change: quotes added around "Other" to signal ambiguity. Detail adds an honest note that the one-word label may be truncated or context-dependent. Purpose is specific to the action ("Selects") rather than generic.

---

## 5. Priority Ranking by Reader Value vs. Effort

### Tier A — High Reader Value, Low Implementation Effort (Do First)

These are humanizer-layer changes — no pipeline changes, no schema changes.

**A1. Resolve the title derivation for labelless clicks**
Change: `buildContextLabel()` in `humanize.ts:299` — use `"Click in {appLabel}"` instead of `"{categoryLabel} in {appLabel}"` (which produces "Click action in App"). Category label is for display chips, not for title construction.
Code surface: 1 line in `buildContextLabel()`.
Before: "Click action in App" / After: "Click in App"

**A2. Suppress coordinate-only labels from step titles**
Change: In `extractLabelFromInstructions()` or in the normalizer, detect labels matching `/^[A-Z]{1,3}\d+$/`. When detected, suppress from title and use "Enter data in {appLabel} spreadsheet" or equivalent category fallback.
Code surface: ~10 lines in `humanize.ts`.
Before: "Enter A16, B16, C16 in App" / After: "Enter data in App spreadsheet"

**A3. Add quotes around single-word labels in title and detail**
Change: In `enrichShortTitle()` and `extractLabelFromInstructions()`, when the target label is one word (no spaces), wrap in typographic single quotes in the constructed title.
Code surface: ~5 lines.
Before: "Click Other in Gmail" / After: "Click 'Other' in Gmail"

**A4. Surface recovery action label in error_handling steps**
Change: In `normalizeStep()`, for `error_handling` category steps, look for an instruction with a targetLabel (the "OK" click) and use it in the step title. Currently the error_handling category ignores instruction labels in the title derivation path.
Code surface: ~15 lines in the error_handling branch.
Before: "Handle error in App" / After: "Dismiss error — click 'OK' in App"

### Tier B — High Reader Value, Medium Implementation Effort (Do Second)

**B1. Derive per-step expectedOutcome from available signals**
Change: In `normalizeStep()`, add a `deriveStepOutcome(category, system, labels, destinationPage)` function that produces specific outcome text when signals are available, and returns `null` (not boilerplate) when they are not. Apply this before falling back to `raw.expectedOutcome`.
Code surface: ~40 lines of new logic in `sopViewModel.ts`.
Before: "Opens a new page or view to proceed to the next stage" (identical for all nav steps)
After: "Opens the Orders page in Salesforce" / "Navigates to the next section in Gmail"

**B2. Surface breadcrumb row inline on step card**
Change: View layer renders `{applicationLabel} › {pageTitle}` as a styled breadcrumb chip below the step title. `deriveStepEvidence()` already provides both fields — this is a display-only change.
Code surface: Step card component, ~10 lines.
No before/after on logic — this is a new display element.

**B3. Expand `humanizeInstructionText()` to cover more weak patterns**
The current function only handles two specific strings: "Click the target element" and "Enter the required value". The `WEAK_PREFIXES` list in `humanize.ts:46` contains 17 patterns that are caught for title detection but not for instruction text replacement.
Change: Add handling in `humanizeInstructionText()` for: "Submit the form", "Select the required option", "Use keyboard shortcut", "Perform action", "Update field".
Code surface: ~20 lines in `humanize.ts`.

### Tier C — Medium Reader Value, Medium Effort (Do Third)

**C1. Show a visual low-confidence marker on titleless steps**
Steps where `isLowConfidence` is true and the title was a fallback should visually signal uncertainty to the reader. Currently `isLowConfidence` sets a CSS class but does not change the step card's title display.
Recommendation: When `isLowConfidence && titleWasFallback`, show a small indicator adjacent to the title ("step label not captured"). This requires passing a `titleIsFallback: boolean` flag through the view model.

**C2. Distinguish purpose from expected outcome in the view model**
Currently `expectedOutcome` serves both "what this action accomplishes" and "what the UI shows after". These are different:
- Purpose: why this step exists in the workflow ("Records customer contact information")
- Expected outcome: what the reader sees after the action ("The form closes and a confirmation banner appears")
The SOP builder LLM conflates these. The view model should render them in different UI positions with different labels to avoid the boilerplate problem.

### Tier D — High Value, High Effort (Design for Later)

**D1. Screenshot thumbnails per step**
As specified in Section 3 — requires capture pipeline changes, privacy gate evaluation, and storage infrastructure. High value for onboarding and training use cases. Do not block Tier A–B improvements waiting for this.

**D2. Neighbor/ancestor context extraction**
Using modal title, table column header, or section heading as additional location context for labelless steps. This data is not currently captured at the event level. Requires normalization-engine changes to extract DOM ancestor context at capture time.

### Summary Table

| Priority | Change | Reader Value | Effort | Code Surface |
|----------|--------|-------------|--------|-------------|
| A1 | Fix labelless click title | High | Trivial | 1 line, humanize.ts |
| A2 | Suppress coordinate labels from title | High | Low | ~10 lines, humanize.ts |
| A3 | Quote single-word labels | Medium | Trivial | ~5 lines, humanize.ts |
| A4 | Surface recovery label in error steps | High | Low | ~15 lines, sopViewModel.ts |
| B1 | Derive per-step expectedOutcome | High | Medium | ~40 lines, sopViewModel.ts |
| B2 | Breadcrumb row in step card | High | Low-Med | View layer, ~10 lines |
| B3 | Expand instruction text humanizer | Medium | Low | ~20 lines, humanize.ts |
| C1 | Low-confidence marker on titleless steps | Medium | Medium | View model + component |
| C2 | Separate purpose from expected outcome | Medium | Medium | View model restructure |
| D1 | Screenshot thumbnails | High | High | Capture pipeline |
| D2 | Neighbor context extraction | High | High | Normalization engine |

---

## Ground Truth Verification

All recommendations verified against:

- `packages/segmentation-engine/fixtures/golden/single-action-no-label.json` — confirms worst-case: no `target_summary` field, applicationLabel "App", pageTitle "Page"
- `packages/segmentation-engine/fixtures/golden/spreadsheet-cells.json` — confirms coordinate-only labels: "A16", "B16", "C16", selector `#waffle-editor`
- `packages/segmentation-engine/fixtures/golden/fill-and-submit.json` — confirms working case: "Name", "Email", "Submit Form" labels
- `packages/segmentation-engine/fixtures/golden/demo.json` — confirms mixed quality: "Inbox" (good), "Other" (weak one-word), "Send" (good)
- `packages/segmentation-engine/fixtures/golden/error-recovery.json` — confirms error + recovery: no error text, recovery label "OK" present on `#ok-btn`
- `apps/web-app/src/components/shared/humanize.ts` — production humanizer, confirms: `buildContextLabel()` produces "Click action in App", `humanizeInstructionText()` only handles 2 weak patterns, `WEAK_PREFIXES` has 17 patterns unhandled in instruction text
- `apps/web-app/src/components/sop-view/adapters/sopViewModel.ts` — production view model, confirms: `expectedOutcome` is taken directly from `raw.expectedOutcome` (LLM output), no per-step purpose derivation exists
- `docs/architecture/CONVERGENCE_LIVESTEPBUILDER_STREAMING_SEGMENTER.md` L178–183 — confirms the three-way title divergence table and confirms this is an open design decision

No data was fabricated. Where signals are absent (labelless steps, generic app/page names), the recommendation is to show honest fallback text or omit the field — not to synthesize meaning from nothing.
