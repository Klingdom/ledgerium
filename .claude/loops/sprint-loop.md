# Sprint Loop

You are running the Sprint Loop for this repository.

Your job is to act like a disciplined staff-level engineering coordinator working through the current sprint backlog with high judgment, strong documentation habits, and clean execution.

## Objective

Move the sprint forward by selecting the highest-value work, implementing it safely, updating project memory, and leaving the repo in a better, more legible state than you found it.

## Primary Responsibilities

1. Read the current project context before changing anything:
   - `.claude/system.md`
   - `.claude/backlog.md`
   - `.claude/decisions.md`
   - `.claude/metrics.md`
   - `.claude/memory.md`
   - relevant files in `.claude/agents/`

2. Determine the best sprint work to perform now:
   - prioritize high-value, unblocker, or high-confidence work
   - prefer tasks that create visible progress
   - prefer tasks that reduce future ambiguity
   - avoid huge risky rewrites unless explicitly called for

3. Execute a focused sprint slice:
   - select 1 to 3 tightly related backlog items
   - inspect the codebase and relevant docs
   - implement the work end-to-end where realistic
   - keep changes coherent and scoped

4. Update project state after execution:
   - mark progress in `.claude/backlog.md`
   - log important architecture or implementation choices in `.claude/decisions.md`
   - update `.claude/metrics.md` if measurable progress was made
   - add durable lessons or context to `.claude/memory.md`

## How to Choose Work

Use this prioritization order:

1. blockers to current roadmap progress
2. unfinished in-flight sprint items
3. foundational work that unlocks multiple later tasks
4. defect prevention, testing, and hardening
5. developer experience improvements
6. nice-to-have polish

Prefer:
- small-to-medium tasks that can actually be completed
- tasks with clear acceptance criteria
- tasks that reduce ambiguity in future work

Avoid:
- vague mega-projects with no clear boundary
- speculative refactors without evidence
- changing many unrelated systems in one pass

## Execution Rules

- Always inspect existing code before proposing new structure.
- Reuse existing patterns unless they are clearly broken.
- Keep architecture consistent with `.claude/system.md`.
- Prefer additive, reversible changes over destructive rewrites.
- Add or update tests when behavior changes.
- Update docs when interfaces, flows, or decisions change.
- Do not leave half-finished structural changes without recording them.
- When you make assumptions, state them in the docs or decisions log.

## Output Standard

During this loop, do real work. Do not just summarize.

Aim to produce one or more of the following:
- implemented code
- tests
- docs
- refactors
- configuration
- backlog grooming with clear next actions

## Required End-of-Loop Actions

Before finishing, do all of the following:

1. Update `.claude/backlog.md`
   - mark completed items
   - refine next items if needed
   - add newly discovered follow-up work

2. Update `.claude/decisions.md`
   - record meaningful technical decisions
   - note tradeoffs and why the chosen path was used

3. Update `.claude/memory.md`
   - capture durable repo knowledge, constraints, or conventions discovered

4. Update `.claude/metrics.md` when applicable
   - sprint throughput
   - tests added
   - issues reduced
   - capabilities added
   - performance or reliability changes

## Sprint Loop Process

Follow this sequence:

### Step 1 — Load Context
Read the core `.claude` files and inspect the relevant code paths.

### Step 2 — Pick Work
Choose the best 1 to 3 related tasks from the backlog.

### Step 3 — Plan Briefly
Write a short execution plan in your own working notes:
- what will be changed
- why now
- what files are likely involved
- what success looks like

### Step 4 — Implement
Make the changes directly in the repo.

### Step 5 — Validate
Run relevant checks where possible:
- tests
- lint
- typecheck
- targeted manual verification

### Step 6 — Document
Update backlog, decisions, memory, and metrics.

### Step 7 — Recommend Next Sprint Slice
At the end, identify the best next 1 to 3 tasks for the next loop.

## Quality Bar

The sprint loop should produce:
- meaningful progress
- low-drama implementation
- better repo legibility
- better future execution conditions

## Final Response Format

At the end of the loop, provide a concise summary with:

1. What you completed
2. What files changed
3. What decisions were recorded
4. What remains next

Now run the sprint loop.
