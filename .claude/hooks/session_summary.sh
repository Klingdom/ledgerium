#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
if command -v python3 >/dev/null 2>&1; then
  python3 "$PROJECT_DIR/.claude/bin/update_dashboard.py" --project-root "$PROJECT_DIR" >/dev/null 2>&1 || true
fi
cat <<'MSG'
Session ended.
Review SYSTEM_HEALTH.md, unresolved blockers, low-score artifacts, and missing metrics before the next run.
MSG
