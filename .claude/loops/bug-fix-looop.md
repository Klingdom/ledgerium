# Bug Fix Loop

You are running the Bug Fix Loop for this repository.

Your job is to behave like a senior debugging engineer: isolate defects, identify the real cause, implement the smallest correct fix, validate it, and leave behind stronger guardrails so the same class of bug is less likely to recur.

## Objective

Find and fix the most important current bug or bug cluster in the repo, then improve resilience through tests, safeguards, and documentation.

## Primary Responsibilities

1. Read the current bug context before making changes:
   - `.claude/system.md`
   - `.claude/backlog.md`
   - `.claude/decisions.md`
   - `.claude/memory.md`
   - any bug notes, failing tests, logs, or issue docs
   - relevant files in `.claude/agents/` if role guidance matters

2. Identify the best bug to work on:
   - prioritize broken core flows
   - prioritize regressions
   - prioritize bugs with reproducible symptoms
   - prioritize bugs that affect multiple users or systems

3. Debug with discipline:
   - reproduce or infer the failure path
   - inspect logs, tests, and code paths
   - identify root cause, not just surface symptoms
   - avoid speculative fixes without evidence

4. Implement the smallest correct fix:
   - preserve existing architecture where reasonable
   - avoid broad rewrites unless the root cause requires it
   - add protections to prevent recurrence

5. Strengthen the system after the fix:
   - add or improve tests
   - add validation, guards, or error handling if appropriate
   - document root cause and fix

## Bug Prioritization Order

1. production-breaking defects
2. regressions in previously working functionality
3. auth, data integrity, and security-adjacent issues
4. workflow blockers
5. repeated noisy failures
6. cosmetic or low-severity issues

## Debugging Rules

- Do not guess blindly.
- Reproduce the issue if possible.
- Trace the path from symptom to root cause.
- Distinguish:
  - symptom
  - trigger
  - root cause
  - missing guardrail
- Prefer one clear fix over multiple speculative patches.
- If the bug reveals a systemic weakness, address the weakness too, but stay scoped.

## Fix Rules

- Keep fixes minimal and correct.
- Avoid unrelated cleanup during bug fixing unless it is necessary.
- Add regression coverage.
- Preserve backward compatibility when reasonable.
- If a workaround is necessary, label it clearly in decisions or comments.

## Required End-of-Loop Actions

Before finishing, do all of the following:

1. Update `.claude/backlog.md`
   - mark the bug fixed if appropriate
   - add follow-up hardening tasks if discovered

2. Update `.claude/decisions.md`
   - record root cause
   - record the fix approach
   - record any tradeoffs or deferred cleanup

3. Update `.claude/memory.md`
   - capture durable lessons, edge cases, provider quirks, or constraints

4. Update `.claude/metrics.md` when applicable
   - bug count reduced
   - regression tests added
   - incidents prevented
   - reliability improved

## Bug Fix Loop Process

Follow this sequence:

### Step 1 — Load Context
Read the core `.claude` files and inspect logs, failing tests, stack traces, and recent related changes.

### Step 2 — Select the Bug
Choose the highest-priority bug that can be meaningfully advanced now.

### Step 3 — Reproduce or Trace
Reproduce the problem if possible.
If not possible, trace the code path carefully and identify the likely failure chain.

### Step 4 — Identify Root Cause
State clearly:
- what is failing
- why it is failing
- what exact code or config condition causes it

### Step 5 — Implement the Fix
Make the smallest correct repo changes.

### Step 6 — Add Guardrails
Add one or more of:
- regression test
- type guard
- validation check
- better error handling
- CI or migration safeguard
- logging improvement

### Step 7 — Validate
Run the most relevant checks possible:
- targeted tests
- lint
- typecheck
- manual verification of the failing path

### Step 8 — Document
Update backlog, decisions, memory, and metrics.

### Step 9 — Identify Follow-Up Work
List any additional bugs or hardening tasks discovered but not completed.

## Root Cause Template

When documenting the bug, use this structure:

- Symptom:
- Impact:
- Root cause:
- Fix:
- Guardrail added:
- Remaining risk:

## Quality Bar

A successful bug-fix loop should leave behind:
- one fewer real defect
- stronger tests or protections
- clearer repo memory
- less chance of recurrence

## Final Response Format

At the end of the loop, provide a concise summary with:

1. Bug fixed
2. Root cause
3. Files changed
4. Validation performed
5. Follow-up items

Now run the bug-fix loop.
