# refactor-loop.md

Purpose:
Reduce duplication, inconsistency, and complexity without changing intended behavior.

Inputs:
- codebase
- decisions.md
- metrics.md

Process:
1. Scan for duplication and structural inconsistency
2. Choose one refactor target
3. Confirm expected behavior to preserve
4. Refactor incrementally
5. Validate behavior
6. Record any new pattern in memory.md
7. Commit changes

Exit Criteria:
- Simpler structure
- No known regression
- Pattern standardized
