improvement-loop
Run one bounded continuous-improvement iteration for Ledgerium AI.
Purpose
This command makes Claude Code behave like a deterministic improvement engine instead of a generic assistant.
It will:
review current project state
generate the top 10 updates / fixes / experiments
score and rank them
select exactly one
implement exactly one
validate the change
update improvement artifacts
stop
This command runs one iteration only. It does not continue indefinitely.
---
Operating Rules
Use the coordinator as orchestration lead.
Use specialist agents for analysis and implementation.
Do not implement more than one selected item.
Prefer high-value, low-risk, reversible improvements.
Prefer improvements that strengthen:
determinism
traceability
evidence linkage
test coverage
recovery / reliability
observability
product clarity
Use repository evidence, existing artifacts, current phase, known issues, and system health.
Do not invent missing facts. If evidence is missing, call it out explicitly.
Separate candidates into:
fix
improvement
experiment
Always update:
`IMPROVEMENT_BACKLOG.md`
`ITERATION_LOG.md`
`SYSTEM_HEALTH.md`
`CHANGELOG.md`
End after validation and artifact updates.
---
Required Inputs
Before running, review:
`CLAUDE.md`
`docs/invariants.md`
`docs/project-plan.md`
`SYSTEM_HEALTH.md`
`IMPROVEMENT_BACKLOG.md`
`ITERATION_LOG.md`
`CHANGELOG.md`
If these are missing, create or repair them before proceeding.
---
Improvement Loop Workflow
Step 1 — Review current state
Assess:
active phase and priorities
known issues and technical debt
current artifact completeness
test and validation gaps
system health signals
product / UX / market gaps if relevant
recent changes and open blockers
Step 2 — Generate candidate portfolio
Use relevant subagents to propose candidate updates.
Recommended agents:
`product-manager`
`market-research`
`growth-strategist`
`system-architect`
`backend-engineer`
`frontend-engineer`
`qa-engineer`
`devops-engineer`
`analytics`
`ux-designer`
Each candidate must use this structure:
```md
### Candidate
- Title:
- Type: fix | improvement | experiment
- Area:
- Problem:
- Evidence:
- Expected benefit:
- Effort (1-5):
- Risk (1-5):
- Impact (1-5):
- Strategic alignment (1-5):
- Learning value (1-5):
- Confidence (1-5):
- Priority score:
- Recommendation:
```
Step 3 — Rank top 10
Build a single top-10 prioritized backlog.
Use this formula:
```text
priority_score = impact + strategic_alignment + learning_value + confidence - effort - risk
```
Scoring guidance:
Impact: effect on users, correctness, reliability, or product value
Strategic alignment: fit with Ledgerium priorities and current phase
Learning value: how much the change reduces uncertainty or improves future decisions
Confidence: confidence based on repo evidence
Effort: implementation complexity and time
Risk: regression, ambiguity, or blast radius
Step 4 — Choose exactly one
Select exactly one item using:
highest score
lowest practical risk among top candidates
best fit with current phase
strongest reversibility if tied
Explicitly state:
why it was selected
why others were not selected yet
Step 5 — Implement exactly one
Delegate to the correct specialist agent(s), but keep the work scoped to a single selected item.
Possible implementers:
`backend-engineer`
`frontend-engineer`
`qa-engineer`
`devops-engineer`
`ux-designer`
`analytics`
Step 6 — Validate
Validation must include all relevant checks, for example:
`pnpm typecheck`
`pnpm test`
targeted package tests
relevant QA review
artifact updates
score / dashboard refresh if configured
If validation fails:
do not mark the iteration complete
document failure clearly in `ITERATION_LOG.md`
update status in `IMPROVEMENT_BACKLOG.md`
Step 7 — Update artifacts
Update:
`IMPROVEMENT_BACKLOG.md`
refresh rankings
mark selected item status
note any new findings
`ITERATION_LOG.md`
Add a new iteration entry including:
iteration id
selected item
rationale
agents used
files changed
validations run
outcome
follow-ups
`SYSTEM_HEALTH.md`
Update:
phase
artifact completeness
top risks
latest selected improvement
release blockers
confidence level
`CHANGELOG.md`
Add a concise entry summarizing:
what changed
why
validation status
Step 8 — Stop
Return a concise final summary with:
top 10 identified items
selected item
why it was selected
what changed
what passed
what remains next
Do not continue into a second iteration unless explicitly asked.
---
Ledgerium-Specific Prioritization
When ranking candidates, prefer this order unless evidence strongly suggests otherwise:
deterministic pipeline correctness
invariant protection
evidence traceability
session durability / recovery
schema and package consistency
test coverage for core flows
observability and structured logging
UX clarity for recording / review flows
GTM / narrative experiments
broader optimization work
---
Example Invocation
```text
Run one bounded improvement loop for Ledgerium AI.
Review the project, generate the top 10 updates / fixes / experiments, score them, choose exactly one, implement it, validate it, update all improvement artifacts, and stop.
```
---
Completion Standard
A successful improvement loop is complete only when:
one and only one item was selected
the selected item was implemented or explicitly failed with evidence
validation was run
improvement artifacts were updated
the next best action is clear
