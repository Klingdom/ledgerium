#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
PAYLOAD="$(cat)"
FILE="$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.file_path // empty')"
MODE="${LEDGERIUM_REQUIRE_ARTIFACTS:-1}"

if [[ "$MODE" != "1" ]]; then
  exit 0
fi

# Only gate likely code/config edits.
if [[ ! "$FILE" =~ /(src|app|apps|api|backend|frontend|services|routes|controllers|components|lib|packages)/ ]] && \
   [[ ! "$FILE" =~ \.(ts|tsx|js|jsx|py|go|java|rs|sql|json|yaml|yml)$ ]]; then
  exit 0
fi

required=("PRD.md" "ARCHITECTURE.md" "API_SPEC.md")
missing=()
for f in "${required[@]}"; do
  [[ -s "$PROJECT_DIR/$f" ]] || missing+=("$f")
done

if ((${#missing[@]} > 0)); then
  echo "Blocked: missing required upstream artifacts before code change: ${missing[*]}" >&2
  exit 2
fi

# Frontend/user-facing work should have UX flows.
if [[ "$FILE" =~ /(frontend|components|pages|app)/ ]] || [[ "$FILE" =~ \.(tsx|jsx)$ ]]; then
  if [[ ! -s "$PROJECT_DIR/UX_FLOWS.md" ]]; then
    echo "Blocked: UX_FLOWS.md is required before user-facing implementation." >&2
    exit 2
  fi
fi

exit 0
