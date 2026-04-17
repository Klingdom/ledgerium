# Template 02 — Enterprise ("The Governed SOP")

**Template type:** `enterprise`
**TS interface:** `EnterpriseSOP` in `packages/process-engine/src/templateTypes.ts`
**Renderer:** `renderEnterprise()` in `packages/process-engine/src/templates/sopTemplates.ts`
**Markdown renderer:** `renderEnterpriseMarkdown()` in `packages/process-engine/src/templates/markdownRenderer.ts`

---

## Audience-fit justification (one paragraph)

The Enterprise SOP is for people whose job depends on provable process
discipline. Compliance officers preparing for an ISO 9001 audit. QA leads
maintaining an FDA-acceptable procedure library. Internal auditors and risk
teams who need to demonstrate that actual work matches documented work. It is
precise, controlled, versioned, and signed — but it is also genuinely usable
because Ledgerium refuses the bureaucratic bloat that makes most enterprise
SOPs unreadable. Every section earns its place. Every claim links to a
`source_event_id`. A CEO can hand this to counsel with confidence; an operator
can still use it to execute the work because the hierarchy and evidence
surface beneath the formality.

---

## A. Template overview

### Goal
Produce a formal, audit-ready Standard Operating Procedure that a compliance
reviewer would accept as the authoritative description of a controlled
business process. Provide complete traceability to source evidence. Avoid
compliance theater.

### Intended audience
- Compliance and audit teams (internal + external)
- Quality assurance engineers and process owners
- Regulated teams (healthcare, finance, life sciences)
- Legal and risk review

### Design philosophy
Authoritative without being bloated. Every section has a purpose; nothing is
ceremonial. Formality is expressed through structure, not prose density.
Typography and hierarchy do the heavy lifting so the reader can extract
information quickly even in a dense document.

### When to use (selector rule)
Selected when:
- `systemCount ≥ 3`, OR
- `stepCount ≥ 8 AND systemCount ≥ 2`, OR
- `stepCount ≥ 10 AND hasFriction`
- See `templateSelector.ts::selectSOPTemplate` rule 2.

### When **not** to use
- When frontline execution speed is the priority → use Operator-Centric.
- When branching dominates → use Decision-Based.

---

## B. Section structure

### 1. Document header — **required**

Contains: title, SOP ID, version, status, generation date, owner, next review date.
Rendered as a compact metadata table above the first section heading.

**Formatting:**
```markdown
# Workflow Upload and Review Procedure — Ledgerium AI

| | |
|---|---|
| **SOP ID** | s_2026_04_17_abc123-sop |
| **Version** | 2.0 |
| **Status** | Generated · pending review |
| **Generated** | 2026-04-17T14:32:11Z |
| **Engine** | Ledgerium process-engine v1.2.0 |
| **Source session** | s_2026_04_17_abc123 |
| **Review cadence** | Quarterly |
| **Next review date** | 2026-07-17 |
```

### 2. Confidence badge + quality advisory — **required**

Above the fold. Exactly as defined in `DESIGN_SYSTEM.md` §7.3 and §8.2.

### 3. Purpose — **required**

One paragraph, 2–4 sentences. Precise business language.

**Good:** "This procedure defines the controlled upload and review of a recorded
workflow in Ledgerium AI. It applies when a process owner needs to produce an
evidence-linked SOP and process map from an observation session captured by the
Ledgerium browser extension. Successful completion of this procedure yields a
versioned SOP artifact ready for audit review."

### 4. Scope — **required**

What is covered, what is not, under which conditions.

**Rules:**
- Covered: systems, actors, workflow type, trigger condition.
- Excluded: explicitly named out-of-scope actions.
- Applicable when: the operator has authenticated access AND the source recording meets schema v1.0.0.

### 5. Trigger condition — **required**

When the procedure is invoked. Present tense, one sentence.

### 6. Roles & responsibilities — **required**

A table. One row per role. Each row declares the role name and its
responsibility in this procedure.

**Formatting:**
```markdown
| Role | Responsibility |
|---|---|
| Workflow Author | Executes all 12 steps of this procedure in the Ledgerium web app; ensures data consistency between the recording and the generated SOP. |
| Process Reviewer | Verifies the generated SOP accurately reflects the observed workflow; approves for publication. |
```

### 7. Prerequisites — **required**

Numbered list of conditions that must be met before step 1.

### 8. Inputs — **required**

What flows in: data, files, systems access, approvals.

### 9. Systems & tools — **required**

Every system touched, with version information where available.

### 10. Procedure — **required**

The core. Every step renders as a numbered H3 subsection with this structure:

```markdown
### Step 3: Upload the workflow file

**Actor:** Workflow Author
**System:** Ledgerium AI (web app)
**Duration:** ~8 seconds

The Workflow Author uploads the recorded workflow file through the **Upload**
control on the Workflows dashboard. The system accepts JSON files conforming
to canonical event schema v1.0.0.

**Inputs:**
- Recorded workflow file (`.json`)

**Outputs:**
- Processing job identifier returned by the system
- Staging entry in the Workflows dashboard

**Verification:**
- A toast message reading "Workflow uploaded — processing" appears in the
  bottom-right of the screen.
- The workflow appears in the "Processing" section of the dashboard.

**Risks:**
- Files larger than 10 MB may fail validation — see Step 3a (Exception recovery).

◦ **Evidence:** 2 events · ev_07, ev_08 · confidence 0.92
```

### 11. Decision points — **optional** (rendered if decision points exist)

A dedicated section listing every decision point, its question, and its enumerated
options with explicit next-step actions.

### 12. Controls & checkpoints — **required**

Verification mechanisms. Where does the process self-check?

### 13. Risks & cautions — **required**

Document-level risks (distinct from step-scoped risks).

### 14. Outputs — **required**

What the procedure produces. Files, database records, notifications.

### 15. Completion criteria — **required**

Measurable conditions confirming the procedure is complete.

### 16. Revision history & approvals — **required** (even if empty)

```markdown
| Version | Date | Author | Change | Approved by |
|---|---|---|---|---|
| 2.0 | 2026-04-17 | Ledgerium process-engine v1.2.0 | Initial generation from session s_2026_04_17_abc123 | *(pending review)* |
```

### 17. Evidence manifest — **required**

Summary of the underlying source events, presented as a compact table.

```markdown
## Evidence manifest

- Total events: 34
- Session: `s_2026_04_17_abc123`
- Session duration: 2 min 47 s
- Sensitive events: 0 · Redacted: 0

| Event type | Count |
|---|---|
| interaction.click | 12 |
| interaction.input_change | 6 |
| interaction.upload_file | 1 |
| navigation.route_change | 5 |
| system.loading_started | 4 |
| system.toast_shown | 3 |
| system.modal_opened | 1 |
| session.started / stopped | 2 |
```

### 18. Related documents — **optional**

Cross-references to other SOPs, policies, or controls this one intersects.

### 19. Glossary — **optional**

Only when domain terms appear that a reviewer might not recognize.

### 20. Source & generation footer — **required**

The same source footer as Operator, but on its own line as the final section.

---

## C. Visual / information hierarchy

```
H1 title                                  — 32px
metadata table (2-column, compact)        — dense; auditable
confidence badge                          — colored callout
quality advisory (if applicable)          — colored callout

H2: Purpose                               — paragraph
H2: Scope                                 — paragraph
H2: Trigger condition                     — paragraph
H2: Roles & responsibilities              — table
H2: Prerequisites                         — numbered list
H2: Inputs                                — bulleted list
H2: Systems & tools                       — bulleted list

H2: Procedure
  H3: Step 1: …                           — structured step block
  H3: Step 2: …
  …

H2: Decision points                       — structured block
H2: Controls & checkpoints                — bulleted list
H2: Risks & cautions                      — bulleted list
H2: Outputs                               — bulleted list
H2: Completion criteria                   — ✓ bulleted list

H2: Revision history & approvals          — table
H2: Evidence manifest                     — tables
H2: Related documents                     — bulleted list (optional)
H2: Glossary                              — definition list (optional)

source footer                             — italic one-liner
```

**Density note:** Enterprise is the densest template by design. Compliance
reviewers expect completeness; operators don't read this document cover-to-cover
— they navigate it.

---

## D. Writing rules

### Sentence style
- Third person for roles in the roles table and exception handling; second
  person in step body when the Workflow Author is the actor.
- Active voice wherever possible; passive voice only when the agent is
  intentionally ambiguous ("the system validates…").
- No contractions.
- 12–20 words per sentence average.

### Action verbs
- Start every procedure instruction with a strong imperative.
- Avoid weak verbs: `handle`, `deal with`, `work on`.

### Role naming
- Use org-recognizable roles (Workflow Author, Process Reviewer, Approver),
  not generic ones ("User", "Person").
- Every step names a single actor.

### Step granularity
- Same as Operator: one verb, one step. But steps may be longer with full
  input/output/verification tables.

### Handling ambiguity
- Low-confidence steps are flagged in two places: the step title glyph AND
  the quality advisory at the top.

### Decision points
- Decision points get a dedicated top-level section in Enterprise, not inline
  callouts.

### Navigation instructions
- Same as Operator. No recorder artifacts. Ever.

### Systems interactions
- Every system-driven step is documented explicitly, including expected
  durations and timeout behavior.

### What to avoid
- Boilerplate ("This procedure is intended to…").
- Repeating information between sections (Scope and Purpose should be distinct).
- Mock approvals ("Approved by: TBD"). Show pending approvals as *(pending review)*.
- Emoji outside the semantic tokens.

---

## E. Bad vs good examples

### Example 1 — Generic purpose

❌ **Bad:** "The purpose of this SOP is to describe the workflow upload procedure."
✅ **Good:** "This procedure defines the controlled upload and review of a recorded workflow in Ledgerium AI. It ensures that the generated SOP is evidence-linked, versioned, and ready for audit review."
**Why:** the good version tells a reviewer what the document commits to.

### Example 2 — Role ambiguity

❌ **Bad:**
```
| Role | Responsibility |
| User | Uploads the file. |
```
✅ **Good:**
```
| Role | Responsibility |
| Workflow Author | Executes all 12 steps of this procedure in the Ledgerium web app; ensures data consistency between the recording and the generated SOP. |
| Process Reviewer | Verifies the generated SOP accurately reflects the observed workflow; approves for publication. |
```
**Why:** the good version answers "who did what and why" without ambiguity.

### Example 3 — Weak verification

❌ **Bad:** "Verification: the upload works."
✅ **Good:** "Verification: a toast message reading 'Workflow uploaded — processing' appears in the bottom-right of the screen, and the workflow appears in the 'Processing' section of the dashboard."
**Why:** auditors require falsifiable verification points.

### Example 4 — Compliance theater

❌ **Bad:**
```
## Definitions
SOP — Standard Operating Procedure, a document describing a business process.
Workflow — a sequence of tasks.
User — a person who uses a system.
```
✅ **Good:** *(omit the glossary entirely unless domain-specific terms are actually used.)*
**Why:** Ledgerium bans defining terms the reader already knows.

### Example 5 — Hidden evidence

❌ **Bad:** "This procedure is derived from an observation."
✅ **Good:** "This procedure is derived from recorded session `s_2026_04_17_abc123` (34 events, 2 min 47 s duration). See *Evidence manifest* below for per-step event IDs."
**Why:** the good version gives the auditor the session ID and invites verification.

### Example 6 — Missing pending state

❌ **Bad:**
```
| Version | Date | Approved by |
| 2.0 | 2026-04-17 | J. Smith |   (a name invented by the generator)
```
✅ **Good:**
```
| Version | Date | Approved by |
| 2.0 | 2026-04-17 | *(pending review)* |
```
**Why:** Ledgerium never fabricates signatories.

### Example 7 — Prose-bloated step

❌ **Bad:** "In this step, the user will proceed to click upon the element that is labelled 'Upload' in order to be able to initiate the file upload procedure that will eventually result in the workflow being added to the system."
✅ **Good:** "Click **Upload** on the Workflows dashboard. A file picker opens."
**Why:** the good version is half the length and twice as clear. No information lost.

---

## F. Rendering contract

- Input: `EnterpriseSOP`
- Markdown output: `renderEnterpriseMarkdown()`
- JSON envelope: per `SCHEMA.md` §5

**Invariants:**
1. Every step has: actor, system, inputs, outputs, verification, evidence.
2. The metadata table is the second element after the H1, before any H2.
3. The revision history table is always present, even with a single row.
4. The evidence manifest is always present and deterministic.
5. No banned strings (`TRANSFORMATION_RULES.md` §5.1) anywhere in the output.
6. The quality advisory, if present, appears above all H2 sections.

Unit tests (suggested):
- `renders metadata table before first H2`
- `every procedure step has actor / system / inputs / outputs / verification`
- `revision history table is always rendered with at least one row`
- `evidence manifest event type counts equal source events per type`
