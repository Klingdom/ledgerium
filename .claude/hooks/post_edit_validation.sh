#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
PAYLOAD="$(cat)"
FILE="$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.file_path // empty')"

mkdir -p "$PROJECT_DIR/.claude/audit" "$PROJECT_DIR/.claude/scorecards"
CHANGELOG_PATH="${LEDGERIUM_CHANGELOG_PATH:-$PROJECT_DIR/.claude/audit/change-log.md}"
touch "$CHANGELOG_PATH"
printf -- '- %s UTC | changed `%s`\n' "$(date -u +%Y-%m-%d %H:%M:%S)" "$FILE" >> "$CHANGELOG_PATH"

if [[ -f "$PROJECT_DIR/package.json" ]]; then
  if command -v npm >/dev/null 2>&1; then
    npm run lint >/dev/null 2>&1 || true
  fi
fi

if [[ -f "$PROJECT_DIR/pyproject.toml" ]] || compgen -G "$PROJECT_DIR/*.py" >/dev/null; then
  if command -v python3 >/dev/null 2>&1; then
    python3 "$PROJECT_DIR/.claude/bin/score_artifact.py" --project-root "$PROJECT_DIR" --changed-file "$FILE" >/dev/null 2>&1 || true
    python3 "$PROJECT_DIR/.claude/bin/update_dashboard.py" --project-root "$PROJECT_DIR" >/dev/null 2>&1 || true
  fi
fi

exit 0
