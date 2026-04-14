# overnight-loop.md

Purpose:
Run safe, iterative progress cycles for extended periods with minimal supervision.

Priority Order:
1. High-confidence backlog items
2. Safe refactors
3. Content/data structuring
4. Test coverage improvements
5. Documentation alignment

Rules:
- Do not make large architectural changes unless already approved in decisions.md
- Do not introduce major dependencies without explicit backlog approval
- Prefer small commits over large commits
- Stop on repeated validation failure
- Stop if confidence drops materially
- Always update state files after meaningful changes

Cycle:
1. Read system.md, memory.md, backlog.md, metrics.md, decisions.md
2. Select the highest-priority safe task
3. Execute one bounded work cycle
4. Validate
5. Log results
6. Commit
7. Re-read context
8. Continue until stop condition

Stop Conditions:
- No safe tasks remain
- Same validation failure occurs twice
- Repo enters uncertain state
- The next task requires human judgment
- Maximum configured loop count reached
