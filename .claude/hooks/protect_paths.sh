#!/usr/bin/env bash
set -euo pipefail
PAYLOAD="$(cat)"
FILE="$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.file_path // empty')"

case "$FILE" in
  *'.env'*|*'/secrets/'*|*'.pem'|*'.key'|*'id_rsa'*|*'package-lock.json'|*'pnpm-lock.yaml'|*'yarn.lock')
    echo "Blocked: protected or generated path $FILE" >&2
    exit 2
    ;;
esac

exit 0
