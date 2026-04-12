#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
mkdir -p "$PROJECT_DIR/.claude/audit" "$PROJECT_DIR/.claude/scorecards"
cat <<'MSG'
Ledgerium Agentic CI active.
- Coordinator owns sequencing.
- Specialists own execution.
- No code changes without upstream artifacts.
- No release without validation and metrics.
- Prefer deterministic, traceable, measurable changes.
MSG
