#!/usr/bin/env bash
set -euo pipefail
PAYLOAD="$(cat)"
CMD="$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.command // empty')"

blocked_patterns=(
  '(^|[[:space:]])curl[[:space:]]'
  '(^|[[:space:]])wget[[:space:]]'
  'rm -rf'
  '(^|[[:space:]])sudo[[:space:]]'
  'git push'
  'git reset --hard'
  'chmod 777'
)

for pattern in "${blocked_patterns[@]}"; do
  if [[ "$CMD" =~ $pattern ]]; then
    echo "Blocked command by project policy: $CMD" >&2
    exit 2
  fi
done

exit 0
