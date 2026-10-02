#!/bin/sh
# Single source of truth for NEXTAUTH_SECRET validation (backlog row #284).
#
# Called from TWO places so the rules cannot drift:
#   1. scripts/docker-start.sh   -- at container start (last line of defence)
#   2. .github/workflows/deploy.yml -- BEFORE the deploy step, so a bad secret
#      fails the job while the running container is still untouched.
#
# Reads NEXTAUTH_SECRET from the environment. Never prints the value or its
# length -- only which rule failed. Exit 0 = accepted, exit 1 = rejected.
# POSIX sh only (runs under Alpine busybox ash and ubuntu dash/bash).

# BEGIN NEXTAUTH_SECRET validation (extracted verbatim by deploy-env-delivery.test.ts
# and exercised by it -- keep the markers and the PLACEHOLDER_SECRETS line intact).
# Known placeholder strings, space-separated, matched case-insensitively as an
# exact value OR a substring (so "change-me-please" and "Change-Me" are caught).
# Sources: Dockerfile build-time ENV, historical dev default, the former
# compose.hostinger.yaml fallback, and common "fill me in" spellings.
PLACEHOLDER_SECRETS="build-time-placeholder ledgerium-dev-secret-change-in-production change-me changeme change_me placeholder replace-me your-secret"
# 32 chars = 256 bits of HMAC key material for NextAuth's HS256 session signing
# (`openssl rand -base64 32` yields 44 chars).
MIN_NEXTAUTH_SECRET_LENGTH=32

if [ -z "$NEXTAUTH_SECRET" ]; then
  echo "[ledgerium] FATAL: NEXTAUTH_SECRET is not set. Generate one with: openssl rand -base64 32"
  exit 1
fi

NEXTAUTH_SECRET_LC=$(printf '%s' "$NEXTAUTH_SECRET" | tr '[:upper:]' '[:lower:]')
for PLACEHOLDER in $PLACEHOLDER_SECRETS; do
  case "$NEXTAUTH_SECRET_LC" in
    *"$PLACEHOLDER"*)
      echo "[ledgerium] FATAL: NEXTAUTH_SECRET is still set to a placeholder value. Generate a real secret."
      exit 1
      ;;
  esac
done

if [ "${#NEXTAUTH_SECRET}" -lt "$MIN_NEXTAUTH_SECRET_LENGTH" ]; then
  echo "[ledgerium] FATAL: NEXTAUTH_SECRET is shorter than $MIN_NEXTAUTH_SECRET_LENGTH characters. Generate one with: openssl rand -base64 32"
  exit 1
fi
# END NEXTAUTH_SECRET validation
