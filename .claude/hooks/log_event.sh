#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_PATH="${LEDGERIUM_AUDIT_LOG_PATH:-$PROJECT_DIR/.claude/audit/tool-events.jsonl}"
mkdir -p "$(dirname "$LOG_PATH")"
EVENT_NAME="${1:-event}"
PAYLOAD="$(cat || true)"
PAYLOAD_JSON="$(printf '%s' "$PAYLOAD" | jq -Rs .)"
printf '{"ts":"%s","event":"%s","payload":%s}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$EVENT_NAME" "$PAYLOAD_JSON" >> "$LOG_PATH"
